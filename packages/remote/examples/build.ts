// A document built into what a remote is sent, and the three kinds of answer a
// build gives instead.
import assert from 'node:assert/strict';

// The Node entry, since a build draws the remote's screens and so needs the
// fonts it supplies.
import {
  buildFromRecipe,
  builtDigest,
  ComposeError,
  localTimestamp,
  NotBuiltError,
  recipe,
  RecipeError,
} from '@freeharmony-sdk/config/node';

import { inventedAccount, livingRoom, saved } from './library.ts';

// Every stamp a configuration carries is taken from the moment it is built at,
// so the same document built at the same moment gives the same bytes. A build
// that goes to a remote passes the current moment, since a Harmony One sets
// its clock from the stamp when it starts cold; this one keeps that moment to
// build twice from it.
const builtAt = localTimestamp(new Date());

// A Harmony One is sent one configuration file. `builtDigest` fingerprints
// what was built, so two builds can be compared without keeping both.
const one = livingRoom({
  name: 'Harmony One',
});

const configuration = buildFromRecipe(one, { builtAt });
const again = buildFromRecipe(one, { builtAt });

assert.equal(configuration.kind, 'configuration');
assert.match(builtDigest(configuration), /^[0-9a-f]{64}$/);
assert.equal(builtDigest(again), builtDigest(configuration));

// A Harmony Touch is sent documents. They carry its account's identifiers,
// which its build is given beside the document.
const touch = saved('touch-test');

const documents = buildFromRecipe(touch, {
  builtAt,
  account: inventedAccount,
});

assert.equal(documents.kind, 'documents');

if (documents.kind === 'documents') {
  assert.ok('ActivityList' in documents.documents);
}

// Both kinds say which activities they left out and why: switched off, or
// using no device. None here.
assert.deepEqual(documents.leftOut, []);

// Instead of a result, a build answers in one of three classes, which an
// application tells apart.

// 1. A source the caller must give is missing, `RecipeError`: here the
// Touch's account.
assert.throws(() => buildFromRecipe(touch, { builtAt }), RecipeError);

// 2. What the document asks for is not built yet for its model,
// `NotBuiltError`, naming the requirement it waits on: here a device's own
// timing, which a Harmony One's build does not write yet.
const [television] = recipe.devices(one);

const timed = recipe.setDevice(one, television!.id, {
  timing: {
    interKeyDelay: 250,
  },
});

assert.throws(() => {
  buildFromRecipe(timed.document, { builtAt });
}, NotBuiltError);

// 3. The build refuses the document, `ComposeError`: here a screen timeout of
// no seconds, which the toolkit's own change refuses but a document written
// elsewhere can hold. The check lists the same problem without building.
const written = recipe.open({
  ...touch,
  settings: {
    ...touch.settings,
    ScreenTimeout: 0,
  },
});

const codes = recipe.check(written).map((problem) => problem.code);

assert.deepEqual(codes, ['invalid']);

assert.throws(() => {
  buildFromRecipe(written, {
    builtAt,
    account: inventedAccount,
  });
}, ComposeError);
