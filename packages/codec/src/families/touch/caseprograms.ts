/**
 * The Harmony One's base slot 11 case programs and the table that names every program, built from a description:
 * `todo-compile-one.md` 6.6, findings section 416. With the clock header's four programs (section 414,
 * `clockheader.ts`) and the activities' own cases (`activityscreen.ts`), this makes every base slot 11 entry ours.
 *
 * **What a case program is.** Base slot 14 holds value maps: for a state variable, which program runs at each of
 * its values. The program a case names is a base slot 11 screen program, and on the One every one of them is one of
 * three things: five bytes queuing one action list instruction (`caseProgram`, the encoder the activity composer
 * uses too), a lone end where there is nothing to do, or four filled rectangles, the frame a clock picker draws
 * round the cell that is chosen.
 *
 * **The value maps are one catalogue on every Harmony One compile read**, sixteen records, fifteen where the
 * configuration keeps no Remote Assistant, measured on all nineteen; what differs between compiles is their order
 * in base slot 14, the numbers they name, and how many activities and devices the setup has. By role:
 *
 * | role | keyed by | its cases |
 * |---|---|---|
 * | `devices route`, `working route`, `select route` | the location | at 0, look up `devices`, `working` or `select` on the activity counter |
 * | `idle` | the location | at 0, write the idle value into the activity counter |
 * | `menu` | the location | at 0, enter the activity menu |
 * | `help` | the location | at 0, enter the screen the handler set's scan 38 press reaches through it, a power off help screen |
 * | `all off` | the location | at 0, write 0 into every power variable: the end with none, the write with one, a call of a list of the writes with several |
 * | `devices` | the activity counter | at the idle value, enter the idle device list; at each activity's, that activity's |
 * | `devices unread` | the activity counter, though nothing looks it up | the same cases as `devices`; no instruction looks it up on any compile read |
 * | `working` | the activity counter | at the idle value, look up `menu` on the location; at each activity's, enter its working screen |
 * | `select` | the activity counter | no idle case; at each activity's, select its binding set |
 * | `page` | a variable the keys of the device pages, Options and the device lists look up | at 0 a call of a list clicking and looking up `menu`, at 1 of one clicking and looking up `working route` |
 * | `assistant` | the start up variable, section 403 | at 3 a call of a list clicking, writing 1 into it and queuing `07 FFF7`, at 0 to 2 one writing 3 |
 * | `sound` | the button sound variable | at 0 a call of a list clicking, `3F F300`, writing 1 into it and queuing `07 FFF7`, at 1 the same with `F301` and 0 |
 * | `grid`, `column` | the variable of a clock picker's lists | a frame round each of six cells in two columns, or three in one |
 *
 * The cases at an activity's value are the activity's and not built here: on Logitech's compiles one per activity
 * in each of `devices`, `devices unread`, `working` and `select`, 64 activities and 256 cases over the nineteen; the
 * activity composer (`activityscreen.ts`) appends them to every `devices` record something looks up, to `working` and
 * to `select`, and with no activity on the donor it takes only the records something looks up on the counter, which the
 * unread copy is not, so it leaves the copy at its
 * idle case.
 *
 * **What the description carries**, `TouchCaseProgramsSpec`: which value map each role is; the location and
 * the activity counter, the idle value, the modes the location and the idle device list enter, the button sound
 * and start up variables, the lists' indices, and the power variables in the order the all off writes them.
 * Each number is read once, where it first occurs, and every other place it occurs is generated.
 * **Everything else is generated**: every opcode and the queue framing, every case's value and the cases
 * themselves, the location's one value, the clicks, the constants the toggles write and queue, the device list
 * the unread copy enters, every rectangle, and the table.
 *
 * **The table**, base slot 11's count and addresses, is generated whole: the four clock header programs at their
 * entries, then every value map case's program in base slot 14's order, each record's cases in the stored order
 * `compilerCaseOrder` gives and its ranges after them, activities' cases included. Its inputs are the clock
 * header's entries and the state tables' value maps, two other builders' descriptions, so it reads nothing of
 * its own.
 *
 * Arch 12 (Harmony One) alone, the touch family's; the Harmony 600, 650 and 700 hold value maps of another
 * catalogue and a base slot 11 of several thousand entries, section 369, and are not read here. Read only towards
 * hardware: the result is pieces.
 */
