/**
 * The four slot menus on the Harmony 600, 650 and 700: the device lists and the activity menu as parts
 * and bytes, a menu grown by a page, and the check that every page is the one built for it. Plan 007's
 * four slot family, cut out of `compose.ts` unchanged.
 */
import { u24 } from '../../bytes.ts';
import { TWO_LINE_RISE } from './devicemode.ts';
import { Writer } from '../../emit.ts';
import {
  cornerPrograms, bottomWord, builtChrome, DEVICE_PAGE_BACKGROUND_AT, DEVICE_PAGE_BOTTOM_BAR_AT, DEVICE_PAGE_LOOKS,
  DEVICE_PAGE_TOP_BAR_AT, type DeviceModeChrome, deviceModeChrome, type DevicePageLook, DEVICES_KEY_TAG, inOurLook,
  FOUR_SLOT_PREFIX, FOUR_SLOT_SUFFIX_OPCODES, FOUR_SLOT_TITLE_XY, fourSlotCounterX, inlineHomes, MENU_BOTTOM_LINE_Y,
  MENU_TOP_LINE_Y, type PageChrome, picturesByContent, programDraws,
} from '../../families/four-slot/chrome.ts';
import { type FontSet, fontSets, glyphOf } from '../../font.ts';
import { fontsBySize, ladderOf, TITLE_RUNG } from './devicemode.ts';
import { letterForm } from '../../lettering.ts';
import { Container, parse, SCAN_MASK } from '../../gspm.ts';
import {
  activities, ACTIVITY_STATE_NAME, caseQueued, deviceListRows, ENTER_MODE, FOUR_SLOT_ITEMS, FOUR_SLOT_LABEL_Y,
  FOUR_SLOT_LEFT_X, FOUR_SLOT_RIGHT_END, FOUR_SLOT_ROWS, FOUR_SLOT_SCREEN_WIDTH, FOUR_SLOT_STORED_ORDER,
  fourSlotCellAt, KEY_EVENT_PRESS, KEY_EVENT_SHIFT, MAP_VALUE_OPCODE, RUN_SCREEN_PROGRAM, stateVariables,
  TWO_ROW_LABEL_Y,
} from '../../inventory.ts';
import { relocate } from '../../relocate.ts';
import {
  bitmapReference, SCREEN_DRAW_IMAGE, SCREEN_DRAW_IMAGE_AT, SCREEN_END, SCREEN_QUEUE_INSTRUCTION, SCREEN_SELECT_FONT,
  SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, type ScreenInstruction, screenProgram,
} from '../../screen.ts';
import {
  ACTION_LIST_INDEX_OPCODE, type ModePage, modePages, type ModeRecord, modeRecords, pageListCopies, type TaggedEntry,
  taggedList, taggedListExtent,
} from '../../sections.ts';
import { ComposeError } from '../../shared/core.ts';
import { activityMenus, deviceListMenus, pageTexts } from '../../shared/menus.ts';
import {
  blobReader, codesFor, textAt, textGlyphs, textValues, textWidth, type ValueReader,
} from '../../shared/spelling.ts';
import { characterMap, referencedStringAddress } from '../../text.ts';
import { valueMaps } from '../../valuemap.ts';

/**
 * What a composer reads out of an arch 14 configuration before it moves anything. The chrome and the
 * backgrounds are built, `deviceModeChrome`; the fonts are still the first device page's,
 * `todo-compile-650.md` 6.2.12.
 */
export interface FourSlotTemplate {
  /** The chrome around a page's middle, built: a device page's, or a working screen's since section 336. */
  chrome: PageChrome;
  /** The device page chrome as built, whatever `chrome` is, for the key map's corner program. */
  device: DeviceModeChrome;
  titleFont: number;
  counterFont: number;
  labelFont: number;
  /**
   * The background of a page holding one item or none and of one holding more, as picture addresses.
   * Always both for a device mode; an activity's working screens may lack one, `calibration_h600`'s
   * having no page of one command, and then only a page that needs it is refused.
   */
  single: number | undefined;
  crossed: number | undefined;
  /**
   * The device mode whose keys a plain composition binds by frame, `keysLike`'s or the first row's. Only
   * which command goes on which key is taken from it; the key map's shape is `deviceModeKeyMap`'s. Undefined
   * on a configuration with no device yet, where only the compiler's layout, whose keys are the caller's,
   * composes one.
   */
  keyMode: number | undefined;
}

/** The rung of `LABEL_SIZES` the labels of a device page are drawn in, the largest, the 15 pixel label face. */
const DEVICE_PAGE_LABEL_RUNG = 0;

export function fourSlotTemplate(c: Container, keysLike: string | undefined): FourSlotTemplate {
  const rows = deviceListRows(c);
  const records = modeRecords(c) ?? [];
  const deviceModes = [...new Set(rows.map((row) => row.mode))];
  const chrome = deviceModeChrome(c);
  if (rows.length === 0) {
    if (keysLike !== undefined) throw new ComposeError(`no device list row is labelled ${keysLike}, so there is no key map to copy`);
    return { chrome: builtChrome(chrome), device: chrome, ...describedFonts(c), single: chrome.single, crossed: chrome.crossed,
      keyMode: undefined };
  }

  // The fonts, from the first device mode page whose program has the measured shape, 6.2.12.
  for (const mode of deviceModes) {
    for (const page of records[mode]?.pages ?? []) {
      const program = screenProgram(c, page.program);
      if (program === undefined || program.length < 14) continue;
      const opcodes = program.map((one) => one.opcode);
      const texts = (from: number, count: number): boolean => opcodes.slice(from, from + count)
        .every((opcode) => opcode === SCREEN_TEXT_AT || opcode === SCREEN_TEXT_INLINE);
      const suffix = program.slice(-4);
      // The counter's font select is left out where the counter is drawn in the title's font, as on a page of
      // ours, which carries one plain 14; Logitech's pages draw the two in two sets. Section 377.
      const own = opcodes[5] === SCREEN_SELECT_FONT ? 1 : 0;
      if (!FOUR_SLOT_PREFIX.every((opcode, k) => opcodes[k] === opcode)
          || opcodes[3] !== SCREEN_SELECT_FONT || !texts(4, 1) || !texts(5 + own, 3)
          || opcodes[8 + own] !== SCREEN_SELECT_FONT
          || !FOUR_SLOT_SUFFIX_OPCODES.every((opcode, k) => suffix[k]?.opcode === opcode)
          || !texts(program.length - 2, 1) || suffix[3]?.opcode !== SCREEN_END) continue;
      const keyRow = keysLike === undefined ? rows[0] : rows.find((row) => row.label === keysLike);
      if (keyRow === undefined) {
        throw new ComposeError(`no device list row is labelled ${keysLike}, so there is no key map to copy`);
      }
      return {
        chrome: builtChrome(chrome),
        device: chrome,
        titleFont: program[3]?.operands[0] as number,
        counterFont: program[own === 1 ? 5 : 3]?.operands[0] as number,
        labelFont: program[8 + own]?.operands[0] as number,
        single: chrome.single,
        crossed: chrome.crossed,
        keyMode: keyRow.mode,
      };
    }
  }
  throw new ComposeError('no device mode page has the shape its fonts are read from');
}

/**
 * A device page's fonts where the configuration holds no device page to read them off, section 377: the title
 * and the counter in the first plain set of the title's size, and the labels in the first set of the largest
 * label size. On the Harmony 600's and 650's compiles the pages draw the title and counter in the plain 14
 * and the labels in the shadowed 15, 54 of 54, and the label rule picks the very set their pages draw, 65
 * of 65 arch 14 compiles; the title rule picks the face and not their set, since they carry several plain 14
 * sets. A configuration of ours carries one, the one its menus' titles are drawn in.
 */
function describedFonts(c: Container): { titleFont: number; counterFont: number; labelFont: number } {
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const bySize = fontsBySize(c, map, ladderOf(c, map));
  const sets = fontSets(c) ?? [];
  const plain = (font: number): boolean => {
    for (const code of map.codes.keys()) {
      const glyph = glyphOf(c, sets[font] as FontSet, code);
      const form = glyph === undefined ? undefined : letterForm(glyph.rows);
      if (form !== undefined) return form.lettering === 'plain';
    }
    return false;
  };
  const title = (bySize.get(TITLE_RUNG) ?? []).find(plain);
  const label = bySize.get(DEVICE_PAGE_LABEL_RUNG)?.[0];
  if (title === undefined || label === undefined) {
    throw new ComposeError('no plain set of the title\'s size or no set of the largest label size to draw a device page in');
  }
  return { titleFont: title, counterFont: title, labelFont: label };
}

