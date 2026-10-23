/**
 * The Harmony One built from nothing, assembled: `todo-compile-one.md` 7.1.7, the touch family's half of what
 * `families/four-slot/empty.ts`' `buildEmptyConfiguration` is for the Harmony 650, plan 008.
 *
 * Every other route to a Harmony One configuration starts from one of Logitech's compiles and overwrites parts of it.
 * This one starts from no file: the numbering of section 432 decides every mode, variable, value map, list, entry,
 * program and hit page, `emptyTouchNumbering`; each screen set's builder makes its part from the description that
 * numbering gives, `emptyTouchSpecs`; the wiring, the timers, the fixed cases and the hour list are section 430's,
 * `emptyTouchWiring`; the pictures are section 428's, drawn by their rule alone, `touchFixedPictures`; and the font
 * table, the state tables, the empty tables and the placement are the skeleton's, section 431,
 * `layOutTouchSkeleton`, which this module hands every part to. Nothing it emits is read off a compile, and the
 * container a builder spells through is the skeleton's probe, `touchSpellingContainer`, which no result holds.
 *
 * **What the assembly decides itself**, each a choice of ours and none a measurement:
 *
 * * **Where each piece sits.** Each mode is laid out as the Harmony 650's assembly lays one: its own key map, then per
 *   page its program and its page record, then the chrome its pages call and the program pieces a switch reaches, then
 *   its entry; mode 0's own key map is the key table and so sits where the frame puts it. The page lists' second copies,
 *   which nothing names, follow the last entry in mode order and base slot 9's sets follow them, which is where
 *   `taggedListPools` finds them on every compile, section 69. Then base slot 11's programs, the hit pages, the timers.
 * * **One inline copy of a text across the file**, section 334: the sets are built in the composed path's order,
 *   `builders.ts`' `TOUCH_BUILT` (the firmware screens, the fixed screens, the status screens, the clock header, the
 *   power off help, the activity menu, the device lists), and each is given as its homes every text the sets before it
 *   drew inline, so status code 28's "USB Connected" points at the firmware screen's copy and the clock's sixty minutes
 *   at the Minute picker's, as on Logitech's compiles.
 * * **One picture of each of ours**, `TOUCH_PICTURES`: where Logitech stores an image several times, the full gauge at
 *   three addresses of the clock header's slots and a settings button once per place, ours is stored once and every
 *   draw names that one. The six blank screens that draw photographs draw the whole screen background, as the
 *   composed path makes them, section 422, and the fourth draws the charging screen, as Logitech's do.
 * * **The background drawn by one fill**, `TouchChoices.backgroundFill`, section 425, unless the choice keeps it a
 *   picture; **our letters blended** into the colour under each text, decision 22, and **every label in a pad centred**
 *   by its letters, which are the composed path's look, `look.ts`, in its order.
 * * **The Remote Assistant's variable starts at 3**, `ASSISTANT_HIDDEN`, the value its own "hide" answer writes, as the
 *   composed path starts it, section 403. The empty One holds no assistant screen and no start ladder, so the only
 *   reader is USB Connected's leaving list, section 432; what that list does with 3 rather than Logitech's 0 is not
 *   read, and the choice follows the composed path that has been on the spare Harmony One.
 *
 * **The build year** is the year of `builtAt`, which the Year picker offers with the year either side. Where those
 * three hold a leap year the fixed screens add a Day 29 picker and a second Month picker, `fixedscreens.ts`.
 *
 * **What no Logitech compile shows**, since every one of the nineteen holds at least one device: no device at all, device
 * lists with no row, base slot 5 with no infrared group. Inferred, and unconfirmed until the spare Harmony One runs it,
 * `todo-compile-one.md` 7.2; findings section 434 lists them with the rest of what the empty One alone holds. An
 * activity menu with no row is Logitech's own on the four compiles with no activity, and an all off case with nothing
 * to switch off is `harvest_one_families_1`'s, section 430.
 *
 * The Harmony One, skin 54, the touch family's: the Harmony 600, 650 and 700's assembly is `families/four-slot/empty.ts`.
 * Read only towards hardware: the result is bytes in memory.
 */
