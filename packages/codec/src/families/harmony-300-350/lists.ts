/**
 * The Harmony 300 and 350's action lists, one writer per kind and its reader beside it, `todo-compile-350.md` 5.2.1.
 *
 * **Why this module exists.** Until 5.2 every composer of the family wrote its lists inline, a body of
 * `[operand, opcode]` pairs spelled out where it was needed: the device composer its power switch, its resets and
 * its key lists, the activity composer its flips and its gates, the favourite composer its channels, and the send
 * list three times over, in `sends.ts`, `activity.ts` and `digits.ts`. The attribution of 5.2.1 has to say of every
 * list of a finished file which generator wrote it, and the only honest way to say so is to read the list's numbers
 * off it, hand them to the generator, and compare what comes back with the file. A second spelling of each shape in
 * the attribution would have been a second copy of every one of them, which is the state `CLAUDE.md` warns precedes
 * two diverging ones. So the shapes moved here, the composers call them, and the attribution calls the same
 * functions: one writer per kind, its reader beside it.
 *
 * **What a reader is.** `read` takes a list's instructions and returns the numbers its writer takes, or undefined
 * where the list is not that kind's shape. The numbers are what a configuration supplies, the description in plan
 * 011's sense: list indices, a group and a record, a variable, a map, a timer, a channel. Everything else in the list
 * is the writer's, which is what a rebuild checks. A reader is deliberately loose about the numbers and strict about
 * nothing: the rebuild is the check, so a reader that accepted a list its writer does not write is caught there.
 *
 * **What a reader cannot see**: whether a number names something that exists. That is the attribution's question,
 * `ListContext`, since only it holds the configuration.
 *
 * Every shape here is measured on Logitech's compiles by the test of the composer that first wrote it, and on the
 * seven compiles of the family as a whole by `noscreenattribution.test.ts`, which counts each kind per compile.
 * Both models alike, decision 28; the Harmony 300's own press list, which selects on the press, is not here because
 * no composer of ours writes it, and the attribution reports it as no generator's.
 */
import { CANCEL_TIMERS, PIN_BAND, SILENT_WRITE, START_TIMER_BAND, STATE_BAND, STATE_WRITE_BASE } from '../../container/actions.ts';
import { Writer } from '../../container/emit.ts';
import type { Instruction } from '../../container/gspm.ts';
import {
  BYTE_REGISTER_LOAD, CONDITION_OPCODE, CONDITION_TWO_ARMS, DEVICE_QUANTITY, SELECT_BINDING_SET, SELECT_BINDING_SET_MASK, SEND_INFRARED,
} from '../../inventory/inventory.ts';
import { ACCUMULATOR_LOAD_OPCODE } from '../../infrared/ir.ts';
import { ACTION_LIST_INDEX_OPCODE } from '../../container/sections.ts';
import { ComposeError } from '../../shared/core.ts';
import { callingList } from '../../shared/devices.ts';
import { NUMBER_SENDER_RECORD_LENGTH, NUMBER_SENDER_TABLE_LENGTH } from '../../container/tables.ts';
import { KEY_TIMERS, POWER_RESETS } from './keys.ts';

/**
 * The band whose sub-operation hands the accumulator to a number sender record, the record its low byte: `1F F300`
 * in every favourite channel list of the five Harmony 300 and 350 compiles that hold one, as read while writing
 * this, four in the lab and another owner's archive; `noscreenfavourites.test.ts` holds it on the second compile and
 * on the Harmony 300's, and it was heard sending the channel on a unit. `actions.ts` names `0xF3` as the hand over to
 * base slot 14 from the other families' images; which slot this image's handler reaches is not read here, and the
 * record it sends through is raw slot 11's. Moved here from `favourites.ts` with the channel list's writer.
 */
export const NUMBER_SENDER_BAND = 0xf3;

/**
 * The longest one `0x7C` wait of a power on delay, in tenths: a delay past it is split, the rest last. The Knoll's 250
 * tenths are three waits, 100, 100 and 50, and the factory configuration's 170 two, `sends.ts`.
 */
export const POWER_ON_WAIT_MAX = 100;

/** A power on delay as the waits Logitech's compiler writes for it, `POWER_ON_WAIT_MAX` at a time. */
export function powerOnWaits(tenths: number): number[] {
  if (!Number.isInteger(tenths) || tenths < 1) throw new ComposeError(`a power on delay of ${tenths} tenths is not a wait`);
  const out: number[] = [];
  for (let left = tenths; left > 0; left -= POWER_ON_WAIT_MAX) out.push(Math.min(left, POWER_ON_WAIT_MAX));
  return out;
}

