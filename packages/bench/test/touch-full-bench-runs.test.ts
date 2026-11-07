/**
 * The Harmony Touch's first full bench test, `todo-touch.md` 7.1, as it ran: ten runs at the bench held against
 * what the documents the remote holds predict, `touch-full-bench-predicted.test.ts` holding how those predictions are made.
 *
 * **What was run.** The ten tests of `irtests/touch-7-1-*.json`, one complete run each, on the bench Touch holding
 * `work/touch-firmware/sets/6.9-label-back` and the favourites of the recorded full sync, with the Flirc monitor
 * naming each code by the Touch's own documents: every activity started from Off and ended by Off; the activities
 * switched one into the next and Off; the five favourites, the first tapped with nothing running; every key each
 * activity's map binds, tapped and then held where it has a long press; and every key of each device's own map in
 * device mode, chosen with no activity running, for the six devices whose map binds a key. Two further starts of
 * the switches and the Switch Box keys reached one step each and were abandoned; they are in the lab and used
 * nowhere. Earlier the same morning the 3.2 home button test was run again and agrees with its run of 3 November:
 * the same codes in each step, Volume Up to the Denon after Home, pressed twice that time as its step's note says.
 *
 * **What was measured.** The runs are judged again here from their own files, every press named afresh from its
 * pulses by the Touch's documents rather than taken from what the monitor wrote at the time, and the two agree on
 * every verdict. **413 of the 418 expectations held.** The five that did not:
 *
 * * three single presses not heard: in Watch TV, Previous held, the LG TV's Back; in Watch a Blu-ray, Blue, the
 *   Blu-ray's Blue, and Rewind held, its ChapterPrev. Each was heard on the retest, done on the monitor's live log
 *   rather than as a test: Watch TV started, Previous held, Watch a Blu-ray started, Blue tapped, Rewind held, and
 *   the log holds exactly the ten codes the model predicts for those five actions, in order, with the starts'
 *   pauses in their bands. So each was missed once and heard once; the files do not say whether the remote sent
 *   nothing, the receiver missed it or the key was not pressed fully, and no cause is claimed;
 * * two pauses heard late, both in the switches and both straight after a code the Xbox holds for its 2 s
 *   `Duration`: from Watch a Blu-ray to Play a Game, the Blu-ray's PowerOff 2927 ms after the Xbox's PowerOn began,
 *   against a band of 2300 to 2900; from Play a Game to Listen to Music, the Denon's InputMediaPlayer 3172 ms after
 *   the Xbox's PowerOff began, against 2550 to 3100.
 *
 * **Whether the model leaves out a step there.** It does not. Between those two codes the engine has nothing on its
 * list but the held code and the next device's wait: the Blu-ray's power off is the old activity's, appended after
 * the new power ons, and the Denon's input follows the power commands; every code of both steps was named in the
 * order predicted, and the next device's wait is its own `InterDeviceDelay`, 500 ms for the Blu-ray and 700 for the
 * Denon, since neither had sent a code for 15 s or more. What the model gets short is **how long a held code takes the
 * engine**. It takes the lamp as the `Duration` and adds its usual 0 to 210 ms of engine time around a send; heard,
 * the next device's code began 2927 - 500 = 2427 and 3172 - 700 = 2472 ms after the held code began, 427 and 472
 * beyond the `Duration`. On the receiver's own clock the Xbox's six held power codes in these runs lasted 18, 19,
 * 22, 19, 19 and 19 frames, about 1.8 to 2.2 s; of the two late pauses the first followed the 22 frame hold, 2.2 s
 * of lamp and then 699 ms of silence, and the second a 19 frame hold, 1.9 s and then 1193 ms, so the time beyond the
 * `Duration` sits once in the lamp and once in the silence. In the decompiled engine, `model/device.lua`'s send for a command with a
 * `Duration` starts the code, loops sending heartbeats until less than 100 ms of the time is left, then cancels the
 * code and only then marks the device's last send; so the end of a hold is timed by a loop and a cancel whose cost
 * nothing states, which is a reading and not a measured cause. **So the band is too narrow on the slow side after a
 * held code**, and the slack it was given had been calibrated on the 3.2 and 6.9 runs, in which no code was held.
 *
 * **The rule.** After a code held for a `Duration` above 0 the slow side of the next pause gets the slack once
 * more, `HELD_CODE_SLACK_MS`, 150 ms, the one figure calibrated on other runs, not a number read off these two
 * pauses. It changes four of the 89 judged pauses, the four that follow a held code (two Xbox PowerOn to the
 * Denon's InputGame1 in Play a Game's start from Off, and the two above), and with it all 89 lie in their bands;
 * scored both ways, the pauses sit at least 86 ms inside the fast side and 21 ms inside the slow side, the slow
 * side's least being a pause the rule does not touch, the Denon's power off after the LG TV's at Off. A `Duration` of 0, on the Denon's power codes and the two
 * toggles, holds nothing and gets nothing.
 *
 * **The control** judges the same runs against the documents with the Xbox's `Duration` taken off its two power
 * codes, a model that leaves the hold out: the pauses after them then miss their bands by 1727 and 1772 ms, rule or no rule.
 *
 * **The person's two marks.** In the Play a Game keys, step 7, "accidentally did rewind(hold) first, then restarted
 * this step": the step heard one press more than it expected, first, and it is the Xbox's SkipBack, which the
 * model gives for Rewind held in that activity; the rest is the step's four expectations exactly. In device mode 2
 * of 2, step 21, "pressed some wrong buttons but the targets were in there eventually": the five expected codes
 * came in order among eight, and the three others are each the Xbox's own map's code for a key of it, Rewind held
 * and the Up and Down arrows, as wrong buttons in the Xbox's device mode would give. So both steps are judged as
 * passing, with the extra presses accounted for by the notes.
 *
 * **Nothing else was sent in a judged step** but the presses of the two marked steps below and one: while the Denon
 * was being chosen from the device list, which sends nothing by the reading, one Denon PowerToggle was heard, 10.4 s
 * into that step and unmarked in the run. Asked afterwards, the person reported a second tap: the device list was
 * slow to answer, and the tap landed on the Denon's page as it opened, on its PowerToggle entry, which the Denon's
 * own map lists on its screen. Choosing the Denon again sent nothing. Every press of every judged step was named by
 * the Touch's documents.
 *
 * **Reported by the person at the bench and held by no file**: the favourites screen showed all five logos, NPO 1,
 * Zork, NPO 2, NPO 3 and RTL 4.
 *
 * **What this measures for the reference**: the start, switch and stop order of every activity in these documents
 * and the delays it waits; a favourite's three digits, and a favourite tapped with nothing running starting its
 * activity first; device mode per device, every key of its own map going to that device; and every long press of
 * these maps, its long command alone when held and its short when tapped. **Not measured**: when a long press
 * fires, since the monitor hears codes and not presses.
 *
 * **Sources checked first**: `reference/architectures/harmony-touch/activities-and-buttons.md` and
 * `devices-and-infrared.md`, the decompiled engine of image 4.15.330 for the held code, the lab note
 * `7.1-preflight.md`. Logitech's client was not consulted: the remote runs its own engine. **Which architectures**:
 * the Harmony Touch on firmware 4.15.330, one unit; its firmware reports 17 and Logitech's templates file it under 18.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { harmonyTouch } from '@harmony/codec';
import * as lab from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/usb/test/touch-recording';

import { CodeBook } from '../src/irmonitor.ts';
import { judge, type Expectation, type RunPress, type TestDefinition, type Verdict } from '../src/irsession.ts';
import { BenchTouchEngine, HELD_CODE_SLACK_MS, PAUSE_SLACK_MS, TIMING, touch71Configuration, touch71Tests } from '../src/touchbench.ts';

const SET = 'touch_changed_set_label_back';
const FULL = 'touch_full_sync_recording';
const MONITOR = 'touch_7_1_monitor';

/** The ten runs, by fixture, each with the test it ran. */
const RUNS: readonly (readonly [string, string])[] = [
  ['touch_7_1_starts', 'touch-7-1-1-starts'],
  ['touch_7_1_switches', 'touch-7-1-2-switches'],
  ['touch_7_1_favourites', 'touch-7-1-3-favourites'],
  ['touch_7_1_watch_tv_keys', 'touch-7-1-4-watch-tv-keys'],
  ['touch_7_1_blu_ray_keys', 'touch-7-1-5-watch-a-blu-ray-keys'],
  ['touch_7_1_music_keys', 'touch-7-1-6-listen-to-music-keys'],
  ['touch_7_1_switch_box_keys', 'touch-7-1-7-switch-box-keys'],
  ['touch_7_1_game_keys', 'touch-7-1-8-play-a-game-keys'],
  ['touch_7_1_device_mode_1', 'touch-7-1-9a-device-mode'],
  ['touch_7_1_device_mode_2', 'touch-7-1-9b-device-mode'],
];
const NEEDS = lab.needing(lab.skipUnless(SET, FULL, ...RUNS.map(([fixture]) => fixture)));

