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
 * **The lists below them are built too**, since `todo-compile-one.md` 6.5, section 418: the 154 on each of the
 * sixteen that the screens' own lists call, through every level, and the wiring does not build, among them the
 * clock's setters and handlers, the key lights' off lists and the list turning the Remote Assistant on, each at the
 * index the description reads. What is left below them, five lists, is the wiring's; section 411 named all 207
 * by index and built none. A list another screen set reaches as well is built by each, identically, and
 * `touchBuiltBytes` gives its bytes to the first in `TOUCH_BUILT` order.
 *
 * **What is not built**: the two screens a leap year in the Year picker's range brings.
 *
 * **The template language, the description reader and the builder are `screentemplate.ts`'**, moved there when
 * 4.4.4.2's tour and Remote Assistant needed them a second time (section 412); this module keeps the twenty three
 * screens, how each is found and the build year.
 *
 * English only; skin 54, the Harmony One the spare reports. Read only towards hardware: the result is pieces.
 */
import type { Container } from '../../gspm.ts';
import type { ContainerLayout, ContainerPiece } from '../../frame.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import { eventMap, modeRecords } from '../../sections.ts';
import { SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_FILL, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, screenProgram } from '../../screen.ts';
import { characterMap, decode } from '../../text.ts';
import { ScreenRecordError, assertRebuilt, recordReading, withModeRecords } from '../../screenrecords.ts';
import { type ValueReader, blobReader, textGlyphs } from '../../shared/spelling.ts';
import { dropModePages } from '../../shared/dropmodes.ts';
import type { PieceTarget } from '../../statetables.ts';
import {
  ARROWS, ASSISTANT_ON, BAND, CLICK, ENTER, type Entry, HALF, HEADER, LIGHT_5_OFF, LIGHT_7_OFF, LIST, MAP, PAGE_KEYS_OFF, type Part,
  SCAN_38, SET, STATE_WRITE, SWALLOW, type Step, TAG_CLOCK, TAG_ENTER, TAG_HEADER, TAG_LEAVE, TIMER_CANCEL, TIMER_START, TITLE_AT,
  type BuiltTemplateScreens, type TemplatePage, type TemplateScreen, type TemplateScreensDescribed, type TemplateScreensSpec, banded,
  buildTemplateScreens, carriedNumbers, centred, chrome as templateChrome, describeTemplateScreens, font as fontPart, k, lowByte, named,
  owns, picture, press, templatePicturePlaces, text, write,
} from './screentemplate.ts';
// Code 9's screen is one of the thirty status screens, whose one shape `statusscreens.ts` states (section 413), so
// it is built through that rather than written here a second time; the code is section 408's.
import { DISPLAY_TEST_CODE, statusScreen } from './statusscreens.ts';

const FIRST_BLOCK = 48;
const BLOCKS = 6;
const LEFT_KEY = 43;

/** The fonts the screens select, by what they draw; each is a number the configuration chose. */
export type FixedScreenFont = 'title' | 'count' | 'item' | 'wide' | 'key' | 'body' | 'ok';
export const FIXED_SCREEN_FONTS: readonly FixedScreenFont[] = ['title', 'count', 'item', 'wide', 'key', 'body', 'ok'];

type FixedPage = TemplatePage<FixedScreenFont>;
type FixedScreen = TemplateScreen<FixedScreenFont>;
type FixedPart = Part<FixedScreenFont>;

const font = (which: FixedScreenFont): Part<FixedScreenFont> => fontPart(which);
/** A chrome in these screens' title and count fonts, `screentemplate.ts`' `chrome`. */
const chrome = (title: string | undefined, pages: number): Part<FixedScreenFont>[] =>
  templateChrome<FixedScreenFont>(title, pages, { title: 'title', count: 'count' });

/** The word of the left key below the screen, centred on the left half, in the key font. */
const leftKey = (...words: readonly (readonly [string, number])[]): FixedPart[] =>
  [font('key'), ...words.map(([word, y]) => text(word, { in: [0, HALF] }, y))];
const BACK = leftKey(['Back', 202]);

/** The page number ending at x 18 and the "/" after it, in the count font. */
const pageNumber = (page: number): FixedPart[] => [font('count'), text(String(page), { endAt: 18 }, 18), text('/', 18, 18)];

