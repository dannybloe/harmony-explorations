// A Harmony One's document changed: a key and a screen chosen, an activity
// renamed, a device removed.
import assert from 'node:assert/strict';

import { recipe } from '@freeharmony-sdk/config';

import { livingRoom } from './library.ts';

// Every change takes the document and returns a new one, with what else it
// touched; the one given stays as it was.
let document = livingRoom({
  name: 'Harmony One',
});

const [television, receiver] = recipe.devices(document);
const [watch] = recipe.activities(document);

const activity = {
  activity: watch!.id,
};

// A key is named by Logitech's word for it, the name each model's drawing
// carries. By default Mute follows the receiver, the activity's volume device;
// now it mutes the television. A key's place says whose map it is in.
const muteKey = {
  owner: activity,
  key: 'VolumeMute',
};

const muteTelevision = {
  device: television!.id,
  command: 'Mute',
};

const mute = recipe.setKey(
  document,
  muteKey,
  muteTelevision,
);

assert.deepEqual(mute.effects, []);

document = mute.document;

// The activity's screen, the list whole and in order.
const screen = recipe.setScreen(document, activity, [
  {
    device: television!.id,
    command: 'Netflix',
  },
]);

document = screen.document;

// A rename follows the activity everywhere, since everything refers to it by
// id and never by name.
const renamed = recipe.setActivity(document, watch!.id, {
  name: 'Television',
});

document = renamed.document;

assert.equal(recipe.activities(document)[0]!.name, 'Television');

// What the model does not have is refused by name, and the document stays as
// it was: a Harmony One has no second command on a held key.
const heldInfo = {
  owner: activity,
  key: 'Info',
  press: 'held',
} as const;

const info = {
  device: television!.id,
  command: 'Info',
};

const refused = {
  name: 'ChangeRefused',
  reason: 'not-on-this-model',
};

assert.throws(() => {
  recipe.setKey(
    document,
    heldInfo,
    info,
  );
}, refused);

// Removing a device settles everything that used it and says so. The activity
// is kept, and marked as needing attention with every key whose answer
// changed, until the application clears the mark.
const removal = recipe.remove(document, {
  device: receiver!.id,
});

const touched = removal.effects.map((effect) => effect.place.kind);

assert.deepEqual(touched, ['activity-device', 'role', 'attention']);

const [marked] = recipe.activities(removal.document);

const keys = marked!.attention[0]!.keys!.map((key) => {
  return `${key.key}: ${JSON.stringify(key.now)}`;
});

assert.deepEqual(keys, [
  'VolumeUp: {"nothing":true}',
  'VolumeDown: {"nothing":true}',
]);

document = recipe.clearAttention(removal.document, watch!.id).document;

assert.deepEqual(recipe.activities(document)[0]!.attention, []);
