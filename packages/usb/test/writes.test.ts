/**
 * The write packets, built and checked with no device present.
 *
 * Section 175 derived what a flash write looks like on the wire. This file is that derivation in
 * executable form, which is the point of the house rule that a confirmed fact lands as code: the
 * finding says a transfer is an announce, a run of data packets nobody answers, and a done that is
 * acknowledged once, and here that sentence has to hold byte for byte.
 *
 * **Building a packet is not permission to send it.** These tests run with writes disabled, the
 * shipped state, and none of them touches a transport. `rails.test.ts` owns the refusals.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ACK, WRITE_FLASH, WRITE_FLASH_DATA, MAX_PAYLOAD, payloadLengthForNibble }
  from '../src/protocol.ts';
import { doneRequest, writeChunkLengths, writeFlashDataRequest, writeFlashRequests }
  from '../src/writes.ts';

test('a transfer is an announce, its data packets, and one done', () => {
  const data = Uint8Array.from({ length: 130 }, (_, i) => i & 0xff);
  const requests = writeFlashRequests(0x040000, data);

  // The announce carries the address and the count, and its length nibble says five bytes.
  assert.equal(requests[0]![0], WRITE_FLASH | 0x05, 'the announce is 0x35');
  assert.deepEqual([...requests[0]!.subarray(1, 6)], [0x04, 0x00, 0x00, 0x00, 0x82],
    'the address and the count, each most significant byte first');
  // Which is the order the firmware's own parser reads them in: on the Harmony One it stores the
  // first byte in the address high byte and the fourth in the count high byte, section 175.

  // The done names what it is done with, which is the command being finished.
  const done = requests[requests.length - 1]!;
  assert.equal(done[0], ACK | 0x01, 'the done is 0xF1');
  assert.equal(done[1], WRITE_FLASH);

  // Everything between is data, and the payloads reassemble into exactly the input.
  const middle = requests.slice(1, -1);
  const rebuilt: number[] = [];
  for (const packet of middle) {
    assert.equal(packet[0]! & 0xf0, WRITE_FLASH_DATA, 'a data packet is 0x40 plus a length');
    rebuilt.push(...packet.subarray(1, 1 + payloadLengthForNibble(packet[0]! & 0x0f)));
  }
  assert.deepEqual(rebuilt, [...data], 'the packets carry the data once, in order');
});

test('every packet is a full report, because that is what the device is written', () => {
  // Not cosmetic: hid_write sends what it is given, so a short buffer is a short report.
  for (const request of writeFlashRequests(0x040000, new Uint8Array(200))) {
    assert.equal(request.length, 64);
  }
});

test('a chunk length is one the nibble can state exactly, for every total', () => {
  /**
   * The constraint that bounds chunking more than the report size does. The nibble encodes 0 to 7,
   * 15, 31 and 63 and nothing else, and the firmware reads the nibble as the number of bytes
   * present, so 63 and 8 is not a legal way to send 71 bytes.
   *
   * Asserted over a range rather than a few cases because the claim is about greedy never
   * stranding a remainder, and a handful of totals cannot say that. 71 is in here, and so is every
   * total whose remainder after the big steps lands between 8 and 14, which is where a scheme
   * without the small nibbles would fail.
   */
  const encodable = new Set([0, 1, 2, 3, 4, 5, 6, 7, 15, 31, 63]);
  for (let total = 1; total <= 4096; total += 1) {
    const lengths = writeChunkLengths(total);
    assert.equal(lengths.reduce((a, b) => a + b, 0), total, `total ${total}`);
    for (const length of lengths) {
      assert.ok(encodable.has(length), `total ${total} produced an unencodable ${length}`);
      assert.ok(length > 0, `total ${total} produced an empty packet`);
    }
  }
});

test('a 64 KiB block is 1042 packets, and the shape of the tail is stated', () => {
  // The rehearsal's own case, so the number is here rather than being recomputed in a script: one
  // erase block of a Harmony One's config region. 1040 full packets then 15 then 1, because 65536
  // is 63 * 1040 + 16 and 16 is not encodable in one packet.
  const lengths = writeChunkLengths(0x10000);
  assert.equal(lengths.length, 1042);
  assert.equal(lengths.filter((n) => n === MAX_PAYLOAD).length, 1040);
  assert.deepEqual(lengths.slice(-2), [15, 1]);
});

test('the builders refuse what the protocol cannot say', () => {
  assert.throws(() => writeChunkLengths(0), /not a write/);
  assert.throws(() => writeChunkLengths(-1), /not a write/);
  assert.throws(() => doneRequest(0x100), /not a byte/);
  // A data packet whose length no nibble states is refused rather than padded, which is the same
  // rule as the chunker's and is enforced by the encoder underneath it.
  assert.throws(() => writeFlashDataRequest(new Uint8Array(8)), /no length nibble encodes 8/);
  assert.throws(() => writeFlashDataRequest(new Uint8Array(64)), /exceeds 63/);
});

test('the barrel still exposes no way to build a write', async () => {
  // The rail in `writes.ts`'s docstring, restated here because this file is the reason to check it
  // again: adding four exported builders to that module is exactly the change that would tempt
  // somebody to re-export it for convenience.
  const barrel = await import('../src/index.ts');
  for (const name of ['writeFlashRequests', 'writeFlashDataRequest', 'doneRequest',
                      'writeChunkLengths', 'writeFlashRequest', 'eraseFlashRequest']) {
    assert.equal(name in barrel, false, `${name} is reachable from the barrel`);
  }
});
