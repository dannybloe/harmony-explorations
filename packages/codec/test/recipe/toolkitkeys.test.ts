/**
 * **The document toolkit's questions about keys and screens**, R77 and decision 43: `keys`, `key` and `screen` answer,
 * before anything is built, what every place of an owner's map does, whether that is the default or a person's choice,
 * which device's command it sends and the settings it is sent with, each marked default or the person's, from the same
 * derivation the build uses, `resolveMaps` over the model's family's maps.
 *
 * **What is claimed, on the two kinds of family, with nothing attached and no archive**:
 *
 * * **The Harmony One**, on the references' test setup `one-test`, seven devices and five activities: every owner
 *   answers its 37 places, with the exact counts of bound and unbound below; a key changed through `setKey` answers the
 *   person's choice and every other key as before, and given back it answers as before whole.
 * * **The Harmony Touch**, on the old bench document `touch-test` converted to the one shape by
 *   `describeTouchDocument`: a device answers 38 places and 64 presses, an activity 43 and 79, with the exact counts
 *   below; the keys the converted document states, five on devices and seven on activities, answer the person's
 *   choice and every other press the default, closed against the document's own list of choices; a gesture answers its
 *   three presses, and a held press stands beside the short one.
 * * **The sending**: a device whose timing the document states, the Denon and the KPN of the converted Touch
 *   document, answers each stated member as the person's with its value and every other as the catalogue's, the
 *   catalogue's value read here from the carried record's own JSON rather than through the reader the toolkit uses;
 *   and a command a document tunes answers its tuning beside the device's settings, as the person's.
 * * **The same derivation as the build**, held two ways that cover different ground. **The behavioural comparison
 *   holds the answers**: every press and screen entry of every owner on both references, its action, label, order and
 *   mark, is the one `resolveMaps` answers. **The guard on the source holds only imports and calls**: of everything
 *   under `families/` the toolkit imports `binds`, `resolveMaps`, the registry's lookups and the capabilities and
 *   nothing else, and it calls none of the maps' members `deviceMap`, `activityMap` and `commands` itself. An ordering,
 *   a label or a fallback written inline in the toolkit would pass the guard; it is the comparison that would see it,
 *   on the two references. That the One's resolved maps are what its build binds is
 *   `test/families/harmony-one/onerecipemaps.test.ts`'s, and is not repeated here.
 * * **Not built**, by name with R77, for every model whose family has no maps, and for a document still carrying the
 *   Touch's own block, naming the converter; and stopped with `commands`'s error for a device carrying no definition
 *   when no archive is given, and answered as before when an archive serves it.
 * * **The check** lists a key choice naming no place of the model, a place no map of that owner binds, and a press the
 *   place does not have, from the same places, each with the code `setKey`'s refusal of that place carries: a key only
 *   the other kind of owner binds is not on this model, a key the remote binds itself unknown.
 * * **What an answer says, and what it leaves alone**: the questions answer the document, so on a Harmony One a stated
 *   timing and a command's tuning answer as the person's while `check` lists each as not built for the model; a choice
 *   equal to the default is the person's; a key choice naming a device the document does not hold stops that owner's
 *   keys and that key, and nothing else; a device's key changed in device mode changes no activity's answer; the wait
 *   after power on is left out where neither the catalogue nor the document states one; and every answer is an object
 *   of the caller's own, sharing nothing with another answer or the document.
 *
 * **What is left out of an answer and why** is on the types in `recipe/toolkit.ts`: whether a key repeats while held,
 * which is the command's code and decided by a build; a command's untuned sending, which only a build makes; and four
 * of the catalogue's nine timing members, which no build sends by or whose meaning is not read.
 *
 * **The controls**: each group's comparison is run once on an answer or a document broken on purpose and has to see
 * the break, so a comparison that cannot fail does not pass here.
 *
 * **No proof of R77 is recorded here**: R77 is a requirement of the FHSDK as a whole, one status for every model, which
 * a proof can only make met for every model at once, and on the models whose families have no maps the questions
 * answer not built. Its written status says so.
 *
 * Scope: the Harmony One, skin 54, and the Harmony Touch, the two models whose families state their maps. No remote.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { NotBuiltError, recipe, RecipeError } from '../../src/index.ts';
// The converter's route draws our background picture, which needs the codec's deflate.
import '../../src/support/resources.node.ts';
import type { CatalogueSource } from '../../src/catalogue/catalogue.ts';
import { carriedCatalogue } from '../../src/catalogue/carried.ts';
import { resolveMaps, type ResolvedKey, type MapScreenEntry } from '../../src/families/maps.ts';
import { mapsOfModel } from '../../src/families/registry.ts';
import { readEarlierTouchSetupFile as readTouchSetupFile } from '../../src/families/harmony-touch/earlierform.ts';
import { describeTouchDocument } from '../../src/families/harmony-touch/recipemaps.ts';
import type { Recipe } from '../../src/recipe/recipe.ts';
import type { KeyAnswer, Owner, PressAnswer, ScreenAnswer } from '../../src/recipe/toolkit.ts';

type Json = any;
const REFERENCES = new URL('../references/', import.meta.url);
const TOOLKIT = new URL('../../src/recipe/toolkit.ts', import.meta.url);
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** The Harmony One's test setup, opened, so every device and activity has its id. */
const oneTest = (): Recipe => recipe.open(JSON.parse(readFileSync(new URL('one-test.json', REFERENCES), 'utf8')));

/** The bench Touch's old document converted to the one shape, opened: the definitions it carries are its catalogue. */
const touchTest = (): Recipe => {
  const file = readTouchSetupFile(JSON.parse(readFileSync(new URL('../families/harmony-touch/touch-test-earlier-form.json', import.meta.url), 'utf8')));
  const { touch: _touch, ...plain } = file;
  return recipe.open(describeTouchDocument(file, carriedCatalogue(plain)!));
};

