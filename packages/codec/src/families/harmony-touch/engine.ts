/**
 * A model of what a Harmony Touch's engine sends, and when, for a person pressing things on it: the
 * prediction half of `todo-touch.md` 7.1's bench tests, written from the documents the remote holds.
 *
 * **Why a model and not a table.** What an activity start sends depends on what the engine believes is
 * already on: a device powered in two states gets its power on only when the engine holds it off, a device
 * whose power steps gets its toggle only when the engine holds it in the other state, and an input set by a
 * "set" list goes out every time while one set by a "change" list goes out only when it differs. Which
 * device's command goes first after the power commands depends on the delays each device is still waiting
 * out. So a start predicted from the documents alone is a start predicted from the documents and the
 * engine's state, and this module carries that state from one press to the next, as the remote does.
 *
 * **What it is a reading of.** The engine in the Touch's production image 4.15.330, decompiled in the lab,
 * `work/touch-firmware/luaworks-src/`, and summarised in the reference's Touch pages,
 * `activities-and-buttons.md` "Starting, switching and stopping" and `devices-and-infrared.md`. Where to look, by the
 * names a search finds there: the start is `startActivity` in `apihandler/activity.lua`, the list without a
 * scheduler `fireCommandsList`, a key press `buttonPress`, a channel `changeChannel`; a device's states and
 * its waits are `model/device.lua` (`delayRequired`, `updateDelay`, `getStateCommands`, `getCommand`,
 * `getChangeChannelCommands`), a state's transitions `model/state.lua`, and how the documents become all of
 * these `loader/userconfigreader.lua` (`getStatesConfiguration`, `getActionItems`,
 * `getActivitiesConfiguration`, `getSequenceActions`) and `main.lua` (`postLoad`, the Off activity). This
 * module is written in its own terms, by what the engine does rather than how its code is laid out; none of
 * that code is here.
 *
 * **Its scope is the documents it was written against and refuses the rest.** A feature the engine has and
 * these documents do not use, a transport other than infrared, a multi zone activity, a device stated as on
 * between activities while powered by hand, a role's own power on wait, a Scart device, throws rather than
 * being guessed at, so a set that leans on one is a set this model has to be extended for first.
 *
 * **Timing is a band, not a number.** The engine's waits are stated in the documents; what they are added to
 * is not: how long the lamp takes for a code, which is the code's own length times the device's repeat
 * count, and the engine's own overhead around each send and each sleep, which no document states. The model
 * runs every scenario twice, with the overhead at the bottom and the top of `TIMING`, and a prediction is the
 * band between the two. The band's width is calibrated on the bench runs of `todo-touch.md` 3.2 and 6.9,
 * `packages/bench/test/harmony-touch/touch-full-bench-predicted.test.ts`.
 *
 * **Why it lives in the codec.** It is knowledge about the remote, what its engine sends and when, so it sits
 * beside the documents it reads, plan 013 decision 7, where a preview of what an activity will send can use it as
 * the bench does. It moved here from the bench package, `packages/bench/src/touchengine.ts`, in `todo.md` 7.3.1,
 * unchanged in what it predicts.
 *
 * **What it leaves to the receiver.** A send's `heardMs` is when a receiver has heard the code's first frame, and
 * where one frame ends and the next begins is the receiver's rule, not the remote's. So the engine takes that rule
 * as `FirstFrame` when it is made: the bench passes the cut its monitor makes, `framesOfTrain` in
 * `packages/bench/src/irmonitor.ts`, through `BenchTouchEngine` in `packages/bench/src/touchbench.ts`. Everything
 * else here, the lamp's whole time included, is the remote's.
 */
import { waveformOfArchiveCommand } from '../../catalogue/archive.ts';
import type { Pulse } from '../../infrared/irframe.ts';
import { kindOf } from './documents.ts';
import {
  INFRARED_TRANSPORT,
  type Configuration, type ReadActivity, type ReadButton, type ReadCommand, type ReadDevice, type ReadMap,
} from './read.ts';

/** A step of a feature's, an activity's or a sequence's list, as the engine reads it. */
type Step =
  | { readonly kind: 'command'; readonly name: string; readonly holdMs: number | undefined }
  | { readonly kind: 'wait'; readonly ms: number }
  | { readonly kind: 'set'; readonly state: string; readonly value: string }
  | { readonly kind: 'force'; readonly state: string; readonly value: string }
  | { readonly kind: 'channel'; readonly number: string };

/** A step of an activity's lists, which may name its own device. */
interface ActivityStep {
  readonly step: Step;
  readonly deviceId: string | undefined;
}

/** One entry of a list the engine sends: a device's command, or a wait that may belong to a device. */
interface Entry {
  readonly deviceId: string | undefined;
  /** The command by the name the engine looks it up by, lower case; undefined for a wait. */
  readonly key: string | undefined;
  /** The wait this entry leaves behind it, for the same device's next command, in milliseconds. */
  delay: number;
  readonly holdMs: number | undefined;
  /** Put on the list by the Off activity among others, in an order the engine does not fix. */
  unordered?: boolean;
}

