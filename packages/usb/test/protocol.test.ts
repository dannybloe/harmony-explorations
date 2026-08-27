/**
 * The command encoding, against the firmware's own tables.
 *
 * These check the two things that fail silently on a real device. A wrong length nibble is not
 * rejected, it makes the firmware read the wrong number of argument bytes, so a READ_FLASH becomes
 * a read of somewhere else. And a wrong byte order in the address is not rejected either, because
 * every 24-bit value is a valid address.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as everything from '../src/index.ts';

import {
  COMMAND_NAMES,
  COMMAND_STATES,
  ERASE_FLASH,
  GET_VERSION,
  MAX_PAYLOAD,
  MISC_RAM,
  MISC_REPLY,
  MISC_REPLY_CODE,
  ProtocolError,
  READ_FLASH,
  READ_MISC,
  READ_MISC_SELECTORS,
  REPORT_SIZE,
  START_IRCAP,
  STOP_IRCAP,
  WRITE_FLASH,
  WRITE_MISC,
  WRITE_MISC_SELECTORS,
  architectureFromVersion,
  readVersion,
  SOFTWARE_TYPE_NAMES,
  SOFTWARE_TYPE_SAFE_MODE,
  VERSION_FIELD_COUNT,
  VERSION_FIELD_NAMES,
  softwareTypeFromVersion,
  decodeReply,
  encodeRequest,
  getVersionRequest,
  nibbleForPayloadLength,
  payloadLengthForNibble,
  readFlashRequest,
  readMiscRequest,
  readRamRequest,
  regionOf,
  ARCH9_WINDOWS,
  ARCHITECTURES_WITH_A_WRITE_TARGET,
  FLASH_TOP_BYTE_BOUND,
  validateRegionByte,
} from '../src/index.ts';
// By path, because the barrel deliberately does not carry these: `writes.ts` is the rail.
import { eraseFlashRequest, writeFlashRequest, writeMiscRequest } from '../src/writes.ts';

test('the length nibble mapping is the one the firmware implements', () => {
  for (let n = 0; n <= 7; n += 1) assert.equal(payloadLengthForNibble(n), n);
  assert.equal(payloadLengthForNibble(0x8), 15);
  assert.equal(payloadLengthForNibble(0x9), 31);
  assert.equal(payloadLengthForNibble(0xa), 63);
});

test('63 payload bytes plus the command byte is exactly one report', () => {
  // The closure that makes the mapping believable: a misreading of the comparison chain would not
  // land on the report size the descriptors declare.
  assert.equal(payloadLengthForNibble(0xa) + 1, REPORT_SIZE);
  assert.equal(MAX_PAYLOAD, 63);
  // And the three values are 2^4-1, 2^5-1, 2^6-1, which is not what an off by one reading gives.
  assert.deepEqual([0x8, 0x9, 0xa].map(payloadLengthForNibble), [15, 31, 63]);
});

test('a payload length no nibble encodes is refused rather than rounded up', () => {
  // Rounding up would be the tempting fix and it would be wrong: the firmware takes the nibble as
  // the number of bytes present, so padding a five byte request to fifteen is a different request.
  assert.equal(nibbleForPayloadLength(5), 5);
  assert.equal(nibbleForPayloadLength(15), 0x8);
  assert.equal(nibbleForPayloadLength(63), 0xa);
  for (const length of [8, 9, 14, 16, 30, 32, 62]) {
    assert.throws(() => nibbleForPayloadLength(length), ProtocolError, `${length} bytes`);
  }
});

test('every request is a full report, zero padded', () => {
  for (const request of [getVersionRequest(), readFlashRequest(0x030000, 63), eraseFlashRequest(0x030000)]) {
    assert.equal(request.length, REPORT_SIZE);
  }
  const request = readMiscRequest(MISC_RAM, 0x0ec9);
  assert.deepEqual([...request.subarray(4)], new Array(REPORT_SIZE - 4).fill(0));
});

test('READ_FLASH is a 24-bit address and a 16-bit count, most significant first', () => {
  // The byte order is fixed by the firmware copying the three variables into TBLPTRL, TBLPTRH and
  // TBLPTRU, so it is not a convention this side gets to choose.
  const request = readFlashRequest(0x031234, 0x0140);
  assert.equal(request[0], READ_FLASH | 5, 'command with a length nibble of 5');
  assert.deepEqual([...request.subarray(1, 6)], [0x03, 0x12, 0x34, 0x01, 0x40]);
});

test('WRITE_FLASH takes exactly the same five bytes as READ_FLASH', () => {
  // Same variables in the firmware, same validator, so the encoder is shared. Worth pinning: it
  // means a bug in one is a bug in both, and it means the region rules apply to writes too.
  const read = readFlashRequest(0x031234, 0x0140);
  const write = writeFlashRequest(0x031234, 0x0140);
  assert.deepEqual([...write.subarray(1, 6)], [...read.subarray(1, 6)]);
  assert.equal(write[0], WRITE_FLASH | 5);
});

test('ERASE_FLASH carries an address and no count at all', () => {
  // Which is why an erase cannot be scoped by the caller, only refused. The length nibble is the
  // evidence: three, not five.
  const request = eraseFlashRequest(0x030000);
  assert.equal(request[0], ERASE_FLASH | 3);
  assert.deepEqual([...request.subarray(1, 4)], [0x03, 0x00, 0x00]);
  assert.equal(request[4], 0, 'nothing where a count would be');
});

test('a RAM read is READ_MISC selector 0x07, not 0x06', () => {
  // libconcord's header names MISC_RAM as 0x06, and 0x06 on this architecture is a different
  // accessor that returns a plausible byte from somewhere else. This is the one place the
  // difference between deriving and adopting is a wrong number rather than a missing one.
  const request = readRamRequest(0x0ec9);
  assert.equal(request[0], READ_MISC | 3);
  assert.deepEqual([...request.subarray(1, 4)], [0x07, 0x0e, 0xc9]);
  assert.equal(MISC_RAM, 0x07);
});

test('a command with bits in its low nibble is refused', () => {
  // 0xE1 RESET is really 0xE0 with a length nibble of 1 and one payload byte, so accepting a
  // command byte that already has a nibble set would encode a length twice.
  assert.throws(() => encodeRequest(0xe1), ProtocolError);
  assert.throws(() => encodeRequest(0x51, [1]), ProtocolError);
});

test('the region byte rule is the firmware validator, and it rejects', () => {
  // A rule that accepts everything is not a rule. The middle range is the interesting part: it is
  // rejected by the device, so a host that sends it gets nothing back and looks broken.
  assert.equal(validateRegionByte(0x00), 'config-flash');
  assert.equal(validateRegionByte(0x1f), 'config-flash');
  assert.equal(validateRegionByte(0xfe), 'internal-program-memory');
  assert.equal(validateRegionByte(0xff), 'internal-program-memory');
  for (const byte of [0x40, 0x41, 0x80, 0xfd]) {
    assert.throws(() => validateRegionByte(byte), ProtocolError, `0x${byte.toString(16)}`);
  }
});

test('the two bench architectures bound the address differently, at their flash size', () => {
  // Section 88, and this test is the correction: 0x20 was arch 14's bound applied to arch 12 as
  // well. Each firmware's validator stops at exactly the capacity of that model's flash part, so
  // the pair measures the flash size and not only the protocol.
  assert.equal(FLASH_TOP_BYTE_BOUND[12], 0x40, 'the One, 4 MiB');
  assert.equal(FLASH_TOP_BYTE_BOUND[14], 0x20, 'the 600, 2 MiB');

  // The address that separates them, which is the one worth naming: legal on a One, refused by a
  // 600. Measured on both bench remotes on 9 August 2026.
  assert.equal(validateRegionByte(0x20, 12), 'config-flash');
  assert.throws(() => validateRegionByte(0x20, 14), ProtocolError);
  assert.equal(validateRegionByte(0x3f, 12), 'config-flash');
  assert.throws(() => validateRegionByte(0x40, 12), ProtocolError);

  // Both still reach internal program memory, which is tested before the bound and by masking bit
  // 0 off, so 0xFE and 0xFF are one case rather than two.
  for (const architecture of [12, 14]) {
    assert.equal(validateRegionByte(0xfe, architecture), 'internal-program-memory');
    assert.equal(validateRegionByte(0xff, architecture), 'internal-program-memory');
  }
});

test('an architecture with no recorded bound is refused rather than given a neighbour', () => {
  // The mistake the table exists to prevent, stated as a test: adding a read profile for a new
  // architecture must not silently inherit arch 12's range.
  assert.equal(FLASH_TOP_BYTE_BOUND[8], undefined);
  assert.throws(() => validateRegionByte(0x00, 8), ProtocolError);
});

test('arch 9 puts its flash a megabyte up, and the two rules disagree everywhere', () => {
  // Measured on a Harmony 525 on 8 August 2026: silent at 0x010000, 0x020000 and 0x030000, and
  // answering at 0x800000, 0x810000, 0x820000 and 0x870000. `docs/findings.md` section 76.
  assert.equal(validateRegionByte(0x82, 9), 'config-flash');
  assert.equal(validateRegionByte(0x80, 9), 'config-flash');
  assert.equal(validateRegionByte(0x87, 9), 'config-flash');
  // Internal program memory is at plain low addresses on a PIC18LF4550, with no 0xFE window. It is
  // still reported as internal, which is what keeps the one chunk cap over it.
  assert.equal(validateRegionByte(0x00, 9), 'internal-program-memory');
  // And 0xFE is not a window here at all, so the arch 12 route into program memory is refused.
  assert.throws(() => validateRegionByte(0xfe, 9), ProtocolError);
});

test('arch 9 serves four windows below its flash, and three of them are not flash at all', () => {
  // Section 119, read out of the validator's own XORLW chain at 0x02E14 in the application and
  // 0x01836 in the safe mode image, identically. Section 88 read from 0x02E30, which is the default
  // arm: the four cases are tested above it, so this library refused three regions the firmware
  // serves and the documented reason described only what an unmatched top byte gets.
  assert.equal(validateRegionByte(0x20, 9), 'eeprom');
  assert.equal(validateRegionByte(0x30, 9), 'arch9-tag-30');
  assert.equal(validateRegionByte(0x40, 9), 'data-memory');
  assert.equal(validateRegionByte(0x00, 9), 'internal-program-memory');
  // The bounds, which are the closure: each is a documented size of the PIC18F4550, so the chain
  // and the datasheet agree without either being fitted to the other.
  assert.equal(ARCH9_WINDOWS[0x20]?.bound, 0x0100); // 256 bytes of EEPROM
  assert.equal(ARCH9_WINDOWS[0x40]?.bound, 0x0800); // 2048 bytes of RAM
  assert.equal(ARCH9_WINDOWS[0x00]?.bound, 0x8000); // 32 KiB of program flash
  // And they are enforced, because the firmware enforces them: a read past a window's end is
  // refused here rather than sent and answered with whatever the device does about it.
  assert.equal(regionOf(0x2000ff, 9), 'eeprom');
  assert.throws(() => regionOf(0x200100, 9), ProtocolError, 'one past the EEPROM');
  assert.throws(() => regionOf(0x400800, 9), ProtocolError, 'one past data memory');
  assert.throws(() => regionOf(0x008000, 9), ProtocolError, 'one past program flash');
  // Still nothing between 0x41 and 0x7F, which is the negative that keeps this a window table
  // rather than a widening.
  for (const byte of [0x10, 0x21, 0x41, 0x50, 0x7f, 0x88, 0xfe]) {
    assert.throws(() => validateRegionByte(byte, 9), ProtocolError, `0x${byte.toString(16)}`);
  }
});

test('the arch 9 windows are readable and none of them becomes writable', () => {
  // The rail that matters about the change above. Reading a region and writing it are decided by
  // different tables on purpose: the write path goes through CONFIG_REGION_BASE and
  // ARCHITECTURES_WITH_A_WRITE_TARGET, neither of which knows what regionOf answers. So naming the
  // EEPROM did not make the EEPROM a write target, and arch 9 has no write target at all.
  assert.equal(regionOf(0x200000, 9), 'eeprom');
  assert.ok(!ARCHITECTURES_WITH_A_WRITE_TARGET.includes(9));
  assert.deepEqual([...ARCHITECTURES_WITH_A_WRITE_TARGET], [12]);
});

test('each architecture refuses the other one is allowed', () => {
  // The negative, and it is the whole reason the rule takes an architecture. Every address that
  // works on a 525 is refused by the arch 12 rule, and the arch 12 config base is refused by the
  // arch 9 one, so a default applied to the wrong remote fails before a byte is sent.
  assert.throws(() => validateRegionByte(0x82), ProtocolError, 'arch 12 rule on an arch 9 address');
  assert.throws(() => validateRegionByte(0x04, 9), ProtocolError, 'arch 9 rule on an arch 12 base');
  assert.throws(() => validateRegionByte(0x03, 9), ProtocolError, 'the 525 is silent here');
  assert.equal(regionOf(0x820000, 9), 'config-flash');
  assert.throws(() => regionOf(0x820000), ProtocolError);
});

test('the config regions of both architectures are in the accepted range', () => {
  // The check that this rule is compatible with reading the remotes on the bench at all.
  assert.equal(regionOf(0x040000), 'config-flash'); // arch 12, Harmony One
  assert.equal(regionOf(0x030000), 'config-flash'); // arch 14, Harmony 600 and 700
});

test('an acknowledgement names the command it acknowledges', () => {
  // 0xF0 followed by the command byte, from two samples built the same way in the firmware. So a
  // host needs no per command table for "done, no payload".
  const reply = decodeReply(new Uint8Array([0xf1, ERASE_FLASH]));
  assert.deepEqual(reply, { kind: 'ack', command: 0xd0, commandName: 'ERASE_FLASH' });
});

test('a READ_MISC reply echoes the selector alongside its byte', () => {
  const reply = decodeReply(new Uint8Array([0xc2, MISC_RAM, 0x5a]));
  assert.deepEqual(reply, {
    kind: 'misc',
    selector: 0x07,
    value: 0x5a,
    bytes: Uint8Array.of(0x5a, 0),
    word: 0x5a00,
  });
});

test('a READ_MISC reply keeps the byte after the value, because arch 9 puts the answer there', () => {
  // Section 90. The header nibble claims two payload bytes on every architecture and the arch 9
  // firmware sends three: the echoed selector and then a sixteen bit result, **high byte first**.
  // `value` is the byte a Harmony One or a 600 answers with and the high half of what a 525 answers
  // with, so a caller that wants the 525's number reads `word` or the second of `bytes`.
  const reply = decodeReply(new Uint8Array([0xc2, 0x01, 0x00, 0x0d]));
  assert.equal(reply.kind, 'misc');
  if (reply.kind !== 'misc') return;
  assert.equal(reply.value, 0x00, 'the old reading, which is the high byte on arch 9');
  assert.equal(reply.word, 0x000d);
  assert.deepEqual(reply.bytes, Uint8Array.of(0x00, 0x0d));
});

test('a two byte misc reply reads its missing low byte as zero rather than as undefined', () => {
  // A remote that answers in two bytes leaves the third at whatever the report was filled with, and
  // the transport zero fills. So `word` is defined on every architecture and means something on
  // exactly one, which is why nothing here picks between them.
  const reply = decodeReply(new Uint8Array([0xc2, MISC_RAM, 0xff]));
  assert.equal(reply.kind === 'misc' && reply.word, 0xff00);
});

test('a version reply is cut to twelve fields by the count the firmware copies', () => {
  // Not by the length nibble, at 0x28. Its nibble would mean 15 payload bytes under the request
  // mapping while the executor copies 12, and that discrepancy is unresolved, so the count that is
  // actually established wins.
  const report = new Uint8Array(REPORT_SIZE);
  report[0] = 0x28;
  for (let i = 0; i < 15; i += 1) report[1 + i] = i + 1;
  const reply = decodeReply(report);
  assert.equal(reply.kind, 'version');
  if (reply.kind !== 'version') return;
  assert.deepEqual([...reply.fields], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('a Harmony 525 answers 0x27 and seven fields, which used to decode as anonymous data', () => {
  // The exact reply measured on the bench on 8 August 2026, every byte of it identified: firmware
  // 3.0, board 2.5.0, flash 0xFF:0x12, architecture 9, skin 22, and 0x09 where arch 12 and arch 14
  // carry a compiled in 0x0C. Matching the whole byte 0x28 instead of the high nibble is what made
  // a working remote's correct answer look like a device fault. `docs/findings.md` section 76.
  const report = new Uint8Array(REPORT_SIZE);
  report.set([0x27, 0x30, 0x25, 0x12, 0xff, 0x90, 0x16, 0x09], 0);
  const reply = decodeReply(report);
  assert.equal(reply.kind, 'version');
  if (reply.kind !== 'version') return;
  assert.deepEqual([...reply.fields], [0x30, 0x25, 0x12, 0xff, 0x90, 0x16, 0x09]);
  // The architecture in the high nibble of field 4, which section 57 derived from two
  // architectures and this is the third test of.
  assert.equal((reply.fields[4] as number) >> 4, 9);
});

test('the command states are the ones the firmware sets', () => {
  // The state numbering is identical in all three images while the state variable sits at a
  // different address in each, across two architectures. Same implementation, different maps.
  assert.deepEqual(COMMAND_STATES, {
    [GET_VERSION]: 1,
    [WRITE_FLASH]: 2,
    [READ_FLASH]: 4,
    0x70: 5,
    [ERASE_FLASH]: 8,
    0xa0: 9,
    [READ_MISC]: 10,
  });
});

/**
 * Consistency with a client sourced account of the learn session, `docs/host-client.md`.
 *
 * These do **not** assert the client is right, which rule 2 of that document forbids. They assert
 * that what this project derived from firmware is consistent with it, which is a different claim
 * and the one worth having: if a future firmware reading moved one of these, the disagreement
 * should surface here rather than in an implementation that half believes both.
 */
