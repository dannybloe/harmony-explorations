/**
 * The Harmony 300 and 350's constant sections and lists, built: what every configuration of the family holds
 * whatever its devices, step 3 of `docs/plans/011-the-350-from-nothing.md`. Each
 * builder returns the bytes, or a piece the frame places, and nothing here edits a container or reads one.
 *
 * **What is built**, each measured byte for byte on the 13 compiles of the family the lab holds, both models, by
 * `test/families/harmony-300-350/noscreenconstants.test.ts`, whose header holds the argument:
 *
 * * the log area, raw slot 2: the shared `buildLogArea`, whose table `LOG_AREAS` holds this architecture's
 *   region, 8 bytes;
 * * the parameter block, raw slot 10: five groups, `NO_SCREEN_PARAMETERS`, and their table, 16 and 21 bytes;
 * * the digit entry table, raw slot 12: a count of zero, 2 bytes. Raw slot 14 is NULL and has nothing to build;
 * * the start up events, raw slot 5, and the six lists they reach, 34 and 42 bytes;
 * * the four send events' lists, the thirteen lists the key table's tags `0x2D` to `0x30` reach, 109 bytes, and
 *   the four key table entries that bind them;
 * * and one entry that is not measured on Logitech's compiles, since none holds it: event `0xFF` bound to event
 *   `0x30`'s list, `noScreenAcknowledgingEntry`, which makes a Harmony 300 send from infrared groups 4 to 7,
 *   decision 28, and which every configuration built from nothing carries.
 *
 * **What a configuration supplies is numbers, never bytes.** Lists are called by their index in the action list
 * table, and Logitech's compiler numbers them in an order no rule is known for, plan 011, so the list indices
 * are the caller's description, `NoScreenStartUpNumbers` and `NoScreenSendEventNumbers`. One thing is the setup's:
 * the map the first start up event selects, the map of the device on the lowest infrared group that holds one,
 * `startUpGroup`, which is the top left key's short press device wherever that key holds one. Its number is
 * description as well, being a map's index.
 *
 * **Both models alike**, decision 28: no constant here differs between the Harmony 300 and the Harmony 350 in the
 * compiles read, three of the 300's and ten of the 350's, so none is a table by skin.
 *
 * Read only towards hardware: the result is bytes and pieces that `layOutContainer` places.
 */
import { PIN_BAND, STATE_BAND } from '../../container/actions.ts';
import { sameBytes } from '../../support/bytes.ts';
import { buildLogArea, type BuiltParameterBlock, parameterGroupWriter } from '../../assembly/firmwaresections.ts';
import { countedTable, type ContainerPiece } from '../../assembly/frame.ts';
import { actionListBytes, type Instruction } from '../../container/gspm.ts';
import { BYTE_REGISTER_LOAD, CONDITION_OPCODE, CONDITION_TWO_ARMS, SELECT_BINDING_SET, SELECT_BINDING_SET_MASK } from '../../inventory/inventory.ts';
import { ACTION_LIST_INDEX_OPCODE } from '../../container/sections.ts';
import { ComposeError } from '../../shared/core.ts';
import type { KeyEntry } from './devices.ts';

/** The family's architecture, which the shared log area table is asked with. */
const ARCHITECTURE = 16;

/**
 * The parameter block's five groups, in table order: the same values in all 13 compiles. Group 0 is not the hold
 * time the firmware uses, which the start up sets with `3F F00A`, `HOLD_TIME`; what reads any of the five is not
 * read, since no instruction of the firmware is known to seek raw slot 10.
 */
export const NO_SCREEN_PARAMETERS: readonly (readonly number[])[] = [[60], [80], [600, 602, 766, 769], [1800], [0]];

/** How many instructions the start up event table holds, in all 13 compiles. */
export const START_UP_EVENT_COUNT = 11;
/** The start up events that call a list of their own, entries 1 to 4; the others call the empty list. */
export const START_UP_OWN_EVENTS = [1, 2, 3, 4] as const;

/**
 * The hold time the start up sets, `3F F0nn` with `nn` this: parameter 0, in hundreds of ticks,
 * `reference/architectures/harmony-300-350/firmware.md` "A held key". 10 in all 13 compiles.
 */
export const HOLD_TIME = 10;
/** `0x3F` band `0xF0`: set parameter 0, the hold time, to the low byte. */
const SET_HOLD_TIME = { opcode: 0x3f, operand: 0xf000 | HOLD_TIME } as const;
/**
 * The two pushes the hold list ends with, `0x1F` band `0xFE` with 0 and with `0xFE`: a base slot 9 binding list
 * onto the key lookup stack, `actions.ts`, entry 0 being the key table. What `0xFE` names there is not read; the
 * two instructions are copied as every compile states them.
 */
