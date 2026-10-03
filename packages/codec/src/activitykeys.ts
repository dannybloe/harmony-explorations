/**
 * Which activity the three activity keys start, read and edited, on a Harmony 600, 650 or 700.
 *
 * **What an activity key is**, section 314. A Harmony 600, 650 and 700 have three hard keys that each
 * start one activity: Watch TV, Watch a Movie and Listen to Music. Which activity is on which key is
 * stated once, in base slot 9's **entry 1**, one of the prefix entries section 272 found nothing in a
 * configuration ever selects and which the firmware evidently keeps installed, since the keys answer
 * from every screen. Its press entry for each key is one of two things in every one of the thirteen
 * Logitech compiles measured:
 *
 * * `1F` with operand `0xFF00 + n`: select base slot 9 entry `n`, the activity's own key map, whose
 *   enter handler is the whole start sequence. The same instruction the activity menu's rows run, so a
 *   key and a row start an activity identically, and a second press of the running activity's key is
 *   tag 5, section 313.
 * * `7F` calling a two instruction list `[07 FFFD, 7E p]`: push the current mode and enter mode `p`,
 *   the screen that says "Use the Harmony setup software to add an Activity on this button". That is
 *   mode 0 on the 600 and 650 and mode 4 on the 700, and its own key list pops back on the key under
 *   "Exit", section 311.
 *
 * **Both forms are four bytes**, a tag and a three byte instruction, so moving an activity onto a key
 * or emptying a key is a same length edit and goes through `applyEdits` like any other: no byte
 * moves, the trailer checksum is recomputed, and the byte accounting has to claim the run.
 *
 * **Emptying a key needs the placeholder list to exist already**, and that is the one refusal here
 * worth understanding. Logitech's compiler writes `[07 FFFD, 7E p]` only while some key is empty: of
 * the thirteen compiles, the six with an empty Listen to Music carry it and the seven with all three
 * keys taken carry no list entering the placeholder at all. That is thirteen containers and fewer
 * setups: the six are `calibration_h600` and five Harmony 700 compiles of one setup, and the seven
 * share about four setups between them. Creating one is a base slot 10 append,
 * which is a length change and belongs to the composers rather than to a same length editor. So a key
 * can be emptied on a configuration that holds the list, ours included once a key has been filled over
 * it, since filling a key leaves the list in place, and is refused on the others.
 *
 * **Scope, decision 16**: arch 14 (Harmony 600, 650 and 700) only, which is where section 314 measured
 * it. The Harmony One's activity keys have not been compared and every function here refuses another
 * architecture rather than guessing that they agree.
 */
import { ACTION_LIST_INDEX_OPCODE, HANDLER_TAG_ENTER, handlerSets, modeRecords, taggedList } from './sections.ts';
import type { TaggedList } from './sections.ts';
import {
  ACTIVITY_STATE_NAME,
  idleActivityValue,
  KEY_EVENT_PRESS,
  KEY_EVENT_SHIFT,
  SELECT_BINDING_SET,
  SELECT_BINDING_SET_MASK,
  stateVariables,
} from './inventory.ts';
import { STATE_WRITE_BASE } from './actions.ts';
import { characterMap, screenStrings } from './text.ts';
import { EditError } from './edit.ts';
import type { Edit } from './edit.ts';
import type { Container } from './gspm.ts';

/**
 * The three activity keys and their scan codes, section 314.
 *
 * Watch TV and Watch a Movie are named by the activity each selects in `calibration_h600`, whose
 * entries are called exactly that, against the calibration account's root button map. Listen to Music
 * is scan 7 by elimination. More Activities, scan 4, is deliberately absent: it calls a list that
 * clears device mode's marker and runs a value map lookup, not a select, and where it leads is unread.
 */
export const ACTIVITY_KEYS = {
  'Watch TV': 5,
  'Watch a Movie': 1,
  'Listen to Music': 7,
} as const;

export type ActivityKey = keyof typeof ACTIVITY_KEYS;

/** The base slot 9 entry whose press entries are the activity keys. Section 314. */
export const ACTIVITY_KEY_MAP_ENTRY = 1;

/** Instruction `0x07` with this operand pushes the current mode; `0xFFFC` pops it. Section 311. */
export const PUSH_MODE = { opcode: 0x07, operand: 0xfffd } as const;
/** Opcode `0x7E`: enter the mode the operand indexes. */
const ENTER_MODE = 0x7e;

/**
 * The text that identifies the placeholder mode, the screen an empty activity key opens.
 *
 * Found by its words rather than by a mode number because the number is per model, 0 on the Harmony
 * 600 and 650 and 4 on the 700, and the words are the same on all three: the inventory test that
 * measured section 314 identifies it this way too.
 */
const PLACEHOLDER_TEXT = /add an Activity on/;

