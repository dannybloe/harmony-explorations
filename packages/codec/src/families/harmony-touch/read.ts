/**
 * A typed view of a Harmony Touch's configuration, read out of the documents of one sync.
 *
 * **What this is for.** A Touch keeps its configuration as Logitech's JSON documents, `documents.ts`, and
 * those documents say a great deal that the remote ignores and leave unsaid several things the remote
 * decides for itself: which command a button sends when two commands differ only in case, which of two
 * screen entries on one index survives, what a setting is when the account states no value. This module
 * answers each of those the way the reference says the remote answers it, so that a reader of a Touch's
 * configuration, FreeHarmony's first among them, sees what the remote sees and not what the documents
 * happen to spell.
 *
 * **A view, never a copy.** Every object here keeps `source`, the document object it was read from, and
 * `path`, where in its document that object sits. Nothing is copied out and nothing is mutated, so the
 * documents stay the record and a writer writes them, carrying every field this view leaves untyped: the
 * remote's own screens send these documents back whole, `devices-and-infrared.md` and
 * `activities-and-buttons.md`, "What a writer must carry", and a field dropped on the way through is a field
 * the service no longer holds.
 *
 * **Where a rule lives.** Each rule the remote applies is stated once, in the function that applies it, with
 * the reference section it comes from in its comment. What the remote would refuse or ignore is not decided
 * here: `check.ts` reports it, from this view. The view itself never refuses; a document missing a field the
 * remote requires still reads, with the field `undefined`, so the check can say so. **That holds for a
 * malformed document too**: an entry of a list that is null or not an object is skipped where it stands,
 * keeping the paths of the entries after it, and a device entry without its `Device` record reads as one
 * stating nothing. Each skip is the view's choice and not the remote's, whose reaction to such a document is
 * not checked; no document measured holds one.
 *
 * **One reading of the catalogue's notation.** A command's key code is Logitech's catalogue notation, and the
 * codec already reads that notation, `statedCodeOfDefinition` in `archive.ts` over `statedCode` in
 * `stated.ts`. This module calls it rather than parsing the notation again: the `code-for-a-family` rule is
 * one derivation per fact. The Touch's own reading of a key code, segment ids by the digit before an `x` and
 * words by themselves, is the same mapping `segmentIdOf` and `segmentRefs` state, and
 * `devices-and-infrared.md` states the segment naming rule in the words `segmentRefs` implements. Where the
 * codec's reader declines a code, `code` is `undefined` here; the Touch's engine might still send it, and
 * which codes those are is not checked beyond the recordings, where the codec reads every one.
 *
 * **The scope is the reference's**: one firmware build, 4.15.330, and the documents of the syncs recorded,
 * seven infrared devices, five activities, one favourites activity. A field or a kind the recordings never
 * held, a Sonos, Roku or speaker role, a learned raw code, a home control action, is carried as `source` and
 * typed no further than its kind.
 */
import {
  keyCodeOfStatedCode, periodOfCarrier, segmentRefs, statedCodeOfDefinition, roundedPeriodOfCarrier,
  type ArchiveKeyCode, type ArchiveProtocol,
} from '../../catalogue/archive.ts';
import type { StatedProtocol } from '../../infrared/protocols.ts';
import { statedProtocol, type StatedCode } from '../../infrared/stated.ts';
import {
  CONFIGURATION_DOCUMENTS, CONTENT_DEVICE, CONTENT_SERVICE, CONTENT_USER, idText, kindOf,
  type Activity, type ActivityAction, type Button, type ButtonActionDocument, type ButtonMap, type Channel,
  type Command, type ContentDevice, type ContentService, type ContentUser, type Context, type Device,
  type DeviceFeature, type DeviceWithFeatures, type DialPosition, type FeatureAction, type Input, type IrProtocol,
  type Role, type Sequence, type Setting, type Settings, type SyncDocuments,
} from './documents.ts';

// ---------------------------------------------------------------------------------------------------
// The constants the remote's firmware states
// ---------------------------------------------------------------------------------------------------

/**
 * The identifier the Touch's screens send with every press, so the prefix of every map identifier the
 * engine can find: `16417Device<device>` and `16417Activity<activity>`, `activities-and-buttons.md`, "How a
 * key press becomes a command", step 3. The hubs' screens send another number; this is the Touch's.
 */
export const SCREENS_IDENTIFIER = '16417';

/** The number pad's `FunctionGroupType`: entries kept apart from the list and drawn on the number pad screen. */
export const NUMBER_PAD_GROUP = 2;

/** `ButtonState` 4, an entry deleted on the remote and kept in the document, hidden by the screens. */
export const DELETED_ON_REMOTE = 4;

/**
 * How many times a press repeats the code when the device states no count, or a negative one: the engine's
 * own 3, `devices-and-infrared.md`, "From a key press to the lamp".
 */
export const DEFAULT_PRESS_REPEATS = 3;

/**
 * The one transport number the documents measured hold for an infrared command and an infrared device, 1
 * on all 373 commands and 7 devices of the full sync. The engine sends a command over Bluetooth, a keyboard
 * or the network by its `TransportType` and over infrared otherwise; the numbers of the other three are not
 * stated in the reference, so only this one is named.
 */
export const INFRARED_TRANSPORT = 1;

/**
 * The names the number pad screen places on a key, besides the digits: the four on the key left of 0 and
 * the four on the key right of it, `activities-and-buttons.md`, "Screen entries and the number pad". An
 * entry of any other name is placed on no key.
 */
export const NUMBER_PAD_LEFT = ['-', '.', '*', 'NumberPlus'] as const;
export const NUMBER_PAD_RIGHT = ['Enter', 'NumberEnter', '#', 'ENT'] as const;

/** The number pad key a command name lands on, or `undefined` for one placed on no key. */
export function numberPadKey(commandName: string): string | 'left of 0' | 'right of 0' | undefined {
  if (/^\d$/.test(commandName)) return commandName;
  if ((NUMBER_PAD_LEFT as readonly string[]).includes(commandName)) return 'left of 0';
  if ((NUMBER_PAD_RIGHT as readonly string[]).includes(commandName)) return 'right of 0';
  return undefined;
}

// ---------------------------------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------------------------------

/** Where an object sits in its document, as a path a person can follow, and the document it is in. */
export interface Place {
  readonly document: string;
  readonly path: string;
}

/** A code family's definition, as the protocol list states it. */
export interface ReadProtocol extends Place {
  readonly id: string;
  readonly name: string;
  readonly carrierHz: number | null;
  /**
   * The carrier period as a Touch sends it, **rounded** to the nearest nanosecond, a half to the even one, where a compiled
   * configuration truncates it, `devices-and-infrared.md`, "How a code becomes durations":
   * `roundedPeriodOfCarrier`. Inferred there from the engine's conversion routine and not measured on the lamp.
   */
  readonly periodNs: number | undefined;
  /** The same carrier as a compiled configuration states it, truncated, `periodOfCarrier`. */
  readonly compiledPeriodNs: number | undefined;
  /**
   * The rhythm table's row for this family at the compiled carrier, `statedProtocol`, or `undefined` where
   * the table has none: the table is measured off compiled configurations and keyed by the truncated period,
   * so that is the period it is asked with.
   */
  readonly tableEntry: StatedProtocol | undefined;
  /** The definition in the shape `archive.ts` reads, so every reader of the catalogue applies to it. */
  readonly archive: ArchiveProtocol;
  readonly source: IrProtocol;
}

