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
 * Every record does on all three: 374 of 374 on the Harmony 700, 237 of 237 on the 600, 103 of 103
 * on arch 8 and 268 of 268 on the Harmony One. Arch 12 looked like the exception until section 54
 * found that the only thing stopping it was opcode 23's missing operand count. Arch 9 still manages
 * only 43 of 114, so there the record's tail is a different thing and is not established.
 * `docs/findings.md` sections 53 and 54.
 */
export const MODE_PROGRAM_ARCHITECTURES: ReadonlySet<number> = new Set([8, 9, 12, 14]);
export const HANDLER_TAG_ENTER = 1;
export const HANDLER_TAG_LEAVE = 2;
/**
 * A page record is `{ u24 list; u24 program }` everywhere except arch 12, which puts one byte
 * in front of it.
 *
 * Read from the consumer rather than from the layout, because the layout cannot tell the two
 * apart: the arch 14 reader at `0x16918` follows the `u24` at page offset 0 and the arch 12 one
 * at `0x28422` follows the `u24` at offset **1**, having read a single byte at offset 0 first
 * (`0x28166`). Nothing in either image reads that byte back, so what it selects is not known.
 * `docs/findings.md` section 66.
 */
export const MODE_PAGE_LEAD_ARCHITECTURES: ReadonlySet<number> = new Set([12]);
/** The two `u24`s a page always carries; the arch 12 lead byte is on top of this. */
export const MODE_PAGE_POINTERS = 6;
/** An entry's fixed head: the kind byte, the record back pointer and the page count. */
export const MODE_ENTRY_HEADER = 6;

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

export const LOG_AREA_SLOT = 2;
/** The capacity field is a `u24` on arch 12, where the section is nine bytes rather than eight. */
export const LOG_AREA_WIDE_ARCHITECTURES: ReadonlySet<number> = new Set([12]);

export interface LogArea {
  capacity: number;
  /** The first byte of the reserved region, and one past its last. */
  start: number;
  limit: number;
  length: number;
}

/**
 * Base slot 2: three numbers reserving flash **above** the config rather than inside it.
 *
 * ```
 * +0x00  u16  capacity        u24 on arch 12, where the section is nine bytes
 * +0x02  u24  start           the first byte of the region
 * +0x05  u24  limit           one past its last byte
 * ```
 *
 * The writer refuses an address outside `[0x040000, 0x400000)` by zeroing the remaining count
 * rather than erroring, which is a rail rather than a curiosity. `docs/findings.md` section 47.
 */
