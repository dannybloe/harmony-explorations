/**
 * The firmware's own wiring built from a description, `todo-compile-650.md` 10.2, section 347,
 * measured against Logitech's own compiles.
 *
 * **The measurement is the round trip section 324 used.** `takeApart` cuts each compile into pieces,
 * `describeWiring` reads back only what a composer would supply, `buildWiring` builds the log area, the
 * event map, the parameter block, the timers, base slot 8's leading list, base slot 9's entries 0 to 4
 * and the leftover entry, and the lists those name, `withWiring` puts them where Logitech's sat, and
 * `layOutContainer` lays the whole container out again. Byte equality says the generator computed
 * everything the description lacks.
 *
 * **The blind control makes that a test rather than a hope**: every byte of every piece the generator
 * builds is overwritten in the input except the ones `BuiltWiring.described` marks as the
 * description's, and the rebuild still equals the compile.
 *
 * **The failing controls are the alternatives**: entry 1's order under the other model's tie, the
 * Harmony 600's parameter block built as a Harmony 650's, and the refusals.
 *
 * **Section 360, `todo-compile-650.md` 10.2.2, built the lists those call**: the tree of comparisons on the
 * firmware's own variables, the idle entry's two lists, `start`'s last call and the tour's start list. Its
 * tests are at the end: the 22 compiles of sections 356 to 358 and the one with no activities byte for
 * byte, a blind control whose description reads nothing but the bytes it marks, the three lists still
 * carried and why, this track's configuration, and checkWiring's failing controls.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Container, ContainerLayout, ContainerPiece, WiringSpec } from '../src/index.ts';
import {
  ACTION_LIST_TABLE_SLOT,
  ACTIVITY_KEY_SCANS,
  ALL_OFF_SCAN,
  EVENT_COUNT,
  FIRMWARE_SCREENS,
  LOG_AREA,
  PARAMETER_VALUES,
  WiringError,
  activityCount,
  archSlot,
  buildWiring,
  checkWiring,
  builtPieces,
  describeStateTables,
  describeWiring,
  eventMap,
  layOutContainer,
  logArea,
  modeRecords,
  parameterGroups,
  parse,
  screenStrings,
  tagSlotOrder,
  taggedList,
  handlerSets,
  takeApart,
  withWiring,
} from '../src/index.ts';

/** The thirteen arch 14 compiles section 312 names, as `frame.test.ts` lists them. */
const ARCH14_COMPILES = [
  'h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4',
] as const;
/**
 * Logitech's later compiles of the test record's Harmony 650, made after section 312's population was
 * fixed: two of them with the Remote Assistant off and one of those with the tilt sensor off too,
 * sections 345 and 346. Not part of the thirteen; they are where the two settings show.
 */
const LATER_650_COMPILES = [
  'h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config',
] as const;
/** The five Harmony 700 compiles made in 2026, the only ones with the boot list's `3F F715`. */
const SEVEN_HUNDRED_2026 = [
  'h700_28_config_region', 'h700_power_hold_compile', 'h700_power_hold_compile_2',
  'h700_power_hold_compile_3', 'h700_power_hold_compile_4',
] as const;
const HARMONY_600 = ['h600_config', 'calibration_h600'] as const;

const containerOf = (name: string): Container => parse(load(name) as Uint8Array);

function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  if (a.length !== b.length) return Math.min(a.length, b.length);
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return i;
  return undefined;
}

/** Describe, build, put back and lay out. */
function rebuilt(layout: ContainerLayout, spec: WiringSpec = describeWiring(layout)): Uint8Array {
  return layOutContainer(withWiring(layout, buildWiring(spec))).bytes;
}

const targets = (table: ContainerPiece): ContainerPiece[] =>
  [...table.refs].sort((a, b) => a.at - b.at).map((ref) => ('to' in ref ? ref.to : undefined)!);

test('the wiring of every arch 14 compile is rebuilt byte for byte from a description, and the front ends where the hour list sits',
     skipUnless(...ARCH14_COMPILES), () => {
  let lists = 0;
  let entries = 0;
  let timers = 0;
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const built = buildWiring(describeWiring(layout));
    lists += built.lists.size;
    entries += built.entries.size;
    timers += built.timerRecords.length;
    assert.equal(firstDifference(layOutContainer(withWiring(layout, built)).bytes, c.blob), undefined, `${name} differs`);
    // The front is everything base slot 10 holds before the clock's hour list, section 324: the two
    // generators agree about where one stops and the other starts.
    assert.equal(built.frontLength, describeStateTables(layout).hourList, `${name}: front`);
  }
  // 388 lists until section 360 built the tree they call: 1174 now, 786 more.
  assert.equal(lists, 1174);
  assert.equal(entries, 78);
  assert.equal(timers, 103);
});

