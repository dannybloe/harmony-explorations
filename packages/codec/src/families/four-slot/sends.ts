/**
 * The four slot family's send, the Harmony 600, 650 and 700, section 287: every command opens with a call
 * into a delay step of three lists, a load and a condition private to the command and a delay list shared by
 * the device, and every device carries the two delay variables and the base slot 14 tables that map them,
 * section 288. `FOUR_SLOT_SENDS` is what the shared composers ask, `Family.sends`: the device composer for a
 * device's lists, the input composer for a send of a composed device, and the sequence composer for the
 * configuration's sends and a new one.
 *
 * Moved out of `shared/devices.ts`, `inputs.ts` and `sequence.ts` with `todo-compile-one.md` 3.3.3.4, where
 * each module tested a trait, `sendPrelude`, and built this shape itself; nothing in what is built changed.
 * The donor input matcher has no answer here, `SendShape.donorSendList` absent: it matches a send and its
 * quantity alone, and nothing has matched a send behind this prelude.
 */
import { STATE_BAND } from '../../actions.ts';
import type { DelayDefaults, DeviceSends, ListBody, SendList, SendShape } from '../family.ts';
import { Writer } from '../../emit.ts';
import { Container, type Instruction, parse } from '../../gspm.ts';
import {
  CONDITION_OPCODE, DEVICE_QUANTITY, INTER_DEVICE_DELAY_VALUES, interDeviceDelayCases, MAP_VALUE_OPCODE,
  POWER_ON_DELAY_CASES, POWER_ON_DELAY_CHUNK, POWER_ON_DELAY_VALUES, powerOnDelayAmounts, powerOnDelayCases,
  powerOnDelays, QUEUE_INTER_DEVICE_DELAY, SEND_INFRARED, SEND_PRELUDE_LOAD, sendPreludeCondition, sendPreludes,
} from '../../inventory.ts';
import { relocate } from '../../relocate.ts';
import { SCREEN_END } from '../../screen.ts';
import {
  ACTION_LIST_INDEX_OPCODE, assertStateTableConsistent, STATE_RECORD_HEADER, STATE_TABLE_HEADER, stateTable,
} from '../../sections.ts';
import {
  appendActionLists, appendNameNode, appendValueMap, ComposeError, nextDeviceIdentifier, queueing, STATE_WRITE_LIMIT,
  stateRecordEnd,
} from '../../shared/core.ts';
import type { ComposeDevice, ComposedDevice } from '../../shared/devices.ts';
import { callingList } from '../../shared/devices.ts';
import { arch14Starts } from './start.ts';
import { DELAY_MAX } from './statetables.ts';

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

/*
 * ---- A device's lists, `composeDeviceFor`'s family half ----
 */

/**
 * A device's two delays composed into the configuration, then its lists laid out after its sends: each send
 * opens with a call, so it is three instructions, and the device gains one delay list plus two lists per
 * send, laid out after the sends: delay, then load and condition for send 0, then for send 1; then the power
 * on delay list and the list the power variable runs to switch the device on, which calls the on action's
 * steps and then that delay list. A delay the device does not state is the family's choice,
 * `CommonChoices.delays`.
 */
function fourSlotDevice(c: Container, group: number, device: ComposeDevice, delays: DelayDefaults | undefined): DeviceSends {
  if (delays === undefined) throw new ComposeError('the family states no delays a device starts with');
  const delay = composeDelays(c, group, device.interDeviceDelay ?? delays.interDevice, device.powerOnDelay ?? delays.powerOn);
  return {
    container: parse(delay.bytes),
    lay(firstList, sends, onCalls) {
      const n = sends.length;
      const delayList = firstList + n;
      const loadList = (k: number): number => delayList + 1 + 2 * k;
      const bodies: Writer[] = sends.map((one, k) => new Writer(10).u8(3)
        .u16(loadList(k)).u8(ACTION_LIST_INDEX_OPCODE)
        .u16((group << 8) | one.record).u8(SEND_INFRARED)
        .u16((group << 8) | one.quantity).u8(DEVICE_QUANTITY));
      const powerDelayList = delayList + 1 + 2 * n;
      const onList = powerDelayList + 1;
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
      return {
        bodies, next: onList + 1, switchOn: onList,
        // The delay variables were appended at the end, so the power variable's renumbering moved them up by
        // one, and the delay lists' `0x72`s with them. Read back rather than assumed.
        described(named) {
          const renumbered = (list: number, one: { variable: number; table: number }): number => {
            const mapped = named.actionLists()?.[list]?.[0];
            if (mapped?.opcode !== MAP_VALUE_OPCODE || mapped.operand >>> 8 !== one.table
                || (mapped.operand & 0xff) !== one.variable + 1) {
              throw new ComposeError(`delay list ${list} does not name its renumbered variable`);
            }
            return one.variable + 1;
          };
          return {
            delay: {
              variable: renumbered(delayList, delay.interDevice), table: delay.interDevice.table,
              list: delayList, identifier: delay.identifier,
            },
            powerOnDelay: {
              variable: renumbered(powerDelayList, delay.powerOn), table: delay.powerOn.table,
              list: powerDelayList, on: onList,
            },
          };
        },
      };
    },
  };
}