import type { Container } from '../../gspm.ts';
import { type ContainerPiece, countedTable, layOutContainer, takeApart } from '../../frame.ts';
import type { BuiltScreen } from '../../screenrecords.ts';
import type { PieceTarget } from '../../statetables.ts';
import { type BlendedSet, checkBlendedLetters, withBlendedLetters } from '../../blending.ts';
import { withPictureFilled } from '../../pictures.ts';
import type { SetFace } from '../../fonttable.ts';
import { TOUCH_CHOICES, type TouchChoices } from './choices.ts';
import { TOUCH_COUNT_WIDTHS, layOutTouchSkeleton, touchSpellingContainer } from './skeleton.ts';
import { TOUCH_STATE_TABLES } from './statetables.ts';
import { type EmptyTouchLook, type EmptyTouchNumbering, emptyTouchNumbering, emptyTouchSpecs } from './emptynumbering.ts';
import { TOUCH_PICTURES, touchFixedPictures } from './pictures.ts';
import { CLOCK_HEADER_PROGRAMS, buildTouchClockHeader } from './clockheader.ts';
import { buildTouchFirmwareScreens } from './firmwarescreens.ts';
import { buildTouchFixedScreens } from './fixedscreens.ts';
import { buildTouchStatusScreens } from './statusscreens.ts';
import { buildTouchHelpScreens } from './helpscreens.ts';
import { buildTouchActivityMenu } from './activitymenu.ts';
import { buildTouchDeviceLists } from './devicelists.ts';
import { buildTouchHitPages } from './hitpages.ts';
import { buildTouchScreenTable } from './caseprograms.ts';
import { ASSISTANT_HIDDEN } from './startupassistant.ts';
import { withCentredPadLabels } from './centring.ts';
import { touchLabelWeight } from './activitypictures.ts';
import type { TouchScreenSet } from './numbering.ts';
import { TOUCH_BUILT, type TouchBuilt, touchBuiltBytes } from './builders.ts';
import { TOUCH_GLYPH_ORDER, buildTouchFontTable } from './fontsets.ts';
import { claims } from '../../coverage.ts';
import { IMAGE_SET_HEADER, encodeGlyph, fontSets, glyphOf } from '../../font.ts';
import { letterRows } from '../../lettering.ts';
import { lettered, letterFaceOf } from '../../fonttable.ts';

/** A refusal, named so a caller can tell a request this does not assemble from a bug. */
export class EmptyTouchError extends Error {}

// ---------------------------------------------------------------------------------------------------------
// The pictures each screen draws.

/** A picture of ours by its entry's name in `TOUCH_PICTURES`. */
type PictureName = (typeof TOUCH_PICTURES)[number]['name'];

/**
 * The picture each place of each screen draws past the whole screen one at 0, 0, by the screen's key in
 * `EMPTY_TOUCH_SCREENS` and the place: the firmware screens' and the power off help's icons, and the settings
 * buttons, a whole width row on Options and the Year picker and a pad on every other picker. What each of
 * Logitech's draws there on the sixteen English compiles of skin 54, `test/touchempty.test.ts`.
 */
const PLACED: Readonly<Record<string, Readonly<Record<string, PictureName>>>> = {
  'firmware:lowBattery': { '58,103': 'Low Battery' },
  'firmware:usbConnected': { '56,89': 'USB Connected' },
  'firmware:chargingProblem': { '43,34': 'charging problem' },
  'help:attempt': { '57,95': 'sending, large' },
  'help:after': { '57,67': 'power' },
};
/** The fixed screens whose buttons are whole width rows; every other fixed screen's are pads. */
const ROW_SCREENS: ReadonlySet<string> = new Set(['fixed:Options', 'fixed:Year']);
/**
 * The whole screen picture each screen draws at 0, 0: the background on every screen but the seventh blank screen's
 * fourth, which draws the charging screen. The six that draw Logitech's photographs draw the background, as the
 * composed path makes them, section 422.
 */
