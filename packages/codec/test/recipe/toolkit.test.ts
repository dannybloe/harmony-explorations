/**
 * The contracts of decision 38, as far as the codec holds them: the document toolkit, `recipe` on the main entry,
 * and the device search, each function there to be called and refusing by name while nothing is behind it.
 *
 * **What is claimed.** That every function of the toolkit and of the search exists on the entry an application
 * imports, and that calling one that is not built throws `NotBuiltError` naming the function as an application
 * calls it and the requirement it waits on. The lists below are exact, so they are also the measure of what is
 * left: a function that gets built moves from one list to the other in the same diff, and a function added to the
 * toolkit without a line here fails.
 *
 * **The functions that are built**, each on documents made up here, which need no lab and no catalogue: a fresh
 * document and an opened one; a device and an activity added, renamed, changed, moved and removed, with everything
 * that named a device following its new name or settled when it goes; a key's choice stated, replaced and given
 * back; the lists, a device's commands and inputs, what uses something; and the check with every problem it knows,
 * each beside the same document without the fault. A member of a built function that nothing reads yet is held to
 * its own refusal by name, and so is every change to a document that carries a remote's own documents' part. A change
 * is held to three things every time: what it returns, that the document it was given is untouched, and that what
 * it returns reads as a recipe, since a document goes to disk and comes back through `readRecipe`.
 *
 * **What is not claimed.** That any of the signatures is right. A contract is proven by the path that runs through
 * it on two remotes, one of each kind of family, and whatever does not fit is changed before a version is released.
 *
 * Beside it, the two fields the toolkit's addressing adds to the recipe: an id per device and activity, and the
 * format's version, read and refused as `readRecipe` reads and refuses everything else.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import {
  NotBuiltError, RECIPE_VERSION, RecipeError, fetchDevice, findDevices, networkArchiveSource, readRecipe, recipe,
} from '../../src/index.ts';
import { archiveSourceAt } from '../../src/node.ts';

/** Every function of the toolkit that is not built, with the requirement its refusal names. */
const NOT_BUILT: Record<string, number> = {
  setDeviceCommand: 19,
  addSequence: 37, setSequence: 37,
  setScreen: 34, setFavourites: 45, setLook: 42, setSetting: 47,
  sequences: 77, key: 77, keys: 77, screen: 77, favourites: 77,
};

/** The functions of the toolkit that are built, each held by a test of its own below. */
const BUILT = [
  'activities', 'addActivity', 'addDevice', 'check', 'commands', 'create', 'devices', 'inputs', 'keyNames', 'move', 'open',
  'remove', 'setActivity', 'setDevice', 'setKey', 'unfilled', 'uses',
];

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
  // Every function is in exactly one of the two lists: built, or refusing with its requirement.
  assert.deepEqual(functions, [...Object.keys(NOT_BUILT), ...BUILT].sort());
  assert.deepEqual(BUILT.filter((name) => name in NOT_BUILT), []);
  for (const name of Object.keys(NOT_BUILT)) {
    // No argument at all: a function that is not built refuses before it reads one.
    const error = await refusal(() => (toolkit[name] as () => unknown)());
    assertNotBuilt(error, `recipe.${name}`, NOT_BUILT[name]!);
  }
});

