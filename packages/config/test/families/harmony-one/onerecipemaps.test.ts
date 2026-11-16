/**
 * **The Harmony One's maps answer what its build binds**, decision 43: what `resolveMaps` says each key of each device's
 * own map and each activity's map does, before anything is built, is what the configuration built from the same
 * document binds there.
 *
 * **How the two sides are read, and why they are independent enough to mean something.** The answer side is
 * `resolveMaps` over the One's maps, `families/harmony-one/recipemaps.ts`: command names from the catalogue's names and
 * the family's rules, with no container. The build side is the configuration `buildFromRecipe` makes, read back through
 * the codec's readers alone, `deviceModeMaps` for a device's own map and `keyCodes` over an activity's set for an
 * activity's, which give the codes a key sends as a device's group and a record; a record is named by matching it with
 * the device's carried commands, its once block built from each command's code word for word and, where no command's
 * block is the record's, the frame value its code states against the frame the record decodes to. So a key agrees where
 * the record the build sends is a code the answer's command states, of the device the answer names, and nothing on both
 * sides agrees where neither sends anything.
 *
 * **What it cannot show**: for a key whose code several commands of the device state, it shows that the build sends the
 * answer's code and not which of those names the build bound; those keys are the fourth count of each owner below.
 *
 * **Two documents.** The references' Harmony One test setup, `one-test`, seven devices and five activities as a person
 * set them up; on it the activity rule's arrow fallback and its volume keys fire and its other three refinements do
 * not, since no control device there draws its Exit command on its screen, binds the upper arrow, or sends its direction
 * commands on the channel keys. So a second document, made up here, has a control device that does all three: a disc
 * player whose Exit key sends Cancel and whose screen draws Exit, whose upper arrow sends PageUp while its screen draws
 * PageDown, and which has no channel commands, so its channel keys send its direction commands. Both carry every
 * definition, so nothing outside the test is read.
 *
 * **What is compared**: every place both maps bind, the 37 keypad keys, for each device and each activity, each short
 * press, since the One has no other; and that no device mode or activity set of either build binds a scan outside those
 * 37 but the activities' own code 55, which their screens bind beside the keypad. The places no device's or activity's
 * map binds are in neither answer.
 *
 * **Where the two sides use separate code, it is held equal here**: whether a screen item is drawn as a name the
 * refinements look for, `oneDrawsName` over the built pad's lines against `oneScreenEntryDraws` over a command's name,
 * on every item of the made up document's devices.
 *
 * **The counts are asserted exactly**, per device and per activity, keys compared, agreeing, sending a command, and
 * sending a code several commands state, and every difference is listed with what each side says.
 *
 * **The controls**: an answer altered three ways is found as a difference on the key altered and nowhere else: another
 * command of the same device, nothing where the build sends, and the right command of the wrong device.
 *
 * Scope: the Harmony One, skin 54, the one family whose maps are built. Read in configurations; no remote is involved.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { slow } from '@freeharmony-sdk/lab';
import '../../../src/support/resources.node.ts';
import {
  activities, buildFromRecipe, type Container, deviceModeMaps, devices, irFrame, irGroups, keyCodes, parse, readRecipe, statedCode,
} from '../../../src/node.ts';
import {
  blockOfStatedCode, handlerSets, infraredCodesPerList, irBlockWords, irHeaderPointers, IR_PULSE_MARK, modeRecords, taggedList,
} from '../../../src/internal.ts';
import { compiledBlockWords, deviceScreenItems, keyRulesIn } from '../../../src/build.ts';
import { carriedCatalogue } from '../../../src/catalogue/carried.ts';
import { resolveMaps, type ResolvedMaps, type ResolvedOwner } from '../../../src/families/maps.ts';
import { mapsOfModel } from '../../../src/families/registry.ts';
import { ONE_RECIPE_KEYS } from '../../../src/families/harmony-one/recipekeys.ts';
import { ONE_HARD_KEYS } from '../../../src/families/harmony-one/devicekeys.ts';
import { ONE_ACTIVITY_KEYS } from '../../../src/families/harmony-one/keypadrules.ts';
import { ONE_MAPS, oneActivityKeyWords, oneScreenEntryDraws } from '../../../src/families/harmony-one/recipemaps.ts';
import { oneDrawsName } from '../../../src/families/harmony-one/screenitems.ts';
import type { Recipe } from '../../../src/recipe/recipe.ts';

const REFERENCES = new URL('../../references/', import.meta.url);
type Json = Record<string, any>;
const ONE_TEST = JSON.parse(readFileSync(new URL('one-test.json', REFERENCES), 'utf8')) as Json;
const BUILT_AT = (JSON.parse(readFileSync(new URL('references.json', REFERENCES), 'utf8')) as Json[])
  .find((one) => one.name === 'one-test')?.builtAt as string;

// ---------------------------------------------------------------------------------------------------
// The made up document whose control device makes the rule's three other refinements fire
// ---------------------------------------------------------------------------------------------------

/** A code of the Toshiba 32 Bit family, which `one-test` carries the definition of: an address and one command byte. */
const toshiba = (byte: number): string => {
  const hex = (n: number): string => n.toString(16).toUpperCase().padStart(2, '0');
  return `G:Toshiba 32 Bit:(0x20DF${hex(byte)}${hex(~byte & 0xff)})(Repeat)():3`;
};
const commandsOf = (names: readonly string[], first: number): Json[] => names.map((name, k) => ({ name, keycode: toshiba(first + k) }));

