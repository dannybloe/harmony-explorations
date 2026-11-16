# A guide with examples

Each example on this page is a small program, kept as a file beside the libraries and run as a test whenever they
change, so the code here is the code that ran. Each states what it shows with `assert`: a line that asserts is a
fact about what the call gives, and the program stops on the first one that does not hold. In the code a document
is a `Recipe`, and `recipe` is the toolkit that makes and changes one.

Two things stand in for what an application brings itself. Two saved documents, a Harmony One's and a Harmony
Touch's in `packages/remote/examples/documents/`, stand in for documents an application would open of its own;
`library.ts` beside the examples holds the helpers that open them, shown under
[what the examples start from](#what-the-examples-start-from). And a pretend remote, which answers a sync or a read
exactly as a remote on the cable does, failures included, stands in for a remote, so nothing needs to be attached.
The folder runs as it is once the five packages are installed: each program with `node <file>.ts`, all but
`library.ts` and `read-attached.ts`, which are modules the others import.

Every name used here is in [the API reference](api/README.md), and every shape in [the documents](documents.md).

## A first program

The smallest complete program: a document for a Harmony One, one device added to it, the document checked and built
into the file the remote is sent. It needs one thing it cannot make itself: a device's definition, the commands the
device understands and how each is sent. An application gets that from a source of devices, shown further on; this
program takes it from the saved Harmony Touch document through `library.ts`, so it runs from the examples' folder, or
anywhere with `library.ts` and `documents/` copied beside it.

<!-- example:packages/remote/examples/first.ts -->
```ts
// A first program: a document for a Harmony One, one device added to it, the
// document checked and built into the file the remote is sent. Nothing needs
// to be attached.
import assert from 'node:assert/strict';

// On Node, the config package's Node entry. It carries the main entry whole
// and supplies the fonts the check and the build draw the remote's screens
// with.
import {
  buildFromRecipe,
  localTimestamp,
  recipe,
} from '@freeharmony-sdk/config/node';

// A device's definition, taken from the saved document in `documents/`
// beside these examples. A definition is the device's and not the remote's,
// so a television a Harmony Touch's document carries goes into a Harmony
// One's as it is.
import { carried } from './library.ts';

// 1. A document for one remote, created empty for its model, which is named
// as Logitech names it. In the code a document is a `Recipe`, and `recipe` is
// the toolkit that makes and changes one.
let document = recipe.create({
  name: 'Harmony One',
});

// 2. A device added. The change returns a new document, which is the one
// kept.
const change = recipe.addDevice(document, {
  name: 'Television',
  device: carried('LG TV'),
});

document = change.document;

// 3. The document checked: no problems, so it can be built.
assert.deepEqual(recipe.check(document), []);

// 4. Built into what a Harmony One is sent: one configuration file, stamped
// with the moment it is built at.
const built = buildFromRecipe(document, {
  builtAt: localTimestamp(new Date()),
});

assert.equal(built.kind, 'configuration');

// The bytes are what a sync writes to the remote, later in the guide.
if (built.kind === 'configuration') {

  const size = built.bytes.length;

  console.log(`a configuration for the ${built.model}, ${size} bytes`);
}
```
<!-- /example -->

What just happened: `recipe.create` made an empty document for the model, a `Recipe`, plain data that goes to disk
and back as JSON. `recipe.addDevice` returned a new document holding the television and its definition, so the
document builds with no source of devices at hand. `recipe.check` found no problem, and
`buildFromRecipe` turned the document into the configuration file a Harmony One is sent, which is what a sync writes
to the remote. [How it fits together](overview.md) shows where each of these steps sits; the sections below take
each of them further.

## Installing and importing

Before any of this, an application adds the packages and imports from each the names it needs.

Add the five packages to an application as [the opening page](README.md#licence-version-and-how-to-get-it) says,
then import each by its name. The config package's main entry loads anywhere, a browser and an Electron renderer
included; on Node, import its Node entry, `@freeharmony-sdk/config/node`, which carries the main entry whole and
supplies the fonts a build draws with. A write is a subpath of its own, `@freeharmony-sdk/remote/write`, so that an
application that writes says so in its imports.

<!-- example:packages/remote/examples/imports.ts -->
```ts
// What an application imports: each package by its name, and a write subpath
// only where it writes.
import assert from 'node:assert/strict';

import { MODELS_BY_SKIN } from '@freeharmony-sdk/base';
import {
  buildFromRecipe,
  capabilitiesOf,
  recipe,
} from '@freeharmony-sdk/config';
import { readConfig } from '@freeharmony-sdk/remote';
import { pretendRemote, syncDocument } from '@freeharmony-sdk/remote/write';
import { listHarmony } from '@freeharmony-sdk/usb';

// Every one of them is an ordinary function or value, loaded with nothing
// attached: importing a package opens no remote.
const loaded = [
  buildFromRecipe,
  capabilitiesOf,
  recipe.create,
  readConfig,
  pretendRemote,
  syncDocument,
  listHarmony,
];

for (const one of loaded) {
  assert.equal(typeof one, 'function');
}

// The table of models is plain data, keyed by the number each model reports
// for itself.
assert.equal(MODELS_BY_SKIN[54]?.name, 'One');
```
<!-- /example -->

## What the examples start from

`library.ts` is a module the other examples import, so each can start from something to work on: a saved document
opened again, a device's definition taken from one, a small document with a television, a receiver and an activity
that uses both, and the invented account identifiers a Harmony Touch's build needs. An application starts from a
document of its own instead, created or opened, and takes its devices from a source of devices, as the next sections
show.

<!-- example:packages/remote/examples/library.ts -->
```ts
// What the other examples start from.
//
// `saved` opens a document saved earlier, as an application opens one of its
// own: the two in `documents/` beside this file, a Harmony One's and a Harmony
// Touch's, are copies of the SDK's own test setups. `carried` takes a device's
// definition from one of them, the way a source of devices hands one over.
// `livingRoom` is a small document made with the toolkit: a television, a
// receiver and one activity. `inventedAccount` stands in for the account a
// Harmony Touch's build needs.
import { readFileSync } from 'node:fs';

import {
  recipe,
  type CarriedDevice,
  type Recipe,
  type RecipeModel,
  type TouchAccount,
} from '@freeharmony-sdk/config';

/** The names of the two saved documents in `documents/`. */
export type SavedName =
  | 'one-test'
  | 'touch-test';

/** The devices the Harmony Touch's saved document carries, by name. */
export type CarriedName =
  | 'LG TV'
  | 'Denon AV Receiver'
  | 'Blu-ray'
  | 'Xbox';

/** A document saved earlier: the Harmony One's or the Harmony Touch's. */
export function saved(name: SavedName): Recipe {

  const file = new URL(`documents/${name}.json`, import.meta.url);

  // `open` checks the shape of what it is given, so a file edited by hand or
  // saved by an older application is read or refused, never misread.
  return recipe.open(JSON.parse(readFileSync(file, 'utf8')));

}

/**
 * One device with its definition, as `recipe.addDevice` takes it, from the
 * devices the Harmony Touch's saved document carries.
 */
export function carried(name: CarriedName): CarriedDevice {

  const library = saved('touch-test');
  const device = library.devices.find((one) => one.name === name)!;

  // The definition is what the device understands: its commands and how each
  // is sent. A document carries it, so it builds with no source attached.
  return {
    source: 'library',
    entry: device.device,
    definition: device.definition!,
    protocols: library.protocols ?? [],
  };

}

/** A television, a receiver and an activity that uses both, for any model. */
export function livingRoom(model: RecipeModel): Recipe {

  let document = recipe.create(model);

  // Every change returns a new document; `.document` is the one to keep.
  document = recipe.addDevice(document, {
    name: 'Television',
    device: carried('LG TV'),
  }).document;

  document = recipe.addDevice(document, {
    name: 'Receiver',
    device: carried('Denon AV Receiver'),
  }).document;

  const [television, receiver] = recipe.devices(document);

  // An activity names its devices by id, with the input each is switched to
  // and the roles it plays: the television shows the picture, the receiver
  // sets the volume.
  return recipe.addActivity(document, {
    name: 'Watch TV',
    type: 'WatchTV',
    devices: [
      {
        device: television!.id,
        input: 'HDMI 1',
        roles: ['Display'],
      },
      {
        device: receiver!.id,
        input: 'CBL/SAT',
        roles: ['Volume'],
      },
    ],
  }).document;

}

/**
 * A Harmony Touch's account: the identifiers its documents carry, which its
 * build needs. An application keeps them with its user's own data, never in
 * the document, and the SDK does not read them off a Touch or its account yet.
 * These are invented.
 */
export const inventedAccount: TouchAccount = {
  context: {
    'AccountId-': '1000001',
    CountryCode: 'NL',
    Email: 'someone@example.com',
    HouseholdUserProfileUri: 'https://example.invalid/household',
    InstallerId: null,
    Language: 'en-GB',
    SetupSession: {
      Type: 0,
      SetupType: null,
    },
  },
  tuning: {
    DeviceProfileUri: 'https://example.invalid/favourites',
    ContentProfileKey: 1,
  },
};
```
<!-- /example -->

## A document for a model

A document is the one thing an application holds per remote, so it is the first thing made.

A document is created empty for a model, named as Logitech names it, and is valid as it stands. What the SDK can do
for that model is a question of its own, which `capabilitiesOf` answers before a document is started.

<!-- example:packages/remote/examples/create.ts -->
```ts
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
```
<!-- /example -->

## Adding a device from the catalogue

A device has to be in the document before an activity or a key can use it.

A device is found by asking every source of devices at once, then fetched, and its definition goes into the document,
so the document builds and stays editable when no source answers any more. A source is any object that can find and
fetch: on Node, `archiveSourceAt` of the config package's Node entry reads Logitech's device archive from a folder
that holds one in its published layout. The SDK neither ships nor downloads an archive, and the source that would read
one over the network, `networkArchiveSource`, is not built yet. Devices a person has taught the remote, or kept from
an earlier document, are a source an application writes itself, as this example does.

<!-- example:packages/remote/examples/add-device.ts -->
```ts
// A device found in a source of devices, fetched, and added to a document with
// its definition.
import assert from 'node:assert/strict';

import {
  fetchDevice,
  findDevices,
  recipe,
  type CarriedDevice,
  type DeviceSource,
  type FoundDevice,
} from '@freeharmony-sdk/config';

import { saved as open } from './library.ts';

// A source is anything that can find a device and fetch its definition. On
// Node, `archiveSourceAt` of `@freeharmony-sdk/config/node` reads the device
// archive from a folder that holds one; the SDK neither ships nor fetches an
// archive, and the source that reads one over the network,
// `networkArchiveSource`, is not built yet. This one is a small library of
// devices an application kept: the definitions a saved document carries, here
// the Harmony Touch's document beside these examples.
const saved = open('touch-test');

const library: CarriedDevice[] = saved.devices.map((device) => ({
  source: 'library',
  entry: device.device,
  definition: device.definition!,
  protocols: saved.protocols ?? [],
}));

// What a search lists for one of them: its maker and model, read off its
// catalogue entry, `<manufacturer>/<model>`, and how well it matched.
function found(device: CarriedDevice): FoundDevice {

  const [manufacturer = '', model = ''] = device.entry.split('/');

  return {
    source: 'library',
    entry: device.entry,
    manufacturer,
    model,
    match: 1,
  };

}

// A search by maker, ignoring case, and a fetch by catalogue entry.
const source: DeviceSource = {
  name: 'library',
  find: async (query) => {

    const wanted = query.manufacturer?.toLowerCase();
    const all = library.map(found);

    if (wanted === undefined) {
      return all;
    }

    return all.filter((one) => one.manufacturer.toLowerCase() === wanted);
  },
  fetch: async (result) => {
    return library.find((device) => device.entry === result.entry)!;
  },
};

// One search asks every source at once and lists what they found, best first;
// a source that fails is named in `failed` and the others still answer.
const search = await findDevices([source], {
  manufacturer: 'denon',
});

assert.deepEqual(search.failed, []);

const receiver = search.found[0]!;

assert.equal(receiver.manufacturer, 'Denon');

// Fetching brings the definition, which the document then carries, so it
// builds and stays editable when no source answers any more.
const carried = await fetchDevice([source], receiver);

const empty = recipe.create({
  name: 'Harmony One',
});

const change = recipe.addDevice(empty, {
  name: 'Receiver',
  device: carried,
});

const [device] = recipe.devices(change.document);

assert.equal(device!.name, 'Receiver');
assert.equal(device!.manufacturer, 'Denon');

// Its commands, by name, as a key or a screen entry names them.
const commands = recipe.commands(change.document, device!.id);

assert.ok(commands.some((command) => command.name === 'Mute'));
```
<!-- /example -->

## Changing a key, a screen and an activity

Changes are how a person's edits reach the document.

Every change returns a new document and a list of what else it touched, so an application can show the effects and
keep the new document or drop it. Things are addressed by id, never by name or position, so a rename changes nothing
else. What a model does not have is refused as not on this model; what nobody has built yet throws `NotBuiltError`,
naming what it waits on, and each function's description in the API reference says which parts are not built yet.

<!-- example:packages/remote/examples/change.ts -->
```ts
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
```
<!-- /example -->

## What every key does

An editor shows what each key will do, so a person sees the result of a change at once.

Before anything is built, a document answers what each key will do: every key of the model, every press it has, what
each press sends and whether that is the default or the person's choice. This is where the Harmony One and the
Harmony Touch differ most: the One has one command per key, the Touch a second one on a held key and gestures on its
screen.

<!-- example:packages/remote/examples/keys.ts -->
```ts
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
```
<!-- /example -->

## Checking a document

The check is what an application shows a person while they edit, so a problem is fixed before a build or a sync
meets it.

The check lists every problem at once, each with a code and the place it concerns, so an application can show it
beside the field. An error stops a build and a sync; a note stops nothing.

<!-- example:packages/remote/examples/check.ts -->
```ts
// A document checked before it is built: every problem as a list, each at the
// place it concerns.
import assert from 'node:assert/strict';

// On Node the config package's Node entry supplies the fonts a check judges
// names with; in a browser or a renderer, `supplyResources` hands them over.
import { recipe } from '@freeharmony-sdk/config/node';

import { livingRoom } from './library.ts';

let document = livingRoom({
  name: 'Harmony One',
});

const [television] = recipe.devices(document);

// An activity with no device yet is not wrong, only unfinished: a note, which
// stops nothing. A build and a sync leave it out until it has a device.
const later = recipe.addActivity(document, {
  name: 'Later',
  type: 'Custom',
  devices: [],
});

document = later.document;

// A change writes the document whether or not the model's build reads that
// field yet. A Harmony One's build does not read a device's own timing, so
// the check says so as an error, and a build refuses until it is given back.
const timed = recipe.setDevice(document, television!.id, {
  timing: {
    interKeyDelay: 250,
  },
});

document = timed.document;
const problems = recipe.check(document);

const found = problems.map((problem) => {
  return [problem.severity, problem.code, problem.place.kind];
});

assert.deepEqual(found, [
  ['note', 'unfinished', 'activity'],
  ['error', 'not-on-this-model', 'device'],
]);

// `message` is a sentence for a person; `code` and `place` are what an
// application acts on.
for (const problem of problems) {
  assert.ok(problem.message.length > 0);
}

// Given back to the catalogue's value, the error is gone; the note stays
// until the activity has a device.
const untimed = recipe.setDevice(document, television!.id, {
  timing: 'default',
});

document = untimed.document;
const left = recipe.check(document).map((problem) => problem.severity);

assert.deepEqual(left, ['note']);
```
<!-- /example -->

## Building

A sync builds the document itself; an application builds on its own where it wants what the remote is sent without
sending it, to compare it or to keep it.

A build turns a document into what the remote is sent: one configuration file for a Harmony One, documents for a
Harmony Touch. When it cannot, it answers in one of three classes: the document is refused, `ComposeError`; what the
document asks for is not built yet for its model, `NotBuiltError`; or a source the caller must give is missing,
`RecipeError`.

<!-- example:packages/remote/examples/build.ts -->
```ts
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
```
<!-- /example -->

## Syncing to the pretend remote

A sync is how a document reaches a remote, and the pretend remote lets every screen of it be built and tried with
nothing attached.

A sync checks the document, builds it, writes it with the model's own write path and reports as it goes. It reports
twice: events for a screen, and the lines of a journal that is required, the record of what was sent to the remote.
Keep the journal where it outlives the process, such as a file: if the process is cut off part way through a write,
the journal is the only account of what reached the remote.

From the check on, every refusal and every failure is an outcome and not an exception: a document the check or the
build refuses, a remote that is not the document's model, a refusal by the write path or its checks, a stop, and a
failure of the remote or the cable, each saying what it left the remote as.

<!-- example:packages/remote/examples/sync.ts -->
```ts
// A document synced to a pretend Harmony One and a pretend Harmony Touch,
// following what the sync reports.
import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  localTimestamp,
  NotBuiltError,
  recipe,
} from '@freeharmony-sdk/config/node';
import {
  pretendRemote,
  SYNC_STATES,
  syncDocument,
  type SyncEvent,
} from '@freeharmony-sdk/remote/write';

import { inventedAccount, livingRoom, saved } from './library.ts';

// The phases each kind of sync reports, in order. A configuration written
// into a remote's memory is backed up first, then read back and the remote
// restarted; a Harmony Touch hands up the changes made on its own screens
// first, and commits what it is sent by itself.
const configurationPhases = [
  'identify',
  'check',
  'build',
  'backup',
  'write',
  'verify',
  'restart',
];

const documentPhases = [
  'identify',
  'check',
  'build',
  'hand-over',
  'write',
];

// A pretend remote answers a sync as a remote on the cable does, its events,
// outcomes and failures included, with nothing attached; it holds what was
// synced to it for as long as the object lives.
const harmonyOne = {
  name: 'Harmony One',
};

const one = pretendRemote({
  model: harmonyOne,
});

const document = livingRoom(harmonyOne);

// The journal is required: every line the write path reports, which is the
// record of what was sent to the remote. It is kept where it outlives the
// process, here a file in a folder of its own, so that a sync that is cut off
// part way still leaves its account behind. The events are for a person
// watching and are not that record.
const folder = mkdtempSync(join(tmpdir(), 'sync-journal-'));
const journalFile = join(folder, 'journal.txt');

function journal(line: string): void {
  appendFileSync(journalFile, `${line}\n`);
}

// A configuration is stamped with the moment it is built at, and a Harmony One
// sets its clock from that stamp when it starts cold, so a sync passes the
// current moment. The same moment is kept for a sync run again, since a remote
// that holds part of a build recognises its own blocks only against the same
// bytes.
const builtAt = localTimestamp(new Date());
const events: SyncEvent[] = [];

const outcome = await syncDocument({
  document,
  remote: one,
  sources: { builtAt },
  commit: true,
  onEvent: (event) => events.push(event),
  journal,
});

assert.deepEqual(outcome, {
  result: 'written',
  remote: 'new-configuration',
});

// The phases it went through, and what it asked of a person on the way.
const phases = events.flatMap((event) => {
  return event.kind === 'phase' ? [event.phase] : [];
});

const attention = events.flatMap((event) => {
  return event.kind === 'attention' ? [event.attention] : [];
});

assert.deepEqual(phases, configurationPhases);
assert.deepEqual(attention, ['do-not-unplug', 'restarting', 'safe-to-unplug']);

// The write reports how far it is, so a screen can show a bar.
const progress = events.flatMap((event) => {
  return event.kind === 'progress' && event.phase === 'write' ? [event] : [];
});

const last = progress.at(-1)!;

assert.equal(last.done, last.total);

// The outcome is also the last event, and the journal holds the account.
assert.deepEqual(events.at(-1), {
  kind: 'outcome',
  outcome,
});

assert.ok(readFileSync(journalFile, 'utf8').length > 0);

// What every sync below has in common: the moment, the commit and the journal,
// and no one watching its events.
const common = {
  sources: { builtAt },
  commit: true,
  onEvent: () => {},
  journal,
};

// The same document built at the same moment again: the same bytes, so the
// remote already holds it.
const again = await syncDocument({
  ...common,
  document,
  remote: one,
});

assert.equal(again.result, 'nothing-to-write');

// A failure is an outcome, not an exception, and leaves the remote in a state
// of a closed list, which says what is true of it, whether it may be
// unplugged and what puts it right: data to act on, beside a sentence to
// show.
const failing = pretendRemote({
  model: harmonyOne,
  failIn: 'write',
});

const failed = await syncDocument({
  ...common,
  document,
  remote: failing,
});

assert.equal(failed.result, 'failed');
assert.equal(failed.phase, 'write');
assert.equal(failed.state, 'write-unfinished');
assert.equal(SYNC_STATES[failed.state!].unplug, false);

// So is a refusal. A Harmony 885's document can be started, and its build is
// not built yet: the sync gets as far as the build and ends `refused`, with
// the remote as it was.
const harmony885 = {
  name: 'Harmony 885',
};

const later = await syncDocument({
  ...common,
  document: recipe.create(harmony885),
  remote: pretendRemote({
    model: harmony885,
  }),
});

assert.deepEqual([later.result, later.remote], ['refused', 'as-before']);

// A sync rejects in two cases only, both before anything is opened. One is a
// document of a model whose sync is not built, with `NotBuiltError`, such as a
// Harmony 350's: every model but the Harmony One, 600, 650, 700 and 885 and
// the Harmony Touch. The other is a pretend remote `pretendRemote` did not
// make, with a `TypeError`.
const harmony350 = {
  name: 'Harmony 350',
};

const notBuilt = syncDocument({
  ...common,
  document: recipe.create(harmony350),
  remote: pretendRemote({
    model: harmony350,
  }),
});

await assert.rejects(notBuilt, NotBuiltError);

// A Harmony Touch asks for its documents and is answered: no backup, no read
// back and no restart, and a hand over of the changes made on its own screens
// first. Its build needs the account's identifiers, which an application
// holds already.
const touch = pretendRemote({
  model: {
    name: 'Harmony Touch',
  },
});

const touchPhases: string[] = [];

const synced = await syncDocument({
  document: saved('touch-test'),
  remote: touch,
  sources: {
    builtAt,
    account: inventedAccount,
  },
  commit: true,
  onEvent: (event) => {
    if (event.kind === 'phase') {
      touchPhases.push(event.phase);
    }
  },
  journal,
});

assert.equal(synced.result, 'written');
assert.deepEqual(touchPhases, documentPhases);
```
<!-- /example -->

## Reading a remote

Reading is how an application finds out what a remote holds before it changes anything.

A read takes a remote's configuration whole and checks it before it hands anything back. On the cable,
`listHarmony` finds a remote without opening it, `openHarmony` opens it to read, and a `HarmonyRemote` over the
transport it gives is what `readConfig` reads through, with the profile `profileFor` gives for the remote's product
id. That step is a function of its own, called here with a pretend remote in place of the cable:

<!-- example:packages/remote/examples/read-attached.ts -->
```ts
// Reading the remote on the cable: found without opening it, opened to read,
// read whole and let go. A module and not a program, since running it would
// claim a remote: `read.ts` and the examples' test call `readRemote` with a
// pretend remote in place of `openAttached`.
import {
  profileFor,
  readConfig,
  type ConfigRead,
  type ConfigReader,
  type ReadProgress,
  type RemoteProfile,
} from '@freeharmony-sdk/remote';
import { HarmonyRemote, listHarmony, openHarmony } from '@freeharmony-sdk/usb';

/**
 * What a read needs of a remote: something to read through, the profile of
 * its model, and a way to let go.
 */
export interface Opened {
  readonly reader: ConfigReader;
  readonly profile: RemoteProfile;
  readonly close: () => Promise<void>;
}

/**
 * The one Harmony on the cable, opened to read. `listHarmony` only asks what
 * is attached; `openHarmony` claims the remote, and the transport it gives
 * passes reads alone. `HarmonyRemote` speaks the remote's commands over that
 * transport, and is what `readConfig` reads through; it is told the model's
 * address rule by the profile.
 */
export async function openAttached(): Promise<Opened> {

  const attached = await listHarmony();

  if (attached.length !== 1) {

    const message = `${attached.length} remotes are attached; attach one, `
      + 'or open the one wanted by its path';

    throw new Error(message);
  }

  const profile = profileFor(attached[0]!.productId);

  const transport = await openHarmony({
    productId: profile.productId,
  });

  const remote = new HarmonyRemote(transport, {
    architecture: profile.architecture,
  });

  return {
    reader: remote,
    profile,
    close: () => remote.close(),
  };

}

/**
 * Read a remote's configuration whole, reporting progress, and let go of the
 * remote whatever happens.
 */
export async function readRemote(
  open: () => Promise<Opened> = openAttached,
  onProgress?: (progress: ReadProgress) => void,
): Promise<ConfigRead> {

  const {
    reader,
    profile,
    close,
  } = await open();

  // Progress is passed on only when it was asked for, so a read with no
  // watcher reports to no one.
  const options = onProgress === undefined ? {} : { onProgress };

  try {
    return await readConfig(
      reader,
      profile,
      options,
    );
  } finally {
    await close();
  }

}
```
<!-- /example -->

What the configuration holds is then read with the config package. The pretend remote is on the write subpath,
`@freeharmony-sdk/remote/write`, so an application that only reads still imports that subpath to try its reading
screens with nothing attached. A Harmony Touch keeps documents rather than a configuration, and reading them off the
remote is not built yet; neither is reading its account's identifiers, which its build needs.

<!-- example:packages/remote/examples/read.ts -->
```ts
// A remote's configuration read, with progress, and what it holds read out of
// it.
import assert from 'node:assert/strict';

import { activities, devices, parse } from '@freeharmony-sdk/config';
import { type ReadProgress } from '@freeharmony-sdk/remote';

// The pretend remote lives on the write subpath, beside the sync it also
// answers, so even a read only application imports that subpath to try its
// reading screens with nothing attached.
import { pretendReader, pretendRemote } from '@freeharmony-sdk/remote/write';

import { livingRoom } from './library.ts';
import { readRemote, type Opened } from './read-attached.ts';

// On the cable, `readRemote()` opens the one attached remote with
// `openAttached` in `read-attached.ts`. Here a pretend Harmony One stands in,
// holding a configuration built from a document: `pretendReader` gives what
// `openAttached` gives, something to read through and the profile of the
// remote's model.
const harmonyOne = {
  name: 'Harmony One',
};

const remote = pretendRemote({
  model: harmonyOne,
  holds: livingRoom(harmonyOne),
});

async function pretend(): Promise<Opened> {
  return {
    ...pretendReader(remote),
    close: async () => {},
  };
}

// The read takes what the configuration states its own length to be, and
// checks its end marker and its checksum before it hands anything back.
const seen: ReadProgress[] = [];
const read = await readRemote(pretend, (progress) => seen.push(progress));

assert.equal(seen.at(-1)!.done, read.bytes.length);
assert.equal(read.retries, 0);

// What the configuration holds, read by the config package: the devices and
// the activities as the remote has them.
const container = parse(read.bytes);
const deviceNames = devices(container).map((device) => device.name);
const activityNames = activities(container).map((activity) => activity.name);

assert.deepEqual(deviceNames, ['Television', 'Receiver']);
assert.deepEqual(activityNames, ['Watch TV']);
```
<!-- /example -->

## Writing to a remote

What stands between a sync and a user's own remote, and what that means for an application.

A sync to a remote on the cable runs the same code as the pretend one, and every write in it passes the checks of
the USB package, which a caller cannot skip. Two things keep an application read only until it is deliberately
made otherwise:

* **The switches.** A write is refused unless the process was started with them in its environment: a write into a
  remote's flash needs `HARMONY_ENABLE_WRITES=1` and `HARMONY_FIRST_WRITE=1`, a Harmony Touch's sync
  `HARMONY_ENABLE_WRITES=1` and `HARMONY_TOUCH_REQUESTS=1`. Without them a sync ends as refused with the remote as it
  was, and says that the switches did not let it change the remote.
* **The list of remotes.** Which remotes may be written is the libraries' own list, each by the label of its record.
  A label outside the list is refused before anything is opened; the remote on the cable is then opened to read and
  its own identity compared with the record, and a remote that does not match is refused before anything is written.
  The list holds the remotes the SDK's writes are proven on. **Writing a user's own remote is not built yet**, so
  an application can sync to the pretend remote and to no remote of its user's.

The functions that write are on subpaths of their own, `@freeharmony-sdk/remote/write` and
`@freeharmony-sdk/usb/write`, and never on a main entry, so an application that only reads imports none of them. The
one exception is the class `HarmonyRemote` on the USB package's main entry, which also carries the members the write
path uses: they refuse unless the process was started with the switches, and an application never calls them
directly.
