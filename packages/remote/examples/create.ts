// A document for one remote: created empty for a model, kept as JSON, and opened again; and what the SDK can do for
// a model, asked before a document is started.
import assert from 'node:assert/strict';

import { buildFromRecipe, capabilitiesOf, NotBuiltError, recipe, RecipeError } from '@freeharmony-sdk/config';

// The model is named as Logitech names it. A new document holds no device and no activity, and is valid as it is.
const one = recipe.create({ name: 'Harmony One' });
const touch = recipe.create({ name: 'Harmony Touch' });
assert.deepEqual(recipe.devices(one), []);
assert.deepEqual(recipe.check(touch), []);

// The document is plain data. It goes to disk, across a process boundary or onto an undo stack as it is, and `open`
// reads it back, checking its shape and giving an id to anything that arrives without one.
const saved = JSON.stringify(one);
assert.deepEqual(recipe.open(JSON.parse(saved)), one);

// A name that is no Harmony is refused, `RecipeError`.
assert.throws(() => recipe.create({ name: 'Harmony 9000' }), RecipeError);

// How far the SDK serves a model differs per model and per step. A Harmony 515's document cannot be started yet:
// `create` throws `NotBuiltError`, naming the requirement it waits on, as it does for the Harmony Elite and Hub.
assert.throws(() => recipe.create({ name: 'Harmony 515' }), NotBuiltError);
// A Harmony 885's document can be started and changed, and its build is what is not built yet: `create` succeeds and
// `buildFromRecipe` throws `NotBuiltError`. A model's `create` succeeding does not mean its document builds.
const later = recipe.create({ name: 'Harmony 885' });
assert.throws(() => buildFromRecipe(later, { builtAt: '2026-11-16T12:00:00' }), NotBuiltError);

// So an application asks first. `capabilitiesOf` answers, requirement by requirement, whether an ability is there
// (`met`), still open, not possible on that model, or not known, and gives the model's own properties.
const capabilities = capabilitiesOf('harmony-one')!;
assert.equal(capabilities.name, 'Harmony One');
assert.equal(capabilities.properties.maxDevices, 15);
const sync = capabilities.requirements.find((answer) => answer.requirement.number === 79)!;
assert.ok(sync.requirement.text.length > 0);
assert.ok(['met', 'open', 'impossible', 'unknown'].includes(sync.state.status));
// The Harmony 885's build is one of the abilities still open there.
const build885 = capabilitiesOf('harmony-885')!.requirements.find((answer) => answer.requirement.number === 4)!;
assert.equal(build885.state.status, 'open');
