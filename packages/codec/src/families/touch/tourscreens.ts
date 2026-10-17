/**
 * The Harmony One's welcome tour and Remote Assistant built whole from a description: `todo-compile-one.md`
 * 4.4.4.2, findings section 412, the way `fixedscreens.ts` built the twenty three of section 411 and through the
 * same engine, `screentemplate.ts`.
 *
 * **The welcome tour is eleven screens**, each one page drawing a picture, a few lines of text left aligned at
 * x 10 and "Exit" at 142, 202, with a chrome that is one rectangle over the whole screen (opcode 1, 176 by 220)
 * and a return. The right arrow (scan 47) and the left (scan 46) step through them, the Activities, Help and Off
 * keys (scans 34, 38 and 37) go on where a screen asks for them, and the touch areas its hit page names go on or
 * leave the tour. Its first screen in the order a person sees it is "Welcome!", which Options' Tutorial row
 * enters on the sixteen English compiles of skin 54, and which the Remote Assistant's second "Ensure all your
 * devices are off" leads on to on 12 of the 18 compiles that keep the assistant, section 403.
 *
 * **The Remote Assistant is five screens**, titled "PowerOff:" by section 411's chrome and drawing "Remote
 * Assistant:" over a question or a statement centred on the screen, with "OK", or "Yes" and "No", centred on
 * the halves below it: the welcome, "Ensure all your devices are off" twice (once as the start's ladder enters
 * it, once after the welcome), "Do you want to hide the Remote Assistant?" and "To hide the remote assistant,
 * use the software ...". The welcome's OK writes the assistant's variable 1 and Yes on the question writes it 3,
 * section 403's two values; the variable is a number the configuration chose.
 *
 * **Which screens a configuration gets is the wiring's to say**, section 410: the start's ladder on the
 * assistant's variable, `TouchWiringSettings.startupAssistant`, is on 18 of Logitech's 19 compiles, and the one
 * without it, the everyday One's `one_config`, holds none of the five and still holds the tour. So the five are
 * described and built exactly when the wiring keeps the ladder, and the tour always. **The start choice of
 * section 403 does not take them out**: `withoutStartupAssistant` starts the variable at 3, so the remote
 * starts past the assistant, but the ladder still enters the welcome at 1 and "Ensure all your devices are off"
 * at 2, and the configuration writes those values from Options' "Turn Remote Assistant On" value map, the
 * leftover entry's scan 34 press and, on fourteen compiles, the activities' own assistant screens; the leftover
 * entry's events 1 and 5 run the ladder. So the configuration still holds a path to the five, and they are built;
 * what raises those two events is not read, and the path was not seen on a remote. Leaving them out would need
 * the wiring without its ladder, as `one_config` is.
 *
 * **One shape each once the numbering is set aside**, measured on the sixteen English compiles of skin 54 and
 * the two European ones: every tag, opcode and constant operand, every list's length, every word, its font
 * role and its place, and the pictures' places are the same. What differs is the configuration's numbering:
 * the mode each screen is, the base slot 10 index of every list, the modes an `0x7E` enters, the timers, the
 * base slot 11 programs, the assistant's variable, the fonts, the pictures and the hit pages; and whether a
 * text is drawn inline or by reference, `screentemplate.ts`' rule in mode order.
 *
 * **Where text goes**: the tour's lines at x 10, its margin; "Is the TV on?" centred on the screen; "Exit" ending
 * at x 163; "Display" and "Aspect" centred on their picture's two buttons, the tour's "Yes" and "No" on the two
 * halves of theirs; "Watch TV" at a constant 69. The assistant's lines centred on the screen, `floor((176 - w) /
 * 2)`, twelve apart in a block centred on y 111, and its keys' words on the halves, "Yes" on the left and "OK" and
 * "No" on the right, section 411's rules. The tour's y are measured constants.
 *
 * **What is not built**: the lists these screens' own lists call, which stay the configuration's and are named
 * by index, among them the tour's enter and leave lists' callees and the lists the assistant's buttons run.
 *
 * English only; skin 54 and the European skin 59, whose tour and assistant are skin 54's. Read only towards
 * hardware: the result is pieces.
 */
