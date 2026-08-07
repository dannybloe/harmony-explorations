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