const WHOLE_SCREEN: Readonly<Record<string, PictureName>> = { 'fixed:Blank 4': 'charging screen' };

/** The picture of ours a screen draws at a place: `PLACED`, `ROW_SCREENS` and `WHOLE_SCREEN` read together. */
export function emptyTouchPictureAt(screen: string, place: { x: number; y: number }): PictureName {
  if (place.x === 0 && place.y === 0) return WHOLE_SCREEN[screen] ?? 'whole screen background';
  const named = PLACED[screen]?.[`${place.x},${place.y}`];
  if (named !== undefined) return named;
  if (screen.startsWith('fixed:')) return ROW_SCREENS.has(screen) ? 'settings row' : 'settings pad';
  throw new EmptyTouchError(`no picture of ours is stated for ${screen} at ${place.x}, ${place.y}`);
}

/**
 * The clock header's sixteen slots by entry name, section 414's order: the gauge's eight levels, the charged picture,
 * the charging gauge at level 0, the animation's three frames, the sending mark off and on, and the clock's face.
 */
export const EMPTY_TOUCH_CLOCK_SLOTS: readonly PictureName[] = [
  'battery gauge 0', 'battery gauge 1', 'battery gauge 2', 'battery gauge 3', 'battery gauge 4, charging frame 2',
  'battery gauge 5', 'battery gauge 6', 'battery gauge 7, charged, charging frame 1',
  'battery gauge 7, charged, charging frame 1', 'charging at gauge level 0',
  'battery gauge 7, charged, charging frame 1', 'battery gauge 4, charging frame 2', 'charging frame 3',
  'sending mark off', 'sending mark on', 'clock face',
];

// ---------------------------------------------------------------------------------------------------------
// The assembly.

export interface EmptyTouchOptions {
  /** The model the configuration states: 54, the Harmony One the spare reports, decision 23. */
  skin: number;
  /** When it is built, `YYYY-MM-DDTHH:MM:SS`: the clock is stamped from it and the Year picker offers its year. */
  builtAt: string;
  /** The family's choices, `TOUCH_CHOICES` unless given. */
  choices?: TouchChoices;
}

export interface EmptyTouchConfiguration {
  bytes: Uint8Array;
  container: Container;
  /** The numbering it was built on, which a composer continues from. */
  numbering: EmptyTouchNumbering;
  /** Per font set, in table order, the face it is lettered in. */
  faces: readonly SetFace[];
  /** The copies the blending made, which a screen description is pointed back through, `unblendedSelects`. */
  blended: readonly BlendedSet[];
  /** Per base slot 10 index, the list, and per base slot 9 index, the entry: what the numbering holds. */
  lists: ReadonlyMap<number, ContainerPiece>;
}

/** The pieces of a table numbered from 0, refused where an index has nothing or where one is past the count. */
function dense(what: string, byIndex: ReadonlyMap<number, ContainerPiece>, count: number): ContainerPiece[] {
  const out: ContainerPiece[] = [];
  for (let k = 0; k < count; k += 1) {
    const one = byIndex.get(k);
    if (one === undefined) throw new EmptyTouchError(`${what} ${k} has nothing, and its table names every index below its count`);
    out.push(one);
  }
  if (byIndex.size !== count) throw new EmptyTouchError(`${byIndex.size} ${what}s where the numbering holds ${count}`);
  return out;
}

