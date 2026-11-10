/**
 * The Harmony Touch's bench test for favourites of ours, held against the documents it is derived
 * from, and the claim that what is heard tells the new favourites from the old.
 *
 * **What the test is.** One file in `irtests/`, `touch-8-3-favourites.json`: Off; the favourites screen and the first
 * favourite of the new order tapped, which starts Watch TV; every other favourite tapped in the order shown; Off. Every
 * expectation is derived, never written: `touch83Plans` in `experiments/touchfavouritestest.ts` says what the person does and
 * `packages/codec/src/families/harmony-touch/engine.ts`, the engine model 7.1 calibrated, what is sent. `bin/touch-favourites-tests.ts --write` writes
 * the file; the first test holds that it is what the derivation gives.
 *
 * **What the predictions rest on.** The six documents of the set the bench Touch holds since 8.2's put back, the
 * `touch_activity_set_back` fixture, the favourites documents of the recorded full sync, and the favourites of
 * `packages/corpus/touch-favourites/8.3-favourites.json` composed onto them by the codec, `composeTouchFavourites`: the
 * user's favourites document changed, the tuning device's and the line up kept. Composed here from the source, so a
 * change to the composer shows in the predictions, and held equal to the set the bench Touch was given, the
 * `touch_favourites_set` fixture, which `packages/corpus/test/touch/touch-favourites-set.test.ts` also holds.
 *
 * **What is heard tells the two apart.** A favourite is heard as its channel's digits, so the claim is about the digits
 * in the order of the taps: the six favourites of ours give 0 6 1, 0 0 4, 0 0 3, 0 0 2, 0 0 1, 6 6 6, the channel added
 * first, its number and its padding the line up's number through the LG TV's channel tuning, since the user's document
 * alone names it. **The control** derives the same plan from the recorded favourites, the ones the remote holds before
 * 8.3: five taps, 6 6 6 first and no 0 6 1, so the test cannot pass on the remote's old favourites.
 *
 * **Sources checked first.** The 8.3 brief in the lab; `touchactivitytest.ts`, `touchbench.ts` and their tests, whose derivation
 * this reuses; the screens' favourites page in the lab's firmware copy (`juniper/favoritechannel.lua`, the tap's
 * `changeChannel` with the dial number `getFavoriteDialPositionDetails` fills from the line up). Logitech's client was not
 * consulted.
 *
 * **What this does not show** is what the remote does: that is the 8.3 run, held by `touch-favourites-runs.test.ts`, where the
 * bench run of this file held 18 of 18.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330, the one bench unit; its firmware reports 17 and
 * Logitech's templates file it under 18.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The Node entry, for the fonts, the icons, the deflate and the SHA-256 the core asks its loader for.
import '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';
import * as lab from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/testkit/touch-recording';

import { testDefinitions, type TestDefinition } from '../../src/irsession.ts';
import { TOUCH_8_3_SET, touch83Tests } from '../../experiments/touchfavouritestest.ts';
import { touch71Configuration } from '../../src/touchbench.ts';

const SOURCE = 'touch_activity_set_back';
const FULL = 'touch_full_sync_recording';
/** The set the bench Touch was given for 8.3, by fixture. */
const FAVOURITES_SET = 'touch_favourites_set';
const DESCRIPTION = fileURLToPath(new URL('../../../corpus/touch-favourites/8.3-favourites.json', import.meta.url));