import type { Container, Instruction } from '../../gspm.ts';
import { actionListBytes } from '../../gspm.ts';
import type { ContainerLayout, ContainerPiece, PieceRef } from '../../frame.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import { Writer } from '../../emit.ts';
import { SCREEN_END, SCREEN_TABLE_SLOT, screenProgram } from '../../screen.ts';
import { type ValueMap, valueMaps } from '../../valuemap.ts';
import { ENTER_MODE, MAP_VALUE_OPCODE, SELECT_BINDING_SET, caseQueued, compilerCaseOrder } from '../../inventory.ts';
import { type PieceTarget, type ValueMapSpec, describeStateTables } from '../../statetables.ts';
import { ScreenRecordError, assertRebuilt, recordReading } from '../../screenrecords.ts';
import { type ValueReader, blobReader } from '../../shared/spelling.ts';
import { caseProgram } from '../../shared/menus.ts';
import { CALL, CLICK, STATE_WRITE, withTemplatePrograms } from './screentemplate.ts';
import { touchClockHeaderEntries } from './clockheader.ts';
import { TOUCH_STATE_TABLES } from './statetables.ts';

// ---------------------------------------------------------------------------------------------------------
// The catalogue.

/** The roles, in the order a description lists them and the builder builds them. */
export const TOUCH_VALUE_MAP_ROLES = [
  'devices route', 'working route', 'select route', 'idle', 'menu', 'help', 'all off',
  'devices', 'devices unread', 'working', 'select', 'page', 'assistant', 'sound', 'grid', 'column',
] as const;
export type TouchValueMapRole = (typeof TOUCH_VALUE_MAP_ROLES)[number];

/**
 * The roles a configuration may lack: the start up toggle goes with the Remote Assistant at start, which the
 * everyday One's compile holds neither of (section 412), and that compile alone of the nineteen lacks it.
 */
const OPTIONAL: ReadonlySet<TouchValueMapRole> = new Set(['assistant']);

/** The roles keyed by the activity counter, whose cases at an activity's value are the activity composer's. */
const ACTIVITY_KEYED: ReadonlySet<TouchValueMapRole> = new Set(['devices', 'devices unread', 'working', 'select']);

/** The location takes one value, 0, on all nineteen compiles (`CurrentLocation_1`), so its records' one case is at 0. */
const LOCATION_VALUE = 0;

/** The click every toggle's list opens with, the template's `CLICK`, as an instruction. */
const CLICK_INSTRUCTION: Instruction = { opcode: (CLICK as { opcode: number }).opcode, operand: (CLICK as { operand: number }).operand };
/** What the toggles queue last, `07 FFF7`, on every compile read; what it does is not read. */
const TOGGLE_TAIL: Instruction = { opcode: 0x07, operand: 0xfff7 };
/** The button sound toggle's second instruction, `3F F3vv` with `vv` the case's value; what it does is not read. */
const SOUND_BAND = 0x3f;
const SOUND_OPERAND = 0xf300;
/** The start up toggle: at 3 it writes 1, at 0 to 2 it writes 3, section 403's values. */
const ASSISTANT_AT = 3;
const ASSISTANT_RANGE: readonly [number, number] = [0, 2];
const ASSISTANT_WRITES = { at: 1, range: 3 } as const;

/**
 * A clock picker's frame round its chosen cell: four filled rectangles, opcode 1 with x, y, width, height and a
 * little endian colour, the left edge, the right edge two pixels taller, the top and the bottom. The same bytes on
 * all nineteen compiles; the colour is not the look's, our composed files keeping it as Logitech's.
 */
const FILL = 1;
const FRAME_COLOUR = 0xec07;
const FRAME_LEFT = 4;
const FRAME_TOP = 36;
const CELL_WIDTH = 83;
const CELL_HEIGHT = 52;
const ROW_STEP = 54;
const EDGE = 2;
/** The grid's six cells in two columns of three rows, row by row; the column's three a cell twice as wide. */
const GRID = { cells: 6, columns: 2, width: CELL_WIDTH } as const;
const COLUMN = { cells: 3, columns: 1, width: 2 * CELL_WIDTH } as const;

