/**
 * Recordings and tests on top of the infrared monitor.
 *
 * **A recording** is everything the receiver hears between a Start and a Stop, kept as one run: the
 * whole of an activity's start, say, as a timeline per device.
 *
 * **A test** is a list of steps somebody at the bench performs, each an instruction ("press TV
 * kijken") and, optionally, what that step is expected to send. The person presses Next after each
 * step, and **those presses are the step boundaries**, which is the point of the design: which commands
 * belong to which step is stated by the person doing it, rather than guessed from the pauses, and an
 * activity's power on delays are exactly the pauses a guess would get wrong.
 *
 * A test is written so that a written configuration can be checked without anybody describing what
 * they saw: the run file in the lab says what was sent, per step, with the timing, and which
 * expectations held. Definitions live in this repository, `packages/bench/irtests/`, since they carry
 * only steps and device and command names; runs go to the lab, since they carry captured codes.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { HeardFrame, IrMonitor } from './irmonitor.ts';

/** What a step is expected to send, one command. */
export interface Expectation {
  /** The device, as the configurations name it; several names when the remotes disagree, `TV` and `LG`. */
  readonly device: string | readonly string[];
  /**
   * Logitech's command name, `VolumeUp`, as the monitor reports it. Or, for a device whose codes the
   * catalogue cannot name, the code number instead, with the configuration it is a number in: code
   * numbers are per configuration, so the same KPN box is code 35 on one remote and something else
   * on the next. A definition gives one of the two.
   */
  readonly command?: string;
  readonly code?: number;
  readonly config?: string;
  /** How many separate presses of it, default one. A held key is one press with repeats. */
  readonly times?: number;
  /** The pause before it, since the previous command of the step, in milliseconds, as `[least, most]`. */
  readonly pauseMs?: readonly [number, number];
}

export interface TestStep {
  readonly instruction: string;
  readonly expect?: readonly Expectation[];
}

export interface TestDefinition {
  readonly name: string;
  readonly description?: string;
  readonly steps: readonly TestStep[];
}

/** One expectation, judged. */
export interface Verdict {
  readonly expected: string;
  readonly ok: boolean;
  readonly detail: string;
}

/** A press as a run keeps it: the frame that started it and how many repeats followed. */
export interface RunPress {
  readonly frame: HeardFrame;
  repeats: number;
  /** Milliseconds since the run started, by the host's clock when the frame arrived. */
  readonly atMs: number;
}

export interface RunStep {
  readonly instruction: string;
  readonly expect: readonly Expectation[];
  readonly startedMs: number;
  endedMs: number | undefined;
  readonly presses: RunPress[];
  verdicts: Verdict[];
  /** False for a step the run was stopped before, so a stopped test does not read as one that passed quietly. */
  readonly reached: boolean;
}

export interface Run {
  readonly kind: 'recording' | 'test';
  readonly name: string;
  readonly startedAt: string;
  endedAt: string | undefined;
  readonly steps: RunStep[];
  /** Which step is open; the length of `steps` once the run has stopped. */
  current: number;
  /** Where the run was written when it stopped. */
  file: string | undefined;
}

/** The device and command names a press carries, and its code number per configuration, one per bench remote that holds it. */
function namesOf(frame: HeardFrame): { device: string; command: string | undefined; config: string; code: number }[] {
  return frame.matches.map((one) => ({ device: one.device, command: one.command, config: one.config, code: one.code }));
}

/**
 * Judge a step's presses against what it expected, in order.
 *
 * Each expectation is looked for after the press the previous one matched, so the order is checked
 * as well as the presence. A press nobody expected is not a failure here, since a remote sends things
 * a test did not think to list, a power off before a power on for one; the run shows every press and
 * the verdicts say only what was asked.
 */
function devicesOf(want: Expectation): string[] {
  return (typeof want.device === 'string' ? [want.device] : want.device).map((d) => d.toLowerCase());
}

