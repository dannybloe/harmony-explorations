/**
 * The maps a family carries, decision 43, `families/maps.ts`: four members a family states and one resolve for every
 * family. No family states maps yet, so the resolve is held here against a family made up for the test, small enough
 * to read whole: three places, a device rule that binds a key to the command of its own name, and an activity rule
 * that takes the volume key from the device holding `Volume`, and everything else, its screen included, from the one
 * changing channels.
 *
 * What is held: every place an owner binds is answered, bound or not, each marked default or chosen; a choice stands
 * over the default and only on its own press, a choice of nothing on a place with no default included, and a choice
 * for a press the place lacks is not answered; an activity is derived from its devices' **default** maps, keys and
 * screen, so a choice in a device's own map changes no activity, `reference/how-a-harmony-works.md`; a screen stated
 * is the document's whole and an absent one the family's; a device whose commands cannot be read fails the whole
 * resolve; and the lookup by model answers no maps for any model today.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import type { CatalogueSource } from '../../src/catalogue/catalogue.ts';
import { resolveMaps, type ActivityMap, type DeviceMap, type FamilyMaps, type MapCommand, type MapPlace } from '../../src/families/maps.ts';
import { mapsOfModel, NoFamilyError } from '../../src/families/registry.ts';
import { readRecipe, RecipeError } from '../../src/recipe/recipe.ts';

const PLACES: readonly MapPlace[] = [
  { key: 'VolumeUp', surface: 'keypad', presses: ['short', 'held'], boundBy: 'both', built: true },
  { key: 'Play', surface: 'keypad', presses: ['short'], boundBy: 'both', built: true },
  { key: 'SwipeUp', surface: 'gesture', presses: ['short', 'double'], boundBy: 'activity', built: true },
];

/**
 * A family made up for the test: a key sends the command of its own name where the device carries one. A device
 * carrying no definition has commands it cannot read, since no catalogue is given here, as a real family's would.
 */
const MADE_UP: FamilyMaps = {
  places: () => PLACES,
  commands: (device) => {
    if (device.definition === undefined) throw new RecipeError(`${device.name} carries no definition, and no catalogue holds ${device.device}`);
    return device.definition.commands.map((one) => ({ name: one.name, carried: !one.keycode.startsWith('none') }));
  },
  deviceMap: (commands: readonly MapCommand[]): DeviceMap => {
    const carried = new Set(commands.filter((one) => one.carried).map((one) => one.name));
    return {
      keys: ['VolumeUp', 'Play'].filter((key) => carried.has(key)).map((key) => ({ key, press: 'short' as const, command: key })),
      screen: commands.filter((one) => one.carried && one.name !== 'VolumeUp' && one.name !== 'Play').map((one) => ({ command: one.name })),
    };
  },
  activityMap: (activity, deviceOf): ActivityMap => {
    const holding = (role: string): string | undefined => activity.devices.find((one) => one.roles.some((r) => r === role))?.device;
    const out: ActivityMap['keys'][number][] = [];
    const volume = holding('Volume');
    const control = holding('ChannelChanging');
    for (const [device, keys] of [[volume, ['VolumeUp']], [control, ['Play']]] as const) {
      if (device === undefined) continue;
      for (const one of deviceOf(device).map.keys) if ((keys as readonly string[]).includes(one.key)) out.push({ ...one, device });
    }
    // The swipe takes the volume device's volume key, as a gesture of a made up remote might.
    const up = out.find((one) => one.key === 'VolumeUp');
    if (up !== undefined) out.push({ ...up, key: 'SwipeUp' });
    // The screen is the channel changing device's default screen, which a choice in its own map could differ from.
    const screen = control === undefined ? [] : deviceOf(control).map.screen.flatMap((one) => ('command' in one ? [{ device: control, command: one.command }] : []));
    return { keys: out, screen };
  },
};

const NO_CATALOGUE = {} as CatalogueSource;

const definition = (...names: string[]): unknown => ({ record: { codeset: 'made/up' }, commands: names.map((name) => ({ name, keycode: name === 'Netflix' ? 'none' : 'NEC1:1:0:1' })) });