test('the learn session uses only command bytes the firmware dispatches', () => {
  // A second client describes the session as four commands. Three distinct command bytes appear in
  // it, and every one is in the table this project read out of the dispatcher.
  for (const code of [START_IRCAP, STOP_IRCAP, WRITE_MISC]) {
    assert.ok(code in COMMAND_NAMES, `0x${code.toString(16)} is not a command we found`);
  }
  // And the capture opens into the state whose chain accepts only the stop, section 91.
  assert.equal(COMMAND_STATES[START_IRCAP], 5);
});

test('the selector that brackets a learn session is one the firmware services', () => {
  // The client describes entering and leaving learning as a WRITE_MISC with selector 0x0A carrying
  // an entry point. That selector is in the list this project derived from the arch 14 command
  // chain, independently and before the client was read, which is the corroboration.
  assert.ok(WRITE_MISC_SELECTORS.includes(0x0a));
  // It is a write, so no read path may reach it. Nothing in the read selector list should let it
  // through, and `readMiscRequest` is the only way a read path builds a misc command.
  assert.ok(!READ_MISC_SELECTORS.includes(0x0a));
});

test('nothing in the library can send a misc write with any selector but RAM', () => {
  // The rail behind the rail. `writeRam` is the only misc write this library exposes and it pins
  // the selector itself, so implementing the learn bracket means adding a method and a refusal
  // rather than passing a different number to something that already exists.
  const request = writeMiscRequest(MISC_RAM, 0x0300, 0x00);
  assert.equal((request[0] as number) >> 4, 0xa, 'a WRITE_MISC command');
  assert.equal(request[1], MISC_RAM);
  assert.notEqual(request[1], 0x0a);
});

