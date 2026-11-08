/**
 * A value read off a container, worked out once and handed back for as long as the container's bytes
 * are the bytes it was worked out from.
 *
 * **Why the bytes are compared and not only the object.** `queue.ts` and `devicemode.ts` key a cache on
 * the container alone, which is right for what they read, but a container is not immutable: several
 * composers write into `blob` in place after reading it (`shared/core.ts`, `shared/modes.ts`, the
 * One family's menus and lists), so a value cached on the object alone could outlive the bytes it was
 * read from and nothing would say so. Here each entry keeps a copy of the blob and is used only while
 * the blob still equals it, which is a comparison of a megabyte four bytes at a time, `sameBytes`, against a
 * reader costing ten milliseconds and more. It was `Buffer.equals` until `todo.md` 7.3.5 took Node out of the core. Any other field a reader uses (`flashBase`, `sections`) is set
 * once at parse and is `readonly`.
 *
 * **What it is for.** Test files and composers ask the same container the same question many times:
 * `oneDrawsName` asks for the character map once per screen item and name it compares, and a test of
 * the Harmony One's activity keys spent half its three minutes resolving the same alphabet again.
 * Measured on 23 October 2026. The value is the same object each time, so a reader whose result
 * callers could mutate must not be cached through this, or must hand back a copy.
 *
 * The table is the caller's, one per reader, so that two readers never share an entry by accident.
 */
import { sameBytes } from './bytes.ts';
import type { Container } from './gspm.ts';

/** One reader's cache: the bytes the value was read from, and the value. */
export type BytesMemo<T> = WeakMap<Container, { bytes: Uint8Array; value: T }>;

/** `read(c)`, or the value it gave last time for this container when its bytes have not changed since. */
export function memoOverBytes<T>(table: BytesMemo<T>, c: Container, read: (c: Container) => T): T {
  const kept = table.get(c);
  if (kept !== undefined && sameBytes(kept.bytes, c.blob)) return kept.value;
  const value = read(c);
  table.set(c, { bytes: c.blob.slice(), value });
  return value;
}
