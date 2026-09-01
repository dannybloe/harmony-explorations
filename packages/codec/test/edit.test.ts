/**
 * The editing layer, milestone M3's groundwork.
 *
 * **The refusals are the tests that carry weight**, the same way the emitter's negatives are. An
 * edit API that writes what it is told passes every positive test ever written for it; what says it
 * is safe to point at an irreplaceable remote's config is that it refuses to touch a byte no reader
 * understands, refuses two edits on one byte, and cannot move anything at all.
 *
 * The other load bearing one is the identity: no edits gives the input back byte for byte, so a
 * change that shows up in the diff came from an edit and not from the layer.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { load, require_, skipUnless } from '@harmony/lab';
import {
  ACTION_LIST_INDEX_OPCODE,
  CLOCK_RECORD_SLOT,
  EditError,
  FIELD_RULES,
  FRAME_OWNERS,
  containerExtent,
  modePages,
  TRAILER_CHECKSUM_OFFSET,
  applyEdits,
  archSlot,
  clockRecordFields,
  clockStateEdits,
  stateRecords,
  CLOCK_FIELD_COUNT,
  localTimestamp,
  timestampOf,
  saveEdits,
  timestampEdit,
  claims,
  diffRanges,
  modeRecords,
  pageListCopies,
  parameterGroups,
  parse,
  powerOnInstructions,
  setPageListEntry,
  setParameter,
  setPowerOnDelay,
  setTimerDuration,
  taggedList,
  timers,
  trailerChecksum,
} from '../src/index.ts';

const SAMPLE = 'h600_config';

test('no edits gives the container back byte for byte', skipUnless(SAMPLE), () => {
  const c = parse(load(SAMPLE) as Uint8Array);
  const { bytes, changed } = applyEdits(c, []);
  assert.deepEqual(changed, [], 'the layer writes nothing of its own');
  assert.deepEqual([...bytes], [...c.blob]);
});

test('a timer edit changes two bytes and the checksum', skipUnless(SAMPLE), () => {
  const c = parse(load(SAMPLE) as Uint8Array);
  const before = timers(c)?.records[0];
  assert.notEqual(before, undefined);
  const { bytes, changed } = applyEdits(c, setTimerDuration(c, 0, 4242));
  // Two runs: the duration's low two bytes and the trailer word. That is what minimal means here.
  assert.equal(changed.length, 2);
  assert.equal(changed[0]?.length, 2, 'the duration, and not the byte above it');
  assert.equal(changed[1]?.start, bytes.length - TRAILER_CHECKSUM_OFFSET);
  // And it reads back through the ordinary reader rather than through the edit's own arithmetic.
  const after = timers(parse(bytes))?.records[0];
  assert.equal(after?.duration, 4242);
  assert.equal(after?.kind, before?.kind, 'the record around it is untouched');
  assert.deepEqual(after?.instruction, before?.instruction);
});

test('a duration past sixteen bits is refused rather than clamped', skipUnless(SAMPLE), () => {
  // The firmware clamps here with no error, section 43, so a caller that passes a longer duration
  // gets a different timer than it asked for. Refusing is the only way that becomes visible.
  const c = parse(load(SAMPLE) as Uint8Array);
  assert.throws(() => setTimerDuration(c, 0, 0x10000), EditError);
  assert.throws(() => setTimerDuration(c, 0, -1), EditError);
  assert.throws(() => setTimerDuration(c, 999, 10), EditError);
});

test('a parameter edit stays inside its group', skipUnless(SAMPLE), () => {
  const c = parse(load(SAMPLE) as Uint8Array);
  const groups = parameterGroups(c) ?? [];
  const group = groups.findIndex((g) => g.values.length > 1);
  assert.ok(group >= 0);
  const { bytes } = applyEdits(c, setParameter(c, group, 1, 0x1234));
  const after = parameterGroups(parse(bytes)) ?? [];
  assert.equal(after[group]?.values[1], 0x1234);
  assert.deepEqual(
    after.map((g) => g.values.length),
    groups.map((g) => g.values.length),
    'every group keeps the length the firmware demands',
  );
  // An index past the group's own count is refused, not silently written into the next group.
  const count = (groups[group] as { values: number[] }).values.length;
  assert.throws(() => setParameter(c, group, count, 0), EditError);
  assert.throws(() => setParameter(c, group, 0, 0x10000), EditError);
});

test('a page list edit writes the copy nothing reads', skipUnless(SAMPLE), () => {
  // The rail this layer exists for. Section 69: every page's list has a second copy, no firmware
  // path reads it, and an editor that changed one and not the other would produce a file the
  // remote accepts and every check in this repository passes.
  const c = parse(load(SAMPLE) as Uint8Array);
  const pages = (modeRecords(c) ?? []).flatMap((r) => r.pages);
  const copies = pageListCopies(c);
  const page = pages.findIndex((p, i) => {
    const list = taggedList(c, p.list);
    const copy = copies[i] === undefined ? undefined : taggedList(c, (copies[i] as number)
      + c.flashBase);
    return list !== undefined && copy !== undefined && list.entries.length > 0
      && list.entries[0]?.opcode !== ACTION_LIST_INDEX_OPCODE
      && copy.entries[0]?.opcode !== ACTION_LIST_INDEX_OPCODE;
  });
  assert.ok(page >= 0, 'a page whose first entry is not an action list index');
  const original = taggedList(c, (pages[page] as { list: number }).list);
  const entry = original?.entries[0];
  assert.notEqual(entry, undefined);

  const edits = setPageListEntry(c, page, 0, { ...(entry as { tag: number; operand: number;
    opcode: number }), operand: 0x0777 });
  assert.equal(edits.length, 2, 'the list and its copy');
  const { bytes, changed } = applyEdits(c, edits);

  // **Two runs, and the trailer is not one of them**, which is section 41's weakness happening in
  // front of us: the checksum is a `u16` XOR of little endian words, the two edits write the same
  // bytes at the same word parity, and their contributions cancel exactly. So the file the remote
  // would accept is unchanged in its only check while two structures moved. That is the argument
  // for the rails living here rather than in whatever calls this.
  assert.equal(changed.length, 2, 'the two entries, and no trailer movement');
  assert.equal(
    (bytes[bytes.length - TRAILER_CHECKSUM_OFFSET] as number)
      | ((bytes[bytes.length - TRAILER_CHECKSUM_OFFSET + 1] as number) << 8),
    trailerChecksum(bytes),
    'still correct, just not different',
  );
  // The control: one of the two alone does move it, so the cancellation above is the pair and not
  // an emitter that forgot to recompute.
  const alone = applyEdits(c, [edits[0] as { start: number; bytes: Uint8Array; owner: string }]);
  assert.equal(alone.changed.length, 2, 'the entry and the trailer word');

  const after = parse(bytes);
  assert.equal(taggedList(after, (pages[page] as { list: number }).list)?.entries[0]?.operand,
    0x0777);
  assert.equal(taggedList(after, (copies[page] as number) + c.flashBase)?.entries[0]?.operand,
    0x0777);
});

test('an entry the two copies disagree on is refused', skipUnless(SAMPLE), () => {
  // Opcode 0x7F names a base slot 10 entry, and a page's list and its copy name **different**
  // entries holding identical action lists. Writing one value into both would destroy the only
  // thing that distinguishes them, so it is refused rather than handled.
  const c = parse(load(SAMPLE) as Uint8Array);
  const pages = (modeRecords(c) ?? []).flatMap((r) => r.pages);
  const found = pages.findIndex((p) => taggedList(c, p.list)?.entries
    .some((e) => e.opcode === ACTION_LIST_INDEX_OPCODE));
  assert.ok(found >= 0);
  const list = taggedList(c, (pages[found] as { list: number }).list);
  const index = (list?.entries ?? []).findIndex((e) => e.opcode === ACTION_LIST_INDEX_OPCODE);
  const entry = list?.entries[index] as { tag: number; operand: number; opcode: number };
  assert.throws(() => setPageListEntry(c, found, index, entry), EditError);
  // And so is asking for that opcode on an entry that is not one, from the other direction.
  assert.throws(
    () => setPageListEntry(c, found, 0, { tag: 0, operand: 0, opcode: ACTION_LIST_INDEX_OPCODE }),
    EditError,
  );
});

test('an edit no one structure covers is refused', skipUnless(SAMPLE), () => {
  // The rail that keeps this honest. A run nobody has read is a run whose consequences nobody can
  // state, so the layer will not write it even though the bytes are perfectly addressable.
  //
  // **It is demonstrated on a run that spans two claims rather than on an unclaimed one, because
  // this container no longer has an unclaimed byte to offer.** That is section 84 and it is the
  // milestone, not a weakening: the rule was always "inside one claim, not merely covered by
  // several", since a run crossing a boundary means the caller has the wrong extent, and that half
  // of it is now the only half a full container can exercise.
  const c = parse(load(SAMPLE) as Uint8Array);
  const owned = [...claims(c)].sort((a, b) => a.start - b.start);
  let boundary: number | undefined;
  for (let i = 1; i < owned.length && boundary === undefined; i += 1) {
    const previous = owned[i - 1] as { start: number; length: number };
    const next = owned[i] as { start: number; length: number };
    const end = previous.start + previous.length;
    // Adjacent and not nested, so an edit of two bytes at `end - 1` lies in neither claim alone.
    if (next.start === end && previous.length > 1 && next.length > 1) boundary = end;
  }
  assert.notEqual(boundary, undefined, 'two claims meet somewhere in this container');
  assert.throws(
    () => applyEdits(c, [{ start: (boundary as number) - 1, bytes: Uint8Array.from([1, 2]),
      owner: 'test' }]),
    EditError,
  );
  // And the whole container being claimed is itself the thing worth asserting, since the refusal
  // above used to be demonstrated on a gap.
  const covered = new Uint8Array(c.blob.length);
  for (const claim of claims(c)) covered.fill(1, claim.start, claim.start + claim.length);
  assert.equal(covered.indexOf(0), -1, 'every byte of this config belongs to a structure');
});

test('two edits on one byte are refused', skipUnless(SAMPLE), () => {
  const c = parse(load(SAMPLE) as Uint8Array);
  const one = setTimerDuration(c, 0, 10);
  assert.throws(() => applyEdits(c, [...one, ...one]), EditError);
  // An edit past the end, and an empty one, are refused for the same reason: they are not edits.
  assert.throws(() => applyEdits(c, [{ start: c.blob.length - 1,
    bytes: Uint8Array.from([1, 2]), owner: 'test' }]), EditError);
  assert.throws(() => applyEdits(c, [{ start: 0, bytes: new Uint8Array(0), owner: 'test' }]),
    EditError);
});

test('the trailer is recomputed, not carried', skipUnless(SAMPLE), () => {
  // A checksum that cannot fail is not a check, and this one is weak enough already: a u16 XOR of
  // little endian words, blind to two transposed words, section 41.
  const c = parse(load(SAMPLE) as Uint8Array);
  const { bytes } = applyEdits(c, setTimerDuration(c, 0, 4242));
  const at = bytes.length - TRAILER_CHECKSUM_OFFSET;
  assert.equal((bytes[at] as number) | ((bytes[at + 1] as number) << 8), trailerChecksum(bytes));
  assert.notEqual(bytes[at], c.blob[at] as number | undefined);
  assert.ok(parse(bytes).checks['trailer_checksum_recomputes'], 'and the parser agrees');
});

test('diffRanges finds the runs and refuses a length change', () => {
  const a = Uint8Array.from([1, 2, 3, 4, 5, 6]);
  const b = Uint8Array.from([1, 9, 9, 4, 5, 8]);
  assert.deepEqual(diffRanges(a, b), [{ start: 1, length: 2 }, { start: 5, length: 1 }]);
  assert.deepEqual(diffRanges(a, a), []);
  assert.throws(() => diffRanges(a, Uint8Array.from([1])), EditError);
});

/**
 * The save path, and the field rules behind it.
 *
 * **The negatives are the point here too.** A save that recomputed base slot 1's version word or
 * base slot 2's log area would produce a file the remote accepts and mishandles, so those two are
 * asserted byte identical after a save rather than merely left alone in the code. And the positive
 * is asserted as an exact run list, not as "the timestamp changed": if a save touched anything else,
 * a test that only checked the timestamp would pass.
 */
