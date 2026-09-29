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
  HarmonyRemote,
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
    'running 2.5': [{ architecture: 14, identityBlock: unit, permittedUnit: unit }, { softwareType: 0, firmware: '2.5', staged: good }],
    'running 2.8': [{ architecture: 14, identityBlock: unit, permittedUnit: unit }, { softwareType: 0, firmware: '2.8', staged: good }],
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
  assert.equal(lines.length, 8);
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
    // The application's own status byte handler is read on 2.5 only, section 297.
    ['running 2.5', /^running 2.5: allowed$/],
    ['running 2.8', /^running 2.8: refused: .*application builds 2\.5 only/],
    ['a staged image that does not verify', /: refused: the image staged in external flash does not verify/],
    ['a staged image past the copy limit', /: refused: the staged image is \d+ bytes and the safe mode image copies at most/],
  ];
  assert.equal(lines.length, expected.length, lines.join('\n'));
  expected.forEach(([name, pattern], i) => {
    assert.ok(lines[i]!.startsWith(name) && pattern.test(lines[i]!), lines[i]);
  });
});

/** The staging rail's cases, section 297, in a subprocess like the reinstall's. */
const STAGE_CASES = `
  const unit = new Uint8Array(64).fill(0xee, 0, 16);
  for (let i = 16; i < 48; i += 1) unit[i] = (i * 7 + 1) & 0xff;
  const other = unit.slice(); other[20] ^= 0xff;
  const image = (length, padTo) => {
    const out = new Uint8Array(padTo).fill(0xff);
    for (let i = 10; i < length; i += 1) out[i] = (i * 13) & 0xff;
    out[4] = (length - 8) & 0xff; out[5] = ((length - 8) >> 8) & 0xff; out[6] = ((length - 8) >> 16) & 0xff; out[7] = 0x28;
    out[8] = 0x48; out[9] = 0x47;
    const sum = usb.firmwareImageChecksum(out.subarray(0, length));
    out[0] = sum & 0xff; out[1] = sum >> 8;
    return out;
  };
  const exact = image(4000, 4000);
  const padded = image(4000, 8000);
  const broken = exact.slice(); broken[100] ^= 1;
  const tooLong = image(usb.REINSTALL_MAX_IMAGE + 0x400, usb.REINSTALL_MAX_IMAGE + 0x400);
  const p = { architecture: 14, identityBlock: unit, permittedUnit: unit };
  const running25 = { softwareType: 0, firmware: '2.5' };
  const cases = {
    'the whole of it': [p, running25, exact],
    'in safe mode': [p, { softwareType: 4 }, exact],
    'another unit': [{ ...p, identityBlock: other }, running25, exact],
    'arch 12': [{ ...p, architecture: 12 }, running25, exact],
    'running 2.8': [p, { softwareType: 0, firmware: '2.8' }, exact],
    'an image with bytes past its end': [p, running25, padded],
    'an image that does not verify': [p, running25, broken],
    'an image past the copy limit': [p, running25, tooLong],
  };
  for (const [name, [perm, remote, img]] of Object.entries(cases)) {
    try { usb.assertStagingAllowed(perm, remote, img); console.log(name + ': allowed'); }
    catch (error) { console.log(name + ': refused: ' + error.message); }
  }
`;

test('with writing enabled and the staging door shut, every staging case is refused', () => {
  const lines = withEnv({ HARMONY_ENABLE_WRITES: '1', HARMONY_FIRMWARE_STAGE: '' }, STAGE_CASES).split('\n');
  assert.equal(lines.length, 8);
  assert.ok(lines.every((line) => line.includes(': refused: staging a firmware image needs HARMONY_FIRMWARE_STAGE=1')),
    lines.join('\n'));
});

test('with the staging door open, each condition refuses by itself, and the whole of it passes from 2.5 and from safe mode', () => {
  const lines = withEnv({ HARMONY_ENABLE_WRITES: '1', HARMONY_FIRMWARE_STAGE: '1' }, STAGE_CASES).split('\n');
  const expected: [string, RegExp][] = [
    ['the whole of it', /^the whole of it: allowed$/],
    ['in safe mode', /^in safe mode: allowed$/],
    ['another unit', /: refused: the remote on the cable is not the unit/],
    ['arch 12', /: refused: architecture 12 has no staging region/],
    ['running 2.8', /: refused: .*application builds 2\.5 only/],
    ['an image with bytes past its end', /: refused: the image to stage does not verify at its own stated length/],
    ['an image that does not verify', /: refused: the image to stage does not verify at its own stated length/],
    ['an image past the copy limit', /: refused: the image is \d+ bytes and the safe mode image copies at most/],
  ];
  assert.equal(lines.length, expected.length, lines.join('\n'));
  expected.forEach(([name, pattern], i) => {
    assert.ok(lines[i]!.startsWith(name) && pattern.test(lines[i]!), lines[i]);
  });
});

