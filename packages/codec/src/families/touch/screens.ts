/**
 * The Harmony One's screens: a device's page, a row on the activity menu and an activity's working
 * screen, each the One's half of a composer `compose.ts` dispatches through the family registry. Plan
 * 007's touch family, cut out of `compose.ts` unchanged.
 */
import type { WithChoices } from '../family.ts';
import { TOUCH_CHOICES, type TouchChoices } from './choices.ts';
import { STATE_WRITE_BASE } from '../../actions.ts';
import { u24 } from '../../bytes.ts';
import { Writer } from '../../emit.ts';
import {
  composeMenuPage, DEVICE_LABEL_DROP, DEVICE_PAGE_SCANS, DEVICE_PAGE_SLOTS, DEVICE_ROW_FONT,
  MENU_EDGE_SCANS, MENU_ICON_OFFSET, MENU_LABEL_X, MENU_ROW1_BG, MENU_ROW1_LABEL_Y, MENU_ROW3_BG,
  MENU_ROW3_LABEL_Y, MENU_ROW_FONT, MENU_ROW_PITCH, menuRowCapacity, MODE_TITLE_X, MODE_TITLE_Y, paginate,
  MENU_ROW_SCAN, pictureDrawnAt, withHitPage,
} from '../../families/touch/menus.ts';
import { type FontSet, fontSets } from '../../font.ts';
import { archSlot, Container, type Instruction, parse, SCAN_MASK } from '../../gspm.ts';
import {
  activityBindings, activityNames, activityScreens, type ActivityScreens, BEEP_OPCODE, ENTER_MODE, SCREEN_ITEM_BEEP,
  SELECT_BINDING_SET, SELECT_BINDING_SET_MASK,
} from '../../inventory.ts';
import { deviceModeMaps, KEY_EVENT_PRESS, KEY_EVENT_SHIFT, SCAN_CODE_MASK } from '../../inventory.ts';
import { relocate } from '../../relocate.ts';
import {
  bitmapAt, SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_END, SCREEN_QUEUE_INSTRUCTION, SCREEN_RETURN, SCREEN_SELECT_FONT,
  SCREEN_SWITCH_NARROW, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, screenProgram,
} from '../../screen.ts';
import {
  ACTION_LIST_INDEX_OPCODE, HANDLER_TAG_ENTER, handlerSets, type ModePage, modePages, type ModeRecord, modeRecords,
  modeTable, pageListCopies, type TaggedEntry, taggedList, taggedListBytes, taggedListPools,
} from '../../sections.ts';
import { SILENT_WRITE } from '../../shared/activities.ts';
import { ACTION_TABLE_SLOT, ComposeError, restamped } from '../../shared/core.ts';
import { appendTableEntries } from '../../shared/infrared.ts';
import {
  ACTIVITY_MENU_MARKER_VALUE, appendValueMapCase, type ComposeActivityRowOptions, type ComposeActivityScreenOptions,
  type ComposedActivityRow, type ComposedActivityScreen, type ComposedScreen, type ComposeRow,
  type ComposeScreenOptions, deviceListMenus,
} from '../../shared/menus.ts';
import { codesFor, fontThatSpells, headerOf, textWidth } from '../../shared/spelling.ts';
import { padFontOf, TOUCH_PAD_WIDTH, type TouchLabelLine, touchLabelLength, touchLabelLines } from './labels.ts';
import { type TouchArea, type TouchPage, touchPages } from '../../tables.ts';
import { characterMap } from '../../text.ts';
import { EDGE_CODES, LIST_ROW_PITCH, PANEL_LEFT, touchOwner, touchPageOf } from '../../touch.ts';

/**
 * The Harmony One's half of `composeDeviceScreen`, whose docstring describes it.
 */
