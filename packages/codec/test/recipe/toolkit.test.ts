/**
 * The contracts of decision 38, as far as the codec holds them: the document toolkit, `recipe` on the main entry,
 * and the device search, each function there to be called and refusing by name while nothing is behind it.
 *
 * **What is claimed.** That every function of the toolkit and of the search exists on the entry an application
 * imports, and that calling one that is not built throws `NotBuiltError` naming the function as an application
 * calls it and the requirement it waits on. The lists below are exact, so they are also the measure of what is
 * left: a function that gets built leaves its list in the same diff, and a function added to the toolkit without a
 * line here fails.
 *
 * **What is not claimed.** That any of the signatures is right. A contract is proven by the path that runs through
 * it on two remotes, one of each kind of family, and whatever does not fit is changed before a version is released.
 *
 * Beside it, the two fields the toolkit's addressing adds to the recipe: an id per device and activity, and the
 * format's version, read and refused as `readRecipe` reads and refuses everything else.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NotBuiltError, RECIPE_VERSION, RecipeError, fetchDevice, findDevices, networkArchiveSource, readRecipe, recipe,
} from '../../src/index.ts';
import { archiveSourceAt } from '../../src/node.ts';

/** Every function of the toolkit that is not built, with the requirement its refusal names. */
const NOT_BUILT: Record<string, number> = {
  create: 76, open: 76,
  addDevice: 10, setDevice: 12, setDeviceCommand: 19,
  addActivity: 21, setActivity: 25,
  addSequence: 37, setSequence: 37,
  setKey: 31, setScreen: 34, setFavourites: 45, setLook: 42, setSetting: 47,
  remove: 13, move: 28,
  devices: 77, activities: 77, sequences: 77, commands: 77, inputs: 77, key: 77, keys: 77, screen: 77,
  favourites: 77, uses: 77, unfilled: 77,
  check: 78,
};

/** What a call threw, or undefined where it returned. A promise that rejects counts as a throw. */
async function refusal(call: () => unknown): Promise<unknown> {
  try {
    await call();
    return undefined;
  } catch (error) {
    return error;
  }
}

/** Hold one refusal to the contract's form: the class, the name as called, and the requirement. */
function assertNotBuilt(error: unknown, contract: string, requirement: number): void {
  assert.ok(error instanceof NotBuiltError, `${contract} did not refuse as a function that is not built`);
  assert.equal(error.contract, contract);
  assert.equal(error.requirement, requirement);
  assert.equal(error.message, `${contract} is in the contract and not built yet, requirement R${requirement}`);
}

test('every function of the document toolkit is on the main entry and refuses by name with its requirement', async () => {
  const toolkit = recipe as unknown as Record<string, unknown>;
  // A class is a function too; the one the toolkit exports is its refusal of a change, which is not called here.
  const functions = Object.keys(toolkit).filter((name) => typeof toolkit[name] === 'function' && name !== 'ChangeRefused').sort();
  assert.deepEqual(functions, Object.keys(NOT_BUILT).sort());
  for (const name of functions) {
    // No argument at all: a function that is not built refuses before it reads one.
    const error = await refusal(() => (toolkit[name] as () => unknown)());
    assertNotBuilt(error, `recipe.${name}`, NOT_BUILT[name]!);
  }
});

test('the device search refuses by name: the search, the fetch, and the two archive sources', async () => {
  assertNotBuilt(await refusal(() => findDevices([], {})), 'findDevices', 82);
  assertNotBuilt(await refusal(() => fetchDevice([], { source: 'archive', entry: 'a/b', manufacturer: 'a', model: 'b', match: 1 })), 'fetchDevice', 10);
  const cache = { get: async () => undefined, set: async () => undefined };
  assertNotBuilt(await refusal(() => networkArchiveSource({ fetch: async () => new Uint8Array(), cache })), 'networkArchiveSource', 81);
  assertNotBuilt(await refusal(() => archiveSourceAt('/nowhere')), 'archiveSourceAt', 9);
});

