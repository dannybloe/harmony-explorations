/**
 * Joining power off across activities and keeping a device on between them: edits of existing lists that
 * every family makes the same way. Plan 007's shared part, cut out of `compose.ts` unchanged.
 */
import { STATE_WRITE_BASE } from '../actions.ts';
import { Writer } from '../emit.ts';
import { archSlot, Container, type Instruction, parse } from '../gspm.ts';
import {
  activities, ACTIVITY_STATE_NAME, allOffList, caseQueued, deviceVariables, handlerSetRoles, MAP_VALUE_OPCODE, stateVariables,
} from '../inventory.ts';
import { valueMaps } from '../valuemap.ts';
import { appendValueMapCase, caseProgram } from './menus.ts';
import { excise, relocate } from '../relocate.ts';
import { ACTION_LIST_INDEX_OPCODE, HANDLER_TAG_ENTER, handlerSets, taggedList } from '../sections.ts';
import { ACTION_TABLE_SLOT, appendActionLists, ComposeError, restamped } from '../shared/core.ts';

/*
 * ---- Switching a device off, section 280 ----
 *
 * A device is switched off by writing 0 into its `Power` variable, which runs the variable's
 * transition from on to off, and **nothing writes that 0 for a composed device**: Logitech's
 * compiler puts every device into two places and the composer put it into neither. Measured on the
 * spare Harmony One, where Off ended the composed activity and left the television on.
 *
 * 1. **The idle key map's all off list**, `allOffList`, which the remote runs when an activity ends.
 * 2. **Every activity's enter list**, which writes every device's power variable, 1 for the devices
 *    it uses and 0 for the rest, so starting an activity switches off what the last one left on. On
 *    every Logitech built configuration measured, across four architectures, directly or through the
 *    lists it calls, sometimes three calls down.
 *
 * `joinPowerOff` puts a new device into both; `activityPowerTargets` gives a new activity the
 * writes for every device, which `composeActivity` then emits like any other target.
 */

export interface JoinedPowerOff {
  bytes: Uint8Array;
  /** The all off list the write was appended to, or made; undefined for a first device, whose write the case holds. */
  allOff: number | undefined;
  /** The enter lists that gained a write, one per activity, in base slot 9 order. */
  enterLists: number[];
}

/**
 * Put a device's power variable into the all off list and into every activity's enter list as 0.
 *
 * **Appended in place**, one three byte instruction per list, through `relocate`, which moves
 * everything at or above the insertion and every pointer to it; the list's own count byte is then
 * raised. In an enter list the write goes **immediately before the write of the activity counter**:
 * every power write of a real enter list sits before that write, and directly in front of it in
 * every user configuration. A list named by two base slot 10 entries is refused, because growing it would
 * change the other one too.
 *
 * **With fewer than two devices there is no list**, section 376: a configuration with one device has its
 * idle switch off record's case queue that device's write of 0 itself, on all four Logitech built ones
 * with one, on the Harmony 525 and the Harmony One, and one with none has a record with no case,
 * `idleOffRecord`. So the first device gives that record its case, and the second turns the case into a
 * call to a list of both writes, the first device's first, as the list of two Logitech's Harmony 650
 * compile with two devices holds; no compile of a Harmony 600, 650 or 700 with one device is in the lab.
 */
