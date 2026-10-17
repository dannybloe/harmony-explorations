/**
 * Mode 0's key list on the four slot family, the Harmony 600, 650 and 700, the table after the end marker,
 * generated from its rule rather than copied; and the key map over the whole of their keypad it is one of.
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
 * state variable to 1, the low battery flag every battery screen sets on entry, section 357, and every one of its 162
 * is a swallow, scan 25 included, since the 700's placeholder is another mode.
 *
 * **The order is the shared rule**, section 315, `keyListOrder` in `../../modezero.ts`, which is measured on
 * five architectures and stays there. Mode 0's list on the 600, 650 and 700 has no tie: at 256 buckets the
 * hash is a bijection on a byte, so every tag has a bucket of its own.
 *
 * **Scope, decision 16**: arch 14 (Harmony 600, 650 and 700) alone. The populations of the other
 * architectures' lists are not generated, because section 311 refuted their constancy on arch 8, 10 and
 * 16, and the Harmony One's 55 entries, each calling the action list numbered by its own position, have
 * three ties at their capacity whose order the rule does not give. The Harmony One's firmware screens bind
 * another keypad, `families/touch/firmwarescreens.ts`' own, so `keyMapEntries` is this family's too.
 *
 * Moved out of `modezero.ts` with `todo-compile-one.md` 3.3.3.2, unchanged: the population, the key map over
 * scans 1 to 54 and that scan range are this family's, and the hash order every family's lists are stored in
 * stayed shared. `screenrecords.ts`, a four slot module still outside the family, takes the scan range through
 * the family's index.
 */
import { POP_MODE, STATE_WRITE_BASE } from '../../actions.ts';
import { KEY_EVENT_PRESS, KEY_EVENT_SHIFT } from '../../inventory.ts';
import { keyListOrder } from '../../modezero.ts';
import { taggedListBytes } from '../../sections.ts';

/** The models whose mode 0 list this generates. */
export type ModeZeroModel = 'harmony-600' | 'harmony-650' | 'harmony-700';

/** The key events a key list binds, as the tag's top two bits: release, press and repeat. Section 17. */
const KEY_EVENTS = [1, KEY_EVENT_PRESS, 3] as const;
/**
 * Scans 1 to 54, the 600's keypad, and the 650's and 700's; scan 0 is no key. Exported since section 336,
 * because an arch 14 start up screen binds the press of exactly these, `activityScreenChrome`, and two
 * copies of a range are two copies until one of them moves. The Harmony One's keypad is another,
 * `TOUCH_FIRMWARE_KEYPAD` in `families/touch/firmwarescreens.ts`.
 */
export const KEYPAD_FIRST_SCAN = 1;
export const KEYPAD_LAST_SCAN = 54;
/** The key under "Exit" on the placeholder screen, sections 290, 294 and 311. */
const EXIT_SCAN = 25;
/** The 700's leading entry: tag 6, an enter handler, writing 1 into a state variable with `0x80 + v`. */
const SEVEN_HUNDRED_HANDLER_TAG = 0x06;
/** A state write's opcode carries seven bits of index. */
const STATE_WRITE_LIMIT = 0x80;

/** One entry of mode 0's list: a tag and one action list instruction. */
export interface ModeZeroEntry {
  tag: number;
  operand: number;
  opcode: number;
}

/** The empty instruction, which the queue routine drops: a key bound to it is swallowed, section 311. */
export const SWALLOW = { operand: 0, opcode: 0 } as const;

/**
 * A key map over the whole keypad, in stored order: every key event of scans 1 to 54, release, press and
 * repeat, bound to its entry in `bindings` or else to `otherwise`, the empty instruction unless given,
 * and every other tag `bindings` holds, an enter or leave handler. Mode 0's list is one, and since
 * section 357 so is the own key map of every firmware screen that binds keys at all: the battery screens
 * swallow every key and set a flag on entry, and "USB Connected" runs one list for every key but three.
 */
export function keyMapEntries(
  bindings: ReadonlyMap<number, { operand: number; opcode: number }>,
  otherwise: { operand: number; opcode: number } = SWALLOW,
): ModeZeroEntry[] {
  const entries = new Map<number, ModeZeroEntry>();
  for (const event of KEY_EVENTS) {
    for (let scan = KEYPAD_FIRST_SCAN; scan <= KEYPAD_LAST_SCAN; scan += 1) {
      const tag = (event << KEY_EVENT_SHIFT) | scan;
      const bound = bindings.get(tag) ?? otherwise;
      entries.set(tag, { tag, operand: bound.operand, opcode: bound.opcode });
    }
  }
  for (const [tag, bound] of bindings) {
    if (!entries.has(tag)) entries.set(tag, { tag, operand: bound.operand, opcode: bound.opcode });
  }
  return keyListOrder([...entries.keys()]).map((tag) => entries.get(tag)!);
}

/**
 * Mode 0's list as entries, in stored order. The Harmony 700 needs the variable its leading entry sets,
 * which section 357 found is the low battery flag every battery screen sets on entry (40, 43 and 44 in
 * the samples), so it is a parameter, and the 600 and 650 refuse one, since their list has no such entry.
 */
export function modeZeroEntries(model: ModeZeroModel, options: { variable?: number } = {}): ModeZeroEntry[] {
  const bindings = new Map<number, { operand: number; opcode: number }>();
  if (model === 'harmony-700') {
    const variable = options.variable;
    if (variable === undefined || !Number.isInteger(variable) || variable < 0 || variable >= STATE_WRITE_LIMIT) {
      throw new RangeError(`a Harmony 700's mode 0 list sets one state variable, 0 to 127, and was given ${variable}`);
    }
    bindings.set(SEVEN_HUNDRED_HANDLER_TAG, { operand: 1, opcode: STATE_WRITE_BASE + variable });
  } else {
    if (options.variable !== undefined) {
      throw new RangeError(`a ${model}'s mode 0 list has no leading entry, so it takes no variable`);
    }
    // Only the 600 and 650 placeholder pops back on Exit; on the 700 mode 0 is something else and
    // every key is swallowed.
    bindings.set((KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | EXIT_SCAN, POP_MODE);
  }
  // The 700's tag 6 is bucket 6 of 256, ahead of every key event's, which is where Logitech stores it.
  return keyMapEntries(bindings);
}

/**
 * Mode 0's list as the bytes that follow the end marker: a one byte count, then per entry the tag, the
 * operand low byte first, and the opcode, `taggedListBytes`. This is what a container built from nothing
 * emits there.
 */
export function modeZeroKeyList(model: ModeZeroModel, options: { variable?: number } = {}): Uint8Array {
  return taggedListBytes(modeZeroEntries(model, options));
}
