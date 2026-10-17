/**
 * The Harmony One's fixed screens past the firmware's ten, built whole from a description:
 * `todo-compile-one.md` 4.4.4.1, findings section 411, the way `firmwarescreens.ts` built the ten (section 409).
 *
 * Section 408 listed what a configuration of ours needs beyond the ten firmware screens: the status screen
 * the firmware draws by number, code 9's "LCD Module Failed" (mode 19 on every compile); the seven blank
 * screens the timers enter; Options; screen sensitivity, a picker and five confirmations; and the clock's
 * eight pickers, Year, Month, three Day pickers (28, 30 and 31 days), Hour, Minute and Time of Day. Section
 * 405's census holds them as fixed modes of role `other`, at mode numbers that differ per compile, since they
 * sit between the setup's screens. Twenty three screens; the welcome tour and the Remote Assistant are
 * 4.4.4.2's.
 *
 * **One shape each once the numbering is set aside**, measured on the sixteen English compiles of skin 54:
 * every tag, opcode and constant operand, every list's length, every word, its font role and its place, the
 * pictures' places and the hit pages' places in a page record are the same on all sixteen. What differs is
 * the configuration's numbering: the mode each screen is, the base slot 10 index of every list, the modes an
 * `0x7E` enters, the timers, the base slot 11 programs an `0x73` runs, the value maps an `0x72` looks up, the
 * state variables a switch tests, the fonts, the pictures and the hit pages. And whether a text is drawn
 * inline or by reference, which follows from the order the compiler emits programs in, below.
 *
 * **What a screen is made of**, `FixedScreen`:
 *
 * * **its own key map**, the presses it swallows and its handlers: tag 6 on entering and 7 on leaving, `0x2D`
 *   the header handler running three base slot 11 programs, `0x29` on the clock pickers. Each binds a list of
 *   the screen's own or one instruction. The stored order is `keyListOrder`'s hash order; no two tags share
 *   a bucket on these screens, so no insertion order is needed;
 * * **its chrome**, the program every page calls: the title in the title font at 6, 4, the full screen
 *   picture, a base slot 11 program and a list of the screen's own queued, on a screen of several pages the
 *   page count, "N pages", and the title again, by reference to its first copy (the chrome's own, Day 28's for
 *   the other Day pickers, or one outside the screens for Options);
 * * **its pages**, each a hit page, a page list, its copy, and a program: the buttons, each a picture and a
 *   word centred in it, the bottom left key's word, "Back", and on a screen of several pages the page number
 *   ending at x 18 and "/". The page list binds the press of each button, the n buttons scans 48 on in
 *   reading order and the bottom left key the next scan or, on a page of six, scan 43; its copy binds the same
 *   presses to lists of their own with the same instructions. Options draws its rows through switches on state
 *   variables, an arm per value, each arm a program piece of its own jumping back to the next row.
 *
 * **Where text goes**, each a rule measured on all 348 text instructions of each of the sixteen: a body line is
 * centred on the 176 pixel width rounded down, `floor((176 - width) / 2)`, as section 409 found; a button's
 * word is centred on the button, `x + floor((width - w) / 2)` for a button at x of width 81 or 164; a word of
 * the key below the screen is centred on that half of the screen, the left half for "Back", the right for
 * "OK"; the page number ends at x 18. The title at 6, 4, the "/" at 18, the page count at 23 and "pages" at 35
 * are measured constants, as is every y. The right half rule rests on "OK" alone, and the full width button
 * rule and the body rule are one function, so neither split is a test of the other.
 *
 * **Inline or by reference** follows the compiler's one inline copy, section 334: a text the screens draw that
 * a program outside them already holds is drawn by reference to it, a home the description carries; otherwise
 * the first program to draw it holds it inline and every later one points there. "First" is the order the
 * programs are laid out in, which is mode order, a screen's chrome before its pages, and in a page the main
 * line first, every piece a switch joins at, then each switch's arms: measured on the sixteen, so the builder
 * builds in that order and decides each text the same way.
 *
 * **What the description carries**, read off a configuration: which mode each screen is; per page its hit
 * page; the pictures, in walk order; the fonts, one per role; the build year, since the Year picker offers the
 * build year and the two either side of it, measured on all nineteen compiles (2025 to 2027 on the sixteen,
 * 2022 to 2024 on the two of 2023, 2012 to 2014 on the Dutch one of 2013), a year whose range holds a leap
 * year being refused, `assertFixedScreensYear`, and a year other than the compile's own needing digits its font
 * sets may not hold, refused by the speller; and every other number the
 * configuration chose, in one walk order. **What is generated**: every opcode, every constant operand, the tags
 * and their order, every list's instructions, the switches' cases, every word and where it is drawn, the page
 * counts and numbers, which text is drawn inline, and the programs' and records' bytes.
 *
 * **What is not built**: the lists these screens' own lists call, 207 on each of the sixteen. Each is named by
 * its index as a number the configuration chose and left as it is: the clock's setters and the lists the enter
 * and leave handlers share with the rest of the configuration among them, section 411. Nor the two screens a
 * leap year in the Year picker's range brings.
 *
 * English only; skin 54, the Harmony One the spare reports. Read only towards hardware: the result is pieces.
 */
import type { Container, Instruction } from '../../gspm.ts';
import { actionListBytes } from '../../gspm.ts';
import type { ContainerLayout, ContainerPiece, PieceRef } from '../../frame.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import type { PieceTarget } from '../../statetables.ts';
import { eventMap, modeRecords, taggedListBytes } from '../../sections.ts';
import {
  SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_END, SCREEN_JUMP, SCREEN_QUEUE_INSTRUCTION, SCREEN_RETURN,
  SCREEN_SELECT_FONT, SCREEN_SWITCH_NARROW, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, type ScreenInstruction, screenProgram,
} from '../../screen.ts';
import { characterMap, decode } from '../../text.ts';
import { keyListOrder } from '../../modezero.ts';
import {
  type BuiltScreen, type RecordFrame, type RecordPlace, ScreenRecordError, assertRebuilt, recordBuilding,
  recordReading, withModeRecords,
} from '../../screenrecords.ts';
import { type ValueReader, blobReader, speller, textGlyphs } from '../../shared/spelling.ts';

