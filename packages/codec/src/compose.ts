/**
 * Compose a device into a config: the insertions of `docs/adding-a-device.md` phase 6, built on the
 * relocation pass and on the stated code emitters, and nothing else new.
 *
 * **This file is the infrared half**, base slot 5: a new device group, one record per command, and
 * the duration blocks those records point at, all derived from codes as Logitech's catalogue states
 * them. The device's name, its state variables, its action lists and its screen page are the other
 * half and land here as they are built, in the checklist's own order.
 *
 * The layout mirrors the generator's: the blocks, records and the group's own record array go into
 * one hole immediately below base slot 5's section, which is where every config here keeps them,
 * and the section itself, the count prefixed array of group pointers, grows by one entry at its
 * end. Appending is load bearing: a device is its group's **index**, so inserting anywhere but the
 * end would renumber every existing device under the action lists that drive them.
 *
 * **What a block stores is not what the emitter speaks.** `blockOfStatedCode` returns merged
 * intervals, one pulse per physical interval, because two adjacent words of one kind are one
 * interval and no receiver can see the join, section 164. A duration word holds fifteen bits, so a
 * long silence is spelled as several words, and phase 7 measured the generator's spelling rather
 * than assuming one: `compiledBlockWords` below, section 174. Reading merges back to the same
 * train whatever the split, which is what lets the spelling be a convention and not a meaning.
 *
 * Read only towards hardware, like `relocate.ts`: the result is bytes in memory.
 */
import {
  Container, type Instruction, TRAILER_CHECKSUM_OFFSET, archSlot, parse, trailerChecksum,
  SCAN_MASK,
} from './gspm.ts';
import { u16 as u16le, u24 } from './bytes.ts';
import { STATE_BAND, STATE_WRITE_BASE, stateVariableSite } from './actions.ts';
import {
  STATE_RECORD_HEADER,
  STATE_TABLE_SLOT,
  STATE_VALUE_LENGTH,
  type ModePage,
  type ModeRecord,
  modePages,
  modeRecords,
  modeTable,
  pageListCopies,
  assertStateTableConsistent,
  STATE_TABLE_HEADER,
  stateTable,
  taggedList,
  taggedListPools,
  type TaggedEntry,
  ACTION_LIST_INDEX_OPCODE,
  HANDLER_TAG_ENTER,
  HANDLER_TAG_LEAVE,
  NAME_LEVEL_STATE_VARIABLE,
  NAME_NODE_HEADER,
  nameNodes,
  type NameNode,
  handlerSets,
  HANDLER_TABLE_SLOT,
} from './sections.ts';
import {
  SCREEN_DRAW_IMAGE_AT, SCREEN_JUMP, SCREEN_QUEUE_INSTRUCTION, type ScreenInstruction, bitmapAt,
  bitmapReference, screenProgram,
} from './screen.ts';
import {
  EDGE_CODES, LIST_ROW_PITCH, PANEL_LEFT, SCREEN_ROW_PITCH, touchOwner, touchPageOf,
} from './touch.ts';
// **The opcodes come from the one place each is named**, and until 6 September 2026 this file had
// its own `SEND_INFRARED` and its own `RUN_ACTION_LIST` beside the copies in `inventory.ts` and
// `sections.ts`. All correct, none able to see the others: the state `isa.py`'s docstring forbids.
import {
  ACTIVITY_STATE_NAME,
  type ActivityScreens,
  activityBindings,
  activityNames,
  activityScreens,
  allOffList,
  caseQueued,
  deviceVariables,
  handlerSetRoles,
  KEY_EVENT_PRESS,
  SELECT_BINDING_SET,
  SELECT_BINDING_SET_MASK,
  SEND_INFRARED,
  DEVICE_QUANTITY,
  DEVICE_QUANTITY_DEFAULT,
  firmwareStateVariableMax,
  KEY_EVENT_SHIFT,
  stateVariables,
  deviceIds,
  sendPreludes,
  interDeviceDelayCases,
  CONDITION_OPCODE,
  INTER_DEVICE_DELAY_VALUES,
  MAP_VALUE_OPCODE,
  POWER_ON_DELAY_CASES,
  POWER_ON_DELAY_CHUNK,
  POWER_ON_DELAY_VALUES,
  powerOnDelayAmounts,
  powerOnDelayCases,
  powerOnDelays,
  QUEUE_INTER_DEVICE_DELAY,
  SEND_PRELUDE_LOAD,
  sendPreludeCondition,
} from './inventory.ts';
import { characterMap, decode, glyphsReferencedBy, screenStrings } from './text.ts';
import { type FontSet, fontSets, glyphOf } from './font.ts';
import {
  IR_CLASS_STREAM,
  IR_POINTERS_PER_GROUP,
  IR_PULSE_MAX,
  type IrPulse,
  irBuildBlock,
  irBuildRecord,
} from './ir.ts';
import type { Pulse } from './irframe.ts';
import { IR_TABLE_SLOT, irGroups } from './ir.ts';
import { irFrame } from './irframe.ts';
import { blockOfStatedCode, longPressBlockOfStatedCode, statedCode, statedProtocol } from './stated.ts';
import { TOUCH_AREA_LENGTH, type TouchArea, type TouchPage, touchPages } from './tables.ts';
import {
  deviceListRowMode, deviceListRows, deviceModeMarker, devices as deviceInventory, FOUR_SLOT_ITEMS,
  fourSlotCellAt, FOUR_SLOT_LABEL_Y, INPUT_PROPERTY, POWER_PROPERTY,
  FOUR_SLOT_LEFT_X, FOUR_SLOT_RIGHT_END, FOUR_SLOT_ROWS, FOUR_SLOT_SCREEN_WIDTH, FOUR_SLOT_STORED_ORDER,
  TWO_ROW_LABEL_Y,
} from './inventory.ts';
import { excise, relocate } from './relocate.ts';
import { type ActivityKey, activityKeyEntry, setActivityKey } from './activitykeys.ts';
import { applyEdits } from './edit.ts';
import { Writer } from './emit.ts';
import {
  VALUE_MAP_COUNT_WIDTH, VALUE_MAP_KEY_WIDTH, VALUE_MAP_SECTION_COUNT_WIDTH, VALUE_MAP_SLOT,
  countedPointers, valueMaps,
} from './valuemap.ts';

export class ComposeError extends Error {}

/** One command to put on the new device, as the catalogue spells it. */
export interface ComposeCommand {
  /** The code, whole: `G:Toshiba 32 Bit:(0x20DF10EF)(Repeat)():3`. */
  readonly stated: string;
  /**
   * Whether the command repeats while its key is held, which nothing states, phase 4's audit gap 2:
   * a record's held block is per command in the format and the catalogue does not say. Absent means
   * take the family's repeat block where the family has one, which is right for volume and channel
   * keys and harmless for the rest, and `false` refuses it for a command that must not repeat.
   */
  readonly held?: boolean;
  /**
   * The silence in front of the once block, phase 7's first measurement: every once block in every
   * Logitech compile leads with one, 2032 of 2032 across both generator eras, 50 ms on most
   * commands and 500 ms or a second on the ones that deserve a settling time, power and inputs
   * mostly. Absent means the 50 ms the majority carries; the catalogue does not state the longer
   * ones, so a caller that knows better says so here.
   */
  readonly leadInUs?: number;
  /**
   * A power step the catalogue holds for this many milliseconds, sections 306 to 309: the record is
   * `longPressBlockOfStatedCode`'s, its frames counted for the hold, with no lead in and no held block,
   * the way Logitech's compiler writes one. `held` and `leadInUs` do not apply and are refused.
   */
  readonly holdMs?: number;
}

/**
 * One step of a power action as the catalogue states it: a command, and how long it is held where the
 * catalogue says, `DriveStep` in `driving.ts`. A step held for a time gets a record of its own holding
 * the frames that time sends, section 309; a step that is not still gets a record of its own, the
 * ordinary press without its lead in silence, which is what every power step record Logitech compiled
 * for the Harmony 650 holds, measured on three devices word for word.
 */
export interface ComposePowerStep {
  readonly stated: string;
  readonly holdMs?: number;
}

/** The lead-in the generator gives a command nothing says more about, measured in phase 7. */
export const COMPILED_LEAD_IN_US = 50000;

/**
 * A whole block's words the way Logitech's generator spells them, phase 7 and section 174: the
 * lead-in silence first where one is given, every long silence split under the half word rule, and
 * the trailing gap ending in a **one microsecond** space carved out of it. All of it physically
 * nil, since two adjacent spaces are one interval, section 164; adopted so a composed block is the
 * block their generator would have written, and checked by respelling every block of their own
 * compiles, both generator eras.
 *
 * The half word rule, which three word level diffs kept refusing until it was found: a silence is
 * spelt as maximal words and a remainder, and **no word may fall below half the maximum**, so a
 * remainder under 16384 gives back one maximal and the last two words share their sum, smaller
 * half first. 50000 is `32767, 17233`; 40222 is `20111, 20111`; 500000 is fourteen maximals then
 * `20631, 20631`.
 *
 * **The microsecond comes off the trailing gap before the gap is split, not after**, section 309.
 * This carved it off the last word of the split until 2 October 2026, which gives the same words
 * except where the split ends in a balanced pair whose total is odd: the Panasonic family's 74801 is
 * `32767, 21016, 21017, 1` in every compile and was `32767, 21017, 21016, 1` here. Over every block
 * of the corpus and the compiles, carving first is the only spelling that fits on thousands and
 * carving last is the only one on none.
 */
export function compiledBlockWords(pulses: readonly Pulse[], leadInUs = 0): IrPulse[] {
  const led = leadInUs > 0 ? [{ mark: false, us: leadInUs }, ...pulses] : [...pulses];
  const words: IrPulse[] = [];
  // The trailing gap gives up its last microsecond first, then the rest is spelled like any silence.
  const lastAt = led.length - 1;
  const carved = lastAt >= 0 && !led[lastAt]!.mark && led[lastAt]!.us >= 2;
  for (const [at, pulse] of led.entries()) {
    if (pulse.mark) {
      // A mark over the ceiling is spelt maximal first like blockWordsOf spells it; none of the
      // corpus's marks reach the ceiling, so the arm exists for completeness rather than evidence.
      words.push(...blockWordsOf([pulse]));
      continue;
    }
    let left = carved && at === lastAt ? pulse.us - 1 : pulse.us;
    while (left > IR_PULSE_MAX) {
      const remainder = left - IR_PULSE_MAX;
      if (remainder < (IR_PULSE_MAX + 1) / 2) {
        const low = Math.floor(left / 2);
        words.push({ mark: false, microseconds: low }, { mark: false, microseconds: left - low });
        left = 0;
        break;
      }
      words.push({ mark: false, microseconds: IR_PULSE_MAX });
      left = remainder;
    }
    if (left > 0) words.push({ mark: false, microseconds: left });
  }
  if (carved) words.push({ mark: false, microseconds: 1 });
  return words;
}

export interface ComposedGroup {
  bytes: Uint8Array;
  /** The new device's group index, which is what an action list's send operand names. */
  group: number;
  /** How many records the group carries, one per command. */
  records: number;
}

/**
 * A merged train as the words a block stores: split anything over the fifteen bit ceiling.
 *
 * Maximal words first and the remainder last, and a zero remainder moved off by one microsecond so
 * no word terminates the block early. **This is a legal spelling, not the generator's**: phase 7
 * measured theirs and it is `compiledBlockWords`, whose gaps obey the half word rule and whose
 * trailing gap ends in a one microsecond word, section 174. This stays as the plain splitter the
 * spelled form builds on, and reading merges either back to the same train.
 */
export function blockWordsOf(pulses: readonly Pulse[]): IrPulse[] {
  const out: IrPulse[] = [];
  for (const pulse of pulses) {
    let left = pulse.us;
    while (left > IR_PULSE_MAX) {
      // Keep the next word nonzero: a remainder of exactly zero after a maximal word would write a
      // terminator in the middle of the block, so the last two words share the remainder instead.
      const take = left - IR_PULSE_MAX === 0 ? IR_PULSE_MAX - 1 : IR_PULSE_MAX;
      out.push({ mark: pulse.mark, microseconds: take });
      left -= take;
    }
    out.push({ mark: pulse.mark, microseconds: left });
  }
  return out;
}

/** The action list table's base slot, whose lists are what everything that runs points at. */
export const ACTION_TABLE_SLOT = 10;
/** One past the highest variable a state write can name: the index is the opcode's low seven bits,
 *  `actions.ts`, so 128 is where the write becomes an instruction of a different band. */
export const STATE_WRITE_LIMIT = 128;
/** Tag 5's handler, what the activity switch runs when the activity asked for is the one already
 *  running, section 313. Spelled here because the readers name only tag 1, `ACTIVITY_START_TAG`. */
const HANDLER_TAG_RESUME = 5;
// **`FIRMWARE_STATE_VARIABLE_MAX` is imported rather than restated**, and this file declared its own
// `FIRMWARE_STATE_VARIABLE_MAX = 12` beside it until 6 September 2026. The two were equal and the pairing was
// worse than an ordinary duplicate: the rails below read this file's copy while `compose.test.ts`
// imported the other one, so the check and the test that says the check is right were reading
// different constants. Section 138 is the reading, that the firmware owns variables 0 to 12 on every
// architecture, and section 284 the correction, that it owns 0 to 17 on arch 8, 12 and 14, so the
// rails below ask `firmwareStateVariableMax` for the container's own architecture.

/**
 * Append entries to one of the counted pointer tables, which is the one growth every section
 * shares: three bytes per entry at the table's end, then the count, then nothing else.
 */
export function appendTableEntries(
  c: Container, slot: number, targets: readonly number[],
): Uint8Array {
  const table = c.pointerArrayAt(slot);
  if (table === undefined) throw new ComposeError(`slot ${slot} does not read as a pointer table`);
  const at = table.start + table.length;
  const grown = relocate(c, at, 3 * targets.length);
  targets.forEach((target, k) => {
    grown.bytes.set(new Writer(3).u24(target).bytes, at + 3 * k);
  });
  const count = table.values.length + targets.length;
  const width = new Writer(table.width);
  if (table.width === 1) width.u8(count);
  else width.u16(count);
  grown.bytes.set(width.bytes, table.start);
  return grown.bytes;
}

/**
 * Add one device group to base slot 5: records and blocks below the section, one pointer at the
 * table's end, and the count bumped.
 *
 * Two relocations, in an order where the container stays parseable in between: first the hole for
 * the content, whose bytes are unreferenced filler until the table names them, then three bytes at
 * the table's own end for the pointer. The intermediate state matters because each relocation runs
 * the full census on what it is given.
 */
export function composeIrGroup(
  c: Container, commands: readonly ComposeCommand[],
): ComposedGroup {
  if (commands.length === 0) throw new ComposeError('a device with no commands is not a device');
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const slot = archSlot(c.architecture, IR_TABLE_SLOT);
  const table = c.pointerArrayAt(slot);
  if (table === undefined) throw new ComposeError('base slot 5 does not read as a group table');

  // Every command's blocks, derived and refused early: composing half a device helps nobody.
  const built: { periodNs: number; once: Uint8Array; held?: Uint8Array }[] = [];
  for (const command of commands) {
    const read = statedCode(command.stated);
    if (read === undefined) throw new ComposeError(`not a catalogue code: ${command.stated}`);
    const entry = statedProtocol(read.family);
    if (entry === undefined) {
      throw new ComposeError(`no measured rhythm for ${read.family}, so nothing can be sent`);
    }
    if (command.holdMs !== undefined) {
      if (command.held === true || (command.leadInUs ?? 0) !== 0) {
        throw new ComposeError('a held power step has no held block and no lead in');
      }
      const block = longPressBlockOfStatedCode(read, command.holdMs);
      if (block === undefined) {
        throw new ComposeError(`${command.stated} cannot be composed held for ${command.holdMs} ms: `
          + 'its family has no measured press block or stated segment lengths, or the hold is shorter than a press');
      }
      built.push({ periodNs: entry.periodNs, once: irBuildBlock(compiledBlockWords(block)) });
      continue;
    }
    const once = blockOfStatedCode(read, undefined, 'once');
    if (once === undefined) {
      throw new ComposeError(`${read.family} has no measured whole block, so nothing can be sent`);
    }
    const held = command.held === false ? undefined : blockOfStatedCode(read, undefined, 'held');
    if (command.held === true && held === undefined) {
      throw new ComposeError(`${read.family} has no measured held block and one was demanded`);
    }
    built.push({
      periodNs: entry.periodNs,
      once: irBuildBlock(compiledBlockWords(once, command.leadInUs ?? COMPILED_LEAD_IN_US)),
      ...(held === undefined ? {} : { held: irBuildBlock(compiledBlockWords(held)) }),
    });
  }

  // Lay the hole out: blocks first, deduplicated by content the way the corpus shares them,
  // section 61, then the records, then the group's own record array.
  const blockAt = new Map<string, number>();
  const blocks: Uint8Array[] = [];
  let cursor = 0;
  const place = (block: Uint8Array): number => {
    const key = Buffer.from(block).toString('hex');
    const found = blockAt.get(key);
    if (found !== undefined) return found;
    blockAt.set(key, cursor);
    blocks.push(block);
    cursor += block.length;
    return cursor - block.length;
  };
  const laid = built.map((one) => ({
    periodNs: one.periodNs,
    once: place(one.once),
    held: one.held === undefined ? undefined : place(one.held),
  }));
  const blocksSize = cursor;
  const recordSize = 12 + 3 * IR_POINTERS_PER_GROUP;
  const arrayAt = blocksSize + recordSize * commands.length;
  const holeSize = arrayAt + 3 + 3 * commands.length;

  // The hole goes exactly where the group arrays end and the section begins, so the new group sits
  // where every existing one does, immediately below the table.
  const at = table.start;
  const first = relocate(c, at, holeSize);
  const base = c.flashBase + at;
  const array = new Writer(3 + 3 * commands.length).u8(0).u16(commands.length);
  laid.forEach((one, k) => {
    const start = base + blocksSize + recordSize * k;
    const record = irBuildRecord({
      periodNs: one.periodNs,
      start,
      encoding: IR_CLASS_STREAM,
      pointers: [
        base + one.once,
        one.held === undefined ? 0 : base + one.held,
        0,
      ],
    });
    first.bytes.set(record.bytes, at + blocksSize + recordSize * k);
    array.u24(record.pointer);
  });
  let offset = 0;
  for (const block of blocks) {
    first.bytes.set(block, at + offset);
    offset += block.length;
  }
  first.bytes.set(array.bytes, at + arrayAt);

  // The table entry: three bytes at the table's end, then the count. The middle parse is what lets
  // the second relocation run its census on a container whose every reader still answers.
  const bytes = restamped(appendTableEntries(parse(first.bytes), slot, [base + arrayAt]));
  return { bytes, group: table.values.length, records: commands.length };
}

/** The one integrity field, recomputed over the finished bytes, always last. */
export function restamped(bytes: Uint8Array): Uint8Array {
  bytes.set(new Writer(2).u16(trailerChecksum(bytes)).bytes,
            bytes.length - TRAILER_CHECKSUM_OFFSET);
  return bytes;
}

/** A device to compose whole: its label, its commands, and which command toggles the power. */
export interface ComposeDevice {
  /**
   * The word the config knows the device by, ASCII with no underscore, because a state
   * variable's name is `<label>_<property>_<values>` and the underscore is the separator that
   * makes the label recoverable, section 126.
   */
  readonly label: string;
  readonly commands: readonly ComposeCommand[];
  /** Which command is the power toggle, driving the device's one state variable. Default 0. */
  readonly power?: number;
  /**
   * The catalogue's power on and power off steps, each composed as a record of its own, section 309,
   * which the power variable's two transitions then send in place of `commands[power]`'s list. The two
   * may be the same step, a toggle, and then share one record. Absent means `power` is sent both ways,
   * which is what a composed device did before and what sends an ordinary press where Logitech's
   * catalogue asks for a held one: three frames where the Harmony 650's Panasonic needs four.
   *
   * **Several steps are an action performed in order**, section 320: the Knoll HDP-1100's catalogue
   * switches it off with its power toggle held for half a second, three times, and Logitech's compiler
   * wrote one list calling that step's send list three times, which is what the off transition runs. A
   * step stated twice is one record and one send list, called twice. `catalogueDevicePower` in
   * `devicepower.ts` reads these out of the catalogue.
   */
  readonly powerOn?: ComposePowerStep | readonly ComposePowerStep[];
  readonly powerOff?: ComposePowerStep | readonly ComposePowerStep[];
  /**
   * The amount of the `0x7C` paired with each power step's send, in tenths of a second: the catalogue's
   * inter key delay, section 320. Every power step send list Logitech compiled for the test devices of
   * the six power hold compiles carries its device's inter key delay there, 1, 4 or 5, while the same
   * devices' ordinary presses carry 1, which is what `commands` still get. Their compiler also adds, on
   * some devices, an uncalled second list per digit at the inter key delay and a second list for some
   * input commands at the input delay; what decides either is not read and neither is composed.
   * Default `DEVICE_QUANTITY_DEFAULT`, what a power step got before section 320.
   */
  readonly interKeyDelay?: number;
  /**
   * Arch 14 only: the inter device delay in tenths of a second, 0 to 20, which a start sequence
   * queues in front of each of this device's commands. Default `INTER_DEVICE_DELAY_DEFAULT`.
   */
  readonly interDeviceDelay?: number;
  /**
   * Arch 14 only: the power on delay in tenths of a second, 0 to 450, queued after the power
   * command when the device is switched on. Default `POWER_ON_DELAY_DEFAULT`.
   */
  readonly powerOnDelay?: number;
}

export interface ComposedDevice {
  bytes: Uint8Array;
  group: number;
  /** The base slot 10 list index per command, which is what a binding's 0x7f names. */
  lists: readonly number[];
  /**
   * The lists that perform the power actions, where `powerOn` and `powerOff` were given: what a
   * device page's power keys should name so that they send what the catalogue asks for rather than an
   * ordinary press. For an action of one step that is the step's own send list, equal for a toggle;
   * for several it is a list calling each step's send list in order, section 320. `off` is also what
   * the power variable runs to switch the device off. `on` never carries the power on delay, which
   * only the transition adds: no device mode key Logitech compiled runs one.
   */
  powerSteps?: { on?: number; off?: number };
  /** The device's power variable, in base slot 13's numbering. */
  variable: number;
  /**
   * Arch 14 only: what every command opens with, section 287. `variable` is the device's
   * `InterDeviceDelay_<identifier>`, `table` the base slot 14 record mapping it, `list` the one list
   * of the device's own that applies it, and `identifier` the number the variable's name carries.
   */
  delay?: { variable: number; table: number; list: number; identifier: number };
  /**
   * Arch 14 only: the power on delay, section 288. `variable` is `PowerOnDelay_<identifier>`,
   * `table` the base slot 14 record mapping it, `list` the list holding that `0x72`, and `on` the
   * list the power variable runs to switch the device on: the power command, then `list`.
   */
  powerOnDelay?: { variable: number; table: number; list: number; on: number };
}

/**
 * Compose a device whole, as far as the naming half: the infrared group, one action list per
 * command, a power state variable whose transitions run the power command's list, and the name
 * tree node that gives the device its label.
 *
 * After this the device **exists and is named**: `inventory` reports it with its label through the
 * same route it names every corpus device, section 126. What it does not have yet is a screen
 * page, which is the next insertion in the checklist's order.
 */
/**
 * Shift every state variable at or above `from` up by one, rewriting every reference to one.
 *
 * **Same length throughout**, which is what makes it safe: every site is an opcode byte or an
 * operand's low byte already in the container, so nothing moves and no pointer goes stale. The
 * caller then inserts the new entry pointer, which is the only length change.
 *
 * Two kinds of site, and the enumeration of the first is deliberately not here.
 * `stateVariableSite` in `actions.ts` is the one place that knows where an index can sit inside an
 * action list, next to the readings that state the same fact in prose, because a second copy of
 * that list is how 1411 of 1511 references get missed: a first survey used two of the six `0x1F`
 * band sub opcodes and found 100 sites where there are 1511. Section 277.
 *
 * The second is a **name tree node** at level 1, whose index is the variable it names, section 77.
 * Those are `u16` fields at a known offset, so the rewrite is the same shape.
 *
 * What deliberately needs no rewrite, both checked rather than assumed: base slot 14's records are
 * chosen by `0x72`'s **high** byte rather than indexed by the variable, section 39, and base slot
 * 16's are reached through a transition's action list rather than by variable index, section 154.
 * A transition's own `operand` is a list index and not a variable.
 *
 * **The bound is the write band's seven bits.** A variable shifted to 128 would need an opcode of
 * `0x100`, which does not exist, so the shift is refused rather than truncated. Nothing in the
 * corpus comes within 34 of it, which is exactly why the check has to be reasoned about.
 */
export function renumberStateVariables(c: Container, from: number): Uint8Array {
  const table = stateTable(c);
  if (table === undefined) throw new ComposeError('base slot 13 does not read as a table');
  if (!Number.isInteger(from) || from < 0 || from > table.count) {
    throw new ComposeError(`${from} is not a position in a table of ${table.count} variables`);
  }
  if (table.count >= STATE_WRITE_LIMIT) {
    throw new ComposeError(
      `renumbering would put a variable at ${table.count}, and a write opcode carries seven bits`);
  }
  const bytes = Uint8Array.from(c.blob);

  // The action lists. `actionLists` gives the parsed instructions and `actionListSites` gives the
  // matching offsets, both off the same pointer table, so the two are index for index.
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const listTable = c.pointerArrayAt(archSlot(c.architecture, ACTION_TABLE_SLOT));
  const lists = c.actionLists();
  if (listTable === undefined || lists === undefined) {
    throw new ComposeError('base slot 10 does not read as lists');
  }
  listTable.values.forEach((address, li) => {
    const sites = c.actionListSites(address);
    const list = lists[li];
    if (sites === undefined || list === undefined) {
      throw new ComposeError(`action list ${li} does not read back for renumbering`);
    }
    list.forEach((instruction, k) => {
      const site = stateVariableSite(instruction);
      const where = sites[k];
      if (site === undefined || where === undefined || site.index < from) return;
      if (site.where === 'opcode') bytes[where.opcodeAt] = STATE_WRITE_BASE + site.index + 1;
      else bytes[where.operandAt] = site.index + 1;
    });
  });

  // The name tree's level 1 nodes, whose index is the variable.
  for (const node of nameNodes(c) ?? []) {
    if (node.level !== NAME_LEVEL_STATE_VARIABLE || node.index < from) continue;
    bytes.set(new Writer(2).u16(node.index + 1).bytes, node.start + 5);
  }
  return bytes;
}

/**
 * Where a new base slot 13 record goes: after the last existing record, where the generator
 * scatters them.
 *
 * Deliberately not at the section's start: the byte in front of base slot 13's table is the end of
 * the timer table's section, whose reader demands its counted array fill the gap to the next section
 * exactly, so a record wedged there drops the timer table out of the relocation census silently and
 * every timer pointer goes stale on the next insertion below it. Found by the screen half's pool
 * insertion, the first relocation below the timer records.
 */
function stateRecordEnd(c: Container): number {
  const states = stateTable(c);
  if (states === undefined) throw new ComposeError('base slot 13 does not read as a table');
  return Math.max(...states.entries.map((address) => {
    const off = c.blobOffsetOf(address);
    if (off === undefined) throw new ComposeError('a state record is outside the container');
    return off + STATE_RECORD_HEADER + STATE_VALUE_LENGTH * u16le(c.blob, off + 4);
  }));
}

/**
 * Name a state variable: a level 1 node appended to the name tree's frame, and the frame's own
 * length grown to say so. The tree is host side, base slots 0 and 1, so the order of its nodes is a
 * reader's question and every reader here goes by the index.
 */
function appendNameNode(c: Container, name: string, variable: number): Uint8Array {
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const treeSection = c.sections[archSlot(c.architecture, 0)];
  if (treeSection === undefined || c.frameLength === undefined) {
    throw new ComposeError('the container has no name tree to put the label in');
  }
  const treeStart = c.blobOffsetOf(treeSection.address);
  if (treeStart === undefined) throw new ComposeError('the name tree is outside the container');
  const nodeLength = 3 + 4 + name.length;
  const nodeAt = treeStart + c.frameLength;
  const nodeHole = relocate(c, nodeAt, nodeLength);
  const node = new Writer(nodeLength).u8(0xa7).u16(4 + name.length).u16(1).u16(variable);
  node.ascii(name);
  nodeHole.bytes.set(node.bytes, nodeAt);
  nodeHole.bytes.set(new Writer(3).u24(c.frameLength + nodeLength).bytes, treeStart + 2);
  return nodeHole.bytes;
}

/**
 * A power action as the ordered steps it performs: a single step is an action of one, and an empty
 * list is refused, since an action that sends nothing would leave the power variable's transition
 * pointing at a list that does nothing while every reader still finds a device there.
 */
function powerAction(
  given: ComposePowerStep | readonly ComposePowerStep[] | undefined, which: 'on' | 'off',
): readonly ComposePowerStep[] | undefined {
  if (given === undefined) return undefined;
  const steps = 'stated' in given ? [given] : given;
  if (steps.length === 0) throw new ComposeError(`a power ${which} action of no steps sends nothing`);
  return steps;
}

/** An action list of `0x7F` calls, one per list named, in order. */
function callingList(lists: readonly number[]): Writer {
  const body = new Writer(1 + 3 * lists.length).u8(lists.length);
  for (const list of lists) body.u16(list).u8(ACTION_LIST_INDEX_OPCODE);
  return body;
}

/**
 * Add one **one byte** state variable carrying transitions, named, and return where it landed.
 *
 * This is `composeDevice`'s power variable insertion lifted out unchanged so that a device's input
 * variables, `inputs.ts`, go in by the same route rather than a second copy of it, which is the state
 * `CLAUDE.md`'s oldest rule forbids. The reasons for each step are in `composeDevice`'s comments where
 * they were first measured, sections 276 and 277, and are summarised here:
 *
 * 1. the record goes after the last existing record, never at the section's start, `stateRecordEnd`;
 * 2. the pointer goes in at `narrow`, because no two byte variable in the corpus carries a transition,
 *    0 of 64 against 91 of 194 one byte ones, so every variable at or above `narrow` is renumbered
 *    first, `renumberStateVariables`;
 * 3. the header gains one variable and one narrow one, `wide` unchanged, `narrowAgain` moving with
 *    `narrow`;
 * 4. the name tree gains a level 1 node naming the new index.
 *
 * `record` is the whole record, header and transitions, already encoded. Its transitions may name
 * action lists that do not exist yet, since nothing here reads them; an **inline** state write inside
 * a transition names a variable by its opcode, and `renumberStateVariables` does not rewrite records,
 * so a caller writing one inline names a variable below `narrow`, which no later insertion moves.
 *
 * The bytes come back parseable and **not** restamped: the caller stamps once at the end.
 */
export function appendNarrowStateVariable(
  c: Container, record: Uint8Array, name: string,
): { bytes: Uint8Array; variable: number } {
  const states = stateTable(c);
  if (states === undefined) throw new ComposeError('base slot 13 does not read as a table');
  if (states.count < firmwareStateVariableMax(c.architecture) + 1) {
    throw new ComposeError("a table without the firmware's own variables is not one to extend");
  }
  const recordAt = stateRecordEnd(c);
  const recordHole = relocate(c, recordAt, record.length);
  recordHole.bytes.set(record, recordAt);
  const recordAddress = c.flashBase + recordAt;
  let current = parse(recordHole.bytes);

  const grownStates = stateTable(current);
  if (grownStates === undefined) throw new ComposeError('base slot 13 stopped reading');
  const variable = grownStates.narrow;
  // 1. Renumber first, while the table still has its old shape, so the walk sees the old indices.
  current = parse(renumberStateVariables(current, variable));
  // 2. Insert the pointer at the new variable's own position, which is where `narrow` was.
  const inserted = stateTable(current);
  if (inserted === undefined) throw new ComposeError('base slot 13 stopped reading after renumbering');
  const entryAt = inserted.start + STATE_TABLE_HEADER + 3 * variable;
  const entryHole = relocate(current, entryAt, 3);
  entryHole.bytes.set(new Writer(3).u24(recordAddress).bytes, entryAt);
  // 3. The header: one more variable, one more of them narrow, `wide` unchanged.
  entryHole.bytes.set(
    new Writer(8)
      .u16(inserted.count + 1)
      .u16(inserted.narrow + 1)
      .u16(inserted.wide)
      .u16(inserted.narrowAgain + 1).bytes,
    inserted.start);
  current = parse(entryHole.bytes);
  assertStateTableConsistent(current);
  // 4. The name.
  return { bytes: appendNameNode(current, name, variable), variable };
}

export function composeDevice(c: Container, device: ComposeDevice): ComposedDevice {
  if (device.label === '' || device.label.includes('_')
      || [...device.label].some((ch) => ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) > 0x7e)) {
    throw new ComposeError('a label is printable ASCII with no underscore, per the name grammar');
  }
  const power = device.power ?? 0;
  if (device.commands[power] === undefined) {
    throw new ComposeError(`command ${power} cannot toggle the power: there is no such command`);
  }
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');

  // The amount a power step's `0x7C` carries, the catalogue's inter key delay where the caller states
  // it, section 320; an ordinary command's stays 1. One byte of the operand, the group the other.
  const quantity = device.interKeyDelay ?? DEVICE_QUANTITY_DEFAULT;
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 0xff) {
    throw new ComposeError(`an inter key delay is 0 to 255 tenths of a second, not ${quantity}`);
  }

  // The power actions, each an ordered list of steps; a single step is an action of one.
  const onSteps = powerAction(device.powerOn, 'on');
  const offSteps = powerAction(device.powerOff, 'off');

  // The power steps, each a record after the commands, one per distinct step so that a toggle's two
  // transitions send one record, as Logitech's compile of a toggle does, and so that a step an action
  // states three times is one record called three times, as their compile of the Knoll's off does.
  const stepKey = (step: ComposePowerStep) => `${step.stated}|${step.holdMs ?? ''}`;
  const steps: ComposePowerStep[] = [];
  for (const step of [...(onSteps ?? []), ...(offSteps ?? [])]) {
    if (!steps.some((one) => stepKey(one) === stepKey(step))) steps.push(step);
  }
  const stepIndex = (step: ComposePowerStep) =>
    device.commands.length + steps.findIndex((one) => stepKey(one) === stepKey(step));
  const sends: ComposeCommand[] = [
    ...device.commands,
    ...steps.map((step): ComposeCommand => (step.holdMs === undefined
      ? { stated: step.stated, held: false, leadInUs: 0 }
      : { stated: step.stated, holdMs: step.holdMs })),
  ];

  // The infrared half, then everything else on the reparsed result.
  const group = composeIrGroup(c, sends);

  // One action list per command, in a hole below the action table, each named by a pointer appended
  // to the table. The list index is what the transitions below and phase 6's screen bindings point
  // at.
  //
  // **Two instructions and not one**, `u8 2; u16 (group << 8) | record; u8 0x7d;
  // u16 (group << 8) | amount; u8 0x7c`. This emitted the send alone until 8 September 2026 and the
  // result was a device that answered every button press and sent nothing when an activity asked
  // for it, on hardware. `DEVICE_QUANTITY`'s docstring carries the measurement, section 278: every
  // send list Logitech's generator wrote is this pair, none is bare, and the bare form is not sent
  // when an activity's state transition runs it. On arch 14 every real one also opens with a `0x7F`,
  // the delay step, which this emits since section 287; see below.
  let current = parse(group.bytes);

  // Arch 14: the device's two delays, each a variable and the base slot 14 table that maps it,
  // which every command's prelude and the power on list below name. Sections 287 and 288.
  const delay = c.architecture === SEND_PRELUDE_ARCHITECTURE
    ? composeDelays(current, group.group,
                    device.interDeviceDelay ?? INTER_DEVICE_DELAY_DEFAULT,
                    device.powerOnDelay ?? POWER_ON_DELAY_DEFAULT)
    : undefined;
  if (delay !== undefined) current = parse(delay.bytes);

  const actionSlot = archSlot(c.architecture, ACTION_TABLE_SLOT);
  const actionTable = current.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  // Each list is `u8 count` and three bytes per instruction. On arch 14 a send opens with a call,
  // so it is three instructions, and the device gains one delay list plus two lists per command,
  // laid out after the sends: delay, then load and condition for command 0, then for command 1;
  // then the power on delay list and the list the power variable runs to switch the device on,
  // which calls the power command and then that delay list.
  // Every record gets a send list, the power steps' after the commands', so `n` counts both.
  const n = sends.length;
  const firstList = actionTable.values.length;
  const sendBytes = delay === undefined ? 7 : 10;
  const delayList = firstList + n;
  const loadList = (k: number): number => delayList + 1 + 2 * k;
  const bodies: Writer[] = sends.map((_, k) => {
    const send = new Writer(sendBytes).u8(delay === undefined ? 2 : 3);
    if (delay !== undefined) send.u16(loadList(k)).u8(ACTION_LIST_INDEX_OPCODE);
    return send
      .u16((group.group << 8) | k).u8(SEND_INFRARED)
      .u16((group.group << 8) | (k < device.commands.length ? DEVICE_QUANTITY_DEFAULT : quantity))
      .u8(DEVICE_QUANTITY);
  });
  const powerDelayList = delayList + 1 + 2 * n;
  const onList = powerDelayList + 1;
  // The send list of each step of an action, in order, or of the power command where no action is
  // given, which is what the transitions below call.
  const sendListsOf = (action: readonly ComposePowerStep[] | undefined): number[] =>
    action === undefined ? [firstList + power] : action.map((step) => firstList + stepIndex(step));
  const onCalls = sendListsOf(onSteps);
  const offCalls = sendListsOf(offSteps);
  // An action of several steps gets a list of its own calling each step's send list in order, section
  // 320, laid out after everything above so that no index a caller already relies on moves. The off
  // action's is what the off transition runs, as in Logitech's compile of the Knoll; the on action's
  // is for a device page's power key only, since the on transition calls the steps itself.
  let nextList = delay === undefined ? firstList + n : onList + 1;
  const offAction = offCalls.length > 1 ? nextList++ : undefined;
  const onAction = onCalls.length > 1 ? nextList++ : undefined;
  if (delay !== undefined) {
    const spacing = delay.interDevice;
    bodies.push(new Writer(4).u8(1).u16((spacing.table << 8) | spacing.variable).u8(MAP_VALUE_OPCODE));
    sends.forEach((_, k) => {
      bodies.push(new Writer(7).u8(2)
        .u16(delay.loadOperand).u8(STATE_BAND)
        .u16(loadList(k) + 1).u8(ACTION_LIST_INDEX_OPCODE));
      bodies.push(new Writer(7).u8(2)
        .u16(delay.conditionOperand).u8(CONDITION_OPCODE)
        .u16(delayList).u8(ACTION_LIST_INDEX_OPCODE));
    });
    const waits = delay.powerOn;
    bodies.push(new Writer(4).u8(1).u16((waits.table << 8) | waits.variable).u8(MAP_VALUE_OPCODE));
    // The on list: every step of the on action, then the power on delay. For one step that is the
    // shape every arch 14 device Logitech compiled has, section 288. **For several it is inferred**:
    // the steps are called in this list directly rather than through the action's own list, which is
    // what the one step shape extends to, and no compile here switches a device on in several steps.
    bodies.push(callingList([...onCalls, powerDelayList]));
  }
  if (offAction !== undefined) bodies.push(callingList(offCalls));
  if (onAction !== undefined) bodies.push(callingList(onCalls));
  const listsAt = actionTable.start;
  const listsLength = bodies.reduce((sum, body) => sum + body.bytes.length, 0);
  const listsHole = relocate(current, listsAt, listsLength);
  const listAddresses: number[] = [];
  let listAt = listsAt;
  for (const body of bodies) {
    if (body.remaining !== 0) throw new ComposeError(`a list is ${body.remaining} bytes short`);
    listsHole.bytes.set(body.bytes, listAt);
    listAddresses.push(current.flashBase + listAt);
    listAt += body.bytes.length;
  }
  current = parse(appendTableEntries(parse(listsHole.bytes), actionSlot, listAddresses));

  // The power variable: a seven byte header and two transitions, each running the power command's
  // list, except that on arch 14 switching on runs the list that follows it with the power on delay,
  // as every compiled device there does, section 288. `first` is 0 because nothing is running when a config is generated, section 130, and the
  // maximum is 1 because a power switch has two states, which is also what the node's trailing
  // count states, section 86.
  const recordLength = STATE_RECORD_HEADER + STATE_VALUE_LENGTH * 2;
  // What performs each action: a step's own send list for an action of one, the action's own list for
  // several. The off transition runs `offSend`; the on transition runs the on list where there is a
  // power on delay to follow it, and `onSend` otherwise.
  const onSend = onAction ?? (onCalls[0] as number);
  const offSend = offAction ?? (offCalls[0] as number);
  const switchOn = delay === undefined ? onSend : onList;
  const record = new Writer(recordLength)
    .u16(0).u16(1).u16(2).u8(0)
    .u8(0).u16(0).u16(1).u16(switchOn).u8(ACTION_LIST_INDEX_OPCODE)
    .u8(0).u16(1).u16(0).u16(offSend).u8(ACTION_LIST_INDEX_OPCODE);

  // The state table is not a counted pointer array, so its append is spelled out: three bytes at
  // the end of its entry pointers, then the header at its start.
  //
  // **Two words move, not one, and getting that wrong produced a config the remote accepts and
  // ignores**, section 276. The new pointer goes on the end, so its index is at or above the
  // table's own `narrow` threshold and the variable is a wide one: `wide` has to say so. The
  // firmware sizes the variable storage as `narrow + 2 * wide` and **fills every byte above it with
  // `0xFE` at each boot**, while the seeding loop runs first and over `count`. So raising `count`
  // alone buys a variable that is seeded correctly and then painted over, holding 65278 rather than
  // the 0 its record states. That is what a device added to the spare Harmony One did: the activity
  // appeared on the menu, beeped, and started nothing, and the `0xFE` run on the connected remote
  // begins at exactly the byte this arithmetic predicts.
  //
  // **The pointer goes in at `narrow`, so the new variable is a one byte one**, section 277, which
  // is a reversal: appending it at the end made it a two byte variable, and **no two byte variable
  // anywhere in the corpus carries a transition**, 0 of 64, against 91 of 194 one byte ones. A
  // device's power variable is nothing but its transitions, so the appended shape is one Logitech's
  // generator has never emitted. Measured on hardware too: the appended version set its variable
  // correctly on a connected Harmony One and no code went out, where the same remote's own activity
  // drives the same television through variable 36, below `narrow`, with the same two transitions.
  //
  // The price is a renumbering, which is why the first attempt avoided it. Every variable at or
  // above `narrow` shifts up by one and every reference to one has to move with it, and those
  // references are real rather than spare: on the four programmed arch 12 (Harmony One) containers
  // the single top variable is named by 22 to 40 instructions. `renumberStateVariables` below is
  // that rewrite, and it is the reason this insertion is three steps rather than one.
  //
  // **The steps live in `appendNarrowStateVariable` since section 321**, where a device's input
  // variables needed the same insertion: one copy of the derivation rather than two, and the record
  // built here is handed over whole. The name tree node is `<label>_Power_2`, indexed by the new
  // variable.
  const appended = appendNarrowStateVariable(current, record.bytes, `${device.label}_Power_2`);
  const variable = appended.variable;
  const named = parse(appended.bytes);

  // The delay variables were appended at the end, so the renumbering moved them up by one, and the
  // delay lists' `0x72`s with them. Read back rather than assumed.
  const renumbered = (list: number, one: { variable: number; table: number }): number => {
    const mapped = named.actionLists()?.[list]?.[0];
    if (mapped?.opcode !== MAP_VALUE_OPCODE || mapped.operand >>> 8 !== one.table
        || (mapped.operand & 0xff) !== one.variable + 1) {
      throw new ComposeError(`delay list ${list} does not name its renumbered variable`);
    }
    return one.variable + 1;
  };
  const delays = delay === undefined ? {} : {
    delay: {
      variable: renumbered(delayList, delay.interDevice), table: delay.interDevice.table,
      list: delayList, identifier: delay.identifier,
    },
    powerOnDelay: {
      variable: renumbered(powerDelayList, delay.powerOn), table: delay.powerOn.table,
      list: powerDelayList, on: onList,
    },
  };

  return {
    bytes: restamped(named.blob),
    group: group.group,
    lists: device.commands.map((_, k) => firstList + k),
    ...(steps.length === 0 ? {} : { powerSteps: {
      ...(device.powerOn === undefined ? {} : { on: onSend }),
      ...(device.powerOff === undefined ? {} : { off: offSend }),
    } }),
    variable,
    ...delays,
  };
}

/*
 * ---- The arch 14 delays, sections 287 and 288 ----
 *
 * **Every command Logitech's compiler writes for a Harmony 600, 650 or 700 opens with a call**, and
 * a composed one did not until section 287. `SendPrelude` in `inventory.ts` is the reading: a private
 * list that loads 1, a private list that runs the device's delay list only while the configuration's
 * start sequence variable equals it, and the delay list, one `0x72` mapping the device's
 * `InterDeviceDelay_<identifier>` through a base slot 14 table whose case for each value queues that
 * many tenths for the device's group. So, by inference from three of the 650's start sequences and
 * not by measurement, inside an activity's start sequence each command waits the device's inter
 * device delay, and a key press in device mode does not.
 *
 * **And a device's power on list ends with its power on delay**, section 288, `PowerOnDelay` in
 * `inventory.ts`: the `Power` variable's off to on transition runs a list that calls the power
 * command and then one `0x72` mapping `PowerOnDelay_<identifier>` through a 451 case table, whose
 * case for each value up to 450 tenths queues that value as `0x7C` quantities for the device's group,
 * a hundred at a time, a case above 100 through a list of its own. The off transition sends a code of
 * the device with no delay; a composed device sends its power off action there, the catalogue's own since
 * section 320, or its one power command where none is given.
 *
 * A composed device gets the same pieces the compiler gives one, and nothing is shared with another
 * device except the start sequence variable, which is the configuration's. **Since section 319 none
 * of the three is copied**: the load and the condition are built, `SEND_PRELUDE_LOAD` and
 * `sendPreludeCondition` over the start variable the configuration's activities raise, both tables'
 * case order is `compilerCaseOrder`'s, and the identifier is `nextDeviceIdentifier`'s. Until then the
 * operands were copied off the configuration's own preludes and the power on order off one of its own
 * tables. **Two of the three are checked against what the configuration holds**: its preludes against
 * the built operands, and its power on tables against the built order, a disagreement being refused
 * rather than either side picked. The identifier is checked against nothing, since it only has to be
 * new, and the configuration's inter device tables are not checked against `INTER_DEVICE_DELAY_VALUES`.
 *
 * **What the change did to the refusals**, all in `composeDelays`. Two went: a configuration with no
 * power on delay table to copy an order off, and one whose first prelude's table did not read as an
 * inter device delay table, neither of which the composer needs any more. One came: the start variable
 * is read off the activities through `arch14Starts`, so composing a device on arch 14 now needs at
 * least one activity, every activity's enter list in the shape that reader accepts. Each of the
 * thirteen compiles has one; a configuration with no activity was composable before and is refused
 * now, with nothing in it to say which variable its commands should test.
 *
 * **What is deliberately not composed**: the device's other six delay variables, the defaults and the
 * two counter and flag pairs; the second table each device carries on each of its two delay
 * variables, whose cases call lists rather than queue a delay and whose reader is unread; and the
 * remote's "Set to default" page. That page is how `deviceIdOfGroup` joins a device to its
 * identifier, so `deviceDelays` still does not report a composed device.
 */

/** The architecture whose commands open with the prelude: arch 14, the Harmony 600, 650 and 700. */
const SEND_PRELUDE_ARCHITECTURE = 14;
/**
 * The inter device delay a composed device starts with, in tenths: 15 of the 17 devices with
 * commands Logitech compiled on the four distinct arch 14 configurations carry 5, one 10 and one 3.
 */
export const INTER_DEVICE_DELAY_DEFAULT = 5;
/**
 * The power on delay a composed device starts with, in tenths: 9 of the 15 devices with a `Power`
 * variable on the four distinct arch 14 configurations carry 15. The other six are 35 to 80, and they
 * include all four televisions, none of which carries 15, so a television is composed with the value
 * given rather than this.
 */
export const POWER_ON_DELAY_DEFAULT = 15;
/**
 * The highest value either delay variable states, on every one of them: the name ends `_65278`,
 * one more, like every variable's, section 86. Wider than either table, which is the compiler's.
 */
const DELAY_VARIABLE_MAX = 65277;
/** Base slot 14 records open with a byte the firmware steps over, 2 in every record of the corpus. */
const VALUE_MAP_LEAD = 2;

interface ComposedDelays {
  bytes: Uint8Array;
  identifier: number;
  loadOperand: number;
  conditionOperand: number;
  /** Both variables as numbered before the power variable's renumbering, and their tables. */
  interDevice: { variable: number; table: number };
  powerOn: { variable: number; table: number };
}

/**
 * A two byte state variable with no transitions, appended at the end of base slot 13 and named.
 *
 * All the compiled delay variables sit above `narrow`, though none is last, and appending means
 * `count` and `wide` both move and nothing is renumbered here.
 */
function appendDelayVariable(
  c: Container, name: string, first: number,
): { bytes: Uint8Array; variable: number } {
  const recordAt = stateRecordEnd(c);
  const recordHole = relocate(c, recordAt, STATE_RECORD_HEADER);
  recordHole.bytes.set(new Writer(STATE_RECORD_HEADER)
    .u16(first).u16(DELAY_VARIABLE_MAX).u16(0).u8(0).bytes, recordAt);
  let current = parse(recordHole.bytes);
  const states = stateTable(current);
  if (states === undefined) throw new ComposeError('base slot 13 stopped reading');
  const variable = states.count;
  if (variable >= STATE_WRITE_LIMIT) {
    throw new ComposeError(`a delay variable at ${variable} is past what a write opcode can name`);
  }
  const entryAt = states.start + STATE_TABLE_HEADER + 3 * variable;
  const entryHole = relocate(current, entryAt, 3);
  entryHole.bytes.set(new Writer(3).u24(current.flashBase + recordAt).bytes, entryAt);
  entryHole.bytes.set(new Writer(8)
    .u16(states.count + 1).u16(states.narrow).u16(states.wide + 1).u16(states.narrowAgain).bytes,
  states.start);
  current = parse(entryHole.bytes);
  assertStateTableConsistent(current);
  return { bytes: appendNameNode(current, name, variable), variable };
}

/**
 * Append action lists at the foot of the action table, where `composeDevice` puts its own, and
 * return the index of the first. Each list is its instructions, `[operand, opcode]`.
 */
function appendActionLists(
  c: Container, bodies: readonly (readonly [number, number])[][],
): { bytes: Uint8Array; first: number } {
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const slot = archSlot(c.architecture, ACTION_TABLE_SLOT);
  const table = c.pointerArrayAt(slot);
  if (table === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const writers = bodies.map((body) => {
    const one = new Writer(1 + 3 * body.length).u8(body.length);
    for (const [operand, opcode] of body) one.u16(operand).u8(opcode);
    return one;
  });
  const at = table.start;
  const hole = relocate(c, at, writers.reduce((sum, one) => sum + one.bytes.length, 0));
  const addresses: number[] = [];
  let next = at;
  for (const one of writers) {
    hole.bytes.set(one.bytes, next);
    addresses.push(c.flashBase + next);
    next += one.bytes.length;
  }
  return { bytes: appendTableEntries(parse(hole.bytes), slot, addresses), first: table.values.length };
}

/**
 * Append a base slot 14 record whose cases, in `keys`' order, run `programs`, one each.
 *
 * **Inserted in three steps, each leaving a container the census can walk**, the order
 * `composeActivityScreen` uses for its one base slot 14 case: a header pointer naming the last
 * record, then the record after the last record with every case naming one of that record's
 * programs, then the programs after the last record's programs, after which the pointers are swapped
 * onto what was composed. **Last and last**, because on all five arch 14 configurations a record's
 * address rises with its index and so does its first program's, and the last record's end and its
 * programs' end are where the records and the programs end; a configuration where either is not
 * true is refused rather than guessed at.
 *
 * Two offsets are read again after the insertion that moves them, and both were once reused, section
 * 287: the header's, which put the pointer into base slot 13, and the last record's programs', which
 * named every program 109 bytes short and led the census to read program bytes as pointer fields.
 */
function appendValueMap(
  c: Container, keys: readonly number[], programs: readonly Uint8Array[],
): { bytes: Uint8Array; table: number } {
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  if (keys.length !== programs.length || keys.length === 0) {
    throw new ComposeError('a base slot 14 record needs one program per case');
  }
  const slot = archSlot(c.architecture, VALUE_MAP_SLOT);
  const counter = VALUE_MAP_COUNT_WIDTH[c.architecture];
  const headerOf = (one: Container) => {
    const header = countedPointers(one, slot, VALUE_MAP_SECTION_COUNT_WIDTH);
    if (header === undefined) throw new ComposeError('base slot 14 does not read');
    return header;
  };
  if (counter === undefined) throw new ComposeError('base slot 14 does not read');
  const header = headerOf(c);
  const table = header.values.length;
  if (table === 0 || table >= 0xff) throw new ComposeError('base slot 14 is empty or full');

  // 1. A header pointer naming the last record, so the census sees a record there.
  const pointerAt = header.start + VALUE_MAP_SECTION_COUNT_WIDTH + 3 * table;
  const pointerHole = relocate(c, pointerAt, 3);
  pointerHole.bytes.set(new Writer(3).u24(header.values[table - 1] as number).bytes, pointerAt);
  pointerHole.bytes[header.start] = table + 1;
  let current = parse(pointerHole.bytes);

  // 2. The record, after the last one.
  const recordEnd = (one: { address: number; length: number }): number =>
    (current.blobOffsetOf(one.address) as number) + one.length;
  const records = (valueMaps(current) ?? []).slice(0, table);
  const previous = records.at(-1);
  if (previous === undefined || current.blobOffsetOf(previous.address) === undefined) {
    throw new ComposeError('base slot 14 stopped reading');
  }
  const tableAt = recordEnd(previous);
  if (records.some((one) => recordEnd(one) > tableAt)) {
    throw new ComposeError('the last base slot 14 record does not end where the records end');
  }
  const stride = VALUE_MAP_KEY_WIDTH + 3;
  const tableLength = 1 + counter + stride * keys.length + 1;
  current = parse(relocate(current, tableAt, tableLength).bytes);
  const stand = (valueMaps(current) ?? [])[table - 1]?.entries[0]?.[1];
  if (stand === undefined) throw new ComposeError('base slot 14 stopped reading');
  const record = new Writer(tableLength).u8(VALUE_MAP_LEAD);
  if (counter === 2) record.u16(keys.length);
  else record.u8(keys.length);
  for (const key of keys) record.u16(key).u24(stand);
  record.u8(0);
  if (record.remaining !== 0) throw new ComposeError(`the record is ${record.remaining} bytes short`);
  current.blob.set(record.bytes, tableAt);
  const moved = headerOf(current);
  current.blob.set(new Writer(3).u24(current.flashBase + tableAt).bytes,
                   moved.start + VALUE_MAP_SECTION_COUNT_WIDTH + 3 * table);
  current = parse(current.blob);

  // 3. The programs, after the last record's, then the cases swapped onto them.
  const programEnd = (target: number): number => {
    const last = screenProgram(current, target)?.at(-1);
    if (last === undefined) throw new ComposeError('a base slot 14 case does not read as a program');
    return last.start + last.length;
  };
  const before = (valueMaps(current) ?? []).slice(0, table);
  const lastRecord = before.at(-1);
  if (lastRecord === undefined) throw new ComposeError('base slot 14 stopped reading');
  const programsAt = Math.max(...lastRecord.entries.map(([, target]) => programEnd(target)));
  if (before.some((one) => one.entries.some(([, target]) => programEnd(target) > programsAt))) {
    throw new ComposeError("the last base slot 14 record's programs do not end where the programs end");
  }
  const programHole = relocate(current, programsAt, programs.reduce((sum, one) => sum + one.length, 0));
  const starts: number[] = [];
  let next = programsAt;
  for (const program of programs) {
    programHole.bytes.set(program, next);
    starts.push(next);
    next += program.length;
  }
  current = parse(programHole.bytes);
  const composed = valueMaps(current)?.[table];
  const composedAt = composed === undefined ? undefined : current.blobOffsetOf(composed.address);
  if (composedAt === undefined) throw new ComposeError('the composed record stopped reading');
  starts.forEach((start, k) => {
    current.blob.set(new Writer(3).u24(current.flashBase + start).bytes,
                     composedAt + 1 + counter + stride * k + VALUE_MAP_KEY_WIDTH);
  });
  return { bytes: parse(current.blob).blob, table };
}

/** A screen program queueing one action instruction, `0x11 operand opcode; end`. */
function queueing(operand: number, opcode: number): Uint8Array {
  return new Writer(5).u8(SCREEN_QUEUE_INSTRUCTION).u16(operand).u8(opcode).u8(OP_END).bytes;
}

/**
 * The identifier a device composed onto `c` takes, section 319: one more than the highest any of the
 * configuration's variable names carries.
 *
 * **What an identifier is**: Logitech's own key for the device on the account, eight digits, which
 * the compiler writes into the names of the device's delay variables, `PowerOnDelay_<identifier>`.
 * Nothing in the remote reads a name, and the composer emits none of section 303's programs that save
 * a device's delays in the settings store under a key of its own, so for a composed device it only has
 * to be a number no other device here carries, in the shape `stateVariables` reads back as an
 * identifier. Whether that key is derived from the identifier is unexamined, and matters once those
 * programs are composed.
 *
 * **Why one past the highest rather than any free number**: it is what Logitech's own numbering does
 * to a configuration. Their identifiers look like one counter on their side: the two test accounts'
 * devices interleave, 83915449 to 83915451 added on the Harmony 700's and 83915452 and 83915453 on the
 * 650's. On those two accounts' compiles, a device one compile holds and another of the same account
 * lacks is numbered above every device both hold, 17 such devices of 17; that is stronger than "added
 * devices come last", since it also says the devices removed again were the recent ones, which is how
 * the test accounts were used. Two accounts only, and no third has a pair of compiles. One past the
 * highest is that rule with their counter's gaps left out: the actual next identifiers were 5798 and
 * 1349 above it. This reads which numbers are taken, which is the input every composer reads to place
 * anything; the number itself is built, and is checked against nothing else in the configuration.
 *
 * A configuration that names no identifier is refused: a first identifier would be a choice of ours
 * with nothing to measure it against, and composing onto such a configuration has not come up.
 */
export function nextDeviceIdentifier(c: Container): number {
  const identifiers = deviceIds(c);
  if (identifiers.length === 0) throw new ComposeError('no variable here names a device identifier');
  const identifier = Math.max(...identifiers) + 1;
  // `stateVariables` reads six digits or more as an identifier and the compiler writes eight, so a
  // ninth digit would still read back; a number that would not is refused rather than written.
  if (!Number.isSafeInteger(identifier) || String(identifier).length < 6) {
    throw new ComposeError(`${identifier} would not read back as a device identifier`);
  }
  return identifier;
}

/**
 * Give a device on arch 14 its two delays: the variables, their names, the power on table's chunk
 * lists, and the two tables. The lists that name the tables are `composeDevice`'s.
 *
 * Both variables carry `nextDeviceIdentifier`'s identifier. The prelude's operands are built from the
 * start variable, which is the one thing about them the configuration decides, and both tables take
 * `compilerCaseOrder`'s case order; section 319.
 */
function composeDelays(c: Container, group: number, interDevice: number, powerOn: number): ComposedDelays {
  if (!Number.isInteger(interDevice) || !INTER_DEVICE_DELAY_VALUES.includes(interDevice)) {
    throw new ComposeError(`an inter device delay is 0 to 20 tenths of a second, not ${interDevice}`);
  }
  if (!Number.isInteger(powerOn) || powerOn < 0 || powerOn >= POWER_ON_DELAY_CASES) {
    throw new ComposeError(`a power on delay is 0 to 450 tenths of a second, not ${powerOn}`);
  }
  // The prelude's operands, built: the load is a constant and the condition compares the start
  // sequence variable, which is the one the configuration's activities raise for the length of their
  // start, section 289. The configuration's own preludes are checked against it, so a configuration
  // whose commands test some other variable is refused rather than given a second one.
  const loadOperand = SEND_PRELUDE_LOAD;
  const conditionOperand = sendPreludeCondition(arch14Starts(c).startVariable);
  for (const one of sendPreludes(c)) {
    if (one.loadOperand !== loadOperand || one.conditionOperand !== conditionOperand) {
      throw new ComposeError(`list ${one.list}'s prelude is not the one built for this configuration`);
    }
  }
  // The power on table's case order, built; the configuration's own tables are checked against it
  // for the same reason, one order on all 71 of the thirteen compiles.
  const order = POWER_ON_DELAY_VALUES;
  for (const one of powerOnDelays(c)) {
    if ((powerOnDelayCases(c, one.table) ?? []).map((k) => k.value).join() !== order.join()) {
      throw new ComposeError(`base slot 14 record ${one.table} is a power on delay table in another order`);
    }
  }

  const identifier = nextDeviceIdentifier(c);

  // The variables, power on first, which is the order the compiler numbers them in on 9 of the 15
  // devices and not a rule; nothing reads the order.
  const powered = appendDelayVariable(c, `PowerOnDelay_${identifier}_${DELAY_VARIABLE_MAX + 1}`, powerOn);
  const spaced = appendDelayVariable(parse(powered.bytes),
    `InterDeviceDelay_${identifier}_${DELAY_VARIABLE_MAX + 1}`, interDevice);
  let current = parse(spaced.bytes);

  // The lists a case above 100 calls, one per value from 101 to 450, laid out as the compiler lays
  // them out: contiguous and in the table's own case order, not in value order, on 15 of 15.
  const chunked = order.filter((value) => value > POWER_ON_DELAY_CHUNK);
  const chunks = appendActionLists(current, chunked.map((value) =>
    powerOnDelayAmounts(value).map((amount) => [(group << 8) | amount, DEVICE_QUANTITY] as const)));
  current = parse(chunks.bytes);
  const chunkOf = new Map(chunked.map((value, k) => [value, chunks.first + k]));

  const inter = appendValueMap(current, INTER_DEVICE_DELAY_VALUES,
    INTER_DEVICE_DELAY_VALUES.map((value) => queueing((group << 8) | value, QUEUE_INTER_DEVICE_DELAY)));
  current = parse(inter.bytes);
  const power = appendValueMap(current, order, order.map((value) => {
    if (value === 0) return Uint8Array.of(OP_END);
    const list = chunkOf.get(value);
    return list === undefined
      ? queueing((group << 8) | value, DEVICE_QUANTITY)
      : queueing(list, ACTION_LIST_INDEX_OPCODE);
  }));
  current = parse(power.bytes);

  // Both tables read back as what they are, through the readers the corpus was measured with.
  const spacing = interDeviceDelayCases(current, inter.table);
  if (spacing === undefined || spacing.length !== INTER_DEVICE_DELAY_VALUES.length
      || spacing.some((one) => one.group !== group || one.tenths !== one.value)) {
    throw new ComposeError('the composed inter device delay table does not read back as one');
  }
  const waits = powerOnDelayCases(current, power.table);
  if (waits === undefined || waits.length !== POWER_ON_DELAY_CASES
      || waits.some((one) => one.group !== group
        || one.amounts.join() !== powerOnDelayAmounts(one.value).join())) {
    throw new ComposeError('the composed power on delay table does not read back as one');
  }
  return {
    bytes: current.blob, identifier,
    loadOperand, conditionOperand,
    interDevice: { variable: spaced.variable, table: inter.table },
    powerOn: { variable: powered.variable, table: power.table },
  };
}

/**
 * One device's target state when an activity is running: a base slot 13 variable and its value.
 *
 * **A composer never names a code here and that is section 273's load bearing point**, restating
 * the anatomy's P4: the enter list writes the *device's* variable, and the code goes out because
 * that variable's transition runs the list that sends it. Over the corpus 424 of the 436 sends an
 * activity causes arrive that way and 12 are inline, so writing state is the design and an inline
 * send is the exception nobody has explained.
 */
export interface ComposeActivityTarget {
  /** A device state variable, in base slot 13's numbering, as `composeDevice` returns it. */
  readonly variable: number;
  /** The value the activity wants it in. Its transition is what sends the code. */
  readonly value: number;
}

export interface ComposeActivity {
  /**
   * The word the activity is known by, which the **screen half** draws on the menu page as pixels.
   *
   * **It deliberately does not take a device label's grammar**, and the first version of this
   * function did: it refused an underscore, which is right for a device because a state variable is
   * named `<label>_<property>_<values>` and the underscore is the separator that makes the label
   * recoverable. An activity has **no node in the name tree at all**, section 273, so that reason
   * does not transfer and the rule refused `Watch_TV` for nothing. Printable ASCII still holds,
   * since the glyph sets are what draw it.
   *
   * This function only checks and carries it. Nothing here writes it into the container, which is
   * why it comes back in `ComposedActivity`: the screen half is what draws it, and an unused field
   * with a rail in front of it is worse than no field.
   */
  readonly label: string;
  readonly targets: readonly ComposeActivityTarget[];
  /** The activity's keypad map: a scan code and the base slot 10 list its press runs. */
  readonly keys?: readonly { readonly scan: number; readonly list: number }[];
  /**
   * What tag 2, the leave handler, runs. Omitted emits the **null instruction**, opcode 0 with
   * operand 0, which is what 21 of the corpus's 50 activities carry, all on arch 8 and arch 9.
   * So the tag is required and giving it something to run is not. Section 273.
   */
  readonly leaveList?: number;
  /**
   * The activity key to put the new activity on, Watch TV, Watch a Movie or Listen to Music, section
   * 314. Harmony 600, 650 and 700 only, where it is one entry in base slot 9 entry 1 and a same length
   * edit made by `setActivityKey` after everything else here. Omitted leaves every key as it was, and
   * the activity is reachable from the menu only, which is what an activity on no key is on those
   * models. Whatever the key did before is replaced, an activity included; that one keeps its own
   * menu row and loses only the key.
   */
  readonly activityKey?: ActivityKey;
  /**
   * What tag 5 runs. Tag 5 is on all 50 activities and **always runs a real list**, so it cannot be
   * the null instruction the way tag 2 can. What fires it is read now, section 313: the activity
   * switch runs it when the activity asked for is the one already running, so it is what picking the
   * running activity again from the menu or an activity key does. This said "what fires it is not
   * established" until section 313.
   *
   * **On the Harmony 600, 650 and 700, with `screen` given, omitted builds Logitech's own shape**,
   * section 313, measured on 43 of the 43 activities Logitech compiled for those models: the start
   * variable set to 1, the enter list's **input** writes in the enter list's order, the flag set to 1,
   * the working screen entered directly, and the start variable back to 0. No start up screen, no power
   * write and no write of the activity counter, which is already right. Where tag 1 defers its working
   * screen behind `3F D000` so it waits for the infrared ahead of it, tag 5 runs that step directly,
   * which is Logitech's choice too; ours enters the working screen itself, because a composed activity
   * has no Remote Assistant branch to run instead, the form `h600_config` compiles.
   *
   * **Elsewhere omitted still points it at the enter list**, section 273's default and the reasoning
   * below, which replays the whole start including the start up screen. That includes the Harmony
   * One: a first look, which is not a test, finds its own tag 5 lists follow the same rule once the
   * lists they call are compared by content rather than by number, and until that is a test the
   * Harmony One keeps the default.
   *
   * What is measured over every architecture is the envelope, section 273: **the state writes in a tag 5 list are a subset
   * of the enter list's, on 50 of 50**, and the subset is **empty** on 24 of them. One candidate
   * rule dies on that same measurement, so it is not used here: "the enter list without the power
   * writes" matches 0 of 50. A second, "a **prefix** of the enter list", was written up as dying
   * too<!--superseded--> and does not: it holds on 28 of 50, though 24 of those are the empty case,
   * so the load bearing figure is **4 of the 26** that write anything, and it holds on every
   * activity of the four arch 8 containers. Too weak to build on and too strong to call refuted.
   * `ACTIVITY_START_TAG`'s docstring reads the handler off the sends it reaches rather than the
   * writes, as a re-send of the inputs with no power change.
   *
   * Omitted points it at the **enter list**, whose write set is trivially a subset of itself, so
   * the default sits inside the measured envelope instead of outside it. That it is *behaviourally*
   * right is still unestablished, and a caller that knows better should pass a list.
   */
  readonly resumeList?: number;
  /**
   * The activity's two screens, from `composeActivityScreen`, section 279. Given, the enter list
   * opens the way every Harmony One activity's does: enter the start up screen, cancel the timers,
   * write the state, say an activity is running, and enter the working screen **deferred**, through
   * the six byte `0x3F` band `0xD0` instruction every activity's chain uses, so it is not on until
   * the infrared ahead of it is out. Omitted, the enter list writes state and nothing else, which is
   * what this function produced until then and what left the remote on the page that started it.
   */
  readonly screen?: {
    readonly startupMode: number;
    readonly workingMode: number;
    /** Harmony One: the list every activity's enter list calls to say one is running. */
    readonly activeList?: number | undefined;
    /**
     * Harmony 600, 650 and 700: the variable the start sequence holds at 1 while it runs, the one it
     * writes 1 before deferring the working screen, and the base slot 9 entry the screen's keypad map
     * case selects, section 290. All three from `composeActivityScreen`.
     */
    readonly startVariable?: number | undefined;
    readonly flagVariable?: number | undefined;
    readonly set?: number | undefined;
    /** The value the screen's record case was composed for, checked against this activity's. */
    readonly activity: number;
  };
}

export interface ComposedActivity {
  bytes: Uint8Array;
  /** The value of the activity counter, which is what identifies the activity everywhere. */
  activity: number;
  /** The base slot 9 index of its keypad map, which is what a menu row selects. */
  set: number;
  /** The enter list, base slot 10, which is tag 1 and the whole start sequence. */
  enterList: number;
  /** The list a menu row has to run: it selects the set, and the set's tag 1 does the rest. */
  selectList: number;
  /**
   * The list tag 5 runs, picking the activity again while it runs: the caller's, the arch 14 list of
   * Logitech's shape, or the enter list, in that order of preference. Section 313.
   */
  resumeList: number;
  /** The label, carried through for the screen half to draw. Nothing in these bytes holds it. */
  label: string;
}

/**
 * Compose an activity: its number, its keypad map, its three handlers and its start sequence.
 *
 * The counterpart of `composeDevice`, and like that one it stops short of the screen. After this the
 * activity **exists and can be entered**, by running `selectList`; what it does not have is a row on
 * the activity menu or a drawn name, which is the screen half and lives in a separate function for
 * the same reason `composeDeviceScreen` does, since it is arch 12 shaped where this is not.
 *
 * **With `screen` it also shows the activity's two screens**, section 279, which on a Harmony One is
 * what separates an activity that looks like one from a set of key bindings. The screen itself is
 * `composeActivityScreen`'s, composed first; this only writes the enter list that uses it: the start
 * up screen first and every timer cancelled, as all 60 real enter lists open, then the writes,
 * then the list every activity calls to say one is running, and last a deferred call that enters the
 * working screen once what is queued ahead of it has gone.
 *
 * The four changes, in the order the container stays parseable through them, of which only the
 * first two and the last make room:
 *
 * 1. the action lists, in one hole below base slot 10's table, with their pointers appended
 * 2. the base slot 9 entry, its tagged list in a hole below that section, pointer appended
 * 3. the activity counter's `second`, raised **in place**, which needs no room
 * 4. the counter's name tree node, whose trailing value count is text and may get longer
 *
 * **The entry is appended and that is safe rather than convenient**, section 273: an entry's
 * position in base slot 9 does not encode its activity number, none of the ten corpus containers
 * with several activities having its entries in value order. The number is carried by the write
 * inside the enter list and by nothing structural.
 *
 * **What this does not do is emit a second binding on arch 14.** An activity there is bound by two
 * keys and by one on the other three architectures, section 273, but that is a property of the
 * *menu row*, which is the screen half's job. This function produces the one thing a row points at.
 */
export function composeActivity(c: Container, activity: ComposeActivity): ComposedActivity {
  if (activity.label === ''
      || [...activity.label].some((ch) => ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) > 0x7e)) {
    throw new ComposeError('an activity label is printable ASCII, which is what the glyphs draw');
  }
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');

  const variable = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  const record = variable?.record;
  if (variable === undefined || record === undefined) {
    throw new ComposeError(`no ${ACTIVITY_STATE_NAME} variable to add an activity to`);
  }
  if (record.count !== 0) {
    // Every activity record in the corpus carries zero transitions, so raising `second` is a two
    // byte poke. One with transitions would need them extended to cover the new value, which is a
    // length change, and refusing is better than writing a record whose values stop short.
    throw new ComposeError('the activity counter carries transitions, which this does not extend');
  }
  const value = record.second + 1;

  const states = stateTable(c);
  if (states === undefined) throw new ComposeError('base slot 13 does not read as a table');
  // The highest value each variable takes, so a target can be checked against its own range rather
  // than only against the count of variables. A variable whose record does not read is left out and
  // its target passes, which is deliberate: refusing on a reader's silence would make this rail
  // fire on a container this composer has no other complaint about.
  const ranges = new Map(stateVariables(c)
    .filter((one) => one.record !== undefined)
    .map((one) => [one.index, (one.record as { second: number }).second]));
  for (const target of activity.targets) {
    if (target.variable <= firmwareStateVariableMax(c.architecture)) {
      throw new ComposeError(
        `variable ${target.variable} is the firmware's, and an activity may not write one`);
    }
    if (target.variable >= states.count) {
      throw new ComposeError(`variable ${target.variable} is past the ${states.count} that exist`);
    }
    if (target.variable >= STATE_WRITE_LIMIT) {
      // The index is the low **seven** bits of the opcode, so 128 is where a write silently becomes
      // an instruction of another band rather than a bad write.
      //
      // **This is unreachable on every container that exists and is kept anyway**, which the audit
      // of 6 September 2026 established rather than assumed: the check above refuses anything at or
      // above `states.count`, and the largest base slot 13 in this corpus holds 94 variables. So the
      // format allows 128 and no sample comes within 34 of it. It stays because it guards the
      // **encoding** rather than the corpus, and the day a container has 130 variables the other
      // check stops refusing and this is the only thing between a write and another band's opcode.
      throw new ComposeError(
        `variable ${target.variable} cannot be written: the opcode carries seven bits of index`);
    }
    if (target.variable === variable.index) {
      // Writing the counter as if it were a device defeats the ordering the enter list depends on,
      // since the reader takes the **first** write of the counter it finds and would then report a
      // device's value as the activity's.
      throw new ComposeError('the activity counter is not a device an activity can put into a state');
    }
    if (target.value > (ranges.get(target.variable) ?? target.value)) {
      // A value outside the variable's own range matches no transition, so the device is never
      // driven and the activity is silently dead. Exactly the failure this composer's design note
      // is about: state is what sends the code.
      throw new ComposeError(
        `variable ${target.variable} does not take the value ${target.value}`);
    }
  }
  if (variable.index >= STATE_WRITE_LIMIT) {
    throw new ComposeError('the activity counter is past the index a state write can carry');
  }
  if (activity.activityKey !== undefined) {
    // Checked before anything is built, so a key this configuration cannot take refuses the whole
    // composition rather than leaving a composed activity and a refusal behind. It is the same location
    // the edit at the end uses: the architecture, entry 1 and the key's press entry.
    try {
      activityKeyEntry(c, activity.activityKey);
    } catch (error) {
      throw new ComposeError(`the activity cannot go on ${activity.activityKey}: ${(error as Error).message}`);
    }
  }

  // Every list index a caller hands over is checked against base slot 10 before anything is
  // written. `composeDevice` does the same for its power command, and the reason is the same: an
  // index past the end names no list, the entry still parses, and the key does nothing at all.
  const existingLists = c.actionLists()?.length;
  if (existingLists === undefined) throw new ComposeError('base slot 10 does not read as lists');
  const named: [string, number | undefined][] = [
    ['the leave handler', activity.leaveList],
    ['the resume handler', activity.resumeList],
    ...(activity.keys ?? []).map((key): [string, number] => [`the key on scan ${key.scan}`, key.list]),
  ];
  for (const [what, index] of named) {
    if (index === undefined) continue;
    if (!Number.isInteger(index) || index < 0 || index >= existingLists) {
      throw new ComposeError(`${what} names list ${index} of ${existingLists} that exist`);
    }
  }

  const sets = handlerSets(c);
  if (sets === undefined) throw new ComposeError('base slot 9 does not read as a table');
  const set = sets.addresses.length;
  if (set >= 0xff) {
    // Two separate one byte ceilings, and this said `set > 0xff`<!--superseded--> until the audit of
    // 6 September 2026, which is off by one in the direction that does damage: at 255 existing
    // entries the count written below is 256, `Writer.u8` masks that to **0**, and the section reads
    // back as holding nothing. So the last usable index is 254. The largest base slot 9 in the
    // corpus holds 17 entries, so nothing is near it, which is exactly why the bound had to be
    // reasoned about rather than measured.
    throw new ComposeError('base slot 9 is full: its count and the selector operand are one byte');
  }

  // ---- 1. the action lists ----
  //
  // The enter list writes each device's target and then the counter, in that order, because the
  // counter is what the four hop reader finds and a reader that stopped at the first write would
  // otherwise report a device value as the activity. The select list is one instruction and is
  // what a menu row runs.
  let current = c;
  const actionSlot = archSlot(c.architecture, ACTION_TABLE_SLOT);
  const actionTable = current.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const firstList = actionTable.values.length;
  const enterList = firstList;
  const selectList = firstList + 1;
  // With a screen, two more: the working screen's entry, and the deferred call that reaches it. The
  // corpus shape is a two slot list of the `0xD0` instruction and a `0x7F`, 73 of 73 over thirteen
  // Harmony One configurations, one per activity called from its enter list, so the payload is a call
  // and not the `0x7E` itself. **Ours is not the corpus's in two ways**, section 279: every real
  // payload calls `{1F:FB02, 7F:...}`, the Remote Assistant's branch, where ours enters the working
  // screen directly, and every real enter list ends with a further call into that branch, which ours
  // leaves out. So the composed activity skips the Remote Assistant's question.
  const screen = activity.screen;
  // On arch 14 (Harmony 600, 650 and 700) the start sequence has another shape, section 290: no timer
  // cancel and no "an activity is running" list, and instead a variable held at 1 while it runs, which
  // gates the inter device delay, and a flag written 1 before the working screen is deferred. And the
  // deferred list enters the working screen itself, `h600_config`'s form, where the Harmony One's calls
  // a list that does.
  const fourSlot = c.architecture === 14;
  if (screen !== undefined) {
    if (screen.activity !== value) {
      throw new ComposeError(`the screen was composed for activity ${screen.activity}, this is ${value}`);
    }
    if (fourSlot) {
      if (screen.set !== set) {
        throw new ComposeError(`the screen selects keypad map ${screen.set}, and this activity's is ${set}`);
      }
      for (const [what, index] of [['start', screen.startVariable], ['flag', screen.flagVariable]] as const) {
        if (index === undefined || !Number.isInteger(index) || index <= firmwareStateVariableMax(c.architecture)
            || index >= Math.min(states.count, STATE_WRITE_LIMIT)) {
          throw new ComposeError(`the ${what} variable ${index} is not one an enter list can write`);
        }
      }
    } else {
      for (const [what, index] of [['the active list', screen.activeList]] as const) {
        if (index === undefined || !Number.isInteger(index) || index < 0 || index >= existingLists) {
          throw new ComposeError(`${what} names list ${index} of ${existingLists} that exist`);
        }
      }
    }
  }
  const showList = firstList + 2;
  const deferList = fourSlot ? firstList + 2 : firstList + 3;

  const opening = screen === undefined ? 0 : 2;
  const closing = screen === undefined ? 0 : fourSlot ? 3 : 2;
  const enterBody = new Writer(1 + 3 * (opening + activity.targets.length + 1 + closing));
  enterBody.u8(opening + activity.targets.length + 1 + closing);
  if (screen !== undefined) {
    enterBody.u16(screen.startupMode).u8(ENTER_MODE);
    if (fourSlot) enterBody.u16(1).u8(STATE_WRITE_BASE + (screen.startVariable as number));
    else enterBody.u16(CANCEL_TIMERS.operand).u8(CANCEL_TIMERS.opcode);
  }
  for (const target of activity.targets) {
    enterBody.u16(target.value).u8(STATE_WRITE_BASE + target.variable);
  }
  enterBody.u16(value).u8(STATE_WRITE_BASE + variable.index);
  if (screen !== undefined && fourSlot) {
    enterBody.u16(1).u8(STATE_WRITE_BASE + (screen.flagVariable as number));
    enterBody.u16(deferList).u8(ACTION_LIST_INDEX_OPCODE);
    enterBody.u16(0).u8(STATE_WRITE_BASE + (screen.startVariable as number));
  } else if (screen !== undefined) {
    enterBody.u16(screen.activeList as number).u8(ACTION_LIST_INDEX_OPCODE);
    enterBody.u16(deferList).u8(ACTION_LIST_INDEX_OPCODE);
  }
  const selectBody = new Writer(4)
    .u8(1).u16(SELECT_BINDING_SET_MASK | set).u8(SELECT_BINDING_SET);
  const extra = screen === undefined ? [] : fourSlot ? [
    new Writer(7).u8(2).u16(DEFERRED.operand).u8(DEFERRED.opcode)
      .u16(screen.workingMode).u8(ENTER_MODE).bytes,
  ] : [
    new Writer(4).u8(1).u16(screen.workingMode).u8(ENTER_MODE).bytes,
    new Writer(7).u8(2).u16(DEFERRED.operand).u8(DEFERRED.opcode)
      .u16(showList).u8(ACTION_LIST_INDEX_OPCODE).bytes,
  ];
  // Tag 5, picking the running activity again, section 313. On arch 14 with a screen, and only when the
  // caller names no list of its own, it gets a list of its own in Logitech's shape: `S := 1`, the input
  // writes, `F := 1`, the working screen entered directly, `S := 0`. What it leaves out is the point:
  // the start up screen, which tag 1 enters first and would show again to somebody who only picked the
  // activity a second time; every power write, so nothing is switched; and the counter write, which
  // already holds this activity. The inputs stay because Logitech keeps them. What they are for is a
  // reading rather than a measurement: putting a device back on the activity's input after somebody
  // changed it by hand, which needs a write of a variable's current value to fire its transition, and
  // whether it does is unread, section 313.
  //
  // **An input is recognised by its name**, `deviceVariables`' property, since that is the only thing
  // in the file that says what a variable tracks. A target whose property is neither is left out: no
  // configuration Logitech compiled for these models writes any other property in a start, so there is
  // no example to follow, and leaving it out keeps tag 5's writes inside tag 1's, which is the
  // envelope section 273 measured on every architecture.
  //
  // The inputs are written **inline** in the targets' own order, the same instructions the enter list
  // carries. Logitech's tag 5 reuses whatever tag 1 has, an inline write or a call to a list of them,
  // and our tag 1 writes every target inline, so this is that rule applied to ours.
  const ownResume = fourSlot && screen !== undefined && activity.resumeList === undefined;
  const inputs = new Set(deviceVariables(c).filter((one) => one.property === INPUT_PROPERTY)
    .map((one) => one.index));
  const resumeTargets = activity.targets.filter((one) => inputs.has(one.variable));
  const resumeBody = new Writer(1 + 3 * (4 + resumeTargets.length));
  if (ownResume) {
    resumeBody.u8(4 + resumeTargets.length);
    resumeBody.u16(1).u8(STATE_WRITE_BASE + (screen.startVariable as number));
    for (const target of resumeTargets) resumeBody.u16(target.value).u8(STATE_WRITE_BASE + target.variable);
    resumeBody.u16(1).u8(STATE_WRITE_BASE + (screen.flagVariable as number));
    resumeBody.u16(screen.workingMode).u8(ENTER_MODE);
    resumeBody.u16(0).u8(STATE_WRITE_BASE + (screen.startVariable as number));
  }
  const bodies = [enterBody.bytes, selectBody.bytes, ...extra, ...(ownResume ? [resumeBody.bytes] : [])];
  // It is the last list appended, so its index is the first list's plus everything before it.
  const ownResumeList = firstList + bodies.length - 1;

  const listsAt = actionTable.start;
  const listsHole = relocate(current, listsAt, bodies.reduce((sum, one) => sum + one.length, 0));
  const starts: number[] = [];
  let cursor = listsAt;
  for (const one of bodies) {
    listsHole.bytes.set(one, cursor);
    starts.push(current.flashBase + cursor);
    cursor += one.length;
  }
  current = parse(appendTableEntries(parse(listsHole.bytes), actionSlot, starts));

  // ---- 2. the base slot 9 entry ----
  //
  // A tagged list in the narrow form: `u8 count` then `{ u8 tag; u16 operand; u8 opcode }`. Three
  // handlers of event type 0 and one press per key.
  // A caller's own list wins, then the arch 14 list built above, then section 273's default.
  const resumeList = activity.resumeList ?? (ownResume ? ownResumeList : enterList);
  const entries: { tag: number; operand: number; opcode: number }[] = [
    { tag: HANDLER_TAG_ENTER, operand: enterList, opcode: ACTION_LIST_INDEX_OPCODE },
    activity.leaveList === undefined
      ? { tag: HANDLER_TAG_LEAVE, operand: 0, opcode: 0 }
      : { tag: HANDLER_TAG_LEAVE, operand: activity.leaveList, opcode: ACTION_LIST_INDEX_OPCODE },
    { tag: HANDLER_TAG_RESUME, operand: resumeList, opcode: ACTION_LIST_INDEX_OPCODE },
  ];
  const bound = new Set<number>();
  for (const key of activity.keys ?? []) {
    if (!Number.isInteger(key.scan) || (key.scan & ~SCAN_MASK) !== 0) {
      // `Number.isInteger` rather than the mask alone, since a bitwise `&` truncates: 63.5 passed
      // the mask and became 63, which is a different button.
      throw new ComposeError(`scan ${key.scan} does not fit the six bits a key code gives it`);
    }
    if (bound.has(key.scan)) {
      // Two entries with one tag in a tagged list, where the reader takes the first and the second
      // is unreachable. A silently ignored binding is the failure class this whole file is about.
      throw new ComposeError(`scan ${key.scan} is bound twice in one keypad map`);
    }
    bound.add(key.scan);
    entries.push({
      tag: (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | key.scan,
      operand: key.list,
      opcode: ACTION_LIST_INDEX_OPCODE,
    });
  }
  if (entries.length > 0xff) throw new ComposeError('a narrow tagged list states its count in a byte');

  // **Base slot 9's append is spelled out rather than going through `appendTableEntries`**, and
  // that is not a style choice: it is `u8 count` then `u24 address[count]` but it is **not** one of
  // the six counted pointer arrays `pointerArrayAt` recognises, because that reader demands the
  // count and the pointers account for the section **exactly** and here the tagged lists sit in the
  // same section behind them. So the helper returns undefined for this slot on every architecture.
  //
  // Two relocations in the order that keeps the container parseable: the tagged list first, into a
  // hole immediately below the section, where it is unreferenced filler until the pointer names it;
  // then the three bytes of pointer at the array's own end, and the count byte last.
  const entryBody = new Writer(1 + 4 * entries.length).u8(entries.length);
  for (const one of entries) entryBody.u8(one.tag).u16(one.operand).u8(one.opcode);
  const sets2 = handlerSets(current);
  if (sets2 === undefined) throw new ComposeError('base slot 9 stopped reading');
  const bodyAt = sets2.start;
  const bodyHole = relocate(current, bodyAt, entryBody.bytes.length);
  bodyHole.bytes.set(entryBody.bytes, bodyAt);
  const entryAddress = current.flashBase + bodyAt;
  current = parse(bodyHole.bytes);

  const sets3 = handlerSets(current);
  if (sets3 === undefined) throw new ComposeError('base slot 9 stopped reading after its content');
  const pointerAt = sets3.start + sets3.length;
  const pointerHole = relocate(current, pointerAt, 3);
  pointerHole.bytes.set(new Writer(3).u24(entryAddress).bytes, pointerAt);
  pointerHole.bytes.set(new Writer(1).u8(sets3.addresses.length + 1).bytes, sets3.start);
  current = parse(pointerHole.bytes);

  // ---- 3. the counter's own record ----
  //
  // `second` is the `u16` at +0x02 and the record carries no values, so this is a poke with no
  // relocation. Re-read the table rather than reusing the offset from before, since everything
  // above has moved.
  const grownStates = stateTable(current);
  const moved = grownStates?.entries[variable.index];
  if (grownStates === undefined || moved === undefined) {
    throw new ComposeError('base slot 13 stopped reading');
  }
  const recordAt = current.blobOffsetOf(moved);
  if (recordAt === undefined) throw new ComposeError('the activity record is outside the container');
  const withSecond = Uint8Array.from(current.blob);
  withSecond.set(new Writer(2).u16(value).bytes, recordAt + 2);
  current = parse(withSecond);

  // ---- 4. the name tree's stated value count ----
  //
  // The node is `CurrentActivityState_0_<values>` and the number is `second + 1`, section 86's rule
  // over every named variable. It is **text**, so raising it can lengthen the node, which is why
  // this is a relocation and not another poke.
  const node = (nameNodes(current) ?? [])
    .find((one: NameNode) => one.name.startsWith(ACTIVITY_STATE_NAME));
  const treeSection = current.sections[archSlot(c.architecture, 0)];
  if (node === undefined || treeSection === undefined || current.frameLength === undefined) {
    throw new ComposeError('the container has no name tree to state the activity count in');
  }
  const treeStart = current.blobOffsetOf(treeSection.address);
  if (treeStart === undefined) throw new ComposeError('the name tree is outside the container');
  const renamed = `${node.name.slice(0, node.name.lastIndexOf('_') + 1)}${value + 1}`;
  const grew = renamed.length - node.name.length;
  const nameAt = node.start + NAME_NODE_HEADER;
  const nameHole = grew === 0
    ? { bytes: Uint8Array.from(current.blob) }
    : relocate(current, nameAt + node.name.length, grew);
  nameHole.bytes.set(new Writer(renamed.length).ascii(renamed).bytes, nameAt);
  nameHole.bytes.set(new Writer(2).u16(4 + renamed.length).bytes, node.start + 1);
  if (grew !== 0) {
    nameHole.bytes.set(new Writer(3).u24(current.frameLength + grew).bytes, treeStart + 2);
  }

  // ---- 5. the activity key, when one was asked for ----
  //
  // Last, because it is the one same length edit here and the only step that needs every structure
  // above to read: it checks that `set` is an activity by reading the enter handler this function just
  // wrote. `applyEdits` recomputes the trailer itself, so the restamp before it is what lets its own
  // check, that the input's checksum agrees with its bytes, pass.
  let bytes = restamped(nameHole.bytes);
  if (activity.activityKey !== undefined) {
    const finished = parse(bytes);
    bytes = applyEdits(finished, setActivityKey(finished, activity.activityKey, set)).bytes;
  }

  return {
    bytes, activity: value, set, enterList, selectList, resumeList,
    label: activity.label,
  };
}

/*
 * ---- The screen half, Harmony One (arch 12) only ----
 *
 * Every shape below is the corpus's own, measured off `one_config`'s device modes in the lab notes
 * of 25 August 2026: the six row slots of a device page and where their labels sit, the chrome
 * program a page calls for its title and top bar, the two row layouts of the device list menus,
 * and the three instruction row that enters a device mode. The positions are the layout of the
 * model's screen rather than of one config, which is why they are constants; the pictures are per
 * config and are taken from the pages that already draw them.
 */

/** The touch scans of the six command slots of a device page, rows top to bottom, left then
 *  right, which is hit page order and also the order the corpus draws the labels in. */
const DEVICE_PAGE_SCANS = [48, 49, 50, 51, 52, 53] as const;
/** Where each slot's button background is drawn, `[x, y]`, same index as the scans. */
const DEVICE_PAGE_SLOTS: readonly (readonly [number, number])[] = [
  [0x06, 0x26], [0x59, 0x26], [0x06, 0x5c], [0x59, 0x5c], [0x06, 0x92], [0x59, 0x92],
];
/** A slot's label sits twenty pixel rows below its background's top, uniformly in the corpus. */
const DEVICE_LABEL_DROP = 20;
/** The title of a mode, `(x, y)` of its first glyph. */
const MODE_TITLE_X = 0x06;
const MODE_TITLE_Y = 0x04;
/**
 * The fonts, as base slot 7 indices. The corpus titles its device modes with font 10, and that set
 * carries only the glyphs the existing titles use, so a new title would be refused for most words;
 * font 9 is the row font, the same height, and the one set that carries the whole alphabet the
 * config draws anywhere. The menus label their rows with font 7.
 */
const DEVICE_ROW_FONT = 9;
const DEVICE_TITLE_FONT = 9;
const MENU_ROW_FONT = 7;
/** A menu row's label is left aligned at this x; the third row's label and background y. */
const MENU_LABEL_X = 0x3f;
const MENU_ROW3_LABEL_Y = 0xa5;
const MENU_ROW3_BG: readonly [number, number] = [0x06, 0x92];
/**
 * The first row of a device list page, section 240: its background, the device icon drawn a pixel
 * in from the background's corner, and the label's baseline. The rows sit `MENU_ROW_PITCH` apart,
 * so row `k` is each of these plus `54 * k`, which is how a row's icon is found for reuse.
 */
const MENU_ROW1_BG: readonly [number, number] = [0x06, 0x26];
const MENU_ICON_OFFSET: readonly [number, number] = [5, 1];
const MENU_ROW1_LABEL_Y = 0x39;
/**
 * The rows' pixel pitch, which is `screen.ts`'s and not a number of this file's own: the two were
 * the same 54 in two places until 7 September 2026, which is the state `isa.py`'s docstring forbids.
 */
const MENU_ROW_PITCH = SCREEN_ROW_PITCH;
/** Where a page draws its own number, top left, and the `/` that follows it. */
const MENU_COUNTER_XY: readonly [number, number] = [13, 18];
const MENU_COUNTER_SLASH_X = 18;
/** The scan codes of a device list hit page, rows first, then the bottom key, then the two edges. */
const MENU_ROW_SCAN = 48;
const MENU_EDGE_SCANS: readonly [number, number] = [46, 47];
/** The two row layouts of a device list page, as base slot 17 hit page indices, section 125. */
/**
 * The scan codes a device list hit page offers, in order, per row count it supports.
 *
 * **The lead byte is an index into the config's own hit map table and never a layout**, section
 * 125, so a number here would be per config: the three row page is index 12 in `one_config` and in
 * the spare's own configuration, 4 in the protocol campaign compiles, and the two row page is 13 in
 * the first and 15, 16, 17 and more in the second. The composer used 12 and 13 and got the spare's
 * three row page right by luck. So a page is matched on **what its hit page offers** instead.
 *
 * A page's rows sit on the lowest scans, the **left bottom key** on the next one up, and the last two
 * are the two rectangles either side of the display. So the row count is the area count minus three,
 * and this table is that spelled out rather than computed, since the order is what a match needs.
 *
 * **Neither of those is a page flip and this file said the fourth one was**, until 7 September 2026,
 * when Danny corrected it from the remote in his hand and section 275 measured it. A Harmony One
 * turns a list's pages with the two buttons **beside** the display, which are scans 46 and 47, and
 * **no mode page in either configuration binds either of them**, 0 bindings over 778 pages, so the
 * paging is answered above the page and never on it. The rectangle above the edges is the left of the
 * two physical buttons **below** the display, which in device mode the screen labels "Activities";
 * every one of the 29 device list pages here binds it, all 29 through opcode `0x72`, which
 * `actions.ts` names as mapping a state variable's value rather than as any kind of flip. The right
 * bottom button has no rectangle at all on a device list page, which is Logitech's way of saying it
 * is not enabled there.
 */
const MENU_HIT_AREAS: readonly (readonly number[])[] = [
  [48, 49, 46, 47],
  [48, 49, 50, 46, 47],
  [48, 49, 50, 51, 46, 47],
];
/** How many device rows a hit page offering `areas` supports, or undefined if it is not one. */
function menuRowCapacity(areas: readonly number[]): number | undefined {
  const at = MENU_HIT_AREAS.findIndex(
    (want) => want.length === areas.length && want.every((code, k) => areas[k] === code),
  );
  return at < 0 ? undefined : at + 1;
}
/** The device page layout: six command slots, the bottom pair and the side keys. */
const DEVICE_PAGE_LEAD = 10;
/** The beeper's operand on every menu row in the corpus, opcode 0x75, section 73. */
const ROW_BEEP_OPERAND = 0x0fca;
/** Opcode 0x7e: enter the mode the operand indexes. */
const ENTER_MODE = 0x7e;
/** Opcode 0x75: the beeper, which every menu row in the corpus opens with. */
const BEEP_OPCODE = 0x75;
/**
 * What an **activity** row writes into the device mode marker, against a device row's 1.
 *
 * The value is ours and the variable is not: section 239 measured eight different variables across
 * fourteen configurations, so `activityMenus` reads the instruction off a row the config already
 * carries and this supplies only the operand. Section 275.
 */
const ACTIVITY_MENU_MARKER_VALUE = 0;
/**
 * A menu row ends by writing 1 into the variable that marks device mode, and **which variable that
 * is differs per configuration**, eight values across fourteen configs, section 239. So the composer
 * reads it off the rows the config already has rather than carrying a number.
 */
/** The marker itself is read by `deviceModeMarker` in `inventory.ts`; this file only writes it. */
/** Screen language opcodes, spelled here because the writer emits them as bytes. */
const OP_END = 0x00;
const OP_IMAGE = 0x02;
const OP_TEXT_AT = 0x04;
const OP_TEXT_INLINE = 0x05;
const OP_FONT = 0x10;
const OP_SWITCH = 0x12;
const OP_RETURN = 0x17;
const OP_CALL = 0x16;

/** A command as it appears on the device's page: the row's word. */
export interface ComposeRow {
  readonly label: string;
  /** The base slot 10 list the row runs, from `ComposedDevice.lists`. */
  readonly list: number;
}

export interface ComposedScreen {
  bytes: Uint8Array;
  /** The new mode's index in base slot 6's table, which is what a menu row's 0x7e names. */
  mode: number;
  /** The device list modes that gained a row, by table index. */
  menus: readonly number[];
  /** The base slot 10 list the new menu rows run: beep, enter the mode, mark device mode. */
  rowList: number;
  /** The menus whose last page was full, so a new one row page was added to each, section 240. */
  pagesAdded: number[];
  /** Arch 14 only: how many row lists were written, from `rowList` on, one per menu binding and copy. */
  rowLists?: number;
  /** Arch 14 only: how many keys of the new device mode's key map send one of its commands. */
  keys?: number;
  /** Arch 14 only: how many pages the new device mode has. */
  pages?: number;
}

/** The glyph codes that spell `text` in `set`, or a refusal naming the first missing character. */
function codesFor(
  map: NonNullable<ReturnType<typeof characterMap>>,
  c: Container, set: FontSet, text: string, font: number,
): number[] {
  const out: number[] = [];
  for (const ch of text) {
    let found: number | undefined;
    for (const [code, char] of map.codes) {
      if (char !== ch || glyphOf(c, set, code) === undefined) continue;
      found = code;
      break;
    }
    if (found === undefined) {
      throw new ComposeError(`font ${font} has no glyph for '${ch}', so it cannot be drawn`);
    }
    if (found >= 0x80) throw new ComposeError(`'${ch}' has a wide glyph code, which no string here uses`);
    out.push(found);
  }
  return out;
}

/** The pixels a run of codes occupies: glyph widths summed, the letter gap being a glyph column. */
function textWidth(c: Container, set: FontSet, codes: readonly number[]): number {
  return codes.reduce((sum, code) => sum + (glyphOf(c, set, code)?.width ?? 0), 0);
}

/**
 * The device list menus: the modes whose rows enter a device mode, kept to the ones that list
 * every device. A row is the measured three instruction shape, and a mode qualifies when it
 * reaches as many distinct device modes as any mode does, which is what separates the all device
 * menus from the per activity ones that list two or three. A config with one device cannot tell
 * those apart, and this composer is calibrated on a config with five.
 */
function deviceListMenus(
  c: Container,
): { menus: number[]; reach: number; marker: Instruction | undefined } {
  const lists = c.actionLists() ?? [];
  const marker = deviceModeMarker(c);
  const records = modeRecords(c) ?? [];
  let deepest = 0;
  const reached = records.map((record) => {
    const modes = new Set<number>();
    for (const page of record.pages) {
      const list = taggedList(c, page.list);
      for (const entry of list?.entries ?? []) {
        if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
        const mode = deviceListRowMode(lists[entry.operand], c.architecture, marker);
        if (mode !== undefined) modes.add(mode);
      }
    }
    deepest = Math.max(deepest, modes.size);
    return modes.size;
  });
  const menus: number[] = [];
  reached.forEach((size, index) => {
    if (size === deepest && size > 0) menus.push(index);
  });
  return { menus, reach: deepest, marker };
}

/** The first op 2 drawing at `(x, y)` in the program at `address`, as a picture address. */
function pictureDrawnAt(
  c: Container, address: number, x: number, y: number,
): number | undefined {
  for (const i of screenProgram(c, address) ?? []) {
    if (i.opcode === OP_IMAGE && i.operands[0] === x && i.operands[1] === y) {
      return u24(i.operands, 2);
    }
  }
  return undefined;
}

/**
 * The icon a device list row draws, for a row labelled `iconLike`, so a new row for a television
 * can wear the television icon the configuration already carries. A row is the picture drawn a
 * pixel in from its background's corner, and its rank on the page is its scan code above 48.
 */
function menuIconLike(c: Container, iconLike: string): number {
  const row = deviceListRows(c).find((one) => one.label === iconLike);
  if (row === undefined) {
    throw new ComposeError(`no device list row is labelled ${iconLike}, so there is no icon to copy`);
  }
  const page = modeRecords(c)?.[row.menu]?.pages[row.page];
  if (page === undefined) throw new ComposeError(`the row labelled ${iconLike} has no page`);
  const rank = row.scan - MENU_ROW_SCAN;
  const icon = pictureDrawnAt(c, page.program,
    MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0], MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1] + MENU_ROW_PITCH * rank);
  if (icon === undefined) throw new ComposeError(`the row labelled ${iconLike} draws no icon`);
  return icon;
}

/** The four numbers a hit rectangle is, for comparing two areas by geometry rather than identity. */
function sameRectangle(a: TouchArea, b: TouchArea): boolean {
  return a.x === b.x && a.width === b.width && a.y === b.y && a.height === b.height;
}

/**
 * The hit page offering exactly `wanted`, area for area and code for code: an existing one where the
 * configuration has it, and otherwise one composed after the last, and its index in the table, which
 * is what a page record's lead byte states.
 *
 * **One step for every menu page builder**, since the device list's and the activity menu's each
 * carried a copy of it until section 293 added a third caller. Composed the way both did it: the table
 * gains a pointer first, at an existing page, so the census knows the slot before the areas exist;
 * then the areas and the header go in after the last hit page, each area ending in its own address;
 * then the pointer is swapped in place.
 */
function withHitPage(
  start: Container, wanted: readonly (readonly [number, TouchArea])[],
): { container: Container; lead: number } {
  let current = start;
  const hits = touchPages(current);
  const any = hits?.records[0];
  if (hits === undefined || any === undefined) throw new ComposeError('the hit map stopped reading');
  const found = hits.records.findIndex((page) => page.areas.length === wanted.length
    && wanted.every(([code, want], k) => page.areas[k]?.code === code
      && sameRectangle(page.areas[k] as TouchArea, want)));
  if (found >= 0) return { container: current, lead: found };
  const lead = hits.records.length;
  // Not `appendTableEntries`: that helper wants the slot's whole extent to be the table, and here the
  // section's extent runs on past the pointers, so the table is grown off what `touchPages` read
  // instead, a byte of count and three per page.
  const tableAt = hits.start + hits.length;
  const grownTable = relocate(current, tableAt, 3);
  grownTable.bytes.set(new Writer(3).u24(any.address).bytes, tableAt);
  grownTable.bytes[hits.start] = hits.records.length + 1;
  current = parse(grownTable.bytes);
  const before = touchPages(current);
  if (before === undefined) throw new ComposeError('the hit map stopped reading');
  const at = Math.max(...before.records.map((page) => page.start + page.length));
  const base = current.flashBase + at;
  const page = new Writer(wanted.length * TOUCH_AREA_LENGTH + 1 + 3 * wanted.length);
  wanted.forEach(([code, want], k) => {
    page.u16(want.x).u16(want.width).u16(want.y).u16(want.height).u8(code)
      .u24(base + TOUCH_AREA_LENGTH * k);
  });
  page.u8(wanted.length);
  wanted.forEach((_, k) => { page.u24(base + TOUCH_AREA_LENGTH * k); });
  const hole = relocate(current, at, page.bytes.length);
  hole.bytes.set(page.bytes, at);
  const placed = parse(hole.bytes);
  const table = touchPages(placed);
  if (table === undefined) throw new ComposeError('the hit map stopped reading');
  placed.blob.set(new Writer(3).u24(base + wanted.length * TOUCH_AREA_LENGTH).bytes,
                  table.start + 1 + 3 * lead);
  current = parse(placed.blob);
  const grown = touchPages(current)?.records[lead];
  if (grown === undefined || grown.areas.length !== wanted.length) {
    throw new ComposeError('the composed hit page does not read back');
  }
  return { container: current, lead };
}

/**
 * Add a one row page to a device list menu whose last page is full, section 240, the way
 * Logitech's compiler lays a seventh device out: pages of three and the last page short.
 *
 * Everything the page needs is read off the menu's own pages rather than carried as a constant,
 * because section 239 found three constants that were per configuration: the chrome program and
 * the row background off the first page, the bottom key's binding and its switch off the last
 * page, and the fonts off the instructions that select them. Five insertions, each leaving the
 * container parseable:
 *
 * 1. a hit page offering one row, found by geometry or composed from the full page's rectangles,
 *    since a short page's bottom key rectangle is the full page's, measured on two configurations;
 * 2. the page list's pool copy, right after the last page's, because the copies pair with the
 *    pages positionally, section 69;
 * 3. the page list itself, at the end of the run every page list lives in;
 * 4. three bytes in the mode entry for the page's pointer, a placeholder until the record exists,
 *    for the reason step 2 of `composeDeviceScreen` gives;
 * 5. the block: program, page counter tail, the two bottom key arms copied with their addresses
 *    restamped, and the page record, in the order every corpus page keeps them.
 */
function composeMenuPage(
  start: Container, menu: number, rowList: number, label: string, iconLike: string | undefined,
): Container {
  let current = start;
  const recordOf = (c: Container) => {
    const record = modeRecords(c)?.[menu];
    if (record === undefined) throw new ComposeError(`menu ${menu} stopped reading`);
    return record;
  };
  const record = recordOf(current);
  const lastBefore = record.pages.at(-1);
  if (lastBefore === undefined) throw new ComposeError(`menu ${menu} has no page`);

  // 1. The hit page. A one row page offers the top row, the bottom key and the two edges, and
  // its bottom key rectangle is the one the full page puts on its own bottom key.
  const hits = touchPages(current);
  const full = hits?.records[lastBefore.lead as number];
  if (hits === undefined || full === undefined) throw new ComposeError('the hit map stopped reading');
  const areaOf = (code: number): TouchArea => {
    const area = full.areas.find((one) => one.code === code);
    if (area === undefined) throw new ComposeError(`menu ${menu}'s hit page offers no scan ${code}`);
    return area;
  };
  const rowCount = menuRowCapacity(full.areas.map((area) => area.code));
  if (rowCount === undefined) throw new ComposeError(`menu ${menu}'s hit page is not a row layout`);
  const wanted: readonly (readonly [number, TouchArea])[] = [
    [MENU_ROW_SCAN, areaOf(MENU_ROW_SCAN)],
    [MENU_ROW_SCAN + 1, areaOf(MENU_ROW_SCAN + rowCount)],
    [MENU_EDGE_SCANS[0], areaOf(MENU_EDGE_SCANS[0])],
    [MENU_EDGE_SCANS[1], areaOf(MENU_EDGE_SCANS[1])],
  ];
  const hitPage = withHitPage(current, wanted);
  current = hitPage.container;
  const lead = hitPage.lead;

  // 2. What the page copies off the menu: the bottom key's binding, the chrome call, the row
  // background and icon, the fonts, and whatever the page draws after its rows, which is the
  // bottom key and the page counter in one of two shapes: a switch on a state variable with two
  // arms, or the same drawn plain. Read off the container as it is now, since step 1 may have
  // moved every page above the hole: an address read before an insertion below it is stale.
  const first = recordOf(current).pages[0];
  const last = recordOf(current).pages.at(-1);
  if (first === undefined || last === undefined) throw new ComposeError(`menu ${menu} has no page`);
  const lastList = taggedList(current, last.list);
  const bottom = lastList?.entries.filter((entry) => entry.tag === (0x80 | (MENU_ROW_SCAN + rowCount)));
  if (lastList === undefined || bottom === undefined || bottom.length !== 1) {
    throw new ComposeError(`menu ${menu}'s last page binds its bottom key ${bottom?.length ?? 0} times`);
  }
  const bottomKey = bottom[0] as { opcode: number; operand: number };
  const program = screenProgram(current, last.program) ?? [];
  if (program[0]?.opcode !== OP_CALL) {
    throw new ComposeError(`menu ${menu}'s page program does not open with the chrome call`);
  }
  const isLabelAt = (one: { opcode: number; operands: Uint8Array }, y: number): boolean =>
    (one.opcode === OP_TEXT_INLINE || one.opcode === OP_TEXT_AT)
    && one.operands[0] === MENU_LABEL_X && one.operands[1] === y;
  const lastLabel = program.findIndex((one) =>
    isLabelAt(one, MENU_ROW1_LABEL_Y + MENU_ROW_PITCH * (rowCount - 1)));
  if (lastLabel < 0) throw new ComposeError(`menu ${menu}'s last page draws no label on its last row`);
  const afterRows = program.slice(lastLabel + 1);
  const closing = afterRows.at(-1);
  if (closing === undefined) throw new ComposeError(`menu ${menu}'s page program ends on a row`);
  const rowFont = screenProgram(current, first.program)?.find((one) => one.opcode === OP_FONT)?.operands[0];
  if (rowFont === undefined) {
    throw new ComposeError(`menu ${menu}'s first page selects no font this can copy`);
  }
  // The page counter: a number at the top left and a `/` beside it, in one font, wherever the
  // shape puts them. The number is drawn afresh for the new page and the `/` is the shared string.
  const counterFont = (tail: readonly { opcode: number; operands: Uint8Array }[]): number | undefined => {
    let font: number | undefined;
    for (const one of tail) {
      if (one.opcode === OP_FONT) font = one.operands[0];
      if (one.opcode === OP_TEXT_AT && one.operands[1] === MENU_COUNTER_XY[1]) return font;
    }
    return undefined;
  };
  const isNumber = (one: { opcode: number; operands: Uint8Array }): boolean =>
    one.opcode === OP_TEXT_AT && one.operands[1] === MENU_COUNTER_XY[1]
    && one.operands[0] !== MENU_COUNTER_SLASH_X;
  const map = characterMap(current);
  const sets = fontSets(current) ?? [];
  const rowSet = sets[rowFont];
  if (map === undefined || rowSet === undefined) {
    throw new ComposeError('the config does not carry the fonts the menu page uses');
  }
  const labelCodes = codesFor(map, current, rowSet, label, rowFont);
  const pageNumber = String(record.pages.length + 1);

  // 3. The list, twice: the pool copy after the last page's own copy, then the list at the end of
  // the page list run. The copy goes first because the pool sits below everything else here.
  const listBytes = new Writer(1 + 4 * 2).u8(2)
    .u8(0x80 | MENU_ROW_SCAN).u16(rowList).u8(ACTION_LIST_INDEX_OPCODE)
    .u8(0x80 | (MENU_ROW_SCAN + 1)).u16(bottomKey.operand).u8(bottomKey.opcode);
  const pages = modePages(current);
  const lastIndex = pages.findIndex((one) => one.address === last.address);
  const copyOff = pageListCopies(current)[lastIndex];
  const copyLength = copyOff === undefined
    ? undefined : taggedList(current, copyOff + current.flashBase)?.length;
  if (copyOff === undefined || copyLength === undefined) {
    throw new ComposeError(`menu ${menu}'s last page has no pool copy`);
  }
  const copyHole = relocate(current, copyOff + copyLength, listBytes.bytes.length);
  copyHole.bytes.set(listBytes.bytes, copyOff + copyLength);
  current = parse(copyHole.bytes);
  const listAt = Math.max(...modePages(current).map((page) => {
    const off = current.blobOffsetOf(page.list);
    const list = taggedList(current, page.list);
    return off === undefined || list === undefined ? 0 : off + list.length;
  }));
  const listHole = relocate(current, listAt, listBytes.bytes.length);
  listHole.bytes.set(listBytes.bytes, listAt);
  current = parse(listHole.bytes);

  // 4. The entry's new pointer, at the last page until the record exists, and the count with it.
  const entryRecord = recordOf(current);
  const entryOff = current.blobOffsetOf(entryRecord.address);
  const lastNow = entryRecord.pages.at(-1);
  if (entryOff === undefined || lastNow === undefined) throw new ComposeError('a menu entry moved out of reach');
  const slotAt = entryOff + 6 + 3 * entryRecord.pageCount;
  // The list sits above the entry on the Harmony One, so the three bytes move it; anything else
  // the block embeds is read after this, off the container as it then is.
  const pageListAddress = current.flashBase + listAt + (listAt >= slotAt ? 3 : 0);
  const entryHole = relocate(current, slotAt, 3);
  entryHole.bytes.set(new Writer(3).u24(lastNow.address).bytes, slotAt);
  entryHole.bytes.set(new Writer(2).u16(entryRecord.pageCount + 1).bytes, entryOff + 4);
  current = parse(entryHole.bytes);

  // 5. The block, right after the last real page record. Everything it copies is re-read here,
  // after the three relocations above, and its embedded addresses are then shifted by the block's
  // own length where they sit at or above the hole, the arithmetic step 5 of `composeDeviceScreen`
  // applies.
  const realLast = recordOf(current).pages[entryRecord.pageCount - 1];
  const realLastOff = realLast === undefined ? undefined : current.blobOffsetOf(realLast.address);
  if (realLast === undefined || realLastOff === undefined) throw new ComposeError('a menu page moved out of reach');
  const nowProgram = screenProgram(current, realLast.program) ?? [];
  const nowAfterRows = nowProgram.slice(lastLabel + 1);
  const nowClosing = nowAfterRows.at(-1);
  if (nowClosing === undefined || nowClosing.opcode !== closing.opcode) {
    throw new ComposeError('a menu page program changed shape while being copied');
  }
  const firstNow = recordOf(current).pages[0];
  const chromeAddress = u24((nowProgram[0] as { operands: Uint8Array }).operands, 0);
  const bg = firstNow === undefined ? undefined : pictureDrawnAt(current, firstNow.program, ...MENU_ROW1_BG);
  const icon = firstNow === undefined ? undefined : iconLike === undefined
    ? pictureDrawnAt(current, firstNow.program,
      MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0], MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1])
    : menuIconLike(current, iconLike);
  if (bg === undefined || icon === undefined) {
    throw new ComposeError(`menu ${menu}'s first page does not draw a row this can copy`);
  }
  const blockAt = realLastOff + 7;
  const base = current.flashBase + blockAt;
  let blockLength = 0;
  const shifted = (address: number): number => (address >= base ? address + blockLength : address);
  // One instruction copied: the same bytes with any address it embeds restamped. Anything with an
  // address this does not know how to restamp is refused rather than copied stale.
  const copied = (one: { opcode: number; start: number; length: number }, jumpTo?: number): Uint8Array => {
    const bytes = Uint8Array.from(current.blob.slice(one.start, one.start + one.length));
    if (one.opcode === OP_TEXT_AT || one.opcode === OP_IMAGE) {
      bytes.set(new Writer(3).u24(shifted(u24(bytes, 3))).bytes, 3);
    } else if (one.opcode === OP_CALL) {
      bytes.set(new Writer(3).u24(shifted(u24(bytes, 1))).bytes, 1);
    } else if (one.opcode === SCREEN_JUMP) {
      if (jumpTo === undefined) throw new ComposeError('a jump where the corpus keeps none');
      bytes.set(new Writer(3).u24(jumpTo).bytes, 1);
    } else if (one.opcode !== OP_FONT && one.opcode !== OP_END && one.opcode !== OP_TEXT_INLINE) {
      throw new ComposeError(`menu ${menu}'s page tail holds opcode 0x${one.opcode.toString(16)}`);
    }
    return bytes;
  };
  const numberInline = (font: number | undefined): Uint8Array => {
    // The font table is read afresh: `sets` above was read before three relocations moved every
    // glyph, and a set read before an insertion below it is stale by that insertion.
    const set = font === undefined ? undefined : (fontSets(current) ?? [])[font];
    if (font === undefined || set === undefined) {
      throw new ComposeError(`menu ${menu}'s page counter selects no font this can spell from`);
    }
    const codes = codesFor(map, current, set, pageNumber, font);
    const out = new Writer(3 + codes.length + 1);
    out.u8(OP_TEXT_INLINE).u8(MENU_COUNTER_XY[0]).u8(MENU_COUNTER_XY[1]);
    codes.forEach((code) => out.u8(code));
    out.u8(0);
    return out.bytes;
  };
  const head = new Writer(4 + 6 + 6 + 2 + 3 + labelCodes.length + 1);
  const row = (): Uint8Array => head.bytes;
  const programHead = 4 + 6 + 6 + 2 + (3 + labelCodes.length + 1);
  // Lengths first, so the shift is known before any address is written.
  let pieces: Uint8Array[] = [];
  const tailPieces: (() => Uint8Array)[] = [];
  if (nowClosing.opcode === OP_END) {
    // Plain: the bottom key label and the counter sit in the program itself. Copied instruction
    // by instruction with the number redrawn.
    let tailLength = 0;
    for (const one of nowAfterRows) {
      if (isNumber(one)) {
        const font = counterFont(nowAfterRows);
        const inline = numberInline(font);
        tailLength += inline.length;
        tailPieces.push(() => inline);
      } else {
        tailLength += one.length;
        tailPieces.push(() => copied(one));
      }
    }
    blockLength = programHead + tailLength + 7;
  } else if (nowClosing.opcode === OP_SWITCH && nowAfterRows.length === 1
             && nowClosing.operands[1] === 2 && nowClosing.operands[2] === 0 && nowClosing.operands[6] === 1) {
    // Switched: the program closes on a two arm switch, the counter is the program the arms jump
    // to, right after the switch, and the arms follow it. All three copied, the jumps retargeted.
    const armAddresses = [u24(nowClosing.operands, 3), u24(nowClosing.operands, 7)];
    const tailStart = current.flashBase + nowClosing.start + nowClosing.length;
    const tail = screenProgram(current, tailStart) ?? [];
    if (tail.at(-1)?.opcode !== OP_END) throw new ComposeError(`menu ${menu}'s page counter does not end`);
    const arms = armAddresses.map((address) => {
      const instructions = screenProgram(current, address) ?? [];
      const end = instructions.findIndex((one) => one.opcode === SCREEN_JUMP);
      if (end < 0) throw new ComposeError(`menu ${menu}'s bottom key arm does not end in a jump`);
      return instructions.slice(0, end + 1);
    });
    const font = counterFont(tail);
    const inline = numberInline(font);
    const tailLength = tail.reduce((sum, one) => sum + (isNumber(one) ? inline.length : one.length), 0);
    const armLengths = arms.map((arm) => arm.reduce((sum, one) => sum + one.length, 0));
    blockLength = programHead + 12 + tailLength + (armLengths[0] as number) + (armLengths[1] as number) + 7;
    const tailAddress = base + programHead + 12;
    const armA = tailAddress + tailLength;
    const armB = armA + (armLengths[0] as number);
    tailPieces.push(() => new Writer(12).u8(OP_SWITCH).u8(nowClosing.operands[0] as number).u8(2)
      .u8(0).u24(armA).u8(1).u24(armB).u8(0).bytes);
    for (const one of tail) tailPieces.push(() => (isNumber(one) ? inline : copied(one)));
    for (const arm of arms) for (const one of arm) tailPieces.push(() => copied(one, tailAddress));
  } else {
    throw new ComposeError(`menu ${menu}'s page program does not end the way the corpus ends one`);
  }
  // Now the addresses, with the shift settled.
  head.u8(OP_CALL).u24(shifted(chromeAddress));
  head.u8(OP_IMAGE).u8(MENU_ROW1_BG[0]).u8(MENU_ROW1_BG[1]).u24(shifted(bg));
  head.u8(OP_IMAGE).u8(MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0]).u8(MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1])
    .u24(shifted(icon));
  head.u8(OP_FONT).u8(rowFont);
  head.u8(OP_TEXT_INLINE).u8(MENU_LABEL_X).u8(MENU_ROW1_LABEL_Y);
  labelCodes.forEach((code) => head.u8(code));
  head.u8(0);
  pieces = [row(), ...tailPieces.map((piece) => piece())];
  const pageRecordAddress = base + blockLength - 7;
  pieces.push(new Writer(7).u8(lead).u24(shifted(pageListAddress)).u24(base).bytes);
  const block = new Writer(blockLength);
  for (const piece of pieces) piece.forEach((byte) => block.u8(byte));
  if (block.bytes.length !== blockLength) {
    throw new ComposeError(`the menu page block is ${block.bytes.length} bytes, not the ${blockLength} counted`);
  }
  const blockHole = relocate(current, blockAt, blockLength);
  blockHole.bytes.set(block.bytes, blockAt);
  const placed = parse(blockHole.bytes);
  const swapRecord = modeRecords(placed)?.[menu];
  const swapOff = swapRecord === undefined ? undefined : placed.blobOffsetOf(swapRecord.address);
  if (swapRecord === undefined || swapOff === undefined) throw new ComposeError('a menu entry moved out of reach');
  placed.blob.set(new Writer(3).u24(pageRecordAddress).bytes, swapOff + 6 + 3 * (swapRecord.pageCount - 1));
  // 6. The paging: the header's total restated, the new page's number where the one it was copied
  // from had none, and the page turn keys brought back if the menu had one page. Until section 293
  // this function stopped at step 5 and left "2 pages" on nine device lists of three on the spare.
  return paginate(parse(placed.blob), menu);
}

/**
 * Where a multi page screen's header draws its page total, and the word after it, `(x, y)` of the
 * first glyph, on arch 12 (Harmony One). Every page of such a screen draws its own number on row 18
 * ending where the `/` at `MENU_COUNTER_SLASH_X` begins, and the header it calls draws the total and
 * "pages" after them, so the screen reads "2/3 pages". Section 293, over the six Harmony One
 * containers: the header's total equals the page count on 58 of 58 multi page screens, and none of
 * the 598 one page screens' headers draws a total.
 */
const MENU_TOTAL_XY: readonly [number, number] = [0x17, 0x12];
const MENU_TOTAL_WORD_X = 0x23;
/** The two page turn keys, the rectangles either side of the display, section 275. */
const PAGE_TURN_SCANS: readonly number[] = MENU_EDGE_SCANS;

/** The glyphs a text instruction draws, inline or by reference, or undefined for anything else. */
function textGlyphs(c: Container, one: ScreenInstruction): Uint8Array | undefined {
  if (one.opcode === OP_TEXT_INLINE) return one.glyphs;
  if (one.opcode === OP_TEXT_AT) return glyphsReferencedBy(c, one);
  return undefined;
}

/** The text instruction a program draws at `(x, y)`, its index and the font in effect there. */
function textAt(
  program: readonly ScreenInstruction[], x: number, y: number,
): { index: number; font: number | undefined } | undefined {
  let font: number | undefined;
  for (let index = 0; index < program.length; index += 1) {
    const one = program[index] as ScreenInstruction;
    if (one.opcode === OP_FONT) font = one.operands[0];
    if ((one.opcode === OP_TEXT_INLINE || one.opcode === OP_TEXT_AT)
        && one.operands[0] === x && one.operands[1] === y) {
      return { index, font };
    }
  }
  return undefined;
}

/**
 * A page's own number: the text drawn on the counter's row left of the slash. **It is not at a fixed
 * place**, since the number is right aligned against the slash: it ends at x 18 on every page of every
 * multi page Harmony One screen, a "4" starting at 12 because its glyph is a pixel wider and a "10" at
 * 8. So it is found by its row and its side of the slash, and placed by its width. Section 293.
 */
function numberAt(
  program: readonly ScreenInstruction[],
): { index: number; font: number | undefined } | undefined {
  let font: number | undefined;
  for (let index = 0; index < program.length; index += 1) {
    const one = program[index] as ScreenInstruction;
    if (one.opcode === OP_FONT) font = one.operands[0];
    if ((one.opcode === OP_TEXT_INLINE || one.opcode === OP_TEXT_AT)
        && one.operands[1] === MENU_COUNTER_XY[1] && (one.operands[0] as number) < MENU_COUNTER_SLASH_X) {
      return { index, font };
    }
  }
  return undefined;
}

/** The screen program a page calls first, its header, as an address, or undefined without one. */
function headerOf(c: Container, page: ModePage): number | undefined {
  const first = screenProgram(c, page.program)?.[0];
  return first?.opcode === OP_CALL ? u24(first.operands, 0) : undefined;
}

/**
 * Where a page's counter is drawn: the page's own program, or, on a device list page that closes on
 * a switch, the program its arms jump back to, which is the byte after the switch on 80 of 80 such
 * pages, 73 of them on screens of several pages. **That is not always where the number is**: on 7 of the 73 what follows is a second switch, so
 * the walk follows the arms until they rejoin at a program that ends plainly. Section 293.
 */
function counterProgram(c: Container, page: ModePage): number {
  let at = page.program;
  for (let hops = 0; hops < 8; hops += 1) {
    const closing = (screenProgram(c, at) ?? []).at(-1);
    if (closing?.opcode !== OP_SWITCH) return at;
    const arm = closing.targets[0] === undefined ? undefined : screenProgram(c, closing.targets[0]);
    const jump = arm?.at(-1);
    if (jump?.opcode !== SCREEN_JUMP || jump.targets[0] === undefined) {
      throw new ComposeError('a page\'s switch has an arm that does not jump back');
    }
    at = jump.targets[0];
  }
  throw new ComposeError('a page\'s switches do not rejoin');
}

/** What a configuration's own multi page screens draw their paging in, read rather than assumed. */
interface PagingStyle {
  /** The font a page's number and slash are drawn in. */
  counterFont: number;
  /** The font the header's total and word are drawn in. */
  totalFont: number;
  /** The word after the total, in this configuration's language. */
  word: string;
}

/**
 * The paging style of a configuration, off the first multi page screen that draws all of it.
 *
 * **A font holds only the glyphs its configuration draws**, section 275, so the digits, the slash and
 * the word are spelled in the fonts a screen of this configuration already spells them in, and the
 * word is read rather than written in English. A configuration with no multi page screen at all has
 * nothing to copy, and paging is refused rather than drawn in a font that may not have the glyphs.
 */
function pagingStyle(c: Container): PagingStyle {
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config carries no character map');
  for (const record of modeRecords(c) ?? []) {
    const first = record.pages[0];
    if (record.pages.length < 2 || first === undefined) continue;
    const header = headerOf(c, first);
    if (header === undefined) continue;
    const headerProgram = screenProgram(c, header) ?? [];
    const total = textAt(headerProgram, ...MENU_TOTAL_XY);
    const word = textAt(headerProgram, MENU_TOTAL_WORD_X, MENU_TOTAL_XY[1]);
    const counter = numberAt(screenProgram(c, counterProgram(c, first)) ?? []);
    if (total?.font === undefined || word === undefined || counter?.font === undefined) continue;
    const glyphs = textGlyphs(c, headerProgram[word.index] as ScreenInstruction);
    if (glyphs === undefined) continue;
    return { counterFont: counter.font, totalFont: total.font, word: decode(glyphs, map) };
  }
  throw new ComposeError('no screen in this config has more than one page, so there is no paging '
    + 'to copy the fonts and the word from');
}

/**
 * Make a screen's paging agree with its page count, after pages were added to it: every page draws
 * its own number, the header draws the total, and a screen of more than one page no longer deadens
 * the two page turn keys. **Arch 12 (Harmony One) only**, which is where all three were measured,
 * section 293. Arch 14's paging is the counter alone and is `paginateFourSlot`, section 312; the two
 * share their text edits through `pageTexts`.
 *
 * **One step shared by both menus that grow pages**, the device list's `composeMenuPage` and the
 * activity menu's `composeActivityMenuPage`, which is decision 17's rule: builders stay separate and
 * what they share is a step. It exists because each of the three is a way to produce a screen the
 * remote accepts and mishandles, and two of them happened:
 *
 * * **The page turn keys.** A one page screen binds both in its mode record's own list, 598 of 598 on
 *   the six Harmony One containers, and a multi page one binds neither, 0 of 58. Grow a one page menu
 *   to two and leave them, and the second page cannot be reached, with every count closing. Every one
 *   page **list** menu binds them to the null instruction, but 67 other one page screens run a list
 *   there, so a binding that does something is refused rather than cut.
 * * **The total.** The header states it, so a page added without restating it leaves "2 pages" on a
 *   screen of three. `composeMenuPage` did exactly that to nine device lists on the spare Harmony One,
 *   which this step now restates.
 * * **The numbers.** A one page screen draws no counter at all, so its first page gains one, and a
 *   page composed from a one page screen's last page has none to copy.
 *
 * What is written is spelled in the fonts `pagingStyle` finds, inline, or in the nearest font of the
 * same height where that one lacks a glyph. A number or total already there is kept when it reads
 * right; otherwise an inline one is drawn again and one drawn by reference is pointed at a string that
 * reads right. A page whose program does not end the way the corpus ends one is refused.
 */
/**
 * The text edits a paging step makes, on a container that is replaced after every one of them: spell a
 * text in a font that has its glyphs, measure it, draw it, insert bytes at an instruction boundary,
 * and restate a text that reads wrong. **One copy for both paging steps**, the Harmony One's `paginate`
 * and arch 14's `paginateFourSlot`, which is decision 17's rule: the builders stay separate and what
 * they share is a step. Lifted out of `paginate` unchanged when the second caller arrived, so the
 * borrower handling section 293 found the hard way is not written twice.
 *
 * `current` is the container as it now is; every edit replaces it, and a caller reads it again after
 * each one, since an address read before an insertion below it is stale by that insertion.
 */
interface PageTexts {
  current: Container;
  spell: (preferred: number, text: string) => { font: number; codes: number[] };
  width: (preferred: number, text: string) => number;
  drawn: (x: number, y: number, text: string, preferred: number, current_: number | undefined) => number[];
  insert: (at: number, bytes: readonly number[]) => void;
  restate: (one: ScreenInstruction, font: number | undefined, want: string, what: string, endsAt?: number) => void;
}

function pageTexts(start: Container, menu: number): PageTexts {
  const state = { current: start };
  const map = characterMap(start);
  if (map === undefined) throw new ComposeError('the config carries no character map');
  // A text in `preferred` where that font has the glyphs, and otherwise in the font of nearest height
  // that has them, `fontThatSpells`'s rule for a label: a configuration's font carries only the glyphs
  // it draws, and the spare Harmony One's activity menu header draws its total in font 4, in which no
  // text of that configuration contains a 4, while its one four page screen draws "4" in font 11. The font it lands in is returned, so the caller switches to it and back.
  const spell = (preferred: number, text: string): { font: number; codes: number[] } => {
    const font = fontThatSpells(state.current, map, text, preferred);
    const set = (fontSets(state.current) ?? [])[font];
    if (set === undefined) throw new ComposeError(`the config does not carry font ${font}`);
    return { font, codes: codesFor(map, state.current, set, text, font) };
  };
  const inline = (x: number, y: number, codes: readonly number[]): number[] =>
    [OP_TEXT_INLINE, x, y, ...codes, 0];
  // How wide a text is in the font `spell` puts it in, which is where a right aligned number starts.
  const width = (preferred: number, text: string): number => {
    const { font, codes } = spell(preferred, text);
    return textWidth(state.current, (fontSets(state.current) ?? [])[font] as FontSet, codes);
  };
  // A text drawn at `(x, y)` reading `text`, in the font in effect, `current_`, and back to it after.
  const drawn = (x: number, y: number, text: string, preferred: number, current_: number | undefined): number[] => {
    const { font, codes } = spell(preferred, text);
    const back = font !== current_ && current_ !== undefined ? [OP_FONT, current_] : [];
    return [...(font === current_ ? [] : [OP_FONT, font]), ...inline(x, y, codes), ...back];
  };
  // Insert `bytes` at blob offset `at`, which must be an instruction boundary the caller chose.
  const insert = (at: number, bytes: readonly number[]): void => {
    const hole = relocate(state.current, at, bytes.length);
    hole.bytes.set(bytes, at);
    state.current = parse(restamped(hole.bytes));
  };
  // Keep a text that reads `want`. Otherwise an inline one is cut and drawn again, in a font that has
  // the glyphs, and one drawn by reference is pointed at a string this configuration already draws
  // reading `want`, since its bytes may be another draw's and a pointer field cannot be cut.
  const restate = (
    one: ScreenInstruction, font: number | undefined, want: string, what: string, endsAt?: number,
  ): void => {
    const glyphs = textGlyphs(state.current, one);
    if (glyphs !== undefined && decode(glyphs, map) === want) {
      // Right text, and a right aligned one also has to sit right: `composeMenuPage` draws a new
      // page's number at x 13, which is right for 1 to 9 except a 4 and wrong for 10 and up. The x
      // is the instruction's own operand, so moving it touches no borrower's glyphs.
      if (endsAt === undefined || font === undefined) return;
      const at = endsAt - width(font, want);
      if (one.operands[0] === at) return;
      const bytes = Uint8Array.from(state.current.blob);
      bytes[one.start + 1] = at;
      state.current = parse(restamped(bytes));
      return;
    }
    if (font === undefined) throw new ComposeError(`menu ${menu}'s ${what} is drawn before any font is chosen`);
    // A right aligned text moves when its width does, which a page number's does going from 9 to 10.
    const x = endsAt === undefined ? one.operands[0] as number : endsAt - width(font, want);
    const y = one.operands[1] as number;
    if (one.opcode === OP_TEXT_INLINE) {
      // Other draws may borrow these glyphs by reference, which the compiler does for any two equal
      // strings: on the spare Harmony One the third page's own "3" is the header's. Each borrower is
      // pointed at another string reading what it reads first, or the cut would take its text away.
      const run = state.current.flashBase + one.start + 3;
      const runEnd = state.current.flashBase + one.start + one.length;
      for (const borrower of screenStrings(state.current, map)) {
        if (borrower.referencedFrom === undefined || borrower.referencedFrom < run
            || borrower.referencedFrom >= runEnd) continue;
        const set = (fontSets(state.current) ?? [])[borrower.font];
        const home = screenStrings(state.current, map).find((other) => other.text === borrower.text
          && other.referencedFrom === undefined && other.at !== one.start && set !== undefined
          && [...(textGlyphs(state.current, screenProgram(state.current, state.current.flashBase + other.at)?.[0] ?? one)
            ?? [])].every((code) => glyphOf(state.current, set, code) !== undefined));
        // Failing a string reading the same, the **tail** of a longer inline string ending in the same
        // codes: a reference reads glyphs from its address up to the terminator, so pointing into
        // another string's run draws exactly that run's end. Needed on arch 14, where a menu's first
        // page draws its total inline and the other pages, and other screens, borrow that one digit:
        // `h650_config_region`'s corner lists draw "2" inline once and reference it everywhere else,
        // so restating the total to "3" had nothing whole to hand the other "2"s to.
        let target = home === undefined ? undefined : state.current.flashBase + home.at + 3;
        if (target === undefined && set !== undefined) {
          const instructionAt = (at: number): ScreenInstruction | undefined =>
            screenProgram(state.current, state.current.flashBase + at)?.[0];
          const wanted = [...(textGlyphs(state.current, instructionAt(borrower.at) ?? one) ?? [])];
          for (const other of screenStrings(state.current, map)) {
            if (other.referencedFrom !== undefined || other.at === one.start || wanted.length === 0) continue;
            const codes = [...(textGlyphs(state.current, instructionAt(other.at) ?? one) ?? [])];
            const from = codes.length - wanted.length;
            if (from < 0 || !wanted.every((code, k) => codes[from + k] === code)) continue;
            if (!wanted.every((code) => glyphOf(state.current, set, code) !== undefined)) continue;
            target = state.current.flashBase + other.at + 3 + from;
            break;
          }
        }
        if (target === undefined) {
          throw new ComposeError(`menu ${menu}'s ${what} is borrowed by a draw of ${borrower.text} that `
            + 'no other string could take over');
        }
        const bytes = Uint8Array.from(state.current.blob);
        bytes.set(new Writer(3).u24(target).bytes, borrower.at + 3);
        state.current = parse(restamped(bytes));
      }
      const cut = excise(state.current, one.start, one.length);
      state.current = parse(restamped(cut.bytes));
      insert(one.start, drawn(x, y, want, font, font));
      return;
    }
    if (one.opcode !== OP_TEXT_AT) throw new ComposeError(`menu ${menu}'s ${what} is not a text`);
    const { font: into } = spell(font, want);
    const set = (fontSets(state.current) ?? [])[into];
    const target = screenStrings(state.current, map).find((other) => {
      if (other.text !== want || set === undefined) return false;
      const codes = textGlyphs(state.current, screenProgram(state.current, state.current.flashBase + other.at)?.[0] ?? one);
      return codes !== undefined && [...codes].every((code) => glyphOf(state.current, set, code) !== undefined);
    });
    if (target === undefined) {
      throw new ComposeError(`menu ${menu}'s ${what} is drawn by reference and no string reads ${want}`);
    }
    const bytes = Uint8Array.from(state.current.blob);
    bytes.set(new Writer(3).u24(target.referencedFrom ?? state.current.flashBase + target.at + 3).bytes, one.start + 3);
    bytes[one.start + 1] = x;
    state.current = parse(restamped(bytes));
    if (into !== font) {
      // The font after the reference first, so the one before it does not move it.
      insert(one.start + one.length, [OP_FONT, font]);
      insert(one.start, [OP_FONT, into]);
    }
  };

  return {
    get current(): Container { return state.current; },
    set current(next: Container) { state.current = next; },
    spell, width, drawn, insert, restate,
  };
}

export function paginate(start: Container, menu: number): Container {
  if (start.architecture !== 12) throw new ComposeError('paging is composed for the Harmony One alone');
  const t = pageTexts(start, menu);
  const recordOf = (): ModeRecord => {
    const record = modeRecords(t.current)?.[menu];
    if (record === undefined) throw new ComposeError(`menu ${menu} stopped reading`);
    return record;
  };
  const count = recordOf().pages.length;
  if (count < 2) throw new ComposeError(`menu ${menu} has one page, so there is nothing to page`);
  const style = pagingStyle(t.current);
  const map = characterMap(t.current);
  if (map === undefined) throw new ComposeError('the config carries no character map');
  // 1. The page turn keys, cut out of the mode record's own list one entry at a time. The count byte
  // is restated after each cut, since the census has to read the list as it was to move the rest.
  for (;;) {
    const record = recordOf();
    const list = taggedList(t.current, record.start);
    if (list === undefined) throw new ComposeError(`menu ${menu}'s record list does not read`);
    const at = list.entries.findIndex((entry) => PAGE_TURN_SCANS.includes(entry.tag & SCAN_MASK));
    if (at < 0) break;
    if (list.wide) throw new ComposeError(`menu ${menu}'s record list is the wide form, which is not cut`);
    const entry = list.entries[at] as { opcode: number; operand: number };
    if (entry.opcode !== 0 || entry.operand !== 0) {
      throw new ComposeError(`menu ${menu} runs something on a page turn key, which paging would drop`);
    }
    const off = t.current.blobOffsetOf(record.start);
    if (off === undefined) throw new ComposeError(`menu ${menu}'s record moved out of reach`);
    const cut = excise(t.current, off + 1 + 4 * at, 4);
    cut.bytes[off] = list.entries.length - 1;
    t.current = parse(restamped(cut.bytes));
  }

  // 2. The header's total. Every page calls one header and no two screens share one, 656 screens and
  // 656 headers on the six Harmony One containers, so restating it changes this screen and no other.
  const headers = new Set(recordOf().pages.map((page) => headerOf(t.current, page)));
  const header = [...headers][0];
  if (headers.size !== 1 || header === undefined) {
    throw new ComposeError(`menu ${menu}'s pages do not all call one header`);
  }
  const headerProgram = screenProgram(t.current, header) ?? [];
  const total = textAt(headerProgram, ...MENU_TOTAL_XY);
  if (total !== undefined) {
    t.restate(headerProgram[total.index] as ScreenInstruction, total.font, String(count), 'page total');
  } else {
    // A one page screen's header, which ends in a return and the end marker: the total and the word
    // go in before the return, and the font it had is put back after them.
    const back = headerProgram.at(-2);
    if (back?.opcode !== OP_RETURN || headerProgram.at(-1)?.opcode !== OP_END) {
      throw new ComposeError(`menu ${menu}'s header does not end the way the corpus ends one`);
    }
    const before = headerProgram.slice(0, -2).findLast((one) => one.opcode === OP_FONT)?.operands[0];
    t.insert(back.start, [
      ...t.drawn(...MENU_TOTAL_XY, String(count), style.totalFont, undefined),
      ...t.drawn(MENU_TOTAL_WORD_X, MENU_TOTAL_XY[1], style.word, style.totalFont, undefined),
      ...(before === undefined ? [] : [OP_FONT, before]),
    ]);
  }

  // 3. Every page's own number and slash, in page order, re-reading the record after each insertion.
  for (let k = 0; k < count; k += 1) {
    const page = recordOf().pages[k] as ModePage;
    const where = counterProgram(t.current, page);
    const program = screenProgram(t.current, where) ?? [];
    const number = numberAt(program);
    if (number !== undefined) {
      t.restate(program[number.index] as ScreenInstruction, number.font, String(k + 1), `page ${k + 1}'s number`,
              MENU_COUNTER_SLASH_X);
      continue;
    }
    const closing = program.at(-1);
    if (closing?.opcode !== OP_END) {
      throw new ComposeError(`menu ${menu}'s page ${k + 1} draws no number and does not end plainly`);
    }
    t.insert(closing.start, [
      ...t.drawn(MENU_COUNTER_SLASH_X - t.width(style.counterFont, String(k + 1)), MENU_COUNTER_XY[1],
               String(k + 1), style.counterFont, undefined),
      ...t.drawn(MENU_COUNTER_SLASH_X, MENU_COUNTER_XY[1], '/', style.counterFont, undefined),
    ]);
  }
  return t.current;
}

/**
 * Compose the screen half of a device: its own mode with one page drawing its label and its
 * commands, and one new row on every device list menu, entering that mode.
 *
 * Harmony One (arch 12) only, deliberately: a page's hit rectangles, its lead byte and every
 * position here are that model's, section 125, and the checklist's goal is a device on the spare
 * One. The hit rectangles themselves are reused rather than inserted: the page declares hit page
 * 10, the standard six slot device layout, and a page may bind any subset of what its hit page
 * offers, which is the closure section 125 measured at 268 of 268.
 *
 * What is deliberately not composed, each a difference for phase 7 to explain: the device icon on a
 * menu row **grown** on to an existing page (a row on a **new** page wears one, section 241, copied
 * from the row `iconLike` names), the page's bottom bar switch on state variable 35, the record
 * list's keypad bindings, and the per mode housekeeping lists the corpus chrome queues with opcode
 * 0x73.
 */
export interface ComposeScreenOptions {
  /**
   * A device list row whose icon a new page's row wears, by its drawn label, so a television gets
   * the television icon. Without it the first row's icon is copied, whatever it shows.
   */
  iconLike?: string;
  /**
   * Arch 14 only: the device list row whose device mode the new one takes its key map from, by its
   * drawn label. Every key that mode binds is bound in the new one too, to the new device's command
   * sending the same frame where exactly one does and to nothing otherwise, so a key never falls
   * through to another device's map. Without it the first row's mode is the template and no key
   * matches unless the numbers happen to agree.
   */
  keysLike?: string;
}

export function composeDeviceScreen(
  c: Container, label: string, rows: readonly ComposeRow[], options: ComposeScreenOptions = {},
): ComposedScreen {
  if (c.architecture === 14) return composeFourSlotDeviceScreen(c, label, rows, options);
  if (c.architecture !== 12) {
    throw new ComposeError('the screen half is composed for the Harmony One and arch 14 alone');
  }
  if (rows.length === 0 || rows.length > DEVICE_PAGE_SCANS.length) {
    throw new ComposeError(`a device page has one to six rows, not ${rows.length}`);
  }
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const sets = fontSets(c) ?? [];
  const titleSet = sets[DEVICE_TITLE_FONT];
  const rowSet = sets[DEVICE_ROW_FONT];
  const menuSet = sets[MENU_ROW_FONT];
  if (titleSet === undefined || rowSet === undefined || menuSet === undefined) {
    throw new ComposeError('the config does not carry the three fonts the layout uses');
  }
  const titleCodes = codesFor(map, c, titleSet, label, DEVICE_TITLE_FONT);
  const menuCodes = codesFor(map, c, menuSet, label, MENU_ROW_FONT);
  const rowCodes = rows.map((row) => codesFor(map, c, rowSet, row.label, DEVICE_ROW_FONT));

  // The menus and the new mode's index, refused before anything moves.
  const found = deviceListMenus(c);
  if (found.menus.length === 0 || found.marker === undefined) {
    throw new ComposeError('no device list menu found to grow');
  }
  const table = modeTable(c);
  if (table === undefined) throw new ComposeError('base slot 6 states no table');
  const mode = table.addresses.length;

  // 1. The menu row's action list: beep, enter the new mode, mark device mode. One list, shared
  // by every menu, the way the corpus shares its bottom key list.
  const actionSlot = archSlot(c.architecture, ACTION_TABLE_SLOT);
  const actionTable = c.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const rowList = actionTable.values.length;
  const rowBytes = new Writer(1 + 3 * 3).u8(3)
    .u16(ROW_BEEP_OPERAND).u8(0x75)
    .u16(mode).u8(ENTER_MODE)
    .u16(found.marker.operand).u8(found.marker.opcode);
  const rowAt = actionTable.start;
  const rowHole = relocate(c, rowAt, rowBytes.bytes.length);
  rowHole.bytes.set(rowBytes.bytes, rowAt);
  let current = parse(appendTableEntries(
    parse(rowHole.bytes), actionSlot, [c.flashBase + rowAt]));

  // 2. The mode's table entry, pointing at an existing mode until the block exists. Everything
  // below inserts bytes somewhere, and a census only restamps addresses a reader walks to, so the
  // new mode has to be reachable **before** any address it will embed is final: the placeholder
  // keeps every intermediate parse honest, and the pointer is swapped in place at the end, after
  // the last relocation the block's own addresses have to survive.
  const stale = modeTable(current);
  if (stale === undefined) throw new ComposeError('base slot 6 stopped reading');
  const placeholderEntry = stale.addresses[0];
  if (placeholderEntry === undefined) throw new ComposeError('a config with no modes has no menus');
  const tableAt = stale.start + stale.length;
  const tableHole = relocate(current, tableAt, 3);
  tableHole.bytes.set(new Writer(3).u24(placeholderEntry).bytes, tableAt);
  tableHole.bytes.set(new Writer(3).u24(mode + 1).bytes, stale.start);
  current = parse(tableHole.bytes);

  // 3. The page list's second copy, at the end of the last pool: the walk only accepts a run that
  // holds a base slot 9 set, section 69's own reading, so the copy extends the pool that exists
  // rather than starting one of its own. Appended to the last pool because the copies pair with
  // the pages positionally and the new page will be the last page of the last mode.
  const listBytes = new Writer(1 + 4 * rows.length);
  listBytes.u8(rows.length);
  rows.forEach((row, k) => {
    listBytes.u8(0x80 | (DEVICE_PAGE_SCANS[k] as number)).u16(row.list).u8(ACTION_LIST_INDEX_OPCODE);
  });
  const lastPool = taggedListPools(current).at(-1);
  if (lastPool === undefined) throw new ComposeError('no copy pool to extend');
  const copyAt = lastPool.end;
  const copyHole = relocate(current, copyAt, listBytes.bytes.length);
  copyHole.bytes.set(listBytes.bytes, copyAt);
  current = parse(copyHole.bytes);

  // 4. The page's own list, into base slot 8 where every page list lives, at the end of the run.
  const pageEnds = modePages(current).map((page) => {
    const off = current.blobOffsetOf(page.list);
    const list = taggedList(current, page.list);
    return off === undefined || list === undefined ? 0 : off + list.length;
  });
  const listAt = Math.max(...pageEnds);
  const listHole = relocate(current, listAt, listBytes.bytes.length);
  listHole.bytes.set(listBytes.bytes, listAt);
  current = parse(listHole.bytes);
  const pageListAddress = current.flashBase + listAt;

  // 5. The mode block, one hole where the mode region ends and the copy pool begins: the record's
  // empty list, the chrome program the page calls, the page's program, the page record and the
  // entry, in the order every corpus mode keeps them. Last of the insertions on purpose: the
  // picture and list addresses it embeds are final now, and every later shift happens with the
  // mode reachable, so the census restamps them like any other stated address.
  const records = modeRecords(current);
  if (records === undefined) throw new ComposeError('base slot 6 does not read');
  let bar: number | undefined;
  for (const record of records) {
    bar = pictureDrawnAt(current, record.start + record.length, 0, 0);
    if (bar !== undefined) break;
  }
  const slots: number[] = [];
  for (const record of records) {
    for (const page of record.pages) {
      if (page.lead !== DEVICE_PAGE_LEAD) continue;
      const one = DEVICE_PAGE_SLOTS.map(([x, y]) => pictureDrawnAt(current, page.program, x, y));
      if (one.every((address) => address !== undefined)) {
        slots.push(...(one as number[]));
        break;
      }
    }
    if (slots.length > 0) break;
  }
  if (bar === undefined || slots.length === 0) {
    throw new ComposeError('no existing page carries the pictures the layout reuses');
  }
  const chromeLength = 6 + 2 + (1 + 2 + titleCodes.length + 1) + 2;
  const programLength = 4 + 2
    + rows.reduce((sum, _, k) => sum + 6 + (1 + 2 + (rowCodes[k] as number[]).length + 1), 0) + 1;
  const blockLength = 2 + chromeLength + programLength + 7 + (6 + 3);
  const blockAt = Math.max(...records.map((record) => {
    const off = current.blobOffsetOf(record.address);
    return off === undefined ? 0 : off + record.entryLength;
  }));
  const base = current.flashBase + blockAt;
  // The block embeds addresses read before its own hole existed, and everything above the hole
  // moves by its length when the hole opens. The census cannot restamp them because the block is
  // not written yet, so they are shifted here, once, the same arithmetic the census applies to a
  // stated address.
  const shifted = (address: number): number => (address >= base ? address + blockLength : address);
  const chrome = new Writer(chromeLength);
  chrome.u8(OP_IMAGE).u8(0).u8(0).u24(shifted(bar));
  chrome.u8(OP_FONT).u8(DEVICE_TITLE_FONT);
  chrome.u8(OP_TEXT_INLINE).u8(MODE_TITLE_X).u8(MODE_TITLE_Y);
  titleCodes.forEach((code) => chrome.u8(code));
  chrome.u8(0).u8(OP_RETURN).u8(OP_END);
  const blockHole = relocate(current, blockAt, blockLength);
  const chromeAddress = base + 2;
  const programAddress = chromeAddress + chrome.bytes.length;
  const pageAddress = programAddress + programLength;
  const entryAddress = pageAddress + 7;
  const block = new Writer(blockLength);
  block.u8(0).u8(0);
  chrome.bytes.forEach((byte) => block.u8(byte));
  block.u8(OP_CALL).u24(chromeAddress);
  block.u8(OP_FONT).u8(DEVICE_ROW_FONT);
  // The font table is read afresh here, section 242: `rowSet` above was read before four
  // relocations moved every glyph, so measuring a label through it gave zero for every label and
  // the first device page written to a remote had each label starting at its pad's middle and
  // running off the right edge. A set read before an insertion below it is stale by that insertion.
  const measuringSet = (fontSets(current) ?? [])[DEVICE_ROW_FONT];
  if (measuringSet === undefined) throw new ComposeError('the row font stopped reading');
  rows.forEach((row, k) => {
    const [x, y] = DEVICE_PAGE_SLOTS[k] as readonly [number, number];
    const codes = rowCodes[k] as number[];
    block.u8(OP_IMAGE).u8(x).u8(y).u24(shifted(slots[k] as number));
    const width = bitmapAt(current, slots[k] as number)?.stride ?? 0;
    const wide = textWidth(current, measuringSet, codes);
    // A label wider than its pad is refused rather than drawn off the edge, which is what the
    // catalogue's own command names do: `PowerToggle` is wider than the 81 pixel pad and read as
    // `PowerT` on the remote. The caller supplies a display label instead.
    if (wide > width) {
      throw new ComposeError(`'${row.label}' is ${wide} pixels wide and its pad is ${width}, `
        + 'so it would run off the pad: give the command a shorter label');
    }
    const labelX = x + Math.round((width - wide) / 2);
    block.u8(OP_TEXT_INLINE).u8(labelX).u8(y + DEVICE_LABEL_DROP);
    codes.forEach((code) => block.u8(code));
    block.u8(0);
  });
  block.u8(OP_END);
  block.u8(DEVICE_PAGE_LEAD).u24(shifted(pageListAddress)).u24(programAddress);
  block.u8(0).u24(base).u16(1).u24(pageAddress);
  blockHole.bytes.set(block.bytes, blockAt);

  // The swap, in place on the same bytes: the table's last pointer moves from the placeholder to
  // the entry the block now carries, and from here every reader reports the new mode.
  const swapped = parse(blockHole.bytes);
  const grownTable = modeTable(swapped);
  if (grownTable === undefined) throw new ComposeError('base slot 6 stopped reading');
  swapped.blob.set(new Writer(3).u24(entryAddress).bytes,
                   grownTable.start + 3 + 3 * mode);
  current = parse(swapped.blob);

  // 6. One row on each menu's last page: the bottom key moves from the two row layout's scan to
  // the three row one's, the lead byte says which layout is in force, the list and its pool copy
  // both grow by the row, and the program draws the label above the third row's background.
  const pagesAdded: number[] = [];
  for (const menu of found.menus) {
    const record = modeRecords(current)?.[menu];
    const page = record?.pages.at(-1);
    if (record === undefined || page === undefined) throw new ComposeError('a menu lost its page');
    const hits = touchPages(current)?.records ?? [];
    const areas = hits[page.lead as number]?.areas.map((area) => area.code) ?? [];
    const capacity = menuRowCapacity(areas);
    if (capacity === undefined) {
      throw new ComposeError(`menu ${menu}'s last page uses a hit page this does not know: `
        + `[${areas.join(', ')}]`);
    }
    if (capacity === 3) {
      // Full, so a new page rather than a new row: pages of three and the last page short is the
      // one layout Logitech's compiler produces, section 239.
      current = composeMenuPage(current, menu, rowList, label, options.iconLike);
      pagesAdded.push(menu);
      continue;
    }
    if (capacity !== 2) {
      throw new ComposeError(`menu ${menu}'s last page holds ${capacity} row(s), which is neither `
        + 'the two a row is added to nor the three a page is added after');
    }
    // The page it becomes: **this menu's own** three row page, taken from an earlier page of the
    // same record rather than by searching the table. A config carries several hit pages offering
    // the three row set, so a search finds one of them and not the one the menu is drawn against.
    const grown = record.pages
      .map((one) => one.lead as number)
      .find((lead) => menuRowCapacity(hits[lead]?.areas.map((area) => area.code) ?? []) === 3);
    if (grown === undefined) {
      throw new ComposeError(`menu ${menu} has no three row page to take a hit page from`);
    }
    const list = taggedList(current, page.list);
    if (list === undefined || list.entries.some((entry) => entry.flags !== undefined)) {
      throw new ComposeError('a menu page list is not the narrow form the corpus uses');
    }
    // The list and its copy, the same edit twice: retag the bottom key from scan 50 to scan 51,
    // append the row on scan 50, bump the count. The copy grows first, because it sits below the
    // original and growing it moves the original.
    // **Why the scan moves at all**: a code is an area's position in its hit page, section 275, so
    // a two row page stores row, row, bottom key and numbers them 48, 49, 50, and the three row
    // page it becomes numbers the same bottom key 51. Nothing about the key changes.
    // It is the one entry on scan 50, whatever it runs: nine menus bind opcode `0x72` bare there
    // and one wraps it in a beeping action list, so the retag keys on the scan and not on the
    // opcode, and a page with no single scan 50 entry is refused as a layout this does not know.
    // This said "the flip" until 7 September 2026 and that was wrong twice: the key is the left of
    // the two below the display, and `0x72` maps a state variable's value, `actions.ts`.
    const flips = list.entries.filter((entry) => entry.tag === (0x80 | 50)).length;
    if (flips !== 1) {
      throw new ComposeError(`a menu page binds scan 50 ${flips} times, not the one flip expected`);
    }
    const entries = list.entries.length;
    const grow = (listStart: number): void => {
      const at = listStart + 1 + 4 * entries;
      const hole = relocate(current, at, 4);
      hole.bytes.set(new Writer(4).u8(0x80 | 50).u16(rowList).u8(ACTION_LIST_INDEX_OPCODE).bytes, at);
      hole.bytes[listStart] = entries + 1;
      for (let k = 0; k < entries; k += 1) {
        const entryAt = listStart + 1 + 4 * k;
        if (hole.bytes[entryAt] === (0x80 | 50)) hole.bytes[entryAt] = 0x80 | 51;
      }
      current = parse(hole.bytes);
    };
    const pageIndex = modePages(current).findIndex((one) => one.address === page.address);
    const copyOff = pageListCopies(current)[pageIndex];
    if (copyOff === undefined) throw new ComposeError('a menu page has no pool copy');
    grow(copyOff);
    const moved = modeRecords(current)?.[menu]?.pages.at(-1);
    const listOff = moved === undefined ? undefined : current.blobOffsetOf(moved.list);
    if (listOff === undefined) throw new ComposeError('a menu page list moved out of reach');
    grow(listOff);

    // The lead byte, in place, after the relocations so nothing moves it again.
    const after = modeRecords(current)?.[menu]?.pages.at(-1);
    const afterOff = after === undefined ? undefined : current.blobOffsetOf(after.address);
    if (afterOff === undefined) throw new ComposeError('a menu page moved out of reach');
    current.blob[afterOff] = grown;
    current = parse(current.blob);

    // The program: the third row's background and the device's label, inserted where the closing
    // switch begins, so the switch and its arms slide up and every stated target is restamped by
    // the census like any other address.
    const grownRecord = modeRecords(current)?.[menu];
    const target = grownRecord?.pages.at(-1);
    if (grownRecord === undefined || target === undefined) {
      throw new ComposeError('a menu page moved out of reach');
    }
    // The background is read here, after the grows above moved it, and not at the top of the
    // loop: a picture address read before an insertion below it is stale by that insertion.
    const bg = pictureDrawnAt(current, grownRecord.pages[0]?.program ?? 0, ...MENU_ROW3_BG);
    if (bg === undefined) {
      throw new ComposeError('a menu has no first page to take the row background from');
    }
    // Nine of the ten menus close with a switch drawing the bottom bar and one closes plain, so
    // the insertion point is the final instruction either way: the rows sit above whatever the
    // tail draws, and the switch's arms slide up with their targets restamped by the census.
    const program = screenProgram(current, target.program);
    const closing = program?.at(-1);
    if (program === undefined || closing === undefined
        || (closing.opcode !== OP_SWITCH && closing.opcode !== OP_END)) {
      throw new ComposeError('a menu page program does not end the way the corpus ends one');
    }
    const drawn = new Writer(6 + 2 + 1 + 2 + menuCodes.length + 1);
    // The background sits above the insertion and moves with it, and these bytes are written
    // after the hole opens, so the shift is applied here like the block's, not by the census.
    const grownBg = bg + (bg >= current.flashBase + closing.start ? drawn.bytes.length : 0);
    drawn.u8(OP_IMAGE).u8(MENU_ROW3_BG[0]).u8(MENU_ROW3_BG[1]).u24(grownBg);
    // The font is selected here rather than inherited: nine menus still hold the row font where
    // the insertion lands and the tenth has moved on to the page indicator's font by its end.
    drawn.u8(OP_FONT).u8(MENU_ROW_FONT);
    drawn.u8(OP_TEXT_INLINE).u8(MENU_LABEL_X).u8(MENU_ROW3_LABEL_Y);
    menuCodes.forEach((code) => drawn.u8(code));
    drawn.u8(0);
    const programHole = relocate(current, closing.start, drawn.bytes.length);
    programHole.bytes.set(drawn.bytes, closing.start);
    current = parse(programHole.bytes);
  }

  return { bytes: restamped(current.blob), mode, menus: found.menus, rowList, pagesAdded };
}

/*
 * ---- The screen half, arch 14 (Harmony 600, 650 and 700), section 285 ----
 *
 * An arch 14 screen is not a touch screen. It labels the four buttons around the display, one label
 * per corner, and a page of a device list or a device mode binds those four buttons and nothing
 * else: `FOUR_SLOT_ITEMS` in `inventory.ts`, where the reader lives. Everything below is read off
 * the configuration being composed into, the way the Harmony One's half reads its pictures: the
 * chrome is copied from one of the configuration's own device pages, the two backgrounds from its
 * device mode pages, the key map's shape from one of its device modes, and the row marker from its
 * rows. What is a constant is the geometry, which is the same on all four arch 14 user
 * configurations here.
 *
 * Three differences from the Harmony One's half, each measured rather than assumed:
 *
 * * a mode's pages carry **their own** chrome, background, bars, title and page counter, with no call
 *   to a shared program, so the block is list, then a program and a six byte page record per page,
 *   then the entry, which is how the 650's own modes are laid out;
 * * a device mode's own list binds **every** key: 47 entries on all 21 device modes of the four
 *   configurations, each key either sending that device's command or bound to nothing, 547 of 547
 *   bound keys sending. The Harmony One's composed mode had an empty list, which lets a key fall
 *   through to whatever lies below it; here the key map is composed with the mode;
 * * a row is two instructions, enter the mode and write the marker, with no beep.
 *
 * A menu whose last page is full gets a new page, `openFourSlotMenuPage`, and every page of it then
 * counts to the new total, `paginateFourSlot`, since todo-compile-650 2.3; until then it was refused,
 * because a new page renumbers every page counter of that menu. What is still refused is a tenth page,
 * whose counter would be two digits drawn further left, which nothing here writes. The `0x7F`
 * delay step in front of every arch 14 command is not this function's: `composeDevice` emits it,
 * section 287, with the device's `InterDeviceDelay` variable and its table.
 */

/**
 * The widest line a corner label draws in its page's label font, 59 pixels. This was 60 and was
 * described as the composer's own limit rather than a measurement, until section 323 measured it:
 * the widest such line on the 13 Logitech compiles for the Harmony 600, 650 and 700 is 59,
 * `Simplink`, and `Antenna`, 60 pixels in that font, is drawn by the compiler in another font, the one
 * case of the kind. Choosing a font is not composed, so a line past this is refused.
 */
const FOUR_SLOT_LABEL_MAX = 59;
/**
 * Where the compiler breaks a corner label onto a second line, section 323. Over the 13 Logitech
 * compiles for the Harmony 600, 650 and 700, the labels drawn in their page's most common font where a
 * corner label sits, one line at y 40 or 90 or two at 25 and 40 or 75 and 90, number 2037 counted once
 * per configuration, label and place, 422 distinct texts, and one rule places all 2036 whose width
 * can be measured: a label with no space stays on one line, one no wider than this stays on one line,
 * and a wider one breaks at spaces, greedily, putting on each line as many words as fit within this
 * width. Any width from 55 to 58 reproduces all of them, the widest label left whole with a space in it
 * being 55 pixels, `TV Vol+`, and the narrowest broken one 59, `Sony TV` and `TV Input`. So the
 * threshold is known to lie in that band and not where in it, and the band rests on those three
 * labels; this takes its top, which breaks the fewest. Breaking a label of three or more words is
 * tested by one label, `Rcvr V-` over `Aux`.
 *
 * What it does not cover is a label the compiler draws in another font, which is not chosen by width
 * alone and is not composed, so a label too wide for two lines of this font is refused.
 */
const FOUR_SLOT_WRAP_WIDTH = 58;
/**
 * A two line corner label's first line sits this far above where a one line label would, and its
 * second line there: 25 and 40 in the top row, 75 and 90 in the bottom, on all 880 above. It is the
 * label font's line height, so it holds for the font the composer draws labels in and no other.
 */
const FOUR_SLOT_LINE_RISE = 15;

/**
 * Break a corner label the way the compiler does, `FOUR_SLOT_WRAP_WIDTH`, and refuse what it would
 * draw in another font: a third line, or a line wider than a corner holds. Returns the glyph codes
 * per line, one or two.
 */
function fourSlotLabelLines(
  map: NonNullable<ReturnType<typeof characterMap>>, c: Container, set: FontSet, font: number, label: string,
): number[][] {
  const width = (text: string): number => textWidth(c, set, codesFor(map, c, set, text, font));
  const words = label.split(' ');
  const lines: string[] = [];
  if (!label.includes(' ') || width(label) <= FOUR_SLOT_WRAP_WIDTH) {
    lines.push(label);
  } else {
    let current = '';
    for (const word of words) {
      const longer = current === '' ? word : `${current} ${word}`;
      if (current !== '' && width(longer) > FOUR_SLOT_WRAP_WIDTH) {
        lines.push(current);
        current = word;
      } else {
        current = longer;
      }
    }
    lines.push(current);
  }
  if (lines.length > 2) {
    throw new ComposeError(`'${label}' breaks onto ${lines.length} lines and a corner holds two in its font: `
      + 'give it a shorter label');
  }
  for (const line of lines) {
    const wide = width(line);
    if (wide > FOUR_SLOT_LABEL_MAX) {
      throw new ComposeError(`'${line}' is ${wide} pixels wide and a corner holds ${FOUR_SLOT_LABEL_MAX}: `
        + 'give it a shorter label');
    }
  }
  return lines.map((line) => codesFor(map, c, set, line, font));
}
/**
 * The page counter's three glyphs, `n`, `/`, `m`, at these x on the title's y: a corner page's, when
 * its mode has two to nine pages, 98 of 98. A two row list's pages draw it at `0x63`, `0x6A`, `0x6F`
 * and a mode of ten pages or more further left, neither of which the composer writes.
 */
const FOUR_SLOT_COUNTER_X: readonly [number, number, number] = [0x6a, 0x71, 0x76];
const FOUR_SLOT_TITLE_XY: readonly [number, number] = [0, 2];

/** The opcode sequence of a device mode page's chrome, around the part a composer writes. */
const FOUR_SLOT_PREFIX = [OP_IMAGE, SCREEN_QUEUE_INSTRUCTION, SCREEN_DRAW_IMAGE_AT] as const;
const FOUR_SLOT_SUFFIX_OPCODES = [SCREEN_DRAW_IMAGE_AT, OP_FONT] as const;

/** An instruction's bytes, copied, with the address it ends in shifted when it names one. */
function copiedInstruction(
  c: Container, instruction: ScreenInstruction, shift: (address: number) => number,
): Uint8Array {
  const bytes = c.blob.slice(instruction.start, instruction.start + instruction.length);
  if (instruction.opcode === OP_IMAGE || instruction.opcode === SCREEN_DRAW_IMAGE_AT
      || instruction.opcode === OP_TEXT_AT) {
    const at = bytes.length - 3;
    bytes.set(new Writer(3).u24(shift(u24(bytes, at))).bytes, at);
  }
  return bytes;
}

/** The frame a list sends, as `bits:value`, or undefined for a list with no send or no frame. */
function sentFrame(c: Container, list: readonly Instruction[] | undefined): string | undefined {
  const send = list?.find((one) => one.opcode === SEND_INFRARED);
  if (send === undefined) return undefined;
  const address = irGroups(c)?.[send.operand >> 8]?.addresses[send.operand & 0xff];
  const frame = address === undefined ? undefined : irFrame(c, address);
  return frame === undefined ? undefined : `${frame.bits}:${frame.value.toString(16)}`;
}

/** What a composer copies out of an arch 14 configuration before it moves anything. */
interface FourSlotTemplate {
  /** The template page's first three instructions and its last four, as instructions. */
  prefix: ScreenInstruction[];
  suffix: ScreenInstruction[];
  titleFont: number;
  counterFont: number;
  labelFont: number;
  /**
   * The background of a page holding one item or none and of one holding more, as picture addresses.
   * Always both for a device mode; an activity's working screens may lack one, `calibration_h600`'s
   * having no page of one command, and then only a page that needs it is refused.
   */
  single: number | undefined;
  crossed: number | undefined;
  /** The device mode whose own list the new one's key map is shaped on. */
  keyMode: number;
}

function fourSlotTemplate(c: Container, keysLike: string | undefined): FourSlotTemplate {
  const rows = deviceListRows(c);
  if (rows.length === 0) throw new ComposeError('no device list to take a device mode from');
  const records = modeRecords(c) ?? [];
  const deviceModes = [...new Set(rows.map((row) => row.mode))];
  const slotScans = new Set(FOUR_SLOT_ITEMS.map((item) => item.scan));

  // The two backgrounds, by majority over the device mode pages holding one item and four.
  const tally = (want: (items: number[]) => boolean): number | undefined => {
    const counts = new Map<number, number>();
    for (const mode of deviceModes) {
      for (const page of records[mode]?.pages ?? []) {
        const items = (taggedList(c, page.list)?.entries ?? []).map((entry) => entry.tag & SCAN_MASK);
        if (!items.every((scan) => slotScans.has(scan)) || !want(items)) continue;
        const first = screenProgram(c, page.program)?.[0];
        const picture = first?.opcode === OP_IMAGE ? bitmapReference(first) : undefined;
        if (picture !== undefined) counts.set(picture, (counts.get(picture) ?? 0) + 1);
      }
    }
    let best: number | undefined;
    let most = 0;
    for (const [picture, count] of counts) if (count > most) { most = count; best = picture; }
    return best;
  };
  const first = FOUR_SLOT_ITEMS[0]?.scan;
  const single = tally((items) => items.length === 1 && items[0] === first);
  const crossed = tally((items) => items.length === FOUR_SLOT_ITEMS.length);
  if (single === undefined || crossed === undefined) {
    throw new ComposeError('no device mode page carries the two backgrounds the layout reuses');
  }

  // The chrome, from the first device mode page whose program has the measured shape.
  for (const mode of deviceModes) {
    for (const page of records[mode]?.pages ?? []) {
      const program = screenProgram(c, page.program);
      if (program === undefined || program.length < 14) continue;
      const opcodes = program.map((one) => one.opcode);
      const texts = (from: number, count: number): boolean => opcodes.slice(from, from + count)
        .every((opcode) => opcode === OP_TEXT_AT || opcode === OP_TEXT_INLINE);
      const suffix = program.slice(-4);
      if (!FOUR_SLOT_PREFIX.every((opcode, k) => opcodes[k] === opcode)
          || opcodes[3] !== OP_FONT || !texts(4, 1) || opcodes[5] !== OP_FONT || !texts(6, 3)
          || opcodes[9] !== OP_FONT
          || !FOUR_SLOT_SUFFIX_OPCODES.every((opcode, k) => suffix[k]?.opcode === opcode)
          || !texts(program.length - 2, 1) || suffix[3]?.opcode !== OP_END) continue;
      const keyRow = keysLike === undefined ? rows[0] : rows.find((row) => row.label === keysLike);
      if (keyRow === undefined) {
        throw new ComposeError(`no device list row is labelled ${keysLike}, so there is no key map to copy`);
      }
      return {
        prefix: program.slice(0, 3),
        suffix,
        titleFont: program[3]?.operands[0] as number,
        counterFont: program[5]?.operands[0] as number,
        labelFont: program[9]?.operands[0] as number,
        single,
        crossed,
        keyMode: keyRow.mode,
      };
    }
  }
  throw new ComposeError('no device mode page has the chrome this composes');
}

/**
 * Which of the two arch 14 device list layouts a page's list is in, and how many devices it holds:
 * corners, one scan per device filling `FOUR_SLOT_ITEMS` in order, or rows, both scans of a row per
 * device filling `FOUR_SLOT_ROWS` in order. Undefined for anything else, which the composer refuses.
 */
function menuLayout(
  c: Container, entries: readonly TaggedEntry[],
): { rows: boolean; used: number; capacity: number } | undefined {
  const lists = c.actionLists() ?? [];
  const byList = new Map<string, number[]>();
  for (const entry of entries) {
    // Two scans of one row run twin lists rather than one, section 69, so a device is its mode.
    const list = lists[entry.operand];
    const key = entry.opcode === ACTION_LIST_INDEX_OPCODE ? JSON.stringify(list) : `${entry.opcode}:${entry.operand}`;
    byList.set(key, [...(byList.get(key) ?? []), entry.tag & SCAN_MASK]);
  }
  const groups = [...byList.values()].map((scans) => [...scans].sort((a, b) => a - b).join(','));
  const same = (want: readonly (readonly number[])[]): boolean => {
    const wanted = want.map((scans) => [...scans].sort((a, b) => a - b).join(','));
    return groups.length === wanted.length && wanted.every((one) => groups.includes(one));
  };
  const used = groups.length;
  if (same(FOUR_SLOT_ITEMS.slice(0, used).map((item) => [item.scan]))) {
    return { rows: false, used, capacity: FOUR_SLOT_ITEMS.length };
  }
  if (same(FOUR_SLOT_ROWS.slice(0, used))) return { rows: true, used, capacity: FOUR_SLOT_ROWS.length };
  return undefined;
}

/**
 * One more item on an arch 14 menu's last page: the page's list and its pool copy each gain the
 * buttons the item is bound to, the label goes in above the page's closing bar, and a page that held
 * one item may take the background its menu's full pages draw. The step both arch 14 menus share,
 * the device list and the activity menu, per decision 17: two builders, and the steps they have in
 * common written once.
 *
 * `firstRowList` is the first of the row lists the caller has already put in base slot 10, one per
 * button bound on the page and another per button on the copy, **in that order**, copy first: the
 * item takes the next corner, one list, or both buttons of the next row, two. What those lists run is
 * the caller's, which is the whole difference between the two menus.
 *
 * `background` says when the one item page's picture is replaced. `'corners'` is the device list's
 * rule, where a two row list's one device page already draws its full pages' picture, on both lists
 * that have such a page, the 650's and `calibration_h600`'s; `'both'` replaces it in either layout,
 * which is the activity menu's rule, only the two row layout occurring there: a page holding one
 * activity draws a picture the activities' own screens draw too, 3 of 3 on the four arch 14 user
 * configurations, and its full pages one picture of the menu's own, drawn by no page outside it, 4
 * menus of 4, section 289.
 */
function growFourSlotMenu(
  start: Container, menu: number, firstRowList: number, codes: readonly number[], font: number,
  background: 'corners' | 'both',
): { container: Container; bound: number } {
  let current = start;
  let nextRow = firstRowList;
  const page = modeRecords(current)?.[menu]?.pages.at(-1);
  const list = page === undefined ? undefined : taggedList(current, page.list);
  if (page === undefined || list === undefined) throw new ComposeError('a menu lost its page');
  const layout = menuLayout(current, list.entries);
  if (layout === undefined) throw new ComposeError('a menu page changed layout');
  if (layout.used >= layout.capacity) throw new ComposeError(`menu ${menu}'s last page is full`);
  const entries = list.entries.length;
  // The scans the new item is bound to: the next corner, or both buttons of the next row.
  const scans = layout.rows
    ? [...(FOUR_SLOT_ROWS[layout.used] as readonly number[])]
    : [(FOUR_SLOT_ITEMS[layout.used] as (typeof FOUR_SLOT_ITEMS)[number]).scan];
  // The list grows by the new entries, each running a row list of its own, and is written back
  // whole in the stored order, so a new bottom right lands between top left and top right.
  const grow = (listStart: number): void => {
    const width = 4;
    const end = listStart + 1 + width * entries;
    const kept = Array.from({ length: entries }, (_, k) =>
      current.blob.slice(listStart + 1 + width * k, listStart + 1 + width * (k + 1)));
    const added = scans.map((scan) => {
      const row = nextRow;
      nextRow += 1;
      return new Writer(width).u8((KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan).u16(row)
        .u8(ACTION_LIST_INDEX_OPCODE).bytes;
    });
    const all = [...kept, ...added].sort((a, b) =>
      FOUR_SLOT_STORED_ORDER.indexOf((a[0] as number) & SCAN_MASK)
        - FOUR_SLOT_STORED_ORDER.indexOf((b[0] as number) & SCAN_MASK));
    const hole = relocate(current, end, width * added.length);
    hole.bytes[listStart] = all.length;
    all.forEach((one, k) => hole.bytes.set(one, listStart + 1 + width * k));
    current = parse(hole.bytes);
  };
  const pageIndex = modePages(current).findIndex((one) => one.address === page.address);
  const copyOff = pageListCopies(current)[pageIndex];
  if (copyOff === undefined) throw new ComposeError('a menu page has no pool copy');
  grow(copyOff);
  const moved = modeRecords(current)?.[menu]?.pages.at(-1);
  const listOff = moved === undefined ? undefined : current.blobOffsetOf(moved.list);
  if (listOff === undefined) throw new ComposeError('a menu page list moved out of reach');
  grow(listOff);

  const target = modeRecords(current)?.[menu]?.pages.at(-1);
  const program = target === undefined ? undefined : screenProgram(current, target.program);
  const bar = program?.findLastIndex((one) => one.opcode === SCREEN_DRAW_IMAGE_AT);
  if (target === undefined || program === undefined || bar === undefined || bar < 0) {
    throw new ComposeError('a menu page program has no closing bar to draw above');
  }
  const labelSet = (fontSets(current) ?? [])[font];
  if (labelSet === undefined) throw new ComposeError('the label font stopped reading');
  const wide = textWidth(current, labelSet, codes);
  const item = FOUR_SLOT_ITEMS[layout.used] as (typeof FOUR_SLOT_ITEMS)[number];
  const [x, y] = layout.rows
    ? [Math.floor((FOUR_SLOT_SCREEN_WIDTH - wide) / 2), TWO_ROW_LABEL_Y[layout.used] as number]
    : [item.column === 0 ? FOUR_SLOT_LEFT_X : FOUR_SLOT_RIGHT_END - wide, FOUR_SLOT_LABEL_Y[item.row]];
  // A font select only where the page has another font in effect at the bar: the compiler never
  // selects the font already selected, 0 of the 820 selects on the four arch 14 configurations.
  const inEffect = program.slice(0, bar).findLast((one) => one.opcode === OP_FONT)?.operands[0];
  const drawn = new Uint8Array([
    ...(inEffect === font ? [] : [OP_FONT, font]),
    OP_TEXT_INLINE, x, y, ...codes, 0,
  ]);
  const insertAt = (program[bar] as ScreenInstruction).start;
  const programHole = relocate(current, insertAt, drawn.length);
  programHole.bytes.set(drawn, insertAt);
  current = parse(programHole.bytes);

  if (layout.used === 1 && (background === 'both' || !layout.rows)) {
    // Read both after the insertion, so neither address is stale by it.
    const full = modeRecords(current)?.[menu]?.pages.find((one) =>
      (taggedList(current, one.list)?.entries.length ?? 0) === FOUR_SLOT_ITEMS.length);
    const fullFirst = full === undefined ? undefined : screenProgram(current, full.program)?.[0];
    const crossed = fullFirst?.opcode === OP_IMAGE ? bitmapReference(fullFirst) : undefined;
    const last = modeRecords(current)?.[menu]?.pages.at(-1);
    const lastFirst = last === undefined ? undefined : screenProgram(current, last.program)?.[0];
    if (crossed === undefined || lastFirst?.opcode !== OP_IMAGE) {
      throw new ComposeError(`menu ${menu} has no full page to take the background from`);
    }
    current.blob.set(new Writer(3).u24(crossed).bytes, lastFirst.start + lastFirst.length - 3);
    current = parse(current.blob);
  }
  return { container: current, bound: nextRow - firstRowList };
}

/**
 * Where a two row list's pages draw their counter, `n`, `/`, `m`, on the title's line: x `0x63`,
 * `0x6A` and `0x6F`, a single digit page number included, where a corner page draws it at
 * `FOUR_SLOT_COUNTER_X`. On every two row device list page of the four arch 14 user configurations and
 * `h650_plasma_base`, section 285; measured again by `paginateFourSlot`'s test.
 */
const TWO_ROW_COUNTER_X: readonly [number, number, number] = [0x63, 0x6a, 0x6f];
/**
 * The most pages a menu composed here may reach: its counter is drawn as one digit either side of
 * the slash, and a compiled mode of ten pages or more moves the whole counter left, section 285,
 * which nothing here writes.
 */
const FOUR_SLOT_MAX_PAGES = 9;

/**
 * The three x positions a **device list's** page counter sits at, by its layout. The activity menu is
 * the exception that makes this a device list rule rather than a layout rule: it is a two row layout
 * and draws its counter where the corner lists do, `FOUR_SLOT_COUNTER_X`, on all 16 pages of the 7
 * multi page activity menus Logitech compiled for the Harmony 600, 650 and 700 here, section 316.
 */
function fourSlotCounterX(rows: boolean): readonly [number, number, number] {
  return rows ? TWO_ROW_COUNTER_X : FOUR_SLOT_COUNTER_X;
}

/**
 * What differs between the two arch 14 menus when one opens a page, and nothing else does: where the
 * counter sits, which font it falls back on where no page of the menu draws one yet, and which picture
 * a page holding one item draws. The step itself, `openFourSlotMenuPage`, is shared, decision 17.
 *
 * `background` is asked **after** every insertion the step makes below the page, since a picture
 * address read earlier is stale by them; it gets the menu's last full page's own picture, which is the
 * answer on a two row device list and not on the activity menu.
 */
interface FourSlotNewPage {
  counterX: readonly [number, number, number];
  counterDefault: number;
  background: (now: Container, lastPicture: number | undefined) => number | undefined;
}

/**
 * The opcodes a device list page's own chrome is made of, around its counter and its labels: the
 * background, the queued per mode instruction a corner page carries, the two bars, font selects and
 * texts, and the end. Anything else in the part a new page copies is refused rather than copied,
 * because nothing has said whether it holds an address `copiedInstruction` would leave stale.
 */
const FOUR_SLOT_CHROME_OPCODES: ReadonlySet<number> = new Set([
  OP_IMAGE, SCREEN_QUEUE_INSTRUCTION, SCREEN_DRAW_IMAGE_AT, OP_FONT, OP_TEXT_AT, OP_TEXT_INLINE, OP_END,
]);

/**
 * A new last page on an arch 14 menu whose last page is full, holding the one item being added, and
 * every page of the menu then counting to the new total: a device list's, section 312, and the
 * activity menu's, section 316, whose differences are the caller's `FourSlotNewPage`. The arch 14
 * counterpart of the Harmony One's `composeMenuPage`, and **the page is the one Logitech's compiler
 * writes**: composed on a configuration whose lists are full, the new pages are instruction for
 * instruction the pages the compiler wrote on a configuration with one device more, once font numbers
 * are read as roles and a label as its place, which `compose.test.ts` checks against
 * `h650_config_region` and `calibration_h600`. Two differences are kept, as section 294 kept them: the
 * composed texts are inline where the compiler points at an equal string elsewhere, and each binding
 * runs a row list of its own, appended to base slot 10 rather than numbered in stored order.
 *
 * What a new page is, read off those configurations rather than assumed:
 *
 * * **its chrome is its menu's own**, copied from the menu's last page: background, the queued per
 *   mode instruction on a corner page and none on a two row one, the top bar, the title, then after
 *   the labels the bottom bar and its word, which is "Activities" on the idle list and "Activity" on
 *   each activity's own, section 294. So the copy is per menu and not from one template;
 * * **a corner page holding one item draws the one item background**, the device mode pages' own,
 *   and a two row device list page draws the picture every page of its list draws, whatever it holds,
 *   section 285. The activity menu is two row and is the exception: its page of one activity draws the
 *   activities' working screens' one command background, section 316. Which is the caller's say;
 * * **the item takes the first place**: top left at x 3 and y 40 on a corner page, the top row's two
 *   buttons and a centred label at y 35 on a two row one, each binding running a row list of its own
 *   and the page's pool copy others, as `growFourSlotMenu` binds a grown item;
 * * **the counter is on every page of a menu of several pages and on no page of a menu of one**: all
 *   four one page device lists of `h600_config` and three of `calibration_h600` draw none, and all 43
 *   pages of the 20 multi page lists draw `n/m` in one font. So the new page draws its own, and
 *   `paginateFourSlot` restates every other page's.
 *
 * **What does not change is as much a measurement as what does.** A corner list's own record list is
 * `0x72` under tag `0x99` and `0x73` under tag `0x2D` on its 7 one page and 15 multi page instances
 * across the five configurations, and a two row list's is the `0x72` alone on all 5, none of which
 * has one page. So nothing like the Harmony One's deadened page turn keys has to be undone here,
 * section 275's rule being that model's; how an arch 14 remote turns a page is the firmware's and
 * unread.
 *
 * The insertions, each leaving the container parseable, in `composeMenuPage`'s order and for its
 * reasons: the pool copy right after the last page's copy, since copies pair with pages by position,
 * section 69; the list at the end of the page list run; the entry's count and a placeholder pointer;
 * the program and its six byte page record right after the last page's record, where the compiler
 * keeps them, which is the entry's own offset; and the swap. Every address the block embeds is read
 * after the last insertion below it, and `paging.background` is asked for the background then too.
 */
function openFourSlotMenuPage(
  start: Container, menu: number, firstRowList: number, codes: readonly number[], font: number,
  paging: FourSlotNewPage,
): { container: Container; bound: number } {
  let current = start;
  const recordOf = (): ModeRecord => {
    const record = modeRecords(current)?.[menu];
    if (record === undefined) throw new ComposeError(`menu ${menu} stopped reading`);
    return record;
  };
  const before = recordOf();
  const last = before.pages.at(-1);
  const lastList = last === undefined ? undefined : taggedList(current, last.list);
  if (last === undefined || lastList === undefined) throw new ComposeError(`menu ${menu} has no page`);
  const layout = menuLayout(current, lastList.entries);
  if (layout === undefined) throw new ComposeError(`menu ${menu}'s last page is neither arch 14 layout`);
  if (layout.used < layout.capacity) {
    throw new ComposeError(`menu ${menu}'s last page has room, so the item goes on it and not on a new page`);
  }
  const total = before.pages.length + 1;
  if (total > FOUR_SLOT_MAX_PAGES) {
    throw new ComposeError(`menu ${menu} would have ${total} pages, and a counter of two digits is not composed`);
  }
  const counterX = paging.counterX;
  // The counter's font: the menu's own where a page already draws one, which on every configuration
  // here is also the device mode pages' counter font that the caller passes as the default, for the
  // device lists and for the 7 multi page activity menus alike, section 316.
  let counterFont = paging.counterDefault;
  for (const page of before.pages) {
    const number = textAt(screenProgram(current, page.program) ?? [], counterX[0], FOUR_SLOT_TITLE_XY[1]);
    if (number?.font !== undefined) { counterFont = number.font; break; }
  }
  const map = characterMap(current);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const counterSet = (fontSets(current) ?? [])[counterFont];
  if (counterSet === undefined) throw new ComposeError(`the config does not carry font ${counterFont}`);
  // Spelled now, as codes: a code names a glyph by position and does not move with an insertion.
  const counterCodes = [String(total), '/', String(total)].map((text) =>
    codesFor(map, current, counterSet, text, counterFont));

  // The scans the item is bound to, the first place of the layout, and a list writer that hands each
  // binding the next row list, copy first and then the page's own, as `growFourSlotMenu` does.
  const scans = layout.rows
    ? [...(FOUR_SLOT_ROWS[0] as readonly number[])]
    : [(FOUR_SLOT_ITEMS[0] as (typeof FOUR_SLOT_ITEMS)[number]).scan];
  let nextRow = firstRowList;
  const pageList = (): Uint8Array => {
    const placed = scans.map((scan) => ({ scan, row: nextRow++ }))
      .sort((a, b) => FOUR_SLOT_STORED_ORDER.indexOf(a.scan) - FOUR_SLOT_STORED_ORDER.indexOf(b.scan));
    const bytes = new Writer(1 + 4 * placed.length).u8(placed.length);
    for (const one of placed) {
      bytes.u8((KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | one.scan).u16(one.row).u8(ACTION_LIST_INDEX_OPCODE);
    }
    return bytes.bytes;
  };

  // 1. The pool copy, right after the copy of the menu's last page.
  const lastIndex = modePages(current).findIndex((one) => one.address === last.address);
  const copyOff = pageListCopies(current)[lastIndex];
  const copyLength = copyOff === undefined ? undefined : taggedList(current, copyOff + current.flashBase)?.length;
  if (copyOff === undefined || copyLength === undefined) {
    throw new ComposeError(`menu ${menu}'s last page has no pool copy`);
  }
  const copyBytes = pageList();
  const copyHole = relocate(current, copyOff + copyLength, copyBytes.length);
  copyHole.bytes.set(copyBytes, copyOff + copyLength);
  current = parse(copyHole.bytes);

  // 2. The page's own list, at the end of the run every page list lives in. Nothing names it until
  // the page record exists, so its address is carried by arithmetic through the next two insertions.
  const listBytes = pageList();
  const listAt = Math.max(...modePages(current).map((page) => {
    const off = current.blobOffsetOf(page.list);
    const list = taggedList(current, page.list);
    return off === undefined || list === undefined ? 0 : off + list.length;
  }));
  const listHole = relocate(current, listAt, listBytes.length);
  listHole.bytes.set(listBytes, listAt);
  current = parse(listHole.bytes);

  // 3. The entry: its count, and a pointer at the last page until the new record exists.
  const grownRecord = recordOf();
  const entryOff = current.blobOffsetOf(grownRecord.address);
  const lastNow = grownRecord.pages.at(-1);
  if (entryOff === undefined || lastNow === undefined) throw new ComposeError(`menu ${menu}'s entry moved out of reach`);
  const slotAt = entryOff + 6 + 3 * grownRecord.pageCount;
  let pageListOff = listAt + (listAt >= slotAt ? 3 : 0);
  const entryHole = relocate(current, slotAt, 3);
  entryHole.bytes.set(new Writer(3).u24(lastNow.address).bytes, slotAt);
  entryHole.bytes.set(new Writer(2).u16(grownRecord.pageCount + 1).bytes, entryOff + 4);
  current = parse(entryHole.bytes);

  // 4. The block: the program, then the page record, at the entry's own offset, which is right after
  // the last page's record on every arch 14 mode here. Everything it copies is read now.
  const record = recordOf();
  const lastReal = record.pages[record.pageCount - 2];
  const blockAt = current.blobOffsetOf(record.address);
  const lastRealOff = lastReal === undefined ? undefined : current.blobOffsetOf(lastReal.address);
  if (lastReal === undefined || blockAt === undefined || lastRealOff === undefined) {
    throw new ComposeError(`menu ${menu}'s pages moved out of reach`);
  }
  if (lastRealOff + lastReal.length !== blockAt) {
    throw new ComposeError(`menu ${menu}'s last page record does not end where its entry begins`);
  }
  const program = screenProgram(current, lastReal.program) ?? [];
  const title = textAt(program, ...FOUR_SLOT_TITLE_XY);
  const bar = program.findLastIndex((one) => one.opcode === SCREEN_DRAW_IMAGE_AT);
  if (title === undefined || bar <= title.index || program[0]?.opcode !== OP_IMAGE
      || program.at(-1)?.opcode !== OP_END) {
    throw new ComposeError(`menu ${menu}'s last page does not have the chrome a page is copied from`);
  }
  const unknown = program.find((one) => !FOUR_SLOT_CHROME_OPCODES.has(one.opcode));
  if (unknown !== undefined) {
    throw new ComposeError(`menu ${menu}'s last page draws opcode 0x${unknown.opcode.toString(16)}, `
      + 'which a new page does not copy');
  }
  const head = program.slice(1, title.index + 1);
  const tail = program.slice(bar);
  const background = paging.background(current, bitmapReference(program[0] as ScreenInstruction));
  if (background === undefined) {
    throw new ComposeError(`no page here draws the background a new page of menu ${menu} needs`);
  }
  // The label, measured in the font table as it is now, since a set read before an insertion below
  // it is stale by that insertion.
  const labelSet = (fontSets(current) ?? [])[font];
  if (labelSet === undefined) throw new ComposeError(`the config does not carry font ${font}`);
  const wide = textWidth(current, labelSet, codes);
  const [labelX, labelY] = layout.rows
    ? [Math.floor((FOUR_SLOT_SCREEN_WIDTH - wide) / 2), TWO_ROW_LABEL_Y[0] as number]
    : [FOUR_SLOT_LEFT_X, FOUR_SLOT_LABEL_Y[0]];
  // The middle the copy leaves out is written fresh: the counter in its font, then the one label in
  // the label font, a font being selected only where another is in effect, as the compiler does.
  const titleFont = head.findLast((one) => one.opcode === OP_FONT)?.operands[0];
  const middle: number[] = [];
  if (counterFont !== titleFont) middle.push(OP_FONT, counterFont);
  counterCodes.forEach((one, k) => middle.push(OP_TEXT_INLINE, counterX[k] as number, FOUR_SLOT_TITLE_XY[1], ...one, 0));
  if (font !== counterFont) middle.push(OP_FONT, font);
  middle.push(OP_TEXT_INLINE, labelX, labelY, ...codes, 0);
  const first = program[0] as ScreenInstruction;
  const programLength = first.length + middle.length
    + [...head, ...tail].reduce((sum, one) => sum + one.length, 0);
  const pageRecordLength = lastReal.length;
  const blockLength = programLength + pageRecordLength;
  const base = current.flashBase + blockAt;
  const shifted = (address: number): number => (address >= base ? address + blockLength : address);
  pageListOff += pageListOff >= blockAt ? blockLength : 0;
  const block = new Writer(blockLength);
  block.u8(OP_IMAGE).u8(first.operands[0] as number).u8(first.operands[1] as number).u24(shifted(background));
  for (const one of head) block.raw(copiedInstruction(current, one, shifted));
  block.raw(new Uint8Array(middle));
  for (const one of tail) block.raw(copiedInstruction(current, one, shifted));
  // The page list has already been placed by step 2, so its address is final once this block moves
  // it, which `pageListOff` has been carried through; the program is the block's own first byte.
  block.u24(current.flashBase + pageListOff).u24(base);
  if (block.bytes.length !== blockLength) {
    throw new ComposeError(`the new page came to ${block.bytes.length} bytes against ${blockLength}`);
  }
  const blockHole = relocate(current, blockAt, blockLength);
  blockHole.bytes.set(block.bytes, blockAt);

  // 5. The swap: the entry's last pointer from the placeholder to the new page record.
  const placed = parse(blockHole.bytes);
  const swapRecord = modeRecords(placed)?.[menu];
  const swapOff = swapRecord === undefined ? undefined : placed.blobOffsetOf(swapRecord.address);
  if (swapRecord === undefined || swapOff === undefined) throw new ComposeError(`menu ${menu}'s entry moved out of reach`);
  placed.blob.set(new Writer(3).u24(base + programLength).bytes, swapOff + 6 + 3 * (swapRecord.pageCount - 1));

  // 6. Every page counts to the new total, and the page that had none, a menu's only page, gains one.
  return {
    container: paginateFourSlot(parse(placed.blob), menu, counterX, counterFont),
    bound: nextRow - firstRowList,
  };
}

/**
 * Make an arch 14 menu's page counters agree with its page count: every page draws `n/m` on the
 * title's line, its own number and the total, at the three positions `x` the caller states, which are
 * per menu and not per layout, `FourSlotNewPage`. **Arch 14's whole paging is the counter**, where the
 * Harmony One's `paginate` also restates a header total and undeadens two keys: an arch 14 page carries
 * its own chrome and calls no header, and a device list's record list is the same whatever its page
 * count, `openFourSlotMenuPage`, as the activity menu's is, section 316.
 *
 * A page with a counter has its number and total restated through `pageTexts`, so a total drawn by
 * reference is pointed at a string reading the new one, which the new page's own inline total
 * supplies, and an inline one is drawn again with its borrowers moved first. A page with none, which
 * is a menu's only page before it gained a second, gets one inserted right after its title, in the
 * counter font, the font in effect before being put back when what follows does not select its own.
 * That is the shape of every first page of a two page corner list on the 650 and the 700: title,
 * counter font, the three texts, label font, labels, and of every first page of a multi page activity
 * menu, section 316.
 */
function paginateFourSlot(
  start: Container, menu: number, x: readonly [number, number, number], counterFont: number,
): Container {
  if (start.architecture !== 14) throw new ComposeError('this paging is arch 14\'s');
  const t = pageTexts(start, menu);
  const y = FOUR_SLOT_TITLE_XY[1];
  const count = modeRecords(t.current)?.[menu]?.pages.length ?? 0;
  if (count < 2) throw new ComposeError(`menu ${menu} has one page, so there is nothing to count`);
  for (let k = 0; k < count; k += 1) {
    // Read again for every edit: each one moves what sits above it.
    const programOf = (): ScreenInstruction[] => {
      const page = modeRecords(t.current)?.[menu]?.pages[k];
      if (page === undefined) throw new ComposeError(`menu ${menu} lost page ${k + 1}`);
      return screenProgram(t.current, page.program) ?? [];
    };
    // One text of the counter restated, found again first since the edit before it may have moved it.
    const restateAt = (at: number, want: string, what: string): void => {
      const program = programOf();
      const found = textAt(program, at, y);
      if (found === undefined) throw new ComposeError(`menu ${menu}'s ${what} went missing`);
      t.restate(program[found.index] as ScreenInstruction, found.font, want, what);
    };
    const found = x.map((at) => textAt(programOf(), at, y));
    if (found.every((one) => one !== undefined)) {
      restateAt(x[0], String(k + 1), `page ${k + 1}'s number`);
      restateAt(x[2], String(count), `page ${k + 1}'s total`);
      continue;
    }
    if (found.some((one) => one !== undefined)) {
      throw new ComposeError(`menu ${menu}'s page ${k + 1} draws part of a counter, which is not restated`);
    }
    const program = programOf();
    const title = textAt(program, ...FOUR_SLOT_TITLE_XY);
    if (title === undefined) throw new ComposeError(`menu ${menu}'s page ${k + 1} draws no title to count after`);
    const after = program[title.index] as ScreenInstruction;
    const next = program[title.index + 1];
    const bytes: number[] = [];
    if (title.font !== counterFont) bytes.push(OP_FONT, counterFont);
    [String(k + 1), '/', String(count)].forEach((text, n) =>
      bytes.push(...t.drawn(x[n] as number, y, text, counterFont, counterFont)));
    if (title.font !== undefined && title.font !== counterFont && next?.opcode !== OP_FONT) {
      bytes.push(OP_FONT, title.font);
    }
    t.insert(after.start + after.length, bytes);
  }
  return t.current;
}

/**
 * A page's tagged list on arch 14: the lists its items run, bound in `FOUR_SLOT_ITEMS` order and
 * stored in `FOUR_SLOT_STORED_ORDER`, as all 184 device pages of section 285 are.
 *
 * **A page that binds nothing is two bytes and not one**, `00 00`: a first byte of zero is what says
 * the list is in the wide form, whose count follows, so a lone `00` reads as a wide list whose count is
 * the next structure's first byte. All 258 empty page lists on the four arch 14 user configurations
 * are `00 00`, section 290, and the one byte form cost a whole run of list copies to the reader.
 */
function fourSlotPageList(itemLists: readonly number[]): Uint8Array {
  if (itemLists.length === 0) return new Uint8Array([0, 0]);
  const bytes = new Writer(1 + 4 * itemLists.length).u8(itemLists.length);
  const placed = itemLists.map((list, k) => ({ scan: FOUR_SLOT_ITEMS[k]?.scan as number, list }))
    .sort((a, b) => FOUR_SLOT_STORED_ORDER.indexOf(a.scan) - FOUR_SLOT_STORED_ORDER.indexOf(b.scan));
  for (const one of placed) {
    bytes.u8((KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | one.scan).u16(one.list).u8(ACTION_LIST_INDEX_OPCODE);
  }
  return bytes.bytes;
}

/** A mode page's program, sized before the block is placed and built once its addresses are known. */
interface Arch14Program {
  length: number;
  build: (shifted: (address: number) => number) => Uint8Array;
}

/**
 * A four slot page's program: the template's background for one item or none, or for more, the rest
 * of its top chrome, the title, the page counter when there is one, the labels, left ones from the
 * edge and right ones ending at it, and the template's bottom chrome. The background is written by
 * hand and everything else around the middle is copied.
 */
function fourSlotPageProgram(
  c: Container, template: FourSlotTemplate, measuring: FontSet,
  page: {
    titleCodes: readonly number[]; counter?: readonly (readonly number[])[] | undefined; labels: readonly (readonly number[])[];
    /**
     * A label's second line, per label, where it has one, from `fourSlotLabelLines`. The first line
     * then sits one line height higher and the second where a one line label would, each placed on
     * its own, so a right one ends at the edge line by line. Omitted, every label is one line, which
     * is what every caller passed before the activity screen wrapped its labels.
     */
    second?: readonly (readonly number[] | undefined)[];
  },
): Arch14Program {
  const text = (x: number, y: number, codes: readonly number[]): number[] =>
    [OP_TEXT_INLINE, x, y, ...codes, 0];
  const middle: number[] = [OP_FONT, template.titleFont,
    ...text(FOUR_SLOT_TITLE_XY[0], FOUR_SLOT_TITLE_XY[1], page.titleCodes)];
  if (page.counter !== undefined) {
    middle.push(OP_FONT, template.counterFont,
      ...page.counter.flatMap((codes, k) => text(FOUR_SLOT_COUNTER_X[k] as number, FOUR_SLOT_TITLE_XY[1], codes)));
  }
  if (page.labels.length > 0) middle.push(OP_FONT, template.labelFont);
  page.labels.forEach((codes, k) => {
    const item = FOUR_SLOT_ITEMS[k] as (typeof FOUR_SLOT_ITEMS)[number];
    const xOf = (line: readonly number[]): number =>
      item.column === 0 ? FOUR_SLOT_LEFT_X : FOUR_SLOT_RIGHT_END - textWidth(c, measuring, line);
    const second = page.second?.[k];
    if (second === undefined) {
      middle.push(...text(xOf(codes), FOUR_SLOT_LABEL_Y[item.row], codes));
    } else {
      middle.push(...text(xOf(codes), FOUR_SLOT_LABEL_Y[item.row] - FOUR_SLOT_LINE_RISE, codes));
      middle.push(...text(xOf(second), FOUR_SLOT_LABEL_Y[item.row], second));
    }
  });
  const copied = [...template.prefix.slice(1), ...template.suffix];
  const length = 1 + 5 + copied.reduce((sum, one) => sum + one.length, 0) + middle.length;
  const background = page.labels.length > 1 ? template.crossed : template.single;
  if (background === undefined) {
    throw new ComposeError(`no page here holding ${page.labels.length > 1 ? 'several items' : 'one item or none'} `
      + 'draws a background to copy for one');
  }
  return {
    length,
    build: (shifted) => {
      const out: number[] = [OP_IMAGE, 0, 0, ...new Writer(3).u24(shifted(background)).bytes];
      for (const one of template.prefix.slice(1)) out.push(...copiedInstruction(c, one, shifted));
      out.push(...middle);
      for (const one of template.suffix) out.push(...copiedInstruction(c, one, shifted));
      return new Uint8Array(out);
    },
  };
}

/**
 * Add a mode to an arch 14 configuration: the step `composeFourSlotDeviceScreen` and
 * `composeFourSlotActivityScreen` share, decision 17's shared step, so the order that keeps the
 * container parseable through it is written once.
 *
 * 1. the mode table gains an entry, on a placeholder until the block exists, as on the Harmony One;
 * 2. each page's list, its copy at the end of the last pool and itself at the end of the page lists,
 *    in page order, because the copies pair with the pages by position, section 69; one hole each
 *    for all the copies and all the lists, since a list nothing names yet is invisible to the walks
 *    that find the ends, and a second insertion then lands in front of the first;
 * 3. the block, where the mode entries end: the mode's own tagged list, then per page its program
 *    and a six byte page record, then the entry. Its own addresses are final, and the ones a program
 *    copies are shifted by its length the way the census would shift them, since the census cannot
 *    see bytes not yet written. `programsFor` is called after step 2, with the container as it then
 *    is, so a template read inside it is not stale;
 * 4. the swap: the table's last pointer from the placeholder to the entry.
 */
function appendArch14Mode(
  start: Container, mode: number, own: readonly { tag: number; operand: number; opcode: number }[],
  lists: readonly Uint8Array[], programsFor: (current: Container) => Arch14Program[],
): Container {
  let current = start;
  const stale = modeTable(current);
  if (stale === undefined) throw new ComposeError('base slot 6 stopped reading');
  if (stale.addresses.length !== mode) {
    throw new ComposeError(`the new mode would be ${stale.addresses.length}, not the ${mode} expected`);
  }
  const placeholderEntry = stale.addresses[0];
  if (placeholderEntry === undefined) throw new ComposeError('a config with no modes has no menus');
  const tableAt = stale.start + stale.length;
  const tableHole = relocate(current, tableAt, 3);
  tableHole.bytes.set(new Writer(3).u24(placeholderEntry).bytes, tableAt);
  tableHole.bytes.set(new Writer(3).u24(mode + 1).bytes, stale.start);
  current = parse(tableHole.bytes);

  const allLists = new Uint8Array(lists.reduce((sum, bytes) => sum + bytes.length, 0));
  lists.reduce((offset, bytes) => { allLists.set(bytes, offset); return offset + bytes.length; }, 0);
  const lastPool = taggedListPools(current).at(-1);
  if (lastPool === undefined) throw new ComposeError('no copy pool to extend');
  const copyHole = relocate(current, lastPool.end, allLists.length);
  copyHole.bytes.set(allLists, lastPool.end);
  current = parse(copyHole.bytes);
  const listAt = Math.max(...modePages(current).map((page) => {
    const off = current.blobOffsetOf(page.list);
    const list = taggedList(current, page.list);
    return off === undefined || list === undefined ? 0 : off + list.length;
  }));
  const listHole = relocate(current, listAt, allLists.length);
  listHole.bytes.set(allLists, listAt);
  current = parse(listHole.bytes);
  const pageListAddresses: number[] = [];
  lists.reduce((offset, bytes) => {
    pageListAddresses.push(current.flashBase + offset);
    return offset + bytes.length;
  }, listAt);

  const records = modeRecords(current);
  if (records === undefined) throw new ComposeError('base slot 6 does not read');
  const programs = programsFor(current);
  if (programs.length !== lists.length) {
    throw new ComposeError(`${programs.length} programs for ${lists.length} pages`);
  }
  const ownLength = 1 + 4 * own.length;
  const pageRecord = 6;
  const blockLength = ownLength + programs.reduce((sum, one) => sum + one.length + pageRecord, 0)
    + 6 + 3 * programs.length;
  const blockAt = Math.max(...records.map((record) => {
    const off = current.blobOffsetOf(record.address);
    return off === undefined ? 0 : off + record.entryLength;
  }));
  const base = current.flashBase + blockAt;
  const shifted = (address: number): number => (address >= base ? address + blockLength : address);
  const block = new Writer(blockLength);
  block.u8(own.length);
  for (const entry of own) block.u8(entry.tag).u16(entry.operand).u8(entry.opcode);
  const pageAddresses: number[] = [];
  let at = base + ownLength;
  programs.forEach((program, p) => {
    const programAddress = at;
    const bytes = program.build(shifted);
    if (bytes.length !== program.length) {
      throw new ComposeError(`page ${p}'s program came to ${bytes.length} bytes against ${program.length}`);
    }
    block.raw(bytes);
    at += program.length;
    pageAddresses.push(at);
    block.u24(shifted(pageListAddresses[p] as number)).u24(programAddress);
    at += pageRecord;
  });
  const entryAddress = at;
  block.u8(0).u24(base).u16(programs.length);
  pageAddresses.forEach((address) => block.u24(address));
  if (block.bytes.length !== blockLength) {
    throw new ComposeError(`the block came to ${block.bytes.length} bytes against the ${blockLength} its hole has`);
  }
  const blockHole = relocate(current, blockAt, blockLength);
  blockHole.bytes.set(block.bytes, blockAt);

  const swapped = parse(blockHole.bytes);
  const grownTable = modeTable(swapped);
  if (grownTable === undefined) throw new ComposeError('base slot 6 stopped reading');
  swapped.blob.set(new Writer(3).u24(entryAddress).bytes, grownTable.start + 3 + 3 * mode);
  return parse(swapped.blob);
}

function composeFourSlotDeviceScreen(
  c: Container, label: string, rows: readonly ComposeRow[], options: ComposeScreenOptions,
): ComposedScreen {
  if (rows.length === 0) throw new ComposeError('a device mode needs at least one command on its screen');
  const perPage = FOUR_SLOT_ITEMS.length;
  const pageCount = Math.ceil(rows.length / perPage);
  if (pageCount > 9) throw new ComposeError('a page counter of two digits is not composed');
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const template = fourSlotTemplate(c, options.keysLike);
  const sets = fontSets(c) ?? [];
  const setOf = (font: number): FontSet => {
    const set = sets[font];
    if (set === undefined) throw new ComposeError(`the config does not carry font ${font}`);
    return set;
  };
  const titleCodes = codesFor(map, c, setOf(template.titleFont), label, template.titleFont);
  const menuCodes = codesFor(map, c, setOf(template.labelFont), label, template.labelFont);
  const rowCodes = rows.map((row) => codesFor(map, c, setOf(template.labelFont), row.label,
                                              template.labelFont));
  const digitCodes = (n: number): number[] =>
    codesFor(map, c, setOf(template.counterFont), String(n), template.counterFont);
  const slashCodes = codesFor(map, c, setOf(template.counterFont), '/', template.counterFont);
  [label, ...rows.map((row) => row.label)].forEach((text, k) => {
    const wide = textWidth(c, setOf(template.labelFont), k === 0 ? menuCodes : rowCodes[k - 1] as number[]);
    if (wide > FOUR_SLOT_LABEL_MAX) {
      throw new ComposeError(`'${text}' is ${wide} pixels wide and a corner holds ${FOUR_SLOT_LABEL_MAX}: `
        + 'give it a shorter label');
    }
  });

  const found = deviceListMenus(c);
  if (found.menus.length === 0 || found.marker === undefined) {
    throw new ComposeError('no device list menu found to grow');
  }
  // Counted before anything moves: how many buttons the new device takes on each menu, one corner or
  // a row's two, which is how many row lists step 1 writes for that menu's list and as many again for
  // its copy. A menu whose last page is full gets a new page, `openFourSlotMenuPage`, where the device
  // takes the first place, which is one corner or the top row's two buttons all the same. A menu that
  // would need a tenth page is refused here, before anything moves, rather than inside the loop.
  let rowBindings = 0;
  for (const menu of found.menus) {
    const record = modeRecords(c)?.[menu];
    const page = record?.pages.at(-1);
    const layout = menuLayout(c, taggedList(c, page?.list ?? 0)?.entries ?? []);
    if (record === undefined || layout === undefined) {
      throw new ComposeError(`menu ${menu}'s last page is neither of the two arch 14 layouts`);
    }
    const full = layout.used >= layout.capacity;
    if (full && record.pages.length + 1 > FOUR_SLOT_MAX_PAGES) {
      throw new ComposeError(`menu ${menu} would need page ${record.pages.length + 1}, and a counter of `
        + 'two digits is not composed');
    }
    const place = full ? 0 : layout.used;
    rowBindings += 2 * (layout.rows ? (FOUR_SLOT_ROWS[place] as readonly number[]).length : 1);
  }
  const table = modeTable(c);
  if (table === undefined) throw new ComposeError('base slot 6 states no table');
  const mode = table.addresses.length;

  // The key map, from the template mode's own list: same keys in the same order, each bound to the
  // command sending the same frame when exactly one does, and to nothing when none does. The two
  // bindings that are not keys but the mode's own navigation, the list and the map through base slot
  // 14 that every device mode carries, are copied as they are, and the four corners are nothing
  // because a page binds them.
  const lists = c.actionLists() ?? [];
  const keyTemplate = modeRecords(c)?.[template.keyMode]?.entries ?? [];
  // By frame, and a set rather than a list: two items running one command are one command.
  const ours = new Map<string, Set<number>>();
  rows.forEach((row) => {
    const frame = sentFrame(c, lists[row.list]);
    if (frame !== undefined) ours.set(frame, (ours.get(frame) ?? new Set()).add(row.list));
  });
  const slotScans = new Set(FOUR_SLOT_ITEMS.map((item) => item.scan));
  let keys = 0;
  const own = keyTemplate.map((entry) => {
    if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) {
      const corner = slotScans.has(entry.tag & SCAN_MASK) && entry.tag >> KEY_EVENT_SHIFT === KEY_EVENT_PRESS;
      return corner ? { tag: entry.tag, operand: 0, opcode: 0 } : entry;
    }
    const frame = sentFrame(c, lists[entry.operand]);
    const match = frame === undefined ? undefined : ours.get(frame);
    if (match?.size === 1) {
      keys += 1;
      return { tag: entry.tag, operand: [...match][0] as number, opcode: ACTION_LIST_INDEX_OPCODE };
    }
    return { tag: entry.tag, operand: 0, opcode: 0 };
  });
  if (keyTemplate.some((entry) => entry.flags !== undefined)) {
    throw new ComposeError('the template key map is not the narrow form every device mode uses');
  }

  // 1. The row lists: enter the new mode, write the marker. **One per button bound, and another for
  // each copy**, identical, because that is what the compiler writes: on the four arch 14 user
  // configurations 300 row lists are bound 300 times, none twice and none shared between a page and
  // its copy. The Harmony One composer shares one, and that is measured to work there; here the
  // compiler's own shape is the one with nothing left to find out.
  const actionSlot = archSlot(c.architecture as number, ACTION_TABLE_SLOT);
  const actionTable = c.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const rowList = actionTable.values.length;
  const oneRow = new Writer(1 + 3 * 2).u8(2)
    .u16(mode).u8(ENTER_MODE)
    .u16(found.marker.operand).u8(found.marker.opcode).bytes;
  const rowAt = actionTable.start;
  const rowHole = relocate(c, rowAt, oneRow.length * rowBindings);
  for (let k = 0; k < rowBindings; k += 1) rowHole.bytes.set(oneRow, rowAt + k * oneRow.length);
  let current = parse(appendTableEntries(parse(rowHole.bytes), actionSlot,
    Array.from({ length: rowBindings }, (_, k) => c.flashBase + rowAt + k * oneRow.length)));
  let nextRow = rowList;

  // 2 to 6. The mode itself, through the step every arch 14 mode composer shares. Filled in
  // `FOUR_SLOT_ITEMS` order and stored in `FOUR_SLOT_STORED_ORDER`, as every page is.
  const pageRows = Array.from({ length: pageCount }, (_, p) => rows.slice(p * perPage, (p + 1) * perPage));
  const pageListBytes = pageRows.map((onPage) => fourSlotPageList(onPage.map((row) => row.list)));
  current = appendArch14Mode(current, mode, own, pageListBytes, (now) => {
    // Read again: every address and offset the first reading holds is stale by the insertions above.
    const fresh = fourSlotTemplate(now, options.keysLike);
    const measuring = (fontSets(now) ?? [])[template.labelFont];
    if (measuring === undefined) throw new ComposeError('the label font stopped reading');
    return pageRows.map((onPage, p) => fourSlotPageProgram(now, fresh, measuring, {
      titleCodes,
      counter: pageCount > 1 ? [digitCodes(p + 1), slashCodes, digitCodes(pageCount)] : undefined,
      labels: onPage.map((_, k) => rowCodes[p * perPage + k] as number[]),
    }));
  });

  // 7. One more item on each menu's last page, which is a step `composeFourSlotActivityRow` shares.
  // A corner page that held one device takes the crossed background its menu's full pages draw; a
  // two row list's one device page already draws its full pages' picture, on the two lists that have
  // one, so that layout changes nothing. A menu whose last page is full gets a new page instead,
  // and every page of it then counts to the new total. The one item background is asked for inside
  // that step, after its own insertions, since a picture address read now would be stale by them.
  const pagesAdded: number[] = [];
  for (const menu of found.menus) {
    const last = modeRecords(current)?.[menu]?.pages.at(-1);
    const layout = menuLayout(current, taggedList(current, last?.list ?? 0)?.entries ?? []);
    if (layout === undefined) throw new ComposeError(`menu ${menu} changed layout while being grown`);
    const grown = layout.used < layout.capacity
      ? growFourSlotMenu(current, menu, nextRow, menuCodes, template.labelFont, 'corners')
      : openFourSlotMenuPage(current, menu, nextRow, menuCodes, template.labelFont, {
        counterX: fourSlotCounterX(layout.rows),
        counterDefault: template.counterFont,
        // A two row list's new page draws what its last page draws; a corner page holding one device
        // the device mode pages' one item background, section 312.
        background: (now, last) => (layout.rows ? last : fourSlotTemplate(now, options.keysLike).single),
      });
    if (layout.used >= layout.capacity) pagesAdded.push(menu);
    current = grown.container;
    nextRow += grown.bound;
  }

  if (nextRow !== rowList + rowBindings) {
    throw new ComposeError(`${nextRow - rowList} row lists bound against the ${rowBindings} written`);
  }
  return {
    bytes: restamped(current.blob), mode, menus: found.menus, rowList, pagesAdded, keys,
    pages: pageCount, rowLists: rowBindings,
  };
}

/**
 * The activity menu's mode, and the marker its rows write, read off the rows the config has.
 *
 * The shape of an activity row is the device list row's with one instruction swapped: beep, then
 * **select a base slot 9 entry** where a device row enters a mode, then the same per configuration
 * marker variable, written **0** where a device row writes 1. Section 275. On arch 14 (Harmony 600,
 * 650 and 700) there is no beep, as on that architecture's device rows, section 289.
 *
 * Read rather than tabulated for the same reason `deviceModeMarker` is: which variable marks the
 * top level screen differs per configuration, so a composer carrying a number would write a menu row
 * that parses, renders, and points the remote at the wrong screen.
 */
function activityMenus(c: Container): { menu: number | undefined; marker: Instruction | undefined } {
  const lists = c.actionLists() ?? [];
  // The row without its beep: an arch 14 (Harmony 600, 650 and 700) row carries none and an arch 12
  // (Harmony One) row opens with one, section 289.
  const bodyOf = (list: readonly Instruction[] | undefined): readonly Instruction[] | undefined => {
    if (list === undefined) return undefined;
    if (c.architecture === 14) return list;
    return list[0]?.opcode === BEEP_OPCODE ? list.slice(1) : undefined;
  };
  const endOfRow = (index: number): Instruction | undefined => {
    const body = bodyOf(lists[index]);
    if (body === undefined || body.length !== 2) return undefined;
    const select = body[0] as Instruction;
    if (select.opcode !== SELECT_BINDING_SET) return undefined;
    if ((select.operand & SELECT_BINDING_SET_MASK) !== SELECT_BINDING_SET_MASK) return undefined;
    return body[1] as Instruction;
  };
  const records = modeRecords(c) ?? [];
  let menu: number | undefined;
  let marker: Instruction | undefined;
  let most = 0;
  records.forEach((record, index) => {
    const sets = new Set<number>();
    let end: Instruction | undefined;
    for (const page of record.pages) {
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
        const found = endOfRow(entry.operand);
        if (found === undefined) continue;
        sets.add((bodyOf(lists[entry.operand])?.[0] as Instruction).operand & 0xff);
        end = found;
      }
    }
    if (sets.size > most) { most = sets.size; menu = index; marker = end; }
  });
  return { menu, marker };
}

/**
 * The activity menu's own page layout, measured on four arch 12 (Harmony One) configurations,
 * section 275, and **it is not the device list's**.
 *
 * That was the composer's first assumption and it was wrong. A device list page offers three row
 * rectangles, **one** bottom key and the two rectangles beside the display; an activity menu page
 * offers up to three rows, **two** bottom keys and the same two beside it. So the two menus share a
 * pixel grid and nothing else, and `composeMenuPage` correctly refuses an activity page as a layout
 * it does not know.
 *
 * **The difference is which of the two physical bottom buttons the page enables**, and that is the
 * whole of it: a device list page carries a rectangle for the left one only, 29 of 29, where an
 * activity menu page carries both, 6 of 6. Neither carries a page flip, because a Harmony One turns
 * pages with the buttons beside the display and no page binds those, 0 of 778.
 *
 * Three rows, at these panel coordinates, identical on all four configurations: the same rectangle
 * stepped down by `ACTIVITY_ROW_PITCH`, with the top row first. The bottom keys sit at `y` 271 and
 * the edges at 1400, neither of which this composer ever writes.
 */
const ACTIVITY_ROWS = 3;
/**
 * The rows' panel pitch and their left edge, both **already derived** and imported rather than
 * measured again here: section 125 established that a hit rectangle's `LIST_ROW_PITCH` and a screen
 * program's `SCREEN_ROW_PITCH` are one distance measured in two units. That the activity menu's rows
 * sit on that same grid is what this section adds, and it is checked over eleven rows.
 */
const ACTIVITY_ROW_PITCH = LIST_ROW_PITCH;
const ACTIVITY_ROW_LEFT = PANEL_LEFT;
/**
 * A hit page numbers its areas **by position**: the first is scan 48, the second 49, and so on, with
 * the two edges carrying 46 and 47 wherever they sit. That is why which scan is which row differs
 * per page, section 125, and it is what makes a row safe to append: a new area added after the last
 * content one takes the next unused scan and moves nobody else's.
 */
const MENU_FIRST_SCAN = 48;

/** One activity menu page as this composer needs to see it: its rows, its keys and its edges. */
interface ActivityPageLayout {
  /** The row rectangles, top of the screen first, which is descending panel `y`. */
  rows: TouchArea[];
  /** Everything else the page offers except the two edges, in stored order. */
  keys: TouchArea[];
  edges: TouchArea[];
  /** The areas in stored order, which is what assigns the scan codes. */
  content: TouchArea[];
}

/**
 * Read a page's hit rectangles as an activity menu layout, or undefined where it is not one.
 *
 * A row is recognised by **geometry against the page's own widest rectangle**, rather than by scan
 * code, because the scan is positional and varies per page: on one configuration the three rows are
 * scans 50, 51 and 52 on the first page and 48, 49 and 50 on the second. The rows are the areas
 * sharing the widest one's `x`, `width` and `height`, which separates them from the two bottom keys,
 * that being half width and taller, and from the edges, that being narrow and tall.
 */
function activityPageLayout(page: TouchPage): ActivityPageLayout | undefined {
  const edges = page.areas.filter((area) => area.code === MENU_EDGE_SCANS[0]
    || area.code === MENU_EDGE_SCANS[1]);
  if (edges.length !== 2) return undefined;
  const content = page.areas.filter((area) => !edges.includes(area));
  if (content.length === 0) return undefined;
  // The widest content rectangle is a row: a row spans the list, a bottom key spans half of it.
  const widest = content.reduce((a, b) => (b.width > a.width ? b : a));
  const isRow = (area: TouchArea): boolean => area.x === widest.x && area.width === widest.width
    && area.height === widest.height;
  const rows = content.filter(isRow).sort((a, b) => b.y - a.y);
  const keys = content.filter((area) => !isRow(area));
  if (rows.length === 0 || rows.length > ACTIVITY_ROWS) return undefined;
  // The rows must sit on the grid, so a page whose wide rectangles are something else is refused
  // rather than grown into a fourth row nothing draws.
  const top = rows[0] as TouchArea;
  if (!rows.every((area, k) => area.y === top.y - ACTIVITY_ROW_PITCH * k)) return undefined;
  // And a row starts at the panel's own left edge, which is what separates it from any other wide
  // rectangle a page might carry. Eleven of eleven rows across four configurations, section 275.
  if (top.x !== ACTIVITY_ROW_LEFT) return undefined;
  return { rows, keys, edges, content };
}

/**
 * The font to draw a menu label in: the one the page already uses where it can spell the label, and
 * otherwise the nearest in height that can.
 *
 * **A configuration carries only the glyphs it draws**, so a font is a partial alphabet and which
 * one is complete is per configuration rather than per model. Measured over 63 letters, digits and
 * the space on three arch 12 (Harmony One) configurations, section 275: the best set covers 61, 58
 * and 55 of them and it is font 9, 9 and **5**. So an index cannot be tabulated, which is what
 * `DEVICE_ROW_FONT` does and why a device title is refused for most words on the factory
 * configuration.
 *
 * Height is the tie break rather than coverage, because a label is going into a row of fixed pitch:
 * a set that spells the word in the wrong size draws over its neighbours, where a set one glyph
 * short simply refuses.
 */
function fontThatSpells(
  c: Container,
  map: NonNullable<ReturnType<typeof characterMap>>,
  text: string,
  preferred: number,
): number {
  const sets = fontSets(c) ?? [];
  const spells = (font: number): boolean => {
    const set = sets[font];
    if (set === undefined) return false;
    try {
      codesFor(map, c, set, text, font);
      return true;
    } catch {
      return false;
    }
  };
  if (spells(preferred)) return preferred;
  const want = sets[preferred]?.height;
  const able = sets.map((_, font) => font).filter(spells);
  if (able.length === 0 || want === undefined) {
    // Reported against the font the page actually uses, since that is the one a reader will look at.
    codesFor(map, c, sets[preferred] as FontSet, text, preferred);
    throw new ComposeError(`no font in this config spells '${text}'`);
  }
  return able.reduce((best, font) =>
    Math.abs((sets[font] as FontSet).height - want) < Math.abs((sets[best] as FontSet).height - want)
      ? font : best);
}

/**
 * The icon an activity menu row draws, for the row labelled `iconLike`, so a new television activity
 * wears the television icon the configuration already carries.
 *
 * **The rank comes from where the label is drawn and never from the scan code**, which is the whole
 * difference from `menuIconLike` beside it: that one computes `scan - 48`, correct for a device list
 * page whose rows are the lowest scans, and wrong here because an activity page's scan codes are
 * positions in its hit page, section 275. `activityNames` states the label's own pixel position, and
 * a row's label and its background sit one row pitch apart per rank, so the rank divides out.
 */
function activityRowIcon(c: Container, iconLike: string): number {
  const { program, rank } = activityRowPlace(c, iconLike);
  return activityRowIconAt(c, program, rank, iconLike);
}

/** Where the row labelled `iconLike` is: the program of its page, and its rank on that page. */
function activityRowPlace(c: Container, iconLike: string): { program: number; rank: number } {
  const named = activityNames(c).filter((one) => one.name === iconLike && one.at !== undefined);
  if (named.length !== 1) {
    throw new ComposeError(
      `${named.length} activity menu rows are labelled ${iconLike}, so there is no one icon to copy`);
  }
  const at = (named[0] as { at: { x: number; y: number } }).at;
  const rank = (at.y - MENU_ROW1_LABEL_Y) / MENU_ROW_PITCH;
  if (!Number.isInteger(rank) || rank < 0 || rank >= ACTIVITY_ROWS) {
    throw new ComposeError(`the row labelled ${iconLike} is drawn at y ${at.y}, off the row grid`);
  }
  const page = modePages(c)[(named[0] as { page: number }).page];
  if (page === undefined) throw new ComposeError(`the row labelled ${iconLike} has no page`);
  return { program: page.program, rank };
}

/** The icon a row at `rank` of the page whose program is `program` draws. */
function activityRowIconAt(c: Container, program: number, rank: number, iconLike: string): number {
  const icon = pictureDrawnAt(c, program,
    MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0], MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1] + MENU_ROW_PITCH * rank);
  if (icon === undefined) {
    throw new ComposeError(`the row labelled ${iconLike} draws no icon at rank ${rank}`);
  }
  return icon;
}

/** What `composeActivityMenuRow` put on the screen, for a caller that has to find it again. */
export interface ComposedActivityRow {
  bytes: Uint8Array;
  /** The mode the activity menu is, which the row was added to. */
  menu: number;
  /** Which page of that menu gained the row, counting from zero. */
  page: number;
  /**
   * The base slot 10 list the row runs: beep, select the entry, clear the device mode marker, and on
   * arch 14 (Harmony 600, 650 and 700) the first of `rowLists`, which carry no beep.
   */
  rowList: number;
  /** The scan code the new row answers to, which is its position in the page's hit rectangles. */
  scan: number;
  /**
   * Every scan the row answers to: `scan` alone on arch 12 (Harmony One), and on arch 14 (Harmony
   * 600, 650 and 700) both buttons of the row, top or bottom, section 273.
   */
  scans: number[];
  /**
   * How many row lists were written from `rowList` on: one on arch 12, where every binding shares
   * it, and on arch 14 one per button on the page and another per button on its copy, as the compiler
   * writes them, section 285.
   */
  rowLists: number;
}

export interface ComposeActivityRowOptions {
  /**
   * An existing activity menu row whose icon the new row wears, by its drawn label, so a television
   * activity gets the television icon. Without it the first row's icon is copied, whatever it shows,
   * which is `composeDeviceScreen`'s behaviour and its documented wart: on the spare Harmony One the
   * first row is a music activity, so an unqualified television activity comes out wearing a disc.
   */
  iconLike?: string;
}

/**
 * Put a composed activity on the activity menu: one row on its last page, with the activity's name.
 *
 * The other half of `composeActivity`, which builds everything a remote needs to **run** an activity
 * and nothing that lets anybody **start** one.
 *
 * **A separate builder from `composeMenuPage`, deliberately: decision 17.** The first attempt reused
 * the device list's page builder on the strength of the two menus sharing a row pitch, and it threw
 * on every real configuration, correctly: an activity page has two bottom keys where a device page
 * has one, so its hit page offers a different number of rectangles. Reuse would have meant
 * a builder branching on which menu it was building, which is the shape that rots. What the two may
 * share is a **step**, and they do: `withActivityHitPage` composes a hit page the same way
 * `composeMenuPage` does. See `ACTIVITY_ROWS` for the measured layout and section 275 for the
 * evidence.
 *
 * **Arch 12 (Harmony One) here, and arch 14 (Harmony 600, 650 and 700) in
 * `composeFourSlotActivityRow`**, decision 16's question answered: the pixel grid, the hit rectangles
 * and the screen program around a row are the Harmony One's, and arch 14 has no touch panel at all,
 * its menu being section 289's two row layout, so the two share nothing but the menu finder and this
 * function's refusals. Arch 8 (Harmony 880 and 885) and arch 9 (Harmony 525) are refused, the 525
 * binding its activities to keys rather than to a list.
 *
 * **It fills the last page, and adds one when that page is full**, `composeActivityMenuPage`, since
 * section 293. Until then a full last page was refused, because a new page needs a page counter, a
 * pool copy, a page count and, on a menu of one page, the page turn keys brought back, none of which
 * had been measured on an activity menu; that is `todo.md` 1.2.2.
 */
export function composeActivityMenuRow(
  c: Container, label: string, set: number, options: ComposeActivityRowOptions = {},
): ComposedActivityRow {
  if (c.architecture !== 12 && c.architecture !== 14) {
    throw new ComposeError('the activity menu is composed for the Harmony One, 600, 650 and 700 alone');
  }
  if (!Number.isInteger(set) || set < 0 || set >= 0xff) {
    // 0xff is the mask the selector's own operand carries, so an entry there reads as no entry.
    throw new ComposeError(`${set} is not a base slot 9 index this composer can select`);
  }
  const startSets = handlerSets(c);
  if (startSets === undefined) throw new ComposeError('base slot 9 does not read as a table');
  if (set >= startSets.addresses.length) {
    // A row selecting an entry that does not exist renders correctly and starts nothing, which is
    // the failure class every refusal in this file is for.
    throw new ComposeError(`entry ${set} is past the ${startSets.addresses.length} that exist`);
  }
  const { menu, marker } = activityMenus(c);
  if (menu === undefined || marker === undefined) {
    throw new ComposeError('no activity menu found to add a row to');
  }
  if (c.architecture === 14) return composeFourSlotActivityRow(c, label, set, menu, marker, options);

  let current = c;
  const recordOf = (): ModeRecord => {
    const record = modeRecords(current)?.[menu];
    if (record === undefined) throw new ComposeError(`the activity menu stopped reading`);
    return record;
  };
  const pageIndexOf = (): number => recordOf().pages.length - 1;
  const pageOf = (): ModePage => {
    const page = recordOf().pages.at(-1);
    if (page === undefined) throw new ComposeError('the activity menu has no page');
    return page;
  };

  // The layout, and the one refusal that decides whether this can run at all.
  const startLayout = activityPageLayout(
    touchPageOf(current, pageOf()) ?? { address: 0, areas: [], start: 0, length: 0 });
  if (startLayout === undefined) {
    throw new ComposeError("the activity menu's last page is not a row layout this knows");
  }
  // A full last page gets a new page after it, `composeActivityMenuPage`, and the label's font is then
  // read off the last row of the full page, which is what `rank` names below.
  const full = startLayout.rows.length >= ACTIVITY_ROWS;
  const rank = full ? ACTIVITY_ROWS : startLayout.rows.length;
  const scan = MENU_FIRST_SCAN + startLayout.content.length;

  // The label is spelled before anything moves, so an unspellable name refuses with the container
  // untouched rather than half grown.
  const startProgram = screenProgram(current, pageOf().program) ?? [];
  const rowFontOf = (program: readonly { opcode: number; operands: Uint8Array }[]): number => {
    // The font in effect where the **last row's** label is drawn, which is the font this row wants.
    // Read rather than tabulated: the corpus draws its rows in font 6, 7 and 10 across four configs.
    let font: number | undefined;
    for (const one of program) {
      if (one.opcode === OP_FONT) font = one.operands[0];
      if ((one.opcode === OP_TEXT_AT || one.opcode === OP_TEXT_INLINE)
          && one.operands[0] === MENU_LABEL_X
          && one.operands[1] === MENU_ROW1_LABEL_Y + MENU_ROW_PITCH * (rank - 1)) {
        if (font === undefined) break;
        return font;
      }
    }
    throw new ComposeError("the activity menu's page draws no row label this can copy a font from");
  };
  const map = characterMap(current);
  if (map === undefined) throw new ComposeError('the config carries no character map');
  const rowFont = fontThatSpells(current, map, label, rowFontOf(startProgram));
  const fontSet = (fontSets(current) ?? [])[rowFont];
  if (fontSet === undefined) {
    throw new ComposeError('the config does not carry the font the activity menu draws its rows in');
  }
  const labelCodes = codesFor(map, current, fontSet, label, rowFont);

  // 1. The row's action list: beep, select the activity's keypad map, clear the device mode marker.
  // The marker's **variable** is read off the config and only its value is ours, since which
  // variable it is differs per configuration, section 239.
  const actionSlot = archSlot(12, ACTION_TABLE_SLOT);
  const actionTable = current.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const rowList = actionTable.values.length;
  const rowBytes = new Writer(1 + 3 * 3).u8(3)
    .u16(ROW_BEEP_OPERAND).u8(BEEP_OPCODE)
    .u16(SELECT_BINDING_SET_MASK | set).u8(SELECT_BINDING_SET)
    .u16(ACTIVITY_MENU_MARKER_VALUE).u8(marker.opcode);
  const rowAt = actionTable.start;
  const rowHole = relocate(current, rowAt, rowBytes.bytes.length);
  rowHole.bytes.set(rowBytes.bytes, rowAt);
  current = parse(appendTableEntries(
    parse(rowHole.bytes), actionSlot, [current.flashBase + rowAt]));

  if (full) {
    const paged = composeActivityMenuPage(current, menu, rowList, rowFont, labelCodes, options.iconLike);
    current = paged.container;
    return {
      bytes: restamped(current.blob), menu, page: pageIndexOf(), rowList, scan: paged.scan,
      scans: [paged.scan], rowLists: 1,
    };
  }

  // 2. The hit page, one rectangle wider. An existing page with exactly this geometry is reused
  // where the config has one, which is what the corpus's own three row pages are; otherwise one is
  // composed the way `composeMenuPage` composes one, pointer first so the census sees the slot.
  current = withActivityHitPage(current, menu, rank);

  // 3. The binding, in the page's list and in its pool copy. The copy grows first, because it sits
  // below the original and growing it moves the original.
  const growList = (listStart: number, entries: number): void => {
    const at = listStart + 1 + 4 * entries;
    const hole = relocate(current, at, 4);
    hole.bytes.set(
      new Writer(4).u8(0x80 | scan).u16(rowList).u8(ACTION_LIST_INDEX_OPCODE).bytes, at);
    hole.bytes[listStart] = entries + 1;
    current = parse(hole.bytes);
  };
  const listNow = taggedList(current, pageOf().list);
  if (listNow === undefined || listNow.wide) {
    throw new ComposeError("the activity menu's page list is not the narrow form the corpus uses");
  }
  const entries = listNow.entries.length;
  const pageIndex = modePages(current).findIndex((one) => one.address === pageOf().address);
  const copyOff = pageListCopies(current)[pageIndex];
  if (copyOff === undefined) throw new ComposeError("the activity menu's page has no pool copy");
  growList(copyOff, entries);
  const listOff = current.blobOffsetOf(pageOf().list);
  if (listOff === undefined) throw new ComposeError("the activity menu's page list moved out of reach");
  growList(listOff, entries);

  // 4. The drawing: the row's background, its icon, the font and the label, inserted where the
  // program's closing instruction begins, so the close slides up and every address the census
  // states is restamped with it. The background and icon are read here, after the three grows
  // above moved them: an address read before an insertion below it is stale by that insertion.
  const firstProgram = recordOf().pages[0]?.program;
  if (firstProgram === undefined) throw new ComposeError('the activity menu has no first page');
  const bg = pictureDrawnAt(current, firstProgram, ...MENU_ROW1_BG);
  const icon = options.iconLike === undefined
    ? pictureDrawnAt(current, firstProgram,
      MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0], MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1])
    : activityRowIcon(current, options.iconLike);
  if (bg === undefined || icon === undefined) {
    throw new ComposeError("the activity menu's first page draws no row this can copy");
  }
  const program = screenProgram(current, pageOf().program);
  const closing = program?.at(-1);
  if (program === undefined || closing === undefined || closing.opcode !== OP_END) {
    throw new ComposeError("the activity menu's page program does not end the way the corpus ends one");
  }
  const bgY = MENU_ROW1_BG[1] + MENU_ROW_PITCH * rank;
  const drawn = new Writer(6 + 6 + 2 + 3 + labelCodes.length + 1);
  // These bytes are written after the hole's position is known, so anything sitting at or above it
  // is shifted here rather than by the census, exactly as the device list's row growth does.
  const shift = (address: number): number =>
    address + (address >= current.flashBase + closing.start ? drawn.bytes.length : 0);
  drawn.u8(OP_IMAGE).u8(MENU_ROW1_BG[0]).u8(bgY).u24(shift(bg));
  drawn.u8(OP_IMAGE).u8(MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0]).u8(bgY + MENU_ICON_OFFSET[1])
    .u24(shift(icon));
  drawn.u8(OP_FONT).u8(rowFont);
  drawn.u8(OP_TEXT_INLINE).u8(MENU_LABEL_X).u8(MENU_ROW1_LABEL_Y + MENU_ROW_PITCH * rank);
  labelCodes.forEach((code) => drawn.u8(code));
  drawn.u8(0);
  const programHole = relocate(current, closing.start, drawn.bytes.length);
  programHole.bytes.set(drawn.bytes, closing.start);
  current = parse(programHole.bytes);

  return { bytes: restamped(current.blob), menu, page: pageIndexOf(), rowList, scan, scans: [scan], rowLists: 1 };
}

/**
 * The picture a page of the arch 14 activity menu holding **one** activity draws, section 316: the
 * background the activities' working screens draw on a page holding one command or none, by majority
 * over those pages. All 4 such menu pages on the thirteen Logitech compiles for the Harmony 600, 650
 * and 700 draw it, one each on `h650_config_region`, `h600_config`, `h700_config` and `h700_config_2`,
 * the last two compiled for one account; none of the 4 draws its menu's first page picture, the device
 * mode pages' one item picture or any device list page's picture.
 *
 * The working screens are the modes the cases of one base slot 14 record enter: keyed by activities on
 * the menu and the idle value, every activity's case entering a mode and the idle value's not, which
 * is `activityMaps`'s `working` record. **Found here rather than through `activityMaps`**, which
 * demands the keys be exactly the menu's activities and the idle value and every activity's start the
 * compiler's shape, `arch14Starts`. Neither holds while activities are being composed: a row is
 * composed for an activity not on the menu yet, whose working screen `compose-activity.ts` composes
 * first and so adds its case to the record, and an activity composed without screens is on the menu
 * with no case and an enter list of another shape. So this asks only that the record have a case for
 * the idle value and for at least one activity on the menu, and that every case but the idle value's
 * enter a mode. The picture it finds is the one Logitech's page of one activity draws on every compile
 * that has such a page, which the calibration in `compose.test.ts` asserts by finding the working
 * screens another way, by their titles.
 *
 * Undefined where no record or several fit, or where no working screen page holds one command or
 * none, which is `calibration_h600`, so that the caller refuses rather than drawing another picture.
 */
function activityMenuSingle(c: Container): number | undefined {
  const idle = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME))?.record?.first;
  const onMenu = new Set(activityBindings(c).map((one) => one.activity));
  if (idle === undefined || onMenu.size === 0) return undefined;
  const records = modeRecords(c) ?? [];
  const candidates: number[][] = [];
  for (const map of valueMaps(c) ?? []) {
    if (map.ranges.length !== 0) continue;
    const keys = map.entries.map(([key]) => key);
    if (!keys.includes(idle) || !keys.some((key) => onMenu.has(key))) continue;
    const modes: number[] = [];
    let fits = true;
    for (const [key, target] of map.entries) {
      const queued = caseQueued(c, target);
      const enters = queued?.opcode === ENTER_MODE;
      // The idle value's case enters no mode on the working record and does on the key under
      // Devices', which is what tells the two apart, section 290.
      if (key === idle ? enters : !enters) { fits = false; break; }
      if (key !== idle) modes.push((queued as Instruction).operand);
    }
    if (fits) candidates.push(modes);
  }
  if (candidates.length !== 1) return undefined;
  const counts = new Map<number, number>();
  for (const mode of new Set(candidates[0])) {
    for (const page of records[mode]?.pages ?? []) {
      if ((taggedList(c, page.list)?.entries.length ?? 0) > 1) continue;
      const first = screenProgram(c, page.program)?.[0];
      const picture = first?.opcode === OP_IMAGE ? bitmapReference(first) : undefined;
      if (picture !== undefined) counts.set(picture, (counts.get(picture) ?? 0) + 1);
    }
  }
  // The most drawn, the lowest address on a tie, as `workingTemplate14` picks its own.
  return [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
}

/**
 * The activity menu row on arch 14 (Harmony 600, 650 and 700), section 289: one row on the menu's
 * last page, bound to both buttons of that row, its label centred.
 *
 * **The menu is the device list's two row layout**, measured on all four arch 14 user configurations:
 * two activities to a page, the top one on scans 8 and 2 and the bottom one on 9 and 34, each button
 * running a list of its own and the page's pool copy another, the label centred at y 35 or 79 before
 * the page's closing bar. So the growth is `growFourSlotMenu`, the step the device list uses, and
 * what is this builder's is the row's two instructions and one rule about the picture:
 *
 * * a row selects the activity's base slot 9 entry and writes 0 into the marker variable, with **no
 *   beep**, where an arch 12 row opens with one;
 * * **a full page draws a picture of the menu's own**, and a page holding one activity one the
 *   activities' own screens draw too, where a two row device list's one device page draws its full
 *   pages' picture. So a page that grows from one activity to two takes its menu's full page picture,
 *   which means a menu of one page and one activity is refused: there is no full page to take it from.
 *
 * No icon, since the arch 14 menu draws none, so `iconLike` is refused rather than ignored.
 *
 * **A full last page gets a new page, since section 316**, through the step the device lists open
 * theirs with, `openFourSlotMenuPage`: the activity on the top row's two buttons, its label centred at
 * y 35, the menu's own chrome, and a counter on every page. Until then a full page was refused, so a
 * menu could take a row only while it held an odd number of activities, and a second composed activity
 * on the Harmony 650 was refused. Two things are the activity menu's own and are what this passes:
 *
 * * **the counter sits where a corner list's does**, `FOUR_SLOT_COUNTER_X`, though the layout is two
 *   row: 16 pages of 16 on the 7 multi page activity menus Logitech compiled here;
 * * **the new page draws the activities' working screens' one command background**,
 *   `activityMenuSingle`, which every page holding one activity draws, 4 of 4, and not its menu's first
 *   page picture, which a two row device list's new page would copy.
 *
 * So the page count alternates what a row does: an odd number of activities leaves a last page with
 * one, which the next row fills, and an even number a full one, which the next row opens a page past.
 * What stays refused is a menu of one activity on one page, whose full page picture no page draws yet.
 */
function composeFourSlotActivityRow(
  c: Container, label: string, set: number, menu: number, marker: Instruction,
  options: ComposeActivityRowOptions,
): ComposedActivityRow {
  if (options.iconLike !== undefined) {
    throw new ComposeError('an arch 14 activity menu draws no icon, so there is none to copy');
  }
  const record = modeRecords(c)?.[menu];
  const page = record?.pages.at(-1);
  if (record === undefined || page === undefined) throw new ComposeError('the activity menu has no page');
  const layout = menuLayout(c, taggedList(c, page.list)?.entries ?? []);
  if (layout === undefined || !layout.rows) {
    throw new ComposeError("the activity menu's last page is not the two row layout");
  }
  // A full last page gets a page after it, and both refusals that can stop it are made here, before
  // anything moves: a tenth page, whose counter would be two digits, and a configuration whose working
  // screens draw no one command background, which is the picture the new page needs. `calibration_h600`
  // is that configuration, every page of its two activities' working screens holding three commands or
  // four.
  const full = layout.used >= layout.capacity;
  if (full && record.pages.length + 1 > FOUR_SLOT_MAX_PAGES) {
    throw new ComposeError(`the activity menu would need page ${record.pages.length + 1}, and a counter of `
      + 'two digits is not composed');
  }
  if (full && activityMenuSingle(c) === undefined) {
    throw new ComposeError("the activity menu's last page is full, and no working screen page holding one "
      + 'command or none draws the background a page of one activity needs');
  }

  // The label's font: the one in effect at the closing bar of the page being grown, which is its
  // existing label's, unless that font cannot spell the name. **One font per page** is the compiler's
  // rule, 5 of 5 full pages on the four arch 14 configurations drawing both labels in one, and the
  // Harmony 700's last page is why it is read off that page and not the first: its lone label is in a
  // smaller font than the menu's others, section 289. Spelled before anything moves.
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const lastProgram = screenProgram(c, page.program) ?? [];
  const bar = lastProgram.findLastIndex((one) => one.opcode === SCREEN_DRAW_IMAGE_AT);
  const preferred = lastProgram.slice(0, bar < 0 ? 0 : bar)
    .findLast((one) => one.opcode === OP_FONT)?.operands[0];
  if (preferred === undefined) throw new ComposeError("the activity menu's last page selects no label font");
  const font = fontThatSpells(c, map, label, preferred);
  const fontSet = (fontSets(c) ?? [])[font];
  if (fontSet === undefined) throw new ComposeError(`the config does not carry font ${font}`);
  const codes = codesFor(map, c, fontSet, label, font);
  // The composer's own conservative limit, the width a corner layout's labels span, 3 to 125. The
  // compiler draws a name too wide for the label font whole in a smaller font, and a centred label
  // reaches 128 on one two row device list, section 289; this refuses instead.
  const wide = textWidth(c, fontSet, codes);
  if (wide > FOUR_SLOT_RIGHT_END - FOUR_SLOT_LEFT_X) {
    throw new ComposeError(`'${label}' is ${wide} pixels wide and a row holds `
      + `${FOUR_SLOT_RIGHT_END - FOUR_SLOT_LEFT_X}: give it a shorter label`);
  }

  // 1. The row lists: select the entry, write 0 into the marker. One per button on the page and one
  // per button on its copy, identical, below base slot 10's table with their pointers appended. A new
  // page puts the row on the top row, so two buttons either way.
  const scans = [...(FOUR_SLOT_ROWS[full ? 0 : layout.used] as readonly number[])];
  const rowLists = 2 * scans.length;
  const actionSlot = archSlot(14, ACTION_TABLE_SLOT);
  const actionTable = c.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const rowList = actionTable.values.length;
  const oneRow = new Writer(1 + 3 * 2).u8(2)
    .u16(SELECT_BINDING_SET_MASK | set).u8(SELECT_BINDING_SET)
    .u16(ACTIVITY_MENU_MARKER_VALUE).u8(marker.opcode).bytes;
  const rowAt = actionTable.start;
  const rowHole = relocate(c, rowAt, oneRow.length * rowLists);
  for (let k = 0; k < rowLists; k += 1) rowHole.bytes.set(oneRow, rowAt + k * oneRow.length);
  let current = parse(appendTableEntries(parse(rowHole.bytes), actionSlot,
    Array.from({ length: rowLists }, (_, k) => c.flashBase + rowAt + k * oneRow.length)));

  // 2. The page grows by the row, its copy first, and a page that held one activity takes the
  // picture its menu's full pages draw. Or a full page gets a page after it holding the row, and every
  // page counts to the new total: in the menu's own counter font where a page draws one, and otherwise
  // in the device mode pages' counter font, which is the menu's on all 7 multi page menus, section 316.
  const grown = full
    ? openFourSlotMenuPage(current, menu, rowList, codes, font, {
      counterX: FOUR_SLOT_COUNTER_X,
      counterDefault: fourSlotTemplate(current, undefined).counterFont,
      background: (now) => activityMenuSingle(now),
    })
    : growFourSlotMenu(current, menu, rowList, codes, font, 'both');
  if (grown.bound !== rowLists) {
    throw new ComposeError(`${grown.bound} row lists bound against the ${rowLists} written`);
  }
  current = grown.container;
  const pageIndex = (modeRecords(current)?.[menu]?.pages.length ?? 0) - 1;
  return {
    bytes: restamped(current.blob), menu, page: pageIndex, rowList, scan: scans[0] as number, scans, rowLists,
  };
}

/**
 * Add a one row page to the activity menu, whose last page is full, and put the row on it: the
 * Harmony One's (arch 12) counterpart of `composeMenuPage`, and `todo.md` 1.2.2, section 293.
 *
 * **A separate builder from the device list's**, decision 17, because the page is not the same page:
 * an activity menu page offers two bottom keys where a device list page offers one, and draws their
 * labels itself. What the two share are steps: `withHitPage` for the rectangles and `paginate` for
 * the counter, the header's total and the page turn keys. Four insertions, each leaving the container
 * parseable, in the order `composeMenuPage` uses and for its reasons:
 *
 * 1. a hit page offering the full page's two bottom keys and its top row, in their stored order, so
 *    the keys keep their scans and the row takes the next one, which is Logitech's own one row page;
 * 2. the page list, row first and then the keys bound as the last page binds them, and its pool copy
 *    right after the last page's, since the copies pair with the pages positionally, section 69;
 * 3. three bytes in the mode entry for the page's pointer, a placeholder until the record exists;
 * 4. the block after the last page record: the program, which calls the menu's header, draws the two
 *    key labels the first page draws and then the row, and the page record.
 */
function composeActivityMenuPage(
  start: Container, menu: number, rowList: number, rowFont: number, labelCodes: readonly number[],
  iconLike: string | undefined,
): { container: Container; scan: number } {
  let current = start;
  const recordOf = (): ModeRecord => {
    const record = modeRecords(current)?.[menu];
    if (record === undefined) throw new ComposeError('the activity menu stopped reading');
    return record;
  };
  const last = recordOf().pages.at(-1);
  const lastTouch = last === undefined ? undefined : touchPageOf(current, last);
  const layout = lastTouch === undefined ? undefined : activityPageLayout(lastTouch);
  // Which of this menu's pages and which rank the row `iconLike` names, read now: once the new page's
  // record is counted and its pointer is still a placeholder, `activityNames` no longer reads the
  // menu, which is how a tenth activity on the spare Harmony One was refused. The page is found again
  // by its index in the record, since every insertion below moves its program.
  const iconRow = iconLike === undefined ? undefined : (() => {
    const place = activityRowPlace(current, iconLike);
    const index = recordOf().pages.findIndex((page) => page.program === place.program);
    if (index < 0) throw new ComposeError(`the row labelled ${iconLike} is not on the activity menu`);
    return { index, rank: place.rank };
  })();
  if (last === undefined || layout === undefined) {
    throw new ComposeError("the activity menu's last page is not a row layout this knows");
  }

  // 1. The rectangles: the last page's content in stored order with every row but the top one left
  // out, then the two edges. The codes are positional, so the keys keep theirs where they come first.
  const top = layout.rows[0] as TouchArea;
  const kept = layout.content.filter((area) => !layout.rows.includes(area) || area === top);
  const wanted = [...kept, ...layout.edges].map((area, k) =>
    [k < kept.length ? MENU_FIRST_SCAN + k : MENU_EDGE_SCANS[k - kept.length] as number, area] as const);
  const scan = MENU_FIRST_SCAN + kept.indexOf(top);
  const hitPage = withHitPage(current, wanted);
  current = hitPage.container;

  // 2. The list: the row, then each key bound to what the last page binds it to, under its new scan.
  // The page is read again, since step 1 may have moved every list above the hit map.
  const lastMoved = recordOf().pages.at(-1);
  const lastList = lastMoved === undefined ? undefined : taggedList(current, lastMoved.list);
  if (lastList === undefined || lastList.wide) {
    throw new ComposeError("the activity menu's page list is not the narrow form the corpus uses");
  }
  const keyEntries = layout.keys.map((key) => {
    const bound = lastList.entries.filter((entry) => (entry.tag & SCAN_MASK) === key.code);
    if (bound.length !== 1) {
      throw new ComposeError(`the activity menu's last page binds its key ${key.code} ${bound.length} times`);
    }
    return { scan: MENU_FIRST_SCAN + kept.indexOf(key), entry: bound[0] as TaggedEntry };
  });
  const listBytes = new Writer(1 + 4 * (1 + keyEntries.length)).u8(1 + keyEntries.length)
    .u8(0x80 | scan).u16(rowList).u8(ACTION_LIST_INDEX_OPCODE);
  for (const one of keyEntries) listBytes.u8(0x80 | one.scan).u16(one.entry.operand).u8(one.entry.opcode);
  const lastIndex = modePages(current).findIndex((one) => one.address === recordOf().pages.at(-1)?.address);
  const copyOff = pageListCopies(current)[lastIndex];
  const copyLength = copyOff === undefined ? undefined : taggedList(current, copyOff + current.flashBase)?.length;
  if (copyOff === undefined || copyLength === undefined) {
    throw new ComposeError("the activity menu's last page has no pool copy");
  }
  const copyHole = relocate(current, copyOff + copyLength, listBytes.bytes.length);
  copyHole.bytes.set(listBytes.bytes, copyOff + copyLength);
  current = parse(copyHole.bytes);
  const listAt = Math.max(...modePages(current).map((page) => {
    const off = current.blobOffsetOf(page.list);
    const list = taggedList(current, page.list);
    return off === undefined || list === undefined ? 0 : off + list.length;
  }));
  const listHole = relocate(current, listAt, listBytes.bytes.length);
  listHole.bytes.set(listBytes.bytes, listAt);
  current = parse(listHole.bytes);

  // 3. The entry's new pointer, at the last page until the record exists, and the count with it.
  const entry = recordOf();
  const entryOff = current.blobOffsetOf(entry.address);
  const lastNow = entry.pages.at(-1);
  if (entryOff === undefined || lastNow === undefined) throw new ComposeError('the activity menu moved out of reach');
  const slotAt = entryOff + 6 + 3 * entry.pageCount;
  const pageListAddress = current.flashBase + listAt + (listAt >= slotAt ? 3 : 0);
  const entryHole = relocate(current, slotAt, 3);
  entryHole.bytes.set(new Writer(3).u24(lastNow.address).bytes, slotAt);
  entryHole.bytes.set(new Writer(2).u16(entry.pageCount + 1).bytes, entryOff + 4);
  current = parse(entryHole.bytes);

  // 4. The block, everything it embeds read here, after the relocations above.
  const pages = recordOf().pages;
  const realLast = pages[entry.pageCount - 1];
  const first = pages[0];
  const realLastOff = realLast === undefined ? undefined : current.blobOffsetOf(realLast.address);
  if (realLast === undefined || first === undefined || realLastOff === undefined) {
    throw new ComposeError('an activity menu page moved out of reach');
  }
  const firstProgram = screenProgram(current, first.program) ?? [];
  const header = headerOf(current, first);
  if (header === undefined) throw new ComposeError("the activity menu's first page calls no header");
  // The key labels: what the first page draws between its header call and its first row, which is
  // fonts and the two labels on the activity menu of every Harmony One configuration in the lab that
  // has one, section 293.
  const firstRow = firstProgram.findIndex((one) => one.opcode === OP_IMAGE);
  const keyLabels = firstProgram.slice(1, firstRow);
  if (firstRow < 0 || keyLabels.some((one) => one.opcode !== OP_FONT
      && one.opcode !== OP_TEXT_INLINE && one.opcode !== OP_TEXT_AT)) {
    throw new ComposeError("the activity menu's first page does not draw its keys before its rows");
  }
  const bg = pictureDrawnAt(current, first.program, ...MENU_ROW1_BG);
  const icon = iconLike === undefined
    ? pictureDrawnAt(current, first.program,
      MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0], MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1])
    : activityRowIconAt(current, (recordOf().pages[iconRow!.index] as ModePage).program, iconRow!.rank, iconLike);
  if (bg === undefined || icon === undefined) {
    throw new ComposeError("the activity menu's first page draws no row this can copy");
  }
  const blockAt = realLastOff + 7;
  const base = current.flashBase + blockAt;
  const labelsLength = keyLabels.reduce((sum, one) => sum + one.length, 0);
  const programLength = 4 + labelsLength + 6 + 6 + 2 + 3 + labelCodes.length + 1 + 1;
  const blockLength = programLength + 7;
  const shifted = (address: number): number => (address >= base ? address + blockLength : address);
  const block = new Writer(blockLength);
  block.u8(OP_CALL).u24(shifted(header));
  for (const one of keyLabels) {
    const bytes = Uint8Array.from(current.blob.slice(one.start, one.start + one.length));
    if (one.opcode === OP_TEXT_AT) bytes.set(new Writer(3).u24(shifted(u24(bytes, 3))).bytes, 3);
    bytes.forEach((byte) => block.u8(byte));
  }
  block.u8(OP_IMAGE).u8(MENU_ROW1_BG[0]).u8(MENU_ROW1_BG[1]).u24(shifted(bg));
  block.u8(OP_IMAGE).u8(MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0]).u8(MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1])
    .u24(shifted(icon));
  block.u8(OP_FONT).u8(rowFont);
  block.u8(OP_TEXT_INLINE).u8(MENU_LABEL_X).u8(MENU_ROW1_LABEL_Y);
  labelCodes.forEach((code) => block.u8(code));
  block.u8(0);
  block.u8(OP_END);
  block.u8(hitPage.lead).u24(shifted(pageListAddress)).u24(base);
  if (block.bytes.length !== blockLength) {
    throw new ComposeError(`the activity page block is ${block.bytes.length} bytes, not the ${blockLength} counted`);
  }
  const blockHole = relocate(current, blockAt, blockLength);
  blockHole.bytes.set(block.bytes, blockAt);
  const placed = parse(blockHole.bytes);
  const swap = modeRecords(placed)?.[menu];
  const swapOff = swap === undefined ? undefined : placed.blobOffsetOf(swap.address);
  if (swap === undefined || swapOff === undefined) throw new ComposeError('the activity menu moved out of reach');
  placed.blob.set(new Writer(3).u24(base + programLength).bytes, swapOff + 6 + 3 * (swap.pageCount - 1));
  return { container: paginate(parse(restamped(placed.blob)), menu), scan };
}

/**
 * Point the activity menu's last page at a hit page carrying one more row, composing one if the
 * configuration has none.
 *
 * The composed page keeps **every** rectangle the old one had, in the same stored order, and adds
 * the new row after the last content one and before the two edges. That order is the whole point:
 * the scan codes are positional, so keeping the prefix identical keeps every binding the page
 * already has, and the new row lands on the next unused scan.
 */
function withActivityHitPage(start: Container, menu: number, rank: number): Container {
  let current = start;
  const pageOf = (): ModePage => {
    const page = modeRecords(current)?.[menu]?.pages.at(-1);
    if (page === undefined) throw new ComposeError('the activity menu has no page');
    return page;
  };
  const hits = touchPages(current);
  const old = touchPageOf(current, pageOf());
  const layout = old === undefined ? undefined : activityPageLayout(old);
  if (hits === undefined || old === undefined || layout === undefined) {
    throw new ComposeError('the hit map stopped reading');
  }
  const top = layout.rows[0] as TouchArea;
  const added: TouchArea = {
    ...top, y: top.y - ACTIVITY_ROW_PITCH * rank, code: MENU_FIRST_SCAN + layout.content.length,
  };
  const wanted: readonly TouchArea[] = [...layout.content, added, ...layout.edges];
  const codes = wanted.map((_, k) =>
    (k < wanted.length - 2 ? MENU_FIRST_SCAN + k : MENU_EDGE_SCANS[k - (wanted.length - 2)] as number));
  const hitPage = withHitPage(current, wanted.map((want, k) => [codes[k] as number, want] as const));
  current = hitPage.container;
  const lead = hitPage.lead;
  // The lead byte, in place and last, so nothing above moves it again.
  const at = current.blobOffsetOf(pageOf().address);
  if (at === undefined) throw new ComposeError('the activity menu page moved out of reach');
  current.blob[at] = lead;
  return parse(current.blob);
}

/*
 * ---- An activity's own screen, Harmony One (arch 12) only, section 279 ----
 *
 * An activity has two screens and a composed one had neither: its enter list opened with no mode at
 * all, so the remote stayed on whatever page started it, which is `todo.md` 1.2.4. The first is the
 * **start up** screen, "Keep the remote pointed at your system", whose record binds every key to
 * nothing; every activity's enter list opens by entering its own, 60 of 60 across the thirteen
 * Harmony One configurations with activities. The second is the **working** screen, blue pads and "Devices" in
 * the corner, and it is entered at the **end** of the chain, behind the infrared, through the six
 * byte `0x3F` band `0xD0` instruction. Device mode's "Activities" key comes back to it through a
 * base slot 14 record keyed by the activity, `activityScreens`.
 *
 * So composing the screen is three things: a new mode shaped like the configuration's own one page
 * working screens, a case in that record, and an enter list that opens with the start up screen and
 * defers the working one. The first two are `composeActivityScreen`; the third is `composeActivity`'s
 * `screen` option, because the enter list is that function's.
 */

/** Opcode `0x3F` with the operand's high nibble `0xD`: the six byte instruction whose second half is
 *  an ordinary instruction carried as data. Every one of the eight on the spare Harmony One is the
 *  operand `0xD000` heading a two slot list whose payload is a `0x7F`, section 139 and 279. */
const DEFERRED = { opcode: 0x3f, operand: 0xd000 } as const;
/** `0x07` band `0xFB`: cancel every running timer, the second instruction of every enter list that
 *  enters a start up screen on the Harmony One, section 279. */
const CANCEL_TIMERS = { opcode: 0x07, operand: 0xfffb } as const;
/** `0x07` band `0xFF`, the silent flag, which the "an activity is running" list writes first. */
export const SILENT_WRITE = { opcode: 0x07, operand: 0xffff } as const;

/** The value the next composed activity will take: one past the counter's highest, section 273. */
export function nextActivityValue(c: Container): number {
  const record = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME))?.record;
  if (record === undefined) throw new ComposeError(`no ${ACTIVITY_STATE_NAME} variable`);
  return record.second + 1;
}

export interface ComposeActivityScreenOptions {
  /**
   * An existing activity, by its drawn menu label, whose start up screen the new activity shows.
   * That screen draws the activity's icon, so a television activity wants a television one. Without
   * it the start up screen of the activity whose working screen served as the template is used.
   */
  startupLike?: string;
}

export interface ComposedActivityScreen {
  bytes: Uint8Array;
  /** The activity value the screen was composed for, which `composeActivity` must then produce. */
  activity: number;
  /** The new working screen, base slot 6. */
  mode: number;
  /** The existing start up screen the enter list should open with. */
  startupMode: number;
  /** The existing list every activity's enter list calls to say an activity is running. Harmony One only. */
  activeList?: number;
  /** The base slot 14 record that gained the activity's case: on arch 14, the working screen's. */
  map: number;
  /** The list the page's "Devices" key runs: beep, enter the device list. Harmony One only. */
  devicesList?: number;
  /** The scan codes the pads answer to, in row order. Empty on arch 14, whose pads are the corners. */
  scans: number[];
  /** Arch 14 only: the variable the start sequence holds at 1, and the one it writes before deferring. */
  startVariable?: number;
  flagVariable?: number;
  /** Arch 14 only: the base slot 9 entry the keypad map case selects, which `composeActivity` must add. */
  set?: number;
  /** Arch 14 only: the base slot 14 records that gained a case, working screen's first. */
  maps?: number[];
  /** Arch 14 only: how many pages the working screen has. */
  pages?: number;
}

/** The three facts a working screen template supplies, read once so every step uses the same. */
interface WorkingTemplate {
  mode: number;
  activity: number;
  record: ModeRecord;
  page: ModePage;
  chrome: number;
  devicesScan: number;
}

/**
 * The one page working screen to copy the frame from, or a refusal.
 *
 * A candidate is a working screen, per `activityScreens`, with one page whose list binds exactly one
 * key to "beep, enter a mode", which is its Devices key, and whose record starts with the two null
 * bindings a one page screen carries on the keys beside the display. The lowest mode index wins,
 * which is arbitrary and deterministic: on the spare Harmony One the four candidates share every
 * handler list's contents and differ only in which lists they name, and each calls a chrome of its
 * own, since the chrome draws the title.
 *
 * **The rule is fitted to the spare** and says so: it refuses on five of the thirteen Harmony One
 * configurations with activities, the factory one and the four with two activities, none of which
 * has a one page working screen with a Devices key.
 */
function workingTemplate(c: Container, screens: ActivityScreens): WorkingTemplate {
  const lists = c.actionLists() ?? [];
  const records = modeRecords(c) ?? [];
  const found: WorkingTemplate[] = [];
  for (const [activity, mode] of screens.screens) {
    const record = records[mode];
    const page = record?.pages[0];
    if (record === undefined || page === undefined || record.pages.length !== 1) continue;
    const nulls = record.entries.filter((one) => one.opcode === 0 && one.operand === 0);
    if (nulls.length !== EDGE_CODES.length) continue;
    const keys = (taggedList(c, page.list)?.entries ?? []).filter((entry) => {
      const list = lists[entry.operand];
      return entry.opcode === ACTION_LIST_INDEX_OPCODE && list?.length === 2
        && list[0]?.opcode === BEEP_OPCODE && list[1]?.opcode === ENTER_MODE;
    });
    const first = screenProgram(c, page.program)?.[0];
    if (keys.length !== 1 || first?.opcode !== OP_CALL) continue;
    found.push({
      mode, activity, record, page, chrome: u24(first.operands, 0),
      devicesScan: (keys[0] as { tag: number }).tag & SCAN_MASK,
    });
  }
  found.sort((a, b) => a.mode - b.mode);
  const chosen = found[0];
  if (chosen === undefined) throw new ComposeError('no one page working screen to take the frame from');
  return chosen;
}

/**
 * One more case in an existing base slot 14 record: `key` runs `program`, a screen language program
 * ending in its own `0x00`. The step both architectures' activity screen composers share.
 *
 * The case goes on the end of the record, pointing at an existing case's program so the census can
 * see it, then the program is inserted in front of the lowest one the record names, then the case is
 * swapped onto it. Moved out of the Harmony One's `composeActivityScreen` unchanged, section 279, with
 * one refusal added: a key the record already has a case for, since the walk stops at the first match
 * and a second case for the same key would never run.
 */
function appendValueMapCase(start: Container, map: number, key: number, program: Uint8Array): Container {
  // A record is a byte, a count of `VALUE_MAP_COUNT_WIDTH` bytes, then the cases: the count is one
  // byte on the Harmony One and two on the Harmony 600, 650 and 700, which is where the cases start.
  const width = VALUE_MAP_COUNT_WIDTH[start.architecture as number];
  const record = valueMaps(start)?.[map];
  const recordAt = record === undefined ? undefined : start.blobOffsetOf(record.address);
  if (width === undefined || record === undefined || recordAt === undefined
      || record.entries.length >= 2 ** (8 * width) - 1) {
    throw new ComposeError(`base slot 14 record ${map} does not read, or is full`);
  }
  if (record.entries.some(([one]) => one === key)) {
    throw new ComposeError(`base slot 14 record ${map} already has a case for ${key}`);
  }
  const stride = VALUE_MAP_KEY_WIDTH + 3;
  const caseAt = recordAt + 1 + width + stride * record.entries.length;
  const caseHole = relocate(start, caseAt, stride);
  caseHole.bytes.set(new Writer(stride).u16(key).u24((record.entries[0] as [number, number])[1]).bytes, caseAt);
  const count = new Writer(width);
  if (width === 1) count.u8(record.entries.length + 1); else count.u16(record.entries.length + 1);
  caseHole.bytes.set(count.bytes, recordAt + 1);
  const current = parse(caseHole.bytes);
  const grownRecord = valueMaps(current)?.[map];
  const lowest = Math.min(...(grownRecord?.entries ?? []).map(([, target]) => target));
  const programAt = current.blobOffsetOf(lowest);
  if (grownRecord === undefined || programAt === undefined) {
    throw new ComposeError(`base slot 14 record ${map} stopped reading`);
  }
  const programHole = relocate(current, programAt, program.length);
  programHole.bytes.set(program, programAt);
  const placed = parse(programHole.bytes);
  const finalRecord = valueMaps(placed)?.[map];
  const finalAt = finalRecord === undefined ? undefined : placed.blobOffsetOf(finalRecord.address);
  if (finalRecord === undefined || finalAt === undefined) {
    throw new ComposeError(`base slot 14 record ${map} stopped reading`);
  }
  placed.blob.set(new Writer(3).u24(placed.flashBase + programAt).bytes,
                  finalAt + 1 + width + stride * (finalRecord.entries.length - 1) + VALUE_MAP_KEY_WIDTH);
  return parse(placed.blob);
}

/*
 * ---- An activity's own screens, Harmony 600, 650 and 700 (arch 14), section 290 ----
 *
 * The same two screens as on the Harmony One and a different arrangement of both. The **start up**
 * screen is the activity's own here rather than shared: "Starting" and the activity's name above the
 * three fixed lines, one per activity, 13 of 13 on the four arch 14 user configurations. The
 * **working** screen is a device mode page with a different word at the bottom, "Devices" where a
 * device's says "Back", two backgrounds of its own, and on the 650 and 700 its own operand for the
 * queued `0x73` at the top. Four records of base slot 14 are keyed by the
 * activity rather than one, each of which gains a case:
 *
 * - the working screen's: activity to "enter its working screen", naming the screen the start
 *   sequence ends on, 13 of 13, and the idle value to a further record. What reaches it is the one case,
 *   for 0, of a record keyed by `CurrentLocation`, and that record is what the centre key under a device list
 *   evaluates, 21 device lists of 21, which write "Activity" or "Activities" above that key;
 * - the key under Devices', which the working screen's own record names, and a second one with the same
 *   cases: activity to a device list of its own, saying "Activity" at the bottom, and the idle value
 *   to the one saying "Activities", each holding every device;
 * - the binding set's: activity to "select its keypad map", with no idle case.
 *
 * **What is not composed, and it is deliberate**: the help screen and the Remote Assistant's question.
 * Every real activity on the 650, `calibration_h600` and the 700 reaches its working screen through
 * the Remote Assistant's branch, and `h600_config`'s reach it directly, `[3F D000, 7E working]`. That
 * second form is the one a composed activity takes. **Nor is the activity's own device list, here**:
 * the key under Devices of a composed activity opens the idle value's, the one saying "Activities", its
 * case copied, and `composeActivityDeviceList` then gives it a list of its own, section 294. Its centre
 * key leads back to the composed activity's working screen either way, through `CurrentLocation` and
 * the working screen record.
 *
 * **A name is spelled in the fonts the configuration has**, and each holds only the letters its own
 * texts use. The start up title's font is the one every start up title is drawn in, and the status and
 * battery messages too, so a name with a letter none of those has is refused, "Watch TV" on
 * `h600_config` for its W.
 */

/** "Starting", then the name, at y 5 and centred, 13 of 13. */
const STARTUP_TITLE_PREFIX = 'Starting ';
const STARTUP_TITLE_Y = 5;
/**
 * The widest title a start up screen draws on one line, 123 pixels, the widest of the 11 one line
 * titles among the 13 on the four arch 14 user configurations. A longer one wraps onto a second line
 * at y 19, `STARTUP_TITLE_SECOND_Y`, and since section 323 that is composed: the words break greedily
 * at this width and each line is centred on its own, which reproduces both titles the 13 Logitech
 * compiles wrap, `Starting Watch a` over `Movie` and `Starting Play Audio` over `Cassette`, at the x
 * they are drawn at. Those two are 130 and 163 pixels whole, so where from 124 to 130 the break
 * starts is not known, and this keeps the widest one line title measured, which is also the widest of
 * the 37 one line titles on the 13 Logitech compiles, `Starting Watch Bluray`.
 */
const STARTUP_TITLE_MAX = 123;
const STARTUP_TITLE_SECOND_Y = 19;
/** Below the title every start up screen draws the same three lines, from y 82 down, 13 of 13. */
const STARTUP_FIXED_Y = 82;

/** What every arch 14 activity's enter list states, read off all of them rather than one. */
interface Arch14Starts {
  counter: number;
  idle: number;
  /** The variable the start sequence holds at 1 while it runs, which gates the inter device delay. */
  startVariable: number;
  /** The variable written 1 just before the working screen is deferred. */
  flagVariable: number;
  /** Per activity value: its start up mode and its base slot 9 entry. */
  startup: Map<number, number>;
  sets: Map<number, number>;
}

/**
 * The start sequence's shape, `[7E startup, S:=1, ..., counter:=activity, F:=1, 7F deferred, S:=0]`,
 * where the deferred list opens with the `0x3F` band `0xD0` instruction. Refused unless every activity
 * has it and all agree on `S` and `F`, which is 13 of 13, section 290.
 */
function arch14Starts(c: Container): Arch14Starts {
  const lists = c.actionLists() ?? [];
  const sets = handlerSets(c);
  const counterVariable = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  if (sets === undefined || counterVariable?.record === undefined) {
    throw new ComposeError(`no ${ACTIVITY_STATE_NAME} variable or no base slot 9 to read activities from`);
  }
  const counter = counterVariable.index;
  const written = (one: Instruction | undefined, value: number): number | undefined =>
    one !== undefined && one.opcode >= STATE_WRITE_BASE && one.operand === value
      ? one.opcode - STATE_WRITE_BASE : undefined;
  const starts = new Set<number>();
  const flags = new Set<number>();
  const startup = new Map<number, number>();
  const setOf = new Map<number, number>();
  for (const binding of activityBindings(c)) {
    if (startup.has(binding.activity)) continue;
    const address = sets.addresses[binding.set];
    const entry = address === undefined ? undefined
      : taggedList(c, address)?.entries.find((one) => one.tag === HANDLER_TAG_ENTER);
    const enter = entry === undefined ? undefined : lists[entry.operand];
    const call = enter?.at(-2);
    const deferred = call?.opcode === ACTION_LIST_INDEX_OPCODE ? lists[call.operand] : undefined;
    const start = written(enter?.[1], 1);
    const flag = written(enter?.at(-3), 1);
    if (enter === undefined || enter[0]?.opcode !== ENTER_MODE || start === undefined
        || written(enter.at(-1), 0) !== start || flag === undefined
        || written(enter.at(-4), binding.activity) !== counter
        || deferred?.[0]?.opcode !== DEFERRED.opcode || deferred[0].operand !== DEFERRED.operand) {
      throw new ComposeError(`activity ${binding.activity}'s enter list is not the shape every arch 14 one has`);
    }
    starts.add(start);
    flags.add(flag);
    startup.set(binding.activity, enter[0].operand);
    setOf.set(binding.activity, binding.set);
  }
  if (startup.size === 0) throw new ComposeError('no activity to take the start sequence from');
  if (starts.size !== 1 || flags.size !== 1) {
    throw new ComposeError(`the activities disagree about the start sequence's variables: ${starts.size} `
      + `start variables and ${flags.size} flags`);
  }
  return {
    counter, idle: counterVariable.record.first,
    startVariable: [...starts][0] as number, flagVariable: [...flags][0] as number, startup, sets: setOf,
  };
}

/** The four records keyed by the activity, by what their cases do. */
interface ActivityMaps {
  working: number;
  devices: number[];
  select: number;
}

/**
 * The base slot 14 records keyed by the activity, found by their keys and what their cases queue: every
 * activity and the idle value, activities entering a mode and the idle value not, is the working
 * screen's; the same keys all entering a mode are the key under Devices'; every activity and not the idle
 * value, each selecting that activity's own keypad map, is the binding set's. One, one or more, and
 * one, on 4 of 4, and anything else is refused rather than guessed at.
 */
function activityMaps(c: Container, starts: Arch14Starts): ActivityMaps {
  const maps = valueMaps(c);
  if (maps === undefined) throw new ComposeError('base slot 14 does not read');
  const activities = [...starts.startup.keys()].sort((a, b) => a - b);
  const everything = [...activities, starts.idle].sort((a, b) => a - b);
  const same = (keys: number[], want: number[]): boolean =>
    keys.length === want.length && [...keys].sort((a, b) => a - b).every((key, k) => key === want[k]);
  const working: number[] = [];
  const devices: number[] = [];
  const select: number[] = [];
  maps.forEach((map, index) => {
    if (map.ranges.length !== 0) return;
    const keys = map.entries.map(([key]) => key);
    const queued = new Map(map.entries.map(([key, target]) => [key, caseQueued(c, target)]));
    const enters = (key: number): boolean => queued.get(key)?.opcode === ENTER_MODE;
    if (same(keys, everything) && activities.every(enters)) {
      (enters(starts.idle) ? devices : working).push(index);
    } else if (same(keys, activities) && activities.every((key) => {
      const one = queued.get(key);
      return one?.opcode === SELECT_BINDING_SET && one.operand === (SELECT_BINDING_SET_MASK | (starts.sets.get(key) as number));
    })) {
      select.push(index);
    }
  });
  if (working.length !== 1 || devices.length === 0 || select.length !== 1) {
    throw new ComposeError(`the activity keyed records read as ${working.length} working screen, `
      + `${devices.length} Devices key and ${select.length} keypad map records, not 1, some and 1`);
  }
  return { working: working[0] as number, devices, select: select[0] as number };
}

/**
 * The first page of the lowest working screen whose program is a device mode page's chrome around its
 * middle, which is where the composed one's prefix, bottom word and record entries come from, plus the
 * two backgrounds by majority over every working page: one command or none, and more.
 */
function workingTemplate14(c: Container, starts: Arch14Starts, maps: ActivityMaps): {
  mode: number; activity: number; entries: TaggedEntry[];
  prefix: ScreenInstruction[]; suffix: ScreenInstruction[];
  single: number | undefined; crossed: number | undefined;
} {
  const records = modeRecords(c) ?? [];
  const record = valueMaps(c)?.[maps.working];
  const byActivity = new Map<number, number>();
  for (const [key, target] of record?.entries ?? []) {
    const one = caseQueued(c, target);
    if (key !== starts.idle && one?.opcode === ENTER_MODE) byActivity.set(key, one.operand);
  }
  const counts = [new Map<number, number>(), new Map<number, number>()];
  let chosen: { mode: number; activity: number; program: ScreenInstruction[] } | undefined;
  for (const [activity, mode] of [...byActivity].sort((a, b) => a[1] - b[1])) {
    for (const page of records[mode]?.pages ?? []) {
      const program = screenProgram(c, page.program) ?? [];
      const picture = program[0]?.opcode === OP_IMAGE ? bitmapReference(program[0]) : undefined;
      const items = taggedList(c, page.list)?.entries.length ?? 0;
      const tally = counts[items > 1 ? 1 : 0] as Map<number, number>;
      if (picture !== undefined) tally.set(picture, (tally.get(picture) ?? 0) + 1);
      const opcodes = program.map((one) => one.opcode);
      const suffix = program.slice(-4);
      if (chosen === undefined
          && FOUR_SLOT_PREFIX.every((opcode, k) => opcodes[k] === opcode) && opcodes[3] === OP_FONT
          && FOUR_SLOT_SUFFIX_OPCODES.every((opcode, k) => suffix[k]?.opcode === opcode)
          && [OP_TEXT_AT, OP_TEXT_INLINE].includes(suffix[2]?.opcode as number) && suffix[3]?.opcode === OP_END) {
        chosen = { mode, activity, program };
      }
    }
  }
  const majority = (tally: Map<number, number>): number | undefined =>
    [...tally].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
  const found = chosen === undefined ? undefined : records[chosen.mode];
  if (chosen === undefined || found === undefined) {
    throw new ComposeError('no working screen has the chrome a device mode page has');
  }
  if (found.entries.some((entry) => entry.flags !== undefined)) {
    throw new ComposeError('the template working screen is not in the narrow form');
  }
  return {
    mode: chosen.mode, activity: chosen.activity, entries: found.entries,
    prefix: chosen.program.slice(0, 3), suffix: chosen.program.slice(-4),
    single: majority(counts[0] as Map<number, number>), crossed: majority(counts[1] as Map<number, number>),
  };
}

function composeFourSlotActivityScreen(
  c: Container, activity: number, label: string, rows: readonly ComposeRow[],
  options: ComposeActivityScreenOptions,
): ComposedActivityScreen {
  const starts = arch14Starts(c);
  if (starts.startup.has(activity) || activity === starts.idle) {
    throw new ComposeError(`activity ${activity} already has a working screen`);
  }
  const maps = activityMaps(c, starts);
  const working = workingTemplate14(c, starts, maps);
  const device = fourSlotTemplate(c, undefined);
  const charMap = characterMap(c);
  if (charMap === undefined) throw new ComposeError('the config draws no text this can spell from');
  const setOf = (font: number, now: Container = c): FontSet => {
    const set = (fontSets(now) ?? [])[font];
    if (set === undefined) throw new ComposeError(`the config does not carry font ${font}`);
    return set;
  };

  // The start up screen to copy: the image, the font, the title, then the three fixed lines.
  const startupOf = options.startupLike === undefined
    ? working.activity
    : activityNames(c).find((one) => one.name === options.startupLike)?.activity;
  const startupTemplate = startupOf === undefined ? undefined : starts.startup.get(startupOf);
  if (startupTemplate === undefined) throw new ComposeError(`no activity is labelled ${options.startupLike}`);
  const startupRecord = (modeRecords(c) ?? [])[startupTemplate];
  const startupPage = startupRecord?.pages[0];
  const startupProgram = startupPage === undefined ? [] : screenProgram(c, startupPage.program) ?? [];
  const fixedFrom = startupProgram.findIndex((one, k) => k >= 2
    && (one.opcode === OP_TEXT_AT || one.opcode === OP_TEXT_INLINE) && (one.operands[1] as number) >= STARTUP_FIXED_Y);
  const fixed = fixedFrom < 0 ? [] : startupProgram.slice(fixedFrom, -1);
  if (startupRecord === undefined || startupRecord.pages.length !== 1 || startupPage === undefined
      || (taggedList(c, startupPage.list)?.entries.length ?? -1) !== 0
      || startupRecord.entries.some((entry) => entry.flags !== undefined)
      || startupProgram[0]?.opcode !== OP_IMAGE || startupProgram[1]?.opcode !== OP_FONT
      || fixed.length === 0 || startupProgram.at(-1)?.opcode !== OP_END
      || !startupProgram.slice(2, fixedFrom).every((one) => one.opcode === OP_TEXT_INLINE || one.opcode === OP_TEXT_AT)
      || !fixed.every((one) => one.opcode === OP_TEXT_AT || one.opcode === OP_TEXT_INLINE)) {
    throw new ComposeError(`activity ${startupOf}'s start up screen is not the one page shape every arch 14 one has`);
  }
  const startupFont = startupProgram[1]?.operands[0] as number;
  // The start up title, broken greedily at STARTUP_TITLE_MAX onto at most two lines, each centred.
  const startupWidthOf = (text: string): number =>
    textWidth(c, setOf(startupFont), codesFor(charMap, c, setOf(startupFont), text, startupFont));
  const startupLines: string[] = [];
  for (const word of (STARTUP_TITLE_PREFIX + label).split(' ')) {
    const last = startupLines.at(-1);
    if (last !== undefined && startupWidthOf(`${last} ${word}`) <= STARTUP_TITLE_MAX) {
      startupLines[startupLines.length - 1] = `${last} ${word}`;
    } else {
      startupLines.push(word);
    }
  }
  const startupTooWide = startupLines.find((line) => startupWidthOf(line) > STARTUP_TITLE_MAX);
  if (startupLines.length > 2 || startupTooWide !== undefined) {
    throw new ComposeError(`'${STARTUP_TITLE_PREFIX}${label}' does not fit a start up screen's two lines of `
      + `${STARTUP_TITLE_MAX} pixels: give the activity a shorter label`);
  }
  const startupTitle = startupLines.map((line, k) => {
    const codes = codesFor(charMap, c, setOf(startupFont), line, startupFont);
    const x = Math.floor((FOUR_SLOT_SCREEN_WIDTH - textWidth(c, setOf(startupFont), codes)) / 2);
    return [OP_TEXT_INLINE, x, k === 0 ? STARTUP_TITLE_Y : STARTUP_TITLE_SECOND_Y, ...codes, 0];
  }).flat();

  // The working screen's text, refused before anything moves.
  const perPage = FOUR_SLOT_ITEMS.length;
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
  if (pageCount > 9) throw new ComposeError('a page counter of two digits is not composed');
  const titleCodes = codesFor(charMap, c, setOf(device.titleFont), label, device.titleFont);
  const titleWidth = textWidth(c, setOf(device.titleFont), titleCodes);
  const titleRoom = (pageCount > 1 ? FOUR_SLOT_COUNTER_X[0] : FOUR_SLOT_SCREEN_WIDTH) - FOUR_SLOT_TITLE_XY[0];
  if (titleWidth > titleRoom) {
    throw new ComposeError(`'${label}' is ${titleWidth} pixels wide and the working screen's title holds ${titleRoom}`);
  }
  // Each label broken the way the compiler breaks a corner label, section 323: one line or two.
  const rowLines = rows.map((row) => fourSlotLabelLines(charMap, c, setOf(device.labelFont), device.labelFont, row.label));
  const existingLists = c.actionLists()?.length ?? 0;
  for (const row of rows) {
    if (!Number.isInteger(row.list) || row.list < 0 || row.list >= existingLists) {
      throw new ComposeError(`'${row.label}' names list ${row.list} of ${existingLists} that exist`);
    }
  }
  const digitCodes = (n: number): number[] =>
    codesFor(charMap, c, setOf(device.counterFont), String(n), device.counterFont);
  const slashCodes = codesFor(charMap, c, setOf(device.counterFont), '/', device.counterFont);
  const pageRows = Array.from({ length: pageCount }, (_, p) => rows.slice(p * perPage, (p + 1) * perPage));
  const needs = new Set(pageRows.map((onPage) => onPage.length > 1));
  if ((needs.has(false) && working.single === undefined) || (needs.has(true) && working.crossed === undefined)) {
    throw new ComposeError('no working screen here holds as many commands as a page of this one, so there '
      + 'is no background to copy for it');
  }

  const table = modeTable(c);
  if (table === undefined) throw new ComposeError('base slot 6 states no table');
  const startupMode = table.addresses.length;
  const mode = startupMode + 1;
  const sets = handlerSets(c);
  if (sets === undefined) throw new ComposeError('base slot 9 does not read');
  const set = sets.addresses.length;

  // 1. The start up screen: its record's entries as the template's, bound to nothing, one page with an
  // empty list, and a program of the template's picture and font, the new title, and its fixed lines.
  const own = (entries: readonly TaggedEntry[]) =>
    entries.map((entry) => ({ tag: entry.tag, operand: entry.operand, opcode: entry.opcode }));
  let current = appendArch14Mode(c, startupMode, own(startupRecord.entries), [fourSlotPageList([])], (now) => {
    const nowProgram = screenProgram(now, (modeRecords(now)?.[startupTemplate]?.pages[0] as ModePage).program) ?? [];
    const copied = [nowProgram[0], nowProgram[1], ...nowProgram.slice(fixedFrom, -1)] as ScreenInstruction[];
    const title = startupTitle;
    return [{
      length: copied.reduce((sum, one) => sum + one.length, 0) + title.length + 1,
      build: (shifted) => new Uint8Array([
        ...copiedInstruction(now, copied[0] as ScreenInstruction, shifted),
        ...copiedInstruction(now, copied[1] as ScreenInstruction, shifted),
        ...title,
        ...copied.slice(2).flatMap((one) => [...copiedInstruction(now, one, shifted)]),
        OP_END,
      ]),
    }];
  });

  // 2. The working screen: a device mode page's program with the working screen's prefix, bottom word
  // and backgrounds, and the working screen's own two record entries.
  const pageListBytes = pageRows.map((onPage) => fourSlotPageList(onPage.map((row) => row.list)));
  current = appendArch14Mode(current, mode, own(working.entries), pageListBytes, (now) => {
    const freshDevice = fourSlotTemplate(now, undefined);
    const freshWorking = workingTemplate14(now, arch14Starts(now), activityMaps(now, arch14Starts(now)));
    const template: FourSlotTemplate = {
      ...freshDevice, prefix: freshWorking.prefix, suffix: freshWorking.suffix,
      single: freshWorking.single, crossed: freshWorking.crossed,
    };
    const measuring = setOf(device.labelFont, now);
    return pageRows.map((onPage, p) => fourSlotPageProgram(now, template, measuring, {
      titleCodes,
      counter: pageCount > 1 ? [digitCodes(p + 1), slashCodes, digitCodes(pageCount)] : undefined,
      labels: onPage.map((_, k) => (rowLines[p * perPage + k] as number[][])[0] as number[]),
      second: onPage.map((_, k) => (rowLines[p * perPage + k] as number[][])[1]),
    }));
  });

  // 3. The four cases. The Devices key's copy the idle value's program, byte for byte, so the composed
  // activity's Devices key opens the list shown when no activity is running.
  const idleProgram = (map: number): Uint8Array => {
    const target = valueMaps(current)?.[map]?.entries.find(([key]) => key === starts.idle)?.[1];
    const one = target === undefined ? undefined : caseQueued(current, target);
    if (one === undefined) throw new ComposeError(`record ${map} has no idle case to copy`);
    return new Writer(5).u8(SCREEN_QUEUE_INSTRUCTION).u16(one.operand).u8(one.opcode).u8(OP_END).bytes;
  };
  current = appendValueMapCase(current, maps.working, activity,
    new Writer(5).u8(SCREEN_QUEUE_INSTRUCTION).u16(mode).u8(ENTER_MODE).u8(OP_END).bytes);
  for (const map of maps.devices) current = appendValueMapCase(current, map, activity, idleProgram(map));
  current = appendValueMapCase(current, maps.select, activity, new Writer(5)
    .u8(SCREEN_QUEUE_INSTRUCTION).u16(SELECT_BINDING_SET_MASK | set).u8(SELECT_BINDING_SET).u8(OP_END).bytes);

  return {
    bytes: restamped(current.blob), activity, mode, startupMode, map: maps.working, scans: [],
    startVariable: starts.startVariable, flagVariable: starts.flagVariable, set,
    maps: [maps.working, ...maps.devices, maps.select], pages: pageCount,
  };
}

/** What `composeActivityDeviceList` built. */
export interface ComposedActivityDeviceList {
  bytes: Uint8Array;
  /** The new device list, base slot 6. */
  mode: number;
  /** The device list it was copied from, the one the key under Devices opens while no activity runs. */
  idleMode: number;
  /** The device modes its rows enter, in the order they are drawn, page after page. */
  order: number[];
  /** The base slot 14 records whose case for the activity enters the new list. */
  maps: number[];
}

/**
 * The devices an activity switches on, as the device modes the device list enters for them, in the
 * order its enter list switches them on.
 *
 * **The enter list's own instructions and the lists it calls, and no deeper**: a real one groups its
 * power writes into a called list on 12 of 13, `h600_config`'s `[KPN_Power=1 TV_Power=1]`, and writes
 * them inline on the one activity with a single device, as a composed one always does, and both are
 * found at that depth. Deeper is the Remote Assistant's branch, whose
 * lists this has no business reading a device out of.
 *
 * **A device with no power variable is a placeholder in that group**, an instruction of opcode and
 * operand zero where its power write would be: Kodi on the Harmony 650, the Chromecast on the Harmony
 * 600 and the Roku on the Harmony 700, first in its group on all three. Nothing in the enter list says
 * which device it stands for, and on each of those configurations exactly one device on the list has
 * no power variable, so it is that one, by elimination, and two such devices are refused rather than
 * guessed between, a case no configuration here has. `composeActivity` never
 * writes one, since a device without a power variable cannot be one of its targets.
 */
function activitySwitchedOn(c: Container, activity: number, starts: Arch14Starts, listed: readonly number[]): number[] {
  const lists = c.actionLists() ?? [];
  const set = starts.sets.get(activity);
  const address = set === undefined ? undefined : handlerSets(c)?.addresses[set];
  const enter = address === undefined ? undefined
    : taggedList(c, address)?.entries.find((one) => one.tag === HANDLER_TAG_ENTER);
  const enterList = enter === undefined ? undefined : lists[enter.operand];
  if (enterList === undefined) throw new ComposeError(`activity ${activity} has no enter list to read its devices from`);

  const power = new Map(deviceVariables(c).filter((one) => one.property === POWER_PROPERTY)
    .map((one) => [one.index, one.device]));
  const modeOf = new Map<number, number>();
  const unpowered: number[] = [];
  for (const device of deviceInventory(c)) {
    if (device.mode === undefined || !listed.includes(device.mode)) continue;
    const own = device.variables.filter((one) => power.has(one));
    if (own.length === 0) unpowered.push(device.mode);
    for (const variable of own) modeOf.set(variable, device.mode);
  }

  const out: number[] = [];
  const add = (mode: number): void => { if (!out.includes(mode)) out.push(mode); };
  const read = (instructions: readonly Instruction[], depth: number): void => {
    for (const one of instructions) {
      if (one.opcode === ACTION_LIST_INDEX_OPCODE && depth === 0) {
        read(lists[one.operand] ?? [], depth + 1);
      } else if (one.opcode === 0 && one.operand === 0) {
        if (unpowered.length !== 1) {
          throw new ComposeError(`activity ${activity} switches on a device with no power variable and `
            + `${unpowered.length} devices on the list have none, so which one it is cannot be told`);
        }
        add(unpowered[0] as number);
      } else if (one.opcode >= STATE_WRITE_BASE && one.operand !== 0) {
        const mode = modeOf.get(one.opcode - STATE_WRITE_BASE);
        if (mode !== undefined) add(mode);
      }
    }
  };
  read(enterList, 0);
  return out;
}

/**
 * Give a composed activity on a Harmony 600, 650 or 700 a device list of its own, and make the key
 * under Devices open it.
 *
 * **Every activity on those remotes has one**, 13 of 13 on the four arch 14 user configurations,
 * section 294: the list the key shows while an activity runs is the idle one's with the rows reordered,
 * and its bottom word says "Activity" where the idle one's says "Activities". `composeActivityScreen`
 * points a composed activity's key at the idle list, which works and draws the wrong word, and this
 * replaces that with the list the compiler would have made.
 *
 * **The order is the activity's devices first**, in the order its enter list switches them on, **then
 * the rest in the idle list's order**, 13 of 13. Nothing else moves: the pages hold as many rows each as
 * the idle list's, so the page count, the page counters, the backgrounds and the record's own entries
 * are the idle list's. Each label is the idle list's instructions for that device, fonts and all, moved
 * to its new corner: a label that changes column starts at x 3 or ends at 125, and one that changes row
 * moves by the rows' 50 pixels, which puts all 63 labels of the thirteen real lists where the compiler
 * drew them. The rows run the idle list's own row lists, since a row list only enters its device's mode
 * and the real lists hold byte identical copies of them.
 *
 * Run it after `composeActivity`, which writes the enter list the order is read from, and after
 * `composeActivityMenuRow`, since an activity is found through the menu row that starts it. It refuses an
 * activity whose key already opens something other than the idle list, and it needs one activity that
 * already has a list of its own, to take the word "Activity" from.
 */
export function composeActivityDeviceList(c: Container, activity: number): ComposedActivityDeviceList {
  if (c.architecture !== 14) {
    throw new ComposeError("a device list of an activity's own is composed for the Harmony 600, 650 and 700 alone");
  }
  const starts = arch14Starts(c);
  // Activities are found through the activity menu rows that start them, so a composed one is found
  // only once `composeActivityMenuRow` has given it its row.
  if (!starts.startup.has(activity)) {
    throw new ComposeError(`${activity} is not an activity with a start up screen and a menu row`);
  }
  const maps = activityMaps(c, starts);
  const valueRecords = valueMaps(c) ?? [];
  const queuedFor = (map: number, key: number): Instruction | undefined => {
    const target = valueRecords[map]?.entries.find(([one]) => one === key)?.[1];
    return target === undefined ? undefined : caseQueued(c, target);
  };
  const idleModes = new Set(maps.devices.map((map) => queuedFor(map, starts.idle)?.operand));
  const idleMode = [...idleModes][0];
  if (idleModes.size !== 1 || idleMode === undefined) {
    throw new ComposeError('the records under Devices do not agree on the idle device list');
  }
  for (const map of maps.devices) {
    const one = queuedFor(map, activity);
    if (one?.opcode !== ENTER_MODE || one.operand !== idleMode) {
      throw new ComposeError(`record ${map}'s case for activity ${activity} does not open the idle device list`);
    }
  }
  // A case program another key also runs would take that key to the new list too.
  const ours = new Set(maps.devices.map((map) =>
    valueRecords[map]?.entries.find(([one]) => one === activity)?.[1] as number));
  for (const [index, record] of valueRecords.entries()) {
    for (const [key, target] of record.entries) {
      if (ours.has(target) && !(key === activity && maps.devices.includes(index))) {
        throw new ComposeError(`record ${index}'s case for ${key} shares the program this would change`);
      }
    }
  }
  const template = (() => {
    for (const [key] of valueRecords[maps.devices[0] as number]?.entries ?? []) {
      const mode = queuedFor(maps.devices[0] as number, key)?.operand;
      if (key !== starts.idle && key !== activity && mode !== undefined && mode !== idleMode) return mode;
    }
    throw new ComposeError('no activity here has a device list of its own to take the word "Activity" from');
  })();

  // The idle list: each page's rows in item order, the device mode and row list of each.
  const lists = c.actionLists() ?? [];
  const marker = deviceModeMarker(c);
  const idleRecord = (modeRecords(c) ?? [])[idleMode];
  if (idleRecord === undefined) throw new ComposeError(`mode ${idleMode} does not read`);
  if (idleRecord.entries.some((entry) => entry.flags !== undefined)) {
    throw new ComposeError("the idle device list's record is not in the narrow form");
  }
  const rowList = new Map<number, number>();
  const cellOf = new Map<number, { page: number; item: number }>();
  const perPage = idleRecord.pages.map((page, p) => {
    const entries = taggedList(c, page.list)?.entries ?? [];
    const layout = menuLayout(c, entries);
    if (layout === undefined || layout.rows) throw new ComposeError('the idle device list is not in the corner layout');
    const modes: number[] = [];
    FOUR_SLOT_ITEMS.forEach((item, k) => {
      const entry = entries.find((one) => (one.tag & SCAN_MASK) === item.scan);
      if (entry === undefined) return;
      const mode = deviceListRowMode(lists[entry.operand], c.architecture, marker);
      if (mode === undefined || modes.length !== k) throw new ComposeError(`the idle device list's page ${p} is not rows filled in order`);
      modes.push(mode);
      rowList.set(mode, entry.operand);
      cellOf.set(mode, { page: p, item: k });
    });
    return modes.length;
  });
  const idleOrder = [...cellOf.keys()];
  const first = activitySwitchedOn(c, activity, starts, idleOrder);
  const order = [...first, ...idleOrder.filter((mode) => !first.includes(mode))];
  const pageModes = perPage.map((count, p) => {
    const from = perPage.slice(0, p).reduce((sum, one) => sum + one, 0);
    return order.slice(from, from + count);
  });

  const isText = (one: ScreenInstruction): boolean => one.opcode === OP_TEXT_AT || one.opcode === OP_TEXT_INLINE;
  const mode = modeTable(c)?.addresses.length;
  if (mode === undefined) throw new ComposeError('base slot 6 states no table');
  let current = appendArch14Mode(c, mode, idleRecord.entries.map((entry) =>
    ({ tag: entry.tag, operand: entry.operand, opcode: entry.opcode })),
  pageModes.map((modes) => fourSlotPageList(modes.map((one) => rowList.get(one) as number))), (now) => {
    const records = modeRecords(now) ?? [];
    const programOf = (m: number, p: number): ScreenInstruction[] => {
      const page = records[m]?.pages[p];
      const program = page === undefined ? undefined : screenProgram(now, page.program);
      if (program === undefined) throw new ComposeError(`mode ${m}'s page ${p} does not read`);
      return program;
    };
    // The bottom word: the font and text after the closing bar, which are the last two instructions
    // before the end on every device list page.
    const shaped = (program: ScreenInstruction[], what: string): number => {
      const bar = program.findLastIndex((one) => one.opcode === SCREEN_DRAW_IMAGE_AT);
      if (bar < 0 || program.length !== bar + 4 || program[bar + 1]?.opcode !== OP_FONT
          || !isText(program[bar + 2] as ScreenInstruction) || program[bar + 3]?.opcode !== OP_END) {
        throw new ComposeError(`${what} does not end in its bar, a font and one word`);
      }
      return bar;
    };
    const word = programOf(template, 0);
    const wordAt = shaped(word, `mode ${template}'s first page`);
    // Every label line of the idle list, per device, with the font it is drawn in.
    const lines = new Map<number, { font: number; instruction: ScreenInstruction }[]>();
    const heads = idleRecord.pages.map((_, p) => {
      const program = programOf(idleMode, p);
      const bar = shaped(program, `the idle device list's page ${p}`);
      const labelsFrom = 1 + program.findLastIndex((one, k) => k < bar && isText(one)
        && fourSlotCellAt(one.operands[0] as number, one.operands[1] as number) === undefined);
      let font = program.slice(0, labelsFrom).findLast((one) => one.opcode === OP_FONT)?.operands[0];
      if (font === undefined) throw new ComposeError(`the idle device list's page ${p} selects no font`);
      for (const one of program.slice(labelsFrom, bar)) {
        if (one.opcode === OP_FONT) { font = one.operands[0] as number; continue; }
        const cell = isText(one) ? fourSlotCellAt(one.operands[0] as number, one.operands[1] as number) : undefined;
        const device = [...cellOf].find(([, at]) => at.page === p && at.item === cell)?.[0];
        if (device === undefined) throw new ComposeError(`the idle device list's page ${p} draws something no row owns`);
        lines.set(device, [...(lines.get(device) ?? []), { font, instruction: one }]);
      }
      return { program, labelsFrom, bar, font: program.slice(0, labelsFrom).findLast((one) => one.opcode === OP_FONT)?.operands[0] as number };
    });
    return pageModes.map((modes, p) => {
      const head = heads[p] as (typeof heads)[number];
      // Each piece is an instruction to copy, moved to (x, y) where it is a label, or a font select.
      const pieces: ({ instruction: ScreenInstruction; x?: number; y?: number } | { font: number })[] = [];
      let font = head.font;
      modes.forEach((device, k) => {
        const to = FOUR_SLOT_ITEMS[k] as (typeof FOUR_SLOT_ITEMS)[number];
        const from = FOUR_SLOT_ITEMS[(cellOf.get(device) as { item: number }).item] as (typeof FOUR_SLOT_ITEMS)[number];
        for (const line of lines.get(device) ?? []) {
          if (line.font !== font) { pieces.push({ font: line.font }); font = line.font; }
          const set = (fontSets(now) ?? [])[line.font];
          const codes = line.instruction.opcode === OP_TEXT_INLINE ? line.instruction.glyphs
            : glyphsReferencedBy(now, line.instruction);
          if (set === undefined || codes === undefined) throw new ComposeError('a label of the idle list does not read');
          const x = to.column === from.column ? line.instruction.operands[0] as number
            : to.column === 0 ? FOUR_SLOT_LEFT_X : FOUR_SLOT_RIGHT_END - textWidth(now, set, [...codes]);
          const y = (line.instruction.operands[1] as number)
            + (FOUR_SLOT_LABEL_Y[to.row] as number) - (FOUR_SLOT_LABEL_Y[from.row] as number);
          pieces.push({ instruction: line.instruction, x, y });
        }
      });
      const kept = head.program.slice(0, head.labelsFrom);
      const tail = [head.program[head.bar], word[wordAt + 1], word[wordAt + 2], head.program[head.bar + 3]] as ScreenInstruction[];
      const size = (piece: (typeof pieces)[number]): number => ('font' in piece ? 2 : piece.instruction.length);
      return {
        length: [...kept, ...tail].reduce((sum, one) => sum + one.length, 0)
          + pieces.reduce((sum, one) => sum + size(one), 0),
        build: (shifted: (address: number) => number) => {
          const out: number[] = [];
          for (const one of kept) out.push(...copiedInstruction(now, one, shifted));
          for (const piece of pieces) {
            if ('font' in piece) { out.push(OP_FONT, piece.font); continue; }
            const bytes = copiedInstruction(now, piece.instruction, shifted);
            bytes[1] = piece.x as number;
            bytes[2] = piece.y as number;
            out.push(...bytes);
          }
          for (const one of tail) out.push(...copiedInstruction(now, one, shifted));
          return new Uint8Array(out);
        },
      };
    });
  });

  // The key under Devices: each record's case for the activity queues the new list instead. The
  // operand is the instruction's first two bytes after the opcode, low byte first, as `caseQueued`
  // reads them.
  for (const map of maps.devices) {
    const target = valueMaps(current)?.[map]?.entries.find(([one]) => one === activity)?.[1];
    const at = target === undefined ? undefined : current.blobOffsetOf(target);
    if (at === undefined) throw new ComposeError(`record ${map} lost its case for activity ${activity}`);
    current.blob.set(new Writer(2).u16(mode).bytes, at + 1);
  }
  current = parse(current.blob);
  return { bytes: restamped(current.blob), mode, idleMode, order, maps: [...maps.devices] };
}

/**
 * Give a composed activity its working screen, and put it where the remote looks for it.
 *
 * `activity` is the value the activity has or will have, `nextActivityValue` before
 * `composeActivity` runs. `rows` are the pads, drawn top left first, at most as many as the
 * template's hit page offers, which is five on the spare Harmony One and two on the everyday one;
 * none is a real shape too, one of the everyday Harmony One's eight working screens carrying only its
 * Devices key.
 *
 * **Everything that is the same on every working screen is shared rather than copied**: the record's
 * enter, leave and header handler lists, the header timer those start, the background, the "Devices"
 * string, the pad pictures. The four one page working screens on the spare Harmony One carry
 * byte identical copies of each handler list, each copy its own list, and one timer between them, so sharing the lists is
 * what their compiler does with the duplicates folded, and the rule a writer must respect is only
 * that two working screens are never on at once, which a mode switch guarantees.
 *
 * **What is ours**: the title, drawn inline in the chrome's own font where that font spells it; the
 * pads' labels; the page list and its pool copy; and the Devices key, which enters the **all devices**
 * menu where a real activity's enters a device list of its own devices. That last one is a known
 * simplification, since building a per activity device list is a second screen.
 */
export function composeActivityScreen(
  c: Container, activity: number, label: string, rows: readonly ComposeRow[],
  options: ComposeActivityScreenOptions = {},
): ComposedActivityScreen {
  if (c.architecture === 14) return composeFourSlotActivityScreen(c, activity, label, rows, options);
  if (c.architecture !== 12) {
    throw new ComposeError('an activity screen is composed for the Harmony One, 600, 650 and 700 alone');
  }
  const screens = activityScreens(c);
  if (screens === undefined) throw new ComposeError('no record says which screen an activity shows');
  if (screens.screens.has(activity)) {
    throw new ComposeError(`activity ${activity} already has a working screen`);
  }
  const template = workingTemplate(c, screens);
  const lists = c.actionLists() ?? [];
  const records = modeRecords(c) ?? [];

  // The pads the template's hit page offers, matched to the slots by where a touch lands: the
  // centre of slot k's picture is asked which area it hits, which is the firmware's own question.
  const hit = touchPageOf(c, template.page);
  if (hit === undefined || template.page.lead === undefined) {
    throw new ComposeError("the template page's hit page does not read");
  }
  const pictures: number[] = [];
  for (const [x, y] of DEVICE_PAGE_SLOTS) {
    let found: number | undefined;
    for (const mode of screens.screens.values()) {
      for (const page of records[mode]?.pages ?? []) {
        found ??= pictureDrawnAt(c, page.program, x, y);
      }
    }
    if (found === undefined) break;
    pictures.push(found);
  }
  const scans: number[] = [];
  for (const [k, [x, y]] of DEVICE_PAGE_SLOTS.entries()) {
    const picture = pictures[k] === undefined ? undefined : bitmapAt(c, pictures[k] as number);
    if (picture === undefined) break;
    const owner = touchOwner(hit.areas, x + picture.stride / 2, y + picture.rows / 2);
    if (owner === undefined || owner.code === template.devicesScan
        || EDGE_CODES.includes(owner.code)) break;
    scans.push(owner.code);
  }
  if (rows.length > scans.length) {
    throw new ComposeError(`a working screen here holds ${scans.length} pads, not ${rows.length}`);
  }

  // The chrome to copy: font, title, background, the queued header work, the title again, return.
  const chrome = screenProgram(c, template.chrome) ?? [];
  const shape = chrome.map((one) => one.opcode);
  const titleAt = shape.indexOf(OP_TEXT_AT);
  if (shape[0] !== OP_FONT || titleAt !== 1 || shape.lastIndexOf(OP_TEXT_AT) === titleAt
      || shape.at(-2) !== OP_RETURN || shape.at(-1) !== OP_END) {
    throw new ComposeError('the template chrome is not the font, title, frame, title, return shape');
  }
  const titleFont = chrome[0]?.operands[0] as number;
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const titleX = chrome[titleAt]?.operands[0] as number;
  const titleY = chrome[titleAt]?.operands[1] as number;

  // The page program to copy: the call, the footer's font and text, then pads in the pad font.
  const program = screenProgram(c, template.page.program) ?? [];
  const firstImage = program.findIndex((one) => one.opcode === OP_IMAGE);
  const footer = program.slice(1, firstImage < 0 ? program.length - 1 : firstImage);
  if (footer.length !== 2 || footer[0]?.opcode !== OP_FONT || footer[1]?.opcode !== OP_TEXT_AT) {
    throw new ComposeError('the template page does not open with its footer the way the corpus does');
  }
  const padFont = program.find((one, k) => k > firstImage && one.opcode === OP_FONT)?.operands[0]
    ?? DEVICE_ROW_FONT;

  // The start up screen and the "an activity is running" list, both read off existing activities.
  const bindings = activityBindings(c);
  const sets = handlerSets(c);
  const enterOf = (value: number): readonly Instruction[] | undefined => {
    const binding = bindings.find((one) => one.activity === value);
    const set = binding === undefined ? undefined : sets?.addresses[binding.set];
    const entry = set === undefined ? undefined
      : taggedList(c, set)?.entries.find((one) => one.tag === HANDLER_TAG_ENTER);
    return entry === undefined ? undefined : lists[entry.operand];
  };
  const startupOf = options.startupLike === undefined
    ? template.activity
    : activityNames(c).find((one) => one.name === options.startupLike)?.activity;
  if (startupOf === undefined) throw new ComposeError(`no activity is labelled ${options.startupLike}`);
  const opening = enterOf(startupOf)?.[0];
  if (opening?.opcode !== ENTER_MODE) {
    throw new ComposeError(`activity ${startupOf}'s enter list does not open with a start up screen`);
  }
  const startupMode = opening.operand;
  const called = [...screens.screens.keys()].map((value) => new Set((enterOf(value) ?? [])
    .filter((one) => one.opcode === ACTION_LIST_INDEX_OPCODE).map((one) => one.operand)));
  const active = [...(called[0] ?? [])].filter((index) => called.every((set) => set.has(index)))
    .filter((index) => {
      const list = lists[index];
      return list?.length === 2 && list[0]?.opcode === SILENT_WRITE.opcode
        && list[0]?.operand === SILENT_WRITE.operand
        && (list[1] as Instruction).opcode >= STATE_WRITE_BASE && list[1]?.operand === 1;
    });
  if (active.length !== 1) {
    throw new ComposeError(`${active.length} lists look like the "an activity is running" flag`);
  }
  const activeList = active[0] as number;

  // ---- 1. the Devices key's list, reused where the config has one ----
  const menus = deviceListMenus(c).menus;
  const devicesMenu = menus[0];
  if (devicesMenu === undefined) throw new ComposeError('no device list menu for the Devices key');
  let current = c;
  let devicesList = lists.findIndex((list) => list?.length === 2
    && list[0]?.opcode === BEEP_OPCODE && list[1]?.opcode === ENTER_MODE
    && list[1]?.operand === devicesMenu);
  const actionSlot = archSlot(12, ACTION_TABLE_SLOT);
  if (devicesList < 0) {
    const table = current.pointerArrayAt(actionSlot);
    if (table === undefined) throw new ComposeError('base slot 10 does not read as a table');
    devicesList = table.values.length;
    const bytes = new Writer(1 + 3 * 2).u8(2)
      .u16(ROW_BEEP_OPERAND).u8(BEEP_OPCODE).u16(devicesMenu).u8(ENTER_MODE).bytes;
    const hole = relocate(current, table.start, bytes.length);
    hole.bytes.set(bytes, table.start);
    current = parse(appendTableEntries(parse(hole.bytes), actionSlot,
                                       [current.flashBase + table.start]));
  }

  // ---- 2. the mode table's placeholder entry, swapped at the end, as composeDeviceScreen does ----
  const stale = modeTable(current);
  const placeholder = stale?.addresses[0];
  if (stale === undefined || placeholder === undefined) throw new ComposeError('base slot 6 does not read');
  const mode = stale.addresses.length;
  const tableAt = stale.start + stale.length;
  const tableHole = relocate(current, tableAt, 3);
  tableHole.bytes.set(new Writer(3).u24(placeholder).bytes, tableAt);
  tableHole.bytes.set(new Writer(3).u24(mode + 1).bytes, stale.start);
  current = parse(tableHole.bytes);

  // ---- 3. the page list, its pool copy first, then the list itself in base slot 8 ----
  const listBytes = new Writer(1 + 4 * (rows.length + 1)).u8(rows.length + 1)
    .u8(0x80 | template.devicesScan).u16(devicesList).u8(ACTION_LIST_INDEX_OPCODE);
  rows.forEach((row, k) => {
    listBytes.u8(0x80 | (scans[k] as number)).u16(row.list).u8(ACTION_LIST_INDEX_OPCODE);
  });
  const lastPool = taggedListPools(current).at(-1);
  if (lastPool === undefined) throw new ComposeError('no copy pool to extend');
  const copyHole = relocate(current, lastPool.end, listBytes.bytes.length);
  copyHole.bytes.set(listBytes.bytes, lastPool.end);
  current = parse(copyHole.bytes);
  const listAt = Math.max(...modePages(current).map((page) => {
    const off = current.blobOffsetOf(page.list);
    const list = taggedList(current, page.list);
    return off === undefined || list === undefined ? 0 : off + list.length;
  }));
  const listHole = relocate(current, listAt, listBytes.bytes.length);
  listHole.bytes.set(listBytes.bytes, listAt);
  current = parse(listHole.bytes);
  const pageListAddress = current.flashBase + listAt;

  // ---- 4. the mode block: record list, chrome, page program, page record, entry ----
  // Every address the block embeds is re-read here, after the three insertions above.
  const moved = modeRecords(current)?.[template.mode];
  const movedPage = moved?.pages[0];
  if (moved === undefined || movedPage === undefined) throw new ComposeError('the template moved away');
  const movedChrome = screenProgram(current, u24(
    (screenProgram(current, movedPage.program)?.[0] as { operands: Uint8Array }).operands, 0)) ?? [];
  const movedProgram = screenProgram(current, movedPage.program) ?? [];
  const recordStart = current.blobOffsetOf(moved.start);
  if (recordStart === undefined) throw new ComposeError('the template record is out of reach');
  const recordList = current.blob.slice(recordStart, recordStart + moved.length);
  const sets14 = fontSets(current) ?? [];
  const titleFontUsed = fontThatSpells(current, map, label, titleFont);
  const titleCodes = codesFor(map, current, sets14[titleFontUsed] as FontSet, label, titleFontUsed);
  const padSet = sets14[padFont];
  if (padSet === undefined) throw new ComposeError('the pad font does not read');
  const rowCodes = rows.map((row) => codesFor(map, current, padSet, row.label, padFont));
  const movedPictures = DEVICE_PAGE_SLOTS.slice(0, rows.length).map(([x, y]) => {
    for (const m of activityScreens(current)?.screens.values() ?? []) {
      for (const page of modeRecords(current)?.[m]?.pages ?? []) {
        const one = pictureDrawnAt(current, page.program, x, y);
        if (one !== undefined) return one;
      }
    }
    throw new ComposeError('a pad picture stopped reading');
  });

  const queued = movedChrome.filter((one) => one.opcode === SCREEN_QUEUE_INSTRUCTION);
  const background = movedChrome.find((one) => one.opcode === OP_IMAGE);
  if (background === undefined) throw new ComposeError('the template chrome draws no background');
  const chromeLength = 2 + (3 + titleCodes.length + 1) + 6 + 4 * queued.length + 6 + 1 + 1;
  const programLength = 4 + 2 + 6
    + rows.reduce((sum, _, k) => sum + 6 + (1 + 2 + (rowCodes[k] as number[]).length + 1), 0)
    + (rows.length > 0 ? 2 : 0) + 1;
  const blockLength = recordList.length + chromeLength + programLength + 7 + (6 + 3);
  const blockAt = Math.max(...(modeRecords(current) ?? []).map((record) => {
    const off = current.blobOffsetOf(record.address);
    return off === undefined ? 0 : off + record.entryLength;
  }));
  const base = current.flashBase + blockAt;
  const shifted = (address: number): number => (address >= base ? address + blockLength : address);
  const chromeAddress = base + recordList.length;
  const programAddress = chromeAddress + chromeLength;
  const pageAddress = programAddress + programLength;
  const entryAddress = pageAddress + 7;

  const block = new Writer(blockLength);
  block.raw(recordList);
  // The chrome. The title is drawn inline the first time and by reference the second, which is the
  // corpus's own economy: a referenced run is the payload of an inline one, three bytes in.
  block.u8(OP_FONT).u8(titleFontUsed);
  block.u8(OP_TEXT_INLINE).u8(titleX).u8(titleY);
  titleCodes.forEach((code) => block.u8(code));
  block.u8(0);
  block.u8(OP_IMAGE).u8(background.operands[0] as number).u8(background.operands[1] as number)
    .u24(shifted(u24(background.operands, 2)));
  for (const one of queued) block.u8(SCREEN_QUEUE_INSTRUCTION).raw(one.operands);
  block.u8(OP_TEXT_AT).u8(titleX).u8(titleY).u24(chromeAddress + 2 + 3);
  block.u8(OP_RETURN).u8(OP_END);
  // The page: the call, the footer copied, then each pad's picture and its centred label.
  const footerFont = movedProgram[1];
  const footerText = movedProgram[2];
  if (footerFont?.opcode !== OP_FONT || footerText?.opcode !== OP_TEXT_AT) {
    throw new ComposeError('the template footer moved out of shape');
  }
  block.u8(OP_CALL).u24(chromeAddress);
  block.u8(OP_FONT).raw(footerFont.operands);
  block.u8(OP_TEXT_AT).u8(footerText.operands[0] as number).u8(footerText.operands[1] as number)
    .u24(shifted(u24(footerText.operands, 2)));
  rows.forEach((row, k) => {
    const [x, y] = DEVICE_PAGE_SLOTS[k] as readonly [number, number];
    const picture = movedPictures[k] as number;
    block.u8(OP_IMAGE).u8(x).u8(y).u24(shifted(picture));
    if (k === 0) block.u8(OP_FONT).u8(padFont);
    const width = bitmapAt(current, picture)?.stride ?? 0;
    const wide = textWidth(current, padSet, rowCodes[k] as number[]);
    if (wide > width) {
      throw new ComposeError(`'${row.label}' is ${wide} pixels wide and its pad is ${width}`);
    }
    block.u8(OP_TEXT_INLINE).u8(x + Math.round((width - wide) / 2)).u8(y + DEVICE_LABEL_DROP);
    (rowCodes[k] as number[]).forEach((code) => block.u8(code));
    block.u8(0);
  });
  block.u8(OP_END);
  block.u8(template.page.lead).u24(shifted(pageListAddress)).u24(programAddress);
  block.u8(0).u24(base).u16(1).u24(pageAddress);
  if (block.remaining !== 0) throw new ComposeError(`the mode block is ${block.remaining} bytes short`);
  const blockHole = relocate(current, blockAt, blockLength);
  blockHole.bytes.set(block.bytes, blockAt);
  const swapped = parse(blockHole.bytes);
  const grownTable = modeTable(swapped);
  if (grownTable === undefined) throw new ComposeError('base slot 6 stopped reading');
  swapped.blob.set(new Writer(3).u24(entryAddress).bytes, grownTable.start + 3 + 3 * mode);
  current = parse(swapped.blob);

  // ---- 5. the activity's case in the base slot 14 record ----
  current = appendValueMapCase(current, screens.map, activity,
    new Writer(5).u8(SCREEN_QUEUE_INSTRUCTION).u16(mode).u8(ENTER_MODE).u8(OP_END).bytes);

  const check = activityScreens(current);
  if (check?.screens.get(activity) !== undefined && check.screens.get(activity) !== mode) {
    throw new ComposeError('the record names another screen for the activity than the one composed');
  }
  return {
    bytes: restamped(current.blob), activity, mode, startupMode, activeList, map: screens.map,
    devicesList, scans: scans.slice(0, rows.length),
  };
}

/*
 * ---- Switching a device off, section 280 ----
 *
 * A device is switched off by writing 0 into its `Power` variable, which runs the variable's
 * transition from on to off, and **nothing writes that 0 for a composed device**: Logitech's
 * compiler puts every device into two places and the composer put it into neither. Measured on the
 * spare Harmony One, where Off ended the composed activity and left the television on.
 *
 * 1. **The idle key map's all off list**, `allOffList`, which the remote runs when an activity ends.
 * 2. **Every activity's enter list**, which writes every device's power variable, 1 for the devices
 *    it uses and 0 for the rest, so starting an activity switches off what the last one left on. On
 *    every Logitech built configuration measured, across four architectures, directly or through the
 *    lists it calls, sometimes three calls down.
 *
 * `joinPowerOff` puts a new device into both; `activityPowerTargets` gives a new activity the
 * writes for every device, which `composeActivity` then emits like any other target.
 */

export interface JoinedPowerOff {
  bytes: Uint8Array;
  /** The all off list the write was appended to. */
  allOff: number;
  /** The enter lists that gained a write, one per activity, in base slot 9 order. */
  enterLists: number[];
}

/**
 * Put a device's power variable into the all off list and into every activity's enter list as 0.
 *
 * **Appended in place**, one three byte instruction per list, through `relocate`, which moves
 * everything at or above the insertion and every pointer to it; the list's own count byte is then
 * raised. In an enter list the write goes **immediately before the write of the activity counter**:
 * every power write of a real enter list sits before that write, and directly in front of it in
 * every user configuration. A configuration with one device has no all off list and is refused,
 * since its idle map queues the one zero write itself and a second device would need the list made. A list named by two base slot 10 entries is refused, because growing it would
 * change the other one too.
 */
export function joinPowerOff(c: Container, variable: number): JoinedPowerOff {
  const power = deviceVariables(c).find((one) => one.index === variable);
  if (power === undefined || power.property !== 'Power') {
    throw new ComposeError(`state variable ${variable} is not a device's Power variable`);
  }
  const allOff = allOffList(c);
  if (allOff === undefined) throw new ComposeError('no single list switches every device off');
  if (allOff.variables.includes(variable)) {
    throw new ComposeError(`the all off list already writes variable ${variable}`);
  }
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  if (counter === undefined) throw new ComposeError(`no ${ACTIVITY_STATE_NAME} variable`);
  const counterWrite = STATE_WRITE_BASE + counter.index;

  const sets = handlerSets(c);
  if (sets === undefined) throw new ComposeError('base slot 9 does not read');
  const roles = handlerSetRoles(c);
  const enterLists: number[] = [];
  sets.addresses.forEach((address, index) => {
    if (roles[index] !== 'activity') return;
    const enter = (taggedList(c, address)?.entries ?? []).find((one) => one.tag === HANDLER_TAG_ENTER);
    if (enter?.opcode !== ACTION_LIST_INDEX_OPCODE) {
      throw new ComposeError(`activity key map ${index} has no enter list`);
    }
    if (!enterLists.includes(enter.operand)) enterLists.push(enter.operand);
  });

  const write = new Writer(3).u16(0).u8(STATE_WRITE_BASE + variable).bytes;
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const actionSlot = archSlot(c.architecture, ACTION_TABLE_SLOT);
  let current = c;
  // Each insertion re-reads the table, since every one moves what follows it.
  const insert = (list: number, position: (body: readonly Instruction[]) => number): void => {
    const table = current.pointerArrayAt(actionSlot);
    const body = current.actionLists()?.[list];
    const address = table?.values[list];
    if (table === undefined || body === undefined || address === undefined) {
      throw new ComposeError(`list ${list} does not read`);
    }
    if (table.values.filter((one) => one === address).length !== 1) {
      throw new ComposeError(`list ${list} is named twice in base slot 10, so growing it grows both`);
    }
    if (body.length >= 0xff) throw new ComposeError(`list ${list} states its count in a byte`);
    const start = current.blobOffsetOf(address);
    if (start === undefined) throw new ComposeError(`list ${list} is outside the container`);
    const at = start + 1 + 3 * position(body);
    const hole = relocate(current, at, write.length);
    hole.bytes.set(write, at);
    hole.bytes[start] = body.length + 1;
    current = parse(hole.bytes);
  };
  insert(allOff.list, (body) => body.length);
  for (const list of enterLists) {
    insert(list, (body) => {
      const at = body.findIndex((one) => one.opcode === counterWrite);
      if (at < 0) throw new ComposeError(`enter list ${list} does not write the activity counter`);
      return at;
    });
  }
  return { bytes: restamped(Uint8Array.from(current.blob)), allOff: allOff.list, enterLists };
}

/**
 * The power writes a new activity makes: 1 into each variable in `on`, 0 into every other device
 * the all off list names, in that order, which is the order a real enter list calls them in.
 */
export function activityPowerTargets(
  c: Container, on: readonly number[],
): { variable: number; value: number }[] {
  const allOff = allOffList(c);
  if (allOff === undefined) throw new ComposeError('no single list switches every device off');
  return [
    ...on.map((variable) => ({ variable, value: 1 })),
    ...allOff.variables.filter((one) => !on.includes(one)).map((variable) => ({ variable, value: 0 })),
  ];
}