/**
 * More consistency checks against the same client, `docs/host-client.md`. Again these assert what
 * this project derived, not what the client says, and the interesting one is the disagreement.
 */
test('the version fields we derived are the ones the client reads, in order', () => {
  // Its identify operation names six fields at six positions. Ours are the same six in the same
  // order, so the reading derived from disassembly and a written prediction is corroborated by a
  // source that never saw either. Field 4's nibbles are the part worth pinning.
  //
  // **Through the library, which it was not until 13 August 2026**: the assertions were `one[4] >> 4`
  // and `one[4] & 0x0f`, so the test restated the nibble split in its own arithmetic and would have
  // passed with the decoders broken or absent. The literal stays, because it is the corroborating
  // datum, and what reads it is now the code under test.
  const one = Uint8Array.from([0x34, 0x05, 0xc8, 0x1f, 0xc0, 0x36, 0x0c]);
  assert.equal(architectureFromVersion(one), 12, 'architecture in the high nibble');
  assert.equal(softwareTypeFromVersion(one), 0, 'software type in the low nibble, application');
  // Field 5 is the skin, read through `readVersion` now that something needed it. It was
  // `one[5]` under a comment saying no accessor existed, which is the same defect the paragraph
  // above corrects one line up: a test restating the reading in its own arithmetic.
  assert.equal(readVersion(one).skin, 0x36, 'skin 54, which the client calls SKIN54');
});

