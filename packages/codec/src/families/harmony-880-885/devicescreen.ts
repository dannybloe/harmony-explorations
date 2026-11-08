/**
 * A device's own screen on the Harmony 880 and 885, and its row on the device list, `todo-compile-885.md` 2.1:
 * `Family.composeDeviceScreen` for the side keys family.
 *
 * **What is built**, each part as the configuration's own device modes and device list have it, the census in
 * `sidekeysdevice.test.ts`:
 *
 * 1. **The mode's own list** is a device mode's of the configuration, the template, with every call it makes
 *    taken out: all 49 or 51 tags kept in the order the template stores them, which is not the compiler's hash
 *    order for these lists and is the same set on every device mode of a configuration, 8 of 8 configurations;
 *    the three handlers kept as they are, the enter and leave handlers starting and cancelling the configuration's
 *    device mode timer and the screen program the third runs, which every device mode of a configuration shares;
 *    and every key the template binds to a command of its own device bound to nothing instead, a swallow, so that
 *    no key of the new device's mode sends another device's code. **No hard key sends a command of the new
 *    device**: which command Logitech's compiler gives which key on these remotes is not read,
 *    `todo-compile-885.md` 2.5, so the commands are on the screen only.
 * 2. **One page**, the page builder's one page form, `pages.ts`: the template's background, bars, queued program
 *    and fonts, the device's label as the title, and a row per command in fill order, at most eight. A device of
 *    more than eight commands is refused, since a mode of several pages is 2.5's.
 * 3. **The page's list** binds each row's key beside the screen to the row's list, a press, in the compiler's tag
 *    order, `compilerTagOrder`, which every device mode page of the eight configurations stores, and its pool copy
 *    is the same bytes, as on every device mode page read: a device page's copy names the same lists.
 * 4. **A list of the mode's own** that the page queues a call of, a copy of the template's, three runs of screen
 *    programs on every device mode of every configuration read.
 * 5. **The row on every copy of the device list**, `sideKeysDeviceLists`. A configuration of these remotes holds
 *    one copy per activity, which that activity's key map enters from the Devices key, one the key map in force
 *    outside every activity enters, and one more that nothing the census reads enters, its rows in the outside
 *    copy's order: on each of the eight configurations, the activities plus two copies, each listing every device
 *    once, `sidekeysdevice.test.ts`. An activity's copy lists the devices that activity switches on first and the
 *    rest in the outside copy's order. The order of the outside copy is Logitech's and is not read: it is not the
 *    infrared groups' order, and where a new device would fall in it is not known, so **the new row goes last on
 *    every copy**, which keeps every existing row in its cell and its order, a choice of ours. On each copy the row
 *    is two lists of its own, enter the new mode and write the configuration's device mode mark,
 *    `deviceModeMarker`, one for the page and one for its pool copy, as every device list copy read binds lists
 *    of its own. **Where a copy's last page is full, a page is opened**: its first page gains the counter, `1 OF
 *    2`, in front of its end, and a second page in the one page form with the counter `2 OF 2` holds the new row
 *    in the first cell, `appendModePage`. That is what a ninth device does on unit A's lists of one full page.
 *    A copy with room on its last page is refused, since filling a cell of an existing page is not composed,
 *    `todo-compile-885.md` 2.8, and so is a copy of two pages or more, whose counters a further page restates,
 *    2.4.
 */
