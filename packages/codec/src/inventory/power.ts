/**
 * A device's power and the waits around it: the list that switches everything off, the prelude a send list opens
 * with, the inter device delay and power on delay tables, each device's delays and power on instruction, and how far
 * a power on delay reaches into an activity's start. Part of the inventory, `inventory.ts`.
 */
import {
  BYTE_REGISTER_FROM_STATE, STATE_BAND, STATE_FROM_BYTE_REGISTER, STATE_WRITE_BASE,
} from '../container/actions.ts';
import { Container, type Instruction } from '../container/gspm.ts';
import { ACTION_LIST_INDEX_OPCODE, handlerSets, modePages, stateRecords, taggedList } from '../container/sections.ts';
import { valueMaps } from '../container/valuemap.ts';
import { IR_QUANTITY_OPCODE } from '../infrared/ir.ts';
import { SCREEN_END, SCREEN_QUEUE_INSTRUCTION, screenProgram } from '../screens/screen.ts';
import { characterMap, screenStrings } from '../screens/text.ts';
import { activityBindings, activityStartSteps, handlerSetRoles } from './activities.ts';
import { INFRARED_GROUP_SHIFT, MAP_WALK_DEPTH } from './common.ts';
import { compilerCaseOrder } from './compilerorder.ts';
import { devices } from './devices.ts';
import {
  BYTE_REGISTER_LOAD, CONDITION_OPCODE, DEVICE_QUANTITY, MAP_VALUE_OPCODE, QUEUE_INTER_DEVICE_DELAY, SEND_INFRARED,
} from './instructions.ts';
import { deviceVariables, stateVariables } from './statevariables.ts';

/** The list the remote runs to switch every device off, and the power variables it names. */
export interface AllOffList {
  /** Its base slot 10 index. */
  list: number;
  /** The power variables it writes 0 into, in its own order. */
  variables: number[];
}

/**
 * The list that switches every device off when no activity is left running, section 280.
 *
 * **It is reached from the idle key map**, the one base slot 9 entry `handlerSetRoles` calls
 * `idle`, which the remote installs when an activity ends: its enter list maps `CurrentLocation`
 * through base slot 14, and the record's one case, for the value 0, queues a call to a list whose
 * every instruction writes 0 into a device's `Power` variable. So the switch off is conditional on
 * that variable, and never a direct call. Writing 0 is what runs each device's transition from on to off, so a
 * device switched on and missing from this list stays on.
 *
 * Found by shape along that walk rather than by position, and the shape is strict: every
 * instruction a state write, every write a 0, every variable a `Power` one. Exactly one list fits on
 * every Logitech built configuration measured with two devices or more, on arch 8 (Harmony 880 and 885), arch 9
 * (Harmony 525), arch 12 (Harmony One) and arch 14 (Harmony 600 and 700), and it names every power
 * variable the configuration has. A device with no `Power` variable, which a few have, is in no such
 * list. Undefined when none fits or several do, which is what a configuration with one device gives,
 * since the case queues that one write itself.
 */
export function allOffList(c: Container): AllOffList | undefined {
  const lists = c.actionLists();
  const sets = handlerSets(c);
  const maps = valueMaps(c) ?? [];
  if (lists === undefined || sets === undefined) return undefined;
  const power = new Set(deviceVariables(c)
    .filter((one) => one.property === POWER_PROPERTY)
    .map((one) => one.index));
  const isAllOff = (list: readonly Instruction[] | undefined): boolean => list !== undefined
    && list.length > 0
    && list.every((one) => one.opcode >= STATE_WRITE_BASE && one.operand === POWER_OFF
      && power.has(one.opcode - STATE_WRITE_BASE));

  const found = new Set<number>();
  const seen = new Set<string>();
  const walk = (list: number, depth: number): void => {
    if (depth > MAP_WALK_DEPTH || seen.has(`l${list}`)) return;
    seen.add(`l${list}`);
    if (isAllOff(lists[list])) found.add(list);
    for (const one of lists[list] ?? []) {
      if (one.opcode === ACTION_LIST_INDEX_OPCODE) walk(one.operand, depth + 1);
      if (one.opcode !== MAP_VALUE_OPCODE) continue;
      const map = one.operand >> 8;
      if (seen.has(`m${map}`)) continue;
      seen.add(`m${map}`);
      for (const [, target] of maps[map]?.entries ?? []) {
        for (const step of screenProgram(c, target) ?? []) {
          if (step.opcode !== SCREEN_QUEUE_INSTRUCTION || step.operands[2] !== ACTION_LIST_INDEX_OPCODE) continue;
          walk((step.operands[0] as number) | ((step.operands[1] as number) << 8), depth + 1);
        }
      }
    }
  };
  const roles = handlerSetRoles(c);
  sets.addresses.forEach((address, index) => {
    if (roles[index] !== 'idle') return;
    const enter = (taggedList(c, address)?.entries ?? []).find((one) => one.tag === 1);
    if (enter?.opcode === ACTION_LIST_INDEX_OPCODE) walk(enter.operand, 0);
  });
  if (found.size !== 1) return undefined;
  const [list] = [...found] as [number];
  return { list, variables: (lists[list] as Instruction[]).map((one) => one.opcode - STATE_WRITE_BASE) };
}

