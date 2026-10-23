/**
 * The Harmony One's screen sets numbered by role, and an empty One numbered from nothing: `todo-compile-one.md` 7.1.4,
 * findings section 432.
 *
 * **The closure first.** On each of the sixteen English compiles of skin 54, every number every screen set an empty
 * One holds takes is read off the compile as a value of a name, `readKeys`, across all the sets at once, so one name
 * is one number everywhere; then the sets' numbers are made again from those names alone, `TouchNumbering`, and
 * compared with the compile's own. A list of the screens' own is compared up to a renaming, in both directions, so a
 * list shared where the compile holds two, or two where it holds one, fails. **Then the names against independent
 * readers**: the wiring's list, variable and timer names off its own description, the value maps off what their cases
 * do, the modes off the screen finders, the clock's programs off their look. **Then the empty One**: what it numbers,
 * each thing once, and every set built from its descriptions with the lists meeting end to end.
 *
 * **The failing controls**: one compile's names numbering another's screens, another compile's font order, Options'
 * hit pages the other way round, a name the empty One does not hold, a walk collected twice or after numbering, and a
 * leap year. The Day pickers' lists are a measurement of what a rule sharing by content alone would merge, not a run
 * of that rule. Every figure is exact.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Container, ContainerPiece } from '../src/index.ts';
import { parse, takeApart } from '../src/index.ts';
import { stateRecords, stateTable } from '../src/sections.ts';
import { type PieceTarget, describeStateTables } from '../src/statetables.ts';
import { TOUCH_STATE_TABLES } from '../src/families/touch/statetables.ts';
import { ScreenRecordError } from '../src/screenrecords.ts';
import { buildTouchWiring, describeTouchWiring } from '../src/families/touch/wiring.ts';
import { touchValueMapRoles } from '../src/families/touch/caseprograms.ts';
import {
  TOUCH_FIRMWARE_HIT_PAGES, TOUCH_FIRMWARE_OWN_LISTS, TOUCH_FIRMWARE_SCREENS, buildTouchFirmwareScreens, describeTouchFirmwareScreens,
} from '../src/families/touch/firmwarescreens.ts';
import {
  TOUCH_FIXED_SCREENS, buildTouchFixedScreens, describeTouchFixedScreens, touchFixedHitPages, touchFixedScreenModes,
  touchFixedScreenTemplates,
} from '../src/families/touch/fixedscreens.ts';
import { buildTouchStatusScreens, describeTouchStatusScreens, touchStatusScreenModes } from '../src/families/touch/statusscreens.ts';
import { buildTouchHelpScreens, describeTouchHelpScreens, helpScreens, touchHelpScreenModes } from '../src/families/touch/helpscreens.ts';
import { buildTouchActivityMenu, describeTouchActivityMenu } from '../src/families/touch/activitymenu.ts';
import { buildTouchDeviceLists, describeTouchDeviceLists, touchDeviceLists } from '../src/families/touch/devicelists.ts';
import { CLOCK_HEADER_PICTURES, CLOCK_HEADER_PROGRAMS, buildTouchClockHeader, describeTouchClockHeader, touchClockHeaderEntries } from '../src/families/touch/clockheader.ts';
import { TOUCH_HIT_PAGES, buildTouchHitPages, describeTouchHitPages } from '../src/families/touch/hitpages.ts';
import { touchRedrawStarters } from '../src/families/touch/emptywiring.ts';
import { touchActivityMenu } from '../src/families/touch/activityscreen.ts';
import { templateNumberSlots } from '../src/families/touch/screentemplate.ts';
import {
  type ScreenWalk, type TouchScreenSet, TouchNumbering, readKeys, screenSetWalks,
} from '../src/families/touch/numbering.ts';
import {
  BLANK_TIMERS, EMPTY_TOUCH_FONTS, EMPTY_TOUCH_SCREENS, emptyTouchNumbering, emptyTouchSpecs,
} from '../src/families/touch/emptynumbering.ts';

/** The sixteen English compiles of skin 54, section 405. */
const SIXTEEN = ['harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;

/**
 * Per compile in `SIXTEEN`' order: the names read, the numbers compared, the numbers among them that are lists the
 * screens own, and how many distinct lists those are.
 */
const KEYS = [151, 129, 254, 286, 187, 187, 286, 575, 582, 393, 95, 150, 202, 198, 187, 216];
const COMPARED = [2606, 2519, 3319, 3481, 2819, 2819, 3481, 5025, 5039, 4081, 2361, 2604, 2855, 2916, 2819, 2970];
const LIST_NUMBERS = [1210, 1185, 1423, 1473, 1275, 1275, 1473, 1929, 1929, 1645, 1140, 1210, 1284, 1301, 1275, 1317];
const LISTS = [868, 841, 1067, 1117, 929, 929, 1117, 1573, 1573, 1289, 797, 868, 942, 953, 929, 971];

/** The fixed screens' font roles `compiled_protocols` holds at other indices than `harvest_one_two_devices`. */
const FIXED_FONTS_MOVED: readonly string[] = ['count', 'item', 'key', 'wide'];

const containers = new Map<string, Container>();
/** A compile parsed once for the whole file, since four tests read the sixteen and each read is seconds. */
const containerOf = (name: string): Container => {
  const held = containers.get(name) ?? parse(load(name) as Uint8Array);
  containers.set(name, held);
  return held;
};
const reads = new Map<Container, ReturnType<typeof readOffOnce>>();
/** `readOffOnce`, once per compile. */
function readOff(c: Container): ReturnType<typeof readOffOnce> {
  const held = reads.get(c) ?? readOffOnce(c);
  reads.set(c, held);
  return held;
}

/** Every set's numbers read off a compile, in each set's description order, and the forms its templates take. */
function readOffOnce(c: Container): { walks: Record<TouchScreenSet, ScreenWalk[]>; read: Record<TouchScreenSet, number[][]> } {
  const layout = takeApart(c);
  const fixed = describeTouchFixedScreens(c, layout).spec;
  const help = describeTouchHelpScreens(c, layout).spec;
  const menu = describeTouchActivityMenu(c, layout).spec;
  const lists = describeTouchDeviceLists(c, layout).spec;
  const clock = describeTouchClockHeader(c, layout).spec;
  const walks = screenSetWalks({
    year: fixed.year, tour: fixed.tour, helpDevices: help.devices, activities: menu.rows, deviceLists: lists.lists, hours: clock.hours,
  });
  const numbersOf = (screens: readonly { numbers: number[] }[]): number[][] => screens.map((one) => one.numbers);
  return {
    walks,
    read: {
      firmware: numbersOf(describeTouchFirmwareScreens(c, layout).spec.screens),
      fixed: numbersOf(fixed.screens),
      status: numbersOf(describeTouchStatusScreens(c, layout).spec.screens),
      help: numbersOf(help.screens),
      'activity menu': numbersOf(menu.screen.screens),
      'device lists': numbersOf(lists.screen.screens),
      clock: clock.calls,
    },
  };
}

/** Every name's value, read across every set of a compile. */
function keysOf(walks: Record<TouchScreenSet, ScreenWalk[]>, read: Record<TouchScreenSet, number[][]>): Map<string, number> {
  const keys = new Map<string, number>();
  for (const [set, list] of Object.entries(walks) as [TouchScreenSet, ScreenWalk[]][]) {
    list.forEach((walk, k) => readKeys(walk, read[set][k] as number[], keys));
  }
  return keys;
}

/** A list index the numbering hands out: far past any compile's, so it can never equal one by chance. */
const FRESH = 1_000_000;

/**
 * The sets' numbers made again from `keys` and compared with `read`: a number a name gives must be equal, and a list
 * of the screens' own must map one to one onto the compile's. Returns the counts and the mismatches.
 */
function renumber(walks: Record<TouchScreenSet, ScreenWalk[]>, read: Record<TouchScreenSet, number[][]>, keys: ReadonlyMap<string, number>):
  { compared: number; lists: number; listNumbers: number; bad: string[] } {
  let next = FRESH;
  const numbering = new TouchNumbering(keys, () => next++);
  const all = Object.entries(walks) as [TouchScreenSet, ScreenWalk[]][];
  for (const [, list] of all) for (const walk of list) numbering.collect(walk);
  const mine = new Map<number, number>();
  const theirs = new Map<number, number>();
  let compared = 0;
  let listNumbers = 0;
  const bad: string[] = [];
  for (const [set, list] of all) {
    list.forEach((walk, k) => {
      const made = numbering.numbers(walk);
      const got = read[set][k] as number[];
      assert.equal(made.length, got.length, `${walk.name}'s walk`);
      made.forEach((value, j) => {
        compared += 1;
        const was = got[j] as number;
        if (value < FRESH) {
          if (value !== was) bad.push(`${set} ${walk.name} #${j}: ${value} for ${was}`);
          return;
        }
        listNumbers += 1;
        if ((mine.get(value) ?? was) !== was || (theirs.get(was) ?? value) !== value) bad.push(`${set} ${walk.name} #${j}: list ${was}`);
        mine.set(value, was);
        theirs.set(was, value);
      });
    });
  }
  return { compared, lists: mine.size, listNumbers, bad };
}

// ---------------------------------------------------------------------------------------------------------
// The closure on Logitech's compiles.

test('on all sixteen English compiles, every number of every screen set an empty One holds is made again from its names', skipUnless(...SIXTEEN), () => {
  const got = SIXTEEN.map((name) => {
    const { walks, read } = readOff(containerOf(name));
    const keys = keysOf(walks, read);
    const result = renumber(walks, read, keys);
    assert.deepEqual(result.bad, [], name);
    return { keys: keys.size, compared: result.compared, lists: result.lists, listNumbers: result.listNumbers };
  });
  assert.deepEqual(got.map((one) => one.keys), KEYS);
  assert.deepEqual(got.map((one) => one.compared), COMPARED);
  assert.deepEqual(got.map((one) => one.lists), LISTS);
  // Of the numbers compared, those that are lists the screens own, numbered by the rule; the rest are names' values,
  // read off the compile itself, for which the closure checks only that one name is one number.
  assert.deepEqual(got.map((one) => one.listNumbers), LIST_NUMBERS);
});

test('control: the names read off one compile do not number another', skipUnless('harvest_one_two_devices', 'compiled_protocols'), () => {
  const donor = readOff(containerOf('harvest_one_two_devices'));
  const other = readOff(containerOf('compiled_protocols'));
  // Every name the other's sets take, valued as the donor values it where the donor holds one.
  const keys = keysOf(other.walks, other.read);
  for (const [key, value] of keysOf(donor.walks, donor.read)) if (keys.has(key)) keys.set(key, value);
  const result = renumber(other.walks, other.read, keys);
  assert.equal(result.bad.length, 1502);
});

test('the Day pickers each hold their own lists, though the three hold the same, on all sixteen', skipUnless(...SIXTEEN), () => {
  // What a rule sharing every called list by content alone would merge: three lists of one content per compile, at
  // the two places a Day picker holds whole, the field's entering list and the clock handler's middle list. Measured,
  // section 432.
  const days = ['Day 28', 'Day 30', 'Day 31'].map((name) => TOUCH_FIXED_SCREENS.indexOf(name));
  const slots = templateNumberSlots(touchFixedScreenTemplates(2026, true)[days[0] as number] as never);
  const places = [2, 15];
  for (const at of places) assert.equal((slots[at] as { kind: string }).kind, 'owns');
  for (const name of SIXTEEN) {
    const c = containerOf(name);
    const lists = c.actionLists() ?? [];
    const fixed = describeTouchFixedScreens(c, takeApart(c)).spec;
    for (const at of places) {
      const indices = days.map((k) => fixed.screens[k]?.numbers[at] as number);
      assert.equal(new Set(indices).size, 3, `${name} slot ${at}`);
      assert.equal(new Set(indices.map((index) => JSON.stringify(lists[index]))).size, 1, `${name} slot ${at}`);
    }
  }
});

// ---------------------------------------------------------------------------------------------------------
// The names against readers that find them another way.

test('every name read off the sixteen is what an independent reader finds', skipUnless(...SIXTEEN), () => {
  const kinds = new Map<string, number>();
  for (const name of SIXTEEN) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const { walks, read } = readOff(c);
    const keys = keysOf(walks, read);
    const wiring = describeTouchWiring(layout);
    const listNames = new Map([...buildTouchWiring(wiring).listNames].map(([index, list]) => [list, index]));
    const records = stateRecords(c) ?? [];
    const roles = touchValueMapRoles(c).records;
    const fixedModes = touchFixedScreenModes(c);
    const starters = touchRedrawStarters(c);
    const entries = touchClockHeaderEntries(c).entries;
    const idle = touchDeviceLists(c).find((one) => one.idle === true)?.mode;
    const help = describeTouchHelpScreens(c, layout).spec.devices;
    const helpModes = new Map(helpScreens(help).map((one, k) => [one.name, touchHelpScreenModes(c).modes[k] as number]));
    const hourList = describeStateTables(layout, TOUCH_STATE_TABLES).hourList;
    const variable = (key: string): number => {
      const held = wiring.variables[key];
      if (held !== undefined) return held;
      if (key === 'clock picker') {
        // The compiler's first two byte variable, `FIRST_WIDE_VARIABLE`: at `narrow`, 0 to 65277.
        const narrow = stateTable(c)?.narrow as number;
        assert.deepEqual([records[narrow]?.first, records[narrow]?.second], [0, 65277], name);
        return narrow;
      }
      throw new Error(key);
    };
    for (const [key, value] of keys) {
      const [kind, ...rest] = key.split(' ');
      const what = rest.join(' ');
      kinds.set(kind as string, (kinds.get(kind as string) ?? 0) + 1);
      if (kind === 'list') {
        // The hour list is the state tables', which name it as the list the hour calls on rolling over.
        assert.equal(value, what === 'hour' ? hourList : listNames.get(what), `${name} ${key}`);
      } else if (kind === 'variable') {
        // The Time of Day picker's is no wiring's: it is the one 0 to 1 variable unnamed past the wiring's.
        if (what === 'time of day') assert.deepEqual([records[value]?.first, records[value]?.second], [0, 1], `${name} ${key}`);
        else if (what === 'assistantStep') {
          assert.equal(value, variable(what), `${name} ${key}`);
          assert.deepEqual([records[value]?.first, records[value]?.second], [0, 3], `${name} ${key}`);
        }
        else assert.equal(value, variable(what), `${name} ${key}`);
      } else if (kind === 'map') {
        const [role, on] = what.split(' on ') as [string, string];
        assert.equal(value >> 8, roles.get(role as never), `${name} ${key}`);
        assert.equal(value & 0xff, variable(on), `${name} ${key}`);
      } else if (kind === 'mode') {
        if (what === 'idle device list') assert.equal(value, idle, `${name} ${key}`);
        else if (helpModes.has(what)) assert.equal(value, helpModes.get(what), `${name} ${key}`);
        else if (what === 'Remote Assistant start') assert.equal(TOUCH_FIXED_SCREENS.includes(what), false);
        else assert.equal(value, fixedModes[TOUCH_FIXED_SCREENS.indexOf(what)], `${name} ${key}`);
      } else if (kind === 'timer' && rest[0] === 'of') {
        const screen = rest.slice(1).join(' ');
        const blank = /^fixed:(Blank \d)$/.exec(screen);
        if (blank !== null) assert.equal(wiring.timers[value], BLANK_TIMERS[blank[1] as string], `${name} ${key}`);
        else {
          // A redraw timer: one the screen's own mode starts on entering; for the status screens, every one of the
          // twenty nine.
          const modes = screen.startsWith('fixed:') ? [fixedModes[TOUCH_FIXED_SCREENS.indexOf(screen.slice(6))] as number]
            : screen.startsWith('firmware:') ? [TOUCH_FIRMWARE_SCREENS.indexOf(screen.slice(9))]
              : screen === 'status:every' ? touchStatusScreenModes(c)
                : screen === 'help:attempt' ? [touchHelpScreenModes(c).modes[0] as number]
                  : screen === 'help:after' ? touchHelpScreenModes(c).modes.slice(1)
                    : screen === 'activity menu' ? [touchActivityMenu(c) as number]
                      : screen === 'idle device list' ? [idle as number] : [];
          assert.notEqual(modes.length, 0, `${name} ${key}`);
          for (const mode of modes) assert.equal(starters.get(value)?.includes(mode), true, `${name} ${key} mode ${mode}`);
        }
      } else if (kind === 'timer') {
        assert.equal(wiring.timers[value], what, `${name} ${key}`);
      } else if (kind === 'program') {
        assert.equal(value, entries[CLOCK_HEADER_PROGRAMS.indexOf(what as never)], `${name} ${key}`);
      } else assert.equal(kind, 'setup', `${name} ${key}`);
    }
  }
  // How many names of each kind the sixteen read, summed.
  assert.deepEqual(Object.fromEntries([...kinds].sort()), { list: 169, map: 128, mode: 587, program: 64, setup: 2313, timer: 561, variable: 256 });
});

