/**
 * What the bench Harmony 350 did with the empty configuration built from nothing.
 *
 * **The question.** `buildEmptyNoScreenConfiguration` builds a whole configuration with no device and no activity
 * from our generators alone, `packages/codec/test/families/harmony-300-350/noscreenempty.test.ts`. No configuration Logitech compiled for
 * this family holds zero devices, and none starts up without selecting a key map, so what a remote does with
 * either was not checked. The prediction, written into the bench test before the run
 * (`packages/bench/irtests/done/350-5-1-5-empty.json`): the remote takes the file, no key sends anything, since
 * the key table binds no press, release or hold, and nothing hangs, since nothing is ever queued.
 *
 * **What was run.** The lab's `work/setups/h350-empty/empty-350.bin`, 1101 bytes, written to the bench Harmony 350
 * by `write-file-config.ts`, read back identical and the remote restarted. Then `h350_empty_ir`, the bench test's
 * seven steps: the four device keys, Watch TV, Power, the volume keys and Mute, the arrows and OK, three digits, and
 * a long press of the TV/Media key. The person at the bench reported that nothing happened.
 *
 * **Two witnesses.** The run file records no press in any of the seven steps, and the bench monitor's own log,
 * `h350_empty_monitor`, which the same receiver writes every frame to whether a test is running or not, holds no
 * frame between the run's start and end. That log heard the 4.5 run's codes earlier the same day, so the receiver
 * was in place.
 *
 * **What this shows and what it does not.** That one Harmony 350 on application 1.4.0 accepts a configuration with
 * no device and a start up that selects no map, keeps answering keys without a hang, and sends nothing from the keys
 * pressed. Not every key was pressed, and whether a key lit is the person's observation, not a measurement.
 *
 * **Sources checked first.** `reference/architectures/harmony-300-350/memory.md` and `firmware.md`,
 * `packages/bench/test/harmony-300-350/eventff300.test.ts` for the method. Logitech's client was not consulted: it holds no
 * compiler for this family.
 *
 * **What would falsify it.** A press recorded in the run, or a frame in the monitor log inside the run's window.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needing, require_, skipUnless, skipWithoutLab } from '@harmony/lab';

const RUN = 'h350_empty_ir';
const MONITOR = 'h350_empty_monitor';
const NEEDS = needing(skipWithoutLab(), skipUnless(RUN, MONITOR));

interface Step { readonly instruction: string; readonly reached: boolean; readonly presses: readonly unknown[] }
interface Run { readonly startedAt: string; readonly endedAt: string; readonly steps: readonly Step[] }

test('the empty configuration on the bench Harmony 350 sent nothing from any of the seven steps', NEEDS, () => {
  const run = JSON.parse(new TextDecoder().decode(require_(RUN))) as Run;
  assert.equal(run.steps.length, 7);
  assert.deepEqual(run.steps.map((s) => s.reached), Array(7).fill(true));
  assert.deepEqual(run.steps.map((s) => s.presses.length), Array(7).fill(0));
});

test('the bench monitor heard no frame while the empty configuration\'s steps were pressed, and had heard frames before', NEEDS, () => {
  const run = JSON.parse(new TextDecoder().decode(require_(RUN))) as Run;
  const [from, to] = [Date.parse(run.startedAt), Date.parse(run.endedAt)];
  const frames = new TextDecoder().decode(require_(MONITOR))
    .split('\n').filter((line) => line !== '').map((line) => Date.parse((JSON.parse(line) as { at: string }).at));
  assert.equal(frames.filter((at) => at >= from && at <= to).length, 0);
  // The control: the same log holds frames from earlier that day, so the receiver was writing to it.
  assert.ok(frames.some((at) => at < from && at > from - 6 * 3600_000));
});