/** Add `from` into `into`, refusing an index two builders built differently: a list two sets reach is built alike by each, section 432. */
function merge(into: Map<number, ContainerPiece>, from: ReadonlyMap<number, ContainerPiece>, what: string): void {
  for (const [index, piece] of from) {
    const was = into.get(index);
    if (was === undefined) {
      into.set(index, piece);
      continue;
    }
    const same = was.bytes.length === piece.bytes.length && was.bytes.every((b, k) => b === piece.bytes[k])
      && was.refs.length === piece.refs.length;
    if (!same) throw new EmptyTouchError(`${what} ${index} is built two ways`);
  }
}

/**
 * The empty Harmony One: every screen of section 432's numbering built by its set's builder, the wiring, the timers,
 * the fixed cases and the state tables of section 430, our pictures and our font table, laid out through the
 * skeleton and given the composed path's look. Refuses a skin the skeleton is not laid out for, a build year the
 * numbering refuses, and anything a builder, the placer or the frame refuses.
 */
export function buildEmptyTouchConfiguration(options: EmptyTouchOptions): EmptyTouchConfiguration {
  const choices = options.choices ?? TOUCH_CHOICES;
  const year = Number(options.builtAt.slice(0, 4));
  if (!Number.isInteger(year)) throw new EmptyTouchError(`${options.builtAt} states no year`);
  const skeleton = { skin: options.skin, builtAt: options.builtAt, choices };
  const numbering = emptyTouchNumbering({ year, screenLight: choices.screenLightSeconds });
  const spelling = touchSpellingContainer(skeleton);

  // The pictures, one piece per entry, made before any builder names them.
  const drawn = new Map(touchFixedPictures(choices).map(({ entry, bytes }) => [entry.name, { bytes, refs: [], owner: 'picture-bank' } as ContainerPiece]));
  // The ones a screen names, since the placer refuses a picture nothing draws: the photographs' entry is drawn as
  // the background and never itself.
  const named = new Set<ContainerPiece>();
  const pictureOf = (name: PictureName): PieceTarget => {
    const piece = drawn.get(name);
    if (piece === undefined) throw new EmptyTouchError(`no picture of ours is called ${name}`);
    named.add(piece);
    return { to: piece, offset: 0 };
  };
  const look: Omit<EmptyTouchLook, 'homes'> = {
    picture: (screen, place) => pictureOf(emptyTouchPictureAt(screen, place)),
    clock: { programs: CLOCK_HEADER_PROGRAMS.map(() => []), slots: EMPTY_TOUCH_CLOCK_SLOTS.map(pictureOf) },
  };

  // The sets in the composed path's order, each given as its homes every text the sets before it drew inline.
  const homes = new Map<string, PieceTarget>();
  const specsFor = (set: TouchScreenSet): ReturnType<typeof emptyTouchSpecs> =>
    emptyTouchSpecs(numbering, { ...look, homes: { [set]: new Map(homes) } });
  const took = (inline: ReadonlyMap<string, PieceTarget>): void => { for (const [key, target] of inline) if (!homes.has(key)) homes.set(key, target); };
  const firmware = buildTouchFirmwareScreens(spelling, specsFor('firmware').firmware);
  took(firmware.inline);
  const fixed = buildTouchFixedScreens(spelling, specsFor('fixed').fixed);
  took(fixed.inline);
  const status = buildTouchStatusScreens(spelling, specsFor('status').status);
  took(status.inline);
  const clock = buildTouchClockHeader(spelling, specsFor('clock').clock);
  took(clock.inline);
  const help = buildTouchHelpScreens(spelling, specsFor('help').help);
  took(help.inline);
  const menu = buildTouchActivityMenu(spelling, specsFor('activity menu').activityMenu);
  took(menu.screens.inline);
  const deviceLists = buildTouchDeviceLists(spelling, specsFor('device lists').deviceLists);
  const hitPages = buildTouchHitPages(emptyTouchSpecs(numbering, look).hitPages);

  // The modes in mode order, each set's screens at the modes the numbering gave them.
  const modes: BuiltScreen[] = [];
  const place = (list: readonly BuiltScreen[], screens: readonly { mode: number }[], what: string): void => {
    if (list.length !== screens.length) throw new EmptyTouchError(`the ${what} built ${list.length} screens where ${screens.length} are numbered`);
    list.forEach((one, k) => {
      const mode = (screens[k] as { mode: number }).mode;
      if (modes[mode] !== undefined) throw new EmptyTouchError(`mode ${mode} is built twice`);
      modes[mode] = one;
    });
  };
  const s = numbering.screens;
  place(firmware.screens, s.firmware, 'firmware screens');
  place(fixed.screens, s.fixed, 'fixed screens');
  place(status.screens, s.status, 'status screens');
  place(help.screens, s.help, 'power off help');
  place(menu.screens.screens, s['activity menu'], 'activity menu');
  place(deviceLists.screens.screens, s['device lists'], 'device lists');
  if (modes.length !== numbering.modes.size || modes.some((one) => one === undefined)) {
    throw new EmptyTouchError(`${modes.filter(Boolean).length} modes are built where the numbering holds ${numbering.modes.size}`);
  }

  // Base slot 10, every list the numbering holds: the firmware screens' own, the wiring's with the fixed cases' and
  // the hour list, and the screens', a list two sets reach built alike by each.
  const lists = new Map<number, ContainerPiece>();
  merge(lists, firmware.lists, 'list');
  merge(lists, numbering.wiring.lists, 'list');
  for (const one of [fixed.lists, status.lists, clock.lists, help.lists, menu.screens.lists, deviceLists.screens.lists]) merge(lists, one, 'list');
  const listPieces = dense('list', lists, numbering.nextList);

  // The touch map, every hit page once at the index the numbering gave it.
  const runs = new Map<number, ContainerPiece[]>();
  for (const one of [hitPages.runs, menu.hits, deviceLists.hits, help.hits]) {
    for (const [index, run] of one) {
      if (runs.has(index)) throw new EmptyTouchError(`hit page ${index} is built twice`);
      runs.set(index, run);
    }
  }
  const pages = Array.from({ length: numbering.hitPages.size }, (_, k) => {
    const run = runs.get(k);
    if (run === undefined) throw new EmptyTouchError(`hit page ${k} is built by no set`);
    return run;
  });
  if (runs.size !== pages.length) throw new EmptyTouchError(`${runs.size} hit pages are built where the numbering holds ${pages.length}`);
  const touchMap = countedTable(TOUCH_COUNT_WIDTHS[17] as number, pages.map((run) => run[run.length - 1] as ContainerPiece), 'slot-17-table');

  // Base slot 11: the clock header's four programs at their entries, then every value map case, `buildTouchScreenTable`.
  const wiring = numbering.wiring;
  const header: PieceTarget[] = [];
  CLOCK_HEADER_PROGRAMS.forEach((role, k) => {
    header[numbering.clockEntries[role]] = { to: (clock.programs[k] as ContainerPiece[])[0] as ContainerPiece, offset: 0 };
  });
  if (header.length !== CLOCK_HEADER_PROGRAMS.length || header.some((one) => one === undefined)) {
    throw new EmptyTouchError('the clock header\'s programs are not base slot 11 entries 0 to 3');
  }
  const valueMaps = wiring.valueMaps.map(([, map]) => map);
  const screenTable = buildTouchScreenTable(header, valueMaps);
  const cases = [...wiring.cases.built.cases.values()].flat().map((one) => one.piece);

  // The state tables: the wiring's variables, the assistant's started hidden, Time of Day's, and the clock's two
  // calls at the indices the clock header numbered them.
  const [minuteCall, hourCall] = clock.calls;
  if (hourCall?.operand !== wiring.hourList.index) throw new EmptyTouchError('the clock header\'s hour call is not the hour list the wiring numbered');
  const variables = numbering.variables.map(([name, variable]) => (name === 'assistantStep' ? { ...variable, first: ASSISTANT_HIDDEN } : variable));

  // Each mode laid out as the Harmony 650's assembly lays one, the copies after the last entry and base slot 9's sets
  // behind them; mode 0's own key map is the key table.
  const last = modes[modes.length - 1] as BuiltScreen;
  const copies = modes.flatMap((one) => one.copies);
  const tail = new Uint8Array(last.entry.bytes.length + copies.reduce((n, one) => n + one.length, 0));
  tail.set(last.entry.bytes, 0);
  let at = last.entry.bytes.length;
  for (const one of copies) {
    tail.set(one, at);
    at += one.length;
  }
  const entries = modes.map((one) => (one === last ? { ...one.entry, bytes: tail } : one.entry));
  const modeBody = modes.flatMap((one, k) => [
    ...(k === 0 ? [] : [one.own]),
    ...one.programs.flatMap((program, p) => [program, one.records[p] as ContainerPiece]),
    ...(one.chromes ?? []), ...(one.extras ?? []),
    entries[k] as ContainerPiece,
  ]);
  const sets = dense('base slot 9 entry', wiring.wiring.entries, wiring.wiring.entries.size);
  const programs = clock.programs.flat();

  const laid = layOutTouchSkeleton(skeleton, {
    keyTable: (modes[0] as BuiltScreen).own,
    tables: {
      2: wiring.wiring.logArea, 4: wiring.wiring.eventMap, 8: wiring.wiring.leadingList,
      6: countedTable(TOUCH_COUNT_WIDTHS[6] as number, entries, 'slot-6-table'),
      9: countedTable(TOUCH_COUNT_WIDTHS[9] as number, sets, 'slot-9-table'),
      10: countedTable(TOUCH_COUNT_WIDTHS[10] as number, listPieces, 'slot-10-table'),
      11: screenTable, 12: wiring.wiring.timerTable, 15: wiring.wiring.parameterTable, 17: touchMap,
    },
    states: { hourList: wiring.hourList.index, minuteList: minuteCall?.operand as number, variables, valueMaps },
    body: [...modeBody, ...sets, ...programs, ...cases, ...pages.flat(), ...wiring.wiring.timerRecords],
    loose: [...listPieces, ...wiring.wiring.parameterGroups, ...modes.flatMap((one) => one.lists), ...named],
  });
  // The numbering put every variable after the firmware's in its order, one byte each; the state tables have to agree.
  if (laid.states.indexOf.some((index, k) => index !== TOUCH_STATE_TABLES.firmwareVariables + k)) {
    throw new EmptyTouchError('the state tables numbered a variable otherwise than the numbering');
  }

  // The look, in the composed path's order: the background a fill, the pads' labels centred, our letters blended.
  let container = laid.container;
  if (choices.backgroundFill) {
    const background = drawn.get('whole screen background') as ContainerPiece;
    const address = container.flashBase + (layOutContainer(laid.layout).offsetOf(background) as number);
    container = withPictureFilled(container, address).container;
  }
  container = withCentredPadLabels(container);
  const blending = withBlendedLetters(takeApart(container), laid.faces, touchLabelWeight(choices));
  const blended = layOutContainer(blending.layout);
  checkBlendedLetters(blended.container, laid.faces, blending.blended);
  return { bytes: blended.bytes, container: blended.container, numbering, faces: laid.faces, blended: blending.blended, lists };
}

