/**
 * **A Harmony Touch's document in the one shape of decision 43 says what its old block said**, but for nine fields of
 * four kinds, each named below with its count: `src/families/harmony-touch/recipemaps.ts`.
 *
 * **The question.** A Touch's document carried a block of its own that stated every key, entry, id and delay. Decision 43
 * replaces it with the fields every model shares and the family's defaults. That holds only if the new fields can say
 * everything the block said that matters to the remote. So: the bench setup's document of the earlier form,
 * `touch-test-earlier-form.json` beside this test, is converted by `describeTouchDocument` into the smallest document of version 2,
 * that document is turned back into the setup the composer builds by `touchSetupOfDocument`, through the shared
 * `resolveMaps`, and the result is compared field by field with the setup the old block gives, `setupOfEarlierSetupFile`.
 *
 * **What it measured.** Every field of the seven devices and five activities comes back the same but nine, of four
 * kinds, each a field the document of version 2 deliberately has no place for:
 *
 * * **the control port, 0 where the block has 7, on five devices**: it is not a person's choice, and the family writes
 *   the remote's own lamp, which a device of ours was heard sending from on the bench;
 * * **two list entries Logitech's set stacks on another entry's place**, the LG TV's `-` and the Xbox's `#`, both at 11:
 *   the remote shows only the later of two entries on one place, `activities-and-buttons.md` "Three traps in
 *   IndexInMenu", and the rule puts each at a place of its own, 5 and 16;
 * * **one pad label**, the Xbox's key left of 0 labelled `.` where the rule labels it `NumberPlus`, as every other pad's
 *   left key is labelled in the setup, Play a Game's pad of the same command among them; the pad draws a key by its
 *   command, and the engine never reads a label;
 * * **one key's group**, Play a Game's Exit, which the block puts in the pad's group and the family in the list's.
 *
 * The infrared families' ids, the settings and every id of a device, an activity and a sequence come back the same.
 * **The converted document states what the default maps' score lists and nothing more**: five device keys, the
 * differences `touch-default-maps.test.ts` gives the devices, and seven activity keys, its differences end to end; four
 * timing members on the Denon and one on the KPN, the LG TV's channel tuning, five activity lists, two opening screens,
 * one sequence and one activity's three start steps and one end step. Three things the document's shape had to be
 * decided on are measured here: **the power off order equals the power on order on 5 of 5 activities**, so the family
 * derives it, a hypothesis marked so; **one channel step and pauses of 1 and 2 seconds** are what the steps need, so the
 * document has a channel step and no finer pause; **no Settings document Logitech's service wrote is held in the
 * codec**, only the firmware's defaults and made up rows, so the settings are stated whole.
 *
 * **The order of the devices and of the activities is compared**: the setup's order is the order the composer writes
 * them in, and the activity list is shown in the order its activities are numbered, `activities-and-buttons.md` "A
 * writer keeps an entry list's indices without gaps". The order of a map's buttons is not, `canonical` says why.
 *
 * **What it does not settle.** Whether the six documents built from the new document equal the old ones: this compares
 * the setups the composer is given and not what it writes, and the six are compared field by field in
 * `packages/corpus/test/touch/touch-version-two-set.test.ts`. Whether the remote acts on a set built this way as it did on the old:
 * nothing here touches a remote. Whether the rule is Logitech's: the score says how far it is on this one setup.
 *
 * **The control.** A document with one stated field taken out and one changed gives exactly those two more
 * differences, so the comparison sees a field a document drops or changes; and a document with no choices at all gives
 * 70, on every one of the twelve maps, so a comparison blind to a kind of field would fail here.
 *
 * **Width**: the Harmony Touch alone, one setup of seven devices and five activities; a Harmony Touch's firmware reports
 * architecture 17 and Logitech's templates file it under 18. The reference carries every definition, so this needs no
 * lab and no archive.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import type { CatalogueSource } from '../../../src/catalogue/catalogue.ts';
import { carriedCatalogue } from '../../../src/catalogue/carried.ts';
import { resolveMaps, type MapDeviceView } from '../../../src/families/maps.ts';
import { mapsOfModel } from '../../../src/families/registry.ts';
import {
  catalogueOfEarlierSetupFile, readEarlierTouchSetupFile, settingsOfEarlierSetupFile, setupOfEarlierSetupFile, type EarlierTouchSetupFile,
} from '../../../src/families/harmony-touch/earlierform.ts';
import {
  describeTouchDocument, placeOfTouchKey, TOUCH_MAPS, touchKeyOfPlace, touchSetupOfDocument,
} from '../../../src/families/harmony-touch/recipemaps.ts';
import {
  defaultActivityGestures, defaultActivityKeys, defaultActivityNumberPad, defaultDeviceEntries, defaultDeviceKeys, PAD_GROUP,
  type DefaultActivityButton, type DeviceMapView,
} from '../../../src/families/harmony-touch/defaultmaps.ts';
import type { TouchSetup } from '../../../src/families/harmony-touch/setup.ts';
import { readRecipe, RecipeError, type Recipe, type RecipeDevice } from '../../../src/recipe/recipe.ts';
import { NotBuiltError } from '../../../src/support/contract.ts';
import { ComposeRefusal } from '../../../src/families/harmony-touch/compose.ts';
// The block's route draws our background picture, which needs the codec's deflate.
import '../../../src/support/resources.node.ts';

type Json = any;

/**
 * The bench setup's document of the earlier form, kept beside this test as the converter's input; the reference,
 * `test/references/touch-test.json`, is the converter's output.
 */