const CALL = 0x7f;
const BAND = 0x1f;
const SCREEN_WIDTH = 176;
/** Half the screen: the key below it on either side is centred in its half. */
const HALF = SCREEN_WIDTH / 2;
/** The status code whose screen the firmware draws from a configuration, section 408. */
const DISPLAY_TEST_CODE = 9;

// ---------------------------------------------------------------------------------------------------------
// The template's language.

/** What a number the configuration chose is, for the reader of a description; each is read the same way. */
type NumberKind = 'list' | 'mode' | 'program' | 'timer' | 'map' | 'variable';

/**
 * One instruction: a constant, an instruction whose operand (or, for an opcode with a band, whose low byte)
 * is a number the configuration chose, or a call of a list of the screen's own, whose index is described and
 * whose instructions are built.
 */
type Step =
  | { kind: 'constant'; opcode: number; operand: number }
  | { kind: 'number'; opcode: number; band?: number; what: NumberKind }
  | { kind: 'owns'; steps: readonly Step[] };

const k = (opcode: number, operand: number): Step => ({ kind: 'constant', opcode, operand });
const n = (opcode: number, what: NumberKind): Step => ({ kind: 'number', opcode, what });
const banded = (band: number, what: NumberKind): Step => ({ kind: 'number', opcode: BAND, band, what });
const owns = (...steps: Step[]): Step => ({ kind: 'owns', steps });

const SWALLOW = k(0, 0);
/** The click every button's list opens with, `0x75` with `0x0FCA`. */
const CLICK = k(0x75, 0x0fca);
const LIST = n(CALL, 'list');
const ENTER = n(0x7e, 'mode');
const RUN = n(0x73, 'program');
const MAP = n(0x72, 'map');
const TIMER_START = banded(0xeb, 'timer');
const TIMER_CANCEL = banded(0xea, 'timer');
/** The header handler, tag `0x2D`: three base slot 11 programs. */
const HEADER = owns(RUN, RUN, RUN);

const PRESS = 0x80;
const press = (scan: number): number => PRESS | scan;
const TAG_ENTER = 0x06;
const TAG_LEAVE = 0x07;
const TAG_HEADER = 0x2d;
const TAG_CLOCK = 0x29;
/** The page arrows' presses, scans 47 and 46, which a screen of one page swallows, section 275. */
const ARROWS: readonly Entry[] = [[press(47), SWALLOW], [press(46), SWALLOW]];
/** Scan 38's press, which every screen here but Time of Day and the status screen swallows. */
const SCAN_38: Entry = [press(38), SWALLOW];
/** The first of the six blocks on the screen, scans 48 to 53, and the left touch point below it. */
const FIRST_BLOCK = 48;
const BLOCKS = 6;
const LEFT_KEY = 43;

type Entry = readonly [number, Step];

/** The fonts the screens select, by what they draw; each is a number the configuration chose. */
export type FixedScreenFont = 'title' | 'count' | 'item' | 'wide' | 'key' | 'body' | 'ok';
export const FIXED_SCREEN_FONTS: readonly FixedScreenFont[] = ['title', 'count', 'item', 'wide', 'key', 'body', 'ok'];

/** Where a text starts: at a constant x, centred in `[left, left + width)`, or ending at an x. */
type Place = number | { in: readonly [number, number] } | { endAt: number };

type Part =
  | { op: 'picture'; x: number; y: number }
  | { op: 'font'; font: FixedScreenFont }
  | { op: 'text'; word: string; x: Place; y: number }
  | { op: 'queue'; step: Step }
  | { op: 'chrome' }
  | { op: 'return' }
  /**
   * A switch on a state variable the configuration chose: exact values first, then ranges, each arm a
   * program piece of its own ending in a jump to `then`, the piece the arms join again at.
   */
  | { op: 'switch'; arms: readonly { match: number | readonly [number, number]; parts: readonly Part[] }[]; then: readonly Part[] };

interface FixedPage {
  /** The page list's bindings, which its copy repeats with lists of its own. */
  list: readonly Entry[];
  parts: readonly Part[];
}

interface FixedScreen {
  name: string;
  own: readonly Entry[];
  chrome: readonly Part[];
  pages: readonly FixedPage[];
}

const font = (which: FixedScreenFont): Part => ({ op: 'font', font: which });
const picture = (x: number, y: number): Part => ({ op: 'picture', x, y });
const text = (word: string, x: Place, y: number): Part => ({ op: 'text', word, x, y });
const centred = (word: string, y: number): Part => text(word, { in: [0, SCREEN_WIDTH] }, y);
const TITLE_AT = [6, 4] as const;

/**
 * A chrome: the title, the full screen picture, the queued program and list, the page count where there are
 * several pages, and the title again. The title is drawn twice, once before the picture and once by reference
 * to itself after it, on every chrome with one; the second needs the title font again only after the count.
 */
function chrome(title: string | undefined, pages: number): Part[] {
  const head = title === undefined ? [] : [font('title'), text(title, TITLE_AT[0], TITLE_AT[1])];
  const count = pages > 1 ? [font('count'), text(String(pages), 23, 18), text('pages', 35, 18)] : [];
  const again = title === undefined ? [] : [...(pages > 1 ? [font('title')] : []), text(title, TITLE_AT[0], TITLE_AT[1])];
  return [...head, picture(0, 0), { op: 'queue', step: RUN }, ...count, { op: 'queue', step: owns(RUN, RUN) }, ...again,
    { op: 'return' }];
}

/** The word of the left key below the screen, centred on the left half, in the key font. */
const leftKey = (...words: readonly (readonly [string, number])[]): Part[] =>
  [font('key'), ...words.map(([word, y]) => text(word, { in: [0, HALF] }, y))];
const BACK = leftKey(['Back', 202]);

/** The page number ending at x 18 and the "/" after it, in the count font. */
const pageNumber = (page: number): Part[] => [font('count'), text(String(page), { endAt: 18 }, 18), text('/', 18, 18)];

