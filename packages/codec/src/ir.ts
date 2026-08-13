/**
 * The infrared database, base slot 5, ported from `src/harmony/gspm.py` for milestone M2.
 *
 * Two levels of count prefixed pointer array over records of mark and space durations in
 * microseconds. `docs/findings.md` sections 32 and 42.
 *
 * **A record's extent is stated, and this module used to say the opposite.** The paragraph here read
 * "a record's extent is not established and this module does not invent one", and justified locating
 * the durations as the longest strictly alternating run from a fixed offset. Sections 61, 75 and 127
 * settled it: the pointer lands seven bytes into the record, the header is `12 + 9 * count`, and each
 * group's three pointers name blocks that sit **below** the header. So a record's durations are
 * `irBlockWords` of the blocks it names, and nothing here has to search for them.
 *
 * The heuristic was not merely superseded, it was wrong, and it was wrong on every record: measured
 * on 13 August 2026, none of 748 records across arch 8 (Harmony 880), arch 12 (Harmony One) and arch
 * 14 (Harmony 600) had its located run inside a block the record itself names, and 713 of them landed
 * inside a **neighbouring** record's block. It stayed invisible because records in one device group
 * usually share a protocol, so a bit count taken from the neighbour is usually the right bit count.
 * `irPulses` and this module's `irFrame` are gone; `irframe.ts` is the frame decoder and `index.ts`
 * exports it now, which it did not while a wrong function of the same name was exported from here.
 */
import { Container, GspmError, archSlot } from './gspm.ts';
import type { Instruction } from './gspm.ts';
import { u16, u24, u8 } from './bytes.ts';

export const IR_TABLE_SLOT = 5;
export const IR_POINTER_LENGTH = 3;
/** Bytes from a record's start to the byte its pointer lands on, seven in all 2858 records. */
export const IR_RECORD_POINTER_BIAS = 7;
export const IR_CLASS_STREAM = 1;
/**
 * The class the arch 9 sample reads in all 200 of its records, and the only class in the corpus
 * that is not 1. It shares the header, section 65: the class byte at +7, the record's own start at
 * +8, two backward pointers at +12 and +15 and a NULL at +18, all 200 of 200.
 *
 * **What its pointers name is a body, not a duration stream**, section 82. The body indexes a
 * shared table of small pulse blocks, so the durations are one level further down and reused
 * between codes. `irClass5Body`, `irSymbolTable` and `irSymbolBlock` are that level; this used to
 * say "what it means is not established and needs a firmware nobody here has", and the firmware
 * arrived on 8 August 2026.
 */
export const IR_CLASS_ARCH9 = 5;
export const IR_HEADER_CLASSES: ReadonlySet<number> = new Set([IR_CLASS_STREAM, IR_CLASS_ARCH9]);
/**
 * The fixed part of a record header, before the pointer groups.
 *
 * Section 61 read the header as a flat 21 bytes with two block pointers and a NULL. That is the
 * `count == 1` case and it is every record on arch 12, arch 14 and arch 9, which is why it held.
 */
export const IR_HEADER_BASE = 12;
/** One group: three `u24` block pointers, any of which may be NULL. */
export const IR_HEADER_GROUP = 9;
export const IR_POINTERS_PER_GROUP = 3;
/**
 * Header byte `+11`: how many nine byte pointer groups follow, so the header is `12 + 9 * count`.
 *
 * It is 1 in every record on arch 12, arch 14 and arch 9. On arch 8 it is 2 in 37 records of every
 * config, and that one number explains three separate holes in the accounting at once: 37 headers
 * were claimed nine bytes short, 37 blocks went unclaimed, and the 37 gaps in between were the
 * second group. `docs/findings.md` section 75.
 */
export const IR_GROUP_COUNT_AT = 11;
/** The `count == 1` header, which is every record outside arch 8. Kept for callers that assume it. */
export const IR_HEADER_LENGTH = IR_HEADER_BASE + IR_HEADER_GROUP;
export const IR_BLOCK_POINTERS = [12, 15];
export const IR_BLOCK_TERMINATOR = 0;
/** Bounds the walk so a record of an undecoded class runs off the end rather than to the end. */
export const IR_BLOCK_LIMIT = 8192;