const SAVE_SAMPLES = ['one_config', 'h600_config', 'h525_config', 'arch8_config_a'];
const WHEN = '2026-08-10T16:45:09';

/** The seven fields of base slot 3's record, as a blob offset, or undefined without a slot 3. */
function clockFieldsAt(c: ReturnType<typeof parse>): number | undefined {
  const section = c.sections[CLOCK_RECORD_SLOT];
  if (section === undefined || section.isNull) return undefined;
  const off = c.blobOffsetOf(section.address);
  return off === undefined ? undefined : off + 2;
}

test('a save changes the two clocks and the trailer, and nothing else', skipUnless(...SAVE_SAMPLES),
  () => {
    for (const name of SAVE_SAMPLES) {
      const c = parse(load(name) as Uint8Array);
      const { bytes, changed } = saveEdits(c, [], WHEN);
      const fields = clockFieldsAt(c);
      assert.ok(fields !== undefined, `${name} has a base slot 3`);
      const records = stateRecords(c);
      assert.ok(records !== undefined, `${name} has a base slot 13`);
      // The whole list, stated: base slot 3's seven bytes, one run per clock state record, and the
      // checksum. Anything else a save decided to touch fails here, which is what this test is for.
      //
      // A field already holding the value being stamped is not in the list, because `changed` reports
      // runs that **differ**, so each expected run is intersected with what actually moved. That is
      // not a weakening: the runs are still exact, and the alternative, asserting a count, is what
      // let a save touch a neighbouring byte in the first place.
      const expected = [
        { start: fields, length: 7 },
        ...records.slice(0, CLOCK_FIELD_COUNT).map((record, index) => ({
          start: c.blobOffsetOf(record.address) as number,
          // The year's `first` and `second` are adjacent, so it is four bytes where the rest are two.
          length: index === CLOCK_FIELD_COUNT - 1 ? 4 : 2,
        })),
        { start: bytes.length - TRAILER_CHECKSUM_OFFSET, length: 2 },
      ].sort((a, b) => a.start - b.start);
      for (const run of changed) {
        const inside = expected.some(
          (one) => run.start >= one.start && run.start + run.length <= one.start + one.length,
        );
        assert.ok(inside, `${name}: a save changed 0x${run.start.toString(16)}, which no rule claims`);
      }
      // **The positive direction used to be asserted here and could not fail.** It was
      // `assert.ok(touched || same)` per expected field, where `same` meant the bytes had not moved
      // and `touched` meant a reported run overlapped them: `changed` is derived by comparing the two
      // buffers, so exactly one of the two holds for every field and the disjunction is a tautology.
      // Removed rather than replaced, because the positive direction is genuinely carried by two
      // assertions that can fail: the read back below, and the base slot 13 test next door. Inventing
      // a third would be a third copy of one claim.
      //
      // A save that stamped nothing at all would leave `changed` empty, every field `same`, and this
      // read back wrong, which is what makes it the positive test rather than a formality.
      assert.ok(changed.length > 0, `${name}: a save changed nothing`);
      // And it reads back as the moment asked for, through the reader rather than the writer.
      assert.equal(parse(bytes).builtAt, WHEN, name);
    }
  });