/** A button: its picture's place and width, and how far below its top its word sits. */
interface Button { x: number; y: number; width: number; below: number }
const half = (x: number, y: number): Button => ({ x, y, width: 81, below: 20 });
const whole = (y: number): Button => ({ x: 6, y, width: 164, below: 19 });
/** Six half width buttons, two to a row, in reading order. */
const GRID: readonly Button[] = [half(6, 38), half(89, 38), half(6, 92), half(89, 92), half(6, 146), half(89, 146)];

interface Item { word: string; step: Step }

/**
 * A picker: its items on pages of the buttons given, the n items of a page at scans 48 on and Back at the next
 * scan, or scan 43 when the page holds six; its chrome counts its pages where there are several.
 */
function picker(
  name: string, title: string, own: readonly Entry[], items: readonly Item[], buttons: readonly Button[], itemFont: FixedScreenFont,
): FixedScreen {
  const pages: FixedPage[] = [];
  const count = Math.ceil(items.length / buttons.length);
  for (let p = 0; p < count; p += 1) {
    const on = items.slice(p * buttons.length, (p + 1) * buttons.length);
    const parts: Part[] = [{ op: 'chrome' }];
    on.forEach((item, i) => {
      const b = buttons[i] as Button;
      parts.push(picture(b.x, b.y));
      if (i === 0) parts.push(font(itemFont));
      parts.push(text(item.word, { in: [b.x, b.width] }, b.y + b.below));
    });
    parts.push(...BACK);
    if (count > 1) parts.push(...pageNumber(p + 1));
    const back = on.length < BLOCKS ? FIRST_BLOCK + on.length : LEFT_KEY;
    const list: Entry[] = [...on.map((item, i): Entry => [press(FIRST_BLOCK + i), item.step]), [press(back), owns(CLICK, ENTER)]];
    pages.push({ list, parts });
  }
  return { name, own, chrome: chrome(title, count), pages };
}

/** The clock pickers' own key map: a page of several swallows no arrow, and tag `0x29` writes the picker's field. */
function clockOwn(enterLists: number, field: number, single = false): Entry[] {
  return [
    ...(single ? ARROWS : []),
    [TAG_ENTER, owns(TIMER_START, ...Array<Step>(enterLists).fill(LIST))],
    [TAG_LEAVE, owns(TIMER_CANCEL, LIST, LIST)],
    [TAG_CLOCK, owns(k(BAND, 0xe700), banded(0xed, 'variable'), k(BAND, 0xef00 | field), k(0x77, 6), LIST)],
    SCAN_38, [TAG_HEADER, HEADER],
  ];
}

/** The clock's fields as the `0x29` handler names them, section 130's records: minute 1, hour 2, day 3, month 5, year 6. */
const FIELD = { minute: 1, hour: 2, day: 3, month: 5, year: 6 } as const;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December'];

/** A day picker of `days` days: each day writes the day and goes on to the Hour picker. */
function dayPicker(days: number): FixedScreen {
  const items = Array.from({ length: days }, (_, d): Item => ({ word: String(d + 1), step: owns(CLICK, LIST, k(0x07, 0xfff8), ENTER) }));
  return picker(`Day ${days}`, 'Day', clockOwn(3, FIELD.day), items, GRID, 'item');
}

/** The five screen sensitivity levels in the order the picker shows them, and what each writes. */
const SENSITIVITY: readonly (readonly [string, number])[] = [
  ['Very Low', 0xf508], ['Low', 0xf50c], ['Medium', 0xf500], ['High', 0xf504], ['Very High', 0xf507]];

/** The seven blank screens in mode order, by what their enter and leave lists do. */
function blank(index: number, kind: 'three' | 'two', extra: boolean): FixedScreen {
  const enter = kind === 'three'
    ? [k(0x07, 0xfffb), k(BAND, 0xfe03), TIMER_START]
    : [k(0x07, 0xfffb), k(BAND, 0xfe02), k(BAND, 0xe805), TIMER_START];
  const leave = kind === 'three'
    ? [k(BAND, 0xfd03), LIST, TIMER_CANCEL, LIST]
    : [k(0x07, 0xfffb), k(BAND, 0xfd02), LIST, TIMER_CANCEL, LIST];
  return {
    name: `Blank ${index}`,
    own: [...ARROWS, [TAG_ENTER, owns(...enter, ...(extra ? [banded(0xf2, 'variable')] : []))], [TAG_LEAVE, owns(...leave)], SCAN_38],
    chrome: [picture(0, 0), { op: 'return' }],
    pages: [{ list: [], parts: [{ op: 'chrome' }] }],
  };
}

/** The bottom left key's word on Options, by whether an activity runs: "Activities" or "Current Activity". */
const optionsKey = (page: number): Part => ({
  op: 'switch',
  arms: [{ match: 0, parts: leftKey(['Activities', 202]) }, { match: 1, parts: leftKey(['Current', 196], ['Activity', 207]) }],
  then: pageNumber(page),
});
const row = (y: number, ...words: readonly (readonly [string, number])[]): Part[] =>
  [picture(6, y), font('wide'), ...words.map(([word, below]) => text(word, { in: [6, 164] }, y + below))];

/**
 * The twenty three screens, in the order a description lists them; `year` is the build year the Year picker
 * is centred on.
 */
