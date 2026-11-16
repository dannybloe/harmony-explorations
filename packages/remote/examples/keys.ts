// What every key does, asked of a document before anything is built: on a
// Harmony One and on a Harmony Touch.
import assert from 'node:assert/strict';

import { recipe } from '@freeharmony-sdk/config';

import { saved } from './library.ts';

// The keys of a document's model, in its own order: where each is, which
// presses it has, and whose map binds it, an activity's, a device's own, both,
// or the remote itself.
const one = saved('one-test');
const touch = saved('touch-test');
const onOne = recipe.keyNames(one).find((key) => key.key === 'Info')!;
const onTouch = recipe.keyNames(touch).find((key) => key.key === 'Info')!;

// The Harmony One has one command per key, the Harmony Touch a second one
// when the key is held.
assert.deepEqual(onOne.presses, ['short']);
assert.deepEqual(onTouch.presses, ['short', 'held']);

// Keys only the remote binds, such as Off, are listed with why a person
// cannot choose what they do. The Harmony Touch's gestures are keys too, an
// activity's only.
const touchKeys = recipe.keyNames(touch);
const off = touchKeys.find((key) => key.key === 'Off')!;
const swipeUp = touchKeys.find((key) => key.key === 'SwipeUp')!;

assert.equal(off.boundBy, 'remote');
assert.equal(swipeUp.surface, 'gesture');

// Every key an activity's map binds, bound or not, with what each press does
// and whether that is the default.
const [watch] = recipe.activities(touch);

const television = recipe
  .devices(touch)
  .find((device) => device.name === 'LG TV')!;

const activity = {
  activity: watch!.id,
};

const keys = recipe.keys(touch, activity);
const channelUp = keys.find((key) => key.key === 'ChannelUp')!;
const [short, held] = channelUp.presses;

const channelUpOnTelevision = {
  device: television.id,
  command: 'ChannelUp',
};

const nothing = {
  nothing: true,
};

assert.deepEqual(short!.action, channelUpOnTelevision);
assert.equal(short!.isDefault, true);
assert.deepEqual(held!.action, nothing);

// A press that sends a command says how it is sent: the device's settings,
// each the catalogue's or the person's.
if ('sending' in short!) {
  assert.equal(short.sending.settings.interKeyDelay.isDefault, true);
}

// The same question for one key. A person's choice is marked as theirs,
// `isDefault: false`.
const heldChannelUp = {
  owner: activity,
  key: 'ChannelUp',
  press: 'held',
} as const;

const guide = {
  device: television.id,
  command: 'Guide',
};

const changed = recipe.setKey(
  touch,
  heldChannelUp,
  guide,
);

const answer = recipe.key(changed.document, heldChannelUp);

const presses = answer.presses.map((press) => {
  return [press.press, press.action, press.isDefault];
});

assert.deepEqual(presses, [['held', guide, false]]);

// And for a screen: its items in order, each a command or a sequence.
const screen = recipe.screen(touch, activity);

const items = screen.items.map((item) => {
  return 'command' in item ? item.command : item.label;
});

assert.deepEqual(items, ['Home', 'SmartMenu', 'Sleep', 'Netflix']);