// ---------------------------------------------------------------------------------------------------------
// Which bytes of a finished file our generators make, `todo-compile-one.md` 7.1.8.

/**
 * Who makes a byte, in the order a byte two of them reach is given: the builders of `builders.ts` first, each by its
 * own rebuild; then the frame; then our letters; then the tables' counts and addresses. `families/four-slot/
 * assemble.ts`' `ATTRIBUTIONS` is the Harmony 650's.
 */
export const TOUCH_ATTRIBUTIONS = [...TOUCH_BUILT, 'frame', 'letters', 'table headers'] as const;
export type TouchAttribution = (typeof TOUCH_ATTRIBUTIONS)[number];

export interface TouchAttributed {
  /** Bytes each generator makes. */
  generated: Record<TouchAttribution, number>;
  /** The rest, by what claims it, `coverage.ts`' owner names, and `unclaimed` for a byte nothing claims. */
  carried: Map<string, number>;
  total: number;
  /** Per byte of the blob: 0 where carried, else 1 + its `TOUCH_ATTRIBUTIONS` index. */
  owners: Uint8Array;
}

/** The frame's own claims: the header, the section table and its marker, base slots 1 and 3 and the trailer. */
const FRAME_CLAIMS: ReadonlySet<string> = new Set(['header', 'section-table', 'marker', 'slot-1-arch', 'slot-3-clock', 'trailer']);
/** The claims of a counted table, whose count and addresses the entries it names state. */
const TABLE_CLAIM = /^slot-\d+-table$/;

