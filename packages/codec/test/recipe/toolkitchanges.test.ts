/**
 * **The document toolkit's changes are the same calls for every model**, decision 43 and R76: a device, an activity
 * and a sequence renamed, removed and added, a key's every press, a screen whole, a device's timing, power and channel
 * tuning member by member, one command's code and tuning, an activity's opening screen, favourites, power order and
 * extra steps, the remote's settings, and a definition fetched again, each on a document that states the fields of
 * version 2, and each answered the same way on a Harmony One and a Harmony Touch.
 *
 * **What is claimed, on the two reference documents, with nothing attached and no archive**:
 *
 * * **A rename follows every field that names the thing**, counted over the document's own words: after renaming a
 *   device not one mention of its old name is left and its new name stands where the old one stood, the same number of
 *   times; renamed back the document is the one before. A sequence's new name follows to the keys and the screen
 *   entries that run it. The control for each count is the count before.
 * * **A removal settles exactly what `uses` lists**: the effects' places are the places `uses` answers, in order, and
 *   afterwards the document names the removed thing nowhere and still reads as a recipe. A sequence that sends only to
 *   a removed device goes with it, and so does everything that ran it.
 * * **Ids are never given twice**: the device removed last leaves its number behind, and the next device added takes
 *   the one after it; the control is the same addition on that document with its record of ids taken out, which gives
 *   the removed number again.
 * * **`setKey` takes every press the model's places give the owner**: a held press and a gesture's double press on a
 *   Harmony Touch, a sequence of the activity's own on an activity's key on both; and answers **not on this model** for
 *   a press the key lacks, a gesture in a device's own map, and a command a Touch's number pad would draw on no key, the
 *   family's own refusal, which `check` lists in a document that holds one. Each refusal has its accepted control.
 * * **The rest of the changes write what they are given**, member by member, and give it back with `'default'`: the
 *   questions answer the person's value after the change and the family's after the default, and a document given back
 *   whole is the one before.
 * * **`refreshDevice` replaces the definition alone**, every other field and every choice staying, and reports each
 *   choice that names a command the new definition lacks, which `check` then lists; the control is the same definition
 *   fetched again, which reports nothing and changes nothing.
 * * **`check` holds a step or an entry to its device's commands**, from a carried definition, or from the archive given
 *   for a device carrying none; the control is the same document naming a command the device has.
 * * **Plain data**: no returned document shares an object with the one given or with what a caller passed in.
 *
 * **What is not claimed**: that a model's build reads what a change writes. That is what `check` lists, and what each
 * family's build tests hold. No proof of R76 is recorded: it is a requirement of the FHSDK as a whole, and `setKey` and
 * the questions answer not built on the models whose families have no maps yet, and favourite channels are not built on
 * any. R12 and R25, a device and an activity renamed, are proven for every model: a rename is a change of the document
 * alone, the same call whatever the model, and no family takes part in it.
 *
 * Scope: the Harmony One, skin 54, and the Harmony Touch, the two models whose families state their maps; the Harmony
 * 300 for a screen a model does not have. No remote.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { proves } from '@harmony/testkit/proof';

import { NotBuiltError, readRecipe, recipe, RecipeError } from '../../src/index.ts';
import type { CatalogueSource } from '../../src/catalogue/catalogue.ts';
import { carriedCatalogue } from '../../src/catalogue/carried.ts';
import type { CarriedDevice } from '../../src/catalogue/search.ts';
import { readEarlierTouchSetupFile } from '../../src/families/harmony-touch/earlierform.ts';
import { describeTouchDocument, TOUCH_MAPS, touchSetupOfDocument } from '../../src/families/harmony-touch/recipemaps.ts';
import type { Recipe } from '../../src/recipe/recipe.ts';
import type { Change, Place } from '../../src/recipe/toolkit.ts';

type Json = any;
const REFERENCES = new URL('../references/', import.meta.url);
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** The Harmony One's test setup, opened, so every device and activity has its id. */
const oneTest = (): Recipe => recipe.open(JSON.parse(readFileSync(new URL('one-test.json', REFERENCES), 'utf8')));

/**
 * The bench Touch's test setup in the one shape, opened. **One helper whichever form the reference is in**: a document
 * still carrying the Touch's own block of the earlier form is converted by `describeTouchDocument`, the definitions it
 * carries serving as its catalogue; a document of version 2 is opened as it is.
 */
const touchTest = (): Recipe => {
  const json = JSON.parse(readFileSync(new URL('touch-test.json', REFERENCES), 'utf8'));
  if (json.touch === undefined) return recipe.open(json);
  const file = readEarlierTouchSetupFile(json);
  const { touch: _touch, ...plain } = file;
  return recipe.open(describeTouchDocument(file, carriedCatalogue(plain as Recipe)!));
};

/** The two references by model, for a test that asks both the same. */
const BOTH: readonly (readonly [string, () => Recipe])[] = [['Harmony One', oneTest], ['Harmony Touch', touchTest]];

/** The two references each with a sequence: the One's with the fields of version 2 put in, `oneStated`, and the Touch's. */
const SEQUENCED: readonly (readonly [string, () => Recipe])[] = [['Harmony One', () => oneStated()], ['Harmony Touch', touchTest]];

/** What a change refused with, as its reason and the place it names, or undefined where it did not refuse. */
function refused(call: () => unknown): [string, unknown] | undefined {
  try {
    call();
    return undefined;
  } catch (error) {
    if (!(error instanceof recipe.ChangeRefused)) throw error;
    return [error.reason, error.place];
  }
}

/** Whether a call refused as a function not built, under this contract and requirement. */
const notBuilt = (contract: string, requirement: number) => (error: unknown): boolean =>
  error instanceof NotBuiltError && error.contract === contract && error.requirement === requirement;

/**
 * How often a name stands as a value in a document's own words: its JSON without the carried definitions and the
 * protocols, which are the catalogue's text and may hold a manufacturer's name a rename does not touch, and without the
 * inputs an activity chooses, which are the catalogue's names too: the Denon's input for the player is named Blu-ray.
 */
const mentions = (document: Recipe, name: string): number => {
  const own = {
    ...document,
    devices: document.devices.map(({ definition: _definition, ...rest }) => rest),
    activities: document.activities.map((one) => ({ ...one, devices: one.devices.map(({ input: _input, ...rest }) => rest) })),
    protocols: undefined,
  };
  return JSON.stringify(own).split(JSON.stringify(name)).length - 1;
};

/** Hold a change to what every change keeps: the document given is untouched, and the new one reads as a recipe. */
function kept(before: Recipe, change: () => Change): Change {
  const given = JSON.stringify(before);
  const result = change();
  assert.equal(JSON.stringify(before), given, 'the document given was changed');
  assert.deepEqual(readRecipe(copy(result.document)), result.document);
  return result;
}

/** A device's definition as a search would fetch it, from a device the document carries. */
const fetched = (document: Recipe, name: string): CarriedDevice => {
  const device = document.devices.find((one) => one.name === name)!;
  return { source: 'test', entry: device.device, definition: copy(device.definition!), protocols: copy(document.protocols ?? []) };
};

/**
 * The Harmony One's reference with the fields of version 2 put in through the toolkit itself, each naming the KPN:
 * a power order, extra steps at the start and the end, a sequence, a key running it, a key and a screen entry in the
 * LG TV's own map, a timing and a channel tuning, so a change on the One meets every field a Touch document states.
 */
