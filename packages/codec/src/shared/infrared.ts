/**
 * The infrared half of composing a device, shared by every family that stores its codes as base slot 5
 * records, plan 007. Until that plan it opened `compose.ts`, and it reads as it did:
 *
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
// **The opcodes come from the one place each is named**, and until 6 September 2026 this file had
// its own `SEND_INFRARED` and its own `RUN_ACTION_LIST` beside the copies in `inventory.ts` and
// `sections.ts`. All correct, none able to see the others: the state `isa.py`'s docstring forbids.
// Plan 007 removed the screen opcodes `compose.ts` still spelled and the seven private copies of
// `0x7E` across the codec, which `inventory.ts` names as `ENTER_MODE` now.
import { joinedGaps } from '../archive.ts';
import { u24 } from '../bytes.ts';
import { Writer } from '../emit.ts';
import { archSlot, Container, parse } from '../gspm.ts';
import {
  IR_CLASS_STREAM, IR_POINTERS_PER_GROUP, IR_PULSE_MAX, IR_TABLE_SLOT, irBuildBlock, irBuildRecord, type IrPulse,
} from '../ir.ts';
import { type Pulse } from '../irframe.ts';
import { relocate } from '../relocate.ts';
import { ComposeError, restamped } from '../shared/core.ts';
import {
  blockOfStatedCode, longPressBlockOfStatedCode, statedCode, type StatedCode, statedProtocol,
} from '../stated.ts';

/** One command to put on the new device, as the catalogue spells it. */
export interface ComposeCommand {
  /** The code, whole: `G:Toshiba 32 Bit:(0x20DF10EF)(Repeat)():3`. */
  readonly stated: string;
  /**
   * `stated` as its family's definition reads it, `statedCodeOfDefinition` in `archive.ts`, where the
   * caller has the archive; absent, `stated` is read at the widths its family's name spells. Section 359.
   *
   * **The name is not enough to read a code**, section 231: the number before `Bit` is the digit count on
   * some families whose cell carries more than one bit and neither count on as many, and several names state
   * no width at all, so a code
   * the name cannot read is one the table's block and the held power step cannot be built for either. The
   * catalogue composer passes this for every command, so the record is built from one reading of the
   * string, the one `make prontocheck` holds against the archive's renderings.
   */
  readonly read?: StatedCode;
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
  /**
   * The press's blocks where the caller derived them at the device's count, sections 348 and 350: `once`
   * is the record's first block without its lead in and `held` the second.
   *
   * **The table cannot hold these because the count is the device's and not the family's.** A whole block
   * is the family's shape plus how many repetitions a press sends, and for the families whose definition
   * states no count the compiler takes it from the device, so one family has as many blocks as its
   * devices have counts. `catalogueCommandBlocks` in `composecatalogue.ts` derives them from the
   * family's definition at the device's count, where the table holds no block for the family and where
   * its block was measured on a device stating another count; a caller without the archive leaves this
   * out and gets the table's block, or a refusal where it has none. **Given, they win over the table's
   * block**, which until section 350 won over them: a table block carries the count of the one device it
   * was measured on, so where the caller has derived another one the table's is the wrong one.
   */
  readonly blocks?: StatedBlocks;
  /**
   * The same command with its toggle bit flipped, which becomes the record's **second pointer group**,
   * todo-process-logitech 2.5: `read` and `blocks` as above, for the flipped code, composed the same way as
   * the command itself, so the second group is the first group's derivation applied to other frames.
   *
   * **Why a record carries the code twice.** A toggle family's code holds one bit that must change on every
   * press so an appliance can tell a second press from a held key, and the remote has no arithmetic to
   * change it. So Logitech's compiler writes two groups, the code as stated and the code flipped, on every
   * record of every toggle family in every compile in the lab, and the firmware alternates between them per
   * device. `withToggleFlipped` in `archive.ts` carries the measurement. Absent for a code with no toggle bit.
   */
  readonly toggled?: ToggledCode;
}