/** The frame round cell `k` of a picker laid out as `layout`. */
function frameProgram(layout: { columns: number; width: number }, k: number): Uint8Array {
  const x = FRAME_LEFT + layout.width * (k % layout.columns);
  const y = FRAME_TOP + ROW_STEP * Math.floor(k / layout.columns);
  const fills = [[x, y, EDGE, CELL_HEIGHT], [x + layout.width, y, EDGE, CELL_HEIGHT + EDGE], [x, y, layout.width, EDGE], [x, y + CELL_HEIGHT, layout.width, EDGE]];
  const out = new Writer(fills.length * 7 + 1);
  for (const [fx, fy, w, h] of fills) out.u8(FILL).u8(fx as number).u8(fy as number).u8(w as number).u8(h as number).u16(FRAME_COLOUR);
  return out.u8(SCREEN_END).bytes;
}

// ---------------------------------------------------------------------------------------------------------
// Finding the roles by look.

/** A case of a record: its value or range, and the program it names. */
export interface ValueMapCase { key: number | readonly [number, number]; target: number }

const casesOf = (map: ValueMap): ValueMapCase[] => [
  ...map.entries.map(([value, target]) => ({ key: value, target })),
  ...map.ranges.map(([low, high, target]) => ({ key: [low, high] as const, target })),
];

/**
 * Which value map each role is on `c`, found by the look of the cases, and the three numbers the finding needs:
 * the location, the activity counter and the idle value. Refused where a record takes no role or two, or a role
 * other than the optional one is not found.
 *
 * The order: the toggles and the frames by their programs and lists; the location from the page toggle's lists,
 * which look up `menu` and `working route` on it; the counter and `working` from `working route`; the idle value
 * from `working`'s one case that looks up rather than enters; then the location's other records by what their
 * one case does, and the unread copy of `devices` as the record besides it whose idle case enters the same mode.
 */
