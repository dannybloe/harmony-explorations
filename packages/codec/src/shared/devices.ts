/**
 * Composing a device: its group, its state variables, its power and input lists, and on the Harmony 600,
 * 650 and 700 its delays. Plan 007's shared part, cut out of `compose.ts` unchanged. The delays and the
 * send prelude are still chosen by the architecture inside these functions; `todo-compile-650.md` 10.7.2's
 * last stage hands them to the family.
 */
import { DELAY_MAX } from '../statetables.ts';
import type { DelayDefaults, FamilyTraits } from '../families/family.ts';
import { STATE_BAND } from '../actions.ts';
import { u24 } from '../bytes.ts';
import { Writer } from '../emit.ts';
import { archSlot, Container, parse } from '../gspm.ts';
import {
  CONDITION_OPCODE, DEVICE_QUANTITY, DEVICE_QUANTITY_DEFAULT, INTER_DEVICE_DELAY_VALUES, interDeviceDelayCases,
  MAP_VALUE_OPCODE, POWER_ON_DELAY_CASES, POWER_ON_DELAY_CHUNK, POWER_ON_DELAY_VALUES, powerOnDelayAmounts,
  powerOnDelayCases, powerOnDelays, QUEUE_INTER_DEVICE_DELAY, SEND_INFRARED, SEND_PRELUDE_LOAD, sendPreludeCondition,
  sendPreludes,
} from '../inventory.ts';
import { relocate } from '../relocate.ts';
import { SCREEN_END } from '../screen.ts';
import {
  ACTION_LIST_INDEX_OPCODE, assertStateTableConsistent, STATE_RECORD_HEADER, STATE_TABLE_HEADER, STATE_VALUE_LENGTH,
  stateTable,
} from '../sections.ts';
import { arch14Starts } from '../shared/activities.ts';
import {
  ACTION_TABLE_SLOT, appendActionLists, appendNameNode, appendNarrowStateVariable, appendValueMap, ComposeError, nameOfLabel,
  nextDeviceIdentifier, queueing, restamped, STATE_WRITE_LIMIT, stateRecordEnd,
} from '../shared/core.ts';
import { appendTableEntries, type ComposeCommand, composeIrGroup, type ComposePowerStep } from '../shared/infrared.ts';

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
   * Arch 14 only: the power on delay in tenths of a second, 0 to 450, queued after the power
   * command when the device is switched on. Default `POWER_ON_DELAY_DEFAULT`.
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

/** An action list of `0x7F` calls, one per list named, in order. */
function callingList(lists: readonly number[]): Writer {
  const body = new Writer(1 + 3 * lists.length).u8(lists.length);
  for (const list of lists) body.u16(list).u8(ACTION_LIST_INDEX_OPCODE);
  return body;
}

