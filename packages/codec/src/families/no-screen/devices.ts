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
 * **What it refuses**, each one something no compile here shows or a later step of the track builds: a long
 * press, a key that already holds a device, the top left key (the start up instructions select its device's map,
 * and what they select with no device there is not read), a device whose catalogue states no power steps, and a
 * configuration whose key maps, start up instructions or timers name a state variable at or above `narrow`, which
 * the shared composer renumbers in action lists and the name tree only.
 */
import { CANCEL_TIMERS, PIN_BAND, START_TIMER_BAND, STATE_BAND, STATE_WRITE_BASE, stateVariableSite } from '../../actions.ts';
import { u8, u16 } from '../../bytes.ts';
import { catalogueDevicePlan } from '../../composecatalogue.ts';
import { Writer } from '../../emit.ts';
import { type Container, type Instruction, parse } from '../../gspm.ts';
import {
  BYTE_REGISTER_LOAD, CONDITION_OPCODE, CONDITION_TWO_ARMS, devices, SELECT_BINDING_SET, SELECT_BINDING_SET_MASK, tagSlotOrder,
} from '../../inventory.ts';
import { withMetadataDevice } from '../../metadata.ts';
import { relocate } from '../../relocate.ts';
import {
  ACTION_LIST_INDEX_OPCODE, stateTable, taggedList, taggedListBytes, taggedListExtent,
} from '../../sections.ts';
import { appendActionLists, ComposeError, nameOfLabel, restamped } from '../../shared/core.ts';
import { composeDeviceFor, type ComposeDevice, type ComposedDevice } from '../../shared/devices.ts';
import { appendTableEntries } from '../../shared/infrared.ts';
import { DEVICE_KEYS, KEY_MAP_SLOT, KEY_TIMERS, POWER_SCAN, START_UP_SLOT, TIMER_SLOT } from './keys.ts';
import { NO_SCREEN_SENDS } from './sends.ts';

/** A key event's type, in the top two bits of a key map's tag, `reference/config-format/modes-and-keys.md`. */
const RELEASE = 0x40;
const PRESS = 0x80;

/** One entry of a key map, the tag and the one instruction it runs, in the narrow form these maps take. */
interface KeyEntry {
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
  /** Which press of the key: only the short one is composed, the long one is `todo-compile-350.md` 4.4. */
  readonly press?: 'short' | 'long';
}

export interface ComposedNoScreenDevice {
  readonly bytes: Uint8Array;
  /** The infrared group, the key's place. */
  readonly group: number;
  /** The device's key map, its index in raw slot 6. */
  readonly map: number;
  /** The catalogue commands composed, one record each in this order, then the power steps' records. */
  readonly commands: readonly string[];
  /** Which command each key of its map sends, by scan code; the power key is in `power`. */
  readonly keys: ReadonlyMap<number, string>;
  /** How its power key works: the toggle's step sent, or the power variable switched. */
  readonly power: 'toggle' | 'variable';
  readonly device: ComposedDevice;
}

/** A blob offset's instructions, `u8 count` then three bytes each, as raw slot 5 and an action list hold them. */
function instructionsAt(blob: Uint8Array, at: number): Instruction[] {
  return Array.from({ length: u8(blob, at) }, (_, k) => ({ operand: u16(blob, at + 1 + 3 * k), opcode: u8(blob, at + 3 + 3 * k) }));
}

/** The end of whichever of a set of blob ranges ends highest: where a run of one kind of thing stops. */
const highestEnd = (ranges: readonly { readonly start: number; readonly length: number }[]): number =>
  Math.max(...ranges.map((one) => one.start + one.length));

/** Every action list body's extent, through the action table. */
function listExtents(c: Container): { start: number; length: number }[] {
  return (c.pointerArray(7) ?? []).map((address) => {
    const start = c.blobOffsetOf(address);
    if (start === undefined) throw new ComposeError('an action list is outside the container');
    return { start, length: 1 + 3 * u8(c.blob, start) };
  });
}

