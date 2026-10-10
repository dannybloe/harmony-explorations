/**
 * A setup description and a donor in, a whole container out: `todo-compile-650.md` 10.6, sections 362 and 364.
 *
 * **Four things are measured here.** The list census a renumbering of base slot 10 rests on, over 22
 * Logitech compiles of the Harmony 600, 650 and 700: dropping every list they reach by nothing changes
 * nothing a person sees and passes the builders' checks that read the compile, and the drop refuses a census short of any one
 * holder, every holder naming lists a drop moves. The assembly of the Harmony 650's test setup with Logitech's clean compile as the donor:
 * what it drops, what a person sees against the donor and against the 10.2.2 composition, and why the
 * two differ in length. And which bytes of each a generator reproduces, which is the premise table of
 * section 362: what is still the donor's. And, since section 364, the assembly composing the setup's
 * devices and activities the donor lacks: on the starting compile, and refused on the smallest one.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { IR_ARCHIVE, needing, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import { modelForSkin } from '@harmony/usb/models';
import type { AssemblyScreenItem, Container, SetupDescription } from '../src/index.ts';
import {
  AssemblyError,
  TRACK_SETTINGS,
  assembleSetup,
  attributeBytes,
  buildFirmwareScreens,
  buildScreenRecords,
  buildScreenTexts,
  buildWiring,
  checkFirmwareScreens,
  checkScreenRecords,
  checkScreenTexts,
  checkWiring,
  claims,
  compareDrawnTexts,
  compareViews,
  describeFirmwareScreens,
  describeScreenRecords,
  describeScreenTexts,
  describeWiring,
  ACTIVITY_STATE_NAME,
  DEVICES_KEY_TAG,
  MAP_VALUE_OPCODE,
  devices,
  dropLists,
  inActivityOrder,
  activityEntriesByName,
  layOutContainer,
  listCallSites,
  modeRecords,
  namedLists,
  parse,
  setupView,
  stateVariables,
  takeApart,
  withFirmwareScreens,
  withScreenRecords,
  withScreenTexts,
  withWiring,
} from '../src/index.ts';

/**
 * The 22 arch 14 compiles sections 356 to 360 measure, by the skin each states: 13 Harmony 650, 2 Harmony
 * 600, 7 Harmony 700. Section 360's 23 adds `harvest_650_two_devices`, which holds no activity to compare.
 */
const TWENTY_TWO = [
  'h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4',
  'h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean',
  'h650_issue36_config',
] as const;

const containerOf = (name: string): Container => parse(new Uint8Array(require_(name)));
/** What composing needs beside the donor: the catalogue's archive and the Harmony 650's device count. */
const composing = (): { archive: string; maxDevices: number } =>
  ({ archive: IR_ARCHIVE!, maxDevices: modelForSkin(72)!.maxDevices });
const setupOf = (file: string): SetupDescription =>
  JSON.parse(readFileSync(new URL(`../../corpus/setups/${file}`, import.meta.url), 'utf8')) as SetupDescription;
const front = (c: Container): number => buildWiring(describeWiring(takeApart(c))).frontLength;
/**
 * Per holder on `h650_test_config_clean`: its places, those naming a list the drop of its 323 unreached
 * lists moves, and the lists no other holder names. A page list and its second copy hold the same lists,
 * section 69, but 426 of the 700 places name a different table entry from the copy's, and 274 the same
 * one; the copy's own are lists no firmware path reaches, and the census keeps them, since an emitter
 * reproduces the copies.
 */
const HOLDERS_ON_THE_CLEAN_COMPILE = {
  'action list': [3308, 3308, 1837],
  'base slot 9 entry': [345, 339, 31],
  'leading list': [7, 2, 5],
  'mode key map': [734, 733, 377],
  'page list': [700, 698, 426],
  'page list copy': [700, 698, 426],
  'screen program': [5769, 5759, 5769],
  'state transition': [92, 91, 69],
  timer: [4, 4, 3],
};

/** The lists nothing reaches, the census's own answer. */
const unreached = (c: Container): number[] => {
  const named = namedLists(c);
  return (c.actionLists() ?? []).map((_, k) => k).filter((k) => !named.has(k));
};

// ---------------------------------------------------------------------------------------------------
// The census
// ---------------------------------------------------------------------------------------------------

