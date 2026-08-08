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
  EditError,
  TRAILER_CHECKSUM_OFFSET,
  applyEdits,
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

test('an edit no reader claims is refused', skipUnless(SAMPLE), () => {
  // The rail that keeps this honest. A run nobody has read is a run whose consequences nobody can
  // state, so the layer will not write it even though the bytes are perfectly addressable.
  const c = parse(load(SAMPLE) as Uint8Array);
  const owned = [...claims(c)].sort((a, b) => a.start - b.start);
  let gap: number | undefined;
  for (let i = 1; i < owned.length && gap === undefined; i += 1) {
    const end = (owned[i - 1] as { start: number; length: number }).start
      + (owned[i - 1] as { length: number }).length;
    if ((owned[i] as { start: number }).start > end) gap = end;
  }
  assert.notEqual(gap, undefined, 'this container has an unclaimed byte to try');
  assert.throws(
    () => applyEdits(c, [{ start: gap as number, bytes: Uint8Array.from([1]), owner: 'test' }]),
    EditError,
  );
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