export function composeTouchDeviceScreen(
  c: Container, label: string, rows: readonly ComposeRow[], options: WithChoices<ComposeScreenOptions, TouchChoices> = {},
): ComposedScreen {
  const titleFont = (options.choices ?? TOUCH_CHOICES).deviceTitleFont;
  if (rows.length === 0) throw new ComposeError('a device page has at least one row');
  // A page holds six rows, and more rows take more pages, filled in order with the last page short, the
  // way the menus page, section 239; `paginate` then numbers them, `todo-compile-one.md` 1.2.
  const perPage = DEVICE_PAGE_SCANS.length;
  const pages: { rows: readonly ComposeRow[]; first: number }[] = [];
  for (let first = 0; first < rows.length; first += perPage) pages.push({ rows: rows.slice(first, first + perPage), first });
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const sets = fontSets(c) ?? [];
  // The pads are drawn in the font the configuration's own device pages draw theirs in, section 394. Where no
  // device page is found there is nothing to read it off, and a guess is refused: on Logitech's compile of a
  // Samsung test device, whose keys send nothing `deviceModeMaps` counts, font 9 is another subset of
  // letters than the font 7 its pads are drawn in, and cannot spell `Mode`.
  const padFont = padFontOf(c);
  if (padFont === undefined) throw new ComposeError('no device page shows which font a pad is drawn in');
  const titleSet = sets[titleFont];
  const rowSet = sets[padFont];
  const menuSet = sets[MENU_ROW_FONT];
  if (titleSet === undefined || rowSet === undefined || menuSet === undefined) {
    throw new ComposeError('the config does not carry the three fonts the layout uses');
  }
  const titleCodes = codesFor(map, c, titleSet, label, titleFont);
  const menuCodes = codesFor(map, c, menuSet, label, MENU_ROW_FONT);
  // Every label laid out now, against the container its font set was read from, section 242: the lines and
  // their places are the content's, so no insertion below changes them.
  const rowLines = rows.map((row, k) => {
    const [x, y] = DEVICE_PAGE_SLOTS[k % DEVICE_PAGE_SLOTS.length] as readonly [number, number];
    return touchLabelLines(c, map, rowSet, padFont, row.label, { x, y });
  });

  // The menus and the new mode's index, refused before anything moves.
  const found = deviceListMenus(c);
  if (found.menus.length === 0 || found.marker === undefined) {
    throw new ComposeError('no device list menu found to grow');
  }
  const table = modeTable(c);
  if (table === undefined) throw new ComposeError('base slot 6 states no table');
  const mode = table.addresses.length;

  // 1. The menu row's action list: beep, enter the new mode, mark device mode. One list, shared
  // by every menu, the way the corpus shares its bottom key list.
  const actionSlot = archSlot(c.architecture as number, ACTION_TABLE_SLOT);
  const actionTable = c.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const rowList = actionTable.values.length;
  const rowBytes = new Writer(1 + 3 * 3).u8(3)
    .u16(SCREEN_ITEM_BEEP.operand).u8(SCREEN_ITEM_BEEP.opcode)
    .u16(mode).u8(ENTER_MODE)
    .u16(found.marker.operand).u8(found.marker.opcode);
  const rowAt = actionTable.start;
  const rowHole = relocate(c, rowAt, rowBytes.bytes.length);
  rowHole.bytes.set(rowBytes.bytes, rowAt);
  let current = parse(appendTableEntries(
    parse(rowHole.bytes), actionSlot, [c.flashBase + rowAt]));

  // 2. The mode's table entry, pointing at an existing mode until the block exists. Everything
  // below inserts bytes somewhere, and a census only restamps addresses a reader walks to, so the
  // new mode has to be reachable **before** any address it will embed is final: the placeholder
  // keeps every intermediate parse honest, and the pointer is swapped in place at the end, after
  // the last relocation the block's own addresses have to survive.
  const stale = modeTable(current);
  if (stale === undefined) throw new ComposeError('base slot 6 stopped reading');
  const placeholderEntry = stale.addresses[0];
  if (placeholderEntry === undefined) throw new ComposeError('a config with no modes has no menus');
  const tableAt = stale.start + stale.length;
  const tableHole = relocate(current, tableAt, 3);
  tableHole.bytes.set(new Writer(3).u24(placeholderEntry).bytes, tableAt);
  tableHole.bytes.set(new Writer(3).u24(mode + 1).bytes, stale.start);
  current = parse(tableHole.bytes);

  // 3. The page list's second copy, at the end of the last pool: the walk only accepts a run that
  // holds a base slot 9 set, section 69's own reading, so the copy extends the pool that exists
  // rather than starting one of its own. Appended to the last pool because the copies pair with
  // the pages positionally and the new page will be the last page of the last mode.
  // One list per page, the copies in page order, so they pair with the pages positionally.
  const pageLists = pages.map((page) => {
    const listBytes = new Writer(1 + 4 * page.rows.length);
    listBytes.u8(page.rows.length);
    page.rows.forEach((row, k) => {
      listBytes.u8(0x80 | (DEVICE_PAGE_SCANS[k] as number)).u16(row.list).u8(ACTION_LIST_INDEX_OPCODE);
    });
    return listBytes.bytes;
  });
  for (const listBytes of pageLists) {
    const lastPool = taggedListPools(current).at(-1);
    if (lastPool === undefined) throw new ComposeError('no copy pool to extend');
    const copyAt = lastPool.end;
    const copyHole = relocate(current, copyAt, listBytes.length);
    copyHole.bytes.set(listBytes, copyAt);
    current = parse(copyHole.bytes);
  }

  // 4. The page's own list, into base slot 8 where every page list lives, at the end of the run.
  // The lists go in as one run, in page order, so each one's address is final once the run is written.
  const pageEnds = modePages(current).map((page) => {
    const off = current.blobOffsetOf(page.list);
    const list = taggedList(current, page.list);
    return off === undefined || list === undefined ? 0 : off + list.length;
  });
  const listAt = Math.max(...pageEnds);
  const listsLength = pageLists.reduce((sum, one) => sum + one.length, 0);
  const listHole = relocate(current, listAt, listsLength);
  const pageListAddresses: number[] = [];
  let listOff = listAt;
  for (const one of pageLists) {
    listHole.bytes.set(one, listOff);
    listOff += one.length;
  }
  current = parse(listHole.bytes);
  for (let k = 0, at = current.flashBase + listAt; k < pageLists.length; at += (pageLists[k] as Uint8Array).length, k += 1) {
    pageListAddresses.push(at);
  }

  // 5. The mode block, one hole where the mode region ends and the copy pool begins: the record's
  // empty list, the chrome program the page calls, the page's program, the page record and the
  // entry, in the order every corpus mode keeps them. Last of the insertions on purpose: the
  // picture and list addresses it embeds are final now, and every later shift happens with the
  // mode reachable, so the census restamps them like any other stated address.
  const records = modeRecords(current);
  if (records === undefined) throw new ComposeError('base slot 6 does not read');
  let bar: number | undefined;
  for (const record of records) {
    bar = pictureDrawnAt(current, record.start + record.length, 0, 0);
    if (bar !== undefined) break;
  }
  // The pads and the hit page come off an existing device page with all six pads drawn. The device pages
  // are the modes the device list enters, `deviceModeMaps`; a page's lead byte names its hit page, whose
  // number is the configuration's own (10 on the everyday One, 26 on Logitech's compile of the Denon and the
  // LG, 4 on the factory file), so it is read here rather than assumed.
  const slots: number[] = [];
  let lead: number | undefined;
  for (const mode of new Set(deviceModeMaps(current).map((one) => one.mode))) {
    for (const page of records[mode]?.pages ?? []) {
      const one = DEVICE_PAGE_SLOTS.map(([x, y]) => pictureDrawnAt(current, page.program, x, y));
      if (page.lead !== undefined && one.every((address) => address !== undefined)) {
        slots.push(...(one as number[]));
        lead = page.lead;
        break;
      }
    }
    if (slots.length > 0) break;
  }
  if (bar === undefined || slots.length === 0 || lead === undefined) {
    throw new ComposeError('no existing page carries the pictures the layout reuses');
  }
  // The mode's own key map, the record's list. Logitech's One device modes are one shape, measured on all 76
  // device modes of its compiles: 49 entries in one order, a press of 46 keys bound to a list or to nothing
  // and three handlers, tags 0x06, 0x07 and 0x2D, run on entering and leaving the mode and for its screen;
  // a mode of one page adds a press of the two page turn keys bound to nothing, 51 entries, and orders the
  // handlers otherwise. The handlers' lists are the same on every device of a compile, so the shape is taken
  // from an existing device mode of as many pages, `deviceModeMaps`, its handlers kept and every key bound
  // afresh: to the list `compiled.keys` names for its scan, or to nothing. Logitech gives each device a copy
  // of the handler lists with the same content; this one shares the existing device's, which runs the same
  // instructions. A configuration with no device mode of the kind keeps the empty list, as before
  // `todo-compile-one.md` 1.2.10, and one asked for keys refuses rather than inventing the shape.
  const keyTemplate = [...new Set(deviceModeMaps(current).map((one) => one.mode))]
    .map((one) => records[one])
    .find((record) => record !== undefined && (record.pages.length === 1) === (pages.length === 1));
  const keys = options.compiled?.keys;
  if (keyTemplate === undefined && keys !== undefined && keys.size > 0) {
    throw new ComposeError(`no device mode of ${pages.length === 1 ? 'one page' : 'several pages'} here to take a key map's shape from`);
  }
  const keyEntries = (keyTemplate?.entries ?? []).map((entry) => {
    if (entry.tag >> KEY_EVENT_SHIFT !== KEY_EVENT_PRESS) return { tag: entry.tag, operand: entry.operand, opcode: entry.opcode };
    const list = keys?.get(entry.tag & SCAN_CODE_MASK);
    return list === undefined ? { tag: entry.tag, operand: 0, opcode: 0 } : { tag: entry.tag, operand: list, opcode: ACTION_LIST_INDEX_OPCODE };
  });
  const keyList = taggedListBytes(keyEntries);
  const chromeLength = 6 + 2 + (1 + 2 + titleCodes.length + 1) + 2;
  // Each page's program: the call to the shared header, the row font, a pad and a label per row, the end.
  const programLengths = pages.map((page) => 4 + 2
    + page.rows.reduce((sum, _, k) => sum + 6 + touchLabelLength(rowLines[page.first + k] as TouchLabelLine[]), 0) + 1);
  const programsLength = programLengths.reduce((sum, one) => sum + one, 0);
  // The entry is six bytes and a pointer per page, `modeRecords`: one page's pointer alone left a paged mode
  // unreadable, which nothing ran until the test setup's Plasma, `todo-compile-one.md` 1.2.9.
  const blockLength = keyList.length + chromeLength + programsLength + 7 * pages.length + (6 + 3 * pages.length);
  const blockAt = Math.max(...records.map((record) => {
    const off = current.blobOffsetOf(record.address);
    return off === undefined ? 0 : off + record.entryLength;
  }));
  const base = current.flashBase + blockAt;
  // The block embeds addresses read before its own hole existed, and everything above the hole
  // moves by its length when the hole opens. The census cannot restamp them because the block is
  // not written yet, so they are shifted here, once, the same arithmetic the census applies to a
  // stated address.
  const shifted = (address: number): number => (address >= base ? address + blockLength : address);
  const chrome = new Writer(chromeLength);
  chrome.u8(SCREEN_DRAW_IMAGE).u8(0).u8(0).u24(shifted(bar));
  chrome.u8(SCREEN_SELECT_FONT).u8(titleFont);
  chrome.u8(SCREEN_TEXT_INLINE).u8(MODE_TITLE_X).u8(MODE_TITLE_Y);
  titleCodes.forEach((code) => chrome.u8(code));
  chrome.u8(0).u8(SCREEN_RETURN).u8(SCREEN_END);
  const blockHole = relocate(current, blockAt, blockLength);
  const chromeAddress = base + keyList.length;
  const programAddresses: number[] = [];
  let programAt = chromeAddress + chrome.bytes.length;
  for (const length of programLengths) {
    programAddresses.push(programAt);
    programAt += length;
  }
  const pageAddress = programAt;
  const entryAddress = pageAddress + 7 * pages.length;
  const block = new Writer(blockLength);
  keyList.forEach((byte) => block.u8(byte));
  chrome.bytes.forEach((byte) => block.u8(byte));
  for (const page of pages) {
    block.u8(SCREEN_CALL).u24(chromeAddress);
    block.u8(SCREEN_SELECT_FONT).u8(padFont);
    page.rows.forEach((_, k) => {
      const [x, y] = DEVICE_PAGE_SLOTS[k] as readonly [number, number];
      block.u8(SCREEN_DRAW_IMAGE).u8(x).u8(y).u24(shifted(slots[k] as number));
      const width = bitmapAt(current, slots[k] as number)?.stride ?? 0;
      if (width !== TOUCH_PAD_WIDTH) throw new ComposeError(`a pad box is ${width} pixels wide, not the ${TOUCH_PAD_WIDTH} the labels are laid out on`);
      // The label's lines, each centred on its own width with the odd pixel left, section 394. A name the
      // rule cannot place was refused when the lines were laid out, above.
      for (const line of rowLines[page.first + k] as TouchLabelLine[]) {
        block.u8(SCREEN_TEXT_INLINE).u8(line.x).u8(line.y);
        line.codes.forEach((code) => block.u8(code));
        block.u8(0);
      }
    });
    block.u8(SCREEN_END);
  }
  pages.forEach((_, k) => {
    block.u8(lead).u24(shifted(pageListAddresses[k] as number)).u24(programAddresses[k] as number);
  });
  block.u8(0).u24(base).u16(pages.length);
  pages.forEach((_, k) => block.u24(pageAddress + 7 * k));
  blockHole.bytes.set(block.bytes, blockAt);

  // The swap, in place on the same bytes: the table's last pointer moves from the placeholder to
  // the entry the block now carries, and from here every reader reports the new mode.
  const swapped = parse(blockHole.bytes);
  const grownTable = modeTable(swapped);
  if (grownTable === undefined) throw new ComposeError('base slot 6 stopped reading');
  swapped.blob.set(new Writer(3).u24(entryAddress).bytes,
                   grownTable.start + 3 + 3 * mode);
  current = parse(swapped.blob);
  // Several pages are numbered and the page turn keys left live, the menus' own step, section 293.
  if (pages.length > 1) current = paginate(parse(restamped(current.blob)), mode);

  // 6. One row on each menu's last page: the bottom key moves from the two row layout's scan to
  // the three row one's, the lead byte says which layout is in force, the list and its pool copy
  // both grow by the row, and the program draws the label above the third row's background.
  const pagesAdded: number[] = [];
  for (const menu of found.menus) {
    let record = modeRecords(current)?.[menu];
    let page = record?.pages.at(-1);
    if (record === undefined || page === undefined) throw new ComposeError('a menu lost its page');
    let hits = touchPages(current)?.records ?? [];
    const areas = hits[page.lead as number]?.areas.map((area) => area.code) ?? [];
    const capacity = menuRowCapacity(areas);
    if (capacity === undefined) {
      throw new ComposeError(`menu ${menu}'s last page uses a hit page this does not know: `
        + `[${areas.join(', ')}]`);
    }
    if (capacity === 3) {
      // Full, so a new page rather than a new row: pages of three and the last page short is the
      // one layout Logitech's compiler produces, section 239.
      current = composeMenuPage(current, menu, rowList, label, options.iconLike);
      pagesAdded.push(menu);
      continue;
    }
    // A page of `capacity` rows grows by one: the new row is row `capacity`, counted from 0, on the scan the
    // bottom key had, and the bottom key moves one scan up. This took a page of two rows alone until the
    // test setup's third device landed on a page of one, `todo-compile-one.md` 1.2.9.
    const k = capacity;
    // The page it becomes: **this menu's own** page of one row more, taken from an earlier page of the
    // same record rather than by searching the table. A config carries several hit pages offering
    // the same set, so a search finds one of them and not the one the menu is drawn against.
    let grown = record.pages
      .map((one) => one.lead as number)
      .find((lead) => menuRowCapacity(hits[lead]?.areas.map((area) => area.code) ?? []) === k + 1);
    if (grown === undefined) {
      // A menu that never held that many rows has no such page to take, and then the page is this one
      // grown by a row: over Logitech's nineteen One compiles a device menu's hit page of one, two or three
      // rows is one geometry each, held by 7, 5 and 13 of them, and each is the one before with a row added
      // one step below its last, the bottom key and the edges unmoved, `test/menupage.test.ts`. The step is
      // read off a page of this menu with two rows or more.
      // `withHitPage` takes an identical page where the configuration already has one.
      const now = new Map((hits[page.lead as number]?.areas ?? []).map((area) => [area.code, area]));
      const rowsNow = Array.from({ length: k }, (_, r) => now.get(MENU_ROW_SCAN + r));
      const [bottom, left, right] = [MENU_ROW_SCAN + k, ...MENU_EDGE_SCANS].map((code) => now.get(code));
      const tall = record.pages.map((one) => hits[one.lead as number]?.areas ?? [])
        .find((one) => (menuRowCapacity(one.map((area) => area.code)) ?? 0) >= 2);
      const step = tall === undefined ? undefined
        : (tall.find((area) => area.code === MENU_ROW_SCAN + 1)?.y ?? NaN) - (tall.find((area) => area.code === MENU_ROW_SCAN)?.y ?? NaN);
      if (rowsNow.some((one) => one === undefined) || bottom === undefined || left === undefined || right === undefined
          || step === undefined || Number.isNaN(step)) {
        throw new ComposeError(`menu ${menu}'s ${k} row hit page is not a layout a row is added to`);
      }
      const last = rowsNow[k - 1] as TouchArea;
      const wanted: [number, TouchArea][] = [
        ...rowsNow.map((one, r): [number, TouchArea] => [MENU_ROW_SCAN + r, one as TouchArea]),
        [MENU_ROW_SCAN + k, { ...last, y: last.y + step }],
        [MENU_ROW_SCAN + k + 1, bottom], [MENU_EDGE_SCANS[0], left], [MENU_EDGE_SCANS[1], right],
      ];
      const made = withHitPage(current, wanted);
      current = made.container;
      grown = made.lead;
      // The insertion may have moved the menu's page, so it is read again.
      record = modeRecords(current)?.[menu];
      page = record?.pages.at(-1);
      if (record === undefined || page === undefined) throw new ComposeError('a menu lost its page');
      hits = touchPages(current)?.records ?? [];
    }
    const list = taggedList(current, page.list);
    if (list === undefined || list.entries.some((entry) => entry.flags !== undefined)) {
      throw new ComposeError('a menu page list is not the narrow form the corpus uses');
    }
    // The list and its copy, the same edit twice: retag the bottom key one scan up, append the row on
    // the scan it had, bump the count. The copy grows first, because it sits below the original and
    // growing it moves the original.
    // **Why the scan moves at all**: a code is an area's position in its hit page, section 275, so
    // a two row page stores row, row, bottom key and numbers them 48, 49, 50, and the three row
    // page it becomes numbers the same bottom key 51. Nothing about the key changes.
    // It is the one entry on the bottom key's scan, whatever it runs: nine menus bind opcode `0x72` bare
    // there and one wraps it in a beeping action list, so the retag keys on the scan and not on the
    // opcode, and a page with no single entry there is refused as a layout this does not know.
    // This said "the flip" until 7 September 2026 and that was wrong twice: the key is the left of
    // the two below the display, and `0x72` maps a state variable's value, `actions.ts`.
    const bottomScan = MENU_ROW_SCAN + k;
    const flips = list.entries.filter((entry) => entry.tag === (0x80 | bottomScan)).length;
    if (flips !== 1) {
      throw new ComposeError(`a menu page binds scan ${bottomScan} ${flips} times, not the one bottom key expected`);
    }
    const entries = list.entries.length;
    const grow = (listStart: number): void => {
      const at = listStart + 1 + 4 * entries;
      const hole = relocate(current, at, 4);
      hole.bytes.set(new Writer(4).u8(0x80 | bottomScan).u16(rowList).u8(ACTION_LIST_INDEX_OPCODE).bytes, at);
      hole.bytes[listStart] = entries + 1;
      for (let e = 0; e < entries; e += 1) {
        const entryAt = listStart + 1 + 4 * e;
        if (hole.bytes[entryAt] === (0x80 | bottomScan)) hole.bytes[entryAt] = 0x80 | (bottomScan + 1);
      }
      current = parse(hole.bytes);
    };
    const pageAddress = page.address;
    const pageIndex = modePages(current).findIndex((one) => one.address === pageAddress);
    const copyOff = pageListCopies(current)[pageIndex];
    if (copyOff === undefined) throw new ComposeError('a menu page has no pool copy');
    grow(copyOff);
    const moved = modeRecords(current)?.[menu]?.pages.at(-1);
    const listOff = moved === undefined ? undefined : current.blobOffsetOf(moved.list);
    if (listOff === undefined) throw new ComposeError('a menu page list moved out of reach');
    grow(listOff);

    // The lead byte, in place, after the relocations so nothing moves it again.
    const after = modeRecords(current)?.[menu]?.pages.at(-1);
    const afterOff = after === undefined ? undefined : current.blobOffsetOf(after.address);
    if (afterOff === undefined) throw new ComposeError('a menu page moved out of reach');
    current.blob[afterOff] = grown;
    current = parse(current.blob);

    // The program: the new row's background and the device's label, inserted where the closing
    // switch begins, so the switch and its arms slide up and every stated target is restamped by
    // the census like any other address. Row `k` sits `k` row pitches below the first.
    const grownRecord = modeRecords(current)?.[menu];
    const target = grownRecord?.pages.at(-1);
    if (grownRecord === undefined || target === undefined) {
      throw new ComposeError('a menu page moved out of reach');
    }
    const rowBg: readonly [number, number] = [MENU_ROW1_BG[0], MENU_ROW1_BG[1] + k * MENU_ROW_PITCH];
    const rowLabelY = MENU_ROW1_LABEL_Y + k * MENU_ROW_PITCH;
    // The background is read here, after the grows above moved it, and not at the top of the
    // loop: a picture address read before an insertion below it is stale by that insertion. It is the one
    // the first page draws at that row, or else its second row's: the second and third rows draw one picture
    // on 195 of 195 three row pages of Logitech's nineteen One compiles, the first row another.
    const firstProgram = grownRecord.pages[0]?.program ?? 0;
    const bg = pictureDrawnAt(current, firstProgram, ...rowBg)
      ?? pictureDrawnAt(current, firstProgram, MENU_ROW1_BG[0], MENU_ROW1_BG[1] + MENU_ROW_PITCH);
    if (bg === undefined) {
      throw new ComposeError('a menu has no first page to take the row background from');
    }
    // Nine of the ten menus close with a switch drawing the bottom bar and one closes plain, so
    // the insertion point is the final instruction either way: the rows sit above whatever the
    // tail draws, and the switch's arms slide up with their targets restamped by the census.
    const program = screenProgram(current, target.program);
    const closing = program?.at(-1);
    if (program === undefined || closing === undefined
        || (closing.opcode !== SCREEN_SWITCH_NARROW && closing.opcode !== SCREEN_END)) {
      throw new ComposeError('a menu page program does not end the way the corpus ends one');
    }
    const drawn = new Writer(6 + 2 + 1 + 2 + menuCodes.length + 1);
    // The background sits above the insertion and moves with it, and these bytes are written
    // after the hole opens, so the shift is applied here like the block's, not by the census.
    const grownBg = bg + (bg >= current.flashBase + closing.start ? drawn.bytes.length : 0);
    drawn.u8(SCREEN_DRAW_IMAGE).u8(rowBg[0]).u8(rowBg[1]).u24(grownBg);
    // The font is selected here rather than inherited: nine menus still hold the row font where
    // the insertion lands and the tenth has moved on to the page indicator's font by its end.
    drawn.u8(SCREEN_SELECT_FONT).u8(MENU_ROW_FONT);
    drawn.u8(SCREEN_TEXT_INLINE).u8(MENU_LABEL_X).u8(rowLabelY);
    menuCodes.forEach((code) => drawn.u8(code));
    drawn.u8(0);
    const programHole = relocate(current, closing.start, drawn.bytes.length);
    programHole.bytes.set(drawn.bytes, closing.start);
    current = parse(programHole.bytes);
  }

  return { bytes: restamped(current.blob), mode, menus: found.menus, rowList, pagesAdded };
}

