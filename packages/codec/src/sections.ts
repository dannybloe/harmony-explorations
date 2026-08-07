/**
 * The tabular sections, ported from `src/harmony/gspm.py` for milestone M2.
 *
 * Five slots whose shape is a header and a run of fixed size records: the firmware event map
 * (base slot 4), the mode table (6), the binding table (9), the state variable table (13) and the
 * tagged lists that 6 and 9 both point at. None of them is large, but every one of them states its
 * own length, so each is a claim the byte accounting can make exactly rather than by inference.
 *
 * The reason they are worth porting as a group is that they share one hazard: **a section's size
 * is not the gap to the next pointer.** Base slot 4 is 125 bytes and the gap after it runs to 1532,
 * because base slot 5's arrays are laid out inside it. `docs/findings.md` section 36.
 */
import { Container, GspmError, archSlot } from './gspm.ts';
import { u16, u24, u8 } from './bytes.ts';

export const EVENT_MAP_SLOT = 4;
export const MODE_TABLE_SLOT = 6;
export const HANDLER_TABLE_SLOT = 9;
export const STATE_TABLE_SLOT = 13;
/** The firmware runs this tag on the entry being left and `..._ENTER` on the one being entered. */
export const MODE_TAG_LEAVE = 7;
export const MODE_TAG_ENTER = 6;
/**
 * Architectures where a mode record carries a screen program immediately after its tagged list.
 *
 * Every record does on these two, 237 of 237 on the Harmony 600, 374 of 374 on the 700 and 103 of
 * 103 on arch 8. On arch 12 not one does and on arch 9 only 43 of 114, so what follows the list
 * there is a different thing and is not established. `docs/findings.md` section 53.
 */
export const MODE_PROGRAM_ARCHITECTURES: ReadonlySet<number> = new Set([8, 14]);
export const HANDLER_TAG_ENTER = 1;
export const HANDLER_TAG_LEAVE = 2;

/** The blob offset of a section's own address, or undefined when the slot is absent or NULL. */
function sectionStart(c: Container, base: number): number | undefined {
  if (c.architecture === undefined) return undefined;
  let slot: number;
  try {
    slot = archSlot(c.architecture, base);
  } catch (error) {
    if (error instanceof GspmError) return undefined;
    throw error;
  }
  const section = c.sections[slot];
  if (section === undefined || section.isNull) return undefined;
  return c.blobOffsetOf(section.address);
}

export interface EventMap {
  /** What the firmware uses when no key matches. */
  fallback: number;
  entries: Map<number, number>;
  /** The whole section, so the byte accounting needs no second copy of the layout. */
  length: number;
}

/**
 * Base slot 4: what each of the thirty firmware events maps to.
 *
 * ```
 * +0x00  u24  fallback
 * +0x03  u16  count
 * +0x05  { u8 key; u24 value }[count]
 * ```
 *
 * The value goes where opcode `0x7E`'s operand goes, which is what names the section.
 */
export function eventMap(c: Container): EventMap | undefined {
  const off = sectionStart(c, EVENT_MAP_SLOT);
  if (off === undefined || off + 5 > c.blob.length) return undefined;
  const count = u16(c.blob, off + 3);
  const length = 5 + 4 * count;
  if (off + length > c.blob.length) return undefined;
  const entries = new Map<number, number>();
  for (let k = 0; k < count; k += 1) {
    const p = off + 5 + 4 * k;
    entries.set(u8(c.blob, p), u24(c.blob, p + 1));
  }
  return { fallback: u24(c.blob, off), entries, length };
}

export interface CountedSection {
  addresses: number[];
  /** Where the section starts in the blob, and how long its own table is. */
  start: number;
  length: number;
}

/**
 * Base slot 6: the address of every mode the remote can switch between.
 *
 * ```
 * +0x00  u24  count
 * +0x03  u24  address[count]
 * ```
 *
 * A `u24` count, not the `u8` or `u16` the six recognised pointer arrays use, which is why
 * `pointerArray` does not pick this slot up. The entries are not laid out after the table, so the
 * section is `3 + 3 * count` bytes and no more.
 */
export function modeTable(c: Container): CountedSection | undefined {
  const off = sectionStart(c, MODE_TABLE_SLOT);
  if (off === undefined || off + 3 > c.blob.length) return undefined;
  const count = u24(c.blob, off);
  const length = 3 + 3 * count;
  if (off + length > c.blob.length) return undefined;
  const addresses: number[] = [];
  for (let p = off + 3; p < off + length; p += 3) addresses.push(u24(c.blob, p));
  return { addresses, start: off, length };
}

/**
 * Base slot 9: the address of each tagged handler set, `u8 count` then `u24 address[count]`.
 *
 * Each address is a tagged list in the encoding base slot 6's mode entries use, so `taggedList`
 * reads both. `docs/findings.md` section 39.
 */
export function handlerSets(c: Container): CountedSection | undefined {
  const off = sectionStart(c, HANDLER_TABLE_SLOT);
  if (off === undefined || off + 1 > c.blob.length) return undefined;
  const count = u8(c.blob, off);
  const length = 1 + 3 * count;
  if (off + length > c.blob.length) return undefined;
  const addresses: number[] = [];
  for (let p = off + 1; p < off + length; p += 3) addresses.push(u24(c.blob, p));
  return { addresses, start: off, length };
}

