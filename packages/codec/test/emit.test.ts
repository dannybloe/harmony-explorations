/**
 * The emitter, milestone M2's third part.
 *
 * These tests are the milestone's measure as much as its check. `roundTrip` must stay true for
 * every container while `framed` climbs, so a reader that lands and a structure that moves from
 * copied to rebuilt are the same event seen from two sides.
 *
 * The negatives are the load bearing ones. An emitter that starts from a copy of its input passes
 * a round trip test while writing nothing at all, so equality by itself proves very little. What
 * proves something is that a value changed in the parse reaches the output, that a rebuilder which
 * under-fills its structure is an error rather than a short write, and that the trailer checksum is
 * computed rather than copied.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import {
  Container,
  KeyRecord,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  Section,
  TRAILER_CHECKSUM_OFFSET,
  Writer,
  claims,
  emit,
  parse,
  rebuilds,
  roundTrip,
} from '../src/index.ts';

/**
 * `[sample, framed, carried]` for every container in the corpus.
 *
 * Pinned as exact values for the reason `coverage.test.ts` pins its own: a reader that lands
 * should show up as a diff somebody reads, and one that quietly rebuilds less than it used to
 * should be a failure rather than a silent regression. `framed` rising and `carried` falling by
 * the same amount is a reader getting deeper; both rising is a new structure.
 */
const REBUILT: readonly [string, number, number][] = [
  ['one34_region2', 2168, 1130],
  ['one_safemode', 2168, 1130],
  ['h700_gspm', 1900, 5143],
  ['h600_safemode_gspm', 1900, 5143],
  ['h650_safemode_gspm', 1900, 5143],
  ['h525_config', 21757, 30607],
  ['arch8_config_a', 95871, 348063],
  ['arch8_config_b', 174656, 295506],
  ['arch8_config_c', 186704, 303503],
  ['arch8_config_d', 188062, 303591],
  ['one_config', 223887, 1448644],
  ['one_config_unprogrammed', 67855, 1164176],
  ['h600_config', 207354, 529184],
  ['h700_config', 253243, 723574],
  ['h700_config_2', 253271, 723604],
  ['one_spare_before_sync', 67855, 1164176],
  ['one_spare_after_sync', 141397, 1184969],
];

for (const [name, framed, carried] of REBUILT) {
  test(`${name} emits back to the byte it was parsed from`, skipUnless(name), () => {
    const result = roundTrip(parse(load(name) as Uint8Array));
    assert.equal(
      result.firstDifference,
      undefined,
      `first difference at 0x${result.firstDifference?.toString(16)}`,
    );
    assert.ok(result.equal);
  });

  test(`${name} frames ${framed} bytes and carries ${carried}`, skipUnless(name), () => {
    // Not a restatement of the round trip. Equality holds whether a rebuilder writes its whole
    // structure or half of it, because the residue copy covers whatever it leaves; this is what
    // says how much of the container the emitter is actually responsible for.
    const c = parse(load(name) as Uint8Array);
    const report = emit(c);
    assert.equal(report.framed, framed, 'raise this when a rebuilder lands, do not lower it');
    assert.equal(report.carried, carried);
    assert.equal(report.framed + report.carried + report.copied, c.blob.length, 'a partition');
  });

  test(`${name} leaves only base slot 0 unrebuilt`, skipUnless(name), () => {
    // The difference between what `coverage` claims and what `emit` can put back, which is the
    // remaining work stated as a set rather than as a number. Base slot 0 is the whole of it: its
    // extent is read, from the `0xFEED` frame that states it, and not one field inside it ever
    // was, so the accounting counts it and the emitter cannot touch it.
    const c = parse(load(name) as Uint8Array);
    const done = new Uint8Array(c.blob.length);
    for (const rebuild of rebuilds(c)) {
      for (let i = 0; i < rebuild.bytes.length; i += 1) done[rebuild.start + i] = 1;
    }
    const left = new Set<string>();
    for (const claim of claims(c)) {
      for (let i = 0; i < claim.length; i += 1) {
        if (done[claim.start + i] !== 1) left.add(claim.owner);
      }
    }
    // The trailer is written by `emit` after the rebuild list, because it covers what the list
    // wrote, so its absence here is the design and not a gap.
    left.delete('trailer');
    // Two of the safe mode containers have no `0xFEED` frame at all, so nothing claims base slot 0
    // there and the leftover set is empty rather than that one name.
    const claimed = claims(c).some((claim) => claim.owner === 'slot-0-tree');
    assert.deepEqual([...left], claimed ? ['slot-0-tree'] : []);
  });
}

