/**
 * What a Harmony 300 sent from infrared groups 4 to 7 once firmware event `0xFF` was bound, held against the file
 * it ran: `todo-compile-300.md` 4.3, after `tests/harmony_300_350/test_harmony_300_group_4_send.py`.
 *
 * **The question.** The trace said a send from a group above 3 raises event `0xFF` on the 300's build, that no
 * configuration binds it, and that the sender therefore waits for ever. Its prediction (c): binding `0xFF` in key
 * map 0 to a list ending in `07 FFFA` makes the send work. `packages/codec/test/families/harmony-300-350/noscreeneventff.test.ts` holds
 * the file, Logitech's compile of the Harmony 350's test setup with that one entry; this holds what the bench
 * Flirc heard with it on the bench Harmony 300.
 *
 * **What was run.**
 *
 * * `h300_event_ff_ir`, the bench test `300-4-3-350-compile.json` pressed through, 20 steps. Groups 5 (Kodi
 *   Exit, step 4) and 7 (Sony HT Stop, step 8) were heard. **The long presses of the TV key (step 2) and the DVD
 *   key (step 6) did not take in this run**: the remote stayed in the LG TV's mode and the Denon's, so the
 *   keys after them sent the LG TV's code 28 and the Denon's code 18 and not the Knoll's Timer (group 4) and the
 *   Switch's Input 1 (group 6). Why is not known; how long each key was held was not recorded.
 * * `h300_event_ff_ir_redo`, the first two steps done again: the Denon's Volume Up and the Knoll's Timer, group 4.
 *   The Knoll's Timer is the code the three runs without the entry heard nothing for.
 * * `h300_event_ff_monitor`, the bench monitor's log, step 6 done again live, without the test: the Denon's Volume Up, three
 *   frames of one press, then the Switch's Input 1, group 6.
 *
 * * `h350_event_ff_ir`, the same file written to the bench Harmony 350 and a two step check run
 *   (`350-event-ff-check.json`): the Denon's Volume Up, the Knoll's Timer from group 4 and the LG TV's Volume Up
 *   in the first step, the LG TV's Volume Up in the second, and the remote kept working. The 350's build masks the
 *   send kind to two bits and never raises event 0xFF, so the entry is predicted to change nothing there, and
 *   what was heard is what Logitech's compile without it sent from the same keys, `setup350.test.ts`.
 *
 * So each of groups 4, 5, 6 and 7 was heard once or more sending from this one configuration, and the remote went
 * on answering through all 20 steps of the first run with no battery pull. **What this shows and what it does
 * not.** It shows that the trace's prediction (c) held on one unit and one application build, for these four
 * groups, each heard from one press. It does not show a send from every key of those four maps, nor a long
 * press that always takes, since two of the four did not in the first run.
 *
 * **Method.** A press is its pulses. Each frame the receiver reported is matched again against the patched file
 * alone, by `CodeBook`, and named by group and code; the stored matches of the run files are not used, since the
 * bench server that recorded the runs did not hold this file. A frame that fits two codes of one group, the
 * KPN's 11 and 14, which are the same bytes, is written with both. **The monitor log holds fragments of
 * two or three pulses that match every code**, so only frames of more than 20 pulses are read.
 *
 * **What the first run held to.** Steps 1, 3, 5, 7 and 9 to 20 heard what the prediction table of
 * `docs/predictions/harmony-300-as-350.md` states, code for code, with the repeated presses the notes name, and
 * step 13 was silent as predicted. Steps 2 and 6 are the two long presses that did not take, and 4 and 8 heard
 * the group 5 and group 7 codes the prediction names.
 *
 * **Sources checked first.** `reference/architectures/harmony-300-350/firmware.md`, `docs/test-notes/
 * harmony-300.md` 4.3, `packages/bench/test/harmony-300-350/setup350.test.ts` for the method. Logitech's client was not consulted.
 *
 * **What would falsify it.** A frame of a group above 3 in the three runs that is not in the lists below, or a
 * group among 4 to 7 never heard.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LAB, needing, require_, skipUnless, skipWithoutLab } from '@harmony/lab';

import { CodeBook } from '../../src/irmonitor.ts';

const PATCHED = 'work/300-event-ff/h350-compile-event-ff.bin';
const FIRST = 'h300_event_ff_ir';
const REDO = 'h300_event_ff_ir_redo';
const MONITOR = 'h300_event_ff_monitor';
const ON_350 = 'h350_event_ff_ir';

function needs(): { skip: string | false } {
  const gate = needing(skipWithoutLab(), skipUnless(FIRST, REDO, MONITOR, ON_350));
  if (gate.skip !== false) return gate;
  return existsSync(join(LAB!, PATCHED)) ? { skip: false } : { skip: `not in the lab: ${PATCHED}` };
}
const NEEDS = needs();

interface Frame { readonly at: string; readonly pulses: readonly { readonly mark: boolean; readonly us: number }[] }
interface Step { readonly presses: readonly { readonly frame: Frame }[] }

let book: CodeBook | undefined;
/** Group and code of a frame against the patched file alone, both when the bytes fit two codes. */
function heard(frame: Frame): string {
  book ??= new CodeBook((name) => (name === PATCHED ? new Uint8Array(readFileSync(join(LAB!, PATCHED))) : undefined), [PATCHED]);
  const found = new Set(book.match(frame.pulses).map((one) => `${one.group}/${one.code}`));
  return [...found].sort().join('|') || 'none';
}

