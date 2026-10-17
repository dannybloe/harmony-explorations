/**
 * The four slot family's activity start, the Harmony 600, 650 and 700, section 290: a variable held at 1
 * while the start runs, which every command's delay prelude tests, and a flag written 1 before the working
 * screen is deferred, whose list enters the working screen itself. `FOUR_SLOT_START` is what the shared
 * activity composer asks for the shape, `Family.activityStart`; the readers here are the ones every four slot
 * composer reads the start sequence with, `startSequenceOf` and `arch14Starts`.
 *
 * Moved out of `shared/activities.ts` with `todo-compile-one.md` 3.3.3.4, where the shape was an inline test
 * of a trait, `startSequence`, and the readers were four slot facts in a shared module. Nothing in the
 * readers changed; the one test of which family a configuration is in, `startSequenceOf`'s, reads the
 * architecture as the family's other modules do rather than asking the registry, which a family never imports.
 */
import { DEFERRED, STATE_WRITE_BASE } from '../../actions.ts';
import type { ActivityStart, ListBody } from '../family.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import { type Container, type Instruction, parse } from '../../gspm.ts';
import {
  ACTIVITY_STATE_NAME, activityBindings, ENTER_MODE, firmwareStateVariableMax, handlerSetRoles, MAP_VALUE_OPCODE,
  stateVariables,
} from '../../inventory.ts';
import { ACTION_LIST_INDEX_OPCODE, HANDLER_TAG_ENTER, handlerSets, taggedList } from '../../sections.ts';
import { assertGeneratedRecord, ComposeError, HANDLER_TAG_RESUME, STATE_WRITE_LIMIT } from '../../shared/core.ts';
import { type StateVariableSpec } from '../../statetables.ts';
import { describeWiring, rewiredForActivities } from './wiring.ts';
import { FOUR_SLOT_ACTIVITY_KEY_EDITOR } from './activitykeys.ts';
import { startSequenceVariables } from './statetables.ts';

/** What every arch 14 activity's enter list states, read off all of them rather than one. */
export interface Arch14Starts {
  counter: number;
  idle: number;
  /** The variable a start, All Off or Help holds at 1 while it runs, which gates the inter device delay. */
  startVariable: number;
  /** The variable written 1 just before the working screen is deferred. */
  flagVariable: number;
  /** Per activity value: its start up mode and its base slot 9 entry. */
  startup: Map<number, number>;
  sets: Map<number, number>;
  /**
   * Per activity value: the working screen its start sequence ends on, the last `0x7E` of the deferred
   * list or of the Remote Assistant's branch below it, section 333; absent where neither reads, which
   * `checkActivityScreens` refuses. Section 336.
   */
  endsOn: Map<number, number>;
}

/** The variable a state write names, if it is a write of `value`. */
function writtenWith(one: Instruction | undefined, value: number): number | undefined {
  return one !== undefined && one.opcode >= STATE_WRITE_BASE && one.operand === value
    ? one.opcode - STATE_WRITE_BASE : undefined;
}

/** The variable the Off key map's enter list maps through base slot 14, section 280. */
export const LOCATION_STATE_NAME = 'CurrentLocation';

/** The two variables an arch 14 start brackets itself with, `startSequenceOf`'s answer. */
export interface StartSequenceVariables {
  /** `S`: held at 1 while a start runs, tested by every command prelude, section 319. */
  startVariable: number;
  /** `F`: written 1 by an activity before it defers its working screen, and 0 by the Off key map. */
  flagVariable: number;
}

