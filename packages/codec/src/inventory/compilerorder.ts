/**
 * The order Logitech's compiler writes a table's cases and a handler set's tags in, worked out from the hash its keys
 * take, which the readers of the delay tables and the builders that write them share. Part of the inventory,
 * `inventory.ts`.
 */


/**
 * Java 6 and 7's `HashMap` supplemental hash, all four terms, so the formula is the one the identification in
 * `compilerCaseOrder` names. It is invertible, so distinct keys never share a hash, and a shared slot is the
 * table size's mask at work. One copy for every order the inventory and a family generate from it, since two
 * copies of one derivation are two copies until one of them moves.
 */
export function compilerHash(key: number): number {
  const h = key ^ (key >>> 20) ^ (key >>> 12);
  return h ^ (h >>> 7) ^ (h >>> 4);
}

/**
 * The order Logitech's compiler stores a base slot 14 record's cases in, generated rather than copied
 * off a record, section 319.
 *
 * **Ascending by `k ^ (k >>> 4) ^ (k >>> 7)`**, which is the supplemental hash Java's `HashMap`
 * applied in Java 6 and 7 (its `>>> 20` and `>>> 12` terms are zero below 4096), so the generator
 * most likely iterated a hash map keyed by the value. That identification is an inference; the order
 * is a measurement, and **it rests on two orderings**. Every record of two or more cases on the
 * thirteen arch 14 compiles fits, 410 of 410, but the 332 that are not ascending hold only two key
 * sets, 0 to 20 in 166 records and 0 to 450 in 166, each stored in one identical order every time.
 * The other 78 have every key below 16, where the hash is the key itself and the order ascending, so
 * they fit any rule that leaves small keys in place.
 *
 * **The order means nothing to the remote**: the lookup `0x72` reaches, `0x19A2E` on the Harmony 600's
 * 0.2 image and `0x1B30A` on the Harmony 700's 2.8, walks the cases from the first and leaves the
 * walk at the first whose key equals the value, trying the range table only when none did. It is
 * reproduced so that a composed record is the compiler's byte for byte, and costs nothing.
 *
 * **Refused outside what is pinned**: a key set whose keys are all below 16, or exactly 0 to 20, or
 * exactly 0 to 450. A hash map also masks the hash to its table size, and how big their table was is
 * not known: Java 6 grows it at three quarters full, later Java 7 updates only when the slot a key
 * lands in is taken as well, and the starting size is the caller's. Under the second rule the keys 2
 * to 13 and 16, inserted ascending, stay in a table of 16 where 16 lands in slot 1 and comes out
 * first, while this function would put it last. So no table size is guessed here; the two orders it
 * is used for are the measured ones, and a wider key set waits for a compile that holds one.
 */
export function compilerCaseOrder(keys: readonly number[]): number[] {
  const hash = compilerHash;
  if (keys.some((key) => !Number.isInteger(key) || key < 0)) {
    throw new RangeError('a case key is a whole number from 0');
  }
  if (new Set(keys).size !== keys.length) throw new RangeError('a record cannot hold a case key twice');
  // The key sets the order is pinned on: all small, or a run from 0 of one of the two measured lengths.
  const isRun = (length: number): boolean => keys.length === length && keys.every((key) => key < length);
  if (!keys.every((key) => key < 16) && !isRun(21) && !isRun(451)) {
    throw new RangeError('no compile here pins the order of this key set, whose table size is unknown');
  }
  return [...keys].sort((a, b) => hash(a) - hash(b));
}

/**
 * Two tags that share a slot, in the order the compiler stores them: the only shared slot this module
 * is asked about, a device mode's `0x2D` and `0xA4` at slot 47 of 64, `0x2D` first on 83 of 83.
 */
const MEASURED_TAG_TIES: ReadonlyMap<string, readonly [number, number]> = new Map([['45,164', [0x2d, 0xa4]]]);

/**
 * The order Logitech's compiler stores the tags of a mode's own tagged list in, section 330: the same
 * hash map order as `compilerCaseOrder`, **masked to the table**, which matters here and not there
 * because a tag runs to `0xFF` where the case keys stay below their table's size.
 *
 * The table is 16 slots, doubled while the tags number more than three quarters of it, which is Java's
 * default capacity and load factor: 64 slots for a device mode's 47 tags. A tag goes to slot
 * `hash & (size - 1)` and the slots are walked in order. **Measured, not inferred**: the slot order
 * holds on every mode record and page list of two tags or more on the thirteen Logitech compiles for the
 * Harmony 600, 650 and 700, 6921 of 6921 at five table sizes, and with 16 slots it gives
 * `FOUR_SLOT_STORED_ORDER`, the 9, 8, 34, 2 that every corner page stores, which was a literal measured
 * separately, section 285. On the key sets both accept, 0 to 15 and the run of 21, it gives
 * `compilerCaseOrder`'s order, since every key there is below its table's size; the run of 451 is not a
 * tag set.
 *
 * **The order inside a shared slot is not the tag's, so it is not computed.** The same pair is stored
 * both ways in those compiles, `0xC3` before `0x87` on 454 lists and after it on 117, which fits Java 6
 * and 7 putting a new entry at the head of its slot, so the tie shows the order the compiler inserted the
 * tags in, which nothing here reads. So a shared slot is answered only from `MEASURED_TAG_TIES`, which
 * holds the device mode's one pair, and any other is refused rather than guessed. A tag outside 0 to 255,
 * or one given twice, is refused too.
 */
export function compilerTagOrder(tags: readonly number[]): number[] {
  return tagSlotOrder(tags, MEASURED_TAG_TIES);
}

/**
 * `compilerTagOrder`'s slot order with the ties the caller has measured, for a tagged list whose shared
 * slots are not a device mode's. Split out for `wiring.ts`, section 347: base slot 9's fixed entries
 * share slots a mode's lists never do, and one pair, `0x81` and `0xA3`, is stored one way round on the
 * Harmony 600 and 650 and the other way on the Harmony 700, so a tie there is a per model constant and
 * not something this module's one table can hold. One hash and one slot rule, so the two cannot drift.
 */
export function tagSlotOrder(
  tags: readonly number[],
  ties: ReadonlyMap<string, readonly [number, number]>,
): number[] {
  const hash = compilerHash;
  if (tags.some((tag) => !Number.isInteger(tag) || tag < 0 || tag > 0xff)) {
    throw new RangeError('a tag is one byte');
  }
  if (new Set(tags).size !== tags.length) throw new RangeError('a tagged list cannot hold a tag twice');
  let size = 16;
  while (tags.length > size * 0.75) size *= 2;
  const slot = (tag: number): number => hash(tag) & (size - 1);
  return [...tags].sort((a, b) => {
    if (slot(a) !== slot(b)) return slot(a) - slot(b);
    const tie = ties.get([a, b].sort((x, y) => x - y).join(','));
    if (tie === undefined) {
      throw new RangeError(`tags 0x${a.toString(16)} and 0x${b.toString(16)} share a slot whose stored order is not measured`);
    }
    return tie.indexOf(a) - tie.indexOf(b);
  });
}