/** A button: its picture's place and width, and how far below its top its word sits. */
interface Button { x: number; y: number; width: number; below: number }
const half = (x: number, y: number): Button => ({ x, y, width: 81, below: 20 });
const whole = (y: number): Button => ({ x: 6, y, width: 164, below: 19 });
/** Six half width buttons, two to a row, in reading order. */
const GRID: readonly Button[] = [half(6, 38), half(89, 38), half(6, 92), half(89, 92), half(6, 146), half(89, 146)];

interface Item { word: string; step: Step }

/**
 * A picker: its items on pages of the buttons given, the n items of a page at scans 48 on and Back at the next
 * scan, or scan 43 when the page holds six, entering `back`; its chrome counts its pages where there are several.
 */
function picker(
  name: string, title: string, own: readonly Entry[], items: readonly Item[], buttons: readonly Button[], itemFont: FixedScreenFont,
  back: string,
): FixedScreen {
  const pages: FixedPage[] = [];
  const count = Math.ceil(items.length / buttons.length);
  for (let p = 0; p < count; p += 1) {
    const on = items.slice(p * buttons.length, (p + 1) * buttons.length);
    const parts: FixedPart[] = [{ op: 'chrome' }];
    on.forEach((item, i) => {
      const b = buttons[i] as Button;
      parts.push(picture(b.x, b.y));
      if (i === 0) parts.push(font(itemFont));
      parts.push(text(item.word, { in: [b.x, b.width] }, b.y + b.below));
    });
    parts.push(...BACK);
    if (count > 1) parts.push(...pageNumber(p + 1));
    const backScan = on.length < BLOCKS ? FIRST_BLOCK + on.length : LEFT_KEY;
    const list: Entry[] = [...on.map((item, i): Entry => [press(FIRST_BLOCK + i), item.step]), [press(backScan), owns(CLICK, to(back))]];
    pages.push({ list, parts });
  }
  return { name, own, chrome: chrome(title, count), pages };
}

// ---------------------------------------------------------------------------------------------------------
// Roles, `todo-compile-one.md` 7.1.4: every number the screens take that is not a list of their own says which
// number of the configuration's it is, `named`, so a configuration built from nothing can number them,
// `numbering.ts`. The reader and the builder ignore roles; Options' roles are older, 4.10.2's, and keep their names.

/** The enter of the screen named `screen`, by its name in `TOUCH_FIXED_SCREENS`. */
const to = (screen: string): Step => named(ENTER, `mode ${screen}`);
/** The wiring's lists the screens' entering lists call: the page keys' lights, channel 5's and channel 7's. */
const PAGE_KEYS_ON = named(LIST, 'page keys on');
const LIGHT_5_ON = named(LIST, 'light 5 on');
const LIGHT_7_ON = named(LIST, 'light 7 on');
/** The wiring's list a blank screen's leaving list calls, `events`. */
const EVENTS = named(LIST, 'events');
/** The variable the clock pickers' lists read and write, and the one AM and PM write. */
const CLOCK_VARIABLE = 'clock picker variable';
const TIME_OF_DAY_VARIABLE = 'time of day variable';

/** The clock's fields as the `0x29` handler names them, section 130's records: minute 1, hour 2, day 3, month 5, year 6. */
const FIELD = { minute: 1, hour: 2, day: 3, month: 5, year: 6 } as const;

// ---------------------------------------------------------------------------------------------------------
// The lists below the screens, section 418: every list the screens' own lists call that the wiring does not
// build, stated here as the screens' own lists are and built with them, its index the description's. The lists
// the wiring builds stay `LIST`, a number: the key lights' on lists, `lights` and `events`.

/** The leaving list of every screen that lights the page keys and the key of channel 5 on entering. */
const LEAVE_LIGHTS = [PAGE_KEYS_OFF, LIGHT_5_OFF] as const;
/** The entering list's two calls of the wiring's on lists, the page keys' pair and channel 5's. */
const ENTER_LIGHTS = [PAGE_KEYS_ON, LIGHT_5_ON] as const;

/**
 * A setter a clock picker's button runs: `07 FFFF` and the firmware's clock variable of the field written. The
 * clock is state variables 0 to 6 on every configuration, section 138, so the variable is the field and not a
 * number the configuration chose; the value is the button's, a day counting from 0, section 322, and a year
 * less 2000.
 */