/** The data blocks one record names, NULLs dropped. Callers must deduplicate: blocks are shared. */
export function irRecordBlocks(c: Container, address: number): number[] {
  const start = irRecordStart(c, address);
  const off = start === undefined ? undefined : c.blobOffsetOf(start);
  if (off === undefined) return [];
  const groups = irGroupCount(c, address);
  if (off + IR_HEADER_BASE + IR_HEADER_GROUP * groups > c.blob.length) return [];
  const found: number[] = [];
  for (let group = 0; group < groups; group += 1) {
    for (let slot = 0; slot < IR_POINTERS_PER_GROUP; slot += 1) {
      const value = u24(c.blob, off + IR_HEADER_BASE + IR_HEADER_GROUP * group + 3 * slot);
      if (value !== 0) found.push(value);
    }
  }
  return found;
}

/**
 * The same pointers with their positions kept, NULLs included.
 *
 * `irRecordBlocks` drops the NULLs, which is what a reader wants and the opposite of what a writer
 * wants: a slot's index inside its group is part of the record, so an emitter that skipped the
 * empty ones would shuffle the rest up.
 */
export function irHeaderPointers(c: Container, address: number): number[] {
  const start = irRecordStart(c, address);
  const off = start === undefined ? undefined : c.blobOffsetOf(start);
  if (off === undefined) return [];
  const groups = irGroupCount(c, address);
  if (off + IR_HEADER_BASE + IR_HEADER_GROUP * groups > c.blob.length) return [];
  const found: number[] = [];
  for (let group = 0; group < groups; group += 1) {
    for (let slot = 0; slot < IR_POINTERS_PER_GROUP; slot += 1) {
      found.push(u24(c.blob, off + IR_HEADER_BASE + IR_HEADER_GROUP * group + 3 * slot));
    }
  }
  return found;
}

/**
 * How many pointer groups the record at `address` carries. One when the header is unreadable.
 *
 * Clamped rather than trusted: a count of zero would make the header claim less than its fixed
 * part, and a wild one would run the pointer walk off the end of a neighbouring record.
 */
export function irGroupCount(c: Container, address: number): number {
  const start = irRecordStart(c, address);
  const off = start === undefined ? undefined : c.blobOffsetOf(start);
  if (off === undefined || off + IR_HEADER_BASE >= c.blob.length) return 1;
  const stated = c.blob[off + IR_GROUP_COUNT_AT] ?? 0;
  if (stated < 1 || stated > IR_MAX_GROUPS) return 1;
  return stated;
}

/** The header's own length, `12 + 9 * count`. */
export function irHeaderLength(c: Container, address: number): number {
  return IR_HEADER_BASE + IR_HEADER_GROUP * irGroupCount(c, address);
}

/**
 * A block's length from its terminating zero word, or undefined when it does not close.
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

/**
 * The words of a duration block, its terminating zero included.
 *
 * A block is a list of `u16` durations with bit 15 marking a mark rather than a space, section 61,
 * so this is the whole of it: reading it gives the words back and writing them gives the bytes
 * back. Unlike a glyph or an encoded picture, nothing about the encoding is a choice, which is why
 * an emitter can rebuild one from fields and cannot rebuild those.
 */
export function irBlockWords(c: Container, address: number): number[] | undefined {
  const off = c.blobOffsetOf(address);
  const length = irBlockLength(c, address);
  if (off === undefined || length === undefined) return undefined;
  const words: number[] = [];
  for (let at = off; at < off + length; at += 2) words.push(u16(c.blob, at));
  return words;
}

/** The slots of a record's pointer group, by what the firmware does with each. Section 127. */
export const IR_BLOCK_ONCE = 0;
export const IR_BLOCK_HELD = 1;
export const IR_BLOCK_TAIL = 2;

/**
 * How long a block takes to send, in microseconds: its durations summed.
 *
 * Marks and spaces both count, since bit 15 says which a word is and not how long. The terminating
 * zero adds nothing, so it is left in.
 */
export function irBlockDuration(c: Container, address: number): number | undefined {
  const words = irBlockWords(c, address);
  if (words === undefined) return undefined;
  return words.reduce((sum, word) => sum + (word & IR_PULSE_MAX), 0);
}

/**
 * The block a record repeats while the key stays down, or undefined where it has none.
 *
 * **Read from the firmware**, section 127. A pointer group holds three addresses and the sender
 * walks them, sampling the keypad's sense lines at the end of every block:
 *
 * | at the end of | key up | key down |
 * |---|---|---|
 * | slot 0 | skip to slot 2 | go to slot 1 |
 * | slot 1 | go to slot 2 | **replay slot 1** |
 * | slot 2 | stop | stop |
 *
 * So slot 0 is what a tap sends, slot 1 is sent **only** while the key is held and then repeats for
 * as long as it is, and slot 2 is a tail that plays either way. The same three states and the same
 * skip counts are in the Harmony One image at `0x29B9C` and the Harmony 700's at `0x182A0`, with the
 * hold flag `0x6AB` bit 2 and `0x08A` bit 3 respectively.
 */
