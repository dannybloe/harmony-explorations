/**
 * The action queue model, against the corpus and against the firmware's own numbers.
 *
 * `docs/findings.md` section 238. The claim being pinned is a bound rather than a reading: a
 * Harmony spools action lists into a ring of forty instructions, every push into a full ring is
 * discarded in silence, and the ring is shared with everything else the remote has to do. So how
 * deep a config's own lists go is the difference between a configuration that runs and one that
 * quietly does less than it says.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { IMAGES, PARSEABLE_EXCLUDED, require_, skipWithoutLab, skipUnless } from '@harmony/lab';
import { parse, INSTRUCTION_LENGTH } from '../src/gspm.ts';
import type { Instruction } from '../src/gspm.ts';
import {
  ACTION_QUEUE_BYTES,
  ACTION_QUEUE_INSTRUCTIONS,
  QueueError,
  assertQueueFits,
  overflowingLists,
  runOver,
  STEP_CEILING,
  undecidedLists,
  worstQueueRun,
} from '../src/queue.ts';

const CALL = 0x7f;
const SEND = 0x7d;

/**
 * The deepest any action list of each configuration goes, measured.
 *
 * **The split is the point of the table.** Every configuration Logitech's compiler produced from an
 * ordinary account peaks at 22 or below, and the four that reach 35 are the four that carry a hand
 * authored sequence or the fifteen device protocol campaigns. Nothing in the corpus reaches the
 * ring's 40, and the one config whose remote hung sits five instructions short of it.
 */
const PEAKS: Readonly<Record<string, number>> = {
  one_spare_20260830: 35,
  compiled_protocols: 35,
  compiled_protocols_2: 35,
  compiled_protocols_3: 35,
  one_config: 22,
  one_config_unprogrammed: 22,
  one_spare_before_sync: 22,
  one_spare_after_sync: 22,
  one_spare_myharmony: 22,
  calibration_one: 22,
  calibration_favchannels: 22,
  calibration_favzero: 22,
  phase7_before: 22,
  phase7_after: 22,
  h700_config: 18,
  h700_config_2: 18,
  h890_config: 14,
  h895_config: 14,
  h890_config_rescan: 14,
  h600_config: 14,
  arch8_config_a: 13,
  arch8_config_b: 13,
  arch8_config_c: 13,
  arch8_config_d: 13,
  arch8_config_885: 13,
  arch8_config_880: 13,
  calibration_h600: 12,
  h525_external_firmware: 9,
  h525_config: 9,
  h525_config_2: 9,
  h525_safemode_ahcm: 9,
  one34_region2: 6,
  one_safemode: 6,
  h700_gspm: 3,
  h600_safemode_gspm: 3,
  h650_safemode_gspm: 3,
};

let measured: { name: string; peak: number; over: number; undecided: number }[] | undefined;

/** Cached, because three tests want the whole table and walking it takes seconds. */
function corpus(): { name: string; peak: number; over: number; undecided: number }[] {
  if (measured !== undefined) return measured;
  const out: { name: string; peak: number; over: number; undecided: number }[] = [];
  for (const name of Object.keys(IMAGES)) {
    if (PARSEABLE_EXCLUDED.includes(name)) continue;
    const data = require_(name);
    let container;
    try {
      container = parse(data);
    } catch {
      // Not a container. The population is what parses, not what is named.
      continue;
    }
    let worst;
    try {
      worst = worstQueueRun(container);
    } catch {
      continue;
    }
    if (worst === undefined) continue;
    out.push({
      name,
      peak: worst.peak,
      over: overflowingLists(container).length,
      undecided: undecidedLists(container).length,
    });
  }
  measured = out;
  return out;
}

test('the ring is forty instructions, which is the firmware literal divided by an instruction',
  () => {
    assert.equal(ACTION_QUEUE_BYTES, 0x78);
    assert.equal(ACTION_QUEUE_INSTRUCTIONS, ACTION_QUEUE_BYTES / INSTRUCTION_LENGTH);
    assert.equal(ACTION_QUEUE_INSTRUCTIONS, 40);
    assert.equal(ACTION_QUEUE_BYTES % INSTRUCTION_LENGTH, 0, 'no part instruction fits');
  });

test('every configuration in the corpus demands exactly this much of the ring',
  skipWithoutLab(), () => {
    const measured = Object.fromEntries(corpus().map((row) => [row.name, row.peak]));
    assert.deepEqual(measured, PEAKS);
  });