/**
 * Which bytes of a Harmony One configuration our generators make, measured on the finished file with no memory of how
 * it was made beyond the choices it was built with and the copies the blending made, as `touchBuiltBytes` takes them:
 *
 * * **the builders**, `touchBuiltBytes`: each screen set, the case programs, the hit pages, the wiring, the state
 *   tables, the two small tables and our pictures, each describing the file and counted only once its rebuild is the
 *   file byte for byte;
 * * **the frame**: the header, the section table, its marker, base slots 1 and 3 and the trailer, where taking the file
 *   apart and laying it out again gives the file back, `layOutContainer` generating every one of them from the
 *   architecture, the skin and the stamp the file states. That is a check that the frame is consistent with the
 *   file, which any parsed file passes, and not that it is the skin and stamp the file was built for: that is the
 *   caller's to compare, as `touchempty.test.ts` does;
 * * **the letters**: every glyph that is byte for byte the one our stated font table, `buildTouchFontTable` with
 *   `choices`, holds for that set and code, or for a blended copy the one `letterRows` draws for its character blended
 *   for the copy's colour, the character being the stated code order's, `TOUCH_GLYPH_ORDER`; and a set's header and
 *   addresses where every glyph of it is ours and its header is the stated set's;
 * * **the table headers**: a table's count and its three byte addresses, where its claim is exactly the count and as
 *   many addresses as it states, section 375's reading of the Harmony 650's: consistent with itself, the addresses
 *   not compared with what they name, which the builders' own attributions of the entries cover.
 *
 * Everything else is carried and reported by its owner. Refuses where a builder refuses, `TouchBuildError`, or where
 * the file does not lay out again into itself.
 */
