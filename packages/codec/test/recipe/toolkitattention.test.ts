/**
 * **An activity can be switched off, and marked as needing attention**, decision 44, R92 and R93. Both are stored in
 * the document, an activity's `enabled` and its `attention`, and neither is required: an activity is never invalid.
 *
 * **What is claimed, on the reference documents, with nothing attached and no archive**:
 *
 * * **Switched off, an activity is left out of every build and named**: on the Harmony One, the Harmony 650, the
 *   Harmony 350 and the Harmony Touch, a document whose last activity is switched off builds exactly what the same
 *   document with that activity removed builds, and `leftOut` names it by id and name. The control for "left out" is the
 *   build of the document as it was, which differs; the control for "named" is that build's `leftOut`, empty. Switched
 *   on again the document is the one it was, so its id is the one it had and every build follows.
 * * **On a Harmony Touch the favourite channels go to the first activity left that can hold them**: with Watch TV
 *   switched off they go to Switch Box, the one other activity with a channel changing role, and every other activity
 *   keeps the id it was built with; with both off no activity holds them, and the set still builds.
 * * **Switching off the activity that holds the favourite channels says who holds them while it is off**: on a Harmony
 *   Touch by the family's own rule, Switch Box after Watch TV, and then none; on a Harmony One the one the document
 *   states, none. The control is switching off an activity that holds none, which says nothing.
 * * **The limit on activities counts those switched on**: on a Harmony 350, which takes one, an activity can be added
 *   once the one there is switched off, `check` lists no problem and the build builds, while switching the first on
 *   again is refused as over the limit; the control is the same document with both on, which `check` lists.
 * * **No device, no activity**, decision 44 as taken on 16 November 2026: on the same four models a document whose
 *   last activity uses no device builds exactly what the document without that activity builds, and `leftOut` names
 *   it with the reason `no-device`; `activities` says the same without building, `check` lists a note and no error, and
 *   an activity both switched off and with no device is named `switched-off`, the person's choice. The controls are the
 *   document as it was, which builds otherwise and names nothing, and the activities that take part, which carry no
 *   reason. A Harmony Touch and a Harmony 350 build it where their own composers refuse one: the shared path takes it
 *   out before either is reached.
 * * **The limit counts only the activities that take part**: on a Harmony 350, an activity with no device is added
 *   beside the one there, the check lists no limit and the build leaves it out; giving it a device is refused as over
 *   the limit, and with the first switched off the same change is taken. The control is adding one with a device,
 *   refused.
 * * **Losing its last device keeps the activity and says it is now left out**: through `setActivity` on a Harmony One,
 *   an effect at the activity, and on a Harmony Touch the activity holding the favourite channels says who holds them
 *   while it uses no device; through `remove` of the device, the activity kept, marked, and the same effect after its
 *   mark, while another activity that used the device and keeps others says nothing of it, nor one already switched off.
 * * **Removing a device marks every activity that used it**, with every press of the activity whose answer the removal
 *   changed, read off the model's maps before and after, what each did and what it does now; on the two models whose
 *   families state their maps, the Harmony One and the Harmony Touch. Not only the presses that sent the removed
 *   device's commands: removing the Touch's LG TV takes the held Tap from the receiver's Mute, removing its Blu-ray takes
 *   the short Yellow from a sequence, and removing the KPN takes Switch Box's NumberPlus from the LG TV. An activity that
 *   used the device and whose keys did not change is marked with an empty list, the pass through Switch. On the Harmony
 *   650, whose family states no maps yet, the activities are marked with no list, and the message says why.
 * * **A change of an activity itself through `setActivity` sets no mark** and reports every press it changed as an
 *   effect at the key: dropping the receiver, or clearing its roles, on a Touch and a One, and with the volume given to
 *   the device that stays the keys say they send its commands. The control is a `setActivity` keeping every device as it
 *   was, which reports nothing.
 * * **The mark is a record, set and cleared by hand**: `markAttention` adds a reason with the sentence given, trimmed,
 *   `clearAttention` takes every reason away. A rename never follows into the mark's device, a device that is gone, nor
 *   into what a key did, and does follow into what a key does now, a device that is there. A mark changes no build: the
 *   document with it and without it build the same bytes.
 * * **The reader holds both fields to their form**: each malformed field refused with its own words, one control
 *   accepted per field.
 *
 * **What is not claimed**: that a remote behaves as the build says, and nothing of what a remote would do with an
 * activity of no device, since none is ever given one. The keys of the Harmony 600,
 * 650 and 700, the 880 and 885 and the 300 and 350 are not built yet, R77, so their marks name none.
 *
 * Scope: the Harmony One, skin 54, the Harmony Touch, the Harmony 650 and the Harmony 350, their reference documents.
 * No remote.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { proves } from '@harmony/testkit/proof';

import '../../src/support/resources.node.ts';
import { buildFromRecipe, builtDigest, harmonyTouch, readRecipe, recipe, RecipeError, type Built } from '../../src/node.ts';
import { takingPart, type Recipe } from '../../src/recipe/recipe.ts';
import type { Change } from '../../src/recipe/toolkit.ts';

type Json = any;
const REFERENCES = new URL('../references/', import.meta.url);
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const ACCOUNT = JSON.parse(readFileSync(new URL('john-doe-account.json', REFERENCES), 'utf8')) as unknown;
const BUILT_AT = '2026-11-15T09:00:00';

/** A reference document, opened, so every device and activity has its id. */
const reference = (name: string): Recipe => recipe.open(JSON.parse(readFileSync(new URL(`${name}.json`, REFERENCES), 'utf8')));
const build = (document: Recipe): Built => buildFromRecipe(document, { builtAt: BUILT_AT, account: ACCOUNT as never });

