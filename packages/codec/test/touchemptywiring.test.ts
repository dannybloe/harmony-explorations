/**
 * The wiring, timers, fixed cases and hour list of a Harmony One with no device and no activity, numbered from
 * nothing, `todo-compile-one.md` 7.1.5, findings section 430, and the measurements they rest on.
 *
 * **The census first.** Every redraw timer of the nineteen One compiles is started by the enter handler of at least
 * one mode and no mode starts two, so the timers partition the screens that start one; the classes are measured by
 * naming the screens each set's finder names and asking which timer each starts. **Then the allocator**, with no
 * lab: what it numbers and that it numbers each thing once. **Then the comparison** with `harvest_one_two_devices`,
 * the compile with the fewest devices among the four with no activity: every piece the two share is the same once
 * the numbers the description carries are set aside, and each difference is one of the empty One's.
 *
 * **The failing controls**: a class list with one screen moved, a variable's range changed, a mode left out, and a
 * comparison against the wrong list. Every figure is exact and every population a literal in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Container, ContainerPiece } from '../src/index.ts';
import { activities, modeRecords, parse, takeApart } from '../src/index.ts';
import { describeStateTables, buildStateTables, hourListBytes } from '../src/statetables.ts';
import { clockRecordFields } from '../src/gspm.ts';
import { CLOCK_STATE_MAXIMA } from '../src/sections.ts';
import { TOUCH_STATE_TABLES } from '../src/families/touch/statetables.ts';
import { WiringError, type BuiltWiring } from '../src/wiringparts.ts';
import { TOUCH_FIRMWARE_SCREENS, buildTouchWiring, describeTouchWiring } from '../src/families/touch/wiring.ts';
import { buildTouchCasePrograms, describeTouchCasePrograms, touchValueMapRoles } from '../src/families/touch/caseprograms.ts';
import { touchClockHeaderEntries } from '../src/families/touch/clockheader.ts';
import { TOUCH_FIXED_SCREENS, touchFixedScreenModes } from '../src/families/touch/fixedscreens.ts';
import { touchStatusScreenModes } from '../src/families/touch/statusscreens.ts';
import { touchTourScreenModes, TOUCH_TOUR_SCREENS, TOUCH_ASSISTANT_SCREENS } from '../src/families/touch/tourscreens.ts';
import { touchHelpScreenModes } from '../src/families/touch/helpscreens.ts';
import { touchDeviceModes } from '../src/families/touch/devicepages.ts';
import { touchDeviceLists } from '../src/families/touch/devicelists.ts';
import { touchActivityMenu } from '../src/families/touch/activityscreen.ts';
import {
  BLANK_SCREEN_SYMBOLS, EMPTY_TOUCH_MODES, EMPTY_TOUCH_REDRAW_CLASSES, EMPTY_TOUCH_VALUE_MAPS, WIRING_MAP_ROLES,
  emptyTouchWiring, touchRedrawStarters, type EmptyTouchMode, type EmptyTouchWiring,
} from '../src/families/touch/emptywiring.ts';

/** The nineteen distinct Harmony One compiles of section 405, `test/wiring-one.test.ts`' list. */
const ONES = ['harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after', 'one_config', 'one_config_unprogrammed',
  'one_friend_asfound_config'] as const;