/**
 * The disc player: no channel commands, so the One's channel keys take its DirectionUp and DirectionDown, as its
 * direction keys do; Cancel and Exit both, so its Exit key takes Cancel and its screen draws Exit; PageUp on the upper
 * arrow and PageDown on the screen, with nothing on the lower arrow; and a name too long for one line of a pad.
 */
const PLAYER_COMMANDS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Cancel', 'Exit', 'PageUp', 'PageDown', 'DirectionUp', 'DirectionDown',
  'DirectionLeft', 'DirectionRight', 'OK', 'SkipForward', 'SkipBack', 'Play', 'Pause', 'Stop', 'Menu', 'Info', 'Guide',
  'PowerToggle', 'Teletext', 'SubtitleLanguage',
];
/** The amplifier: the volume keys, its power and two inputs. */
const AMP_COMMANDS = ['VolumeUp', 'VolumeDown', 'Mute', 'PowerOn', 'PowerOff', 'Input1', 'Input2', '1', '2'];

function madeUpDocument(): Json {
  const record = (name: string): Json => structuredClone((ONE_TEST.devices as Json[]).find((one) => one.name === name)!.definition.record);
  const player = { ...record('Kodi'), codeset: 'codesets/made/player.json', manufacturer: 'Made', model: 'Player', globalDeviceId: 1 };
  const amp = {
    ...record('Switch'), codeset: 'codesets/made/amp.json', manufacturer: 'Made', model: 'Amp', globalDeviceId: 2,
    inputs: { list: [{ commands: ['Input1'], name: 'Input 1' }, { commands: ['Input2'], name: 'Input 2' }], type: 1 },
  };
  return {
    about: 'A made up setup whose disc player makes the activity rule\'s Exit, lower arrow and channel refinements fire.',
    model: ONE_TEST.model,
    devices: [
      { name: 'Player', device: 'Made/Player', definition: { record: player, commands: commandsOf(PLAYER_COMMANDS, 0x10) } },
      { name: 'Amp', device: 'Made/Amp', definition: { record: amp, commands: commandsOf(AMP_COMMANDS, 0x80) } },
    ],
    activities: [
      { name: 'Film', type: 'WatchDvd', devices: [{ device: 'Player', roles: ['PlayMovie'] }, { device: 'Amp', roles: ['Volume'] }] },
      { name: 'Radio', type: 'ListenToMusic', devices: [{ device: 'Amp', roles: ['PlayMedia', 'Volume'] }] },
    ],
    choices: ONE_TEST.choices,
    protocols: ONE_TEST.protocols,
  };
}

/** The device's setup name as the configuration spells its label. */
const spoken = (name: string | undefined): string => (name ?? '?').replaceAll('_', ' ');

// ---------------------------------------------------------------------------------------------------
// Naming a record by the device's own commands
// ---------------------------------------------------------------------------------------------------

/** A block as marks and silences from its first mark, so a lead in of silence does not decide a match. */
function fromFirstMarkWords(pairs: readonly { mark: boolean; us: number }[]): string {
  let k = 0;
  while (k < pairs.length && !(pairs[k] as { mark: boolean }).mark) k += 1;
  return pairs.slice(k).map((p) => `${p.mark ? 'm' : 's'}${p.us}`).join(',');
}

/** A built record's once block, spelt as `fromFirstMarkWords` spells it. */
function recordWords(c: Container, record: number): string | undefined {
  const once = irHeaderPointers(c, record)[0];
  if (once === undefined || once === 0) return undefined;
  const words = irBlockWords(c, once);
  if (words === undefined) return undefined;
  return fromFirstMarkWords(words.filter((w) => w !== 0).map((w) => ({ mark: (w & IR_PULSE_MARK) !== 0, us: w & 0x7fff })));
}