test('the fonts an empty One states are the ones harvest_one_two_devices\' descriptions read, the compile whose order 7.1.1\'s table took', skipUnless('harvest_one_two_devices'), () => {
  const c = containerOf('harvest_one_two_devices');
  const layout = takeApart(c);
  const pick = (fonts: Record<string, number>, of: Record<string, number>): Record<string, number> =>
    Object.fromEntries(Object.keys(of).map((role) => [role, fonts[role] as number]));
  assert.deepEqual(pick(describeTouchFirmwareScreens(c, layout).spec.fonts, EMPTY_TOUCH_FONTS.firmware), EMPTY_TOUCH_FONTS.firmware);
  assert.deepEqual(pick(describeTouchFixedScreens(c, layout).spec.fonts, EMPTY_TOUCH_FONTS.fixed), EMPTY_TOUCH_FONTS.fixed);
  assert.deepEqual(pick(describeTouchStatusScreens(c, layout).spec.fonts, EMPTY_TOUCH_FONTS.status), EMPTY_TOUCH_FONTS.status);
  assert.deepEqual(pick(describeTouchHelpScreens(c, layout).spec.fonts, EMPTY_TOUCH_FONTS.help), EMPTY_TOUCH_FONTS.help);
  assert.deepEqual(pick(describeTouchActivityMenu(c, layout).spec.screen.fonts, EMPTY_TOUCH_FONTS['activity menu']), EMPTY_TOUCH_FONTS['activity menu']);
  assert.deepEqual(pick(describeTouchDeviceLists(c, layout).spec.screen.fonts, EMPTY_TOUCH_FONTS['device lists']), EMPTY_TOUCH_FONTS['device lists']);
  assert.deepEqual(pick(describeTouchClockHeader(c, layout).spec.fonts, EMPTY_TOUCH_FONTS.clock), EMPTY_TOUCH_FONTS.clock);
});