/** Every owner of a document, devices first, as the questions address them. */
const ownersOf = (document: Recipe): { owner: Owner; name: string }[] => [
  ...document.devices.map((one) => ({ owner: { device: one.id! } as Owner, name: one.name })),
  ...document.activities.map((one) => ({ owner: { activity: one.id! } as Owner, name: one.name })),
];

/** One owner's answer as counts: places, presses, bound presses, unbound, and the person's. */
const countsOf = (answers: readonly KeyAnswer[]): [number, number, number, number, number] => {
  const presses = answers.flatMap((one) => one.presses);
  const bound = presses.filter((one) => !('nothing' in one.action)).length;
  return [answers.length, presses.length, bound, presses.length - bound, presses.filter((one) => !one.isDefault).length];
};

/** An action as a question answers it, as text, so two can be compared: a device's command by id, a sequence, or nothing. */
const actionText = (action: PressAnswer['action']): string =>
  ('nothing' in action ? 'nothing' : 'sequence' in action ? `sequence ${action.sequence}` : `${action.device}.${action.command}`);

/** Every press of an owner's answer by `key/press`, as text: the action, the label and whether it is the default. */
const pressesOf = (answers: readonly KeyAnswer[]): Map<string, string> => new Map(answers.flatMap((one) => one.presses.map((p) =>
  [`${one.key}/${p.press}`, `${actionText(p.action)} ${p.label ?? '-'} ${p.isDefault ? 'default' : 'chosen'}`] as const)));

/** The differences between two maps of the same keys, as one line each; empty where they agree. */
const differences = (a: ReadonlyMap<string, string>, b: ReadonlyMap<string, string>): string[] =>
  [...new Set([...a.keys(), ...b.keys()])].filter((at) => a.get(at) !== b.get(at)).map((at) => `${at}: ${a.get(at)} against ${b.get(at)}`);

// ---------------------------------------------------------------------------------------------------
// The Harmony One
// ---------------------------------------------------------------------------------------------------

test('on the Harmony One test setup every owner answers its 37 places, each a short press, with these exact counts of bound and unbound', () => {
  const document = oneTest();
  const measured = ownersOf(document).map(({ name, owner }) => [name, ...countsOf(recipe.keys(document, owner))]);
  // Each row: the owner, places, presses, bound, unbound, the person's. Nobody chose a key in this setup.
  assert.deepEqual(measured, [
    ['LG TV', 37, 37, 32, 5, 0], ['Plasma', 37, 37, 33, 4, 0], ['Denon', 37, 37, 30, 7, 0], ['KPN', 37, 37, 29, 8, 0],
    ['Kodi', 37, 37, 32, 5, 0], ['Switch', 37, 37, 3, 34, 0], ['Sony HT', 37, 37, 34, 3, 0],
    ['TV kijken', 37, 37, 33, 4, 0], ['Film kijken', 37, 37, 34, 3, 0], ['Muziek', 37, 37, 34, 3, 0],
    ['Kodi kijken', 37, 37, 34, 3, 0], ['Plasma kijken', 37, 37, 33, 4, 0],
  ]);
  // The places are the model's, in its order: the 37 that `keyNames` says a map binds, and none of the seven it says no
  // map binds.
  const bindable = recipe.keyNames(document).filter((one) => one.boundBy === 'both').map((one) => one.key);
  for (const { owner } of ownersOf(document)) assert.deepEqual(recipe.keys(document, owner).map((one) => one.key), bindable);
  // A key no map binds is answered alone with no press and why; a word that is another model's key, the Touch's
  // gesture, is not on this model, and a word no model has is unknown.
  const off = recipe.key(document, { owner: { device: 'd1' }, key: 'Off' });
  assert.deepEqual([off.presses, off.surface, typeof off.why], [[], 'keypad', 'string']);
  assert.throws(() => recipe.key(document, { owner: { device: 'd1' }, key: 'SwipeUp' }),
    (error: unknown) => error instanceof recipe.ChangeRefused && error.reason === 'not-on-this-model');
  assert.throws(() => recipe.key(document, { owner: { device: 'd1' }, key: 'Teleport' }),
    (error: unknown) => error instanceof recipe.ChangeRefused && error.reason === 'unknown');
  // A held press asked for answers none, since a Harmony One has no long press.
  const held = recipe.key(document, { owner: { device: 'd1' }, key: 'VolumeUp', press: 'held' });
  assert.deepEqual(held.presses, []);
  assert.match(held.why!, /not on this model/);
});

test('on the Harmony One a key set by setKey answers the person\'s choice and every other key as before, and set back to default answers as before', () => {
  const document = oneTest();
  const owner: Owner = { activity: 'a1' };
  const before = pressesOf(recipe.keys(document, owner));
  // The Plasma's Aspect on the activity's Info key, where the rule gives it the KPN's.
  assert.equal(before.get('Info/short'), 'd4.Info - default');
  const changed = recipe.setKey(document, { owner, key: 'Info' }, { device: 'd2', command: 'Aspect' }).document;
  const after = recipe.keys(changed, owner);
  const info = after.find((one) => one.key === 'Info')!.presses[0]!;
  assert.deepEqual([info.action, info.isDefault], [{ device: 'd2', command: 'Aspect' }, false]);
  // The one difference is that key; nothing else of this owner moved, and no other owner's answer either.
  assert.deepEqual(differences(before, pressesOf(after)), ['Info/short: d4.Info - default against d2.Aspect - chosen']);
  for (const { owner: other } of ownersOf(document).filter((one) => !('activity' in one.owner && one.owner.activity === 'a1'))) {
    assert.deepEqual(recipe.keys(changed, other), recipe.keys(document, other));
  }
  // Given back to the default, the answer is the one before, whole.
  const back = recipe.setKey(changed, { owner, key: 'Info' }, 'default').document;
  assert.deepEqual(recipe.keys(back, owner), recipe.keys(document, owner));
  // The answer names the device by its id and says how its command is sent: the Plasma's settings, all the catalogue's.
  assert.ok('sending' in info);
  assert.ok(Object.values(info.sending.settings).every((one) => one.isDefault));
});