const REFERENCE = new URL('touch-test-earlier-form.json', import.meta.url);
/** The bench setup's old document, with a change made to its text first where one is given. */
const oldWith = (change: (json: Json) => void): EarlierTouchSetupFile => {
  const json = JSON.parse(readFileSync(REFERENCE, 'utf8'));
  change(json);
  return readEarlierTouchSetupFile(json);
};
const old = (): EarlierTouchSetupFile => oldWith(() => undefined);
/** The definitions the reference carries, as a catalogue: the file read without its block, which the catalogue does not read. */
const catalogueOfFile = (file: EarlierTouchSetupFile): CatalogueSource => {
  const { touch: _touch, ...recipe } = file;
  return carriedCatalogue(recipe)!;
};
const convertedOf = (file: EarlierTouchSetupFile): Recipe => describeTouchDocument(file, catalogueOfFile(file));
const converted = (): Recipe => convertedOf(old());
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** The converted document with a change made to its text, read again, and the setup it gives. */
function builtWith(change: (json: Json) => void): TouchSetup {
  const json = copy(converted()) as Json;
  change(json);
  const document = readRecipe(json);
  return touchSetupOfDocument(document, carriedCatalogue(document)!).setup;
}

/** What building the converted document with a change made to it throws, or undefined where it builds. */
function refusalOf(change: (json: Json) => void): unknown {
  try {
    builtWith(change);
    return undefined;
  } catch (e) {
    return e;
  }
}

/** That a refusal is of its kind and says what it should. */
function said(e: unknown, kind: unknown, pattern: RegExp): void {
  assert.ok(e instanceof (kind as typeof Error), String(e));
  assert.match((e as Error).message, pattern);
}

/** A map's buttons keyed by what each is, a key, a gesture or an entry by its group and action, so two maps compare button by button. */
function keyed(buttons: readonly Json[]): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const b of buttons) {
    const id = b.key !== undefined ? `key ${b.key}` : b.gesture !== undefined ? `gesture ${b.gesture}` : `entry ${b.group ?? 0} ${JSON.stringify(b.press)}`;
    let at = id;
    for (let n = 2; at in out; n++) at = `${id} #${n}`;
    out[at] = b;
  }
  return out;
}

/**
 * A setup with each map's buttons keyed, devices and activities by name, and the order of each list beside them.
 * **The order of a map's buttons is not compared**: the engine finds a key by its name and an entry by its place,
 * `activities-and-buttons.md`, and Logitech's maps put their buttons in an order of their own that differs map to map.
 * The one case where the order would matter, two entries on one place, is a difference of its own below. **The order of
 * the devices and of the activities is**, the header says why.
 */
function canonical(setup: TouchSetup): Json {
  return {
    order: { devices: setup.devices.map((d) => d.name), activities: setup.activities.map((a) => a.name) },
    devices: Object.fromEntries(setup.devices.map((d) => [d.name, { ...d, buttons: keyed(d.buttons) }])),
    activities: Object.fromEntries(setup.activities.map((a) => [a.name, { ...a, buttons: keyed(a.buttons ?? []) }])),
  };
}

/** One field where two setups differ: where, and the value in each. */
interface Difference {
  readonly where: string;
  readonly block: unknown;
  readonly document: unknown;
}

/** Every leaf field where two setups differ, in the order the block's setup walks them. */
function differences(block: TouchSetup, document: TouchSetup): Difference[] {
  const out: Difference[] = [];
  const walk = (a: Json, b: Json, where: string): void => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], where === '' ? k : `${where} / ${k}`);
      return;
    }
    out.push({ where, block: a, document: b });
  };
  walk(canonical(block), canonical(document), '');
  return out;
}

/** The setup the old block gives, and the setup the document gives back, with the protocol ids and the settings. */
function roundTrip(document: Recipe) {
  const file = old();
  const block = setupOfEarlierSetupFile(file, catalogueOfEarlierSetupFile(file, catalogueOfFile(file)));
  const parts = touchSetupOfDocument(document, carriedCatalogue(document)!);
  return { file, block, parts, differences: differences(block, parts.setup) };
}

// The four kinds, each a field a document of version 2 has no place for, the header says why.
const CONTROL_PORT = 'the control port, which the family writes as the remote\'s own lamp';
const STACKED = 'an entry Logitech\'s set stacks on another\'s place, which the rule puts at its own';
const PAD_LABEL = 'a pad entry\'s label, which the family gives';
const KEY_GROUP = 'a key\'s group, which the family writes as the list\'s';
const OTHER = 'none of the four';

/**
 * **The kind of one difference, read off the difference itself and the block's own map**, never off the expected list,
 * so the count per kind is a measurement: a device's control port; an entry's index where the block's map holds a
 * second entry of the same group on the block's index; a pad entry's label; a key's group.
 */
function kindOf(d: Difference, block: TouchSetup): string {
  const field = d.where.split(' / ');
  const last = field[field.length - 1];
  if (field.length === 3 && field[0] === 'devices' && last === 'controlPort') return CONTROL_PORT;
  if (field.length !== 5 || field[2] !== 'buttons') return OTHER;
  const button = field[3]!;
  if (button.startsWith('entry ') && last === 'index') {
    const group = Number(button.split(' ')[1]);
    const owner: Json = field[0] === 'devices' ? block.devices.find((one) => one.name === field[1]) : block.activities.find((one) => one.name === field[1]);
    const onThatPlace = ((owner?.buttons ?? []) as Json[]).filter((b) => b.entry !== undefined && (b.group ?? 0) === group && b.index === d.block);
    return onThatPlace.length > 1 ? STACKED : OTHER;
  }
  if (button.startsWith(`entry ${PAD_GROUP} `) && last === 'entry') return PAD_LABEL;
  if (button.startsWith('key ') && last === 'group') return KEY_GROUP;
  return OTHER;
}

