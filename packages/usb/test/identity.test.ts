/**
 * Which unit is on the cable, tested on synthetic blocks in the real block's shape.
 *
 * Section 226. No lab and no hardware: the values that identify a real remote live in the private
 * lab, so this file works on blocks built here, in the layout `docs/usb-protocol.md` read off three
 * remotes. The one thing it must get right is the trap, and that is the first test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DISCRIMINATOR_BYTES,
  IDENTITY_BYTES,
  IDENTITY_FIELDS,
  IDENTITY_OFFSET,
  IDENTITY_PAGE,
  UnitIdentityError,
  identifiesAUnit,
  sameUnit,
  unitDiscriminator,
  unitIdentityFromText,
  unitIdentityText,
} from '../src/index.ts';

/** A block in a real one's shape: `0xEE` serial field, two written GUIDs, sixteen zeroes. */
function block(seed: number): Uint8Array {
  const out = new Uint8Array(IDENTITY_BYTES).fill(0);
  out.fill(0xee, IDENTITY_FIELDS.serial, IDENTITY_FIELDS.guidA);
  for (let i = 0; i < DISCRIMINATOR_BYTES; i += 1) {
    out[IDENTITY_FIELDS.guidA + i] = (seed * 31 + i * 7 + 1) & 0xff;
  }
  return out;
}

test('the field named the serial cannot identify a unit, which is why the GUIDs are compared', () => {
  // **The trap this module exists for.** `docs/usb-protocol.md`: the first 16 bytes are `0xEE` on
  // all three remotes read here, `concordance -i` agrees the serial is unset, and it is a field
  // nobody writes. So the obvious comparison, of the field actually called the serial, matches every
  // unit against every other and says yes with confidence.
  const a = block(1);
  const b = block(2);
  const serialOf = (x: Uint8Array) => x.subarray(IDENTITY_FIELDS.serial, IDENTITY_FIELDS.guidA);
  assert.deepEqual([...serialOf(a)], [...serialOf(b)], 'the serial fields are identical filler');
  assert.equal(serialOf(a).every((byte) => byte === 0xee), true);
  // And the discriminator does tell them apart, which is the whole claim.
  assert.equal(sameUnit(a, b), false);
  assert.equal(sameUnit(a, a), true);
});

test('an identity with no per unit value is refused rather than matched', () => {
  // A block whose GUID fields were never written. `0xEE`, `0xFF` and `0x00` are all fills this
  // project has seen in this region, and every one of them would compare equal against another unit
  // in the same state. A refusal is the only honest answer: the truth is not "a different unit", it
  // is "this cannot be told".
  for (const fill of [0xee, 0xff, 0x00]) {
    const blank = new Uint8Array(IDENTITY_BYTES).fill(fill);
    assert.equal(identifiesAUnit(blank), false, `fill 0x${fill.toString(16)}`);
    assert.throws(() => sameUnit(blank, blank), UnitIdentityError, `fill 0x${fill.toString(16)}`);
    // Including against a good one, in both directions, so neither side is trusted more.
    assert.throws(() => sameUnit(blank, block(1)), UnitIdentityError);
    assert.throws(() => sameUnit(block(1), blank), UnitIdentityError);
  }
  // Half written is the same problem one level down: one real GUID and one filler field is half the
  // bytes a caller would assume are doing the work.
  const half = block(1);
  half.fill(0xff, IDENTITY_FIELDS.guidB, IDENTITY_FIELDS.trailer);
  assert.equal(identifiesAUnit(half), false, 'one written GUID and one filler field');
  // The control: the same block with both GUIDs written is accepted, so the refusal above is about
  // the filler and not about the shape.
  assert.equal(identifiesAUnit(block(1)), true);
});

test('the discriminator is the two GUIDs and nothing else', () => {
  const b = block(3);
  const discriminator = unitDiscriminator(b);
  assert.equal(discriminator.length, 32);
  assert.deepEqual([...discriminator],
    [...b.subarray(IDENTITY_FIELDS.guidA, IDENTITY_FIELDS.trailer)]);
  // Neither the filler serial nor the zero trailer is in it, which is what stops a byte count
  // somebody quotes later from including 32 bytes that are the same on every unit.
  assert.equal(discriminator.includes(0xee), b.subarray(IDENTITY_FIELDS.guidA,
    IDENTITY_FIELDS.trailer).includes(0xee));
});

test('two lengths are accepted and every other is refused', () => {
  // The whole block as a read returns it, and the discriminator as a caller stored it. Anything else
  // is a refusal rather than a subarray of whatever arrived, because comparing the wrong 32 bytes
  // and getting a confident answer is exactly the failure this module is for.
  assert.equal(unitDiscriminator(block(1)).length, 32);
  assert.equal(unitDiscriminator(unitDiscriminator(block(1))).length, 32);
  for (const length of [0, 16, 31, 33, 63, 65, 128]) {
    assert.throws(() => unitDiscriminator(new Uint8Array(length)), UnitIdentityError, `${length}`);
  }
});

test('an identity survives being written down and read back', () => {
  // Both callers persist it: the bench into the lab, FreeHarmony with the user's own data. So the
  // text form has to round trip exactly, and a value written by one version has to be readable by
  // the next.
  const b = block(4);
  const text = unitIdentityText(b);
  assert.match(text, /^[0-9a-f]{64}$/);
  assert.deepEqual([...unitIdentityFromText(text)], [...unitDiscriminator(b)]);
  // And a stored identity compares against a freshly read block, which is the actual use.
  assert.equal(sameUnit(b, unitIdentityFromText(text)), true);
  assert.equal(sameUnit(block(5), unitIdentityFromText(text)), false);
  // Whitespace and case are not facts about a remote, since a person may have typed the file.
  assert.deepEqual([...unitIdentityFromText(`  ${text.toUpperCase()}\n`)],
    [...unitIdentityFromText(text)]);
  // Anything that is not exactly the right length of hex is refused rather than padded.
  for (const bad of ['', 'ab', text.slice(1), `${text}00`, text.replace(/^./, 'g')]) {
    assert.throws(() => unitIdentityFromText(bad), UnitIdentityError, JSON.stringify(bad.slice(0, 8)));
  }
});

test('the block is read from the page and offset three remotes confirmed', () => {
  // Pinned because they are the whole route: `0xFF` is the page whose top holds the identity block
  // and `0xFE` is a different page mapping program address zero, so a swap here reads the reset
  // vectors and compares them between units, which are identical on every unit of a model.
  assert.equal(IDENTITY_PAGE, 0xff);
  assert.equal(IDENTITY_OFFSET, 0xf400);
  assert.equal(IDENTITY_BYTES, 64);
  // And the count is even. An internal read of an odd count never terminates and hangs the remote,
  // section 94, so this is a rail and not a preference.
  assert.equal(IDENTITY_BYTES % 2, 0);
});