test('the control: the comparison of a key\'s answers sees a press whose action or mark differs', () => {
  const answers = recipe.keys(oneTest(), { activity: 'a1' });
  const broken = copy(answers);
  (broken[0]!.presses[0] as { isDefault: boolean }).isDefault = false;
  assert.equal(differences(pressesOf(answers), pressesOf(broken)).length, 1);
  (broken[1]!.presses[0] as { action: unknown }).action = { nothing: true };
  assert.equal(differences(pressesOf(answers), pressesOf(broken)).length, 2);
});

test('on the Harmony One an activity\'s screen answers its stated entries in order, each the person\'s, a sequence of version 1 by its name, and a device\'s the family\'s', () => {
  const document = oneTest();
  const plasmaKijken = recipe.screen(document, { activity: 'a5' });
  assert.deepEqual(plasmaKijken, {
    owner: { activity: 'a5' }, isDefault: false, items: [
      { device: 'd4', command: 'Teletext', isDefault: false }, { device: 'd4', command: 'DVR', isDefault: false },
      { device: 'd2', command: 'Aspect', isDefault: false }, { sequence: 'Radio', isDefault: false },
    ],
  });
  const tv = recipe.screen(document, { device: 'd1' });
  assert.equal(tv.isDefault, true);
  assert.equal(tv.items.length, 32);
  assert.ok(tv.items.every((one) => one.isDefault && 'device' in one && one.device === 'd1'));
});

// ---------------------------------------------------------------------------------------------------
// The Harmony Touch
// ---------------------------------------------------------------------------------------------------

test('on the converted Touch document a device answers 38 places and an activity 43, with these exact counts', () => {
  const document = touchTest();
  const measured = ownersOf(document).map(({ name, owner }) => [name, ...countsOf(recipe.keys(document, owner))]);
  // Each row: the owner, places, presses, bound, unbound, the person's. A device's places are the 26 keys, a short and
  // a held press each, and the 12 of the number pad, a short press each; an activity's add the five gestures, three
  // presses each.
  assert.deepEqual(measured, [
    ['LG TV', 38, 64, 38, 26, 1], ['Denon AV Receiver', 38, 64, 33, 31, 3], ['Blu-ray', 38, 64, 24, 40, 0],
    ['Plex', 38, 64, 39, 25, 0], ['KPN', 38, 64, 36, 28, 0], ['Xbox', 38, 64, 40, 24, 1], ['Switch', 38, 64, 3, 61, 0],
    ['Watch TV', 43, 79, 45, 34, 1], ['Watch a Blu-ray', 43, 79, 39, 40, 4], ['Listen to Music', 43, 79, 48, 31, 0],
    ['Switch Box', 43, 79, 38, 41, 1], ['Play a Game', 43, 79, 49, 30, 1],
  ]);
});

/** The presses a document's own list of choices states for an owner, by `key/press`, as a question's text marks them. */
const statedOf = (document: Recipe, owner: Owner): Map<string, string> => {
  const ids = new Map(document.devices.map((one) => [one.name, one.id!]));
  const keys = 'device' in owner ? document.devices.find((one) => one.id === owner.device)!.keys
    : document.activities.find((one) => one.id === owner.activity)!.keys;
  return new Map((keys ?? []).map((one) => {
    const action = one.action;
    const text = 'nothing' in action ? 'nothing' : 'sequence' in action ? `sequence ${action.sequence}` : `${ids.get(action.device)}.${action.command}`;
    return [`${one.key}/${one.press ?? 'short'}`, text] as const;
  }));
};

/** The presses an answer marks as the person's, by `key/press`, with the action as text. */
const chosenOf = (answers: readonly KeyAnswer[]): Map<string, string> => new Map(answers.flatMap((one) => one.presses
  .filter((p) => !p.isDefault).map((p) => [`${one.key}/${p.press}`, actionText(p.action)] as const)));

test('on the converted Touch document the presses the document states answer the person\'s choice and every other the default', () => {
  const document = touchTest();
  let stated = 0;
  for (const { owner } of ownersOf(document)) {
    const own = statedOf(document, owner);
    stated += own.size;
    // Closed against the document's own list: the person's presses are exactly the stated ones, with their actions.
    assert.deepEqual(differences(chosenOf(recipe.keys(document, owner)), own), []);
  }
  // Five on the devices and seven on the activities, the converter's own count.
  assert.equal(stated, 12);
});

test('the control: a stated press answered as the default, or a default as stated, is seen by the closure', () => {
  const document = touchTest();
  const owner: Owner = { activity: 'a2' };
  const answers = copy(recipe.keys(document, owner));
  const guide = answers.find((one) => one.key === 'Guide')!.presses[0] as { isDefault: boolean };
  guide.isDefault = true;
  assert.deepEqual(differences(chosenOf(answers), statedOf(document, owner)), ['Guide/short: undefined against d3.TopMenu']);
  guide.isDefault = false;
  (answers.find((one) => one.key === 'Red')!.presses[0] as { isDefault: boolean }).isDefault = false;
  assert.equal(differences(chosenOf(answers), statedOf(document, owner)).length, 1);
});

