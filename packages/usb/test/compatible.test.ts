/**
 * The compatibility gate, tested as a comparison rather than as a boolean.
 *
 * Section 225. Everything here is literals: the version blocks are bytes recorded from remotes and
 * the stated versions are what the corpus's own wrappers say, so this file needs no lab and no
 * hardware. `packages/corpus/test/compatibility.test.ts` is the other half, which reads every
 * config's real wrapper and needs both.
 *
 * **The sharpest case is the Harmony 525's**, because its version block was recorded verbatim off
 * the remote, `docs/usb-protocol.md` section 4, so this compares a captured reply against a file
 * header with nothing assembled in between.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  COMPARABLE_FIELDS,
  CompatibilityError,
  RailError,
  assertConfigIsForThisRemote,
  compareIntendedVersion,
  compareIntendedVersionAgainstBlock,
  encodeVersionBlock,
  readVersion,
} from '../src/index.ts';

/**
 * A Harmony 525's own `GET_VERSION` reply, minus the report header byte `0x27`.
 *
 * `27 30 25 12 ff 90 16 09` is what the remote answered on 8 August 2026, recorded in
 * `docs/usb-protocol.md`: firmware 3.0, board 2.5.0, flash `0xFF:0x12`, architecture 9, skin 22,
 * platform 9. Nothing here computed any of it.
 */
const H525_BLOCK = Uint8Array.from([0x30, 0x25, 0x12, 0xff, 0x90, 0x16, 0x09]);

/** What `h525_config`'s wrapper states, copied from the file. */
const H525_STATED = {
  PROTOCOL: '9',
  SKIN: '22',
  FLASH: '0xFF:0x12',
  BOARD: '2.5.0',
  SOFTWARETYPE: '0',
};

/** What `one_config`'s wrapper states, copied from the file. Both bench Harmony Ones report this. */
const ONE_STATED = {
  PROTOCOL: '12',
  SKIN: '54',
  FLASH: '0x1F:0xC8',
  BOARD: '0.5.0',
  SOFTWARETYPE: '0',
};

/** And what `h600_config`'s wrapper states, for the negative control below. */
const H600_STATED = {
  PROTOCOL: '14',
  SKIN: '71',
  FLASH: '0x15:0x1C',
  BOARD: '1.1.0',
  SOFTWARETYPE: '0',
};

/**
 * A Harmony One's block, from the values `concordance -i` reads off both bench units and the
 * compiled in literals section 87 read out of the 3.4 image.
 */
const ONE_BLOCK = encodeVersionBlock({
  firmware: 0x34,
  hardware: 0x05,
  flash: [0x1f, 0xc8],
  architecture: 12,
  softwareType: 0,
  skin: 54,
  platform: 0x0c,
});

/** The same for a Harmony 600, whose platform byte is the same `0x0C`. That is the control's point. */
const H600_BLOCK = encodeVersionBlock({
  firmware: 0x02,
  hardware: 0x11,
  flash: [0x15, 0x1c],
  architecture: 14,
  softwareType: 0,
  skin: 71,
  platform: 0x0c,
});

test("a remote's own config matches it on every field the config states", () => {
  // Three units, three architectures, and the 525's block is a captured reply rather than one built
  // here. Five fields each, because no config in the corpus states `ARCHITECTURE`.
  for (const [name, stated, block] of [
    ['Harmony 525', H525_STATED, H525_BLOCK],
    ['Harmony One', ONE_STATED, ONE_BLOCK],
    ['Harmony 600', H600_STATED, H600_BLOCK],
  ] as const) {
    const result = compareIntendedVersionAgainstBlock(stated, block);
    assert.equal(result.compared, 5, `${name}: fields compared`);
    assert.deepEqual(result.mismatched, [], `${name}: ${JSON.stringify(result.fields)}`);
    assert.equal(result.compatible, true, name);
    // The sixth is absent rather than matching by luck, which is what "absent matches anything"
    // means and is the one verdict that must not read as a comparison.
    const architecture = result.fields.find((f) => f.field === 'ARCHITECTURE');
    assert.equal(architecture?.verdict, 'not-stated');
  }
});