export function irRepeatBlock(c: Container, record: number): number | undefined {
  const pointers = irHeaderPointers(c, record);
  const held = pointers[IR_BLOCK_HELD];
  return held === undefined || held === 0 ? undefined : held;
}

/**
 * How often a held key repeats, as the period in microseconds, or undefined for a code that does not
 * repeat.
 *
 * **This is the number a user feels.** The firmware replays the whole block and samples the keypad
 * only at its end, so the interval between two sends is exactly the block's own duration, frame plus
 * whatever gap the block ends with. Over the thirteen containers with an infrared table it runs from
 * 76.6 ms to 752.4 ms, with 1077 of 1315 repeating codes between 60 and 120 ms.
 *
 * Those figures replace "30.8 ms to 1150.7 ms with 1373 of 1913 repeating codes", which were measured
 * with the class 5 records in, before the gate below existed: 307 arch 9 (Harmony 525) records were
 * answering with the duration of bytes that are not a duration stream at all, and the 30.8 ms was one
 * of them. So the range was contaminated by exactly the records the gate now excludes.
 *
 * So slowing a key down means lengthening this block's trailing gap, and it is per code. A gap word
 * carries at most 32767 us, section 61, which is why a long gap is already several words in the
 * corpus: a same length edit can only reach the ceiling of the words that are there.
 */
export function irRepeatPeriod(c: Container, record: number): number | undefined {
  // **Class 1 only, and this gate was missing.** On arch 9 (Harmony 525) a header pointer names a
  // class 5 body rather than a duration stream, section 82, so walking it as durations answered with
  // a number for 109 of 200 records of `h525_config` and 36 of 107 of `h525_config_2`, one of them
  // 30.8 ms. `packages/bench` prints this to the operator as a held key's repeat rate, so the wrong
  // answer was on a screen. `irBlockLength`'s own docstring already said arch 9 blocks find a
  // spurious zero and that callers gate on the class instead; no caller did.
  //
  // The docstring above was contaminated by the same records, and its figures are remeasured with
  // this gate in place rather than adjusted.
  if (irClass(c, record) !== IR_CLASS_STREAM) return undefined;
  const block = irRepeatBlock(c, record);
  return block === undefined ? undefined : irBlockDuration(c, block);
}

/**
 * Class 5's record body, which the header's pointers name where class 1's name a duration stream.
 *
 * ```
 * +0x00  u24  symbol table address
 * +0x03  u16  n, the bytes of index stream that follow
 * +0x05  u8   index[n], zero based into the symbol table
 * ```
 *
 * So the body is `5 + n` bytes and it does not carry a single duration itself: it spells a code as
 * a sequence of symbols, and a symbol is a small pulse block that several codes reuse. That is why
 * section 65 could not find a terminator, why the count is at neither header pointer, and why the
 * area was the last remainder in the byte accounting. `docs/findings.md` section 82.
 */
export const IR_CLASS5_BODY_HEADER = 5;

export interface IrClass5Body {
  /** Address of the symbol table this body's indices are into. Shared between records. */
  table: number;
  indices: number[];
  /** Blob offset and byte length, so the accounting claims exactly what was read. */
  start: number;
  length: number;
}

/** One class 5 body, from the address a record header's pointer holds. */
export function irClass5Body(c: Container, address: number): IrClass5Body | undefined {
  const start = c.blobOffsetOf(address);
  if (start === undefined || start + IR_CLASS5_BODY_HEADER > c.blob.length) return undefined;
  const table = u24(c.blob, start);
  const n = u16(c.blob, start + 3);
  const length = IR_CLASS5_BODY_HEADER + n;
  if (start + length > c.blob.length) return undefined;
  const indices: number[] = [];
  for (let at = start + IR_CLASS5_BODY_HEADER; at < start + length; at += 1) {
    indices.push(u8(c.blob, at));
  }
  return { table, indices, start, length };
}

export interface IrSymbolTable {
  /** Addresses of the pulse blocks, in the order the indices count them. */
  symbols: number[];
  start: number;
  length: number;
}

/**
 * A symbol table: `u8 n; u24 symbol[n]`, the three byte table the firmware indexes at `0x05108`'s
 * class 5 arm. It sits immediately above the last of its own blocks in all six in the corpus.
 */