/** The sixteen English compiles of skin 54, section 405: the first sixteen of `ONES`. */
const SIXTEEN = ONES.slice(0, 16);
/** The four with no activity. */
const NO_ACTIVITY = ['harvest_one_two_devices', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3'] as const;
/** Redraw timers per compile in `ONES` order, section 410's census, and how many modes start one over the nineteen. */
const REDRAWS = [13, 15, 19, 20, 16, 17, 20, 20, 20, 20, 13, 13, 13, 18, 17, 17, 17, 15, 15];
const STARTERS = 3195;

const containerOf = (name: string): Container => parse(load(name) as Uint8Array);

/** Every screen of a compile the screen sets' finders name, by the names `EMPTY_TOUCH_REDRAW_CLASSES` uses, and the two classes the empty One lacks. */
function namedScreens(c: Container): Map<number, string> {
  const out = new Map<number, string>();
  TOUCH_FIRMWARE_SCREENS.forEach((name, mode) => out.set(mode, `firmware:${name}`));
  for (const mode of touchStatusScreenModes(c)) out.set(mode, 'status:every');
  touchFixedScreenModes(c).forEach((mode, k) => out.set(mode, `fixed:${TOUCH_FIXED_SCREENS[k]}`));
  const tour = touchTourScreenModes(c);
  const tourNames = [...TOUCH_TOUR_SCREENS, ...(tour.assistant ? TOUCH_ASSISTANT_SCREENS : [])];
  tour.modes.forEach((mode, k) => out.set(mode, `tour:${tourNames[k]}`));
  touchHelpScreenModes(c).modes.forEach((mode, k) => out.set(mode, k === 0 ? 'help:attempt' : 'help:after'));
  for (const mode of touchDeviceModes(c)) out.set(mode, 'device page');
  for (const list of touchDeviceLists(c)) out.set(list.mode, list.idle === true ? 'idle device list' : 'device list');
  const menu = touchActivityMenu(c);
  if (menu !== undefined) out.set(menu, 'activity menu');
  return out;
}

/**
 * The classes as a compile holds them: per redraw timer, the named screens that start it. Refused where a mode
 * starts two, which is the census's own claim.
 */
function classesOf(c: Container): { timer: number; named: Set<string>; others: number }[] {
  const names = namedScreens(c);
  return [...touchRedrawStarters(c)].map(([timer, modes]) => ({
    timer,
    named: new Set(modes.flatMap((mode) => (names.has(mode) ? [names.get(mode) as string] : []))),
    others: modes.filter((mode) => !names.has(mode)).length,
  }));
}

/** Named screens a class's timer is started by on Logitech's compiles that an empty One does not hold: four of the Remote Assistant's. */
const ALSO_NAMED: Readonly<Record<string, readonly string[]>> = {
  'sensitivity confirmations': ['tour:Assistant Hidden', 'tour:Assistant Welcome', 'tour:Assistant Devices Off', 'tour:Assistant Devices Off Again'],
};

/** Whether a mode's leave handler (tag 7) cancels a timer, bound directly or in the list it calls. */
function cancels(c: Container, mode: number, timer: number): boolean {
  const leave = (modeRecords(c) ?? [])[mode]?.entries.find((one) => one.tag === 7);
  if (leave === undefined) return false;
  const body = leave.opcode === 0x7f ? (c.actionLists() ?? [])[leave.operand] ?? [] : [leave];
  return body.some((one) => one.opcode === 0x1f && one.operand === (0xea00 | timer));
}

/**
 * Where `classes` disagrees with a compile: each class's named screens, those the compile holds, starting one timer
 * that no named screen outside the class starts. The first disagreement, or undefined.
 */
function classDisagreement(c: Container, classes: readonly { name: string; screens: readonly string[] }[]): string | undefined {
  const held = classesOf(c);
  for (const one of classes) {
    const holding = held.filter((h) => one.screens.some((screen) => h.named.has(screen)));
    if (holding.length !== 1) return `${one.name}'s screens start ${holding.length} timers`;
    const outside = [...(holding[0] as { named: Set<string> }).named].filter((screen) => !one.screens.includes(screen) && !(ALSO_NAMED[one.name] ?? []).includes(screen));
    if (outside.length > 0) return `${one.name}'s timer is started by ${outside.join(', ')} too`;
  }
  return undefined;
}

test('findings 430: every redraw timer of the nineteen One compiles is started by the enter handler of a mode and no mode starts two, so the timers are classes of screens, and each mode cancels its timer on leaving',
     skipUnless(...ONES), () => {
  let starters = 0;
  ONES.forEach((name, k) => {
    const c = containerOf(name);
    const starts = touchRedrawStarters(c);
    assert.equal(starts.size, REDRAWS[k], `${name}: redraw timers`);
    for (const [timer, modes] of starts) assert.ok(modes.length > 0, `${name}: redraw timer ${timer} is started by no mode`);
    const all = [...starts.values()].flat();
    assert.equal(new Set(all).size, all.length, `${name}: a mode starts two redraw timers`);
    starters += all.length;
    // And each mode cancels on leaving the timer it started on entering.
    for (const [timer, modes] of starts) for (const mode of modes) assert.ok(cancels(c, mode, timer), `${name}: mode ${mode} does not cancel timer ${timer}`);
  });
  assert.equal(starters, STARTERS);
});

test('findings 430: the four compiles with no activity hold thirteen redraw timers each, and every compile with an activity holds more than thirteen',
     skipUnless(...ONES), () => {
  for (const name of NO_ACTIVITY) {
    const c = containerOf(name);
    assert.equal(activities(c).length, 0, name);
    assert.equal(touchRedrawStarters(c).size, 13, name);
  }
  const withActivities = ONES.filter((name) => !(NO_ACTIVITY as readonly string[]).includes(name));
  assert.equal(withActivities.length, 15);
  for (const name of withActivities) assert.ok(touchRedrawStarters(containerOf(name)).size > 13, name);
});

test('findings 430: the eleven classes of the empty One are the same screens on the sixteen English compiles of skin 54, and the two it lacks are classes of their own',
     skipUnless(...SIXTEEN), () => {
  let deviceClasses = 0;
  const hideOthers: number[] = [];
  const deviceOthers: number[] = [];
  for (const name of SIXTEEN) {
    const c = containerOf(name);
    assert.equal(classDisagreement(c, EMPTY_TOUCH_REDRAW_CLASSES), undefined, name);
    const held = classesOf(c);
    // The assistant's Hide Question starts a timer no other named screen does.
    const hide = held.filter((h) => h.named.has('tour:Assistant Hide Question'));
    assert.equal(hide.length, 1, name);
    assert.deepEqual([...(hide[0] as { named: Set<string> }).named], ['tour:Assistant Hide Question'], name);
    hideOthers.push((hide[0] as { others: number }).others);
    // The device pages start one timer of their own, where the finder names them.
    const devices = held.filter((h) => h.named.has('device page'));
    if (devices.length > 0) {
      deviceClasses += 1;
      assert.equal(devices.length, 1, name);
      assert.deepEqual([...(devices[0] as { named: Set<string> }).named], ['device page'], name);
      deviceOthers.push((devices[0] as { others: number }).others);
    }
    // The tour's eleven start none.
    assert.ok(held.every((h) => TOUCH_TOUR_SCREENS.every((screen) => !h.named.has(`tour:${screen}`))), name);
  }
  // On `harvest_one_families_1` one class holds no named screen; it is the device pages' by elimination, the one class
  // its finders name nothing in, a mode of 44 pages.
  assert.equal(deviceClasses, 15);
  // Screens no finder names start them besides: the Hide Question's one per activity, as the help attempt's does; the device pages' none.
  assert.deepEqual(hideOthers, [0, 1, 7, 7, 2, 2, 7, 7, 7, 7, 0, 0, 0, 3, 2, 2]);
  assert.deepEqual(deviceOthers, Array.from({ length: 15 }, () => 0));
});

test('findings 430: on the four with no activity there are thirteen classes and every screen starting one is named, but harvest_one_families_1\'s one device mode',
     skipUnless(...NO_ACTIVITY), () => {
  for (const name of NO_ACTIVITY) {
    const held = classesOf(containerOf(name));
    assert.equal(held.length, 13, name);
    assert.equal(held.reduce((n, h) => n + h.others, 0), name === 'harvest_one_families_1' ? 1 : 0, name);
  }
});

test('findings 430: a class list with one screen moved is refused on all sixteen, the control of the class census', skipUnless(...SIXTEEN), () => {
  const moved = EMPTY_TOUCH_REDRAW_CLASSES.map((one) => ({
    name: one.name,
    screens: one.name === 'Year and Options' ? ['fixed:Year']
      : one.name === 'Screen Sensitivity' ? [...one.screens, 'fixed:Options'] : one.screens,
  }));
  for (const name of SIXTEEN) assert.match(classDisagreement(containerOf(name), moved) ?? '', /Year and Options's timer is started by fixed:Options/, name);
});

test('findings 430: every redraw timer queues the clock and then the charging gauge of the clock header, on all nineteen', skipUnless(...ONES), () => {
  for (const name of ONES) {
    const c = containerOf(name);
    const spec = describeTouchWiring(takeApart(c));
    const { entries } = touchClockHeaderEntries(c);
    assert.equal(spec.programs['redrawFirst'], entries[3], `${name}: the clock`);
    assert.equal(spec.programs['redrawSecond'], entries[1], `${name}: the charging gauge`);
  }
});

test('findings 430: the wiring\'s five value maps are five of the fixed cases\' roles, and the location and button sound one variable each, by two readers on all nineteen',
     skipUnless(...ONES), () => {
  for (const name of ONES) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const wiring = describeTouchWiring(layout);
    const { records, location } = touchValueMapRoles(c);
    const cases = describeTouchCasePrograms(c, layout).spec;
    for (const [map, role] of Object.entries(WIRING_MAP_ROLES)) assert.equal(wiring.maps[map], records.get(role), `${name}: ${map}`);
    assert.equal(Object.keys(wiring.maps).length, 5, name);
    assert.equal(wiring.variables['location'], location, name);
    assert.equal(wiring.variables['buttonSound'], cases.sound.variable, name);
  }
});

test('findings 430: the blank screens each timer enters are the same seven on the sixteen, and the Devices key\'s screen is the idle device list',
     skipUnless(...SIXTEEN), () => {
  for (const name of SIXTEEN) {
    const c = containerOf(name);
    const spec = describeTouchWiring(takeApart(c));
    const fixed = touchFixedScreenModes(c);
    for (const [symbol, blank] of Object.entries(BLANK_SCREEN_SYMBOLS)) {
      assert.equal(spec.modes[symbol], fixed[TOUCH_FIXED_SCREENS.indexOf(blank)], `${name}: ${symbol}`);
    }
    assert.equal(spec.modes['idleB7.screen'], touchDeviceLists(c).find((list) => list.idle === true)?.mode, name);
  }
});

test('findings 430: the three second timer, on the two compiles holding one, is started with a redraw timer by the help screen the help case enters, and on harvest_one_families_1 enters "Nothing to do"',
     skipUnless('harvest_one_families_1', 'one_friend_asfound_config'), () => {
  for (const name of ['harvest_one_families_1', 'one_friend_asfound_config']) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const spec = describeTouchWiring(layout);
    const help = describeTouchCasePrograms(c, layout).spec.modes.help;
    const enter = (modeRecords(c) ?? [])[help]?.entries.find((one) => one.tag === 6);
    assert.equal(enter?.opcode, 0x7f, name);
    const body = (c.actionLists() ?? [])[enter?.operand as number] ?? [];
    const redraw = [...touchRedrawStarters(c)].filter(([, modes]) => modes.includes(help)).map(([timer]) => timer);
    assert.equal(redraw.length, 1, name);
    assert.deepEqual(body.map((one) => [one.opcode, one.operand]), [[0x1f, 0xeb00 | spec.timers.indexOf('show3')], [0x1f, 0xeb00 | (redraw[0] as number)]], name);
    assert.equal((modeRecords(c) ?? [])[spec.modes['show3.screen'] as number]?.pageCount, 1, name);
  }
  const c = containerOf('harvest_one_families_1');
  const layout = takeApart(c);
  assert.equal(describeTouchWiring(layout).modes['show3.screen'], touchHelpScreenModes(c).modes[1]);
  assert.deepEqual(describeTouchCasePrograms(c, layout).spec.allOff.powers, []);
});

