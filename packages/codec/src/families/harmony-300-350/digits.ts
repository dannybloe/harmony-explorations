/**
 * A device's one block digit copies and the lists that send them, on the Harmony 300 and 350: what a favourite
 * channel sends, `favourites.ts`, and what Logitech's compiler stores for a device of some types whether or not
 * anything sends them, `devices.ts`. One module for both, since it is one derivation
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
 * It began in `favourites.ts` and moved here when the device composer needed it for a device without favourites.
 * The derivation takes any of the device's commands, `deviceCopyLists`, because Logitech stores one more one block copy beside the digits, the
 * channel tuning's finish, `channelFinish`; the digits stay its first caller, with their own entry.
 */
import type { CatalogueSource } from '../../catalogue/catalogue.ts';
import { catalogueDevicePlan } from '../../compose/composecatalogue.ts';
import type { DeviceDriving } from '../../catalogue/driving.ts';
import { type Container, parse } from '../../container/gspm.ts';
import { irGroups } from '../../infrared/ir.ts';
import { DEVICE_QUANTITY_DEFAULT } from '../../inventory/inventory.ts';
import { appendCopyRecord, oneBlockCopy } from '../../compose/sequence.ts';
import { appendActionLists, ComposeError, nameOfLabel } from '../../shared/core.ts';
import { composeIrGroup } from '../../shared/infrared.ts';
import { NUMBER_SENDER_DIGITS } from '../../container/tables.ts';
import { arraysStart, highestEnd, instructionsAt, listExtents } from './devices.ts';
import { bodyOf, sendList } from './lists.ts';

/** The device whose digits are wanted, as the setup names it and as the catalogue holds it. */
export interface DigitDevice {
  readonly name: string;
  readonly manufacturer: string;
  readonly model: string;
}

export interface DigitLists {
  readonly container: Container;
  /** The action list sending each command asked for, in the order asked: each digit, 0 to 9, for the digits. */
  readonly lists: readonly number[];
  /** The one block copies and their send lists appended because the group lacked them. */
  readonly copiesAdded: number;
  readonly listsAdded: number;
}

/**
 * The action list sending each of the device's digits, 0 to 9, as its one block copy, and the configuration
 * holding them: found where the device's group has them, appended where it does not.
 */
export function deviceDigitLists(c: Container, archive: CatalogueSource, request: DigitDevice, group: number): DigitLists {
  const digits = Array.from({ length: NUMBER_SENDER_DIGITS }, (_, d) => String(d));
  return deviceCopyLists(c, archive, request, group, digits, 'the digits');
}

/**
 * The action list sending each of `names`, commands of the device, as its one block copy, and the configuration
 * holding them: found where the device's group has them, appended where it does not. The derivation the digits take,
 * `deviceDigitLists`, for any command: the copy is the catalogue command's first block less its opening silence with
 * no held block, `oneBlockCopy`, and its list is the family's send shape. `what` names the commands in a refusal.
 */
export function deviceCopyLists(c: Container, archive: CatalogueSource, request: DigitDevice, group: number, names: readonly string[],
  what = 'the command'): DigitLists {
  const plan = catalogueDevicePlan(c, archive, {
    manufacturer: request.manufacturer, model: request.model, label: nameOfLabel(request.name), full: true,
  });
  const missing = names.filter((d) => !plan.wanted.includes(d));
  if (missing.length > 0) throw new ComposeError(`${request.manufacturer} ${request.model} states no command for ${what} ${missing.join(', ')}`);
  // The commands' records built as the device composer builds them, in a scratch copy holding the device's group as
  // well, so that a copy is looked for among the group's records and derived from the catalogue's.
  const scratch = parse(composeIrGroup(c, names.map((d) => plan.device.commands[plan.wanted.indexOf(d)]!)).bytes);
  const own = irGroups(scratch)![group]!.addresses;
  const records = [...own, ...irGroups(scratch)!.at(-1)!.addresses];
  let current = c;
  let copiesAdded = 0;
  const codes = names.map((name, d) => {
    const found = oneBlockCopy(scratch, records, own.length + d);
    if ('code' in found) {
      if (found.code >= own.length) throw new ComposeError(`the catalogue's ${name} has no held block, so it would be its own copy, which no compile here shows`);
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
  // A list sends the copy where it is `sendList`'s list for the group and the code, whatever its quantity.
  const sendersOf = (code: number): number[] => lists.flatMap((address, index) => {
    const body = instructionsAt(current.blob, current.blobOffsetOf(address)!);
    const built = body.length === 3 ? sendList(group, code, body[2]!.operand & 0xff) : [];
    return built.length === 3 && built.every((one, k) => one.opcode === body[k]!.opcode && one.operand === body[k]!.operand) ? [index] : [];
  });
  const found = codes.map(sendersOf);
  const many = found.findIndex((one) => one.length > 1);
  if (many >= 0) throw new ComposeError(`${found[many]!.length} lists send the device's ${names[many]}, and which a favourite sends is not read`);
  const wanting = codes.filter((_, d) => found[d]!.length === 0);
  const made = new Map<number, number>();
  if (wanting.length > 0) {
    const appended = appendActionLists(current, wanting.map((code) => bodyOf(sendList(group, code, DEVICE_QUANTITY_DEFAULT))),
      highestEnd(listExtents(current)));
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

/**
 * The command a device's channel tuning finishes a channel number with, the catalogue's `channelTuning.finish`, or
 * nothing where the catalogue states none: the command Logitech stores a one block copy of, with a send list nothing
 * calls, beside the ten digits' copies.
 *
 * **Measured** in Logitech's compiles of the family, `noscreenstored.test.ts`: the two catalogue devices whose entry
 * states a finish, a television whose finish is `OK`, in six compiles, and another whose finish is `Select`, in one,
 * store that command's one block copy with a send list nothing calls, 7 of 7; on the other 40 devices of the twelve
 * current compiles no send list nothing calls sends a one block copy of anything but a digit. (A copy that is called
 * is another matter: an activity's input sends one, `activity.ts`.) The copy has the digits' shape, the catalogue command's
 * first block less its opening silence with no held block, and the command's whole record is stored as well where a
 * key binds it. Both devices are televisions, a type that stores digit copies, so a finish on a device of a type
 * that stores none is not measured, and the device composer refuses it rather than guess.
 *
 * A finish of more than one step, or of a step that sends nothing, is in no compile read either and is refused here.
 */
export function channelFinish(driving: DeviceDriving, device: string): string | undefined {
  const finish = driving.channelTuning?.finish;
  if (finish === undefined || finish.length === 0) return undefined;
  const only = finish[0]!;
  if (finish.length !== 1 || only.kind !== 'send') {
    throw new ComposeError(`${device}'s channel tuning finishes with ${finish.length} steps, and only a single command sent is measured`);
  }
  return only.command;
}
