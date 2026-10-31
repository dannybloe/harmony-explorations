/**
 * The recipe, `todo-compile-650.md` 10.7.4: the setup files read as recipes, the model a recipe names
 * looked up in the model table with the family that builds for it, and the shape checks that refuse a
 * recipe before anything is built. No lab and no catalogue: the assembly's own tests build from recipes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { MODELS_BY_SKIN } from '@harmony/usb/models';
import { RecipeError, modelName, readRecipe, recipeTarget } from '../src/index.ts';
import { FOUR_SLOT_CHOICES, fourSlotChoices } from '../src/families/four-slot/choices.ts';

const SETUPS = new URL('../../corpus/setups/', import.meta.url);
const raw = (file: string): Record<string, unknown> => JSON.parse(readFileSync(new URL(file, SETUPS), 'utf8'));

test('every setup file reads as a recipe: the three for the Harmony 650, skin 72, which the four slot family builds for and which holds eight devices, the test setup for the Harmony One, skin 54, the touch family\'s, and the Harmony 300\'s and 350\'s, which no recipe target serves yet',
  () => {
  const files = readdirSync(SETUPS).filter((one) => one.endsWith('.json')).sort();
  assert.deepEqual(files, ['h300-test.json', 'h350-test.json', 'h650-options.json', 'h650-start.json', 'h650-test.json', 'one-test.json']);
  for (const file of files) {
    const recipe = readRecipe(raw(file));
    // The Harmony 350's setup is sent to Logitech's service and built by nothing here: its skin is not in
    // the model table, so its target is refused. This fails, and should be rewritten, when a family arrives.
    // The Harmony 300's, todo-compile-300 3.4, is the recipe of the compile its bench unit holds, and is refused
    // the same way, at skin 79.
    if (file.startsWith('h350-') || file.startsWith('h300-')) {
      assert.throws(() => recipeTarget(recipe), file.startsWith('h350-') ? /no model has skin 104/ : /no model has skin 79/);
      continue;
    }
    const target = recipeTarget(recipe);
    const one = file.startsWith('one-');
    assert.equal(target.skin, one ? 54 : 72, file);
    assert.equal(target.family.name, one ? 'the Harmony One' : 'the Harmony 600, 650 and 700', file);
    if (!one) assert.equal(target.model.maxDevices, 8, file);
  }
  // Only the test setup states working screens: Plasma kijken's, which it composes onto Logitech's starting
  // compile, and since todo-compile-650 11.2.1 the other four as Logitech's compile of the setup draws them,
  // for a build from nothing, which has no compile to take them from.
  const screens = files.flatMap((file) => readRecipe(raw(file)).activities.filter((one) => one.screen !== undefined)
    .map((one) => `${file} ${one.name} ${one.screen?.length}`));
  assert.deepEqual(screens, [
    'h650-test.json TV kijken 2', 'h650-test.json Film kijken 3', 'h650-test.json Muziek 1', 'h650-test.json Kodi kijken 1',
    'h650-test.json Plasma kijken 4',
    'one-test.json TV kijken 2', 'one-test.json Film kijken 3', 'one-test.json Muziek 1', 'one-test.json Kodi kijken 1',
    'one-test.json Plasma kijken 4',
  ]);
  // The One's is the 650's with its model and the sequence's key: the same devices and activities.
  const { about: _a, model: _m, ...h650 } = raw('h650-test.json');
  const { about: _b, model: _n, ...one } = raw('one-test.json');
  const devicesAndNames = (r: Record<string, unknown>) => JSON.stringify([r.devices, (r.activities as { name: string }[]).map((a) => a.name)]);
  assert.equal(devicesAndNames(one), devicesAndNames(h650));
});

test('a model is found by its name, or by its skin where the two must agree, and refused where nothing builds for it', () => {
  const base = readRecipe(raw('h650-start.json'));
  const target = (model: { name: string; skin?: number }) => recipeTarget({ ...base, model });
  assert.equal(target({ name: 'Harmony 650' }).skin, 72);
  assert.equal(target({ name: 'Harmony 650 EMEA' }).skin, 74);
  assert.equal(target({ name: 'Harmony One' }).family.name, 'the Harmony One');
  assert.throws(() => target({ name: 'Harmony 650', skin: 74 }), /skin 74 is the Harmony 650 EMEA, not the Harmony 650/);
  assert.throws(() => target({ name: 'Harmony 650', skin: 9999 }), /no model has skin 9999/);
  assert.throws(() => target({ name: 'Harmony 651' }), /no model is called Harmony 651/);
  // The Harmony 525 is in the table and no family builds for it yet.
  assert.throws(() => target({ name: 'Harmony 525' }), /nothing here builds a configuration for the Harmony 525/);
  // A name two skins share would need its skin; no name in the table is two skins' today, so that refusal
  // is a guard rather than a case, and this says so in a way that fails when one arrives.
  const names = Object.values(MODELS_BY_SKIN).map(modelName);
  assert.equal(new Set(names).size, names.length);
});

test('a recipe\'s shape is checked before anything is built: an unknown field, a role no activity has, a sequence with no step, a pause of no whole tenths', () => {
  const start = raw('h650-start.json');
  const refuses = (json: unknown, pattern: RegExp) => assert.throws(() => readRecipe(json), (error: unknown) =>
    error instanceof RecipeError && pattern.test(error.message));
  refuses({ ...start, colour: 'red' }, /the recipe has a field colour no recipe has/);
  refuses({ ...start, model: undefined }, /the model is not an object/);
  const { model: _, ...noModel } = start;
  refuses(noModel, /the recipe has no model/);
  const activities = start.activities as Record<string, unknown>[];
  const first = activities[0] as { devices: Record<string, unknown>[] };
  refuses({ ...start, activities: [{ ...first, devices: [{ ...first.devices[0], roles: ['Lighting'] }] }] },
    /has a role Lighting no activity has/);
  const withScreen = (screen: unknown) => ({ ...start, activities: [{ ...first, screen }] });
  refuses(withScreen([{ sequence: 'Radio', steps: [] }]), /screen item 1 has no step/);
  refuses(withScreen([{ sequence: 'Radio', steps: [{ pause: 1.5 }] }]), /pauses for no whole number of tenths/);
  refuses(withScreen([{ device: 'KPN' }]), /screen item 1 has no command/);
});

test('favourite channels are read as text per device, and a number, an unknown device or a device named twice is refused', () => {
  const h350 = raw('h350-test.json');
  assert.deepEqual(readRecipe(h350).favourites, [{ device: 'KPN', channels: ['1', '2', '3', '666', '07'] }]);
  // Only the Harmony 350's setup states any.
  for (const file of ['h650-options.json', 'h650-start.json', 'h650-test.json', 'one-test.json']) {
    assert.equal(readRecipe(raw(file)).favourites, undefined, file);
  }
  const refuses = (favourites: unknown, pattern: RegExp) => assert.throws(() => readRecipe({ ...h350, favourites }),
    (error: unknown) => error instanceof RecipeError && pattern.test(error.message));
  // A number would lose a leading zero, so a channel is text or it is refused.
  refuses([{ device: 'KPN', channels: [7] }], /channel 1 is not a channel number written as text/);
  refuses([{ device: 'KPN', channels: ['seven'] }], /channel 1 is not a channel number written as text/);
  refuses([{ device: 'KPN', channels: [] }], /favourites 1 has no channel/);
  refuses([{ device: 'Radio', channels: ['1'] }], /names Radio, which is no device of the recipe/);
  refuses([{ device: 'KPN', channels: ['1'] }, { device: 'KPN', channels: ['2'] }], /name one device twice/);
  refuses([{ device: 'KPN', channels: ['1'], label: 'x' }], /favourites 1 has a field label no recipe has/);
  // A dot or a dash between digits is a channel number too, as MyHarmony's screen reads one.
  assert.deepEqual(readRecipe({ ...h350, favourites: [{ device: 'KPN', channels: ['5.1', '12-3'] }] }).favourites,
    [{ device: 'KPN', channels: ['5.1', '12-3'] }]);
});

test('a choice the family does not make is refused, so a misspelt one is not silently its default', () => {
  assert.deepEqual(fourSlotChoices({}), FOUR_SLOT_CHOICES);
  assert.equal(fourSlotChoices({ settings: { glowTime: 10 } }).settings.tiltSensor, FOUR_SLOT_CHOICES.settings.tiltSensor);
  assert.throws(() => fourSlotChoices({ blendLetter: true } as never), /make no choice called blendLetter/);
  assert.throws(() => fourSlotChoices({ settings: { glowtime: 10 } } as never), /settings has no glowtime/);
});