/** Every key map's extent and entries, raw slot 6, entry 0 the key table. */
function keyMaps(c: Container): { start: number; length: number; entries: KeyEntry[] }[] {
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
function assertNoVariablesOutsideLists(c: Container): void {
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

/**
 * A tagged list's entries in the compiler's order, `tagSlotOrder`, with two tags that share a slot kept in the
 * order the list held them, since that order is the order the compiler inserted them, which nothing here reads;
 * a new tag sharing a slot with another is refused rather than guessed. Logitech's compile stores every key map
 * of the Harmony 350 test setup in that order wherever no two tags share a slot, six maps of nine.
 */
function inCompilerOrder(existing: readonly KeyEntry[], added: readonly KeyEntry[]): KeyEntry[] {
  const ties = new Map<string, readonly [number, number]>();
  for (const [k, a] of existing.entries()) {
    for (const b of existing.slice(k + 1)) ties.set([a.tag, b.tag].sort((x, y) => x - y).join(','), [a.tag, b.tag]);
  }
  const all = [...existing, ...added];
  const byTag = new Map(all.map((one) => [one.tag, one]));
  return tagSlotOrder(all.map((one) => one.tag), ties).map((tag) => byTag.get(tag)!);
}

/**
 * Compose a catalogue device onto a Harmony 300 or 350 configuration, on a key's short press. Unstamped where the
 * shared composer leaves it so; the result is restamped once at the end.
 */
export function composeNoScreenDevice(c: Container, archive: string, request: NoScreenDeviceRequest): ComposedNoScreenDevice {
  const key = DEVICE_KEYS[request.place];
  if (key === undefined) throw new ComposeError(`a device key's place is 0 to ${DEVICE_KEYS.length - 1}, not ${request.place}`);
  if (request.press === 'long') throw new ComposeError('a long press device is not composed yet, todo-compile-350.md 4.4');
  if (request.place === 0) {
    throw new ComposeError('the top left key is not composed: the start up instructions select its device\'s map, '
      + 'and what they select with no device there is not read');
  }
  const label = request.name;
  if (devices(c).some((one) => one.name === nameOfLabel(label))) throw new ComposeError(`a device called ${label} is already here`);
  const before = keyMaps(c);
  const taken = before[0]!.entries.filter((one) => (one.tag & 0x3f) === key.scan);
  if (taken.length > 0) {
    throw new ComposeError(`the ${key.place} key already holds a device; a second one is its long press, todo-compile-350.md 4.4`);
  }
  assertNoVariablesOutsideLists(c);

  // The catalogue's device, whole, laid out on the family's keys; only the commands a key binds are stored, as
  // Logitech's compile stores them, `keys.ts`.
  const planned = catalogueDevicePlan(c, archive, {
    manufacturer: request.manufacturer, model: request.model, label, full: true,
  });
  const bound = planned.layout?.keys;
  if (bound === undefined) throw new ComposeError('the family states no key table');
  const names = planned.wanted.filter((name) => [...bound.values()].includes(name));
  const commands = names.map((name) => planned.device.commands[planned.wanted.indexOf(name)]!);
  if (planned.power === undefined || planned.device.powerOn === undefined || planned.device.powerOff === undefined) {
    throw new ComposeError(`${request.manufacturer} ${request.model} states no power steps, and a device without them is not measured on this family`);
  }
  const device: ComposeDevice = { ...planned.device, commands, power: 0 };

  // The shared device composer: the group at the key's place, the send lists after the last list body, since the
  // key map table sits right in front of the action table, the power variable and its name.
  const composed = composeDeviceFor(c, device, NO_SCREEN_SENDS, undefined, {
    group: request.place,
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

  // The device's own map: every key the family's table gives it, then the power key, in the compiler's order,
  // after the last map, and named by a pointer appended to the table.
  const mapEntries: KeyEntry[] = [
    ...[...bound].map(([scan, name]) => ({ tag: PRESS | scan, operand: sendList(name), opcode: ACTION_LIST_INDEX_OPCODE })),
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

  // The key's two lists: the press cancels the timers, switches its pin on and starts its two timers; the release
  // cancels the timers and selects the device's map, `reference/architectures/harmony-300-350/memory.md`.
  const pinOn = (PIN_BAND << 8) | (key.pin << 4) | KEY_TIMERS[KEY_TIMERS.length - 1]!.pinState;
  const keyLists = appendActionLists(current, [
    [[CANCEL_TIMERS.operand, CANCEL_TIMERS.opcode], [pinOn, STATE_BAND],
      ...KEY_TIMERS.map((_, k): [number, number] => [(START_TIMER_BAND << 8) | (firstTimer + k), STATE_BAND])],
    [[CANCEL_TIMERS.operand, CANCEL_TIMERS.opcode], [SELECT_BINDING_SET_MASK | map, SELECT_BINDING_SET]],
  ], highestEnd(listExtents(current)));
  current = parse(keyLists.bytes);

  // Entry 0, the key table, gains the press and the release, rewritten in place at its own address with the room
  // made at its end; nothing points inside a tagged list.
  const table = keyMaps(current)[0]!;
  const grown = taggedListBytes(inCompilerOrder(table.entries, [
    { tag: PRESS | key.scan, operand: keyLists.first, opcode: ACTION_LIST_INDEX_OPCODE },
    { tag: RELEASE | key.scan, operand: keyLists.first + 1, opcode: ACTION_LIST_INDEX_OPCODE },
  ]));
  if (taggedListExtent(current.blob, table.start)?.wide !== false) throw new ComposeError('the key table is not in the narrow form');
  const tableHole = relocate(current, table.start + table.length, grown.length - table.length);
  tableHole.bytes.set(grown, table.start);
  current = parse(tableHole.bytes);

  // And its names, for whatever reads the metadata archive; the remote does not, `metadata.ts`.
  const commandNames = [...new Set(planned.available.map((one) => one.name))];
  current = parse(withMetadataDevice(current, { name: request.name, commands: commandNames }));

  return {
    bytes: restamped(current.blob),
    group: composed.group,
    map,
    commands: names,
    keys: bound,
    power: toggle ? 'toggle' : 'variable',
    device: composed,
  };
}
