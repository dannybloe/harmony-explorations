/**
 * The Harmony 300 and 350's one activity, Watch TV, composed onto a configuration: the
 * no screen family's own composer, since nothing of the screen families' activity carries over. There is no
 * activity record, no activity map, no menu row and no screen; **the activity is one list bound to Watch TV's
 * press**, tag `0x86` in entry 0, the key table every press falls through to,
 * `reference/architectures/harmony-300-350/memory.md` "The activity".
 *
 * **What the list does, in the order Logitech's compiler writes it**, each step measured on its compiles:
 *
 * 1. **Each device's power, flipped**, in the order the metadata archive lists the devices, which is the account's.
 *    A device switched on and off by one toggle code sends that code's list and then waits its power on delay as
 *    one `0x7C`; any other device has its power variable flipped, through two lists of the activity's own: the byte
 *    register loaded with 0, then a two armed compare of the register with the variable writing 1 where they are
 *    equal and 0 where not. **So the activity switches a device that is already on off**, and a toggle device the
 *    other way from where it is: it never asks the device's real state. That is Logitech's behaviour, and it is
 *    reproduced rather than redesigned; the manual's advice to use the 350 as the only remote is about exactly this.
 * 2. **The activity's flag**, `ActivityPowerState_2`, flipped the same way: two values, no transitions.
 * 3. **The inputs, on the way on only**: the register loaded with 1 and a one armed compare with the flag, whose arm
 *    runs where the flag is now 1. The arm is the one input write itself, a list of the writes where there are
 *    several, in the same device order, or the null instruction where there are none.
 * 4. **The channel device's map selected**, the map that device's key selects, both ways.
 *
 * **Every list of it is the activity's own copy.** The register and compare pair a device's power key runs is not
 * shared with the activity, though its bytes are the same; only a toggle device's send list is, since it is the
 * device's. The wait after a toggle device is the device's power on delay as one `0x7C`, where the device's own on
 * list splits a delay past ten seconds into waits of ten, so a delay is stated twice and an edit of it must reach
 * both, which `edit.ts`'s `setPowerOnDelay` does through the family, `delay.ts`.
 *
 * **The inputs are the activity's too**: a device's input variable exists only where the activity puts the device
 * on an input. One composed here has one value per input the catalogue lists, each going from any value to its own
 * through a send list of its own, sending the input command's one block copy, the copy the favourite channels' digits
 * send too, appended to the device's group, and waiting a tenth, where the screen families' inputs send the whole
 * record and wait the input delay, `inputs.ts`. **The value written is the chosen input's place in the catalogue's
 * list**: the numbering is measured, 19 of 19 on the Denon, but every gate of every compile read writes 0, so no
 * compile shows a write of another value; the composer writes the place, which on the test setup is 0 as well. A device whose every input sets
 * catalogue states and sends nothing itself, the LG OLED of the test setup, gets a variable of one value and no
 * transitions, and the activity writes 0 to it: **nothing is sent for that input**, which is what Logitech's compile
 * does. Every other shape is refused, since no compile shows it.
 *
 * **Replacing what is there.** Every compile of the family holds an activity, the factory's included, so the
 * composer replaces one: Watch TV's binding is pointed at the new list in place, the flag is reused, and the old
 * lists are left unreferenced, as Logitech's compile of the test setup leaves fifty of its own. A device the activity puts on an input and
 * which holds an input variable already is refused, since replacing a variable is a removal step nobody has built;
 * an old input variable the new activity does not write stays, and nothing writes it. **On a configuration with no
 * activity**, the empty one a build from nothing starts from, Watch TV's press is bound
 * in the key table and the flag is created, as every input variable already was: `flag.reused` says which happened.
 *
 * **What it rests on**, `packages/codec/test/families/harmony-300-350/noscreenactivity.test.ts`: the test setup's activity composed onto
 * Logitech's compile of three devices for the bench Harmony 350, after our LG TV and Denon, held part by part
 * against Logitech's compile of the whole test setup; and each of seven compiles of the current generation,
 * six for a Harmony 350 and one for a Harmony 300, given its own activity's devices again and compared with what
 * Logitech wrote.
 */
