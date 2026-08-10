/**
 * The structural report, and the property that makes it publishable.
 *
 * The interesting test here is the last one. Everything else checks that the report says the right
 * things; that one checks that it does not say anything else, by taking a distinctive run of bytes
 * out of a real config's sections and asserting none of it survives into the serialised report.
 * A report that quietly grew a "first bytes of each section" field would pass every other test in
 * this file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import { parse } from '@harmony/codec';

import { buildReport, containerReport, probeBase, probeRemote, usbReport } from '../src/index.ts';

const SAMPLES = [
  'h700_config',
  'h600_config',
  'h525_config',
  'one_config',
  'arch8_config_a',
  'h600_safemode_gspm',
];

/** The container out of a sample, however it is wrapped, using the codec's own locator. */
function container(name: string): Uint8Array | undefined {
  const data = load(name);
  if (data === undefined) return undefined;
  const c = parse(data);
  return data.subarray(c.blobOffset, c.blobOffset + c.length);
}

test('the report describes every sample, and derives what it needs', skipUnless(...SAMPLES), () => {
  for (const name of SAMPLES) {
    const blob = container(name);
    if (blob === undefined) continue;
    const report = containerReport(blob);
    const c = parse(blob);
    assert.equal(report.magic, blob.subarray(0, 4).reduce((s, b) => s + String.fromCharCode(b), ''), name);
    assert.equal(report.endAddr, c.endAddr, name);
    assert.equal(report.flashBase, c.flashBase, name);
    assert.equal(report.pointerCount, c.pointerCount, name);
    assert.equal(report.markerOffset, c.markerOffset, name);
    assert.equal(report.sections.length, c.sections.length, name);
    assert.equal(report.trailerChecksumRecomputes, true, name);
    assert.equal(report.parseError, null, name);
    assert.equal(report.formatVersion, c.formatVersion, name);
    assert.equal(report.architecture, c.architecture ?? null, name);
  }
});

test('an unknown magic still yields the shape', skipUnless('h700_config'), () => {
  // The case the probe exists for. Rewrite the cookie to four letters no family claims and the
  // codec refuses the container, but the header rules are arithmetic and still hold.
  const blob = container('h700_config');
  if (blob === undefined) return;
  const altered = Uint8Array.from(blob);
  altered.set([0x51, 0x51, 0x51, 0x51], 0); // 'QQQQ'
  const report = containerReport(altered);
  assert.equal(report.magic, 'QQQQ');
  assert.equal(report.family, null);
  assert.ok(report.parseError !== null, 'the codec should refuse it');
  assert.equal(report.pointerCount, parse(blob).pointerCount);
  assert.equal(report.flashBase, parse(blob).flashBase);
  assert.equal(report.sections.length, parse(blob).sections.length);
});

test('section lengths run to the next non NULL pointer', skipUnless('h600_config'), () => {
  const blob = container('h600_config');
  if (blob === undefined) return;
  const report = containerReport(blob);
  const populated = report.sections.filter((s) => s.address !== 0);
  for (let i = 0; i + 1 < populated.length; i += 1) {
    const here = populated[i]!;
    const next = populated[i + 1]!;
    assert.equal(here.lengthUpperBound, next.address - here.address);
  }
  assert.equal(populated[populated.length - 1]!.lengthUpperBound, report.endAddr - populated[populated.length - 1]!.address);
  for (const s of report.sections.filter((x) => x.address === 0)) {
    assert.equal(s.lengthUpperBound, undefined);
  }
});

test('a failure is reported rather than thrown', () => {
  const report = buildReport({ blob: new Uint8Array(8) });
  assert.equal(report.container, null);
  assert.ok(report.error !== null);
  assert.match(report.error as string, /too short/);
});

test('the usb half never carries a serial number', () => {
  const report = usbReport({
    vendorId: 0x046d,
    productId: 0xc122,
    // The bench Harmony 600's own bcdDevice, so the fixture agrees with the model it names. It
    // used to be 0x0203, which no remote reports, and which the shipped skin rule turned into
    // skin 3 without complaint.
    release: 0x1071,
    manufacturer: 'Logitech',
    product: 'Harmony 600',
    // A serial passed in anyway is not in the output type and cannot reach it.
  } as never);
  assert.deepEqual(Object.keys(report).sort(), [
    'manufacturer',
    'product',
    'productId',
    'release',
    'skinId',
    'vendorId',
  ]);
  assert.equal(report.skinId, 71, 'which names the Harmony 600 in Logitech own model list');
});

