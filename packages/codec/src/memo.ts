/**
 * A value read off a container, worked out once and handed back for as long as the container's bytes
 * are the bytes it was worked out from.
 *
 * **Why the bytes are compared and not only the object.** `queue.ts` and `devicemode.ts` key a cache on
 * the container alone, which is right for what they read, but a container is not immutable: several
 * composers write into `blob` in place after reading it (`shared/core.ts`, `shared/modes.ts`, the
 * touch family's menus and lists), so a value cached on the object alone could outlive the bytes it was
 * read from and nothing would say so. Here each entry keeps a copy of the blob and is used only while
 * the blob still equals it, which is a `memcmp` of a megabyte, tens of microseconds, against a reader
 * costing ten milliseconds and more. Any other field a reader uses (`flashBase`, `sections`) is set
 * once at parse and is `readonly`.
 *
 * **What it is for.** Test files and composers ask the same container the same question many times:
 * `touchDrawsName` asks for the character map once per screen item and name it compares, and a test of
 * the Harmony One's activity keys spent half its three minutes resolving the same alphabet again.
 * Measured on 23 October 2026. The value is the same object each time, so a reader whose result
 * callers could mutate must not be cached through this, or must hand back a copy.
 *
 * The table is the caller's, one per reader, so that two readers never share an entry by accident.
 */
import type { Container } from './gspm.ts';

/** One reader's cache: the bytes the value was read from, and the value. */
export type BytesMemo<T> = WeakMap<Container, { bytes: Uint8Array; value: T }>;

/** Whether two byte arrays hold the same bytes, through `Buffer.equals`, which compares in native code. */
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && Buffer.from(a.buffer, a.byteOffset, a.length).equals(b);
}

/** `read(c)`, or the value it gave last time for this container when its bytes have not changed since. */
export function memoOverBytes<T>(table: BytesMemo<T>, c: Container, read: (c: Container) => T): T {
  const kept = table.get(c);
  if (kept !== undefined && sameBytes(kept.bytes, c.blob)) return kept.value;
  const value = read(c);
  table.set(c, { bytes: c.blob.slice(), value });
  return value;
}