function oneStated(): Recipe {
  let document = oneTest();
  document = recipe.setActivity(document, 'a1', {
    powerOrder: ['d3', 'd1', 'd4'],
    start: [{ device: 'd4', command: 'Info' }, { pause: 5 }, { device: 'd4', channel: '07' }],
    end: [{ device: 'd1', command: 'PowerToggle' }],
  }).document;
  document = recipe.addSequence(document, 'a1', { name: 'Zappen', steps: [{ device: 'd4', command: 'ChannelUp' }, { pause: 3 }, { device: 'd4', command: 'Info' }] }).document;
  document = recipe.setKey(document, { owner: { activity: 'a1' }, key: 'Info' }, { sequence: 's1' }).document;
  document = recipe.setScreen(document, { activity: 'a1' }, [{ sequence: 's1' }, { device: 'd4', command: 'Guide', label: 'Gids' }]).document;
  document = recipe.setKey(document, { owner: { device: 'd1' }, key: 'Guide' }, { device: 'd4', command: 'Guide' }).document;
  document = recipe.setScreen(document, { device: 'd1' }, [{ device: 'd4', command: 'Teletext' }]).document;
  document = recipe.setDevice(document, 'd4', { timing: { interKeyDelay: 400 }, channelTuning: { fixedDigits: 3 } }).document;
  return document;
}

// ---------------------------------------------------------------------------------------------------
// Renames, removals and ids, through every field of version 2
// ---------------------------------------------------------------------------------------------------

test('on both references a device renamed follows it into every field that names it, and renamed back is the document before', () => {
  // R12 is a requirement of the FHSDK as a whole: a rename is a change of the document, which no family takes part in.
  proves(12, 'every');
  for (const [model, document, id, name] of [['Harmony One', oneStated(), 'd4', 'KPN'], ['Harmony Touch', touchTest(), 'd5', 'KPN'], ['Harmony Touch', touchTest(), 'd3', 'Blu-ray']] as const) {
    const before = mentions(document, name);
    // The control for the count: the old name stands where it was counted, the new one nowhere.
    assert.equal(before, ({ 'Harmony One KPN': 15, 'Harmony Touch KPN': 7, 'Harmony Touch Blu-ray': 14 } as Record<string, number>)[`${model} ${name}`], `${model}: ${name} is named ${before} times`);
    assert.equal(mentions(document, 'Kabel'), 0);
    const change = kept(document, () => recipe.setDevice(document, id, { name: 'Kabel' }));
    assert.deepEqual(change.effects, []);
    assert.equal(mentions(change.document, name), 0, `${model}: ${name} is still named`);
    assert.equal(mentions(change.document, 'Kabel'), before, model);
    assert.deepEqual(recipe.setDevice(change.document, id, { name }).document, document, model);
  }
});

test('on both references an activity renamed changes its name alone, a name another activity holds is refused, and renamed back is the document before', () => {
  // R25 is a requirement of the FHSDK as a whole, for the same reason as R12.
  proves(25, 'every');
  for (const [model, open] of BOTH) {
    const document = open();
    const [first, second] = document.activities;
    const change = kept(document, () => recipe.setActivity(document, first!.id!, { name: 'Kijken' }));
    assert.deepEqual(change.effects, []);
    // Everything but the one name is the document before: an activity is named nowhere else, every field takes its id.
    assert.equal(change.document.activities[0]!.name, 'Kijken', model);
    assert.deepEqual({ ...change.document, activities: change.document.activities.slice(1) }, { ...document, activities: document.activities.slice(1) }, model);
    assert.deepEqual(recipe.setActivity(change.document, first!.id!, { name: first!.name }).document, document, model);
    // The control: the name of the second activity is taken, and the refusal names the activity being changed.
    assert.deepEqual(refused(() => recipe.setActivity(document, first!.id!, { name: second!.name })), ['invalid', { kind: 'activity', activity: first!.id }], model);
  }
});

/**
 * Where the One's reference with its stated fields names the KPN, written out from what `oneStated` put there and what
 * the reference itself holds, independently of the toolkit's walk: the LG TV's own key and screen entry; Watch TV's
 * devices, power order, its screen entry, its sequence Zappen with the screen entry and the key running it, and two of
 * its extra steps; and Plasma's activity's devices and three screen entries, the third a sequence written out with its
 * steps, which sends to the KPN alone.
 */
const ONE_KPN_NAMED_AT: readonly Place[] = [
  { kind: 'key', owner: { device: 'd1' }, key: 'Guide' },
  { kind: 'screen-item', owner: { device: 'd1' }, item: 0 },
  { kind: 'activity-device', activity: 'a1', device: 'd4' },
  { kind: 'power-order', activity: 'a1', device: 'd4' },
  { kind: 'screen-item', owner: { activity: 'a1' }, item: 1 },
  { kind: 'sequence', sequence: 's1' },
  { kind: 'screen-item', owner: { activity: 'a1' }, item: 0 },
  { kind: 'key', owner: { activity: 'a1' }, key: 'Info' },
  { kind: 'step', activity: 'a1', when: 'start', step: 0 },
  { kind: 'step', activity: 'a1', when: 'start', step: 2 },
  { kind: 'activity-device', activity: 'a5', device: 'd4' },
  { kind: 'screen-item', owner: { activity: 'a5' }, item: 0 },
  { kind: 'screen-item', owner: { activity: 'a5' }, item: 1 },
  { kind: 'screen-item', owner: { activity: 'a5' }, item: 3 },
];

test('on both references removing a device settles exactly the places uses lists, a sequence sending to it alone going with everything that ran it', () => {
  // The two answers come from one walk, so their agreement alone could not fail: on the One both are also held to the
  // places written out by hand, `ONE_KPN_NAMED_AT`, which a walk that missed or invented a place would not match.
  assert.deepEqual(recipe.uses(oneStated(), { device: 'd4' }), ONE_KPN_NAMED_AT);
  assert.deepEqual(recipe.remove(oneStated(), { device: 'd4' }).effects.map((one) => one.place), ONE_KPN_NAMED_AT);
  const cases = [['Harmony One', oneStated(), 'd4', 'KPN', 'Zappen'], ['Harmony Touch', touchTest(), 'd3', 'Blu-ray', 'Test Sequence']] as const;
  for (const [model, document, id, name, sequence] of cases) {
    const places = recipe.uses(document, { device: id });
    const kinds = new Set(places.map((one: Place) => one.kind));
    // Among them a sequence, the keys and entries that run it, and on the One a power order and extra steps.
    assert.ok(kinds.has('sequence') && kinds.has('key') && kinds.has('screen-item') && kinds.has('activity-device'), `${model}: ${[...kinds].join(', ')}`);
    if (model === 'Harmony One') assert.ok(kinds.has('power-order') && kinds.has('step'), [...kinds].join(', '));
    const change = kept(document, () => recipe.remove(document, { device: id }));
    assert.deepEqual(change.effects.map((one) => one.place), places, model);
    assert.ok(change.effects.every((one) => one.message.length > 0));
    assert.equal(mentions(change.document, name), 0, `${model}: ${name} is still named`);
    // The sequence went, and nothing runs it any more.
    assert.equal(mentions(change.document, sequence), 0, `${model}: ${sequence} is still named`);
    assert.ok(recipe.sequences(change.document).every((one) => one.name !== sequence));
    // The control: a device nothing names goes with no effect.
    const lone = recipe.addDevice(document, { name: 'Spare', device: fetched(document, document.devices[0]!.name) }).document;
    const spare = lone.devices.at(-1)!.id!;
    assert.deepEqual(recipe.uses(lone, { device: spare }), []);
    assert.deepEqual(recipe.remove(lone, { device: spare }).effects, []);
  }
});