/**
 * The values an inter device delay table has a case for, 0 to 20 tenths of a second, **in the order
 * the compiler stores them**, which is `compilerCaseOrder`'s: 0 to 15, 17, 16, 19, 18, 20, on every
 * table of the kind, and each case's program sits in the same order. A variable holding more than 20
 * matches no case and queues nothing. This was a literal list until section 319 generated it.
 */
export const INTER_DEVICE_DELAY_VALUES: readonly number[] =
  compilerCaseOrder(Array.from({ length: 21 }, (_, value) => value));

/**
 * What an arch 14 command does before it sends, read whole, section 287.
 *
 * ```
 * send list    [0x7F load, 0x7D (group << 8) | record, 0x7C (group << 8) | amount]
 * load         [0x1F 0xFB01, 0x7F condition]          byte register := 1
 * condition    [0x71 start, 0x7F delay]               only while variable `start` equals it
 * delay        [0x72 (table << 8) | variable]         the device's own inter device delay
 * ```
 *
 * **`load` and `condition` are private to the command and `delay` is shared by the device**: 1598
 * send lists of 1598 on the five arch 14 containers, the Harmony 600, 650 and 700, no `load` or
 * `condition` named by a second list and one `delay` per device. `start` is one variable per
 * configuration, which every list that writes it sets to 1 and back to 0 inside itself. Those lists
 * are an activity's handler lists, the Off key map's two, which are All Off, and the Help screens'
 * enter handlers, and no device mode record names one, section 335; so the delay is queued in an
 * activity's start, in All Off and in Help and not for a device's own command pressed in device mode,
 * and the bench Harmony 650 waits it in a start and in All Off. `variable` is the device's `InterDeviceDelay_<identifier>`, and `table` a base slot 14
 * record whose case for each value queues that many tenths for the device's group through
 * `QUEUE_INTER_DEVICE_DELAY`, which `interDeviceDelayCases` reads.
 */
export interface SendPrelude {
  /** The list holding the send. */
  list: number;
  /** The group the send names, which is the device. */
  group: number;
  load: number;
  /** The `0x1F` operand of `load`'s first instruction, `0xFB01` on all 1598. */
  loadOperand: number;
  condition: number;
  /** The `0x71` operand of `condition`'s first instruction, whose low byte is `start`. */
  conditionOperand: number;
  delay: number;
  /** Which base slot 14 record the `0x72` names. */
  table: number;
  /** Which state variable it maps, the device's `InterDeviceDelay_<identifier>`. */
  variable: number;
}

/**
 * Every send list that opens with the prelude `SendPrelude` describes, in exactly that shape.
 *
 * A list that opens some other way is left out rather than half read, so a count of these against a
 * count of send lists is the check that the shape holds. Empty on the arch 8, 9 and 12 containers
 * measured, whose sends open with no call.
 */
