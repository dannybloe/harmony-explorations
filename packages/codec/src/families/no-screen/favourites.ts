/**
 * Favourite channels composed onto a Harmony 350 configuration, `todo-compile-350.md` 4.3: each channel a binding
 * of a favourite key in its device's own map, sent either as a number through the number sender or digit by
 * digit, and the number sender's one record with its three digit tables.
 *
 * **What a favourite channel is on a remote with no screen.** Five keys below the screen's place on other models
 * hold a channel each; pressing one in the device's mode sends the channel as that device's digit codes, one code
 * per digit and nothing after the last, which was heard on a unit, `reference/remotes/harmony-350/features.md`
 * "Favourite channels". In the configuration a channel is one entry of the device's key map, `0x80` and the
 * favourite key's scan code, calling a list of its own:
 *
 * * **a channel that survives being written as an integer** loads it, `7A n`, and hands it to the number sender's
 *   record, `1F F300`, which queues the device's digit code for each of its decimal digits, record 0 being the one
 *   record every compile read holds;
 * * **a channel with a leading zero** calls the device's digit lists one by one, `07` as the list sending 0 and
 *   then the list sending 7, and never reaches the number sender,
 *   `reference/config-format/state.md` "Base slot 16: the number sender".
 *
 * The number sender's record, base slot 16 and raw slot 11 on this family, is flags, base and minimum all zero,
 * no prologue, epilogue or prefix, and three identical digit tables of ten calls, each a call of the list that
 * sends the device's own code for that digit; tables, then record, as one block after the last state record.
 * The digit lists are the device's own send lists, which a device's commands bring whether or not a favourite
 * uses them, so a favourite adds none.
 *
 * **What it is measured against**, `packages/codec/test/noscreen.test.ts`: Logitech's two compiles of the Harmony
 * 350 test setup differ by the five favourite channels on the KPN and by nothing else but numbering, the lab's
 * `work/setups/h350-test/first-compile/compile-Result.EzHex` and `compile-Result.EzHex`. So the five composed onto
 * the first are held against the second part by part, and the byte count closes: the five lists, their table
 * pointers, the five map entries, the number sender's block and its table entry are the 186 bytes between them.
 *
 * **What it refuses**, each something no compile shows or a question about the remote nobody has answered: a
 * Harmony 300, whose favourite keys are in another order on one compile, `FAVOURITE_SCANS`; more channels than
 * keys; a channel that is not decimal digits, that is 0, or past what the instruction holds, none of them in any
 * compile; a configuration whose number sender holds a record already, since every compile read holds at most
 * one and favourites on a second device are not read; and a device map that binds a favourite key already, since
 * whether a channel replaces what the device's own map holds there, a television's Home or Internet on the fifth
 * favourite key, `todo-compile-350.md` 4.1.1, is read on one compile only, another owner's, whose LG television
 * holds a channel there and has a Home command, and one sample is not a rule.
 */
import { STATE_BAND } from '../../actions.ts';
import { Writer } from '../../emit.ts';
import { archSlot, type Container, parse } from '../../gspm.ts';
import { ACCUMULATOR_LOAD_OPCODE } from '../../ir.ts';
import { devices } from '../../inventory.ts';
import { relocate } from '../../relocate.ts';
import { ACTION_LIST_INDEX_OPCODE, stateRecords, taggedListBytes, taggedListExtent } from '../../sections.ts';
import { appendActionLists, ComposeError, nameOfLabel, restamped } from '../../shared/core.ts';
import { appendTableEntries } from '../../shared/infrared.ts';
import {
  NUMBER_SENDER_RECORD_LENGTH, NUMBER_SENDER_SLOT, NUMBER_SENDER_TABLE_LENGTH, numberSenders,
} from '../../tables.ts';
import {
  highestEnd, inCompilerOrder, type KeyEntry, keyMaps, listExtents, mapOfGroup, PRESS, SCAN_MASK,
} from './devices.ts';
import { deviceDigitLists } from './digits.ts';
import { FAVOURITE_SCANS } from './keys.ts';

