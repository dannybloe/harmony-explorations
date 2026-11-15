/**
 * **A field of the recipe's version 2 that a build does not read stops that build, never silently left out**, decision
 * 43, and **which build reads which field is one table**, `VERSION_TWO` in `recipe/recipe.ts`. A build that went ahead
 * without a field would give a configuration the remote accepts and that does something else than the document says,
 * and every check downstream would pass it. So every build refuses on the first field its kind of family does not read,
 * as a function not built does, with the requirement the field waits on, before it builds anything or asks for any
 * source.
 *
 * **The two kinds of family read differently.** The Harmony Touch's documents are made from most of these fields, so its
 * build reads them, and a field it reads does not stop it; the compiled families' builds read none yet, so the same
 * field still stops a Harmony One's. A field the Touch's build does not read, a timing member its composer writes nothing
 * of, a power member beside always on, a command's own code or sending, a device key pressed twice and an extra step
 * running a sequence, stops both.
 *
 * **Two fields every build reads**, an activity switched off and its attention mark, decision 44: the one build and every
 * route leave a switched off activity out before any family builds, and a mark changes no build, so neither stops a
 * build of either kind, and the check lists neither.
 *
 * Held here one stated field per kind on the Harmony One, of a compiled family, and on the Harmony Touch, the document
 * family, each with its requirement and whether the Touch reads it; the control, a document of version 2 stating only
 * what no build has to read, goes past the refusal on both. **And every other route to a build refuses the same**, each
 * family's own `fromRecipe`, the Harmony Touch's builder, and the composers of a setup, since this repository's scripts
 * and an application reach those without the one build. And the toolkit says the same: its check lists each field the
 * build of the document's model does not read as an error, and its changes, which follow none of these fields through
 * a rename or a removal yet, refuse a document that states one.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// The control builds as far as the first refusal of the family, which may draw our letters.
import '../../src/support/resources.node.ts';
import { buildFromRecipe } from '../../src/families/fromrecipe.ts';
import { assembleSetup } from '../../src/families/harmony-600-650-700/assemble.ts';
import { buildNoScreenSetup, composeNoScreenSetup } from '../../src/families/harmony-300-350/setup.ts';
import { buildTouchDocuments } from '../../src/families/harmony-touch/fromnothing.ts';
import { touchSetupOfDocument } from '../../src/families/harmony-touch/recipemaps.ts';
import {
  buildEarlierTouchDocuments, readEarlierTouchSetupFile, settingsOfEarlierSetupFile, setupOfEarlierSetupFile, type EarlierTouchSetupFile,
} from '../../src/families/harmony-touch/earlierform.ts';
import { ComposeRefusal } from '../../src/families/harmony-touch/compose.ts';
import { chooseByModel } from '../../src/families/registry.ts';
import type { Container } from '../../src/container/gspm.ts';
import type { CatalogueSource } from '../../src/catalogue/catalogue.ts';
import type { TouchCatalogue } from '../../src/families/harmony-touch/setup.ts';
import { readRecipe, unbuiltFields, VERSION_TWO, versionTwoFields, type Recipe } from '../../src/recipe/recipe.ts';
import { composeSetup, composeSetupParts } from '../../src/shared/setup.ts';
import { NotBuiltError } from '../../src/support/contract.ts';
import * as recipe from '../../src/recipe/toolkit.ts';

type Json = Record<string, unknown>;

const BUILT_AT = '2026-11-15T12:00:00';

/** A document of version 2 for a model, two devices and an activity using both, with the fields given placed. */
function document(model: Json, on: { readonly top?: Json; readonly device?: Json; readonly activity?: Json }): Json {
  return {
    version: 2, model,
    devices: [{ name: 'Television', device: 'Sony/KDL-32W705B', ...on.device }, { name: 'Receiver', device: 'Denon/AVR-1912' }],
    activities: [{
      name: 'Watch TV', type: 'WatchTV',
      devices: [{ device: 'Television', roles: ['Display'] }, { device: 'Receiver', roles: ['Volume'] }],
      ...on.activity,
    }],
    ...on.top,
  };
}

