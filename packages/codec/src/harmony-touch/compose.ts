/**
 * A Harmony Touch device written by us: its device record, its commands, its own button map and the
 * protocol definitions it uses, composed with no Logitech database behind it. `todo-touch.md` 5.3.
 *
 * **Why the device needs three documents and not one.** A Touch is told about a device in `DeviceList`, the
 * device record and its commands, and sends a command from the family definition `ProtocolList` holds under
 * the command's `ProtocolId`, `devices-and-infrared.md`, "The two documents". But a device with no map of its
 * own does nothing in device mode: the screens look the map up by `16417Device<id>`, and with none every key
 * of that mode is dead, `activities-and-buttons.md`, "How a key press becomes a command", step 4, which
 * `check.ts` reports as `no map`. So a usable device is the three together, and this composes all three and
 * leaves putting them into a whole set of documents to the caller.
 *
 * **Where each value comes from.**
 *
 * * **The codes**: a family's definition and a key code in the catalogue's notation, which `definition.ts`
 *   composes from a row of our own rhythm table, or a learned raw code, which `learned.ts` writes. This module
 *   takes either as it is handed and never builds one, so the rhythm is derived in one place.
 * * **The names**: what the person typed. A command's `Name` is how the engine finds it, case blind, and
 *   what a key's action names; the label, `TextOnRemote`, is what the screen list shows. In Logitech's own
 *   device maps the two are the same on all 191 list entries measured that name a command, the other six
 *   being the group 36 entries, which name none, so the label defaults to the name.
 * * **Which key sends which command**: the caller's choice, by the Touch's own key names. Logitech's device
 *   maps put a command on the key of the same name on 104 of the 139 key bindings measured, but that is the
 *   total: per map it runs from 8 of 20 to 22 of 25, so on one map it is the minority. The rest are their
 *   catalogue's synonyms (Mute on VolumeMute, OK on Select). `keysByName` offers the same-name rule and
 *   invents none of the synonyms, since a synonym table of our own would be a guess about devices.
 *
 * **What is written and why only that.** "What a writer must carry" names the fields a document without
 * which stops the engine, and those are all here: a device's `DeviceType`, `Manufacturer` and `Transport`,
 * `PressMinRepeats` and `InterDeviceDelay` since it sends infrared, and on every command `TransportType` and
 * the `Raw` and `KeyCode` keys, null where they do not apply. `ControlPort` is written, since the engine takes
 * it as it stands with no default, and it is 0, which the reference reads as the remote's own lamp.
 * **That is a reading and not a measurement**: Logitech's own documents for one Touch with no hub state 0
 * on two devices and 7 on five, which rule they follow is not read, and what a nonzero port does without a
 * hub is not checked. `IsScartCableSupported` is written false, as the engine reads it while an activity
 * starts, "Delays a device states". Of the fields only the screens read, the two delay defaults that apply
 * to a device with no features are written, `DefaultInterKeyDelay` and `DefaultInterDeviceDelay`, so a
 * reset on the delay screens lands on our values; `DefaultInputDelay` and `DefaultPowerOnDelay` belong to
 * the input and power features, which a device of ours does not carry. `ParentDeviceManufacturer`,
 * `ParentDeviceModel` and `IsMultiCode`, which the screens also read, are written too.
 * Every other of the 56 fields Logitech's records carry is left out: the reference reads nothing of the
 * engine's in them, and a field stated by us is one more the remote can send back to an account, "What a
 * writer must carry". Whether the engine or the screens trip over one being absent is not checked on a
 * remote; `check.ts` holds what is read.
 *
 * **No features are written.** A device with no power feature is one the activities cannot switch on and
 * off, and no input feature means no input to select; device mode needs neither. Composing them is an
 * activity's business and not this item's.
 *
 * **A device described by its family and numbers, and put into a whole set**, `todo-touch.md` 8.1:
 * `composeTouchDeviceOfRow` composes a device every command of which is one number of one family of our rhythm
 * table, `withTouchDevice` adds the three parts to the device, map and protocol lists of a set the remote holds,
 * under identifiers of ours, `OWN_IDS`, and `withoutTouchDevice` takes them out again. Devices and activities of
 * Logitech's are taken out with everything naming them by `remove.ts`, `todo-touch.md` 8.5.
 *
 * **An activity composed from a description, and put into a whole set**, `todo-touch.md` 8.2: `composeTouchActivity`
 * writes an activity's record and its own map from devices the documents already hold, named as a person names
 * them, `withTouchActivity` adds the two to the activity and map lists, and `withoutTouchActivity` takes them out.
 * The section that opens them says what is written and why.
 *
 * **Nothing here sends anything**: these are documents. This said no write path to a Touch existed, decision
 * 29, which stopped being true when the answerer of `todo-touch.md` 6.6 delivered sets to the bench
 * Touch; the answerer is `packages/corpus/src/touchsync.ts`.
 */
import type {
  Activity, ActivityAction, ActivityList, Button, ButtonActionDocument, ButtonMap, Command, Device, DeviceList,
  DeviceWithFeatures, Id, IrProtocol, MapList, ProtocolList, Role, Sequence, SyncDocuments,
} from './documents.ts';
import { INFRARED_TRANSPORT, mapIdentifier, readConfiguration, type ReadDevice } from './read.ts';
import { idText, kindOf } from './documents.ts';
import { definitionOfRow, isDefinitionRefusal, keyCodeText } from './definition.ts';
import { rawOfLearned, rhythmOfLearned, type LearnedRaw, type LearnedRow } from './learned.ts';
import type { Pulse } from '../irframe.ts';
import { statedProtocol, type StatedCode, type StatedItem } from '../stated.ts';
import type { StatedProtocol } from '../protocols.ts';

/**
 * The names a Touch's documents give its 26 keys: the drawing's 27 keypad keys less Off, which the screens
 * handle themselves, with the DVR key spelt as the documents spell it. Held against the measured documents
 * in `test/touch-compose.test.ts` and in `packages/usb/test/touch-activities.test.ts`; the drawing's keypad less
 * Off is where the list was read from, and no test compares it with the drawing.
 */
export const BUTTON_KEYS = [
  'Blue', 'ChannelDown', 'ChannelUp', 'DVR', 'DirectionDown', 'DirectionLeft', 'DirectionRight', 'DirectionUp',
  'Exit', 'FastForward', 'Green', 'Guide', 'Info', 'Menu', 'Pause', 'Play', 'PrevChannel', 'Record', 'Red',
  'Rewind', 'Select', 'Stop', 'VolumeDown', 'VolumeMute', 'VolumeUp', 'Yellow',
] as const;
export type TouchButtonKey = (typeof BUTTON_KEYS)[number];

/** A list entry's group in a device's map, the group the screen list shows; the number pad's is 2. */
const LIST_GROUP = 0;
/** A press, the one event a binding of ours states; 2 is a long press, as Logitech's maps carry it. */
const PRESS_EVENT = 1;
const LONG_PRESS_EVENT = 2;

/** How a command of ours is sent: a family's definition and a key code, or a learned raw code. */
export type OwnCode =
  | { readonly kind: 'stated'; readonly protocol: IrProtocol; readonly keyCode: string }
  | { readonly kind: 'raw'; readonly raw: string };

export interface OwnCommand {
  /** What the engine finds the command by, case blind, and what a key's action names. */
  readonly name: string;
  /** What the screen list shows, `TextOnRemote`; the name when absent. */
  readonly label?: string;
  readonly code: OwnCode;
  /** Whether it goes on the device's screen list. True when absent. */
  readonly onScreen?: boolean;
}

/** A key of the device's map: the command its press sends, and its long press when one is wanted. */
export interface OwnKey {
  readonly press: string;
  readonly longPress?: string;
}

export interface OwnDevice {
  /** Ours, and unique among the devices of the documents it goes into; also what its map is named by. */
  readonly id: number;
  readonly name: string;
  readonly manufacturer: string;
  readonly model: string;
  /** Logitech's device type number, `reference/logitech/data-model/`; the caller's to choose. */
  readonly deviceType: number;
  /** How many times a press repeats the code; the engine's own 3 when absent, `DEFAULT_PRESS_REPEATS`. */
  readonly pressRepeats?: number;
  /** The wait after a command before the next one to this device, when commands go as a list. */
  readonly interKeyDelayMs: number;
  /** The silence this device needs after another device's last command. */
  readonly interDeviceDelayMs: number;
  readonly commands: readonly OwnCommand[];
  /** Which key sends which command, by the Touch's key names. */
  readonly keys?: Readonly<Partial<Record<TouchButtonKey, OwnKey>>>;
}

