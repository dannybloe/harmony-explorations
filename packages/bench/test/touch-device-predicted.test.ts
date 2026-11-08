/**
 * The Harmony Touch's bench test for a device of ours, `todo-touch.md` 8.1, held against the documents it is
 * derived from and against every code the bench's monitor can name.
 *
 * **What the test is.** One file in `irtests/`, `touch-8-1-device-mode.json`: Off, the Test Projector chosen from
 * the Devices list, each key its own map binds tapped, then the Blu-ray chosen and its navigation keys tapped as a
 * control from the same run. Every expectation is derived, never written: `touch81Plans` in `experiments/touchdevicetest.ts` says
 * what the person does and `packages/codec/src/families/harmony-touch/engine.ts`, the engine model 7.1 calibrated, says what is sent.
 * `bin/touch-device-tests.ts --write` writes the file; the first test holds that it is what the derivation gives.
 *
 * **What the predictions rest on.** The documents of the set the bench Touch holds since 6.9, the
 * `touch_changed_set_label_back` fixture, with the device of `packages/corpus/touch-devices/test-projector.json`
 * added by the codec, `withTouchDevice`. Built here from the source so that a change to the composer shows in the
 * predictions, and held equal, document for document, to the set the bench Touch was given, the `touch_device_set`
 * fixture, which `packages/corpus/test/touch-device-set.test.ts` also holds as parsed JSON, tags and all. The
 * favourites are the recorded full sync's, as in 7.1.
 *
 * **No bench code can be heard as one of the device's, and no two of its own as each other.** The monitor names a
 * capture by every stored frame it matches, duration for duration within its tolerance, `CodeBook.match`, over
 * every bench configuration, `BENCH_CONFIGS`, and the Touch sets, `BENCH_TOUCH_SETS`. Every frame of every command
 * of the device, its first transmission and its repetition with the toggle bit as stated and flipped, is matched
 * against that whole book, and it matches the device's own command and nothing else. Twelve cells against the
 * Blu-ray's twenty is the main reason no Sony 20 Bit frame can match; the numbers chosen at address 30 are the
 * reason no Sony 12 Bit device of the bench configurations can. **The control** adds a second device of ours with
 * the same numbers, whose frames the check then reports as matching two devices: it can fail.
 *
 * **Sources checked first.** The 8.1 brief in the lab; `touchbench.ts` and `touch-full-bench-predicted.test.ts`, whose derivation
 * this reuses; `irmonitor.ts` (`CodeBook`, `sameFrame`, `withinTolerance`); the engine's `buttonPress` in the lab's
 * decompiled engine, which in device mode looks the key up in `16417Device` and the device's id and sends the
 * command it names, as the model has it. Logitech's client was not consulted.
 *
 * **What this does not show** is what the remote does: that is the 8.1 run, at the bench. Nothing of a device of
 * ours has reached a Touch before it.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330, the one bench unit; its firmware reports 17 and
 * Logitech's templates file it under 18.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { waveformOfArchiveCommand, type Pulse } from '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';
import * as lab from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/testkit/touch-recording';

import { BENCH_CONFIGS, BENCH_TOUCH_SETS, CodeBook, framesOfTrain } from '../src/irmonitor.ts';
import { testDefinitions, type TestDefinition } from '../src/irsession.ts';
import { TOUCH_8_1_DEVICE, TOUCH_8_1_SET, touch81Tests } from '../experiments/touchdevicetest.ts';

const SOURCE = 'touch_changed_set_label_back';
const FULL = 'touch_full_sync_recording';
/** The set the bench Touch was given for 8.1, by fixture. */
const DEVICE_SET = 'touch_device_set';
const DESCRIPTION = fileURLToPath(new URL('../../corpus/touch-devices/test-projector.json', import.meta.url));

const projector = (): harmonyTouch.RowDevice => (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { device: harmonyTouch.RowDevice }).device;
const sourceAnswers = (): harmonyTouch.SyncAnswer[] =>
  (JSON.parse(new TextDecoder().decode(lab.require_(SOURCE))) as { answers: harmonyTouch.SyncAnswer[] }).answers;

/** The set's documents with `devices` added in turn, as answers in the set's own order. */
function answersWith(devices: readonly harmonyTouch.RowDevice[]): harmonyTouch.SyncAnswer[] {
  let answers = sourceAnswers();
  for (const d of devices) {
    const added = harmonyTouch.withTouchDevice(harmonyTouch.documentsOfAnswers(answers), harmonyTouch.composeTouchDeviceOfRow(d));
    answers = answers.map((a) => {
      const key = harmonyTouch.documentKeyOf(a.uri);
      return key !== undefined && key in added ? { ...a, resource: added[key as keyof typeof added] } : a;
    });
  }
  return answers;
}

/** The configuration the predictions read: the device set's documents and the full sync's favourites. */
function configuration(): harmonyTouch.Configuration {
  const recorded = answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi'));
  const documents = Object.create(null) as Record<string, unknown>;
  for (const [address, document] of Object.entries(harmonyTouch.documentsOfAnswers(recorded))) if (address.startsWith('content://')) documents[address] = document;
  Object.assign(documents, harmonyTouch.documentsOfAnswers(answersWith([projector()])));
  return harmonyTouch.readConfiguration(documents as harmonyTouch.SyncDocuments);
}

