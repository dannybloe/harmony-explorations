/**
 * `capabilitiesOf`, the one answer an application gets per bench model: its properties and the status of every
 * requirement, decision 33.
 *
 * The properties are asserted whole and exactly for all thirteen models, so a value that changes, appears or disappears is
 * a line in this file's diff and gets asked whether it belongs. Each comes from the model table, the model's family, or
 * a reference page the answer names; the last test holds that every page named exists, and that the family and the
 * skins agree with the registry, the other place that turns a model into a family.
 *
 * **Whether a model's documents build**, `builds`, is held to the build itself: for every bench model it is exactly
 * whether `buildFromRecipe` of a freshly created document of that model gets past the build's not built refusal, and
 * the models it is true for are a literal below, so a family that gains or loses its build is a line in this diff.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BENCH_MODELS, REQUIREMENTS, requirementState, type BenchModel } from '@freeharmony-sdk/base/requirements';
import { buildFromRecipe, NotBuiltError, recipe, type BuildSources, type Recipe } from '../../src/node.ts';
import { capabilitiesOf, type ModelProperties } from '../../src/families/capabilities.ts';
import { buildsFromRecipe, chooseByModel, NoFamilyError } from '../../src/families/registry.ts';
import { FOUR_SLOT as FOUR_SLOT_FAMILY } from '../../src/families/harmony-600-650-700/index.ts';
import { SIDE_KEYS } from '../../src/families/harmony-880-885/index.ts';
import { HARMONY_TOUCH_FAMILY } from '../../src/families/harmony-touch/family.ts';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

const FOUR_SLOT = { name: 'the Harmony 600, 650 and 700', kind: 'compiled' } as const;
const NO_SCREEN = { name: 'the Harmony 300 and 350', kind: 'compiled' } as const;
const ACTIVITY_KEYS = ['Watch TV', 'Watch a Movie', 'Listen to Music'];
const NO_SCREEN_PAGES = ['reference/how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity'];

/** Every bench model's properties, exactly. */
const PROPERTIES: Readonly<Record<string, ModelProperties>> = {
  'harmony-one': {
    architecture: 12, maxDevices: 15, family: { name: 'the Harmony One', kind: 'compiled' }, favourites: 24, panel: 'colour',
    screen: { width: 176, height: 220 }, touch: true, longPress: false, references: [],
  },
  'harmony-600': {
    architecture: 14, maxDevices: 5, family: FOUR_SLOT, favourites: 23, panel: 'monochrome', screen: { width: 128, height: 128 },
    touch: false, longPress: false, activityKeys: ACTIVITY_KEYS, references: [],
  },
  'harmony-650': {
    architecture: 14, maxDevices: 8, family: FOUR_SLOT, favourites: 23, panel: 'colour', screen: { width: 128, height: 128 },
    touch: false, longPress: false, activityKeys: ACTIVITY_KEYS, references: [],
  },
  'harmony-700': {
    architecture: 14, maxDevices: 8, family: FOUR_SLOT, favourites: 23, panel: 'colour', screen: { width: 128, height: 128 },
    touch: false, longPress: false, activityKeys: ACTIVITY_KEYS, references: [],
  },
  // No family serves the Harmony 525, and its record holds no favourite channel buttons.
  'harmony-525': {
    architecture: 9, maxDevices: 12, panel: 'monochrome', screen: { width: 96, height: 64 }, touch: false, longPress: false,
    references: [],
  },
  // No family serves the Harmony 515 either, and its record holds no favourite channel buttons.
  'harmony-515': {
    architecture: 9, maxDevices: 5, panel: 'monochrome', screen: { width: 96, height: 64 }, touch: false, longPress: false,
    references: [],
  },
  'harmony-885': {
    architecture: 8, maxDevices: 15, family: { name: 'the Harmony 880 and 885', kind: 'compiled' }, favourites: 16, panel: 'colour',
    screen: { width: 128, height: 160 }, touch: false, longPress: false, references: [],
  },
  // The 885's family by the model table's architecture, and its own limits from the table's row for skin 45.
  'harmony-785': {
    architecture: 8, maxDevices: 12, family: { name: 'the Harmony 880 and 885', kind: 'compiled' }, favourites: 24, panel: 'colour',
    screen: { width: 128, height: 160 }, touch: false, longPress: false, references: [],
  },
  // No model record: no architecture, device limit or favourites here, by design.
  'harmony-300': {
    family: NO_SCREEN, panel: 'none', touch: false, longPress: false, activitiesAtMost: 1, activityKeys: ['Watch TV'],
    references: [...NO_SCREEN_PAGES, 'reference/remotes/harmony-300/display.md'],
  },
  'harmony-350': {
    family: NO_SCREEN, panel: 'none', touch: false, longPress: true, activitiesAtMost: 1, activityKeys: ['Watch TV'],
    references: [...NO_SCREEN_PAGES, 'reference/remotes/harmony-350/display.md'],
  },
  'harmony-touch': {
    family: { name: 'the Harmony Touch', kind: 'document' }, favourites: 50, screen: { width: 240, height: 320 }, touch: true,
    longPress: true, references: ['reference/remotes/harmony-touch/display.md'],
  },
  // The set of decision 40: no model record and no family for either, so only what Logitech's product records say of
  // a long press is answered, yes for the Elite's skin and no for the hub's.
  'harmony-elite': { longPress: true, references: [] },
  'harmony-hub': { longPress: false, references: [] },
};

