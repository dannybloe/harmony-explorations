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
 * **Nothing here sends anything.** No write path to a Touch exists, decision 29; these are documents.
 */
import type {
  Button, ButtonActionDocument, ButtonMap, Command, Device, DeviceWithFeatures, Id, IrProtocol,
} from './documents.ts';
import { INFRARED_TRANSPORT, mapIdentifier } from './read.ts';
import { idText } from './documents.ts';
import { definitionOfRow, isDefinitionRefusal, keyCodeText } from './definition.ts';
import { rawOfLearned, rhythmOfLearned, type LearnedRaw, type LearnedRow } from './learned.ts';
import type { Pulse } from '../irframe.ts';
import type { StatedCode, StatedItem } from '../stated.ts';

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
  const raw = (refusal: string): LearnedCommandCode => {
    return { code: { kind: 'raw', raw: rawOfLearned(train, carrierHz) }, learned, refusal };
  };
  // The carrier is left to the row: a learned carrier is measured and seldom gives the row's period exactly,
  // and the Touch rounds whichever carrier it is given to within a nanosecond of the row's.
  const definition = definitionOfRow(learned.row, protocolId, { bits: learned.bits });
  if (isDefinitionRefusal(definition)) return raw(definition.refusal);
  const frame: StatedItem = { kind: 'frame', frame: { value: learned.value, bits: learned.bits, index: 0 } };
  const stated: StatedCode = {
    family: definition.Name,
    items: [frame],
    frames: [frame.frame],
    words: [],
    bits: learned.bits,
    groups: [[], [frame], []],
  };
  const keyCode = keyCodeText(stated, definition);
  if (typeof keyCode !== 'string') return raw(keyCode.refusal);
  return { code: { kind: 'stated', protocol: definition, keyCode }, learned };
}