const ONE = { name: 'Harmony One', skin: 54 } as const;
const TOUCH = { name: 'Harmony Touch' } as const;

/**
 * One stated field of each kind, the requirement the refusal names, the words that say where it is, and **whether the
 * Harmony Touch's build reads it**, stated here as the expectation rather than read off the table, so the table moving
 * shows as a failure. No compiled family's build reads any of them.
 */
const KINDS: readonly (readonly [string, Parameters<typeof document>[1], number, string, boolean])[] = [
  ['delays', { device: { timing: { interKeyDelay: 300 } } }, 16, 'the device Television\'s delays', true],
  ['repeat count', { device: { timing: { pressMinRepeats: 2 } } }, 17, 'the device Television\'s repeat count', true],
  ['hold delay', { device: { timing: { holdInterDeviceDelay: 300 } } }, 16, 'the device Television\'s holdInterDeviceDelay', false],
  ['second repeat count', { device: { timing: { minRepeats: 2 } } }, 17, 'the device Television\'s minRepeats', false],
  ['power', { device: { power: { alwaysOn: true } } }, 14, 'the device Television\'s power', true],
  ['power type', { device: { power: { type: 'toggle' } } }, 14, 'the device Television\'s power type', false],
  ['channel tuning', { device: { channelTuning: { fixedDigits: 2 } } }, 18, 'the device Television\'s channel tuning', true],
  ['device screen', { device: { screen: [] } }, 35, 'the device Television\'s screen', true],
  ['command code', { device: { commands: { Netflix: { code: { keycode: 'NEC1:4:0:12' } } } } }, 19, 'the device Television\'s command Netflix\'s code', false],
  ['command sending', { device: { commands: { VolumeUp: { sending: { copies: 2 } } } } }, 89, 'the device Television\'s command VolumeUp\'s sending', false],
  ['device double press', { device: { keys: [{ key: 'Play', press: 'double', action: { nothing: true } }] } }, 40, 'the device Television\'s Play key, pressed twice', false],
  ['opening screen', { activity: { opensOn: 'Favorites' } }, 91, 'the activity Watch TV\'s opening screen', true],
  ['favourites', { activity: { favourites: true } }, 45, 'the activity Watch TV\'s hold on the favourites', true],
  ['power order', { activity: { powerOrder: ['Receiver', 'Television'] } }, 90, 'the activity Watch TV\'s power order', true],
  ['start steps', { activity: { start: [{ pause: 5 }] } }, 30, 'the activity Watch TV\'s steps at its start', true],
  ['end steps', { activity: { end: [{ pause: 5 }] } }, 30, 'the activity Watch TV\'s steps at its end', true],
  ['a start step running a sequence', {
    activity: { sequences: [{ name: 'Films', steps: [{ device: 'Television', command: 'Netflix' }] }], start: [{ sequence: 'Films' }] },
  }, 30, 'the activity Watch TV\'s step 1 at its start, running the sequence Films', false],
  ['sequences', { activity: { sequences: [{ name: 'Films', steps: [{ device: 'Television', command: 'Netflix' }] }] } }, 37, 'the activity Watch TV\'s sequences', true],
  ['screen label', { activity: { screen: [{ device: 'Television', command: 'Netflix', label: 'Films' }] } }, 34, 'the activity Watch TV\'s screen item 1\'s label', true],
  ['activity double press', { activity: { keys: [{ key: 'Play', press: 'double', action: { nothing: true } }] } }, 40, 'the activity Watch TV\'s Play key, pressed twice', true],
  ['settings', { top: { settings: { Brightness: 20 } } }, 47, 'the remote\'s settings', true],
];

/**
 * The two fields every build reads, decision 44, each with its requirement and the words that say where it is: the
 * builds take a switched off activity out before any family sees the document, and a mark changes nothing built.
 */
const EVERY_BUILD_READS: readonly (readonly [string, Parameters<typeof document>[1], number, string])[] = [
  ['switched off', { activity: { enabled: false } }, 92, 'the activity Watch TV\'s switch'],
  ['attention mark', { activity: { attention: [{ happened: 'marked', message: 'the receiver is new' }] } }, 93, 'the activity Watch TV\'s attention mark'],
];

