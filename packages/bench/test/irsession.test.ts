/**
 * Recordings and tests, without a receiver: frames handed to the runner as the monitor would hand them.
 *
 * What is under test is the bookkeeping a person at the bench relies on and cannot see: that a press
 * lands in the step that was open when it arrived, that the expectations are judged in order, that a
 * test stopped early says which steps were never reached rather than reading as a short one that
 * passed, and that the file left in the lab is the run the page showed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { HeardFrame, KnownCode, MonitorEvent } from '../src/irmonitor.ts';
import {
  IrSessions, judge, runFilePath, testDefinitions, type Run, type RunPress, type TestDefinition,
} from '../src/irsession.ts';

const START = Date.parse('2026-10-01T06:00:00.000Z');

function match(device: string, command: string | undefined, opening = true): KnownCode {
  return {
    config: 'bench_remote', device, group: 0, code: 1, command, repeat: !opening, opening,
    stored: [{ mark: true, us: 9000 }, { mark: false, us: 4500 }],
  };
}

let seq = 0;
function frame(atMs: number, matches: KnownCode[], extra: Partial<HeardFrame> = {}): HeardFrame {
  seq += 1;
  return {
    seq, at: new Date(START + atMs).toISOString(), gapUs: undefined,
    pulses: [{ mark: true, us: 9000 }, { mark: false, us: 4500 }, { mark: true, us: 560 }],
    number: undefined, bits: undefined, matches, guesses: [], repeatOf: undefined, bare: false,
    compare: { stored: [], within: [] }, ...extra,
  };
}

function press(atMs: number, device: string, command: string, extra: Partial<HeardFrame> = {}): RunPress {
  return { frame: frame(atMs, [match(device, command)], extra), repeats: 0, atMs };
}

/** The monitor's one method the runner uses, and a way to emit into it. */
class FakeMonitor {
  private listener: ((event: MonitorEvent) => void) | undefined;
  subscribe(fn: (event: MonitorEvent) => void): () => void {
    this.listener = fn;
    return () => { this.listener = undefined; };
  }
  hear(one: HeardFrame): void { this.listener?.({ type: 'frame', frame: one }); }
}

/** A lab of one empty `reads` directory, which is where a run file goes. */
function tempLab(): string {
  const dir = mkdtempSync(join(tmpdir(), 'irsession-'));
  mkdirSync(join(dir, 'reads'));
  return dir;
}

/** A clock the test moves, so steps start and end where the test says. */
class Clock {
  ms = 0;
  now = (): Date => new Date(START + this.ms);
}

const DEFINITION: TestDefinition = {
  name: 'Volume, briefly',
  steps: [
    { instruction: 'Choose the TV' },
    { instruction: 'Press Volume up three times', expect: [{ device: ['TV', 'LG'], command: 'VolumeUp', times: 3 }] },
    { instruction: 'Hold Volume down', expect: [{ device: 'TV', command: 'VolumeDown' }] },
  ],
};

test('expectations are looked for in order, by device and command, either spelling of either', () => {
  const step = {
    expect: [
      { device: 'tv', command: 'volumeup' },
      { device: ['Denon', 'Receiver'], command: 'InputCbl/Sat', pauseMs: [500, 3000] as const },
    ],
    presses: [press(100, 'TV', 'VolumeUp'), press(1100, 'Denon', 'InputCbl/Sat')],
  };
  const verdicts = judge(step);
  assert.deepEqual(verdicts.map((one) => one.ok), [true, true]);
  assert.match(verdicts[1]!.detail, /1000 ms after the previous/);

  // The same two the other way round: the order is part of the expectation.
  const swapped = judge({ ...step, presses: [press(100, 'Denon', 'InputCbl/Sat'), press(1100, 'TV', 'VolumeUp')] });
  assert.deepEqual(swapped.map((one) => one.ok), [true, false]);
  assert.equal(swapped[1]!.detail, 'heard 0 of 1');
});