/**
 * The start variable and the flag of a Harmony 600, 650 or 700 configuration, read off its **Off**
 * key map rather than off an activity, section 329, `todo-compile-650.md` 6.2.4.
 *
 * Until then both were read off the activities' enter lists, `arch14Starts`, which made a
 * configuration with no activity uncomposable: nothing in it said which variable a command prelude
 * should test. The Off key map is base slot 9's `idle` entry, `handlerSetRoles`, the key map the
 * remote installs when no activity runs, whose enter list maps `CurrentLocation` through base slot 14,
 * section 280; the second condition is what tells it from an activity composed without its menu row
 * yet, which no row binds either, and whose enter list raises `S` as the Off's lists do. **It is in each
 * of the thirteen compiles, one per configuration**; no configuration without an activity exists here
 * to show that it always is, the fewest being two. Both its lists bracket themselves the way an activity's start does, and with the same
 * two variables: its enter list `[7F, 72 location, S:=1, F:=0, 7F, 72 location, S:=0]` and its tag 5
 * list `[S:=1, F:=0, ..., S:=0]`, 26 lists of 26 on the thirteen compiles. So `S` is the variable the
 * first write of 1 names, provided the list ends by writing it 0, and `F` the variable written 0 straight
 * after it.
 *
 * **What is generated is each variable's record**, `startSequenceVariables`, and both are checked:
 * an unnamed 0 of maximum 1 with no transition. **What is not generated is the index**, which is the
 * configuration's own and can be nothing else, since Logitech's lists already name it; where it comes
 * from in a configuration built from nothing is the description's order, section 324.
 *
 * Refused when there is no Off key map, which is what the safe mode containers give, or when its lists
 * disagree, or when either variable is not the generated record.
 */
export function startSequenceOf(c: Container): StartSequenceVariables {
  // The family's own test, as its other modules make it: this family is architecture 14's.
  if (c.architecture !== 14) {
    throw new ComposeError('the start sequence variables are the Harmony 600, 650 and 700\'s alone');
  }
  const lists = c.actionLists() ?? [];
  const sets = handlerSets(c);
  const roles = handlerSetRoles(c);
  // The Off key map is the `idle` entry whose enter list maps `CurrentLocation` through base slot 14,
  // section 280. The role alone is not enough: an activity composed without its menu row yet is selected
  // and bound by no row, so `handlerSetRoles` calls it `idle` too, and its enter list starts the way
  // the Off's does.
  const location = stateVariables(c).find((one) => one.label === LOCATION_STATE_NAME)?.index;
  const offs = (sets?.addresses ?? []).flatMap((address, index) => {
    if (roles[index] !== 'idle' || location === undefined) return [];
    const entries = taggedList(c, address)?.entries ?? [];
    const enter = entries.find((one) => one.tag === HANDLER_TAG_ENTER && one.opcode === ACTION_LIST_INDEX_OPCODE);
    const maps = (lists[enter?.operand ?? -1] ?? []).some((one) =>
      one.opcode === MAP_VALUE_OPCODE && (one.operand & 0xff) === location);
    return maps ? [entries] : [];
  });
  if (offs.length > 1) throw new ComposeError(`${offs.length} key maps here read as the Off key map`);
  const found = new Set<string>();
  for (const entries of offs) {
    for (const entry of entries) {
      if (entry.tag !== HANDLER_TAG_ENTER && entry.tag !== HANDLER_TAG_RESUME) continue;
      if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      const list = lists[entry.operand] ?? [];
      const at = list.findIndex((one) => writtenWith(one, 1) !== undefined);
      const start = writtenWith(list[at], 1);
      const flag = writtenWith(list[at + 1], 0);
      if (start === undefined || flag === undefined || flag === start || writtenWith(list.at(-1), 0) !== start) {
        throw new ComposeError(`the Off key map's list ${entry.operand} does not bracket itself with a start `
          + 'variable and a flag');
      }
      found.add(`${start}:${flag}`);
    }
  }
  if (found.size !== 1) {
    throw new ComposeError(found.size === 0
      ? 'no Off key map with an enter list to read the start sequence variables from'
      : `the Off key map's lists name ${found.size} different pairs of start variable and flag`);
  }
  const [startVariable, flagVariable] = ([...found][0] as string).split(':').map(Number) as [number, number];
  const [startSpec, flagSpec] = startSequenceVariables() as [StateVariableSpec, StateVariableSpec];
  assertGeneratedRecord(c, startVariable, startSpec, 'the start variable');
  assertGeneratedRecord(c, flagVariable, flagSpec, 'the flag');
  return { startVariable, flagVariable };
}