/** That a call stops as not built, with the contract and requirement given. */
function stopsAsNotBuilt(call: () => unknown, contract: string, requirement: number, label: string): void {
  assert.throws(call, (error: unknown) => {
    assert.ok(error instanceof NotBuiltError, `${label}: ${String(error)}`);
    assert.equal(error.requirement, requirement, label);
    assert.equal(error.contract, contract, label);
    return true;
  }, label);
}

/** That a call goes past the guard: it builds, or it stops on something that is not a function not built. */
function passesTheGuard(call: () => unknown, label: string): void {
  try {
    call();
  } catch (error) {
    assert.ok(!(error instanceof NotBuiltError), `${label}: ${String(error)}`);
  }
}

test('the table says per part which kind of family reads it: the Harmony Touch\'s build reads what its documents are made from, a compiled family\'s none', () => {
  for (const [kind, on, requirement, where, touchReads] of KINDS) {
    const stated = versionTwoFields(readRecipe(document(TOUCH, on)));
    // The sample with a sequence states the activity's sequences too, read by the Touch; the part named is the step.
    const part = stated.find((one) => one.where === where);
    assert.ok(part !== undefined, `${kind}: ${JSON.stringify(stated)}`);
    assert.equal(part.requirement, requirement, kind);
    assert.deepEqual(part.readBy, touchReads ? ['document'] : [], kind);
    // `unbuiltFields` by kind, and by the document's own model.
    assert.equal(unbuiltFields(readRecipe(document(TOUCH, on)), 'document').some((one) => one.where === where), !touchReads, `${kind} on the Touch`);
    assert.equal(unbuiltFields(readRecipe(document(TOUCH, on))).some((one) => one.where === where), !touchReads, `${kind} on the Touch, by its model`);
    assert.equal(unbuiltFields(readRecipe(document(ONE, on)), 'compiled').some((one) => one.where === where), true, `${kind} on the One`);
    assert.equal(unbuiltFields(readRecipe(document(ONE, on))).some((one) => one.where === where), true, `${kind} on the One, by its model`);
  }
  // The two every build reads: both kinds named, and listed by neither as unbuilt.
  for (const [kind, on, requirement, where] of EVERY_BUILD_READS) {
    for (const model of [ONE, TOUCH]) {
      const read = readRecipe(document(model, on));
      assert.deepEqual(versionTwoFields(read).map((one) => [one.where, one.requirement, one.readBy]), [[where, requirement, ['compiled', 'document']]], `${kind} on the ${model.name}`);
      assert.deepEqual(unbuiltFields(read), [], `${kind} on the ${model.name}`);
    }
  }
  // Every field of the table reaches one sample here, so a field added to the table without a sample fails.
  const sampled = new Set([...KINDS, ...EVERY_BUILD_READS].flatMap(([, on]) => versionTwoFields(readRecipe(document(TOUCH, on))).map((one) => one.field)));
  assert.deepEqual([...new Set(VERSION_TWO.filter((one) => one.member !== 'highestIds').map((one) => one.member))].sort(), [...sampled].sort());
  // No other part of the table names a compiled family as its reader: none of their builds reads any other field of
  // version 2 yet.
  const all = KINDS.flatMap(([, on]) => versionTwoFields(readRecipe(document(ONE, on))));
  assert.deepEqual(all.filter((one) => one.readBy.includes('compiled')), []);
});

test('a field of version 2 stops the one build as not built, with its requirement, on the Harmony One always and on the Harmony Touch where its build does not read it', () => {
  for (const [kind, on, requirement, where, touchReads] of KINDS) {
    stopsAsNotBuilt(() => buildFromRecipe(document(ONE, on), { builtAt: BUILT_AT }), `buildFromRecipe for ${where}`, requirement, `${kind} on the One`);
    if (touchReads) {
      // Past the guard the Touch meets its own refusals: here no device carries a definition and no archive is given.
      passesTheGuard(() => buildFromRecipe(document(TOUCH, on), { builtAt: BUILT_AT }), `${kind} on the Touch`);
    } else {
      stopsAsNotBuilt(() => buildFromRecipe(document(TOUCH, on), { builtAt: BUILT_AT }), `buildFromRecipe for ${where}`, requirement, `${kind} on the Touch`);
    }
  }
});