export function joinPowerOff(c: Container, variable: number): JoinedPowerOff {
  const power = deviceVariables(c).find((one) => one.index === variable);
  if (power === undefined || power.property !== 'Power') {
    throw new ComposeError(`state variable ${variable} is not a device's Power variable`);
  }
  const allOff = allOffList(c);
  if (allOff !== undefined && allOff.variables.includes(variable)) {
    throw new ComposeError(`the all off list already writes variable ${variable}`);
  }
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  if (counter === undefined) throw new ComposeError(`no ${ACTIVITY_STATE_NAME} variable`);
  const counterWrite = STATE_WRITE_BASE + counter.index;

  const sets = handlerSets(c);
  if (sets === undefined) throw new ComposeError('base slot 9 does not read');
  const roles = handlerSetRoles(c);
  const enterLists: number[] = [];
  sets.addresses.forEach((address, index) => {
    if (roles[index] !== 'activity') return;
    const enter = (taggedList(c, address)?.entries ?? []).find((one) => one.tag === HANDLER_TAG_ENTER);
    if (enter?.opcode !== ACTION_LIST_INDEX_OPCODE) {
      throw new ComposeError(`activity key map ${index} has no enter list`);
    }
    if (!enterLists.includes(enter.operand)) enterLists.push(enter.operand);
  });

  const write = new Writer(3).u16(0).u8(STATE_WRITE_BASE + variable).bytes;
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const actionSlot = archSlot(c.architecture, ACTION_TABLE_SLOT);
  // With fewer than two devices the all off step is its own, and the enter lists keep their indices,
  // since it appends its one list at the table's end.
  let current = allOff === undefined ? parse(firstPowerOffs(c, variable)) : c;
  // Each insertion re-reads the table, since every one moves what follows it.
  const insert = (list: number, position: (body: readonly Instruction[]) => number): void => {
    const table = current.pointerArrayAt(actionSlot);
    const body = current.actionLists()?.[list];
    const address = table?.values[list];
    if (table === undefined || body === undefined || address === undefined) {
      throw new ComposeError(`list ${list} does not read`);
    }
    if (table.values.filter((one) => one === address).length !== 1) {
      throw new ComposeError(`list ${list} is named twice in base slot 10, so growing it grows both`);
    }
    if (body.length >= 0xff) throw new ComposeError(`list ${list} states its count in a byte`);
    const start = current.blobOffsetOf(address);
    if (start === undefined) throw new ComposeError(`list ${list} is outside the container`);
    const at = start + 1 + 3 * position(body);
    const hole = relocate(current, at, write.length);
    hole.bytes.set(write, at);
    hole.bytes[start] = body.length + 1;
    current = parse(hole.bytes);
  };
  if (allOff !== undefined) insert(allOff.list, (body) => body.length);
  for (const list of enterLists) {
    insert(list, (body) => {
      const at = body.findIndex((one) => one.opcode === counterWrite);
      if (at < 0) throw new ComposeError(`enter list ${list} does not write the activity counter`);
      return at;
    });
  }
  return { bytes: restamped(Uint8Array.from(current.blob)), allOff: allOff?.list ?? allOffList(current)?.list, enterLists };
}

/** The record the idle key map switches every device off through, and its case for 0's program if it has one. */
interface IdleOffRecord {
  map: number;
  target: number | undefined;
}

/**
 * The base slot 14 record the idle key map's enter list maps through to switch every device off, found by
 * shape, section 376: of the records that enter list maps through, the one with no case at all, or whose
 * one case, for 0, queues a write of 0 into a `Power` variable, or a call to the all off list. On the
 * Harmony One, the 525 and the 650 compiles the enter list maps through two records and the other's case
 * writes something else. Refused unless exactly one fits.
 */
function idleOffRecord(c: Container): IdleOffRecord {
  const sets = handlerSets(c);
  const roles = handlerSetRoles(c);
  const lists = c.actionLists() ?? [];
  const maps = valueMaps(c) ?? [];
  const power = new Set(deviceVariables(c).filter((one) => one.property === 'Power').map((one) => one.index));
  const allOff = allOffList(c)?.list;
  const found: IdleOffRecord[] = [];
  sets?.addresses.forEach((address, index) => {
    if (roles[index] !== 'idle') return;
    const enter = (taggedList(c, address)?.entries ?? []).find((one) => one.tag === HANDLER_TAG_ENTER);
    if (enter?.opcode !== ACTION_LIST_INDEX_OPCODE) return;
    for (const one of lists[enter.operand] ?? []) {
      if (one.opcode !== MAP_VALUE_OPCODE) continue;
      const map = one.operand >> 8;
      const record = maps[map];
      if (record === undefined || found.some((already) => already.map === map)) continue;
      if (record.entries.length === 0 && record.ranges.length === 0) {
        found.push({ map, target: undefined });
        continue;
      }
      const [first] = record.entries;
      if (record.entries.length !== 1 || record.ranges.length !== 0 || first === undefined || first[0] !== 0) continue;
      const queued = caseQueued(c, first[1]);
      const offWrite = queued !== undefined && queued.opcode >= STATE_WRITE_BASE && queued.operand === 0
        && power.has(queued.opcode - STATE_WRITE_BASE);
      const offCall = queued?.opcode === ACTION_LIST_INDEX_OPCODE && queued.operand === allOff;
      if (offWrite || offCall) found.push({ map, target: first[1] });
    }
  });
  if (found.length !== 1) {
    throw new ComposeError(`${found.length} records the idle key map maps through switch every device off, not one`);
  }
  return found[0] as IdleOffRecord;
}