/** A change that leaves the document it was given alone, and returns a document that reads as a recipe. */
function kept(before: Recipe, change: () => Change): Change {
  const given = JSON.stringify(before);
  const result = change();
  assert.equal(JSON.stringify(before), given, 'the document given was changed');
  assert.deepEqual(readRecipe(copy(result.document)), result.document);
  return result;
}

/** An activity's devices as `setActivity` takes them, with the roles given replacing those stated, by device name. */
function devicesOf(document: Recipe, activity: number, roles: Readonly<Record<string, readonly string[]>> = {}): Json[] {
  const idOf = (name: string): string => document.devices.find((one) => one.name === name)!.id!;
  return document.activities[activity]!.devices.map((used) => ({
    device: idOf(used.device), ...(used.input === undefined ? {} : { input: used.input }), roles: roles[used.device] ?? used.roles,
  }));
}

// ---------------------------------------------------------------------------------------------------
// Switched off
// ---------------------------------------------------------------------------------------------------

test('setActivity switches an activity off and on again, the document then being the one it was', () => {
  const document = reference('one-test');
  const off = kept(document, () => recipe.setActivity(document, 'a3', { enabled: false }));
  assert.deepEqual(off.effects, []);
  assert.equal(off.document.activities[2]!.enabled, false);
  assert.deepEqual(recipe.activities(off.document).map((one) => one.enabled), [true, true, false, true, true]);
  // Why it is left out, asked without building: switched off, and nothing on the activities that take part.
  assert.deepEqual(recipe.activities(off.document).map((one) => one.leftOut), [undefined, undefined, 'switched-off', undefined, undefined]);
  assert.equal('leftOut' in recipe.activities(off.document)[0]!, false);
  // Left alone by a change that does not name it.
  assert.equal(recipe.setActivity(off.document, 'a3', { name: 'Muziek luisteren' }).document.activities[2]!.enabled, false);
  // Switched on, the field goes and the document is the one before, ids and all.
  const on = kept(off.document, () => recipe.setActivity(off.document, 'a3', { enabled: true }));
  assert.deepEqual(on.document, document);
  assert.equal('enabled' in on.document.activities[2]!, false);
  // Neither true nor false is refused, and the control is the same change with false.
  assert.throws(() => recipe.setActivity(document, 'a3', { enabled: 'no' as never }), (error: unknown) => {
    assert.ok(error instanceof recipe.ChangeRefused);
    assert.equal(error.reason, 'invalid');
    assert.equal(error.message, 'whether activity Muziek is switched on is neither true nor false');
    return true;
  });
});

test('on the Harmony One, 650, 350 and Touch an activity switched off builds what the document without it builds, and is named as left out', () => {
  for (const name of ['one-test', 'h650-test', 'h350-test', 'touch-test']) {
    const document = reference(name);
    const last = document.activities.at(-1)!;
    const off = recipe.setActivity(document, last.id!, { enabled: false }).document;
    const builtOff = build(off);
    const builtGone = build(recipe.remove(document, { activity: last.id! }).document);
    const builtAsWas = build(document);
    assert.equal(builtDigest(builtOff), builtDigest(builtGone), `${name}: switched off builds as removed`);
    assert.deepEqual(builtOff.leftOut, [{ id: last.id, name: last.name, reason: 'switched-off' }], name);
    // The controls: the document as it was builds otherwise, and names nothing left out.
    assert.notEqual(builtDigest(builtAsWas), builtDigest(builtOff), name);
    assert.deepEqual(builtAsWas.leftOut, [], name);
    assert.deepEqual(builtGone.leftOut, [], name);
    // Switched on again, the document is the one it was, so its build is.
    assert.deepEqual(recipe.setActivity(off, last.id!, { enabled: true }).document, document, name);
  }
});