const setField = (field: number, value: number): Step => {
  // One step per field and value, since Logitech's compiles hold one list per setter however many pickers run it: the
  // Day 28, Day 30 and Day 31 pickers share the list writing each day, on 16 of 16, section 431, and a numbering
  // shares a list between screens only where the template states it once, `numbering.ts`.
  const key = `${field} ${value}`;
  const made = SETTERS.get(key) ?? owns(SET, k(STATE_WRITE + field, value));
  SETTERS.set(key, made);
  return made;
};
const SETTERS = new Map<string, Step>();

/**
 * What a clock picker opens with, in the order its `0x29` handler and its entering list repeat it: the field
 * selected, `1F EF00 | field`, and on the Year picker the offset of its first year, `0x79`. `w` is the operand
 * of the `0x77` and `0x78` that follow, 6 on the clock fields' pickers and 3 on the Year's; what it means is not
 * read.
 */
interface ClockHead { head: readonly Step[]; w: number; map: 'clock grid map' | 'clock column map' }

/**
 * Tag `0x29`'s handler, which the firmware runs as the clock ticks over (section 411), and the chain of three
 * lists below it, each picker's own but the last, which the six pickers of two digits (Month, the three Days,
 * Hour and Minute) share and the Year's has a copy of with its own `w`: it runs `0x70` and a variable twice, once with `07` in the high byte in
 * a list of its own, compares by band `0xF0` and `0xEE`, and looks a value map up. Section 418.
 */
function clockHandler({ head, w, map }: ClockHead): Step {
  // Every variable here is the one the pickers read, the configuration's first two byte variable, section 431.
  const variable = named(banded(0xed, 'variable'), CLOCK_VARIABLE);
  // The last list is one step per form, so the pickers that share it in Logitech's compiles share it here, where a
  // numbering shares a list between screens only when the template states it once, `numbering.ts`, section 431.
  const form = `${w} ${map}`;
  const last = CLOCK_LAST.get(form) ?? owns(k(0x77, w), k(0x78, w), CLOCK_READ, k(BAND, 0xfb00), named(banded(0xf0, 'variable'), CLOCK_VARIABLE), named(banded(0xee, 'variable'), CLOCK_VARIABLE), named(MAP, map));
  CLOCK_LAST.set(form, last);
  const chain = owns(named(lowByte(0x70, 0x00, 'variable'), CLOCK_VARIABLE), owns(...head, variable, ...head, last));
  return owns(k(BAND, 0xe700), variable, ...head, k(0x77, w), chain);
}

const CLOCK_LAST = new Map<string, Step>();
/** The list the last list calls, `07` in the high byte: one list on all seven pickers, the Year's copy too, 16 of 16. */
const CLOCK_READ = owns(named(lowByte(0x70, 0x07, 'variable'), CLOCK_VARIABLE), SWALLOW);

/** The list a clock field's picker's entering list calls first: the field selected and the `0x77` the handler runs. */
const fieldEnter = (field: number): Step => owns(k(BAND, 0xef00 | field), k(0x77, 6), k(BAND, 0xf776), k(0x07, 0xfff7));

/**
 * The Hour picker's entering list's first call, and Time of Day's PM: `1F FB0C`, a comparison of the firmware's
 * hour, variable 2, and the hour moved by twelve, `1F FAF4` back on entering and `1F FA0C` on for PM. The
 * firmware's variables 0 to 17 are every configuration's, so the comparison is a constant, as the wiring writes it.
 */
const twelve = (form: number, by: number): Step =>
  owns(k(BAND, 0xfb0c), owns(k(0x71, (form << 8) | 2), owns(k(BAND, 0xf002), k(BAND, 0xfa00 | by), k(BAND, 0xee02))));

