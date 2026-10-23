/**
 * The wiring, the timers, the fixed cases and the hour list of a Harmony One built from nothing, no device and no
 * activity: `todo-compile-one.md` 7.1.5, findings section 430. The touch family's half of what
 * `families/four-slot/empty.ts`' `emptyWiring` is for the Harmony 650.
 *
 * Section 410 built the One's own wiring from a description read off a configuration, and `touchWiringNeeds` said
 * which numbers such a description holds; nothing allocated them. This module does, for a configuration that has no
 * file to read them off: it numbers every list, variable, value map, entry and program the wiring and the fixed cases
 * name, decides the timer table, and asks the existing builders, `buildTouchWiring` (section 410) and
 * `buildTouchCasePrograms` (section 416), for the pieces. Nothing here is read off a compile.
 *
 * **The redraw timers, and why there are eleven.** Every One compile holds four second timers whose list queues the
 * clock and the charging gauge of the clock header (section 414) and starts the timer again: what keeps the strip
 * along the top of the screen current while a screen is shown. Logitech's hold 13 to 20 of them, and section 410 left
 * the number unread. **It is one per class of screen**, section 430: on all nineteen compiles every redraw timer is
 * started by the enter handler of at least one mode, no mode's enter starts two, and the screens that start the same
 * timer are the same screens on every English compile, `EMPTY_TOUCH_REDRAW_CLASSES` below. A configuration with no
 * activity holds thirteen classes, measured on the four that have none; one with activities holds more, since its
 * start up and working screens bring classes of their own. The empty One holds eleven of the thirteen: no device, so
 * no device page; no Remote Assistant, `todo-compile-one.md` 4.10, so not the assistant's Hide Question, which is a
 * class of its own. **That eleven is our derivation and not Logitech's**: no compile of theirs holds no device or no
 * assistant screen at once, and what holds on all nineteen is that no redraw timer is started by no screen, so a
 * class with no screen has no timer.
 *
 * **The help chain of a household with no power variable**, section 415: the attempt screen and "Nothing to do",
 * which the attempt screen's three second timer enters as on `harvest_one_families_1`, the only compile with nothing
 * to switch off, so this rests on one compile; section 410's `show3`, whose source that section left
 * unread. On both compiles that hold it the help screen the power off value map enters starts it on entering, with a
 * redraw timer, and it enters a screen of one page: on `harvest_one_families_1`, the one compile whose all off writes
 * no power variable, that screen is the help chain's second, "Nothing to do"; on `one_friend_asfound_config`, the
 * Dutch compile, it is read as the first device question. So the empty One, with nothing to switch off, holds it.
 *
 * **What is the caller's**: the modes, since which mode each screen is belongs to the empty One's numbering,
 * `todo-compile-one.md` 7.1.4, and the base slot 10 index the numbering starts at. **What is stated here, in an order
 * of ours**: the timer table, Logitech's own order on `harvest_one_two_devices` with its device timer's place taken by
 * the three second one and its last two redraw names left out (the two classes the empty One lacks hold its 7th and
 * 11th, and ours take the first eleven names in the relative order it holds them); the variables, after the firmware's eighteen
 * in `touchWiringNeeds`' order and then the activity counter, each with the range and transitions it has on all
 * nineteen compiles; the value maps, `TOUCH_VALUE_MAP_ROLES`' order without the Remote Assistant's; base slot 9's
 * leftover entry, 7, the first after the seven fixed ones, as on `harvest_one_families_1`; and the lists, the front
 * first, then the hour list, then the wiring's in `touchWiringNeeds`' order and the fixed cases' four.
 *
 * The Harmony One alone, the touch family's, arch 12: the Harmony 600, 650 and 700's is `families/four-slot/empty.ts`.
 * Read only towards hardware: the result is pieces.
 */
