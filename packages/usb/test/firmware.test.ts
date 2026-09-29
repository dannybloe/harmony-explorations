/**
 * The firmware image check, and the rail that refuses a reinstall unless the staged image passes it.
 * Section 295.
 *
 * The image half is the TypeScript port of `src/harmony/firmware.py`, and one test below runs that
 * reader in a subprocess over the same lab images and compares, since two copies of a derivation are
 * two copies until one of them moves. The rail half
 * is refusals, as everywhere in this package: with the flags off, and with them on, each condition
 * refusing by itself.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { imagePath, skipUnless } from '@harmony/lab';

import {
  REINSTALL_MAX_IMAGE,
  RailError,
  assertReinstallAllowed,
  checkFirmwareImage,
  firmwareImageChecksum,
} from '../src/index.ts';
import { updateStatusReadRequest } from '../src/protocol.ts';
import { updateStatusWriteRequest } from '../src/writes.ts';

function lab(name: string): Uint8Array {
  return new Uint8Array(readFileSync(imagePath(name)!));
}

/** The two internal pages as one 128 KiB image of program memory, which is how the addresses read. */
function internal(fe: string, ff: string): Uint8Array {
  const a = lab(fe);
  const b = lab(ff);
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

test('the staged application in the Harmony 700\'s external flash verifies, version 2.5, 71552 bytes',
  skipUnless('h700_staging_region'), () => {
    const staged = checkFirmwareImage(lab('h700_staging_region'));
    assert.equal(staged.hasMagic, true);
    assert.equal(staged.version, '2.5');
    assert.equal(staged.size, 71552);
    assert.equal(staged.verifies, true);
  });

test('the installed copy of it at internal 0x9000 does not, and the one difference is the page at 0x10000',
  skipUnless('h700_internal_fe', 'h700_internal_ff', 'h700_staging_region'), () => {
    const memory = internal('h700_internal_fe', 'h700_internal_ff');
    const installed = checkFirmwareImage(memory.subarray(0x9000));
    assert.equal(installed.version, '2.5');
    assert.equal(installed.verifies, false);
    assert.equal(installed.storedChecksum, 0x99e2);
    assert.equal(installed.size, 71552);
    assert.equal(installed.computedChecksum, 0x2d92);
    // Where the two copies differ, as a set of 1 KiB pages of program memory.
    const staged = lab('h700_staging_region');
    const pages = new Set<number>();
    for (let i = 0; i < 71552; i += 1) {
      if (staged[i] !== memory[0x9000 + i]) pages.add((0x9000 + i) & ~0x3ff);
    }
    assert.deepEqual([...pages], [0x10000]);
    assert.ok(memory.subarray(0x10000, 0x10400).every((b) => b === 0xff), 'that page is erased');
  });

test('the safe mode image beside it verifies, version 2.3, 29888 bytes',
  skipUnless('h700_internal_fe', 'h700_internal_ff'), () => {
    const memory = internal('h700_internal_fe', 'h700_internal_ff');
    const safe = checkFirmwareImage(memory.subarray(0x1000, 0x9000));
    assert.deepEqual([safe.version, safe.size, safe.verifies], ['2.3', 29888, true]);
  });

test('a Harmony Desktop sync left both internal pages byte for byte as they were',
  skipUnless('h700_internal_fe', 'h700_internal_ff', 'h700_after_hd_internal_fe', 'h700_after_hd_internal_ff'),
  () => {
    const before = internal('h700_internal_fe', 'h700_internal_ff');
    const after = internal('h700_after_hd_internal_fe', 'h700_after_hd_internal_ff');
    assert.deepEqual(after, before);
  });

test('after the reinstall the application is the staged image, and only the damaged page changed',
  skipUnless('h700_internal_fe', 'h700_internal_ff', 'h700_repaired_internal_fe', 'h700_repaired_internal_ff',
    'h700_staging_region'),
  () => {
    const before = internal('h700_internal_fe', 'h700_internal_ff');
    const after = internal('h700_repaired_internal_fe', 'h700_repaired_internal_ff');
    const staged = lab('h700_staging_region');
    assert.deepEqual(after.subarray(0x9000, 0x9000 + 71552), staged.subarray(0, 71552));
    assert.equal(checkFirmwareImage(after.subarray(0x9000)).verifies, true);
    const pages = new Set<number>();
    let changed = 0;
    for (let i = 0; i < before.length; i += 1) {
      if (before[i] !== after[i]) {
        changed += 1;
        pages.add(i & ~0x3ff);
      }
    }
    assert.deepEqual([changed, [...pages]], [1005, [0x10000]]);
  });

/**
 * The install routine's status normalisation, 4 read as 2 and 7 as 6, as a byte pattern that does not
 * depend on where a build put its variables. Found in the Harmony 700's 2.3 safe mode image at
 * `0x02B9C`. **Every** match is counted, since a first match alone is what let the `0x15C00` clamp pass
 * for distinctive here: the application images compare against that constant too.
 */
const STATUS_NORMALISATION = /\x04\x0e.\x5d\x02\xe1\x02\x0e.\x6f\x07\x0e.\x5d\x02\xe1\x06\x0e.\x6f/gs;

function matchesIn(image: Uint8Array): number[] {
  return [...Buffer.from(image).toString('latin1').matchAll(STATUS_NORMALISATION)].map((m) => m.index);
}

test('the status normalisation occurs once in each arch 14 safe mode image and in no application image',
  skipUnless('h700_internal_fe', 'h650_internal_fe', 'h600_internal_fe', 'one_internal_fe', 'one_page_ff',
    'one_spare_page_ff', 'h700_code', 'h650_code', 'h650_bench_code', 'h600_code_complete',
    'h700_staging_region'), () => {
    assert.deepEqual(matchesIn(lab('h700_internal_fe')), [0x2b9c]);
    assert.deepEqual(matchesIn(lab('h650_internal_fe')), [0x1a8c]);
    assert.deepEqual(matchesIn(lab('h600_internal_fe')), [0x1a8c]);
    for (const name of ['one_internal_fe', 'one_page_ff', 'one_spare_page_ff', 'h700_code', 'h650_code',
      'h650_bench_code', 'h600_code_complete', 'h700_staging_region']) {
      assert.deepEqual(matchesIn(lab(name)), [], name);
    }
  });

/** The images both readers are asked about, and where each image starts in its file. */
const BOTH_READERS: readonly [string, number][] = [
  ['h600_code_complete', 0], ['h650_code', 0], ['h650_bench_code', 0], ['h700_code', 0],
  ['one34_code', 0], ['h700_staging_region', 0], ['h700_internal_fe', 0x1000], ['h600_internal_fe', 0x1000],
  ['h650_internal_fe', 0x1000],
];

test('the check agrees with the Python reader on every image both can read',
  skipUnless(...BOTH_READERS.map(([name]) => name)), () => {
    const here = fileURLToPath(new URL('.', import.meta.url));
    const root = join(here, '..', '..', '..');
    const python = execFileSync('python3', ['-c', `
import sys, json
sys.path.insert(0, ${JSON.stringify(join(root, 'src'))})
from harmony import firmware
out = []
for path, start in json.loads(sys.argv[1]):
    code = open(path, 'rb').read()[start:]
    h = firmware.parse_header(code)
    size = h.stated_size
    out.append([h.version, size, firmware.compute_checksum(code[:size]), firmware.verify_checksum(code[:size])])
print(json.dumps(out))
`, JSON.stringify(BOTH_READERS.map(([name, start]) => [imagePath(name), start]))], { encoding: 'utf8' });
    const ours = BOTH_READERS.map(([name, start]) => {
      const image = checkFirmwareImage(lab(name).subarray(start));
      return [image.version, image.size, image.computedChecksum, image.verifies];
    });
    assert.deepEqual(ours, JSON.parse(python));
    assert.equal(ours.every(([, , , verifies]) => verifies === true), true, 'and every one of them verifies');
  });

test('a flipped byte inside an image breaks it, so the check can fail', skipUnless('h700_staging_region'), () => {
  const staged = lab('h700_staging_region').slice();
  staged[0x7010] = (staged[0x7010] as number) ^ 0x01;
  assert.equal(checkFirmwareImage(staged).verifies, false);
});

test('the status requests are Logitech\'s own bytes for skin 66, not the general misc shape', () => {
  // `firmwareupgrade.xml` for SKIN66: `A3 06 00 02` and `B2 06 00`. The general `writeMiscRequest`
  // would send a sixteen bit address and value, and the safe mode image takes the value from the
  // third byte, so it would store the address's low byte instead.
  assert.deepEqual([...updateStatusWriteRequest(2).subarray(0, 4)], [0xa3, 0x06, 0x00, 0x02]);
  assert.deepEqual([...updateStatusReadRequest().subarray(0, 3)], [0xb2, 0x06, 0x00]);
});

/** A synthetic image that verifies, `length` bytes, padded with erased flash to `padTo`. */
function syntheticImage(length: number, padTo: number): Uint8Array {
  const out = new Uint8Array(padTo).fill(0xff);
  for (let i = 10; i < length; i += 1) out[i] = (i * 13) & 0xff;
  out[2] = 0xff;
  out[3] = 0xff;
  out[4] = (length - 8) & 0xff;
  out[5] = ((length - 8) >> 8) & 0xff;
  out[6] = ((length - 8) >> 16) & 0xff;
  out[7] = 0x25;
  out[8] = 0x48;
  out[9] = 0x47;
  const sum = firmwareImageChecksum(out.subarray(0, length));
  out[0] = sum & 0xff;
  out[1] = sum >> 8;
  return out;
}

test('the length is the one the header states, even where another length would verify too', () => {
  // A pattern repeating every 256 bytes XORs to nothing over 64 KiB, so this image checksums the same
  // at 0x6000 and at 0x16000 bytes. Trying every length a sixteen bit field allows, as the Python
  // reader does, finds the short one; the remote reads three bytes and copies the long one.
  const raw = syntheticImage(0x16000, 0x16000);
  const image = checkFirmwareImage(raw);
  assert.deepEqual([image.size, image.verifies], [0x16000, true]);
  // The premise, measured: the short length verifies too, so a reader that tries lengths could stop there.
  assert.equal(firmwareImageChecksum(raw.subarray(0, 0x6000)), image.storedChecksum);
});

test('a synthetic image verifies, which is what the rail tests below lean on', () => {
  const image = checkFirmwareImage(syntheticImage(4000, REINSTALL_MAX_IMAGE));
  assert.deepEqual([image.size, image.verifies], [4000, true]);
});

test('with writing disabled, a reinstall is refused before anything else is looked at', () => {
  assert.throws(
    () => assertReinstallAllowed(
      { architecture: 14, identityBlock: new Uint8Array(64), permittedUnit: new Uint8Array(64) },
      { softwareType: 4, staged: syntheticImage(4000, REINSTALL_MAX_IMAGE) },
    ),
    (error: unknown) => error instanceof RailError && /read only/.test(error.message),
  );
});

function withEnv(extra: Record<string, string>, script: string): string {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const index = join(here, '..', 'src', 'index.ts').replaceAll('\\', '/');
  return execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', `import * as usb from '${index}';\n${script}`],
    { env: { ...process.env, ...extra }, encoding: 'utf8' },
  ).trim();
}

