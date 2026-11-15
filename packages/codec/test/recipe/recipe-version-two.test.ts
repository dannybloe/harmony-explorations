/**
 * The fields of the recipe's version 2, decision 43: one document shape for every model, where a Harmony Touch's own
 * block held what a person chose about a device or an activity. Each field read as strictly as the fields of version
 * 1: one test per field, a value it takes and the values it refuses, with the reason the refusal names.
 *
 * **Why every field has its refusals listed rather than one sample**: the reader is the only thing between a document
 * written by an application and a build, and a field read loosely is a field whose misspelling becomes a default.
 * **And why a field of version 2 is refused in a document of version 1**: the reader of version 1 refused every field
 * it did not know, so that refusal is what "a document of version 1 reads as before" means, and the last test holds
 * it for every field. The documents built from version 1, the references, state none of these, and their
 * fingerprints are held by `references.test.ts`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readRecipe, RecipeError, unbuiltFields, VERSION_TWO, versionTwoFields, type Recipe } from '../../src/recipe/recipe.ts';

type Json = Record<string, unknown>;

/**
 * A document of version 2 with two devices and one activity that uses both, and the fields given placed on the
 * document, the first device or the activity.
 */
function document(on: { readonly top?: Json; readonly device?: Json; readonly activity?: Json; readonly version?: number | null } = {}): Json {
  return {
    ...(on.version === null ? {} : { version: on.version ?? 2 }),
    model: { name: 'Harmony One', skin: 54 },
    devices: [{ name: 'Television', device: 'Sony/KDL-32W705B', ...on.device }, { name: 'Receiver', device: 'Denon/AVR-1912' }],
    activities: [{
      name: 'Watch TV', type: 'WatchTV',
      devices: [{ device: 'Television', roles: ['Display'] }, { device: 'Receiver', roles: ['Volume'] }],
      ...on.activity,
    }],
    ...on.top,
  };
}

/** The value a field reads as, after a round trip through JSON, which a document makes on every save. */
function readBack(json: Json): Recipe {
  const read = readRecipe(json);
  assert.deepEqual(readRecipe(JSON.parse(JSON.stringify(read))), read, 'a document read and written reads the same');
  return read;
}

/** Each refusal of a field, as `[value, what the refusal says]`. */
function refuses(place: 'top' | 'device' | 'activity', field: string, cases: readonly (readonly [unknown, RegExp])[]): void {
  for (const [value, said] of cases) {
    assert.throws(() => readRecipe(document({ [place]: { [field]: value } })),
      (error: unknown) => error instanceof RecipeError && said.test(error.message), `${field} ${JSON.stringify(value)} refused as ${String(said)}`);
  }
}

test('a device\'s timing takes the catalogue\'s own members, each a whole number but the one flag, and refuses anything else', () => {
  const timing = { interKeyDelay: 300, interDeviceDelay: 500, powerOnDelay: 8000, pressMinRepeats: 2, isInterKeyDelayOptimized: false };
  assert.deepEqual(readBack(document({ device: { timing } })).devices[0]!.timing, timing);
  refuses('device', 'timing', [
    [{ interKeyDelay: -1 }, /interKeyDelay is not a whole number from 0/],
    [{ interKeyDelay: 2.5 }, /interKeyDelay is not a whole number from 0/],
    [{ delay: 300 }, /has a field delay no recipe has/],
    [{ isInterKeyDelayOptimized: 1 }, /isInterKeyDelayOptimized is not true or false/],
    [{}, /timing states nothing/],
    [300, /timing is not an object/],
  ]);
});