test('the first stage run left the staging region blank and the embedded configuration above it alone',
  skipUnless('h700_after_failed_stage_region', 'h700_posthd_staging_region'), () => {
    const after = lab('h700_after_failed_stage_region');
    const before = lab('h700_posthd_staging_region');
    assert.ok(after.subarray(0, 0x20000).every((b) => b === 0xff), 'both staging blocks erased');
    assert.deepEqual(after.subarray(0x20000), before.subarray(0x20000));
  });

test('after staging and installing 2.8, the application is the 2.8 image and nothing else in internal flash or the staging region changed',
  skipUnless('h700_28_internal_fe', 'h700_28_internal_ff', 'h700_posthd_internal_fe', 'h700_posthd_internal_ff',
    'h700_28_staging_region', 'h700_posthd_staging_region', 'h700_code'), () => {
    const image = lab('h700_code');
    const before = internal('h700_posthd_internal_fe', 'h700_posthd_internal_ff');
    const after = internal('h700_28_internal_fe', 'h700_28_internal_ff');
    const end = 0x9000 + image.length;
    assert.deepEqual(after.subarray(0x9000, end), image);
    assert.deepEqual([checkFirmwareImage(after.subarray(0x9000)).version, checkFirmwareImage(after.subarray(0x9000)).verifies],
      ['2.8', true]);
    assert.deepEqual(after.subarray(0, 0x9000), before.subarray(0, 0x9000), 'bootloader and safe mode');
    assert.deepEqual(after.subarray(end), before.subarray(end), 'everything above the application');
    const staged = lab('h700_28_staging_region');
    assert.deepEqual(staged.subarray(0, image.length), image);
    assert.ok(staged.subarray(image.length, 0x20000).every((b) => b === 0xff), 'the rest of the region erased');
    assert.deepEqual(staged.subarray(0x20000), lab('h700_posthd_staging_region').subarray(0x20000),
      'the embedded configuration');
  });

/**
 * `stageFirmware` against a simulated Harmony 700 running 2.5, in a subprocess because the doors are
 * read once at load. The simulation answers the way the protocol is documented to: a version block,
 * the identity block out of internal page `0xFF`, flash read in chunks with their sequence bytes, the
 * status byte, a 64 KiB erase per request and a write announced, sent in data packets and closed.
 *
 * **What it pins is the sequence**, which the first hardware run got wrong past its erase: the status
 * byte goes to 0 before the first erase, exactly the two staging blocks are erased, no transfer
 * announces more than a sixteen bit count, nothing restarts the remote, and the region reads back as
 * the image padded with `0xFF`. `wide` makes the simulated erase clear 128 KiB, which is the control:
 * the embedded configuration above the region changes and the method has to say so.
 */