export function touchAttributedBytes(c: Container, blended: readonly BlendedSet[], choices: TouchChoices = TOUCH_CHOICES): TouchAttributed {
  const owners = new Uint8Array(c.blob.length);
  const mark = (from: number, length: number, who: TouchAttribution): void => {
    const tag = TOUCH_ATTRIBUTIONS.indexOf(who) + 1;
    for (let k = from; k < from + length && k < owners.length; k += 1) if (owners[k] === 0) owners[k] = tag;
  };

  // The file has to lay out again into itself before anything is credited: checked first, since a file that does not
  // would otherwise reach a builder's rebuild and be refused there under that builder's name.
  const again = layOutContainer(takeApart(c)).bytes;
  if (again.length !== c.blob.length || again.some((one, k) => one !== c.blob[k])) throw new EmptyTouchError('the configuration does not lay out again into itself');

  // The builders, each by its rebuild.
  const built = touchBuiltBytes(c, blended, choices);
  built.owners.forEach((tag, k) => { if (tag !== 0) owners[k] = TOUCH_ATTRIBUTIONS.indexOf(TOUCH_BUILT[tag - 1] as TouchBuilt) + 1; });

  // The frame, which laying out again generated.
  const all = claims(c);
  for (const claim of all) if (FRAME_CLAIMS.has(claim.owner)) mark(claim.start, claim.length, 'frame');

  // Our letters, each glyph against the one the stated table or the blending makes for its set and code.
  const stated = buildTouchFontTable(choices);
  const copies = new Map(blended.map((one) => [one.set, one]));
  const same = (at: number, bytes: Uint8Array): boolean => bytes.every((one, k) => c.blob[at + k] === one);
  (fontSets(c) ?? []).forEach((set, s) => {
    const own = stated.sets[s];
    const copy = copies.get(s);
    const expected = (code: number): Uint8Array | undefined => {
      if (own !== undefined) {
        const ref = own.refs.find((one) => one.at === IMAGE_SET_HEADER + 3 * (code - 1));
        return ref !== undefined && 'to' in ref ? ref.to.bytes : undefined;
      }
      if (copy === undefined) return undefined;
      const face = stated.faces[copy.source];
      const ch = TOUCH_GLYPH_ORDER[code - 1];
      if (face === undefined || ch === undefined) return undefined;
      const one: SetFace = copy.weight === undefined ? face : { ...face, weight: copy.weight };
      const rows = letterRows(letterFaceOf(one), ch, one.lettering, lettered(one), copy.background);
      return encodeGlyph((rows[0] ?? []).length, rows);
    };
    let ours = 0;
    for (let code = set.first; code < set.first + set.count; code += 1) {
      const glyph = glyphOf(c, set, code);
      const bytes = expected(code);
      const at = glyph === undefined ? undefined : c.blobOffsetOf(glyph.address);
      if (glyph === undefined || bytes === undefined || at === undefined || glyph.length !== bytes.length || !same(at, bytes)) continue;
      mark(at, glyph.length, 'letters');
      ours += 1;
    }
    // The set's header and addresses, where every glyph is ours and the header is the stated set's: a copy's is its
    // source's, the same face at the same height and codes.
    const header = (own ?? (copy === undefined ? undefined : stated.sets[copy.source]))?.bytes.subarray(0, IMAGE_SET_HEADER);
    const at = c.blobOffsetOf(set.address);
    if (ours === set.count && header !== undefined && at !== undefined && same(at, header)) mark(at, IMAGE_SET_HEADER + 3 * set.count, 'letters');
  });

  // The tables' counts and addresses.
  for (const claim of all) {
    if (!TABLE_CLAIM.test(claim.owner)) continue;
    for (const width of [1, 2, 3]) {
      let count = 0;
      for (let k = width - 1; k >= 0; k -= 1) count = count * 256 + (c.blob[claim.start + k] ?? 0);
      if (width + 3 * count === claim.length) {
        mark(claim.start, claim.length, 'table headers');
        break;
      }
    }
  }

  // What is left, by what claims it.
  const carried = new Map<string, number>();
  const claimed = new Uint8Array(c.blob.length);
  for (const claim of all) {
    let count = 0;
    for (let k = claim.start; k < claim.start + claim.length; k += 1) {
      if (claimed[k] === 1) continue;
      claimed[k] = 1;
      if (owners[k] === 0) count += 1;
    }
    if (count > 0) carried.set(claim.owner, (carried.get(claim.owner) ?? 0) + count);
  }
  const unclaimed = owners.reduce((n, tag, k) => n + (tag === 0 && claimed[k] === 0 ? 1 : 0), 0);
  if (unclaimed > 0) carried.set('unclaimed', unclaimed);
  const generated = Object.fromEntries(TOUCH_ATTRIBUTIONS.map((who) => [who, 0])) as Record<TouchAttribution, number>;
  owners.forEach((tag) => { if (tag !== 0) generated[TOUCH_ATTRIBUTIONS[tag - 1] as TouchAttribution] += 1; });
  return { generated, carried, total: c.blob.length, owners };
}
