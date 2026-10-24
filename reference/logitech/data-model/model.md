# MyHarmony's data model

**What Logitech's service stores about a person's remotes**: a household, the remotes in it, the
devices each remote drives, the activities, and what every button does, with every field named the way
Logitech named it. A configuration file says what a byte is; this says what the vendor called the thing
the byte came from, and what else travelled beside it. So it is the place to look before naming a field
or designing anything about devices, activities or remotes[^d14].

The model was recovered from MyHarmony's generated service proxy and checked against replies the service
returned[^s218]. [`model.json`](model.json) is the data and this page is its reading. Two views are
generated from the data by `tools/myharmony_model.py` and never edited by hand:
[`core-model.mmd`](core-model.mmd) draws the entities an account holds, and
[`entities.md`](entities.md) lists every service contract with every field, by area. The operations the
service can be asked are [`operations.json`](operations.json).

## Why it can be trusted, and where it stops

**Three independent sources agree**, which is what makes this a measurement rather than a reading[^s218]:

* the **schema**, from the client's generated service proxy. A data contract there is not the client's
  own design: it is the wire schema the **server** declared, which is why every type states the server
  side namespace it came from;
* **instances**, in replies the service returned to five accounts;
* and **the live service**, which can be asked about anything the other two do not exercise.

Against the captured replies, **nothing in the schema is missing from live data**[^s218]:

| entity | fields in the schema | present in a live reply | extra fields the reply carried |
|---|---|---|---|
| Account | 21 | 21 | none |
| Activity | 25 | 25 | 1 |
| Device | 32 | 32 | 10 |
| Remote | 32 | 32 | 3 |
| Product | 26 | 25 | 1 |

**The service is ahead of the client build the schema came from**: it returns fields the proxy has never
heard of. So a field absent here is not a field the platform lacks, and the model is a floor rather than
a ceiling[^s218].

**It is not the configuration compiler.** It says what the platform holds, not how a configuration is
built from it.

## The shape

1352 types, of which **470 are service contracts**, with **366 references between them** over 28 areas,
and **1291 enum values**[^t-model]. The most connected types are identifier wrappers carrying no fields
at all, so the useful shape is the one below. The areas, with the contracts in each, are the headings of
[`entities.md`](entities.md)[^t-model].

**A household has zero or more remotes, and each one comes with its own account record.** A `Household`
holds `Account` records. Each account record carries **one** `Remote`, plus that remote's `Device`
records and `Activity` records. So a household is the person, and an account is neither a person nor a
home: it is the container for a single remote and everything that remote controls[^s218]. A `Remote`
carries only what is true of the physical unit, its serial numbers, its skin, its firmware identifiers
and its sync dates; a `Device` carries a manufacturer, a model, a category and a pointer into the
catalogue[^t-model].

**The schema types all of these as lists, and the service is stricter than the schema.** `Household`
declares an `Accounts` list and a `Remotes` list, and `Account` declares a `Remotes` list of its own, so
nothing in the schema bounds how many there may be[^t-model]. Two things narrow it:

* `Household.Remotes` comes back **null** in every captured household, while the account records carry
  a remote each, so the route to a remote is through the accounts[^s218];