export function sendPreludes(c: Container): SendPrelude[] {
  const lists = c.actionLists();
  if (lists === undefined) return [];
  const exactly = (index: number, opcodes: readonly number[]): Instruction[] | undefined => {
    const list = lists[index];
    return list !== undefined && list.length === opcodes.length
      && list.every((one, k) => one.opcode === opcodes[k]) ? list : undefined;
  };
  const out: SendPrelude[] = [];
  lists.forEach((list, index) => {
    const opening = exactly(index, [ACTION_LIST_INDEX_OPCODE, SEND_INFRARED, DEVICE_QUANTITY]);
    if (opening === undefined || list.length !== 3) return;
    const load = (opening[0] as Instruction).operand;
    const loaded = exactly(load, [STATE_BAND, ACTION_LIST_INDEX_OPCODE]);
    if (loaded === undefined || (loaded[0] as Instruction).operand >>> 8 !== BYTE_REGISTER_LOAD) return;
    const condition = (loaded[1] as Instruction).operand;
    const tested = exactly(condition, [CONDITION_OPCODE, ACTION_LIST_INDEX_OPCODE]);
    if (tested === undefined) return;
    const delay = (tested[1] as Instruction).operand;
    const mapped = exactly(delay, [MAP_VALUE_OPCODE]);
    if (mapped === undefined) return;
    const map = (mapped[0] as Instruction).operand;
    out.push({
      list: index,
      group: (opening[1] as Instruction).operand >>> INFRARED_GROUP_SHIFT,
      load,
      loadOperand: (loaded[0] as Instruction).operand,
      condition,
      conditionOperand: (tested[0] as Instruction).operand,
      delay,
      table: map >>> 8,
      variable: map & 0xff,
    });
  });
  return out;
}

/**
 * The value a prelude's `load` puts in the byte register, which its `condition` then compares the
 * start variable against: 1, the value a start, All Off or a Help screen holds it at while it runs.
 */
const SEND_PRELUDE_LOADED = 1;
/**
 * A prelude's `load` operand, built rather than copied, section 319: `0x1F` sub opcode `0xFB`, load
 * the byte register, with 1. `0xFB01` on 6100 preludes of 6100 send lists over the thirteen arch 14
 * compiles, where each configuration's own lists are counted and the Harmony 700 pair twice.
 */
export const SEND_PRELUDE_LOAD = (BYTE_REGISTER_LOAD << 8) | SEND_PRELUDE_LOADED;
/** `0x71`'s comparison field, operand bits 8 to 11, for equality with the byte register; section 34. */
const CONDITION_EQUAL = 0;
/**
 * A prelude's `condition` operand for a configuration whose start sequence variable is `start`,
 * section 319: compare `start` for equality with what `load` put in the byte register, one arm, so
 * the delay list runs only while a list raising that variable runs, which is an activity's start, All
 * Off or a Help screen, section 335. Every bit but the variable's is a constant: the high byte is 0 on
 * 6100 of 6100, and the low byte is the variable each configuration's activities set to 1 at the head
 * of their start and back to 0 at its foot, section 289.
 */
export function sendPreludeCondition(start: number): number {
  if (!Number.isInteger(start) || start < 0 || start > 0xff) {
    throw new RangeError(`a start sequence variable is one byte, not ${start}`);
  }
  return (CONDITION_EQUAL << 8) | start;
}

/** One case of an inter device delay table: the value it matches and what it queues. */
export interface InterDeviceDelayCase {
  value: number;
  group: number;
  tenths: number;
}

/**
 * A base slot 14 record read as an inter device delay table, or undefined when it is not one.
 *
 * It is one when every case's program is exactly `0x11 operand 0x67; end`, queueing one
 * `QUEUE_INTER_DEVICE_DELAY`, and the record has no ranges. On the five arch 14 containers each
 * such table has the 21 cases of `INTER_DEVICE_DELAY_VALUES`, each queueing its own value for the
 * group of the device whose commands name it: the tables of two devices differ in the group byte
 * and nowhere else, which is why each device carries its own.
 */
export function interDeviceDelayCases(c: Container, table: number): InterDeviceDelayCase[] | undefined {
  const map = valueMaps(c)?.[table];
  if (map === undefined || map.ranges.length !== 0) return undefined;
  const out: InterDeviceDelayCase[] = [];
  for (const [value, target] of map.entries) {
    const program = screenProgram(c, target);
    const queued = program?.[0];
    if (program === undefined || program.length !== 2 || queued === undefined
        || queued.opcode !== SCREEN_QUEUE_INSTRUCTION || program[1]?.opcode !== SCREEN_END
        || queued.operands[2] !== QUEUE_INTER_DEVICE_DELAY) return undefined;
    out.push({ value, tenths: queued.operands[0] as number, group: queued.operands[1] as number });
  }
  return out;
}

/**
 * The most a single `0x7C` quantity carries in a power on delay table, in tenths: a larger value is
 * spelled as that many hundreds and a remainder, on every case of every such table here, section
 * 288. Section 70's queue folds a quantity into the entry before it only while that entry is below
 * 100, which is the same number seen from the firmware's side; that the compiler splits because of
 * it is an inference.
 */
