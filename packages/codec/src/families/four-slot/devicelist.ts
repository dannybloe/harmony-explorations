/**
 * An activity's own device list on the Harmony 600, 650 and 700, built from the activity and the idle
 * list, composed and checked. Plan 007's four slot family, cut out of `compose.ts` unchanged.
 */
import { STATE_WRITE_BASE } from '../../actions.ts';
import { Writer } from '../../emit.ts';
import { activityMaps } from '../../families/four-slot/activityscreen.ts';
import {
  DEVICE_MODE_PROGRAM_TAG, DEVICES_KEY_TAG, inlineHomes, type KeyMapEntry,
} from '../../families/four-slot/chrome.ts';
import { appendArch14Mode } from '../../families/four-slot/devicescreen.ts';
import {
  fourSlotMenuChrome, type FourSlotMenuChrome, type FourSlotMenuLabel, type FourSlotMenuPageContent,
  fourSlotPageList, idleDeviceList, menuPageBytes, menuPageContent, menuPageParts, pageRecordDifference,
  partsDifference,
} from '../../families/four-slot/menus.ts';
import { archSlot, Container, type Instruction, parse, SCAN_MASK } from '../../gspm.ts';
import {
  caseQueued, compilerTagOrder, devices as deviceInventory, deviceListRowMode, deviceModeMarker, deviceVariables,
  ENTER_MODE, FOUR_SLOT_ITEMS, KEY_EVENT_PRESS, KEY_EVENT_SHIFT, MAP_VALUE_OPCODE, POWER_PROPERTY,
  RUN_SCREEN_PROGRAM, SELECT_BINDING_SET, SELECT_BINDING_SET_MASK, stateVariables,
} from '../../inventory.ts';
import { relocate } from '../../relocate.ts';
import { screenProgram } from '../../screen.ts';
import {
  ACTION_LIST_INDEX_OPCODE, HANDLER_TAG_ENTER, handlerSets, modePages, modeRecords, modeTable, pageListCopies,
  type TaggedEntry, taggedList,
} from '../../sections.ts';
import { arch14Starts, type Arch14Starts, LOCATION_STATE_NAME } from '../../shared/activities.ts';
import { ACTION_TABLE_SLOT, ComposeError, restamped } from '../../shared/core.ts';
import { appendTableEntries } from '../../shared/infrared.ts';
import { ACTIVITY_MENU_MARKER_VALUE } from '../../shared/menus.ts';
import { valueMaps } from '../../valuemap.ts';

/** What `composeActivityDeviceList` built. */
export interface ComposedActivityDeviceList {
  bytes: Uint8Array;
  /** The new device list, base slot 6. */
  mode: number;
  /** The idle device list, whose devices and labels the new one lists: the one the key under Devices opens while no activity runs. */
  idleMode: number;
  /** The device modes its rows enter, in the order they are drawn, page after page. */
  order: number[];
  /** The base slot 14 records whose case for the activity enters the new list. */
  maps: number[];
}

/**
 * The devices an activity switches on, as the device modes the device list enters for them, in the
 * order its enter list switches them on.
 *
 * **The enter list's own instructions and the lists it calls, and no deeper**: a real one groups its
 * power writes into a called list on 12 of 13, `h600_config`'s `[KPN_Power=1 TV_Power=1]`, and writes
 * them inline on the one activity with a single device, as a composed one always does, and both are
 * found at that depth. Deeper is the Remote Assistant's branch, whose
 * lists this has no business reading a device out of.
 *
 * **A device with no power variable is a placeholder in that group**, an instruction of opcode and
 * operand zero where its power write would be: Kodi on the Harmony 650, the Chromecast on the Harmony
 * 600 and the Roku on the Harmony 700, first in its group on all three. Nothing in the enter list says
 * which device it stands for, and on each of those configurations exactly one device on the list has
 * no power variable, so it is that one, by elimination, and two such devices are refused rather than
 * guessed between, a case no configuration here has. `composeActivity` never
 * writes one, since a device without a power variable cannot be one of its targets.
 */