test('on a Harmony Touch the favourite channels go to the first activity left that can hold them, and every id stays', () => {
  const document = reference('touch-test');
  const shown = (built: Built): string[] => harmonyTouch.readConfiguration((built as Extract<Built, { kind: 'documents' }>).documents).activities
    .map((one: Json) => `${one.id} ${one.name}${one.tuningDefault === true ? ' favourites' : ''}`);
  assert.deepEqual(shown(build(document)), [
    '900000201 Watch TV favourites', '900000202 Watch a Blu-ray', '900000203 Listen to Music', '900000204 Switch Box', '900000205 Play a Game',
  ]);
  const tvOff = recipe.setActivity(document, 'a1', { enabled: false }).document;
  const one = build(tvOff);
  assert.deepEqual(shown(one), ['900000202 Watch a Blu-ray', '900000203 Listen to Music', '900000204 Switch Box favourites', '900000205 Play a Game']);
  assert.deepEqual(one.leftOut, [{ id: 'a1', name: 'Watch TV', reason: 'switched-off' }]);
  // With the two that can hold them both off, none does, and the set still builds.
  const two = build(recipe.setActivity(tvOff, 'a4', { enabled: false }).document);
  assert.deepEqual(shown(two), ['900000202 Watch a Blu-ray', '900000203 Listen to Music', '900000205 Play a Game']);
  assert.deepEqual(two.leftOut, [{ id: 'a1', name: 'Watch TV', reason: 'switched-off' }, { id: 'a4', name: 'Switch Box', reason: 'switched-off' }]);
});

test('switching off the activity holding the favourite channels says who holds them while it is off, by the family\'s rule or the document\'s', () => {
  const touch = reference('touch-test');
  const tvOff = kept(touch, () => recipe.setActivity(touch, 'a1', { enabled: false }));
  assert.deepEqual(tvOff.effects, [{ place: { kind: 'activity', activity: 'a1' }, effect: 'changed',
    message: 'activity Watch TV held the favourite channels, and while it is switched off activity Switch Box holds them' }]);
  assert.deepEqual(recipe.setActivity(tvOff.document, 'a4', { enabled: false }).effects.map((one) => one.message),
    ['activity Switch Box held the favourite channels, and while it is switched off no activity holds them']);
  // The control: an activity holding none says nothing switched off.
  assert.deepEqual(recipe.setActivity(touch, 'a3', { enabled: false }).effects, []);
  // A family with no rule of its own: the hold the document states, here on the One, which then has none.
  const one = recipe.setActivity(reference('one-test'), 'a2', { favourites: true }).document;
  assert.deepEqual(recipe.setActivity(one, 'a2', { enabled: false }).effects.map((each) => each.message),
    ['activity Film kijken held the favourite channels, and while it is switched off no activity holds them']);
  assert.deepEqual(recipe.setActivity(one, 'a1', { enabled: false }).effects, []);
});

test('on a Harmony 350 the limit on activities counts those switched on, in addActivity, setActivity, check and the build alike', () => {
  const document = reference('h350-test');
  assert.equal(document.activities.length, 1);
  // A second activity of the first one's devices, which the family's own rules take: one changes channels.
  const second = { name: 'Second', type: 'WatchTV', devices: devicesOf(document, 0) };
  const overLimit = (call: () => unknown): void => {
    assert.throws(call, (error: unknown) => error instanceof recipe.ChangeRefused && error.reason === 'over-limit'
      && error.message === 'a Harmony 350 holds 1 activity switched on with a device, and the document holds that many');
  };
  // With the one there switched on, no second; switched off, a second is added, and both build and check clean.
  overLimit(() => recipe.addActivity(document, second));
  const off = recipe.setActivity(document, 'a1', { enabled: false }).document;
  const both = kept(off, () => recipe.addActivity(off, second)).document;
  assert.deepEqual(recipe.check(both).filter((one) => one.code === 'over-limit'), []);
  assert.deepEqual(build(both).leftOut, [{ id: 'a1', name: 'TV kijken', reason: 'switched-off' }]);
  // Switching the first on again would give the remote two: refused as over the limit.
  overLimit(() => recipe.setActivity(both, 'a1', { enabled: true }));
  // The control: the same document with both on, which only a document edited by hand can be, is listed by check.
  const json: Json = copy(both);
  delete json.activities[0].enabled;
  assert.deepEqual(recipe.check(recipe.open(json)).filter((one) => one.code === 'over-limit').map((one) => one.message),
    ['a Harmony 350 holds 1 activity switched on with a device, and the document has 2']);
});

