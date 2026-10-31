/**
 * Composing a device: its group, its state variables, its power and input lists, and on the Harmony 600,
 * 650 and 700 its delays. Plan 007's shared part, cut out of `compose.ts` unchanged. What a send is and
 * what a device needs for it, the delay prelude with its two delays or the send and its quantity alone, is
 * the family's, `Family.sends`, since `todo-compile-one.md` 3.3.3.4: the four slot family's `sends.ts` holds
 * the delays this module composed until then.
 */
import type { DelayDefaults, SendShape } from '../families/family.ts';
import { u24 } from '../bytes.ts';
import { Writer } from '../emit.ts';
import { archSlot, Container, parse } from '../gspm.ts';
import { DEVICE_QUANTITY_DEFAULT } from '../inventory.ts';
import { relocate } from '../relocate.ts';
import { ACTION_LIST_INDEX_OPCODE, STATE_RECORD_HEADER, STATE_VALUE_LENGTH } from '../sections.ts';
import {
  ACTION_TABLE_SLOT, appendNarrowStateVariable, ComposeError, nameOfLabel, restamped,
} from '../shared/core.ts';
import { appendTableEntries, type ComposeCommand, composeIrGroup, type ComposePowerStep, fillIrGroup } from '../shared/infrared.ts';

/** A device to compose whole: its label, its commands, and which command toggles the power. */
export interface ComposeDevice {
  /**
   * The word the config knows the device by, ASCII with no underscore, because a state
   * variable's name is `<label>_<property>_<values>` and the underscore is the separator that
   * makes the label recoverable, section 126.
   */
  readonly label: string;
  readonly commands: readonly ComposeCommand[];
  /** Which command is the power toggle, driving the device's one state variable. Default 0. */
  readonly power?: number;
  /**
   * The catalogue's power on and power off steps, each composed as a record of its own, section 309,
   * which the power variable's two transitions then send in place of `commands[power]`'s list. The two
   * may be the same step, a toggle, and then share one record. Absent means `power` is sent both ways,
   * which is what a composed device did before and what sends an ordinary press where Logitech's
   * catalogue asks for a held one: three frames where the Harmony 650's Panasonic needs four.
   *
   * **Several steps are an action performed in order**, section 320: the Knoll HDP-1100's catalogue
   * switches it off with its power toggle held for half a second, three times, and Logitech's compiler
   * wrote one list calling that step's send list three times, which is what the off transition runs. A
   * step stated twice is one record and one send list, called twice. `catalogueDevicePower` in
   * `devicepower.ts` reads these out of the catalogue.
   */
  readonly powerOn?: ComposePowerStep | readonly ComposePowerStep[];
  readonly powerOff?: ComposePowerStep | readonly ComposePowerStep[];
  /**
   * The amount of the `0x7C` paired with each power step's send, in tenths of a second: the catalogue's
   * inter key delay, section 320. Every power step send list Logitech compiled for the test devices of
   * the six power hold compiles carries its device's inter key delay there, 1, 4 or 5, while the same
   * devices' ordinary presses carry 1, which is what `commands` still get. Their compiler also adds, on
   * some devices, an uncalled second list per digit at the inter key delay and a second list for some
   * input commands at the input delay; what decides either is not read and neither is composed.
   * Default `DEVICE_QUANTITY_DEFAULT`, what a power step got before section 320.
   */
  readonly interKeyDelay?: number;
  /**
   * Arch 14 only: the inter device delay in tenths of a second, 0 to 20, which an activity's start,
   * All Off and Help queue in front of each of this device's commands, section 335. Default
   * `INTER_DEVICE_DELAY_DEFAULT`.
   */
  readonly interDeviceDelay?: number;
  /**
   * The power on delay in tenths of a second, waited after the power command when the device is
   * switched on. On arch 14 0 to 450, a variable mapped through base slot 14, default
   * `POWER_ON_DELAY_DEFAULT`. On the Harmony One 1 to 255, a bare `0x7C` wait at the end of the on list,
   * and none where it is not given.
   */
  readonly powerOnDelay?: number;
}

