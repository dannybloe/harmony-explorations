/**
 * What a length change would move, over the corpus. The tests behind `docs/growing-a-config.md`.
 *
 * The numbers here are exact, per the standard: a floor would absorb a whole sample dropping out of
 * a loop, and the population is a literal in this file, so an exact count moves only when somebody
 * changes a reader or adds a container and then it moves in the diff.
 *
 * **Read only throughout.** Two tests build a modified copy of a container in memory, because a
 * control has to, and nothing is written anywhere and no remote is opened. `edit.ts` refuses to
 * change any structure's length; this is the survey of what would have to be true first.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless, skipWithoutLab, require_ } from '@harmony/lab';
import {
  IMPLIED_BY,
  IR_RECORD_POINTER_BIAS,
  POINTER_WIDTH,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  TRAILER_CHECKSUM_OFFSET,
  END_MARKER_LENGTH,
  archSlot,
  claims,
  growthReport,
  impliedPositions,
  insertionCost,
  parse,
  pointers,
  rebuilds,
  restamps,
  trailerChecksum,
} from '../src/index.ts';

/**
 * `[sample, pointers, shared targets, packed structures, chained structures, rewrites at the bank]`,
 * every container in the corpus. A bank of -1 is a container with no pictures at all.
 */
const SURVEYED: readonly [string, number, number, number, number, number][] = [
  ['one_safemode', 301, 7, 32, 176, -1],
  ['one34_region2', 301, 7, 32, 176, -1],
  ['h700_gspm', 292, 4, 35, 132, -1],
  ['h600_safemode_gspm', 292, 4, 35, 132, -1],
  ['h650_safemode_gspm', 292, 4, 35, 132, -1],
  ['one_config', 12045, 566, 332, 5548, 1091],
  ['one_config_unprogrammed', 6097, 364, 154, 2678, 589],
  ['h600_config', 17437, 3955, 254, 7344, 501],
  ['h700_config', 27104, 5968, 426, 11436, 893],
  ['h700_config_2', 27104, 5967, 426, 11441, 893],
  ['h525_config', 4810, 166, 135, 4772, 1114],
  ['h525_config_2', 3191, 160, 97, 3339, 797],
  ['arch8_config_a', 5507, 150, 141, 2747, 980],
  ['arch8_config_b', 6844, 200, 173, 3479, 1264],
  ['arch8_config_c', 7764, 233, 204, 4062, 1467],
  ['arch8_config_d', 7804, 234, 204, 4062, 1467],
  ['h525_safemode_ahcm', 953, 47, 2, 1261, 344],
  ['one_spare_before_sync', 6097, 364, 154, 2678, 589],
  ['one_spare_after_sync', 6037, 351, 146, 2579, 550],
];

const SAMPLES = SURVEYED.map(([name]) => name);

for (const [name, count, shared, packed, chain, bank] of SURVEYED) {
  test(`${name} states ${count} addresses and the census refuses none`, skipUnless(name), () => {
    // **The refusal count is the load bearing assertion here, not the total.** The census computes
    // each pointer's offset from a layout that also lives in a reader, which is a second copy, so
    // every entry checks that the three bytes at its own offset hold the address the reader
    // returned. A layout moving in `sections.ts`, `ir.ts`, `font.ts` or `valuemap.ts` fails here
    // rather than producing a census of addresses that are not there.
    const refusals: string[] = [];
    const found = pointers(parse(load(name) as Uint8Array), refusals);
    assert.deepEqual(refusals, [], 'a census entry disagreed with the reader that produced it');
    assert.equal(found.length, count);
  });

  test(`${name} has ${shared} addresses named more than once`, skipUnless(name), () => {
    // Every one of these is a writer rail: editing what sits at a shared address changes several
    // meanings, and a relocation has to rewrite every holder rather than the first one it finds.
    const report = growthReport(parse(load(name) as Uint8Array));
    assert.equal(report.shared.length, shared);
    for (const one of report.shared) assert.ok(one.holders.length > 1);
  });

  test(`${name} has ${packed} packed and ${chain} chained positions`, skipUnless(name), () => {
    const report = growthReport(parse(load(name) as Uint8Array));
    assert.deepEqual(report.unexplained, [], 'an implied structure with no reason recorded');
    const kinds = (which: string): number =>
      report.implied.filter((one) => one.kind === which).length;
    assert.equal(kinds('packed'), packed);
    assert.equal(kinds('chain'), chain);
    // Four per container and never more: the header, the section table, the end marker and the
    // trailer. The key table is not among them even though nothing points at it either, because
    // base slot 6's mode table names it: it **is** that architecture's first mode record, section 52.
    assert.equal(kinds('frame'), 4);
  });

  test(`${name} costs ${bank} pointer rewrites to grow at the picture bank`, skipUnless(name), () => {
    const report = growthReport(parse(load(name) as Uint8Array));
    assert.equal(report.atBank?.rewrite ?? -1, bank);
  });
}

