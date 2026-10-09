/**
 * Three screens' whole mode records built from a description: `todo-compile-650.md` 7.3, section 356.
 *
 * Since sections 334 and 336 the composers build a menu page's inside and a start up screen's, but the
 * record around them, the mode's own key map, its entry, its page records, each page's tagged list, that
 * list's second copy and the lists the rows run, still came out of a Logitech compile for the three
 * screens every arch 14 configuration has once:
 *
 * * **the idle device list**, the corner list the key under the display's centre opens while no activity
 *   runs, `idleDeviceList`, section 334;
 * * **the activity menu**, its two row pages, section 316;
 * * **Off**, All Off's working screen, "Turning system off" over the three lines every start up screen
 *   draws. The Off key map's enter list calls, first thing, a list that enters it, section 329's `idle`
 *   entry and section 347's `idleEnter.first`, so it is to All Off what an activity's start up screen is
 *   to that activity, and it is built as one, `fixedLineScreenParts`.
 *
 * The pattern is section 347's: `describeScreenRecords` reads off a configuration only what a composer
 * would supply, `buildScreenRecords` generates the rest as pieces, and `withScreenRecords` puts them where
 * Logitech's sat in a `takeApart` layout, so `layOutContainer` can lay the container out again.
 *
 * **What the description carries**, and so what is still read off a configuration:
 *
 * * which mode each screen is, which is the description's numbering, section 324;
 * * per row, in the order the menu shows them, the device mode it enters or the base slot 9 entry it
 *   selects, and its label: the font and the lines of glyph codes, `todo-compile-650.md` 8.2's;
 * * per row, the base slot 10 lists its buttons run on the page and on the copy, which is base slot 10's
 *   numbering, the emission order, and not this item's;
 * * the menu marker variable, the title and counter fonts and Off's font, all the configuration's
 *   numbering;
 * * the operands of each record's own key map: the records the two keys map through and the battery
 *   program queued under the program tag, each an index into a table of somebody else's;
 * * the pictures, by content, `todo-compile-650.md` 9.1's; and the texts drawn by reference, by the
 *   address of the copy they name, which is the configuration's own placement.
 *
 * **What is generated**: every tag and its order, every opcode, every count and page count, every
 * position, the words "Devices", "Activities", "Turning system off", the counters and the three fixed
 * lines, spelled from the configuration's fonts, which text is drawn inline and which by reference, the
 * page records, the entry, each copy, and each row's list. A row's list runs the same two instructions on
 * the page and on the copy, section 352.
 *
 * **How the reading is kept honest.** `describeScreenRecords` reads every value through a `ValueReader`
 * and records the offsets it reads; it finds its way, which opcode is where, how long a text is, which
 * scan a binding is for, the generated inline texts' glyph codes, the coordinates that tell a title
 * from a counter and assign labels to places, and the built address bytes when it classifies a
 * reference, through the container itself. None of those decides a byte of the output. So a caller can hand it a reader over bytes
 * overwritten everywhere but the recorded offsets and get the same description back, which is the blind
 * control `test/screenrecords.test.ts` makes. Where it would read a value it can also build, it checks
 * the two agree instead, the battery program against `fourSlotMenuChrome`'s by content route.
 *
 * **The machinery is shared since section 357**: `recordReading` reads a mode record's frame and accounts
 * for its bytes, `recordBuilding` makes a record's pieces, `withModeRecords` puts built records in a layout
 * and `assertRebuilt` compares the result, and `firmwarescreens.ts` builds the firmware's own screens
 * through the same four rather than a copy of them.
 *
 * Arch 14 only, the Harmony 600, 650 and 700. Read only towards hardware: the result is pieces.
 */