test('on the Touch a gesture answers its three presses, and a held press stands beside the short one, each with its own mark', () => {
  const document = touchTest();
  const swipe = recipe.key(document, { owner: { activity: 'a1' }, key: 'SwipeUp' });
  assert.equal(swipe.surface, 'gesture');
  assert.deepEqual(swipe.presses.map((one) => [one.press, actionText(one.action), one.isDefault]),
    [['short', 'd2.VolumeUp', true], ['held', 'nothing', true], ['double', 'nothing', true]]);
  // Watch TV's Menu: the LG TV's Home held, the person's, beside the short press the family gives.
  const menu = recipe.key(document, { owner: { activity: 'a1' }, key: 'Menu' });
  assert.deepEqual(menu.presses.map((one) => [one.press, one.isDefault]), [['short', true], ['held', false]]);
  assert.equal(actionText(menu.presses[1]!.action), 'd1.Home');
  // A gesture is no place of a device's own map: answered alone, with no press and why.
  const onDevice = recipe.key(document, { owner: { device: 'd1' }, key: 'SwipeUp' });
  assert.deepEqual(onDevice.presses, []);
  assert.match(onDevice.why!, /only an activity's map binds this key/);
  // A press running a sequence answers its steps, by the devices' ids.
  const yellow = recipe.key(document, { owner: { activity: 'a2' }, key: 'Yellow' }).presses[0]!;
  assert.ok('sequence' in yellow);
  assert.deepEqual(yellow.sequence, { id: 's1', name: 'Test Sequence', steps: [{ device: 'd3', command: 'Stop' }, { pause: 10 }, { device: 'd3', command: 'TopMenu' }] });
});

test('the control: with the activity\'s choices taken out, the held press answers the default and differs', () => {
  const json = copy(touchTest()) as Json;
  delete json.activities[0].keys;
  const menu = recipe.key(recipe.open(json), { owner: { activity: 'a1' }, key: 'Menu' });
  assert.deepEqual(menu.presses.map((one) => one.isDefault), [true, true]);
  assert.notEqual(actionText(menu.presses[1]!.action), 'd1.Home');
});

// ---------------------------------------------------------------------------------------------------
// The sending
// ---------------------------------------------------------------------------------------------------

/** The settings a press answers, as `[member, value, isDefault]` rows. */
const settingRows = (press: PressAnswer): [string, number, boolean][] => {
  assert.ok('sending' in press);
  return Object.entries(press.sending.settings).map(([member, one]) => [member, one!.value, one!.isDefault]);
};

/** A device's catalogue timing as its carried record's JSON states it, read without the reader the toolkit uses. */
const recordTiming = (document: Recipe, device: string): Json => (document.devices.find((one) => one.id === device)!.definition!.record as Json).timing;

test('a device whose timing the document states answers each stated member as the person\'s and every other as the catalogue\'s, with the values', () => {
  const document = touchTest();
  // The Denon states four members; its press count is the catalogue's.
  const denon = recordTiming(document, 'd2');
  const volume = recipe.key(document, { owner: { activity: 'a1' }, key: 'VolumeUp' }).presses[0]!;
  assert.equal(actionText(volume.action), 'd2.VolumeUp');
  assert.deepEqual(settingRows(volume), [
    ['pressMinRepeats', denon.pressMinRepeats, true], ['interKeyDelay', 300, false], ['interDeviceDelay', 700, false],
    ['powerOnDelay', 3500, false], ['inputDelay', 1500, false],
  ]);
  // The KPN states its delay between keys alone.
  const kpn = recordTiming(document, 'd5');
  const channel = recipe.keys(document, { device: 'd5' }).flatMap((one) => one.presses).find((one) => 'sending' in one)!;
  assert.deepEqual(settingRows(channel), [
    ['pressMinRepeats', kpn.pressMinRepeats, true], ['interKeyDelay', 400, false], ['interDeviceDelay', kpn.interDeviceDelay, true],
    ...(kpn.powerOnDelay === undefined ? [] : [['powerOnDelay', kpn.powerOnDelay, true] as [string, number, boolean]]),
    ['inputDelay', kpn.inputDelay, true],
  ]);
  // The device's settings are the same at every key that sends its commands, one home per fact.
  const sendings = recipe.keys(document, { device: 'd2' }).flatMap((one) => one.presses).filter((one) => 'sending' in one);
  // Every one of the 33 presses the Denon's own map binds sends one of its commands, the count of the table above.
  assert.equal(sendings.length, 33);
  for (const one of sendings) assert.deepEqual(settingRows(one), settingRows(volume));
});

test('the control: the Denon\'s timing taken out of the document answers the catalogue\'s values, each the default', () => {
  const json = copy(touchTest()) as Json;
  delete json.devices[1].timing;
  const document = recipe.open(json);
  const denon = recordTiming(document, 'd2');
  const volume = recipe.key(document, { owner: { activity: 'a1' }, key: 'VolumeUp' }).presses[0]!;
  assert.deepEqual(settingRows(volume), [
    ['pressMinRepeats', denon.pressMinRepeats, true], ['interKeyDelay', denon.interKeyDelay, true], ['interDeviceDelay', denon.interDeviceDelay, true],
    ['powerOnDelay', denon.powerOnDelay, true], ['inputDelay', denon.inputDelay, true],
  ]);
  // And the stated values were not the catalogue's, so the first answer could not have come from the catalogue.
  assert.notEqual(denon.interKeyDelay, 300);
});

test('a command the document tunes answers its tuning beside the device\'s settings, as the person\'s, and an untuned one answers none', () => {
  const json = copy(oneTest()) as Json;
  json.devices[0].commands = { VolumeUp: { sending: { copies: 2, leadInMs: 40 } } };
  const document = recipe.open(json);
  const press = recipe.key(document, { owner: { device: 'd1' }, key: 'VolumeUp' }).presses[0]!;
  assert.equal(actionText(press.action), 'd1.VolumeUp');
  assert.ok('sending' in press);
  assert.deepEqual(press.sending.command, { copies: { value: 2, isDefault: false }, leadInMs: { value: 40, isDefault: false } });
  // The control: another command of the same device, and the same command in the document without the tuning.
  const down = recipe.key(document, { owner: { device: 'd1' }, key: 'VolumeDown' }).presses[0]!;
  assert.ok('sending' in down && down.sending.command === undefined);
  const plain = recipe.key(oneTest(), { owner: { device: 'd1' }, key: 'VolumeUp' }).presses[0]!;
  assert.ok('sending' in plain && plain.sending.command === undefined);
});

// ---------------------------------------------------------------------------------------------------
// The same derivation as the build
// ---------------------------------------------------------------------------------------------------

/** What `resolveMaps` gives an owner's keys, by `key/press`, in the text `pressesOf` writes, device names turned to ids. */
const resolvedPresses = (document: Recipe, keys: readonly ResolvedKey[]): Map<string, string> => {
  const ids = new Map(document.devices.map((one) => [one.name, one.id!]));
  return new Map(keys.map((one) => {
    const action = one.action;
    const text = 'nothing' in action ? 'nothing' : 'sequence' in action ? `sequence ${action.sequence}` : `${ids.get(action.device)}.${action.command}`;
    return [`${one.key}/${one.press}`, `${text} ${one.label ?? '-'} ${one.isDefault ? 'default' : 'chosen'}`] as const;
  }));
};

/** A screen entry as text, a device by its id, so a question's entry and a resolved one can be compared. */
const entryText = (document: Recipe, entry: MapScreenEntry | ScreenAnswer['items'][number]): string => {
  if ('client' in entry) return `client ${entry.client} ${entry.label}`;
  if ('sequence' in entry) return `sequence ${entry.sequence} ${entry.label ?? '-'}`;
  const device = document.devices.find((one) => one.name === entry.device)?.id ?? entry.device;
  return `${device}.${entry.command} ${entry.label ?? '-'}`;
};

test('every press and screen entry of every owner on both references is the one resolveMaps answers over the model\'s maps', () => {
  for (const document of [oneTest(), touchTest()]) {
    const { skin, maps } = mapsOfModel(document.model)!;
    const resolved = resolveMaps(maps, skin, document, carriedCatalogue(document)!);
    const owners = [...resolved.devices, ...resolved.activities];
    ownersOf(document).forEach(({ owner }, k) => {
      assert.deepEqual(differences(pressesOf(recipe.keys(document, owner)), resolvedPresses(document, owners[k]!.keys)), []);
      const screen = recipe.screen(document, owner);
      assert.deepEqual(screen.items.map((one) => entryText(document, one)), owners[k]!.screen.items.map((one) => entryText(document, one)));
      assert.ok(screen.items.every((one) => one.isDefault === owners[k]!.screen.isDefault));
      assert.equal(screen.isDefault, owners[k]!.screen.isDefault);
    });
  }
});

test('the control: a resolved key changed in one place is seen as one difference, on that key', () => {
  const document = oneTest();
  const { skin, maps } = mapsOfModel(document.model)!;
  const keys = resolveMaps(maps, skin, document, carriedCatalogue(document)!).activities[0]!.keys;
  const broken = keys.map((one) => (one.key === 'VolumeUp' ? { ...one, action: { device: 'LG TV', command: 'Dance' } } : one));
  const found = differences(pressesOf(recipe.keys(document, { activity: 'a1' })), resolvedPresses(document, broken));
  assert.equal(found.length, 1);
  assert.match(found[0]!, /^VolumeUp\/short: .* against d1\.Dance /);
});

/**
 * The names a source imports as values, by module, read off the source: what it can call. A map derived anywhere but
 * `resolveMaps` would need a family's rule, a family's maps member or a layout, and the first of those shows here.
 */
function valueImports(source: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const match of source.matchAll(/^import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)';/gms)) {
    if (match[1] !== undefined) continue;
    const names = match[2]!.split(',').map((one) => one.trim()).filter((one) => one !== '' && !one.startsWith('type '));
    out.set(match[3]!, names);
  }
  return out;
}