test('the calibration case: a wrong remote is refused, and on the fields that differ', () => {
  // The finding gate asks for a case whose answer is known and for the score of wrong answers. A
  // Harmony 525's block against a Harmony One's config must disagree on four of the five stated
  // fields, and agree on `SOFTWARETYPE`, since every config in the corpus declares 0 and every
  // bench remote was running its application.
  const wrong = compareIntendedVersionAgainstBlock(ONE_STATED, H525_BLOCK);
  assert.equal(wrong.compatible, false);
  assert.deepEqual([...wrong.mismatched].sort(), ['BOARD', 'FLASH', 'PROTOCOL', 'SKIN']);
  assert.equal(wrong.fields.find((f) => f.field === 'SOFTWARETYPE')?.verdict, 'match');

  // And the other direction, so the result is not an artefact of which side is which.
  const alsoWrong = compareIntendedVersionAgainstBlock(H525_STATED, ONE_BLOCK);
  assert.deepEqual([...alsoWrong.mismatched].sort(), ['BOARD', 'FLASH', 'PROTOCOL', 'SKIN']);
});

test('PROTOCOL is the architecture and not the platform byte, which is the reading that could have gone wrong', () => {
  // **The mistake this rules out.** A Harmony One and a Harmony 600 both report `0x0C` in field 6,
  // the platform, and this project called that field "protocol" until section 116. Reading
  // `PROTOCOL` as field 6 would therefore match a Harmony 600's config to a Harmony One, which is
  // exactly the write the rail exists to refuse.
  assert.equal(readVersion(ONE_BLOCK).platform, readVersion(H600_BLOCK).platform);
  const crossed = compareIntendedVersionAgainstBlock(H600_STATED, ONE_BLOCK);
  assert.ok(crossed.mismatched.includes('PROTOCOL'),
    'a Harmony 600 config was accepted for a Harmony One on the protocol field');
});

test('the two sides may spell the same value differently and still match', () => {
  const reading = readVersion(ONE_BLOCK);
  // Flash: the config writes both halves with `0x` and the remote reports neither, and hex case is
  // not a fact about a remote.
  for (const flash of ['0x1F:0xC8', '0x1f:0xc8', '1F:C8']) {
    assert.equal(compareIntendedVersion({ FLASH: flash }, reading).compatible, true, flash);
  }
  // Board: the remote's block carries two components and every config in the corpus writes three.
  // concordance sets the third to zero outright for this family, so the zero fill is the rule and
  // not a convenience.
  for (const board of ['0.5.0', '0.5']) {
    assert.equal(compareIntendedVersion({ BOARD: board }, reading).compatible, true, board);
  }
  // And a decimal field with a leading zero is the same number.
  assert.equal(compareIntendedVersion({ SKIN: '054' }, reading).compatible, true);
  // The negative half, so none of the above is passing by accepting everything.
  assert.equal(compareIntendedVersion({ BOARD: '0.5.1' }, reading).compatible, false);
  assert.equal(compareIntendedVersion({ FLASH: '0x1F:0xC9' }, reading).compatible, false);
  assert.equal(compareIntendedVersion({ SKIN: '55' }, reading).compatible, false);
});

test('a flash id is read as hex on both sides, and a malformed one does not match', () => {
  // **This was a real defect, found by the test above.** The general reader was "decimal unless `0x`
  // prefixed", so the bare form a remote reports, `1F:C8`, came out as 1 and 0. A flash id is a
  // JEDEC pair and is hex whatever the writer prefixed, which is what makes `10` the dangerous case
  // rather than `1F`: ten against the remote's sixteen is a plausible number and a wrong chip.
  const reading = readVersion(ONE_BLOCK);
  assert.equal(compareIntendedVersion({ FLASH: '1F:C8' }, reading).compatible, true);
  // A decimal reading of the same text would be 1 and 0, so this pair is what tells the two
  // readings apart: as hex it is a mismatch, as decimal `0x10` would be sixteen and match.
  assert.equal(compareIntendedVersion({ FLASH: '10:C8' }, reading).compatible, false);
  for (const flash of ['1F', '1F:C8:00', 'not:hex', '0x1F:', ':0xC8', '']) {
    assert.equal(compareIntendedVersion({ FLASH: flash }, reading).compatible, flash === '',
      `flash ${JSON.stringify(flash)}`);
  }
});