import { archSlot, type Container, parse } from '../../gspm.ts';
import type { ContainerPiece } from '../../frame.ts';
import { modeRecords } from '../../sections.ts';
import { TIMER_RECORD_LENGTH, TIMER_SLOT, timers } from '../../tables.ts';
import { Writer } from '../../emit.ts';
import { relocate } from '../../relocate.ts';
import { appendActionLists } from '../../shared/core.ts';
import { appendTableEntries } from '../../shared/infrared.ts';
import { type StateVariableSpec, type ValueMapSpec, hourListBytes } from '../../statetables.ts';
import { type BuiltWiring, WiringError } from '../../wiringparts.ts';
import { TOUCH_STATE_TABLES } from './statetables.ts';
import { buildTouchWiring, touchWiringNeeds, type TouchWiringSettings, type TouchWiringSpec } from './wiring.ts';
import {
  type BuiltTouchCasePrograms, TOUCH_VALUE_MAP_ROLES, type TouchCaseProgramsSpec, type TouchValueMapRole, buildTouchCasePrograms,
} from './caseprograms.ts';
import { CLOCK_HEADER_PROGRAMS, type ClockHeaderProgram, touchClockHeaderEntries } from './clockheader.ts';

// ---------------------------------------------------------------------------------------------------------
// The redraw timers.

/** A redraw timer's length in seconds and what its list does: queue the clock, queue the charging gauge, start itself. */
const REDRAW_SECONDS = 4;
const START_TIMER = 0xeb00;
const STATE_BAND = 0x1f;
const CALL = 0x7f;
/** A mode's own key map binds its enter handler at tag 6, section 411. */
const TAG_ENTER = 6;

/**
 * The classes of screen a redraw timer serves on an empty One, in the order their timers take in the table, and the
 * screens of each by the names the screen sets give them: `firmware:` `TOUCH_FIRMWARE_SCREENS`, `fixed:`
 * `TOUCH_FIXED_SCREENS`, `status:every` the twenty nine status screens past code 9's, and the four screens the setup
 * brings, the activity menu, the device lists (the idle one alone on an empty One, `device list` being an activity's
 * or the one nothing reaches), and the power off help's attempt screen and the screens after it (on a household with
 * no power variable "Nothing to do" alone).
 *
 * **Measured on the sixteen English compiles of skin 54**, section 430: each class's named screens start one timer
 * and no other named screen starts it. On Logitech's compiles three share their timer with screens the empty One does
 * not hold: the sensitivity confirmations with four of the Remote Assistant's screens and four more per activity, and
 * the two help classes with screens the activities bring; the other eight hold the named screens alone on all
 * sixteen. Two classes are not here, the device pages' and the assistant's Hide Question's, which takes one screen
 * per activity besides. The order is the order
 * `harvest_one_two_devices`' table gives the eleven, the first three among the firmware's own timers and the rest at
 * its end; Logitech's order differs between compiles, sixteen sequences over the nineteen, section 410.
 */
export const EMPTY_TOUCH_REDRAW_CLASSES: readonly { name: string; screens: readonly string[] }[] = [
  { name: 'low battery', screens: ['firmware:lowBattery'] },
  {
    name: 'progress and status',
    screens: ['firmware:updateSuccessful', 'firmware:upgradeSuccess', 'firmware:updateInProgress', 'firmware:learning',
      'firmware:firmwareUpgrade', 'status:every', 'fixed:LCD Module Failed'],
  },
  { name: 'charging problem', screens: ['firmware:chargingProblem'] },
  { name: 'activity menu', screens: ['activity menu'] },
  { name: 'help after the attempt', screens: ['help:after'] },
  { name: 'device lists', screens: ['idle device list', 'device list'] },
  {
    name: 'sensitivity confirmations',
    screens: ['fixed:Sensitivity Very High', 'fixed:Sensitivity High', 'fixed:Sensitivity Medium', 'fixed:Sensitivity Low', 'fixed:Sensitivity Very Low'],
  },
  { name: 'Year and Options', screens: ['fixed:Year', 'fixed:Options'] },
  { name: 'Screen Sensitivity', screens: ['fixed:Screen Sensitivity'] },
  // With the two a leap year in the Year picker's range brings, which start the other clock pickers' timer on the
  // three compiles of Logitech's that hold them, section 434; a year with none holds neither, and the class is the rest.
  {
    name: 'clock pickers',
    screens: ['fixed:Month', 'fixed:Day 28', 'fixed:Day 30', 'fixed:Day 31', 'fixed:Hour', 'fixed:Minute', 'fixed:Time of Day',
      'fixed:Month in a leap year', 'fixed:Day 29'],
  },
  { name: 'help attempt', screens: ['help:attempt'] },
];