/**
 * The band whose sub-operation hands the accumulator to a number sender record, the record its low byte: `1F F300`
 * in every favourite channel list of the five Harmony 300 and 350 compiles that hold one, as read while writing
 * this, four in the lab and another owner's archive; `noscreenfavourites.test.ts` holds it on the second compile and
 * on the Harmony 300's, and it was heard sending the channel on a unit. `actions.ts` names `0xF3` as the hand over to base slot 14 from the other families' images; which
 * slot this image's handler reaches is not read here, and the record it sends through is raw slot 11's.
 */
export const NUMBER_SENDER_BAND = 0xf3;

/** The largest number one `7A` load holds, its sixteen bit operand. */
const ACCUMULATOR_MAX = 0xffff;

/** What to compose: the device the channels are sent to, as the setup names it and as the catalogue holds it. */
export interface NoScreenFavouritesRequest {
  /** The setup's name for the device, `nameOfLabel` of it naming its power variable. */
  readonly name: string;
  /**
   * The device's catalogue folder and file, whose digit commands name which of the device's records sends each
   * digit: a configuration names no record, so a record is found by what it sends.
   */
  readonly manufacturer: string;
  readonly model: string;
  /** The channels in the order they are entered, each its decimal digits as typed. */
  readonly channels: readonly string[];
}

export interface ComposedNoScreenFavourites {
  readonly bytes: Uint8Array;
  /** The device's map the channels were put in, its index in raw slot 6. */
  readonly map: number;
  /** Per channel, in the order given: the favourite key's scan code and the list its binding calls. */
  readonly channels: readonly { readonly channel: string; readonly scan: number; readonly list: number; readonly sent: 'number' | 'digits' }[];
  /** The action list sending each digit, 0 to 9, which the digit tables and the spelled out channels call. */
  readonly digitLists: readonly number[];
  /** The one block digit copies and their send lists made because the device's group lacked them. */
  readonly copiesAdded: number;
  readonly listsAdded: number;
}

/** How a channel goes out: a number through the number sender, or its digits one by one. */
function routeOf(channel: string): 'number' | 'digits' {
  if (!/^[0-9]+$/.test(channel)) throw new ComposeError(`a favourite channel is decimal digits, not "${channel}"`);
  if (channel.length > 1 && channel.startsWith('0')) return 'digits';
  const value = Number(channel);
  // Zero survives as an integer, and with a minimum of no digits the firmware's conversion may queue nothing for
  // it; no compile holds one, so it is refused rather than either route chosen.
  if (value === 0) throw new ComposeError('a favourite channel of 0 is in no compile read, so how it is sent is not known');
  if (value > ACCUMULATOR_MAX) throw new ComposeError(`a favourite channel past ${ACCUMULATOR_MAX} does not fit the load, and no compile holds one`);
  return 'number';
}

/**
 * Compose favourite channels onto a Harmony 350 configuration, on one device. Restamped at the end.
 *
 * The digits a channel sends are the device's one block copies, `deviceDigitLists` in `digits.ts`. Logitech's
 * compile stores those copies for a device of some types whether or not a favourite calls them, and the device
 * composer makes them for the same types, `todo-compile-350.md` 4.1.1, so on a device composed here they are
 * usually found rather than made.
 */
