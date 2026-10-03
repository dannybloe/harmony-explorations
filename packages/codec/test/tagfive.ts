/**
 * Section 313's check of an activity's tag 5 list against its own tag 1, shared by the corpus
 * measurement in `inventory.test.ts` and the composer's test in `compose.test.ts`.
 *
 * **It lives in one file because it is one derivation.** The corpus test says what Logitech's compiler
 * puts in tag 5 on the Harmony 600, 650 and 700; the composer test says ours puts the same thing
 * there. Two copies of the predicate would be the state this repository's oldest rule forbids: the day
 * one of them is tightened, the composer would be passing a check the corpus no longer states.
 *
 * Not a test file itself, the name does not end in `.test.ts`, so the runner does not pick it up.
 */

import {
  ACTION_LIST_INDEX_OPCODE,
  ACTIVITY_STATE_NAME,
  type Container,
  EVENT_MASK,
  handlerSets,
  INPUT_PROPERTY,
  deviceVariables,
  nameNodes,
  POWER_PROPERTY,
  STATE_WRITE_BASE,
  taggedList,
} from '../src/index.ts';

/** Opcode `0x7E`, enter a mode: tag 1's first step, the start up screen. */
const ENTER_MODE = 0x7e;
/** `3F D000`, the instruction a deferred list opens with, so its rest waits for the infrared queue. */
const DEFER = { opcode: 0x3f, operand: 0xd000 } as const;

type Step = { readonly opcode: number; readonly operand: number };

const key = (one: Step) => `${one.opcode}:${one.operand}`;

/** An activity's tag 1 and tag 5 lists, the list table, and the pieces the check names. */
function readActivity(c: Container, index: number) {
  const sets = handlerSets(c);
  const lists = c.actionLists();
  if (sets === undefined || lists === undefined) throw new Error('base slot 9 or 10 does not read');
  const handlers = new Map((taggedList(c, sets.addresses[index] ?? -1)?.entries ?? [])
    .filter((one) => (one.tag & EVENT_MASK) === 0).map((one) => [one.tag, one]));
  const start: readonly Step[] = lists[handlers.get(1)?.operand ?? -1] ?? [];
  const again: readonly Step[] = lists[handlers.get(5)?.operand ?? -1] ?? [];
  // Tag 1 reaches its working screen through a list deferred behind `3F D000`; tag 5 runs that list's
  // second step directly, which is the screen itself where the configuration has no Remote Assistant,
  // as on `h600_config`, and the assistant's branch where it has one.
  const deferCall = start.find((one) => one.opcode === ACTION_LIST_INDEX_OPCODE
    && key(lists[one.operand]?.[0] ?? { opcode: -1, operand: -1 }) === key(DEFER));
  const working = deferCall === undefined ? undefined : lists[deferCall.operand]?.[1];
  // The start variable `S`: tag 1's first write of 1, which tag 5 must open with and close at 0.
  const variable = start.find((one) => one.opcode >= STATE_WRITE_BASE && one.operand === 1);
  // The flag `F`, section 290: the write tag 1 makes immediately before deferring its working screen.
  const flag = deferCall === undefined ? undefined : start[start.indexOf(deferCall) - 1];
  return { lists, start, again, working, variable, flag };
}

/**
 * Why an activity's tag 5 list does not have Logitech's shape, or undefined when it does.
 *
 * The shape, section 313: tag 1's opening start up screen left out; `S := 1` first and `S := 0` last;
 * every other step one of tag 1's, or the working screen step tag 1 defers, which must be there; no
 * write of the activity counter; no power write, inline or in a list tag 5 calls; and every input step
 * of tag 1, inline or a call to a list writing an input, present in tag 5.
 */