test('the rebuild reads none of the bytes the generator owns: a blinded input rebuilds all thirteen',
     skipUnless(...ARCH14_COMPILES), () => {
  let generated = 0;
  let described = 0;
  let changed = 0;
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const built = buildWiring(describeWiring(layout));
    // Pair every built piece with the piece it replaces, then overwrite that piece's bytes in place
    // everywhere the description did not decide them. `takeApart` makes fresh pieces, so this blinds
    // this layout only.
    const head = (slot: number): ContainerPiece => layout.sections[slot]!.head[0]!;
    const pairs: [ContainerPiece, ContainerPiece][] = [
      [head(2), built.logArea], [head(4), built.eventMap], [head(8), built.leadingList],
      [head(12), built.timerTable], [head(15), built.parameterTable],
    ];
    targets(head(12)).forEach((p, k) => pairs.push([p, built.timerRecords[k]!]));
    targets(head(15)).forEach((p, k) => pairs.push([p, built.parameterGroups[k]!]));
    const entryPieces = targets(head(9));
    for (const [k, p] of built.entries) pairs.push([entryPieces[k]!, p]);
    const listPieces = targets(head(10));
    for (const [k, p] of built.lists) pairs.push([listPieces[k]!, p]);
    assert.equal(pairs.length, builtPieces(built).length, `${name}: every built piece has a counterpart`);
    for (const [original, made] of pairs) {
      const keep = new Set(built.described.get(made)!);
      for (let i = 0; i < original.bytes.length; i += 1) {
        if (keep.has(i)) continue;
        if (original.bytes[i] !== 0xee) changed += 1;
        original.bytes[i] = 0xee;
      }
      generated += made.bytes.length - keep.size;
      described += keep.size;
    }
    assert.equal(firstDifference(rebuilt(layout), c.blob), undefined, `${name} differs`);
  }
  // 12533 and 4910 until section 360 built the tree the wiring calls.
  assert.equal(generated, 17351);
  assert.equal(described, 6461);
  // The blind changed every one of them: no generated byte happened to be 0xEE already.
  assert.equal(changed, 17351);
});

test('the six later Harmony 650 compiles rebuild too, including the two with the Remote Assistant and the tilt sensor off',
     skipUnless(...LATER_650_COMPILES), () => {
  const settings: string[] = [];
  for (const name of LATER_650_COMPILES) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const spec = describeWiring(layout);
    settings.push(`${name}:${spec.settings.remoteAssistant ? 'A' : '-'}${spec.settings.tiltSensor ? 'T' : '-'}`);
    assert.equal(firstDifference(rebuilt(layout, spec), c.blob), undefined, `${name} differs`);
    assert.equal(buildWiring(spec).frontLength, describeStateTables(layout).hourList, `${name}: front`);
  }
  assert.deepEqual(settings, [
    'h650_start_config:AT', 'h650_options_config:AT', 'h650_sequence_config:AT', 'h650_favourites_config:AT',
    'h650_assistant_off_config:-T', 'h650_tilt_off_config:--',
  ]);
});

test('with the tilt sensor off there is no tilt event binding, no list for it and no timer list, and the quiet list is one shorter',
     skipUnless('h650_assistant_off_config', 'h650_tilt_off_config'), () => {
  // Section 346 compared these two and said the two lists ending in the flag were each one instruction
  // shorter; one of them is gone instead, with entry 2's binding of tag 0x17.
  const onSpec = describeWiring(takeApart(containerOf('h650_assistant_off_config')));
  const offSpec = describeWiring(takeApart(containerOf('h650_tilt_off_config')));
  const on = buildWiring(onSpec);
  const off = buildWiring(offSpec);
  const quietLength = (spec: WiringSpec, b: typeof on): number => b.lists.get(spec.lists.quiet!)!.bytes[0]!;
  assert.equal(quietLength(onSpec, on), 3);
  assert.equal(quietLength(offSpec, off), 2);
  assert.equal(on.lists.size - off.lists.size, 2);
  assert.equal(on.frontLength - off.frontLength, 1);
  const entry2 = (b: typeof on): Uint8Array => b.entries.get(2)!.bytes;
  assert.equal(entry2(on)[1], 55);
  assert.equal(entry2(off)[1], 54);
  const tilt = (b: typeof on): number => [...b.lists.values()].filter((p) => {
    for (let at = 1; at + 3 <= p.bytes.length; at += 3) if (p.bytes[at + 2] === 0x3f && p.bytes[at] === 0x01 && p.bytes[at + 1] === 0xf1) return true;
    return false;
  }).length;
  assert.equal(tilt(on), 3);
  assert.equal(tilt(off), 0);
});