export interface ComposedDevice {
  bytes: Uint8Array;
  group: number;
  /** The base slot 10 list index per command, which is what a binding's 0x7f names. */
  lists: readonly number[];
  /**
   * The lists that perform the power actions, where `powerOn` and `powerOff` were given: what a
   * device page's power keys should name so that they send what the catalogue asks for rather than an
   * ordinary press. For an action of one step that is the step's own send list, equal for a toggle;
   * for several it is a list calling each step's send list in order, section 320. `off` is also what
   * the power variable runs to switch the device off. `on` never carries the power on delay, which
   * only the transition adds: no device mode key Logitech compiled runs one.
   */
  powerSteps?: { on?: number; off?: number };
  /** The device's power variable, in base slot 13's numbering. */
  variable: number;
  /**
   * Arch 14 only: what every command opens with, section 287. `variable` is the device's
   * `InterDeviceDelay_<identifier>`, `table` the base slot 14 record mapping it, `list` the one list
   * of the device's own that applies it, and `identifier` the number the variable's name carries.
   */
  delay?: { variable: number; table: number; list: number; identifier: number };
  /**
   * Arch 14 only: the power on delay, section 288. `variable` is `PowerOnDelay_<identifier>`,
   * `table` the base slot 14 record mapping it, `list` the list holding that `0x72`, and `on` the
   * list the power variable runs to switch the device on: the power command, then `list`.
   */
  powerOnDelay?: { variable: number; table: number; list: number; on: number };
}

/**
 * A power action as the ordered steps it performs: a single step is an action of one, and an empty
 * list is refused, since an action that sends nothing would leave the power variable's transition
 * pointing at a list that does nothing while every reader still finds a device there.
 */
function powerAction(
  given: ComposePowerStep | readonly ComposePowerStep[] | undefined, which: 'on' | 'off',
): readonly ComposePowerStep[] | undefined {
  if (given === undefined) return undefined;
  const steps = 'stated' in given ? [given] : given;
  if (steps.length === 0) throw new ComposeError(`a power ${which} action of no steps sends nothing`);
  return steps;
}

/** An action list of `0x7F` calls, one per list named, in order: an action's own list, and an on list. */
export function callingList(lists: readonly number[]): Writer {
  const body = new Writer(1 + 3 * lists.length).u8(lists.length);
  for (const list of lists) body.u16(list).u8(ACTION_LIST_INDEX_OPCODE);
  return body;
}

/** A device's infrared records in the order its group holds them, `deviceRecords`. */
export interface DeviceRecords {
  /** The power actions, each an ordered list of steps, where the device states them. */
  readonly onSteps?: readonly ComposePowerStep[];
  readonly offSteps?: readonly ComposePowerStep[];
  /** The distinct power steps, each a record after the commands. */
  readonly steps: readonly ComposePowerStep[];
  /** A step's record index in the group, which is also its send list's place after the commands'. */
  readonly stepIndex: (step: ComposePowerStep) => number;
  /** One per record, in group order: the commands, then the power steps. */
  readonly sends: readonly ComposeCommand[];
}

/**
 * What a device's group holds and in which order: every command, then each distinct power step as a record of
 * its own. `composeDeviceFor` composes the group from this, and `composeDonorDeviceInfrared` in
 * `composecatalogue.ts` puts the same records in a donor device's place, `todo-compile-one.md` 8.1.3, so the
 * order a composed device's records take is derived once.
 */
export function deviceRecords(device: ComposeDevice): DeviceRecords {
  // The power actions, each an ordered list of steps; a single step is an action of one.
  const onSteps = powerAction(device.powerOn, 'on');
  const offSteps = powerAction(device.powerOff, 'off');

  // The power steps, each a record after the commands, one per distinct step so that a toggle's two
  // transitions send one record, as Logitech's compile of a toggle does, and so that a step an action
  // states three times is one record called three times, as their compile of the Knoll's off does.
  const stepKey = (step: ComposePowerStep) => `${step.stated}|${step.holdMs ?? ''}`;
  const steps: ComposePowerStep[] = [];
  for (const step of [...(onSteps ?? []), ...(offSteps ?? [])]) {
    if (!steps.some((one) => stepKey(one) === stepKey(step))) steps.push(step);
  }
  const stepIndex = (step: ComposePowerStep) =>
    device.commands.length + steps.findIndex((one) => stepKey(one) === stepKey(step));
  const sends: ComposeCommand[] = [
    ...device.commands,
    ...steps.map((step): ComposeCommand => ({
      ...(step.holdMs === undefined
        ? { stated: step.stated, held: false, leadInUs: 0 }
        : { stated: step.stated, holdMs: step.holdMs }),
      ...(step.blocks === undefined ? {} : { blocks: step.blocks }),
      ...(step.read === undefined ? {} : { read: step.read }),
      ...(step.toggled === undefined ? {} : { toggled: step.toggled }),
    })),
  ];
  return {
    ...(onSteps === undefined ? {} : { onSteps }),
    ...(offSteps === undefined ? {} : { offSteps }),
    steps, stepIndex, sends,
  };
}

/**
 * Where a family puts what `composeDeviceFor` adds, where it differs from where the composer puts it otherwise.
 * Absent, the infrared group is appended to the table and the device's lists go in a hole right below the action
 * table, which is where the Harmony 600, 650, 700 and One have them. A family that needs otherwise says so here
 * rather than the composer testing which remote it is for.
 */
