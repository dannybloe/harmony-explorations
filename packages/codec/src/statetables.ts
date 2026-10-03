/**
 * The state variables built from a description: base slot 13's table and records, base slot 14's
 * value maps and base slot 0's name tree, `todo-compile-650.md` 10.3.
 *
 * Section 318's frame lays a container out from pieces, and until this module the pieces of these
 * three slots could only come out of a Logitech compile. Here they are built: a caller describes the
 * configuration's own variables and value maps, and everything the format or the firmware decides is
 * generated rather than carried. Arch 14 (Harmony 600, 650 and 700) only, because that is where the
 * constants below were measured, over the thirteen compiles section 312 lists.
 *
 * **What is generated**, each measured on the thirteen and each a place a carried copy could have
 * hidden a stale byte:
 *
 * * **The firmware's block, variables 0 to 17**, section 284. Records 7 to 17 are constants on arch
 *   14 and are written from `FIRMWARE_STATE_RECORDS` below. Records 0 to 6 are the clock, section
 *   130: their values and maxima are the caller's, since stamping them is `edit.ts`'s rule and two
 *   copies of that rule would be two copies until one moved, and their **transitions** are generated:
 *   the minute, the day and the month increment the hour, the month and the year respectively when
 *   they roll over to 0, and the hour calls a list, which increments the day and the weekday and
 *   whose index is the caller's because the list is base slot 10's.
 * * **The variable the compiler emits after that block**, an unnamed two byte variable holding 0
 *   with a maximum of 65277 and no transitions, which takes index `narrow`, the first two byte index,
 *   and sits straight after record 17 in the file on all thirteen. What it is for is unread.
 * * **Every variable's width**, from its maximum: on the thirteen, every one byte variable above the
 *   firmware's block has a maximum of at most 100 and every two byte one at least 254, so the width
 *   is generated and `narrow`, `wide`, `count` and the repeated `narrow` follow from it, section 276.
 *   **Where between 100 and 254 the line falls is not pinned**, and a maximum in that gap is refused.
 * * **The name of a named variable**, which is its stem plus `_` plus the number of values, its
 *   maximum plus one, section 86; and the two level 0 nodes, `Root` and `State`, which open every
 *   name tree of the thirteen in that order.
 * * **The order of the name tree's level 1 nodes**: the bucket order of a Java 6 hash map keyed by
 *   the variable's index, the rule section 315 found for the key list after the end marker, with the
 *   capacity grown from 16 at three quarters full. **The capacity is pinned here and was not
 *   there**: the two Harmony 600 compiles, 32 and 41 named variables, fit 64 buckets and fail at 128;
 *   the eleven others, 51 to 90, fit 128 and fail at 64. A tie in a bucket is refused, since its
 *   order is the insertion order of a compiler nobody here has read, and none of the thirteen has one.
 * * **A value map's case order**, `compilerCaseOrder`, section 319, and its leading byte, 2 on every
 *   record; arch 14 states its case count in two bytes.
 *
 * **What is carried**, the description: which variables the configuration has, in the order their
 * indices run within each width; each one's stem if it is named, its value when the configuration is
 * generated, its maximum and its transitions in stored order; and the value maps in table order, each
 * a set of cases naming a piece of the container. The transitions are the composers' business, a
 * device's power and inputs among them, sections 288 and 321, and so is the order of the variables,
 * which is no hash order of their names: the thirteen were scored against Java's string hash of five
 * spellings of the name at six capacities and none fits better than chance.
 *
 * `describeStateTables` reads a description back off a laid out container, so that what is generated
 * can be checked against Logitech's own: `test/statetables.test.ts` rebuilds all thirteen byte for
 * byte, every byte the generator owns overwritten first.
 *
 * Read only towards hardware, like everything in this package. The result is pieces in memory.
 */
import { Writer } from './emit.ts';
import { CLOCK_FIELD_COUNT, FRAME_COOKIE, FRAME_END } from './gspm.ts';
import { u16, u24, u8 } from './bytes.ts';
import type { ContainerLayout, ContainerPiece, PieceRef } from './frame.ts';
import { compilerCaseOrder } from './inventory.ts';
import { keyListCapacity, keyListHash } from './modezero.ts';
import {
  FRAME_HEADER,
  NAME_LEVEL_STATE_VARIABLE,
  NAME_NODE_FIELDS,
  NAME_NODE_HEADER,
  NAME_NODE_TAG,
  STATE_RECORD_HEADER,
  STATE_TABLE_HEADER,
  STATE_TABLE_SLOT,
  STATE_VALUE_LENGTH,
} from './sections.ts';
import { VALUE_MAP_KEY_WIDTH, VALUE_MAP_RANGE_BYTES, VALUE_MAP_SLOT } from './valuemap.ts';