function activitySwitchedOn(c: Container, activity: number, starts: Arch14Starts, listed: readonly number[]): number[] {
  const lists = c.actionLists() ?? [];
  const set = starts.sets.get(activity);
  const address = set === undefined ? undefined : handlerSets(c)?.addresses[set];
  const enter = address === undefined ? undefined
    : taggedList(c, address)?.entries.find((one) => one.tag === HANDLER_TAG_ENTER);
  const enterList = enter === undefined ? undefined : lists[enter.operand];
  if (enterList === undefined) throw new ComposeError(`activity ${activity} has no enter list to read its devices from`);

  const power = new Map(deviceVariables(c).filter((one) => one.property === POWER_PROPERTY)
    .map((one) => [one.index, one.device]));
  const modeOf = new Map<number, number>();
  const unpowered: number[] = [];
  for (const device of deviceInventory(c)) {
    if (device.mode === undefined || !listed.includes(device.mode)) continue;
    const own = device.variables.filter((one) => power.has(one));
    if (own.length === 0) unpowered.push(device.mode);
    for (const variable of own) modeOf.set(variable, device.mode);
  }

  const out: number[] = [];
  const add = (mode: number): void => { if (!out.includes(mode)) out.push(mode); };
  const read = (instructions: readonly Instruction[], depth: number): void => {
    for (const one of instructions) {
      if (one.opcode === ACTION_LIST_INDEX_OPCODE && depth === 0) {
        read(lists[one.operand] ?? [], depth + 1);
      } else if (one.opcode === 0 && one.operand === 0) {
        if (unpowered.length !== 1) {
          throw new ComposeError(`activity ${activity} switches on a device with no power variable and `
            + `${unpowered.length} devices on the list have none, so which one it is cannot be told`);
        }
        add(unpowered[0] as number);
      } else if (one.opcode >= STATE_WRITE_BASE && one.operand !== 0) {
        const mode = modeOf.get(one.opcode - STATE_WRITE_BASE);
        if (mode !== undefined) add(mode);
      }
    }
  };
  read(enterList, 0);
  return out;
}

/**
 * What an activity's own device list is built from, `activityDeviceList`, section 352: everything a
 * list holds, each part either built or named as read.
 */
export interface ActivityDeviceList {
  /** The idle device list, the one the key under Devices opens while no activity runs. */
  idleMode: number;
  /** The device modes the rows enter, page after page: the activity's devices, then the rest. */
  order: number[];
  /** Per page, the device modes on it in `FOUR_SLOT_ITEMS` fill order, four to a page. */
  pages: number[][];
  /** The list record's own entries, built: the centre key and the queued program. */
  entries: KeyMapEntry[];
  /** Per page, what `menuPageParts` draws it from: its number, the fonts and its labels. */
  contents: FourSlotMenuPageContent[];
}

/**
 * The operand the key under a device list's bottom word is mapped with, `0x72` on
 * `(record << 8) | CurrentLocation`, found by content: the one base slot 14 record with a single case, for
 * 0, whose program queues a `0x72` mapping the activity counter through the working screen record,
 * `activityMaps`. That is section 290's route back to the running activity, and every device list and
 * the activity menu's `0x84` entry name this operand on all 23 arch 14 compiles in the lab, 151 of 151,
 * section 352. The record's index is read, since it is the description's order, section 324; what it
 * holds is what finds it.
 */
function deviceListCentreKeyOperand(c: Container, starts: Arch14Starts): number {
  const location = stateVariables(c).find((one) => one.label === LOCATION_STATE_NAME)?.index;
  if (location === undefined) throw new ComposeError(`no ${LOCATION_STATE_NAME} variable to map the centre key through`);
  const working = activityMaps(c, starts).working;
  const want = (working << 8) | starts.counter;
  const found: number[] = [];
  (valueMaps(c) ?? []).forEach((map, index) => {
    if (map.ranges.length !== 0 || map.entries.length !== 1 || map.entries[0]?.[0] !== 0) return;
    const queued = caseQueued(c, map.entries[0][1]);
    if (queued?.opcode === MAP_VALUE_OPCODE && queued.operand === want) found.push(index);
  });
  if (found.length !== 1) {
    throw new ComposeError(`${found.length} records lead from ${LOCATION_STATE_NAME} back to the working screen record, not one`);
  }
  return ((found[0] as number) << 8) | location;
}

/** A device list row's own list: enter the device's mode, then write 1 into the device mode marker. */
export function deviceListRowBody(mode: number, marker: Instruction): Uint8Array {
  return new Writer(1 + 3 * 2).u8(2).u16(mode).u8(ENTER_MODE).u16(marker.operand).u8(marker.opcode).bytes;
}