/**
 * The start sequence's shape, `[7E startup, S:=1, ..., counter:=activity, F:=1, 7F deferred, S:=0]`,
 * where the deferred list opens with the `0x3F` band `0xD0` instruction, section 290.
 *
 * `S` and `F` are `startSequenceOf`'s, from the Off key map, and **every activity is checked against
 * them** rather than supplying them, 40 activities of 40 on the thirteen compiles; one that raises
 * another variable is refused. A configuration with no activity is no longer refused here, since
 * nothing about the start sequence needs one: what does is the caller that wants an activity to copy
 * a screen or a record from, and `activityMaps` refuses that itself.
 */
export function arch14Starts(c: Container): Arch14Starts {
  const lists = c.actionLists() ?? [];
  const sets = handlerSets(c);
  const counterVariable = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  if (sets === undefined || counterVariable?.record === undefined) {
    throw new ComposeError(`no ${ACTIVITY_STATE_NAME} variable or no base slot 9 to read activities from`);
  }
  const counter = counterVariable.index;
  const { startVariable, flagVariable } = startSequenceOf(c);
  const startup = new Map<number, number>();
  const setOf = new Map<number, number>();
  const endsOn = new Map<number, number>();
  for (const binding of activityBindings(c)) {
    if (startup.has(binding.activity)) continue;
    const address = sets.addresses[binding.set];
    const entry = address === undefined ? undefined
      : taggedList(c, address)?.entries.find((one) => one.tag === HANDLER_TAG_ENTER);
    const enter = entry === undefined ? undefined : lists[entry.operand];
    const call = enter?.at(-2);
    const deferred = call?.opcode === ACTION_LIST_INDEX_OPCODE ? lists[call.operand] : undefined;
    if (enter === undefined || enter[0]?.opcode !== ENTER_MODE
        || writtenWith(enter.at(-4), binding.activity) !== counter
        || deferred?.[0]?.opcode !== DEFERRED.opcode || deferred[0].operand !== DEFERRED.operand) {
      throw new ComposeError(`activity ${binding.activity}'s enter list is not the shape every arch 14 one has`);
    }
    const start = writtenWith(enter[1], 1);
    const flag = writtenWith(enter.at(-3), 1);
    if (start !== startVariable || writtenWith(enter.at(-1), 0) !== startVariable || flag !== flagVariable) {
      throw new ComposeError(`activity ${binding.activity}'s enter list brackets itself with variables `
        + `${start} and ${flag}, where the Off key map's start sequence uses ${startVariable} and ${flagVariable}`);
    }
    startup.set(binding.activity, enter[0].operand);
    // The deferred list enters the working screen itself, `[3F D000, 7E working]`, or calls the Remote
    // Assistant's branch, `[1F FB00, 7F b]` with `b` ending `7E assistant, 7E working`, section 333.
    const branch = deferred[1]?.opcode === ACTION_LIST_INDEX_OPCODE ? lists[deferred[1].operand] ?? [] : [];
    const inner = lists[branch.find((one) => one.opcode === ACTION_LIST_INDEX_OPCODE)?.operand ?? -1] ?? [];
    const working = deferred[1]?.opcode === ENTER_MODE ? deferred[1].operand
      : inner.filter((one) => one.opcode === ENTER_MODE).at(-1)?.operand;
    if (working !== undefined) endsOn.set(binding.activity, working);
    setOf.set(binding.activity, binding.set);
  }
  return {
    counter, idle: counterVariable.record.first, startVariable, flagVariable, startup, sets: setOf, endsOn,
  };
}

/*
 * ---- The start's shape, section 290 ----
 *
 * What the shared activity composer, `composeActivityFor`, asks this family for once an activity has a
 * screen: whether the screen is one this start can run, the enter list around the activity's own writes,
 * the lists after the select list, and tag 5's own list. `shared/activities.ts` built all of it inline,
 * behind a test of a trait, `startSequence`, until `todo-compile-one.md` 3.3.3.4.
 */

