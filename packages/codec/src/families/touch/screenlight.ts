/**
 * How long the Harmony One's screen stays lit, findings section 400, `todo-compile-one.md` 1.2.11.2.9.
 *
 * **The light is a timer the configuration holds**, as on the Harmony 600, 650 and 700, section 292, but not in
 * their shape: every one of Logitech's nineteen One compiles holds exactly one pair of timers queueing two lists
 * of the same content, one of 10 seconds and one of 20, and on the spare Harmony One the 10 second one, raised to
 * 60 with its partner at 120, kept the screen lit about 60 seconds. **Which timer that is varies**, 2 on thirteen
 * compiles and 3 on six, so it is found by the pair's shape and never by its number.
 */
import { u24 } from '../../bytes.ts';
import { Writer } from '../../emit.ts';
import { type Container, parse } from '../../gspm.ts';
import { ComposeError, restamped } from '../../shared/core.ts';
import { timers } from '../../tables.ts';

/** A timer's duration is clamped to sixteen bits by the firmware, `writing-a-config`'s rail, so a longer one is refused. */
const LONGEST_TIMER = 0xffff;

/**
 * The index of the timer that holds how long the screen stays lit: the lower of the one pair of timers whose
 * queued lists hold the same instructions, which is the 10 second one on all nineteen compiles. `undefined` where
 * there is no such pair, or more than one, since which of several would be the light is not read.
 */
export function touchScreenLightTimer(c: Container): number | undefined {
  const table = timers(c);
  const lists = c.actionLists();
  if (table === undefined || lists === undefined) return undefined;
  // Grouped by what the queued list holds, not by which list it is: the two timers queue two lists, and their
  // contents are the same.
  const groups = new Map<string, number[]>();
  table.records.forEach((timer, index) => {
    if (timer.instruction.opcode !== 0x7f) return;
    const list = lists[timer.instruction.operand];
    if (list === undefined || list.length === 0) return;
    const key = list.map((one) => `${one.opcode}:${one.operand}`).join(' ');
    groups.set(key, [...(groups.get(key) ?? []), index]);
  });
  const pairs = [...groups.values()].filter((indices) => indices.length > 1);
  return pairs.length === 1 && pairs[0]?.length === 2 ? pairs[0][0] : undefined;
}

/**
 * The configuration with its screen light timer set to `seconds`, a same length edit of the timer's duration.
 * Refuses a configuration where the timer is not found and a duration the firmware would clamp.
 */
export function withScreenLight(c: Container, seconds: number): Container {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > LONGEST_TIMER) {
    throw new ComposeError(`a screen light of ${seconds} seconds is outside a timer's 1 to ${LONGEST_TIMER}`);
  }
  const index = touchScreenLightTimer(c);
  const timer = index === undefined ? undefined : timers(c)?.records[index];
  const at = timer === undefined ? undefined : c.blobOffsetOf(timer.address);
  if (timer === undefined || at === undefined) throw new ComposeError('no pair of timers here to find the screen light by');
  if (u24(c.blob, at + 1) === seconds) return c;
  const bytes = Uint8Array.from(c.blob);
  bytes.set(new Writer(3).u24(seconds).bytes, at + 1);
  return parse(restamped(bytes));
}