/** A list body as `appendActionLists` takes it, `[operand, opcode]` per instruction. */
export type Body = [number, number][];

/** A list's instructions as the body `appendActionLists` takes. */
export const bodyOf = (list: readonly Instruction[]): Body => list.map((one) => [one.operand, one.opcode]);

/** A list's instructions as the `Writer` the shared device composer collects bodies in: the count, then three bytes each. */
export function writerOf(list: readonly Instruction[]): Writer {
  const out = new Writer(1 + 3 * list.length).u8(list.length);
  for (const one of list) out.u16(one.operand).u8(one.opcode);
  return out;
}

const call = (list: number): Instruction => ({ opcode: ACTION_LIST_INDEX_OPCODE, operand: list });
const isCall = (one: Instruction | undefined): boolean => one?.opcode === ACTION_LIST_INDEX_OPCODE;
const isCancel = (one: Instruction | undefined): boolean => one?.opcode === CANCEL_TIMERS.opcode && one.operand === CANCEL_TIMERS.operand;
const isSelect = (one: Instruction | undefined): boolean =>
  one?.opcode === SELECT_BINDING_SET && (one.operand & SELECT_BINDING_SET_MASK) === SELECT_BINDING_SET_MASK;
/** A write of a state variable, opcode `0x80` plus its index, the value the operand. */
const isWrite = (one: Instruction | undefined): boolean => one !== undefined && one.opcode >= STATE_WRITE_BASE;

// ---------------------------------------------------------------------------------------------------------------
// The writers

/**
 * A send: the timers cancelled, the record sent, its quantity, `{07 FFFB, 7D gg rr, 7C gg qq}`, one list per record.
 * Every send list of the family's current compiles is this, `sends.ts`; the device composer writes one per record,
 * the activity composer one per input value and the digits' composer one per copy, each with the default quantity.
 */
export function sendList(group: number, record: number, quantity: number): Instruction[] {
  return [
    { ...CANCEL_TIMERS },
    { opcode: SEND_INFRARED, operand: (group << 8) | record },
    { opcode: DEVICE_QUANTITY, operand: (group << 8) | quantity },
  ];
}

/**
 * A device's power on list, which its power variable runs going from 0 to 1: every step of the on action called, then
 * the delay as bare `0x7C` waits on its group, `powerOnWaits`, `sends.ts`.
 */
export function powerOnList(calls: readonly number[], group: number, delayTenths: number): Instruction[] {
  return [...calls.map(call), ...powerOnWaits(delayTenths).map((wait) => ({ opcode: DEVICE_QUANTITY, operand: (group << 8) | wait }))];
}

/**
 * The byte register loaded with `value`, then a call of `list`: the wrapper a power variable's switch, every flip of
 * the activity and its input gate open with, `1F FBvv` and `7F`.
 */
export function gateList(value: number, list: number): Instruction[] {
  return [{ opcode: STATE_BAND, operand: (BYTE_REGISTER_LOAD << 8) | value }, call(list)];
}

/**
 * The register compared with `variable`, two arms, writing 1 where equal and 0 where not: with the register at 0, a
 * flip of a power variable or of the activity's flag.
 */
export function flipList(variable: number): Instruction[] {
  return [
    { opcode: CONDITION_OPCODE, operand: CONDITION_TWO_ARMS | variable },
    { opcode: STATE_WRITE_BASE + variable, operand: 1 },
    { opcode: STATE_WRITE_BASE + variable, operand: 0 },
  ];
}

/** One of a power variable's two silent writes, which nothing calls, `POWER_RESETS`: `07 FFFF` and the write. */
export function resetList(variable: number, value: number): Instruction[] {
  if (!POWER_RESETS.includes(value)) throw new ComposeError(`a power variable's silent write sets ${POWER_RESETS.join(' or ')}, not ${value}`);
  return [{ ...SILENT_WRITE }, { opcode: STATE_WRITE_BASE + variable, operand: value }];
}