/** One command of a device. */
export interface ReadCommand extends Place {
  /** `undefined` for a command stating no name, which no button can then reach. */
  readonly name: string | undefined;
  readonly keyCode: string | null | undefined;
  readonly protocolId: string;
  /** The family the command names, or `undefined` when the list holds none of that id: it then sends nothing. */
  readonly protocol: ReadProtocol | undefined;
  readonly transportType: number | undefined;
  /** A learned raw code, `F` and the carrier and the durations in hexadecimal; null on every command measured. */
  readonly raw: string | null | undefined;
  /**
   * The key code read by the codec's one reader of the notation, or `undefined` where that reader declines
   * it or there is no definition to read it against.
   *
   * **Each value's width, `frames[].bits`, is the one the Touch sends it at**: the `NumberOfBits` of the
   * segment the value names, `devices-and-infrared.md`, "How a code becomes durations", and never the number
   * in the family's name, which is where the codec's reader would otherwise take it from for a definition
   * the archive has not annotated. `archiveProtocolOf` is what makes that so. **The values are as the code
   * writes them**: one wider than its segment is cut from the left by the remote for `EncodingType` 0 and 1,
   * and that cut is `withStatedWidths` in `archive.ts`, not applied here.
   */
  readonly code: StatedCode | undefined;
  /**
   * The segments each of the code's three groups names, start, repeat and finish, resolved against the
   * definition by the naming rule the Touch applies; `undefined` where a group names a segment the definition
   * does not hold.
   */
  readonly segments: ArchiveKeyCode | undefined;
  readonly source: Command;
}

/** One step of a device feature's list: a press of a command, a delay, a state step. */
export interface ReadFeatureAction extends Place {
  readonly kind: string;
  readonly order: number | undefined;
  readonly commandName: string | undefined;
  /** How long a press holds the code, in milliseconds, when it states one. */
  readonly durationMs: number | null | undefined;
  readonly delayMs: number | undefined;
  readonly source: FeatureAction;
}

/**
 * A device's power, `devices-and-infrared.md`, "Delays a device states". `PowerTypeId` 0 or 3 is a device
 * powered by hand, which gets neither power step; 1 makes power two discrete states and 2 one that steps.
 */
export interface ReadPower extends Place {
  readonly typeId: number | undefined;
  readonly byHand: boolean;
  /** Suppresses the power off only; the power on is still sent. */
  readonly alwaysOn: boolean;
  /** Left on when the next activity does not use it. */
  readonly keptOnBetweenActivities: boolean;
  /** Goes on the device's last power on command, holding back that device's next command only. */
  readonly onDelayMs: number | undefined;
  /** Replaces the power on delay when an activity selects an input marked `IsOnline`. */
  readonly connectedAppOnDelayMs: number | undefined;
  readonly on: readonly ReadFeatureAction[];
  readonly off: readonly ReadFeatureAction[];
  readonly toggle: readonly ReadFeatureAction[];
  readonly source: DeviceFeature;
}

export interface ReadInput extends Place {
  readonly name: string;
  readonly order: number | undefined;
  /** Marks an input whose selection takes the connected app power on delay. */
  readonly online: boolean;
  readonly actions: readonly ReadFeatureAction[];
  readonly source: Input;
}

/**
 * How a device is told a channel number, `favourites-and-settings.md`, "How a favourite becomes key
 * presses": its start list, the number padded with zeros to `fixedDigits`, a prefix before a number of 10
 * or more and another before one of 100 or more, and its finish list.
 */
export interface ReadChannelTuning extends Place {
  readonly fixedDigits: number | null | undefined;
  readonly start: readonly ReadFeatureAction[];
  readonly greaterTen: readonly ReadFeatureAction[];
  readonly greaterHundred: readonly ReadFeatureAction[];
  readonly finish: readonly ReadFeatureAction[];
  readonly source: DeviceFeature;
}

export interface ReadDevice extends Place {
  readonly id: string;
  readonly name: string | undefined;
  readonly manufacturer: string | undefined;
  readonly model: string | undefined;
  readonly deviceType: number | undefined;
  readonly transport: number | undefined;
  /** 0 the remote's own lamp, any other value a hub or its blasters. Taken as it stands, no default. */
  readonly controlPort: number | undefined;
  /** `PressMinRepeats`, or 3 when it is null or negative: how many times a press repeats the code. */
  readonly pressRepeats: number;
  /** The wait after a command before the next one to the same device, when commands go as a list. */
  readonly interKeyDelayMs: number | undefined;
  /** The silence this device needs after another device's last command, and the packet's silence field. */
  readonly interDeviceDelayMs: number | undefined;
  readonly commands: readonly ReadCommand[];
  /**
   * The commands as the engine keeps them: by name in lower case, **the later of two names that differ only
   * in case winning**, `devices-and-infrared.md`, "From a key press to the lamp", step 1.
   *
   * Two limits, both stated rather than handled. **The reference excepts a device that is both a network and
   * an infrared device**, which keeps its commands otherwise, and no document measured holds one; such a
   * device is folded like any other here. **And the fold is JavaScript's `toLowerCase`**, which lowers every
   * letter Unicode knows, where the engine runs on Lua 5.1, whose own `string.lower` lowers byte by byte
   * through the C library and in the default C locale touches only ASCII; which routine the engine folds
   * with is not stated in the reference. So two names differing only in the case of a letter outside ASCII
   * are one name here and may be two on the remote; every name measured is ASCII.
   */
  readonly commandsByName: ReadonlyMap<string, ReadCommand>;
  readonly power: ReadPower | undefined;
  readonly inputs: readonly ReadInput[];
  /** An input's own delay, which replaces the inter key delay for its command when longer. */
  readonly inputDelayMs: number | undefined;
  readonly channelTuning: ReadChannelTuning | undefined;
  /** The other features, a state of the device's own or its outputs, carried by kind. */
  readonly otherFeatures: readonly DeviceFeature[];
  readonly contentProfileKey: string | undefined;
  readonly deviceProfileUri: string | null | undefined;
  /** The device's own map, device mode's, found by the identifier the engine builds; `undefined` when none is. */
  readonly map: ReadMap | undefined;
  readonly source: DeviceWithFeatures;
}

/**
 * A button's action. A command names a device and a command by name, matched case blind; a sequence names a
 * sequence of the same map by id; a client action is the screens' own (`Numpad` opens the number pad); a
 * delay is a sequence step, its `Duration` in seconds and given here in milliseconds, as both of the
 * engine's readers multiply it by 1000.
 */
export interface ReadButtonAction extends Place {
  readonly kind: 'command' | 'sequence' | 'client' | 'delay' | 'other';
  readonly type: string;
  readonly deviceId: string | undefined;
  readonly device: ReadDevice | undefined;
  readonly commandName: string | undefined;
  /** The command the engine finds, by name in lower case on the action's device; `undefined` when it finds none. */
  readonly command: ReadCommand | undefined;
  readonly functionId: number | undefined;
  readonly sequenceId: string | undefined;
  readonly actionName: string | undefined;
  readonly order: number | undefined;
  readonly durationMs: number | undefined;
  readonly source: ButtonActionDocument;
}

/**
 * One button of a map: a key by its name, a screen entry by its place in the list, a number pad entry, or
 * a gesture.
 */
export interface ReadButton extends Place {
  readonly kind: 'key' | 'entry' | 'number pad' | 'gesture' | 'other';
  readonly type: string;
  readonly key: string | undefined;
  /** A screen entry's `IndexInMenu`; the screens show it as entry `index + 1`. */
  readonly index: number | undefined;
  /** The label the screens show on a screen entry; the engine never reads it. */
  readonly label: string | undefined;
  readonly group: number | undefined;
  readonly state: number | undefined;
  /** Marked 4: hidden from the screens' lists, and still sent by a key, since nothing else reads the mark. */
  readonly deletedOnRemote: boolean;
  /**
   * What a short press does. **A button holding only a long press action is treated as if that were its
   * short action**, `activities-and-buttons.md`, "Holding a key, and the long press", so such a button's long
   * press is here and `longPress` is `undefined`.
   */
  readonly press: ReadButtonAction | undefined;
  /** Fires on the first hold report at least 550 ms after the press; the press then sends nothing on going down. */
  readonly longPress: ReadButtonAction | undefined;
  /** Used by the engine only on home control rocker keys; a gesture's double tap is the screens' doing. */
  readonly doublePress: ReadButtonAction | undefined;
  readonly source: Button;
}