import type { Container, Instruction } from './gspm.ts';
import {
  ACTION_TABLE_SLOT,
  ComposeError,
  DEVICE_MODE_PROGRAM_TAG,
  DEVICES_KEY_TAG,
  type FourSlotMenuChrome,
  type FourSlotMenuKind,
  type FourSlotMenuLabel,
  type FourSlotMenuPageContent,
  type MenuPart,
  type ValueReader,
  activityRowListBody,
  blobReader,
  deviceListRowBody,
  fixedLineScreenParts,
  fourSlotMenuChrome,
  fourSlotMenuWords,
  fourSlotMenus,
  menuPageContent,
  menuPageListBytes,
  menuPageParts,
  menuPartsBytes,
  startupPicture,
  textValues,
} from './compose.ts';
import { archSlot } from './gspm.ts';
import type { ContainerLayout, ContainerPiece, PieceRef } from './frame.ts';
import { layOutContainer, takeApart } from './frame.ts';
import {
  FOUR_SLOT_ITEMS,
  FOUR_SLOT_ROWS,
  KEY_EVENT_PRESS,
  KEY_EVENT_SHIFT,
  SELECT_BINDING_SET,
  SELECT_BINDING_SET_MASK,
  activities,
  compilerTagOrder,
} from './inventory.ts';
import { STATE_WRITE_BASE } from './actions.ts';
import { KEYPAD_FIRST_SCAN, KEYPAD_LAST_SCAN } from './modezero.ts';
import {
  ACTION_LIST_INDEX_OPCODE, type ModePage, type ModeRecord, type TaggedList, modePages, modeRecords, pageListCopies, taggedList,
  taggedListBytes,
} from './sections.ts';
import { type ScreenInstruction, screenProgram } from './screen.ts';
import { describeWiring } from './wiring.ts';
import type { PieceTarget } from './statetables.ts';

/** A refusal, named so a caller can tell a description this does not build from a bug. */
export class ScreenRecordError extends Error {}

/** The three screens, in the words of section 356. */
export type ScreenRecordKind = 'idle device list' | 'activity menu' | 'off';
export const SCREEN_RECORD_KINDS: readonly ScreenRecordKind[] = ['idle device list', 'activity menu', 'off'];

/**
 * All Off's working screen's title, drawn where a start up screen draws "Starting" and the activity, on
 * every arch 14 compile `test/screenrecords.test.ts` reads, 22 of 22. **Fitted**: every compile here is in English.
 */
export const OFF_TITLE = 'Turning system off';

/** `0x7E` enters a mode, section 37. */
const ENTER_MODE = 0x7e;
/** `0x72` maps a variable through a base slot 14 record, section 280. */
const MAP_VALUE = 0x72;
/** `0x73` queues a screen program, section 334. */
const RUN_PROGRAM = 0x73;
/** The marker values a row writes: 1 on a device row, 0 on an activity row, section 329. */
const DEVICE_ROW_MARKER = 1;
const ACTIVITY_ROW_MARKER = 0;
/** A page record on arch 14 is two pointers, the list then the program, section 66. */
const PAGE_RECORD_LENGTH = 6;
/** A mode entry: kind, the back pointer, the page count, then three bytes per page, section 52. */
const ENTRY_HEAD = 6;
/**
 * The press of scan 4, which the reference names More Activities without having measured it. The
 * activity menu maps it through the same record a device list's centre key maps through, back to the
 * running activity, section 352's 151 entries.
 */
