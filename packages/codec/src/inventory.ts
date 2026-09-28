/**
 * What a config says it is **for**: which devices it drives and how many activities it has.
 *
 * Everything else in this codec is about bytes. This module is about the two nouns the
 * application's interface is built from, and it exists because both turn out to be stated rather
 * than inferred: an infrared group is a device, and one state variable counts the activities.
 * `docs/findings.md` section 86.
 *
 * **The names in here are the user's own equipment.** This module hands them back, because the
 * application is reading its owner's own config; what does not happen is quoting one in a document
 * or a test. The generic role words the generator emits are structure and appear freely, and the
 * tests assert how many variables carry a device identifier rather than which.
 */
import { Container } from './gspm.ts';
import { IR_QUANTITY_OPCODE, irGroups } from './ir.ts';
import {
  handlerSets,
  modePages,
  modeRecords,
  nameNodes,
  stateRecords,
  taggedList,
  ACTION_LIST_INDEX_OPCODE,
} from './sections.ts';
import { characterMap, screenStrings } from './text.ts';
import {
  SCREEN_END, SCREEN_QUEUE_INSTRUCTION, screenProgram,
} from './screen.ts';
import { valueMaps } from './valuemap.ts';
import { EDGE_CODES, PANEL_LEFT, panelPoint, touchOwner, touchPageOf } from './touch.ts';
import type { ScreenString } from './text.ts';
import type { TouchArea } from './tables.ts';
import type { ModePage, ModeRecord, StateRecord } from './sections.ts';
import type { Instruction } from './gspm.ts';
import type { ScreenChoice } from './render.ts';

/**
 * The level base slot 0 names state variables at. Level 0 names the containers, `Root` and `State`
 * and, on the generators that emit it, `HarmonyAssistant`; level 2 is a menu below one of those.
 */
export const STATE_NAME_LEVEL = 1;

/**
 * The variable that counts the activities, by name, in every one of the seventeen containers of
 * the corpus that carry a name tree. Its highest value **is** the number of activities: zero in a
 * safe mode container, one in the config Logitech compiled for a single activity while we watched.
 */
export const ACTIVITY_STATE_NAME = 'CurrentActivityState';

/** How a level 1 name is put together, once the trailing value count is taken off. */
export interface StateVariable {
  /** Index into base slot 13, which is what the name node states. */
  index: number;
  /** The whole name as the config spells it, the user's device name included. */
  name: string;
  /**
   * The name with the trailing `_<values>` removed, or the whole name when there is none. It ends
   * in a qualifier of its own: a device identifier on the arch 14 configs, and a small number
   * elsewhere, `CurrentActivityState_0` being the one every container carries.
   */
  label: string;
  /**
   * The number the name ends in, which is the record's highest value plus one, or undefined when
   * the name does not end in a number. 250 of 250 agree across four architectures.
   */
  stated?: number;
  /**
   * The Logitech device identifier, when the name carries one: a token of six digits or more,
   * which the two arch 14 configs use and the older generators do not. Not stored anywhere in the
   * container as a number, so it is host side metadata like the rest of base slot 0.
   */
  deviceId?: number;
  record?: StateRecord;
}

const DEVICE_ID = /^\d{6,}$/;
const TRAILING_COUNT = /_(\d+)$/;

/** Every named state variable, joined to the base slot 13 record its index names. */
export function stateVariables(c: Container): StateVariable[] {
  const records = stateRecords(c) ?? [];
  const out: StateVariable[] = [];
  for (const node of nameNodes(c) ?? []) {
    if (node.level !== STATE_NAME_LEVEL) continue;
    const tail = TRAILING_COUNT.exec(node.name);
    const parts = node.name.split('_');
    const id = parts.slice(0, -1).find((part) => DEVICE_ID.test(part));
    out.push({
      index: node.index,
      name: node.name,
      label: tail === null ? node.name : node.name.slice(0, node.name.length - tail[0].length),
      ...(tail === null ? {} : { stated: Number(tail[1]) }),
      ...(id === undefined ? {} : { deviceId: Number(id) }),
      ...(records[node.index] === undefined ? {} : { record: records[node.index] }),
    });
  }
  return out;
}

/**
 * The state variable that counts the activities, or undefined where the container has no name tree.
 *
 * Matched on the **first token**, because a level 1 name is `<label>_<qualifier>_<values>` and this
 * one is `CurrentActivityState_0_<values>` in every container that has it. One copy on purpose: three
 * readers here need it, and two right copies of a derivation is the state that precedes two diverging
 * ones.
 */
function activityVariable(c: Container): StateVariable | undefined {
  return stateVariables(c).find((v) => v.name.split('_')[0] === ACTIVITY_STATE_NAME);
}

/**
 * How many activities the config defines, or undefined when it has no name tree to say so.
 *
 * The count is the variable's highest value rather than its number of values, and section 121 is why:
 * the values are `0` upward with one of them, `idleActivityValue`, meaning no activity, so `highest`
 * of `highest + 1` values are activities. The calibration is the pair of section 58: a config compiled
 * by Logitech's own service for exactly one activity, read off the remote afterwards, reports one. A
 * safe mode container reports zero, and it is the one container whose lists write the idle value.
 */
export function activityCount(c: Container): number | undefined {
  return activityVariable(c)?.record?.second;
}

/**
 * How many devices the config drives: one infrared group per device.
 *
 * Base slot 5's groups are the device partition of the infrared database, 8 to 164 codes each, and
 * a group may be empty. Two things say a group is a device rather than some other grouping: the
 * config compiled for one device carries exactly one group, and on the two arch 14 configs the
 * number of distinct device identifiers in the state variable names is the number of groups, 4 and
 * 6. Section 86.
 */
export function deviceCount(c: Container): number | undefined {
  return irGroups(c)?.length;
}

/** The distinct device identifiers the names carry, in first appearance order. Arch 14 only. */
export function deviceIds(c: Container): number[] {
  const out: number[] = [];
  for (const variable of stateVariables(c)) {
    if (variable.deviceId !== undefined && !out.includes(variable.deviceId)) {
      out.push(variable.deviceId);
    }
  }
  return out;
}

/**
 * The instruction that writes a state variable, `STATE_WRITE_BASE + index`, taken from `actions.ts`
 * rather than declared again here.
 *
 * **It said `0x80 | index`, "one instruction with a five bit field"<!--superseded-->, and the code
 * adds.** For every
 * index below 128 the two spellings produce the same byte, so nothing could go wrong; the five is
 * what is wrong, and it under-claims what this reader depends on. The corpus reaches index **93**,
 * seven bits, and `calibration_h600`'s own activity variable is 34, whose chain is measured working
 * in section 121. So a reader "correcting" the code to match the comment's arithmetic would be
 * harmless and one narrowing the field to five bits would break the Harmony 600 calibration sample.
 * Section 139.
 */
import {
  BYTE_REGISTER_FROM_STATE,
  STATE_BAND,
  STATE_FROM_BYTE_REGISTER,
  STATE_WRITE_BASE,
} from './actions.ts';
/**
 * Opcode `0x1F` with operand `0xFFxx` selects the current binding table entry, the low byte being
 * the index into base slot 9. `docs/config-format.md`, from the register machine's own band.
 *
 * Exported since section 273, because the activity composer emits one and there must not be a
 * second spelling of it in `compose.ts`.
 */
export const SELECT_BINDING_SET = 0x1f;
export const SELECT_BINDING_SET_MASK = 0xff00;
/** A key code's scan code, the rest of it being the event type. Section 17. */
const SCAN_CODE_MASK = 0x3f;
/**
 * How far to shift a key code to leave the event type: 0 none, 1 release, 2 press, 3 repeat.
 *
 * Exported since 6 September 2026, because `compose.ts` needs the **writing** side of this encoding
 * and briefly declared its own `KEY_EVENT_SHIFT = 6` with a comment acknowledging the duplication.
 * Acknowledging it is not resolving it: two right copies is the state that precedes two disagreeing
 * ones, which is `isa.py`'s rule and does not care that one of them is a six.
 */
export const KEY_EVENT_SHIFT = 6;
/** The event type of a press. */
export const KEY_EVENT_PRESS = 2;

/** One way a button reaches one activity. */
export interface ActivityBinding {
  /**
   * The value written into `CurrentActivityState`.
   *
   * **Zero is an activity like any other**, which corrects the reading section 86 gave: it said value<!--superseded-->
   * 0 is "no activity running" and the rest are the activities. The idle value is the record's own
   * `first`, and section 273 replaced the description that used to sit here with a rule: the variable
   * takes `0` to `second`, those values are exactly the activities plus the idle one, and `second` is
   * the activity count, on 15 of 15 user configs. **Where the idle one sits is what varies**, the
   * maximum on 12 and inside the run on 3. `idleActivityValue` is that number and no binding writes it.
   */
  activity: number;
  /** Index into `modePages`, which is the screen the button belongs to. */
  page: number;
  /** The tagged list's key code: an event type in `0xC0` and a scan code in `0x3F`. Section 17. */
  tag: number;
  /** The scan code alone, which is what a silhouette would eventually name. */
  scan: number;
  /** The base slot 10 list the binding runs, which is where the selection happens. */
  list: number;
  /** The base slot 9 set that list selects. */
  set: number;
}

/**
 * Every button binding that starts an activity, and which activity it starts.
 *
 * **This is the chain an interface needs and it took four hops to find.** Section 120. A page's
 * tagged list binds a key to opcode `0x7F`, which names a base slot 10 action list; that list
 * carries `0x1F` with operand `0xFF | set`, which selects a base slot 9 binding set; that set's own
 * tagged list carries another `0x7F`, naming the list that writes `CurrentActivityState`.
 *
 * Two routes were ruled out before this one, section 112: no screen switch reads the variable's
 * index, and base slot 14's value maps point at targets that draw no text. A third was proposed in
 * `CLAUDE.md` and was wrong, the touch hit map, which exists on arch 12 alone.
 *
 * The closure is a count. The number of base slot 10 lists that write the variable equals the
 * activity count exactly, in every container that has a name tree, across four architectures. So
 * there is one such list per activity and no spares.
 */
export function activityBindings(c: Container): ActivityBinding[] {
  const variable = activityVariable(c);
  const lists = c.actionLists();
  const sets = handlerSets(c);
  if (variable === undefined || lists === undefined || sets === undefined) return [];
  const writeOpcode = STATE_WRITE_BASE + variable.index;

  // Hop one: which base slot 10 lists write the variable, and to what value.
  const writes = new Map<number, number>();
  lists.forEach((list, index) => {
    const found = list.find((i) => i.opcode === writeOpcode);
    if (found !== undefined) writes.set(index, found.operand);
  });

  // Hop two: which base slot 9 sets run one of those.
  const setActivity = new Map<number, number>();
  sets.addresses.forEach((address, index) => {
    for (const entry of taggedList(c, address)?.entries ?? []) {
      if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      const activity = writes.get(entry.operand);
      if (activity !== undefined) setActivity.set(index, activity);
    }
  });

  // Hop three: which action lists select one of those sets.
  const selects = new Map<number, { activity: number; set: number }>();
  lists.forEach((list, index) => {
    for (const i of list) {
      if (i.opcode !== SELECT_BINDING_SET) continue;
      if ((i.operand & SELECT_BINDING_SET_MASK) !== SELECT_BINDING_SET_MASK) continue;
      const set = i.operand & 0xff;
      const activity = setActivity.get(set);
      if (activity !== undefined) selects.set(index, { activity, set });
    }
  });

  // Hop four: which page bindings run one of those lists.
  const out: ActivityBinding[] = [];
  modePages(c).forEach((page, index) => {
    for (const entry of taggedList(c, page.list)?.entries ?? []) {
      if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      const hit = selects.get(entry.operand);
      if (hit === undefined) continue;
      out.push({
        activity: hit.activity,
        page: index,
        tag: entry.tag,
        scan: entry.tag & SCAN_CODE_MASK,
        list: entry.operand,
        set: hit.set,
      });
    }
  });
  return out;
}

/**
 * How many base slot 10 lists write `CurrentActivityState`, which should be the activity count.
 *
 * Separate from `activityBindings` on purpose: it is the closure the whole chain rests on, so it has
 * to be checkable without walking the other three hops. A container where these two disagree has
 * either an activity nothing starts or a list that writes a value no activity has.
 */
export function activityWriterCount(c: Container): number | undefined {
  const variable = activityVariable(c);
  const lists = c.actionLists();
  if (variable === undefined || lists === undefined) return undefined;
  const writeOpcode = STATE_WRITE_BASE + variable.index;
  return lists.filter((list) => list.some((i) => i.opcode === writeOpcode)).length;
}

/**
 * The value `CurrentActivityState` holds when no activity is running.
 *
 * Base slot 13's record states it, at +0x00, the field section 60 read as an initial value and marked
 * **unconfirmed** because nothing had been traced to it. This is the confirmation, and it comes from
 * the other side: it is exactly the value no activity binding writes, in all 15 user configs. The
 * agreement is not arithmetic, because on 3 of the 15 the idle value sits **inside** the run and an
 * activity holds the maximum, so no rule of the form "the top value is idle" can fit. Section 273
 * states the whole numbering rule, of which this is one row.
 *
 * The arch 9 safe mode container is the single case where a list **does** write it, and that is why
 * it reports zero activities: its one list returns the remote to idle rather than starting anything.
 */