export const POWER_ON_DELAY_CHUNK = 100;
/**
 * The values a power on delay table has a case for: 0 to 450 tenths, 45 seconds, on the 15 tables of
 * the 15 devices with a `Power` variable on the four distinct arch 14 configurations.
 */
export const POWER_ON_DELAY_CASES = 451;
/**
 * The values a power on delay table has a case for, in the order the compiler stores them, which is
 * `compilerCaseOrder`'s, section 319: one order on all 71 power on tables of the thirteen arch 14
 * compiles. The composer copied it off the configuration's own tables until then.
 */
export const POWER_ON_DELAY_VALUES: readonly number[] =
  compilerCaseOrder(Array.from({ length: POWER_ON_DELAY_CASES }, (_, value) => value));

/**
 * An arch 14 device's power on delay, read from the list its `Power` variable runs when it goes
 * from off to on, section 288.
 *
 * ```
 * on list      [0x7F power command, ..., 0x7F delay]
 * delay        [0x72 (table << 8) | variable]          the device's PowerOnDelay_<identifier>
 * ```
 *
 * The on list runs a send list of the device and then the delay list, on 15 of the 15
 * devices with a `Power` variable on the four distinct arch 14 configurations, the second Harmony
 * 700 configuration repeating the first; two televisions carry one
 * more instruction between them and one video recorder a third call after. The off transition sends
 * a code of the device with no delay, the same code as the on list on 5 of the 15. Arch 8, 9 and 12 inline the delay as a
 * `0x7C` instead, which `powerOnInstructions` reads.
 */
export interface PowerOnDelay {
  group: number;
  /** The list the `Power` variable's off to on transition runs. */
  on: number;
  /** The one list holding the `0x72`. */
  delay: number;
  table: number;
  variable: number;
}