/** Per class, in `SIXTEEN` order, how many screens no finder names start its timer: the activities' help screens. */
const UNNAMED_IN: Readonly<Record<string, readonly number[]>> = {
  'help after the attempt': [0, 9, 111, 111, 38, 38, 111, 111, 111, 111, 0, 0, 0, 47, 38, 38],
  'sensitivity confirmations': [0, 4, 28, 28, 8, 8, 28, 28, 28, 28, 0, 0, 0, 12, 8, 8],
  'help attempt': [0, 1, 7, 7, 2, 2, 7, 7, 7, 7, 0, 0, 0, 3, 2, 2],
};
/** Per compile, the classes no named screen starts: the activities' start up, working and other screens', and `harvest_one_families_1`'s device page. */
const UNNAMED_CLASSES = [0, 2, 6, 7, 3, 4, 7, 7, 7, 7, 1, 0, 0, 5, 4, 4];

test('findings 430: on the sixteen the activities\' screens join three of the eleven classes and bring the rest of the count as classes of their own, thirteen and those',
     skipUnless(...SIXTEEN), () => {
  const into = new Map<string, number[]>();
  const unnamed: number[] = [];
  SIXTEEN.forEach((name, k) => {
    const held = classesOf(containerOf(name));
    for (const one of EMPTY_TOUCH_REDRAW_CLASSES) {
      const h = held.find((x) => one.screens.some((screen) => x.named.has(screen)));
      into.set(one.name, [...(into.get(one.name) ?? []), h?.others ?? -1]);
    }
    unnamed.push(held.filter((x) => x.named.size === 0).length);
    // Thirteen, less `harvest_one_families_1`'s device page the finder does not name, and the classes only unnamed screens start.
    assert.equal(held.length, REDRAWS[k], name);
    assert.equal(held.length, 13 - (name === 'harvest_one_families_1' ? 1 : 0) + (unnamed[k] as number), name);
  });
  assert.deepEqual(unnamed, UNNAMED_CLASSES);
  for (const one of EMPTY_TOUCH_REDRAW_CLASSES) assert.deepEqual(into.get(one.name), UNNAMED_IN[one.name] ?? SIXTEEN.map(() => 0), one.name);
});