/**
 * A device's switch off where there is no all off list yet, `joinPowerOff`'s two forms for fewer than two
 * devices: the record with no case gains one queuing the write of 0, and a case queuing one write becomes
 * a call to a new list of that write and this one, in place, since a call is the same five bytes.
 */
function firstPowerOffs(c: Container, variable: number): Uint8Array {
  const record = idleOffRecord(c);
  const write = (one: number): [number, number] => [0, STATE_WRITE_BASE + one];
  // Every other device has to be the one the case already switches off, or none, else one is left on.
  const others = deviceVariables(c).filter((one) => one.property === 'Power' && one.index !== variable).map((one) => one.index);
  if (record.target === undefined) {
    if (others.length > 0) throw new ComposeError(`devices ${others.join(', ')} have a power variable and nothing switches them off`);
    return restamped(appendValueMapCase(c, record.map, 0, caseProgram(STATE_WRITE_BASE + variable, 0)).blob);
  }
  const queued = caseQueued(c, record.target);
  if (queued === undefined || queued.opcode < STATE_WRITE_BASE || queued.operand !== 0) {
    throw new ComposeError(`record ${record.map}'s case does not queue one write of 0`);
  }
  const before = queued.opcode - STATE_WRITE_BASE;
  if (before === variable) throw new ComposeError(`record ${record.map}'s case already switches variable ${variable} off`);
  if (others.some((one) => one !== before)) throw new ComposeError(`record ${record.map}'s case switches variable ${before} off and leaves others on`);
  const made = appendActionLists(c, [[write(before), write(variable)]]);
  const appended = parse(made.bytes);
  // The case's program is found again, since appending the list moved what lay above the action table.
  const target = valueMaps(appended)?.[record.map]?.entries[0]?.[1];
  const at = target === undefined ? undefined : appended.blobOffsetOf(target);
  if (at === undefined) throw new ComposeError(`record ${record.map} stopped reading`);
  const bytes = Uint8Array.from(appended.blob);
  bytes.set(caseProgram(ACTION_LIST_INDEX_OPCODE, made.first), at);
  return restamped(bytes);
}

/**
 * The power writes a new activity makes: 1 into each variable in `on`, 0 into every other device
 * the all off list names, in that order, which is the order a real enter list calls them in.
 *
 * **`keepOn` names the devices MyHarmony's "keep this device on when switching Activities" is set
 * on**, by their power variables, and they get no write of 0: section 340 measured that the setting
 * removes exactly that write from the starts of the activities that do not use the device and changes
 * nothing else. A device in both `on` and `keepOn` is simply switched on, as Logitech's compile does.
 */
export function activityPowerTargets(
  c: Container, on: readonly number[], keepOn: readonly number[] = [],
): { variable: number; value: number }[] {
  const allOff = allOffList(c);
  if (allOff === undefined) throw new ComposeError('no single list switches every device off');
  return [
    ...on.map((variable) => ({ variable, value: 1 })),
    ...allOff.variables.filter((one) => !on.includes(one) && !keepOn.includes(one))
      .map((variable) => ({ variable, value: 0 })),
  ];
}

/**
 * Which activities' starts switch a device off: every list a write of 0 into its Power `variable` sits
 * in, with the activities whose start reaches it, by name. A start is its enter list and the lists that
 * calls, two calls deep, which is where every power write of a Logitech start sits, section 280.
 *
 * `keepDeviceOn`'s reading, split out so that a caller can ask whether MyHarmony's "keep this device on
 * when switching Activities" is already in force without cutting anything: an empty answer for a device
 * some activity does not use is the setting in force, section 340. `assembleSetup` asks it of every
 * device a setup names, `todo-compile-650.md` 10.6.
 */
export function startsSwitchingOff(c: Container, variable: number): Map<number, Set<string>> {
  const power = deviceVariables(c).find((one) => one.index === variable);
  if (power === undefined || power.property !== 'Power') {
    throw new ComposeError(`state variable ${variable} is not a device's Power variable`);
  }
  const sets = handlerSets(c);
  const lists = c.actionLists();
  if (sets === undefined || lists === undefined) throw new ComposeError('base slot 9 or 10 does not read');

  const write = STATE_WRITE_BASE + variable;
  const holders = new Map<number, Set<string>>();
  const walk = (list: number, depth: number, activity: string): void => {
    for (const step of lists[list] ?? []) {
      if (step.opcode === write && step.operand === 0) {
        const named = holders.get(list) ?? new Set<string>();
        named.add(activity);
        holders.set(list, named);
      } else if (step.opcode === ACTION_LIST_INDEX_OPCODE && depth < 2) {
        walk(step.operand, depth + 1, activity);
      }
    }
  };
  for (const one of activities(c)) {
    const enter = (taggedList(c, sets.addresses[one.set] as number)?.entries ?? [])
      .find((entry) => entry.tag === HANDLER_TAG_ENTER);
    if (enter?.opcode !== ACTION_LIST_INDEX_OPCODE) {
      throw new ComposeError(`activity ${one.name ?? one.set} has no enter list`);
    }
    walk(enter.operand, 0, one.name ?? `set ${one.set}`);
  }
  return holders;
}