export interface ReadSequence extends Place {
  readonly id: string;
  readonly name: string | undefined;
  /** In `Order`; a step without one stops the engine's reader, which `check.ts` reports. */
  readonly steps: readonly ReadButtonAction[];
  readonly source: Sequence;
}

export interface ReadMap extends Place {
  /** The map's `__type`, a device's or an activity's; the engine does not find a map by it. */
  readonly kind: 'device' | 'activity' | 'other';
  readonly identifier: string | undefined;
  /**
   * The device or activity the map's own `DeviceId-` or `ActivityId-` names. **The engine stores the field
   * and never uses it**, `activities-and-buttons.md`, "What a writer must carry", so it decides nothing
   * here: it is carried for a reader that wants to compare it with `owner`.
   */
  readonly statedOwnerId: string | undefined;
  /**
   * The device or activity a press reaches this map from: the one whose identifier, `mapIdentifier`, is
   * exactly this map's. "How a key press becomes a command", step 4: the engine finds a map by that
   * identifier and nothing else, its retry without the `16417` prefix never reached. `undefined` when the
   * identifier names no device and no activity of the configuration.
   */
  readonly owner: { readonly kind: 'device' | 'activity'; readonly id: string } | undefined;
  /**
   * Whether a press can reach this map, which is `owner` being set. **Two maps under one identifier** are a
   * case the reference does not state: both count as reachable here, and the device or activity is given
   * the later, as a table keyed by identifier would keep it.
   */
  readonly reachable: boolean;
  readonly buttons: readonly ReadButton[];
  readonly keys: readonly ReadButton[];
  readonly numberPad: readonly ReadButton[];
  readonly gestures: readonly ReadButton[];
  /**
   * The list entries as the engine and the screens both keep them, by index, **the later of two on one index
   * winning**, `activities-and-buttons.md`, "Screen entries and the number pad", the second trap.
   */
  readonly entries: ReadonlyMap<number, ReadButton>;
  /** The entries an index repeated later overwrote: on neither the screen nor in the engine's table. */
  readonly shadowed: readonly ReadButton[];
  readonly sequences: readonly ReadSequence[];
  readonly source: ButtonMap;
}

export interface ReadRole extends Place {
  readonly kind: string;
  readonly deviceId: string;
  readonly device: ReadDevice | undefined;
  readonly powerOnOrder: number | undefined;
  readonly powerOffOrder: number | undefined;
  /** When a number, a wait after the device's power on, passed on without the multiplication by 1000. */
  readonly nextDevicePowerOnDelay: number | null | undefined;
  readonly input: string | null | undefined;
  /** Whether `input` names one of the device's inputs: a name that does not is skipped without a word. */
  readonly inputKnown: boolean;
  /** When set, a channel step after the input. */
  readonly channelNumber: string | number | null | undefined;
  readonly source: Role;
}

/**
 * One device of an activity as the engine sets it up: **the first role naming a device makes its power on
 * step and its input step**, and a further role of the same device adds only its role kind,
 * `activities-and-buttons.md`, "An activity: what it is made of".
 */
export interface ReadActivityDevice {
  readonly deviceId: string;
  readonly device: ReadDevice | undefined;
  readonly role: ReadRole;
  readonly kinds: readonly string[];
}

/** A step added by hand to an activity's start or end: a command, a delay in milliseconds, or a channel. */
export interface ReadActivityStep extends Place {
  readonly kind: 'command' | 'delay' | 'channel' | 'other';
  readonly type: string;
  readonly order: number | undefined;
  readonly deviceId: string | undefined;
  readonly device: ReadDevice | undefined;
  readonly commandName: string | undefined;
  readonly command: ReadCommand | undefined;
  readonly durationMs: number | undefined;
  readonly channelNumber: string | number | undefined;
  readonly source: ActivityAction;
}

export interface ReadActivity extends Place {
  readonly id: string;
  readonly name: string | undefined;
  /** The kind the Touch acts on, a position in Logitech's `ActivityType`: 1 `WatchTV`, 5 `Custom`. */
  readonly type: number | undefined;
  /** Not `type`; only copied into an answer to other clients. */
  readonly group: number | null | undefined;
  readonly order: number | undefined;
  /** A negative `ActivityOrder` hides the activity from the list. */
  readonly hidden: boolean;
  readonly tuningDefault: boolean;
  readonly startScreen: string | null | undefined;
  readonly defaultChannel: string | number | null | undefined;
  readonly roles: readonly ReadRole[];
  /** The activity's devices in the order the engine powers them on, by the first role naming each. */
  readonly devices: readonly ReadActivityDevice[];
  /** `EnterActions` in `ActionOrder`, those without one last. */
  readonly enter: readonly ReadActivityStep[];
  readonly leave: readonly ReadActivityStep[];
  readonly map: ReadMap | undefined;
  readonly source: Activity;
}

/** One favourite channel, a station, filled the way the remote fills it. */
export interface ReadFavourite {
  readonly station: string;
  /** The number sent, as text of digits: the dial position's, else the line up's for the station. */
  readonly number: string | undefined;
  /**
   * Where `number` is stated: a dial position of the device's document or a channel of the line up. The
   * service's key in the device's document is the account's and is written `*`; `ReadFavourites.serviceId`
   * holds it.
   */
  readonly numberAt: Place | undefined;
  /** The name shown: the dial position's, else the line up's short name. */
  readonly name: string | undefined;
  /** Added by hand: its number, name and picture come from the dial position alone. */
  readonly added: boolean;
  /** The address the remote asks for this favourite's picture at, or `undefined` for a channel added by hand with none. */
  readonly logo: string | undefined;
  readonly dial: DialPosition | undefined;
  readonly channel: Channel | undefined;
}

/**
 * The favourites of one activity, `favourites-and-settings.md`, "Favourite channels": the order from the
 * user's document, each number, name and picture from the tuning device's document, and what that leaves
 * out from the provider's line up.
 */
export interface ReadFavourites {
  readonly activity: ReadActivity;
  readonly device: ReadDevice | undefined;
  readonly tuning: ReadChannelTuning | undefined;
  /** The service the favourites are under: the first key under the device's profile key in the user's document. */
  readonly serviceId: string | undefined;
  /** The three addresses the remote asks for, each `undefined` where the documents do not name it. */
  readonly addresses: { readonly user: string | undefined; readonly device: string | undefined; readonly service: string | undefined };
  /** The addresses the remote would ask for that the sync did not hold. */
  readonly missing: readonly string[];
  readonly favourites: readonly ReadFavourite[];
  readonly user: ContentUser | undefined;
  readonly deviceDocument: ContentDevice | undefined;
  readonly service: ContentService | undefined;
}

/** A setting's value and where it came from: the account's first value, the row's default, or the firmware's. */
export interface SettingValue<T> {
  readonly value: T | undefined;
  readonly from: 'account' | 'row default' | 'firmware';
}