interface Press { atMs: number; repeats: number; frame: { pulses: { mark: boolean; us: number }[] } }
interface Step { instruction: string; expect?: Expectation[]; presses: Press[]; verdicts: Verdict[]; problem?: string }
interface Run { steps: Step[] }

const json = (fixture: string): unknown => JSON.parse(new TextDecoder().decode(lab.require_(fixture)));
const runs = new Map<string, Run>();
const run = (fixture: string): Run => {
  if (!runs.has(fixture)) runs.set(fixture, json(fixture) as Run);
  return runs.get(fixture)!;
};

/** The documents the remote held, with the favourites of the recorded full sync, optionally changed first. */
let favouritesCache: Record<string, unknown> | undefined;
let configurationCache: harmonyTouch.Configuration | undefined;
function configuration(change?: (set: { answers: { uri: string; resource: unknown }[] }) => void): harmonyTouch.Configuration {
  if (change === undefined && configurationCache !== undefined) return configurationCache;
  if (favouritesCache === undefined) {
    const answers = answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi'));
    favouritesCache = Object.fromEntries(Object.entries(harmonyTouch.documentsOfAnswers(answers)).filter(([k]) => k.startsWith('content://')));
  }
  const favourites = favouritesCache;
  const set = json(SET) as { answers: { uri: string; resource: unknown }[] };
  change?.(set);
  const c = touch71Configuration(set, favourites);
  if (change === undefined) configurationCache = c;
  return c;
}