/** A state write of `value` into `variable`, as a list body holds it. */
const write = (variable: number, value: number): readonly [number, number] => [value, STATE_WRITE_BASE + variable];

/**
 * The Harmony 600, 650 and 700's start, measured on the 43 activities of the thirteen compiles, sections 290
 * and 313. The enter list `[7E startup, S:=1, ..., counter:=activity, F:=1, 7F deferred, S:=0]`, the deferred
 * list `[3F D000, 7E working]` entering the working screen itself, `h600_config`'s form, and tag 5's own list
 * where a caller names none: `S := 1`, the input writes, `F := 1`, the working screen entered directly, `S := 0`.
 */
export const FOUR_SLOT_START: ActivityStart = {
  checkScreen(c: Container, screen, at): void {
    // A screen that selects the keypad map states which, and it has to be this activity's, always here.
    if (screen.set !== at.set) {
      throw new ComposeError(`the screen selects keypad map ${screen.set}, and this activity's is ${at.set}`);
    }
    for (const [what, index] of [['start', screen.startVariable], ['flag', screen.flagVariable]] as const) {
      if (index === undefined || !Number.isInteger(index) || index <= firmwareStateVariableMax(c.architecture as number)
          || index >= Math.min(at.variables, STATE_WRITE_LIMIT)) {
        throw new ComposeError(`the ${what} variable ${index} is not one an enter list can write`);
      }
    }
  },
  lists(screen, first, writes) {
    const start = screen.startVariable as number;
    // The deferred list is the first after the select list, `first + 1`.
    const deferList = first + 2;
    const enter: ListBody = [
      [screen.startupMode, ENTER_MODE], write(start, 1), ...writes,
      write(screen.flagVariable as number, 1), [deferList, ACTION_LIST_INDEX_OPCODE], write(start, 0),
    ];
    return { enter, after: [[[DEFERRED.operand, DEFERRED.opcode], [screen.workingMode, ENTER_MODE]]] };
  },
  // Tag 5, picking the running activity again, section 313. What it leaves out is the point: the start up
  // screen, which tag 1 enters first and would show again to somebody who only picked the activity a second
  // time; every power write, so nothing is switched; and the counter write, which already holds this activity.
  // The inputs stay because Logitech keeps them, written inline in the targets' own order, as tag 1 writes them.
  resume(screen, inputs) {
    const start = screen.startVariable as number;
    return [
      write(start, 1), ...inputs, write(screen.flagVariable as number, 1), [screen.workingMode, ENTER_MODE],
      write(start, 0),
    ];
  },
};

/**
 * What an activity composed onto this configuration changes in the family's wiring, `Family.activityRewiring`:
 * the first activity, or one put on an empty key, changes the shape of the wiring, scan 4's front list and the
 * empty keys' own, so the wiring is described before anything is built and rebuilt at the end, section 379.
 * Only then, so a donor whose wiring is already right for the activity is left byte for byte as it was. The
 * keys it looks at are the family's, `FOUR_SLOT_ACTIVITY_KEY_EDITOR`. `shared/activities.ts` made this choice
 * itself, by a test of the architecture, until `todo-compile-one.md` 3.3.3.4.
 */
export function fourSlotActivityRewiring(
  c: Container, activityKey: string | undefined,
): ((bytes: Uint8Array) => Uint8Array) | undefined {
  const keys = FOUR_SLOT_ACTIVITY_KEY_EDITOR.read(c);
  const none = keys.every((one) => one.kind !== 'activity');
  const onEmpty = activityKey !== undefined && keys.find((one) => one.key === activityKey)?.kind === 'placeholder';
  if (!none && !onEmpty) return undefined;
  const before = describeWiring(takeApart(c));
  return (bytes) => layOutContainer(rewiredForActivities(takeApart(parse(bytes)), before)).bytes;
}