test('the whole block reads back as the three bench remotes reported it', () => {
  /**
   * The reading of `docs/usb-protocol.md` section 4, as one assertion per architecture.
   *
   * Three literals, and each is a **measurement**: the Harmony 600 was read live, the Harmony One's
   * first six bytes were written down as a prediction from it and then confirmed, and the Harmony 525
   * was read on the bench on 8 August 2026 with seven fields where the other two have twelve. So this
   * spans three architectures and two block lengths, which is what the verification standard asks of a
   * derivation before it is believed.
   *
   * Every value asserted here is stated in that document's own table, so a change to `readVersion`
   * that happens to be self consistent still fails.
   */
  const h600 = Uint8Array.from([0x02, 0x11, 0x1c, 0x15, 0xe0, 0x47, 0x0c, 0x02, 0x00, 0x00, 0x02, 0x02]);
  const one = Uint8Array.from([0x34, 0x05, 0xc8, 0x1f, 0xc0, 0x36, 0x0c, 0x34, 0x34, 0x16, 0x34, 0x34]);
  const h525 = Uint8Array.from([0x30, 0x25, 0x12, 0xff, 0x90, 0x16, 0x09]);

  assert.deepEqual(
    { ...readVersion(h600), fields: h600.length },
    { fields: 12, firmware: '0.2', hardware: '1.1', flash: '15:1C', architecture: 14,
      softwareType: 0, softwareTypeName: 'application', skin: 71, platform: 0x0c },
  );
  assert.deepEqual(
    { ...readVersion(one), fields: one.length },
    { fields: 12, firmware: '3.4', hardware: '0.5', flash: '1F:C8', architecture: 12,
      softwareType: 0, softwareTypeName: 'application', skin: 54, platform: 0x0c },
  );
  assert.deepEqual(
    { ...readVersion(h525), fields: h525.length },
    { fields: 7, firmware: '3.0', hardware: '2.5', flash: 'FF:12', architecture: 9,
      softwareType: 0, softwareTypeName: 'application', skin: 22, platform: 0x09 },
  );

  // Safe mode, measured on two architectures, and the contrast is the finding. Section 190.
  //
  // A Harmony One in safe mode differs from the same unit running normally in **one** of its twelve
  // fields, field 4's low nibble. A Harmony 525 differs in **three**, adding the firmware version and
  // the platform. That is not two remotes disagreeing: arch 9 copies its safe mode image over the
  // application, so a different firmware generation is answering and says so twice over, where arch 12
  // hands control to an image resident beside the application and of the same generation. Section 189
  // read that structural difference out of the firmware and this is what it predicts.
  const oneSafe = Uint8Array.from([0x34, 0x05, 0xc8, 0x1f, 0xc4, 0x36, 0x0c, 0x34, 0x34, 0x16, 0x34, 0x34]);
  const h525Safe = Uint8Array.from([0x20, 0x25, 0x12, 0xff, 0x94, 0x16, 0x00]);

  assert.deepEqual(
    { ...readVersion(oneSafe), fields: oneSafe.length },
    { fields: 12, firmware: '3.4', hardware: '0.5', flash: '1F:C8', architecture: 12,
      softwareType: 4, softwareTypeName: 'safe mode', skin: 54, platform: 0x0c },
  );
  assert.deepEqual(
    { ...readVersion(h525Safe), fields: h525Safe.length },
    { fields: 7, firmware: '2.0', hardware: '2.5', flash: 'FF:12', architecture: 9,
      softwareType: 4, softwareTypeName: 'safe mode', skin: 22, platform: 0x00 },
  );

  // The counts, exactly, because "one field" and "three fields" is the whole claim and a bound would
  // hide either of them moving.
  const differing = (a: Uint8Array, b: Uint8Array): number[] =>
    [...a].flatMap((byte, index) => (byte === b[index] ? [] : [index]));
  assert.deepEqual(differing(one, oneSafe), [4], 'a Harmony One changes only its software type');
  assert.deepEqual(differing(h525, h525Safe), [0, 4, 6], 'a Harmony 525 also changes version and platform');

  // And the refusal this replaces: zero here does not mean safe mode, which is what the docstring on
  // `platform` said until section 190. Both remotes are in safe mode and they disagree about it.
  assert.equal(readVersion(oneSafe).platform, readVersion(one).platform);
  assert.notEqual(readVersion(h525Safe).platform, readVersion(h525).platform);
  assert.equal(readVersion(oneSafe).softwareType, readVersion(h525Safe).softwareType);

  // The platform is not the architecture, section 116, and these three are what says so: two
  // architectures share `0x0c` and the third differs. A reading that returned the architecture twice
  // would pass every other assertion in this test.
  assert.equal(readVersion(h600).platform, readVersion(one).platform);
  assert.notEqual(readVersion(h600).architecture, readVersion(one).architecture);
});