test('the control: a document of version 2 stating only what no build reads, or what every build reads, goes past that refusal, on both kinds', () => {
  // The highest ids given change no byte a remote receives, and a switch and a mark are read by every build. Past the
  // refusal each family meets its own: no archive and no account for the Touch, no catalogue to compose the devices
  // from for the One. Neither is the not built refusal.
  for (const model of [ONE, TOUCH]) {
    passesTheGuard(() => buildFromRecipe(document(model, { top: { highestIds: { device: 2 } } }), { builtAt: BUILT_AT }), model.name);
    for (const [kind, on] of EVERY_BUILD_READS) passesTheGuard(() => buildFromRecipe(document(model, on), { builtAt: BUILT_AT }), `${kind} on the ${model.name}`);
  }
});

test('the toolkit\'s check lists each field the build of the document\'s model does not read as an error, from the same table', () => {
  for (const [kind, on, , where, touchReads] of KINDS) {
    // A double press is said by the key's own problem, the rest by where the field is.
    if (kind.endsWith('double press')) continue;
    for (const [model, listed] of [[ONE, true], [TOUCH, !touchReads]] as const) {
      const opened = recipe.open(document(model, on));
      const problems = recipe.check(opened).filter((one) => one.code === 'not-on-this-model' && one.message === `the document states ${where}, which the ${model.name}'s build does not read yet`);
      assert.deepEqual(problems.map((one) => one.severity), listed ? ['error'] : [], `${kind} on the ${model.name}`);
    }
  }
  // The highest ids change no byte a remote receives, so the check lists nothing for them, nor for the two every build
  // reads; the control for the latter is the first loop, which lists the One's fields.
  const ids = recipe.open(document(ONE, { top: { highestIds: { device: 5 } } }));
  assert.deepEqual(recipe.check(ids).filter((one) => one.severity === 'error'), []);
  for (const [kind, on] of EVERY_BUILD_READS) {
    for (const model of [ONE, TOUCH]) {
      assert.deepEqual(recipe.check(recipe.open(document(model, on))).filter((one) => one.code === 'not-on-this-model'), [], `${kind} on the ${model.name}`);
    }
  }
});

/**
 * **Every route to a build, each given one stated field**: each refuses first, before it looks at anything else it is
 * given, so the other arguments here are stand ins that would fail every other check. Two fields: a hold delay between
 * devices, R16, which no build reads, so every route refuses it; and a device always on, R14, which the Touch's build
 * reads, so the compiled routes refuse it and the Touch's go past. The control for each is the same call on the document
 * without the field, which fails on those stand ins, and so not as not built: what refused was the guard.
 */