let bookCache: CodeBook | undefined;
/** The Touch's own documents as a code book, the one the monitor used during the runs. */
function book(): CodeBook {
  bookCache ??= new CodeBook((name) => (name === SET ? lab.require_(SET) : undefined), [], undefined, [SET]);
  return bookCache;
}

/** A run's presses named afresh from their pulses by the Touch's documents. */
function named(presses: readonly Press[]): RunPress[] {
  return presses.map((p) => {
    const matches = book().match(p.frame.pulses);
    return { atMs: p.atMs, repeats: p.repeats, frame: { ...p.frame, matches, bare: matches.length > 0 && !matches.some((m) => m.opening) } } as unknown as RunPress;
  });
}

const names = (p: RunPress): string[] => p.frame.matches.map((m) => `${m.device} ${m.command}`);

/** Every step of every run judged against `definitions`, as `[test, step, verdict]`. */
function judged(definitions: readonly { id: string; definition: TestDefinition }[]): { id: string; step: number; verdict: Verdict }[] {
  const out: { id: string; step: number; verdict: Verdict }[] = [];
  for (const [fixture, id] of RUNS) {
    const definition = definitions.find((d) => d.id === id)!.definition;
    run(fixture).steps.forEach((s, step) => {
      for (const verdict of judge({ expect: definition.steps[step]!.expect ?? [], presses: named(s.presses) })) out.push({ id, step, verdict });
    });
  }
  return out;
}

