/**
 * How to drive a catalogue device, read out of the Harmony infrared archive's device records.
 *
 * **What this is for.** `catalogue.ts` answers which commands a device has; this answers how to use
 * them. Whether power is two commands or one that flips, how long a power press must be held, what the
 * inputs are called and which commands reach each, how many digits a channel number takes, and how long
 * to wait between devices and between presses. An activity's opening moves are exactly these, so a
 * device imported without them can be operated key by key and cannot be switched on from an activity
 * with any confidence. Section 305 is where the gap was found: a Panasonic television whose power codes
 * a configuration holds seven times where every other code is held three, because Logitech's catalogue
 * says to hold power for a second and their compiler wrote that out as copies.
 *
 * **Where the data comes from.** Logitech's service hands these out per catalogue entry, as device
 * **features** plus the entry's own timing record, section 305. The archive carried none of it at its
 * schema version 1; its author added all of it in version 2, after this project told him of the calls,
 * and every value on that television's record equals what the service answered. The field names below
 * are the archive's, which are its own renaming of Logitech's, and the meaning given to each is the
 * archive's README's unless a comment says it was measured here.
 *
 * **The reader refuses rather than guesses**, like the rest of the archive's readers: a key or a step
 * shape not in the surveyed set throws `ArchiveError` naming it. The set was measured over all 276236
 * records of version 2 rather than taken from the README, and the two differ in one place worth
 * knowing: the README's example timing names `minRepeats` where the records carry `pressMinRepeats`,
 * and both occur, `minRepeats` beside it on 78846 records.
 *
 * **Decision 15 and decision 11 apply as they do to `catalogue.ts`**: what is read here is Logitech's
 * data, it crosses into this repository only through this reader, and nothing derived from it may be
 * shared through a community device database.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ArchiveError, archiveManifest } from './archive.ts';

/**
 * One step of an action list. A list is performed in order, and every actionable field below is one. The
 * archive's order is the service's own step numbering rather than its array position, checked on every
 * list of every device, the per input and per state ones included, section 305. The fields the archive
 * drops from a step or an input are in `catalogueraw.ts`, whose `catalogueRules` returns these rules with
 * them attached.
 *
 * Five shapes in the archive, mapped to four kinds:
 *
 * - a bare string is `send`, the command of that name from the device's codeset, sent as one press;
 * - `{command, durationMs}` is `send` with `holdMs`, the command kept going for that long. **This is the
 *   field section 305 is about**: Logitech's compiler turns it into as many copies of the code as fit.
 *   The service also states a duration of 0, and the archive writes that as a bare string;
 * - `{hold}` is `hold`, a press held for a time nobody stated. Its operand is passed through as written,
 *   and it is not always a command that exists: on 14 of the 49 the archive holds it is digits, such as
 *   `1000`, and on the one device checked, BenQ's MW851UST, its codeset has no command of that name. The
 *   archive's raw capture says the service states this step as a command name with no duration, so it
 *   is passed through as stated and a caller checks the name before sending;
 * - `{delayMs}` is `wait`, nothing sent;
 * - `{set, to}` is `state`, **not a transmission**: it records that the device's state `state` now holds
 *   `value`, which is what lets a later input change know where it starts from.
 */
export type DriveStep =
  | { readonly kind: 'send'; readonly command: string; readonly holdMs?: number }
  | { readonly kind: 'hold'; readonly command: string }
  | { readonly kind: 'wait'; readonly ms: number }
  | { readonly kind: 'state'; readonly state: string; readonly value: string };

/** How fast the device may be driven. Every value is in milliseconds except the two repeat counts. */
export interface DeviceTiming {
  /** The pause after a command before the next one to this device. */
  readonly interKeyDelay: number;
  /** The pause after a command before one to another device. */
  readonly interDeviceDelay: number;
  /** The same while a key is held. */
  readonly holdInterDeviceDelay: number;
  /** How long the device needs after power on before it listens. Absent on 8178 of 276236 records. */
  readonly powerOnDelay?: number;
  /** How long an input change takes to settle. */
  readonly inputDelay: number;
  /** Logitech's delay for a device driven through a connected app. Zero on 268967 of 276236 records. */
  readonly connectedAppPowerOnDelay: number;
  /** How many times one press sends the code. */
  readonly pressMinRepeats: number;
  /** A second repeat count on 78846 records, Logitech's `MinRepeats`; which one wins is not read here. */
  readonly minRepeats?: number;
  readonly isInterKeyDelayOptimized: boolean;
}