function labelOf(want: Expectation): string {
  const what = want.command ?? `code ${want.code} of ${want.config}`;
  return `${devicesOf(want).join(' or ')} · ${what}${(want.times ?? 1) > 1 ? ` ×${want.times}` : ''}`;
}

export function judge(step: Pick<RunStep, 'expect' | 'presses'>): Verdict[] {
  const out: Verdict[] = [];
  let cursor = 0;
  let previousMs: number | undefined;
  for (const want of step.expect) {
    const devices = devicesOf(want);
    const label = labelOf(want);
    const names = (press: RunPress) => namesOf(press.frame).some((one) =>
      devices.includes(one.device.toLowerCase()) && (want.command !== undefined
        ? one.command?.toLowerCase() === want.command.toLowerCase()
        : one.config === want.config && one.code === want.code));
    const fits = (press: RunPress) => !press.frame.bare && names(press);
    let found = 0;
    let firstAt: RunPress | undefined;
    for (let i = cursor; i < step.presses.length && found < (want.times ?? 1); i += 1) {
      if (!fits(step.presses[i]!)) continue;
      found += 1;
      firstAt ??= step.presses[i]!;
      cursor = i + 1;
    }
    if (found < (want.times ?? 1)) {
      // Still a failure, since a trailing frame alone proves nothing for a family whose trailing frame
      // every code shares. But saying it was there tells a person at the bench that the command most
      // likely went out and its opening frame was not recognised, which on the Harmony 600's KPN box
      // was a receiver merging the first two flashes into one, rather than that nothing was sent.
      const trailing = step.presses.slice(cursor).find((one) => one.frame.bare && names(one));
      const also = trailing === undefined ? '' : `, only a trailing frame at ${(trailing.atMs / 1000).toFixed(2)} s`;
      out.push({ expected: label, ok: false, detail: `heard ${found} of ${want.times ?? 1}${also}` });
      continue;
    }
    let ok = true;
    let detail = `heard at ${(firstAt!.atMs / 1000).toFixed(2)} s`;
    if (want.pauseMs !== undefined && previousMs !== undefined) {
      const pause = firstAt!.atMs - previousMs;
      ok = pause >= want.pauseMs[0] && pause <= want.pauseMs[1];
      detail += `, ${Math.round(pause)} ms after the previous, wanted ${want.pauseMs[0]} to ${want.pauseMs[1]}`;
    }
    previousMs = step.presses[cursor - 1]!.atMs;
    out.push({ expected: label, ok, detail });
  }
  return out;
}

/** The test definitions on disk, by file name without `.json`. */
export function testDefinitions(directory: string): { id: string; definition: TestDefinition }[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).filter((file) => file.endsWith('.json')).sort().map((file) => ({
    id: file.slice(0, -5),
    definition: JSON.parse(readFileSync(join(directory, file), 'utf8')) as TestDefinition,
  }));
}

/**
 * The one run that can be open at a time, fed by the monitor.
 */
export class IrSessions {
  private run: Run | undefined;
  private startedMs = 0;
  private readonly now: () => Date;
  private readonly runPath: (run: Run) => string | undefined;
  private readonly changed: (run: Run) => void;

  constructor(
    monitor: Pick<IrMonitor, 'subscribe'>,
    now: () => Date,
    runPath: (run: Run) => string | undefined,
    changed: (run: Run) => void,
  ) {
    this.now = now;
    this.runPath = runPath;
    this.changed = changed;
    monitor.subscribe((event) => { if (event.type === 'frame') this.frame(event.frame); });
  }

  get current(): Run | undefined { return this.run; }

