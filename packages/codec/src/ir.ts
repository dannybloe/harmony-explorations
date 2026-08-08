/**
 * The infrared database, base slot 5, ported from `src/harmony/gspm.py` for milestone M2.
 *
 * Two levels of count prefixed pointer array over records of mark and space durations in
 * microseconds. `docs/findings.md` sections 32 and 42.
 *
 * **A record's extent is not established and this module does not invent one.** The pointer lands
 * seven bytes into the record, on a class byte the firmware branches on, and the durations are
 * located as the longest strictly alternating run rather than assumed to begin at a fixed offset,
 * because some records carry a prefix of `0x7FFF` words whose count varies. So the accounting
 * claims the arrays and the located run, which are the two things a reader here actually reads.
 */
import { Container, GspmError, archSlot } from './gspm.ts';
import type { Instruction } from './gspm.ts';
import { u16, u24, u8 } from './bytes.ts';

export const IR_TABLE_SLOT = 5;
export const IR_POINTER_LENGTH = 3;
/** Bytes from a record's start to its first duration word. */
export const IR_RECORD_HEADER = 14;
/** Bytes from a record's start to the byte its pointer lands on, seven in all 2858 records. */
export const IR_RECORD_POINTER_BIAS = 7;
/** Shorter than this and the record is not this encoding: the whole arch 9 sample is like that. */
export const IR_MIN_PULSES = 8;
export const IR_CLASS_STREAM = 1;
/**
 * The class the arch 9 sample reads in all 200 of its records, and the only class in the corpus
 * that is not 1. What it means is **not** established and needs a firmware nobody here has. What is
 * established, section 65, is that its records carry the same 21 byte header: the class byte at +7,
 * the record's own start at +8, two backward pointers at +12 and +15 and a NULL at +18, all 200 of
 * 200. So the header is claimable and the blocks are not.
 */
export const IR_CLASS_ARCH9 = 5;
export const IR_HEADER_CLASSES: ReadonlySet<number> = new Set([IR_CLASS_STREAM, IR_CLASS_ARCH9]);
/**
 * The header is 21 bytes and two of its pointers name data blocks that sit **below** it. A block
 * is a run of `u16` durations closed by a zero word; either pointer may be NULL and two records
 * may name the same block. `docs/findings.md` section 61.
 */
export const IR_HEADER_LENGTH = 21;
export const IR_BLOCK_POINTERS = [12, 15];
export const IR_BLOCK_TERMINATOR = 0;
/** Bounds the walk so a record of an undecoded class runs off the end rather than to the end. */
export const IR_BLOCK_LIMIT = 8192;

/** The data blocks one record names, NULLs dropped. Callers must deduplicate: blocks are shared. */
export function irRecordBlocks(c: Container, address: number): number[] {
  const start = irRecordStart(c, address);
  const off = start === undefined ? undefined : c.blobOffsetOf(start);
  if (off === undefined || off + IR_HEADER_LENGTH > c.blob.length) return [];
  const found: number[] = [];
  for (const at of IR_BLOCK_POINTERS) {
    const value = u24(c.blob, off + at);
    if (value !== 0) found.push(value);
  }
  return found;
}

/**
 * A block's length from its own terminator, or undefined when it does not close inside the bound.
 *
 * Not a validity check: arch 9's blocks all find a zero word and none of them is right, so callers
 * gate on the class byte instead. `docs/findings.md` section 61.
 */
export function irBlockLength(c: Container, address: number): number | undefined {
  const off = c.blobOffsetOf(address);
  if (off === undefined) return undefined;
  const limit = Math.min(off + IR_BLOCK_LIMIT, c.blob.length - 1);
  for (let at = off; at < limit; at += 2) {
    if (u16(c.blob, at) === IR_BLOCK_TERMINATOR) return at + 2 - off;
  }
  return undefined;
}

export interface IrGroup {
  addresses: number[];
  /** The group's own array, so the accounting claims exactly what was read. */
  start: number;
  length: number;
}

