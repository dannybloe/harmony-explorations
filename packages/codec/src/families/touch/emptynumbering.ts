/**
 * A Harmony One built from nothing, numbered: every mode, variable, value map, list and hit page of a configuration
 * with no device and no activity, and from that numbering the description each screen set's builder takes.
 * `todo-compile-one.md` 7.1.4, findings section 432. The touch family's half of what `families/four-slot/empty.ts`
 * numbers for the Harmony 650.
 *
 * **Why.** Every screen builder of the touch family takes a description, and until now every description was read off
 * a Logitech compile, `describeTouch*`. That is the reading half; this module is the other half, the description made
 * from a numbering of our own. `numbering.ts` says what each number a screen takes is, by name; this module decides
 * the value of every name for the empty One and turns the names into each set's numbers. What it decides:
 *
 * * **The modes**, sixty seven, in an order of ours past the forty the remote's own tables fix: the ten firmware screens
 *   at 0 to 9 and the status screens at 10 to 39, code `n` at `10 + n` with code 9's at 19 being the fixed screens'
 *   "LCD Module Failed", which the event map names on all nineteen compiles, `wiring.ts`; then the activity menu, the
 *   idle device list and the list nothing enters, the other twenty two fixed screens in their builder's order, and the
 *   power off help's attempt screen and "Nothing to do", `EMPTY_TOUCH_SCREENS`. Logitech's compiles put the screens
 *   past 39 in other orders.
 * * **The variables**: the firmware's eighteen, the wiring's eighteen, `emptywiring.ts`, then two more the screens
 *   name and the wiring does not. The assistant variable, which USB Connected's leaving list tests whether or not
 *   the configuration holds the Remote Assistant, 0 to 3 and first 0 as on all sixteen; and the Time of Day picker's,
 *   0 to 1 and first 0. Then the clock pickers' variable, which is the configuration's first two byte variable,
 *   `statetables.ts`' `FIRST_WIDE_VARIABLE`, at 38: the state tables put it at the first index past the one byte
 *   ones, on all sixteen compiles, section 432.
 * * **The value maps, the wiring's lists and timers, and the clock header's programs**: `emptyTouchWiring`'s.
 * * **The lists of the screens' own**: from the first index past the wiring's, by `numbering.ts`' rule, in mode order.
 *   The firmware screens' own lists sit at 0 upward, `TOUCH_FIRMWARE_OWN_LISTS`, which their builder generates, so
 *   the wiring starts after them.
 * * **The hit pages**: one per shape, in the order the screens first name them in mode order, which is the order of
 *   first use on all nineteen compiles of Logitech's.
 *
 * **What it does not decide**, since none of it is a number: the fonts, which `EMPTY_TOUCH_FONTS` states as the
 * indices 7.1.1's stated table puts them at, its order `harvest_one_two_devices`'; the pictures, which the caller supplies by the place each screen draws one, since
 * the look is 7.1.2's; and the homes, the texts drawn by reference to a copy elsewhere, none unless given. So
 * `emptyTouchSpecs` takes the pictures and makes the rest.
 *
 * **Not checked on a remote**, `todo-compile-one.md` 7.2: that a remote runs these screens with these numbers. What is
 * checked: each set's numbers, made from names read off a compile, are that compile's own numbers, on all sixteen
 * English compiles of skin 54, `test/touchnumbering.test.ts`.
 *
 * The Harmony One alone, the touch family's. Read only towards hardware: the result is numbers and descriptions.
 */
