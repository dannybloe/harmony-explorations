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

import { MAX_TRANSFER, reportCount, transfersFor } from '../../src/blockwrite.ts';
import { BlockWriteError, writeBlock, type BlockWrite } from '../../src/write.ts';
import { writeChunkLengths, writeFlashRequests } from '../../src/writes.ts';
import { MAX_PAYLOAD } from '../../src/protocol.ts';

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

/**
 * `writeBlock` against a flash held in memory: the sequence that erases, writes and checks one block, and the
 * `BlockWriteError` a caller catches when the block is not what was asked for.
 *
 * The remote is a stand in with the two methods the sequence calls. The permission is handed through to those methods
 * and to nothing else, so a stand in that ignores it tests exactly the checks `writeBlock` makes itself; the rails a
 * real remote applies to the permission are `rails.test.ts`'s. Each refusal is the faithful flash with one fault, so
 * the faithful run is the control for every one of them.
 */
type Fault = 'erase does not take' | 'erase reaches the next block' | 'a byte does not land' | 'the write runs past the block';

const SMALL = 0x2000;
const AT_SMALL = 2 * SMALL;

function inMemory(fault?: Fault) {
  // Four blocks of a recognisable pattern, so an erase or a stray write anywhere shows.
  const memory = new Uint8Array(4 * SMALL).map((_, i) => (i * 7 + 3) & 0xff);
  const before = Uint8Array.from(memory);
  const calls = { erases: 0, writes: 0, past: [] as boolean[] };
  const remote = {
    async eraseFlash(_permission: unknown, address: number): Promise<void> {
      calls.erases += 1;
      if (fault === 'erase does not take') return;
      memory.fill(0xff, address, address + SMALL);
      if (fault === 'erase reaches the next block') memory[address + SMALL + 5] = 0xff;
    },
    async writeFlash(_permission: unknown, address: number, data: Uint8Array): Promise<void> {
      calls.writes += 1;
      memory.set(data, address);
      if (fault === 'a byte does not land' && calls.writes === 1) memory[address + 9] = 0xff;
      if (fault === 'the write runs past the block' && address + data.length === AT_SMALL + SMALL) memory[address + data.length] = 0;
    },
  };
  const content = new Uint8Array(SMALL).map((_, i) => (i * 13) & 0xff);
  const request = {
    remote: remote as unknown as BlockWrite['remote'],
    permission: {} as unknown as BlockWrite['permission'],
    block: AT_SMALL,
    blockSize: SMALL,
    content,
    neighbours: [AT_SMALL - SMALL, AT_SMALL + SMALL],
    readBlock: async (address: number) => memory.slice(address, address + SMALL),
    log: () => undefined,
    onPastTheErase: (value: boolean) => { calls.past.push(value); },
    coversBlock: () => false,
    sourceName: 'the backup',
  } satisfies BlockWrite;
  return { memory, before, calls, content, request };
}

test('writeBlock writes a block on a faithful flash, leaves both neighbours as they were, and says when it was past the erase', async () => {
  const { memory, before, calls, content, request } = inMemory();
  await writeBlock(request);
  assert.deepEqual(memory.slice(AT_SMALL, AT_SMALL + SMALL), content);
  assert.deepEqual(memory.slice(0, AT_SMALL), before.slice(0, AT_SMALL));
  assert.deepEqual(memory.slice(AT_SMALL + SMALL), before.slice(AT_SMALL + SMALL));
  assert.equal(calls.erases, 1);
  assert.equal(calls.writes, transfersFor(AT_SMALL, SMALL).length);
  assert.deepEqual(calls.past, [true, false]);
});

test('writeBlock refuses with BlockWriteError where the flash did not do what it was told, and stays past the erase', async () => {
  const said: [Fault, RegExp][] = [
    ['erase does not take', /^the erase left 0x[0-9a-f]+ at 0x4000, so it did not take/],
    // The whole message, since its last sentence is what a caller is told about a block it can no longer put back.
    ['erase reaches the next block', new RegExp('^the erase changed 0x6005, which is in the neighbouring block 0x6000 and '
      + 'outside the block it was told to erase\\. So the erase sector on this chip is larger than the 0x2000 bytes this '
      + "project has assumed, which was Logitech's client's word and has never been measured\\. The known good content "
      + 'does not cover that block, so what was there is not recoverable from it, and putting that block back is not '
      + 'built yet: send nothing more to this unit\\.$')],
    ['a byte does not land', /^the read back differs at 0x4009: 0xff on the device, 0x75 intended/],
    ['the write runs past the block', /^the write changed 0x6000, past the end of the range it announced/],
  ];
  for (const [fault, words] of said) {
    const { calls, request } = inMemory(fault);
    await assert.rejects(() => writeBlock(request), (error: unknown) => error instanceof BlockWriteError && words.test(error.message), fault);
    // The block is in an unknown state, and the caller is left told so: past the erase, never back.
    assert.deepEqual(calls.past, [true], fault);
  }
});

test('writeBlock refuses before the erase a block it could not measure the erase around, or content of the wrong size', async () => {
  const lonely = inMemory();
  await assert.rejects(() => writeBlock({ ...lonely.request, neighbours: [] }),
    (error: unknown) => error instanceof BlockWriteError && /^no neighbouring block can be read/.test(error.message));
  const short = inMemory();
  await assert.rejects(() => writeBlock({ ...short.request, content: short.content.subarray(1) }),
    (error: unknown) => error instanceof BlockWriteError && /^content is 8191 bytes and the block is 8192/.test(error.message));
  for (const { calls, memory, before } of [lonely, short]) {
    assert.deepEqual([calls.erases, calls.writes, calls.past], [0, 0, []]);
    assert.deepEqual(memory, before);
  }
});
