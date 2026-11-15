/**
 * **A field of the recipe's version 2 that no build reads stops the build, never silently left out**, decision 43.
 * No family's build reads a person's timing, power, channel tuning, screen, commands, opening screen, favourites, power
 * order, extra steps, sequences, settings, a screen label or a double press yet; a build that went ahead without one
 * would give a configuration the remote accepts and that does something else than the document says, and every check
 * downstream would pass it. So the one build, `buildFromRecipe`, refuses on the first such field as a function not
 * built does, with the requirement the field waits on, before it builds anything or asks for any source.
 *
 * Held here one stated field per kind, on the Harmony One, of a compiled family, and on the Harmony Touch, the
 * document family, each with its requirement; the control, a document of version 2 stating only what no build has to
 * read, goes past the refusal on both. **And every other route to a build refuses the same**, each family's own
 * `fromRecipe`, the Harmony Touch's reader and builders, and the composers of a setup, since this repository's scripts
 * and an application reach those without the one build. And the toolkit says the same: its check lists each field as
 * an error a build refuses on, and its changes, which follow none of these fields through a rename or a removal yet,
 * refuse a document that states one.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// The control builds as far as the first refusal of the family, which may draw our letters.
import '../../src/support/resources.node.ts';
import { buildFromRecipe } from '../../src/families/fromrecipe.ts';
import { assembleSetup } from '../../src/families/harmony-600-650-700/assemble.ts';
import { buildNoScreenSetup, composeNoScreenSetup } from '../../src/families/harmony-300-350/setup.ts';
import {
  buildTouchDocuments, readTouchSetupFile, settingsOfSetupFile, setupOfSetupFile, type TouchSetupFile,
} from '../../src/families/harmony-touch/fromnothing.ts';
import { chooseByModel } from '../../src/families/registry.ts';
import type { Container } from '../../src/container/gspm.ts';
import type { CatalogueSource } from '../../src/catalogue/catalogue.ts';
import type { TouchCatalogue } from '../../src/families/harmony-touch/setup.ts';
import { readRecipe, type Recipe } from '../../src/recipe/recipe.ts';
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

const MODELS: readonly (readonly [string, Json])[] = [['the Harmony One', { name: 'Harmony One', skin: 54 }], ['the Harmony Touch', { name: 'Harmony Touch' }]];

/** One stated field of each kind, the requirement the refusal names, and the words that say where it is. */
const KINDS: readonly (readonly [string, Parameters<typeof document>[1], number, string])[] = [
  ['delays', { device: { timing: { interKeyDelay: 300 } } }, 16, 'the device Television\'s delays'],
  ['repeat count', { device: { timing: { pressMinRepeats: 2 } } }, 17, 'the device Television\'s repeat count'],
  ['power', { device: { power: { alwaysOn: true } } }, 14, 'the device Television\'s power'],
  ['channel tuning', { device: { channelTuning: { fixedDigits: 2 } } }, 18, 'the device Television\'s channel tuning'],
  ['device screen', { device: { screen: [] } }, 35, 'the device Television\'s screen'],
  ['command code', { device: { commands: { Netflix: { code: { keycode: 'NEC1:4:0:12' } } } } }, 19, 'the device Television\'s command Netflix\'s code'],
  ['command sending', { device: { commands: { VolumeUp: { sending: { copies: 2 } } } } }, 89, 'the device Television\'s command VolumeUp\'s sending'],
  ['device double press', { device: { keys: [{ key: 'Play', press: 'double', action: { nothing: true } }] } }, 40, 'the device Television\'s Play key, pressed twice'],
  ['opening screen', { activity: { opensOn: 'Favorites' } }, 91, 'the activity Watch TV\'s opening screen'],
  ['favourites', { activity: { favourites: true } }, 45, 'the activity Watch TV\'s hold on the favourites'],
  ['power order', { activity: { powerOrder: ['Receiver', 'Television'] } }, 90, 'the activity Watch TV\'s power order'],
  ['start steps', { activity: { start: [{ pause: 5 }] } }, 30, 'the activity Watch TV\'s steps at its start'],
  ['end steps', { activity: { end: [{ pause: 5 }] } }, 30, 'the activity Watch TV\'s steps at its end'],
  ['sequences', { activity: { sequences: [{ name: 'Films', steps: [{ device: 'Television', command: 'Netflix' }] }] } }, 37, 'the activity Watch TV\'s sequences'],
  ['screen label', { activity: { screen: [{ device: 'Television', command: 'Netflix', label: 'Films' }] } }, 34, 'the activity Watch TV\'s screen item 1\'s label'],
  ['activity double press', { activity: { keys: [{ key: 'Play', press: 'double', action: { nothing: true } }] } }, 40, 'the activity Watch TV\'s Play key, pressed twice'],
  ['settings', { top: { settings: { Brightness: 20 } } }, 47, 'the remote\'s settings'],
];