/**
 * A device key's press: per device on the key, the timers cancelled, the key's pin switched on and its two timers
 * started, `07 FFFB`, `1F E9p2` and two `1F EBnn`, `blocks[k]` naming the block's timers in `KEY_TIMERS` order. A key
 * with a long press device holds the block twice, the second block's cancel stopping the first's timers, `devices.ts`.
 *
 * **The timers are the caller's numbers, both of them.** Our composer numbers a key's two timers consecutively, and
 * Logitech's compiler does not: the test setup's compile starts timers 14 and 7 in one block, the factory 350's 3 and
 * 2, and the programmed 350's 1 and 0, so a writer taking the first timer and counting on from it was a rule of our
 * numbering written into the shape, and the attribution of `todo-compile-350.md` 5.2.1 found it by failing to give
 * those lists back, `noscreenattribution.test.ts`. The timer numbers are description, `todo-compile-350.md` 5.1.8.
 */
export function pressList(pin: number, blocks: readonly (readonly number[])[]): Instruction[] {
  const pinOn = (PIN_BAND << 8) | (pin << 4) | KEY_TIMERS[KEY_TIMERS.length - 1]!.pinState;
  return blocks.flatMap((timers) => {
    if (timers.length !== KEY_TIMERS.length) throw new ComposeError(`a key's press starts ${KEY_TIMERS.length} timers, not ${timers.length}`);
    return [
      { ...CANCEL_TIMERS },
      { opcode: STATE_BAND, operand: pinOn },
      ...timers.map((timer) => ({ opcode: STATE_BAND, operand: (START_TIMER_BAND << 8) | timer })),
    ];
  });
}

/** A device key's release or held event: the timers cancelled and the device's map selected, `07 FFFB` and `1F FFmm`. */
export function selectList(map: number): Instruction[] {
  return [{ ...CANCEL_TIMERS }, { opcode: SELECT_BINDING_SET, operand: SELECT_BINDING_SET_MASK | map }];
}

/** One step of the activity's own list: a toggle's send list called and its wait, or a gate called. */
export type ActivityStepWrite =
  | { readonly kind: 'toggle'; readonly send: number; readonly group: number; readonly wait: number }
  | { readonly kind: 'call'; readonly list: number };

/**
 * Watch TV's own list: each device's power step in the archive's order, the flag's flip gated, the input writes gated
 * on the flag, and the channel device's map selected, `activity.ts`.
 */
export function activityList(steps: readonly ActivityStepWrite[], flagGate: number, conditionGate: number, map: number): Instruction[] {
  // The composer refuses an activity of no devices before it writes anything, so a list of no power step is no
  // activity's; said here as well, since the attribution reads lists with this writer and a start up list, two calls
  // and a select, would otherwise read as an activity of none.
  if (steps.length === 0) throw new ComposeError('an activity of no devices switches nothing');
  return [
    ...steps.flatMap((one): Instruction[] => (one.kind === 'toggle'
      ? [call(one.send), { opcode: DEVICE_QUANTITY, operand: (one.group << 8) | one.wait }]
      : [call(one.list)])),
    call(flagGate), call(conditionGate),
    { opcode: SELECT_BINDING_SET, operand: SELECT_BINDING_SET_MASK | map },
  ];
}

/** The arm of the activity's condition: nothing, one write, or a call of the list of several. */
export type ConditionArm =
  | { readonly kind: 'none' }
  | { readonly kind: 'write'; readonly variable: number; readonly value: number }
  | { readonly kind: 'call'; readonly list: number };

/** The activity's flag tested, and its arm: what the input gate calls, `[71 ff, arm]`. */
export function conditionList(flag: number, arm: ConditionArm): Instruction[] {
  const second: Instruction = arm.kind === 'none' ? { opcode: 0, operand: 0 }
    : arm.kind === 'write' ? { opcode: STATE_WRITE_BASE + arm.variable, operand: arm.value } : call(arm.list);
  return [{ opcode: CONDITION_OPCODE, operand: flag }, second];
}

/** The activity's input writes, where there are two or more: one write of each input variable. */
export function writesList(writes: readonly { readonly variable: number; readonly value: number }[]): Instruction[] {
  if (writes.length < 2) throw new ComposeError('one input write is the condition\'s own arm, and none is no list');
  return writes.map((one) => ({ opcode: STATE_WRITE_BASE + one.variable, operand: one.value }));
}

/** A favourite channel sent as a number: the number loaded and handed to number sender record 0, `7A nnnn` and `1F F300`. */
export function channelNumberList(channel: number): Instruction[] {
  return [{ opcode: ACCUMULATOR_LOAD_OPCODE, operand: channel }, { opcode: STATE_BAND, operand: NUMBER_SENDER_BAND << 8 }];
}

