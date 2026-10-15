/**
 * The Harmony One's menu pages: the device list and its pages, the hit areas a touch lands in, and
 * paging a menu that has filled. Plan 007's touch family, cut out of `compose.ts` unchanged; it still
 * copies its chrome, fonts and pictures off the donor's own pages.
 */
import { u24 } from '../../bytes.ts';
import { Writer } from '../../emit.ts';
import { fontSets } from '../../font.ts';
import { Container, parse, SCAN_MASK } from '../../gspm.ts';
import { deviceListRows } from '../../inventory.ts';
import { excise, relocate } from '../../relocate.ts';
import {
  SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_END, SCREEN_JUMP, SCREEN_RETURN, SCREEN_SELECT_FONT, SCREEN_SWITCH_NARROW,
  SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, type ScreenInstruction, screenProgram,
} from '../../screen.ts';
import {
  ACTION_LIST_INDEX_OPCODE, type ModePage, modePages, type ModeRecord, modeRecords, pageListCopies, taggedList,
} from '../../sections.ts';
import { ComposeError, restamped } from '../../shared/core.ts';
import { pageTexts } from '../../shared/menus.ts';
import { codesFor, headerOf, textAt, textGlyphs } from '../../shared/spelling.ts';
import { TOUCH_AREA_LENGTH, type TouchArea, touchPages } from '../../tables.ts';
import { characterMap, decode } from '../../text.ts';
import { SCREEN_ROW_PITCH } from '../../touch.ts';

/*
 * ---- The screen half, Harmony One (arch 12) only ----
 *
 * Every shape below is the corpus's own, measured off `one_config`'s device modes in the lab notes
 * of 25 August 2026: the six row slots of a device page and where their labels sit, the chrome
 * program a page calls for its title and top bar, the two row layouts of the device list menus,
 * and the three instruction row that enters a device mode. The positions are the layout of the
 * model's screen rather than of one config, which is why they are constants; the pictures are per
 * config and are taken from the pages that already draw them.
 */

/** The touch scans of the six command slots of a device page, rows top to bottom, left then
 *  right, which is hit page order and also the order the corpus draws the labels in. */
export const DEVICE_PAGE_SCANS = [48, 49, 50, 51, 52, 53] as const;

/** Where each slot's button background is drawn, `[x, y]`, same index as the scans. */
export const DEVICE_PAGE_SLOTS: readonly (readonly [number, number])[] = [
  [0x06, 0x26], [0x59, 0x26], [0x06, 0x5c], [0x59, 0x5c], [0x06, 0x92], [0x59, 0x92],
];

/** A slot's label sits twenty pixel rows below its background's top, uniformly in the corpus. */
export const DEVICE_LABEL_DROP = 20;

/** The title of a mode, `(x, y)` of its first glyph. */
export const MODE_TITLE_X = 0x06;

export const MODE_TITLE_Y = 0x04;

/**
 * The fonts, as base slot 7 indices: a device page's rows in font 9 and a menu's in font 7, as the
 * corpus draws them. A composed device page's title is a choice, `TouchChoices.deviceTitleFont`.
 */
export const DEVICE_ROW_FONT = 9;

export const MENU_ROW_FONT = 7;

/** A menu row's label is left aligned at this x; the third row's label and background y. */
export const MENU_LABEL_X = 0x3f;

export const MENU_ROW3_LABEL_Y = 0xa5;

export const MENU_ROW3_BG: readonly [number, number] = [0x06, 0x92];

/**
 * The first row of a device list page, section 240: its background, the device icon drawn a pixel
 * in from the background's corner, and the label's baseline. The rows sit `MENU_ROW_PITCH` apart,
 * so row `k` is each of these plus `54 * k`, which is how a row's icon is found for reuse.
 */
export const MENU_ROW1_BG: readonly [number, number] = [0x06, 0x26];

export const MENU_ICON_OFFSET: readonly [number, number] = [5, 1];

export const MENU_ROW1_LABEL_Y = 0x39;

/**
 * The rows' pixel pitch, which is `screen.ts`'s and not a number of this file's own: the two were
 * the same 54 in two places until 7 September 2026, which is the state `isa.py`'s docstring forbids.
 */
export const MENU_ROW_PITCH = SCREEN_ROW_PITCH;

/** Where a page draws its own number, top left, and the `/` that follows it. */
const MENU_COUNTER_XY: readonly [number, number] = [13, 18];

const MENU_COUNTER_SLASH_X = 18;

/** The scan codes of a device list hit page, rows first, then the bottom key, then the two edges. */
export const MENU_ROW_SCAN = 48;

export const MENU_EDGE_SCANS: readonly [number, number] = [46, 47];