/** A refusal, named so a caller can tell a bad description from a bug. */
export class StateTablesError extends Error {}

/** Base slot 0, the name tree. */
export const NAME_TREE_SLOT = 0;

/** How many state variables the firmware owns on arch 14, 0 to 17, section 284. */
export const FIRMWARE_STATE_VARIABLE_COUNT = 18;

/**
 * Records 7 to 17 on arch 14 as `[first, max]`: the same on all thirteen compiles, none with a
 * transition, section 284. The clock, 0 to 6, is the caller's. What 8 to 11 hold was read on arch 12
 * (Harmony One), section 138, and is not claimed here.
 */
export const FIRMWARE_STATE_RECORDS: readonly (readonly [number, number])[] = [
  [0, 2], [0, 3], [5, 7], [0, 7], [0, 32], [0, 1], [0, 32], [1, 1], [0, 3], [0, 1], [0, 3],
];

/**
 * The variable the compiler emits straight after the firmware's block: index `narrow`, the first two
 * byte index, holding 0 with a maximum of 65277 and no transitions, unnamed, on all thirteen.
 */
export const FIRST_WIDE_VARIABLE = { first: 0, max: 65277 } as const;

/**
 * The widest maximum a one byte variable has on the thirteen, and the narrowest a two byte one has.
 * The rule between them is not pinned, so a maximum strictly between the two is refused.
 */
export const NARROW_MAX_MEASURED = 100;
export const WIDE_MAX_MEASURED = 254;

/** `0x1F` sub opcode `0xF2` increments the state variable its operand's low byte names, section 73. */
const STATE_BAND = 0x1f;
const INCREMENT = 0xf2;
/** `0x7F` calls the action list its operand names, section 238. */
const CALL = 0x7f;
/** The sentinel a transition's `from` holds when it fires on reaching `to` from any value. */
const FROM_ANY = -2;

/** The clock's indices, section 130. */
const CLOCK_MINUTE = 1;
const CLOCK_HOUR = 2;
const CLOCK_DAY = 3;
const CLOCK_MONTH = 5;
const CLOCK_YEAR = 6;

/** The leading byte of every value map record on the thirteen, which the firmware steps over. */
export const VALUE_MAP_LEAD = 2;
/** Arch 14 states a value map's case count in two bytes, `VALUE_MAP_COUNT_WIDTH`. */
const VALUE_MAP_CASE_COUNT_WIDTH = 2;

/** The two level 0 nodes every name tree of the thirteen opens with, in this order. */
export const NAME_TREE_ROOTS: readonly string[] = ['Root', 'State'];

/** A transition of a state record: from one value to another, and the one instruction it runs. */
export interface StateTransitionSpec {
  /** The value moved away from, or a negative sentinel, `-2` or `-3`. */
  from: number;
  to: number;
  operand: number;
  opcode: number;
}

/** One of the configuration's own variables. */
export interface StateVariableSpec {
  /** Base slot 0's name less its value count, `TV_Power` for `TV_Power_2`; absent when unnamed. */
  stem?: string;
  /** The value it holds when the configuration is generated, section 130. */
  first: number;
  /** The highest value it takes, which decides its width. */
  max: number;
  transitions?: readonly StateTransitionSpec[];
}

/** Where a value map case points: a piece of the container and an offset into it. */
export interface PieceTarget {
  to: ContainerPiece;
  offset: number;
}

export interface ValueMapSpec {
  /** The cases by value; their stored order is generated. */
  cases: readonly { value: number; target: PieceTarget }[];
  /** Inclusive ranges, tried when no case matched, in stored order. None on the thirteen. */
  ranges?: readonly { low: number; high: number; target: PieceTarget }[];
}

export interface StateTablesSpec {
  /** Records 0 to 6, `first` and `max`: second, minute, hour, day, weekday, month, year. */
  clock: readonly { first: number; max: number }[];
  /** The base slot 10 list the hour calls when it rolls over, which increments the day and weekday. */
  hourList: number;
  /**
   * The configuration's own variables. Their indices run in this order within each width, the one
   * byte variables first: a variable's width is generated from its maximum.
   */
  variables: readonly StateVariableSpec[];
  valueMaps: readonly ValueMapSpec[];
}