export function touchValueMapRoles(c: Container): { records: Map<TouchValueMapRole, number>; location: number; counter: number; idle: number } {
  const maps = valueMaps(c);
  if (maps === undefined) throw new ScreenRecordError('base slot 14 does not read');
  const lists = c.actionLists() ?? [];
  const records = new Map<TouchValueMapRole, number>();
  const taken = new Set<number>();
  const take = (role: TouchValueMapRole, index: number): void => {
    if (records.has(role)) throw new ScreenRecordError(`two value maps read as ${role}`);
    if (taken.has(index)) throw new ScreenRecordError(`value map ${index} reads as two roles`);
    records.set(role, index);
    taken.add(index);
  };
  const queued = (target: number): Instruction | undefined => caseQueued(c, target);
  const listOf = (target: number): Instruction[] | undefined => {
    const one = queued(target);
    return one?.opcode === CALL ? lists[one.operand] : undefined;
  };
  const opens = (body: readonly Instruction[] | undefined, ...opcodes: number[]): boolean =>
    body !== undefined && body.length === opcodes.length && body.every((one, k) => opcodes[k] === -1 || one.opcode === opcodes[k]);
  const isClick = (one: Instruction | undefined): boolean => one?.opcode === CLICK_INSTRUCTION.opcode && one.operand === CLICK_INSTRUCTION.operand;
  const fills = (target: number): boolean => {
    const program = screenProgram(c, target);
    return program !== undefined && program.length === 5 && program.slice(0, 4).every((one) => one.opcode === FILL);
  };

  // The toggles and the frames, by their own programs and lists.
  maps.forEach((map, index) => {
    const cases = casesOf(map);
    if (cases.length > 0 && cases.every((one) => fills(one.target))) {
      if (map.entries.length === GRID.cells && map.ranges.length === 0) take('grid', index);
      else if (map.entries.length === COLUMN.cells && map.ranges.length === 0) take('column', index);
      return;
    }
    const bodies = cases.map((one) => listOf(one.target));
    if (cases.length !== 2 || !bodies.every((body) => isClick(body?.[0]))) return;
    if (bodies.every((body) => opens(body, -1, SOUND_BAND, -1, TOGGLE_TAIL.opcode))) take('sound', index);
    else if (map.ranges.length === 1 && bodies.every((body) => opens(body, -1, -1, TOGGLE_TAIL.opcode))) take('assistant', index);
    else if (bodies.every((body) => opens(body, -1, MAP_VALUE_OPCODE))) take('page', index);
  });
  const page = records.get('page');
  if (page === undefined) throw new ScreenRecordError('no value map reads as the page toggle');
  const [toMenu, toWorking] = casesOf(maps[page] as ValueMap).map((one) => (listOf(one.target) as Instruction[])[1] as Instruction);
  if (toMenu === undefined || toWorking === undefined || (toMenu.operand & 0xff) !== (toWorking.operand & 0xff)) {
    throw new ScreenRecordError('the page toggle does not look up two records on one variable');
  }
  const location = toMenu.operand & 0xff;
  take('menu', toMenu.operand >> 8);
  take('working route', toWorking.operand >> 8);
  const route = queued((maps[toWorking.operand >> 8]?.entries[0] ?? [0, 0])[1]);
  if (route?.opcode !== MAP_VALUE_OPCODE) throw new ScreenRecordError('the working route does not look up a record');
  const counter = route.operand & 0xff;
  take('working', route.operand >> 8);
  // `working`'s idle case is its one case that looks up the menu on the location; its activities' cases enter.
  const idles = (maps[route.operand >> 8] as ValueMap).entries.filter(([, target]) => queued(target)?.opcode === MAP_VALUE_OPCODE);
  if (idles.length !== 1) throw new ScreenRecordError(`the working record looks up ${idles.length} records, not one at its idle value`);
  const idle = (idles[0] as [number, number])[0];

  // The location's other records, each one case at 0, by what the case does.
  const deviceList = new Map<number, number>();
  maps.forEach((map, index) => {
    if (taken.has(index) || map.ranges.length !== 0 || map.entries.length !== 1 || map.entries[0]?.[0] !== LOCATION_VALUE) return;
    const target = (map.entries[0] as [number, number])[1];
    const one = queued(target);
    const program = screenProgram(c, target);
    if (program?.length === 1 && program[0]?.opcode === SCREEN_END) take('all off', index);
    else if (one?.opcode === MAP_VALUE_OPCODE && (one.operand & 0xff) === counter) {
      const named = maps[one.operand >> 8];
      const idleCase = named?.entries.find(([value]) => value === idle);
      if (idleCase === undefined) {
        take('select route', index);
        take('select', one.operand >> 8);
      } else if (queued(idleCase[1])?.opcode === ENTER_MODE) {
        take('devices route', index);
        take('devices', one.operand >> 8);
        deviceList.set(one.operand >> 8, (queued(idleCase[1]) as Instruction).operand);
      }
    } else if (one !== undefined && one.opcode === STATE_WRITE + counter) take('idle', index);
    else if (one !== undefined && one.opcode >= STATE_WRITE && one.operand === 0) take('all off', index);
    else if (one?.opcode === CALL && (lists[one.operand] ?? []).length > 0 && (lists[one.operand] ?? []).every((step) => step.opcode >= STATE_WRITE && step.operand === 0)) {
      take('all off', index);
    }
  });
  // The unread copy: another record whose idle case enters the idle device list; then `help`, the location's
  // record left that enters a mode.
  const listMode = [...deviceList.values()][0];
  maps.forEach((map, index) => {
    if (taken.has(index)) return;
    const idleCase = map.entries.find(([value]) => value === idle);
    const one = idleCase === undefined ? undefined : queued(idleCase[1]);
    if (map.ranges.length === 0 && one?.opcode === ENTER_MODE && one.operand === listMode) take('devices unread', index);
  });
  maps.forEach((map, index) => {
    if (taken.has(index) || map.ranges.length !== 0 || map.entries.length !== 1 || map.entries[0]?.[0] !== LOCATION_VALUE) return;
    if (queued((map.entries[0] as [number, number])[1])?.opcode === ENTER_MODE) take('help', index);
  });

  const missing = TOUCH_VALUE_MAP_ROLES.filter((role) => !records.has(role) && !OPTIONAL.has(role));
  if (missing.length > 0) throw new ScreenRecordError(`no value map reads as ${missing.join(', ')}`);
  const left = maps.map((_, index) => index).filter((index) => !taken.has(index));
  if (left.length > 0) throw new ScreenRecordError(`value maps ${left.join(', ')} read as no role`);
  return { records, location, counter, idle };
}

// ---------------------------------------------------------------------------------------------------------
// The description.