test('control: a compile holding the table in another order reads other fonts', skipUnless('compiled_protocols'), () => {
  // The sixteen hold the stated sets in eight orders, section 427, so the indices are one compile's and not a rule.
  const c = containerOf('compiled_protocols');
  const fonts = describeTouchFixedScreens(c, takeApart(c)).spec.fonts;
  const differ = Object.entries(EMPTY_TOUCH_FONTS.fixed).filter(([role, index]) => fonts[role as keyof typeof fonts] !== index).map(([role]) => role);
  assert.deepEqual(differ, FIXED_FONTS_MOVED);
});

test('control: Options\' two hit pages the other way round are not its pages', skipUnless('harvest_one_two_devices'), () => {
  const c = containerOf('harvest_one_two_devices');
  const layout = takeApart(c);
  const hits = describeTouchHitPages(c, layout).spec;
  const index = (shape: string): number => hits.indices[(hits.names ?? TOUCH_HIT_PAGES).indexOf(shape)] as number;
  const options = describeTouchFixedScreens(c, layout).spec.screens[TOUCH_FIXED_SCREENS.indexOf('Options')]?.leads;
  assert.deepEqual(options, ['three rows', 'two rows'].map(index));
  assert.notDeepEqual(options, ['two rows', 'three rows'].map(index));
});

