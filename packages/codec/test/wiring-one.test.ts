/**
 * The Harmony One's own wiring built from a description, `todo-compile-one.md` 6.3, findings section 410,
 * measured against Logitech's 19 distinct One compiles as `test/wiring.test.ts` measures the Harmony 600, 650
 * and 700's against theirs.
 *
 * **The measurement is the same round trip.** `takeApart` cuts each compile into pieces,
 * `describeTouchWiring` reads back only the numbering and the three settings, `buildTouchWiring` builds the
 * log area, the event map, the parameter block, the timers, base slot 8's leading list, base slot 9's seven
 * fixed entries and the leftover entry, and the lists those reach, `withWiring` puts them where Logitech's
 * sat, and `layOutContainer` lays the container out again. Byte equality says the generator computed
 * everything the description lacks, and the blind control makes that a test: every unmarked byte of every
 * piece the generator builds is overwritten in the input before the description is read.
 *
 * **The failing controls**: a timer table with two timers swapped, a description short of a list, a firmware
 * timer missing, a timer's duration no firmware timer has, the ladder's `07 FFFB` without the assistant, and the
 * Harmony 600 family's description reader handed a One.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Container, ContainerLayout, ContainerPiece } from '../src/index.ts';
import { layOutContainer, parse, takeApart } from '../src/index.ts';
import { familyOf } from '../src/families/registry.ts';
import { WiringError, builtPieces, compareWiring, withWiring, type BuiltWiring } from '../src/wiringparts.ts';
import {
  TOUCH_FIRMWARE_SCREENS, buildTouchWiring, checkTouchWiring, describeTouchWiring, touchWiringNeeds, type TouchWiringSpec,
} from '../src/families/touch/wiring.ts';
import { describeWiring } from '../src/families/four-slot/wiring.ts';

/** The nineteen Harmony One compiles of section 405, `test/screenrecords-one.test.ts`' list. */
const ONES = ['harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after', 'one_config', 'one_config_unprogrammed',
  'one_friend_asfound_config'] as const;
/** Configurations of ours written to the spare Harmony One, five of them with the screen light raised. */
const OUR_WRITES = ['one_spare_light60_written', 'one_spare_noassistant_written', 'one_spare_glow_written',
  'one_spare_look_written', 'one_spare_written_by_us', 'one_spare_arrows_written', 'one_spare_bottom_written'] as const;

// Over the 19 compiles. 62992, 24352 and 62992 until `todo-compile-one.md` 6.5 added the 14 lists the transitions
// of `readyVar`, `relightVar` and `settleVar` call, 98 bytes a compile, 67 generated and 31 described, section 418.
const GENERATED = 64265;
const DESCRIBED = 24941;
const CHANGED = 64265;
const DEVICE_TIMERS = 12;
const REDRAWS = [13, 15, 19, 20, 16, 17, 20, 20, 20, 20, 13, 13, 13, 18, 17, 17, 17, 15, 15];
const ORDERS = 3;
const ORDERS_WITH_THE_THREE_SECOND_ONE = 5;

const containerOf = (name: string): Container => parse(load(name) as Uint8Array);

function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  if (a.length !== b.length) return Math.min(a.length, b.length);
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return i;
  return undefined;
}

const targets = (table: ContainerPiece): ContainerPiece[] =>
  [...table.refs].sort((a, b) => a.at - b.at).map((ref) => ('to' in ref ? ref.to : undefined)!);

/** Every built piece with the piece of `layout` it replaces. */
function pairsIn(layout: ContainerLayout, built: BuiltWiring): [ContainerPiece, ContainerPiece][] {
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

const rebuilt = (layout: ContainerLayout, spec: TouchWiringSpec): Uint8Array =>
  layOutContainer(withWiring(layout, buildTouchWiring(spec))).bytes;

test('sections 410 and 418: the wiring of each of the 19 Harmony One compiles is rebuilt byte for byte from a description, 6697 lists, 152 entries and 579 timers, the front 168 lists starting three past the start list',
     skipUnless(...ONES), () => {
  let lists = 0;
  let entries = 0;
  let timers = 0;
  for (const name of ONES) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const spec = describeTouchWiring(layout);
    const built = buildTouchWiring(spec);
    assert.equal(firstDifference(layOutContainer(withWiring(layout, built)).bytes, c.blob), undefined, `${name} differs`);
    lists += built.lists.size;
    entries += built.entries.size;
    timers += built.timerRecords.length;
    assert.equal(built.frontLength, 168, name);
    // Mode 39's two lists sit between the start list and the front, section 410, on every compile.
    assert.equal(spec.front, spec.lists.start! + 3, name);
  }
  // 6431 lists until section 418 added the transitions' 14 on each of the 19, 266.
  assert.deepEqual([lists, entries, timers], [6697, 152, 579]);
});

