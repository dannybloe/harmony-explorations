/**
 * The Harmony One test setup composed two ways and compared by what a person meets, `todo-compile-one.md` 8.1.5,
 * findings section 436: onto Logitech's compile of two devices, `harvest_one_two_devices` (`composesetup.test.ts`,
 * section 433), and onto our own empty One (`composeempty.test.ts`, section 435). Every text drawn on every screen,
 * what every key and every touch does on every screen, in every activity and in device mode down to the infrared
 * code sent, and every action list either file can run, through `touchView`.
 *
 * **What is held.** That every difference between the two views is one of seven causes, each counted exactly, with
 * nothing left over; and for each cause the measurement that says it is that cause and not something else hiding
 * under its name. That the views' walk runs exactly the lists `listsReached` counts, so no list either file can run
 * goes uncompared. And the control: a send planted in one file is found as a difference no cause explains.
 *
 * **What it found and what was fixed.** A third kind of difference, the donor's Denon and LG inputs sending the wrong
 * commands on the composition onto Logitech's compile, was a defect, fixed in `composeDonorDeviceInputs` with its own
 * test in `composecatalogue.test.ts`; it is asserted gone here.
 *
 * Both compositions are the slow part and are made once for the whole file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { IR_ARCHIVE, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import { type ComposedSetup, type Container, composeSetup, parse, readRecipe } from '../src/index.ts';
import { SEND_INFRARED, devices } from '../src/inventory.ts';
import { instructionSites } from '../src/assemble.ts';
import { composeDonorDeviceInfrared } from '../src/composecatalogue.ts';
import { buildEmptyTouchConfiguration } from '../src/families/touch/empty.ts';
import {
  type TouchView, type TouchViewDifference, type TouchViewOptions, type TouchViewResult, compareTouchViews, touchView,
} from '../src/families/touch/view.ts';
import { modeRecords, stateRecords } from '../src/sections.ts';
import { timers } from '../src/tables.ts';
import { valueMaps } from '../src/valuemap.ts';
import { listsReached } from './screenlists.ts';

const recipe = () => readRecipe(JSON.parse(readFileSync(new URL('../../corpus/setups/one-test.json', import.meta.url), 'utf8')));

/** The stamp both compositions are built at, the composed setup tests'. */
const BUILT_AT = '2026-10-15T12:00:00';

const NEEDS = { skip: skipUnless('harvest_one_two_devices').skip || skipWithoutIrArchive().skip };

let onLogitechOnce: ComposedSetup | undefined;
/** The setup composed onto Logitech's compile of two devices, section 433's path. */
const onLogitech = (): ComposedSetup => {
  onLogitechOnce ??= composeSetup(recipe(), { donor: require_('harvest_one_two_devices'), archive: IR_ARCHIVE!, builtAt: BUILT_AT });
  return onLogitechOnce;
};
let onEmptyOnce: ComposedSetup | undefined;
/** The setup composed onto our empty One, unblended as a donor of ours is, section 435's path. */
const onEmpty = (): ComposedSetup => {
  onEmptyOnce ??= composeSetup(recipe(), {
    donor: buildEmptyTouchConfiguration({ skin: 54, builtAt: BUILT_AT, blend: false }).bytes, archive: IR_ARCHIVE!, builtAt: BUILT_AT,
  });
  return onEmptyOnce;
};

/**
 * What the view is told of a composition: each device by the setup's name for it, the two donor devices by
 * `<manufacturer>_<model>` in the donor's name tree as `composeSetupParts` finds them, and each record by the
 * catalogue command whose code it is, through `composeDonorDeviceInfrared`'s mapping by code (section 433), every
 * record of all seven devices being the catalogue's on both paths.
 */
