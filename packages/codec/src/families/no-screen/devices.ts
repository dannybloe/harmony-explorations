/**
 * A catalogue device composed onto a Harmony 300 or 350 configuration, `todo-compile-350.md` 4.1: its infrared
 * group at the place of the key it goes on, in a table allocated at the model's maximum; its send lists, its
 * power variable and its name, through the shared device composer; its own key map, the device mode a person
 * meets after pressing its key; the key's bindings that select that map and light the key; and its names in
 * the metadata archive.
 *
 * **On a remote with no screen a device key is device mode.** Pressing the key and letting go selects the
 * device's key map, and from then on every key sends what that map binds, `reference/how-a-harmony-works.md`.
 * So a composed device needs, besides what every family's device has, the map and the key: without the key its
 * map is never selected and nothing it holds can be sent.
 *
 * **What it is measured against**, `packages/codec/test/noscreen.test.ts`: the Panasonic plasma of the test
 * setup composed from the catalogue onto Logitech's compile of three devices for the bench Harmony 350, which
 * has a free key, and every part held against the same catalogue device in Logitech's compile of the whole test
 * setup, part by part, since Logitech's compiler numbers lists and maps in an order no compile shows a rule for
 * and reorders them between two compiles of one account.
 *
 * **A long press device**, `todo-compile-350.md` 4.4, is the same device on the key's held event: its group is
 * `LONG_PRESS_GROUP_BASE` plus the key's place, its map, power and names are built as a short press device's are,
 * and the key gains a binding of its held event, `0xC0` and the scan code, to a list that cancels the timers and
 * selects the device's map, beside the release that selects the short press device. The key's press list, which
 * switches its pin and starts two timers per device on the key, gains a second such block with two new timers,
 * so it reads as Logitech's press list for a key with two devices: one list, the block twice, the second block's
 * cancel stopping the first block's timers. Held against the four long press devices of Logitech's compile of the
 * test setup, `packages/codec/test/noscreen.test.ts`.
 *
 * **Logitech's routing is copied**, `todo-compile-350.md` 4.1.1, the rules and their counts in `keys.ts`: Input
 * borrows the TV mode device's binding, volume and mute the device `volumeFrom` names, a television's fifth
 * favourite key holds its Home or Internet, Teletext is stored with a send list and bound to no key, and the ten
 * digits' one block copies are stored for the device types Logitech stores them for, and the power variable gets
 * the two silent writes nothing calls, `POWER_RESETS`. A device on the top left
 * key's short press is the TV mode device, 4.1.2: the start up's select names its map and every other map gains
 * its Input. Held in `noscreen.test.ts` and `noscreenrouting.test.ts`.
 *
 * **What it refuses**, each one something no compile here shows or a later step of the track builds: a short
 * press on a key that already holds a device, a long press on a key with no short press device or with a long
 * press device already, a device whose catalogue states no power steps or whose type no compile shows,
 * `DIGIT_COPIES_BY_TYPE`, a television on a model with no fifth favourite key measured, and a configuration whose
 * key maps, start up instructions or timers name a state variable at or above `narrow`, which the shared
 * composer renumbers in action lists and the name tree only.
 *
 * **What it does not do**: a receiver composed onto a configuration does not take over the volume of the devices
 * already there, which Logitech's service would give it, and the test setup's LG television's second stored but
 * unbound record, its Back, is not reproduced, since no rule read says why it is there.
 */
import {
  CANCEL_TIMERS, PIN_BAND, SILENT_WRITE, START_TIMER_BAND, STATE_BAND, STATE_WRITE_BASE, stateVariableSite,
} from '../../actions.ts';
import { u8, u16 } from '../../bytes.ts';
import { catalogueDevicePlan } from '../../composecatalogue.ts';
import { Writer } from '../../emit.ts';
import { type Container, type Instruction, parse } from '../../gspm.ts';
import {
  BYTE_REGISTER_LOAD, compilerHash, CONDITION_OPCODE, CONDITION_TWO_ARMS, devices, SELECT_BINDING_SET, SELECT_BINDING_SET_MASK,
} from '../../inventory.ts';
import { withMetadataDevice } from '../../metadata.ts';
import { excise, relocate } from '../../relocate.ts';
import {
  ACTION_LIST_INDEX_OPCODE, stateTable, taggedList, taggedListBytes, taggedListExtent,
} from '../../sections.ts';
import { appendActionLists, ComposeError, nameOfLabel, restamped } from '../../shared/core.ts';
import { composeDeviceFor, type ComposeDevice, type ComposedDevice } from '../../shared/devices.ts';
import { appendTableEntries } from '../../shared/infrared.ts';
import { deviceDigitLists } from './digits.ts';
import {
  DEVICE_KEYS, DIGIT_COPIES_BY_TYPE, FAVOURITE_FIVE, INPUT_KEY, KEY_MAP_SLOT, KEY_TIMERS, LONG_PRESS_GROUP_BASE, POWER_RESETS,
  POWER_SCAN, START_UP_SELECT_ENTRY, START_UP_SLOT, STORED_UNBOUND, TELEVISION_TYPE, TIMER_SLOT, VOLUME_SCANS,
} from './keys.ts';
import { NO_SCREEN_SENDS } from './sends.ts';