/** A judged pause from a verdict's detail: what was heard and the band it was held to. */
function pauseOf(v: Verdict): { heard: number; least: number; most: number } | undefined {
  const m = /(\d+) ms after the previous, wanted (\d+) to (\d+)/.exec(v.detail);
  return m === null ? undefined : { heard: Number(m[1]), least: Number(m[2]), most: Number(m[3]) };
}

test('the ten 7.1 runs carried the tests as derived before the held code rule, and 413 of their 418 expectations held',
  NEEDS, () => {
    const before = touch71Tests(configuration(), 0);
    for (const [fixture, id] of RUNS) {
      const carried = run(fixture).steps.map((s) => s.expect ?? []);
      assert.deepEqual(carried, before.find((d) => d.id === id)!.definition.steps.map((s) => JSON.parse(JSON.stringify(s.expect ?? [])) as Expectation[]), id);
    }
    const all = judged(before);
    assert.equal(all.length, 418);
    assert.equal(all.filter((one) => one.verdict.ok).length, 413);
    // Named afresh from the pulses, the verdicts are the ones the monitor wrote at the bench, one for one.
    const stored = RUNS.flatMap(([fixture]) => run(fixture).steps.flatMap((s) => s.verdicts.map((v) => v.ok)));
    assert.deepEqual(all.map((one) => one.verdict.ok), stored);
    assert.deepEqual(all.filter((one) => !one.verdict.ok).map((one) => `${one.id} ${one.step} ${one.verdict.expected}: ${one.verdict.detail}`), [
      'touch-7-1-2-switches 4 blu-ray · PowerOff: heard at 60.40 s, 2927 ms after the previous, wanted 2300 to 2900',
      'touch-7-1-2-switches 5 denon av receiver · InputMediaPlayer: heard at 87.71 s, 3172 ms after the previous, wanted 2550 to 3100',
      'touch-7-1-4-watch-tv-keys 7 lg tv · Back: heard 0 of 1',
      'touch-7-1-5-watch-a-blu-ray-keys 5 blu-ray · Blue: heard 0 of 1',
      'touch-7-1-5-watch-a-blu-ray-keys 7 blu-ray · ChapterPrev: heard 0 of 1',
    ]);
    // What the tests cover, for the reference: the starts and switches 68 expectations; the favourites 15; and the
    // key steps, a step of keys pressed, Off and a start not counted: in the activities' maps 126 codes from taps and
    // 15 long presses held, in device mode 139 and 17. A long press step holds every key of it, so its expectations
    // are the long presses one for one.
    const count = (ids: string[], held: boolean | undefined) => before.filter((d) => ids.includes(d.id)).flatMap((d) => d.definition.steps
      .filter((s) => held === undefined || (s.instruction.startsWith('Button: ') && s.instruction !== 'Button: Off' && s.instruction.includes(', hold 1 s') === held))
      .flatMap((s) => s.expect ?? [])).length;
    const keys = RUNS.map(([, id]) => id).filter((id) => id.endsWith('-keys'));
    const modes = ['touch-7-1-9a-device-mode', 'touch-7-1-9b-device-mode'];
    assert.equal(count(['touch-7-1-1-starts', 'touch-7-1-2-switches'], undefined), 68);
    assert.equal(count(['touch-7-1-3-favourites'], undefined), 15);
    assert.deepEqual([count(keys, false), count(keys, true)], [126, 15]);
    assert.deepEqual([count(modes, false), count(modes, true)], [139, 17]);
    // The favourites' digits, start to start, on the host's clock: about half a second apart.
    const digits = run('touch_7_1_favourites').steps.slice(1, 6).flatMap((s) => named(s.presses)
      .filter((p) => names(p).some((n) => /^LG TV \d$/.test(n))).map((p) => p.atMs).slice(-3)
      .flatMap((at, i, xs) => (i === 0 ? [] : [Math.round(at - xs[i - 1]!)])));
    assert.equal(digits.length, 10);
    assert.deepEqual([Math.min(...digits), Math.max(...digits)], [501, 526]);
  });

