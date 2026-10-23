/**
 * The Harmony One's hit pages the fixed screens name, built from a description: `todo-compile-one.md` 4.8,
 * findings section 417, beside the screens sections 409 to 413 built.
 *
 * **What a hit page is.** The One's screen is touched through base slot 17, the touch hit map, section 45: a table
 * of pages, each a list of rectangles in the panel's own coordinates with the key code a touch inside reports, and
 * a mode page names the page it is touched through by the lead byte of its page record, section 125. The firmware
 * returns the first rectangle containing the point, so a page's order is data.
 *
 * **Which pages.** The firmware screens (section 409), the status screens (sections 411 and 413), the fixed screens
 * (section 411) and the welcome tour and Remote Assistant (section 412) are 103 screen pages on each of the sixteen
 * English compiles of skin 54, and they name 23 distinct hit pages, each page the same shape on all sixteen.
 * Section 405's census counts 25 hit pages in every one of the sixteen: the other two are named by setup screens
 * alone, a device page's six commands with both page keys (`todo-compile-one.md` 4.2) and the generic help
 * screen's, drawn "Attemping to fix the problem..." (4.6), and are not built here: the device pages build the first,
 * `devicepages.ts`, and the help screens the second with their other two, `HELP_HIT_PARTS` below, section 429.
 *
 * **What is generated, by rules measured on all nineteen Harmony One compiles** (section 417):
 *
 * * **every key code**, by the area's place on its page: 48 to 53 for the first six, then 43 and 44, then the
 *   two edge strips' 46 and 47, section 45's table read as one rule, 2524 of 2524 areas on 662 of 662 pages;
 * * **the two edge strips**, last on every page, 662 of 662;
 * * **a button's rectangle from its picture's place**, which the module holds per page (it reads no drawing): a 50 row picture 81 pixels wide at x 6, 48 or 89, or 164
 *   wide at x 6, on one of the button rows 38, 92 and 146 has the rectangle `buttonArea` gives, 8430 of 8430 such
 *   pictures on every page of the nineteen; in y that is the picture's own fifty rows, raised five pixels, through
 *   section 125's panel scale, rounded to the nearest unit, the rows exactly 872 panel units and 54 pixels apart; in x it is one of four column spans, a table rather than a rule: the left column starts at the screen's
 *   left edge and the right one ends at its right edge, which leaves too few points to tell a map from pixels from
 *   a fit;
 * * **the two keys below the screen**: a page drawing a word on the right half at y 190 or below has the right key's
 *   rectangle, and every page with that rectangle draws such a word, 2871 of 2871 both ways; every page with the
 *   left key's rectangle draws a word on the left half there, 3064 of 3064, and 3064 of the 3128 pages drawing one
 *   have the rectangle, the 64 others activity start up screens drawing no key word,
 *   whose body line "your system." starts left of centre at y 191;
 * * **the page's bytes**: each area's twelve bytes ending in its own address, its header, a count and the areas'
 *   addresses, placed in front of the header as every compile places them, and the map's table, a count and every
 *   page's address in index order.
 *
 * **What the module states**, as Logitech's, since no rule above gives them: 34 of the 23 pages' 79 rectangles,
 * 30 of them the tour's, which are drawn around pictures and text no rule here reaches, and four around a body of
 * text on the firmware screens, the sensitivity confirmations and the Remote Assistant's question. They are
 * constants of this model, the same on all sixteen compiles, as the status screens' words are, `STATED` below.
 *
 * **What the description carries**, read off a configuration: the index each of the 23 takes in the map's table,
 * read from the lead byte of one screen page known to name it, the numbering the configuration chose; 23 bytes,
 * all outside the hit pages. And where the configuration's own pages sat, found through the table.
 *
 * **The order of the table is first use**: on all nineteen compiles a page's index is the number of distinct pages
 * named before it, walking the modes and each mode's pages in order, so the head's first three modes, Low Battery,
 * USB Connected and the first blank screen, always name pages 0, 1 and 2, and the other 20 take indices that move
 * with the setup's screens between them. This module keeps every index the description read and builds the table
 * from it; it does not renumber, so the composed path can give the screens' builders the same indices.
 * On the composed path since `todo-compile-one.md` 3.2.2.3, `builders.ts`, where the composers' pages keep the
 * numbering they were appended in, `withHitPage`, which is not first use, and this builder keeps it.
 *
 * **Where the pages sit**: each built page in place of the configuration's, its areas then its header, so Logitech's
 * two runs stay where they were, the head's three pages after the base slot 13 records and the rest after the base
 * slot 14 or 16 records. No firmware read here addresses a page but through the table, section 45's `0x25D70`.
 *
 * English only, skin 54; the Harmony One alone, the touch family's: the Harmony 600, 650 and 700 have no touch map
 * (base slot 17 names their picture bank, section 62). Read only towards hardware: the result is pieces.
 */