test('every bench model\'s properties are exactly these', () => {
  for (const model of BENCH_MODELS) {
    assert.deepEqual(capabilitiesOf(model.key)?.properties, PROPERTIES[model.key], model.name);
  }
  assert.deepEqual(Object.keys(PROPERTIES), BENCH_MODELS.map((model) => model.key));
});

test('the answer carries every requirement in number order, with the status the data gives the model', () => {
  for (const model of BENCH_MODELS) {
    const answer = capabilitiesOf(model.key)!;
    assert.equal(answer.name, model.name);
    assert.deepEqual(answer.skins, model.skins);
    assert.deepEqual(answer.requirements.map((one) => one.requirement.number), REQUIREMENTS.map((one) => one.number));
    for (const one of answer.requirements) assert.equal(one.state, requirementState(model.key, one.requirement.number));
  }
});

test('a skin a remote reports finds its model, and a key or skin of no bench model finds nothing', () => {
  for (const model of BENCH_MODELS) {
    for (const skin of model.skins) assert.equal(capabilitiesOf(skin)?.key, model.key, `skin ${skin}`);
  }
  assert.equal(capabilitiesOf(18), undefined, 'the 520');
  assert.equal(capabilitiesOf(15), undefined, 'the 880');
  assert.equal(capabilitiesOf('harmony-890' as never), undefined);
});

test('the family named is the one the registry chooses for the model, and every page named exists', () => {
  for (const model of BENCH_MODELS) {
    const properties = capabilitiesOf(model.key)!.properties;
    let chosen: string | undefined;
    try {
      chosen = chooseByModel({ name: model.name, skin: model.skins[0]! }).family.name;
    } catch (error) {
      if (!(error instanceof NoFamilyError)) throw error;
    }
    assert.equal(properties.family?.name, chosen, model.name);
    for (const page of properties.references) assert.ok(existsSync(ROOT + page.split('#')[0]!), page);
  }
});

/**
 * What a build of an empty document is given: a moment, a made up account for the Harmony Touch, whose documents carry
 * one, and a catalogue that holds nothing, since an empty document names no device; a Touch's build asks for a
 * catalogue all the same, and one that answers no device keeps the test off any archive.
 */
