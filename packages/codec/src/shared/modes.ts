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
import { Writer } from '../emit.ts';
import { type Container, parse } from '../gspm.ts';
import { relocate } from '../relocate.ts';
import { modePages, modeRecords, modeTable, taggedList, taggedListPools } from '../sections.ts';
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
