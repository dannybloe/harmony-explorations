# `harmonyTouch` on `@freeharmony-sdk/config`

<!-- introduction -->
The Harmony Touch's own documents, imported as `harmonyTouch` from the config package's main entry: the documents a
Touch keeps as its configuration, typed, read as the remote reads them, and checked. An application that works with
the document and the toolkit does not need it; it is for one that shows or compares what a Touch holds.
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

## Its documents

The documents a Touch stores as its configuration, typed, and the set a sync delivers.

### `harmonyTouch.Activity`

```ts
interface Activity extends Carried {
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
```

One activity as the ActivityList document holds it: its name and kind, its devices and their roles, and what it does as it starts and ends.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.Id`](#harmonytouchid), [`harmonyTouch.Role`](#harmonytouchrole), [`harmonyTouch.ActivityAction`](#harmonytouchactivityaction).

### `harmonyTouch.ActivityAction`

```ts
interface ActivityAction extends Typed {
  readonly ActionOrder?: number;
  readonly 'DeviceId-'?: Id;
  readonly CommandName?: string;
  readonly Duration?: number;
  readonly ChannelNumber?: string | number;
}
```

A step added by hand to an activity's start or end: a command, a delay or a channel. `Duration` is in
seconds; an action without `ActionOrder` stops the reader.

Uses [`harmonyTouch.Typed`](#harmonytouchtyped), [`harmonyTouch.Id`](#harmonytouchid).

### `harmonyTouch.ActivityList`

```ts
interface ActivityList extends Carried {
  readonly Activities: readonly Activity[];
}
```

The document that holds every activity.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.Activity`](#harmonytouchactivity).

### `harmonyTouch.Atom`

```ts
interface Atom extends Carried {
  readonly Type: number;
  readonly Value: number;
}
```

A duration of a segment: `Type` 1 the lamp flickering, 0 dark, `Value` in microseconds.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried).

### `harmonyTouch.Button`

```ts
interface Button extends Typed {
  readonly ButtonKey?: string;
  readonly ButtonState?: number;
  readonly FunctionGroupType?: number;
  readonly TextOnRemote?: string;
  readonly MenuItem?: (Carried & { readonly IndexInMenu?: number }) | null;
  readonly ButtonAction?: ButtonActionDocument | null;
  readonly ButtonLongPressAction?: ButtonActionDocument | null;
  readonly ButtonDoublePressAction?: ButtonActionDocument | null;
}
```

A key (`HardRemoteButton`), a screen entry (`SoftRemoteButton`) or a gesture (`GestureRemoteButton`).