/** A favourite channel spelled out, which one with a leading zero is: each digit's send list called in turn. */
export function channelDigitsList(digitLists: readonly number[], channel: string): Instruction[] {
  return [...channel].map((digit) => {
    const list = digitLists[Number(digit)];
    if (list === undefined) throw new ComposeError(`no list sends the digit ${digit}`);
    return call(list);
  });
}

/** The timer record's length: `u8 0`, `u24` ticks, and the instruction it runs. */
export const TIMER_RECORD_LENGTH = 7;

/**
 * A device key's two timers, `KEY_TIMERS` in order: the key's pin switched off at 400 ticks and on at 600. Seven bytes
 * each, `devices.ts`.
 */
export function keyTimerRecords(pin: number): Uint8Array[] {
  return KEY_TIMERS.map((one) => new Writer(TIMER_RECORD_LENGTH)
    .u8(0).u24(one.ticks).u16((PIN_BAND << 8) | (pin << 4) | one.pinState).u8(STATE_BAND).bytes);
}

/**
 * The number sender's block as `favourites.ts` writes it: one digit table, a call of each digit's send list, which
 * the block holds three times, and the record, flags, base, minimum, prologue, epilogue and prefix all zero and its
 * three table pointers left zero for the caller, who knows where the tables went.
 */
export function numberSenderBlock(digitLists: readonly number[]): { table: Uint8Array; record: Uint8Array } {
  const table = new Writer(NUMBER_SENDER_TABLE_LENGTH);
  for (const list of digitLists) table.u16(list).u8(ACTION_LIST_INDEX_OPCODE);
  return { table: table.bytes, record: new Uint8Array(NUMBER_SENDER_RECORD_LENGTH) };
}

// ---------------------------------------------------------------------------------------------------------------
// The readers, one per kind of list

/**
 * One kind of list: its name, which the attribution reports, the reader that takes the numbers off a list, and the
 * writer that gives the list back from them. The numbers are flat so that the attribution can ask which bytes each
 * one reaches, by changing it and writing again, without knowing what any of them mean.
 */
export interface ListKind {
  readonly name: string;
  read(list: readonly Instruction[]): number[] | undefined;
  write(numbers: readonly number[]): Instruction[];
  /** What the numbers name, which the attribution holds to what the configuration has: a reader cannot see that. */
  names(numbers: readonly number[]): ListNames;
}

/** The things a list's numbers name, by kind, each of which has to exist in the configuration for the list to be credited. */
export interface ListNames {
  readonly lists?: readonly number[];
  /** A group and a record in it. */
  readonly records?: readonly (readonly [number, number])[];
  readonly groups?: readonly number[];
  readonly maps?: readonly number[];
  readonly timers?: readonly number[];
  readonly variables?: readonly number[];
  /** A device key's output pin, `DEVICE_KEYS`. */
  readonly pins?: readonly number[];
  /**
   * Lists that have to be of one of the kinds named, by the kinds' names: what the writer calls is part of what it
   * writes, a power action's steps are sends and a gate opens a flip or a condition, and a list of the same shape that
   * calls something else is another generator's or none's.
   */
  readonly calling?: readonly (readonly [number, readonly string[]])[];
}

/** The kinds a gate opens: a flip of a power variable or the flag, or the activity's condition. */
const GATED = ['flip lists', 'condition lists'] as const;

