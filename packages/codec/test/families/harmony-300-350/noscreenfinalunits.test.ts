/**
 * One build from nothing, heard on a Harmony 350 and a Harmony 300: `todo-compile-350.md` 5.3, decision 28.
 *
 * **The question.** The family's build of the test setup from nothing carries firmware event 0xFF bound to the
 * acknowledging list, 5.4, `noscreenacknowledging.test.ts`, so that one file serves both models: the Harmony 300's
 * application raises 0xFF for a send from infrared groups 4 to 7, and without the entry the remote waits for ever,
 * `tests/harmony_300_350/test_harmony_300_group_4_send.py`. That entry was heard working in Logitech's compile with the entry added by
 * hand, `packages/bench/test/harmony-300-350/eventff300.test.ts`; whether a build of ours sends from groups 4 to 7 on a Harmony 300 was
 * not heard.
 *
 * **What was run.** The lab's `work/setups/h350-test/from-nothing-5.4.bin`, 124170 bytes, written to the bench
 * Harmony 350 and then, unchanged, to the bench Harmony 300, read back identical each time. On each, the bench test of
 * fifteen steps, `packages/bench/irtests/done/350-5-3-final.json` and `300-5-3-final.json`, the same expectations
 * worded for each model's printing: `h350_final_ir` and `h300_final_ir`. Steps 2, 4, 6 and 8 are the four long press
 * devices, the Knoll, Kodi, the Switch and the Sony HT, in groups 4 to 7; step 10 and 15 are Watch TV on and off.
 *
 * **What was heard.** Every expected code of every step on both, 33 of 33 each, the bench server's verdicts, which
 * name the frames against the file the remote held (it is in `BENCH_CONFIGS`). Neither remote needed a battery pull.
 *
 * **What this shows and what it does not.** That one file our build made with no Logitech container as input sends
 * the same codes from the same keys on both models, groups 4 to 7 included, on one unit of each, application 1.4.0.
 * It does not show every key of every map, and it rests on the bench server's verdicts rather than a second matching
 * of the frames here; `eventff300.test.ts` is the one that matches pulses again.
 *
 * **Sources checked first.** `reference/architectures/harmony-300-350/README.md`, decision 28,
 * `packages/bench/test/harmony-300-350/final53.test.ts`, which derives both tests' expectations from the file. Logitech's client was
 * not consulted: it compiles nothing for this family.
 *
 * **What would falsify it.** A step on either run with an expected code not heard, or a step not reached.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needing, require_, skipUnless, skipWithoutLab } from '@harmony/lab';

const RUNS = ['h350_final_ir', 'h300_final_ir'] as const;
const NEEDS = needing(skipWithoutLab(), skipUnless(...RUNS));

interface Step { readonly reached: boolean; readonly expect: readonly unknown[]; readonly verdicts: readonly { readonly ok: boolean }[] }
interface Run { readonly steps: readonly Step[] }

const run = (name: string): Run => JSON.parse(new TextDecoder().decode(require_(name))) as Run;

test('one build from nothing sent every expected code of the fifteen steps on a Harmony 350 and a Harmony 300', NEEDS, () => {
  for (const name of RUNS) {
    const { steps } = run(name);
    assert.equal(steps.length, 15, name);
    assert.ok(steps.every((s) => s.reached), name);
    assert.equal(steps.reduce((n, s) => n + s.expect.length, 0), 33, name);
    assert.equal(steps.reduce((n, s) => n + s.verdicts.filter((v) => v.ok === true).length, 0), 33, name);
  }
});

test('the two runs held the same expectations, step for step', NEEDS, () => {
  const [a, b] = RUNS.map((name) => run(name).steps.map((s) => JSON.stringify(s.expect)));
  assert.deepEqual(a, b);
});
