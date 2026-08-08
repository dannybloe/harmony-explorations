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
  BINDING_SLOT,
  Container,
  EMPTY_ARRAY_LIMIT,
  EMPTY_FRAME_LENGTH,
  FAMILIES,
  FRAME_END,
  FRAME_END_LENGTH,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  archSlot,
  claims,
  coverage,
  modeRecords,
  parse,
} from '../src/index.ts';

/** `[sample, accounted, total]`, every container in the corpus. */
const ACCOUNTED: readonly [string, number, number][] = [
  ['h700_config', 979180, 979184],
  ['h700_config_2', 979238, 979242],
  ['h600_config', 738145, 738149],
  // 52667 and 39448 until section 82 read class 5's bodies, symbol tables and pulse blocks.
  ['h525_config', 78480, 78486],
  ['h525_config_2', 51189, 51195],
  ['h525_safemode_ahcm', 13198, 15342],
  ['one_config', 1672817, 1672832],
  ['one_config_unprogrammed', 1232222, 1232237],
  ['arch8_config_a', 444203, 444256],
  ['arch8_config_b', 470554, 470619],
  ['arch8_config_c', 490636, 490704],
  ['arch8_config_d', 492082, 492150],
  ['h600_safemode_gspm', 7109, 7115],
  ['h700_gspm', 7109, 7115],
  // 3465 until section 78 read the set header's count from the byte it is actually in.
  ['one_safemode', 8887, 8902],
  ['one34_region2', 8887, 8902],
  ['h650_safemode_gspm', 7109, 7115],
  // The spare One either side of its sync, so the nineteen container claims that CLAUDE.md and
  // the roadmap make about overlaps and round tripping are checked over the same nineteen.
  ['one_spare_before_sync', 1232222, 1232237],
  ['one_spare_after_sync', 1326549, 1326564],
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

test('the gap families are computed over every gap, not the listed ones',
  skipUnless('arch8_config_a'), () => {
    // The view that finds structures. `gaps` is capped at REPORT_LIMIT and sorted by size, so a
    // family of forty equal gaps below the cut is invisible in it; sections 75 and 66 were both
    // found by looking past that cut by hand. This is that view, and the totals below are what
    // says it did not stop at the cap either.
    //
    // The sample used to be `h525_config`, whose 203 gaps included a family of 43 equal ones. That
    // family was class 5's bodies and section 82 claimed them, so the demonstration moved to the
    // container that still has the shape: an arch 8 config, where the largest single gap is three
    // bytes and fifty one byte gaps carry more than it does.
    const report = coverage(parse(load('arch8_config_a') as Uint8Array));
    assert.equal(report.gapCount, 51);
    assert.equal(report.gapBytes, report.total - report.accounted);
    assert.ok(report.gapCount > report.gaps.length, 'the listed gaps are a sample, not the list');
    const biggest = report.gapFamilies[0];
    assert.deepEqual(biggest, { length: 1, count: 50, bytes: 50 });
    assert.equal(report.gaps[0]?.length, 3);
    assert.ok((biggest?.bytes ?? 0) > 3);
  });

test('a gap family counts equal lengths and nothing else', () => {
  // A synthetic case, because the corpus cannot produce a container with a chosen gap layout and
  // an off by one here would be invisible against real data.
  const blob = new Uint8Array(64);
  const report = coverage(new Container({
    blobOffset: 0, length: blob.length, flashBase: 0x1000, endAddr: blob.length - 4,
    formatRaw: 0x1400, pointerCount: 2, markerOffset: SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * 2,
    marker: 'CMAH', family: FAMILIES[0] as (typeof FAMILIES)[number], trailerChecksum: 0, blob,
    sections: [],
  }));
  // Whatever this container claims, every family's bytes are its length times its count and the
  // families partition the gaps.
  for (const family of report.gapFamilies) {
    assert.equal(family.bytes, family.length * family.count);
  }
  assert.equal(
    report.gapFamilies.reduce((n, f) => n + f.count, 0) <= report.gapCount,
    true,
    'families are capped, so they can only undercount',
  );
});


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

/**
 * Section 83, the three claims that took the residue from tens of bytes a container to single
 * figures. Corpus wide rather than per sample, because each is a rule and not a number: what would
 * falsify one is a single container where it does not hold.
 */
test('base slot 8 is its leading action list and every mode page list', skipWithoutLab(), () => {
  // The section's whole extent, accounted by two owners and nothing else. That is what says the
  // leading list is a structure rather than a convenient four bytes: section 27 derived its length
  // from `1 + 3 * count` and the mode pages, which know nothing about it, land exactly on its end.
  for (const [name] of ACCOUNTED) {
    const data = load(name);
    if (data === undefined) continue;
    const c = parse(data);
    if (c.architecture === undefined) continue;
    const slot = archSlot(c.architecture, BINDING_SLOT);
    const section = c.sections[slot];
    if (section === undefined || section.isNull) continue;
    const start = c.blobOffsetOf(section.address) as number;
    const length = c.sectionLength(slot) as number;
    // Deduplicated by offset, because a claim is made per page and the arch 9 safe mode container
    // points 44 pages at two lists. The report counts each byte once for the same reason.
    const seen = new Set<number>();
    const inside = claims(c)
      .filter((x) => x.start >= start && x.start < start + length)
      .filter((x) => (seen.has(x.start) ? false : (seen.add(x.start), true)));
    assert.deepEqual(
      [...new Set(inside.map((x) => x.owner))].sort(),
      ['slot-6-page-list', 'slot-8-list'],
      `${name}: base slot 8 holds the leading list and the page lists, nothing else`,
    );
    assert.equal(
      inside.reduce((n, x) => n + x.length, 0),
      length,
      `${name}: the two of them tile the section exactly`,
    );
    const pages = (modeRecords(c) ?? []).flatMap((r) => r.pages);
    for (const page of pages) {
      const at = c.blobOffsetOf(page.list) as number;
      assert.ok(at >= start && at < start + length, `${name}: a page list outside base slot 8`);
    }
  }
});

test('base slot 0 is claimed with the terminator that sits outside its length',
  skipWithoutLab(), () => {
    // The two bytes every container was short. `frameLength` stops at the last node by design,
    // because that is what the field states; the frame is two bytes longer than the field.
    for (const [name] of ACCOUNTED) {
      const data = load(name);
      if (data === undefined) continue;
      const c = parse(data);
      const claim = claims(c).find((x) => x.owner === 'slot-0-tree');
      if (c.frameLength === undefined) {
        assert.equal(claim, undefined, `${name}: no frame, no claim`);
        continue;
      }
      assert.notEqual(claim, undefined, `${name}: a frame with no claim`);
      const { start, length } = claim as { start: number; length: number };
      const stated = c.frameLength === 0 ? EMPTY_FRAME_LENGTH : c.frameLength;
      assert.equal(length, stated + FRAME_END_LENGTH, `${name}: length plus the terminator`);
      assert.equal(c.blob[start + length - 2], FRAME_END[0], `${name}: 0xBEEF closes the claim`);
      assert.equal(c.blob[start + length - 1], FRAME_END[1]);
    }
  });

test('an empty counted array is claimed, and only when it is nothing but zeros',
  skipWithoutLab(), () => {
    // Base slot 16, the number sender, is empty in every config anybody has, so this rule fires at
    // least once per container. The guard is what keeps it from becoming a way to claim any short
    // section: a single non zero byte and the section stays in the gaps where it belongs.
    for (const [name] of ACCOUNTED) {
      const data = load(name);
      if (data === undefined) continue;
      const c = parse(data);
      let empties = 0;
      for (const claim of claims(c)) {
        if (!claim.owner.endsWith('-table') || claim.length > EMPTY_ARRAY_LIMIT) continue;
        empties += 1;
        for (let i = 0; i < claim.length; i += 1) {
          assert.equal(c.blob[claim.start + i], 0, `${name}: ${claim.owner} is not empty`);
        }
      }
      assert.ok(empties > 0, `${name}: no empty array anywhere, and slot 16 should be one`);
    }
  });