/** The monitor log's lines of the morning the runs were made, the only ones read. */
let logLines: string[] | undefined;

/** The monitor log's frames between two moments, each opening a press, named by the Touch's documents. */
function logPresses(from: string, to: string): { atMs: number; names: string[]; frames: number; lampMs: number }[] {
  logLines ??= new TextDecoder().decode(lab.require_(MONITOR)).split('\n').filter((line) => line.includes('"at":"2026-11-06T09:'));
  const out: { atMs: number; names: string[]; frames: number; lampMs: number }[] = [];
  for (const line of logLines) {
    if (!line.includes('"pulses"')) continue;
    const f = JSON.parse(line) as { at: string; gapUs?: number; repeatOf?: number | null; pulses: { mark: boolean; us: number }[] };
    if (f.at < from || f.at > to) continue;
    const length = f.pulses.reduce((sum, p) => sum + p.us, 0) / 1000;
    if (f.repeatOf !== undefined && f.repeatOf !== null) {
      // A repeat of the press before: its lamp runs on to this frame's end, on the receiver's clock.
      const last = out[out.length - 1];
      if (last !== undefined) {
        last.frames += 1;
        last.lampMs += (f.gapUs ?? 0) / 1000 + length;
      }
      continue;
    }
    const known = book().match(f.pulses).map((m) => `${m.device} ${m.command}`);
    if (known.length === 0) continue;
    out.push({ atMs: Date.parse(f.at), names: known, frames: 1, lampMs: length });
  }
  return out;
}

test('the three presses the runs missed were each heard on the live retest, after the starts the model predicts',
  lab.needing(lab.skipUnless(SET, FULL, MONITOR)), () => {
    const heard = logPresses('2026-11-06T09:48:47', '2026-11-06T09:49:40');
    const c = configuration();
    for (const [timing, high] of [[TIMING.low, false], [TIMING.high, true]] as const) {
      const engine = new BenchTouchEngine(c, timing);
      const acts = [() => engine.start('Watch TV'), () => engine.key('PrevChannel', 'hold'), () => engine.start('Watch a Blu-ray'),
        () => engine.key('Blue', 'tap'), () => engine.key('Rewind', 'hold')];
      const sends = acts.map((act) => {
        engine.idle();
        return act();
      });
      const flat = sends.flat();
      assert.equal(heard.length, flat.length);
      flat.forEach((s, i) => assert.ok(heard[i]!.names.includes(`${s.device} ${s.command}`), `${i}: ${s.device} ${s.command}`));
      if (!high) {
        assert.deepEqual(flat.map((s) => `${s.device} ${s.command}`), [
          'LG TV PowerOn', 'Denon AV Receiver PowerOn', 'Denon AV Receiver InputTVAudio', 'LG TV InputHdmi1', 'LG TV Back',
          'Blu-ray PowerOn', 'LG TV InputHdmi2', 'Denon AV Receiver InputBlu-ray', 'Blu-ray Blue', 'Blu-ray ChapterPrev',
        ]);
      }
    }
    // The two starts' pauses lie in the model's bands, widened as a test widens them: Watch TV from Off, and Watch a
    // Blu-ray from Watch TV, which is no test's step.
    const bands = (before: string | undefined, start: string) => {
      const [low, high] = [TIMING.low, TIMING.high].map((t) => {
        const engine = new BenchTouchEngine(c, t);
        if (before !== undefined) {
          engine.start(before);
          engine.idle();
        }
        return engine.start(start);
      });
      return low!.slice(1).map((s, i) => {
        const x = s.heardMs - low![i]!.heardMs;
        const y = high![i + 1]!.heardMs - high![i]!.heardMs;
        return [Math.floor((Math.min(x, y) - PAUSE_SLACK_MS) / 50) * 50, Math.ceil((Math.max(x, y) + PAUSE_SLACK_MS) / 50) * 50] as const;
      });
    };
    const within = (at: number, band: readonly (readonly [number, number])[]) => band.forEach(([least, most], i) => {
      const pause = heard[at + i + 1]!.atMs - heard[at + i]!.atMs;
      assert.ok(pause >= least && pause <= most, `pause ${at + i + 1}: ${pause} against ${least} to ${most}`);
    });
    within(0, bands(undefined, 'Watch TV'));
    within(5, bands('Watch TV', 'Watch a Blu-ray'));
  });