const run = (name: string): { steps: Step[] } => JSON.parse(new TextDecoder().decode(require_(name)));
const perStep = (name: string): string[][] => run(name).steps.map((step) => step.presses.map((one) => heard(one.frame)));

test('the first run heard these codes in its 20 steps: groups 5 and 7 sent, and the TV and DVD long presses did not take', NEEDS, () => {
  const steps = perStep(FIRST);
  assert.equal(steps.length, 20);
  assert.deepEqual(steps, [
    ['0/1', '0/15'],
    ['0/1', '0/28'],
    ['1/42', '1/32'],
    ['2/14', '5/2'],
    ['2/14', '2/11'],
    ['2/14', '2/18'],
    ['2/14', '3/4', '3/11|3/14'],
    ['2/14', '7/20'],
    ['0/38', '0/49'],
    ['2/6', '2/12'],
    ['0/38', '2/6', '3/9', '2/31'],
    ['2/14', '3/4'],
    [],
    ['0/49', '2/12', '3/9'],
    ['3/12'],
    ['3/13'],
    ['3/8'],
    ['3/3', '3/3', '3/3'],
    ['3/10', '3/5'],
    ['0/1'],
  ]);
});

test('the redone steps: the TV key held long chose the Knoll, and its Timer went out from group 4', NEEDS, () => {
  const steps = perStep(REDO);
  assert.equal(steps.length, 20);
  assert.deepEqual(steps.slice(0, 2), [['0/1', '0/15'], ['2/14', '4/3']]);
  assert.deepEqual(steps.slice(2), Array.from({ length: 18 }, () => []), 'the run stopped after step 2, as the redo meant it to');
});

test('the live step 6: the Denon\'s Volume Up in three frames of one press, then the Switch\'s Input 1 from group 6', NEEDS, () => {
  const frames: Frame[] = new TextDecoder().decode(require_(MONITOR)).split('\n')
    .filter((line) => line.startsWith('{"seq"')).map((line) => JSON.parse(line))
    .filter((one) => one.at >= '2026-11-01T08:57:20' && one.at <= '2026-11-01T08:57:40');
  const readable = frames.filter((one) => one.pulses.length > 20);
  const fragments = frames.filter((one) => one.pulses.length <= 20);
  assert.deepEqual(readable.map(heard), ['2/14', '2/14', '2/14', '6/1']);
  assert.deepEqual(fragments.map((one) => one.pulses.length), [3, 3], 'the two fragments after the Switch\'s code, which match every code');
});

test('each of the groups 4, 5, 6 and 7 was heard sending from this one configuration', NEEDS, () => {
  const first = perStep(FIRST).flat();
  const redo = perStep(REDO).flat();
  const live = new TextDecoder().decode(require_(MONITOR)).split('\n').filter((line) => line.startsWith('{"seq"')).map((line) => JSON.parse(line))
    .filter((one) => one.at >= '2026-11-01T08:57:20' && one.at <= '2026-11-01T08:57:40' && one.pulses.length > 20).map(heard);
  const above = new Set([...first, ...redo, ...live].filter((one) => Number(one.split('/')[0]) > 3));
  assert.deepEqual([...above].sort(), ['4/3', '5/2', '6/1', '7/20']);
});

test('the same file on the Harmony 350: the Knoll\'s Timer from group 4 and the LG TV\'s Volume Up, as without the entry', NEEDS, () => {
  const steps = perStep(ON_350);
  assert.equal(steps.length, 2);
  assert.deepEqual(steps, [['2/14', '4/3', '0/1'], ['0/1']]);
});
