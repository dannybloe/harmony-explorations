/**
 * The Harmony Touch's bench test for 9.1, `todo-touch.md` 9.1, held against the documents it is derived from: the whole
 * test setup built from a setup file with no Logitech document as input, and the ten 7.1 tests as the run,
 * `experiments/touchfromnothingtest.ts`.
 *
 * **What is held.** The ten 7.1 tests derived from the set 9.1 built in the lab, `work/touch-firmware/sets/9.1-nothing`,
 * the fixture `touch_nothing_set`, by the same derivation 7.1 and 8.6 use (`touch71Tests` over `touch71Configuration`,
 * `src/touchbench.ts`), are the files in `irtests/` as they stand, file for file, step for step, and the same as those
 * derived from 8.6's set, which the bench Touch ran 418 of 418. So the set from nothing predicts what 8.6's predicted,
 * and the run 9.4 makes is those ten files: 10 tests, 418 expectations. That the lab's set is what the setup file, the
 * archive and the account file give is `packages/corpus/test/touch-nothing-set.test.ts`.
 *
 * **The control**: the same set with one key of Watch TV naming another command gives a different Watch TV keys test,
 * and only that one, so "the files as they stand" can fail.
 *
 * **What the predictions rest on.** The set 9.1 built and the favourites of the recorded full sync, as in 7.1 and 8.6,
 * since a set of 9.1 delivers no favourites document and the remote keeps its own.
 *
 * **Sources checked first.** The 9.1 brief in the lab; `touch-setup-predicted.test.ts`, whose derivation this reuses. Logitech's
 * client was not consulted.
 *
 * **What this does not show** is what the remote does: that is the 9.4 run.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330, the one bench unit; its firmware reports 17 and
 * Logitech's templates file it under 18.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { harmonyTouch } from '@harmony/codec/node';
import * as lab from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/usb/test/touch-recording';

import { testDefinitions, type TestDefinition } from '../src/irsession.ts';
import { TOUCH_9_1_TESTS } from '../experiments/touchfromnothingtest.ts';
import { touch71Configuration, touch71Tests } from '../src/touchbench.ts';

/** The set 9.1 built in the lab for the bench Touch, `TOUCH_9_1_SET` in `experiments/touchfromnothingtest.ts`, by fixture. */
const BUILT = 'touch_nothing_set';
/** 8.6's set, which the bench Touch ran. */
const SETUP = 'touch_setup_set';
const FULL = 'touch_full_sync_recording';
const IRTESTS = new URL('../irtests/', import.meta.url).pathname;

type Answers = { answers: harmonyTouch.SyncAnswer[] };
const set = (fixture: string): Answers => JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as Answers;
const favourites = (): Record<string, unknown> =>
  harmonyTouch.documentsOfAnswers(answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi')));
const derive = (answers: harmonyTouch.SyncAnswer[]) => touch71Tests(touch71Configuration({ answers }, favourites()));
const plain = (d: TestDefinition): TestDefinition => JSON.parse(JSON.stringify(d)) as TestDefinition;
const onDisk = () => testDefinitions(IRTESTS).concat(testDefinitions(`${IRTESTS}done/`)).filter((one) => one.id.startsWith('touch-7-1-'));

test('the 9.1 run is the ten 7.1 test files as they stand: the set from nothing derives them file for file, as 8.6\'s set does, 418 expectations',
  lab.needing(lab.skipUnless(BUILT, SETUP, FULL)), () => {
    const ours = derive(set(BUILT).answers);
    const theirs = derive(set(SETUP).answers);
    const files = onDisk();
    assert.deepEqual(ours.map((t) => t.id), [...TOUCH_9_1_TESTS]);
    assert.deepEqual(files.map((t) => t.id), [...TOUCH_9_1_TESTS]);
    for (const [i, t] of ours.entries()) {
      assert.deepEqual(plain(t.definition), files[i]!.definition, t.id);
      assert.deepEqual(plain(t.definition), plain(theirs[i]!.definition), t.id);
    }
    assert.equal(ours.flatMap((t) => t.definition.steps.flatMap((s) => s.expect ?? [])).length, 418);
  });

test('the control: Watch TV\'s first key naming another command derives a different Watch TV keys test, and only that one',
  lab.needing(lab.skipUnless(BUILT, FULL)), () => {
    const answers = set(BUILT).answers;
    const docs = harmonyTouch.documentsOfAnswers(answers);
    const activity = (docs.ActivityList as any).Activities.find((a: { Name: string }) => a.Name === 'Watch TV');
    assert.ok(activity !== undefined);
    const maps = structuredClone(docs.MapList) as any;
    const map = maps.ButtonMaps.find((m: Record<string, unknown>) => m['ActivityId-'] === activity['Id-']);
    const commanded = map.Buttons.filter((b: any) => typeof b.ButtonAction?.CommandName === 'string');
    const other = commanded.find((b: any) => b.ButtonAction.CommandName !== commanded[0].ButtonAction.CommandName || b.ButtonAction['DeviceId-'] !== commanded[0].ButtonAction['DeviceId-']);
    commanded[0].ButtonAction = { ...commanded[0].ButtonAction, CommandName: other.ButtonAction.CommandName, 'DeviceId-': other.ButtonAction['DeviceId-'] };
    const changed = derive(answers.map((a) => (harmonyTouch.documentKeyOf(a.uri) === 'MapList' ? { ...a, resource: maps } : a)));
    const files = onDisk();
    const differing = changed.filter((t, i) => JSON.stringify(plain(t.definition)) !== JSON.stringify(files[i]!.definition)).map((t) => t.id);
    assert.deepEqual(differing, ['touch-7-1-4-watch-tv-keys']);
  });