test('the two late pauses follow a code held for 2 s, and with the held code rule every judged pause of the ten runs is in its band',
  lab.needing(NEEDS, lab.skipUnless(MONITOR)), () => {
    const c = configuration();
    const before = judged(touch71Tests(c, 0)).map((one) => ({ ...one, pause: pauseOf(one.verdict) })).filter((one) => one.pause !== undefined);
    const after = judged(touch71Tests(c)).map((one) => ({ ...one, pause: pauseOf(one.verdict) })).filter((one) => one.pause !== undefined);
    assert.equal(before.length, 89);
    assert.equal(after.length, 89);
    const inside = (xs: typeof before) => xs.filter((one) => one.pause!.heard >= one.pause!.least && one.pause!.heard <= one.pause!.most);
    assert.equal(inside(before).length, 87);
    assert.equal(inside(after).length, 89);
    // Before the rule the two outside are late, by 27 and 72 ms.
    assert.deepEqual(before.filter((one) => !inside(before).includes(one)).map((one) => one.pause!.heard - one.pause!.most), [27, 72]);
    // The rule moves four bands, each the slow side by HELD_CODE_SLACK_MS, and nothing else.
    const moved = after.filter((one, i) => one.pause!.most !== before[i]!.pause!.most || one.pause!.least !== before[i]!.pause!.least);
    assert.equal(moved.length, 4);
    moved.forEach((one) => {
      const was = before[after.indexOf(one)]!.pause!;
      assert.equal(one.pause!.least, was.least);
      assert.equal(one.pause!.most - was.most, HELD_CODE_SLACK_MS);
    });
    assert.deepEqual(moved.map((one) => `${one.id} ${one.step} ${one.verdict.expected}`), [
      'touch-7-1-1-starts 9 denon av receiver · InputGame1',
      'touch-7-1-2-switches 4 blu-ray · PowerOff',
      'touch-7-1-2-switches 5 denon av receiver · InputMediaPlayer',
      'touch-7-1-8-play-a-game-keys 1 denon av receiver · InputGame1',
    ]);
    // Scored both ways: how far inside its band the closest pause sits, on the fast side and on the slow side.
    const fast = Math.min(...after.map((one) => one.pause!.heard - one.pause!.least));
    const slow = Math.min(...after.map((one) => one.pause!.most - one.pause!.heard));
    assert.equal(fast, 86);
    assert.equal(slow, 21);
    // The slow side's closest is a pause the rule does not touch.
    assert.ok(!moved.some((one) => one.pause!.most - one.pause!.heard === slow));
    assert.deepEqual(after.filter((one) => one.pause!.most - one.pause!.heard === slow).map((one) => `${one.id} ${one.step} ${one.verdict.expected}`),
      ['touch-7-1-3-favourites 6 denon av receiver · PowerOff']);

    // What sits between: the held code, then the next device's own inter device delay. Heard against the
    // Duration and that delay, the time beyond them is 427 and 472 ms.
    const xbox = c.devices.find((d) => d.name === 'Xbox')!;
    const late = before.filter((one) => !inside(before).includes(one));
    const delays = late.map((one) => c.devices.find((d) => d.name!.toLowerCase() === one.verdict.expected.split(' · ')[0])!.interDeviceDelayMs);
    assert.deepEqual(delays, [500, 700]);
    assert.deepEqual(late.map((one, i) => one.pause!.heard - 2000 - delays[i]!), [427, 472]);
    assert.equal(xbox.interDeviceDelayMs, 0);
    // The Xbox's six held power codes in the ten runs, on the receiver's own clock: 1.8 to 2.2 s of lamp.
    const holds = logPresses('2026-11-06T09:23:37', '2026-11-06T09:47:00').filter((p) => p.names.some((n) => /^Xbox Power(On|Off)$/.test(n)));
    assert.deepEqual(holds.map((p) => p.frames), [18, 19, 22, 19, 19, 19]);
    assert.deepEqual(holds.map((p) => Math.round(p.lampMs / 100) / 10), [1.8, 1.9, 2.2, 1.9, 1.9, 1.9]);
  });