export function idleActivityValue(c: Container): number | undefined {
  return activityVariable(c)?.record?.first;
}

/** Where each activity's working screen is stated: one base slot 14 record, keyed by activity. */
export interface ActivityScreens {
  /** The base slot 14 record, by index, which is what an `0x72` operand's high byte selects. */
  map: number;
  /** Activity value to the base slot 6 mode that activity shows once it is running. */
  screens: Map<number, number>;
}

/**
 * What a base slot 14 case does when it is one instruction: its program is a single `0x11` queueing
 * an action list instruction, then the end, which is every case of the records keyed by the activity
 * on the Harmony One and on the Harmony 600, 650 and 700, sections 279 and 290. Undefined for any
 * other program, so a caller asking "does this case enter a mode" cannot be answered by a longer one.
 */
export function caseQueued(c: Container, address: number): Instruction | undefined {
  const program = screenProgram(c, address);
  const first = program?.[0];
  if (program?.length !== 2 || program[1]?.opcode !== SCREEN_END
      || first?.opcode !== SCREEN_QUEUE_INSTRUCTION) {
    return undefined;
  }
  return { opcode: first.operands[2] as number, operand: (first.operands[0] as number) | ((first.operands[1] as number) << 8) };
}

/**
 * The screen each activity shows while it runs, read from the table the remote itself consults to
 * get back to it, section 279.
 *
 * **An activity has two screens and this is the second.** Its enter list opens by entering a mode
 * whose page says "Keep the remote pointed at your system" and binds every key to nothing; the
 * screen with the activity's own pads and "Devices" in the corner is entered at the end of the
 * chain, behind the infrared. So the first `0x7E` of an enter list is the wrong place to look, and
 * following the chain is worse, because it branches on the Remote Assistant's state variables and
 * reaches half a dozen help screens.
 *
 * The table is the reliable source, and it is found the way the remote reaches it. **Device mode's
 * "Activities" key** maps a state variable through base slot 14, and while an activity runs that
 * chain lands in a record keyed by `CurrentActivityState` whose cases are the two instruction screen
 * program `queue 0x7E:mode; end`. So this walks the Activities key of every device mode page, follows
 * `0x7F` into lists and `0x72` into the record it selects and on through the instructions its cases
 * queue, and keeps the records the walk selects **on the activity variable**. Only that key: walking
 * every key a device mode page binds reaches the Devices key's record too, which is keyed by the same
 * variable, and then there are two answers.
 *
 * **Shape alone was tried first and is not enough**: on twelve of the thirteen Harmony One
 * configurations with activities, three records are keyed by the activity and enter a mode on every
 * case an activity binds, and on the factory one five. The others map each activity to its own device
 * list, which is what the Devices key of the activity's screen enters. Every one of them also carries
 * a case for the idle value, which enters no mode, so "every case" is the wrong test. The walk
 * separates them where the shape cannot: from the Activities key alone it finds exactly one record on
 * 463 of 463 device mode pages over those thirteen.
 *
 * Cases for values no activity binds are ignored, and so is a binding with no case, which is exactly
 * what a composed activity is before its screen is composed. Undefined when the walk reaches no such
 * record or more than one, since two candidates would be a guess.
 */
export function activityScreens(c: Container): ActivityScreens | undefined {
  const variable = activityVariable(c);
  const lists = c.actionLists();
  const maps = valueMaps(c);
  const marker = deviceModeMarker(c);
  if (variable === undefined || lists === undefined || maps === undefined || marker === undefined) {
    return undefined;
  }
  const values = new Set(activityBindings(c).map((one) => one.activity));
  const queuedBy = (address: number): Instruction[] => (screenProgram(c, address) ?? [])
    .filter((one) => one.opcode === SCREEN_QUEUE_INSTRUCTION)
    .map((one) => ({
      operand: (one.operands[0] as number) | ((one.operands[1] as number) << 8),
      opcode: one.operands[2] as number,
    }));
  const enters = (address: number): number | undefined => {
    const queued = caseQueued(c, address);
    return queued?.opcode === ENTER_MODE ? queued.operand : undefined;
  };

  // The walk. A visited set per instruction, since the chains loop: a case can queue the key's own
  // list again, and the device list's lists call shared machinery several levels deep.
  const reached = new Set<number>();
  const seen = new Set<string>();
  const walk = (instruction: Instruction, depth: number): void => {
    const key = `${instruction.opcode}:${instruction.operand}`;
    if (depth > MAP_WALK_DEPTH || seen.has(key)) return;
    seen.add(key);
    if (instruction.opcode === ACTION_LIST_INDEX_OPCODE) {
      for (const one of lists[instruction.operand] ?? []) walk(one, depth + 1);
    } else if (instruction.opcode === MAP_VALUE_OPCODE) {
      const map = instruction.operand >> 8;
      if ((instruction.operand & 0xff) === variable.index) reached.add(map);
      for (const [, target] of maps[map]?.entries ?? []) {
        for (const one of queuedBy(target)) walk(one, depth + 1);
      }
    }
  };
  const deviceModes = new Set<number>();
  for (const list of lists) {
    const mode = deviceListRowMode(list, c.architecture, marker);
    if (mode !== undefined) deviceModes.add(mode);
  }
  const records = modeRecords(c) ?? [];
  for (const mode of deviceModes) {
    for (const page of records[mode]?.pages ?? []) {
      const left = activitiesKey(c, page);
      if (left === undefined) continue;
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.tag === ((KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | left)) walk(entry, 0);
      }
    }
  }

  const found: ActivityScreens[] = [];
  for (const map of reached) {
    const screens = new Map<number, number>();
    for (const [value, target] of maps[map]?.entries ?? []) {
      if (!values.has(value)) continue;
      const mode = enters(target);
      if (mode !== undefined) screens.set(value, mode);
    }
    if (screens.size > 0) found.push({ map, screens });
  }
  return found.length === 1 ? found[0] : undefined;
}

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
 * The scan code of a page's **left bottom key**, the one device mode labels "Activities", or
 * undefined where the page offers none.
 *
 * Found by position rather than by code, since a code is an area's place in its hit page, section
 * 275: the lowest content rectangle that starts at the panel's left edge. The right bottom key, where
 * a page has one, is "Devices" and leads to the running activity's device list, which is a different
 * record keyed by the same variable, so walking both keys finds two answers where there is one.
 */
function activitiesKey(c: Container, page: ModePage): number | undefined {
  const areas = (touchPageOf(c, page)?.areas ?? []).filter((one) => !EDGE_CODES.includes(one.code));
  if (areas.length === 0) return undefined;
  const bottom = Math.min(...areas.map((one) => one.y));
  return areas.find((one) => one.y === bottom && one.x === PANEL_LEFT)?.code;
}

/** Opcode `0x72`: map a state variable's value through the base slot 14 record its high byte names. */
export const MAP_VALUE_OPCODE = 0x72;
/** How deep `activityScreens` follows a chain. A guard against a loop, not a reading: three suffice. */
const MAP_WALK_DEPTH = 12;

/** An activity, the page whose keys start it, and its name where the config lets us name it. */
export interface ActivityName {
  activity: number;
  /** Index into `modePages`: the one page in the container whose keys start this activity. */
  page: number;
  /** The scan codes on that page which start it, in the page's own order. */
  scans: number[];
  /** The base slot 6 modes the chain enters, which is where the name comes from. */
  modes: number[];
  /** The label drawn on the page for this activity, when exactly one string resolves to it. */
  name?: string;
  /** Where that label is drawn, which is what makes it attributable in the first place. */
  at?: { x: number; y: number };
}

/**
 * Which activity a drawn name belongs to, section 121.
 *
 * The question the application could not answer: a mode page's screen program draws the activity
 * names and nothing else names them, section 112, so listing them was possible and saying which entry
 * starts which activity was not. `activityBindings` gets as far as the **page**. This gets to the
 * string on it, and the route is not geometry:
 *
 * 1. the activity's chain enters one or more base slot 6 modes, by opcode `0x7E`
 * 2. those modes' own pages draw text, and one of their strings is the activity's name, because a
 *    remote entering an activity puts its name on the screen
 * 3. so the page's string that relates to one of those is this activity's label
 *
 * "Relates to" is a string the modes say **exactly**, and containment either way only where nothing is
 * said exactly, which is what the Harmony 700 needs: its menu label is the name plus a qualifier and
 * its splash screen is a verb plus the name, so the two share the name and neither equals it.
 *
 * **A string several activities of one page claim is chrome**, a title or a footer, and is dropped.
 * That is what separates the label from the "Starting" splash text every row shares.
 *
 * **A label the menu wrapped onto a second row** is looked for last, and only for an activity nothing
 * else resolved, which is a Harmony 525 and nothing else here.
 *
 * **Arch 12 does not use any of that, and it runs first**, section 125. No string rule can work on a
 * touch panel: three pages of `one_config` bind activities on scans {50,51,52}, {50,48,49} and {48,49}
 * while each draws its labels at the same rows, so no fixed code to row map exists. A Harmony One takes
 * the label from base slot 17's hit map instead, through the index in the mode page's own `lead` byte,
 * so the rectangle is stated and the label is the text the firmware's hit test puts inside it. Sections
 * 121, 124 and 125.
 */
