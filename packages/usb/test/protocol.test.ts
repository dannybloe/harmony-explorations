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

import {
  COMMAND_STATES,
  ERASE_FLASH,
  GET_VERSION,
  MAX_PAYLOAD,
  MISC_RAM,
  ProtocolError,
  READ_FLASH,
  READ_MISC,
  REPORT_SIZE,
  WRITE_FLASH,
  decodeReply,
  encodeRequest,
  eraseFlashRequest,
  getVersionRequest,
  nibbleForPayloadLength,
  payloadLengthForNibble,
  readFlashRequest,
  readMiscRequest,
  readRamRequest,
  regionOf,
  FLASH_TOP_BYTE_BOUND,
  validateRegionByte,
  writeFlashRequest,
} from '../src/index.ts';

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
  assert.deepEqual(reply, { kind: 'misc', selector: 0x07, value: 0x5a });
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