const EXPECTED: readonly Difference[] = [
  { where: 'devices / LG TV / buttons / entry 0 "-" / index', block: 11, document: 5 },
  { where: 'devices / Blu-ray / controlPort', block: 7, document: 0 },
  { where: 'devices / Plex / controlPort', block: 7, document: 0 },
  { where: 'devices / KPN / controlPort', block: 7, document: 0 },
  { where: 'devices / Xbox / controlPort', block: 7, document: 0 },
  { where: 'devices / Xbox / buttons / entry 2 "*" / entry', block: '.', document: 'NumberPlus' },
  { where: 'devices / Xbox / buttons / entry 0 "#" / index', block: 11, document: 16 },
  { where: 'devices / Switch / controlPort', block: 7, document: 0 },
  { where: 'activities / Play a Game / buttons / key Exit / group', block: 2, document: undefined },
];
const isExpected = (one: Difference): boolean => EXPECTED.some((e) => JSON.stringify(e) === JSON.stringify(one));

test('the round trip: the document gives back the block\'s setup, its device and activity order among it, but for nine fields of four kinds, 5 control ports, 2 stacked entries, 1 pad label and 1 key\'s group', () => {
  const { file, block, parts, differences: found } = roundTrip(converted());
  assert.deepEqual(found, EXPECTED);
  // Each difference classified by its own field and the block's map, so a tenth difference of any kind, or one of
  // these nine changing its nature, shows here.
  const counts: Record<string, number> = {};
  for (const one of found) counts[kindOf(one, block)] = (counts[kindOf(one, block)] ?? 0) + 1;
  assert.deepEqual(counts, { [STACKED]: 2, [CONTROL_PORT]: 5, [PAD_LABEL]: 1, [KEY_GROUP]: 1 });
  // The two things a setup does not hold come back whole: the infrared families' ids, in the order the devices first
  // name each, and every setting as the text the remote reads.
  assert.deepEqual(parts.protocols, file.touch.protocols);
  assert.deepEqual(parts.protocols, {
    'Toshiba 32 Bit': 900000401, 'Sharp 48 Bit 2': 900000402, 'Sharp 15 Bit 2': 900000403, 'Sony 20 Bit': 900000404, 'Microsoft 30 Bit': 900000405,
  });
  assert.deepEqual(parts.settings, file.touch.settings);
});

test('the control: a document with one stated field taken out and one changed gives exactly those two differences more, and one with two devices swapped differs in their order', () => {
  const altered = copy(converted()) as Json;
  // The KPN's own delay between keys taken out, and Switch Box's pause at its start made one second.
  delete altered.devices.find((d: Json) => d.name === 'KPN').timing;
  altered.activities.find((a: Json) => a.name === 'Switch Box').start[1] = { pause: 10 };
  const { block, differences: found } = roundTrip(readRecipe(altered));
  const extra = found.filter((one) => !isExpected(one));
  assert.deepEqual(extra, [
    { where: 'devices / KPN / interKeyDelayMs', block: 400, document: 100 },
    { where: 'activities / Switch Box / enter / 1 / delaySeconds', block: 2, document: 1 },
  ]);
  assert.deepEqual(extra.map((one) => kindOf(one, block)), [OTHER, OTHER]);
  // The order of the devices: the Plex and the KPN swapped, nothing else of either changed.
  const swapped = copy(converted()) as Json;
  [swapped.devices[3], swapped.devices[4]] = [swapped.devices[4], swapped.devices[3]];
  assert.deepEqual(roundTrip(readRecipe(swapped)).differences.filter((one) => !isExpected(one)), [
    { where: 'order / devices / 3', block: 'Plex', document: 'KPN' },
    { where: 'order / devices / 4', block: 'KPN', document: 'Plex' },
  ]);
  // And a document stating no choice at all, the devices, activities and settings alone, differs in 70 fields, a
  // button or a step missing whole counting as one, on every map of the twelve: the comparison is blind to no kind of
  // field the converter states.
  const bare = copy(converted()) as Json;
  for (const d of bare.devices) for (const k of ['keys', 'timing', 'channelTuning', 'screen']) delete d[k];
  for (const a of bare.activities) for (const k of ['keys', 'screen', 'opensOn', 'start', 'end', 'sequences']) delete a[k];
  const none = roundTrip(readRecipe(bare)).differences;
  const perMap: Record<string, number> = {};
  for (const one of none) {
    const map = one.where.split(' / ').slice(0, 2).join(' / ');
    perMap[map] = (perMap[map] ?? 0) + 1;
  }
  assert.equal(none.length, 70);
  assert.deepEqual(perMap, {
    'devices / LG TV': 3, 'devices / Denon AV Receiver': 7, 'devices / Blu-ray': 1, 'devices / Plex': 1, 'devices / KPN': 2,
    'devices / Xbox': 4, 'devices / Switch': 1, 'activities / Watch TV': 6, 'activities / Watch a Blu-ray': 17,
    'activities / Listen to Music': 1, 'activities / Switch Box': 12, 'activities / Play a Game': 15,
  });
});