const description = (): harmonyTouch.OwnFavourites => (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { favourites: harmonyTouch.OwnFavourites }).favourites;
const json = (fixture: string): unknown => JSON.parse(new TextDecoder().decode(lab.require_(fixture)));
const recorded = (): harmonyTouch.SyncDocuments =>
  harmonyTouch.documentsOfAnswers(answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi')));

/** The source's six and the recorded favourites, with the description's favourites composed onto them. */
function composed(): { set: { answers: harmonyTouch.SyncAnswer[] }; favourites: harmonyTouch.SyncDocuments } {
  const set = json(SOURCE) as { answers: harmonyTouch.SyncAnswer[] };
  const favourites = recorded();
  const held = Object.fromEntries(Object.entries(favourites).filter(([k]) => k.startsWith('content://')));
  const c = harmonyTouch.composeTouchFavourites(description(), { ...held, ...harmonyTouch.documentsOfAnswers(set.answers) });
  const answers = [...set.answers, ...Object.entries(c.documents).map(([uri, resource]) => ({ uri, resource }))];
  return { set: { answers }, favourites };
}

const testsOf = (set: { answers: unknown[] }, favourites: harmonyTouch.SyncDocuments) => {
  const d = description();
  return touch83Tests(touch71Configuration(set, favourites), d.add ?? [], d.logos?.[0]?.text ?? '');
};

test('the 8.3 test file is what the composed favourites give, step for step', lab.needing(lab.skipUnless(SOURCE, FULL)), () => {
  const { set, favourites } = composed();
  const derived = testsOf(set, favourites);
  const directory = fileURLToPath(new URL('../../irtests/', import.meta.url));
  const onDisk = testDefinitions(directory).concat(testDefinitions(fileURLToPath(new URL('../../irtests/done/', import.meta.url)))).filter((one) => one.id.startsWith('touch-8-3-'));
  assert.deepEqual(onDisk.map((one) => one.id), derived.map((one) => one.id));
  for (const one of derived) {
    assert.deepEqual(onDisk.find((x) => x.id === one.id)!.definition, JSON.parse(JSON.stringify(one.definition)) as TestDefinition, one.id);
  }
});

test('the set the remote was given gives the same test as the composition from the source', lab.needing(lab.skipUnless(SOURCE, FULL, FAVOURITES_SET)), () => {
  assert.equal(lab.IMAGES[FAVOURITES_SET], TOUCH_8_3_SET);
  const { set, favourites } = composed();
  const lab83 = json(FAVOURITES_SET) as { answers: unknown[] };
  assert.deepEqual(JSON.parse(JSON.stringify(testsOf(lab83, favourites))), JSON.parse(JSON.stringify(testsOf(set, favourites))));
});

test('the digits heard, tap by tap, are the six favourites of ours in their new order, and the old favourites cannot give them',
  lab.needing(lab.skipUnless(SOURCE, FULL)), () => {
    const { set, favourites } = composed();
    const [one] = testsOf(set, favourites);
    const steps = one!.definition.steps;
    assert.equal(steps.length, 8);
    assert.deepEqual(steps.map((s) => s.instruction), [
      'Button: Off', 'Button: Favorites → Screen: 61', 'Screen: RTL 4', 'Screen: NPO 3', 'Screen: NPO 2', 'Screen: NPO 1', 'Screen: Zork', 'Button: Off',
    ]);
    // The digits of each tap, a repeated digit spelled out, after the first tap's activity start.
    const digits = steps.slice(1, 7).map((s) => (s.expect ?? []).filter((e) => /^[0-9]$/.test(String(e.command)))
      .flatMap((e) => Array<string>(e.times ?? 1).fill(String(e.command))).join(''));
    assert.deepEqual(digits, ['061', '004', '003', '002', '001', '666']);
    assert.deepEqual((steps[1]!.expect ?? []).slice(0, 4).map((e) => `${e.device} ${e.command}`),
      ['LG TV PowerOn', 'Denon AV Receiver PowerOn', 'Denon AV Receiver InputTVAudio', 'LG TV InputHdmi1']);
    assert.equal(steps.flatMap((s) => s.expect ?? []).length, 18);
    // The control: the same plan derived from the remote's old favourites, the source with no favourites of ours, gives
    // five taps in the old order and no 0 6 1, so the comparison above can fail.
    const old = testsOf(json(SOURCE) as { answers: unknown[] }, favourites)[0]!.definition.steps;
    const oldDigits = old.slice(1, -1).map((s) => (s.expect ?? []).filter((e) => /^[0-9]$/.test(String(e.command)))
      .flatMap((e) => Array<string>(e.times ?? 1).fill(String(e.command))).join(''));
    assert.deepEqual(oldDigits, ['666', '001', '002', '003', '004']);
    assert.notDeepEqual(oldDigits, digits);
  });