import type { CatalogueSource } from '../../catalogue/catalogue.ts';
import { catalogueDevicePlan } from '../../compose/composecatalogue.ts';
import { type Container, type Instruction, parse } from '../../container/gspm.ts';
import { commandIndex, encodeStateRecord, FROM_ANY } from '../../compose/inputs.ts';
import {
  DEVICE_QUANTITY, DEVICE_QUANTITY_DEFAULT, deviceVariables, devices, INPUT_PROPERTY, POWER_PROPERTY, stateVariables,
} from '../../inventory/inventory.ts';
import { metadataArchive } from '../../container/metadata.ts';
import { ACTION_LIST_INDEX_OPCODE, stateRecords, taggedListExtent } from '../../container/sections.ts';
import { appendActionLists, appendNarrowStateVariable, ComposeError, nameOfLabel, restamped } from '../../shared/core.ts';
import { irGroups } from '../../infrared/ir.ts';
import { appendCopyRecord, oneBlockCopy } from '../../compose/sequence.ts';
import { composeIrGroup } from '../../shared/infrared.ts';
import {
  type ActivityStepWrite, activityList, type Body, bodyOf, type ConditionArm, conditionList, flipList, gateList,
  sendList, writesList,
} from './lists.ts';
import {
  arraysStart, assertNoVariablesOutsideLists, highestEnd, keyMaps, listExtents, mapOfGroup, PRESS, withMapEntries,
} from './devices.ts';

/** Watch TV's scan code, the only key either model's face gives an activity, `reference/remotes/harmony-350/keys.md`. */
export const WATCH_TV_SCAN = 6;

/** The activity's flag as the name tree names it: its property word and its two values. */
export const ACTIVITY_FLAG = 'ActivityPowerState_2';

/**
 * The key delay, in milliseconds, of the one device whose input sends were measured against its catalogue entry:
 * the Denon of the test setup, whose input delay is ten times it, waits one tenth after an input's code, where the
 * screen families' compiles wait the input delay. The input sends of four other compiles wait a tenth too, of
 * devices whose catalogue entries are not identified, `noscreenactivity.test.ts`. Whether the tenth is the key delay
 * or a constant no compile tells apart, so a device with another key delay is refused rather than given either.
 */
const MEASURED_KEY_DELAY_MS = 100;

/** One device of the activity: its setup name, and the input the activity puts it on, by the catalogue's name. */
export interface NoScreenActivityDevice {
  /** The setup's name, which the metadata archive states and the name tree spells with underscores. */
  readonly name: string;
  /** The catalogue's name of the input, `HDMI 1`; none where the activity leaves the device's input alone. */
  readonly input?: string;
  /** The catalogue entry, needed where an input is given, since the inputs are the catalogue's. */
  readonly manufacturer?: string;
  readonly model?: string;
}

export interface NoScreenActivityRequest {
  /** The activity's devices, in any order: the list puts them in the metadata archive's. */
  readonly devices: readonly NoScreenActivityDevice[];
  /** The device whose map the activity ends in, the setup's `ChannelChanging` role; one of `devices`. */
  readonly channel: string;
}

/** How one device's power is flipped: its toggle's send list and wait, or its power variable. */
export type ActivityPowerStep =
  | { readonly kind: 'toggle'; readonly device: string; readonly send: number; readonly wait: number }
  | { readonly kind: 'variable'; readonly device: string; readonly variable: number };

export interface ComposedNoScreenActivity {
  readonly bytes: Uint8Array;
  /** The list Watch TV's press runs. */
  readonly list: number;
  /** The list Watch TV ran before, where the configuration had an activity, now unreferenced. */
  readonly replaced?: number;
  /** The power steps in the list's order. */
  readonly power: readonly ActivityPowerStep[];
  /** The flag's variable, and whether it was there already. */
  readonly flag: { readonly variable: number; readonly reused: boolean };
  /** Each input written, in the list's order: the device, its variable, how many values it has, the value. */
  readonly inputs: readonly { readonly device: string; readonly variable: number; readonly values: number; readonly value: number }[];
  /** The map selected at the end, the channel device's. */
  readonly map: number;
  /** How many action lists and infrared records were added. */
  readonly listsAdded: number;
  readonly recordsAdded: number;
}

/** What the catalogue makes of a device's input on this family, decided before any byte moves. */
type InputPlan =
  /** Every input is one code of its own: a variable of one value per input, each sending its record. */
  | { readonly kind: 'sends'; readonly value: number; readonly values: number; readonly commands: readonly string[] }
  /** Every input only sets catalogue states: a variable of one value and no transitions, written 0. */
  | { readonly kind: 'states' };

/**
 * A device's input as this family compiles it, or a refusal naming the shape no compile shows. The catalogue's own
 * reading is `inputPlan`, the screen families'; what differs here is what becomes of it, the module comment.
 */
