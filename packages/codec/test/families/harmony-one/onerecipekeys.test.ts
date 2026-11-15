/**
 * **A recipe's key choices built on the Harmony One**, requirements R31 and R32: a key an activity's map or a device
 * mode's map is given otherwise in the recipe, `RecipeKey`, sends the command it names, or nothing, and every other key
 * of every map is what the build without the choice gives. The recipe names each key by Logitech's word for it,
 * `VolumeUp`, `Info`, `VolumeMute`, and the family turns the word into its scan, `ONE_KEYPAD_KEYS` in
 * `families/harmony-one/recipekeys.ts`; the readers report scans, so what a build bound is read back by scan.
 *
 * **The claims, and why each is believed.**
 *
 * 1. **The chosen key, and only it, changes.** The Harmony One test setup of the references, `one-test`, is built from
 *    nothing three times: as it is, with three keys chosen (two activity keys and one device mode key), and with two
 *    keys chosen to do nothing (one of each kind). Every key of every map is read back through the codec's readers,
 *    `keyCodes` for an activity's map and `deviceModeMaps` for a device's own, and compared key by key with the build
 *    without the choice: exactly three keys differ in the first and exactly two in the second, the ones chosen. The
 *    count is asserted, not a bound.
 * 2. **A chosen key sends the stated device's stated command.** The command is resolved by its catalogue name, and the
 *    expectation is read another way: off the stated device's own device mode in the build without the choice, the key
 *    that device's hard key table puts that command on, `ONE_HARD_KEYS` (Info on scan 10, VolumeUp on scan 3). Two
 *    routes, a name and a key table, meet on one code.
 * 3. **R32's example holds**: the receiver's VolumeUp on the television's volume up key in the television's device
 *    mode, a command of another device. The reader finds such a map: `deviceModeMaps` picks a device's mode as the
 *    largest that sends one device alone, under which a television mode sending the receiver's code is no device's
 *    map, and takes the device list's mode where that pick finds none, so all seven devices are found here.
 * 4. **An activity key may send a device the activity does not use**: Muziek's Info sends the Denon's, a device that
 *    activity does not switch on. Nothing in the file refuses it; what the remote then does with the device's power is
 *    the person's, since the activity neither switches it on nor off.
 * 5. **Nothing is a swallow.** A key chosen to do nothing is an entry running opcode and operand 0, in device mode's
 *    map as in an activity's, which matches the key so no map below sees it, `reference/config-format/modes-and-keys.md`.
 *    Device mode's maps already swallow every key a device has no command for, section 420; an activity's map leaving
 *    a key out instead lets it fall to the maps below, which on the Harmony One are not read.
 * 6. **The choice is the only byte that moves.** Each chosen key replaces a key already bound, so the builds are the
 *    same length and differ in the chosen entries' bytes and the trailer checksum alone: the look, the screens and
 *    every builder after the composers come out the same, which the key reading alone could not show.
 * 7. **What is not built refuses by name**: a held press, a sequence, a word no map binds, a device the recipe does not
 *    hold, a command the definition does not have; and a recipe stating keys for a family that builds none, the Harmony
 *    600, 650 and 700, the 300 and 350 and the Harmony Touch, both through the one build and through the family's own
 *    route, so that no route builds the file without the choice.
 * 8. **A recipe with no key choices builds what it built before**: the references' fingerprints,
 *    `test/recipe/references.test.ts`, are unchanged, and the build here without choices is checked against
 *    `one-test`'s recorded fingerprint too.
 * 9. **Naming a key by its word builds what naming it by its scan built.** Until the recipe named keys by word, a
 *    choice named its key by scan code, 3 for VolumeUp, 10 for Info and 9 for VolumeMute. The two builds with choices
 *    here were built from those scan documents by the code before the change, at the same moment, and their
 *    fingerprints recorded below; the same choices by word build to the same fingerprints, so the translation from
 *    a word to its scan inside the family moved no byte. The bench's own document, synced to the spare Harmony One
 *    by scan, is rebuilt by word in `packages/bench/test/harmony-one/one-key-choices-runs.test.ts` and equals the
 *    remote's bytes, a second sample of the same claim.
 * 10. **The family's words are 37, one per keypad scan a map binds**, `ONE_KEYPAD_SCANS`, each scan once; a word not
 *    in it has no scan. That they are the drawing's words for the same scans is held on the drawing's side,
 *    `packages/silhouettes/test/recipekeys.test.ts`, since the codec does not depend on the drawing's package.
 *
 * **Controls.** The comparison finds no difference between a build and itself, and it rejects a wrong expectation: the
 * differences of the build with choices are not those of a key one scan off. The byte check rejects the build with
 * choices against the base when the chosen entries are not allowed to differ.
 *
 * **Scope.** The Harmony One alone, skin 54, the family that states `recipeKeys`. Read in configurations; no remote has
 * been given a configuration with a key chosen otherwise, so what the remote does with one is not checked.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { slow } from '@harmony/lab';
import { proves } from '@harmony/testkit/proof';
import '../../../src/support/resources.node.ts';
import {
  activities, buildFromRecipe, builtDigest, type Container, deviceModeMaps, devices, keyCodes, parse, readRecipe,
} from '../../../src/node.ts';
import { handlerSets, modeRecords, taggedList, diffRanges } from '../../../src/internal.ts';
import { TRAILER_CHECKSUM_OFFSET } from '../../../src/container/gspm.ts';
import { composeSetup, AssemblyError } from '../../../src/build.ts';
import { buildEmptyOneConfiguration } from '../../../src/families/harmony-one/empty.ts';
import { ONE_KEYPAD_SCANS, ONE_RECIPE_KEYS } from '../../../src/families/harmony-one/recipekeys.ts';
import { carriedCatalogue } from '../../../src/catalogue/carried.ts';
import { chooseByModel } from '../../../src/families/registry.ts';
import { readEarlierTouchSetupFile } from '../../../src/families/harmony-touch/earlierform.ts';
import { NotBuiltError } from '../../../src/support/contract.ts';

const REFERENCES = new URL('../../references/', import.meta.url);
type Json = Record<string, any>;
const recipeJson = (name: string): Json => JSON.parse(readFileSync(new URL(`${name}.json`, REFERENCES), 'utf8')) as Json;
const BUILT_AT = '2026-10-24T10:23:01';
/** `one-test`'s fingerprint as `references.json` records it. */
const ONE_TEST_SHA256 = (JSON.parse(readFileSync(new URL('references.json', REFERENCES), 'utf8')) as Json[])
  .find((one) => one.name === 'one-test')?.sha256 as string;