export function composeDeviceFor(
  c: Container, device: ComposeDevice, traits: FamilyTraits, delayDefaults?: DelayDefaults,
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

  // The infrared half, then everything else on the reparsed result.
  const group = composeIrGroup(c, sends);

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
  // the delay step, which this emits since section 287; see below.
  let current = parse(group.bytes);

  // The Harmony 600, 650 and 700, `FamilyTraits.sendPrelude`: the device's two delays, each a variable and the base slot 14 table that maps it,
  // which every command's prelude and the power on list below name. Sections 287 and 288.
  // A delay the device does not state is its family's choice, `CommonChoices.delays`.
  if (traits.sendPrelude && delayDefaults === undefined) throw new ComposeError('the family states no delays a device starts with');
  const delay = traits.sendPrelude && delayDefaults !== undefined
    ? composeDelays(current, group.group,
                    device.interDeviceDelay ?? delayDefaults.interDevice,
                    device.powerOnDelay ?? delayDefaults.powerOn)
    : undefined;
  if (delay !== undefined) current = parse(delay.bytes);

  const actionSlot = archSlot(c.architecture, ACTION_TABLE_SLOT);
  const actionTable = current.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  // Each list is `u8 count` and three bytes per instruction. On arch 14 a send opens with a call,
  // so it is three instructions, and the device gains one delay list plus two lists per command,
  // laid out after the sends: delay, then load and condition for command 0, then for command 1;
  // then the power on delay list and the list the power variable runs to switch the device on,
  // which calls the power command and then that delay list.
  // Every record gets a send list, the power steps' after the commands', so `n` counts both.
  const n = sends.length;
  const firstList = actionTable.values.length;
  const sendBytes = delay === undefined ? 7 : 10;
  const delayList = firstList + n;
  const loadList = (k: number): number => delayList + 1 + 2 * k;
  const bodies: Writer[] = sends.map((_, k) => {
    const send = new Writer(sendBytes).u8(delay === undefined ? 2 : 3);
    if (delay !== undefined) send.u16(loadList(k)).u8(ACTION_LIST_INDEX_OPCODE);
    return send
      .u16((group.group << 8) | k).u8(SEND_INFRARED)
      .u16((group.group << 8) | (k < device.commands.length ? DEVICE_QUANTITY_DEFAULT : quantity))
      .u8(DEVICE_QUANTITY);
  });
  const powerDelayList = delayList + 1 + 2 * n;
  const onList = powerDelayList + 1;
  // The send list of each step of an action, in order, or of the power command where no action is
  // given, which is what the transitions below call.
  const sendListsOf = (action: readonly ComposePowerStep[] | undefined): number[] =>
    action === undefined ? [firstList + power] : action.map((step) => firstList + stepIndex(step));
  const onCalls = sendListsOf(onSteps);
  const offCalls = sendListsOf(offSteps);
  // An action of several steps gets a list of its own calling each step's send list in order, section
  // 320, laid out after everything above so that no index a caller already relies on moves. The off
  // action's is what the off transition runs, as in Logitech's compile of the Knoll; the on action's
  // is for a device page's power key only, since the on transition calls the steps itself.
  let nextList = delay === undefined ? firstList + n : onList + 1;
  const offAction = offCalls.length > 1 ? nextList++ : undefined;
  const onAction = onCalls.length > 1 ? nextList++ : undefined;
  if (delay !== undefined) {
    const spacing = delay.interDevice;
    bodies.push(new Writer(4).u8(1).u16((spacing.table << 8) | spacing.variable).u8(MAP_VALUE_OPCODE));
    sends.forEach((_, k) => {
      bodies.push(new Writer(7).u8(2)
        .u16(delay.loadOperand).u8(STATE_BAND)
        .u16(loadList(k) + 1).u8(ACTION_LIST_INDEX_OPCODE));
      bodies.push(new Writer(7).u8(2)
        .u16(delay.conditionOperand).u8(CONDITION_OPCODE)
        .u16(delayList).u8(ACTION_LIST_INDEX_OPCODE));
    });
    const waits = delay.powerOn;
    bodies.push(new Writer(4).u8(1).u16((waits.table << 8) | waits.variable).u8(MAP_VALUE_OPCODE));
    // The on list: every step of the on action, then the power on delay. For one step that is the
    // shape every arch 14 device Logitech compiled has, section 288. **For several it is inferred**:
    // the steps are called in this list directly rather than through the action's own list, which is
    // what the one step shape extends to, and no compile here switches a device on in several steps.
    bodies.push(callingList([...onCalls, powerDelayList]));
  }
  if (offAction !== undefined) bodies.push(callingList(offCalls));
  if (onAction !== undefined) bodies.push(callingList(onCalls));
  const listsAt = actionTable.start;
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
  const switchOn = delay === undefined ? onSend : onList;
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

  // The delay variables were appended at the end, so the renumbering moved them up by one, and the
  // delay lists' `0x72`s with them. Read back rather than assumed.
  const renumbered = (list: number, one: { variable: number; table: number }): number => {
    const mapped = named.actionLists()?.[list]?.[0];
    if (mapped?.opcode !== MAP_VALUE_OPCODE || mapped.operand >>> 8 !== one.table
        || (mapped.operand & 0xff) !== one.variable + 1) {
      throw new ComposeError(`delay list ${list} does not name its renumbered variable`);
    }
    return one.variable + 1;
  };
  const delays = delay === undefined ? {} : {
    delay: {
      variable: renumbered(delayList, delay.interDevice), table: delay.interDevice.table,
      list: delayList, identifier: delay.identifier,
    },
    powerOnDelay: {
      variable: renumbered(powerDelayList, delay.powerOn), table: delay.powerOn.table,
      list: powerDelayList, on: onList,
    },
  };

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

/*
 * ---- The arch 14 delays, sections 287 and 288 ----
 *
 * **Every command Logitech's compiler writes for a Harmony 600, 650 or 700 opens with a call**, and
 * a composed one did not until section 287. `SendPrelude` in `inventory.ts` is the reading: a private
 * list that loads 1, a private list that runs the device's delay list only while the configuration's
 * start sequence variable equals it, and the delay list, one `0x72` mapping the device's
 * `InterDeviceDelay_<identifier>` through a base slot 14 table whose case for each value queues that
 * many tenths for the device's group. So in an activity's start, in All Off and in Help, the lists
 * that raise that variable, each command waits its device's inter device delay, and a device's own
 * command pressed in device mode, which reaches no such list, does not, section 335. The bench Harmony
 * 650 shows it in a start and in All Off: the device's own command waits a tenth of a second per
 * unit, and the wait seems to begin once the code before it has gone, which assumes the list's
 * instructions all ran first. Sections 285 and 287 read this from three of the 650's start sequences
 * alone and missed All Off and Help.
 *
 * **And a device's power on list ends with its power on delay**, section 288, `PowerOnDelay` in
 * `inventory.ts`: the `Power` variable's off to on transition runs a list that calls the power
 * command and then one `0x72` mapping `PowerOnDelay_<identifier>` through a 451 case table, whose
 * case for each value up to 450 tenths queues that value as `0x7C` quantities for the device's group,
 * a hundred at a time, a case above 100 through a list of its own. The off transition sends a code of
 * the device with no delay; a composed device sends its power off action there, the catalogue's own since
 * section 320, or its one power command where none is given.
 *
 * A composed device gets the same pieces the compiler gives one, and nothing is shared with another
 * device except the start sequence variable, which is the configuration's. **Since section 319 none
 * of the three is copied**: the load and the condition are built, `SEND_PRELUDE_LOAD` and
 * `sendPreludeCondition` over the start variable the configuration's activities raise, both tables'
 * case order is `compilerCaseOrder`'s, and the identifier is `nextDeviceIdentifier`'s. Until then the
 * operands were copied off the configuration's own preludes and the power on order off one of its own
 * tables. **Two of the three are checked against what the configuration holds**: its preludes against
 * the built operands, and its power on tables against the built order, a disagreement being refused
 * rather than either side picked. The identifier is checked against nothing, since it only has to be
 * new, and the configuration's inter device tables are not checked against `INTER_DEVICE_DELAY_VALUES`.
 *
 * **What the change did to the refusals**, all in `composeDelays`. Two went: a configuration with no
 * power on delay table to copy an order off, and one whose first prelude's table did not read as an
 * inter device delay table, neither of which the composer needs any more. One came: the start variable
 * was read off the activities through `arch14Starts`, so composing a device on arch 14 needed at least
 * one activity. **That one went again in section 329**: the start variable is read off the Off key map,
 * `startSequenceOf`, one per configuration on each of the thirteen compiles, and every activity is
 * checked against it, so a configuration with an Off key map and no activity composes again and one
 * whose activities raise another variable is refused. No configuration without an activity exists here
 * to show that every one has an Off key map.
 *
 * **What is deliberately not composed**: the device's other six delay variables, the defaults and the
 * two counter and flag pairs; the second table each device carries on each of its two delay
 * variables, whose cases call lists rather than queue a delay and whose reader is unread; and the
 * remote's "Set to default" page. That page is how `deviceIdOfGroup` joins a device to its
 * identifier, so `deviceDelays` still does not report a composed device.
 */




interface ComposedDelays {
  bytes: Uint8Array;
  identifier: number;
  loadOperand: number;
  conditionOperand: number;
  /** Both variables as numbered before the power variable's renumbering, and their tables. */
  interDevice: { variable: number; table: number };
  powerOn: { variable: number; table: number };
}

/**
 * A two byte state variable with no transitions, appended at the end of base slot 13 and named.
 *
 * All the compiled delay variables sit above `narrow`, though none is last, and appending means
 * `count` and `wide` both move and nothing is renumbered here.
 */
function appendDelayVariable(
  c: Container, name: string, first: number,
): { bytes: Uint8Array; variable: number } {
  const recordAt = stateRecordEnd(c);
  const recordHole = relocate(c, recordAt, STATE_RECORD_HEADER);
  recordHole.bytes.set(new Writer(STATE_RECORD_HEADER)
    .u16(first).u16(DELAY_MAX).u16(0).u8(0).bytes, recordAt);
  let current = parse(recordHole.bytes);
  const states = stateTable(current);
  if (states === undefined) throw new ComposeError('base slot 13 stopped reading');
  const variable = states.count;
  if (variable >= STATE_WRITE_LIMIT) {
    throw new ComposeError(`a delay variable at ${variable} is past what a write opcode can name`);
  }
  const entryAt = states.start + STATE_TABLE_HEADER + 3 * variable;
  const entryHole = relocate(current, entryAt, 3);
  entryHole.bytes.set(new Writer(3).u24(current.flashBase + recordAt).bytes, entryAt);
  entryHole.bytes.set(new Writer(8)
    .u16(states.count + 1).u16(states.narrow).u16(states.wide + 1).u16(states.narrowAgain).bytes,
  states.start);
  current = parse(entryHole.bytes);
  assertStateTableConsistent(current);
  return { bytes: appendNameNode(current, name, variable), variable };
}

/**
 * Give a device on arch 14 its two delays: the variables, their names, the power on table's chunk
 * lists, and the two tables. The lists that name the tables are `composeDevice`'s.
 *
 * Both variables carry `nextDeviceIdentifier`'s identifier. The prelude's operands are built from the
 * start variable, which is the one thing about them the configuration decides, and both tables take
 * `compilerCaseOrder`'s case order; section 319.
 */
function composeDelays(c: Container, group: number, interDevice: number, powerOn: number): ComposedDelays {
  if (!Number.isInteger(interDevice) || !INTER_DEVICE_DELAY_VALUES.includes(interDevice)) {
    throw new ComposeError(`an inter device delay is 0 to 20 tenths of a second, not ${interDevice}`);
  }
  if (!Number.isInteger(powerOn) || powerOn < 0 || powerOn >= POWER_ON_DELAY_CASES) {
    throw new ComposeError(`a power on delay is 0 to 450 tenths of a second, not ${powerOn}`);
  }
  // The prelude's operands, built: the load is a constant and the condition compares the start
  // sequence variable, which is the one the configuration's activities raise for the length of their
  // start, section 289, read off its Off key map and checked against every activity by `arch14Starts`,
  // section 329. The configuration's own preludes are checked against it, so a configuration whose
  // commands test some other variable is refused rather than given a second one.
  const loadOperand = SEND_PRELUDE_LOAD;
  const conditionOperand = sendPreludeCondition(arch14Starts(c).startVariable);
  for (const one of sendPreludes(c)) {
    if (one.loadOperand !== loadOperand || one.conditionOperand !== conditionOperand) {
      throw new ComposeError(`list ${one.list}'s prelude is not the one built for this configuration`);
    }
  }
  // The power on table's case order, built; the configuration's own tables are checked against it
  // for the same reason, one order on all 71 of the thirteen compiles.
  const order = POWER_ON_DELAY_VALUES;
  for (const one of powerOnDelays(c)) {
    if ((powerOnDelayCases(c, one.table) ?? []).map((k) => k.value).join() !== order.join()) {
      throw new ComposeError(`base slot 14 record ${one.table} is a power on delay table in another order`);
    }
  }

  const identifier = nextDeviceIdentifier(c);

  // The variables, power on first, which is the order the compiler numbers them in on 9 of the 15
  // devices and not a rule; nothing reads the order.
  const powered = appendDelayVariable(c, `PowerOnDelay_${identifier}_${DELAY_MAX + 1}`, powerOn);
  const spaced = appendDelayVariable(parse(powered.bytes),
    `InterDeviceDelay_${identifier}_${DELAY_MAX + 1}`, interDevice);
  let current = parse(spaced.bytes);

  // The lists a case above 100 calls, one per value from 101 to 450, laid out as the compiler lays
  // them out: contiguous and in the table's own case order, not in value order, on 15 of 15.
  const chunked = order.filter((value) => value > POWER_ON_DELAY_CHUNK);
  const chunks = appendActionLists(current, chunked.map((value) =>
    powerOnDelayAmounts(value).map((amount) => [(group << 8) | amount, DEVICE_QUANTITY] as const)));
  current = parse(chunks.bytes);
  const chunkOf = new Map(chunked.map((value, k) => [value, chunks.first + k]));

  const inter = appendValueMap(current, INTER_DEVICE_DELAY_VALUES,
    INTER_DEVICE_DELAY_VALUES.map((value) => queueing((group << 8) | value, QUEUE_INTER_DEVICE_DELAY)));
  current = parse(inter.bytes);
  const power = appendValueMap(current, order, order.map((value) => {
    if (value === 0) return Uint8Array.of(SCREEN_END);
    const list = chunkOf.get(value);
    return list === undefined
      ? queueing((group << 8) | value, DEVICE_QUANTITY)
      : queueing(list, ACTION_LIST_INDEX_OPCODE);
  }));
  current = parse(power.bytes);

  // Both tables read back as what they are, through the readers the corpus was measured with.
  const spacing = interDeviceDelayCases(current, inter.table);
  if (spacing === undefined || spacing.length !== INTER_DEVICE_DELAY_VALUES.length
      || spacing.some((one) => one.group !== group || one.tenths !== one.value)) {
    throw new ComposeError('the composed inter device delay table does not read back as one');
  }
  const waits = powerOnDelayCases(current, power.table);
  if (waits === undefined || waits.length !== POWER_ON_DELAY_CASES
      || waits.some((one) => one.group !== group
        || one.amounts.join() !== powerOnDelayAmounts(one.value).join())) {
    throw new ComposeError('the composed power on delay table does not read back as one');
  }
  return {
    bytes: current.blob, identifier,
    loadOperand, conditionOperand,
    interDevice: { variable: spaced.variable, table: inter.table },
    powerOn: { variable: powered.variable, table: power.table },
  };
}