import { type Container, parse } from '../../gspm.ts';
import type { ContainerLayout, ContainerPiece, PieceRef } from '../../frame.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import { modeRecords } from '../../sections.ts';
import { TOUCH_AREA_LENGTH, TOUCH_AREA_SELF_AT, touchPages } from '../../tables.ts';
import { EDGE_CODES, LIST_ROW_PITCH, SCREEN_ROW_PITCH } from '../../touch.ts';
import { ScreenRecordError, assertRebuilt } from '../../screenrecords.ts';
import { type ValueReader, blobReader } from '../../shared/spelling.ts';
import { Writer } from '../../emit.ts';
import { withoutRanges } from '../../shared/dropmodes.ts';
import { TOUCH_FIRMWARE_SCREENS } from './firmwarescreens.ts';
import { TOUCH_FIXED_SCREENS, touchFixedScreenModes, touchFixedScreenNames } from './fixedscreens.ts';
import { TOUCH_ASSISTANT_SCREENS, TOUCH_TOUR_SCREENS, touchTourScreenModes } from './tourscreens.ts';

// ---------------------------------------------------------------------------------------------------------
// The rules.

/** A rectangle in the panel's coordinates, the four `u16` an area opens with, section 45. */
export interface HitRectangle { x: number; width: number; y: number; height: number }

/**
 * The key code an area reports, by its place on its page among the areas before the two edge strips: the six
 * items 48 to 53, then 43 and 44, which on a full page are the two keys below the screen. Section 45's table of
 * the nine page sizes is this rule, and it holds on every area of the nineteen compiles, 2524 of 2524.
 */
export const HIT_CODES: readonly number[] = [48, 49, 50, 51, 52, 53, 43, 44];

/**
 * The two edge strips, a tall strip at each side of the panel, last on every page of the nineteen compiles, 662 of
 * 662, reporting `EDGE_CODES`' 46 and 47, the page arrows. Section 45.
 */
export const HIT_EDGES: readonly HitRectangle[] = [
  { x: 765, width: 492, y: 1400, height: 2000 },
  { x: 3556, width: 492, y: 1400, height: 2000 },
];

/** The left and the right key below the screen, where a page draws a word there ("Back", "OK", "Exit", "Yes", "No"). */
export const LEFT_KEY_AREA: HitRectangle = { x: 1257, width: 1395, y: 271, height: 1001 };
export const RIGHT_KEY_AREA: HitRectangle = { x: 2406, width: 1150, y: 271, height: 1001 };

/** The pixel row of the top row of buttons, and the three rows a button sits on, a row pitch apart. */
const BUTTON_ROWS: readonly number[] = [38, 38 + SCREEN_ROW_PITCH, 38 + 2 * SCREEN_ROW_PITCH];
/** A button's picture is 50 rows high, and its rectangle is 807 panel units: the same fifty rows. */
export const BUTTON_ROWS_HIGH = 50;
const BUTTON_HEIGHT = 807;
/** The bottom edge of the top row's rectangle in panel units; each row below is one `LIST_ROW_PITCH` lower. */
const TOP_BUTTON_BOTTOM = 3016;
/**
 * Where a button's rectangle starts and how wide it is, by the picture's x and width: three half width columns
 * and one whole width one. A table, measured: the left column runs to the screen's left edge and the right one to
 * its right edge, which leaves too few points to tell a map from pixels from a fit.
 */
const BUTTON_COLUMNS: ReadonlyMap<string, readonly [number, number]> = new Map([
  ['6,81', [1257, 1284]], ['48,81', [1772, 1284]], ['89,81', [2422, 1134]], ['6,164', [1257, 2600]],
]);

/**
 * The rectangle of a button whose picture is drawn at `x`, `y` and is `width` pixels wide and 50 high, or
 * undefined for a picture not on the button grid. Measured on every page of the nineteen compiles: every such
 * picture has exactly this rectangle on its hit page, 8430 of 8430. In y it is the picture's fifty rows raised
 * five pixels through section 125's scale, `panel = 4356 - (872 / 54) * pixel`, rounded, the rows exactly one `LIST_ROW_PITCH` apart.
 */
export function buttonArea(x: number, y: number, width: number): HitRectangle | undefined {
  const row = BUTTON_ROWS.indexOf(y);
  const column = BUTTON_COLUMNS.get(`${x},${width}`);
  if (row < 0 || column === undefined) return undefined;
  return { x: column[0], width: column[1], y: TOP_BUTTON_BOTTOM - LIST_ROW_PITCH * row, height: BUTTON_HEIGHT };
}

