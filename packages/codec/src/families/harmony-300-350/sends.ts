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
 * Only the device composer's half is built. What the shared input composer asks is refused for good, since this
 * family's inputs are the activity's and are composed by it, `activity.ts`; what the sequence composer asks is
 * refused, since no compile of this family holds a sequence.
 */
import type { DeviceSends, SendShape } from '../family.ts';
import type { Container } from '../../container/gspm.ts';
import { ComposeError } from '../../shared/core.ts';
import type { ComposeDevice } from '../../shared/devices.ts';
import { powerOnList, sendList, writerOf } from './lists.ts';

// The waits moved to `lists.ts` with the power on list's writer, `todo-compile-350.md` 5.2.1, so that the writer and
// the attribution that reads it back share one module; they are still the send's, and named from here as before.
export { POWER_ON_WAIT_MAX, powerOnWaits } from './lists.ts';

/**
 * A device's lists: one send list per record, `{0x07 FFFB, 0x7D, 0x7C}` with the send's quantity, then, where the
 * device states a power on delay, the on list, every step of the on action and then the waits, which is what its
 * power variable runs going from 0 to 1, as Logitech's compile writes it on every device of the test setup.
 */
function noScreenDevice(c: Container, group: number, device: ComposeDevice): DeviceSends {
  const delay = device.powerOnDelay;
  return {
    container: c,
    lay(firstList, sends, onCalls) {
      // Each list through its writer in `lists.ts`, which the attribution reads the same lists back with.
      const bodies = sends.map((one) => writerOf(sendList(group, one.record, one.quantity)));
      const after = firstList + sends.length;
      if (delay === undefined) return { bodies, next: after, switchOn: undefined, described: () => ({}) };
      bodies.push(writerOf(powerOnList(onCalls, group, delay)));
      return { bodies, next: after + 1, switchOn: after, described: () => ({}) };
    },
  };
}

/** A sequence's refusal: no compile of this family holds one, so nothing says what Logitech's would be. */
const noSequence = (): never => {
  throw new ComposeError('a sequence is not composed for the Harmony 300 and 350: no compile of theirs read holds one');
};

/** A refusal for a shared composer's question this family answers in a composer of its own. */
const notThis = (what: string) => (): never => {
  throw new ComposeError(`${what} is not how the Harmony 300 and 350 are composed: the activity composes their inputs, `
    + 'composeNoScreenActivity, todo-compile-350.md 4.2');
};

/** The no screen family's send, `Family.sends`. */
export const NO_SCREEN_SENDS: SendShape = {
  listsPerSend: 1,
  device: noScreenDevice,
  // The shared input composer's two questions: its inputs send whole records after the input delay and reset after
  // the power on, where this family's are the activity's, one block copies after a tenth, `activity.ts`.
  switchOnList: notThis('A device\'s inputs through the shared input composer'),
  sendWriter: notThis('A device\'s inputs through the shared input composer'),
  sendLists: noSequence,
  newSendLists: noSequence,
  sequenceRecords: 'named',
  // A sequence's copies, not the favourite channels': those are the digits' one block copies, which the number
  // sender calls and `favourites.ts` composes, todo-compile-350.md 4.3. This said the digit copies were sent by
  // nothing until a compile with favourites showed its number sender calling them; on a device without favourites
  // nothing does.
  oneBlockCopyRefusal: 'a sequence\'s one block copy is not composed for the Harmony 300 and 350, since no sequence '
    + 'is; the digit copies their favourite channels send are composed with the channels, todo-compile-350.md 4.3',
};
