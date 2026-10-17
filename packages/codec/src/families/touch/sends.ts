/**
 * The touch family's send, the Harmony One: the send and its quantity alone, `{0x7D, 0x7C}` naming one device,
 * and no delay variables; a device's power on delay is a bare `0x7C` wait at the end of its on list.
 * `TOUCH_SENDS` is what the shared composers ask, `Family.sends`: the device composer for a device's lists,
 * the input composer for a send of a composed device, the sequence composer for the configuration's sends and
 * a new one, and the donor input matcher for the one list that sends a command.
 *
 * **The pair is every architecture's send but the Harmony 600, 650 and 700's**, which put the delay step in
 * front of it, section 287: no command opens with that step on the Harmony One, the 525 or the arch 8
 * configuration, `compose.test.ts`. So it is also the send a configuration no family serves gets, `sendsOf` in
 * the registry, as it did before plan 007. **The wait at the end of the on list is the Harmony One's alone**,
 * section 393.
 *
 * Moved out of `shared/devices.ts`, `inputs.ts`, `sequence.ts` and `composecatalogue.ts` with
 * `todo-compile-one.md` 3.3.3.4, where each module tested a trait, `sendPrelude`, and built or matched this
 * shape itself; nothing in what is built or matched changed.
 */
import type { DeviceSends, ListBody, SendList, SendShape } from '../family.ts';
import { Writer } from '../../emit.ts';
import type { Container, Instruction } from '../../gspm.ts';
import { DEVICE_QUANTITY, SEND_INFRARED, stateVariables } from '../../inventory.ts';
import { ACTION_LIST_INDEX_OPCODE } from '../../sections.ts';
import { ComposeError } from '../../shared/core.ts';
import type { ComposeDevice, ComposedDevice } from '../../shared/devices.ts';

/**
 * A device's lists after its sends: none, or where the device states a power on delay, the on list, every
 * step of the on action and then the device's own `0x7C` with the delay in tenths, as Logitech's compiler
 * writes it on eight catalogue devices of eight, findings section 393, `todo-compile-one.md` 1.2. It goes
 * straight after the sends. A delay past one quantity byte is not composed: no compile of a One here shows how
 * one is split.
 */
function touchDevice(c: Container, group: number, device: ComposeDevice): DeviceSends {
  const wait = device.powerOnDelay;
  if (wait !== undefined && (!Number.isInteger(wait) || wait < 1 || wait > 0xff)) {
    throw new ComposeError(`a power on delay of ${wait} tenths is not one wait on this remote`);
  }
  return {
    container: c,
    lay(firstList, sends, onCalls) {
      const bodies = sends.map((one) => new Writer(7).u8(2)
        .u16((group << 8) | one.record).u8(SEND_INFRARED)
        .u16((group << 8) | one.quantity).u8(DEVICE_QUANTITY));
      const after = firstList + sends.length;
      if (wait === undefined) return { bodies, next: after, switchOn: undefined, described: () => ({}) };
      const on = new Writer(1 + 3 * (onCalls.length + 1)).u8(onCalls.length + 1);
      for (const at of onCalls) on.u16(at).u8(ACTION_LIST_INDEX_OPCODE);
      bodies.push(on.u16((group << 8) | wait).u8(DEVICE_QUANTITY));
      return { bodies, next: after + 1, switchOn: after, described: () => ({}) };
    },
  };
}

/**
 * The Harmony One's on list of a composed device: the list its power variable's transition from 0 to 1
 * runs, read off the variable's record, since the One has no delay list for `ComposedDevice` to name.
 */
function onListOf(c: Container, device: ComposedDevice): { on: number } | undefined {
  const record = stateVariables(c).find((one) => one.index === device.variable)?.record;
  const on = record?.values.find((one) => one.from === 0 && one.to === 1);
  return on?.opcode === ACTION_LIST_INDEX_OPCODE ? { on: on.operand } : undefined;
}

/** Every list in the configuration's ordinary send shape: `{0x7D, 0x7C}` naming one device. */
function touchSendLists(c: Container): SendList[] {
  const lists = c.actionLists() ?? [];
  const out: SendList[] = [];
  lists.forEach((body, list) => {
    if (body.length !== 2) return;
    const [send, quantity] = body as [Instruction, Instruction];
    if (send.opcode !== SEND_INFRARED || quantity.opcode !== DEVICE_QUANTITY) return;
    if (send.operand >>> 8 !== quantity.operand >>> 8) return;
    out.push({ list, group: send.operand >>> 8, code: send.operand & 0xff, quantity: quantity.operand & 0xff });
  });
  return out;
}

/** A send and its quantity, the one list a send takes. */
const pair = (group: number, record: number, amount: number): ListBody =>
  [[(group << 8) | record, SEND_INFRARED], [(group << 8) | amount, DEVICE_QUANTITY]];

/** The touch family's send, `Family.sends`. */
export const TOUCH_SENDS: SendShape = {
  listsPerSend: 1,
  device: touchDevice,
  switchOnList: onListOf,
  sendWriter: () => (_list, group, record, amount) => [pair(group, record, amount)],
  sendLists: touchSendLists,
  newSendLists: (_existing, group, code, quantity) => [pair(group, code, quantity)],
  // Only the named record: the Harmony One's one block copies open with the device's delay between devices
  // rather than with nothing, section 337, which the sequence composer does not compose.
  sequenceRecords: 'named',
  oneBlockCopyRefusal: 'a one block copy is composed on the Harmony 600, 650 and 700 only: the Harmony One\'s '
    + 'open with the device\'s delay between devices, section 337, which this does not compose',
  // The one list that sends `operand` and nothing else but its quantity, which is how a compile names a
  // command, `composeDonorDeviceInputs`.
  donorSendList: (lists, operand) => lists.flatMap((list, at) => (list.length === 2 && list[0]!.opcode === SEND_INFRARED
    && list[0]!.operand === operand && list[1]!.opcode === DEVICE_QUANTITY ? [at] : [])),
};
