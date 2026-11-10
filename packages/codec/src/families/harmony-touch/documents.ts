/**
 * The documents a Harmony Touch stores as its configuration, typed as far as the reference describes them.
 *
 * **A Touch's configuration is not a container file.** The remote fetches JSON documents of Logitech's
 * service through the computer during a sync and keeps them itself: the activity list, the device list, the
 * button maps, the protocol list, its context and its settings, and with favourite channels three content
 * documents and the pictures, `reference/architectures/harmony-touch/usb.md`. So this folder reads JSON, and
 * nothing in it touches the container readers the other remotes go through.
 *
 * **The name of the folder is the remote's whole name, and it is not the One family.** Elsewhere in this
 * codec "touch" names the Harmony One's touch panel: its hit map, `touch.ts` in the codec's top level, and its
 * family until plan 013 renamed `families/touch/` to `families/one/`. A folder called `touch/` next to
 * `touch.ts` would have read as that file's own, so this one is `harmony-touch/`, after the model, and
 * every family's folder is now named after its remotes. Nothing here is that family's and nothing here
 * imports it; the barrel exports this folder as one namespace, `harmonyTouch`, so the two vocabularies cannot
 * collide by name either.
 *
 * **Every type carries an index signature, and that is the point of the types rather than a looseness.**
 * The remote's own screens change several of these documents in place and send them back whole, and so do
 * Logitech's clients, so every field a document holds comes back, the ones nothing on the remote reads
 * among them: `devices-and-infrared.md` and `activities-and-buttons.md`, "What a writer must carry". A
 * reader that typed only what it reads and dropped the rest would hand a writer a document with fields
 * missing, and the service would hold less than it did. So a field the reference names is typed, every
 * other field stays reachable as `unknown`, and the reader in `read.ts` keeps a reference to each source
 * object instead of copying what it reads out of it.
 *
 * **What is typed is what the reference states the remote reads or requires**, with a field typed `| null`
 * where the documents measured carry null, and optional where a document can lack it and the remote's
 * reaction to its absence is part of what `check.ts` reports. The names are Logitech's own, as their service
 * spells them, the trailing hyphen of an identifier included; the entities are their data model's,
 * `reference/logitech/data-model/model.md`.
 */

/** Any field the reference does not type, carried through untouched. */
export interface Carried {
  readonly [field: string]: unknown;
}

/** An identifier as the documents state it: a number in every document measured, compared as text. */
export type Id = number | string;

/** Logitech's `__type`, a type name, sometimes namespaced; `kindOf` reads the bare name out of it. */
export interface Typed extends Carried {
  readonly __type?: string;
}

// ---------------------------------------------------------------------------------------------------
// ProtocolList, `devices-and-infrared.md`, "The two documents"
// ---------------------------------------------------------------------------------------------------

/** A duration of a segment: `Type` 1 the lamp flickering, 0 dark, `Value` in microseconds. */
export interface Atom extends Carried {
  readonly Type: number;
  readonly Value: number;
}

/** One cell of an encoded segment, the durations one symbol is sent as. */
export interface Encoding extends Carried {
  readonly BitType: number;
  readonly Atoms: readonly Atom[] | null;
}

/**
 * An encoded segment, one that carries the bits of a value. `Payload.EncodingType` 0 or 1 reads each
 * hexadecimal digit as four bits, 2 or 3 each digit as one symbol; `ToggleBit` is the bit the remote flips
 * per send, `devices-and-infrared.md`, "How a code becomes durations".
 */
export interface IrSegment extends Carried {
  readonly Name: string | null;
  readonly Header: readonly Atom[] | null;
  readonly Trailer: readonly Atom[] | null;
  readonly TotalLength: number | null;
  readonly Payload: (Carried & {
    readonly EncodingType?: number;
    readonly Encodings: readonly Encoding[] | null;
    readonly NumberOfBits: number | null;
    readonly ToggleBit?: number | null;
  }) | null;
}