export function activityNames(c: Container): ActivityName[] {
  const bindings = activityBindings(c);
  if (bindings.length === 0) return [];
  const lists = c.actionLists() ?? [];
  const sets = handlerSets(c);
  const records = modeRecords(c) ?? [];
  const pages = records.flatMap((record) => record.pages);
  const map = characterMap(c);
  const drawn = map === undefined ? [] : screenStrings(c, map);
  const textOf = (program: number): ScreenString[] => drawn.filter((one) => one.program === program);
  const useful = (one: ScreenString): boolean => one.text.trim().length >= SHORTEST_USEFUL_LABEL;

  interface Draft {
    binding: ActivityBinding;
    scans: number[];
    modes: number[];
    /** Label key to the string that draws it, for every candidate this activity has. */
    candidates: Map<string, ScreenString>;
  }

  interface Spec {
    binding: ActivityBinding;
    scans: number[];
    modes: number[];
    /** Every string the modes this activity enters put on a screen. */
    spoken: string[];
  }

  const specs: Spec[] = [];
  for (const activity of [...new Set(bindings.map((b) => b.activity))].sort((a, b) => a - b)) {
    const mine = bindings.filter((b) => b.activity === activity);
    const binding = mine[0] as ActivityBinding;
    // **The page comes from the first binding and the scans from all of them**, which is only sound
    // because all of an activity's keys are on one page, section 120. That closure was measured and
    // then depended on with nothing stating it: were it ever to fail, the label would be looked up
    // on one page using scans from another and come back plausible. 0 counterexamples in the corpus,
    // so this refuses a container rather than guarding against one that exists. Section 139.
    if (mine.some((b) => b.page !== binding.page)) continue;

    // Hop one: every mode the chain enters. The bound list may enter one itself, and the base slot 9
    // set it selects has its own tagged list whose entries enter more.
    const modes = new Set<number>();
    const walked = new Set<number>();
    const walk = (index: number, depth: number): void => {
      if (depth > CHAIN_DEPTH_LIMIT || walked.has(index)) return;
      walked.add(index);
      for (const i of lists[index] ?? []) {
        if (i.opcode === ENTER_MODE) modes.add(i.operand);
        if (i.opcode === ACTION_LIST_INDEX_OPCODE) walk(i.operand, depth + 1);
      }
    };
    walk(binding.list, 0);
    for (const entry of taggedList(c, sets?.addresses[binding.set] ?? 0)?.entries ?? []) {
      if (entry.opcode === ENTER_MODE) modes.add(entry.operand);
      if (entry.opcode === ACTION_LIST_INDEX_OPCODE) walk(entry.operand, 1);
    }

    // Hop two: what those modes put on the screen. One of these strings is the activity's own name,
    // because a remote entering an activity says which one it entered.
    const spoken: string[] = [];
    for (const mode of modes) {
      for (const page of records[mode]?.pages ?? []) {
        for (const one of textOf(page.program)) if (useful(one)) spoken.push(one.text);
      }
    }

    specs.push({ binding, scans: mine.map((b) => b.scan), modes: [...modes], spoken });
  }

  // Hop three: the page's strings that relate to one of those. Containment either way rather than
  // equality, which is what the Harmony 700 needs: its menu label is the name plus a qualifier and its
  // splash screen is a verb plus the name, so the two share the name and neither equals it.
  //
  // **A string the modes say exactly beats one they only contain**, and that is not a tie break, it is
  // what stops containment crossing a word boundary. An activity's chain also enters the mode that
  // lists its devices, and that list is the same for every activity, so on a Harmony 880 whose owner
  // described his own config every activity said every device's name. One of the four menu labels is
  // the first word of a device's name, so containment made it a candidate for all four activities, the
  // chrome rule below then read a label four activities claim as a footer, and the activity it belonged
  // to lost its only candidate. Two other arch 8 configs and the 885 gained a name from the same rule.
  //
  // The alternative was dropping a string every activity says, on the ground that it distinguishes none
  // of them. It fixes exactly the same eight names and costs a pass, because the chrome rule one hop
  // later then has less to work with rather than more. Section 124.
  const candidatesFor = (spec: Spec, wrapped: boolean): Map<string, ScreenString> => {
    const { binding, spoken } = spec;
    const target = pages[binding.page];
    const rows = (target === undefined ? [] : textOf(target.program)).filter(useful);
    const exact = new Map<string, ScreenString>();
    const loose = new Map<string, ScreenString>();
    for (const one of rows) {
      for (const phrase of wrapped ? continuations(one, rows) : [one.text]) {
        const equal = spoken.some((said) => said === phrase);
        // **A wrapped label has to be a prefix of what the mode says**, not merely related to it, and
        // that is the menu's own behaviour: it truncates a long name to the rows it has. Containment
        // both ways is what the unwrapped case needs and it is far too loose here, because a joined
        // phrase ends up containing a device's name and every activity says all of those. It also
        // rejects a join that crosses from one menu item into the next, which containment accepted.
        const related = wrapped
          ? spoken.some((said) => said.startsWith(phrase))
          : spoken.some((said) => phrase.includes(said) || said.includes(phrase));
        if (!equal && !related) continue;
        const into = equal ? exact : loose;
        const key = labelKey(binding.page, { ...one, text: phrase });
        if (!into.has(key)) into.set(key, { ...one, text: phrase });
      }
    }
    return exact.size > 0 ? exact : loose;
  };

  // Hop four: drop the page's chrome, then propagate.
  //
  // **Chrome first, because it is not a label and would jam the propagation.** A page's title and its
  // footer relate to every activity's modes, since every activity's screens carry the same
  // boilerplate. Two rules find them, and both are needed: a key every activity of a page claims is
  // chrome, which is what catches a footer on a page with several activities; and a key some other
  // activity page of the same mode draws identically is chrome too, which is what catches it on a page
  // with only one. Testing only the first left the Harmony 600's single activity page holding its
  // footer as a rival candidate.
  const assigned = new Map<number, ScreenString>();
  const taken = new Set<string>();
  const resolve = (drafts: Draft[]): void => {
    const perPage = new Map<number, Draft[]>();
    for (const draft of drafts) {
      const on = perPage.get(draft.binding.page) ?? [];
      on.push(draft);
      perPage.set(draft.binding.page, on);
    }
    const activityPages = new Set(drafts.map((draft) => draft.binding.page));
    const elsewhere = new Map<number, Set<string>>();
    for (const page of activityPages) {
      const mode = modeOfPage(records, page);
      const others = new Set<string>();
      for (const sibling of activityPages) {
        if (sibling === page || modeOfPage(records, sibling) !== mode) continue;
        const program = pages[sibling]?.program;
        if (program === undefined) continue;
        for (const one of textOf(program)) {
          if (useful(one)) others.add(sameRowElsewhere(labelKey(sibling, one)));
        }
      }
      elsewhere.set(page, others);
    }
    for (const [page, on] of perPage) {
      const claims = new Map<string, number>();
      for (const draft of on) for (const key of draft.candidates.keys()) {
        claims.set(key, (claims.get(key) ?? 0) + 1);
      }
      const sharedElsewhere = elsewhere.get(page) ?? new Set<string>();
      for (const draft of on) {
        for (const key of [...draft.candidates.keys()]) {
          const everyone = on.length > 1 && claims.get(key) === on.length;
          const already = taken.has(key);
          if (everyone || already || sharedElsewhere.has(sameRowElsewhere(key))) {
            draft.candidates.delete(key);
          }
        }
      }
    }

    // **One label belongs to one activity**, so a candidate another activity has been assigned is no
    // longer a candidate here. That is a constraint rather than a preference, and propagating it is
    // what finishes the arch 8 pages: two of three activities resolve on their own and the third is
    // then the only claimant left on the label the other two gave up.
    for (let progress = true; progress; ) {
      progress = false;
      for (const draft of drafts) {
        if (assigned.has(draft.binding.activity) || draft.candidates.size !== 1) continue;
        const [key, label] = [...draft.candidates][0] as [string, ScreenString];
        assigned.set(draft.binding.activity, label);
        taken.add(key);
        for (const other of drafts) {
          if (other === draft) continue;
          other.candidates.delete(key);
        }
        progress = true;
      }
    }
  };

  // **On a Harmony One the label is stated rather than matched**, so that route runs first and the
  // string matching above only sees what it leaves. Section 125: the mode page's `lead` byte indexes
  // base slot 17's hit map, so the key that starts an activity has a rectangle, and the label is the
  // text the firmware's own hit test puts inside it. No containment, no chrome rule and no propagation,
  // which is why the eight activities of `one_config` resolve where every string based rule failed:
  // its three activity pages draw their labels on the same rows and bind different scan codes to them,
  // and that is the contradiction section 121 proved rather than a shortfall in the matching.
  for (const spec of specs) {
    const page = pages[spec.binding.page];
    if (page === undefined) continue;
    const areas = touchPageOf(c, page)?.areas;
    if (areas === undefined || areas.length === 0) continue;
    for (const scan of spec.scans) {
      const area = areas.find((one) => one.code === scan);
      if (area === undefined) continue;
      const inside = textOf(page.program)
        .filter(useful)
        .filter((one) => touchOwner(areas, one.x, one.y) === area);
      // One label to a region. Several means the region holds a wrapped label or a second line, and
      // this route does not guess which part is the name.
      const distinct = [...new Map(inside.map((one) => [one.text, one])).values()];
      if (distinct.length !== 1) continue;
      const label = distinct[0] as ScreenString;
      assigned.set(spec.binding.activity, label);
      taken.add(labelKey(spec.binding.page, label));
      break;
    }
  }

  const drafts: Draft[] = specs.map((spec) => ({
    binding: spec.binding,
    scans: spec.scans,
    modes: spec.modes,
    candidates: candidatesFor(spec, false),
  }));
  resolve(drafts);

  // Hop five, and only for what is left: **a label the menu wraps onto a second row**, which is the
  // Harmony 525 and nothing else here. Its menu is two columns of two lines each, so an activity's own
  // label is drawn as two strings on consecutive rows, and matching one row at a time returns a
  // fragment. `docs/findings.md` section 121 has the layout.
  //
  // A fallback rather than a rule, and deliberately: a wrapped candidate is only looked for once an
  // activity has failed to resolve on single rows, so this pass can add a name and cannot change one.
  // It also gives up the whole single row candidate set, because keeping both leaves every fragment as
  // a rival of the label it is a fragment of.
  const stuck = specs.filter((spec) => !assigned.has(spec.binding.activity));
  if (stuck.length > 0) {
    resolve(stuck.map((spec) => ({
      binding: spec.binding,
      scans: spec.scans,
      modes: spec.modes,
      candidates: candidatesFor(spec, true),
    })));
  }

  return drafts.map((draft): ActivityName => {
    const base = {
      activity: draft.binding.activity,
      page: draft.binding.page,
      scans: draft.scans,
      modes: draft.modes,
    };
    const label = assigned.get(draft.binding.activity);
    if (label === undefined) return base;
    return { ...base, name: label.text, at: { x: label.x, y: label.y } };
  });
}

/** Which base slot 6 record a flattened page index belongs to, since chrome is a per mode notion. */
function modeOfPage(
  records: readonly { pages: readonly unknown[] }[],
  page: number,
): number | undefined {
  let seen = 0;
  for (const [index, record] of records.entries()) {
    if (page < seen + record.pages.length) return index;
    seen += record.pages.length;
  }
  return undefined;
}

/** The same label key with the page dropped, so one page's chrome can be recognised on another. */
function sameRowElsewhere(key: string): string {
  return key.slice(key.indexOf(',') + 1);
}

/**
 * What makes two draws the same label: the page, the row and the text.
 *
 * **The row alone is not enough and neither is the position.** Arch 8 lays its activity menu out in
 * two columns, so two activities of one page have labels at the same `y`, which keying on the row
 * merged. And a 525 draws one label twice on a row at two `x` values, a selected and an unselected
 * copy, which keying on the position split. The text settles both: same row and same text is one
 * label however many times it is drawn, and two columns differ because their words do.
 */
function labelKey(page: number, one: ScreenString): string {
  return `${page},${one.y},${one.text}`;
}

/**
 * A draw's text joined with each draw on the next row down, which is what a wrapped label looks like.
 *
 * **Not the same column, because the second line is not aligned with the first.** The 525 draws
 * "Watch" at x 63 and its continuation at x 72, so a column test would miss it; what selects the right
 * continuation is the caller's own filter, that the joined text is something the activity's modes say.
 * Only one row down: no label in the corpus wraps three ways, and allowing two would let a fragment of
 * one item join a fragment of the next.
 */
function continuations(one: ScreenString, rows: readonly ScreenString[]): string[] {
  const below = rows.filter((other) => other.y > one.y).map((other) => other.y);
  if (below.length === 0) return [];
  const next = Math.min(...below);
  return rows.filter((other) => other.y === next).map((other) => `${one.text} ${other.text}`);
}

/** Opcode `0x7E`: enter the base slot 6 mode the operand indexes. Section 36. */
const ENTER_MODE = 0x7e;
/**
 * How far to follow `0x7F` from the bound list.
 *
 * Three is enough for every container here and the limit is a guard rather than a reading: an action
 * list may name another, so an unbounded walk would visit most of base slot 10 for every activity.
 */
const CHAIN_DEPTH_LIMIT = 3;
/** A string this short says nothing about which activity it belongs to. */
const SHORTEST_USEFUL_LABEL = 2;

/**
 * `resolveLabel` was here and is gone, which is a removal this file records rather than performs
 * quietly.
 *
 * It had **zero callers** and it implemented the rule section 124 refuted: it accepted a page string
 * that merely **contained** one of the activity's spoken strings, or was contained by it, where the
 * live route in `activities` requires an exact match first and falls back to containment only after.
 * That is not a style difference. An activity's chain enters the mode that lists the devices, so every
 * activity says every device's name, and reading containment as sufficient let one label be claimed by
 * all four activities of an arch 8 (Harmony 880) config and then dropped from all four as chrome. The
 * corpus wide figure sat at 23 of 35 for a day because of it, and three of those 23 were fragments of a
 * wrapped label belonging to a different activity than the one they were reported for.
 *
 * So the measurement that decides between the two copies already existed, in section 124, and the copy
 * that lost is the one that was removed. That order matters here: the rule is to reproduce the
 * disagreement and find an external answer **before** deleting either half, and the answer in this case
 * is the calibration pair, whose three devices and two activities were chosen before the bytes existed.
 */

/**
 * Opcode `0x7D`: send an infrared code, `{ u8 group; u8 index }`. Section 33.
 *
 * The group is the device, section 86. This said the instruction is "the only place in the format
 * where an action says **which device** it is talking to", and that is corrected rather than
 * quietly dropped, section 278: `DEVICE_QUANTITY` below names the same device in its own high byte
 * on every send list of the corpus, and a composed send without it is not transmitted when an
 * activity's state transition runs it.
 */
export const SEND_INFRARED = 0x7d;

/**
 * Opcode `0x7C`: the per device quantity every send is paired with, `{ u8 group; u8 amount }`.
 *
 * **This is not decoration and it is not only the power on delay.** Every action list holding a
 * `0x7D` holds one of these, with this operand's high byte equal to the send's, on every
 * architecture the lab holds a configuration of: `{0x7D, 0x7C}` on arch 8, 9, 10 and 12,
 * `{0x7F, 0x7D, 0x7C}` on arch 14, and that pair or `{0x07, 0x7D, 0x7C}` on arch 16. Sections 33 and
 * 278. Section 70 reads the quantity and section 236 the queue it lands in.
 *
 * **A bare send is not transmitted when a state transition runs it**, measured on the spare Harmony
 * One, section 278: a composed device whose six lists were the send alone answered a button press on
 * all six and sent nothing when the activity's power transition ran the same list, while pointing
 * that transition at an existing paired list switched the television on. Pairing the six fixed it.
 * Why the two routes differ is **unread**: both instructions push a two byte entry into one queue,
 * this one with bit 6 set on its device byte, and section 236's reading of the queue's picker would
 * let a lone send out, so that reading does not explain it either.
 */
export const DEVICE_QUANTITY = 0x7c;

/**
 * What a composed send pairs with its `0x7C`: an amount of 1.
 *
 * Deliberately a constant rather than a computed delay. The quantity is a per device wait and this
 * project has no basis for choosing one for a device it has just added, so it takes the value the
 * configuration's own LG television entry carries, `0x7C` operand `0x0301`, which is the list run 3
 * of section 278 switched the television on with. Section 236 is why a small value is safe: a
 * quantity with no later command for its own device behind it is never felt.
 */
