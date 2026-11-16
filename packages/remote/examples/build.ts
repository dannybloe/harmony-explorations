// A document built into what a remote is sent, and the three kinds of answer a build gives instead.
import assert from 'node:assert/strict';

// The Node entry, since a build draws the remote's screens and so needs the fonts it supplies.
import {
  buildFromRecipe, builtDigest, ComposeError, NotBuiltError, recipe, RecipeError, type TouchAccount,
} from '@freeharmony-sdk/config/node';

import { livingRoom, saved } from './library.ts';

// Every stamp a configuration carries is taken from the moment it is built at, so the same document built at the same
// moment gives the same bytes, and `builtDigest` fingerprints what was built. This example wants the same bytes twice,
// so it passes a fixed moment. A build that is sent to a remote passes the current one, `localTimestamp(new Date())`,
// since a Harmony One sets its clock from the stamp when it starts cold.
const builtAt = '2026-11-16T12:00:00';

// A Harmony One is sent one configuration file.
const one = livingRoom({ name: 'Harmony One' });
const configuration = buildFromRecipe(one, { builtAt });
assert.equal(configuration.kind, 'configuration');
assert.match(builtDigest(configuration), /^[0-9a-f]{64}$/);
assert.equal(builtDigest(buildFromRecipe(one, { builtAt })), builtDigest(configuration));

// A Harmony Touch is sent documents. They carry its account's identifiers, which an application keeps with its user's
// data, never in the document; the SDK does not read them off a Touch or its account yet. These are invented.
const account: TouchAccount = {
  context: {
    'AccountId-': '1000001', CountryCode: 'NL', Email: 'john.doe@example.com',
    HouseholdUserProfileUri: 'https://example.invalid/john-doe/household', InstallerId: null, Language: 'en-GB',
    SetupSession: { Type: 0, SetupType: null },
  },
  tuning: { DeviceProfileUri: 'https://example.invalid/john-doe/favourites', ContentProfileKey: 1 },
};
const touch = saved('touch-test');
const documents = buildFromRecipe(touch, { builtAt, account });
assert.equal(documents.kind, 'documents');
if (documents.kind === 'documents') assert.ok('ActivityList' in documents.documents);
// Both kinds say which activities they left out and why: switched off, or using no device. None here.
assert.deepEqual(documents.leftOut, []);

// Instead of a result, a build answers in one of three classes, which an application tells apart.

// 1. A source the caller must give is missing, `RecipeError`: here the Touch's account.
assert.throws(() => buildFromRecipe(touch, { builtAt }), RecipeError);

// 2. What the document asks for is not built yet for its model, `NotBuiltError`, naming the requirement it waits on:
// here a device's own timing, which a Harmony One's build does not write yet.
const [television] = recipe.devices(one);
const timed = recipe.setDevice(one, television!.id, { timing: { interKeyDelay: 250 } }).document;
assert.throws(() => buildFromRecipe(timed, { builtAt }), (error) => error instanceof NotBuiltError && error.requirement === 16);

// 3. The build refuses the document, `ComposeError`: here a screen timeout of no seconds, which the toolkit's own
// change refuses but a document written elsewhere can hold. The check lists the same problem without building.
const written = recipe.open({ ...touch, settings: { ...touch.settings, ScreenTimeout: 0 } });
assert.deepEqual(recipe.check(written).map((problem) => problem.code), ['invalid']);
assert.throws(() => buildFromRecipe(written, { builtAt, account }), ComposeError);