import type { StateVariableSpec, PieceTarget } from '../../statetables.ts';
import { ScreenRecordError } from '../../screenrecords.ts';
import {
  TOUCH_FIRMWARE_HIT_PAGES, TOUCH_FIRMWARE_OWN_LISTS, TOUCH_FIRMWARE_SCREENS, type TouchFirmwareScreensSpec,
  touchFirmwarePicturePlaces,
} from './firmwarescreens.ts';
import { TOUCH_FIXED_SCREENS, type TouchFixedScreensSpec, touchFixedHitPages, touchFixedScreenTemplates } from './fixedscreens.ts';
import { DISPLAY_TEST_CODE, STATUS_CODES, TOUCH_STATUS_TEMPLATES, type TouchStatusScreensSpec } from './statusscreens.ts';
import { type TouchHelpScreensSpec, helpScreens } from './helpscreens.ts';
import { type TouchActivityMenuSpec, activityMenuScreen } from './activitymenu.ts';
import {
  type DeviceListShape, EMPTY_DEVICE_LISTS, type TouchDeviceListsSpec, deviceListRoles, deviceListScreen, emptyTouchDeviceListsSpec,
} from './devicelists.ts';
import { CLOCK_HEADER_PROGRAMS, type ClockHeaderProgram, type TouchClockHeaderSpec } from './clockheader.ts';
import { TOUCH_HIT_PAGES, type TouchHitPagesSpec } from './hitpages.ts';
import { EMPTY_TOUCH_VALUE_MAPS, type EmptyTouchMode, type EmptyTouchWiring, type EmptyTouchWiringOptions, emptyTouchWiring } from './emptywiring.ts';
import { type ScreenSetForms, type ScreenWalk, type TouchScreenSet, TouchNumbering, screenSetWalks } from './numbering.ts';
import { TOUCH_STATE_TABLES } from './statetables.ts';
import { templatePicturePlaces, type TemplateScreen } from './screentemplate.ts';

// ---------------------------------------------------------------------------------------------------------
// The modes.

/**
 * Every screen of an empty One in mode order, by the keys `emptywiring.ts`' redraw classes use: `firmware:` and the
 * firmware screen's id, `status:` and the code, `fixed:` and the fixed screen's name, the activity menu, the two
 * device lists, and the power off help's two screens.
 */
export const EMPTY_TOUCH_SCREENS: readonly string[] = [
  ...TOUCH_FIRMWARE_SCREENS.map((id) => `firmware:${id}`),
  ...STATUS_CODES.map((code) => (code === DISPLAY_TEST_CODE ? 'fixed:LCD Module Failed' : `status:${code}`)),
  'activity menu', 'idle device list', 'device list',
  ...TOUCH_FIXED_SCREENS.filter((name) => name !== 'LCD Module Failed').map((name) => `fixed:${name}`),
  'help:attempt', 'help:after',
];

/** The modes `emptyTouchWiring` takes, by its names for them, as screen keys here. */
const WIRING_MODES: Readonly<Record<EmptyTouchMode, string>> = {
  'Blank 1': 'fixed:Blank 1', 'Blank 2': 'fixed:Blank 2', 'Blank 3': 'fixed:Blank 3', 'Blank 4': 'fixed:Blank 4',
  'Blank 5': 'fixed:Blank 5', 'Blank 6': 'fixed:Blank 6', 'Blank 7': 'fixed:Blank 7',
  'activity menu': 'activity menu', 'idle device list': 'idle device list', 'help attempt': 'help:attempt', 'help after': 'help:after',
};

/**
 * The timer each blank screen starts on entering, by the wiring's name for it: on all sixteen English compiles of skin
 * 54, section 432. Each is one of the six one second timers or the five second one.
 */
export const BLANK_TIMERS: Readonly<Record<string, string>> = {
  'Blank 1': 'second1', 'Blank 2': 'second0', 'Blank 3': 'second3', 'Blank 4': 'enter5', 'Blank 5': 'second5',
  'Blank 6': 'second2', 'Blank 7': 'second4',
};

// ---------------------------------------------------------------------------------------------------------
// The fonts.

/**
 * Each set's font roles as indices of the stated table, `fontsets.ts`' `TOUCH_FONT_SETS`, whose order is
 * `harvest_one_two_devices`' own: so these are the fonts every builder's description reads off that compile, section
 * 432. Only the roles an empty One's screens select; the activity menu's and the device lists' page counts are not
 * drawn with no row.
 */
export const EMPTY_TOUCH_FONTS = {
  firmware: { body: 0, ok: 1 },
  fixed: { body: 0, ok: 1, title: 2, count: 6, item: 7, key: 8, wide: 11 },
  status: { body: 0, title: 2 },
  help: { body: 0, ok: 1, title: 2 },
  'activity menu': { title: 3, left: 4, right: 5 },
  'device lists': { left: 8, title: 13 },
  clock: { clock: 15 },
} as const;