test('every firmware and fixed page is touched through the hit page its shape names, on all sixteen', skipUnless(...SIXTEEN), () => {
  let pages = 0;
  for (const name of SIXTEEN) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const hits = describeTouchHitPages(c, layout).spec;
    const index = (shape: string): number => hits.indices[(hits.names ?? TOUCH_HIT_PAGES).indexOf(shape)] as number;
    describeTouchFirmwareScreens(c, layout).spec.screens.forEach((one, mode) => {
      assert.equal(one.hitPage, index(TOUCH_FIRMWARE_HIT_PAGES[mode] as string), `${name} firmware ${mode}`);
      pages += 1;
    });
    const fixed = describeTouchFixedScreens(c, layout).spec;
    const shapes = touchFixedHitPages(fixed.year, fixed.tour);
    fixed.screens.forEach((one, k) => {
      assert.deepEqual(one.leads, (shapes[k] as string[]).map(index), `${name} ${TOUCH_FIXED_SCREENS[k]}`);
      pages += one.leads.length;
    });
  }
  // Ten firmware pages and forty eight fixed ones, Options having two with the tour's rows.
  assert.equal(pages, 16 * (10 + 48));
});

// ---------------------------------------------------------------------------------------------------------
// The empty One.

test('an empty One numbers sixty seven modes, thirty nine variables and fourteen hit pages, each once', () => {
  const n = emptyTouchNumbering({ year: 2026 });
  assert.equal(n.modes.size, 67);
  // The fixed screens' names are the same with Options of one page, which the empty One's keys rely on.
  assert.deepEqual(touchFixedScreenTemplates(2026, false).map((one) => one.name), TOUCH_FIXED_SCREENS);
  assert.deepEqual([...n.modes.values()], Array.from({ length: 67 }, (_, k) => k));
  // The event map's: code n at 10 + n, code 9 the fixed screens' "LCD Module Failed".
  assert.equal(n.modes.get('fixed:LCD Module Failed'), 19);
  assert.equal(n.modes.get('status:29'), 39);
  // The firmware's eighteen, the wiring's eighteen, the assistant's and Time of Day's, then the clock pickers' two byte one.
  assert.equal(n.variables.length, 20);
  assert.deepEqual(n.variables.slice(18).map(([name, spec]) => [name, spec.first, spec.max]), [['assistantStep', 0, 3], ['time of day', 0, 1]]);
  assert.equal(n.clockPicker, 38);
  // The thirty nine are distinct: the firmware's 0 to 17 and the twenty one this numbers at 18 to 38.
  const variables = [...n.keys].filter(([key]) => key.startsWith('variable ')).map(([, value]) => value).sort((a, b) => a - b);
  assert.deepEqual(variables, Array.from({ length: 21 }, (_, k) => 18 + k));
  assert.equal(TOUCH_STATE_TABLES.firmwareVariables + n.variables.length + 1, 39);
  assert.equal(n.hitPages.size, 14);
  const leads = new Set(Object.values(n.screens).flatMap((list) => list.flatMap((one) => one.leads)));
  assert.deepEqual([...leads].sort((a, b) => a - b), Array.from({ length: 14 }, (_, k) => k));
  // Every screen once, at the mode `EMPTY_TOUCH_SCREENS` gives it.
  const screens = Object.values(n.screens).flat();
  assert.equal(screens.length, 67);
  assert.deepEqual(screens.map((one) => one.mode).sort((a, b) => a - b), Array.from({ length: 67 }, (_, k) => k));
  for (const one of screens) assert.equal(EMPTY_TOUCH_SCREENS[one.mode], one.key);
});

