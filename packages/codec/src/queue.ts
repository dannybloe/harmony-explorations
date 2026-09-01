/**
 * The action queue, and how much of it a config's own lists demand.
 *
 * **A Harmony does not interpret an action list. It spools one into a ring and drains it.** The
 * ring holds 120 bytes, which is exactly 40 three byte instructions, and it is the only one: a
 * key press, a state change, a display band announcement and the host's own `MISC_QUEUE_ACTION`
 * all push into the same 40 slots that a running activity or sequence is occupying. Section 34
 * found the ring on arch 14 (Harmony 600 and 700) and section 238 read the rest of the machine on
 * arch 12 (Harmony One), where the hazard was measured.
 *
 * The main loop is three calls: execute one instruction, then rotate whatever that instruction
 * pushed from the tail to the head, then service the rest of the system. So **opcode `0x7F` is a
 * call**: it appends its whole sublist and the rotate makes it run next, which is why the ring
 * holds the call stack rather than a flat program, and why the depth is bounded by nesting rather
 * than by a config's total instruction count.
 *
 * **Every push is dropped in silence when the ring is full.** The three push routines each test
 * the count first and return, with no status a caller checks and no error anywhere. So a config
 * whose lists demand more than 40 instructions in flight does not fail: it runs, and some of what
 * it asked for never happens. That is the hazard class `docs/findings.md` section 238 records, and
 * it is why `assertQueueFits` refuses rather than warns.
 *
 * What the model does **not** cover is what arrives from outside: a key press, a touch, a timer.
 * Those push into the same ring, so the peak here is a floor on what a config demands and the
 * headroom above it is what absorbs the rest of the system. Every configuration Logitech's own
 * compiler produced without a hand authored sequence peaks at 22 or below; the one sequence in the
 * corpus reaches 35 of the 40, and that is the config whose remote hung.
 */
import { Container, INSTRUCTION_LENGTH } from './gspm.ts';
import type { Instruction } from './gspm.ts';
import { ACTION_LIST_INDEX_OPCODE } from './sections.ts';

/** The ring, in bytes: `0x78` on arch 12 (Harmony One) and on arch 14, read off both images. */
export const ACTION_QUEUE_BYTES = 0x78;

/** The ring in instructions, which is what everything else here counts in. */
export const ACTION_QUEUE_INSTRUCTIONS = ACTION_QUEUE_BYTES / INSTRUCTION_LENGTH;

/**
 * How many instructions the simulation will execute before calling a list non terminating.
 *
 * A list that reaches this is not necessarily a loop. It is a list this model cannot answer for,
 * which is the honest report, and no caller may read it as a pass.
 */
export const STEP_CEILING = 20000;

export class QueueError extends Error {}

export interface QueueRun {
  /** The most instructions in the ring at once, counting the whole call stack. */
  readonly peak: number;
  /** How many instructions ran. */
  readonly executed: number;
  /** False when the run hit `STEP_CEILING`, in which case `peak` is a floor and nothing more. */
  readonly terminated: boolean;
}

/**
 * Run one action list against the model and report the deepest the ring gets.
 *
 * Returns undefined when the list index names nothing, which is not a failure: base slot 10's
 * table is walked in full by the corpus wide callers and its far end holds entries no reader has
 * a meaning for.
 */
export function queueRun(c: Container, list: number): QueueRun | undefined {
  const lists = c.actionLists();
  if (lists === undefined) return undefined;
  return runOver(lists, list);
}

/**
 * The simulation itself, over a bare array of lists, so it can be exercised without a container.
 *
 * The ring is a deque: the head is index 0, a push lands at the tail, and the main loop's rotate
 * then brings it to the head, which is one `unshift` here rather than two operations.
 */
export function runOver(
  lists: readonly (readonly Instruction[])[],
  list: number,
): QueueRun | undefined {
  const first = lists[list];
  if (first === undefined) return undefined;
  const ring: Instruction[] = [...first];
  let peak = ring.length;
  let executed = 0;
  while (ring.length > 0) {
    if (executed >= STEP_CEILING) return { peak, executed, terminated: false };
    executed += 1;
    const instruction = ring.shift()!;
    const pushed = enqueuedBy(instruction, lists);
    if (pushed.length === 0) continue;
    ring.unshift(...pushed);
    if (ring.length > peak) peak = ring.length;
  }
  return { peak, executed, terminated: true };
}

