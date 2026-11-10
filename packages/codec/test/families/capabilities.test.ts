/**
 * `capabilitiesOf`, the one answer an application gets per bench model: its properties and the status of every
 * requirement, decision 33.
 *
 * The properties are asserted whole and exactly for all nine models, so a value that changes, appears or disappears is
 * a line in this file's diff and gets asked whether it belongs. Each comes from the model table, the model's family, or
 * a reference page the answer names; the last test holds that every page named exists, and that the family and the
 * skins agree with the registry, the other place that turns a model into a family.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BENCH_MODELS, REQUIREMENTS, requirementState } from '@harmony/base/requirements';
import { capabilitiesOf, type ModelProperties } from '../../src/families/capabilities.ts';
import { chooseByModel, NoFamilyError } from '../../src/families/registry.ts';

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
  'harmony-885': {
    architecture: 8, maxDevices: 15, family: { name: 'the Harmony 880 and 885', kind: 'compiled' }, favourites: 16, panel: 'colour',
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
