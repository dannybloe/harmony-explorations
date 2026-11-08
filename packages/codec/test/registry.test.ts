/**
 * The registry by model, plan 013 decisions 1 and 2: every model is chosen a family of the kind its remote needs or
 * refused, a configuration no family serves is refused by each of the four questions a shared composer asks, and the
 * Harmony Touch's family, the one document family, answers each of its members over the fixtures the Touch's own
 * tests use.
 *
 * **What changed, and what it costs.** Until plan 013 the four questions, `traitsOf`, `sendsOf`, `activityStartOf` and
 * `choicesOf`, gave a configuration no family serves the Harmony One's shapes. The measurement before the change ran
 * the whole TypeScript suite with the four instrumented: eight calls reached a fallback, in five tests of
 * `compose.test.ts`, every one a composer on a configuration of the Harmony 525, `sendsOf` and `choicesOf` from
 * `composeDevice` in three and `activityStartOf` from `composeActivity` in two; `traitsOf` was reached by none, and
 * no reader, script or FreeHarmony module reached any. Those five assert the refusal now; this file asserts it once
 * per question.
 *
 * The Harmony Touch is chosen outside the model table, which holds no record of it, by its name and skin 99; the
 * table's 35 models split into 14 a compiled family serves, chosen by their architecture, and 21 refused.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as lab from '@harmony/lab';
import { IR_ARCHIVE, skipWithoutIrArchive } from '@harmony/lab';
import { MODELS_BY_SKIN } from '@harmony/base/models';
import { parse, type Container } from '../src/gspm.ts';
import { inventory, irGroups } from '../src/index.ts';
import {
  activityStartOf, chooseByModel, choicesOf, familyKind, familyOf, familyOfArchitecture, familyOfModel, modelName, NoFamilyError, sendsOf, traitsOf,
} from '../src/families/registry.ts';
import { HARMONY_TOUCH_FAMILY } from '../src/families/harmony-touch/family.ts';
import { NO_SCREEN_FAMILY } from '../src/families/harmony-300-350/index.ts';
import { composeTouchDeviceOfRow, withTouchDevice, type OwnActivity, type RowDevice } from '../src/families/harmony-touch/compose.ts';
import { documentsOfAnswers, type SyncAnswer, type SyncDocuments } from '../src/families/harmony-touch/documents.ts';
import { refusalsBeforeASync } from '../src/families/harmony-touch/check.ts';
import { removalOfNames } from '../src/families/harmony-touch/remove.ts';
import { emptyTouchDocuments } from '../src/families/harmony-touch/empty.ts';
import type { TouchAccount } from '../src/families/harmony-touch/fromnothing.ts';
import { ComposeError } from '../src/shared/core.ts';
import { answersOf, FULL } from './touch-sync.ts';
import { archiveAt } from '../src/catalogue.node.ts';
import '../src/resources.node.ts';

test('every model of the model table is chosen a compiled family by its architecture or refused naming it, 14 and 21 of 35, the Harmony Touch a document family outside the table and the Harmony 300 and 350 a compiled one', () => {
  const served: string[] = [];
  const refused: string[] = [];
  for (const [skin, model] of Object.entries(MODELS_BY_SKIN)) {
    const name = modelName(model);
    const byArchitecture = familyOfArchitecture(model.architecture);
    if (byArchitecture === undefined) {
      assert.throws(() => familyOfModel({ name, skin: Number(skin) }), (e: unknown) =>
        e instanceof NoFamilyError && e.message === `nothing here builds a configuration for the ${name}: no family serves arch ${model.architecture}`);
      refused.push(name);
      continue;
    }
    const family = familyOfModel({ name, skin: Number(skin) });
    // Every model in the table is a remote written with a compiled file, so its family is the compiled kind.
    assert.equal(familyKind(family), 'compiled', name);
    assert.equal(family, byArchitecture, name);
    // By name alone too, since no name in the table is two skins'.
    assert.equal(familyOfModel({ name }), family, name);
    served.push(name);
  }
  assert.deepEqual([served.length, refused.length, Object.keys(MODELS_BY_SKIN).length], [14, 21, 35]);
  assert.deepEqual(served.sort(), [
    'Harmony 600', 'Harmony 600 EMEA', 'Harmony 650', 'Harmony 650 EMEA', 'Harmony 665', 'Harmony 700', 'Harmony 700 EMEA',
    'Harmony 720', 'Harmony 785', 'Harmony 880', 'Harmony 880 Pro', 'Harmony 885', 'Harmony One', 'Harmony One EMEA',
  ]);

  // The Harmony Touch, which the table holds no record of: by its name, by its skin, and refused under another name.
  const touch = chooseByModel({ name: 'Harmony Touch', skin: 99 });
  assert.deepEqual([touch.skin, touch.model, touch.family], [99, undefined, HARMONY_TOUCH_FAMILY]);
  assert.equal(familyOfModel({ name: 'Harmony Touch' }), HARMONY_TOUCH_FAMILY);
  assert.equal(familyKind(HARMONY_TOUCH_FAMILY), 'document');
  assert.throws(() => familyOfModel({ name: 'Harmony One', skin: 99 }), /skin 99 is the Harmony Touch, not the Harmony One/);
  // The Harmony 300 and 350, outside the table too since plan 013 step 7.3.3, and the no screen family's, a compiled one.
  for (const [name, skin] of [['Harmony 300', 79], ['Harmony 350', 104]] as const) {
    const choice = chooseByModel({ name, skin });
    assert.deepEqual([choice.skin, choice.model, choice.family], [skin, undefined, NO_SCREEN_FAMILY]);
    assert.equal(familyOfModel({ name }), NO_SCREEN_FAMILY);
  }
  assert.equal(familyKind(NO_SCREEN_FAMILY), 'compiled');
  assert.throws(() => familyOfModel({ name: 'Harmony 300', skin: 104 }), /skin 104 is the Harmony 350, not the Harmony 300/);
  // And the refusals of the lookup itself, each naming what was asked.
  assert.throws(() => familyOfModel({ name: 'Harmony 650', skin: 9999 }), /no model has skin 9999/);
  assert.throws(() => familyOfModel({ name: 'Harmony 651' }), /no model is called Harmony 651/);
  assert.throws(() => familyOfModel({ name: 'Harmony 650', skin: 74 }), /skin 74 is the Harmony 650 EMEA, not the Harmony 650/);
});

/** A configuration as the registry reads it: the architecture and the version word, whose low byte is the skin. */
const stating = (architecture: number, skin: number | undefined): Container =>
  ({ architecture, versionWord: skin === undefined ? undefined : 0x0300 | skin }) as unknown as Container;

