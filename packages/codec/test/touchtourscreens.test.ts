/**
 * The Harmony One's welcome tour and Remote Assistant built from a description, `todo-compile-one.md` 4.4.4.2,
 * findings section 412: the tour's eleven screens always, and the assistant's five where the wiring keeps the
 * start's ladder on its variable, section 410's `startupAssistant`.
 *
 * **The blind control makes "generated" a test**, as sections 409 and 411 did: every byte of the screens the
 * description does not read is overwritten, in the file the description reads and the fonts are spelled from
 * and in the layout's own pieces, and the sixteen still come back byte for byte. The description still finds
 * its way through the container itself, which tag is where and how long a list is, and the modes through the
 * container and its wiring.
 *
 * Every figure is exact, and the populations are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type ContainerPiece, ScreenRecordError, attributeScreens, householdNames, layOutContainer, modeRecords, parse,
  SCREEN_CALL, characterMap, decode, handlerSets, screenProgram, screenUnits, stateRecords, taggedList, takeApart, valueMaps,
} from '../src/index.ts';
import {
  TOUCH_ASSISTANT_SCREENS, TOUCH_TOUR_SCREENS, buildTouchTourScreens, checkTouchTourScreens, describeTouchTourScreens,
  touchTourScreenModes, withTouchTourScreens,
} from '../src/families/touch/tourscreens.ts';
import { TOUCH_FIXED_SCREENS, describeTouchFixedScreens, touchFixedScreenModes } from '../src/families/touch/fixedscreens.ts';
import { touchStartupVariables, withoutStartupAssistant } from '../src/families/touch/startupassistant.ts';
import { describeTouchWiring } from '../src/families/touch/wiring.ts';
import { textGlyphs } from '../src/shared/spelling.ts';
import { listsBelow, namedByRecords } from './screenlists.ts';

/** The first offset two files differ at, or undefined where they are the same. */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.max(a.length, b.length);
  for (let at = 0; at < length; at += 1) if (a[at] !== b[at]) return at;
  return undefined;
}

/**
 * The sixteen English compiles of skin 54, section 405, with what each check reads: the bytes of the sixteen
 * screens and the bytes the description reads, which differ by compile because a text is drawn inline or by
 * reference to a copy outside the screens as the compile's other screens fall, and the lists built. Since
 * `todo-compile-one.md` 6.5 those count the lists below the screens the wiring does not build, section 418: 17,
 * 152 bytes of which the description reads 46 and the setting's one byte, on the eleven where "Devices Off
 * Again"'s OK goes on to the tour, and 13, 112 bytes of which it reads 31, on the five where it does not.
 */
const SKIN_54: Readonly<Record<string, { described: number; structure: number; lists: number }>> = {
  harvest_one_two_devices: { described: 734, structure: 4052, lists: 115 },
  one_spare_after_sync: { described: 812, structure: 4001, lists: 115 },
  one_spare_myharmony: { described: 885, structure: 3943, lists: 115 },
  one_spare_20260830: { described: 869, structure: 3903, lists: 111 },
  calibration_one: { described: 823, structure: 3995, lists: 115 },
  calibration_favchannels: { described: 823, structure: 3995, lists: 115 },
  calibration_favzero: { described: 869, structure: 3903, lists: 111 },
  compiled_protocols: { described: 915, structure: 3897, lists: 111 },
  compiled_protocols_2: { described: 915, structure: 3897, lists: 111 },
  compiled_protocols_3: { described: 915, structure: 3897, lists: 111 },
  harvest_one_families_1: { described: 717, structure: 4053, lists: 115 },
  harvest_one_families_2: { described: 717, structure: 4053, lists: 115 },
  harvest_one_families_3: { described: 717, structure: 4053, lists: 115 },
  one_friend_legacy_sync_config: { described: 869, structure: 3954, lists: 115 },
  phase7_before: { described: 823, structure: 3995, lists: 115 },
  phase7_after: { described: 823, structure: 3995, lists: 115 },
};
const NAMES = Object.keys(SKIN_54);

/** The three Harmony One compiles beyond the sixteen: the European factory file and its programmed copy, and the Dutch one. */
const BEYOND = ['one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'];

