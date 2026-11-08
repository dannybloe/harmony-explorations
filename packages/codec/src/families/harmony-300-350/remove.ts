/**
 * A device taken out of a Harmony 300 or 350 configuration, `todo-compile-350.md` 4.1.3: the inverse of
 * `composeNoScreenDevice`, so that a device can be composed onto a configuration whose eight infrared groups are
 * all in use, and so that a device of Logitech's compile can be taken out and composed back, which is the one way to
 * hold the composer against Logitech's file with every other device of the account there.
 *
 * **What goes, and why each part.** A device on this family is its infrared group, filled at the place of its key;
 * the action lists that send its codes, its key map and the lists only that map reaches, its power variable with
 * its two transitions and its name, the key's bindings that select its map with the two timers the key's press
 * starts for it, and its entry in the metadata archive. Each of those is named by an index or a pointer from
 * elsewhere, so taking one out renumbers what is above it:
 *
 * * **an action list** is named by its index in a `0x7F` call, wherever the family's instructions sit: the action
 *   lists themselves, the key maps, the start up events, the timers, the state transitions and the number sender,
 *   `noScreenSites`; every kept call to a list above a dropped one moves down by the number dropped below it;
 * * **a key map** by a select, `1F FFnn`, in the lists and the start up events;
 * * **a timer** by a start, `1F EBnn`, in the key's press list;
 * * **a state variable** by its index in the lists and the name tree, `renumberStateVariables` run downwards;
 * * **a record and its blocks** by pointers only, which `excise` moves.
 *
 * **Which lists are the device's** is a reachability question and not a shape: every list that sends from its
 * group, every list its map, its key bindings and its power transitions reach, and any list nothing kept reaches
 * that calls one of those; less every list something kept still reaches, which is how a list another device's map
 * borrows, the LG TV's Input or the Denon's volume, stays. A list that sends the device's codes and is still reached
 * from something kept, an activity or a favourite channel, makes the removal refuse, since taking the device out
 * would leave that caller sending from an empty group.
 *
 * **A long press device's timers.** The key's press list holds one block per device on the key, the timers
 * cancelled, the key's pin lit and two timers started, `isOneDevicePress`; the composer appends the long press
 * device's block, so the removal takes the last block and the two timers it starts. Both blocks are the same but for
 * the timers, and every timer of one key is the same record, so which block goes changes nothing the remote does.
 *
 * **What it refuses**, each something no compile here shows a removal of or that a later step builds: the device
 * on group 0, the TV mode device, whose Input every other map binds and whose map the start up selects; a short
 * press device with a long press device on the same key, which would leave a held event on a key that selects
 * nothing when let go; a device with a state variable besides its power, an input variable; a power variable that
 * is not a narrow one above the firmware's own; and anything kept that still names a part being taken out.
 *
 * **Measured** by taking each of the four long press devices out of Logitech's two compiles of the test setup and
 * composing it back, `packages/codec/test/noscreenremove.test.ts`. The Harmony 350 alone; the Harmony 300 has no long
 * press and has not been run.
 */
import { instructionSites } from '../../assemble.ts';
import { START_TIMER_BAND, STATE_BAND, stateVariableSite } from '../../actions.ts';
import { u8, u16 } from '../../bytes.ts';
import { Writer } from '../../emit.ts';
import { archSlot, type Container, type Instruction, parse } from '../../gspm.ts';
import {
  devices, firmwareStateVariableMax, SELECT_BINDING_SET_MASK, SEND_INFRARED, stateVariables,
} from '../../inventory.ts';
import { irBlockLength, irGroups, irHeaderLength, irRecordBlocks, irRecordStart } from '../../ir.ts';
import { withoutMetadataDevice } from '../../metadata.ts';
import { excise } from '../../relocate.ts';
import {
  ACTION_LIST_INDEX_OPCODE, assertStateTableConsistent, nameNodes, NAME_LEVEL_STATE_VARIABLE, STATE_RECORD_HEADER,
  STATE_TABLE_HEADER, STATE_VALUE_LENGTH, stateRecords, stateTable, taggedListBytes, taggedListExtent,
} from '../../sections.ts';
import { ACTION_TABLE_SLOT, ComposeError, nameOfLabel, orderNameTree, renumberStateVariables, restamped } from '../../shared/core.ts';
import { HELD, instructionsAt, keyMaps, mapOfGroup, PRESS, RELEASE } from './devices.ts';
import { DEVICE_KEYS, KEY_MAP_SLOT, KEY_TIMERS, LONG_PRESS_GROUP_BASE, START_UP_SLOT, TIMER_SLOT } from './keys.ts';

