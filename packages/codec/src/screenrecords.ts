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
 * * the operands of each record's own key map: the records the two keys map through and the corner
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
 * the two agree instead, the corner program against `fourSlotMenuChrome`'s by content route.
 *
 * **The machinery is shared since section 357**: `recordReading` reads a mode record's frame and accounts
 * for its bytes, `recordBuilding` makes a record's pieces, `withModeRecords` puts built records in a layout
 * and `assertRebuilt` compares the result, and `firmwarescreens.ts` builds the firmware's own screens
 * through the same four rather than a copy of them. Since section 411 a reading also takes the program pieces a
 * page reaches by a switch or a jump, `RecordReading.program`, which `withModeRecords` places as a record's
 * `extras`: the Harmony One's Options page draws its rows that way.
 *
 * Arch 14, the Harmony 600, 650 and 700, and since `todo-compile-one.md` 4.4.2 arch 12, the Harmony One.
 * Read only towards hardware: the result is pieces.
 */
import { type MenuPart, menuPartsBytes } from './screenparts.ts';
import { type Container, type Instruction, archSlot } from './gspm.ts';
import { ACTION_TABLE_SLOT, type ValueReader, textValues } from './compose.ts';
import { type ContainerLayout, type ContainerPiece, type PieceRef, layOutContainer, takeApart } from './frame.ts';
import { MODE_PAGE_POINTERS, type ModePage, type ModeRecord, type TaggedList, modePages, modeRecords, pageListCopies, taggedList } from './sections.ts';
import { SCREEN_CALL, type ScreenInstruction, screenProgram } from './screen.ts';
import { type PieceTarget } from './statetables.ts';

/** A refusal, named so a caller can tell a description this does not build from a bug. */
export class ScreenRecordError extends Error {}

/**
 * A page record is two pointers, the list then the program, section 66, and on the Harmony One a lead byte
 * in front naming the page's hit page, section 275, which the reader reports as `ModePage.lead`.
 */