/** The two row layouts of a device list page, as base slot 17 hit page indices, section 125. */
/**
 * The scan codes a device list hit page offers, in order, per row count it supports.
 *
 * **The lead byte is an index into the config's own hit map table and never a layout**, section
 * 125, so a number here would be per config: the three row page is index 12 in `one_config` and in
 * the spare's own configuration, 4 in the protocol campaign compiles, and the two row page is 13 in
 * the first and 15, 16, 17 and more in the second. The composer used 12 and 13 and got the spare's
 * three row page right by luck. So a page is matched on **what its hit page offers** instead.
 *
 * A page's rows sit on the lowest scans, the **left bottom key** on the next one up, and the last two
 * are the two rectangles either side of the display. So the row count is the area count minus three,
 * and this table is that spelled out rather than computed, since the order is what a match needs.
 *
 * **Neither of those is a page flip and this file said the fourth one was**, until 7 September 2026,
 * when Danny corrected it from the remote in his hand and section 275 measured it. A Harmony One
 * turns a list's pages with the two buttons **beside** the display, which are scans 46 and 47, and
 * **no mode page in either configuration binds either of them**, 0 bindings over 778 pages, so the
 * paging is answered above the page and never on it. The rectangle above the edges is the left of the
 * two physical buttons **below** the display, which in device mode the screen labels "Activities";
 * every one of the 29 device list pages here binds it, all 29 through opcode `0x72`, which
 * `actions.ts` names as mapping a state variable's value rather than as any kind of flip. The right
 * bottom button has no rectangle at all on a device list page, which is Logitech's way of saying it
 * is not enabled there.
 */
const MENU_HIT_AREAS: readonly (readonly number[])[] = [
  [48, 49, 46, 47],
  [48, 49, 50, 46, 47],
  [48, 49, 50, 51, 46, 47],
];

/** How many device rows a hit page offering `areas` supports, or undefined if it is not one. */
export function menuRowCapacity(areas: readonly number[]): number | undefined {
  const at = MENU_HIT_AREAS.findIndex(
    (want) => want.length === areas.length && want.every((code, k) => areas[k] === code),
  );
  return at < 0 ? undefined : at + 1;
}

/*
 * There is no device page hit page number: it is the configuration's own, 10 on the everyday Harmony One,
 * 26 on Logitech's compile of the Denon and the LG, 4 on the factory file, and a composer reads it off an
 * existing device page. A constant of 10 stood here until findings section 394 counted them.
 */


/** The first op 2 drawing at `(x, y)` in the program at `address`, as a picture address. */
export function pictureDrawnAt(
  c: Container, address: number, x: number, y: number,
): number | undefined {
  for (const i of screenProgram(c, address) ?? []) {
    if (i.opcode === SCREEN_DRAW_IMAGE && i.operands[0] === x && i.operands[1] === y) {
      return u24(i.operands, 2);
    }
  }
  return undefined;
}

/**
 * The icon a device list row draws, for a row labelled `iconLike`, so a new row for a television
 * can wear the television icon the configuration already carries. A row is the picture drawn a
 * pixel in from its background's corner, and its rank on the page is its scan code above 48.
 */
function menuIconLike(c: Container, iconLike: string): number {
  const row = deviceListRows(c).find((one) => one.label === iconLike);
  if (row === undefined) {
    throw new ComposeError(`no device list row is labelled ${iconLike}, so there is no icon to copy`);
  }
  const page = modeRecords(c)?.[row.menu]?.pages[row.page];
  if (page === undefined) throw new ComposeError(`the row labelled ${iconLike} has no page`);
  const rank = row.scan - MENU_ROW_SCAN;
  const icon = pictureDrawnAt(c, page.program,
    MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0], MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1] + MENU_ROW_PITCH * rank);
  if (icon === undefined) throw new ComposeError(`the row labelled ${iconLike} draws no icon`);
  return icon;
}

/** The four numbers a hit rectangle is, for comparing two areas by geometry rather than identity. */
function sameRectangle(a: TouchArea, b: TouchArea): boolean {
  return a.x === b.x && a.width === b.width && a.y === b.y && a.height === b.height;
}

/**
 * The hit page offering exactly `wanted`, area for area and code for code: an existing one where the
 * configuration has it, and otherwise one composed after the last, and its index in the table, which
 * is what a page record's lead byte states.
 *
 * **One step for every menu page builder**, since the device list's and the activity menu's each
 * carried a copy of it until section 293 added a third caller. Composed the way both did it: the table
 * gains a pointer first, at an existing page, so the census knows the slot before the areas exist;
 * then the areas and the header go in after the last hit page, each area ending in its own address;
 * then the pointer is swapped in place.
 */
