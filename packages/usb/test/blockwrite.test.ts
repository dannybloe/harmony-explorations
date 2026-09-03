/**
 * How a block write is split into transfers, which had no test at all until 3 September 2026.
 *
 * That absence is the reason this file exists rather than the transfers being interesting. The
 * transfer size decides how a write reaches the wire, it was changed from 32768 bytes to 3150 that
 * afternoon, and **not one assertion in the workspace moved**: nothing named `transfersFor`,
 * `MAX_TRANSFER` or `reportCount`. A write path whose burst length can be changed tenfold without a
 * test noticing is a write path with no test on the part that touches hardware hardest.
 *
 * `blockwrite.ts` is reached through the `@harmony/usb/write` subpath rather than the barrel, so a
 * third write caller is visible in a diff. Importing it here is a test reading the module it tests
 * and adds no caller.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MAX_TRANSFER, reportCount, transfersFor } from '../src/blockwrite.ts';
import { writeChunkLengths, writeFlashRequests } from '../src/writes.ts';
import { MAX_PAYLOAD } from '../src/protocol.ts';

const BLOCK = 0x10000;
const AT = 0x040000;

test('a transfer is fifty packets, which is what both working implementations send', () => {
  // Logitech's own client sends fifty whole packets per announce, section 213, and concordance caps
  // a chunk at 3150 for this protocol, `max_chunk_len` in its own `CRemote::WriteFlash`. Two
  // implementations sharing no code and written years apart agree on the byte. Asserted as the
  // product rather than as the literal, so the reason survives in the failure message.
  assert.equal(MAX_PAYLOAD, 63);
  assert.equal(MAX_TRANSFER, 50 * MAX_PAYLOAD);
  assert.equal(MAX_TRANSFER, 3150);
  // And the negative that carries the change: the announce's own 16 bit count permits far more, so
  // the limit is not what produced this number and a future edit reasoning from the limit is wrong.
  assert.ok(MAX_TRANSFER < 0xffff, 'the protocol would allow twenty times this');
});

test('the transfers tile the block exactly, with no gap and no overlap', () => {
  const plan = transfersFor(AT, BLOCK);
  let expected = AT;
  for (const transfer of plan) {
    assert.equal(transfer.address, expected, 'each transfer starts where the last ended');
    assert.ok(transfer.length > 0 && transfer.length <= MAX_TRANSFER,
      `a transfer of ${transfer.length} bytes`);
    expected += transfer.length;
  }
  assert.equal(expected, AT + BLOCK, 'and the last one ends at the block boundary');
  assert.equal(plan.reduce((n, t) => n + t.length, 0), BLOCK);
});

test('a 64 KiB block is twenty one transfers and the last one is short', () => {
  // Stated exactly rather than as a bound, because the count is what a dry run quotes at the
  // operator before a commit and a bound would let it drift.
  const plan = transfersFor(AT, BLOCK);
  assert.equal(plan.length, 21);
  assert.equal(plan.slice(0, 20).every((t) => t.length === MAX_TRANSFER), true);
  assert.equal(plan[20]!.length, BLOCK - 20 * MAX_TRANSFER);
  assert.equal(plan[20]!.length, 2536);
});

test('the quoted report count is what the request builder actually builds', () => {
  // The closure, and the reason this test is worth more than the three above: `reportCount` states
  // the cost with its own arithmetic, packets plus two, and `writeFlashRequests` builds the packets.
  // Two modules deriving the same number is the state this repository's oldest rule is about, so
  // they are compared rather than each checked against a formula written here a third time.
  const plan = transfersFor(AT, BLOCK);
  const built = plan.reduce(
    (n, t) => n + writeFlashRequests(t.address, new Uint8Array(t.length)).length, 0);
  assert.equal(reportCount(plan), built);
  // And what those two are, so a change to both at once still fails: an announce, the data packets,
  // and a done.
  assert.equal(writeFlashRequests(AT, new Uint8Array(MAX_TRANSFER)).length, 50 + 2);
  assert.equal(writeChunkLengths(MAX_TRANSFER).length, 50);
});

test('a block of any size is covered, including one that is not a multiple of a transfer', () => {
  for (const size of [1, 63, 64, MAX_TRANSFER, MAX_TRANSFER + 1, 0x10000, 0x10001]) {
    const plan = transfersFor(AT, size);
    assert.equal(plan.reduce((n, t) => n + t.length, 0), size, `a block of ${size} bytes`);
    assert.equal(plan[0]!.address, AT);
    assert.ok(plan.every((t) => t.length > 0), 'no empty transfer');
  }
});