/** A device state: its power, its inputs, its channel tuning, or one of its own, as the engine keeps it. */
interface State {
  readonly stepping: boolean;
  /** The state's own delay: the power on delay for power, the input delay for inputs, else 0. Null reads as 0. */
  readonly delay: number | null;
  readonly values: readonly string[];
  /** Lists sent every time the state is asked for this value. */
  readonly set: ReadonlyMap<string, readonly Step[]>;
  /** Lists sent only when the state is not already at this value. */
  readonly change: ReadonlyMap<string, readonly Step[]>;
  readonly start: readonly Step[];
  readonly finish: readonly Step[];
  readonly next: readonly Step[];
  readonly previous: readonly Step[];
  readonly reset: readonly Step[];
  readonly powerOnReset: readonly Step[];
  readonly greaterTen: readonly Step[];
  readonly greaterHundred: readonly Step[];
  readonly fixedDigits: number;
  /** The inputs marked `IsOnline`, an app on the device, which take the device's connected app power on delay. */
  readonly online: ReadonlySet<string>;
  /** The value a two state power or input holds, `Off` at load. */
  current: string;
  /** The place a stepping state holds, 1 based, 1 at load. */
  place: number;
}

interface Device {
  readonly read: ReadDevice;
  readonly id: string;
  readonly name: string;
  readonly interKeyDelay: number;
  readonly interDeviceDelay: number;
  readonly states: ReadonlyMap<string, State>;
  readonly byHand: boolean;
  readonly alwaysOn: boolean;
  readonly keptOn: boolean;
  /** When this device's last code went, on the model's clock; undefined before its first. */
  lastSent: number | undefined;
  /** How long this device waits after its last code before its next. */
  currentDelay: number;
}

interface Activity {
  readonly id: string;
  readonly name: string;
  /** The power on of each device, by the first role naming it, in `PowerOnOrder`. */
  readonly powerOn: readonly string[];
  /** The input of each device whose first role selects one, in role order. */
  readonly inputs: readonly ActivityStep[];
  readonly enter: readonly ActivityStep[];
  /** The end steps added by hand, then the power off of each device, in `PowerOffOrder`. */
  readonly leave: readonly ActivityStep[];
  readonly channelDevice: string | undefined;
  readonly defaultChannel: string | undefined;
}

/** One code the model predicts, with when it starts, in milliseconds on the model's clock. */
export interface Send {
  readonly deviceId: string;
  /** The device's and the command's names as the documents state them, which is how the monitor names them. */
  readonly device: string;
  readonly command: string;
  /** When the code's first frame has been heard: the lamp's start plus that frame's length. */
  readonly heardMs: number;
  /** The engine held the code this long, from the action's `Duration`; undefined for an ordinary press. */
  readonly holdMs: number | undefined;
  /** Sent by the Off activity among others in an order the engine does not fix. */
  readonly unordered: boolean;
}

/**
 * The engine's overhead around a send and a sleep, at the two ends of the band. A send's lamp starts this
 * long after the engine asks for it and the engine goes on this long after the lamp stops; a sleep ends this
 * long late. The top end is calibrated, `touch-full-bench-predicted.test.ts`: the 6.9 runs put a send and a sleep together at
 * 133 to 192 ms beyond a stated delay, and the 3.2 runs' activity starts at less.
 */
export const TIMING = {
  low: { beforeLampMs: 0, afterLampMs: 0, sleepLateMs: 0 },
  high: { beforeLampMs: 60, afterLampMs: 90, sleepLateMs: 60 },
} as const;
export type Timing = (typeof TIMING)[keyof typeof TIMING];

/** How long a person leaves between two steps: longer than any wait the engine holds, so no wait carries over. */
export const BETWEEN_STEPS_MS = 60000;

const lower = (s: string): string => s.toLowerCase();

/**
 * A feature's action list in `Order`, as the engine reads it. A press names a command by name in lower case,
 * an empty name where none is stated; a hold is read as a press; a delay waits; a device action sets a state,
 * or forces it without sending when its `DevActionType` is 1. An action of any other kind, or one without a
 * numeric `Order`, is refused: no document measured holds one.
 */
function stepsOf(xs: unknown): Step[] {
  if (!Array.isArray(xs)) return [];
  const keyed: [number, Step][] = [];
  for (const raw of xs as Record<string, unknown>[]) {
    const kind = kindOf(raw as { __type?: unknown });
    if (typeof raw['Order'] !== 'number') throw new Error(`an action of kind ${kind} without a numeric Order`);
    const name = typeof raw['IRCommandName'] === 'string' ? lower(raw['IRCommandName']) : '';
    let step: Step;
    if (kind === 'IRPressAction') step = { kind: 'command', name, holdMs: typeof raw['Duration'] === 'number' ? raw['Duration'] : undefined };
    else if (kind === 'IRHoldAction') step = { kind: 'command', name, holdMs: undefined };
    else if (kind === 'IRDelayAction') step = { kind: 'wait', ms: Number(raw['Delay']) };
    else if (kind === 'IRDevAction') {
      step = { kind: raw['DevActionType'] === 1 ? 'force' : 'set', state: String(raw['StateName']), value: String(raw['StateValue']) };
    } else throw new Error(`an action of kind ${kind}, which this model does not read`);
    keyed.push([raw['Order'], step]);
  }
  return keyed.sort((a, b) => a[0] - b[0]).map(([, s]) => s);
}

