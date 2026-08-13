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
  containerExtent,
  gapFamilies,
  lightBandExtras,
  logArea,
  modeRecords,
  parameterGroups,
  parse,
  pictureBankStart,
  reachablePrograms,
  touchPages,
  valueMaps,
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


test('two claims of one reader are an overlap, not a byte counted once',
  skipUnless('one_config'), () => {
    // **The detector's blind spot, and the reason it mattered.** It compared owner **names**, so a
    // reader whose size rule overran its neighbour was invisible whenever both bytes belonged to the
    // same owner, and that is where nearly all the bytes are: over 99% of `one_config`'s claimed bytes
    // sit in owner names carrying more than one claim. Since `accounted` is a union, an over-claiming
    // reader cannot lower the percentage either, so the overlap list was the only falsifier the
    // headline 100.0% had and it could not see the commonest way to break it.
    //
    // The perturbation is one byte, in a copy, and it is the smallest one that produces the shape:
    // base slot 10's list at this offset grows by one instruction and swallows three bytes of the
    // next. Before this fix the report was 100.00%, zero overlaps, zero gaps.
    const original = require_('one_config');
    const perturbed = Uint8Array.from(original);
    const at = 9579 + 5;
    perturbed[at] = (perturbed[at] as number) + 1;

    const clean = coverage(parse(original));
    assert.deepEqual([clean.overlaps.length, clean.gapCount], [0, 0], 'the sample itself is clean');

    const report = coverage(parse(perturbed));
    assert.equal(report.overlaps.length, 1, 'one overrun, one overlap');
    assert.deepEqual((report.overlaps[0] as { owners: string[] }).owners,
      ['slot-10-list', 'slot-10-list'],
      'and the owner is named twice, because one name cannot say which of its claims collided');
  });

test('the identical run stays legitimate, since a shared block is claimed by two records',
  skipWithoutLab(), () => {
    // The other half of the rule, and the reason it is stated as "the identical run" rather than "one
    // claim per byte": an infrared duration block may be named by several records, section 61, and
    // both claims are correct and describe the same bytes. If the stricter test had refused those, the
    // corpus would have lit up; it does not, in any container.
    for (const [name] of ACCOUNTED) {
      const c = parse(require_(name));
      const seen = new Map<number, { start: number; length: number }>();
      let identical = 0;
      for (const claim of claims(c)) {
        for (let i = claim.start; i < claim.start + claim.length; i += 1) {
          const held = seen.get(i);
          if (held === undefined) seen.set(i, claim);
          else if (held.start === claim.start && held.length === claim.length) identical += 1;
        }
      }
      assert.equal(coverage(c).overlaps.length, 0, `${name}: no overlaps`);
      if (name === 'one_config') {
        assert.ok(identical > 0, 'and the shared case does occur, so the exemption is exercised');
      }
    }
  });

