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

import { load, skipUnless, skipWithoutLab, require_ } from '@harmony/lab';
import {
  BINDING_SLOT,
  CLOCK_RECORD_LENGTH,
  CLOCK_SECTION_LENGTH,
  Container,
  EMPTY_ARRAY_LIMIT,
  EMPTY_FRAME_LENGTH,
  FAMILIES,
  FRAME_END,
  FRAME_END_LENGTH,
  PICTURE_BANK_BIAS,
  REPORT_LIMIT,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  archSlot,
  claims,
  coverage,
  deadTerminator,
  gapFamilies,
  modeRecords,
  parameterGroups,
  parse,
  pictureBankStart,
  reachablePrograms,
} from '../src/index.ts';

/** `[sample, accounted, total]`, every container in the corpus. */
const ACCOUNTED: readonly [string, number, number][] = [
  ['h700_config', 979184, 979184],
  ['h700_config_2', 979242, 979242],
  ['h600_config', 738149, 738149],
  // 52667 and 39448 until section 82 read class 5's bodies, symbol tables and pulse blocks.
  ['h525_config', 78486, 78486],
  ['h525_config_2', 51195, 51195],
  ['h525_safemode_ahcm', 15059, 15342],
  ['one_config', 1672832, 1672832],
  ['one_config_unprogrammed', 1232237, 1232237],
  ['arch8_config_a', 444256, 444256],
  ['arch8_config_b', 470619, 470619],
  ['arch8_config_c', 490704, 490704],
  ['arch8_config_d', 492150, 492150],
  ['h600_safemode_gspm', 7115, 7115],
  ['h700_gspm', 7115, 7115],
  // 3465 until section 78 read the set header's count from the byte it is actually in.
  ['one_safemode', 8902, 8902],
  ['one34_region2', 8902, 8902],
  ['h650_safemode_gspm', 7115, 7115],
  // The spare One either side of its sync, so the nineteen container claims that CLAUDE.md and
  // the roadmap make about overlaps and round tripping are checked over the same nineteen.
  ['one_spare_before_sync', 1232237, 1232237],
  ['one_spare_after_sync', 1326564, 1326564],
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

test('the gap families are computed over every gap, not the listed ones', () => {
  // The view that finds structures. `gaps` is capped at REPORT_LIMIT and sorted by size, so a
  // family of forty equal gaps below the cut is invisible in it; sections 75, 66 and 84 were all
  // found by looking past that cut. This is that view, and it counts every gap rather than the
  // listed ones.
  //
  // **It is tested on a list rather than on a container, and that is a consequence of finishing.**
  // The sample was `h525_config`, whose 203 gaps held a family of 43; section 82 claimed those, so
  // it moved to `arch8_config_a`, where fifty one byte gaps outweighed the largest single gap of
  // three; section 84 claimed those too and no container in the corpus has more than a handful of
  // gaps left. A demonstration that depends on a fixture the work is trying to eliminate stops
  // checking the moment it succeeds.
  const many = [
    ...Array.from({ length: 50 }, () => ({ length: 1 })),
    ...Array.from({ length: 3 }, () => ({ length: 9 })),
    { length: 3 },
  ];
  const families = gapFamilies(many);
  assert.ok(many.length > REPORT_LIMIT, 'more gaps than a report would ever list');
  assert.deepEqual(families, [
    { length: 1, count: 50, bytes: 50 },
    { length: 9, count: 3, bytes: 27 },
    { length: 3, count: 1, bytes: 3 },
  ]);
  // The families partition the gaps: every one of them is counted exactly once.
  assert.equal(families.reduce((n, f) => n + f.count, 0), many.length);
  assert.equal(families.reduce((n, f) => n + f.bytes, 0),
    many.reduce((n, g) => n + g.length, 0));
  // And the cut is by bytes, so a long family of one beats a short family of many only when it
  // carries more. Fifty one byte gaps outweigh a three byte one, which is the arch 8 case.
  assert.ok((families[0]?.bytes ?? 0) > (families[2]?.bytes ?? 0));
});

test('every gap the report counts is one the families describe',
  skipUnless('h525_safemode_ahcm'), () => {
    // The corpus side of the same property, on the one container that still has gaps at all.
    const report = coverage(parse(load('h525_safemode_ahcm') as Uint8Array));
    assert.ok(report.gapCount > 0, 'this sample is the one with work left in it');
    assert.equal(report.gapBytes, report.total - report.accounted);
    assert.equal(report.gapFamilies.reduce((n, f) => n + f.count, 0), report.gapCount);
    assert.equal(report.gapFamilies.reduce((n, f) => n + f.bytes, 0), report.gapBytes);
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
  // **The layout, pinned.** This is the off by one the test exists for and it was not asserted: the
  // body only related the families to each other, so a report with no families at all satisfied both
  // the loop and the inequality below. 64 bytes, a two slot table ending at the marker, an end address
  // four short of the length: one gap of 35.
  assert.deepEqual(report.gapFamilies, [{ length: 35, count: 1, bytes: 35 }]);

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
    const data = require_(name);
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
  // Three `continue`s stand between the loop and the assertions, so nothing said how many containers
  // reached them and base slot 8's whole claim could have gone unexercised.
  let checked = 0;
  for (const [name] of ACCOUNTED) {
    const data = require_(name);
    const c = parse(data);
    assert.ok(c.architecture !== undefined, `${name} states its architecture`);
    const slot = archSlot(c.architecture, BINDING_SLOT);
    const section = c.sections[slot];
    if (section === undefined || section.isNull) continue;
    checked += 1;
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
  assert.equal(checked, ACCOUNTED.length, 'a container skipped base slot 8 rather than checking it');
});

test('base slot 0 is claimed with the terminator that sits outside its length',
  skipWithoutLab(), () => {
    // The two bytes every container was short. `frameLength` stops at the last node by design,
    // because that is what the field states; the frame is two bytes longer than the field.
    for (const [name] of ACCOUNTED) {
      const data = require_(name);
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
      const data = require_(name);
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

test('every user config is accounted for to the byte', skipWithoutLab(), () => {
  // Milestone M2's first two parts, finished. **The exception is named rather than excluded**: the
  // arch 9 safe mode container is the one sample with structures left in it, and a test that
  // skipped it would let the corpus agree with itself, which is the condition that hid the font
  // set's first glyph code until section 78.
  const open = 'h525_safemode_ahcm';
  let checked = 0;
  for (const [name] of ACCOUNTED) {
    const data = require_(name);
    const report = coverage(parse(data));
    if (name === open) {
      assert.ok(report.accounted < report.total, `${open}: this one is the work that is left`);
      continue;
    }
    assert.equal(report.accounted, report.total, `${name}: ${report.gapBytes} bytes unaccounted`);
    assert.equal(report.gapCount, 0);
    checked += 1;
  }
  assert.ok(checked >= 18, `only ${checked} containers checked, expected the whole corpus`);
});

test('a screen program that ends by transferring still carries its terminator',
  skipWithoutLab(), () => {
    // Section 84. The walk stops at a jump or a switch, so the byte after one is nobody's as far as
    // it is concerned. On arch 8 that byte is a zero which nothing else claims, 49 to 64 per config,
    // and it is the program's own `SCREEN_END`.
    //
    // **The closure is positional and it comes from the same file.** In the same place, between a
    // program and the mode page record after it, most programs end with a `SCREEN_END` the walk
    // does reach. So the terminator is emitted whether or not it can be executed, and the two cases
    // differ only in the last instruction. The counts of each are asserted per sample below.
    //
    // The counts are of every program that ends by transferring into a zero, which is more than the
    // number of bytes this recovered: three per arch 8 config end in a switch whose zero another
    // program's walk had already reached, so they were never unclaimed. 49, 61 and 64 were the
    // unclaimed ones.
    const expected: Record<string, number> = {
      arch8_config_a: 52,
      arch8_config_b: 64,
      arch8_config_c: 67,
      arch8_config_d: 67,
      one_config: 3,
      one_config_unprogrammed: 5,
      h600_config: 2,
      h700_config: 2,
      h700_config_2: 2,
      h525_config: 0,
      h525_config_2: 0,
    };
    for (const [name, count] of Object.entries(expected)) {
      const data = require_(name);
      const c = parse(data);
      let dead = 0;
      for (const [, program] of reachablePrograms(c)) {
        const at = deadTerminator(c, program);
        if (at === undefined) continue;
        dead += 1;
        assert.equal(c.blob[at], 0, `${name}: a terminator that is not a terminator`);
      }
      assert.equal(dead, count, `${name}: dead terminators`);
    }
  });

test('a page record is preceded by a program terminator, reached or not', skipWithoutLab(), () => {
  // The other half of the same argument, from the page side rather than the program side: the byte
  // in front of a mode page record is zero in every container, and where it is not, the program
  // before it ends with a jump that abuts the record. 36 arch 12 pages do that.
  for (const [name] of ACCOUNTED) {
    const data = require_(name);
    const c = parse(data);
    const dead = new Set<number>();
    for (const [, program] of reachablePrograms(c)) {
      const at = deadTerminator(c, program);
      if (at !== undefined) dead.add(at);
    }
    const owner = new Array<string | undefined>(c.blob.length);
    for (const claim of claims(c)) {
      for (let i = claim.start; i < claim.start + claim.length; i += 1) owner[i] ??= claim.owner;
    }
    // The arch 9 safe mode container is the one sample with unclaimed bytes left in it, so a page
    // there can legitimately be preceded by a zero nothing has claimed yet.
    const open = name === 'h525_safemode_ahcm';
    let zeros = 0;
    let abutting = 0;
    for (const page of (modeRecords(c) ?? []).flatMap((r) => r.pages)) {
      const at = c.blobOffsetOf(page.address);
      if (at === undefined || at === 0) continue;
      if (c.blob[at - 1] === 0) {
        zeros += 1;
        if (!open) {
          assert.equal(owner[at - 1], 'slot-11-program', `${name}: the terminator is unclaimed`);
        }
      } else {
        abutting += 1;
        assert.equal(owner[at - 1], 'slot-11-program',
          `${name}: whatever precedes a page is part of a program`);
      }
    }
    assert.ok(zeros + abutting > 0, `${name}: no mode pages at all`);
    assert.ok(zeros >= abutting, `${name}: ${abutting} pages abut, ${zeros} are terminated`);
    assert.ok(dead.size <= zeros, `${name}: more dead terminators than terminated pages`);
  }
});

test('base slot 3 is fourteen bytes, three of them zero past the record', skipWithoutLab(), () => {
  // The clock record closes at its own `0xEFBF`, so the three bytes after it are the section's and
  // not the record's. Zero in all nineteen containers, which is why the emitter writes them as
  // zeros rather than carrying them: a tail that is not zero should fail rather than pass quietly.
  let seen = 0;
  for (const [name] of ACCOUNTED) {
    const data = require_(name);
    const c = parse(data);
    const claim = claims(c).find((x) => x.owner === 'slot-3-clock');
    if (claim === undefined) continue;
    seen += 1;
    assert.equal(claim.length, CLOCK_SECTION_LENGTH, `${name}: the clock section`);
    for (let i = CLOCK_RECORD_LENGTH; i < CLOCK_SECTION_LENGTH; i += 1) {
      assert.equal(c.blob[claim.start + i], 0, `${name}: a nonzero byte past the clock record`);
    }
  }
  assert.ok(seen >= 18, `only ${seen} clocks, expected one per container`);
});

test('base slot 17 is two zero bytes where it names the picture bank', skipWithoutLab(), () => {
  // Section 62 established that the pointer lands `PICTURE_BANK_BIAS` bytes in front of the bank on
  // arch 8, 9 and 14. Which means the section's own part is those two bytes, not the one byte an
  // empty count accounts for, and both are zero in all thirteen containers that do this.
  let seen = 0;
  for (const [name] of ACCOUNTED) {
    const data = require_(name);
    const c = parse(data);
    if (c.architecture === 12) continue;
    const claim = claims(c).find((x) => x.owner === 'slot-17-table');
    const bank = pictureBankStart(c);
    if (claim === undefined || bank === undefined) continue;
    seen += 1;
    assert.equal(claim.start + claim.length, bank, `${name}: the claim stops at the bank`);
    assert.equal(claim.length, PICTURE_BANK_BIAS, `${name}: the section is the bias`);
    for (let i = 0; i < claim.length; i += 1) {
      assert.equal(c.blob[claim.start + i], 0, `${name}: a nonzero byte in front of the bank`);
    }
  }
  assert.ok(seen >= 13, `only ${seen} banks, expected thirteen`);
});

test('base slot 15 has twelve bytes on arch 12 that belong to no group', skipWithoutLab(), () => {
  // Section 44 saw these and called them the only untidy number in the section. They sit between
  // the tenth and eleventh group of arch 12's eleven, they are byte identical in all six arch 12
  // containers, and no `u24` anywhere in any container names their address. So whose they are is
  // settled by position, which is what this test asserts.
  //
  // **What they say is settled too**, section 103, and the test below this one asserts that: the
  // firmware reaches them by overrunning group 9 deliberately, four bytes as one more pair of device
  // levels and eight as a table of two bit fields. They stay carried rather than framed all the same,
  // because their reader indexes them as bytes and the emitter has nothing to gain from splitting
  // a run it would only put back the same way.
  const known = [0xff, 0x00, 0xff, 0x00, 0, 0, 0, 0, 0x55, 0x55, 0x55, 0x55];
  let arch12 = 0;
  for (const [name] of ACCOUNTED) {
    const data = require_(name);
    const c = parse(data);
    const spare = claims(c).filter((x) => x.owner === 'slot-15-spare');
    if (c.architecture !== 12) {
      assert.deepEqual(spare, [], `${name}: base slot 15 has no hole off arch 12`);
      continue;
    }
    arch12 += 1;
    assert.equal(spare.length, 1, `${name}: one hole`);
    const { start, length } = spare[0] as { start: number; length: number };
    assert.equal(length, known.length, `${name}: twelve bytes`);
    assert.deepEqual([...c.blob.subarray(start, start + length)], known, `${name}: the same twelve`);
    // Between two groups rather than past the last one, which is what makes it a hole.
    const groups = (parameterGroups(c) ?? []).map((g) => c.blobOffsetOf(g.address) as number);
    assert.ok(Math.min(...groups) < start && Math.max(...groups) > start, `${name}: not a tail`);
  }
  assert.ok(arch12 >= 6, `only ${arch12} arch 12 containers, expected six`);
});

test('the twelve spare bytes are group 9 overrun by two readers, with nothing left', () => {
  // Sections 103 and 106. Both readers start from group 9's first entry, and neither stops at the six
  // entries its header declares.
  //
  //   0x249A0  reads two u16 values at 4 * band, so band 3 takes bytes 12 to 15
  //   0x2492E  reads one byte at 0x10 + 4 * flag + (selector >> 2), so bytes 16 to 23
  //
  // The flag is operand bits 1 to 3 normalised to a boolean at `0x24F6C`, not bit 0, which is what
  // section 106 corrected. Either way it is one bit here, so the arithmetic below is unchanged.
  //
  // Twelve bytes above twelve declared ones, and the two ranges are adjacent and disjoint. That is
  // the arithmetic; the test exists because it is the whole reason the run is not a mystery, and
  // because a change to either constant should fail here rather than in a document.
  const declared = 6 * 2; // six u16 entries
  const bandThree = 4 * 3; // band 3's pair of device levels, at 4 * band
  assert.equal(bandThree, declared, 'band 3 starts exactly where the declared entries end');
  const channels = [];
  for (let flag = 0; flag <= 1; flag += 1) {
    for (let selector = 0; selector <= 12; selector += 1) {
      channels.push(0x10 + 4 * flag + (selector >>> 2));
    }
  }
  const lowest = Math.min(...channels);
  const highest = Math.max(...channels);
  assert.equal(lowest, bandThree + 4, 'the byte table starts where band 3s pair ends');
  assert.equal(highest, 0x17);
  assert.equal(highest + 1 - declared, 12, 'twelve bytes above the declared entries, exactly');
  // Four fields to a byte, and the selector range uses thirteen of the sixteen per value of the flag.
  assert.equal(new Set(channels).size, 8, 'eight bytes hold all of it');
});

test('the key table claims the mode record it is, in whichever form', skipWithoutLab(), () => {
  // Section 52 found the key table and base slot 6's first mode record are the same bytes. The
  // extent has to be the record's, because a mode record has two forms and an empty one is the
  // **wide** form: a zero lead byte and a zero count, two bytes where `1 + 4 * count` says one.
  // That is the whole of it on the arch 14 safe mode containers, and where their two unclaimed
  // bytes each came from. Arch 9 has no key table at all, so there the record is claimed as an
  // ordinary mode record and skipping it left 189 bytes of the safe mode container unaccounted.
  for (const [name] of ACCOUNTED) {
    const data = require_(name);
    const c = parse(data);
    const first = (modeRecords(c) ?? [])
      .find((record) => c.blobOffsetOf(record.start) === c.markerOffset + 4);
    if (first === undefined) continue;
    const owner = c.hasKeyTable ? 'key-table' : 'slot-6-mode';
    const claim = claims(c).find((x) => x.start === c.markerOffset + 4 && x.owner === owner);
    assert.notEqual(claim, undefined, `${name}: no ${owner} claim on the first mode record`);
    assert.equal(claim?.length, first.length, `${name}: the record's own length`);
    // And never both, which is what the deduplication in `claims` is for.
    const both = claims(c).filter((x) => x.start === c.markerOffset + 4
      && (x.owner === 'key-table' || x.owner === 'slot-6-mode'));
    assert.equal(both.length, 1, `${name}: claimed twice`);
  }
});