/*
 * ---- A send of a device already composed, `composeDeviceInputs` ----
 */

/** The arch 14 send prelude of a device's commands, read off one of its own send lists. */
interface Prelude {
  /** `0x1F` operand of the load list: load the byte register with 1. */
  load: Instruction;
  /** `0x71` operand of the condition list: only while the start sequence variable equals it. */
  condition: Instruction;
  /** The device's delay list, which the condition calls. */
  delayList: number;
}

function preludeOf(c: Container, device: ComposedDevice): Prelude {
  const lists = c.actionLists();
  const send = lists?.[device.lists[0] ?? -1];
  const load = send?.[0]?.opcode === ACTION_LIST_INDEX_OPCODE ? lists?.[send[0].operand] : undefined;
  const condition = load?.[1]?.opcode === ACTION_LIST_INDEX_OPCODE ? lists?.[load[1].operand] : undefined;
  if (send?.length !== 3 || send[1]?.opcode !== SEND_INFRARED || load?.length !== 2 || condition?.length !== 2
      || condition[1]?.opcode !== ACTION_LIST_INDEX_OPCODE) {
    throw new ComposeError('the device\'s first command does not open with the arch 14 send prelude');
  }
  return { load: load[0]!, condition: condition[0]!, delayList: condition[1].operand };
}

/**
 * A new send of a composed device, the shape `fourSlotDevice` builds, `[0x7F load, 0x7D, 0x7C]` with a private
 * load and condition list of its own calling the device's delay list, as `list`, `+1` and `+2`. The prelude is
 * read off the device's first command, refused where that does not open with one.
 */
function fourSlotSendWriter(c: Container, device: ComposedDevice): (list: number, group: number, record: number, amount: number) => ListBody[] {
  const prelude = preludeOf(c, device);
  return (list, group, record, amount) => [
    [[list + 1, ACTION_LIST_INDEX_OPCODE], [(group << 8) | record, SEND_INFRARED], [(group << 8) | amount, DEVICE_QUANTITY]],
    [[prelude.load.operand, prelude.load.opcode], [list + 2, ACTION_LIST_INDEX_OPCODE]],
    [[prelude.condition.operand, prelude.condition.opcode], [prelude.delayList, ACTION_LIST_INDEX_OPCODE]],
  ];
}

/*
 * ---- The sequence composer's sends ----
 */

/** Every list in the configuration's ordinary send shape, the delay step `sendPreludes` reads in front of the pair. */
function fourSlotSendLists(c: Container): SendList[] {
  const lists = c.actionLists() ?? [];
  const out: SendList[] = [];
  for (const one of sendPreludes(c)) {
    const body = lists[one.list] as Instruction[];
    const send = body[1] as Instruction;
    const quantity = body[2] as Instruction;
    if (quantity.operand >>> 8 !== one.group) continue;
    out.push({
      list: one.list, group: one.group, code: send.operand & 0xff,
      quantity: quantity.operand & 0xff,
      prelude: { delay: one.delay, load: one.loadOperand, condition: one.conditionOperand },
    });
  }
  return out;
}

/**
 * A new send for a sequence: a send opens with a delay step of three lists, section 287, a load and a
 * condition **private to the command**, then a delay list **shared by the device**, which queues its inter
 * device delay while a start, All Off or Help runs, section 335. So a new send gets a new pair, laid out after
 * it in `fourSlotDevice`'s order, calling the device's one delay list with the operands its other commands'
 * pairs carry. More than one delay list or operand for one device is a configuration this was not measured on.
 */
function fourSlotNewSendLists(
  existing: readonly SendList[], group: number, code: number, quantity: number, list: number,
): ListBody[] {
  const preludes = existing.filter((one) => one.group === group).map((one) => one.prelude);
  const distinct = new Set(preludes.map((one) => `${one?.delay}:${one?.load}:${one?.condition}`));
  if (distinct.size !== 1 || preludes[0] === undefined) {
    throw new ComposeError(`group ${group}'s send lists open with ${distinct.size} different delay steps`);
  }
  const { delay, load, condition } = preludes[0];
  return [
    [[list + 1, ACTION_LIST_INDEX_OPCODE], [(group << 8) | code, SEND_INFRARED], [(group << 8) | quantity, DEVICE_QUANTITY]],
    [[load, STATE_BAND], [list + 2, ACTION_LIST_INDEX_OPCODE]],
    [[condition, CONDITION_OPCODE], [delay, ACTION_LIST_INDEX_OPCODE]],
  ];
}

/** The four slot family's send, `Family.sends`. */
export const FOUR_SLOT_SENDS: SendShape = {
  listsPerSend: 3,
  device: fourSlotDevice,
  // Every arch 14 device `composeDevice` builds has an on list, ending in the power on delay.
  switchOnList: (_c, device) => device.powerOnDelay,
  sendWriter: fourSlotSendWriter,
  sendLists: fourSlotSendLists,
  newSendLists: fourSlotNewSendLists,
  // Logitech's way on these remotes, section 349: the named record's one block copy.
  sequenceRecords: 'copy',
  oneBlockCopyRefusal: undefined,
};
