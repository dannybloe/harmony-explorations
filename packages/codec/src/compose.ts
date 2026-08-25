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
  const middle = parse(first.bytes);
  const grown = middle.pointerArrayAt(slot);
  if (grown === undefined) throw new ComposeError('the group table stopped reading after the hole');
  const entryAt = grown.start + grown.length;
  const second = relocate(middle, entryAt, 3);
  second.bytes.set(new Writer(3).u24(base + arrayAt).bytes, entryAt);
  const count = new Writer(grown.width).bytes;
  if (grown.width === 1) count[0] = grown.values.length + 1;
  else { count[0] = (grown.values.length + 1) & 0xff; count[1] = (grown.values.length + 1) >>> 8; }
  second.bytes.set(count, grown.start);

  // The relocations stamped their checksums over filler, and everything written since sat inside
  // it, so the container's one integrity field is recomputed last, over the finished bytes.
  second.bytes.set(new Writer(2).u16(trailerChecksum(second.bytes)).bytes,
                   second.bytes.length - TRAILER_CHECKSUM_OFFSET);

  return { bytes: second.bytes, group: grown.values.length, records: commands.length };
}