export function withHitPage(
  start: Container, wanted: readonly (readonly [number, TouchArea])[],
): { container: Container; lead: number } {
  let current = start;
  const hits = touchPages(current);
  const any = hits?.records[0];
  if (hits === undefined || any === undefined) throw new ComposeError('the hit map stopped reading');
  const found = hits.records.findIndex((page) => page.areas.length === wanted.length
    && wanted.every(([code, want], k) => page.areas[k]?.code === code
      && sameRectangle(page.areas[k] as TouchArea, want)));
  if (found >= 0) return { container: current, lead: found };
  const lead = hits.records.length;
  // Not `appendTableEntries`: that helper wants the slot's whole extent to be the table, and here the
  // section's extent runs on past the pointers, so the table is grown off what `touchPages` read
  // instead, a byte of count and three per page.
  const tableAt = hits.start + hits.length;
  const grownTable = relocate(current, tableAt, 3);
  grownTable.bytes.set(new Writer(3).u24(any.address).bytes, tableAt);
  grownTable.bytes[hits.start] = hits.records.length + 1;
  current = parse(grownTable.bytes);
  const before = touchPages(current);
  if (before === undefined) throw new ComposeError('the hit map stopped reading');
  const at = Math.max(...before.records.map((page) => page.start + page.length));
  const base = current.flashBase + at;
  const page = new Writer(wanted.length * TOUCH_AREA_LENGTH + 1 + 3 * wanted.length);
  wanted.forEach(([code, want], k) => {
    page.u16(want.x).u16(want.width).u16(want.y).u16(want.height).u8(code)
      .u24(base + TOUCH_AREA_LENGTH * k);
  });
  page.u8(wanted.length);
  wanted.forEach((_, k) => { page.u24(base + TOUCH_AREA_LENGTH * k); });
  const hole = relocate(current, at, page.bytes.length);
  hole.bytes.set(page.bytes, at);
  const placed = parse(hole.bytes);
  const table = touchPages(placed);
  if (table === undefined) throw new ComposeError('the hit map stopped reading');
  placed.blob.set(new Writer(3).u24(base + wanted.length * TOUCH_AREA_LENGTH).bytes,
                  table.start + 1 + 3 * lead);
  current = parse(placed.blob);
  const grown = touchPages(current)?.records[lead];
  if (grown === undefined || grown.areas.length !== wanted.length) {
    throw new ComposeError('the composed hit page does not read back');
  }
  return { container: current, lead };
}

/**
 * Add a one row page to a device list menu whose last page is full, section 240, the way
 * Logitech's compiler lays a seventh device out: pages of three and the last page short.
 *
 * Everything the page needs is read off the menu's own pages rather than carried as a constant,
 * because section 239 found three constants that were per configuration: the chrome program and
 * the row background off the first page, the bottom key's binding and its switch off the last
 * page, and the fonts off the instructions that select them. Five insertions, each leaving the
 * container parseable:
 *
 * 1. a hit page offering one row, found by geometry or composed from the full page's rectangles,
 *    since a short page's bottom key rectangle is the full page's, measured on two configurations;
 * 2. the page list's pool copy, right after the last page's, because the copies pair with the
 *    pages positionally, section 69;
 * 3. the page list itself, at the end of the run every page list lives in;
 * 4. three bytes in the mode entry for the page's pointer, a placeholder until the record exists,
 *    for the reason step 2 of `composeDeviceScreen` gives;
 * 5. the block: program, page counter tail, the two bottom key arms copied with their addresses
 *    restamped, and the page record, in the order every corpus page keeps them.
 */