test('dropping every list a Logitech compile reaches by nothing changes nothing a person sees and passes the wiring, screen record, firmware screen and text checks wherever they read the compile, on 22 compiles of three models',
     skipUnless(...TWENTY_TWO), () => {
  let dropped = 0;
  let bytes = 0;
  let sites = 0;
  const passing = new Map<string, number>();
  for (const name of TWENTY_TWO) {
    const c = containerOf(name);
    const census = listCallSites(c);
    sites += census.length;
    const gone = unreached(c);
    const floor = front(c);
    // None below the wiring's front, where an index is the firmware's.
    assert.equal(gone.filter((k) => k < floor).length, 0, `${name}: a list below the front reached by nothing`);
    const d = dropLists(c, gone, floor, census);
    dropped += d.dropped.length;
    bytes += d.length;
    const e = parse(d.bytes);
    assert.ok(e.allChecksPass, `${name}: the result fails its own checks`);
    assert.deepEqual(compareViews(setupView(e), setupView(c)), [], `${name}: a person sees a difference`);
    assert.equal(namedLists(e).size, (e.actionLists() ?? []).length, `${name}: a list is reached by nothing after`);
    checkWiring(e);
    checkScreenRecords(e);
    // The two builders that refuse a compile they do not read: held to pass after where they pass before.
    for (const [check, tally] of [[checkFirmwareScreens, 'firmware screens'], [checkScreenTexts, 'texts']] as const) {
      try {
        check(c);
      } catch {
        continue;
      }
      check(e);
      passing.set(tally, (passing.get(tally) ?? 0) + 1);
    }
  }
  // `h650_issue36_config`'s firmware screens do not read before the drop either.
  assert.deepEqual(Object.fromEntries(passing), { 'firmware screens': 21, texts: 22 });
  assert.equal(sites, 232309);
  assert.equal(dropped, 6528);
  assert.equal(bytes, 48801);
});

test('every holder of the census names lists a drop moves, and the drop refuses a census short of any one of them',
     skipUnless('h650_test_config_clean', 'h650_favourites_config'), () => {
  const c = containerOf('h650_test_config_clean');
  const census = listCallSites(c);
  const gone = unreached(c);
  const floor = front(c);
  const lowest = Math.min(...gone);
  // Per holder: its places, the places naming a list the drop renumbers, and the lists no other holder
  // names. A holder whose places all name lists below the lowest drop could be left out harmlessly here,
  // and none is such a holder.
  const by = new Map<string, [number, number, number]>();
  for (const holder of new Set(census.map((one) => one.holder))) {
    const mine = census.filter((one) => one.holder === holder);
    const others = new Set(census.filter((one) => one.holder !== holder).map((one) => one.list));
    by.set(holder, [mine.length, mine.filter((one) => one.list > lowest).length,
      new Set(mine.map((one) => one.list).filter((k) => !others.has(k))).size]);
  }
  assert.deepEqual(Object.fromEntries([...by].sort()), HOLDERS_ON_THE_CLEAN_COMPILE);
  // The whole census drops; short of any one holder, `checkRenumbering` refuses what is left.
  assert.equal(dropLists(c, gone, floor, census).dropped.length, 323);
  for (const holder of by.keys()) {
    assert.throws(() => dropLists(c, gone, floor, census.filter((one) => one.holder !== holder)), AssemblyError,
      `without the ${holder} places the drop is not refused`);
  }
  // The tenth holder, the number senders, section 154, has no place on the clean compile: put to the same
  // control on the favourites compile.
  const f = containerOf('h650_favourites_config');
  const fCensus = listCallSites(f);
  const fGone = unreached(f);
  const fFloor = front(f);
  const senders = fCensus.filter((one) => one.holder === 'number sender');
  assert.equal(senders.length, 30);
  assert.equal(senders.filter((one) => one.list > Math.min(...fGone)).length, 30);
  assert.equal(dropLists(f, fGone, fFloor, fCensus).dropped.length, 281);
  assert.throws(() => dropLists(f, fGone, fFloor, fCensus.filter((one) => one.holder !== 'number sender')), AssemblyError);
});