/**
 * A part of a hit page: a button by its picture, a key below the screen, or a rectangle the module states. Exported
 * with `whole`, `hitPageAreasOf` and `hitPageRunOf` for the activity menu's pages, `activitymenu.ts`,
 * `todo-compile-one.md` 4.1, whose rows are whole width buttons and whose keys are the two below the screen, so they
 * take these rules rather than a copy of them.
 */
export type HitPart =
  | { button: readonly [x: number, y: number, width: number] }
  | 'left' | 'right'
  | { stated: readonly [x: number, width: number, y: number, height: number] };

const half = (x: number, y: number): HitPart => ({ button: [x, y, 81] });
/** A whole width button, its picture 164 pixels wide at x 6, on the button row at `y`. */
export const whole = (y: number): HitPart => ({ button: [6, y, 164] });
const stated = (x: number, width: number, y: number, height: number): HitPart => ({ stated: [x, width, y, height] });
/**
 * The six half width buttons of a picker page, two to a row, in reading order: `fixedscreens.ts`' grid, a second copy
 * of its places, since that module does not export them; the test checks every picker page's buttons against these
 * rectangles through the pictures it draws, so the two cannot drift apart unnoticed on a compile of Logitech's.
 */
const GRID: readonly HitPart[] = [half(6, 38), half(89, 38), half(6, 92), half(89, 92), half(6, 146), half(89, 146)];

/** A hit page this module builds: its name, the screen page that names it on every compile, and its parts in order. */
interface HitShape {
  name: string;
  /** A screen by its name in the four screen builders' lists, and a page of it, that names this hit page. */
  namer: { screen: string; page: number };
  parts: readonly HitPart[];
}

/**
 * The hit pages a configuration of ours holds only where it keeps the welcome tour and the Remote Assistant,
 * `todo-compile-one.md` 4.10: the tour's ten, the assistant's question, and Options' second page's, which Options
 * without the tour's rows does not have. Every compile of Logitech's holds all of them; a configuration whose namer of
 * one of these is absent describes and builds the rest.
 */
const isTourShape = (shape: HitShape): boolean =>
  shape.namer.screen.startsWith('Tour ') || shape.namer.screen.startsWith('Assistant ') || shape.name === 'two rows';

/**
 * The 23 hit pages the fixed screens name, in the order the sixteen's tables hold them. Each is named by the page
 * `namer` gives, which is one of the screen pages naming it on all sixteen; the others are in section 417.
 */
/**
 * Two rectangles drawn around a body of text that several screens' pages hold alike: the message over "OK", the
 * whole width from y 1369, on Low Battery's page and on every power off help question's; and the message alone, the
 * whole width from y 1127, on USB Connected's page and on the power off help's attempt screen's, findings section 429.
 * One constant each, so a page that holds one holds the same numbers.
 */
const OK_MESSAGE = stated(1257, 2791, 1369, 1292);
const MESSAGE = stated(1257, 2791, 1127, 969);