function document(overrides: { device?: Record<string, unknown>; activity?: Record<string, unknown> } = {}) {
  return readRecipe({
    version: 2, model: { name: 'Harmony One', skin: 54 },
    devices: [
      { id: 'd1', name: 'Television', device: 'Made/TV', definition: definition('VolumeUp', 'Play', 'Guide', 'Netflix'), ...overrides.device },
      { id: 'd2', name: 'Receiver', device: 'Made/AVR', definition: definition('VolumeUp', 'Surround') },
    ],
    activities: [{
      id: 'a1', name: 'Watch TV', type: 'WatchTV',
      devices: [{ device: 'Television', roles: ['ChannelChanging'] }, { device: 'Receiver', roles: ['Volume'] }],
      ...overrides.activity,
    }],
  });
}

test('every place an owner binds is answered, bound or not, and a device\'s own map is its default where nothing is chosen', () => {
  const { devices } = resolveMaps(MADE_UP, 54, document(), NO_CATALOGUE);
  const tv = devices[0]!;
  assert.equal(tv.id, 'd1');
  // The gesture is the activity's alone; the held volume key is unbound by default; a command not carried is not shown.
  assert.deepEqual(tv.keys.map((one) => [one.key, one.press, one.action, one.isDefault]), [
    ['VolumeUp', 'short', { device: 'Television', command: 'VolumeUp' }, true],
    ['VolumeUp', 'held', { nothing: true }, true],
    ['Play', 'short', { device: 'Television', command: 'Play' }, true],
  ]);
  assert.deepEqual(tv.screen, { items: [{ device: 'Television', command: 'Guide' }], isDefault: true });
  assert.deepEqual(devices[1]!.keys.find((one) => one.key === 'Play')?.action, { nothing: true });
});

test('a choice stands over the default on its own press only, and changes no activity, which derives from its devices\' default maps', () => {
  const chosen = document({
    device: {
      keys: [{ key: 'VolumeUp', action: { device: 'Receiver', command: 'VolumeUp' } }, { key: 'VolumeUp', press: 'held', action: { device: 'Television', command: 'Guide' } }],
      screen: [{ device: 'Receiver', command: 'Surround', label: 'Sound' }],
    },
  });
  const { devices, activities } = resolveMaps(MADE_UP, 54, chosen, NO_CATALOGUE);
  assert.deepEqual(devices[0]!.keys.map((one) => [one.key, one.press, one.action, one.isDefault]), [
    ['VolumeUp', 'short', { device: 'Receiver', command: 'VolumeUp' }, false],
    ['VolumeUp', 'held', { device: 'Television', command: 'Guide' }, false],
    ['Play', 'short', { device: 'Television', command: 'Play' }, true],
  ]);
  assert.deepEqual(devices[0]!.screen, { items: [{ device: 'Receiver', command: 'Surround', label: 'Sound' }], isDefault: false });
  // The activity's Play still follows the television's default map, and its volume the receiver's.
  const watch = activities[0]!;
  assert.deepEqual(watch.keys.filter((one) => one.press === 'short').map((one) => [one.key, one.action, one.isDefault]), [
    ['VolumeUp', { device: 'Receiver', command: 'VolumeUp' }, true],
    ['Play', { device: 'Television', command: 'Play' }, true],
    ['SwipeUp', { device: 'Receiver', command: 'VolumeUp' }, true],
  ]);
  assert.deepEqual(watch.screen, { items: [{ device: 'Television', command: 'Guide' }], isDefault: true });
  // The control: the same document with nothing chosen gives the activity the same keys and screen, the whole of it,
  // so neither the device's chosen keys nor its chosen screen reached the activity.
  assert.deepEqual(resolveMaps(MADE_UP, 54, document(), NO_CATALOGUE).activities[0], watch);
});