test('an empty One\'s screens own 790 lists, numbered end to end after the wiring\'s, and every set builds from its descriptions', skipUnless('harvest_one_two_devices'), () => {
  const n = emptyTouchNumbering({ year: 2026 });
  assert.equal(n.wiring.nextList, 524);
  assert.equal(n.nextList - n.wiring.nextList, 790);
  // A stand in for every picture: the builders take where it is, and the look is 7.1.2's.
  const stand = (): PieceTarget => ({ to: { bytes: new Uint8Array([0]), refs: [], owner: 'picture-bank' }, offset: 0 });
  const specs = emptyTouchSpecs(n, {
    picture: stand,
    clock: { programs: CLOCK_HEADER_PROGRAMS.map(() => []), slots: Array.from({ length: CLOCK_HEADER_PICTURES }, stand) },
  });
  // The spelling is the only thing the builders take from a configuration; any English compile spells these words.
  const c = containerOf('harvest_one_two_devices');
  const built: Map<number, ContainerPiece>[] = [
    n.wiring.lists,
    buildTouchFirmwareScreens(c, specs.firmware).lists,
    buildTouchFixedScreens(c, specs.fixed).lists,
    buildTouchStatusScreens(c, specs.status).lists,
    buildTouchHelpScreens(c, specs.help).lists,
    buildTouchActivityMenu(c, specs.activityMenu).screens.lists,
    buildTouchDeviceLists(c, specs.deviceLists).screens.lists,
    buildTouchClockHeader(c, specs.clock).lists,
  ];
  // A list two builders build is the same list: the three key lights' off lists, the page keys', channel 5's and
  // channel 7's, which the leaving lists of several sets call, and the clock's hour list, which the wiring builds for
  // the state tables and the clock header for its call; six builds past the first.
  const lists = new Map<number, string>();
  let twice = 0;
  const shared = new Set<number>();
  for (const one of built) {
    for (const [index, piece] of one) {
      const bytes = Buffer.from(piece.bytes).toString('hex');
      const was = lists.get(index);
      if (was !== undefined) {
        assert.equal(bytes, was, `list ${index}`);
        twice += 1;
        shared.add(index);
      }
      lists.set(index, bytes);
    }
  }
  assert.equal(twice, 6);
  assert.deepEqual([...shared].sort((a, b) => a - b), [n.wiring.hourList.index, 525, 539, 604]);
  // The firmware's own lists at 0 upward, the wiring's after them, and the screens' after the wiring's: base slot 10
  // whole, every index built and none past the last.
  assert.deepEqual([...lists.keys()].sort((a, b) => a - b), Array.from({ length: n.nextList }, (_, k) => k));
  assert.equal(TOUCH_FIRMWARE_OWN_LISTS, 178);
  // The table's hit pages: every one the sets' own builders do not build.
  assert.equal(buildTouchHitPages(specs.hitPages).runs.size, 10);
});