/** One instruction of a given opcode in a no screen configuration: where its operand is, and what holds it. */
export interface NoScreenSite {
  /** Blob offset of the instruction's operand, the `u16` before its opcode byte. */
  readonly at: number;
  readonly operand: number;
  readonly holder: string;
  /** For a site inside an action list, that list's index. */
  readonly within?: number;
}

/** The three bytes of one instruction, `u16 operand; u8 opcode`. */
const INSTRUCTION_LENGTH = 3;
/** A timer record, `u8 kind; u24 duration; u16 operand; u8 opcode`, its instruction at 4. */
const TIMER_RECORD_LENGTH = 7;
const TIMER_INSTRUCTION_AT = 4;

/**
 * Every instruction of `opcode` in a Harmony 300 or 350 configuration: `instructionSites`' holders, which on this
 * family find the action lists, the state transitions and the number sender, since its other base slots are not
 * placed, `ARCH16_SLOT_MAP`; and the family's own three, which no base slot names: the start up events, raw slot 5,
 * every key map, raw slot 6, and the timers, raw slot 8. An instruction reached twice is one site.
 */
export function noScreenSites(c: Container, opcode: number): NoScreenSite[] {
  const sites = new Map<number, NoScreenSite>(instructionSites(c, opcode).map((one) => [one.at, one]));
  const add = (at: number, holder: string): void => {
    if (at < 0 || at + INSTRUCTION_LENGTH > c.blob.length || c.blob[at + 2] !== opcode || sites.has(at)) return;
    sites.set(at, { at, operand: u16(c.blob, at), holder });
  };
  const startUp = c.sections[START_UP_SLOT];
  const startUpAt = startUp === undefined || startUp.isNull ? undefined : c.blobOffsetOf(startUp.address);
  if (startUpAt !== undefined) for (let k = 0; k < u8(c.blob, startUpAt); k += 1) add(startUpAt + 1 + INSTRUCTION_LENGTH * k, 'start up');
  for (const map of keyMaps(c)) {
    const extent = taggedListExtent(c.blob, map.start);
    if (extent === undefined) continue;
    const stride = extent.wide ? 5 : 4;
    const first = extent.wide ? 2 : 1;
    for (let k = 0; k < extent.count; k += 1) add(map.start + first + stride * k + stride - INSTRUCTION_LENGTH, 'key map');
  }
  for (const address of c.pointerArrayAt(TIMER_SLOT, true)?.values ?? []) {
    const at = c.blobOffsetOf(address);
    if (at !== undefined) add(at + TIMER_INSTRUCTION_AT, 'timer');
  }
  return [...sites.values()].sort((a, b) => a.at - b.at);
}

/** What `withoutNoScreenDevice` took out, every index in the input's numbering. */
export interface RemovedNoScreenDevice {
  readonly bytes: Uint8Array;
  /** The device's infrared group, which is left empty, and how many records it held. */
  readonly group: number;
  readonly records: number;
  /** Its key map. */
  readonly map: number;
  /** The action lists dropped, ascending. */
  readonly lists: readonly number[];
  /** The timers dropped, ascending. */
  readonly timers: readonly number[];
  /** Its power variable. */
  readonly variable: number;
}

/** How many of an ascending list of dropped indices are below `index`. */
function droppedBelow(dropped: readonly number[], index: number): number {
  let low = 0;
  let high = dropped.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (dropped[mid]! < index) low = mid + 1;
    else high = mid;
  }
  return low;
}