export interface ReadSettings extends Place {
  /** The model name on the About screen; the firmware's own when empty. */
  readonly remoteName: string | null | undefined;
  readonly userImageBucketUri: string | null | undefined;
  readonly defaultImageBucketUri: string | null | undefined;
  /** The background's name: one of the user's own, or one of nine built in; the firmware's default is a built in one. */
  readonly background: SettingValue<string>;
  readonly userImages: readonly string[];
  readonly twelveHourClock: SettingValue<boolean>;
  readonly screenBrightness: SettingValue<number>;
  readonly screenTimeout: SettingValue<number>;
  readonly screenLock: SettingValue<boolean>;
  readonly editLock: SettingValue<boolean>;
  readonly keyBrightness: SettingValue<number>;
  readonly motionSensor: SettingValue<boolean>;
  readonly vibration: SettingValue<boolean>;
  readonly vibrationEffect: SettingValue<string>;
  readonly activityPressDuration: SettingValue<number>;
  /** Every row by name, those the remote reads and the two it never does, `IsWiFiEnabled` and `TimeZoneFlag`. */
  readonly rows: ReadonlyMap<string, Setting>;
  readonly source: Settings;
}

export interface ReadContext extends Place {
  /** The account number in the address of every document the remote hands up. */
  readonly accountId: string | undefined;
  /** The address of the user's favourites document; without it the remote asks for no favourites at all. */
  readonly userProfileUri: string | null | undefined;
  /** The screens' language, the part of `Language` before the `-`. */
  readonly language: string | undefined;
  /** Shown as the user name on the account screen. */
  readonly email: string | null | undefined;
  /** An installer's remote: no activity tutorial, and a professional usage report. */
  readonly installer: boolean;
  /** `SetupSession.Type` 0. */
  readonly setupComplete: boolean;
  /** Not offered for an installer's remote or a `"321"` setup. */
  readonly tutorialOffered: boolean;
  readonly countryCode: string | null | undefined;
  readonly source: Context;
}

/** The whole configuration of one sync, read. */
export interface Configuration {
  readonly documents: SyncDocuments;
  /** Which of the six configuration documents the sync did not hold. */
  readonly absent: readonly string[];
  readonly protocols: readonly ReadProtocol[];
  readonly devices: readonly ReadDevice[];
  readonly maps: readonly ReadMap[];
  readonly activities: readonly ReadActivity[];
  readonly favourites: readonly ReadFavourites[];
  readonly settings: ReadSettings | undefined;
  readonly context: ReadContext | undefined;
}

// ---------------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------------

/**
 * A list a document may state as null or leave out, as an array. **Anything else that is not an array reads as
 * no list too**, an object or a string among them: the remote's reader walks a JSON object as a list of
 * nothing, and the view does not throw on a value its types say cannot be there, which `todo-touch.md` 6.10
 * found it doing for a device's `Commands` stated as an object.
 */
const list = <T>(x: readonly T[] | null | undefined): readonly T[] => (Array.isArray(x) ? x : []);

/**
 * The entries of a list a document may state as null or leave out, each with its index in the list,
 * **skipping an entry that is null or not an object**. The index is the entry's place as the document holds
 * it, so a path built from it still names the right entry when one before it was skipped. This is how the
 * view reads a malformed document without throwing, the header's promise; the documents measured hold no
 * such entry.
 */
function entriesOf<T extends object>(xs: readonly (T | null | undefined)[] | null | undefined): [T, number][] {
  const out: [T, number][] = [];
  list(xs).forEach((x, at) => {
    if (x !== null && typeof x === 'object') out.push([x, at]);
  });
  return out;
}

const numberOr = (x: unknown): number | undefined => (typeof x === 'number' ? x : undefined);
const stringOr = (x: unknown): string | undefined => (typeof x === 'string' ? x : undefined);

/** Sort by an order field, keeping the document's order among equals and putting a missing order last. */
function inOrder<T extends { readonly order: number | undefined }>(xs: readonly T[]): T[] {
  return xs.map((x, at) => ({ x, at })).sort((a, b) => {
    const ao = a.x.order ?? Number.POSITIVE_INFINITY;
    const bo = b.x.order ?? Number.POSITIVE_INFINITY;
    return ao === bo ? a.at - b.at : ao - bo;
  }).map((one) => one.x);
}

/** One field of a code as `archive.ts` holds it. */
type KeycodeField = NonNullable<ArchiveProtocol['keycodeFields']>[string];

/**
 * The definition in the shape `archive.ts` reads.
 *
 * **The archive's two derived fields are not in a definition the remote is given.** Its IRP string stays
 * null, and nothing this view calls reads it. **Its `keycodeFields`, a width per field of a code, are built
 * here from the segments themselves, one per encoded segment at that segment's own `NumberOfBits`**, and the
 * reason is the width each value of a code is read at:
 *
 * * the codec's reader takes a value's width from the segment the value names wherever the definition has
 *   any field at all, `frameWidths` in `archive.ts`, section 233, and from the number in the family's name
 *   where it has none;
 * * the Touch pads or cuts each value to the `NumberOfBits` of the segment it names,
 *   `devices-and-infrared.md`, "How a code becomes durations", and never reads the name.
 *
 * So with no fields a family named `8 Bit` whose segment states 12 would be read at 8 here and sent at 12 by
 * the remote. A field per segment is what moves the reader onto its per segment rule, and it states nothing
 * the definition does not: the width is the segment's, the id the one `segmentRefs` gives it, the toggle
 * bit the segment's own. Its `sequence`, `repeat`, and its `token`, the segment's place among those built,
 * order the fields for a reader that falls back to a field by position, which happens only for a value
 * naming a segment that states no width, a case the Touch's own reading leaves open.
 */
function archiveProtocolOf(p: IrProtocol): ArchiveProtocol {
  const id = p['Id-'];
  // The codec's segment rules expect lists of segments named by text. A document can state anything, and the
  // view reads it without throwing, so the definition handed on keeps only the segments that are objects with
  // a name that is text or null; a document the remote's reader takes holds no other, `checkFields`.
  const segments = <T extends { Name?: unknown }>(xs: readonly (T | null)[] | null | undefined): T[] =>
    entriesOf(xs).map(([s]) => s).filter((s) => s.Name === null || typeof s.Name === 'string');
  const base: ArchiveProtocol = {
    name: p.Name,
    carrierHz: p.CarrierFrequency ?? 0,
    definition: { ...p, IRSegments: segments(p.IRSegments), CodeSegments: segments(p.CodeSegments) },
    keycodeFields: null,
    logitechProtocolId: typeof id === 'number' ? id : Number.isFinite(Number(id)) ? Number(id) : null,
    standardProtocol: null,
    pressMinimumRepeats: p.PressMinimumRepeats ?? null,
    irp: null,
  };
  // A segment's full name to the id a code names it by, through the codec's one statement of that rule.
  const idOfName = new Map<string | null, string>([...segmentRefs(base)].map(([ref, one]) => [one.SegmentName, ref]));
  const fields = new Map<string, KeycodeField>();
  for (const [segment] of entriesOf(p.IRSegments)) {
    const bits = segment.Payload?.NumberOfBits;
    const ref = idOfName.get(segment.Name);
    if (typeof bits !== 'number' || bits <= 0 || ref === undefined || fields.has(ref)) continue;
    fields.set(ref, { bits, segment: ref, sequence: 'repeat', toggleBit: segment.Payload?.ToggleBit ?? null, token: fields.size });
  }
  // `fromEntries` defines each key as an own property, so a segment id that happens to be `__proto__`
  // stays a key rather than reaching the object's prototype.
  return fields.size === 0 ? base : { ...base, keycodeFields: Object.fromEntries(fields) };
}