test('a save stamps base slot 13 with the same moment as base slot 3', skipUnless(...SAVE_SAMPLES),
  () => {
    // Section 130's rail. The seven records hold the build time a second time, so a save that moved
    // only base slot 3 would leave a config that disagrees with itself about when it was generated,
    // and an arch 12 remote sets its clock from one of the two.
    for (const name of SAVE_SAMPLES) {
      const c = parse(load(name) as Uint8Array);
      const saved = parse(saveEdits(c, [], WHEN).bytes);
      const records = stateRecords(saved);
      assert.ok(records !== undefined, `${name} has a base slot 13`);
      const encoded = clockRecordFields(WHEN);
      assert.ok(encoded !== undefined);
      // Read back through `stateRecords` and compared against the same encoder base slot 3 uses,
      // which is the point: one derivation of the seven values, checked from the other side.
      for (let index = 0; index < CLOCK_FIELD_COUNT; index += 1) {
        assert.equal(records[index]?.first, encoded[index],
          `${name}: state record ${index} after a save`);
      }
      // The eighth value, and the only `second` a save writes: the year's maximum is that year plus
      // one, so a config saved years after it was built would otherwise declare a value out of range.
      const year = records[CLOCK_FIELD_COUNT - 1];
      assert.equal(year?.second, (encoded[CLOCK_FIELD_COUNT - 1] as number) + 1,
        `${name}: the year's maximum did not move with it`);
      assert.ok((year?.first as number) <= (year?.second as number), `${name}: year past its maximum`);
    }
  });

