/**
 * The Harmony 600, 650 and 700's three screen records built from a description: the idle device list, the
 * activity menu and Off, `todo-compile-650.md` 7.3, section 356. The four slot family's half of what was one
 * module, `screenrecords.ts`, until `todo-compile-one.md` 3.3.3.2: the machinery every family builds a mode record
 * with, `recordReading`, `recordBuilding`, `withModeRecords` and `assertRebuilt`, stays shared there, and the
 * description, the builder and the check of these three screens are this family's, here. The module's account of
 * what a description carries, what is generated and how the reading is kept honest is in `screenrecords.ts`'
 * header, which describes both halves.
 */
import { ACTIVITY_MENU_MARKER_VALUE, DEVICE_MENU_MARKER_VALUE, menuMarkerOf } from '../../shared/menus.ts';
import { SCAN_FOUR_TAG, cornerPrograms, holdsLogitechLook, DEVICE_MODE_PROGRAM_TAG, DEVICES_KEY_TAG } from './chrome.ts';
import { KEYPAD_FIRST_SCAN, KEYPAD_LAST_SCAN } from './modezero.ts';
import { type FourSlotMenuChrome, type FourSlotMenuKind, type FourSlotMenuLabel, type FourSlotMenuPageContent, fourSlotMenuChrome, fourSlotMenuWords, fourSlotMenus, menuPageContent, menuPageListBytes, menuPageParts } from './menus.ts';
import { activityRowListBody, deviceListRowBody } from './devicelist.ts';
import { describeWiring } from './wiring.ts';
import { fixedLineScreenParts, startupPicture } from './activityscreen.ts';
import { FOUR_SLOT_ITEMS, FOUR_SLOT_ROWS } from './geometry.ts';
import { MAP_VALUE_OPCODE, KEY_EVENT_PRESS, KEY_EVENT_SHIFT, SELECT_BINDING_SET, SELECT_BINDING_SET_MASK, activities, compilerTagOrder, ENTER_MODE, RUN_SCREEN_PROGRAM } from '../../inventory.ts';
import { type Container } from '../../gspm.ts';
import { ComposeError, type ValueReader, blobReader } from '../../compose.ts';
import { type ContainerLayout, type ContainerPiece, layOutContainer, takeApart } from '../../frame.ts';
import { STATE_WRITE_BASE } from '../../actions.ts';
import { ACTION_LIST_INDEX_OPCODE, taggedListBytes } from '../../sections.ts';
import { SCREEN_DRAW_IMAGE, SCREEN_DRAW_IMAGE_AT, type ScreenInstruction } from '../../screen.ts';
import { type PieceTarget } from '../../statetables.ts';
import { ScreenRecordError, type RecordFrame, type RecordPlace, recordReading, type BuiltScreen, recordBuilding, withModeRecords, assertRebuilt } from '../../screenrecords.ts';

/** The three screens, in the words of section 356. */
export type ScreenRecordKind = 'idle device list' | 'activity menu' | 'off';
export const SCREEN_RECORD_KINDS: readonly ScreenRecordKind[] = ['idle device list', 'activity menu', 'off'];

/**
 * All Off's working screen's title, drawn where a start up screen draws "Starting" and the activity, on
 * every arch 14 compile `test/screenrecords.test.ts` reads, 22 of 22. **Fitted**: every compile here is in English.
 */
export const OFF_TITLE = 'Turning system off';

/** One row of a menu: what it enters or selects, and its label as the configuration spells it. */
export interface ScreenMenuRow {
  /** The device mode a device row enters, or the base slot 9 entry an activity row selects. */
  target: number;
  label: FourSlotMenuLabel;
}

/**
 * The base slot 10 lists one place of a menu runs, per button in `FOUR_SLOT_ITEMS` order: one for a
 * corner, two for a row of the activity menu, on the page and on its copy.
 */
export interface ScreenMenuSlot {
  page: number[];
  copy: number[];
}