function readProtocol(p: IrProtocol, at: number): ReadProtocol {
  const hz = p.CarrierFrequency;
  const carrier = typeof hz === 'number' && hz > 0 ? hz : undefined;
  const compiled = carrier === undefined ? undefined : periodOfCarrier(carrier);
  return {
    document: 'ProtocolList',
    path: `Protocols[${at}]`,
    id: idText(p['Id-']),
    name: p.Name,
    carrierHz: hz,
    periodNs: carrier === undefined ? undefined : roundedPeriodOfCarrier(carrier),
    compiledPeriodNs: compiled,
    tableEntry: compiled === undefined ? undefined : statedProtocol(p.Name, compiled),
    archive: archiveProtocolOf(p),
    source: p,
  };
}

function readCommand(c: Command, path: string, protocols: ReadonlyMap<string, ReadProtocol>): ReadCommand {
  const protocolId = idText(c.ProtocolId);
  const protocol = protocols.get(protocolId);
  const keyCode = c.KeyCode;
  // The codec's one reading of the notation, against the definition the command names. A command with no
  // definition, or no key code, has nothing to read against.
  const code = protocol !== undefined && typeof keyCode === 'string'
    ? statedCodeOfDefinition(protocol.archive, keyCode) : undefined;
  const segments = protocol !== undefined && code !== undefined ? keyCodeOfStatedCode(protocol.archive, code) : undefined;
  return {
    document: 'DeviceList',
    path,
    name: stringOr(c.Name),
    keyCode,
    protocolId,
    protocol,
    transportType: numberOr(c.TransportType),
    raw: c.Raw,
    code,
    segments,
    source: c,
  };
}

function readFeatureActions(xs: readonly FeatureAction[] | null | undefined, path: string): ReadFeatureAction[] {
  return entriesOf(xs).map(([a, at]) => ({
    document: 'DeviceList',
    path: `${path}[${at}]`,
    kind: kindOf(a),
    order: numberOr(a.Order),
    commandName: stringOr(a.IRCommandName),
    durationMs: a.Duration,
    delayMs: numberOr(a.Delay),
    source: a,
  }));
}

/**
 * A device as read before the maps are: every field but `map`, which is set once the maps are read, so a
 * button action can already hold the very object the configuration hands out. The one mutable field of the
 * view, and only inside `readConfiguration`.
 */
type DeviceInProgress = Omit<ReadDevice, 'map'> & { map: ReadMap | undefined };

/** A device's three delays and its features, `devices-and-infrared.md`, "Delays a device states". */
function readDevice(entry: DeviceWithFeatures, at: number, protocols: ReadonlyMap<string, ReadProtocol>): DeviceInProgress {
  // A device entry without its record reads as one stating nothing, so the check reports each field the
  // engine requires rather than the view throwing on the first.
  const d: Partial<Device> = entry.Device ?? {};
  const path = `DevicesWithFeatures[${at}]`;
  const commands = entriesOf(entry.Commands).map(([c, i]) => readCommand(c, `${path}.Commands[${i}]`, protocols));
  const byName = new Map<string, ReadCommand>();
  // In document order, so the later of two names that differ only in case replaces the earlier. The two
  // limits of this fold, a device that is both network and infrared and a name outside ASCII, are on
  // `ReadDevice.commandsByName`. A command stating no name is kept under none.
  for (const c of commands) if (c.name !== undefined) byName.set(c.name.toLowerCase(), c);
  let power: ReadPower | undefined;
  let channelTuning: ReadChannelTuning | undefined;
  let inputDelayMs: number | undefined;
  const inputs: ReadInput[] = [];
  const otherFeatures: DeviceFeature[] = [];
  for (const [f, i] of entriesOf(entry.DeviceFeatures)) {
    const fp = `${path}.DeviceFeatures[${i}]`;
    const kind = kindOf(f);
    if (kind === 'PowerFeature') {
      const typeId = numberOr(f.PowerTypeId);
      power = {
        document: 'DeviceList',
        path: fp,
        typeId,
        byHand: typeId === 0 || typeId === 3,
        alwaysOn: f.IsPowerAlwaysOn === true,
        keptOnBetweenActivities: f.IsPoweredOnBetweenActivities === true,
        onDelayMs: numberOr(f.PowerOnDelay),
        connectedAppOnDelayMs: numberOr(f.ConnectedAppPowerOnDelay),
        on: readFeatureActions(f.PowerOnActions, `${fp}.PowerOnActions`),
        off: readFeatureActions(f.PowerOffActions, `${fp}.PowerOffActions`),
        toggle: readFeatureActions(f.PowerToggleActions, `${fp}.PowerToggleActions`),
        source: f,
      };
    } else if (kind === 'InputFeature') {
      inputDelayMs = numberOr(f.InputDelay);
      for (const [input, j] of entriesOf(f.Inputs)) {
        inputs.push({
          document: 'DeviceList',
          path: `${fp}.Inputs[${j}]`,
          name: input.InputName,
          order: numberOr(input.InputOrder),
          online: input.IsOnline === true,
          actions: readFeatureActions(input.Actions, `${fp}.Inputs[${j}].Actions`),
          source: input,
        });
      }
    } else if (kind === 'ChannelTuningFeature') {
      channelTuning = {
        document: 'DeviceList',
        path: fp,
        fixedDigits: f.FixedDigits,
        start: readFeatureActions(f.StartActions, `${fp}.StartActions`),
        greaterTen: readFeatureActions(f.GreaterTenActions, `${fp}.GreaterTenActions`),
        greaterHundred: readFeatureActions(f.GreaterHundredActions, `${fp}.GreaterHundredActions`),
        finish: readFeatureActions(f.FinishActions, `${fp}.FinishActions`),
        source: f,
      };
    } else {
      otherFeatures.push(f);
    }
  }
  const repeats = d.PressMinRepeats;
  return {
    document: 'DeviceList',
    path,
    id: idText(d['Id-']),
    name: stringOr(d.Name),
    manufacturer: stringOr(d.Manufacturer),
    model: stringOr(d.Model),
    deviceType: numberOr(d.DeviceType),
    transport: numberOr(d.Transport),
    controlPort: numberOr(d.ControlPort),
    // Null or negative is the engine's 3, `DEFAULT_PRESS_REPEATS`; the family's own count is never used.
    pressRepeats: typeof repeats === 'number' && repeats >= 0 ? repeats : DEFAULT_PRESS_REPEATS,
    interKeyDelayMs: numberOr(d.InterKeyDelay),
    interDeviceDelayMs: numberOr(d.InterDeviceDelay),
    commands,
    commandsByName: byName,
    power,
    inputs,
    inputDelayMs,
    channelTuning,
    otherFeatures,
    contentProfileKey: d.ContentProfileKey === null || d.ContentProfileKey === undefined ? undefined : idText(d.ContentProfileKey),
    deviceProfileUri: d.DeviceProfileUri,
    // Set by `readConfiguration` once the maps are read.
    map: undefined,
    source: entry,
  };
}

function readButtonAction(
  a: ButtonActionDocument | null | undefined, path: string, devices: ReadonlyMap<string, ReadDevice>,
): ReadButtonAction | undefined {
  if (a === null || typeof a !== 'object') return undefined;
  const type = kindOf(a);
  const kind = type === 'ButtonCommandAction' ? 'command' : type === 'ButtonSequenceAction' ? 'sequence'
    : type === 'ButtonClientAction' ? 'client' : type === 'ButtonDelayAction' ? 'delay' : 'other';
  const deviceId = a['DeviceId-'] === undefined ? undefined : idText(a['DeviceId-']);
  const device = deviceId === undefined ? undefined : devices.get(deviceId);
  const commandName = stringOr(a.CommandName);
  return {
    document: 'MapList',
    path,
    kind,
    type,
    deviceId,
    device,
    commandName,
    // Matched without regard to case, against the commands as the engine keeps them.
    command: commandName === undefined ? undefined : device?.commandsByName.get(commandName.toLowerCase()),
    functionId: numberOr(a['FunctionId-']),
    sequenceId: a.SequenceId === undefined ? undefined : idText(a.SequenceId),
    actionName: stringOr(a.ActionName),
    order: numberOr(a.Order),
    durationMs: typeof a.Duration === 'number' ? a.Duration * 1000 : undefined,
    source: a,
  };
}

