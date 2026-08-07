/**
 * Byte accounting over the corpus, which is the progress measure for milestone M2.
 *
 * The numbers in `ACCOUNTED` are meant to change. They are pinned as exact values rather than as
 * floors so that a reader landing shows up as a diff somebody has to read, and so that a reader
 * quietly claiming fewer bytes than it used to is a failure rather than a silent regression. Raise
 * them when a port lands; never lower one without saying why in the commit.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless, skipWithoutLab } from '@harmony/lab';
import {
  Container,
  FAMILIES,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  claims,
  coverage,
  parse,
} from '../src/index.ts';

/** `[sample, accounted, total]`, every container in the corpus. */
const ACCOUNTED: readonly [string, number, number][] = [
  ['h700_config', 580969, 979184],
  ['h700_config_2', 580980, 979242],
  ['h600_config', 424224, 738149],
  ['h525_config', 11044, 78486],
  ['one_config', 143142, 1672832],
  ['one_config_unprogrammed', 95763, 1232237],
  ['arch8_config_a', 224746, 444256],
  ['arch8_config_b', 196529, 470619],
  ['arch8_config_c', 207422, 490704],
  ['arch8_config_d', 207526, 492150],
  ['h600_safemode_gspm', 6370, 7115],
  ['h700_gspm', 6370, 7115],
  ['h650_safemode_gspm', 6370, 7115],
];

for (const [name, accounted, total] of ACCOUNTED) {
  test(`${name} accounts for ${accounted} of ${total} bytes`, skipUnless(name), () => {
    const report = coverage(parse(load(name) as Uint8Array));
    assert.equal(report.total, total, 'container length');
    assert.equal(report.accounted, accounted, 'raise this when a reader lands, do not lower it');
  });

  test(`${name} has no two structures claiming the same byte`, skipUnless(name), () => {
    // The check the report exists for as much as the number is. Two owners on one byte means one
    // of them is sized wrong, and a wrong size is invisible in a reader's own tests: values read
    // from slightly the wrong span still look like values.
    const report = coverage(parse(load(name) as Uint8Array));
    assert.deepEqual(report.overlaps, [], 'overlapping claims');
  });

  test(`${name} claims stay inside the container`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    for (const claim of claims(c)) {
      assert.ok(claim.length > 0, `${claim.owner} claims nothing`);
      assert.ok(claim.start >= 0, `${claim.owner} starts before the blob`);
      assert.ok(
        claim.start + claim.length <= c.blob.length,
        `${claim.owner} runs past the end of the blob`,
      );
    }
  });

  test(`${name} accounts for the fixed furniture`, skipUnless(name), () => {
    // Header, section table, marker and trailer are read by `parse` itself, so a container that
    // parsed at all must have them. If one of these is ever missing the extent rule has drifted
    // from what `parse` did, which is the failure this whole module is designed to surface.
    const c = parse(load(name) as Uint8Array);
    const owners = new Set(claims(c).map((claim) => claim.owner));
    for (const owner of ['header', 'section-table', 'marker', 'trailer']) {
      assert.ok(owners.has(owner), `no ${owner} claim`);
    }
    const table = claims(c).find((claim) => claim.owner === 'section-table');
    assert.equal(table?.start, SECTION_TABLE_OFFSET);
    assert.equal(table?.length, SECTION_ITEM_SIZE * c.pointerCount);
  });
}

test('the gaps and the accounted bytes partition the container', skipWithoutLab(), () => {
  // Not a restatement of the accounted count: `gaps` is truncated to the largest few for the
  // report, so this checks the untruncated arithmetic by asking that no gap and no claim
  // disagree about the total.
  for (const [name] of ACCOUNTED) {
    const data = load(name);
    if (data === undefined) continue;
    const report = coverage(parse(data));
    const gapped = report.gaps.reduce((n, g) => n + g.length, 0);
    assert.ok(
      report.accounted + gapped <= report.total,
      `${name}: ${report.accounted} accounted plus ${gapped} in gaps exceeds ${report.total}`,
    );
    const owned = report.byOwner.reduce((n, [, bytes]) => n + bytes, 0);
    assert.equal(owned, report.accounted, `${name}: per owner total`);
  }
});

/** A container with nothing but a header, built by hand so these two tests need no lab. */
function bareContainer(pointerCount: number, markerOffset: number): Container {
  const blob = new Uint8Array(64);
  return new Container({
    blobOffset: 0,
    length: blob.length,
    flashBase: 0,
    endAddr: blob.length - 4,
    formatRaw: 0x1400,
    pointerCount,
    markerOffset,
    marker: 'CMAH',
    family: FAMILIES[0] as (typeof FAMILIES)[number],
    trailerChecksum: 0,
    blob,
    sections: [],
  });
}

test('the furniture alone claims four things and does not overlap', () => {
  const report = coverage(bareContainer(2, SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * 2));
  assert.deepEqual(report.overlaps, []);
  assert.equal(report.fraction, report.accounted / report.total);
  assert.deepEqual(
    report.byOwner.map(([owner]) => owner).sort(),
    ['header', 'marker', 'section-table', 'trailer'],
  );
});

test('a section table that runs into the marker is reported as an overlap', () => {
  // The detector is the part of this module that has to work when everything else looks fine, so
  // it gets a deliberate defect rather than only the corpus, where the answer is always none. A
  // marker one item into a four item table overlaps it by twelve bytes.
  const report = coverage(bareContainer(4, SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE));
  assert.equal(report.overlaps.length, 1);
  assert.deepEqual(report.overlaps[0]?.owners, ['section-table', 'marker']);
  assert.equal(report.overlaps[0]?.start, SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE);
  assert.equal(report.overlaps[0]?.length, 4, 'the marker is four bytes and all of it collides');
});