/** The test setup with keys chosen: per device or activity by name, the keys its map is given. */
function withKeys(chosen: { devices?: Record<string, Json[]>; activities?: Record<string, Json[]> }, name = 'one-test'): Json {
  const json = structuredClone(recipeJson(name));
  for (const device of json.devices as Json[]) if (chosen.devices?.[device.name] !== undefined) device.keys = chosen.devices[device.name];
  for (const activity of json.activities as Json[]) if (chosen.activities?.[activity.name] !== undefined) activity.keys = chosen.activities[activity.name];
  return json;
}

const configuration = (json: Json): Container => {
  const built = buildFromRecipe(json, { builtAt: BUILT_AT });
  assert.equal(built.kind, 'configuration');
  return parse((built as { bytes: Uint8Array }).bytes);
};

/** The device's setup name as the configuration spells its label. */
const spoken = (name: string | undefined): string => (name ?? '?').replaceAll('_', ' ');
const sent = (codes: readonly { group: number; code: number }[]): string => codes.map((one) => `${one.group}.${one.code}`).join('+');

/**
 * Every key of every map, through the readers: an activity's keypad map, `keyCodes` over its set, and each device's
 * own, `deviceModeMaps`, as what each key's press sends; and the keys either kind of map swallows, read off the maps'
 * tagged lists, which no reader reports since a swallow sends nothing.
 */