const PUSH_KEY_TABLE = { opcode: STATE_BAND, operand: 0xfe00 } as const;
const PUSH_FE = { opcode: STATE_BAND, operand: 0xfefe } as const;

/**
 * The send events' tags in entry 0 and the output pin each one's list switches, `0x2D` pin 0, `0x2F` pin 1, `0x2E`
 * pin 2 and `0x30` pin 3, `tests/harmony_300_350/test_harmony_300_350_send_events.py`. In tag order.
 */
export const SEND_EVENT_PINS: ReadonlyMap<number, number> = new Map([[0x2d, 0], [0x2e, 2], [0x2f, 1], [0x30, 3]]);
/** The state variable the send events' lists test: the sending flag, `tests/harmony_300_350/test_harmony_350_clock.py`. */
export const SENDING_FLAG = 17;
/** The instruction each send event's list ends with, which no image has been read for. */
const SEND_EVENT_TAIL = { opcode: 0x07, operand: 0xfffa } as const;
/** The low nibble of a pin switch, `0xE9p2` and `0xE9p0`: the two arms of the test, in the order stated. */
const PIN_ARMS = [2, 0] as const;
/**
 * The test's comparison, operand bits 8 to 11 of its `0x71`: 1, where 0 is equality, `inventory.ts`. Which
 * comparison 1 is has not been read; copied as all 13 compiles state it.
 */
const SEND_EVENT_COMPARISON = 1;

/** The list indices the start up's lists take, which the caller allocates. */
export interface NoScreenStartUpNumbers {
  /** The empty list, which entries 0 and 5 to 10 call, and each of the four lists below. */
  readonly empty: number;
  /** The list setting the hold time and pushing the key table, which each of the four calls first. */
  readonly hold: number;
  /** The lists of start up events 1 to 4, in that order; Logitech numbers them 0 to 3 in all 13 compiles. */
  readonly events: readonly [number, number, number, number];
  /**
   * The key map event 1's list selects last: the map of the device `startUpGroup` names, as all 13 compiles have
   * it. Absent where the configuration holds no device, and then event 1's list is the same as events 2 to 4's,
   * which no compile shows.
   */
  readonly map?: number | undefined;
}

/**
 * The infrared group whose device's map the start up selects, given the groups that hold a device: the lowest. In
 * 12 of the 13 compiles that is group 0, the top left key's short press, the TV key's device; the thirteenth holds
 * one device, on the bottom left key, group 2, and selects it. Which of several devices Logitech would pick with the
 * top left key empty is not read, since that compile has only one. Undefined for no device.
 */
export function startUpGroup(occupied: readonly number[]): number | undefined {
  return occupied.length === 0 ? undefined : Math.min(...occupied);
}

/** The list indices one send event's lists take: the list the tag binds, the list it calls, and the test. */
export interface SendEventLists {
  /** The list entry 0 binds to the tag: the load list called, the empty list called, then `07 FFFA`. */
  readonly bound: number;
  /** The byte register loaded with 0, then the test called. */
  readonly load: number;
  /** The sending flag compared with the byte register, and the pin switched one way on each arm. */
  readonly test: number;
}

/** The list indices the four send events' lists take, which the caller allocates. */
export interface NoScreenSendEventNumbers {
  /** The empty list the four bound lists call; Logitech's is not the start up's empty list in any compile. */
  readonly empty: number;
  /** Per tag of `SEND_EVENT_PINS`, its three lists. */
  readonly events: ReadonlyMap<number, SendEventLists>;
}

const call = (list: number): Instruction => {
  if (!Number.isInteger(list) || list < 0 || list > 0xffff) throw new ComposeError(`a list's index is a u16, not ${list}`);
  return { opcode: ACTION_LIST_INDEX_OPCODE, operand: list };
};

/** An action list as a piece of its own, which the list table names by its index. */
const listPiece = (body: readonly Instruction[]): ContainerPiece => ({ bytes: actionListBytes(body), refs: [], owner: 'slot-10-list' });

/** The lists in `lists`, refusing two different bodies at one index. */
function collect(lists: readonly [number, ContainerPiece][]): Map<number, ContainerPiece> {
  const out = new Map<number, ContainerPiece>();
  for (const [index, piece] of lists) {
    const there = out.get(index);
    if (there !== undefined && !sameBytes(there.bytes, piece.bytes)) throw new ComposeError(`list ${index} is given two different bodies`);
    out.set(index, piece);
  }
  return out;
}