export interface TouchCaseProgramsSpec {
  /** Which value map each role is, its index in base slot 14; `assistant` absent where the configuration has none. */
  records: Partial<Record<TouchValueMapRole, number>>;
  /** The location variable, the activity counter and the counter's value while no activity runs. */
  location: number;
  counter: number;
  idle: number;
  /** The modes entered: the activity menu, the help screen the location reaches, and the idle device list. */
  modes: { menu: number; help: number; deviceList: number };
  /** The page toggle's two lists, at 0 and at 1. */
  page: { lists: [number, number] };
  /** The start up toggle's variable and its two lists, at 3 and at 0 to 2. */
  assistant?: { variable: number; lists: [number, number] };
  /** The button sound's variable and its two lists, at 0 and at 1. */
  sound: { variable: number; lists: [number, number] };
  /** The power variables the all off writes, in its order, and its list where it writes more than one. */
  allOff: { powers: number[]; list?: number };
}

/** One case built: its value or range and its program's piece. */
export interface BuiltCase { key: number | readonly [number, number]; piece: ContainerPiece }

export interface BuiltTouchCasePrograms {
  /** Per role, the cases this builds in their stored order, ranges last; the activities' are not among them. */
  cases: Map<TouchValueMapRole, BuiltCase[]>;
  /** The lists the toggles and the all off call, by index. */
  lists: Map<number, ContainerPiece>;
}

export interface TouchCaseProgramsDescribed {
  spec: TouchCaseProgramsSpec;
  /** Where the configuration's own sat: per role its cases' pieces in the builder's order, and its lists'. */
  place: {
    cases: Map<TouchValueMapRole, ContainerPiece[]>;
    /** Per role, the configuration's value or range of each of those cases, which base slot 14 states. */
    keys: Map<TouchValueMapRole, ValueMapCase['key'][]>;
    lists: Map<number, ContainerPiece>;
    lengths: Map<ContainerPiece, number>;
  };
  /** What the table is built from, two other builders' descriptions: the clock header's programs by entry, and the value maps. */
  table: { header: PieceTarget[]; valueMaps: readonly ValueMapSpec[]; piece: ContainerPiece };
  described: Set<number>;
  structure: Set<number>;
  regions: { from: number; to: number; what: string }[];
}

/**
 * Read off a configuration what a composer would supply for its case programs, their lists and the table, and
 * where Logitech's sat. `layout` is `takeApart(c)`; `read` is where every value is taken from, so a caller can
 * blind every byte it does not read. The roles are found by `touchValueMapRoles` on `c` itself, as every
 * description here finds its way through the container; the numbers are read through `read`, each once.
 */