test('a list something reaches is not dropped, and nothing below the front is',
     skipUnless('h650_test_config_clean'), () => {
  const c = containerOf('h650_test_config_clean');
  const floor = front(c);
  const reached = [...namedLists(c)].filter((k) => k >= floor)[0] as number;
  assert.throws(() => dropLists(c, [reached], floor), AssemblyError);
  assert.throws(() => dropLists(c, [unreached(c)[0] as number], 1_000_000), AssemblyError);
});

// ---------------------------------------------------------------------------------------------------
// The assembly of the test setup
// ---------------------------------------------------------------------------------------------------

/** The 10.2.2 file, composed as the lab's `make-10-2-2.ts` does from the 6.2.13 file the 650 ran. */
function tenTwoTwo(): Container {
  const names = setupOf('h650-test.json').activities.map((one) => one.name);
  let c = containerOf('h650_7_1_base');
  let layout = takeApart(c);
  const records = describeScreenRecords(c, layout);
  const spec = inActivityOrder(records.spec, activityEntriesByName(c, names));
  c = parse(layOutContainer(withScreenRecords(layout, buildScreenRecords(spec, c), records.place)).bytes);
  layout = takeApart(c);
  const firmware = describeFirmwareScreens(c, layout);
  c = parse(layOutContainer(withFirmwareScreens(layout, buildFirmwareScreens(firmware.spec, c), firmware.place)).bytes);
  layout = takeApart(c);
  const texts = describeScreenTexts(c, layout);
  c = parse(layOutContainer(withScreenTexts(layout, buildScreenTexts(texts.spec, c), texts.place)).bytes);
  layout = takeApart(c);
  const read = describeWiring(layout);
  const settings = { ...read.settings, remoteAssistant: false, delayRestore: false, help: false, tourShown: false };
  return parse(layOutContainer(withWiring(layout, buildWiring({ ...read, settings }))).bytes);
}

/** Bytes per coverage owner, an action list counted as reached or not. */
function owners(c: Container): Map<string, number> {
  const named = namedLists(c);
  const listAt = new Map<number, number>();
  (c.pointerArray(10) ?? []).forEach((address, index) => {
    const at = c.blobOffsetOf(address);
    if (at !== undefined && !listAt.has(at)) listAt.set(at, index);
  });
  const out = new Map<string, number>();
  for (const claim of claims(c)) {
    let name = claim.owner;
    if (name === 'slot-10-list') name = named.has(listAt.get(claim.start) ?? -1) ? 'list reached' : 'list reached by nothing';
    out.set(name, (out.get(name) ?? 0) + claim.length);
  }
  return out;
}

test('the test setup assembled on Logitech\'s clean compile drops section 360\'s 70 lists and differs from the donor only in the menu\'s order',
     skipUnless('h650_test_config_clean'), () => {
  const donor = containerOf('h650_test_config_clean');
  const out = assembleSetup(setupOf('h650-test.json'), { donor: donor.blob });
  assert.deepEqual(out.steps.map((one) => [one.step, one.bytes]), [
    ['donor', 1000819], ['screen records', 1000819], ['firmware screens', 1000819], ['texts', 1000819],
    ['pictures', 1000819],
    ['wiring', 1000808], ['state tables', 1000808], ['mode 0', 1000808], ['lists dropped', 999922], ['placed', 999922],
  ]);
  assert.deepEqual(out.keptOn, []);
  // Section 360's count: the restore of saved delays 57, scan 6's Help list 8, the Assistant's gate 4 and
  // the help hold list 1. 676 bytes of lists and 70 table entries of three.
  assert.equal(out.dropped.length, 70);
  assert.equal(unreached(out.container).length, unreached(donor).length);
  assert.deepEqual(compareViews(setupView(out.container), setupView(donor), { menuOrder: false }), []);
  assert.deepEqual(compareViews(setupView(out.container), setupView(donor)).map((one) => one.key), [
    'activity menu | page 1 | cell 0', 'activity menu | page 1 | cell 2', 'activity menu | page 2 | cell 2',
    'activity menu | page 3 | cell 0',
  ]);
  const texts = compareDrawnTexts(out.container, donor);
  assert.equal(texts.length, 8);
  assert.ok(texts.every((one) => one.text.startsWith('activity menu|')), 'a text off the activity menu differs');
});