export interface BuiltStateTables {
  nameTree: ContainerPiece;
  stateTable: ContainerPiece;
  /** One record per variable, by index. */
  records: ContainerPiece[];
  valueMapTable: ContainerPiece;
  /** One record per value map, by the index `0x72`'s high byte names. */
  valueMaps: ContainerPiece[];
  /** The index each of the description's variables was given, in the description's order. */
  indexOf: number[];
  narrow: number;
  wide: number;
}

/** Whether a maximum makes a two byte variable; refuses the unpinned gap. */
export function isWideVariable(max: number): boolean {
  if (max <= NARROW_MAX_MEASURED) return false;
  if (max >= WIDE_MAX_MEASURED) return true;
  throw new StateTablesError(
    `a maximum of ${max} falls between ${NARROW_MAX_MEASURED}, the widest one byte variable on the thirteen `
    + `arch 14 compiles, and ${WIDE_MAX_MEASURED}, the narrowest two byte one, so its width is not established`);
}

/** The name base slot 0 gives a variable: its stem and its number of values, section 86. */
export function stateVariableName(stem: string, max: number): string {
  return `${stem}_${max + 1}`;
}

/**
 * The order the name tree stores its level 1 nodes in: ascending bucket of the variable's index in a
 * hash table sized for the node count, the rule `keyListCapacity` and `keyListHash` state for the
 * key list after the end marker. Refuses a tie.
 */
export function nameTreeOrder(indices: readonly number[]): number[] {
  const capacity = keyListCapacity(indices.length);
  const bucketOf = (index: number): number => keyListHash(index) & (capacity - 1);
  const seen = new Map<number, number>();
  for (const index of indices) {
    // The hash spells out the two terms that can be nonzero below 4096; the table's count is a `u16`
    // but nothing above 255 can be named by an instruction, so the guard is the instruction's limit.
    if (!Number.isInteger(index) || index < 0 || index > 0xff) {
      throw new StateTablesError(`a state variable index is 0 to 255, not ${index}`);
    }
    const other = seen.get(bucketOf(index));
    if (other !== undefined) {
      throw new StateTablesError(
        `variables ${other} and ${index} share bucket ${bucketOf(index)} of ${capacity}, and their order there `
        + 'is the insertion order of a compiler nobody here has read');
    }
    seen.set(bucketOf(index), index);
  }
  return [...indices].sort((a, b) => bucketOf(a) - bucketOf(b));
}

/** A name, as the frame stores it: one byte a character, printable ASCII. */
function checkName(name: string): void {
  for (let i = 0; i < name.length; i += 1) {
    const code = name.charCodeAt(i);
    if (code < 0x20 || code > 0x7e) throw new StateTablesError(`a name is printable ASCII, and ${JSON.stringify(name)} is not`);
  }
}

/** One name node: tag, `4 + length`, level, index, the name. */
function nameNode(level: number, index: number, name: string): Uint8Array {
  checkName(name);
  return new Writer(NAME_NODE_HEADER + name.length)
    .u8(NAME_NODE_TAG).u16(NAME_NODE_FIELDS + name.length).u16(level).u16(index).ascii(name).bytes;
}

/**
 * Base slot 0 for these named variables: `0xFEED`, the length, the nodes, `0xBEEF`.
 *
 * The length is read as three bytes by both codecs, which is client sourced and unconfirmed, and no
 * tree here reaches the 65536 bytes that would separate it from two; so the frame refuses a tree
 * that would, rather than choose.
 */
export function buildNameTree(named: readonly { index: number; name: string }[]): Uint8Array {
  const byIndex = new Map<number, string>();
  for (const one of named) {
    if (byIndex.has(one.index)) throw new StateTablesError(`variable ${one.index} is named twice`);
    byIndex.set(one.index, one.name);
  }
  const nodes = [
    ...NAME_TREE_ROOTS.map((name, index) => nameNode(0, index, name)),
    ...nameTreeOrder([...byIndex.keys()]).map((index) => nameNode(NAME_LEVEL_STATE_VARIABLE, index, byIndex.get(index)!)),
  ];
  const body = nodes.reduce((sum, node) => sum + node.length, 0);
  const length = FRAME_HEADER + body;
  if (length > 0xffff) throw new StateTablesError(`a name tree of ${length} bytes is past what any sample here states`);
  const out = new Writer(length + FRAME_END.length).raw(FRAME_COOKIE).u24(length);
  for (const node of nodes) out.raw(node);
  return out.raw(FRAME_END).bytes;
}

