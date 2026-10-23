/**
 * The Harmony One's power off help built whole from a description: `todo-compile-one.md` 4.6, findings section
 * 415, through the template engine of sections 411 to 414, `screentemplate.ts`.
 *
 * **What it is, for a person holding the remote.** Pressing Help while nothing is on (the remote's "PowerOff"
 * state, which titles every one of these screens) runs Logitech's power off help: "Attemping to fix the
 * problem..." (Logitech's spelling) while it sends again the power off command of every device it sends unasked
 * (a device whose power is discrete, not a toggle, but for the PS3: section 415), then "Did that fix the problem? If
 * not, the remote will ask you questions to help correct the problem." and, on No, one device at a time: "Is the
 * Denon AVR-X4800H off?"; No sends that device's power off again and asks "Now is the Denon AVR-X4800H off?", and
 * No there sends it again and asks the first question again, until Yes; Yes goes on to "Did that fix the
 * problem?", whose No goes on to the next device. Yes on any "Did that fix the problem?" leaves help. An activity's
 * own help, titled with the activity's name and asking whether each device is on and set to its input, is the same
 * kind of screen and is not built here.
 *
 * **The screens, per configuration of n devices in the chain**, measured on the eighteen English compiles: the
 * attempt screen, the "If not" question, and per device four, its first question ("Is"), the question after a
 * resend ("Now is"), the first question again after a second resend ("Is" again), and its "Did that fix the
 * problem?"; 4n + 2 screens. **With no device to turn off** (`harvest_one_families_1`, the one compile whose
 * household holds none) two screens: the attempt screen, its enter handler two timers and its leave one bound
 * directly, and "Nothing to do", which the first of those timers enters after three seconds. The test setup's donor,
 * `harvest_one_two_devices`, holds two: ten screens, the "four generic ones" `todo-compile-one.md` 3.2.1 listed
 * being the attempt, the "If not" and the two devices' "Did that fix the problem?", which go with the devices.
 *
 * **Which screen goes where is the configuration's numbering**, the modes each screen's lists enter, and the
 * description carries it as the tour's does; what the template states is which kind of list each touch area and
 * handler runs, and that varies only at the chain's end: the last device's first question leaves help on Yes
 * where the others go on to the next device's, and its "Did that fix the problem?" leaves on No as well.
 *
 * **What the description carries**: the devices the chain asks about, in its order, by the name each question
 * draws (read off each device's first question, the one description value that is words); per screen its mode,
 * its hit page and its picture; every list index (the screen's own lists and the device's power off list and the
 * remote's own lists they call), the timers, the value map Help and Yes run, the base slot 11 programs, the
 * modes the lists enter, and the three fonts. **What is generated**: every opcode and constant operand, the tags
 * and their order, every list of the screens' own, every word (the questions from the device names), how a
 * question breaks into lines (`wrapLines` at 171 pixels), every place, which text is inline, the records, and since
 * `todo-compile-one.md` 7.1.6 the hit page each kind of screen is touched through, the attempt screen's, every
 * question's and "Nothing to do"'s, `HELP_HIT_PARTS`, at the index the description reads, section 429.
 *
 * **Where text goes**, every text of the 4n + 2 on the eighteen: the title "PowerOff" at 6, 4 (section 411's
 * chrome); the questions centred on the screen, `floor((176 - w) / 2)`, twelve apart in a block centred on y 143
 * (the "If not" question as a block of five with its second row blank); "Yes" and "No" centred on the left and
 * right halves at y 201; the attempt screen's first line centred at y 43 and its other two as a block centred
 * on y 168, the status screens' place.
 *
 * **What is not built**: the lists these screens' own lists call (the devices' power off lists and five of the
 * remote's own on every compile with a device, which stay the configuration's and are named by index), the value
 * map, the timer that enters "Nothing to do" and its list, and what enters the attempt screen, a queued `0x7E` in
 * a value map's case for value 0 (`todo-compile-one.md` 6.6).
 *
 * **On the composed path since `todo-compile-one.md` 3.2.2.4**, `builders.ts`, through `withTouchHelpChain`: the
 * chain the donor holds, rebuilt, and four questions for every device the composers added that has a power
 * variable, numbered from the chain's own screens by the role each number plays (`named`, `helpNumbering`). Every
 * block of text is wrapped at the questions' 171 pixels, `block`, which leaves Logitech's lines where they are and
 * breaks the attempt line, which our letters make wider; the attempt screen's other words and the "If not" question
 * are each one paragraph flowed by the same wrap.
 *
 * English only; skin 54 and the European skin 59. The Harmony One alone, the touch family's; the Harmony 600,
 * 650 and 700 are the four slot family, whose help is postponed (`todo-later.md` 3.3) and not built anywhere.
 * Read only towards hardware: the result is pieces.
 */
import type { Container } from '../../gspm.ts';
import type { ContainerLayout, ContainerPiece } from '../../frame.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import { parse } from '../../gspm.ts';
import { modeRecords, stateRecords, taggedList } from '../../sections.ts';
import {
  SCREEN_CALL, SCREEN_END, SCREEN_RETURN, SCREEN_SELECT_FONT, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, type ScreenInstruction, screenProgram,
} from '../../screen.ts';
import { characterMap, decode } from '../../text.ts';
import { type BuiltScreen, type ModeRecordsPlace, ScreenRecordError, assertRebuilt, recordReading, withModeRecords } from '../../screenrecords.ts';
import { type ValueReader, blobReader, textGlyphs } from '../../shared/spelling.ts';
import { TOUCH_AREA_LENGTH, touchPages } from '../../tables.ts';
import { deviceVariables } from '../../inventory.ts';
import { appendActionLists } from '../../shared/core.ts';
import { appendMode } from '../../shared/modes.ts';
import type { ComposedDeviceNote } from '../family.ts';
import {
  HELP_HIT_PARTS, type HitPart, type TouchHitPagesPlace, hitPageAreasOf, hitPageRunOf, touchHitPagesPlace, withTouchHitPages,
} from './hitpages.ts';
import {
  ARROWS, type BuiltTemplateScreens, CLICK, ENTER, type Entry, HEADER, LIST, MAP, type Part, type Step, TAG_ENTER,
  TAG_HEADER, TAG_LEAVE, TIMER_CANCEL, TIMER_START, TITLE_AT, type TemplateScreen, type TemplateScreensDescribed,
  type TemplateScreensSpec, buildTemplateScreens, chrome, describeTemplateScreens, font as fontPart, k,
  joinLines, leftHalf, named, owns, picture, press, rightHalf, templateNumberSlots, wrapped,
} from './screentemplate.ts';