test('a stale year is repaired rather than left out of range', skipUnless(SAMPLE), () => {
  // The case the rail exists for, made concrete. `one_config` was built in 2023, so its year record
  // is 23 with a maximum of 24; saving it in 2026 writes 26, and a maximum of 24 would then be a
  // value outside the variable's own declared range. Nothing has watched a remote mishandle that, so
  // the claim is only that the file obeys the format's own rule, section 130's table.
  const c = parse(load(SAMPLE) as Uint8Array);
  const before = stateRecords(c)?.[CLOCK_FIELD_COUNT - 1];
  assert.ok(before !== undefined);
  assert.equal(before.second, before.first + 1, 'the input already obeys the rule');
  const saved = stateRecords(parse(saveEdits(c, [], '2030-01-02T03:04:05').bytes) as never);
  const after = saved?.[CLOCK_FIELD_COUNT - 1];
  assert.equal(after?.first, 30);
  assert.equal(after?.second, 31);
});

test('saving on the 31st raises the day maximum, so no value sits outside its own range',
  skipUnless(SAMPLE), () => {
    // **The second field whose maximum moves, and the corpus could not have shown it.** `first` is the
    // one based day of the month and every container declares a maximum of 30, so a save on a 31st
    // wrote `first=31, second=30`: a variable holding a value its own record forbids, which is exactly
    // what the year's repair exists to prevent one field along. No config in the corpus was built on a
    // 31st, so no sample and no test could fire; it was found by asking for the date.
    //
    // What Logitech's generator does on such a day is unknown and stays unknown. Raising the maximum
    // is our choice, taken because it keeps every value in range and matches the year's treatment.
    const c = parse(load(SAMPLE) as Uint8Array);
    const inRange = (when: string): { day: number; most: number; bad: number } => {
      const saved = stateRecords(parse(saveEdits(c, [], when).bytes) as never) ?? [];
      const seven = saved.slice(0, CLOCK_FIELD_COUNT);
      const day = seven[3] as { first: number; second: number };
      return {
        day: day.first,
        most: day.second,
        bad: seven.filter((r) => r.first > r.second).length,
      };
    };
    assert.deepEqual(inRange('2026-08-31T12:00:00'), { day: 31, most: 31, bad: 0 });
    // And the ordinary case does not move: a save on the 30th leaves the maximum where the corpus has
    // it, so the raise is the exception and not a new default.
    assert.deepEqual(inRange('2026-08-30T12:00:00'), { day: 30, most: 30, bad: 0 });
    // A config saved on a 31st has to be savable again, which is why the refusal below accepts 31.
    const once = parse(saveEdits(c, [], '2026-08-31T12:00:00').bytes);
    assert.equal(clockStateEdits(once, '2026-09-01T00:00:00').length, CLOCK_FIELD_COUNT);
  });

test('a base slot 13 that is not the clock is refused rather than stamped', skipUnless(SAMPLE), () => {
  // The same reasoning as refusing a base slot 3 that holds no readable record: if the first six
  // maxima are not a second, a minute, an hour, a day, a weekday and a month, then whatever this is,
  // it is not ours to overwrite. Provoked by moving one maximum, which is the cheapest lie to tell.
  const c = parse(load(SAMPLE) as Uint8Array);
  const record = stateRecords(c)?.[2];
  assert.ok(record !== undefined);
  const at = (c.blobOffsetOf(record.address) as number) + 2;
  assert.equal(c.blob[at], 23, 'the hour record declares 23');
  const damaged = Uint8Array.from(c.blob);
  damaged[at] = 22;
  assert.throws(() => clockStateEdits(parse(damaged), WHEN), EditError);
  // And the untouched container still works, so the refusal is about the byte and not the sample.
  assert.equal(clockStateEdits(c, WHEN).length, CLOCK_FIELD_COUNT);
});

test('a round trip carries the timestamp and a save does not', skipUnless(SAMPLE), () => {
  // The distinction in one test. Same input, same empty edit list, two operations, and the
  // difference is the field the remote sets its clock from.
  const c = parse(load(SAMPLE) as Uint8Array);
  assert.deepEqual([...applyEdits(c, []).bytes], [...c.blob], 'a round trip writes nothing');
  const saved = parse(saveEdits(c, [], WHEN).bytes);
  assert.notEqual(saved.builtAt, c.builtAt, 'a save moves it');
  assert.equal(saved.builtAt, WHEN);
});

test('a save leaves the carried fields byte identical', skipUnless(...SAVE_SAMPLES), () => {
  // The two `carry` rules, asserted rather than described. Base slot 1 states the architecture and
  // carries a version word that is per config and not computable, section 81; base slot 2's three
  // numbers are the generator's reservation and no config in the corpus appends to it, section 47.
  let compared = 0;
  for (const name of SAVE_SAMPLES) {
    const c = parse(load(name) as Uint8Array);
    const { bytes } = saveEdits(c, [], WHEN);
    // The architecture comes out of base slot 1, which is the only place a config states it, and
    // slot 1 and slot 2 sit at different raw indices per architecture, so this has to translate.
    const architecture = c.architecture;
    assert.ok(architecture !== undefined, `${name} states its architecture`);
    for (const slot of [1, 2]) {
      const raw = archSlot(architecture, slot);
      const section = c.sections[raw];
      if (section === undefined || section.isNull) continue;
      const off = c.blobOffsetOf(section.address);
      const length = c.sectionLength(raw);
      assert.ok(off !== undefined, `${name} slot ${slot} is inside the container`);
      assert.ok(length !== undefined, `${name} slot ${slot} has an extent`);
      const end = off + length;
      assert.deepEqual([...bytes.slice(off, end)], [...c.blob.slice(off, end)],
        `${name} base slot ${slot} was rewritten by a save`);
      compared += 1;
    }
  }
  // Two `continue`s stand above the comparison, one per slot, so nothing said how many ran. Eight,
  // exactly, being the samples that carry both slots: a floor of eight over a measured eight is the
  // shape that reads as slack and has none, so it can only fail upward.
  assert.equal(compared, 8, `${compared} slot comparisons ran`);
});