/** A code segment, literal durations. A Touch reads its `Atoms` alone. */
export interface CodeSegment extends Carried {
  readonly Name: string | null;
  readonly Atoms?: readonly Atom[] | null;
  readonly Header: readonly Atom[] | null;
  readonly Trailer: readonly Atom[] | null;
  readonly TotalLength: number | null;
  readonly Payload: null;
}

/** One entry of a definition's own `KeyCode` lists, which a Touch never reads. */
export interface SegmentReference extends Carried {
  readonly SegmentName: string | null;
  readonly SegmentType: number;
}

/**
 * Logitech's `IrProtocol`, a code family's definition. A Touch is given the catalogue's own definition,
 * unchanged, under the catalogue's protocol id, `devices-and-infrared.md`, "Built at the moment of sending".
 */
export interface IrProtocol extends Typed {
  readonly 'Id-': Id;
  readonly Name: string;
  readonly CarrierFrequency: number | null;
  readonly IRSegments: readonly IrSegment[] | null;
  readonly CodeSegments: readonly CodeSegment[] | null;
  readonly Attributes: readonly unknown[] | null;
  readonly Flags: readonly unknown[] | null;
  readonly HoldDelay: number | null;
  /** Stored and never used on a Touch: the device's count is used instead. */
  readonly HoldMinimumRepeats: number | null;
  /** Stored and never used on a Touch. */
  readonly PressMinimumRepeats?: number | null;
  /** Never read on a Touch: the structure is taken from each command's own key code. */
  readonly KeyCode: {
    readonly Start: readonly SegmentReference[] | null;
    readonly Repeat: readonly SegmentReference[] | null;
    readonly Finish: readonly SegmentReference[] | null;
  } | null;
}

export interface ProtocolList extends Carried {
  readonly Protocols: readonly IrProtocol[];
}

// ---------------------------------------------------------------------------------------------------
// DeviceList, `devices-and-infrared.md`
// ---------------------------------------------------------------------------------------------------

/**
 * One command. `TransportType` chooses how it goes out, infrared in every document measured; `Raw`, a
 * learned code, must be present as a key even when null, and a command whose `KeyCode` key is missing
 * cannot be sent, "What a writer must carry".
 */
export interface Command extends Carried {
  readonly Name: string;
  readonly KeyCode?: string | null;
  readonly ProtocolId?: Id | null;
  readonly TransportType?: number;
  readonly Raw?: string | null;
  readonly 'FunctionId-'?: number;
}

/** A device's own record. The required fields are optional here because `check.ts` reports their absence. */
export interface Device extends Carried {
  readonly 'Id-': Id;
  readonly Name?: string;
  readonly Model?: string;
  readonly Manufacturer?: string;
  readonly DeviceType?: number;
  readonly Transport?: number;
  readonly ControlPort?: number;
  readonly PressMinRepeats?: number | null;
  readonly InterKeyDelay?: number;
  readonly InterDeviceDelay?: number;
  readonly IsScartCableSupported?: boolean;
  /** The key under which the user's favourites document holds this device's services. */
  readonly ContentProfileKey?: Id | null;
  /** The address of this device's favourites document, after `content://1.0/device;`. */
  readonly DeviceProfileUri?: string | null;
}

/**
 * One step of a feature's action list: an infrared press naming a command, a delay, or a state step.
 * `Duration` on a press is how long the code is held, in milliseconds.
 */
export interface FeatureAction extends Typed {
  readonly Order?: number;
  readonly IRCommandName?: string;
  readonly Duration?: number | null;
  readonly Delay?: number;
  readonly StateName?: string;
  readonly StateValue?: string;
}

export interface Input extends Carried {
  readonly InputName: string;
  readonly InputOrder?: number;
  readonly IsOnline?: boolean;
  readonly Actions?: readonly FeatureAction[] | null;
}