test('an absent, empty or whitespace field is not compared and is not a match either', () => {
  const reading = readVersion(ONE_BLOCK);
  // A wrapper written across lines states an empty field as a newline, which is how Logitech's own
  // fallback entry matches every remote.
  for (const stated of [{}, { SKIN: '' }, { SKIN: '\n' }, { SKIN: '  ' }]) {
    const result = compareIntendedVersion(stated, reading);
    assert.equal(result.compared, 0, JSON.stringify(stated));
    assert.equal(result.compatible, true, 'the format says an absent field matches anything');
  }
  // The distinction that matters: compatible with nothing compared is not the same as a match, and
  // `compared` is what a caller has to read to tell them apart.
  assert.equal(compareIntendedVersion({}, reading).compared, 0);
  assert.equal(compareIntendedVersion(ONE_STATED, reading).compared, 5);
});

test('a field this comparison does not know is a refusal, not something skipped', () => {
  const reading = readVersion(ONE_BLOCK);
  // `CLIENTSOFTWARE` and `SOFTWARE` are real elements in the corpus's wrappers, inside the
  // `USERMESSAGES` chain rather than inside `INTENDEDVERSION`, and neither is one of the six.
  // Ignoring an unknown field would report a match having compared less than it looked like.
  for (const field of ['CLIENTSOFTWARE', 'SOFTWARE', 'MODEL']) {
    assert.throws(() => compareIntendedVersion({ [field]: '2.7' }, reading), CompatibilityError,
      field);
  }
});

test('encodeVersionBlock inverts readVersion, on a block that came off a remote', () => {
  // The reason this exists is that a version block is a rail input now, so tests and the bench have
  // to build one, and a builder per caller is a second copy of the layout. The claim is that the
  // encoder and the decoder are inverses, checked on the one block here that nothing here made up.
  const reading = readVersion(H525_BLOCK);
  const rebuilt = encodeVersionBlock({
    firmware: 0x30,
    hardware: 0x25,
    flash: [0xff, 0x12],
    architecture: reading.architecture,
    softwareType: reading.softwareType,
    skin: reading.skin,
    platform: reading.platform,
  });
  assert.deepEqual([...rebuilt], [...H525_BLOCK]);
  // And the round trip through the reading, field by field, so a swapped flash pair would show.
  const again = readVersion(rebuilt);
  assert.equal(again.firmware, '3.0');
  assert.equal(again.hardware, '2.5');
  assert.equal(again.flash, 'FF:12');
  assert.equal(again.architecture, 9);
  assert.equal(again.skin, 22);
});

test('the rail refuses two readings of one remote that disagree about it', () => {
  // The cheap half of the gate and the one that needs no config at all: a caller that read a version
  // block from one remote and took the architecture from somewhere else.
  const p = { architecture: 12, intendedVersion: {}, versionBlock: ONE_BLOCK };
  assert.deepEqual(assertConfigIsForThisRemote(p).compared, 0);
  assert.throws(() => assertConfigIsForThisRemote({ ...p, architecture: 14 }), RailError);
  // A block that is not an identity at all is refused with its own reason rather than throwing
  // whatever `readVersion` throws, because a rail's refusal is read by an operator.
  assert.throws(() => assertConfigIsForThisRemote({ ...p, versionBlock: new Uint8Array(4) }),
    RailError);
  // And the comparison itself still runs from in here.
  assert.throws(() => assertConfigIsForThisRemote({ ...p, intendedVersion: { SKIN: '99' } }),
    RailError);
});

test('the comparable fields are the six the format states, in the format order', () => {
  // The list is `packages/codec`'s, and `packages/corpus/test/compatibility.test.ts` compares the
  // two tables entry for entry, since this package deliberately cannot import that one. Pinning the
  // count and the order here is what makes a silent addition visible in both places.
  assert.deepEqual(COMPARABLE_FIELDS,
    ['PROTOCOL', 'SKIN', 'FLASH', 'BOARD', 'SOFTWARETYPE', 'ARCHITECTURE']);
});