test('the control: with the hold taken out of the documents the pauses after the held codes miss their bands, rule or no rule',
  NEEDS, () => {
    const noHold = configuration((set) => {
      const devices = set.answers.find((a) => a.uri.endsWith('/DeviceList'))!.resource as { DevicesWithFeatures: { Device: { Name: string }; DeviceFeatures: Record<string, unknown>[] }[] };
      const xbox = devices.DevicesWithFeatures.find((d) => d.Device.Name === 'Xbox')!;
      let cleared = 0;
      for (const f of xbox.DeviceFeatures) {
        for (const list of ['PowerOnActions', 'PowerOffActions']) {
          for (const a of (f[list] ?? []) as Record<string, unknown>[]) {
            if (a['Duration'] === 2000) {
              a['Duration'] = null;
              cleared += 1;
            }
          }
        }
      }
      assert.equal(cleared, 2);
    });
    const late = judged(touch71Tests(noHold)).filter((one) => !one.verdict.ok).map((one) => ({ one, pause: pauseOf(one.verdict) }));
    const after = late.filter((x) => x.pause !== undefined);
    assert.deepEqual(after.map((x) => `${x.one.id} ${x.one.step} ${x.one.verdict.expected}`), [
      'touch-7-1-2-switches 4 blu-ray · PowerOff',
      'touch-7-1-2-switches 5 denon av receiver · InputMediaPlayer',
    ]);
    // By seconds, not by a margin a slack could close: how far past the slow side each was heard.
    assert.deepEqual(after.map((x) => x.pause!.heard - x.pause!.most), [1727, 1772]);
  });

test('the person\'s two marks: the extra presses in each marked step are the ones the notes describe, and the expected codes are all there',
  NEEDS, () => {
    const c = configuration();
    const marked = RUNS.flatMap(([fixture, id]) => run(fixture).steps.map((s, step) => ({ id, step, s })).filter((x) => x.s.problem !== undefined && x.s.problem !== null));
    assert.deepEqual(marked.map((x) => `${x.id} ${x.step}`), ['touch-7-1-8-play-a-game-keys 7', 'touch-7-1-9b-device-mode 21']);
    assert.match(marked[0]!.s.problem!, /rewind\(hold\) first/);
    assert.match(marked[1]!.s.problem!, /wrong buttons/);

    // Play a Game step 7: one press first, Rewind held in Play a Game, then exactly the step's four expectations.
    const game = named(marked[0]!.s.presses);
    const engine = new BenchTouchEngine(c, TIMING.low);
    engine.idle();
    engine.start('Play a Game');
    engine.idle();
    const rewindHeld = engine.key('Rewind', 'hold').map((s) => `${s.device} ${s.command}`);
    assert.deepEqual(rewindHeld, ['Xbox SkipBack']);
    assert.ok(names(game[0]!).includes(rewindHeld[0]!));
    const expect = marked[0]!.s.expect!;
    assert.equal(game.length, 1 + expect.length);
    game.slice(1).forEach((p, i) => assert.ok(names(p).includes(`${String(expect[i]!.device)} ${expect[i]!.command}`), `press ${i + 1}`));

    // Device mode 2 of 2 step 21: the five expected in order among eight, the other three the Xbox map's own codes.
    const mode = named(marked[1]!.s.presses);
    const wanted = marked[1]!.s.expect!.map((e) => `${String(e.device)} ${e.command}`);
    let at = 0;
    const extra: string[] = [];
    for (const p of mode) {
      if (at < wanted.length && names(p).includes(wanted[at]!)) at += 1;
      else extra.push(names(p).find((n) => n.startsWith('Xbox ')) ?? names(p).join('|'));
    }
    assert.equal(at, wanted.length);
    assert.deepEqual(extra, ['Xbox SkipBack', 'Xbox DirectionUp', 'Xbox DirectionDown']);
    const device = new BenchTouchEngine(c, TIMING.low);
    device.idle();
    const own = (key: string, how: 'tap' | 'hold') => device.key(key, how, 'Xbox').map((s) => `${s.device} ${s.command}`);
    assert.deepEqual([own('Rewind', 'hold'), own('DirectionUp', 'tap'), own('DirectionDown', 'tap')], [['Xbox SkipBack'], ['Xbox DirectionUp'], ['Xbox DirectionDown']]);
  });

