/**
 * Adding a mode, base slot 6, with its pages: the one step every screen composer of every family shares,
 * decision 17, so the order that keeps the container parseable through it is written once. Moved out of
 * the four slot family's `devicescreen.ts`, where it was `appendArch14Mode`, when the Harmony One's
 * activity screens came to be built rather than copied, `todo-compile-one.md` 1.2.11.2.
 *
 * What differs between the families is data the caller passes: the Harmony One's page record opens with a
 * byte naming its hit page, the lead, which the Harmony 600, 650 and 700 have no use for, and the Harmony
 * One's pages call a chrome program the mode carries once, where a four slot page draws its chrome itself.
 */
import { Writer } from '../container/emit.ts';
import { type Container, parse } from '../container/gspm.ts';
import { relocate } from '../edit/relocate.ts';
import {
  type ModeRecord, modePages, modeRecords, modeTable, pageListCopies, taggedList, taggedListPools,
} from '../container/sections.ts';
import { ComposeError } from './core.ts';

/** A program of the mode's, sized before the block is placed and built once its addresses are known. */
export interface ModeProgram {
  length: number;
  build: (shifted: (address: number) => number) => Uint8Array;
}

/** What a mode's block carries besides its own list: the pages' programs, and a program they call. */
export interface ModeBlock {
  /**
   * A program the pages call, placed after the mode's own list and before the pages' programs, at the
   * address `programsFor` is given: the Harmony One's chrome. Omitted, a page draws everything itself.
   */
  head?: ModeProgram;
  pages: ModeProgram[];
}

export interface AppendModeOptions {
  /**
   * The pool copies, page for page, where they are not the lists' own bytes: a copy that binds row lists
   * of its own, as the compiler's do, differs from its page's list in its operands only, section 69.
   * Omitted, each copy is its page's list byte for byte.
   */
  copies?: readonly Uint8Array[];
  /**
   * Per page, the hit page its record names in a lead byte, which makes the record seven bytes rather than
   * six: the Harmony One's, whose pages are touched, section 275. Omitted, the record has no lead.
   */
  leads?: readonly number[];
}

/**
 * Add mode `mode` to a configuration, with `own` as its tagged list and one page per entry of `lists`.
 *
 * 1. the mode table gains an entry, on a placeholder until the block exists;
 * 2. each page's list, its copy at the end of the last pool and itself at the end of the page lists,
 *    in page order, because the copies pair with the pages by position, section 69; one hole each
 *    for all the copies and all the lists, since a list nothing names yet is invisible to the walks
 *    that find the ends, and a second insertion then lands in front of the first;
 * 3. the block, where the mode entries end: the mode's own tagged list, the head program if any, then
 *    per page its program and its page record, then the entry. Its own addresses are final, and the
 *    ones a program copies are shifted by its length the way the census would shift them, since the
 *    census cannot see bytes not yet written. `programsFor` is called after step 2, with the container
 *    as it then is and the address the head program will have, so a template read inside it is not stale;
 * 4. the swap: the table's last pointer from the placeholder to the entry.
 */