/**
 * A key event's type, in the top two bits of a key map's tag, `reference/config-format/modes-and-keys.md`: the
 * press, the release, and the held event the firmware raises in place of the release once a key has been held for
 * the hold time, `reference/architectures/harmony-300-350/memory.md` "A device key and its long press".
 */
export const RELEASE = 0x40;
export const PRESS = 0x80;
export const HELD = 0xc0;
/** The scan code in the low six bits of a key map's tag. */
export const SCAN_MASK = 0x3f;

/** One entry of a key map, the tag and the one instruction it runs, in the narrow form these maps take. */
export interface KeyEntry {
  readonly tag: number;
  readonly operand: number;
  readonly opcode: number;
}

/** What to compose: a catalogue device, its name, and the key it goes on. */
export interface NoScreenDeviceRequest {
  /** The catalogue folder and file, `devices/<manufacturer>/<model>.json` in the archive. */
  readonly manufacturer: string;
  readonly model: string;
  /**
   * The setup's name for the device, which the metadata archive states as it is and the name tree with each space
   * an underscore, `nameOfLabel`, as Logitech's compile names its `LG TV` `LG_TV_Power_2`.
   */
  readonly name: string;
  /** The device key's place, `DEVICE_KEYS`: 0 top left to 3 bottom right. */
  readonly place: number;
  /**
   * Which press of the key: the short one, selected when the key is let go, or the long one, selected when it is
   * held, `todo-compile-350.md` 4.4; short when not given. A long press goes on a key that holds a short press
   * device already.
   */
  readonly press?: 'short' | 'long';
  /**
   * The device whose volume and mute the device's map sends, by its setup name: `volumeSource` in `keys.ts` gives
   * Logitech's choice from the account's devices and their types. Its own when not given. Another device's means
   * the composed map binds the three keys to the lists that device's own map binds them to, and the device's own
   * volume and mute are not stored, as Logitech's compile stores none for a device whose volume it routes.
   */
  readonly volumeFrom?: string;
}

export interface ComposedNoScreenDevice {
  readonly bytes: Uint8Array;
  /** The infrared group: the key's place for a short press, `LONG_PRESS_GROUP_BASE` plus it for a long one. */
  readonly group: number;
  /** The device's key map, its index in raw slot 6. */
  readonly map: number;
  /** The catalogue commands composed, one record each in this order, then the power steps' records. */
  readonly commands: readonly string[];
  /** Which of the device's own commands each key of its map sends, by scan code; the power key is in `power`. */
  readonly keys: ReadonlyMap<number, string>;
  /** How its power key works: the toggle's step sent, or the power variable switched. */
  readonly power: 'toggle' | 'variable';
  /** The bindings its map borrows from another device's map, by scan code: Input and the volume keys. */
  readonly borrowed: ReadonlyMap<number, number>;
  /** The commands stored with a send list and bound to no key, `STORED_UNBOUND`. */
  readonly unbound: readonly string[];
  /** The one block digit copies and their send lists made, `DIGIT_COPIES_BY_TYPE`. */
  readonly digitCopies: number;
  readonly device: ComposedDevice;
}

/** A blob offset's instructions, `u8 count` then three bytes each, as raw slot 5 and an action list hold them. */
export function instructionsAt(blob: Uint8Array, at: number): Instruction[] {
  return Array.from({ length: u8(blob, at) }, (_, k) => ({ operand: u16(blob, at + 1 + 3 * k), opcode: u8(blob, at + 3 + 3 * k) }));
}

/** The end of whichever of a set of blob ranges ends highest: where a run of one kind of thing stops. */
export const highestEnd = (ranges: readonly { readonly start: number; readonly length: number }[]): number =>
  Math.max(...ranges.map((one) => one.start + one.length));

