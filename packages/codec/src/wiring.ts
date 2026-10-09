/**
 * The firmware's own wiring, built from a description: `todo-compile-650.md` 10.2, section 347.
 *
 * Section 318's frame lays a container out from pieces and section 324 builds the state variables.
 * What every arch 14 configuration carries besides its devices, activities and screens is the part
 * that connects the remote's own events to the configuration: the log area's three numbers, the event
 * map from a status code to its screen, the parameter block, the timers, base slot 8's leading list of
 * start up entry points, base slot 9's five fixed entries and the one left over, and the action lists
 * those name. Until this module all of it came out of a Logitech compile.
 *
 * **What is generated**, each measured on the thirteen compiles section 312 lists:
 *
 * * **The log area**, sixteen thousand eight byte records from `0x1E0000` to `0x200000`, the same on
 *   all thirteen. Only the Harmony One's firmware writes to its log area, section 47; no arch 14 image
 *   here has been found to.
 * * **The event map**: thirty firmware status codes, code `k` to mode `N + k`, and `N` is the number of
 *   screens the firmware owns at the front of base slot 6, fourteen on the Harmony 600 and 650 and
 *   nineteen on the Harmony 700. So it follows from the model.
 * * **The parameter block**, nine groups whose values are one set per model on the thirteen.
 * * **The firmware's timers** and the lists they queue: the screen light pair, the tick that follows
 *   it, the return to "USB Connected" after a learned command, and on the Harmony 700 a four frame
 *   cycle. Their durations are constants but the screen light's, which is MyHarmony's `GlowTime`.
 * * **Base slot 8's leading list**, the eleven start up entry points the firmware queues by index,
 *   section 286, whose screens are the firmware's own.
 * * **Base slot 9's entries 0 to 4**, which nothing selects, section 272: their tags, flags and order,
 *   which is `compilerTagOrder`'s slot order with ties measured per model, and their bindings.
 * * **The leftover entry**, the key map installed when no activity runs, section 329: its four
 *   bindings and the three lists it names, brackets included.
 * * **The front of base slot 10**: the lists the compiler emits first, up to the clock's hour list,
 *   section 324, in an order this module generates, so their indices are generated too.
 * * **The shared lists every key press runs**: the two lists base slot 9's entries 2 and 3 bind every
 *   press to, the one entries 0 and 4 bind their events to, the stack the boot list pushes, and the
 *   list the lead calls when the remote goes quiet. Entry 2 is the first the key walk consults,
 *   section 333, so these run under every activity.
 *
 * **What is carried**, the description: which list, mode, variable, value map or base slot 9 entry a
 * generated structure names when that thing is not itself generated here. Every list the generated
 * lists call is named by index and is somebody else's; the program behind them is a tree of
 * conditionals on the firmware's own variables and on every device, and how much of it there is per
 * configuration is section 347's measurement, not this module's work. Also carried: three settings,
 * the screen light's time, the tilt sensor and the Remote Assistant, sections 292, 345 and 346, which
 * are the configuration's own; which base slot 9 entry each activity key selects, or that it is
 * empty, section 314; and a device's own timer, a power timer writing one variable, with its place in
 * the table, since what orders the table is not established.
 *
 * Arch 14 only, the Harmony 600, 650 and 700. Read only towards hardware: the result is pieces.
 */
import { u16, u24, u8 } from './bytes.ts';
import { ACTION_LIST_TABLE_SLOT, BINDING_SLOT, actionListBytes } from './gspm.ts';
import { Writer } from './emit.ts';
import type { ContainerLayout, ContainerPiece, PieceRef } from './frame.ts';
import { KEY_EVENT_PRESS, KEY_EVENT_SHIFT, tagSlotOrder } from './inventory.ts';
import type { ModeZeroModel } from './modezero.ts';
import { KEYPAD_FIRST_SCAN, KEYPAD_LAST_SCAN } from './modezero.ts';
import { EVENT_MAP_SLOT, HANDLER_TABLE_SLOT, LOG_AREA_SLOT } from './sections.ts';
import { PARAMETER_SLOT, TIMER_KIND_SCHEDULED, TIMER_RECORD_LENGTH, TIMER_SLOT } from './tables.ts';

/** A refusal, named so a caller can tell a bad description from a bug. */
export class WiringError extends Error {}

/** The models this builds for, by their skin, section 131. The European 650 and 700 are not measured. */
export type WiringModel = ModeZeroModel;
export const WIRING_SKINS: ReadonlyMap<number, WiringModel> = new Map([
  [66, 'harmony-700'],
  [71, 'harmony-600'],
  [72, 'harmony-650'],
  [73, 'harmony-600'],
]);


/**
 * The screens the firmware owns at the front of base slot 6, in mode order, named after what they
 * draw. The blank ones draw nothing the text reader decodes; the Harmony 700's first four are the
 * frames its four cycling timers enter in turn, and `batteryBlank`, `upgradeBlank` and `learnBlank` are
 * named by their neighbours. **Their count is the event map's base**, 13 of 13.
 */
export const FIRMWARE_SCREENS: Readonly<Record<WiringModel, readonly string[]>> = {
  'harmony-600': [
    'addActivityHere', 'addActivities', 'usbConnected', 'lowBattery', 'batteryBlank', 'insertBatteries',
    'unableToCharge', 'updateSuccessful', 'upgradeSuccessful', 'upgradeBlank', 'readyToLearn',
    'commandReceived', 'learnBlank', 'terminateEntry',
  ],
  'harmony-650': [
    'addActivityHere', 'addActivities', 'usbConnected', 'lowBattery', 'batteryBlank', 'insertBatteries',
    'unableToCharge', 'updateSuccessful', 'upgradeSuccessful', 'upgradeBlank', 'readyToLearn',
    'commandReceived', 'learnBlank', 'terminateEntry',
  ],
  'harmony-700': [
    'frame0', 'frame1', 'frame2', 'frame3', 'addActivityHere', 'addActivities', 'usbConnected', 'lowBattery',
    'pleaseCharge', 'batteryBlank', 'insertBatteries', 'unableToCharge', 'updateSuccessful',
    'upgradeSuccessful', 'upgradeBlank', 'readyToLearn', 'commandReceived', 'learnBlank', 'terminateEntry',
  ],
};

/** How many status codes the event map carries, keys 0 to 29, section 36. */
export const EVENT_COUNT = 30;

/**
 * The log area on every arch 14 user configuration: capacity in eight byte records, then the region.
 * Logitech's client declares `0x0E0000` to `0x100000` instead, which is the safe mode image's, section
 * 206; every configuration here states this one.
 */
export const LOG_AREA = { capacity: 16384, start: 0x1e0000, limit: 0x200000 } as const;