/** The kinds the family's composers write, in the order the attribution tries them; the first whose rebuild is the list owns it. */
export const NO_SCREEN_LIST_KINDS: readonly ListKind[] = [
  {
    name: 'send lists',
    read: (list) => (list.length === 3 && isCancel(list[0]) && list[1]!.opcode === SEND_INFRARED && list[2]!.opcode === DEVICE_QUANTITY
      ? [list[1]!.operand >> 8, list[1]!.operand & 0xff, list[2]!.operand & 0xff] : undefined),
    write: ([group, record, quantity]) => sendList(group!, record!, quantity!),
    names: ([group, record]) => ({ records: [[group!, record!]] }),
  },
  {
    name: 'power on lists',
    read: (list) => {
      const calls = list.findIndex((one) => !isCall(one));
      if (calls <= 0) return undefined;
      const waits = list.slice(calls);
      if (!waits.every((one) => one.opcode === DEVICE_QUANTITY)) return undefined;
      const total = waits.reduce((sum, one) => sum + (one.operand & 0xff), 0);
      return [waits[0]!.operand >> 8, total, ...list.slice(0, calls).map((one) => one.operand)];
    },
    write: ([group, total, ...calls]) => powerOnList(calls, group!, total!),
    names: ([group, , ...calls]) => ({ groups: [group!], lists: calls, calling: calls.map((one) => [one, ['send lists']] as const) }),
  },
  {
    name: 'gate lists',
    read: (list) => (list.length === 2 && list[0]!.opcode === STATE_BAND && list[0]!.operand >> 8 === BYTE_REGISTER_LOAD && isCall(list[1])
      ? [list[0]!.operand & 0xff, list[1]!.operand] : undefined),
    write: ([value, list]) => gateList(value!, list!),
    names: ([, list]) => ({ lists: [list!], calling: [[list!, GATED]] }),
  },
  {
    name: 'flip lists',
    read: (list) => (list.length === 3 && list[0]!.opcode === CONDITION_OPCODE ? [list[0]!.operand & 0xff] : undefined),
    write: ([variable]) => flipList(variable!),
    names: ([variable]) => ({ variables: [variable!] }),
  },
  {
    name: 'reset lists',
    read: (list) => (list.length === 2 && list[0]!.opcode === SILENT_WRITE.opcode && isWrite(list[1])
      && POWER_RESETS.includes(list[1]!.operand) ? [list[1]!.opcode - STATE_WRITE_BASE, list[1]!.operand] : undefined),
    write: ([variable, value]) => resetList(variable!, value!),
    names: ([variable]) => ({ variables: [variable!] }),
  },
  {
    name: 'key press lists',
    read: (list) => {
      const block = 2 + KEY_TIMERS.length;
      if (list.length === 0 || list.length % block !== 0 || list[1]?.opcode !== STATE_BAND) return undefined;
      // The pin, then every block's timers in order, `KEY_TIMERS.length` to a block.
      const timers: number[] = [];
      for (let at = 0; at < list.length; at += block) timers.push(...list.slice(at + 2, at + block).map((one) => one.operand & 0xff));
      return [(list[1]!.operand >> 4) & 0x0f, ...timers];
    },
    write: ([pin, ...timers]) => pressList(pin!, Array.from({ length: Math.ceil(timers.length / KEY_TIMERS.length) },
      (_, k) => timers.slice(KEY_TIMERS.length * k, KEY_TIMERS.length * (k + 1)))),
    names: ([pin, ...timers]) => ({ pins: [pin!], timers }),
  },
  {
    name: 'key select lists',
    read: (list) => (list.length === 2 && isCancel(list[0]) && isSelect(list[1]) ? [list[1]!.operand & 0xff] : undefined),
    write: ([map]) => selectList(map!),
    names: ([map]) => ({ maps: [map!] }),
  },
  {
    // The flat numbers: the map, the two gates, then per step a 1 and the send, group and wait of a toggle, or a 0 and
    // the list a gate is.
    name: 'activity lists',
    read: (list) => {
      if (list.length < 3 || !isSelect(list.at(-1)) || !isCall(list.at(-2)) || !isCall(list.at(-3))) return undefined;
      const steps: number[] = [];
      const body = list.slice(0, -3);
      for (let k = 0; k < body.length; k += 1) {
        const one = body[k]!;
        if (!isCall(one)) return undefined;
        const wait = body[k + 1];
        if (wait?.opcode === DEVICE_QUANTITY) {
          steps.push(1, one.operand, wait.operand >> 8, wait.operand & 0xff);
          k += 1;
        } else {
          steps.push(0, one.operand);
        }
      }
      return [list.at(-1)!.operand & 0xff, list.at(-3)!.operand, list.at(-2)!.operand, ...steps];
    },
    write: ([map, flagGate, conditionGate, ...flat]) => {
      const steps: ActivityStepWrite[] = [];
      for (let k = 0; k < flat.length;) {
        if (flat[k] === 1) {
          steps.push({ kind: 'toggle', send: flat[k + 1]!, group: flat[k + 2]!, wait: flat[k + 3]! });
          k += 4;
        } else {
          steps.push({ kind: 'call', list: flat[k + 1]! });
          k += 2;
        }
      }
      return activityList(steps, flagGate!, conditionGate!, map!);
    },
    names: ([map, flagGate, conditionGate, ...flat]) => {
      const lists = [flagGate!, conditionGate!];
      const groups: number[] = [];
      const calling: [number, readonly string[]][] = [[flagGate!, ['gate lists']], [conditionGate!, ['gate lists']]];
      for (let k = 0; k < flat.length;) {
        lists.push(flat[k + 1]!);
        if (flat[k] === 1) groups.push(flat[k + 2]!);
        calling.push([flat[k + 1]!, [flat[k] === 1 ? 'send lists' : 'gate lists']]);
        k += flat[k] === 1 ? 4 : 2;
      }
      return { maps: [map!], lists, groups, calling };
    },
  },
  {
    // The flat numbers: the flag, then 0 for no arm, 1 and the variable and value of a write, or 2 and a list.
    name: 'condition lists',
    read: (list) => {
      if (list.length !== 2 || list[0]!.opcode !== CONDITION_OPCODE || (list[0]!.operand & CONDITION_TWO_ARMS) !== 0) return undefined;
      const arm = list[1]!;
      if (arm.opcode === 0) return [list[0]!.operand, 0];
      if (isWrite(arm)) return [list[0]!.operand, 1, arm.opcode - STATE_WRITE_BASE, arm.operand];
      return isCall(arm) ? [list[0]!.operand, 2, arm.operand] : undefined;
    },
    write: ([flag, kind, a, b]) => conditionList(flag!, kind === 0 ? { kind: 'none' }
      : kind === 1 ? { kind: 'write', variable: a!, value: b! } : { kind: 'call', list: a! }),
    names: ([flag, kind, a]) => ({
      variables: kind === 1 ? [flag!, a!] : [flag!], lists: kind === 2 ? [a!] : [], calling: kind === 2 ? [[a!, ['input write lists']]] : [],
    }),
  },
  {
    name: 'input write lists',
    read: (list) => (list.length >= 2 && list.every(isWrite) ? list.flatMap((one) => [one.opcode - STATE_WRITE_BASE, one.operand]) : undefined),
    write: (flat) => writesList(Array.from({ length: flat.length / 2 }, (_, k) => ({ variable: flat[2 * k]!, value: flat[2 * k + 1]! }))),
    names: (flat) => ({ variables: flat.filter((_, k) => k % 2 === 0) }),
  },
  {
    name: 'channel lists',
    read: (list) => (list.length === 2 && list[0]!.opcode === ACCUMULATOR_LOAD_OPCODE ? [list[0]!.operand] : undefined),
    write: ([channel]) => channelNumberList(channel!),
    // The number sender record it hands the number to, record 0, is held by the attribution: a list names no record.
    names: () => ({}),
  },
  {
    // A power action of several steps, a list calling each step's send list in order: the shared device composer's,
    // `callingList` in `shared/devices.ts`, which every family's device composer runs, section 320. Last, since any
    // list of two calls or more reads as one, and the start up's and a spelled out channel's are claimed before it.
    name: 'action step lists',
    read: (list) => (list.length >= 2 && list.every(isCall) ? list.map((one) => one.operand) : undefined),
    write: (calls) => instructionsOf(callingList(calls).bytes),
    names: (calls) => ({ lists: calls, calling: calls.map((one) => [one, ['send lists']] as const) }),
  },
];

/** A list's bytes, `u8 count` and three bytes an instruction, as instructions: what a shared writer hands back read again. */
function instructionsOf(bytes: Uint8Array): Instruction[] {
  return Array.from({ length: bytes[0] ?? 0 }, (_, k) => ({
    operand: (bytes[1 + 3 * k] ?? 0) | ((bytes[2 + 3 * k] ?? 0) << 8), opcode: bytes[3 + 3 * k] ?? 0,
  }));
}

/**
 * The spelled out channel, read apart from the kinds above because its numbers are digits and not list indices: a
 * channel is only a channel against the number sender's digit table, which the attribution holds. Every call has to
 * name a digit's list, and the channel has to start with a zero, since a channel without one is sent as a number,
 * `favourites.ts`; so two or more digits.
 */
export function readChannelDigits(list: readonly Instruction[], digitLists: readonly number[]): string | undefined {
  if (list.length < 2 || !list.every(isCall)) return undefined;
  const digits = list.map((one) => digitLists.indexOf(one.operand));
  if (digits.some((digit) => digit < 0) || digits[0] !== 0) return undefined;
  return digits.join('');
}