test('on the One what stays after a removal is what did not name the device: the pause of an extra step list, the rest of a power order', () => {
  const document = oneStated();
  const activity = recipe.remove(document, { device: 'd4' }).document.activities[0]!;
  assert.deepEqual(activity.start, [{ pause: 5 }]);
  assert.deepEqual(activity.end, [{ device: 'LG TV', command: 'PowerToggle' }]);
  assert.deepEqual(activity.powerOrder, ['Denon', 'LG TV']);
  // The LG TV's own map loses its key sending the KPN's Guide, and its stated screen, a person's list, is kept empty.
  const tv = recipe.remove(document, { device: 'd4' }).document.devices[0]!;
  assert.equal(tv.keys, undefined);
  assert.deepEqual(tv.screen, []);
});

test('on both references a sequence is removed with every key, entry and step that ran it, and renamed with each of them following', () => {
  for (const [model, document] of [['Harmony One', oneStated()], ['Harmony Touch', touchTest()]] as const) {
    const [sequence] = recipe.sequences(document);
    assert.ok(sequence !== undefined, model);
    const places = recipe.uses(document, { sequence: sequence.id });
    // Written out from the references, independently of the walk: on the One the entry and the key `oneStated` made
    // run Zappen; on the Touch Watch a Blu-ray's ninth screen entry and its Yellow key run the test sequence.
    const expected: Record<string, readonly Place[]> = {
      'Harmony One': [{ kind: 'screen-item', owner: { activity: 'a1' }, item: 0 }, { kind: 'key', owner: { activity: 'a1' }, key: 'Info' }],
      'Harmony Touch': [{ kind: 'screen-item', owner: { activity: 'a2' }, item: 8 }, { kind: 'key', owner: { activity: 'a2' }, key: 'Yellow' }],
    };
    assert.deepEqual(places, expected[model], model);
    const before = mentions(document, sequence.name);
    const renamed = kept(document, () => recipe.setSequence(document, sequence.id, { name: 'Renamed' })).document;
    assert.equal(mentions(renamed, sequence.name), 0, model);
    assert.equal(mentions(renamed, 'Renamed'), before, model);
    assert.deepEqual(recipe.uses(renamed, { sequence: sequence.id }), places, model);
    const change = kept(document, () => recipe.remove(document, { sequence: sequence.id }));
    assert.deepEqual(change.effects.map((one) => one.place), places, model);
    assert.equal(mentions(change.document, sequence.name), 0, model);
    // Its number is kept: the next sequence added is not given it again.
    const next = recipe.addSequence(change.document, recipe.sequences(document)[0]!.activity, { name: 'Next', steps: sequence.steps }).document;
    assert.notEqual(recipe.sequences(next)[0]!.id, sequence.id, model);
  }
});

test('on both references the id of the device and of the activity removed last is not given again, and the record of ids is what keeps it', () => {
  for (const [model, make] of BOTH) {
    const document = make();
    const lastDevice = document.devices.at(-1)!;
    const lastActivity = document.activities.at(-1)!;
    const removed = recipe.remove(recipe.remove(document, { device: lastDevice.id! }).document, { activity: lastActivity.id! }).document;
    const added = recipe.addActivity(recipe.addDevice(removed, { name: 'Again', device: fetched(document, lastDevice.name) }).document, { name: 'Again', type: 'Custom', devices: [] }).document;
    const number = (id: string): number => Number(id.slice(1));
    assert.equal(number(added.devices.at(-1)!.id!), number(lastDevice.id!) + 1, model);
    assert.equal(number(added.activities.at(-1)!.id!), number(lastActivity.id!) + 1, model);
    // The control: without its record of ids the same document would give the removed numbers again, a device's and
    // an activity's alike.
    const { highestIds: _ids, ...forgetful } = removed;
    assert.equal(recipe.addDevice(forgetful, { name: 'Again', device: fetched(document, lastDevice.name) }).document.devices.at(-1)!.id, lastDevice.id, model);
    assert.equal(recipe.addActivity(forgetful, { name: 'Again', type: 'Custom', devices: [] }).document.activities.at(-1)!.id, lastActivity.id, model);
  }
});

test('on both references the id of the sequence removed last is not given again, and the record of ids is what keeps it', () => {
  for (const [model, make] of SEQUENCED) {
    const document = make();
    const last = recipe.sequences(document).at(-1)!;
    const removed = recipe.remove(document, { sequence: last.id }).document;
    const again = { name: 'Again', steps: last.steps };
    const added = recipe.addSequence(removed, last.activity, again).document;
    const number = (id: string): number => Number(id.slice(1));
    assert.equal(number(recipe.sequences(added).find((one) => one.name === 'Again')!.id), number(last.id) + 1, model);
    // The control: without its record of ids the same document gives the removed number again.
    const { highestIds: _ids, ...forgetful } = removed;
    assert.equal(recipe.sequences(recipe.addSequence(forgetful, last.activity, again).document).find((one) => one.name === 'Again')!.id, last.id, model);
  }
});

// ---------------------------------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------------------------------

test('on the Touch setKey takes a held press, a gesture\'s double press and a sequence on an activity\'s key, and each answers as the person\'s', () => {
  let document = touchTest();
  document = kept(document, () => recipe.setKey(document, { owner: { device: 'd5' }, key: 'Info', press: 'held' }, { device: 'd5', command: 'Guide' })).document;
  document = kept(document, () => recipe.setKey(document, { owner: { activity: 'a1' }, key: 'SwipeUp', press: 'double' }, { device: 'd1', command: 'Mute' })).document;
  document = kept(document, () => recipe.setKey(document, { owner: { activity: 'a2' }, key: 'Red' }, { sequence: 's1' })).document;
  const held = recipe.key(document, { owner: { device: 'd5' }, key: 'Info', press: 'held' }).presses[0]!;
  assert.deepEqual([held.action, held.isDefault], [{ device: 'd5', command: 'Guide' }, false]);
  const double = recipe.key(document, { owner: { activity: 'a1' }, key: 'SwipeUp', press: 'double' }).presses[0]!;
  assert.deepEqual([double.action, double.isDefault], [{ device: 'd1', command: 'Mute' }, false]);
  const red = recipe.key(document, { owner: { activity: 'a2' }, key: 'Red' }).presses[0]!;
  assert.deepEqual([red.action, red.isDefault], [{ sequence: 'Test Sequence' }, false]);
  // The Touch's build takes all three, so the check lists none of them.
  assert.deepEqual(recipe.check(document), []);
  // Each given back answers the family's again, and the document is the one before.
  let back = recipe.setKey(document, { owner: { device: 'd5' }, key: 'Info', press: 'held' }, 'default').document;
  back = recipe.setKey(back, { owner: { activity: 'a1' }, key: 'SwipeUp', press: 'double' }, 'default').document;
  back = recipe.setKey(back, { owner: { activity: 'a2' }, key: 'Red' }, 'default').document;
  assert.deepEqual(back, touchTest());
});