test('the settings the thirteen carry: the glow time, the Assistant off on one, the boot step on the five 2026 Harmony 700 compiles, and six empty Listen to Music keys',
     skipUnless(...ARCH14_COMPILES), () => {
  const glow: number[] = [];
  const assistantOff: string[] = [];
  const tiltOff: string[] = [];
  const bootStep: string[] = [];
  const emptyKeys: string[] = [];
  let deviceTimers = 0;
  for (const name of ARCH14_COMPILES) {
    const spec = describeWiring(takeApart(containerOf(name)));
    glow.push(spec.settings.glowTime);
    if (!spec.settings.remoteAssistant) assistantOff.push(name);
    if (!spec.settings.tiltSensor) tiltOff.push(name);
    if (spec.settings.bootStep) bootStep.push(name);
    for (const scan of ACTIVITY_KEY_SCANS) if (spec.activityKeys[scan] === null) emptyKeys.push(`${name}:${scan}`);
    deviceTimers += spec.deviceTimers.length;
  }
  assert.deepEqual(glow, [8, 20, 10, 20, 10, 10, 20, 20, 20, 20, 20, 20, 20]);
  assert.deepEqual(assistantOff, ['h600_config']);
  assert.deepEqual(tiltOff, []);
  assert.deepEqual(bootStep, [...SEVEN_HUNDRED_2026]);
  assert.deepEqual(emptyKeys, ['calibration_h600:7', ...SEVEN_HUNDRED_2026.map((n) => `${n}:7`)]);
  assert.equal(deviceTimers, 10);
});

/** The text a mode's first page draws, its strings joined. */
function modeText(c: Container, mode: number): string {
  const record = modeRecords(c)![mode]!;
  const program = record.pages[0]!.program;
  return screenStrings(c).filter((s) => s.program === program).map((s) => s.text).join(' / ');
}

/** What the firmware's named screens draw, where they draw anything. */
const SCREEN_TEXTS: Readonly<Record<string, string>> = {
  addActivities: 'Use the Harmony / setup software to / add Activities. / Exit',
  usbConnected: 'USB Connected',
  lowBattery: 'Low Battery / Exit',
  pleaseCharge: 'Please charge your / remote',
  insertBatteries: 'Insert batteries',
  unableToCharge: 'Unable to charge / batteries',
  updateSuccessful: 'Update Successful',
  upgradeSuccessful: 'Upgrade / Successful',
  readyToLearn: 'Ready to learn / command from / other remote.',
  commandReceived: 'Command / Received',
  terminateEntry: 'Terminate Entry',
};

test('the event map sends status codes 0 and 26 to the screens that say so, and every named firmware screen draws its name',
     skipUnless(...ARCH14_COMPILES), () => {
  let named = 0;
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const model = describeWiring(takeApart(c)).model;
    const events = eventMap(c)!;
    // Two routes to one number: the event map's base is the count of the firmware's screens, and the
    // screen it names for a status code draws that code's message, section 249.
    assert.equal(events.fallback, FIRMWARE_SCREENS[model].length, `${name}: base`);
    assert.equal(events.entries.size, EVENT_COUNT);
    assert.equal(modeText(c, events.entries.get(0)!), 'Go to Website / to update settings', `${name}: code 0`);
    assert.equal(modeText(c, events.entries.get(26)!), 'Configuration / Corrupted', `${name}: code 26`);
    FIRMWARE_SCREENS[model].forEach((screen, mode) => {
      const text = SCREEN_TEXTS[screen];
      if (text === undefined) return;
      assert.equal(modeText(c, mode), text, `${name}: ${screen}`);
      named += 1;
    });
    const log = logArea(c)!;
    assert.deepEqual([log.capacity, log.start, log.limit], [LOG_AREA.capacity, LOG_AREA.start, LOG_AREA.limit]);
  }
  assert.equal(named, 6 * 10 + 7 * 11);
});

test('entry 1 is stored in slot order with its own model\'s tie, 13 of 13, and under the other model\'s tie 0 of 13',
     skipUnless(...ARCH14_COMPILES), () => {
  const tie = (a: number, b: number): Map<string, readonly [number, number]> =>
    new Map([[[a, b].sort((x, y) => x - y).join(','), [a, b] as const], ['45,134', [0x86, 0x2d] as const]]);
  let own = 0;
  let other = 0;
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const seven = describeWiring(takeApart(c)).model === 'harmony-700';
    const tags = taggedList(c, handlerSets(c)!.addresses[1]!)!.entries.map((e) => e.tag);
    const ownTie = seven ? tie(0x81, 0xa3) : tie(0xa3, 0x81);
    const otherTie = seven ? tie(0xa3, 0x81) : tie(0x81, 0xa3);
    if (JSON.stringify(tagSlotOrder(tags, ownTie)) === JSON.stringify(tags)) own += 1;
    if (JSON.stringify(tagSlotOrder(tags, otherTie)) === JSON.stringify(tags)) other += 1;
  }
  assert.equal(own, 13);
  assert.equal(other, 0);
});