/** A state record: `first`, `max`, the transition count, a zero, the transitions. */
export function buildStateRecord(first: number, max: number, transitions: readonly StateTransitionSpec[] = []): Uint8Array {
  for (const [what, value] of [['first', first], ['max', max]] as const) {
    if (!Number.isInteger(value) || value < 0 || value > 0xffff) throw new StateTablesError(`a record's ${what} is a u16, not ${value}`);
  }
  // Not refused when `first` exceeds `max`: Logitech's compiler writes one such record on the
  // thirteen, a default power on delay of 65535 under a maximum of 254 in `h650_power_hold_compile_2`,
  // so a refusal would reject their own output. Keeping the clock inside its range is `edit.ts`'s rail.
  const out = new Writer(STATE_RECORD_HEADER + STATE_VALUE_LENGTH * transitions.length)
    .u16(first).u16(max).u16(transitions.length).u8(0);
  for (const t of transitions) {
    for (const end of [t.from, t.to]) {
      if (!Number.isInteger(end) || end < -0x8000 || end > 0x7fff) throw new StateTablesError(`a transition's end is an i16, not ${end}`);
    }
    // The transition's own leading byte is zero in 569 of 569 and is not an enable bit, section 277.
    out.u8(0).u16(t.from & 0xffff).u16(t.to & 0xffff).u16(t.operand).u8(t.opcode);
  }
  return out.bytes;
}

/** The clock's transitions, section 130: the three rollovers that increment, and the hour's call. */
export function clockTransitions(index: number, hourList: number): StateTransitionSpec[] {
  const increment = (variable: number): StateTransitionSpec[] =>
    [{ from: FROM_ANY, to: 0, operand: (INCREMENT << 8) | variable, opcode: STATE_BAND }];
  switch (index) {
    case CLOCK_MINUTE: return increment(CLOCK_HOUR);
    case CLOCK_HOUR: return [{ from: FROM_ANY, to: 0, operand: hourList, opcode: CALL }];
    case CLOCK_DAY: return increment(CLOCK_MONTH);
    case CLOCK_MONTH: return increment(CLOCK_YEAR);
    default: return [];
  }
}

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

/** A delay variable's stated maximum, which bounds nothing, section 301, and its default's. */
const DELAY_MAX = 65277;
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

const piece = (bytes: Uint8Array, owner: string, refs: PieceRef[] = []): ContainerPiece => ({ bytes, refs, owner });

/**
 * Build base slots 0, 13 and 14 from a description, as pieces `layOutContainer` places.
 *
 * Refuses a clock that is not seven records, a variable whose width is not established, a field
 * wider than its bytes, a name tree tie, a value map case key set `compilerCaseOrder` does
 * not pin, and more variables or value maps than an instruction can name.
 */