/**
 * Cut one entry out of a counted pointer table and the body it names, the count lowered: the entry first, since the
 * census refuses a cut of what a field still names, then the body where it now sits. Returns the parsed result.
 */
function withoutTableEntry(c: Container, slot: number, index: number, length: (c: Container, at: number) => number): Container {
  const table = c.pointerArrayAt(slot, true);
  const address = table?.values[index];
  if (table === undefined || address === undefined) throw new ComposeError(`raw slot ${slot} holds no entry ${index}`);
  const body = c.blobOffsetOf(address);
  if (body === undefined) throw new ComposeError(`raw slot ${slot}'s entry ${index} is outside the container`);
  const bodyLength = length(c, body);
  if (table.values.some((other, k) => k !== index && other === address)) {
    throw new ComposeError(`raw slot ${slot}'s entry ${index} shares its body with another entry`);
  }
  const entryAt = table.start + table.width + 3 * index;
  const cut = excise(c, entryAt, 3, { wholeFields: true }).bytes;
  const count = table.values.length - 1;
  cut.set(table.width === 1 ? [count] : new Writer(2).u16(count).bytes, table.start);
  const between = parse(restamped(cut));
  return parse(excise(between, body > entryAt ? body - 3 : body, bodyLength).bytes);
}

/**
 * Take a device out of a Harmony 300 or 350 configuration, by its setup name: everything `composeNoScreenDevice`
 * puts in, with every index above a dropped one renumbered. The result is stamped.
 */