const QUESTIONS = { traitsOf, sendsOf, activityStartOf, choicesOf } as const;

test('a configuration no family serves is refused by each of the four questions, naming its architecture and model, and a served one is answered', () => {
  for (const [name, ask] of Object.entries(QUESTIONS)) {
    assert.throws(() => ask(stating(9, 22)), (e: unknown) => e instanceof NoFamilyError && e instanceof ComposeError
      && /^no family serves arch 9, skin 22, the Harmony 525, so .+ has no answer for it$/.test(e.message), name);
    assert.throws(() => ask(stating(10, 19)), /no family serves arch 10, skin 19, the Harmony 890, so /, name);
    assert.throws(() => ask(stating(9, undefined)), /no family serves arch 9, a skin it does not state, so /, name);
    assert.throws(() => ask(stating(17, 99)), /no family serves arch 17, skin 99, which the model table holds no record of, so /, name);
    // The control: an architecture a family serves is answered, here the Harmony 350's, which the table holds no record of.
    assert.doesNotThrow(() => ask(stating(16, 104)), name);
  }
  // `familyOf` itself answers undefined rather than refusing, since a reader asks it whether a family reads a part.
  assert.equal(familyOf(stating(9, 22)), undefined);
});

test('a Logitech configuration of the Harmony 525 and the 890 is refused by the four questions and still read', lab.skipUnless('h525_config', 'h890_config'), () => {
  for (const [fixture, architecture] of [['h525_config', 9], ['h890_config', 10]] as const) {
    const c = parse(lab.require_(fixture));
    assert.equal(c.architecture, architecture);
    for (const [name, ask] of Object.entries(QUESTIONS)) {
      assert.throws(() => ask(c), new RegExp(`no family serves arch ${architecture}, skin \\d+, `), `${fixture} ${name}`);
    }
    assert.equal(familyOf(c), undefined);
    // Readers are not builders: the configuration still reads, its devices' infrared groups and its inventory.
    assert.ok((irGroups(c) ?? []).length > 0, fixture);
    assert.ok(inventory(c).devices.length > 0, fixture);
  }
});

// ---------------------------------------------------------------------------------------------------
// The Harmony Touch's family, over the fixtures its own tests use
// ---------------------------------------------------------------------------------------------------

/** The six the bench Touch holds since 8.2's put back, `touch-favourites.test.ts` and `touch-settings.test.ts`. */
const SIX = 'touch_activity_set_back';
const sixOf = (): SyncDocuments =>
  documentsOfAnswers((JSON.parse(new TextDecoder().decode(lab.require_(SIX))) as { answers: SyncAnswer[] }).answers);
const corpus = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(`../../corpus/${path}`, import.meta.url), 'utf8')) as Record<string, unknown>;

