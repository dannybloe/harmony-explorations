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
} from './gspm.ts';
import { u16 as u16le, u24 } from './bytes.ts';
import {
  STATE_RECORD_HEADER,
  STATE_TABLE_SLOT,
  STATE_VALUE_LENGTH,
  modePages,
  modeRecords,
  modeTable,
  pageListCopies,
  stateTable,
  taggedList,
  taggedListPools,
} from './sections.ts';
import { SCREEN_JUMP, bitmapAt, screenProgram } from './screen.ts';
import { characterMap } from './text.ts';
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
import { IR_TABLE_SLOT } from './ir.ts';
import { blockOfStatedCode, statedCode, statedProtocol } from './stated.ts';
import { TOUCH_AREA_LENGTH, type TouchArea, touchPages } from './tables.ts';
import { deviceListRows, deviceModeMarker } from './inventory.ts';
import { relocate } from './relocate.ts';
import { Writer } from './emit.ts';

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
 */
export function compiledBlockWords(pulses: readonly Pulse[], leadInUs = 0): IrPulse[] {
  const led = leadInUs > 0 ? [{ mark: false, us: leadInUs }, ...pulses] : [...pulses];
  const words: IrPulse[] = [];
  for (const pulse of led) {
    if (pulse.mark) {
      // A mark over the ceiling is spelt maximal first like blockWordsOf spells it; none of the
      // corpus's marks reach the ceiling, so the arm exists for completeness rather than evidence.
      words.push(...blockWordsOf([pulse]));
      continue;
    }
    let left = pulse.us;
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
  const last = words[words.length - 1];
  if (last !== undefined && !last.mark && last.microseconds >= 2) {
    words[words.length - 1] = { mark: false, microseconds: last.microseconds - 1 };
    words.push({ mark: false, microseconds: 1 });
  }
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
const ACTION_TABLE_SLOT = 10;
/** Opcode 0x7d: send an infrared code, operand `(group << 8) | record`. */
const SEND_INFRARED = 0x7d;
/** Opcode 0x7f: run the base slot 10 action list the operand indexes. */
const RUN_ACTION_LIST = 0x7f;
/** The firmware owns state variables 0 to 12, section 138, and a composer must not touch them. */
const FIRMWARE_STATE_MAX = 12;

/**
 * Append entries to one of the counted pointer tables, which is the one growth every section
 * shares: three bytes per entry at the table's end, then the count, then nothing else.
 */
function appendTableEntries(
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
function restamped(bytes: Uint8Array): Uint8Array {
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
}

export interface ComposedDevice {
  bytes: Uint8Array;
  group: number;
  /** The base slot 10 list index per command, which is what a binding's 0x7f names. */
  lists: readonly number[];
  /** The device's power variable, in base slot 13's numbering. */
  variable: number;
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

  // The infrared half, then everything else on the reparsed result.
  const group = composeIrGroup(c, device.commands);

  // One action list per command: `u8 1; u16 (group << 8) | record; u8 0x7d`, in a hole below the
  // action table, each named by a pointer appended to the table. The list index is what the
  // transitions below and phase 6's screen bindings point at.
  let current = parse(group.bytes);
  const actionSlot = archSlot(c.architecture, ACTION_TABLE_SLOT);
  const actionTable = current.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const listBytes = 4;
  const listsAt = actionTable.start;
  const listsHole = relocate(current, listsAt, listBytes * device.commands.length);
  device.commands.forEach((_, k) => {
    listsHole.bytes.set(
      new Writer(listBytes).u8(1).u16((group.group << 8) | k).u8(SEND_INFRARED).bytes,
      listsAt + listBytes * k);
  });
  const listBase = current.flashBase + listsAt;
  const firstList = actionTable.values.length;
  current = parse(appendTableEntries(
    parse(listsHole.bytes), actionSlot,
    device.commands.map((_, k) => listBase + listBytes * k)));

  // The power variable: a seven byte header and two transitions, each running the power command's
  // list. `first` is 0 because nothing is running when a config is generated, section 130, and the
  // maximum is 1 because a power switch has two states, which is also what the node's trailing
  // count states, section 86.
  const states = stateTable(current);
  if (states === undefined) throw new ComposeError('base slot 13 does not read as a table');
  if (states.count < FIRMWARE_STATE_MAX + 1) {
    throw new ComposeError("a table without the firmware's own variables is not one to extend");
  }
  const recordLength = STATE_RECORD_HEADER + STATE_VALUE_LENGTH * 2;
  // The record goes after the last existing record, where the generator scatters them, and
  // deliberately not at the section's start: the byte in front of base slot 13's table is the end
  // of the timer table's section, whose reader demands its counted array fill the gap to the next
  // section exactly, so a record wedged there drops the timer table out of the relocation census
  // silently and every timer pointer goes stale on the next insertion below it. Found by the
  // screen half's pool insertion, the first relocation below the timer records.
  const recordAt = Math.max(...states.entries.map((address) => {
    const off = current.blobOffsetOf(address);
    if (off === undefined) throw new ComposeError('a state record is outside the container');
    return off + STATE_RECORD_HEADER + STATE_VALUE_LENGTH * u16le(current.blob, off + 4);
  }));
  const recordHole = relocate(current, recordAt, recordLength);
  const powerList = firstList + power;
  const record = new Writer(recordLength)
    .u16(0).u16(1).u16(2).u8(0)
    .u8(0).u16(0).u16(1).u16(powerList).u8(RUN_ACTION_LIST)
    .u8(0).u16(1).u16(0).u16(powerList).u8(RUN_ACTION_LIST);
  recordHole.bytes.set(record.bytes, recordAt);
  const recordAddress = current.flashBase + recordAt;
  current = parse(recordHole.bytes);

  // The state table is not a counted pointer array, so its append is spelled out: three bytes at
  // the end of its entry pointers, then the u16 count at its start.
  const grownStates = stateTable(current);
  if (grownStates === undefined) throw new ComposeError('base slot 13 stopped reading');
  const entryAt = grownStates.start + grownStates.length;
  const entryHole = relocate(current, entryAt, 3);
  entryHole.bytes.set(new Writer(3).u24(recordAddress).bytes, entryAt);
  entryHole.bytes.set(new Writer(2).u16(grownStates.count + 1).bytes, grownStates.start);
  const variable = grownStates.count;
  current = parse(entryHole.bytes);

  // The name tree node: `<label>_Power_2` at level 1, indexed by the new variable, appended to the
  // frame and the frame's own length grown to say so. The tree is host side, base slots 0 and 1,
  // so the order of its nodes is a reader's question and every reader here goes by the index.
  const treeSection = current.sections[archSlot(c.architecture, 0)];
  if (treeSection === undefined || current.frameLength === undefined) {
    throw new ComposeError('the container has no name tree to put the label in');
  }
  const treeStart = current.blobOffsetOf(treeSection.address);
  if (treeStart === undefined) throw new ComposeError('the name tree is outside the container');
  const name = `${device.label}_Power_2`;
  const nodeLength = 3 + 4 + name.length;
  const nodeAt = treeStart + current.frameLength;
  const nodeHole = relocate(current, nodeAt, nodeLength);
  const node = new Writer(nodeLength).u8(0xa7).u16(4 + name.length).u16(1).u16(variable);
  node.ascii(name);
  nodeHole.bytes.set(node.bytes, nodeAt);
  nodeHole.bytes.set(new Writer(3).u24(current.frameLength + nodeLength).bytes, treeStart + 2);

  return {
    bytes: restamped(nodeHole.bytes),
    group: group.group,
    lists: device.commands.map((_, k) => firstList + k),
    variable,
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
const MENU_ROW_PITCH = 54;
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
 * A page's rows sit on the lowest scans, the page flip on the next one up, and the last two are the
 * screen's edges. So the row count is the area count minus three, and this table is that spelled
 * out rather than computed, since the order is what a match needs.
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
/** The tagged list opcode a page flip rides on, through base slot 14, section 39. */
const PAGE_FLIP_OPCODE = 0x72;

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
  const isRow = (index: number): boolean => {
    const list = lists[index];
    if (list === undefined || list.length !== 3 || list[0]?.opcode !== 0x75
        || list[1]?.opcode !== ENTER_MODE || marker === undefined) return false;
    const end = (list as readonly Instruction[])[2] as Instruction;
    return end.opcode === marker.opcode && end.operand === marker.operand;
  };
  const records = modeRecords(c) ?? [];
  let deepest = 0;
  const reached = records.map((record) => {
    const modes = new Set<number>();
    for (const page of record.pages) {
      const list = taggedList(c, page.list);
      for (const entry of list?.entries ?? []) {
        if (entry.opcode === RUN_ACTION_LIST && isRow(entry.operand)) {
          modes.add((lists[entry.operand]?.[1] as Instruction).operand);
        }
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
  let lead = hits.records.findIndex((page) => page.areas.length === wanted.length
    && wanted.every(([code, want], k) => page.areas[k]?.code === code
      && sameRectangle(page.areas[k] as TouchArea, want)));
  if (lead < 0) {
    // None with this geometry, so one is composed: the table gains a pointer first, at an existing
    // page, so the census knows the slot; then the areas and the header go in after the last hit
    // page, each area ending in its own address; then the pointer is swapped in place.
    lead = hits.records.length;
    // Not `appendTableEntries`: that helper wants the slot's whole extent to be the table, and
    // here the section's extent runs on past the pointers, so the table is grown off what
    // `touchPages` read instead, a byte of count and three per page.
    const tableAt = hits.start + hits.length;
    const grownTable = relocate(current, tableAt, 3);
    grownTable.bytes.set(new Writer(3).u24(full.address).bytes, tableAt);
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
  }

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
    .u8(0x80 | MENU_ROW_SCAN).u16(rowList).u8(RUN_ACTION_LIST)
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
  return parse(placed.blob);
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
}

export function composeDeviceScreen(
  c: Container, label: string, rows: readonly ComposeRow[], options: ComposeScreenOptions = {},
): ComposedScreen {
  if (c.architecture !== 12) {
    throw new ComposeError('the screen half is composed for the Harmony One alone');
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
  // by every menu, the way the corpus shares its page flip list.
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
    listBytes.u8(0x80 | (DEVICE_PAGE_SCANS[k] as number)).u16(row.list).u8(RUN_ACTION_LIST);
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

  // 6. One row on each menu's last page: the flip entry moves from the two row layout's bottom to
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
    // The list and its copy, the same edit twice: retag the flip from scan 50 to scan 51, append
    // the row on scan 50, bump the count. The copy grows first, because it sits below the
    // original and growing it moves the original.
    // The flip is the one entry on scan 50, whatever it runs: nine menus bind the bare page flip
    // opcode there and one wraps it in a beeping action list, so the retag keys on the scan and
    // not on the opcode, and a page with no single scan 50 entry is refused as a layout this does
    // not know.
    const flips = list.entries.filter((entry) => entry.tag === (0x80 | 50)).length;
    if (flips !== 1) {
      throw new ComposeError(`a menu page binds scan 50 ${flips} times, not the one flip expected`);
    }
    const entries = list.entries.length;
    const grow = (listStart: number): void => {
      const at = listStart + 1 + 4 * entries;
      const hole = relocate(current, at, 4);
      hole.bytes.set(new Writer(4).u8(0x80 | 50).u16(rowList).u8(RUN_ACTION_LIST).bytes, at);
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
