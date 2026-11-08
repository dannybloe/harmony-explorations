/**
 * The empty Harmony Touch configuration, no device and no activity, and what its commit leaves of the favourites and
 * the pictures: `src/families/harmony-touch/empty.ts`, `todo-touch.md` 9.2.
 *
 * **What has to hold, and why each test is here.**
 *
 * 1. **The empty set is the six documents, the four lists emptied, Context and Settings as they stand**, and nothing
 *    else: a favourites document or a picture beside the six is left out, since an empty set makes the remote ask for
 *    none. Context keeps the remote's values because the screens and the engine address documents by its account
 *    number and the favourites by its profile address; Settings keeps them because they are the person's and because
 *    its user backgrounds carry the pictures, test 3. Why each document has the form it has is the module's header.
 * 2. **The gate passes it and the reader reads it as nothing**: no activity, no device, no map, no definition, no
 *    favourites, and `refusalsBeforeASync` empty, on the bench Touch's current set (`8.6-setup-back`). 8.6 measured the
 *    same of its base and never delivered it; 9.2 delivers it, so this is the gate's verdict on the set the run sends.
 * 3. **What the commit keeps**: the empty set makes the screens ask for no favourites document, against three for the
 *    set it was made from, the control, so every favourites document the remote holds is dropped at the commit; and it
 *    makes them ask for two pictures, the bench Settings' one user background and its twin, so the stored pictures are
 *    carried. With Settings' list emptied as well, the second control, they ask for no picture and the pictures would
 *    be dropped too. That is the reading of the module's header: the commit renames the gathered folder over the stored
 *    one (`syncSuccess`, the engine's `core/resourcemanager.lua` in the lab), a favourites document is gathered only
 *    when asked for (`populateList` and `updateContentUser`, the screens' `appscommon/favoritesmanager.lua`; the engine's
 *    own copy of them, `copyContentIndexAndSource`, runs only in a hub's sync, `syncPimento`), and every stored PNG is
 *    copied into the gathered folder only when at least one picture is asked for (`submitImageRequest`, the screens'
 *    `appscommon/harmony.lua`, and `copyImages`, `appscommon/resourcemanager.lua`).
 *
 * **Negative results kept**: the screens' `getRemoteSettings` returns the firmware's default for every setting a
 * Settings without rows lacks, so an empty Settings list raises nothing, and the default background is a picture built
 * into the remote; an empty Context would leave the account number out of every address the screens build, which is
 * why it is not emptied, while an absent `Language` is guarded (`loadRemoteContext`).
 *
 * **Sources checked first.** The reference's `answering-a-sync.md` ("The smallest set of documents", "The entity tag an
 * answerer sends") and `favourites-and-settings.md` ("Which favourites documents are asked for", "Pictures"); the lab's
 * `notes/6.10-screens-reads.md`, `notes/8.5-preflight.md` and `notes/8.6-preflight.md`; the screens' and engine's Lua
 * in the lab's copy of the image, as named above. Logitech's client was not consulted: what a sync leaves is the
 * remote's.
 *
 * **These were readings, held here by the rule they produce.** The 9.2 run on the bench Touch measured two of them, no
 * favourites document and two pictures asked for by the empty set's sync, and the pictures carried, every one asked for
 * with its tag by the put back's; the drop of the favourites documents stays a reading, since a favourites document is
 * asked for untagged whether it is held or not, `packages/bench/test/touch-empty-runs.test.ts`. **Width**: the Harmony
 * Touch alone, firmware 4.15.330; its firmware reports 17 and Logitech's templates file it under 18.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';

import { refusalsBeforeASync } from '../src/families/harmony-touch/check.ts';
import { ComposeRefusal } from '../src/families/harmony-touch/compose.ts';
import { CONFIGURATION_DOCUMENTS, documentsOfAnswers, type SyncAnswer, type SyncDocuments } from '../src/families/harmony-touch/documents.ts';
import { emptyTouchDocuments, favouritesAskedFor, keptAtTheCommit, userBackgroundsAsked } from '../src/families/harmony-touch/empty.ts';
import { readConfiguration } from '../src/families/harmony-touch/read.ts';

/** The set the bench Touch holds since 8.6's put back, which equals 8.5's. */
const BENCH = 'touch_setup_set_back';
/** 8.3's put back, which holds the user's favourites document beside the six. */
const WITH_FAVOURITES = 'touch_favourites_set_back';