/** Every arch 14 device's power on delay, by the route `PowerOnDelay` describes. */
export function powerOnDelays(c: Container): PowerOnDelay[] {
  const lists = c.actionLists();
  const records = stateRecords(c);
  if (lists === undefined || records === undefined) return [];
  const names = new Map(stateVariables(c).map((one) => [one.index, one.label]));
  const byLabel = new Map(devices(c).flatMap((one) => (one.name === undefined ? [] : [[one.name, one.group] as const])));
  const out: PowerOnDelay[] = [];
  for (const variable of deviceVariables(c)) {
    if (variable.property !== POWER_PROPERTY) continue;
    const group = byLabel.get(variable.device);
    if (group === undefined) continue;
    for (const value of records[variable.index]?.values ?? []) {
      if (value.opcode !== ACTION_LIST_INDEX_OPCODE || value.from !== POWER_OFF || value.to !== POWER_ON) continue;
      for (const one of lists[value.operand] ?? []) {
        if (one.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
        const called = lists[one.operand];
        const mapped = called?.[0];
        if (called?.length !== 1 || mapped?.opcode !== MAP_VALUE_OPCODE) continue;
        if (!/^PowerOnDelay_\d+$/.test(names.get(mapped.operand & 0xff) ?? '')) continue;
        out.push({
          group, on: value.operand, delay: one.operand,
          table: mapped.operand >>> 8, variable: mapped.operand & 0xff,
        });
      }
    }
  }
  return out;
}

/** One case of a power on delay table: the value it matches and the quantities it queues. */
export interface PowerOnDelayCase {
  value: number;
  group: number;
  /** The `0x7C` amounts queued, in order: none for 0, one up to 100, and hundreds then the rest. */
  amounts: number[];
  /** The action list a case above 100 calls to queue them, which only those cases have. */
  list?: number;
}

/**
 * A base slot 14 record read as a power on delay table, or undefined when it is not one.
 *
 * Each case's program is an end alone, for 0; or `0x11` queueing one `0x7C` of `(group << 8) |
 * value`; or `0x11` queueing a `0x7F` to a list of nothing but `0x7C`s for that group, for a value
 * above `POWER_ON_DELAY_CHUNK`. Every case must name one group and there must be no ranges.
 */
export function powerOnDelayCases(c: Container, table: number): PowerOnDelayCase[] | undefined {
  const map = valueMaps(c)?.[table];
  const lists = c.actionLists();
  if (map === undefined || lists === undefined || map.ranges.length !== 0) return undefined;
  const out: PowerOnDelayCase[] = [];
  let group: number | undefined;
  const agree = (one: number): boolean => (group ??= one) === one;
  for (const [value, target] of map.entries) {
    const program = screenProgram(c, target);
    if (program === undefined || program.at(-1)?.opcode !== SCREEN_END) return undefined;
    if (program.length === 1) {
      out.push({ value, group: -1, amounts: [] });
      continue;
    }
    const queued = program[0];
    if (program.length !== 2 || queued?.opcode !== SCREEN_QUEUE_INSTRUCTION) return undefined;
    const operand = (queued.operands[0] as number) | ((queued.operands[1] as number) << 8);
    if (queued.operands[2] === DEVICE_QUANTITY) {
      if (!agree(operand >>> 8)) return undefined;
      out.push({ value, group: operand >>> 8, amounts: [operand & 0xff] });
    } else if (queued.operands[2] === ACTION_LIST_INDEX_OPCODE) {
      const called = lists[operand];
      if (called === undefined || called.length === 0) return undefined;
      if (called.some((one) => one.opcode !== DEVICE_QUANTITY || !agree(one.operand >>> 8))) return undefined;
      out.push({ value, group: group as number, amounts: called.map((one) => one.operand & 0xff), list: operand });
    } else {
      return undefined;
    }
  }
  if (group === undefined) return undefined;
  return out.map((one) => ({ ...one, group: group as number }));
}

/** The amounts a power on delay of `tenths` is queued as: hundreds first, then the rest. */
export function powerOnDelayAmounts(tenths: number): number[] {
  const out: number[] = [];
  let left = tenths;
  while (left > POWER_ON_DELAY_CHUNK) {
    out.push(POWER_ON_DELAY_CHUNK);
    left -= POWER_ON_DELAY_CHUNK;
  }
  if (left > 0) out.push(left);
  return out;
}

/**
 * The four delay properties a device carries, as base slot 0 spells them.
 *
 * There are eight variables per device and only these four hold a duration. The other four are
 * `PowerOnDelayFlagCounter`, `PowerOnDelayFixingTriggered` and their inter device twins, whose
 * highest values are 5 and 100: a counter and a flag belonging to whatever the remote does when a
 * delay turns out to be too short. Nothing here reads them.
 */
const DELAY_PROPERTIES = [
  'PowerOnDelay',
  'DefaultPowerOnDelay',
  'InterDeviceDelay',
  'DefaultInterDeviceDelay',
] as const;

/** A state variable whose name is `<property>_<device identifier>`, split into the two. */
const DELAY_NAME = new RegExp(`^(${DELAY_PROPERTIES.join('|')})_([0-9]+)$`);

/**
 * The exact string the page that resets a device's delays draws, in the middle of the screen.
 *
 * **English, and that is a real limitation rather than an oversight.** Every container in the
 * corpus was generated in English, so nothing here can say what the German build draws. A config
 * whose screen says something else loses the join below and keeps everything else, which is why the
 * join is a separate function from the delays themselves.
 */
const DELAY_DEFAULT_LABEL = 'Set to default';

/** How long a device makes the remote wait, in tenths of a second, and which device it is. */
export interface DeviceDelays {
  /** The infrared group, which is what identifies a device everywhere else in this codec. */
  group: number;
  /** The device's own label, as `devices` gives it, underscores and all. */
  name: string;
  /**
   * Where the number was read, because the two architectures keep it in unrelated places and a
   * caller that wants to **change** one has to know which.
   *
   * `variable` is arch 14 (Harmony 600 and 700): a state variable in base slot 13 whose name carries
   * Logitech's device identifier. `instruction` is arch 8, 9 and 12 (Harmony 880 and 885, Harmony
   * 525, Harmony One): a `0x7C` inline in the action list that switches the device on. Section 235.
   */
  source: 'variable' | 'instruction';
  /** Tenths of a second between switching the device on and sending it anything. */
  powerOn: number;
  /**
   * Logitech's numeric identifier for the device. **Arch 14 only**, since it is the variable's name
   * that carries it and the other architectures have no variable.
   */
  id?: number;
  /** What the remote's own "set to default" page would put back into `powerOn`. Arch 14 only. */
  defaultPowerOn?: number;
  /**
   * Tenths of a second between two codes when the second goes to a different device. **Arch 14
   * only**, and its absence elsewhere is honest rather than settled: where arch 8, 9 and 12 keep
   * this, if they keep it at all, is open.
   */
  interDevice?: number;
  /** What that page would put back into `interDevice`. Arch 14 only. */
  defaultInterDevice?: number;
}

/**
 * The base slot 13 property whose transitions switch a device on and off.
 *
 * `deviceVariables` splits a level 1 name into a device and a property, so this is that property's
 * spelling rather than a suffix match on the whole name.
 */
export const POWER_PROPERTY = 'Power';

/**
 * The base slot 13 property whose value is the input a device is set to, the same split as
 * `POWER_PROPERTY`. Section 313's rule for tag 5, picking the running activity again, is stated in
 * these two words: every input write of the start stays and every power write goes.
 */
export const INPUT_PROPERTY = 'Input';

/** The transition that switches a device on: its off value to its on value. */
const POWER_OFF = 0;
const POWER_ON = 1;

/**
 * Which of Logitech's device identifiers belongs to each infrared group, read off the screen.
 *
 * **Two vocabularies name a device and base slot 0 joins neither to the other.** A device's
 * buttons and its infrared group are reached through an ASCII **label**, `TV_Power_2`, which is
 * what `devices` returns. Its delays are held in variables named after a numeric **identifier**,
 * `PowerOnDelay_<identifier>`, an eight digit number that is Logitech's own key for the device on
 * the account. The name tree
 * is flat: level 1 holds both kinds of name side by side and nothing relates them.
 *
 * The screen relates them. The remote has a page per device offering to put that device's delays
 * back to their defaults, and it is the one place where a device's drawn name and its identifier
 * meet: the page draws the label in its title row, and its action list copies
 * `DefaultPowerOnDelay_<id>` into `PowerOnDelay_<id>` and the same for the inter device pair. So
 * the title says which device the user thinks they are looking at and the instructions say which
 * device the remote will change.
 *
 * Two details the corpus forced and neither was guessable:
 *
 * 1. **The drawn title is truncated to fit**, `Panasonic Blu-ray Pl..`, so a title ending in two
 *    dots matches a label it is a prefix of, and only when exactly one label matches.
 * 2. **An underscore in a label is a space on the screen**, because the underscore is base slot 0's
 *    own separator: `A/V_Switch` is drawn `A/V Switch`.
 *
 * 19 of 19 devices across the four arch 14 containers that carry delay variables, ids distinct, and
 * three of those devices were chosen by us before the config was compiled. Section 234.
 */
export function deviceIdOfGroup(c: Container): Map<number, number> {
  const out = new Map<number, number>();
  const lists = c.actionLists();
  const byIndex = new Map(stateVariables(c).map((one) => [one.index, one]));
  if (lists === undefined) return out;

  // Every state variable a page's chain writes with `0x1F` sub opcode `0xEE`. The read side,
  // `0xF0`, names the same device on every page in the corpus and is checked below rather than
  // matched here, so a page that copied across devices would be dropped instead of believed.
  const walk = (index: number, seen: Set<number>, taken: Set<number>): void => {
    const list = lists[index];
    if (list === undefined || seen.has(index)) return;
    seen.add(index);
    for (const instruction of list) {
      if (instruction.opcode === STATE_BAND) {
        const sub = instruction.operand >>> 8;
        if (sub === STATE_FROM_BYTE_REGISTER || sub === BYTE_REGISTER_FROM_STATE) {
          taken.add(instruction.operand & 0xff);
        }
      } else if (instruction.opcode === ACTION_LIST_INDEX_OPCODE) {
        walk(instruction.operand, seen, taken);
      }
    }
  };

  const drawn = screenStrings(c, characterMap(c));
  const titles = new Map<string, number>();
  for (const page of modePages(c)) {
    const texts = drawn.filter((one) => one.program === page.program);
    if (!texts.some((one) => one.text.trim() === DELAY_DEFAULT_LABEL)) continue;
    const top = Math.min(...texts.map((one) => one.y));
    const title = texts.filter((one) => one.y === top).map((one) => one.text.trim()).join(' ');
    const touched = new Set<number>();
    for (const entry of taggedList(c, page.list)?.entries ?? []) {
      if (entry.opcode === ACTION_LIST_INDEX_OPCODE) walk(entry.operand, new Set(), touched);
    }
    const ids = new Set(
      [...touched].flatMap((one) => {
        const id = byIndex.get(one)?.deviceId;
        return id === undefined ? [] : [id];
      }),
    );
    // A page that reaches two devices says nothing, and one that reaches none is some other page
    // that happens to draw the same words.
    if (ids.size === 1) titles.set(title, [...ids][0] as number);
  }

  for (const device of devices(c)) {
    if (device.name === undefined) continue;
    const label = device.name.replaceAll('_', ' ');
    if (device.group === undefined) continue;
    const exact = titles.get(label);
    if (exact !== undefined) {
      out.set(device.group, exact);
      continue;
    }
    const cut = [...titles].filter(
      ([title]) => title.endsWith('..') && label.startsWith(title.slice(0, -2)),
    );
    if (cut.length === 1) out.set(device.group, (cut[0] as [string, number])[1]);
  }
  return out;
}

/**
 * How long each device makes the remote wait, in tenths of a second.
 *
 * **This is the answer to a question that was asked the wrong way round for weeks.** The roadmap
 * carried "which base slot 15 group holds a device's delays" as the last reading before the first<!--superseded-->
 * write that changes something, and base slot 15 holds no such group: its shape and its values are
 * per **model**, identical across containers with 0, 1, 3, 4, 6 and 7 devices, and the two
 * containers that share a device count are the two that share a model. Section 234.
 *
 * The delays are ordinary state variables in base slot 13, eight per device, and the value is the
 * record's `first`, which is both what the generator wrote and what the firmware seeds the running
 * variable from, section 138.
 *
 * **The unit is stated by the config itself**, which is the independent closure: an arch 14 config
 * draws 451 strings reading `( 0 sec )` through `( 45 sec )`, contiguous in tenths with no gap, one
 * per position of the slider the remote offers. So a `first` of 80 is eight seconds and not eighty.
 * The arch 8, 9 and 12 containers draw none of those strings and carry none of these variables.
 *
 * A device with no join to a group is left out rather than reported with a guessed name, because
 * the caller wants a device and half of one is worse than none.
 */
export function deviceDelays(c: Container): DeviceDelays[] {
  const byId = new Map<number, Map<string, number>>();
  for (const variable of stateVariables(c)) {
    const match = DELAY_NAME.exec(variable.label);
    const value = variable.record?.first;
    if (match === null || value === undefined) continue;
    const id = Number(match[2]);
    const acc = byId.get(id) ?? new Map<string, number>();
    acc.set(match[1] as string, value);
    byId.set(id, acc);
  }
  const groups = deviceIdOfGroup(c);
  const inline = powerOnInstructions(c);
  const out: DeviceDelays[] = [];
  for (const device of devices(c)) {
    if (device.name === undefined || device.group === undefined) continue;
    const id = groups.get(device.group);
    const held = id === undefined ? undefined : byId.get(id);
    // All four or none: a device missing one of them would give a caller a zero it cannot tell
    // from a real zero, and a real zero is what most televisions carry.
    if (id !== undefined && held !== undefined
      && !DELAY_PROPERTIES.some((one) => held.get(one) === undefined)) {
      out.push({
        group: device.group,
        name: device.name,
        source: 'variable',
        id,
        powerOn: held.get('PowerOnDelay') as number,
        defaultPowerOn: held.get('DefaultPowerOnDelay') as number,
        interDevice: held.get('InterDeviceDelay') as number,
        defaultInterDevice: held.get('DefaultInterDeviceDelay') as number,
      });
      continue;
    }
    const at = inline.get(device.group);
    if (at === undefined) continue;
    out.push({
      group: device.group,
      name: device.name,
      source: 'instruction',
      powerOn: at.tenths,
    });
  }
  return out;
}

/** Where a device's power on delay sits when it is an instruction rather than a variable. */
export interface PowerOnInstruction {
  /** The base slot 10 list the device's `Power` variable runs when it goes from off to on. */
  list: number;
  /** Which instruction of that list it is, counting from zero, so a writer can address the byte. */
  at: number;
  /** The delay itself, in tenths of a second, which is the instruction's low byte. */
  tenths: number;
}

/**
 * The `0x7C` that holds each device's power on delay, on the architectures that inline it.
 *
 * **Arch 8, 9 and 12 keep a device's power on delay in the action list rather than in a variable**,
 * and this is where. A device's `Power` variable has a transition from 0 to 1 carrying one action
 * list instruction, section 86; that list sends the power code through a nested list and then, at
 * its own top level, carries exactly one `0x7C` naming the same infrared group. Section 70 read
 * `0x7C` as a per device quantity and left its unit open; it is tenths of a second, section 235.
 *
 * **Top level only, and that is the whole rule.** The nested list that sends the code carries a
 * `0x7C` of its own with the value 1, one per send, and a reader that walked into it would sum the
 * two. Every one of the 57 transitions on those three architectures has exactly one at the top
 * level and every one of the 16 on arch 14 has none, which is a split with no exception either way.
 *
 * The group is not taken on trust: a `0x7C` naming a different group than the device would be some
 * other quantity and is dropped. 56 of 56 agree, the odd one out being a device no route names.
 *
 * **Arch 16 (Harmony 300 and 350) uses the same shape**, read once base slot 13 was placed in its slot
 * map: 13 of the 14 devices that send a code over the five configurations of that family carry exactly
 * one, and the fourteenth carries two, 100 and 70, which this leaves out rather than summing, so a caller
 * gets no value instead of half of one. `packages/codec/test/filefamilydelays.test.ts`.
 */
export function powerOnInstructions(c: Container): Map<number, PowerOnInstruction> {
  const out = new Map<number, PowerOnInstruction>();
  const lists = c.actionLists();
  const records = stateRecords(c);
  if (lists === undefined || records === undefined) return out;
  const byLabel = new Map(devices(c).flatMap((one) => (one.name === undefined ? [] : [[one.name, one.group] as const])));
  for (const variable of deviceVariables(c)) {
    if (variable.property !== POWER_PROPERTY) continue;
    const group = byLabel.get(variable.device);
    if (group === undefined) continue;
    for (const value of records[variable.index]?.values ?? []) {
      if (value.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      if (value.from !== POWER_OFF || value.to !== POWER_ON) continue;
      const held = (lists[value.operand] ?? [])
        .map((one, at) => ({ one, at }))
        .filter(({ one }) => one.opcode === IR_QUANTITY_OPCODE);
      if (held.length !== 1) continue;
      const only = held[0] as { one: { operand: number }; at: number };
      if (only.one.operand >> 8 !== group) continue;
      out.set(group, { list: value.operand, at: only.at, tenths: only.one.operand & 0xff });
    }
  }
  return out;
}

/** One activity's power on delay for one device, and whether that activity can ever feel it. */
export interface DelayReach {
  /** The value written into `CurrentActivityState`, as `activityBindings` reports it. */
  activity: number;
  /** The device's infrared group. */
  group: number;
  /** Its power on delay, in tenths of a second. */
  tenths: number;
  /**
   * How many further commands this activity sends to that same device after queueing the delay.
   *
   * **Zero means the delay is never felt**, section 236: the queue holds back a command only when an
   * earlier entry names the same group, so a quantity with nothing behind it runs down in the
   * background while other devices carry on.
   */
  laterCommands: number;
}

/**
 * Every activity's power on delay per device, with the thing that decides whether it does anything.
 *
 * **This is section 236's claim in executable form.** The number in the config is not a pause in the
 * start sequence: the firmware's send queue tags every entry with a device and emits a command only
 * when no earlier entry names the same device, so a delay stalls exactly one thing, the next command
 * to its own device. An activity that sends a device its power code and nothing else therefore
 * cannot show that device's delay, however large it is, which is what the hardware measurement of
 * 1 September 2026 found the hard way.
 *
 * Arch 14 (Harmony 600 and 700) keeps a power on delay in a state variable rather than inline, so
 * `powerOnInstructions` is empty there and so is this.
 */
export function powerOnDelayReach(c: Container): DelayReach[] {
  const power = powerOnInstructions(c);
  if (power.size === 0) return [];
  const out: DelayReach[] = [];
  for (const binding of activityBindings(c)) {
    const steps = activityStartSteps(c, binding.set);
    if (steps.length === 0) continue;
    for (const [group, instruction] of power) {
      // The delay itself, identified by its group **and** its value, so the `1` that every send
      // carries alongside it is not mistaken for the power on delay.
      const at = steps.findIndex(
        (step) => step.kind === 'delay' && step.group === group && step.value === instruction.tenths,
      );
      if (at < 0) continue;
      const laterCommands = steps
        .slice(at + 1)
        .filter((step) => step.kind === 'send' && step.group === group).length;
      out.push({ activity: binding.activity, group, tenths: instruction.tenths, laterCommands });
    }
  }
  return out;
}
