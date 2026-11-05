/**
 * The Harmony Touch's first full bench test, `todo-touch.md` 7.1, held against the documents the remote holds and
 * against the bench runs the Touch has already given.
 *
 * **What the tests are.** Ten files in `irtests/`, `touch-7-1-*.json`: every activity started from Off and ended,
 * the activities switched one into the next, the favourite channels, the keys of each activity's map, short and
 * long, and each device's keys in device mode. Every expectation in them is derived, never written: the plan of
 * each test, `touch71Plans` in `src/touchbench.ts`, says what the person does, and `src/touchengine.ts`, a model of the
 * Touch's engine, says what it sends and when. `bin/touch-tests.ts --write` writes the files; the first test here
 * holds that the files are what the derivation gives from the documents, so the files cannot drift from them.
 *
 * **What the predictions rest on.** The documents are the set `work/touch-firmware/sets/6.9-label-back`, which the
 * bench unit holds since 6.9 (`touch-changed-set-sync.test.ts`: its six documents are the 6.8 set's as parsed
 * JSON, and the closing run of 6.9 found the remote asking with this set's tags), and the favourites' three
 * documents of the recorded full sync, which the remote has held since and which every sync of this project
 * answered 304. The set's ActivityList, DeviceList, MapList, Context and ProtocolList are those of the recorded
 * full sync as parsed JSON; its Settings is the remote's own. The engine's behaviour is read in the decompiled
 * engine of image 4.15.330, `work/touch-firmware/luaworks-src/`, by the names `startActivity`,
 * `fireCommandsList`, `buttonPress` and `changeChannel` in `apihandler/activity.lua`, `delayRequired`,
 * `updateDelay`, `getStateCommands` and `getChangeChannelCommands` in `model/device.lua`, the transitions of
 * `model/state.lua`, and `getStatesConfiguration`, `getActionItems`, `getActivitiesConfiguration` and
 * `getSequenceActions` in `loader/userconfigreader.lua`, with `postLoad` in `main.lua` for the Off activity. The
 * reference states the start order in `activities-and-buttons.md`, "Starting, switching and stopping", as read
 * and not measured.
 *
 * **The calibration: what the model says the earlier runs sent, against what they sent.** Five bench runs were
 * recorded on this unit with these documents before 7.1: the two runs of 3.2's monitor checks and the three of
 * 6.9's sequence delay. Each covers activity starts from Off, Off, and in 3.2 one switch, Watch TV to Switch Box,
 * and Off from Switch Box with its end step. The model, run over the same presses, names every code those runs
 * heard in each step, in order, 66 codes, among them the two places where the start order is not the role order:
 * the Denon's input before the LG TV's, the LG TV still in its 10 s power on delay, and from Switch Box the Switch's
 * input after the LG TV's. And every pause between two codes of one start or sequence, 44 of them, lies within its band: the
 * farthest a heard pause sat outside the model's two timings was 54 ms, which is why a judged pause is the band widened by 150
 * ms, `PAUSE_SLACK_MS`. **The control** runs the same check of the first 6.9 run against the set with the delay at
 * 3 s, which that run did not hold: the sequence's pause then falls outside its band, twice.
 *
 * **The infrared monitor names a code by the Touch's own documents** since 7.1, `BENCH_TOUCH_SETS` in
 * `irmonitor.ts`: every command of the set rendered by the codec's renderer of a catalogue definition,
 * `waveformOfArchiveCommand`, at both toggle states. The Sony Blu-ray, which no bench configuration holds, came
 * unnamed in 6.9; held against the same five runs, the Touch's book names every heard press there but one, 69 of
 * them, the one left being the frame 3.2's notes record as unread, and the 18 presses of the Blu-ray among them are
 * ones the bench configurations named nothing at all.
 *
 * **What these tests do not show** is what the remote does: that is the 7.1 runs', at the bench. Before them, the
 * activity starts from Off but for Watch TV and Watch a Blu-ray, Off but from those two and Switch Box, the
 * switches but for Watch TV to Switch Box, the favourites, the keys but for the KPN's Rewind and Replay, the Denon's
 * VolumeUp and the Blu-ray's Yellow, and device mode are predicted and never heard.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330, the one bench unit; its firmware reports 17 and
 * Logitech's templates file it under 18. Logitech's client was not consulted: the remote runs its own engine and
 * nothing here depends on what the client does.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { harmonyTouch } from '@harmony/codec';
import * as lab from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/usb/test/touch-recording';

import { CodeBook } from '../src/irmonitor.ts';
import { testDefinitions, type TestDefinition } from '../src/irsession.ts';
import { PAUSE_SLACK_MS, TOUCH_7_1_SET, touch71Configuration, touch71Tests } from '../src/touchbench.ts';
import { TIMING, TouchEngine, type Send } from '../src/touchengine.ts';

const SET = 'touch_changed_set_label_back';
const FULL = 'touch_full_sync_recording';
const RUN_CHECKS = 'touch_monitor_ir_checks';
const RUN_HOME = 'touch_monitor_ir_home';
const RUN_BEFORE = 'touch_changed_ir_before';
const RUN_DELAY = 'touch_changed_ir_delay';
const RUN_BACK = 'touch_changed_ir_back';
const SET_68 = 'touch_own_set';
const SET_DELAY = 'touch_changed_set_delay';
const SET_DELAY_BACK = 'touch_changed_set_delay_back';

const json = (fixture: string): unknown => JSON.parse(new TextDecoder().decode(lab.require_(fixture)));

/** The favourites' documents of the recorded full sync, by address. */
function favourites(): Record<string, unknown> {
  const answers = answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi'));
  return Object.fromEntries(Object.entries(harmonyTouch.documentsOfAnswers(answers)).filter(([k]) => k.startsWith('content://')));
}