test('the assembled test setup and the 10.2.2 composition show and draw the same, and the 1723 bytes are Logitech\'s Plasma kijken with its Help, the 70 lists the old way left behind, and the two donors\' own unreached lists',
     skipUnless('h650_test_config_clean', 'h650_7_1_base'), () => {
  const ours = assembleSetup(setupOf('h650-test.json'), { donor: require_('h650_test_config_clean') }).container;
  const theirs = tenTwoTwo();
  assert.equal(theirs.blob.length, 998199);
  assert.deepEqual(compareViews(setupView(ours), setupView(theirs)), []);
  assert.deepEqual(compareDrawnTexts(ours, theirs), []);
  assert.equal(ours.blob.length - theirs.blob.length, 1723);
  // By owner: the fifteen screens Logitech compiles for Plasma kijken and our composition does not, its two
  // Help bindings, its lists, and the 70 lists the 10.2.2 file still carries.
  const [a, b] = [owners(ours), owners(theirs)];
  const delta = (key: string): number => (a.get(key) ?? 0) - (b.get(key) ?? 0);
  const screens = ['slot-6-mode', 'slot-6-entry', 'slot-6-page', 'slot-6-page-list', 'slot-6-page-list-copy',
    'slot-6-table', 'slot-11-program', 'slot-11-table'].reduce((n, key) => n + delta(key), 0);
  assert.equal((modeRecords(ours) ?? []).length - (modeRecords(theirs) ?? []).length, 15);
  assert.equal(screens, 1574);
  assert.equal(delta('slot-9-list'), 8);
  assert.equal(delta('list reached'), 614);
  assert.equal(delta('list reached by nothing'), -554);
  assert.equal(delta('slot-10-table'), 81);
  assert.equal(screens + 8 + 614 - 554 + 81, 1723);
  const all = new Set([...a.keys(), ...b.keys()]);
  const others = [...all].filter((key) => ![
    'slot-6-mode', 'slot-6-entry', 'slot-6-page', 'slot-6-page-list', 'slot-6-page-list-copy', 'slot-6-table',
    'slot-11-program', 'slot-11-table', 'slot-9-list', 'list reached', 'list reached by nothing', 'slot-10-table',
  ].includes(key) && delta(key) !== 0);
  assert.deepEqual(others, []);
  // The 10.2.2 file's lists reached by nothing are its donor's own and the 70; ours are the clean compile's.
  assert.equal(unreached(theirs).length, 376);
  assert.equal(unreached(ours).length, 323);
});

test('a second setup assembles and passes every check: the starting setup on its own compile, and the options setup kept on from the setup file',
     skipUnless('h650_start_config', 'h650_options_config'), () => {
  const start = assembleSetup(setupOf('h650-start.json'), { donor: require_('h650_start_config') });
  assert.equal(start.bytes.length, 996014);
  assert.equal(start.dropped.length, 70);
  assert.deepEqual(compareViews(setupView(start.container), setupView(containerOf('h650_start_config')), { menuOrder: false }), []);
  // The Denon kept on by the setup file's flag, on Logitech's compile without it: what a person sees is
  // Logitech's compile with it, section 340.
  const options = assembleSetup(setupOf('h650-options.json'), { donor: require_('h650_start_config') });
  assert.deepEqual(options.keptOn, ['Denon']);
  assert.deepEqual(compareViews(setupView(options.container), setupView(containerOf('h650_options_config')), { menuOrder: false }), []);
  // And the same setup on that compile keeps nothing on, since it is already in force.
  assert.deepEqual(assembleSetup(setupOf('h650-options.json'), { donor: require_('h650_options_config') }).keptOn, []);
});

test('a setup the donor cannot serve is refused: an input named with no catalogue to number it, an activity the donor holds and the setup does not, another model, a device kept on against the setup',
     skipUnless('h650_start_config', 'h650_test_config_clean', 'h700_config', 'h650_options_config'), () => {
  assert.throws(() => assembleSetup(setupOf('h650-test.json'), { donor: require_('h650_start_config') }),
    /composing Plasma kijken: Plasma kijken puts Plasma on HDMI 1, and naming a donor device's input needs the catalogue's archive/);
  assert.throws(() => assembleSetup(setupOf('h650-start.json'), { donor: require_('h650_test_config_clean') }),
    /holds an activity called Plasma kijken that the setup does not/);
  assert.throws(() => assembleSetup(setupOf('h650-start.json'), { donor: require_('h700_config') }), AssemblyError);
  assert.throws(() => assembleSetup(setupOf('h650-start.json'), { donor: require_('h650_options_config') }),
    /keeps Denon on/);
});