function readButton(b: Button, path: string, devices: ReadonlyMap<string, ReadDevice>): ReadButton {
  const type = kindOf(b);
  const group = numberOr(b.FunctionGroupType);
  const kind = type === 'HardRemoteButton' ? 'key' : type === 'GestureRemoteButton' ? 'gesture'
    : type === 'SoftRemoteButton' ? (group === NUMBER_PAD_GROUP ? 'number pad' : 'entry') : 'other';
  const short = readButtonAction(b.ButtonAction, `${path}.ButtonAction`, devices);
  const long = readButtonAction(b.ButtonLongPressAction, `${path}.ButtonLongPressAction`, devices);
  const state = numberOr(b.ButtonState);
  return {
    document: 'MapList',
    path,
    kind,
    type,
    key: stringOr(b.ButtonKey),
    index: numberOr(b.MenuItem?.IndexInMenu),
    label: stringOr(b.TextOnRemote),
    group,
    state,
    deletedOnRemote: state === DELETED_ON_REMOTE,
    // A long press alone is taken as the short action, so it is not also a long press.
    press: short ?? long,
    longPress: short === undefined ? undefined : long,
    doublePress: readButtonAction(b.ButtonDoublePressAction, `${path}.ButtonDoublePressAction`, devices),
    source: b,
  };
}

/** The identifier the engine looks a map up by, `16417Device<device>` or `16417Activity<activity>`. */
export function mapIdentifier(kind: 'device' | 'activity', ownerId: string): string {
  return `${SCREENS_IDENTIFIER}${kind === 'device' ? 'Device' : 'Activity'}${ownerId}`;
}

/**
 * Every identifier a press can look a map up by, to the device or activity it is built from: the one
 * `mapIdentifier` builds for each device of the device list and each activity of the activity list.
 */
type Owners = ReadonlyMap<string, { readonly kind: 'device' | 'activity'; readonly id: string }>;

function readMap(m: ButtonMap, at: number, devices: ReadonlyMap<string, ReadDevice>, owners: Owners): ReadMap {
  const path = `ButtonMaps[${at}]`;
  const type = kindOf(m);
  const kind = type === 'DeviceButtonMap' ? 'device' : type === 'ActivityButtonMap' ? 'activity' : 'other';
  // Read for a reader that wants it, and used for nothing: the engine never reads it.
  const stated = kind === 'device' ? m['DeviceId-'] : kind === 'activity' ? m['ActivityId-'] : undefined;
  const buttons = entriesOf(m.Buttons).map(([b, i]) => readButton(b, `${path}.Buttons[${i}]`, devices));
  const entries = new Map<number, ReadButton>();
  const shadowed: ReadButton[] = [];
  // In document order, so the later of two entries on one index replaces the earlier, as both the engine's
  // table and the screens' list do.
  for (const b of buttons) {
    if (b.kind !== 'entry' || b.index === undefined) continue;
    const before = entries.get(b.index);
    if (before !== undefined) shadowed.push(before);
    entries.set(b.index, b);
  }
  const sequences = entriesOf(m.Sequences).map(([s, i]): ReadSequence => {
    const sp = `${path}.Sequences[${i}]`;
    // A null step is skipped where it stands, so it neither breaks the sort nor shifts a later step's path.
    const steps = entriesOf(s.Actions).flatMap(([a, j]) => {
      const step = readButtonAction(a, `${sp}.Actions[${j}]`, devices);
      return step === undefined ? [] : [step];
    });
    return { document: 'MapList', path: sp, id: idText(s.SequenceId), name: stringOr(s.Name), steps: inOrder(steps), source: s };
  });
  const identifier = stringOr(m.ButtonMapIdentifier);
  const owner = identifier === undefined ? undefined : owners.get(identifier);
  return {
    document: 'MapList',
    path,
    kind,
    identifier,
    statedOwnerId: stated === undefined ? undefined : idText(stated),
    owner,
    reachable: owner !== undefined,
    buttons,
    keys: buttons.filter((b) => b.kind === 'key'),
    numberPad: buttons.filter((b) => b.kind === 'number pad'),
    gestures: buttons.filter((b) => b.kind === 'gesture'),
    entries,
    shadowed,
    sequences,
    source: m,
  };
}

function readActivityStep(
  a: ActivityAction, path: string, devices: ReadonlyMap<string, ReadDevice>,
): ReadActivityStep {
  const type = kindOf(a);
  const kind = type === 'CommandActivityAction' ? 'command' : type === 'DelayActivityAction' ? 'delay'
    : type === 'ChannelActivityAction' ? 'channel' : 'other';
  const deviceId = a['DeviceId-'] === undefined ? undefined : idText(a['DeviceId-']);
  const device = deviceId === undefined ? undefined : devices.get(deviceId);
  const commandName = stringOr(a.CommandName);
  return {
    document: 'ActivityList',
    path,
    kind,
    type,
    order: numberOr(a.ActionOrder),
    deviceId,
    device,
    commandName,
    command: commandName === undefined ? undefined : device?.commandsByName.get(commandName.toLowerCase()),
    // In seconds in the document, as a sequence's delay is; the engine multiplies by 1000.
    durationMs: typeof a.Duration === 'number' ? a.Duration * 1000 : undefined,
    channelNumber: a.ChannelNumber,
    source: a,
  };
}

function readActivity(
  a: Activity, at: number, devices: ReadonlyMap<string, ReadDevice>, maps: ReadonlyMap<string, ReadMap>,
): ReadActivity {
  const path = `Activities[${at}]`;
  const roles = entriesOf(a.Roles).map(([r, i]): ReadRole => {
    const deviceId = idText(r['DeviceId-']);
    const device = devices.get(deviceId);
    const input = r.SelectedInput?.Name;
    return {
      document: 'ActivityList',
      path: `${path}.Roles[${i}]`,
      kind: kindOf(r),
      deviceId,
      device,
      powerOnOrder: numberOr(r.PowerOnOrder),
      powerOffOrder: numberOr(r.PowerOffOrder),
      nextDevicePowerOnDelay: r.NextDevicePowerOnDelay,
      input,
      inputKnown: typeof input === 'string' && device !== undefined && device.inputs.some((one) => one.name === input),
      channelNumber: r.SelectedInput?.ChannelNumber,
      source: r,
    };
  });
  // The first role naming a device makes its steps; later ones add their kind.
  const perDevice = new Map<string, { role: ReadRole; kinds: string[] }>();
  for (const r of roles) {
    const one = perDevice.get(r.deviceId);
    if (one === undefined) perDevice.set(r.deviceId, { role: r, kinds: [r.kind] });
    else one.kinds.push(r.kind);
  }
  const devicesOf = [...perDevice.entries()]
    .map(([deviceId, one]) => ({ deviceId, device: devices.get(deviceId), role: one.role, kinds: one.kinds, order: one.role.powerOnOrder }))
    .map((one, i) => ({ ...one, i }))
    .sort((x, y) => (x.order ?? Number.POSITIVE_INFINITY) - (y.order ?? Number.POSITIVE_INFINITY) || x.i - y.i)
    .map(({ deviceId, device, role, kinds }) => ({ deviceId, device, role, kinds }));
  const id = idText(a['Id-']);
  const order = numberOr(a.ActivityOrder);
  return {
    document: 'ActivityList',
    path,
    id,
    name: stringOr(a.Name),
    type: numberOr(a.Type),
    group: a.ActivityGroup,
    order,
    hidden: order !== undefined && order < 0,
    tuningDefault: a.IsTuningDefault === true,
    startScreen: a.StartScreen,
    defaultChannel: a.DefaultChannel,
    roles,
    devices: devicesOf,
    enter: inOrder(entriesOf(a.EnterActions).map(([x, i]) => readActivityStep(x, `${path}.EnterActions[${i}]`, devices))),
    leave: inOrder(entriesOf(a.LeaveActions).map(([x, i]) => readActivityStep(x, `${path}.LeaveActions[${i}]`, devices))),
    map: maps.get(mapIdentifier('activity', id)),
    source: a,
  };
}