/** The fonts the screens select: the chrome's title, the questions and lines, and "Yes" and "No". */
export type HelpScreenFont = 'title' | 'body' | 'ok';
export const HELP_SCREEN_FONTS: readonly HelpScreenFont[] = ['title', 'body', 'ok'];

type HelpPart = Part<HelpScreenFont>;
type HelpScreen = TemplateScreen<HelpScreenFont>;
const font = (which: HelpScreenFont): HelpPart => fontPart(which);

/** The chrome's title on every one of these screens: the name of the state Help is pressed in. */
export const HELP_TITLE = 'PowerOff';
/** The attempt screen's first line, as Logitech spells it, which is how `touchHelpScreenModes` finds it. */
export const ATTEMPT_LINE = 'Attemping to fix the problem...';
/**
 * The attempt screen's other words and the "If not" question's, each **one paragraph** wrapped at 171 pixels as a
 * question is, `block`, rather than the lines Logitech drew: the greedy wrap of each paragraph in Logitech's letters
 * gives exactly Logitech's lines on all eighteen English compiles ("Keep the remote pointed to" over "your system.",
 * and "If not, the remote will ask you" over "questions to help correct the" over "problem."), so the compiles
 * rebuild byte for byte, and in letters of other widths the paragraph flows again rather than leaving a word alone
 * on a line, as wrapping each of Logitech's lines did in ours until `todo-compile-one.md` 3.2.2.4 was revised.
 */
const ATTEMPT_TEXT = 'Keep the remote pointed to your system.';
const FIXED = 'Did that fix the problem?';
const IF_NOT_TEXT = 'If not, the remote will ask you questions to help correct the problem.';
const IF_NOT = [FIXED, '', IF_NOT_TEXT];

/** The widest a question's line is drawn, `wrapLines`' measurement. */
export const QUESTION_WIDTH = 171;
/** The questions' block is centred on y 143, the lines twelve apart. */
const QUESTION_CENTRE = 143;
const LINE_PITCH = 12;
/** The attempt screen's: its first line's y, and the block its other two make, centred on y 168. */
const ATTEMPT_Y = 43;
const ATTEMPT_CENTRE = 168;
/** "Yes" and "No", the words of the two touch areas below the question. */
const KEYS_Y = 201;
/** The picture under a question, and under the attempt screen's lines. */
const QUESTION_PICTURE = [57, 67] as const;
const ATTEMPT_PICTURE = [57, 95] as const;

/** The touch areas the questions bind, scan 50 for No (the resend) and 49 for Yes (go on). */
export const NO = press(50);
export const YES = press(49);
/** The Help key, scan 38, which runs the value map on every question. */
const HELP_KEY = press(38);
/** Opcode 7 with `0xFFFB`, a constant instruction the attempt and "If not" screens run, as the wiring's start ladder does. */
const SEVEN = k(7, 0xfffb);

/*
 * **Every number the template takes from the configuration carries a role**, `named`, so the screens a composed
 * device needs can be numbered from the ones the configuration holds, `todo-compile-one.md` 3.2.2.4: the reader
 * and the builder ignore roles, and `helpNumbering` reads each role's value off the chain as described and gives
 * it to the new screens. The roles are what section 415's numbers turned out to be on the test setup's donor:
 * the same two of the remote's lists open every enter handler after the timer, or before it and again after it,
 * the same two close every leave handler, one list follows `07 FFFB` wherever it runs, one timer serves the
 * questions and another the attempt screen, and one value map leaves help. That each role holds one value
 * throughout a chain is checked on every English compile, `touchhelpscreens.test.ts`, and refused where not.
 */
const ENTER_1 = named(LIST, 'enter list 1');
const ENTER_2 = named(LIST, 'enter list 2');
const LEAVE_1 = named(LIST, 'leave list 1');
const LEAVE_2 = named(LIST, 'leave list 2');
const SEVEN_LIST = named(LIST, 'seven list');
const QUESTION_START = named(TIMER_START, 'question timer');
const QUESTION_CANCEL = named(TIMER_CANCEL, 'question timer');
const ATTEMPT_START = named(TIMER_START, 'attempt timer');
const ATTEMPT_CANCEL = named(TIMER_CANCEL, 'attempt timer');
const LEAVES = named(MAP, 'map');
/** The enter of the screen named `screen`, whose mode is that screen's. */
const to = (screen: string): Step => named(ENTER, `mode ${screen}`);
/** Device `i`'s power off lists, `count` of them, in its order. */
const offLists = (i: number, count: number): Step[] => Array.from({ length: count }, (_, k) => named(LIST, `off ${i} ${k}`));

/** A question's own key map: the arrows swallowed, its handlers, Help's value map, and the header handler. */
function questionOwn(enter: Step, leave: Step): Entry[] {
  return [...ARROWS, [TAG_ENTER, enter], [TAG_LEAVE, leave], [HELP_KEY, LEAVES], [TAG_HEADER, HEADER]];
}

/** A question screen: its chrome titled "PowerOff", its words above the picture, "Yes" and "No" below it. */
function question(name: string, own: readonly Entry[], no: Step, yes: Step, words: readonly HelpPart[]): HelpScreen {
  return {
    name,
    own,
    // The chrome's count font is never selected on a screen of one page, so the title role stands in for it.
    chrome: chrome<HelpScreenFont>(HELP_TITLE, 1, { title: 'title', count: 'title' }),
    pages: [{
      list: [[NO, no], [YES, yes]],
      parts: [{ op: 'chrome' }, font('body'), ...words, font('ok'), leftHalf('Yes', KEYS_Y), rightHalf('No', KEYS_Y),
        picture(...QUESTION_PICTURE)],
    }],
  };
}

/**
 * Rows of a block centred on y `centre`, each wrapped at the questions' width, `wrapped`: a question about a
 * device, wrapped as its name makes it, and since `todo-compile-one.md` 3.2.2.4 every other block of these
 * screens, each paragraph of them one row. In Logitech's letters the wrap gives Logitech's own lines on all eighteen
 * English compiles, the attempt line one line at 170, so the compiles rebuild byte for byte; in ours the attempt
 * line is 177 and breaks in two, where it would otherwise start off the screen, and the "If not" paragraph flows
 * onto its three lines at other breaks. A decision of ours, not a reading: no compile shows a fixed line wrapped
 * other than as Logitech drew it.
 */
