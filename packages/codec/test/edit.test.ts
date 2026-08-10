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

import { load, skipUnless } from '@harmony/lab';
import {
  ACTION_LIST_INDEX_OPCODE,
  CLOCK_RECORD_SLOT,
  EditError,
  FIELD_RULES,
  TRAILER_CHECKSUM_OFFSET,
  applyEdits,
  archSlot,
  clockRecordFields,
  localTimestamp,
  saveEdits,
  timestampEdit,
  claims,
  diffRanges,
  modeRecords,
  pageListCopies,
  parameterGroups,
  parse,
  setPageListEntry,
  setParameter,
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

test('a save changes the timestamp and the trailer, and nothing else', skipUnless(...SAVE_SAMPLES),
  () => {
    for (const name of SAVE_SAMPLES) {
      const c = parse(load(name) as Uint8Array);
      const { bytes, changed } = saveEdits(c, [], WHEN);
      const fields = clockFieldsAt(c);
      assert.ok(fields !== undefined, `${name} has a base slot 3`);
      // Exactly two runs: the seven timestamp bytes and the two checksum bytes. Stated as the whole
      // list, so anything else a save decided to touch fails here.
      assert.deepEqual(changed, [
        { start: fields, length: 7 },
        { start: bytes.length - TRAILER_CHECKSUM_OFFSET, length: 2 },
      ], name);
      // And it reads back as the moment asked for, through the reader rather than the writer.
      assert.equal(parse(bytes).builtAt, WHEN, name);
    }
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
    }
  }
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
  const covered = new Map<string, string>([
    ['trailer checksum', 'the trailer is recomputed, not carried'],
    ['base slot 3 build timestamp', 'a save changes the timestamp and the trailer, and nothing else'],
    ['base slot 3 day of week byte', 'the stamped weekday is derived, so the readers accept it'],
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
 * is that there is one implementation and it inverts the reader on eighteen real records.
 */
const ALL_CONTAINERS = [
  'one_safemode', 'one34_region2', 'h700_gspm', 'h600_safemode_gspm', 'h650_safemode_gspm',
  'one_config', 'one_config_unprogrammed', 'h600_config', 'h700_config', 'h700_config_2',
  'h525_config', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d',
  'h525_safemode_ahcm', 'one_spare_before_sync', 'one_spare_after_sync',
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