test('the parameter block is one set per model, and a Harmony 600 built with the Harmony 650\'s differs in group 3 alone',
     skipUnless(...ARCH14_COMPILES), () => {
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const model = describeWiring(takeApart(c)).model;
    assert.deepEqual(parameterGroups(c)!.map((g) => g.values), PARAMETER_VALUES[model].map((v) => [...v]), name);
  }
  const differ = PARAMETER_VALUES['harmony-600'].flatMap((g, k) => (JSON.stringify(g) === JSON.stringify(PARAMETER_VALUES['harmony-650'][k]) ? [] : [k]));
  assert.deepEqual(differ, [3]);
  for (const name of HARMONY_600) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const spec = describeWiring(layout);
    assert.notEqual(firstDifference(rebuilt(layout, { ...spec, model: 'harmony-650' }), c.blob), undefined, `${name} built as a 650`);
  }
});

/** The shared lists section 347 built besides the front, by this module's names. */
const SECTION_347_SHARED = [
  'boot', 'events', 'everyKey', 'elevenKeys', 'quiet', 'idleEnter', 'idleResume', 'helpHold',
  'lightOff', 'lightOn', 'lightOnAgain', 'lightTick', 'cycle0', 'cycle1', 'cycle2', 'cycle3',
] as const;

test('section 347\'s count, corrected by section 360: the wiring called 1622 lists over the thirteen that it did not build, 77 to 156 per compile, of which 1518 were reached from its lists and 104 from entry 1\'s binding of scan 6, read as All Off\'s, alone',
     skipUnless(...ARCH14_COMPILES), () => {
  // Section 347 followed calls out of the built lists only, so the eight lists the binding of scan 6,
  // read as All Off's, in entry 1 calls were never counted. The same walk, over section 347's built lists, from the lists
  // and then from entry 1 as well. The lists section 360 builds are counted here as not built, which is
  // what they were then.
  const beyond: number[] = [];
  const throughEntry: number[] = [];
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const spec = describeWiring(takeApart(c));
    const built = buildWiring(spec);
    const all = c.actionLists()!;
    // Section 347's built lists were the front and the shared lists every key press and timer runs.
    const then = new Set([
      ...Array.from({ length: built.frontLength }, (_, k) => k),
      ...SECTION_347_SHARED.flatMap((one) => (spec.lists[one] === undefined ? [] : [spec.lists[one]!])),
    ]);
    const seen = new Set<number>(then);
    let outside = 0;
    const visit = (index: number): void => {
      if (seen.has(index)) return;
      seen.add(index);
      outside += 1;
      for (const ins of all[index] ?? []) if (ins.opcode === 0x7f) visit(ins.operand);
    };
    for (const index of then) for (const ins of all[index] ?? []) if (ins.opcode === 0x7f) visit(ins.operand);
    beyond.push(outside);
    const before = outside;
    visit(spec.lists.allOff!);
    throughEntry.push(outside - before);
  }
  assert.deepEqual(beyond, [85, 93, 73, 69, 132, 132, 124, 109, 109, 148, 148, 148, 148]);
  assert.equal(beyond.reduce((a, b) => a + b, 0), 1518);
  assert.deepEqual(throughEntry, ARCH14_COMPILES.map(() => 8));
});

test('the wiring refuses what it cannot build', skipUnless('h650_config_region', 'h700_config'), () => {
  const spec650 = describeWiring(takeApart(containerOf('h650_config_region')));
  const refuses = (spec: WiringSpec, pattern: RegExp): void => assert.throws(() => buildWiring(spec), (e: unknown) => e instanceof WiringError && pattern.test(e.message));
  refuses({ ...spec650, settings: { ...spec650.settings, bootStep: true } }, /3F F715/);
  refuses({ ...spec650, settings: { ...spec650.settings, glowTime: 0x10000 } }, /glow time/);
  refuses({ ...spec650, deviceTimers: [{ ...spec650.deviceTimers[0]!, at: 6 }] }, /place/);
  refuses({ ...spec650, deviceTimers: [spec650.deviceTimers[0]!, spec650.deviceTimers[0]!] }, /two device timers/);
  const withoutBoot = Object.fromEntries(Object.entries(spec650.lists).filter(([name]) => name !== 'boot'));
  refuses({ ...spec650, lists: withoutBoot }, /no list "boot"/);
  refuses({ ...spec650, lists: { ...spec650.lists, start: 3 } }, /generated/);
  refuses({ ...spec650, activityKeys: { 1: 5, 5: 8 } }, /activity key 7/);
  refuses({ ...spec650, variables: { ...spec650.variables, lowBattery: 0x80 } }, /written variable/);
  const layout700 = takeApart(containerOf('h700_config'));
  assert.throws(() => describeWiring({ ...layout700, skin: 69 }), WiringError);
});

// ---------------------------------------------------------------------------------------------------
// Section 360, todo-compile-650.md 10.2.2: the lists the wiring calls.
// ---------------------------------------------------------------------------------------------------