function namesOf(c: Container): TouchViewOptions {
  const deviceNames = new Map<number, string>();
  const commandNames = new Map<number, string[]>();
  for (const one of recipe().devices) {
    const [manufacturer, model] = one.device.split('/') as [string, string];
    const held = devices(c).find((d) => d.name !== undefined && (d.name.replaceAll('_', ' ') === one.name || d.name === one.device.replace('/', '_')));
    assert.ok(held?.name !== undefined && held.group !== undefined, one.name);
    deviceNames.set(held.group, one.name);
    const mapped = composeDonorDeviceInfrared(c, IR_ARCHIVE!, { label: held.name, manufacturer, model }).mapped;
    const names: string[] = [];
    for (const record of mapped) names[record.from] = record.name;
    commandNames.set(held.group, names);
  }
  return { deviceNames, commandNames };
}

const views = new Map<Container, TouchViewResult>();
const viewOf = (c: Container): TouchViewResult => {
  const held = views.get(c) ?? touchView(c, namesOf(c));
  views.set(c, held);
  return held;
};
const a = (): TouchView => viewOf(onLogitech().container).view;
const b = (): TouchView => viewOf(onEmpty().container).view;

/** A key's screen part, so a cause is said once per screen rather than per binding. */
const IS_HELP = /^screen "(Isthe|Nowisthe|Didthatfixtheproblem|Attempingtofix)/;
/** A device list is named where it is reached: the key below the screen labelled Devices, event 2 code 55, `183`. */
const IS_DEVICE_LIST = /^screen (screen@\(keys [^)]* 183\.0\)|unreached device-list) \|/;

/**
 * The seven causes, in the order the finding gives them, each a test of the key and the two values. A difference
 * that no test takes is unexplained, and the first test that takes it is its cause.
 */
const CAUSES: readonly (readonly [string, (d: TouchViewDifference) => boolean])[] = [
  ['the donor\'s two devices keep Logitech\'s device pages', (d) => /^screen device (LG TV|Denon) \|/.test(d.key)],
  ['device lists: the donor\'s labels and its device order', (d) => IS_DEVICE_LIST.test(d.key)],
  ['the power off help: the donor\'s labels and its device order', (d) => IS_HELP.test(d.key)],
  ['the order an activity\'s start and All Off switch devices off', (d) => /^keys activity /.test(d.key) || d.key.startsWith('map map@(keys idle 1.4) |')],
  ['the donor LG\'s online power variable', (d) => /OnlinePower/.test(d.key) || d.key.startsWith('variable LG_TV_Power_2 |')
    || d.key.startsWith('timer timer@(variable LG_TV_Power_2')],
  ['the start up assistant\'s variable', (d) => d.key.startsWith('variable variable@(screen "USBConnected"')
    || (d.key.startsWith('map unreached') && /USBConnected/.test(d.a ?? d.b ?? ''))],
  ['a timer nothing starts', (d) => d.key.startsWith('timer unreached')],
];

/** Each difference's cause, `unexplained` where none takes it. */
function causes(differences: readonly TouchViewDifference[]): Map<string, TouchViewDifference[]> {
  const out = new Map<string, TouchViewDifference[]>();
  for (const one of differences) {
    const cause = CAUSES.find(([, takes]) => takes(one))?.[0] ?? 'unexplained';
    out.set(cause, [...(out.get(cause) ?? []), one]);
  }
  return out;
}

/** A device list's rows, page by page and top to bottom, as the devices they enter. */
function rows(view: TouchView, screen: string): string[] {
  const found: { page: number; code: number; device: string }[] = [];
  for (const [key, value] of view) {
    const at = new RegExp(`^screen ${screen.replace(/[()]/g, '\\$&')} \\| page (\\d+) \\| event 2 code (\\d+)$`).exec(key);
    const device = /enter device ([^;]+?)(;|$)/.exec(value)?.[1];
    if (at !== null && device !== undefined) found.push({ page: Number(at[1]), code: Number(at[2]), device });
  }
  return found.sort((x, y) => x.page - y.page || x.code - y.code).map((one) => one.device);
}

