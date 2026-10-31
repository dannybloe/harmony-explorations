/**
 * A device's one block digit copies and the lists that send them, on the Harmony 300 and 350: what a favourite
 * channel sends, `favourites.ts`, and what Logitech's compiler stores for a device of some types whether or not
 * anything sends them, `devices.ts`, `todo-compile-350.md` 4.1.1. One module for both, since it is one derivation
 * of which record and which list sends a digit, and two copies of it would drift.
 *
 * **A digit a favourite sends is the digit's one block copy**, not the record a digit key sends: in Logitech's
 * compile of the test setup every list the number sender's tables call, and both of `07`'s, sends a record of the
 * KPN that is the catalogue digit's first block less its opening silence, with no held block, `oneBlockCopy`; the
 * KPN's group holds no other record of a digit. So each digit's copy is found in the device's group by what it
 * sends, and where the group has none, a device of ours whose digit keys send the whole record, it is appended,
 * `appendCopyRecord`. Then the one list of the family's send shape that sends it, the timers cancelled, the send
 * and its quantity, is found, or appended with the quantity a command's send carries.
 *
 * This was `digitListsOf` in `favourites.ts` until `todo-compile-350.md` 4.1.1 needed it for a device without
 * favourites, and it moved here unchanged.
 */
import { CANCEL_TIMERS } from '../../actions.ts';
import { catalogueDevicePlan } from '../../composecatalogue.ts';
import { type Container, parse } from '../../gspm.ts';
import { irGroups } from '../../ir.ts';
import { DEVICE_QUANTITY, DEVICE_QUANTITY_DEFAULT, SEND_INFRARED } from '../../inventory.ts';
import { appendCopyRecord, oneBlockCopy } from '../../sequence.ts';
import { appendActionLists, ComposeError, nameOfLabel } from '../../shared/core.ts';
import { composeIrGroup } from '../../shared/infrared.ts';
import { NUMBER_SENDER_DIGITS } from '../../tables.ts';
import { arraysStart, highestEnd, instructionsAt, listExtents } from './devices.ts';

/** The device whose digits are wanted, as the setup names it and as the catalogue holds it. */
export interface DigitDevice {
  readonly name: string;
  readonly manufacturer: string;
  readonly model: string;
}

export interface DigitLists {
  readonly container: Container;
  /** The action list sending each digit, 0 to 9. */
  readonly lists: readonly number[];
  /** The one block copies and their send lists appended because the group lacked them. */
  readonly copiesAdded: number;
  readonly listsAdded: number;
}

/**
 * The action list sending each of the device's digits, 0 to 9, as its one block copy, and the configuration
 * holding them: found where the device's group has them, appended where it does not.
 */
export function deviceDigitLists(c: Container, archive: string, request: DigitDevice, group: number): DigitLists {
  const plan = catalogueDevicePlan(c, archive, {
    manufacturer: request.manufacturer, model: request.model, label: nameOfLabel(request.name), full: true,
  });
  const digits = Array.from({ length: NUMBER_SENDER_DIGITS }, (_, d) => String(d));
  const missing = digits.filter((d) => !plan.wanted.includes(d));
  if (missing.length > 0) throw new ComposeError(`${request.manufacturer} ${request.model} states no command for the digits ${missing.join(', ')}`);
  // The ten digits' records built as the device composer builds them, in a scratch copy holding the device's group
  // as well, so that a copy is looked for among the group's records and derived from the catalogue's.
  const scratch = parse(composeIrGroup(c, digits.map((d) => plan.device.commands[plan.wanted.indexOf(d)]!)).bytes);
  const own = irGroups(scratch)![group]!.addresses;
  const records = [...own, ...irGroups(scratch)!.at(-1)!.addresses];
  let current = c;
  let copiesAdded = 0;
  const codes = digits.map((digit, d) => {
    const found = oneBlockCopy(scratch, records, own.length + d);
    if ('code' in found) {
      if (found.code >= own.length) throw new ComposeError(`the catalogue's ${digit} has no held block, so it would be its own copy, which no compile here shows`);
      return found.code;
    }
    const appended = appendCopyRecord(current, group, found.copy, arraysStart);
    current = parse(appended.bytes);
    copiesAdded += 1;
    return appended.code;
  });
  // The send list of each copy: the configuration's own where there is one, a new one after the last list body
  // where there is not, as the device composer puts its lists.
  const lists = current.pointerArray(7) ?? [];
  const sendersOf = (code: number): number[] => lists.flatMap((address, index) => {
    const body = instructionsAt(current.blob, current.blobOffsetOf(address)!);
    return body.length === 3 && body[0]!.opcode === CANCEL_TIMERS.opcode && body[0]!.operand === CANCEL_TIMERS.operand
      && body[1]!.opcode === SEND_INFRARED && body[1]!.operand === ((group << 8) | code)
      && body[2]!.opcode === DEVICE_QUANTITY && body[2]!.operand >> 8 === group ? [index] : [];
  });
  const found = codes.map(sendersOf);
  const many = found.findIndex((one) => one.length > 1);
  if (many >= 0) throw new ComposeError(`${found[many]!.length} lists send the device's ${many}, and which a favourite sends is not read`);
  const wanting = codes.filter((_, d) => found[d]!.length === 0);
  const made = new Map<number, number>();
  if (wanting.length > 0) {
    const appended = appendActionLists(current, wanting.map((code) => [
      [CANCEL_TIMERS.operand, CANCEL_TIMERS.opcode], [(group << 8) | code, SEND_INFRARED],
      [(group << 8) | DEVICE_QUANTITY_DEFAULT, DEVICE_QUANTITY],
    ]), highestEnd(listExtents(current)));
    current = parse(appended.bytes);
    wanting.forEach((code, k) => made.set(code, appended.first + k));
  }
  return {
    container: current,
    lists: codes.map((code, d) => found[d]![0] ?? made.get(code)!),
    copiesAdded,
    listsAdded: wanting.length,
  };
}