const PAGE_RECORD_LENGTH = MODE_PAGE_POINTERS;
const pageRecordLength = (page: ModePage): number => MODE_PAGE_POINTERS + (page.lead === undefined ? 0 : 1);
/** A mode entry: kind, the back pointer, the page count, then three bytes per page, section 52. */
const ENTRY_HEAD = 6;


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
  /** The program the page calls, the Harmony One's chrome, read as a page's program is; absent elsewhere. */
  chrome?: { program: ScreenInstruction[]; piece: ContainerPiece };
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
  /** The programs the pages call, each once: the Harmony One's chrome. Empty where the pages call none. */
  chromes: ContainerPiece[];
  /**
   * The program pieces a page's program reaches by a switch or a jump, in the order the caller read them,
   * `RecordReading.program`: a Harmony One Options page's arms and the pieces they join again at. Empty
   * where the caller reads none.
   */
  extras: ContainerPiece[];
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
  /**
   * A program piece a record's page reaches other than through `frame`, by a switch or a jump: spanned,
   * its pictures and texts read as a page program's are, once however often it is reached. Its address
   * fields for the jump and the switch are the caller's to record.
   */
  program: (address: number, what: string) => { program: ScreenInstruction[]; piece: ContainerPiece };
  list: (index: number, what: string) => { body: Instruction[]; off: number; piece: ContainerPiece };
  homes: () => Map<string, PieceTarget>;
  placeOf: (what: string, f: RecordFrame, extras?: readonly ContainerPiece[]) => RecordPlace;
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
  if (c.architecture === undefined) throw new ScreenRecordError('the configuration states no architecture');
  const listAddresses = c.pointerArrayAt(archSlot(c.architecture, ACTION_TABLE_SLOT))?.values ?? [];
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

  // A program's pictures, as read addresses, its inline texts by where their codes start, and the texts it
  // draws by reference, which `homes` resolves.
  const readProgram = (piece: ContainerPiece, instructions: ScreenInstruction[], at: number): void => {
    const texts = new Map<number, string>();
    for (const one of instructions) {
      if (one.opcode === 0x02 || one.opcode === 0x03) addressField(one.start + one.length - 3, 'read');
      if (one.opcode === 0x05 && one.glyphs !== undefined) texts.set(one.start + 3 - at, [...one.glyphs].join(','));
      if (one.opcode === 0x04) textRefs.push({ at: one.start + 3, one });
    }
    inline.set(piece, texts);
  };

  // A program that is a piece of its own, the chrome a page calls or a piece a page's program reaches by a
  // jump or a switch: spanned and read once however many times it is reached.
  const programAt = (address: number, what: string): { program: ScreenInstruction[]; piece: ContainerPiece } => {
    const instructions = screenProgram(c, address);
    if (instructions === undefined) throw new ScreenRecordError(`${what} does not read`);
    const piece = wholePiece(address, what);
    if (!programPieces.has(piece)) {
      const off = blobOf(address);
      const length = Math.max(...instructions.map((one) => one.start + one.length)) - off;
      lengths.set(piece, length);
      span(off, length, `the ${what}`);
      programPieces.add(piece);
      readProgram(piece, instructions, off);
    }
    return { program: instructions, piece };
  };

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
      const recordLength = pageRecordLength(page);
      if (page.length !== recordLength) throw new ScreenRecordError(`${kind}'s page ${p + 1} is not a ${recordLength} byte page record`);
      const recordOff = blobOf(page.address);
      addressField(entryOff + ENTRY_HEAD + 3 * p, 'built');
      span(recordOff, recordLength, `the ${kind}'s page ${p + 1}'s record`);
      // The lead, the hit page the page is touched through, is the description's; the pointers are built.
      const lead = recordLength - PAGE_RECORD_LENGTH;
      if (lead > 0) value(recordOff);
      addressField(recordOff + lead, 'built');
      addressField(recordOff + lead + 3, 'built');
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
      lengths.set(recordPiece, recordLength);
      lengths.set(listPiece, list.length);
      span(programOff, programLength, `the ${kind}'s page ${p + 1}'s program`);
      span(listOff, list.length, `the ${kind}'s page ${p + 1}'s list`);
      span(copyOff, copy.length, `the ${kind}'s page ${p + 1}'s copy`);
      programPieces.add(programPiece);
      readProgram(programPiece, program, programOff);
      // The chrome a Harmony One page calls, read once however many pages call it, `chromes`.
      const call = program.find((one) => one.opcode === SCREEN_CALL && one.targets[0] !== undefined);
      let chrome: RecordPageFrame['chrome'];
      if (call !== undefined) {
        addressField(call.start + 1, 'built');
        chrome = programAt(call.targets[0] as number, `${kind}'s chrome`);
      }
      return {
        page, list, listOff, copy, copyOff, program, programPiece, recordPiece, listPiece,
        copyAt: { ...pieceAt(copyOff), length: copy.length },
        ...(chrome === undefined ? {} : { chrome }),
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

  const placeOf = (what: string, f: RecordFrame, extras: readonly ContainerPiece[] = []): RecordPlace => ({
    what, own: f.own, entry: f.entry,
    programs: f.pages.map((one) => one.programPiece),
    records: f.pages.map((one) => one.recordPiece),
    lists: f.pages.map((one) => one.listPiece),
    copies: f.pages.map((one) => one.copyAt),
    chromes: [...new Set(f.pages.flatMap((one) => (one.chrome === undefined ? [] : [one.chrome.piece])))],
    extras: [...extras],
  });

  return {
    value, value16, value24, described, structure, addresses, regions, lengths, inline, lists,
    offsetOf: (piece) => laid.offsetOf(piece) as number,
    blobOf, targetOf, wholePiece, span, addressField, frame, list, homes, placeOf, program: programAt,
  };
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
  /** The programs the pages call, paired by position with `RecordPlace.chromes`; the Harmony One's chrome. */
  chromes?: ContainerPiece[];
  /** The pieces a page's program reaches by a switch or a jump, paired by position with `RecordPlace.extras`. */
  extras?: ContainerPiece[];
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
  recordOf: (
    own: Uint8Array, programs: ContainerPiece[], lists: Uint8Array[], copies: Uint8Array[], ownOwner?: string,
    touch?: { leads: readonly number[]; chromes: ContainerPiece[] },
  ) => BuiltScreen;
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

  /**
   * A record's pieces around its programs: page lists, page records, own list and entry. `touch` is the
   * Harmony One's: each page record opens with its hit page, and the pages call the chromes given.
   */
  const recordOf = (
    own: Uint8Array, programs: ContainerPiece[], lists: Uint8Array[], copies: Uint8Array[], ownOwner = 'slot-6-mode',
    touch?: { leads: readonly number[]; chromes: ContainerPiece[] },
  ): BuiltScreen => {
    if (touch !== undefined && touch.leads.length !== programs.length) {
      throw new ScreenRecordError(`${touch.leads.length} hit pages for ${programs.length} pages`);
    }
    const lead = touch === undefined ? 0 : 1;
    const ownPiece: ContainerPiece = { bytes: own, refs: [], owner: ownOwner };
    const listPieces = lists.map((bytes): ContainerPiece => ({ bytes, refs: [], owner: 'slot-6-page-list' }));
    const records = programs.map((program, p): ContainerPiece => {
      const bytes = new Uint8Array(PAGE_RECORD_LENGTH + lead);
      if (touch !== undefined) bytes[0] = touch.leads[p] as number;
      return {
        bytes, owner: 'slot-6-page',
        refs: [{ at: lead, to: listPieces[p] as ContainerPiece, offset: 0 }, { at: lead + 3, to: program, offset: 0 }],
      };
    });
    const entry = new Uint8Array(ENTRY_HEAD + 3 * programs.length);
    entry[4] = programs.length & 0xff;
    entry[5] = programs.length >> 8;
    const entryRefs: PieceRef[] = [{ at: 1, to: ownPiece, offset: 0 },
      ...records.map((record, p): PieceRef => ({ at: ENTRY_HEAD + 3 * p, to: record, offset: 0 }))];
    return {
      own: ownPiece, programs, records, lists: listPieces, copies,
      entry: { bytes: entry, refs: entryRefs, owner: 'slot-6-entry' },
      ...(touch === undefined ? {} : { chromes: touch.chromes }),
    };
  };

  return { programOf, recordOf, inline };
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
 * by `appendMode`, not here. So is a built list the configuration's records do not run, and a list
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
        + `${old.programs.length}, and a page is added by appendMode`);
    }
    swap(old.own, made.own);
    swap(old.entry, made.entry);
    const chromes = made.chromes ?? [];
    if (old.chromes.length !== chromes.length) {
      throw new ScreenRecordError(`the ${kind} would call ${chromes.length} chromes where the configuration's calls ${old.chromes.length}`);
    }
    old.chromes.forEach((piece, k) => swap(piece, chromes[k] as ContainerPiece));
    const extras = made.extras ?? [];
    if (old.extras.length !== extras.length) {
      throw new ScreenRecordError(`the ${kind} would reach ${extras.length} program pieces by a switch or a jump where the configuration's reaches ${old.extras.length}`);
    }
    old.extras.forEach((piece, k) => swap(piece, extras[k] as ContainerPiece));
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