const SHAPES: readonly HitShape[] = [
  // The firmware screens, the head's first three modes: a message over the right key's "OK" (Low Battery and the
  // charging problem), a message alone (USB Connected and five others, code 9's and every status screen), blank.
  { name: 'message and OK', namer: { screen: 'lowBattery', page: 0 }, parts: [OK_MESSAGE, 'right'] },
  { name: 'message', namer: { screen: 'usbConnected', page: 0 }, parts: [MESSAGE] },
  { name: 'blank', namer: { screen: 'blankA', page: 0 }, parts: [] },
  // A taller message over "OK": the five sensitivity confirmations and four of the Remote Assistant's screens.
  { name: 'confirmation', namer: { screen: 'Sensitivity Very Low', page: 0 }, parts: [stated(1257, 2791, 1240, 2584), 'right'] },
  // The pickers' pages: six buttons and the left key, page keys 43 and 44 being the left key's code on a full page.
  { name: 'six buttons', namer: { screen: 'Minute', page: 0 }, parts: [...GRID, 'left'] },
  { name: 'four buttons', namer: { screen: 'Day 28', page: 4 }, parts: [...GRID.slice(0, 4), 'left'] },
  // The welcome tour, one page each, every one with "Exit" on the right key; its rectangles are drawn around
  // its pictures and paragraphs and no rule here gives them.
  { name: 'Tour Another Activity', namer: { screen: 'Tour Another Activity', page: 0 },
    parts: [stated(1257, 2600, 1159, 1372), stated(1257, 2299, 2241, 2018), 'right'] },
  { name: 'Tour Help Button', namer: { screen: 'Tour Help Button', page: 0 },
    parts: [stated(1257, 2600, 1143, 1437), stated(1257, 2299, 2241, 2018), 'right'] },
  { name: 'Tour Selecting Watch TV', namer: { screen: 'Tour Selecting Watch TV', page: 0 },
    parts: [stated(1486, 1554, 1159, 1292), stated(1257, 2299, 2290, 1970), 'right'] },
  { name: 'Tour Display', namer: { screen: 'Tour Display', page: 0 },
    parts: [stated(1257, 2568, 1514, 775), stated(1257, 1284, 1547, 807), stated(2422, 1134, 1547, 807),
      stated(1257, 2299, 2128, 2131), 'right'] },
  // The one page whose right key comes first.
  { name: 'Tour Help Asks', namer: { screen: 'Tour Help Asks', page: 0 },
    parts: ['right', stated(1344, 2109, 1272, 1550), stated(1257, 2299, 2823, 1437), stated(1257, 2299, 1950, 403),
      stated(1359, 1014, 1337, 629), stated(2422, 1014, 1337, 629)] },
  { name: 'Tour Activities', namer: { screen: 'Tour Activities', page: 0 },
    parts: [stated(1257, 2600, 1159, 1372), stated(1257, 2299, 2354, 1905), 'right'] },
  { name: 'Tour Watch TV', namer: { screen: 'Tour Watch TV', page: 0 },
    parts: [stated(1257, 2568, 885, 1372), stated(1257, 2600, 1498, 807), stated(1257, 2299, 2273, 1986), 'right'] },
  { name: 'Tour Welcome', namer: { screen: 'Tour Welcome', page: 0 },
    parts: [stated(2041, 745, 1288, 936), stated(1257, 2299, 3937, 323), stated(1257, 2061, 2225, 1695),
      stated(1257, 2791, 1272, 3165), 'right'] },
  { name: 'Tour Arrows', namer: { screen: 'Tour Arrows', page: 0 },
    parts: [stated(1257, 2299, 885, 1841), stated(1257, 2299, 2548, 1711), 'right'] },
  { name: 'Tour Off Button', namer: { screen: 'Tour Off Button', page: 0 },
    parts: [stated(1257, 2584, 2855, 1340), stated(1257, 2299, 1127, 2051), 'right'] },
  { name: 'Tour Easy', namer: { screen: 'Tour Easy', page: 0 },
    parts: [stated(2089, 666, 1208, 839), stated(1257, 2299, 2063, 2196), 'right'] },
  // Three whole width buttons and the left key: the Year picker, and Options' first page, whose rows are the same
  // pictures.
  { name: 'three rows', namer: { screen: 'Year', page: 0 }, parts: [whole(38), whole(92), whole(146), 'left'] },
  { name: 'one button', namer: { screen: 'Day 31', page: 5 }, parts: [GRID[0] as HitPart, 'left'] },
  { name: 'two rows', namer: { screen: 'Options', page: 1 }, parts: [whole(38), whole(92), 'left'] },
  // The Remote Assistant's question, "Yes" and "No" on the two keys below its message.
  { name: 'question', namer: { screen: 'Assistant Hide Question', page: 0 },
    parts: [stated(1257, 2791, 1240, 2584), 'left', 'right'] },
  // Screen Sensitivity's five buttons, the middle one alone on its row at x 48.
  { name: 'sensitivity', namer: { screen: 'Screen Sensitivity', page: 0 },
    parts: [half(6, 38), half(89, 38), half(48, 92), half(6, 146), half(89, 146), 'left'] },
  { name: 'two buttons', namer: { screen: 'Time of Day', page: 0 }, parts: [...GRID.slice(0, 2), 'left'] },
];

/**
 * The hit pages the power off help's screens are touched through, `helpscreens.ts`, which builds them with its
 * screens, `todo-compile-one.md` 7.1.6, findings section 429; each its parts in order, the edges after them as on
 * every page. Stated rather than generated where a rectangle is drawn around text, as the tour's are, and the same on
 * every English compile of skin 54 that holds the screen:
 *
 * * `attempt`, "Attemping to fix the problem...": three rectangles around its lines, codes 48 to 50, none bound;
 * * `question`, every Yes or No question, the "If not" one and a device's four: the message over the keys, "Yes" on
 *   the left key at code 49, "No" on the right at 50, and a taller rectangle over the question last, at 51;
 * * `nothing`, "Nothing to do", a household with no device to turn off: the message, "OK" on the right key at 49, and
 *   the taller rectangle. One compile shows it, `harvest_one_families_1`.
 */
const QUESTION_BODY = stated(1257, 2791, 885, 2470);
export const HELP_HIT_PARTS: Readonly<Record<'attempt' | 'question' | 'nothing', readonly HitPart[]>> = {
  attempt: [stated(1257, 2791, 3146, 969), MESSAGE, stated(1914, 983, 2370, 532)],
  question: [OK_MESSAGE, 'left', 'right', QUESTION_BODY],
  nothing: [OK_MESSAGE, 'right', QUESTION_BODY],
};