function configuration(set: string): harmonyTouch.Configuration {
  return touch71Configuration(json(set) as { answers: unknown[] }, favourites());
}

test('the 7.1 test files are what the documents the remote holds give, file for file and step for step',
  lab.needing(lab.skipUnless(SET, FULL)), () => {
    const derived = touch71Tests(configuration(SET));
    const directory = fileURLToPath(new URL('../irtests/', import.meta.url));
    const onDisk = testDefinitions(directory).filter((one) => one.id.startsWith('touch-7-1-'));
    assert.deepEqual(onDisk.map((one) => one.id), derived.map((one) => one.id));
    for (const one of derived) {
      assert.deepEqual(onDisk.find((x) => x.id === one.id)!.definition, JSON.parse(JSON.stringify(one.definition)) as TestDefinition, one.id);
    }
    const expectations = derived.flatMap((one) => one.definition.steps.flatMap((s) => s.expect ?? []));
    assert.equal(derived.length, 10);
    assert.equal(expectations.length, 418);
    assert.equal(expectations.filter((e) => e.pauseMs !== undefined).length, 89);
    // Every code expected is the Touch's own, named as its documents name it, and the plan's file name is the set's.
    assert.equal(TOUCH_7_1_SET, 'work/touch-firmware/sets/6.9-label-back/set.json');
  });

type Act = (e: TouchEngine) => Send[];
const start = (activity?: string): Act => (e) => e.start(activity);
const tap = (key: string): Act => (e) => e.key(key, 'tap');
const hold = (key: string): Act => (e) => e.key(key, 'hold');

/** A run's steps, each as the presses the Touch's own documents name, with when each was heard. */
function heard(run: string, book: CodeBook): { atMs: number; names: string[] }[][] {
  const steps = (json(run) as { steps: { presses: { atMs: number; frame: { pulses: { mark: boolean; us: number }[] } }[] }[] }).steps;
  return steps.map((s) => s.presses
    .map((p) => ({ atMs: p.atMs, names: book.match(p.frame.pulses).map((m) => `${m.device} ${m.command}`) }))
    .filter((p) => p.names.length > 0));
}

/**
 * The model over a run's presses, at both ends of its timing band: one list of acts per recorded step, the acts'
 * sends joined. Steps the model does not walk, a screen entry pressed in device mode, are left out by `skip`.
 */
function predicted(set: harmonyTouch.Configuration, acts: readonly (readonly Act[])[]): { low: Send[][][]; high: Send[][][] } {
  const walk = (timing: typeof TIMING.low | typeof TIMING.high) => {
    const engine = new TouchEngine(set, timing);
    return acts.map((step) => step.map((act) => {
      engine.idle();
      return act(engine);
    }));
  };
  return { low: walk(TIMING.low), high: walk(TIMING.high) };
}

interface Checked {
  readonly codes: number;
  readonly pauses: number;
  /** How far, at most, a heard pause sat outside the band of the model's two timings, before the slack. */
  readonly farthest: number;
  readonly outside: string[];
  readonly misnamed: string[];
}

/** Names in order, step by step, and every pause within one act inside the band widened by the slack. */
function check(run: string, set: harmonyTouch.Configuration, book: CodeBook, acts: readonly (readonly Act[])[], skip: readonly number[] = []): Checked {
  const h = heard(run, book);
  const { low, high } = predicted(set, acts);
  let codes = 0;
  let pauses = 0;
  let farthest = 0;
  const outside: string[] = [];
  const misnamed: string[] = [];
  h.forEach((presses, at) => {
    if (skip.includes(at)) return;
    const lows = low[at]!;
    const highs = high[at]!;
    const flat = lows.flat();
    if (presses.length !== flat.length) {
      misnamed.push(`${run} step ${at}: heard ${presses.length}, predicted ${flat.length}`);
      return;
    }
    flat.forEach((s, i) => {
      codes += 1;
      if (!presses[i]!.names.includes(`${s.device} ${s.command}`)) misnamed.push(`${run} step ${at} code ${i}: ${s.device} ${s.command}`);
    });
    // Pauses only between two codes of one act, the engine's own timing.
    let offset = 0;
    lows.forEach((sends, act) => {
      for (let i = 1; i < sends.length; i += 1) {
        const x = sends[i]!.heardMs - sends[i - 1]!.heardMs;
        const y = highs[act]![i]!.heardMs - highs[act]![i - 1]!.heardMs;
        const pause = presses[offset + i]!.atMs - presses[offset + i - 1]!.atMs;
        pauses += 1;
        farthest = Math.max(farthest, Math.min(x, y) - pause, pause - Math.max(x, y));
        if (pause < Math.min(x, y) - PAUSE_SLACK_MS || pause > Math.max(x, y) + PAUSE_SLACK_MS) {
          outside.push(`${run} step ${at} ${sends[i]!.device} ${sends[i]!.command}: ${Math.round(pause)} ms`);
        }
      }
      offset += sends.length;
    });
  });
  return { codes, pauses, farthest, outside, misnamed };
}