/**
 * The timer table of an empty One, by the wiring's names: `harvest_one_two_devices`' order by name, `show3` where it
 * has its device timer, and its last two redraw names, `redraw11` and `redraw12`, left out of the tail. The redraw
 * lists are named in table order, so the eleven classes take the first eleven names in the relative order that
 * compile holds them, which is one compile's order and not a rule (the sixteen hold 14). The firmware's thirteen and the three second timer are section 410's.
 */
const EMPTY_TIMERS: readonly string[] = [
  'redraw0', 'second0', 'screenLight', 'redraw1', 'second1', 'readyReset', 'second2', 'screenLightAgain', 'show3',
  'ready5', 'lightsOut', 'redraw2', 'enter5', 'second3', 'second4', 'lightTick', 'second5',
  ...EMPTY_TOUCH_REDRAW_CLASSES.slice(3).map((_, k) => `redraw${k + 3}`),
];

/**
 * For every redraw timer of a Harmony One configuration, the modes whose enter handler starts it: the handler's
 * own instruction where it binds one, else the list it calls and the lists that list calls. A redraw timer is a
 * four second timer calling a list, the only timers of that length on the nineteen compiles, section 410. The
 * reader section 430 counts the classes with; arch 12 alone, as every reader here.
 */
export function touchRedrawStarters(c: Container): Map<number, number[]> {
  const table = timers(c)?.records ?? [];
  const lists = c.actionLists() ?? [];
  const out = new Map<number, number[]>();
  table.forEach((timer, k) => { if (timer.duration === REDRAW_SECONDS && timer.instruction.opcode === CALL) out.set(k, []); });
  const started = (body: readonly { opcode: number; operand: number }[]): number[] => body
    .filter((one) => one.opcode === STATE_BAND && (one.operand & 0xff00) === START_TIMER && out.has(one.operand & 0xff))
    .map((one) => one.operand & 0xff);
  (modeRecords(c) ?? []).forEach((record, mode) => {
    const enter = record.entries.find((one) => one.tag === TAG_ENTER);
    if (enter === undefined) return;
    const body = enter.opcode === CALL ? lists[enter.operand] ?? [] : [enter];
    const found = [...started(body), ...(enter.opcode === CALL ? body.filter((one) => one.opcode === CALL).flatMap((one) => started(lists[one.operand] ?? [])) : [])];
    for (const timer of new Set(found)) (out.get(timer) as number[]).push(mode);
  });
  return out;
}

/** The `0x73` that queues a base slot 11 program, which a redraw list does twice. */
const QUEUE_PROGRAM = 0x73;
/** A scheduled timer's kind byte, every timer of the nineteen compiles. */
const SCHEDULED = 0x01;

/**
 * A redraw timer for a class of screen the configuration does not hold yet, appended: a four second timer at the
 * table's end, calling a list of its own that queues the clock and then the charging gauge and starts the timer
 * again, the shape every redraw timer of the nineteen compiles has, section 430 (`[73 clock, 73 charging, 1F EBnn]`,
 * the timer record `01 000004 list 7F`). The programs are the configuration's own, `touchClockHeaderEntries`.
 *
 * **For the first device page on a configuration with none**, `todo-compile-one.md` 8.1.1: the device pages are a
 * class of their own, section 430, so an empty One, which holds no device and no timer started by no screen, holds no
 * timer for them, and the first device composed onto it has to bring one, as a class with a screen has a timer. The
 * list goes at the action table's end, the record after the last record and the pointer at the table's end; where a
 * Logitech compile puts its device pages' timer among the others is its own order, section 410, and the placer and the
 * wiring's description read the table in whatever order it holds, the redraw timers named in table order.
 */