const block = (rows: string | readonly string[], centre: number = QUESTION_CENTRE): HelpPart => wrapped(rows, QUESTION_WIDTH, centre, LINE_PITCH);
const asked = (words: string): HelpPart[] => [block(words)];

/** The handlers most questions bind: a timer and two of the remote's lists each. */
const ENTER_PLAIN = owns(QUESTION_START, ENTER_1, ENTER_2);
const LEAVE_PLAIN = owns(QUESTION_CANCEL, LEAVE_1, LEAVE_2);
/** A touch area's list: the click, then what it runs. */
const tap = (...steps: Step[]): Step => owns(CLICK, ...steps);
const LEAVE_HELP = tap(LEAVES);

/**
 * A device the chain asks about: the name its questions draw, and whether its power off command is sent without
 * asking, by the attempt screen and again as its first question comes up. A device whose power off is not resent
 * unasked (`calibration_one`'s Panasonic Blu-ray Player among them) is resent only on No. Which devices those are
 * is the configuration's, read off its lists, section 415: over the 80 chain entries of the eighteen English
 * compiles, the 34 whose power is a toggle (the same code on and off) are not resent, the 39 discrete ones are,
 * and the PS3, discrete, is not, on the seven compiles that hold it. A composer would derive it from the device.
 */
export interface HelpDevice {
  name: string;
  resend: boolean;
  /**
   * How many lists the device's power off is sent as: one on 79 of the 80 chain entries of the eighteen English
   * compiles, two on `compiled_protocols_2`'s Samsung DVD. Each is a list of the configuration's, named by index.
   */
  offLists: number;
}

/** The screen a household with no device to turn off gets beside the attempt screen, `harvest_one_families_1`. */
export const NOTHING_LINE = 'Nothing to do';

/**
 * Every row of these screens whose words are the template's own, a line or a paragraph, every one but the questions
 * about a device: what the questions' wrap at 171 pixels breaks, `block`, into Logitech's own lines in Logitech's
 * letters on all eighteen English compiles and into lines of its own in ours.
 */
export const HELP_FIXED_ROWS: readonly string[] = [ATTEMPT_LINE, ATTEMPT_TEXT, FIXED, IF_NOT_TEXT, NOTHING_LINE];

/**
 * The template's screens for a chain asking about `devices`, in the order a description lists them: the attempt
 * screen, the "If not" question, then per device its first question, the question after a resend, the first
 * question again, and its "Did that fix the problem?". With no device, the attempt screen and "Nothing to do".
 */
export function helpScreens(devices: readonly HelpDevice[]): HelpScreen[] {
  // The first line a block of its own centred on y 43, so in our letters it breaks into two lines around it.
  const attemptParts: HelpPart[] = [{ op: 'chrome' }, font('body'), block([ATTEMPT_LINE], ATTEMPT_Y),
    block([ATTEMPT_TEXT], ATTEMPT_CENTRE), picture(...ATTEMPT_PICTURE)];
  const attempt = (enter: Step, leave: Step): HelpScreen => ({
    name: ATTEMPT_SCREEN,
    own: [...ARROWS, [TAG_ENTER, enter], [TAG_LEAVE, leave], [TAG_HEADER, HEADER]],
    chrome: chrome<HelpScreenFont>(HELP_TITLE, 1, { title: 'title', count: 'title' }),
    pages: [{ list: [], parts: attemptParts }],
  });
  // No device: nothing to resend and no question to ask, so the attempt screen starts two timers on entering
  // and cancels one, bound directly, on leaving; "Nothing to do" is the other screen, which the first of those
  // timers enters after three seconds through a list of the configuration's (`07 FFFB`, one of the remote's
  // lists, the enter), neither built here. `harvest_one_families_1` alone, one compile.
  if (devices.length === 0) {
    // The roles, `todo-compile-one.md` 7.1.4: the three second timer first, then the attempt screen's own; "Nothing to do"
    // starts the questions' timer and lights channel 7, and switches it off through the off list the other screens build.
    return [attempt(owns(named(TIMER_START, 'three second timer'), ATTEMPT_START), ATTEMPT_CANCEL), {
      name: NOTHING_SCREEN,
      own: questionOwn(owns(QUESTION_START, named(LIST, 'light 7 on')), owns(QUESTION_CANCEL, named(LIST, 'light 7 off'))),
      chrome: chrome<HelpScreenFont>(HELP_TITLE, 1, { title: 'title', count: 'title' }),
      pages: [{
        list: [[YES, LEAVE_HELP]],
        parts: [{ op: 'chrome' }, font('body'), block([NOTHING_LINE]), font('ok'),
          rightHalf('OK', KEYS_Y), picture(...QUESTION_PICTURE)],
      }],
    }];
  }
  const n = devices.length;
  const resent = devices.reduce((sum, one) => sum + (one.resend ? one.offLists : 0), 0);
  // A chain none of whose devices is sent unasked has no "If not" question: the attempt screen sends nothing and a
  // timer goes on to the first device, as with no device at all. Only the Dutch compile shows it, by the blind
  // reviewer of section 415, so it is refused rather than built in a shape no English compile holds.
  if (resent === 0) throw new ScreenRecordError('a chain whose devices are none sent unasked holds no "If not" question, a shape no English compile shows');
  const names = devices.map((_, i) => helpScreenNames(i));
  return [
    // The power off lists of every device resent unasked, in the chain's order, then the "If not" question entered.
    attempt(owns(SEVEN, ...devices.flatMap((one, i) => (one.resend ? offLists(i, one.offLists) : [])), to(IF_NOT_SCREEN), ATTEMPT_START),
      owns(SEVEN_LIST, ATTEMPT_CANCEL)),
    question(IF_NOT_SCREEN, questionOwn(owns(ENTER_1, ENTER_2, QUESTION_START, ENTER_1, ENTER_2), owns(SEVEN, SEVEN_LIST, QUESTION_CANCEL, LEAVE_1, LEAVE_2)),
      tap(SEVEN, SEVEN_LIST, to(names[0]!.first)), LEAVE_HELP, [block(IF_NOT)]),
    ...devices.flatMap(({ name, resend, offLists: count }, i) => {
      const own = names[i] as HelpScreenNames;
      // The device after this one's first question, or leaving help after the last.
      const next = i === n - 1 ? LEAVE_HELP : tap(to((names[i + 1] as HelpScreenNames).first));
      // Every first question runs a second pair of the remote's lists before the timer, as "If not" does; a device
      // resent unasked is resent again as its first question comes up, its lists between the two pairs. No
      // resends them on every question and goes on to the screen after.
      const first = owns(ENTER_1, ENTER_2, ...(resend ? offLists(i, count) : []), QUESTION_START, ENTER_1, ENTER_2);
      const sendAgain = (screen: string): Step => tap(...offLists(i, count), to(screen));
      const fixed = tap(to(own.fixed));
      return [
        question(own.first, questionOwn(first, LEAVE_PLAIN), sendAgain(own.now), next, asked(`Is the ${name} off?`)),
        question(own.now, questionOwn(ENTER_PLAIN, LEAVE_PLAIN), sendAgain(own.again), fixed, asked(`Now is the ${name} off?`)),
        question(own.again, questionOwn(ENTER_PLAIN, LEAVE_PLAIN), sendAgain(own.now), fixed, asked(`Is the ${name} off?`)),
        question(own.fixed, questionOwn(ENTER_PLAIN, LEAVE_PLAIN), next, LEAVE_HELP, [block([FIXED])]),
      ];
    }),
  ];
}