const STAGE_RUN = `
  const unit = new Uint8Array(64).fill(0xee, 0, 16);
  for (let i = 16; i < 48; i += 1) unit[i] = (i * 7 + 1) & 0xff;
  const length = 76672;
  const img = new Uint8Array(length);
  for (let i = 10; i < length; i += 1) img[i] = (i * 13) & 0xff;
  img[4] = (length - 8) & 0xff; img[5] = ((length - 8) >> 8) & 0xff; img[6] = ((length - 8) >> 16) & 0xff; img[7] = 0x28;
  img[8] = 0x48; img[9] = 0x47;
  const sum = usb.firmwareImageChecksum(img);
  img[0] = sum & 0xff; img[1] = sum >> 8;
  const wide = process.env.STAGE_WIDE_ERASE === '1';

  const flash = new Uint8Array(0x40000).fill(0xff);
  for (let i = 0x20000; i < 0x30000; i += 1) flash[i] = (i * 5) & 0xff;
  const pageFF = new Uint8Array(0x10000).fill(0xff);
  pageFF.set(unit, usb.IDENTITY_OFFSET);
  const log = [];
  let status = 2, writeAt = -1, queue = [];
  const reply = (...bytes) => { const r = new Uint8Array(64); r.set(bytes); queue.push(r); };
  const stream = (source, from, count) => {
    let seq, at = 0;
    while (at < count) {
      const n = [62, 30, 14, 6, 5, 4, 3, 2, 1].find((k) => k <= count - at);
      seq = seq === undefined ? 1 : usb.nextFlashSequence(seq);
      reply(0x60 | usb.nibbleForPayloadLength(n + 1), seq, ...source.subarray(from + at, from + at + n));
      at += n;
    }
    reply(0xf0, 0x50);
  };
  const transport = {
    async write(r) {
      const code = r[0] & 0xf0;
      const payload = r.subarray(1, 1 + usb.payloadLengthForNibble(r[0] & 0x0f));
      if (code === 0x10) { log.push('version'); reply(0x28, ...usb.encodeVersionBlock({ firmware: 0x25, architecture: 14, softwareType: 0 })); }
      else if (code === 0x50) {
        const a = (payload[0] << 16) | (payload[1] << 8) | payload[2], n = (payload[3] << 8) | payload[4];
        if (payload[0] === 0xff) stream(pageFF, a & 0xffff, n); else stream(flash, a, n);
      }
      else if (code === 0xa0) { status = payload[2]; log.push('status ' + status); reply(0xf0, 0xa0); }
      else if (code === 0xb0) reply(0xc2, 0x06, status);
      else if (code === 0xd0) {
        const a = (payload[0] << 16) | (payload[1] << 8) | payload[2];
        log.push('erase 0x' + a.toString(16));
        flash.fill(0xff, a, a + (wide ? 0x20000 : 0x10000));
        reply(0xf0, 0xd0);
      }
      else if (code === 0x30) {
        writeAt = (payload[0] << 16) | (payload[1] << 8) | payload[2];
        log.push('write 0x' + writeAt.toString(16) + ' count ' + ((payload[3] << 8) | payload[4]));
      }
      else if (code === 0x40) { flash.set(payload, writeAt); writeAt += payload.length; }
      else if (r[0] === 0xf1 && r[1] === 0x30) reply(0xf0, 0x30);
      else if (code === 0xe0) log.push('escape ' + payload[0]);
      else log.push('unexpected 0x' + r[0].toString(16));
    },
    async read() { return queue.shift(); },
    async close() {},
  };
  const remote = new usb.HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 3 });
  let outcome = 'staged';
  try { await remote.stageFirmware({ permittedUnit: unit }, img); } catch (error) { outcome = 'threw: ' + error.message; }
  const expected = new Uint8Array(0x20000).fill(0xff); expected.set(img, 0);
  const region = flash.subarray(0, 0x20000).every((b, i) => b === expected[i]);
  console.log(JSON.stringify({ outcome, log: log.filter((l) => l !== 'version'), region, status }));
`;

test('stageFirmware sets the status to 0, erases the two staging blocks, writes in sixteen bit transfers and restarts nothing', () => {
  const run = JSON.parse(withEnv({ HARMONY_ENABLE_WRITES: '1', HARMONY_FIRMWARE_STAGE: '1', STAGE_WIDE_ERASE: '' }, STAGE_RUN));
  assert.equal(run.outcome, 'staged');
  assert.equal(run.region, true, 'the region reads as the image padded with 0xFF');
  assert.equal(run.status, 0, 'nothing will install until the reinstall sets it to 2');
  assert.deepEqual(run.log, [
    'status 0', 'erase 0x0', 'erase 0x10000',
    'write 0x0 count 32768', 'write 0x8000 count 32768', 'write 0x10000 count 11136',
  ]);
});

test('an erase wider than a block is caught by the neighbour read, before the region compare', () => {
  const run = JSON.parse(withEnv({ HARMONY_ENABLE_WRITES: '1', HARMONY_FIRMWARE_STAGE: '1', STAGE_WIDE_ERASE: '1' }, STAGE_RUN));
  assert.equal(run.outcome, 'threw: the block above the staging region changed during the erase');
});

test('with the staging door shut, stageFirmware erases and writes nothing', () => {
  const run = JSON.parse(withEnv({ HARMONY_ENABLE_WRITES: '1', HARMONY_FIRMWARE_STAGE: '', STAGE_WIDE_ERASE: '' }, STAGE_RUN));
  assert.match(run.outcome, /^threw: staging a firmware image needs HARMONY_FIRMWARE_STAGE=1/);
  assert.deepEqual(run.log, []);
  assert.equal(run.status, 2);
});

test('with writing disabled, stageFirmware erases and writes nothing', () => {
  const run = JSON.parse(withEnv({ HARMONY_ENABLE_WRITES: '', HARMONY_FIRMWARE_STAGE: '1', STAGE_WIDE_ERASE: '' }, STAGE_RUN));
  assert.match(run.outcome, /^threw: writing is disabled/);
  assert.deepEqual(run.log, []);
});

test('the unchecked erase and write are not reachable through a cast', () => {
  // Section 297's reviewer: TypeScript's `private` is a compile time label, so a cast reached the
  // erase with every door shut. `#` names are not on the prototype.
  const names = Object.getOwnPropertyNames(HarmonyRemote.prototype);
  for (const name of ['eraseFlashUnchecked', 'writeFlashUnchecked', 'setUpdateStatus']) {
    assert.ok(!names.includes(name), name);
  }
});