export interface StateTable {
  count: number;
  /** Variables stored as one byte, indices 0 to `narrow - 1`. */
  narrow: number;
  /** Variables stored as two bytes, indices `narrow` to `count - 1`. */
  wide: number;
  /** The header repeats `narrow`; why is not established. */
  narrowAgain: number;
  entries: number[];
  start: number;
  length: number;
}

/**
 * Base slot 13: how many state variables there are and how wide each one is.
 *
 * ```
 * +0x00  u16  count
 * +0x02  u16  narrow
 * +0x04  u16  wide
 * +0x06  u16  narrow, again
 * +0x08  u24  entry[count]
 * ```
 *
 * The split is what the firmware's lookup uses: an index below `narrow` reads one byte and an
 * index at or above it reads two, so the width belongs to the index and not to the value.
 */
export function stateTable(c: Container): StateTable | undefined {
  const off = sectionStart(c, STATE_TABLE_SLOT);
  if (off === undefined || off + 8 > c.blob.length) return undefined;
  const count = u16(c.blob, off);
  const length = 8 + 3 * count;
  if (off + length > c.blob.length) return undefined;
  const entries: number[] = [];
  for (let p = off + 8; p < off + length; p += 3) entries.push(u24(c.blob, p));
  return {
    count,
    narrow: u16(c.blob, off + 2),
    wide: u16(c.blob, off + 4),
    narrowAgain: u16(c.blob, off + 6),
    entries,
    start: off,
    length,
  };
}

export interface ModeRecord {
  /** What base slot 6's array holds: a byte inside the record, not its start. */
  address: number;
  /** Where the record actually begins, read from the `u24` beside the pointer. */
  start: number;
  kind: number;
  entries: TaggedEntry[];
  /** The tagged list only: `1 + 4 * entries`. The rest of the record is not decoded. */
  length: number;
}

/**
 * Base slot 6's entries, located the way the firmware locates them.
 *
 * **The pointer does not land on the entry.** It lands inside the record, on a discriminator byte
 * with a `u24` back pointer to the record's start immediately after, which is the shape base slot
 * 5's infrared records have. The tagged list is at the **start**.
 *
 * Reading it at the pointer instead is what made every mode look like the wide form with counts
 * running to 255: the byte there is usually zero, and so is the wide form's marker.
 * `docs/findings.md` section 52.
 */
export function modeRecords(c: Container): ModeRecord[] | undefined {
  const table = modeTable(c);
  if (table === undefined) return undefined;
  const out: ModeRecord[] = [];
  for (const address of table.addresses) {
    const off = c.blobOffsetOf(address);
    if (off === undefined || off + 4 > c.blob.length) return undefined;
    const start = u24(c.blob, off + 1);
    const startOff = c.blobOffsetOf(start);
    if (startOff === undefined || startOff >= off) return undefined;
    const list = taggedList(c, start);
    if (list === undefined) return undefined;
    out.push({ address, start, kind: u8(c.blob, off), entries: list.entries, length: list.length });
  }
  return out;
}

/**
 * The screen program each base slot 6 record carries after its tagged list, or nothing off
 * `MODE_PROGRAM_ARCHITECTURES`.
 *
 * The third source of screen programs section 40 suspected and could not place. The address is the
 * record's own start plus the length of its list, so it needs section 52's correction to the
 * record start before it can be computed at all.
 */
export function modeProgramRoots(c: Container): number[] {
  if (c.architecture === undefined || !MODE_PROGRAM_ARCHITECTURES.has(c.architecture)) return [];
  return (modeRecords(c) ?? []).map((record) => record.start + record.length);
}

export interface TaggedEntry {
  tag: number;
  operand: number;
  opcode: number;
  /** Only the second form carries one. */
  flags: number | undefined;
}

export interface TaggedList {
  entries: TaggedEntry[];
  start: number;
  length: number;
}

/**
 * The tagged list at an absolute flash address, in either of its two forms.
 *
 * ```
 * +0x00  u8   count
 * +0x01  { u8 tag; u16 operand; u8 opcode }[count]
 * ```
 *
 * and, when that count is zero, a second count follows and the entries carry a flags byte:
 *
 * ```
 * +0x00  u8   0
 * +0x01  u8   count
 * +0x02  { u8 flags; u8 tag; u16 operand; u8 opcode }[count]
 * ```
 *
 * Which form applies is decided by the first byte, exactly as the firmware decides it, rather than
 * by anything about the caller.
 */
export function taggedList(c: Container, address: number): TaggedList | undefined {
  const off = c.blobOffsetOf(address);
  if (off === undefined || off >= c.blob.length) return undefined;
  const first = u8(c.blob, off);
  const wide = first === 0;
  if (wide && off + 2 > c.blob.length) return undefined;
  const count = wide ? u8(c.blob, off + 1) : first;
  const base = wide ? off + 2 : off + 1;
  const stride = wide ? 5 : 4;
  const length = base - off + stride * count;
  if (off + length > c.blob.length) return undefined;
  const entries: TaggedEntry[] = [];
  for (let k = 0; k < count; k += 1) {
    const p = base + stride * k;
    // The last three bytes of an entry are an action list instruction, laid out the same way
    // whichever form the list takes, which is why the offset is measured from the end.
    const at = p + stride - 3;
    entries.push({
      flags: wide ? u8(c.blob, p) : undefined,
      tag: wide ? u8(c.blob, p + 1) : u8(c.blob, p),
      operand: u16(c.blob, at),
      opcode: u8(c.blob, at + 2),
    });
  }
  return { entries, start: off, length };
}