test('the converted document states the default maps\' differences and the person\'s fields, and nothing the family derives', () => {
  const document = converted();
  assert.equal(document.version, 2);
  assert.equal((document as { touch?: unknown }).touch, undefined);
  // It reads back as itself, so it is a document the reader takes and an application can save.
  assert.deepEqual(readRecipe(copy(document)), document);
  const stated = (owner: Json, given: readonly string[]): string[] => Object.keys(owner).filter((k) => !given.includes(k));
  assert.deepEqual(Object.fromEntries(document.devices.map((d) => [d.id, stated(d, ['id', 'name', 'device', 'definition', 'poweredOnBetweenActivities'])])), {
    d1: ['keys', 'channelTuning'], d2: ['keys', 'timing'], d3: [], d4: [], d5: ['timing'], d6: ['keys'], d7: [],
  });
  assert.deepEqual(Object.fromEntries(document.activities.map((a) => [a.id, stated(a, ['id', 'name', 'type', 'devices'])])), {
    a1: ['screen', 'keys', 'opensOn'], a2: ['screen', 'keys', 'opensOn', 'sequences'], a3: ['screen'], a4: ['screen', 'keys', 'start', 'end'], a5: ['screen', 'keys'],
  });
  // The device keys: the score's device differences, the Denon's Info and Red, the Xbox's Exit and the LG TV's Menu held.
  const keys = (owner: { keys?: readonly Json[] }): string[] => (owner.keys ?? []).map((k) => `${k.key} ${k.press ?? 'short'}: ${'nothing' in k.action ? 'nothing' : 'sequence' in k.action ? `the sequence ${k.action.sequence}` : `${k.action.device} ${k.action.command}`}`);
  assert.deepEqual(document.devices.flatMap(keys), [
    'Menu held: LG TV Home', 'Info short: Denon AV Receiver ModeJazzClub', 'Info held: Denon AV Receiver ModeMatrix',
    'Red short: Denon AV Receiver InputTuner', 'Exit short: nothing',
  ]);
  // The activity keys: the score's differences end to end, Watch TV's Menu held being the LG TV's own difference again.
  assert.deepEqual(document.activities.flatMap(keys), [
    'Menu held: LG TV Home', 'Guide short: Blu-ray TopMenu', 'Guide held: Blu-ray Subtitle', 'Yellow short: the sequence Test Sequence',
    'Yellow held: Blu-ray Yellow', 'FastForward held: nothing', 'Exit short: Xbox Clear',
  ]);
  assert.deepEqual(document.devices.map((d) => d.timing ?? null), [
    null, { interKeyDelay: 300, interDeviceDelay: 700, powerOnDelay: 3500, inputDelay: 1500 }, null, null, { interKeyDelay: 400 }, null, null,
  ]);
  // Logitech's press of no command is an empty list in a document, each member stated since each differs from the
  // catalogue's, which has a finish of OK and nothing else.
  assert.deepEqual(document.devices[0]!.channelTuning, { fixedDigits: 3, start: [], finish: [], greaterTen: [], greaterHundred: [] });
  const switchBox = document.activities.find((a) => a.name === 'Switch Box')!;
  assert.deepEqual([switchBox.start, switchBox.end], [
    [{ device: 'KPN', command: 'Info' }, { pause: 20 }, { device: 'KPN', channel: '7' }],
    [{ device: 'LG TV', command: 'Mute' }],
  ]);
  assert.deepEqual(document.settings, { TwelveHourClock: false, ScreenBrightness: 100, ScreenTimeout: 10, ScreenLockFlag: false, EditLock: false, KeyBrightness: 97, AccelFlag: true });
});

test('a block\'s channel tuning is converted member by member against the catalogue\'s: the same states nothing, one member changed states that one, and a member of none where the catalogue has one is refused', () => {
  const tuningOf = (tuning: Json): unknown => convertedOf(oldWith((j) => { j.touch.devices[0].channelTuning = tuning; })).devices[0]!.channelTuning;
  // The LG TV's catalogue tuning finishes with OK and states nothing else.
  assert.equal(tuningOf({ fixedDigits: null, finish: ['OK'] }), undefined);
  assert.deepEqual(tuningOf({ fixedDigits: 2, finish: ['OK'] }), { fixedDigits: 2 });
  assert.deepEqual(tuningOf({ fixedDigits: null, start: ['Mute'], finish: ['OK'] }), { start: [{ kind: 'send', command: 'Mute' }] });
  assert.throws(() => tuningOf({ fixedDigits: null }), (e: unknown) => {
    said(e, ComposeRefusal, /the device LG TV's channel tuning has no finish where the catalogue's has one/);
    return true;
  });
});

test('the block\'s power off order equals its power on order on 5 of the 5 activities, which is why the family derives it', () => {
  const file = old();
  const same = file.touch.activities.filter((a) => {
    const byOn = Object.keys(a.powerOrder).sort((x, y) => a.powerOrder[x]![0] - a.powerOrder[y]![0]);
    const byOff = Object.keys(a.powerOrder).sort((x, y) => a.powerOrder[x]![1] - a.powerOrder[y]![1]);
    return JSON.stringify(byOn) === JSON.stringify(byOff);
  });
  assert.equal(same.length, 5);
  assert.equal(file.touch.activities.length, 5);
  // The numbers differ on the one activity with an end step, Switch Box, whose power off places start after it: the
  // numbering the family gives, which the round trip reproduces.
  assert.deepEqual(file.touch.activities.find((a) => a.activity === 'Switch Box')!.powerOrder, { KPN: [2, 3], 'LG TV': [1, 2], Switch: [3, 4] });
});