// ---------------------------------------------------------------------------------------------------------
// The numbering.

export interface EmptyTouchNumberingOptions extends Omit<EmptyTouchWiringOptions, 'modes' | 'firstList'> {
  /** The build year, which the Year picker offers with the year either side. */
  year: number;
  /** A twelve hour clock, as on skin 54, unless given. */
  hours?: 12 | 24;
}

/** One screen of an empty One as its set's builder takes it, every number but its pictures'. */
export interface EmptyTouchScreen {
  /** The key `EMPTY_TOUCH_SCREENS` gives it. */
  key: string;
  mode: number;
  /** Each page's hit page. */
  leads: number[];
  /** Every other number, in the builder's walk order. */
  numbers: number[];
  /** Where it draws each picture the description supplies, in order. */
  places: { x: number; y: number }[];
}

export interface EmptyTouchNumbering {
  /** Each screen's mode by its key, `EMPTY_TOUCH_SCREENS`' order. */
  modes: ReadonlyMap<string, number>;
  /** The wiring, timers, fixed cases and hour list, `emptyTouchWiring`'s. */
  wiring: EmptyTouchWiring;
  /** Every variable after the firmware's in index order, the wiring's and then the screens' two, each by name. */
  variables: readonly (readonly [string, StateVariableSpec])[];
  /** The clock pickers' variable, the first two byte one, past every variable of `variables`. */
  clockPicker: number;
  /** The value of every name the screens take, `numbering.ts`' keys. */
  keys: ReadonlyMap<string, number>;
  /** The forms of the sets' templates: no device, no activity, one page of Options. */
  forms: ScreenSetForms;
  /** Per set, its screens in its description's order. */
  screens: Readonly<Record<Exclude<TouchScreenSet, 'clock'>, EmptyTouchScreen[]>>;
  /** The clock header's two calls' numbers, the minute's and the hour's. */
  clockCalls: number[][];
  /** The clock header's programs' base slot 11 entries. */
  clockEntries: Readonly<Record<ClockHeaderProgram, number>>;
  /**
   * The hit pages by shape, `TOUCH_HIT_PAGES`' names and the sets' own, each with the index it takes in the table,
   * which is the order the screens first name them in mode order.
   */
  hitPages: ReadonlyMap<string, number>;
  /** The first base slot 10 index past every list numbered here. */
  nextList: number;
}

/** A screen's hit page shapes, per page, for the sets whose own builders build theirs. */
const OWN_HIT_PAGES: Readonly<Record<string, string>> = {
  'activity menu': 'activity menu, no row', 'idle device list': 'device list, no row', 'device list': 'device list, no row',
  'help:attempt': 'help attempt', 'help:after': 'help nothing to do',
};

/**
 * The empty One numbered. Refuses a build year whose Year picker offers a leap year, `assertFixedScreensYear`, and
 * anything `emptyTouchWiring` refuses.
 */