test('the only addresses naming flash outside the container are the log area\'s two', skipWithoutLab(), () => {
  // Base slot 2 reserves a region **above** the config, section 47, so its two addresses are the
  // only ones a relocation must leave alone. That they are exactly two, in every container, is what
  // makes "rewrite everything that lands inside" a complete rule rather than a heuristic.
  let outward = 0;
  for (const name of SAMPLES) {
    const c = parse(require_(name));
    const report = growthReport(c);
    assert.equal(report.outward.length, 2, name);
    for (const one of report.outward) assert.equal(one.holder, 'slot-2-log');
    // And the ceiling: making room on the first byte of content moves everything the container
    // names, which is every pointer bar those two. Stated as an identity rather than as a number,
    // so it holds when a reader lands and adds pointers.
    assert.equal(report.atContent.rewrite, report.pointers.length - 2, name);
    outward += report.outward.length;
  }
  assert.equal(outward, 38, 'two per container over nineteen containers');
});

test('growing at the very top of a container rewrites nothing at all', skipWithoutLab(), () => {
  // The finding the survey exists to produce: growth has no price, it has a price per place. Below
  // the trailer nothing is addressed, so appending costs the two restamped header fields and no
  // pointer rewrites whatever, on all nineteen containers.
  for (const name of SAMPLES) {
    const c = parse(require_(name));
    const report = growthReport(c);
    assert.equal(report.atEnd.rewrite, 0, name);
    assert.equal(report.atEnd.shared, 0, name);
    // One implied structure sits above it, and it is the trailer, whose position is the container's
    // own arithmetic rather than anything a writer has to reproduce.
    assert.equal(report.atEnd.implied, 1, name);
    assert.deepEqual(report.implied.filter((one) => one.start >= report.atEnd.at)
      .map((one) => one.owner), ['trailer'], name);
  }
});

test('the cost of making room never rises as the place moves up', skipWithoutLab(), () => {
  // A property rather than a number, and it is what makes "where is it cheap" a well posed
  // question: the set of addresses above an offset shrinks as the offset rises, so the cost is
  // monotonic. A census that double counted a pointer, or counted one whose target is below its
  // own field, would break this without changing any total.
  for (const name of SAMPLES) {
    const c = parse(require_(name));
    const census = { pointers: pointers(c), implied: impliedPositions(c) };
    const points = [0, 0.25, 0.5, 0.75, 1]
      .map((share) => Math.floor(share * (c.blob.length - 6)));
    let previous = Number.POSITIVE_INFINITY;
    for (const at of points) {
      const cost = insertionCost(c, at, census);
      assert.ok(cost.rewrite <= previous, `${name}: ${cost.rewrite} at ${at} above ${previous}`);
      previous = cost.rewrite;
    }
  }
});

test('every address that lands inside a structure is one of two known kinds', skipWithoutLab(), () => {
  // A pointer that lands on a structure's first byte can be rewritten from the structure's new
  // address. One that lands **inside** one needs the containing structure's new address plus an
  // offset, so it is a different job, and there are exactly two families of them in the corpus.
  //
  // A glyph run is stored once inline and referenced by every other program that draws it, section
  // 121, so opcode 4's address lands in the middle of some opcode 5 instruction. And an infrared
  // group's record pointer lands `IR_RECORD_POINTER_BIAS` bytes into its record, section 65, which
  // is asserted here rather than assumed: the bias is what makes the family mechanical.
  let strings = 0;
  let records = 0;
  for (const name of SAMPLES) {
    const c = parse(require_(name));
    const starts = new Set(claims(c).map((claim) => claim.start));
    const bounds = claims(c).sort((a, b) => a.start - b.start);
    for (const pointer of pointers(c)) {
      if (pointer.lands === undefined || starts.has(pointer.lands)) continue;
      if (pointer.holder === 'slot-11-program') {
        strings += 1;
        assert.equal(pointer.names, 'a glyph run in another program', name);
        continue;
      }
      assert.equal(pointer.holder, 'slot-5-group', `${name}: ${pointer.holder} ${pointer.names}`);
      records += 1;
      const record = bounds.filter((claim) => claim.start < (pointer.lands as number)).pop();
      assert.equal((pointer.lands as number) - (record?.start as number), IR_RECORD_POINTER_BIAS,
                   `${name}: the record pointer's bias`);
    }
  }
  assert.equal(strings, 13353);
  assert.equal(records, 3387);
});