test('nothing Logitech compiled overflows the ring, and the sequence gets closest',
  skipWithoutLab(), () => {
    const rows = corpus();
    assert.equal(rows.filter((row) => row.over > 0).length, 0);
    const deepest = Math.max(...rows.map((row) => row.peak));
    assert.equal(deepest, 35);
    assert.equal(ACTION_QUEUE_INSTRUCTIONS - deepest, 5,
      'five free slots is all the headroom the sequence leaves for everything else');
  });

test('the hand authored sequence is what puts a Harmony One config at 35',
  skipUnless('one_spare_20260830', 'one_spare_myharmony'), () => {
    // The same unit before and after that sequence was authored: 22 without it, 35 with it, and
    // the list the deepest run starts from is one of the sequence's own copies.
    const before = worstQueueRun(parse(require_('one_spare_myharmony')))!;
    const after = worstQueueRun(parse(require_('one_spare_20260830')))!;
    assert.equal(before.peak, 22);
    assert.equal(after.peak, 35);
    assert.equal(after.list, 3538);
  });

test('the only lists the model cannot follow are one Harmony 700 cycle, twelve of them',
  skipWithoutLab(), () => {
    const undecided = corpus().filter((row) => row.undecided > 0);
    assert.deepEqual(undecided.map((row) => [row.name, row.undecided]).sort(),
      [['h700_config', 12], ['h700_config_2', 12]]);
  });

test('a list that fits is accepted and one that does not is refused', () => {
  const send: Instruction = { opcode: SEND, operand: 0x0101 };
  const call = (to: number): Instruction => ({ opcode: CALL, operand: to });
  // List 0 calls list 1 twenty times; list 1 is one send. Depth never passes 20 + 1.
  const shallow = [Array.from({ length: 20 }, () => call(1)), [send]];
  assert.equal(runOver(shallow, 0)!.peak, 20);
  assert.equal(runOver(shallow, 0)!.terminated, true);

  // A chain of calls, each list holding the next call plus filler, is what actually stacks up.
  const deep: Instruction[][] = [];
  for (let i = 0; i < 10; i += 1) deep.push([call(i + 1), send, send, send, send, send]);
  deep.push([send]);
  const run = runOver(deep, 0)!;
  assert.equal(run.peak, 51, 'ten frames of five leftovers, plus the innermost list');
  assert.ok(run.peak > ACTION_QUEUE_INSTRUCTIONS);
});

test('a cycle is reported as undecided rather than as an overflow', () => {
  const cycle = [[{ opcode: CALL, operand: 1 }], [{ opcode: CALL, operand: 0 }]];
  const run = runOver(cycle, 0)!;
  assert.equal(run.terminated, false);
  assert.equal(run.executed, STEP_CEILING);
});

test('the rail refuses a container whose lists overflow, and says which one', () => {
  // A container is what `assertQueueFits` takes, so the refusal is exercised through a stub that
  // answers the one question it asks. Nothing else of a container is reached.
  const deep: Instruction[][] = [];
  for (let i = 0; i < 12; i += 1) deep.push([{ opcode: CALL, operand: i + 1 },
    ...Array.from({ length: 5 }, () => ({ opcode: SEND, operand: 1 }))]);
  deep.push([{ opcode: SEND, operand: 1 }]);
  const stub = { actionLists: () => deep } as never;
  assert.throws(() => assertQueueFits(stub), (error: unknown) => {
    assert.ok(error instanceof QueueError);
    assert.match(error.message, /do not fit the 40 instruction queue/);
    assert.match(error.message, /list 0 peaks at 61/);
    return true;
  });
  // Only the entries with enough of the chain left below them overflow: entering at frame 8 leaves
  // four frames of five and never reaches 40. Measured rather than reasoned, and it is the reason
  // the rail reports a list rather than a container wide yes or no.
  assert.equal(overflowingLists(stub).length, 5);
});

test('a container whose lists all fit passes the rail', skipWithoutLab(), () => {
  for (const name of Object.keys(IMAGES)) {
    if (PARSEABLE_EXCLUDED.includes(name)) continue;
    const data = require_(name);
    let container;
    try {
      container = parse(data);
    } catch {
      // Not a container. The population is what parses, not what is named.
      continue;
    }
    assert.doesNotThrow(() => assertQueueFits(container), `${name} is refused`);
  }
});