export const DEVICE_QUANTITY_DEFAULT = 1;
// **One constant, not two.** This file declared `SEND_INFRARED` here and `IR_SEND_OPCODE` nine
// hundred lines below, both `0x7d`, both correct, until 6 September 2026. Two right copies is the
// state that precedes two diverging ones and no test can see it, which is exactly what `CLAUDE.md`'s
// oldest rule is about. Exported because a test of the activity anatomy needs to name the send.

/**
 * Opcode `0x71`: a condition on a state variable, section 34. Operand bits 8 to 11 choose the
 * comparison, 0 being equality with the byte register, and bit 15 gives it two arms.
 */
export const CONDITION_OPCODE = 0x71;
/**
 * `0x1F` sub opcode `0xFB`: load the byte register with the operand's low byte, which is what the
 * `0x71` after it compares a variable against. The sub opcode is the operand's high byte.
 */
export const BYTE_REGISTER_LOAD = 0xfb;
/**
 * Action opcode `0x67`, the third producer into the infrared queue, whose entries carry tag 5,
 * sections 70 and 71. What a base slot 14 case of a device's inter device delay table queues, with the
 * device's group in the operand's high byte and the delay in tenths in its low byte, section 287.
 */
export const QUEUE_INTER_DEVICE_DELAY = 0x67;
/**
 * The values an inter device delay table has a case for, 0 to 20 tenths of a second, **in the order
 * the compiler stores them**: every table of the kind on the five arch 14 containers, 23 tables of
 * 23, and each case's program sits in the same order. The order changes nothing, since the keys are
 * distinct and the walk stops at the one that matches; it is reproduced because it costs nothing and
 * looks like a hash table's iteration order in the generator rather than a choice. A variable
 * holding more than 20 matches no case and queues nothing.
 */
export const INTER_DEVICE_DELAY_VALUES: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 16, 19, 18, 20,
];

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
 * configuration, which every list that writes it sets to 1 and back to 0 inside itself, three of
 * them on the 650 an activity's start sequence, section 285; so the delay is queued inside a start
 * sequence and not on a device mode key press, which is an inference and not a measurement. `variable` is the device's `InterDeviceDelay_<identifier>`, and `table` a base slot 14
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

/** The high byte of `0x7D`'s operand: the base slot 5 group. */
const INFRARED_GROUP_SHIFT = 8;

/** One device: an infrared group, and the name the config gives it. */
export interface Device {
  /**
   * Index into base slot 5's group array, which is the device's identity when it sends infrared.
   * Section 86. **Undefined for a device that sends nothing**, which the remote lists all the same:
   * the Wii in a protocol campaign compile has a row on the device list, a device mode of its own,
   * and not one infrared code, and until 1 September 2026 this reader did not see it, because it
   * took the infrared groups as the population. Section 239.
   */
  group?: number;
  /** How many infrared codes it has. A group may be empty, and a device may have no group. */
  codes: number;
  /** The name, where the config states one. */
  name?: string;
  /**
   * Where that name came from, because the four routes are not equally strong:
   *
   * * `names` is base slot 0's own ASCII, tied to this group by the variable's transitions. Stated.
   * * `elimination` is the one label left over for the one group left over. Forced, not read.
   * * `screen` is the title the device's own mode draws, decoded from glyph pixels. Last resort.
   * * `list` is the label drawn on the device's row of the device list, decoded the same way. It is
   *   what the person holding the remote reads, and it is the only route that reaches a device with
   *   no infrared codes, so it fills the gaps the first three leave and overrides none of them.
   */
  source?: 'names' | 'elimination' | 'screen' | 'list';
  /** The base slot 13 variables whose name carries this device's label. */
  variables: number[];
  /**
   * The mode the device list enters for this device, as a base slot 6 index. Arch 12 (Harmony One)
   * only, since the row shape it is read from is that model's, and undefined where no row reaches
   * the device.
   */
  mode?: number;
}

/**
 * A level 1 name that belongs to a device, split into the device's label and the property.
 *
 * A device variable is named `<label>_<property>_<values>` and a global is named
 * `<name>_<values>` or `<name>_<qualifier>_<values>` with a **numeric** qualifier, which is what
 * separates the two: `TV_Power_2` is a device's, `CurrentActivityState_0_4` and
 * `DefaultPowerOnDelay_92595307_255` are not. Section 86 read the shape and called the qualifier "a
 * device identifier on the arch 14 configs, and a small number elsewhere"; that number is exactly the
 * discriminator, since no property word is a number.
 *
 * The label keeps its underscores, because a device label is the user's own words and often several
 * of them: two containers here have a label of four tokens.
 */
export interface DeviceVariable {
  index: number;
  /** The device's label as base slot 0 spells it, underscores included. */
  device: string;
  /** The last token, which is what the variable tracks about that device. */
  property: string;
}

/** The level 1 names that belong to a device rather than to the config as a whole. */
export function deviceVariables(c: Container): DeviceVariable[] {
  const out: DeviceVariable[] = [];
  for (const variable of stateVariables(c)) {
    const cut = variable.label.lastIndexOf('_');
    if (cut <= 0) continue;
    const property = variable.label.slice(cut + 1);
    // A numeric qualifier means the name belongs to the config, not to a device.
    if (property.length === 0 || /^[0-9]+$/.test(property)) continue;
    out.push({ index: variable.index, device: variable.label.slice(0, cut), property });
  }
  return out;
}

/**
 * Every device the config drives, with its name.
 *
 * **The name is stated, and it took a detour to see where.** Base slot 0 names no devices: its level
 * 1 nodes are state variables, and a device's label is only ever a **prefix** of one, `TV_Power_2`.
 * So the label is in the file in ASCII and nothing says which infrared group it belongs to. The link
 * is base slot 13: a variable's record carries its transitions, each holding one action list
 * instruction, section 86, and for a device's `Power` or `Input` variable that list is the one that
 * **sends the code**. So the group is `0x7D`'s own operand, reached from the variable that names it.
 *
 * That is route one and it is exact: 37 of 37 labels across eleven containers reach exactly one
 * group, and no two labels reach the same one. Two routes fill in behind it, in this order:
 *
 * 1. **Elimination**, when exactly one label and one group are left unpaired. Forced rather than
 *    read, and it is what names the device whose only variable has no transitions, which happens when
 *    the remote knows one value for it and therefore has nothing to switch between.
 * 2. **The screen**, for a group with no label at all: the title of the device's own mode, taken only
 *    when one candidate survives. A string that already names an activity is not a candidate, which
 *    is what separates a device called `Roku` from an activity called `Watch Roku`.
 *
 * The independent closure is that the ASCII label is **drawn**: for every device route one names, the
 * label turns up in the screen text as well, and those are two encodings of one string decoded by
 * unrelated code, base slot 0's bytes against base slot 7's glyph pixels.
 */
/**
 * A device list row's shape, per architecture, or false where none is known.
 *
 * Arch 12 (Harmony One): beep, enter a mode, mark device mode. Arch 14 (Harmony 600, 650 and 700):
 * enter a mode, mark device mode, **with no beep**, which is why the Harmony One's shape found no row
 * on any arch 14 configuration and this reader reported none there until section 285. Measured on
 * all four arch 14 user configurations: every list of the two instruction shape ends in the one
 * write each configuration uses, `0x9F` operand 1 on the Harmony 650, `0x9B` on the 600 and `0xA5`
 * on both 700s, half of them bound on a device list page and the other half the lists that page's
 * second copy names, section 69. Every other architecture is tested against the Harmony One's shape,
 * which finds no marker on arch 8, 9 or 10 and so no row, rather than being read on its own terms.
 */
function isDeviceListRowShape(
  list: readonly Instruction[] | undefined, architecture: number | undefined,
): boolean {
  if (list === undefined) return false;
  if (architecture === 14) {
    return list.length === 2
      && list[0]?.opcode === ENTER_MODE_OPCODE
      && (list[1] as Instruction).opcode >= STATE_WRITE_BASE;
  }
  return list.length === 3
    && list[0]?.opcode === 0x75
    && list[1]?.opcode === ENTER_MODE_OPCODE
    && (list[2] as Instruction).opcode >= STATE_WRITE_BASE;
}

/**
 * The mode a device list row enters, if `list` is a row ending in `marker`, and otherwise undefined.
 * The one test of a row, which the composer's menu finder and `deviceListRows` both use: it was two
 * copies of the same four conditions until the arch 14 shape was added, and a third shape would have
 * had to be taught to both.
 */
export function deviceListRowMode(
  list: readonly Instruction[] | undefined, architecture: number | undefined,
  marker: Instruction | undefined,
): number | undefined {
  if (marker === undefined || !isDeviceListRowShape(list, architecture)) return undefined;
  const rows = list as readonly Instruction[];
  const end = rows[rows.length - 1] as Instruction;
  if (end.opcode !== marker.opcode || end.operand !== marker.operand) return undefined;
  return (rows.find((one) => one.opcode === ENTER_MODE_OPCODE) as Instruction).operand;
}

/** Opcode `0x7e`: enter the mode the operand indexes. */
const ENTER_MODE_OPCODE = 0x7e;

/**
 * The instruction a device list row ends with, which marks the remote as being in device mode.
 *
 * **Read off the configuration rather than carried as a constant**, and that is a correction: the
 * composer hardcoded a write of 1 into state variable 24, which is what `one_config` uses, and it is
 * one of eight different variables across the fourteen configurations here that carry a device list,
 * moving between two syncs of one remote. It is unnamed in the name tree in all of them, so there is
 * nothing to look it up by. What is stable is that a config's own rows all write the same one, so the
 * majority answer over every row shaped list is the marker. Section 239.
 *
 * Undefined for a configuration with no such row, which is every architecture but arch 12 (Harmony
 * One) and arch 14 (Harmony 600, 650 and 700), and any config of those two with no device list.
 */
export function deviceModeMarker(c: Container): Instruction | undefined {
  const tally = new Map<string, { instruction: Instruction; count: number }>();
  for (const list of c.actionLists() ?? []) {
    if (!isDeviceListRowShape(list, c.architecture)) continue;
    const end = list[list.length - 1] as Instruction;
    const key = `${end.opcode}:${end.operand}`;
    const seen = tally.get(key);
    if (seen === undefined) tally.set(key, { instruction: end, count: 1 });
    else seen.count += 1;
  }
  let marker: Instruction | undefined;
  let most = 0;
  for (const { instruction, count } of tally.values()) {
    if (count > most) { most = count; marker = instruction; }
  }
  return marker;
}

/** One row of the device list: where it sits, which mode it enters, and what it says. */
export interface DeviceListRow {
  /** The menu mode the row is on, as a base slot 6 index. */
  menu: number;
  /** Which page of that menu, zero based. */
  page: number;
  /** The touch scan the row is bound to: 48 is the top row, 49 the middle, 50 the bottom. */
  scan: number;
  /** The device mode the row enters. */
  mode: number;
  /** The label drawn on the row, where the page's strings pair with its rows one to one. */
  label?: string;
}

/**
 * The device list, read off the widest menu that lists devices.
 *
 * **This is the list the Devices button shows**, and it is the authoritative population of devices,
 * per `docs/how-a-harmony-works.md`: a device is what that list offers, whether or not it sends
 * infrared. A configuration carries several copies of the list, one per context it is shown in,
 * all reaching the same modes, so the first menu reaching the most distinct device modes is taken.
 *
 * A row's label is the string drawn on its page at the row's rank, top to bottom, and only when the
 * page draws exactly as many strings of two characters or more as it has rows. A page that draws
 * more, a page indicator say, leaves its rows unlabelled rather than mislabelled.
 */
export function deviceListRows(c: Container): DeviceListRow[] {
  const marker = deviceModeMarker(c);
  if (marker === undefined) return [];
  const lists = c.actionLists() ?? [];
  const records = modeRecords(c) ?? [];
  let best: DeviceListRow[] = [];
  let bestReach = 0;
  records.forEach((record, menu) => {
    const rows: DeviceListRow[] = [];
    record.pages.forEach((page, pageIndex) => {
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
        const mode = deviceListRowMode(lists[entry.operand], c.architecture, marker);
        if (mode === undefined) continue;
        rows.push({ menu, page: pageIndex, scan: entry.tag & 0x3f, mode });
      }
    });
    const reach = new Set(rows.map((row) => row.mode)).size;
    if (reach > bestReach) { bestReach = reach; best = rows; }
  });
  if (best.length === 0) return best;

  // The labels, by rank on the page. A long name wraps onto a second line drawn a glyph height
  // below the first ("Yamaha AV" over "Receiver", "Microsoft Media" over "Player"), where the rows
  // themselves sit 54 pixels apart, so lines closer than half a row pitch are one label. Counting
  // lines rather than labels is what left the Wii's page unpaired in section 240's first reading.
  const record = records[best[0]!.menu] as ModeRecord;
  const drawn = screenStrings(c, characterMap(c));
  if (c.architecture === 14) {
    labelFourSlotRows(best, record, drawn);
    return best;
  }
  record.pages.forEach((page, pageIndex) => {
    const onPage = best.filter((row) => row.page === pageIndex).sort((a, b) => a.scan - b.scan);
    const lines = drawn
      .filter((one) => one.program === page.program
        && one.text.trim().length >= SHORTEST_USEFUL_LABEL)
      .sort((a, b) => a.y - b.y);
    const labels: string[] = [];
    let lastY = Number.NEGATIVE_INFINITY;
    for (const line of lines) {
      if (labels.length > 0 && line.y - lastY < DEVICE_LIST_ROW_PITCH / 2) {
        labels[labels.length - 1] += ` ${line.text.trim()}`;
      } else {
        labels.push(line.text.trim());
      }
      lastY = line.y;
    }
    if (labels.length !== onPage.length) return;
    onPage.forEach((row, k) => { row.label = labels[k] as string; });
  });
  return best;
}