/** What `composeTouchDevice` gives: the device list's entry, its map, and the definitions its commands name. */
export interface ComposedTouchDevice {
  readonly device: DeviceWithFeatures;
  readonly map: ButtonMap;
  /** Each definition once, in the order the commands first name it. */
  readonly protocols: readonly IrProtocol[];
}

export class ComposeRefusal extends Error {}

/**
 * The keys whose name is a command's name, exactly: the one key rule Logitech's own maps follow on most of
 * their bindings. A command named `Mute` lands on no key, since `VolumeMute` is not its name.
 */
export function keysByName(commands: readonly OwnCommand[]): Partial<Record<TouchButtonKey, OwnKey>> {
  const out: Partial<Record<TouchButtonKey, OwnKey>> = {};
  const keys = new Set<string>(BUTTON_KEYS);
  for (const c of commands) if (keys.has(c.name)) out[c.name as TouchButtonKey] = { press: c.name };
  return out;
}

/**
 * The device record, its commands, its map and the definitions it uses.
 *
 * **Refuses rather than writes what the remote would ignore**, each a rule `check.ts` reports on a document
 * that arrives with it: two command names that differ only in case, of which the engine keeps the later and
 * no button reaches the earlier; a key naming a command the device does not hold, which sends nothing; a
 * key name the Touch's documents do not use; and two different definitions under one protocol id, of which
 * a command would be sent by whichever the list holds.
 */
export function composeTouchDevice(d: OwnDevice): ComposedTouchDevice {
  const folded = new Map<string, string>();
  for (const c of d.commands) {
    const before = folded.get(c.name.toLowerCase());
    if (before !== undefined) throw new ComposeRefusal(`two commands are named "${before}" and "${c.name}", which the engine keeps as one`);
    folded.set(c.name.toLowerCase(), c.name);
  }

  const protocols = new Map<string, IrProtocol>();
  for (const c of d.commands) {
    if (c.code.kind !== 'stated') continue;
    const id = idText(c.code.protocol['Id-']);
    const before = protocols.get(id);
    if (before !== undefined && JSON.stringify(before) !== JSON.stringify(c.code.protocol)) {
      throw new ComposeRefusal(`two different definitions are given protocol id ${id}`);
    }
    protocols.set(id, c.code.protocol);
  }

  const commands: Command[] = d.commands.map((c) => ({
    Name: c.name,
    // Both keys are written for every command, null where they do not apply: a missing `Raw` stops the
    // engine and a missing `KeyCode` makes the command unsendable, "What a writer must carry".
    KeyCode: c.code.kind === 'stated' ? c.code.keyCode : null,
    ProtocolId: c.code.kind === 'stated' ? c.code.protocol['Id-'] : null,
    TransportType: INFRARED_TRANSPORT,
    Raw: c.code.kind === 'raw' ? c.code.raw : null,
  }));

  const pressRepeats = d.pressRepeats ?? null;
  const device: Device & Record<string, unknown> = {
    'Id-': d.id,
    Name: d.name,
    Manufacturer: d.manufacturer,
    Model: d.model,
    DeviceType: d.deviceType,
    // Infrared, the one transport a device of ours has; Logitech's records state 1 for theirs too.
    Transport: INFRARED_TRANSPORT,
    ControlPort: 0,
    // Null is the engine's own default of 3, "The packet"; a number is sent as it stands.
    PressMinRepeats: pressRepeats,
    InterKeyDelay: d.interKeyDelayMs,
    InterDeviceDelay: d.interDeviceDelayMs,
    // What the delay screens reset to, so a reset lands on the values we composed.
    DefaultInterKeyDelay: d.interKeyDelayMs,
    DefaultInterDeviceDelay: d.interDeviceDelayMs,
    // Read by the screens alone; a device of ours is its own parent and one code set.
    ParentDeviceManufacturer: d.manufacturer,
    ParentDeviceModel: d.model,
    IsMultiCode: false,
    IsScartCableSupported: false,
  };

  return {
    device: { Device: device, DeviceFeatures: [], Commands: commands },
    map: deviceMap(d, folded),
    protocols: [...protocols.values()],
  };
}

/** The device's own map: its keys, then its screen list in the order the commands are given. */
function deviceMap(d: OwnDevice, names: ReadonlyMap<string, string>): ButtonMap {
  const action = (name: string, event: number): ButtonActionDocument => {
    const own = names.get(name.toLowerCase());
    if (own === undefined) throw new ComposeRefusal(`a key names "${name}", which is not a command of the device`);
    return { __type: 'ButtonCommandAction', EventType: event, Order: 0, CommandName: own, 'DeviceId-': d.id };
  };
  const known = new Set<string>(BUTTON_KEYS);
  const buttons: Button[] = [];
  for (const [key, binding] of Object.entries(d.keys ?? {})) {
    if (!known.has(key)) throw new ComposeRefusal(`"${key}" is not a key name a Touch's documents use`);
    if (binding === undefined) continue;
    buttons.push({
      __type: 'HardRemoteButton',
      ButtonKey: key,
      ButtonState: 0,
      FunctionGroupType: LIST_GROUP,
      ButtonAction: action(binding.press, PRESS_EVENT),
      ButtonLongPressAction: binding.longPress === undefined ? null : action(binding.longPress, LONG_PRESS_EVENT),
      ButtonDoublePressAction: null,
    });
  }
  let index = 0;
  for (const c of d.commands) {
    if (c.onScreen === false) continue;
    buttons.push({
      __type: 'SoftRemoteButton',
      ButtonState: 0,
      FunctionGroupType: LIST_GROUP,
      TextOnRemote: c.label ?? c.name,
      MenuItem: { IndexInMenu: index },
      ButtonAction: action(c.name, PRESS_EVENT),
      ButtonLongPressAction: null,
      ButtonDoublePressAction: null,
    });
    index += 1;
  }
  return {
    __type: 'DeviceButtonMap',
    ButtonMapIdentifier: mapIdentifier('device', idText(d.id as Id)),
    'DeviceId-': d.id,
    Buttons: buttons,
    Sequences: [],
  };
}

/** What `codeOfLearned` made of a learned code, and why it fell back to raw where it did. */
export interface LearnedCommandCode {
  readonly code: OwnCode;
  /** The learned code as `rhythmOfLearned` read it: a row of the table, a row of our own, or raw. */
  readonly learned: LearnedRow | LearnedRaw;
  /** Where a row was read but no definition or key code could be written from it, why; the code is raw then. */
  readonly refusal?: string;
}

/**
 * A learned code as a command of ours: a definition and a key code where its rhythm is a row the Touch's
 * definitions can state, and its raw text otherwise. `todo-touch.md` 5.3's two routes for a learned code.
 *
 * **The definition route is preferred** because it is the form every command Logitech hands a Touch takes:
 * the remote builds the durations from a family and a number, and a held key repeats the family's own
 * repeat sequence. A raw code is one repeat sequence with no start and no finish, `devices-and-infrared.md`,
 * "The packet", so as the engine is read a held key replays the whole recording, its closing silence
 * included; how the native program plays the repeat sequence is not checked.
 *
 * **How many times a press sends the code is the device's count and not the recording's**: a Touch repeats
 * a code `PressMinRepeats` times, 3 when null, and never reads a definition's own count. A recording of a
 * remote that sent its code twice is written as one frame and sent three times by default; a caller that
 * wants the recording's count sets `OwnDevice.pressRepeats`. **The raw route is
 * always there**: any recording a learned code arrives as can be written as raw text, so this never refuses.
 *
 * **A row of the table falls back to raw more often than a row of our own does**: a definition needs the
 * row's repetition, `held`, and most rows of the table state only their frame, `definitionOfRow`; a row
 * fitted to the code states both. The fallback is reported in `refusal`, never hidden.
 *
 * `protocolId` is the id the definition is listed under, ours to choose and unique in the protocol list it
 * goes into; two commands read as the same row give equal definitions, which `composeTouchDevice` keeps once.
 */
export function codeOfLearned(
  train: readonly Pulse[], carrierHz: number, protocolId: Id, options: { readonly name?: string } = {},
): LearnedCommandCode {
  const learned = rhythmOfLearned(train, carrierHz, options);
  if (learned.kind === 'raw') return { code: { kind: 'raw', raw: learned.raw }, learned };
  // The carrier is left to the row: a learned carrier is measured and seldom gives the row's period exactly,
  // and the Touch rounds whichever carrier it is given to within a nanosecond of the row's.
  const stated = codeOfRow(learned.row, protocolId, learned.value, learned.bits);
  if ('refusal' in stated) return { code: { kind: 'raw', raw: rawOfLearned(train, carrierHz) }, learned, refusal: stated.refusal };
  return { code: stated.code, learned };
}