/**
 * How the device is switched on and off. **Read `type` before sending anything**: on a `toggle` device
 * the one power command flips the state, so sending it blind switches a device that is already on off.
 */
export interface DevicePower {
  readonly type: 'discrete' | 'toggle' | 'none' | 'unknown';
  readonly on?: readonly DriveStep[];
  readonly off?: readonly DriveStep[];
  readonly toggle?: readonly DriveStep[];
  /** Run after power on to put the device in a known state, usually a `state` step naming an input. */
  readonly onReset?: readonly DriveStep[];
}

/** One input as the device names it. */
export interface DeviceInput {
  readonly name: string;
  /** What reaches it. Absent on 409421 inputs, which belong to devices that can only step through. */
  readonly commands?: readonly DriveStep[];
  /** Logitech's own labels for the sockets behind it, `HDMI`, `Antenna`, an open set. */
  readonly ports?: readonly string[];
}

export interface DeviceInputs {
  /** A Logitech enumeration nobody has decoded, passed through as the number it is. */
  readonly type: number;
  /** Absent on three records that state a type and no list. */
  readonly list?: readonly DeviceInput[];
  readonly next?: readonly DriveStep[];
  readonly previous?: readonly DriveStep[];
  /** Performed before an input change and after it. */
  readonly start?: readonly DriveStep[];
  readonly finish?: readonly DriveStep[];
  readonly canSkip?: boolean;
}

/** How a channel number is entered. */
export interface DeviceChannelTuning {
  /** Every number is sent with exactly this many digits, so channel 7 is `07`. */
  readonly fixedDigits?: number;
  readonly start?: readonly DriveStep[];
  /** After the digits, usually `Enter`. */
  readonly finish?: readonly DriveStep[];
  /** Before the digits of a number above 9, and above 99. */
  readonly greaterTen?: readonly DriveStep[];
  readonly greaterHundred?: readonly DriveStep[];
}

/** One way to reach a state value. `setType` is a Logitech enumeration, 0 to 2, not decoded here. */
export interface DeviceStateSelect {
  readonly setType: number;
  readonly steps: readonly DriveStep[];
}

export interface DeviceStateValue {
  readonly name: string;
  /** Absent where the value is reached by stepping with the state's `next`, or not at all. */
  readonly select?: readonly DeviceStateSelect[];
}

/** One state a device keeps, which a `state` step names. */
export interface DeviceState {
  readonly values: readonly DeviceStateValue[];
  readonly next?: readonly DriveStep[];
  readonly previous?: readonly DriveStep[];
  readonly start?: readonly DriveStep[];
  readonly finish?: readonly DriveStep[];
  /** A pause between steps through the values, on 36 states. */
  readonly valueDelay?: number;
}

/**
 * Everything the archive says about driving one device. `timing` is on every record; the other four are
 * **absent rather than empty** where Logitech had nothing to say, which is the archive's own convention.
 */
export interface DeviceDriving {
  readonly timing: DeviceTiming;
  readonly power?: DevicePower;
  readonly inputs?: DeviceInputs;
  readonly channelTuning?: DeviceChannelTuning;
  /** By state name, in the record's order. */
  readonly states?: ReadonlyMap<string, DeviceState>;
}

type Raw = Record<string, unknown>;

/** The record's keys that are identity or codes, which `catalogueDevice` reads and this does not. */
const IDENTITY_KEYS = new Set(['manufacturer', 'model', 'globalDeviceId', 'deviceType', 'codeset']);

function object(value: unknown, where: string): Raw {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ArchiveError(`${where}: expected an object`);
  }
  return value as Raw;
}

/** Refuse any key outside `allowed`, so a field added later is noticed rather than dropped. */
function only(raw: Raw, allowed: readonly string[], where: string): void {
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) throw new ArchiveError(`${where}: unknown field ${key}`);
  }
}

function integer(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new ArchiveError(`${where}: expected an integer`);
  return value;
}

function text(value: unknown, where: string): string {
  if (typeof value !== 'string') throw new ArchiveError(`${where}: expected a string`);
  return value;
}

function flag(value: unknown, where: string): boolean {
  if (typeof value !== 'boolean') throw new ArchiveError(`${where}: expected true or false`);
  return value;
}