Uses [`harmonyTouch.Typed`](#harmonytouchtyped), [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.ButtonActionDocument`](#harmonytouchbuttonactiondocument).

### `harmonyTouch.ButtonActionDocument`

```ts
interface ButtonActionDocument extends Typed {
  readonly 'DeviceId-'?: Id;
  readonly CommandName?: string;
  readonly 'FunctionId-'?: number;
  readonly SequenceId?: Id;
  readonly ActionName?: string;
  readonly Duration?: number;
  readonly Order?: number;
  readonly EventType?: number;
}
```

A button's action, told apart by `__type`: a command naming a device and a command by name, a sequence by
id, a client action by name (`Numpad` opens the number pad), or a sequence's delay, whose `Duration` is in
seconds.

Uses [`harmonyTouch.Typed`](#harmonytouchtyped), [`harmonyTouch.Id`](#harmonytouchid).

### `harmonyTouch.ButtonMap`

```ts
interface ButtonMap extends Typed {
  readonly ButtonMapIdentifier?: string;
  readonly 'DeviceId-'?: Id;
  readonly 'ActivityId-'?: Id;
  readonly Buttons?: readonly Button[] | null;
  readonly Sequences?: readonly Sequence[] | null;
}
```

A device's map (`DeviceButtonMap`) or an activity's (`ActivityButtonMap`).

Uses [`harmonyTouch.Typed`](#harmonytouchtyped), [`harmonyTouch.Id`](#harmonytouchid), [`harmonyTouch.Button`](#harmonytouchbutton), [`harmonyTouch.Sequence`](#harmonytouchsequence).

### `harmonyTouch.Carried`

```ts
interface Carried {
  readonly [field: string]: unknown;
}
```

Any field the reference does not type, carried through untouched.

### `harmonyTouch.Channel`

```ts
interface Channel extends Carried {
  readonly number?: string;
  readonly popularRank?: number;
  readonly station?: (Carried & { readonly id?: string; readonly shortName?: string; readonly fullName?: string }) | null;
}
```

One channel of the provider's line up.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried).

### `harmonyTouch.CodeSegment`

```ts
interface CodeSegment extends Carried {
  readonly Name: string | null;
  readonly Atoms?: readonly Atom[] | null;
  readonly Header: readonly Atom[] | null;
  readonly Trailer: readonly Atom[] | null;
  readonly TotalLength: number | null;
  readonly Payload: null;
}
```

A code segment, literal durations. A Touch reads its `Atoms` alone.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.Atom`](#harmonytouchatom).

### `harmonyTouch.Command`

```ts
interface Command extends Carried {
  readonly Name: string;
  readonly KeyCode?: string | null;
  readonly ProtocolId?: Id | null;
  readonly TransportType?: number;
  readonly Raw?: string | null;
  readonly 'FunctionId-'?: number;
}
```

One command. `TransportType` chooses how it goes out, infrared in every document measured; `Raw`, a
learned code, must be present as a key even when null, and a command whose [`KeyCode`](config.md#keycode) key is missing
cannot be sent, "What a writer must carry".

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.Id`](#harmonytouchid).

### `harmonyTouch.CONFIGURATION_DOCUMENTS`

```ts
const CONFIGURATION_DOCUMENTS = ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList'] as const
```

The six documents a sync down always asks for, in the order the remote asks for them.

### `harmonyTouch.CONTENT_DEVICE`

```ts
const CONTENT_DEVICE = 'content://1.0/device;'
```

The start of the address of a favourites document kept per device.

### `harmonyTouch.CONTENT_SERVICE`

```ts
const CONTENT_SERVICE = 'content://1.0/service/'
```

The start of the address of a favourites document kept per channel provider, its line up.

### `harmonyTouch.CONTENT_USER`

```ts
const CONTENT_USER = 'content://1.0/user;'
```

The start of each favourites document's address, `favourites-and-settings.md`, "Where each is kept".

### `harmonyTouch.ContentDevice`

```ts
interface ContentDevice extends Carried {
  readonly id?: string;
  readonly services?: Readonly<Record<string, Carried & { readonly dialPositions?: readonly DialPosition[] | null }>> | null;
}
```

A favourites document kept per device: the positions a provider's channels are on.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.DialPosition`](#harmonytouchdialposition).

### `harmonyTouch.ContentService`

```ts
interface ContentService extends Carried {
  readonly id?: string;
  readonly channels?: readonly Channel[] | null;
}
```

A favourites document kept per channel provider: its channels.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.Channel`](#harmonytouchchannel).

### `harmonyTouch.ContentUser`

```ts
interface ContentUser extends Carried {
  readonly id?: string;
  readonly preferences?: Readonly<Record<string, Readonly<Record<string, Carried & {
    readonly stations?: readonly (Carried & { readonly id: string })[] | null;
  }>>>> | null;
}
```

The user's document: the favourites in the order shown, per device key and service.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried).

### `harmonyTouch.Context`

```ts
interface Context extends Carried {
  readonly 'AccountId-'?: Id;
  readonly HouseholdUserProfileUri?: string | null;
  readonly Language?: string | null;
  readonly Email?: string | null;
  readonly InstallerId?: unknown;
  readonly CountryCode?: string | null;
  readonly SetupSession?: (Carried & { readonly Type?: number; readonly SetupType?: string | null }) | null;
}
```

The document that ties the remote to its account: the account's number, the address of the user's favourites, and the language.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.Id`](#harmonytouchid).

### `harmonyTouch.Device`

```ts
interface Device extends Carried {
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
```

A device's own record. The required fields are optional here because [`check.ts`](../../../packages/config/src/families/harmony-touch/check.ts) reports their absence.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.Id`](#harmonytouchid).

### `harmonyTouch.DeviceFeature`

```ts
interface DeviceFeature extends Typed {
  readonly PowerTypeId?: number;
  readonly PowerOnDelay?: number;
  readonly ConnectedAppPowerOnDelay?: number;
  readonly IsPowerAlwaysOn?: boolean;
  readonly IsPoweredOnBetweenActivities?: boolean;
  readonly PowerOnActions?: readonly FeatureAction[] | null;
  readonly PowerOffActions?: readonly FeatureAction[] | null;
  readonly PowerToggleActions?: readonly FeatureAction[] | null;
  readonly InputDelay?: number;
  readonly Inputs?: readonly Input[] | null;
  readonly FixedDigits?: number | null;
  readonly StartActions?: readonly FeatureAction[] | null;
  readonly GreaterTenActions?: readonly FeatureAction[] | null;
  readonly GreaterHundredActions?: readonly FeatureAction[] | null;
  readonly FinishActions?: readonly FeatureAction[] | null;
}
```

A device feature, told apart by `__type`: power, inputs, channel tuning, states of its own, outputs.

Uses [`harmonyTouch.Typed`](#harmonytouchtyped), [`harmonyTouch.FeatureAction`](#harmonytouchfeatureaction), [`harmonyTouch.Input`](#harmonytouchinput).

### `harmonyTouch.DeviceList`

```ts
interface DeviceList extends Carried {
  readonly DevicesWithFeatures: readonly DeviceWithFeatures[];
}
```

The document that holds every device with its commands.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.DeviceWithFeatures`](#harmonytouchdevicewithfeatures).

### `harmonyTouch.DeviceWithFeatures`

```ts
interface DeviceWithFeatures extends Carried {
  readonly Device: Device;
  readonly DeviceFeatures: readonly DeviceFeature[] | null;
  readonly Commands: readonly Command[] | null;
}
```

One device of the DeviceList document: the device, what it can do, and its commands.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.Device`](#harmonytouchdevice), [`harmonyTouch.DeviceFeature`](#harmonytouchdevicefeature), [`harmonyTouch.Command`](#harmonytouchcommand).

### `harmonyTouch.DialPosition`

```ts
interface DialPosition extends Carried {
  readonly station?: string;
  readonly number?: string;
  readonly name?: string;
  readonly image?: string;
  readonly added?: boolean;
}
```

One favourite as the tuning device's document states it.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried).

### `harmonyTouch.documentKeyOf`

```ts
function documentKeyOf(uri: string): string | undefined
```

The key a document asked for at `uri` is kept under in [`SyncDocuments`](#harmonytouchsyncdocuments): a `harmony://` address by its last
path segment before any query, [`MapList`](#harmonytouchmaplist) out of `.../MapList?excludeFunctionMaps=true`, a `content://`
address whole, and anything else, a picture or a `proxy://` ending, `undefined`, since it carries no
document. The one statement of the rule [`documentsOfAnswers`](#harmonytouchdocumentsofanswers) keys by, exported so that the answerer of a
sync, [`packages/remote/src/touchsync.ts`](../../../packages/remote/src/touchsync.ts), finds a request's document by the same rule rather than a copy.

### `harmonyTouch.documentsOfAnswers`

```ts
function documentsOfAnswers(answers: readonly SyncAnswer[]): SyncDocuments
```

The documents of a sync out of the answers the computer handed the remote, keyed as [`SyncDocuments`](#harmonytouchsyncdocuments) says.

A `harmony://` address names its document by its last path segment, before any query, which is how the
remote names the file it keeps it as, [`Context.json`](#harmonytouchcontext) for `.../Context`; a `content://` address is kept
whole, since the remote finds those documents by building the address again. The pictures, `https` and
`content-image://`, and the `proxy://Finished` acknowledgement carry no document and are left out. A
later answer for the same resource replaces an earlier one, as a later sync's answer replaces what the
remote held.

**The result has no prototype.** Its keys come from addresses the remote and the computer exchanged, and
an address ending in `/__proto__` assigned into an ordinary object would not add a key: it would replace
the object's prototype, and every later lookup of a document name would read through whatever that answer
held. On an object made by `Object.create(null)` the same assignment is an ordinary own key.

**The derivation of a resource's name has a twin**, `resource` in [`packages/usb/src/touchrecording.ts`](../../../packages/usb/src/touchrecording.ts),
which the tests of the recordings in `packages/usb` key their answers by. It is kept there because
`packages/usb` cannot import the codec, which depends on it; the two are the same one line rule, and if one
changes the other has to.

Uses [`harmonyTouch.SyncAnswer`](#harmonytouchsyncanswer), [`harmonyTouch.SyncDocuments`](#harmonytouchsyncdocuments).

### `harmonyTouch.Encoding`

```ts
interface Encoding extends Carried {
  readonly BitType: number;
  readonly Atoms: readonly Atom[] | null;
}
```

One cell of an encoded segment, the durations one symbol is sent as.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.Atom`](#harmonytouchatom).

### `harmonyTouch.FeatureAction`

```ts
interface FeatureAction extends Typed {
  readonly Order?: number;
  readonly IRCommandName?: string;
  readonly Duration?: number | null;
  readonly Delay?: number;
  readonly StateName?: string;
  readonly StateValue?: string;
}
```

One step of a feature's action list: an infrared press naming a command, a delay, or a state step.
`Duration` on a press is how long the code is held, in milliseconds.

Uses [`harmonyTouch.Typed`](#harmonytouchtyped).

### `harmonyTouch.Id`

```ts
type Id = number | string;
```

An identifier as the documents state it: a number in every document measured, compared as text.

### `harmonyTouch.idText`

```ts
const idText: (id: Id | null | undefined) => string
```

An identifier as the text the remote compares and builds identifiers with.

Uses [`harmonyTouch.Id`](#harmonytouchid).

### `harmonyTouch.Input`

```ts
interface Input extends Carried {
  readonly InputName: string;
  readonly InputOrder?: number;
  readonly IsOnline?: boolean;
  readonly Actions?: readonly FeatureAction[] | null;
}
```

One input of a device, by its name, with the steps that select it.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.FeatureAction`](#harmonytouchfeatureaction).

### `harmonyTouch.IrProtocol`

```ts
interface IrProtocol extends Typed {
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
```

Logitech's [`IrProtocol`](#harmonytouchirprotocol), a code family's definition. A Touch is given the catalogue's own definition,
unchanged, under the catalogue's protocol id, `devices-and-infrared.md`, "Built at the moment of sending".

Uses [`harmonyTouch.Typed`](#harmonytouchtyped), [`harmonyTouch.Id`](#harmonytouchid), [`harmonyTouch.IrSegment`](#harmonytouchirsegment), [`harmonyTouch.CodeSegment`](#harmonytouchcodesegment), [`harmonyTouch.SegmentReference`](#harmonytouchsegmentreference).

### `harmonyTouch.IrSegment`

```ts
interface IrSegment extends Carried {
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
```

An encoded segment, one that carries the bits of a value. `Payload.EncodingType` 0 or 1 reads each
hexadecimal digit as four bits, 2 or 3 each digit as one symbol; `ToggleBit` is the bit the remote flips
per send, `devices-and-infrared.md`, "How a code becomes durations".

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.Atom`](#harmonytouchatom), [`harmonyTouch.Encoding`](#harmonytouchencoding).

### `harmonyTouch.kindOf`

```ts
function kindOf(x: { readonly __type?: unknown } | null | undefined): string
```

A `__type` without its namespace or assembly: `ChannelChangingActivityRole` out of
`ChannelChangingActivityRole:#Logitech...` or out of an assembly qualified `Logitech.X.IRPressAction, ...`.
Every `__type` of the syncs measured is already bare; the other two spellings are what Logitech's service
writes elsewhere, and reading them costs nothing.

### `harmonyTouch.MapList`

```ts
interface MapList extends Carried {
  readonly ButtonMaps: readonly ButtonMap[];
}
```

The document that holds every key map, a device's own and each activity's.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.ButtonMap`](#harmonytouchbuttonmap).

### `harmonyTouch.ProtocolList`

```ts
interface ProtocolList extends Carried {
  readonly Protocols: readonly IrProtocol[];
}
```

The document that holds the infrared protocols the devices' commands are written in.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.IrProtocol`](#harmonytouchirprotocol).

### `harmonyTouch.Role`

```ts
interface Role extends Typed {
  readonly 'DeviceId-': Id;
  readonly PowerOnOrder?: number;
  readonly PowerOffOrder?: number;
  readonly NextDevicePowerOnDelay?: number | null;
  readonly SelectedInput?: (Carried & {
    readonly Name?: string | null;
    readonly ChannelNumber?: string | number | null;
  }) | null;
}
```

A role: a device in an activity, its two power orders and the input it is switched to.

Uses [`harmonyTouch.Typed`](#harmonytouchtyped), [`harmonyTouch.Id`](#harmonytouchid), [`harmonyTouch.Carried`](#harmonytouchcarried).

### `harmonyTouch.SegmentReference`

```ts
interface SegmentReference extends Carried {
  readonly SegmentName: string | null;
  readonly SegmentType: number;
}
```

One entry of a definition's own [`KeyCode`](config.md#keycode) lists, which a Touch never reads.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried).

### `harmonyTouch.Sequence`

```ts
interface Sequence extends Carried {
  readonly SequenceId: Id;
  readonly Name?: string;
  readonly Actions?: readonly ButtonActionDocument[] | null;
}
```

One sequence of an activity: a named list of commands and pauses that one key sends.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.Id`](#harmonytouchid), [`harmonyTouch.ButtonActionDocument`](#harmonytouchbuttonactiondocument).

### `harmonyTouch.Setting`

```ts
interface Setting extends Carried {
  readonly Name: string;
  readonly Values?: readonly (string | null)[] | null;
  readonly DefaultValue?: string | null;
}
```

One row: a name and a list of values, the remote reading the first.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried).

### `harmonyTouch.Settings`

```ts
interface Settings extends Carried {
  readonly RemoteName?: string | null;
  readonly UserImageBucketUri?: string | null;
  readonly DefaultImageBucketUri?: string | null;
  readonly Settings?: readonly Setting[] | null;
}
```

The document that holds the remote's own settings, its name and background among them.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried), [`harmonyTouch.Setting`](#harmonytouchsetting).

### `harmonyTouch.SyncAnswer`

```ts
interface SyncAnswer {
  readonly uri: string;
  readonly resource?: unknown;
}
```

One answer the computer hands the remote: the address, and the document, parsed.

### `harmonyTouch.SyncDocuments`

```ts
interface SyncDocuments {
  readonly ActivityList?: ActivityList;
  readonly DeviceList?: DeviceList;
  readonly MapList?: MapList;
  readonly ProtocolList?: ProtocolList;
  readonly Context?: Context;
  readonly Settings?: Settings;
  readonly [resource: string]: unknown;
}
```

The documents of one sync, as parsed JSON, keyed by resource.

**The six configuration documents by their resource name**, the last segment of the logical address the
remote asks for them by, [`ActivityList`](#harmonytouchactivitylist), [`DeviceList`](#harmonytouchdevicelist), [`MapList`](#harmonytouchmaplist), [`Context`](#harmonytouchcontext), [`Settings`](#harmonytouchsettings) and
[`ProtocolList`](#harmonytouchprotocollist); **a content document by the whole address it was asked for at**, which the reader builds
again from the other documents the way the remote does, `favourites-and-settings.md`, "Where each is
kept". The pictures are not documents and are not read here.

Uses [`harmonyTouch.ActivityList`](#harmonytouchactivitylist), [`harmonyTouch.DeviceList`](#harmonytouchdevicelist), [`harmonyTouch.MapList`](#harmonytouchmaplist), [`harmonyTouch.ProtocolList`](#harmonytouchprotocollist), [`harmonyTouch.Context`](#harmonytouchcontext), [`harmonyTouch.Settings`](#harmonytouchsettings).

### `harmonyTouch.Typed`

```ts
interface Typed extends Carried {
  readonly __type?: string;
}
```

Logitech's `__type`, a type name, sometimes namespaced; [`kindOf`](#harmonytouchkindof) reads the bare name out of it.

Uses [`harmonyTouch.Carried`](#harmonytouchcarried).

## Reading them as the remote does

Devices, activities, buttons, favourites, context and settings.

### `harmonyTouch.CHANNEL_DEVICE_ORDER`

```ts
const CHANNEL_DEVICE_ORDER = ['ControlsRokuActivityRole', 'ControlsSonosActivityRole', 'ControlsAppActivityRole', 'ControlsSpeakerActivityRole', 'ChannelChangingActivityRole'] as const
```

The roles in the order the remote picks the device a favourite channel is sent to, the app's role included.

### `harmonyTouch.Configuration`

```ts
interface Configuration {
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
```

The whole configuration of one sync, read.

Uses [`harmonyTouch.SyncDocuments`](#harmonytouchsyncdocuments), [`harmonyTouch.ReadProtocol`](#harmonytouchreadprotocol), [`harmonyTouch.ReadDevice`](#harmonytouchreaddevice), [`harmonyTouch.ReadMap`](#harmonytouchreadmap), [`harmonyTouch.ReadActivity`](#harmonytouchreadactivity), [`harmonyTouch.ReadFavourites`](#harmonytouchreadfavourites), [`harmonyTouch.ReadSettings`](#harmonytouchreadsettings-type), [`harmonyTouch.ReadContext`](#harmonytouchreadcontext-type).

### `harmonyTouch.DEFAULT_PRESS_REPEATS`

```ts
const DEFAULT_PRESS_REPEATS = 3
```

How many times a press repeats the code when the device states no count, or a negative one: the engine's
own 3, `devices-and-infrared.md`, "From a key press to the lamp".

### `harmonyTouch.DELETED_ON_REMOTE`

```ts
const DELETED_ON_REMOTE = 4
```

`ButtonState` 4, an entry deleted on the remote and kept in the document, hidden by the screens.

### `harmonyTouch.FAVOURITES_ROLES`

```ts
const FAVOURITES_ROLES = ['ControlsRokuActivityRole', 'ControlsSonosActivityRole', 'ControlsSpeakerActivityRole', 'ChannelChangingActivityRole'] as const
```

The roles that make a tuning default activity a favourites activity, in the order the engine picks the
device a channel goes to: Roku, Sonos, app, speaker, then the channel changing device. The firmware keeps
favourites for an activity with any of the four other than the app, "Favourite channels"; the account
measured held only the channel changing role, so the other four are read in the firmware and not
exercised.

### `harmonyTouch.FIRMWARE_SETTINGS`

```ts
const FIRMWARE_SETTINGS = {
  TwelveHourClock: true,
  AccelFlag: true,
  HapticFlag: true,
  ScreenLockFlag: false,
  EditLock: false,
  ScreenBrightness: 85,
  ScreenTimeout: 10,
  KeyBrightness: 35,
  HapticEffect: '13',
} as const
```

The firmware's defaults, "Settings", for a setting the account states no value for: a yes or no setting
as the firmware's `getSettingsDefaultValue` sets it, a number as its constants. Every value is in the
page's table, `HapticFlag` and `HapticEffect` among them, which no sync measured carried. No default is
stated for `ActivityPressDuration`, which no screen asks for, and the background's is a built in picture
whose name stays in the image.

### `harmonyTouch.INFRARED_TRANSPORT`

```ts
const INFRARED_TRANSPORT = 1
```

The one transport number the documents measured hold for an infrared command and an infrared device, 1
on all 373 commands and 7 devices of the full sync. The engine sends a command over Bluetooth, a keyboard
or the network by its `TransportType` and over infrared otherwise; the numbers of the other three are not
stated in the reference, so only this one is named.

### `harmonyTouch.mapIdentifier`

```ts
function mapIdentifier(kind: 'device' | 'activity', ownerId: string): string
```

The identifier the engine looks a map up by, `16417Device<device>` or `16417Activity<activity>`.

### `harmonyTouch.NUMBER_PAD_GROUP`

```ts
const NUMBER_PAD_GROUP = 2
```

The number pad's `FunctionGroupType`: entries kept apart from the list and drawn on the number pad screen.

### `harmonyTouch.NUMBER_PAD_LEFT`

```ts
const NUMBER_PAD_LEFT = ['-', '.', '*', 'NumberPlus'] as const
```

The names the number pad screen places on a key, besides the digits: the four on the key left of 0 and
the four on the key right of it, `activities-and-buttons.md`, "Screen entries and the number pad". An
entry of any other name is placed on no key.

### `harmonyTouch.NUMBER_PAD_RIGHT`

```ts
const NUMBER_PAD_RIGHT = ['Enter', 'NumberEnter', '#', 'ENT'] as const
```

The names the number pad screen places on the key right of 0.

### `harmonyTouch.numberPadKey`

```ts
function numberPadKey(commandName: string): string | 'left of 0' | 'right of 0' | undefined
```

The number pad key a command name lands on, or `undefined` for one placed on no key.

### `harmonyTouch.Place`

```ts
interface Place {
  readonly document: string;
  readonly path: string;
}
```

Where an object sits in its document, as a path a person can follow, and the document it is in.

### `harmonyTouch.ReadActivity`

```ts
interface ReadActivity extends Place {
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
```

An activity as the remote reads it, its devices, steps and key map resolved.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.ReadRole`](#harmonytouchreadrole), [`harmonyTouch.ReadActivityDevice`](#harmonytouchreadactivitydevice), [`harmonyTouch.ReadActivityStep`](#harmonytouchreadactivitystep), [`harmonyTouch.ReadMap`](#harmonytouchreadmap), [`harmonyTouch.Activity`](#harmonytouchactivity).

### `harmonyTouch.ReadActivityDevice`

```ts
interface ReadActivityDevice {
  readonly deviceId: string;
  readonly device: ReadDevice | undefined;
  readonly role: ReadRole;
  readonly kinds: readonly string[];
}
```

One device of an activity as the engine sets it up: **the first role naming a device makes its power on
step and its input step**, and a further role of the same device adds only its role kind,
`activities-and-buttons.md`, "An activity: what it is made of".

Uses [`harmonyTouch.ReadDevice`](#harmonytouchreaddevice), [`harmonyTouch.ReadRole`](#harmonytouchreadrole).

### `harmonyTouch.ReadActivityStep`

```ts
interface ReadActivityStep extends Place {
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
```

A step added by hand to an activity's start or end: a command, a delay in milliseconds, or a channel.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.ReadDevice`](#harmonytouchreaddevice), [`harmonyTouch.ReadCommand`](#harmonytouchreadcommand), [`harmonyTouch.ActivityAction`](#harmonytouchactivityaction).

### `harmonyTouch.ReadButton`

```ts
interface ReadButton extends Place {
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
```

One button of a map: a key by its name, a screen entry by its place in the list, a number pad entry, or
a gesture.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.ReadButtonAction`](#harmonytouchreadbuttonaction), [`harmonyTouch.Button`](#harmonytouchbutton).

### `harmonyTouch.ReadButtonAction`

```ts
interface ReadButtonAction extends Place {
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
```

A button's action. A command names a device and a command by name, matched case blind; a sequence names a
sequence of the same map by id; a client action is the screens' own (`Numpad` opens the number pad); a
delay is a sequence step, its `Duration` in seconds and given here in milliseconds, as both of the
engine's readers multiply it by 1000.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.ReadDevice`](#harmonytouchreaddevice), [`harmonyTouch.ReadCommand`](#harmonytouchreadcommand), [`harmonyTouch.ButtonActionDocument`](#harmonytouchbuttonactiondocument).

### `harmonyTouch.ReadChannelTuning`

```ts
interface ReadChannelTuning extends Place {
  readonly fixedDigits: number | null | undefined;
  readonly start: readonly ReadFeatureAction[];
  readonly greaterTen: readonly ReadFeatureAction[];
  readonly greaterHundred: readonly ReadFeatureAction[];
  readonly finish: readonly ReadFeatureAction[];
  readonly source: DeviceFeature;
}
```

How a device is told a channel number, `favourites-and-settings.md`, "How a favourite becomes key
presses": its start list, the number padded with zeros to `fixedDigits`, a prefix before a number of 10
or more and another before one of 100 or more, and its finish list.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.ReadFeatureAction`](#harmonytouchreadfeatureaction), [`harmonyTouch.DeviceFeature`](#harmonytouchdevicefeature).

### `harmonyTouch.ReadCommand`

```ts
interface ReadCommand extends Place {
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
```

One command of a device.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.ReadProtocol`](#harmonytouchreadprotocol), [`StatedCode`](config.md#statedcode-type), [`ArchiveKeyCode`](config-types.md#archivekeycode), [`harmonyTouch.Command`](#harmonytouchcommand).

### `harmonyTouch.readConfiguration`

```ts
function readConfiguration(documents: SyncDocuments): Configuration
```

Read the documents of one sync into the view above. Any of the documents may be absent, as the reverse
sync measured holds Settings alone; what is absent reads as empty and is named in `absent`.

Uses [`harmonyTouch.SyncDocuments`](#harmonytouchsyncdocuments), [`harmonyTouch.Configuration`](#harmonytouchconfiguration).

### `harmonyTouch.ReadContext` (type)

```ts
interface ReadContext extends Place {
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
```

The Context document as [`readContext`](#harmonytouchreadcontext) gives it.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.Context`](#harmonytouchcontext).

### `harmonyTouch.readContext`

```ts
function readContext(c: Context): ReadContext
```

The Context document as the remote reads it.

Uses [`harmonyTouch.Context`](#harmonytouchcontext), [`harmonyTouch.ReadContext`](#harmonytouchreadcontext-type).

### `harmonyTouch.ReadDevice`

```ts
interface ReadDevice extends Place {
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
```

A device as the remote reads it, with its commands, inputs and power.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.ReadCommand`](#harmonytouchreadcommand), [`harmonyTouch.ReadPower`](#harmonytouchreadpower), [`harmonyTouch.ReadInput`](#harmonytouchreadinput), [`harmonyTouch.ReadChannelTuning`](#harmonytouchreadchanneltuning), [`harmonyTouch.DeviceFeature`](#harmonytouchdevicefeature), [`harmonyTouch.ReadMap`](#harmonytouchreadmap), [`harmonyTouch.DeviceWithFeatures`](#harmonytouchdevicewithfeatures).

### `harmonyTouch.ReadFavourite`

```ts
interface ReadFavourite {
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
```

One favourite channel, a station, filled the way the remote fills it.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.DialPosition`](#harmonytouchdialposition), [`harmonyTouch.Channel`](#harmonytouchchannel).

### `harmonyTouch.ReadFavourites`

```ts
interface ReadFavourites {
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
```

The favourites of one activity, `favourites-and-settings.md`, "Favourite channels": the order from the
user's document, each number, name and picture from the tuning device's document, and what that leaves
out from the provider's line up.

Uses [`harmonyTouch.ReadActivity`](#harmonytouchreadactivity), [`harmonyTouch.ReadDevice`](#harmonytouchreaddevice), [`harmonyTouch.ReadChannelTuning`](#harmonytouchreadchanneltuning), [`harmonyTouch.ReadFavourite`](#harmonytouchreadfavourite), [`harmonyTouch.ContentUser`](#harmonytouchcontentuser), [`harmonyTouch.ContentDevice`](#harmonytouchcontentdevice), [`harmonyTouch.ContentService`](#harmonytouchcontentservice).

### `harmonyTouch.ReadFeatureAction`

```ts
interface ReadFeatureAction extends Place {
  readonly kind: string;
  readonly order: number | undefined;
  readonly commandName: string | undefined;
  /** How long a press holds the code, in milliseconds, when it states one. */
  readonly durationMs: number | null | undefined;
  readonly delayMs: number | undefined;
  readonly source: FeatureAction;
}
```

One step of a device feature's list: a press of a command, a delay, a state step.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.FeatureAction`](#harmonytouchfeatureaction).

### `harmonyTouch.ReadInput`

```ts
interface ReadInput extends Place {
  readonly name: string;
  readonly order: number | undefined;
  /** Marks an input whose selection takes the connected app power on delay. */
  readonly online: boolean;
  readonly actions: readonly ReadFeatureAction[];
  readonly source: Input;
}
```

An input of a device as the remote reads it.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.ReadFeatureAction`](#harmonytouchreadfeatureaction), [`harmonyTouch.Input`](#harmonytouchinput).

### `harmonyTouch.ReadMap`

```ts
interface ReadMap extends Place {
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
```

A key map as the remote reads it: whose it is and what each key sends.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.ReadButton`](#harmonytouchreadbutton), [`harmonyTouch.ReadSequence`](#harmonytouchreadsequence), [`harmonyTouch.ButtonMap`](#harmonytouchbuttonmap).

### `harmonyTouch.ReadPower`

```ts
interface ReadPower extends Place {
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
```

A device's power, `devices-and-infrared.md`, "Delays a device states". `PowerTypeId` 0 or 3 is a device
powered by hand, which gets neither power step; 1 makes power two discrete states and 2 one that steps.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.ReadFeatureAction`](#harmonytouchreadfeatureaction), [`harmonyTouch.DeviceFeature`](#harmonytouchdevicefeature).

### `harmonyTouch.ReadProtocol`

```ts
interface ReadProtocol extends Place {
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
```

A code family's definition, as the protocol list states it.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`StatedProtocol`](config.md#statedprotocol), [`ArchiveProtocol`](config.md#archiveprotocol), [`harmonyTouch.IrProtocol`](#harmonytouchirprotocol).

### `harmonyTouch.ReadRole`

```ts
interface ReadRole extends Place {
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
```

A device's role in an activity as the remote reads it, with its place in the order devices are switched on and off.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.ReadDevice`](#harmonytouchreaddevice), [`harmonyTouch.Role`](#harmonytouchrole).

### `harmonyTouch.ReadSequence`

```ts
interface ReadSequence extends Place {
  readonly id: string;
  readonly name: string | undefined;
  /** In `Order`; a step without one stops the engine's reader, which `check.ts` reports. */
  readonly steps: readonly ReadButtonAction[];
  readonly source: Sequence;
}
```

A sequence as the remote reads it, its steps in order.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.ReadButtonAction`](#harmonytouchreadbuttonaction), [`harmonyTouch.Sequence`](#harmonytouchsequence).

### `harmonyTouch.ReadSettings` (type)

```ts
interface ReadSettings extends Place {
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
```

The Settings document as [`readSettings`](#harmonytouchreadsettings) gives it.

Uses [`harmonyTouch.Place`](#harmonytouchplace), [`harmonyTouch.SettingValue`](#harmonytouchsettingvalue), [`harmonyTouch.Setting`](#harmonytouchsetting), [`harmonyTouch.Settings`](#harmonytouchsettings).

### `harmonyTouch.readSettings`

```ts
function readSettings(s: Settings): ReadSettings
```

The Settings document as the remote reads it, each setting by its name.

Uses [`harmonyTouch.Settings`](#harmonytouchsettings), [`harmonyTouch.ReadSettings`](#harmonytouchreadsettings-type).

### `harmonyTouch.SCREENS_IDENTIFIER`

```ts
const SCREENS_IDENTIFIER = '16417'
```

The identifier the Touch's screens send with every press, so the prefix of every map identifier the
engine can find: `16417Device<device>` and `16417Activity<activity>`, `activities-and-buttons.md`, "How a
key press becomes a command", step 3. The hubs' screens send another number; this is the Touch's.

### `harmonyTouch.SettingValue`

```ts
interface SettingValue<T> {
  readonly value: T | undefined;
  readonly from: 'account' | 'row default' | 'firmware';
}
```

A setting's value and where it came from: the account's first value, the row's default, or the firmware's.

### `harmonyTouch.stationLogo`

```ts
const stationLogo: (station: string) => string
```

The address of a station's logo, asked for at 54 by 54.

### `harmonyTouch.uploadedLogo`

```ts
const uploadedLogo: (image: string) => string
```

The address of a logo the user uploaded for a channel.

## The check

What the remote would refuse or ignore in them, and what refuses a set before a sync.

### `harmonyTouch.checkConfiguration`

```ts
function checkConfiguration(c: Configuration): Finding[]
```

Every finding over one configuration: the lists the reader walks first, then the type names it reads, then
the other fields its load raises on, then in the order of the documents, devices, maps, activities,
favourites.

Uses [`harmonyTouch.Configuration`](#harmonytouchconfiguration), [`harmonyTouch.Finding`](#harmonytouchfinding).

### `harmonyTouch.favouritesAddressFindings`

```ts
function favouritesAddressFindings(documents: SyncDocuments): Finding[]
```

`favourites address`: each favourites document of a set that sits at no address the set's own documents make the
remote ask for, `favourites-and-settings.md` "Which favourites documents are asked for". The remote pairs an answer
to its request by the address character for character, so a favourites document anywhere else is never delivered
and the sync goes through without it, the change it carried silently missing. The user's address is built from the
context, the device's from the tuning device's profile address, and the line up's from the service the user's
document names first, `readFavourites`; a line up with no user's document beside it cannot be placed and is found
for that. **Not part of [`refusalsBeforeASync`](#harmonytouchrefusalsbeforeasync)**, which says why; a set's builder refuses what this finds. The
finding names the kind of document and never its address, which carries the account's identifiers.

Uses [`harmonyTouch.SyncDocuments`](#harmonytouchsyncdocuments), [`harmonyTouch.Finding`](#harmonytouchfinding).

### `harmonyTouch.Finding`

```ts
interface Finding {
  readonly rule: Rule;
  readonly effect: 'refused' | 'ignored';
  readonly document: string;
  readonly path: string;
  readonly message: string;
}
```

One thing the check found: which rule, whether the remote would refuse the documents or ignore the part, and where.

Uses [`harmonyTouch.Rule`](#harmonytouchrule).

### `harmonyTouch.findingsByRule`

```ts
function findingsByRule(findings: readonly Finding[]): Partial<Record<Rule, number>>
```

The findings counted by rule, the shape a test or a summary wants.

Uses [`harmonyTouch.Finding`](#harmonytouchfinding), [`harmonyTouch.Rule`](#harmonytouchrule).

### `harmonyTouch.readerRaises`

```ts
function readerRaises(documents: SyncDocuments): Finding[]
```

Every place the engine's load raises on, read off the documents themselves: `missing list`, `missing type`
and the rules of `checkFields`. **This is the gate's third step and the answerer's test of a document the
remote hands up**, [`packages/remote/src/touchsync.ts`](../../../packages/remote/src/touchsync.ts), so a new rule of the load joins both by being here.

Uses [`harmonyTouch.SyncDocuments`](#harmonytouchsyncdocuments), [`harmonyTouch.Finding`](#harmonytouchfinding).

### `harmonyTouch.refusalsBeforeASync`

```ts
function refusalsBeforeASync(documents: SyncDocuments): Finding[]
```

**The gate before a write**: every finding that would make the remote's reader raise or turn a value away,
over a whole set of documents meant to answer a sync, or none when the set may be written. The answerer refuses a
set this returns anything for, before it sends the sync request.

In order, and stopping at the first kind that finds anything, since a set missing a document or a list
cannot be read the way the remote reads it:

1. **all six configuration documents present**, `document absent`: a sync down asks for every one of them
   and a status from 400 up on any aborts, `answering-a-sync.md` "The smallest set of documents"
2. **each of them a JSON object**, `not a document`: a document sent as a string of JSON or an array is
   stored as that and the reader finds none of its lists, "A document has to arrive as the object itself"
3. **every place the engine's load raises on**, [`readerRaises`](#harmonytouchreaderraises): every list the reader walks, every type
   name it searches and every other field it computes with, keys by or passes to a string function,
   `missing list`, `missing type` and `checkFields`'s rules, together, since all are read off the documents
   themselves and all end the load: a set is told every place of any of them at once, `answering-a-sync.md`
   "What the remote does not check"
4. **then the whole check, keeping what is `refused`**: what stops the reader, a required field, and what
   the remote turns away. What is only `ignored` is not a refusal: Logitech's own documents carry two kinds
   of it, `touch-reader.test.ts`.

Favourites documents present in the set are read with the rest; which ones a sync will ask for depends on
the documents, so their absence is the answerer's to meet when the remote asks. **One present at an address the
remote never asks for is not refused here**: it costs the remote nothing, since it is never delivered, and the
gate refuses what costs the remote. It costs the set its purpose, so the builder of a set refuses it,
[`favouritesAddressFindings`](#harmonytouchfavouritesaddressfindings) below and `withContent` in [`packages/remote/experiments/touchfavouritesset.ts`](../../../packages/remote/experiments/touchfavouritesset.ts).

Uses [`harmonyTouch.SyncDocuments`](#harmonytouchsyncdocuments), [`harmonyTouch.Finding`](#harmonytouchfinding).

### `harmonyTouch.Rule`

```ts
type Rule =
  | 'required field'
  | 'no key code'
  | 'no protocol'
  | 'map identifier'
  | 'no map'
  | 'repeated screen index'
  | 'action device missing'
  | 'action command missing'
  | 'role device missing'
  | 'action activity missing'
  | 'commands differ in case'
  | 'unknown input'
  | 'shared power order'
  | 'shared activity order'
  | 'number pad entry on no key'
  | 'favourite number'
  | 'missing list'
  | 'missing type'
  | 'entry not an object'
  | 'not a number'
  | 'not text'
  | 'not a list'
  | 'alternatives not an object'
  | 'no power state'
  | 'screens raise'
  | 'document absent'
  | 'not a document'
  | 'favourites address'
  | 'setting mishandled';
```

The rules, each named for what it finds.

## The engine

What the remote's engine sends for a press, and when, predicted from the documents.

### `harmonyTouch.Airtime`

```ts
interface Airtime {
  readonly lampMs: number;
  readonly firstFrameMs: number;
}
```

How long the lamp is on for one press of a command, and how long its first frame is, both in milliseconds.

### `harmonyTouch.airtimeOf`

```ts
function airtimeOf(device: ReadDevice, command: ReadCommand, firstFrame: FirstFrame): Airtime
```

The lamp's time for a command, from its definition: the codec's rendering of the code at the device's
repeat count, which gave the frame counts an infrared receiver heard for every code of the timed runs. Its first
frame is cut by the receiver's rule, `firstFrame`.

Uses [`harmonyTouch.ReadDevice`](#harmonytouchreaddevice), [`harmonyTouch.ReadCommand`](#harmonytouchreadcommand), [`harmonyTouch.FirstFrame`](#harmonytouchfirstframe), [`harmonyTouch.Airtime`](#harmonytouchairtime).

### `harmonyTouch.BETWEEN_STEPS_MS`

```ts
const BETWEEN_STEPS_MS = 60000
```

How long a person leaves between two steps: longer than any wait the engine holds, so no wait carries over.

### `harmonyTouch.FirstFrame`

```ts
type FirstFrame = (once: readonly Pulse[]) => readonly Pulse[];
```

A receiver's rule for where a code's first frame ends: the durations of the first frame of a press's train, or
none. The receiver's and not the remote's, so the engine is handed it, see this module's header.

Uses [`Pulse`](config.md#pulse).

### `harmonyTouch.Send`

```ts
interface Send {
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
```

One code the model predicts, with when it starts, in milliseconds on the model's clock.

### `harmonyTouch.TIMING`

```ts
const TIMING = {
  low: { beforeLampMs: 0, afterLampMs: 0, sleepLateMs: 0 },
  high: { beforeLampMs: 60, afterLampMs: 90, sleepLateMs: 60 },
} as const
```

The engine's overhead around a send and a sleep, at the two ends of the band. A send's lamp starts this
long after the engine asks for it and the engine goes on this long after the lamp stops; a sleep ends this
long late. The top end is calibrated against timed runs on the remote, `touch-full-bench-predicted.test.ts`: a send
and a sleep together came to 133 to 192 ms beyond a stated delay, and an activity's start to less.

### `harmonyTouch.Timing` (type)

```ts
type Timing = (typeof TIMING)[keyof typeof TIMING];
```

The engine's overhead at one end of the band, one of [`TIMING`](#harmonytouchtiming).

Uses [`harmonyTouch.TIMING`](#harmonytouchtiming).

### `harmonyTouch.TouchEngine`

```ts
class TouchEngine {
  /** `firstFrame` is the receiver's cut of a code's first frame, which only a send's `heardMs` reads. */
  constructor(config: Configuration, timing: Timing, firstFrame: FirstFrame);
  /** The activity running, by name, or undefined for none. */
  get activity(): string | undefined;
  /** The person waits before the next step, longer than any wait the engine holds. */
  idle(ms = BETWEEN_STEPS_MS): void;
  /**
   * An activity started from the activity list, or Off when `name` is undefined: the new activity's power
   * on, the old one's end steps that are not power offs sent first as their own list, the old one's power
   * offs after the new power ons for every device the new one does not power and that is not kept on, then
   * the new inputs, then its start steps and its channel. Off powers off every device still on.
   */
  start(name: string | undefined, channel?: string): Send[];
  /** A favourite channel tapped: the number to the running activity's channel device, or its activity started first. */
  favourite(activity: string, number: string): Send[];
  /**
   * A key of the keypad, tapped or held past the long press, in the running activity or in a device's mode.
   * A command goes out on its own and starts no wait; a sequence goes as a list, its delays slept.
   */
  key(key: string, how: 'tap' | 'hold', deviceName?: string): Send[];
  /**
   * An entry of the screen's command list tapped, in the running activity or in a device's mode, found by the label
   * the screens show on it. **The engine sends it as it sends a key**: its `buttonPress` takes the entry by its
   * `IndexInMenu`, which is the soft button's name, out of the same map, and goes on down the same path, so a tap
   * goes as a tapped key goes. The label is the model's handle and not the engine's, which never reads it, so a
   * label that names no entry, or two, is refused rather than guessed at.
   */
  entry(label: string, deviceName?: string): Send[];
}
```

The engine, with its state, on a clock of its own. Every method is one thing a person does, and returns
what the engine sends for it.

Uses [`harmonyTouch.Configuration`](#harmonytouchconfiguration), [`harmonyTouch.Timing`](#harmonytouchtiming-type), [`harmonyTouch.FirstFrame`](#harmonytouchfirstframe), [`harmonyTouch.Send`](#harmonytouchsend).

## The family

The Touch as a document family, which the registry chooses by model.

### `harmonyTouch.HARMONY_TOUCH_FAMILY`

```ts
const HARMONY_TOUCH_FAMILY: DocumentFamily<TouchTypes>
```

The Harmony Touch's family. `withDevice` composes through `composeTouchDeviceOfRow`; `without` is the general removal, [`remove.ts`](../../../packages/config/src/families/harmony-touch/remove.ts), which takes out everything naming what it
removes, where `withoutTouchDevice` and `withoutTouchActivity` refuse a device or an activity something names.
`withFavourites` gives the favourites documents keyed by their addresses beside the six, and `check` is the gate
the answerer runs before a sync, [`refusalsBeforeASync`](#harmonytouchrefusalsbeforeasync).

Uses [`DocumentFamily`](config.md#documentfamily), [`harmonyTouch.TouchTypes`](#harmonytouchtouchtypes).

### `harmonyTouch.TouchTypes`

```ts
interface TouchTypes {
  readonly documents: SyncDocuments;
  /** A document of version 2: the one shape every model shares, with no block of the Touch's own. */
  readonly setup: Recipe;
  /** The device archive, `archiveAt` on Node, and the account's own fields, which a document never holds. */
  readonly sources: { readonly archive: CatalogueSource; readonly account: TouchAccount };
  /** A device of ours in the rhythm table's terms, as `packages/remote/touch-devices/` holds one. */
  readonly device: RowDevice;
  readonly activity: OwnActivity;
  readonly removal: TouchRemoval;
  readonly favourites: OwnFavourites;
  readonly picture: OwnPicture;
  readonly settings: OwnSettings;
  readonly configuration: Configuration;
  readonly finding: Finding;
}
```

The Harmony Touch's own types, as [`DocumentFamily`](config.md#documentfamily) asks for them.

Uses [`harmonyTouch.SyncDocuments`](#harmonytouchsyncdocuments), [`Recipe`](config.md#recipe), [`CatalogueSource`](config.md#cataloguesource), [`TouchAccount`](config.md#touchaccount), [`RowDevice`](config-types.md#rowdevice), [`OwnActivity`](config-types.md#ownactivity), [`TouchRemoval`](config-types.md#touchremoval), [`OwnFavourites`](config-types.md#ownfavourites), [`OwnPicture`](config-types.md#ownpicture), [`OwnSettings`](config-types.md#ownsettings), [`harmonyTouch.Configuration`](#harmonytouchconfiguration), [`harmonyTouch.Finding`](#harmonytouchfinding).