/** A press's blocks as pulses, derived outside the rhythm table, `ComposeCommand.blocks`. */
export interface StatedBlocks {
  readonly once: readonly Pulse[];
  /** Absent for a command that repeats nothing while held. */
  readonly held?: readonly Pulse[];
  /**
   * What the key sends when it comes up, the code's third group: the record's **third** pointer, which the
   * firmware plays at the end whether the key was held or not, section 127. Logitech's compiler puts a
   * code's release group there, todo-process-logitech 2.5, section 365: the PlayStation 3's `StopSpacer`, a
   * six second silence, on the Harmony One, 650 and 700, and `Microsoft 36 Bit`'s constant release on the
   * contributed Harmony 880 or 885 configurations, the two distinct tails in the lab. Absent for a code
   * naming no release group.
   */
  readonly release?: readonly Pulse[];
}

/** A command's code with its toggle bit flipped, `ComposeCommand.toggled`. */
export interface ToggledCode {
  readonly read: StatedCode;
  readonly blocks?: StatedBlocks;
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
  /** `stated` as its family's definition reads it, `ComposeCommand.read`. */
  readonly read?: StatedCode;
  readonly holdMs?: number;
  /** The press's blocks where the rhythm table has none for its family, `ComposeCommand.blocks`. */
  readonly blocks?: StatedBlocks;
  /** The code with its toggle bit flipped, the record's second group, `ComposeCommand.toggled`. */
  readonly toggled?: ToggledCode;
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
export function compiledBlockWords(
  pulses: readonly Pulse[], leadInUs = 0,
  // **A release block is spelt without the carved microsecond**, todo-process-logitech 2.5: every record
  // tail of every configuration in the lab ends on its gap or a mark, never on the one microsecond word.
  options: { readonly carve?: boolean } = {},
): IrPulse[] {
  // **A silence handed over in chunks is spelt whole**, section 359: Logitech's definition route states a
  // gap longer than a word as chunks of one word each, `joinedGaps` in `archive.ts`, and the rule below
  // can only be applied to a silence it sees whole. Spelt chunk by chunk, `Microsoft 30 Bit`'s 68643 was
  // 32767, 32767 and 3109 where Logitech writes 32767, 17938 and 17938.
  const joined = joinedGaps(pulses);
  const led = leadInUs > 0 ? [{ mark: false, us: leadInUs }, ...joined] : joined;
  const words: IrPulse[] = [];
  // The trailing gap gives up its last microsecond first, then the rest is spelled like any silence.
  const lastAt = led.length - 1;
  const carved = options.carve !== false && lastAt >= 0 && !led[lastAt]!.mark && led[lastAt]!.us >= 2;
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

  // Every command's blocks, derived and refused early: composing half a device helps nobody. A record is
  // one pointer group per reading of the code: the code as stated and, where it toggles, the code with its
  // toggle bit flipped, todo-process-logitech 2.5, both built by the steps below so they cannot drift apart.
  type BuiltGroup = { once: Uint8Array; held?: Uint8Array; release?: Uint8Array };
  const groupOf = (command: ComposeCommand, read: StatedCode, given: StatedBlocks | undefined): BuiltGroup => {
    if (command.holdMs !== undefined) {
      if (command.held === true || (command.leadInUs ?? 0) !== 0) {
        throw new ComposeError('a held power step has no held block and no lead in');
      }
      // A held step is cut from the press, section 309, and no compile here holds a held step of a code
      // naming a release group, so where its release would go is not seen.
      if (given?.release !== undefined) {
        throw new ComposeError(`${command.stated} names a release group, and no compile shows a held power step of one`);
      }
      const block = longPressBlockOfStatedCode(read, command.holdMs, undefined, given?.once);
      if (block === undefined) {
        throw new ComposeError(`${command.stated} cannot be composed held for ${command.holdMs} ms: `
          + 'its family has no measured press block or stated segment lengths, or the hold is shorter than a press');
      }
      return { once: irBuildBlock(compiledBlockWords(block)) };
    }
    // The caller's blocks, derived at the device's count, where it gives them, sections 348 and 350;
    // the table's block otherwise, whose count is the one device's it was measured on.
    const once = given === undefined ? blockOfStatedCode(read, undefined, 'once') : [...given.once];
    if (once === undefined || once.length === 0) {
      throw new ComposeError(`${read.family} has no measured whole block, so nothing can be sent`);
    }
    const givenHeld = given?.held === undefined || given.held.length === 0 ? undefined : [...given.held];
    const held = command.held === false ? undefined
      : given !== undefined ? givenHeld : blockOfStatedCode(read, undefined, 'held');
    if (command.held === true && held === undefined) {
      throw new ComposeError(`${read.family} has no measured held block and one was demanded`);
    }
    // The release goes behind the third pointer, todo-process-logitech 2.5, spelt as any trailing block is.
    const release = given?.release === undefined || given.release.length === 0 ? undefined : [...given.release];
    return {
      once: irBuildBlock(compiledBlockWords(once, command.leadInUs ?? COMPILED_LEAD_IN_US)),
      ...(held === undefined ? {} : { held: irBuildBlock(compiledBlockWords(held)) }),
      ...(release === undefined ? {} : { release: irBuildBlock(compiledBlockWords(release, 0, { carve: false })) }),
    };
  };
  const built: { periodNs: number; groups: BuiltGroup[] }[] = [];
  for (const command of commands) {
    // The caller's reading where it gives one, which is the definition's, section 359.
    const read = command.read ?? statedCode(command.stated);
    if (read === undefined) throw new ComposeError(`not a catalogue code: ${command.stated}`);
    const entry = statedProtocol(read.family);
    if (entry === undefined) {
      throw new ComposeError(`no measured rhythm for ${read.family}, so nothing can be sent`);
    }
    const toggled = command.toggled;
    built.push({
      periodNs: entry.periodNs,
      groups: [
        groupOf(command, read, command.blocks),
        ...(toggled === undefined ? [] : [groupOf(command, toggled.read, toggled.blocks)]),
      ],
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
    groups: one.groups.map((group) => ({
      once: place(group.once),
      held: group.held === undefined ? undefined : place(group.held),
      release: group.release === undefined ? undefined : place(group.release),
    })),
  }));
  const blocksSize = cursor;
  // A header is twelve bytes and nine per pointer group, so a toggling code's record is nine longer.
  const recordSizes = laid.map((one) => 12 + 3 * IR_POINTERS_PER_GROUP * one.groups.length);
  const recordAt = recordSizes.map((_, k) => blocksSize + recordSizes.slice(0, k).reduce((a, b) => a + b, 0));
  const arrayAt = blocksSize + recordSizes.reduce((a, b) => a + b, 0);
  const holeSize = arrayAt + 3 + 3 * commands.length;

  // The hole goes exactly where the group arrays end and the section begins, so the new group sits
  // where every existing one does, immediately below the table.
  const at = table.start;
  const first = relocate(c, at, holeSize);
  const base = c.flashBase + at;
  const array = new Writer(3 + 3 * commands.length).u8(0).u16(commands.length);
  laid.forEach((one, k) => {
    const start = base + recordAt[k]!;
    const record = irBuildRecord({
      periodNs: one.periodNs,
      start,
      encoding: IR_CLASS_STREAM,
      // Once, held and tail per group, section 127; the tail is the release where the code names one.
      pointers: one.groups.flatMap((group) => [
        base + group.once,
        group.held === undefined ? 0 : base + group.held,
        group.release === undefined ? 0 : base + group.release,
      ]),
    });
    first.bytes.set(record.bytes, at + recordAt[k]!);
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