/**
 * The activity menu's own page layout, measured on four arch 12 (Harmony One) configurations,
 * section 275, and **it is not the device list's**.
 *
 * That was the composer's first assumption and it was wrong. A device list page offers three row
 * rectangles, **one** bottom key and the two rectangles beside the display; an activity menu page
 * offers up to three rows, **two** bottom keys and the same two beside it. So the two menus share a
 * pixel grid and nothing else, and `composeMenuPage` correctly refuses an activity page as a layout
 * it does not know.
 *
 * **The difference is which of the two physical bottom buttons the page enables**, and that is the
 * whole of it: a device list page carries a rectangle for the left one only, 29 of 29, where an
 * activity menu page carries both, 6 of 6. Neither carries a page flip, because a Harmony One turns
 * pages with the buttons beside the display and no page binds those, 0 of 778.
 *
 * Three rows, at these panel coordinates, identical on all four configurations: the same rectangle
 * stepped down by `ACTIVITY_ROW_PITCH`, with the top row first. The bottom keys sit at `y` 271 and
 * the edges at 1400, neither of which this composer ever writes.
 */
const ACTIVITY_ROWS = 3;

/**
 * The rows' panel pitch and their left edge, both **already derived** and imported rather than
 * measured again here: section 125 established that a hit rectangle's `LIST_ROW_PITCH` and a screen
 * program's `SCREEN_ROW_PITCH` are one distance measured in two units. That the activity menu's rows
 * sit on that same grid is what this section adds, and it is checked over eleven rows.
 */