export function tagFiveMisfit(c: Container, index: number): string | undefined {
  const { lists, start, again, working, variable } = readActivity(c, index);
  const names = new Map((nameNodes(c) ?? []).map((one) => [one.index, one.name]));
  const writes = (list: readonly Step[], test: RegExp) => list.some((one) =>
    one.opcode >= STATE_WRITE_BASE && test.test(names.get(one.opcode - STATE_WRITE_BASE) ?? ''));
  const none = { opcode: -1, operand: -1 };
  const inStart = new Set(start.map(key));
  const calledByAgain = again.filter((one) => one.opcode === ACTION_LIST_INDEX_OPCODE)
    .map((one) => lists[one.operand] ?? []);
  if (start[0]?.opcode !== ENTER_MODE) return 'tag 1 does not open with a start up screen';
  if (again.some((one) => key(one) === key(start[0]!))) return 'tag 5 enters the start up screen';
  if (variable === undefined) return 'tag 1 sets no start variable';
  if (key(again[0] ?? none) !== key(variable)) return 'tag 5 does not open with S := 1';
  if (key(again.at(-1) ?? none) !== key({ opcode: variable.opcode, operand: 0 })) {
    return 'tag 5 does not close with S := 0';
  }
  if (working === undefined) return 'tag 1 defers no working screen';
  if (!again.some((one) => key(one) === key(working))) return 'tag 5 does not run the working screen step';
  if (!again.every((one) => inStart.has(key(one)) || key(one) === key(working))) {
    return 'tag 5 runs a step tag 1 does not';
  }
  if (writes(again, new RegExp(`^${ACTIVITY_STATE_NAME}`))) return 'tag 5 writes the activity counter';
  if (writes(again, /_Power_\d+$/) || calledByAgain.some((one) => writes(one, /_Power_\d+$/))) {
    return 'tag 5 writes a power variable';
  }
  const inputs = start.filter((one) => (one.opcode >= STATE_WRITE_BASE
      && /_Input_\d+$/.test(names.get(one.opcode - STATE_WRITE_BASE) ?? ''))
    || (one.opcode === ACTION_LIST_INDEX_OPCODE && writes(lists[one.operand] ?? [], /_Input_\d+$/)));
  if (!inputs.every((one) => again.some((other) => key(other) === key(one)))) {
    return 'tag 5 leaves out an input step of tag 1';
  }
  return undefined;
}

/**
 * An activity's tag 5 list with its numbers normalised away, so two activities' lists can be compared
 * instruction for instruction even in different configurations or with different devices.
 *
 * Each step becomes a word: `S:=v` and `F:=v` for the two configuration wide variables, read off the
 * activity's own tag 1; `input v<n>:=<value>` for a write of a device's input, with a call to a list
 * made only of input writes **flattened** into one word per write, since Logitech's tag 1 holds a lone
 * input inline and several in a list and that choice is the compiler's grouping rather than what is
 * written; `working` for the step tag 1 defers, whose list number differs per activity and whose form
 * differs per configuration; and the raw opcode and operand for anything else, so a step the
 * normalisation does not expect still shows up as a difference.
 */
export function tagFiveShape(c: Container, index: number): string[] {
  const { lists, again, working, variable, flag } = readActivity(c, index);
  const inputs = new Set(deviceVariables(c).filter((one) => one.property === INPUT_PROPERTY)
    .map((one) => STATE_WRITE_BASE + one.index));
  const word = (one: Step): string[] => {
    if (variable !== undefined && one.opcode === variable.opcode) return [`S:=${one.operand}`];
    if (flag !== undefined && one.opcode === flag.opcode) return [`F:=${one.operand}`];
    const input = (step: Step) => `input v${step.opcode - STATE_WRITE_BASE}:=${step.operand}`;
    if (inputs.has(one.opcode)) return [input(one)];
    if (working !== undefined && key(one) === key(working)) return ['working'];
    const called = one.opcode === ACTION_LIST_INDEX_OPCODE ? lists[one.operand] ?? [] : [];
    if (called.length > 0 && called.every((step) => inputs.has(step.opcode))) return called.map(input);
    return [`${one.opcode.toString(16)}:${one.operand.toString(16)}`];
  };
  return again.flatMap(word);
}

/** The variable indices `S` and `F` an activity's tag 1 writes, for checking two activities share them. */
export function startAndFlag(c: Container, index: number): { start?: number; flag?: number } {
  const { variable, flag } = readActivity(c, index);
  return {
    ...(variable === undefined ? {} : { start: variable.opcode - STATE_WRITE_BASE }),
    ...(flag === undefined || flag.opcode < STATE_WRITE_BASE ? {} : { flag: flag.opcode - STATE_WRITE_BASE }),
  };
}

/**
 * The device writes an activity's tag 1 makes, power and input, in order, with a call to a list of
 * writes flattened into its writes. What a composer would be handed as targets to rebuild the same
 * activity, so the composed tag 5 can be compared with Logitech's own for the same devices and values.
 */
export function startTargets(c: Container, index: number): { variable: number; value: number }[] {
  const { lists, start } = readActivity(c, index);
  const device = new Set(deviceVariables(c)
    .filter((one) => one.property === INPUT_PROPERTY || one.property === POWER_PROPERTY)
    .map((one) => STATE_WRITE_BASE + one.index));
  const flat = start.flatMap((one) => one.opcode === ACTION_LIST_INDEX_OPCODE ? lists[one.operand] ?? [] : [one]);
  return flat.filter((one) => device.has(one.opcode))
    .map((one) => ({ variable: one.opcode - STATE_WRITE_BASE, value: one.operand }));
}
