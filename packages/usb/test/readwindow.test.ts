/**
 * The one window retry, `src/readwindow.ts`, against a fake reader, so it runs with no lab and no remote.
 *
 * `readConfig`'s own two retry tests in `packages/corpus/test/read.test.ts` need a configuration from
 * the lab and skip without one, so the loop the three readers share since `todo-compile-885.md` 1.10 had
 * nothing exercising it on a machine without the lab. These pin the loop itself: a window that fails
 * once comes back whole with the retry counted and reported, and a window that fails once more than the
 * budget fails the read with the transport's own error, after exactly `MAX_WINDOW_RETRIES + 1` attempts.
 * What the bound is for, and why a retry is safe at all, is section 223 and the module's docstring.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  MAX_WINDOW_RETRIES,
  readFlashWindow,
  type FlashWindowReader,
  type WindowRetry,
} from '../src/readwindow.ts';

/** The error a lost chunk produces in `readFlash`, word for word, so the test reads like the failure. */
const LOST_CHUNK = 'flash chunk out of sequence: expected 0xbf, got 0x14 after 13764 bytes';

/**
 * A reader whose window at `failAt` throws the first `failures` times it is asked for and then answers,
 * and which serves every address as its low byte so a wrong address would show in the bytes. Every
 * request is recorded, including the ones that threw, because the attempts that failed are what is being
 * counted.
 */
function flakyReader(failAt: number, failures: number) {
  const asked: Array<{ address: number; count: number }> = [];
  let left = failures;
  const reader: FlashWindowReader = {
    async readFlash(address, count) {
      asked.push({ address, count });
      if (address === failAt && left > 0) {
        left -= 1;
        throw new Error(LOST_CHUNK);
      }
      return Uint8Array.from({ length: count }, (_, i) => (address + i) & 0xff);
    },
  };
  return { reader, asked };
}

test('a window that answers first time is read once and reports no retry', async () => {
  const { reader, asked } = flakyReader(0x020000, 0);
  const told: WindowRetry[] = [];
  const got = await readFlashWindow(reader, 0x020000, 0x40, (r) => told.push(r));
  assert.equal(got.retries, 0);
  assert.deepEqual(told, []);
  assert.deepEqual(asked, [{ address: 0x020000, count: 0x40 }]);
});

test('a window that fails once is asked for again, the same request, and comes back whole', async () => {
  const failAt = 0x024000;
  const { reader, asked } = flakyReader(failAt, 1);
  const told: WindowRetry[] = [];
  const got = await readFlashWindow(reader, failAt, 0x4000, (r) => told.push(r));
  // The bytes are those of the window asked for: a retried window is not a degraded one.
  assert.deepEqual(got.bytes, Uint8Array.from({ length: 0x4000 }, (_, i) => (failAt + i) & 0xff));
  assert.equal(got.retries, 1, 'and the read says it needed one, rather than hiding it');
  assert.equal(told.length, 1, 'the caller was told at the moment it happened');
  assert.equal(told[0]?.at, failAt, 'where the window starts, as it was sent');
  assert.equal(told[0]?.attempt, 1);
  assert.match(String((told[0]?.error as Error).message), /out of sequence/, 'with the real reason');
  // The retry is the same address and the same count. That is what keeps a caller's chosen window shape,
  // which on the Harmony 880 and 885 is what keeps a read from ending alone on 0x000104 or 0x000105.
  assert.deepEqual(asked, [{ address: failAt, count: 0x4000 }, { address: failAt, count: 0x4000 }]);
});

test('a window that fails as often as the budget allows still comes back on the last attempt', async () => {
  const failAt = 0x028000;
  const { reader, asked } = flakyReader(failAt, MAX_WINDOW_RETRIES);
  const told: number[] = [];
  const got = await readFlashWindow(reader, failAt, 0x100, ({ attempt }) => told.push(attempt));
  assert.equal(got.retries, MAX_WINDOW_RETRIES);
  assert.deepEqual(told, Array.from({ length: MAX_WINDOW_RETRIES }, (_, i) => i + 1));
  assert.equal(asked.length, MAX_WINDOW_RETRIES + 1);
});

test('a window that fails once more than the budget fails the read with the transport\'s own error',
  async () => {
    const failAt = 0x02c000;
    // One more failure than the budget allows, so the last attempt is the one that gives up.
    const { reader, asked } = flakyReader(failAt, MAX_WINDOW_RETRIES + 1);
    const told: number[] = [];
    await assert.rejects(
      () => readFlashWindow(reader, failAt, 0x100, ({ attempt }) => told.push(attempt)),
      (error: unknown) => error instanceof Error && error.message === LOST_CHUNK,
      'and the error is the transport failure, not a wrapper that loses what went wrong');
    assert.equal(asked.length, MAX_WINDOW_RETRIES + 1,
      'the budget is attempts in total, not retries after an unlimited first go');
    assert.deepEqual(told, Array.from({ length: MAX_WINDOW_RETRIES }, (_, i) => i + 1),
      'every retry was reported, and the final failure is thrown rather than reported as one');
  });

test('the budget is two retries, the figure section 223 argues', () => {
  // Pinned as a number so that changing it is a decision somebody sees in a test, not a constant edit.
  assert.equal(MAX_WINDOW_RETRIES, 2);
});

test('the module imports nothing, so @harmony/corpus/read can use it without the transport', () => {
  // The reason it is a module of its own. `readConfig` is consumed on its own as `@harmony/corpus/read`,
  // and an import here, of the barrel above all, would bring the HID transport along behind it.
  const source = readFileSync(new URL('../src/readwindow.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^\s*import\s/m);
});
