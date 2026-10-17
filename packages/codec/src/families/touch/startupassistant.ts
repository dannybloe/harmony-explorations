/**
 * What the Harmony One shows when it starts: the Remote Assistant's "Welcome to your remote", then "Ensure all your
 * devices are off", then a "Welcome!" screen with a hand, findings section 403. Seen on the spare Harmony One after
 * every write, since a write restarts it and a restart seeds every state variable from its record.
 *
 * **Two state variables decide it, and neither is named in the configuration**, so both are found by the shape of
 * what the start runs:
 *
 * * **the assistant's**: a ladder of three lists, each loading 1, 2 and 3 into the byte register and testing one
 *   variable against it, the first two arms entering the welcome and the "devices off" screens, the third going
 *   on with the ordinary start. Its record runs 0 to 3, and answering Yes to "Do you want to hide the Remote
 *   Assistant?" writes 3. On 18 of Logitech's 19 One compiles; the everyday One's holds no assistant screens;
 * * **the welcome screen's**: a list testing a variable against the byte register, whose first arm runs a list
 *   writing that variable 1 and running a list that enters a screen. Its record runs 0 to 1, on 19 of 19.
 *
 * Starting the first at 3 and the second at 1 starts the remote as one whose assistant was hidden and whose
 * welcome screen was seen, a state it reaches itself, so nothing new is asked of the firmware.
 */
import { type Container, parse } from '../../gspm.ts';
import { stateRecords } from '../../sections.ts';
import { ComposeError, restamped } from '../../shared/core.ts';

const LOAD_BYTE = 0x1f;
const LOAD_BYTE_HIGH = 0xfb00;
const CONDITION = 0x71;
const TWO_ARMS = 0x8000;
const CALL = 0x7f;
const ENTER = 0x7e;
const STATE_WRITE = 0x80;

/** The assistant's value at which the start goes on as usual: the one hiding it writes. */
export const ASSISTANT_HIDDEN = 3;
/** The welcome screen's value once it has been shown. */
export const WELCOME_SEEN = 1;

/** The two variables, by number. */
export interface TouchStartupVariables {
  readonly assistant: number | undefined;
  readonly welcome: number | undefined;
}

/**
 * The assistant's and the welcome screen's state variables, each `undefined` where the configuration holds no list
 * of that shape, or several naming different variables.
 */
export function touchStartupVariables(c: Container): TouchStartupVariables {
  const lists = c.actionLists() ?? [];
  // `[load k, call L]` with L opening on a test of one variable: that variable, or undefined.
  const rung = (at: number, k: number): { variable: number; next: number | undefined } | undefined => {
    const list = lists[at];
    if (list?.length !== 2 || list[0]?.opcode !== LOAD_BYTE || list[0].operand !== (LOAD_BYTE_HIGH | k)) return undefined;
    if (list[1]?.opcode !== CALL) return undefined;
    const test = lists[list[1].operand];
    if (test?.[0]?.opcode !== CONDITION) return undefined;
    const next = test.slice(1).find((one) => one.opcode === CALL)?.operand;
    return { variable: test[0].operand & 0xff, next };
  };
  const assistants = new Set<number>();
  lists.forEach((_, at) => {
    const one = rung(at, 1);
    const two = one?.next === undefined ? undefined : rung(one.next, 2);
    const three = two?.next === undefined ? undefined : rung(two.next, 3);
    if (one !== undefined && one.variable === two?.variable && one.variable === three?.variable) assistants.add(one.variable);
  });
  const welcomes = new Set<number>();
  for (const list of lists) {
    const [test, arm] = list;
    if (test?.opcode !== CONDITION || (test.operand & TWO_ARMS) === 0 || arm?.opcode !== CALL) continue;
    const variable = test.operand & 0xff;
    const shown = lists[arm.operand] ?? [];
    if (!shown.some((one) => one.opcode === STATE_WRITE + variable && one.operand === WELCOME_SEEN)) continue;
    if (shown.some((one) => one.opcode === CALL && (lists[one.operand] ?? []).some((i) => i.opcode === ENTER))) {
      welcomes.add(variable);
    }
  }
  const only = (found: Set<number>): number | undefined => (found.size === 1 ? [...found][0] : undefined);
  return { assistant: only(assistants), welcome: only(welcomes) };
}

/**
 * The configuration starting with the Remote Assistant hidden and the welcome screen seen: each variable's
 * record's starting value, its opening `u16`, set. Refuses a configuration holding neither; one holding only the
 * welcome screen, as the everyday One's compile does, gets that one.
 */
export function withoutStartupAssistant(c: Container): Container {
  const found = touchStartupVariables(c);
  const records = stateRecords(c) ?? [];
  const bytes = Uint8Array.from(c.blob);
  let changed = 0;
  for (const [variable, value, max] of [[found.assistant, ASSISTANT_HIDDEN, 3], [found.welcome, WELCOME_SEEN, 1]] as const) {
    if (variable === undefined) continue;
    const record = records[variable];
    const at = record === undefined ? undefined : c.blobOffsetOf(record.address);
    if (record === undefined || at === undefined) throw new ComposeError(`state variable ${variable} has no record here`);
    // The record has to run to the value, or the shape matched something else.
    if (record.second !== max) throw new ComposeError(`state variable ${variable} runs to ${record.second}, not ${max}`);
    bytes[at] = value & 0xff;
    bytes[at + 1] = value >>> 8;
    changed += 1;
  }
  if (changed === 0) throw new ComposeError('no Remote Assistant or welcome screen to start past here');
  return parse(restamped(bytes));
}