export function irSymbolTable(c: Container, address: number): IrSymbolTable | undefined {
  const start = c.blobOffsetOf(address);
  if (start === undefined || start >= c.blob.length) return undefined;
  const count = u8(c.blob, start);
  const length = 1 + IR_POINTER_LENGTH * count;
  if (start + length > c.blob.length) return undefined;
  const symbols: number[] = [];
  for (let at = start + 1; at < start + length; at += IR_POINTER_LENGTH) {
    symbols.push(u24(c.blob, at));
  }
  return { symbols, start, length };
}

export interface IrSymbolBlock {
  /** Durations, bit 15 marking carrier on, the same word format class 1's blocks use. */
  pulses: number[];
  start: number;
  length: number;
}

/**
 * One symbol: `u16 count; u16 pulse[count]; u16 0x0000`, so `4 + 2 * count` bytes.
 *
 * The count is the reason this is not class 1's shape: the arch 9 player at `0x076CE` is handed a
 * length rather than walking to a terminator, which is why a class 1 style walk found a zero word
 * in every arch 9 block and none of them was the end of anything. The trailing zero word is there
 * anyway, in all 50 blocks of the corpus, and it is claimed because the firmware's own count says
 * where the block stops and the word sits inside that.
 */
export function irSymbolBlock(c: Container, address: number): IrSymbolBlock | undefined {
  const start = c.blobOffsetOf(address);
  if (start === undefined || start + 2 > c.blob.length) return undefined;
  const count = u16(c.blob, start);
  const length = 4 + 2 * count;
  if (count > IR_BLOCK_LIMIT || start + length > c.blob.length) return undefined;
  const pulses: number[] = [];
  for (let at = start + 2; at < start + 2 + 2 * count; at += 2) pulses.push(u16(c.blob, at));
  return { pulses, start, length };
}

/**
 * The seven bytes below the class byte: `u8 zero; u24 period; u24 on time`, the carrier.
 *
 * Section 42 read the widths out of the class 1 arm of the record loader, `0x17F32` on the 700, and
 * left the two `u24` values unnamed. They are the infrared carrier: a period and a 50% on time,
 * both in **nanoseconds**. `docs/findings.md` section 92.
 *
 * The unit is not an assumption. `1e9 / period` lands on the standard consumer carriers across the
 * whole corpus, two of them exactly: 25000 is 40.000 kHz and 27777 is 36.000 kHz. The firmware
 * agrees twice over, since it clamps the period at 256000, which is a 3.9 kHz floor under this
 * reading and 39 Hz under any other, and it divides by four and moves the Timer 2 prescaler exactly
 * when the value no longer fits in sixteen bits, which is the arithmetic a period wants and not a
 * duration.
 */
export const IR_CARRIER_AT = 1;
export const IR_CARRIER_ON_AT = 4;
/** The firmware's own ceiling on the period, so the slowest carrier a record may name. */
export const IR_CARRIER_MAX_NS = 256000;

export interface IrCarrier {
  /** Period in nanoseconds, as stored. */
  periodNs: number;
  /** Carrier on time in nanoseconds, `periodNs >> 1` in all 3387 records of the corpus. */
  onNs: number;
  /** The frequency the period states, in hertz. Derived, not stored. */
  hertz: number;
}

/**
 * The carrier one record names, or nothing when the record is unreadable.
 *
 * Both fields are read as `u24` because that is what the firmware reads, even though the high byte
 * is zero in every record here: a carrier slower than 15.3 kHz would set it, and the firmware has a
 * whole prescaler arm for that case, so narrowing this to `u16` would be reading the corpus rather
 * than the format.
 */
export function irCarrier(c: Container, address: number): IrCarrier | undefined {
  const start = irRecordStart(c, address);
  const off = start === undefined ? undefined : c.blobOffsetOf(start);
  if (off === undefined || off + IR_HEADER_BASE > c.blob.length) return undefined;
  const periodNs = u24(c.blob, off + IR_CARRIER_AT);
  const onNs = u24(c.blob, off + IR_CARRIER_ON_AT);
  return { periodNs, onNs, hertz: periodNs === 0 ? 0 : 1e9 / periodNs };
}

/**
 * Build a class 1 duration block from a bare list of pulses, the shape a learn session produces.
 *
 * The point of this function is that it takes **no container**. Everything else in this file reads
 * a config that Logitech's service compiled; this makes the bytes of a code that has never existed,
 * from nothing but timings and a carrier, which is what learning a code means and what
 * `docs/findings.md` section 91 leaves open on the transport side. If it were only reachable
 * through a container it could not answer the question it exists to answer.
 *
 * A duration above `IR_PULSE_MAX` is refused rather than truncated. Fifteen bits is the whole field
 * and the firmware reads the sixteenth as the carrier flag, so a longer gap has to be spelled as
 * several words, which is what the corpus does and what a caller must decide rather than this.
 */