// ---------------------------------------------------------------------------------------------------
// Which bytes a generator reproduces
// ---------------------------------------------------------------------------------------------------

test('a generator lays 114896 bytes of the test setup assembled on the clean compile and rewrites 67890 of address fields in the donor\'s pieces, and the rest is the donor\'s by what it is',
     skipUnless('h650_test_config_clean'), () => {
  const out = assembleSetup(setupOf('h650-test.json'), { donor: require_('h650_test_config_clean') });
  const a = attributeBytes(out.container);
  assert.equal(a.total, 999922);
  assert.deepEqual(a.generated, {
    frame: 122, addresses: 67890, description: 17752, 'mode 0': 649, wiring: 1143, 'state tables': 38334,
    'screen records': 906, 'firmware screens': 4712, texts: 10212, pictures: 41066,
  });
  const carried = (...keys: string[]): number => keys.reduce((n, key) => n + (a.carried.get(key) ?? 0), 0);
  assert.equal(carried('slot-7-glyph', 'slot-7-set'), 92170);
  // The eleven designed pictures, todo 9.1.2; the six a rule draws are the generators' since section 363.
  assert.equal(carried('picture-bank'), 360664);
  assert.equal(carried('slot-5-block', 'slot-5-header', 'slot-5-group'), 220607);
  assert.equal(carried('slot-10-list reached'), 74513);
  assert.equal(carried('slot-10-list reached by nothing'), 2393);
  assert.equal(carried('slot-11-program', 'slot-6-mode', 'slot-6-entry', 'slot-6-page-list', 'slot-6-page-list-copy',
    'slot-9-list'), 66775);
  const generated = Object.values(a.generated).reduce((n, v) => n + v, 0);
  assert.equal(generated + [...a.carried.values()].reduce((n, v) => n + v, 0), a.total);
  assert.equal(a.carried.get('unclaimed'), undefined);
});

test('the track settings are the ones the 10.2.2 file was built with, with the screen lit 20 seconds',
     skipUnless('h650_7_1_base'), () => {
  // `tenTwoTwo` takes the 6.2.13 file's settings and turns the Assistant, the restore, Help and the tour off.
  const read = describeWiring(takeApart(containerOf('h650_7_1_base'))).settings;
  assert.deepEqual(TRACK_SETTINGS, { ...read, remoteAssistant: false, delayRestore: false, help: false, tourShown: false });
  assert.deepEqual(TRACK_SETTINGS, {
    glowTime: 20, tiltSensor: true, remoteAssistant: false, bootStep: false, tourShown: false,
    delayRestore: false, help: false,
  });
});

// ---------------------------------------------------------------------------------------------------
// The composing route: the setup's devices and activities the donor lacks, from the composers, section 364
// ---------------------------------------------------------------------------------------------------

/**
 * Plasma kijken's working screen, which the setup file does not state: the three device commands and the
 * Radio sequence Logitech's compile of the setup draws there, the sequence as the setup's `about` states
 * it, KPN 1, a two second pause, KPN 2, by the keys' scan codes, `keys.md`.
 */
const PLASMA_KIJKEN_SCREEN: readonly AssemblyScreenItem[] = [
  { device: 'KPN', command: 'Teletext' }, { device: 'KPN', command: 'DVR' }, { device: 'Plasma', command: 'Aspect' },
  { sequence: 'Radio', steps: [{ device: 'KPN', scan: 24 }, { pause: 20 }, { device: 'KPN', scan: 47 }] },
];