test('the Touch\'s family adds a device and an activity, takes them out by name, and reads and checks the result, over the recorded full sync', lab.skipUnless(FULL), () => {
  const docs = documentsOfAnswers(answersOf(FULL));
  const family = HARMONY_TOUCH_FAMILY;
  const device = corpus('touch-devices/test-projector.json').device as RowDevice;
  const withDevice = family.withDevice(docs, device);
  // The whole set back, the three a device is told in replaced and the others as given: the module's own answer merged.
  assert.deepEqual(Object.keys(withDevice).filter((k) => withDevice[k] !== docs[k]).sort(), ['DeviceList', 'MapList', 'ProtocolList']);
  assert.deepEqual({ ...withDevice }, { ...docs, ...withTouchDevice(docs, composeTouchDeviceOfRow(device)) });
  assert.equal(family.read(withDevice).devices.length, family.read(docs).devices.length + 1);
  assert.deepEqual(family.check(withDevice), []);

  const activity = corpus('touch-activities/test-cinema.json').activity as OwnActivity;
  const both = family.withActivity(withDevice, activity);
  assert.deepEqual(Object.keys(both).filter((k) => both[k] !== withDevice[k]).sort(), ['ActivityList', 'MapList']);
  assert.equal(family.read(both).activities.length, family.read(docs).activities.length + 1);
  assert.deepEqual(family.check(both), refusalsBeforeASync(both));
  assert.deepEqual(family.check(both), []);

  const removal = removalOfNames(both, { activities: ['Listen to Music'], devices: ['Denon AV Receiver'] });
  const fewer = family.without(both, removal);
  const read = family.read(fewer);
  assert.equal(read.activities.some((a) => a.name === 'Listen to Music'), false);
  assert.equal(read.devices.some((d) => d.name === 'Denon AV Receiver'), false);
  assert.deepEqual(family.check(fewer), []);
  // A refusal of the module is the family's: a device id already listed.
  assert.throws(() => family.withDevice(withDevice, device), /device id 900000001 is already listed/);
});

test('the Touch\'s family composes favourites and settings, and makes the empty set, over the bench unit\'s six', lab.needing(lab.skipUnless(SIX, FULL)), () => {
  const family = HARMONY_TOUCH_FAMILY;
  const recorded = documentsOfAnswers(answersOf(FULL));
  const held: SyncDocuments = { ...Object.fromEntries(Object.entries(recorded).filter(([k]) => k.startsWith('content://'))), ...sixOf() };
  const favourites = family.withFavourites(held, corpus('touch-favourites/8.3-favourites.json').favourites as never);
  assert.equal(Object.keys(favourites.documents).length, Object.keys(held).length);
  assert.equal(favourites.pictures.length, 1);
  assert.deepEqual(family.check(favourites.documents), []);

  const six = sixOf();
  const settings = family.withSettings(six, corpus('touch-settings/8.4-settings.json').settings as never);
  assert.deepEqual(Object.keys(settings).filter((k) => settings[k] !== six[k]), ['Settings']);
  const values = (d: SyncDocuments) => Object.fromEntries((d.Settings?.Settings ?? []).map((r) => [r.Name, r.Values?.[0]]));
  assert.deepEqual([values(settings)['ScreenBrightness'], values(settings)['ScreenTimeout']], ['20', '30']);
  assert.deepEqual(family.check(settings), []);
  const { Settings: _held, ...withoutSettings } = six;
  assert.throws(() => family.withSettings(withoutSettings, { values: { ScreenBrightness: '20' } }), /hold no Settings/);

  const empty = family.empty(six);
  assert.deepEqual({ ...empty }, emptyTouchDocuments(six));
  assert.deepEqual([family.read(empty).devices.length, family.read(empty).activities.length], [0, 0]);
});

/** A made up account, as `touch-fromnothing.test.ts` makes one. */
const ACCOUNT: TouchAccount = {
  context: {
    'AccountId-': 1234, CountryCode: 'GB', Email: 'a person', HouseholdUserProfileUri: 'example.invalid/user/default', InstallerId: null,
    Language: 'en-GB', SetupSession: { Client: 'x', IsStale: false, SetupType: null, Type: 0 },
  },
  tuning: { DeviceProfileUri: 'example.invalid/profile', ContentProfileKey: 77 },
};

test('the Touch\'s family reads its setup file, refuses another model\'s, and builds the six documents from it alone', skipWithoutIrArchive(), () => {
  const family = HARMONY_TOUCH_FAMILY;
  const raw = JSON.parse(readFileSync(new URL('../../corpus/setups/touch-test.json', import.meta.url), 'utf8')) as Record<string, unknown>;
  const setup = family.readSetup(raw);
  assert.throws(() => family.readSetup({ ...raw, model: { name: 'Harmony One', skin: 54 } }), /is for the Harmony One, not the Harmony Touch/);
  const docs = family.build(setup, { archive: archiveAt(IR_ARCHIVE!), account: ACCOUNT });
  assert.deepEqual(Object.keys(docs), ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList']);
  const read = family.read(docs);
  assert.deepEqual([read.activities.length, read.devices.length], [5, 7]);
  assert.deepEqual(family.check(docs), []);
  // The setup file's model chooses this family.
  assert.equal(familyOfModel(setup.model), family);
});