export const IR_PULSE_MARK = 0x8000;
export const IR_PULSE_MAX = 0x7fff;

export class IrEncodeError extends Error {}

/**
 * One mark or space, as the builder takes it and as a block's words spell it.
 *
 * It outlived `IrRun`, which was the located run the removed heuristic returned. A block's durations
 * come back as raw words from `irBlockWords`; this shape exists for the writer, where a caller has
 * timings and no container yet.
 */
export interface IrPulse {
  mark: boolean;
  microseconds: number;
}

export function irBuildBlock(pulses: readonly IrPulse[]): Uint8Array {
  const bytes = new Uint8Array(2 * (pulses.length + 1));
  pulses.forEach((pulse, i) => {
    if (!Number.isInteger(pulse.microseconds) || pulse.microseconds < 0) {
      throw new IrEncodeError(`pulse ${i} is not a whole number of microseconds`);
    }
    if (pulse.microseconds > IR_PULSE_MAX) {
      throw new IrEncodeError(
        `pulse ${i} is ${pulse.microseconds} us, above the ${IR_PULSE_MAX} a word holds`,
      );
    }
    const word = pulse.microseconds | (pulse.mark ? IR_PULSE_MARK : 0);
    bytes[2 * i] = word & 0xff;
    bytes[2 * i + 1] = word >>> 8;
  });
  // The terminating zero word is already there, since the buffer starts zeroed and is one word
  // longer than the pulse list.
  return bytes;
}

/** The period a carrier frequency is stored as: truncated, never rounded. Section 92. */
export function irPeriodFor(hertz: number): number {
  if (!(hertz > 0)) throw new IrEncodeError('a carrier frequency must be positive');
  const periodNs = Math.floor(1e9 / hertz);
  if (periodNs > IR_CARRIER_MAX_NS) {
    throw new IrEncodeError(`${hertz} Hz is slower than the firmware's ${IR_CARRIER_MAX_NS} ns cap`);
  }
  return periodNs;
}

export interface IrRecordFields {
  /** Carrier period in nanoseconds. `irPeriodFor` turns a frequency into one. */
  periodNs: number;
  /** Where this record's own first byte lands. Placement, which the caller decides. */
  start: number;
  /** Block addresses, in slot order, NULLs included. Length must be a multiple of three. */
  pointers: readonly number[];
  /** The byte at `+0`, zero in every record of the corpus. */
  spare?: number;
  encoding?: number;
}

/**
 * Build a class 1 record header from fields.
 *
 * Content and placement are separated deliberately. The carrier and the class come out of what was
 * learned; `start` and `pointers` are addresses, which depend on where everything else in the
 * config ended up, and section 55's rule that a picture's position is implied by everything before
 * it applies here too. So this refuses to invent them.
 */
export function irBuildRecord(fields: IrRecordFields): Uint8Array {
  const { periodNs, start, pointers } = fields;
  if (pointers.length === 0 || pointers.length % IR_POINTERS_PER_GROUP !== 0) {
    throw new IrEncodeError(`${pointers.length} pointers is not a whole number of groups`);
  }
  const groups = pointers.length / IR_POINTERS_PER_GROUP;
  if (groups > 0xff) throw new IrEncodeError(`${groups} groups does not fit the count byte`);
  if (periodNs <= 0 || periodNs > IR_CARRIER_MAX_NS) {
    throw new IrEncodeError(`carrier period ${periodNs} ns is outside the firmware's range`);
  }
  const bytes = new Uint8Array(IR_HEADER_BASE + IR_HEADER_GROUP * groups);
  const put24 = (at: number, value: number): void => {
    bytes[at] = value & 0xff;
    bytes[at + 1] = (value >>> 8) & 0xff;
    bytes[at + 2] = (value >>> 16) & 0xff;
  };
  bytes[0] = fields.spare ?? 0;
  put24(IR_CARRIER_AT, periodNs);
  put24(IR_CARRIER_ON_AT, periodNs >> 1);
  bytes[7] = fields.encoding ?? IR_CLASS_STREAM;
  put24(8, start);
  bytes[IR_GROUP_COUNT_AT] = groups;
  pointers.forEach((pointer, i) => put24(IR_HEADER_BASE + 3 * i, pointer));
  return bytes;
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