test('a power order and the favourites a document states are what is built, over the family\'s own', () => {
  const order = (setup: TouchSetup, name: string) => setup.activities.find((a) => a.name === name)!.devices.map((u) => [u.device, u.powerOn, u.powerOff]);
  // The family's order on Watch a Blu-ray: the display, then the volume, then the rest.
  assert.deepEqual(order(builtWith(() => undefined), 'Watch a Blu-ray'), [['LG TV', 1, 1], ['Blu-ray', 3, 3], ['Denon AV Receiver', 2, 2]]);
  assert.deepEqual(order(builtWith((j) => { j.activities[1].powerOrder = ['Blu-ray', 'Denon AV Receiver', 'LG TV']; }), 'Watch a Blu-ray'), [
    ['LG TV', 3, 3], ['Blu-ray', 1, 1], ['Denon AV Receiver', 2, 2],
  ]);
  // The favourites: the first activity with a device changing channels, Watch TV, unless a document says otherwise.
  const holders = (setup: TouchSetup) => setup.activities.filter((a) => a.tuningDefault === true).map((a) => a.name);
  assert.deepEqual(holders(builtWith(() => undefined)), ['Watch TV']);
  assert.deepEqual(holders(builtWith((j) => { j.activities[3].favourites = true; })), ['Switch Box']);
  assert.deepEqual(holders(builtWith((j) => { j.activities[0].favourites = false; })), ['Switch Box']);
  assert.deepEqual(holders(builtWith((j) => { j.activities[0].favourites = false; j.activities[3].favourites = false; })), []);
});

/** The pad's places by their slot, written out here rather than taken from the module, so the test reads the numbering itself. */
const PAD_PLACES: Readonly<Record<number, string>> = {
  0: 'Number1', 1: 'Number2', 2: 'Number3', 3: 'Number4', 4: 'Number5', 5: 'Number6', 6: 'Number7', 7: 'Number8', 8: 'Number9',
  9: 'NumberPlus', 10: 'Number0', 11: 'Enter',
};
const slotOf = (place: string): number | undefined => {
  const found = Object.entries(PAD_PLACES).find(([, one]) => one === place);
  return found === undefined ? undefined : Number(found[0]);
};

test('the places: 46, 26 keys by the drawing\'s words, 3 the remote binds, 12 pad places and 5 gestures, each with its presses, whose map binds it and whether it is built', () => {
  const places = TOUCH_MAPS.places(99);
  const KEYPAD = [
    'Blue', 'ChannelDown', 'ChannelUp', 'Dvr', 'DirectionDown', 'DirectionLeft', 'DirectionRight', 'DirectionUp', 'Exit', 'FastForward',
    'Green', 'Guide', 'Info', 'Menu', 'Pause', 'Play', 'PrevChannel', 'Record', 'Red', 'Rewind', 'Select', 'Stop', 'VolumeDown',
    'VolumeMute', 'VolumeUp', 'Yellow',
  ];
  assert.deepEqual(places.map((p) => [p.key, p.surface, p.presses, p.boundBy, p.built]), [
    ...KEYPAD.map((key) => [key, 'keypad', ['short', 'held'], 'both', true]),
    ...['Off', 'Home', 'Favorites'].map((key) => [key, 'keypad', ['short'], 'remote', false]),
    ...Object.values(PAD_PLACES).map((key) => [key, 'pad', ['short'], 'both', true]),
    ...['SwipeUp', 'SwipeDown', 'SwipeLeft', 'SwipeRight', 'Tap'].map((key) => [key, 'gesture', ['short', 'held', 'double'], 'activity', true]),
  ]);
  // Every place not built says why.
  assert.ok(places.filter((p) => !p.built).every((p) => typeof p.why === 'string' && p.why.length > 0));
  // The drawing's Dvr is the documents' DVR, both ways, in one place; no place is spelt as the documents spell it.
  assert.equal(placeOfTouchKey('DVR'), 'Dvr');
  assert.equal(touchKeyOfPlace('Dvr'), 'DVR');
  assert.equal(places.some((p) => p.key === 'DVR'), false);
  assert.equal(touchKeyOfPlace('Number1'), undefined);
  // The registry hands an application these maps for the model.
  assert.equal(mapsOfModel({ name: 'Harmony Touch' })?.maps, TOUCH_MAPS);
});

/** A device of the converted document's carried commands by name, which is what the rule reads. */
const carriedNames = (device: RecipeDevice, catalogue: CatalogueSource): string[] =>
  TOUCH_MAPS.commands(device, catalogue).filter((one) => one.carried).map((one) => one.name);