/** The five earlier runs, each with the set the remote held during it and the presses its steps were. */
function earlierRuns(): { run: string; set: string; acts: Act[][]; skip?: number[] }[] {
  const blu = [[start('Watch a Blu-ray')], [tap('Yellow')], [tap('Yellow')], [start()]];
  return [
    // 3.2: Watch TV, then Off held, heard inside the first step; the restart; Watch TV; device mode by a screen entry,
    // not modelled; Switch Box from Watch TV; Rewind tapped and held; Off from Switch Box.
    { run: RUN_CHECKS, set: SET, acts: [[start('Watch TV'), start()], [], [start('Watch TV')], [], [start('Switch Box')], [tap('Rewind')], [hold('Rewind')], [start()]], skip: [3] },
    { run: RUN_HOME, set: SET, acts: [[start('Watch TV')], [tap('VolumeUp')], [start()]] },
    { run: RUN_BEFORE, set: SET_68, acts: blu },
    { run: RUN_DELAY, set: SET_DELAY, acts: blu },
    { run: RUN_BACK, set: SET_DELAY_BACK, acts: blu },
  ];
}

const touchBook = (set: string): CodeBook => new CodeBook((name) => (name === set ? lab.require_(set) : undefined), [], undefined, [set]);

test('the model names every code the five earlier runs heard, in order, and every pause of a start lies in its band',
  lab.needing(lab.skipUnless(SET, FULL, RUN_CHECKS, RUN_HOME, RUN_BEFORE, RUN_DELAY, RUN_BACK, SET_68, SET_DELAY, SET_DELAY_BACK)), () => {
    const book = touchBook(SET);
    let codes = 0;
    let pauses = 0;
    let farthest = 0;
    for (const one of earlierRuns()) {
      const result = check(one.run, configuration(one.set), book, one.acts, one.skip);
      assert.deepEqual(result.misnamed, [], one.run);
      assert.deepEqual(result.outside, [], one.run);
      codes += result.codes;
      pauses += result.pauses;
      farthest = Math.max(farthest, result.farthest);
    }
    assert.equal(codes, 66);
    assert.equal(pauses, 44);
    // The slack is calibrated on this: the model's two timings already hold most pauses, the rest are close.
    assert.equal(Math.round(farthest), 54);
    assert.ok(farthest < PAUSE_SLACK_MS);
  });

test('the control: the first 6.9 run held against the set with the delay at 3 s puts the sequence\'s pause outside its band, both times',
  lab.needing(lab.skipUnless(SET, FULL, RUN_BEFORE, SET_DELAY)), () => {
    const blu = earlierRuns().find((one) => one.run === RUN_BEFORE)!.acts;
    const result = check(RUN_BEFORE, configuration(SET_DELAY), touchBook(SET), blu);
    assert.deepEqual(result.misnamed, []);
    assert.equal(result.outside.length, 2);
    assert.ok(result.outside.every((one) => one.includes('Blu-ray TopMenu')));
  });

test('the Touch\'s own documents name every press the five runs heard but one, and the bench configurations none of the Blu-ray\'s',
  lab.needing(lab.skipUnless(SET, RUN_CHECKS, RUN_HOME, RUN_BEFORE, RUN_DELAY, RUN_BACK)), () => {
    const touch = touchBook(SET);
    let named = 0;
    let unnamed = 0;
    let bluray = 0;
    for (const run of [RUN_CHECKS, RUN_HOME, RUN_BEFORE, RUN_DELAY, RUN_BACK]) {
      const steps = (json(run) as { steps: { presses: { frame: { pulses: { mark: boolean; us: number }[]; matches: { device: string }[] } }[] }[] }).steps;
      for (const p of steps.flatMap((s) => s.presses)) {
        const names = touch.match(p.frame.pulses);
        if (names.length === 0) unnamed += 1;
        else named += 1;
        if (names.some((m) => m.device === 'Blu-ray')) {
          bluray += 1;
          // As the monitor named it during the run, from the bench configurations: nothing.
          assert.deepEqual(p.frame.matches, []);
        }
      }
    }
    assert.equal(named, 69);
    // The one frame nothing reads, 12 s after the power off codes in 3.2's first step, which the test notes record.
    assert.equal(unnamed, 1);
    assert.equal(bluray, 18);
  });