test('the gaps and the accounted bytes partition the container', skipWithoutLab(), () => {
  // A partition, asserted as one. This read `accounted + gapped <= total` on the grounds that
  // `report.gaps` is truncated to the largest few, which is true of what `make coverage --detail`
  // prints and not of the field: `gaps.length` equals `gapCount` in all nineteen containers, so the
  // sum is exact and an inequality was strictly weaker than the truth. A test named for a partition
  // that permits a shortfall would pass with a whole section unclaimed and unlisted.
  for (const [name] of ACCOUNTED) {
    const data = require_(name);
    const report = coverage(parse(data));
    const gapped = report.gaps.reduce((n, g) => n + g.length, 0);
    assert.equal(report.gaps.length, report.gapCount, `${name}: the gap list is the whole list`);
    assert.equal(
      report.accounted + gapped,
      report.total,
      `${name}: ${report.accounted} accounted plus ${gapped} in gaps is not ${report.total}`,
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

test('base slot 15s twelve arch 12 bytes are claimed by two readers, not by position',
  skipWithoutLab(), () => {
  // Section 44 saw these and called them the only untidy number in the section, and section 84
  // claimed them by position because nothing had read them: a `slot-15-spare` owner that filled every
  // unclaimed byte between the lowest group and the pointer array. **This test asserted that hole and
  // now asserts its absence**, because section 103 read both halves out of the firmware and the
  // catch-all outlived its reason. It was also the thing standing between a broken group and the
  // headline number: zeroing any group's entry count let the spare swallow what the group stopped
  // claiming, and `coverage` still reported 100.00%, zero gaps and zero overlaps, on 32 bytes for a
  // Harmony One and 28 for a Harmony 600 and a Harmony 880.
  //
  // So the assertion is that no claim is made by position any more, anywhere, and that the two stated
  // claims cover exactly the twelve bytes the catch-all used to.
  const known = [0xff, 0x00, 0xff, 0x00, 0, 0, 0, 0, 0x55, 0x55, 0x55, 0x55];
  let arch12 = 0;
  for (const [name] of ACCOUNTED) {
    const data = require_(name);
    const c = parse(data);
    // The guard against the catch-all coming back under any name: nothing here claims a run because
    // it happened to be unclaimed.
    assert.deepEqual(claims(c).filter((x) => x.owner === 'slot-15-spare'), [],
      `${name}: base slot 15 claims nothing by position`);
    const extras = claims(c)
      .filter((x) => x.owner === 'slot-15-band-pair' || x.owner === 'slot-15-band-fields')
      .sort((a, b) => a.start - b.start);
    if (c.architecture !== 12) {
      // No group 9 to overrun: nine groups on arch 8 (Harmony 880) and arch 14 (Harmony 600 and
      // 700), five on arch 9 (Harmony 525).
      assert.deepEqual(extras, [], `${name}: no band continuation off arch 12`);
      assert.ok((parameterGroups(c) ?? []).length <= 9, `${name}: fewer than ten groups`);
      continue;
    }
    arch12 += 1;
    assert.equal(extras.length, 2, `${name}: the pair and the field table`);
    const [pair, fields] = extras as [{ start: number; length: number; owner: string },
      { start: number; length: number; owner: string }];
    assert.equal(pair.owner, 'slot-15-band-pair', `${name}: the pair comes first`);
    assert.equal(pair.length, 4, `${name}: band 3s two u16 levels`);
    assert.equal(fields.length, 8, `${name}: eight bytes of two bit fields`);
    // Adjacent and contiguous, so together they are the twelve and there is no seam in between.
    assert.equal(fields.start, pair.start + pair.length, `${name}: adjacent`);
    assert.deepEqual([...c.blob.subarray(pair.start, fields.start + fields.length)], known,
      `${name}: the same twelve`);
    // And they start exactly where group 9's declared entries end, which is the reading rather than
    // the position: the group states six entries and the firmware reads a seventh pair.
    const groups = parameterGroups(c) ?? [];
    const group = groups[9] as { address: number; length: number };
    assert.equal(pair.start, (c.blobOffsetOf(group.address) as number) + group.length,
      `${name}: the continuation starts at group 9s declared end`);
  }
  // Exact. `>= 6` was the population itself, so it read as slack and had none: it fails on the first
  // Harmony One container added and passes on any removed.
  assert.equal(arch12, 6, `${arch12} arch 12 containers`);
});

test('the readers land where the firmware arithmetic says, on every Harmony One container',
  skipWithoutLab(), () => {
  // **This test used to be the arithmetic below and nothing else**, which made it algebra on its own
  // literals: `bandThree === declared` is `4 * 3 === 6 * 2`, true whatever any container holds and
  // whatever `tables.ts` does. `CLAUDE.md`'s standard is that a closure whose two ends come from the
  // same place is not a closure, so one end comes from the containers now: the offsets the firmware
  // computes have to be the offsets `lightBandExtras` returns, in all six.
  let arch12 = 0;
  for (const [name] of ACCOUNTED) {
    const c = parse(require_(name));
    const extras = lightBandExtras(c);
    if (c.architecture !== 12) {
      assert.equal(extras, undefined, `${name}: no group 9 off arch 12`);
      continue;
    }
    arch12 += 1;
    assert.notEqual(extras, undefined, `${name}: the continuation reads`);
    const group = (parameterGroups(c) ?? [])[9] as { address: number };
    // `0x249A0` adds `4 * band` to the cursor, which is the group's first entry, and band 3 is 12.
    assert.equal(extras?.pair.address, group.address + 1 + 4 * 3, `${name}: band 3 at 4 * band`);
    // `0x2492E` reads `0x10 + 4 * flag + (selector >> 2)`, whose lowest byte is `0x10`.
    assert.equal(extras?.fields.address, group.address + 1 + 0x10, `${name}: the table at 0x10`);
    // Section 103's values, which is the second end: the pair ratchets 16, 64, 128 up to 255.
    assert.deepEqual(extras?.pair.values, [255, 255], `${name}: band 3 reads 255 and 255`);
    assert.deepEqual(extras?.fields.bytes, [0, 0, 0, 0, 0x55, 0x55, 0x55, 0x55],
      `${name}: every field zero for the flag clear and one for it set`);
  }
  assert.equal(arch12, 6, `${arch12} arch 12 containers`);
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

test('a group that loses its own entry count shows as a gap, which it did not before',
  skipUnless('one_config', 'h600_config', 'h525_config', 'arch8_config_a'), () => {
  // **The control for the whole accounting, and the one thing none of the tests above can be.** Every
  // other test here asks whether the readers agree with this corpus; this one damages a container and
  // demands the report notice. It is the shape the review of 13 August 2026 found missing: the number
  // reported 100.00% with zero gaps and zero overlaps on bytes no reader could explain, because
  // `slot-15-spare` filled whatever was unclaimed between the lowest base slot 15 group and the
  // pointer array. Zeroing one group's `u8` entry count made the group claim one byte instead of
  // thirteen and the catch-all absorbed the difference: 32 bytes on a Harmony One, 28 on a Harmony 600
  // and a Harmony 880, 8 on a Harmony 525, in silence, every time.
  //
  // Four architectures, because the catch-all was not arch 12's: it claimed nothing in the unperturbed
  // containers off arch 12 and absorbed bytes in all four once one was damaged.
  for (const name of ['one_config', 'h600_config', 'h525_config', 'arch8_config_a']) {
    const raw = require_(name);
    const c = parse(raw);
    const before = coverage(c);
    assert.equal(before.gapCount, 0, `${name}: nothing unclaimed to start with`);

    // The largest group, so the loss is worth more than a rounding error, and its count byte is the
    // first byte of its own body.
    const groups = parameterGroups(c) ?? [];
    const biggest = [...groups].sort((a, b) => b.length - a.length)[0] as
      { address: number; length: number };
    const at = c.blobOffsetOf(biggest.address) as number;
    const { start } = containerExtent(raw);
    const damaged = raw.slice();
    damaged[start + at] = 0;

    const after = coverage(parse(damaged));
    // **Exact, and derivable rather than recorded.** A group with a zero count claims its count byte
    // and nothing else, so the loss is its own length less one: 32 bytes on the Harmony One, 28 on the
    // Harmony 600 and the Harmony 880, 8 on the Harmony 525. A floor would have absorbed the catch-all
    // coming back for part of it.
    const lost = biggest.length - 1;
    assert.equal(after.gapCount, 1, `${name}: one gap, where the group's body was`);
    assert.equal(after.gapBytes, lost, `${name}: ${lost} bytes of body unclaimed`);
    assert.deepEqual(after.gapFamilies, [{ length: lost, count: 1, bytes: lost }],
      `${name}: one family of one`);
    // **Not the percentage**, which is the honest limit of that number: 32 bytes of a 1672832 byte
    // Harmony One container still rounds to 100.00%, so a report quoting only the fraction cannot see
    // this at all and `gapCount` is the signal.
    // And no owner picked the bytes up under another name, which is what would hide it again.
    assert.equal(claims(parse(damaged)).filter((x) => x.owner === 'slot-15-spare').length, 0,
      `${name}: nothing claims a run for being unclaimed`);
  }
});

test('every section table is claimed once, and the two derivations of one agree',
  skipWithoutLab(), () => {
  // **Two right copies, which is the state before two diverging ones.** `slot-12-table` was claimed
  // twice in all nineteen containers and `slot-9-table` in six: once by the section's own reader from
  // its `countedPointers` width, once by the pointer array loop from `width + 3 * count === length`.
  // A comment beside base slot 12 said its array is not one the loop recognises, and it is.
  //
  // No test could see it and none was missing. The overlap detector treats an identical run as
  // legitimate, and it has to, because a shared infrared duration block genuinely is claimed once per
  // record that names it, section 61. So a duplicate that agrees is indistinguishable from a structure
  // two readers legitimately share, which is why this checks the thing the detector cannot: that a
  // table has exactly one claim, and that where both derivations exist they produce the same extent.
  let compared = 0;
  for (const [name] of ACCOUNTED) {
    const c = parse(require_(name));
    const tables = new Map<string, { start: number; length: number }[]>();
    for (const claim of claims(c)) {
      if (!/^slot-\d+-table$/.test(claim.owner)) continue;
      const list = tables.get(claim.owner) ?? [];
      list.push({ start: claim.start, length: claim.length });
      tables.set(claim.owner, list);
    }
    for (const [owner, list] of tables) {
      assert.equal(list.length, 1, `${name}: ${owner} claimed ${list.length} times`);
    }
    // And the comparison itself, which is what the loop does instead of claiming again: wherever
    // `pointerArrayAt` recognises a section whose table a reader has claimed, the extents must match.
    for (let i = 0; i < c.sections.length; i += 1) {
      const array = c.pointerArrayAt(i);
      if (array === undefined) continue;
      let base: number | undefined;
      for (let b = 0; b < 20; b += 1) {
        try {
          if (archSlot(c.architecture as number, b) === i) { base = b; break; }
        } catch { break; }
      }
      const claimed = tables.get(`slot-${base ?? i}-table`)?.[0];
      if (claimed === undefined) continue;
      compared += 1;
      assert.deepEqual({ start: claimed.start, length: claimed.length },
        { start: array.start, length: array.length },
        `${name}: slot ${i} table, the reader and the array rule disagree`);
    }
  }
  // Exact, so a container leaving the corpus fails rather than quietly comparing less. 104 slot and
  // container pairs where both derivations exist, of which 20 are the two that used to duplicate:
  // `slot-12-table` in nineteen containers and `slot-9-table` in six, less the five and thirteen where
  // the array rule refuses and only the reader answers.
  assert.equal(compared, 104, `${compared} table extents compared`);
});

test('four claims that used to rest on a coincidence now rest on a comparison',
  skipWithoutLab(), () => {
  // Each of these was right in all nineteen containers for a reason that was not the reason given.
  // The claims now state what they mean and this asserts the agreement that used to be assumed.
  let logs = 0;
  let banks = 0;
  let shared = 0;
  let records = 0;
  for (const [name] of ACCOUNTED) {
    const c = parse(require_(name));

    // Base slot 2: the claim is `logArea(c).length`, `width + 6` from the consumer. It used to be the
    // gap to the next pointer, which section 36 says is an upper bound and not a size, with base slot
    // 4 the standing counterexample at 125 bytes against a gap of up to 1532.
    const area = logArea(c);
    const logClaim = claims(c).find((x) => x.owner === 'slot-2-log');
    if (area !== undefined && logClaim !== undefined) {
      logs += 1;
      assert.equal(logClaim.length, area.length, `${name}: the log claim is the reader's length`);
      const gap = c.sectionLength(archSlot(c.architecture as number, 2));
      assert.equal(area.length, gap, `${name}: log area ${area.length} against a gap of ${gap}`);
    }

    // Base slot 17 where it names the picture bank: the header is `PICTURE_BANK_BIAS`, and the
    // subtraction it used to be could only ever produce that, since `pictureBankStart` is the section
    // start plus the bias. The identity belongs here, where it can be seen for what it is.
    const touch = touchPages(c);
    const bank = pictureBankStart(c);
    if (touch !== undefined && bank !== undefined && touch.records.length === 0) {
      banks += 1;
      assert.equal(bank - touch.start, PICTURE_BANK_BIAS,
        `${name}: the bank sits one bias past the section, by construction`);
      const header = claims(c).find((x) => x.owner === 'slot-17-table');
      assert.equal(header?.length, PICTURE_BANK_BIAS, `${name}: claimed as the constant`);
    }

    // Base slot 14: the truncation guarding against a shared tail. It has never fired, so the zero is
    // the claim. The day it does, either the sharing is real or `valueMaps` returns a length that runs
    // into its neighbour, and both are worth reading rather than being clipped into plausibility.
    const maps = valueMaps(c);
    if (maps !== undefined) {
      const starts = [...maps]
        .map((m) => c.blobOffsetOf(m.address))
        .filter((o): o is number => o !== undefined);
      for (const record of maps) {
        const start = c.blobOffsetOf(record.address);
        if (start === undefined) continue;
        records += 1;
        if (starts.some((o) => o > start && o < start + record.length)) shared += 1;
      }
    }
  }
  // Exact counts, so a sample leaving the corpus fails rather than checking less.
  assert.equal(logs, 19, `${logs} containers with a log area`);
  assert.equal(banks, 13, `${banks} containers whose base slot 17 names the picture bank`);
  assert.equal(records, 239, `${records} base slot 14 records`);
  assert.equal(shared, 0, `${shared} base slot 14 records overlap a neighbour`);
});