/** The "If not" question's name, which its mode's role is named by. */
const IF_NOT_SCREEN = 'Help If Not';
/** The attempt screen's and "Nothing to do"'s names, which also say which hit page each is touched through. */
const ATTEMPT_SCREEN = 'Help Attempt';
const NOTHING_SCREEN = 'Help Nothing To Do';

/** A device's four screens' names, in the order `helpScreens` lists them, by its place in the chain. */
interface HelpScreenNames { first: string; now: string; again: string; fixed: string }
const helpScreenNames = (i: number): HelpScreenNames => ({
  first: `Help ${i + 1} Is Off`, now: `Help ${i + 1} Now Off`, again: `Help ${i + 1} Is Off Again`, fixed: `Help ${i + 1} Fixed`,
});

// ---------------------------------------------------------------------------------------------------------
// Which mode each screen is.

/** The modes of a chain, in `helpScreens`' order, and per device the mode of its first question. */
export interface HelpChain {
  modes: number[];
  /**
   * Per device in the chain's order: the mode of its first question, which its name is read off, and whether
   * that question's enter list resends the power off list its No resends, `HelpDevice.resend`.
   */
  firsts: { mode: number; resend: boolean; offLists: number }[];
}

/**
 * The mode each screen is, found the way the configuration links them. The attempt screen by look: the one page
 * screen whose chrome is titled "PowerOff" at 6, 4 and whose page first draws "Attemping to fix the problem...".
 * Then by the lists: the attempt screen's enter list enters the "If not" question; its No enters the first
 * device's first question; a first question's No the question after a resend, whose No enters the first question
 * again and whose Yes the device's "Did that fix the problem?"; and that one's No, or the first question's Yes,
 * the next device's first question, until both run the value map. Refused: no attempt screen or two, a link that
 * is not a list holding one entering, a screen reached twice, or a screen titled "PowerOff" left out of the chain.
 */
