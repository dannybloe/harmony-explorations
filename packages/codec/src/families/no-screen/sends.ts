/**
 * The no screen family's send, the Harmony 300 and 350: one list per send of three instructions, the timers
 * cancelled, the send and its quantity, `{0x07 FFFB, 0x7D, 0x7C}` naming one device; and a device's power on
 * delay as bare `0x7C` waits at the end of its on list, in waits of at most ten seconds each. `NO_SCREEN_SENDS`
 * is what a shared composer asks, `Family.sends`.
 *
 * **What it rests on.** Every one of the 250 send lists of Logitech's compile of the Harmony 350 test setup is
 * that shape, one per infrared record, and on the Harmony 300 and 350 configurations read before it the plain
 * pair is a second shape beside it, section 278: so the cancel is this compile generation's, and the plain pair
 * is not composed. Why a send cancels the timers is not read; a device key's press starts two timers that switch
 * its pin, `keys.ts`, and a send stops them. The waits: the Knoll's 250 tenths are three, 100, 100 and 50, and
 * the factory configuration's 170 are 100 and 70, `reference/architectures/harmony-300-350/memory.md` "A
 * device's power on delay"; every other device's is one wait of 100 or less.
 *
 * Only the device composer's half is built. What the input composer, the sequence composer and the donor
 * matcher ask is refused with the step that will build it, since nothing composed for this family has been
 * measured against a compile of it.
 */
import type { DeviceSends, SendShape } from '../family.ts';
import { CANCEL_TIMERS } from '../../actions.ts';
import { Writer } from '../../emit.ts';
import type { Container } from '../../gspm.ts';
import { DEVICE_QUANTITY, SEND_INFRARED } from '../../inventory.ts';
import { ACTION_LIST_INDEX_OPCODE } from '../../sections.ts';
import { ComposeError } from '../../shared/core.ts';
import type { ComposeDevice } from '../../shared/devices.ts';

/** The longest one `0x7C` wait of a power on delay, in tenths: a delay past it is split, the rest last. */
export const POWER_ON_WAIT_MAX = 100;

/** A power on delay as the waits Logitech's compiler writes for it, `POWER_ON_WAIT_MAX` at a time. */
export function powerOnWaits(tenths: number): number[] {
  if (!Number.isInteger(tenths) || tenths < 1) throw new ComposeError(`a power on delay of ${tenths} tenths is not a wait`);
  const out: number[] = [];
  for (let left = tenths; left > 0; left -= POWER_ON_WAIT_MAX) out.push(Math.min(left, POWER_ON_WAIT_MAX));
  return out;
}

/**
 * A device's lists: one send list per record, `{0x07 FFFB, 0x7D, 0x7C}` with the send's quantity, then, where the
 * device states a power on delay, the on list, every step of the on action and then the waits, which is what its
 * power variable runs going from 0 to 1, as Logitech's compile writes it on every device of the test setup.
 */
function noScreenDevice(c: Container, group: number, device: ComposeDevice): DeviceSends {
  const waits = device.powerOnDelay === undefined ? undefined : powerOnWaits(device.powerOnDelay);
  return {
    container: c,
    lay(firstList, sends, onCalls) {
      const bodies = sends.map((one) => new Writer(10).u8(3)
        .u16(CANCEL_TIMERS.operand).u8(CANCEL_TIMERS.opcode)
        .u16((group << 8) | one.record).u8(SEND_INFRARED)
        .u16((group << 8) | one.quantity).u8(DEVICE_QUANTITY));
      const after = firstList + sends.length;
      if (waits === undefined) return { bodies, next: after, switchOn: undefined, described: () => ({}) };
      const count = onCalls.length + waits.length;
      const on = new Writer(1 + 3 * count).u8(count);
      for (const at of onCalls) on.u16(at).u8(ACTION_LIST_INDEX_OPCODE);
      for (const wait of waits) on.u16((group << 8) | wait).u8(DEVICE_QUANTITY);
      bodies.push(on);
      return { bodies, next: after + 1, switchOn: after, described: () => ({}) };
    },
  };
}

/** A refusal for what a step of `todo-compile-350.md` will build and nothing has measured yet. */
const notYet = (what: string, step: string) => (): never => {
  throw new ComposeError(`${what} is not composed for the Harmony 300 and 350 yet, todo-compile-350.md ${step}`);
};

/** The no screen family's send, `Family.sends`. */
export const NO_SCREEN_SENDS: SendShape = {
  listsPerSend: 1,
  device: noScreenDevice,
  switchOnList: notYet('A device\'s inputs', '4.2'),
  sendWriter: notYet('A device\'s inputs', '4.2'),
  sendLists: notYet('A sequence', '4.2'),
  newSendLists: notYet('A sequence', '4.2'),
  sequenceRecords: 'named',
  oneBlockCopyRefusal: 'a one block copy is not composed for the Harmony 300 and 350: the compile\'s digit copies '
    + 'open with no silence and are sent by nothing, todo-compile-350.md 4.1',
};
