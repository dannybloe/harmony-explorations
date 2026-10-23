/**
 * Room for a Harmony One menu grown in place: a page added to the end of a mode with its list, its copy and a stand in
 * program, and a tagged list grown to its built length. What a builder needs before `withModeRecords` replaces a
 * menu's pieces with the built ones, since that step replaces records and adds none. The activity menu's,
 * `activitymenu.ts`, `todo-compile-one.md` 4.1, and since 4.3.3 the device lists' too, `devicelists.ts`, which grow
 * the same way and whose pages hold a switch the activity menu's do not, so the stand in program is the caller's.
 *
 * The Harmony One alone, the touch family's: its page records carry a lead byte, section 275.
 */
import { Writer } from '../../emit.ts';
import { type Container, parse } from '../../gspm.ts';
import { relocate } from '../../relocate.ts';
import { SCREEN_CALL, SCREEN_END, screenProgram } from '../../screen.ts';
import { modePages, modeRecords, pageListCopies } from '../../sections.ts';
import { ComposeError } from '../../shared/core.ts';

/** A page record's length on the Harmony One: the lead, the list and the program. */
const PAGE_RECORD = 7;

/** Where an offset lands after `n` bytes are inserted at `at`: an object starting at the hole moves with it. */
const after = (offset: number, at: number, n: number): number => (offset >= at ? offset + n : offset);

/**
 * A stand in for a page's program while its record is made room for, given the address it will sit at and its
 * menu's chrome: its bytes, of a length that does not depend on the addresses.
 */
export type StandIn = { length: number; build: (at: number, chrome: number) => Uint8Array };

/** The activity menu's stand in: the chrome's call and the end. */
export const CHROME_AND_END: StandIn = {
  length: 5,
  build: (_, chrome) => Uint8Array.of(SCREEN_CALL, chrome & 0xff, (chrome >> 8) & 0xff, chrome >> 16, SCREEN_END),
};

/**
 * A page added to the end of mode `menu`, with its list and copy as built and a stand in program calling the menu's
 * chrome, touched through hit page `lead`: the steps `composeActivityMenuPage` in `screens.ts` takes for a page of its
 * own, in its order and for its reasons, the copy in the pool right after the last page's since the copies pair with
 * the pages by position, section 69, then the list at the end of the page lists, then the entry's pointer, then the
 * block after the last page record. Every offset is read again after each insertion. `what` names the menu in a
 * refusal.
 */
export function withMenuPage(
  start: Container, menu: number, list: Uint8Array, copy: Uint8Array, lead: number, what = 'the activity menu', standIn: StandIn = CHROME_AND_END,
): Container {
  let c = start;
  const recordOf = () => {
    const record = modeRecords(c)?.[menu];
    if (record === undefined) throw new ComposeError(`${what} stopped reading`);
    return record;
  };
  const insert = (at: number, bytes: Uint8Array): void => {
    const hole = relocate(c, at, bytes.length).bytes;
    hole.set(bytes, at);
    c = parse(hole);
  };
  // 1. The copy, after the last page's.
  const last = recordOf().pages.at(-1);
  const rank = modePages(c).findIndex((one) => one.address === last?.address);
  const copyOff = pageListCopies(c)[rank];
  if (copyOff === undefined) throw new ComposeError(`${what}'s last page has no copy`);
  insert(copyOff + 1 + 4 * (c.blob[copyOff] as number), copy);
  // 2. The list, at the end of the run every page list lives in.
  const listAt = Math.max(...modePages(c).map((page) => {
    const off = c.blobOffsetOf(page.list);
    return off === undefined ? 0 : off + 1 + 4 * (c.blob[off] as number);
  }));
  insert(listAt, list);
  // 3. The entry's pointer, at the last page until the record exists, and the count with it.
  const entry = recordOf();
  const entryOff = c.blobOffsetOf(entry.address);
  const lastNow = entry.pages.at(-1);
  if (entryOff === undefined || lastNow === undefined) throw new ComposeError(`${what} moved out of reach`);
  const slotAt = entryOff + 6 + 3 * entry.pageCount;
  insert(slotAt, new Writer(3).u24(lastNow.address).bytes);
  c.blob.set(new Writer(2).u16(entry.pageCount + 1).bytes, entryOff + 4);
  c = parse(c.blob);
  const listOff = after(listAt, slotAt, 3);
  // 4. The block after the last real page record: the stand in program, then the record. Its addresses are written
  // as they will be once the block is in, since the census cannot see bytes not yet written.
  const realLast = recordOf().pages[entry.pageCount - 1];
  const realLastOff = realLast === undefined ? undefined : c.blobOffsetOf(realLast.address);
  const firstPage = recordOf().pages[0];
  const chrome = firstPage === undefined ? undefined : screenProgram(c, firstPage.program)?.find((one) => one.opcode === SCREEN_CALL)?.targets[0];
  const chromeOff = chrome === undefined ? undefined : c.blobOffsetOf(chrome);
  if (realLastOff === undefined || chromeOff === undefined) throw new ComposeError(`${what}'s pages moved out of reach`);
  const blockAt = realLastOff + PAGE_RECORD;
  const length = standIn.length + PAGE_RECORD;
  const address = (off: number): number => c.flashBase + after(off, blockAt, length);
  const base = c.flashBase + blockAt;
  const program = standIn.build(base, address(chromeOff));
  if (program.length !== standIn.length) throw new ComposeError(`${what}'s stand in program is not the length it states`);
  const block = new Writer(length);
  program.forEach((one) => block.u8(one));
  block.u8(lead).u24(address(listOff)).u24(base);
  insert(blockAt, block.bytes);
  const swapOff = c.blobOffsetOf(recordOf().address) as number;
  c.blob.set(new Writer(3).u24(base + standIn.length).bytes, swapOff + 6 + 3 * entry.pageCount);
  return parse(c.blob);
}

/**
 * A tagged list of a menu's grown in place to `bytes`, at blob offset `off`: the bytes past its end inserted, then
 * written whole. Refuses a list that would lose a binding, which a composed row never takes away.
 */
export function grownList(c: Container, off: number, bytes: Uint8Array, what = 'an activity menu page'): Container {
  const length = 1 + 4 * (c.blob[off] as number);
  if (bytes.length < length) throw new ComposeError(`${what} would lose a binding, which a composed row never takes away`);
  const grown = bytes.length === length ? c.blob.slice() : relocate(c, off + length, bytes.length - length).bytes;
  grown.set(bytes, off);
  return parse(grown);
}
