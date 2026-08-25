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
 * gap beyond 32767 microseconds is spelled as several words: the corpus convention is maximal words
 * first and the remainder last, and reading it back merges to the same train whatever the split.
 *
 * Read only towards hardware, like `relocate.ts`: the result is bytes in memory.
 */
import { Container, TRAILER_CHECKSUM_OFFSET, archSlot, parse, trailerChecksum } from './gspm.ts';
import {
  STATE_RECORD_HEADER,
  STATE_TABLE_SLOT,
  STATE_VALUE_LENGTH,
  stateTable,
} from './sections.ts';
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
 * Maximal words first and the remainder last, which is the corpus's own spelling of a long gap. The
 * remainder can be zero when the duration is an exact multiple, and a zero word would terminate the
 * block, so the split keeps every word nonzero by moving one microsecond where it has to.
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
      once: irBuildBlock(blockWordsOf(once)),
      ...(held === undefined ? {} : { held: irBuildBlock(blockWordsOf(held)) }),
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
   * The word the config knows the appliance by, ASCII with no underscore, because a state
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
  const recordAt = states.start;
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