test('every device\'s default map is the rule\'s, its keys, its held presses, its pad and its list, on all seven devices', () => {
  const document = converted();
  const catalogue = carriedCatalogue(document)!;
  const totals = { keys: 0, held: 0, pad: 0, screen: 0 };
  for (const device of document.devices) {
    const names = carriedNames(device, catalogue);
    const map = TOUCH_MAPS.deviceMap(TOUCH_MAPS.commands(device, catalogue));
    // The map read back into the rule's own form, by the places' words written out above.
    const keys: Record<string, { press?: string; longPress?: string }> = {};
    const pad: [number, string, string | undefined][] = [];
    for (const b of map.keys) {
      const slot = slotOf(b.key);
      if (slot !== undefined) {
        assert.equal(b.press, 'short');
        pad.push([slot, b.command, b.label]);
        continue;
      }
      const key = b.key === 'Dvr' ? 'DVR' : b.key;
      keys[key] = { ...keys[key], [b.press === 'held' ? 'longPress' : 'press']: b.command };
    }
    const entries = defaultDeviceEntries(names);
    assert.deepEqual(keys, defaultDeviceKeys(names), device.name);
    assert.deepEqual(pad.sort((a, b) => a[0] - b[0]), entries.filter((e) => e.group === PAD_GROUP).map((e) => [e.index, e.press, e.entry]), device.name);
    assert.deepEqual(
      map.screen.map((e) => ('client' in e ? [e.label, { client: e.client }] : [e.label ?? e.command, e.command])),
      entries.filter((e) => e.group !== PAD_GROUP).map((e) => [e.entry, e.press]),
      device.name,
    );
    totals.keys += map.keys.filter((b) => slotOf(b.key) === undefined && b.press === 'short').length;
    totals.held += map.keys.filter((b) => b.press === 'held').length;
    totals.pad += pad.length;
    totals.screen += map.screen.length;
  }
  // Over the seven devices, so the comparison above is not of empty maps.
  assert.deepEqual(totals, { keys: 139, held: 15, pad: 57, screen: 197 });
});

test('every activity\'s default map is the rule\'s three functions over its devices\' default maps, keys, gestures and pad, on all five activities', () => {
  const document = converted();
  const catalogue = carriedCatalogue(document)!;
  const deviceNamed = (name: string): RecipeDevice => document.devices.find((d) => d.name === name)!;
  // The rule's own view of a device's map, from the rule alone, against which the family's translation is checked.
  const ruleView = (name: string): DeviceMapView => {
    const names = carriedNames(deviceNamed(name), catalogue);
    return { commands: names, keys: defaultDeviceKeys(names), pad: defaultDeviceEntries(names).filter((e) => e.group === PAD_GROUP) };
  };
  const deviceOf = (name: string): MapDeviceView => {
    const commands = TOUCH_MAPS.commands(deviceNamed(name), catalogue);
    return { commands, map: TOUCH_MAPS.deviceMap(commands) };
  };
  const totals: Record<string, number> = {};
  for (const activity of document.activities) {
    const rule = { type: activity.type, devices: activity.devices };
    const expected: (string | undefined)[][] = [];
    const add = (place: string, button: DefaultActivityButton): void => {
      expected.push([place, 'short', button.press.device, button.press.command]);
      if (button.longPress !== undefined) expected.push([place, 'held', button.longPress.device, button.longPress.command]);
      if (button.doublePress !== undefined) expected.push([place, 'double', button.doublePress.device, button.doublePress.command]);
    };
    for (const [key, button] of Object.entries(defaultActivityKeys(rule, ruleView))) add(key === 'DVR' ? 'Dvr' : key, button!);
    for (const [gesture, button] of Object.entries(defaultActivityGestures(rule, ruleView))) add(gesture, button!);
    for (const entry of defaultActivityNumberPad(rule, ruleView)) expected.push([PAD_PLACES[entry.index]!, 'short', entry.press.device, entry.press.command, entry.entry]);
    const map = TOUCH_MAPS.activityMap(rule, deviceOf);
    const actual = map.keys.map((b) => [b.key, b.press, b.device, b.command, ...(slotOf(b.key) === undefined ? [] : [b.label])]);
    const sorted = (list: readonly unknown[][]) => list.map((one) => JSON.stringify(one)).sort();
    assert.deepEqual(sorted(actual), sorted(expected), activity.name);
    assert.deepEqual(map.screen, [], activity.name);
    totals[activity.name] = actual.length;
  }
  assert.deepEqual(totals, { 'Watch TV': 44, 'Watch a Blu-ray': 37, 'Listen to Music': 48, 'Switch Box': 39, 'Play a Game': 49 });
});

test('an activity derives from its devices\' default maps and never from a key a person chose', () => {
  const document = converted();
  const catalogue = carriedCatalogue(document)!;
  // A person's choice on the LG TV's Channel up key changes the LG TV's own map and not Watch TV's.
  const chosen = copy(document) as Json;
  chosen.devices[0].keys = [...chosen.devices[0].keys, { key: 'ChannelUp', action: { device: 'LG TV', command: 'InputHdmi1' } }];
  const before = resolveMaps(TOUCH_MAPS, 99, document, catalogue);
  const after = resolveMaps(TOUCH_MAPS, 99, readRecipe(chosen), catalogue);
  const at = (keys: readonly Json[]) => keys.find((one) => one.key === 'ChannelUp' && one.press === 'short');
  assert.deepEqual([at(after.devices[0]!.keys).action, at(after.devices[0]!.keys).isDefault], [{ device: 'LG TV', command: 'InputHdmi1' }, false]);
  assert.deepEqual([at(after.activities[0]!.keys).action, at(after.activities[0]!.keys).isDefault], [{ device: 'LG TV', command: 'ChannelUp' }, true]);
  // The control: the whole of Watch TV is as it was.
  assert.deepEqual(after.activities[0], before.activities[0]);
});

