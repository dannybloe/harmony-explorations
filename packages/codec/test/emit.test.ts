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
  ['one34_region2', 2348, 6522],
  ['one_safemode', 2348, 6522],
  ['h700_gspm', 1929, 5144],
  ['h600_safemode_gspm', 1929, 5144],
  ['h650_safemode_gspm', 1929, 5144],
  ['h525_config', 22063, 30608],
  ['h525_config_2', 15079, 24373],
  ['h525_safemode_ahcm', 5375, 7976],
  ['arch8_config_a', 96134, 348064],
  ['arch8_config_b', 175042, 295507],
  ['arch8_config_c', 187127, 303504],
  ['arch8_config_d', 188485, 303592],
  ['one_config', 224165, 1448645],
  ['one_config_unprogrammed', 68038, 1164177],
  ['h600_config', 208925, 529185],
  ['h700_config', 255570, 723575],
  ['h700_config_2', 255598, 723605],
  ['one_spare_before_sync', 68038, 1164177],
  ['one_spare_after_sync', 141572, 1184970],
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

  test(`${name} rebuilds every byte the accounting claims`, skipUnless(name), () => {
    // The difference between what `coverage` claims and what `emit` can put back, which used to be
    // base slot 0 and is now nothing. Section 77 read that frame, so what is left copied is only
    // what no reader claims at all, and this test is what stops that gap reopening quietly.
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
    assert.deepEqual([...left], []);
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
  // The house habit: a checksum that cannot fail is not a check. The flipped byte is a base slot 0
  // node's level field, which the rebuilder reads and writes back faithfully, so the payload comes
  // out matching its input and the only thing that can catch the flip is the emitter recomputing
  // the trailer word rather than copying it. That held when slot 0 was copied through unread and it
  // still holds now that section 77 rebuilds it, for the same reason: the emitter reproduces what
  // it was given, so the checksum is the only place a changed payload can show up.
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