export interface DevicePlacement {
  /** An empty group of the table to put the device's records into, `fillIrGroup`, rather than appending one. */
  readonly group?: number;
  /**
   * The blob offset the device's action lists go in at, read off the configuration they go into. Needed where the
   * section in front of the action table is a counted array its reader demands fill the gap to the next section
   * exactly, so that a hole there would make it stop reading: the Harmony 300 and 350's key maps, raw slot 6.
   */
  listsAt?(c: Container): number;
}

export function composeDeviceFor(
  c: Container, device: ComposeDevice, shape: SendShape, delayDefaults?: DelayDefaults, placement: DevicePlacement = {},
): ComposedDevice {
  if (device.label === '' || device.label.includes('_')
      || [...device.label].some((ch) => ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) > 0x7e)) {
    throw new ComposeError('a label is printable ASCII with no underscore, per the name grammar');
  }
  const power = device.power ?? 0;
  if (device.commands[power] === undefined) {
    throw new ComposeError(`command ${power} cannot toggle the power: there is no such command`);
  }
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');

  // The amount a power step's `0x7C` carries, the catalogue's inter key delay where the caller states
  // it, section 320; an ordinary command's stays 1. One byte of the operand, the group the other.
  const quantity = device.interKeyDelay ?? DEVICE_QUANTITY_DEFAULT;
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 0xff) {
    throw new ComposeError(`an inter key delay is 0 to 255 tenths of a second, not ${quantity}`);
  }

  const { onSteps, offSteps, steps, stepIndex, sends } = deviceRecords(device);

  // The infrared half, then everything else on the reparsed result.
  const group = placement.group === undefined ? composeIrGroup(c, sends) : fillIrGroup(c, placement.group, sends);

  // One action list per command, in a hole below the action table, each named by a pointer appended
  // to the table. The list index is what the transitions below and phase 6's screen bindings point
  // at.
  //
  // **Two instructions and not one**, `u8 2; u16 (group << 8) | record; u8 0x7d;
  // u16 (group << 8) | amount; u8 0x7c`. This emitted the send alone until 8 September 2026 and the
  // result was a device that answered every button press and sent nothing when an activity asked
  // for it, on hardware. `DEVICE_QUANTITY`'s docstring carries the measurement, section 278: every
  // send list Logitech's generator wrote is this pair, none is bare, and the bare form is not sent
  // when an activity's state transition runs it. On arch 14 every real one also opens with a `0x7F`,
  // the delay step, which the four slot family's send emits since section 287.
  //
  // **What a send is, and what a device needs for it, is the family's**, `Family.sends`, since
  // `todo-compile-one.md` 3.3.3.4: on the Harmony 600, 650 and 700 the device's two delays, each a variable
  // and the base slot 14 table that maps it, composed here before any list, sections 287 and 288, and a
  // delay the device does not state is the family's choice, `CommonChoices.delays`; on the Harmony One
  // nothing. Each family's `sends.ts` holds its own.
  const deviceSends = shape.device(parse(group.bytes), group.group, device, delayDefaults);
  let current = deviceSends.container;

  const actionSlot = archSlot(c.architecture, ACTION_TABLE_SLOT);
  const actionTable = current.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  // Each list is `u8 count` and three bytes per instruction. Every record gets a send list, the power
  // steps' after the commands', and the family lays out whatever its sends need after them.
  const firstList = actionTable.values.length;
  // The send list of each step of an action, in order, or of the power command where no action is
  // given, which is what the transitions below call.
  const sendListsOf = (action: readonly ComposePowerStep[] | undefined): number[] =>
    action === undefined ? [firstList + power] : action.map((step) => firstList + stepIndex(step));
  const onCalls = sendListsOf(onSteps);
  const offCalls = sendListsOf(offSteps);
  const laid = deviceSends.lay(firstList, sends.map((_, k) => ({
    record: k, quantity: k < device.commands.length ? DEVICE_QUANTITY_DEFAULT : quantity,
  })), onCalls);
  const bodies: Writer[] = [...laid.bodies];
  // An action of several steps gets a list of its own calling each step's send list in order, section
  // 320, laid out after everything above so that no index a caller already relies on moves. The off
  // action's is what the off transition runs, as in Logitech's compile of the Knoll; the on action's
  // is for a device page's power key only, since the on transition calls the steps itself.
  let nextList = laid.next;
  const offAction = offCalls.length > 1 ? nextList++ : undefined;
  const onAction = onCalls.length > 1 ? nextList++ : undefined;
  if (offAction !== undefined) bodies.push(callingList(offCalls));
  if (onAction !== undefined) bodies.push(callingList(onCalls));
  const listsAt = placement.listsAt?.(current) ?? actionTable.start;
  const listsLength = bodies.reduce((sum, body) => sum + body.bytes.length, 0);
  const listsHole = relocate(current, listsAt, listsLength);
  const listAddresses: number[] = [];
  let listAt = listsAt;
  for (const body of bodies) {
    if (body.remaining !== 0) throw new ComposeError(`a list is ${body.remaining} bytes short`);
    listsHole.bytes.set(body.bytes, listAt);
    listAddresses.push(current.flashBase + listAt);
    listAt += body.bytes.length;
  }
  current = parse(appendTableEntries(parse(listsHole.bytes), actionSlot, listAddresses));

  // The power variable: a seven byte header and two transitions, each running the power command's
  // list, except that on arch 14 switching on runs the list that follows it with the power on delay,
  // as every compiled device there does, section 288. `first` is 0 because nothing is running when a config is generated, section 130, and the
  // maximum is 1 because a power switch has two states, which is also what the node's trailing
  // count states, section 86.
  const recordLength = STATE_RECORD_HEADER + STATE_VALUE_LENGTH * 2;
  // What performs each action: a step's own send list for an action of one, the action's own list for
  // several. The off transition runs `offSend`; the on transition runs the on list where there is a
  // power on delay to follow it, and `onSend` otherwise.
  const onSend = onAction ?? (onCalls[0] as number);
  const offSend = offAction ?? (offCalls[0] as number);
  const switchOn = laid.switchOn ?? onSend;
  const record = new Writer(recordLength)
    .u16(0).u16(1).u16(2).u8(0)
    .u8(0).u16(0).u16(1).u16(switchOn).u8(ACTION_LIST_INDEX_OPCODE)
    .u8(0).u16(1).u16(0).u16(offSend).u8(ACTION_LIST_INDEX_OPCODE);

  // The state table is not a counted pointer array, so its append is spelled out: three bytes at
  // the end of its entry pointers, then the header at its start.
  //
  // **Two words move, not one, and getting that wrong produced a config the remote accepts and
  // ignores**, section 276. The new pointer goes on the end, so its index is at or above the
  // table's own `narrow` threshold and the variable is a wide one: `wide` has to say so. The
  // firmware sizes the variable storage as `narrow + 2 * wide` and **fills every byte above it with
  // `0xFE` at each boot**, while the seeding loop runs first and over `count`. So raising `count`
  // alone buys a variable that is seeded correctly and then painted over, holding 65278 rather than
  // the 0 its record states. That is what a device added to the spare Harmony One did: the activity
  // appeared on the menu, beeped, and started nothing, and the `0xFE` run on the connected remote
  // begins at exactly the byte this arithmetic predicts.
  //
  // **The pointer goes in at `narrow`, so the new variable is a one byte one**, section 277, which
  // is a reversal: appending it at the end made it a two byte variable, and **no two byte variable
  // anywhere in the corpus carries a transition**, 0 of 64, against 91 of 194 one byte ones. A
  // device's power variable is nothing but its transitions, so the appended shape is one Logitech's
  // generator has never emitted. Measured on hardware too: the appended version set its variable
  // correctly on a connected Harmony One and no code went out, where the same remote's own activity
  // drives the same television through variable 36, below `narrow`, with the same two transitions.
  //
  // The price is a renumbering, which is why the first attempt avoided it. Every variable at or
  // above `narrow` shifts up by one and every reference to one has to move with it, and those
  // references are real rather than spare: on the four programmed arch 12 (Harmony One) containers
  // the single top variable is named by 22 to 40 instructions. `renumberStateVariables` below is
  // that rewrite, and it is the reason this insertion is three steps rather than one.
  //
  // **The steps live in `appendNarrowStateVariable` since section 321**, where a device's input
  // variables needed the same insertion: one copy of the derivation rather than two, and the record
  // built here is handed over whole. The name tree node is `<label>_Power_2`, indexed by the new
  // variable.
  const appended = appendNarrowStateVariable(current, record.bytes, `${nameOfLabel(device.label)}_Power_2`);
  const variable = appended.variable;
  const named = parse(appended.bytes);

  // What the family's sends added that the caller is told of, read back after the renumbering: the four
  // slot family's delay variables were appended at the end, so they moved up by one.
  const delays = laid.described(named);

  return {
    bytes: restamped(named.blob),
    group: group.group,
    lists: device.commands.map((_, k) => firstList + k),
    ...(steps.length === 0 ? {} : { powerSteps: {
      ...(device.powerOn === undefined ? {} : { on: onSend }),
      ...(device.powerOff === undefined ? {} : { off: offSend }),
    } }),
    variable,
    ...delays,
  };
}