/** The value imports the toolkit may take from `families/` and from the composers, by module, each a name it calls. */
const ALLOWED_IMPORTS: readonly [string, readonly string[]][] = [
  ['../families/capabilities.ts', ['capabilitiesOf']],
  ['../families/maps.ts', ['binds', 'resolveMaps']],
  ['../families/registry.ts', ['chooseByModel', 'mapsOfModel', 'NoFamilyError']],
  // Of the composers, a constant list of jobs and the reading of which protocol a code names.
  ['../compose/activityroles.ts', ['ACTIVITY_ROLE_NAMES']],
  ['../compose/cataloguecodes.ts', ['catalogueProtocol']],
];

/**
 * **The guard**: what is wrong with a source as the toolkit's, one line each, empty where nothing is. It reads the
 * imports and the calls and nothing else: an import from `families/` or the composers beyond `ALLOWED_IMPORTS`, a call
 * of a family's maps member `deviceMap`, `activityMap` or `commands` that only `resolveMaps` should make, and the
 * call of `resolveMaps` the questions answer through missing.
 */
function guardFaults(source: string): string[] {
  const faults: string[] = [];
  const allowed = new Map(ALLOWED_IMPORTS.map(([from, names]) => [from, new Set(names)]));
  for (const [from, names] of valueImports(source)) {
    if (!from.startsWith('../families/') && !from.startsWith('../compose/')) continue;
    for (const name of names) {
      if (allowed.get(from)?.has(name) !== true) faults.push(`imports ${name} from ${from}`);
    }
  }
  for (const call of source.matchAll(/\.(deviceMap|activityMap)\(|\bmaps\.commands\(/g)) faults.push(`calls ${call[0]}`);
  if (!/resolveMaps\(maps, skin, document, catalogue\)/.test(source)) faults.push('does not call resolveMaps over the model\'s maps');
  return faults;
}

test('the guard on the toolkit\'s source: it imports only the allowed names from the families and the composers, calls no maps member itself, and calls resolveMaps', () => {
  const source = readFileSync(TOOLKIT, 'utf8');
  assert.deepEqual(guardFaults(source), []);
  // Every allowed import is one the toolkit makes, so the list says what it takes and not what it might.
  const imports = valueImports(source);
  for (const [from, names] of ALLOWED_IMPORTS) assert.deepEqual(imports.get(from), names, from);
});

test('the control: the guard fails on the toolkit\'s source with a family\'s rule imported, a maps member called, or resolveMaps not called', () => {
  const source = readFileSync(TOOLKIT, 'utf8');
  const importing = `import { defaultDeviceKeys } from '../families/harmony-touch/defaultmaps.ts';\n${source}`;
  assert.deepEqual(guardFaults(importing), ['imports defaultDeviceKeys from ../families/harmony-touch/defaultmaps.ts']);
  const widened = source.replace("binds, resolveMaps, type MapBinder", "binds, resolveMaps, MapDerivation, type MapBinder");
  assert.deepEqual(guardFaults(widened), ['imports MapDerivation from ../families/maps.ts']);
  const calling = `${source}\nconst map = found.maps.deviceMap(commands);\nconst list = maps.commands(device, catalogue);\n`;
  assert.deepEqual(guardFaults(calling), ['calls .deviceMap(', 'calls maps.commands(']);
  const unresolved = source.replace('resolveMaps(maps, skin, document, catalogue)', 'ownMaps(maps, skin, document, catalogue)');
  assert.deepEqual(guardFaults(unresolved), ['does not call resolveMaps over the model\'s maps']);
});

// ---------------------------------------------------------------------------------------------------
// What is not built, and what stops an answer
// ---------------------------------------------------------------------------------------------------

/** The least document of a model: one device carrying its definition, one activity using it. */
const leastOf = (model: string): Recipe => {
  const one = oneTest();
  return recipe.open({ model: { name: model }, devices: [one.devices[0]], activities: [{ name: 'Watch', type: 'WatchTV', devices: [{ device: 'LG TV', roles: ['Display'] }] }], protocols: one.protocols });
};

test('every model whose family has no maps answers each question not built, naming the model and R77', () => {
  const models = ['Harmony 600', 'Harmony 650', 'Harmony 700', 'Harmony 300', 'Harmony 350', 'Harmony 880', 'Harmony 885', 'Harmony 785'];
  for (const model of models) {
    const document = leastOf(model);
    for (const [name, call] of [
      ['keys', () => recipe.keys(document, { device: 'd1' })], ['key', () => recipe.key(document, { owner: { device: 'd1' }, key: 'VolumeUp' })],
      ['screen', () => recipe.screen(document, { activity: 'a1' })], ['keyNames', () => recipe.keyNames(document)],
    ] as const) {
      assert.throws(call, (error: unknown) => error instanceof NotBuiltError && error.requirement === 77 && error.contract === `recipe.${name} for the ${model}`, `${name} on the ${model}`);
    }
  }
  // The control: the same document for the two models whose families have maps answers.
  assert.equal(recipe.keys(leastOf('Harmony One'), { device: 'd1' }).length, 37);
  assert.equal(recipe.keys(leastOf('Harmony Touch'), { device: 'd1' }).length, 38);
});

test('a document still carrying the Touch\'s own block is refused on opening and names the converter; the converted one answers', () => {
  // The reader refuses the earlier form, decision 43, so no question is ever asked of one.
  const old = JSON.parse(readFileSync(new URL('../families/harmony-touch/touch-test-earlier-form.json', import.meta.url), 'utf8')) as Json;
  assert.throws(() => recipe.open(old), (error: unknown) => error instanceof RecipeError
    && /a Harmony Touch's own block, touch, the earlier form/.test(error.message) && /describeTouchDocument/.test(error.message));
  assert.equal(recipe.keys(touchTest(), { device: 'd1' }).length, 38);
  // The reference, which is the converter's output, answers the same.
  assert.equal(recipe.keys(recipe.open(JSON.parse(readFileSync(new URL('touch-test.json', REFERENCES), 'utf8'))), { device: 'd1' }).length, 38);
});

test('a device with no definition stops every answer with the error commands gives, and an archive serving it answers as before', () => {
  const json = copy(oneTest()) as Json;
  const definition = json.devices[3].definition;
  delete json.devices[3].definition;
  const bare = recipe.open(json);
  let said: string | undefined;
  try {
    recipe.commands(bare, 'd4');
  } catch (error) {
    said = (error as Error).message;
  }
  assert.equal(said, 'KPN carries no definition, so its commands are not in the document');
  // Every owner stops, the LG TV's own map too, which uses nothing of the KPN: `resolveMaps` answers all or nothing.
  for (const call of [() => recipe.keys(bare, { device: 'd1' }), () => recipe.screen(bare, { activity: 'a1' }), () => recipe.key(bare, { owner: { device: 'd4' }, key: 'Info' })]) {
    assert.throws(call, (error: unknown) => error instanceof RecipeError && error.message === said);
  }
  // An archive holding the KPN alone, served by the same reader a carried definition is, and the same answers as with
  // the definition carried.
  const archive: CatalogueSource = carriedCatalogue({ model: json.model, devices: [{ ...json.devices[3], definition }], activities: [], protocols: json.protocols })!;
  const sources = { archive };
  for (const { owner } of ownersOf(bare)) assert.deepEqual(recipe.keys(bare, owner, sources), recipe.keys(oneTest(), owner));
});

// ---------------------------------------------------------------------------------------------------
// What an answer says, and what it leaves alone
// ---------------------------------------------------------------------------------------------------

test('on the Harmony One a stated timing and a command\'s tuning answer as the person\'s, and check lists each as not built for the model', () => {
  const json = copy(oneTest()) as Json;
  json.devices[0].timing = { interKeyDelay: 250 };
  json.devices[0].commands = { VolumeUp: { sending: { copies: 2 } } };
  const press = recipe.key(recipe.open(json), { owner: { device: 'd1' }, key: 'VolumeUp' }).presses[0]!;
  assert.ok('sending' in press);
  assert.deepEqual(press.sending.settings.interKeyDelay, { value: 250, isDefault: false });
  assert.deepEqual(press.sending.command, { copies: { value: 2, isDefault: false } });
  // The questions answer the document; whether the One's build reads either field is what the check says, at the
  // device, one problem per field, so an application shows the person's value and that it is not built side by side.
  const listed = added(oneTest(), (planted) => {
    planted.devices[0].timing = { interKeyDelay: 250 };
    planted.devices[0].commands = { VolumeUp: { sending: { copies: 2 } } };
  });
  assert.deepEqual(listed.map((one) => [one[0], one[1], one[2]]), [
    ['error', 'not-on-this-model', { kind: 'device', device: 'd1' }], ['error', 'not-on-this-model', { kind: 'device', device: 'd1' }],
  ]);
  assert.match(listed[0]![3], /LG TV's delays, which the Harmony One's build does not read yet/);
  assert.match(listed[1]![3], /LG TV's command VolumeUp's sending, which the Harmony One's build does not read yet/);
  // The control: without the two fields the same key answers the catalogue's delay and no tuning, and nothing is listed.
  const plain = recipe.key(oneTest(), { owner: { device: 'd1' }, key: 'VolumeUp' }).presses[0]!;
  assert.ok('sending' in plain);
  assert.equal(plain.sending.settings.interKeyDelay.isDefault, true);
  assert.equal(plain.sending.command, undefined);
  assert.deepEqual(added(oneTest(), () => undefined), []);
});

test('a choice equal to the default answers as the person\'s, and given back by default answers as the family\'s', () => {
  const document = oneTest();
  const owner: Owner = { activity: 'a1' };
  const derived = recipe.key(document, { owner, key: 'Info' }).presses[0]!;
  assert.deepEqual([derived.action, derived.isDefault], [{ device: 'd4', command: 'Info' }, true]);
  // The same command chosen: the document states it, so it is the person's and stays if the family's default changes.
  const same = recipe.setKey(document, { owner, key: 'Info' }, { device: 'd4', command: 'Info' }).document;
  const chosen = recipe.key(same, { owner, key: 'Info' }).presses[0]!;
  assert.deepEqual([chosen.action, chosen.isDefault], [{ device: 'd4', command: 'Info' }, false]);
  // The control: given back, the mark is the family's again.
  assert.deepEqual(recipe.key(recipe.setKey(same, { owner, key: 'Info' }, 'default').document, { owner, key: 'Info' }), recipe.key(document, { owner, key: 'Info' }));
});

test('a key choice naming a device the document does not hold stops that owner\'s keys and that key, and every other answer stands', () => {
  const json = copy(oneTest()) as Json;
  json.activities[0].keys = [{ key: 'VolumeDown', action: { device: 'Amplifier', command: 'VolumeUp' } }];
  const document = recipe.open(json);
  const stopped = (error: unknown): boolean => error instanceof RecipeError
    && error.message === 'activity a1\'s VolumeDown key names Amplifier, which is no device of the document; the check lists it';
  assert.throws(() => recipe.keys(document, { activity: 'a1' }), stopped);
  assert.throws(() => recipe.key(document, { owner: { activity: 'a1' }, key: 'VolumeDown' }), stopped);
  // The check lists the same choice.
  assert.deepEqual(recipe.check(document).map((one) => [one.code, one.place]), [['unknown-device', { kind: 'key', owner: { activity: 'a1' }, key: 'VolumeDown' }]]);
  // The owner's other keys one at a time, its screen, and every other owner answer as in the document without it.
  const clean = oneTest();
  assert.deepEqual(recipe.key(document, { owner: { activity: 'a1' }, key: 'Info' }), recipe.key(clean, { owner: { activity: 'a1' }, key: 'Info' }));
  assert.deepEqual(recipe.screen(document, { activity: 'a1' }), recipe.screen(clean, { activity: 'a1' }));
  for (const { owner } of ownersOf(document).filter((one) => !('activity' in one.owner && one.owner.activity === 'a1'))) {
    assert.deepEqual(recipe.keys(document, owner), recipe.keys(clean, owner));
  }
});

test('a device\'s key changed in device mode changes that device\'s answer on that key and no activity\'s', () => {
  const document = oneTest();
  const changed = recipe.setKey(document, { owner: { device: 'd4' }, key: 'Info' }, { nothing: true }).document;
  assert.deepEqual(differences(pressesOf(recipe.keys(document, { device: 'd4' })), pressesOf(recipe.keys(changed, { device: 'd4' }))),
    ['Info/short: d4.Info - default against nothing - chosen']);
  // Every activity, those using the KPN among them, answers as before: an activity derives from its devices' default maps.
  for (const activity of document.activities) {
    assert.deepEqual(recipe.keys(changed, { activity: activity.id! }), recipe.keys(document, { activity: activity.id! }));
  }
  assert.ok(document.activities.some((activity) => activity.devices.some((used) => used.device === 'KPN')));
});

test('the wait after power on is left out where neither the catalogue nor the document states one, and answered where either does', () => {
  // A carried definition made up from the LG TV's, its record stating no wait after power on.
  const json = copy(oneTest()) as Json;
  delete json.devices[0].definition.record.timing.powerOnDelay;
  const settings = (document: Recipe): Json => {
    const press = recipe.key(document, { owner: { device: 'd1' }, key: 'VolumeUp' }).presses[0]!;
    assert.ok('sending' in press);
    return press.sending.settings;
  };
  const without = settings(recipe.open(json));
  assert.equal('powerOnDelay' in without, false);
  assert.deepEqual(Object.keys(without), ['pressMinRepeats', 'interKeyDelay', 'interDeviceDelay', 'inputDelay']);
  // Stated by the document, it is the person's; and the control, the definition as carried, answers the catalogue's.
  json.devices[0].timing = { powerOnDelay: 2000 };
  assert.deepEqual(settings(recipe.open(json)).powerOnDelay, { value: 2000, isDefault: false });
  const carried = (oneTest().devices[0]!.definition!.record as Json).timing.powerOnDelay;
  assert.equal(typeof carried, 'number');
  assert.deepEqual(settings(oneTest()).powerOnDelay, { value: carried, isDefault: true });
});

test('each answer is the caller\'s own: changing one press\'s settings or owner changes no other press, no later answer and not the document', () => {
  const document = touchTest();
  const before = JSON.stringify(document);
  const answers = recipe.keys(document, { device: 'd2' });
  const sending = answers.flatMap((one) => one.presses).filter((one) => 'sending' in one) as Extract<PressAnswer, { sending: unknown }>[];
  const [first, second] = [sending[0]!, sending[1]!];
  (first.sending.settings.interKeyDelay as { value: number }).value = 1;
  (answers[0]!.owner as { device: string }).device = 'd9';
  assert.equal(second.sending.settings.interKeyDelay.value, 300);
  assert.deepEqual(answers[1]!.owner, { device: 'd2' });
  assert.equal(JSON.stringify(document), before);
  assert.deepEqual(recipe.keys(document, { device: 'd2' })[0]!.owner, { device: 'd2' });
  const again = recipe.keys(document, { device: 'd2' }).flatMap((one) => one.presses).find((one) => 'sending' in one)!;
  assert.ok('sending' in again);
  assert.equal(again.sending.settings.interKeyDelay.value, 300);
});

// ---------------------------------------------------------------------------------------------------
// The check, by the same places
// ---------------------------------------------------------------------------------------------------

/** The problems a check lists for a document that the same document without the planted keys does not. */
const added = (document: Recipe, plant: (json: Json) => void): [string, string, unknown, string][] => {
  const json = copy(document) as Json;
  plant(json);
  const before = new Set(recipe.check(document).map((one) => JSON.stringify(one)));
  return recipe.check(recipe.open(json)).filter((one) => !before.has(JSON.stringify(one))).map((one) => [one.severity, one.code, one.place, one.message]);
};

test('the check lists a key choice naming no place, a place no map of its owner binds, and a press the place does not have, by the model\'s places', () => {
  const touch = touchTest();
  const owner = { activity: 'a3' };
  // Why the remote binds Favorites itself is the Touch family's sentence, read from its places rather than copied.
  const favoritesWhy = recipe.keyNames(touch).find((one) => one.key === 'Favorites')!.why!;
  assert.deepEqual(added(touch, (json) => {
    json.activities[2].keys = [
      { key: 'Dance', action: { nothing: true } },
      { key: 'Favorites', action: { nothing: true } },
      { key: 'Number1', press: 'held', action: { nothing: true } },
    ];
    json.devices[0].keys = [...json.devices[0].keys, { key: 'SwipeUp', action: { nothing: true } }];
  }), [
    ['error', 'not-on-this-model', { kind: 'key', owner: { device: 'd1' }, key: 'SwipeUp' }, 'LG TV\'s own map chooses what the SwipeUp key does, and on a Harmony Touch only an activity\'s map binds it'],
    ['error', 'unknown-key', { kind: 'key', owner, key: 'Dance' }, 'activity Listen to Music chooses what the Dance key does, and no model has a key of that name'],
    ['error', 'unknown-key', { kind: 'key', owner, key: 'Favorites' }, `activity Listen to Music chooses what the Favorites key does, and a Harmony Touch's maps bind no key of that name: ${favoritesWhy}`],
    ['error', 'not-on-this-model', { kind: 'key', owner, key: 'Number1', press: 'held' }, 'activity Listen to Music gives the Number1 key a held press, which the Number1 key of a Harmony Touch does not have'],
  ]);
  // On the Harmony One, a held press on a key that has a short press alone.
  assert.deepEqual(added(oneTest(), (json) => { json.activities[0].keys = [{ key: 'VolumeUp', press: 'held', action: { nothing: true } }]; }), [
    ['error', 'not-on-this-model', { kind: 'key', owner: { activity: 'a1' }, key: 'VolumeUp', press: 'held' }, 'activity TV kijken gives the VolumeUp key a held press, which the VolumeUp key of a Harmony One does not have'],
  ]);
});

test('the check codes a key choice as setKey refuses the same place: a key only the other owner binds not on this model, a key the remote binds itself unknown', () => {
  // Two routes to one place: `setKey`'s refusal, and the check of a document that states the same choice written by
  // hand. An application acts on the code, so the two have to agree on it, and before they agreed the check said
  // unknown where `setKey` said not on this model, for a gesture in a device's own map.
  const touch = touchTest();
  const reasons = { 'not-on-this-model': 'not-on-this-model', unknown: 'unknown-key' } as const;
  const cases: readonly (readonly [Owner, string, keyof typeof reasons])[] = [
    // A gesture is an activity's alone on a Touch: a key the model has, not in a device's map.
    [{ device: 'd1' }, 'SwipeUp', 'not-on-this-model'],
    // Favorites is a zone of the touch sensor the screens act on themselves, bound by no map: no key a person chooses.
    [{ activity: 'a3' }, 'Favorites', 'unknown'],
  ];
  for (const [owner, key, reason] of cases) {
    assert.throws(() => recipe.setKey(touch, { owner, key }, { nothing: true }),
      (error: unknown) => error instanceof recipe.ChangeRefused && error.reason === reason, key);
    const listed = added(touch, (json) => {
      const at = 'device' in owner ? json.devices.find((one: Json) => one.id === owner.device) : json.activities.find((one: Json) => one.id === owner.activity);
      at.keys = [...(at.keys ?? []), { key, action: { nothing: true } }];
    });
    assert.deepEqual(listed.map(([severity, code, place]) => [severity, code, place]), [['error', reasons[reason], { kind: 'key', owner, key }]], key);
  }
  // The control: the same gesture in an activity's map is taken by `setKey` and listed by nothing.
  assert.doesNotThrow(() => recipe.setKey(touch, { owner: { activity: 'a3' }, key: 'SwipeUp' }, { nothing: true }));
  assert.deepEqual(added(touch, (json) => { json.activities[2].keys = [...(json.activities[2].keys ?? []), { key: 'SwipeUp', action: { nothing: true } }]; }), []);
});

test('the control: a choice on a place the owner binds, with a press it has, is not listed as a key the model lacks', () => {
  // A gesture's double press in an activity of the Touch is a place and a press the model has, and the Touch's build
  // reads both a key choice and a double press, decision 43, so nothing at all is said of it.
  const problems = added(touchTest(), (json) => { json.activities[2].keys = [{ key: 'SwipeUp', press: 'double', action: { nothing: true } }]; });
  assert.deepEqual(problems, []);
  // And on the Harmony One a short press on a key its maps bind lists nothing at all.
  assert.deepEqual(added(oneTest(), (json) => { json.activities[0].keys = [{ key: 'VolumeUp', action: { nothing: true } }]; }), []);
});
