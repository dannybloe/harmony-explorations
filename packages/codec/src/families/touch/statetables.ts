/**
 * The touch family's state tables, the Harmony One: the facts `buildStateTables` builds base slots 0, 13 and
 * 14 from, `TOUCH_STATE_TABLES`, measured on the 19 distinct Harmony One compiles of `todo-compile-one.md` 2.2,
 * `ONE_COMPILES` in `test/statetables.test.ts`, with 6.4.
 *
 * 6.4 first held these in a per architecture table inside the shared `statetables.ts`, beside the Harmony
 * 600, 650 and 700's; they moved here when 3.3.3.3 made the builder take a family's facts, plan 007, since a
 * builder's per remote facts belong in the family and only a reader of Logitech's formats may look one up by
 * architecture.
 *
 * Where they differ from the four slot family's, `families/four-slot/statetables.ts`: records 13 and 14 are
 * `1/1, 2/4` against `0/32, 1/1`; a value map states its case count in one byte; every variable above the
 * firmware's block but the compiler's first two byte one is one byte, with maxima up to 121, so no two byte
 * maximum is measured and anything past 121 is refused; and the minute calls a list on every write, the
 * clock's screen side, which the four slot screens do not have since they show no clock.
 */
import { firmwareStateVariableMax } from '../../inventory.ts';
import { VALUE_MAP_COUNT_WIDTH } from '../../valuemap.ts';
import type { StateTableFacts } from '../../statetables.ts';

/** The architecture of the family's remote, which the readers' per architecture tables are keyed by. */
const ARCHITECTURE = 12;

/**
 * Records 7 to 17 on the Harmony One as `[first, max]`: the same on all 19 compiles, none with a transition.
 * What 8 to 11 hold was read on its image, section 138.
 */
export const TOUCH_FIRMWARE_STATE_RECORDS: readonly (readonly [number, number])[] = [
  [0, 2], [0, 3], [5, 7], [0, 7], [0, 32], [0, 1], [1, 1], [2, 4], [0, 3], [0, 1], [0, 3],
];

/** What the generic builder builds this family's state tables from. */
export const TOUCH_STATE_TABLES: StateTableFacts = {
  measuredOn: 'the 19 Harmony One compiles',
  // 0 to 17, section 284, as on the Harmony 600, 650 and 700.
  firmwareVariables: firmwareStateVariableMax(ARCHITECTURE) + 1,
  firmwareRecords: TOUCH_FIRMWARE_STATE_RECORDS,
  // The widest one byte maximum on the 19; none holds a two byte variable but the compiler's first.
  narrowMax: 121,
  wideMin: undefined,
  // One byte, read off the readers' own table.
  caseCountWidth: VALUE_MAP_COUNT_WIDTH[ARCHITECTURE] as number,
  minuteCall: true,
};
