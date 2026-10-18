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
 * question breaks into lines (`wrapLines` at 171 pixels), every place, which text is inline, and the records.
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
 * English only; skin 54 and the European skin 59. The Harmony One alone, the touch family's; the Harmony 600,
 * 650 and 700 are the four slot family, whose help is postponed (`todo-later.md` 3.3) and not built anywhere.
 * Read only towards hardware: the result is pieces.
 */
import type { Container } from '../../gspm.ts';
import type { ContainerLayout } from '../../frame.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import { modeRecords, taggedList } from '../../sections.ts';
import { SCREEN_CALL, SCREEN_SELECT_FONT, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, type ScreenInstruction, screenProgram } from '../../screen.ts';
import { characterMap, decode } from '../../text.ts';
import { ScreenRecordError, assertRebuilt, withModeRecords } from '../../screenrecords.ts';
import { type ValueReader, blobReader, textGlyphs } from '../../shared/spelling.ts';
import {
  ARROWS, type BuiltTemplateScreens, CLICK, ENTER, type Entry, HEADER, LIST, MAP, type Part, type Step, TAG_ENTER,
  TAG_HEADER, TAG_LEAVE, TIMER_CANCEL, TIMER_START, TITLE_AT, type TemplateScreen, type TemplateScreensDescribed,
  type TemplateScreensSpec, buildTemplateScreens, centred, centredBlock, chrome, describeTemplateScreens, font as fontPart, k,
  leftHalf, owns, picture, press, rightHalf, wrapped,
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
const ATTEMPT_LINES = ['Keep the remote pointed to', 'your system.'];
const FIXED = 'Did that fix the problem?';
const IF_NOT = [FIXED, '', 'If not, the remote will ask you', 'questions to help correct the', 'problem.'];

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

/** A question's own key map: the arrows swallowed, its handlers, Help's value map, and the header handler. */
function questionOwn(enter: Step, leave: Step): Entry[] {
  return [...ARROWS, [TAG_ENTER, enter], [TAG_LEAVE, leave], [HELP_KEY, MAP], [TAG_HEADER, HEADER]];
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

/** A question about a device, wrapped as its name makes it. */
const asked = (words: string): HelpPart[] => [wrapped(words, QUESTION_WIDTH, QUESTION_CENTRE, LINE_PITCH)];

/** The handlers most questions bind: a timer and two of the remote's lists each. */
const ENTER_PLAIN = owns(TIMER_START, LIST, LIST);
const LEAVE_PLAIN = owns(TIMER_CANCEL, LIST, LIST);
/** A touch area's list: the click, then what it runs. */
const tap = (...steps: Step[]): Step => owns(CLICK, ...steps);
const GO_TO = tap(ENTER);
const LEAVE_HELP = tap(MAP);

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
 * The template's screens for a chain asking about `devices`, in the order a description lists them: the attempt
 * screen, the "If not" question, then per device its first question, the question after a resend, the first
 * question again, and its "Did that fix the problem?". With no device, the attempt screen and "Nothing to do".
 */
export function helpScreens(devices: readonly HelpDevice[]): HelpScreen[] {
  const attemptParts: HelpPart[] = [{ op: 'chrome' }, font('body'), centred(ATTEMPT_LINE, ATTEMPT_Y),
    ...centredBlock(ATTEMPT_LINES, ATTEMPT_CENTRE, LINE_PITCH), picture(...ATTEMPT_PICTURE)];
  const attempt = (enter: Step, leave: Step): HelpScreen => ({
    name: 'Help Attempt',
    own: [...ARROWS, [TAG_ENTER, enter], [TAG_LEAVE, leave], [TAG_HEADER, HEADER]],
    chrome: chrome<HelpScreenFont>(HELP_TITLE, 1, { title: 'title', count: 'title' }),
    pages: [{ list: [], parts: attemptParts }],
  });
  // No device: nothing to resend and no question to ask, so the attempt screen starts two timers on entering
  // and cancels one, bound directly, on leaving; "Nothing to do" is the other screen, which the first of those
  // timers enters after three seconds through a list of the configuration's (`07 FFFB`, one of the remote's
  // lists, the enter), neither built here. `harvest_one_families_1` alone, one compile.
  if (devices.length === 0) {
    return [attempt(owns(TIMER_START, TIMER_START), TIMER_CANCEL), {
      name: 'Help Nothing To Do',
      own: questionOwn(owns(TIMER_START, LIST), owns(TIMER_CANCEL, LIST)),
      chrome: chrome<HelpScreenFont>(HELP_TITLE, 1, { title: 'title', count: 'title' }),
      pages: [{
        list: [[YES, LEAVE_HELP]],
        parts: [{ op: 'chrome' }, font('body'), ...centredBlock([NOTHING_LINE], QUESTION_CENTRE, LINE_PITCH), font('ok'),
          rightHalf('OK', KEYS_Y), picture(...QUESTION_PICTURE)],
      }],
    }];
  }
  const n = devices.length;
  const lists = (count: number): Step[] => Array<Step>(count).fill(LIST);
  const resent = devices.reduce((sum, one) => sum + (one.resend ? one.offLists : 0), 0);
  // A chain none of whose devices is sent unasked has no "If not" question: the attempt screen sends nothing and a
  // timer goes on to the first device, as with no device at all. Only the Dutch compile shows it, by the blind
  // reviewer of section 415, so it is refused rather than built in a shape no English compile holds.
  if (resent === 0) throw new ScreenRecordError('a chain whose devices are none sent unasked holds no "If not" question, a shape no English compile shows');
  return [
    // The power off lists of every device resent unasked, in the chain's order, then the "If not" question entered.
    attempt(owns(SEVEN, ...lists(resent), ENTER, TIMER_START), owns(LIST, TIMER_CANCEL)),
    question('Help If Not', questionOwn(owns(LIST, LIST, TIMER_START, LIST, LIST), owns(SEVEN, LIST, TIMER_CANCEL, LIST, LIST)),
      tap(SEVEN, LIST, ENTER), LEAVE_HELP, centredBlock(IF_NOT, QUESTION_CENTRE, LINE_PITCH)),
    ...devices.flatMap(({ name, resend, offLists }, i) => {
      const last = i === n - 1;
      // Every first question runs a second pair of the remote's lists before the timer, as "If not" does; a device
      // resent unasked is resent again as its first question comes up, its lists between the two pairs. No
      // resends them on every question.
      const first = owns(LIST, LIST, ...(resend ? lists(offLists) : []), TIMER_START, LIST, LIST);
      const sendAgain = tap(...lists(offLists), ENTER);
      return [
        question(`Help ${i + 1} Is Off`, questionOwn(first, LEAVE_PLAIN), sendAgain, last ? LEAVE_HELP : GO_TO, asked(`Is the ${name} off?`)),
        question(`Help ${i + 1} Now Off`, questionOwn(ENTER_PLAIN, LEAVE_PLAIN), sendAgain, GO_TO, asked(`Now is the ${name} off?`)),
        question(`Help ${i + 1} Is Off Again`, questionOwn(ENTER_PLAIN, LEAVE_PLAIN), sendAgain, GO_TO, asked(`Is the ${name} off?`)),
        question(`Help ${i + 1} Fixed`, questionOwn(ENTER_PLAIN, LEAVE_PLAIN), last ? LEAVE_HELP : GO_TO, LEAVE_HELP,
          centredBlock([FIXED], QUESTION_CENTRE, LINE_PITCH)),
      ];
    }),
  ];
}

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
    const first = words(program)[0];
    if (first === ATTEMPT_LINE) attempt = [...attempt, mode];
    if (first === NOTHING_LINE) nothing = [...nothing, mode];
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
  const whole = lines.reduce((sum, line) => (sum === '' ? line : sum + (sum.endsWith('-') ? '' : ' ') + line), '');
  const found = /^Is the (.+) off\?$/.exec(whole);
  if (found === null) throw new ScreenRecordError(`mode ${mode} asks '${whole}', not whether a device is off`);
  return found[1] as string;
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

export interface TouchHelpScreensDescribed extends Omit<TemplateScreensDescribed<HelpScreenFont>, 'spec'> {
  spec: TouchHelpScreensSpec;
}

/**
 * Read off a configuration what a composer would supply for the power off help: the devices' names off their
 * first questions, then `describeTemplateScreens` at the modes `touchHelpScreenModes` finds, against the template
 * those names make. `layout` is `takeApart(c)`; `read` is where every value is taken from, so a caller can blind
 * every byte the description does not read, the names' glyph codes among what it reads.
 */
export function describeTouchHelpScreens(c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c)): TouchHelpScreensDescribed {
  const { modes, firsts } = touchHelpScreenModes(c);
  const named = new Set<number>();
  const devices = firsts.map(({ mode, resend, offLists }): HelpDevice => ({ name: nameOf(c, mode, read, named), resend, offLists }));
  const d = describeTemplateScreens(c, layout, helpScreens(devices), modes, HELP_SCREEN_FONTS, read);
  for (const at of named) d.described.add(at);
  return { ...d, spec: { ...d.spec, devices } };
}

export type BuiltTouchHelpScreens = BuiltTemplateScreens;

/** The screens built from a description, in mode order; everything but the description's numbers and names is generated. */
export function buildTouchHelpScreens(c: Container, spec: TouchHelpScreensSpec): BuiltTouchHelpScreens {
  return buildTemplateScreens(c, spec, helpScreens(spec.devices));
}

/** A layout with these screens swapped for the built ones, where the configuration's sat. */
export function withTouchHelpScreens(
  layout: ContainerLayout, built: BuiltTouchHelpScreens, place: TouchHelpScreensDescribed['place'],
): ContainerLayout {
  return withModeRecords(layout, built, place);
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