function fixedScreens(year: number): FixedScreen[] {
  assertFixedScreensYear(year);
  const confirmation = (level: string): FixedScreen => ({
    name: `Sensitivity ${level}`,
    own: [...ARROWS, [TAG_ENTER, owns(TIMER_START, LIST)], [TAG_LEAVE, owns(TIMER_CANCEL, LIST)], SCAN_38, [TAG_HEADER, HEADER]],
    chrome: chrome(undefined, 1),
    pages: [{
      list: [[press(49), owns(CLICK, ENTER)]],
      parts: [{ op: 'chrome' }, font('body'), centred('Screen sensitivity is set to', 105), centred(level, 117),
        font('ok'), text('OK', { in: [HALF, HALF] }, 201)],
    }],
  });
  const sensitivityButtons = [half(6, 38), half(89, 38), half(48, 92), half(6, 146), half(89, 146)];
  const hours = Array.from({ length: 12 }, (_, h) => `${h === 0 ? 12 : h}:00`);
  // The Year picker's `0x79` takes the first year it offers, less 2000, off the clock's year: -25 (`FFE7`) on
  // the sixteen of 2026, -22 on the two of 2023 and -12 on the Dutch one of 2013, so it is generated from the
  // build year rather than written as the sixteen's constant. Found by the blind reviewer, section 411.
  const yearOffset = (2001 - year) & 0xffff;
  return [
    {
      name: 'LCD Module Failed',
      own: [...ARROWS, [TAG_ENTER, TIMER_START], [TAG_LEAVE, TIMER_CANCEL], [TAG_HEADER, HEADER]],
      chrome: chrome(`System Message: ${DISPLAY_TEST_CODE}`, 1),
      pages: [{ list: [], parts: [{ op: 'chrome' }, font('body'), centred('LCD Module', 162), centred('Failed', 174)] }],
    },
    {
      name: 'Options',
      own: [[TAG_ENTER, owns(TIMER_START, LIST, LIST, LIST)], [TAG_LEAVE, owns(TIMER_CANCEL, LIST, LIST, LIST)], SCAN_38,
        [TAG_HEADER, HEADER]],
      chrome: chrome('Options', 2),
      pages: [
        {
          list: [[press(48), MAP], [press(49), owns(CLICK, LIST)], [press(50), owns(CLICK, ENTER)], [press(51), MAP]],
          parts: [{ op: 'chrome' }, {
            op: 'switch',
            arms: [{ match: 3, parts: row(38, ['Turn Remote Assistant', 13], ['On', 25]) },
              { match: [0, 2], parts: row(38, ['Turn Remote Assistant', 13], ['Off', 25]) }],
            then: [...row(92, ['Tutorial', 19]), picture(6, 146), text('Date and Time', { in: [6, 164] }, 165), optionsKey(1)],
          }],
        },
        {
          list: [[press(48), MAP], [press(49), owns(CLICK, ENTER)], [press(50), MAP]],
          parts: [{ op: 'chrome' }, {
            op: 'switch',
            arms: [{ match: 0, parts: row(38, ['Turn Screen Sounds Off', 19]) }, { match: 1, parts: row(38, ['Turn Screen Sounds On', 19]) }],
            then: [...row(92, ['Screen Sensitivity', 19]), optionsKey(2)],
          }],
        },
      ],
    },
    picker('Screen Sensitivity', 'Screen Sensitivity',
      [...ARROWS, [TAG_ENTER, owns(TIMER_START, LIST)], [TAG_LEAVE, owns(TIMER_CANCEL, LIST, LIST)], SCAN_38, [TAG_HEADER, HEADER]],
      SENSITIVITY.map(([word, writes]) => ({ word, step: owns(CLICK, k(0x3f, writes), ENTER) })), sensitivityButtons, 'item'),
    ...SENSITIVITY.map(([level]) => confirmation(level)),
    picker('Year', 'Year',
      [...ARROWS, [TAG_ENTER, owns(TIMER_START, k(BAND, 0xef00 | FIELD.year), k(0x79, yearOffset), LIST, LIST)],
        [TAG_LEAVE, owns(TIMER_CANCEL, LIST, LIST)],
        [TAG_CLOCK, owns(k(BAND, 0xe700), banded(0xed, 'variable'), k(BAND, 0xef00 | FIELD.year), k(0x79, yearOffset), k(0x77, 3), LIST)],
        SCAN_38, [TAG_HEADER, HEADER]],
      [year - 1, year, year + 1].map((one) => ({ word: String(one), step: owns(CLICK, LIST, ENTER) })),
      [whole(38), whole(92), whole(146)], 'wide'),
    picker('Month', 'Month', clockOwn(3, FIELD.month),
      MONTHS.map((word) => ({ word, step: owns(CLICK, LIST, ENTER) })), GRID, 'item'),
    dayPicker(28), dayPicker(30), dayPicker(31),
    picker('Hour', 'Hour', clockOwn(4, FIELD.hour),
      hours.map((word) => ({ word, step: owns(CLICK, LIST, ENTER) })), GRID, 'item'),
    picker('Minute', 'Minute', clockOwn(3, FIELD.minute),
      Array.from({ length: 60 }, (_, m) => ({ word: String(m).padStart(2, '0'), step: owns(CLICK, LIST, ENTER) })), GRID, 'item'),
    picker('Time of Day', 'Time of Day',
      [...ARROWS, [TAG_ENTER, owns(TIMER_START, LIST)], [TAG_LEAVE, owns(TIMER_CANCEL, LIST, LIST)], [TAG_HEADER, HEADER]],
      [{ word: 'AM', step: owns(CLICK, LIST, k(0x07, 0xfff9), ENTER) }, { word: 'PM', step: owns(CLICK, LIST, LIST, k(0x07, 0xfff9), ENTER) }],
      [half(6, 38), half(89, 38)], 'item'),
    blank(1, 'three', false), blank(2, 'three', false), blank(3, 'three', true),
    blank(4, 'two', false), blank(5, 'two', false), blank(6, 'two', false), blank(7, 'two', true),
  ];
}

/**
 * A build year these screens are built for: one whose Year picker offers no leap year. Where it offers one,
 * Logitech's compiles hold two more screens, a Day picker of 29 days and a second Month picker leading
 * February there, which the leap year's button enters: seen on the two European compiles of 2023 (2024 in
 * their range) and the Dutch one of 2013 (2012), each in another look or language, and on no compile of skin
 * 54 in English, so they are not built here and such a year is refused. Of the build years, only one in four
 * offers no leap year: 2026 does, 2027 does not.
 */
export function assertFixedScreensYear(year: number): void {
  const leap = [year - 1, year, year + 1].find((one) => (one % 4 === 0 && one % 100 !== 0) || one % 400 === 0);
  if (leap !== undefined) {
    throw new ScreenRecordError(`the Year picker of ${year} offers ${leap}, a leap year, and the Day 29 picker and second Month `
      + 'picker that brings are not built');
  }
}