export function emptyTouchNumbering(options: EmptyTouchNumberingOptions): EmptyTouchNumbering {
  const hours = options.hours ?? 12;
  const forms: ScreenSetForms = { year: options.year, tour: false, helpDevices: [], activities: [], deviceLists: EMPTY_DEVICE_LISTS, hours };
  const modes = new Map(EMPTY_TOUCH_SCREENS.map((key, mode) => [key, mode]));
  const modeOf = (key: string): number => {
    const mode = modes.get(key);
    if (mode === undefined) throw new ScreenRecordError(`an empty One holds no screen ${key}`);
    return mode;
  };

  const wiring = emptyTouchWiring({
    ...(options.clockEntries === undefined ? {} : { clockEntries: options.clockEntries }),
    ...(options.screenLight === undefined ? {} : { screenLight: options.screenLight }),
    ...(options.screenLightAgain === undefined ? {} : { screenLightAgain: options.screenLightAgain }),
    modes: Object.fromEntries(Object.entries(WIRING_MODES).map(([name, key]) => [name, modeOf(key)])) as Record<EmptyTouchMode, number>,
    firstList: TOUCH_FIRMWARE_OWN_LISTS,
  });
  const clockEntries = options.clockEntries
    ?? Object.fromEntries(CLOCK_HEADER_PROGRAMS.map((role, k) => [role, k])) as Record<ClockHeaderProgram, number>;

  // The variables: the wiring's, then the two the screens name, then the clock pickers' two byte one past them.
  const variables: (readonly [string, StateVariableSpec])[] = [
    ...wiring.variables, ['assistantStep', { first: 0, max: 3 }], ['time of day', { first: 0, max: 1 }],
  ];
  const clockPicker = TOUCH_STATE_TABLES.firmwareVariables + variables.length;

  // Every name's value.
  const keys = new Map<string, number>();
  for (const key of EMPTY_TOUCH_SCREENS) if (key.startsWith('fixed:')) keys.set(`mode ${key.slice(6)}`, modeOf(key));
  keys.set('mode idle device list', modeOf('idle device list'));
  for (const [index, name] of wiring.wiring.listNames) keys.set(`list ${name}`, index);
  keys.set('list hour', wiring.hourList.index);
  wiring.spec.timers.forEach((name, at) => { if (name !== '') keys.set(`timer ${name}`, at); });
  for (const [screen, timer] of wiring.redrawTimers) keys.set(`timer of ${screen}`, timer);
  for (const [screen, name] of Object.entries(BLANK_TIMERS)) keys.set(`timer of fixed:${screen}`, keys.get(`timer ${name}`) as number);
  variables.forEach(([name], k) => keys.set(`variable ${name}`, TOUCH_STATE_TABLES.firmwareVariables + k));
  keys.set('variable clock picker', clockPicker);
  EMPTY_TOUCH_VALUE_MAPS.forEach((role, k) => keys.set(`map ${role}`, k));
  for (const role of CLOCK_HEADER_PROGRAMS) keys.set(`program ${role}`, clockEntries[role]);

  // The lists of the screens' own, from the first index past the wiring's, every walk collected before any is numbered.
  let next = wiring.nextList;
  const numbering = new TouchNumbering(keys, () => next++);
  const walks = screenSetWalks(forms);
  const all = (Object.entries(walks) as [TouchScreenSet, ScreenWalk[]][])
    .flatMap(([set, list]) => list.map((walk, k) => ({ set, walk, key: walkKey(set, walk, k) })));
  // In mode order, the clock header's calls last, so the lists come out in the order the screens are built.
  const order = (one: { set: TouchScreenSet; key: string }): number => (one.set === 'clock' ? EMPTY_TOUCH_SCREENS.length : modeOf(one.key));
  all.sort((a, b) => order(a) - order(b));
  for (const one of all) numbering.collect(one.walk);
  const numbers = new Map(all.map((one) => [one.walk, numbering.numbers(one.walk)]));

  // The hit pages, by the screens' shapes in mode order.
  const shapes = new Map<string, string[]>();
  TOUCH_FIRMWARE_SCREENS.forEach((id, mode) => shapes.set(`firmware:${id}`, [TOUCH_FIRMWARE_HIT_PAGES[mode] as string]));
  for (const code of STATUS_CODES) if (code !== DISPLAY_TEST_CODE) shapes.set(`status:${code}`, ['message']);
  const fixedPages = touchFixedHitPages(options.year, false);
  TOUCH_FIXED_SCREENS.forEach((name, k) => shapes.set(`fixed:${name}`, fixedPages[k] as string[]));
  for (const [key, shape] of Object.entries(OWN_HIT_PAGES)) shapes.set(key, [shape]);
  const hitPages = new Map<string, number>();
  for (const key of EMPTY_TOUCH_SCREENS) {
    const pages = shapes.get(key);
    if (pages === undefined) throw new ScreenRecordError(`no hit page is stated for ${key}`);
    for (const shape of pages) if (!hitPages.has(shape)) hitPages.set(shape, hitPages.size);
  }
  const leadsOf = (key: string): number[] => (shapes.get(key) as string[]).map((shape) => hitPages.get(shape) as number);

  // Each set's screens, in its description's order.
  const fixedTemplates = touchFixedScreenTemplates(options.year, false);
  const screen = (walk: ScreenWalk, key: string, places: { x: number; y: number }[]): EmptyTouchScreen => ({
    key, mode: modeOf(key), leads: leadsOf(key), numbers: numbers.get(walk) as number[], places,
  });
  const template = (set: TouchScreenSet, k: number, key: string, of: TemplateScreen): EmptyTouchScreen =>
    screen((walks[set] as ScreenWalk[])[k] as ScreenWalk, key, templatePicturePlaces(of));
  const screens = {
    firmware: walks.firmware.map((walk, mode) => screen(walk, `firmware:${TOUCH_FIRMWARE_SCREENS[mode] as string}`, touchFirmwarePicturePlaces(mode))),
    fixed: fixedTemplates.map((one, k) => template('fixed', k, `fixed:${one.name}`, one)),
    status: TOUCH_STATUS_TEMPLATES.map((one, k) => template('status', k, `status:${STATUS_CODES.filter((code) => code !== DISPLAY_TEST_CODE)[k] as number}`, one)),
    help: helpScreens([]).map((one, k) => template('help', k, k === 0 ? 'help:attempt' : 'help:after', one)),
    'activity menu': [template('activity menu', 0, 'activity menu', activityMenuScreen([]))],
    'device lists': EMPTY_DEVICE_LISTS.map((shape, k) => template('device lists', k, k === 0 ? 'idle device list' : 'device list', deviceListScreen(shape))),
  };
  if (screens.help.length !== 2) throw new ScreenRecordError(`the power off help with no device holds ${screens.help.length} screens, not 2`);
  return {
    modes, wiring, variables, clockPicker, keys, forms, screens,
    clockCalls: walks.clock.map((walk) => numbers.get(walk) as number[]), clockEntries, hitPages, nextList: next,
  };
}