import type { Container } from '../../gspm.ts';
import type { ContainerLayout } from '../../frame.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import { modeRecords } from '../../sections.ts';
import { SCREEN_CALL, screenProgram } from '../../screen.ts';
import { characterMap, decode } from '../../text.ts';
import { ScreenRecordError, assertRebuilt, withModeRecords } from '../../screenrecords.ts';
import { type ValueReader, textGlyphs } from '../../shared/spelling.ts';
import {
  ARROWS, type BuiltTemplateScreens, CLICK, ENTER, type Entry, HEADER, LIST, type Part, SCREEN_WIDTH, SWALLOW, type Step,
  TAG_ENTER, TAG_HEADER, TAG_LEAVE, TIMER_CANCEL, TIMER_START, TITLE_AT, type TemplateScreen, type TemplateScreensDescribed,
  type TemplateScreensSpec, buildTemplateScreens, centred, chrome, describeTemplateScreens, font as fontPart, leftHalf,
  owns, picture, press, rightHalf, text, write,
} from './screentemplate.ts';
import { describeTouchWiring } from './wiring.ts';

/** The fonts the screens select, by what they draw; each is a number the configuration chose. */
export type TourScreenFont = 'tour' | 'tourTitle' | 'tourButton' | 'tourLabel' | 'tourExit' | 'title' | 'body' | 'ok';
/** The tour's: its lines, "Welcome!", "Watch TV", the small labels "Display", "Aspect", "Yes" and "No", and "Exit". */
export const TOUR_FONTS: readonly TourScreenFont[] = ['tour', 'tourTitle', 'tourButton', 'tourLabel', 'tourExit'];
/** The Remote Assistant's: its chrome's title, its lines, and the words of the keys below the screen. */
export const ASSISTANT_FONTS: readonly TourScreenFont[] = ['title', 'body', 'ok'];

type TourPart = Part<TourScreenFont>;
type TourScreen = TemplateScreen<TourScreenFont>;
const font = (which: TourScreenFont): TourPart => fontPart(which);

// ---------------------------------------------------------------------------------------------------------
// The welcome tour.

/** The tour's lines start at x 10, on every line of the eleven screens. */
const MARGIN = 10;
/** The tour's chrome: a rectangle over the whole screen, opcode 1 with constant operands, and a return. */
const TOUR_CHROME: readonly TourPart[] = [{ op: 'constant', opcode: 1, operands: [0, 0, SCREEN_WIDTH, 220, 0, 0] }, { op: 'return' }];
/**
 * "Exit", the key below the screen's right, ending at x 163: 142 for its 21 pixels in English, and the blind
 * reviewer of section 412 found the Dutch compile's "Afsluiten", 53 wide, at 110, which tells the rule from a constant.
 */
const EXIT: readonly TourPart[] = [font('tourExit'), text('Exit', { endAt: 163 }, 202)];
/** The tour's lines, each at the margin, at the y given. */
const lines = (...rows: readonly (readonly [string, number])[]): TourPart[] =>
  [font('tour'), ...rows.map(([word, y]) => text(word, MARGIN, y))];
/** An arrow that turns the page: the click, the screen it enters, and the empty instruction. */
const ARROW = owns(CLICK, ENTER, SWALLOW);
/** The enter and leave handlers of most tour screens: two lists of the configuration's each. */
const TWO_LISTS = owns(LIST, LIST);
/** The tour's Activities, Off and Help keys, scans 34, 37 and 38. */
const ACTIVITIES = press(34);
const OFF = press(37);
const HELP = press(38);

/**
 * A tour screen: what its right arrow and left arrow do (a page turn or swallowed), its enter and leave
 * handlers, the other keys it binds, its page list and its page's parts after the chrome's call.
 */
function tour(
  name: string, right: Step, left: Step, keys: readonly Entry[], list: readonly Entry[], parts: readonly TourPart[],
  handlers: Step = TWO_LISTS,
): TourScreen {
  return {
    name,
    own: [[press(47), right], [press(46), left], [TAG_ENTER, handlers], [TAG_LEAVE, handlers], ...keys],
    chrome: TOUR_CHROME,
    pages: [{ list, parts: [{ op: 'chrome' }, ...parts] }],
  };
}

/** The tour's touch areas, scans 48 to 52, as the hit page of each screen names them. */
const touch = press;
/** A touch that leaves the tour, the click and a list of the configuration's. */
const LEAVE_TOUR = owns(CLICK, LIST);
/** A touch that goes on, the click and the screen it enters. */
const GO_ON = owns(CLICK, ENTER);