const ACTIVITY_ROW_PITCH = LIST_ROW_PITCH;

const ACTIVITY_ROW_LEFT = PANEL_LEFT;

/**
 * A hit page numbers its areas **by position**: the first is scan 48, the second 49, and so on, with
 * the two edges carrying 46 and 47 wherever they sit. That is why which scan is which row differs
 * per page, section 125, and it is what makes a row safe to append: a new area added after the last
 * content one takes the next unused scan and moves nobody else's.
 */
const MENU_FIRST_SCAN = 48;

/** One activity menu page as this composer needs to see it: its rows, its keys and its edges. */
interface ActivityPageLayout {
  /** The row rectangles, top of the screen first, which is descending panel `y`. */
  rows: TouchArea[];
  /** Everything else the page offers except the two edges, in stored order. */
  keys: TouchArea[];
  edges: TouchArea[];
  /** The areas in stored order, which is what assigns the scan codes. */
  content: TouchArea[];
}

/**
 * Read a page's hit rectangles as an activity menu layout, or undefined where it is not one.
 *
 * A row is recognised by **geometry against the page's own widest rectangle**, rather than by scan
 * code, because the scan is positional and varies per page: on one configuration the three rows are
 * scans 50, 51 and 52 on the first page and 48, 49 and 50 on the second. The rows are the areas
 * sharing the widest one's `x`, `width` and `height`, which separates them from the two bottom keys,
 * that being half width and taller, and from the edges, that being narrow and tall.
 */
function activityPageLayout(page: TouchPage): ActivityPageLayout | undefined {
  const edges = page.areas.filter((area) => area.code === MENU_EDGE_SCANS[0]
    || area.code === MENU_EDGE_SCANS[1]);
  if (edges.length !== 2) return undefined;
  const content = page.areas.filter((area) => !edges.includes(area));
  if (content.length === 0) return undefined;
  // The widest content rectangle is a row: a row spans the list, a bottom key spans half of it.
  const widest = content.reduce((a, b) => (b.width > a.width ? b : a));
  const isRow = (area: TouchArea): boolean => area.x === widest.x && area.width === widest.width
    && area.height === widest.height;
  const rows = content.filter(isRow).sort((a, b) => b.y - a.y);
  const keys = content.filter((area) => !isRow(area));
  if (rows.length === 0 || rows.length > ACTIVITY_ROWS) return undefined;
  // The rows must sit on the grid, so a page whose wide rectangles are something else is refused
  // rather than grown into a fourth row nothing draws.
  const top = rows[0] as TouchArea;
  if (!rows.every((area, k) => area.y === top.y - ACTIVITY_ROW_PITCH * k)) return undefined;
  // And a row starts at the panel's own left edge, which is what separates it from any other wide
  // rectangle a page might carry. Eleven of eleven rows across four configurations, section 275.
  if (top.x !== ACTIVITY_ROW_LEFT) return undefined;
  return { rows, keys, edges, content };
}

/**
 * The icon an activity menu row draws, for the row labelled `iconLike`, so a new television activity
 * wears the television icon the configuration already carries.
 *
 * **The rank comes from where the label is drawn and never from the scan code**, which is the whole
 * difference from `menuIconLike` beside it: that one computes `scan - 48`, correct for a device list
 * page whose rows are the lowest scans, and wrong here because an activity page's scan codes are
 * positions in its hit page, section 275. `activityNames` states the label's own pixel position, and
 * a row's label and its background sit one row pitch apart per rank, so the rank divides out.
 */
function activityRowIcon(c: Container, iconLike: string): number {
  const { program, rank } = activityRowPlace(c, iconLike);
  return activityRowIconAt(c, program, rank, iconLike);
}

/** Where the row labelled `iconLike` is: the program of its page, and its rank on that page. */
function activityRowPlace(c: Container, iconLike: string): { program: number; rank: number } {
  const named = activityNames(c).filter((one) => one.name === iconLike && one.at !== undefined);
  if (named.length !== 1) {
    throw new ComposeError(
      `${named.length} activity menu rows are labelled ${iconLike}, so there is no one icon to copy`);
  }
  const at = (named[0] as { at: { x: number; y: number } }).at;
  const rank = (at.y - MENU_ROW1_LABEL_Y) / MENU_ROW_PITCH;
  if (!Number.isInteger(rank) || rank < 0 || rank >= ACTIVITY_ROWS) {
    throw new ComposeError(`the row labelled ${iconLike} is drawn at y ${at.y}, off the row grid`);
  }
  const page = modePages(c)[(named[0] as { page: number }).page];
  if (page === undefined) throw new ComposeError(`the row labelled ${iconLike} has no page`);
  return { program: page.program, rank };
}

/** The icon a row at `rank` of the page whose program is `program` draws. */
function activityRowIconAt(c: Container, program: number, rank: number, iconLike: string): number {
  const icon = pictureDrawnAt(c, program,
    MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0], MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1] + MENU_ROW_PITCH * rank);
  if (icon === undefined) {
    throw new ComposeError(`the row labelled ${iconLike} draws no icon at rank ${rank}`);
  }
  return icon;
}

/**
 * The Harmony One's half of `composeActivityMenuRow`, after the shared prelude has found the menu and
 * its marker: one row on the menu's last page, a page added when it is full.
 */