/** The screens' names, in the order a description lists them. */
export const TOUCH_FIXED_SCREENS: readonly string[] = fixedScreens(2026).map((one) => one.name);

// ---------------------------------------------------------------------------------------------------------
// Which mode each screen is.

/**
 * The mode each of the twenty three screens is, found by its look: code 9's screen by the event map, the
 * others by what they draw, the title at 6, 4 their chrome draws, the confirmations by their level, the Day
 * pickers by how many days they offer, and the blank screens as the seven modes of one page whose chrome draws
 * only a picture and whose own key map binds the arrows, the two handlers and scan 38, in mode order. Refuses a
 * configuration holding one of them other than once.
 */
export function touchFixedScreenModes(c: Container): number[] {
  const map = characterMap(c);
  if (map === undefined) throw new ScreenRecordError('the configuration draws no text this can read');
  const all = modeRecords(c) ?? [];
  const status = eventMap(c)?.entries.get(DISPLAY_TEST_CODE);
  if (status === undefined) throw new ScreenRecordError(`the event map names no screen for code ${DISPLAY_TEST_CODE}`);
  const found = new Map<string, number[]>();
  const add = (name: string, mode: number): void => { found.set(name, [...(found.get(name) ?? []), mode]); };
  add('LCD Module Failed', status);
  const words = (address: number): string[] => (screenProgram(c, address) ?? []).flatMap((one) => {
    const glyphs = textGlyphs(c, one);
    return glyphs === undefined ? [] : [decode(glyphs, map)];
  });
  all.forEach((record, mode) => {
    if (mode === status || record.pages.length === 0) return;
    const first = screenProgram(c, (record.pages[0] as { program: number }).program) ?? [];
    const call = first.find((one) => one.opcode === SCREEN_CALL);
    const chromeProgram = call === undefined ? undefined : screenProgram(c, call.targets[0] as number);
    if (chromeProgram === undefined) return;
    const titled = chromeProgram.find((one) => (one.opcode === SCREEN_TEXT_AT || one.opcode === SCREEN_TEXT_INLINE)
      && one.operands[0] === TITLE_AT[0] && one.operands[1] === TITLE_AT[1]);
    const title = titled === undefined ? undefined : decode(textGlyphs(c, titled) as Uint8Array, map);
    const page = words((record.pages[0] as { program: number }).program);
    if (title === undefined) {
      const at = page.indexOf('Screen sensitivity is set to');
      if (at >= 0) add(`Sensitivity ${page[at + 1]}`, mode);
      const tags = record.entries.map((one) => one.tag).sort((a, b) => a - b).join(',');
      const bare = first.length === 2 && chromeProgram.length === 3 && chromeProgram[0]?.opcode === SCREEN_DRAW_IMAGE;
      if (bare && record.pages.length === 1 && tags === [TAG_ENTER, TAG_LEAVE, press(38), press(46), press(47)].join(',')) {
        add('blank', mode);
      }
      return;
    }
    if (title === 'Day') {
      const last = words((record.pages[record.pages.length - 1] as { program: number }).program);
      const days = [28, 30, 31].find((d) => last.includes(String(d)) && !last.includes(String(d + 1)));
      if (days !== undefined) add(`Day ${days}`, mode);
      return;
    }
    if (['Options', 'Screen Sensitivity', 'Year', 'Month', 'Hour', 'Minute', 'Time of Day'].includes(title)) add(title, mode);
  });
  const blanks = found.get('blank') ?? [];
  if (blanks.length !== 7) throw new ScreenRecordError(`the configuration holds ${blanks.length} blank screens of this look, not 7`);
  blanks.forEach((mode, i) => found.set(`Blank ${i + 1}`, [mode]));
  return TOUCH_FIXED_SCREENS.map((name) => {
    const modes = found.get(name) ?? [];
    if (modes.length !== 1) throw new ScreenRecordError(`the configuration holds ${modes.length} screens of the look of ${name}, not one`);
    return modes[0] as number;
  });
}

// ---------------------------------------------------------------------------------------------------------
// The description.

export interface TouchFixedScreensSpec {
  /** One font per role, `FIXED_SCREEN_FONTS`. */
  fonts: Record<FixedScreenFont, number>;
  /** The build year, which the Year picker offers with the year either side. */
  year: number;
  /** Per screen, in `TOUCH_FIXED_SCREENS` order. */
  screens: {
    /** Which mode it is, which also orders the build: the programs are laid out in mode order. */
    mode: number;
    /** Each page's hit page. */
    leads: number[];
    /** Every picture it draws, in walk order. */
    pictures: PieceTarget[];
    /** Every other number the configuration chose, in walk order. */
    numbers: number[];
  }[];
  /** Texts drawn by reference to a copy outside these screens, by glyph codes joined. */
  homes: Map<string, PieceTarget>;
}

export interface TouchFixedScreensDescribed {
  spec: TouchFixedScreensSpec;
  place: { screens: RecordPlace[]; lists: Map<number, ContainerPiece>; lengths: Map<ContainerPiece, number>; inline: Map<ContainerPiece, Map<number, string>> };
  described: Set<number>;
  structure: Set<number>;
  addresses: { read: Set<number>; built: Set<number> };
  regions: { from: number; to: number; what: string }[];
}

const hex = (value: number): string => `0x${value.toString(16)}`;

/** A switch's tables as its operands hold them: the variable, the exact values, the ranges, narrow form. */
function switchTables(one: ScreenInstruction): { exact: number[]; ranges: [number, number][]; fields: number[] } {
  const o = one.operands;
  const exact: number[] = [];
  const ranges: [number, number][] = [];
  const fields: number[] = [];
  let at = 1;
  const exactCount = o[at] as number;
  at += 1;
  for (let k = 0; k < exactCount; k += 1, at += 4) { exact.push(o[at] as number); fields.push(one.start + 1 + at + 1); }
  const rangeCount = o[at] as number;
  at += 1;
  for (let k = 0; k < rangeCount; k += 1, at += 5) { ranges.push([o[at] as number, o[at + 1] as number]); fields.push(one.start + 1 + at + 2); }
  return { exact, ranges, fields };
}