test('a device\'s power takes the catalogue\'s members as steps, and always on, and refuses a type or a step it does not know', () => {
  const power = { type: 'toggle', toggle: [{ kind: 'send', command: 'PowerToggle', holdMs: 1000 }], onReset: [{ kind: 'state', state: 'Input', value: 'HDMI 1' }], alwaysOn: true };
  assert.deepEqual(readBack(document({ device: { power } })).devices[0]!.power, power);
  assert.deepEqual(readBack(document({ device: { power: { alwaysOn: true } } })).devices[0]!.power, { alwaysOn: true });
  refuses('device', 'power', [
    [{ type: 'sometimes' }, /type is none of discrete, toggle, none, unknown/],
    [{ on: [{ kind: 'blink' }] }, /on's step 1 is of no kind a step has/],
    [{ on: [{ kind: 'send' }] }, /on's step 1 has no command/],
    [{ on: [{ kind: 'wait', ms: 200, command: 'PowerOn' }] }, /has a field command no recipe has/],
    [{ alwaysOn: 'yes' }, /alwaysOn is not true or false/],
    [{ keptOn: true }, /has a field keptOn no recipe has/],
    [{}, /power states nothing/],
  ]);
});

test('a device\'s channel tuning takes the catalogue\'s shape, its steps naming commands, and refuses digits below one', () => {
  const channelTuning = { fixedDigits: 2, start: [{ kind: 'wait', ms: 200 }], finish: [{ kind: 'send', command: 'Enter' }], greaterTen: [{ kind: 'hold', command: 'Dash' }] };
  assert.deepEqual(readBack(document({ device: { channelTuning } })).devices[0]!.channelTuning, channelTuning);
  refuses('device', 'channelTuning', [
    [{ fixedDigits: 0 }, /fixedDigits is not a whole number from 1/],
    [{ start: 'Enter' }, /start is not a list/],
    [{ finish: ['Enter'] }, /finish's step 1 is not an object/],
    [{ digits: 2 }, /has a field digits no recipe has/],
    [{}, /channel tuning states nothing/],
  ]);
});

test('a device\'s screen is stated whole, an empty list for none, each entry a command with its label', () => {
  assert.deepEqual(readBack(document({ device: { screen: [] } })).devices[0]!.screen, []);
  const screen = [{ device: 'Television', command: 'Netflix', label: 'Films' }, { device: 'Receiver', command: 'ModeMovie' }];
  assert.deepEqual(readBack(document({ device: { screen } })).devices[0]!.screen, screen);
  refuses('device', 'screen', [
    [[{ device: 'Television' }], /screen item 1 has no command/],
    [[{ device: 'Television', command: 'Netflix', icon: 'film' }], /has a field icon no recipe has/],
    [[{ device: 'Television', command: 'Netflix', label: '' }], /label is not a name/],
    [[{ sequence: 'Films' }], /screen item 1 has a field sequence no recipe has/],
    [{ device: 'Television', command: 'Netflix' }, /screen is not a list/],
  ]);
});

test('a device\'s commands take a code of either kind and a sending part, by command name, and refuse an entry stating nothing', () => {
  const commands = {
    Netflix: { code: { keycode: 'NEC1:4:0:12' } },
    PowerToggle: { code: { learned: [{ mark: true, us: 9000 }, { mark: false, us: 4500 }] } },
    VolumeUp: { sending: { copies: 2, heldPaceMs: 108.5, leadInMs: 0 } },
  };
  assert.deepEqual(readBack(document({ device: { commands } })).devices[0]!.commands, commands);
  refuses('device', 'commands', [
    [{ Netflix: {} }, /command Netflix states nothing/],
    [{ Netflix: { code: { keycode: '' } } }, /keycode is not a name/],
    [{ Netflix: { code: { keycode: 'NEC1:4:0:12', learned: [] } } }, /has a field keycode no recipe has/],
    [{ Netflix: { code: { learned: [] } } }, /pulses is empty/],
    [{ Netflix: { code: { learned: [{ mark: true, us: 0 }] } } }, /pulse 1's us is not a whole number from 1/],
    [{ Netflix: { code: { learned: [{ mark: 1, us: 560 }] } } }, /pulse 1's mark is not true or false/],
    [{ VolumeUp: { sending: { copies: 0 } } }, /copies is not a whole number from 1/],
    [{ VolumeUp: { sending: { heldPaceMs: -1 } } }, /heldPaceMs is not a number of milliseconds from 0/],
    [{ VolumeUp: { sending: { repeatMs: 100 } } }, /has a field repeatMs no recipe has/],
    [{ VolumeUp: { sending: {} } }, /sending states nothing/],
    [{ VolumeUp: { tuning: {} } }, /has a field tuning no recipe has/],
    [{}, /commands states nothing/],
  ]);
});

test('a key takes a double press, of either owner, and refuses a press there is none of', () => {
  const keys = [{ key: 'Play', press: 'double', action: { nothing: true } }, { key: 'Play', action: { device: 'Television', command: 'Play' } }];
  assert.deepEqual(readBack(document({ device: { keys } })).devices[0]!.keys, keys);
  assert.deepEqual(readBack(document({ activity: { keys } })).activities[0]!.keys, keys);
  refuses('device', 'keys', [
    [[{ key: 'Play', press: 'triple', action: { nothing: true } }], /pressed neither short, held nor double/],
    [[{ key: 'Play', press: 'double', action: { nothing: true } }, { key: 'Play', press: 'double', action: { nothing: true } }], /states one key twice/],
  ]);
});

test('an activity\'s opening screen is a word its family names, which this reader does not judge', () => {
  assert.equal(readBack(document({ activity: { opensOn: 'Favorites' } })).activities[0]!.opensOn, 'Favorites');
  refuses('activity', 'opensOn', [[3, /opensOn is not a name/], ['', /opensOn is not a name/]]);
});

test('an activity\'s hold on the favourites is true or false, and two activities holding them are refused', () => {
  assert.equal(readBack(document({ activity: { favourites: true } })).activities[0]!.favourites, true);
  assert.equal(readBack(document({ activity: { favourites: false } })).activities[0]!.favourites, false);
  refuses('activity', 'favourites', [['yes', /favourites is not true or false/]]);
  const two = document({ activity: { favourites: true } });
  const activity = (two['activities'] as Json[])[0]!;
  two['activities'] = [activity, { ...activity, name: 'Watch a film' }];
  assert.throws(() => readRecipe(two), /two activities hold the favourites/);
});

test('an activity\'s power order names each of its devices once, by name, and nothing else', () => {
  assert.deepEqual(readBack(document({ activity: { powerOrder: ['Receiver', 'Television'] } })).activities[0]!.powerOrder, ['Receiver', 'Television']);
  refuses('activity', 'powerOrder', [
    [['Television'], /power order does not name each of its devices once/],
    [['Television', 'Receiver', 'Television'], /power order does not name each of its devices once/],
    [['Television', 'Receiver', 'Player'], /power order does not name each of its devices once/],
    [['Television', ''], /power order 2 is not a name/],
    [{ Television: [1, 2] }, /power order is not a list/],
  ]);
});

test('an activity\'s sequences send commands by name and pause in tenths, each named once with a step that sends', () => {
  const sequences = [{ id: 's1', name: 'Films', steps: [{ device: 'Television', command: 'Netflix' }, { pause: 10 }, { device: 'Receiver', command: 'ModeMovie' }] }];
  assert.deepEqual(readBack(document({ activity: { sequences } })).activities[0]!.sequences, sequences);
  refuses('activity', 'sequences', [
    [[{ name: 'Films', steps: [{ pause: 3 }] }], /sequence 1 sends nothing: it has pauses alone/],
    [[{ name: 'Films', steps: [] }], /sequence 1's steps is empty/],
    // A scan code is one family's number, so a step names its command.
    [[{ name: 'Films', steps: [{ device: 'Television', scan: 3 }] }], /has a field scan no recipe has/],
    [[{ name: 'Films', steps: [{ pause: 0 }, { device: 'Television', command: 'Netflix' }] }], /pauses for no whole number of tenths/],
    [[{ name: 'Films', steps: [{ device: 'Television', command: 'Netflix' }] }, { name: 'Films', steps: [{ device: 'Television', command: 'Play' }] }], /names one sequence twice/],
    [[], /sequences is empty/],
  ]);
  // A sequence's id is the document's: two activities' sequences under one id are refused, as two devices are.
  const two = document({ activity: { sequences } });
  const activity = (two['activities'] as Json[])[0]!;
  two['activities'] = [activity, { ...activity, name: 'Watch a film' }];
  assert.throws(() => readRecipe(two), /two of the sequences have one id/);
});

test('an activity\'s extra steps at its start and end send, pause or run one of its own sequences', () => {
  const sequences = [{ name: 'Films', steps: [{ device: 'Television', command: 'Netflix' }] }];
  const steps = [{ device: 'Television', command: 'InputHdmi1' }, { pause: 5 }, { sequence: 'Films' }];
  for (const field of ['start', 'end'] as const) {
    assert.deepEqual(readBack(document({ activity: { sequences, [field]: steps } })).activities[0]![field], steps);
    refuses('activity', field, [
      [[], new RegExp(`${field} is empty`)],
      [[{ sequence: 'Films' }], /runs the sequence Films, which is not one of the activity's/],
      [[{ pause: 0 }], /pauses for no whole number of tenths/],
      [[{ device: 'Television', scan: 3 }], /has a field scan no recipe has/],
    ]);
  }
});

test('an activity\'s screen takes a label on a command and one of its sequences by name; the steps of version 1 still read', () => {
  const sequences = [{ name: 'Films', steps: [{ device: 'Television', command: 'Netflix' }] }];
  const screen = [{ device: 'Television', command: 'Netflix', label: 'Films' }, { sequence: 'Films' }, { sequence: 'Old', steps: [{ device: 'Television', scan: 3 }] }];
  assert.deepEqual(readBack(document({ activity: { sequences, screen } })).activities[0]!.screen, screen);
  refuses('activity', 'screen', [
    [[{ sequence: 'Films' }], /names the sequence Films, which is not one of the activity's/],
    [[{ device: 'Television', command: 'Netflix', label: 3 }], /label is not a name/],
  ]);
});

test('the settings take a text, a number or true or false by name, and the highest ids given whole numbers by kind', () => {
  const settings = { TouchSound: true, Brightness: 20, Language: 'en' };
  assert.deepEqual(readBack(document({ top: { settings } })).settings, settings);
  refuses('top', 'settings', [
    [{ Brightness: null }, /setting Brightness is neither a text, a number nor true or false/],
    [{ Brightness: [20] }, /setting Brightness is neither/],
    [{}, /settings states nothing/],
  ]);
  assert.deepEqual(readBack(document({ top: { highestIds: { device: 5, sequence: 0 } } })).highestIds, { device: 5, sequence: 0 });
  refuses('top', 'highestIds', [
    [{ device: -1 }, /highest device id is not a whole number from 0/],
    [{ remote: 1 }, /has a field remote no recipe has/],
    [{}, /highest ids states nothing/],
  ]);
  // An id past the highest the document says was given contradicts it: the next id given could be one in use.
  const past = document({ top: { highestIds: { device: 1 } }, device: { id: 'd2' } });
  assert.throws(() => readRecipe(past), /the device d2 has a number past 1/);
  // An id written by hand, not of the toolkit's form, is no number and is not judged.
  readBack(document({ top: { highestIds: { device: 1 } }, device: { id: 'television' } }));
});

test('a name a record is keyed by is never __proto__ nor empty, so no command or setting stated can vanish from the document', () => {
  // Parsed from text, as a file arrives: JSON.parse makes __proto__ an own member, where an object literal would not,
  // and a record built by assignment would take it as its prototype and drop the entry.
  const commands = JSON.parse('{"version":2,"model":{"name":"Harmony One","skin":54},"activities":[],'
    + '"devices":[{"name":"Television","device":"Sony/KDL-32W705B","commands":{"__proto__":{"code":{"keycode":"NEC1:1:0:1"}}}}]}') as unknown;
  assert.throws(() => readRecipe(commands), /commands has an entry named __proto__/);
  const settings = JSON.parse('{"__proto__":true}') as Json;
  assert.throws(() => readRecipe(document({ top: { settings } })), /settings has an entry named __proto__/);
  refuses('device', 'commands', [[{ '': { code: { keycode: 'NEC1:1:0:1' } } }, /commands has an entry with no name/]]);
  refuses('top', 'settings', [[{ '': 20 }, /settings has an entry with no name/]]);
  // The control: the same command under an ordinary name is kept, and the guard sees it.
  const kept = readBack(document({ device: { commands: { Netflix: { code: { keycode: 'NEC1:1:0:1' } } } } }));
  assert.deepEqual(unbuiltFields(kept).map((one) => one.where), ['the device Television\'s command Netflix\'s code']);
});

test('numbers past the safe whole numbers are refused, in the highest ids and the timing', () => {
  refuses('top', 'highestIds', [[{ device: 2 ** 53 }, /highest device id is not a whole number from 0/]]);
  refuses('device', 'timing', [[{ interKeyDelay: 2 ** 53 }, /interKeyDelay is not a whole number from 0/]]);
  readBack(document({ top: { highestIds: { device: 2 ** 53 - 1 } } }));
});

test('the steps, screens and keys of version 2 name what the document holds: the activity\'s devices, the document\'s devices and the activity\'s sequences', () => {
  const three = (on: Parameters<typeof document>[0]): Json => {
    const json = document(on);
    (json['devices'] as Json[]).push({ name: 'Player', device: 'Sony/BDP-S1500' });
    return json;
  };
  const refused = (json: Json, said: RegExp): void => {
    assert.throws(() => readRecipe(json), (error: unknown) => error instanceof RecipeError && said.test(error.message), String(said));
  };
  // A step sending to a device of the document the activity does not use: in a sequence, at the start, at the end.
  const toPlayer = [{ device: 'Player', command: 'Play' }];
  refused(three({ activity: { sequences: [{ name: 'Films', steps: toPlayer }] } }), /sequence Films's step 1 sends to Player, which is not one of the activity's devices/);
  refused(three({ activity: { start: toPlayer } }), /start step 1 sends to Player, which is not one of the activity's devices/);
  refused(three({ activity: { end: toPlayer } }), /end step 1 sends to Player, which is not one of the activity's devices/);
  // A screen naming a device the document does not hold, a device's own and an activity's in version 2.
  refused(document({ device: { screen: [{ device: 'Amplifier', command: 'Up' }] } }), /device Television's screen item 1 names Amplifier, which is no device of the recipe/);
  refused(document({ activity: { screen: [{ device: 'Amplifier', command: 'Up' }] } }), /activity Watch TV's screen item 1 names Amplifier, which is no device of the recipe/);
  // A device's own screen may send to any device of the document, as device mode does.
  readBack(three({ device: { screen: [{ device: 'Player', command: 'Play' }] } }));
  // A key running a sequence the activity does not name, and a device's key running one at all.
  refused(document({ activity: { keys: [{ key: 'Play', action: { sequence: 'Films' } }] } }), /Play key runs the sequence Films, which is not one of the activity's/);
  refused(document({ device: { keys: [{ key: 'Play', action: { sequence: 'Films' } }] } }), /device Television's Play key runs the sequence Films, and a device has no sequences/);
  // Either form of a sequence is one a key may run.
  readBack(document({ activity: { sequences: FILMS, keys: [{ key: 'Play', action: { sequence: 'Films' } }] } }));
  readBack(document({ activity: { screen: [{ sequence: 'Old', steps: [{ device: 'Television', scan: 3 }] }], keys: [{ key: 'Play', action: { sequence: 'Old' } }] } }));
  // One name for a sequence written out on the screen and for one of the activity's sequences.
  refused(document({ activity: { sequences: FILMS, screen: [{ sequence: 'Films', steps: [{ device: 'Television', scan: 3 }] }] } }),
    /names two sequences Films, one on its screen with its steps and one of its sequences/);
  // A sequence's id of no form the toolkit gives.
  refused(document({ activity: { sequences: [{ id: 'films', ...FILMS[0]! }] } }), /sequence 1's id films is not of the toolkit's form/);
  // What version 1 allowed it still does: an activity's screen naming a device the document lacks, and a key
  // running a sequence the activity does not name, are the check's to list and the build's to refuse.
  for (const on of [{ activity: { screen: [{ device: 'Amplifier', command: 'Up' }] } }, { activity: { keys: [{ key: 'Play', action: { sequence: 'Films' } }] } }, { device: { keys: [{ key: 'Play', action: { sequence: 'Films' } }] } }]) {
    readRecipe(document({ ...on, version: 1 }));
  }
});

/**
 * **One sample per entry of `VERSION_TWO`**, the table the reader takes its members of version 2 from and the guard
 * of every build walks, keyed as `owner.member` or `owner.member.form`. Each states that field alone, apart from what
 * it needs beside it to read, and `requirements` is what the table must give for it. `alone`, where given, is the
 * document of version 1 to refuse instead, for a form whose neighbour would be refused first.
 */
const FILMS = [{ name: 'Films', steps: [{ device: 'Television', command: 'Netflix' }] }];
const SAMPLES: Readonly<Record<string, { readonly on: Parameters<typeof document>[0]; readonly requirements: readonly (number | undefined)[]; readonly alone?: Parameters<typeof document>[0] }>> = {
  'document.settings': { on: { top: { settings: { Brightness: 20 } } }, requirements: [47] },
  'document.highestIds': { on: { top: { highestIds: { device: 2 } } }, requirements: [undefined] },
  'device.timing': { on: { device: { timing: { interKeyDelay: 300, pressMinRepeats: 2 } } }, requirements: [16, 17] },
  'device.power': { on: { device: { power: { alwaysOn: true } } }, requirements: [14] },
  'device.channelTuning': { on: { device: { channelTuning: { fixedDigits: 2 } } }, requirements: [18] },
  'device.screen': { on: { device: { screen: [] } }, requirements: [35] },
  'device.commands': { on: { device: { commands: { Netflix: { code: { keycode: 'NEC1:4:0:12' }, sending: { copies: 2 } } } } }, requirements: [19, 89] },
  'device.keys.double': { on: { device: { keys: [{ key: 'Play', press: 'double', action: { nothing: true } }] } }, requirements: [40] },
  'activity.opensOn': { on: { activity: { opensOn: 'Favorites' } }, requirements: [91] },
  'activity.favourites': { on: { activity: { favourites: true } }, requirements: [45] },
  'activity.powerOrder': { on: { activity: { powerOrder: ['Television', 'Receiver'] } }, requirements: [90] },
  'activity.start': { on: { activity: { start: [{ pause: 5 }] } }, requirements: [30] },
  'activity.end': { on: { activity: { end: [{ pause: 5 }] } }, requirements: [30] },
  'activity.sequences': { on: { activity: { sequences: FILMS } }, requirements: [37] },
  'activity.screen.label': { on: { activity: { screen: [{ device: 'Television', command: 'Netflix', label: 'Films' }] } }, requirements: [34] },
  'activity.screen.sequence': {
    on: { activity: { sequences: FILMS, screen: [{ sequence: 'Films' }] } }, requirements: [37],
    alone: { activity: { screen: [{ sequence: 'Films' }] } },
  },
  'activity.keys.double': { on: { activity: { keys: [{ key: 'Play', press: 'double', action: { nothing: true } }] } }, requirements: [40] },
};

test('every entry of the table of version 2 has a sample, reads in version 2, is listed with its requirements and is refused in version 1', () => {
  const keyOf = (one: (typeof VERSION_TWO)[number]): string => [one.owner, one.member, ...(one.form === undefined ? [] : [one.form])].join('.');
  // Both ways: a member added to the table without a sample here fails, and so does a sample of a member gone.
  assert.deepEqual(Object.keys(SAMPLES).sort(), VERSION_TWO.map(keyOf).sort());
  for (const entry of VERSION_TWO) {
    const key = keyOf(entry);
    const sample = SAMPLES[key]!;
    // The table's own statement of what the entry waits on, which is what the guard refuses with.
    assert.deepEqual(entry.requirements.map((one) => (one === 'none' ? undefined : one)), sample.requirements, `${key}: the table's requirements`);
    const read = readBack(document(sample.on));
    const stated = versionTwoFields(read).filter((one) => one.field === entry.member);
    assert.deepEqual(stated.map((one) => one.requirement), sample.requirements, `${key}: what versionTwoFields lists`);
    // What waits on nothing is no reason to refuse a build; everything else is.
    assert.deepEqual(unbuiltFields(read).filter((one) => one.field === entry.member).map((one) => one.requirement), sample.requirements.filter((one) => one !== undefined), key);
    for (const version of [1, null]) {
      assert.throws(() => readRecipe(document({ ...(sample.alone ?? sample.on), version })), /is of version 2, and the recipe is of version 1/, `${key}, version ${String(version)}`);
    }
  }
});

test('every version 2 field stated at once is listed in the table\'s order, the highest ids not refused, and the references state none', () => {
  const all = readRecipe(document({
    top: { settings: { Brightness: 20 }, highestIds: { device: 2 } },
    device: {
      timing: { interKeyDelay: 300, pressMinRepeats: 2 }, power: { alwaysOn: true }, channelTuning: { fixedDigits: 2 }, screen: [],
      commands: { Netflix: { code: { keycode: 'NEC1:4:0:12' }, sending: { copies: 2 } } },
      keys: [{ key: 'Play', press: 'double', action: { nothing: true } }],
    },
    activity: {
      opensOn: 'Favorites', favourites: true, powerOrder: ['Television', 'Receiver'], start: [{ pause: 5 }], end: [{ pause: 5 }], sequences: FILMS,
      screen: [{ device: 'Television', command: 'Netflix', label: 'Films' }, { sequence: 'Films' }],
      keys: [{ key: 'Play', press: 'double', action: { nothing: true } }],
    },
  }));
  assert.deepEqual(versionTwoFields(all).map((one) => [one.field, one.requirement]), [
    ['settings', 47], ['highestIds', undefined],
    ['timing', 16], ['timing', 17], ['power', 14], ['channelTuning', 18], ['screen', 35], ['commands', 19], ['commands', 89], ['keys', 40],
    ['opensOn', 91], ['favourites', 45], ['powerOrder', 90], ['start', 30], ['end', 30], ['sequences', 37], ['screen', 34], ['screen', 37], ['keys', 40],
  ]);
  // The highest ids change no byte a remote receives, so a build has nothing to refuse there.
  assert.deepEqual(unbuiltFields(all).map((one) => one.field).includes('highestIds'), false);
  assert.equal(unbuiltFields(all).length, versionTwoFields(all).length - 1);
  assert.equal(versionTwoFields(all)[2]!.where, 'the device Television\'s delays');

  // The documents of version 1 this repository builds, the references, state none; nor does the plain document.
  assert.deepEqual(versionTwoFields(readRecipe(document())), []);
  const folder = new URL('../references/', import.meta.url).pathname;
  const recipes = readdirSync(folder).filter((f) => f.endsWith('.json') && f !== 'references.json' && f !== 'john-doe-account.json');
  // Every reference `references.json` lists, so a folder read wrong cannot pass by finding none.
  const listed = (JSON.parse(readFileSync(join(folder, 'references.json'), 'utf8')) as { name: string }[]).map((one) => `${one.name}.json`);
  assert.deepEqual([...recipes].sort(), [...new Set(listed)].sort());
  for (const file of recipes) {
    assert.deepEqual(versionTwoFields(readRecipe(JSON.parse(readFileSync(join(folder, file), 'utf8')))), [], file);
  }
});