/** One action list. Each step's shape is matched on its exact key set, so a sixth shape is refused. */
export function driveSteps(value: unknown, where: string): DriveStep[] {
  if (!Array.isArray(value)) throw new ArchiveError(`${where}: expected a list of steps`);
  return value.map((step, at): DriveStep => {
    const here = `${where}[${at}]`;
    if (typeof step === 'string') return { kind: 'send', command: step };
    const raw = object(step, here);
    const keys = Object.keys(raw).sort().join(',');
    switch (keys) {
      case 'command,durationMs':
        return { kind: 'send', command: text(raw['command'], here), holdMs: integer(raw['durationMs'], here) };
      case 'hold':
        return { kind: 'hold', command: text(raw['hold'], here) };
      case 'delayMs':
        return { kind: 'wait', ms: integer(raw['delayMs'], here) };
      case 'set,to':
        return { kind: 'state', state: text(raw['set'], here), value: text(raw['to'], here) };
      default:
        throw new ArchiveError(`${here}: unknown step shape {${keys}}`);
    }
  });
}

/** An optional action list: absent stays absent, so the archive's convention survives the reading. */
function maybeSteps(raw: Raw, key: string, where: string): { readonly [k: string]: DriveStep[] } {
  return key in raw ? { [key]: driveSteps(raw[key], `${where}.${key}`) } : {};
}

function timingOf(value: unknown): DeviceTiming {
  const where = 'timing';
  const raw = object(value, where);
  only(raw, ['interKeyDelay', 'interDeviceDelay', 'holdInterDeviceDelay', 'powerOnDelay', 'inputDelay',
    'connectedAppPowerOnDelay', 'pressMinRepeats', 'minRepeats', 'isInterKeyDelayOptimized'], where);
  return {
    interKeyDelay: integer(raw['interKeyDelay'], `${where}.interKeyDelay`),
    interDeviceDelay: integer(raw['interDeviceDelay'], `${where}.interDeviceDelay`),
    holdInterDeviceDelay: integer(raw['holdInterDeviceDelay'], `${where}.holdInterDeviceDelay`),
    ...('powerOnDelay' in raw ? { powerOnDelay: integer(raw['powerOnDelay'], `${where}.powerOnDelay`) } : {}),
    inputDelay: integer(raw['inputDelay'], `${where}.inputDelay`),
    connectedAppPowerOnDelay: integer(raw['connectedAppPowerOnDelay'], `${where}.connectedAppPowerOnDelay`),
    pressMinRepeats: integer(raw['pressMinRepeats'], `${where}.pressMinRepeats`),
    ...('minRepeats' in raw ? { minRepeats: integer(raw['minRepeats'], `${where}.minRepeats`) } : {}),
    isInterKeyDelayOptimized: flag(raw['isInterKeyDelayOptimized'], `${where}.isInterKeyDelayOptimized`),
  };
}

const POWER_TYPES = ['discrete', 'toggle', 'none', 'unknown'] as const;

function powerOf(value: unknown): DevicePower {
  const where = 'power';
  const raw = object(value, where);
  only(raw, ['type', 'on', 'off', 'toggle', 'onReset'], where);
  const type = text(raw['type'], `${where}.type`);
  if (!(POWER_TYPES as readonly string[]).includes(type)) throw new ArchiveError(`${where}.type: unknown ${type}`);
  return {
    type: type as DevicePower['type'],
    ...maybeSteps(raw, 'on', where), ...maybeSteps(raw, 'off', where),
    ...maybeSteps(raw, 'toggle', where), ...maybeSteps(raw, 'onReset', where),
  };
}

function inputsOf(value: unknown): DeviceInputs {
  const where = 'inputs';
  const raw = object(value, where);
  only(raw, ['type', 'list', 'next', 'previous', 'start', 'finish', 'canSkip'], where);
  const list = 'list' in raw ? raw['list'] : undefined;
  if (list !== undefined && !Array.isArray(list)) throw new ArchiveError(`${where}.list: expected a list`);
  return {
    type: integer(raw['type'], `${where}.type`),
    ...(list === undefined ? {} : {
      list: list.map((entry, at): DeviceInput => {
        const here = `${where}.list[${at}]`;
        const one = object(entry, here);
        only(one, ['name', 'commands', 'ports'], here);
        const ports = 'ports' in one ? one['ports'] : undefined;
        if (ports !== undefined && !Array.isArray(ports)) throw new ArchiveError(`${here}.ports: expected a list`);
        return {
          name: text(one['name'], `${here}.name`),
          ...maybeSteps(one, 'commands', here),
          ...(ports === undefined ? {} : { ports: ports.map((port, p) => text(port, `${here}.ports[${p}]`)) }),
        };
      }),
    }),
    ...maybeSteps(raw, 'next', where), ...maybeSteps(raw, 'previous', where),
    ...maybeSteps(raw, 'start', where), ...maybeSteps(raw, 'finish', where),
    ...('canSkip' in raw ? { canSkip: flag(raw['canSkip'], `${where}.canSkip`) } : {}),
  };
}