/** What one activity key does in a configuration, as `activityKeys` reads it. */
export interface ActivityKeyBinding {
  key: ActivityKey;
  scan: number;
  /**
   * `activity` when it selects a base slot 9 entry, `placeholder` when it calls the list that opens the
   * "add an Activity" screen, and `other` for anything else, which no Logitech compile has.
   */
  kind: 'activity' | 'placeholder' | 'other';
  /** The base slot 9 entry it selects, for `activity`. */
  set?: number;
  /** The base slot 10 list it calls, for `placeholder` and for an `other` that is a call. */
  list?: number;
  /** The entry's raw instruction, so a caller can see an `other` for what it is. */
  operand: number;
  opcode: number;
  /** Blob offset of the entry's three instruction bytes, which is what an edit replaces. */
  instructionAt: number;
}

/**
 * Where entry 1's press entry for a key is, refusing anything this module was not measured on: another
 * architecture, a configuration without entry 1, and a key entry 1 does not bind or binds twice.
 * Exported so a composer can ask before it builds anything, which is cheaper than `activityKeys`.
 */
export function activityKeyEntry(c: Container, key: ActivityKey): { list: TaggedList; index: number; at: number } {
  if (c.architecture !== 14) {
    throw new EditError(
      `activity keys are read on a Harmony 600, 650 or 700 only, and this configuration states `
        + `architecture ${c.architecture ?? 'none'}`);
  }
  // `hasOwn` rather than a lookup, since a lookup of `toString` finds the prototype's function.
  if (!Object.hasOwn(ACTIVITY_KEYS, key)) throw new EditError(`${String(key)} is not an activity key`);
  const scan = ACTIVITY_KEYS[key];
  const sets = handlerSets(c);
  const address = sets?.addresses[ACTIVITY_KEY_MAP_ENTRY];
  if (address === undefined) throw new EditError('base slot 9 has no entry 1 to hold the activity keys');
  const list = taggedList(c, address);
  if (list === undefined) throw new EditError('base slot 9 entry 1 does not read as a tagged list');
  const tag = (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan;
  const index = list.entries.findIndex((one) => one.tag === tag);
  if (index < 0) {
    // Every compile carries all three. A configuration without one would need an entry added, which
    // is a length change, so this refuses rather than inventing where the entry would go.
    throw new EditError(`base slot 9 entry 1 has no press entry for ${key}, scan ${scan}`);
  }
  if (list.entries.findIndex((one, k) => k > index && one.tag === tag) >= 0) {
    // The reader takes the first match, so a second one is unreachable and editing either is a guess
    // about which the caller meant.
    throw new EditError(`base slot 9 entry 1 binds ${key} twice`);
  }
  // The instruction is the last three bytes of the entry whichever form the list takes, which is how
  // `taggedList` reads it too.
  const stride = list.wide ? 5 : 4;
  const at = list.start + (list.wide ? 2 : 1) + stride * index + stride - 3;
  return { list, index, at };
}

/**
 * The activity value a base slot 9 entry's enter handler writes, or undefined when it writes none.
 *
 * This is how an entry is recognised as an activity's from its own bytes, with no reference to the
 * menu rows that select it: `handlerSetRoles` answers through those rows, and a composed activity has
 * none until its row is composed, so it could not be put on a key first. The enter handler of an
 * activity writes the activity counter, which is the same closure `activityBindings` rests on.
 */
export function activityOfSet(c: Container, set: number): number | undefined {
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  const address = handlerSets(c)?.addresses[set];
  if (counter === undefined || address === undefined) return undefined;
  const enter = taggedList(c, address)?.entries.find((one) => one.tag === HANDLER_TAG_ENTER);
  if (enter?.opcode !== ACTION_LIST_INDEX_OPCODE) return undefined;
  const write = c.actionLists()?.[enter.operand]?.find((one) => one.opcode === STATE_WRITE_BASE + counter.index);
  return write?.operand;
}

/**
 * The placeholder mode, the screen an empty activity key opens, found by its text. Undefined when no
 * mode draws it, and a refusal when several do, since then which one a key should open is a guess.
 */
export function placeholderMode(c: Container): number | undefined {
  const programs = new Set(screenStrings(c, characterMap(c))
    .filter((one) => PLACEHOLDER_TEXT.test(one.text)).map((one) => one.program));
  const modes: number[] = [];
  (modeRecords(c) ?? []).forEach((record, index) => {
    if (record.pages.some((page) => programs.has(page.program))) modes.push(index);
  });
  if (modes.length > 1) {
    throw new EditError(`modes ${modes.join(', ')} all draw the "add an Activity" text`);
  }
  return modes[0];
}

/** Whether a base slot 10 list is exactly `[07 FFFD, 7E mode]`. */
function opensPlaceholder(c: Container, index: number, mode: number): boolean {
  const list = c.actionLists()?.[index];
  return list !== undefined && list.length === 2
    && list[0]!.opcode === PUSH_MODE.opcode && list[0]!.operand === PUSH_MODE.operand
    && list[1]!.opcode === ENTER_MODE && list[1]!.operand === mode;
}

/**
 * The base slot 10 list an empty activity key calls, or undefined when the configuration holds none.
 *
 * **A list already on a key is preferred**, so emptying a second key reuses exactly the list Logitech
 * put on the first; failing that, the lowest numbered list of the shape. Several lists of the shape
 * would behave identically, since a list is its instructions and nothing else, so the preference is
 * for the smallest diff from Logitech's own form rather than for correctness.
 */
export function placeholderList(c: Container): number | undefined {
  const mode = placeholderMode(c);
  if (mode === undefined) return undefined;
  for (const key of Object.keys(ACTIVITY_KEYS) as ActivityKey[]) {
    const { list, index } = activityKeyEntry(c, key);
    const entry = list.entries[index]!;
    if (entry.opcode === ACTION_LIST_INDEX_OPCODE && opensPlaceholder(c, entry.operand, mode)) return entry.operand;
  }
  const lists = c.actionLists() ?? [];
  for (let k = 0; k < lists.length; k += 1) if (opensPlaceholder(c, k, mode)) return k;
  return undefined;
}

/** What each of the three activity keys does, in the order `ACTIVITY_KEYS` names them. */
export function activityKeys(c: Container): ActivityKeyBinding[] {
  const mode = placeholderMode(c);
  return (Object.keys(ACTIVITY_KEYS) as ActivityKey[]).map((key) => {
    const { list, index, at } = activityKeyEntry(c, key);
    const entry = list.entries[index]!;
    const base = { key, scan: ACTIVITY_KEYS[key], operand: entry.operand, opcode: entry.opcode, instructionAt: at };
    if (entry.opcode === SELECT_BINDING_SET
        && (entry.operand & SELECT_BINDING_SET_MASK) === SELECT_BINDING_SET_MASK) {
      return { ...base, kind: 'activity' as const, set: entry.operand & 0xff };
    }
    if (entry.opcode === ACTION_LIST_INDEX_OPCODE) {
      const placeholder = mode !== undefined && opensPlaceholder(c, entry.operand, mode);
      return { ...base, kind: placeholder ? 'placeholder' as const : 'other' as const, list: entry.operand };
    }
    return { ...base, kind: 'other' as const };
  });
}

/**
 * Put the activity whose key map is base slot 9 entry `set` on an activity key: one same length edit
 * of three bytes, `1F` with operand `0xFF00 + set`, Logitech's own form, section 314.
 *
 * `set` is what `composeActivity` returns as `set` and what `activities` reports. It has to be an
 * activity's entry, recognised by its enter handler writing the activity counter to something other
 * than the idle value; anything else would start a key map that is not an activity, which the firmware
 * would run without complaint.
 *
 * **One activity on two keys is not refused.** Nothing measured says whether Logitech's software allows
 * it and the firmware has no reason to care, since each key is its own entry. Moving an activity off its
 * old key is a second call, `clearActivityKey` or `setActivityKey` with another activity.
 */
export function setActivityKey(c: Container, key: ActivityKey, set: number): Edit[] {
  const { at } = activityKeyEntry(c, key);
  const sets = handlerSets(c);
  if (!Number.isInteger(set) || set < 0 || sets === undefined || set >= sets.addresses.length) {
    throw new EditError(`base slot 9 has no entry ${set}`);
  }
  if (set > 0xff) throw new EditError(`entry ${set} does not fit the select's one byte`);
  const activity = activityOfSet(c, set);
  if (activity === undefined || activity === idleActivityValue(c)) {
    throw new EditError(`base slot 9 entry ${set} is not an activity's: its enter handler starts no activity`);
  }
  const operand = SELECT_BINDING_SET_MASK | set;
  return [{
    start: at,
    bytes: Uint8Array.from([operand & 0xff, operand >>> 8, SELECT_BINDING_SET]),
    owner: `activity key ${key}`,
  }];
}

/**
 * Empty an activity key: its press entry calls the placeholder list again, so pressing it opens the
 * "add an Activity" screen, as Logitech compiles an empty key.
 *
 * Refused when the configuration holds no placeholder list, for the reason in this module's header:
 * creating one is a length change. The message says so, because the obvious next question is why a
 * key that Logitech can empty cannot be emptied here.
 */
export function clearActivityKey(c: Container, key: ActivityKey): Edit[] {
  const { at } = activityKeyEntry(c, key);
  const list = placeholderList(c);
  if (list === undefined) {
    throw new EditError(
      `${key} cannot be emptied: this configuration holds no [07 FFFD, 7E placeholder] list, which `
        + 'Logitech compiles only while some activity key is already empty, and adding one is a length '
        + 'change this same length edit does not make');
  }
  if (list > 0xffff) throw new EditError(`list ${list} does not fit an operand`);
  return [{
    start: at,
    bytes: Uint8Array.from([list & 0xff, list >>> 8, ACTION_LIST_INDEX_OPCODE]),
    owner: `activity key ${key}`,
  }];
}