/** The key map a device's key selects: its key's release for a short press device, the held event for a long one. */
export function mapOfGroup(c: Container, group: number): number {
  const key = DEVICE_KEYS[group % LONG_PRESS_GROUP_BASE];
  if (key === undefined || group >= 2 * LONG_PRESS_GROUP_BASE) throw new ComposeError(`group ${group} is no device key's`);
  const event = group < LONG_PRESS_GROUP_BASE ? RELEASE : HELD;
  const binding = keyMaps(c)[0]!.entries.find((one) => one.tag === (event | key.scan));
  const list = binding?.opcode === ACTION_LIST_INDEX_OPCODE ? c.pointerArray(7)![binding.operand] : undefined;
  const at = list === undefined ? undefined : c.blobOffsetOf(list);
  const select = at === undefined ? undefined
    : instructionsAt(c.blob, at).find((one) => one.opcode === SELECT_BINDING_SET && (one.operand & SELECT_BINDING_SET_MASK) === SELECT_BINDING_SET_MASK);
  if (select === undefined) throw new ComposeError(`the ${key.place} key's ${event === RELEASE ? 'short' : 'long'} press selects no map`);
  return select.operand & 0xff;
}

/** Every action list body's extent, through the action table. */
export function listExtents(c: Container): { start: number; length: number }[] {
  return (c.pointerArray(7) ?? []).map((address) => {
    const start = c.blobOffsetOf(address);
    if (start === undefined) throw new ComposeError('an action list is outside the container');
    return { start, length: 1 + 3 * u8(c.blob, start) };
  });
}

/** Every key map's extent and entries, raw slot 6, entry 0 the key table. */
export function keyMaps(c: Container): { start: number; length: number; entries: KeyEntry[] }[] {
  const table = c.pointerArray(KEY_MAP_SLOT);
  if (table === undefined || table.length === 0) throw new ComposeError('raw slot 6 does not read as the key map table');
  return table.map((address) => {
    const list = taggedList(c, address);
    if (list === undefined) throw new ComposeError(`the key map at ${address.toString(16)} does not read`);
    return { start: list.start, length: list.length, entries: list.entries };
  });
}

/** The timer records' extents, raw slot 8, seven bytes each. */
const TIMER_RECORD_LENGTH = 7;
function timerExtents(c: Container): { start: number; length: number }[] {
  return (c.pointerArrayAt(TIMER_SLOT, true)?.values ?? []).map((address) => {
    const start = c.blobOffsetOf(address);
    if (start === undefined) throw new ComposeError('a timer record is outside the container');
    return { start, length: TIMER_RECORD_LENGTH };
  });
}

/**
 * Refuses a configuration where an instruction outside the action lists names a state variable at or above
 * `narrow`: the key maps, the start up instructions and the timers. The shared composer puts the power variable in
 * at `narrow` and renumbers what is above it in the action lists and the name tree, `renumberStateVariables`, and
 * those three are this family's own and not walked there. On Logitech's compiles of the Harmony 350 every one of
 * them is a call, a select, a pin or a timer, none of which names a variable, so this has refused nothing yet.
 */
export function assertNoVariablesOutsideLists(c: Container): void {
  const narrow = stateTable(c)?.narrow;
  if (narrow === undefined) throw new ComposeError('raw slot 9 does not read as the state table');
  const outside: Instruction[] = keyMaps(c).flatMap((map) => map.entries);
  const startUp = c.sections[START_UP_SLOT];
  const startUpAt = startUp === undefined || startUp.address === 0 ? undefined : c.blobOffsetOf(startUp.address);
  if (startUpAt !== undefined) outside.push(...instructionsAt(c.blob, startUpAt));
  for (const timer of timerExtents(c)) outside.push({ operand: u16(c.blob, timer.start + 4), opcode: u8(c.blob, timer.start + 6) });
  for (const one of outside) {
    const site = stateVariableSite(one);
    if (site !== undefined && site.index >= narrow) {
      throw new ComposeError(`an instruction outside the action lists names state variable ${site.index}, which composing a device would renumber`);
    }
  }
}

/** Java 6's `HashMap` starting table and load factor, which `tagSlotOrder` sizes a stored list by too. */
const HASH_TABLE_START = 16;
const HASH_LOAD_FACTOR = 0.75;