export function logArea(c: Container): LogArea | undefined {
  const off = sectionStart(c, LOG_AREA_SLOT);
  if (off === undefined || c.architecture === undefined) return undefined;
  const wide = LOG_AREA_WIDE_ARCHITECTURES.has(c.architecture);
  const width = wide ? 3 : 2;
  const length = width + 6;
  if (off + length > c.blob.length) return undefined;
  return {
    capacity: wide ? u24(c.blob, off) : u16(c.blob, off),
    start: u24(c.blob, off + width),
    limit: u24(c.blob, off + width + 3),
    length,
  };
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

/** A base slot 13 record: seven byte header then `count` values of eight bytes. */
export const STATE_RECORD_HEADER = 7;
export const STATE_VALUE_LENGTH = 8;

export interface StateRecord {
  address: number;
  count: number;
  length: number;
  /** The `u16` at +0x02, unexplained. */
  second: number;
}

/**
 * The record each base slot 13 pointer lands on, in table order.
 *
 * Nothing in the container declares the length, so `7 + 8 * count` is the reader. The evidence is
 * a config whose contents were chosen deliberately plus a corpus wide check that no record
 * overruns the next: `docs/findings.md` section 60. The eight byte values are not decoded, so
 * this returns their count and not their contents.
 */
export function stateRecords(c: Container): StateRecord[] | undefined {
  const table = stateTable(c);
  if (table === undefined) return undefined;
  const records: StateRecord[] = [];
  for (const address of table.entries) {
    const off = c.blobOffsetOf(address);
    if (off === undefined || off + STATE_RECORD_HEADER > c.blob.length) continue;
    const count = u16(c.blob, off + 4);
    records.push({
      address,
      count,
      second: u16(c.blob, off + 2),
      length: STATE_RECORD_HEADER + STATE_VALUE_LENGTH * count,
    });
  }
  return records;
}

/**
 * One page of a mode: a tagged list of its own and the screen program that draws it.
 *
 * The firmware looks a tag up in `list` first and falls back to the mode record's list when it
 * finds nothing, so a page overrides rather than replaces. `program` goes straight to the screen
 * interpreter, `0x1879C` on arch 14 and `0x295AC` on arch 12.
 */
export interface ModePage {
  /** The page record's own address, as the entry's pointer array holds it. */
  address: number;
  /** The arch 12 byte in front of the two pointers, absent elsewhere. */
  lead: number | undefined;
  /** A tagged list, in the same encoding the mode record's list uses. */
  list: number;
  /** A screen program, stated rather than computed. */
  program: number;
  length: number;
}

export interface ModeRecord {
  /** What base slot 6's array holds: the entry, which is not the record's start. */
  address: number;
  /** Where the record actually begins, read from the `u24` beside the pointer. */
  start: number;
  kind: number;
  entries: TaggedEntry[];
  /** The tagged list only: `1 + 4 * entries`. The rest of the record is not decoded. */
  length: number;
  /** The `u16` at the entry's offset 4, which is how many pages follow it. */
  pageCount: number;
  pages: ModePage[];
  /** The entry itself: `6 + 3 * pageCount`, which is what the byte accounting claims. */
  entryLength: number;
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
 *
 * The entry does not stop at that back pointer. Four bytes further sit a `u16` page count and an
 * array of that many page addresses, which is how the consumer at `0x16816` reads it: it loads a
 * literal 6 into the stride helper's offset register and indexes from there with stride 3.
 * `docs/findings.md` section 66.
 */
export function modeRecords(c: Container): ModeRecord[] | undefined {
  const table = modeTable(c);
  if (table === undefined) return undefined;
  const lead = c.architecture !== undefined && MODE_PAGE_LEAD_ARCHITECTURES.has(c.architecture);
  const pageLength = MODE_PAGE_POINTERS + (lead ? 1 : 0);
  const out: ModeRecord[] = [];
  for (const address of table.addresses) {
    const off = c.blobOffsetOf(address);
    if (off === undefined || off + MODE_ENTRY_HEADER > c.blob.length) return undefined;
    const start = u24(c.blob, off + 1);
    const startOff = c.blobOffsetOf(start);
    if (startOff === undefined || startOff >= off) return undefined;
    const list = taggedList(c, start);
    if (list === undefined) return undefined;
    const pageCount = u16(c.blob, off + 4);
    const entryLength = MODE_ENTRY_HEADER + 3 * pageCount;
    if (off + entryLength > c.blob.length) return undefined;
    const pages: ModePage[] = [];
    for (let k = 0; k < pageCount; k += 1) {
      const page = u24(c.blob, off + MODE_ENTRY_HEADER + 3 * k);
      const pageOff = c.blobOffsetOf(page);
      if (pageOff === undefined || pageOff + pageLength > c.blob.length) return undefined;
      pages.push({
        address: page,
        lead: lead ? u8(c.blob, pageOff) : undefined,
        list: u24(c.blob, pageOff + (lead ? 1 : 0)),
        program: u24(c.blob, pageOff + (lead ? 1 : 0) + 3),
        length: pageLength,
      });
    }
    out.push({
      address,
      start,
      kind: u8(c.blob, off),
      entries: list.entries,
      length: list.length,
      pageCount,
      pages,
      entryLength,
    });
  }
  return out;
}

/** Every page of every mode, flattened, in table order. */
export function modePages(c: Container): ModePage[] {
  return (modeRecords(c) ?? []).flatMap((record) => record.pages);
}

/** One run of tagged lists packed end to end, as blob offsets. */
export interface TaggedListPool {
  start: number;
  end: number;
  lists: { start: number; length: number }[];
}

/**
 * The runs of tagged lists packed end to end, which hold base slot 9's sets among others.
 *
 * **Both ends are derived, and that is the whole difficulty.** The start is a mode entry's end:
 * every one of the 29 runs in the corpus begins on the byte after some entry's page array, which
 * is what makes it a stated position rather than a searched one. The end is the lowest address
 * above that start which any other reader already names, so the walk is bounded by structures
 * rather than by the byte accounting, which would be circular.
 *
 * Section 67 first concluded these were not claimable, on the grounds that section 55's
 * derivation for the picture bank gives 35 to 1275 candidate starts here rather than one. That
 * was measuring the wrong thing: the start does not have to be searched for, because a mode entry
 * states it. The exact landing is then a check on the reading and not the way it was found.
 *
 * A pool run has to contain at least one base slot 9 set, on a list boundary. Without that the
 * rule accepts spans that tile by accident, since a tagged list walk is permissive: two of seven
 * candidate runs on a Harmony One, two of 206 on the 525.
 */
export function taggedListPools(c: Container): TaggedListPool[] {
  const records = modeRecords(c);
  if (records === undefined) return [];
  const offsetOf = (address: number): number | undefined => c.blobOffsetOf(address);
  const inside = (offset: number | undefined): boolean =>
    offset !== undefined && offset >= 0 && offset < c.blob.length;

  // Everything another reader names, which is what bounds a run from above.
  const bounds = new Set<number>();
  const note = (offset: number | undefined): void => {
    if (inside(offset)) bounds.add(offset as number);
  };
  for (const record of records) {
    note(offsetOf(record.start));
    note(offsetOf(record.address));
    for (const page of record.pages) {
      note(offsetOf(page.address));
      note(offsetOf(page.list));
      note(offsetOf(page.program));
    }
  }
  for (const address of modeTable(c)?.addresses ?? []) note(offsetOf(address));
  // Base slots 10 and 11 by base number and never by raw slot: raw slot 10 is base slot 9 on arch
  // 8 and arch 12, and slot 9's sets are *inside* a pool, so bounding with them stops the walk on
  // the very thing the run is meant to contain.
  for (const base of [10, 11]) {
    if (c.architecture === undefined) break;
    let slot: number;
    try {
      slot = archSlot(c.architecture, base);
    } catch (error) {
      if (error instanceof GspmError) continue;
      throw error;
    }
    for (const address of c.pointerArray(slot) ?? []) note(offsetOf(address));
  }
  const ordered = [...bounds].sort((a, b) => a - b);

  const sets = (handlerSets(c)?.addresses ?? [])
    .map(offsetOf)
    .filter((offset): offset is number => offset !== undefined);

  const pools: TaggedListPool[] = [];
  for (const record of records) {
    const entry = offsetOf(record.address);
    if (entry === undefined) continue;
    const start = entry + record.entryLength;
    const end = ordered.find((offset) => offset > start);
    if (end === undefined) continue;
    const lists: { start: number; length: number }[] = [];
    const starts = new Set<number>();
    let at = start;
    while (at < end) {
      const wide = u8(c.blob, at) === 0;
      const count = wide ? u8(c.blob, at + 1) : u8(c.blob, at);
      const length = wide ? 2 + 5 * count : 1 + 4 * count;
      if (length <= 0 || at + length > end) break;
      lists.push({ start: at, length });
      starts.add(at);
      at += length;
    }
    if (at !== end) continue;
    const held = sets.filter((offset) => offset >= start && offset < end);
    if (held.length === 0 || !held.every((offset) => starts.has(offset))) continue;
    pools.push({ start, end, lists });
  }
  return pools;
}

/**
 * The action list language opcode whose operand indexes base slot 10's table.
 *
 * Named here rather than in the opcode inventory because it is the one field a page list and its
 * copy are allowed to disagree on, and a test that hard codes `0x7f` reads like a magic number.
 */
export const ACTION_LIST_INDEX_OPCODE = 0x7f;

/**
 * The second copy of every mode page's tagged list, as blob offsets in page order.
 *
 * The pools of `taggedListPools` hold two kinds of list: base slot 9's sets, which that section's
 * table names, and one list per mode page, which nothing names at all. Strip the sets and what is
 * left is a **copy of each page's own list**, the k-th copy belonging to the k-th page in mode
 * table order. Section 69.
 *
 * The copy is a copy in meaning rather than in bytes. Form, entry count, tags, flags and opcodes
 * all agree, and so does every operand except opcode `0x7F`'s, which is an index into base slot
 * 10: there the two copies name **different table entries holding identical action lists**. So
 * comparing the two runs byte for byte says they differ, which is what section 67 did and why it
 * concluded they were not copies.
 *
 * No firmware path reads them. Both call sites of the tagged list runner that concern a mode read
 * a pointer taken from the current page record or from the mode record, and an exhaustive scan
 * finds fewer three byte values naming a copy than chance predicts. They still have to be
 * reproduced byte for byte by an emitter, which is why this exists.
 */
export function pageListCopies(c: Container): number[] {
  const sets = new Set(
    (handlerSets(c)?.addresses ?? [])
      .map((address) => c.blobOffsetOf(address))
      .filter((offset): offset is number => offset !== undefined),
  );
  const out: number[] = [];
  for (const pool of taggedListPools(c)) {
    for (const list of pool.lists) {
      if (!sets.has(list.start)) out.push(list.start);
    }
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