export function buildStateTables(spec: StateTablesSpec): BuiltStateTables {
  if (spec.clock.length !== CLOCK_FIELD_COUNT) {
    throw new StateTablesError(`the clock is ${CLOCK_FIELD_COUNT} records, not ${spec.clock.length}`);
  }
  // Indices: the firmware's block, the one byte variables, the compiler's first two byte variable,
  // then the other two byte ones. A stable partition, so the description's order is kept per width.
  const narrowSpecs: number[] = [];
  const wideSpecs: number[] = [];
  spec.variables.forEach((v, k) => (isWideVariable(v.max) ? wideSpecs : narrowSpecs).push(k));
  const narrow = FIRMWARE_STATE_VARIABLE_COUNT + narrowSpecs.length;
  const wide = 1 + wideSpecs.length;
  const count = narrow + wide;
  // `0x72` names a variable in a byte, and the write band `0x80 | n` reaches 127; a table past 256
  // holds variables nothing can name.
  if (count > 0x100) throw new StateTablesError(`${count} state variables is more than a byte can name`);
  const indexOf: number[] = new Array(spec.variables.length);
  narrowSpecs.forEach((k, i) => { indexOf[k] = FIRMWARE_STATE_VARIABLE_COUNT + i; });
  wideSpecs.forEach((k, i) => { indexOf[k] = narrow + 1 + i; });

  const recordBytes: Uint8Array[] = new Array(count);
  spec.clock.forEach((field, index) => {
    recordBytes[index] = buildStateRecord(field.first, field.max, clockTransitions(index, spec.hourList));
  });
  FIRMWARE_STATE_RECORDS.forEach(([first, max], i) => {
    recordBytes[CLOCK_FIELD_COUNT + i] = buildStateRecord(first, max);
  });
  recordBytes[narrow] = buildStateRecord(FIRST_WIDE_VARIABLE.first, FIRST_WIDE_VARIABLE.max);
  spec.variables.forEach((v, k) => { recordBytes[indexOf[k]!] = buildStateRecord(v.first, v.max, v.transitions); });
  const records = recordBytes.map((bytes) => piece(bytes, 'slot-13-record'));

  // The table: count, narrow, wide, narrow again, and a pointer per record, section 276.
  const table = new Writer(STATE_TABLE_HEADER + 3 * count).u16(count).u16(narrow).u16(wide).u16(narrow);
  const tableRefs: PieceRef[] = records.map((to, index) => ({ at: STATE_TABLE_HEADER + 3 * index, to, offset: 0 }));
  for (let index = 0; index < count; index += 1) table.u24(0);

  const named: { index: number; name: string }[] = [];
  spec.variables.forEach((v, k) => {
    if (v.stem !== undefined) named.push({ index: indexOf[k]!, name: stateVariableName(v.stem, v.max) });
  });

  if (spec.valueMaps.length > 0xff) throw new StateTablesError(`${spec.valueMaps.length} value maps is more than its one byte count holds`);
  const valueMaps = spec.valueMaps.map(buildValueMap);
  const mapTable = new Writer(1 + 3 * valueMaps.length).u8(valueMaps.length);
  for (let k = 0; k < valueMaps.length; k += 1) mapTable.u24(0);
  const mapRefs: PieceRef[] = valueMaps.map((to, k) => ({ at: 1 + 3 * k, to, offset: 0 }));

  return {
    nameTree: piece(buildNameTree(named), 'slot-0-tree'),
    stateTable: piece(table.bytes, 'slot-13-table', tableRefs),
    records,
    valueMapTable: piece(mapTable.bytes, 'slot-14-table', mapRefs),
    valueMaps,
    indexOf,
    narrow,
    wide,
  };
}

/** One value map record: the lead, the case count, the cases in the compiler's order, the ranges. */
export function buildValueMap(map: ValueMapSpec): ContainerPiece {
  const ranges = map.ranges ?? [];
  if (ranges.length > 0xff) throw new StateTablesError(`${ranges.length} ranges is more than a one byte count holds`);
  const byValue = new Map<number, PieceTarget>();
  for (const one of map.cases) {
    if (!Number.isInteger(one.value) || one.value < 0 || one.value > 0xffff) {
      throw new StateTablesError(`a case key is a u16, not ${one.value}`);
    }
    if (byValue.has(one.value)) throw new StateTablesError(`a value map cannot hold the case ${one.value} twice`);
    byValue.set(one.value, one.target);
  }
  let order: number[];
  try {
    order = compilerCaseOrder([...byValue.keys()]);
  } catch (error) {
    if (error instanceof RangeError) throw new StateTablesError(error.message);
    throw error;
  }
  const stride = VALUE_MAP_KEY_WIDTH + 3;
  const casesAt = 1 + VALUE_MAP_CASE_COUNT_WIDTH;
  const length = casesAt + stride * order.length + 1 + VALUE_MAP_RANGE_BYTES * ranges.length;
  const out = new Writer(length).u8(VALUE_MAP_LEAD).u16(order.length);
  const refs: PieceRef[] = [];
  order.forEach((value, k) => {
    out.u16(value).u24(0);
    const target = byValue.get(value)!;
    refs.push({ at: casesAt + stride * k + VALUE_MAP_KEY_WIDTH, to: target.to, offset: target.offset });
  });
  out.u8(ranges.length);
  const rangesAt = casesAt + stride * order.length + 1;
  ranges.forEach((range, k) => {
    if (range.low > range.high) throw new StateTablesError(`a range from ${range.low} to ${range.high} is empty`);
    out.u16(range.low).u16(range.high).u24(0);
    refs.push({ at: rangesAt + VALUE_MAP_RANGE_BYTES * k + 4, to: range.target.to, offset: range.target.offset });
  });
  return piece(out.bytes, 'slot-14-record', refs);
}