/**
 * A tagged list with `added` put in, in the order the compiler would store it: a Java 6 `HashMap` whose state is
 * `existing` as stored, into which `added` is inserted in its own order.
 *
 * **Why a simulation and not a sort.** A key map is written by walking the compiler's hash map, so tags come out
 * by slot, `hash & (size - 1)`, which is `tagSlotOrder`; two tags in one slot come out in the order the map holds
 * them, which is the order they went in, reversed. Java 6 puts a new entry at the head of its slot and, when an
 * insertion finds the map at three quarters full, doubles the table and moves each slot's entries over one by one
 * to the head of their new slot, which reverses them again. Any one pair's order fits some insertion order, so
 * what speaks for the rule is two measurements that a fixed insertion order would not give alone: `0x2E` and
 * `0x85` are stored with `0x85` first in the three key tables of 16 slots `noscreen.test.ts` reads and with `0x2E`
 * first in its three of 32, which is the reversal, another owner's compile of 32 agreeing; and the favourites
 * below. `0x85` and `0xC1` are stored both ways round in two compiles of 32, which is two insertion orders and
 * why no fixed tie table would do. So the stored order is the map's state, and inserting into it gives what the
 * compiler would have stored had it put our tags in last. `noscreen.test.ts` holds it on
 * Logitech's compile with favourites, whose favourites device's map is the compile without them plus five tags,
 * which is what this predicts with the five put in at the heads of their slots, and not at the tails.
 *
 * **Where it chooses.** The tags of a list built here from nothing go in in the order given, which is the family's
 * key table order and then the power key: that order is ours, and it gives the one pair sharing a slot in the
 * test setup's device maps, Left and Right, `0x8E` and `0x9F`, the order Logitech stores. A table doubled by our
 * insertions follows Java 6's rule, which no composition here has been held against yet, though one crosses it:
 * the long press composer takes the key table from 11 entries to 17, past the twelve at which 16 slots double,
 * and `noscreen.test.ts` scores the long press devices' maps against Logitech's and not that table's order.
 *
 * **None of it changes what the remote does**: the firmware stops at the first entry whose tag matches, read on
 * the other families' images, `reference/config-format/modes-and-keys.md` "For a writer", and a list holds each
 * tag once. It is reproduced so that a composed list stores as Logitech's would. A stored list whose tags are not
 * in slot order is not a hash map's and is refused, as is a tag given twice.
 */
export function inCompilerOrder(existing: readonly KeyEntry[], added: readonly KeyEntry[]): KeyEntry[] {
  const tags = [...existing, ...added].map((one) => one.tag);
  if (new Set(tags).size !== tags.length) throw new ComposeError('a tagged list cannot hold a tag twice');
  let size = HASH_TABLE_START;
  while (existing.length > size * HASH_LOAD_FACTOR) size *= 2;
  const slot = (tag: number, of: number): number => compilerHash(tag) & (of - 1);
  let slots: KeyEntry[][] = Array.from({ length: size }, () => []);
  for (const one of existing) slots[slot(one.tag, size)]!.push(one);
  if (slots.flat().some((one, k) => one !== existing[k])) {
    throw new ComposeError('a tagged list here is not stored in the compiler\'s slot order, so it is not its hash map');
  }
  let count = existing.length;
  for (const one of added) {
    // `addEntry`: the new entry at the head of its slot, then the table doubled if the map was already at its
    // threshold, each old slot's entries moved to the head of their new slot in turn.
    slots[slot(one.tag, size)]!.unshift(one);
    if (count >= size * HASH_LOAD_FACTOR) {
      const doubled: KeyEntry[][] = Array.from({ length: 2 * size }, () => []);
      for (const entries of slots) for (const entry of entries) doubled[slot(entry.tag, 2 * size)]!.unshift(entry);
      slots = doubled;
      size *= 2;
    }
    count += 1;
  }
  return slots.flat();
}

/**
 * The press list of a key with one device: the timers cancelled, the key's pin switched on and two timers started,
 * `07 FFFB`, `1F E9p2` and two `1F EBnn`, as Logitech's compiles and the short press composer below write it.
 * A long press appends the same block again, so a press list of any other shape is refused rather than extended.
 */
function isOneDevicePress(list: readonly Instruction[], pin: number): boolean {
  const pinOn = (PIN_BAND << 8) | (pin << 4) | KEY_TIMERS[KEY_TIMERS.length - 1]!.pinState;
  return list.length === 2 + KEY_TIMERS.length
    && list[0]!.opcode === CANCEL_TIMERS.opcode && list[0]!.operand === CANCEL_TIMERS.operand
    && list[1]!.opcode === STATE_BAND && list[1]!.operand === pinOn
    && list.slice(2).every((one) => one.opcode === STATE_BAND && one.operand >> 8 === START_TIMER_BAND);
}

/** The start up event list that selects the TV mode device's map, `START_UP_SELECT_ENTRY`, and where it is. */
function startUpSelectList(c: Container): { list: number; at: number; body: Instruction[] } {
  const startUp = c.sections[START_UP_SLOT];
  const startUpAt = startUp === undefined || startUp.address === 0 ? undefined : c.blobOffsetOf(startUp.address);
  if (startUpAt === undefined) throw new ComposeError('raw slot 5 holds no start up events');
  const entry = instructionsAt(c.blob, startUpAt)[START_UP_SELECT_ENTRY];
  if (entry?.opcode !== ACTION_LIST_INDEX_OPCODE) throw new ComposeError(`start up event ${START_UP_SELECT_ENTRY} is not a call of a list`);
  const at = c.blobOffsetOf(c.pointerArray(7)![entry.operand]!)!;
  return { list: entry.operand, at, body: instructionsAt(c.blob, at) };
}