export function describeTouchCasePrograms(c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c)): TouchCaseProgramsDescribed {
  const { records, idle } = touchValueMapRoles(c);
  const maps = valueMaps(c) as ValueMap[];
  const reading = recordReading(c, layout, read);
  const { value, value16 } = reading;

  // Every case of ours spanned as a program of its own, in the builder's order: per role, entries then ranges,
  // and of an activity keyed record the idle case alone.
  const programs = new Map<TouchValueMapRole, { key: ValueMapCase['key']; at: number; piece: ContainerPiece }[]>();
  for (const role of TOUCH_VALUE_MAP_ROLES) {
    const index = records.get(role);
    if (index === undefined) continue;
    const cases = casesOf(maps[index] as ValueMap).filter((one) => !ACTIVITY_KEYED.has(role) || one.key === idle);
    programs.set(role, cases.map((one) => {
      const { piece } = reading.program(one.target, `${role}'s case ${String(one.key)}`);
      return { key: one.key, at: reading.blobOf(one.target), piece };
    }));
  }
  /** Where the queued instruction's operand sits in a role's `k`th case: one byte past the queue opcode. */
  const operandAt = (role: TouchValueMapRole, k = 0): number => ((programs.get(role) ?? [])[k] as { at: number }).at + 1;
  /** A list a case calls, spanned, with where its instructions start. */
  const listAt = (role: TouchValueMapRole, k: number): { index: number; off: number; body: Instruction[] } => {
    const index = value16(operandAt(role, k));
    const one = reading.list(index, `${role}'s case ${k + 1}'s list`);
    return { index, off: one.off, body: one.body };
  };

  // Each number read once, where it first occurs: the counter in the devices route's look up, the location in
  // the working record's idle look up, the idle value in the idle write, the modes where they are entered.
  const counter = value(operandAt('devices route'));
  const location = value(operandAt('working'));
  const spec: TouchCaseProgramsSpec = {
    records: Object.fromEntries(records) as TouchCaseProgramsSpec['records'],
    location,
    counter,
    idle: value16(operandAt('idle')),
    modes: { menu: value16(operandAt('menu')), help: value16(operandAt('help')), deviceList: value16(operandAt('devices')) },
    page: { lists: [listAt('page', 0).index, listAt('page', 1).index] },
    sound: { variable: 0, lists: [0, 0] },
    allOff: { powers: [] },
  };
  if (spec.idle !== idle) throw new ScreenRecordError(`the idle write writes ${spec.idle} where the working record's idle case is at ${idle}`);
  // A toggle's variable is the opcode of its write in its first list, less `0x80`; the second list's is generated.
  const toggle = (role: 'assistant' | 'sound', write: number): { variable: number; lists: [number, number] } => {
    const first = listAt(role, 0);
    const second = listAt(role, 1);
    return { variable: value(first.off + 1 + 3 * write + 2) - STATE_WRITE, lists: [first.index, second.index] };
  };
  if (records.has('assistant')) spec.assistant = toggle('assistant', 1);
  spec.sound = toggle('sound', 2);
  // The all off: a write per power variable, in its own program or in the list it calls, the variable read off each
  // write's opcode; nothing where it ends at once.
  const off = (programs.get('all off') ?? [])[0] as { at: number };
  const queue = caseQueued(c, maps[records.get('all off') as number]?.entries[0]?.[1] as number);
  if (queue?.opcode === CALL) {
    const list = listAt('all off', 0);
    spec.allOff = { powers: list.body.map((_, k) => value(list.off + 1 + 3 * k + 2) - STATE_WRITE), list: list.index };
  } else if (queue !== undefined) spec.allOff = { powers: [value(off.at + 3) - STATE_WRITE] };

  // The table: its own bytes spanned, and what it is built from.
  const table = layout.sections[SCREEN_TABLE_SLOT]?.head[0];
  if (table === undefined || table.owner !== 'slot-11-table') throw new ScreenRecordError('base slot 11 holds no table');
  const tableAt = reading.offsetOf(table);
  reading.lengths.set(table, table.bytes.length);
  reading.span(tableAt, table.bytes.length, 'the base slot 11 table');
  const { addresses, entries } = touchClockHeaderEntries(c);
  const header: PieceTarget[] = [];
  entries.forEach((entry, p) => { header[entry] = reading.targetOf(addresses[p] as number); });
  const valueMapSpecs = describeStateTables(layout, TOUCH_STATE_TABLES).valueMaps;

  const place = {
    cases: new Map([...programs].map(([role, cases]) => [role, cases.map((one) => one.piece)])),
    keys: new Map([...programs].map(([role, cases]) => [role, cases.map((one) => one.key)])),
    lists: reading.lists,
    lengths: reading.lengths,
  };
  return {
    spec, place, table: { header, valueMaps: valueMapSpecs, piece: table },
    described: reading.described, structure: reading.structure, regions: reading.regions,
  };
}

// ---------------------------------------------------------------------------------------------------------
// The builder.

/** A program piece, owned as base slot 11's programs are. */
const program = (bytes: Uint8Array): ContainerPiece => ({ bytes, refs: [], owner: 'slot-11-program' });

/**
 * The case programs of every role and the lists the toggles and the all off call, from a description. The
 * activities' cases are not built: an activity keyed record gets its idle case alone, and `select` none.
 */