/** How many modes look like the Remote Assistant's: a chrome titled "PowerOff:", a page opening "Remote Assistant:". */
function assistantLooks(c: ReturnType<typeof parse>): number {
  const map = characterMap(c);
  const words = (address: number): string[] => (screenProgram(c, address) ?? []).flatMap((one) => {
    const glyphs = map === undefined ? undefined : textGlyphs(c, one);
    return glyphs === undefined || map === undefined ? [] : [decode(glyphs, map)];
  });
  return (modeRecords(c) ?? []).filter((record) => {
    const page = record.pages[0];
    if (record.pages.length !== 1 || page === undefined) return false;
    const call = (screenProgram(c, page.program) ?? []).find((one) => one.opcode === SCREEN_CALL);
    return call !== undefined && words(call.targets[0] as number)[0] === 'PowerOff:' && words(page.program)[0] === 'Remote Assistant:';
  }).length;
}

test('todo-compile-one 4.4.4.2 and 6.5: the tour\'s 11 screens and the Remote Assistant\'s 5 of the sixteen English compiles of skin 54 are rebuilt byte for byte from a description, their own 98 lists and 17 below them on eleven, 13 on five',
     skipUnless(...NAMES), () => {
  assert.equal(TOUCH_TOUR_SCREENS.length, 11);
  assert.equal(TOUCH_ASSISTANT_SCREENS.length, 5);
  for (const name of NAMES) {
    assert.deepEqual(checkTouchTourScreens(parse(require_(name))), { screens: 16, ...SKIN_54[name] }, name);
  }
});

test('todo-compile-one 4.4.4.2: beyond the sixteen, the European compiles rebuild too, the everyday One\'s with the tour alone since its wiring keeps no Remote Assistant, and the Dutch compile is refused for its words',
     skipUnless('one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'), () => {
  // The everyday One's tour builds the three lists below it, the off lists of channel 7 and the page keys and
  // what leaving the tour runs, 24 bytes of which 5 are read; the factory file's sixteen the five's 13.
  assert.deepEqual(checkTouchTourScreens(parse(require_('one_config'))), { screens: 11, lists: 69, described: 471, structure: 2819 });
  assert.deepEqual(checkTouchTourScreens(parse(require_('one_config_unprogrammed'))), { screens: 16, lists: 111, described: 800, structure: 3955 });
  assert.throws(() => checkTouchTourScreens(parse(require_('one_friend_asfound_config'))),
    (error: Error) => error instanceof ScreenRecordError && /holds 0 screens of the look of Tour Another Activity, not one/.test(error.message));
});

test('todo-compile-one 4.4.4.2: on all eighteen English compiles the tour\'s eleven are laid out in one order and the wiring decides the Remote Assistant: its ladder on 17 with all five screens, the welcome and "Devices Off" the ladder\'s own, and on the everyday One\'s none of the five and no ladder',
     skipUnless(...NAMES, 'one_config', 'one_config_unprogrammed'), () => {
  const tally = { withLadder: 0, withoutLadder: 0 };
  for (const name of [...NAMES, 'one_config', 'one_config_unprogrammed']) {
    const c = parse(require_(name));
    const layout = takeApart(c);
    const wiring = describeTouchWiring(layout);
    const { modes, assistant } = touchTourScreenModes(c, layout);
    // The finder takes `assistant` from the wiring, so the check is a count by look that does not ask it: the
    // modes whose chrome's title is "PowerOff:" and whose page draws "Remote Assistant:" first.
    assert.equal(assistantLooks(c), wiring.settings.startupAssistant ? 5 : 0, name);
    assert.equal(assistant, wiring.settings.startupAssistant, name);
    // The tour's eleven are laid out in the template's order on every one, if not always at consecutive modes.
    const tour = modes.slice(0, TOUCH_TOUR_SCREENS.length);
    assert.deepEqual(tour, [...tour].sort((a, b) => a - b), name);
    if (!assistant) {
      tally.withoutLadder += 1;
      // The everyday One's compile draws no "Welcome to your remote." and holds none of the five.
      assert.equal(modes.length, 11, name);
      continue;
    }
    tally.withLadder += 1;
    const at = (screen: string): number => modes[[...TOUCH_TOUR_SCREENS, ...TOUCH_ASSISTANT_SCREENS].indexOf(screen)] as number;
    assert.equal(at('Assistant Welcome'), wiring.modes['assistantWelcome'], name);
    assert.equal(at('Assistant Devices Off'), wiring.modes['assistantDevicesOff'], name);
    assert.notEqual(at('Assistant Devices Off Again'), wiring.modes['assistantDevicesOff'], name);
  }
  assert.deepEqual(tally, { withLadder: 17, withoutLadder: 1 });
});