/**
 * An arch 14 activity menu row's own list: select the activity's base slot 9 entry, then write 0 into
 * the menu marker, `markerOpcode` being the write's opcode, `0x80` plus the variable. Section 289's row
 * without the Harmony One's beep, and the one encoder of it, `composeFourSlotActivityRow` and the screen
 * records of section 356 both writing it.
 */
export function activityRowListBody(set: number, markerOpcode: number): Uint8Array {
  return new Writer(1 + 3 * 2).u8(2)
    .u16(SELECT_BINDING_SET_MASK | set).u8(SELECT_BINDING_SET)
    .u16(ACTIVITY_MENU_MARKER_VALUE).u8(markerOpcode).bytes;
}

/** The roles a built device list page draws by reference where the configuration has drawn them before. */
const DEVICE_LIST_POINTED: ReadonlySet<string> = new Set(['title', 'counter', 'label', 'bottom']);

/**
 * An activity's own device list on a Harmony 600, 650 or 700, built, `todo-compile-650.md` 6.2.11,
 * section 352. Until then `composeActivityDeviceList` moved the idle list's label instructions to their
 * new corners, ran the idle list's row lists and took the word "Activity" off another activity's list;
 * now each part is built:
 *
 * * **the rows are the setup's devices**: the devices the idle list holds, the activity's first, in the
 *   order its enter list switches them on, `activitySwitchedOn`, then the rest in the idle list's order,
 *   four to a page in `FOUR_SLOT_ITEMS` order. The idle order is **read**: it is the two row list's on 23
 *   of 23 compiles and ascending device identifier on 17 of 20, and neither builds it, section 352;
 * * **each row runs a list of its own**, `deviceListRowBody`, and the page's pool copy another, as the
 *   compiler writes them, section 285;
 * * **the record's two entries are built**: the centre key mapped through `deviceListCentreKeyOperand`'s
 *   record, and the program tag running the device pages' corner program, `fourSlotMenuChrome`, stored
 *   in `compilerTagOrder`'s order;
 * * **the pages are `menuPageParts`'**, section 334: background, queued program, bars, title, counter,
 *   the labels at their places and the bottom word "Activity" spelled in the title's size, `bottomWord`,
 *   so no other activity's list is needed.
 *
 * **What is read and why**: each device's label, its font and its lines of glyph codes, as the idle list
 * draws it for that device, which is the configuration's own spelling of the device's name in its own
 * fonts, `todo-compile-650.md` 6.2.12 and chapter 8's letters; the title and counter fonts likewise; and
 * the idle list itself, which is a mode number, the description's order.
 */
export function activityDeviceList(c: Container, activity: number): ActivityDeviceList {
  if (c.architecture !== 14) {
    throw new ComposeError("a device list of an activity's own is built for the Harmony 600, 650 and 700 alone");
  }
  return builtActivityDeviceList(c, activity, arch14Starts(c), fourSlotMenuChrome(c, 'activity device list'));
}

/**
 * `activityDeviceList` with what every activity's list shares read once by the caller: the starts and the
 * chrome, whose device page check is the expensive part, so a check over every list builds it once.
 */