test('the control: a function that answers, and one that refuses some other way, are both seen', async () => {
  assert.equal(await refusal(() => 1), undefined);
  assert.throws(() => assertNotBuilt(undefined, 'recipe.check', 78), /did not refuse as a function that is not built/);
  assert.throws(() => assertNotBuilt(new RecipeError('no'), 'recipe.check', 78), /did not refuse as a function that is not built/);
  // The right class under another name or requirement is not the contract's refusal either.
  assert.throws(() => assertNotBuilt(new NotBuiltError('recipe.check', 77), 'recipe.check', 78));
  assert.throws(() => assertNotBuilt(new NotBuiltError('recipe.checks', 78), 'recipe.check', 78));
});

test('a problem code is stated once, and the toolkit\'s refusal of a change is a recipe error with its place', () => {
  assert.equal(new Set(recipe.PROBLEM_CODES).size, recipe.PROBLEM_CODES.length);
  const refused = new recipe.ChangeRefused('over-limit', { kind: 'document' }, 'a device more than the model holds');
  assert.ok(refused instanceof RecipeError);
  assert.deepEqual([refused.reason, refused.place, refused.message], ['over-limit', { kind: 'document' }, 'a device more than the model holds']);
});

/** The least a recipe is, with one device and one activity that uses it. */
const least = (): Record<string, unknown> => ({
  model: { name: 'Harmony 650' },
  devices: [{ name: 'Television', device: 'Sony/KDL-32W705B' }],
  activities: [{ name: 'Watch TV', type: 'WatchTV', devices: [{ device: 'Television', roles: [] }] }],
});

test('a recipe carries an id per device and activity and its format\'s version, and reads as before without them', () => {
  assert.equal(RECIPE_VERSION, 1);
  const plain = readRecipe(least());
  assert.deepEqual([plain.version, plain.devices[0]!.id, plain.activities[0]!.id], [undefined, undefined, undefined]);
  const json = least();
  json['version'] = 1;
  (json['devices'] as Record<string, unknown>[])[0]!['id'] = 'd1';
  (json['activities'] as Record<string, unknown>[])[0]!['id'] = 'a1';
  const read = readRecipe(json);
  assert.deepEqual([read.version, read.devices[0]!.id, read.activities[0]!.id], [1, 'd1', 'a1']);
  // Written out and read again it is the same document: an id and the version are data like the rest.
  assert.deepEqual(readRecipe(JSON.parse(JSON.stringify(read))), read);
});

test('a version this does not read, an id that is no name, and one id on two devices or two activities are refused', () => {
  const withVersion = (version: unknown): Record<string, unknown> => ({ ...least(), version });
  assert.throws(() => readRecipe(withVersion(2)), /is of version 2, and this reads up to 1/);
  assert.throws(() => readRecipe(withVersion(0)), /version is not a whole number from 1/);
  assert.throws(() => readRecipe(withVersion('1')), /version is not a whole number from 1/);
  const twoDevices = least();
  twoDevices['devices'] = [{ id: 'd1', name: 'Television', device: 'Sony/KDL-32W705B' }, { id: 'd1', name: 'Receiver', device: 'Denon/AVR-1912' }];
  assert.throws(() => readRecipe(twoDevices), /two of the devices have one id/);
  const twoActivities = least();
  const activity = (twoActivities['activities'] as Record<string, unknown>[])[0]!;
  twoActivities['activities'] = [{ ...activity, id: 'a1' }, { ...activity, id: 'a1', name: 'Listen' }];
  assert.throws(() => readRecipe(twoActivities), /two of the activities have one id/);
  const emptyId = least();
  (emptyId['devices'] as Record<string, unknown>[])[0]!['id'] = '';
  assert.throws(() => readRecipe(emptyId), /device 1's id is not a name/);
  // The control: the same recipe with two different ids reads.
  twoDevices['devices'] = [{ id: 'd1', name: 'Television', device: 'Sony/KDL-32W705B' }, { id: 'd2', name: 'Receiver', device: 'Denon/AVR-1912' }];
  assert.equal(readRecipe(twoDevices).devices.length, 2);
});