export function appendTouchRedrawTimer(c: Container): { container: Container; timer: number; list: number } {
  if (c.architecture === undefined) throw new WiringError('the configuration states no architecture');
  const table = timers(c);
  const last = table?.records.at(-1);
  const lastAt = last === undefined ? undefined : c.blobOffsetOf(last.address);
  if (table === undefined || lastAt === undefined) throw new WiringError('the timer table does not read, or holds no timer to append after');
  const timer = table.records.length;
  if (timer > 0xff) throw new WiringError(`a timer is started by its index in a byte, and this would be timer ${timer}`);
  const { entries } = touchClockHeaderEntries(c);
  const clock = entries[CLOCK_HEADER_PROGRAMS.indexOf('clock')] as number;
  const charging = entries[CLOCK_HEADER_PROGRAMS.indexOf('charging')] as number;
  const listed = appendActionLists(c, [[[clock, QUEUE_PROGRAM], [charging, QUEUE_PROGRAM], [START_TIMER | timer, STATE_BAND]]]);
  let out = parse(listed.bytes);
  // The record after the last one, read again since the list moved what lay above the action table.
  const moved = timers(out)?.records.at(-1);
  const at = moved === undefined ? undefined : out.blobOffsetOf(moved.address);
  if (at === undefined) throw new WiringError('the last timer stopped reading');
  const record = new Writer(TIMER_RECORD_LENGTH).u8(SCHEDULED).u24(REDRAW_SECONDS).u16(listed.first).u8(CALL).bytes;
  const hole = relocate(out, at + TIMER_RECORD_LENGTH, record.length);
  hole.bytes.set(record, at + TIMER_RECORD_LENGTH);
  out = parse(hole.bytes);
  out = parse(appendTableEntries(out, archSlot(out.architecture as number, TIMER_SLOT), [out.flashBase + at + TIMER_RECORD_LENGTH]));
  if (timers(out)?.records[timer]?.instruction.operand !== listed.first) throw new WiringError('the appended timer does not read back');
  return { container: out, timer, list: listed.first };
}

// ---------------------------------------------------------------------------------------------------------
// The modes the caller gives.

/** The modes an empty One's wiring and fixed cases enter, which its numbering gives, `todo-compile-one.md` 7.1.4. */
export const EMPTY_TOUCH_MODES = [
  'Blank 1', 'Blank 2', 'Blank 3', 'Blank 4', 'Blank 5', 'Blank 6', 'Blank 7',
  'activity menu', 'idle device list', 'help attempt', 'help after',
] as const;
export type EmptyTouchMode = (typeof EMPTY_TOUCH_MODES)[number];

/**
 * Which of section 411's seven blank screens each timer of the wiring enters, the wiring's names for them, on the
 * sixteen English compiles of skin 54, section 430. The six one second timers and the five second one enter one
 * each; `second4` enters the screen the ready list enters, `ready.screen`, as section 410 found.
 */
export const BLANK_SCREEN_SYMBOLS: Readonly<Record<string, EmptyTouchMode>> = {
  'second3.screen': 'Blank 1', 'second1.screen': 'Blank 2', 'second0.screen': 'Blank 3', 'ready.screen': 'Blank 4',
  'second2.screen': 'Blank 5', 'enter5.screen': 'Blank 6', 'second5.screen': 'Blank 7',
};
/** The other two the wiring enters: the Devices key's, scan 55, the idle device list; the three second timer's, "Nothing to do". */
const OTHER_SCREEN_SYMBOLS: Readonly<Record<string, EmptyTouchMode>> = {
  'idleB7.screen': 'idle device list', 'show3.screen': 'help after',
};