export function composeMenuPage(
  start: Container, menu: number, rowList: number, label: string, iconLike: string | undefined,
): Container {
  let current = start;
  const recordOf = (c: Container) => {
    const record = modeRecords(c)?.[menu];
    if (record === undefined) throw new ComposeError(`menu ${menu} stopped reading`);
    return record;
  };
  const record = recordOf(current);
  const lastBefore = record.pages.at(-1);
  if (lastBefore === undefined) throw new ComposeError(`menu ${menu} has no page`);

  // 1. The hit page. A one row page offers the top row, the bottom key and the two edges, and
  // its bottom key rectangle is the one the full page puts on its own bottom key.
  const hits = touchPages(current);
  const full = hits?.records[lastBefore.lead as number];
  if (hits === undefined || full === undefined) throw new ComposeError('the hit map stopped reading');
  const areaOf = (code: number): TouchArea => {
    const area = full.areas.find((one) => one.code === code);
    if (area === undefined) throw new ComposeError(`menu ${menu}'s hit page offers no scan ${code}`);
    return area;
  };
  const rowCount = menuRowCapacity(full.areas.map((area) => area.code));
  if (rowCount === undefined) throw new ComposeError(`menu ${menu}'s hit page is not a row layout`);
  const wanted: readonly (readonly [number, TouchArea])[] = [
    [MENU_ROW_SCAN, areaOf(MENU_ROW_SCAN)],
    [MENU_ROW_SCAN + 1, areaOf(MENU_ROW_SCAN + rowCount)],
    [MENU_EDGE_SCANS[0], areaOf(MENU_EDGE_SCANS[0])],
    [MENU_EDGE_SCANS[1], areaOf(MENU_EDGE_SCANS[1])],
  ];
  const hitPage = withHitPage(current, wanted);
  current = hitPage.container;
  const lead = hitPage.lead;

  // 2. What the page copies off the menu: the bottom key's binding, the chrome call, the row
  // background and icon, the fonts, and whatever the page draws after its rows, which is the
  // bottom key and the page counter in one of two shapes: a switch on a state variable with two
  // arms, or the same drawn plain. Read off the container as it is now, since step 1 may have
  // moved every page above the hole: an address read before an insertion below it is stale.
  const first = recordOf(current).pages[0];
  const last = recordOf(current).pages.at(-1);
  if (first === undefined || last === undefined) throw new ComposeError(`menu ${menu} has no page`);
  const lastList = taggedList(current, last.list);
  const bottom = lastList?.entries.filter((entry) => entry.tag === (0x80 | (MENU_ROW_SCAN + rowCount)));
  if (lastList === undefined || bottom === undefined || bottom.length !== 1) {
    throw new ComposeError(`menu ${menu}'s last page binds its bottom key ${bottom?.length ?? 0} times`);
  }
  const bottomKey = bottom[0] as { opcode: number; operand: number };
  const program = screenProgram(current, last.program) ?? [];
  if (program[0]?.opcode !== SCREEN_CALL) {
    throw new ComposeError(`menu ${menu}'s page program does not open with the chrome call`);
  }
  const isLabelAt = (one: { opcode: number; operands: Uint8Array }, y: number): boolean =>
    (one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT)
    && one.operands[0] === MENU_LABEL_X && one.operands[1] === y;
  const lastLabel = program.findIndex((one) =>
    isLabelAt(one, MENU_ROW1_LABEL_Y + MENU_ROW_PITCH * (rowCount - 1)));
  if (lastLabel < 0) throw new ComposeError(`menu ${menu}'s last page draws no label on its last row`);
  const afterRows = program.slice(lastLabel + 1);
  const closing = afterRows.at(-1);
  if (closing === undefined) throw new ComposeError(`menu ${menu}'s page program ends on a row`);
  const rowFont = screenProgram(current, first.program)?.find((one) => one.opcode === SCREEN_SELECT_FONT)?.operands[0];
  if (rowFont === undefined) {
    throw new ComposeError(`menu ${menu}'s first page selects no font this can copy`);
  }
  // The page counter: a number at the top left and a `/` beside it, in one font, wherever the
  // shape puts them. The number is drawn afresh for the new page and the `/` is the shared string.
  // The font a counter is drawn in is the one in force where it is drawn, which may have been selected before
  // the tail does anything: on Logitech's compile of the Denon and the LG for the One the row labels' font
  // carries on to the counter. `inherited` is the font in force when the tail starts.
  const counterFont = (tail: readonly { opcode: number; operands: Uint8Array }[], inherited?: number): number | undefined => {
    let font = inherited;
    for (const one of tail) {
      if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0];
      if (one.opcode === SCREEN_TEXT_AT && one.operands[1] === MENU_COUNTER_XY[1]) return font;
    }
    return undefined;
  };
  const isNumber = (one: { opcode: number; operands: Uint8Array }): boolean =>
    one.opcode === SCREEN_TEXT_AT && one.operands[1] === MENU_COUNTER_XY[1]
    && one.operands[0] !== MENU_COUNTER_SLASH_X;
  const map = characterMap(current);
  const sets = fontSets(current) ?? [];
  const rowSet = sets[rowFont];
  if (map === undefined || rowSet === undefined) {
    throw new ComposeError('the config does not carry the fonts the menu page uses');
  }
  const labelCodes = codesFor(map, current, rowSet, label, rowFont);
  const pageNumber = String(record.pages.length + 1);

  // 3. The list, twice: the pool copy after the last page's own copy, then the list at the end of
  // the page list run. The copy goes first because the pool sits below everything else here.
  const listBytes = new Writer(1 + 4 * 2).u8(2)
    .u8(0x80 | MENU_ROW_SCAN).u16(rowList).u8(ACTION_LIST_INDEX_OPCODE)
    .u8(0x80 | (MENU_ROW_SCAN + 1)).u16(bottomKey.operand).u8(bottomKey.opcode);
  const pages = modePages(current);
  const lastIndex = pages.findIndex((one) => one.address === last.address);
  const copyOff = pageListCopies(current)[lastIndex];
  const copyLength = copyOff === undefined
    ? undefined : taggedList(current, copyOff + current.flashBase)?.length;
  if (copyOff === undefined || copyLength === undefined) {
    throw new ComposeError(`menu ${menu}'s last page has no pool copy`);
  }
  const copyHole = relocate(current, copyOff + copyLength, listBytes.bytes.length);
  copyHole.bytes.set(listBytes.bytes, copyOff + copyLength);
  current = parse(copyHole.bytes);
  const listAt = Math.max(...modePages(current).map((page) => {
    const off = current.blobOffsetOf(page.list);
    const list = taggedList(current, page.list);
    return off === undefined || list === undefined ? 0 : off + list.length;
  }));
  const listHole = relocate(current, listAt, listBytes.bytes.length);
  listHole.bytes.set(listBytes.bytes, listAt);
  current = parse(listHole.bytes);

  // 4. The entry's new pointer, at the last page until the record exists, and the count with it.
  const entryRecord = recordOf(current);
  const entryOff = current.blobOffsetOf(entryRecord.address);
  const lastNow = entryRecord.pages.at(-1);
  if (entryOff === undefined || lastNow === undefined) throw new ComposeError('a menu entry moved out of reach');
  const slotAt = entryOff + 6 + 3 * entryRecord.pageCount;
  // The list sits above the entry on the Harmony One, so the three bytes move it; anything else
  // the block embeds is read after this, off the container as it then is.
  const pageListAddress = current.flashBase + listAt + (listAt >= slotAt ? 3 : 0);
  const entryHole = relocate(current, slotAt, 3);
  entryHole.bytes.set(new Writer(3).u24(lastNow.address).bytes, slotAt);
  entryHole.bytes.set(new Writer(2).u16(entryRecord.pageCount + 1).bytes, entryOff + 4);
  current = parse(entryHole.bytes);

  // 5. The block, right after the last real page record. Everything it copies is re-read here,
  // after the three relocations above, and its embedded addresses are then shifted by the block's
  // own length where they sit at or above the hole, the arithmetic step 5 of `composeDeviceScreen`
  // applies.
  const realLast = recordOf(current).pages[entryRecord.pageCount - 1];
  const realLastOff = realLast === undefined ? undefined : current.blobOffsetOf(realLast.address);
  if (realLast === undefined || realLastOff === undefined) throw new ComposeError('a menu page moved out of reach');
  const nowProgram = screenProgram(current, realLast.program) ?? [];
  const nowAfterRows = nowProgram.slice(lastLabel + 1);
  const nowClosing = nowAfterRows.at(-1);
  const fontAt = (upTo: number): number | undefined => {
    let font: number | undefined;
    nowProgram.slice(0, upTo).forEach((one) => { if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0]; });
    return font;
  };
  if (nowClosing === undefined || nowClosing.opcode !== closing.opcode) {
    throw new ComposeError('a menu page program changed shape while being copied');
  }
  const firstNow = recordOf(current).pages[0];
  const chromeAddress = u24((nowProgram[0] as { operands: Uint8Array }).operands, 0);
  const bg = firstNow === undefined ? undefined : pictureDrawnAt(current, firstNow.program, ...MENU_ROW1_BG);
  const icon = firstNow === undefined ? undefined : iconLike === undefined
    ? pictureDrawnAt(current, firstNow.program,
      MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0], MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1])
    : menuIconLike(current, iconLike);
  if (bg === undefined || icon === undefined) {
    throw new ComposeError(`menu ${menu}'s first page does not draw a row this can copy`);
  }
  const blockAt = realLastOff + 7;
  const base = current.flashBase + blockAt;
  let blockLength = 0;
  const shifted = (address: number): number => (address >= base ? address + blockLength : address);
  // One instruction copied: the same bytes with any address it embeds restamped. Anything with an
  // address this does not know how to restamp is refused rather than copied stale.
  const copied = (one: { opcode: number; start: number; length: number }, jumpTo?: number): Uint8Array => {
    const bytes = Uint8Array.from(current.blob.slice(one.start, one.start + one.length));
    if (one.opcode === SCREEN_TEXT_AT || one.opcode === SCREEN_DRAW_IMAGE) {
      bytes.set(new Writer(3).u24(shifted(u24(bytes, 3))).bytes, 3);
    } else if (one.opcode === SCREEN_CALL) {
      bytes.set(new Writer(3).u24(shifted(u24(bytes, 1))).bytes, 1);
    } else if (one.opcode === SCREEN_JUMP) {
      if (jumpTo === undefined) throw new ComposeError('a jump where the corpus keeps none');
      bytes.set(new Writer(3).u24(jumpTo).bytes, 1);
    } else if (one.opcode !== SCREEN_SELECT_FONT && one.opcode !== SCREEN_END && one.opcode !== SCREEN_TEXT_INLINE) {
      throw new ComposeError(`menu ${menu}'s page tail holds opcode 0x${one.opcode.toString(16)}`);
    }
    return bytes;
  };
  const numberInline = (font: number | undefined): Uint8Array => {
    // The font table is read afresh: `sets` above was read before three relocations moved every
    // glyph, and a set read before an insertion below it is stale by that insertion.
    const set = font === undefined ? undefined : (fontSets(current) ?? [])[font];
    if (font === undefined || set === undefined) {
      throw new ComposeError(`menu ${menu}'s page counter selects no font this can spell from`);
    }
    const codes = codesFor(map, current, set, pageNumber, font);
    const out = new Writer(3 + codes.length + 1);
    out.u8(SCREEN_TEXT_INLINE).u8(MENU_COUNTER_XY[0]).u8(MENU_COUNTER_XY[1]);
    codes.forEach((code) => out.u8(code));
    out.u8(0);
    return out.bytes;
  };
  const head = new Writer(4 + 6 + 6 + 2 + 3 + labelCodes.length + 1);
  const row = (): Uint8Array => head.bytes;
  const programHead = 4 + 6 + 6 + 2 + (3 + labelCodes.length + 1);
  // Lengths first, so the shift is known before any address is written.
  let pieces: Uint8Array[] = [];
  const tailPieces: (() => Uint8Array)[] = [];
  if (nowClosing.opcode === SCREEN_END) {
    // Plain: the bottom key label and the counter sit in the program itself. Copied instruction
    // by instruction with the number redrawn.
    let tailLength = 0;
    for (const one of nowAfterRows) {
      if (isNumber(one)) {
        const font = counterFont(nowAfterRows, fontAt(lastLabel + 1));
        const inline = numberInline(font);
        tailLength += inline.length;
        tailPieces.push(() => inline);
      } else {
        tailLength += one.length;
        tailPieces.push(() => copied(one));
      }
    }
    blockLength = programHead + tailLength + 7;
  } else if (nowClosing.opcode === SCREEN_SWITCH_NARROW && nowAfterRows.length === 1
             && nowClosing.operands[1] === 2 && nowClosing.operands[2] === 0 && nowClosing.operands[6] === 1) {
    // Switched: the program closes on a two arm switch, the counter is the program the arms jump
    // to, right after the switch, and the arms follow it. All three copied, the jumps retargeted.
    const armAddresses = [u24(nowClosing.operands, 3), u24(nowClosing.operands, 7)];
    const tailStart = current.flashBase + nowClosing.start + nowClosing.length;
    const tail = screenProgram(current, tailStart) ?? [];
    if (tail.at(-1)?.opcode !== SCREEN_END) throw new ComposeError(`menu ${menu}'s page counter does not end`);
    const arms = armAddresses.map((address) => {
      const instructions = screenProgram(current, address) ?? [];
      const end = instructions.findIndex((one) => one.opcode === SCREEN_JUMP);
      if (end < 0) throw new ComposeError(`menu ${menu}'s bottom key arm does not end in a jump`);
      return instructions.slice(0, end + 1);
    });
    // A menu of one page draws no counter, its tail only the end, and `paginate` below numbers every page
    // once there are two; so a counter is redrawn only where the page had one.
    const inline = tail.some(isNumber) ? numberInline(counterFont(tail, fontAt(nowProgram.length))) : new Uint8Array(0);
    const tailLength = tail.reduce((sum, one) => sum + (isNumber(one) ? inline.length : one.length), 0);
    const armLengths = arms.map((arm) => arm.reduce((sum, one) => sum + one.length, 0));
    blockLength = programHead + 12 + tailLength + (armLengths[0] as number) + (armLengths[1] as number) + 7;
    const tailAddress = base + programHead + 12;
    const armA = tailAddress + tailLength;
    const armB = armA + (armLengths[0] as number);
    tailPieces.push(() => new Writer(12).u8(SCREEN_SWITCH_NARROW).u8(nowClosing.operands[0] as number).u8(2)
      .u8(0).u24(armA).u8(1).u24(armB).u8(0).bytes);
    for (const one of tail) tailPieces.push(() => (isNumber(one) ? inline : copied(one)));
    for (const arm of arms) for (const one of arm) tailPieces.push(() => copied(one, tailAddress));
  } else {
    throw new ComposeError(`menu ${menu}'s page program does not end the way the corpus ends one`);
  }
  // Now the addresses, with the shift settled.
  head.u8(SCREEN_CALL).u24(shifted(chromeAddress));
  head.u8(SCREEN_DRAW_IMAGE).u8(MENU_ROW1_BG[0]).u8(MENU_ROW1_BG[1]).u24(shifted(bg));
  head.u8(SCREEN_DRAW_IMAGE).u8(MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0]).u8(MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1])
    .u24(shifted(icon));
  head.u8(SCREEN_SELECT_FONT).u8(rowFont);
  head.u8(SCREEN_TEXT_INLINE).u8(MENU_LABEL_X).u8(MENU_ROW1_LABEL_Y);
  labelCodes.forEach((code) => head.u8(code));
  head.u8(0);
  pieces = [row(), ...tailPieces.map((piece) => piece())];
  const pageRecordAddress = base + blockLength - 7;
  pieces.push(new Writer(7).u8(lead).u24(shifted(pageListAddress)).u24(base).bytes);
  const block = new Writer(blockLength);
  for (const piece of pieces) piece.forEach((byte) => block.u8(byte));
  if (block.bytes.length !== blockLength) {
    throw new ComposeError(`the menu page block is ${block.bytes.length} bytes, not the ${blockLength} counted`);
  }
  const blockHole = relocate(current, blockAt, blockLength);
  blockHole.bytes.set(block.bytes, blockAt);
  const placed = parse(blockHole.bytes);
  const swapRecord = modeRecords(placed)?.[menu];
  const swapOff = swapRecord === undefined ? undefined : placed.blobOffsetOf(swapRecord.address);
  if (swapRecord === undefined || swapOff === undefined) throw new ComposeError('a menu entry moved out of reach');
  placed.blob.set(new Writer(3).u24(pageRecordAddress).bytes, swapOff + 6 + 3 * (swapRecord.pageCount - 1));
  // 6. The paging: the header's total restated, the new page's number where the one it was copied
  // from had none, and the page turn keys brought back if the menu had one page. Until section 293
  // this function stopped at step 5 and left "2 pages" on nine device lists of three on the spare.
  return paginate(parse(placed.blob), menu);
}