/**
 * The hit page a Year picker offering a leap year brings, `fixedscreens.ts`' `LEAP_SCREENS`: the Day 29 picker's last
 * page, five buttons and the left key, by the rules every other picker page takes. A configuration holds it exactly
 * where it holds that picker, as Logitech's three of a leap year do, which name it from that page alone, section 434;
 * after the 23, so their order in a description stays what it was.
 */
const LEAP_SHAPES: readonly HitShape[] = [
  { name: 'five buttons', namer: { screen: 'Day 29', page: 4 }, parts: [...GRID.slice(0, 5), 'left'] },
];

/** The 23 hit pages' names, in the order a description lists them. */
export const TOUCH_HIT_PAGES: readonly string[] = SHAPES.map((one) => one.name);
/** The hit pages a leap year brings, `LEAP_SHAPES`, after the 23 in a description that holds them. */
export const TOUCH_LEAP_HIT_PAGES: readonly string[] = LEAP_SHAPES.map((one) => one.name);

/** A shape by name, among the 23 and the leap year's. */
const shapeNamed = (name: string): HitShape | undefined => SHAPES.find((one) => one.name === name) ?? LEAP_SHAPES.find((one) => one.name === name);

/** A part's rectangle, by its rule or as stated. */
function rectangleOf(part: HitPart): HitRectangle {
  if (part === 'left') return LEFT_KEY_AREA;
  if (part === 'right') return RIGHT_KEY_AREA;
  if ('stated' in part) {
    const [x, width, y, height] = part.stated;
    return { x, width, y, height };
  }
  const [x, y, width] = part.button;
  const area = buttonArea(x, y, width);
  if (area === undefined) throw new ScreenRecordError(`a button at ${x}, ${y}, ${width} wide, is not on the button grid`);
  return area;
}

/** A hit page's areas in order, each with its code: the shape's parts, then the two edge strips. */
export function touchHitPageAreas(name: string): { area: HitRectangle; code: number }[] {
  const shape = shapeNamed(name);
  if (shape === undefined) throw new ScreenRecordError(`no hit page is called ${name}`);
  return hitPageAreasOf(shape.parts, name);
}

/** The areas of a page of `parts`, each with its code by its place, then the two edge strips; `what` words a refusal. */
export function hitPageAreasOf(parts: readonly HitPart[], what: string): { area: HitRectangle; code: number }[] {
  if (parts.length > HIT_CODES.length) throw new ScreenRecordError(`${what} holds more areas than a page has codes`);
  return [
    ...parts.map((part, k) => ({ area: rectangleOf(part), code: HIT_CODES[k] as number })),
    ...HIT_EDGES.map((area, k) => ({ area, code: EDGE_CODES[k] as number })),
  ];
}

/** How many of a hit page's rectangles this module states rather than generates. */
export function touchHitPageStated(name: string): number {
  return (shapeNamed(name)?.parts ?? []).filter((part) => typeof part === 'object' && 'stated' in part).length;
}

// ---------------------------------------------------------------------------------------------------------
// The description.

/** What a composer supplies: the index each hit page takes in the map's table. */
export interface TouchHitPagesSpec {
  /** Per hit page, in `names`' order, its index in the table. */
  indices: number[];
  /**
   * The hit pages described, in `TOUCH_HIT_PAGES`' order: all 23, or without the tour's where the configuration
   * leaves the tour and the assistant out, `isTourShape`; then `TOUCH_LEAP_HIT_PAGES` where the configuration holds the
   * Day 29 picker. Absent, all 23.
   */
  names?: readonly string[];
}

/** Where the configuration's pages sat: per table index, its run of pieces, the areas and then the header. */
export interface TouchHitPagesPlace {
  /** Every page of the table, in index order, as its areas followed by its header. */
  runs: ContainerPiece[][];
  /** The table, base slot 17's head piece. */
  table: ContainerPiece;
}

export interface TouchHitPagesDescribed {
  spec: TouchHitPagesSpec;
  place: TouchHitPagesPlace;
  /** Blob offsets read as values: the lead bytes, outside the hit pages. */
  described: Set<number>;
  /** Blob offsets of what the builder writes: the 23 pages' areas and headers, and the table's count and pointers. */
  structure: Set<number>;
  regions: { from: number; to: number; what: string }[];
}

/**
 * The mode each screen a namer can be is, by its name in the screen builders' lists: the firmware screens by
 * their place in the head, section 409, the fixed screens by their look, section 411, and the tour and the Remote
 * Assistant by the wiring's start ladder, section 412. The status screens name nothing the firmware screens and
 * code 9's do not, so none is a namer.
 */