/** The one piece a slot's table is, or a refusal. */
function tablePiece(layout: ContainerLayout, slot: number): ContainerPiece {
  const head = layout.sections[slot]?.head;
  if (head === undefined || head.length !== 1) throw new StateTablesError(`base slot ${slot}'s table is not one piece`);
  return head[0]!;
}

/** A piece's references in the order of the fields they fill. */
function refsByPosition(p: ContainerPiece): PieceRef[] {
  return [...p.refs].sort((a, b) => a.at - b.at);
}

/** The piece and offset a reference names, refusing an absolute address. */
function targetOf(ref: PieceRef | undefined): PieceTarget {
  if (ref === undefined || !('to' in ref)) throw new StateTablesError('a value map case names no piece of the container');
  return { to: ref.to, offset: ref.offset };
}

/**
 * Read a description back off a laid out arch 14 container, `takeApart`'s result.
 *
 * Reads only what the description carries: the clock's seven values and maxima, the hour's list,
 * and every variable from 18 upward but the first two byte one, with its stem, value, maximum and
 * transitions; and every value map's cases by value. Of the header it reads `count` and the first
 * `narrow`, to find the records and to know which index is the first two byte one. Nothing else the
 * generator writes is read, the firmware's records 7 to 17, the first two byte variable, the
 * header's `wide` and repeated `narrow`, the names' value counts, the node order and the case order
 * among them, so a rebuild that matches the container computed every one of them.
 */
export function describeStateTables(layout: ContainerLayout): StateTablesSpec {
  const table = tablePiece(layout, STATE_TABLE_SLOT);
  const count = u16(table.bytes, 0);
  const narrow = u16(table.bytes, 2);
  const recordRefs = refsByPosition(table);
  if (recordRefs.length !== count) throw new StateTablesError(`base slot 13 states ${count} variables and points at ${recordRefs.length}`);
  const recordOf = (index: number): { first: number; max: number; transitions: StateTransitionSpec[] } => {
    const ref = recordRefs[index]!;
    if (!('to' in ref) || ref.offset !== 0) throw new StateTablesError(`state record ${index} is not a piece of its own`);
    const b = ref.to.bytes;
    const transitions: StateTransitionSpec[] = [];
    for (let k = 0; k < u16(b, 4); k += 1) {
      const at = STATE_RECORD_HEADER + STATE_VALUE_LENGTH * k;
      transitions.push({
        from: (u16(b, at + 1) << 16) >> 16, to: (u16(b, at + 3) << 16) >> 16, operand: u16(b, at + 5), opcode: u8(b, at + 7),
      });
    }
    return { first: u16(b, 0), max: u16(b, 2), transitions };
  };
  if (count <= narrow || narrow < FIRMWARE_STATE_VARIABLE_COUNT) {
    throw new StateTablesError(`base slot 13 splits ${count} variables at ${narrow}, which leaves no room for the firmware's block`);
  }

  const clock = Array.from({ length: CLOCK_FIELD_COUNT }, (_, index) => {
    const { first, max } = recordOf(index);
    return { first, max };
  });
  const hour = recordOf(CLOCK_HOUR).transitions;
  if (hour.length !== 1 || hour[0]!.opcode !== CALL) throw new StateTablesError('record 2 is not the clock\'s hour, which calls one list');

  // Names from level 1, read as stems: whatever follows the last underscore is the generator's.
  const names = new Map<number, string>();
  const tree = tablePiece(layout, 0).bytes;
  for (let at = FRAME_HEADER; at < tree.length - FRAME_END.length;) {
    const stated = u16(tree, at + 1);
    const level = u16(tree, at + 3);
    const index = u16(tree, at + 5);
    let name = '';
    for (let i = at + NAME_NODE_HEADER; i < at + 3 + stated; i += 1) name += String.fromCharCode(tree[i]!);
    if (level === NAME_LEVEL_STATE_VARIABLE) names.set(index, name);
    at += 3 + stated;
  }
  const variables: StateVariableSpec[] = [];
  for (let index = FIRMWARE_STATE_VARIABLE_COUNT; index < count; index += 1) {
    if (index === narrow) continue;
    const { first, max, transitions } = recordOf(index);
    const name = names.get(index);
    const variable: StateVariableSpec = { first, max, transitions };
    if (name !== undefined) {
      const cut = name.lastIndexOf('_');
      if (cut < 0) throw new StateTablesError(`the name ${JSON.stringify(name)} has no value count`);
      variable.stem = name.slice(0, cut);
    }
    variables.push(variable);
  }

  const maps = refsByPosition(tablePiece(layout, VALUE_MAP_SLOT));
  const valueMaps: ValueMapSpec[] = maps.map((ref, k) => {
    if (!('to' in ref) || ref.offset !== 0) throw new StateTablesError(`value map ${k} is not a piece of its own`);
    const b = ref.to.bytes;
    const fields = refsByPosition(ref.to);
    const fieldAt = (at: number): PieceRef | undefined => fields.find((one) => one.at === at);
    const stride = VALUE_MAP_KEY_WIDTH + 3;
    const casesAt = 1 + VALUE_MAP_CASE_COUNT_WIDTH;
    const n = u16(b, 1);
    const cases = Array.from({ length: n }, (_, i) => ({
      value: u16(b, casesAt + stride * i),
      target: targetOf(fieldAt(casesAt + stride * i + VALUE_MAP_KEY_WIDTH)),
    }));
    const rangesAt = casesAt + stride * n + 1;
    const ranges = Array.from({ length: u8(b, rangesAt - 1) }, (_, i) => ({
      low: u16(b, rangesAt + VALUE_MAP_RANGE_BYTES * i),
      high: u16(b, rangesAt + VALUE_MAP_RANGE_BYTES * i + 2),
      target: targetOf(fieldAt(rangesAt + VALUE_MAP_RANGE_BYTES * i + 4)),
    }));
    return ranges.length > 0 ? { cases, ranges } : { cases };
  });

  return { clock, hourList: hour[0]!.operand, variables, valueMaps };
}