/**
 * The parameter block's nine groups per model, as `u16` values. One set per model on the thirteen; the
 * Harmony 600 and 650 differ in group 3 alone and the Harmony 700 in groups 3 and 5. What groups 2, 3
 * and 8 hold on arch 14 is not read, and no setting was seen to change any of them.
 */
const PARAMETERS_COMMON = {
  g0: [44],
  g1: [3, 5, 10, 32],
  g2: [44],
  g4: [96, 98, 308, 310, 768, 770],
  g6: [2025, 2075, 2375, 2425, 2475, 2525, 3300, 3300, 3300, 3300, 3300, 3300, 3300, 3300],
  g7: [0],
  g8: [1800, 10980],
} as const;
const GROUP5_600_650 = [2025, 2075, 2100, 2125, 2200, 2525, 3300, 3300, 3300, 3300, 3300, 3300, 3300, 3300];
export const PARAMETER_VALUES: Readonly<Record<WiringModel, readonly (readonly number[])[]>> = {
  'harmony-600': [PARAMETERS_COMMON.g0, PARAMETERS_COMMON.g1, PARAMETERS_COMMON.g2, [1, 3, 5, 32],
    PARAMETERS_COMMON.g4, GROUP5_600_650, PARAMETERS_COMMON.g6, PARAMETERS_COMMON.g7, PARAMETERS_COMMON.g8],
  'harmony-650': [PARAMETERS_COMMON.g0, PARAMETERS_COMMON.g1, PARAMETERS_COMMON.g2, [10, 20, 8, 32],
    PARAMETERS_COMMON.g4, GROUP5_600_650, PARAMETERS_COMMON.g6, PARAMETERS_COMMON.g7, PARAMETERS_COMMON.g8],
  'harmony-700': [PARAMETERS_COMMON.g0, PARAMETERS_COMMON.g1, PARAMETERS_COMMON.g2, [3, 5, 10, 32],
    PARAMETERS_COMMON.g4, PARAMETERS_COMMON.g6, PARAMETERS_COMMON.g6, PARAMETERS_COMMON.g7, PARAMETERS_COMMON.g8],
};

/**
 * One instruction of a generated list, with what it names left symbolic.
 *
 * `call` names a list, `enter` a mode, `write` a state variable (`0x80 + v` with a constant value),
 * `map` a value map evaluated on a variable (`0x72`, map in the high byte), `select` a base slot 9 entry
 * (`0x1F 0xFF00 | entry`) and `start` a timer (`0x1F 0xEB00 | timer`), sections 73, 140 and 280. A
 * symbol is either generated here, the firmware's screens, the front lists and the timers, or the
 * description's.
 */
export type WiringInstruction =
  | { readonly op: number; readonly operand: number }
  | { readonly call: string }
  | { readonly enter: string }
  | { readonly write: string; readonly value: number }
  | { readonly map: string; readonly on: string }
  | { readonly select: string }
  | { readonly start: string };

/** The settings a configuration carries, MyHarmony's names in the comments. */
export interface WiringSettings {
  /** `GlowTime`, seconds the screen stays lit, section 292. */
  glowTime: number;
  /** `TiltSensor`: the flag `3F F101` where Logitech puts it, section 346. */
  tiltSensor: boolean;
  /** `RemoteAssistant`: the quiet list's and the idle resume's call into the Assistant's gate, section 345. */
  remoteAssistant: boolean;
  /**
   * The boot list's `3F F715` after `3F F632`: on the five Harmony 700 compiles made in 2026 and on neither
   * of the two from 2021 and 2023, nor on any Harmony 600 or 650 compile. Not a MyHarmony setting that
   * is known; whether the firmware version the service compiles for or the service's own generation
   * decides it is not established, so it is carried, and refused on a model that has never shown it.
   */
  bootStep: boolean;
}

/** A device's own timer, carried whole, and the index it has in the table. */
export interface DeviceTimer {
  at: number;
  duration: number;
  instruction: { opcode: number; operand: number };
}

export interface WiringSpec {
  model: WiringModel;
  settings: WiringSettings;
  /**
   * The three activity keys of base slot 9's entry 1, by scan, section 314: the entry each selects,
   * or `null` for an empty key, which calls a front list entering the "add an Activity" screen.
   */
  activityKeys: Readonly<Record<number, number | null>>;
  deviceTimers: readonly DeviceTimer[];
  /** What the generated structures name and do not generate, by the names `wiringSymbols` lists. */
  lists: Readonly<Record<string, number>>;
  modes: Readonly<Record<string, number>>;
  variables: Readonly<Record<string, number>>;
  maps: Readonly<Record<string, number>>;
  entries: Readonly<Record<string, number>>;
}

export interface BuiltWiring {
  logArea: ContainerPiece;
  eventMap: ContainerPiece;
  leadingList: ContainerPiece;
  parameterTable: ContainerPiece;
  parameterGroups: ContainerPiece[];
  timerTable: ContainerPiece;
  timerRecords: ContainerPiece[];
  /** Base slot 9 index to the entry built for it: 0 to 4 and the leftover entry. */
  entries: Map<number, ContainerPiece>;
  /** Base slot 10 index to the list built for it: the front and the shared lists. */
  lists: Map<number, ContainerPiece>;
  /** How many lists the front holds, which is the index the clock's hour list takes, section 324. */
  frontLength: number;
  /**
   * Per built piece, the byte offsets that came from the description or a setting rather than from the
   * generator. Everything else in a piece is the generator's, which is what the blind control tests.
   */
  described: Map<ContainerPiece, number[]>;
}

// ---------------------------------------------------------------------------------------------------
// The catalogue: every generated structure per model, as templates over symbols.
// ---------------------------------------------------------------------------------------------------

/** `0x07 0xFFFD` pushes the current mode before entering another, `0xFFFC` pops it, section 311. */
const PUSH_MODE = { op: 0x07, operand: 0xfffd } as const;
const POP_MODE = { op: 0x07, operand: 0xfffc } as const;
/** The tilt sensor's flag, section 346. */
const TILT_FLAG = { op: 0x3f, operand: 0xf101 } as const;
/** The Harmony 700's later boot step, `WiringSettings.bootStep`. */
const BOOT_STEP = { op: 0x3f, operand: 0xf715 } as const;
/** Where it goes in the boot list, and so where a reader looks for it. */
const BOOT_STEP_AT = 2;
/** `0x1F 0xFB01`, load 1 into the byte register before a call that tests it, section 140. */
const LOAD_ONE = { op: 0x1f, operand: 0xfb01 } as const;
const LOAD_ZERO = { op: 0x1f, operand: 0xfb00 } as const;