function namerModes(c: Container, layout: ContainerLayout): Map<string, number> {
  const modes = new Map<string, number>();
  TOUCH_FIRMWARE_SCREENS.forEach((id, mode) => modes.set(id, mode));
  const year = Number(c.builtAt?.slice(0, 4));
  const fixed = Number.isInteger(year) ? touchFixedScreenNames(year) : TOUCH_FIXED_SCREENS;
  touchFixedScreenModes(c).forEach((mode, k) => modes.set(fixed[k] as string, mode));
  const tour = touchTourScreenModes(c, layout);
  const names = [...TOUCH_TOUR_SCREENS, ...(tour.assistant ? TOUCH_ASSISTANT_SCREENS : [])];
  tour.modes.forEach((mode, k) => modes.set(names[k] as string, mode));
  return modes;
}

/**
 * Read off a configuration what a composer would supply for the 23 hit pages, and where Logitech's sat. Refuses a
 * configuration whose touch map does not read, a namer the configuration does not hold, two hit pages read to one
 * index, and a page whose areas do not sit in front of its header as every compile places them. `read` is where
 * every value is taken from, so a caller can blind every byte it does not read.
 */
export function describeTouchHitPages(
  c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c),
): TouchHitPagesDescribed {
  const map = touchPages(c);
  if (map === undefined) throw new ScreenRecordError('the configuration has no touch map');
  const described = new Set<number>();
  const value = (at: number): number => { described.add(at); return read(at); };

  // The index each hit page takes: the lead byte of its namer's page record, the record's first byte.
  const records = modeRecords(c) ?? [];
  const modes = namerModes(c, layout);
  // A tour shape whose namer page the configuration does not hold is left out: ours without the tour.
  const held = (shape: HitShape): boolean => {
    const mode = modes.get(shape.namer.screen);
    return mode !== undefined && records[mode]?.pages[shape.namer.page] !== undefined;
  };
  // A leap year's shape where the configuration holds its namer, after the 23.
  const shapes = [...SHAPES.filter((shape) => !isTourShape(shape) || held(shape)), ...LEAP_SHAPES.filter(held)];
  const indices = shapes.map((shape) => {
    const mode = modes.get(shape.namer.screen);
    if (mode === undefined) throw new ScreenRecordError(`the configuration holds no ${shape.namer.screen}, which names ${shape.name}`);
    const page = records[mode]?.pages[shape.namer.page];
    if (page === undefined) throw new ScreenRecordError(`${shape.namer.screen} has no page ${shape.namer.page + 1}`);
    return value(c.blobOffsetOf(page.address) as number);
  });
  indices.forEach((index, k) => {
    if (index >= map.records.length) throw new ScreenRecordError(`${shapes[k]?.name} is hit page ${index} of a table of ${map.records.length}`);
    if (indices.indexOf(index) !== k) throw new ScreenRecordError(`${shapes[indices.indexOf(index)]?.name} and ${shapes[k]?.name} are both hit page ${index}`);
  });

  const { runs, table } = touchHitPagesPlace(c, layout);

  // The structure: the built pages' bytes, and the table's count and pointers.
  const structure = new Set<number>();
  const regions: { from: number; to: number; what: string }[] = [];
  const claim = (from: number, length: number, what: string): void => {
    for (let k = 0; k < length; k += 1) structure.add(from + k);
    regions.push({ from, to: from + length, what });
  };
  claim(map.start, 1 + 3 * map.records.length, 'the touch map\'s table');
  indices.forEach((index, k) => {
    const page = map.records[index] as (typeof map.records)[number];
    const first = page.start - TOUCH_AREA_LENGTH * page.areas.length;
    claim(first, page.start + page.length - first, `the hit page ${shapes[k]?.name}, hit page ${index}`);
  });
  const names = shapes.map((shape) => shape.name);
  return { spec: { indices, ...(names.length === SHAPES.length ? {} : { names }) }, place: { runs, table }, described, structure, regions };
}

/**
 * Where a configuration's hit pages sit: every page of its table as its run of pieces, the areas and then the header,
 * and the table itself. `describeTouchHitPages`' half that reads no namer, so the activity menu's builder,
 * `activitymenu.ts`, `todo-compile-one.md` 4.1, puts its pages back through `withTouchHitPages` the same way. Refuses
 * a page whose areas do not sit in front of its header as every compile places them.
 */
export function touchHitPagesPlace(c: Container, layout: ContainerLayout): TouchHitPagesPlace {
  const map = touchPages(c);
  if (map === undefined) throw new ScreenRecordError('the configuration has no touch map');
  // The configuration's pieces, by where they sit: every page's areas, which have to be its header's run.
  const laid = layOutContainer(layout);
  const at = new Map<number, ContainerPiece>();
  for (const piece of layout.body) {
    if (piece.owner === 'slot-17-area' || piece.owner === 'slot-17-page') at.set(laid.offsetOf(piece) as number, piece);
  }
  const table = layout.sections[17]?.head[0];
  if (table === undefined || laid.offsetOf(table) !== map.start) throw new ScreenRecordError('the touch map\'s table is not base slot 17\'s');
  const runs = map.records.map((page, index) => {
    const header = at.get(page.start);
    const areas = page.areas.map((area, k) => {
      const piece = at.get(c.blobOffsetOf(area.address) as number);
      if (piece === undefined || c.blobOffsetOf(area.address) !== page.start - TOUCH_AREA_LENGTH * (page.areas.length - k)) {
        throw new ScreenRecordError(`hit page ${index}'s area ${k + 1} does not sit in front of its header`);
      }
      return piece;
    });
    if (header === undefined) throw new ScreenRecordError(`hit page ${index}'s header is not a piece of its own`);
    return [...areas, header];
  });
  return { runs, table };
}