function builtActivityDeviceList(
  c: Container, activity: number, starts: Arch14Starts, chrome: FourSlotMenuChrome,
): ActivityDeviceList {
  if (!starts.startup.has(activity)) {
    throw new ComposeError(`${activity} is not an activity with a start up screen and a menu row`);
  }
  const idleMode = idleDeviceList(c);
  const idleRecord = (modeRecords(c) ?? [])[idleMode];
  if (idleRecord === undefined) throw new ComposeError(`mode ${idleMode} does not read`);
  const lists = c.actionLists() ?? [];
  const marker = deviceModeMarker(c);
  // The idle list's devices, page by page in fill order, and each one's label as that list draws it.
  const labelOf = new Map<number, FourSlotMenuLabel>();
  const idleOrder: number[] = [];
  const idleContents = idleRecord.pages.map((page, p) => {
    const content = menuPageContent(c, 'idle device list', idleMode, p);
    const entries = taggedList(c, page.list)?.entries ?? [];
    content.labels.forEach((label, k) => {
      const item = FOUR_SLOT_ITEMS[k] as (typeof FOUR_SLOT_ITEMS)[number];
      const entry = entries.find((one) => (one.tag & SCAN_MASK) === item.scan);
      const mode = entry === undefined ? undefined : deviceListRowMode(lists[entry.operand], c.architecture, marker);
      if (mode === undefined || labelOf.has(mode)) {
        throw new ComposeError(`the idle device list's page ${p + 1} has no row of its own at place ${k + 1}`);
      }
      labelOf.set(mode, label);
      idleOrder.push(mode);
    });
    return content;
  });
  const first = activitySwitchedOn(c, activity, starts, idleOrder);
  const order = [...first, ...idleOrder.filter((mode) => !first.includes(mode))];
  const perPage = FOUR_SLOT_ITEMS.length;
  const pages = Array.from({ length: Math.ceil(order.length / perPage) }, (_, p) => order.slice(p * perPage, (p + 1) * perPage));
  const firstContent = idleContents[0];
  if (firstContent === undefined) throw new ComposeError('the idle device list has no page');
  if (chrome.corner === undefined) throw new ComposeError('a corner device list queues no corner program here');
  const corner = chrome.corner;
  const centre = deviceListCentreKeyOperand(c, starts);
  const entries = compilerTagOrder([DEVICES_KEY_TAG, DEVICE_MODE_PROGRAM_TAG]).map((tag): KeyMapEntry => (tag === DEVICES_KEY_TAG
    ? { tag, operand: centre, opcode: MAP_VALUE_OPCODE }
    : { tag, operand: corner, opcode: RUN_SCREEN_PROGRAM }));
  const contents = pages.map((modes, p): FourSlotMenuPageContent => ({
    number: p + 1, total: pages.length, titleFont: firstContent.titleFont, counterFont: firstContent.counterFont,
    labels: modes.map((mode) => labelOf.get(mode) as FourSlotMenuLabel),
  }));
  return { idleMode, order, pages, entries, contents };
}

/** What `checkActivityDeviceLists` compared, per kind of part. */
export interface ActivityDeviceListsChecked {
  lists: number;
  pages: number;
  rows: number;
  /** Row bindings, page and pool copy, whose list is a list of their own rather than another's. */
  ownRowLists: number;
}

/**
 * Every activity's own device list in the configuration against the one `activityDeviceList` builds for
 * that activity, refused with the activity and the first difference, section 352: the record's own
 * entries, the page count, every row's device and the list it runs, the pool copy's rows, and every page
 * against `menuPageParts` with the page record. The idle list's own entries are checked against the built
 * ones too, since a list composed here takes them. Section 334's check already compares every menu
 * page with the page built from what **it** holds; this one builds the page from the activity and the
 * idle list's rows instead, so it is what tests the order and the labels' places.
 */