test('the stamped weekday is derived, so the readers accept it', skipUnless(SAMPLE), () => {
  // Both parsers refuse a record whose weekday disagrees with its date, section 21, and that check
  // is the reason to trust the reading at all. So a stamp that got it wrong would come back
  // undefined rather than wrong, which is what this asserts across a whole week.
  const c = parse(load(SAMPLE) as Uint8Array);
  for (let day = 10; day <= 16; day += 1) {
    const when = `2026-08-${String(day).padStart(2, '0')}T00:00:00`;
    assert.equal(parse(saveEdits(c, [], when).bytes).builtAt, when, when);
  }
  // And one that is not a Saturday epoch coincidence: the record's 0 is a Saturday, 1 January 2000.
  assert.equal(parse(saveEdits(c, [], '2000-01-01T00:00:00').bytes).builtAt, '2000-01-01T00:00:00');
});

test('a timestamp the record cannot hold is refused', skipUnless(SAMPLE), () => {
  const c = parse(load(SAMPLE) as Uint8Array);
  for (const bad of [
    '2026-08-10 16:45:09',        // not the T form
    '2026-8-10T16:45:09',         // not padded
    '1999-12-31T23:59:59',        // before the u8 year's epoch
    '2256-01-01T00:00:00',        // past it
    '2026-02-30T00:00:00',        // a date that does not exist
    '2026-08-10T24:00:00',        // not a time
    '2026-08-10T16:60:09',
  ]) {
    assert.throws(() => timestampEdit(c, bad), EditError, bad);
  }
});

test('a save and a caller both writing the timestamp is refused', skipUnless(SAMPLE), () => {
  // The two edits on one byte rail, reached through the save path, which is where it matters most:
  // a caller that stamped its own record and then saved would otherwise get whichever won.
  const c = parse(load(SAMPLE) as Uint8Array);
  assert.throws(() => saveEdits(c, timestampEdit(c, '2026-01-01T00:00:00'), WHEN), EditError);
});

test('every field rule is covered by a test in this file', () => {
  // What stops the table drifting away from the code: adding a rule without a test fails here. The
  // names are repeated deliberately rather than derived, so a rename has to be made on purpose.
  //
  // **And the names are checked against this file**, which they were not: the map below related the
  // rule names to strings, so a test that was renamed or deleted left its rule looking covered.
  const covered = new Map<string, string>([
    ['trailer checksum', 'the trailer is recomputed, not carried'],
    ['base slot 3 build timestamp', 'a save changes the two clocks and the trailer, and nothing else'],
    ['base slot 3 day of week byte', 'the stamped weekday is derived, so the readers accept it'],
    ['base slot 13 records 0 to 6, the firmware clock',
      'a save stamps base slot 13 with the same moment as base slot 3'],
    ["base slot 13 record 6's maximum", 'a stale year is repaired rather than left out of range'],
    ['base slot 1 version word', 'a save leaves the carried fields byte identical'],
    ['base slot 2 log area', 'a save leaves the carried fields byte identical'],
    ['a mode page tagged list copy', 'a page list edit writes the copy nothing reads'],
  ]);
  for (const rule of FIELD_RULES) {
    assert.ok(covered.has(rule.field), `no test covers the rule for ${rule.field}`);
    assert.ok(rule.section > 0, `${rule.field} names no section`);
    assert.ok(rule.why.length > 40, `${rule.field}'s reason is too short to be a reason`);
  }
  assert.equal(covered.size, FIELD_RULES.length, 'a covered name has no rule');
  // The half that was missing: each of those test names is a test in this file. Read from source
  // rather than from the runner, because `node:test` offers no way to ask what the file declared, and
  // a rule pointing at a test nobody wrote is exactly the drift this is guarding against.
  //
  // Whitespace is collapsed first, because a title long enough to wrap sits on its own line and a
  // literal search for `test('<title>'` would miss it and then need alternatives, which is fitting a
  // check to its input rather than checking.
  const source = readFileSync(fileURLToPath(import.meta.url), 'utf8').replace(/\s+/g, ' ');
  for (const title of new Set(covered.values())) {
    assert.ok(source.includes(`test('${title}'`), `no test in this file is called ${title}`);
  }
  // And every policy the type allows is actually used, so the vocabulary matches the format.
  const policies = new Set(FIELD_RULES.map((r) => r.policy));
  assert.deepEqual([...policies].sort(),
    ['carry', 'mirror', 'recompute-always', 'recompute-on-save']);
});

test('localTimestamp is the wall clock, and it round trips through the record', () => {
  // Constructed from local components and formatted back to local components, so this says nothing
  // about the machine's zone and still pins the format. The one place a zone enters the codec.
  const when = new Date(2026, 7, 10, 16, 45, 9);
  assert.equal(localTimestamp(when), '2026-08-10T16:45:09');
  assert.equal(localTimestamp(new Date(2026, 0, 1, 0, 0, 0)), '2026-01-01T00:00:00');
});

/**
 * The encoder and the decoder are inverses, on every container in the corpus.
 *
 * **This is the test the duplication would have hidden.** The emitter and this edit layer each
 * derived the day of week themselves until 10 August 2026, with a different spelling of the same
 * epoch, and both were right; two copies of one derivation is the shape of defect this project bans
 * for the opcode table, and nothing failed while it existed. So the guard is not "the two agree", it
 * is that there is one implementation and it inverts the reader on nineteen real records.
 */
