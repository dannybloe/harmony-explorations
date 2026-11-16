// A document checked before it is built: every problem as a list, each at the place it concerns.
import assert from 'node:assert/strict';

// On Node the config package's Node entry supplies the fonts a check judges names with; in a browser or a renderer,
// `supplyResources` hands them over.
import { recipe } from '@freeharmony-sdk/config/node';

import { livingRoom } from './library.ts';

let document = livingRoom({ name: 'Harmony One' });
const [television] = recipe.devices(document);

// An activity with no device yet is not wrong, only unfinished: a note, which stops nothing. A build and a sync leave
// it out until it has a device.
document = recipe.addActivity(document, { name: 'Later', type: 'Custom', devices: [] }).document;
// A change writes the document whether or not the model's build reads that field yet. A Harmony One's build does not
// read a device's own timing, so the check says so as an error, and a build refuses until it is given back.
document = recipe.setDevice(document, television!.id, { timing: { interKeyDelay: 250 } }).document;

const problems = recipe.check(document);
assert.deepEqual(problems.map((problem) => [problem.severity, problem.code, problem.place.kind]), [
  ['note', 'unfinished', 'activity'],
  ['error', 'not-on-this-model', 'device'],
]);
// `message` is a sentence for a person; `code` and `place` are what an application acts on.
for (const problem of problems) assert.ok(problem.message.length > 0);

// Given back to the catalogue's value, the error is gone; the note stays until the activity has a device.
document = recipe.setDevice(document, television!.id, { timing: 'default' }).document;
assert.deepEqual(recipe.check(document).map((problem) => problem.severity), ['note']);