export function composeTouchActivityRow(
  c: Container, label: string, set: number, menu: number, marker: Instruction,
  options: ComposeActivityRowOptions,
): ComposedActivityRow {

  let current = c;
  const recordOf = (): ModeRecord => {
    const record = modeRecords(current)?.[menu];
    if (record === undefined) throw new ComposeError(`the activity menu stopped reading`);
    return record;
  };
  const pageIndexOf = (): number => recordOf().pages.length - 1;
  const pageOf = (): ModePage => {
    const page = recordOf().pages.at(-1);
    if (page === undefined) throw new ComposeError('the activity menu has no page');
    return page;
  };

  // The layout, and the one refusal that decides whether this can run at all.
  const startLayout = activityPageLayout(
    touchPageOf(current, pageOf()) ?? { address: 0, areas: [], start: 0, length: 0 });
  if (startLayout === undefined) {
    throw new ComposeError("the activity menu's last page is not a row layout this knows");
  }
  // A full last page gets a new page after it, `composeActivityMenuPage`, and the label's font is then
  // read off the last row of the full page, which is what `rank` names below.
  const full = startLayout.rows.length >= ACTIVITY_ROWS;
  const rank = full ? ACTIVITY_ROWS : startLayout.rows.length;
  const scan = MENU_FIRST_SCAN + startLayout.content.length;

  // The label is spelled before anything moves, so an unspellable name refuses with the container
  // untouched rather than half grown.
  const startProgram = screenProgram(current, pageOf().program) ?? [];
  const rowFontOf = (program: readonly { opcode: number; operands: Uint8Array }[]): number => {
    // The font in effect where the **last row's** label is drawn, which is the font this row wants.
    // Read rather than tabulated: the corpus draws its rows in font 6, 7 and 10 across four configs.
    let font: number | undefined;
    for (const one of program) {
      if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0];
      if ((one.opcode === SCREEN_TEXT_AT || one.opcode === SCREEN_TEXT_INLINE)
          && one.operands[0] === MENU_LABEL_X
          && one.operands[1] === MENU_ROW1_LABEL_Y + MENU_ROW_PITCH * (rank - 1)) {
        if (font === undefined) break;
        return font;
      }
    }
    throw new ComposeError("the activity menu's page draws no row label this can copy a font from");
  };
  const map = characterMap(current);
  if (map === undefined) throw new ComposeError('the config carries no character map');
  const rowFont = fontThatSpells(current, map, label, rowFontOf(startProgram));
  const fontSet = (fontSets(current) ?? [])[rowFont];
  if (fontSet === undefined) {
    throw new ComposeError('the config does not carry the font the activity menu draws its rows in');
  }
  const labelCodes = codesFor(map, current, fontSet, label, rowFont);

  // 1. The row's action list: beep, select the activity's keypad map, clear the device mode marker.
  // The marker's **variable** is read off the config and only its value is ours, since which
  // variable it is differs per configuration, section 239.
  const actionSlot = archSlot(12, ACTION_TABLE_SLOT);
  const actionTable = current.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const rowList = actionTable.values.length;
  const rowBytes = new Writer(1 + 3 * 3).u8(3)
    .u16(SCREEN_ITEM_BEEP.operand).u8(SCREEN_ITEM_BEEP.opcode)
    .u16(SELECT_BINDING_SET_MASK | set).u8(SELECT_BINDING_SET)
    .u16(ACTIVITY_MENU_MARKER_VALUE).u8(marker.opcode);
  const rowAt = actionTable.start;
  const rowHole = relocate(current, rowAt, rowBytes.bytes.length);
  rowHole.bytes.set(rowBytes.bytes, rowAt);
  current = parse(appendTableEntries(
    parse(rowHole.bytes), actionSlot, [current.flashBase + rowAt]));

  if (full) {
    const paged = composeActivityMenuPage(current, menu, rowList, rowFont, labelCodes, options.iconLike);
    current = paged.container;
    return {
      bytes: restamped(current.blob), menu, page: pageIndexOf(), rowList, scan: paged.scan,
      scans: [paged.scan], rowLists: 1,
    };
  }

  // 2. The hit page, one rectangle wider. An existing page with exactly this geometry is reused
  // where the config has one, which is what the corpus's own three row pages are; otherwise one is
  // composed the way `composeMenuPage` composes one, pointer first so the census sees the slot.
  current = withActivityHitPage(current, menu, rank);

  // 3. The binding, in the page's list and in its pool copy. The copy grows first, because it sits
  // below the original and growing it moves the original.
  const growList = (listStart: number, entries: number): void => {
    const at = listStart + 1 + 4 * entries;
    const hole = relocate(current, at, 4);
    hole.bytes.set(
      new Writer(4).u8(0x80 | scan).u16(rowList).u8(ACTION_LIST_INDEX_OPCODE).bytes, at);
    hole.bytes[listStart] = entries + 1;
    current = parse(hole.bytes);
  };
  const listNow = taggedList(current, pageOf().list);
  if (listNow === undefined || listNow.wide) {
    throw new ComposeError("the activity menu's page list is not the narrow form the corpus uses");
  }
  const entries = listNow.entries.length;
  const pageIndex = modePages(current).findIndex((one) => one.address === pageOf().address);
  const copyOff = pageListCopies(current)[pageIndex];
  if (copyOff === undefined) throw new ComposeError("the activity menu's page has no pool copy");
  growList(copyOff, entries);
  const listOff = current.blobOffsetOf(pageOf().list);
  if (listOff === undefined) throw new ComposeError("the activity menu's page list moved out of reach");
  growList(listOff, entries);

  // 4. The drawing: the row's background, its icon, the font and the label, inserted where the
  // program's closing instruction begins, so the close slides up and every address the census
  // states is restamped with it. The background and icon are read here, after the three grows
  // above moved them: an address read before an insertion below it is stale by that insertion.
  const firstProgram = recordOf().pages[0]?.program;
  if (firstProgram === undefined) throw new ComposeError('the activity menu has no first page');
  const bg = pictureDrawnAt(current, firstProgram, ...MENU_ROW1_BG);
  const icon = options.iconLike === undefined
    ? pictureDrawnAt(current, firstProgram,
      MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0], MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1])
    : activityRowIcon(current, options.iconLike);
  if (bg === undefined || icon === undefined) {
    throw new ComposeError("the activity menu's first page draws no row this can copy");
  }
  const program = screenProgram(current, pageOf().program);
  const closing = program?.at(-1);
  if (program === undefined || closing === undefined || closing.opcode !== SCREEN_END) {
    throw new ComposeError("the activity menu's page program does not end the way the corpus ends one");
  }
  const bgY = MENU_ROW1_BG[1] + MENU_ROW_PITCH * rank;
  const drawn = new Writer(6 + 6 + 2 + 3 + labelCodes.length + 1);
  // These bytes are written after the hole's position is known, so anything sitting at or above it
  // is shifted here rather than by the census, exactly as the device list's row growth does.
  const shift = (address: number): number =>
    address + (address >= current.flashBase + closing.start ? drawn.bytes.length : 0);
  drawn.u8(SCREEN_DRAW_IMAGE).u8(MENU_ROW1_BG[0]).u8(bgY).u24(shift(bg));
  drawn.u8(SCREEN_DRAW_IMAGE).u8(MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0]).u8(bgY + MENU_ICON_OFFSET[1])
    .u24(shift(icon));
  drawn.u8(SCREEN_SELECT_FONT).u8(rowFont);
  drawn.u8(SCREEN_TEXT_INLINE).u8(MENU_LABEL_X).u8(MENU_ROW1_LABEL_Y + MENU_ROW_PITCH * rank);
  labelCodes.forEach((code) => drawn.u8(code));
  drawn.u8(0);
  const programHole = relocate(current, closing.start, drawn.bytes.length);
  programHole.bytes.set(drawn.bytes, closing.start);
  current = parse(programHole.bytes);

  return { bytes: restamped(current.blob), menu, page: pageIndexOf(), rowList, scan, scans: [scan], rowLists: 1 };
}

/**
 * Add a one row page to the activity menu, whose last page is full, and put the row on it: the
 * Harmony One's (arch 12) counterpart of `composeMenuPage`, and `todo.md` 1.2.2, section 293.
 *
 * **A separate builder from the device list's**, decision 17, because the page is not the same page:
 * an activity menu page offers two bottom keys where a device list page offers one, and draws their
 * labels itself. What the two share are steps: `withHitPage` for the rectangles and `paginate` for
 * the counter, the header's total and the page turn keys. Four insertions, each leaving the container
 * parseable, in the order `composeMenuPage` uses and for its reasons:
 *
 * 1. a hit page offering the full page's two bottom keys and its top row, in their stored order, so
 *    the keys keep their scans and the row takes the next one, which is Logitech's own one row page;
 * 2. the page list, row first and then the keys bound as the last page binds them, and its pool copy
 *    right after the last page's, since the copies pair with the pages positionally, section 69;
 * 3. three bytes in the mode entry for the page's pointer, a placeholder until the record exists;
 * 4. the block after the last page record: the program, which calls the menu's header, draws the two
 *    key labels the first page draws and then the row, and the page record.
 */