test('setKey answers not on this model for a press the key lacks, a gesture in a device\'s map and a command the Touch\'s pad draws on no key, each beside its accepted control', () => {
  const touch = touchTest();
  const one = oneTest();
  const at = (owner: object, key: string, press?: string): Place => ({ kind: 'key', owner, key, ...(press === undefined ? {} : { press }) }) as Place;
  // A Harmony One has no long press and no gesture: not on this model. The control, the short press, is taken.
  assert.deepEqual(refused(() => recipe.setKey(one, { owner: { device: 'd1' }, key: 'VolumeUp', press: 'held' }, { nothing: true })), ['not-on-this-model', at({ device: 'd1' }, 'VolumeUp', 'held')]);
  assert.equal(refused(() => recipe.setKey(one, { owner: { device: 'd1' }, key: 'VolumeUp' }, { nothing: true })), undefined);
  // A Touch's key has no double press, its gestures are an activity's: not on this model. The controls are taken.
  assert.deepEqual(refused(() => recipe.setKey(touch, { owner: { device: 'd5' }, key: 'Info', press: 'double' }, { nothing: true })), ['not-on-this-model', at({ device: 'd5' }, 'Info', 'double')]);
  assert.deepEqual(refused(() => recipe.setKey(touch, { owner: { device: 'd5' }, key: 'SwipeUp' }, { nothing: true })), ['not-on-this-model', at({ device: 'd5' }, 'SwipeUp')]);
  assert.equal(refused(() => recipe.setKey(touch, { owner: { activity: 'a1' }, key: 'SwipeUp' }, { nothing: true })), undefined);
  // The Touch's pad places an entry by its command's name: the KPN's Info on Number1 is drawn on no key, its 1 is.
  let message = '';
  try {
    recipe.setKey(touch, { owner: { device: 'd5' }, key: 'Number1' }, { device: 'd5', command: 'Info' });
  } catch (error) {
    assert.ok(error instanceof recipe.ChangeRefused && error.reason === 'not-on-this-model');
    message = error.message;
  }
  assert.match(message, /the pad draws on that key only a command named 1/);
  assert.deepEqual(recipe.setKey(touch, { owner: { device: 'd5' }, key: 'Number1' }, { device: 'd5', command: '1' }).document.devices[4]!.keys,
    [{ key: 'Number1', action: { device: 'KPN', command: '1' } }]);
  // A key the remote binds itself is unknown to every map, with the family's reason.
  assert.deepEqual(refused(() => recipe.setKey(touch, { owner: { device: 'd5' }, key: 'Off' }, { nothing: true })), ['unknown', at({ device: 'd5' }, 'Off')]);
  // A sequence on a device's own map, and one of another activity, are refused on both models.
  for (const document of [touch, oneStated()]) {
    const [sequence] = recipe.sequences(document);
    const other = document.activities.find((one) => one.id !== sequence!.activity)!.id!;
    assert.deepEqual(refused(() => recipe.setKey(document, { owner: { device: 'd1' }, key: 'Info' }, { sequence: sequence!.id })), ['invalid', at({ device: 'd1' }, 'Info')]);
    assert.deepEqual(refused(() => recipe.setKey(document, { owner: { activity: other }, key: 'Info' }, { sequence: sequence!.id })), ['unknown', { kind: 'sequence', sequence: sequence!.id }]);
  }
});

test('the check lists a pad choice the Touch\'s family refuses with the family\'s own sentence, and a sequence on a One\'s key as nothing the One builds', () => {
  const json = copy(touchTest()) as Json;
  json.devices[4].keys = [{ key: 'Number1', action: { device: 'KPN', command: 'Info' } }];
  const problems = recipe.check(recipe.open(json));
  assert.deepEqual(problems.map((one) => [one.severity, one.code, one.place]), [['error', 'not-on-this-model', { kind: 'key', owner: { device: 'd5' }, key: 'Number1' }]]);
  assert.match(problems[0]!.message, /the pad draws on that key only a command named 1/);
  // The control: the command the pad draws there lists nothing.
  json.devices[4].keys = [{ key: 'Number1', action: { device: 'KPN', command: '1' } }];
  assert.deepEqual(recipe.check(recipe.open(json)), []);
  // A sequence on a key is written on the One, whose build takes none, and the check says so where it is.
  const one = oneStated();
  const said = recipe.check(one).filter((p) => p.place.kind === 'key');
  assert.deepEqual(said.map((p) => [p.code, p.place]), [['not-on-this-model', { kind: 'key', owner: { activity: 'a1' }, key: 'Info' }]]);
  assert.match(said[0]!.message, /puts a sequence on the Info key, which nothing builds for a Harmony One yet/);
});

// ---------------------------------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------------------------------

test('on both references a screen is stated whole for an activity and a device, labels and a sequence by id included, and given back by default', () => {
  for (const [model, make] of BOTH) {
    const document = model === 'Harmony One' ? oneStated() : make();
    const [sequence] = recipe.sequences(document);
    const activity = sequence!.activity;
    const items = [{ sequence: sequence!.id }, { device: 'd1', command: 'Mute', label: 'Stil' }, { device: 'd2', command: 'PowerToggle' }];
    const change = kept(document, () => recipe.setScreen(document, { activity }, items));
    const answer = recipe.screen(change.document, { activity });
    assert.equal(answer.isDefault, false, model);
    assert.deepEqual(answer.items.map((one) => ('client' in one ? one.client : 'sequence' in one ? one.sequence : `${one.device}.${one.command}.${one.label ?? '-'}`)),
      [sequence!.name, 'd1.Mute.Stil', 'd2.PowerToggle.-'], model);
    // A device's own screen, stated empty, is a person's empty list and not the family's.
    const emptied = recipe.setScreen(document, { device: 'd2' }, []).document;
    assert.deepEqual([recipe.screen(emptied, { device: 'd2' }).isDefault, recipe.screen(emptied, { device: 'd2' }).items], [false, []], model);
    // Given back, the family's list answers again, and the document no longer states one.
    const back = recipe.setScreen(emptied, { device: 'd2' }, 'default').document;
    assert.equal(recipe.screen(back, { device: 'd2' }).isDefault, true, model);
    assert.deepEqual(back, document, model);
    // A sequence on a device's screen, a command the device lacks, a page and a sequence's own label.
    assert.deepEqual(refused(() => recipe.setScreen(document, { device: 'd2' }, [{ sequence: sequence!.id }])), ['invalid', { kind: 'screen-item', owner: { device: 'd2' }, item: 0 }]);
    assert.deepEqual(refused(() => recipe.setScreen(document, { device: 'd2' }, [{ device: 'd1', command: 'Dance' }])), ['unknown', { kind: 'command', device: 'd1', command: 'Dance' }]);
    assert.throws(() => recipe.setScreen(document, { activity }, [{ label: 'More', page: [] }]), notBuilt('recipe.setScreen for a page of entries', 36));
    assert.throws(() => recipe.setScreen(document, { activity }, [{ label: 'Go', sequence: sequence!.id }]), notBuilt('recipe.setScreen for a label of a sequence\'s own', 34));
  }
});

test('a screen on the Harmony 300 and the Harmony 350, the two models without one, is not on this model, and giving one back is still taken', () => {
  const tv = fetched(oneTest(), 'LG TV');
  for (const name of ['Harmony 300', 'Harmony 350']) {
    const document = recipe.addDevice(recipe.create({ name }), { name: 'Television', device: tv }).document;
    assert.deepEqual(refused(() => recipe.setScreen(document, { device: 'd1' }, [])), ['not-on-this-model', { kind: 'device', device: 'd1' }], name);
    assert.deepEqual(recipe.setScreen(document, { device: 'd1' }, 'default').document, document, name);
  }
  // The control: the same screen on a model with one is taken.
  const one = recipe.addDevice(recipe.create({ name: 'Harmony One' }), { name: 'Television', device: tv }).document;
  assert.equal(refused(() => recipe.setScreen(one, { device: 'd1' }, [])), undefined);
});

// ---------------------------------------------------------------------------------------------------
// A device's settings and its commands
// ---------------------------------------------------------------------------------------------------