import { Writer } from '../../container/emit.ts';
import { type Container, parse } from '../../container/gspm.ts';
import {
  compilerTagOrder, deviceListRowMode, deviceListRows, deviceModeMarker, devices, ENTER_MODE, KEY_EVENT_PRESS,
  KEY_EVENT_SHIFT,
} from '../../inventory/inventory.ts';
import { relocate } from '../../edit/relocate.ts';
import { screenProgram, SCREEN_END } from '../../screens/screen.ts';
import { ACTION_LIST_INDEX_OPCODE, modeRecords, modeTable, taggedList, type TaggedEntry } from '../../container/sections.ts';
import { appendActionLists, ComposeError, restamped } from '../../shared/core.ts';
import type { ComposedScreen, ComposeRow, ComposeScreenOptions } from '../../shared/menus.ts';
import { appendMode, appendModePage } from '../../shared/modes.ts';
import {
  SIDE_KEYS_GRID, SIDE_KEYS_PER_PAGE, SIDE_KEYS_LEFT_X, SIDE_KEYS_RIGHT_END, sideKeysChrome, sideKeysCounter,
  sideKeysCounterBytes, sideKeysLabel, sideKeysPageProgram, sideKeysSpell, sideKeysWidth,
} from './pages.ts';
import { SIDE_KEYS_NAME } from './sends.ts';

/** A page's tagged list: each item's key, a press, calling its list, in the compiler's tag order. */
function pageList(lists: readonly number[]): Uint8Array {
  const tags = lists.map((_, k) => (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | (SIDE_KEYS_GRID.items[k] as { scan: number }).scan);
  const byTag = new Map(tags.map((tag, k) => [tag, lists[k] as number]));
  const ordered = compilerTagOrder(tags);
  const out = new Writer(1 + 4 * ordered.length).u8(ordered.length);
  for (const tag of ordered) out.u8(tag).u16(byTag.get(tag) as number).u8(ACTION_LIST_INDEX_OPCODE);
  return out.bytes;
}

/**
 * The device mode a new one is built like: the mode of the device list row drawn `keysLike`, or else the first of
 * the configuration's device modes with one page, the form built here, or else its first device mode.
 */
function templateMode(c: Container, keysLike: string | undefined): number {
  const rows = deviceListRows(c);
  if (keysLike !== undefined) {
    const row = rows.find((one) => one.label === keysLike);
    if (row === undefined) throw new ComposeError(`no device list row is drawn '${keysLike}'`);
    return row.mode;
  }
  const modes = devices(c).flatMap((one) => (one.mode === undefined ? [] : [one.mode]));
  const records = modeRecords(c) ?? [];
  const onePage = modes.find((mode) => records[mode]?.pageCount === 1);
  const first = onePage ?? modes[0];
  if (first === undefined) throw new ComposeError('the configuration has no device mode to build a new one like');
  return first;
}

/**
 * The template's own list with every call taken out: a key it binds to its device's command, or to anything else
 * it calls, is bound to nothing, which swallows the key; the handlers and the swallows it has stay as they are.
 */
function ownList(c: Container, mode: number): TaggedEntry[] {
  const record = modeRecords(c)?.[mode];
  if (record === undefined) throw new ComposeError(`mode ${mode} does not read`);
  if (record.entries.some((one) => one.flags !== undefined)) {
    throw new ComposeError(`mode ${mode}'s own list is not the narrow form every device mode here uses`);
  }
  return record.entries.map((one) => (one.opcode === ACTION_LIST_INDEX_OPCODE ? { tag: one.tag, operand: 0, opcode: 0, flags: undefined } : one));
}

/**
 * Every copy of the device list: each menu at least one of whose bindings is a device list row, enter a device
 * mode and write the device mode mark, and all of whose calls are. `deviceListRows` reads one of them, the first
 * reaching the most devices, which is what naming a device needs; growing the list needs them all, since each
 * context the Devices key is pressed in shows its own copy.
 */
export function sideKeysDeviceLists(c: Container): number[] {
  const marker = deviceModeMarker(c);
  if (marker === undefined) return [];
  const lists = c.actionLists() ?? [];
  const found: number[] = [];
  (modeRecords(c) ?? []).forEach((record, menu) => {
    let rows = 0;
    let others = 0;
    for (const page of record.pages) {
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
        if (deviceListRowMode(lists[entry.operand], c.architecture, marker) === undefined) others += 1;
        else rows += 1;
      }
    }
    if (rows > 0 && others === 0) found.push(menu);
  });
  return found;
}

