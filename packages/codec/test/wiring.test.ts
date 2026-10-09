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
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Container, ContainerLayout, ContainerPiece, WiringSpec } from '../src/index.ts';
import {
  ACTIVITY_KEY_SCANS,
  EVENT_COUNT,
  FIRMWARE_SCREENS,
  LOG_AREA,
  PARAMETER_VALUES,
  WiringError,
  buildWiring,
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
  assert.equal(lists, 388);
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
  assert.equal(generated, 12533);
  assert.equal(described, 4910);
  // The blind changed every one of them: no generated byte happened to be 0xEE already.
  assert.equal(changed, 12533);
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

test('the wiring calls 1518 lists over the thirteen that it does not build, 69 to 148 per compile',
     skipUnless(...ARCH14_COMPILES), () => {
  const beyond: number[] = [];
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const built = buildWiring(describeWiring(takeApart(c)));
    const all = c.actionLists()!;
    const seen = new Set<number>(built.lists.keys());
    let outside = 0;
    const visit = (index: number): void => {
      if (seen.has(index)) return;
      seen.add(index);
      outside += 1;
      for (const ins of all[index] ?? []) if (ins.opcode === 0x7f) visit(ins.operand);
    };
    for (const index of built.lists.keys()) for (const ins of all[index] ?? []) if (ins.opcode === 0x7f) visit(ins.operand);
    beyond.push(outside);
  }
  assert.deepEqual(beyond, [85, 93, 73, 69, 132, 132, 124, 109, 109, 148, 148, 148, 148]);
  assert.equal(beyond.reduce((a, b) => a + b, 0), 1518);
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
