/**
 * Help and the Remote Assistant on the Harmony 600, 650 and 700, and their absence from a composed
 * activity: todo-compile-650 3.13 and 4.3.2, section 333.
 *
 * Help is scan 3. What it does is decided by which key map holds the key, and the firmware walks a
 * stack: the page, the mode, then base slot 9 entries the configuration pushed, of which exactly one
 * is the running activity's (or the idle one's while nothing runs). The tests below measure where scan
 * 3 is bound on Logitech's thirteen compiles and then check that a composed activity binds it nowhere
 * and reaches its working screen with no Remote Assistant question, which is the form `h600_config`
 * compiles for its three activities.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  activities,
  activityBindings,
  activityKeysFromRoles,
  activityRolesFromSends,
  characterMap,
  composeActivity,
  composeActivityDeviceList,
  composeActivityMenuRow,
  composeActivityScreen,
  type Container,
  deviceListRows,
  handlerSetRoles,
  handlerSets,
  modeRecords,
  nextActivityValue,
  parse,
  payloadOf,
  screenStrings,
  stateRecords,
  taggedList,
} from '../src/index.ts';
import { startTargets } from './tagfive.ts';

/** The thirteen Logitech compiles section 312 measured, the same population as the inventory test's. */
const COMPILES = ['h600_config', 'calibration_h600', 'h650_config_region',
  'h650_panasonic_config', 'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_config',
  'h700_config_2', 'h700_28_config_region', 'h700_power_hold_compile', 'h700_power_hold_compile_2',
  'h700_power_hold_compile_3', 'h700_power_hold_compile_4'] as const;
/** The four the composer is checked on, one per setup and model, as in `compose.test.ts`. */
const HOSTS = ['h650_config_region', 'h600_config', 'calibration_h600', 'h700_config'] as const;

/** The Help key's scan code, section 323. */
const HELP_SCAN = 3;
/** A key code's event type, the top two bits: release 1, press 2, repeat 3. Section 17. */
const RELEASE = 1;
const PRESS = 2;
const REPEAT = 3;
/** `0x1F` with a high byte of `0xFF` selects the running base slot 9 entry; `0xFE` pushes onto the key stack. */
const SELECT_BAND = 0xff;
const PUSH_BAND = 0xfe;

const load = (name: string): Container => parse(payloadOf(require_(name)));
const isHelp = (tag: number): boolean => (tag & 0x3f) === HELP_SCAN && tag >> 6 !== 0;

/** The text a mode's pages draw, joined, so a screen can be recognised by its words. */
function drawn(c: Container): (mode: number) => string {
  const records = modeRecords(c)!;
  const strings = screenStrings(c, characterMap(c));
  return (mode) => strings.filter((one) => records[mode]?.pages.some((page) => page.program === one.program))
    .map((one) => one.text).join('|');
}

/** Every instruction a configuration can run, in lists, key maps, modes and pages. */
function everyInstruction(c: Container): { opcode: number; operand: number }[] {
  const out: { opcode: number; operand: number }[] = c.actionLists()!.flat();
  for (const address of handlerSets(c)!.addresses) out.push(...taggedList(c, address as number)!.entries);
  for (const record of modeRecords(c)!) {
    out.push(...record.entries);
    for (const page of record.pages) out.push(...taggedList(c, page.list)!.entries);
  }
  return out;
}