test('every route to a build refuses a field its kind of family does not read before anything else: each family\'s fromRecipe, the composers and the Harmony Touch\'s builder', () => {
  const unreadByAll = { device: { timing: { holdInterDeviceDelay: 300 } } } as const;
  const readByTouch = { device: { power: { alwaysOn: true } } } as const;
  type On = typeof unreadByAll | typeof readByTouch | Record<string, never>;
  const nothing = {} as never;
  const compiled = (name: string, skin?: number): (on: On) => unknown => {
    const model = { name, ...(skin === undefined ? {} : { skin }) };
    const { family, skin: chosen } = chooseByModel(model);
    assert.ok(family.kind === 'compiled' && family.fromRecipe !== undefined, name);
    return (on) => family.fromRecipe!(readRecipe(document(model, on)), chosen, { builtAt: BUILT_AT });
  };
  const one = (on: On): Recipe => readRecipe(document(ONE, on));
  const touch = (on: On): Recipe => readRecipe(document(TOUCH, on));
  const touchFamily = chooseByModel(TOUCH).family;
  assert.equal(touchFamily.kind, 'document');
  const routes: readonly (readonly [string, string, 'compiled' | 'document', (on: On) => unknown])[] = [
    ['the Harmony One\'s fromRecipe', 'the Harmony One\'s fromRecipe', 'compiled', compiled('Harmony One', 54)],
    ['the Harmony 650\'s fromRecipe', 'the Harmony 600, 650 and 700\'s fromRecipe', 'compiled', compiled('Harmony 650')],
    ['the Harmony 350\'s fromRecipe', 'the Harmony 300 and 350\'s fromRecipe', 'compiled', compiled('Harmony 350')],
    ['composeSetup', 'composeSetup', 'compiled', (on) => composeSetup(one(on), { donor: new Uint8Array(0), builtAt: BUILT_AT })],
    ['composeSetupParts', 'composeSetupParts', 'compiled', (on) => composeSetupParts(nothing as Container, one(on), nothing, nothing, nothing, () => undefined)],
    ['assembleSetup', 'assembleSetup', 'compiled', (on) => assembleSetup(one(on), { donor: new Uint8Array(0), builtAt: BUILT_AT })],
    ['composeNoScreenSetup', 'composeNoScreenSetup', 'compiled', (on) => composeNoScreenSetup(nothing as Container, nothing as CatalogueSource, { recipe: one(on), keys: {} })],
    ['buildNoScreenSetup', 'buildNoScreenSetup', 'compiled', (on) => buildNoScreenSetup(nothing as CatalogueSource, { recipe: one(on), keys: {}, builtAt: BUILT_AT })],
    ['the Harmony Touch\'s build', 'buildTouchDocuments', 'document', (on) => touchFamily.kind === 'document' && touchFamily.build(touch(on) as never, nothing)],
    ['buildTouchDocuments', 'buildTouchDocuments', 'document', (on) => buildTouchDocuments(touch(on), nothing)],
    ['touchSetupOfDocument', 'the Harmony Touch\'s documents', 'document', (on) => touchSetupOfDocument(touch(on), nothing as CatalogueSource)],
  ];
  for (const [route, contract, kind, call] of routes) {
    stopsAsNotBuilt(() => call(unreadByAll), `${contract} for the device Television's holdInterDeviceDelay`, 16, route);
    if (kind === 'compiled') stopsAsNotBuilt(() => call(readByTouch), `${contract} for the device Television's power`, 14, route);
    else passesTheGuard(() => call(readByTouch), `${route}, a field the Touch reads`);
    // The control: without the field the same call goes past the guard and fails on its stand ins, or builds.
    passesTheGuard(() => call({}), `${route} without the field`);
  }
});

test('a setup file of the earlier form states no field of version 2: its reader and each of its routes refuse one, naming the route', () => {
  const earlier = (on: Parameters<typeof document>[1]): Json => ({ ...document(TOUCH, on), touch: {} });
  const file = (on: Parameters<typeof document>[1]): EarlierTouchSetupFile => ({ ...readRecipe(document(TOUCH, on)), touch: {} as never });
  const on = { device: { power: { alwaysOn: true } } };
  const routes: readonly (readonly [string, () => unknown])[] = [
    ['readEarlierTouchSetupFile', () => readEarlierTouchSetupFile(earlier(on))],
    ['setupOfEarlierSetupFile', () => setupOfEarlierSetupFile(file(on), {} as TouchCatalogue)],
    ['settingsOfEarlierSetupFile', () => settingsOfEarlierSetupFile(file(on))],
    ['buildEarlierTouchDocuments', () => buildEarlierTouchDocuments(file(on), {} as never)],
  ];
  for (const [route, call] of routes) {
    assert.throws(call, (error: unknown) => error instanceof ComposeRefusal
      && error.message.startsWith(`${route}: a setup file of the earlier form states no field of version 2, and this one states the device Television's power`), route);
  }
  // The control: the reader of the earlier form goes past that check on a file with none, to its own next refusal.
  assert.throws(() => readEarlierTouchSetupFile(earlier({})), (error: unknown) => error instanceof ComposeRefusal && !/field of version 2/.test(error.message));
});