/**
 * One group per entry of base slot 5, each a second array of the same shape:
 *
 * ```
 * +0x00  u8   zero, the same spare byte the section table carries
 * +0x01  u16  count
 * +0x03  u24  record address[count]
 * ```
 */
export function irGroups(c: Container): IrGroup[] | undefined {
  if (c.architecture === undefined) return undefined;
  let slot: number;
  try {
    slot = archSlot(c.architecture, IR_TABLE_SLOT);
  } catch (error) {
    if (error instanceof GspmError) return undefined;
    throw error;
  }
  const table = slot < c.sections.length ? c.pointerArray(slot) : undefined;
  if (table === undefined) return undefined;
  const out: IrGroup[] = [];
  for (const address of table) {
    const off = c.blobOffsetOf(address);
    if (off === undefined || off + 3 > c.blob.length) return undefined;
    const count = u16(c.blob, off + 1);
    const length = 3 + IR_POINTER_LENGTH * count;
    if (off + length > c.blob.length) return undefined;
    const addresses: number[] = [];
    for (let p = off + 3; p < off + length; p += IR_POINTER_LENGTH) {
      addresses.push(u24(c.blob, p));
    }
    out.push({ addresses, start: off, length });
  }
  return out;
}

/** The class byte, which selects the send routine. The firmware reads this one byte first. */
export function irClass(c: Container, address: number): number | undefined {
  const off = c.blobOffsetOf(address);
  if (off === undefined || off >= c.blob.length) return undefined;
  return u8(c.blob, off);
}

/**
 * Where the record's own data begins, from the pointer three bytes after the class byte.
 *
 * Read rather than computed as `address - IR_RECORD_POINTER_BIAS`: the bias is an observation
 * about the corpus and this is what the firmware follows.
 */
export function irRecordStart(c: Container, address: number): number | undefined {
  const off = c.blobOffsetOf(address);
  if (off === undefined || off + 4 > c.blob.length) return undefined;
  return u24(c.blob, off + 1);
}

/**
 * The whole of base slot 5's record area, as `[first address, one past the last]`.
 *
 * The lowest block pointer any record names, to the end of the highest header. Both pointers point
 * backwards in every record of every container, so the lowest of them is the bottom of the area,
 * and the headers are the top because nothing sits above the last one.
 *
 * On the arch 9 sample the two ends land exactly on the boundaries of the one big region the byte
 * accounting could not attribute, which is what says the area is this and not something that
 * merely overlaps it. Section 65.
 */
export function irRegion(c: Container): [number, number] | undefined {
  const groups = irGroups(c);
  if (groups === undefined || groups.length === 0) return undefined;
  let low: number | undefined;
  let high: number | undefined;
  for (const group of groups) {
    for (const address of group.addresses) {
      const start = irRecordStart(c, address);
      if (start === undefined) return undefined;
      const top = start + IR_HEADER_LENGTH;
      high = high === undefined ? top : Math.max(high, top);
      const blocks = irRecordBlocks(c, address);
      for (const block of blocks.length === 0 ? [start] : blocks) {
        low = low === undefined ? block : Math.min(low, block);
      }
    }
  }
  return low === undefined || high === undefined ? undefined : [low, high];
}

export interface IrPulse {
  mark: boolean;
  microseconds: number;
}

export interface IrRun {
  pulses: IrPulse[];
  /** Blob offset and byte length of the located run, for the accounting. */
  start: number;
  length: number;
}

/**
 * The mark and space run inside one record, as durations in microseconds with bit 15 set on a
 * mark, returned as the longest strictly alternating run found from the record's header offset.
 */