test('todo-compile-one 4.4.4.2: Options\' Tutorial row, scan 49 on its first page, enters the tour\'s "Welcome!" through every call, on the sixteen',
     skipUnless(...NAMES), () => {
  const names = [...TOUCH_TOUR_SCREENS, ...TOUCH_ASSISTANT_SCREENS];
  for (const name of NAMES) {
    const c = parse(require_(name));
    const welcome = touchTourScreenModes(c).modes[names.indexOf('Tour Welcome')];
    const options = (modeRecords(c) ?? [])[touchFixedScreenModes(c)[TOUCH_FIXED_SCREENS.indexOf('Options')] as number];
    const row = taggedList(c, options?.pages[0]?.list as number)?.entries.find((one) => one.tag === (0x80 | 49));
    const lists = c.actionLists() ?? [];
    const seen = new Set<number>();
    const queue = row?.opcode === 0x7f ? [row.operand] : [];
    let enters = false;
    while (queue.length > 0) {
      const index = queue.shift() as number;
      if (seen.has(index)) continue;
      seen.add(index);
      for (const one of lists[index] ?? []) {
        if (one.opcode === 0x7e && one.operand === welcome) enters = true;
        if (one.opcode === 0x7f) queue.push(one.operand);
      }
    }
    assert.ok(enters, name);
  }
});

test('todo-compile-one 4.4.4.2: starting past the Remote Assistant keeps its ladder, which the leftover entry\'s events 1 and 5 still run to the welcome, and Options still writes its variable 1, so the configuration still holds a path to the five and they are still built, on the sixteen',
     skipUnless(...NAMES), () => {
  for (const name of NAMES) {
    const c = parse(require_(name));
    const variable = touchStartupVariables(c).assistant as number;
    const started = withoutStartupAssistant(c);
    // Section 403's choice changes the variable's starting value alone: the wiring keeps its ladder, which
    // enters the welcome at 1 and "Ensure all your devices are off" at 2, and the screens rebuild as before.
    assert.equal((stateRecords(started) ?? [])[variable]?.first, 3, name);
    assert.equal(describeTouchWiring(takeApart(started)).settings.startupAssistant, true, name);
    assert.deepEqual(checkTouchTourScreens(started), { screens: 16, ...SKIN_54[name] }, name);
    // The leftover entry's events 1 and 5 still run the ladder, through every call, to the welcome's enter.
    const wiring = describeTouchWiring(takeApart(started));
    const idle = taggedList(started, (handlerSets(started)?.addresses ?? [])[wiring.entries['idle'] as number] as number)?.entries ?? [];
    const lists = started.actionLists() ?? [];
    for (const tag of [0x01, 0x05]) {
      const seen = new Set<number>();
      const queue = idle.filter((one) => one.tag === tag && one.opcode === 0x7f).map((one) => one.operand);
      let entersWelcome = false;
      while (queue.length > 0) {
        const index = queue.shift() as number;
        if (seen.has(index)) continue;
        seen.add(index);
        for (const one of lists[index] ?? []) {
          if (one.opcode === 0x7e && one.operand === wiring.modes['assistantWelcome']) entersWelcome = true;
          if (one.opcode === 0x7f) queue.push(one.operand);
        }
      }
      assert.ok(entersWelcome, `${name}: event ${tag}`);
    }
    // Options' first row, "Turn Remote Assistant On" at 3, binds scan 48 to `0x72`, the map in its high byte
    // and the variable in its low: the assistant's, whose map runs, at 3, a list writing it 1.
    const options = (modeRecords(c) ?? [])[touchFixedScreenModes(c)[TOUCH_FIXED_SCREENS.indexOf('Options')] as number];
    const lookup = taggedList(c, options?.pages[0]?.list as number)?.entries.find((one) => one.tag === (0x80 | 48));
    assert.ok(lookup !== undefined && lookup.opcode === 0x72 && (lookup.operand & 0xff) === variable, name);
    const arm = (valueMaps(c) ?? [])[lookup.operand >> 8]?.entries.find(([value]) => value === 3)?.[1];
    const at = arm === undefined ? undefined : c.blobOffsetOf(arm);
    assert.ok(at !== undefined && c.blob[at] === 0x11 && c.blob[at + 3] === 0x7f, name);
    const list = (c.actionLists() ?? [])[(c.blob[at + 1] as number) | ((c.blob[at + 2] as number) << 8)] ?? [];
    assert.ok(list.some((one) => one.opcode === 0x80 + variable && one.operand === 1), name);
  }
});