// The documents are JSON; the synthetic ones are built and broken as such.
type Json = any;

const documentsOf = (fixture: string): SyncDocuments =>
  documentsOfAnswers((JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as { answers: SyncAnswer[] }).answers);

/** A made up set: one activity, one device, one map, one definition, a Context and a Settings with one user background. */
function madeUp(): Json {
  return {
    ActivityList: { Activities: [{ 'Id-': 1, Name: 'A' }], Note: 'kept' },
    DeviceList: { DevicesWithFeatures: [{ Device: { 'Id-': 2, Name: 'D' } }] },
    MapList: { ButtonMaps: [{ ButtonMapIdentifier: 'x' }] },
    ProtocolList: { Protocols: [{ Id: 3 }] },
    Context: { 'AccountId-': 9, Language: 'en-GB' },
    Settings: { Settings: [{ Name: 'UserImages', Values: ['one.png'] }, { Name: 'ScreenBrightness', Values: ['85'] }], RemoteName: '' },
    'content://1.0/user;somewhere': { preferences: {} },
  };
}

test('the empty set is the six documents, the four lists emptied and every other field kept, Context and Settings as they stand', () => {
  const source = madeUp();
  const empty: Json = emptyTouchDocuments(source);
  assert.deepEqual(Object.keys(empty).sort(), [...CONFIGURATION_DOCUMENTS].sort());
  assert.deepEqual(empty.ActivityList, { Activities: [], Note: 'kept' });
  assert.deepEqual(empty.DeviceList, { DevicesWithFeatures: [] });
  assert.deepEqual(empty.MapList, { ButtonMaps: [] });
  assert.deepEqual(empty.ProtocolList, { Protocols: [] });
  assert.deepEqual(empty.Context, source.Context);
  assert.deepEqual(empty.Settings, source.Settings);
  // Nothing is changed in place.
  assert.equal(source.ActivityList.Activities.length, 1);
});

test('the empty set refuses documents lacking one of the four lists, as the base of a setup does', () => {
  const source = madeUp();
  delete source.ProtocolList.Protocols;
  assert.throws(() => emptyTouchDocuments(source), ComposeRefusal);
});

test('the user backgrounds asked for are two per text entry of the first UserImages row, and none without the row', () => {
  assert.equal(userBackgroundsAsked(madeUp()), 2);
  const two = madeUp();
  two.Settings.Settings[0].Values = ['one.png', 'two.png', null];
  assert.equal(userBackgroundsAsked(two), 4);
  const none = madeUp();
  none.Settings.Settings = [];
  assert.equal(userBackgroundsAsked(none), 0);
  assert.deepEqual(keptAtTheCommit(emptyTouchDocuments(none)), { favourites: [], pictures: false });
});

test('on the bench Touch\'s set, the empty set passes the gate and reads as nothing: no activity, device, map, definition or favourites', lab.skipUnless(BENCH), () => {
  const empty = emptyTouchDocuments(documentsOf(BENCH));
  assert.deepEqual(refusalsBeforeASync(empty), []);
  const c = readConfiguration(empty);
  assert.deepEqual([c.activities.length, c.devices.length, c.maps.length, c.protocols.length, c.favourites.length], [0, 0, 0, 0, 0]);
});

test('on the bench Touch\'s set, the empty set asks for no favourites document against three for its source, and carries the pictures through one user background', lab.skipUnless(BENCH, WITH_FAVOURITES), () => {
  const source = documentsOf(BENCH);
  const empty = emptyTouchDocuments(source);
  // The control: the source with the user's favourites document beside it asks for the user's, the tuning device's
  // and, once the user's names its service, the line up.
  const withUser = { ...documentsOf(WITH_FAVOURITES), ...source };
  assert.equal(favouritesAskedFor(withUser).length, 3);
  assert.equal(favouritesAskedFor(source).length, 2, 'without the user\'s document the line up cannot be placed');
  assert.deepEqual(favouritesAskedFor(empty), []);
  assert.equal(userBackgroundsAsked(empty), 2);
  assert.deepEqual(keptAtTheCommit(empty), { favourites: [], pictures: true });
  // The second control: Settings' list emptied too leaves no picture asked, so the pictures would be dropped.
  const bare: Json = { ...empty, Settings: { ...(empty.Settings as Json), Settings: [] } };
  assert.deepEqual(refusalsBeforeASync(bare), []);
  assert.deepEqual(keptAtTheCommit(bare), { favourites: [], pictures: false });
});