* an account record takes **one** remote, and that is the service's own rule: `AddRemoteToAccount`
  refuses a record that already has one, [the service](../service.md#registering-a-remote). The captured
  households agree, every account record with exactly one remote[^t-households].

So the product's shape and the schema's are the **same** shape: you own remotes, a remote has devices,
and "the devices on an account" names exactly the devices of that account's one remote. `Remotes` and
`Devices` side by side on `Account` are a remote and its devices in the only container either has, not
two lists competing to own the devices[^s218].

The entities a reader meets first, each with every field it has, inherited ones included[^t-model]:

### Account

| field | type |
|---|---|
| `AccountTypeId` | int |
| `AccountUri` | Uri |
| `Activities` | Activity list |
| `ConfigVersion` | string |
| `CreateDate` | DateTime |
| `Devices` | Device list |
| `EmailToken` | string |
| `HouseholdId` | HouseholdId |
| `Id` | AccountId |
| `IsRemoved` | bool |
| `LastSetupRating` | byte |
| `Latitude` | double |
| `Longitude` | double |
| `OriginalProductIdentifier` | string |
| `ProductIdentifier` | string |
| `Properties` | AccountProperties |
| `Remotes` | Remote list |
| `SetupSession` | SetupSession |
| `Surfaces` | Surface list |
| `TimeZone` | string |
| `UserTimeZone` | string |

### Remote

| field | type |
|---|---|
| `ComputedProductSerial` | string |
| `DateCreated` | string |
| `Dongles` | Dongle list |
| `FirstConnectDate` | DateTime |
| `FirstSyncDate` | string |
| `GlobalRemoteId` | long |
| `GlobalRemoteRefurbishedDate` | DateTime |
| `GlobalRemoteRefurbishedStatus` | short |
| `GlobalRemoteSkinId` | int |
| `GlobalRemoteStatus` | short |
| `HubRemoteId` | long |
| `Id` | RemoteId |
| `IsAcceptLicense` | bool |
| `IsActiveRemote` | bool |
| `IsGlobalRemoteLocked` | bool |
| `IsProSKU` | bool |
| `IsSyncRequired` | bool |
| `JabberId` | string |
| `KeyboardLayout` | KeyboardLayoutType |
| `KeyboardLocale` | string |
| `LastProductIdentifier` | string |
| `LastSyncDate` | string |
| `LogitechProductId` | long |
| `LogitechSerial` | string |
| `Mode` | int |
| `OriginalProductIdentifier` | string |
| `RFEquadID` | string |
| `RFID` | string |
| `RemoteProperties` | RemoteProperties |
| `SerialNumber` | string |
| `SkinId` | int |
| `Surfaces` | Surface list |

### Device

| field | type |
|---|---|
| `DecodedEdid` | string |
| `DefaultInterDeviceDelay` | int |
| `DefaultInterKeyDelay` | int |
| `DefaultPressMinRepeats` | int |
| `DeviceOrder` | int |
| `DeviceType` | DeviceType |
| `EncodedEdid` | byte list |
| `HoldInterDeviceDelay` | int |
| `HoldInterKeyDelay` | int |
| `HoldMinRepeats` | int |
| `InterDeviceDelay` | int |
| `InterKeyDelay` | int |
| `Manufacturer` | string |
| `Model` | string |
| `Name` | string |
| `PictureId` | PictureId |
| `PressMinRepeats` | int |
| `ActivityIds` | ActivityId list |
| `AutoDetectedDevice` | AutoDetectedDevice |
| `BTAddress` | string |
| `Characterization` | int |
| `ContentProfileKey` | long |
| `ControlPort` | int |
| `CopiedDeviceSource` | short |
| `DeviceAddedDate` | DateTime |
| `DeviceCapabilitiesWithPriority` | PrioritizedDeviceCapability list |
| `DeviceClassification` | DeviceCategory |
| `DeviceProfileUri` | Uri |
| `DeviceSearchType` | int |
| `DeviceTypeDisplayName` | string |
| `DongleIndex` | int |
| `DongleRFID` | long |
| `GlobalDeviceVersionId` | GlobalDeviceVersionId |
| `GlobalLanguageVersionId` | GlobalLanguageVersionId |
| `Icon` | Icon |
| `Id` | DeviceId |
| `IsInterKeyDelayOptimized` | bool |
| `IsKeyboardAssociated` | bool |
| `IsMultiCode` | bool |
| `IsScartCableSupported` | bool |
| `ParentDevice` | PublicGlobalDeviceId |
| `ParentDeviceManufacturer` | string |
| `ParentDeviceModel` | string |
| `PrivateAddType` | int |
| `RegionalCharset` | string |
| `SetupState` | int |
| `State` | int |
| `SuggestedDisplay` | string |
| `Transport` | int |

### Activity

| field | type |
|---|---|
| `AccountId` | AccountId |
| `ActivityDisplayName` | string |
| `ActivityGroup` | ActivityGroup |
| `ActivityOrder` | short |
| `Alternatives` | string |
| `BaseImageUri` | string |
| `DateCreated` | DateTime |
| `DateModified` | DateTime |
| `DefaultChannel` | string |
| `DefaultStation` | string |
| `DefaultStationName` | string |
| `EnterActions` | AbstractActivityAction list |
| `Icon` | string |
| `Id` | ActivityId |
| `ImageKey` | string |
| `IsDefault` | bool |
| `IsMultiZone` | bool |
| `IsTuningDefault` | bool |
| `LeaveActions` | AbstractActivityAction list |
| `Name` | string |
| `Roles` | AbstractActivityRole list |
| `StartScreen` | string |
| `State` | ActivityState |
| `SuggestedDisplay` | string |
| `Type` | ActivityType |

### IrProtocol

The vendor's own description of an infrared protocol. Logitech's catalogue states its protocol
definitions in this shape, and the service hands none of them out,
[below](#which-operation-can-hand-back-which-entity)[^s227].

| field | type |
|---|---|
| `Id` | ProtocolId |
| `Name` | string |
| `Attributes` | AttributeType list |
| `CarrierFrequency` | long |
| `CodeSegments` | CodeSegment list |
| `Flags` | FlagType list |
| `HoldDelay` | long |
| `HoldMinimumRepeats` | long |
| `IRSegments` | IRSegment list |
| `IsFullSequence` | bool |
| `IsPadded` | bool |
| `IsPublic` | bool |
| `KeyCode` | ParsedKeyCode |
| `NumberOfLinkedLanguage` | long |
| `PressMinimumRepeats` | long |
| `Rating` | long |
| `RelatedProtocols` | ProtocolRelation list |
| `SendingType` | IRProtocolSendingTypeContract |
| `Status` | string |

## What an activity actually does

`make model-activity` draws this section: `Activity` with its roles and its actions, which the core
diagram cannot show because neither type is a core entity.

### The roles say what each device is for

An activity holds a list of roles, one per device it drives. Every role extends
`AbstractActivityRole`, and **the base carries all the substance**: `DeviceId`, `Id`, `NextDevicePowerOnDelay`, `PowerOffOrder`, `PowerOnOrder`, `SelectedInput`[^t-model].

So one role says: this device, in this position in the power on order and this position in the power
off order, waits this long before the next device is switched on, and switches to this input. That is an
activity's start described in words rather than in bytes.

**The 22 role types carry almost nothing of their own.** 21 of them declare no field at all, so the class
name is the entire value; the exception is `PowerInputActivityRole`, which adds
`DeviceClassificationName`[^t-model]. Read it as a vocabulary rather than as 22 structures:

* `AccessInternetActivityRole`
* `ChannelChangingActivityRole`
* `ControlsAppActivityRole`
* `ControlsAppleTVActivityRole`
* `ControlsComputerActivityRole`
* `ControlsMediaPlayerActivityRole`
* `ControlsNetflixActivityRole`
* `ControlsRokuActivityRole`
* `ControlsSonosActivityRole`
* `ControlsSpeakerActivityRole`
* `ControlsVideoCallActivityRole`
* `DisplayActivityRole`
* `KeyboardTextEntryActivityRole`
* `PassThroughActivityRole`
* `PlayGameActivityRole`
* `PlayMediaActivityRole`
* `PlayMovieActivityRole`
* `PowerInputActivityRole`
* `RunLogitechGoogleTVActivityRole`
* `SilentActivityRole`
* `SmartTVActivityRole`
* `VolumeActivityRole`

**They correspond to a device's declared capabilities, but only partly.**
`DeviceCapabilityType` has 81 values and 14 of the 22 role names appear among them exactly. Two more are the same word in another order
or with a prefix, `ChannelChanging` against `ChangingChannel` and `SmartTV` against `IsSmartTV`. The
remaining six, `ControlsApp`, `ControlsSpeaker`, `ControlsVideoCall`, `PassThrough`, `PowerInput` and
`Silent`, match nothing in the capability list[^t-model]. Whether a device's capabilities decide which
roles it may take is not established[^unchecked].

### The actions are typed, and a stored activity leaves them empty

`EnterActions` and `LeaveActions` are ordered lists. Every action extends `AbstractActivityAction`, which
carries `ActionOrder`, `Id`, and there are exactly three kinds[^t-model]:

| action | what it adds | what it does |
|---|---|---|
| `CommandActivityAction` | `CommandName`, `DeviceId`, `TargetLevel` | send a named command to one device |
| `ChannelActivityAction` | `ChannelNumber`, `DeviceId` | tune one device to a channel |
| `DelayActivityAction` | `Duration` | wait |

**A stored activity is roles and a wanted state, not a list of actions.** On the activities captured with
the configurations compiled from them, `EnterActions` and `LeaveActions` are empty: the sequence a remote
runs is worked out by Logitech's compiler from the roles, the selected inputs and the power order, which
is the same division the configuration itself makes[^s145]. Each captured role names its device, its
`SelectedInput` **by name**, and its place in the power on and power off order, and states
`NextDevicePowerOnDelay` as null[^s145].

**A command is named rather than numbered**, which is the same distinction the function maps make below:
a configuration numbers a command and the platform names it[^s220].

**Neither delay states its unit.** `DelayActivityAction.Duration` and
`AbstractActivityRole.NextDevicePowerOnDelay` carry no unit in the schema[^t-model]. The delay a device
actually carries is on its power feature, in milliseconds, [the service](../service.md#the-device-catalogue-is-its-own-call)[^s235].

## The button maps, which say which button sends what

**A second cluster, 31 types.** The core diagram draws none of it, because nothing in it is reachable from
a household: the maps hang off a remote by identifier rather than by reference[^t-model].

### A device map and an activity map are two types, not one

`AbstractButtonMap` carries `ButtonMapId`, `ButtonMapIdentifier`, `ButtonMapSurfaceId`, `Buttons`, `DateModified`, `RemoteId`, `Sequences`, `SurfaceId`,
and it has exactly three subclasses[^t-model]:

| map | what keys it |
|---|---|
| `DeviceButtonMap` | `DeviceId` |
| `ActivityButtonMap` | `ActivityId` |
| `RootButtonMap` | nothing: it adds no field at all |

**This is Logitech stating the operating concept in its own schema.**
[How a Harmony works](../../how-a-harmony-works.md) says a device's map and an activity's map are two
maps of the same keypad, authored separately; here the two are separate types with a shared base, keyed
by the two different things. A device's map is what device mode uses, and a configuration states it per
device, in the device's own screen record[^s271].

**A `RootButtonMap` holds the keys that belong to neither a device nor an activity.** On the Harmony 600
it holds exactly the two activity keys and nothing else, and those keys are in no other map: an activity
key starts an activity and sends no code of its own[^s145][^t-host-client-service].

### A button has three actions, not one

`AbstractRemoteButton` carries `ButtonAction`, `ButtonDoublePressAction`, `ButtonId`, `ButtonLongPressAction`, `ButtonState`, `FunctionGroupType`.
So a single button holds a **press**, a **long press** and a **double press** action
independently[^t-model]. An editor that models a button as one binding models a third of it.

The button kinds are the remote's physical and drawn surfaces[^t-model]:

| kind | adds | what it is |
|---|---|---|
| `HardRemoteButton` | `ButtonKey` | a key on the keypad |
| `SlideOutKeypadButton` | nothing | a key under the slider, on the models that have one |
| `KeyboardButton` | `ActiveKeys`, `HasPassThroughSupport` | a key on a keyboard accessory, which can pass keystrokes through |
| `SoftRemoteButton` | `ButtonImageKey`, `ButtonImagePath`, `ImageId`, `MenuItem`, `TextOnRemote` | a drawn button on the screen, with its image, its label and its place in a menu |
| `GestureRemoteButton` | `ButtonImageKey`, `ButtonKey` | a gesture on a touch surface |
| `VoiceRemoteButton` | `ButtonKey` | a voice control |

**`SoftRemoteButton` carries a `MenuItem`**, a menu name and an index in it, which is the screen page
structure a configuration holds, named by the vendor[^t-model]. A favourite channel is one of these,
[the service](../service.md#button-maps).

### What a button can be bound to

`AbstractButtonAction` carries `EventType`, `Id`, `Order` and has 8 subclasses[^t-model]:

| action | adds | what it does |
|---|---|---|
| `ButtonActivityAction` | `ActivityId` | start an activity |
| `ButtonChannelAction` | `ChannelNumber`, `DeviceId` | tune a device to a channel |
| `ButtonClientAction` | `ActionName` | do something in the client rather than on the remote |
| `ButtonCommandAction` | `CommandName`, `DeviceId`, `FunctionId` | send one command to one device |
| `ButtonDelayAction` | `Duration` | wait |
| `ButtonHomeControlAction` | `ChangeType`, `DeviceId`, `GroupId`, `Property`, `SubDeviceId`, `Targets`, `Value` | change a home automation target |
| `ButtonProgramAction` | `ProgramId`, `Rule` | run a rule |
| `ButtonSequenceAction` | `SequenceId` | run a stored sequence, by identifier |

**`EventType` on the base is the vendor's word for a distinction the configuration makes in bytes**: a key
code in a configuration is an event type plus a scan code, press, release and repeat,
[the key table](../../config-format/modes-and-keys.md). The values are not in the schema[^t-model].

**A sequence is a first class thing**: `Sequence` holds `Actions`, `Name`, `SequenceId`, so it is an ordered list of the same
actions a button can carry, stored on the map and referenced by identifier. A button map holds its
sequences directly, which is what `Sequences` on the base means[^t-model]. So a command made of several
presses is a property of the map and not of an infrared record, and in a configuration it is an action
list that sends several codes in order, [the action language](../../config-format/actions.md).

### The function maps are the other half

`AbstractFunctionMap` carries `FunctionGroups`, `UIModeName`, and splits the same two ways,
`DeviceFunctionMap` and `ActivityFunctionMap`. A function map is a **list of commands offered**, grouped
and labelled; a button map is **what each key does**. `FunctionGroup` and `FunctionAction` both extend
`FunctionBase`, so a group can contain groups[^t-model].

`FunctionAction` carries `CommandName`, `DeviceId`, `FunctionId`, `Label`, `TransportType`, and
`TransportType` is the field that separates a named group from the catch all, below[^s220].

## The device catalogue, and what it says about an infrared code

**The third cluster, 75 types, and about half of it is search criteria**, one class per way of asking the
catalogue a question, listed in [`entities.md`](entities.md) rather than described here[^t-model]. The
other half describes a **code**. `make model-cluster CLUSTER=catalogue` draws it. What the catalogue
holds is [the device catalogue](../device-catalogue.md).

### The pieces

`IrProtocol` extends `AbstractProtocol`, alongside `BluetoothProtocol`, `HidProtocol`, `RfProtocol` and
`UsbHidProtocol`, so infrared is one transport among five in the model[^t-model].
It carries `Attributes`, `CarrierFrequency`, `CodeSegments`, `Flags`, `HoldDelay`, `HoldMinimumRepeats`, `IRSegments`, `IsFullSequence`, `IsPadded`, `IsPublic`, `KeyCode`, `NumberOfLinkedLanguage`, `PressMinimumRepeats`, `Rating`, `RelatedProtocols`, `SendingType`, `Status`.

| type | fields | what it is |
|---|---|---|
| `CodeSegment` | `Atoms`, `Header`, `Payload`, `TotalLength`, `Trailer` | a segment stated as a code: a header, a payload and a trailer |
| `IRSegment` | `Header`, `Payload`, `TotalLength`, `Trailer` | a segment stated as timings, with the same three parts |
| `Payload` | `EncodingType`, `Encodings`, `NumberOfBits`, `ToggleBit` | the bits themselves, their encoding, how many, and a toggle bit |
| `IREncoding` | `Atoms`, `BitType` | how one digit value is spelled as durations |
| `Atom` | `MaxValue`, `MinValue`, `Type`, `Value` | one duration, with a nominal value and a tolerance band |
| `ParsedKeyCode` | `Finish`, `Repeat`, `Start` | which segments make the start, the repeat and the finish |
| `KeyCodeElement` | `SegmentName`, `SegmentType` | a reference to one segment by name and kind |

**The catalogue states its protocol definitions in this shape**, 684 of them[^s227]; the service
itself does not hand one out, below.

### Four things it agrees with, from configurations

Each of these was derived from configurations without this schema, and they agree.

**A code states its frames in two slots.** There are two collections, `CodeSegments` and `IRSegments`,
and the enumeration that says which one a reference points at has exactly two values, `IRSegment` and
`CodeSegment`[^t-model]. Reading one slot refuses some families and sends half a command on the ones that
fill both[^s159].

**A record has three block pointers: once, held and tail.** `ParsedKeyCode` has exactly three fields, and
they are `Finish`, `Repeat`, `Start`: the same three, in the vendor's words[^t-model],
[infrared records](../../config-format/infrared-records.md).

**A family's base comes from `EncodingType` and never from its name.** The enumeration is
`BitEncoding`, `BiphasicEncoding`, `QuadEncoding`, `HexEncoding`, `ByteEncoding`, which is base two, base
four, base sixteen and base two hundred and fifty six, plus biphase, and a definition's cell count says the
same thing[^t-model]. The word `Quad` in a family's name is not its base: `Quad 5 Bit` states two symbols and
five bits[^s231].

**A duration is a mark or a space.** `AtomType` is `Space`, `Pulse` and nothing else, and an atom carries
a tolerance band around its nominal value, which is what makes a stated rhythm matchable against a
captured one[^t-model].

### And three things it says that have not been measured

* **`Atom` has a `MinValue` and a `MaxValue`.** Every duration a configuration holds is a single number.
  Whether the tolerance is stored per code or applied by the compiler is not known[^unchecked].
* **`FlagType` is `HighBitRate`, `NoCarrier`, `HighFrequency`, `BitToggle`.** `NoCarrier` is a code sent
  with no carrier at all, which no configuration has been shown to hold, and `BitToggle` pairs with
  `Payload.ToggleBit`[^t-model].
* **`RelationType` is `VerySimilarTo`, `ModeratelySimilarTo`, `PromotedInFavorOf`, `MadeObsoleteFor`, `IsPrototypeOf`, `HasPrototype`, `Overlapping`.**
  So the catalogue records that two protocols are near neighbours, which is the judgement a Sharp code
  named `Makita 10 Bit` by Logitech's analyser needed[^t-model][^s162].

The catalogue's commands as the service serves them carry a protocol name and a frame value rather than
these structures, [the service](../service.md#the-device-catalogue-is-its-own-call)[^s132].

## The vocabularies

Enumerations are the part that transfers most directly into an interface, because they are the product's
own words for a closed set of choices. **All nine that the core reaches are here**[^t-model].

* **`DeviceCategory`**, 6: `Any`, `AudioVideoReceiver`, `SetTopBox`, `Television`, `BluRayDvdPlayer`, `CompansionBox`
* **`ActivityType`**, 17: `NotSpecified`, `WatchTV`, `WatchDvd`, `PlayGame`, `ListenToMusic`, `Custom`, `SurfWeb`, `WatchNetflix`, `MakeVideoCall`, `WatchAppleTV`, `WatchRoku`, `PCTV`, `SmartTV`, `WatchFireTV`, `ListenToSonos`, `WatchApp`, `ListenToSpeaker`
* **`ActivityState`**, 2: `Setup`, `NonSetup`
* **`ActivityGroup`**, 5: `VirtualGeneric`, `VirtualTelevisionN`, `VirtualDvd`, `VirtualCdMulti`, `VirtualGameConsole`
* **`KeyboardLayoutType`**, 4: `Undefined`, `QWERTY`, `QWERTZ`, `AZERTY`
* **`Region`**, 5: `Unknown`, `Amr`, `Emea`, `Global`, `Apac`

Three are too long to quote whole and are listed in full in [`entities.md`](entities.md):

* **`DeviceCapabilityType`**, 81 values, what a device declares it can do. It is the list the activity
  roles above partly correspond to, and it reaches well beyond this era of remote: `ZigBee`, `ZWave`,
  `Thermostat` and `AlexaSupported` sit in it alongside `Volume` and `ChangingChannel`[^t-model].
* **`DeviceType`**, 61 values, and **`Icon`**, 63. **These are one list, not two.** Every `DeviceType`
  value is also an `Icon` value, in the same order, and
  `Icon` adds exactly two that `DeviceType` lacks: `Revue` and `PCTV`. So the picture a device shows and the kind of thing it is are one vocabulary, which
  is worth knowing before anyone builds two pickers[^t-model]. The categories of the era that drew none are
  [the device catalogue](../device-catalogue.md#categories-and-the-era-that-had-no-pictures).
* **`CountryType`**, 242 values, the ISO country codes plus `XX` and `Unknown`. `Country` pairs one with a
  name and a `Region`, which is the five way split the product ships against[^t-model].

**A product declares its features from a fourth list, `SupportedCapability`**, 123 values. Among them are
`FavoriteChannels`, `ModeMap`, `FunctionMapping`, `DeviceDelay`, `SupportActivitySequence`,
`ButtonSequences`, `LongPressAction` and `ActivityStartUpChannel`, at positions 1, 2, 6, 14, 21, 22, 29
and 63[^t-model]. What the service states for each model is [the remotes index](../../remotes/README.md).

## The typed identifier family

25 of the types the core reaches are identifiers, and a reader who opens the data sees them as empty.
They are not: each extends `AbstractId`, which carries `IsPersisted` and `Value`. So an `AccountId` is a
value plus a flag saying whether it has been written down yet, and the only reason there are 25 rather
than one is that the type stops an account identifier being passed where a remote identifier
belongs[^t-model].

**Three add a field of their own**: `CompilationId` carries a `CompileQueueKey`, `GlobalDeviceVersionId`
carries `IsDefault` and `VersionId`, and `GlobalLanguageVersionId` carries `VersionId`. The first is the
handle a compile is queued under[^t-model].

`AbstractAliasId`, `AbstractDeviceId`, `AccountId`, `ActivityId`, `ActivityInputStateId`, `ActivityRoleId`, `AggregatedDeviceId`, `BrandId`, `ButtonImageId`, `ButtonMapId`, `CommandId`, `CompilationId`, `DeviceFeatureId`, `FeatureId`, `FunctionId`, `GlobalDeviceVersionId`, `GlobalLanguageVersionId`, `HouseholdId`, `PairingId`, `PictureId`, `ProductId`, `ProtocolId`, `RemoteId`, `RoomId`, `SurfaceId`.

`AbstractAliasId`, `AbstractDeviceId` and `GlobalDeviceId` sit in the middle of that tree, adding nothing
themselves, which is why the count of leaves is larger than the useful vocabulary.

## The classes the core reaches, in full

Seven types are reached from the core and are neither an identifier, a vocabulary nor an abstract
base[^t-model].

| type | fields | what it is |
|---|---|---|
| `ActivityInputState` | `ChannelNumber`, `Id`, `Name` | the input an activity switches a device to, with an optional channel |
| `AutoDetectedDevice` | `Class`, `Id`, `Manufacturer`, `Model`, `Name`, `USN` | what network discovery found, before a user confirms it is theirs |
| `ChannelTuningFeature` | `DeviceId`, `FixedDigits`, `Id` | how many digits a device wants when a channel is entered |
| `Country` | `Code`, `Name`, `Region` | a country code, its name and the region it belongs to |
| `GlobalDeviceGlobalLanguage` | `GlobalLanguage`, `IsDefault` | a language a catalogue device is available in, and whether it is the default |
| `GlobalLanguages` | `Id`, `Name` | a language version, by identifier and name |
| `PrioritizedDeviceCapability` | `DeviceCapability`, `Priority` | one capability a device declares, with a priority against the others |

And four abstract bases carry fields that their subclasses rely on[^t-model]:

| base | extended by | fields |
|---|---|---|
| `AbstractDevice` | 2 | `DecodedEdid`, `DefaultInterDeviceDelay`, `DefaultInterKeyDelay`, `DefaultPressMinRepeats`, `DeviceOrder`, `DeviceType`, `EncodedEdid`, `HoldInterDeviceDelay`, `HoldInterKeyDelay`, `HoldMinRepeats`, `InterDeviceDelay`, `InterKeyDelay`, `Manufacturer`, `Model`, `Name`, `PictureId`, `PressMinRepeats` |
| `AbstractActivityRole` | 22 | `DeviceId`, `Id`, `NextDevicePowerOnDelay`, `PowerOffOrder`, `PowerOnOrder`, `SelectedInput` |
| `AbstractActivityAction` | 3 | `ActionOrder`, `Id` |
| `AbstractId` | 25 | `IsPersisted`, `Value` |

**`Device` inherits 17 of its fields from `AbstractDevice`**, `Name`, `Model` and `Manufacturer` among
them, so a device's fields are its own and its base's, as the `Device` table above lists them[^t-model].

**Nine of those inherited fields are a device's timing**: `DefaultInterKeyDelay`, `InterKeyDelay`,
`HoldInterKeyDelay`, `DefaultInterDeviceDelay`, `InterDeviceDelay`, `HoldInterDeviceDelay`,
`DefaultPressMinRepeats`, `PressMinRepeats` and `HoldMinRepeats`. The platform distinguishes a default
from a current value and a press from a hold, and `IsInterKeyDelayOptimized` on `Device` says the delay is
something it tunes rather than a constant[^t-model]. How many times a press sends a code is
[sending](../../infrared/sending.md).

**A few more fields that line up with a configuration**: `GlobalRemoteSkinId` sits beside `SkinId` on a
remote, two fields rather than one; and an activity carries `DefaultChannel`, `DefaultStation` and
`DefaultStationName`, beside the favourite channels a configuration holds[^t-model].

## Completeness

**What "complete" means here, and what it does not.** The platform declares 470 service contracts. Strip
the enumerations and the identifier wrappers, and 362 carry substance. Those are not one graph: they fall
into three sizeable islands and a long tail of request and response types that reference
nothing[^s218].

| cluster | types | described |
|---|---|---|
| the account: what a household holds | 121 | the twelve the core diagram draws, plus the activity's roles and actions |
| the device catalogue | 75 | the half that describes a code; the search criteria are listed, not described |
| button and function maps | 31 | all of it |

150 types are reachable from the roots those clusters start at, following both fields and inheritance.
Every one of them is listed with all of its fields in [`entities.md`](entities.md), and a test fails if
that stops being true[^t-model].

**Three limits.** The walk starts from named roots, so a fourth subsystem connected to none of them sits
outside it, exactly as the button maps did until a root was added for them. The tail of request and
response types is listed and not described, because a class whose whole content is one identifier and a
flag says nothing a reader needs. And **listed is not explained**: every field of every contract is
stated, while the prose covers the three clusters and not the tail[^s218].

## What can be asked of it

The entity half above says what the platform **holds**. This says what it can be **asked**, the part an
importer needs. [`operations.json`](operations.json) is the data.

The proxy declares each operation twice, once as the request carrying the wire action and its typed
parameters and once as the reply, and joining the two gives 298 operations over 19 service interfaces
with a reply type resolved for every one of them[^t-model].

| service interface | operations |
|---|---|
| `UserAccountDirector.IUserAccountDirector` | 63 |
| `UserButtonMappingManager.IUserButtonMappingManager` | 36 |
| `DeviceManager.IDeviceManager` | 33 |
| `AccountManager.IAccountManager` | 32 |
| `SecurityDirector.ISecurity` | 21 |
| `ActivityManager.IActivityManager` | 20 |
| `RemoteManager.IRemoteManager` | 18 |
| `AmazonS3ImageManager.AmazonS3` | 16 |
| `ProductManager.IProductManager` | 10 |
| `SecurityDirector.ILinkSecurity` | 9 |
| `CompileManager.ICompileManager` | 8 |
| `UserFeatureManager.IUserFeatureManager` | 8 |
| `DiscoveryService.IDiscovery` | 5 |
| `GlobalDeviceManager.IGlobalDeviceManager` | 5 |
| `Authentication.AuthenticationService` | 4 |
| `DeletionManager.IDeletionManager` | 4 |
| `InfraredAnalysisManager.IInfraredAnalysisManager` | 3 |
| `RomDataService.IRomDataLibrary` | 2 |
| `HelpContent.IHelpContentService` | 1 |

**Three clients and one service, and the three do not agree**, which is the reason to keep them apart
rather than quote one number. Harmony Desktop's web application declares 78 operations over 14
services; this proxy declares 298 over 19; and the live service's own Discovery listing advertises 308
over 50[^t-host-client][^t-model][^t-ops].

Eleven services appear in both this proxy and the Discovery listing. The proxy names operations the
listing does not on **all eleven**, the listing returns the favour on **seven**, and on those seven each
source is missing something the other has. So neither is a superset of the other, the platform is larger
than any single count of it, and the four remaining services are the only ones where one source covers
the other. The largest disagreement is `UserAccountDirector`, 49 advertised against 63 declared with 26
in common[^t-ops].

Seven services the proxy declares are absent from the Discovery listing altogether, and they are the ones
a client reaches at a fixed address rather than by discovery: `Discovery` itself, both security
interfaces, products, help content, the ROM data library, the Amazon image service and ASP.NET's own
authentication service[^t-ops].

### Which operation can hand back which entity

Computed through inheritance, because a reply typed as a base class reaches everything below it. Reading
the reply type literally is wrong in exactly the case that matters: it says nothing returns an
`IrProtocol`, when `GetProtocolList` returns a list of that type's base class. 233 of the model's types
are reachable that way[^t-model].

| entity | operations that can return one |
|---|---|
| Activity | 16 |
| Account | 9 |
| Device | 7 |
| Remote | 7 |
| `IrProtocol` | **1** |

**That one operation cannot be reached on the live service**, by any name or verb tried. The proxy names
it `UserAccountDirector/GetProtocolList`, and at that name the service answers with an error page and a
gateway error[^s258]. The Discovery listing advertises an account scoped `ProtocolList` instead, on two
services[^t-ops]. On `UserAccountDirector/ProtocolList` a `POST` answers 405 and a `GET` a bare gateway
error page, reproducibly and on two accounts[^s219]; the `GET` answers 502 on an account holding devices
and 200 with an empty body on an empty one[^s132]. An earlier probe recorded a `POST` to `ProtocolList`
answering 404 on both services the listing names, without saying which[^s159], where the later one had
`UserAccountDirector` answer 405[^s219]. **The request is right and the endpoint is what fails**: on the same address form
`ActivityList` and `FunctionList` answer normally, while `DeviceList` and `CapabilityList` fail exactly as
`ProtocolList` does[^s219]. So the catalogue's protocol definitions are stated in this shape and the
service hands out none of them.

## What a device's commands are called

A configuration addresses infrared codes **by number**, and nothing in it says which code is volume up.
The platform holds that layer separately, as a **function map**: one per device and one per activity,
each a set of named groups of functions, where a function carries a command name, a label for a person
to read, and an identifier[^s220]. It is read with the account scoped `FunctionList`[^s220].

Both kinds of map are the same shape in the schema, `DeviceFunctionMap` and `ActivityFunctionMap`
extending one `AbstractFunctionMap` that holds the groups[^t-model]. A device map names the default mode,
an activity map names its own activity[^s220].

### A named group against the catch all beside it

**A function in a named group states no transport; a function in `Miscellaneous` states infrared.** No exceptions in the two captures of 30 August 2026, 1191 functions[^t-function-maps]. So the named groups
are the platform's button vocabulary, held independently of how a command reaches the device, and
`Miscellaneous` is where a device's own commands live, which exist only as a concrete infrared code.
`TransportType` has nine values including HDMI, three flavours of Bluetooth and two of network, so the
transport independence is real and not an artefact of an era that only had infrared[^t-model].

| group | command names |
|---|---|
| `Channel` | `ChannelDown`, `ChannelPrev`, `ChannelUp`, `Prev`, `Previous` |
| `ColoredButtons` | `Blue`, `Green`, `Red`, `Yellow` |
| `DisplayMode` | `Aspect`, `Display` |
| `GameType2` | `Circle`, `Cross`, `Square`, `Triangle` |
| `GameType3` | `Enter`, `Home`, `OK`, `Ok`, `Select` |
| `GoogleTVNavigation` | `Netflix`, `Settings` |
| `MediaCenter` | `MyMusic`, `MyPictures`, `MyTv`, `MyVideos` |
| `NavigationBasic` | `DirectionDown`, `DirectionLeft`, `DirectionRight`, `DirectionUp`, `Enter`, `OK`, `Ok`, `Select` |
| `NavigationDSTB` | `Favorite`, `List`, `Live`, `RecordedTV`, `Search` |
| `NavigationDVD` | `Angle`, `Audio`, `Back`, `Menu`, `PopUpMenu`, `Return`, `Subtitle`, `TopMenu` |
| `NavigationExtended` | `Cancel`, `Clear`, `Exit`, `Guide`, `Info`, `Options`, `PS`, `PageDown`, `PageUp`, `StepBack`, `StepForward`, `TopMenu` |
| `NumericBasic` | `#`, `*`, `-`, `.`, `0`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `Clear`, `Enter` |
| `NumericExtended` | `+10` |
| `PictureAdjustment` | `PictureMode` |
| `PictureInPicture` | `PIP` |
| `Power` | `PowerOff`, `PowerOn`, `PowerToggle` |
| `RadioTuner` | `PresetNext`, `PresetPrev`, `TuneDown`, `TuneUp` |
| `Setup` | `Setup`, `Sleep` |
| `SoundModes` | `Effect`, `SoundMode` |
| `Teletext` | `Teletext` |
| `TransportBasic` | `Eject`, `FastForward`, `Pause`, `Play`, `QuickStop`, `Rewind`, `Stop`, `iPodFastForward`, `iPodPause`, `iPodPlay`, `iPodRewind`, `iPodStop` |
| `TransportExtended` | `Next`, `NextTrack`, `Prev`, `PreviousTrack`, `SkipBack`, `SkipBackward`, `SkipForward` |
| `TransportRecording` | `Record` |
| `Volume` | `Mute`, `VolumeDown`, `VolumeUp` |

**This table is a sample and it is a floor, not the platform's vocabulary.** It is the union of what the
devices on two accounts happened to use on 30 August 2026, so a group the platform has and those devices
did not use is absent from it, and every count below is a count of that capture[^t-function-maps].

**It is also not an enumeration and must not be treated as one.** It carries `OK` beside `Ok`, `Prev`
beside `Previous`, `SkipBack` beside `SkipBackward`, and a set of `iPod` prefixed transport commands, so
it is the union of what manufacturers' own command sets are called, bucketed into groups, rather than a
closed list somebody curated. Ten command names sit in more than one group, so a group is not a function
of a name either[^t-function-maps].

Those two captures give 105 command names in named groups and 301 device specific ones[^t-function-maps].
The device specific names are Logitech's catalogue content for particular devices and are not reproduced
here; the groups and the names above are vocabulary.

**The two sets overlap**, on `+10`, `Home`, `Options`, `PS`, `PresetNext`, `PresetPrev`, `Select` and
`Stop`. So the platform files the same command name in a named group for one device and in the catch
all for another, and being device specific is a property of a device's entry rather than of a name[^t-function-maps].

## Not checked

* Whether a device's declared capabilities decide which activity roles it may take[^unchecked].
* Whether an atom's tolerance band is stored per code or applied by the compiler[^unchecked].
* The values of `EventType`, which the schema does not list[^unchecked].

[^d14]: Chosen by this project. [Decision 14](../../../docs/decisions.md#d14)
[^s218]: Stated by Logitech, by their service. [Section 218](../../../docs/findings.md#s218)
[^t-model]: Stated by Logitech, in their client. [The test](../../../tests/test_myharmony_model.py)
[^t-households]: Stated by Logitech, by their service. [The test](../../../tests/test_myharmony_model.py)
[^s227]: Stated by Logitech, in their catalogue. [Section 227](../../../docs/findings.md#s227)
[^unchecked]: Not checked.
[^s145]: Stated by Logitech, by their service. [Section 145](../../../docs/findings.md#s145)
[^s220]: Stated by Logitech, by their service. [Section 220](../../../docs/findings.md#s220)
[^s235]: Stated by Logitech, by their service. [Section 235](../../../docs/findings.md#s235)
[^s271]: Measured in configurations. [Section 271](../../../docs/findings.md#s271)
[^t-host-client-service]: Stated by Logitech, by their service. [The test](../../../tests/test_host_client.py)
[^s159]: Stated by Logitech, in their catalogue. [Section 159](../../../docs/findings.md#s159)
[^s231]: Stated by Logitech, in their catalogue. [Section 231](../../../docs/findings.md#s231)
[^s162]: Stated by Logitech, by their service. [Section 162](../../../docs/findings.md#s162)
[^s132]: Stated by Logitech, by their service. [Section 132](../../../docs/findings.md#s132)
[^t-host-client]: Stated by Logitech, in their client. [The test](../../../tests/test_host_client.py)
[^t-ops]: Stated by Logitech, by their service. [The test](../../../tests/test_myharmony_model.py)
[^s258]: Stated by Logitech, by their service. [Section 258](../../../docs/findings.md#s258)
[^s219]: Stated by Logitech, by their service. [Section 219](../../../docs/findings.md#s219)
[^t-function-maps]: Stated by Logitech, by their service. [The test](../../../tests/test_function_maps.py)
