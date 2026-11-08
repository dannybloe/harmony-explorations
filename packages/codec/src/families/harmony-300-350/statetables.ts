/**
 * The no screen family's state tables, the Harmony 300 and 350: the facts `buildStateTables` builds base slots 0
 * and 13 from, `NO_SCREEN_STATE_TABLES`, and the allocator that numbers a setup's own variables,
 * `noScreenStateVariables`, `todo-compile-350.md` 5.1.2, step 2 of plan 011.
 *
 * **The facts, measured over the 13 compiles of this family the lab holds**, ten for a Harmony 350 and three for a
 * Harmony 300, of two generations of Logitech's compiler, `test/noscreenstatetables.test.ts`:
 *
 * * **The firmware's records 7 to 17 are the Harmony 600, 650 and 700's**, the same `first` and `max` in 13 of 13
 *   and none with a transition. They are stated here again rather than imported, since a family imports no other
 *   family, plan 007, and the two are one measurement each; the test holds them equal.
 * * **The clock carries nothing.** The seven clock records hold no transition in 13 of 13, so the minute's
 *   rollover moves nothing and the hour calls no list, `StateTableFacts.clockCarry`; a description names no hour
 *   list. What the remote does with its clock is `reference/architectures/harmony-300-350/memory.md`.
 * * **No value maps**: the family's configurations have no base slot 14, `ARCH16_SLOT_MAP`, so
 *   `caseCountWidth` is undefined and the builder builds no value map table.
 * * **One two byte variable, the compiler's first**, `FIRST_WIDE_VARIABLE`, at index `narrow` and last, in 13 of 13;
 *   every other variable above the firmware's block is one byte, with maxima up to 18, an input of 19 values. So
 *   `narrowMax` is 18 and no two byte maximum is measured: anything past 18 is refused as not established, as on
 *   the Harmony One past 121.
 *
 * **The variables a setup brings, and only these, in 13 of 13**: a power variable for every device the metadata
 * archive lists with a power command (every device with commands has one on the 13), `<name>_Power_2`, first 0, max 1, its two transitions calling the device's
 * on list going to 1 and its off list going to 0; an input variable for every device the activity puts on an
 * input, `<name>_Input_<values>`, first 0, one transition per value from any value calling that value's send list,
 * or none where every input of the device only sets the catalogue's states and the variable has one value; and the
 * activity's flag, `ActivityPowerState_2`, first 0, max 1, no transitions, where the setup has its activity in the
 * current compiler's shape. The lists are the description's: which list does what is the composers' business, and
 * their numbers are the list allocator's.
 *
 * **The indices are ours, and that is a choice, not a measurement.** Logitech's compiler numbers these variables
 * in an order no rule is known for, plan 011's 5.1.8: in the test setup's compile they run Sony HT, Knoll, Switch,
 * LG TV, the Denon's input, Plasma, Denon, Kodi, the activity's flag, KPN and the LG TV's input, which is neither
 * the setup's order nor its keys'. Nothing on the remote reads an index but the instructions that name it, so any
 * order the instructions agree with is a working configuration. **Our rule**: from 18, the firmware's block being
 * 0 to 17, every device's power variable in the setup's order, then every input variable in the same order of
 * devices, then the flag; then the compiler's first two byte variable, which the generic builder places at
 * `narrow`. It follows the order the family's composers append in, a device's power variable at `narrow` as the
 * device is composed and the activity's inputs before its flag, `composeNoScreenActivity`. **A setup composed device
 * by device onto the configuration of none comes out numbered alike**, byte for byte: the test setup built from
 * nothing, `todo-compile-350.md` 5.1.6, holds exactly the tables this builds for it, `noscreenfromnothing.test.ts`.
 * This said that was not checked until then, since nothing had been composed onto one. A comparison with Logitech's
 * compile is by role, never by number.
 *
 * **What the generator does not reproduce**: the order of the transitions inside a record. Logitech
 * stores the switch on first in 33 of the 49 power records of the 13 and the switch off first in the other 16, and
 * no rule tried fits (ascending list number fits 16 of 49, a Java 6 hash of the list numbers at 16 buckets 22);
 * three of the eight input records store theirs in neither their values' order nor their lists'. The firmware tests every
 * transition of a record against a write and runs every one that matches, `reference/config-format/state.md`, and
 * at most one of these matches any write, since no two of a record's transitions go to the same value: so the
 * order changes nothing on the remote. Ours is the switch on first, as `composeDeviceFor` writes it, and an
 * input's values ascending, as `composeNoScreenActivity` does.
 */