const isSelect = (one: Instruction | undefined): boolean =>
  one?.opcode === SELECT_BINDING_SET && (one.operand & SELECT_BINDING_SET_MASK) === SELECT_BINDING_SET_MASK;

/**
 * The start up event list with its last instruction selecting `map`, `todo-compile-350.md` 4.1.2: in all seven
 * compiles of the family read, entry 1's list is the same two calls as entries 2 to 4's and then a select of the
 * map of the device on infrared group 0, so the remote starts in that device's mode. A select already there is
 * restated; with none, as after the device on group 0 is taken out, one is appended to the list.
 */
export function withStartUpSelect(c: Container, map: number): Container {
  const { at, body } = startUpSelectList(c);
  const select = new Writer(3).u16(SELECT_BINDING_SET_MASK | map).u8(SELECT_BINDING_SET).bytes;
  if (isSelect(body.at(-1))) {
    const out = c.blob.slice();
    out.set(select, at + 1 + 3 * (body.length - 1));
    return parse(restamped(out));
  }
  if (body.some(isSelect)) throw new ComposeError('the start up list selects a map before its end, which no compile shows');
  const hole = relocate(c, at + 1 + 3 * body.length, select.length);
  hole.bytes.set(select, at + 1 + 3 * body.length);
  hole.bytes[at] = body.length + 1;
  return parse(restamped(hole.bytes));
}

/**
 * The start up event list without its select: the inverse of `withStartUpSelect`, which leaves entry 1's list as
 * entries 2 to 4's are, for a configuration whose device on infrared group 0 is taken out.
 */
export function withoutStartUpSelect(c: Container): Container {
  const { at, body } = startUpSelectList(c);
  if (!isSelect(body.at(-1))) return c;
  const hole = excise(c, at + 1 + 3 * (body.length - 1), 3);
  hole.bytes[at] = body.length - 1;
  return parse(restamped(hole.bytes));
}

/**
 * A key map entry put in every device map but `except`, where the map does not bind the tag already: the TV mode
 * device's Input on every other device's map, as Logitech's compiles carry it, `INPUT_KEY`. Each map is rewritten in
 * place at its own address with the room made at its end; nothing points inside a tagged list.
 */
function withBindingOnEveryMap(c: Container, except: number, tag: number, list: number): Container {
  let current = c;
  for (let entry = 1; entry < keyMaps(current).length; entry += 1) {
    if (entry === except) continue;
    const map = keyMaps(current)[entry]!;
    if (map.entries.some((one) => one.tag === tag)) continue;
    const grown = taggedListBytes(inCompilerOrder(map.entries, [{ tag, operand: list, opcode: ACTION_LIST_INDEX_OPCODE }]));
    if (taggedListExtent(current.blob, map.start)?.wide !== false) throw new ComposeError(`map ${entry} is not in the narrow form`);
    const hole = relocate(current, map.start + map.length, grown.length - map.length);
    hole.bytes.set(grown, map.start);
    current = parse(hole.bytes);
  }
  return current;
}

/**
 * Compose a catalogue device onto a Harmony 300 or 350 configuration, on a key's short or long press. Unstamped
 * where the shared composer leaves it so; the result is restamped once at the end.
 */