/**
 * Which of the two arch 14 device list layouts a page's list is in, and how many devices it holds:
 * corners, one scan per device filling `FOUR_SLOT_ITEMS` in order, or rows, both scans of a row per
 * device filling `FOUR_SLOT_ROWS` in order. Undefined for anything else, which the composer refuses.
 */
export function menuLayout(
  c: Container, entries: readonly TaggedEntry[],
): { rows: boolean; used: number; capacity: number } | undefined {
  const lists = c.actionLists() ?? [];
  const byList = new Map<string, number[]>();
  for (const entry of entries) {
    // Two scans of one row run twin lists rather than one, section 69, so a device is its mode.
    const list = lists[entry.operand];
    const key = entry.opcode === ACTION_LIST_INDEX_OPCODE ? JSON.stringify(list) : `${entry.opcode}:${entry.operand}`;
    byList.set(key, [...(byList.get(key) ?? []), entry.tag & SCAN_MASK]);
  }
  const groups = [...byList.values()].map((scans) => [...scans].sort((a, b) => a - b).join(','));
  const same = (want: readonly (readonly number[])[]): boolean => {
    const wanted = want.map((scans) => [...scans].sort((a, b) => a - b).join(','));
    return groups.length === wanted.length && wanted.every((one) => groups.includes(one));
  };
  const used = groups.length;
  if (same(FOUR_SLOT_ITEMS.slice(0, used).map((item) => [item.scan]))) {
    return { rows: false, used, capacity: FOUR_SLOT_ITEMS.length };
  }
  if (same(FOUR_SLOT_ROWS.slice(0, used))) return { rows: true, used, capacity: FOUR_SLOT_ROWS.length };
  return undefined;
}

/**
 * One more item on an arch 14 menu's last page: the page's list and its pool copy each gain the
 * buttons the item is bound to, the label goes in above the page's closing bar, and the page's background
 * becomes the one its kind draws for the places it now holds. The step both arch 14 menus share, the
 * device list and the activity menu, per decision 17: two builders, and the steps they have in common
 * written once.
 *
 * `firstRowList` is the first of the row lists the caller has already put in base slot 10, one per
 * button bound on the page and another per button on the copy, **in that order**, copy first: the
 * item takes the next corner, one list, or both buttons of the next row, two. What those lists run is
 * the caller's, which is the whole difference between the two menus.
 *
 * **The page is the built one before and after**, section 334, `todo-compile-650.md` 6.2.9: the last page
 * has to be the page `menuPageParts` builds from what it holds, or the growth is refused before anything
 * moves, and the grown page has to be the one built from what it holds then. The label goes where the
 * builder places it, and the background is the built one, `fourSlotMenuChrome`: a corner list's crossed
 * picture once it holds two devices, a two row list's own picture whatever it holds, and the activity
 * menu's full page picture once it holds two activities. Until then that picture was taken off one of
 * the menu's full pages, so a menu with none was refused; now it is located by content, and a
 * configuration that does not hold it, which is one whose activity menu has never had a full page, is
 * still refused, because a configuration holds a picture only where one of its programs draws it.
 */