test('a rebuilder that writes half its structure is an error, not a short write', () => {
  // The guard that matters once the residue copy covers everything a rebuilder does not claim.
  // Poison can no longer survive, so the thing that has to fail loudly is a rebuilder whose bytes
  // do not fill the extent it declared: it would round trip, because the copy would cover the
  // half it skipped, and the byte count would say it had rebuilt the whole thing.
  const short = new Writer(4).u8(1).u8(2);
  assert.equal(short.remaining, 2);
  const over = new Writer(2).u8(1).u8(2).u8(3);
  assert.equal(over.remaining, -1, 'writing past the end has to be visible, not silently dropped');
});

test('a section address changed in the parse reaches the output', skipUnless('h600_config'), () => {
  // Proof that the section table is written from the parse rather than left as it was found. An
  // emitter that skipped the table would pass every equality test above.
  const c = parse(load('h600_config') as Uint8Array);
  const first = c.sections[0];
  assert.ok(first !== undefined);
  const sections = c.sections.map((s, i) =>
    i === 0 ? new Section(s.slot, s.address + 1, s.spare) : s,
  );
  const { bytes } = emit(new Container({ ...c, sections }));
  const item = SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * first.slot;
  assert.notEqual(bytes[item + 1], c.blob[item + 1], 'the low byte of the address');
  assert.equal(bytes[item], first.spare, 'the spare byte is written back, not zeroed');
});

test('a key record changed in the parse reaches the output', skipUnless('h600_config'), () => {
  // The same proof one structure down. Most rebuilders read their structure back through its
  // reader rather than from stored state, so the section table and the key table are the two
  // places where a parsed value can be changed and then watched.
  const c = parse(load('h600_config') as Uint8Array);
  const first = c.keys[0];
  assert.ok(first !== undefined);
  c.keys[0] = new KeyRecord(first.indexInTable, first.eventCode, first.index, first.flags ^ 0xff);
  const { bytes } = emit(c);
  const at = c.markerOffset + 5 + 3;
  assert.equal(bytes[at], first.flags ^ 0xff);
  assert.notEqual(bytes[at], c.blob[at]);
});

test('a flipped payload byte breaks the trailer checksum', skipUnless('h600_config'), () => {
  // The house habit: a checksum that cannot fail is not a check. The flipped byte is inside base
  // slot 0, the one section no rebuilder touches, so it is copied through unchanged and the only
  // thing that can catch it is the emitter recomputing the word rather than copying it.
  const original = parse(load('h600_config') as Uint8Array);
  const blob = Uint8Array.from(original.blob);
  const tree = original.sections[0];
  assert.ok(tree !== undefined);
  const at = (original.blobOffsetOf(tree.address) as number) + 8;
  blob[at] = (blob[at] ?? 0) ^ 0xff;
  const c = new Container({ ...original, blob });
  const result = roundTrip(c);
  assert.equal(result.equal, false);
  // Which half of the word moves depends on the flipped byte's parity, since the checksum XORs
  // little endian words, so the assertion is containment rather than an offset. Pinning the exact
  // byte would pin the parity of an arbitrary choice of `at`.
  const word = blob.length - TRAILER_CHECKSUM_OFFSET;
  assert.ok(
    result.firstDifference !== undefined &&
      result.firstDifference >= word &&
      result.firstDifference < word + 2,
    `expected a difference in the checksum word at ${word}, got ${result.firstDifference}`,
  );
});
