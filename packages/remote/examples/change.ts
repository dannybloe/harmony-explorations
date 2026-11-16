// A Harmony One's document changed: a key and a screen chosen, an activity renamed, a device removed.
import assert from 'node:assert/strict';

import { recipe } from '@freeharmony-sdk/config';

import { livingRoom } from './library.ts';

// Every change takes the document and returns a new one, with what else it touched; the one given stays as it was.
let document = livingRoom({ name: 'Harmony One' });
const [television, receiver] = recipe.devices(document);
const [watch] = recipe.activities(document);
const activity = { activity: watch!.id };

// A key is named by Logitech's word for it, the name each model's drawing carries. By default Mute follows the
// receiver, the activity's volume device; now it mutes the television.
const mute = recipe.setKey(document, { owner: activity, key: 'VolumeMute' }, { device: television!.id, command: 'Mute' });
assert.deepEqual(mute.effects, []);
document = mute.document;
// The activity's screen, the list whole and in order.
document = recipe.setScreen(document, activity, [{ device: television!.id, command: 'Netflix' }]).document;
// A rename follows the activity everywhere, since everything refers to it by id.
document = recipe.setActivity(document, watch!.id, { name: 'Television' }).document;
assert.equal(recipe.activities(document)[0]!.name, 'Television');

// What the model does not have is refused by name, and the document stays as it was: a Harmony One has no second
// command on a held key.
assert.throws(
  () => recipe.setKey(document, { owner: activity, key: 'Info', press: 'held' }, { device: television!.id, command: 'Info' }),
  { name: 'ChangeRefused', reason: 'not-on-this-model' },
);

// Removing a device settles everything that used it and says so. The activity is kept, and marked as needing
// attention with every key whose answer changed, until the application clears the mark.
const removal = recipe.remove(document, { device: receiver!.id });
assert.deepEqual(removal.effects.map((effect) => effect.place.kind), ['activity-device', 'role', 'attention']);
const [marked] = recipe.activities(removal.document);
assert.deepEqual(marked!.attention[0]!.keys!.map((key) => `${key.key}: ${JSON.stringify(key.now)}`), [
  'VolumeUp: {"nothing":true}', 'VolumeDown: {"nothing":true}',
]);
document = recipe.clearAttention(removal.document, watch!.id).document;
assert.deepEqual(recipe.activities(document)[0]!.attention, []);
