# A guide with examples

Each example on this page is a small program, kept as a file beside the libraries and run as a test whenever they
change, so the code here is the code that ran. Each states what it shows with `assert`: a line that asserts is a
fact about what the call gives, and the program stops on the first one that does not hold. The examples start from
two saved documents kept beside them in `packages/remote/examples/documents/`, a Harmony One's and a Harmony Touch's,
where an application would open a document of its own, and they sync to a pretend remote, so they need nothing
attached. The folder runs as it is once the five packages are installed.

Every name used here is in [the API reference](api/README.md), and every shape in [the documents](documents.md).

## Installing and importing

Add the five packages to an application as [the opening page](README.md#licence-version-and-how-to-get-it) says,
then import each by its name. The config package's main entry loads anywhere, a browser and an Electron renderer
included; on Node, import its Node entry, `@freeharmony-sdk/config/node`, which carries the main entry whole and
supplies the fonts a build draws with. A write is a subpath of its own, `@freeharmony-sdk/remote/write`, so that an
application that writes says so in its imports.

<!-- example:packages/remote/examples/imports.ts -->
```ts
// What an application imports: each package by its name, and a write subpath only where it writes.
import assert from 'node:assert/strict';

import { MODELS_BY_SKIN } from '@freeharmony-sdk/base';
import { buildFromRecipe, capabilitiesOf, recipe } from '@freeharmony-sdk/config';
import { readConfig } from '@freeharmony-sdk/remote';
import { pretendRemote, syncDocument } from '@freeharmony-sdk/remote/write';
import { listHarmony } from '@freeharmony-sdk/usb';

// Every one of them is an ordinary function or value, loaded with nothing attached.
for (const name of [buildFromRecipe, capabilitiesOf, recipe.create, readConfig, pretendRemote, syncDocument, listHarmony]) {
  assert.equal(typeof name, 'function');
}
assert.equal(MODELS_BY_SKIN[54]?.name, 'One');
```
<!-- /example -->

## What the examples start from

Three helpers the other examples share: a saved document opened again, a device's definition taken from one, and a
small document with a television, a receiver and an activity that uses both, made with the calls the next sections
explain.

An application starts elsewhere. A new document comes from `recipe.create`, empty and valid for its model. Its
devices come from a source of devices: on Node, `archiveSourceAt` of `@freeharmony-sdk/config/node` reads Logitech's
device archive from a folder that holds one in its published layout. The SDK neither ships nor downloads an archive,
and the source that would read one over the network, `networkArchiveSource`, is not built yet. Devices a person has
taught the remote, or kept from an earlier document, are a source an application writes itself, as the next example
but one does.

<!-- example:packages/remote/examples/library.ts -->
```ts
// What the other examples start from. `saved` opens a document saved earlier, as an application opens one of its own:
// the two in `documents/` beside this file, a Harmony One's and a Harmony Touch's, are copies of the SDK's own test
// setups. `carried` takes a device's definition from one of them, the way a source of devices hands one over; and
// `livingRoom` is a small document made with the toolkit, a television, a receiver and one activity.
import { readFileSync } from 'node:fs';

import { recipe, type CarriedDevice, type Recipe, type RecipeModel } from '@freeharmony-sdk/config';

/** A document saved earlier: the one for a Harmony One or for a Harmony Touch in `documents/`. */
export function saved(name: 'one-test' | 'touch-test'): Recipe {
  const file = new URL(`documents/${name}.json`, import.meta.url);
  return recipe.open(JSON.parse(readFileSync(file, 'utf8')));
}

/** One device with its definition, as `recipe.addDevice` takes it, from the devices the Touch's test setup carries. */
export function carried(name: 'LG TV' | 'Denon AV Receiver' | 'Blu-ray' | 'Xbox'): CarriedDevice {
  const library = saved('touch-test');
  const device = library.devices.find((one) => one.name === name)!;
  return { source: 'library', entry: device.device, definition: device.definition!, protocols: library.protocols ?? [] };
}

/** A television, a receiver and an activity that uses both, for any model. */
export function livingRoom(model: RecipeModel): Recipe {
  let document = recipe.create(model);
  document = recipe.addDevice(document, { name: 'Television', device: carried('LG TV') }).document;
  document = recipe.addDevice(document, { name: 'Receiver', device: carried('Denon AV Receiver') }).document;
  const [television, receiver] = recipe.devices(document);
  return recipe.addActivity(document, {
    name: 'Watch TV',
    type: 'WatchTV',
    devices: [
      { device: television!.id, input: 'HDMI 1', roles: ['Display'] },
      { device: receiver!.id, input: 'CBL/SAT', roles: ['Volume'] },
    ],
  }).document;
}
```
<!-- /example -->

## A document for a model

A document is created empty for a model, named as Logitech names it, and is valid as it stands. What the SDK can do
for that model is a question of its own, and `create` succeeding does not answer it: a Harmony 885's document can be
started while its build is not built yet, and a Harmony 515's cannot be started at all. `capabilitiesOf` answers it
beforehand, requirement by requirement.

<!-- example:packages/remote/examples/create.ts -->
```ts
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
```
<!-- /example -->

## Adding a device from the catalogue

A device is found by asking every source of devices at once, then fetched, and its definition goes into the document,
so the document builds and stays editable when no source answers any more. A source is any object that can find and
fetch: on Node, `archiveSourceAt` of the config package's Node entry reads the device archive from a folder that
holds one, and an application can add sources of its own, such as the devices its user learned.

<!-- example:packages/remote/examples/add-device.ts -->
```ts
// A device found in a source of devices, fetched, and added to a document with its definition.
import assert from 'node:assert/strict';

import {
  fetchDevice, findDevices, recipe, type CarriedDevice, type DeviceSource, type FoundDevice,
} from '@freeharmony-sdk/config';

import { saved as open } from './library.ts';

// A source is anything that can find a device and fetch its definition. On Node, `archiveSourceAt` of
// `@freeharmony-sdk/config/node` reads the device archive from a folder that holds one; the SDK neither ships nor
// fetches an archive, and the source that reads one over the network, `networkArchiveSource`, is not built yet. This
// one is a small library of devices an application kept: the definitions a saved document carries, here the Harmony
// Touch's document beside these examples.
const saved = open('touch-test');
const library: CarriedDevice[] = saved.devices.map((device) => ({
  source: 'library', entry: device.device, definition: device.definition!, protocols: saved.protocols ?? [],
}));
const found = (device: CarriedDevice): FoundDevice => {
  const [manufacturer = '', model = ''] = device.entry.split('/');
  return { source: 'library', entry: device.entry, manufacturer, model, match: 1 };
};
const source: DeviceSource = {
  name: 'library',
  find: async (query) => library.map(found)
    .filter((one) => query.manufacturer === undefined || one.manufacturer.toLowerCase() === query.manufacturer.toLowerCase()),
  fetch: async (result) => library.find((device) => device.entry === result.entry)!,
};

// One search asks every source at once and lists what they found, best first; a source that fails is named in
// `failed` and the others still answer.
const search = await findDevices([source], { manufacturer: 'denon' });
assert.deepEqual(search.failed, []);
const receiver = search.found[0]!;
assert.equal(receiver.manufacturer, 'Denon');

// Fetching brings the definition, which the document then carries, so it builds and stays editable when no source
// answers any more.
const carried = await fetchDevice([source], receiver);
const change = recipe.addDevice(recipe.create({ name: 'Harmony One' }), { name: 'Receiver', device: carried });
const [device] = recipe.devices(change.document);
assert.equal(device!.name, 'Receiver');
assert.equal(device!.manufacturer, 'Denon');
// Its commands, by name, as a key or a screen entry names them.
assert.ok(recipe.commands(change.document, device!.id).some((command) => command.name === 'Mute'));
```
<!-- /example -->

## Changing a key, a screen and an activity

Every change returns a new document and a list of what else it touched, so an application can show the effects and
keep the new document or drop it. Things are addressed by id, never by name or position, so a rename changes nothing
else. What a model does not have is refused as not on this model; what nobody has built yet is refused as not built,
naming what it waits on.

<!-- example:packages/remote/examples/change.ts -->
```ts
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
```
<!-- /example -->

## What every key does

Before anything is built, a document answers what each key will do: every key of the model, every press it has, what
each press sends and whether that is the default or the person's choice. This is where the Harmony One and the
Harmony Touch differ most: the One has one command per key, the Touch a second one on a held key and gestures on its
screen.

<!-- example:packages/remote/examples/keys.ts -->
```ts
// What every key does, asked of a document before anything is built: on a Harmony One and on a Harmony Touch.
import assert from 'node:assert/strict';

import { recipe } from '@freeharmony-sdk/config';

import { saved } from './library.ts';

// The keys of a document's model, in its own order: where each is, which presses it has, and whose map binds it,
// an activity's, a device's own, both, or the remote itself.
const one = saved('one-test');
const touch = saved('touch-test');
const onOne = recipe.keyNames(one).find((key) => key.key === 'Info')!;
const onTouch = recipe.keyNames(touch).find((key) => key.key === 'Info')!;
// The Harmony One has one command per key, the Harmony Touch a second one when the key is held.
assert.deepEqual(onOne.presses, ['short']);
assert.deepEqual(onTouch.presses, ['short', 'held']);
// Keys only the remote binds, such as Off, are listed with why a person cannot choose what they do.
assert.equal(recipe.keyNames(touch).find((key) => key.key === 'Off')!.boundBy, 'remote');
// The Harmony Touch's gestures are keys too, an activity's only.
assert.equal(recipe.keyNames(touch).find((key) => key.key === 'SwipeUp')!.surface, 'gesture');

// Every key an activity's map binds, bound or not, with what each press does and whether that is the default.
const [watch] = recipe.activities(touch);
const television = recipe.devices(touch).find((device) => device.name === 'LG TV')!;
const keys = recipe.keys(touch, { activity: watch!.id });
const channelUp = keys.find((key) => key.key === 'ChannelUp')!;
const [short, held] = channelUp.presses;
assert.deepEqual(short!.action, { device: television.id, command: 'ChannelUp' });
assert.equal(short!.isDefault, true);
assert.deepEqual(held!.action, { nothing: true });
// A press that sends a command says how it is sent: the device's settings, each the catalogue's or the person's.
if ('sending' in short!) assert.equal(short.sending.settings.interKeyDelay.isDefault, true);

// The same question for one key, and for a screen. A person's choice is marked as theirs, `isDefault: false`.
const changed = recipe.setKey(touch, { owner: { activity: watch!.id }, key: 'ChannelUp', press: 'held' }, { device: television.id, command: 'Guide' });
const answer = recipe.key(changed.document, { owner: { activity: watch!.id }, key: 'ChannelUp', press: 'held' });
assert.deepEqual(answer.presses.map((press) => [press.press, press.action, press.isDefault]), [['held', { device: television.id, command: 'Guide' }, false]]);
const screen = recipe.screen(touch, { activity: watch!.id });
assert.deepEqual(screen.items.map((item) => ('command' in item ? item.command : item.label)), ['Home', 'SmartMenu', 'Sleep', 'Netflix']);
```
<!-- /example -->

## Checking a document

The check lists every problem at once, each with a code and the place it concerns, so an application can show it
beside the field. An error stops a build and a sync; a note stops nothing.

<!-- example:packages/remote/examples/check.ts -->
```ts
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
```
<!-- /example -->

## Building

A build turns a document into what the remote is sent: one configuration file for a Harmony One, documents for a
Harmony Touch. When it cannot, it answers in one of three classes: the document is refused, `ComposeError`; what the
document asks for is not built yet for its model, `NotBuiltError`; or a source the caller must give is missing,
`RecipeError`.

A build is stamped with the moment it is built at, `builtAt`. For a build that goes to a remote, pass the current
moment, `localTimestamp(new Date())`: a Harmony One sets its clock from that stamp when it starts cold, so a fixed
moment would set it wrong. Pass a fixed moment only where the same bytes are wanted twice, as in a test or a
comparison, and pass the same moment again when a sync is run again after one that stopped part way.

<!-- example:packages/remote/examples/build.ts -->
```ts
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
```
<!-- /example -->

## Syncing to the pretend remote

A sync checks the document, builds it, writes it with the model's own write path and reports as it goes. It reports
twice: events for a screen, and the lines of a journal that is required, the record of what was sent to the remote.
Keep the journal where it outlives the process, such as a file: if the process is cut off part way through a write,
the journal is the only account of what reached the remote. The pretend remote answers exactly as a remote on the
cable does, its failures included, so every screen of a sync can be built with nothing attached.

From the check on, every refusal and every failure is an outcome and not an exception: a document the check or the
build refuses, a remote that is not the document's model, a refusal by the write path or its checks, a stop, and a
failure of the remote or the cable, each saying what it left the remote as. A sync rejects in two cases only, both
before anything is opened: with `NotBuiltError` for a document of a model whose sync is not built, which is every
model but the Harmony One, 600, 650, 700 and 885 and the Harmony Touch, and with a `TypeError` for a pretend remote
that `pretendRemote` did not make.

<!-- example:packages/remote/examples/sync.ts -->
```ts
// A document synced to a pretend Harmony One and a pretend Harmony Touch, following what the sync reports.
import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { localTimestamp, NotBuiltError, recipe, type TouchAccount } from '@freeharmony-sdk/config/node';
import { pretendRemote, SYNC_STATES, syncDocument, type SyncEvent } from '@freeharmony-sdk/remote/write';

import { livingRoom, saved } from './library.ts';

// A pretend remote answers a sync as a remote on the cable does, its events, outcomes and failures included, with
// nothing attached; it holds what was synced to it for as long as the object lives.
const one = pretendRemote({ model: { name: 'Harmony One' } });
const document = livingRoom({ name: 'Harmony One' });

// The journal is required: every line the write path reports, which is the record of what was sent to the remote.
// It is kept where it outlives the process, here a file in a folder of its own, so that a sync that is cut off part
// way still leaves its account behind; the events are for a person watching and are not that record.
const journalFile = join(mkdtempSync(join(tmpdir(), 'sync-journal-')), 'journal.txt');
const journal = (line: string): void => appendFileSync(journalFile, `${line}\n`);

// A configuration is stamped with the moment it is built at, and a Harmony One sets its clock from that stamp when it
// starts cold, so a sync passes the current moment. The same moment is kept for a sync run again, since a remote that
// holds part of a build recognises its own blocks only against the same bytes.
const builtAt = localTimestamp(new Date());

const events: SyncEvent[] = [];
const outcome = await syncDocument({
  document, remote: one, sources: { builtAt }, commit: true, onEvent: (event) => events.push(event), journal,
});
assert.deepEqual(outcome, { result: 'written', remote: 'new-configuration' });
assert.deepEqual(events.flatMap((event) => (event.kind === 'phase' ? [event.phase] : [])),
  ['identify', 'check', 'build', 'backup', 'write', 'verify', 'restart']);
assert.deepEqual(events.flatMap((event) => (event.kind === 'attention' ? [event.attention] : [])),
  ['do-not-unplug', 'restarting', 'safe-to-unplug']);
const progress = events.flatMap((event) => (event.kind === 'progress' && event.phase === 'write' ? [event] : []));
assert.equal(progress.at(-1)!.done, progress.at(-1)!.total);
// The outcome is also the last event, and the journal holds the account.
assert.deepEqual(events.at(-1), { kind: 'outcome', outcome });
assert.ok(readFileSync(journalFile, 'utf8').length > 0);

// The same document built at the same moment again: the same bytes, so the remote already holds it.
const again = await syncDocument({ document, remote: one, sources: { builtAt }, commit: true, onEvent: () => {}, journal });
assert.equal(again.result, 'nothing-to-write');

// A failure is an outcome, not an exception, and leaves the remote in a state of a closed list, which says what is
// true of it, whether it may be unplugged and what puts it right: data to act on, beside a sentence to show.
const failing = pretendRemote({ model: { name: 'Harmony One' }, failIn: 'write' });
const failed = await syncDocument({
  document, remote: failing, sources: { builtAt }, commit: true, onEvent: () => {}, journal,
});
assert.equal(failed.result, 'failed');
assert.equal(failed.phase, 'write');
assert.equal(failed.state, 'write-unfinished');
assert.equal(SYNC_STATES[failed.state!].unplug, false);

// So is a refusal. A Harmony 885's document can be started, and its build is not built yet: the sync gets as far as
// the build and ends `refused`, with the remote as it was.
const later = await syncDocument({
  document: recipe.create({ name: 'Harmony 885' }), remote: pretendRemote({ model: { name: 'Harmony 885' } }),
  sources: { builtAt }, commit: true, onEvent: () => {}, journal,
});
assert.deepEqual([later.result, later.remote], ['refused', 'as-before']);

// A sync rejects in two cases only, both before anything is opened: a document of a model whose sync is not built,
// with `NotBuiltError`, such as a Harmony 350's; and a pretend remote `pretendRemote` did not make, with a `TypeError`.
await assert.rejects(syncDocument({
  document: recipe.create({ name: 'Harmony 350' }), remote: pretendRemote({ model: { name: 'Harmony 350' } }),
  sources: { builtAt }, commit: true, onEvent: () => {}, journal,
}), NotBuiltError);

// A Harmony Touch asks for its documents and is answered: no backup, no read back and no restart, and a hand over of
// the changes made on its own screens first. Its build needs the account's identifiers, invented here: the SDK does
// not read them off a Touch or its account yet, so an application has to hold them already.
const account: TouchAccount = {
  context: {
    'AccountId-': '1000001', CountryCode: 'NL', Email: 'john.doe@example.com',
    HouseholdUserProfileUri: 'https://example.invalid/john-doe/household', InstallerId: null, Language: 'en-GB',
    SetupSession: { Type: 0, SetupType: null },
  },
  tuning: { DeviceProfileUri: 'https://example.invalid/john-doe/favourites', ContentProfileKey: 1 },
};
const touch = pretendRemote({ model: { name: 'Harmony Touch' } });
const phases: string[] = [];
const synced = await syncDocument({
  document: saved('touch-test'),
  remote: touch,
  sources: { builtAt, account },
  commit: true,
  onEvent: (event) => { if (event.kind === 'phase') phases.push(event.phase); },
  journal,
});
assert.equal(synced.result, 'written');
assert.deepEqual(phases, ['identify', 'check', 'build', 'hand-over', 'write']);
```
<!-- /example -->

## Reading a remote

A read takes a remote's configuration whole and checks it before it hands anything back. On the cable,
`listHarmony` finds a remote without opening it, `openHarmony` opens it to read, and a `HarmonyRemote` over the
transport it gives is what `readConfig` reads through, with the profile `profileFor` gives for the remote's product
id. That step is a function of its own, called here with a pretend remote in place of the cable:

<!-- example:packages/remote/examples/read-attached.ts -->
```ts
// Reading the remote on the cable: found without opening it, opened to read, read whole and let go. A module and not
// a program, since running it would claim a remote: `read.ts` and the examples' test call `readRemote` with a
// pretend remote in place of `openAttached`.
import { readConfig, profileFor, type ConfigRead, type ConfigReader, type ReadProgress, type RemoteProfile } from '@freeharmony-sdk/remote';
import { HarmonyRemote, listHarmony, openHarmony } from '@freeharmony-sdk/usb';

/** What a read needs of a remote: something to read through, the profile of its model, and a way to let go. */
export interface Opened {
  readonly reader: ConfigReader;
  readonly profile: RemoteProfile;
  readonly close: () => Promise<void>;
}

/**
 * The one Harmony on the cable, opened to read. `listHarmony` only asks what is attached; `openHarmony` claims the
 * remote, and the transport it gives passes reads alone. `HarmonyRemote` speaks the remote's commands over that
 * transport, and is what `readConfig` reads through; it is told the model's address rule by the profile.
 */
export async function openAttached(): Promise<Opened> {
  const attached = await listHarmony();
  if (attached.length !== 1) {
    throw new Error(`${attached.length} remotes are attached; attach one, or open the one wanted by its path`);
  }
  const profile = profileFor(attached[0]!.productId);
  const remote = new HarmonyRemote(await openHarmony({ productId: profile.productId }), {
    architecture: profile.architecture,
  });
  return { reader: remote, profile, close: () => remote.close() };
}

/** Read a remote's configuration whole, reporting progress, and let go of the remote whatever happens. */
export async function readRemote(
  open: () => Promise<Opened> = openAttached,
  onProgress?: (progress: ReadProgress) => void,
): Promise<ConfigRead> {
  const { reader, profile, close } = await open();
  try {
    return await readConfig(reader, profile, onProgress === undefined ? {} : { onProgress });
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
// A remote's configuration read, with progress, and what it holds read out of it.
import assert from 'node:assert/strict';

import { activities, devices, parse } from '@freeharmony-sdk/config';
import { type ReadProgress } from '@freeharmony-sdk/remote';
// The pretend remote lives on the write subpath, beside the sync it also answers, so even a read only application
// imports that subpath to try its reading screens with nothing attached.
import { pretendReader, pretendRemote } from '@freeharmony-sdk/remote/write';

import { livingRoom } from './library.ts';
import { readRemote, type Opened } from './read-attached.ts';

// On the cable, `readRemote()` opens the one attached remote with `openAttached` in `read-attached.ts`. Here a
// pretend Harmony One stands in, holding a configuration built from a document: `pretendReader` gives what
// `openAttached` gives, something to read through and the profile of the remote's model.
const remote = pretendRemote({ model: { name: 'Harmony One' }, holds: livingRoom({ name: 'Harmony One' }) });
const pretend = async (): Promise<Opened> => ({ ...pretendReader(remote), close: async () => {} });

// The read takes what the configuration states its own length to be, and checks its end marker and its checksum
// before it hands anything back.
const seen: ReadProgress[] = [];
const read = await readRemote(pretend, (progress) => seen.push(progress));
assert.equal(seen.at(-1)!.done, read.bytes.length);
assert.equal(read.retries, 0);

// What the configuration holds, read by the config package: the devices and the activities as the remote has them.
const container = parse(read.bytes);
assert.deepEqual(devices(container).map((device) => device.name), ['Television', 'Receiver']);
assert.deepEqual(activities(container).map((activity) => activity.name), ['Watch TV']);
```
<!-- /example -->

## Writing to a remote

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