test('on both references a device\'s timing, power and channel tuning are set member by member, answered as the person\'s, and given back member by member and whole', () => {
  for (const [model, make] of BOTH) {
    const document = make();
    const sent = (d: Recipe) => {
      const press = recipe.key(d, { owner: { device: 'd1' }, key: 'VolumeUp' }).presses[0]!;
      assert.ok('sending' in press, model);
      return press.sending.settings;
    };
    const catalogue = sent(document);
    const timed = kept(document, () => recipe.setDevice(document, 'd1', { timing: { interKeyDelay: catalogue.interKeyDelay.value + 50, pressMinRepeats: 2 } })).document;
    assert.deepEqual([sent(timed).interKeyDelay, sent(timed).pressMinRepeats], [{ value: catalogue.interKeyDelay.value + 50, isDefault: false }, { value: 2, isDefault: false }], model);
    // One member given back: that one is the catalogue's again, the other stays the person's.
    const one = recipe.setDevice(timed, 'd1', { timing: { interKeyDelay: 'default' } }).document;
    assert.deepEqual([sent(one).interKeyDelay, sent(one).pressMinRepeats.isDefault], [catalogue.interKeyDelay, false], model);
    assert.deepEqual(recipe.setDevice(timed, 'd1', { timing: 'default' }).document.devices[0]!.timing, document.devices[0]!.timing, model);
    // Power alike, its steps included: two members set, one given back keeps the other, and the whole given back
    // drops both. A step names a command of the device, and one it does not have is refused where it is named.
    const powered = kept(document, () => recipe.setDevice(document, 'd1', { power: { alwaysOn: true, on: [{ kind: 'send', command: 'Mute' }] } })).document;
    assert.deepEqual(powered.devices[0]!.power, { ...document.devices[0]!.power, alwaysOn: true, on: [{ kind: 'send', command: 'Mute' }] }, model);
    assert.deepEqual(recipe.setDevice(powered, 'd1', { power: { alwaysOn: 'default' } }).document.devices[0]!.power, { ...document.devices[0]!.power, on: [{ kind: 'send', command: 'Mute' }] }, model);
    assert.equal(recipe.setDevice(powered, 'd1', { power: 'default' }).document.devices[0]!.power, undefined, model);
    assert.deepEqual(refused(() => recipe.setDevice(document, 'd1', { power: { on: [{ kind: 'send', command: 'Dance' }] } })), ['unknown', { kind: 'command', device: 'd1', command: 'Dance' }], model);
    // Channel tuning alike: its digits and a step at its start, one given back, and the whole given back.
    const tuned = kept(document, () => recipe.setDevice(document, 'd1', { channelTuning: { fixedDigits: 2, start: [{ kind: 'send', command: 'Mute' }] } })).document;
    assert.deepEqual(tuned.devices[0]!.channelTuning, { ...document.devices[0]!.channelTuning, fixedDigits: 2, start: [{ kind: 'send', command: 'Mute' }] }, model);
    // The Touch's reference states every list of its tuning, empty ones included, so the one given back is gone from it.
    const { start: _start, ...others } = document.devices[0]!.channelTuning ?? {};
    assert.deepEqual(recipe.setDevice(tuned, 'd1', { channelTuning: { start: 'default' } }).document.devices[0]!.channelTuning, { ...others, fixedDigits: 2 }, model);
    assert.equal(recipe.setDevice(tuned, 'd1', { channelTuning: 'default' }).document.devices[0]!.channelTuning, undefined, model);
    assert.deepEqual(refused(() => recipe.setDevice(document, 'd1', { channelTuning: { finish: [{ kind: 'hold', command: 'Dance' }] } })), ['unknown', { kind: 'command', device: 'd1', command: 'Dance' }], model);
    // A value no timing takes is refused, named by the device's name and not its position in the document.
    const device = document.devices[0]!.name;
    let said = '';
    try {
      recipe.setDevice(document, 'd1', { timing: { interKeyDelay: -1 } });
    } catch (error) {
      said = error instanceof Error ? error.message : '';
    }
    assert.ok(said.startsWith(`${device}'s timing`), `${model}: ${said}`);
    assert.deepEqual(refused(() => recipe.setDevice(document, 'd1', { timing: { interKeyDelay: -1 } })), ['invalid', { kind: 'device', device: 'd1' }]);
    assert.deepEqual(refused(() => recipe.setDevice(document, 'd1', { timing: { dance: 1 } as never })), ['invalid', { kind: 'device', device: 'd1' }]);
    // The control: a change stating nothing changes nothing.
    assert.deepEqual(recipe.setDevice(document, 'd1', {}).document, document, model);
  }
});

test('on both references one command\'s code and tuning are set, answered, and put back to the original; a command added is taken away, but not while a key uses it', () => {
  for (const [model, make] of BOTH) {
    const document = make();
    const own = kept(document, () => recipe.setDeviceCommand(document, 'd1', 'VolumeUp', { code: { keycode: 'NEC1:4:0:12' }, sending: { copies: 2, leadInMs: 40 } })).document;
    assert.deepEqual(recipe.commands(own, 'd1').find((one) => one.name === 'VolumeUp'), { name: 'VolumeUp', changed: true, learned: false }, model);
    const press = recipe.key(own, { owner: { device: 'd1' }, key: 'VolumeUp' }).presses[0]!;
    assert.ok('sending' in press);
    assert.deepEqual(press.sending.command, { copies: { value: 2, isDefault: false }, leadInMs: { value: 40, isDefault: false } }, model);
    // One member of the tuning given back keeps the other; the original drops the whole entry.
    assert.deepEqual(recipe.setDeviceCommand(own, 'd1', 'VolumeUp', { sending: { copies: 'default' } }).document.devices[0]!.commands, { VolumeUp: { code: { keycode: 'NEC1:4:0:12' }, sending: { leadInMs: 40 } } }, model);
    assert.deepEqual(recipe.setDeviceCommand(own, 'd1', 'VolumeUp', 'original').document, document, model);
    // A command the definition lacks is added by a code, used, refused removal while used, and removed when not.
    const added = recipe.setDeviceCommand(document, 'd1', 'Kids', { code: { learned: [{ mark: true, us: 9000 }, { mark: false, us: 4500 }] } }).document;
    assert.deepEqual(recipe.commands(added, 'd1').at(-1), { name: 'Kids', changed: true, learned: true }, model);
    const used = recipe.setKey(added, { owner: { device: 'd1' }, key: 'Info' }, { device: 'd1', command: 'Kids' }).document;
    assert.deepEqual(refused(() => recipe.setDeviceCommand(used, 'd1', 'Kids', 'removed')), ['invalid', { kind: 'key', owner: { device: 'd1' }, key: 'Info' }]);
    assert.deepEqual(recipe.setDeviceCommand(added, 'd1', 'Kids', 'removed').document, document, model);
    // A tuning of a command the device does not have, the original of one added, and a command of the definition taken away.
    assert.deepEqual(refused(() => recipe.setDeviceCommand(document, 'd1', 'Dance', { sending: { copies: 2 } })), ['unknown', { kind: 'command', device: 'd1', command: 'Dance' }]);
    assert.deepEqual(refused(() => recipe.setDeviceCommand(added, 'd1', 'Kids', 'original')), ['invalid', { kind: 'command', device: 'd1', command: 'Kids' }]);
    assert.throws(() => recipe.setDeviceCommand(document, 'd1', 'VolumeUp', 'removed'), notBuilt('recipe.setDeviceCommand taking away a command of the device\'s definition', 19));
  }
});