function keyMaps(c: Container): Map<string, string> {
  const out = new Map<string, string>();
  const codes = keyCodes(c);
  for (const activity of activities(c)) {
    for (const key of codes.filter((one) => one.where === 'set' && one.index === activity.set && one.event === 2)) {
      out.set(`activity ${spoken(activity.name)} scan ${key.scan}`, sent(key.codes));
    }
    for (const entry of taggedList(c, handlerSets(c)?.addresses[activity.set as number] as number)?.entries ?? []) {
      if (entry.tag >> 6 === 2 && entry.opcode === 0) out.set(`activity ${spoken(activity.name)} scan ${entry.tag & 0x3f}`, 'nothing');
    }
  }
  const named = new Map(devices(c).map((one) => [one.group, spoken(one.name)]));
  for (const map of deviceModeMaps(c)) {
    const device = named.get(map.group);
    for (const key of map.keypad.filter((one) => one.event === 2)) out.set(`device ${device} scan ${key.scan}`, sent(key.codes));
    for (const entry of taggedList(c, (modeRecords(c) ?? [])[map.mode]?.start as number)?.entries ?? []) {
      if (entry.tag >> 6 === 2 && entry.opcode === 0 && entry.tag & 0x3f && (entry.tag & 0x3f) < 43) {
        out.set(`device ${device} scan ${entry.tag & 0x3f}`, 'nothing');
      }
    }
  }
  return out;
}

/** The keys whose binding differs between two readings, each with what it is in the second. */
function differences(before: Map<string, string>, after: Map<string, string>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    if (before.get(key) !== after.get(key)) out[key] = after.get(key);
  }
  return out;
}

/** The blob offsets of the press entry for `scan` in a tagged list at `address`, as a range. */
function entryRange(c: Container, address: number, scan: number): { start: number; end: number } {
  const list = taggedList(c, address);
  const index = list?.entries.findIndex((one) => one.tag === (0x80 | scan)) ?? -1;
  assert.ok(list !== undefined && index >= 0, `an entry for scan ${scan}`);
  const stride = list.wide ? 5 : 4;
  const start = list.start + (list.wide ? 2 : 1) + stride * index;
  return { start, end: start + stride };
}

/** Whether every byte where `a` and `b` differ is inside one of `allowed` or the trailer checksum. */
function onlyInside(a: Container, b: Container, allowed: readonly { start: number; end: number }[]): boolean {
  assert.equal(a.blob.length, b.blob.length, 'the two builds are the same length');
  const trailer = { start: b.blob.length - TRAILER_CHECKSUM_OFFSET, end: b.blob.length - TRAILER_CHECKSUM_OFFSET + 2 };
  return diffRanges(a.blob, b.blob).every((run) => [...allowed, trailer].some((one) => run.start >= one.start && run.start + run.length <= one.end));
}

const setOf = (c: Container, name: string): number => handlerSets(c)?.addresses[activities(c).find((one) => spoken(one.name) === name)?.set as number] as number;
const modeOf = (c: Container, name: string): number => {
  const group = devices(c).find((one) => spoken(one.name) === name)?.group;
  return (modeRecords(c) ?? [])[deviceModeMaps(c).find((one) => one.group === group)?.mode as number]?.start as number;
};

// The three builds, once for every test here, about fifteen seconds each: the slow tier.
let builds: { base: Container; chosen: Container; nothing: Container } | undefined;
const built = () => {
  builds ??= {
    base: configuration(recipeJson('one-test')),
    chosen: configuration(withKeys({
      devices: { 'LG TV': [{ key: 'VolumeUp', action: { device: 'Denon', command: 'VolumeUp' } }] },
      activities: {
        'TV kijken': [{ key: 'Info', action: { device: 'LG TV', command: 'Info' } }],
        Muziek: [{ key: 'Info', action: { device: 'Denon', command: 'Info' } }],
      },
    })),
    nothing: configuration(withKeys({
      devices: { Denon: [{ key: 'VolumeMute', action: { nothing: true } }] },
      activities: { 'TV kijken': [{ key: 'VolumeMute', press: 'short', action: { nothing: true } }] },
    })),
  };
  return builds;
};

test('without key choices the test setup builds to the fingerprint its reference recorded', slow(), () => {
  const { base } = built();
  assert.equal(builtDigest({ kind: 'configuration', model: 'Harmony One', skin: 54, bytes: base.blob, leftOut: [] }), ONE_TEST_SHA256);
});

/**
 * The fingerprints of the two builds with choices, as the code before the recipe named keys by word built them from
 * the same choices named by scan (3, 10 and 9), at `BUILT_AT`: measured once, before the change, and recorded here.
 */