test('a device\'s list stated whole keeps the pad\'s opener where the rule puts it, after a leading Home or first, and a device with no pad gets none', () => {
  const setup = builtWith((document) => {
    // The LG TV leads with Home, the KPN does not, and the Blu-ray has no digit and so no pad.
    document.devices[0].screen = [{ device: 'LG TV', command: 'Home' }, { device: 'LG TV', command: 'Netflix', label: 'Films' }];
    document.devices[4].screen = [{ device: 'KPN', command: 'Teletext' }, { device: 'LG TV', command: 'Sleep' }];
    document.devices[2].screen = [{ device: 'Blu-ray', command: 'TopMenu' }];
  });
  const list = (name: string) => setup.devices.find((d) => d.name === name)!.buttons.filter((b) => b.entry !== undefined && b.group !== PAD_GROUP)
    .map((b) => [b.entry, b.index, b.group ?? 0, typeof b.press === 'string' ? b.press : JSON.stringify(b.press)]);
  assert.deepEqual(list('LG TV'), [['Home', 0, 0, 'Home'], ['123', 1, 36, '{"client":"Numpad"}'], ['Films', 2, 0, 'Netflix']]);
  // A command of another device in a device's own list, as device mode sends to any device.
  assert.deepEqual(list('KPN'), [['123', 0, 36, '{"client":"Numpad"}'], ['Teletext', 1, 0, 'Teletext'], ['Sleep', 2, 0, '{"device":"LG TV","command":"Sleep"}']]);
  assert.deepEqual(list('Blu-ray'), [['TopMenu', 0, 0, 'TopMenu']]);
});