/**
 * The eleven, in the order a description lists them, which is the order their modes are laid out in on every
 * compile measured. A person meets them as "Welcome!", the arrows, the Harmony remote, Watch TV, selecting it,
 * the display, another activity, the Help button, Help asks, the Off button and "It's that easy!".
 */
const TOUR: readonly TourScreen[] = [
  tour('Another Activity', ARROW, ARROW, [[ACTIVITIES, ENTER], [HELP, CLICK]],
    [[touch(50), LEAVE_TOUR], [touch(49), ENTER]],
    [picture(3, 118), ...lines(['To select another Activity,', 39], ['simply press the Activities', 50], ['button.', 61],
      ['Press the right arrow to', 83], ['continue.', 94]), ...EXIT]),
  tour('Help Button', SWALLOW, ARROW, [[HELP, ENTER]],
    [[touch(50), LEAVE_TOUR], [touch(49), ENTER]],
    [picture(8, 115), ...lines(['Use the Help button if your', 45], ['Activity doesn\'t start', 56], ['properly.', 67],
      ['Press Help now.', 89]), ...EXIT]),
  tour('Selecting Watch TV', ARROW, ARROW, [[HELP, CLICK]],
    [[touch(50), LEAVE_TOUR], [touch(49), ENTER]],
    [picture(30, 123), ...lines(['Selecting the Watch TV', 32], ['Activity turns on the', 43], ['devices you use to watch', 54],
      ['TV.', 65], ['Press the right arrow to', 87], ['continue.', 98]), ...EXIT]),
  tour('Display', ARROW, ARROW, [[HELP, CLICK]],
    [[touch(51), ENTER], [touch(52), LEAVE_TOUR]],
    // The two words centred on the picture's two 81 pixel buttons at x 6 and 89, "Display" of odd width.
    [picture(7, 133), font('tourLabel'), text('Display', { in: [6, 81] }, 149), text('Aspect', { in: [89, 81] }, 149),
      ...lines(['Look on the screen for', 43], ['functions you can\'t find', 54], ['elsewhere on the remote.', 65],
        ['Press the right arrow to', 87], ['continue.', 98]), ...EXIT]),
  // The one screen that draws "Exit" first, and whose question is centred rather than at the margin.
  tour('Help Asks', ARROW, ARROW, [[HELP, CLICK]],
    [[touch(50), ENTER], [touch(48), LEAVE_TOUR]],
    [...EXIT, picture(21, 100), ...lines(['Help asks you questions to', 32], ['get your Activity back on', 43],
      ['track. Press the right', 54], ['arrow to continue.', 65]), centred('Is the TV on?', 135),
    // "Yes" and "No" centred on the two halves of the 133 pixel picture at x 21, [21, 87) and [88, 154): "Yes" of
    // odd width, and the Dutch "Ja" and "Nee" at 47 and 110 by the same rule, the blind reviewer's.
    font('tourLabel'), text('Yes', { in: [21, 66] }, 168), text('No', { in: [88, 66] }, 168)]),
  tour('Activities', SWALLOW, ARROW, [[ACTIVITIES, ENTER], [HELP, CLICK]],
    [[touch(50), LEAVE_TOUR], [touch(49), ENTER]],
    [picture(3, 118), ...lines(['The Harmony remote uses', 25], ['Activities to give you', 36], ['simple one-touch control', 47],
      ['of your entertainment', 58], ['system.', 69], ['Press the Activities button', 91], ['now.', 102]), ...EXIT]),
  tour('Watch TV', SWALLOW, ARROW, [[HELP, CLICK]],
    [[touch(50), ENTER], [touch(51), LEAVE_TOUR], [touch(48), GO_ON], [touch(49), GO_ON]],
    [picture(7, 135), font('tourButton'), text('Watch TV', 69, 151),
      ...lines(['Activities are what you', 33], ['actually do with your', 44], ['entertainment system, like', 55],
        ['watch TV or listen to', 66], ['music.', 77], ['Touch Watch TV now.', 99]), ...EXIT]),
  // The tour's start: its enter and leave handlers are one list of the configuration's each, bound directly.
  tour('Welcome', ARROW, SWALLOW, [[HELP, CLICK]],
    [[touch(50), GO_ON], [touch(51), ENTER], [touch(48), GO_ON], [touch(49), ENTER], [touch(52), LEAVE_TOUR]],
    [picture(65, 137), font('tourTitle'), text('Welcome!', MARGIN, 13),
      ...lines(['Welcome to your', 56], ['Harmony One touch-', 67], ['screen remote. Touch', 78], ['the screen to learn', 89],
        ['more.', 100]), ...EXIT], LIST),
  tour('Arrows', ARROW, ARROW, [[HELP, CLICK]],
    [[touch(50), LEAVE_TOUR], [touch(49), ENTER]],
    [picture(7, 106), ...lines(['Use the arrow buttons on', 35], ['the sides of this screen to', 46], ['move between pages.', 57],
      ['Press the right arrow now.', 79]), ...EXIT]),
  tour('Off Button', SWALLOW, ARROW, [[HELP, CLICK], [OFF, ENTER]],
    [[touch(50), LEAVE_TOUR], [touch(49), ENTER]],
    [picture(7, 15), ...lines(['To turn off your', 107], ['entertainment system,', 118], ['press the Off button.', 129],
      ['Press the Off button to', 151], ['continue.', 162]), ...EXIT]),
  tour('Easy', SWALLOW, ARROW, [[HELP, CLICK]],
    [[touch(50), LEAVE_TOUR]],
    [picture(68, 148), ...lines(['It\'s that easy!', 34], ['You can now enjoy your', 56], ['entertainment system', 67],
      ['with one-touch Activity', 78], ['control.', 89], ['Press Exit now.', 111]), ...EXIT]),
];

