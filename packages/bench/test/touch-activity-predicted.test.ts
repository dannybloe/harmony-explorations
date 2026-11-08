/**
 * The Harmony Touch's bench test for an activity of ours, `todo-touch.md` 8.2, held against the documents it is
 * derived from, and the claim that its start can be told from every recorded activity's by ear.
 *
 * **What the test is.** One file in `irtests/`, `touch-8-2-activity.json`: Off; Test Cinema started from Off; every
 * key its map binds and every screen entry, tapped; a switch to Watch TV and back; Off. Every expectation is derived,
 * never written: `touch82Plans` in `experiments/touchactivitytest.ts` says what the person does and `packages/codec/src/families/harmony-touch/engine.ts`, the engine
 * model 7.1 calibrated, says what is sent. `bin/touch-activity-tests.ts --write` writes the file; the first test holds
 * that it is what the derivation gives, and what it predicts in outline.
 *
 * **What the predictions rest on.** The documents of the set the bench Touch holds since 8.1's put back, the
 * `touch_device_set_back` fixture, with the activity of `packages/corpus/touch-activities/test-cinema.json` added by
 * the codec, `withTouchActivity`. Built here from the source so that a change to the composer shows in the
 * predictions, and held equal, document for document, to the set the bench Touch was given, the `touch_activity_set`
 * fixture, which `packages/corpus/test/touch-activity-set.test.ts` also holds as parsed JSON, tags and all. The favourites are the
 * recorded full sync's, as in 7.1.
 *
 * **Its start is told from every recorded activity's.** The monitor hears codes in order, so the claim is about the
 * order: the model's start from Off of each of the five recorded activities is compared with Test Cinema's, device and
 * command code by code. Each recorded start opens with the LG TV's or the Denon's PowerOn and Test Cinema's with the
 * Blu-ray's, and no recorded start is the same list. **The control** composes an activity with Watch a Blu-ray's
 * devices, orders and inputs, by the same composer, and the comparison reports it as the same start as Watch a
 * Blu-ray's: the check can fail.
 *
 * **Sources checked first.** The 8.2 brief in the lab; `touchbench.ts`, `touchdevicetest.ts` and their tests, whose
 * derivation this reuses; the engine's `startActivity` and `buttonPress` in the lab's decompiled engine, which the
 * model reads. Logitech's client was not consulted.
 *
 * **What this does not show** is what the remote does: that is the 8.2 run, held by `touch-activity-runs.test.ts`, where the
 * bench run of this file held 33 of 33.
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

import { BENCH_TOUCH_SETS } from '../src/irmonitor.ts';
import { testDefinitions, type TestDefinition } from '../src/irsession.ts';
import { TOUCH_8_2_ACTIVITY, TOUCH_8_2_SET, touch82Tests } from '../experiments/touchactivitytest.ts';
import { BenchTouchEngine, TIMING } from '../src/touchbench.ts';

const SOURCE = 'touch_device_set_back';
const FULL = 'touch_full_sync_recording';
const DESCRIPTION = fileURLToPath(new URL('../../corpus/touch-activities/test-cinema.json', import.meta.url));

const cinema = (): harmonyTouch.OwnActivity => (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { activity: harmonyTouch.OwnActivity }).activity;
const sourceAnswers = (): harmonyTouch.SyncAnswer[] =>
  (JSON.parse(new TextDecoder().decode(lab.require_(SOURCE))) as { answers: harmonyTouch.SyncAnswer[] }).answers;

/** The set's documents with `activities` added in turn, as answers in the set's own order. */
function answersWith(activities: readonly harmonyTouch.OwnActivity[]): harmonyTouch.SyncAnswer[] {
  let answers = sourceAnswers();
  for (const a of activities) {
    const docs = harmonyTouch.documentsOfAnswers(answers);
    const added = harmonyTouch.withTouchActivity(docs, harmonyTouch.composeTouchActivity(a, docs));
    answers = answers.map((x) => {
      const key = harmonyTouch.documentKeyOf(x.uri);
      return key !== undefined && key in added ? { ...x, resource: added[key as keyof typeof added] } : x;
    });
  }
  return answers;
}

/** The configuration the predictions read: the set's documents and the full sync's favourites. */
function configuration(answers: harmonyTouch.SyncAnswer[]): harmonyTouch.Configuration {
  const recorded = answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi'));
  const documents = Object.create(null) as Record<string, unknown>;
  for (const [address, document] of Object.entries(harmonyTouch.documentsOfAnswers(recorded))) if (address.startsWith('content://')) documents[address] = document;
  Object.assign(documents, harmonyTouch.documentsOfAnswers(answers));
  return harmonyTouch.readConfiguration(documents as harmonyTouch.SyncDocuments);
}

/** The set the bench Touch was given for 8.2, by fixture. */
const ACTIVITY_SET = 'touch_activity_set';