/** The screen key presses a shared list of their own serves in entry 2: scans 1 to 5, 7 to 9, 11, 34, 35. */
const ELEVEN_KEY_SCANS: ReadonlySet<number> = new Set([1, 2, 3, 4, 5, 7, 8, 9, 11, 34, 35]);
/** The activity keys of entry 1: Watch a Movie, Watch TV and Listen to Music, section 314. */
export const ACTIVITY_KEY_SCANS = [1, 5, 7] as const;

/** A press tag for a scan, the key table's split, section 17. */
const press = (scan: number): number => (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan;
/** Every scan of the keypad, 1 to 54. */
const keypadScans = (): number[] =>
  Array.from({ length: KEYPAD_LAST_SCAN - KEYPAD_FIRST_SCAN + 1 }, (_, k) => KEYPAD_FIRST_SCAN + k);

interface EntryTemplate {
  /** Base slot 9 index, or the entry symbol it is found under. */
  index: number | string;
  wide: boolean;
  bindings: Map<number, WiringInstruction>;
  /** The measured order of the tags that share a slot, first stored first. */
  ties: ReadonlyMap<string, readonly [number, number]>;
}

interface TimerTemplate {
  name: string;
  /** Seconds, or the screen light's setting. */
  duration: number | 'glowTime';
  instruction: WiringInstruction;
}

interface Catalogue {
  screens: readonly string[];
  lists: Map<string, WiringInstruction[]>;
  front: string[];
  lead: WiringInstruction[];
  entries: EntryTemplate[];
  timers: TimerTemplate[];
}

const tie = (a: number, b: number): [string, readonly [number, number]] => [[a, b].sort((x, y) => x - y).join(','), [a, b]];

/**
 * Every generated structure for one model and one set of settings and activity keys.
 *
 * The list names are this module's. Where a list's purpose is read it is named after it; otherwise
 * after where it is bound: `entry1.0x26` is entry 1's binding of tag `0x26`. Names with a dot after a
 * list's own name are the description's lists that list calls.
 */
function catalogue(model: WiringModel, settings: WiringSettings, activityKeys: Readonly<Record<number, number | null>>): Catalogue {
  const seven = model === 'harmony-700';
  const lists = new Map<string, WiringInstruction[]>();
  const tilt = (body: WiringInstruction[]): WiringInstruction[] => (settings.tiltSensor ? [...body, TILT_FLAG] : body);

  // The shared lists every key press runs, entries 0 and 2 to 4 and the boot list's stack, section 333.
  lists.set('boot', [
    { op: 0x3f, operand: 0xf00a }, { op: 0x3f, operand: 0xf632 },
    ...(settings.bootStep ? [BOOT_STEP] : []),
    { op: 0x1f, operand: 0xfe01 }, { op: 0x1f, operand: 0xfefe }, { op: 0x1f, operand: 0xfefd },
    { op: 0x1f, operand: 0xfefc }, { op: 0x1f, operand: 0xfe02 }, { call: 'events' },
  ]);
  lists.set('events', [LOAD_ONE, { call: 'events.test' }]);
  lists.set('everyKey', [LOAD_ONE, { call: 'everyKey.test' }]);
  lists.set('elevenKeys', [LOAD_ONE, { call: 'elevenKeys.test' }]);
  // The list the lead names twice, entry points 6 and 10, and the tour's last Exit, section 286.
  // On the Harmony 700 it opens with the call entry 1's events 0x27, 0x10 and 0x1F make too.
  lists.set('quiet', tilt([
    ...(seven ? [{ call: 'entry1.0x27.shared' }] : []),
    { call: 'everyKey' },
    settings.remoteAssistant ? { call: 'assistantGate' } : { map: 'locationMap', on: 'location' },
  ]));

  // The leftover entry's lists, section 329: `S` and `F` bracket both.
  lists.set('idleEnter', [
    { call: 'idleEnter.first' }, { map: 'idleEnterMap', on: 'location' }, { write: 'start', value: 1 },
    { write: 'flag', value: 0 }, { call: 'idleEnter.second' }, { map: 'idleMap', on: 'location' },
    { write: 'start', value: 0 },
  ]);
  lists.set('idleResume', [
    { write: 'start', value: 1 }, { write: 'flag', value: 0 },
    settings.remoteAssistant ? { call: 'assistantGate' } : { map: 'locationMap', on: 'location' },
    { map: 'idleMap', on: 'location' }, { write: 'start', value: 0 },
  ]);
  lists.set('helpHold', [PUSH_MODE, { enter: 'delayFixing' }]);

  // The timers' lists.
  lists.set('lightOff', [{ op: 0x1f, operand: 0xe900 }, TILT_FLAG]);
  lists.set('lightOn', [{ op: 0x1f, operand: 0xe910 }, { call: 'lightTick' }]);
  lists.set('lightOnAgain', [{ op: 0x1f, operand: 0xe910 }, { call: 'lightTick' }]);
  lists.set('lightTick', [LOAD_ZERO, { call: 'lightTick.test' }]);
  if (seven) {
    lists.set('cycle1', [{ enter: 'frame1' }, { start: 'cycle2' }]);
    lists.set('cycle2', [{ enter: 'frame2' }, { start: 'cycle3' }]);
    lists.set('cycle3', [{ enter: 'frame3' }, { start: 'cycle0' }]);
    lists.set('cycle0', [{ enter: 'frame0' }, { start: 'cycle1' }]);
  }

  // The front, in the order the compiler emits it. First what the firmware's screens bind: the Harmony
  // 700's USB screen's leave handler, then the Low Battery screen's Exit.
  const front: string[] = [];
  const addFront = (name: string, body: WiringInstruction[]): void => {
    lists.set(name, body);
    front.push(name);
  };
  if (seven) addFront('usbLeave', [{ call: 'usbLeave.first' }, { call: 'usbLeave.second' }]);
  addFront('lowBatteryExit', [POP_MODE, { write: 'lowBattery', value: 0 }]);
  // The lead's four start up entry points, then the learned command's screen.
  addFront('start', [{ call: 'boot' }, { call: 'start.reset' }, { select: 'idle' }, { call: 'start.last' }]);
  addFront('startUsb', [{ call: 'boot' }, { enter: 'usbConnected' }]);
  addFront('startTour', [{ call: 'boot' }, { call: 'tour' }]);
  addFront('startUpgraded', [{ call: 'boot' }, { enter: 'upgradeSuccessful' }]);
  addFront('learned', [{ enter: 'commandReceived' }, { start: 'usbReturn' }]);

  // Entry 1: the firmware's events, the activity keys and a few screen keys, section 314.
  const entry1 = new Map<number, WiringInstruction | { front: WiringInstruction[] }>();
  if (seven) {
    entry1.set(0x23, { front: [{ call: 'entry1.0x23.first' }, { call: 'entry1.0x23.second' }, { call: 'everyKey' }] });
  }
  entry1.set(press(11), { op: 0x0f, operand: 0xffa0 });
  entry1.set(0x26, { front: [{ call: 'events' }, { call: 'everyKey' }, PUSH_MODE, { enter: 'usbConnected' }] });
  entry1.set(0x27, {
    front: seven
      ? [{ call: 'events' }, { call: 'everyKey' }, { call: 'entry1.0x27.shared' }, POP_MODE, { call: 'entry1.0x27.last' }]
      : [{ call: 'events' }, { call: 'everyKey' }, POP_MODE, { call: 'entry1.0x27.last' }],
  });
  if (seven) {
    entry1.set(0x24, { front: [{ call: 'entry1.0x24.first' }, { call: 'entry1.0x24.shared' }, { enter: 'unableToCharge' }, { call: 'everyKey' }] });
    entry1.set(0x25, { front: [{ op: 0x3f, operand: 0xf200 }, { call: 'entry1.0x24.shared' }, { call: 'entry1.0x25.third' }, { enter: 'batteryBlank' }, { call: 'everyKey' }] });
  }
  entry1.set(press(35), { op: 0x0f, operand: 0xffa1 });
  entry1.set(press(4), { front: [{ write: 'menuMarker', value: 0 }, { map: 'locationMap', on: 'location' }] });
  entry1.set(press(6), { call: 'entry1.0x86' });
  entry1.set(0x2d, { op: 0x07, operand: 0xfffa });
  entry1.set(0x10, {
    front: seven ? [{ call: 'entry1.0x27.shared' }, { call: 'entry1.0x10.second' }] : [{ call: 'entry1.0x10.first' }, { call: 'entry1.0x10.second' }],
  });
  entry1.set(0x30, {
    front: seven
      ? [{ call: 'entry1.0x30.first' }, { call: 'entry1.0x24.shared' }, { enter: 'insertBatteries' }, { call: 'everyKey' }]
      : [{ call: 'entry1.0x30.first' }, { enter: 'insertBatteries' }, { call: 'everyKey' }],
  });
  entry1.set(0x19, { op: 0x07, operand: 0xfff6 });
  if (seven) {
    entry1.set(0x1f, { front: [{ call: 'events' }, { call: 'everyKey' }, { call: 'entry1.0x27.shared' }] });
    entry1.set(0x1e, {
      front: [{ call: 'everyKey' }, { op: 0x3f, operand: 0xf200 }, { call: 'entry1.0x1e.third' }, { call: 'entry1.0x1e.fourth' }, { write: 'lowBattery', value: 0 }],
    });
  }
  for (const scan of ACTIVITY_KEY_SCANS) {
    const entry = activityKeys[scan];
    if (entry === undefined) throw new WiringError(`activity key ${scan} is neither an entry nor empty`);
    entry1.set(press(scan), entry === null ? { front: [PUSH_MODE, { enter: 'addActivityHere' }] } : { select: `activityKey${scan}` });
  }
  const entry1Ties = new Map(seven ? [tie(0x81, 0xa3), tie(0x86, 0x2d)] : [tie(0xa3, 0x81), tie(0x86, 0x2d)]);
  const entry1Bindings = new Map<number, WiringInstruction>();
  for (const tag of tagSlotOrder([...entry1.keys()], entry1Ties)) {
    const binding = entry1.get(tag)!;
    if ('front' in binding) {
      const name = ACTIVITY_KEY_SCANS.some((scan) => press(scan) === tag) ? `emptyKey${tag & 0x3f}` : `entry1.0x${tag.toString(16)}`;
      addFront(name, binding.front);
      entry1Bindings.set(tag, { call: name });
    } else {
      entry1Bindings.set(tag, binding);
    }
  }
  // Entry 2's one binding that is not a key press closes the front. It exists only with the tilt
  // sensor on, list and binding both, so `0x17` is read as the tilt event, section 347.
  if (settings.tiltSensor) addFront('entry2.0x17', [{ call: 'everyKey' }, TILT_FLAG]);

  const allPresses = (to: (scan: number) => WiringInstruction): Map<number, WiringInstruction> =>
    new Map(keypadScans().map((scan) => [press(scan), to(scan)]));
  const entry2 = allPresses((scan) => ({ call: ELEVEN_KEY_SCANS.has(scan) ? 'elevenKeys' : 'everyKey' }));
  if (settings.tiltSensor) entry2.set(0x17, { call: 'entry2.0x17' });
  const entry3 = allPresses(() => ({ call: 'everyKey' }));
  if (seven) entry3.set(0x1e, { op: 0x07, operand: 0xfffb });
  const events = (tags: number[]): Map<number, WiringInstruction> => new Map(tags.map((t) => [t, { call: 'events' }]));
  const none = new Map<string, readonly [number, number]>();

  const entries: EntryTemplate[] = [
    { index: 0, wide: true, bindings: events([0x1a, 0x1b, 0x1c, 0x1d]), ties: none },
    { index: 1, wide: false, bindings: entry1Bindings, ties: entry1Ties },
    { index: 2, wide: true, bindings: entry2, ties: new Map([tie(0x17, 0x9e)]) },
    { index: 3, wide: true, bindings: entry3, ties: new Map([tie(0x1e, 0x97)]) },
    { index: 4, wide: true, bindings: events([0x18, 0x19]), ties: none },
    {
      index: 'idle', wide: false, ties: none,
      bindings: new Map<number, WiringInstruction>([
        [0x01, { call: 'idleEnter' }], [0x05, { call: 'idleResume' }],
        [0x43, { map: 'helpRelease', on: 'location' }], [0xc3, { call: 'helpHold' }],
      ]),
    },
  ];

  const lead: WiringInstruction[] = [
    { enter: 'terminateEntry' }, { call: 'start' }, { call: 'startUsb' }, { call: 'startTour' },
    { call: 'startUpgraded' }, { enter: 'upgradeBlank' }, { call: 'quiet' }, { enter: 'readyToLearn' },
    { call: 'learned' }, { enter: 'learnBlank' }, { call: 'quiet' },
  ];

  const timers: TimerTemplate[] = [
    { name: 'lightOff', duration: 10, instruction: settings.tiltSensor ? { call: 'lightOff' } : { op: 0x1f, operand: 0xe900 } },
    ...(seven
      ? (['cycle1', 'cycle2', 'cycle3', 'cycle0'] as const).map((name) => ({ name, duration: 2, instruction: { call: name } }))
      : []),
    { name: 'lightOn', duration: 'glowTime', instruction: { call: 'lightOn' } },
    { name: 'lightTick', duration: 2, instruction: { call: 'lightTick' } },
    { name: 'lightOnAgain', duration: 10, instruction: { call: 'lightOnAgain' } },
    { name: 'usbReturn', duration: 3, instruction: { enter: 'usbConnected' } },
  ];
  if (!settings.tiltSensor) lists.delete('lightOff');

  return { screens: FIRMWARE_SCREENS[model], lists, front, lead, entries, timers };
}

// ---------------------------------------------------------------------------------------------------
// Symbols, and encoding an instruction with them.
// ---------------------------------------------------------------------------------------------------

type SymbolKind = 'lists' | 'modes' | 'variables' | 'maps' | 'entries' | 'timers';
type Symbols = Record<SymbolKind, Map<string, number>>;
const emptySymbols = (): Symbols => ({
  lists: new Map(), modes: new Map(), variables: new Map(), maps: new Map(), entries: new Map(), timers: new Map(),
});

/** The symbols an instruction names, with their kind. */
function namedBy(ins: WiringInstruction): [SymbolKind, string][] {
  if ('call' in ins) return [['lists', ins.call]];
  if ('enter' in ins) return [['modes', ins.enter]];
  if ('write' in ins) return [['variables', ins.write]];
  if ('map' in ins) return [['maps', ins.map], ['variables', ins.on]];
  if ('select' in ins) return [['entries', ins.select]];
  if ('start' in ins) return [['timers', ins.start]];
  return [];
}

function lookup(symbols: Symbols, kind: SymbolKind, name: string): number {
  const value = symbols[kind].get(name);
  if (value === undefined) throw new WiringError(`the description names no ${kind.slice(0, -1)} ${JSON.stringify(name)}`);
  return value;
}

function checkRange(what: string, value: number, max: number): number {
  if (!Number.isInteger(value) || value < 0 || value > max) throw new WiringError(`${what} ${value} is outside 0 to ${max}`);
  return value;
}

/**
 * An instruction's operand and opcode, and which of its three bytes the description decided: the
 * operand of a call, an enter, a map or a select when its symbol is not generated, the opcode of a
 * write when its variable is not. Offsets are 0 and 1 for the operand and 2 for the opcode.
 */
function encode(ins: WiringInstruction, symbols: Symbols, generated: Symbols): { operand: number; opcode: number; described: number[] } {
  const isGenerated = (kind: SymbolKind, name: string): boolean => generated[kind].has(name);
  if ('op' in ins) return { operand: ins.operand, opcode: ins.op, described: [] };
  if ('call' in ins) {
    return { operand: checkRange('a list index', lookup(symbols, 'lists', ins.call), 0xffff), opcode: 0x7f, described: isGenerated('lists', ins.call) ? [] : [0, 1] };
  }
  if ('enter' in ins) {
    return { operand: checkRange('a mode', lookup(symbols, 'modes', ins.enter), 0xffff), opcode: 0x7e, described: isGenerated('modes', ins.enter) ? [] : [0, 1] };
  }
  if ('write' in ins) {
    const v = checkRange('a written variable', lookup(symbols, 'variables', ins.write), 0x7f);
    return { operand: ins.value, opcode: 0x80 + v, described: [2] };
  }
  if ('map' in ins) {
    const m = checkRange('a value map', lookup(symbols, 'maps', ins.map), 0xff);
    const v = checkRange('a mapped variable', lookup(symbols, 'variables', ins.on), 0xff);
    return { operand: (m << 8) | v, opcode: 0x72, described: [0, 1] };
  }
  if ('select' in ins) {
    return { operand: 0xff00 | checkRange('an entry', lookup(symbols, 'entries', ins.select), 0xff), opcode: 0x1f, described: [0] };
  }
  return { operand: 0xeb00 | checkRange('a timer', lookup(symbols, 'timers', ins.start), 0xff), opcode: 0x1f, described: [] };
}

/** Read a template's symbols off the instruction it was encoded as, and only those bytes. */
function decode(ins: WiringInstruction, operand: number, opcode: number, symbols: Symbols, generated: Symbols): void {
  const take = (kind: SymbolKind, name: string, value: number): void => {
    if (generated[kind].has(name)) return;
    const had = symbols[kind].get(name);
    if (had !== undefined && had !== value) {
      throw new WiringError(`${kind.slice(0, -1)} ${JSON.stringify(name)} is ${had} in one place and ${value} in another`);
    }
    symbols[kind].set(name, value);
  };
  if ('call' in ins) take('lists', ins.call, operand);
  else if ('enter' in ins) take('modes', ins.enter, operand);
  else if ('write' in ins) take('variables', ins.write, opcode - 0x80);
  else if ('map' in ins) { take('maps', ins.map, operand >>> 8); take('variables', ins.on, operand & 0xff); }
  else if ('select' in ins) take('entries', ins.select, operand & 0xff);
}

const piece = (bytes: Uint8Array, owner: string, refs: PieceRef[] = []): ContainerPiece => ({ bytes, refs, owner });

/** An action list: `u8 count` then `{u16 operand; u8 opcode}`, section 26. */
function encodeList(body: readonly WiringInstruction[], symbols: Symbols, generated: Symbols): { bytes: Uint8Array; described: number[] } {
  if (body.length > 0xff) throw new WiringError(`a list of ${body.length} instructions is more than its count holds`);
  const described: number[] = [];
  const instructions = body.map((ins, k) => {
    const e = encode(ins, symbols, generated);
    for (const at of e.described) described.push(1 + 3 * k + at);
    return { operand: e.operand, opcode: e.opcode };
  });
  return { bytes: actionListBytes(instructions), described };
}

/** A tagged list in either form, section 52; every wide entry here carries flags 1. */
const WIDE_FLAGS = 1;
function encodeEntry(template: EntryTemplate, symbols: Symbols, generated: Symbols): { bytes: Uint8Array; described: number[] } {
  const order = orderOf(template);
  const stride = template.wide ? 5 : 4;
  const head = template.wide ? 2 : 1;
  const out = new Writer(head + stride * order.length);
  if (template.wide) out.u8(0).u8(order.length);
  else out.u8(order.length);
  const described: number[] = [];
  order.forEach((tag, k) => {
    if (template.wide) out.u8(WIDE_FLAGS);
    out.u8(tag);
    const e = encode(template.bindings.get(tag)!, symbols, generated);
    out.u16(e.operand).u8(e.opcode);
    for (const at of e.described) described.push(head + stride * k + stride - 3 + at);
  });
  return { bytes: out.bytes, described };
}

function orderOf(template: EntryTemplate): number[] {
  try {
    return tagSlotOrder([...template.bindings.keys()], template.ties);
  } catch (error) {
    if (error instanceof RangeError) throw new WiringError(error.message);
    throw error;
  }
}

// ---------------------------------------------------------------------------------------------------
// Building.
// ---------------------------------------------------------------------------------------------------

/** The symbols this module generates for a catalogue: the firmware's screens, the front, the timers. */
function generatedSymbols(cat: Catalogue, timerOrder: string[]): Symbols {
  const out = emptySymbols();
  cat.screens.forEach((name, k) => out.modes.set(name, k));
  cat.front.forEach((name, k) => out.lists.set(name, k));
  timerOrder.forEach((name, k) => { if (name !== '') out.timers.set(name, k); });
  return out;
}

/** The firmware's timers with the device timers at their places: a name per index, `''` for a device's. */
function timerOrder(cat: Catalogue, deviceTimers: readonly DeviceTimer[]): string[] {
  const total = cat.timers.length + deviceTimers.length;
  const slots: (string | undefined)[] = new Array(total);
  for (const one of deviceTimers) {
    checkRange('a device timer\'s place', one.at, total - 1);
    if (slots[one.at] !== undefined) throw new WiringError(`two device timers at ${one.at}`);
    slots[one.at] = '';
  }
  let next = 0;
  for (let k = 0; k < total; k += 1) if (slots[k] === undefined) slots[k] = cat.timers[next++]!.name;
  return slots as string[];
}

/**
 * The base slot 10 index this module generates for one of its front lists, for a structure built
 * elsewhere that calls it: the Low Battery screen's Exit, `lowBatteryExit`, and the Harmony 700's "USB
 * Connected" leave handler, `usbLeave`, both bound in the firmware's own screens, section 357. Refused
 * for a name the front does not hold for that model.
 */
export function wiringFrontIndex(spec: Pick<WiringSpec, 'model' | 'settings' | 'activityKeys'>, name: string): number {
  const index = catalogue(spec.model, spec.settings, spec.activityKeys).front.indexOf(name);
  if (index < 0) throw new WiringError(`a ${spec.model}'s front holds no list ${JSON.stringify(name)}`);
  return index;
}

/** The model a skin names, or a refusal. */
export function wiringModelOfSkin(skin: number): WiringModel {
  const model = WIRING_SKINS.get(skin);
  if (model === undefined) throw new WiringError(`skin ${skin} is not a Harmony 600, 650 or 700 measured here`);
  return model;
}

/**
 * Build the wiring from a description, as pieces `withWiring` puts in a layout.
 *
 * Refuses a glow time outside a timer's sixteen bits, an activity key that is neither, a device timer
 * outside the table or two at one place, a symbol the description lacks, and a value too wide for the
 * field it goes in.
 */
export function buildWiring(spec: WiringSpec): BuiltWiring {
  checkRange('a glow time', spec.settings.glowTime, 0xffff);
  if (spec.settings.bootStep && spec.model !== 'harmony-700') {
    throw new WiringError(`no ${spec.model} compile carries the boot list's 3F F715`);
  }
  const cat = catalogue(spec.model, spec.settings, spec.activityKeys);
  const order = timerOrder(cat, spec.deviceTimers);
  const generated = generatedSymbols(cat, order);
  const symbols = emptySymbols();
  for (const kind of Object.keys(symbols) as SymbolKind[]) for (const [k, v] of generated[kind]) symbols[kind].set(k, v);
  const fill = (kind: SymbolKind, given: Readonly<Record<string, number>>): void => {
    for (const [name, value] of Object.entries(given)) {
      if (generated[kind].has(name)) throw new WiringError(`${kind.slice(0, -1)} ${JSON.stringify(name)} is generated, not described`);
      symbols[kind].set(name, value);
    }
  };
  fill('lists', spec.lists);
  fill('modes', spec.modes);
  fill('variables', spec.variables);
  fill('maps', spec.maps);
  fill('entries', spec.entries);
  for (const scan of ACTIVITY_KEY_SCANS) {
    const entry = spec.activityKeys[scan];
    if (entry !== null && entry !== undefined) symbols.entries.set(`activityKey${scan}`, entry);
  }

  const described = new Map<ContainerPiece, number[]>();
  const made = (bytes: Uint8Array, owner: string, marks: number[], refs: PieceRef[] = []): ContainerPiece => {
    const p = piece(bytes, owner, refs);
    described.set(p, marks);
    return p;
  };

  // Base slot 2: capacity, then the region's two ends, which are addresses outside the container.
  const log = new Writer(8).u16(LOG_AREA.capacity).u24(0).u24(0);
  const logArea = made(log.bytes, 'slot-2-log', [], [{ at: 2, address: LOG_AREA.start }, { at: 5, address: LOG_AREA.limit }]);

  // Base slot 4: status code k enters the firmware screen after the model's own screens.
  const base = cat.screens.length;
  const event = new Writer(5 + 4 * EVENT_COUNT).u24(base).u16(EVENT_COUNT);
  for (let k = 0; k < EVENT_COUNT; k += 1) event.u8(k).u24(base + k);
  const eventMap = made(event.bytes, 'slot-4-event', []);

  // Base slot 8's leading list.
  const lead = encodeList(cat.lead, symbols, generated);
  const leadingList = made(lead.bytes, 'slot-8-list', lead.described);

  // Base slot 15.
  const groups = PARAMETER_VALUES[spec.model].map((values) => {
    const w = new Writer(1 + 2 * values.length).u8(values.length);
    for (const v of values) w.u16(v);
    return made(w.bytes, 'slot-15-group', []);
  });
  const ptable = new Writer(1 + 3 * groups.length).u8(groups.length);
  for (let k = 0; k < groups.length; k += 1) ptable.u24(0);
  const parameterTable = made(ptable.bytes, 'slot-15-table', [], groups.map((to, k) => ({ at: 1 + 3 * k, to, offset: 0 })));

  // Base slot 12: the firmware's timers and the device timers at their places.
  const byName = new Map(cat.timers.map((t) => [t.name, t]));
  let device = 0;
  const sortedDevice = [...spec.deviceTimers].sort((a, b) => a.at - b.at);
  const timerRecords = order.map((name) => {
    const w = new Writer(TIMER_RECORD_LENGTH).u8(TIMER_KIND_SCHEDULED);
    if (name === '') {
      const one = sortedDevice[device++]!;
      w.u24(checkRange('a device timer\'s duration', one.duration, 0xffffff));
      w.u16(checkRange('an operand', one.instruction.operand, 0xffff)).u8(checkRange('an opcode', one.instruction.opcode, 0xff));
      return made(w.bytes, 'slot-12-record', [1, 2, 3, 4, 5, 6]);
    }
    const t = byName.get(name)!;
    const marks: number[] = [];
    if (t.duration === 'glowTime') {
      w.u24(spec.settings.glowTime);
      marks.push(1, 2, 3);
    } else {
      w.u24(t.duration);
    }
    const e = encode(t.instruction, symbols, generated);
    w.u16(e.operand).u8(e.opcode);
    for (const at of e.described) marks.push(4 + at);
    // The opcode is what tells a firmware timer from a device's, so the description is read there.
    if (!marks.includes(6)) marks.push(6);
    return made(w.bytes, 'slot-12-record', marks);
  });
  const ttable = new Writer(1 + 3 * timerRecords.length).u8(timerRecords.length);
  for (let k = 0; k < timerRecords.length; k += 1) ttable.u24(0);
  const timerTable = made(ttable.bytes, 'slot-12-table', [], timerRecords.map((to, k) => ({ at: 1 + 3 * k, to, offset: 0 })));

  // Base slot 9's entries.
  const entries = new Map<number, ContainerPiece>();
  for (const template of cat.entries) {
    const index = typeof template.index === 'number' ? template.index : lookup(symbols, 'entries', template.index);
    const e = encodeEntry(template, symbols, generated);
    const marks = [...e.described];
    // Entry 1's activity keys: whether each selects or calls is the description's, read off the opcode.
    if (template.index === 1) {
      const order1 = orderOf(template);
      for (const scan of ACTIVITY_KEY_SCANS) marks.push(1 + 4 * order1.indexOf(press(scan)) + 3);
    }
    if (entries.has(index)) throw new WiringError(`base slot 9 entry ${index} is built twice`);
    entries.set(index, made(e.bytes, 'slot-9-list', marks));
  }

  // Base slot 10: the front at its generated indices, the shared lists at the description's.
  const lists = new Map<number, ContainerPiece>();
  for (const [name, body] of cat.lists) {
    const index = lookup(symbols, 'lists', name);
    const e = encodeList(body, symbols, generated);
    const marks = [...e.described];
    // The quiet list's second instruction says whether the Remote Assistant is on: read there.
    if (name === 'quiet') marks.push(1 + 3 * (spec.model === 'harmony-700' ? 2 : 1) + 2);
    // So does the boot list's third instruction, for the boot step.
    if (name === 'boot') marks.push(...[0, 1, 2].map((at) => 1 + 3 * BOOT_STEP_AT + at));
    if (lists.has(index)) throw new WiringError(`action list ${index} is built twice`);
    lists.set(index, made(e.bytes, 'slot-10-list', marks));
  }

  return {
    logArea, eventMap, leadingList, parameterTable, parameterGroups: groups, timerTable, timerRecords,
    entries, lists, frontLength: cat.front.length, described,
  };
}

// ---------------------------------------------------------------------------------------------------
// Reading a description back off a laid out container.
// ---------------------------------------------------------------------------------------------------

function tablePiece(layout: ContainerLayout, slot: number): ContainerPiece {
  const head = layout.sections[slot]?.head;
  if (head === undefined || head.length !== 1) throw new WiringError(`base slot ${slot}'s table is not one piece`);
  return head[0]!;
}

/** The pieces a counted pointer table names, in table order. */
function tableTargets(table: ContainerPiece): ContainerPiece[] {
  return [...table.refs].sort((a, b) => a.at - b.at).map((ref, k) => {
    if (!('to' in ref) || ref.offset !== 0) throw new WiringError(`entry ${k} of a table is not a piece of its own`);
    return ref.to;
  });
}

/**
 * Read a description back off a laid out arch 14 container, `takeApart`'s result.
 *
 * Reads the model off the skin, and then only the bytes `BuiltWiring.described` marks: the symbols
 * the generated structures name and do not generate, the three settings where they show, which timer
 * records are a device's, and how each activity key is bound. So a rebuild that equals the container
 * computed every other byte of these structures, which the blind control in `test/wiring.test.ts`
 * checks by overwriting them first.
 */
export function describeWiring(layout: ContainerLayout): WiringSpec {
  const model = wiringModelOfSkin(layout.skin);
  const listPieces = tableTargets(tablePiece(layout, ACTION_LIST_TABLE_SLOT));
  const entryPieces = tableTargets(tablePiece(layout, HANDLER_TABLE_SLOT));
  const timerPieces = tableTargets(tablePiece(layout, TIMER_SLOT));
  const instructionAt = (bytes: Uint8Array, at: number): { operand: number; opcode: number } => ({ operand: u16(bytes, at), opcode: u8(bytes, at + 2) });

  // The timers: a device's writes a variable, the firmware's do not, 13 of 13.
  const deviceTimers: DeviceTimer[] = [];
  const firmware: ContainerPiece[] = [];
  timerPieces.forEach((p, at) => {
    const ins = instructionAt(p.bytes, 4);
    if (ins.opcode >= 0x80) deviceTimers.push({ at, duration: u24(p.bytes, 1), instruction: ins });
    else firmware.push(p);
  });
  const tiltSensor = u8(firmware[0]!.bytes, 6) === 0x7f;

  // Entry 1's activity keys, at the places the generated order puts them.
  const probe = catalogue(model, { glowTime: 0, tiltSensor, remoteAssistant: true, bootStep: false }, { 1: null, 5: null, 7: null });
  const entry1 = probe.entries.find((e) => e.index === 1)!;
  const order1 = orderOf(entry1);
  const activityKeys: Record<number, number | null> = {};
  for (const scan of ACTIVITY_KEY_SCANS) {
    const ins = instructionAt(entryPieces[1]!.bytes, 1 + 4 * order1.indexOf(press(scan)) + 1);
    activityKeys[scan] = ins.opcode === 0x7f ? null : ins.operand & 0xff;
  }

  // The lead names the quiet list, whose second instruction says whether the Assistant is on.
  const leadPiece = tablePiece(layout, BINDING_SLOT);
  const quietIndex = u16(leadPiece.bytes, 1 + 3 * probe.lead.findIndex((ins) => 'call' in ins && ins.call === 'quiet'));
  const gateAt = probe.lists.get('quiet')!.findIndex((ins) => 'call' in ins && ins.call === 'assistantGate');
  const remoteAssistant = u8(listPieces[quietIndex]!.bytes, 1 + 3 * gateAt + 2) === 0x7f;

  const glowAt = probe.timers.findIndex((t) => t.duration === 'glowTime');
  // The boot list is the first thing the start entry point calls, and the start is a front list.
  const startIndex = probe.front.indexOf('start');
  const bootIndex = u16(listPieces[startIndex]!.bytes, 1);
  const step = instructionAt(listPieces[bootIndex]!.bytes, 1 + 3 * BOOT_STEP_AT);
  const bootStep = step.opcode === BOOT_STEP.op && step.operand === BOOT_STEP.operand;
  const settings: WiringSettings = { glowTime: u24(firmware[glowAt]!.bytes, 1), tiltSensor, remoteAssistant, bootStep };
  const cat = catalogue(model, settings, activityKeys);
  if (firmware.length !== cat.timers.length) {
    throw new WiringError(`base slot 12 holds ${firmware.length} firmware timers where a ${model} has ${cat.timers.length}`);
  }
  const generated = generatedSymbols(cat, timerOrder(cat, deviceTimers));
  const symbols = emptySymbols();
  for (const scan of ACTIVITY_KEY_SCANS) {
    if (activityKeys[scan] !== null) generated.entries.set(`activityKey${scan}`, activityKeys[scan]!);
  }

  const readList = (body: readonly WiringInstruction[], bytes: Uint8Array): void => {
    body.forEach((ins, k) => {
      const at = 1 + 3 * k;
      decode(ins, u16(bytes, at), u8(bytes, at + 2), symbols, generated);
    });
  };
  const readEntry = (template: EntryTemplate, bytes: Uint8Array): void => {
    const stride = template.wide ? 5 : 4;
    const head = template.wide ? 2 : 1;
    orderOf(template).forEach((tag, k) => {
      const at = head + stride * k + stride - 3;
      decode(template.bindings.get(tag)!, u16(bytes, at), u8(bytes, at + 2), symbols, generated);
    });
  };

  readList(cat.lead, leadPiece.bytes);
  firmware.forEach((p, k) => {
    const t = cat.timers[k]!;
    decode(t.instruction, u16(p.bytes, 4), u8(p.bytes, 6), symbols, generated);
  });
  // Lists and the leftover entry are found through symbols read before them, so read until nothing new.
  const pending = new Map(cat.lists);
  const entriesPending = [...cat.entries];
  for (let progress = true; progress;) {
    progress = false;
    for (const [name, body] of pending) {
      const index = generated.lists.get(name) ?? symbols.lists.get(name);
      if (index === undefined) continue;
      const p = listPieces[index];
      if (p === undefined) throw new WiringError(`list ${name} would be action list ${index}, which the table does not hold`);
      readList(body, p.bytes);
      pending.delete(name);
      progress = true;
    }
    for (let k = entriesPending.length - 1; k >= 0; k -= 1) {
      const template = entriesPending[k]!;
      const index = typeof template.index === 'number' ? template.index : symbols.entries.get(template.index);
      if (index === undefined) continue;
      readEntry(template, entryPieces[index]!.bytes);
      entriesPending.splice(k, 1);
      progress = true;
    }
  }
  if (pending.size > 0 || entriesPending.length > 0) {
    throw new WiringError(`nothing names ${[...pending.keys(), ...entriesPending.map((e) => String(e.index))].join(', ')}`);
  }

  const record = (kind: SymbolKind): Record<string, number> => Object.fromEntries(symbols[kind]);
  return {
    model, settings, activityKeys, deviceTimers,
    lists: record('lists'), modes: record('modes'), variables: record('variables'), maps: record('maps'), entries: record('entries'),
  };
}

// ---------------------------------------------------------------------------------------------------
// Putting the built pieces in a layout.
// ---------------------------------------------------------------------------------------------------

/**
 * A layout with its wiring swapped for the built pieces.
 *
 * Tables the frame lays out are swapped whole: base slots 2, 4, 8, 12 and 15, with the parameter groups
 * as base slot 15's parked run, section 318. A timer record, a base slot 9 entry or a base slot 10 list
 * takes the place of the piece its table names at the same index, which keeps the caller's emission
 * order; base slot 9's and 10's tables are copied with their references redirected. A built list or
 * entry at an index the table does not hold is refused, as is any other piece naming a replaced one.
 */
export function withWiring(layout: ContainerLayout, built: BuiltWiring): ContainerLayout {
  const replace = new Map<ContainerPiece, ContainerPiece>();
  const swapTable = (slot: number, table: ContainerPiece, records: ContainerPiece[]): void => {
    const old = tablePiece(layout, slot);
    replace.set(old, table);
    const oldRecords = tableTargets(old);
    if (oldRecords.length !== records.length) {
      throw new WiringError(`base slot ${slot} holds ${oldRecords.length} records and ${records.length} were built`);
    }
    oldRecords.forEach((p, k) => replace.set(p, records[k]!));
  };
  replace.set(tablePiece(layout, LOG_AREA_SLOT), built.logArea);
  replace.set(tablePiece(layout, EVENT_MAP_SLOT), built.eventMap);
  replace.set(tablePiece(layout, BINDING_SLOT), built.leadingList);
  swapTable(TIMER_SLOT, built.timerTable, built.timerRecords);
  swapTable(PARAMETER_SLOT, built.parameterTable, built.parameterGroups);

  // Tables whose entries are swapped one by one keep their other entries.
  const redirect = (slot: number, byIndex: Map<number, ContainerPiece>): void => {
    const old = tablePiece(layout, slot);
    const targets = tableTargets(old);
    for (const [index, p] of byIndex) {
      if (targets[index] === undefined) throw new WiringError(`base slot ${slot} has no entry ${index}`);
      replace.set(targets[index]!, p);
    }
    replace.set(old, { ...old, refs: old.refs.map((ref) => ('to' in ref && byIndex.size > 0 && replace.has(ref.to) ? { ...ref, to: replace.get(ref.to)! } : ref)) });
  };
  redirect(HANDLER_TABLE_SLOT, built.entries);
  redirect(ACTION_LIST_TABLE_SLOT, built.lists);

  const rewrite = (run: ContainerPiece[]): ContainerPiece[] => run.map((p) => replace.get(p) ?? p);
  const sections = layout.sections.map((s) => (s === undefined ? s : { before: rewrite(s.before), head: rewrite(s.head) }));
  const body = rewrite(layout.body);
  const pictures = rewrite(layout.pictures);

  const ours = new Set<ContainerPiece>(replace.values());
  const kept = [layout.keyTable, ...body, ...sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...pictures];
  for (const p of kept) {
    if (ours.has(p)) continue;
    if (p.refs.some((r) => 'to' in r && replace.has(r.to))) {
      throw new WiringError(`a piece${p.owner === undefined ? '' : ` (${p.owner})`} names a piece being replaced`);
    }
  }
  return { ...layout, body, sections, pictures };
}

/** Every piece `buildWiring` made, for a caller counting what it generated. */
export function builtPieces(built: BuiltWiring): ContainerPiece[] {
  return [
    built.logArea, built.eventMap, built.leadingList, built.parameterTable, ...built.parameterGroups,
    built.timerTable, ...built.timerRecords, ...built.entries.values(), ...built.lists.values(),
  ];
}