/** The device modes a copy of the device list enters, in its pages' order. */
export function sideKeysCopyModes(c: Container, menu: number): number[] {
  const marker = deviceModeMarker(c);
  const lists = c.actionLists() ?? [];
  const modes: number[] = [];
  for (const page of modeRecords(c)?.[menu]?.pages ?? []) {
    for (const entry of taggedList(c, page.list)?.entries ?? []) {
      const mode = entry.opcode === ACTION_LIST_INDEX_OPCODE
        ? deviceListRowMode(lists[entry.operand], c.architecture, marker) : undefined;
      if (mode !== undefined) modes.push(mode);
    }
  }
  return modes;
}

export function composeSideKeysDeviceScreen(
  c: Container, label: string, rows: readonly ComposeRow[], options: ComposeScreenOptions,
): ComposedScreen {
  if (rows.length === 0) throw new ComposeError('a device mode needs at least one command on its screen');
  if (rows.length > SIDE_KEYS_PER_PAGE) {
    throw new ComposeError(`${rows.length} commands take more than one page, and a device mode of several pages is `
      + `not composed for ${SIDE_KEYS_NAME} yet, todo-compile-885.md 2.5`);
  }
  if (options.compiled !== undefined) {
    throw new ComposeError(`the compiler's layout of a device mode is not read for ${SIDE_KEYS_NAME}, todo-compile-885.md 2.5`);
  }
  if (options.iconLike !== undefined) throw new ComposeError(`the device list of ${SIDE_KEYS_NAME} draws no icon to copy`);

  // Everything read before anything moves: the template, its chrome, every text spelled, the device list and its
  // last page, and the mark a row writes.
  const template = templateMode(c, options.keysLike);
  const chrome = sideKeysChrome(c, template);
  const title = sideKeysSpell(c, chrome.titleFont, label);
  const titleWidth = sideKeysWidth(c, chrome.titleFont, title);
  if (SIDE_KEYS_LEFT_X + titleWidth > SIDE_KEYS_RIGHT_END) {
    throw new ComposeError(`the title '${label}' is ${titleWidth} pixels wide and runs past the labels' right edge`);
  }
  const labels = rows.map((row) => sideKeysLabel(c, chrome.labelFont, row.label));
  // Every copy of the device list, each checked to list every device once: a copy that lists some other set is
  // not one this composer understands, and is refused rather than grown.
  const deviceModes = devices(c).flatMap((one) => (one.mode === undefined ? [] : [one.mode]));
  const copies = sideKeysDeviceLists(c);
  if (copies.length === 0) throw new ComposeError('no menu here lists the devices');
  const everyDevice = [...deviceModes].sort((a, b) => a - b).join();
  for (const menu of copies) {
    const listed = sideKeysCopyModes(c, menu);
    if ([...listed].sort((a, b) => a - b).join() !== everyDevice) {
      throw new ComposeError(`the device list copy at mode ${menu} lists ${listed.length} rows that are not the `
        + `${deviceModes.length} devices once each`);
    }
    const record = modeRecords(c)?.[menu];
    const last = record?.pages.at(-1);
    const used = last === undefined ? undefined : taggedList(c, last.list)?.entries.length;
    if (record === undefined || used === undefined) throw new ComposeError(`the device list copy at mode ${menu} does not read`);
    // Room first: a free cell is the ordinary case whatever the page count, and only a full last page asks for a
    // page, which this composes from one page to two and no further.
    if (used < SIDE_KEYS_PER_PAGE) {
      throw new ComposeError(`the device list copy at mode ${menu} has room on its last page, and a row in a free cell `
        + 'of an existing page is not composed yet, todo-compile-885.md 2.8');
    }
    if (record.pageCount !== 1) {
      throw new ComposeError(`the device list copy at mode ${menu} has ${record.pageCount} full pages, and a further page `
        + 'restates every counter, which is not composed yet, todo-compile-885.md 2.4');
    }
  }
  const rowLabels = copies.map((menu) => sideKeysLabel(c, sideKeysChrome(c, menu).labelFont, label));
  if (sideKeysCounter(c, deviceModes) === undefined) {
    throw new ComposeError('no page here draws a counter, so a second device list page has nothing to borrow one from');
  }
  const marker = deviceModeMarker(c);
  if (marker === undefined) throw new ComposeError('no device list row here writes a device mode mark to copy');
  const table = modeTable(c);
  if (table === undefined) throw new ComposeError('base slot 6 states no table');
  const mode = table.addresses.length;
  const queued = c.actionLists()?.[chrome.list];
  if (queued === undefined) throw new ComposeError(`the template's queued list ${chrome.list} does not read`);
  const own = ownList(c, template);

  // 1. The lists: the mode's own queued list, a copy of the template's, then each copy's row, two lists, the pool
  // copy's first, as the compiler numbers a page's two, then the page's.
  const row: [number, number][] = [[mode, ENTER_MODE], [marker.operand, marker.opcode]];
  const appended = appendActionLists(c, [
    queued.map((one) => [one.operand, one.opcode] as [number, number]),
    ...copies.flatMap(() => [row, row]),
  ]);
  const queuedList = appended.first;
  const rowCopyOf = (k: number): number => appended.first + 1 + 2 * k;
  const rowListOf = (k: number): number => appended.first + 2 + 2 * k;
  let current = parse(appended.bytes);

  // 2. The mode, its own list, one page and the page's copy, `appendMode`. The chrome is read again inside, since
  // every address the first reading holds is stale by the insertion above.
  const items = labels.map((codes) => ({ codes }));
  const list = pageList(rows.map((one) => one.list));
  current = appendMode(current, mode, own, [list], (now) => {
    const fresh = { ...sideKeysChrome(now, template), list: queuedList };
    return [sideKeysPageProgram(now, fresh, title, items)];
  });

  // 3. Each copy in turn: its first page gains its counter, in front of its end byte, the page being the copy's own
  // program in the one page form, the arrows' addresses shifted by the hole the counter itself makes; then its
  // second page, the row in the first cell, its list and its copy each a list of its own, the chrome the copy's
  // own and the counter the device pages'. Every reading is taken again on the container of the moment, since
  // each insertion moves what follows it.
  copies.forEach((menu, k) => {
    const firstPage = modeRecords(current)?.[menu]?.pages[0];
    const program = firstPage === undefined ? undefined : screenProgram(current, firstPage.program);
    const end = program?.at(-1);
    if (end?.opcode !== SCREEN_END) {
      throw new ComposeError(`the device list copy at mode ${menu} does not end where its counter goes`);
    }
    const counter = sideKeysCounter(current, deviceModes);
    if (counter === undefined) throw new ComposeError('the counter stopped reading');
    const at = end.start;
    const length = sideKeysCounterBytes(current, { number: 1, total: 2, counter }, (address) => address).length;
    const hole = relocate(current, at, length);
    const base = current.flashBase + at;
    hole.bytes.set(sideKeysCounterBytes(current, { number: 1, total: 2, counter },
      (address) => (address >= base ? address + length : address)), at);
    current = parse(hole.bytes);

    const rowPage = (bound: number): Uint8Array => pageList([bound]);
    current = appendModePage(current, menu, rowPage(rowListOf(k)), rowPage(rowCopyOf(k)), (now) => {
      const fresh = sideKeysChrome(now, menu);
      const freshCounter = sideKeysCounter(now, deviceModes);
      if (freshCounter === undefined) throw new ComposeError('the counter stopped reading');
      return sideKeysPageProgram(now, fresh, fresh.title, [{ codes: rowLabels[k] as number[] }],
        { number: 2, total: 2, counter: freshCounter });
    });
  });

  return {
    bytes: restamped(current.blob), mode, menus: copies, rowList: rowCopyOf(0), rowLists: 2 * copies.length,
    pagesAdded: copies,
  };
}