test('of the device search, the archive over the network refuses by name; the search, the fetch and the disk\'s source are built', async () => {
  const cache = { get: async () => undefined, set: async () => undefined };
  assertNotBuilt(await refusal(() => networkArchiveSource({ fetch: async () => new Uint8Array(), cache })), 'networkArchiveSource', 81);
  // Built, and held by `test/catalogue/search.test.ts`: none of the three refuses as a function that is not built.
  assert.deepEqual(await findDevices([], {}), { found: [], failed: [] });
  assert.ok(!((await refusal(() => fetchDevice([], { source: 'archive', entry: 'a/b', manufacturer: 'a', model: 'b', match: 1 }))) instanceof NotBuiltError));
  assert.equal(archiveSourceAt('/nowhere').name, 'archive');
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

// ---------------------------------------------------------------------------------------------------
// The functions that are built
// ---------------------------------------------------------------------------------------------------

type Json = Record<string, unknown>;

/** The timing block every record of the catalogue carries, made up. */
const TIMING = {
  interKeyDelay: 100, interDeviceDelay: 500, holdInterDeviceDelay: 0, inputDelay: 0,
  connectedAppPowerOnDelay: 0, pressMinRepeats: 3, isInterKeyDelayOptimized: false,
};

/** A made up device as a search would fetch it: a record with one input, three commands, and its protocol. */
const carried = (entry: string): {
  source: string; entry: string;
  definition: { record: Json; commands: { name: string; keycode: string }[] }; protocols: Json[];
} => ({
  source: 'made up',
  entry,
  definition: {
    record: { codeset: 'codesets/aa/bb.json', timing: TIMING, inputs: { type: 0, list: [{ name: 'HDMI 1', commands: ['InputHdmi1'] }] } },
    commands: [
      { name: 'VolumeUp', keycode: 'G:NEC 32 Bit:()(0x1)():3' },
      { name: 'VolumeDown', keycode: 'G:NEC 32 Bit:()(0x2)():3' },
      { name: 'InputHdmi1', keycode: 'G:NEC 32 Bit:()(0x3)():3' },
    ],
  },
  protocols: [{ name: 'NEC 32 Bit' }],
});

const ONE = { name: 'Harmony One', skin: 54 };

/** A document for the Harmony One with a television and a receiver, and one activity using both. */
function small(): ReturnType<typeof recipe.create> {
  let document = recipe.create(ONE);
  document = recipe.addDevice(document, { name: 'Television', device: carried('Made/TV') }).document;
  document = recipe.addDevice(document, { name: 'Receiver', device: carried('Made/AVR') }).document;
  return recipe.addActivity(document, {
    name: 'Watch TV', type: 'WatchTV',
    devices: [{ device: 'd1', input: 'HDMI 1', roles: ['Display'] }, { device: 'd2', roles: ['Volume'] }],
  }).document;
}

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

test('a fresh document is empty, states its model and the version, and reads as a recipe; a model nothing builds for is refused', () => {
  const fresh = recipe.create(ONE);
  assert.deepEqual(fresh, { version: 1, model: { name: 'Harmony One', skin: 54 }, devices: [], activities: [] });
  assert.deepEqual(readRecipe(JSON.parse(JSON.stringify(fresh))), fresh);
  assert.deepEqual(recipe.check(fresh), []);
  // A model named without its skin keeps none, as a recipe written by hand may.
  assert.deepEqual(recipe.create({ name: 'Harmony 350' }).model, { name: 'Harmony 350' });
  assert.throws(() => recipe.create({ name: 'Harmony 525' }), (error: unknown) => error instanceof RecipeError && /no family serves/.test(error.message));
});

test('opening gives every device and activity without an id one, in order and past the highest given, and is the same the second time', () => {
  const json = least();
  json['devices'] = [
    { name: 'Television', device: 'Sony/KDL-32W705B' }, { id: 'd5', name: 'Receiver', device: 'Denon/AVR-1912' },
    { name: 'Player', device: 'Sony/BDP-S1' },
  ];
  const opened = recipe.open(json);
  assert.deepEqual(opened.devices.map((one) => one.id), ['d6', 'd5', 'd7']);
  assert.deepEqual(opened.activities.map((one) => one.id), ['a1']);
  assert.equal(opened.version, 1);
  // Everything but the ids and the version is as it was read.
  const strip = (one: Json): Json => { const { id: _id, ...rest } = one; return rest; };
  assert.deepEqual(opened.devices.map((one) => strip(one as unknown as Json)), readRecipe(json).devices.map((one) => strip(one as unknown as Json)));
  assert.deepEqual(recipe.open(JSON.parse(JSON.stringify(opened))), opened);
  // And what is not a recipe is refused as `readRecipe` refuses it.
  assert.throws(() => recipe.open({ model: { name: 'Harmony One' } }), /the recipe has no devices/);
});

test('a document that did not come through create or open is refused by name, since nothing in it has an address', () => {
  const unopened = readRecipe(least());
  for (const call of [
    () => recipe.check(unopened), () => recipe.devices(unopened), () => recipe.activities(unopened), () => recipe.unfilled(unopened),
    () => recipe.addDevice(unopened, { name: 'Receiver', device: carried('Made/AVR') }),
    () => recipe.addActivity(unopened, { name: 'Listen', type: 'ListenToMusic', devices: [] }),
    () => recipe.setKey(unopened, { owner: { device: 'd1' }, key: 'VolumeUp' }, 'default'),
  ]) {
    assert.throws(call, /device Television has no id: a document comes through recipe.open or recipe.create/);
  }
  // The control: the same document opened answers.
  assert.equal(recipe.devices(recipe.open(least())).length, 1);
});

test('a device is added last with its definition and its protocols, under the next id, and the document given is untouched', () => {
  const fresh = recipe.create(ONE);
  const before = JSON.stringify(fresh);
  const first = recipe.addDevice(fresh, { name: 'Television', device: carried('Made/TV') });
  assert.equal(JSON.stringify(fresh), before);
  assert.deepEqual(first.effects, []);
  assert.deepEqual(first.document.devices, [{ id: 'd1', name: 'Television', device: 'Made/TV', definition: carried('Made/TV').definition }]);
  assert.deepEqual(first.document.protocols, [{ name: 'NEC 32 Bit' }]);
  const second = recipe.addDevice(first.document, { name: 'Receiver', device: carried('Made/AVR') }).document;
  assert.deepEqual(second.devices.map((one) => [one.id, one.name, one.device]), [['d1', 'Television', 'Made/TV'], ['d2', 'Receiver', 'Made/AVR']]);
  // The protocol both devices name is carried once.
  assert.deepEqual(second.protocols, [{ name: 'NEC 32 Bit' }]);
  assert.deepEqual(readRecipe(JSON.parse(JSON.stringify(second))), second);
  assert.deepEqual(recipe.devices(second), [
    { id: 'd1', name: 'Television', entry: 'Made/TV', manufacturer: 'Made', model: 'TV', learned: false },
    { id: 'd2', name: 'Receiver', entry: 'Made/AVR', manufacturer: 'Made', model: 'AVR', learned: false },
  ]);
});

test('a device is refused under a name taken, with no name, with no definition, and as the sixteenth on a Harmony One', () => {
  const one = recipe.addDevice(recipe.create(ONE), { name: 'Television', device: carried('Made/TV') }).document;
  assert.deepEqual(refused(() => recipe.addDevice(one, { name: 'Television', device: carried('Made/AVR') })), ['invalid', { kind: 'document' }]);
  assert.deepEqual(refused(() => recipe.addDevice(one, { name: '  ', device: carried('Made/AVR') })), ['invalid', { kind: 'document' }]);
  const bare = { source: 'made up', entry: 'Made/AVR', protocols: [] } as unknown as ReturnType<typeof carried>;
  assert.deepEqual(refused(() => recipe.addDevice(one, { name: 'Receiver', device: bare })), ['invalid', { kind: 'document' }]);
  // The capability API states fifteen devices for a Harmony One: the fifteenth is taken and the sixteenth refused.
  let full = recipe.create(ONE);
  for (let k = 1; k <= 15; k++) full = recipe.addDevice(full, { name: `Device ${k}`, device: carried(`Made/D${k}`) }).document;
  assert.equal(full.devices.length, 15);
  assert.deepEqual(refused(() => recipe.addDevice(full, { name: 'Device 16', device: carried('Made/D16') })), ['over-limit', { kind: 'document' }]);
});

test('an activity is added last by its devices\' ids, written under their names, and listed back by their ids', () => {
  const document = small();
  assert.deepEqual(document.activities, [{
    id: 'a1', name: 'Watch TV', type: 'WatchTV',
    devices: [{ device: 'Television', input: 'HDMI 1', roles: ['Display'] }, { device: 'Receiver', roles: ['Volume'] }],
  }]);
  assert.deepEqual(readRecipe(JSON.parse(JSON.stringify(document))), document);
  assert.deepEqual(recipe.activities(document), [{
    id: 'a1', name: 'Watch TV', type: 'WatchTV',
    devices: [{ device: 'd1', input: 'HDMI 1', roles: ['Display'] }, { device: 'd2', roles: ['Volume'] }],
  }]);
  const two = recipe.addActivity(document, { name: 'Listen', type: 'ListenToMusic', devices: [{ device: 'd2', roles: ['Volume'] }] }).document;
  assert.deepEqual(two.activities.map((one) => [one.id, one.name]), [['a1', 'Watch TV'], ['a2', 'Listen']]);
});

test('an activity is refused with a device the document does not hold or names twice, a job no activity has, a name taken, and as the second on a Harmony 350', () => {
  const document = small();
  const listen = { name: 'Listen', type: 'ListenToMusic' };
  assert.deepEqual(refused(() => recipe.addActivity(document, { ...listen, devices: [{ device: 'd9', roles: [] }] })), ['unknown', { kind: 'device', device: 'd9' }]);
  assert.deepEqual(refused(() => recipe.addActivity(document, { ...listen, devices: [{ device: 'd2', roles: [] }, { device: 'd2', roles: [] }] })),
    ['invalid', { kind: 'device', device: 'd2' }]);
  assert.deepEqual(refused(() => recipe.addActivity(document, { ...listen, devices: [{ device: 'd2', roles: ['Dancing' as 'Volume'] }] })),
    ['invalid', { kind: 'device', device: 'd2' }]);
  assert.deepEqual(refused(() => recipe.addActivity(document, { name: 'Watch TV', type: 'WatchTV', devices: [] })), ['invalid', { kind: 'document' }]);
  // A Harmony 350 holds one activity: the first is taken and the second refused.
  const first = recipe.addActivity(recipe.create({ name: 'Harmony 350' }), { name: 'Watch TV', type: 'WatchTV', devices: [] }).document;
  assert.equal(first.activities.length, 1);
  assert.deepEqual(refused(() => recipe.addActivity(first, { ...listen, devices: [] })), ['over-limit', { kind: 'document' }]);
});

test('a key\'s choice is stated in its owner\'s map, replaced by the next, and given back by default, which leaves the document as it was', () => {
  const document = small();
  const key = { owner: { activity: 'a1' }, key: 'VolumeUp' } as const;
  const chosen = recipe.setKey(document, key, { device: 'd1', command: 'VolumeUp' }).document;
  // The activity's map and nothing else: the choice names the device as the recipe does, by its name.
  assert.deepEqual(chosen.activities[0]!.keys, [{ key: 'VolumeUp', action: { device: 'Television', command: 'VolumeUp' } }]);
  assert.deepEqual(chosen.devices, document.devices);
  assert.deepEqual(readRecipe(JSON.parse(JSON.stringify(chosen))), chosen);
  // A second choice for the same key replaces the first, and one for another key stands beside it.
  const again = recipe.setKey(chosen, key, { nothing: true }).document;
  assert.deepEqual(again.activities[0]!.keys, [{ key: 'VolumeUp', action: { nothing: true } }]);
  const both = recipe.setKey(again, { owner: { activity: 'a1' }, key: 'VolumeDown' }, { device: 'd2', command: 'VolumeDown' }).document;
  assert.deepEqual(both.activities[0]!.keys!.map((one) => one.key), ['VolumeUp', 'VolumeDown']);
  // Given back one at a time, the document is the one before any choice, with no empty field left behind.
  const back = recipe.setKey(recipe.setKey(both, key, 'default').document, { owner: { activity: 'a1' }, key: 'VolumeDown' }, 'default').document;
  assert.deepEqual(back, document);
  // A device's own map takes a command of another device: the receiver's volume on the television's volume key.
  const mode = recipe.setKey(document, { owner: { device: 'd1' }, key: 'VolumeUp' }, { device: 'd2', command: 'VolumeUp' }).document;
  assert.deepEqual(mode.devices[0]!.keys, [{ key: 'VolumeUp', action: { device: 'Receiver', command: 'VolumeUp' } }]);
  assert.deepEqual(mode.activities, document.activities);
});

test('a key\'s choice is refused for an owner, a device or a command the document does not hold, and a held press and a sequence refuse as not built', () => {
  const document = small();
  const key = { owner: { activity: 'a1' }, key: 'VolumeUp' } as const;
  const place = { kind: 'key', ...key };
  assert.deepEqual(refused(() => recipe.setKey(document, { owner: { activity: 'a9' }, key: 'VolumeUp' }, { nothing: true })), ['unknown', { kind: 'activity', activity: 'a9' }]);
  assert.deepEqual(refused(() => recipe.setKey(document, { owner: { device: 'd9' }, key: 'VolumeUp' }, { nothing: true })), ['unknown', { kind: 'device', device: 'd9' }]);
  assert.deepEqual(refused(() => recipe.setKey(document, key, { device: 'd9', command: 'VolumeUp' })), ['unknown', { kind: 'device', device: 'd9' }]);
  assert.deepEqual(refused(() => recipe.setKey(document, key, { device: 'd1', command: 'Dance' })), ['unknown', { kind: 'command', device: 'd1', command: 'Dance' }]);
  assert.deepEqual(refused(() => recipe.setKey(document, { ...key, key: '' }, { nothing: true })), ['invalid', { ...place, key: '' }]);
  assert.throws(() => recipe.setKey(document, { ...key, press: 'held' }, { nothing: true }),
    (error: unknown) => error instanceof NotBuiltError && error.contract === 'recipe.setKey for a held press' && error.requirement === 38);
  assert.throws(() => recipe.setKey(document, key, { sequence: 's1' }),
    (error: unknown) => error instanceof NotBuiltError && error.contract === 'recipe.setKey for a sequence' && error.requirement === 37);
  // A key the model's maps do not bind: the Harmony One's Activities key, which its drawing names and no map binds.
  assert.deepEqual(refused(() => recipe.setKey(document, { ...key, key: 'Activities' }, { nothing: true })), ['unknown', { ...place, key: 'Activities' }]);
  // A model whose builder takes no key's choice yet refuses by name, with the requirement of the map asked for,
  // and gives a choice it holds back all the same.
  const other = recipe.open({ ...least(), devices: [{ name: 'Television', device: 'Sony/KDL-32W705B', keys: [{ key: 'VolumeUp', action: { nothing: true } }] }] });
  assert.throws(() => recipe.setKey(other, { owner: { device: 'd1' }, key: 'VolumeUp' }, { nothing: true }),
    (error: unknown) => error instanceof NotBuiltError && error.contract === 'recipe.setKey for the Harmony 650' && error.requirement === 32);
  assert.throws(() => recipe.setKey(other, { owner: { activity: 'a1' }, key: 'VolumeUp' }, { nothing: true }),
    (error: unknown) => error instanceof NotBuiltError && error.contract === 'recipe.setKey for the Harmony 650' && error.requirement === 31);
  assert.equal('keys' in recipe.setKey(other, { owner: { device: 'd1' }, key: 'VolumeUp' }, 'default').document.devices[0]!, false);
  // A device that carries no definition takes any command's name, since nothing here can say otherwise: the
  // build, which is given a catalogue, is where that one is refused.
  const bare = recipe.open({ ...least(), model: ONE });
  assert.deepEqual(recipe.setKey(bare, { owner: { device: 'd1' }, key: 'VolumeUp' }, { device: 'd1', command: 'Dance' }).document.devices[0]!.keys,
    [{ key: 'VolumeUp', action: { device: 'Television', command: 'Dance' } }]);
});

test('the keys a document\'s model lets a person choose are its family\'s words, 37 on the Harmony One and each one setKey takes, and a model whose family builds none refuses by name', () => {
  const document = small();
  const names = recipe.keyNames(document);
  // Every keypad key a Harmony One map binds, by Logitech's word, in the family's order, which is by scan.
  assert.equal(names.length, 37);
  assert.equal(new Set(names).size, 37);
  assert.deepEqual([names[0], names[12], names[36]], ['Number4', 'Enter', 'Menu']);
  // Each one is a key setKey takes, in an activity's map and in a device's own, and none is a number.
  for (const name of names) {
    assert.deepEqual(recipe.setKey(document, { owner: { activity: 'a1' }, key: name }, { nothing: true }).document.activities[0]!.keys, [{ key: name, action: { nothing: true } }]);
    assert.deepEqual(recipe.setKey(document, { owner: { device: 'd1' }, key: name }, { nothing: true }).document.devices[0]!.keys, [{ key: name, action: { nothing: true } }]);
  }
  // The control: the three keys the drawing names that no map binds are not offered, and setKey refuses each.
  for (const name of ['Activities', 'Help', 'Off']) {
    assert.equal(names.includes(name), false);
    assert.deepEqual(refused(() => recipe.setKey(document, { owner: { activity: 'a1' }, key: name }, { nothing: true })), ['unknown', { kind: 'key', owner: { activity: 'a1' }, key: name }]);
  }
  // The answer is the caller's copy: changing it changes no later answer.
  names.pop();
  assert.equal(recipe.keyNames(document).length, 37);
  // A model whose family builds no key's choice yet refuses by name, rather than answering that it has no keys; a
  // model no family serves is refused as a model nothing builds for.
  assert.throws(() => recipe.keyNames(recipe.open(least())),
    (error: unknown) => error instanceof NotBuiltError && error.contract === 'recipe.keyNames for the Harmony 650' && error.requirement === 31);
  assert.throws(() => recipe.keyNames(readRecipe({ ...least(), model: { name: 'Harmony 525' } })),
    (error: unknown) => error instanceof RecipeError && /no family serves/.test(error.message));
});

test('the check lists every problem with its place and code, and a document without the fault lists none', () => {
  const clean = small();
  assert.deepEqual(recipe.check(clean), []);
  assert.deepEqual(recipe.unfilled(clean), []);
  const codes = (document: ReturnType<typeof small>): [string, string, unknown][] =>
    recipe.check(document).map((one) => [one.severity, one.code, one.place]);
  /** `clean` as JSON with one thing changed by hand, opened: the way a damaged file reaches the check. */
  const damaged = (change: (json: { devices: Json[]; activities: Json[] }) => void): ReturnType<typeof small> => {
    const json = JSON.parse(JSON.stringify(clean)) as { devices: Json[]; activities: Json[] };
    change(json);
    return recipe.open(json);
  };
  // An activity using a device the document does not hold.
  assert.deepEqual(codes(damaged((json) => { (json.activities[0]!['devices'] as Json[])[1]!['device'] = 'Amplifier'; })),
    [['error', 'unknown-device', { kind: 'activity', activity: 'a1' }]]);
  // An input the device does not have, where its definition says which it has.
  assert.deepEqual(codes(damaged((json) => { (json.activities[0]!['devices'] as Json[])[0]!['input'] = 'HDMI 9'; })),
    [['error', 'unknown-input', { kind: 'activity-device', activity: 'a1', device: 'd1' }]]);
  // A key given a command its device does not have, a device that is not there, a held press and a sequence.
  assert.deepEqual(codes(damaged((json) => {
    json.activities[0]!['keys'] = [
      { key: 'VolumeUp', action: { device: 'Television', command: 'Dance' } },
      { key: 'VolumeDown', action: { device: 'Amplifier', command: 'VolumeUp' } },
      { key: 'VolumeMute', press: 'held', action: { nothing: true } },
      { key: 'Rewind', action: { sequence: 'Movie night' } },
    ];
  })), [
    ['error', 'unknown-command', { kind: 'key', owner: { activity: 'a1' }, key: 'VolumeUp' }],
    ['error', 'unknown-device', { kind: 'key', owner: { activity: 'a1' }, key: 'VolumeDown' }],
    ['error', 'not-on-this-model', { kind: 'key', owner: { activity: 'a1' }, key: 'VolumeMute', press: 'held' }],
    ['error', 'not-on-this-model', { kind: 'key', owner: { activity: 'a1' }, key: 'Rewind' }],
  ]);
  // The same in a device's own map.
  assert.deepEqual(codes(damaged((json) => { json.devices[1]!['keys'] = [{ key: 'VolumeUp', action: { device: 'Television', command: 'Dance' } }]; })),
    [['error', 'unknown-command', { kind: 'key', owner: { device: 'd2' }, key: 'VolumeUp' }]]);
  // A key the model's maps do not bind: the Harmony One's Activities key in a device's own map, and in an activity's
  // a word the Harmony One has no key of at all, the Harmony Touch's Favorites.
  assert.deepEqual(codes(damaged((json) => { json.devices[0]!['keys'] = [{ key: 'Activities', action: { nothing: true } }]; json.activities[0]!['keys'] = [{ key: 'Favorites', action: { nothing: true } }]; })), [
    ['error', 'unknown-key', { kind: 'key', owner: { device: 'd1' }, key: 'Activities' }],
    ['error', 'unknown-key', { kind: 'key', owner: { activity: 'a1' }, key: 'Favorites' }],
  ]);
  // A key's choice on a model whose builder takes none yet: the same file for a Harmony 650, and its control,
  // the same file without the choice, which lists nothing.
  const onA650 = (keys: boolean): [string, string, unknown][] => codes(recipe.open({
    model: { name: 'Harmony 650' },
    devices: [{ name: 'Television', device: 'Made/TV', definition: carried('Made/TV').definition, ...(keys ? { keys: [{ key: 'VolumeUp', action: { nothing: true } }] } : {}) }],
    activities: [],
  }));
  assert.deepEqual(onA650(true), [['error', 'not-on-this-model', { kind: 'key', owner: { device: 'd1' }, key: 'VolumeUp' }]]);
  assert.deepEqual(onA650(false), []);
  // Two devices and two activities under one name: the later one of each is the problem.
  assert.deepEqual(codes(damaged((json) => { json.devices[1]!['name'] = 'Television'; (json.activities[0]!['devices'] as Json[])[1]!['device'] = 'Television'; json.activities[0]!['devices'] = [(json.activities[0]!['devices'] as Json[])[0]]; })),
    [['error', 'name-taken', { kind: 'device', device: 'd2' }]]);
  assert.deepEqual(codes(damaged((json) => { json.activities.push({ ...json.activities[0]!, id: 'a2' }); })),
    [['error', 'name-taken', { kind: 'activity', activity: 'a2' }]]);
  // A device with no definition is a note, and an activity with no device is what is not filled in yet.
  assert.deepEqual(codes(damaged((json) => { delete json.devices[1]!['definition']; })),
    [['note', 'no-definition', { kind: 'device', device: 'd2' }]]);
  const empty = damaged((json) => { json.activities[0]!['devices'] = []; });
  assert.deepEqual(codes(empty), [['note', 'unfinished', { kind: 'activity', activity: 'a1' }]]);
  assert.deepEqual(recipe.unfilled(empty), [{ kind: 'activity', activity: 'a1' }]);
  // More devices than the model holds, in a file that did not come through the toolkit's own changes.
  const many = damaged((json) => {
    for (let k = 3; k <= 16; k++) json.devices.push({ ...json.devices[0]!, id: `d${k}`, name: `Device ${k}` });
  });
  assert.deepEqual(codes(many), [['error', 'over-limit', { kind: 'document' }]]);
  // Every message is a sentence naming what it concerns, which the codes alone do not show.
  assert.match(recipe.check(many)[0]!.message, /^a Harmony One holds 15 devices, and the document holds 16$/);
});

test('every setup file of ours opens and checks: no error, and a note for each device that carries no definition', () => {
  const setups = new URL('../../../corpus/setups/', import.meta.url);
  const counts: Record<string, [number, number]> = {};
  for (const file of readdirSync(setups).filter((one) => one.endsWith('.json')).sort()) {
    const document = recipe.open(JSON.parse(readFileSync(new URL(file, setups), 'utf8')));
    const problems = recipe.check(document);
    assert.deepEqual(problems.filter((one) => one.severity === 'error'), [], file);
    assert.deepEqual([...new Set(problems.map((one) => one.code))].filter((code) => code !== 'no-definition'), [], file);
    counts[file] = [document.devices.length, problems.length];
  }
  // Devices and notes per file: no setup of ours carries a definition, so each device is one note.
  assert.deepEqual(counts, {
    'h300-test.json': [4, 4], 'h350-test.json': [8, 8], 'h650-options.json': [7, 7], 'h650-start.json': [7, 7],
    'h650-test.json': [7, 7], 'one-test.json': [7, 7], 'touch-full.json': [7, 7], 'touch-test.json': [7, 7],
  });
});

/**
 * A document in which the television is named everywhere a recipe can name a device: in two activities, in keys
 * of an activity and of another device's own map, as an item and as a sequence's steps on a screen, and in the
 * favourites. Opened from plain data, since the toolkit sets no screen and no favourites yet.
 */
function everywhere(): ReturnType<typeof recipe.open> {
  return recipe.open({
    model: ONE,
    devices: [
      { name: 'Television', device: 'Made/TV', poweredOnBetweenActivities: true, key: { place: 0 } },
      { name: 'Receiver', device: 'Made/AVR', keys: [{ key: 'VolumeUp', action: { device: 'Television', command: 'VolumeUp' } }] },
    ],
    activities: [
      {
        name: 'Watch TV', type: 'WatchTV',
        devices: [{ device: 'Television', input: 'HDMI 1', roles: ['Display'] }, { device: 'Receiver', roles: ['Volume'] }],
        screen: [
          { device: 'Television', command: 'Sleep' },
          { device: 'Receiver', command: 'Dolby' },
          { sequence: 'Both', steps: [{ device: 'Television', scan: 3 }, { pause: 5 }, { device: 'Receiver', scan: 4 }] },
          { sequence: 'Alone', steps: [{ device: 'Television', scan: 3 }, { pause: 5 }] },
        ],
        keys: [
          { key: 'VolumeUp', action: { device: 'Television', command: 'VolumeUp' } },
          { key: 'VolumeDown', action: { device: 'Receiver', command: 'VolumeDown' } },
        ],
      },
      { name: 'Listen', type: 'ListenToMusic', devices: [{ device: 'Receiver', roles: ['Volume'] }] },
    ],
    favourites: [{ device: 'Television', channels: ['1', '02'] }],
  });
}

/** How often a name stands as a value anywhere in a document, counted over its JSON. */
const mentions = (document: unknown, name: string): number => JSON.stringify(document).split(JSON.stringify(name)).length - 1;

test('a device\'s new name follows it everywhere the document names it, and its device key and staying on are set and given back', () => {
  const document = everywhere();
  // The control for the count: the old name stands in eight places and the new one in none.
  assert.equal(mentions(document, 'Television'), 8);
  assert.equal(mentions(document, 'Screen'), 0);
  const change = recipe.setDevice(document, 'd1', { name: 'Screen' });
  assert.deepEqual(change.effects, []);
  const renamed = change.document;
  assert.equal(mentions(renamed, 'Television'), 0);
  assert.equal(mentions(renamed, 'Screen'), 8);
  // Nothing but the name moved: put back, the document is the one before.
  assert.deepEqual(recipe.setDevice(renamed, 'd1', { name: 'Television' }).document, document);
  assert.deepEqual(readRecipe(JSON.parse(JSON.stringify(renamed))), renamed);
  assert.equal(mentions(document, 'Television'), 8, 'the document given was changed');
  // The device key and staying on: set, and given back with no empty field left behind.
  const bare = recipe.setDevice(document, 'd1', { keptOnBetweenActivities: false, deviceKey: 'none' }).document;
  assert.deepEqual(bare.devices[0], { id: 'd1', name: 'Television', device: 'Made/TV' });
  const again = recipe.setDevice(bare, 'd1', { keptOnBetweenActivities: true, deviceKey: { place: 0 } }).document;
  assert.deepEqual(again, document);
  // A change that states nothing changes nothing.
  assert.deepEqual(recipe.setDevice(document, 'd1', {}).document, document);
});

test('a device\'s change is refused for a device the document does not hold, a name taken or empty, and a device key at no place; four members refuse as not built', () => {
  const document = everywhere();
  assert.deepEqual(refused(() => recipe.setDevice(document, 'd9', { name: 'Screen' })), ['unknown', { kind: 'device', device: 'd9' }]);
  assert.deepEqual(refused(() => recipe.setDevice(document, 'd1', { name: 'Receiver' })), ['invalid', { kind: 'device', device: 'd1' }]);
  assert.deepEqual(refused(() => recipe.setDevice(document, 'd1', { deviceKey: { place: -1 } })), ['invalid', { kind: 'device', device: 'd1' }]);
  assert.ok(refused(() => recipe.setDevice(document, 'd1', { name: '  ' })) !== undefined);
  // Its own name again is no name taken.
  assert.deepEqual(recipe.setDevice(document, 'd1', { name: 'Television' }).document, document);
  const waits: [Parameters<typeof recipe.setDevice>[2], string, number][] = [
    [{ power: 'default' }, 'its power', 14], [{ inputs: 'default' }, 'its inputs', 15],
    [{ timing: 'default' }, 'its timing', 16], [{ channelTuning: 'default' }, 'its channel tuning', 18],
  ];
  for (const [changes, what, requirement] of waits) {
    assert.throws(() => recipe.setDevice(document, 'd1', changes),
      (error: unknown) => error instanceof NotBuiltError && error.contract === `recipe.setDevice for ${what}` && error.requirement === requirement);
  }
});

test('an activity\'s name, kind and devices are changed, the devices whole and in the order given, and the rest of it stays', () => {
  const document = everywhere();
  const change = recipe.setActivity(document, 'a1', {
    name: 'Television', type: 'WatchMovie', devices: [{ device: 'd2', roles: ['Volume'] }, { device: 'd1', roles: ['Display', 'ChannelChanging'] }],
  });
  assert.deepEqual(change.effects, []);
  const changed = change.document.activities[0]!;
  assert.deepEqual([changed.id, changed.name, changed.type], ['a1', 'Television', 'WatchMovie']);
  assert.deepEqual(changed.devices, [{ device: 'Receiver', roles: ['Volume'] }, { device: 'Television', roles: ['Display', 'ChannelChanging'] }]);
  // Its screen and its keys are not the change's to touch, and neither is the other activity.
  assert.deepEqual(changed.screen, document.activities[0]!.screen);
  assert.deepEqual(changed.keys, document.activities[0]!.keys);
  assert.deepEqual(change.document.activities[1], document.activities[1]);
  assert.deepEqual(readRecipe(JSON.parse(JSON.stringify(change.document))), change.document);
  assert.deepEqual(recipe.setActivity(document, 'a1', {}).document, document);
});

test('an activity\'s change is refused for an activity or a device the document does not hold, a name taken, a device twice and a job no activity has; three members refuse as not built', () => {
  const document = everywhere();
  assert.deepEqual(refused(() => recipe.setActivity(document, 'a9', { name: 'Films' })), ['unknown', { kind: 'activity', activity: 'a9' }]);
  assert.deepEqual(refused(() => recipe.setActivity(document, 'a1', { name: 'Listen' })), ['invalid', { kind: 'activity', activity: 'a1' }]);
  assert.deepEqual(refused(() => recipe.setActivity(document, 'a1', { type: '' })), ['invalid', { kind: 'activity', activity: 'a1' }]);
  assert.deepEqual(refused(() => recipe.setActivity(document, 'a1', { devices: [{ device: 'd9', roles: [] }] })), ['unknown', { kind: 'device', device: 'd9' }]);
  assert.deepEqual(refused(() => recipe.setActivity(document, 'a1', { devices: [{ device: 'd2', roles: [] }, { device: 'd2', roles: [] }] })),
    ['invalid', { kind: 'device', device: 'd2' }]);
  assert.deepEqual(refused(() => recipe.setActivity(document, 'a1', { devices: [{ device: 'd2', roles: ['Dancing' as 'Volume'] }] })),
    ['invalid', { kind: 'device', device: 'd2' }]);
  const waits: [Parameters<typeof recipe.setActivity>[2], string, number][] = [
    [{ icon: 'none' }, 'its icon', 27], [{ start: 'default' }, 'its extra steps', 30], [{ end: 'default' }, 'its extra steps', 30],
    [{ activityKey: 'none' }, 'its activity key', 29],
  ];
  for (const [changes, what, requirement] of waits) {
    assert.throws(() => recipe.setActivity(document, 'a1', changes),
      (error: unknown) => error instanceof NotBuiltError && error.contract === `recipe.setActivity for ${what}` && error.requirement === requirement);
  }
});

test('what uses a device is every place that names it, and removing it settles exactly those places, each as an effect', () => {
  const document = everywhere();
  const places = recipe.uses(document, { device: 'd1' });
  assert.deepEqual(places, [
    { kind: 'key', owner: { device: 'd2' }, key: 'VolumeUp' },
    { kind: 'activity-device', activity: 'a1', device: 'd1' },
    { kind: 'screen-item', owner: { activity: 'a1' }, item: 0 },
    { kind: 'screen-item', owner: { activity: 'a1' }, item: 2 },
    { kind: 'screen-item', owner: { activity: 'a1' }, item: 3 },
    { kind: 'key', owner: { activity: 'a1' }, key: 'VolumeUp' },
    { kind: 'favourite', device: 'd1', favourite: 0 },
  ]);
  const change = recipe.remove(document, { device: 'd1' });
  // The effects are the same places, in the same order, and what happened to each.
  assert.deepEqual(change.effects.map((one) => one.place), places);
  assert.deepEqual(change.effects.map((one) => one.effect), ['removed', 'changed', 'removed', 'changed', 'changed', 'removed', 'removed']);
  for (const one of change.effects) assert.match(one.message, /Television/);
  // Nothing names it any more, and what named only the receiver is as it was.
  assert.equal(mentions(change.document, 'Television'), 0);
  assert.deepEqual(change.document.devices, [{ id: 'd2', name: 'Receiver', device: 'Made/AVR' }]);
  assert.deepEqual(change.document.activities[0], {
    id: 'a1', name: 'Watch TV', type: 'WatchTV', devices: [{ device: 'Receiver', roles: ['Volume'] }],
    // The sequence with a step of the receiver's keeps it and its pause; the one left with a pause alone is gone.
    screen: [{ device: 'Receiver', command: 'Dolby' }, { sequence: 'Both', steps: [{ pause: 5 }, { device: 'Receiver', scan: 4 }] }],
    keys: [{ key: 'VolumeDown', action: { device: 'Receiver', command: 'VolumeDown' } }],
  });
  assert.deepEqual(change.document.activities[1], document.activities[1]);
  assert.equal('favourites' in change.document, false);
  assert.deepEqual(readRecipe(JSON.parse(JSON.stringify(change.document))), change.document);
  assert.equal(document.devices.length, 2, 'the document given was changed');
  // The ids that are left keep their own, and the next device takes the number after the highest left.
  assert.equal(recipe.addDevice(change.document, { name: 'Player', device: carried('Made/BD') }).document.devices[1]!.id, 'd3');
  // A device nothing names goes with no effect.
  const unused = recipe.addDevice(document, { name: 'Player', device: carried('Made/BD') }).document;
  assert.deepEqual(recipe.uses(unused, { device: 'd3' }), []);
  const without = recipe.remove(unused, { device: 'd3' });
  assert.deepEqual(without.effects, []);
  // The protocol definition that came with it goes with it, so the document is the one before it was added.
  assert.deepEqual(unused.protocols, [{ name: 'NEC 32 Bit' }]);
  assert.deepEqual(without.document, document);
  // A definition a device that stays is written in stays, and goes with the last device written in it.
  const one = recipe.remove(small(), { device: 'd1' }).document;
  assert.deepEqual(one.protocols, [{ name: 'NEC 32 Bit' }]);
  assert.equal('protocols' in recipe.remove(one, { device: 'd2' }).document, false);
  // One the document held for no device of its own is left alone.
  const held = recipe.open({ ...least(), protocols: [{ name: 'Sony 12 Bit' }] });
  assert.deepEqual(recipe.remove(held, { device: 'd1' }).document.protocols, [{ name: 'Sony 12 Bit' }]);
});

test('an activity is removed with no effect, since nothing names one, and a removal is refused for what the document does not hold', () => {
  const document = everywhere();
  assert.deepEqual(recipe.uses(document, { activity: 'a1' }), []);
  const change = recipe.remove(document, { activity: 'a1' });
  assert.deepEqual(change.effects, []);
  assert.deepEqual(change.document, { ...document, activities: [document.activities[1]] });
  assert.deepEqual(refused(() => recipe.remove(document, { device: 'd9' })), ['unknown', { kind: 'device', device: 'd9' }]);
  assert.deepEqual(refused(() => recipe.remove(document, { activity: 'a9' })), ['unknown', { kind: 'activity', activity: 'a9' }]);
  assert.deepEqual(refused(() => recipe.uses(document, { device: 'd9' })), ['unknown', { kind: 'device', device: 'd9' }]);
  assert.deepEqual(refused(() => recipe.uses(document, { activity: 'a9' })), ['unknown', { kind: 'activity', activity: 'a9' }]);
  for (const call of [recipe.remove, recipe.uses] as const) {
    assert.throws(() => call(document, { sequence: 's1' }),
      (error: unknown) => error instanceof NotBuiltError && error.contract === `recipe.${call.name} for a sequence` && error.requirement === 37);
  }
});

test('a device, an activity and an activity\'s device go to another position, and a position there is none of is refused', () => {
  const document = everywhere();
  const devices = recipe.move(document, { device: 'd2' }, 0);
  assert.deepEqual(devices.effects, []);
  assert.deepEqual(devices.document.devices.map((one) => one.id), ['d2', 'd1']);
  assert.deepEqual(devices.document.activities, document.activities);
  assert.deepEqual(recipe.move(devices.document, { device: 'd2' }, 1).document, document);
  assert.deepEqual(recipe.move(document, { activity: 'a1' }, 1).document.activities.map((one) => one.id), ['a2', 'a1']);
  const within = recipe.move(document, { activity: 'a1', device: 'd1' }, 1).document;
  assert.deepEqual(within.activities[0]!.devices.map((one) => one.device), ['Receiver', 'Television']);
  assert.deepEqual(within.devices, document.devices);
  // Where it already is, is a position too.
  assert.deepEqual(recipe.move(document, { device: 'd1' }, 0).document, document);
  assert.deepEqual(readRecipe(JSON.parse(JSON.stringify(within))), within);
  for (const to of [2, -1, 0.5]) {
    assert.deepEqual(refused(() => recipe.move(document, { device: 'd1' }, to)), ['invalid', { kind: 'device', device: 'd1' }]);
    assert.deepEqual(refused(() => recipe.move(document, { activity: 'a1' }, to)), ['invalid', { kind: 'activity', activity: 'a1' }]);
    assert.deepEqual(refused(() => recipe.move(document, { activity: 'a1', device: 'd1' }, to)), ['invalid', { kind: 'activity-device', activity: 'a1', device: 'd1' }]);
  }
  // A device the activity does not use has no position in it.
  assert.deepEqual(refused(() => recipe.move(document, { activity: 'a2', device: 'd1' }, 0)), ['unknown', { kind: 'activity-device', activity: 'a2', device: 'd1' }]);
  assert.deepEqual(refused(() => recipe.move(document, { device: 'd9' }, 0)), ['unknown', { kind: 'device', device: 'd9' }]);
});

test('a device\'s commands and inputs are its definition\'s, in its order, and a device that carries none is refused and not answered with an empty list', () => {
  const document = small();
  assert.deepEqual(recipe.commands(document, 'd1'), [
    { name: 'VolumeUp', changed: false, learned: false }, { name: 'VolumeDown', changed: false, learned: false },
    { name: 'InputHdmi1', changed: false, learned: false },
  ]);
  assert.deepEqual(recipe.inputs(document, 'd1'), ['HDMI 1']);
  assert.deepEqual(refused(() => recipe.commands(document, 'd9')), ['unknown', { kind: 'device', device: 'd9' }]);
  const bare = recipe.open(least());
  for (const call of [recipe.commands, recipe.inputs] as const) {
    assert.throws(() => call(bare, 'd1'), (error: unknown) => error instanceof RecipeError && /carries no definition/.test(error.message));
  }
});

test('a document that carries a remote\'s own documents\' part is changed by nothing, each change refusing by name, and still answers', () => {
  const document = recipe.open({ ...least(), model: { name: 'Harmony Touch' }, touch: {} });
  const changes: [string, () => unknown][] = [
    ['addDevice', () => recipe.addDevice(document, { name: 'Player', device: carried('Made/BD') })],
    ['addActivity', () => recipe.addActivity(document, { name: 'Listen', type: 'ListenToMusic', devices: [] })],
    ['setDevice', () => recipe.setDevice(document, 'd1', { name: 'Screen' })],
    ['setActivity', () => recipe.setActivity(document, 'a1', { name: 'Films' })],
    ['setKey', () => recipe.setKey(document, { owner: { device: 'd1' }, key: 'VolumeUp' }, { nothing: true })],
    ['remove', () => recipe.remove(document, { device: 'd1' })],
    ['move', () => recipe.move(document, { device: 'd1' }, 0)],
  ];
  for (const [name, call] of changes) {
    assert.throws(call, (error: unknown) => error instanceof NotBuiltError
      && error.contract === `recipe.${name} for a document of a remote given documents` && error.requirement === 76, name);
  }
  // The control: the same seven calls on the same document without that part all answer.
  const plain = recipe.open(least());
  assert.equal(recipe.setDevice(plain, 'd1', { name: 'Screen' }).document.devices[0]!.name, 'Screen');
  assert.equal(recipe.remove(plain, { device: 'd1' }).document.devices.length, 0);
  // The questions answer for it as for any other.
  assert.deepEqual(recipe.devices(document).map((one) => one.id), ['d1']);
  assert.deepEqual(recipe.uses(document, { device: 'd1' }), [{ kind: 'activity-device', activity: 'a1', device: 'd1' }]);
});