test('todo-compile-one 4.4.4.2: a mode\'s own key map is in the wide form exactly where it binds a state write, one on each of the 18 compiles with a Remote Assistant and none on the everyday One\'s, each binding scan 34\'s press to the write, flagged 1, and the other 90 bindings 0',
     skipUnless(...NAMES, ...BEYOND), () => {
  const count = { wideWithWrite: 0, wideWithout: 0, narrowWithWrite: 0, flagged: 0, unflagged: 0, other: 0 };
  const perCompile: number[] = [];
  const flaggedTags = new Set<number>();
  for (const name of [...NAMES, ...BEYOND]) {
    const c = parse(require_(name));
    perCompile.push((modeRecords(c) ?? []).filter((record) => taggedList(c, record.start)?.wide === true).length);
    for (const record of modeRecords(c) ?? []) {
      const list = taggedList(c, record.start);
      if (list === undefined || list.entries.length === 0) continue;
      const writes = list.entries.some((one) => one.opcode >= 0x80);
      if (!list.wide) { if (writes) count.narrowWithWrite += 1; continue; }
      count[writes ? 'wideWithWrite' : 'wideWithout'] += 1;
      for (const one of list.entries) {
        if (one.flags === (one.opcode >= 0x80 ? 1 : 0)) count[one.flags === 1 ? 'flagged' : 'unflagged'] += 1;
        else count.other += 1;
        if (one.flags === 1) flaggedTags.add(one.tag);
      }
    }
  }
  assert.deepEqual(count, { wideWithWrite: 18, wideWithout: 0, narrowWithWrite: 0, flagged: 18, unflagged: 90, other: 0 });
  // One a compile, the sixteen, then `one_config`, `one_config_unprogrammed` and the Dutch one; always scan 34's press.
  assert.deepEqual(perCompile, [...NAMES.map(() => 1), 0, 1, 1]);
  assert.deepEqual([...flaggedTags], [0x80 | 34]);
});