function composeActivityMenuPage(
  start: Container, menu: number, rowList: number, rowFont: number, labelCodes: readonly number[],
  iconLike: string | undefined,
): { container: Container; scan: number } {
  let current = start;
  const recordOf = (): ModeRecord => {
    const record = modeRecords(current)?.[menu];
    if (record === undefined) throw new ComposeError('the activity menu stopped reading');
    return record;
  };
  const last = recordOf().pages.at(-1);
  const lastTouch = last === undefined ? undefined : touchPageOf(current, last);
  const layout = lastTouch === undefined ? undefined : activityPageLayout(lastTouch);
  // Which of this menu's pages and which rank the row `iconLike` names, read now: once the new page's
  // record is counted and its pointer is still a placeholder, `activityNames` no longer reads the
  // menu, which is how a tenth activity on the spare Harmony One was refused. The page is found again
  // by its index in the record, since every insertion below moves its program.
  const iconRow = iconLike === undefined ? undefined : (() => {
    const place = activityRowPlace(current, iconLike);
    const index = recordOf().pages.findIndex((page) => page.program === place.program);
    if (index < 0) throw new ComposeError(`the row labelled ${iconLike} is not on the activity menu`);
    return { index, rank: place.rank };
  })();
  if (last === undefined || layout === undefined) {
    throw new ComposeError("the activity menu's last page is not a row layout this knows");
  }

  // 1. The rectangles: the last page's content in stored order with every row but the top one left
  // out, then the two edges. The codes are positional, so the keys keep theirs where they come first.
  const top = layout.rows[0] as TouchArea;
  const kept = layout.content.filter((area) => !layout.rows.includes(area) || area === top);
  const wanted = [...kept, ...layout.edges].map((area, k) =>
    [k < kept.length ? MENU_FIRST_SCAN + k : MENU_EDGE_SCANS[k - kept.length] as number, area] as const);
  const scan = MENU_FIRST_SCAN + kept.indexOf(top);
  const hitPage = withHitPage(current, wanted);
  current = hitPage.container;

  // 2. The list: the row, then each key bound to what the last page binds it to, under its new scan.
  // The page is read again, since step 1 may have moved every list above the hit map.
  const lastMoved = recordOf().pages.at(-1);
  const lastList = lastMoved === undefined ? undefined : taggedList(current, lastMoved.list);
  if (lastList === undefined || lastList.wide) {
    throw new ComposeError("the activity menu's page list is not the narrow form the corpus uses");
  }
  const keyEntries = layout.keys.map((key) => {
    const bound = lastList.entries.filter((entry) => (entry.tag & SCAN_MASK) === key.code);
    if (bound.length !== 1) {
      throw new ComposeError(`the activity menu's last page binds its key ${key.code} ${bound.length} times`);
    }
    return { scan: MENU_FIRST_SCAN + kept.indexOf(key), entry: bound[0] as TaggedEntry };
  });
  const listBytes = new Writer(1 + 4 * (1 + keyEntries.length)).u8(1 + keyEntries.length)
    .u8(0x80 | scan).u16(rowList).u8(ACTION_LIST_INDEX_OPCODE);
  for (const one of keyEntries) listBytes.u8(0x80 | one.scan).u16(one.entry.operand).u8(one.entry.opcode);
  const lastIndex = modePages(current).findIndex((one) => one.address === recordOf().pages.at(-1)?.address);
  const copyOff = pageListCopies(current)[lastIndex];
  const copyLength = copyOff === undefined ? undefined : taggedList(current, copyOff + current.flashBase)?.length;
  if (copyOff === undefined || copyLength === undefined) {
    throw new ComposeError("the activity menu's last page has no pool copy");
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

  // 3. The entry's new pointer, at the last page until the record exists, and the count with it.
  const entry = recordOf();
  const entryOff = current.blobOffsetOf(entry.address);
  const lastNow = entry.pages.at(-1);
  if (entryOff === undefined || lastNow === undefined) throw new ComposeError('the activity menu moved out of reach');
  const slotAt = entryOff + 6 + 3 * entry.pageCount;
  const pageListAddress = current.flashBase + listAt + (listAt >= slotAt ? 3 : 0);
  const entryHole = relocate(current, slotAt, 3);
  entryHole.bytes.set(new Writer(3).u24(lastNow.address).bytes, slotAt);
  entryHole.bytes.set(new Writer(2).u16(entry.pageCount + 1).bytes, entryOff + 4);
  current = parse(entryHole.bytes);

  // 4. The block, everything it embeds read here, after the relocations above.
  const pages = recordOf().pages;
  const realLast = pages[entry.pageCount - 1];
  const first = pages[0];
  const realLastOff = realLast === undefined ? undefined : current.blobOffsetOf(realLast.address);
  if (realLast === undefined || first === undefined || realLastOff === undefined) {
    throw new ComposeError('an activity menu page moved out of reach');
  }
  const firstProgram = screenProgram(current, first.program) ?? [];
  const header = headerOf(current, first);
  if (header === undefined) throw new ComposeError("the activity menu's first page calls no header");
  // The key labels: what the first page draws between its header call and its first row, which is
  // fonts and the two labels on the activity menu of every Harmony One configuration in the lab that
  // has one, section 293.
  const firstRow = firstProgram.findIndex((one) => one.opcode === SCREEN_DRAW_IMAGE);
  const keyLabels = firstProgram.slice(1, firstRow);
  if (firstRow < 0 || keyLabels.some((one) => one.opcode !== SCREEN_SELECT_FONT
      && one.opcode !== SCREEN_TEXT_INLINE && one.opcode !== SCREEN_TEXT_AT)) {
    throw new ComposeError("the activity menu's first page does not draw its keys before its rows");
  }
  const bg = pictureDrawnAt(current, first.program, ...MENU_ROW1_BG);
  const icon = iconLike === undefined
    ? pictureDrawnAt(current, first.program,
      MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0], MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1])
    : activityRowIconAt(current, (recordOf().pages[iconRow!.index] as ModePage).program, iconRow!.rank, iconLike);
  if (bg === undefined || icon === undefined) {
    throw new ComposeError("the activity menu's first page draws no row this can copy");
  }
  const blockAt = realLastOff + 7;
  const base = current.flashBase + blockAt;
  const labelsLength = keyLabels.reduce((sum, one) => sum + one.length, 0);
  const programLength = 4 + labelsLength + 6 + 6 + 2 + 3 + labelCodes.length + 1 + 1;
  const blockLength = programLength + 7;
  const shifted = (address: number): number => (address >= base ? address + blockLength : address);
  const block = new Writer(blockLength);
  block.u8(SCREEN_CALL).u24(shifted(header));
  for (const one of keyLabels) {
    const bytes = Uint8Array.from(current.blob.slice(one.start, one.start + one.length));
    if (one.opcode === SCREEN_TEXT_AT) bytes.set(new Writer(3).u24(shifted(u24(bytes, 3))).bytes, 3);
    bytes.forEach((byte) => block.u8(byte));
  }
  block.u8(SCREEN_DRAW_IMAGE).u8(MENU_ROW1_BG[0]).u8(MENU_ROW1_BG[1]).u24(shifted(bg));
  block.u8(SCREEN_DRAW_IMAGE).u8(MENU_ROW1_BG[0] + MENU_ICON_OFFSET[0]).u8(MENU_ROW1_BG[1] + MENU_ICON_OFFSET[1])
    .u24(shifted(icon));
  block.u8(SCREEN_SELECT_FONT).u8(rowFont);
  block.u8(SCREEN_TEXT_INLINE).u8(MENU_LABEL_X).u8(MENU_ROW1_LABEL_Y);
  labelCodes.forEach((code) => block.u8(code));
  block.u8(0);
  block.u8(SCREEN_END);
  block.u8(hitPage.lead).u24(shifted(pageListAddress)).u24(base);
  if (block.bytes.length !== blockLength) {
    throw new ComposeError(`the activity page block is ${block.bytes.length} bytes, not the ${blockLength} counted`);
  }
  const blockHole = relocate(current, blockAt, blockLength);
  blockHole.bytes.set(block.bytes, blockAt);
  const placed = parse(blockHole.bytes);
  const swap = modeRecords(placed)?.[menu];
  const swapOff = swap === undefined ? undefined : placed.blobOffsetOf(swap.address);
  if (swap === undefined || swapOff === undefined) throw new ComposeError('the activity menu moved out of reach');
  placed.blob.set(new Writer(3).u24(base + programLength).bytes, swapOff + 6 + 3 * (swap.pageCount - 1));
  return { container: paginate(parse(restamped(placed.blob)), menu), scan };
}

/**
 * Point the activity menu's last page at a hit page carrying one more row, composing one if the
 * configuration has none.
 *
 * The composed page keeps **every** rectangle the old one had, in the same stored order, and adds
 * the new row after the last content one and before the two edges. That order is the whole point:
 * the scan codes are positional, so keeping the prefix identical keeps every binding the page
 * already has, and the new row lands on the next unused scan.
 */
function withActivityHitPage(start: Container, menu: number, rank: number): Container {
  let current = start;
  const pageOf = (): ModePage => {
    const page = modeRecords(current)?.[menu]?.pages.at(-1);
    if (page === undefined) throw new ComposeError('the activity menu has no page');
    return page;
  };
  const hits = touchPages(current);
  const old = touchPageOf(current, pageOf());
  const layout = old === undefined ? undefined : activityPageLayout(old);
  if (hits === undefined || old === undefined || layout === undefined) {
    throw new ComposeError('the hit map stopped reading');
  }
  const top = layout.rows[0] as TouchArea;
  const added: TouchArea = {
    ...top, y: top.y - ACTIVITY_ROW_PITCH * rank, code: MENU_FIRST_SCAN + layout.content.length,
  };
  const wanted: readonly TouchArea[] = [...layout.content, added, ...layout.edges];
  const codes = wanted.map((_, k) =>
    (k < wanted.length - 2 ? MENU_FIRST_SCAN + k : MENU_EDGE_SCANS[k - (wanted.length - 2)] as number));
  const hitPage = withHitPage(current, wanted.map((want, k) => [codes[k] as number, want] as const));
  current = hitPage.container;
  const lead = hitPage.lead;
  // The lead byte, in place and last, so nothing above moves it again.
  const at = current.blobOffsetOf(pageOf().address);
  if (at === undefined) throw new ComposeError('the activity menu page moved out of reach');
  current.blob[at] = lead;
  return parse(current.blob);
}