function inputOf(c: Container, archive: CatalogueSource, device: NoScreenActivityDevice): InputPlan {
  if (device.manufacturer === undefined || device.model === undefined) {
    throw new ComposeError(`${device.name} is put on an input, so its catalogue entry is needed`);
  }
  const planned = catalogueDevicePlan(c, archive, {
    manufacturer: device.manufacturer, model: device.model, label: device.name, full: true, inputs: true,
  });
  const input = planned.plan?.input;
  if (input === undefined) throw new ComposeError(`${device.manufacturer} ${device.model} has no input to choose`);
  const value = input.values.indexOf(device.input!);
  if (value < 0) throw new ComposeError(`${device.manufacturer} ${device.model} has no input called ${device.input}; it has ${input.values.join(', ')}`);
  const steps = input.transitions.map((one) => one.steps);
  const direct = input.transitions.length === input.values.length
    && input.transitions.every((one, k) => one.from === FROM_ANY && one.to === k && one.steps.length === 1 && one.steps[0]!.kind === 'send');
  if (direct) {
    if (planned.driving.timing.interKeyDelay !== MEASURED_KEY_DELAY_MS) {
      throw new ComposeError(`${device.name}'s key delay is ${planned.driving.timing.interKeyDelay} ms, and an input's send is measured `
        + `only on devices whose key delay is ${MEASURED_KEY_DELAY_MS} ms`);
    }
    return {
      kind: 'sends', value, values: input.values.length,
      commands: steps.map((one) => (one[0] as { command: string }).command),
    };
  }
  if (steps.length > 0 && steps.every((one) => one.length > 0 && one.every((step) => step.kind === 'write'))) return { kind: 'states' };
  throw new ComposeError(`${device.manufacturer} ${device.model}'s inputs step or mix codes and states, and no compile of this family shows either`);
}

/**
 * How a device's power is flipped, read off its power variable rather than the catalogue, so that a device of
 * Logitech's compile is read as one of ours is: a toggle where switching it off runs one list and switching it on
 * runs a list calling that one and then waiting, and the power variable otherwise.
 */
function powerStepOf(c: Container, name: string, group: number): ActivityPowerStep {
  const label = nameOfLabel(name);
  const variable = deviceVariables(c).find((one) => one.device === label && one.property === POWER_PROPERTY)?.index;
  if (variable === undefined) throw new ComposeError(`${name} has no power variable`);
  const record = stateRecords(c)?.[variable];
  const on = record?.values.find((one) => one.from === 0 && one.to === 1);
  const off = record?.values.find((one) => one.from === 1 && one.to === 0);
  if (on?.opcode !== ACTION_LIST_INDEX_OPCODE || off?.opcode !== ACTION_LIST_INDEX_OPCODE) {
    throw new ComposeError(`${name}'s power variable does not run a list each way`);
  }
  const onList = c.actionLists()?.[on.operand] ?? [];
  const waits = onList.slice(1);
  const toggles = onList[0]?.opcode === ACTION_LIST_INDEX_OPCODE && onList[0].operand === off.operand;
  if (!toggles) return { kind: 'variable', device: name, variable };
  if (waits.length === 0 || !waits.every((one) => one.opcode === DEVICE_QUANTITY && one.operand >> 8 === group)) {
    throw new ComposeError(`${name} is a toggle whose power on list is not its toggle and its waits, which no compile of this family shows`);
  }
  const wait = waits.reduce((sum, one) => sum + (one.operand & 0xff), 0);
  // One `0x7C`'s quantity is a byte: the 170 of the factory compile fits, a longer delay would not.
  if (wait > 0xff) throw new ComposeError(`${name}'s power on delay of ${wait} tenths does not fit one wait`);
  return { kind: 'toggle', device: name, send: off.operand, wait };
}

// The register loaded and a list called, and a flip, are `gateList` and `flipList` in `lists.ts`, since the device
// composer's power switch writes the same two, and the attribution reads both
// back through the same writers.

/**
 * Compose Watch TV onto a Harmony 300 or 350 configuration, replacing the one it holds. Unstamped steps, restamped
 * once at the end.
 */