/** Vertical distance between two rows of the device list on the arch 12 screen, in pixels. */
const DEVICE_LIST_ROW_PITCH = 54;

/**
 * The four items of an arch 14 (Harmony 600, 650 and 700) page, in the order a page fills them:
 * one per button around the display, top left, top right, bottom left, bottom right, and each
 * item's cell. Section 285, measured on all four arch 14 user configurations: every page of a
 * device list or a device mode binds a prefix of this order, 184 of 184, and holds four but the last
 * of its mode and one page of the 700s' receiver mode. The scans are the buttons' own, the screen
 * being no touch screen.
 */
export const FOUR_SLOT_ITEMS: readonly { scan: number; column: 0 | 1; row: 0 | 1 }[] = [
  { scan: 8, column: 0, row: 0 },
  { scan: 2, column: 1, row: 0 },
  { scan: 9, column: 0, row: 1 },
  { scan: 34, column: 1, row: 1 },
];
/**
 * The order a page's tagged list **stores** the four scans in, which is not the order they fill:
 * bottom left, top left, bottom right, top right, with a scan the page does not bind left out. All 184
 * device list and device mode pages of the four arch 14 user configurations store theirs this way,
 * full ones as 9, 8, 34, 2 and a three item one as 9, 8, 2. The firmware searches a list for a tag, so
 * nothing here says the order matters to the remote; a composer keeps it so that a composed page is
 * one the compiler could have written. Section 285.
 */
export const FOUR_SLOT_STORED_ORDER: readonly number[] = [9, 8, 34, 2];
/**
 * Where an item's label sits, per cell, on a 128 pixel screen. A left label starts at x 3 and a right
 * one **ends** at 125, whatever its font, 448 of 448 and 414 of 414 on the corner pages of the four arch
 * 14 user configurations' device lists and device modes, where the start moves with the width. In the
 * top row a one line label sits at y 40 whatever its font, and a two line label starts at 25 with its
 * second line one font height below, which is 40 again in the usual font; the bottom row is 50 lower.
 */
export const FOUR_SLOT_LEFT_X = 3;
export const FOUR_SLOT_RIGHT_END = 125;
export const FOUR_SLOT_LABEL_Y: readonly [number, number] = [40, 90];
/**
 * The second layout a device list takes on arch 14: **two rows**, a device per row bound to both
 * buttons of that row, its label centred, at `x = floor((128 - width) / 2)` on 21 of 21 such labels
 * over the four arch 14 user configurations, and at y 35 and 79. One device list menu per
 * configuration is drawn this way, beside the corner ones. Section 285.
 */
export const TWO_ROW_LABEL_Y: readonly [number, number] = [35, 79];
export const FOUR_SLOT_SCREEN_WIDTH = 128;
/** The two scans of each row, top then bottom, as `FOUR_SLOT_ITEMS` places them. */
export const FOUR_SLOT_ROWS: readonly (readonly number[])[] = [0, 1].map((row) =>
  FOUR_SLOT_ITEMS.filter((item) => item.row === row).map((item) => item.scan));

/** The vertical bands the two rows' labels fall in: above the title bar's end and below the bar. */
const FOUR_SLOT_ROW_BANDS: readonly [number, number, number] = [16, 64, 112];
const FOUR_SLOT_COLUMN_SPLIT = 64;

/**
 * An arch 14 device list page's labels, paired with its rows by **cell** rather than by rank: two
 * labels share a line when they sit side by side, so the rank pairing arch 12 uses would read "TV
 * KPN" as one label. The lines of a cell join top to bottom, which is how a long name wraps.
 *
 * Corners only. The two row layout's labels are centred and would pair with its left hand rows
 * alone. A two row list reaches every device, as the corner lists do, and `deviceListRows` keeps the
 * first of the tied lists, which is a corner one on every configuration here because its mode number
 * is lower; so the case does not arise, by that tie order rather than by width, and is not read.
 */
function labelFourSlotRows(
  rows: DeviceListRow[], record: ModeRecord, drawn: ReturnType<typeof screenStrings>,
): void {
  record.pages.forEach((page, pageIndex) => {
    const lines = drawn.filter((one) => one.program === page.program
      && one.text.trim().length >= SHORTEST_USEFUL_LABEL);
    for (const row of rows) {
      if (row.page !== pageIndex) continue;
      const item = FOUR_SLOT_ITEMS.find((one) => one.scan === row.scan);
      if (item === undefined) continue;
      const inCell = lines
        .filter((one) => (one.x < FOUR_SLOT_COLUMN_SPLIT ? 0 : 1) === item.column
          && one.y >= (FOUR_SLOT_ROW_BANDS[item.row] as number)
          && one.y < (FOUR_SLOT_ROW_BANDS[item.row + 1] as number))
        .sort((a, b) => a.y - b.y);
      if (inCell.length > 0) row.label = inCell.map((one) => one.text.trim()).join(' ');
    }
  });
}

export function devices(c: Container): Device[] {
  const groups = irGroups(c) ?? [];
  const records = stateRecords(c);
  // The infrared devices, one per group, which the first three routes name. A device with no
  // group cannot be here, so those are collected separately and appended at the end.
  const out: (Device & { group: number })[] = groups.map((group, index) => ({
    group: index,
    codes: group.addresses.length,
    variables: [],
  }));
  const withoutInfrared: Device[] = [];
  const sent = infraredGroupsPerList(c);
  if (sent.size === 0 && groups.length === 0) return out;
  const groupsOf = (index: number): Set<number> => sent.get(index) ?? new Set<number>();

  // Route one: a device variable's transitions send that device's codes and nobody else's.
  const labels: string[] = [];
  const reaches: { label: string; group: number }[] = [];
  for (const variable of deviceVariables(c)) {
    if (!labels.includes(variable.device)) labels.push(variable.device);
    const reached = new Set<number>();
    for (const value of records?.[variable.index]?.values ?? []) {
      if (value.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      for (const group of groupsOf(value.operand)) reached.add(group);
    }
    if (reached.size !== 1) continue;
    reaches.push({ label: variable.device, group: [...reached][0] as number });
  }
  const { named, contested } = pairLabelsToGroups(reaches);
  for (const [label, group] of named) {
    const device = out[group];
    if (device === undefined) continue;
    device.name = label;
    device.source = 'names';
  }
  for (const variable of deviceVariables(c)) {
    const group = named.get(variable.device);
    if (group !== undefined) out[group]?.variables.push(variable.index);
  }

  // Route two: one label and one group left over pair by force.
  //
  // **A contested group is not "left over"**, it is a group whose evidence contradicts itself, so it
  // is excluded here as well as above. Dropping its label without this would put both back in the
  // free pools and let the forced pairing produce exactly the wrong name the exclusion exists to
  // prevent.
  const freeGroups = out.filter((device) => device.name === undefined && !contested.has(device.group));
  const freeLabels = labels.filter((label) => !named.has(label));
  if (freeGroups.length === 1 && freeLabels.length === 1) {
    const device = freeGroups[0] as Device & { group: number };
    device.name = freeLabels[0] as string;
    device.source = 'elimination';
    for (const variable of deviceVariables(c)) {
      if (variable.device === device.name) device.variables.push(variable.index);
    }
  }

  // Route three: the title of the device's own mode, for a group base slot 0 does not name at all.
  const stillFree = out.filter((device) => device.name === undefined && device.codes > 0);
  if (stillFree.length > 0) {
    const spokenFor = new Set(activityNames(c).map((one) => one.name));
    const titles = deviceModeTitles(c);
    for (const device of stillFree) {
      const candidates = [...(titles.get(device.group) ?? [])].filter((one) => !spokenFor.has(one));
      if (candidates.length !== 1) continue;
      device.name = candidates[0] as string;
      device.source = 'screen';
    }
  }
  // Route four, and the population fix: the device list itself. A row whose mode reaches exactly one
  // group ties that group to a mode and, where the first three routes named nothing, to the label the
  // row draws. A row whose mode reaches **no** group is a device with no infrared codes, which the
  // groups above cannot hold, so it is appended: the Wii of section 240.
  for (const row of deviceListRows(c)) {
    const reached = new Set<number>();
    for (const page of (modeRecords(c) ?? [])[row.mode]?.pages ?? []) {
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
        for (const group of groupsOf(entry.operand)) reached.add(group);
      }
    }
    if (reached.size === 1) {
      const device = out[[...reached][0] as number];
      if (device === undefined) continue;
      if (device.mode === undefined) device.mode = row.mode;
      if (device.name === undefined && row.label !== undefined) {
        device.name = row.label;
        device.source = 'list';
      }
    } else if (reached.size === 0 && !withoutInfrared.some((device) => device.mode === row.mode)) {
      // A mode with no codes on its pages can still belong to a device that has codes: the Harmony
      // 600's Chromecast has a group and a mode whose one page binds nothing, section 285, and it
      // was appended a second time as `GChromeca..` the moment arch 14 rows were read. So the label
      // names it first, where exactly one unmoded device carries it, a trailing `..` being the
      // screen's own elision of a name too long for its cell. A name spells a space as `_`, which a
      // label does not, so the two are compared with the underscores read as spaces. **Fitted to one
      // case**: two rows in the corpus reach no group, this one and a Wii on `compiled_protocols_3`
      // that names nothing and falls through, and a screen does not always mark an elision, one
      // calibration configuration cutting `Panasonic_Blu-ray_Player` to `Panasonic Blu-ray` with no
      // dots, so an unmarked cut is not matched.
      const stem = row.label?.endsWith('..') ? row.label.slice(0, -2) : row.label;
      const spoken = (name: string): string => name.replaceAll('_', ' ');
      const named = stem === undefined ? [] : out.filter((device) => device.mode === undefined
        && device.name !== undefined
        && (spoken(device.name) === row.label
          || (stem !== row.label && spoken(device.name).startsWith(stem))));
      if (named.length === 1) {
        (named[0] as (typeof out)[number]).mode = row.mode;
        continue;
      }
      withoutInfrared.push({
        codes: 0,
        variables: [],
        mode: row.mode,
        ...(row.label === undefined ? {} : { name: row.label, source: 'list' as const }),
      });
    }
  }
  return [...out, ...withoutInfrared];
}

/**
 * The top row a mode draws, for every mode whose own keys address exactly one device.
 *
 * A device's mode is where its buttons live, so the modes worth looking at are the ones whose pages
 * bind keys that send one group's codes and nothing else. **This is a weak route and the calibration
 * says why**: run against the devices route one already names, the top row is the label on arch 9 and
 * arch 14 and is a command name on arch 8 and arch 12, which draw no title. So it is used only where
 * nothing else reaches, and only when it leaves one candidate.
 */
export function deviceModeTitles(c: Container): Map<number, Set<string>> {
  const out = new Map<number, Set<string>>();
  const sent = infraredGroupsPerList(c);
  const drawn = screenStrings(c, characterMap(c));
  for (const mode of modeRecords(c) ?? []) {
    const reached = new Set<number>();
    for (const page of mode.pages) {
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
        for (const group of sent.get(entry.operand) ?? []) reached.add(group);
      }
    }
    if (reached.size !== 1) continue;
    const texts = mode.pages.flatMap((page) =>
      drawn.filter(
        (one) =>
          one.program === page.program && one.text.trim().length >= SHORTEST_USEFUL_LABEL,
      ),
    );
    if (texts.length === 0) continue;
    const top = Math.min(...texts.map((one) => one.y));
    const group = [...reached][0] as number;
    const acc = out.get(group) ?? new Set<string>();
    for (const one of texts) if (one.y === top) acc.add(one.text.trim());
    out.set(group, acc);
  }
  return out;
}

/** One infrared code: which device it goes to, and which of that device's codes it is. */
export interface InfraredCode {
  /** Index into base slot 5's group array, so the device. */
  group: number;
  /** Index into that group's own record array. */
  code: number;
}

/**
 * Which codes each base slot 10 action list sends, in the order it sends them.
 *
 * `0x7D` is the only instruction that names a device, section 33, so this is the whole of it, plus
 * `0x7F` because a list may hand the work to another. **Order is kept** because a list is a macro: an
 * activity's start sends several codes and which comes first is part of what it does.
 *
 * Shared rather than derived twice. `devices` uses it to tie a state variable to a group,
 * `deviceModeTitles` to tie a screen to one, `activities` to say which devices an activity drives and
 * `keyCodes` to say what a button sends. Two copies of one walk is the state that precedes two
 * diverging ones.
 *
 * A list that sends nothing is absent rather than empty, so a caller can tell "sends no codes" from
 * "no such list".
 */
