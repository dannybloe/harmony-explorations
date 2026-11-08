/**
 * The Harmony Touch's bench test for 8.5, `todo-touch.md` 8.5, held against the documents it is derived from: Listen to
 * Music and the Denon AV Receiver taken out, and the activities that lost the receiver predicted to start, take keys,
 * switch and end without a code of it.
 *
 * **What the test is.** One file in `irtests/`, `touch-8-5-removal.json`: Off; Watch TV from Off; Volume Up, Volume
 * Down and Mute; Watch a Blu-ray; its Test Sequence entry; Play a Game; Off. Every expectation is derived, never
 * written: `touch85Plans` in `experiments/touchremovaltest.ts` says what the person does and `packages/codec/src/families/harmony-touch/engine.ts`, the engine model 7.1
 * calibrated, says what is sent. `bin/touch-removal-tests.ts --write` writes the file; the first test holds that it is
 * what the derivation gives and what it predicts in outline.
 *
 * **What the predictions rest on.** The documents of the set the bench Touch holds since 8.4's put back, which are the
 * `touch_activity_set_back` fixture's, content and tags, `packages/corpus/test/touch-removal-set.test.ts`, with the
 * removal of `packages/corpus/touch-removals/8.5-removal.json` applied by the codec, `withoutTouchEntries`. Built here
 * from the source so that a change to the removal shows in the predictions, and held equal, document for document, to
 * the set built in the lab and delivered, `work/touch-firmware/sets/8.5-removal`, the fixture `touch_removal_set`. The
 * favourites are the recorded full sync's, as in 7.1.
 *
 * **The control** is the same plan on the set before the removal: the model then predicts eight receiver codes, its
 * power on and TV input at Watch TV's start, the three volume keys, its input at each switch and its power off, so the
 * claim "no code of the receiver" can fail; and the entry tapped is the same sequence at its old place.
 *
 * **Sources checked first.** The 8.5 brief in the lab; `touchactivitytest.ts` and its test, whose derivation this reuses; the
 * lab's `notes/6.10-screens-reads.md`, which reads that the screens drop a key the activity's map does not hold and walk
 * an activity's entries in IndexInMenu order. Logitech's client was not consulted.
 *
 * **What this does not show** is what the remote does: that is the 8.5 run, judged in `touch-removal-runs.test.ts`.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330, the one bench unit; its firmware reports 17 and
 * Logitech's templates file it under 18.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { harmonyTouch } from '@harmony/codec/node';
import * as lab from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/usb/test/touch-recording';

import { BENCH_TOUCH_SETS } from '../src/irmonitor.ts';
import { testDefinitions, type TestDefinition } from '../src/irsession.ts';
import { TOUCH_8_5_ENTRY, TOUCH_8_5_REMOVED, touch85Tests } from '../experiments/touchremovaltest.ts';

const SOURCE = 'touch_activity_set_back';
/** The set 8.5 built in the lab and delivered to the bench Touch, `TOUCH_8_5_SET` in `experiments/touchremovaltest.ts`, by fixture. */
const BUILT = 'touch_removal_set';
const FULL = 'touch_full_sync_recording';
const DESCRIPTION = fileURLToPath(new URL('../../corpus/touch-removals/8.5-removal.json', import.meta.url));
const RECEIVER = TOUCH_8_5_REMOVED.device;

const sourceAnswers = (): harmonyTouch.SyncAnswer[] =>
  (JSON.parse(new TextDecoder().decode(lab.require_(SOURCE))) as { answers: harmonyTouch.SyncAnswer[] }).answers;

/** The source set's answers with the 8.5 removal applied by the codec, in the set's own order. */
function removedAnswers(): harmonyTouch.SyncAnswer[] {
  const answers = sourceAnswers();
  const docs = harmonyTouch.documentsOfAnswers(answers);
  const named = (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { removal: harmonyTouch.NamedRemoval }).removal;
  const removed = harmonyTouch.withoutTouchEntries(docs, harmonyTouch.removalOfNames(docs, named));
  return answers.map((x) => {
    const key = harmonyTouch.documentKeyOf(x.uri);
    return key !== undefined && key in removed ? { ...x, resource: removed[key as keyof typeof removed] } : x;
  });
}

/** The configuration the predictions read: the set's documents and the full sync's favourites. */
function configuration(answers: harmonyTouch.SyncAnswer[]): harmonyTouch.Configuration {
  const recorded = answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi'));
  const documents = Object.create(null) as Record<string, unknown>;
  for (const [address, document] of Object.entries(harmonyTouch.documentsOfAnswers(recorded))) if (address.startsWith('content://')) documents[address] = document;
  Object.assign(documents, harmonyTouch.documentsOfAnswers(answers));
  return harmonyTouch.readConfiguration(documents as harmonyTouch.SyncDocuments);
}

