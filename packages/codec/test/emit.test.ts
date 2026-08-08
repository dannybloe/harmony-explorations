/**
 * The emitter, milestone M2's third part.
 *
 * These tests are the milestone's measure as much as its check. `roundTrip` must stay true for
 * every container while `rebuilt` climbs, so a reader that lands and a structure that moves from
 * copied to rebuilt are the same event seen from two sides.
 *
 * Three of the tests are negatives, and they are the load bearing ones. An emitter that starts
 * from a copy of its input passes a round trip test while writing nothing at all, so equality by
 * itself proves very little. What proves something is that a byte the emitter fails to write stays
 * poison, that a value changed in the parse reaches the output, and that the checksum is computed
 * rather than copied.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import {
  Container,
  FAMILIES,
  Section,
  Writer,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  TRAILER_CHECKSUM_OFFSET,
  emit,
  parse,
  roundTrip,
} from '../src/index.ts';

/** Every container in the corpus, including the three safe mode ones and the two spare dumps. */
const CONTAINERS: readonly string[] = [
  'one34_region2',
  'one_safemode',
  'h700_gspm',
  'h600_safemode_gspm',
  'h650_safemode_gspm',
  'h525_config',
  'arch8_config_a',
  'arch8_config_b',
  'arch8_config_c',
  'arch8_config_d',
  'one_config',
  'one_config_unprogrammed',
  'h600_config',
  'h700_config',
  'h700_config_2',
  'one_spare_before_sync',
  'one_spare_after_sync',
];

/** The frame's own size: eleven header bytes, four per slot, and six of trailer. */
const FRAME_FIXED = 17;

for (const name of CONTAINERS) {
  test(`${name} emits back to the byte it was parsed from`, skipUnless(name), () => {
    const result = roundTrip(parse(load(name) as Uint8Array));
    assert.equal(
      result.firstDifference,
      undefined,
      `first difference at 0x${result.firstDifference?.toString(16)}`,
    );
    assert.ok(result.equal);
  });

  test(`${name} accounts for every byte exactly once`, skipUnless(name), () => {
    // Not a restatement of the round trip. Equality holds whether a rebuilder writes its whole
    // structure or half of it, because the residue copy covers for whatever it leaves; this pins
    // that the three categories partition the container, which is what makes the number mean
    // something.
    const c = parse(load(name) as Uint8Array);
    const report = emit(c);
    assert.equal(report.framed + report.carried + report.copied, c.blob.length);
    assert.ok(report.framed > FRAME_FIXED + SECTION_ITEM_SIZE * c.pointerCount);
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

test('a flipped payload byte breaks the trailer checksum', skipUnless('h600_config'), () => {
  // The house habit: a checksum that cannot fail is not a check. The flipped byte is copied
  // through, so the only thing that can catch it is the emitter recomputing the word rather than
  // copying it, and the difference lands on that word and nowhere earlier.
  const original = parse(load('h600_config') as Uint8Array);
  const blob = Uint8Array.from(original.blob);
  const at = original.markerOffset + 8;
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