/**
 * The device lists' description by `emptyTouchDeviceListsSpec`, section 429, its roles read off the numbering's numbers
 * with `deviceListRoles`. Refuses numbers that maker would not give back unchanged.
 */
function deviceListsSpec(
  screens: readonly EmptyTouchScreen[], pictures: (one: EmptyTouchScreen) => PieceTarget[], homes: Map<string, PieceTarget>,
): TouchDeviceListsSpec {
  const spec = emptyTouchDeviceListsSpec({
    lists: screens.map((one, k) => ({ mode: one.mode, lead: one.leads[0] as number, roles: deviceListRoles(EMPTY_DEVICE_LISTS[k] as DeviceListShape, one.numbers) })),
    fonts: { ...EMPTY_TOUCH_FONTS['device lists'] },
    // Both lists draw one background, as 429's maker states it: the idle list's.
    background: pictures(screens[0] as EmptyTouchScreen)[0] as PieceTarget,
    homes,
  });
  spec.screen.screens.forEach((one, k) => {
    if (one.numbers.join() !== (screens[k] as EmptyTouchScreen).numbers.join()) throw new ScreenRecordError(`device list ${k} is numbered two ways`);
  });
  return spec;
}

/** The key of walk `k` of a set, `EMPTY_TOUCH_SCREENS`' for every set but the clock header's calls. */
function walkKey(set: TouchScreenSet, walk: ScreenWalk, k: number): string {
  if (set === 'firmware') return `firmware:${walk.name}`;
  if (set === 'fixed') return `fixed:${walk.name}`;
  if (set === 'status') return `status:${STATUS_CODES.filter((code) => code !== DISPLAY_TEST_CODE)[k] as number}`;
  if (set === 'help') return k === 0 ? 'help:attempt' : 'help:after';
  if (set === 'activity menu') return 'activity menu';
  if (set === 'device lists') return k === 0 ? 'idle device list' : 'device list';
  return `clock:${walk.name}`;
}

// ---------------------------------------------------------------------------------------------------------
// The descriptions.

/**
 * What an empty One's descriptions take beyond its numbering: a picture for every place a screen draws one, by the
 * screen's key, the place and its turn among the screen's pictures; the clock header's pictures, its programs' and the
 * sixteen it shares by slot, `CLOCK_HEADER_PICTURES`; and the homes of texts drawn by reference to a copy elsewhere,
 * per set, none unless given.
 */