// ---------------------------------------------------------------------------------------------------------
// The variables and value maps.

/** A transition of the wiring's own variables: from any value to `to`, calling a list, section 418. */
const FROM_ANY = -2;

/**
 * The range and transitions of every variable the wiring and the fixed cases name, the same on all nineteen One
 * compiles, section 430, `relightVar` reaching 121 the widest one byte maximum `TOUCH_STATE_TABLES` admits. Two are
 * named in base slot 0, the location and the button sound; the activity counter is too, and with no activity it holds
 * the idle value 0 and nothing more, as on the four compiles with none. The transitions name lists by the wiring's
 * own names, numbered below.
 */
const VARIABLES: Readonly<Record<string, { first: number; max: number; stem?: string; transitions?: readonly [number, number, string][] }>> = {
  bootVar2: { first: 0, max: 1 }, bootVar3: { first: 0, max: 1 }, bootVar4: { first: 0, max: 3 }, bootVar5: { first: 0, max: 1 },
  keyLightsA: { first: 0, max: 3 }, keyLightsB: { first: 0, max: 1 },
  keyLight4: { first: 0, max: 1 }, keyLight5: { first: 0, max: 1 }, keyLight6: { first: 0, max: 1 }, keyLight7: { first: 0, max: 1 },
  buttonSound: { first: 0, max: 1, stem: 'ButtonSoundVolume' },
  location: { first: 0, max: 0, stem: 'CurrentLocation' },
  readyVar: { first: 0, max: 2, transitions: [[FROM_ANY, 1, 'readyVar.t0']] },
  relightVar: { first: 0, max: 121, transitions: [[FROM_ANY, 121, 'relightVar.t0'], [FROM_ANY, 1, 'relightVar.t1']] },
  settleVar: { first: 0, max: 4, transitions: [[FROM_ANY, FROM_ANY, 'settleVar.t0']] },
  idleB7Var: { first: 0, max: 3 },
  e1Var: { first: 0, max: 1 },
  counter: { first: 0, max: 0, stem: 'CurrentActivityState_0' },
};

/** The value maps of an empty One, in index order: every role but the Remote Assistant's start up toggle. */
export const EMPTY_TOUCH_VALUE_MAPS: readonly TouchValueMapRole[] = TOUCH_VALUE_MAP_ROLES.filter((role) => role !== 'assistant');

/**
 * The five value maps the wiring names are five of the fixed cases' roles, on all nineteen compiles, section 430:
 * two readers that find them by different routes, the wiring's description by the lists that look them up and
 * `touchValueMapRoles` by what their cases do, agree on every one.
 */
export const WIRING_MAP_ROLES: Readonly<Record<string, TouchValueMapRole>> = {
  readyMap: 'menu', menuMap: 'working route', idleA6Map: 'help', idleEnterMap: 'idle', idleMap: 'all off',
};

/** The leftover entry's index with no activity: after the seven fixed ones, base slot 9 holding nothing else. */
const IDLE_ENTRY = 7;
/** The idle value of the activity counter with no activity, on the four compiles with none. */
const IDLE_VALUE = 0;

// ---------------------------------------------------------------------------------------------------------
// The allocator.

export interface EmptyTouchWiringOptions {
  /** The modes the wiring and the fixed cases enter, every one of `EMPTY_TOUCH_MODES`. */
  modes: Readonly<Record<EmptyTouchMode, number>>;
  /** The base slot 10 index the numbering starts at, the front's first list. */
  firstList?: number;
  /**
   * The clock header's four programs' base slot 11 entries, `CLOCK_HEADER_PROGRAMS`' order 0 to 3 unless given, which
   * puts the clock at 3 and the charging gauge at 1, as on 12 of the 19.
   */
  clockEntries?: Readonly<Record<ClockHeaderProgram, number>>;
  /** The screen light pair's seconds, Logitech's 10 and 20 unless given, `TouchChoices.screenLightSeconds`. */
  screenLight?: number;
  screenLightAgain?: number;
}