// ---------------------------------------------------------------------------------------------------
// No device, no activity
// ---------------------------------------------------------------------------------------------------

/** The sentence a change says when it leaves an activity with no device, and the check's note for one. */
const noDeviceNow = (name: string): string => `activity ${name} uses no device now, so a build and a sync leave it out until a device is added`;
const noDeviceNote = (name: string): string => `activity ${name} uses no device yet, so a build and a sync leave it out until one is added`;

test('on the Harmony One, 650, 350 and Touch an activity with no device builds what the document without it builds, and is named as left out with no device', () => {
  for (const name of ['one-test', 'h650-test', 'h350-test', 'touch-test']) {
    const document = reference(name);
    const last = document.activities.at(-1)!;
    const empty = kept(document, () => recipe.setActivity(document, last.id!, { devices: [] })).document;
    assert.deepEqual(empty.activities.at(-1)!.devices, [], name);
    const builtEmpty = build(empty);
    const builtGone = build(recipe.remove(document, { activity: last.id! }).document);
    assert.equal(builtDigest(builtEmpty), builtDigest(builtGone), `${name}: with no device builds as removed`);
    assert.deepEqual(builtEmpty.leftOut, [{ id: last.id, name: last.name, reason: 'no-device' }], name);
    // Said without building, and a note of the check, never an error.
    assert.deepEqual(recipe.activities(empty).map((one) => one.leftOut), [...document.activities.slice(0, -1).map(() => undefined), 'no-device'], name);
    assert.deepEqual(recipe.check(empty).filter((one) => one.severity === 'error'), [], name);
    assert.deepEqual(recipe.check(empty).filter((one) => one.place.kind === 'activity' && one.place.activity === last.id), [
      { severity: 'note', code: 'unfinished', place: { kind: 'activity', activity: last.id }, message: noDeviceNote(last.name) },
    ], name);
    // Switched off as well, the person's choice is the reason named.
    const both = recipe.setActivity(empty, last.id!, { enabled: false }).document;
    assert.deepEqual(recipe.activities(both).at(-1)!.leftOut, 'switched-off', name);
    assert.deepEqual(takenOut(both), [{ id: last.id, name: last.name, reason: 'switched-off' }], name);
    // The control: the document as it was builds otherwise, and names nothing left out.
    assert.notEqual(builtDigest(build(document)), builtDigest(builtEmpty), name);
    assert.deepEqual(recipe.activities(document).map((one) => one.leftOut), document.activities.map(() => undefined), name);
  }
});

/** What a build leaves out, asked of the shared path alone, where a whole build would only repeat the one above. */
const takenOut = (document: Recipe): Built['leftOut'] => takingPart(document).leftOut;

test('on a Harmony 350 the limit counts only the activities that take part, so one with no device is added past it and left out', () => {
  const document = reference('h350-test');
  const overLimit = (call: () => unknown): void => {
    assert.throws(call, (error: unknown) => error instanceof recipe.ChangeRefused && error.reason === 'over-limit'
      && error.message === 'a Harmony 350 holds 1 activity switched on with a device, and the document holds that many');
  };
  // The control: a second activity with a device is refused.
  overLimit(() => recipe.addActivity(document, { name: 'Second', type: 'WatchTV', devices: devicesOf(document, 0) }));
  // With no device it takes no part, so it is added, the check lists no limit, and the build leaves it out.
  const added = kept(document, () => recipe.addActivity(document, { name: 'Second', type: 'WatchTV', devices: [] }));
  assert.deepEqual(added.effects, []);
  const second = added.document.activities[1]!;
  assert.deepEqual(recipe.check(added.document).filter((one) => one.severity === 'error'), []);
  assert.deepEqual(build(added.document).leftOut, [{ id: second.id, name: 'Second', reason: 'no-device' }]);
  // Given a device it would take part beside the first: refused as over the limit.
  overLimit(() => recipe.setActivity(added.document, second.id!, { devices: devicesOf(document, 0) }));
  // With the first switched off, the same change is taken, and only the first is left out.
  const off = recipe.setActivity(added.document, 'a1', { enabled: false }).document;
  const filled = recipe.setActivity(off, second.id!, { devices: devicesOf(document, 0) }).document;
  assert.deepEqual(takenOut(filled), [{ id: 'a1', name: 'TV kijken', reason: 'switched-off' }]);
  assert.deepEqual(recipe.check(filled).filter((one) => one.code === 'over-limit'), []);
});

