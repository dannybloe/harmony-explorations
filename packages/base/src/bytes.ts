/**
 * Whether two byte arrays hold the same bytes, the one copy.
 *
 * Plan 013 step 6. The codec had a `sameBytes` in its own `bytes.ts` first, and eight more
 * private copies stood beside it: the codec's `sequence.ts` and `glyphborrow.ts`, the Harmony 600, 650 and 700
 * family's `pictures.ts` and `assemble.ts`, `packages/usb`'s `transport.ts`, `filepipe.ts` and `filewrite.ts`, and
 * the test kit's fake Harmony Touch, with the same comparison written out inline in a few places more. **It is here
 * and not in the codec because `packages/usb` needs it too**, in the transport's guard, the file family's guard,
 * the unit check and the file write, and `packages/usb` does not depend on the codec; the codec's `bytes.ts`
 * re-exports it under the same name. Nothing here knows a remote: it is a comparison.
 *
 * Every copy it replaced answered the same thing: false where the lengths differ, and otherwise whether the bytes
 * at every index are equal, so two empty arrays are the same. `test/bytes.test.ts` holds each of those.
 *
 * Compared four bytes at a time, so that the codec's `memo.ts` compares a megabyte in a fraction of a millisecond
 * without `Buffer.equals`. An array that does not start on a four byte boundary, as a container's blob inside a
 * larger file may not, is copied first, which is a native copy and costs less than comparing it a byte at a time;
 * the tail past the last whole word is compared byte by byte.
 */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  // `new Uint8Array(view)` copies, where a Node `Buffer`'s own `slice` would hand back a view.
  const left = a.byteOffset % 4 === 0 ? a : new Uint8Array(a);
  const right = b.byteOffset % 4 === 0 ? b : new Uint8Array(b);
  const words = a.length >>> 2;
  const leftWords = new Uint32Array(left.buffer, left.byteOffset, words);
  const rightWords = new Uint32Array(right.buffer, right.byteOffset, words);
  for (let word = 0; word < words; word += 1) if (leftWords[word] !== rightWords[word]) return false;
  for (let at = words << 2; at < a.length; at += 1) if (left[at] !== right[at]) return false;
  return true;
}