function nonEmpty(xs: unknown): boolean {
  return Array.isArray(xs) && xs.length > 0;
}

/** A device's states out of its features, as the engine builds them at load. */
function statesOf(d: ReadDevice): { states: Map<string, State>; byHand: boolean; alwaysOn: boolean; keptOn: boolean } {
  const states = new Map<string, State>();
  let byHand = false;
  let alwaysOn = false;
  let keptOn = false;
  for (const f of (d.source.DeviceFeatures ?? []) as unknown as Record<string, unknown>[]) {
    const kind = kindOf(f as { __type?: unknown });
    let id: string | undefined;
    let stepping = false;
    let delay: number | null = 0;
    let values: string[] = [];
    const set = new Map<string, Step[]>();
    const change = new Map<string, Step[]>();
    let next: Step[] = [];
    let powerOnReset: Step[] = [];
    let greaterTen: Step[] = [];
    let greaterHundred: Step[] = [];
    let fixedDigits = 0;
    let reset: Step[] = [];
    const online = new Set<string>();
    if (kind === 'InputFeature') {
      id = 'Input';
      delay = typeof f['InputDelay'] === 'number' ? f['InputDelay'] : null;
      stepping = f['InputType'] === 2 || f['InputType'] === 4;
      const valid: [number, string][] = [];
      const skipped: [number, string][] = [];
      for (const input of (Array.isArray(f['Inputs']) ? f['Inputs'] : []) as Record<string, unknown>[]) {
        const name = String(input['InputName']);
        if (typeof input['InputOrder'] !== 'number') throw new Error(`${d.name}: an input without an InputOrder`);
        if (input['IsOnline'] === true) online.add(name);
        (input['IsActiveInput'] === true || !stepping ? valid : skipped).push([input['InputOrder'], name]);
        (input['ActionSetTypeId'] === 2 ? change : set).set(name, stepsOf(input['Actions']));
      }
      values = (valid.length > 0 ? valid : skipped).sort((a, b) => a[0] - b[0]).map(([, n]) => n);
    } else if (kind === 'PowerFeature') {
      id = 'Power';
      delay = typeof f['PowerOnDelay'] === 'number' ? f['PowerOnDelay'] : null;
      alwaysOn = f['IsPowerAlwaysOn'] === true;
      keptOn = f['IsPoweredOnBetweenActivities'] === true;
      const type = f['PowerTypeId'];
      byHand = type === 0 || type === 3;
      if (!byHand && type !== 1 && type !== 2) throw new Error(`${d.name}: power type ${String(type)}`);
      stepping = type === 2;
      values = ['Off', 'On'];
      if (f['PowerOffSetType'] === 1 || f['PowerOnSetType'] === 1) throw new Error(`${d.name}: a power set type this model does not carry`);
      if (Array.isArray(f['PowerOffActions'])) change.set('Off', stepsOf(f['PowerOffActions']));
      if (Array.isArray(f['PowerOnActions'])) change.set('On', stepsOf(f['PowerOnActions']));
      if (Array.isArray(f['PowerToggleActions'])) next = stepsOf(f['PowerToggleActions']);
      if (Array.isArray(f['PowerOnResetActions'])) powerOnReset = stepsOf(f['PowerOnResetActions']);
    } else if (kind === 'ChannelTuningFeature') {
      id = 'ChannelTune';
      if (typeof f['FixedDigits'] === 'number') fixedDigits = f['FixedDigits'];
      if (Array.isArray(f['GreaterTenActions'])) greaterTen = stepsOf(f['GreaterTenActions']);
      if (Array.isArray(f['GreaterHundredActions'])) greaterHundred = stepsOf(f['GreaterHundredActions']);
    } else if (kind === 'InternalStateFeature') {
      id = String(f['StateName']);
      for (const v of (Array.isArray(f['StateValues']) ? f['StateValues'] : []) as Record<string, unknown>[]) {
        const name = String(v['StateValueName']);
        if (!values.includes(name)) values.push(name);
        // Type 1 sets, 2 changes, and any other type is ignored, so a value stated twice keeps its typed list.
        if (v['ActionSetType'] === 1) set.set(name, stepsOf(v['Actions']));
        else if (v['ActionSetType'] === 2) change.set(name, stepsOf(v['Actions']));
      }
      if (Array.isArray(f['ResetActions'])) reset = stepsOf(f['ResetActions']);
    } else if (kind === 'OutputFeature') {
      continue;
    } else {
      throw new Error(`${d.name}: a feature of kind ${kind}, which this model does not read`);
    }
    let previous: Step[] = [];
    if (nonEmpty(f['NextActions'])) {
      next = stepsOf(f['NextActions']);
      if (kind === 'InternalStateFeature') stepping = true;
    }
    if (nonEmpty(f['PreviousActions'])) {
      previous = stepsOf(f['PreviousActions']);
      if (kind === 'InternalStateFeature') stepping = true;
    }
    states.set(id, {
      stepping, delay, values, set, change,
      start: stepsOf(f['StartActions']), finish: stepsOf(f['FinishActions']),
      next, previous, reset, powerOnReset, greaterTen, greaterHundred, fixedDigits, online,
      current: 'Off', place: 1,
    });
  }
  return { states, byHand, alwaysOn, keptOn };
}

