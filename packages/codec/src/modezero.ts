/**
 * Mode 0's key list, the table after the end marker, generated from its rule rather than copied.
 *
 * **What the table is**, section 311. Behind the end marker (`LWJL` on arch 14) sits a count and four
 * bytes per entry, and section 52 had already found it is **mode 0's own tagged list**: each entry is a
 * key event, a tag of `event << 6 | scan`, and one action list instruction, a `u16` operand and an
 * opcode byte. On a Harmony 600 and 650 mode 0 is the screen an empty activity key opens, "Use the
 * Harmony setup software to add an Activity on this button", and its list swallows every key event
 * with the empty instruction `00 00 00`, which the queue routine drops, except the press of scan 25,
 * the key under "Exit", which pops back to the mode the activity key came from with `07 FFFC`.
 *
 * **The population is one constant per model**, measured in section 311 on every Harmony 600 and 650
 * container: 162 entries, scans 1 to 54 each in the three events release, press and repeat. A
 * Harmony 700 carries the same 162 behind one extra entry, an enter handler of tag `0x06` setting one
 * state variable to 1, whose number the compiler chooses per configuration, and every one of its 162
 * is a swallow, scan 25 included, since the 700's placeholder is another mode.
 *
 * **The order is a rule too, section 315, and it is not ours.** The firmware does not care about it,
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
 * `keyListOrder` refuses a tie rather than guessing. Mode 0's list on the 600, 650 and 700 has none:
 * at 256 buckets the hash is a bijection on a byte, so every tag has a bucket of its own.
 *
 * **Scope, decision 16**: the generator is arch 14 (Harmony 600, 650 and 700). The order rule is
 * measured on arch 8, 10, 12, 14 and 16; the populations of the other architectures' lists are not
 * generated, because section 311 refuted their constancy on arch 8, 10 and 16, and the Harmony One's
 * 55 entries, each calling the action list numbered by its own position, have three ties at their
 * capacity whose order this rule does not give.
 */
import { STATE_WRITE_BASE } from './actions.ts';
import { KEY_EVENT_PRESS, KEY_EVENT_SHIFT } from './inventory.ts';

/** The models whose mode 0 list this generates. */
export type ModeZeroModel = 'harmony-600' | 'harmony-650' | 'harmony-700';

/** The key events a key list binds, as the tag's top two bits: release, press and repeat. Section 17. */
const KEY_EVENTS = [1, KEY_EVENT_PRESS, 3] as const;
/** Scans 1 to 54, the 600's keypad; scan 0 is no key. */
const FIRST_SCAN = 1;
const LAST_SCAN = 54;
/** The key under "Exit" on the placeholder screen, sections 290, 294 and 311. */
const EXIT_SCAN = 25;
/** Instruction `0x07` with operand `0xFFFC` pops the mode stack, section 311. */
const POP_MODE = { opcode: 0x07, operand: 0xfffc } as const;
/** The 700's leading entry: tag 6, an enter handler, writing 1 into a state variable with `0x80 + v`. */
const SEVEN_HUNDRED_HANDLER_TAG = 0x06;
/** A state write's opcode carries seven bits of index. */
const STATE_WRITE_LIMIT = 0x80;

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

/** One entry of mode 0's list: a tag and one action list instruction. */
export interface ModeZeroEntry {
  tag: number;
  operand: number;
  opcode: number;
}

/**
 * Mode 0's list as entries, in stored order. The Harmony 700 needs the variable its leading entry sets,
 * which its compiler picks per configuration (40, 43 and 44 in the samples), so it is a parameter, and
 * the 600 and 650 refuse one, since their list has no such entry.
 */
export function modeZeroEntries(model: ModeZeroModel, options: { variable?: number } = {}): ModeZeroEntry[] {
  const entries = new Map<number, ModeZeroEntry>();
  if (model === 'harmony-700') {
    const variable = options.variable;
    if (variable === undefined || !Number.isInteger(variable) || variable < 0 || variable >= STATE_WRITE_LIMIT) {
      throw new RangeError(`a Harmony 700's mode 0 list sets one state variable, 0 to 127, and was given ${variable}`);
    }
    entries.set(SEVEN_HUNDRED_HANDLER_TAG,
                { tag: SEVEN_HUNDRED_HANDLER_TAG, operand: 1, opcode: STATE_WRITE_BASE + variable });
  } else if (options.variable !== undefined) {
    throw new RangeError(`a ${model}'s mode 0 list has no leading entry, so it takes no variable`);
  }
  for (const event of KEY_EVENTS) {
    for (let scan = FIRST_SCAN; scan <= LAST_SCAN; scan += 1) {
      const tag = (event << KEY_EVENT_SHIFT) | scan;
      // Only the 600 and 650 placeholder pops back on Exit; on the 700 mode 0 is something else and
      // every key is swallowed.
      const pops = model !== 'harmony-700' && event === KEY_EVENT_PRESS && scan === EXIT_SCAN;
      entries.set(tag, pops ? { tag, ...POP_MODE } : { tag, operand: 0, opcode: 0 });
    }
  }
  // The 700's tag 6 is bucket 6 of 256, ahead of every key event's, which is where Logitech stores it.
  return keyListOrder([...entries.keys()]).map((tag) => entries.get(tag)!);
}

/**
 * Mode 0's list as the bytes that follow the end marker: a one byte count, then per entry the tag, the
 * operand low byte first, and the opcode. This is what a container built from nothing emits there.
 */
export function modeZeroKeyList(model: ModeZeroModel, options: { variable?: number } = {}): Uint8Array {
  const entries = modeZeroEntries(model, options);
  if (entries.length > 0xff) throw new RangeError('the count is one byte');
  const out = new Uint8Array(1 + 4 * entries.length);
  out[0] = entries.length;
  entries.forEach((one, k) => {
    out.set([one.tag, one.operand & 0xff, one.operand >>> 8, one.opcode], 1 + 4 * k);
  });
  return out;
}