/** The 22 compiles sections 356 to 358 measure, and the one compile with no activities. */
const TWENTY_TWO = [
  ...ARCH14_COMPILES, ...LATER_650_COMPILES, 'h650_test_config', 'h650_test_config_clean', 'h650_issue36_config',
] as const;
const NO_ACTIVITIES = 'harvest_650_two_devices';
const SECTION_360 = [...TWENTY_TWO, NO_ACTIVITIES] as const;

/**
 * The section 360 tests' totals over the 23, kept together so section 360 can quote them: per model, how
 * many compiles and how many lists the wiring builds on them; the blind control's marked and blinded
 * bytes; and the lists still carried, by the carried list they hang off.
 */
const PER_MODEL_360 = { 'harmony-650': [14, 898], 'harmony-600': [2, 129], 'harmony-700': [7, 789] };
const BLIND_360 = [10755, 23268672];
const CARRIED_360 = { 'start.reset': 1183, assistantGate: 80, allOff: 184, 'other:usbLeave.first': 7 };

/** The three lists the wiring calls and does not build, each dropped by one setting. */
const CARRIED = ['start.reset', 'assistantGate', 'allOff'] as const;

/**
 * The lists the built pieces call and the wiring does not build, by the carried list they hang off,
 * following calls out of every built list, every built base slot 9 entry and the leading list. A list
 * reached otherwise is counted under `other:` and its description name. Value maps are not followed.
 */
function carried(c: Container, spec: WiringSpec, built: ReturnType<typeof buildWiring>): Record<string, number> {
  const all = c.actionLists()!;
  const rootOf = new Map<number, string>();
  for (const root of CARRIED) if (spec.lists[root] !== undefined) rootOf.set(spec.lists[root]!, root);
  const names = new Map(Object.entries(spec.lists).map(([n, k]) => [k, n]));
  const seen = new Set<number>(built.lists.keys());
  const counts: Record<string, number> = {};
  const visit = (index: number, root: string | undefined): void => {
    if (seen.has(index)) return;
    seen.add(index);
    const r = rootOf.get(index) ?? root ?? `other:${names.get(index) ?? index}`;
    counts[r] = (counts[r] ?? 0) + 1;
    for (const ins of all[index] ?? []) if (ins.opcode === 0x7f) visit(ins.operand, r);
  };
  const calls = (bytes: Uint8Array, head: number, stride: number): number[] => {
    const out: number[] = [];
    for (let at = head + stride - 3; at + 3 <= bytes.length; at += stride) {
      if (bytes[at + 2] === 0x7f) out.push(bytes[at]! | (bytes[at + 1]! << 8));
    }
    return out;
  };
  for (const p of built.lists.values()) for (const t of calls(p.bytes, 1, 3)) visit(t, undefined);
  for (const p of built.entries.values()) {
    const wide = p.bytes[0] === 0 && p.bytes.length === 2 + 5 * p.bytes[1]!;
    for (const t of wide ? calls(p.bytes, 2, 5) : calls(p.bytes, 1, 4)) visit(t, undefined);
  }
  for (const t of calls(built.leadingList.bytes, 1, 3)) visit(t, undefined);
  return counts;
}

test('section 360: the wiring of the 22 compiles of sections 356 to 358 and of the compile with no activities is rebuilt byte for byte with the tree its lists call, 64 lists on a Harmony 600 or 650 and 112 on a Harmony 700, one more per empty activity key and two fewer with the tilt sensor off',
     skipUnless(...SECTION_360), () => {
  const perModel: Record<string, number[]> = {};
  for (const name of SECTION_360) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const spec = describeWiring(layout);
    const built = buildWiring(spec);
    assert.equal(firstDifference(layOutContainer(withWiring(layout, built)).bytes, c.blob), undefined, `${name} differs`);
    const empty = ACTIVITY_KEY_SCANS.filter((scan) => spec.activityKeys[scan] === null).length;
    const base = (spec.model === 'harmony-700' ? 112 : 64) - (spec.settings.tiltSensor ? 0 : 2);
    assert.equal(built.lists.size, base + empty, name);
    (perModel[spec.model] ??= []).push(built.lists.size);
  }
  const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
  assert.deepEqual(Object.fromEntries(Object.entries(perModel).map(([m, xs]) => [m, [xs.length, sum(xs)]])), PER_MODEL_360);
});