/** A menu's description. */
export interface ScreenMenuSpec {
  kind: 'idle device list' | 'activity menu';
  mode: number;
  /** In the order the menu shows them, page after page, each page in fill order. */
  rows: ScreenMenuRow[];
  /** The lists, per place, in the same order as `rows`; a row takes the slot at its place. */
  slots: ScreenMenuSlot[];
  titleFont: number;
  counterFont: number;
  /**
   * The operand a `0x72` maps through: under the key under the display's centre on the idle list, and
   * under scan 4 on the activity menu, both section 352's record back to the running activity.
   */
  backKey: number;
  /**
   * The activity menu's alone, while it has no row: the list the press of scan 4, More Activities, calls
   * instead of mapping back, which shows "add Activities". Logitech's one compile with no activity,
   * `harvest_650_two_devices`, calls `[07 FFFD, 7E addActivities]` there, and More Activities on ours did
   * nothing on the Harmony 650 and the 700 while it mapped back, section 383. A menu with a row maps back,
   * as all 23 compiles with activities do, so this is written only while `rows` is empty.
   */
  addActivities?: number;
  /** The activity menu's alone: the operand its key under the display's centre maps through, section 334. */
  devicesKey?: number;
  /** The base slot 11 program queued under the program tag and on every page. */
  corner: number;
  /** The menu marker variable every row writes, section 329. */
  marker: number;
  pictures: { one?: PieceTarget; several?: PieceTarget; topBar: PieceTarget; bottomBar: PieceTarget };
}

/** Off's description. */
export interface ScreenOffSpec {
  mode: number;
  font: number;
  picture: PieceTarget;
}

export interface ScreenRecordsSpec {
  idle: ScreenMenuSpec;
  menu: ScreenMenuSpec;
  off: ScreenOffSpec;
  /**
   * The order the three are laid out in. Which screen draws a text inline and which points at it follows
   * from it, since the compiler's one inline copy is the lowest addressed, section 334.
   */
  order: ScreenRecordKind[];
  /**
   * Per text the screens draw, keyed by its glyph codes joined, the copy outside the three screens it is
   * drawn by reference to. A text not here is drawn inline the first time the three draw it and by
   * reference to that copy afterwards.
   */
  homes: Map<string, PieceTarget>;
}

/** Where the configuration's own records sat, which `withScreenRecords` puts the built ones in place of. */
export interface ScreenRecordsPlace {
  screens: Record<ScreenRecordKind, RecordPlace>;
  /** The base slot 10 list pieces the rows run, by index. */
  rowLists: Map<number, ContainerPiece>;
  /** How many leading bytes of each piece above are the structure; the rest is carried as it is. */
  lengths: Map<ContainerPiece, number>;
  /** Per program piece above, the glyph codes of each text it draws inline, by where the codes start. */
  inline: Map<ContainerPiece, Map<number, string>>;
}

export interface ScreenRecordsDescribed {
  spec: ScreenRecordsSpec;
  place: ScreenRecordsPlace;
  /** The blob offsets read as values, through the reader. */
  described: Set<number>;
  /** The blob offset of every byte the three records hold, copies and row lists included. */
  structure: Set<number>;
  /**
   * The offsets of `structure` that are address fields, per what they name: something the description
   * reads, a picture or a text kept elsewhere, or a structure built here.
   */
  addresses: { read: Set<number>; built: Set<number> };
  /** What each run of `structure` is, for saying where a difference lies. */
  regions: { from: number; to: number; what: string }[];
}

