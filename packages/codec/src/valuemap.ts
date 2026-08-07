/**
 * Base slot 14, the state value map, ported from `src/harmony/gspm.py`.
 *
 * For each record, a map from a state variable's value to a flash address, which the firmware
 * hands to the screen language. `docs/findings.md` section 39.
 *
 * Ported ahead of its own turn because `screenProgramRoots` needs it: every target of a lookup
 * here is a program entry point, and a coverage walk that missed them would understate the screen
 * language rather than fail.
 */
import { Container, GspmError, archSlot } from './gspm.ts';
import { u16, u24, u8, uint } from './bytes.ts';

export const VALUE_MAP_SLOT = 14;
/** The record's count field. Two bytes on arch 14, one on the rest. */
export const VALUE_MAP_COUNT_WIDTH: Readonly<Record<number, number>> = { 8: 1, 9: 1, 12: 1, 14: 2 };
export const VALUE_MAP_KEY_WIDTH = 2;
export const VALUE_MAP_RANGE_BYTES = 7;

export interface ValueMap {
  address: number;
  /** `[value, flash address]`, walked in order and stopping at the first match. */
  entries: [number, number][];
  /** `[low, high, flash address]`, inclusive bounds, tried when no entry matched. */
  ranges: [number, number, number][];
  /** Bytes the record occupies. Records can overlap: the generator shares tails. */
  length: number;
}

/**
 * A section read as a count of `width` bytes followed by that many three byte pointers.
 *
 * `pointerArray` will not serve here. It accepts a section only when the array accounts for the
 * whole of it, and slots 9, 14 and 16 are each followed by the records they point at, so the
 * array is a header rather than the section.
 */
export function countedPointers(
  c: Container,
  slot: number,
  width: number,
): { values: number[]; start: number; length: number } | undefined {
  const section = c.sections[slot];
  if (section === undefined || section.isNull || c.blob.length === 0) return undefined;
  const off = c.blobOffsetOf(section.address);
  if (off === undefined || off + width > c.blob.length) return undefined;
  const count = uint(c.blob, off, width);
  const end = off + width + 3 * count;
  if (end > c.blob.length) return undefined;
  const values: number[] = [];
  for (let k = 0; k < count; k += 1) values.push(u24(c.blob, off + width + 3 * k));
  return { values, start: off, length: width + 3 * count };
}

/**
 * Every base slot 14 record.
 *
 * ```
 * +0x00  u8   ignored          the firmware steps over it; 2 in every record in the corpus
 * +0x01  count                 u16 on arch 14, u8 on arch 8, 9 and 12
 * +...   { u16 value; u24 address }[count]
 * +...   u8   count of the range table
 * +...   { u16 low; u16 high; u24 address }[count]
 * ```
 *
 * A few addresses point into the middle of a longer record rather than to a record of its own,
 * which is the generator sharing tails, so two records can overlap by design.
 */
export function valueMaps(c: Container): ValueMap[] | undefined {
  if (c.architecture === undefined) return undefined;
  const counter = VALUE_MAP_COUNT_WIDTH[c.architecture];
  if (counter === undefined) return undefined;
  let slot: number;
  try {
    slot = archSlot(c.architecture, VALUE_MAP_SLOT);
  } catch (error) {
    if (error instanceof GspmError) return undefined;
    throw error;
  }
  if (slot >= c.sections.length) return undefined;
  const header = countedPointers(c, slot, 1);
  if (header === undefined) return undefined;

  const stride = VALUE_MAP_KEY_WIDTH + 3;
  const out: ValueMap[] = [];
  for (const address of header.values) {
    const off = c.blobOffsetOf(address);
    if (off === undefined || off + 1 + counter > c.blob.length) return undefined;
    const count = uint(c.blob, off + 1, counter);
    const base = off + 1 + counter;
    if (base + stride * count >= c.blob.length) return undefined;

    const entries: [number, number][] = [];
    for (let k = 0; k < count; k += 1) {
      const p = base + stride * k;
      entries.push([u16(c.blob, p), u24(c.blob, p + 2)]);
    }

    const spans = base + stride * count;
    const spanCount = u8(c.blob, spans);
    if (spans + 1 + VALUE_MAP_RANGE_BYTES * spanCount > c.blob.length) return undefined;
    const ranges: [number, number, number][] = [];
    for (let k = 0; k < spanCount; k += 1) {
      const p = spans + 1 + VALUE_MAP_RANGE_BYTES * k;
      ranges.push([u16(c.blob, p), u16(c.blob, p + 2), u24(c.blob, p + 4)]);
    }

    out.push({
      address,
      entries,
      ranges,
      length: 2 + counter + stride * count + VALUE_MAP_RANGE_BYTES * spanCount,
    });
  }
  return out;
}