test('a command the catalogue cannot name is expected by its code, and only in the configuration given', () => {
  const step = {
    expect: [{ device: 'KPN', code: 35, config: 'bench_remote' }],
    presses: [{ frame: frame(0, [{ ...match('KPN', undefined), code: 35 }]), repeats: 0, atMs: 0 }],
  };
  assert.deepEqual(judge(step), [{ expected: 'kpn · code 35 of bench_remote', ok: true, detail: 'heard at 0.00 s' }]);
  // The same number in another configuration is another command.
  const elsewhere = judge({ ...step, expect: [{ device: 'KPN', code: 35, config: 'other_remote' }] });
  assert.equal(elsewhere[0]!.ok, false);
});

test('a count is separate presses, and a pause outside its window fails a command that was heard', () => {
  const twice = judge({
    expect: [{ device: 'TV', command: 'VolumeUp', times: 3 }],
    presses: [press(0, 'TV', 'VolumeUp'), press(300, 'TV', 'VolumeUp')],
  });
  assert.deepEqual(twice, [{ expected: 'tv · VolumeUp ×3', ok: false, detail: 'heard 2 of 3' }]);

  const late = judge({
    expect: [{ device: 'TV', command: 'PowerOn' }, { device: 'TV', command: 'InputHdmi1', pauseMs: [4000, 6000] }],
    presses: [press(0, 'TV', 'PowerOn'), press(8000, 'TV', 'InputHdmi1')],
  });
  assert.deepEqual(late.map((one) => one.ok), [true, false]);
});

test('a bare repeat never counts as the command it might follow', () => {
  // A held key's trailing frame heard alone matches every code of its family, so it proves nothing.
  const verdicts = judge({
    expect: [{ device: 'TV', command: 'VolumeUp' }],
    presses: [press(1500, 'TV', 'VolumeUp', { bare: true })],
  });
  assert.equal(verdicts[0]!.ok, false);
  // It is named in the verdict, so a missed opening frame does not read as nothing sent.
  assert.equal(verdicts[0]!.detail, 'heard 0 of 1, only a trailing frame at 1.50 s');
});