test('an activity that loses its last device is kept, and the change says a build and a sync now leave it out', () => {
  // Through setActivity on a Harmony One: an effect at the activity, after the roles and presses it changed.
  const one = reference('one-test');
  const emptied = kept(one, () => recipe.setActivity(one, 'a5', { devices: [] }));
  assert.deepEqual(emptied.effects.at(-1), { place: { kind: 'activity', activity: 'a5' }, effect: 'changed', message: noDeviceNow('Plasma kijken') });
  assert.equal(emptied.effects.filter((each) => each.message === noDeviceNow('Plasma kijken')).length, 1);
  // The controls: one device kept says nothing of it, nor emptying an activity already switched off.
  const kpnOnly = devicesOf(one, 4).filter((used) => used.device === one.devices.find((d) => d.name === 'KPN')!.id);
  assert.equal(kpnOnly.length, 1);
  const narrowed = recipe.setActivity(one, 'a5', { devices: kpnOnly });
  assert.equal(narrowed.effects.some((each) => each.message.includes('uses no device')), false);
  const off = recipe.setActivity(one, 'a5', { enabled: false }).document;
  assert.equal(recipe.setActivity(off, 'a5', { devices: [] }).effects.some((each) => each.message.includes('uses no device')), false);

  // On a Harmony Touch, the activity holding the favourite channels says who holds them while it uses no device.
  const touch = reference('touch-test');
  assert.deepEqual(recipe.setActivity(touch, 'a1', { devices: [] }).effects.slice(-2).map((each) => each.message), [
    noDeviceNow('Watch TV'), 'activity Watch TV held the favourite channels, and while it uses no device activity Switch Box holds them',
  ]);

  // Through remove of the device: the activity kept and marked, and the same effect after its mark; TV kijken, which
  // used the KPN and keeps its other devices, says nothing of it.
  const kpn = one.devices.find((d) => d.name === 'KPN')!.id!;
  const before = narrowed.document;
  const removed = kept(before, () => recipe.remove(before, { device: kpn }));
  const after = removed.document.activities.find((a) => a.id === 'a5')!;
  assert.deepEqual(after.devices, []);
  assert.equal(after.attention?.length, 1);
  assert.deepEqual(removed.effects.filter((each) => each.message.includes('uses no device')),
    [{ place: { kind: 'activity', activity: 'a5' }, effect: 'changed', message: noDeviceNow('Plasma kijken') }]);
  assert.deepEqual(removed.effects.at(-1)!.message, noDeviceNow('Plasma kijken'));
  assert.deepEqual(takenOut(removed.document), [{ id: 'a5', name: 'Plasma kijken', reason: 'no-device' }]);
  // `uses` lists the same places the removal reports, the activity left with no device among them.
  assert.deepEqual(recipe.uses(before, { device: kpn }), removed.effects.map((each) => each.place));
  // The control: the same removal with Plasma kijken switched off says nothing of it, which was out already.
  const offFirst = recipe.setActivity(before, 'a5', { enabled: false }).document;
  assert.equal(recipe.remove(offFirst, { device: kpn }).effects.some((each) => each.message.includes('uses no device')), false);
});

// ---------------------------------------------------------------------------------------------------
// Needs attention
// ---------------------------------------------------------------------------------------------------

const NOTHING = { nothing: true };
/** A press as the tests read one: the key and press, what it did and what it does, each in short words. */
const pressed = (one: { key: string; press: string; was: Json; now: Json }): string => {
  const words = (action: Json): string => ('device' in action ? `${action.device} ${action.command}` : 'sequence' in action ? `sequence ${action.sequence}` : 'nothing');
  return `${one.key} ${one.press}: ${words(one.was)} -> ${words(one.now)}`;
};
const ONE_VOLUME = ['VolumeUp short: Denon VolumeUp -> nothing', 'VolumeDown short: Denon VolumeDown -> nothing', 'VolumeMute short: Denon Mute -> nothing'];
const TOUCH_VOLUME = [
  'VolumeDown short: Denon AV Receiver VolumeDown -> nothing', 'VolumeMute short: Denon AV Receiver Mute -> nothing',
  'VolumeUp short: Denon AV Receiver VolumeUp -> nothing', 'SwipeUp short: Denon AV Receiver VolumeUp -> nothing',
  'SwipeDown short: Denon AV Receiver VolumeDown -> nothing', 'Tap held: Denon AV Receiver Mute -> nothing',
];
/** The marks of a document by activity id: the device removed and each press, `unknown` where no list is given. */
const marks = (document: Recipe): Record<string, string[]> => Object.fromEntries(document.activities.filter((one) => one.attention !== undefined)
  .map((one) => [one.id!, one.attention!.flatMap((reason) => [`${reason.happened} ${reason.device ?? ''}`, ...(reason.keys === undefined ? ['unknown'] : reason.keys.map(pressed))])]));