test('the 8.1 test file is what the device set gives, and every key of the device sends its own command to it', lab.needing(lab.skipUnless(SOURCE, FULL, DEVICE_SET)), () => {
  // The set built here is the one the remote was given, as parsed JSON, so the predictions are the delivered set's.
  const delivered = (JSON.parse(new TextDecoder().decode(lab.require_(DEVICE_SET))) as { answers: harmonyTouch.SyncAnswer[] }).answers;
  assert.deepEqual(answersWith([projector()]).map((a) => a.resource), delivered.map((a) => a.resource));
  assert.equal(lab.IMAGES[DEVICE_SET], TOUCH_8_1_SET);
  const c = configuration();
  const derived = touch81Tests(c);
  const directory = fileURLToPath(new URL('../irtests/', import.meta.url));
  const onDisk = testDefinitions(directory).concat(testDefinitions(fileURLToPath(new URL('../irtests/done/', import.meta.url)))).filter((one) => one.id.startsWith('touch-8-1-'));
  assert.deepEqual(onDisk.map((one) => one.id), ['touch-8-1-device-mode']);
  assert.deepEqual(onDisk[0]!.definition, JSON.parse(JSON.stringify(derived[0]!.definition)) as TestDefinition);
  const expectations = derived[0]!.definition.steps.flatMap((s) => s.expect ?? []);
  assert.equal(expectations.length, 15);
  // The device's ten keys, each the command of its own name, as `keysByName` bound them; no pause is judged,
  // since between two keys the person sets the pace.
  const ours = expectations.filter((e) => e.device === TOUCH_8_1_DEVICE);
  assert.deepEqual(ours.map((e) => e.command), ['Menu', 'Exit', 'DirectionUp', 'DirectionDown', 'DirectionLeft', 'DirectionRight', 'Select', 'VolumeUp', 'VolumeDown', 'VolumeMute']);
  assert.ok(expectations.every((e) => e.pauseMs === undefined && (e.times ?? 1) === 1));
  assert.equal(TOUCH_8_1_SET, 'work/touch-firmware/sets/8.1-device/set.json');
  assert.ok(BENCH_TOUCH_SETS.includes(TOUCH_8_1_SET), 'the monitor names the device\'s codes from the set');
});

/** Every frame the monitor stores for a Touch command, as `CodeBook.addTouch` renders it. */
function framesOf(command: harmonyTouch.ReadCommand): Pulse[][] {
  const out: Pulse[][] = [];
  for (const toggleFlipped of [false, true]) {
    const sent = waveformOfArchiveCommand(command.protocol!.archive, command.keyCode!, { asStored: true, toggleFlipped });
    assert.ok(!('refusal' in sent), command.name);
    for (const train of [sent.once, sent.held]) out.push(...framesOfTrain(train));
  }
  return out;
}

/** The bench's own loader: a lab name, or a path inside the lab; the device set itself from memory. */
const DEVICE_SET_IN_MEMORY = 'the 8.1 device set, built here';
function book(touchSets: Readonly<Record<string, harmonyTouch.SyncAnswer[]>>): CodeBook {
  const load = (name: string): Uint8Array | undefined => {
    if (name in touchSets) return new TextEncoder().encode(JSON.stringify({ answers: touchSets[name] }));
    if (!name.includes('/')) return lab.load(name);
    const path = join(lab.LAB!, name);
    return existsSync(path) ? new Uint8Array(readFileSync(path)) : undefined;
  };
  return new CodeBook(load, BENCH_CONFIGS, undefined, Object.keys(touchSets));
}

/** Whether every bench configuration the monitor names codes from is in this lab, so no frame is left out unseen. */
function benchConfigsPresent(): { skip: string | false } {
  if (lab.LAB === undefined) return { skip: 'no lab' };
  const missing = BENCH_CONFIGS.filter((n) => (n.includes('/') ? !existsSync(join(lab.LAB!, n)) : lab.load(n) === undefined));
  return { skip: missing.length > 0 ? `${missing.length} bench configurations are not in this lab` : false };
}

test('no frame of the device matches any code of the bench configurations or the bench Touch\'s set, nor another of its own commands',
  lab.needing(lab.skipUnless(SOURCE), benchConfigsPresent()), () => {
    const sets = { [BENCH_TOUCH_SETS[0]!]: sourceAnswers(), [DEVICE_SET_IN_MEMORY]: answersWith([projector()]) };
    const b = book(sets);
    assert.equal(b.configs.length, BENCH_CONFIGS.length + 2, 'every bench configuration and both sets are in the book');
    const device = harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(sets[DEVICE_SET_IN_MEMORY])).devices.find((d) => d.name === TOUCH_8_1_DEVICE)!;
    let frames = 0;
    for (const command of device.commands) {
      for (const frame of framesOf(command)) {
        frames += 1;
        const names = [...new Set(b.match(frame).map((m) => `${m.device} ${m.command}`))];
        assert.deepEqual(names, [`${TOUCH_8_1_DEVICE} ${command.name}`], command.name);
      }
    }
    // Eleven commands, each a first transmission of one frame as stored and a repetition of one, at both toggle
    // states: no family of ours states a toggle, so the flipped rendering is the same frames again.
    assert.equal(frames, 11 * 2 * 2);
  });

test('the control: a second device of ours with the same numbers is reported as matching both, so the check can fail',
  lab.needing(lab.skipUnless(SOURCE)), () => {
    const twin = { ...projector(), id: 900000003, name: 'Twin Projector' };
    const answers = answersWith([projector(), twin]);
    const b = new CodeBook((name) => (name === 'twin' ? new TextEncoder().encode(JSON.stringify({ answers })) : undefined), [], undefined, ['twin']);
    const device = harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(answers)).devices.find((d) => d.name === TOUCH_8_1_DEVICE)!;
    const names = [...new Set(b.match(framesOf(device.commands[0]!)[0]!).map((m) => m.device))].sort();
    assert.deepEqual(names, ['Test Projector', 'Twin Projector']);
  });