import { FROM_ANY } from '../../compose/inputs.ts';
import { firmwareStateVariableMax, INPUT_PROPERTY, POWER_PROPERTY } from '../../inventory/inventory.ts';
import { ACTION_LIST_INDEX_OPCODE } from '../../container/sections.ts';
import { nameOfLabel } from '../../shared/core.ts';
import {
  type BuiltStateTables, buildStateTables, clockSpec, type StateTableFacts, StateTablesError, type StateTablesSpec,
  type StateTransitionSpec, type StateVariableSpec,
} from '../../assembly/statetables.ts';
import { ACTIVITY_FLAG } from './activity.ts';

/** The architecture of the family's remotes, which the readers' per architecture tables are keyed by. */
const ARCHITECTURE = 16;

/**
 * Records 7 to 17 on the Harmony 300 and 350 as `[first, max]`: the same on all 13 compiles, none with a
 * transition, and the Harmony 600, 650 and 700's values. What the firmware does with 11, 13, 16 and 17 is read,
 * `reference/architectures/harmony-300-350/memory.md`; the rest are unread.
 */
export const NO_SCREEN_FIRMWARE_STATE_RECORDS: readonly (readonly [number, number])[] = [
  [0, 2], [0, 3], [5, 7], [0, 7], [0, 32], [0, 1], [0, 32], [1, 1], [0, 3], [0, 1], [0, 3],
];

/** The widest one byte maximum on the 13, an input of 19 values; none holds a two byte variable but the compiler's first. */
export const NO_SCREEN_NARROW_MAX = 18;

/** What the generic builder builds this family's state tables from. */
export const NO_SCREEN_STATE_TABLES: StateTableFacts = {
  measuredOn: 'the 13 Harmony 300 and 350 compiles',
  // 0 to 17, as on the Harmony 600, 650 and 700 and the Harmony One.
  firmwareVariables: firmwareStateVariableMax(ARCHITECTURE) + 1,
  firmwareRecords: NO_SCREEN_FIRMWARE_STATE_RECORDS,
  narrowMax: NO_SCREEN_NARROW_MAX,
  wideMin: undefined,
  // No base slot 14 on this family, so no value maps and no case count.
  caseCountWidth: undefined,
  // No clock record holds a transition on the 13.
  clockCarry: false,
  minuteCall: false,
};

/**
 * The highest index an action list can write: the write band names its variable in seven bits, `STATE_WRITE_BASE`,
 * and the activity writes the flag and every input variable, so the allocator refuses past it.
 */
const WRITABLE_MAX = 127;

/** One device of the setup, as its state variables need it. */
export interface NoScreenStateDevice {
  /** The setup's name, which the variables are named after, a space as an underscore, `nameOfLabel`. */
  readonly name: string;
  /**
   * The lists its power variable runs: `on` going to 1 and `off` going to 0. Absent for a device with no power
   * command, which has no power variable, the Chromecast of two bench compiles.
   */
  readonly power?: { readonly on: number; readonly off: number };
  /**
   * Where the activity puts the device on an input: how many values the catalogue gives its input, and per value
   * the list that sends it; no `sends` where every input only sets the catalogue's states, which is a variable of
   * one value and no transitions.
   */
  readonly input?: { readonly values: number; readonly sends?: readonly number[] };
}

/** A setup, as its state variables need it. */
export interface NoScreenStateRequest {
  /** The devices, in the setup's order, which is the order their variables are numbered in. */
  readonly devices: readonly NoScreenStateDevice[];
  /** Whether the setup has its activity, Watch TV, which keeps its flag. */
  readonly activity: boolean;
}

/** What one of the setup's variables is, which is how it is compared with Logitech's compile. */
export type NoScreenVariableRole =
  | { readonly kind: 'power'; readonly device: string }
  | { readonly kind: 'input'; readonly device: string }
  | { readonly kind: 'flag' };