// The nineteen the rest of the workspace counts: `emit.test.ts`'s `REBUILT` and
// `coverage.test.ts`'s `ACCOUNTED`. This list held eighteen until 13 August 2026, missing
// `h525_config_2` alone, which is the failure mode a corpus wide claim has: nothing compared two
// population lists, so a sample can be absent from one of them for months and every total that list
// computes stays self consistent. `tests/test_toolchain.py` compares the three now.
const ALL_CONTAINERS = [
  'one_safemode', 'one34_region2', 'h700_gspm', 'h600_safemode_gspm', 'h650_safemode_gspm',
  'one_config', 'one_config_unprogrammed', 'h600_config', 'h700_config', 'h700_config_2',
  'h525_config', 'h525_config_2', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c',
  'arch8_config_d', 'h525_safemode_ahcm', 'one_spare_before_sync', 'one_spare_after_sync',
];

test('the clock encoder reproduces every stored record byte for byte',
  skipUnless(...ALL_CONTAINERS), () => {
    let checked = 0;
    for (const name of ALL_CONTAINERS) {
      const c = parse(load(name) as Uint8Array);
      const builtAt = c.builtAt;
      assert.ok(builtAt !== undefined, `${name} carries a timestamp`);
      const at = clockFieldsAt(c);
      assert.ok(at !== undefined, `${name} has a base slot 3`);
      const encoded = clockRecordFields(builtAt);
      assert.ok(encoded !== undefined, `${name}: ${builtAt} does not encode`);
      assert.deepEqual([...encoded], [...c.blob.slice(at, at + encoded.length)],
        `${name}: the encoder disagrees with the bytes the decoder read`);
      checked += 1;
    }
    // Spread rather than a count: one architecture agreeing proves much less than four.
    assert.equal(checked, ALL_CONTAINERS.length);
  });

test('the clock encoder derives the weekday rather than trusting anyone', () => {
  // 1 January 2000 is the epoch and the record calls it 0, which is a Saturday. Checked against the
  // calendar rather than against a stored byte, so this fails if the epoch is ever "simplified".
  const fields = clockRecordFields('2000-01-01T00:00:00');
  assert.ok(fields !== undefined);
  assert.equal(fields[4], 0, 'the epoch day is 0');
  assert.equal(new Date(Date.UTC(2000, 0, 1)).getUTCDay(), 6, 'and it is a Saturday');
  // A whole week, so a wrong modulus shows up rather than a wrong offset only.
  for (let day = 1; day <= 7; day += 1) {
    const when = `2000-01-0${day}T00:00:00`;
    const got = clockRecordFields(when);
    assert.ok(got !== undefined, when);
    assert.equal(got[4], (day - 1) % 7, when);
  }
});

test('the encoder refuses what the decoder would refuse', () => {
  // The same seven inputs the edit layer refuses, at the layer below it, so the refusal is the
  // encoder's property and not a check the edit layer happens to do first.
  for (const bad of [
    '2026-08-10 16:45:09', '2026-8-10T16:45:09', '1999-12-31T23:59:59', '2256-01-01T00:00:00',
    '2026-02-30T00:00:00', '2026-08-10T24:00:00', '2026-08-10T16:60:09',
  ]) {
    assert.equal(clockRecordFields(bad), undefined, bad);
  }
  assert.equal(clockRecordFields('2255-12-31T23:59:59')?.[6], 0xff, 'and the last year it can hold');
});

test('an edit may not touch the container frame, and one could rewrite the cookie',
  skipUnless('one_config', 'h525_safemode_ahcm'), () => {
  // **Measured before the rail existed: a four byte write at offset 0 replaced `GSPM` with `AAAA` and
  // was accepted**, on both containers. The containment rail passed it because the frame is claimed
  // like anything else, by `header`, `section-table`, `marker` and `trailer`, so "inside a structure
  // some reader claims" was satisfied by the very bytes that say where the structures are.
  //
  // A same length edit has no business in any of them: the header carries the flash base and
  // `end_addr`, the table carries every pointer, and the trailer carries the checksum `applyEdits`
  // stamps itself. An editor that lands there has computed an offset wrong rather than found a field.
  for (const name of ['one_config', 'h525_safemode_ahcm']) {
    const c = parse(load(name) as Uint8Array);
    const frame = claims(c).filter((x) => FRAME_OWNERS.has(x.owner));
    assert.equal(frame.length, 4, `${name}: the four frame claims`);
    for (const claim of frame) {
      assert.throws(
        () => applyEdits(c, [{ start: claim.start, bytes: new Uint8Array([0]), owner: 'probe' }]),
        EditError,
        `${name}: a write into ${claim.owner} was accepted`,
      );
      // And the last byte of it too, so the rail is the whole run rather than its first byte.
      assert.throws(
        () => applyEdits(c, [{
          start: claim.start + claim.length - 1,
          bytes: new Uint8Array([0]),
          owner: 'probe',
        }]),
        EditError,
        `${name}: a write into the end of ${claim.owner} was accepted`,
      );
    }
    // The negative that makes it a rail rather than a blanket refusal: an ordinary field still edits.
    const clock = claims(c).find((x) => x.owner === 'slot-3-clock');
    if (clock !== undefined) {
      const out = applyEdits(c, [{
        start: clock.start + 2,
        bytes: new Uint8Array([c.blob[clock.start + 2] as number]),
        owner: 'probe',
      }]);
      assert.equal(out.bytes.length, c.blob.length, `${name}: an ordinary edit still applies`);
    }
  }
});