test('on Logitech\'s starting compile the test setup\'s fifth activity is composed from the setup file and its screen, and the result is the 6.2.13 file put through the same assembly but for its build stamp, and lays 114438 bytes as content',
     needing(skipWithoutIrArchive(), skipUnless('h650_start_config', 'h650_7_1_base', 'h650_test_config_clean')), () => {
  const out = assembleSetup(setupOf('h650-test.json'), {
    donor: require_('h650_start_config'), ...composing(), screens: { 'Plasma kijken': PLASMA_KIJKEN_SCREEN },
  });
  assert.deepEqual(out.composed, { devices: [], activities: ['Plasma kijken'] });
  assert.deepEqual(out.keptOn, ['KPN']);
  assert.equal(out.bytes.length, 997313);
  assert.equal(out.dropped.length, 70);
  // The 6.2.13 file, the lab's chain of composers on the same compile, through the same passes: the same
  // bytes but the build stamp, five in base slot 3 and the same five in the clock's records.
  const chain = assembleSetup(setupOf('h650-test.json'), { donor: require_('h650_7_1_base') });
  assert.deepEqual(chain.composed, { devices: [], activities: [] });
  const owners = claims(out.container);
  const differing = [...out.bytes.keys()].filter((k) => out.bytes[k] !== chain.bytes[k])
    .map((k) => owners.find((one) => k >= one.start && k < one.start + one.length)?.owner);
  assert.equal(chain.bytes.length, out.bytes.length);
  assert.deepEqual(differing, [...Array(5).fill('slot-13-record'), ...Array(5).fill('slot-3-clock')]);
  // Against Logitech's compile of the setup, the menu's order alone; against the 10.2.2 file, nothing.
  const clean = containerOf('h650_test_config_clean');
  assert.deepEqual(compareViews(setupView(out.container), setupView(clean), { menuOrder: false }), []);
  assert.equal(compareDrawnTexts(out.container, clean).length, 8);
  const ten = tenTwoTwo();
  assert.deepEqual(compareViews(setupView(out.container), setupView(ten)), []);
  assert.deepEqual(compareDrawnTexts(out.container, ten), []);
  assert.equal(ten.blob.length - out.bytes.length, 886);
  // Which bytes are ours, and what composing Plasma kijken added: the same assembly without it.
  const a = attributeBytes(out.container);
  assert.deepEqual(a.generated, {
    frame: 122, addresses: 67272, description: 17582, 'mode 0': 649, wiring: 1143, 'state tables': 38334,
    'screen records': 906, 'firmware screens': 4712, texts: 9924, pictures: 41066,
  });
  assert.equal([...a.carried.values()].reduce((n, v) => n + v, 0), 815603);
  const setup = setupOf('h650-test.json');
  const without = assembleSetup({ ...setup, activities: setup.activities.filter((one) => one.name !== 'Plasma kijken') },
    { donor: require_('h650_start_config'), ...composing() });
  assert.equal(out.bytes.length - without.bytes.length, 1308);
});

test('with no screen stated, the composed activity\'s screen is empty: the menu\'s order aside, its four items are what a person misses',
     needing(skipWithoutIrArchive(), skipUnless('h650_start_config', 'h650_test_config_clean')), () => {
  const out = assembleSetup(setupOf('h650-test.json'), { donor: require_('h650_start_config'), ...composing() });
  const missing = compareViews(setupView(out.container), setupView(containerOf('h650_test_config_clean')), { menuOrder: false });
  assert.deepEqual(missing.map((one) => [one.key, one.kind, one.b?.label]).sort(), [
    ['activity Plasma kijken | page 1 | scan 2', 'only in b', 'DVR'],
    ['activity Plasma kijken | page 1 | scan 34', 'only in b', 'Radio'],
    ['activity Plasma kijken | page 1 | scan 8', 'only in b', 'Teletext'],
    ['activity Plasma kijken | page 1 | scan 9', 'only in b', 'Aspect'],
  ]);
  // The drawn texts: the menu's 8 as with the screen given, and the four the empty screen does not draw.
  const texts = compareDrawnTexts(out.container, containerOf('h650_test_config_clean'));
  assert.equal(texts.length, 12);
  assert.equal(texts.filter((one) => one.text.startsWith('activity menu|')).length, 8);
});