test('on the Harmony One and the Harmony Touch removing a device marks every activity that used it, with every press whose answer changed', () => {
  proves(93, ['harmony-one', 'harmony-touch']);
  // The receiver: every activity that used it, its volume presses sending nothing now.
  for (const [model, name, device, users, keys] of [
    ['Harmony One', 'one-test', 'd3', ['a1', 'a2'], ONE_VOLUME],
    ['Harmony Touch', 'touch-test', 'd2', ['a1', 'a2', 'a3', 'a5'], TOUCH_VOLUME],
  ] as const) {
    const document = reference(name);
    const gone = document.devices.find((one) => one.id === device)!.name;
    const removed = kept(document, () => recipe.remove(document, { device }));
    assert.deepEqual(marks(removed.document), Object.fromEntries(users.map((id) => [id, [`device-removed ${gone}`, ...keys]])), model);
    // One effect per activity marked, last and in the activities' order, and `uses` lists the same places.
    const said = `${gone} was removed; of the activity's keys, ${keys.map((one) => one.split(':')[0]!.replace(' short', '')).join(', ').replace(/, ([^,]*)$/, ' and $1')} send nothing now`;
    assert.deepEqual(removed.effects.slice(-users.length), users.map((id) => ({
      place: { kind: 'attention', activity: id }, effect: 'changed',
      message: `activity ${document.activities.find((one) => one.id === id)!.name} needs attention: ${said}`,
    })), model);
    assert.deepEqual(recipe.uses(document, { device }), removed.effects.map((one) => one.place), model);
    assert.deepEqual(recipe.activities(removed.document).map((one) => one.attention.length), document.activities.map((one) => ((users as readonly string[]).includes(one.id!) ? 1 : 0)), model);
  }
  const touch = reference('touch-test');
  // Presses beside the removed device's own commands. The LG TV: Watch TV's held Tap sent the receiver's Mute and sends
  // nothing now, among 40 presses that changed there; two activities that used it and whose keys did not change are
  // marked with none.
  const tv = marks(recipe.remove(touch, { device: 'd1' }).document);
  assert.deepEqual(Object.keys(tv), ['a1', 'a2', 'a4', 'a5']);
  assert.equal(tv.a1!.length, 1 + 40);
  assert.ok(tv.a1!.includes('Tap held: Denon AV Receiver Mute -> nothing'));
  assert.deepEqual([tv.a2, tv.a5], [['device-removed LG TV'], ['device-removed LG TV']]);
  assert.deepEqual(tv.a4!.slice(1), ['VolumeDown short: LG TV VolumeDown -> nothing', 'VolumeMute short: LG TV Mute -> nothing', 'VolumeUp short: LG TV VolumeUp -> nothing', 'NumberPlus short: LG TV . -> nothing']);
  // The Blu-ray: Watch a Blu-ray's short Yellow ran a sequence that goes with it, among 34.
  const disc = marks(recipe.remove(touch, { device: 'd3' }).document);
  assert.equal(disc.a2!.length, 1 + 34);
  assert.ok(disc.a2!.includes('Yellow short: sequence Test Sequence -> nothing'));
  // The KPN: Switch Box's NumberPlus, which sent the LG TV's dot, among 35.
  const box = marks(recipe.remove(touch, { device: 'd5' }).document);
  assert.equal(box.a4!.length, 1 + 35);
  assert.ok(box.a4!.includes('NumberPlus short: LG TV . -> nothing'));
  // The pass through Switch: Switch Box used it and no key changed, so it is marked with an empty list.
  const quiet = recipe.remove(touch, { device: 'd7' });
  assert.deepEqual(marks(quiet.document), { a4: ['device-removed Switch'] });
  assert.deepEqual(quiet.document.activities[3]!.attention![0]!.keys, []);
  assert.deepEqual(quiet.effects.at(-1)!.message, 'activity Switch Box needs attention: Switch was removed, and no key of the activity does otherwise now');
  // A second removal adds its reason to the mark already there.
  const twice = recipe.remove(recipe.remove(touch, { device: 'd2' }).document, { device: 'd1' }).document;
  assert.deepEqual(twice.activities[0]!.attention!.map((one) => [one.happened, one.device]), [['device-removed', 'Denon AV Receiver'], ['device-removed', 'LG TV']]);
});