/**
 * Where a multi page screen's header draws its page total, and the word after it, `(x, y)` of the
 * first glyph, on arch 12 (Harmony One). Every page of such a screen draws its own number on row 18
 * ending where the `/` at `MENU_COUNTER_SLASH_X` begins, and the header it calls draws the total and
 * "pages" after them, so the screen reads "2/3 pages". Section 293, over the six Harmony One
 * containers: the header's total equals the page count on 58 of 58 multi page screens, and none of
 * the 598 one page screens' headers draws a total.
 */
const MENU_TOTAL_XY: readonly [number, number] = [0x17, 0x12];

const MENU_TOTAL_WORD_X = 0x23;

/** The two page turn keys, the rectangles either side of the display, section 275. */
const PAGE_TURN_SCANS: readonly number[] = MENU_EDGE_SCANS;

/**
 * A page's own number: the text drawn on the counter's row left of the slash. **It is not at a fixed
 * place**, since the number is right aligned against the slash: it ends at x 18 on every page of every
 * multi page Harmony One screen, a "4" starting at 12 because its glyph is a pixel wider and a "10" at
 * 8. So it is found by its row and its side of the slash, and placed by its width. Section 293.
 */
function numberAt(
  program: readonly ScreenInstruction[],
): { index: number; font: number | undefined } | undefined {
  let font: number | undefined;
  for (let index = 0; index < program.length; index += 1) {
    const one = program[index] as ScreenInstruction;
    if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0];
    if ((one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT)
        && one.operands[1] === MENU_COUNTER_XY[1] && (one.operands[0] as number) < MENU_COUNTER_SLASH_X) {
      return { index, font };
    }
  }
  return undefined;
}

