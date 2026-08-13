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

import { load, require_, skipUnless } from '@harmony/lab';
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
    // **The report's own two answers about the same question have to agree**, which nothing
    // asserted: `trailerChecksumRecomputes` is computed here and `checks.trailer_checksum_recomputes`
    // comes from the codec, and while this file worked on unsliced bytes the two disagreed on a
    // published report. Section 139. The claim is the agreement, so it keeps biting after both are
    // right, which is what the disagreement itself could not.
    assert.equal(report.trailerChecksumRecomputes, report.checks?.['trailer_checksum_recomputes'], name);
    // **And the magic the report names is the magic the codec parsed.** They come from different
    // places: this reads `blob[0..4]` and `parse` searches for a magic anywhere in what it is given,
    // so before `containerExtent` was applied here they could describe different bytes of one blob.
    // Latent rather than live, since both embedded container cases in the lab refuse outright, and
    // pinned because latent is what this whole section is about. Section 139.
    assert.equal(report.magic, c.family.magic, name);
    assert.equal(report.marker, c.family.headerMarker, name);
    assert.equal(report.parseError, null, name);
    assert.equal(report.formatVersion, c.formatVersion, name);
    assert.equal(report.architecture, c.architecture ?? null, name);
  }
});

test('the report is about the container and not about the file it sits in',
  skipUnless('one_config', 'h890_config', 'h890_config_rescan'), () => {
  // **Every test above passes an already sliced container, which is why none of them could catch
  // this**, section 139. `containerReport` worked on whatever bytes it was handed and read the stored
  // trailer `u16` at `length - 6`, so on a raw flash read with fill past the end marker it took the
  // value out of the fill: `h890_config` and `h890_config_rescan` were reported as failing their
  // checksum while the codec, which slices, says both pass. A contribution probe condemning a good
  // config is the worst direction for the error, because nobody chases a file the tool has ruled out.
  for (const name of ['one_config', 'h890_config', 'h890_config_rescan']) {
    // `require_` and not `load` plus a skip: the test names its samples up front, so a missing one is
    // a failure rather than a claim quietly shrinking. `tests/test_toolchain.py` enforces this and it
    // caught the first version of this very test.
    const data = require_(name);
    const whole = containerReport(data);
    const sliced = containerReport(container(name) as Uint8Array);
    // The file is longer than the container in each of these, which is what makes them the population.
    assert.ok(data.length > (container(name) as Uint8Array).length, `${name} has fill past its marker`);
    assert.equal(whole.trailerChecksumRecomputes, true, name);
    assert.equal(whole.trailerChecksum, sliced.trailerChecksum, name);
    assert.equal(whole.flashBase, sliced.flashBase, name);
    // And the codec, independently, which is the point of agreeing rather than of being self consistent.
    assert.equal(parse(data).checks['trailer_checksum_recomputes'], true, name);
  }
});

test('a base the anchor refused is reported as refused, not as a base',
  skipUnless('h890_config_2_rescan', 'one_config'), () => {
  // Section 122: an arch 10 (Harmony 890) read duplicates whole 54 byte chunks, and on this one they
  // land inside the container, so no candidate base is `0x1000` aligned and the anchor refuses. The
  // fallback then returns something, and the report published it looking exactly like a derived
  // number. A wrong base does not error, it reads the neighbouring bytes.
  const damaged = containerReport(require_('h890_config_2_rescan'));
  assert.equal(damaged.flashBaseAnchored, false, 'the anchor refuses on this read');
  assert.equal(damaged.flashBaseAligned, false, 'and the fallback is not even aligned');
  // The control, so the two flags are not simply always false.
  const good = containerReport(require_('one_config'));
  assert.equal(good.flashBaseAnchored, true);
  assert.equal(good.flashBaseAligned, true);
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
  assert.equal(report.familyArchitectures, null);
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

// `skipUnless` rather than an early return, which is what these two carried until 13 August 2026.
// A test that returns before its first assertion reports a pass, so with no lab the five tests
// around them skipped with a reason and these two claimed to have checked something.
test('the probe finds a base by reading sixteen bytes at each candidate',
  skipUnless('h600_config'), async () => {
  const blob = container('h600_config') as Uint8Array;
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

test('a whole probe over a served config produces a clean report',
  skipUnless('h600_config'), async () => {
  const blob = container('h600_config') as Uint8Array;
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

test('a published field name says what the field holds', skipUnless('h700_config'), () => {
  // `family` held `FAMILIES[n].architectures`, so the report a contributor publishes carried a field
  // called family whose value is "12 (One), 14 (600, 700)". Harmless to read and wrong in the schema
  // their report is read against, which is the only description of it they have. Section 139.
  const report = containerReport(container('h700_config') as Uint8Array);
  assert.equal(report.familyArchitectures, '12 (One), 14 (600, 700)');
  // And the name is gone rather than aliased, since two names for one field is how a schema drifts.
  assert.equal((report as unknown as Record<string, unknown>)['family'], undefined);
});

test('the probe finds a Harmony 525, whose read base and container base differ by a megabyte',
  skipUnless('h525_config'), async () => {
  // Arch 9 (Harmony 525) is the one architecture where the two are not the same number: `READ_FLASH`
  // will not answer below `0x800000` and the container's own pointers are `0x02xxxx`, so `end_addr`
  // is stated against the second while the bytes come from the first. `packages/corpus/src/read.ts`
  // has known that since a Harmony 525 was connected on 8 August 2026 and the probe did not: the
  // base was absent from `CANDIDATE_BASES`, and adding it alone would not have helped, because the
  // length came out negative and was rejected as implausible. Section 139.
  const blob = container('h525_config') as Uint8Array;
  const READ_BASE = 0x820000;
  const CONTAINER_BASE = 0x020000;
  const reader = {
    getVersion: async () => Uint8Array.from({ length: 12 }, (_, i) => i),
    readFlash: async (address: number, count: number) => {
      if (address < READ_BASE || address + count > READ_BASE + blob.length) return new Uint8Array(0);
      return blob.subarray(address - READ_BASE, address - READ_BASE + count);
    },
  };
  // The default candidate list has to find it, which is the whole point: a contributor runs the
  // probe with no arguments.
  const report = await probeRemote(reader, null);
  assert.equal(report.error, null);
  assert.equal(report.container?.parseError, null);
  assert.equal(report.container?.magic, 'AHCM');
  assert.equal(report.container?.architecture, 9);
  assert.equal(report.container?.trailerChecksumRecomputes, true);
  // And the length is right, which is the half the container base fixes: subtracting the read base
  // would give a number about a megabyte negative.
  assert.equal(report.container?.length, blob.length);
  // The control: without the container base the same header is rejected outright, so the candidate
  // entry is load bearing rather than decorative.
  assert.equal(await probeBase(reader, READ_BASE, 'no container base'), undefined);
  assert.notEqual(await probeBase(reader, READ_BASE, 'with it', CONTAINER_BASE), undefined);
});