test('a container whose own checksum disagrees with its bytes is refused, not stamped',
  skipUnless('one_config'), () => {
  // Section 122: a read can insert bytes without losing any, so a config that parses is not a config
  // that arrived, and `packages/corpus/src/read.ts` checks the trailer after every read for exactly
  // that reason. Nothing checked it before an **edit**, which is the end where the damage becomes
  // permanent: `applyEdits` recomputes and stamps the checksum, so a damaged input came out passing
  // the only check the remote makes.
  const raw = load('one_config') as Uint8Array;
  const clean = parse(raw);
  assert.equal(clean.trailerChecksum, trailerChecksum(clean.blob), 'the sample is undamaged');

  // Damage one pixel, which no reader's extent depends on, so the container still parses identically.
  const glyph = claims(clean).filter((x) => x.owner === 'slot-7-glyph').sort((a, b) => b.length - a.length)[0];
  assert.notEqual(glyph, undefined, 'a glyph to damage');
  const { start } = containerExtent(raw);
  const damaged = raw.slice();
  const at = start + (glyph as { start: number }).start + 4;
  damaged[at] = (damaged[at] as number) ^ 0xff;

  const c = parse(damaged);
  assert.equal(c.trailerChecksum, clean.trailerChecksum, 'the stored word is untouched');
  assert.notEqual(trailerChecksum(c.blob), c.trailerChecksum, 'and its bytes no longer agree');

  const clock = claims(c).find((x) => x.owner === 'slot-3-clock') as { start: number };
  assert.throws(
    () => applyEdits(c, [{ start: clock.start + 2, bytes: new Uint8Array([0]), owner: 'probe' }]),
    EditError,
    'a damaged container was edited and its damage stamped as valid',
  );
});

test('the timestamp is spelled in one place, and both callers reach it', () => {
  // `localTimestamp` and `clockRecord` each spelled out the same padded YYYY-MM-DDTHH:MM:SS with
  // their own `padStart` helper, and both were right. Two right copies is the state that precedes
  // two that are not, and no test can see it while they agree, so this is the test that would.
  assert.equal(timestampOf(2026, 8, 4, 9, 5, 3), '2026-08-04T09:05:03');
  assert.equal(localTimestamp(new Date(2026, 7, 4, 9, 5, 3)), '2026-08-04T09:05:03');
  // And the parser on the other side accepts what the formatter produces, which is what makes the
  // two sitting together worth anything.
  assert.notEqual(clockRecordFields(timestampOf(2026, 8, 4, 9, 5, 3)), undefined);
});

test('a timer whose stored duration has a high byte is refused rather than carried',
  skipUnless('one_config'), () => {
    // The write is three bytes and only two of them are the duration, so the third used to be
    // copied from the record: a stored value above sixteen bits kept its high byte and the seconds
    // the caller asked for became a u24 the firmware clamps, which is what the refusal beside it
    // exists to prevent. Every corpus timer sits under sixteen bits, so this is latent.
    const c = parse(require_('one_config'));
    const table = timers(c);
    assert.ok(table !== undefined && table.records.length > 0);
    for (const timer of table.records) assert.equal(timer.duration >>> 16, 0);
    const edits = setTimerDuration(c, 0, 30);
    assert.equal(edits[0]?.bytes[2], 0, 'the high byte is written, not carried');

    // The negative, on a container edited to hold a timer the corpus does not have.
    const first = table.records[0] as { address: number };
    const off = c.blobOffsetOf(first.address) as number;
    const edited = new Uint8Array(require_('one_config'));
    edited[c.blobOffset + off + 3] = 0x01;
    assert.throws(() => setTimerDuration(parse(edited), 0, 30), /high byte/);
  });

/**
 * The population for the erase block claim: every user config in the lab that has mode pages and a
 * flash base, stated here rather than derived, per the convention that a corpus loop names its own.
 */
const PAGED_CONFIGS = [
  'one_config',
  'one_spare_after_sync',
  'one_spare_before_sync',
  'h600_config',
  'h700_config',
] as const;

/**
 * The erase block of the two architectures these configs live on, 64 KiB. Stated here because
 * `packages/codec` deliberately does not depend on `packages/usb`, where `ERASE_BLOCK_SIZE` is the
 * authority. If the two ever disagree, this literal is the one that is wrong.
 */
const ERASE_BLOCK = 0x10000;

test('a same length edit is not a small write: one page binding costs two erase blocks',
  skipUnless(...PAGED_CONFIGS), () => {
  /*
   * The reason this matters is the medium rather than the format. Flash only clears bits, so
   * changing one byte means erasing the whole block it sits in, and everything else in that block
   * has to be read first and written back. `edit.ts` refuses a length change and permits a same
   * length one, which is the right rule for the container and says nothing about the cost.
   *
   * Section 69 is what makes the number two rather than one: a page's tagged list has a second copy
   * that nothing reads and an editor must still change, and the copy is nowhere near it. So the
   * cheapest possible logical edit, one entry of one page, lands in two blocks and opens two windows
   * in which a block is erased and not yet written.
   *
   * Asserted per config and exactly, because the interesting failure is a config where the two land
   * in one block: that would mean the pool's placement is not what section 69 measured.
   */
  const expected: Record<string, number> = {
    one_config: 25,
    one_spare_after_sync: 17,
    one_spare_before_sync: 13,
    h600_config: 51,
    h700_config: 81,
  };
  let total = 0;
  for (const name of PAGED_CONFIGS) {
    const container = parse(require_(name));
    const pages = modePages(container);
    let editable = 0;
    // `entries()` rather than an index and `pages[page]!`: the element comes out typed, and a
    // `=== undefined` guard under a correct loop bound would be an unreachable guard reading as
    // protection, which this repository has removed 34 of.
    for (const [page, modePage] of pages.entries()) {
      const list = taggedList(container, modePage.list);
      const first = list?.entries?.[0];
      if (first === undefined) continue;
      let edits;
      try {
        edits = setPageListEntry(container, page, 0,
          { tag: first.tag, operand: first.operand, opcode: first.opcode });
      } catch {
        continue;
      }
      editable += 1;
      const blocks = new Set(
        edits.map((edit) => Math.floor((container.flashBase + edit.start) / ERASE_BLOCK)),
      );
      // **The claim, per page.** Not "at least two": exactly two says the list and its copy are in
      // different blocks and that no third structure is dragged in.
      assert.equal(blocks.size, 2,
        `${name} page ${page} touches ${blocks.size} erase block(s), not two`);
    }
    assert.equal(editable, expected[name], `${name} editable page count`);
    total += editable;
  }
  assert.equal(total, 187, 'every editable page in the corpus, and all of them cost two blocks');
});