function channelTuningOf(value: unknown): DeviceChannelTuning {
  const where = 'channelTuning';
  const raw = object(value, where);
  only(raw, ['fixedDigits', 'start', 'finish', 'greaterTen', 'greaterHundred'], where);
  return {
    ...('fixedDigits' in raw ? { fixedDigits: integer(raw['fixedDigits'], `${where}.fixedDigits`) } : {}),
    ...maybeSteps(raw, 'start', where), ...maybeSteps(raw, 'finish', where),
    ...maybeSteps(raw, 'greaterTen', where), ...maybeSteps(raw, 'greaterHundred', where),
  };
}

function statesOf(value: unknown): Map<string, DeviceState> {
  const states = new Map<string, DeviceState>();
  for (const [name, state] of Object.entries(object(value, 'states'))) {
    const where = `states.${name}`;
    const raw = object(state, where);
    only(raw, ['values', 'next', 'previous', 'start', 'finish', 'valueDelay'], where);
    const values = raw['values'];
    if (!Array.isArray(values)) throw new ArchiveError(`${where}.values: expected a list`);
    states.set(name, {
      values: values.map((entry, at): DeviceStateValue => {
        const here = `${where}.values[${at}]`;
        const one = object(entry, here);
        only(one, ['name', 'select'], here);
        const select = 'select' in one ? one['select'] : undefined;
        if (select !== undefined && !Array.isArray(select)) throw new ArchiveError(`${here}.select: expected a list`);
        return {
          name: text(one['name'], `${here}.name`),
          ...(select === undefined ? {} : {
            select: select.map((way, w): DeviceStateSelect => {
              const there = `${here}.select[${w}]`;
              const sel = object(way, there);
              only(sel, ['setType', 'commands'], there);
              return { setType: integer(sel['setType'], `${there}.setType`), steps: driveSteps(sel['commands'], `${there}.commands`) };
            }),
          }),
        };
      }),
      ...maybeSteps(raw, 'next', where), ...maybeSteps(raw, 'previous', where),
      ...maybeSteps(raw, 'start', where), ...maybeSteps(raw, 'finish', where),
      ...('valueDelay' in raw ? { valueDelay: integer(raw['valueDelay'], `${where}.valueDelay`) } : {}),
    });
  }
  return states;
}

/**
 * The driving half of one parsed device record. Pure, so a caller holding the record already, or a test
 * holding a record it made up, needs no checkout.
 *
 * Throws on a record with no `timing`, which is every record of schema version 1: a reader that returned
 * nothing there would report a device with no rules, where the truth is an archive too old to say.
 */
export function deviceDriving(record: unknown): DeviceDriving {
  const raw = object(record, 'device');
  only(raw, [...IDENTITY_KEYS, 'timing', 'power', 'inputs', 'channelTuning', 'states'], 'device');
  if (!('timing' in raw)) throw new ArchiveError('device: no timing block, so not a schema version 2 record');
  return {
    timing: timingOf(raw['timing']),
    ...('power' in raw ? { power: powerOf(raw['power']) } : {}),
    ...('inputs' in raw ? { inputs: inputsOf(raw['inputs']) } : {}),
    ...('channelTuning' in raw ? { channelTuning: channelTuningOf(raw['channelTuning']) } : {}),
    ...('states' in raw ? { states: statesOf(raw['states']) } : {}),
  };
}

/** One device's driving rules, by its manufacturer slug and file name, as `catalogueModels` gives them. */
export function catalogueDriving(root: string, slug: string, file: string): DeviceDriving {
  archiveManifest(root);
  const path = join(root, 'devices', slug, file.endsWith('.json') ? file : `${file}.json`);
  if (!existsSync(path)) throw new ArchiveError(`no such device: ${slug}/${file}`);
  return deviceDriving(JSON.parse(readFileSync(path, 'utf8')));
}