/**
 * A layout with its state tables swapped for built ones.
 *
 * Each record built takes the place of the record of the same index in the body, or of the same
 * value map, which keeps the caller's emission order: where a record sits is the frame's carried
 * order, section 318, and not this module's. A built record with no counterpart goes at the end of
 * the body; a counterpart with no built record is dropped. A piece other than the tables
 * that names a replaced piece is refused.
 */
export function withStateTables(layout: ContainerLayout, built: BuiltStateTables): ContainerLayout {
  const replace = new Map<ContainerPiece, ContainerPiece | undefined>();
  const swap = (slot: number, table: ContainerPiece, records: ContainerPiece[]): ContainerPiece[] => {
    const old = tablePiece(layout, slot);
    replace.set(old, table);
    const oldRecords = refsByPosition(old).map((ref) => ('to' in ref ? ref.to : undefined));
    oldRecords.forEach((p, k) => { if (p !== undefined) replace.set(p, records[k]); });
    return records.slice(oldRecords.length);
  };
  const surplus13 = swap(STATE_TABLE_SLOT, built.stateTable, built.records);
  const surplus14 = swap(VALUE_MAP_SLOT, built.valueMapTable, built.valueMaps);
  replace.set(tablePiece(layout, NAME_TREE_SLOT), built.nameTree);

  // Rewrite a run of pieces in place; a built record with no counterpart goes at the end of the body.
  const rewrite = (run: ContainerPiece[]): ContainerPiece[] => run.flatMap((p) => {
    if (!replace.has(p)) return [p];
    const now = replace.get(p);
    return now === undefined ? [] : [now];
  });
  const sections = layout.sections.map((s) => (s === undefined ? s : { before: rewrite(s.before), head: rewrite(s.head) }));
  const body = [...rewrite(layout.body), ...surplus13, ...surplus14];
  const pictures = rewrite(layout.pictures);

  // Nothing but its own table names a state record or a value map on the thirteen, and nothing names
  // a table, so a piece that does would be left naming a piece the layout no longer holds. Refused
  // rather than redirected, since redirecting means copying that piece and then every piece naming it.
  const kept = [layout.keyTable, ...body, ...sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...pictures];
  const ours = new Set<ContainerPiece>([built.nameTree, built.stateTable, built.valueMapTable, ...built.records, ...built.valueMaps]);
  for (const p of kept) {
    if (ours.has(p)) continue;
    if (p.refs.some((r) => 'to' in r && replace.has(r.to))) {
      throw new StateTablesError(`a piece${p.owner === undefined ? '' : ` (${p.owner})`} names a state table or record being replaced`);
    }
  }
  return { ...layout, body, sections, pictures };
}