test('on both references a definition fetched again replaces the definition alone and reports every choice naming a command it lacks, which check then lists', () => {
  for (const [model, document, id, gone] of [['Harmony One', oneStated(), 'd4', ['Info', 'Teletext']], ['Harmony Touch', touchTest(), 'd5', ['Info', 'Teletext']]] as const) {
    const name = document.devices.find((one) => one.id === id)!.name;
    const same = fetched(document, name);
    // The control: the same definition again reports nothing and changes nothing.
    const again = kept(document, () => recipe.refreshDevice(document, id, same));
    assert.deepEqual([again.effects, again.document], [[], document], model);
    const fewer: CarriedDevice = { ...same, definition: { ...same.definition, commands: same.definition.commands.filter((one) => !(gone as readonly string[]).includes(one.name)) } };
    const change = kept(document, () => recipe.refreshDevice(document, id, fewer));
    // Every other field of the device stays, a stated timing and channel tuning among them.
    const { definition: _was, ...before } = document.devices.find((one) => one.id === id)!;
    const { definition: now, ...after } = change.document.devices.find((one) => one.id === id)!;
    assert.deepEqual(after, before, model);
    assert.deepEqual(now, fewer.definition, model);
    assert.deepEqual(change.document.activities, document.activities, model);
    // What is reported is what the check now lists, place for place.
    assert.equal(change.effects.length, ({ 'Harmony One': 4, 'Harmony Touch': 2 } as Record<string, number>)[model], `${model}: ${JSON.stringify(change.effects)}`);
    assert.ok(change.effects.every((one) => one.effect === 'missing'), model);
    const listed = recipe.check(change.document).filter((one) => one.code === 'unknown-command').map((one) => one.place);
    assert.deepEqual(new Set(listed.map((one) => JSON.stringify(one))), new Set(change.effects.map((one) => JSON.stringify(one.place))), model);
    // Another catalogue entry is another device.
    assert.deepEqual(refused(() => recipe.refreshDevice(document, id, { ...same, entry: 'Made/Else' })), ['invalid', { kind: 'device', device: id }]);
  }
});

// ---------------------------------------------------------------------------------------------------
// Sequences, an activity's own members, and the settings
// ---------------------------------------------------------------------------------------------------

test('on both references a sequence is added to an activity under the next id, listed with it, and refused with a device its activity does not use or a command its device lacks', () => {
  for (const [model, make] of BOTH) {
    const document = make();
    const before = recipe.sequences(document);
    const highest = Math.max(0, ...before.map((one) => Number(one.id.slice(1))));
    const added = kept(document, () => recipe.addSequence(document, 'a1', { name: 'Late film', steps: [{ device: 'd1', command: 'Mute' }, { pause: 20 }, { device: 'd1', command: 'Mute' }] })).document;
    const id = `s${highest + 1}`;
    assert.deepEqual(recipe.sequences(added).find((one) => one.id === id), {
      id, activity: 'a1', name: 'Late film', steps: [{ device: 'd1', command: 'Mute' }, { pause: 20 }, { device: 'd1', command: 'Mute' }],
    }, model);
    const place = { kind: 'activity', activity: 'a1' };
    const unused = document.devices.find((one) => !document.activities[0]!.devices.some((used) => used.device === one.name))!.id!;
    assert.deepEqual(refused(() => recipe.addSequence(document, 'a1', { name: 'X', steps: [{ device: unused, command: 'Mute' }] })), ['invalid', { kind: 'activity-device', activity: 'a1', device: unused }]);
    assert.deepEqual(refused(() => recipe.addSequence(document, 'a1', { name: 'X', steps: [{ device: 'd1', command: 'Dance' }] })), ['unknown', { kind: 'command', device: 'd1', command: 'Dance' }]);
    assert.deepEqual(refused(() => recipe.addSequence(document, 'a1', { name: 'X', steps: [{ pause: 5 }] })), ['invalid', place]);
    assert.deepEqual(refused(() => recipe.addSequence(added, 'a1', { name: 'Late film', steps: [{ device: 'd1', command: 'Mute' }] })), ['invalid', place]);
    // Its steps changed whole, and the control: a sequence nothing runs is used by nothing.
    assert.deepEqual(recipe.sequences(recipe.setSequence(added, id, { steps: [{ device: 'd1', command: 'VolumeUp' }] }).document).find((one) => one.id === id)!.steps, [{ device: 'd1', command: 'VolumeUp' }]);
    assert.deepEqual(recipe.uses(added, { sequence: id }), []);
  }
});

test('on both references an activity\'s power order and extra steps are set and given back, and holding the favourites moves from one activity to another', () => {
  for (const [model, make] of BOTH) {
    const document = make();
    const a1 = document.activities[0]!;
    const ids = a1.devices.map((used) => document.devices.find((one) => one.name === used.device)!.id!);
    // The opening screen is the Touch's alone, which names its screens; the next test holds it.
    const opens = model === 'Harmony Touch' ? { opensOn: 'Gesturepad' } : {};
    const change = kept(document, () => recipe.setActivity(document, 'a1', {
      ...opens, powerOrder: [...ids].reverse(), favourites: true,
      start: [{ device: ids[0]!, command: 'Mute' }, { pause: 5 }, { device: ids[0]!, channel: '07' }], end: [{ device: ids[0]!, command: 'Mute' }],
    }));
    const set = change.document.activities[0]!;
    assert.deepEqual([set.opensOn, set.favourites, set.powerOrder], [opens.opensOn, true, [...a1.devices.map((one) => one.device)].reverse()], model);
    assert.deepEqual(set.start, [{ device: a1.devices[0]!.device, command: 'Mute' }, { pause: 5 }, { device: a1.devices[0]!.device, channel: '07' }], model);
    // Another activity taking the favourites takes them off this one, which is reported.
    const moved = recipe.setActivity(change.document, 'a2', { favourites: true });
    assert.deepEqual([moved.document.activities[0]!.favourites, moved.document.activities[1]!.favourites], [undefined, true], model);
    assert.deepEqual(moved.effects.map((one) => [one.place, one.effect]), [[{ kind: 'activity', activity: 'a1' }, 'changed']], model);
    // Each given back, the document is the one before; an empty list of steps is none, as the default is.
    const back = recipe.setActivity(change.document, 'a1', {
      ...(model === 'Harmony Touch' ? { opensOn: a1.opensOn ?? 'default' } : {}), powerOrder: 'default', favourites: 'default', start: [], end: 'default',
    }).document;
    assert.deepEqual(back, document, model);
    // A power order that misses a device, and a step to a device the activity does not use.
    assert.deepEqual(refused(() => recipe.setActivity(document, 'a1', { powerOrder: [ids[0]!] })), ['invalid', { kind: 'activity', activity: 'a1' }]);
    const unused = document.devices.find((one) => !a1.devices.some((used) => used.device === one.name))!.id!;
    assert.deepEqual(refused(() => recipe.setActivity(document, 'a1', { start: [{ device: unused, command: 'Mute' }] })), ['invalid', { kind: 'activity-device', activity: 'a1', device: unused }]);
  }
});

test('an activity\'s devices changed take its power order along, and a device a step of its still sends to is refused where the step is', () => {
  const document = touchTest();
  // Watch a Blu-ray: the LG TV, the Blu-ray and the Denon, with a sequence sending to the Blu-ray.
  const ordered = recipe.setActivity(document, 'a2', { powerOrder: ['d3', 'd2', 'd1'] }).document;
  const changed = recipe.setActivity(ordered, 'a2', { devices: [{ device: 'd3', roles: ['PlayMovie'] }, { device: 'd1', roles: ['Display'] }, { device: 'd4', roles: [] }] }).document;
  assert.deepEqual(changed.activities[1]!.powerOrder, ['Blu-ray', 'LG TV', 'Plex']);
  assert.deepEqual(refused(() => recipe.setActivity(document, 'a2', { devices: [{ device: 'd1', roles: ['Display'] }] })), ['invalid', { kind: 'sequence-step', sequence: 's1', step: 0 }]);
});

test('on both references the remote\'s settings are set by name and given back, and a name no record can hold is refused', () => {
  for (const [model, make] of BOTH) {
    const document = make();
    const set = kept(document, () => recipe.setSetting(document, 'ScreenTimeout', 30)).document;
    assert.equal(set.settings!['ScreenTimeout'], 30, model);
    assert.deepEqual(recipe.setSetting(set, 'ScreenTimeout', document.settings?.['ScreenTimeout'] ?? 'default').document, document, model);
    assert.deepEqual(refused(() => recipe.setSetting(document, '__proto__', 1)), ['invalid', { kind: 'setting', setting: '__proto__' }]);
  }
});