test('control: an empty One holds no setup, so a screen set with an activity on its menu is refused a number', () => {
  const n = emptyTouchNumbering({ year: 2026 });
  const walks = screenSetWalks({ ...n.forms, activities: ['Watch TV'] });
  const numbering = new TouchNumbering(n.keys, () => 0);
  for (const walk of walks['activity menu']) numbering.collect(walk);
  assert.throws(() => numbering.numbers(walks['activity menu'][0] as ScreenWalk), (e: unknown) => e instanceof ScreenRecordError && /holds no setup/.test(e.message));
});

test('control: a walk collected after the first is numbered is refused', () => {
  const n = emptyTouchNumbering({ year: 2026 });
  const walks = screenSetWalks(n.forms);
  const numbering = new TouchNumbering(n.keys, () => 0);
  numbering.collect(walks.status[0] as ScreenWalk);
  numbering.numbers(walks.status[0] as ScreenWalk);
  assert.throws(() => numbering.collect(walks.status[1] as ScreenWalk), ScreenRecordError);
});

test('control: a walk collected twice is refused, and so is one numbered without being collected', () => {
  const n = emptyTouchNumbering({ year: 2026 });
  const walks = screenSetWalks(n.forms);
  const numbering = new TouchNumbering(n.keys, () => 0);
  numbering.collect(walks.status[0] as ScreenWalk);
  assert.throws(() => numbering.collect(walks.status[0] as ScreenWalk), ScreenRecordError);
  assert.throws(() => numbering.numbers(walks.status[1] as ScreenWalk), ScreenRecordError);
});

test('a build year offering a leap year, refused until section 434, numbers the leap year\'s Month picker and the Day 29 picker after the other fixed screens, 69 modes', () => {
  const n = emptyTouchNumbering({ year: 2027 });
  assert.equal(n.modes.size, 69);
  assert.equal(n.screens.fixed.length, 25);
  assert.equal(n.modes.get('fixed:Month in a leap year'), 65);
  assert.equal(n.modes.get('fixed:Day 29'), 66);
  // Every mode a year with no leap year numbers below them keeps its number.
  const plain = emptyTouchNumbering({ year: 2026 });
  for (const [key, mode] of plain.modes) if (mode < 65) assert.equal(n.modes.get(key), mode, key);
});
