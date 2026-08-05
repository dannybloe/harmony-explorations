/**
 * The reads everything else is built on, and the two traps that made this a module.
 *
 * Both are JavaScript specific, which is exactly why they are pinned: the Python parser this was
 * ported from cannot have either bug, so no existing test would have caught them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { bytes } from '../src/index.ts';

test('a 32 bit read with the top bit set is positive', () => {
  // `<< 24` in JavaScript produces a signed 32-bit result, so the obvious assembly of four bytes
  // returns a negative number for any value at or above 0x80000000. Every address arithmetic in
  // the container parser would then be wrong by 2^32, and the failure looks like a wild pointer
  // rather than like an arithmetic bug.
  const data = new Uint8Array([0x00, 0x00, 0x00, 0x80]);
  assert.equal(bytes.u32(data, 0), 0x80000000);
  assert.ok(bytes.u32(data, 0) > 0);
  assert.equal(bytes.u32(new Uint8Array([0xff, 0xff, 0xff, 0xff]), 0), 0xffffffff);
});

test('a read past the end throws rather than returning undefined', () => {
  // Python's struct raises here, and the parser leans on that. JavaScript hands back undefined,
  // which becomes NaN in arithmetic and a plausible looking wrong answer three functions later.
  const data = new Uint8Array([1, 2, 3]);
  assert.throws(() => bytes.u32(data, 0), bytes.BytesError);
  assert.throws(() => bytes.u8(data, 3), bytes.BytesError);
  assert.throws(() => bytes.u16(data, 2), bytes.BytesError);
  assert.equal(bytes.u24(data, 0), 0x030201);
});

test('the error says where it went wrong', () => {
  // An offset in the message is the difference between a five minute fix and an afternoon.
  assert.throws(() => bytes.u8(new Uint8Array(4), 9), /offset 9 .* 4 byte buffer/);
});

test('three byte reads are little endian, like the pointer arrays they are for', () => {
  assert.equal(bytes.u24(new Uint8Array([0x00, 0x00, 0x03]), 0), 0x030000);
  assert.equal(bytes.uint(new Uint8Array([0x34, 0x12]), 0, 2), 0x1234);
});

test('matchesAt reports false off the end instead of throwing', () => {
  // The frame validator asks whether a terminator sits at an offset derived from a length field
  // that may be garbage, so "no" is the right answer for an offset outside the buffer.
  const data = bytes.bytesOf('GSPM');
  assert.ok(bytes.matchesAt(data, 0, bytes.bytesOf('GSPM')));
  assert.ok(!bytes.matchesAt(data, 2, bytes.bytesOf('GSPM')));
  assert.ok(!bytes.matchesAt(data, -1, bytes.bytesOf('G')));
});

test('indexOf finds a cookie at an offset, and reports absence as -1', () => {
  const data = bytes.bytesOf('..GSPM..PTYY');
  assert.equal(bytes.indexOf(data, bytes.bytesOf('GSPM')), 2);
  assert.equal(bytes.indexOf(data, bytes.bytesOf('PTYY')), 8);
  assert.equal(bytes.indexOf(data, bytes.bytesOf('PTYY'), 9), -1);
  assert.equal(bytes.indexOf(data, bytes.bytesOf('AHCM')), -1);
});