  /** Start a recording, or a test from its definition. Refused while another run is open. */
  start(kind: 'recording' | 'test', name: string, definition?: TestDefinition): Run {
    if (this.run !== undefined && this.run.endedAt === undefined) throw new Error('a run is already open; stop it first');
    const at = this.now();
    this.startedMs = at.getTime();
    const steps = kind === 'test' ? definition?.steps ?? [] : [{ instruction: 'recording' }];
    if (steps.length === 0) throw new Error('a test needs at least one step');
    this.run = {
      kind, name, startedAt: at.toISOString(), endedAt: undefined, current: 0, file: undefined,
      steps: [this.step(steps[0]!, 0)],
    };
    this.pending = steps.slice(1);
    this.changed(this.run);
    return this.run;
  }

  private pending: readonly TestStep[] = [];

  private step(from: TestStep, startedMs: number): RunStep {
    return {
      instruction: from.instruction, expect: from.expect ?? [], startedMs, endedMs: undefined, presses: [], verdicts: [],
      reached: true,
    };
  }

  /** Close the open step and open the next; on the last step this is the same as stopping. */
  next(): Run {
    const run = this.open();
    const ms = this.now().getTime() - this.startedMs;
    this.close(run, ms);
    const following = this.pending[0];
    if (following === undefined) return this.stop();
    this.pending = this.pending.slice(1);
    run.steps.push(this.step(following, ms));
    run.current += 1;
    this.changed(run);
    return run;
  }

  stop(): Run {
    const run = this.open();
    const ms = this.now().getTime() - this.startedMs;
    const last = run.steps[run.current];
    if (last !== undefined && last.endedMs === undefined) this.close(run, ms);
    // Steps never reached are recorded as never reached, so a stopped test does not read as a short one.
    for (const left of this.pending) {
      const expect = left.expect ?? [];
      run.steps.push({
        ...this.step(left, ms), endedMs: ms, reached: false,
        verdicts: expect.map((want) => ({ expected: labelOf(want), ok: false, detail: 'not reached' })),
      });
    }
    this.pending = [];
    run.current = run.steps.length;
    run.endedAt = this.now().toISOString();
    const path = this.runPath(run);
    if (path !== undefined) {
      try {
        writeFileSync(path, `${JSON.stringify(run, null, 2)}\n`);
        run.file = path;
      } catch {
        // The run is still on the page; losing the file is reported by its absence in `file`.
      }
    }
    this.changed(run);
    return run;
  }

  private open(): Run {
    if (this.run === undefined || this.run.endedAt !== undefined) throw new Error('no run is open');
    return this.run;
  }

  private close(run: Run, ms: number): void {
    const step = run.steps[run.current]!;
    step.endedMs = ms;
    step.verdicts = judge(step);
  }

  private frame(frame: HeardFrame): void {
    const run = this.run;
    if (run === undefined || run.endedAt !== undefined) return;
    const step = run.steps[run.current];
    if (step === undefined) return;
    if (frame.repeatOf !== undefined) {
      const press = step.presses.find((one) => one.frame.seq === frame.repeatOf);
      if (press !== undefined) press.repeats += 1;
    } else {
      step.presses.push({ frame: slim(frame), repeats: 0, atMs: new Date(frame.at).getTime() - this.startedMs });
    }
    // Judged as it goes, so the page can show a step turning green while it is being done.
    step.verdicts = judge(step);
    this.changed(run);
  }
}

/**
 * A frame as a run keeps it: what was heard and what it matched, without each match's stored durations
 * and the comparison. The whole run goes to the page on every change, and a bare repeat signal can match
 * a thousand stored frames, so carrying those durations would make a long test megabytes per update.
 */
function slim(frame: HeardFrame): HeardFrame {
  return {
    ...frame,
    matches: frame.matches.map((one) => ({ ...one, stored: [] })),
    compare: undefined,
  };
}

/** Where a stopped run is written: `reads/<stamp>-ir-<kind>-<name>.json` in the lab. */
export function runFilePath(labRoot: string | undefined, run: Run): string | undefined {
  if (labRoot === undefined) return undefined;
  const stamp = run.startedAt.replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const slug = run.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'run';
  return join(labRoot, 'reads', `${stamp}-ir-${run.kind}-${slug}.json`);
}
