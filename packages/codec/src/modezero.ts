/**
 * The order a key list is stored in, which is a rule and not ours; mode 0's list on the Harmony 600, 650
 * and 700 is the first it was found on, hence the module's name.
 *
 * **The order is a rule, section 315, and it is not ours.** The firmware does not care about it,
 * since no tag repeats and the first match wins, but a container built from nothing should be byte
 * equal to Logitech's. Every list after the end marker in the corpus is stored in the iteration order
 * of a hash table keyed by the tag: bucket `hash(tag) & (capacity - 1)`, ascending, with
 *
 *     hash(t) = t ^ (t >>> 7) ^ (t >>> 4)
 *
 * and a capacity that starts at 16 and doubles while the count exceeds three quarters of it. That is
 * the supplemental hash and the growth rule of `java.util.HashMap` in Java 6 and 7, whose two further
 * terms, `>>> 20` and `>>> 12`, vanish for a value below 4096, and it holds with no inversion on all 39
 * such lists in the parseable corpus, 12 distinct ones over five architectures, of which six are
 * contained in no other. Other tagged lists are not asserted, and the Harmony 525's safe mode
 * container breaks the rule. That Logitech's compiler is written in Java is an inference from this
 * alone. **What it does not settle is the order of two tags in one bucket**, which on such a table
 * depends on the order they were inserted in and on every resize since, so
 * `keyListOrder` refuses a tie rather than guessing, and `keyListOrderInserted` settles one from an
 * insertion order given.
 *
 * **Scope, decision 16**: the order rule is measured on arch 8, 10, 12, 14 and 16, and serves both
 * families: the four slot one's mode 0 list and firmware screens (Harmony 600, 650 and 700), the touch
 * family's firmware and fixed screens (Harmony One), and the state tables' value maps.
 *
 * **What moved**, `todo-compile-one.md` 3.3.3.2: mode 0's population, the key map over scans 1 to 54 and
 * that scan range itself, `KEYPAD_FIRST_SCAN` and `KEYPAD_LAST_SCAN`, are the four slot family's,
 * `families/four-slot/modezero.ts`, since the Harmony One's keypad is another, `TOUCH_FIRMWARE_KEYPAD`, and
 * that is where a mode 0 list is generated now.
 */

/** The hash table's starting capacity and the share of it that may fill before it doubles. */
const KEY_LIST_INITIAL_CAPACITY = 16;
const KEY_LIST_LOAD_FACTOR = 0.75;

/**
 * The hash a key list's order is bucketed by, see the header. Only the two terms that can be nonzero
 * for a tag are spelled out; a tag is a byte, so `t >>> 20` and `t >>> 12` are always zero.
 */
export function keyListHash(tag: number): number {
  return tag ^ (tag >>> 7) ^ (tag >>> 4);
}

/**
 * How many buckets a key list of `count` entries was laid out in: 16, doubled while the count exceeds
 * three quarters of it. **Pinned only in places**: the arch 16 lists of 11 and 13 entries put the
 * threshold between them, a load factor in [0.6875, 0.8125); the four arch 14 lists fail at half; the
 * 55 to 59 entry lists of arch 8, 10 and 12 fit both 64 and 128 and are pinned from above only. The
 * starting 16 is Java's default, adopted: no list in the corpus is small enough to measure it.
 */
export function keyListCapacity(count: number): number {
  let capacity = KEY_LIST_INITIAL_CAPACITY;
  while (count > KEY_LIST_LOAD_FACTOR * capacity) capacity *= 2;
  return capacity;
}

/** A tag's bucket in a list of `count` entries, which is its place in the stored order. */
export function keyListBucket(tag: number, count: number): number {
  return keyListHash(tag) & (keyListCapacity(count) - 1);
}

/**
 * Tags in the order a key list stores them. Refuses two tags in one bucket, because their order there
 * is the insertion order of a compiler nobody here has read, and an answer this function cannot give
 * is better refused than guessed.
 */
export function keyListOrder(tags: readonly number[]): number[] {
  const buckets = new Map<number, number>();
  for (const tag of tags) {
    if (!Number.isInteger(tag) || tag < 0 || tag > 0xff) throw new RangeError(`tag ${tag} is not a byte`);
    const bucket = keyListBucket(tag, tags.length);
    const other = buckets.get(bucket);
    if (other !== undefined) {
      throw new RangeError(
        `tags 0x${other.toString(16)} and 0x${tag.toString(16)} share bucket ${bucket}, and their order there is not established`);
    }
    buckets.set(bucket, tag);
  }
  return [...tags].sort((a, b) => keyListBucket(a, tags.length) - keyListBucket(b, tags.length));
}

/**
 * Tags in the order a key list stores them, given an order they were inserted in, which settles two tags
 * sharing a bucket: the later one is stored first, the head insertion rule `compilerTagOrder` in
 * `inventory.ts` found the corpus fits, without the chain reversal Java 6 and 7 perform on a resize. The
 * stored order is what is measured; an insertion order given here is inferred to reproduce it, as on the
 * Harmony One's firmware screens, whose three screens over every key code share three buckets between a key
 * and a handler, findings section 409. Where no insertion order is given, `keyListOrder` refuses.
 */
export function keyListOrderInserted(inserted: readonly number[]): number[] {
  const count = inserted.length;
  if (new Set(inserted).size !== count) throw new RangeError('a tag is inserted twice');
  const rank = new Map(inserted.map((tag, at) => [tag, at]));
  return [...inserted].sort((a, b) => (keyListBucket(a, count) - keyListBucket(b, count))
    || ((rank.get(b) as number) - (rank.get(a) as number)));
}