/** The clock pickers' own key map: a page of several swallows no arrow, and tag `0x29` writes the picker's field. */
function clockOwn(enter: readonly Step[], field: number, single = false): Entry[] {
  return [
    ...(single ? ARROWS : []),
    [TAG_ENTER, owns(TIMER_START, ...enter)],
    [TAG_LEAVE, owns(TIMER_CANCEL, ...LEAVE_LIGHTS)],
    [TAG_CLOCK, clockHandler({ head: [k(BAND, 0xef00 | field)], w: 6, map: 'clock grid map' })],
    SCAN_38, [TAG_HEADER, HEADER],
  ];
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December'];

/** A day picker of `days` days: each day writes the day and goes on to the Hour picker. */
function dayPicker(days: number): FixedScreen {
  const items = Array.from({ length: days }, (_, d): Item => ({
    word: String(d + 1), step: owns(CLICK, setField(FIELD.day, d), k(0x07, 0xfff8), to('Hour')),
  }));
  return picker(`Day ${days}`, 'Day', clockOwn([fieldEnter(FIELD.day), ...ENTER_LIGHTS], FIELD.day), items, GRID, 'item', 'Month');
}

/** The five screen sensitivity levels in the order the picker shows them, and what each writes. */
const SENSITIVITY: readonly (readonly [string, number])[] = [
  ['Very Low', 0xf508], ['Low', 0xf50c], ['Medium', 0xf500], ['High', 0xf504], ['Very High', 0xf507]];

/** The seven blank screens in mode order, by what their enter and leave lists do. */
function blank(index: number, kind: 'three' | 'two', extra: boolean): FixedScreen {
  const enter = kind === 'three'
    ? [k(0x07, 0xfffb), k(BAND, 0xfe03), TIMER_START]
    : [k(0x07, 0xfffb), k(BAND, 0xfe02), k(BAND, 0xe805), TIMER_START];
  // The wiring's `events`, then the page keys' off list.
  const leave = kind === 'three'
    ? [k(BAND, 0xfd03), EVENTS, TIMER_CANCEL, PAGE_KEYS_OFF]
    : [k(0x07, 0xfffb), k(BAND, 0xfd02), EVENTS, TIMER_CANCEL, PAGE_KEYS_OFF];
  // Two of the seven increment the wiring's `readyVar` on entering.
  const ready = named(banded(0xf2, 'variable'), 'ready variable');
  return {
    name: `Blank ${index}`,
    own: [...ARROWS, [TAG_ENTER, owns(...enter, ...(extra ? [ready] : []))], [TAG_LEAVE, owns(...leave)], SCAN_38],
    chrome: [picture(0, 0), { op: 'return' }],
    pages: [{ list: [], parts: [{ op: 'chrome' }] }],
  };
}

/**
 * The bottom left key's word on Options, by whether an activity runs: "Activities" or "Current Activity", and the
 * page number after it where Options has several pages.
 */
const optionsKey = (page: number | undefined): FixedPart => ({
  op: 'switch', role: 'options key variable',
  arms: [{ match: 0, parts: leftKey(['Activities', 202]) }, { match: 1, parts: leftKey(['Current', 196], ['Activity', 207]) }],
  then: page === undefined ? [] : pageNumber(page),
});
const row = (y: number, ...words: readonly (readonly [string, number])[]): FixedPart[] =>
  [picture(6, y), font('wide'), ...words.map(([word, below]) => text(word, { in: [6, 164] }, y + below))];

// Options' numbers by role, so its form without the Remote Assistant's and the Tutorial's rows is numbered from the
// form a configuration holds, `carriedNumbers`. The reader and the builder ignore a role, so Logitech's Options reads
// and builds as before.
const OPTIONS_KEY_MAP = named(MAP, 'options key map');
const OPTIONS_SOUND_MAP = named(MAP, 'options sound map');
const OPTIONS_DATE = owns(CLICK, named(ENTER, 'options date'));
const OPTIONS_SENSITIVITY = owns(CLICK, named(ENTER, 'options sensitivity'));
const OPTIONS_LIGHT_5_ON = named(LIST, 'options light 5 on');
const OPTIONS_PAGE_KEYS_ON = named(LIST, 'options page keys on');
const OPTIONS_LEAVE: Entry = [TAG_LEAVE, owns(TIMER_CANCEL, LIGHT_5_OFF, PAGE_KEYS_OFF, LIGHT_5_OFF)];
/** Options' entering list, by name, since its form of one page holds fewer steps than the form it is numbered from. */
const optionsEnter = (...steps: Step[]): Entry => [TAG_ENTER, named(owns(TIMER_START, ...steps), 'options enter')];
const OPTIONS_OWN: readonly Entry[] = [
  // The wiring's on lists of channel 5, the page keys and channel 5 again, and the off lists in their order.
  optionsEnter(OPTIONS_LIGHT_5_ON, OPTIONS_PAGE_KEYS_ON, OPTIONS_LIGHT_5_ON), OPTIONS_LEAVE,
  SCAN_38, [TAG_HEADER, HEADER],
];
/**
 * Options of one page enters as Logitech's one page screens do, the timer and channel 5's on list and **not** the page
 * keys' on list: Screen Sensitivity's and Time of Day's entering lists are exactly that on every compile read, where
 * every screen of several pages calls the page keys' list as well. Calling it lit the page keys over a screen with
 * nothing to turn to, which the spare Harmony One showed at the bench, `todo-compile-one.md` 4.10.2. Leaving still
 * switches them off, as the one page screens' leaving lists do too.
 */
const OPTIONS_ONE_PAGE_OWN: readonly Entry[] = [
  optionsEnter(OPTIONS_LIGHT_5_ON), OPTIONS_LEAVE, SCAN_38, [TAG_HEADER, HEADER],
];
/** Screen sounds' row, which writes the button sound variable's other value through its value map. */
const soundRow = (y: number): FixedPart => ({
  op: 'switch', role: 'options sound variable',
  arms: [{ match: 0, parts: row(y, ['Turn Screen Sounds Off', 19]) }, { match: 1, parts: row(y, ['Turn Screen Sounds On', 19]) }],
  then: [],
});

/**
 * Options. **As Logitech's compiles hold it**, measured on the sixteen English compiles of skin 54, two pages:
 * "Turn Remote Assistant On" or "Off", "Tutorial" and "Date and Time", then "Turn Screen Sounds Off" or "On" and
 * "Screen Sensitivity". **Without the welcome tour and the Remote Assistant**, `todo-compile-one.md` 4.10, our form,
 * the first two rows are gone and the three left are one page in the same order: so its own key map swallows the page
 * arrows, as every one page screen's does (section 275), and it draws no page count and no page number. Which form a
 * configuration holds is its Options' page count, `optionsForm`.
 */
function optionsScreen(tour: boolean): FixedScreen {
  if (!tour) {
    const sounds = soundRow(92);
    return {
      name: 'Options',
      own: [...ARROWS, ...OPTIONS_ONE_PAGE_OWN],
      chrome: chrome('Options', 1),
      pages: [{
        list: [[press(48), OPTIONS_DATE], [press(49), OPTIONS_SOUND_MAP], [press(50), OPTIONS_SENSITIVITY], [press(51), OPTIONS_KEY_MAP]],
        parts: [{ op: 'chrome' }, ...row(38, ['Date and Time', 19]),
          { ...sounds, then: [...row(146, ['Screen Sensitivity', 19]), optionsKey(undefined)] } as FixedPart],
      }],
    };
  }
  return {
    name: 'Options',
    own: OPTIONS_OWN,
    chrome: chrome('Options', 2),
    pages: [
      {
        list: [[press(48), named(MAP, 'options assistant map')], [press(49), owns(CLICK, ASSISTANT_ON)], [press(50), OPTIONS_DATE],
          [press(51), OPTIONS_KEY_MAP]],
        parts: [{ op: 'chrome' }, {
          op: 'switch', role: 'options assistant variable',
          arms: [{ match: 3, parts: row(38, ['Turn Remote Assistant', 13], ['On', 25]) },
            { match: [0, 2], parts: row(38, ['Turn Remote Assistant', 13], ['Off', 25]) }],
          then: [...row(92, ['Tutorial', 19]), picture(6, 146), text('Date and Time', { in: [6, 164] }, 165), optionsKey(1)],
        }],
      },
      {
        list: [[press(48), OPTIONS_SOUND_MAP], [press(49), OPTIONS_SENSITIVITY], [press(50), OPTIONS_KEY_MAP]],
        parts: [{ op: 'chrome' }, { ...soundRow(38), then: [...row(92, ['Screen Sensitivity', 19]), optionsKey(2)] } as FixedPart],
      },
    ],
  };
}

/**
 * The twenty three screens, in the order a description lists them; `year` is the build year the Year picker
 * is centred on, and `tour` whether Options holds the Remote Assistant's and the Tutorial's rows.
 */
function fixedScreens(year: number, tour = true): FixedScreen[] {
  assertFixedScreensYear(year);
  const confirmation = (level: string): FixedScreen => ({
    name: `Sensitivity ${level}`,
    own: [...ARROWS, [TAG_ENTER, owns(TIMER_START, LIGHT_7_ON)], [TAG_LEAVE, owns(TIMER_CANCEL, LIGHT_7_OFF)], SCAN_38, [TAG_HEADER, HEADER]],
    chrome: chrome(undefined, 1),
    pages: [{
      list: [[press(49), owns(CLICK, to('Options'))]],
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
  // What the Year picker's entering list and its `0x29` handler open with: the year field and that offset.
  const yearHead = [k(BAND, 0xef00 | FIELD.year), k(0x79, yearOffset)];
  // Each month's button enters the Day picker of its length; February's is 28, a leap year being refused.
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return [
    { ...statusScreen<FixedScreenFont>(DISPLAY_TEST_CODE, { title: 'title', body: 'body' }), name: 'LCD Module Failed' },
    optionsScreen(tour),
    picker('Screen Sensitivity', 'Screen Sensitivity',
      [...ARROWS, [TAG_ENTER, owns(TIMER_START, LIGHT_5_ON)], [TAG_LEAVE, owns(TIMER_CANCEL, ...LEAVE_LIGHTS)], SCAN_38, [TAG_HEADER, HEADER]],
      SENSITIVITY.map(([word, writes]) => ({ word, step: owns(CLICK, k(0x3f, writes), to(`Sensitivity ${word}`)) })), sensitivityButtons, 'item',
      'Options'),
    ...SENSITIVITY.map(([level]) => confirmation(level)),
    picker('Year', 'Year',
      [...ARROWS,
        [TAG_ENTER, owns(TIMER_START, ...yearHead, owns(k(0x77, 3), k(BAND, 0xf776), k(0x07, 0xfff7)), LIGHT_5_ON)],
        [TAG_LEAVE, owns(TIMER_CANCEL, ...LEAVE_LIGHTS)],
        [TAG_CLOCK, clockHandler({ head: yearHead, w: 3, map: 'clock column map' })],
        SCAN_38, [TAG_HEADER, HEADER]],
      [year - 1, year, year + 1].map((one) => ({ word: String(one), step: owns(CLICK, setField(FIELD.year, one - 2000), to('Month')) })),
      [whole(38), whole(92), whole(146)], 'wide', 'Options'),
    picker('Month', 'Month', clockOwn([fieldEnter(FIELD.month), ...ENTER_LIGHTS], FIELD.month),
      MONTHS.map((word, m) => ({ word, step: owns(CLICK, setField(FIELD.month, m), to(`Day ${monthDays[m] as number}`)) })), GRID, 'item',
      'Year'),
    dayPicker(28), dayPicker(30), dayPicker(31),
    picker('Hour', 'Hour', clockOwn([twelve(3, 0xf4), fieldEnter(FIELD.hour), ...ENTER_LIGHTS], FIELD.hour),
      hours.map((word, h) => ({ word, step: owns(CLICK, setField(FIELD.hour, h), to('Minute')) })), GRID, 'item', 'Day 31'),
    picker('Minute', 'Minute', clockOwn([fieldEnter(FIELD.minute), ...ENTER_LIGHTS], FIELD.minute),
      Array.from({ length: 60 }, (_, m) => ({ word: String(m).padStart(2, '0'), step: owns(CLICK, setField(FIELD.minute, m), to('Time of Day')) })),
      GRID, 'item', 'Hour'),
    // AM and PM write 0 and 1 to a variable the configuration chose, PM moving the hour on by twelve first.
    picker('Time of Day', 'Time of Day',
      [...ARROWS, [TAG_ENTER, owns(TIMER_START, LIGHT_5_ON)], [TAG_LEAVE, owns(TIMER_CANCEL, ...LEAVE_LIGHTS)], [TAG_HEADER, HEADER]],
      [{ word: 'AM', step: owns(CLICK, owns(SET, named(write(0), TIME_OF_DAY_VARIABLE)), k(0x07, 0xfff9), to('Options')) },
        { word: 'PM', step: owns(CLICK, twelve(2, 0x0c), owns(SET, named(write(1), TIME_OF_DAY_VARIABLE)), k(0x07, 0xfff9), to('Options')) }],
      [half(6, 38), half(89, 38)], 'item', 'Minute'),
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

/**
 * The twenty three as templates for a build year and a form of Options, in the order a description lists them, for a
 * configuration numbered from nothing, `numbering.ts`. Refuses a year whose Year picker offers a leap year.
 */
export function touchFixedScreenTemplates(year: number, tour: boolean): TemplateScreen<FixedScreenFont>[] {
  return fixedScreens(year, tour);
}

/**
 * The hit page each page of the twenty three is touched through, by its name in `hitpages.ts`' table, per screen in
 * the order a description lists them, for a configuration numbered from nothing, `todo-compile-one.md` 7.1.4: code 9's
 * message; Options' three rows, and its second page's two where it keeps the tour's rows; Screen Sensitivity's five
 * buttons; a confirmation's message over OK; the Year's three rows; a picker's page by how many of the six buttons
 * it fills, six, four, two or one; a blank screen's page of no area. Each page's hit page on all sixteen English
 * compiles of skin 54, `test/touchnumbering.test.ts`, section 431.
 */
export function touchFixedHitPages(year: number, tour: boolean): string[][] {
  const filled: Readonly<Record<number, string>> = { 6: 'six buttons', 4: 'four buttons', 2: 'two buttons', 1: 'one button' };
  return fixedScreens(year, tour).map((screen) => {
    if (screen.name === 'LCD Module Failed') return ['message'];
    if (screen.name === 'Options') return tour ? ['three rows', 'two rows'] : ['three rows'];
    if (screen.name === 'Screen Sensitivity') return ['sensitivity'];
    if (screen.name.startsWith('Sensitivity ')) return ['confirmation'];
    if (screen.name === 'Year') return ['three rows'];
    if (screen.name.startsWith('Blank ')) return ['blank'];
    // A picker's page binds a press per button it fills and Back.
    return screen.pages.map((page) => {
      const name = filled[page.list.length - 1];
      if (name === undefined) throw new ScreenRecordError(`${screen.name} has a page of ${page.list.length - 1} buttons, which no hit page is`);
      return name;
    });
  });
}

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
      // Its one picture, or the fill a background made one is, section 425.
      const drawn = chromeProgram[0]?.opcode;
      const bare = first.length === 2 && chromeProgram.length === 3 && (drawn === SCREEN_DRAW_IMAGE || drawn === SCREEN_FILL);
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

export interface TouchFixedScreensSpec extends TemplateScreensSpec<FixedScreenFont> {
  /** The build year, which the Year picker offers with the year either side. */
  year: number;
  /**
   * Whether Options holds the Remote Assistant's and the Tutorial's rows, on two pages as Logitech's compiles do,
   * or is the one page our configurations hold without the tour and the assistant, `todo-compile-one.md` 4.10.
   */
  tour: boolean;
}

export interface TouchFixedScreensDescribed extends Omit<TemplateScreensDescribed<FixedScreenFont>, 'spec'> {
  spec: TouchFixedScreensSpec;
}

/**
 * Read off a configuration what a composer would supply for these screens, and where Logitech's sat:
 * `describeTemplateScreens` over the twenty three of the configuration's build year, at the modes
 * `touchFixedScreenModes` finds. Refuses a screen whose tags, instructions, lists or programs are not this
 * module's shape, or a font that two places of one role disagree on. `layout` is `takeApart(c)`; `read` is
 * where every value is taken from.
 */
export function describeTouchFixedScreens(
  c: Container, layout: ContainerLayout, read?: ValueReader,
): TouchFixedScreensDescribed {
  const year = Number(c.builtAt?.slice(0, 4));
  if (!Number.isInteger(year)) throw new ScreenRecordError('the configuration states no build year');
  // The year first, as before Options' form was read: a year these screens are not built for is the first
  // refusal, ahead of what the screens look like.
  assertFixedScreensYear(year);
  const modes = touchFixedScreenModes(c);
  const tour = optionsForm(c, modes);
  const d = describeTemplateScreens(c, layout, fixedScreens(year, tour), modes, FIXED_SCREEN_FONTS, read);
  return { ...d, spec: { ...d.spec, year, tour } };
}

/**
 * Which Options a configuration holds, by its page count: two pages with the Remote Assistant's and the Tutorial's
 * rows, as Logitech's compiles hold it, or one without them, ours, `optionsScreen`. Refuses any other count.
 */
function optionsForm(c: Container, modes: readonly number[]): boolean {
  const pages = (modeRecords(c) ?? [])[modes[TOUCH_FIXED_SCREENS.indexOf('Options')] as number]?.pages.length;
  if (pages !== 1 && pages !== 2) throw new ScreenRecordError(`Options has ${pages} pages, where it has two with the tour's rows and one without`);
  return pages === 2;
}

// ---------------------------------------------------------------------------------------------------------
// The builder.

export type BuiltTouchFixedScreens = BuiltTemplateScreens;

/**
 * The screens built from a description, `buildTemplateScreens` over the twenty three of the description's
 * build year: in mode order, since the programs are laid out in that order and the first program to draw a
 * text holds it inline. Everything but the description's numbers is generated.
 */
export function buildTouchFixedScreens(c: Container, spec: TouchFixedScreensSpec): BuiltTouchFixedScreens {
  return buildTemplateScreens(c, spec, fixedScreens(spec.year, spec.tour));
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

// ---------------------------------------------------------------------------------------------------------
// Options without the tour's rows.

/**
 * The configuration with Options in its form without the Remote Assistant's and the Tutorial's rows, our form,
 * `todo-compile-one.md` 4.10, findings section 421: one page of "Date and Time", the screen sounds' row and "Screen
 * Sensitivity", numbered from the Options the configuration holds. A configuration holding that form already is
 * returned as it is.
 *
 * 1. **Numbered from Logitech's form**, `carriedNumbers`: every number of the one page is the one its role, or the
 *    same step, holds on the two, so the rows run the lists, enter the modes and look up the value maps they did, and
 *    the hit page is the first page's, whose three whole width buttons and left key are the one page's too.
 * 2. **The second page taken out**, `dropModePages`: its record, list, copy and the programs only it reaches. The
 *    lists the dropped rows ran are left in base slot 10 for the caller to drop, the Tutorial's leading on to the
 *    tour's "Welcome!" among them.
 * 3. **The one page built and put in place of the first**, read with a template of that page alone; its pictures
 *    are the chrome's and the row button's that page draws.
 *
 * Refused where Options does not read as Logitech's form, where its row pictures are not one button, and wherever
 * a step's own check refuses.
 */
export function withTouchOptionsWithoutTour(c: Container): Container {
  const d = describeTouchFixedScreens(c, takeApart(c));
  if (!d.spec.tour) return c;
  const s = TOUCH_FIXED_SCREENS.indexOf('Options');
  const held = d.spec.screens[s] as TouchFixedScreensSpec['screens'][number];
  const from = optionsScreen(true);
  const to = optionsScreen(false);
  const numbers = carriedNumbers(from, held.numbers, to);

  const one = dropModePages(c, held.mode, 1);
  const layout = takeApart(one);
  const firstPage: FixedScreen = { ...from, pages: [from.pages[0] as FixedPage] };
  const d1 = describeTemplateScreens(one, layout, [firstPage], [held.mode], ['title', 'count', 'wide', 'key'] as FixedScreenFont[]);
  const read = d1.spec.screens[0] as TouchFixedScreensSpec['screens'][number];
  // Each picture by where it is drawn: the screen's and a row button per row, which differ by row on every compile
  // read (the Year picker draws the same three).
  const byPlace = new Map<string, PieceTarget>();
  templatePicturePlaces(firstPage).forEach(({ x, y }, k) => {
    const target = read.pictures[k] as PieceTarget;
    const was = byPlace.get(`${x},${y}`);
    if (was !== undefined && (was.to !== target.to || was.offset !== target.offset)) {
      throw new ScreenRecordError(`Options draws two pictures at ${x}, ${y}`);
    }
    byPlace.set(`${x},${y}`, target);
  });
  const pictures = templatePicturePlaces(to).map(({ x, y }) => {
    const target = byPlace.get(`${x},${y}`);
    if (target === undefined) throw new ScreenRecordError(`Options draws no picture at ${x}, ${y} to carry`);
    return target;
  });
  const built = buildTemplateScreens(one, {
    fonts: d.spec.fonts, homes: d1.spec.homes,
    screens: [{ mode: held.mode, leads: [held.leads[0] as number], pictures, numbers }],
  }, [to]);
  // The lists the one page runs: the first page's where it ran them, and the second page's read where they sit.
  const reading = recordReading(one, layout, blobReader(one));
  const lists = new Map<number, ContainerPiece>();
  const lengths = new Map(d1.place.lengths);
  for (const index of built.lists.keys()) {
    const had = d1.place.lists.get(index);
    if (had !== undefined) {
      lists.set(index, had);
      continue;
    }
    const { piece } = reading.list(index, 'Options');
    lists.set(index, piece);
    lengths.set(piece, reading.lengths.get(piece) as number);
  }
  return layOutContainer(withModeRecords(layout, built, { screens: d1.place.screens, lists, lengths, inline: d1.place.inline })).container;
}