/** The containers that inline a power on delay, which is every architecture but 14. */
const DELAY_SAMPLES = ['one_spare_20260830', 'one_config', 'h525_config', 'arch8_config_885'];

test('a delay edit changes one byte of content and the checksum, and nothing else',
  skipUnless(...DELAY_SAMPLES), () => {
    // **The smallest change this format admits**, and the reason it was the first thing written to a
    // remote: one byte in place, no length change, no count restamped. The second run is the trailer
    // checksum, which `applyEdits` recomputes, and it is not an artefact of this edit: it is why a
    // same length edit costs **two** erase blocks rather than one, since the checksum lives at the
    // far end of the container. Section 237.
    for (const name of DELAY_SAMPLES) {
      const c = parse(require_(name));
      const [group, one] = [...powerOnInstructions(c)][0] as [number, { tenths: number }];
      // **Odd on purpose.** Every value these tests reached for was even, and a control that
      // cleared the operand's low bit passed the whole file. A delay is a plain byte, so an even
      // one exercises seven of its eight bits.
      const wanted = one.tenths === 99 ? 97 : 99;
      const report = applyEdits(c, setPowerOnDelay(c, group, wanted));
      assert.equal(report.changed.length, 2, `${name}: the operand and the checksum`);
      assert.equal(report.changed[0]!.length, 1, `${name}: one byte of content`);
      // The second run is the trailer word, which is what says the first one is content rather than
      // the two being any pair of bytes. **Which byte of the word moves depends on the value**, so
      // this bounds the run inside the word rather than naming a byte: an earlier version asserted
      // the high byte and three samples of four happened to agree with it.
      const trailer = c.blob.length - TRAILER_CHECKSUM_OFFSET;
      const second = report.changed[1] as { start: number; length: number };
      assert.ok(second.start >= trailer && second.start + second.length <= trailer + 2,
        `${name}: the second run is 0x${second.start.toString(16)} for ${second.length}, which is `
        + `not inside the trailer word at 0x${trailer.toString(16)}`);
      const after = parse(report.bytes);
      assert.equal(powerOnInstructions(after).get(group)?.tenths, wanted, name);
      assert.equal(after.trailerChecksum, trailerChecksum(report.bytes), `${name}: recomputes`);
    }
  });

test('every other device keeps its delay', skipUnless(...DELAY_SAMPLES), () => {
  // The control for the test above, which would pass if the edit wrote the right value into every
  // device at once. Four containers holding three to seven devices each.
  let checked = 0;
  for (const name of DELAY_SAMPLES) {
    const c = parse(require_(name));
    const was = powerOnInstructions(c);
    const [group] = [...was][0] as [number, unknown];
    const after = powerOnInstructions(parse(applyEdits(c, setPowerOnDelay(c, group, 7)).bytes));
    for (const [other, one] of was) {
      if (other === group) continue;
      assert.equal(after.get(other)?.tenths, one.tenths, `${name}: group ${other} moved`);
      checked += 1;
    }
  }
  assert.equal(checked, 14, 'devices left alone across the four containers');
});

test('a delay edit round trips back to the bytes it started from',
  skipUnless('one_spare_20260830'), () => {
    // Sixty tenths to a hundred and back, and the result is the input byte for byte. That is the
    // check that the checksum restamp is a function of the bytes rather than of the edit, and it is
    // the offline half of what the remote confirmed on 1 September 2026.
    const c = parse(require_('one_spare_20260830'));
    const up = applyEdits(c, setPowerOnDelay(c, 0, 100)).bytes;
    const back = parse(up);
    const down = applyEdits(back, setPowerOnDelay(back, 0, 60)).bytes;
    assert.deepEqual(down, c.blob, 'up and back down is the identity');
    assert.notDeepEqual(up, c.blob, 'and the way up really moved, so this is not vacuous');
  });

test('a delay past what one instruction carries is refused rather than truncated',
  skipUnless('one_spare_20260830'), () => {
    // **101 is not a wide value, it is a different shape.** The firmware folds two consecutive
    // quantities for one device by taking the larger except at 100, where it pushes a second entry,
    // so a value above the cap is spelled out as several instructions and that is a length change.
    // A byte would hold it, which is exactly why the refusal has to be explicit.
    const c = parse(require_('one_spare_20260830'));
    assert.throws(() => setPowerOnDelay(c, 0, 101), EditError);
    assert.throws(() => setPowerOnDelay(c, 0, 255), EditError);
    assert.throws(() => setPowerOnDelay(c, 0, -1), EditError);
    assert.throws(() => setPowerOnDelay(c, 0, 1.5), EditError);
    // And 100 itself is allowed, so the bound is the cap and not one below it.
    assert.equal(setPowerOnDelay(c, 0, 100).length, 1);
  });

test('a device that states no inline delay is refused', skipUnless('h600_config'), () => {
  // Arch 14 (Harmony 600 and 700) keeps a power on delay in a state variable, so there is no
  // instruction to edit and this must say so rather than write a byte somewhere plausible.
  const c = parse(require_('h600_config'));
  assert.equal(powerOnInstructions(c).size, 0, 'arch 14 inlines none');
  assert.throws(() => setPowerOnDelay(c, 0, 50), EditError);
});