/** A command's once block as its code states it, built and spelt the same way. */
function codeWords(keycode: string): string | undefined {
  const block = blockOfStatedCode(keycode, undefined, 'once');
  if (block === undefined) return undefined;
  return fromFirstMarkWords(compiledBlockWords(block, 0).map((p) => ({ mark: p.mark, us: p.microseconds })));
}

/**
 * The names of a record of one device: every command of its carried definition whose once block is the record's word
 * for word, and where none is, every command whose stated frame value the record decodes to.
 */
function namer(c: Container, commands: readonly { name: string; keycode: string }[]): (record: number) => Set<string> {
  const byWords = new Map<string, Set<string>>();
  const byValue = new Map<string, Set<string>>();
  for (const command of commands) {
    const words = codeWords(command.keycode);
    if (words !== undefined) byWords.set(words, (byWords.get(words) ?? new Set()).add(command.name));
    const value = statedCode(command.keycode)?.frames[0]?.value.toString(16);
    if (value !== undefined) byValue.set(value, (byValue.get(value) ?? new Set()).add(command.name));
  }
  return (record) => {
    const words = recordWords(c, record);
    const named = words === undefined ? undefined : byWords.get(words);
    if (named !== undefined && named.size > 0) return named;
    const value = irFrame(c, record)?.value.toString(16);
    return value === undefined ? new Set() : byValue.get(value) ?? new Set();
  };
}

// ---------------------------------------------------------------------------------------------------
// The build side: every keypad key of every map, as the device and the names of what its press sends
// ---------------------------------------------------------------------------------------------------

/** What a key's press sends on the build side: nothing, or the device and the names of each record it sends. */
type BuiltKey = { readonly nothing: true } | { readonly devices: readonly string[]; readonly names: readonly (readonly string[])[] };

/** Each owner's keys on the build side, by the key's word. */
interface BuiltMaps {
  readonly devices: ReadonlyMap<string, ReadonlyMap<string, BuiltKey>>;
  readonly activities: ReadonlyMap<string, ReadonlyMap<string, BuiltKey>>;
}