/** Run every case in a subprocess with the given flags and report each one's outcome on a line. */
const CASES = `
  const unit = new Uint8Array(64).fill(0xee, 0, 16);
  for (let i = 16; i < 48; i += 1) unit[i] = (i * 7 + 1) & 0xff;
  const other = unit.slice(); other[20] ^= 0xff;
  const image = (length, padTo) => {
    const out = new Uint8Array(padTo).fill(0xff);
    for (let i = 10; i < length; i += 1) out[i] = (i * 13) & 0xff;
    out[4] = (length - 8) & 0xff; out[5] = ((length - 8) >> 8) & 0xff; out[6] = ((length - 8) >> 16) & 0xff; out[7] = 0x25;
    out[8] = 0x48; out[9] = 0x47;
    const sum = usb.firmwareImageChecksum(out.subarray(0, length));
    out[0] = sum & 0xff; out[1] = sum >> 8;
    return out;
  };
  const good = image(4000, usb.REINSTALL_MAX_IMAGE);
  const broken = good.slice(); broken[100] ^= 1;
  const tooLong = image(usb.REINSTALL_MAX_IMAGE + 0x400, usb.REINSTALL_MAX_IMAGE + 0x400);
  const cases = {
    'the whole of it': [{ architecture: 14, identityBlock: unit, permittedUnit: unit }, { softwareType: 4, staged: good }],
    'another unit': [{ architecture: 14, identityBlock: other, permittedUnit: unit }, { softwareType: 4, staged: good }],
    'arch 12': [{ architecture: 12, identityBlock: unit, permittedUnit: unit }, { softwareType: 4, staged: good }],
    'running its application': [{ architecture: 14, identityBlock: unit, permittedUnit: unit }, { softwareType: 0, staged: good }],
    'a staged image that does not verify': [{ architecture: 14, identityBlock: unit, permittedUnit: unit }, { softwareType: 4, staged: broken }],
    'a staged image past the copy limit': [{ architecture: 14, identityBlock: unit, permittedUnit: unit }, { softwareType: 4, staged: tooLong }],
  };
  for (const [name, [p, remote]] of Object.entries(cases)) {
    try { usb.assertReinstallAllowed(p, remote); console.log(name + ': allowed'); }
    catch (error) { console.log(name + ': refused: ' + error.message); }
  }
`;