test('a test run puts each press in the step that was open, attaches repeats, and leaves the run in the lab', () => {
  const dir = tempLab();
  try {
    const monitor = new FakeMonitor();
    const clock = new Clock();
    const changes: Run[] = [];
    const runs = new IrSessions(monitor, clock.now, (run) => runFilePath(dir, run), (run) => changes.push(run));

    runs.start('test', DEFINITION.name, DEFINITION);
    assert.throws(() => runs.start('recording', 'second'), /already open/);
    clock.ms = 4000;
    runs.next();
    assert.equal(runs.current!.current, 1);

    for (const at of [4500, 5000, 5600]) {
      const heard = frame(at, [match('TV', 'VolumeUp')]);
      monitor.hear(heard);
      // Each press's own repeat, which has to land on that press and not become a fourth one.
      monitor.hear(frame(at + 40, [match('TV', 'VolumeUp', false)], { repeatOf: heard.seq }));
    }
    const step = runs.current!.steps[1]!;
    assert.equal(step.presses.length, 3);
    assert.deepEqual(step.presses.map((one) => one.repeats), [1, 1, 1]);
    assert.deepEqual(step.presses.map((one) => one.atMs), [4500, 5000, 5600]);
    // Judged while the step is open, so the page can turn it green before Next is pressed.
    assert.equal(step.verdicts[0]!.ok, true);
    // What the run keeps of a frame: no stored durations and no comparison, or a long test would send
    // megabytes to the page at every change.
    assert.deepEqual(step.presses[0]!.frame.matches[0]!.stored, []);
    assert.equal(step.presses[0]!.frame.compare, undefined);

    // Stopped on the third step without doing it.
    clock.ms = 9000;
    runs.next();
    clock.ms = 9500;
    const stopped = runs.stop();
    assert.equal(stopped.current, 3);
    assert.equal(stopped.steps.length, 3);
    assert.deepEqual(stopped.steps.map((one) => one.reached), [true, true, true]);
    assert.equal(stopped.steps[2]!.verdicts[0]!.detail, 'heard 0 of 1');
    assert.equal(stopped.endedAt, '2026-10-01T06:00:09.500Z');
    assert.ok(stopped.file !== undefined);
    assert.equal(stopped.file, join(dir, 'reads', '20261001T060000Z-ir-test-volume-briefly.json'));
    assert.throws(() => runs.next(), /no run is open/);
    assert.equal(changes.at(-1), stopped);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a test stopped early says which steps it never reached, and they fail rather than pass quietly', () => {
  const monitor = new FakeMonitor();
  const clock = new Clock();
  const runs = new IrSessions(monitor, clock.now, () => undefined, () => {});
  runs.start('test', DEFINITION.name, DEFINITION);
  clock.ms = 1000;
  const stopped = runs.stop();
  assert.deepEqual(stopped.steps.map((one) => one.reached), [true, false, false]);
  assert.deepEqual(stopped.steps[1]!.verdicts, [{ expected: 'tv or lg · VolumeUp ×3', ok: false, detail: 'not reached' }]);
  assert.equal(stopped.file, undefined, 'no lab, so no file, and the run says so by having none');
});

test('a recording is one step that holds everything heard until Stop, and nothing after it', () => {
  const monitor = new FakeMonitor();
  const clock = new Clock();
  const runs = new IrSessions(monitor, clock.now, () => undefined, () => {});
  runs.start('recording', 'TV kijken start');
  monitor.hear(frame(200, [match('TV', 'PowerOn')]));
  monitor.hear(frame(900, []));
  clock.ms = 2000;
  const stopped = runs.stop();
  monitor.hear(frame(2500, [match('TV', 'PowerOff')]));
  assert.equal(stopped.steps.length, 1);
  assert.equal(stopped.steps[0]!.presses.length, 2, 'an unknown code is part of the recording too');
  assert.throws(() => runs.start('test', 'empty', { name: 'empty', steps: [] }), /at least one step/);
});

test('a run file is named for when it started, what it is and what it is called', () => {
  const run = { kind: 'recording', name: '  Kodi kijken / start! ', startedAt: '2026-10-01T06:35:14.906Z' } as Run;
  assert.equal(runFilePath('/lab', run), join('/lab', 'reads', '20261001T063514Z-ir-recording-kodi-kijken-start.json'));
  assert.equal(runFilePath(undefined, run), undefined);
});

test('every test definition in the repository is well formed', () => {
  // These are written by hand, by either of us, and a malformed one would only show as a confusing page.
  const dir = fileURLToPath(new URL('../irtests/', import.meta.url));
  const definitions = testDefinitions(dir);
  assert.ok(definitions.length > 0);
  for (const { id, definition } of definitions) {
    assert.equal(typeof definition.name, 'string', id);
    assert.ok(definition.name.trim() !== '', id);
    assert.ok(Array.isArray(definition.steps) && definition.steps.length > 0, `${id} has no steps`);
    for (const step of definition.steps) {
      assert.equal(typeof step.instruction, 'string', id);
      for (const want of step.expect ?? []) {
        const devices: readonly string[] = typeof want.device === 'string' ? [want.device] : want.device;
        assert.ok(devices.length > 0 && devices.every((one) => typeof one === 'string' && one !== ''), id);
        // A command name, or a code number with the configuration it is a number in, never both.
        if (want.command !== undefined) {
          assert.equal(typeof want.command, 'string', id);
          assert.equal(want.code, undefined, id);
        } else {
          assert.ok(Number.isInteger(want.code) && typeof want.config === 'string', `${id} names neither a command nor a code`);
        }
        if (want.times !== undefined) assert.ok(Number.isInteger(want.times) && want.times > 0, id);
        if (want.pauseMs !== undefined) assert.ok(want.pauseMs.length === 2 && want.pauseMs[0] <= want.pauseMs[1], id);
      }
    }
  }
  // Names are what the run file and the page title carry, so two tests may not share one.
  const names = definitions.map((one) => one.definition.name);
  assert.equal(new Set(names).size, names.length);
});

test('a run written to the lab reads back as the run the page showed', () => {
  const dir = tempLab();
  try {
    const monitor = new FakeMonitor();
    const clock = new Clock();
    const runs = new IrSessions(monitor, clock.now, (run) => runFilePath(dir, run), () => {});
    runs.start('recording', 'saved');
    monitor.hear(frame(100, [match('TV', 'PowerOn')]));
    clock.ms = 500;
    const stopped = runs.stop();
    assert.deepEqual(JSON.parse(readFileSync(stopped.file!, 'utf8')), JSON.parse(JSON.stringify({ ...stopped, file: undefined })));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