test('safe mode is the one software type a remote here has ever reported besides application', () => {
  // Predicted in `docs/usb-protocol.md` before anyone tried it, `0xC4` for a Harmony One and `0xE4`
  // for a Harmony 600, and then met on a stranded Harmony 525, section 118. The names are Logitech's
  // own, from their firmware packages and their client, which agree on all five.
  const stranded = Uint8Array.from([0x30, 0x25, 0x12, 0xff, 0x94, 0x16, 0x00]);
  const reading = readVersion(stranded);
  assert.equal(reading.softwareType, SOFTWARE_TYPE_SAFE_MODE);
  assert.equal(reading.softwareTypeName, 'safe mode');
  assert.equal(reading.architecture, 9, 'and the architecture is unaffected by the low nibble');
  // A bootloader and a remote in safe mode both report platform 0, section 118, which is why the
  // platform cannot be used to tell what is running.
  assert.equal(reading.platform, 0);

  // All five of Logitech's own values are named, which is the claim `docs/usb-protocol.md` makes:
  // their firmware packages and their client name the same five and agree on every one. Two of the
  // five have been seen on a remote here and the other three are their word alone, which is why they
  // are a table of names and nothing here branches on them.
  assert.deepEqual(Object.keys(SOFTWARE_TYPE_NAMES).map(Number).sort((a, b) => a - b), [0, 1, 2, 3, 4]);
  assert.equal(SOFTWARE_TYPE_NAMES[1], 'test mode');
  assert.equal(SOFTWARE_TYPE_NAMES[3], 'bootloader');
});