// ---------------------------------------------------------------------------------------------------
// The check against a device's commands, and plain data
// ---------------------------------------------------------------------------------------------------

test('the check lists a step and an entry naming a command their device lacks, from the definition carried or the archive given, and nothing where neither says', () => {
  const json = copy(oneStated()) as Json;
  json.activities[0].start[0].command = 'Dance';
  json.activities[0].sequences[0].steps[0].command = 'Dance';
  const damaged = recipe.open(json);
  const unknown = (problems: ReturnType<typeof recipe.check>) => problems.filter((one) => one.code === 'unknown-command').map((one) => one.place);
  assert.deepEqual(unknown(recipe.check(damaged)), [{ kind: 'sequence-step', sequence: 's1', step: 0 }, { kind: 'step', activity: 'a1', when: 'start', step: 0 }]);
  // The control: the document as it was lists none.
  assert.deepEqual(unknown(recipe.check(oneStated())), []);
  // With the KPN's definition taken out nothing says which commands it has, until an archive serving it is given.
  const definition = json.devices[3].definition;
  delete json.devices[3].definition;
  const bare = recipe.open(json);
  assert.deepEqual(unknown(recipe.check(bare)), []);
  const archive: CatalogueSource = carriedCatalogue({ model: json.model, devices: [{ ...json.devices[3], definition }], activities: [], protocols: json.protocols })!;
  assert.deepEqual(unknown(recipe.check(bare, { archive })), [{ kind: 'sequence-step', sequence: 's1', step: 0 }, { kind: 'step', activity: 'a1', when: 'start', step: 0 }]);
});

test('a document a change returns shares nothing with the one given or with what a caller passed in', () => {
  for (const [model, make] of BOTH) {
    const document = make();
    const tv = fetched(document, document.devices[0]!.name);
    const added = recipe.addDevice(document, { name: 'Second', device: tv }).document;
    const commands = added.devices.at(-1)!.definition!.commands.length;
    // What the caller passed in, changed afterwards, is not seen in the document.
    (tv.definition.commands as unknown[]).length = 0;
    assert.equal(added.devices.at(-1)!.definition!.commands.length, commands, model);
    // The document returned, changed, is not seen in the one given, nor the other way round.
    (added.devices[0]!.definition!.commands as unknown[]).length = 0;
    assert.ok(document.devices[0]!.definition!.commands.length > 0, model);
    const renamed = recipe.setDevice(document, 'd2', { name: 'Other' }).document;
    (document.activities[0]!.devices as unknown[]).length = 0;
    assert.ok(renamed.activities[0]!.devices.length > 0, model);
  }
  // And the control: an object shared on purpose is seen through both names, so the checks above can fail.
  const shared = { list: [1] };
  const twice = [shared, shared];
  twice[0]!.list.length = 0;
  assert.equal(twice[1]!.list.length, 0);
});

test('every change refuses a document that did not come through open, which a sequence without its id is', () => {
  const json = copy(touchTest()) as Json;
  delete json.activities[1].sequences[0].id;
  const read = readRecipe(json);
  assert.throws(() => recipe.setDevice(read, 'd1', { name: 'X' }), (error: unknown) => error instanceof RecipeError && /sequence Test Sequence has no id/.test(error.message));
  // The control: opened, it is given one, past the highest the document holds.
  assert.equal(recipe.open(json).activities[1]!.sequences![0]!.id, 's1');
});

test('opening a document that records the highest ids gives a device without an id the next number and records it, so it opens again', () => {
  const json = copy(oneTest()) as Json;
  json.highestIds = { device: 9 };
  delete json.devices[6].id;
  const opened = recipe.open(json);
  assert.deepEqual([opened.devices[6]!.id, opened.highestIds], ['d10', { device: 10 }]);
  assert.deepEqual(recipe.open(copy(opened)), opened);
  // The control: a document recording nothing gives the number after the highest id it holds, and records nothing.
  delete json.highestIds;
  assert.deepEqual([recipe.open(json).devices[6]!.id, recipe.open(json).highestIds], ['d7', undefined]);
});

// ---------------------------------------------------------------------------------------------------
// What a model lacks, a model no family serves, and what a caller passes
// ---------------------------------------------------------------------------------------------------

test('the screen an activity opens on is held to the words the Touch\'s family names, which are the words its build takes, not built on the One and not on the 300', () => {
  const touch = touchTest();
  const words = TOUCH_MAPS.openingScreens!;
  for (const word of words) {
    const set = kept(touch, () => recipe.setActivity(touch, 'a1', { opensOn: word })).document;
    assert.equal(set.activities[0]!.opensOn, word);
    // The closure: the Touch's build takes each word the toolkit takes.
    assert.doesNotThrow(() => touchSetupOfDocument(set, carriedCatalogue(set)!), word);
  }
  // A word the family does not name is not on this model at the change, and the build refuses it too.
  assert.deepEqual(refused(() => recipe.setActivity(touch, 'a1', { opensOn: 'Dance' })), ['not-on-this-model', { kind: 'activity', activity: 'a1' }]);
  const json = copy(touch) as Json;
  json.activities[0].opensOn = 'Dance';
  const written = recipe.open(json);
  assert.throws(() => touchSetupOfDocument(written, carriedCatalogue(written)!), /opens on Dance/);
  // The check lists the hand written word where the activity is; the control, a word the family names, lists nothing.
  const listed = recipe.check(written).filter((one) => one.place.kind === 'activity');
  assert.deepEqual(listed.map((one) => [one.code, one.place]), [['not-on-this-model', { kind: 'activity', activity: 'a1' }]]);
  json.activities[0].opensOn = words[0];
  assert.deepEqual(recipe.check(recipe.open(json)), []);
  // The One's family names no screens yet, so no word is judged there: not built, R91, rather than refused.
  assert.throws(() => recipe.setActivity(oneTest(), 'a1', { opensOn: 'Gesturepad' }),
    notBuilt('recipe.setActivity for the screen a Harmony One\'s activity opens on', 91));
  // A model without a screen opens an activity on none: not on this model, whatever the word.
  const tv = fetched(oneTest(), 'LG TV');
  let none = recipe.addDevice(recipe.create({ name: 'Harmony 300' }), { name: 'Television', device: tv }).document;
  none = recipe.addActivity(none, { name: 'Watch', type: 'WatchTV', devices: [{ device: 'd1', roles: ['Display'] }] }).document;
  assert.deepEqual(refused(() => recipe.setActivity(none, 'a1', { opensOn: 'Commands' })), ['not-on-this-model', { kind: 'activity', activity: 'a1' }]);
});

test('a device key is the Harmony 300\'s and 350\'s alone: not on this model on the One at the change and in the check, taken on the 350', () => {
  const one = oneTest();
  assert.deepEqual(refused(() => recipe.setDevice(one, 'd1', { deviceKey: { place: 0 } })), ['not-on-this-model', { kind: 'device', device: 'd1' }]);
  // Given back is always taken, so a document holding one can be put right.
  assert.equal(refused(() => recipe.setDevice(one, 'd1', { deviceKey: 'none' })), undefined);
  const json = copy(one) as Json;
  json.devices[0].key = { place: 0 };
  const said = recipe.check(recipe.open(json)).filter((p) => p.place.kind === 'device' && p.code === 'not-on-this-model');
  assert.deepEqual(said.map((p) => p.place), [{ kind: 'device', device: 'd1' }]);
  assert.match(said[0]!.message, /a Harmony One has no device keys/);
  // The control: the 350 takes one, and its check lists nothing for it.
  const tv = fetched(one, 'LG TV');
  const keyed = recipe.setDevice(recipe.addDevice(recipe.create({ name: 'Harmony 350' }), { name: 'Television', device: tv }).document, 'd1', { deviceKey: { place: 2 } }).document;
  assert.deepEqual(keyed.devices[0]!.key, { place: 2 });
  assert.deepEqual(recipe.check(keyed).filter((p) => p.place.kind === 'device' && p.code === 'not-on-this-model'), []);
});

