/**
 * The device half of the plain send, `{0x7D, 0x7C}` naming one device, which two families share: the One family,
 * the Harmony One, section 278, and the side keys family, the Harmony 880 and 885, `todo-compile-885.md` 2.1. A
 * device's lists are one such pair per record, and where the device states a power on delay an on list after them:
 * every step of the on action called in order, then one bare `0x7C` wait of the delay in tenths.
 *
 * **Why it is shared and not each family's.** The shape is the same bytes on both families, measured on each:
 * Logitech's compiler writes a Harmony One device's on list this way on eight catalogue devices of eight, findings
 * section 393, and on the Harmony 880 and 885 every one of the 3280 send lists of the eight configurations the lab
 * holds, six contributed and the two bench units', is the pair with both halves naming one group, and every one of
 * their 44 power variables switches on through a list of one call and one wait, `sidekeysdevice.test.ts`. Plan
 * 007 puts a fact measured alike on the families a module serves outside any of them, and a family never imports
 * another, so this lived in the One family's `sends.ts` until the second family needed it, and moved here
 * unchanged.
 *
 * **What differs between the two is the largest wait one `0x7C` is given**, which each family states: the Harmony
 * One composes up to the quantity byte's 255 tenths, since no compile of a One here shows how a longer one is split;
 * the Harmony 880 and 885's compiles never write a wait above 100 tenths, splitting a longer delay into steps of 100,
 * so that family composes one wait of at most 100 and refuses the rest until the split is composed. The Harmony 600,
 * 650 and 700 send with a delay prelude in front of the pair and keep their delays as variables, so they are not
 * served by this; their family composes its own sends.
 */
import type { DeviceSends } from '../families/family.ts';
import { Writer } from '../container/emit.ts';
import type { Container } from '../container/gspm.ts';
import { DEVICE_QUANTITY, SEND_INFRARED } from '../inventory/inventory.ts';
import { ACTION_LIST_INDEX_OPCODE } from '../container/sections.ts';
import { ComposeError } from './core.ts';
import type { ComposeDevice } from './devices.ts';

/**
 * A device's lists in the plain send: one pair per send in their order, then, where the device states a power on
 * delay, the on list, which goes straight after the sends and is what the power variable runs going from 0 to 1.
 * `maxWait` is the largest delay in tenths the family composes as one wait; `remote` names the family's remotes in
 * the refusal of a delay outside 1 to `maxWait`.
 */
export function pairDeviceSends(
  c: Container, group: number, device: ComposeDevice, maxWait: number, remote: string,
): DeviceSends {
  const wait = device.powerOnDelay;
  if (wait !== undefined && (!Number.isInteger(wait) || wait < 1 || wait > maxWait)) {
    throw new ComposeError(`a power on delay of ${wait} tenths is not one wait on ${remote}`);
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