export function buildTouchCasePrograms(spec: TouchCaseProgramsSpec): BuiltTouchCasePrograms {
  const lists = new Map<number, ContainerPiece>();
  const list = (index: number, body: readonly Instruction[]): Instruction => {
    if (lists.has(index)) throw new ScreenRecordError(`list ${index} is built twice`);
    lists.set(index, { bytes: actionListBytes(body), refs: [], owner: 'slot-10-list' });
    return { opcode: CALL, operand: index };
  };
  const recordOf = (role: TouchValueMapRole): number => {
    const index = spec.records[role];
    if (index === undefined) throw new ScreenRecordError(`the description names no value map for ${role}`);
    return index;
  };
  /** A look up of `role`'s record on `variable`, `0x72` on `(record << 8) | variable`. */
  const lookUp = (role: TouchValueMapRole, variable: number): Instruction => ({ opcode: MAP_VALUE_OPCODE, operand: (recordOf(role) << 8) | variable });
  const write = (variable: number, value: number): Instruction => ({ opcode: STATE_WRITE + variable, operand: value });
  const queue = (one: Instruction): ContainerPiece => program(caseProgram(one.opcode, one.operand));

  const cases = new Map<TouchValueMapRole, BuiltCase[]>();
  const at = (role: TouchValueMapRole, key: BuiltCase['key'], piece: ContainerPiece): void => {
    cases.set(role, [...(cases.get(role) ?? []), { key, piece }]);
  };
  for (const role of TOUCH_VALUE_MAP_ROLES) {
    if (spec.records[role] === undefined) {
      if (OPTIONAL.has(role)) continue;
      throw new ScreenRecordError(`the description names no value map for ${role}`);
    }
    if (role === 'devices route') at(role, LOCATION_VALUE, queue(lookUp('devices', spec.counter)));
    else if (role === 'working route') at(role, LOCATION_VALUE, queue(lookUp('working', spec.counter)));
    else if (role === 'select route') at(role, LOCATION_VALUE, queue(lookUp('select', spec.counter)));
    else if (role === 'idle') at(role, LOCATION_VALUE, queue(write(spec.counter, spec.idle)));
    else if (role === 'menu') at(role, LOCATION_VALUE, queue({ opcode: ENTER_MODE, operand: spec.modes.menu }));
    else if (role === 'help') at(role, LOCATION_VALUE, queue({ opcode: ENTER_MODE, operand: spec.modes.help }));
    else if (role === 'all off') {
      // Nothing to switch off ends at once, as on a compile whose two devices have no power variable; one power
      // variable's write is queued itself; several are a list, section 376.
      const writes = spec.allOff.powers.map((variable) => write(variable, 0));
      if (writes.length === 0) at(role, LOCATION_VALUE, program(Uint8Array.of(SCREEN_END)));
      else if (writes.length === 1) at(role, LOCATION_VALUE, queue(writes[0] as Instruction));
      else {
        if (spec.allOff.list === undefined) throw new ScreenRecordError('the all off writes several and names no list');
        at(role, LOCATION_VALUE, queue(list(spec.allOff.list, writes)));
      }
    } else if (role === 'devices' || role === 'devices unread') at(role, spec.idle, queue({ opcode: ENTER_MODE, operand: spec.modes.deviceList }));
    else if (role === 'working') at(role, spec.idle, queue(lookUp('menu', spec.location)));
    else if (role === 'select') cases.set(role, []);
    else if (role === 'page') {
      at(role, 0, queue(list(spec.page.lists[0], [CLICK_INSTRUCTION, lookUp('menu', spec.location)])));
      at(role, 1, queue(list(spec.page.lists[1], [CLICK_INSTRUCTION, lookUp('working route', spec.location)])));
    } else if (role === 'assistant') {
      const { variable, lists: [first, second] } = spec.assistant as NonNullable<TouchCaseProgramsSpec['assistant']>;
      at(role, ASSISTANT_AT, queue(list(first, [CLICK_INSTRUCTION, write(variable, ASSISTANT_WRITES.at), TOGGLE_TAIL])));
      at(role, ASSISTANT_RANGE, queue(list(second, [CLICK_INSTRUCTION, write(variable, ASSISTANT_WRITES.range), TOGGLE_TAIL])));
    } else if (role === 'sound') {
      // At 0 the sound is off and the toggle writes 1, at 1 the other way; the band's low byte is the case's value.
      const { variable, lists: indices } = spec.sound;
      [0, 1].forEach((value) => at(role, value, queue(list(indices[value] as number, [
        CLICK_INSTRUCTION, { opcode: SOUND_BAND, operand: SOUND_OPERAND | value }, write(variable, 1 - value), TOGGLE_TAIL,
      ]))));
    } else {
      const layout = role === 'grid' ? GRID : COLUMN;
      for (let k = 0; k < layout.cells; k += 1) at(role, k, program(frameProgram(layout, k)));
    }
  }
  return { cases, lists };
}

/**
 * Base slot 11's table, generated: the clock header's programs at their entries, `header` in entry order, then
 * every case of every value map in base slot 14's order, each record's cases in the stored order
 * `compilerCaseOrder` gives (the order `buildValueMap` stores them in) and its ranges after, on all nineteen
 * compiles read. A count of two bytes, then an address per entry.
 */