export function composeNoScreenActivity(c: Container, archive: CatalogueSource, request: NoScreenActivityRequest): ComposedNoScreenActivity {
  const names = request.devices.map((one) => one.name);
  if (names.length === 0) throw new ComposeError('an activity of no devices switches nothing');
  if (new Set(names).size !== names.length) throw new ComposeError('a device is in the activity twice');
  if (!names.includes(request.channel)) {
    throw new ComposeError(`the activity ends in ${request.channel}'s map, which is not one of its devices; no compile shows that`);
  }
  assertNoVariablesOutsideLists(c);
  const groupOf = new Map(devices(c).flatMap((one) => (one.group === undefined ? [] : [[one.name, one.group] as const])));
  for (const name of names) {
    if (!groupOf.has(nameOfLabel(name))) throw new ComposeError(`no device called ${name} with codes here`);
  }

  // The order: the metadata archive's, which is the account's, ascending `Index`. Six compiles have two or more power
  // steps; on three of them, of two setups, the archive's order is not the group order, and on all six it is the
  // order Logitech wrote; the test setup's two inputs follow it as well, one sample of the inputs' order.
  const archived = metadataArchive(c)?.devices ?? [];
  const indexOf = (name: string): number => {
    const found = archived.find((one) => one.name === name);
    if (found === undefined) throw new ComposeError(`the metadata archive does not name ${name}, so its place in the activity is not known`);
    return found.index;
  };
  const ordered = [...request.devices].sort((a, b) => indexOf(a.name) - indexOf(b.name));

  // Watch TV's binding now, and the flag, both read before anything moves.
  const bound = keyMaps(c)[0]!.entries.find((one) => one.tag === (PRESS | WATCH_TV_SCAN));
  if (bound !== undefined && bound.opcode !== ACTION_LIST_INDEX_OPCODE) throw new ComposeError('Watch TV is bound to something other than a list');
  const flagThere = stateVariables(c).find((one) => one.name === ACTIVITY_FLAG);
  if (flagThere !== undefined) {
    const record = stateRecords(c)?.[flagThere.index];
    if (record === undefined || record.second !== 1 || record.values.length !== 0) {
      throw new ComposeError(`${ACTIVITY_FLAG} here is not a flag of two values and no transitions`);
    }
  }

  // The inputs, planned and refused before any byte moves.
  const inputs = ordered.flatMap((device) => {
    if (device.input === undefined) return [];
    const label = nameOfLabel(device.name);
    if (deviceVariables(c).some((one) => one.device === label && one.property === INPUT_PROPERTY)) {
      throw new ComposeError(`${device.name} holds an input variable already, and replacing one is not composed`);
    }
    return [{ device, label, group: groupOf.get(label)!, plan: inputOf(c, archive, device) }];
  });

  // 1. The input commands' records. **Each is the command's one block copy**, the catalogue code's first block less
  //    its opening silence with no held block, as the favourite channels' digits are: all 19 of the Denon's in
  //    Logitech's compile of the test setup are, word for word, `noscreenactivity.test.ts`. So each is built in a
  //    scratch copy as the device composer builds a command, its copy taken, `oneBlockCopy`, and appended to the
  //    device's group, `appendCopyRecord`, unless the group holds that copy already.
  let current = c;
  let recordsAdded = 0;
  const copies = new Map<string, number[]>();
  for (const one of inputs) {
    if (one.plan.kind !== 'sends') continue;
    const planned = catalogueDevicePlan(current, archive, {
      manufacturer: one.device.manufacturer!, model: one.device.model!, label: one.device.name, full: true, inputs: true,
    });
    const commands = one.plan.commands.map((name) => planned.device.commands[commandIndex(planned.commandNames, name)]!);
    const codes: number[] = [];
    for (const command of commands) {
      const scratch = parse(composeIrGroup(current, [command]).bytes);
      const own = irGroups(scratch)![one.group]!.addresses;
      const found = oneBlockCopy(scratch, [...own, ...irGroups(scratch)!.at(-1)!.addresses], own.length);
      if ('code' in found) {
        if (found.code >= own.length) throw new ComposeError(`${one.device.name}'s input command has no held block, so it would be its own copy, which no compile here shows`);
        codes.push(found.code);
        continue;
      }
      const appended = appendCopyRecord(current, one.group, found.copy, arraysStart);
      current = parse(appended.bytes);
      codes.push(appended.code);
      recordsAdded += 1;
    }
    copies.set(one.label, codes);
  }

  // 2. The list layout: the input sends first, one list per value, so that the variables' records can name them
  //    before the lists exist; a variable's insertion moves no list.
  const firstList = current.pointerArray(7)?.length;
  if (firstList === undefined) throw new ComposeError('raw slot 7 does not read as the action list table');
  const sendBodies: Body[] = [];
  const records: { label: string; values: number; record: Uint8Array }[] = [];
  for (const one of inputs) {
    if (one.plan.kind === 'states') {
      records.push({ label: one.label, values: 1, record: encodeStateRecord(1, []) });
      continue;
    }
    const codes = copies.get(one.label)!;
    const transitions = codes.map((code, k) => {
      const list = firstList + sendBodies.length;
      sendBodies.push(bodyOf(sendList(one.group, code, DEVICE_QUANTITY_DEFAULT)));
      return { from: FROM_ANY, to: k, instruction: { operand: list, opcode: ACTION_LIST_INDEX_OPCODE } as Instruction };
    });
    records.push({ label: one.label, values: one.plan.values, record: encodeStateRecord(one.plan.values, transitions) });
  }

  // 3. The variables: each input's, then the flag where there is none. Each goes in at `narrow`, below which the
  //    ones before it now sit, so none of them moves again.
  const inputVariables = new Map<string, number>();
  for (const one of records) {
    const appended = appendNarrowStateVariable(current, one.record, `${one.label}_${INPUT_PROPERTY}_${one.values}`);
    current = parse(appended.bytes);
    inputVariables.set(one.label, appended.variable);
  }
  if (flagThere === undefined) current = parse(appendNarrowStateVariable(current, encodeStateRecord(2, []), ACTIVITY_FLAG).bytes);
  const variableOf = (name: string): number => stateVariables(current).find((one) => one.name === name)!.index;
  const flag = variableOf(ACTIVITY_FLAG);
  for (const label of inputVariables.keys()) {
    const one = records.find((record) => record.label === label)!;
    inputVariables.set(label, variableOf(`${label}_${INPUT_PROPERTY}_${one.values}`));
  }

  // 4. The activity's own lists, read off the configuration as it is now, its variables numbered for good.
  const power = ordered.map((device) => powerStepOf(current, device.name, groupOf.get(nameOfLabel(device.name))!));
  const writes = inputs.map((one) => ({ variable: inputVariables.get(one.label)!, value: one.plan.kind === 'sends' ? one.plan.value : 0 }));
  const map = mapOfGroup(current, groupOf.get(nameOfLabel(request.channel))!);
  const bodies: Body[] = [...sendBodies];
  const next = (body: Body): number => {
    bodies.push(body);
    return firstList + bodies.length - 1;
  };
  const main = next([]);
  const steps: ActivityStepWrite[] = [];
  for (const one of power) {
    if (one.kind === 'toggle') {
      steps.push({ kind: 'toggle', send: one.send, group: groupOf.get(nameOfLabel(one.device))!, wait: one.wait });
    } else {
      const helper = next(bodyOf(flipList(one.variable)));
      steps.push({ kind: 'call', list: next(bodyOf(gateList(0, helper))) });
    }
  }
  const flagGate = next(bodyOf(gateList(0, next(bodyOf(flipList(flag))))));
  // The arm: the null instruction, the one write, or a list of them, as the seven compiles hold it.
  const arm: ConditionArm = writes.length === 0 ? { kind: 'none' }
    : writes.length === 1 ? { kind: 'write', ...writes[0]! } : { kind: 'call', list: next(bodyOf(writesList(writes))) };
  const conditionGate = next(bodyOf(gateList(1, next(bodyOf(conditionList(flag, arm))))));
  bodies[main - firstList] = bodyOf(activityList(steps, flagGate, conditionGate, map));

  const appended = appendActionLists(current, bodies, highestEnd(listExtents(current)));
  if (appended.first !== firstList) throw new ComposeError('the action lists moved while the variables went in');
  current = parse(appended.bytes);

  // 5. Watch TV's press: the binding there pointed at the new list in place, its operand two bytes after its tag,
  //    or a binding put in where there is none.
  if (bound !== undefined) {
    const table = keyMaps(current)[0]!;
    if (taggedListExtent(current.blob, table.start)?.wide !== false) throw new ComposeError('the key table is not in the narrow form');
    const k = table.entries.findIndex((one) => one.tag === (PRESS | WATCH_TV_SCAN));
    const at = table.start + 1 + 4 * k + 1;
    current.blob.set([main & 0xff, main >> 8], at);
    current = parse(current.blob);
  } else {
    current = withMapEntries(current, 0, [{ tag: PRESS | WATCH_TV_SCAN, operand: main, opcode: ACTION_LIST_INDEX_OPCODE }]);
  }

  return {
    bytes: restamped(current.blob),
    list: main,
    ...(bound === undefined ? {} : { replaced: bound.operand }),
    power,
    flag: { variable: flag, reused: flagThere !== undefined },
    inputs: inputs.map((one) => ({
      device: one.device.name,
      variable: inputVariables.get(one.label)!,
      values: one.plan.kind === 'sends' ? one.plan.values : 1,
      value: one.plan.kind === 'sends' ? one.plan.value : 0,
    })),
    map,
    listsAdded: bodies.length,
    recordsAdded,
  };
}