/** The presses of a step that no expectation took, walking the expectations in order as the judge does. */
function extras(expect: readonly Expectation[], presses: readonly RunPress[]): string[] {
  const taken = new Set<number>();
  let cursor = 0;
  for (const want of expect) {
    const devices = (typeof want.device === 'string' ? [want.device] : want.device).map((d) => d.toLowerCase());
    let found = 0;
    for (let i = cursor; i < presses.length && found < (want.times ?? 1); i += 1) {
      const fits = presses[i]!.frame.matches.some((m) => devices.includes(m.device.toLowerCase()) && m.command?.toLowerCase() === want.command?.toLowerCase());
      if (!fits) continue;
      found += 1;
      taken.add(i);
      cursor = i + 1;
    }
  }
  return presses.flatMap((p, i) => (taken.has(i) || p.frame.matches.length === 0 ? [] : [names(p)[0]!]));
}

test('nothing was sent that a step did not expect, but in the two steps the person marked and the first Off of each test',
  NEEDS, () => {
    const definitions = touch71Tests(configuration());
    const found: string[] = [];
    let unnamed = 0;
    for (const [fixture, id] of RUNS) {
      const definition = definitions.find((d) => d.id === id)!.definition;
      run(fixture).steps.forEach((s, step) => {
        // The first Off of a test is not judged: it switches off whatever ran before the test.
        if (step === 0) return;
        const presses = named(s.presses);
        unnamed += presses.filter((p) => p.frame.matches.length === 0).length;
        for (const extra of extras(definition.steps[step]!.expect ?? [], presses)) found.push(`${id} ${step} ${extra}`);
      });
    }
    assert.deepEqual(found, [
      'touch-7-1-8-play-a-game-keys 7 Xbox SkipBack',
      // Unmarked in the run: one Denon PowerToggle while the Denon's device page was being opened, 10.4 s into the
      // step, which sends nothing by the reading. Reported afterwards as a second tap landing on the page's
      // PowerToggle entry as it opened; the Denon's own map lists that entry on its screen, below.
      'touch-7-1-9a-device-mode 8 Denon AV Receiver PowerToggle',
      'touch-7-1-9b-device-mode 21 Xbox SkipBack',
      'touch-7-1-9b-device-mode 21 Xbox DirectionUp',
      'touch-7-1-9b-device-mode 21 Xbox DirectionDown',
    ]);
    assert.equal(unnamed, 0);
    const denon = configuration().devices.find((d) => d.name === 'Denon AV Receiver')!;
    assert.ok([...denon.map!.entries.values()].some((b) => b.press?.command?.name === 'PowerToggle'));
  });