/**
 * What one instruction puts into the ring.
 *
 * **Only `0x7F` is followed, and that is a deliberate floor rather than the whole answer.** A write
 * to a state variable also pushes, one instruction per transition the write fires, which was traced
 * to the same push routine on arch 12 (Harmony One). Following it needs the state machine's own
 * semantics, since a transition runs only when the variable currently holds its `from` value, and a
 * model that ignores that fires every transition ending at the value and invents loops that the
 * hardware does not run: it reported twelve non terminating lists in a Harmony 700 configuration
 * that works. `activityStartSteps` in `inventory.ts` owns the state walk, and a second copy of it
 * here is what this repository's oldest rule forbids.
 *
 * So a peak reported here is a **lower bound** on what the config demands, which is the right
 * direction for a refusal: over the ceiling proves loss, under it proves nothing.
 *
 * `0x7D` and `0x7C` reach the send queue instead and put nothing back here, which is section 236.
 */
function enqueuedBy(
  instruction: Instruction,
  lists: readonly (readonly Instruction[])[],
): readonly Instruction[] {
  if (instruction.opcode !== ACTION_LIST_INDEX_OPCODE) return [];
  return lists[instruction.operand] ?? [];
}

export interface WorstRun extends QueueRun {
  /** The base slot 10 index whose run this is. */
  readonly list: number;
}

/**
 * The deepest run any of a config's action lists demands.
 *
 * **Every list is tried, not only the ones something is known to enter.** A list this project has
 * not traced a caller for is still a list the firmware can be sent to, and the point of the number
 * is to bound what the config can ask for rather than to describe what it usually does.
 */
export function worstQueueRun(c: Container): WorstRun | undefined {
  const lists = c.actionLists();
  if (lists === undefined) return undefined;
  let worst: WorstRun | undefined;
  for (const run of runs(c)) {
    if (!run.terminated) continue;
    if (worst === undefined || run.peak > worst.peak) worst = run;
  }
  return worst;
}

/**
 * Every action list that provably demands more of the ring than it holds.
 *
 * A list in this array is a list some of whose instructions the remote will silently discard.
 * **Only a run that finished is judged**, because a run that hit the step ceiling is a run this
 * model could not follow rather than a run that overflows: see `undecidedLists`.
 */
export function overflowingLists(c: Container): WorstRun[] {
  return runs(c).filter((run) => run.terminated && run.peak > ACTION_QUEUE_INSTRUCTIONS);
}

/**
 * Every action list this model cannot answer for, because the run did not finish.
 *
 * **These are loops with a conditional exit, not runaway configs.** Twelve lists in each of the two
 * Harmony 700 configurations here form a cycle of `0x7F` calls, and the list at the head of it
 * carries the comparison opcodes that leave the cycle. This model executes no conditionals, so it
 * walks the loop until the ceiling and reports a depth in the hundreds for a configuration that
 * runs a real remote perfectly well. Judging those as overflowing would refuse every Harmony 700
 * config in the corpus, which is the calibration that produced this split.
 */
export function undecidedLists(c: Container): WorstRun[] {
  return runs(c).filter((run) => !run.terminated);
}

/**
 * Every list's run, computed once per container.
 *
 * Cached because the three questions above each want the whole set and a corpus wide test asks all
 * three: without this a Harmony 700 configuration's eight thousand lists are simulated three times,
 * twelve of them to the step ceiling, and the test does not finish in two minutes.
 */
const RUNS = new WeakMap<Container, WorstRun[]>();

function runs(c: Container): WorstRun[] {
  const cached = RUNS.get(c);
  if (cached !== undefined) return cached;
  const lists = c.actionLists();
  const out: WorstRun[] = [];
  if (lists !== undefined) {
    for (let list = 0; list < lists.length; list += 1) {
      const run = runOver(lists, list);
      if (run !== undefined) out.push({ ...run, list });
    }
  }
  RUNS.set(c, out);
  return out;
}

/**
 * Refuse a container whose own lists overflow the ring.
 *
 * **This is a rail and not a warning**, per `CLAUDE.md`: a config that overflows is one the remote
 * accepts, whose checksums verify, which this project accounts for to the byte, and which quietly
 * does less than it says. The caller that matters is the config writer, so nothing reaches a
 * remote without passing this.
 */
export function assertQueueFits(c: Container): void {
  const over = overflowingLists(c);
  if (over.length === 0) return;
  const worst = over.reduce((a, b) => (b.peak > a.peak ? b : a));
  throw new QueueError(
    `${over.length} action list(s) do not fit the ${ACTION_QUEUE_INSTRUCTIONS} instruction queue: ` +
      `list ${worst.list} peaks at ${worst.peak}`,
  );
}
