/**
 * The four slot family's state tables, the Harmony 600, 650 and 700: the facts `buildStateTables` builds base
 * slots 0, 13 and 14 from, `FOUR_SLOT_STATE_TABLES`, and the variables only this family's compiles name, a
 * device's delay variables and the two every activity reads. Measured over the thirteen compiles section 312
 * lists, `todo-compile-650.md` 10.3; moved out of `statetables.ts` with `todo-compile-one.md` 3.3.3.3, which
 * keeps the builder, generic, and takes these as the family's.
 *
 * The Harmony One's tables differ in four values, `todo-compile-one.md` 2.3: records 13 and 14, a one byte case
 * count, where the width line falls, and a second transition on the minute. Its family states them,
 * `families/touch/statetables.ts`, since chapter 6 of that plan.
 */
import { firmwareStateVariableMax } from '../../inventory.ts';
import { VALUE_MAP_COUNT_WIDTH } from '../../valuemap.ts';
import {
  DELAY_MAX, StateTablesError, type StateTableFacts, type StateVariableSpec,
} from '../../statetables.ts';

/** The architecture of the family's remotes, which the readers' per architecture tables are keyed by. */
const ARCHITECTURE = 14;

/** How many state variables the firmware owns on the Harmony 600, 650 and 700, 0 to 17, section 284. */
export const FIRMWARE_STATE_VARIABLE_COUNT = firmwareStateVariableMax(ARCHITECTURE) + 1;

/**
 * Records 7 to 17 on the Harmony 600, 650 and 700 as `[first, max]`: the same on all thirteen compiles, none
 * with a transition, section 284. The clock, 0 to 6, is the caller's. What 8 to 11 hold was read on the
 * Harmony One, section 138, and is not claimed here.
 */
export const FIRMWARE_STATE_RECORDS: readonly (readonly [number, number])[] = [
  [0, 2], [0, 3], [5, 7], [0, 7], [0, 32], [0, 1], [0, 32], [1, 1], [0, 3], [0, 1], [0, 3],
];

/**
 * The widest maximum a one byte variable has on the thirteen, and the narrowest a two byte one has.
 * The rule between them is not pinned, so a maximum strictly between the two is refused.
 */
export const NARROW_MAX_MEASURED = 100;
export const WIDE_MAX_MEASURED = 254;

/** What the generic builder builds this family's state tables from. */
export const FOUR_SLOT_STATE_TABLES: StateTableFacts = {
  measuredOn: 'the thirteen arch 14 compiles',
  firmwareVariables: FIRMWARE_STATE_VARIABLE_COUNT,
  firmwareRecords: FIRMWARE_STATE_RECORDS,
  narrowMax: NARROW_MAX_MEASURED,
  wideMin: WIDE_MAX_MEASURED,
  // Two bytes, read off the readers' own table.
  caseCountWidth: VALUE_MAP_COUNT_WIDTH[ARCHITECTURE] as number,
  // The three rollovers and the hour's call, and nothing on the minute but its rollover on the thirteen.
  minuteCall: false,
};

/**
 * A device's eight delay variables, section 234: the power on and inter device delays, their
 * catalogue defaults, and the four counters beside them whose use is unread. Every one is named
 * `<property>_<identifier>` and none carries a transition; the table and the save lists that read
 * them are elsewhere, sections 288 and 303. Values in tenths of a second. On the thirteen all 83
 * devices hold exactly these, the counters at 0 with maxima of 5, 3 and 100, the delays with 65277
 * and the defaults with 254, which makes the four delays two byte variables and the counters one.
 */
export function deviceDelayVariables(
  identifier: number,
  delays: { powerOn: number; interDevice: number; defaultPowerOn: number; defaultInterDevice: number },
): StateVariableSpec[] {
  if (!Number.isInteger(identifier) || identifier <= 0) throw new StateTablesError(`a device identifier is a positive whole number, not ${identifier}`);
  const named = (property: string, first: number, max: number): StateVariableSpec => ({ stem: `${property}_${identifier}`, first, max });
  return [
    named('PowerOnDelayFlagCounter', 0, 5),
    named('InterDeviceDelayFlagCounter', 0, 3),
    named('PowerOnDelayFixingTriggered', 0, 100),
    named('InterDeviceDelayFixingTriggered', 0, 100),
    named('PowerOnDelay', delays.powerOn, DELAY_MAX),
    named('InterDeviceDelay', delays.interDevice, DELAY_MAX),
    named('DefaultPowerOnDelay', delays.defaultPowerOn, DEFAULT_DELAY_MAX),
    named('DefaultInterDeviceDelay', delays.defaultInterDevice, DEFAULT_DELAY_MAX),
  ];
}

/** A default delay variable's stated maximum, the companion of `DELAY_MAX`, section 301. */
const DEFAULT_DELAY_MAX = 254;

/**
 * The two variables every arch 14 compile of the thirteen names for its activities: which activity
 * is running, whose idle value is the activity count and is also its value when generated, section
 * 120; and `CurrentLocation`, one value, which the all off list's value map is keyed by, section 280.
 * Neither carries a transition.
 */
export function activityStateVariables(activities: number): StateVariableSpec[] {
  if (!Number.isInteger(activities) || activities < 0) throw new StateTablesError(`an activity count is a whole number, not ${activities}`);
  return [
    { stem: 'CurrentActivityState_0', first: activities, max: activities },
    { stem: 'CurrentLocation', first: 0, max: 0 },
  ];
}