test('the probe finds a base by reading sixteen bytes at each candidate', async () => {
  const blob = container('h600_config');
  if (blob === undefined) return;
  const base = 0x030000;
  const reads: number[] = [];
  const reader = {
    getVersion: async () => new Uint8Array(12),
    readFlash: async (address: number, count: number) => {
      reads.push(address);
      if (address < base || address + count > base + blob.length) return new Uint8Array(0);
      return blob.subarray(address - base, address - base + count);
    },
  };
  const found = await probeBase(reader, base, 'arch 14 user config');
  assert.ok(found !== undefined);
  assert.equal(found.base, base);
  assert.equal(found.length, blob.length);
  assert.deepEqual(reads, [base]);
  assert.equal(await probeBase(reader, 0x040000, 'arch 12 user config'), undefined);
});

test('a whole probe over a served config produces a clean report', async () => {
  const blob = container('h600_config');
  if (blob === undefined) return;
  const base = 0x030000;
  const reader = {
    getVersion: async () => Uint8Array.from({ length: 12 }, (_, i) => i),
    readFlash: async (address: number, count: number) => {
      if (address < base || address + count > base + blob.length) return new Uint8Array(0);
      return blob.subarray(address - base, address - base + count);
    },
  };
  const report = await probeRemote(reader, null, { bases: [{ address: base, note: 'test' }] });
  assert.equal(report.error, null);
  assert.equal(report.container?.parseError, null);
  assert.equal(report.container?.trailerChecksumRecomputes, true);
  assert.deepEqual(report.versionBlock, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(Object.values(report.container?.checks ?? {}).every(Boolean), true);
});

test('no section content reaches the report', skipUnless('h700_config'), () => {
  // The safety property, checked rather than asserted in prose. Take a run of bytes from inside
  // each populated section and look for it in the serialised report. Sixteen bytes is long enough
  // that a coincidence is not the explanation if one turns up.
  const blob = container('h700_config');
  if (blob === undefined) return;
  const c = parse(blob);
  const text = JSON.stringify(buildReport({ blob }));
  let checked = 0;
  for (const section of c.sections) {
    if (section.address === 0) continue;
    const at = section.address - c.flashBase;
    if (at + 16 > blob.length) continue;
    const run: number[] = Array.from(blob.subarray(at, at + 16));
    // Two shapes it could plausibly leak in: as hex, and as a JSON array of numbers.
    const hex = run.map((b: number) => b.toString(16).padStart(2, '0')).join('');
    assert.equal(text.toLowerCase().includes(hex), false, `hex of slot ${section.slot}`);
    assert.equal(text.includes(JSON.stringify(run)), false, `bytes of slot ${section.slot}`);
    checked += 1;
  }
  assert.ok(checked > 10, 'should have checked most slots');
});

test('the base is the codec derivation and not a second copy of it',
  skipUnless('h890_config_2', 'h700_config'), () => {
    // Section 117. This file carried its own `endAddr - (blob.length - 4)` reading, which the codec
    // had abandoned as circular, and `H890-Bedroom-2` is the one sample where the two disagree: the
    // old reading gives 0x02FCA0 for a container linked at 0x030000. So the disagreement is the
    // test, and a reintroduced copy fails here rather than on a remote nobody can check.
    const blob = container('h890_config_2') as Uint8Array;
    const report = containerReport(blob);
    assert.equal(report.flashBase, parse(blob).flashBase);
    assert.equal(report.flashBase, 0x030000);
    assert.notEqual(report.flashBase, report.endAddr - (blob.length - 4));
    // And the negative: on a consistent container the two readings coincide, which is why this went
    // unnoticed for as long as the corpus held only consistent containers.
    const fine = container('h700_config') as Uint8Array;
    const ok = containerReport(fine);
    assert.equal(ok.flashBase, ok.endAddr - (fine.length - 4));
  });