const BY_SCAN_SHA256 = {
  chosen: 'f582e99220d2c33b5cd33553d76688fb6377a498e2872f035db564d0bb8dc77b',
  nothing: '0918cc90915e75e706f6fead7f66eb8eff43999bc8e08bd71429d8c6efd6ca34',
};
const digestOf = (c: Container): string => builtDigest({ kind: 'configuration', model: 'Harmony One', skin: 54, bytes: c.blob, leftOut: [] });

test('the choices named by word build to the fingerprints the same choices named by scan built to', slow(), () => {
  const { base, chosen, nothing } = built();
  assert.equal(digestOf(chosen), BY_SCAN_SHA256.chosen);
  assert.equal(digestOf(nothing), BY_SCAN_SHA256.nothing);
  // The control: the three builds are three files, so a fingerprint here tells a choice from no choice.
  assert.equal(new Set([digestOf(base), digestOf(chosen), digestOf(nothing)]).size, 3);
});

test('the Harmony One offers 37 keys by word, one for each keypad scan its maps bind and each scan once, and a word not among them has no scan', () => {
  const { keys } = ONE_RECIPE_KEYS;
  assert.equal(keys.length, 37);
  assert.equal(new Set(keys).size, 37);
  const scans = keys.map((key) => ONE_RECIPE_KEYS.scanOf(key));
  assert.deepEqual([...scans].sort((a, b) => (a as number) - (b as number)), [...ONE_KEYPAD_SCANS].sort((a, b) => a - b));
  assert.equal(ONE_KEYPAD_SCANS.size, 37);
  // The control for that comparison: the words without Enter's give 36 scans, which it rejects.
  const withoutEnter = scans.filter((scan) => scan !== 13).sort((a, b) => (a as number) - (b as number));
  assert.notDeepEqual(withoutEnter, [...ONE_KEYPAD_SCANS].sort((a, b) => a - b));
  // The words the drawing and the reference give the keys this file's builds choose, by the scans the readers report.
  assert.deepEqual(['VolumeUp', 'Info', 'VolumeMute', 'Enter'].map((key) => ONE_RECIPE_KEYS.scanOf(key)), [3, 10, 9, 13]);
  // The control: the keys the drawing names that no map binds, a touch key and a number have no scan.
  for (const key of ['Activities', 'Help', 'Off', 'ScreenNext', 'Favorites', '3']) assert.equal(ONE_RECIPE_KEYS.scanOf(key), undefined, key);
});

test('three keys chosen, two activity keys and the television\'s volume up in device mode, are the only keys of every map that change, each sending the command named', slow(), () => {
  const { base, chosen } = built();
  const before = keyMaps(base);
  const after = keyMaps(chosen);
  // The readers find every device's map in both, the television's sending the receiver's code among them.
  assert.equal(deviceModeMaps(base).length, 7);
  assert.equal(deviceModeMaps(chosen).length, 7);
  // The expectations read off the stated devices' own maps in the build without the choice.
  const expected = {
    'activity TV kijken scan 10': before.get('device LG TV scan 10'),
    'activity Muziek scan 10': before.get('device Denon scan 10'),
    'device LG TV scan 3': before.get('device Denon scan 3'),
  };
  for (const [key, codes] of Object.entries(expected)) assert.ok(codes !== undefined && codes !== before.get(key), `${key} changes`);
  assert.deepEqual(differences(before, after), expected);
  assert.equal(Object.keys(differences(before, after)).length, 3);
  // A device's own map sending another device's command, as built here and as heard on a unit.
  proves(32, ['harmony-one'], ['packages/bench/test/harmony-one/one-key-choices-runs.test.ts', 'docs/test-notes/harmony-one.md#four-keys-chosen-in-a-document']);
});

test('a key chosen to do nothing is swallowed in an activity\'s map and in device mode\'s, and no other key changes', slow(), () => {
  const { base, nothing } = built();
  const before = keyMaps(base);
  assert.notEqual(before.get('activity TV kijken scan 9'), undefined, 'TV kijken\'s mute sends a code without the choice');
  assert.notEqual(before.get('device Denon scan 9'), undefined, 'the Denon\'s mute sends a code without the choice');
  assert.deepEqual(differences(before, keyMaps(nothing)), { 'activity TV kijken scan 9': 'nothing', 'device Denon scan 9': 'nothing' });
});