export function touchHelpScreenModes(c: Container): HelpChain {
  const map = characterMap(c);
  if (map === undefined) throw new ScreenRecordError('the configuration draws no text this can read');
  const records = modeRecords(c) ?? [];
  const lists = c.actionLists() ?? [];
  const words = (address: number): string[] => (screenProgram(c, address) ?? []).flatMap((one) => {
    const glyphs = textGlyphs(c, one);
    return glyphs === undefined ? [] : [decode(glyphs, map)];
  });
  // The one page screens titled "PowerOff" by their chrome, as section 411's chromes draw a title.
  const titled = new Set<number>();
  let attempt: number[] = [];
  let nothing: number[] = [];
  records.forEach((record, mode) => {
    if (record.pages.length !== 1) return;
    const program = (record.pages[0] as { program: number }).program;
    const call = (screenProgram(c, program) ?? []).find((one) => one.opcode === SCREEN_CALL);
    if (call === undefined) return;
    const title = (screenProgram(c, call.targets[0] as number) ?? []).find((one) => textGlyphs(c, one) !== undefined);
    if (title === undefined || title.operands[0] !== TITLE_AT[0] || title.operands[1] !== TITLE_AT[1]) return;
    if (decode(textGlyphs(c, title) as Uint8Array, map) !== HELP_TITLE) return;
    titled.add(mode);
    // The first line or lines: the attempt line is one line in Logitech's letters and two in ours, `block`.
    const drawn = words(program);
    if (opensWith(drawn, ATTEMPT_LINE)) attempt = [...attempt, mode];
    if (opensWith(drawn, NOTHING_LINE)) nothing = [...nothing, mode];
  });
  if (attempt.length !== 1) throw new ScreenRecordError(`the configuration holds ${attempt.length} power off attempt screens, not one`);
  const start = attempt[0] as number;

  // The list a binding calls, or a refusal.
  const called = (entry: { opcode: number; operand: number } | undefined, what: string) => {
    if (entry === undefined || entry.opcode !== 0x7f) throw new ScreenRecordError(`${what} calls no list`);
    const list = lists[entry.operand];
    if (list === undefined) throw new ScreenRecordError(`${what} calls list ${entry.operand}, which is not there`);
    return list;
  };
  // Where a mode's touch area goes: the mode its list enters, or undefined where it runs the value map instead.
  const target = (mode: number, tag: number): number | undefined => {
    const page = records[mode]?.pages[0];
    const entry = page === undefined ? undefined : taggedList(c, page.list)?.entries.find((one) => one.tag === tag);
    const list = called(entry, `mode ${mode}'s touch area ${tag.toString(16)}`);
    const enters = list.filter((one) => one.opcode === 0x7e);
    if (enters.length > 1) throw new ScreenRecordError(`mode ${mode}'s touch area ${tag.toString(16)} enters ${enters.length} modes`);
    if (enters.length === 0 && !list.some((one) => one.opcode === MAP_OPCODE)) {
      throw new ScreenRecordError(`mode ${mode}'s touch area ${tag.toString(16)} neither enters a mode nor runs a value map`);
    }
    return enters[0]?.operand;
  };
  const must = (mode: number | undefined, what: string): number => {
    if (mode === undefined) throw new ScreenRecordError(`${what} leaves help where the chain goes on`);
    return mode;
  };

  const enter = (records[start]?.entries ?? []).find((one) => one.tag === TAG_ENTER);
  const into = enter?.opcode === 0x7f ? (lists[enter.operand] ?? []).filter((one) => one.opcode === 0x7e) : [];
  const modes = [start];
  const firsts: HelpChain['firsts'] = [];
  // The enter list of a mode, as its instructions.
  const enterOf = (mode: number) => called((records[mode]?.entries ?? []).find((one) => one.tag === TAG_ENTER), `mode ${mode}'s enter handler`);
  if (into.length === 0) {
    // No device to ask about: the attempt screen and "Nothing to do", found by its look.
    if (nothing.length !== 1) throw new ScreenRecordError(`the power off help asks about no device and holds ${nothing.length} "${NOTHING_LINE}" screens, not one`);
    modes.push(nothing[0] as number);
  } else {
    const ifNot = (into[0] as { operand: number }).operand;
    modes.push(ifNot);
    let next = target(ifNot, NO);
    while (next !== undefined) {
      const first = next;
      const now = must(target(first, NO), `mode ${first}'s No`);
      const again = must(target(now, NO), `mode ${now}'s No`);
      const fixed = must(target(now, YES), `mode ${now}'s Yes`);
      if (target(again, NO) !== now || target(again, YES) !== fixed) {
        throw new ScreenRecordError(`mode ${again} does not go where mode ${now} goes`);
      }
      // The first question's Yes and its "Did that fix the problem?"'s No go on to the same device, or both leave.
      const after = target(first, YES);
      if (target(fixed, NO) !== after) throw new ScreenRecordError(`mode ${fixed}'s No and mode ${first}'s Yes go on to different screens`);
      modes.push(first, now, again, fixed);
      // The power off lists the first question's No resends, and whether its enter list sends them as well.
      const page = records[first]?.pages[0];
      const no = called(page === undefined ? undefined : taggedList(c, page.list)?.entries.find((one) => one.tag === NO), `mode ${first}'s No`);
      const off = no.filter((one) => one.opcode === 0x7f).map((one) => one.operand);
      if (off.length === 0) throw new ScreenRecordError(`mode ${first}'s No resends no list`);
      const sent = enterOf(first).filter((one) => one.opcode === 0x7f).map((one) => one.operand);
      firsts.push({ mode: first, resend: off.every((list) => sent.includes(list)), offLists: off.length });
      if (modes.length > records.length) throw new ScreenRecordError('the power off help goes round in a loop');
      next = after;
    }
  }
  if (new Set(modes).size !== modes.length) throw new ScreenRecordError('the power off help reaches one screen twice');
  const left = [...titled].filter((mode) => !modes.includes(mode));
  if (left.length > 0) throw new ScreenRecordError(`modes ${left.join(', ')} are titled ${HELP_TITLE} and are not in the chain`);
  return { modes, firsts };
}

/** The value map opcode, `MAP`'s. */
const MAP_OPCODE = 0x72;

// ---------------------------------------------------------------------------------------------------------
// The names.

/**
 * The name a device's first question draws, read through `read` so that its glyph codes are the description's:
 * the question's lines in the body font joined (a line after one ending in a hyphen without a space) and "Is the"
 * and "off?" taken off. `at` collects every offset read. Refused where the lines are not that question.
 */
function nameOf(c: Container, mode: number, read: ValueReader, at: Set<number>): string {
  const map = characterMap(c);
  const page = modeRecords(c)?.[mode]?.pages[0];
  if (map === undefined || page === undefined) throw new ScreenRecordError(`mode ${mode} draws no question`);
  const program = screenProgram(c, page.program) ?? [];
  // The question's lines: every text between the first font selected and the second.
  const selects = program.flatMap((one, i) => (one.opcode === SCREEN_SELECT_FONT ? [i] : []));
  const lines = program.slice((selects[0] ?? 0) + 1, selects[1] ?? program.length).map((one) => {
    const glyphs = textGlyphs(c, one);
    if (glyphs === undefined) throw new ScreenRecordError(`mode ${mode}'s question holds an instruction that is not a text`);
    // Where the codes sit: inline after the opcode and the place, or where the reference points.
    const from = one.opcode === SCREEN_TEXT_INLINE ? one.start + 3 : glyphsOffset(c, one);
    const codes = Uint8Array.from(glyphs, (_, j) => {
      at.add(from + j);
      return read(from + j);
    });
    return decode(codes, map);
  });
  const whole = joinLines(lines);
  const found = /^Is the (.+) off\?$/.exec(whole);
  if (found === null) throw new ScreenRecordError(`mode ${mode} asks '${whole}', not whether a device is off`);
  return found[1] as string;
}

/** Whether the first of `drawn`'s lines, one or more, are `text` wrapped. */
function opensWith(drawn: readonly string[], text: string): boolean {
  return drawn.some((_, k) => joinLines(drawn.slice(0, k + 1)) === text);
}

/** The blob offset of the glyph codes a text drawn by reference points at. */
function glyphsOffset(c: Container, one: ScreenInstruction): number {
  if (one.opcode !== SCREEN_TEXT_AT) throw new ScreenRecordError('not a text drawn by reference');
  const o = one.operands;
  const off = c.blobOffsetOf((o[2] as number) | ((o[3] as number) << 8) | ((o[4] as number) << 16));
  if (off === undefined) throw new ScreenRecordError('a text points outside the configuration');
  return off;
}

// ---------------------------------------------------------------------------------------------------------
// The description, the builder and the check.

export interface TouchHelpScreensSpec extends TemplateScreensSpec<HelpScreenFont> {
  /** The devices the chain asks about, in its order: the name its questions draw, and whether it is resent unasked. */
  devices: HelpDevice[];
}

/** Where the screens and the hit pages they name sat: the template engine's place, and the touch map's pages. */
export type TouchHelpScreensPlace = ModeRecordsPlace & { hits: TouchHitPagesPlace };

export interface TouchHelpScreensDescribed extends Omit<TemplateScreensDescribed<HelpScreenFont>, 'spec' | 'place'> {
  spec: TouchHelpScreensSpec;
  place: TouchHelpScreensPlace;
}