export function infraredCodesPerList(c: Container): Map<number, InfraredCode[]> {
  const lists = c.actionLists();
  const out = new Map<number, InfraredCode[]>();
  if (lists === undefined) return out;
  // Each list gets its own walk with its own visited set. **Not a shared cache**: a nested walk stops
  // at whatever the outer one had already visited, so its answer is only correct in that context, and
  // memoising it would let a list inherit a truncated result from whoever reached it first. That is
  // the bug of section 126, which only arch 14 could show, because its send sits one list down.
  const walk = (index: number, seen: Set<number>): InfraredCode[] => {
    const found: InfraredCode[] = [];
    if (seen.has(index) || lists[index] === undefined) return found;
    seen.add(index);
    for (const instruction of lists[index] as { opcode: number; operand: number }[]) {
      if (instruction.opcode === SEND_INFRARED) {
        found.push({
          group: instruction.operand >> INFRARED_GROUP_SHIFT,
          code: instruction.operand & 0xff,
        });
      } else if (instruction.opcode === ACTION_LIST_INDEX_OPCODE) {
        found.push(...walk(instruction.operand, seen));
      }
    }
    return found;
  };
  lists.forEach((_, index) => {
    const found = walk(index, new Set());
    if (found.length > 0) out.set(index, found);
  });
  return out;
}

/** The same, reduced to the set of devices each list talks to. */
export function infraredGroupsPerList(c: Container): Map<number, Set<number>> {
  const out = new Map<number, Set<number>>();
  for (const [index, codes] of infraredCodesPerList(c)) {
    out.set(index, new Set(codes.map((one) => one.group)));
  }
  return out;
}

/** What a button does: the codes it sends, in order, and where it is. */
export interface KeyCode {
  /**
   * Which kind of tagged list the binding is in.
   *
   * **Both matter and for a while this only had the first.** A `page` binding belongs to a screen,
   * which is where a soft key lives. A `set` binding belongs to a base slot 9 handler set, which is
   * the key map an activity installs, and that is where the hard keys are: the volume keys of the
   * bench Harmony One are in its activities' sets and in no mode page at all.
   */
  where: 'page' | 'set';
  /** Index into `modePages` or into base slot 9's addresses, according to `where`. */
  index: number;
  /** The tagged list's key code: an event type in `0xC0` and a scan code in `0x3F`. Section 17. */
  tag: number;
  /**
   * The event type: 0 none, 1 release, 2 press, 3 repeat.
   *
   * **A code sending binding is a press, with seventeen exceptions in the corpus and they are all
   * type 0**, tags 1, 2 and 5 in a base slot 9 set, which are that set's enter and leave handlers
   * rather than keys at all. Nothing sends a code on a release or on a repeat, anywhere.
   */
  event: number;
  /** The scan code alone. Only a key when `event` is not 0. */
  scan: number;
  /** The codes the binding sends, in the order the action list sends them. */
  codes: InfraredCode[];
}

/**
 * Every button binding in the config that sends infrared, and what it sends.
 *
 * This is the button map an interface shows for a device or for a running activity, and it is the last
 * hop of section 126: a page's tagged list binds a key to a base slot 10 list and the list's `0x7D`
 * instructions name the device and the code. **A binding may send several**, 85 of 3106 across the
 * corpus, which is a macro and why the order is kept.
 *
 * Two properties hold on every container here and both are worth knowing before building on this.
 * **A code is sent on the press**, 4431 of 4448 bindings, and the seventeen that are not are event type
 * 0 in a base slot 9 set, tags 1, 2 and 5, which are its enter and leave handlers rather than keys.
 * Nothing sends a code on a release or on a repeat. And most bindings send nothing at all, because
 * navigation and screen switching are bindings too.
 *
 * **A code carries no name of its own**, since an infrared record is a stream of durations and an index
 * in its group, so a label for a button comes from the screen where a screen draws one. This used to
 * end "and from nowhere for a hard key"<!--superseded-->, and section 133 is where that stopped being
 * true: the durations decode back into the bit frame the device sees, `irframe.ts`, and a frame can be
 * matched against a catalogue of named commands. Thirty two buttons of a Harmony One and thirty six of
 * a Harmony 600 are named in `reference/button-maps.md` that way, with nothing written anywhere.
 *
 * **That route is not available from inside this function**, which is why the return value still has a
 * number and no name: it needs the catalogue and the button maps of the account that generated the
 * config, so it works on a config we had made and not on one somebody contributed.
 */
export function keyCodes(c: Container): KeyCode[] {
  const codes = infraredCodesPerList(c);
  const out: KeyCode[] = [];
  const collect = (where: 'page' | 'set', index: number, list: number): void => {
    for (const entry of taggedList(c, list)?.entries ?? []) {
      if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      const sent = codes.get(entry.operand);
      if (sent === undefined) continue;
      out.push({
        where,
        index,
        tag: entry.tag,
        event: entry.tag >> KEY_EVENT_SHIFT,
        scan: entry.tag & SCAN_CODE_MASK,
        codes: sent,
      });
    }
  };
  modePages(c).forEach((page, index) => collect('page', index, page.list));
  (handlerSets(c)?.addresses ?? []).forEach((address, index) => collect('set', index, address));
  return out;
}

/** What a base slot 9 entry is for, which is one of three things and not one of two. */
export type HandlerSetRole = 'unselected' | 'activity' | 'idle';

/**
 * Every base slot 9 entry with what it is for, which settles what the table corresponds to.
 *
 * `docs/config-format.md` recorded this as not established and offered "devices and activities
 * together" as the reading the counts support. It is not: a device never has an entry, and the count
 * is a fixed per model prefix plus one entry per activity plus exactly one more. Section 272.
 *
 * * **`unselected`**: an entry no `0x1F` in the configuration ever selects. These are a contiguous
 *   prefix in all fifteen user configurations, 7 entries long on arch 8 and arch 12 (Harmony One),
 *   5 on arch 14 (Harmony 600 and 700) and 4 on arch 9 (Harmony 525), and the length does not move
 *   with the number of devices or activities.
 * * **`activity`**: the key map one activity installs while it runs, which is what `activities`
 *   already reports as its `set`.
 * * **`idle`**: the one remaining entry. There is exactly one in every user configuration here, it is
 *   always selected, and it always carries an enter handler as an activity's does. **What installs it
 *   and when is not established**, so the name says where it sits in the count and not what it does.
 */
export function handlerSetRoles(c: Container): HandlerSetRole[] {
  const sets = handlerSets(c);
  if (sets === undefined) return [];
  const selected = new Set<number>();
  for (const list of c.actionLists() ?? []) {
    for (const instruction of list ?? []) {
      if (instruction.opcode !== SELECT_BINDING_SET) continue;
      if ((instruction.operand & SELECT_BINDING_SET_MASK) !== SELECT_BINDING_SET_MASK) continue;
      selected.add(instruction.operand & 0xff);
    }
  }
  const byActivity = new Set(activityBindings(c).map((one) => one.set));
  return sets.addresses.map((_, index) => {
    if (!selected.has(index)) return 'unselected';
    return byActivity.has(index) ? 'activity' : 'idle';
  });
}

/** One device's own map: the keypad it takes over in device mode, and the screen pages beside it. */
export interface DeviceModeMap {
  /** The device, as an index into base slot 5's group array. */
  group: number;
  /** The base slot 6 mode it is, which is what the device list enters for this device. */
  mode: number;
  /**
   * The keypad bindings, from the **mode record's own** tagged list rather than a page's.
   *
   * The tag is the whole key code, an event type in `0xC0` and a scan code in `0x3F`, exactly as
   * base slot 9 spells one. These are physical keys: the scan codes here and the ones a page binds
   * are disjoint populations on arch 9, 12 and 14, section 271.
   */
  keypad: KeyCode[];
  /** The same for every page of that mode, which is device mode's screen and is usually the larger half. */
  screen: KeyCode[];
  /** How many pages those screen bindings are spread over. */
  pages: number;
}

/**
 * Device mode's own map, per device: the map the remote installs when somebody picks a device.
 *
 * **This closes section 151's open question and refutes what it left standing.** That section
 * measured base slot 9 and found that every keypad map sending an infrared code is installed by an
 * activity, and concluded that no configuration here holds a map for device mode. Base slot 9 is
 * the wrong place to have looked: a device's map is a **base slot 6 mode record's own tagged list**,
 * the one section 52 reads through the back pointer beside the entry, and the firmware consults it
 * on every key press. Section 271.
 *
 * The mode is picked as the one whose maps are largest for this device, and that choice is checked
 * two ways rather than trusted: it is unique in all 62 device groups of the corpus that have codes,
 * it sends **only** that device in all 62, and on arch 12 (Harmony One), where the drawn device list
 * names a mode by an entirely separate route, the two agree 8 times out of 8.
 *
 * A device with no infrared codes is absent, because a map that sends nothing cannot be found this
 * way; the Harmony 600 configuration has one such device.
 */
export function deviceModeMaps(c: Container): DeviceModeMap[] {
  const codes = infraredCodesPerList(c);
  const records = modeRecords(c);
  if (records === undefined) return [];

  // A mode's own bindings and its pages', reduced to the devices each half addresses. Built once
  // for every mode, because the pick below is a maximum over all of them per device.
  const read = (list: number, where: 'page' | 'set', index: number): KeyCode[] => {
    const out: KeyCode[] = [];
    for (const entry of taggedList(c, list)?.entries ?? []) {
      if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      const sent = codes.get(entry.operand);
      if (sent === undefined) continue;
      out.push({
        where,
        index,
        tag: entry.tag,
        event: entry.tag >> KEY_EVENT_SHIFT,
        scan: entry.tag & SCAN_CODE_MASK,
        codes: sent,
      });
    }
    return out;
  };
  const groupsOf = (bindings: readonly KeyCode[]): Set<number> =>
    new Set(bindings.flatMap((one) => one.codes.map((sent) => sent.group)));

  let firstPage = 0;
  const surveyed = records.map((record, mode) => {
    const at = firstPage;
    firstPage += record.pages.length;
    const keypad = read(record.start, 'set', mode);
    const screen = record.pages.flatMap((page, k) => read(page.list, 'page', at + k));
    return { mode, keypad, screen, groups: groupsOf([...keypad, ...screen]) };
  });

  const out: DeviceModeMap[] = [];
  for (const group of irGroups(c)?.map((_, index) => index) ?? []) {
    // Only the modes that carry a keypad map are candidates. A screen only mode addressing this
    // device is an activity's page, which serves several devices at once and would win on size.
    const mine = surveyed.filter((one) => one.keypad.length > 0 && one.groups.has(group));
    if (mine.length === 0) continue;
    const size = (one: (typeof surveyed)[number]): number => one.keypad.length + one.screen.length;
    const largest = Math.max(...mine.map(size));
    const top = mine.filter((one) => size(one) === largest);
    if (top.length !== 1) continue;
    const found = top[0] as (typeof surveyed)[number];
    if (found.groups.size !== 1) continue;
    out.push({
      group,
      mode: found.mode,
      keypad: found.keypad,
      screen: found.screen,
      pages: (records[found.mode] as ModeRecord).pages.length,
    });
  }
  return out;
}

/** An activity, with the devices it drives and the key map it installs. */
export interface Activity extends ActivityName {
  /** The base slot 9 set the chain selects: the activity's own key map while it runs. Section 39. */
  set: number;
  /** The devices it addresses, by infrared group, ascending. */
  devices: number[];
}

/**
 * The activities, with what each one actually does.
 *
 * `activityNames` says which key starts an activity and what it is called; this adds which **devices**
 * it drives, which is the other half of what an interface shows. The route is the base slot 9 set the
 * starting chain selects, section 120: that set is the key map the activity installs, so the devices
 * its bindings send to are the devices the activity uses. An activity in the corpus drives one to three
 * of them.
 *
 * The union is over the whole set rather than over the start sequence alone, deliberately: an activity
 * that sends the volume to a receiver is using that receiver whether or not it switched it on.
 */
export function activities(c: Container): Activity[] {
  const codes = infraredCodesPerList(c);
  const sets = handlerSets(c);
  const bindings = new Map(activityBindings(c).map((one) => [one.activity, one.set]));
  return activityNames(c).map((one) => {
    const set = bindings.get(one.activity);
    const groups = new Set<number>();
    if (set !== undefined) {
      for (const entry of taggedList(c, sets?.addresses[set] as number)?.entries ?? []) {
        for (const sent of codes.get(entry.operand) ?? []) groups.add(sent.group);
      }
    }
    return { ...one, set: set ?? -1, devices: [...groups].sort((a, b) => a - b) };
  });
}

/** Everything an interface needs to show a config, in one object. */
export interface Inventory {
  /** The architecture the config states, section 20, which is the only place it says so. */
  architecture?: number;
  /** When the config was built, from base slot 3. On arch 12 this is also what the clock is set to. */
  builtAt?: string;
  devices: Device[];
  activities: Activity[];
  /** The value `CurrentActivityState` holds when no activity is running. */
  idle?: number;
}