test('the chosen entries and the trailer checksum are the only bytes that differ from the build without the choices', slow(), () => {
  const { base, chosen, nothing } = built();
  const chosenEntries = [
    entryRange(chosen, setOf(chosen, 'TV kijken'), 10), entryRange(chosen, setOf(chosen, 'Muziek'), 10),
    entryRange(chosen, modeOf(chosen, 'LG TV'), 3),
  ];
  assert.ok(onlyInside(base, chosen, chosenEntries));
  assert.ok(onlyInside(base, nothing, [entryRange(nothing, setOf(nothing, 'TV kijken'), 9), entryRange(nothing, modeOf(nothing, 'Denon'), 9)]));
  // Control: with one chosen entry not allowed to differ, the same check finds the bytes that did.
  assert.equal(onlyInside(base, chosen, chosenEntries.slice(1)), false);
});

test('control: the key comparison finds nothing between a build and itself, and rejects an expectation one scan off', slow(), () => {
  const { base, chosen } = built();
  assert.deepEqual(differences(keyMaps(base), keyMaps(base)), {});
  // The main test's assertion, given the keys one scan off for one of the three: it has to reject them.
  const found = Object.keys(differences(keyMaps(base), keyMaps(chosen))).sort();
  assert.throws(() => assert.deepEqual(found, ['activity Muziek scan 11', 'activity TV kijken scan 10', 'device LG TV scan 3']), assert.AssertionError);
});

// ---------------------------------------------------------------------------------------------------------------
// Refusals. Each before any device is composed, onto one empty Harmony One shared by all, through the composer every
// recipe of the Harmony One's goes through, `composeSetup`; and the same refusal through the one build, once.

let donor: Uint8Array | undefined;
const refusedOnTheOne = (chosen: Parameters<typeof withKeys>[0], message: RegExp, kind: typeof AssemblyError | typeof NotBuiltError = AssemblyError): void => {
  donor ??= buildEmptyOneConfiguration({ skin: 54, builtAt: BUILT_AT, blend: false }).bytes;
  const recipe = readRecipe(withKeys(chosen));
  assert.throws(() => composeSetup(recipe, { donor: donor as Uint8Array, builtAt: BUILT_AT, archive: carriedCatalogue(recipe) as never }),
    (error: unknown) => error instanceof kind && message.test(error.message));
};

