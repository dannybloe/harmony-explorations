/**
 * Three more sections, each a count prefixed pointer array over fixed size records, ported from
 * `src/harmony/gspm.py` for milestone M2: the timer table (base slot 12), the parameter block (15)
 * and the touch screen hit map (17).
 *
 * They are grouped because they share the property that makes them safe to claim: a record's size
 * is stated by the format, not inferred from the distance to the next one. That is what base slot
 * 5's records lack, which is why the accounting claims these and not those.
 *
 * Base slot 16, the number sender, is not here. Every config in the corpus carries a count of zero
 * for it, so a port would add no bytes and would be exercised by nothing.
 */
import { Container, GspmError, archSlot } from './gspm.ts';
import { u16, u24, u8 } from './bytes.ts';
import { countedPointers } from './valuemap.ts';

export const TIMER_SLOT = 12;
export const TIMER_RECORD_LENGTH = 7;
export const PARAMETER_SLOT = 15;
export const TOUCH_MAP_SLOT = 17;
export const TOUCH_AREA_LENGTH = 12;
/** The firmware runs at most this many timers at once, however many the config describes. */
export const TIMER_SLOTS_IN_RAM = 4;
export const TIMER_KIND_SCHEDULED = 0x01;

function slotOf(c: Container, base: number): number | undefined {
  if (c.architecture === undefined) return undefined;
  try {
    return archSlot(c.architecture, base);
  } catch (error) {
    if (error instanceof GspmError) return undefined;
    throw error;
  }
}

export interface Timer {
  address: number;
  kind: number;
  /** Seconds, for the scheduled kind. Clamped to sixteen bits by the firmware, with no error. */
  duration: number;
  /** The single action list instruction queued when it expires. Not a list: one instruction. */
  instruction: { opcode: number; operand: number };
}

export interface Table<T> {
  records: T[];
  /** The section's own pointer array, for the accounting. */
  start: number;
  length: number;
}

/**
 * Base slot 12: `u8 count` then `u24 address[count]`, and at each address
 * `{ u8 kind; u24 duration; u24 instruction }`.
 */
export function timers(c: Container): Table<Timer> | undefined {
  const slot = slotOf(c, TIMER_SLOT);
  if (slot === undefined) return undefined;
  const table = countedPointers(c, slot, 1);
  if (table === undefined) return undefined;
  const records: Timer[] = [];
  for (const address of table.values) {
    const off = c.blobOffsetOf(address);
    if (off === undefined || off + TIMER_RECORD_LENGTH > c.blob.length) return undefined;
    records.push({
      address,
      kind: u8(c.blob, off),
      duration: u24(c.blob, off + 1),
      instruction: { operand: u16(c.blob, off + 4), opcode: u8(c.blob, off + 6) },
    });
  }
  return { records, start: table.start, length: table.length };
}

export interface ParameterGroup {
  address: number;
  values: number[];
  /** `1 + 2 * values.length`, stated by the group's own entry count. */
  length: number;
}

/**
 * Base slot 15: one of the six recognised pointer arrays, over `{ u8 entries; u16 value[] }`.
 *
 * The firmware demands the section's count and every group's length, and silently substitutes
 * compiled in defaults for a group whose length differs, so neither is cosmetic.
 */
export function parameterGroups(c: Container): ParameterGroup[] | undefined {
  const slot = slotOf(c, PARAMETER_SLOT);
  if (slot === undefined || slot >= c.sections.length) return undefined;
  const section = c.sections[slot];
  if (section === undefined || section.isNull) return undefined;
  const addresses = c.pointerArray(slot);
  if (addresses === undefined) return undefined;
  const out: ParameterGroup[] = [];
  for (const address of addresses) {
    const off = c.blobOffsetOf(address);
    if (off === undefined || off >= c.blob.length) return undefined;
    const entries = u8(c.blob, off);
    if (off + 1 + 2 * entries > c.blob.length) return undefined;
    const values: number[] = [];
    for (let i = 0; i < entries; i += 1) values.push(u16(c.blob, off + 1 + 2 * i));
    out.push({ address, values, length: 1 + 2 * entries });
  }
  return out;
}

export interface TouchArea {
  x: number;
  width: number;
  y: number;
  height: number;
  /** The key code a hit reports. */
  code: number;
  /** The record's own address, which is what makes the twelve byte reading self checking. */
  self: number;
  address: number;
}

export interface TouchPage {
  address: number;
  areas: TouchArea[];
  /** The page's own `u8 count` plus its pointers. */
  start: number;
  length: number;
}

/**
 * Base slot 17: `u8 pages`, `u24 page[]`, each page `u8 areas`, `u24 area[]`, each area twelve
 * bytes of `{ u16 x; u16 width; u16 y; u16 height; u8 code; u24 self }`.
 *
 * Populated only on arch 12, and the firmware answers a touch with the **first** rectangle the
 * point falls in, so a page's order is data rather than presentation.
 */
export function touchPages(c: Container): Table<TouchPage> | undefined {
  const slot = slotOf(c, TOUCH_MAP_SLOT);
  if (slot === undefined) return undefined;
  const table = countedPointers(c, slot, 1);
  if (table === undefined) return undefined;
  const pages: TouchPage[] = [];
  for (const address of table.values) {
    const off = c.blobOffsetOf(address);
    if (off === undefined || off >= c.blob.length) return undefined;
    const count = u8(c.blob, off);
    if (off + 1 + 3 * count > c.blob.length) return undefined;
    const areas: TouchArea[] = [];
    for (let k = 0; k < count; k += 1) {
      const at = u24(c.blob, off + 1 + 3 * k);
      const p = c.blobOffsetOf(at);
      if (p === undefined || p + TOUCH_AREA_LENGTH > c.blob.length) return undefined;
      areas.push({
        x: u16(c.blob, p),
        width: u16(c.blob, p + 2),
        y: u16(c.blob, p + 4),
        height: u16(c.blob, p + 6),
        code: u8(c.blob, p + 8),
        self: u24(c.blob, p + 9),
        address: at,
      });
    }
    pages.push({ address, areas, start: off, length: 1 + 3 * count });
  }
  return { records: pages, start: table.start, length: table.length };
}