/** An activity step added by hand: a command, a channel or a delay, the delay's `Duration` in seconds. */
function activityStepOf(raw: Record<string, unknown>): ActivityStep {
  const kind = kindOf(raw as { __type?: unknown });
  const deviceId = raw['DeviceId-'] === undefined || raw['DeviceId-'] === null ? undefined : String(raw['DeviceId-']);
  if (raw['TargetLevel'] !== undefined && raw['TargetLevel'] !== null) throw new Error('a step with a target level, a speaker group\'s');
  if (kind === 'CommandActivityAction') return { deviceId, step: { kind: 'command', name: lower(String(raw['CommandName'] ?? '')), holdMs: undefined } };
  if (kind === 'ChannelActivityAction') return { deviceId, step: { kind: 'channel', number: String(raw['ChannelNumber']) } };
  if (kind === 'DelayActivityAction') return { deviceId, step: { kind: 'wait', ms: Number(raw['Duration']) * 1000 } };
  throw new Error(`an activity step of kind ${kind}`);
}

function byOrder(xs: unknown, field: string): ActivityStep[] {
  const keyed: [number, ActivityStep][] = [];
  for (const raw of (Array.isArray(xs) ? xs : []) as Record<string, unknown>[]) {
    if (typeof raw[field] !== 'number') throw new Error(`an activity step without a numeric ${field}`);
    keyed.push([raw[field] as number, activityStepOf(raw)]);
  }
  return keyed.sort((a, b) => a[0] - b[0]).map(([, s]) => s);
}

function activityOf(a: ReadActivity): Activity {
  const raw = a.source as unknown as Record<string, unknown>;
  if (raw['IsMultiZone'] === true) throw new Error(`${a.name}: a multi zone activity`);
  const powerOn = new Map<number, string>();
  const powerOff = new Map<number, string>();
  const inputs: ActivityStep[] = [];
  const seen = new Set<string>();
  let channelDevice: string | undefined;
  for (const role of a.roles) {
    const id = role.deviceId;
    const kind = kindOf(role.source as { __type?: unknown });
    if (/SmartTV|Roku|Sonos|Speaker|ControlsApp/.test(kind)) throw new Error(`${a.name}: a role of kind ${kind}`);
    if (kind === 'ChannelChangingActivityRole') channelDevice = id;
    if (!seen.has(id)) {
      seen.add(id);
      if (typeof role.powerOnOrder !== 'number') throw new Error(`${a.name}: a role without a numeric PowerOnOrder`);
      if (typeof role.nextDevicePowerOnDelay === 'number') throw new Error(`${a.name}: a role stating its own power on wait`);
      powerOn.set(role.powerOnOrder, id);
      const selected = (role.source as unknown as Record<string, unknown>)['SelectedInput'];
      if (selected !== null && typeof selected === 'object') {
        inputs.push({ deviceId: id, step: { kind: 'set', state: 'Input', value: String((selected as Record<string, unknown>)['Name']) } });
        const channel = (selected as Record<string, unknown>)['ChannelNumber'];
        if (typeof channel === 'string') inputs.push({ deviceId: id, step: { kind: 'channel', number: channel } });
      }
    }
    if (typeof role.powerOffOrder === 'number') powerOff.set(role.powerOffOrder, id);
  }
  const ordered = (m: Map<number, string>) => [...m.entries()].sort((x, y) => x[0] - y[0]).map(([, id]) => id);
  return {
    id: a.id,
    name: a.name ?? 'Default',
    powerOn: ordered(powerOn),
    inputs,
    enter: byOrder(raw['EnterActions'], 'ActionOrder'),
    leave: [
      ...byOrder(raw['LeaveActions'], 'ActionOrder'),
      ...ordered(powerOff).map((id) => ({ deviceId: id, step: { kind: 'set', state: 'Power', value: 'Off' } as Step })),
    ],
    channelDevice,
    defaultChannel: typeof a.defaultChannel === 'string' ? a.defaultChannel : undefined,
  };
}