function builtMaps(c: Container, recipe: Recipe): BuiltMaps {
  const groups = irGroups(c) ?? [];
  const nameOfGroup = new Map(devices(c).map((one) => [one.group, spoken(one.name)]));
  const namers = new Map(recipe.devices.map((device) => [device.name, namer(c, device.definition?.commands ?? [])]));
  /** A binding's codes as the build side reads them, or nothing where the press sends none. */
  const read = (codes: readonly { group: number; code: number }[]): BuiltKey => {
    if (codes.length === 0) return { nothing: true };
    return {
      devices: codes.map((one) => nameOfGroup.get(one.group) ?? `group ${one.group}`),
      names: codes.map((one) => {
        const record = groups[one.group]?.addresses[one.code];
        const name = nameOfGroup.get(one.group);
        return record === undefined || name === undefined ? [] : [...(namers.get(name)?.(record) ?? [])].sort();
      }),
    };
  };
  /** The 37 keypad keys a map can bind, by word; a key no binding sends from is nothing. */
  const byWord = (bindings: readonly { scan: number; codes: readonly { group: number; code: number }[] }[]): Map<string, BuiltKey> =>
    new Map(ONE_RECIPE_KEYS.keys.map((key) => {
      const scan = ONE_RECIPE_KEYS.scanOf(key);
      return [key, read(bindings.find((one) => one.scan === scan)?.codes ?? [])];
    }));
  const out = { devices: new Map<string, Map<string, BuiltKey>>(), activities: new Map<string, Map<string, BuiltKey>>() };
  for (const map of deviceModeMaps(c)) {
    out.devices.set(nameOfGroup.get(map.group) ?? `group ${map.group}`, byWord(map.keypad.filter((one) => one.event === 2)));
  }
  const codes = keyCodes(c);
  for (const activity of activities(c)) {
    out.activities.set(spoken(activity.name), byWord(codes.filter((one) => one.where === 'set' && one.index === activity.set && one.event === 2)));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------
// The comparison
// ---------------------------------------------------------------------------------------------------

/**
 * One owner's comparison: keys compared, keys agreeing, how many of the agreeing keys send a command rather than
 * nothing, how many of those the build sends a record of that more than one command names, and each difference in
 * words.
 */
interface Compared {
  readonly compared: number;
  readonly agreeing: number;
  readonly sending: number;
  readonly shared: number;
  readonly differences: readonly string[];
}

/** Whether the build's key is what the answer says: nothing on both, or one record of the device, named the command. */
function agrees(answer: ResolvedOwner['keys'][number]['action'], built: BuiltKey): boolean {
  if ('nothing' in answer) return 'nothing' in built;
  if ('nothing' in built || !('device' in answer)) return false;
  return built.devices.length === 1 && built.devices[0] === answer.device && (built.names[0] ?? []).includes(answer.command);
}

const describe = (built: BuiltKey | undefined): string => (built === undefined ? 'no map'
  : 'nothing' in built ? 'nothing'
    : built.devices.map((device, k) => `${device} ${(built.names[k] ?? []).join('|') || 'an unnamed code'}`).join(' + '));

const describeAnswer = (action: ResolvedOwner['keys'][number]['action']): string =>
  ('nothing' in action ? 'nothing' : 'device' in action ? `${action.device} ${action.command}` : `sequence ${action.sequence}`);

function compare(owners: readonly ResolvedOwner[], built: ReadonlyMap<string, ReadonlyMap<string, BuiltKey>>): Map<string, Compared> {
  const out = new Map<string, Compared>();
  for (const owner of owners) {
    const keys = built.get(owner.name);
    let agreeing = 0;
    let sending = 0;
    let shared = 0;
    const differences: string[] = [];
    for (const key of owner.keys) {
      const theirs = keys?.get(key.key);
      if (theirs === undefined || !agrees(key.action, theirs)) {
        differences.push(`${key.key}: answered ${describeAnswer(key.action)}, built ${describe(theirs)}`);
        continue;
      }
      agreeing += 1;
      if ('nothing' in theirs) continue;
      sending += 1;
      if ((theirs.names[0]?.length ?? 0) > 1) shared += 1;
    }
    out.set(owner.name, { compared: owner.keys.length, agreeing, sending, shared, differences });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------
// What a build binds outside the places
// ---------------------------------------------------------------------------------------------------

/** The 37 scans the places name. */
const PLACE_SCANS: ReadonlySet<number> = new Set(ONE_RECIPE_KEYS.keys.map((key) => ONE_RECIPE_KEYS.scanOf(key) as number));

/**
 * Every press each device mode's own map and each activity's set binds to anything, a swallow excepted, on a scan the
 * places do not name, by owner: what a build could bind that the comparison by word would not see.
 */
function boundOutside(c: Container): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  const outside = (start: number | undefined): number[] => (start === undefined ? [] : (taggedList(c, start)?.entries ?? [])
    .filter((one) => one.tag >> 6 === 2 && !(one.opcode === 0 && one.operand === 0) && !PLACE_SCANS.has(one.tag & 0x3f))
    .map((one) => one.tag & 0x3f).sort((a, b) => a - b));
  const nameOfGroup = new Map(devices(c).map((one) => [one.group, spoken(one.name)]));
  for (const map of deviceModeMaps(c)) out[`device ${nameOfGroup.get(map.group)}`] = outside((modeRecords(c) ?? [])[map.mode]?.start);
  for (const activity of activities(c)) out[`activity ${spoken(activity.name)}`] = outside(handlerSets(c)?.addresses[activity.set]);
  return out;
}

// ---------------------------------------------------------------------------------------------------
// The tests
// ---------------------------------------------------------------------------------------------------

/** A document, the maps' answer, the build and the build's maps. */
interface Both {
  readonly recipe: Recipe;
  readonly answer: ResolvedMaps;
  readonly c: Container;
  readonly built: BuiltMaps;
}

function bothOf(json: Json): Both {
  const recipe = readRecipe(json);
  const maps = mapsOfModel(recipe.model);
  assert.ok(maps !== undefined, 'the Harmony One states its maps');
  const answer = resolveMaps(maps.maps, maps.skin, recipe, carriedCatalogue(recipe)!);
  const result = buildFromRecipe(json, { builtAt: BUILT_AT });
  assert.equal(result.kind, 'configuration');
  const c = parse((result as { bytes: Uint8Array }).bytes);
  return { recipe, answer, c, built: builtMaps(c, recipe) };
}

/** Each document made and built once, for the tests below that read it. */
const once = <T>(make: () => T): (() => T) => {
  let made: T | undefined;
  return () => (made ??= make());
};
const oneTest = once(() => bothOf(ONE_TEST));
const madeUp = once(() => bothOf(madeUpDocument()));

/** Per owner: keys compared, agreeing, sending a command, and sending a record several commands name. */
const counts = (compared: ReadonlyMap<string, Compared>): Record<string, [number, number, number, number]> =>
  Object.fromEntries([...compared].map(([name, one]) => [name, [one.compared, one.agreeing, one.sending, one.shared]]));
const listed = (compared: ReadonlyMap<string, Compared>): Record<string, readonly string[]> =>
  Object.fromEntries([...compared].filter(([, one]) => one.differences.length > 0).map(([name, one]) => [name, one.differences]));

/** An owner's answer with one key's action replaced. */
const alter = (owner: ResolvedOwner, key: string, action: ResolvedOwner['keys'][number]['action']): ResolvedOwner =>
  ({ ...owner, keys: owner.keys.map((one) => (one.key === key ? { ...one, action } : one)) });

// --- The maps' own glue, with nothing built ---------------------------------------------------------

/**
 * The places: the 37 keypad keys the One's maps bind, every word the recipe keys take and no other, a short press each,
 * bound by a device's own map and an activity's; and the seven keys of the drawing no such map binds, listed not built
 * with why, the three keypad keys among them and the four touch keys as touch keys. 44 in all, the drawing's count,
 * `reference/remotes/harmony-one/keys.md`.
 */
test('the One\'s places are its 37 keypad keys, a short press each, and the seven keys no device\'s or activity\'s map binds, not built', () => {
  const places = ONE_MAPS.places(54);
  assert.equal(places.length, 44);
  const built = places.filter((one) => one.built);
  assert.deepEqual(built.map((one) => one.key), ONE_RECIPE_KEYS.keys);
  assert.ok(built.every((one) => one.boundBy === 'both' && one.surface === 'keypad' && one.presses.join() === 'short'));
  const remote = places.filter((one) => !one.built);
  assert.deepEqual(remote.map((one) => [one.key, one.surface]), [
    ['Activities', 'keypad'], ['Off', 'keypad'], ['Help', 'keypad'],
    ['ScreenPrev', 'touch'], ['ScreenNext', 'touch'], ['SoftLeft', 'touch'], ['SoftRight', 'touch'],
  ]);
  assert.ok(remote.every((one) => one.boundBy === 'remote' && /^no device's or activity's map binds/.test(one.why ?? '')));
});

/**
 * Every scan the build binds by rule has a word, so the maps can name it: each of the One's hard keys, through which a
 * device's own map is laid out, and each key of the activity rule. Without this a scan with no word fails only when a
 * device happens to use it. The rule in words is held whole, and the control: a rule naming a scan with no word refuses.
 */
test('every scan of the One\'s hard keys and of its activity rule has a word, and the rule in words is the rule in scans', () => {
  const words = new Set(ONE_RECIPE_KEYS.keys);
  const wordOf = (scan: number): string | undefined => ONE_RECIPE_KEYS.keys.find((key) => ONE_RECIPE_KEYS.scanOf(key) === scan);
  assert.deepEqual(ONE_HARD_KEYS.filter((key) => wordOf(key.scan) === undefined).map((key) => key.scan), []);
  assert.ok(ONE_HARD_KEYS.every((key) => words.has(wordOf(key.scan)!)));
  // 36 hard keys over the 37 words: the lower arrow takes no command in a device's own map, section 398.
  assert.equal(ONE_HARD_KEYS.length, 36);
  assert.deepEqual(ONE_RECIPE_KEYS.keys.filter((key) => !ONE_HARD_KEYS.some((one) => one.scan === ONE_RECIPE_KEYS.scanOf(key))), ['DownArrow']);
  const rules = oneActivityKeyWords();
  assert.deepEqual({ ...rules, fallback: [...rules.fallback] }, {
    volume: ['VolumeUp', 'VolumeDown', 'VolumeMute'],
    fallback: [['UpArrow', 'DirectionUp'], ['DownArrow', 'DirectionDown']],
    channel: ['ChannelUp', 'ChannelDown'], direction: ['DirectionUp', 'DirectionDown'], skip: ['SkipForward', 'SkipBack'],
    exit: 'Exit',
    partners: [{ scan: 'DownArrow', when: 'UpArrow', names: ['PageDown', 'StepBack'] }],
  });
  assert.throws(() => keyRulesIn({ ...ONE_ACTIVITY_KEYS, exit: 37 }, wordOf), /no other name, 37/);
});

/**
 * A device's default map drops what the build cannot carry from its keys and its screen, and moves nothing in its place,
 * as the build does: Cancel not carried leaves the Exit and Previous channel keys unbound rather than giving the Exit key
 * Exit, which stays on the screen where the layout put it; VolumeUp not carried leaves its key unbound; Teletext not
 * carried leaves the screen.
 */
test('a device\'s default map drops an uncarried command from its keys and its screen and moves nothing onto its key', () => {
  const map = ONE_MAPS.deviceMap([
    { name: 'Cancel', carried: false }, { name: 'Exit', carried: true }, { name: 'VolumeUp', carried: false },
    { name: 'VolumeDown', carried: true }, { name: 'Teletext', carried: false }, { name: 'Netflix', carried: true },
  ]);
  assert.deepEqual(map.keys, [{ key: 'VolumeDown', press: 'short', command: 'VolumeDown' }]);
  assert.deepEqual(map.screen, [{ command: 'Exit' }, { command: 'Netflix' }]);
  // The control: with everything carried, Cancel takes the Exit and Previous channel keys and VolumeUp its own, and
  // Teletext is on the screen.
  const whole = ONE_MAPS.deviceMap(['Cancel', 'Exit', 'VolumeUp', 'VolumeDown', 'Teletext', 'Netflix'].map((name) => ({ name, carried: true })));
  assert.deepEqual(whole.keys.map((one) => [one.key, one.command]),
    [['Exit', 'Cancel'], ['VolumeUp', 'VolumeUp'], ['VolumeDown', 'VolumeDown'], ['PrevChannel', 'Cancel']]);
  assert.deepEqual(whole.screen, [{ command: 'Teletext' }, { command: 'Exit' }, { command: 'Netflix' }]);
});

// --- The references' test setup --------------------------------------------------------------------

/**
 * Every device of `one-test` agrees on all 37 keys. The third count is the keys that send a command: the Switch, an HDMI
 * switch of ten commands, binds three. The fourth is those whose code more than one command of the device states:
 * catalogue synonyms such as the Denon's Back and Return or Play and Pause, the KPN's ChannelUp and DirectionUp, the
 * Switch's 1 and Input1. Ten on the Denon, five on the KPN, three on the Switch and two each on the LG TV and the Sony.
 */
test('one-test: each device\'s own map as the maps answer it is the map the build binds, key by key', slow(), () => {
  const { answer, built } = oneTest();
  const compared = compare(answer.devices, built.devices);
  assert.deepEqual(listed(compared), {});
  assert.deepEqual(counts(compared), {
    'LG TV': [37, 37, 32, 2], Plasma: [37, 37, 33, 0], Denon: [37, 37, 30, 10], KPN: [37, 37, 29, 5],
    Kodi: [37, 37, 32, 0], Switch: [37, 37, 3, 3], 'Sony HT': [37, 37, 34, 2],
  });
});

/**
 * Every activity of `one-test` agrees on all 37 keys, so the rule in words with the devices' default maps binds what the
 * same rule binds read off the container while the build composes. The two activities that follow the KPN for channels
 * share its seven keys of a shared code.
 */
test('one-test: each activity\'s map as the maps answer it is the map the build binds, key by key', slow(), () => {
  const { answer, built } = oneTest();
  const compared = compare(answer.activities, built.activities);
  assert.deepEqual(listed(compared), {});
  assert.deepEqual(counts(compared), {
    'TV kijken': [37, 37, 33, 7], 'Film kijken': [37, 37, 34, 0], Muziek: [37, 37, 34, 0],
    'Kodi kijken': [37, 37, 34, 0], 'Plasma kijken': [37, 37, 33, 7],
  });
});

/** Nothing either map binds escapes the comparison: no device mode binds a scan outside the 37, and each activity code 55 alone. */
test('one-test: the build binds no scan outside the 37 places in a device mode, and code 55 alone in an activity', slow(), () => {
  assert.deepEqual(boundOutside(oneTest().c), {
    'device LG TV': [], 'device Plasma': [], 'device Denon': [], 'device KPN': [], 'device Kodi': [], 'device Switch': [],
    'device Sony HT': [],
    'activity TV kijken': [55], 'activity Film kijken': [55], 'activity Muziek': [55], 'activity Kodi kijken': [55],
    'activity Plasma kijken': [55],
  });
});

/**
 * The controls: an answer altered each way an answer can be wrong is found on the key altered and nowhere else. The LG
 * TV's 1 key answered as its 2, a command of the same device with another code; TV kijken's volume up answered as nothing
 * where the build sends the Denon's; and TV kijken's 1 key answered as the LG TV's 1 where the build sends the KPN's 1,
 * which only the comparison of the device catches, since the command's name is the KPN's too.
 */
test('one-test, the controls: an altered answer is a difference, on the key altered and nowhere else', slow(), () => {
  const { answer, built } = oneTest();
  const tv = answer.devices.find((one) => one.name === 'LG TV')!;
  assert.deepEqual(tv.keys.find((one) => one.key === 'Number1')?.action, { device: 'LG TV', command: '1' });
  const devicesCompared = compare([alter(tv, 'Number1', { device: 'LG TV', command: '2' })], built.devices);
  assert.deepEqual(listed(devicesCompared), { 'LG TV': ['Number1: answered LG TV 2, built LG TV 1'] });
  assert.deepEqual(counts(devicesCompared), { 'LG TV': [37, 36, 31, 2] });
  const watch = answer.activities.find((one) => one.name === 'TV kijken')!;
  assert.deepEqual(watch.keys.find((one) => one.key === 'VolumeUp')?.action, { device: 'Denon', command: 'VolumeUp' });
  const nothing = listed(compare([alter(watch, 'VolumeUp', { nothing: true })], built.activities));
  assert.deepEqual(Object.keys(nothing), ['TV kijken']);
  assert.equal(nothing['TV kijken']!.length, 1);
  assert.match(nothing['TV kijken']![0]!, /^VolumeUp: answered nothing, built Denon .*VolumeUp/);
  assert.deepEqual(watch.keys.find((one) => one.key === 'Number1')?.action, { device: 'KPN', command: '1' });
  const elsewhere = compare([alter(watch, 'Number1', { device: 'LG TV', command: '1' })], built.activities);
  assert.deepEqual(listed(elsewhere), { 'TV kijken': ['Number1: answered LG TV 1, built KPN 1'] });
  assert.deepEqual(counts(elsewhere), { 'TV kijken': [37, 36, 32, 7] });
});

// --- The made up document --------------------------------------------------------------------------

/**
 * The refinements fire on the maps' side: Film's Exit key sends the player's Exit where its own Exit key sends Cancel,
 * its lower arrow the player's PageDown, which its own map leaves unbound, and its channel keys the player's skip
 * commands where its own map sends DirectionUp and DirectionDown on them. Held before the comparison, so that the
 * comparison below is known to cover them.
 */
test('made up: the disc player makes the Exit, lower arrow and channel refinements fire in the maps\' answer', slow(), () => {
  const { answer } = madeUp();
  const own = answer.devices.find((one) => one.name === 'Player')!;
  const film = answer.activities.find((one) => one.name === 'Film')!;
  const at = (owner: ResolvedOwner, key: string) => owner.keys.find((one) => one.key === key)?.action;
  assert.deepEqual([at(own, 'Exit'), at(film, 'Exit')], [{ device: 'Player', command: 'Cancel' }, { device: 'Player', command: 'Exit' }]);
  assert.deepEqual([at(own, 'DownArrow'), at(own, 'UpArrow'), at(film, 'DownArrow')],
    [{ nothing: true }, { device: 'Player', command: 'PageUp' }, { device: 'Player', command: 'PageDown' }]);
  assert.deepEqual([at(own, 'ChannelUp'), at(own, 'ChannelDown'), at(film, 'ChannelUp'), at(film, 'ChannelDown')], [
    { device: 'Player', command: 'DirectionUp' }, { device: 'Player', command: 'DirectionDown' },
    { device: 'Player', command: 'SkipForward' }, { device: 'Player', command: 'SkipBack' },
  ]);
  assert.deepEqual(at(film, 'VolumeUp'), { device: 'Amp', command: 'VolumeUp' });
});

/**
 * Every key of every device and activity of the made up document agrees, the three refinements among them: the player
 * binds 28 keys and the amplifier 5, Film 32 and Radio 5, and no code of the document is stated by two commands, so the
 * fourth count is 0 throughout and every name is the build's own.
 */
test('made up: each device\'s and each activity\'s map as the maps answer it is the map the build binds, key by key', slow(), () => {
  const { answer, built } = madeUp();
  const devicesCompared = compare(answer.devices, built.devices);
  const activitiesCompared = compare(answer.activities, built.activities);
  assert.deepEqual(listed(devicesCompared), {});
  assert.deepEqual(listed(activitiesCompared), {});
  assert.deepEqual(counts(devicesCompared), { Player: [37, 37, 28, 0], Amp: [37, 37, 5, 0] });
  assert.deepEqual(counts(activitiesCompared), { Film: [37, 37, 32, 0], Radio: [37, 37, 5, 0] });
});

/** Nothing either map binds escapes the comparison on the made up document either. */
test('made up: the build binds no scan outside the 37 places in a device mode, and code 55 alone in an activity', slow(), () => {
  assert.deepEqual(boundOutside(madeUp().c), { 'device Player': [], 'device Amp': [], 'activity Film': [55], 'activity Radio': [55] });
});

/**
 * **The two decisions of whether a screen item is drawn as a name agree**: the build's, `oneDrawsName`, which lays the
 * name out on a pad in the configuration's font and compares the lines the item draws, and the maps',
 * `oneScreenEntryDraws`, which compares the name with the command's. They cannot be one function, since the maps read no
 * container and a container holds drawn text and not a command's name, `families/harmony-one/recipemaps.ts`. Asked of
 * every item of each device's own screen in the build that sends a code, for every name the activity rule looks for and
 * for the item's own command's name, against the maps' default screen entry of that command: the item is named by the
 * records its key sends, one name each here since every code of the document is its own. The amplifier's screen holds
 * one item more, which draws no label and sends no code, running a value map; it is not a command, so it is counted and
 * not asked.
 *
 * **The control is the measured parting**: the build draws the player's SubtitleLanguage as Subtitle Language too, two
 * lines either way, and the maps do not, which is why the rule's names, each of one line, are what the two must agree on.
 */
test('made up: whether a screen item is drawn as a name is decided alike by the build and by the maps, item by item', slow(), () => {
  const { recipe, c } = madeUp();
  const catalogue = carriedCatalogue(recipe)!;
  const sends = infraredCodesPerList(c);
  const groups = irGroups(c) ?? [];
  const asked = ['Exit', ...(ONE_ACTIVITY_KEYS.partners ?? []).flatMap((one) => one.names)];
  const out: Record<string, { items: number; sendNothing: number; asked: number; drawn: number }> = {};
  const differences: string[] = [];
  for (const device of devices(c)) {
    const name = spoken(device.name);
    const own = recipe.devices.find((one) => one.name === name)!;
    const named = namer(c, own.definition?.commands ?? []);
    const entries = ONE_MAPS.deviceMap(ONE_MAPS.commands(own, catalogue)).screen.flatMap((one) => ('command' in one ? [one] : []));
    const count = { items: 0, sendNothing: 0, asked: 0, drawn: 0 };
    // Every device of the document sends codes, so each has a group; one without would have no screen to ask.
    assert.ok(device.group !== undefined, `${name} has an infrared group`);
    for (const item of deviceScreenItems(c, device.group)) {
      count.items += 1;
      const records = (sends.get(item.list) ?? []).map((one) => groups[one.group]?.addresses[one.code] as number);
      if (records.length === 0) {
        count.sendNothing += 1;
        continue;
      }
      const commands = [...new Set(records.flatMap((record) => [...named(record)]))];
      assert.equal(commands.length, 1, `${name}'s item ${item.label} sends one command`);
      const entry = entries.find((one) => one.command === commands[0]);
      assert.ok(entry !== undefined, `${name}'s ${commands[0]} is on the maps' default screen`);
      for (const asking of [...asked, entry.command]) {
        count.asked += 1;
        const build = oneDrawsName(c, item, asking);
        if (build) count.drawn += 1;
        if (build !== oneScreenEntryDraws(entry, asking)) differences.push(`${name} ${entry.command} as ${asking}: build ${build}`);
      }
    }
    out[name] = count;
  }
  assert.deepEqual(differences, []);
  // Each item drawn as its own name, and the player's Exit and PageDown items as the names the rule asks for, which the
  // own name asks again: 5 and 2 on the player, 4 on the amplifier, whose screen draws none of the rule's names.
  assert.deepEqual(out, {
    Player: { items: 5, sendNothing: 0, asked: 20, drawn: 7 },
    Amp: { items: 5, sendNothing: 1, asked: 16, drawn: 4 },
  });
  // The control: a name the pad draws alike on two lines, which the build takes and the maps do not.
  const player = devices(c).find((one) => spoken(one.name) === 'Player')!;
  const subtitle = deviceScreenItems(c, player.group!).find((one) => one.label === 'Subtitle Language')!;
  assert.deepEqual(subtitle.lines, ['Subtitle', 'Language']);
  assert.deepEqual([oneDrawsName(c, subtitle, 'Subtitle Language'), oneScreenEntryDraws({ command: 'SubtitleLanguage' }, 'Subtitle Language')], [true, false]);
});
