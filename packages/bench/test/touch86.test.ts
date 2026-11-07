/**
 * The Harmony Touch's bench test for 8.6, `todo-touch.md` 8.6, held against the documents it is derived from: the whole
 * test setup composed by us, and the ten 7.1 tests as the run, `src/touch86.ts`.
 *
 * **What is held.** The ten 7.1 tests derived from the setup composed out of `packages/corpus/touch-setups/
 * 8.6-test-setup.json` onto the source set, by the same derivation 7.1 uses (`touch71Tests` over
 * `touch71Configuration`, `src/touchbench.ts`), are the files in `irtests/` as they stand, file for file, step for step,
 * and the same as those derived from the source set itself. So the setup predicts what the set it was described from
 * predicts, and the 8.6 run is those ten files: 10 tests, 418 expectations. The setup is built here from the source and
 * the description by the codec, and held equal, document for document, to the set built in the lab and delivered to
 * the remote, `work/touch-firmware/sets/8.6-setup`, the fixture `touch_setup_set`.
 *
 * **The control**: the same description with one key of Watch TV sending another command gives a different Watch TV
 * keys test, so "the files as they stand" can fail.
 *
 * **What the predictions rest on.** The set the bench Touch holds since 8.5's put back, `8.5-removal-back`, the
 * `touch_removal_set_back` fixture, and the favourites of the recorded full sync, as in 7.1.
 *
 * **Sources checked first.** The 8.6 brief in the lab; `touch71.test.ts` and `touch85.test.ts`, whose derivation this
 * reuses. Logitech's client was not consulted.
 *
 * **What this does not show** is what the remote does: that is the 8.6 run, judged in `touch86-runs.test.ts`.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330, the one bench unit; its firmware reports 17 and
 * Logitech's templates file it under 18.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { harmonyTouch } from '@harmony/codec';
import * as lab from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/usb/test/touch-recording';

import { testDefinitions, type TestDefinition } from '../src/irsession.ts';
import { TOUCH_8_6_TESTS } from '../src/touch86.ts';
import { touch71Configuration, touch71Tests } from '../src/touchbench.ts';

const SOURCE = 'touch_removal_set_back';
/** The set 8.6 built in the lab and delivered to the bench Touch, `TOUCH_8_6_SET` in `src/touch86.ts`, by fixture. */
const BUILT = 'touch_setup_set';
const FULL = 'touch_full_sync_recording';
const DESCRIPTION = fileURLToPath(new URL('../../corpus/touch-setups/8.6-test-setup.json', import.meta.url));
const IRTESTS = fileURLToPath(new URL('../irtests/', import.meta.url));

type Answers = { answers: harmonyTouch.SyncAnswer[] };
const sourceSet = (): Answers => JSON.parse(new TextDecoder().decode(lab.require_(SOURCE))) as Answers;
const description = (): harmonyTouch.TouchSetup => (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { setup: harmonyTouch.TouchSetup }).setup;

/** The source set's answers with the four documents of `setup` composed onto its base in place of its own. */
function composedAnswers(setup: harmonyTouch.TouchSetup): harmonyTouch.SyncAnswer[] {
  const answers = sourceSet().answers;
  const docs = harmonyTouch.documentsOfAnswers(answers);
  const ours = harmonyTouch.composeTouchSetup(harmonyTouch.setupBaseOf(docs), setup, harmonyTouch.catalogueOfSet(docs));
  return answers.map((a) => {
    const key = harmonyTouch.documentKeyOf(a.uri);
    return key !== undefined && key in ours ? { ...a, resource: ours[key as keyof typeof ours] } : a;
  });
}

const favourites = (): Record<string, unknown> =>
  harmonyTouch.documentsOfAnswers(answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi')));
const derive = (answers: harmonyTouch.SyncAnswer[]) => touch71Tests(touch71Configuration({ answers }, favourites()));
const plain = (d: TestDefinition): TestDefinition => JSON.parse(JSON.stringify(d)) as TestDefinition;

test('the 8.6 run is the ten 7.1 test files as they stand: the setup composed from the description derives them file for file, as the set it describes does',
  lab.needing(lab.skipUnless(SOURCE, FULL)), () => {
    const ours = derive(composedAnswers(description()));
    const theirs = derive(sourceSet().answers);
    const onDisk = testDefinitions(IRTESTS).filter((one) => one.id.startsWith('touch-7-1-'));
    assert.deepEqual(ours.map((t) => t.id), [...TOUCH_8_6_TESTS]);
    assert.deepEqual(onDisk.map((t) => t.id), [...TOUCH_8_6_TESTS]);
    for (const [i, t] of ours.entries()) {
      assert.deepEqual(plain(t.definition), onDisk[i]!.definition, t.id);
      assert.deepEqual(plain(t.definition), plain(theirs[i]!.definition), t.id);
    }
    assert.equal(ours.flatMap((t) => t.definition.steps.flatMap((s) => s.expect ?? [])).length, 418);
  });

test('the set built in the lab for the remote is the setup composed here, document for document', lab.needing(lab.skipUnless(SOURCE, BUILT)), () => {
  const delivered = (JSON.parse(new TextDecoder().decode(lab.require_(BUILT))) as Answers).answers;
  assert.deepEqual(composedAnswers(description()).map((a) => a.resource), delivered.map((a) => a.resource));
});

test('the control: Watch TV\'s first key sending another command derives a different Watch TV keys test, and only that one',
  lab.needing(lab.skipUnless(SOURCE, FULL)), () => {
    const setup = description();
    const [first, ...rest] = setup.activities;
    assert.equal(first!.name, 'Watch TV');
    const buttons = [...first!.buttons!];
    const other = buttons.find((b) => 'command' in b.press && 'command' in buttons[0]!.press && b.press.command !== buttons[0]!.press.command)!;
    buttons[0] = { ...buttons[0]!, press: other.press };
    const changed = derive(composedAnswers({ ...setup, activities: [{ ...first!, buttons }, ...rest] }));
    const onDisk = testDefinitions(IRTESTS).filter((one) => one.id.startsWith('touch-7-1-'));
    const differing = changed.filter((t, i) => JSON.stringify(plain(t.definition)) !== JSON.stringify(onDisk[i]!.definition)).map((t) => t.id);
    assert.deepEqual(differing, ['touch-7-1-4-watch-tv-keys']);
  });