test('the 8.2 test file is what the activity set gives: a start of its own, its keys to two devices, its entries, a switch away and back, and Off',
  lab.needing(lab.skipUnless(SOURCE, FULL, ACTIVITY_SET)), () => {
    // The set built here is the one the remote was given, as parsed JSON, so the predictions are the delivered set's.
    const delivered = (JSON.parse(new TextDecoder().decode(lab.require_(ACTIVITY_SET))) as { answers: harmonyTouch.SyncAnswer[] }).answers;
    assert.deepEqual(answersWith([cinema()]).map((a) => a.resource), delivered.map((a) => a.resource));
    assert.equal(lab.IMAGES[ACTIVITY_SET], TOUCH_8_2_SET);
    const derived = touch82Tests(configuration(answersWith([cinema()])));
    const directory = fileURLToPath(new URL('../irtests/', import.meta.url));
    const onDisk = testDefinitions(directory).concat(testDefinitions(fileURLToPath(new URL('../irtests/done/', import.meta.url)))).filter((one) => one.id.startsWith('touch-8-2-'));
    assert.deepEqual(onDisk.map((one) => one.id), ['touch-8-2-activity']);
    assert.deepEqual(onDisk[0]!.definition, JSON.parse(JSON.stringify(derived[0]!.definition)) as TestDefinition);
    const steps = derived[0]!.definition.steps;
    const sent = (at: number) => (steps[at]!.expect ?? []).map((e) => `${String(e.device)} ${e.command ?? ''}`);
    assert.equal(steps.flatMap((s) => s.expect ?? []).length, 33);
    // The start from Off: the Blu-ray before the LG TV, the TV's input, the start steps; no Denon code.
    assert.deepEqual(sent(1), ['Blu-ray PowerOn', 'LG TV PowerOn', 'LG TV InputHdmi2', 'Blu-ray TopMenu']);
    // The keys: the volume keys to the TV, every other key to the player.
    const keys = steps.slice(2, 6).flatMap((s) => s.expect ?? []);
    assert.deepEqual([...new Set(keys.filter((e) => /^Volume|^Mute$/.test(e.command ?? '')).map((e) => e.device))], ['LG TV']);
    assert.equal(keys.filter((e) => e.device === 'Blu-ray').length, 10);
    assert.deepEqual(sent(6), ['Blu-ray TopMenu', 'Blu-ray PopUp', 'Blu-ray Subtitle', 'LG TV Info']);
    // Away to Watch TV: the end step first, then the Denon on and the player off; back: the player on, no Denon code.
    assert.deepEqual(sent(7), ['Blu-ray Stop', 'Denon AV Receiver PowerOn', 'Blu-ray PowerOff', 'LG TV InputHdmi1', 'Denon AV Receiver InputTVAudio']);
    assert.deepEqual(sent(8), ['Blu-ray PowerOn', 'LG TV InputHdmi2', 'Blu-ray TopMenu']);
    assert.deepEqual(sent(9), ['Blu-ray Stop', 'LG TV PowerOff', 'Blu-ray PowerOff', 'Denon AV Receiver PowerOff']);
    // The pause before TopMenu is the 3 s step, as the model's band states it.
    assert.deepEqual(steps[1]!.expect!.at(-1)!.pauseMs, [3000, 3550]);
    assert.ok(BENCH_TOUCH_SETS.includes(TOUCH_8_2_SET), 'the monitor names the codes from the set the remote holds');
  });

/** Each activity's start from Off as the model predicts it, device and command code by code. */
function startsFromOff(c: harmonyTouch.Configuration): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const a of c.activities) {
    const e = new BenchTouchEngine(c, TIMING.low);
    out.set(a.name ?? '', e.start(a.name).map((s) => `${s.device} ${s.command}`));
  }
  return out;
}

/** The recorded activities whose start from Off is the same list of codes as `name`'s. */
function sameStart(c: harmonyTouch.Configuration, name: string): string[] {
  const starts = startsFromOff(c);
  const ours = starts.get(name)!.join('|');
  return [...starts.entries()].filter(([n, s]) => n !== name && s.join('|') === ours).map(([n]) => n);
}

test('Test Cinema\'s start from Off is told from every recorded activity\'s: its first code is the Blu-ray\'s, and no recorded start is the same list',
  lab.needing(lab.skipUnless(SOURCE, FULL)), () => {
    const c = configuration(answersWith([cinema()]));
    const starts = startsFromOff(c);
    assert.equal(starts.size, 6);
    const firsts = [...starts.entries()].filter(([n]) => n !== TOUCH_8_2_ACTIVITY).map(([, s]) => s[0]);
    assert.deepEqual([...new Set(firsts)].sort(), ['Denon AV Receiver PowerOn', 'LG TV PowerOn']);
    assert.equal(starts.get(TOUCH_8_2_ACTIVITY)![0], 'Blu-ray PowerOn');
    assert.deepEqual(sameStart(c, TOUCH_8_2_ACTIVITY), []);
  });

test('the control: an activity of ours with Watch a Blu-ray\'s devices, orders and inputs is reported as the same start, so the check can fail',
  lab.needing(lab.skipUnless(SOURCE, FULL)), () => {
    const twin: harmonyTouch.OwnActivity = {
      id: 900000004, name: 'Twin Blu-ray', type: 'WatchDvd', startScreen: 'Commands',
      devices: [
        { device: 'LG TV', roles: ['DisplayActivityRole'], powerOn: 1, powerOff: 1, input: 'HDMI 2' },
        { device: 'Denon AV Receiver', roles: ['VolumeActivityRole'], powerOn: 2, powerOff: 2, input: 'Blu-ray' },
        { device: 'Blu-ray', roles: ['PlayMovieActivityRole'], powerOn: 3, powerOff: 3 },
      ],
    };
    const c = configuration(answersWith([twin]));
    assert.deepEqual(sameStart(c, 'Twin Blu-ray'), ['Watch a Blu-ray']);
  });