/**
 * The hit page a screen of the chain is touched through, `HELP_HIT_PARTS`, by what the screen is: the attempt
 * screen, "Nothing to do", or a question, every other one. `todo-compile-one.md` 7.1.6, findings section 429.
 */
function helpHitParts(screen: HelpScreen): readonly HitPart[] {
  if (screen.name === ATTEMPT_SCREEN) return HELP_HIT_PARTS.attempt;
  if (screen.name === NOTHING_SCREEN) return HELP_HIT_PARTS.nothing;
  return HELP_HIT_PARTS.question;
}

/**
 * Read off a configuration what a composer would supply for the power off help: the devices' names off their
 * first questions, then `describeTemplateScreens` at the modes `touchHelpScreenModes` finds, against the template
 * those names make, and the hit pages the screens name, whose index each screen's page record leads with, the one
 * value of them the description reads. `layout` is `takeApart(c)`; `read` is where every value is taken from, so a
 * caller can blind every byte the description does not read, the names' glyph codes among what it reads.
 */
export function describeTouchHelpScreens(c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c)): TouchHelpScreensDescribed {
  const { modes, firsts } = touchHelpScreenModes(c);
  const named = new Set<number>();
  const devices = firsts.map(({ mode, resend, offLists }): HelpDevice => ({ name: nameOf(c, mode, read, named), resend, offLists }));
  const d = describeTemplateScreens(c, layout, helpScreens(devices), modes, HELP_SCREEN_FONTS, read);
  for (const at of named) d.described.add(at);
  // The hit pages the screens name, by the index each page's record leads with: their areas and headers are this
  // builder's, the table the hit pages builder's, `hitpages.ts`, which builds it over every page.
  const table = touchPages(c);
  if (table === undefined) throw new ScreenRecordError('the configuration has no touch map');
  new Set(d.spec.screens.flatMap((one) => one.leads)).forEach((index) => {
    const page = table.records[index];
    if (page === undefined) throw new ScreenRecordError(`a help screen names hit page ${index} of a table of ${table.records.length}`);
    const from = page.start - TOUCH_AREA_LENGTH * page.areas.length;
    for (let k = from; k < page.start + page.length; k += 1) d.structure.add(k);
    d.regions.push({ from, to: page.start + page.length, what: `a help screen's hit page ${index}` });
  });
  return { ...d, spec: { ...d.spec, devices }, place: { ...d.place, hits: touchHitPagesPlace(c, layout) } };
}

/** The screens built, and each hit page they name as its run, by the index its pages lead with. */
export type BuiltTouchHelpScreens = BuiltTemplateScreens & { hits: Map<number, ContainerPiece[]> };

/**
 * Each hit page `screens` name, built by `HELP_HIT_PARTS` at the index `leads` gives each screen's page. Refuses two
 * screens of other kinds naming one hit page, which would be one page holding two shapes.
 */
function helpHitPages(screens: readonly HelpScreen[], leads: readonly (readonly number[])[]): Map<number, ContainerPiece[]> {
  const hits = new Map<number, ContainerPiece[]>();
  const shapes = new Map<number, readonly HitPart[]>();
  screens.forEach((screen, s) => (leads[s] ?? []).forEach((index) => {
    const parts = helpHitParts(screen);
    const was = shapes.get(index);
    if (was !== undefined && was !== parts) throw new ScreenRecordError(`two help screens of other kinds are both hit page ${index}`);
    if (was !== undefined) return;
    shapes.set(index, parts);
    hits.set(index, hitPageRunOf(hitPageAreasOf(parts, `${screen.name}'s hit page`)));
  }));
  return hits;
}

/** The screens built from a description, in mode order, and their hit pages; everything but the description's numbers and names is generated. */
export function buildTouchHelpScreens(c: Container, spec: TouchHelpScreensSpec): BuiltTouchHelpScreens {
  const screens = helpScreens(spec.devices);
  return { ...buildTemplateScreens(c, spec, screens), hits: helpHitPages(screens, spec.screens.map((one) => one.leads)) };
}

/** A layout with these screens and their hit pages swapped for the built ones, where the configuration's sat. */
export function withTouchHelpScreens(
  layout: ContainerLayout, built: BuiltTouchHelpScreens, place: TouchHelpScreensPlace,
): ContainerLayout {
  // The hit pages first: `withModeRecords` makes every piece afresh, so the hit pages' place, read off `layout`,
  // names pieces only `layout` holds, as `withTouchDeviceLists` does.
  return withModeRecords(withTouchHitPages(layout, { runs: built.hits }, place.hits), built, place);
}

/** Describe, build and put back, and compare every byte with the configuration's. */
export function checkTouchHelpScreens(c: Container, read?: ValueReader): { devices: number; screens: number; lists: number; described: number; structure: number } {
  const layout = takeApart(c);
  const described = describeTouchHelpScreens(c, layout, read);
  const built = buildTouchHelpScreens(c, described.spec);
  assertRebuilt(layOutContainer(withTouchHelpScreens(layout, built, described.place)).bytes, c, described.regions);
  return {
    devices: described.spec.devices.length, screens: built.screens.length, lists: built.lists.size,
    described: described.described.size, structure: described.structure.size,
  };
}

// ---------------------------------------------------------------------------------------------------------
// A composed device's help, `todo-compile-one.md` 3.2.2.4.

/**
 * A chain as a description reads it, numbered by role, `named`: every role's one value (the remote's lists, the
 * timers, the value map, the base slot 11 programs, the modes and the devices' power off lists), and per screen
 * the lists of its own in the order it takes them. The roles are read through `templateNumberSlots`, the
 * builder's own walk, so each of the description's numbers is paired with the step that takes it.
 *
 * Refused: a chain with no device, whose two screens hold no question to number another by, and a role two
 * screens hold different values for, which would leave a new screen two numbers to choose between.
 */
export interface HelpNumbering {
  roles: Map<string, number>;
  own: number[][];
}