/** Where `keepDeviceOn` found and removed a device's switch off. */
export interface KeptOn {
  bytes: Uint8Array;
  /** Each list a write of 0 was cut from, and the activities whose start reaches it, by name. */
  cut: { list: number; activities: string[] }[];
}

/**
 * Apply MyHarmony's "keep this device on when switching Activities" to the activities a configuration
 * already holds: cut the write of 0 into `variable` out of every activity's start, and leave the all
 * off list alone, so only All Off switches the device off. Section 340: on the Harmony 650 that setting
 * changed exactly those writes and nothing else, and it was heard so on the remote.
 *
 * **A start is its enter list and the lists that calls**, two calls deep, which is where every power
 * write of a Logitech start sits (section 280: "directly or through the lists it calls"). A write found
 * there is cut whole, three bytes, by `excise`, and the list's count byte lowered; the cuts go from the
 * highest offset down, re-reading after each, since every cut moves what follows it.
 *
 * **What it refuses**, each a case where a cut would change something besides an activity's start: a
 * list named twice in base slot 10, the all off list itself, and a list that holds nothing but the write,
 * which would be left empty. A device that no start switches off is refused too, since the caller asked
 * for a change that is not there: either the setting is already in force or the variable is not a device's.
 * For an activity composed after this, pass the same variable as `keepOn` to `activityPowerTargets`.
 */
export function keepDeviceOn(c: Container, variable: number): KeptOn {
  const allOff = allOffList(c);
  if (allOff === undefined) throw new ComposeError('no single list switches every device off');
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const lists = c.actionLists();
  if (lists === undefined) throw new ComposeError('base slot 10 does not read');
  const write = STATE_WRITE_BASE + variable;
  const holders = startsSwitchingOff(c, variable);
  if (holders.size === 0) {
    throw new ComposeError(`no activity's start switches variable ${variable} off`);
  }

  const actionSlot = archSlot(c.architecture, ACTION_TABLE_SLOT);
  const table = c.pointerArrayAt(actionSlot);
  if (table === undefined) throw new ComposeError('base slot 10 does not read');
  // Every cut, as a blob offset and the list it shortens, highest offset first.
  const cuts: { at: number; list: number }[] = [];
  for (const [list] of holders) {
    if (list === allOff.list) throw new ComposeError(`list ${list} is the all off list, which keeps the device`);
    const address = table.values[list];
    if (address === undefined || table.values.filter((one) => one === address).length !== 1) {
      throw new ComposeError(`list ${list} is named twice in base slot 10, so cutting it cuts both`);
    }
    const body = lists[list] as Instruction[];
    if (body.every((one) => one.opcode === write)) {
      throw new ComposeError(`list ${list} holds nothing but the write, and would be left empty`);
    }
    const start = c.blobOffsetOf(address);
    if (start === undefined) throw new ComposeError(`list ${list} is outside the container`);
    body.forEach((one, k) => {
      if (one.opcode === write && one.operand === 0) cuts.push({ at: start + 1 + 3 * k, list });
    });
  }
  cuts.sort((a, b) => b.at - a.at);

  let current = c;
  for (const { at, list } of cuts) {
    // The count byte sits below every cut in its own list, so cutting from the top down leaves it in
    // place; it is read back from the current table rather than trusted from the first pass.
    const address = current.pointerArrayAt(actionSlot)?.values[list];
    const start = address === undefined ? undefined : current.blobOffsetOf(address);
    if (start === undefined) throw new ComposeError(`list ${list} does not read after a cut`);
    const cut = excise(current, at, 3);
    cut.bytes[start] = (current.blob[start] as number) - 1;
    current = parse(cut.bytes);
  }
  return {
    bytes: restamped(Uint8Array.from(current.blob)),
    cut: [...holders].map(([list, named]) => ({ list, activities: [...named] })),
  };
}