/**
 * The state variables the firmware owns, by index, section 130.
 *
 * **Not a guess from their ranges**: every one of them is `first` equal to the corresponding field of
 * the config's own build timestamp, in all 21 containers of the corpus, with `second` equal to the
 * field's maximum. Section 74 had already read three of them out of the action list language, where
 * opcode `0x07` band `0xF8` steps a date held in variables 3, 5 and 6, and this says which is which
 * and adds the other four.
 *
 * The weekday's zero is a Saturday, which is not a convention picked to make the numbers fit: base slot
 * 3's own day of week byte is days since 1 January 2000 modulo 7, section 21, and that day was a
 * Saturday. Two records, two encodings, one epoch.
 *
 * **A writer must stamp these, not copy them**, the same rail as base slot 3's timestamp, section 111.
 * A config carried over with its old values sets the remote's clock to the moment the old config was
 * generated.
 *
 * **The clock is not read out of base slot 3 at all**, section 138: the firmware seeds state variable `n`
 * from record `n`'s `first`, and on arch 12 variable `n` lives at RAM `0x108 + n`, so the clock at
 * `0x108` to `0x10E` **is** records 0 to 6. Base slot 3 is the epoch it subtracts against to work out how
 * long ago the config was built. The rail does not move, because both records get stamped by a save.
 *
 * **The block runs to 12 and not to 6.** Indices 7 to 12 carry exactly one `first`/`second` pair per
 * architecture across all 21 containers and base slot 0 names none of them, and four of their maxima
 * agree with bytes measured on a connected Harmony One by a route with no shared code. They are listed
 * here so that a writer refuses to reuse them; the ones with a meaning say which architecture it was read
 * on, because arch 9 states different maxima for the same indices and nothing establishes that it puts
 * the same things there.
 */
export const FIRMWARE_STATE_VARIABLES: Readonly<Record<number, string>> = {
  0: 'second',
  1: 'minute',
  2: 'hour',
  3: 'day of the month',
  4: 'day of the week, where 0 is a Saturday',
  5: 'month, zero based',
  6: 'year since 2000',
  // Firmware owned by the same evidence as the clock, fixed per architecture and named by no config.
  // Sections 111 and 103 measured 8, 9, 10 and 11 on a Harmony One and read their level counts out of
  // the firmware, which is where the meanings come from and why they carry that scope.
  7: 'firmware reserved, meaning unread',
  8: 'display light band on arch 12, four levels',
  9: 'battery gauge on arch 12, eight levels',
  10: 'saved display light state on arch 12',
  11: 'cached display light level on arch 12',
  12: 'firmware reserved, meaning unread',
};

/**
 * The highest index the firmware owns, so a writer can refuse the whole block in one test.
 *
 * Section 138. Thirteen, not seven, is the block **common to every architecture**: on arch 9 index 13 is
 * where its configs start naming a variable through base slot 0 and its firmware's literal 13 sits. Section 284 found the
 * block reaching 17 on the other three, so a writer asks `firmwareStateVariableMax` below.
 */
export const FIRMWARE_STATE_VARIABLE_MAX = 12;

/**
 * The highest index the firmware owns, per architecture: what a writer refuses, section 284.
 *
 * `FIRMWARE_STATE_VARIABLE_MAX` above is the block common to every architecture, and it was read as
 * the block on all of them until section 284 measured 13 to 17 separately. On arch 8 (Harmony 880 and
 * 885), arch 12 (Harmony One) and arch 14 (Harmony 600, 650 and 700) those five carry one `first` and
 * `second` per architecture in every container, safe mode ones included, with a single exception at 14
 * on arch 12 where safe mode states its own; base slot 0 names none of them; and the firmware's
 * alternative fill starts at 18 on the Harmony One, 600, 650, 700, 880 and 885 images, as the checksum
 * that gates the seeder does on the Harmony One and arch 14. The firmware also stores into some of them
 * directly, 13, 15, 16 and 17 on the Harmony One, the 880 and the 885, all five on the 700, and 13, 16
 * and 17 on the 650 and 600, and into none above 17 but bytes of data that decode as code. Section
 * 138's cut at 12 came from arch 9 (Harmony 525), where its configurations name 13 upward and its own
 * seeder compares the index against the literal 13.
 *
 * An architecture not listed gets the widest block, since refusing a variable that turns out to be free
 * costs a composer nothing and writing one the firmware owns costs a device that silently misbehaves.
 * Arch 10 (Harmony 890 and 895) is not listed because nothing here reads its state table.
 */
export const FIRMWARE_STATE_VARIABLE_MAX_BY_ARCHITECTURE: Readonly<Record<number, number>> = {
  8: 17,
  9: 12,
  12: 17,
  14: 17,
};

/** The highest firmware owned index on `architecture`, the widest known block when it is unlisted. */
export function firmwareStateVariableMax(architecture: number | undefined): number {
  const stated = architecture === undefined ? undefined : FIRMWARE_STATE_VARIABLE_MAX_BY_ARCHITECTURE[architecture];
  return stated ?? Math.max(...Object.values(FIRMWARE_STATE_VARIABLE_MAX_BY_ARCHITECTURE));
}

/**
 * A screen variant's conditions in words, one per branch the program took.
 *
 * **The name is the point.** A variant is a list of switch arms, and "arm 1 of 2 at state 35" tells a
 * person nothing, while `PS3_Power = 1` tells them exactly when the screen looks like that. Base slot 0
 * names the state variables, section 77, so the two readings meet here.
 *
 * Only some variables are named: `one_config` has 46 base slot 13 records and 12 names, so an unnamed
 * one is shown by its index rather than invented. That is the same rule `VERSION_FIELDS` follows in the
 * bench instrument, and for the same reason.
 */
export function describeChoices(c: Container, choices: readonly ScreenChoice[]): string[] {
  const names = new Map(stateVariables(c).map((one) => [one.index, one.label]));
  return choices.map((choice) => {
    const name = names.get(choice.variable)
      ?? FIRMWARE_STATE_VARIABLES[choice.variable]
      ?? `state variable ${choice.variable}`;
    const when = choice.value !== undefined
      ? `= ${choice.value}`
      : `in ${choice.from} to ${choice.to}`;
    return `${name} ${when}`;
  });
}

/**
 * The whole inventory of a config, composed.
 *
 * **Here so that a caller does not have to know the order.** Naming a device needs the infrared groups,
 * the state variables, the action lists and, for three devices in the corpus, the screen text; naming an
 * activity needs the touch hit map on arch 12 and the modes elsewhere. An application that assembled
 * that itself would be a second copy of the composition, and the first thing to drift.
 */
export function inventory(c: Container): Inventory {
  const out: Inventory = { devices: devices(c), activities: activities(c) };
  if (c.architecture !== undefined) out.architecture = c.architecture;
  if (c.builtAt !== undefined) out.builtAt = c.builtAt;
  const idle = idleActivityValue(c);
  if (idle !== undefined) out.idle = idle;
  return out;
}

/**
 * The scan codes this config's screens label, meaning its soft keys.
 *
 * **Derived rather than tabulated**, section 128, because the container states it: a mode page's tagged
 * list belongs to a screen, so a scan bound there is a key that screen labels, and a base slot 9 set
 * belongs to a running activity, so a scan bound there is a key on the keypad. The closure is that the
 * two are **disjoint**: across the corpus arch 9 (Harmony 525), arch 12 (Harmony One) and arch 14
 * (Harmony 600 and 700) share not one scan between the two, and arch 8 (Harmony 880) shares exactly
 * one. The census is 8 scans on arch 8, 5 on arch 9, 8 on arch 12 and 4 on arch 14, and it is per
 * architecture rather than per config: six arch 8 configs agree exactly, as do four arch 12 ones and
 * three arch 14 ones. Two independent agreements, both partial and both worth having: arch 12's eight
 * are section 125's touch codes bar the two side keys, and arch 9's include the four that
 * `reference/silhouettes/h525.svg` narrows its soft keys to by a route through the firmware.
 */
export function softKeyScans(c: Container): number[] {
  const found = new Set<number>();
  for (const scans of pageScans(c)) for (const scan of scans) found.add(scan);
  return [...found].sort((a, b) => a - b);
}

/**
 * The scan codes each mode page binds, in page order, whatever the binding does.
 *
 * **Not the same population as `keyCodes`**, and the difference has bitten twice: `keyCodes` only
 * reports a binding that ends in an infrared code, so a key that starts an activity or opens another
 * menu is absent from it. Anything asking "which pages are there and what do they bind" wants this,
 * or it silently loses every activity page. Section 129.
 */
export function pageScans(c: Container): number[][] {
  return modePages(c).map((page) => {
    const found = new Set<number>();
    for (const entry of taggedList(c, page.list)?.entries ?? []) {
      if (entry.opcode === ACTION_LIST_INDEX_OPCODE) found.add(entry.tag & SCAN_CODE_MASK);
    }
    return [...found].sort((a, b) => a - b);
  });
}

/**
 * A screen row: the two keys beside it, and the band of pixel rows its label is drawn in.
 *
 * **Measured, not laid out by eye**, section 128. Every architecture but arch 12 (Harmony One) puts its
 * soft keys in two columns down the side of the screen, and the row a key belongs to is fixed by the
 * hardware rather than stated by the config. The bands come from where the labels of activities are
 * actually drawn, which section 121 attributes without using geometry at all: on arch 8 (Harmony 880)
 * four rows at pixel 42, 74, 106 and 138, on arch 14 (Harmony 600 and 700) two at 35 and 79, and on
 * arch 9 (Harmony 525) two at 13 and 35. An item may wrap onto a second line, so a band is roughly a
 * row and a half rather than a line.
 *
 * **Which key is the left one is settled per architecture and not assumed.** On arch 8 the activity
 * route names all eight keys of one page, four at x 3 and four at x 70 to 97, so the left column is
 * `5, 6, 7, 8`. On arch 9 the same route names three keys, and it puts the **larger** scan of each pair
 * on the left, so the 525's left column is the odd one; that also answers what
 * `reference/silhouettes/h525.svg` deliberately left open, which of matrix columns 6 and 7 is the left.
 * On arch 14 the route only ever names centred labels, so the side comes from behaviour instead: the
 * help screens draw "No" at x 5 and "Yes" at x 97, and scan 9's action list is the one that differs per
 * screen while scan 34's is identical on all of them, which is what a retry and a finish look like.
 */
export interface ScreenRow {
  left: number;
  right: number;
  /** Pixel rows `[from, to)`, which is where this row's label and its wrapped continuation are drawn. */
  from: number;
  to: number;
}

export const SCREEN_ROWS: Readonly<Record<number, readonly ScreenRow[]>> = {
  8: [
    { left: 5, right: 45, from: 36, to: 62 },
    { left: 6, right: 46, from: 68, to: 94 },
    { left: 7, right: 48, from: 100, to: 126 },
    { left: 8, right: 44, from: 132, to: 158 },
  ],
  9: [
    { left: 39, right: 38, from: 8, to: 30 },
    { left: 31, right: 30, from: 30, to: 52 },
  ],
  14: [
    { left: 2, right: 8, from: 29, to: 55 },
    { left: 9, right: 34, from: 73, to: 99 },
  ],
};

/**
 * The gap in pixels that separates the two columns of a row from one wrapped label's own indentation.
 *
 * A row holds either one item across the screen or one per column, and the two cases have to be told
 * apart from the drawing: 24 pixels is comfortably above the few pixels a second line is indented by
 * and comfortably below the 50 to 90 that separate two columns in every sample here.
 */
const COLUMN_GAP = 24;

/**
 * How far below a label's line its wrapped continuation can start, in pixels.
 *
 * A band is wide enough to hold a two line label and that means it is also wide enough to catch a line
 * of something else. The two are told apart by the line pitch: a continuation sits one text line below
 * its own first line, 11 pixels on arch 9 (Harmony 525) and 14 on arch 8 (Harmony 880) and arch 14
 * (Harmony 600 and 700), where the menu footers that share these bands sit 19 or more below. Four of
 * the five labels that disagreed with the activity route before this test were a footer's first line
 * joined onto an item's name.
 */
const LINE_GAP = 16;

/** A drawn label attributed to a button. */
export interface KeyLabel {
  /** Index into `modePages`. Only a page binding can have a label; a set binding is a hard key. */
  index: number;
  scan: number;
  /** The text, with a wrapped label's rows joined by a space. */
  text: string;
  /**
   * How it was attributed, and the two are not equally strong.
   *
   * `touch` is stated: base slot 17 gives the key's rectangle and the label is the text inside it, so
   * it exists on arch 12 (Harmony One) alone. `row` is `SCREEN_ROWS`, whose band is measured and whose
   * side is established per architecture, so it is a reading of the hardware's layout rather than of
   * the config. Neither is the chain of section 121, which names an activity's key without geometry of
   * any kind: that is `activityNames`, and it is what these two are calibrated against rather than a
   * third route here, since it agrees with them on 62 of the 63 keys where both have an opinion.
   */
  source: 'touch' | 'row';
}