export function buildTouchScreenTable(header: readonly PieceTarget[], valueMaps: readonly ValueMapSpec[]): ContainerPiece {
  const targets: PieceTarget[] = [...header];
  for (const map of valueMaps) {
    const byValue = new Map(map.cases.map((one) => [one.value, one.target]));
    for (const value of compilerCaseOrder([...byValue.keys()])) targets.push(byValue.get(value) as PieceTarget);
    for (const range of map.ranges ?? []) targets.push(range.target);
  }
  if (targets.length > 0xffff) throw new ScreenRecordError(`${targets.length} entries is more than the table's count holds`);
  const out = new Writer(2 + 3 * targets.length).u16(targets.length);
  const refs: PieceRef[] = targets.map((target, k) => {
    out.u24(0);
    return { at: 2 + 3 * k, to: target.to, offset: target.offset };
  });
  return { bytes: out.bytes, refs, owner: 'slot-11-table' };
}

/**
 * A layout with the case programs, their lists and the table swapped for built ones, where the configuration's
 * sat: the table in base slot 11's head, then each built case in the place of the case read in the same order and
 * each list in the place of the list of its index, through `withTemplatePrograms`, which points every reference to
 * a replaced piece, the value maps' and the table's, at the built one. Refused as that refuses, and where a role's
 * built cases are not as many as the configuration's.
 */
export function withTouchCasePrograms(
  layout: ContainerLayout, built: BuiltTouchCasePrograms, place: TouchCaseProgramsDescribed['place'], table: ContainerPiece,
): ContainerLayout {
  const programs: ContainerPiece[][] = [];
  const places: ContainerPiece[][] = [];
  for (const role of TOUCH_VALUE_MAP_ROLES) {
    const made = built.cases.get(role) ?? [];
    const old = place.cases.get(role) ?? [];
    if (made.length !== old.length) throw new ScreenRecordError(`${role} would hold ${made.length} cases of ours where the configuration's holds ${old.length}`);
    // The case values are generated, and base slot 14 states the configuration's: a built case goes only where the
    // case of the same value or range sat, so a value the builder got wrong is refused rather than put back unseen.
    const keys = place.keys.get(role) ?? [];
    made.forEach((one, k) => {
      if (String(one.key) !== String(keys[k])) throw new ScreenRecordError(`the ${role} record's case ${k + 1} is built for ${String(one.key)} where the configuration's is for ${String(keys[k])}`);
      programs.push([one.piece]);
      places.push([old[k] as ContainerPiece]);
    });
  }
  const sections = layout.sections.slice();
  const slot = sections[SCREEN_TABLE_SLOT];
  if (slot === undefined || slot.head[0]?.owner !== 'slot-11-table') throw new ScreenRecordError('base slot 11 holds no table');
  sections[SCREEN_TABLE_SLOT] = { before: slot.before, head: [table, ...slot.head.slice(1)] };
  const lengths = new Map(place.lengths);
  lengths.set(table, table.bytes.length);
  return withTemplatePrograms({ ...layout, sections }, { programs, calls: [], lists: built.lists, inline: new Map() },
    { programs: places, lists: place.lists, lengths, inline: new Map() });
}

/**
 * Describe, build and put back, and compare every byte with the configuration's. The counts: value maps, our
 * cases, the lists, the table's entries, the bytes read as values and the bytes spanned.
 */
export function checkTouchCasePrograms(c: Container, read?: ValueReader): {
  records: number; cases: number; lists: number; entries: number; described: number; structure: number;
} {
  const layout = takeApart(c);
  const d = describeTouchCasePrograms(c, layout, read);
  const built = buildTouchCasePrograms(d.spec);
  const table = buildTouchScreenTable(d.table.header, d.table.valueMaps);
  assertRebuilt(layOutContainer(withTouchCasePrograms(layout, built, d.place, table)).bytes, c, d.regions);
  return {
    records: Object.keys(d.spec.records).length,
    cases: [...built.cases.values()].reduce((sum, one) => sum + one.length, 0),
    lists: built.lists.size,
    entries: (table.bytes.length - 2) / 3,
    described: d.described.size,
    structure: d.structure.size,
  };
}