test('section 410: the rebuild reads none of the bytes the generator owns: a blinded input rebuilds all 19, and so do seven configurations of ours written to the spare',
     skipUnless(...ONES, ...OUR_WRITES), () => {
  let generated = 0;
  let described = 0;
  let changed = 0;
  for (const name of [...ONES, ...OUR_WRITES]) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const built = buildTouchWiring(describeTouchWiring(layout));
    const pairs = pairsIn(layout, built);
    assert.equal(pairs.length, builtPieces(built).length, `${name}: every built piece has a counterpart`);
    const logitech = ONES.includes(name as (typeof ONES)[number]);
    for (const [original, made] of pairs) {
      const keep = new Set(built.described.get(made)!);
      for (let i = 0; i < original.bytes.length; i += 1) {
        if (keep.has(i)) continue;
        if (logitech && original.bytes[i] !== 0xee) changed += 1;
        original.bytes[i] = 0xee;
      }
      if (!logitech) continue;
      generated += made.bytes.length - keep.size;
      described += keep.size;
    }
    // Described off the blinded layout, built and written back into it. Not so on our writes: six of the seven
    // carry the page lists' copies behind a handler set, section 378, which `withWiring` finds by the set's own
    // count, a byte the blind overwrites, so theirs is written into a layout taken apart afresh.
    const spec = describeTouchWiring(layout);
    assert.equal(firstDifference(rebuilt(logitech ? layout : takeApart(c), spec), c.blob), undefined, `${name} differs`);
  }
  // Over the 19: what the generator wrote and what the description decided.
  assert.deepEqual([generated, described], [GENERATED, DESCRIBED]);
  assert.equal(changed, CHANGED);
});

test('section 410: the settings the 19 carry: the Remote Assistant on all but one_config, the ladder\'s 07 FFFB on two, the screen light at 10 and 20 seconds on all 19; and the timers: 13 the firmware\'s on all 19, a three second one on two, a device\'s on 12, 13 to 20 redraw timers, and the firmware\'s in three orders, five with the three second one\'s place',
     skipUnless(...ONES), () => {
  const noAssistant: string[] = [];
  const cancels: string[] = [];
  const lights = new Set<string>();
  const show3: string[] = [];
  let withDevice = 0;
  const redraws: number[] = [];
  const orders = new Set<string>();
  const ordersWithShow3 = new Set<string>();
  for (const name of ONES) {
    const spec = describeTouchWiring(takeApart(containerOf(name)));
    if (!spec.settings.startupAssistant) noAssistant.push(name);
    if (spec.settings.ladderCancelsTimers) cancels.push(name);
    lights.add(`${spec.settings.screenLight}/${spec.settings.screenLightAgain}`);
    if (spec.timers.includes('show3')) show3.push(name);
    if (spec.deviceTimers.length > 0) withDevice += 1;
    // The thirteen the firmware's lists and screens need, once each.
    const fixed = spec.timers.filter((t) => t !== '' && !t.startsWith('redraw') && t !== 'show3');
    assert.equal(fixed.length, 13, name);
    assert.equal(new Set(fixed).size, 13, name);
    redraws.push(spec.timers.filter((t) => t.startsWith('redraw')).length);
    orders.add(fixed.join(','));
    ordersWithShow3.add(spec.timers.filter((t) => !t.startsWith('redraw') && t !== '').join(','));
  }
  assert.deepEqual(noAssistant, ['one_config']);
  assert.deepEqual(cancels, ['one_config_unprogrammed', 'one_friend_asfound_config']);
  assert.deepEqual([...lights], ['10/20']);
  assert.deepEqual(show3, ['harvest_one_families_1', 'one_friend_asfound_config']);
  assert.equal(withDevice, DEVICE_TIMERS);
  assert.deepEqual(redraws, REDRAWS);
  // The order of the firmware's timers differs between compiles, which is why the table's order is carried.
  assert.equal(orders.size, ORDERS);
  assert.equal(ordersWithShow3.size, ORDERS_WITH_THE_THREE_SECOND_ONE);
});