/** How long the lamp is on for one press of a command, and how long its first frame is, both in milliseconds. */
export interface Airtime {
  readonly lampMs: number;
  readonly firstFrameMs: number;
}

/**
 * A receiver's rule for where a code's first frame ends: the durations of the first frame of a press's train, or
 * none. The receiver's and not the remote's, so the engine is handed it, see this module's header.
 */
export type FirstFrame = (once: readonly Pulse[]) => readonly Pulse[];

/**
 * The lamp's time for a command, from its definition: the codec's rendering of the code at the device's
 * repeat count, which gave the frame counts the monitor heard for every code of the 3.2 and 6.9 runs. Its first
 * frame is cut by the receiver's rule, `firstFrame`.
 */
export function airtimeOf(device: ReadDevice, command: ReadCommand, firstFrame: FirstFrame): Airtime {
  if (command.protocol === undefined || typeof command.keyCode !== 'string') throw new Error(`${device.name} ${command.name}: no definition to send`);
  const w = waveformOfArchiveCommand(command.protocol.archive, command.keyCode, { repeats: device.pressRepeats, asStored: true });
  if ('refusal' in w) throw new Error(`${device.name} ${command.name}: ${w.refusal}`);
  const total = (xs: readonly Pulse[]) => xs.reduce((sum, p) => sum + p.us, 0) / 1000;
  const first = firstFrame(w.once);
  return { lampMs: total(w.once), firstFrameMs: total(first) };
}

/**
 * The engine, with its state, on a clock of its own. Every method is one thing a person does, and returns
 * what the engine sends for it.
 */
export class TouchEngine {
  private readonly devices = new Map<string, Device>();
  private readonly activities = new Map<string, Activity>();
  private readonly config: Configuration;
  private readonly timing: Timing;
  private readonly firstFrame: FirstFrame;
  private now = 0;
  private lastDevice: string | undefined;
  private lastSent: number | undefined;
  private running: string | undefined;
  private sends: Send[] = [];

  /** `firstFrame` is the receiver's cut of a code's first frame, which only a send's `heardMs` reads. */
  constructor(config: Configuration, timing: Timing, firstFrame: FirstFrame) {
    this.config = config;
    this.timing = timing;
    this.firstFrame = firstFrame;
    for (const d of config.devices) {
      if (d.transport !== INFRARED_TRANSPORT) throw new Error(`${d.name}: a transport other than infrared`);
      if ((d.source.Device as unknown as Record<string, unknown>)['IsScartCableSupported'] === true) throw new Error(`${d.name}: a Scart device`);
      const { states, byHand, alwaysOn, keptOn } = statesOf(d);
      this.devices.set(d.id, {
        read: d, id: d.id, name: d.name ?? '', interKeyDelay: d.interKeyDelayMs ?? 0, interDeviceDelay: d.interDeviceDelayMs ?? 0,
        states, byHand, alwaysOn, keptOn, lastSent: undefined, currentDelay: 0,
      });
    }
    for (const a of config.activities) this.activities.set(a.id, activityOf(a));
  }

  /** The activity running, by name, or undefined for none. */
  get activity(): string | undefined {
    return this.running === undefined ? undefined : this.activities.get(this.running)!.name;
  }

  private device(id: string | undefined): Device | undefined {
    return id === undefined ? undefined : this.devices.get(id);
  }

  private activityByName(name: string): Activity {
    const found = [...this.activities.values()].filter((a) => a.name === name);
    if (found.length !== 1) throw new Error(`${found.length} activities named ${name}`);
    return found[0]!;
  }

  // ---- building a list ----

  /** A device command onto a list, with the wait it leaves: the state's delay where larger than the inter key delay. */
  private command(d: Device, key: string, list: Entry[], stateDelay: number | undefined, holdMs: number | undefined): void {
    if (!d.read.commandsByName.has(key)) return;
    const delay = stateDelay !== undefined && stateDelay > d.interKeyDelay ? stateDelay : d.interKeyDelay;
    list.push({ deviceId: d.id, key, delay, holdMs });
  }

  private steps(d: Device | undefined, steps: readonly Step[], list: Entry[], stateDelay: number | undefined): void {
    for (const s of steps) this.step(d, s, list, stateDelay);
  }

  private step(d: Device | undefined, s: Step, list: Entry[], stateDelay: number | undefined): void {
    if (s.kind === 'wait') {
      list.push({ deviceId: d?.id, key: undefined, delay: s.ms, holdMs: undefined });
      return;
    }
    if (d === undefined) return;
    if (s.kind === 'command') this.command(d, s.name, list, stateDelay, s.holdMs);
    else if (s.kind === 'set') this.toState(d, s.state, s.value, list);
    else if (s.kind === 'force') this.force(d, s.state, s.value);
    else this.channel(d, s.number, list);
  }

  private force(d: Device, id: string, value: string): void {
    const state = d.states.get(id);
    if (state === undefined || !state.values.includes(value)) return;
    if (state.stepping) state.place = placeOf(state, value);
    else state.current = value;
  }