// ---------------------------------------------------------------------------------------------------------
// The builder.

/** The 23 pages built, each as its run of pieces, the areas then the header, by the table index it takes. */
export interface BuiltTouchHitPages {
  runs: Map<number, ContainerPiece[]>;
}

/** One hit page's run: each area twelve bytes ending in its own address, then the header naming the areas. */
function hitPageRun(name: string): ContainerPiece[] {
  return hitPageRunOf(touchHitPageAreas(name));
}

/** The run of a page holding `wanted`, in order: `hitPageRun`'s for any page the rules give. */
export function hitPageRunOf(wanted: readonly { area: HitRectangle; code: number }[]): ContainerPiece[] {
  const areas = wanted.map(({ area, code }) => {
    const bytes = new Writer(TOUCH_AREA_LENGTH).u16(area.x).u16(area.width).u16(area.y).u16(area.height).u8(code).u24(0).bytes;
    const piece: ContainerPiece = { bytes, refs: [], owner: 'slot-17-area' };
    // The back pointer at +9 is the area's own address, which the frame writes once it has placed the piece.
    piece.refs.push({ at: TOUCH_AREA_SELF_AT, to: piece, offset: 0 });
    return piece;
  });
  const header: ContainerPiece = {
    bytes: new Writer(1 + 3 * areas.length).u8(areas.length).bytes,
    refs: areas.map((to, k) => ({ at: 1 + 3 * k, to, offset: 0 })),
    owner: 'slot-17-page',
  };
  return [...areas, header];
}

/** Build the 23 hit pages at the indices the spec gives. Refuses two at one index. */
export function buildTouchHitPages(spec: TouchHitPagesSpec): BuiltTouchHitPages {
  const shapes = spec.names === undefined ? SHAPES : spec.names.map((name) => {
    const shape = shapeNamed(name);
    if (shape === undefined) throw new ScreenRecordError(`no hit page is called ${name}`);
    return shape;
  });
  const required = SHAPES.filter((shape) => !isTourShape(shape) && !shapes.includes(shape));
  if (required.length > 0) throw new ScreenRecordError(`the description leaves out ${required.map((one) => one.name).join(', ')}, which every configuration holds`);
  if (spec.indices.length !== shapes.length) throw new ScreenRecordError(`${spec.indices.length} indices for ${shapes.length} hit pages`);
  const runs = new Map<number, ContainerPiece[]>();
  shapes.forEach((shape, k) => {
    const index = spec.indices[k] as number;
    if (runs.has(index)) throw new ScreenRecordError(`hit page ${index} is built twice`);
    runs.set(index, hitPageRun(shape.name));
  });
  return { runs };
}

/**
 * A layout with the built hit pages in place of the configuration's and the map's table built over every page:
 * each built run where the configuration's run of that index sat, the configuration's other pages carried, and the
 * table a count and each page's header in index order. A built page may hold another number of areas than the one
 * it replaces, since a run is replaced whole.
 */