/** The three facts a working screen template supplies, read once so every step uses the same. */
interface WorkingTemplate {
  mode: number;
  activity: number;
  record: ModeRecord;
  page: ModePage;
  chrome: number;
  devicesScan: number;
}

/**
 * The one page working screen to copy the frame from, or a refusal.
 *
 * A candidate is a working screen, per `activityScreens`, with one page whose list binds exactly one
 * key to "beep, enter a mode", which is its Devices key, and whose record starts with the two null
 * bindings a one page screen carries on the keys beside the display. The lowest mode index wins,
 * which is arbitrary and deterministic: on the spare Harmony One the four candidates share every
 * handler list's contents and differ only in which lists they name, and each calls a chrome of its
 * own, since the chrome draws the title.
 *
 * **The rule is fitted to the spare** and says so: it refuses on five of the thirteen Harmony One
 * configurations with activities, the factory one and the four with two activities, none of which
 * has a one page working screen with a Devices key.
 */
function workingTemplate(c: Container, screens: ActivityScreens): WorkingTemplate {
  const lists = c.actionLists() ?? [];
  const records = modeRecords(c) ?? [];
  const found: WorkingTemplate[] = [];
  for (const [activity, mode] of screens.screens) {
    const record = records[mode];
    const page = record?.pages[0];
    if (record === undefined || page === undefined || record.pages.length !== 1) continue;
    const nulls = record.entries.filter((one) => one.opcode === 0 && one.operand === 0);
    if (nulls.length !== EDGE_CODES.length) continue;
    const keys = (taggedList(c, page.list)?.entries ?? []).filter((entry) => {
      const list = lists[entry.operand];
      return entry.opcode === ACTION_LIST_INDEX_OPCODE && list?.length === 2
        && list[0]?.opcode === BEEP_OPCODE && list[1]?.opcode === ENTER_MODE;
    });
    const first = screenProgram(c, page.program)?.[0];
    if (keys.length !== 1 || first?.opcode !== SCREEN_CALL) continue;
    found.push({
      mode, activity, record, page, chrome: u24(first.operands, 0),
      devicesScan: (keys[0] as { tag: number }).tag & SCAN_MASK,
    });
  }
  found.sort((a, b) => a.mode - b.mode);
  const chosen = found[0];
  if (chosen === undefined) throw new ComposeError('no one page working screen to take the frame from');
  return chosen;
}

/**
 * The Harmony One's half of `composeActivityScreen`, whose docstring describes it.
 */
