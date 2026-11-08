/**
 * Where else a Harmony 300 or 350 keeps a device's power on delay, beyond its `Power` variable's switch on list:
 * the copy in Watch TV's list, `todo-compile-350.md` 4.6. `setPowerOnDelay` asks this through
 * `Family.powerOnDelayCopies` and changes every copy it names along with the device's own, so that a delay edited
 * is the delay heard, whichever key reaches it.
 *
 * **Why there is a second copy.** Watch TV switches a device on one of two ways, `activity.ts` and
 * `reference/architectures/harmony-300-350/memory.md` "The activity". A device with separate on and off codes has
 * its `Power` variable flipped, and the variable's transition runs the device's own list, the call of its power
 * code and the one `0x7C`: that list is the copy `setPowerOnDelay` always changed, so for such a device it is the
 * only copy and this names nothing. **A device with one power code for both ways is not reached through its
 * variable**: the activity calls the code's list itself and follows it with a `0x7C` of its own, so Logitech's
 * compiler writes the delay twice, and before this an edit changed only the one no key on the bench Harmony 300
 * reached. Its Power key sends the toggle alone, so the copy any key reaches there is the activity's,
 * `docs/test-notes/harmony-300.md`.
 *
 * **The rule, as a reading rather than a list of devices**: in Watch TV's list, and in every list it calls, a call
 * of the list the device's own switch on list calls, immediately followed by a `0x7C` naming the device's group,
 * is a copy. The device's own list is left out, being the copy the caller changes already. That is read off the
 * bytes rather than off which kind of device it is, so an older compile that called a separate on code directly
 * would be found the same way; none read here does. An unreferenced list, such as an activity the composer
 * replaced, is reached by no key and not changed.
 *
 * **What holds it**, `packages/codec/test/filefamilydelays.test.ts`: on the bench Harmony 300's configuration,
 * the television's delay set to 100 tenths reproduces the file heard on the bench at 11.5 s, byte for byte; on
 * Logitech's compile of the Harmony 350 test setup, the copies are exactly the one toggle device's in the activity.
 */
import type { Container } from '../../container/gspm.ts';
import { DEVICE_QUANTITY, powerOnInstructions } from '../../inventory/inventory.ts';
import { ACTION_LIST_INDEX_OPCODE } from '../../container/sections.ts';
import { ComposeError } from '../../shared/core.ts';
import { WATCH_TV_SCAN } from './activity.ts';
import { keyMaps, PRESS } from './devices.ts';

/** One copy of a delay: the list it is in and the instruction's place in it, counting from zero. */
export interface DelayCopy {
  readonly list: number;
  readonly at: number;
}

/**
 * Every copy of `group`'s power on delay a key reaches other than the device's own switch on list. Empty where the
 * device has no single `0x7C` of its own, which `setPowerOnDelay` refuses before asking, or where no Watch TV
 * binding exists.
 */
export function noScreenPowerOnDelayCopies(c: Container, group: number): DelayCopy[] {
  const own = powerOnInstructions(c).get(group);
  if (own === undefined) return [];
  const lists = c.actionLists() ?? [];
  const call = lists[own.list]?.[own.at - 1];
  if (call?.opcode !== ACTION_LIST_INDEX_OPCODE) {
    // Every switch on list of this family calls the power code's list first, `filefamilydelays.test.ts`; one that
    // does not gives no call to look for, and guessing would leave a copy unchanged with nothing said.
    throw new ComposeError(`group ${group}'s switch on list does not open with a call of its power code`);
  }
  const bound = keyMaps(c)[0]?.entries.find((one) => one.tag === (PRESS | WATCH_TV_SCAN));
  if (bound === undefined || bound.opcode !== ACTION_LIST_INDEX_OPCODE) return [];

  const copies: DelayCopy[] = [];
  const seen = new Set<number>([own.list]);
  const walk = (index: number): void => {
    if (seen.has(index)) return;
    seen.add(index);
    const body = lists[index];
    if (body === undefined) throw new ComposeError(`Watch TV reaches action list ${index}, which does not exist`);
    body.forEach((one, k) => {
      const next = body[k + 1];
      if (one.opcode === ACTION_LIST_INDEX_OPCODE && one.operand === call.operand
        && next?.opcode === DEVICE_QUANTITY && next.operand >> 8 === group) {
        copies.push({ list: index, at: k + 1 });
      }
      if (one.opcode === ACTION_LIST_INDEX_OPCODE) walk(one.operand);
    });
  };
  walk(bound.operand);
  return copies;
}