test('on a Harmony 650, whose keys are not built yet, removing a device marks every activity that used it with no list of keys, and says why', () => {
  const document = reference('h650-test');
  const removed = kept(document, () => recipe.remove(document, { device: 'd2' }));
  const message = 'Plasma was removed, and what the activity\'s keys do now is not known, since the keys of a Harmony 650 are not built yet, R77';
  assert.deepEqual(removed.document.activities.map((one) => one.attention), [
    undefined, [{ happened: 'device-removed', device: 'Plasma', message }], undefined, undefined, [{ happened: 'device-removed', device: 'Plasma', message }],
  ]);
  // The control for "every activity that used it": the pass through Switch, which one activity uses, marks that one.
  assert.deepEqual(Object.keys(marks(recipe.remove(document, { device: 'd6' }).document)), ['a4']);
});

test('on the Harmony One and the Harmony Touch setActivity sets no mark and reports every press it changed as an effect at the key', () => {
  const keyEffects = (change: Change): string[] => change.effects.filter((one) => one.place.kind === 'key').map((one) => one.message);
  for (const [model, document, activity, receiver, keeper, keys] of [
    ['Harmony Touch', reference('touch-test'), 0, 'Denon AV Receiver', 'LG TV', TOUCH_VOLUME],
    ['Harmony One', reference('one-test'), 1, 'Denon', 'Plasma', ONE_VOLUME],
  ] as const) {
    const now = document.activities[activity]!;
    const receiverId = document.devices.find((one) => one.name === receiver)!.id!;
    const said = (to: string): string[] => keys.map((one) => {
      const [press, rest] = one.split(': ');
      return `activity ${now.name}'s ${press!.replace(' short', '')} sent ${rest!.split(' -> ')[0]!.replace(`${receiver} `, `${receiver}'s `)} and sends ${to === 'nothing' ? 'nothing' : `${to}'s ${rest!.split(' -> ')[0]!.slice(receiver.length + 1)}`} now`;
    });
    // Dropped: the role, then each press; no mark.
    const dropped = kept(document, () => recipe.setActivity(document, now.id!, { devices: devicesOf(document, activity).filter((one) => one.device !== receiverId) }));
    assert.equal(dropped.document.activities.some((one) => one.attention !== undefined), false, model);
    assert.deepEqual(dropped.effects[0]!.place, { kind: 'role', activity: now.id, role: 'Volume' }, model);
    assert.deepEqual(keyEffects(dropped), said('nothing'), model);
    // Kept with no role: the same presses, and still no mark.
    const idle = kept(document, () => recipe.setActivity(document, now.id!, { devices: devicesOf(document, activity, { [receiver]: [] }) }));
    assert.deepEqual(keyEffects(idle), said('nothing'), model);
    assert.equal(idle.document.activities.some((one) => one.attention !== undefined), false, model);
    // With the volume given to the device that stays, every press sends its command instead.
    const taken = devicesOf(document, activity, { [keeper]: [...now.devices.find((one) => one.device === keeper)!.roles, 'Volume'] })
      .filter((one) => one.device !== receiverId);
    assert.deepEqual(keyEffects(recipe.setActivity(document, now.id!, { devices: taken })), said(keeper), model);
  }
  // The control: keeping every device as it was changes no press.
  const document = reference('touch-test');
  assert.deepEqual(recipe.setActivity(document, 'a1', { devices: devicesOf(document, 0) }).effects, []);
});