/**
 * Read off a configuration what a composer would supply for these screens, and where Logitech's sat. Refuses
 * a screen whose tags, instructions, lists or programs are not this module's shape, or a font that two roles
 * disagree on. `layout` is `takeApart(c)`; `read` is where every value is taken from.
 */
export function describeTouchFixedScreens(
  c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c),
): TouchFixedScreensDescribed {
  const year = Number(c.builtAt?.slice(0, 4));
  if (!Number.isInteger(year)) throw new ScreenRecordError('the configuration states no build year');
  const screens = fixedScreens(year);
  const modes = touchFixedScreenModes(c);
  const reading = recordReading(c, layout, read);
  const { value, value16, value24 } = reading;
  const fonts: Partial<Record<FixedScreenFont, number>> = {};
  const places: RecordPlace[] = [];

  const described = screens.map((screen, s) => {
    const mode = modes[s] as number;
    const f: RecordFrame = reading.frame(screen.name, mode);
    if (f.pages.length !== screen.pages.length) {
      throw new ScreenRecordError(`${screen.name}, mode ${mode}, has ${f.pages.length} pages, not ${screen.pages.length}`);
    }
    const numbers: number[] = [];
    const pictures: PieceTarget[] = [];
    const extras: ContainerPiece[] = [];

    // An instruction against its step, `at` being where its operand starts.
    const step = (want: Step, got: { opcode: number; operand: number }, at: number, what: string): void => {
      if (want.kind === 'constant') {
        if (got.opcode !== want.opcode || got.operand !== want.operand) {
          throw new ScreenRecordError(`${screen.name}'s ${what} is ${hex(got.opcode)} ${hex(got.operand)}, not ${hex(want.opcode)} ${hex(want.operand)}`);
        }
      } else if (want.kind === 'number') {
        if (got.opcode !== want.opcode) throw new ScreenRecordError(`${screen.name}'s ${what} is not ${hex(want.opcode)}`);
        if (want.band !== undefined) {
          if (got.operand >> 8 !== want.band) throw new ScreenRecordError(`${screen.name}'s ${what} is in another band`);
          numbers.push(value(at));
        } else numbers.push(value16(at));
      } else {
        if (got.opcode !== CALL) throw new ScreenRecordError(`${screen.name}'s ${what} calls no list`);
        numbers.push(value16(at));
        const list = reading.list(got.operand, `${screen.name}'s ${what}`);
        if (list.body.length !== want.steps.length) {
          throw new ScreenRecordError(`${screen.name}'s ${what} is ${list.body.length} instructions, not ${want.steps.length}`);
        }
        want.steps.forEach((one, i) => step(one, list.body[i] as Instruction, list.off + 1 + 3 * i, `${what}, instruction ${i}`));
      }
    };
    // A tagged list against its entries, in the stored order.
    const tagged = (want: readonly Entry[], entries: readonly { tag: number; opcode: number; operand: number }[], off: number, what: string): void => {
      const tags = keyListOrder(want.map(([tag]) => tag));
      const by = new Map(want);
      if (entries.length !== tags.length || entries.some((one, i) => one.tag !== tags[i])) {
        throw new ScreenRecordError(`${screen.name}'s ${what} holds other tags or another order`);
      }
      tags.forEach((tag, i) => step(by.get(tag) as Step, entries[i] as { opcode: number; operand: number }, off + 1 + 4 * i + 1,
        `${what}'s binding of tag ${hex(tag)}`));
    };

    let chromeRead = false;
    // A program piece against its parts. `ending` is what follows the last part: an end, or a jump to the
    // piece the arms join at. Switches leave their arms in `arms`, walked after the main line.
    const arms: { parts: readonly Part[]; address: number; join: number; what: string }[] = [];
    const walk = (parts: readonly Part[], program: readonly ScreenInstruction[], what: string, join?: number): void => {
      let i = 0;
      const next = (opcode: number, part: string): ScreenInstruction => {
        const one = program[i];
        if (one === undefined || one.opcode !== opcode) throw new ScreenRecordError(`${screen.name}'s ${what}, instruction ${i}, is not ${part}`);
        i += 1;
        return one;
      };
      for (const part of parts) {
        if (part.op === 'picture') {
          const one = next(SCREEN_DRAW_IMAGE, 'a picture');
          if (one.operands[0] !== part.x || one.operands[1] !== part.y) throw new ScreenRecordError(`${screen.name}'s ${what} draws a picture elsewhere`);
          pictures.push(reading.targetOf(value24(one.start + one.length - 3)));
        } else if (part.op === 'font') {
          const one = next(SCREEN_SELECT_FONT, 'a font');
          const number = value(one.start + 1);
          const was = fonts[part.font];
          if (was !== undefined && was !== number) throw new ScreenRecordError(`the screens select two fonts for ${part.font}`);
          fonts[part.font] = number;
        } else if (part.op === 'text') {
          const one = program[i];
          if (one === undefined || (one.opcode !== SCREEN_TEXT_AT && one.opcode !== SCREEN_TEXT_INLINE)) {
            throw new ScreenRecordError(`${screen.name}'s ${what}, instruction ${i}, is not a text`);
          }
          i += 1;
        } else if (part.op === 'queue') {
          const one = next(SCREEN_QUEUE_INSTRUCTION, 'a queued instruction');
          const o = one.operands;
          step(part.step, { opcode: o[2] as number, operand: (o[0] as number) | ((o[1] as number) << 8) }, one.start + 1, `${what}'s queued instruction`);
        } else if (part.op === 'return') {
          next(SCREEN_RETURN, 'a return');
        } else if (part.op === 'chrome') {
          const one = next(SCREEN_CALL, 'the call of the chrome');
          if (!chromeRead) {
            chromeRead = true;
            const chrome = f.pages[0]?.chrome;
            if (chrome === undefined || chrome.program[0]?.start !== reading.blobOf(one.targets[0] as number)) {
              throw new ScreenRecordError(`${screen.name}'s chrome does not read`);
            }
            walk(screen.chrome, chrome.program, 'chrome');
          }
        } else {
          const one = next(SCREEN_SWITCH_NARROW, 'a switch');
          if (i !== program.length || part !== parts[parts.length - 1]) throw new ScreenRecordError(`${screen.name}'s ${what} goes on after its switch`);
          numbers.push(value(one.start + 1));
          const tables = switchTables(one);
          const wantExact = part.arms.filter((arm) => typeof arm.match === 'number').map((arm) => arm.match as number);
          const wantRanges = part.arms.filter((arm) => typeof arm.match !== 'number').map((arm) => arm.match as [number, number]);
          if (part.arms.some((arm, a) => (typeof arm.match === 'number') !== (a < wantExact.length))
            || tables.exact.join() !== wantExact.join() || tables.ranges.join() !== wantRanges.join()) {
            throw new ScreenRecordError(`${screen.name}'s ${what} switches on other values`);
          }
          tables.fields.forEach((at) => reading.addressField(at, 'built'));
          // The piece the arms join at, from the first arm's closing jump: the main line goes on there.
          const first = screenProgram(c, one.targets[0] as number);
          const jump = first?.[first.length - 1];
          if (jump === undefined || jump.opcode !== SCREEN_JUMP) throw new ScreenRecordError(`${screen.name}'s ${what}'s first arm does not jump back`);
          const joinAt = jump.targets[0] as number;
          part.arms.forEach((arm, a) => arms.push({ parts: arm.parts, address: one.targets[a] as number, join: joinAt, what: `${what}'s arm ${a + 1}` }));
          const then = reading.program(joinAt, `${screen.name}'s ${what}'s join`);
          extras.push(then.piece);
          walk(part.then, then.program, `${what}'s join`);
          return;
        }
      }
      if (join === undefined) next(SCREEN_END, 'the end');
      else {
        const one = next(SCREEN_JUMP, 'a jump');
        if (one.targets[0] !== join) throw new ScreenRecordError(`${screen.name}'s ${what} jumps elsewhere`);
        reading.addressField(one.start + 1, 'built');
      }
      if (i !== program.length) throw new ScreenRecordError(`${screen.name}'s ${what} holds more than its parts`);
    };

    tagged(screen.own, f.record.entries, f.ownOff, 'own key map');
    const leads = screen.pages.map((page, p) => {
      const frame = f.pages[p] as RecordFrame['pages'][number];
      tagged(page.list, frame.list.entries, frame.listOff, `page ${p + 1}'s list`);
      tagged(page.list, frame.copy.entries, frame.copyOff, `page ${p + 1}'s copy`);
      walk(page.parts, frame.program, `page ${p + 1}`);
      while (arms.length > 0) {
        const arm = arms.shift() as (typeof arms)[number];
        const read = reading.program(arm.address, `${screen.name}'s ${arm.what}`);
        extras.push(read.piece);
        walk(arm.parts, read.program, arm.what, arm.join);
      }
      return frame.page.lead as number;
    });
    places.push(reading.placeOf(screen.name, f, extras));
    return { mode, leads, pictures, numbers };
  });
  for (const one of FIXED_SCREEN_FONTS) if (fonts[one] === undefined) throw new ScreenRecordError(`the screens select no ${one} font`);
  return {
    spec: { fonts: fonts as Record<FixedScreenFont, number>, year, screens: described, homes: reading.homes() },
    place: { screens: places, lists: reading.lists, lengths: reading.lengths, inline: reading.inline },
    described: reading.described,
    structure: reading.structure,
    addresses: reading.addresses,
    regions: reading.regions,
  };
}