export function helpNumbering(d: TouchHelpScreensDescribed): HelpNumbering {
  if (d.spec.devices.length === 0) throw new ScreenRecordError('the power off help asks about no device, so it holds no question a device\'s could be numbered by');
  const roles = new Map<string, number>();
  const own = helpScreens(d.spec.devices).map((screen, s) => {
    const numbers = (d.spec.screens[s] as TouchHelpScreensSpec['screens'][number]).numbers;
    const slots = templateNumberSlots(screen);
    if (slots.length !== numbers.length) throw new ScreenRecordError(`${screen.name} takes ${slots.length} numbers and its description holds ${numbers.length}`);
    const lists: number[] = [];
    slots.forEach((slot, j) => {
      const value = numbers[j] as number;
      if (slot.kind === 'owns') {
        lists.push(value);
        return;
      }
      const role = slot.kind === 'number' ? slot.role : undefined;
      if (role === undefined) throw new ScreenRecordError(`${screen.name}'s number ${j} has no role`);
      const was = roles.get(role);
      if (was !== undefined && was !== value) {
        throw new ScreenRecordError(`${screen.name} holds ${value} as its ${role} where the chain's other screens hold ${was}`);
      }
      roles.set(role, value);
    });
    return lists;
  });
  return { roles, own };
}

/**
 * The numbers each screen of `template` takes, in the order it takes them: a list of its own from `own`, in
 * order, and every other number from `roles`. `helpNumbering`'s other half, so on a chain as described the two
 * give back the description's numbers, which `touchhelpscreens.test.ts` holds on every English compile.
 */
export function numberedHelpScreens(
  template: readonly HelpScreen[], roles: ReadonlyMap<string, number>, own: readonly (readonly number[])[],
): number[][] {
  return template.map((screen, s) => {
    const lists = [...(own[s] ?? [])];
    const numbers = templateNumberSlots(screen).map((slot) => {
      if (slot.kind === 'owns') {
        const one = lists.shift();
        if (one === undefined) throw new ScreenRecordError(`${screen.name} runs more lists of its own than it is given`);
        return one;
      }
      const role = slot.kind === 'number' ? slot.role : undefined;
      const value = role === undefined ? undefined : roles.get(role);
      if (value === undefined) throw new ScreenRecordError(`${screen.name} takes a number, ${role ?? 'with no role'}, the chain does not hold`);
      return value;
    });
    if (lists.length !== 0) throw new ScreenRecordError(`${screen.name} runs fewer lists of its own than it is given`);
    return numbers;
  });
}

/** A device a composer added, as its help asks about it: `HelpDevice`, and the power off lists it resends. */
export interface ComposedHelpDevice extends HelpDevice {
  lists: number[];
}

/** The opcode a transition calls a list by, and a list calls another by. */
const CALL_OPCODE = 0x7f;

/**
 * A device the composers added as the power off help asks about it, or undefined where it is not asked about.
 *
 * * **In the chain or not**: exactly the devices with a power state variable are, on all nineteen compiles,
 *   section 415, so a composed device with none is left out, as Kodi is on eight compiles.
 * * **Its name** is the setup's, which its device list row draws.
 * * **Its power off lists** are read back off the configuration, through the variable `joinPowerOff` put in the
 *   all off list: its transition from on to off runs what the device composer made, the off action's send list,
 *   or for an action of several steps a list calling each step's send list in order (section 320,
 *   `composeDevice`); the lists a question resends are those send lists, as a Logitech compile's resend each
 *   step's own (two on `compiled_protocols_2`'s Samsung DVD).
 * * **Sent unasked or not** by the power type the catalogue states: a discrete device's power off is sent
 *   unasked, a toggle's is not. That is section 415's measured rule, 73 of 80 chain entries over the eighteen
 *   English compiles, **with its exception**: the PS3, discrete, is not sent unasked on any of the seven compiles
 *   holding it, unexplained. Sending a toggle blind could turn a device back on, which is a reason, not a reading.
 *   A device whose catalogue states no type is refused rather than guessed.
 */
export function composedHelpDevice(c: Container, note: ComposedDeviceNote): ComposedHelpDevice | undefined {
  const power = deviceVariables(c).find((one) => one.device === note.label && one.property === 'Power');
  if (power === undefined) return undefined;
  if (note.power === undefined) {
    throw new ScreenRecordError(`the catalogue states no power type for ${note.name}, which is what says whether its power off is sent unasked`);
  }
  const off = stateRecords(c)?.[power.index]?.values.find((one) => one.from === 1 && one.to === 0);
  if (off === undefined || off.opcode !== CALL_OPCODE) throw new ScreenRecordError(`${note.name}'s power variable calls no list switching it off`);
  const body = c.actionLists()?.[off.operand];
  if (body === undefined || body.length === 0) throw new ScreenRecordError(`${note.name}'s power off list ${off.operand} does not read`);
  const lists = body.every((one) => one.opcode === CALL_OPCODE) ? body.map((one) => one.operand) : [off.operand];
  return { name: note.name, resend: note.power === 'discrete', offLists: lists.length, lists };
}

/**
 * The power off help put in place of the configuration's own, asking about every composed device too:
 * `todo-compile-one.md` 3.2.2.4, section 415's "putting it on the path". With no composed device asked about,
 * the chain described, built and put back, as `checkTouchHelpScreens` does without the comparison.
 *
 * **With some**, each gets the four screens a device's questions are, after the chain's own devices, in the
 * order composed: no rule for the chain's order was found, section 415, so **this order is a choice of ours**.
 * The section's lead, that a chain puts every device not sent unasked before every one that is on 16 of 17
 * chains, is not followed: it is a lead, and following it would move the configuration's own devices. Then:
 *
 * 1. **Numbered from the chain**, `helpNumbering`: every number a new screen takes that is not its own list or a
 *    mode or a power off list is the value the configuration's screens hold for that role, the remote's lists,
 *    the timers, the value map and the programs; its modes are the next free ones, in the template's order, its
 *    lists of its own the next free base slot 10 indices, and its hit page and pictures the same screen's of
 *    the chain's last device. The chain's own screens keep every number but where the chain grows: the attempt
 *    screen resends the composed devices sent unasked too, and the last of its own devices goes on to the first
 *    composed one rather than leaving help.
 * 2. **Made room for**, since `withModeRecords` replaces records and adds none: the new lists appended to base
 *    slot 10 as built, and each new screen appended with `appendMode`, its own key map, page list and copy as
 *    built and a stand in program that calls a stand in chrome, so the records have their final shape.
 * 3. **Built and put in place**, the chain's own screens where they sat and the stand ins replaced, as every
 *    builder on the composed path puts its part; the stand ins' places read by `recordReading`, which the
 *    description reads every record by.
 *
 * The value map's case entering the attempt screen stays where it is (`todo-compile-one.md` 6.6): the attempt
 * screen keeps its mode. Refused: a chain with no device, a composed device already asked about by name, and
 * whatever the description, the numbering or the builder refuses.
 */