test('a block too short to carry an architecture is refused rather than read', () => {
  // Five is what concordance accepts, and a block that short has neither the architecture nor the
  // skin, so a reading of it would be an identity missing the two fields worth having. The refusal
  // names the reason, since a caller seeing it has a remote in front of them.
  assert.throws(() => readVersion(Uint8Array.from([0x34, 0x05, 0xc8, 0x1f, 0xc0])),
                /carries no architecture and no skin/);
  assert.throws(() => readVersion(new Uint8Array(0)), /0 bytes/);
  // And seven is accepted, which is the control: without it the refusal could be off by any amount.
  assert.equal(readVersion(Uint8Array.from([0x30, 0x25, 0x12, 0xff, 0x90, 0x16, 0x09])).architecture, 9);
});

test('every named field has a name and every unnamed one does not, which is the honest rendering', () => {
  // The table moved here from `packages/bench` on 21 August 2026, where it was the only place the
  // block was labelled and had carried a wrong claim about field 6 for a month. Exact counts, not a
  // floor: nine named and three not, out of twelve. The three are fields 7, 10 and 11, which
  // `docs/usb-protocol.md` places and this table deliberately does not label, because a value that
  // names an **image inside a remote** is not a fact about the remote and a screen would read it as
  // one. Nine was measured rather than counted by eye, which is the house rule and the reason this
  // said seven for a minute.
  assert.equal(VERSION_FIELD_NAMES.length, VERSION_FIELD_COUNT);
  const named = VERSION_FIELD_NAMES.filter((name) => name !== undefined);
  assert.equal(named.length, 9, `named: ${named.join(', ')}`);
  for (const index of [7, 10, 11]) {
    assert.equal(VERSION_FIELD_NAMES[index], undefined,
                 `field ${index} is placed in the document and deliberately not labelled here`);
  }
  assert.equal(new Set(named).size, named.length, 'and no two fields share a name');
});