/**
 * Where a page's counter is drawn: the page's own program, or, on a device list page that closes on
 * a switch, the program its arms jump back to, which is the byte after the switch on 80 of 80 such
 * pages, 73 of them on screens of several pages. **That is not always where the number is**: on 7 of the 73 what follows is a second switch, so
 * the walk follows the arms until they rejoin at a program that ends plainly. Section 293.
 */
function counterProgram(c: Container, page: ModePage): number {
  let at = page.program;
  for (let hops = 0; hops < 8; hops += 1) {
    const closing = (screenProgram(c, at) ?? []).at(-1);
    if (closing?.opcode !== SCREEN_SWITCH_NARROW) return at;
    const arm = closing.targets[0] === undefined ? undefined : screenProgram(c, closing.targets[0]);
    const jump = arm?.at(-1);
    if (jump?.opcode !== SCREEN_JUMP || jump.targets[0] === undefined) {
      throw new ComposeError('a page\'s switch has an arm that does not jump back');
    }
    at = jump.targets[0];
  }
  throw new ComposeError('a page\'s switches do not rejoin');
}

/** What a configuration's own multi page screens draw their paging in, read rather than assumed. */
interface PagingStyle {
  /** The font a page's number and slash are drawn in. */
  counterFont: number;
  /** The font the header's total and word are drawn in. */
  totalFont: number;
  /** The word after the total, in this configuration's language. */
  word: string;
}