test('section 410: the description carries exactly the symbols the catalogue names and does not generate, and of the ten head screens it generates the wiring enters 0, 1 and 9',
     skipUnless(...ONES), () => {
  for (const name of ONES) {
    const spec = describeTouchWiring(takeApart(containerOf(name)));
    const needs = touchWiringNeeds(spec.settings, spec.timers);
    for (const kind of ['lists', 'modes', 'variables', 'maps', 'entries', 'programs'] as const) {
      assert.deepEqual(Object.keys(spec[kind]).sort(), [...needs[kind]].sort(), `${name}: ${kind}`);
    }
    // The three head screens the wiring enters are generated, section 408's modes 0, 1 and 9.
    assert.ok(!('lowBattery' in spec.modes) && !('usbConnected' in spec.modes) && !('chargingProblem' in spec.modes), name);
  }
  assert.equal(TOUCH_FIRMWARE_SCREENS.length, 10);
  assert.deepEqual(['lowBattery', 'usbConnected', 'chargingProblem'].map((s) => TOUCH_FIRMWARE_SCREENS.indexOf(s)), [0, 1, 9]);
});

test('section 410: a shared caller asks the family for its wiring check, and each family\'s passes one compile of its own',
     skipUnless('harvest_one_two_devices', 'h650_config_region'), () => {
  for (const name of ['harvest_one_two_devices', 'h650_config_region']) {
    const c = containerOf(name);
    const family = familyOf(c);
    assert.ok(family !== undefined, name);
    assert.ok(family.wiring.check(c).lists > 0, name);
  }
});

test('section 410: the controls fail: two timers swapped, a list missing, a firmware timer missing, a call timer of an unknown length read as a third screen light, an enter of a length none has, the ladder\'s 07 FFFB without the assistant, and the Harmony 600 family\'s description reader on a One',
     skipUnless('harvest_one_two_devices', 'one_config'), () => {
  const c = containerOf('harvest_one_two_devices');
  const layout = takeApart(c);
  const spec = describeTouchWiring(layout);
  const refuses = (make: () => unknown, pattern: RegExp): void =>
    assert.throws(make, (e: unknown) => e instanceof WiringError && pattern.test(e.message), String(pattern));

  // Two firmware timers with their places swapped: the tick and the lights out.
  const timers = [...spec.timers];
  const a = timers.indexOf('lightTick');
  const b = timers.indexOf('lightsOut');
  [timers[a], timers[b]] = [timers[b]!, timers[a]!];
  refuses(() => compareWiring(c, takeApart(c), buildTouchWiring({ ...spec, timers })), /^the built wiring differs from the configuration's at byte \d+, in slot-12-record$/);
  // A list the description lacks.
  const { ready: _ready, ...lists } = spec.lists;
  refuses(() => buildTouchWiring({ ...spec, lists }), /^the description names no list "ready"$/);
  // A redraw timer out of its numbering in the tick's place, and the tick missing.
  refuses(() => buildTouchWiring({ ...spec, timers: spec.timers.map((t) => (t === 'lightTick' ? 'redraw99' : t)) }), /^timer \d+, redraw99, is out of order/);
  refuses(() => buildTouchWiring({ ...spec, timers: spec.timers.filter((t) => t !== 'lightTick') }), /^the timer table holds no lightTick$/);
  // A timer whose duration no firmware timer has, in the compile's own bytes.
  const tick = targets(layout.sections[12]!.head[0]!)[a]!;
  // Any length but the firmware's own is read as a screen light, the one setting a timer's length is, so the
  // tick at 7 seconds makes three of those.
  tick.bytes[1] = 7;
  refuses(() => describeTouchWiring(layout), /^the timer table holds 2 five second timers calling a list and 3 of the screen light's, where the One holds two of each$/);
  // And an enter of a length none has is refused as itself.
  const second = targets(layout.sections[12]!.head[0]!)[spec.timers.indexOf('second0')]!;
  tick.bytes[1] = 2;
  second.bytes[1] = 9;
  refuses(() => describeTouchWiring(layout), /^timer \d+ is none the One's firmware holds: enter 9 seconds$/);
  // The ladder's 07 FFFB where no compile shows it.
  const plain = describeTouchWiring(takeApart(containerOf('one_config')));
  refuses(() => buildTouchWiring({ ...plain, settings: { ...plain.settings, ladderCancelsTimers: true } }), /^no compile opens the ladder with 07 FFFB where it has no Remote Assistant$/);
  // The Harmony 600 family's builder does not read a One.
  refuses(() => describeWiring(takeApart(c)), /^skin 54 is not a Harmony 600, 650 or 700 measured here$/);
  // And the description a One compile gives is checked whole: checkTouchWiring passes it.
  assert.ok(checkTouchWiring(c).lists > 0);
});