/** Raw slot 2, the log area: the shared builder, with this architecture's region. 8 bytes once laid out. */
export function noScreenLogArea(): ContainerPiece {
  return buildLogArea(ARCHITECTURE);
}

/**
 * Raw slot 10, the parameter block: the table and the five groups, `NO_SCREEN_PARAMETERS`. Built through the shared
 * group encoding and not through `buildParameterBlock`, which refuses this architecture because no lengths the
 * firmware demands have been read for it; the lengths here are the compiles' own.
 */
export function noScreenParameterBlock(): BuiltParameterBlock {
  const groups = NO_SCREEN_PARAMETERS.map((values): ContainerPiece => ({ bytes: parameterGroupWriter(values).bytes, refs: [], owner: 'raw-10-group' }));
  return { table: countedTable(1, groups, 'raw-10-table'), groups };
}

/** Raw slot 12, the digit entry table: a `u16` count of zero, no entry, as every compile holds it. */
export function noScreenDigitEntryTable(): ContainerPiece {
  return { bytes: new Uint8Array(2), refs: [], owner: 'raw-12-table' };
}

/**
 * Raw slot 5, the start up event table: a `u8` count, then eleven instructions, each a call of a list: entry 0
 * and entries 5 to 10 the empty list, entries 1 to 4 their own lists. 34 bytes.
 */
export function noScreenStartUpTable(numbers: NoScreenStartUpNumbers): Uint8Array {
  const own = new Map<number, number>(START_UP_OWN_EVENTS.map((entry, k) => [entry, numbers.events[k]!]));
  const body = Array.from({ length: START_UP_EVENT_COUNT }, (_, entry) => call(own.get(entry) ?? numbers.empty));
  return actionListBytes(body);
}

/**
 * The start up's six lists, by index: the empty list; the hold list, `3F F00A` and the two pushes; and the four
 * events' lists, each calling the hold list and the empty list, the first then selecting `numbers.map`. 42 bytes
 * with a map, 39 without.
 */
export function noScreenStartUpLists(numbers: NoScreenStartUpNumbers): Map<number, ContainerPiece> {
  if (numbers.events.length !== START_UP_OWN_EVENTS.length) throw new ComposeError(`the start up has ${START_UP_OWN_EVENTS.length} lists of its own, not ${numbers.events.length}`);
  if (numbers.map !== undefined && (!Number.isInteger(numbers.map) || numbers.map < 0 || numbers.map > 0xff)) {
    throw new ComposeError(`a selected map is a byte, not ${numbers.map}`);
  }
  const indices = [numbers.empty, numbers.hold, ...numbers.events];
  if (new Set(indices).size !== indices.length) throw new ComposeError(`the start up's six lists need six indices, not ${indices.join(', ')}`);
  const select = numbers.map === undefined ? [] : [{ opcode: SELECT_BINDING_SET, operand: SELECT_BINDING_SET_MASK | numbers.map }];
  return collect([
    [numbers.empty, listPiece([])],
    [numbers.hold, listPiece([SET_HOLD_TIME, PUSH_KEY_TABLE, PUSH_FE])],
    ...numbers.events.map((list, k): [number, ContainerPiece] => [list, listPiece([call(numbers.hold), call(numbers.empty), ...(k === 0 ? select : [])])]),
  ]);
}

/** The send events' numbers checked: every tag of `SEND_EVENT_PINS` once, and thirteen distinct indices. */
function sendEventsOf(numbers: NoScreenSendEventNumbers): [number, number, SendEventLists][] {
  const tags = [...numbers.events.keys()].sort((a, b) => a - b);
  const wanted = [...SEND_EVENT_PINS.keys()];
  if (tags.join() !== wanted.join()) throw new ComposeError(`the send events are the tags ${wanted.map((t) => t.toString(16)).join(', ')}, not ${tags.map((t) => t.toString(16)).join(', ')}`);
  const out = wanted.map((tag): [number, number, SendEventLists] => [tag, SEND_EVENT_PINS.get(tag)!, numbers.events.get(tag)!]);
  const indices = [numbers.empty, ...out.flatMap(([, , lists]) => [lists.bound, lists.load, lists.test])];
  if (new Set(indices).size !== indices.length) throw new ComposeError(`the send events' thirteen lists need thirteen indices, not ${indices.join(', ')}`);
  return out;
}

/**
 * The four send events' thirteen lists, by index: per event the bound list, `call load`, `call empty`, `07 FFFA`;
 * the load list, `1F FB00`, `call test`; and the test, `71 8111` then the event's pin switched by `1F E9p2` and
 * `1F E9p0`; and the one empty list the four bound lists share. 109 bytes.
 */