// ---------------------------------------------------------------------------------------------------------
// The builder.

export interface BuiltTouchFixedScreens {
  screens: BuiltScreen[];
  lists: Map<number, ContainerPiece>;
  inline: Map<string, PieceTarget>;
  homes: Map<string, PieceTarget>;
}

/** Where a text of width `w` starts by its place rule. */
function startOf(place: Place, w: number): number {
  if (typeof place === 'number') return place;
  if ('endAt' in place) return place.endAt - w;
  return place.in[0] + Math.floor((place.in[1] - w) / 2);
}

/**
 * The screens built from a description, in mode order since the programs are laid out in that order and the
 * first program to draw a text holds it inline. Everything but the description's numbers is generated.
 */
export function buildTouchFixedScreens(c: Container, spec: TouchFixedScreensSpec): BuiltTouchFixedScreens {
  const spell = speller(c);
  const { recordOf } = recordBuilding(spec.homes);
  const screens = fixedScreens(spec.year);
  if (spec.screens.length !== screens.length) throw new ScreenRecordError(`the description holds ${spec.screens.length} screens, not ${screens.length}`);
  const inline = new Map<string, PieceTarget>();
  const lists = new Map<number, ContainerPiece>();
  const built: BuiltScreen[] = [];
  const order = screens.map((_, s) => s).sort((a, b) => (spec.screens[a]?.mode as number) - (spec.screens[b]?.mode as number));
  for (const s of order) {
    const screen = screens[s] as FixedScreen;
    const described = spec.screens[s] as TouchFixedScreensSpec['screens'][number];
    const numbers = [...described.numbers];
    const pictures = [...described.pictures];
    const take = (): number => {
      const one = numbers.shift();
      if (one === undefined) throw new ScreenRecordError(`the description holds too few numbers for ${screen.name}`);
      return one;
    };
    const instruction = (want: Step): Instruction => {
      if (want.kind === 'constant') return { opcode: want.opcode, operand: want.operand };
      if (want.kind === 'number') return { opcode: want.opcode, operand: want.band === undefined ? take() : (want.band << 8) | take() };
      const index = take();
      const bytes = actionListBytes(want.steps.map(instruction));
      const was = lists.get(index);
      if (was !== undefined && was.bytes.join() !== bytes.join()) throw new ScreenRecordError(`list ${index} is built two ways`);
      lists.set(index, { bytes, refs: [], owner: 'slot-10-list' });
      return { opcode: CALL, operand: index };
    };
    const tagged = (entries: readonly Entry[]): Uint8Array => {
      const by = new Map(entries);
      return taggedListBytes(keyListOrder(entries.map(([tag]) => tag)).map((tag) => ({ tag, ...instruction(by.get(tag) as Step) })));
    };

    const own = tagged(screen.own);
    const chrome: ContainerPiece = { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' };
    let chromeBuilt = false;
    const extras: ContainerPiece[] = [];
    const arms: { parts: readonly Part[]; piece: ContainerPiece; join: ContainerPiece }[] = [];

    // One program piece from its parts, closed by an end or by a jump to `join`.
    const emit = (parts: readonly Part[], piece: ContainerPiece, join?: ContainerPiece): void => {
      const out: number[] = [];
      const refs: PieceRef[] = [];
      const pointer = (to: ContainerPiece, offset = 0): void => {
        refs.push({ at: out.length, to, offset });
        out.push(0, 0, 0);
      };
      let current: FixedScreenFont | undefined;
      let switched = false;
      for (const part of parts) {
        if (part.op === 'picture') {
          const target = pictures.shift();
          if (target === undefined) throw new ScreenRecordError(`the description holds too few pictures for ${screen.name}`);
          out.push(SCREEN_DRAW_IMAGE, part.x, part.y);
          pointer(target.to, target.offset);
        } else if (part.op === 'font') {
          current = part.font;
          out.push(SCREEN_SELECT_FONT, spec.fonts[part.font]);
        } else if (part.op === 'text') {
          if (current === undefined) throw new ScreenRecordError(`${screen.name} draws ${part.word} with no font selected`);
          const { codes, width } = spell(spec.fonts[current], part.word);
          const key = codes.join(',');
          const home = spec.homes.get(key) ?? inline.get(key);
          const x = startOf(part.x, width);
          if (home !== undefined) {
            out.push(SCREEN_TEXT_AT, x, part.y);
            pointer(home.to, home.offset);
          } else {
            out.push(SCREEN_TEXT_INLINE, x, part.y);
            inline.set(key, { to: piece, offset: out.length });
            out.push(...codes, 0);
          }
        } else if (part.op === 'queue') {
          const one = instruction(part.step);
          out.push(SCREEN_QUEUE_INSTRUCTION, one.operand & 0xff, one.operand >> 8, one.opcode);
        } else if (part.op === 'return') {
          out.push(SCREEN_RETURN);
        } else if (part.op === 'chrome') {
          out.push(SCREEN_CALL);
          pointer(chrome);
          if (!chromeBuilt) {
            chromeBuilt = true;
            emit(screen.chrome, chrome);
          }
        } else {
          // The switch, then the piece its arms join at, which goes on with the main line; the arms after it.
          const variable = take();
          const then: ContainerPiece = { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' };
          const exact = part.arms.filter((arm) => typeof arm.match === 'number');
          const ranges = part.arms.filter((arm) => typeof arm.match !== 'number');
          const pieces = new Map(part.arms.map((arm) => [arm, { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' } as ContainerPiece]));
          out.push(SCREEN_SWITCH_NARROW, variable, exact.length);
          for (const arm of exact) { out.push(arm.match as number); pointer(pieces.get(arm) as ContainerPiece); }
          out.push(ranges.length);
          for (const arm of ranges) { out.push(...(arm.match as readonly [number, number])); pointer(pieces.get(arm) as ContainerPiece); }
          for (const arm of part.arms) arms.push({ parts: arm.parts, piece: pieces.get(arm) as ContainerPiece, join: then });
          switched = true;
          piece.bytes = Uint8Array.from(out);
          piece.refs = refs;
          extras.push(then);
          emit(part.then, then);
          return;
        }
      }
      if (switched) return;
      if (join === undefined) out.push(SCREEN_END);
      else {
        out.push(SCREEN_JUMP);
        pointer(join);
      }
      piece.bytes = Uint8Array.from(out);
      piece.refs = refs;
    };

    const programs: ContainerPiece[] = [];
    const pageLists: Uint8Array[] = [];
    const copies: Uint8Array[] = [];
    for (const page of screen.pages) {
      pageLists.push(tagged(page.list));
      copies.push(tagged(page.list));
      const program: ContainerPiece = { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' };
      emit(page.parts, program);
      while (arms.length > 0) {
        const arm = arms.shift() as (typeof arms)[number];
        extras.push(arm.piece);
        emit(arm.parts, arm.piece, arm.join);
      }
      programs.push(program);
    }
    if (numbers.length !== 0) throw new ScreenRecordError(`the description holds ${numbers.length} numbers more than ${screen.name} takes`);
    if (pictures.length !== 0) throw new ScreenRecordError(`the description holds ${pictures.length} pictures more than ${screen.name} draws`);
    const one = recordOf(own, programs, pageLists, copies, undefined, { leads: described.leads, chromes: [chrome] });
    // The entry's first byte, the flag section 66 found the firmware tests bit 0 of: on the Harmony One it is
    // 1 exactly on a mode whose own key map binds tag 0x29, 139 of 139 and 0 on the other 3455 of the
    // nineteen compiles, the clock pickers here.
    one.entry.bytes[0] = screen.own.some(([tag]) => tag === TAG_CLOCK) ? 1 : 0;
    built[s] = { ...one, extras };
  }
  return { screens: built, lists, inline, homes: spec.homes };
}

/** A layout with these screens swapped for the built ones, where the configuration's sat. */
export function withTouchFixedScreens(
  layout: ContainerLayout, built: BuiltTouchFixedScreens, place: TouchFixedScreensDescribed['place'],
): ContainerLayout {
  return withModeRecords(layout, built, place);
}

/** Describe, build and put back, and compare every byte with the configuration's. */
export function checkTouchFixedScreens(c: Container, read?: ValueReader): { screens: number; lists: number; described: number; structure: number } {
  const layout = takeApart(c);
  const described = describeTouchFixedScreens(c, layout, read);
  const built = buildTouchFixedScreens(c, described.spec);
  const out = layOutContainer(withTouchFixedScreens(layout, built, described.place)).bytes;
  assertRebuilt(out, c, described.regions);
  return { screens: built.screens.length, lists: built.lists.size, described: described.described.size, structure: described.structure.size };
}