test('a field of version 2 stops the one build as not built, with its requirement, on the Harmony One and on the Harmony Touch alike', () => {
  for (const [model, named] of MODELS) {
    for (const [kind, on, requirement, where] of KINDS) {
      assert.throws(() => buildFromRecipe(document(named, on), { builtAt: BUILT_AT }), (error: unknown) => {
        assert.ok(error instanceof NotBuiltError, `${kind} on ${model}: ${String(error)}`);
        assert.equal(error.requirement, requirement, `${kind} on ${model}`);
        assert.equal(error.contract, `buildFromRecipe for ${where}`, `${kind} on ${model}`);
        return true;
      });
    }
  }
});

test('the control: a document of version 2 stating only what no build reads goes past that refusal, on both kinds', () => {
  // The highest ids given change no byte a remote receives. Past the refusal each family meets its own: no archive and
  // no account for the Touch, no catalogue to compose the devices from for the One. Neither is the not built refusal.
  for (const [model, named] of MODELS) {
    assert.throws(() => buildFromRecipe(document(named, { top: { highestIds: { device: 2 } } }), { builtAt: BUILT_AT }), (error: unknown) => {
      assert.ok(error instanceof Error && !(error instanceof NotBuiltError), `${model}: ${String(error)}`);
      return true;
    });
  }
});

test('the toolkit\'s check lists each field as an error a build refuses on, and its changes refuse a document stating one', () => {
  for (const [kind, on, , where] of KINDS) {
    const opened = recipe.open(document({ name: 'Harmony One', skin: 54 }, on));
    const problems = recipe.check(opened).filter((one) => one.code === 'not-on-this-model');
    assert.equal(problems.length, 1, `${kind}: ${JSON.stringify(recipe.check(opened))}`);
    assert.equal(problems[0]!.severity, 'error', kind);
    // A double press is said by the key's own problem, the rest by where the field is.
    if (!kind.endsWith('double press')) assert.equal(problems[0]!.message, `the document states ${where}, which nothing builds yet`, kind);
    // A rename follows no field of version 2 yet, so it refuses rather than leave one naming what is gone.
    assert.throws(() => recipe.setDevice(opened, 'd1', { name: 'Telly' }), (error: unknown) => {
      assert.ok(error instanceof NotBuiltError, `${kind}: ${String(error)}`);
      assert.equal(error.requirement, 76);
      return true;
    }, kind);
  }
  // The highest ids too, which a change does not count from yet: an id would be given twice.
  const ids = recipe.open(document({ name: 'Harmony One', skin: 54 }, { top: { highestIds: { device: 5 } } }));
  assert.deepEqual(recipe.check(ids).filter((one) => one.severity === 'error'), []);
  assert.throws(() => recipe.remove(ids, { device: 'd1' }), (error: unknown) => error instanceof NotBuiltError && error.requirement === 76);
  // A double press is not built by the key's own change either, R40 for either owner, a gesture's requirement.
  const plain = recipe.open(document({ name: 'Harmony One', skin: 54 }, {}));
  for (const owner of [{ device: 'd1' }, { activity: 'a1' }] as const) {
    assert.throws(() => recipe.setKey(plain, { owner, key: 'Play', press: 'double' }, { nothing: true }),
      (error: unknown) => error instanceof NotBuiltError && error.requirement === 40);
  }
});

/**
 * **Every route to a build, each given one stated field**, the power of a device, R14: each refuses first, before it
 * looks at anything else it is given, so the other arguments here are stand ins that would fail every other check.
 * The control for each is the same call on the document without the field, which fails on those stand ins, and so
 * not as not built: what refused was the guard and nothing after it.
 */