export function composeNoScreenDevice(c: Container, archive: string, request: NoScreenDeviceRequest): ComposedNoScreenDevice {
  const key = DEVICE_KEYS[request.place];
  if (key === undefined) throw new ComposeError(`a device key's place is 0 to ${DEVICE_KEYS.length - 1}, not ${request.place}`);
  const long = request.press === 'long';
  // A long press device's group is four on from the short press device's, whichever device is on the short press.
  const group = long ? LONG_PRESS_GROUP_BASE + request.place : request.place;
  // The top left key's short press device is the TV mode's, in the service's words: the start up instructions select
  // its map, `todo-compile-350.md` 4.1.2, and every other device's Input key sends its input command, 4.1.1. A long
  // press device on the same key is neither, as Logitech's compile of the test setup shows, whose start up selects
  // the LG TV's map with the Knoll on the same key's long press.
  const tvMode = request.place === 0 && !long;
  const label = request.name;
  if (devices(c).some((one) => one.name === nameOfLabel(label))) throw new ComposeError(`a device called ${label} is already here`);
  const before = keyMaps(c);
  const onKey = (event: number) => before[0]!.entries.filter((one) => one.tag === (event | key.scan));
  if (!long && before[0]!.entries.some((one) => (one.tag & SCAN_MASK) === key.scan)) {
    throw new ComposeError(`the ${key.place} key already holds a device; a second one is its long press, todo-compile-350.md 4.4`);
  }
  // The held event is bound only on a key whose release selects a device too, in both compiles read with a long
  // press: what a key with nothing on its short press should do when let go is not answered by any of them, so a
  // long press there is refused rather than leaving the short press to whatever the firmware does with a release
  // nothing binds.
  if (long && onKey(RELEASE).length === 0) {
    throw new ComposeError(`the ${key.place} key holds no short press device, and a long press device goes on a key that has one`);
  }
  if (long && onKey(HELD).length > 0) throw new ComposeError(`the ${key.place} key already holds a long press device`);
  // The press list a long press extends, read and checked before anything is changed.
  const press = long ? onKey(PRESS) : [];
  if (long) {
    const at = press.length === 1 && press[0]!.opcode === ACTION_LIST_INDEX_OPCODE
      ? c.blobOffsetOf(c.pointerArray(7)![press[0]!.operand]!) : undefined;
    if (at === undefined || !isOneDevicePress(instructionsAt(c.blob, at), key.pin)) {
      throw new ComposeError(`the ${key.place} key's press is not the one device press a long press extends`);
    }
  }
  assertNoVariablesOutsideLists(c);

  // The catalogue's device, whole, laid out on the family's keys; only the commands a key binds are stored, as
  // Logitech's compile stores them, `keys.ts`.
  const planned = catalogueDevicePlan(c, archive, {
    manufacturer: request.manufacturer, model: request.model, label, full: true,
  });
  const bound = planned.layout?.keys;
  if (bound === undefined) throw new ComposeError('the family states no key table');
  const type = planned.entry.deviceType;
  const copies = DIGIT_COPIES_BY_TYPE.get(type);
  if (copies === undefined) {
    throw new ComposeError(`whether Logitech stores digit copies for a device of type ${type} is in no compile read, `
      + `so ${request.manufacturer} ${request.model} is not composed; the measured types are ${[...DIGIT_COPIES_BY_TYPE.keys()].join(', ')}`);
  }

  // Logitech's routing, `todo-compile-350.md` 4.1.1, `keys.ts`: which keys the map binds to the device's own
  // commands, and which it borrows from another device's map, the same list that map calls.
  const own = new Map(bound);
  const borrowed = new Map<number, number>();
  // Input: the TV mode device's own input command on its own map, and its binding on every other map.
  let inputOwn: string | undefined;
  if (tvMode) {
    inputOwn = INPUT_KEY.prefer.find((name) => planned.wanted.includes(name));
    if (inputOwn !== undefined) own.set(INPUT_KEY.scan, inputOwn);
  } else if (devices(c).some((one) => one.group === 0 && one.name !== undefined)) {
    const tv = keyMaps(c)[mapOfGroup(c, 0)]!.entries.find((one) => one.tag === (PRESS | INPUT_KEY.scan));
    if (tv !== undefined) borrowed.set(INPUT_KEY.scan, tv.operand);
  }
  // Volume and mute: the device's own, or the lists the named device's map binds them to.
  if (request.volumeFrom !== undefined && nameOfLabel(request.volumeFrom) !== nameOfLabel(label)) {
    const from = devices(c).find((one) => one.name === nameOfLabel(request.volumeFrom!));
    if (from?.group === undefined) throw new ComposeError(`no device called ${request.volumeFrom} is here to take the volume from`);
    const fromMap = keyMaps(c)[mapOfGroup(c, from.group)]!;
    for (const scan of VOLUME_SCANS) {
      own.delete(scan);
      const entry = fromMap.entries.find((one) => one.tag === (PRESS | scan));
      if (entry !== undefined) borrowed.set(scan, entry.operand);
    }
  }
  // A television's fifth favourite key, per skin.
  if (type === TELEVISION_TYPE) {
    const skin = (c.versionWord ?? -1) & 0xff;
    const five = FAVOURITE_FIVE[skin];
    if (five === undefined) throw new ComposeError(`which command a television's favourite key takes is measured on the Harmony 350 alone, not skin ${skin}`);
    const command = five.prefer.find((name) => planned.wanted.includes(name));
    if (command !== undefined) own.set(five.scan, command);
  }
  // And what Logitech stores with a send list and binds to no key of this keypad.
  const ownNames = new Set(own.values());
  const unbound = STORED_UNBOUND.filter((name) => planned.wanted.includes(name) && !ownNames.has(name));
  const names = planned.wanted.filter((name) => ownNames.has(name) || unbound.includes(name));
  const commands = names.map((name) => planned.device.commands[planned.wanted.indexOf(name)]!);
  if (planned.power === undefined || planned.device.powerOn === undefined || planned.device.powerOff === undefined) {
    throw new ComposeError(`${request.manufacturer} ${request.model} states no power steps, and a device without them is not measured on this family`);
  }
  const device: ComposeDevice = { ...planned.device, commands, power: 0 };

  // The shared device composer: the group the key and its press give, the send lists after the last list body,
  // since the key map table sits right in front of the action table, the power variable and its name.
  const composed = composeDeviceFor(c, device, NO_SCREEN_SENDS, undefined, {
    group,
    listsAt: (at) => highestEnd(listExtents(at)),
  });
  let current = parse(composed.bytes);
  const sendList = (name: string): number => composed.lists[names.indexOf(name)]!;

  // The power key. A toggle, one step that switches the device both ways, sends that step's own list, the KPN's
  // and the Sony HT's in Logitech's compile; a device switched on and off by different steps switches its power
  // variable, the byte register loaded with 0 and the variable written 1 where it holds that and 0 where it does
  // not, two lists, the Plasma's and the Knoll's.
  const steps = composed.powerSteps;
  const toggle = steps?.on !== undefined && steps.on === steps.off;
  let powerList: number;
  if (toggle) {
    powerList = steps.on!;
  } else {
    const variable = composed.variable;
    const lists = appendActionLists(current, [
      [[(BYTE_REGISTER_LOAD << 8) | 0, STATE_BAND], [0, ACTION_LIST_INDEX_OPCODE]],
      [[CONDITION_TWO_ARMS | variable, CONDITION_OPCODE], [1, STATE_WRITE_BASE + variable], [0, STATE_WRITE_BASE + variable]],
    ], highestEnd(listExtents(current)));
    // The first list calls the second, whose index is only known now.
    current = parse(lists.bytes);
    const outer = current.blobOffsetOf(current.pointerArray(7)![lists.first]!)!;
    current.blob.set(new Writer(2).u16(lists.first + 1).bytes, outer + 4);
    current = parse(current.blob);
    powerList = lists.first;
  }
  // The power variable's two silent writes, which nothing calls, as Logitech stores them for every device,
  // `POWER_RESETS`.
  current = parse(appendActionLists(current,
    POWER_RESETS.map((value) => [[SILENT_WRITE.operand, SILENT_WRITE.opcode], [value, STATE_WRITE_BASE + composed.variable]]),
    highestEnd(listExtents(current))).bytes);

  // The device's own map: every key the family's table gives it, then the power key, in the compiler's order,
  // after the last map, and named by a pointer appended to the table.
  // The borrowed keys go in where the family's table has them and the rest after, then the power key; the order
  // only matters where two tags share a slot of the compiler's hash map, `inCompilerOrder`.
  const mapEntries: KeyEntry[] = [
    ...[...own].map(([scan, name]) => ({ tag: PRESS | scan, operand: sendList(name), opcode: ACTION_LIST_INDEX_OPCODE })),
    ...[...borrowed].map(([scan, list]) => ({ tag: PRESS | scan, operand: list, opcode: ACTION_LIST_INDEX_OPCODE })),
    { tag: PRESS | POWER_SCAN, operand: powerList, opcode: ACTION_LIST_INDEX_OPCODE },
  ];
  const mapBytes = taggedListBytes(inCompilerOrder([], mapEntries));
  const mapsNow = keyMaps(current);
  const mapAt = highestEnd(mapsNow);
  const mapHole = relocate(current, mapAt, mapBytes.length);
  mapHole.bytes.set(mapBytes, mapAt);
  current = parse(appendTableEntries(parse(mapHole.bytes), KEY_MAP_SLOT, [current.flashBase + mapAt]));
  const map = mapsNow.length;

  // The key's two timers, the pin switched off at 400 ticks and on at 600, after the last timer record.
  const timersNow = timerExtents(current);
  const timerAt = timersNow.length === 0 ? undefined : highestEnd(timersNow);
  if (timerAt === undefined) throw new ComposeError('raw slot 8 holds no timer to put the key\'s after');
  const timerBytes = new Writer(TIMER_RECORD_LENGTH * KEY_TIMERS.length);
  for (const one of KEY_TIMERS) {
    timerBytes.u8(0).u24(one.ticks).u16((PIN_BAND << 8) | (key.pin << 4) | one.pinState).u8(STATE_BAND);
  }
  const timerHole = relocate(current, timerAt, timerBytes.bytes.length);
  timerHole.bytes.set(timerBytes.bytes, timerAt);
  current = parse(appendTableEntries(parse(timerHole.bytes), TIMER_SLOT,
    KEY_TIMERS.map((_, k) => current.flashBase + timerAt + TIMER_RECORD_LENGTH * k)));
  const firstTimer = timersNow.length;

  // The key's lists. A short press: the press cancels the timers, switches its pin on and starts its two timers,
  // and the release cancels the timers and selects the device's map, `reference/architectures/harmony-300-350/memory.md`.
  // A long press: the held event cancels the timers and selects the device's map, and the press list the short
  // press device already has gains the same block again with the new timers, as Logitech's press list for a key
  // with two devices carries it; the release stays the short press device's.
  const pinOn = (PIN_BAND << 8) | (key.pin << 4) | KEY_TIMERS[KEY_TIMERS.length - 1]!.pinState;
  const pressBlock: [number, number][] = [[CANCEL_TIMERS.operand, CANCEL_TIMERS.opcode], [pinOn, STATE_BAND],
    ...KEY_TIMERS.map((_, k): [number, number] => [(START_TIMER_BAND << 8) | (firstTimer + k), STATE_BAND])];
  const select: [number, number][] = [[CANCEL_TIMERS.operand, CANCEL_TIMERS.opcode], [SELECT_BINDING_SET_MASK | map, SELECT_BINDING_SET]];
  let added: KeyEntry[];
  if (long) {
    const held = appendActionLists(current, [select], highestEnd(listExtents(current)));
    current = parse(held.bytes);
    // The press list grows at its own end, its count raised; nothing points inside a list, and the list after it
    // moves up with everything else at or above the cut.
    const at = current.blobOffsetOf(current.pointerArray(7)![press[0]!.operand]!)!;
    const count = u8(current.blob, at);
    const block = new Writer(3 * pressBlock.length);
    for (const [operand, opcode] of pressBlock) block.u16(operand).u8(opcode);
    const pressHole = relocate(current, at + 1 + 3 * count, block.bytes.length);
    pressHole.bytes.set(block.bytes, at + 1 + 3 * count);
    pressHole.bytes[at] = count + pressBlock.length;
    current = parse(pressHole.bytes);
    added = [{ tag: HELD | key.scan, operand: held.first, opcode: ACTION_LIST_INDEX_OPCODE }];
  } else {
    const keyLists = appendActionLists(current, [pressBlock, select], highestEnd(listExtents(current)));
    current = parse(keyLists.bytes);
    added = [
      { tag: PRESS | key.scan, operand: keyLists.first, opcode: ACTION_LIST_INDEX_OPCODE },
      { tag: RELEASE | key.scan, operand: keyLists.first + 1, opcode: ACTION_LIST_INDEX_OPCODE },
    ];
  }

  // Entry 0, the key table, gains the bindings, rewritten in place at its own address with the room made at its
  // end; nothing points inside a tagged list.
  const table = keyMaps(current)[0]!;
  const grown = taggedListBytes(inCompilerOrder(table.entries, added));
  if (taggedListExtent(current.blob, table.start)?.wide !== false) throw new ComposeError('the key table is not in the narrow form');
  const tableHole = relocate(current, table.start + table.length, grown.length - table.length);
  tableHole.bytes.set(grown, table.start);
  current = parse(tableHole.bytes);

  // The TV mode device, `todo-compile-350.md` 4.1.2: the start up's select names its map, and every other device's
  // map gains its Input binding where it has an input command.
  if (tvMode) {
    current = withStartUpSelect(current, map);
    if (inputOwn !== undefined) current = withBindingOnEveryMap(current, map, PRESS | INPUT_KEY.scan, sendList(inputOwn));
  }

  // The ten digits' one block copies, each with a send list nothing calls until a favourite does, for the device
  // types Logitech stores them for, `DIGIT_COPIES_BY_TYPE`; a device without the ten digit commands has none to copy.
  let digitCopies = 0;
  const digitNames = Array.from({ length: 10 }, (_, d) => String(d));
  if (copies && digitNames.every((name) => planned.wanted.includes(name))) {
    const made = deviceDigitLists(current, archive, { name: label, manufacturer: request.manufacturer, model: request.model }, group);
    current = made.container;
    digitCopies = made.copiesAdded;
  }

  // And its names, for whatever reads the metadata archive; the remote does not, `metadata.ts`.
  const commandNames = [...new Set(planned.available.map((one) => one.name))];
  current = parse(withMetadataDevice(current, { name: request.name, commands: commandNames }));

  return {
    bytes: restamped(current.blob),
    group: composed.group,
    map,
    commands: names,
    keys: new Map([...own].map(([scan, name]) => [scan, name])),
    power: toggle ? 'toggle' : 'variable',
    borrowed,
    unbound,
    digitCopies,
    device: composed,
  };
}