test('with writing enabled and the reinstall door shut, every case is still refused', () => {
  const lines = withEnv({ HARMONY_ENABLE_WRITES: '1', HARMONY_FIRMWARE_REINSTALL: '' }, CASES).split('\n');
  assert.equal(lines.length, 6);
  assert.ok(lines.every((line) => line.includes(': refused: a firmware reinstall needs HARMONY_FIRMWARE_REINSTALL=1')),
    lines.join('\n'));
});

test('with both flags, each condition refuses by itself and only the whole of it passes', () => {
  const lines = withEnv({ HARMONY_ENABLE_WRITES: '1', HARMONY_FIRMWARE_REINSTALL: '1' }, CASES).split('\n');
  // Each refusal is matched on its own reason, so a case refused for some other reason fails here.
  const expected: [string, RegExp][] = [
    ['the whole of it', /^the whole of it: allowed$/],
    ['another unit', /^another unit: refused: the remote on the cable is not the unit/],
    ['arch 12', /^arch 12: refused: architecture 12 has no reinstall target/],
    ['running its application', /^running its application: refused: the remote reports software type 0/],
    ['a staged image that does not verify', /: refused: the image staged in external flash does not verify/],
    ['a staged image past the copy limit', /: refused: the staged image is \d+ bytes and the safe mode image copies at most/],
  ];
  assert.equal(lines.length, expected.length, lines.join('\n'));
  expected.forEach(([name, pattern], i) => {
    assert.ok(lines[i]!.startsWith(name) && pattern.test(lines[i]!), lines[i]);
  });
});