test('section 333: among the key maps only the activity and idle ones bind Help, no device mode binds it, and the screens that do are help, delay and status screens, on all thirteen compiles',
     skipUnless(...COMPILES), () => {
  const count = { activityEntries: 0, attempting: 0, delayFixing: 0, idleEntries: 0, idleMapped: 0,
    otherEntriesBinding: 0, deviceModes: 0, deviceModesBinding: 0, prefixPressesShared: 0, rows: 0, rowsSelecting: 0,
    modesBindingHelp: 0, ownScreensBindingHelp: 0 };
  for (const name of COMPILES) {
    const c = load(name);
    const lists = c.actionLists()!;
    const sets = handlerSets(c)!;
    const roles = handlerSetRoles(c);
    const text = drawn(c);
    const activitySets = new Set(activities(c).map((one) => one.set));
    sets.addresses.forEach((address, index) => {
      const entries = taggedList(c, address as number)!.entries;
      const help = entries.filter((one) => isHelp(one.tag) && one.tag >> 6 !== PRESS);
      if (activitySets.has(index)) {
        count.activityEntries += 1;
        // The release enters the activity's own "Attempting to fix the problem" screen and the repeat
        // the delay fixing menu; which of the two a short press and a hold produce is not read here.
        assert.deepEqual(help.map((one) => one.tag >> 6).sort(), [RELEASE, REPEAT], `${name} entry ${index}`);
        const release = help.find((one) => one.tag >> 6 === RELEASE)!;
        if (release.opcode === 0x7e && text(release.operand).startsWith('Attempting to fix')) count.attempting += 1;
        const repeat = lists[help.find((one) => one.tag >> 6 === REPEAT)!.operand]!;
        if (repeat.length === 2 && repeat[0]!.opcode === 0x07 && repeat[0]!.operand === 0xfffd
            && repeat[1]!.opcode === 0x7e && text(repeat[1]!.operand).startsWith('Delay Fixing')) count.delayFixing += 1;
      } else if (roles[index] === 'idle') {
        count.idleEntries += 1;
        assert.deepEqual(help.map((one) => one.tag >> 6).sort(), [RELEASE, REPEAT], `${name} idle entry`);
        // Through a value map: a one case map on CurrentLocation into the idle entry's own "Attempting to fix".
        if (help.find((one) => one.tag >> 6 === RELEASE)!.opcode === 0x72) count.idleMapped += 1;
      } else if (help.length > 0) {
        count.otherEntriesBinding += 1;
      }
    });
    // The prefix entries 2 and 3 bind the press of every one of the 54 scans to two lists and to
    // one, so Help's press there is every key's press and not Help's.
    for (const index of [2, 3]) {
      const presses = taggedList(c, sets.addresses[index] as number)!.entries.filter((one) => one.tag >> 6 === PRESS);
      const lists = new Set(presses.map((one) => one.operand));
      if (presses.length === 54 && lists.size === (index === 2 ? 2 : 1)) count.prefixPressesShared += 1;
    }
    // Device mode: the record a device list row enters and every page of it.
    const records = modeRecords(c)!;
    for (const mode of new Set(deviceListRows(c).map((one) => one.mode))) {
      count.deviceModes += 1;
      const record = records[mode]!;
      const bound = [...record.entries, ...record.pages.flatMap((page) => taggedList(c, page.list)!.entries)]
        .filter((one) => (one.tag & 0x3f) === HELP_SCAN && one.tag >> 6 !== 0);
      if (bound.length > 0) count.deviceModesBinding += 1;
    }
    // Entering a device mode selects no key map entry: no list a device list row runs, followed into
    // the lists it calls, selects or pushes one, so the running entry stays the activity's.
    const selects = (list: number, depth: number, seen: Set<number>): boolean => {
      if (seen.has(list) || depth > 6) return false;
      seen.add(list);
      return (lists[list] ?? []).some((one) => (one.opcode === 0x1f && (one.operand >> 8 === SELECT_BAND || one.operand >> 8 === PUSH_BAND))
        || (one.opcode === 0x7f && selects(one.operand, depth + 1, seen)));
    };
    for (const row of deviceListRows(c)) {
      // The row's own binding: its press on the menu page, falling back to the menu mode's own list.
      const menu = records[row.menu]!;
      const tag = (PRESS << 6) | row.scan;
      const entry = taggedList(c, menu.pages[row.page]!.list)!.entries.find((one) => one.tag === tag)
        ?? menu.entries.find((one) => one.tag === tag);
      assert.ok(entry !== undefined, `${name}: row ${row.mode} has a binding`);
      count.rows += 1;
      if ((entry.opcode === 0x1f && (entry.operand >> 8 === SELECT_BAND || entry.operand >> 8 === PUSH_BAND))
          || (entry.opcode === 0x7f && selects(entry.operand, 0, new Set()))) count.rowsSelecting += 1;
    }
    // The modes that do bind Help's release or repeat to something: the remote's own help, delay and
    // status screens. None of them is a device mode, an activity's start up screen or its working
    // screen, which are the screens a composed activity shows.
    const deviceModes = new Set(deviceListRows(c).map((one) => one.mode));
    records.forEach((record, mode) => {
      const bound = [...record.entries, ...record.pages.flatMap((page) => taggedList(c, page.list)!.entries)]
        .some((one) => isHelp(one.tag) && one.tag >> 6 !== PRESS && (one.opcode !== 0 || one.operand !== 0));
      if (!bound) return;
      count.modesBindingHelp += 1;
      const words = text(mode);
      if (deviceModes.has(mode) || words.startsWith('Starting ') || words.endsWith('|Devices')) count.ownScreensBindingHelp += 1;
    });
    // What the key stack can hold: the configuration pushes entries 1 and 2 by number and otherwise
    // only the three indirections, the mode (253), the running entry (254) and the entry `0x1F E8xx`
    // names (252), which is 0, 3 or 4 and none of them binds Help's release or repeat.
    const all = everyInstruction(c);
    const band = (high: number) => [...new Set(all.filter((one) => one.opcode === 0x1f && one.operand >> 8 === high)
      .map((one) => one.operand & 0xff))].sort((a, b) => a - b);
    assert.deepEqual(band(PUSH_BAND), [1, 2, 252, 253, 254], name);
    assert.deepEqual(band(0xe8), [0, 3, 4], name);
    assert.deepEqual(band(SELECT_BAND), [...activitySets, roles.indexOf('idle')].sort((a, b) => a - b), name);
  }
  assert.deepEqual(count, { activityEntries: 40, attempting: 40, delayFixing: 40, idleEntries: 13, idleMapped: 13,
    otherEntriesBinding: 0, deviceModes: 83, deviceModesBinding: 0, prefixPressesShared: 26, rows: 83, rowsSelecting: 0,
    modesBindingHelp: 467, ownScreensBindingHelp: 0 });
});