/** A device feature, told apart by `__type`: power, inputs, channel tuning, states of its own, outputs. */
export interface DeviceFeature extends Typed {
  // PowerFeature
  readonly PowerTypeId?: number;
  readonly PowerOnDelay?: number;
  readonly ConnectedAppPowerOnDelay?: number;
  readonly IsPowerAlwaysOn?: boolean;
  readonly IsPoweredOnBetweenActivities?: boolean;
  readonly PowerOnActions?: readonly FeatureAction[] | null;
  readonly PowerOffActions?: readonly FeatureAction[] | null;
  readonly PowerToggleActions?: readonly FeatureAction[] | null;
  // InputFeature
  readonly InputDelay?: number;
  readonly Inputs?: readonly Input[] | null;
  // ChannelTuningFeature
  readonly FixedDigits?: number | null;
  readonly StartActions?: readonly FeatureAction[] | null;
  readonly GreaterTenActions?: readonly FeatureAction[] | null;
  readonly GreaterHundredActions?: readonly FeatureAction[] | null;
  readonly FinishActions?: readonly FeatureAction[] | null;
}

export interface DeviceWithFeatures extends Carried {
  readonly Device: Device;
  readonly DeviceFeatures: readonly DeviceFeature[] | null;
  readonly Commands: readonly Command[] | null;
}

export interface DeviceList extends Carried {
  readonly DevicesWithFeatures: readonly DeviceWithFeatures[];
}

// ---------------------------------------------------------------------------------------------------
// ActivityList, `activities-and-buttons.md`, "An activity: what it is made of"
// ---------------------------------------------------------------------------------------------------

/** A role: a device in an activity, its two power orders and the input it is switched to. */
export interface Role extends Typed {
  readonly 'DeviceId-': Id;
  readonly PowerOnOrder?: number;
  readonly PowerOffOrder?: number;
  readonly NextDevicePowerOnDelay?: number | null;
  readonly SelectedInput?: (Carried & {
    readonly Name?: string | null;
    readonly ChannelNumber?: string | number | null;
  }) | null;
}

/**
 * A step added by hand to an activity's start or end: a command, a delay or a channel. `Duration` is in
 * seconds; an action without `ActionOrder` stops the reader.
 */
export interface ActivityAction extends Typed {
  readonly ActionOrder?: number;
  readonly 'DeviceId-'?: Id;
  readonly CommandName?: string;
  readonly Duration?: number;
  readonly ChannelNumber?: string | number;
}

export interface Activity extends Carried {
  readonly 'Id-': Id;
  readonly Name?: string;
  /** The activity kind the Touch acts on: a position in Logitech's `ActivityType`, 1 `WatchTV`, 5 `Custom`. */
  readonly Type?: number;
  /** Not `Type`; the engine only copies it into an answer, and an activity without it makes the reader fail. */
  readonly ActivityGroup?: number | null;
  readonly ActivityOrder?: number;
  readonly IsTuningDefault?: boolean;
  readonly StartScreen?: string | null;
  readonly DefaultChannel?: string | number | null;
  readonly Roles?: readonly Role[] | null;
  readonly EnterActions?: readonly ActivityAction[] | null;
  readonly LeaveActions?: readonly ActivityAction[] | null;
}

export interface ActivityList extends Carried {
  readonly Activities: readonly Activity[];
}

// ---------------------------------------------------------------------------------------------------
// MapList, `activities-and-buttons.md`, "How a key press becomes a command"
// ---------------------------------------------------------------------------------------------------

/**
 * A button's action, told apart by `__type`: a command naming a device and a command by name, a sequence by
 * id, a client action by name (`Numpad` opens the number pad), or a sequence's delay, whose `Duration` is in
 * seconds.
 */
export interface ButtonActionDocument extends Typed {
  readonly 'DeviceId-'?: Id;
  readonly CommandName?: string;
  readonly 'FunctionId-'?: number;
  readonly SequenceId?: Id;
  readonly ActionName?: string;
  readonly Duration?: number;
  readonly Order?: number;
  readonly EventType?: number;
}