// ---------------------------------------------------------------------------------------------------------
// The allocator, with no lab.

/** Modes for the screens the wiring and the cases enter, as an empty One's numbering would give them. */
const MODES = Object.fromEntries(EMPTY_TOUCH_MODES.map((mode, k) => [mode, 40 + k])) as Record<EmptyTouchMode, number>;
const BUILT_AT = '2026-10-23T12:00:00';
/** What the empty One numbers: 168 front lists, the hour list, 173 of the wiring's own, the cases' four. */
const LISTS = 346;
const TIMERS = 25;

test('todo-compile-one 7.1.5: the empty One\'s wiring numbers 346 lists from where it is told, each once, 25 timers, 8 entries, 18 variables and 15 value maps',
     () => {
  const built = emptyTouchWiring({ modes: MODES, firstList: 100 });
  assert.equal(built.lists.size, LISTS);
  assert.deepEqual([...built.lists.keys()].sort((a, b) => a - b), Array.from({ length: LISTS }, (_, k) => 100 + k));
  assert.equal(built.nextList, 100 + LISTS);
  assert.equal(built.hourList.index, 100 + 168);
  assert.deepEqual([...built.hourList.piece.bytes], [...hourListBytes()]);
  assert.equal(built.wiring.lists.size, 168 + 173);
  assert.equal(built.wiring.timerRecords.length, TIMERS);
  assert.deepEqual([...built.wiring.entries.keys()].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
  // Thirteen firmware timers, the three second one and a redraw timer per class.
  assert.equal(built.spec.timers.filter((name) => name.startsWith('redraw')).length, EMPTY_TOUCH_REDRAW_CLASSES.length);
  assert.equal(EMPTY_TOUCH_REDRAW_CLASSES.length, 11);
  assert.ok(built.spec.timers.includes('show3'));
  assert.equal(built.variables.length, 18);
  assert.equal(built.valueMaps.length, 15);
  assert.deepEqual(built.valueMaps.map(([role]) => role), EMPTY_TOUCH_VALUE_MAPS);
  // Every screen of a class starts its class's redraw timer, and each class's is a four second timer of its own.
  const redraws = new Set(built.redrawTimers.values());
  assert.equal(redraws.size, 11);
  for (const at of redraws) assert.match(built.spec.timers[at] as string, /^redraw\d+$/);
});

test('todo-compile-one 7.1.5: the state tables take the empty One\'s variables and value maps at the indices the wiring numbered them by', () => {
  const built = emptyTouchWiring({ modes: MODES });
  const fields = clockRecordFields(BUILT_AT) as Uint8Array;
  const clock = Array.from({ length: 7 }, (_, k) => ({ first: fields[k] as number, max: CLOCK_STATE_MAXIMA[k] ?? (fields[k] as number) + 1 }));
  // The minute's list is the clock header's, numbered with it; any free index stands in for it here.
  const tables = buildStateTables({
    clock, hourList: built.hourList.index, minuteList: built.nextList,
    variables: built.variables.map(([, v]) => v), valueMaps: built.valueMaps.map(([, m]) => m),
  }, TOUCH_STATE_TABLES);
  assert.deepEqual(tables.indexOf, built.variables.map((_, k) => 18 + k));
  // Each name the wiring numbered a variable or a value map by is the variable or value map at that index.
  for (const [name, index] of Object.entries(built.spec.variables)) assert.equal(built.variables[index - 18]?.[0], name, name);
  assert.equal(built.variables[built.cases.spec.counter - 18]?.[0], 'counter');
  assert.equal(built.variables[built.cases.spec.sound.variable - 18]?.[0], 'buttonSound');
  for (const [name, index] of Object.entries(built.spec.maps)) assert.equal(built.valueMaps[index]?.[0], WIRING_MAP_ROLES[name], name);
  for (const [role, index] of Object.entries(built.cases.spec.records)) assert.equal(built.valueMaps[index as number]?.[0], role, role);
  assert.equal(tables.valueMaps.length, 15);
});

test('todo-compile-one 7.1.5: an empty One with a mode left out is refused, and the Remote Assistant\'s variable and value map are not numbered', () => {
  const { ['help attempt']: _left, ...short } = MODES;
  assert.throws(() => emptyTouchWiring({ modes: short as Record<EmptyTouchMode, number> }), (e: unknown) => e instanceof WiringError && /help attempt/.test(e.message));
  const built = emptyTouchWiring({ modes: MODES });
  assert.equal(built.spec.variables['assistantStep'], undefined);
  assert.ok(!EMPTY_TOUCH_VALUE_MAPS.includes('assistant'));
  assert.equal(built.spec.settings.startupAssistant, false);
});

// ---------------------------------------------------------------------------------------------------------
// The comparison with Logitech's compile with the fewest devices of the four with no activity.

/** Per built piece of a wiring, its bytes with what the description put in them zeroed. */
function generatedBytes(wiring: BuiltWiring, piece: ContainerPiece): string {
  const bytes = Uint8Array.from(piece.bytes);
  for (const at of wiring.described.get(piece) ?? []) bytes[at] = 0;
  return [...bytes].join(',');
}

/** A wiring's lists by the catalogue's name. */
const listsByName = (wiring: BuiltWiring): Map<string, ContainerPiece> =>
  new Map([...wiring.listNames].map(([index, name]) => [name, wiring.lists.get(index) as ContainerPiece]));

test('todo-compile-one 7.1.5: against harvest_one_two_devices with its Remote Assistant off, every list, entry and timer the two share is generated alike, and the differences are the empty One\'s three',
     skipUnless('harvest_one_two_devices'), () => {
  const c = containerOf('harvest_one_two_devices');
  const layout = takeApart(c);
  const theirs = describeTouchWiring(layout);
  const theirBuilt = buildTouchWiring({ ...theirs, settings: { ...theirs.settings, startupAssistant: false } });
  // The front at theirs, so that the lists the generator numbers from it are numbered alike.
  const ours = emptyTouchWiring({ modes: MODES, firstList: theirs.front });
  const mine = listsByName(ours.wiring);
  const their = listsByName(theirBuilt);
  const shared = [...mine.keys()].filter((name) => their.has(name));
  assert.equal(shared.length, 340);
  for (const name of shared) {
    assert.equal(generatedBytes(ours.wiring, mine.get(name) as ContainerPiece), generatedBytes(theirBuilt, their.get(name) as ContainerPiece), name);
  }
  // Ours alone: the three second timer's list. Theirs alone: two redraw lists, by name its last two, since the redraw lists are
  // named in table order; the two classes the empty One lacks hold its 7th and 11th, and ours take the first eleven names.
  assert.deepEqual([...mine.keys()].filter((name) => !their.has(name)), ['show3']);
  assert.deepEqual([...their.keys()].filter((name) => !mine.has(name)).sort(), ['redraw11', 'redraw12']);
  for (const k of [0, 1, 2, 3, 4, 5, 6]) {
    assert.equal(generatedBytes(ours.wiring, ours.wiring.entries.get(k) as ContainerPiece), generatedBytes(theirBuilt, theirBuilt.entries.get(k) as ContainerPiece), `entry ${k}`);
  }
  const idle = (w: BuiltWiring, index: number): string => generatedBytes(w, w.entries.get(index) as ContainerPiece);
  assert.equal(idle(ours.wiring, 7), idle(theirBuilt, theirs.entries['idle'] as number));
  for (const piece of ['eventMap', 'leadingList', 'logArea', 'parameterTable'] as const) {
    assert.equal(generatedBytes(ours.wiring, ours.wiring[piece]), generatedBytes(theirBuilt, theirBuilt[piece]), piece);
  }
  // The timer table, by name: theirs with its device timer's place the three second one's and its last two redraw names dropped.
  const expected = theirs.timers.map((name) => (name === '' ? 'show3' : name)).filter((name) => name !== 'redraw11' && name !== 'redraw12');
  assert.deepEqual(ours.spec.timers, expected);
  ours.spec.timers.forEach((name, k) => {
    const at = theirs.timers.indexOf(name === 'show3' ? '' : name);
    if (name === 'show3') return;
    assert.equal(generatedBytes(ours.wiring, ours.wiring.timerRecords[k] as ContainerPiece), generatedBytes(theirBuilt, theirBuilt.timerRecords[at] as ContainerPiece), name);
  });
  // And the eleven classes take their timers in the order their table gives them.
  const names = namedScreens(c);
  const theirOrder = [...touchRedrawStarters(c)]
    .map(([timer, modes]) => ({ timer, cls: EMPTY_TOUCH_REDRAW_CLASSES.findIndex((one) => modes.some((mode) => one.screens.includes(names.get(mode) ?? ''))) }))
    .filter((one) => one.cls >= 0).sort((a, b) => a.timer - b.timer).map((one) => one.cls);
  assert.deepEqual(theirOrder, EMPTY_TOUCH_REDRAW_CLASSES.map((_, k) => k));
  // The settings: theirs keeps the Remote Assistant at start, the empty One does not, `todo-compile-one.md` 4.10.
  assert.deepEqual(theirs.settings, { startupAssistant: true, ladderCancelsTimers: false, screenLight: 10, screenLightAgain: 20 });
});

test('todo-compile-one 7.1.5: the control, a list compared with another of its length differing in one generated byte is told apart', skipUnless('harvest_one_two_devices'), () => {
  const c = containerOf('harvest_one_two_devices');
  const theirs = describeTouchWiring(takeApart(c));
  const theirBuilt = buildTouchWiring({ ...theirs, settings: { ...theirs.settings, startupAssistant: false } });
  const ours = emptyTouchWiring({ modes: MODES, firstList: theirs.front });
  const mine = listsByName(ours.wiring);
  const their = listsByName(theirBuilt);
  // `menu.1.1` and `ready.0.1` are both a test of variable 13 and a `3F F1xx`, differing in one generated byte, and are told apart.
  assert.notEqual(generatedBytes(ours.wiring, mine.get('menu.1.1') as ContainerPiece), generatedBytes(theirBuilt, their.get('ready.0.1') as ContainerPiece));
  assert.equal(generatedBytes(ours.wiring, mine.get('menu.1.1') as ContainerPiece), generatedBytes(theirBuilt, their.get('menu.1.1') as ContainerPiece));
});

/** A variable's record from a compile's state tables, its transitions' lists by the wiring's names. */
function recordsByName(c: Container): Map<string, string> {
  const layout = takeApart(c);
  const wiring = describeTouchWiring(layout);
  const cases = describeTouchCasePrograms(c, layout).spec;
  const tables = describeStateTables(layout, TOUCH_STATE_TABLES);
  const listName = new Map(Object.entries(wiring.lists).map(([name, index]) => [index, name]));
  const out = new Map<string, string>();
  for (const [name, index] of Object.entries({ ...wiring.variables, counter: cases.counter })) {
    const v = tables.variables[index - 18];
    if (v === undefined) continue;
    const transitions = (v.transitions ?? []).map((t) => `${t.from}>${t.to} ${t.opcode === 0x7f ? listName.get(t.operand) : t.operand}`);
    out.set(name, `${v.stem ?? ''} ${v.first}/${v.max} ${transitions.join(',')}`);
  }
  return out;
}

const ourRecords = (built: EmptyTouchWiring): Map<string, string> => {
  const listName = new Map(Object.entries(built.spec.lists).map(([name, index]) => [index, name]));
  return new Map(built.variables.map(([name, v]) => [name,
    `${v.stem ?? ''} ${v.first}/${v.max} ${(v.transitions ?? []).map((t) => `${t.from}>${t.to} ${listName.get(t.operand)}`).join(',')}`]));
};

test('todo-compile-one 7.1.5: the empty One\'s eighteen variables have the range and transitions they have on all nineteen compiles, the activity counter as on the four with no activity',
     skipUnless(...ONES), () => {
  const ours = ourRecords(emptyTouchWiring({ modes: MODES }));
  for (const name of ONES) {
    const theirs = recordsByName(containerOf(name));
    for (const [variable, record] of ours) {
      if (variable === 'counter' && !(NO_ACTIVITY as readonly string[]).includes(name)) continue;
      assert.equal(theirs.get(variable), record, `${name}: ${variable}`);
    }
  }
  // The control: a range one off is told apart.
  const changed = new Map(ours);
  changed.set('relightVar', (ours.get('relightVar') as string).replace('0/121', '0/120'));
  assert.notEqual(recordsByName(containerOf('harvest_one_two_devices')).get('relightVar'), changed.get('relightVar'));
});

test('todo-compile-one 7.1.5: the empty One\'s fixed cases are those of harvest_one_families_1, the compile with nothing to switch off, case for case in value and form',
     skipUnless('harvest_one_families_1', 'harvest_one_two_devices'), () => {
  const built = emptyTouchWiring({ modes: MODES });
  for (const name of ['harvest_one_families_1', 'harvest_one_two_devices']) {
    const c = containerOf(name);
    const d = describeTouchCasePrograms(c, takeApart(c));
    const theirs = buildTouchCasePrograms(d.spec);
    assert.equal(d.spec.idle, built.cases.spec.idle, name);
    for (const role of EMPTY_TOUCH_VALUE_MAPS) {
      const mine = built.cases.built.cases.get(role) ?? [];
      const their = theirs.cases.get(role) ?? [];
      assert.deepEqual(mine.map((one) => String(one.key)), their.map((one) => String(one.key)), `${name}: ${role}`);
      // A case queuing one instruction is five bytes; the frames and the empty all off are the same bytes outright.
      const all = role === 'all off' && name === 'harvest_one_two_devices';
      if (!all) assert.deepEqual(mine.map((one) => one.piece.bytes.length), their.map((one) => one.piece.bytes.length), `${name}: ${role}`);
      if (role === 'grid' || role === 'column' || (role === 'all off' && name === 'harvest_one_families_1')) {
        assert.deepEqual(mine.map((one) => [...one.piece.bytes]), their.map((one) => [...one.piece.bytes]), `${name}: ${role}`);
      }
    }
    // The one role the empty One does not hold.
    assert.equal(theirs.cases.get('assistant')?.length, 2, name);
  }
  // harvest_one_two_devices writes its two power variables through a list; harvest_one_families_1 and the empty One end at once.
  assert.deepEqual(describeTouchCasePrograms(containerOf('harvest_one_two_devices'), takeApart(containerOf('harvest_one_two_devices'))).spec.allOff.powers.length, 2);
});