export function composeTouchActivityScreen(
  c: Container, activity: number, label: string, rows: readonly ComposeRow[],
  options: ComposeActivityScreenOptions = {},
): ComposedActivityScreen {
  const screens = activityScreens(c);
  if (screens === undefined) throw new ComposeError('no record says which screen an activity shows');
  if (screens.screens.has(activity)) {
    throw new ComposeError(`activity ${activity} already has a working screen`);
  }
  const template = workingTemplate(c, screens);
  const lists = c.actionLists() ?? [];
  const records = modeRecords(c) ?? [];

  // The pads the template's hit page offers, matched to the slots by where a touch lands: the
  // centre of slot k's picture is asked which area it hits, which is the firmware's own question.
  const hit = touchPageOf(c, template.page);
  if (hit === undefined || template.page.lead === undefined) {
    throw new ComposeError("the template page's hit page does not read");
  }
  const pictures: number[] = [];
  for (const [x, y] of DEVICE_PAGE_SLOTS) {
    let found: number | undefined;
    for (const mode of screens.screens.values()) {
      for (const page of records[mode]?.pages ?? []) {
        found ??= pictureDrawnAt(c, page.program, x, y);
      }
    }
    if (found === undefined) break;
    pictures.push(found);
  }
  const scans: number[] = [];
  for (const [k, [x, y]] of DEVICE_PAGE_SLOTS.entries()) {
    const picture = pictures[k] === undefined ? undefined : bitmapAt(c, pictures[k] as number);
    if (picture === undefined) break;
    const owner = touchOwner(hit.areas, x + picture.stride / 2, y + picture.rows / 2);
    if (owner === undefined || owner.code === template.devicesScan
        || EDGE_CODES.includes(owner.code)) break;
    scans.push(owner.code);
  }
  if (rows.length > scans.length) {
    throw new ComposeError(`a working screen here holds ${scans.length} pads, not ${rows.length}`);
  }

  // The chrome to copy: font, title, background, the queued header work, the title again, return.
  const chrome = screenProgram(c, template.chrome) ?? [];
  const shape = chrome.map((one) => one.opcode);
  const titleAt = shape.indexOf(SCREEN_TEXT_AT);
  if (shape[0] !== SCREEN_SELECT_FONT || titleAt !== 1 || shape.lastIndexOf(SCREEN_TEXT_AT) === titleAt
      || shape.at(-2) !== SCREEN_RETURN || shape.at(-1) !== SCREEN_END) {
    throw new ComposeError('the template chrome is not the font, title, frame, title, return shape');
  }
  const titleFont = chrome[0]?.operands[0] as number;
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const titleX = chrome[titleAt]?.operands[0] as number;
  const titleY = chrome[titleAt]?.operands[1] as number;

  // The page program to copy: the call, the footer's font and text, then pads in the pad font.
  const program = screenProgram(c, template.page.program) ?? [];
  const firstImage = program.findIndex((one) => one.opcode === SCREEN_DRAW_IMAGE);
  const footer = program.slice(1, firstImage < 0 ? program.length - 1 : firstImage);
  if (footer.length !== 2 || footer[0]?.opcode !== SCREEN_SELECT_FONT || footer[1]?.opcode !== SCREEN_TEXT_AT) {
    throw new ComposeError('the template page does not open with its footer the way the corpus does');
  }
  const padFont = program.find((one, k) => k > firstImage && one.opcode === SCREEN_SELECT_FONT)?.operands[0]
    ?? DEVICE_ROW_FONT;

  // The start up screen and the "an activity is running" list, both read off existing activities.
  const bindings = activityBindings(c);
  const sets = handlerSets(c);
  const enterOf = (value: number): readonly Instruction[] | undefined => {
    const binding = bindings.find((one) => one.activity === value);
    const set = binding === undefined ? undefined : sets?.addresses[binding.set];
    const entry = set === undefined ? undefined
      : taggedList(c, set)?.entries.find((one) => one.tag === HANDLER_TAG_ENTER);
    return entry === undefined ? undefined : lists[entry.operand];
  };
  const startupOf = options.startupLike === undefined
    ? template.activity
    : activityNames(c).find((one) => one.name === options.startupLike)?.activity;
  if (startupOf === undefined) throw new ComposeError(`no activity is labelled ${options.startupLike}`);
  const opening = enterOf(startupOf)?.[0];
  if (opening?.opcode !== ENTER_MODE) {
    throw new ComposeError(`activity ${startupOf}'s enter list does not open with a start up screen`);
  }
  const startupMode = opening.operand;
  const called = [...screens.screens.keys()].map((value) => new Set((enterOf(value) ?? [])
    .filter((one) => one.opcode === ACTION_LIST_INDEX_OPCODE).map((one) => one.operand)));
  const active = [...(called[0] ?? [])].filter((index) => called.every((set) => set.has(index)))
    .filter((index) => {
      const list = lists[index];
      return list?.length === 2 && list[0]?.opcode === SILENT_WRITE.opcode
        && list[0]?.operand === SILENT_WRITE.operand
        && (list[1] as Instruction).opcode >= STATE_WRITE_BASE && list[1]?.operand === 1;
    });
  if (active.length !== 1) {
    throw new ComposeError(`${active.length} lists look like the "an activity is running" flag`);
  }
  const activeList = active[0] as number;

  // ---- 1. the Devices key's list, reused where the config has one ----
  const menus = deviceListMenus(c).menus;
  const devicesMenu = menus[0];
  if (devicesMenu === undefined) throw new ComposeError('no device list menu for the Devices key');
  let current = c;
  let devicesList = lists.findIndex((list) => list?.length === 2
    && list[0]?.opcode === BEEP_OPCODE && list[1]?.opcode === ENTER_MODE
    && list[1]?.operand === devicesMenu);
  const actionSlot = archSlot(12, ACTION_TABLE_SLOT);
  if (devicesList < 0) {
    const table = current.pointerArrayAt(actionSlot);
    if (table === undefined) throw new ComposeError('base slot 10 does not read as a table');
    devicesList = table.values.length;
    const bytes = new Writer(1 + 3 * 2).u8(2)
      .u16(SCREEN_ITEM_BEEP.operand).u8(SCREEN_ITEM_BEEP.opcode).u16(devicesMenu).u8(ENTER_MODE).bytes;
    const hole = relocate(current, table.start, bytes.length);
    hole.bytes.set(bytes, table.start);
    current = parse(appendTableEntries(parse(hole.bytes), actionSlot,
                                       [current.flashBase + table.start]));
  }

  // ---- 2. the mode table's placeholder entry, swapped at the end, as composeDeviceScreen does ----
  const stale = modeTable(current);
  const placeholder = stale?.addresses[0];
  if (stale === undefined || placeholder === undefined) throw new ComposeError('base slot 6 does not read');
  const mode = stale.addresses.length;
  const tableAt = stale.start + stale.length;
  const tableHole = relocate(current, tableAt, 3);
  tableHole.bytes.set(new Writer(3).u24(placeholder).bytes, tableAt);
  tableHole.bytes.set(new Writer(3).u24(mode + 1).bytes, stale.start);
  current = parse(tableHole.bytes);

  // ---- 3. the page list, its pool copy first, then the list itself in base slot 8 ----
  const listBytes = new Writer(1 + 4 * (rows.length + 1)).u8(rows.length + 1)
    .u8(0x80 | template.devicesScan).u16(devicesList).u8(ACTION_LIST_INDEX_OPCODE);
  rows.forEach((row, k) => {
    listBytes.u8(0x80 | (scans[k] as number)).u16(row.list).u8(ACTION_LIST_INDEX_OPCODE);
  });
  const lastPool = taggedListPools(current).at(-1);
  if (lastPool === undefined) throw new ComposeError('no copy pool to extend');
  const copyHole = relocate(current, lastPool.end, listBytes.bytes.length);
  copyHole.bytes.set(listBytes.bytes, lastPool.end);
  current = parse(copyHole.bytes);
  const listAt = Math.max(...modePages(current).map((page) => {
    const off = current.blobOffsetOf(page.list);
    const list = taggedList(current, page.list);
    return off === undefined || list === undefined ? 0 : off + list.length;
  }));
  const listHole = relocate(current, listAt, listBytes.bytes.length);
  listHole.bytes.set(listBytes.bytes, listAt);
  current = parse(listHole.bytes);
  const pageListAddress = current.flashBase + listAt;

  // ---- 4. the mode block: record list, chrome, page program, page record, entry ----
  // Every address the block embeds is re-read here, after the three insertions above.
  const moved = modeRecords(current)?.[template.mode];
  const movedPage = moved?.pages[0];
  if (moved === undefined || movedPage === undefined) throw new ComposeError('the template moved away');
  const movedChrome = screenProgram(current, u24(
    (screenProgram(current, movedPage.program)?.[0] as { operands: Uint8Array }).operands, 0)) ?? [];
  const movedProgram = screenProgram(current, movedPage.program) ?? [];
  const recordStart = current.blobOffsetOf(moved.start);
  if (recordStart === undefined) throw new ComposeError('the template record is out of reach');
  const recordList = current.blob.slice(recordStart, recordStart + moved.length);
  const sets14 = fontSets(current) ?? [];
  const titleFontUsed = fontThatSpells(current, map, label, titleFont);
  const titleCodes = codesFor(map, current, sets14[titleFontUsed] as FontSet, label, titleFontUsed);
  const padSet = sets14[padFont];
  if (padSet === undefined) throw new ComposeError('the pad font does not read');
  // Every label laid out now, against the container the font set was read from, section 242.
  const rowLines = rows.map((row, k) => {
    const [x, y] = DEVICE_PAGE_SLOTS[k] as readonly [number, number];
    return touchLabelLines(current, map, padSet, padFont, row.label, { x, y });
  });
  const movedPictures = DEVICE_PAGE_SLOTS.slice(0, rows.length).map(([x, y]) => {
    for (const m of activityScreens(current)?.screens.values() ?? []) {
      for (const page of modeRecords(current)?.[m]?.pages ?? []) {
        const one = pictureDrawnAt(current, page.program, x, y);
        if (one !== undefined) return one;
      }
    }
    throw new ComposeError('a pad picture stopped reading');
  });

  const queued = movedChrome.filter((one) => one.opcode === SCREEN_QUEUE_INSTRUCTION);
  const background = movedChrome.find((one) => one.opcode === SCREEN_DRAW_IMAGE);
  if (background === undefined) throw new ComposeError('the template chrome draws no background');
  const chromeLength = 2 + (3 + titleCodes.length + 1) + 6 + 4 * queued.length + 6 + 1 + 1;
  const programLength = 4 + 2 + 6
    + rows.reduce((sum, _, k) => sum + 6 + touchLabelLength(rowLines[k] as TouchLabelLine[]), 0)
    + (rows.length > 0 ? 2 : 0) + 1;
  const blockLength = recordList.length + chromeLength + programLength + 7 + (6 + 3);
  const blockAt = Math.max(...(modeRecords(current) ?? []).map((record) => {
    const off = current.blobOffsetOf(record.address);
    return off === undefined ? 0 : off + record.entryLength;
  }));
  const base = current.flashBase + blockAt;
  const shifted = (address: number): number => (address >= base ? address + blockLength : address);
  const chromeAddress = base + recordList.length;
  const programAddress = chromeAddress + chromeLength;
  const pageAddress = programAddress + programLength;
  const entryAddress = pageAddress + 7;

  const block = new Writer(blockLength);
  block.raw(recordList);
  // The chrome. The title is drawn inline the first time and by reference the second, which is the
  // corpus's own economy: a referenced run is the payload of an inline one, three bytes in.
  block.u8(SCREEN_SELECT_FONT).u8(titleFontUsed);
  block.u8(SCREEN_TEXT_INLINE).u8(titleX).u8(titleY);
  titleCodes.forEach((code) => block.u8(code));
  block.u8(0);
  block.u8(SCREEN_DRAW_IMAGE).u8(background.operands[0] as number).u8(background.operands[1] as number)
    .u24(shifted(u24(background.operands, 2)));
  for (const one of queued) block.u8(SCREEN_QUEUE_INSTRUCTION).raw(one.operands);
  block.u8(SCREEN_TEXT_AT).u8(titleX).u8(titleY).u24(chromeAddress + 2 + 3);
  block.u8(SCREEN_RETURN).u8(SCREEN_END);
  // The page: the call, the footer copied, then each pad's picture and its centred label.
  const footerFont = movedProgram[1];
  const footerText = movedProgram[2];
  if (footerFont?.opcode !== SCREEN_SELECT_FONT || footerText?.opcode !== SCREEN_TEXT_AT) {
    throw new ComposeError('the template footer moved out of shape');
  }
  block.u8(SCREEN_CALL).u24(chromeAddress);
  block.u8(SCREEN_SELECT_FONT).raw(footerFont.operands);
  block.u8(SCREEN_TEXT_AT).u8(footerText.operands[0] as number).u8(footerText.operands[1] as number)
    .u24(shifted(u24(footerText.operands, 2)));
  rows.forEach((row, k) => {
    const [x, y] = DEVICE_PAGE_SLOTS[k] as readonly [number, number];
    const picture = movedPictures[k] as number;
    block.u8(SCREEN_DRAW_IMAGE).u8(x).u8(y).u24(shifted(picture));
    if (k === 0) block.u8(SCREEN_SELECT_FONT).u8(padFont);
    const width = bitmapAt(current, picture)?.stride ?? 0;
    if (width !== TOUCH_PAD_WIDTH) throw new ComposeError(`'${row.label}''s pad box is ${width} pixels wide, not ${TOUCH_PAD_WIDTH}`);
    for (const line of rowLines[k] as TouchLabelLine[]) {
      block.u8(SCREEN_TEXT_INLINE).u8(line.x).u8(line.y);
      line.codes.forEach((code) => block.u8(code));
      block.u8(0);
    }
  });
  block.u8(SCREEN_END);
  block.u8(template.page.lead).u24(shifted(pageListAddress)).u24(programAddress);
  block.u8(0).u24(base).u16(1).u24(pageAddress);
  if (block.remaining !== 0) throw new ComposeError(`the mode block is ${block.remaining} bytes short`);
  const blockHole = relocate(current, blockAt, blockLength);
  blockHole.bytes.set(block.bytes, blockAt);
  const swapped = parse(blockHole.bytes);
  const grownTable = modeTable(swapped);
  if (grownTable === undefined) throw new ComposeError('base slot 6 stopped reading');
  swapped.blob.set(new Writer(3).u24(entryAddress).bytes, grownTable.start + 3 + 3 * mode);
  current = parse(swapped.blob);

  // ---- 5. the activity's case in the base slot 14 record ----
  current = appendValueMapCase(current, screens.map, activity,
    new Writer(5).u8(SCREEN_QUEUE_INSTRUCTION).u16(mode).u8(ENTER_MODE).u8(SCREEN_END).bytes);

  const check = activityScreens(current);
  if (check?.screens.get(activity) !== undefined && check.screens.get(activity) !== mode) {
    throw new ComposeError('the record names another screen for the activity than the one composed');
  }
  return {
    bytes: restamped(current.blob), activity, mode, startupMode, activeList, map: screens.map,
    devicesList, scans: scans.slice(0, rows.length),
  };
}