test('section 333: the Remote Assistant is a branch on one variable at the end of every activity\'s start, on twelve compiles, and h600_config has none of it',
     skipUnless(...COMPILES), () => {
  const count = { activities: 0, direct: 0, branched: 0, assistantScreens: 0, offScreens: 0, variablesFresh: 0 };
  for (const name of COMPILES) {
    const c = load(name);
    const lists = c.actionLists()!;
    const sets = handlerSets(c)!;
    const text = drawn(c);
    const variables = new Set<number>();
    const seen = new Set<number>();
    for (const binding of activityBindings(c)) {
      if (seen.has(binding.set)) continue;
      seen.add(binding.set);
      count.activities += 1;
      const enter = lists[taggedList(c, sets.addresses[binding.set] as number)!.entries.find((one) => one.tag === 1)!.operand]!;
      const deferred = lists[enter.at(-2)!.operand]!;
      assert.deepEqual(deferred[0], { opcode: 0x3f, operand: 0xd000 }, name);
      if (deferred[1]!.opcode === 0x7e) { count.direct += 1; continue; }
      // [1F FB00, 7F branch], branch = [71 80vv, 7E assistant, 7E working]: load 0, compare equal with
      // two arms, so the question shows while the variable is 0.
      const outer = lists[deferred[1]!.operand]!;
      assert.deepEqual(outer[0], { opcode: 0x1f, operand: 0xfb00 }, name);
      const branch = lists[outer[1]!.operand]!;
      assert.equal(branch.length, 3);
      assert.equal(branch[0]!.opcode, 0x71);
      assert.equal(branch[0]!.operand >> 8, 0x80, `${name}: equal, two arms`);
      variables.add(branch[0]!.operand & 0xff);
      assert.ok(text(branch[1]!.operand).startsWith('Remote Assistant|If any devices are not'), name);
      assert.equal(branch[2]!.opcode, 0x7e);
      count.branched += 1;
    }
    const records = modeRecords(c)!;
    const assistant = records.map((_, mode) => text(mode)).filter((one) => one.startsWith('Remote Assistant'));
    count.assistantScreens += assistant.filter((one) => one.includes('not setup correctly') || one.includes('If any devices are not')).length;
    count.offScreens += assistant.filter((one) => one.includes('still On')).length;
    if (name === 'h600_config') {
      assert.equal(variables.size, 0);
      assert.equal(assistant.length, 0, 'h600_config draws no Remote Assistant screen');
      continue;
    }
    assert.equal(variables.size, 1, `${name}: one variable`);
    const variable = [...variables][0]!;
    // Seeded 0, at most 1, no transition, and written only ever to 1: "Turn off Assistant".
    const record = stateRecords(c)![variable]!;
    const writes = lists.flat().filter((one) => one.opcode === 0x80 + variable);
    if (record.first === 0 && record.second === 1 && record.count === 0 && writes.length > 0
        && writes.every((one) => one.operand === 1)) count.variablesFresh += 1;
  }
  assert.deepEqual(count, { activities: 40, direct: 3, branched: 37, assistantScreens: 37, offScreens: 12, variablesFresh: 12 });
});