export function appendMode(
  start: Container, mode: number, own: readonly { tag: number; operand: number; opcode: number }[],
  lists: readonly Uint8Array[], programsFor: (current: Container, headAt: number) => ModeBlock | ModeProgram[],
  options: AppendModeOptions = {},
): Container {
  const copies = options.copies ?? lists;
  let current = start;
  const stale = modeTable(current);
  if (stale === undefined) throw new ComposeError('base slot 6 stopped reading');
  if (stale.addresses.length !== mode) {
    throw new ComposeError(`the new mode would be ${stale.addresses.length}, not the ${mode} expected`);
  }
  if (copies.length !== lists.length || copies.some((one, k) => one.length !== (lists[k] as Uint8Array).length)) {
    throw new ComposeError('a page list and its copy differ in length');
  }
  if (options.leads !== undefined && options.leads.length !== lists.length) {
    throw new ComposeError(`${options.leads.length} hit pages for ${lists.length} pages`);
  }
  const placeholderEntry = stale.addresses[0];
  if (placeholderEntry === undefined) throw new ComposeError('a config with no modes has no menus');
  const tableAt = stale.start + stale.length;
  const tableHole = relocate(current, tableAt, 3);
  tableHole.bytes.set(new Writer(3).u24(placeholderEntry).bytes, tableAt);
  tableHole.bytes.set(new Writer(3).u24(mode + 1).bytes, stale.start);
  current = parse(tableHole.bytes);

  const joined = (parts: readonly Uint8Array[]): Uint8Array => {
    const out = new Uint8Array(parts.reduce((sum, bytes) => sum + bytes.length, 0));
    parts.reduce((offset, bytes) => { out.set(bytes, offset); return offset + bytes.length; }, 0);
    return out;
  };
  const allLists = joined(lists);
  const allCopies = joined(copies);
  const lastPool = taggedListPools(current).at(-1);
  if (lastPool === undefined) throw new ComposeError('no copy pool to extend');
  const copyHole = relocate(current, lastPool.end, allCopies.length);
  copyHole.bytes.set(allCopies, lastPool.end);
  current = parse(copyHole.bytes);
  const listAt = Math.max(...modePages(current).map((page) => {
    const off = current.blobOffsetOf(page.list);
    const list = taggedList(current, page.list);
    return off === undefined || list === undefined ? 0 : off + list.length;
  }));
  const listHole = relocate(current, listAt, allLists.length);
  listHole.bytes.set(allLists, listAt);
  current = parse(listHole.bytes);
  const pageListAddresses: number[] = [];
  lists.reduce((offset, bytes) => {
    pageListAddresses.push(current.flashBase + offset);
    return offset + bytes.length;
  }, listAt);

  const records = modeRecords(current);
  if (records === undefined) throw new ComposeError('base slot 6 does not read');
  const blockAt = Math.max(...records.map((record) => {
    const off = current.blobOffsetOf(record.address);
    return off === undefined ? 0 : off + record.entryLength;
  }));
  const base = current.flashBase + blockAt;
  const ownLength = 1 + 4 * own.length;
  const given = programsFor(current, base + ownLength);
  const block: ModeBlock = Array.isArray(given) ? { pages: given } : given;
  const programs = block.pages;
  if (programs.length !== lists.length) {
    throw new ComposeError(`${programs.length} programs for ${lists.length} pages`);
  }
  const pageRecord = options.leads === undefined ? 6 : 7;
  const headLength = block.head?.length ?? 0;
  const blockLength = ownLength + headLength + programs.reduce((sum, one) => sum + one.length + pageRecord, 0)
    + 6 + 3 * programs.length;
  const shifted = (address: number): number => (address >= base ? address + blockLength : address);
  const out = new Writer(blockLength);
  out.u8(own.length);
  for (const entry of own) out.u8(entry.tag).u16(entry.operand).u8(entry.opcode);
  if (block.head !== undefined) {
    const bytes = block.head.build(shifted);
    if (bytes.length !== block.head.length) {
      throw new ComposeError(`the head program came to ${bytes.length} bytes against ${block.head.length}`);
    }
    out.raw(bytes);
  }
  const pageAddresses: number[] = [];
  let at = base + ownLength + headLength;
  programs.forEach((program, p) => {
    const programAddress = at;
    const bytes = program.build(shifted);
    if (bytes.length !== program.length) {
      throw new ComposeError(`page ${p}'s program came to ${bytes.length} bytes against ${program.length}`);
    }
    out.raw(bytes);
    at += program.length;
    pageAddresses.push(at);
    if (options.leads !== undefined) out.u8(options.leads[p] as number);
    out.u24(shifted(pageListAddresses[p] as number)).u24(programAddress);
    at += pageRecord;
  });
  const entryAddress = at;
  out.u8(0).u24(base).u16(programs.length);
  pageAddresses.forEach((address) => out.u24(address));
  if (out.bytes.length !== blockLength) {
    throw new ComposeError(`the block came to ${out.bytes.length} bytes against the ${blockLength} its hole has`);
  }
  const blockHole = relocate(current, blockAt, blockLength);
  blockHole.bytes.set(out.bytes, blockAt);

  const swapped = parse(blockHole.bytes);
  const grownTable = modeTable(swapped);
  if (grownTable === undefined) throw new ComposeError('base slot 6 stopped reading');
  swapped.blob.set(new Writer(3).u24(entryAddress).bytes, grownTable.start + 3 + 3 * mode);
  return parse(swapped.blob);
}

/**
 * Add one page at the end of mode `mode`, which exists and has a page already: the order that keeps the container
 * parseable through it, which every family that opens a page on a menu shares. Cut out of the four slot family's
 * `openFourSlotMenuPage`, steps 1 to 5 unchanged, when the side keys family needed the same steps for the Harmony
 * 880 and 885's device list, `todo-compile-885.md` 2.1; what each family builds around it, which list a page binds
 * and what its program draws, stays the family's.
 *
 * 1. the pool copy, `copy`, right after the copy of the mode's last page, since copies pair with the pages by
 *    position, section 69;
 * 2. the page's own list, `list`, at the end of the run every page list lives in. Nothing names it until the page
 *    record exists, so its address is carried by arithmetic through the next two insertions;
 * 3. the entry: its page count one higher, and a pointer at the last page until the new record exists;
 * 4. the block, the program and then the page record, at the entry's own offset, which is right after the last
 *    page's record on every mode it has been run on, arch 8 and arch 14, and is refused otherwise. The program is
 *    asked for now, `programFor`, from the container as it is, so no address it embeds is stale; its `build` is
 *    given the shift the block's own insertion makes, as `appendMode`'s are;
 * 5. the swap: the entry's last pointer from the placeholder to the new page record.
 *
 * The page record is six bytes, the list and the program: the Harmony One's seven, with a hit page in front, is
 * refused rather than half built, since no family adds a page to one of its modes this way.
 */
