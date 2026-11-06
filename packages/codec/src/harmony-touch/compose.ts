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
 * under identifiers of ours, `OWN_IDS`, and `withoutTouchDevice` takes them out again.
 *
 * **Nothing here sends anything**: these are documents. This said no write path to a Touch existed, decision
 * 29, which stopped being true when the answerer of `todo-touch.md` 6.6 delivered sets to the bench
 * Touch; the answerer is `packages/corpus/src/touchsync.ts`.
 */
import type {
  Button, ButtonActionDocument, ButtonMap, Command, Device, DeviceList, DeviceWithFeatures, Id, IrProtocol, MapList,
  ProtocolList, SyncDocuments,
} from './documents.ts';
import { INFRARED_TRANSPORT, mapIdentifier } from './read.ts';
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
 * every activity, map and favourite naming it, is 8.5's. So this refuses a device that is not one of ours, one
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