/**
 * One number of a family as a command of ours: the definition `definitionOfRow` writes for the row, under
 * `protocolId`, and the key code `keyCodeText` writes the number into, at `bits` bits or the width the family's
 * name states. **The one place a row and a number become a definition and a key code**, which a learned code
 * read as a row, `codeOfLearned`, and a device described by its family and numbers, `composeTouchDeviceOfRow`,
 * both go through. A refusal is the definition's or the key code's own, never hidden.
 */
export function codeOfRow(
  row: StatedProtocol, protocolId: Id, value: bigint, bits?: number,
): { readonly code: OwnCode } | { readonly refusal: string } {
  const definition = definitionOfRow(row, protocolId, bits === undefined ? {} : { bits });
  if (isDefinitionRefusal(definition)) return { refusal: definition.refusal };
  const width = bits ?? definition.IRSegments?.[0]?.Payload?.NumberOfBits;
  if (typeof width !== 'number') return { refusal: 'a segment states no width' };
  const frame: StatedItem = { kind: 'frame', frame: { value, bits: width, index: 0 } };
  const stated: StatedCode = {
    family: definition.Name,
    items: [frame],
    frames: [frame.frame],
    words: [],
    bits: width,
    groups: [[], [frame], []],
  };
  const keyCode = keyCodeText(stated, definition);
  if (typeof keyCode !== 'string') return { refusal: keyCode.refusal };
  return { code: { kind: 'stated', protocol: definition, keyCode } };
}

// ---------------------------------------------------------------------------------------------------
// A device described by its family and numbers, and put into a set of documents. `todo-touch.md` 8.1.
// ---------------------------------------------------------------------------------------------------

/**
 * **The identifiers of ours, nine digits from 900000000.** A device and a protocol definition each carry an
 * `Id-`, and one of ours must never be taken for one of Logitech's, either by the remote, which finds a
 * definition by a command's `ProtocolId` and a device's map by `16417Device` and the device's id, or by
 * Logitech's service if the documents ever go back to it. In the documents measured, Logitech's device and
 * activity ids are eight digits (the bench set's devices 83495531 to 83968654) and the catalogue's protocol ids
 * run from 1 to 801 (every definition of the third party archive of Logitech's database); a nine digit number
 * from 900000000 is outside both by a factor of ten, and below 2^31, so a service holding ids as signed 32 bit
 * integers holds it. **That is a margin, not a guarantee**: nothing states the ranges Logitech's service issues
 * from, so `withTouchDevice` also refuses an id that any id already in the documents would collide with.
 */
export const OWN_IDS = { first: 900_000_000, last: 999_999_999 } as const;

/** Whether an id is one of ours by `OWN_IDS`: a whole number in the range, given as a number or as its digits. */
export function isOwnId(id: Id): boolean {
  const n = typeof id === 'number' ? id : /^[0-9]+$/.test(id) ? Number(id) : Number.NaN;
  return Number.isInteger(n) && n >= OWN_IDS.first && n <= OWN_IDS.last;
}

/** A command of a device described by its family: the name, the label, and the number it sends. */
export interface RowCommand {
  readonly name: string;
  readonly label?: string;
  /** The number, as the family's notation states it: hexadecimal digits after `0x`, or a whole number. */
  readonly value: string | number;
  readonly onScreen?: boolean;
}

/**
 * A device whose every command is one number of one family of our rhythm table, `PROTOCOLS`: what a person
 * types for a device a Touch is to send to, with no catalogue behind it. `keys` is the map's keys, or
 * `'by name'` for `keysByName`'s same name rule.
 */
export interface RowDevice extends Omit<OwnDevice, 'commands' | 'keys'> {
  /** A family of `PROTOCOLS`, by the name the table gives it. */
  readonly family: string;
  /** The id the family's definition is listed under: one of ours, `OWN_IDS`. */
  readonly protocolId: number;
  /** The width of every number, where the family's name does not state it. */
  readonly bits?: number;
  readonly commands: readonly RowCommand[];
  readonly keys?: 'by name' | Readonly<Partial<Record<TouchButtonKey, OwnKey>>>;
}

/** A command's number as a bigint, or undefined when it is neither a whole number nor `0x` and hex digits. */
function numberOf(value: string | number): bigint | undefined {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : undefined;
  return /^0x[0-9A-Fa-f]+$/.test(value) || /^[0-9]+$/.test(value) ? BigInt(value) : undefined;
}

/**
 * The device of a `RowDevice`, through `composeTouchDevice`: one definition of the family under `protocolId`,
 * and each command's key code written into it by `codeOfRow`. **Refuses** a family the table does not hold, a
 * protocol id that is not one of ours, a number that is not one, and whatever `codeOfRow` refuses, by command;
 * every command shares the one definition, so `composeTouchDevice` lists it once.
 */
export function composeTouchDeviceOfRow(d: RowDevice): ComposedTouchDevice {
  const row = statedProtocol(d.family);
  if (row === undefined) throw new ComposeRefusal(`"${d.family}" is not a family of the rhythm table`);
  if (!isOwnId(d.protocolId)) throw new ComposeRefusal(`protocol id ${d.protocolId} is not one of ours, ${OWN_IDS.first} to ${OWN_IDS.last}`);
  const commands: OwnCommand[] = d.commands.map((c) => {
    const value = numberOf(c.value);
    if (value === undefined) throw new ComposeRefusal(`${c.name}: "${String(c.value)}" is not a number`);
    const code = codeOfRow(row, d.protocolId, value, d.bits);
    if ('refusal' in code) throw new ComposeRefusal(`${c.name}: ${code.refusal}`);
    return { name: c.name, ...(c.label === undefined ? {} : { label: c.label }), code: code.code, ...(c.onScreen === undefined ? {} : { onScreen: c.onScreen }) };
  });
  const { family: _family, protocolId: _protocolId, bits: _bits, keys, ...rest } = d;
  return composeTouchDevice({ ...rest, commands, keys: keys === 'by name' ? keysByName(commands) : keys ?? {} });
}