test('a held press and a sequence answer not built, and a scan no map binds, an unknown device and an unknown command are each refused by name', () => {
  // Not built rather than refused: a held press, R38, and a sequence on a key, R37, are in the contract.
  refusedOnTheOne({ activities: { 'TV kijken': [{ key: 'Info', press: 'held', action: { device: 'KPN', command: 'Info' } }] } },
    /^composeSetupParts for the activity TV kijken's Info key, held is in the contract and not built yet, requirement R38$/, NotBuiltError);
  refusedOnTheOne({ activities: { Muziek: [{ key: 'Info', action: { sequence: 'Sleep' } }] } },
    /^composeSetupParts for the activity Muziek's Info key, running the sequence Sleep is in the contract and not built yet, requirement R37$/, NotBuiltError);
  // The Activities key is on the keypad and no map binds it; ScreenNext is the page strip beside the screen; and
  // Favorites is a word of the Harmony Touch's that the Harmony One has no key of.
  refusedOnTheOne({ devices: { KPN: [{ key: 'Activities', action: { nothing: true } }] } }, /^the device KPN's Activities key: Activities is no key the Harmony One's maps bind$/);
  refusedOnTheOne({ activities: { 'TV kijken': [{ key: 'ScreenNext', action: { nothing: true } }] } }, /^the activity TV kijken's ScreenNext key: ScreenNext is no key/);
  refusedOnTheOne({ activities: { 'TV kijken': [{ key: 'Favorites', action: { nothing: true } }] } }, /^the activity TV kijken's Favorites key: Favorites is no key/);
  refusedOnTheOne({ devices: { 'LG TV': [{ key: 'VolumeUp', action: { device: 'Yamaha', command: 'VolumeUp' } }] } },
    /^the device LG TV's VolumeUp key sends a command of Yamaha, which is no device of the recipe$/);
  refusedOnTheOne({ devices: { 'LG TV': [{ key: 'VolumeUp', action: { device: 'Denon', command: 'VolumeUpLouder' } }] } },
    /^the device LG TV's VolumeUp key sends VolumeUpLouder, which Denon's definition does not have$/);
  // The one build answers the same, not built.
  assert.throws(() => buildFromRecipe(withKeys({ activities: { Muziek: [{ key: 'Info', action: { sequence: 'Sleep' } }] } }), { builtAt: BUILT_AT }),
    (error: unknown) => error instanceof NotBuiltError && error.requirement === 37);
});

test('control: the refusal check fails where the refusal names another thing than expected', () => {
  // A held press refused, and expected to be refused as a sequence: the check has to reject it.
  assert.throws(() => refusedOnTheOne({ activities: { 'TV kijken': [{ key: 'Info', press: 'held', action: { nothing: true } }] } },
    /a sequence on a key is not built yet/), (error: unknown) => error instanceof assert.AssertionError);
});

test('control: the refusal check fails on a recipe whose choice is one the build makes', slow(), () => {
  assert.throws(() => refusedOnTheOne({ activities: { 'TV kijken': [{ key: 'Info', action: { nothing: true } }] } }, /./),
    (error: unknown) => error instanceof assert.AssertionError);
});

test('every family that builds no key choice answers not built for a recipe stating one, through the one build and through its own route', () => {
  const key = [{ key: 'VolumeUp', action: { nothing: true } }];
  for (const name of ['h600-five', 'h650-test', 'h700-test-bright', 'h350-test']) {
    const json = recipeJson(name);
    const first = (json.devices as Json[])[0] as Json;
    first.keys = key;
    // A device's key choice is R32, and the one build names the family and the place.
    assert.throws(() => buildFromRecipe(json, { builtAt: BUILT_AT, account: {} as never }),
      (error: unknown) => error instanceof NotBuiltError && error.requirement === 32
        && error.contract === `buildFromRecipe for the device ${first.name}'s VolumeUp key on ${chooseByModel(json.model).family.name}`,
      name);
  }
  // The control: the Harmony Touch builds a key choice its places take, decision 43, so the one build goes past the
  // keys and stops only at the account it is not given.
  const touchKeyed = recipeJson('touch-test');
  ((touchKeyed.devices as Json[])[0] as Json).keys = key;
  assert.throws(() => buildFromRecipe(touchKeyed, { builtAt: BUILT_AT }), /no account was given/);
  // The family's own route, which a script may take without the one build.
  const h350 = readRecipe({ ...recipeJson('h350-test'), devices: (recipeJson('h350-test').devices as Json[]).map((one, k) => (k === 0 ? { ...one, keys: key } : one)) });
  const noScreen = chooseByModel(h350.model);
  assert.throws(() => noScreen.family.kind === 'compiled' && noScreen.family.fromRecipe?.(h350, noScreen.skin, { builtAt: BUILT_AT, archive: carriedCatalogue(h350) as never }),
    (error: unknown) => error instanceof NotBuiltError && error.requirement === 32 && /^composeNoScreenSetup for the device /.test(error.contract));
  // A Harmony Touch's setup file of the earlier form takes its keys from its own block and refuses the recipe's.
  const touch = JSON.parse(readFileSync(new URL('../harmony-touch/touch-test-earlier-form.json', import.meta.url), 'utf8')) as Json;
  (touch.activities as Json[])[0]!.keys = key;
  assert.throws(() => readEarlierTouchSetupFile(touch), /a Harmony Touch's keys are built from its own part/);
});

test('the Harmony 600 family\'s own route answers not built for a recipe stating keys at the shared composer', () => {
  const recipe = readRecipe(withKeys({ devices: {} }, 'h600-five'));
  const first = recipe.devices[0]!;
  const keyed = { ...recipe, devices: [{ ...first, keys: [{ key: 'VolumeUp', action: { nothing: true as const } }] }, ...recipe.devices.slice(1)] };
  const four = chooseByModel(keyed.model);
  assert.throws(() => four.family.kind === 'compiled' && four.family.fromRecipe?.(keyed, four.skin, { builtAt: BUILT_AT, archive: carriedCatalogue(keyed) as never }),
    (error: unknown) => error instanceof NotBuiltError && error.requirement === 32
      && error.contract === `composeSetupParts for the device ${first.name}'s VolumeUp key on the Harmony 600, 650 and 700`);
});