/** A key (`HardRemoteButton`), a screen entry (`SoftRemoteButton`) or a gesture (`GestureRemoteButton`). */
export interface Button extends Typed {
  readonly ButtonKey?: string;
  readonly ButtonState?: number;
  readonly FunctionGroupType?: number;
  readonly TextOnRemote?: string;
  readonly MenuItem?: (Carried & { readonly IndexInMenu?: number }) | null;
  readonly ButtonAction?: ButtonActionDocument | null;
  readonly ButtonLongPressAction?: ButtonActionDocument | null;
  readonly ButtonDoublePressAction?: ButtonActionDocument | null;
}

export interface Sequence extends Carried {
  readonly SequenceId: Id;
  readonly Name?: string;
  readonly Actions?: readonly ButtonActionDocument[] | null;
}

/** A device's map (`DeviceButtonMap`) or an activity's (`ActivityButtonMap`). */
export interface ButtonMap extends Typed {
  readonly ButtonMapIdentifier?: string;
  readonly 'DeviceId-'?: Id;
  readonly 'ActivityId-'?: Id;
  readonly Buttons?: readonly Button[] | null;
  readonly Sequences?: readonly Sequence[] | null;
}

export interface MapList extends Carried {
  readonly ButtonMaps: readonly ButtonMap[];
}

// ---------------------------------------------------------------------------------------------------
// Context and Settings, `favourites-and-settings.md`
// ---------------------------------------------------------------------------------------------------

export interface Context extends Carried {
  readonly 'AccountId-'?: Id;
  readonly HouseholdUserProfileUri?: string | null;
  readonly Language?: string | null;
  readonly Email?: string | null;
  readonly InstallerId?: unknown;
  readonly CountryCode?: string | null;
  readonly SetupSession?: (Carried & { readonly Type?: number; readonly SetupType?: string | null }) | null;
}

/** One row: a name and a list of values, the remote reading the first. */
export interface Setting extends Carried {
  readonly Name: string;
  readonly Values?: readonly (string | null)[] | null;
  readonly DefaultValue?: string | null;
}

export interface Settings extends Carried {
  readonly RemoteName?: string | null;
  readonly UserImageBucketUri?: string | null;
  readonly DefaultImageBucketUri?: string | null;
  readonly Settings?: readonly Setting[] | null;
}

// ---------------------------------------------------------------------------------------------------
// The three favourites documents, `favourites-and-settings.md`, "The documents"
// ---------------------------------------------------------------------------------------------------

/** The user's document: the favourites in the order shown, per device key and service. */
export interface ContentUser extends Carried {
  readonly id?: string;
  readonly preferences?: Readonly<Record<string, Readonly<Record<string, Carried & {
    readonly stations?: readonly (Carried & { readonly id: string })[] | null;
  }>>>> | null;
}

/** One favourite as the tuning device's document states it. */
export interface DialPosition extends Carried {
  readonly station?: string;
  readonly number?: string;
  readonly name?: string;
  readonly image?: string;
  readonly added?: boolean;
}

export interface ContentDevice extends Carried {
  readonly id?: string;
  readonly services?: Readonly<Record<string, Carried & { readonly dialPositions?: readonly DialPosition[] | null }>> | null;
}

/** One channel of the provider's line up. */
export interface Channel extends Carried {
  readonly number?: string;
  readonly popularRank?: number;
  readonly station?: (Carried & { readonly id?: string; readonly shortName?: string; readonly fullName?: string }) | null;
}

export interface ContentService extends Carried {
  readonly id?: string;
  readonly channels?: readonly Channel[] | null;
}

// ---------------------------------------------------------------------------------------------------
// The documents of one sync
// ---------------------------------------------------------------------------------------------------

/**
 * The documents of one sync, as parsed JSON, keyed by resource.
 *
 * **The six configuration documents by their resource name**, the last segment of the logical address the
 * remote asks for them by, `ActivityList`, `DeviceList`, `MapList`, `Context`, `Settings` and
 * `ProtocolList`; **a content document by the whole address it was asked for at**, which the reader builds
 * again from the other documents the way the remote does, `favourites-and-settings.md`, "Where each is
 * kept". The pictures are not documents and are not read here.
 */