/** What each tour screen draws first in the tour's font, which is how `touchTourScreenModes` finds it. */
const TOUR_FIRST_LINES: readonly string[] = ['To select another Activity,', 'Use the Help button if your', 'Selecting the Watch TV',
  'Look on the screen for', 'Help asks you questions to', 'The Harmony remote uses', 'Activities are what you', 'Welcome to your',
  'Use the arrow buttons on', 'To turn off your', 'It\'s that easy!'];

// ---------------------------------------------------------------------------------------------------------
// The Remote Assistant.

/** The assistant's chrome's title, drawn twice as section 411's chromes draw theirs. */
const ASSISTANT_TITLE = 'PowerOff:';
/** What every assistant screen draws first under its title. */
const ASSISTANT_HEAD = 'Remote Assistant:';
/** The y of the words of the keys below the screen. */
const KEYS_Y = 201;
/** The assistant's lines: twelve apart, the block centred on y 111. */
const LINE_PITCH = 12;
const BLOCK_CENTRE = 111;

/**
 * An assistant screen: its handlers, a timer and lists of the configuration's; the other keys it binds; its
 * page list; and its lines, "Remote Assistant:" first, centred on the screen twelve pixels apart as a block
 * centred on y 111, so n lines start at `117 - 6n` (on all five, and on the Dutch compile's blocks of 4, 5, 6 and
 * 8 lines by the blind reviewer of section 412); then its keys' words.
 */
function assistant(
  name: string, handlerLists: number, keys: readonly Entry[], list: readonly Entry[], rows: readonly string[],
  below: readonly TourPart[],
): TourScreen {
  const lists = Array<Step>(handlerLists).fill(LIST);
  const top = BLOCK_CENTRE + LINE_PITCH / 2 - (LINE_PITCH / 2) * (rows.length + 1);
  return {
    name,
    own: [...ARROWS, [TAG_ENTER, owns(TIMER_START, ...lists)], [TAG_LEAVE, owns(TIMER_CANCEL, ...lists)], ...keys,
      [TAG_HEADER, HEADER]],
    chrome: chrome<TourScreenFont>(ASSISTANT_TITLE, 1, { title: 'title', count: 'title' }),
    pages: [{
      list,
      parts: [{ op: 'chrome' }, font('body'), ...[ASSISTANT_HEAD, ...rows].map((row, r) => centred(row, top + LINE_PITCH * r)),
        font('ok'), ...below],
    }],
  };
}

const OK: readonly TourPart[] = [rightHalf('OK', KEYS_Y)];
const DEVICES_OFF = ['Ensure all your devices are', 'off.  If any devices are still on,', 'press "Help" now.'];