test('section 360: the settings the 23 carry: the tour shown on three, the Assistant off on three, the restore of saved delays and Help on all 23, and no activity, with every activity key empty, on one Harmony 650 compile alone; the activity count is base slot 9\'s entry count less six on all 23',
     skipUnless(...SECTION_360), () => {
  const shown: string[] = [];
  const assistantOff: string[] = [];
  const noRestore: string[] = [];
  const noHelp: string[] = [];
  const allEmpty: string[] = [];
  const none: string[] = [];
  for (const name of SECTION_360) {
    const spec = describeWiring(takeApart(containerOf(name)));
    if (spec.settings.tourShown) shown.push(name);
    if (!spec.settings.remoteAssistant) assistantOff.push(name);
    if (!spec.settings.delayRestore) noRestore.push(name);
    if (!spec.settings.help) noHelp.push(name);
    if (ACTIVITY_KEY_SCANS.every((scan) => spec.activityKeys[scan] === null)) allEmpty.push(name);
    // The activity count the description reads off base slot 9's entry count is the name tree's.
    assert.equal(spec.activityCount, activityCount(containerOf(name)), name);
    if (spec.activityCount === 0) none.push(name);
  }
  assert.deepEqual(none, [NO_ACTIVITIES]);
  assert.deepEqual(shown, ['h650_config_region', 'calibration_h600', 'h650_issue36_config']);
  assert.deepEqual(assistantOff, ['h600_config', 'h650_assistant_off_config', 'h650_tilt_off_config']);
  assert.deepEqual(noRestore, []);
  assert.deepEqual(noHelp, []);
  assert.deepEqual(allEmpty, [NO_ACTIVITIES]);
});

/** A base slot's head piece, and the pieces its table points at in address order. */
function pairsIn(layout: ContainerLayout, built: ReturnType<typeof buildWiring>): [ContainerPiece, ContainerPiece][] {
  const head = (slot: number): ContainerPiece => layout.sections[slot]!.head[0]!;
  const pairs: [ContainerPiece, ContainerPiece][] = [
    [head(2), built.logArea], [head(4), built.eventMap], [head(8), built.leadingList],
    [head(12), built.timerTable], [head(15), built.parameterTable],
  ];
  targets(head(12)).forEach((p, k) => pairs.push([p, built.timerRecords[k]!]));
  targets(head(15)).forEach((p, k) => pairs.push([p, built.parameterGroups[k]!]));
  const entryPieces = targets(head(9));
  for (const [k, p] of built.entries) pairs.push([entryPieces[k]!, p]);
  const listPieces = targets(head(10));
  for (const [k, p] of built.lists) pairs.push([listPieces[k]!, p]);
  return pairs;
}

/**
 * The layout the blind control's description reads: every byte of every piece blinded to `0xEE` but the
 * bytes the built pieces mark as the description's, less any `unmark` takes away. Returns the layout and
 * how many bytes were kept and how many changed. What this cannot blind is the frame: which piece a
 * table entry points at, each piece's length and each table's entry count, which `takeApart` reads
 * before any byte is looked at, and the skin.
 */
function blindForReading(c: Container, built: ReturnType<typeof buildWiring>, unmark?: (made: ContainerPiece, keep: Set<number>) => void): {
  layout: ContainerLayout; marked: number; blinded: number;
} {
  const layout = takeApart(c);
  const keep = new Map(pairsIn(layout, built).map(([original, made]): [ContainerPiece, Set<number>] => {
    const k = new Set(built.described.get(made)!);
    unmark?.(made, k);
    return [original, k];
  }));
  let marked = 0;
  let blinded = 0;
  const every = [layout.keyTable, ...layout.body, ...layout.sections.flatMap((one) => (one === undefined ? [] : [...one.before, ...one.head])), ...layout.pictures];
  for (const p of new Set(every)) {
    const k = keep.get(p) ?? new Set<number>();
    for (let i = 0; i < p.bytes.length; i += 1) {
      if (k.has(i)) { marked += 1; continue; }
      if (p.bytes[i] !== 0xee) blinded += 1;
      p.bytes[i] = 0xee;
    }
  }
  return { layout, marked, blinded };
}