export function withoutNoScreenDevice(c: Container, name: string): RemovedNoScreenDevice {
  const label = nameOfLabel(name);
  const device = devices(c).find((one) => one.name === label);
  if (device?.group === undefined) throw new ComposeError(`no device called ${name} is here`);
  const group = device.group;
  if (group === 0) {
    throw new ComposeError(`${name} is on infrared group 0, the TV mode device, whose Input every map binds and whose map the start up selects; taking it out is not built`);
  }
  const long = group >= LONG_PRESS_GROUP_BASE;
  const key = DEVICE_KEYS[group % LONG_PRESS_GROUP_BASE];
  if (key === undefined) throw new ComposeError(`group ${group} is no device key's`);
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const listSlot = archSlot(c.architecture, ACTION_TABLE_SLOT);

  // The key's bindings: a long press device's held event; a short press device's press and release, refused with a
  // long press device on the same key, which would be left on a key that selects nothing when let go.
  const maps = keyMaps(c);
  const keyTable = maps[0]!;
  const onKey = (event: number) => keyTable.entries.filter((one) => one.tag === (event | key.scan));
  if (!long && onKey(HELD).length > 0) throw new ComposeError(`the ${key.place} key holds a long press device too; take that out first`);
  const removedTags = new Set((long ? [HELD] : [PRESS, RELEASE]).map((event) => event | key.scan));
  const map = mapOfGroup(c, group);

  // The power variable, the device's one: an input variable is refused rather than left naming nothing.
  const variables = stateVariables(c).filter((one) => new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_[^_]+_\\d+$`).test(one.name));
  const power = variables.find((one) => one.name === `${label}_Power_2`);
  if (power === undefined) throw new ComposeError(`${name} has no power variable`);
  if (variables.length !== 1) throw new ComposeError(`${name} has variables besides its power, ${variables.map((one) => one.name).join(', ')}, which this step does not take out`);
  const variable = power.index;
  const states = stateTable(c);
  if (states === undefined) throw new ComposeError('raw slot 9 does not read as the state table');
  if (variable >= states.narrow || variable <= firmwareStateVariableMax(c.architecture)) {
    throw new ComposeError(`${name}'s power variable ${variable} is not a narrow one above the firmware's own`);
  }
  const powerRecord = stateRecords(c)![variable]!;

  // The press list a long press device's block is cut from, checked for two blocks before anything changes.
  const pressBlock = 2 + KEY_TIMERS.length;
  const pressList = long ? onKey(PRESS)[0]?.operand : undefined;
  const lists = c.pointerArray(listSlot) ?? [];
  const listAt = (index: number): number => {
    const at = lists[index] === undefined ? undefined : c.blobOffsetOf(lists[index]!);
    if (at === undefined) throw new ComposeError(`action list ${index} is outside the container`);
    return at;
  };
  const body = (index: number): Instruction[] => instructionsAt(c.blob, listAt(index));
  let cutTimers: number[] = [];
  if (long) {
    const press = pressList === undefined ? [] : body(pressList);
    if (press.length !== 2 * pressBlock) throw new ComposeError(`the ${key.place} key's press list is not two devices' blocks`);
    cutTimers = press.slice(pressBlock).filter((one) => one.opcode === STATE_BAND && one.operand >> 8 === START_TIMER_BAND)
      .map((one) => one.operand & 0xff);
  }

  // The lists that are the device's: what sends from its group, and what its map, its key bindings and its
  // transitions reach, closed over calls.
  const calls = (index: number): number[] => body(index).filter((one) => one.opcode === ACTION_LIST_INDEX_OPCODE).map((one) => one.operand);
  const closure = (seeds: Iterable<number>, into: Set<number>): Set<number> => {
    const pending = [...seeds].filter((one) => !into.has(one));
    for (const one of pending) into.add(one);
    while (pending.length > 0) {
      for (const next of calls(pending.pop()!)) {
        if (!into.has(next)) {
          into.add(next);
          pending.push(next);
        }
      }
    }
    return into;
  };
  const sending = lists.map((_, index) => index)
    .filter((index) => body(index).some((one) => one.opcode === SEND_INFRARED && one.operand >> 8 === group));
  const mapRange = maps[map]!;
  const recordAt = c.blobOffsetOf(powerRecord.address)!;
  const recordEnd = recordAt + STATE_RECORD_HEADER + STATE_VALUE_LENGTH * powerRecord.count;
  const sites = noScreenSites(c, ACTION_LIST_INDEX_OPCODE);
  const inMap = (at: number) => at >= mapRange.start && at < mapRange.start + mapRange.length;
  const inKeyTable = (at: number) => at >= keyTable.start && at < keyTable.start + keyTable.length;
  // A site the removal takes with it: the device's map, its key bindings (the tag is the byte before the operand)
  // and its power record.
  const removedSite = (one: NoScreenSite): boolean => inMap(one.at)
    || (inKeyTable(one.at) && removedTags.has(c.blob[one.at - 1]!)) || (one.at >= recordAt && one.at < recordEnd);
  const candidates = closure([...sending, ...sites.filter(removedSite).map((one) => one.operand)], new Set());
  const reached = closure(sites.filter((one) => one.within === undefined && !removedSite(one)).map((one) => one.operand), new Set());
  // A list nothing kept reaches that calls one of the device's or names its power variable goes too: Logitech's
  // compiles store an uncalled list per device that writes its power variable, `07 FFFF` and the write.
  const namesVariable = (index: number): boolean => body(index).some((one) => stateVariableSite(one)?.index === variable);
  for (let grown = true; grown;) {
    grown = false;
    for (let index = 0; index < lists.length; index += 1) {
      if (candidates.has(index) || reached.has(index)) continue;
      if (namesVariable(index) || calls(index).some((one) => candidates.has(one))) {
        closure([index], candidates);
        grown = true;
      }
    }
  }
  const dropped = [...candidates].filter((one) => !reached.has(one)).sort((a, b) => a - b);
  const gone = new Set(dropped);
  const stillSending = sending.filter((one) => !gone.has(one));
  if (stillSending.length > 0) {
    throw new ComposeError(`${name}'s codes are sent by list ${stillSending[0]}, which something kept still reaches: an activity or a favourite channel`);
  }
  for (const one of sites) {
    if (gone.has(one.operand) && !removedSite(one) && (one.within === undefined || !gone.has(one.within))) {
      throw new ComposeError(`list ${one.operand} is named by a ${one.holder} at ${one.at} that stays`);
    }
  }

  // The timers: a long press device's two, from its block; a short press device's, from its own press list.
  if (!long) {
    cutTimers = [...new Set(onKey(PRESS).flatMap((one) => body(one.operand))
      .filter((one) => one.opcode === STATE_BAND && one.operand >> 8 === START_TIMER_BAND).map((one) => one.operand & 0xff))];
  }
  const timers = [...new Set(cutTimers)].sort((a, b) => a - b);
  const bandSites = noScreenSites(c, STATE_BAND);
  const pressBlockAt = pressList === undefined ? undefined : listAt(pressList) + 1 + INSTRUCTION_LENGTH * pressBlock;
  const inCutBlock = (at: number) => pressBlockAt !== undefined && at >= pressBlockAt && at < pressBlockAt + INSTRUCTION_LENGTH * pressBlock;
  const keptBand = bandSites.filter((one) => !(one.within !== undefined && gone.has(one.within)) && !inCutBlock(one.at));
  for (const one of keptBand) {
    if (one.operand >> 8 === START_TIMER_BAND && timers.includes(one.operand & 0xff)) {
      throw new ComposeError(`timer ${one.operand & 0xff} is started by a ${one.holder} at ${one.at} that stays`);
    }
    if (one.operand >> 8 === (SELECT_BINDING_SET_MASK >> 8) && (one.operand & 0xff) === map) {
      throw new ComposeError(`map ${map} is selected by a ${one.holder} at ${one.at} that stays`);
    }
  }
  // Nothing kept names the power variable: every list's instructions, the variable's own record aside.
  for (let index = 0; index < lists.length; index += 1) {
    if (gone.has(index)) continue;
    if (namesVariable(index)) {
      throw new ComposeError(`${name}'s power variable is named by list ${index}, which stays`);
    }
  }

  // 1. Every kept index renumbered, in place: lists, maps, timers, then the variables, all one length.
  const bytes = c.blob.slice();
  const write = (at: number, value: number) => bytes.set(new Writer(2).u16(value).bytes, at);
  for (const one of sites) {
    if (one.within !== undefined && gone.has(one.within)) continue;
    write(one.at, one.operand - droppedBelow(dropped, one.operand));
  }
  for (const one of keptBand) {
    const sub = one.operand >> 8;
    const low = one.operand & 0xff;
    if (sub === (SELECT_BINDING_SET_MASK >> 8) && low > map) write(one.at, one.operand - 1);
    if (sub === START_TIMER_BAND) write(one.at, (sub << 8) | (low - droppedBelow(timers, low)));
  }
  let current = parse(renumberStateVariables(parse(bytes), variable + 1, -1));

  // 2. The key table without the device's bindings, in place, the room it no longer needs cut from its end. A
  // hash map's removal unlinks an entry and leaves the rest in their order, which the filter keeps.
  {
    const table = keyMaps(current)[0]!;
    if (taggedListExtent(current.blob, table.start)?.wide !== false) throw new ComposeError('the key table is not in the narrow form');
    const shrunk = taggedListBytes(table.entries.filter((one) => !removedTags.has(one.tag)));
    const out = current.blob.slice();
    out.set(shrunk, table.start);
    current = parse(excise(parse(out), table.start + shrunk.length, table.length - shrunk.length).bytes);
  }

  // 3. A long press device's block cut from the end of the key's press list, which is still at its own index: the
  // table loses its dropped entries in step 6.
  if (pressList !== undefined) {
    const at = current.blobOffsetOf(current.pointerArray(listSlot)![pressList]!)!;
    const out = excise(current, at + 1 + INSTRUCTION_LENGTH * pressBlock, INSTRUCTION_LENGTH * pressBlock).bytes;
    out[at] = pressBlock;
    current = parse(restamped(out));
  }

  // 4. The name: its node cut from the tree, the frame's length lowered.
  {
    const node = (nameNodes(current) ?? []).find((one) => one.level === NAME_LEVEL_STATE_VARIABLE && one.name === power.name);
    const tree = current.sections[archSlot(c.architecture, 0)];
    const treeAt = tree === undefined ? undefined : current.blobOffsetOf(tree.address);
    if (node === undefined || treeAt === undefined || current.frameLength === undefined) throw new ComposeError(`${power.name} is not in the name tree`);
    const out = excise(current, node.start, node.length).bytes;
    out.set(new Writer(3).u24(current.frameLength - node.length).bytes, treeAt + 2);
    current = parse(restamped(out));
  }

  // 5. The power variable: its pointer and the header together, a narrow variable fewer, then its record.
  {
    const table = stateTable(current)!;
    const address = table.entries[variable]!;
    const at = current.blobOffsetOf(address)!;
    const length = STATE_RECORD_HEADER + STATE_VALUE_LENGTH * u16(current.blob, at + 4);
    const entryAt = table.start + STATE_TABLE_HEADER + 3 * variable;
    const out = excise(current, entryAt, 3, { wholeFields: true }).bytes;
    out.set(new Writer(8).u16(table.count - 1).u16(table.narrow - 1).u16(table.wide).u16(table.narrowAgain - 1).bytes, table.start);
    const between = parse(restamped(out));
    current = parse(excise(between, at > entryAt ? at - 3 : at, length).bytes);
    assertStateTableConsistent(current);
  }

  // 6. The timers, the map and the lists, each entry with its body, from the highest index down so that every
  // index still to go is where it was.
  for (const timer of [...timers].reverse()) current = withoutTableEntry(current, TIMER_SLOT, timer, () => TIMER_RECORD_LENGTH);
  current = withoutTableEntry(current, KEY_MAP_SLOT, map, (c2, at) => {
    const extent = taggedListExtent(c2.blob, at);
    if (extent === undefined) throw new ComposeError(`map ${map} does not read as a tagged list`);
    return extent.length;
  });
  for (const list of [...dropped].reverse()) current = withoutTableEntry(current, listSlot, list, (c2, at) => 1 + INSTRUCTION_LENGTH * u8(c2.blob, at));

  // 7. The infrared group: its pointers out of its array, then every run of records and blocks only it names, the
  // highest first. `excise` refuses a run another record's pointer lands in, a block two groups share.
  const target = irGroups(current)![group]!;
  const records = target.addresses.length;
  const pieces: [number, number][] = [];
  for (const address of target.addresses) {
    const start = current.blobOffsetOf(irRecordStart(current, address)!)!;
    pieces.push([start, start + irHeaderLength(current, address)]);
    for (const block of irRecordBlocks(current, address)) {
      const at = current.blobOffsetOf(block)!;
      const length = irBlockLength(current, block);
      if (length === undefined) throw new ComposeError(`a block of ${name}'s does not close`);
      pieces.push([at, at + length]);
    }
  }
  const runs = pieces.sort((a, b) => a[0] - b[0]).reduce<[number, number][]>((out, one) => {
    const last = out[out.length - 1];
    if (last !== undefined && one[0] <= last[1]) last[1] = Math.max(last[1], one[1]);
    else out.push([one[0], one[1]]);
    return out;
  }, []);
  {
    const out = excise(current, target.start + 3, target.length - 3, { wholeFields: true }).bytes;
    out.set(new Writer(2).u16(0).bytes, target.start + 1);
    current = parse(restamped(out));
  }
  for (const [from, to] of runs.reverse()) {
    current = parse(excise(current, from > target.start ? from - (target.length - 3) : from, to - from).bytes);
  }

  // 8. Its names in the metadata archive, and the name tree in the compiler's order for the renumbered indices.
  current = parse(withoutMetadataDevice(current, name));
  current = parse(orderNameTree(current));
  return { bytes: restamped(current.blob), group, records, map, lists: dropped, timers, variable };
}