  /** A state asked for a value: nothing for a value it does not hold, else its lists by its kind. */
  private toState(d: Device, id: string, value: string, list: Entry[]): void {
    const state = d.states.get(id);
    if (state === undefined || !state.values.includes(value)) return;
    if (id === 'Power' && (d.byHand || (d.alwaysOn && value === 'Off'))) return;
    const own = state.delay ?? 0;
    const stateDelay = value !== 'On' && value !== 'Off' ? own : undefined;
    const raise = (delay: number) => {
      const last = list[list.length - 1];
      if (last !== undefined && delay > last.delay) last.delay = delay;
    };
    if (!state.stepping) {
      const delay = value === 'Off' ? 0 : own;
      const set = state.set.get(value);
      if (set !== undefined) {
        this.steps(d, state.start, list, stateDelay);
        this.steps(d, set, list, stateDelay);
        this.steps(d, state.finish, list, stateDelay);
        raise(delay);
        state.current = value;
        return;
      }
      const change = state.change.get(value);
      if (change !== undefined && state.current !== value) {
        this.steps(d, state.start, list, stateDelay);
        this.steps(d, change, list, stateDelay);
        this.steps(d, state.finish, list, stateDelay);
        raise(delay);
        if (value === 'On') this.steps(d, state.powerOnReset, list, undefined);
        state.current = value;
        return;
      }
      if (value === 'On' || value === 'Off') state.current = value;
      return;
    }
    const delay = value === 'Off' ? 0 : own;
    if (state.values[state.place - 1] === value) return;
    this.steps(d, state.start, list, stateDelay);
    const to = placeOf(state, value);
    const n = state.values.length;
    let forward: number;
    let back: number;
    if (to > state.place) {
      forward = to - state.place;
      back = state.place + n - to;
    } else {
      back = state.place - to;
      forward = n - state.place + to;
    }
    if (back < forward && state.previous.length > 0) for (let i = 0; i < back; i += 1) this.steps(d, state.previous, list, stateDelay);
    else for (let i = 0; i < forward; i += 1) this.steps(d, state.next, list, stateDelay);
    this.steps(d, state.finish, list, stateDelay);
    raise(delay);
    this.steps(d, state.reset, list, delay);
    if (value === 'On') this.steps(d, state.powerOnReset, list, undefined);
    state.place = to;
  }

  /** A channel as digit presses: the tuning's start, the digits, padded and prefixed as it says, its finish. */
  private channel(d: Device, number: string, list: Entry[]): void {
    const tuning = d.states.get('ChannelTune');
    if (tuning !== undefined) this.steps(d, tuning.start, list, undefined);
    const digit = (c: string) => {
      if (d.read.commandsByName.has(c)) list.push({ deviceId: d.id, key: c, delay: d.interKeyDelay, holdMs: undefined });
    };
    if (/[.-]/.test(number) || tuning === undefined) {
      for (const c of number) {
        const swap = c === '.' && d.read.commandsByName.has('-') ? '-' : c === '-' && d.read.commandsByName.has('.') ? '.' : c;
        digit(d.read.commandsByName.has(c) ? c : swap);
      }
    } else {
      let padded = number;
      if (padded.length > 0) while (padded.length < tuning.fixedDigits) padded = `0${padded}`;
      if (padded.length === 2 && Number(padded) >= 10) this.steps(d, tuning.greaterTen, list, undefined);
      if (padded.length >= 3 && Number(padded) >= 100) this.steps(d, tuning.greaterHundred, list, undefined);
      for (const c of padded) digit(c);
    }
    if (tuning !== undefined) this.steps(d, tuning.finish, list, undefined);
  }

  // ---- sending ----

  /**
   * How long a device still has to wait before its next code, or 0. A wait under a microsecond is none: the clock
   * is a sum of fractional milliseconds, and a residue of rounding, 4.5e-13 ms in one start walked from a clock at
   * 0, was slept by `schedule` without moving the clock and looped for ever.
   */
  private waitFor(d: Device): number {
    if (this.lastSent === undefined) return 0;
    const since = this.now - this.lastSent;
    let wait: number;
    if (this.lastDevice === d.id && d.lastSent !== undefined) wait = Math.max(0, d.currentDelay - since);
    else {
      const between = Math.max(0, d.interDeviceDelay - since);
      const own = d.lastSent === undefined ? 0 : Math.max(0, d.currentDelay - (this.now - d.lastSent));
      wait = Math.max(between, own);
    }
    return wait < 0.001 ? 0 : wait;
  }

  private sleep(ms: number): void {
    this.now += ms + this.timing.sleepLateMs;
  }