export function withTouchHelpChain(c: Container, composed: readonly ComposedDeviceNote[] = []): Container {
  const added = composed.flatMap((note) => {
    const one = composedHelpDevice(c, note);
    return one === undefined ? [] : [one];
  });
  const layout = takeApart(c);
  const d = describeTouchHelpScreens(c, layout);
  if (added.length === 0) return layOutContainer(withTouchHelpScreens(layout, buildTouchHelpScreens(c, d.spec), d.place)).container;

  const asked = new Set(d.spec.devices.map((one) => one.name));
  const twice = added.find((one) => asked.has(one.name));
  if (twice !== undefined) throw new ScreenRecordError(`the power off help already asks about ${twice.name}`);
  const { roles, own } = helpNumbering(d);
  const devices: HelpDevice[] = [...d.spec.devices, ...added.map(({ name, resend, offLists }) => ({ name, resend, offLists }))];
  const template = helpScreens(devices);
  // The screens the configuration holds are the template's first ones, the attempt, "If not" and its devices'.
  const held = d.spec.screens.length;
  const firstMode = (modeRecords(c) ?? []).length;
  const firstList = (c.actionLists() ?? []).length;
  const modeOf = (s: number): number => (s < held ? (d.spec.screens[s] as TouchHelpScreensSpec['screens'][number]).mode : firstMode + s - held);
  template.forEach((screen, s) => roles.set(`mode ${screen.name}`, modeOf(s)));
  added.forEach((one, j) => one.lists.forEach((list, k) => roles.set(`off ${d.spec.devices.length + j} ${k}`, list)));
  let nextList = firstList;
  const owned = template.map((screen, s) => (s < held ? own[s] as number[]
    : templateNumberSlots(screen).filter((slot) => slot.kind === 'owns').map(() => nextList++)));
  const numbers = numberedHelpScreens(template, roles, owned);
  // A new screen's hit page and pictures are the same screen's of the chain's last device: the four kinds of
  // question each take one, the same on every device of a chain.
  const referenceOf = (s: number): number => held - 4 + ((s - held) % 4);
  const specOf = (one: TouchHelpScreensDescribed): TouchHelpScreensSpec => ({
    ...one.spec, devices,
    screens: template.map((_, s) => {
      const from = one.spec.screens[s < held ? s : referenceOf(s)] as TouchHelpScreensSpec['screens'][number];
      return { mode: modeOf(s), leads: [...from.leads], pictures: [...from.pictures], numbers: numbers[s] as number[] };
    }),
  });

  // 2. Room: the new lists as built, then each new screen with stand ins for its programs.
  const first = buildTemplateScreens(c, specOf(d), template);
  const fresh = [...first.lists.keys()].filter((index) => index >= firstList).sort((a, b) => a - b);
  if (fresh.length !== nextList - firstList || fresh.some((index, k) => index !== firstList + k)) {
    throw new ScreenRecordError('the new screens\' lists are not the next free indices in order');
  }
  const appended = appendActionLists(c, fresh.map((index) => {
    const bytes = (first.lists.get(index) as ContainerPiece).bytes;
    return Array.from({ length: bytes[0] as number }, (_, k): [number, number] =>
      [(bytes[1 + 3 * k] as number) | ((bytes[2 + 3 * k] as number) << 8), bytes[3 + 3 * k] as number]);
  }));
  if (appended.first !== firstList) throw new ScreenRecordError(`the new lists start at ${appended.first}, not ${firstList}`);
  let grown = parse(appended.bytes);
  for (let s = held; s < template.length; s += 1) {
    const screen = first.screens[s] as BuiltScreen;
    const ownBytes = screen.own.bytes;
    if (ownBytes.length !== 1 + 4 * (ownBytes[0] as number)) throw new ScreenRecordError(`${(template[s] as HelpScreen).name}'s own key map is not in the narrow form`);
    const entries = Array.from({ length: ownBytes[0] as number }, (_, k) => ({
      tag: ownBytes[1 + 4 * k] as number,
      operand: (ownBytes[2 + 4 * k] as number) | ((ownBytes[3 + 4 * k] as number) << 8),
      opcode: ownBytes[4 + 4 * k] as number,
    }));
    grown = appendMode(grown, modeOf(s), entries, [(screen.lists[0] as ContainerPiece).bytes], (_, headAt) => ({
      // The stand in chrome returns at once, and the page calls it and ends, so the record reads as a Harmony One
      // page whose chrome the built one replaces.
      head: { length: 1, build: () => Uint8Array.of(SCREEN_RETURN) },
      pages: [{ length: 5, build: () => Uint8Array.of(SCREEN_CALL, headAt & 0xff, (headAt >> 8) & 0xff, headAt >> 16, SCREEN_END) }],
    }), { copies: [screen.copies[0] as Uint8Array], leads: (specOf(d).screens[s] as TouchHelpScreensSpec['screens'][number]).leads });
  }

  // 3. Built over the grown configuration and put in place: the chain's own screens where the description of the
  // chain as it was finds them, the stand ins where `recordReading` reads them.
  const grownLayout = takeApart(grown);
  const again = describeTouchHelpScreens(grown, grownLayout);
  const built = buildTemplateScreens(grown, specOf(again), template);
  const reading = recordReading(grown, grownLayout, blobReader(grown));
  const stands = template.slice(held).map((screen, j) => reading.placeOf(screen.name, reading.frame(screen.name, firstMode + j)));
  for (const index of fresh) reading.list(index, 'a composed device\'s help');
  const place: ModeRecordsPlace = {
    screens: [...again.place.screens, ...stands],
    lists: new Map([...again.place.lists, ...reading.lists]),
    lengths: new Map([...again.place.lengths, ...reading.lengths]),
    inline: new Map([...again.place.inline, ...reading.inline]),
  };
  // The hit pages the whole chain names, the new screens on their reference screens' pages, built as the chain's own.
  const hits = helpHitPages(template, specOf(again).screens.map((one) => one.leads));
  return layOutContainer(withTouchHelpScreens(grownLayout, { ...built, hits }, { ...place, hits: again.place.hits })).container;
}