/**
 * The five, in the order a description lists them. "Devices Off" is the one the start's ladder enters, whose OK
 * enters the question; "Devices Off Again" is the one the welcome's OK enters, whose OK runs a list of the
 * configuration's that goes on to the tour's "Welcome!", section 403.
 */
const ASSISTANT: readonly TourScreen[] = [
  assistant('Hide Question', 2, [],
    [[touch(50), owns(CLICK, LIST)], [touch(49), owns(CLICK, write(3), LIST, ENTER)]],
    ['Do you want to hide the', 'Remote Assistant?'], [leftHalf('Yes', KEYS_Y), rightHalf('No', KEYS_Y)]),
  assistant('Hidden', 1, [],
    [[touch(49), owns(CLICK, LIST)]],
    ['To hide the remote assistant,', 'use the software to update', 'the display settings for your', 'remote.'], OK),
  assistant('Welcome', 1, [[press(34), write(1)]],
    [[touch(49), owns(CLICK, write(1), ENTER)]],
    ['Welcome to your remote.'], OK),
  assistant('Devices Off', 1, [],
    [[touch(49), owns(CLICK, ENTER)]],
    DEVICES_OFF, OK),
  assistant('Devices Off Again', 1, [],
    [[touch(49), owns(CLICK, LIST)]],
    DEVICES_OFF, OK),
];

/** The screens' names, in the order a description lists them: the tour's eleven, then the assistant's five. */
export const TOUCH_TOUR_SCREENS: readonly string[] = TOUR.map((one) => `Tour ${one.name}`);
export const TOUCH_ASSISTANT_SCREENS: readonly string[] = ASSISTANT.map((one) => `Assistant ${one.name}`);

/** The template's screens for a configuration with or without the Remote Assistant. */
function tourScreens(withAssistant: boolean): TourScreen[] {
  const name = (prefix: string) => (one: TourScreen): TourScreen => ({ ...one, name: `${prefix} ${one.name}` });
  return [...TOUR.map(name('Tour')), ...(withAssistant ? ASSISTANT.map(name('Assistant')) : [])];
}

// ---------------------------------------------------------------------------------------------------------
// Which mode each screen is.

/**
 * The mode each screen is, and whether the configuration keeps the Remote Assistant. The tour's screens are
 * found by look: one page, a chrome that is opcode 1 and a return, and the first line in the tour's font. The
 * assistant's by its chrome's title "PowerOff:" at 6, 4 and the line after "Remote Assistant:"; its two
 * "Devices Off" screens told apart by the wiring, whose ladder names the one it enters, `assistantDevicesOff`,
 * and the welcome checked against the wiring's `assistantWelcome`. Whether the assistant is there at all is the
 * wiring's `startupAssistant`, and a configuration whose wiring keeps no assistant and still holds one of its
 * screens is refused, as is one holding a screen other than once.
 */