export function irPulses(c: Container, address: number, limit = 1024): IrRun | undefined {
  const at = c.blobOffsetOf(address);
  if (at === undefined) return undefined;
  const from = at + IR_RECORD_HEADER;
  const words: number[] = [];
  for (let o = from; o + 1 < Math.min(from + 2 * limit, c.blob.length); o += 2) {
    words.push(u16(c.blob, o));
  }
  let bestFrom = 0;
  let bestTo = 0;
  let i = 0;
  while (i < words.length) {
    let j = i + 1;
    while (j < words.length && (words[j] as number) >> 15 !== (words[j - 1] as number) >> 15) {
      j += 1;
    }
    if (j - i > bestTo - bestFrom) {
      bestFrom = i;
      bestTo = j;
    }
    i = j;
  }
  const pulses = words.slice(bestFrom, bestTo).map((w) => ({
    mark: w >> 15 === 1,
    microseconds: w & 0x7fff,
  }));
  return { pulses, start: from + 2 * bestFrom, length: 2 * pulses.length };
}

/**
 * One record read as a framed code: header mark, header space, then the bit count.
 *
 * The framing is `header mark, header space, bits * (mark, space), trailing mark, trailing gap`,
 * so a run of `2 * bits + 4` from the first mark. Undefined when the record is not that shape,
 * which includes every record of the arch 9 sample.
 */
export function irFrame(
  c: Container,
  address: number,
): { headerMark: number; headerSpace: number; bits: number } | undefined {
  const run = irPulses(c, address);
  if (run === undefined || run.pulses.length < IR_MIN_PULSES) return undefined;
  const first = run.pulses.findIndex((p) => p.mark);
  if (first < 0) return undefined;
  const rest = run.pulses.length - first - 2;
  if (rest < 4 || rest % 2 !== 0) return undefined;
  return {
    headerMark: (run.pulses[first] as IrPulse).microseconds,
    headerSpace: (run.pulses[first + 1] as IrPulse).microseconds,
    bits: (rest - 2) / 2,
  };
}

/**
 * The action list opcode that carries a per group quantity. Section 70.
 *
 * The companion of `0x7D`, the send: both hand a `{ u8 group; u8 value }` operand to one worker in
 * the infrared sender, and the only difference in the two handlers is that this one sets bit 6 of
 * the group byte first and asks for a different priority.
 */
export const IR_QUANTITY_OPCODE = 0x7c;

/**
 * The largest value one `IR_QUANTITY_OPCODE` instruction may carry.
 *
 * Not a guess from the data: the firmware refuses to fold a new request into a queued one whose
 * value is already this, so a larger quantity has to be spelled as several instructions. The
 * corpus never exceeds it in 21882 uses.
 */
export const IR_QUANTITY_CAP = 100;

/**
 * The bit the handler sets on the group byte, which is what marks the queue entry as a quantity
 * rather than a send. The queue tag is `kind << 4 | group`, so the low nibble bounds a config to
 * sixteen infrared groups.
 */
export const IR_QUANTITY_QUEUE_BIT = 0x40;
export const IR_MAX_GROUPS = 16;

export interface IrQuantity {
  group: number;
  /** The sum of the run, which is what the sender ends up with. */
  amount: number;
  /** How many instructions spell it. */
  instructions: number;
}

/**
 * Read a maximal run of `IR_QUANTITY_OPCODE` starting at `start`, or nothing if there is none.
 *
 * A run is `cap` repeated then a remainder, all naming the same group, and the quantity is their
 * sum. The shape is not inferred from the data: the firmware's fold rule refuses to merge into a
 * queued value of `IR_QUANTITY_CAP`, so each capped instruction lands as its own queue entry and
 * the sender meets them in order. `docs/findings.md` section 70.
 *
 * A run whose leading instructions are not the cap, or which changes group part way, is refused
 * rather than summed: that would be a different structure and summing it would hide the fact.
 */
export function irQuantity(list: readonly Instruction[], start = 0): IrQuantity | undefined {
  const first = list[start];
  if (first === undefined || first.opcode !== IR_QUANTITY_OPCODE) return undefined;
  const group = first.operand >>> 8;

  let end = start;
  while (end < list.length) {
    const here = list[end] as Instruction;
    if (here.opcode !== IR_QUANTITY_OPCODE || here.operand >>> 8 !== group) break;
    end += 1;
  }

  // Every instruction but the last is the cap. The last may be the cap too, which is how a round
  // multiple of it is spelled; what is refused is a cap appearing anywhere earlier than the end.
  for (let k = start; k < end - 1; k += 1) {
    if (((list[k] as Instruction).operand & 0xff) !== IR_QUANTITY_CAP) return undefined;
  }

  let amount = 0;
  for (let k = start; k < end; k += 1) amount += (list[k] as Instruction).operand & 0xff;
  return { group, amount, instructions: end - start };
}