test('the smallest Harmony 650 compile the lab registers, two devices and no activity, takes no composer: the device composer knows the activity menu by its activity rows and it has none, its fonts lack letters, and an activity needs another to be told apart from',
     needing(skipWithoutIrArchive(), skipUnless('harvest_650_two_devices')), () => {
  const smallest = require_('harvest_650_two_devices');
  // Its two devices are the setup's LG television and Denon receiver under the names Logitech gives them.
  assert.deepEqual(devices(parse(smallest)).map((one) => one.name), ['LG_OLED65G26LA', 'Denon_AVR-X4800H']);
  // The file does map the key under Devices through the activity counter, in three modes; what refuses is
  // the reader, which picks the activity menu as the mode whose rows select the most activities.
  const c = parse(smallest);
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  const mapped = (modeRecords(c) ?? []).flatMap((record, index) => record.entries.some((one) =>
    one.tag === DEVICES_KEY_TAG && one.opcode === MAP_VALUE_OPCODE && (one.operand & 0xff) === counter?.index) ? [index] : []);
  assert.deepEqual(mapped, [96, 97, 101]);
  assert.throws(() => assembleSetup(setupOf('h650-test.json'), { donor: smallest, ...composing() }),
    /composing Plasma, KPN, Kodi, Switch, Sony HT: the activity menu does not map the key under Devices through the activity counter/);
  // Each device alone, by its first refusal.
  const alone = (name: string): string => {
    const setup = setupOf('h650-test.json');
    const one = { devices: setup.devices.filter((d) => ['LG TV', 'Denon', name].includes(d.name)), activities: [] };
    try {
      assembleSetup(one, { donor: smallest, ...composing() });
      return 'composed';
    } catch (error) {
      return (error as Error).message.replace(/^composing [^:]+: /, '');
    }
  };
  assert.deepEqual(Object.fromEntries(['Plasma', 'KPN', 'Kodi', 'Switch', 'Sony HT'].map((name) => [name, alone(name)])), {
    Plasma: 'the activity menu does not map the key under Devices through the activity counter',
    KPN: 'font 6 has no glyph for \'K\', so it cannot be drawn',
    Kodi: 'font 6 has no glyph for \'K\', so it cannot be drawn',
    Switch: 'the activity menu does not map the key under Devices through the activity counter',
    'Sony HT': 'no font in this config spells \'Eject\'',
  });
  // And an activity on its own two devices: with an input, the television has no input variable to put it
  // on, nor has the receiver, since this compile gave neither one; without, the activity composer refuses.
  const tv = (input?: string): SetupDescription => ({
    devices: setupOf('h650-test.json').devices.filter((d) => ['LG TV', 'Denon'].includes(d.name)),
    activities: [{ name: 'TV', type: 'Custom', devices: [
      { device: 'LG TV', ...(input === undefined ? {} : { input }), roles: ['Display'] }, { device: 'Denon', roles: ['Volume'] }] }],
  });
  assert.throws(() => assembleSetup(tv('HDMI 1'), { donor: smallest, ...composing() }),
    /composing TV: LG TV has no input variable here to put on HDMI 1/);
  assert.throws(() => assembleSetup(tv(), { donor: smallest, ...composing() }),
    /composing TV: no activity here, so the records keyed by the activity cannot be told apart/);
});

test('a device the donor lacks is composed from the catalogue with an activity on it, and every check passes',
     needing(skipWithoutIrArchive(), skipUnless('h650_start_config')), () => {
  const start = setupOf('h650-start.json');
  const setup: SetupDescription = {
    devices: [...start.devices, { name: 'Pana', device: 'Panasonic/TX-P42GT30E' }],
    activities: [...start.activities, { name: 'Kijk twee', type: 'Custom', devices: [
      { device: 'Pana', input: 'HDMI 2', roles: ['Display', 'Volume'] }, { device: 'KPN', roles: ['ChannelChanging'] }] }],
  };
  const out = assembleSetup(setup, { donor: require_('h650_start_config'), ...composing() });
  assert.deepEqual(out.composed, { devices: ['Pana'], activities: ['Kijk twee'] });
  assert.equal(out.bytes.length, 1068094);
  assert.ok(devices(out.container).some((one) => one.name === 'Pana'));
  // Unbounded composing is refused rather than run: the model's device count is the caller's to give.
  assert.throws(() => assembleSetup(setup, { donor: require_('h650_start_config'), archive: IR_ARCHIVE! }),
    /composing a device needs the model's device count/);
  // A label the corner cannot hold is the composer's refusal, named with the device.
  const wide = { ...setup, devices: [...start.devices, { name: 'Plasma 2', device: 'Panasonic/TX-P42GT30E' }],
    activities: start.activities };
  assert.throws(() => assembleSetup(wide, { donor: require_('h650_start_config'), ...composing() }),
    /composing Plasma 2: 'Plasma 2' is 61 pixels wide and a corner holds 59/);
});