test('section 333: an activity composed on a Harmony 650, 600 and 700 binds no Help and asks no Remote Assistant question, as h600_config\'s three',
     skipUnless(...HOSTS), () => {
  const reference = load('h600_config');
  const referenceLists = reference.actionLists()!;
  const referenceSets = handlerSets(reference)!;
  // h600_config's three deferred lists, in the form a composed activity is to take.
  const referenceDeferred = [...new Set(activityBindings(reference).map((one) => one.set))].map((set) => {
    const enter = referenceLists[taggedList(reference, referenceSets.addresses[set] as number)!.entries
      .find((one) => one.tag === 1)!.operand]!;
    return referenceLists[enter.at(-2)!.operand]!;
  });
  assert.equal(referenceDeferred.length, 3);
  const count = { composed: 0, helpBindings: 0, deferredAsReference: 0, newModes: 0, newHelpOrAssistant: 0,
    newModesBindingHelp: 0, assistantVariableTouched: 0, logitechHelpBindings: 0 };
  for (const name of HOSTS) {
    const c = load(name);
    const roles = handlerSetRoles(c);
    const logitech = roles.indexOf('activity');
    count.logitechHelpBindings += taggedList(c, handlerSets(c)!.addresses[logitech] as number)!.entries
      .filter((one) => isHelp(one.tag) && one.tag >> 6 !== PRESS).length;
    // The activity the way the bench file composes one: a Logitech activity's targets, its keypad
    // from that activity's roles, four of its device's commands on the screen, a menu row and its own
    // device list where the host has a menu row to give it.
    const targets = startTargets(c, logitech);
    const source = activities(c).find((one) => one.set === logitech)!;
    const keys = activityKeysFromRoles(c, activityRolesFromSends(c, source.activity));
    const deviceMode = modeRecords(c)![deviceListRows(c)[0]!.mode]!;
    const commands = deviceMode.pages.flatMap((page) => taggedList(c, page.list)!.entries.map((one) => one.operand));
    const rows = ['Power', 'Menu', 'Home', 'Info'].map((label, k) => ({ label, list: commands[k]! }));
    const screen = composeActivityScreen(c, nextActivityValue(c), 'Play Audio', rows);
    const built = composeActivity(parse(screen.bytes), {
      label: 'Play Audio', targets, keys,
      screen: {
        startupMode: screen.startupMode, workingMode: screen.mode, activity: screen.activity,
        startVariable: screen.startVariable, flagVariable: screen.flagVariable, set: screen.set,
      },
    });
    const rowed = name === 'calibration_h600' ? parse(built.bytes)
      : parse(composeActivityMenuRow(parse(built.bytes), built.label, built.set).bytes);
    const after = name === 'calibration_h600' ? rowed : parse(composeActivityDeviceList(rowed, built.activity).bytes);
    count.composed += 1;

    const lists = after.actionLists()!;
    const entries = taggedList(after, handlerSets(after)!.addresses[built.set] as number)!.entries;
    count.helpBindings += entries.filter((one) => isHelp(one.tag)).length;
    // The deferred list: [3F D000, 7E working], instruction for instruction h600_config's, the mode
    // being each activity's own.
    const enter = lists[built.enterList]!;
    const deferred = lists[enter.at(-2)!.operand]!;
    if (referenceDeferred.every((one) => one.length === deferred.length && one[0]!.opcode === deferred[0]!.opcode
        && one[0]!.operand === deferred[0]!.operand && one[1]!.opcode === deferred[1]!.opcode)
        && deferred[1]!.operand === screen.mode) count.deferredAsReference += 1;
    // Every mode the composition added: none draws help or assistant text, none binds scan 3 to more
    // than the null instruction the start up screen gives every key.
    const text = drawn(after);
    const before = modeRecords(c)!.length;
    modeRecords(after)!.forEach((record, mode) => {
      if (mode < before) return;
      count.newModes += 1;
      if (/Remote Assistant|Attempting to fix|Help/.test(text(mode))) count.newHelpOrAssistant += 1;
      const bound = [...record.entries, ...record.pages.flatMap((page) => taggedList(after, page.list)!.entries)]
        .filter((one) => isHelp(one.tag) && (one.opcode !== 0 || one.operand !== 0));
      if (bound.length > 0) count.newModesBindingHelp += 1;
    });
    // The assistant's variable, where the host has one, is neither read nor written by the new lists.
    // Read off the Logitech activity's own branch, the way the test above finds it.
    const assistant = (() => {
      const hostLists = c.actionLists()!;
      const hostEnter = hostLists[taggedList(c, handlerSets(c)!.addresses[logitech] as number)!.entries
        .find((one) => one.tag === 1)!.operand]!;
      const hostDeferred = hostLists[hostEnter.at(-2)!.operand]!;
      if (hostDeferred[1]!.opcode !== 0x7f) return undefined;
      return hostLists[hostLists[hostDeferred[1]!.operand]![1]!.operand]![0]!.operand & 0xff;
    })();
    assert.equal(assistant === undefined, name === 'h600_config', name);
    if (assistant !== undefined) {
      for (const list of lists.slice(c.actionLists()!.length)) {
        if (list.some((one) => one.opcode === 0x80 + assistant
            || ((one.opcode === 0x71 || one.opcode === 0x70 || one.opcode === 0x72) && (one.operand & 0xff) === assistant))) {
          count.assistantVariableTouched += 1;
        }
      }
    }
  }
  // Two modes per activity, start up and working, plus its own device list on the three with a row.
  assert.deepEqual(count, { composed: 4, helpBindings: 0, deferredAsReference: 4, newModes: 11, newHelpOrAssistant: 0,
    newModesBindingHelp: 0, assistantVariableTouched: 0, logitechHelpBindings: 8 });
});