export function touchTourScreenModes(c: Container, layout: ContainerLayout = takeApart(c)): { modes: number[]; assistant: boolean } {
  const map = characterMap(c);
  if (map === undefined) throw new ScreenRecordError('the configuration draws no text this can read');
  const wiring = describeTouchWiring(layout);
  const withAssistant = wiring.settings.startupAssistant;
  const words = (address: number): string[] => (screenProgram(c, address) ?? []).flatMap((one) => {
    const glyphs = textGlyphs(c, one);
    return glyphs === undefined ? [] : [decode(glyphs, map)];
  });
  const found = new Map<string, number[]>();
  const add = (name: string, mode: number): void => { found.set(name, [...(found.get(name) ?? []), mode]); };
  (modeRecords(c) ?? []).forEach((record, mode) => {
    if (record.pages.length !== 1) return;
    const program = (record.pages[0] as { program: number }).program;
    const call = (screenProgram(c, program) ?? []).find((one) => one.opcode === SCREEN_CALL);
    const chromeProgram = call === undefined ? undefined : screenProgram(c, call.targets[0] as number);
    if (chromeProgram === undefined) return;
    const page = words(program);
    if (chromeProgram.length === 3 && chromeProgram[0]?.opcode === 1) {
      const at = TOUR_FIRST_LINES.findIndex((line) => page.includes(line));
      if (at >= 0) add(TOUCH_TOUR_SCREENS[at] as string, mode);
      return;
    }
    const titled = chromeProgram.find((one) => one.operands[0] === TITLE_AT[0] && one.operands[1] === TITLE_AT[1]);
    if (titled === undefined || words(call?.targets[0] as number)[0] !== ASSISTANT_TITLE || page[0] !== ASSISTANT_HEAD) return;
    const line = page[1];
    if (line === 'Do you want to hide the') add('Assistant Hide Question', mode);
    else if (line === 'To hide the remote assistant,') add('Assistant Hidden', mode);
    else if (line === 'Welcome to your remote.') add('Assistant Welcome', mode);
    else if (line === DEVICES_OFF[0]) add(mode === wiring.modes['assistantDevicesOff'] ? 'Assistant Devices Off' : 'Assistant Devices Off Again', mode);
  });
  if (!withAssistant) {
    const held = TOUCH_ASSISTANT_SCREENS.filter((name) => found.has(name));
    if (held.length > 0) throw new ScreenRecordError(`the wiring keeps no Remote Assistant and the configuration holds ${held.join(', ')}`);
  }
  const names = [...TOUCH_TOUR_SCREENS, ...(withAssistant ? TOUCH_ASSISTANT_SCREENS : [])];
  const modes = names.map((name) => {
    const at = found.get(name) ?? [];
    if (at.length !== 1) throw new ScreenRecordError(`the configuration holds ${at.length} screens of the look of ${name}, not one`);
    return at[0] as number;
  });
  if (withAssistant && modes[names.indexOf('Assistant Welcome')] !== wiring.modes['assistantWelcome']) {
    throw new ScreenRecordError('the Remote Assistant\'s welcome is not the screen the wiring\'s ladder enters');
  }
  return { modes, assistant: withAssistant };
}

// ---------------------------------------------------------------------------------------------------------
// The description, the builder and the check.

export interface TouchTourScreensSpec extends TemplateScreensSpec<TourScreenFont> {
  /** Whether the Remote Assistant's five are described and built after the tour's eleven: the wiring's ladder. */
  assistant: boolean;
}

export interface TouchTourScreensDescribed extends Omit<TemplateScreensDescribed<TourScreenFont>, 'spec'> {
  spec: TouchTourScreensSpec;
}

/**
 * Read off a configuration what a composer would supply for the tour and, where its wiring keeps one, the
 * Remote Assistant: `describeTemplateScreens` at the modes `touchTourScreenModes` finds. `layout` is
 * `takeApart(c)`; `read` is where every value is taken from.
 */
export function describeTouchTourScreens(c: Container, layout: ContainerLayout, read?: ValueReader): TouchTourScreensDescribed {
  const { modes, assistant } = touchTourScreenModes(c, layout);
  const roles = [...TOUR_FONTS, ...(assistant ? ASSISTANT_FONTS : [])];
  const d = describeTemplateScreens(c, layout, tourScreens(assistant), modes, roles, read);
  return { ...d, spec: { ...d.spec, assistant } };
}

export type BuiltTouchTourScreens = BuiltTemplateScreens;

/** The screens built from a description, in mode order; everything but the description's numbers is generated. */
export function buildTouchTourScreens(c: Container, spec: TouchTourScreensSpec): BuiltTouchTourScreens {
  return buildTemplateScreens(c, spec, tourScreens(spec.assistant));
}

/** A layout with these screens swapped for the built ones, where the configuration's sat. */
export function withTouchTourScreens(
  layout: ContainerLayout, built: BuiltTouchTourScreens, place: TouchTourScreensDescribed['place'],
): ContainerLayout {
  return withModeRecords(layout, built, place);
}

/** Describe, build and put back, and compare every byte with the configuration's. */
export function checkTouchTourScreens(c: Container, read?: ValueReader): { screens: number; lists: number; described: number; structure: number } {
  const layout = takeApart(c);
  const described = describeTouchTourScreens(c, layout, read);
  const built = buildTouchTourScreens(c, described.spec);
  assertRebuilt(layOutContainer(withTouchTourScreens(layout, built, described.place)).bytes, c, described.regions);
  return { screens: built.screens.length, lists: built.lists.size, described: described.described.size, structure: described.structure.size };
}