/** Loads the sixteen bit accumulator with its operand. `docs/findings.md` section 34. */
export const ACCUMULATOR_LOAD_OPCODE = 0x7a;

/**
 * Writes the accumulator's device record. Section 71.
 *
 * Never appears alone: every use in the corpus is the second half of
 * `[ACCUMULATOR_LOAD_OPCODE key, DEVICE_ASSIGN_OPCODE value]`, 7552 of 7552.
 */
export const DEVICE_ASSIGN_OPCODE = 0x6c;

/** Bit 15 of the assigned value, which the handler strips into a separate argument. */
export const DEVICE_ASSIGN_FIELD_BIT = 0x8000;

export interface DeviceAssignment {
  /** The accumulator the load put there, which selects the record. One per infrared group. */
  key: number;
  /** Bit 15, which selects which of the record's two fields is written. */
  field: number;
  /** The remaining fifteen bits. */
  value: number;
}

/**
 * Read a `[load, assign]` pair, or nothing if the two instructions are not that pair.
 *
 * The firmware strips bit 15 of the operand into its own argument before storing, which is why
 * this reports `field` and `value` separately rather than handing back the raw operand: the corpus
 * enumerates 0 to 450 for field 0 and 0 to 20 for field 1, per key, and reading them as one number
 * would hide that. What the two fields are is not established. `docs/findings.md` section 71.
 */
export function deviceAssignment(
  list: readonly Instruction[],
  start = 0,
): DeviceAssignment | undefined {
  const load = list[start];
  const assign = list[start + 1];
  if (load?.opcode !== ACCUMULATOR_LOAD_OPCODE) return undefined;
  if (assign?.opcode !== DEVICE_ASSIGN_OPCODE) return undefined;
  return {
    key: load.operand,
    field: (assign.operand & DEVICE_ASSIGN_FIELD_BIT) === 0 ? 0 : 1,
    value: assign.operand & ~DEVICE_ASSIGN_FIELD_BIT & 0xffff,
  };
}

/**
 * Below this the action list dispatcher continues on a byte of the **operand**, so an instruction
 * is a pair rather than one opcode. `docs/findings.md` section 72.
 */
export const SECOND_SPACE_LIMIT = 0x65;

/** Below this the dispatcher returns without doing anything at all. */
export const ACTION_NOOP_LIMIT = 0x07;

/** Where the range boundaries fall, each one `2^n - 1`, highest first. */
export const SECOND_SPACE_RANGES = [0x3f, 0x1f, 0x0f, 0x07] as const;

export interface SubOpcode {
  /** Which byte of the operand carries it. */
  byte: 'high' | 'low';
  value: number;
  /** The other byte, which is the instruction's actual argument. */
  argument: number;
}

/**
 * The sub opcode an instruction below `SECOND_SPACE_LIMIT` carries, or nothing above it.
 *
 * Opcodes from `0x1F` up dispatch on the operand's **high** byte and those below it on the **low**
 * byte, which is read off the two branches of the dispatcher rather than inferred. A no-op returns
 * nothing too, because the firmware never looks at its operand.
 */
export function subOpcode(instruction: Instruction): SubOpcode | undefined {
  const { opcode, operand } = instruction;
  if (opcode >= SECOND_SPACE_LIMIT || opcode < ACTION_NOOP_LIMIT) return undefined;
  return opcode >= 0x1f
    ? { byte: 'high', value: operand >>> 8, argument: operand & 0xff }
    : { byte: 'low', value: operand & 0xff, argument: operand >>> 8 };
}