export interface EmptyTouchLook {
  picture: (screen: string, place: { x: number; y: number }, k: number) => PieceTarget;
  clock: { programs: PieceTarget[][]; slots: PieceTarget[] };
  homes?: Partial<Record<TouchScreenSet, Map<string, PieceTarget>>>;
}

export interface EmptyTouchSpecs {
  firmware: TouchFirmwareScreensSpec;
  fixed: TouchFixedScreensSpec;
  status: TouchStatusScreensSpec;
  help: TouchHelpScreensSpec;
  activityMenu: TouchActivityMenuSpec;
  deviceLists: TouchDeviceListsSpec;
  clock: TouchClockHeaderSpec;
  /** The table's hit pages, `buildTouchHitPages`' share: the ones the sets' own builders do not build. */
  hitPages: TouchHitPagesSpec;
}

/**
 * The description of every screen set of an empty One, made from its numbering rather than read off a file: what
 * `buildTouchFirmwareScreens`, `buildTouchFixedScreens`, `buildTouchStatusScreens`, `buildTouchHelpScreens`,
 * `buildTouchActivityMenu`, `buildTouchDeviceLists`, `buildTouchClockHeader` and `buildTouchHitPages` take.
 */
export function emptyTouchSpecs(numbering: EmptyTouchNumbering, look: EmptyTouchLook): EmptyTouchSpecs {
  const homes = (set: TouchScreenSet): Map<string, PieceTarget> => look.homes?.[set] ?? new Map();
  const pictures = (one: EmptyTouchScreen): PieceTarget[] => one.places.map((place, k) => look.picture(one.key, place, k));
  const templated = (list: readonly EmptyTouchScreen[]): { mode: number; leads: number[]; pictures: PieceTarget[]; numbers: number[] }[] =>
    list.map((one) => ({ mode: one.mode, leads: one.leads, pictures: pictures(one), numbers: one.numbers }));
  const s = numbering.screens;
  // The table's pages, every one `TOUCH_HIT_PAGES` names that the screens name, in that table's order.
  const names = TOUCH_HIT_PAGES.filter((name) => numbering.hitPages.has(name));
  if (look.clock.programs.length !== CLOCK_HEADER_PROGRAMS.length) {
    throw new ScreenRecordError(`the clock header has ${CLOCK_HEADER_PROGRAMS.length} programs and ${look.clock.programs.length} are drawn`);
  }
  return {
    firmware: {
      fonts: { ...EMPTY_TOUCH_FONTS.firmware }, homes: homes('firmware'),
      screens: s.firmware.map((one) => ({ hitPage: one.leads[0] as number, pictures: pictures(one), numbers: one.numbers })),
    },
    fixed: { fonts: { ...EMPTY_TOUCH_FONTS.fixed }, homes: homes('fixed'), screens: templated(s.fixed), year: numbering.forms.year, tour: false },
    status: { fonts: { ...EMPTY_TOUCH_FONTS.status }, homes: homes('status'), screens: templated(s.status) },
    help: { fonts: { ...EMPTY_TOUCH_FONTS.help }, homes: homes('help'), screens: templated(s.help), devices: [] },
    activityMenu: {
      rows: [],
      screen: { fonts: { ...EMPTY_TOUCH_FONTS['activity menu'] } as TouchActivityMenuSpec['screen']['fonts'], homes: homes('activity menu'), screens: templated(s['activity menu']) },
    },
    // Through section 429's maker of the two lists' description, from each list's numbers by role, so the two derivations
    // of those numbers are one: a number by role that the numbering gave and 429's walk takes otherwise is refused below.
    deviceLists: deviceListsSpec(s['device lists'], pictures, homes('device lists')),
    clock: {
      fonts: { ...EMPTY_TOUCH_FONTS.clock }, hours: numbering.forms.hours, homes: homes('clock'), slots: look.clock.slots,
      programs: CLOCK_HEADER_PROGRAMS.map((role, k) => ({ entry: numbering.clockEntries[role], pictures: look.clock.programs[k] as PieceTarget[], numbers: [] })),
      calls: numbering.clockCalls,
    },
    hitPages: { names, indices: names.map((name) => numbering.hitPages.get(name) as number) },
  };
}