test('every address sits inside something the emitter rebuilds', skipWithoutLab(), () => {
  // The other half of the map. `coverage.ts` says which structure owns a byte and `emit.ts` says
  // whether that structure can be written back from fields, so a pointer inside no rebuild at all
  // would be one no relocation could reach. There are none, in any container.
  //
  // **Four rebuilds carry bytes they do not frame, and only one of them carries its own pointers.**
  // A partly framed rebuild is not the same as a carried pointer: base slot 5's headers, base slot
  // 7's sets and base slot 14's records all write their addresses with `u24` and carry a different
  // byte. Screen programs frame the opcode and carry every operand, so the 33660 addresses inside
  // one are the whole of the framing work a relocation would need and today's emitter does not do.
  const PARTLY = new Set(['slot-11-program', 'slot-14-record', 'slot-5-header', 'slot-7-set']);
  let carried = 0;
  for (const name of SAMPLES) {
    const c = parse(require_(name));
    const built = rebuilds(c).sort((a, b) => a.start - b.start);
    for (const pointer of pointers(c)) {
      const holding = built.find((one) => pointer.at >= one.start
        && pointer.at + POINTER_WIDTH <= one.start + one.bytes.length);
      assert.notEqual(holding, undefined, `${name}: ${pointer.holder} at ${pointer.at}`);
      const one = holding as { owner: string; framed: number; bytes: Uint8Array };
      if (one.framed === one.bytes.length) continue;
      assert.ok(PARTLY.has(one.owner), `${name}: ${one.owner} carries bytes and holds an address`);
      if (one.owner !== 'slot-11-program') continue;
      // The opcode and, for a glyph run, its terminator. Nothing else, so an address inside a
      // screen instruction is certainly in the carried part rather than possibly in it.
      assert.ok(one.framed <= 2, `${name}: a screen instruction framed ${one.framed} bytes`);
      carried += 1;
    }
  }
  assert.equal(carried, 33660);
});

test('the three fields a growth makes wrong are computable from the container', skipWithoutLab(), () => {
  // `end_addr`, the trailer checksum and the end marker's position. The first two are what a
  // writer restamps; the third moves only with the number of pointer slots, which is per
  // architecture, so it is here to say that a growth does **not** touch it.
  for (const name of SAMPLES) {
    const c = parse(require_(name));
    const rules = restamps(c);
    assert.equal(rules.length, 3, name);
    const field = (which: string): { at: number; width: number } =>
      rules.find((one) => one.field === which) as { at: number; width: number };
    // It names the **end marker**, not one past the container: the flash base plus the length less
    // the marker's four bytes, on all nineteen. Which is exactly why deriving the container's base
    // back out of it is circular, section 117.
    assert.equal(c.endAddr, c.flashBase + c.blob.length - END_MARKER_LENGTH, `${name}: end_addr`);
    assert.equal(field('end_addr').at, 4);
    assert.equal(trailerChecksum(c.blob), c.trailerChecksum, `${name}: the trailer agrees`);
    assert.equal(field('the trailer checksum').at, c.blob.length - TRAILER_CHECKSUM_OFFSET);
    assert.equal(field("the end marker's position").at, c.markerOffset);
    assert.equal(c.markerOffset, SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * c.pointerCount,
                 `${name}: the marker's position`);
  }
});

test('every reason in the table is used, and every use has a reason', skipWithoutLab(), () => {
  // The table is the falsifiable part of `growth.ts`: a reader added tomorrow whose structure no
  // address names lands in `unexplained` until somebody works out what places it. This asserts the
  // other direction too, so a row for an owner that no longer exists cannot sit there unnoticed.
  const used = new Set<string>();
  for (const name of SAMPLES) {
    for (const one of impliedPositions(parse(require_(name)))) used.add(one.owner);
  }
  assert.deepEqual([...used].sort(), Object.keys(IMPLIED_BY).sort());
});

test('nothing in the format detects an address that was not rewritten', skipWithoutLab(), () => {
  // The control, and the reason a checker is worth having at all. Move one action list pointer by
  // three bytes, restamp the trailer the way a writer would, and the container parses, passes every
  // check it makes about itself, and reads a different action list. A wrong address does not error;
  // it reads the neighbouring bytes, which is the same hazard section 117 found in the container
  // base and section 122 found in a damaged read.
  const bytes = new Uint8Array(require_('h600_config'));
  const original = parse(bytes);
  const slot = archSlot(original.architecture as number, 10);
  const array = original.pointerArrayAt(slot) as { start: number; width: number; values: number[] };
  const at = original.blobOffset + array.start + array.width;
  const before = original.actionList(array.values[0] as number);

  bytes[at] = ((bytes[at] as number) + POINTER_WIDTH) & 0xff;
  const moved = parse(bytes);
  // The checksum is what the remote checks and it is over the payload, so a writer stamps it and
  // the file is accepted. Two bytes of arithmetic is the whole cost of hiding this.
  const stamped = trailerChecksum(moved.blob);
  moved.blob[moved.blob.length - TRAILER_CHECKSUM_OFFSET] = stamped & 0xff;
  moved.blob[moved.blob.length - TRAILER_CHECKSUM_OFFSET + 1] = stamped >>> 8;

  const after = parse(bytes);
  assert.ok(after.allChecksPass, 'the container refuses a moved pointer, which would be good news');
  assert.equal(trailerChecksum(after.blob), after.trailerChecksum, 'the trailer agrees again');
  const list = after.actionList(
    (after.pointerArrayAt(slot) as { values: number[] }).values[0] as number,
  );
  assert.notDeepEqual(list, before, 'the moved pointer reads the same list, so nothing was proved');
});