// ---------------------------------------------------------------------------------------------------
// Favourites, `favourites-and-settings.md`
// ---------------------------------------------------------------------------------------------------

/**
 * The roles that make a tuning default activity a favourites activity, in the order the engine picks the
 * device a channel goes to: Roku, Sonos, app, speaker, then the channel changing device. The firmware keeps
 * favourites for an activity with any of the four other than the app, "Favourite channels"; the account
 * measured held only the channel changing role, so the other four are read in the firmware and not
 * exercised.
 */
export const FAVOURITES_ROLES = ['ControlsRokuActivityRole', 'ControlsSonosActivityRole', 'ControlsSpeakerActivityRole', 'ChannelChangingActivityRole'] as const;
export const CHANNEL_DEVICE_ORDER = ['ControlsRokuActivityRole', 'ControlsSonosActivityRole', 'ControlsAppActivityRole', 'ControlsSpeakerActivityRole', 'ChannelChangingActivityRole'] as const;

/** The address of a station's logo, asked for at 54 by 54. */
export const stationLogo = (station: string): string => `content-image://1.0/station/${station}/image;maxX=54;maxY=54;type=png`;
/** The address of a logo the user uploaded for a channel. */
export const uploadedLogo = (image: string): string => `content-image://1.0/image/${image};maxX=54;maxY=54`;

/**
 * The service the favourites are under: the first key under the device's profile key in the user's
 * document, skipping an antenna only service, named in braces. The firmware also skips the Roku, Sonos and
 * Heos services, by a test the reference does not spell, so those are not skipped here; no account measured
 * held one.
 *
 * **"First" is the parsed object's key order, and that is not always the document's.** The document arrives
 * parsed, and a JavaScript object lists integer like keys first, in ascending order, and every other key in
 * the order it was written; the text's own order is gone by then and nothing here can restore it. So where a
 * profile holds one service besides an antenna only one, which is the account measured, the pick is the
 * document's; where it holds two, and either has an integer like id, this may be another service than the
 * document's first, and which the remote takes then is not checked.
 */
function serviceOf(user: ContentUser | undefined, profileKey: string | undefined): string | undefined {
  if (user === undefined || profileKey === undefined) return undefined;
  const services = user.preferences?.[profileKey];
  if (services === undefined || services === null || typeof services !== 'object') return undefined;
  return Object.keys(services).find((key) => !/^\{.*\}$/.test(key));
}

function readFavourites(
  activity: ReadActivity, context: ReadContext | undefined, documents: SyncDocuments,
): ReadFavourites {
  // The device a channel goes to: the activity's first role device in the engine's order.
  const role = CHANNEL_DEVICE_ORDER.map((k) => activity.roles.find((r) => r.kind === k)).find((r) => r !== undefined);
  const device = role?.device;
  const userAddress = typeof context?.userProfileUri === 'string' ? `${CONTENT_USER}${context.userProfileUri}` : undefined;
  const deviceAddress = typeof device?.deviceProfileUri === 'string' ? `${CONTENT_DEVICE}${device.deviceProfileUri}` : undefined;
  const user = userAddress === undefined ? undefined : documents[userAddress] as ContentUser | undefined;
  const serviceId = serviceOf(user, device?.contentProfileKey);
  const serviceAddress = serviceId === undefined ? undefined : `${CONTENT_SERVICE}${serviceId}`;
  const deviceDocument = deviceAddress === undefined ? undefined : documents[deviceAddress] as ContentDevice | undefined;
  const service = serviceAddress === undefined ? undefined : documents[serviceAddress] as ContentService | undefined;
  const missing = [userAddress, deviceAddress, serviceAddress]
    .filter((one): one is string => one !== undefined && documents[one] === undefined);
  // A null entry of any of the three lists is skipped, as everywhere in the view.
  const stations = serviceId === undefined || device?.contentProfileKey === undefined ? []
    : entriesOf(user?.preferences?.[device.contentProfileKey]?.[serviceId]?.stations).map(([s]) => s);
  const dials = serviceId === undefined ? [] : entriesOf(deviceDocument?.services?.[serviceId]?.dialPositions);
  const channels = entriesOf(service?.channels);
  const favourites = stations.map((s): ReadFavourite => {
    const dialAt = dials.find(([d]) => d.station === s.id);
    const channelAt = channels.find(([c]) => c.station?.id === s.id);
    const [dial, channel] = [dialAt?.[0], channelAt?.[0]];
    const added = dial?.added === true;
    // A channel added by hand takes its number, name and picture from its dial position alone; any other
    // is filled from the line up where the dial position is silent.
    const fromDial = dial?.number !== undefined && dial.number !== null;
    const number = fromDial ? dial.number : added ? undefined : channel?.number;
    const name = dial?.name ?? (added ? undefined : channel?.station?.shortName);
    // An uploaded picture is a name to ask for; a null or empty one is none, and the station's logo applies.
    const image = typeof dial?.image === 'string' && dial.image !== '' ? dial.image : undefined;
    const logo = image !== undefined ? uploadedLogo(image) : added ? undefined : stationLogo(s.id);
    // Where the number came from, as a place in its document, so a finding about it can name the place
    // without quoting the account's service id.
    const numberAt = fromDial ? { document: 'ContentDevice', path: `services.*.dialPositions[${dialAt![1]}].number` }
      : number !== undefined && channelAt !== undefined ? { document: 'ContentService', path: `channels[${channelAt[1]}].number` }
        : undefined;
    return { station: s.id, number: number ?? undefined, name, added, logo, numberAt, dial, channel };
  });
  return {
    activity,
    device,
    tuning: device?.channelTuning,
    serviceId,
    addresses: { user: userAddress, device: deviceAddress, service: serviceAddress },
    missing,
    favourites,
    user,
    deviceDocument,
    service,
  };
}

// ---------------------------------------------------------------------------------------------------
// Settings and Context, `favourites-and-settings.md`
// ---------------------------------------------------------------------------------------------------

/**
 * The firmware's defaults, "Settings", for a setting the account states no value for: a yes or no setting
 * as the firmware's `getSettingsDefaultValue` sets it, a number as its constants. Every value is in the
 * page's table, `HapticFlag` and `HapticEffect` among them, which no sync measured carried. No default is
 * stated for `ActivityPressDuration`, which no screen asks for, and the background's is a built in picture
 * whose name stays in the image.
 */
export const FIRMWARE_SETTINGS = {
  TwelveHourClock: true,
  AccelFlag: true,
  HapticFlag: true,
  ScreenLockFlag: false,
  EditLock: false,
  ScreenBrightness: 85,
  ScreenTimeout: 10,
  KeyBrightness: 35,
  HapticEffect: '13',
} as const;

/** The first of a row's values, which is the one the remote reads; `undefined` when the row states none. */
function firstValue(row: Setting | undefined): string | undefined {
  const first = row?.Values?.[0];
  return first === null || first === undefined ? undefined : first;
}