test('a mark is set and cleared by hand, follows a rename only where a key now names a device that is there, and changes no build', () => {
  for (const name of ['one-test', 'touch-test']) {
    const document = reference(name);
    const receiver = name === 'one-test' ? 'd3' : 'd2';
    const removed = recipe.remove(document, { device: receiver }).document;
    // By hand: a reason added after the one already there, with no device and no keys, its sentence trimmed.
    const marked = kept(removed, () => recipe.markAttention(removed, 'a1', '  the new receiver is not set up yet '));
    assert.deepEqual(marked.effects, []);
    assert.deepEqual(marked.document.activities[0]!.attention!.slice(1), [{ happened: 'marked', message: 'the new receiver is not set up yet' }], name);
    // Cleared, every reason goes, and only that activity's.
    const cleared = kept(marked.document, () => recipe.clearAttention(marked.document, 'a1'));
    assert.deepEqual(cleared.effects, []);
    assert.equal('attention' in cleared.document.activities[0]!, false, name);
    assert.ok(cleared.document.activities.slice(1).some((one) => one.attention !== undefined), name);
    // A mark changes no build: the document with every mark and with none build the same.
    let none = removed;
    for (const one of removed.activities) none = recipe.clearAttention(none, one.id!).document;
    assert.equal(none.activities.filter((one) => one.attention !== undefined).length, 0, name);
    assert.equal(builtDigest(build(marked.document)), builtDigest(build(none)), name);
  }
  // A sentence with nothing in it is refused; the control is the one above, accepted.
  assert.throws(() => recipe.markAttention(reference('one-test'), 'a1', ' '), (error: unknown) => {
    assert.ok(error instanceof recipe.ChangeRefused);
    assert.deepEqual([error.reason, error.place, error.message], ['invalid', { kind: 'attention', activity: 'a1' }, 'the reason activity TV kijken needs attention says nothing']);
    return true;
  });
  // A rename. Watch TV's Info chosen to send the receiver's Mute, then the receiver removed: Info goes back to the LG
  // TV's own Info. Another device then given the receiver's name and renamed again leaves the mark's device and what
  // Info did as they were, a device that is gone; renaming the LG TV follows into what Info does now.
  const touch = reference('touch-test');
  const chosen = recipe.setKey(touch, { owner: { activity: 'a1' }, key: 'Info' }, { device: 'd2', command: 'Mute' }).document;
  const removed = recipe.remove(chosen, { device: 'd2' }).document;
  const info = (document: Recipe): string => pressed(document.activities[0]!.attention![0]!.keys!.find((one) => one.key === 'Info')! as Json);
  assert.equal(info(removed), 'Info short: Denon AV Receiver Mute -> LG TV Info');
  const borrowed = recipe.setDevice(recipe.setDevice(removed, 'd6', { name: 'Denon AV Receiver' }).document, 'd6', { name: 'Game Console' }).document;
  assert.equal(borrowed.activities[0]!.attention![0]!.device, 'Denon AV Receiver');
  assert.equal(info(borrowed), 'Info short: Denon AV Receiver Mute -> LG TV Info');
  const renamed = recipe.setDevice(borrowed, 'd1', { name: 'Television' }).document;
  assert.equal(info(renamed), 'Info short: Denon AV Receiver Mute -> Television Info');
  assert.equal(renamed.activities[0]!.attention![0]!.message, removed.activities[0]!.attention![0]!.message);
});

test('the reader holds an activity\'s switch and its mark to their form', () => {
  // The reference opened, which states version 2, the version the two fields belong to.
  const base: Json = copy(reference('one-test'));
  const withActivity = (fields: Json): Json => { const json: Json = copy(base); Object.assign(json.activities[0], fields); return json; };
  const reason = { happened: 'device-removed', device: 'Denon', keys: [{ key: 'VolumeUp', press: 'short', was: { device: 'Denon', command: 'VolumeUp' }, now: NOTHING }], message: 'Denon was removed' };
  // The controls: each field in its form reads, and reads as it was written, an empty list of keys among them.
  assert.equal(readRecipe(withActivity({ enabled: false })).activities[0]!.enabled, false);
  const read = [reason, { ...reason, keys: [] }, { happened: 'marked', message: 'by hand' }];
  assert.deepEqual(readRecipe(withActivity({ attention: read })).activities[0]!.attention, read);
  const refusals: [Json, string][] = [
    [{ enabled: true }, 'activity TV kijken\'s enabled is true, which is said by leaving it out'],
    [{ enabled: 'no' }, 'activity TV kijken\'s enabled is not false'],
    [{ attention: [] }, 'activity TV kijken\'s attention'],
    [{ attention: [{ ...reason, happened: 'device-dropped' }] }, 'says device-dropped happened, which is none of device-removed, marked'],
    [{ attention: [{ happened: 'marked', device: 'Denon', message: 'x' }] }, 'names a device, and a mark set by hand names none'],
    [{ attention: [{ happened: 'device-removed', message: 'x' }] }, 'names no device, and device-removed happens to one'],
    [{ attention: [{ happened: 'marked', keys: reason.keys, message: 'x' }] }, 'names keys, and a mark set by hand names none'],
    [{ attention: [{ ...reason, keys: [{ ...reason.keys[0], press: 'twice' }] }] }, 'is pressed neither short, held nor double'],
    [{ attention: [{ ...reason, keys: [{ key: 'VolumeUp', press: 'short', sent: 'VolumeUp', now: NOTHING }] }] }, 'key 1'],
    [{ attention: [{ happened: 'marked' }] }, 'activity TV kijken\'s attention 1'],
  ];
  for (const [fields, words] of refusals) {
    assert.throws(() => readRecipe(withActivity(fields)), (error: unknown) => error instanceof RecipeError && error.message.includes(words), JSON.stringify(fields));
  }
  assert.equal(refusals.length, 10);
});