  /** One entry sent: the lamp for a command, and the wait it leaves either way. */
  private fire(e: Entry): void {
    const d = this.device(e.deviceId)!;
    if (e.key === undefined) {
      // A wait that belongs to a device is sent as nothing and starts that device's wait from now.
      let delay = e.delay;
      if (this.lastDevice === d.id && d.lastSent !== undefined) delay = Math.max(0, delay - (this.now - this.lastSent!));
      this.sent(d, delay);
      return;
    }
    const command = d.read.commandsByName.get(e.key)!;
    const air = airtimeOf(d.read, command, this.firstFrame);
    const lampStart = this.now + this.timing.beforeLampMs;
    this.sends.push({
      deviceId: d.id, device: d.name, command: command.name ?? e.key, heardMs: lampStart + air.firstFrameMs,
      holdMs: e.holdMs, unordered: e.unordered === true,
    });
    const lamp = e.holdMs !== undefined ? Math.max(e.holdMs, air.lampMs) : air.lampMs;
    this.now = lampStart + lamp + this.timing.afterLampMs;
    this.sent(d, e.delay);
  }

  private sent(d: Device, delay: number): void {
    this.lastDevice = d.id;
    this.lastSent = this.now;
    d.lastSent = this.now;
    d.currentDelay = delay;
  }

  /** A list sent in order, each command after its device's wait, a wait of no device slept. */
  private sendInOrder(list: readonly Entry[]): void {
    for (const e of list) {
      const d = this.device(e.deviceId);
      if (d !== undefined) {
        const wait = this.waitFor(d);
        if (wait > 0) this.sleep(wait);
        this.fire(e);
      } else if (e.delay > 0) {
        this.sleep(e.delay);
      }
    }
  }

  /**
   * An activity start's power and input list: strictly in order while power commands remain, each waiting
   * for its device; after them, a device still waiting is passed over and the next device's command goes,
   * and when every remaining device is waiting the shortest wait is slept.
   */
  private schedule(list: Entry[], power: number): void {
    let left = power;
    while (list.length > 0) {
      let shortest: number | undefined;
      const blocked = new Set<string>();
      for (let i = 0; i < list.length; i += 1) {
        const e = list[i]!;
        const d = this.device(e.deviceId);
        if (d === undefined) throw new Error('a wait of no device in a start list');
        if (blocked.has(d.id)) continue;
        const wait = this.waitFor(d);
        if (wait === 0) {
          this.fire(e);
          list.splice(i, 1);
          if (left > 0) left -= 1;
          shortest = undefined;
          break;
        }
        if (left > 0) {
          shortest = wait;
          break;
        }
        if (shortest === undefined || wait < shortest) shortest = wait;
        blocked.add(d.id);
      }
      if (shortest !== undefined) this.sleep(shortest);
    }
  }

  private collect(): Send[] {
    const out = this.sends;
    this.sends = [];
    return out;
  }

  /** The person waits before the next step, longer than any wait the engine holds. */
  idle(ms = BETWEEN_STEPS_MS): void {
    this.now += ms;
  }

  // ---- what a person does ----

  /**
   * An activity started from the activity list, or Off when `name` is undefined: the new activity's power
   * on, the old one's end steps that are not power offs sent first as their own list, the old one's power
   * offs after the new power ons for every device the new one does not power and that is not kept on, then
   * the new inputs, then its start steps and its channel. Off powers off every device still on.
   */
  start(name: string | undefined, channel?: string): Send[] {
    const to = name === undefined ? undefined : this.activityByName(name);
    const from = this.running === undefined ? undefined : this.activities.get(this.running);
    const list: Entry[] = [];
    if (to !== undefined) for (const id of to.powerOn) this.toState(this.device(id)!, 'Power', 'On', list);
    const leaving: Entry[] = [];
    for (const a of from?.leave ?? []) {
      const d = this.device(a.deviceId);
      if (a.deviceId !== undefined && d === undefined) continue;
      if (a.step.kind === 'set' && a.step.state === 'Power' && a.step.value === 'Off') {
        let add = true;
        if (to !== undefined) for (const id of to.powerOn) if (id === d!.id || d!.keptOn) { add = false; break; }
        if (add) this.step(d, a.step, list, undefined);
      } else {
        this.step(d, a.step, leaving, undefined);
      }
    }
    if (to === undefined) {
      // The Off activity: every device the engine still holds on, in the order of a table keyed by id,
      // which the documents do not fix. Marked so a test can refuse to expect an order among several.
      const before = list.length;
      for (const d of this.devices.values()) {
        const power = d.states.get('Power');
        if (power !== undefined && (power.place !== 1 || power.current !== 'Off')) this.toState(d, 'Power', 'Off', list);
      }
      if (list.length - before > 1) for (const e of list.slice(before)) e.unordered = true;
    }
    this.sendInOrder(leaving);
    const power = list.length;
    // An input marked online replaces the wait after its device's last command on the list, its power on, with
    // the device's connected app power on delay.
    for (const a of to?.inputs ?? []) {
      const d = this.device(a.deviceId);
      if (d === undefined || a.step.kind !== 'set' || !d.states.get('Input')?.online.has(a.step.value)) continue;
      const appDelay = (d.read.power?.connectedAppOnDelayMs);
      const last = list.filter((e) => e.deviceId === d.id).at(-1);
      if (last !== undefined && typeof appDelay === 'number') last.delay = appDelay;
    }
    for (const a of to?.inputs ?? []) this.step(this.device(a.deviceId), a.step, list, undefined);
    this.schedule(list, power);
    const enter: Entry[] = [];
    for (const a of to?.enter ?? []) this.step(this.device(a.deviceId), a.step, enter, undefined);
    this.sendInOrder(enter);
    this.running = to?.id;
    const tuned = channel ?? to?.defaultChannel;
    if (tuned !== undefined && to !== undefined) this.tune(to, tuned);
    return this.collect();
  }