/**
 * A yes or no setting: its first value, or with none the row's `DefaultValue`, as `"true"` or not; with
 * neither, or no row, the firmware's default.
 */
function yesOrNo(row: Setting | undefined, firmware: boolean): SettingValue<boolean> {
  const first = firstValue(row);
  if (first !== undefined) return { value: first === 'true', from: 'account' };
  const fallback = row?.DefaultValue;
  if (fallback !== null && fallback !== undefined) return { value: fallback === 'true', from: 'row default' };
  return { value: firmware, from: 'firmware' };
}

/**
 * A number setting: its first value; **the row's `DefaultValue` is never consulted**; with no value, or no
 * row, the firmware's default. A first value that is not a number is taken as no value, which is this
 * module's reading of "when that leaves nothing" and is not checked on a remote.
 */
function aNumber(row: Setting | undefined, firmware: number | undefined): SettingValue<number> {
  const first = firstValue(row);
  const n = first === undefined || first.trim() === '' ? Number.NaN : Number(first);
  if (Number.isFinite(n)) return { value: n, from: 'account' };
  return { value: firmware, from: 'firmware' };
}

/** A setting read as text: its first value, or the firmware's. */
function aText(row: Setting | undefined, firmware: string | undefined): SettingValue<string> {
  const first = firstValue(row);
  return first !== undefined ? { value: first, from: 'account' } : { value: firmware, from: 'firmware' };
}

export function readSettings(s: Settings): ReadSettings {
  const rows = new Map<string, Setting>();
  for (const [row] of entriesOf(s.Settings)) if (!rows.has(row.Name)) rows.set(row.Name, row);
  const row = (name: string): Setting | undefined => rows.get(name);
  return {
    document: 'Settings',
    path: '',
    remoteName: s.RemoteName,
    userImageBucketUri: s.UserImageBucketUri,
    defaultImageBucketUri: s.DefaultImageBucketUri,
    background: aText(row('BackgroundImage'), undefined),
    userImages: list(row('UserImages')?.Values).filter((v): v is string => typeof v === 'string'),
    twelveHourClock: yesOrNo(row('TwelveHourClock'), FIRMWARE_SETTINGS.TwelveHourClock),
    // The two brightness levels are **as stored**, not brought into the ranges the page gives, 10 to 100
    // for the screen and 5 to 100 for the keys: the page states those as the settings' ranges and says the
    // remote scales the level to its backlight, and it does not say what the firmware does with a stored
    // level outside them. So a level of 3 reads 3 here, and what the backlight then shows is not this view's.
    screenBrightness: aNumber(row('ScreenBrightness'), FIRMWARE_SETTINGS.ScreenBrightness),
    screenTimeout: aNumber(row('ScreenTimeout'), FIRMWARE_SETTINGS.ScreenTimeout),
    screenLock: yesOrNo(row('ScreenLockFlag'), FIRMWARE_SETTINGS.ScreenLockFlag),
    editLock: yesOrNo(row('EditLock'), FIRMWARE_SETTINGS.EditLock),
    keyBrightness: aNumber(row('KeyBrightness'), FIRMWARE_SETTINGS.KeyBrightness),
    motionSensor: yesOrNo(row('AccelFlag'), FIRMWARE_SETTINGS.AccelFlag),
    vibration: yesOrNo(row('HapticFlag'), FIRMWARE_SETTINGS.HapticFlag),
    // How the firmware reads the vibration effect is not stated beyond its default, a text; read as text.
    vibrationEffect: aText(row('HapticEffect'), FIRMWARE_SETTINGS.HapticEffect),
    activityPressDuration: aNumber(row('ActivityPressDuration'), undefined),
    rows,
    source: s,
  };
}

export function readContext(c: Context): ReadContext {
  const installer = c.InstallerId !== null && c.InstallerId !== undefined;
  const language = typeof c.Language === 'string' ? c.Language.split('-')[0] : undefined;
  return {
    document: 'Context',
    path: '',
    accountId: c['AccountId-'] === undefined ? undefined : idText(c['AccountId-']),
    userProfileUri: c.HouseholdUserProfileUri,
    language,
    email: c.Email,
    installer,
    setupComplete: c.SetupSession?.Type === 0,
    tutorialOffered: !installer && c.SetupSession?.SetupType !== '321',
    countryCode: c.CountryCode,
    source: c,
  };
}

// ---------------------------------------------------------------------------------------------------
// The whole
// ---------------------------------------------------------------------------------------------------

/**
 * Read the documents of one sync into the view above. Any of the documents may be absent, as the reverse
 * sync measured holds Settings alone; what is absent reads as empty and is named in `absent`.
 */
export function readConfiguration(documents: SyncDocuments): Configuration {
  const absent = CONFIGURATION_DOCUMENTS.filter((name) => documents[name] === undefined);
  const protocols = entriesOf(documents.ProtocolList?.Protocols).map(([p, at]) => readProtocol(p, at));
  // A later definition of the same id replaces an earlier one, as a table keyed by id would.
  const protocolsById = new Map(protocols.map((p) => [p.id, p]));
  // **Two phases, because the view is a cycle**: a device holds its map, the map's buttons hold their
  // actions, and an action holds the device it sends to, which has to be this same object. So the devices
  // are read first with no map, the maps are read against them, and each device is then given its map.
  const devices: DeviceInProgress[] = entriesOf(documents.DeviceList?.DevicesWithFeatures).map(([d, at]) => readDevice(d, at, protocolsById));
  const devicesById = new Map<string, ReadDevice>(devices.map((d) => [d.id, d]));
  const activityEntries = entriesOf(documents.ActivityList?.Activities);
  // Every identifier a press can name a map by, built the way the screens build it, and nothing else: the
  // engine finds a map by its identifier alone and never reads the map's own `DeviceId-` or `ActivityId-`,
  // "How a key press becomes a command", step 4, and "What a writer must carry".
  const owners = new Map<string, { kind: 'device' | 'activity'; id: string }>();
  for (const d of devices) owners.set(mapIdentifier('device', d.id), { kind: 'device', id: d.id });
  for (const [a] of activityEntries) {
    const id = idText(a['Id-']);
    owners.set(mapIdentifier('activity', id), { kind: 'activity', id });
  }
  const maps = entriesOf(documents.MapList?.ButtonMaps).map(([m, at]) => readMap(m, at, devicesById, owners));
  // Found by the identifier the engine builds, which is the only way it finds a map; of two under one
  // identifier the later is kept, as a table keyed by it would, a case the reference does not state.
  const mapsByIdentifier = new Map<string, ReadMap>();
  for (const m of maps) if (m.identifier !== undefined) mapsByIdentifier.set(m.identifier, m);
  for (const d of devices) d.map = mapsByIdentifier.get(mapIdentifier('device', d.id));
  const activities = activityEntries.map(([a, at]) => readActivity(a, at, devicesById, mapsByIdentifier));
  const context = documents.Context === undefined ? undefined : readContext(documents.Context);
  const settings = documents.Settings === undefined ? undefined : readSettings(documents.Settings);
  // A favourites activity is a tuning default one with a role that changes channels or controls a Roku, a
  // Sonos or a speaker; and without the household user profile the remote asks for no favourites at all.
  const favourites = typeof context?.userProfileUri !== 'string' ? []
    : activities
      .filter((a) => a.tuningDefault && a.roles.some((r) => (FAVOURITES_ROLES as readonly string[]).includes(r.kind)))
      .map((a) => readFavourites(a, context, documents));
  return { documents, absent, protocols, devices, maps, activities, favourites, settings, context };
}