export interface EmptyTouchWiring {
  spec: TouchWiringSpec;
  wiring: BuiltWiring;
  cases: { spec: TouchCaseProgramsSpec; built: BuiltTouchCasePrograms };
  /** The variables after the firmware's, in index order, each with the name the wiring or the cases give it. */
  variables: readonly (readonly [string, StateVariableSpec])[];
  /** The value maps in index order by role, each with its cases pointing at the built programs. */
  valueMaps: readonly (readonly [TouchValueMapRole, ValueMapSpec])[];
  /** The clock's hour list, which the state tables name, and its index. */
  hourList: { index: number; piece: ContainerPiece };
  /** Every list numbered here, by base slot 10 index: the wiring's, the fixed cases' and the hour list. */
  lists: Map<number, ContainerPiece>;
  /** Per screen of `EMPTY_TOUCH_REDRAW_CLASSES`, the redraw timer its enter handler starts. */
  redrawTimers: ReadonlyMap<string, number>;
  /** The first base slot 10 index after these, where the screens' lists go on. */
  nextList: number;
}

/**
 * The wiring, timers, fixed cases and hour list of a Harmony One with no device and no activity, numbered from
 * nothing. Refuses a mode missing from `modes`, a symbol the wiring names that this does not number, and anything
 * the builders refuse.
 */