test('section 360: blinded to the frame and the skin, the 23 still rebuild: every byte of the configuration the description reads is blinded, the carried lists included, but the bytes the built pieces mark, and so is every unmarked byte of the built pieces in the layout the rebuild is written into; and with the opcode of scan 6\'s binding, read as All Off\'s, unmarked the description refuses, so the marks are what it reads',
     skipUnless(...SECTION_360), () => {
  let marked = 0;
  let blinded = 0;
  for (const name of SECTION_360) {
    const c = containerOf(name);
    const built = buildWiring(describeWiring(takeApart(c)));
    // Not blinded, since `takeApart` reads it before any byte: which piece each table entry points at,
    // every piece's length and every table's entry count, among them base slot 9's, which is the
    // activity count, and base slot 12's, which is how many timers there are and so how many of them are
    // the firmware's, the description's `firmware.length`.
    const read = blindForReading(c, built);
    marked += read.marked;
    blinded += read.blinded;
    // Where the rebuild is written: the built pieces' unmarked bytes, as the thirteen's control does.
    const into = takeApart(c);
    for (const [original, made] of pairsIn(into, built)) {
      const k = new Set(built.described.get(made)!);
      for (let i = 0; i < original.bytes.length; i += 1) if (!k.has(i)) original.bytes[i] = 0xee;
    }
    const spec = describeWiring(read.layout);
    assert.equal(firstDifference(layOutContainer(withWiring(into, buildWiring(spec))).bytes, c.blob), undefined, `${name} differs`);
    // The control's own control: entry 1's binding of scan 6, read as All Off's, with its opcode
    // unmarked. The description then reads the Help setting off a blinded byte, builds the idle entry's other form, and finds the idle
    // entry at one index from the mode table and another from the binding, so it refuses while reading.
    const entry1 = built.entries.get(1)!;
    const dropped = blindForReading(c, built, (made, keep) => {
      if (made !== entry1) return;
      for (let i = 1; i + 4 <= made.bytes.length; i += 4) if (made.bytes[i] === (0x80 | ALL_OFF_SCAN)) keep.delete(i + 3);
    });
    assert.ok(dropped.marked < read.marked, name);
    assert.throws(() => describeWiring(dropped.layout), (e: unknown) => e instanceof WiringError && /^entry "idle" is \d+ in one place and \d+ in another$/.test(e.message), name);
  }
  assert.deepEqual([marked, blinded], BLIND_360);
});

test('section 360: the wiring calls three lists it does not build, each belonging to something this track leaves out: the restore of saved delays, one list and four per saved delay, on 23 of 23; the Assistant\'s gate, four lists, on the 20 with the Assistant on; the Help list of scan 6, read as All Off\'s, eight, on 23 of 23; and on the Harmony 700 one list the firmware screens build',
     skipUnless(...SECTION_360), () => {
  const totals: Record<string, number> = {};
  for (const name of SECTION_360) {
    const c = containerOf(name);
    const spec = describeWiring(takeApart(c));
    const counts = carried(c, spec, buildWiring(spec));
    for (const [k, v] of Object.entries(counts)) totals[k] = (totals[k] ?? 0) + v;
    // The restore: `07 FFF3`, a call per saved delay, `07 FFF2`, section 303, and four lists per call.
    const reset = c.actionLists()![spec.lists['start.reset']!]!;
    assert.deepEqual([reset[0], reset.at(-1)], [{ opcode: 0x07, operand: 0xfff3 }, { opcode: 0x07, operand: 0xfff2 }], name);
    assert.equal(counts['start.reset'], 1 + 4 * (reset.length - 2), name);
    assert.equal(counts.assistantGate, spec.settings.remoteAssistant ? 4 : undefined, name);
    assert.equal(counts.allOff, 8, name);
    // On the Harmony 700 the USB leave handler's first call is "USB Connected"'s `cleared`, section 357's.
    const others = Object.keys(counts).filter((k) => !(CARRIED as readonly string[]).includes(k));
    assert.deepEqual(others, spec.model === 'harmony-700' ? ['other:usbLeave.first'] : [], name);
  }
  assert.deepEqual(totals, CARRIED_360);
});

test('section 360: this track\'s configuration, built on Logitech\'s clean compile with no restore, no Assistant and no Help: the start list goes straight to the idle entry, scan 6, read as All Off\'s, selects it, the idle entry binds two events, 11 bytes fewer, and its own description reads it back',
     skipUnless('h650_test_config_clean'), () => {
  const c = containerOf('h650_test_config_clean');
  const read = describeWiring(takeApart(c));
  const ours: WiringSpec = { ...read, settings: { ...read.settings, delayRestore: false, remoteAssistant: false, help: false } };
  const built = buildWiring(ours);
  const out = parse(layOutContainer(withWiring(takeApart(c), built)).bytes);
  assert.equal(out.allChecksPass, true);
  // One instruction of the start list and two narrow bindings of the idle entry.
  assert.equal(c.blob.length - out.blob.length, 3 + 2 * 4);
  const lists = out.actionLists()!;
  // `start`, front list 1: boot, select the idle entry, start.last.
  assert.deepEqual(lists[1]!.map((one) => one.opcode), [0x7f, 0x1f, 0x7f]);
  assert.equal(lists[1]![1]!.operand, 0xff00 | read.entries.idle!);
  // Scan 6, read as All Off's, selects the idle entry; the idle entry binds its enter and resume alone.
  const entry1 = taggedList(out, handlerSets(out)!.addresses[1]!)!.entries;
  const allOff = entry1.find((one) => one.tag === (0x80 | ALL_OFF_SCAN))!;
  assert.deepEqual([allOff.opcode, allOff.operand], [0x1f, 0xff00 | read.entries.idle!]);
  assert.deepEqual(taggedList(out, handlerSets(out)!.addresses[read.entries.idle!]!)!.entries.map((one) => one.tag), [0x01, 0x05]);
  // Nothing built names the three carried lists or Help's hold list.
  const named = new Set<number>();
  for (const p of built.lists.values()) {
    for (let at = 1; at + 3 <= p.bytes.length; at += 3) if (p.bytes[at + 2] === 0x7f) named.add(p.bytes[at]! | (p.bytes[at + 1]! << 8));
  }
  for (const one of [...CARRIED, 'helpHold']) assert.equal(named.has(read.lists[one]!), false, one);
  // So the built pieces of this track's configuration call no list the wiring does not build.
  assert.deepEqual(carried(c, ours, built), {});
  // Read back, the settings are this track's and the rebuild is the file.
  const again = describeWiring(takeApart(out));
  assert.deepEqual(again.settings, ours.settings);
  assert.equal(firstDifference(layOutContainer(withWiring(takeApart(out), buildWiring(again))).bytes, out.blob), undefined);
});