/**
 * The paging style of a configuration, off the first multi page screen that draws all of it.
 *
 * **A font holds only the glyphs its configuration draws**, section 275, so the digits, the slash and
 * the word are spelled in the fonts a screen of this configuration already spells them in, and the
 * word is read rather than written in English. A configuration with no multi page screen at all has
 * nothing to copy, and paging is refused rather than drawn in a font that may not have the glyphs.
 */
function pagingStyle(c: Container): PagingStyle {
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config carries no character map');
  for (const record of modeRecords(c) ?? []) {
    const first = record.pages[0];
    if (record.pages.length < 2 || first === undefined) continue;
    const header = headerOf(c, first);
    if (header === undefined) continue;
    const headerProgram = screenProgram(c, header) ?? [];
    const total = textAt(headerProgram, ...MENU_TOTAL_XY);
    const word = textAt(headerProgram, MENU_TOTAL_WORD_X, MENU_TOTAL_XY[1]);
    const counter = numberAt(screenProgram(c, counterProgram(c, first)) ?? []);
    if (total?.font === undefined || word === undefined || counter?.font === undefined) continue;
    const glyphs = textGlyphs(c, headerProgram[word.index] as ScreenInstruction);
    if (glyphs === undefined) continue;
    return { counterFont: counter.font, totalFont: total.font, word: decode(glyphs, map) };
  }
  throw new ComposeError('no screen in this config has more than one page, so there is no paging '
    + 'to copy the fonts and the word from');
}