export function growFourSlotMenu(
  start: Container, menu: number, kind: FourSlotMenuKind, firstRowList: number, codes: readonly number[],
  font: number,
): { container: Container; bound: number } {
  let current = start;
  let nextRow = firstRowList;
  const page = modeRecords(current)?.[menu]?.pages.at(-1);
  const pages = modeRecords(current)?.[menu]?.pages.length ?? 0;
  const list = page === undefined ? undefined : taggedList(current, page.list);
  if (page === undefined || list === undefined) throw new ComposeError('a menu lost its page');
  const read = menuLayout(current, list.entries);
  if (read === undefined) throw new ComposeError('a menu page changed layout');
  // A page that binds nothing reads as either layout, so only a page with places can be the wrong kind, and
  // an empty one takes its kind's, section 379.
  if (read.used > 0 && read.rows !== menuOnRows(kind)) throw new ComposeError(`menu ${menu} is not a ${kind}`);
  const layout = read.used > 0 ? read
    : { rows: menuOnRows(kind), used: 0, capacity: menuOnRows(kind) ? FOUR_SLOT_ROWS.length : FOUR_SLOT_ITEMS.length };
  if (layout.used >= layout.capacity) throw new ComposeError(`menu ${menu}'s last page is full`);
  // The page as it is has to be the built one, so the growth below starts from a page the builder owns.
  const before = menuPageDifference(current, fourSlotMenuChrome(current, kind), menu, pages - 1);
  if (before !== undefined) throw new ComposeError(`menu ${menu}'s last page is not the page built for it: ${before}`);
  // Refused before anything moves: a page whose new place count needs a picture the configuration lacks.
  const wanted = fourSlotMenuChrome(current, kind);
  if ((layout.used + 1 > 1 ? wanted.several : wanted.one) === undefined) {
    throw new ComposeError(`menu ${menu} would hold ${layout.used + 1} places on a page, and the configuration `
      + `holds no picture a ${kind} page of that many draws`);
  }
  const entries = list.entries.length;
  // The scans the new item is bound to: the next corner, or both buttons of the next row.
  const scans = layout.rows
    ? [...(FOUR_SLOT_ROWS[layout.used] as readonly number[])]
    : [(FOUR_SLOT_ITEMS[layout.used] as (typeof FOUR_SLOT_ITEMS)[number]).scan];
  // The list grows by the new entries, each running a row list of its own, and is written back
  // whole in the stored order, so a new bottom right lands between top left and top right.
  const grow = (listStart: number): void => {
    const width = 4;
    // An empty list is the wide form's two zero bytes, `taggedListBytes`, which the narrow list of one
    // entry replaces whole; a list with entries is narrow, a count and four bytes an entry. An empty menu,
    // which only a configuration of ours holds, is where the first case arises, section 377.
    const extent = taggedListExtent(current.blob, listStart);
    if (extent === undefined || extent.count !== entries || (extent.wide && entries > 0)) {
      throw new ComposeError(`menu ${menu}'s page list is not the narrow form of its ${entries} entries`);
    }
    const end = listStart + extent.length;
    const kept = Array.from({ length: entries }, (_, k) =>
      current.blob.slice(listStart + 1 + width * k, listStart + 1 + width * (k + 1)));
    const added = scans.map((scan) => {
      const row = nextRow;
      nextRow += 1;
      return new Writer(width).u8((KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan).u16(row)
        .u8(ACTION_LIST_INDEX_OPCODE).bytes;
    });
    const all = [...kept, ...added].sort((a, b) =>
      FOUR_SLOT_STORED_ORDER.indexOf((a[0] as number) & SCAN_MASK)
        - FOUR_SLOT_STORED_ORDER.indexOf((b[0] as number) & SCAN_MASK));
    const hole = relocate(current, end, 1 + width * all.length - extent.length);
    hole.bytes[listStart] = all.length;
    all.forEach((one, k) => hole.bytes.set(one, listStart + 1 + width * k));
    current = parse(hole.bytes);
  };
  const pageIndex = modePages(current).findIndex((one) => one.address === page.address);
  const copyOff = pageListCopies(current)[pageIndex];
  if (copyOff === undefined) throw new ComposeError('a menu page has no pool copy');
  grow(copyOff);
  const moved = modeRecords(current)?.[menu]?.pages.at(-1);
  const listOff = moved === undefined ? undefined : current.blobOffsetOf(moved.list);
  if (listOff === undefined) throw new ComposeError('a menu page list moved out of reach');
  grow(listOff);

  const target = modeRecords(current)?.[menu]?.pages.at(-1);
  const program = target === undefined ? undefined : screenProgram(current, target.program);
  const bar = program?.findLastIndex((one) => one.opcode === SCREEN_DRAW_IMAGE_AT);
  if (target === undefined || program === undefined || bar === undefined || bar < 0) {
    throw new ComposeError('a menu page program has no closing bar to draw above');
  }
  // Where the builder places the label, one line in the caller's font.
  const placed = menuLabelPlaces(current, layout.rows, layout.used, { font, lines: [[...codes]] })[0];
  if (placed === undefined) throw new ComposeError('a label was placed nowhere');
  // A font select only where the page has another font in effect at the bar: the compiler never
  // selects the font already selected, 0 of the 820 selects on the four arch 14 configurations.
  const inEffect = program.slice(0, bar).findLast((one) => one.opcode === SCREEN_SELECT_FONT)?.operands[0];
  const drawn = new Uint8Array([
    ...(inEffect === font ? [] : [SCREEN_SELECT_FONT, font]),
    SCREEN_TEXT_INLINE, placed.x, placed.y, ...codes, 0,
  ]);
  // The font the bottom word is drawn in, which the label must not take from it: a page whose title and
  // bottom word share a font selects none before the word, which on an empty menu of ours, the only page
  // with no label, leaves the label's font in effect there. So the word's font is selected again after the
  // closing bar, as the builder does. Logitech's menus never hold a page with no label, section 377.
  const tail = program.slice(bar + 1);
  const wordFont = program.slice(0, bar).findLast((one) => one.opcode === SCREEN_SELECT_FONT)?.operands[0];
  const reselect = font !== wordFont && tail[0]?.opcode !== SCREEN_SELECT_FONT && wordFont !== undefined
    ? new Uint8Array([SCREEN_SELECT_FONT, wordFont]) : new Uint8Array(0);
  const insertAt = (program[bar] as ScreenInstruction).start;
  const reselectAt = insertAt + (program[bar] as ScreenInstruction).length;
  if (reselect.length > 0) {
    const reselectHole = relocate(current, reselectAt, reselect.length);
    reselectHole.bytes.set(reselect, reselectAt);
    current = parse(reselectHole.bytes);
  }
  const programHole = relocate(current, insertAt, drawn.length);
  programHole.bytes.set(drawn, insertAt);
  current = parse(programHole.bytes);

  // The background the page draws now, built, and read after the insertion so no address is stale.
  const chrome = fourSlotMenuChrome(current, kind);
  const want = layout.used + 1 > 1 ? chrome.several : chrome.one;
  const last = modeRecords(current)?.[menu]?.pages.at(-1);
  const first = last === undefined ? undefined : screenProgram(current, last.program)?.[0];
  if (want === undefined || first?.opcode !== SCREEN_DRAW_IMAGE) {
    throw new ComposeError(`menu ${menu}'s grown page has no background to draw`);
  }
  if (bitmapReference(first) !== want) {
    current.blob.set(new Writer(3).u24(want).bytes, first.start + first.length - 3);
    current = parse(current.blob);
  }
  const after = menuPageDifference(current, fourSlotMenuChrome(current, kind), menu, pages - 1);
  if (after !== undefined) throw new ComposeError(`menu ${menu}'s grown page is not the page built for it: ${after}`);
  return { container: current, bound: nextRow - firstRowList };
}

/**
 * Where a two row list's pages draw their counter, `n`, `/`, `m`, on the title's line: x `0x63`,
 * `0x6A` and `0x6F`, a single digit page number included, where a corner page draws it at
 * `FOUR_SLOT_COUNTER_X`. On every two row device list page of the four arch 14 user configurations and
 * `h650_plasma_base`, section 285; measured again by `paginateFourSlot`'s test.
 */
export const TWO_ROW_COUNTER_X: readonly [number, number, number] = [0x63, 0x6a, 0x6f];

/**
 * The most pages a menu composed here may reach: its counter is drawn as one digit either side of
 * the slash, and a compiled mode of ten pages or more moves the whole counter left, section 285,
 * which nothing here writes.
 */
export const FOUR_SLOT_MAX_PAGES = 9;

/**
 * The texts a page opened here draws by reference where the compiler has drawn the same codes before,
 * the title and the bottom word, and the ones it draws inline, the counter and the label. The two
 * inline kinds are section 312's kept difference, and were section 294's until an activity's own list
 * was built, section 352, which points every text it can: `paginateFourSlot` restates every counter
 * through `pageTexts`, which keeps the borrowers of an inline text it changes, and a new label has no
 * copy anywhere to point at.
 */
const NEW_PAGE_POINTED: ReadonlySet<string> = new Set(['title', 'bottom']);

/**
 * A new last page on an arch 14 menu whose last page is full, holding the one item being added, and
 * every page of the menu then counting to the new total: a device list's, section 312, and the
 * activity menu's, section 316. The arch 14 counterpart of the Harmony One's `composeMenuPage`, and
 * **the page is built**, section 334, `todo-compile-650.md` 6.2.9: `menuPageParts` for the menu's kind,
 * which is every page of every menu of the thirteen compiles, `checkFourSlotMenuPages`. Until then the
 * page copied its chrome, the instructions above its title and below its labels, off the menu's own last
 * page.
 *
 * What is built, by kind, `fourSlotMenuChrome`: the background of a page holding one place, the device
 * mode pages' one item picture on a corner device list, the two row list's own picture, or the activity
 * menu's page of one activity, section 316; the queued corner program or none; the bars; the title and
 * the bottom word, "Activities" on the idle device list, "Activity" on an activity's own and on the two
 * row list, section 294, and "Devices" on the activity menu; the counter at the kind's positions, in the
 * menu's own counter font or the caller's `counterDefault` where no page of the menu draws one; the item
 * in the first place, top left at x 3 and y 40 or the top row's two buttons with the label centred at
 * y 35; and the six byte page record, the list then the program. The title font is read off the menu's
 * last page, and the label's font is the caller's, both `todo-compile-650.md` 6.2.12.
 *
 * **What does not change is as much a measurement as what does.** A menu's own record list is the same
 * on one page and on several, sections 312 and 316, so nothing like the Harmony One's deadened page turn
 * keys is undone here, section 275's rule being that model's; how an arch 14 remote turns a page is the
 * firmware's and unread.
 *
 * The insertions, each leaving the container parseable, in `composeMenuPage`'s order and for its
 * reasons: the pool copy right after the last page's copy, since copies pair with pages by position,
 * section 69; the list at the end of the page list run; the entry's count and a placeholder pointer;
 * the program and its six byte page record right after the last page's record, where the compiler
 * keeps them, which is the entry's own offset; and the swap. Every address the block embeds is read
 * after the last insertion below it. The last page is checked against the builder before anything
 * moves, and every page of the menu after the counters are restated.
 */
export function openFourSlotMenuPage(
  start: Container, menu: number, kind: FourSlotMenuKind, firstRowList: number, codes: readonly number[],
  font: number, counterDefault: number,
): { container: Container; bound: number } {
  let current = start;
  const recordOf = (): ModeRecord => {
    const record = modeRecords(current)?.[menu];
    if (record === undefined) throw new ComposeError(`menu ${menu} stopped reading`);
    return record;
  };
  const before = recordOf();
  const last = before.pages.at(-1);
  const lastList = last === undefined ? undefined : taggedList(current, last.list);
  if (last === undefined || lastList === undefined) throw new ComposeError(`menu ${menu} has no page`);
  const layout = menuLayout(current, lastList.entries);
  if (layout === undefined) throw new ComposeError(`menu ${menu}'s last page is neither arch 14 layout`);
  // A page that binds nothing reads as either layout, so only a page with places can be the wrong kind.
  if (layout.used > 0 && layout.rows !== menuOnRows(kind)) throw new ComposeError(`menu ${menu} is not a ${kind}`);
  if (layout.used < layout.capacity) {
    throw new ComposeError(`menu ${menu}'s last page has room, so the item goes on it and not on a new page`);
  }
  const total = before.pages.length + 1;
  if (total > FOUR_SLOT_MAX_PAGES) {
    throw new ComposeError(`menu ${menu} would have ${total} pages, and a counter of two digits is not composed`);
  }
  // Before anything moves: the last page is the built one, and the configuration holds the picture a
  // page of one place draws.
  const startChrome = fourSlotMenuChrome(current, kind);
  const was = menuPageDifference(current, startChrome, menu, before.pages.length - 1);
  if (was !== undefined) throw new ComposeError(`menu ${menu}'s last page is not the page built for it: ${was}`);
  if (startChrome.one === undefined) {
    throw new ComposeError(`no picture here is the background a ${kind} page of one place draws in ${startChrome.look}`);
  }
  const titleFont = menuPageContent(current, kind, menu, before.pages.length - 1).titleFont;
  // The counter's font: the menu's own where a page already draws one, which on every configuration
  // here is also the device mode pages' counter font that the caller passes as the default, for the
  // device lists and for the 7 multi page activity menus alike, section 316.
  let counterFont = counterDefault;
  for (const page of before.pages) {
    const number = textAt(screenProgram(current, page.program) ?? [], startChrome.counterX[0], FOUR_SLOT_TITLE_XY[1]);
    if (number?.font !== undefined) { counterFont = number.font; break; }
  }

  // The scans the item is bound to, the first place of the layout, and a list writer that hands each
  // binding the next row list, copy first and then the page's own, as `growFourSlotMenu` does.
  const scans = layout.rows
    ? [...(FOUR_SLOT_ROWS[0] as readonly number[])]
    : [(FOUR_SLOT_ITEMS[0] as (typeof FOUR_SLOT_ITEMS)[number]).scan];
  let nextRow = firstRowList;
  const pageList = (): Uint8Array => {
    const placed = scans.map((scan) => ({ scan, row: nextRow++ }))
      .sort((a, b) => FOUR_SLOT_STORED_ORDER.indexOf(a.scan) - FOUR_SLOT_STORED_ORDER.indexOf(b.scan));
    const bytes = new Writer(1 + 4 * placed.length).u8(placed.length);
    for (const one of placed) {
      bytes.u8((KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | one.scan).u16(one.row).u8(ACTION_LIST_INDEX_OPCODE);
    }
    return bytes.bytes;
  };

  // 1. The pool copy, right after the copy of the menu's last page.
  const lastIndex = modePages(current).findIndex((one) => one.address === last.address);
  const copyOff = pageListCopies(current)[lastIndex];
  const copyLength = copyOff === undefined ? undefined : taggedList(current, copyOff + current.flashBase)?.length;
  if (copyOff === undefined || copyLength === undefined) {
    throw new ComposeError(`menu ${menu}'s last page has no pool copy`);
  }
  const copyBytes = pageList();
  const copyHole = relocate(current, copyOff + copyLength, copyBytes.length);
  copyHole.bytes.set(copyBytes, copyOff + copyLength);
  current = parse(copyHole.bytes);

  // 2. The page's own list, at the end of the run every page list lives in. Nothing names it until
  // the page record exists, so its address is carried by arithmetic through the next two insertions.
  const listBytes = pageList();
  const listAt = Math.max(...modePages(current).map((page) => {
    const off = current.blobOffsetOf(page.list);
    const list = taggedList(current, page.list);
    return off === undefined || list === undefined ? 0 : off + list.length;
  }));
  const listHole = relocate(current, listAt, listBytes.length);
  listHole.bytes.set(listBytes, listAt);
  current = parse(listHole.bytes);

  // 3. The entry: its count, and a pointer at the last page until the new record exists.
  const grownRecord = recordOf();
  const entryOff = current.blobOffsetOf(grownRecord.address);
  const lastNow = grownRecord.pages.at(-1);
  if (entryOff === undefined || lastNow === undefined) throw new ComposeError(`menu ${menu}'s entry moved out of reach`);
  const slotAt = entryOff + 6 + 3 * grownRecord.pageCount;
  let pageListOff = listAt + (listAt >= slotAt ? 3 : 0);
  const entryHole = relocate(current, slotAt, 3);
  entryHole.bytes.set(new Writer(3).u24(lastNow.address).bytes, slotAt);
  entryHole.bytes.set(new Writer(2).u16(grownRecord.pageCount + 1).bytes, entryOff + 4);
  current = parse(entryHole.bytes);

  // 4. The block: the program, then the page record, at the entry's own offset, which is right after
  // the last page's record on every arch 14 mode here. The page is built now, from the chrome located
  // in the container as it is, so no address it embeds is stale.
  const record = recordOf();
  const lastReal = record.pages[record.pageCount - 2];
  const blockAt = current.blobOffsetOf(record.address);
  const lastRealOff = lastReal === undefined ? undefined : current.blobOffsetOf(lastReal.address);
  if (lastReal === undefined || blockAt === undefined || lastRealOff === undefined) {
    throw new ComposeError(`menu ${menu}'s pages moved out of reach`);
  }
  if (lastRealOff + lastReal.length !== blockAt) {
    throw new ComposeError(`menu ${menu}'s last page record does not end where its entry begins`);
  }
  const parts = menuPageParts(current, fourSlotMenuChrome(current, kind), {
    number: total, total, titleFont, counterFont, labels: [{ font, lines: [[...codes]] }],
  });
  const homes = inlineHomes(current);
  const programLength = menuPageBytes(parts, homes, NEW_PAGE_POINTED, (address) => address).length;
  const pageRecordLength = 6;
  const blockLength = programLength + pageRecordLength;
  const base = current.flashBase + blockAt;
  const shifted = (address: number): number => (address >= base ? address + blockLength : address);
  pageListOff += pageListOff >= blockAt ? blockLength : 0;
  const block = new Writer(blockLength);
  block.raw(menuPageBytes(parts, homes, NEW_PAGE_POINTED, shifted));
  // The page record: the list, which step 2 placed and this block's insertion moves by `blockLength`
  // when it lies above, then the program, which is the block's own first byte.
  block.u24(current.flashBase + pageListOff).u24(base);
  if (block.bytes.length !== blockLength) {
    throw new ComposeError(`the new page came to ${block.bytes.length} bytes against ${blockLength}`);
  }
  const blockHole = relocate(current, blockAt, blockLength);
  blockHole.bytes.set(block.bytes, blockAt);

  // 5. The swap: the entry's last pointer from the placeholder to the new page record.
  const placed = parse(blockHole.bytes);
  const swapRecord = modeRecords(placed)?.[menu];
  const swapOff = swapRecord === undefined ? undefined : placed.blobOffsetOf(swapRecord.address);
  if (swapRecord === undefined || swapOff === undefined) throw new ComposeError(`menu ${menu}'s entry moved out of reach`);
  placed.blob.set(new Writer(3).u24(base + programLength).bytes, swapOff + 6 + 3 * (swapRecord.pageCount - 1));

  // 6. Every page counts to the new total, and the page that had none, a menu's only page, gains one.
  // Then every page of the menu is the page built for it, the new one and the restated ones alike.
  const paged = paginateFourSlot(parse(placed.blob), menu, startChrome.counterX, counterFont);
  const after = fourSlotMenuChrome(paged, kind);
  for (let index = 0; index < total; index += 1) {
    const difference = menuPageDifference(paged, after, menu, index);
    if (difference !== undefined) throw new ComposeError(`menu ${menu}'s page ${index + 1} is not the page built for it: ${difference}`);
  }
  return { container: paged, bound: nextRow - firstRowList };
}

/**
 * Make an arch 14 menu's page counters agree with its page count: every page draws `n/m` on the
 * title's line, its own number and the total, at the three positions `x` the caller states, which are
 * per menu and not per layout, `fourSlotMenuChrome`'s `counterX`. **Arch 14's whole paging is the counter**, where the
 * Harmony One's `paginate` also restates a header total and undeadens two keys: an arch 14 page carries
 * its own chrome and calls no header, and a device list's record list is the same whatever its page
 * count, `openFourSlotMenuPage`, as the activity menu's is, section 316.
 *
 * A page with a counter has its number and total restated through `pageTexts`, so a total drawn by
 * reference is pointed at a string reading the new one, which the new page's own inline total
 * supplies, and an inline one is drawn again with its borrowers moved first. A page with none, which
 * is a menu's only page before it gained a second, gets one inserted right after its title, in the
 * counter font, the font in effect before being put back when what follows does not select its own.
 * That is the shape of every first page of a two page corner list on the 650 and the 700: title,
 * counter font, the three texts, label font, labels, and of every first page of a multi page activity
 * menu, section 316.
 */
function paginateFourSlot(
  start: Container, menu: number, x: readonly [number, number, number], counterFont: number,
): Container {
  if (start.architecture !== 14) throw new ComposeError('this paging is arch 14\'s');
  const t = pageTexts(start, menu);
  const y = FOUR_SLOT_TITLE_XY[1];
  const count = modeRecords(t.current)?.[menu]?.pages.length ?? 0;
  if (count < 2) throw new ComposeError(`menu ${menu} has one page, so there is nothing to count`);
  for (let k = 0; k < count; k += 1) {
    // Read again for every edit: each one moves what sits above it.
    const programOf = (): ScreenInstruction[] => {
      const page = modeRecords(t.current)?.[menu]?.pages[k];
      if (page === undefined) throw new ComposeError(`menu ${menu} lost page ${k + 1}`);
      return screenProgram(t.current, page.program) ?? [];
    };
    // One text of the counter restated, found again first since the edit before it may have moved it.
    const restateAt = (at: number, want: string, what: string): void => {
      const program = programOf();
      const found = textAt(program, at, y);
      if (found === undefined) throw new ComposeError(`menu ${menu}'s ${what} went missing`);
      t.restate(program[found.index] as ScreenInstruction, found.font, want, what);
    };
    const found = x.map((at) => textAt(programOf(), at, y));
    if (found.every((one) => one !== undefined)) {
      restateAt(x[0], String(k + 1), `page ${k + 1}'s number`);
      restateAt(x[2], String(count), `page ${k + 1}'s total`);
      continue;
    }
    if (found.some((one) => one !== undefined)) {
      throw new ComposeError(`menu ${menu}'s page ${k + 1} draws part of a counter, which is not restated`);
    }
    const program = programOf();
    const title = textAt(program, ...FOUR_SLOT_TITLE_XY);
    if (title === undefined) throw new ComposeError(`menu ${menu}'s page ${k + 1} draws no title to count after`);
    const after = program[title.index] as ScreenInstruction;
    const next = program[title.index + 1];
    const bytes: number[] = [];
    if (title.font !== counterFont) bytes.push(SCREEN_SELECT_FONT, counterFont);
    [String(k + 1), '/', String(count)].forEach((text, n) =>
      bytes.push(...t.drawn(x[n] as number, y, text, counterFont, counterFont)));
    if (title.font !== undefined && title.font !== counterFont && next?.opcode !== SCREEN_SELECT_FONT) {
      bytes.push(SCREEN_SELECT_FONT, title.font);
    }
    t.insert(after.start + after.length, bytes);
  }
  return t.current;
}

/*
 * ---- An arch 14 menu page, built, section 334 ----
 *
 * `todo-compile-650.md` 6.2.9. Until here a menu that grew took its new page's chrome off its own last
 * page, the instructions above the title and below the labels copied, and a page that grew from one item
 * to two took its background off one of the menu's full pages. Both are built now, the way section 330
 * built a device mode page's: the pictures by content per look, the queued program by the corner patch
 * it draws, the title and the bottom word by the menu's kind, the counter and the labels by the rules
 * sections 285, 312 and 316 measured, and the page record as six bytes. Every page of every menu of the
 * thirteen compiles is then the built page, `checkFourSlotMenuPages`, and a grown or opened page is
 * checked against the builder before it is returned.
 *
 * What is still read off the configuration: the **fonts** of the title, the counter and each label, which
 * are the configuration's own numbering of its font sets, `todo-compile-650.md` 6.2.12; which device list
 * is the idle one, read off base slot 14 the way the remote reaches it; and the pictures' and the texts'
 * **addresses**, since the bytes are the configuration's until chapter 9 builds them.
 */

/**
 * The four kinds of arch 14 menu, each drawing its own title and bottom word: the device list the key
 * under Devices opens while no activity runs, whose bottom word goes to the activities; the one each
 * activity has, section 294, whose bottom word goes back to it; the two row device list nothing enters,
 * section 326; and the activity menu.
 */
export type FourSlotMenuKind = 'idle device list' | 'activity device list' | 'two row device list' | 'activity menu';

export interface FourSlotMenu {
  menu: number;
  kind: FourSlotMenuKind;
}

/** A menu's title, on every page of every menu of its kind on the thirteen compiles. */
const MENU_TITLE: Readonly<Record<FourSlotMenuKind, string>> = {
  'idle device list': 'Devices',
  'activity device list': 'Devices',
  'two row device list': 'Devices',
  'activity menu': 'Activities',
};

/**
 * A menu's bottom word, the label of the key under the display's centre: on the idle list it goes to the
 * activities, on an activity's own list and on the two row list back to the activity, and on the activity
 * menu to the device list. Every page of every menu of its kind on the thirteen compiles.
 */
const MENU_BOTTOM_WORD: Readonly<Record<FourSlotMenuKind, string>> = {
  'idle device list': 'Activities',
  'activity device list': 'Activity',
  'two row device list': 'Activity',
  'activity menu': 'Devices',
};

/** Whether a menu kind lays a place out as a row of two buttons rather than as one corner. */
function menuOnRows(kind: FourSlotMenuKind): boolean {
  return kind === 'two row device list' || kind === 'activity menu';
}

/**
 * The device list the key under Devices opens while no activity runs, read the way the remote reaches
 * it: the activity menu maps that key's press through a base slot 14 record keyed by the activity
 * counter, section 330, and the record's case for the counter's idle value, its starting value, queues
 * entering the idle list. Read rather than built, since which list is the idle one is a mode number,
 * which is the description's order, section 324.
 */
export function idleDeviceList(c: Container): number {
  const menu = activityMenus(c).menu;
  const entry = menu === undefined ? undefined
    : modeRecords(c)?.[menu]?.entries.find((one) => one.tag === DEVICES_KEY_TAG);
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  const idle = counter?.record?.first;
  if (entry?.opcode !== MAP_VALUE_OPCODE || counter === undefined || idle === undefined
      || (entry.operand & 0xff) !== counter.index) {
    throw new ComposeError('the activity menu does not map the key under Devices through the activity counter');
  }
  const target = valueMaps(c)?.[entry.operand >> 8]?.entries.find(([key]) => key === idle)?.[1];
  const queued = target === undefined ? undefined : caseQueued(c, target);
  if (queued?.opcode !== ENTER_MODE) {
    throw new ComposeError(`record ${entry.operand >> 8} has no case for the idle value entering a device list`);
  }
  return queued.operand;
}

/**
 * Every arch 14 menu of a configuration with its kind: the device lists, `deviceListMenus`, each a corner
 * or a two row list by its first page, the corner one the key under Devices opens with no activity
 * running being the idle one; and the activity menu, `activityMenus`. An idle list with no row, in a
 * configuration with no device, is the one page binding nothing that key opens, section 375. Refused where
 * the idle list is neither, or where the configuration has no activity menu.
 */
export function fourSlotMenus(c: Container): FourSlotMenu[] {
  if (c.architecture !== 14) throw new ComposeError('the four slot menus are the Harmony 600, 650 and 700\'s alone');
  const idle = idleDeviceList(c);
  const out: FourSlotMenu[] = deviceListMenus(c).menus.map((menu) => {
    const first = modeRecords(c)?.[menu]?.pages[0];
    const layout = menuLayout(c, taggedList(c, first?.list ?? 0)?.entries ?? []);
    if (layout === undefined) throw new ComposeError(`device list ${menu} is neither arch 14 layout`);
    if (layout.rows) return { menu, kind: 'two row device list' as const };
    return { menu, kind: menu === idle ? 'idle device list' as const : 'activity device list' as const };
  });
  if (!out.some((one) => one.kind === 'idle device list')) {
    // A device list is found by its rows, and an idle list with none, a configuration with no device,
    // section 375, is found only through the activity menu's record, as here. Its page then binds nothing,
    // which is the one layout that cannot say it is a corner list, and every idle list is one, section 334.
    const pages = modeRecords(c)?.[idle]?.pages ?? [];
    const empty = pages.length === 1 && (taggedList(c, pages[0]?.list ?? 0)?.entries.length ?? -1) === 0;
    if (!empty || out.some((one) => one.menu === idle)) {
      throw new ComposeError(`mode ${idle}, which the key under Devices opens with no activity running, is not a corner device list`);
    }
    out.push({ menu: idle, kind: 'idle device list' });
  }
  const activities = activityMenus(c).menu;
  if (activities === undefined) throw new ComposeError('no activity menu here');
  out.push({ menu: activities, kind: 'activity menu' });
  return out;
}

/** What a menu page of one kind is drawn with in one configuration, every piece built or located. */
export interface FourSlotMenuChrome {
  kind: FourSlotMenuKind;
  look: string;
  /**
   * The background of a page holding one place and of one holding more, as picture addresses; a place
   * is a corner, or a row of two buttons. Undefined where the configuration does not hold the picture,
   * and then a page needing it is refused.
   */
  one: number | undefined;
  several: number | undefined;
  /** The base slot 11 entry the page queues with `0x73`, or undefined for a page queueing nothing. */
  corner: number | undefined;
  topBar: number;
  bottomBar: number;
  title: string;
  counterX: readonly [number, number, number];
  bottom: { word: string; font: number; codes: number[]; x: number };
}

/**
 * A menu page's chrome for one kind of menu, built, `todo-compile-650.md` 6.2.9:
 *
 * * **the look is the device mode pages'**, `deviceModeChrome`, so the two bars are the same pictures;
 * * **the background**: a corner device list's is the device mode pages' own, the one item picture on a
 *   page holding one device and the crossed one on a page holding more; a two row device list draws its
 *   look's `rows` picture on every page whatever it holds; the activity menu its look's
 *   `activitiesSingle` on a page holding one activity and `activitiesFull` on one holding two;
 * * **the queued program**: a corner device list queues the device mode pages' corner program; a two row
 *   device list queues nothing; the activity menu queues the corner program that draws its look's
 *   `activitiesPatch`, which is the second on the colour looks and the first on the monochrome one;
 * * **the title and the bottom word** by the kind, `MENU_TITLE` and `MENU_BOTTOM_WORD`, the word in the
 *   bottom word font and centred, `bottomWord`;
 * * **the counter** at `TWO_ROW_COUNTER_X` on a two row device list and at `FOUR_SLOT_COUNTER_X` on every
 *   other menu, the activity menu included although its layout is two row, section 316.
 */
export function fourSlotMenuChrome(c: Container, kind: FourSlotMenuKind): FourSlotMenuChrome {
  const device = deviceModeChrome(c);
  if (inOurLook(c)) return ourMenuChrome(c, kind, device);
  const look = DEVICE_PAGE_LOOKS.find((one) => one.name === device.look) as DevicePageLook;
  const pictures = picturesByContent(c);
  const held = (key: string, role: string): number | undefined => {
    const found = pictures.get(key) ?? [];
    if (found.length > 1) throw new ComposeError(`${look.name}'s ${role} picture is stored ${found.length} times`);
    return found[0];
  };
  let one: number | undefined;
  let several: number | undefined;
  let corner: number | undefined;
  if (kind === 'idle device list' || kind === 'activity device list') {
    one = device.single;
    several = device.crossed;
    corner = device.corner;
  } else if (kind === 'two row device list') {
    one = held(look.rows, 'two row list');
    several = one;
  } else {
    one = held(look.activitiesSingle, 'activity menu one activity');
    several = held(look.activitiesFull, 'activity menu');
    const patches = pictures.get(look.activitiesPatch) ?? [];
    const drawing = cornerPrograms(c).filter((index) => programDraws(c, index, patches));
    if (drawing.length !== 1) {
      throw new ComposeError(`${drawing.length} corner programs draw ${look.name}'s activity menu corner patch, not one`);
    }
    corner = drawing[0];
  }
  return {
    kind, look: look.name, one, several, corner,
    topBar: device.topBar, bottomBar: device.bottomBar,
    ...fourSlotMenuWords(c, kind),
  };
}

/**
 * A menu page's chrome in our look, section 377. The state colours give a menu its state's look, section 366:
 * the idle device list and the activity menu the idle state's, every other device list the device state's.
 * The idle pair is read off the menu's own first page, which every configuration holds, an empty one
 * included: its background, the first `0x02` it draws, and the program it queues. A page of ours draws one
 * flat background whatever it holds, so that is the background of a page of one place and of several. A two
 * row device list queues no program, as on Logitech's pages; the other device lists queue the device pages'.
 */
function ourMenuChrome(c: Container, kind: FourSlotMenuKind, device: DeviceModeChrome): FourSlotMenuChrome {
  let one: number | undefined = device.crossed;
  let corner: number | undefined = kind === 'two row device list' ? undefined : device.corner;
  if (kind === 'idle device list' || kind === 'activity menu') {
    const mode = fourSlotMenus(c).find((menu) => menu.kind === kind)?.menu;
    const first = mode === undefined ? undefined : modeRecords(c)?.[mode]?.pages[0];
    const program = first === undefined ? [] : screenProgram(c, first.program) ?? [];
    const background = program.find((ins) => ins.opcode === SCREEN_DRAW_IMAGE);
    const queued = program.filter((ins) => ins.opcode === SCREEN_QUEUE_INSTRUCTION && ins.operands[2] === RUN_SCREEN_PROGRAM);
    if (background === undefined || queued.length !== 1) {
      throw new ComposeError(`the ${kind}'s first page draws no background or queues other than one program`);
    }
    one = u24(background.operands, background.operands.length - 3);
    corner = (queued[0] as ScreenInstruction).operands[0]! | ((queued[0] as ScreenInstruction).operands[1]! << 8);
  }
  return {
    kind, look: device.look, one, several: one, corner,
    topBar: device.topBar, bottomBar: device.bottomBar,
    ...fourSlotMenuWords(c, kind),
  };
}

/**
 * The part of a menu kind's chrome that is words and places, not pictures: the title, the counter's
 * places and the bottom word spelled in the first font of the title's size that spells it, centred.
 * Split out of `fourSlotMenuChrome` for the screen records of section 356, which build a page from
 * pictures their description names and so need only this half.
 */
export function fourSlotMenuWords(
  c: Container, kind: FourSlotMenuKind,
): Pick<FourSlotMenuChrome, 'title' | 'counterX' | 'bottom'> {
  const word = MENU_BOTTOM_WORD[kind];
  return {
    title: MENU_TITLE[kind],
    counterX: kind === 'two row device list' ? TWO_ROW_COUNTER_X : fourSlotCounterX(c),
    bottom: { word, ...bottomWord(c, word) },
  };
}

/** One place's label on a menu page: the font it is drawn in and its lines, as glyph codes. */
export interface FourSlotMenuLabel {
  font: number;
  lines: number[][];
}

/**
 * What a menu page holds, which is what the builder does not decide: its number and its menu's page
 * count, the title and counter fonts, and per place in fill order its label. The fonts are read off the
 * configuration, `todo-compile-650.md` 6.2.12.
 */
export interface FourSlotMenuPageContent {
  number: number;
  total: number;
  titleFont: number;
  counterFont: number;
  labels: FourSlotMenuLabel[];
}

/** One instruction of a built menu page, before it is spelled as bytes. */
export type MenuPart =
  | { op: 'image'; address: number }
  | { op: 'queue'; program: number }
  | { op: 'bar'; at: readonly number[]; address: number }
  | { op: 'font'; font: number }
  | { op: 'text'; x: number; y: number; codes: number[]; role: 'title' | 'counter' | 'label' | 'bottom' | 'fixed' }
  | { op: 'end' };

/**
 * Where a place's label lines go: on a corner page as section 285 measured, a left label from x 3 and a
 * right one ending at 125, one line at y 40 or 90 and two from 15 higher with the second one font height
 * below; on a two row page, a menu of rows, each line centred at y 35 or 79. A two line label on a two
 * row page is refused, since no menu page of the thirteen draws one.
 */
function menuLabelPlaces(
  c: Container, rows: boolean, place: number, label: FourSlotMenuLabel,
): { x: number; y: number; codes: number[] }[] {
  const set = (fontSets(c) ?? [])[label.font];
  if (set === undefined) throw new ComposeError(`the config does not carry font ${label.font}`);
  if (rows) {
    if (label.lines.length !== 1) throw new ComposeError('a two line label on a two row menu page is not composed: no compile shows one');
    const codes = label.lines[0] as number[];
    return [{ x: Math.floor((FOUR_SLOT_SCREEN_WIDTH - textWidth(c, set, codes)) / 2), y: TWO_ROW_LABEL_Y[place] as number, codes }];
  }
  const item = FOUR_SLOT_ITEMS[place];
  if (item === undefined || label.lines.length < 1 || label.lines.length > 2) {
    throw new ComposeError(`a corner page has no place ${place} for a label of ${label.lines.length} lines`);
  }
  const top = FOUR_SLOT_LABEL_Y[item.row] - (label.lines.length > 1 ? TWO_LINE_RISE : 0);
  return label.lines.map((codes, k) => ({
    x: item.column === 0 ? FOUR_SLOT_LEFT_X : FOUR_SLOT_RIGHT_END - textWidth(c, set, codes),
    y: top + k * set.height,
    codes,
  }));
}

/**
 * A menu page built, as parts: the background for how many places it holds, the queued program where
 * the kind queues one, the top bar, the title, the counter where the menu has several pages, the labels
 * in fill order, the bottom bar, the bottom word and the end, **a font being selected only where another
 * is in effect**, which is the compiler's rule, section 289.
 */
export function menuPageParts(c: Container, chrome: FourSlotMenuChrome, page: FourSlotMenuPageContent): MenuPart[] {
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const setOf = (font: number): FontSet => {
    const set = (fontSets(c) ?? [])[font];
    if (set === undefined) throw new ComposeError(`the config does not carry font ${font}`);
    return set;
  };
  const places = page.labels.length;
  const background = places > 1 ? chrome.several : chrome.one;
  if (background === undefined) {
    throw new ComposeError(`the configuration holds no picture for a ${chrome.kind} page of ${places} `
      + `place${places === 1 ? '' : 's'} in ${chrome.look}`);
  }
  if (places > (menuOnRows(chrome.kind) ? FOUR_SLOT_ROWS.length : FOUR_SLOT_ITEMS.length)) {
    throw new ComposeError(`a ${chrome.kind} page holds no ${places} places`);
  }
  const parts: MenuPart[] = [{ op: 'image', address: background }];
  if (chrome.corner !== undefined) parts.push({ op: 'queue', program: chrome.corner });
  parts.push({ op: 'bar', at: DEVICE_PAGE_TOP_BAR_AT, address: chrome.topBar });
  let font: number | undefined;
  const select = (want: number): void => {
    if (want !== font) parts.push({ op: 'font', font: want });
    font = want;
  };
  select(page.titleFont);
  parts.push({
    op: 'text', ...{ x: FOUR_SLOT_TITLE_XY[0], y: MENU_TOP_LINE_Y },
    codes: codesFor(map, c, setOf(page.titleFont), chrome.title, page.titleFont), role: 'title',
  });
  if (page.total > 1) {
    if (page.total > FOUR_SLOT_MAX_PAGES) throw new ComposeError('a page counter of two digits is not composed on a menu');
    select(page.counterFont);
    [String(page.number), '/', String(page.total)].forEach((text, k) => parts.push({
      op: 'text', x: chrome.counterX[k] as number, y: MENU_TOP_LINE_Y,
      codes: codesFor(map, c, setOf(page.counterFont), text, page.counterFont), role: 'counter',
    }));
  }
  page.labels.forEach((label, place) => {
    for (const line of menuLabelPlaces(c, menuOnRows(chrome.kind), place, label)) {
      select(label.font);
      parts.push({ op: 'text', ...line, role: 'label' });
    }
  });
  parts.push({ op: 'bar', at: DEVICE_PAGE_BOTTOM_BAR_AT, address: chrome.bottomBar });
  select(chrome.bottom.font);
  parts.push({ op: 'text', x: chrome.bottom.x, y: MENU_BOTTOM_LINE_Y, codes: chrome.bottom.codes, role: 'bottom' });
  parts.push({ op: 'end' });
  return parts;
}

/**
 * A built page's bytes. A text whose role is in `pointed` is drawn by reference to its `inlineHomes`
 * copy where the configuration has one, which is what the compiler does with every text it has drawn
 * before; every other text is drawn inline. `shifted` maps an address as it is to where it lands once
 * the page is inserted.
 */
export function menuPageBytes(
  parts: readonly MenuPart[], homes: ReadonlyMap<string, number>, pointed: ReadonlySet<string>,
  shifted: (address: number) => number,
): Uint8Array {
  return menuPartsBytes(
    parts,
    (part) => (pointed.has(part.role) ? homes.get(part.codes.join(',')) : undefined),
    (one) => [...new Writer(3).u24(shifted(one)).bytes],
  );
}

/**
 * The one encoder of a built page's parts, which `menuPageBytes` and the screen records of
 * `screenrecords.ts`, section 356, both spell through. `home` gives the value a text is drawn by
 * reference to, or undefined to draw it inline; `address` spells a three byte address field for a
 * value at byte `at` of the program, for the part it belongs to, which is how a caller that writes addresses itself and a caller
 * that leaves them to the frame as references share it; `inline`, where given, is told where an inline
 * text's glyph codes start, which is the address a later text drawing the same codes points at.
 */
export function menuPartsBytes(
  parts: readonly MenuPart[],
  home: (part: Extract<MenuPart, { op: 'text' }>) => number | undefined,
  address: (value: number, at: number, part: MenuPart) => readonly number[],
  inline?: (part: Extract<MenuPart, { op: 'text' }>, at: number) => void,
): Uint8Array {
  const out: number[] = [];
  for (const part of parts) {
    if (part.op === 'image') {
      out.push(SCREEN_DRAW_IMAGE, ...DEVICE_PAGE_BACKGROUND_AT);
      out.push(...address(part.address, out.length, part));
    } else if (part.op === 'queue') {
      out.push(SCREEN_QUEUE_INSTRUCTION, part.program & 0xff, part.program >> 8, RUN_SCREEN_PROGRAM);
    } else if (part.op === 'bar') {
      out.push(SCREEN_DRAW_IMAGE_AT, ...part.at);
      out.push(...address(part.address, out.length, part));
    } else if (part.op === 'font') {
      out.push(SCREEN_SELECT_FONT, part.font);
    } else if (part.op === 'end') {
      out.push(SCREEN_END);
    } else {
      const target = home(part);
      if (target === undefined) {
        out.push(SCREEN_TEXT_INLINE, part.x, part.y);
        inline?.(part, out.length);
        out.push(...part.codes, 0);
      } else {
        out.push(SCREEN_TEXT_AT, part.x, part.y);
        out.push(...address(target, out.length, part));
      }
    }
  }
  return new Uint8Array(out);
}

/**
 * What a menu page of the configuration holds, read for the builder: its fonts and its labels. Each text
 * below the title line and above the bottom line is a label, given to a place by its cell on a corner
 * page and by its row on a two row one, in the font in effect where it is drawn. The places have to be a
 * prefix of the fill order and as many as the page's own list binds, which is a closure between the
 * screen and base slot 6, so a page whose labels and bindings disagree is refused.
 */
export function menuPageContent(
  c: Container, kind: FourSlotMenuKind, menu: number, index: number, read: ValueReader = blobReader(c),
): FourSlotMenuPageContent {
  const record = modeRecords(c)?.[menu];
  const page = record?.pages[index];
  const program = page === undefined ? undefined : screenProgram(c, page.program);
  const list = page === undefined ? undefined : taggedList(c, page.list);
  const layout = list === undefined ? undefined : menuLayout(c, list.entries);
  if (record === undefined || program === undefined || layout === undefined) {
    throw new ComposeError(`menu ${menu}'s page ${index + 1} does not read as an arch 14 menu page`);
  }
  // A page that binds nothing reads as either layout, so only a page with places can be the wrong kind.
  if (layout.used > 0 && layout.rows !== menuOnRows(kind)) throw new ComposeError(`menu ${menu}'s page ${index + 1} is not a ${kind} page`);
  const rows = menuOnRows(kind);
  // Where the font in effect was selected, read as a value only where a text that is the page's own
  // content is drawn in it: the bottom word's font is the builder's, `bottomWord`.
  let fontAt: number | undefined;
  const fontNow = (): number | undefined => (fontAt === undefined ? undefined : read(fontAt));
  let titleFont: number | undefined;
  let counterFont: number | undefined;
  const byPlace = new Map<number, FourSlotMenuLabel>();
  for (const one of program) {
    if (one.opcode === SCREEN_SELECT_FONT) { fontAt = one.start + 1; continue; }
    if (one.opcode !== SCREEN_TEXT_AT && one.opcode !== SCREEN_TEXT_INLINE) continue;
    const [x, y] = [one.operands[0] as number, one.operands[1] as number];
    if (y === MENU_TOP_LINE_Y) {
      if (x === FOUR_SLOT_TITLE_XY[0]) titleFont = fontNow();
      else counterFont ??= fontNow();
      continue;
    }
    if (y === MENU_BOTTOM_LINE_Y) continue;
    const cell = fourSlotCellAt(x, y);
    const place = cell === undefined ? undefined : rows ? FOUR_SLOT_ITEMS[cell]?.row : cell;
    const codes = textValues(c, one, read);
    const font = fontNow();
    if (place === undefined || codes === undefined || font === undefined) {
      throw new ComposeError(`menu ${menu}'s page ${index + 1} draws a text at ${x}, ${y} no place owns`);
    }
    const label = byPlace.get(place);
    if (label === undefined) byPlace.set(place, { font, lines: [[...codes]] });
    else if (label.font !== font) throw new ComposeError(`menu ${menu}'s page ${index + 1} draws one label in two fonts`);
    else label.lines.push([...codes]);
  }
  const labels = Array.from({ length: byPlace.size }, (_, k) => byPlace.get(k));
  if (labels.some((one) => one === undefined) || labels.length !== layout.used) {
    throw new ComposeError(`menu ${menu}'s page ${index + 1} labels ${byPlace.size} places and binds ${layout.used}`);
  }
  if (titleFont === undefined) throw new ComposeError(`menu ${menu}'s page ${index + 1} draws no title`);
  return {
    number: index + 1, total: record.pages.length, titleFont,
    // A menu of one page draws no counter, and its font is then nothing the page shows.
    counterFont: counterFont ?? titleFont,
    labels: labels as FourSlotMenuLabel[],
  };
}

/**
 * A menu page of the configuration against the page built from what it holds: instruction for
 * instruction, every instruction that is not a text byte for byte, and every text by its place and its
 * glyph codes, whether drawn inline or by reference. Returns the first difference, or undefined.
 * Whether a reference points at the compiler's own copy is `checkFourSlotMenuPages`' question, since a
 * page composed here draws inline what the compiler would point at.
 */
function menuPageDifference(c: Container, chrome: FourSlotMenuChrome, menu: number, index: number): string | undefined {
  const page = modeRecords(c)?.[menu]?.pages[index];
  const program = page === undefined ? undefined : screenProgram(c, page.program);
  if (page === undefined || program === undefined) return 'the page does not read';
  return partsDifference(c, menuPageParts(c, chrome, menuPageContent(c, chrome.kind, menu, index)), program)
    ?? pageRecordDifference(c, page);
}

/**
 * A program against built parts: instruction for instruction, every instruction that is not a text byte
 * for byte, and every text by its place and its glyph codes, whether drawn inline or by reference.
 * Returns the first difference, or undefined. The menu pages' comparison of section 334, and the start
 * up screens' since section 336.
 */
export function partsDifference(c: Container, parts: readonly MenuPart[], program: readonly ScreenInstruction[]): string | undefined {
  if (parts.length !== program.length) return `${program.length} instructions where ${parts.length} are built`;
  const same = (address: number): number => address;
  for (let k = 0; k < parts.length; k += 1) {
    const part = parts[k] as MenuPart;
    const one = program[k] as ScreenInstruction;
    if (part.op === 'text') {
      const codes = textGlyphs(c, one);
      if ((one.opcode !== SCREEN_TEXT_AT && one.opcode !== SCREEN_TEXT_INLINE) || one.operands[0] !== part.x
          || one.operands[1] !== part.y || codes === undefined || [...codes].join(',') !== part.codes.join(',')) {
        return `instruction ${k} is not the ${part.role} built at ${part.x}, ${part.y}`;
      }
      continue;
    }
    const want = [...menuPageBytes([part], new Map(), new Set(), same)].join(',');
    if ([...c.blob.subarray(one.start, one.start + one.length)].join(',') !== want) {
      return `instruction ${k} is not the ${part.op} built`;
    }
  }
  return undefined;
}

/** A page record against the one a composer writes: the list, then the program, six bytes. */
export function pageRecordDifference(c: Container, page: ModePage): string | undefined {
  const recordOff = c.blobOffsetOf(page.address);
  if (recordOff === undefined || page.length !== 6 || u24(c.blob, recordOff) !== page.list
      || u24(c.blob, recordOff + 3) !== page.program) {
    return 'its page record is not the list then the program in six bytes';
  }
  return undefined;
}

/**
 * Every page of every arch 14 menu of the configuration against the page built for it, refused with the
 * page and the first difference; and every text those pages draw by reference pointing at its
 * `inlineHomes` copy and every text drawn inline being that copy, which holds on a compiler's pages and
 * not on a composed one's. Returns the number of pages checked. The calibration of section 334.
 */
export function checkFourSlotMenuPages(c: Container, options: { homes?: boolean } = {}): number {
  const homes = options.homes === false ? undefined : inlineHomes(c);
  let checked = 0;
  for (const { menu, kind } of fourSlotMenus(c)) {
    const chrome = fourSlotMenuChrome(c, kind);
    const record = modeRecords(c)?.[menu];
    (record?.pages ?? []).forEach((page, index) => {
      const where = `${kind} ${menu}'s page ${index + 1}`;
      const difference = menuPageDifference(c, chrome, menu, index);
      if (difference !== undefined) throw new ComposeError(`${where}: ${difference}`);
      if (homes !== undefined) assertTextsAtHome(c, homes, screenProgram(c, page.program) ?? [], where);
      checked += 1;
    });
  }
  return checked;
}

/**
 * Every text a program draws by reference pointing at its `inlineHomes` copy, and every text it draws
 * inline being that copy, which holds on a compiler's pages and not on a composed one's; refused with
 * the text and `where`. Section 334's half of the menu page check, and the start up screens' since
 * section 336.
 */
export function assertTextsAtHome(
  c: Container, homes: ReadonlyMap<string, number>, program: readonly ScreenInstruction[], where: string,
): void {
  for (const one of program) {
    const codes = textGlyphs(c, one);
    if (codes === undefined) continue;
    const home = homes.get([...codes].join(','));
    const at = one.opcode === SCREEN_TEXT_INLINE ? c.flashBase + one.start + 3 : referencedStringAddress(one);
    if (at !== home) {
      throw new ComposeError(`${where} draws '${[...codes].join(',')}' ${one.opcode === SCREEN_TEXT_INLINE ? 'inline' : 'by reference'} `
        + 'away from the copy the compiler points at');
    }
  }
}

/**
 * A page's tagged list on arch 14: the lists its items run, bound in `FOUR_SLOT_ITEMS` order and
 * stored in `FOUR_SLOT_STORED_ORDER`, as all 184 device pages of section 285 are.
 *
 * **A page that binds nothing is two bytes and not one**, `00 00`: a first byte of zero is what says
 * the list is in the wide form, whose count follows, so a lone `00` reads as a wide list whose count is
 * the next structure's first byte. All 258 empty page lists on the four arch 14 user configurations
 * are `00 00`, section 290, and the one byte form cost a whole run of list copies to the reader.
 */
export function fourSlotPageList(itemLists: readonly number[]): Uint8Array {
  return menuPageListBytes(itemLists.map((list, k) => ({ scan: FOUR_SLOT_ITEMS[k]?.scan as number, list })));
}

/**
 * A page's tagged list from its bindings, each the press of a scan running a list, stored in
 * `FOUR_SLOT_STORED_ORDER`: the encoder `fourSlotPageList` and the screen records of section 356 share,
 * the second binding the two buttons of a two row page's row as well as a corner's one. Empty, it is
 * the two byte `00 00` the comment above explains.
 */
export function menuPageListBytes(bindings: readonly { scan: number; list: number }[]): Uint8Array {
  if (bindings.length === 0) return new Uint8Array([0, 0]);
  const bytes = new Writer(1 + 4 * bindings.length).u8(bindings.length);
  const placed = [...bindings].sort((a, b) => FOUR_SLOT_STORED_ORDER.indexOf(a.scan) - FOUR_SLOT_STORED_ORDER.indexOf(b.scan));
  for (const one of placed) {
    if (!FOUR_SLOT_STORED_ORDER.includes(one.scan)) throw new ComposeError(`scan ${one.scan} is no place on a menu page`);
    bytes.u8((KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | one.scan).u16(one.list).u8(ACTION_LIST_INDEX_OPCODE);
  }
  return bytes.bytes;
}