test('a choice of nothing stands on a place with no default, and a choice for a press the place lacks is not answered', () => {
  // The receiver carries no Play, so its own map binds the key to nothing by default; a choice of nothing there is
  // the person's, marked so. Play has no held press, so a choice for one is not a place at all.
  const chosen = document({ device: { keys: [{ key: 'Play', press: 'held', action: { device: 'Television', command: 'Guide' } }] } });
  const receiver = { ...chosen.devices[1]!, keys: [{ key: 'Play', action: { nothing: true as const } }] };
  const { devices } = resolveMaps(MADE_UP, 54, { ...chosen, devices: [chosen.devices[0]!, receiver] }, NO_CATALOGUE);
  assert.deepEqual(devices[1]!.keys.find((one) => one.key === 'Play'), { key: 'Play', surface: 'keypad', press: 'short', action: { nothing: true }, isDefault: false });
  assert.deepEqual(devices[0]!.keys.filter((one) => one.key === 'Play').map((one) => [one.press, one.isDefault]), [['short', true]]);
  // The control: without the choice the receiver's Play is the same nothing, by default.
  assert.deepEqual(resolveMaps(MADE_UP, 54, document(), NO_CATALOGUE).devices[1]!.keys.find((one) => one.key === 'Play')?.isDefault, true);
});

test('a device whose commands cannot be read fails the whole resolve, not that device alone', () => {
  const bare = document({ device: { definition: undefined } });
  assert.throws(() => resolveMaps(MADE_UP, 54, bare, NO_CATALOGUE), (error: unknown) => error instanceof RecipeError && /Television carries no definition/.test(error.message));
});

test('an activity\'s choice stands over its default, a gesture\'s second press among them, and its screen is the document\'s where stated', () => {
  const chosen = document({
    activity: {
      keys: [{ key: 'Play', action: { nothing: true } }, { key: 'SwipeUp', press: 'double', action: { device: 'Television', command: 'Guide' } }],
      sequences: [{ name: 'Films', steps: [{ device: 'Television', command: 'Netflix' }] }],
      screen: [{ device: 'Television', command: 'Guide', label: 'TV guide' }, { sequence: 'Films' }],
    },
  });
  const watch = resolveMaps(MADE_UP, 54, chosen, NO_CATALOGUE).activities[0]!;
  assert.deepEqual(watch.keys.map((one) => [one.key, one.press, one.action, one.isDefault]), [
    ['VolumeUp', 'short', { device: 'Receiver', command: 'VolumeUp' }, true],
    ['VolumeUp', 'held', { nothing: true }, true],
    ['Play', 'short', { nothing: true }, false],
    ['SwipeUp', 'short', { device: 'Receiver', command: 'VolumeUp' }, true],
    ['SwipeUp', 'double', { device: 'Television', command: 'Guide' }, false],
  ]);
  assert.deepEqual(watch.screen, { items: [{ device: 'Television', command: 'Guide', label: 'TV guide' }, { sequence: 'Films' }], isDefault: false });
  // A choice for a place the model does not have builds nothing and is the check's to list, so it is not answered.
  const elsewhere = document({ activity: { keys: [{ key: 'Red', action: { nothing: true } }] } });
  assert.equal(resolveMaps(MADE_UP, 54, elsewhere, NO_CATALOGUE).activities[0]!.keys.some((one) => one.key === 'Red'), false);
});

test('an activity using a device the document does not hold is refused, since there is no map to derive from', () => {
  const lost = document({ activity: { devices: [{ device: 'Player', roles: ['ChannelChanging'] }] } });
  assert.throws(() => resolveMaps(MADE_UP, 54, lost, NO_CATALOGUE), /uses Player, which is no device of the document/);
});

test('the lookup by model answers no maps for any family today, and refuses a model no family serves', () => {
  for (const model of [{ name: 'Harmony One', skin: 54 }, { name: 'Harmony 650' }, { name: 'Harmony 350' }, { name: 'Harmony 885' }, { name: 'Harmony Touch' }]) {
    assert.equal(mapsOfModel(model), undefined, model.name);
  }
  assert.throws(() => mapsOfModel({ name: 'Harmony 525' }), NoFamilyError);
});