export function paginate(start: Container, menu: number): Container {
  if (start.architecture !== 12) throw new ComposeError('paging is composed for the Harmony One alone');
  const t = pageTexts(start, menu);
  const recordOf = (): ModeRecord => {
    const record = modeRecords(t.current)?.[menu];
    if (record === undefined) throw new ComposeError(`menu ${menu} stopped reading`);
    return record;
  };
  const count = recordOf().pages.length;
  if (count < 2) throw new ComposeError(`menu ${menu} has one page, so there is nothing to page`);
  const style = pagingStyle(t.current);
  const map = characterMap(t.current);
  if (map === undefined) throw new ComposeError('the config carries no character map');
  // 1. The page turn keys, cut out of the mode record's own list one entry at a time. The count byte
  // is restated after each cut, since the census has to read the list as it was to move the rest.
  for (;;) {
    const record = recordOf();
    const list = taggedList(t.current, record.start);
    if (list === undefined) throw new ComposeError(`menu ${menu}'s record list does not read`);
    const at = list.entries.findIndex((entry) => PAGE_TURN_SCANS.includes(entry.tag & SCAN_MASK));
    if (at < 0) break;
    if (list.wide) throw new ComposeError(`menu ${menu}'s record list is the wide form, which is not cut`);
    const entry = list.entries[at] as { opcode: number; operand: number };
    if (entry.opcode !== 0 || entry.operand !== 0) {
      throw new ComposeError(`menu ${menu} runs something on a page turn key, which paging would drop`);
    }
    const off = t.current.blobOffsetOf(record.start);
    if (off === undefined) throw new ComposeError(`menu ${menu}'s record moved out of reach`);
    const cut = excise(t.current, off + 1 + 4 * at, 4);
    cut.bytes[off] = list.entries.length - 1;
    t.current = parse(restamped(cut.bytes));
  }

  // 2. The header's total. Every page calls one header and no two screens share one, 656 screens and
  // 656 headers on the six Harmony One containers, so restating it changes this screen and no other.
  const headers = new Set(recordOf().pages.map((page) => headerOf(t.current, page)));
  const header = [...headers][0];
  if (headers.size !== 1 || header === undefined) {
    throw new ComposeError(`menu ${menu}'s pages do not all call one header`);
  }
  const headerProgram = screenProgram(t.current, header) ?? [];
  const total = textAt(headerProgram, ...MENU_TOTAL_XY);
  if (total !== undefined) {
    t.restate(headerProgram[total.index] as ScreenInstruction, total.font, String(count), 'page total');
  } else {
    // A one page screen's header, which ends in a return and the end marker: the total and the word
    // go in before the return, and the font it had is put back after them.
    const back = headerProgram.at(-2);
    if (back?.opcode !== SCREEN_RETURN || headerProgram.at(-1)?.opcode !== SCREEN_END) {
      throw new ComposeError(`menu ${menu}'s header does not end the way the corpus ends one`);
    }
    const before = headerProgram.slice(0, -2).findLast((one) => one.opcode === SCREEN_SELECT_FONT)?.operands[0];
    t.insert(back.start, [
      ...t.drawn(...MENU_TOTAL_XY, String(count), style.totalFont, undefined),
      ...t.drawn(MENU_TOTAL_WORD_X, MENU_TOTAL_XY[1], style.word, style.totalFont, undefined),
      ...(before === undefined ? [] : [SCREEN_SELECT_FONT, before]),
    ]);
  }

  // 3. Every page's own number and slash, in page order, re-reading the record after each insertion.
  for (let k = 0; k < count; k += 1) {
    const page = recordOf().pages[k] as ModePage;
    const where = counterProgram(t.current, page);
    const program = screenProgram(t.current, where) ?? [];
    const number = numberAt(program);
    if (number !== undefined) {
      t.restate(program[number.index] as ScreenInstruction, number.font, String(k + 1), `page ${k + 1}'s number`,
              MENU_COUNTER_SLASH_X);
      continue;
    }
    const closing = program.at(-1);
    if (closing?.opcode !== SCREEN_END) {
      throw new ComposeError(`menu ${menu}'s page ${k + 1} draws no number and does not end plainly`);
    }
    t.insert(closing.start, [
      ...t.drawn(MENU_COUNTER_SLASH_X - t.width(style.counterFont, String(k + 1)), MENU_COUNTER_XY[1],
               String(k + 1), style.counterFont, undefined),
      ...t.drawn(MENU_COUNTER_SLASH_X, MENU_COUNTER_XY[1], '/', style.counterFont, undefined),
    ]);
  }
  return t.current;
}