test('a document of the Harmony 525 or 515, which no family serves, answers not built from every call that needs the family, the same kind each time, and a rename is still taken', () => {
  const json = copy(oneTest()) as Json;
  for (const name of ['Harmony 525', 'Harmony 515']) {
    json.model = { name };
    const document = recipe.open(json);
    const tv = fetched(document, 'LG TV');
    const calls: [string, number, () => unknown][] = [
      ['recipe.setKey', 76, () => recipe.setKey(document, { owner: { activity: 'a1' }, key: 'Info' }, { nothing: true })],
      ['recipe.setScreen', 76, () => recipe.setScreen(document, { activity: 'a1' }, [])],
      ['recipe.addDevice', 76, () => recipe.addDevice(document, { name: 'Second', device: tv })],
      ['recipe.addActivity', 76, () => recipe.addActivity(document, { name: 'Again', type: 'Custom', devices: [] })],
      ['recipe.keyNames', 77, () => recipe.keyNames(document)],
      ['recipe.key', 77, () => recipe.key(document, { owner: { activity: 'a1' }, key: 'Info' })],
      ['recipe.check', 78, () => recipe.check(document)],
    ];
    for (const [contract, requirement, call] of calls) assert.throws(call, notBuilt(`${contract} for the ${name}`, requirement), `${contract} on the ${name}`);
    // The control: a change that needs no family is taken.
    assert.equal(recipe.setDevice(document, 'd1', { name: 'Screen' }).document.devices[0]!.name, 'Screen', name);
  }
  // A model no bench model is named so names no remote, and is refused with the registry's sentence instead.
  json.model = { name: 'Harmony 9999' };
  assert.throws(() => recipe.check(recipe.open(json)), (error: unknown) => error instanceof RecipeError && !(error instanceof NotBuiltError) && /no model is called/.test(error.message));
});

test('removing the activity that holds the favourite channels reports that none holds them now, as uses lists it; another activity reports nothing', () => {
  for (const [model, make] of BOTH) {
    const document = recipe.setActivity(make(), 'a1', { favourites: true }).document;
    const places = recipe.uses(document, { activity: 'a1' });
    assert.deepEqual(places, [{ kind: 'document' }], model);
    const change = kept(document, () => recipe.remove(document, { activity: 'a1' }));
    assert.deepEqual(change.effects.map((one) => [one.place, one.effect]), [[{ kind: 'document' }, 'changed']], model);
    assert.match(change.effects[0]!.message, /held the favourite channels, and no activity holds them now/);
    // The control: an activity not holding them is used by nothing and goes with no effect.
    assert.deepEqual(recipe.uses(document, { activity: 'a2' }), [], model);
    assert.deepEqual(recipe.remove(document, { activity: 'a2' }).effects, [], model);
  }
});

test('a key word another model has and this one lacks is not on this model, and a word no model has is unknown, at the change and in the check', () => {
  const one = oneTest();
  const at = (key: string): Place => ({ kind: 'key', owner: { activity: 'a1' }, key });
  assert.deepEqual(refused(() => recipe.setKey(one, { owner: { activity: 'a1' }, key: 'SwipeUp' }, { nothing: true })), ['not-on-this-model', at('SwipeUp')]);
  assert.deepEqual(refused(() => recipe.setKey(one, { owner: { activity: 'a1' }, key: 'Teleport' }, { nothing: true })), ['unknown', at('Teleport')]);
  // The control: a word the One has is taken.
  assert.equal(refused(() => recipe.setKey(one, { owner: { activity: 'a1' }, key: 'Info' }, { nothing: true })), undefined);
  // And the other way round, a key the One has and the Touch lacks.
  const touch = touchTest();
  const missing = recipe.keyNames(one).map((p) => p.key).find((word) => !recipe.keyNames(touch).some((p) => p.key === word))!;
  assert.deepEqual(refused(() => recipe.setKey(touch, { owner: { activity: 'a1' }, key: missing }, { nothing: true })), ['not-on-this-model', at(missing)]);
});

test('what a caller passes is held to its shape: null, a list or a non boolean is refused as invalid rather than thrown as a TypeError', () => {
  for (const [model, make] of SEQUENCED) {
    const document = make();
    const whole = { kind: 'document' };
    assert.deepEqual(refused(() => recipe.setDevice(document, 'd1', null as never)), ['invalid', { kind: 'device', device: 'd1' }], model);
    assert.deepEqual(refused(() => recipe.setActivity(document, 'a1', [] as never)), ['invalid', { kind: 'activity', activity: 'a1' }], model);
    assert.deepEqual(refused(() => recipe.setSequence(document, recipe.sequences(document)[0]!.id, 'x' as never)), ['invalid', { kind: 'sequence', sequence: recipe.sequences(document)[0]!.id }], model);
    assert.deepEqual(refused(() => recipe.addDevice(document, null as never)), ['invalid', whole], model);
    assert.deepEqual(refused(() => recipe.addActivity(document, 7 as never)), ['invalid', whole], model);
    assert.deepEqual(refused(() => recipe.addSequence(document, 'a1', null as never)), ['invalid', { kind: 'activity', activity: 'a1' }], model);
    assert.deepEqual(refused(() => recipe.setKey(document, null as never, { nothing: true })), ['invalid', whole], model);
    assert.deepEqual(refused(() => recipe.setScreen(document, null as never, [])), ['invalid', whole], model);
    assert.deepEqual(refused(() => recipe.remove(document, null as never)), ['invalid', whole], model);
    assert.deepEqual(refused(() => recipe.uses(document, 'd1' as never)), ['invalid', whole], model);
    assert.deepEqual(refused(() => recipe.move(document, null as never, 0)), ['invalid', whole], model);
    assert.deepEqual(refused(() => recipe.keys(document, null as never)), ['invalid', whole], model);
    // An owner naming both a device and an activity, and one naming neither.
    assert.deepEqual(refused(() => recipe.setKey(document, { owner: { device: 'd1', activity: 'a1' } as never, key: 'Info' }, { nothing: true })), ['invalid', whole], model);
    assert.deepEqual(refused(() => recipe.screen(document, {} as never)), ['invalid', whole], model);
    // Kept on between activities is true or false, nothing else.
    assert.deepEqual(refused(() => recipe.setDevice(document, 'd1', { keptOnBetweenActivities: 'yes' as never })), ['invalid', { kind: 'device', device: 'd1' }], model);
    // The control: the same calls with what they take are taken.
    assert.equal(refused(() => recipe.setDevice(document, 'd1', { keptOnBetweenActivities: true })), undefined, model);
    assert.equal(refused(() => recipe.setKey(document, { owner: { activity: 'a1' }, key: 'Info' }, { nothing: true })), undefined, model);
  }
});

test('a refusal the reader gives names the sequence by its name and says what an empty list means, never a position or the file\'s phrase', () => {
  for (const [model, make] of SEQUENCED) {
    const document = make();
    const [sequence] = recipe.sequences(document);
    let said = '';
    try {
      recipe.setSequence(document, sequence!.id, { steps: [] });
    } catch (error) {
      said = error instanceof Error ? error.message : '';
    }
    assert.match(said, new RegExp(`sequence ${sequence!.name}'s steps is empty, and a document states a list only where it holds something$`), model);
    assert.doesNotMatch(said, /sequence [0-9]|said by leaving it out/, model);
  }
});