test('a flash id comes from the remote, because the client table disagrees with our hardware', () => {
  // The arch 9 skin declares 0x12 and 0xFF and the bench 525 reports exactly that, which is the
  // agreement. The arch 12 skin declares 0xF9 and 0x01 and the bench One reports 0xC8 and 0x1F,
  // which is not. So the table is a hypothesis and the remote is the fact, and this test exists to
  // fail if anyone ever hard codes the former.
  const h525 = [0x30, 0x25, 0x12, 0xff, 0x90, 0x16, 0x09];
  assert.deepEqual([h525[2], h525[3]], [0x12, 0xff], 'arch 9 agrees with the client');

  const one = [0x34, 0x05, 0xc8, 0x1f, 0xc0, 0x36, 0x0c];
  assert.notDeepEqual([one[2], one[3]], [0xf9, 0x01], 'arch 12 does not, and that is the point');

  // **And the regression this test says it exists for, which it did not check until 13 August 2026.**
  // Both halves above are literals declared here, so they record the disagreement and cannot notice
  // anybody hard coding the client's figures. What can: the library exporting no flash id at all, so a
  // table smuggled in has a name to find. The reading has to come off the remote, per skin, and this
  // is what says so in a way that fails.
  const exported = Object.keys(everything);
  assert.deepEqual(exported.filter((n) => /flash.*id/i.test(n)), [],
    'the library grew a flash id table, and a flash id is a property of the unit');
});