const press = (scan: number): number => (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan;

/** The press of every keypad scan, 1 to 54, in the compiler's order: a start up screen's key map, section 336. */
function keypadTags(): number[] {
  return compilerTagOrder(Array.from({ length: KEYPAD_LAST_SCAN - KEYPAD_FIRST_SCAN + 1 }, (_, k) => press(KEYPAD_FIRST_SCAN + k)));
}

/** A menu's own key map tags, in the compiler's order. */
function menuTags(kind: ScreenMenuSpec['kind']): number[] {
  return compilerTagOrder(kind === 'idle device list'
    ? [DEVICES_KEY_TAG, DEVICE_MODE_PROGRAM_TAG]
    : [DEVICES_KEY_TAG, SCAN_FOUR_TAG, DEVICE_MODE_PROGRAM_TAG]);
}

/** The buttons of place `k` on a menu page: a corner's one, or a row's two. */
function placeScans(kind: ScreenMenuSpec['kind'], k: number): number[] {
  if (kind === 'idle device list') return [(FOUR_SLOT_ITEMS[k] as (typeof FOUR_SLOT_ITEMS)[number]).scan];
  return [...(FOUR_SLOT_ROWS[k] as readonly number[])];
}

/** How many places a page of the kind holds. */
function capacity(kind: ScreenMenuSpec['kind']): number {
  return kind === 'idle device list' ? FOUR_SLOT_ITEMS.length : FOUR_SLOT_ROWS.length;
}

/**
 * The idle device list's, the activity menu's and Off's modes in a configuration: the first two as
 * `fourSlotMenus` finds them, Off as All Off reaches it, the first mode the Off key map's first called
 * list enters, following its calls depth first.
 */
export function screenRecordModes(c: Container, layout: ContainerLayout): Record<ScreenRecordKind, number> {
  if (c.architecture !== 14) throw new ScreenRecordError('the screen records are built for the Harmony 600, 650 and 700 alone');
  const menus = fourSlotMenus(c);
  const idle = menus.find((one) => one.kind === 'idle device list')?.menu;
  const menu = menus.find((one) => one.kind === 'activity menu')?.menu;
  const first = describeWiring(layout).lists['idleEnter.first'];
  const lists = c.actionLists() ?? [];
  const seen = new Set<number>();
  const entered = (index: number): number | undefined => {
    if (seen.has(index)) return undefined;
    seen.add(index);
    for (const one of lists[index] ?? []) {
      if (one.opcode === ENTER_MODE) return one.operand;
      if (one.opcode === ACTION_LIST_INDEX_OPCODE) {
        const found = entered(one.operand);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };
  const off = first === undefined ? undefined : entered(first);
  if (idle === undefined || menu === undefined || off === undefined) {
    throw new ScreenRecordError('the configuration lacks an idle device list, an activity menu or a screen All Off enters');
  }
  return { 'idle device list': idle, 'activity menu': menu, off };
}

/**
 * Read off a configuration what a composer would supply for its three screen records, and where
 * Logitech's sat. `layout` is `takeApart(c)`; `read` is where every value is taken from, the
 * configuration's own bytes unless a caller hands another. Refuses a record this does not build: a wide
 * own key map, other tags, a row whose page and copy lists run different rows, a page short of full
 * before the last, a text named by two copies.
 */
export function describeScreenRecords(
  c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c),
): ScreenRecordsDescribed {
  const modes = screenRecordModes(c, layout);
  const reading = recordReading(c, layout, read);
  const { value, value16, value24, frame, targetOf } = reading;

  // A menu: its own key map's operands, its rows and their lists, its fonts and its pictures.
  const menu = (kind: ScreenMenuSpec['kind']): { spec: ScreenMenuSpec; frame: RecordFrame } => {
    const mode = modes[kind];
    const f = frame(kind, mode);
    const tags = menuTags(kind);
    const ownEntries = f.record.entries;
    // The activity menu's scan 4 calls a list instead while it has no row, `addActivities`.
    const callsAList = (one: { tag: number; opcode: number }): boolean => kind === 'activity menu' && one.tag === SCAN_FOUR_TAG
      && one.opcode === ACTION_LIST_INDEX_OPCODE;
    if (c.blob[f.ownOff] === 0 || ownEntries.length !== tags.length || ownEntries.some((one, k) => one.tag !== tags[k]
      || (one.opcode !== (one.tag === DEVICE_MODE_PROGRAM_TAG ? RUN_SCREEN_PROGRAM : MAP_VALUE_OPCODE) && !callsAList(one)))) {
      throw new ScreenRecordError(`the ${kind}'s own key map is not the one built`);
    }
    const operandOf = (tag: number): number => value16(f.ownOff + 1 + 4 * tags.indexOf(tag) + 1);
    const scanFour = ownEntries.find((one) => one.tag === SCAN_FOUR_TAG);
    const addActivities = scanFour !== undefined && callsAList(scanFour) ? operandOf(SCAN_FOUR_TAG) : undefined;
    // Without the back key of its own, the activity menu's is the device list's: the two are one operand on
    // 23 of 23 compiles with activities, section 383.
    const idleBack = (): number => {
      const idle = frame('idle device list', modes['idle device list']);
      return value16(idle.ownOff + 1 + 4 * menuTags('idle device list').indexOf(DEVICES_KEY_TAG) + 1);
    };
    const backKey = kind === 'idle device list' ? operandOf(DEVICES_KEY_TAG)
      : addActivities === undefined ? operandOf(SCAN_FOUR_TAG) : idleBack();
    const devicesKey = kind === 'activity menu' ? operandOf(DEVICES_KEY_TAG) : undefined;
    const corner = operandOf(DEVICE_MODE_PROGRAM_TAG);
    // The program queued has to be a corner program, the sending mark's, section 369, by structure; and where
    // Logitech's artwork is held, the one drawing the look's own mark, by content. Our look holds none, section 375.
    if (!cornerPrograms(c).includes(corner)) {
      throw new ScreenRecordError(`the ${kind} runs program ${corner}, which is no corner program`);
    }
    if (holdsLogitechLook(c)) {
      const chrome = fourSlotMenuChrome(c, kind);
      if (chrome.corner !== corner) {
        throw new ScreenRecordError(`the ${kind} runs program ${corner} where its corner program is ${chrome.corner}`);
      }
    }
    const rows: ScreenMenuRow[] = [];
    const slots: ScreenMenuSlot[] = [];
    let marker: number | undefined;
    const pictures: { one?: PieceTarget; several?: PieceTarget; topBar?: PieceTarget; bottomBar?: PieceTarget } = {};
    let titleFont: number | undefined;
    let counterFont: number | undefined;
    f.pages.forEach((one, p) => {
      const content = menuPageContent(c, kind, mode, p, value);
      if (p > 0 && (content.titleFont !== titleFont || content.counterFont !== counterFont)) {
        throw new ScreenRecordError(`the ${kind}'s page ${p + 1} draws its title or counter in another font than its first`);
      }
      titleFont = content.titleFont;
      counterFont = content.counterFont;
      if (p + 1 < f.pages.length && content.labels.length !== capacity(kind)) {
        throw new ScreenRecordError(`the ${kind}'s page ${p + 1} is not full and is not its last`);
      }
      // The page's pictures, off its own address fields: its background is the first `0x02` it draws, the
      // one item background on a page of one place or none and the crossed one on a page of more, and its
      // two bars the first and the last `0x03`. Read rather than found by content, section 375.
      const drawn = (ins: ScreenInstruction | undefined, what: string): PieceTarget => {
        if (ins === undefined) throw new ScreenRecordError(`the ${kind}'s page ${p + 1} draws no ${what}`);
        return targetOf(value24(ins.start + ins.length - 3));
      };
      const bars = one.program.filter((ins) => ins.opcode === SCREEN_DRAW_IMAGE_AT);
      const background = drawn(one.program.find((ins) => ins.opcode === SCREEN_DRAW_IMAGE), 'background');
      const pagePictures = { topBar: drawn(bars[0], 'top bar'), bottomBar: drawn(bars.at(-1), 'bottom bar') };
      const role = content.labels.length > 1 ? 'several' : 'one';
      for (const [name, target] of [[role, background], ['topBar', pagePictures.topBar], ['bottomBar', pagePictures.bottomBar]] as const) {
        const was = pictures[name];
        if (was !== undefined && (was.to !== target.to || was.offset !== target.offset)) {
          throw new ScreenRecordError(`the ${kind}'s pages draw two different ${name} pictures`);
        }
        pictures[name] = target;
      }
      const bound = content.labels.flatMap((_, k) => placeScans(kind, k));
      if (one.list.entries.length !== bound.length || one.copy.entries.length !== bound.length) {
        throw new ScreenRecordError(`the ${kind}'s page ${p + 1} or its copy binds other than its ${bound.length} buttons`);
      }
      content.labels.forEach((label, k) => {
        const operands = (entries: typeof one.list.entries, off: number): number[] => placeScans(kind, k).map((scan) => {
          const at = entries.findIndex((entry) => entry.tag === press(scan) && entry.opcode === ACTION_LIST_INDEX_OPCODE);
          if (at < 0) throw new ScreenRecordError(`the ${kind}'s page ${p + 1} does not bind scan ${scan}`);
          return value16(off + 1 + 4 * at + 1);
        });
        const slot = { page: operands(one.list.entries, one.listOff), copy: operands(one.copy.entries, one.copyOff) };
        // Every list of the place runs one row: the same target and the same marker, read as values.
        const ran = [...slot.page, ...slot.copy].map((index) => {
          const { body, off } = reading.list(index, `which a ${kind} row runs`);
          if (body.length !== 2) {
            throw new ScreenRecordError(`the ${kind}'s page ${p + 1} runs list ${index}, which is not a row's`);
          }
          const [first, second] = body as [(typeof body)[number], (typeof body)[number]];
          const device = kind === 'idle device list';
          const shape = device
            ? first.opcode === ENTER_MODE && second.opcode >= STATE_WRITE_BASE && second.operand === DEVICE_MENU_MARKER_VALUE
            : first.opcode === SELECT_BINDING_SET && (first.operand & SELECT_BINDING_SET_MASK) === SELECT_BINDING_SET_MASK
              && second.opcode >= STATE_WRITE_BASE && second.operand === ACTIVITY_MENU_MARKER_VALUE;
          if (!shape) throw new ScreenRecordError(`the ${kind}'s page ${p + 1} runs list ${index}, which is not a row's`);
          return { target: device ? value16(off + 1) : value(off + 1), marker: value(off + 6) - STATE_WRITE_BASE };
        });
        const head = ran[0] as (typeof ran)[number];
        if (ran.some((one2) => one2.target !== head.target || one2.marker !== head.marker)) {
          throw new ScreenRecordError(`the ${kind}'s page ${p + 1}'s place ${k + 1} runs two rows`);
        }
        if (marker !== undefined && marker !== head.marker) throw new ScreenRecordError(`the ${kind}'s rows write two markers`);
        marker = head.marker;
        rows.push({ target: head.target, label });
        slots.push(slot);
      });
    });
    // A menu with no row, in a configuration with no device or no activity, writes no marker itself: it is
    // the configuration's, `menuMarkerOf`, which holds every writer to one answer.
    const written = marker ?? menuMarkerOf(c);
    if (written === undefined) throw new ScreenRecordError(`the ${kind} has no row and the configuration names no menu marker`);
    if (titleFont === undefined || counterFont === undefined || pictures.topBar === undefined || pictures.bottomBar === undefined) {
      throw new ScreenRecordError(`the ${kind} has no page`);
    }
    return {
      frame: f,
      spec: {
        kind, mode, rows, slots, titleFont, counterFont, backKey, corner, marker: written,
        ...(devicesKey === undefined ? {} : { devicesKey }),
        ...(addActivities === undefined ? {} : { addActivities }),
        pictures: {
          ...(pictures.one === undefined ? {} : { one: pictures.one }),
          ...(pictures.several === undefined ? {} : { several: pictures.several }),
          topBar: pictures.topBar, bottomBar: pictures.bottomBar,
        },
      },
    };
  };

  const idle = menu('idle device list');
  const activities = menu('activity menu');

  // Off: a start up screen's record with every key bound to nothing and one page binding nothing.
  const offFrame = frame('off', modes.off);
  const keypad = keypadTags();
  const offEntries = offFrame.record.entries;
  if (c.blob[offFrame.ownOff] === 0 || offEntries.length !== keypad.length
      || offEntries.some((one, k) => one.tag !== keypad[k] || one.opcode !== 0 || one.operand !== 0)) {
    throw new ScreenRecordError(`Off, mode ${modes.off}, does not bind every key to nothing`);
  }
  const offPage = offFrame.pages[0];
  if (offFrame.pages.length !== 1 || offPage === undefined || offPage.list.entries.length !== 0 || offPage.copy.entries.length !== 0) {
    throw new ScreenRecordError(`Off, mode ${modes.off}, is not one page binding nothing`);
  }
  const select = offPage.program[1];
  if (select?.opcode !== 0x10) throw new ScreenRecordError('Off selects no font second');
  // Its picture off its own address field, the first `0x02` it draws, and on a configuration in one of
  // Logitech's looks held to that look's start up picture as well, which is how it was found before
  // section 375.
  const offImage = offPage.program.find((one) => one.opcode === SCREEN_DRAW_IMAGE);
  if (offImage === undefined) throw new ScreenRecordError('Off draws no picture');
  const offPicture = targetOf(value24(offImage.start + offImage.length - 3));
  if (holdsLogitechLook(c)) {
    const startup = targetOf(startupPicture(c));
    if (startup.to !== offPicture.to || startup.offset !== offPicture.offset) {
      throw new ScreenRecordError('Off draws another picture than the start up screens');
    }
  }
  const off: ScreenOffSpec = { mode: modes.off, font: value(select.start + 1), picture: offPicture };

  // The texts drawn by reference to a copy outside the three screens.
  const homes = reading.homes();

  const frames = { 'idle device list': idle.frame, 'activity menu': activities.frame, off: offFrame };
  const order = [...SCREEN_RECORD_KINDS].sort((a, b) =>
    reading.offsetOf(frames[a].pages[0]?.programPiece as ContainerPiece)
    - reading.offsetOf(frames[b].pages[0]?.programPiece as ContainerPiece));
  // The row lists' address fields hold none, and the copies none either; values read that are not the
  // records' own bytes, a label at a home outside them, are reads of somebody else's bytes.
  return {
    spec: { idle: idle.spec, menu: activities.spec, off, order, homes },
    place: {
      screens: {
        'idle device list': reading.placeOf('idle device list', idle.frame),
        'activity menu': reading.placeOf('activity menu', activities.frame),
        off: reading.placeOf('off', offFrame),
      },
      rowLists: reading.lists, lengths: reading.lengths, inline: reading.inline,
    },
    described: reading.described,
    structure: reading.structure,
    addresses: reading.addresses,
    regions: reading.regions,
  };
}

/**
 * The description with the activity menu's rows in another order, given as the base slot 9 entries the
 * rows select, first shown first. Each row keeps its label and moves to the place the order gives it;
 * the places keep their lists, so what changes is which activity each list selects. Section 351: no
 * owner of a Harmony 600, 650 or 700 can choose the order, so a composer passes its setup description's.
 * Refused unless `entries` holds every row's entry exactly once.
 */
export function inActivityOrder(spec: ScreenRecordsSpec, entries: readonly number[]): ScreenRecordsSpec {
  const byEntry = new Map(spec.menu.rows.map((row) => [row.target, row]));
  if (entries.length !== spec.menu.rows.length || new Set(entries).size !== entries.length
      || entries.some((entry) => !byEntry.has(entry))) {
    throw new ScreenRecordError(`the order ${entries.join(', ')} is not the activity menu's ${[...byEntry.keys()].join(', ')}`);
  }
  return { ...spec, menu: { ...spec.menu, rows: entries.map((entry) => byEntry.get(entry) as ScreenMenuRow) } };
}

export interface BuiltScreenRecords {
  screens: Record<ScreenRecordKind, BuiltScreen>;
  /** The lists the rows run, by base slot 10 index. */
  rowLists: Map<number, ContainerPiece>;
  /** Where the built screens draw each text inline, by its glyph codes joined. */
  inline: Map<string, PieceTarget>;
  homes: Map<string, PieceTarget>;
}

/**
 * Build the three screen records from a description, `todo-compile-650.md` 7.3. `c` is read for its fonts
 * and its character map only, which spell the words and place the texts, `todo-compile-650.md` 8.2's.
 *
 * Every menu page is `menuPageParts`', section 334, and Off's is `fixedLineScreenParts` with
 * `OFF_TITLE`, section 336's start up screen with another title. The rows fill the pages in order, four
 * corners or two rows to a page; each page's list binds its rows' buttons in `FOUR_SLOT_STORED_ORDER` and
 * its copy the same buttons to the copy's lists. A record's own key map is the kind's tags in
 * `compilerTagOrder`'s order, and Off's binds every keypad press to nothing, as a start up screen's
 * does. A text is drawn by reference to its home in `spec.homes`, else inline the first time the
 * screens draw it in `spec.order` and by reference to that copy after.
 */
export function buildScreenRecords(spec: ScreenRecordsSpec, c: Container): BuiltScreenRecords {
  const rowLists = new Map<number, ContainerPiece>();
  const { programOf, recordOf: recordOfBytes, inline } = recordBuilding(spec.homes);
  const recordOf = (
    own: readonly { tag: number; operand: number; opcode: number }[], programs: ContainerPiece[],
    lists: Uint8Array[], copies: Uint8Array[],
  ): BuiltScreen => recordOfBytes(taggedListBytes(own), programs, lists, copies);

  const menu = (m: ScreenMenuSpec): BuiltScreen => {
    if (m.rows.length !== m.slots.length) throw new ScreenRecordError(`the ${m.kind} has ${m.rows.length} rows and ${m.slots.length} places`);
    const perPage = capacity(m.kind);
    const pages = Math.max(1, Math.ceil(m.rows.length / perPage));
    const words = fourSlotMenuWords(c, m.kind);
    const chrome: FourSlotMenuChrome = {
      kind: m.kind as FourSlotMenuKind, look: 'the description\'s',
      one: m.pictures.one === undefined ? undefined : 0,
      several: m.pictures.several === undefined ? undefined : 1,
      corner: m.corner, topBar: 2, bottomBar: 3, ...words,
    };
    const pictures = [m.pictures.one, m.pictures.several, m.pictures.topBar, m.pictures.bottomBar];
    const programs: ContainerPiece[] = [];
    const lists: Uint8Array[] = [];
    const copies: Uint8Array[] = [];
    for (let p = 0; p < pages; p += 1) {
      const onPage = m.rows.slice(p * perPage, (p + 1) * perPage);
      const content: FourSlotMenuPageContent = {
        number: p + 1, total: pages, titleFont: m.titleFont, counterFont: m.counterFont, labels: onPage.map((row) => row.label),
      };
      programs.push(programOf(menuPageParts(c, chrome, content), pictures));
      const bindings = (side: 'page' | 'copy'): { scan: number; list: number }[] => onPage.flatMap((_, k) => {
        const slot = m.slots[p * perPage + k] as ScreenMenuSlot;
        return placeScans(m.kind, k).map((scan, b) => ({ scan, list: slot[side][b] as number }));
      });
      lists.push(menuPageListBytes(bindings('page')));
      copies.push(menuPageListBytes(bindings('copy')));
    }
    // The lists the rows run: the same row on the page and on its copy.
    m.rows.forEach((row, r) => {
      const slot = m.slots[r] as ScreenMenuSlot;
      const body = m.kind === 'idle device list'
        ? deviceListRowBody(row.target, { opcode: STATE_WRITE_BASE + m.marker, operand: DEVICE_MENU_MARKER_VALUE })
        : activityRowListBody(row.target, STATE_WRITE_BASE + m.marker);
      for (const index of [...slot.page, ...slot.copy]) {
        const was = rowLists.get(index);
        if (was !== undefined && was.bytes.join(',') !== body.join(',')) {
          throw new ScreenRecordError(`list ${index} would run two rows`);
        }
        rowLists.set(index, { bytes: body, refs: [], owner: 'slot-10-list' });
      }
    });
    // More Activities shows "add Activities" while the menu has no row, and maps back once it has one.
    const addActivities = m.kind === 'activity menu' && m.rows.length === 0 ? m.addActivities : undefined;
    const operand = (tag: number): number => {
      if (tag === DEVICE_MODE_PROGRAM_TAG) return m.corner;
      if (tag === SCAN_FOUR_TAG && addActivities !== undefined) return addActivities;
      if (m.kind === 'activity menu' && tag === DEVICES_KEY_TAG) {
        if (m.devicesKey === undefined) throw new ScreenRecordError('the activity menu names no record for its key under Devices');
        return m.devicesKey;
      }
      return m.backKey;
    };
    const own = menuTags(m.kind).map((tag) => ({
      tag, operand: operand(tag),
      opcode: tag === DEVICE_MODE_PROGRAM_TAG ? RUN_SCREEN_PROGRAM
        : tag === SCAN_FOUR_TAG && addActivities !== undefined ? ACTION_LIST_INDEX_OPCODE : MAP_VALUE_OPCODE,
    }));
    return recordOf(own, programs, lists, copies);
  };

  const off = (o: ScreenOffSpec): BuiltScreen => {
    const program = programOf(fixedLineScreenParts(c, 0, o.font, OFF_TITLE), [o.picture]);
    const empty = menuPageListBytes([]);
    return recordOf(keypadTags().map((tag) => ({ tag, operand: 0, opcode: 0 })), [program], [empty], [empty]);
  };

  const screens = {} as Record<ScreenRecordKind, BuiltScreen>;
  for (const kind of spec.order) {
    try {
      screens[kind] = kind === 'off' ? off(spec.off) : menu(kind === 'idle device list' ? spec.idle : spec.menu);
    } catch (error) {
      if (error instanceof ComposeError) throw new ScreenRecordError(`${kind}: ${error.message}`);
      throw error;
    }
  }
  return { screens, rowLists, inline, homes: spec.homes };
}

/** Every piece `buildScreenRecords` made, for a caller counting what it generated. */
export function builtScreenPieces(built: BuiltScreenRecords): ContainerPiece[] {
  return [
    ...SCREEN_RECORD_KINDS.flatMap((kind) => {
      const one = built.screens[kind];
      return [one.own, ...one.programs, ...one.records, ...one.lists, one.entry];
    }),
    ...built.rowLists.values(),
  ];
}

/**
 * A layout with the three screen records swapped for the built ones, where the configuration's sat:
 * `withModeRecords` over the three, in `SCREEN_RECORD_KINDS` order.
 */
export function withScreenRecords(
  layout: ContainerLayout, built: BuiltScreenRecords, place: ScreenRecordsPlace,
): ContainerLayout {
  return withModeRecords(
    layout,
    { screens: SCREEN_RECORD_KINDS.map((kind) => built.screens[kind]), lists: built.rowLists, inline: built.inline, homes: built.homes },
    { screens: SCREEN_RECORD_KINDS.map((kind) => place.screens[kind]), lists: place.rowLists, lengths: place.lengths, inline: place.inline },
  );
}

/** What `checkScreenRecords` compared. */
export interface ScreenRecordsChecked {
  /** Bytes the three records hold, copies and row lists included. */
  structure: number;
  rows: number;
  pages: number;
}

/**
 * The configuration's three screen records against the ones built from its own description: described,
 * built, put back, laid out and compared with the configuration byte for byte, refused with the first
 * difference and the structure it falls in. The calibration of section 356; a configuration that passes
 * has every one of those bytes where the builder puts it.
 */
export function checkScreenRecords(c: Container): ScreenRecordsChecked {
  const layout = takeApart(c);
  const d = describeScreenRecords(c, layout);
  assertRebuilt(layOutContainer(withScreenRecords(layout, buildScreenRecords(d.spec, c), d.place)).bytes, c, d.regions);
  const pages = SCREEN_RECORD_KINDS.reduce((sum, kind) => sum + d.place.screens[kind].programs.length, 0);
  return { structure: d.structure.size, rows: d.spec.idle.rows.length + d.spec.menu.rows.length, pages };
}

/**
 * The base slot 9 entries of a configuration's activities in the order `names` gives them, for
 * `inActivityOrder`: a setup description names its activities, and the configuration's name tree holds
 * each with an underscore for a space, section 86. Refused where a name is missing or held twice.
 */
export function activityEntriesByName(c: Container, names: readonly string[]): number[] {
  const held = activities(c).map((one) => ({ name: (one.name ?? '').replaceAll('_', ' '), set: one.set }));
  return names.map((name) => {
    const found = held.filter((one) => one.name === name);
    if (found.length !== 1 || (found[0] as (typeof found)[number]).set < 0) {
      throw new ScreenRecordError(`the configuration holds ${found.length} activities called ${name}`);
    }
    return (found[0] as (typeof found)[number]).set;
  });
}