/** The devices the power off help asks about, in its order: from its opening screen's No, each first question's Yes. */
function helpOrder(view: TouchView): string[] {
  const out: string[] = [];
  const next = (value: string | undefined): string | undefined => /enter ("Isthe[^"]*off\?[^"]*" \{[^}]*\}(?: #\d+)?)/.exec(value ?? '')?.[1];
  let at = next(view.get('screen "Didthatfixtheproblem?Ifnot,theremotewillaskyouqu" | page 1 | event 2 code 50'));
  while (at !== undefined && out.length < 10) {
    out.push(/\{(?:key|touch) ([^,}]*)/.exec(at)?.[1] ?? '?');
    at = next(view.get(`screen ${at} | page 1 | event 2 code 49`));
  }
  return out;
}

/** The devices a list of power writes switches off, in its order, by the variables' device names. */
const offOrder = (value: string | undefined): string[] =>
  [...(value ?? '').matchAll(/(\w+)_Power_2=0/g)].map((one) => (one[1] as string).replaceAll('_', ' '));

// ---------------------------------------------------------------------------------------------------------

test('8.1.5: the two compositions differ in 389 places, every one of them one of seven causes and none unexplained', NEEDS, () => {
  const differences = compareTouchViews(a(), b());
  const counted = Object.fromEntries([...causes(differences)].map(([cause, list]) => [cause, list.length]));
  assert.deepEqual(counted, {
    'the donor\'s two devices keep Logitech\'s device pages': 285,
    'device lists: the donor\'s labels and its device order': 53,
    'the power off help: the donor\'s labels and its device order': 35,
    'the order an activity\'s start and All Off switch devices off': 7,
    'the donor LG\'s online power variable': 4,
    'the start up assistant\'s variable': 3,
    'a timer nothing starts': 2,
  });
  assert.equal(differences.length, 389);
});

test('8.1.5: each view runs exactly the lists listsReached counts and holds every mode, timer, value map and state variable, so nothing either file can run goes uncompared', NEEDS, () => {
  for (const [composed, size, reached] of [[onLogitech(), 4095, 2776], [onEmpty(), 4093, 2771]] as const) {
    const { view, lists } = viewOf(composed.container);
    assert.equal(view.size, size);
    const counted = listsReached(composed.container);
    assert.equal(counted.size, reached);
    assert.deepEqual([...lists].sort((x, y) => x - y), [...counted].sort((x, y) => x - y));
    // And every mode, timer, value map and state variable the file holds has its entry, reached or not.
    const c = composed.container;
    const named = (kind: string): number => new Set([...view.keys()].filter((key) => key.startsWith(`${kind} `)).map((key) => key.split(' | ')[0])).size;
    assert.deepEqual([named('screen'), named('timer'), named('map'), named('variable')],
      [modeRecords(c)?.length, timers(c)?.records.length, valueMaps(c)?.length, stateRecords(c)?.length]);
  }
});

test('8.1.5: device order: each composition lists, asks about and switches off its devices in one order, Logitech\'s two first on its compile and the setup\'s on ours', NEEDS, () => {
  const logitech = ['Denon', 'LG TV', 'Plasma', 'KPN', 'Kodi', 'Switch', 'Sony HT'];
  const setup = ['LG TV', 'Plasma', 'Denon', 'KPN', 'Kodi', 'Switch', 'Sony HT'];
  assert.deepEqual(recipe().devices.map((one) => one.name), setup);
  for (const [view, order] of [[a(), logitech], [b(), setup]] as const) {
    assert.deepEqual(rows(view, 'screen@(keys idle 183.0)'), order);
    assert.deepEqual(rows(view, 'unreached device-list'), order);
    assert.deepEqual(helpOrder(view), order);
    assert.deepEqual(offOrder(view.get('map map@(keys idle 1.4) | 0')), order);
    // An activity's own list: the devices its start switches on, in that order, then the rest in the file's order.
    const kodi = ['Kodi', 'Sony HT'];
    assert.deepEqual(rows(view, 'screen@(keys activity Muziek 183.0)'), [...kodi, ...order.filter((one) => !kodi.includes(one))]);
  }
  const blind = (value: string | undefined): string => (value ?? '').replace(/\w+_Power_2=0/g, 'off');
  // Every start's switching off holds the same devices both ways, in each file's own order.
  for (const key of [...a().keys()].filter((one) => one.startsWith('keys activity '))) {
    const x = offOrder(a().get(key));
    const y = offOrder(b().get(key));
    assert.deepEqual([...x].sort(), [...y].sort(), key);
    assert.deepEqual(x, logitech.filter((one) => x.includes(one)), key);
    assert.deepEqual(y, setup.filter((one) => y.includes(one)), key);
    // And nothing else: with the device each write names taken out, the two are one string, so a send that differed
    // would not be filed under this cause.
    assert.equal(blind(a().get(key)), blind(b().get(key)), key);
  }
  // All Off's case too.
  assert.equal(blind(a().get('map map@(keys idle 1.4) | 0')), blind(b().get('map map@(keys idle 1.4) | 0')));
});

test('8.1.5: the donor\'s labels: the composition onto Logitech\'s compile draws its two devices as Logitech named them', NEEDS, () => {
  const idle = 'screen screen@(keys idle 183.0) | page 1';
  assert.equal(a().get(`${idle} | texts`), '/@18,18 / 1@13,18 / 3@23,18 / Activities@21,202 / Activity@24,207 / Current@26,196 / Denon AVR-@63,50 '
    + '/ Devices@6,4 / LG@63,104 / OLED65G26LA@63,116 / Plasma@63,164 / X4800H@63,62 / pages@35,18');
  assert.equal(b().get(`${idle} | texts`), '/@18,18 / 1@13,18 / 3@23,18 / Activities@21,202 / Activity@24,207 / Current@26,196 / Denon@63,164 '
    + '/ Devices@6,4 / LG TV@63,56 / Plasma@63,110 / pages@35,18');
  const asked = 'screen "NowistheLGTVoff?YesNoPowerOffPowerOff" | page 1 | texts';
  assert.equal(a().get(asked), 'No@125,201 / Now is the LG OLED65G26LA@6,137 / PowerOff@6,4 / Yes@34,201 / off?@76,149');
  assert.equal(b().get(asked), 'No@125,201 / Now is the LG TV off?@24,143 / PowerOff@6,4 / Yes@34,201');
  // TV kijken's own list holds its devices in one order both ways, so its texts differ by the labels alone.
  const watch = 'screen screen@(keys activity TV kijken 183.0)';
  assert.deepEqual(rows(a(), watch), rows(b(), watch));
});

test('8.1.5: the donor\'s device pages offer the codes ours offer, on as many pages, but for plain power pads where ours send the power step', NEEDS, () => {
  // What a device page's touches send, each code once, without the key of its blocks.
  const offered = (view: TouchView, device: string): Set<string> => new Set([...view]
    .filter(([key]) => key.startsWith(`screen device ${device} | page `) && / \| event \d code \d+$/.test(key) && !key.includes('| copy |'))
    .flatMap(([, value]) => [...value.matchAll(new RegExp(`send ${device} ([^;}]*?) r[0-9a-f]{8}`, 'g'))].map((one) => one[1] as string)));
  const pages = (view: TouchView, device: string): number => [...view.keys()].filter((key) => key.startsWith(`screen device ${device} | page `) && key.endsWith('| texts')).length;
  for (const [device, count, shared] of [['LG TV', 6, 28], ['Denon', 16, 88]] as const) {
    assert.equal(pages(a(), device), count);
    assert.equal(pages(b(), device), count);
    const x = offered(a(), device);
    const y = offered(b(), device);
    const both = [...x].filter((one) => y.has(one));
    assert.equal(both.length, shared, device);
    // What one offers and the other does not is the power pads alone: Logitech's send the plain code, ours the power
    // step, section 331's choice.
    assert.ok([...x].filter((one) => !y.has(one)).every((one) => /^Power(On|Off)/.test(one) && !one.includes('as a power step')), device);
    assert.ok([...y].filter((one) => !x.has(one)).every((one) => one.includes('as a power step')), device);
  }
  // A composed device's page is the same both ways.
  assert.equal(offered(a(), 'Plasma').size, 30);
  assert.deepEqual([...offered(a(), 'Plasma')].sort(), [...offered(b(), 'Plasma')].sort());
});

test('8.1.5: the donor LG\'s online power, the assistant\'s starting value and the two timers nothing starts', NEEDS, () => {
  // The donor's LG keeps Logitech's online power variable, set 30 s after the LG is switched on and cleared when it is
  // switched off; nothing reads it.
  assert.equal(a().get('variable LG_TV_OnlinePower_2'), 'starts 0, at most 1');
  assert.equal(a().get('timer timer@(variable LG_TV_Power_2 0.1)'), 'kind 1, 30 s: LG_TV_OnlinePower_2=1');
  assert.equal([...a().values()].filter((value) => /71\.[0-9a-f]+ LG_TV_OnlinePower_2/.test(value)).length, 0);
  assert.equal(b().has('variable LG_TV_OnlinePower_2'), false);
  // The start up assistant's variable starts at 0 on Logitech's compile with the assistant taken out, and at 3 on ours.
  const assistant = 'variable variable@(screen "USBConnected" key 7.1.1.0)';
  assert.equal(a().get(assistant), 'starts 0, at most 3');
  assert.equal(b().get(assistant), 'starts 3, at most 3');
  // A timer each holds that nothing starts: Logitech's compile a redraw timer of four seconds, ours the power off help's
  // three second show timer, section 435.
  const unstarted = (view: TouchView): string[] => [...view].filter(([key]) => key.startsWith('timer unreached')).map(([, value]) => value.slice(0, 15));
  assert.deepEqual(unstarted(a()), ['kind 1, 4 s: {r']);
  assert.deepEqual(unstarted(b()), ['kind 1, 3 s: {7']);
});

test('8.1.5: the donor\'s Denon and LG put on an input send the input meant, and the two compositions agree on every entry of those two devices\' input variables', NEEDS, () => {
  // Four input variables and their 43 transitions: Denon's 19, the LG's inputs 10, its screens 8 and its TV inputs 6.
  const inputs = [...a().keys()].filter((one) => /^variable (Denon|LG_TV)_(Input|Screen|TVInput)/.test(one));
  assert.equal(inputs.length, 47);
  for (const key of inputs) assert.equal(a().get(key), b().get(key), key);
  assert.match(a().get('variable Denon_Input_19 | -2 to 0') ?? '', /^\{send Denon InputCbl\/Sat /);
  assert.match(a().get('variable LG_TV_Screen_8 | -2 to 1') ?? '', /^\{send LG TV InputHdmi1 /);
});

test('control: a send planted in the composition onto our empty One, the KPN\'s Teletext sent as its DVR, is found where it is touched and explained by no cause', NEEDS, () => {
  const c = onEmpty().container;
  const names = namesOf(c);
  const kpn = devices(c).find((one) => one.name === 'KPN')!.group!;
  const record = (name: string): number => names.commandNames!.get(kpn)!.indexOf(name);
  const sites = instructionSites(c, SEND_INFRARED).filter((one) => one.holder === 'action list' && one.operand === ((kpn << 8) | record('Teletext')));
  assert.equal(sites.length, 1);
  const planted = c.blob.slice();
  planted[sites[0]!.at] = record('DVR');
  const found = compareTouchViews(b(), touchView(parse(planted), names).view);
  assert.deepEqual(found.map((one) => one.key), [
    'screen "DevicesTeletextDVRAspectRadioPlasmakijkenPlasmak" | page 1 | copy | event 2 code 49',
    'screen "DevicesTeletextDVRAspectRadioPlasmakijkenPlasmak" | page 1 | event 2 code 49',
    'screen "DevicesTeletextDVRTVkijkenTVkijken" | page 1 | copy | event 2 code 49',
    'screen "DevicesTeletextDVRTVkijkenTVkijken" | page 1 | event 2 code 49',
    'screen device KPN | page 1 | copy | event 2 code 49',
    'screen device KPN | page 1 | event 2 code 49',
  ]);
  // Against Logitech's compile the planted ones are differences no cause takes.
  assert.deepEqual(causes(compareTouchViews(a(), touchView(parse(planted), names).view)).get('unexplained')?.map((one) => one.key), found.map((one) => one.key));
});