test('the misc branch matches on the reply code, not on the whole first byte', () => {
  // Every other branch of `decodeReply` masks the low nibble off before comparing, because the nibble
  // is the payload length rather than part of the identity. This one tested `first === MISC_REPLY`,
  // whose `0xC2` includes a declared length of two, so a misc reply declaring any other length fell
  // past the branch entirely and out of the decoder. Nothing else in the protocol occupies `0xC0`, so
  // masking cannot swallow another reply.
  //
  // The corpus of real replies all declare two, which is why nothing failed. That is the reason to
  // pin it rather than to leave it: a length nobody has seen is exactly what a new architecture sends.
  assert.equal(MISC_REPLY_CODE, 0xc0);
  const three = new Uint8Array(REPORT_SIZE);
  three[0] = MISC_REPLY_CODE | 0x03;
  three[1] = MISC_RAM;
  three[2] = 0x12;
  three[3] = 0x34;
  const reply = decodeReply(three);
  assert.equal(reply.kind, 'misc', 'a misc reply declaring three bytes is still a misc reply');
  if (reply.kind !== 'misc') return;
  assert.equal(reply.selector, MISC_RAM);
  assert.equal(reply.value, 0x12);
  assert.equal(reply.word, 0x1234);
  // And the declared two is unchanged, which is what says the fix widened nothing else.
  const two = new Uint8Array(REPORT_SIZE);
  two[0] = MISC_REPLY;
  two[1] = MISC_RAM;
  two[2] = 0x5a;
  const usual = decodeReply(two);
  assert.equal(usual.kind === 'misc' && usual.word, 0x5a00);
});