/** Reading order: down the screen, then across it. */
function inReadingOrder(a: ScreenString, b: ScreenString): number {
  return a.y === b.y ? a.x - b.x : a.y - b.y;
}

/**
 * The label drawn for each button that a screen labels, keyed by `<page>:<scan>`.
 *
 * This is what turns "device 0, code 29" into a word on a page, and there is no other source for it:
 * an infrared record has no name, section 126, so a button's name is the text beside it or nothing.
 *
 * **A label is attributed to the nearest region, not to the first one that contains it.**
 * `touchOwner` implements the firmware's rule, which is the first rectangle containing the point, and
 * that is right for a touch and wrong for a label: a label's `x` is where its first glyph starts, so a
 * long string in the right hand column starts inside the left hand rectangle where the two overlap.
 * Nearest centre fixes seven labels in `one_config` that first match put on the wrong key, and it is
 * the same seven either way, since a region a label is wholly inside is also the nearest.
 *
 * **Off arch 12 the route is `SCREEN_ROWS`**, and the rule it replaced is worth stating because it fits
 * the counts and is wrong: the k-th soft key in ascending scan order taking the k-th row of text from
 * the top. On the 600's own activity menu that pairs four keys with four rows perfectly and gets two of
 * them wrong, because scans 2 and 8 both belong to the first row and 9 and 34 both to the second, while
 * the outer two rows of text are a title and a footer. A key belongs to a **place** on the screen, and
 * the places are two columns of rows, so that is what is measured.
 */
/**
 * Which label owns which infrared group, given what each device variable reaches.
 *
 * Extracted from `devices` so the refusal below has a caller that can reach it: no container in the
 * corpus contests a group, 0 in nineteen, so the branch is unreachable through `devices` and a rail
 * nobody can trigger is a rail nobody has tested. Same move as `eraseBoundsFor` in `packages/usb`.
 *
 * **A contested group names nobody, and it is not "left over" either.** The rule used to be a bare
 * `continue`, which kept the group for the first label and left the second **free**, so the forced
 * pairing in `devices` could hand that label an unrelated leftover group and return it as
 * `source: 'elimination'`. That reads as a weaker but real answer where the evidence in fact
 * contradicts itself, and it is where a wrong device name would reach FreeHarmony. So both the
 * label and the group are withdrawn, and `contested` is what keeps the group out of the free pool.
 * Section 139.
 */
export function pairLabelsToGroups(
  reaches: readonly { label: string; group: number }[],
): { named: Map<string, number>; contested: Set<number> } {
  const named = new Map<string, number>();
  const contested = new Set<number>();
  for (const { label, group } of reaches) {
    const already = named.get(label);
    // Two variables of one device must agree, and two devices must not claim one group.
    if (already !== undefined && already !== group) continue;
    if (already === undefined && [...named.values()].includes(group)) {
      contested.add(group);
      continue;
    }
    named.set(label, group);
  }
  for (const group of contested) {
    for (const [label, mine] of [...named]) if (mine === group) named.delete(label);
  }
  return { named, contested };
}

/**
 * The scan codes one mode page binds, which is the population both label routes answer for.
 *
 * One derivation rather than two: the row route computed it and the touch route did not, which is
 * how the touch route came to label keys a page has not got. Section 139.
 */
function boundScans(c: Container, page: ModePage): Set<number> {
  return new Set(
    (taggedList(c, page.list)?.entries ?? [])
      .filter((entry) => entry.opcode === ACTION_LIST_INDEX_OPCODE)
      .map((entry) => entry.tag & SCAN_CODE_MASK),
  );
}

export function keyLabels(c: Container): Map<string, KeyLabel> {
  const out = new Map<string, KeyLabel>();
  const pages = modePages(c);
  const map = characterMap(c);
  const drawn = screenStrings(c, map);
  pages.forEach((page, index) => {
    const texts = drawn
      .filter((one) => one.program === page.program && one.text.trim().length > 0)
      .sort(inReadingOrder);
    if (texts.length === 0) return;
    const areas = touchPageOf(c, page)?.areas;
    if (areas === undefined || areas.length === 0) return;
    // **Only scans this page actually binds**, which the row route below has always required and
    // this one did not: a region holding text got a label whether or not the page has a key there.
    // 292 of `one_config`'s 1103 entries named a scan its page does not bind. Inert for the bench,
    // which looks up by bound scan, and not inert for a consumer that **iterates** the map, which
    // is what a `Map` invites: it would get labels for keys that page has not got. Section 139.
    const bound = boundScans(c, page);
    if (bound.size === 0) return;
    // The stated route. Group the page's strings by the region each belongs to, then join the strings
    // of one region in reading order, which is what a label wrapped onto a second line is.
    const perArea = new Map<number, ScreenString[]>();
    for (const one of texts) {
      const inside = areas.filter((area) => panelInside(area, one));
      const nearest = nearestArea(inside, one);
      if (nearest === undefined) continue;
      const acc = perArea.get(nearest.code) ?? [];
      acc.push(one);
      perArea.set(nearest.code, acc);
    }
    for (const [scan, found] of perArea) {
      if (!bound.has(scan)) continue;
      out.set(`${index}:${scan}`, {
        index,
        scan,
        text: found.map((one) => one.text.trim()).join(' '),
        source: 'touch',
      });
    }
  });
  // The row route, for every architecture whose keys sit beside the screen rather than on it. A row's
  // band is read for the text it holds, which is split into columns only where there is a real gap,
  // since a label wrapped onto a second line is indented by a few pixels and a second column is not.
  const rows = SCREEN_ROWS[c.architecture ?? -1] ?? [];
  if (rows.length > 0) {
    pages.forEach((page, index) => {
      const bound = boundScans(c, page);
      if (bound.size === 0) return;
      const texts = distinct(drawn.filter((one) => one.program === page.program
        && one.text.trim().length > 0));
      for (const row of rows) {
        if (!bound.has(row.left) && !bound.has(row.right)) continue;
        const on = texts.filter((one) => one.y >= row.from && one.y < row.to).sort(inReadingOrder);
        if (on.length === 0) continue;
        const columns = byColumn(on);
        // One item across the row belongs to both its keys, since either of them chooses it. Two items
        // belong to one key each, and that is the only place the side of the row matters.
        const [first, second] = columns.map(contiguous);
        for (const [scan, found] of [[row.left, first], [row.right, second ?? first]] as const) {
          if (!bound.has(scan) || found === undefined || found.length === 0) continue;
          const key = `${index}:${scan}`;
          if (out.has(key)) continue;
          out.set(key, {
            index,
            scan,
            text: found.map((one) => one.text.trim()).join(' '),
            source: 'row',
          });
        }
      }
    });
  }
  return out;
}

/**
 * A column's lines from its first one down, stopping at the first line that is too far below the last.
 *
 * This is what keeps a menu's footer out of the bottom row's label: a wrapped second line is one text
 * line below, a footer is a line and a half or more.
 */
function contiguous(on: readonly ScreenString[]): ScreenString[] {
  const out: ScreenString[] = [];
  for (const one of on) {
    const last = out[out.length - 1];
    if (last !== undefined && one.y - last.y > LINE_GAP) break;
    out.push(one);
  }
  return out;
}

/** The same string drawn twice at the same place is one label, which is what a page's copies are. */
function distinct(texts: readonly ScreenString[]): ScreenString[] {
  const seen = new Set<string>();
  return texts.filter((one) => {
    const key = `${one.x}:${one.y}:${one.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * A row's strings split into its columns, in reading order, one entry per column.
 *
 * The split is the widest gap between adjacent x positions, taken only if it is at least `COLUMN_GAP`,
 * so a two line label whose second line starts a few pixels in stays one item and a left and a right
 * item do not. A row never holds three, which is why this returns one entry or two.
 */
function byColumn(on: readonly ScreenString[]): ScreenString[][] {
  const xs = [...new Set(on.map((one) => one.x))].sort((a, b) => a - b);
  let at = -1;
  let widest = 0;
  for (let i = 1; i < xs.length; i += 1) {
    const gap = (xs[i] as number) - (xs[i - 1] as number);
    if (gap <= widest) continue;
    widest = gap;
    at = i;
  }
  if (widest < COLUMN_GAP || at < 0) return [[...on]];
  const split = xs[at] as number;
  return [on.filter((one) => one.x < split), on.filter((one) => one.x >= split)];
}

/** Whether a drawn string's own start point is inside a rectangle, in panel coordinates. */
function panelInside(area: TouchArea, one: ScreenString): boolean {
  const point = panelPoint(one.x, one.y);
  return (
    point.x >= area.x &&
    point.x < area.x + area.width &&
    point.y >= area.y &&
    point.y < area.y + area.height
  );
}

/** Of the rectangles a point is inside, the one whose centre is closest to it. */
function nearestArea(areas: readonly TouchArea[], one: ScreenString): TouchArea | undefined {
  const point = panelPoint(one.x, one.y);
  let best: TouchArea | undefined;
  let bestDistance = Infinity;
  for (const area of areas) {
    const dx = area.x + area.width / 2 - point.x;
    const dy = area.y + area.height / 2 - point.y;
    const distance = dx * dx + dy * dy;
    if (distance >= bestDistance) continue;
    bestDistance = distance;
    best = area;
  }
  return best;
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
const POWER_PROPERTY = 'Power';

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

/**
 * The handler set entry that runs an activity's start sequence.
 *
 * A base slot 9 set's tagged list carries key bindings, whose tags are key codes with an event type
 * in the top two bits (section 17), and a handful of entries below `0x80` that are not keys. Three
 * of those appear in this corpus, tags 1, 2 and 5, and **tag 1 is the start sequence**: over 21
 * containers it holds 735 of the 917 quantity instructions any low tag reaches and every power on
 * delay `powerOnInstructions` finds, and reading one out shows it switching each device on, setting
 * the inputs, switching off what the activity does not want and finally writing
 * `CurrentActivityState`.
 *
 * The other two are named by what they do rather than guessed at. Tag 5 exists on the same 92 set
 * entries and re-sends **only** the input commands, with no power change, which is the shape of a
 * "fix it" chain; tag 2 writes state variables and reaches 5 sends in the whole corpus. Neither is
 * read further here, because neither carries a power on delay.
 */
export const ACTIVITY_START_TAG = 1;

/** One thing an activity's start sequence puts on the send queue, in order. */
export interface QueuedStep {
  /** A code going out, or a quantity for the group named beside it. */
  kind: 'send' | 'delay';
  /** The infrared group, which is the operand's high byte for both opcodes. */
  group: number;
  /** The code number for a send, tenths of a second for a delay. */
  value: number;
}

/**
 * What an activity's start sequence pushes onto the send queue, in the order it pushes it.
 *
 * `set` is a base slot 9 handler set index, as `activityBindings` reports it. The walk follows
 * `0x7F` into nested lists and follows a state variable write into the base slot 13 transition it
 * triggers, which is where the sends actually live: the start list writes `TV_Power = 1` and the
 * code goes out because that variable's 0 to 1 transition runs a list, section 86.
 *
 * **Depth and revisits are bounded and that is not a detail.** A transition can write a variable
 * whose transition writes the first one back, so the walk carries a visited set per branch and a
 * depth ceiling. Without them a config that does that would hang the reader rather than misreport.
 */
export function activityStartSteps(c: Container, set: number): QueuedStep[] {
  const lists = c.actionLists();
  const records = stateRecords(c);
  const sets = handlerSets(c);
  if (lists === undefined || records === undefined || sets === undefined) return [];
  const address = sets.addresses[set];
  if (address === undefined) return [];

  const steps: QueuedStep[] = [];
  const walk = (index: number, seen: Set<number>, depth: number): void => {
    const list = lists[index];
    if (list === undefined || seen.has(index) || depth > WALK_DEPTH) return;
    seen.add(index);
    for (const instruction of list) {
      if (instruction.opcode >= STATE_WRITE_BASE) {
        // A write to a state variable, which runs whatever that value's transition names.
        const variable = instruction.opcode - STATE_WRITE_BASE;
        for (const value of records[variable]?.values ?? []) {
          if (value.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
          if (value.to !== instruction.operand) continue;
          walk(value.operand, new Set(), depth + 1);
        }
      } else if (instruction.opcode === SEND_INFRARED) {
        steps.push({ kind: 'send', group: instruction.operand >>> 8, value: instruction.operand & 0xff });
      } else if (instruction.opcode === IR_QUANTITY_OPCODE) {
        steps.push({ kind: 'delay', group: instruction.operand >>> 8, value: instruction.operand & 0xff });
      } else if (instruction.opcode === ACTION_LIST_INDEX_OPCODE) {
        walk(instruction.operand, seen, depth + 1);
      }
    }
  };
  for (const entry of taggedList(c, address)?.entries ?? []) {
    if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
    if (entry.tag !== ACTIVITY_START_TAG) continue;
    walk(entry.operand, new Set(), 0);
  }
  return steps;
}

/** How deep `activityStartSteps` follows a chain before giving up. */
const WALK_DEPTH = 8;

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
