// A document for one remote: created empty for a model, kept as JSON and
// opened again; and what the SDK can do for a model, asked before a document
// is started.
import assert from 'node:assert/strict';

import { REQUIREMENT_STATUS_NAMES } from '@freeharmony-sdk/base';
import {
  buildFromRecipe,
  capabilitiesOf,
  localTimestamp,
  NotBuiltError,
  recipe,
  RecipeError,
} from '@freeharmony-sdk/config';

// The model is named as Logitech names it. A new document holds no device and
// no activity, and is valid as it is.
const one = recipe.create({
  name: 'Harmony One',
});

const touch = recipe.create({
  name: 'Harmony Touch',
});

assert.deepEqual(recipe.devices(one), []);
assert.deepEqual(recipe.check(touch), []);

// The document is plain data. It goes to disk, across a process boundary or
// onto an undo stack as it is, and `open` reads it back, checking its shape
// and giving an id to anything that arrives without one.
const saved = JSON.stringify(one);

assert.deepEqual(recipe.open(JSON.parse(saved)), one);

// A name that is no Harmony is refused, `RecipeError`.
const noHarmony = {
  name: 'Harmony 9000',
};

assert.throws(() => recipe.create(noHarmony), RecipeError);

// How far the SDK serves a model differs per model and per step. A Harmony
// 515's document cannot be started yet: `create` throws `NotBuiltError`, as it
// does for the Harmony Elite and Hub.
const notYet = {
  name: 'Harmony 515',
};

assert.throws(() => recipe.create(notYet), NotBuiltError);

// A Harmony 885's document can be started and changed, and its build is what
// is not built yet. So a model's `create` succeeding does not mean its
// document builds. `NotBuiltError` names the requirement it waits on.
const later = recipe.create({
  name: 'Harmony 885',
});

let waitsOn: number | undefined;

try {
  buildFromRecipe(later, {
    builtAt: localTimestamp(new Date()),
  });
} catch (error) {
  assert.ok(error instanceof NotBuiltError);
  waitsOn = error.requirement;
}

// So an application asks first. `capabilitiesOf` answers, requirement by
// requirement, whether an ability is there (`met`), still open, not possible
// on that model, or not known, and gives the model's own properties.
const capabilities = capabilitiesOf('harmony-one')!;

assert.equal(capabilities.name, 'Harmony One');
assert.equal(capabilities.properties.maxDevices, 15);

for (const answer of capabilities.requirements) {
  assert.ok(answer.requirement.text.length > 0);
  assert.ok(REQUIREMENT_STATUS_NAMES.includes(answer.state.status));
}

// The requirement the Harmony 885's build waits on is one its answers list as
// still open.
const forThe885 = capabilitiesOf('harmony-885')!.requirements;
const build = forThe885.find((answer) => answer.requirement.number === waitsOn);

assert.equal(build?.state.status, 'open');