/** Each step's expectations as "device command", in order. */
const sentBy = (definition: TestDefinition) => (at: number): string[] => (definition.steps[at]!.expect ?? []).map((e) => `${String(e.device)} ${e.command ?? ''}`);

test('the 8.5 test file is what the removal gives: the three activities that lost the receiver, its volume keys sending nothing, the moved entry, and no receiver code anywhere',
  lab.needing(lab.skipUnless(SOURCE, FULL, BUILT)), () => {
    // The set built here is the one built in the lab for the remote, so the predictions are that set's.
    const delivered = (JSON.parse(new TextDecoder().decode(lab.require_(BUILT))) as { answers: harmonyTouch.SyncAnswer[] }).answers;
    assert.deepEqual(removedAnswers().map((a) => a.resource), delivered.map((a) => a.resource));
    const derived = touch85Tests(configuration(removedAnswers()));
    const directory = fileURLToPath(new URL('../irtests/', import.meta.url));
    const onDisk = testDefinitions(directory).concat(testDefinitions(fileURLToPath(new URL('../irtests/done/', import.meta.url)))).filter((one) => one.id.startsWith('touch-8-5-'));
    assert.deepEqual(onDisk.map((one) => one.id), ['touch-8-5-removal']);
    assert.deepEqual(onDisk[0]!.definition, JSON.parse(JSON.stringify(derived[0]!.definition)) as TestDefinition);
    const definition = derived[0]!.definition;
    const sent = sentBy(definition);
    assert.equal(definition.steps.length, 7);
    assert.equal(definition.steps.flatMap((s) => s.expect ?? []).length, 11);
    assert.deepEqual(sent(1), ['LG TV PowerOn', 'LG TV InputHdmi1']);
    assert.deepEqual(sent(2), []);
    assert.deepEqual(sent(3), ['Blu-ray PowerOn', 'LG TV InputHdmi2']);
    assert.deepEqual(sent(4), ['Blu-ray Stop', 'Blu-ray TopMenu']);
    assert.deepEqual(sent(5), ['Xbox PowerOn', 'Blu-ray PowerOff', 'LG TV InputHdmi4']);
    assert.deepEqual(sent(6), ['LG TV PowerOff', 'Xbox PowerOff']);
    assert.equal(definition.steps.flatMap((s) => s.expect ?? []).filter((e) => e.device === RECEIVER).length, 0);
    // What the person is asked to see: four activities, six devices, and the entry list closed up.
    const c = configuration(removedAnswers());
    assert.deepEqual([...c.activities].filter((a) => !a.hidden).map((a) => a.order).sort(), [0, 1, 2, 3]);
    assert.equal(c.devices.length, 6);
    assert.ok(!c.devices.some((d) => d.name === RECEIVER) && !c.activities.some((a) => a.name === TOUCH_8_5_REMOVED.activity));
    const movie = c.activities.find((a) => a.name === 'Watch a Blu-ray')!;
    const entries = [...movie.map!.entries.values()].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    assert.deepEqual(entries.map((e) => e.index), [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.equal(entries.at(-1)!.label, TOUCH_8_5_ENTRY);
    // A receiver code heard is named as the receiver's: the monitor's sets include 6.9's put back, which holds it.
    assert.ok(BENCH_TOUCH_SETS.includes('work/touch-firmware/sets/6.9-label-back/set.json'));
  });

test('the control: the same plan on the set before the removal predicts the receiver at the start, on the three volume keys and at the end, so "no receiver code" can fail',
  lab.needing(lab.skipUnless(SOURCE, FULL)), () => {
    const definition = touch85Tests(configuration(sourceAnswers()))[0]!.definition;
    const sent = sentBy(definition);
    assert.ok(sent(1).includes(`${RECEIVER} PowerOn`));
    assert.deepEqual(sent(2), [`${RECEIVER} VolumeUp`, `${RECEIVER} VolumeDown`, `${RECEIVER} Mute`]);
    assert.ok(sent(6).includes(`${RECEIVER} PowerOff`));
    assert.deepEqual(sent(4), ['Blu-ray Stop', 'Blu-ray TopMenu']);
    // Eight receiver codes: its power on and TV input at the start, the three volume keys, its input at each of the two
    // switches, and its power off.
    assert.equal(definition.steps.flatMap((s) => s.expect ?? []).filter((e) => e.device === RECEIVER).length, 8);
  });