export function checkActivityDeviceLists(c: Container): ActivityDeviceListsChecked {
  const starts = arch14Starts(c);
  const maps = activityMaps(c, starts);
  const valueRecords = valueMaps(c) ?? [];
  const records = modeRecords(c) ?? [];
  const lists = c.actionLists() ?? [];
  const marker = deviceModeMarker(c);
  if (marker === undefined) throw new ComposeError('no device mode marker to read a row by');
  const copies = pageListCopies(c);
  const allPages = modePages(c);
  const chrome = fourSlotMenuChrome(c, 'activity device list');
  const idleMode = idleDeviceList(c);
  const checked: ActivityDeviceListsChecked = { lists: 0, pages: 0, rows: 0, ownRowLists: 0 };
  const sameEntries = (mode: number, built: readonly KeyMapEntry[]): boolean => {
    const own = records[mode]?.entries ?? [];
    return own.length === built.length && own.every((one, k) => one.flags === undefined
      && one.tag === built[k]?.tag && one.operand === built[k]?.operand && one.opcode === built[k]?.opcode);
  };
  for (const activity of [...starts.startup.keys()].sort((a, b) => a - b)) {
    const target = valueRecords[maps.devices[0] as number]?.entries.find(([key]) => key === activity)?.[1];
    const queued = target === undefined ? undefined : caseQueued(c, target);
    if (queued?.opcode !== ENTER_MODE || queued.operand === idleMode) continue;
    const mode = queued.operand;
    const where = `activity ${activity}'s device list ${mode}`;
    const built = builtActivityDeviceList(c, activity, starts, chrome);
    if (!sameEntries(idleMode, built.entries)) throw new ComposeError('the idle device list\'s own entries are not the ones built');
    if (!sameEntries(mode, built.entries)) throw new ComposeError(`${where}: its own entries are not the ones built`);
    const record = records[mode];
    if (record === undefined || record.pages.length !== built.pages.length) {
      throw new ComposeError(`${where}: ${record?.pages.length ?? 0} pages where ${built.pages.length} are built`);
    }
    record.pages.forEach((page, p) => {
      const modes = built.pages[p] as number[];
      const copyAt = copies[allPages.findIndex((one) => one.address === page.address)];
      const own = taggedList(c, page.list)?.entries ?? [];
      const copy = copyAt === undefined ? undefined : taggedList(c, c.flashBase + copyAt)?.entries;
      if (copy === undefined || own.length !== modes.length || copy.length !== modes.length) {
        throw new ComposeError(`${where}: page ${p + 1} or its copy binds other than its ${modes.length} rows`);
      }
      modes.forEach((device, k) => {
        const scan = (FOUR_SLOT_ITEMS[k] as (typeof FOUR_SLOT_ITEMS)[number]).scan;
        const pair = [own, copy].map((entries) => entries.find((one) =>
          one.tag === ((KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan) && one.opcode === ACTION_LIST_INDEX_OPCODE));
        for (const entry of pair) {
          const body = entry === undefined ? undefined : lists[entry.operand];
          if (body?.length !== 2 || body[0]?.opcode !== ENTER_MODE || body[0].operand !== device
              || body[1]?.opcode !== marker.opcode || body[1].operand !== marker.operand) {
            throw new ComposeError(`${where}: page ${p + 1}'s place ${k + 1} does not enter mode ${device} and mark it`);
          }
        }
        const [a, b] = pair as [TaggedEntry, TaggedEntry];
        if (a.operand !== b.operand) checked.ownRowLists += 1;
        checked.rows += 1;
      });
      const program = screenProgram(c, page.program);
      if (program === undefined) throw new ComposeError(`${where}: page ${p + 1} does not read`);
      const difference = partsDifference(c, menuPageParts(c, chrome, built.contents[p] as FourSlotMenuPageContent), program)
        ?? pageRecordDifference(c, page);
      if (difference !== undefined) throw new ComposeError(`${where}: page ${p + 1}: ${difference}`);
      checked.pages += 1;
    });
    checked.lists += 1;
  }
  return checked;
}

/**
 * Give a composed activity on a Harmony 600, 650 or 700 a device list of its own, and make the key
 * under Devices open it.
 *
 * **Every activity on those remotes has one**, section 294: the list the key shows while an activity
 * runs holds every device, the activity's first, and its bottom word says "Activity" where the idle
 * one's says "Activities". `composeActivityScreen` points a composed activity's key at the idle list,
 * which works and draws the wrong word, and this replaces that with the list the compiler would have
 * made.
 *
 * **The list is `activityDeviceList`'s**, built since section 352: the rows, each running a row list of
 * its own and its copy another, the record's entries, and every page from `menuPageParts`, every text
 * drawn by reference where the configuration already draws it, as the compiler's are. **The
 * configuration's own activity lists are checked against the builder first**, `checkActivityDeviceLists`,
 * so one whose lists disagree is refused rather than extended. Nothing is taken off another activity's
 * list any more, so a configuration whose activities have none is composed too.
 *
 * Run it after `composeActivity`, which writes the enter list the order is read from, and after
 * `composeActivityMenuRow`, since an activity is found through the menu row that starts it. It refuses an
 * activity whose key already opens something other than the idle list.
 */
export function composeActivityDeviceList(c: Container, activity: number): ComposedActivityDeviceList {
  if (c.architecture !== 14) {
    throw new ComposeError("a device list of an activity's own is composed for the Harmony 600, 650 and 700 alone");
  }
  const starts = arch14Starts(c);
  // Activities are found through the activity menu rows that start them, so a composed one is found
  // only once `composeActivityMenuRow` has given it its row.
  if (!starts.startup.has(activity)) {
    throw new ComposeError(`${activity} is not an activity with a start up screen and a menu row`);
  }
  const maps = activityMaps(c, starts);
  const valueRecords = valueMaps(c) ?? [];
  const queuedFor = (map: number, key: number): Instruction | undefined => {
    const target = valueRecords[map]?.entries.find(([one]) => one === key)?.[1];
    return target === undefined ? undefined : caseQueued(c, target);
  };
  const idleModes = new Set(maps.devices.map((map) => queuedFor(map, starts.idle)?.operand));
  const idleMode = [...idleModes][0];
  if (idleModes.size !== 1 || idleMode === undefined || idleMode !== idleDeviceList(c)) {
    throw new ComposeError('the records under Devices do not agree on the idle device list');
  }
  for (const map of maps.devices) {
    const one = queuedFor(map, activity);
    if (one?.opcode !== ENTER_MODE || one.operand !== idleMode) {
      throw new ComposeError(`record ${map}'s case for activity ${activity} does not open the idle device list`);
    }
  }
  // A case program another key also runs would take that key to the new list too.
  const ours = new Set(maps.devices.map((map) =>
    valueRecords[map]?.entries.find(([one]) => one === activity)?.[1] as number));
  for (const [index, record] of valueRecords.entries()) {
    for (const [key, target] of record.entries) {
      if (ours.has(target) && !(key === activity && maps.devices.includes(index))) {
        throw new ComposeError(`record ${index}'s case for ${key} shares the program this would change`);
      }
    }
  }
  checkActivityDeviceLists(c);
  const built = builtActivityDeviceList(c, activity, starts, fourSlotMenuChrome(c, 'activity device list'));
  const marker = deviceModeMarker(c);
  if (marker === undefined) throw new ComposeError('no device mode marker for the rows to write');

  // 1. The row lists, one per row on the pages and another per row on their pool copies, appended to
  // base slot 10 the way `composeFourSlotDeviceScreen` appends its own: page rows first, then the copies'.
  const actionSlot = archSlot(c.architecture as number, ACTION_TABLE_SLOT);
  const actionTable = c.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const rowList = actionTable.values.length;
  const rows = built.order.length;
  const bodies = [...built.order, ...built.order].map((mode) => deviceListRowBody(mode, marker));
  const rowAt = actionTable.start;
  const rowHole = relocate(c, rowAt, bodies.reduce((sum, one) => sum + one.length, 0));
  const rowAddresses: number[] = [];
  bodies.reduce((at, body) => {
    rowHole.bytes.set(body, at);
    rowAddresses.push(c.flashBase + at);
    return at + body.length;
  }, rowAt);
  let current = parse(appendTableEntries(parse(rowHole.bytes), actionSlot, rowAddresses));

  // 2. The mode, its pages built, through the step every arch 14 mode composer shares.
  const mode = modeTable(current)?.addresses.length;
  if (mode === undefined) throw new ComposeError('base slot 6 states no table');
  const firstOf = built.pages.map((_, p) => built.pages.slice(0, p).reduce((sum, one) => sum + one.length, 0));
  const pageLists = built.pages.map((modes, p) =>
    fourSlotPageList(modes.map((_, k) => rowList + (firstOf[p] as number) + k)));
  const copyLists = built.pages.map((modes, p) =>
    fourSlotPageList(modes.map((_, k) => rowList + rows + (firstOf[p] as number) + k)));
  current = appendArch14Mode(current, mode, built.entries, pageLists, (now) => {
    const chrome = fourSlotMenuChrome(now, 'activity device list');
    const homes = inlineHomes(now);
    return built.contents.map((content) => {
      const parts = menuPageParts(now, chrome, content);
      return {
        length: menuPageBytes(parts, homes, DEVICE_LIST_POINTED, (address) => address).length,
        build: (shifted: (address: number) => number) => menuPageBytes(parts, homes, DEVICE_LIST_POINTED, shifted),
      };
    });
  }, copyLists);

  // 3. The key under Devices: each record's case for the activity queues the new list instead. The
  // operand is the instruction's first two bytes after the opcode, low byte first, as `caseQueued`
  // reads them.
  for (const map of maps.devices) {
    const target = valueMaps(current)?.[map]?.entries.find(([one]) => one === activity)?.[1];
    const at = target === undefined ? undefined : current.blobOffsetOf(target);
    if (at === undefined) throw new ComposeError(`record ${map} lost its case for activity ${activity}`);
    current.blob.set(new Writer(2).u16(mode).bytes, at + 1);
  }
  current = parse(current.blob);
  return { bytes: restamped(current.blob), mode, idleMode, order: built.order, maps: [...maps.devices] };
}