export interface SyncDocuments {
  readonly ActivityList?: ActivityList;
  readonly DeviceList?: DeviceList;
  readonly MapList?: MapList;
  readonly ProtocolList?: ProtocolList;
  readonly Context?: Context;
  readonly Settings?: Settings;
  readonly [resource: string]: unknown;
}

/** The six documents a sync down always asks for, in the order the remote asks for them. */
export const CONFIGURATION_DOCUMENTS = ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList'] as const;

/** The start of each favourites document's address, `favourites-and-settings.md`, "Where each is kept". */
export const CONTENT_USER = 'content://1.0/user;';
export const CONTENT_DEVICE = 'content://1.0/device;';
export const CONTENT_SERVICE = 'content://1.0/service/';

/** One answer the computer hands the remote: the address, and the document, parsed. */
export interface SyncAnswer {
  readonly uri: string;
  readonly resource?: unknown;
}

/**
 * The documents of a sync out of the answers the computer handed the remote, keyed as `SyncDocuments` says.
 *
 * A `harmony://` address names its document by its last path segment, before any query, which is how the
 * remote names the file it keeps it as, `Context.json` for `.../Context`; a `content://` address is kept
 * whole, since the remote finds those documents by building the address again. The pictures, `https` and
 * `content-image://`, and the `proxy://Finished` acknowledgement carry no document and are left out. A
 * later answer for the same resource replaces an earlier one, as a later sync's answer replaces what the
 * remote held.
 *
 * **The result has no prototype.** Its keys come from addresses the remote and the computer exchanged, and
 * an address ending in `/__proto__` assigned into an ordinary object would not add a key: it would replace
 * the object's prototype, and every later lookup of a document name would read through whatever that answer
 * held. On an object made by `Object.create(null)` the same assignment is an ordinary own key.
 *
 * **The derivation of a resource's name has a twin**, `resource` in `packages/usb/src/touchrecording.ts`,
 * which the tests of the recordings in `packages/usb` key their answers by. It is kept there because
 * `packages/usb` cannot import the codec, which depends on it; the two are the same one line rule, and if one
 * changes the other has to.
 */
export function documentsOfAnswers(answers: readonly SyncAnswer[]): SyncDocuments {
  const out = Object.create(null) as Record<string, unknown>;
  for (const answer of answers) {
    if (answer.resource === undefined) continue;
    const key = documentKeyOf(answer.uri);
    if (key !== undefined) out[key] = answer.resource;
  }
  return out as SyncDocuments;
}

/**
 * The key a document asked for at `uri` is kept under in `SyncDocuments`: a `harmony://` address by its last
 * path segment before any query, `MapList` out of `.../MapList?excludeFunctionMaps=true`, a `content://`
 * address whole, and anything else, a picture or a `proxy://` ending, `undefined`, since it carries no
 * document. The one statement of the rule `documentsOfAnswers` keys by, exported so that the answerer of a
 * sync, `packages/corpus/src/touchsync.ts`, finds a request's document by the same rule rather than a copy.
 */
export function documentKeyOf(uri: string): string | undefined {
  if (uri.startsWith('harmony://')) return uri.split('?')[0]!.split('/').at(-1)!;
  if (uri.startsWith('content://')) return uri;
  return undefined;
}

/**
 * A `__type` without its namespace or assembly: `ChannelChangingActivityRole` out of
 * `ChannelChangingActivityRole:#Logitech...` or out of an assembly qualified `Logitech.X.IRPressAction, ...`.
 * Every `__type` of the syncs measured is already bare; the other two spellings are what Logitech's service
 * writes elsewhere, and reading them costs nothing.
 */
export function kindOf(x: { readonly __type?: unknown } | null | undefined): string {
  if (x === null || x === undefined || typeof x.__type !== 'string') return '';
  return x.__type.split(':')[0]!.split(',')[0]!.split('.').at(-1)!.trim();
}

/** An identifier as the text the remote compares and builds identifiers with. */
export const idText = (id: Id | null | undefined): string => (id === null || id === undefined ? '' : String(id));