export function composeNoScreenFavourites(
  c: Container, archive: string, request: NoScreenFavouritesRequest,
): ComposedNoScreenFavourites {
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const skin = (c.versionWord ?? -1) & 0xff;
  const scans = FAVOURITE_SCANS[skin];
  if (scans === undefined) throw new ComposeError(`no compile read for skin ${skin} says which key each favourite channel goes on`);
  const count = request.channels.length;
  if (count === 0 || count > scans.length) throw new ComposeError(`${count} favourite channels, where the keys hold 1 to ${scans.length}`);
  const routes = request.channels.map(routeOf);
  const senderSlot = archSlot(c.architecture, NUMBER_SENDER_SLOT);
  const senders = numberSenders(c);
  if (senders === undefined) throw new ComposeError('the number sender does not read');
  if (senders.records.length > 0) {
    throw new ComposeError('the number sender holds a record already: one per configuration in every compile read, and favourites on a second device are not read');
  }
  const device = devices(c).find((one) => one.name === nameOfLabel(request.name));
  if (device?.group === undefined) throw new ComposeError(`no device called ${request.name} is here`);
  const map = mapOfGroup(c, device.group);
  const before = keyMaps(c)[map]!;
  const taken = before.entries.filter((one) => scans.slice(0, count).includes(one.tag & SCAN_MASK));
  if (taken.length > 0) {
    throw new ComposeError(`the device's map binds ${taken.length} favourite key(s) already, and what such a key holds beside a favourite is not answered`);
  }
  // 0. The digits a favourite sends, made where the device's group lacks them.
  const digits = deviceDigitLists(c, archive, request, device.group);
  const digitLists = digits.lists;
  let current = digits.container;

  // 1. The number sender's block after the last state record, where Logitech's compile puts it: three identical
  //    digit tables, then the record naming them. Its table entry, raw slot 11, sits after the block in every
  //    compile of this family, so making room there moves nothing the block's pointers name; checked, not assumed.
  const records = stateRecords(current);
  if (records === undefined || records.length === 0) throw new ComposeError('raw slot 9 holds no state record to put the number sender after');
  const blockAt = highestEnd(records.map((one) => ({ start: current.blobOffsetOf(one.address)!, length: one.length })));
  if (numberSenders(current)!.start < blockAt) throw new ComposeError('the number sender\'s table sits below the state records, which no compile shows');
  const table = new Writer(NUMBER_SENDER_TABLE_LENGTH);
  for (const list of digitLists) table.u16(list).u8(ACTION_LIST_INDEX_OPCODE);
  const tablesLength = 3 * NUMBER_SENDER_TABLE_LENGTH;
  const block = new Uint8Array(tablesLength + NUMBER_SENDER_RECORD_LENGTH);
  for (let k = 0; k < 3; k += 1) block.set(table.bytes, k * NUMBER_SENDER_TABLE_LENGTH);
  // Flags, base, minimum, prologue, epilogue and prefix all zero, then the three table pointers: Logitech's
  // record in the five compiles of this family that hold one, as read while writing this; the test holds it on the
  // second compile.
  const pointers = new Writer(9);
  for (let k = 0; k < 3; k += 1) pointers.u24(current.flashBase + blockAt + k * NUMBER_SENDER_TABLE_LENGTH);
  block.set(pointers.bytes, tablesLength + NUMBER_SENDER_RECORD_LENGTH - 9);
  const hole = relocate(current, blockAt, block.length);
  hole.bytes.set(block, blockAt);
  current = parse(appendTableEntries(parse(hole.bytes), senderSlot, [current.flashBase + blockAt + tablesLength]));

  // 2. One list per channel, after the last list body, as the device composer puts its lists.
  const bodies = request.channels.map((channel, k): [number, number][] => (routes[k] === 'number'
    ? [[Number(channel), ACCUMULATOR_LOAD_OPCODE], [(NUMBER_SENDER_BAND << 8) | 0, STATE_BAND]]
    : [...channel].map((digit): [number, number] => [digitLists[Number(digit)]!, ACTION_LIST_INDEX_OPCODE])));
  const appended = appendActionLists(current, bodies, highestEnd(listExtents(current)));
  current = parse(appended.bytes);

  // 3. The device's map gains a press of each favourite key, rewritten in place at its own address with the room
  //    made at its end; nothing points inside a tagged list.
  const now = keyMaps(current)[map]!;
  const added: KeyEntry[] = request.channels.map((_, k) => ({
    tag: PRESS | scans[k]!, operand: appended.first + k, opcode: ACTION_LIST_INDEX_OPCODE,
  }));
  const grown = taggedListBytes(inCompilerOrder(now.entries, added));
  if (taggedListExtent(current.blob, now.start)?.wide !== false) throw new ComposeError('the device\'s map is not in the narrow form');
  const mapHole = relocate(current, now.start + now.length, grown.length - now.length);
  mapHole.bytes.set(grown, now.start);
  current = parse(mapHole.bytes);

  return {
    bytes: restamped(current.blob),
    map,
    channels: request.channels.map((channel, k) => ({ channel, scan: scans[k]!, list: appended.first + k, sent: routes[k]! })),
    digitLists,
    copiesAdded: digits.copiesAdded,
    listsAdded: digits.listsAdded,
  };
}