/** Where an action list starts in the file, for the failing controls. */
function listAt(c: Container, index: number): number {
  return c.blobOffsetOf(c.pointerArray(archSlot(c.architecture!, ACTION_LIST_TABLE_SLOT))![index]!)!;
}

test('section 360: checkWiring passes Logitech\'s clean compile and refuses a comparison of another firmware variable, a light timer started at another index, a one armed comparison made two armed, the two arms of a comparison swapped, and a shared list called at two indices',
     skipUnless('h650_test_config_clean'), () => {
  const original = containerOf('h650_test_config_clean');
  const checked = checkWiring(original);
  assert.deepEqual([checked.lists, checked.entries], [64, 6]);
  const spec = describeWiring(takeApart(original));
  const edited = (list: string, instruction: number, byte: number, value: number): Container => {
    const bytes = new Uint8Array(original.blob);
    bytes[listAt(original, spec.lists[list]!) + 1 + 3 * instruction + byte] = value;
    return parse(bytes);
  };
  const refused = (c: Container, pattern: RegExp): void => {
    assert.throws(() => checkWiring(c), (e: unknown) => e instanceof WiringError && pattern.test(e.message));
  };
  // Variable 17 compared where the compiler compares 16.
  refused(edited('events.1.test', 0, 0, 0x11), /in list \d+, events\.1\.test$/);
  // The screen light started again on timer 3, where the table puts it at 4 on this compile.
  refused(edited('elevenKeys.again', 2, 0, 0x03), /in list \d+, elevenKeys\.again$/);
  // The tour's mark compared with both arms where the compiler uses one.
  refused(edited('idleEnter.first.test', 0, 1, 0x80), /in list \d+, idleEnter\.first\.test$/);
  // The two arms of the last key comparison swapped: the description follows them, so the two lists they
  // name come out with each other's bodies.
  const swapped = new Uint8Array(original.blob);
  const at = listAt(original, spec.lists['everyKey.1.test']!);
  const first = swapped.slice(at + 4, at + 7);
  swapped.set(swapped.slice(at + 7, at + 10), at + 4);
  swapped.set(first, at + 7);
  refused(parse(swapped), /in list \d+, everyKey\.(again|on)$/);
  // `stopLights`, which five lists call, called at another index by one of them: refused while reading.
  refused(edited('elevenKeys.again', 0, 0, (spec.lists.stopLights! + 1) & 0xff), /list "stopLights" is \d+ in one place and \d+ in another/);
});

test('section 360: the "add Activities" rule is keyed on the activity count and refused where it is not read: no activity with an activity key set, activities with every activity key empty, and no activity outside the Harmony 650',
     skipUnless(NO_ACTIVITIES, 'h650_config_region'), () => {
  const none = describeWiring(takeApart(containerOf(NO_ACTIVITIES)));
  const some = describeWiring(takeApart(containerOf('h650_config_region')));
  const refuses = (spec: WiringSpec, pattern: RegExp): void => assert.throws(() => buildWiring(spec), (e: unknown) => e instanceof WiringError && pattern.test(e.message));
  assert.equal(none.activityCount, 0);
  refuses({ ...none, activityKeys: some.activityKeys }, /activity key selects an entry and there is no activity/);
  refuses({ ...some, activityKeys: none.activityKeys }, /every activity key is empty while there are activities/);
  refuses({ ...none, model: 'harmony-600' }, /no harmony-600 compile with no activity/);
  refuses({ ...none, model: 'harmony-700' }, /no harmony-700 compile with no activity/);
  // The control: both as read build.
  buildWiring(none);
  buildWiring(some);
});

test('section 360: a Harmony 700 with the Remote Assistant off is refused, since no such compile has been read', skipUnless('h700_config'), () => {
  const spec = describeWiring(takeApart(containerOf('h700_config')));
  assert.throws(() => buildWiring({ ...spec, settings: { ...spec.settings, remoteAssistant: false } }),
    (e: unknown) => e instanceof WiringError && /Remote Assistant off/.test(e.message));
});