const EMPTY_SOURCES: BuildSources = {
  builtAt: '2026-11-16T12:00:00',
  account: {
    context: {
      'AccountId-': '1000001',
      CountryCode: 'NL',
      Email: 'john.doe@example.com',
      HouseholdUserProfileUri: null,
      InstallerId: null,
      Language: 'en-GB',
      SetupSession: { Type: 0, SetupType: null },
    },
    tuning: {
      DeviceProfileUri: 'https://example.invalid/john-doe/favourites',
      ContentProfileKey: 1,
    },
  } as never,
  archive: {
    protocols: () => [],
    device: () => assert.fail('an empty document asks the catalogue for no device'),
    commands: () => assert.fail('an empty document asks the catalogue for no commands'),
    driving: () => assert.fail('an empty document asks the catalogue for no driving rules'),
  },
};

/**
 * Whether the build of a document gets past the build's own not built refusal, the one `builds` answers beforehand:
 * true where it builds, false where it throws that refusal, `NotBuiltError` naming `buildFromRecipe` for the model's
 * family with the build's requirement. Anything else is thrown on, a not built of another kind among it, so the test
 * cannot read some other refusal as the answer.
 */
function getsPastTheGate(document: Recipe): boolean {

  try {
    buildFromRecipe(document, EMPTY_SOURCES);
    return true;
  } catch (error) {

    const gate = error instanceof NotBuiltError
      && error.requirement === 4
      && /^buildFromRecipe for the /.test(error.contract);

    if (gate) return false;

    throw error;
  }

}

/**
 * Whether a freshly created document of a bench model builds, or false where no document of it can be created at all,
 * which is a model no family serves: `recipe.create` says not built for it, naming the model.
 */
function freshDocumentBuilds(model: BenchModel): boolean {

  let document: Recipe;
  try {
    document = recipe.create({ name: model.name, skin: model.skins[0]! });
  } catch (error) {
    const noFamily = error instanceof NotBuiltError && error.contract === `recipe.create for the ${model.name}`;
    if (noFamily) return false;
    throw error;
  }

  return getsPastTheGate(document);

}

test('a model builds exactly where a fresh document of it gets past the build\'s not built refusal, and these models build', () => {

  for (const model of BENCH_MODELS) {
    assert.equal(capabilitiesOf(model.key)?.builds, freshDocumentBuilds(model), model.name);
  }

  const building = BENCH_MODELS
    .filter((model) => capabilitiesOf(model.key)!.builds)
    .map((model) => model.key);

  assert.deepEqual(building, [
    'harmony-one',
    'harmony-600',
    'harmony-650',
    'harmony-700',
    'harmony-300',
    'harmony-350',
    'harmony-touch',
  ]);

});

test('the control: the answer follows what a family states, and the gate is told apart from a not built of another kind', () => {

  // The question reads the family and nothing else: a compiled family with its build taken away answers no, the
  // same family with it answers yes, and a document family answers yes, as the build does.
  const { fromRecipe, ...withoutBuild } = FOUR_SLOT_FAMILY;
  assert.equal(typeof fromRecipe, 'function');
  assert.equal(buildsFromRecipe(FOUR_SLOT_FAMILY), true);
  assert.equal(buildsFromRecipe(withoutBuild as typeof FOUR_SLOT_FAMILY), false);
  assert.equal(buildsFromRecipe(SIDE_KEYS), false);
  assert.equal(buildsFromRecipe(HARMONY_TOUCH_FAMILY), true);

  // A document of a model that builds, asking for a key the build does not choose yet, is refused as not built by
  // another requirement after the gate; the classifier throws it on rather than reading it as "does not build".
  const keyed = recipe.open({
    model: { name: 'Harmony 650', skin: 72 },
    devices: [{ name: 'Television', device: 'Made/TV', keys: [{ key: 'VolumeUp', action: { nothing: true } }] }],
    activities: [],
  });

  assert.throws(
    () => getsPastTheGate(keyed),
    (error: unknown) => error instanceof NotBuiltError && error.requirement === 32,
  );

});