  private tune(a: Activity, number: string): void {
    const d = this.device(a.channelDevice);
    if (d === undefined) throw new Error(`${a.name}: no channel changing device`);
    if (!/^[0-9.-]+$/.test(number)) return;
    const list: Entry[] = [];
    this.channel(d, number, list);
    this.sendInOrder(list);
  }

  /** A favourite channel tapped: the number to the running activity's channel device, or its activity started first. */
  favourite(activity: string, number: string): Send[] {
    const a = this.activityByName(activity);
    if (this.running === a.id) {
      this.tune(a, number);
      return this.collect();
    }
    return this.start(activity, number);
  }

  /**
   * A key of the keypad, tapped or held past the long press, in the running activity or in a device's mode.
   * A command goes out on its own and starts no wait; a sequence goes as a list, its delays slept.
   */
  key(key: string, how: 'tap' | 'hold', deviceName?: string): Send[] {
    const map = this.mapOf(deviceName);
    const button = map?.keys.find((b) => b.key === key);
    if (map === undefined || button === undefined) return [];
    return this.press(map, button, how);
  }

  /**
   * An entry of the screen's command list tapped, in the running activity or in a device's mode, found by the label
   * the screens show on it. **The engine sends it as it sends a key**: its `buttonPress` takes the entry by its
   * `IndexInMenu`, which is the soft button's name, out of the same map, and goes on down the same path, so a tap
   * goes as a tapped key goes. The label is the model's handle and not the engine's, which never reads it, so a
   * label that names no entry, or two, is refused rather than guessed at.
   */
  entry(label: string, deviceName?: string): Send[] {
    const map = this.mapOf(deviceName);
    const found = [...(map?.entries.values() ?? [])].filter((b) => b.label === label);
    if (found.length !== 1) throw new Error(`${found.length} screen entries labelled ${label} on ${deviceName ?? 'the running activity'}`);
    return this.press(map!, found[0]!, 'tap');
  }

  /** The map a press reaches: a device's own in its mode, else the running activity's, else none. */
  private mapOf(deviceName: string | undefined): ReadMap | undefined {
    return deviceName === undefined
      ? (this.running === undefined ? undefined : this.config.activities.find((a) => a.id === this.running)!.map)
      : this.config.devices.find((d) => d.name === deviceName)!.map;
  }

  /** One button of `map` pressed, a key or a screen entry alike. */
  private press(map: ReadMap, button: ReadButton, how: 'tap' | 'hold'): Send[] {
    const action = how === 'hold' && button.longPress !== undefined ? button.longPress : button.press;
    if (action === undefined) return [];
    if (action.kind === 'command') {
      const d = this.device(action.deviceId);
      if (d === undefined || action.command === undefined) return [];
      const air = airtimeOf(d.read, action.command, this.firstFrame);
      const lampStart = this.now + this.timing.beforeLampMs;
      this.sends.push({
        deviceId: d.id, device: d.name, command: action.command.name ?? '', heardMs: lampStart + air.firstFrameMs,
        holdMs: undefined, unordered: false,
      });
      this.now = lampStart + air.lampMs + this.timing.afterLampMs;
      // A tap of a key with a long press goes as a fire on release and starts its device's wait; one without
      // goes as a press, which starts none.
      if (button.longPress !== undefined) this.sent(d, d.interKeyDelay);
      return this.collect();
    }
    if (action.kind === 'sequence') {
      const sequence = map.sequences.find((s) => s.id === action.sequenceId);
      if (sequence === undefined) return [];
      const list: Entry[] = [];
      for (const s of sequence.steps) {
        if (s.kind === 'delay') list.push({ deviceId: undefined, key: undefined, delay: s.durationMs ?? 0, holdMs: undefined });
        else if (s.kind === 'command' && s.deviceId !== undefined) this.command(this.device(s.deviceId)!, lower(s.commandName ?? ''), list, undefined, undefined);
      }
      this.sendInOrder(list);
      return this.collect();
    }
    return [];
  }
}

function placeOf(state: State, value: string): number {
  // The engine counts to the value and stops there, or past the last place when it is not found.
  let place = 0;
  for (const v of state.values) {
    place += 1;
    if (v === value) break;
  }
  return place;
}