export function noScreenSendEventLists(numbers: NoScreenSendEventNumbers): Map<number, ContainerPiece> {
  const lists: [number, ContainerPiece][] = [[numbers.empty, listPiece([])]];
  for (const [, pin, own] of sendEventsOf(numbers)) {
    lists.push(
      [own.bound, listPiece([call(own.load), call(numbers.empty), SEND_EVENT_TAIL])],
      [own.load, listPiece([{ opcode: STATE_BAND, operand: BYTE_REGISTER_LOAD << 8 }, call(own.test)])],
      [own.test, listPiece([
        { opcode: CONDITION_OPCODE, operand: CONDITION_TWO_ARMS | (SEND_EVENT_COMPARISON << 8) | SENDING_FLAG },
        ...PIN_ARMS.map((arm) => ({ opcode: STATE_BAND, operand: (PIN_BAND << 8) | (pin << 4) | arm })),
      ])],
    );
  }
  return collect(lists);
}

/**
 * The key table's four entries binding the send events, one per tag, each a call of its bound list, in tag order:
 * where they go among the key table's other entries is the key table's order, `inCompilerOrder`. 16 bytes.
 */
export function noScreenSendEventEntries(numbers: NoScreenSendEventNumbers): KeyEntry[] {
  return sendEventsOf(numbers).map(([tag, , own]) => ({ tag, ...call(own.bound) }));
}

/**
 * The firmware event a Harmony 300's application raises for a send from an infrared group above 3: the send kind
 * `0xFF`, which the 350's build masks to two bits and the 300's leaves, `reference/architectures/harmony-300-350/
 * firmware.md` "What a send does with its event, and why event `0xFF` stops it". No Logitech configuration of the
 * family binds it, 13 of 13, `tests/harmony_300_350/test_harmony_300_group_4_send.py`.
 */
export const UNMASKED_SEND_EVENT = 0xff;

/**
 * The send event whose bound list event `UNMASKED_SEND_EVENT` is given: `0x30`, the event a 350 raises for a send
 * from group 3 and from every group above it, so the list a 300 then runs is the one a 350 runs for the same send.
 * Its list ends in `07 FFFA`, the acknowledgement that releases the sender, as the four bound lists all do; `0x30`
 * is the one the bench 300 was run with, `packages/codec/test/families/harmony-300-350/noscreeneventff.test.ts`, and the only one measured.
 */
export const ACKNOWLEDGED_AS = 0x30;

/**
 * The key table's fifth entry, which makes a Harmony 300 send from infrared groups 4 to 7: event `0xFF` bound to a
 * call of the list event `0x30`'s entry calls, decision 28. 4 bytes.
 *
 * **Why it is a family fact and not a 300's.** Without it a Harmony 300 hangs at the first send from group 4, since
 * no list runs the acknowledgement; with it the bench 300 sent from all eight groups, and the bench 350, whose build
 * never raises the event, sent what it sent without it. So one configuration serves both models and nothing in it
 * names the model, which is why this is not a table by skin: every configuration our builders write from nothing
 * carries it, `buildEmptyNoScreenConfiguration` from the start and `buildNoScreenSetup` as its last step, which
 * `emptyNoScreenForComposing` in `empty.ts` explains.
 *
 * **Why apart from `noScreenSendEventEntries`.** Those four are measured byte for byte on all 13 of Logitech's compiles
 * and the attribution credits them there; Logitech binds no `0xFF`, so folding this in would make the calibration
 * claim an entry their files do not hold. It is ours alone, and kept beside the four it borrows its list from.
 *
 * **Where it is not added**: to a Logitech file a composer edits. No composer rebuilds the key table from these
 * constants, each adds its own entries to what the file holds, `withMapEntries`, so a Logitech compile composed onto
 * keeps Logitech's key table as it was, and a configuration that should serve a 300 is built from nothing.
 */
export function noScreenAcknowledgingEntry(numbers: NoScreenSendEventNumbers): KeyEntry {
  const own = sendEventsOf(numbers).find(([tag]) => tag === ACKNOWLEDGED_AS);
  // `sendEventsOf` refuses numbers without every tag, so this is unreachable short of `SEND_EVENT_PINS` losing 0x30.
  if (own === undefined) throw new ComposeError(`the send events hold no tag ${ACKNOWLEDGED_AS.toString(16)} to acknowledge event ${UNMASKED_SEND_EVENT.toString(16)} with`);
  return { tag: UNMASKED_SEND_EVENT, ...call(own[2].bound) };
}