export function withTouchHitPages(layout: ContainerLayout, built: BuiltTouchHitPages, place: TouchHitPagesPlace): ContainerLayout {
  for (const index of built.runs.keys()) {
    if (index >= place.runs.length) throw new ScreenRecordError(`hit page ${index} is past the table's ${place.runs.length}`);
  }
  // Every run in index order, the built one where there is one.
  const runs = place.runs.map((old, index) => built.runs.get(index) ?? old);
  const replaced = new Map<ContainerPiece, ContainerPiece[] | null>();
  built.runs.forEach((run, index) => {
    const old = place.runs[index] as ContainerPiece[];
    old.forEach((piece, k) => replaced.set(piece, k === 0 ? run : null));
  });
  // The table: the count and a pointer per page, and whatever followed them in the configuration's carried.
  const length = 1 + 3 * runs.length;
  const bytes = new Uint8Array(Math.max(length, place.table.bytes.length));
  bytes.set(place.table.bytes.subarray(length), length);
  bytes[0] = runs.length;
  const table: ContainerPiece = {
    ...place.table, bytes,
    refs: [...runs.map((run, k): PieceRef => ({ at: 1 + 3 * k, to: run[run.length - 1] as ContainerPiece, offset: 0 })),
      ...place.table.refs.filter((ref) => ref.at >= length)],
  };
  const body = layout.body.flatMap((piece) => {
    const run = replaced.get(piece);
    return run === undefined ? [piece] : run ?? [];
  });
  // Nothing outside the touch map names a hit page by address, so only the table's head is swapped; a reference
  // into a replaced piece from anywhere else is refused rather than left pointing at a piece the result dropped.
  const all = [layout.keyTable, ...body, ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
  for (const piece of all) {
    if (piece === place.table) continue;
    for (const ref of piece.refs) {
      if ('to' in ref && replaced.has(ref.to) && !replaced.has(piece)) throw new ScreenRecordError('a piece outside the touch map names a replaced hit page');
    }
  }
  return {
    ...layout,
    body,
    sections: layout.sections.map((s) => (s === undefined ? s : { before: s.before, head: s.head.map((piece) => (piece === place.table ? table : piece)) })),
  };
}

/**
 * The configuration's 23 hit pages, or the 11 of ours without the tour, against the ones built from its own description: described, built, put back,
 * laid out and compared byte for byte, refused with the first difference and the page it falls in.
 */
export function checkTouchHitPages(c: Container, read?: ValueReader): { pages: number; areas: number; stated: number; described: number; structure: number } {
  const layout = takeApart(c);
  const d = describeTouchHitPages(c, layout, read);
  assertRebuilt(layOutContainer(withTouchHitPages(layout, buildTouchHitPages(d.spec), d.place)).bytes, c, d.regions);
  const shapes = SHAPES.filter((one) => d.spec.names === undefined || d.spec.names.includes(one.name));
  return {
    pages: shapes.length,
    areas: shapes.reduce((sum, one) => sum + one.parts.length + HIT_EDGES.length, 0),
    stated: shapes.reduce((sum, one) => sum + touchHitPageStated(one.name), 0),
    described: d.described.size,
    structure: d.structure.size,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Taking hit pages out.

/** The hit pages the configuration's screen pages name, by the lead byte of each page record. */
export function namedHitPages(c: Container): Set<number> {
  return new Set((modeRecords(c) ?? []).flatMap((record) => record.pages.map((page) => page.lead as number)));
}

/**
 * The configuration without the hit pages `drop` names, `todo-compile-one.md` 4.10, findings section 421: each page's
 * areas and header taken out, the touch map's table without its entry and its count restated, and every page
 * record's lead renumbered past the pages dropped below it. Nothing but the table names a hit page's pieces and
 * nothing but a lead names its index, section 417, so those are the places a drop moves. Refuses a page some screen
 * page still names, and an index the table does not hold.
 */
export function withoutHitPages(c: Container, drop: Iterable<number>): Container {
  const map = touchPages(c);
  if (map === undefined) throw new ScreenRecordError('the configuration has no touch map');
  const dropping = [...new Set(drop)].sort((a, b) => a - b);
  if (dropping.length === 0) return c;
  const named = namedHitPages(c);
  for (const index of dropping) {
    if (!Number.isInteger(index) || index < 0 || index >= map.records.length) throw new ScreenRecordError(`there is no hit page ${index} to drop`);
    if (named.has(index)) throw new ScreenRecordError(`hit page ${index} is named by a screen page, so it cannot be dropped`);
  }
  const below = (index: number): number => dropping.filter((one) => one < index).length;
  const bytes = c.blob.slice();
  for (const record of modeRecords(c) ?? []) {
    for (const page of record.pages) {
      const at = c.blobOffsetOf(page.address) as number;
      bytes[at] = (bytes[at] as number) - below(bytes[at] as number);
    }
  }
  const cuts = dropping.flatMap((index) => {
    const page = map.records[index] as (typeof map.records)[number];
    return [
      { from: page.start - TOUCH_AREA_LENGTH * page.areas.length, to: page.start + page.length },
      { from: map.start + 1 + 3 * index, to: map.start + 4 + 3 * index },
    ];
  });
  const cut = withoutRanges(parse(bytes), cuts);
  const head = cut.at(map.start);
  if (head === undefined || head.offset !== 0) throw new ScreenRecordError('the touch map\'s table did not survive the cut');
  head.piece.bytes[0] = map.records.length - dropping.length;
  const out = layOutContainer(cut.layout).container;
  const after = touchPages(out);
  if (after?.records.length !== map.records.length - dropping.length) throw new ScreenRecordError('the touch map does not read after the drop');
  const leads = (modeRecords(out) ?? []).flatMap((record) => record.pages.map((page) => page.lead as number));
  const was = (modeRecords(c) ?? []).flatMap((record) => record.pages.map((page) => (page.lead as number) - below(page.lead as number)));
  if (leads.join() !== was.join()) throw new ScreenRecordError('a screen page names another hit page after the drop');
  return out;
}