test('with MyHarmony\'s Remote Assistant off, Logitech\'s compile drops its six screens and the seven deferred steps leading there, and nothing else changes in count',
  skipUnless('h650_favourites_base', 'h650_assistant_off_config'), async () => {
    // Section 345, todo-compile-650 4.3.2. The same setup on the Harmony 650's test record, read off the
    // remote after MyHarmony's sync with the Assistant on, and compiled by Logitech with it off.
    const { activities, characterMap, modeRecords, screenStrings, stateVariables } = await import('../src/index.ts');
    const shape = (name: string) => {
      const c = parse(require_(name));
      const strings = screenStrings(c, characterMap(c));
      const programs = new Set(strings.filter((s) => /Remote Assistant/.test(s.text)).map((s) => s.program));
      const modes: number[] = [];
      modeRecords(c)!.forEach((m, i) => { if (m.pages.some((p) => programs.has(p.program))) modes.push(i); });
      const lists = c.actionLists()!;
      return {
        assistantScreens: modes.length,
        listsEnteringThem: lists.filter((l) => l.some((x) => x.opcode === 0x7e && modes.includes(x.operand))).length,
        // The deferred step that leads there: 0x71 with 0x8022 after a start, 0x8038 after All Off.
        deferredSteps: lists.filter((l) => l.some((x) => x.opcode === 0x71 && (x.operand === 0x8022 || x.operand === 0x8038))).length,
        modes: modeRecords(c)!.length,
        lists: lists.length,
        variables: stateVariables(c).length,
        activities: activities(c).map((a) => a.name),
      };
    };
    const on = shape('h650_favourites_base');
    const off = shape('h650_assistant_off_config');
    assert.deepEqual([on.assistantScreens, on.listsEnteringThem, on.deferredSteps], [6, 6, 7]);
    assert.deepEqual([off.assistantScreens, off.listsEnteringThem, off.deferredSteps], [0, 0, 0]);
    assert.deepEqual([on.modes - off.modes, on.lists - off.lists], [6, 26]);
    assert.equal(off.variables, on.variables);
    assert.deepEqual(off.activities, on.activities);
  });