export function appendModePage(
  start: Container, mode: number, list: Uint8Array, copy: Uint8Array,
  programFor: (current: Container) => ModeProgram,
): Container {
  let current = start;
  const recordOf = (): ModeRecord => {
    const record = modeRecords(current)?.[mode];
    if (record === undefined) throw new ComposeError(`mode ${mode} stopped reading`);
    return record;
  };
  if (list.length !== copy.length) throw new ComposeError('a page list and its copy differ in length');
  const before = recordOf();
  const last = before.pages.at(-1);
  if (last === undefined) throw new ComposeError(`mode ${mode} has no page to add one after`);
  if (last.length !== 6) {
    throw new ComposeError(`mode ${mode}'s page records are ${last.length} bytes, and this adds six byte ones only`);
  }

  // 1. The pool copy, right after the copy of the mode's last page.
  const lastIndex = modePages(current).findIndex((one) => one.address === last.address);
  const copyOff = pageListCopies(current)[lastIndex];
  const copyLength = copyOff === undefined ? undefined : taggedList(current, copyOff + current.flashBase)?.length;
  if (copyOff === undefined || copyLength === undefined) {
    throw new ComposeError(`mode ${mode}'s last page has no pool copy`);
  }
  const copyHole = relocate(current, copyOff + copyLength, copy.length);
  copyHole.bytes.set(copy, copyOff + copyLength);
  current = parse(copyHole.bytes);

  // 2. The page's own list, at the end of the run every page list lives in.
  const listAt = Math.max(...modePages(current).map((page) => {
    const off = current.blobOffsetOf(page.list);
    const one = taggedList(current, page.list);
    return off === undefined || one === undefined ? 0 : off + one.length;
  }));
  const listHole = relocate(current, listAt, list.length);
  listHole.bytes.set(list, listAt);
  current = parse(listHole.bytes);

  // 3. The entry: its count, and a pointer at the last page until the new record exists.
  const grownRecord = recordOf();
  const entryOff = current.blobOffsetOf(grownRecord.address);
  const lastNow = grownRecord.pages.at(-1);
  if (entryOff === undefined || lastNow === undefined) throw new ComposeError(`mode ${mode}'s entry moved out of reach`);
  const slotAt = entryOff + 6 + 3 * grownRecord.pageCount;
  let pageListOff = listAt + (listAt >= slotAt ? 3 : 0);
  const entryHole = relocate(current, slotAt, 3);
  entryHole.bytes.set(new Writer(3).u24(lastNow.address).bytes, slotAt);
  entryHole.bytes.set(new Writer(2).u16(grownRecord.pageCount + 1).bytes, entryOff + 4);
  current = parse(entryHole.bytes);

  // 4. The block: the program, then the page record, at the entry's own offset.
  const record = recordOf();
  const lastReal = record.pages[record.pageCount - 2];
  const blockAt = current.blobOffsetOf(record.address);
  const lastRealOff = lastReal === undefined ? undefined : current.blobOffsetOf(lastReal.address);
  if (lastReal === undefined || blockAt === undefined || lastRealOff === undefined) {
    throw new ComposeError(`mode ${mode}'s pages moved out of reach`);
  }
  if (lastRealOff + lastReal.length !== blockAt) {
    throw new ComposeError(`mode ${mode}'s last page record does not end where its entry begins`);
  }
  const program = programFor(current);
  const pageRecordLength = 6;
  const blockLength = program.length + pageRecordLength;
  const base = current.flashBase + blockAt;
  const shifted = (address: number): number => (address >= base ? address + blockLength : address);
  pageListOff += pageListOff >= blockAt ? blockLength : 0;
  const block = new Writer(blockLength);
  const bytes = program.build(shifted);
  if (bytes.length !== program.length) {
    throw new ComposeError(`the new page's program came to ${bytes.length} bytes against ${program.length}`);
  }
  block.raw(bytes);
  // The page record: the list, which step 2 placed and this block's insertion moves by `blockLength` when it lies
  // above, then the program, which is the block's own first byte.
  block.u24(current.flashBase + pageListOff).u24(base);
  if (block.bytes.length !== blockLength) {
    throw new ComposeError(`the new page came to ${block.bytes.length} bytes against ${blockLength}`);
  }
  const blockHole = relocate(current, blockAt, blockLength);
  blockHole.bytes.set(block.bytes, blockAt);

  // 5. The swap: the entry's last pointer from the placeholder to the new page record.
  const placed = parse(blockHole.bytes);
  const swapRecord = modeRecords(placed)?.[mode];
  const swapOff = swapRecord === undefined ? undefined : placed.blobOffsetOf(swapRecord.address);
  if (swapRecord === undefined || swapOff === undefined) throw new ComposeError(`mode ${mode}'s entry moved out of reach`);
  placed.blob.set(new Writer(3).u24(base + program.length).bytes, swapOff + 6 + 3 * (swapRecord.pageCount - 1));
  return parse(placed.blob);
}