/** The setup's variables in our order, each with its role. */
export interface NoScreenStateVariables {
  readonly roles: readonly NoScreenVariableRole[];
  readonly variables: readonly StateVariableSpec[];
}

/** A list call, which is what every transition of the setup's variables runs. */
const call = (from: number, to: number, list: number): StateTransitionSpec => ({ from, to, operand: list, opcode: ACTION_LIST_INDEX_OPCODE });

/** A stem as the name tree spells it: the variable's name less its value count. */
const FLAG_STEM = ACTIVITY_FLAG.slice(0, ACTIVITY_FLAG.lastIndexOf('_'));

/**
 * The setup's variables in our order, the module comment's rule: every power variable in the setup's order, then
 * every input variable, then the flag. Refuses a device named twice, an input without the activity, an input whose
 * lists do not match its values, and more variables than an instruction can write.
 */
export function noScreenStateVariables(request: NoScreenStateRequest): NoScreenStateVariables {
  const seen = new Set<string>();
  for (const one of request.devices) {
    const stem = nameOfLabel(one.name);
    if (seen.has(stem)) throw new StateTablesError(`the setup names ${one.name} twice`);
    seen.add(stem);
  }
  const roles: NoScreenVariableRole[] = [];
  const variables: StateVariableSpec[] = [];
  for (const one of request.devices) {
    if (one.power === undefined) continue;
    roles.push({ kind: 'power', device: one.name });
    variables.push({
      stem: `${nameOfLabel(one.name)}_${POWER_PROPERTY}`, first: 0, max: 1,
      transitions: [call(0, 1, one.power.on), call(1, 0, one.power.off)],
    });
  }
  for (const one of request.devices) {
    if (one.input === undefined) continue;
    if (!request.activity) throw new StateTablesError(`${one.name} is put on an input, and an input is the activity's, which the setup does not have`);
    const { values, sends } = one.input;
    if (!Number.isInteger(values) || values < 1) throw new StateTablesError(`${one.name}'s input has ${values} values`);
    if (sends === undefined ? values !== 1 : sends.length !== values) {
      throw new StateTablesError(sends === undefined
        ? `${one.name}'s input sends nothing, which is one value, not ${values}`
        : `${one.name}'s input has ${values} values and ${sends.length} send lists`);
    }
    roles.push({ kind: 'input', device: one.name });
    variables.push({
      stem: `${nameOfLabel(one.name)}_${INPUT_PROPERTY}`, first: 0, max: values - 1,
      transitions: (sends ?? []).map((list, value) => call(FROM_ANY, value, list)),
    });
  }
  if (request.activity) {
    roles.push({ kind: 'flag' });
    variables.push({ stem: FLAG_STEM, first: 0, max: 1, transitions: [] });
  }
  const highest = NO_SCREEN_STATE_TABLES.firmwareVariables + variables.length - 1;
  if (highest > WRITABLE_MAX) throw new StateTablesError(`variable ${highest} is past ${WRITABLE_MAX}, the highest a list can write`);
  return { roles, variables };
}

/** A setup's state tables, built, with each role's index. */
export interface NoScreenStateTables {
  readonly spec: StateTablesSpec;
  readonly built: BuiltStateTables;
  readonly roles: readonly NoScreenVariableRole[];
  /** Each role's index, in the order of `roles`, which is what the composers' lists name. */
  readonly indices: readonly number[];
}

/**
 * Base slots 0 and 13 for a setup built from nothing: the clock stamped with `builtAt`, `clockSpec`, the firmware's
 * records, the setup's variables numbered by our rule, and the compiler's first two byte variable, by the family's
 * facts. The pieces are `layOutContainer`'s to place.
 */
export function buildNoScreenStateTables(request: NoScreenStateRequest, builtAt: string): NoScreenStateTables {
  const { roles, variables } = noScreenStateVariables(request);
  const spec: StateTablesSpec = { clock: clockSpec(builtAt), variables, valueMaps: [] };
  const built = buildStateTables(spec, NO_SCREEN_STATE_TABLES);
  return { spec, built, roles, indices: built.indexOf };
}