const SCAN_FOUR_TAG = (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | 4;


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
  /** The activity menu's alone: the operand its key under the display's centre maps through, section 334. */
  devicesKey?: number;
  /** The base slot 11 program queued under the program tag and on every page. */
  battery: number;
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

/** One page of a mode record as `RecordReading.frame` reads it, with the pieces that hold it. */
export interface RecordPageFrame {
  page: ModePage;
  list: TaggedList;
  listOff: number;
  copy: TaggedList;
  copyOff: number;
  program: ScreenInstruction[];
  programPiece: ContainerPiece;
  recordPiece: ContainerPiece;
  listPiece: ContainerPiece;
  copyAt: PieceTarget & { length: number };
}

/** A mode record as `RecordReading.frame` reads it: its own key map, its entry and its pages. */
export interface RecordFrame {
  record: ModeRecord;
  ownOff: number;
  own: ContainerPiece;
  entry: ContainerPiece;
  pages: RecordPageFrame[];
}

/** Where one record's pieces sit in a `takeApart` layout, which `withModeRecords` replaces. */
export interface RecordPlace {
  /** What the record is, for a refusal's wording. */
  what: string;
  own: ContainerPiece;
  programs: ContainerPiece[];
  records: ContainerPiece[];
  lists: ContainerPiece[];
  entry: ContainerPiece;
  /** Each page list's second copy: where it sits, and its length. */
  copies: (PieceTarget & { length: number })[];
}

/**
 * The bookkeeping of a description read off a configuration's mode records, shared by section 356's
 * three screen records and section 357's firmware screens so that both read a record, a page, a copy
 * and a list the same way and account for every byte alike.
 *
 * `value`, `value16` and `value24` read a value through the caller's reader and record the offset in
 * `described`; everything else finds its way through the configuration's own bytes. `frame` reads one
 * mode record's frame and spans every byte of it in `structure`, its addresses in `addresses`, its
 * pieces' structure lengths in `lengths`, and each program's inline texts in `inline`; `list` does the
 * same for a base slot 10 list a record runs. `homes` resolves, once every frame is read, the texts the
 * programs draw by reference to a copy outside them.
 */
export interface RecordReading {
  value: ValueReader;
  value16: (offset: number) => number;
  value24: (offset: number) => number;
  described: Set<number>;
  structure: Set<number>;
  addresses: { read: Set<number>; built: Set<number> };
  regions: { from: number; to: number; what: string }[];
  lengths: Map<ContainerPiece, number>;
  inline: Map<ContainerPiece, Map<number, string>>;
  /** The base slot 10 list pieces `list` read, by index. */
  lists: Map<number, ContainerPiece>;
  /** The configuration's laid out offsets, `layOutContainer(layout)`. */
  offsetOf: (piece: ContainerPiece) => number;
  blobOf: (address: number) => number;
  targetOf: (address: number) => PieceTarget;
  wholePiece: (address: number, what: string) => ContainerPiece;
  span: (from: number, length: number, what: string) => void;
  addressField: (from: number, kind: 'read' | 'built') => void;
  frame: (what: string, mode: number) => RecordFrame;
  list: (index: number, what: string) => { body: Instruction[]; off: number; piece: ContainerPiece };
  homes: () => Map<string, PieceTarget>;
  placeOf: (what: string, f: RecordFrame) => RecordPlace;
}

/**
 * Start reading mode records off `c`, `layout` being `takeApart(c)` and `read` where every value is taken
 * from. The refusals are `ScreenRecordError`s.
 */
export function recordReading(c: Container, layout: ContainerLayout, read: ValueReader): RecordReading {
  const described = new Set<number>();
  const value: ValueReader = (offset) => {
    described.add(offset);
    return read(offset);
  };
  const value16 = (offset: number): number => value(offset) | (value(offset + 1) << 8);
  const value24 = (offset: number): number => value16(offset) | (value(offset + 2) << 16);

  // Where every piece of the layout sits, so an address can be named as a piece and an offset.
  const laid = layOutContainer(layout);
  if (laid.bytes.length !== c.blob.length) throw new ScreenRecordError('the layout is not the configuration taken apart');
  const all = [layout.keyTable, ...layout.body,
    ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
  const starts = all.map((piece) => ({ piece, at: laid.offsetOf(piece) as number })).sort((a, b) => a.at - b.at);
  const pieceAt = (offset: number): PieceTarget => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if ((starts[mid] as (typeof starts)[number]).at <= offset) low = mid;
      else high = mid - 1;
    }
    const found = starts[low] as (typeof starts)[number];
    if (offset - found.at >= found.piece.bytes.length) throw new ScreenRecordError(`offset ${offset} is in no piece`);
    return { to: found.piece, offset: offset - found.at };
  };
  const blobOf = (address: number): number => {
    const off = c.blobOffsetOf(address);
    if (off === undefined) throw new ScreenRecordError(`0x${address.toString(16)} is outside the configuration`);
    return off;
  };
  const targetOf = (address: number): PieceTarget => pieceAt(blobOf(address));
  const wholePiece = (address: number, what: string): ContainerPiece => {
    const target = targetOf(address);
    if (target.offset !== 0) throw new ScreenRecordError(`${what} does not start a piece`);
    return target.to;
  };

  const records = modeRecords(c) ?? [];
  const allPages = modePages(c);
  const copies = pageListCopies(c);
  const actionLists = c.actionLists() ?? [];
  const listAddresses = c.pointerArrayAt(archSlot(14, ACTION_TABLE_SLOT))?.values ?? [];
  const structure = new Set<number>();
  const addresses = { read: new Set<number>(), built: new Set<number>() };
  const regions: RecordReading['regions'] = [];
  const span = (from: number, length: number, what: string): void => {
    for (let k = 0; k < length; k += 1) structure.add(from + k);
    regions.push({ from, to: from + length, what });
  };
  const addressField = (from: number, kind: 'read' | 'built'): void => {
    for (let k = 0; k < 3; k += 1) addresses[kind].add(from + k);
  };
  const lengths = new Map<ContainerPiece, number>();
  const inline = new Map<ContainerPiece, Map<number, string>>();
  const lists = new Map<number, ContainerPiece>();
  const programPieces = new Set<ContainerPiece>();
  const textRefs: { at: number; one: ScreenInstruction }[] = [];

  // One record's frame: own list, pages, page lists, copies, programs, entry. What it holds is read
  // by the caller.
  const frame = (kind: string, mode: number): RecordFrame => {
    const record = records[mode];
    if (record === undefined) throw new ScreenRecordError(`mode ${mode} does not read`);
    const ownOff = blobOf(record.start);
    const entryOff = blobOf(record.address);
    const own = wholePiece(record.start, `${kind}'s own key map`);
    const entry = wholePiece(record.address, `${kind}'s entry`);
    lengths.set(own, record.length);
    lengths.set(entry, record.entryLength);
    span(ownOff, record.length, `the ${kind}'s own key map`);
    span(entryOff, record.entryLength, `the ${kind}'s entry`);
    addressField(entryOff + 1, 'built');
    const pages = record.pages.map((page, p): RecordPageFrame => {
      if (page.length !== PAGE_RECORD_LENGTH) throw new ScreenRecordError(`${kind}'s page ${p + 1} is not a six byte page record`);
      const recordOff = blobOf(page.address);
      addressField(entryOff + ENTRY_HEAD + 3 * p, 'built');
      span(recordOff, PAGE_RECORD_LENGTH, `the ${kind}'s page ${p + 1}'s record`);
      addressField(recordOff, 'built');
      addressField(recordOff + 3, 'built');
      const listOff = blobOf(page.list);
      const list = taggedList(c, page.list);
      const program = screenProgram(c, page.program);
      const rank = allPages.findIndex((one) => one.address === page.address);
      const copyOff = copies[rank];
      const copy = copyOff === undefined ? undefined : taggedList(c, c.flashBase + copyOff);
      if (list === undefined || program === undefined || copyOff === undefined || copy === undefined) {
        throw new ScreenRecordError(`${kind}'s page ${p + 1}, its list, its program or its copy does not read`);
      }
      const programOff = blobOf(page.program);
      const programLength = Math.max(...program.map((one) => one.start + one.length)) - programOff;
      const programPiece = wholePiece(page.program, `${kind}'s page ${p + 1}'s program`);
      const recordPiece = wholePiece(page.address, `${kind}'s page ${p + 1}'s record`);
      const listPiece = wholePiece(page.list, `${kind}'s page ${p + 1}'s list`);
      lengths.set(programPiece, programLength);
      lengths.set(recordPiece, PAGE_RECORD_LENGTH);
      lengths.set(listPiece, list.length);
      span(programOff, programLength, `the ${kind}'s page ${p + 1}'s program`);
      span(listOff, list.length, `the ${kind}'s page ${p + 1}'s list`);
      span(copyOff, copy.length, `the ${kind}'s page ${p + 1}'s copy`);
      programPieces.add(programPiece);
      const texts = new Map<number, string>();
      for (const one of program) {
        if (one.opcode === 0x02 || one.opcode === 0x03) addressField(one.start + one.length - 3, 'read');
        if (one.opcode === 0x05 && one.glyphs !== undefined) texts.set(one.start + 3 - programOff, [...one.glyphs].join(','));
        if (one.opcode === 0x04) textRefs.push({ at: one.start + 3, one });
      }
      inline.set(programPiece, texts);
      return {
        page, list, listOff, copy, copyOff, program, programPiece, recordPiece, listPiece,
        copyAt: { ...pieceAt(copyOff), length: copy.length },
      };
    });
    return { record, ownOff, own, entry, pages };
  };

  // A base slot 10 list a record runs, which the caller builds: spanned whole.
  const list = (index: number, what: string): { body: Instruction[]; off: number; piece: ContainerPiece } => {
    const body = actionLists[index];
    const address = listAddresses[index];
    if (body === undefined || address === undefined) throw new ScreenRecordError(`list ${index} does not read`);
    const off = blobOf(address);
    const piece = wholePiece(address, `list ${index}`);
    lengths.set(piece, 1 + 3 * body.length);
    lists.set(index, piece);
    span(off, 1 + 3 * body.length, `list ${index}, ${what}`);
    return { body, off, piece };
  };

  // The texts drawn by reference to a copy outside the records read. A text drawn by reference to a copy
  // inside them is the builder's to place, so neither its address nor its codes are read; one drawn by
  // reference to a copy elsewhere names that copy, read.
  const homes = (): Map<string, PieceTarget> => {
    const found = new Map<string, PieceTarget>();
    for (const { at, one } of textRefs) {
      const target = targetOf(c.blob[at]! | (c.blob[at + 1]! << 8) | (c.blob[at + 2]! << 16));
      if (programPieces.has(target.to)) {
        addressField(at, 'built');
        continue;
      }
      addressField(at, 'read');
      const codes = textValues(c, one, value);
      if (codes === undefined) throw new ScreenRecordError('a text drawn by reference does not read');
      const key = codes.join(',');
      const named = targetOf(value24(at));
      const was = found.get(key);
      if (was !== undefined && (was.to !== named.to || was.offset !== named.offset)) {
        throw new ScreenRecordError(`the screens point at two copies of one text, ${key}`);
      }
      found.set(key, named);
    }
    return found;
  };

  const placeOf = (what: string, f: RecordFrame): RecordPlace => ({
    what, own: f.own, entry: f.entry,
    programs: f.pages.map((one) => one.programPiece),
    records: f.pages.map((one) => one.recordPiece),
    lists: f.pages.map((one) => one.listPiece),
    copies: f.pages.map((one) => one.copyAt),
  });

  return {
    value, value16, value24, described, structure, addresses, regions, lengths, inline, lists,
    offsetOf: (piece) => laid.offsetOf(piece) as number,
    blobOf, targetOf, wholePiece, span, addressField, frame, list, homes, placeOf,
  };
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
  const { value, value16, frame, targetOf } = reading;

  // A menu: its own key map's operands, its rows and their lists, its fonts and its pictures.
  const menu = (kind: ScreenMenuSpec['kind']): { spec: ScreenMenuSpec; frame: RecordFrame } => {
    const mode = modes[kind];
    const f = frame(kind, mode);
    const tags = menuTags(kind);
    const ownEntries = f.record.entries;
    if (c.blob[f.ownOff] === 0 || ownEntries.length !== tags.length || ownEntries.some((one, k) => one.tag !== tags[k]
      || one.opcode !== (one.tag === DEVICE_MODE_PROGRAM_TAG ? RUN_PROGRAM : MAP_VALUE))) {
      throw new ScreenRecordError(`the ${kind}'s own key map is not the one built`);
    }
    const operandOf = (tag: number): number => value16(f.ownOff + 1 + 4 * tags.indexOf(tag) + 1);
    const backKey = operandOf(kind === 'idle device list' ? DEVICES_KEY_TAG : SCAN_FOUR_TAG);
    const devicesKey = kind === 'activity menu' ? operandOf(DEVICES_KEY_TAG) : undefined;
    const battery = operandOf(DEVICE_MODE_PROGRAM_TAG);
    const chrome = fourSlotMenuChrome(c, kind);
    if (chrome.battery !== battery) {
      throw new ScreenRecordError(`the ${kind} runs program ${battery} where its battery program is ${chrome.battery}`);
    }
    const rows: ScreenMenuRow[] = [];
    const slots: ScreenMenuSlot[] = [];
    let marker: number | undefined;
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
            ? first.opcode === ENTER_MODE && second.opcode >= STATE_WRITE_BASE && second.operand === DEVICE_ROW_MARKER
            : first.opcode === SELECT_BINDING_SET && (first.operand & SELECT_BINDING_SET_MASK) === SELECT_BINDING_SET_MASK
              && second.opcode >= STATE_WRITE_BASE && second.operand === ACTIVITY_ROW_MARKER;
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
    if (marker === undefined || titleFont === undefined || counterFont === undefined) {
      throw new ScreenRecordError(`the ${kind} has no row`);
    }
    const picture = (address: number | undefined): PieceTarget | undefined => (address === undefined ? undefined : targetOf(address));
    return {
      frame: f,
      spec: {
        kind, mode, rows, slots, titleFont, counterFont, backKey, battery, marker,
        ...(devicesKey === undefined ? {} : { devicesKey }),
        pictures: {
          ...(chrome.one === undefined ? {} : { one: picture(chrome.one) as PieceTarget }),
          ...(chrome.several === undefined ? {} : { several: picture(chrome.several) as PieceTarget }),
          topBar: targetOf(chrome.topBar), bottomBar: targetOf(chrome.bottomBar),
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
  const off: ScreenOffSpec = { mode: modes.off, font: value(select.start + 1), picture: targetOf(startupPicture(c)) };

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

/** One screen as built: its pieces in the order the record lays them out. */
export interface BuiltScreen {
  own: ContainerPiece;
  programs: ContainerPiece[];
  records: ContainerPiece[];
  lists: ContainerPiece[];
  /** Each page list's second copy, section 69, as bytes, since nothing names it. */
  copies: Uint8Array[];
  entry: ContainerPiece;
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
 * The builder's half of `RecordReading`: pieces for a record's programs and for the record around them,
 * shared by section 356's three screen records and section 357's firmware screens.
 *
 * `programOf` spells a program's parts through `menuPartsBytes`, a picture as a reference to
 * `pictures[handle]` and a text by reference to its home in `homes`, else inline the first time any
 * program this builder makes draws it and by reference to that copy afterwards, which is the compiler's
 * one inline copy, section 334, as long as the caller builds in layout order. `inline` collects where
 * each text was drawn inline. `recordOf` makes the page lists, the page records, the own key map and the
 * entry: kind 0, the back pointer, the page count, one page record per program.
 */
export interface RecordBuilding {
  programOf: (parts: readonly MenuPart[], pictures: readonly (PieceTarget | undefined)[]) => ContainerPiece;
  recordOf: (own: Uint8Array, programs: ContainerPiece[], lists: Uint8Array[], copies: Uint8Array[], ownOwner?: string) => BuiltScreen;
  inline: Map<string, PieceTarget>;
}

export function recordBuilding(homes: ReadonlyMap<string, PieceTarget>): RecordBuilding {
  const inline = new Map<string, PieceTarget>();

  /** A program piece from parts, its pictures named by `pictures[handle]`. */
  const programOf = (parts: readonly MenuPart[], pictures: readonly (PieceTarget | undefined)[]): ContainerPiece => {
    const piece: ContainerPiece = { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' };
    const keyOf = (part: Extract<MenuPart, { op: 'text' }>): string => part.codes.join(',');
    piece.bytes = menuPartsBytes(
      parts,
      (part) => (homes.has(keyOf(part)) || inline.has(keyOf(part)) ? 0 : undefined),
      (handle, at, part) => {
        const target = part.op === 'text'
          ? homes.get(keyOf(part)) ?? inline.get(keyOf(part))
          : pictures[handle];
        if (target === undefined) throw new ScreenRecordError(`a ${part.op} names nothing the description holds`);
        piece.refs.push({ at, to: target.to, offset: target.offset });
        return [0, 0, 0];
      },
      (part, at) => inline.set(keyOf(part), { to: piece, offset: at }),
    );
    return piece;
  };

  /** A record's pieces around its programs: page lists, page records, own list and entry. */
  const recordOf = (
    own: Uint8Array, programs: ContainerPiece[], lists: Uint8Array[], copies: Uint8Array[], ownOwner = 'slot-6-mode',
  ): BuiltScreen => {
    const ownPiece: ContainerPiece = { bytes: own, refs: [], owner: ownOwner };
    const listPieces = lists.map((bytes): ContainerPiece => ({ bytes, refs: [], owner: 'slot-6-page-list' }));
    const records = programs.map((program, p): ContainerPiece => ({
      bytes: new Uint8Array(PAGE_RECORD_LENGTH), owner: 'slot-6-page',
      refs: [{ at: 0, to: listPieces[p] as ContainerPiece, offset: 0 }, { at: 3, to: program, offset: 0 }],
    }));
    const entry = new Uint8Array(ENTRY_HEAD + 3 * programs.length);
    entry[4] = programs.length & 0xff;
    entry[5] = programs.length >> 8;
    const entryRefs: PieceRef[] = [{ at: 1, to: ownPiece, offset: 0 },
      ...records.map((record, p): PieceRef => ({ at: ENTRY_HEAD + 3 * p, to: record, offset: 0 }))];
    return {
      own: ownPiece, programs, records, lists: listPieces, copies,
      entry: { bytes: entry, refs: entryRefs, owner: 'slot-6-entry' },
    };
  };

  return { programOf, recordOf, inline };
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
      battery: m.battery, topBar: 2, bottomBar: 3, ...words,
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
        ? deviceListRowBody(row.target, { opcode: STATE_WRITE_BASE + m.marker, operand: DEVICE_ROW_MARKER })
        : activityRowListBody(row.target, STATE_WRITE_BASE + m.marker);
      for (const index of [...slot.page, ...slot.copy]) {
        const was = rowLists.get(index);
        if (was !== undefined && was.bytes.join(',') !== body.join(',')) {
          throw new ScreenRecordError(`list ${index} would run two rows`);
        }
        rowLists.set(index, { bytes: body, refs: [], owner: 'slot-10-list' });
      }
    });
    const operand = (tag: number): number => {
      if (tag === DEVICE_MODE_PROGRAM_TAG) return m.battery;
      if (m.kind === 'activity menu' && tag === DEVICES_KEY_TAG) {
        if (m.devicesKey === undefined) throw new ScreenRecordError('the activity menu names no record for its key under Devices');
        return m.devicesKey;
      }
      return m.backKey;
    };
    const own = menuTags(m.kind).map((tag) => ({
      tag, operand: operand(tag), opcode: tag === DEVICE_MODE_PROGRAM_TAG ? RUN_PROGRAM : MAP_VALUE,
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

/** Built mode records and the lists they run, for `withModeRecords`, paired by position with a `ModeRecordsPlace`'s. */
export interface BuiltModeRecords {
  screens: readonly BuiltScreen[];
  /** The base slot 10 lists built, by index. */
  lists: ReadonlyMap<number, ContainerPiece>;
  /** Where the built programs draw each text inline, by its glyph codes joined. */
  inline: ReadonlyMap<string, PieceTarget>;
  homes: ReadonlyMap<string, PieceTarget>;
}

/** Where a configuration's own mode records and lists sat, `RecordReading`'s. */
export interface ModeRecordsPlace {
  screens: readonly RecordPlace[];
  lists: ReadonlyMap<number, ContainerPiece>;
  /** How many leading bytes of each piece above are the structure; the rest is carried as it is. */
  lengths: ReadonlyMap<ContainerPiece, number>;
  /** Per program piece above, the glyph codes of each text it draws inline, by where the codes start. */
  inline: ReadonlyMap<ContainerPiece, ReadonlyMap<number, string>>;
}

/**
 * A layout with mode records swapped for built ones, where the configuration's sat, the one placing
 * routine section 356's three screen records and section 357's firmware screens share.
 *
 * Each built piece takes the place of the piece it replaces, which keeps the layout's emission order,
 * and carries whatever followed the structure in the replaced piece, the copy pool behind an entry
 * included. Each copy is written over the configuration's copy where it sits, and has to be the same
 * length, since nothing names a copy and so nothing could follow it moving. A reference from elsewhere
 * into a replaced program, a text another screen points at, is pointed at the built copy of the same
 * text, or at its home outside. A page count other than the configuration's is refused: a page is added
 * by `appendArch14Mode`, not here. So is a built list the configuration's records do not run, and a list
 * they run that is not built.
 */
export function withModeRecords(
  layout: ContainerLayout, built: BuiltModeRecords, place: ModeRecordsPlace,
): ContainerLayout {
  if (built.screens.length !== place.screens.length) {
    throw new ScreenRecordError(`${built.screens.length} records were built for ${place.screens.length} places`);
  }
  const replace = new Map<ContainerPiece, ContainerPiece>();
  /** Where an offset into a replaced piece lands in its replacement, for the tail it carries. */
  const moved = new Map<ContainerPiece, (offset: number) => number>();
  /** The built piece each placed one stands for, which differ where a tail was appended. */
  const builtAs = new Map<ContainerPiece, ContainerPiece>();
  const swap = (old: ContainerPiece, made: ContainerPiece): void => {
    if (replace.has(old)) throw new ScreenRecordError('one piece is replaced twice');
    const length = place.lengths.get(old);
    if (length === undefined) throw new ScreenRecordError('a replaced piece has no stated length');
    // A tail the replaced piece carried after its structure goes after the built one. Other built pieces
    // name `made`, so the result's piece stands for both, below.
    const shift = made.bytes.length - length;
    let placed = made;
    if (old.bytes.length > length) {
      const tail = old.bytes.subarray(length);
      const bytes = new Uint8Array(made.bytes.length + tail.length);
      bytes.set(made.bytes, 0);
      bytes.set(tail, made.bytes.length);
      placed = {
        ...made, bytes,
        refs: [...made.refs, ...old.refs.filter((ref) => ref.at >= length).map((ref) => ({ ...ref, at: ref.at + shift }))],
      };
    }
    replace.set(old, placed);
    builtAs.set(placed, made);
    moved.set(old, (offset) => (offset >= length ? offset + shift : offset));
  };
  place.screens.forEach((old, k) => {
    const made = built.screens[k] as BuiltScreen;
    const kind = old.what;
    if (old.programs.length !== made.programs.length) {
      throw new ScreenRecordError(`the ${kind} would have ${made.programs.length} pages where the configuration has `
        + `${old.programs.length}, and a page is added by appendArch14Mode`);
    }
    swap(old.own, made.own);
    swap(old.entry, made.entry);
    old.programs.forEach((piece, p) => {
      swap(piece, made.programs[p] as ContainerPiece);
      swap(old.records[p] as ContainerPiece, made.records[p] as ContainerPiece);
      swap(old.lists[p] as ContainerPiece, made.lists[p] as ContainerPiece);
    });
  });
  for (const [index, made] of built.lists) {
    const old = place.lists.get(index);
    if (old === undefined) throw new ScreenRecordError(`list ${index} is not one the configuration's records run`);
    swap(old, made);
  }
  for (const index of place.lists.keys()) {
    if (!built.lists.has(index)) throw new ScreenRecordError(`list ${index} is run by no built record`);
  }

  // The copies, written where the configuration's sit, into a piece of its own or a replacement.
  const written = new Map<ContainerPiece, ContainerPiece>();
  const writable = (old: ContainerPiece): ContainerPiece => {
    const replaced = replace.get(old);
    if (replaced !== undefined) return replaced;
    let copy = written.get(old);
    if (copy === undefined) {
      copy = { ...old, bytes: old.bytes.slice(), refs: [...old.refs] };
      written.set(old, copy);
    }
    return copy;
  };
  place.screens.forEach((old, k) => {
    const kind = old.what;
    old.copies.forEach((at, p) => {
      const bytes = (built.screens[k] as BuiltScreen).copies[p] as Uint8Array;
      const into = writable(at.to);
      const offset = moved.get(at.to)?.(at.offset) ?? at.offset;
      if (at.length !== bytes.length) {
        throw new ScreenRecordError(`the ${kind}'s page ${p + 1}'s copy would be ${bytes.length} bytes where `
          + `the configuration's is ${at.length}, and nothing names a copy to move what follows it`);
      }
      if (into.refs.some((ref) => ref.at + 3 > offset && ref.at < offset + bytes.length)) {
        throw new ScreenRecordError(`the ${kind}'s page ${p + 1}'s copy would overwrite an address`);
      }
      into.bytes.set(bytes, offset);
    });
  });
  for (const [old, copy] of written) replace.set(old, copy);

  // Every reference into a replaced piece, re-pointed.
  const redirect = (ref: PieceRef): PieceRef => {
    if (!('to' in ref)) return ref;
    const made = replace.get(ref.to);
    if (made === undefined) return ref;
    if (written.has(ref.to)) return { ...ref, to: made };
    const length = place.lengths.get(ref.to) ?? 0;
    if (ref.offset === 0 || ref.offset >= length) return { ...ref, to: made, offset: moved.get(ref.to)?.(ref.offset) ?? ref.offset };
    const key = place.inline.get(ref.to)?.get(ref.offset);
    const target = key === undefined ? undefined : built.inline.get(key) ?? built.homes.get(key);
    if (target === undefined) throw new ScreenRecordError('a reference names the inside of a replaced structure, and no text the built screens draw');
    return { ...ref, to: target.to, offset: target.offset };
  };
  // Every piece of the result is a fresh object, so that a piece whose references change is the same
  // object every other piece names: the input layout is left as it was, and nothing names a piece the
  // result has dropped.
  const fresh = new Map<ContainerPiece, ContainerPiece>();
  const sourceOf = new Map<ContainerPiece, ContainerPiece>();
  const all = [layout.keyTable, ...layout.body,
    ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
  for (const old of all) {
    const made = replace.get(old) ?? old;
    const one: ContainerPiece = { ...made, refs: [] };
    fresh.set(old, one);
    fresh.set(made, one);
    const named = builtAs.get(made);
    if (named !== undefined) fresh.set(named, one);
    sourceOf.set(one, made);
  }
  for (const [one, made] of sourceOf) {
    one.refs = made.refs.map((ref) => {
      const pointed = redirect(ref);
      if (!('to' in pointed)) return pointed;
      return { ...pointed, to: fresh.get(pointed.to) ?? pointed.to };
    });
  }
  const rewrite = (run: ContainerPiece[]): ContainerPiece[] => run.map((piece) => fresh.get(piece) as ContainerPiece);
  return {
    ...layout,
    keyTable: fresh.get(layout.keyTable) as ContainerPiece,
    body: rewrite(layout.body),
    sections: layout.sections.map((s) => (s === undefined ? s : { before: rewrite(s.before), head: rewrite(s.head) })),
    pictures: rewrite(layout.pictures),
  };
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
 * Refuse a rebuild that is not the configuration byte for byte, naming the first difference and the
 * region of `regions` it falls in, or that it is outside them, where something they name moved. The
 * comparison `checkScreenRecords` and section 357's `checkFirmwareScreens` share.
 */
export function assertRebuilt(out: Uint8Array, c: Container, regions: readonly { from: number; to: number; what: string }[]): void {
  let at = -1;
  const length = Math.min(out.length, c.blob.length);
  for (let k = 0; k < length; k += 1) {
    if (out[k] !== c.blob[k]) { at = k; break; }
  }
  if (at < 0 && out.length !== c.blob.length) at = length;
  if (at >= 0) {
    const region = regions.find((one) => at >= one.from && at < one.to);
    throw new ScreenRecordError(`the built records differ from the configuration's at byte ${at}`
      + (region === undefined ? ', outside them, where something they name moved' : `, in ${region.what}`));
  }
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