test('a choice on a pad place is taken only where the pad draws the chosen command\'s name at that place, or where it chooses nothing', () => {
  const padOf = (setup: TouchSetup, owner: 'devices' | 'activities', name: string) =>
    ((setup[owner] as readonly Json[]).find((one) => one.name === name)!.buttons as Json[]).filter((b) => b.group === PAD_GROUP)
      .map((b) => [b.index, b.entry, typeof b.press === 'string' ? b.press : JSON.stringify(b.press)]);
  const withDeviceKey = (key: Json) => (j: Json): void => { j.devices[0].keys = [...j.devices[0].keys, key]; };
  // Taken: the LG TV's dash left of 0, where the pad draws a dash, over the rule's dot; nothing on 5, which leaves 5 out.
  const dash = padOf(builtWith(withDeviceKey({ key: 'NumberPlus', action: { device: 'LG TV', command: '-' } })), 'devices', 'LG TV');
  assert.deepEqual(dash.find((one) => one[0] === 9), [9, 'NumberPlus', '-']);
  const noFive = padOf(builtWith(withDeviceKey({ key: 'Number5', action: { nothing: true } })), 'devices', 'LG TV');
  assert.equal(noFive.some((one) => one[0] === 4), false);
  assert.equal(noFive.length, padOf(builtWith(() => undefined), 'devices', 'LG TV').length - 1);
  // Taken on an activity: Switch Box's 5 sending the LG TV's 5, where its default sends the KPN's.
  const switchBox = padOf(builtWith((j) => { j.activities[3].keys = [...j.activities[3].keys, { key: 'Number5', action: { device: 'LG TV', command: '5' } }]; }), 'activities', 'Switch Box');
  assert.deepEqual(switchBox.find((one) => one[0] === 4), [4, '5', '{"device":"LG TV","command":"5"}']);
  // Refused: another command's name on a digit, a digit on another digit, a name the pad draws on the other key beside
  // 0, a name it draws nowhere beside 0, a sequence, and a command the device does not have.
  said(refusalOf(withDeviceKey({ key: 'Number5', action: { device: 'LG TV', command: 'Mute' } })), ComposeRefusal,
    /the device LG TV puts LG TV's Mute on the pad's Number5, and the pad draws on that key only a command named 5; a command of any other name is on no key of the pad/);
  said(refusalOf(withDeviceKey({ key: 'Number5', action: { device: 'LG TV', command: '6' } })), ComposeRefusal, /LG TV's 6 on the pad's Number5, and the pad draws on that key only a command named 5;/);
  said(refusalOf(withDeviceKey({ key: 'Enter', action: { device: 'LG TV', command: '-' } })), ComposeRefusal, /LG TV's - on the pad's Enter, and the pad draws on that key only a command named Enter, NumberEnter, #, ENT;/);
  said(refusalOf(withDeviceKey({ key: 'NumberPlus', action: { device: 'LG TV', command: 'Mute' } })), ComposeRefusal, /the pad draws on that key only a command named -, \., \*, NumberPlus;/);
  said(refusalOf((j) => { j.activities[1].keys = [{ key: 'Number5', action: { sequence: 'Test Sequence' } }]; }), ComposeRefusal,
    /the activity Watch a Blu-ray runs the sequence Test Sequence on the pad's Number5, and the pad places an entry by its command's name/);
  said(refusalOf(withDeviceKey({ key: 'Number5', action: { device: 'LG TV', command: 'NoSuchCommand' } })), ComposeRefusal, /LG TV has no command of that name/);
});

test('a channel tuning stated in part keeps the catalogue\'s other members, and a step naming no command of the device is refused', () => {
  const tuningOf = (setup: TouchSetup, name: string) => setup.devices.find((d) => d.name === name)!.channelTuning;
  // The LG TV's catalogue tuning finishes with OK; a document stating only its digits keeps that finish, and one stating
  // a start, spelt in another case, keeps both, the start in the device's own spelling.
  assert.deepEqual(tuningOf(builtWith((j) => { j.devices[0].channelTuning = { fixedDigits: 2 }; }), 'LG TV'), { fixedDigits: 2, finish: ['OK'] });
  assert.deepEqual(tuningOf(builtWith((j) => { j.devices[0].channelTuning = { start: [{ kind: 'send', command: 'mute' }] }; }), 'LG TV'), {
    fixedDigits: null, start: ['Mute'], finish: ['OK'],
  });
  // The Plex's catalogue fixes three digits and states no list; a finish stated keeps the three digits.
  assert.deepEqual(tuningOf(builtWith((j) => { j.devices[3].channelTuning = { finish: [] }; }), 'Plex'), { fixedDigits: 3, finish: [''] });
  // The Denon's catalogue states no tuning, so its finish alone is what is built.
  assert.deepEqual(tuningOf(builtWith((j) => { j.devices[1].channelTuning = { finish: [{ kind: 'send', command: 'Enter' }] }; }), 'Denon AV Receiver'), {
    fixedDigits: null, finish: ['Enter'],
  });
  said(refusalOf((j) => { j.devices[1].channelTuning = { finish: [{ kind: 'send', command: 'NoSuchCommand' }] }; }), ComposeRefusal,
    /the device Denon AV Receiver's channel tuning's finish presses NoSuchCommand, which the device has no command of/);
});

test('settings are checked on this route as on the block\'s, one check: a number out of its range, a yes or no setting given another value, and the reverse of each, are refused', () => {
  said(refusalOf((j) => { j.settings.ScreenBrightness = 5000; }), ComposeRefusal, /ScreenBrightness: 5000 is outside 10 to 100/);
  said(refusalOf((j) => { j.settings.ScreenBrightness = true; }), ComposeRefusal, /ScreenBrightness: the value is not a whole number written in decimal digits/);
  said(refusalOf((j) => { j.settings.AccelFlag = 'maybe'; }), ComposeRefusal, /AccelFlag: a yes or no setting takes "true" or "false"/);
  said(refusalOf((j) => { j.settings.AccelFlag = 1; }), ComposeRefusal, /AccelFlag: a yes or no setting takes "true" or "false"/);
  // The block's route says the same of the same values, the two going through one check.
  const blockRefusal = (name: string, value: string): unknown => {
    const file = old();
    try {
      settingsOfEarlierSetupFile({ ...file, touch: { ...file.touch, settings: { ...file.touch.settings, [name]: value } } });
      return undefined;
    } catch (e) {
      return e;
    }
  };
  said(blockRefusal('ScreenBrightness', '5000'), ComposeRefusal, /ScreenBrightness: 5000 is outside 10 to 100/);
  said(blockRefusal('AccelFlag', 'maybe'), ComposeRefusal, /AccelFlag: a yes or no setting takes "true" or "false"/);
  // The control: values within their rows build.
  assert.equal(refusalOf((j) => { j.settings.ScreenBrightness = 10; j.settings.AccelFlag = false; }), undefined);
});

test('refused: a device with no id of the toolkit\'s form or one with a leading zero, a document with a block, a key no place takes, a step running a sequence, a timing the Touch does not carry and a setting not stated', () => {
  said(refusalOf((j) => { delete j.devices[2].id; }), ComposeRefusal, /the device Blu-ray has no id of the toolkit's form, d1 to d99/);
  said(refusalOf((j) => { j.devices[2].id = 'player'; }), ComposeRefusal, /the device Blu-ray has the id player, which is not of the toolkit's form/);
  // d01 would be the same number as d1, so it is refused where the id becomes one, naming it.
  said(refusalOf((j) => { j.devices[2].id = 'd01'; }), ComposeRefusal, /the device Blu-ray has the id d01, which is not of the toolkit's form, d1 to d99 with no leading zero/);
  said(refusalOf((j) => { j.devices[2].id = 'd0'; }), ComposeRefusal, /has the id d0, which is not of the toolkit's form/);
  said(refusalOf((j) => { j.activities[2].id = 'a03'; }), ComposeRefusal, /the activity Listen to Music has the id a03, which is not of the toolkit's form/);
  said(refusalOf((j) => { j.touch = {}; }), RecipeError, /a Harmony Touch's own block, touch, the earlier form/);
  said(refusalOf((j) => { j.activities[0].keys = [{ key: 'Off', action: { nothing: true } }]; }), ComposeRefusal, /chooses Off, which the remote binds itself/);
  said(refusalOf((j) => { j.devices[0].keys = [{ key: 'SwipeUp', action: { nothing: true } }]; }), ComposeRefusal, /chooses SwipeUp, which a device's map does not bind/);
  said(refusalOf((j) => { j.activities[0].keys = [{ key: 'Number1', press: 'held', action: { nothing: true } }]; }), ComposeRefusal, /Number1 held, a press that place does not have/);
  said(refusalOf((j) => { j.activities[0].keys = [{ key: 'DVR', action: { nothing: true } }]; }), ComposeRefusal, /the key DVR, which is no place of a Harmony Touch/);
  said(refusalOf((j) => { j.activities[1].start = [{ sequence: 'Test Sequence' }]; }), NotBuiltError, /step 1 at its start, running the sequence Test Sequence/);
  said(refusalOf((j) => { j.devices[0].timing = { holdInterDeviceDelay: 100 }; }), NotBuiltError, /holdInterDeviceDelay.*R16/);
  said(refusalOf((j) => { delete j.settings.KeyBrightness; }), ComposeRefusal, /the setting KeyBrightness is not stated/);
  // The control: the document as converted resolves.
  assert.equal(refusalOf(() => undefined), undefined);
});

test('the module of the maps loads first in a program of its own, before the family object that names it', () => {
  // The family object, the registry and this module form a cycle; loaded first, this module must still finish loading.
  const module = new URL('../../../src/families/harmony-touch/recipemaps.ts', import.meta.url).href;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify(module)}); console.log(m.TOUCH_MAPS.places(99).length);`], { encoding: 'utf8' });
  assert.equal(out.trim(), '46');
});