export function emptyTouchWiring(options: EmptyTouchWiringOptions): EmptyTouchWiring {
  const firstList = options.firstList ?? 0;
  for (const mode of EMPTY_TOUCH_MODES) {
    if (!Number.isInteger(options.modes[mode])) throw new WiringError(`no mode is given for ${mode}`);
  }
  const settings: TouchWiringSettings = {
    startupAssistant: false, ladderCancelsTimers: false,
    screenLight: options.screenLight ?? 10, screenLightAgain: options.screenLightAgain ?? 20,
  };
  const needs = touchWiringNeeds(settings, EMPTY_TIMERS);

  // Lists: the front, the hour list, the wiring's in its own order, the fixed cases' four.
  const hourIndex = firstList + needs.frontLength;
  const listIndex: Record<string, number> = Object.fromEntries(needs.lists.map((name, k) => [name, hourIndex + 1 + k]));
  const caseLists = hourIndex + 1 + needs.lists.length;
  const page: [number, number] = [caseLists, caseLists + 1];
  const sound: [number, number] = [caseLists + 2, caseLists + 3];
  const nextList = caseLists + 4;

  // Modes, by the wiring's names for them.
  const symbolModes: Record<string, EmptyTouchMode> = { ...BLANK_SCREEN_SYMBOLS, ...OTHER_SCREEN_SYMBOLS };
  const modes: Record<string, number> = {};
  for (const name of needs.modes) {
    const mode = symbolModes[name];
    if (mode === undefined) throw new WiringError(`the wiring enters ${name}, which an empty One does not number`);
    modes[name] = options.modes[mode];
  }

  // Variables: the wiring's in its order, then the activity counter, each after the firmware's.
  const variableNames = [...needs.variables, 'counter'];
  const variableIndex = (name: string): number => {
    const k = variableNames.indexOf(name);
    if (k < 0) throw new WiringError(`an empty One names no variable ${name}`);
    return TOUCH_STATE_TABLES.firmwareVariables + k;
  };
  const variables: Record<string, number> = Object.fromEntries(needs.variables.map((name) => [name, variableIndex(name)]));

  // Value maps: the roles in `EMPTY_TOUCH_VALUE_MAPS`' order, the wiring's five among them.
  const mapIndex = (role: TouchValueMapRole): number => EMPTY_TOUCH_VALUE_MAPS.indexOf(role);
  const maps: Record<string, number> = Object.fromEntries(needs.maps.map((name) => {
    const role = WIRING_MAP_ROLES[name];
    if (role === undefined) throw new WiringError(`the wiring names a value map ${name} no role of the fixed cases is`);
    return [name, mapIndex(role)];
  }));
  if (needs.entries.some((name) => name !== 'idle')) throw new WiringError(`the wiring names entries ${needs.entries.join(', ')}`);

  // Programs: the clock and the charging gauge, which every redraw timer queues in that order, section 430.
  const clockEntries = options.clockEntries ?? Object.fromEntries(CLOCK_HEADER_PROGRAMS.map((role, k) => [role, k])) as Record<ClockHeaderProgram, number>;
  const programs = { redrawFirst: clockEntries.clock, redrawSecond: clockEntries.charging };

  const spec: TouchWiringSpec = {
    settings, front: firstList, timers: EMPTY_TIMERS, deviceTimers: [],
    lists: listIndex, modes, variables, maps, entries: { idle: IDLE_ENTRY }, programs,
  };
  const wiring = buildTouchWiring(spec);

  // The fixed cases, section 416: no Remote Assistant, nothing to switch off.
  const caseSpec: TouchCaseProgramsSpec = {
    records: Object.fromEntries(EMPTY_TOUCH_VALUE_MAPS.map((role) => [role, mapIndex(role)])),
    location: variableIndex('location'), counter: variableIndex('counter'), idle: IDLE_VALUE,
    modes: { menu: options.modes['activity menu'], help: options.modes['help attempt'], deviceList: options.modes['idle device list'] },
    page: { lists: page },
    sound: { variable: variableIndex('buttonSound'), lists: sound },
    allOff: { powers: [] },
  };
  const built = buildTouchCasePrograms(caseSpec);

  const variableSpecs = variableNames.map((name): readonly [string, StateVariableSpec] => {
    const v = VARIABLES[name];
    if (v === undefined) throw new WiringError(`no range is stated for ${name}`);
    const out: StateVariableSpec = {
      ...(v.stem === undefined ? {} : { stem: v.stem }), first: v.first, max: v.max,
      ...(v.transitions === undefined ? {} : {
        transitions: v.transitions.map(([from, to, list]) => ({ from, to, operand: listIndex[list] as number, opcode: CALL })),
      }),
    };
    return [name, out];
  });
  const valueMaps = EMPTY_TOUCH_VALUE_MAPS.map((role): readonly [TouchValueMapRole, ValueMapSpec] => {
    const cases = built.cases.get(role) ?? [];
    return [role, {
      cases: cases.flatMap((one) => (typeof one.key === 'number' ? [{ value: one.key, target: { to: one.piece, offset: 0 } }] : [])),
      ranges: cases.flatMap((one) => (typeof one.key === 'number' ? [] : [{ low: one.key[0], high: one.key[1], target: { to: one.piece, offset: 0 } }])),
    }];
  });

  const hourList: ContainerPiece = { bytes: hourListBytes(), refs: [], owner: 'slot-10-list' };
  const lists = new Map<number, ContainerPiece>([...wiring.lists, [hourIndex, hourList], ...built.lists]);
  const expected = nextList - firstList;
  if (lists.size !== expected) throw new WiringError(`the numbering holds ${lists.size} lists where it allocated ${expected}`);

  // Each screen of a class to the timer the table gives the class.
  const redrawTimers = new Map<string, number>();
  EMPTY_TOUCH_REDRAW_CLASSES.forEach((one, k) => {
    const at = EMPTY_TIMERS.indexOf(`redraw${k}`);
    for (const screen of one.screens) redrawTimers.set(screen, at);
  });
  return {
    spec, wiring, cases: { spec: caseSpec, built }, variables: variableSpecs, valueMaps,
    hourList: { index: hourIndex, piece: hourList }, lists, redrawTimers, nextList,
  };
}