test('todo-compile-one 4.4.4.2: a blinded input rebuilds all sixteen: no byte of the screens outside the description reaches the build',
     skipUnless(...NAMES), () => {
  const totals = { structure: 0, inside: 0, outside: 0, blinded: 0 };
  for (const name of NAMES) {
    const c = parse(require_(name));
    const first = describeTouchTourScreens(c, takeApart(c));
    totals.structure += first.structure.size;
    // Read inside the screens: the numbering, the fonts, the hit pages, the pictures' and the homes' addresses.
    // Read outside them: the glyph codes of each home, a text another program holds that these draw by reference.
    for (const at of first.described) totals[first.structure.has(at) ? 'inside' : 'outside'] += 1;
    const blinded = c.blob.slice();
    for (const at of first.structure) {
      if (first.described.has(at)) continue;
      blinded[at] = (blinded[at] as number) ^ 0xff;
      totals.blinded += 1;
    }
    const layout = takeApart(c);
    const laid = layOutContainer(layout);
    const pieces = [layout.keyTable, ...layout.body,
      ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
    const starts = pieces.map((piece) => ({ piece, at: laid.offsetOf(piece) as number })).sort((a, b) => a.at - b.at);
    const d = describeTouchTourScreens(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      if (first.described.has(at)) continue;
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = blinded[at] as number;
    }
    const out = layOutContainer(withTouchTourScreens(layout, buildTouchTourScreens(parse(blinded), d.spec), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
  }
  // 63586 bytes of screens over the sixteen, the lists below them among them since section 418, 63586 - 11948 =
  // 51638 of them written by the builder and every one blinded; the description reads 11948 bytes inside them,
  // 672 of those the lists below's numbers and the setting's byte, and 1278 outside, the homes' glyph codes.
  // 61354, 11276 and 50078 before the lists below were built.
  assert.deepEqual(totals, { structure: 63586, inside: 11948, outside: 1278, blinded: 51638 });
});

test('todo-compile-one 4.4.4.2: a description with a timer moved, two screens\' pictures swapped, the welcome\'s variable moved, two tour screens\' modes swapped or the Remote Assistant left out is refused',
     skipUnless('harvest_one_two_devices'), () => {
  const c = parse(require_('harvest_one_two_devices'));
  type Spec = ReturnType<typeof describeTouchTourScreens>['spec'];
  const tamper = (change: (spec: Spec) => void): void => {
    const layout = takeApart(c);
    const d = describeTouchTourScreens(c, layout);
    change(d.spec);
    const out = layOutContainer(withTouchTourScreens(layout, buildTouchTourScreens(c, d.spec), d.place)).bytes;
    if (firstDifference(out, c.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  const names = [...TOUCH_TOUR_SCREENS, ...TOUCH_ASSISTANT_SCREENS];
  const screen = (spec: Spec, name: string): Spec['screens'][number] => spec.screens[names.indexOf(name)] as Spec['screens'][number];
  tamper(() => undefined);
  const moved = /the rebuilt file differs/;
  // The question's enter handler starts the timer its second number names: one on.
  assert.throws(() => tamper((spec) => { screen(spec, 'Assistant Hide Question').numbers[1]! += 1; }), moved);
  // The first two tour screens' pictures the other way round.
  assert.throws(() => tamper((spec) => {
    const [a, b] = [screen(spec, 'Tour Another Activity').pictures, screen(spec, 'Tour Help Button').pictures];
    [a[0], b[0]] = [b[0]!, a[0]!];
  }), moved);
  // The variable the welcome's scan 34 press writes, the assistant's, one on.
  const variable = touchStartupVariables(c).assistant as number;
  assert.throws(() => tamper((spec) => {
    const numbers = screen(spec, 'Assistant Welcome').numbers;
    numbers[numbers.indexOf(variable)]! += 1;
  }), moved);
  // "Another Activity" and "Selecting Watch TV" the other way round in mode order: the second draws "Press the
  // right arrow to" and "continue." by reference to the first's inline copy, so which holds them moves.
  assert.throws(() => tamper((spec) => {
    const [a, b] = [screen(spec, 'Tour Another Activity'), screen(spec, 'Tour Selecting Watch TV')];
    [a.mode, b.mode] = [b.mode, a.mode];
  }), moved);
  // The assistant left out of a configuration whose wiring keeps it: eleven records for sixteen places.
  assert.throws(() => tamper((spec) => { spec.assistant = false; spec.screens.length = 11; }),
    (error: Error) => error instanceof ScreenRecordError && /11 records were built for 16 places/.test(error.message));
});

test('todo-compile-one 4.4.4.2 and 6.5: of the 99 lists the sixteen screens name, the 98 their own are named by nothing outside them and the 99th is named from outside too; the setting read off one byte agrees with the walk: on 11 "Devices Off Again"\'s OK leads on to the tour\'s "Welcome!" and 17 lists are built below, on 5 it does not and 13 are; what is left below is named from outside, so none runs for these screens alone',
     skipUnless(...NAMES), () => {
  const names = [...TOUCH_TOUR_SCREENS, ...TOUCH_ASSISTANT_SCREENS];
  const found = NAMES.map((name) => {
    const c = parse(require_(name));
    const d = describeTouchTourScreens(c, takeApart(c));
    const modeOf = (screen: string): number => (d.spec.screens[names.indexOf(screen)] as { mode: number }).mode;
    // Whether the OK of the second "Ensure all your devices are off" runs, through every call, an enter of the
    // tour's "Welcome!": section 403's twelve compiles that wire it and six that leave its lists uncalled. Walked
    // here over every call, where the description reads one opcode, `onToTour`: two readings of other bytes.
    const lists = c.actionLists() ?? [];
    const ok = taggedList(c, (modeRecords(c) ?? [])[modeOf('Assistant Devices Off Again')]?.pages[0]?.list as number)?.entries[0];
    const seen = new Set<number>();
    const queue = [ok?.operand as number];
    let welcome = false;
    while (queue.length > 0) {
      const index = queue.shift() as number;
      if (seen.has(index)) continue;
      seen.add(index);
      for (const one of lists[index] ?? []) {
        if (one.opcode === 0x7e && one.operand === modeOf('Tour Welcome')) welcome = true;
        if (one.opcode === 0x7f) queue.push(one.operand);
      }
    }
    const modes = new Set(d.spec.screens.map((one) => one.mode));
    const built = new Set(buildTouchTourScreens(c, d.spec).lists.keys());
    const own = namedByRecords(c, modes);
    const below = listsBelow(c, modes, built);
    // The screens' own lists are those their records name, but for the one list below bound directly, "Welcome!"'s
    // leaving list, channel 7's off list, which other screens' lists call too.
    const ownBuilt = [...built].filter((index) => own.has(index));
    return [name, {
      welcome, onToTour: d.spec.onToTour, own: ownBuilt.length, built: built.size, ...below,
      namedFromOutside: below.namedFromOutside.length,
      ownNamedFromOutside: below.namedFromOutside.filter((index) => own.has(index)).length,
    }] as const;
  });
  // Until `todo-compile-one.md` 6.5 the 98 were all the builder made, named by nothing outside, and the walk found
  // 69 lists below them where the OK leads on and 22 where it does not, 56 or 59 and 15 of those shared. Since
  // section 418 the lists below that the wiring does not build are built too, and of all built `namedFromOutside`
  // are named directly from outside as well: the off lists of the page keys, of channel 5 and of channel 7 and,
  // where the OK leads on, the list turning the Remote Assistant on, each reached by the fixed screens too, and on
  // twelve compiles, seven where the OK leads on and all five where it does not, the list "Hide Question"'s Yes
  // runs, named by an activity's own assistant screen. The one own
  // list named from outside is channel 7's off list, which "Welcome!" binds directly. What is left below, 52 or 9
  // lists, is the wiring's, `touchbelowlists.test.ts`, every one named from outside.
  const leads = { welcome: true, onToTour: true, own: 99, built: 115, ownNamedFromOutside: 1, below: 52, shared: 11, sharedBelow: 52 };
  const stops = { welcome: false, onToTour: false, own: 99, built: 111, ownNamedFromOutside: 1, below: 9, shared: 6, sharedBelow: 9, namedFromOutside: 4 };
  assert.deepEqual(Object.fromEntries(found), {
    harvest_one_two_devices: { ...leads, namedFromOutside: 4 },
    one_spare_after_sync: { ...leads, namedFromOutside: 5 },
    one_spare_myharmony: { ...leads, namedFromOutside: 5 },
    one_spare_20260830: stops,
    calibration_one: { ...leads, namedFromOutside: 5 },
    calibration_favchannels: { ...leads, namedFromOutside: 5 },
    calibration_favzero: stops,
    compiled_protocols: stops,
    compiled_protocols_2: stops,
    compiled_protocols_3: stops,
    harvest_one_families_1: { ...leads, namedFromOutside: 4 },
    harvest_one_families_2: { ...leads, namedFromOutside: 4 },
    harvest_one_families_3: { ...leads, namedFromOutside: 4 },
    one_friend_legacy_sync_config: { ...leads, namedFromOutside: 5 },
    phase7_before: { ...leads, namedFromOutside: 5 },
    phase7_after: { ...leads, namedFromOutside: 5 },
  });
});

test('todo-compile-one 4.4.4.2: no text crosses between these sixteen screens and section 411\'s twenty three, so the two are built apart without moving an inline copy, and with them they are section 405\'s 38 fixed screens past the head',
     skipUnless(...NAMES), () => {
  const population = NAMES.map((name) => {
    const c = parse(require_(name));
    const units = screenUnits(c);
    assert.ok(units !== undefined, name);
    return { name, c, units, household: householdNames(c) };
  });
  for (const one of population) {
    const layout = takeApart(one.c);
    const tour = describeTouchTourScreens(one.c, layout);
    const fixed = describeTouchFixedScreens(one.c, layout);
    const programsOf = (d: { place: { screens: { programs: ContainerPiece[]; chromes: ContainerPiece[]; extras: ContainerPiece[] }[] } }): Set<ContainerPiece> =>
      new Set(d.place.screens.flatMap((s) => [...s.programs, ...s.chromes, ...s.extras]));
    const [tourPrograms, fixedPrograms] = [programsOf(tour), programsOf(fixed)];
    assert.equal([...tour.spec.homes.values()].filter((home) => fixedPrograms.has(home.to)).length, 0, one.name);
    assert.equal([...fixed.spec.homes.values()].filter((home) => tourPrograms.has(home.to)).length, 0, one.name);
    // Section 405's census: the fixed modes past the head of forty, 38, are these sixteen and the 22 of section
    // 411's twenty three that are not code 9's status screen, mode 19.
    const others = attributeScreens(one.units, population)
      .filter((a) => a.unit.kind === 'mode' && a.category === 'fixed')
      .map((a) => Number(a.unit.label.split(' ')[1]))
      .filter((m) => m >= 40)
      .sort((a, b) => a - b);
    const ours = [...tour.spec.screens.map((s) => s.mode), ...touchFixedScreenModes(one.c).filter((m) => m >= 40)].sort((a, b) => a - b);
    assert.deepEqual(ours, others, one.name);
    assert.equal(others.length, 38, one.name);
  }
});