/** The three documents a device is told to a Touch in, as `withTouchDevice` gives them back. */
export interface DeviceDocuments {
  readonly DeviceList: DeviceList;
  readonly MapList: MapList;
  readonly ProtocolList: ProtocolList;
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const listIn = (doc: unknown, field: string): readonly unknown[] | undefined => {
  const list = isRecord(doc) ? doc[field] : undefined;
  return Array.isArray(list) ? list : undefined;
};
const copyOf = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const deviceIdOf = (entry: unknown): string => (isRecord(entry) && isRecord(entry['Device']) ? idText(entry['Device']['Id-'] as Id) : '');

/**
 * `documents` with the composed device added: its entry at the end of `DeviceList`, its map after the last
 * device map of `MapList` (where Logitech's documents keep device maps, before the activities'), and each of
 * its definitions at the end of `ProtocolList` unless the list already holds that same definition under that
 * id. The other two documents are not touched, and nothing is changed in place: the three come back as copies.
 *
 * **Refuses**, each by what collides and never quoting a document's value: one of the three documents without
 * its list; a device or protocol id that is not one of ours, `OWN_IDS`; a device id already listed, or one whose
 * digits contain another device's id or are contained in one, since the screens search a device's id as a
 * pattern inside another and would find the wrong device (the lab's 6.10 note on the screens' reads, row 200);
 * a map identifier already in `MapList`; a device name another device has, compared without regard to case,
 * since the device list shows devices by name and a person picks one by it; and a protocol id listed with
 * another definition.
 */
export function withTouchDevice(documents: SyncDocuments, composed: ComposedTouchDevice): DeviceDocuments {
  const devices = listIn(documents.DeviceList, 'DevicesWithFeatures');
  const maps = listIn(documents.MapList, 'ButtonMaps');
  const protocols = listIn(documents.ProtocolList, 'Protocols');
  if (devices === undefined) throw new ComposeRefusal('DeviceList holds no list of devices');
  if (maps === undefined) throw new ComposeRefusal('MapList holds no list of maps');
  if (protocols === undefined) throw new ComposeRefusal('ProtocolList holds no list of definitions');

  const id = idText(composed.device.Device['Id-']);
  if (!isOwnId(composed.device.Device['Id-'])) throw new ComposeRefusal(`device id ${id} is not one of ours, ${OWN_IDS.first} to ${OWN_IDS.last}`);
  for (const entry of devices) {
    const other = deviceIdOf(entry);
    if (other === id) throw new ComposeRefusal(`device id ${id} is already listed`);
    if (other !== '' && (other.includes(id) || id.includes(other))) {
      throw new ComposeRefusal(`device id ${id} and a listed device's id, one inside the other, which the screens' search by pattern confuses`);
    }
    const name = isRecord(entry) && isRecord(entry['Device']) ? entry['Device']['Name'] : undefined;
    if (typeof name === 'string' && typeof composed.device.Device.Name === 'string' && name.toLowerCase() === composed.device.Device.Name.toLowerCase()) {
      throw new ComposeRefusal(`a listed device is already named "${composed.device.Device.Name}"`);
    }
  }
  const identifier = composed.map.ButtonMapIdentifier;
  if (maps.some((m) => isRecord(m) && m['ButtonMapIdentifier'] === identifier)) throw new ComposeRefusal(`MapList already holds a map ${identifier}`);
  const added: IrProtocol[] = [];
  for (const p of composed.protocols) {
    const pid = idText(p['Id-']);
    if (!isOwnId(p['Id-'])) throw new ComposeRefusal(`protocol id ${pid} is not one of ours, ${OWN_IDS.first} to ${OWN_IDS.last}`);
    const listed = protocols.find((x) => isRecord(x) && idText(x['Id-'] as Id) === pid);
    if (listed === undefined) added.push(p);
    else if (JSON.stringify(listed) !== JSON.stringify(p)) throw new ComposeRefusal(`protocol id ${pid} is already listed with another definition`);
  }

  const lastDeviceMap = maps.reduce<number>((at, m, i) => (isRecord(m) && kindOf(m as { __type?: unknown }) === 'DeviceButtonMap' ? i : at), -1);
  const nextMaps = [...maps.slice(0, lastDeviceMap + 1), composed.map, ...maps.slice(lastDeviceMap + 1)];
  return {
    DeviceList: { ...copyOf(documents.DeviceList!), DevicesWithFeatures: [...copyOf(devices), copyOf(composed.device)] } as DeviceList,
    MapList: { ...copyOf(documents.MapList!), ButtonMaps: copyOf(nextMaps) } as MapList,
    ProtocolList: { ...copyOf(documents.ProtocolList!), Protocols: [...copyOf(protocols), ...copyOf(added)] } as ProtocolList,
  };
}

/**
 * `documents` with a device of ours taken out again: its entry, its own map, and every definition its commands
 * name that no other device's command names. **The exact inverse of `withTouchDevice`** for a device nothing
 * else names, which is all `todo-touch.md` 8.1 needs; the general removal, which also takes the device out of
 * every activity and map naming it, is 8.5's, `withoutTouchDevices` in `remove.ts`. So this refuses a device that is not one of ours, one
 * the device list does not hold, and one that an activity's role or step, or a button or sequence step of
 * another map, names: removing it would leave that reference pointing at nothing.
 */
export function withoutTouchDevice(documents: SyncDocuments, deviceId: Id): DeviceDocuments {
  const id = idText(deviceId);
  if (!isOwnId(deviceId)) throw new ComposeRefusal(`device id ${id} is not one of ours, so it is not taken out here`);
  const devices = listIn(documents.DeviceList, 'DevicesWithFeatures');
  const maps = listIn(documents.MapList, 'ButtonMaps');
  const protocols = listIn(documents.ProtocolList, 'Protocols');
  if (devices === undefined || maps === undefined || protocols === undefined) throw new ComposeRefusal('a device, map or protocol list is missing');
  const at = devices.findIndex((d) => deviceIdOf(d) === id);
  if (at < 0) throw new ComposeRefusal(`device id ${id} is not listed`);

  // Anything outside the device's own entry and map that names it by id.
  const identifier = mapIdentifier('device', id);
  const namesIt = (x: unknown): boolean => {
    if (Array.isArray(x)) return x.some(namesIt);
    if (!isRecord(x)) return false;
    if ('DeviceId-' in x && idText(x['DeviceId-'] as Id) === id) return true;
    return Object.values(x).some(namesIt);
  };
  if (namesIt(listIn(documents.ActivityList, 'Activities') ?? [])) throw new ComposeRefusal(`an activity names device ${id}`);
  if (maps.some((m) => isRecord(m) && m['ButtonMapIdentifier'] !== identifier && namesIt(m))) throw new ComposeRefusal(`another map names device ${id}`);

  const named = (entry: unknown): Set<string> => new Set(
    (isRecord(entry) && Array.isArray(entry['Commands']) ? entry['Commands'] : [])
      .map((c: unknown) => (isRecord(c) && c['ProtocolId'] !== null && c['ProtocolId'] !== undefined ? idText(c['ProtocolId'] as Id) : ''))
      .filter((p: string) => p !== ''),
  );
  const own = named(devices[at]);
  const others = new Set(devices.filter((_, i) => i !== at).flatMap((d) => [...named(d)]));
  const gone = new Set([...own].filter((p) => !others.has(p)));
  return {
    DeviceList: { ...copyOf(documents.DeviceList!), DevicesWithFeatures: copyOf(devices.filter((_, i) => i !== at)) } as DeviceList,
    MapList: { ...copyOf(documents.MapList!), ButtonMaps: copyOf(maps.filter((m) => !(isRecord(m) && m['ButtonMapIdentifier'] === identifier))) } as MapList,
    ProtocolList: { ...copyOf(documents.ProtocolList!), Protocols: copyOf(protocols.filter((p) => !(isRecord(p) && gone.has(idText(p['Id-'] as Id))))) } as ProtocolList,
  };
}

// ---------------------------------------------------------------------------------------------------
// An activity described by its devices and keys, and put into a set of documents. `todo-touch.md` 8.2.
// ---------------------------------------------------------------------------------------------------

/**
 * **Logitech's `ActivityType`, by position**, `reference/logitech/data-model/model.md`: an activity's `Type` is the
 * position and its `SuggestedDisplay` the name, on every activity measured, `activities-and-buttons.md`, "An
 * activity: what it is made of". The Touch acts on the number (its default picture, the gesture pad's play and
 * pause target), and the engine only copies the name into an answer to other clients.
 */
export const ACTIVITY_TYPES = [
  'NotSpecified', 'WatchTV', 'WatchDvd', 'PlayGame', 'ListenToMusic', 'Custom', 'SurfWeb', 'WatchNetflix', 'MakeVideoCall',
  'WatchAppleTV', 'WatchRoku', 'PCTV', 'SmartTV', 'WatchFireTV', 'ListenToSonos', 'WatchApp', 'ListenToSpeaker',
] as const;
export type ActivityTypeName = (typeof ACTIVITY_TYPES)[number];

/**
 * **The `ActivityGroup` each type was measured with**, one activity of each of the five types the bench set holds:
 * the engine reads the group as an index into its own list of five, `VirtualGeneric`, `VirtualTelevisionN`,
 * `VirtualDvd`, `VirtualCdMulti` and `VirtualGameConsole`, and an activity without one makes its reader fail. A type
 * outside these five has no measured group, and `composeTouchActivity` refuses it rather than guessing one.
 */
export const ACTIVITY_GROUPS: Readonly<Partial<Record<ActivityTypeName, number>>> = {
  Custom: 0, WatchTV: 1, WatchDvd: 2, ListenToMusic: 3, PlayGame: 4,
};

/**
 * **The role kinds an activity of ours may give a device**: the ones the reference describes and the documents
 * measured hold, `activities-and-buttons.md`, "An activity: what it is made of". The smart TV, Roku, Sonos, speaker
 * and app roles take paths of their own in the engine and the screens that no document measured exercises, so they
 * are refused here rather than written.
 */
export const ACTIVITY_ROLE_KINDS = [
  'DisplayActivityRole', 'VolumeActivityRole', 'ChannelChangingActivityRole', 'PlayMovieActivityRole',
  'PlayMediaActivityRole', 'PlayGameActivityRole', 'PassThroughActivityRole',
] as const;
export type ActivityRoleKind = (typeof ACTIVITY_ROLE_KINDS)[number];

/**
 * The start screens an activity of ours may open on. `Commands` is the command list, the screens' fallback for any
 * value whose condition fails, `activities-and-buttons.md`, the table under "An activity: what it is made of".
 * `Favorites` and `Gesturepad` were added for `todo-touch.md` 8.6, the whole test setup, whose Watch TV opens on its
 * favourites and Watch a Blu-ray on its gesture screen: each is written only where what it needs is, the favourites
 * only on the tuning default activity with a channel changing role, the gesture screen only on a map with gestures,
 * `composeTouchActivity`. The others (Numpad, Trackpad, Nowplaying) each need something of the activity this composer
 * does not write, so they are refused until it does.
 */
export const ACTIVITY_START_SCREENS = ['Commands', 'Favorites', 'Gesturepad'] as const;

/**
 * **The gestures a map of ours may hold**: the five Logitech's documents put on each activity but the Custom one,
 * `activities-and-buttons.md`, "Gestures". The screens also name held and released gestures, `SwipeUpHold` and the
 * like, and index a table that has no entry for some of them with a long press, the lab's 6.10 note on the screens'
 * reads, row 184; no document measured holds one, so they are refused.
 */
export const GESTURE_KEYS = ['SwipeUp', 'SwipeDown', 'SwipeLeft', 'SwipeRight', 'Tap'] as const;
export type TouchGestureKey = (typeof GESTURE_KEYS)[number];

/**
 * **The client actions a button of ours may carry**: `Numpad`, which opens the number pad, the one the documents
 * measured hold (six maps, each on an entry labelled `123` of group 36). A client action sends nothing from the engine
 * and the screens act on it themselves, `activities-and-buttons.md`, "What a writer must carry".
 */
export const CLIENT_ACTIONS = ['Numpad'] as const;
export type TouchClientAction = (typeof CLIENT_ACTIONS)[number];

/**
 * **The function groups a button of ours may carry**: 0 the list, 2 the number pad and 36 the group that shares the
 * list's numbering, `activities-and-buttons.md`, "Screen entries and the number pad". Every button measured is in one
 * of the three; a key may carry 2 as well, as one key of the documents measured does.
 */
export const BUTTON_GROUPS = [0, 2, 36] as const;

/**
 * Screen labels that act by themselves rather than sending their command: the number pad, the gesture screen,
 * the Wii's disconnect, and the trackpad, which the activity page tests the same way, `activities-and-buttons.md`,
 * "Screen entries and the number pad". An entry of ours carrying one would not do what its description says.
 */
const ACTING_LABELS = ['123', 'Gesturepad', 'Disconnect Wii', 'Trackpad'] as const;

/** A device of an activity, by the name the device list shows, and what the activity does with it. */
export interface OwnActivityDevice {
  readonly device: string;
  /** Its roles, in the order written; the first makes its power on and input steps, the rest add their kind. */
  readonly roles: readonly ActivityRoleKind[];
  /** Its place in the power on order, and in the power off order; unique within the activity. */
  readonly powerOn: number;
  readonly powerOff: number;
  /** The input it is switched to, by the name its input feature gives it; none when absent. */
  readonly input?: string;
}

/** A command to a device of the documents, named as the device names it, matched without regard to case. */
export interface OwnActivityCommand {
  readonly device: string;
  readonly command: string;
}

/**
 * A step added by hand to an activity's start or end: a command, a pause in whole or part seconds, or, since 8.6, a
 * channel tuned through a device. `order` is the step's `ActionOrder`; its place in the list counting from 1 when
 * absent. The engine sorts the steps by it, `orderTableItems`, so only the order matters, and Logitech's client
 * numbers them in a way of its own, Switch Box's start from 4, which a description may keep.
 */
export type OwnActivityStep = (OwnActivityCommand | { readonly delaySeconds: number } | { readonly device: string; readonly channel: string })
  & { readonly order?: number };

/**
 * What a button of the ordered form does: a command to a device of the documents, a sequence of the same map by its
 * name, or a client action the screens act on.
 */
export type OwnPress = OwnActivityCommand | { readonly sequence: string } | { readonly client: TouchClientAction };

/**
 * **A button in the ordered form**, `todo-touch.md` 8.6: a key, a gesture or a screen entry, each in the place the
 * description gives it, so a map comes out with its buttons in the order Logitech's has them. One of `key`, `gesture`
 * and `entry` names the button; `entry` is the label the screen shows, and `index` its `IndexInMenu`, which the
 * description states, a repeated one included. `group` is the `FunctionGroupType`, 0 when absent.
 */
export interface OwnButton {
  readonly key?: TouchButtonKey;
  readonly gesture?: TouchGestureKey;
  readonly entry?: string;
  readonly index?: number;
  readonly group?: number;
  readonly press: OwnPress;
  readonly longPress?: OwnPress;
  readonly doublePress?: OwnPress;
}

/** A sequence of a map: its id, ours, its name, and its steps, commands and pauses in whole or part seconds. */
export interface OwnSequence {
  readonly id: number;
  readonly name: string;
  readonly steps: readonly (OwnActivityCommand | { readonly delaySeconds: number })[];
}

/** A key of the activity's map: the command its press sends, and its long press when one is wanted. */
export interface OwnActivityKey extends OwnActivityCommand {
  readonly longPress?: OwnActivityCommand;
}

/** An entry of the activity's command list: the label the screen shows and the command a tap sends. */
export interface OwnActivityEntry extends OwnActivityCommand {
  readonly label: string;
}

/**
 * An activity as a person describes it: its name and type, the devices it uses and what each does, the steps added
 * at its start and end, and what its keys and its screen list send. Every device and command is named as the
 * documents name it, so the composer can find each and refuse what it cannot.
 */
export interface OwnActivity {
  /** Ours, `OWN_IDS`; also what its map is named by. */
  readonly id: number;
  readonly name: string;
  readonly type: ActivityTypeName;
  readonly startScreen: (typeof ACTIVITY_START_SCREENS)[number];
  /** Its place on the activity list, 0 the first; after the last activity listed when absent. */
  readonly order?: number;
  readonly devices: readonly OwnActivityDevice[];
  readonly enter?: readonly OwnActivityStep[];
  readonly leave?: readonly OwnActivityStep[];
  readonly keys?: Readonly<Partial<Record<TouchButtonKey, OwnActivityKey>>>;
  readonly entries?: readonly OwnActivityEntry[];
  /** Whether the favourite channels belong to this activity, `IsTuningDefault`; false when absent. 8.6. */
  readonly tuningDefault?: boolean;
  /**
   * The map's buttons in the ordered form, in place of `keys` and `entries`, with gestures and sequences, 8.6. The
   * two forms are not mixed: a description gives one or the other.
   */
  readonly buttons?: readonly OwnButton[];
  readonly sequences?: readonly OwnSequence[];
}

/** What `composeTouchActivity` gives: the activity list's entry and its own map. */
export interface ComposedTouchActivity {
  readonly activity: Activity;
  readonly map: ButtonMap;
}

/** The two documents an activity is told to a Touch in, as `withTouchActivity` gives them back. */
export interface ActivityDocuments {
  readonly ActivityList: ActivityList;
  readonly MapList: MapList;
}

/**
 * The activity record and its own map, from a description and the documents whose devices it names.
 *
 * **What is written, and why only that.** Of an activity's 26 fields, the ones either program reads,
 * `activities-and-buttons.md`: the id, which the engine and the screens find it by and its map is named from;
 * `Name`; `Type` and `SuggestedDisplay`, from `ACTIVITY_TYPES`; `ActivityGroup`, which the engine indexes and fails
 * without, from `ACTIVITY_GROUPS`; `ActivityOrder`; `StartScreen`; `IsTuningDefault`, false unless the description gives
 * the favourites to the activity, 8.6, and `DefaultChannel` null, as on every activity measured; `ImageKey`, `BaseImageUri` and `Icon` null, so the screens
 * draw the default picture of its type, as for every activity measured; `ActivityDisplayName` and `Alternatives`
 * null, `IsMultiZone` false and `Zones` null; the roles; and the two step lists. Left out, as read by neither
 * program: `AccountId-`, `State`, `IsDefault`, `DateCreated`, `DateModified`, `DefaultStation` and
 * `DefaultStationName`; on a role its `Id-` and its input's `Id-`; on a step its `Id` and `TargetLevel`, which the
 * engine reads only when set and which belongs to a speaker group. A field stated by us is one more the remote can
 * send back to an account, as `composeTouchDevice` argues for a device.
 *
 * **The roles.** Each device's roles are written together, in the description's order, each stating the device's
 * power orders and input, as Logitech's documents do for a device with two roles; the engine takes the first role
 * of a device for its power and input steps. `NextDevicePowerOnDelay` is null, as on every role measured.
 *
 * **The map** is `16417Activity` and the id, the identifier the engine finds it by, with its keys and its screen
 * list as `composeTouchDevice` writes a device's: state 0, group 0, a press of event 1, the screen list numbered
 * from 0 in the order given, no gesture and no sequence. An activity of the `Custom` type carries no gestures in
 * the documents measured, and one of another type carries five there; this writes none for any type. **Or, since
 * 8.6, the ordered form**, `buttons` and `sequences`, written by `composeButtons` in the order given, gestures,
 * long and double presses, sequences and the number pad entry among them. A step may be a channel tuned through a
 * device, `ChannelActivityAction`, and may state its own order.
 *
 * **Refuses** what the remote would drop or do otherwise than described: an id not ours; a type with no measured
 * group; a start screen outside `ACTIVITY_START_SCREENS`, the favourites on an activity that does not own them or
 * owning them without a channel changing role, and the gesture screen on a map with no gesture; both map forms at
 * once, and sequences without the ordered form; no device, which hides the activity from the screens' home
 * list (it keeps only activities with roles); a device not in the documents or named twice there; a device given
 * twice; a role kind outside `ACTIVITY_ROLE_KINDS`; a device with no role; two devices sharing a power on or a power
 * off order, of which the engine keeps one; an input the device does not have, which the engine skips without a
 * word; a command a device does not have, on a step, a key or an entry; a key name the Touch's documents do not use;
 * a delay that is not a positive number; two steps of one list on one order; a channel step that is not digits or
 * names a device with no channel tuning; an empty label, two entries with one label, a label that acts by itself;
 * and whatever `composeButtons` refuses.
 */
export function composeTouchActivity(a: OwnActivity, documents: SyncDocuments): ComposedTouchActivity {
  if (!isOwnId(a.id)) throw new ComposeRefusal(`activity id ${a.id} is not one of ours, ${OWN_IDS.first} to ${OWN_IDS.last}`);
  const typeNumber = ACTIVITY_TYPES.indexOf(a.type);
  if (typeNumber < 0) throw new ComposeRefusal(`"${a.type}" is not one of Logitech's activity types`);
  const group = ACTIVITY_GROUPS[a.type];
  if (group === undefined) throw new ComposeRefusal(`no activity of the type ${a.type} has been measured, so its group is not known`);
  if (!(ACTIVITY_START_SCREENS as readonly string[]).includes(a.startScreen)) {
    throw new ComposeRefusal(`the start screen "${a.startScreen}" needs what this composer does not write; ${ACTIVITY_START_SCREENS.join(', ')} only`);
  }
  if (a.devices.length === 0) throw new ComposeRefusal('an activity with no device is left off the screens\' home list');
  if (a.buttons !== undefined && (a.keys !== undefined || a.entries !== undefined)) {
    throw new ComposeRefusal('a description gives its map as ordered buttons or as keys and entries, not both');
  }
  if (a.sequences !== undefined && a.buttons === undefined) throw new ComposeRefusal('sequences are given only with the ordered buttons');
  // The favourites belong to an activity with a channel changing role, through which they are tuned, and the screens
  // offer Favorites as a start screen only on that activity, `activities-and-buttons.md`, the table of fields.
  const channelRole = a.devices.some((d) => d.roles.includes('ChannelChangingActivityRole'));
  if (a.tuningDefault === true && !channelRole) throw new ComposeRefusal('the favourite channels belong to an activity with a channel changing role, and this one has none');
  if (a.startScreen === 'Favorites' && a.tuningDefault !== true) throw new ComposeRefusal('only the activity the favourite channels belong to opens on them');
  if (a.startScreen === 'Gesturepad' && !(a.buttons ?? []).some((b) => b.gesture !== undefined)) throw new ComposeRefusal('an activity opens on its gesture screen only when its map holds gestures');

  const read = readConfiguration(documents);
  // After the last activity listed when the description gives no place; `withTouchActivity` refuses a taken one.
  const listed = read.activities.flatMap((x) => (x.order === undefined ? [] : [x.order]));
  const order = a.order ?? (listed.length === 0 ? 0 : Math.max(...listed) + 1);
  // A device by the name the device list shows; a name two devices share cannot say which is meant.
  const deviceNamed = (name: string): ReadDevice => {
    const found = read.devices.filter((d) => d.name === name);
    if (found.length !== 1) throw new ComposeRefusal(`${found.length === 0 ? 'no device' : `${found.length} devices`} named "${name}" in the device list`);
    return found[0]!;
  };
  // A command as the device names it, found as the engine finds it: by name in lower case.
  const commandOf = (c: OwnActivityCommand): { readonly device: ReadDevice; readonly name: string } => {
    const device = deviceNamed(c.device);
    const command = device.commandsByName.get(c.command.toLowerCase());
    if (command?.name === undefined) throw new ComposeRefusal(`"${c.device}" has no command "${c.command}"`);
    return { device, name: command.name };
  };
  const stated = (d: ReadDevice): Id => d.source.Device['Id-'];

  const roles: Role[] = [];
  const seen = new Set<string>();
  const powerOn = new Set<number>();
  const powerOff = new Set<number>();
  for (const one of a.devices) {
    const device = deviceNamed(one.device);
    if (seen.has(device.id)) throw new ComposeRefusal(`"${one.device}" is given twice; give it all its roles once`);
    seen.add(device.id);
    if (one.roles.length === 0) throw new ComposeRefusal(`"${one.device}" is given no role`);
    for (const kind of one.roles) {
      if (!(ACTIVITY_ROLE_KINDS as readonly string[]).includes(kind)) throw new ComposeRefusal(`"${kind}" is not a role kind an activity of ours gives a device`);
    }
    for (const [orders, order, what] of [[powerOn, one.powerOn, 'power on'], [powerOff, one.powerOff, 'power off']] as const) {
      if (!Number.isInteger(order) || order < 1) throw new ComposeRefusal(`"${one.device}": its ${what} order is not a whole number from 1`);
      if (orders.has(order)) throw new ComposeRefusal(`two devices share ${what} order ${order}, of which the engine keeps one`);
      orders.add(order);
    }
    if (one.input !== undefined && !device.inputs.some((i) => i.name === one.input)) {
      throw new ComposeRefusal(`"${one.device}" has no input "${one.input}", which the engine would skip without a word`);
    }
    for (const kind of one.roles) {
      roles.push({
        __type: kind,
        'DeviceId-': stated(device),
        PowerOnOrder: one.powerOn,
        PowerOffOrder: one.powerOff,
        NextDevicePowerOnDelay: null,
        SelectedInput: one.input === undefined ? null : { Name: one.input, ChannelNumber: null },
      });
    }
  }

  // A step's `ActionOrder` counts from 1 in the order given, or is the description's own; a delay's `Duration` is in
  // seconds, as the engine reads it. Two steps of one list on one order would be one step, the engine keeping them in a
  // table by order, so that is refused.
  const steps = (xs: readonly OwnActivityStep[] | undefined): ActivityAction[] => {
    const orders = new Set<number>();
    return (xs ?? []).map((x, i): ActivityAction => {
      const order = x.order ?? i + 1;
      if (!Number.isInteger(order) || order < 1) throw new ComposeRefusal('a step\'s order is not a whole number from 1');
      if (orders.has(order)) throw new ComposeRefusal(`two steps share order ${order}, of which the engine keeps one`);
      orders.add(order);
      if ('delaySeconds' in x) {
        if (typeof x.delaySeconds !== 'number' || !(x.delaySeconds > 0)) throw new ComposeRefusal('a delay step is not a positive number of seconds');
        return { __type: 'DelayActivityAction', ActionOrder: order, Duration: x.delaySeconds };
      }
      if ('channel' in x) {
        // A channel is the digits a person types, kept as text as Logitech's documents keep it.
        if (typeof x.channel !== 'string' || !/^[0-9]+$/.test(x.channel)) throw new ComposeRefusal('a channel step names no channel of digits');
        const device = deviceNamed(x.device);
        if (device.channelTuning === undefined) throw new ComposeRefusal(`"${x.device}" has no channel tuning, so a channel step would send nothing`);
        return { __type: 'ChannelActivityAction', ActionOrder: order, ChannelNumber: x.channel, 'DeviceId-': stated(device) };
      }
      const c = commandOf(x);
      return { __type: 'CommandActivityAction', ActionOrder: order, CommandName: c.name, 'DeviceId-': stated(c.device) };
    });
  };
  const enter = steps(a.enter);
  const leave = steps(a.leave);

  const press = (c: OwnActivityCommand, event: number): ButtonActionDocument => {
    const found = commandOf(c);
    return { __type: 'ButtonCommandAction', EventType: event, Order: 0, CommandName: found.name, 'DeviceId-': stated(found.device) };
  };
  const known = new Set<string>(BUTTON_KEYS);
  const buttons: Button[] = [];
  let sequences: Sequence[] = [];
  if (a.buttons !== undefined) {
    // The ordered form, 8.6: the map's buttons in the description's order, with function ids, gestures and sequences.
    const map = composeButtons(a.buttons, a.sequences ?? [], (c) => {
      const found = commandOf(c);
      return { name: found.name, deviceId: stated(found.device), functionId: functionIdOf(found.device.commandsByName.get(found.name.toLowerCase())?.source) };
    });
    buttons.push(...map.buttons);
    sequences = map.sequences;
  }
  for (const [key, binding] of Object.entries(a.keys ?? {})) {
    if (!known.has(key)) throw new ComposeRefusal(`"${key}" is not a key name a Touch's documents use`);
    if (binding === undefined) continue;
    buttons.push({
      __type: 'HardRemoteButton',
      ButtonKey: key,
      ButtonState: 0,
      FunctionGroupType: LIST_GROUP,
      ButtonAction: press(binding, PRESS_EVENT),
      ButtonLongPressAction: binding.longPress === undefined ? null : press(binding.longPress, LONG_PRESS_EVENT),
      ButtonDoublePressAction: null,
    });
  }
  const labels = new Set<string>();
  (a.entries ?? []).forEach((e, index) => {
    if (typeof e.label !== 'string' || e.label.trim() === '') throw new ComposeRefusal('a screen entry has no label');
    if ((ACTING_LABELS as readonly string[]).includes(e.label)) throw new ComposeRefusal(`the label "${e.label}" acts by itself on the remote's screens`);
    if (labels.has(e.label)) throw new ComposeRefusal(`two screen entries are labelled "${e.label}"`);
    labels.add(e.label);
    buttons.push({
      __type: 'SoftRemoteButton',
      ButtonState: 0,
      FunctionGroupType: LIST_GROUP,
      TextOnRemote: e.label,
      MenuItem: { IndexInMenu: index },
      ButtonAction: press(e, PRESS_EVENT),
      ButtonLongPressAction: null,
      ButtonDoublePressAction: null,
    });
  });

  const activity: Activity = {
    'Id-': a.id,
    Name: a.name,
    Type: typeNumber,
    ActivityGroup: group,
    SuggestedDisplay: a.type,
    ActivityOrder: order,
    StartScreen: a.startScreen,
    IsTuningDefault: a.tuningDefault === true,
    DefaultChannel: null,
    ImageKey: null,
    BaseImageUri: null,
    Icon: null,
    ActivityDisplayName: null,
    Alternatives: null,
    IsMultiZone: false,
    Zones: null,
    Roles: roles,
    EnterActions: enter,
    LeaveActions: leave,
  };
  const map: ButtonMap = {
    __type: 'ActivityButtonMap',
    ButtonMapIdentifier: mapIdentifier('activity', idText(a.id)),
    'ActivityId-': a.id,
    Buttons: buttons,
    Sequences: sequences,
  };
  return { activity, map };
}

/**
 * The function id a command states, the catalogue's number for what the command does, under either of the two keys
 * Logitech's documents use for it, or undefined where it states none. **The screens read it on a button's action**,
 * under `FunctionId-` alone: a list entry's icon is the picture of that number, and the gesture screen finds the
 * device mode button to press by it, `activities-and-buttons.md`, "Gestures". In the documents measured every button
 * action naming a command that states one carries the command's number under `FunctionId-`, 530 of 530, and both
 * sequence steps carry 0, `touch-setup.test.ts`.
 */
export function functionIdOf(command: Command | undefined): number | undefined {
  if (command === undefined) return undefined;
  const id = command['FunctionId-'] ?? (command as Record<string, unknown>)['FunctionId'];
  return typeof id === 'number' ? id : undefined;
}

/** What `composeButtons` needs of a command: the name the device gives it, the device's id and its function id. */
export interface ResolvedCommand {
  readonly name: string;
  readonly deviceId: Id;
  readonly functionId: number | undefined;
}

/**
 * A map's buttons and sequences from the ordered form, `todo-touch.md` 8.6, for a device's own map and an activity's
 * alike: `resolve` finds a command as the map's kind finds it and refuses one it cannot. **What each button is
 * written with**, the fields either program reads, `activities-and-buttons.md`: its kind, `HardRemoteButton` for a
 * key, `GestureRemoteButton` for a gesture and `SoftRemoteButton` for an entry; `ButtonKey` for a key and a gesture;
 * `TextOnRemote` and `MenuItem.IndexInMenu` for an entry; `ButtonState` 0; `FunctionGroupType`; and its three actions,
 * null where none is given. A command action states `EventType` 1, 2 or 3 by which of the three it is, `Order` 0, the
 * command and the device, and the command's function id under `FunctionId-` where it states one, since the screens read
 * that key; a sequence action names the sequence's id, a client action its name. A sequence's steps are numbered by
 * `Order` from 1, which the engine sorts them by, a pause's `Duration` in seconds.
 *
 * **Left out, as read by neither program**, the table of `activities-and-buttons.md`, "What a writer must carry": a
 * button's `ButtonId`, `ImageId`, `ButtonImageKey`, `ButtonImagePath` and `MenuItem.MenuName`, and an action's `Id`.
 *
 * **Refuses** what the remote would drop or do otherwise: a button naming none or more than one of key, gesture and
 * entry; a key or gesture name the Touch's documents do not use; an entry without a label or a whole `index` from 0; a
 * group outside `BUTTON_GROUPS`; a key or gesture given twice, of which the engine keeps one; a client action other
 * than `Numpad`, or one on anything but an entry labelled `123`, which is how the screens find it; a label that acts by
 * itself on an entry that is not that; a sequence named twice, given an id twice or not ours, with no command step,
 * or with a pause that is not a positive number; and a button naming a sequence the map does not hold.
 */
export function composeButtons(
  given: readonly OwnButton[], ownSequences: readonly OwnSequence[], resolve: (c: OwnActivityCommand) => ResolvedCommand,
): { readonly buttons: Button[]; readonly sequences: Sequence[] } {
  const sequenceIds = new Map<string, number>();
  const ids = new Set<number>();
  const sequences: Sequence[] = ownSequences.map((s) => {
    if (sequenceIds.has(s.name)) throw new ComposeRefusal(`two sequences are named "${s.name}"`);
    if (!isOwnId(s.id) || ids.has(s.id)) throw new ComposeRefusal(`sequence "${s.name}": its id is not one of ours or is given twice`);
    sequenceIds.set(s.name, s.id);
    ids.add(s.id);
    if (!s.steps.some((x) => !('delaySeconds' in x))) throw new ComposeRefusal(`sequence "${s.name}" sends no command`);
    const actions: ButtonActionDocument[] = s.steps.map((x, i) => {
      if ('delaySeconds' in x) {
        if (typeof x.delaySeconds !== 'number' || !(x.delaySeconds > 0)) throw new ComposeRefusal(`sequence "${s.name}": a pause is not a positive number of seconds`);
        return { __type: 'ButtonDelayAction', EventType: PRESS_EVENT, Order: i + 1, Duration: x.delaySeconds };
      }
      // No function id on a step: Logitech's documents state 0 there on both steps measured, and nothing reads a
      // step's, the sequence being shown by its own picture, `style.lua`'s command button.
      return commandAction({ ...resolve(x), functionId: undefined }, PRESS_EVENT, i + 1);
    });
    return { SequenceId: s.id, Name: s.name, Actions: actions };
  });

  const action = (p: OwnPress | undefined, event: number, on: OwnButton): ButtonActionDocument | null => {
    if (p === undefined) return null;
    if ('sequence' in p) {
      const id = sequenceIds.get(p.sequence);
      if (id === undefined) throw new ComposeRefusal(`a button runs sequence "${p.sequence}", which the map does not hold`);
      return { __type: 'ButtonSequenceAction', EventType: event, Order: 0, SequenceId: id };
    }
    if ('client' in p) {
      if (!(CLIENT_ACTIONS as readonly string[]).includes(p.client)) throw new ComposeRefusal(`"${String(p.client)}" is not a client action a button of ours carries`);
      if (on.entry !== '123') throw new ComposeRefusal('the number pad opens from an entry labelled 123, which is how the screens find it');
      return { __type: 'ButtonClientAction', EventType: event, Order: 0, ActionName: p.client };
    }
    return commandAction(resolve(p), event, 0);
  };

  const keys = new Set<string>(BUTTON_KEYS);
  const gestures = new Set<string>(GESTURE_KEYS);
  const seen = new Set<string>();
  const buttons = given.map((b): Button => {
    const names = [b.key, b.gesture, b.entry].filter((x) => x !== undefined);
    if (names.length !== 1) throw new ComposeRefusal('a button is named by exactly one of a key, a gesture and an entry');
    const group = b.group ?? LIST_GROUP;
    if (!(BUTTON_GROUPS as readonly number[]).includes(group)) throw new ComposeRefusal(`group ${group} is not one a button of ours carries`);
    const actions = {
      ButtonAction: action(b.press, PRESS_EVENT, b),
      ButtonLongPressAction: action(b.longPress, LONG_PRESS_EVENT, b),
      ButtonDoublePressAction: action(b.doublePress, DOUBLE_PRESS_EVENT, b),
    };
    if (b.key !== undefined || b.gesture !== undefined) {
      const name = (b.key ?? b.gesture)!;
      if (b.key !== undefined && !keys.has(b.key)) throw new ComposeRefusal(`"${b.key}" is not a key name a Touch's documents use`);
      if (b.gesture !== undefined && !gestures.has(b.gesture)) throw new ComposeRefusal(`"${b.gesture}" is not a gesture a map of ours holds`);
      if (seen.has(name)) throw new ComposeRefusal(`"${name}" is given twice, of which the engine keeps one`);
      seen.add(name);
      return { __type: b.key !== undefined ? 'HardRemoteButton' : 'GestureRemoteButton', ButtonKey: name, ButtonState: 0, FunctionGroupType: group, ...actions };
    }
    const label = b.entry!;
    if (typeof label !== 'string' || label.trim() === '') throw new ComposeRefusal('a screen entry has no label');
    if (typeof b.index !== 'number' || !Number.isInteger(b.index) || b.index < 0) throw new ComposeRefusal(`entry "${label}" has no place in its list, a whole number from 0`);
    if ((ACTING_LABELS as readonly string[]).includes(label) && !(label === '123' && 'client' in b.press)) {
      throw new ComposeRefusal(`the label "${label}" acts by itself on the remote's screens`);
    }
    return {
      __type: 'SoftRemoteButton',
      ButtonState: 0,
      FunctionGroupType: group,
      TextOnRemote: label,
      MenuItem: { IndexInMenu: b.index },
      ...actions,
    };
  });
  return { buttons, sequences };
}

/** A double press, as Logitech's maps carry it on a gesture's double tap. */
const DOUBLE_PRESS_EVENT = 3;

/** A command action: the event by which press it is, its order, the command, its device and its function id. */
function commandAction(c: ResolvedCommand, event: number, order: number): ButtonActionDocument {
  return {
    __type: 'ButtonCommandAction',
    EventType: event,
    Order: order,
    CommandName: c.name,
    'DeviceId-': c.deviceId,
    ...(c.functionId === undefined ? {} : { 'FunctionId-': c.functionId }),
  };
}

/**
 * The engine reads a hard key of an activity map whose identifier holds `16420` as a keyboard key and looks its
 * code up by the key's lowered name, `check.ts`; an identifier of ours must never take that path by accident.
 */
const KEYBOARD_MAP_MARK = '16420';

/**
 * `documents` with the composed activity added: its entry at the end of `ActivityList`, at the place on the list
 * `composeTouchActivity` gave it, and its map at the end of `MapList`, after the activity maps,
 * where Logitech's documents keep them. The other four documents are not touched, and nothing is changed in place.
 *
 * **Refuses**, by what collides and never quoting a document's value: either list missing; an activity id not ours,
 * or one an activity or a device already has; a map identifier already in `MapList`, or one holding `16420`; a name
 * another activity has, compared without regard to case, since the list shows activities by name and a person picks
 * one by it; and a place on the list that is negative, which hides the activity, or one another activity holds, of
 * which the screens keep only the later.
 */
export function withTouchActivity(documents: SyncDocuments, composed: ComposedTouchActivity): ActivityDocuments {
  const activities = listIn(documents.ActivityList, 'Activities');
  const maps = listIn(documents.MapList, 'ButtonMaps');
  if (activities === undefined) throw new ComposeRefusal('ActivityList holds no list of activities');
  if (maps === undefined) throw new ComposeRefusal('MapList holds no list of maps');

  const id = idText(composed.activity['Id-']);
  if (!isOwnId(composed.activity['Id-'])) throw new ComposeRefusal(`activity id ${id} is not one of ours, ${OWN_IDS.first} to ${OWN_IDS.last}`);
  const idOf = (x: unknown): string => (isRecord(x) ? idText(x['Id-'] as Id) : '');
  if (activities.some((x) => idOf(x) === id)) throw new ComposeRefusal(`activity id ${id} is already listed`);
  if ((listIn(documents.DeviceList, 'DevicesWithFeatures') ?? []).some((d) => deviceIdOf(d) === id)) throw new ComposeRefusal(`activity id ${id} is a listed device's id`);
  const identifier = composed.map.ButtonMapIdentifier;
  if (typeof identifier !== 'string' || identifier.includes(KEYBOARD_MAP_MARK)) {
    throw new ComposeRefusal(`the map identifier ${String(identifier)} would be read as a keyboard map`);
  }
  if (maps.some((m) => isRecord(m) && m['ButtonMapIdentifier'] === identifier)) throw new ComposeRefusal(`MapList already holds a map ${identifier}`);
  const name = composed.activity.Name;
  if (typeof name === 'string' && activities.some((x) => isRecord(x) && typeof x['Name'] === 'string' && x['Name'].toLowerCase() === name.toLowerCase())) {
    throw new ComposeRefusal(`a listed activity is already named "${name}"`);
  }
  const orders = activities.flatMap((x) => (isRecord(x) && typeof x['ActivityOrder'] === 'number' ? [x['ActivityOrder']] : []));
  const order = composed.activity.ActivityOrder;
  if (typeof order !== 'number' || !Number.isInteger(order) || order < 0) throw new ComposeRefusal(`place ${order} on the activity list is not a whole number from 0, and a negative one hides the activity`);
  if (orders.includes(order)) throw new ComposeRefusal(`place ${order} on the activity list is another activity's, and the screens keep only one of the two`);

  return {
    ActivityList: { ...copyOf(documents.ActivityList!), Activities: [...copyOf(activities), copyOf(composed.activity)] } as ActivityList,
    MapList: { ...copyOf(documents.MapList!), ButtonMaps: [...copyOf(maps), copyOf(composed.map)] } as MapList,
  };
}

/**
 * `documents` with an activity of ours taken out again: its entry and its own map. **The exact inverse of
 * `withTouchActivity`** for an activity nothing else names; the general removal is 8.5's, `withoutTouchActivities` in
 * `remove.ts`. So this refuses an activity that is not ours, one the
 * activity list does not hold, the tuning default, whose favourites live in documents of their own, and one that a
 * button of another map starts, by its `ActivityId-`: removing it would leave that button pointing at nothing.
 */
export function withoutTouchActivity(documents: SyncDocuments, activityId: Id): ActivityDocuments {
  const id = idText(activityId);
  if (!isOwnId(activityId)) throw new ComposeRefusal(`activity id ${id} is not one of ours, so it is not taken out here`);
  const activities = listIn(documents.ActivityList, 'Activities');
  const maps = listIn(documents.MapList, 'ButtonMaps');
  if (activities === undefined || maps === undefined) throw new ComposeRefusal('an activity or map list is missing');
  const at = activities.findIndex((x) => isRecord(x) && idText(x['Id-'] as Id) === id);
  if (at < 0) throw new ComposeRefusal(`activity id ${id} is not listed`);
  if (isRecord(activities[at]) && activities[at]['IsTuningDefault'] === true) throw new ComposeRefusal(`activity ${id} tunes the favourites`);
  const identifier = mapIdentifier('activity', id);
  const startsIt = (x: unknown): boolean => {
    if (Array.isArray(x)) return x.some(startsIt);
    if (!isRecord(x)) return false;
    if ('ActivityId-' in x && kindOf(x as { __type?: unknown }) === 'ButtonActivityAction' && idText(x['ActivityId-'] as Id) === id) return true;
    return Object.values(x).some(startsIt);
  };
  if (maps.some((m) => isRecord(m) && m['ButtonMapIdentifier'] !== identifier && startsIt(m))) throw new ComposeRefusal(`a button of another map starts activity ${id}`);
  return {
    ActivityList: { ...copyOf(documents.ActivityList!), Activities: copyOf(activities.filter((_, i) => i !== at)) } as ActivityList,
    MapList: { ...copyOf(documents.MapList!), ButtonMaps: copyOf(maps.filter((m) => !(isRecord(m) && m['ButtonMapIdentifier'] === identifier))) } as MapList,
  };
}