test('every route to a build refuses a stated field as not built before anything else: each family\'s fromRecipe, the composers and the Harmony Touch\'s reader and builders', () => {
  const stated = { device: { power: { alwaysOn: true } } } as const;
  const nothing = {} as never;
  const compiled = (name: string, skin?: number): (on: typeof stated | Record<string, never>) => unknown => {
    const model = { name, ...(skin === undefined ? {} : { skin }) };
    const { family, skin: chosen } = chooseByModel(model);
    assert.ok(family.kind === 'compiled' && family.fromRecipe !== undefined, name);
    return (on) => family.fromRecipe!(readRecipe(document(model, on)), chosen, { builtAt: BUILT_AT });
  };
  const one = (on: typeof stated | Record<string, never>): Recipe => readRecipe(document({ name: 'Harmony One', skin: 54 }, on));
  const touchJson = (on: typeof stated | Record<string, never>): Json => document({ name: 'Harmony Touch' }, on);
  /** A Touch's setup file as a caller might build one by hand, with no Touch's part to speak of. */
  const touchFile = (on: typeof stated | Record<string, never>): TouchSetupFile => ({ ...readRecipe(touchJson(on)), touch: nothing });
  const touchFamily = chooseByModel({ name: 'Harmony Touch' }).family;
  assert.equal(touchFamily.kind, 'document');
  const routes: readonly (readonly [string, string, (on: typeof stated | Record<string, never>) => unknown])[] = [
    ['the Harmony One\'s fromRecipe', 'the Harmony One\'s fromRecipe', compiled('Harmony One', 54)],
    ['the Harmony 650\'s fromRecipe', 'the Harmony 600, 650 and 700\'s fromRecipe', compiled('Harmony 650')],
    ['the Harmony 350\'s fromRecipe', 'the Harmony 300 and 350\'s fromRecipe', compiled('Harmony 350')],
    ['the Harmony Touch\'s readSetup', 'readTouchSetupFile', (on) => touchFamily.kind === 'document' && touchFamily.readSetup(touchJson(on))],
    ['the Harmony Touch\'s build', 'buildTouchDocuments', (on) => touchFamily.kind === 'document' && touchFamily.build(touchFile(on) as never, nothing)],
    ['readTouchSetupFile', 'readTouchSetupFile', (on) => readTouchSetupFile(touchJson(on))],
    ['setupOfSetupFile', 'setupOfSetupFile', (on) => setupOfSetupFile(touchFile(on), nothing as TouchCatalogue)],
    ['settingsOfSetupFile', 'settingsOfSetupFile', (on) => settingsOfSetupFile(touchFile(on))],
    ['buildTouchDocuments', 'buildTouchDocuments', (on) => buildTouchDocuments(touchFile(on), nothing)],
    ['composeSetup', 'composeSetup', (on) => composeSetup(one(on), { donor: new Uint8Array(0), builtAt: BUILT_AT })],
    ['composeSetupParts', 'composeSetupParts', (on) => composeSetupParts(nothing as Container, one(on), nothing, nothing, nothing, () => undefined)],
    ['assembleSetup', 'assembleSetup', (on) => assembleSetup(one(on), { donor: new Uint8Array(0), builtAt: BUILT_AT })],
    ['composeNoScreenSetup', 'composeNoScreenSetup', (on) => composeNoScreenSetup(nothing as Container, nothing as CatalogueSource, { recipe: one(on), keys: {} })],
    ['buildNoScreenSetup', 'buildNoScreenSetup', (on) => buildNoScreenSetup(nothing as CatalogueSource, { recipe: one(on), keys: {}, builtAt: BUILT_AT })],
  ];
  for (const [route, contract, call] of routes) {
    assert.throws(() => call(stated), (error: unknown) => {
      assert.ok(error instanceof NotBuiltError, `${route}: ${String(error)}`);
      assert.equal(error.contract, `${contract} for the device Television's power`, route);
      assert.equal(error.requirement, 14, route);
      return true;
    }, route);
    // The control: without the field the same call goes past the guard and fails on its stand ins, or builds.
    try {
      call({});
    } catch (error) {
      assert.ok(!(error instanceof NotBuiltError), `${route} without the field: ${String(error)}`);
    }
  }
});
