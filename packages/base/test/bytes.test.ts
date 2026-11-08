/**
 * The one byte comparison, `src/bytes.ts`, `todo.md` 7.3.7.
 *
 * **It took the place of eight private copies, four of them on a rail**: the transport's guard comparing a report
 * with the one authorised, the file family's guard doing the same, the unit check comparing two identity blocks, and
 * the file write deciding what the remote holds. Each copy was `a.length === b.length` and then every byte equal, so
 * what is held here is that this one answers exactly that, case by case and then over many arrays against that
 * reference: a difference anywhere, at the start, inside a whole word, in the tail past the last word; a length
 * difference, a prefix included; empty against empty and against a byte; and views that do not start on a four byte
 * boundary, which this one copies before comparing words and the copies never had to.
 *
 * `packages/usb/src/blockwrite.ts`'s `firstDifference`, the write's read back compare, is not one of the copies and
 * was not moved: it answers where two blocks differ and refuses two of different lengths, which this cannot.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sameBytes } from '../src/bytes.ts';

/** What every replaced copy computed. */
const reference = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((x, k) => x === b[k]);

test('equal bytes are the same, and so are two empty arrays', () => {
  assert.equal(sameBytes(new Uint8Array([1, 2, 3, 4, 5, 6, 7]), new Uint8Array([1, 2, 3, 4, 5, 6, 7])), true);
  assert.equal(sameBytes(new Uint8Array(0), new Uint8Array(0)), true);
  assert.equal(sameBytes(new Uint8Array(0), new Uint8Array(1)), false, 'empty against a byte');
  assert.equal(sameBytes(new Uint8Array(1), new Uint8Array(0)), false, 'and the other way round');
});

test('one byte different anywhere is a difference: in a whole word or in the tail', () => {
  const base = Uint8Array.from({ length: 11 }, (_, k) => k + 1);
  for (let at = 0; at < base.length; at += 1) {
    const other = base.slice();
    other[at] = (other[at]! + 1) & 0xff;
    assert.equal(sameBytes(base, other), false, `byte ${at}`);
    assert.equal(sameBytes(other, base), false, `byte ${at}, the other way round`);
  }
});

test('a different length is a difference, a prefix included', () => {
  const long = new Uint8Array([9, 8, 7, 6, 5]);
  assert.equal(sameBytes(long, long.subarray(0, 4)), false);
  assert.equal(sameBytes(long.subarray(0, 4), long), false);
  // Zeros past the end are not the same as nothing past the end.
  assert.equal(sameBytes(new Uint8Array([1, 0]), new Uint8Array([1])), false);
});

test('views off a four byte boundary compare by their own bytes', () => {
  const buffer = Uint8Array.from({ length: 64 }, (_, k) => (k * 37) & 0xff);
  for (let left = 0; left < 4; left += 1) {
    for (let right = 0; right < 4; right += 1) {
      const a = buffer.subarray(left, left + 21);
      const b = new Uint8Array(new ArrayBuffer(32), right, 21);
      b.set(a);
      assert.equal(sameBytes(a, b), true, `offsets ${left} and ${right}`);
      b[20] = b[20]! ^ 1;
      assert.equal(sameBytes(a, b), false, `offsets ${left} and ${right}, the last byte`);
      b[20] = b[20]! ^ 1;
      b[5] = b[5]! ^ 0x80;
      assert.equal(sameBytes(a, b), false, `offsets ${left} and ${right}, inside a word`);
    }
  }
  // Two views of one buffer, unaligned, that hold the same run.
  const run = new Uint8Array([0, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
  assert.equal(sameBytes(run.subarray(1, 5), run.subarray(5, 9)), true);
});

test('it answers what every replaced copy answered, over many arrays', () => {
  // A small alphabet, so equal arrays and near misses both come up often; lengths across several words and tails.
  let seed = 7;
  const next = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed;
  };
  const pool = new Uint8Array(4096);
  let agreed = 0;
  let same = 0;
  for (let round = 0; round < 4000; round += 1) {
    const length = next() % 19;
    const a = new Uint8Array(pool.buffer, next() % 64, length);
    for (let k = 0; k < length; k += 1) a[k] = next() % 3;
    const b = new Uint8Array(pool.buffer, 2048 + (next() % 64), next() % 4 === 0 ? Math.max(0, length + (next() % 3) - 1) : length);
    for (let k = 0; k < b.length; k += 1) b[k] = next() % 5 === 0 ? next() % 3 : (a[k] ?? 0);
    assert.equal(sameBytes(a, b), reference(a, b), `round ${round}`);
    agreed += 1;
    if (reference(a, b)) same += 1;
  }
  assert.equal(agreed, 4000);
  // The population has both answers in it, so agreeing is not agreeing on false alone.
  assert.equal(same, 539, 'the same in 539 of 4000');
});
