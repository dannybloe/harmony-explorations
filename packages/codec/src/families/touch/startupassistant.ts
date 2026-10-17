/**
 * What the Harmony One shows when it starts: the Remote Assistant's "Welcome to your remote", then "Ensure all your
 * devices are off", then a "Welcome!" screen with a hand, findings section 403. Seen on the spare Harmony One after
 * every write: a write restarts it, and these two came back at their starting values each time, though whether
 * that restart is cold, which reseeds every variable, or warm, which keeps them, section 274, was not checked.
 *
 * **One state variable decides it, the assistant's**, which the configuration does not name, so it is found by the
 * shape of what the start runs: a ladder of three lists, each loading 1, 2 and 3 into the byte register and testing
 * the variable against it, the first two arms entering the welcome and the "devices off" screens, the third going on
 * with the ordinary start. Its record runs 0 to 3 and starts at 0, on 18 of Logitech's 19 One compiles; answering
 * Yes to "Do you want to hide the Remote Assistant?" writes 3, as the activities' own assistant screens do on most
 * compiles. The everyday One's compile holds no assistant screens.
 *
 * **The "Welcome!" screen follows the assistant and has a variable of its own that does not decide anything at
 * start**: the screen is reached from the OK on "Ensure all your devices are off", and a list writes its variable 0
 * silently on all nineteen, which the blind review of section 403 found the start runs first. So it is reported
 * here and never edited: this file once started it at 1 as well, which changed nothing.
 *
 * Starting the assistant at 3 starts the remote with a value its own screens write, so the firmware is asked for no
 * state it cannot reach.
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
/** The value the welcome screen's variable is written once the screen is shown. */
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
 * The configuration starting with the Remote Assistant hidden: the assistant's record's starting value, its opening
 * `u16`, set to 3. A configuration with no assistant, as the everyday One's compile, shows none at start and is
 * returned as it is.
 */
export function withoutStartupAssistant(c: Container): Container {
  const variable = touchStartupVariables(c).assistant;
  if (variable === undefined) return c;
  const record = (stateRecords(c) ?? [])[variable];
  const at = record === undefined ? undefined : c.blobOffsetOf(record.address);
  if (record === undefined || at === undefined) throw new ComposeError(`state variable ${variable} has no record here`);
  // The record has to run to the value, or the shape matched something else.
  if (record.second !== ASSISTANT_HIDDEN) {
    throw new ComposeError(`state variable ${variable} runs to ${record.second}, not ${ASSISTANT_HIDDEN}`);
  }
  if (record.first === ASSISTANT_HIDDEN) return c;
  const bytes = Uint8Array.from(c.blob);
  bytes[at] = ASSISTANT_HIDDEN & 0xff;
  bytes[at + 1] = ASSISTANT_HIDDEN >>> 8;
  return parse(restamped(bytes));
}
