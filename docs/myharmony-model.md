# MyHarmony's data model

**What the platform behind a Harmony remote actually stores**: its entities, their fields, and how they
refer to each other. Recovered on 30 August 2026 and checked against replies the service itself
returned. `reference/myharmony-model.json` is the data, this is the reading, and section 218 is the
argument.

**Consult this before designing anything about devices, activities or remotes, and before naming a
field.** It is a labelled view of bytes this project already reads: where `docs/config-format.md` says
what a byte is, this says what the vendor **called** it and what else travelled beside it. Sections 159
to 171 derived an infrared rhythm table the hard way, and the vocabulary for the same thing is in here.

## Why it can be trusted, and where it stops

**The service is alive.** `svcs.myharmony.com` answers, section 56. What is discontinued is the classic
generation's service, so `SERVER-DEPENDENCY.md`'s "the domain model existed on the server only" is
about a different, older client.

Three independent sources, which is what makes this a measurement rather than a reading:

* the **schema**, from the client's generated service proxy. A data contract is not the client's own
  design: it is the wire schema the **server** declared, which is why every type states the server side
  namespace it came from;
* **instances**, in the replies this project has captured from five accounts;
* and **the live service**, which can be asked about anything the other two do not exercise.

Against the captures, **nothing in the schema is missing from live data**:

| entity | fields in the schema | present in a live reply | extra fields the reply carried |
|---|---|---|---|
| Account | 21 | 21 | none |
| Activity | 25 | 25 | 1 |
| Device | 32 | 32 | 10 |
| Remote | 32 | 32 | 3 |
| Product | 26 | 25 | 1 |

**The service is ahead of this client build**, which is the finding in the other direction: it returns
fields the compiled proxy has never heard of. So a field absent here is not a field the platform lacks,
and this model is a floor rather than a ceiling. The live extras are named in section 218.

**What it is not.** It is not the configuration compiler and does not become one. It says what the
platform holds, not how a configuration is built from it.

## The shape

1352 types, of which **470 are service contracts**, with **366 references between them** over 28 areas,
and **1291 enum values**. The most connected types are identifier wrappers carrying no fields at all,
so the useful shape is the one below.

**Account is the root.** It holds Devices, Activities, Remotes and Surfaces directly. A **Remote** is a
physical unit. A **Device** is an appliance on the account, pointing at a catalogue entry. An
**Activity** is what the product calls an activity, with enter actions, leave actions and roles.

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

The vendor's own description of an infrared protocol, and **no capture exercises it**, so this is
schema without instances. The service is alive and can be asked, which is the cheapest open lead here.

| field | type |
|---|---|
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

## The vocabularies

Enumerations are the part that transfers most directly into an interface, because they are the
product's own words for a closed set of choices.

* **`DeviceCategory`**: `Any`, `AudioVideoReceiver`, `SetTopBox`, `Television`, `BluRayDvdPlayer`, `CompansionBox`
* **`ActivityType`**: `NotSpecified`, `WatchTV`, `WatchDvd`, `PlayGame`, `ListenToMusic`, `Custom`, `SurfWeb`, `WatchNetflix`, `MakeVideoCall`, `WatchAppleTV`, `WatchRoku`, `PCTV`, `SmartTV`, `WatchFireTV`, `ListenToSonos`, `WatchApp`, `ListenToSpeaker`
* **`ActivityState`**: `Setup`, `NonSetup`
* **`ActivityGroup`**: `VirtualGeneric`, `VirtualTelevisionN`, `VirtualDvd`, `VirtualCdMulti`, `VirtualGameConsole`

## Every area, by how many contracts it holds

The area is the last part of the server side namespace each contract declares, so these are the
service's own divisions rather than ours. `Data` is the shared bucket, `Logitech.Harmony.Services.Common.Contracts.Data`.

The column sums to 426 rather than to 470, because 44 service contracts declare no namespace at all and
so belong to no area. They are counted in the 470 and appear in no row below.

| area | contracts |
|---|---|
| `Data` | 163 |
| `Activity` | 38 |
| `Search` | 37 |
| `UserButtonMapping` | 29 |
| `Account` | 26 |
| `Infrared` | 18 |
| `Operation` | 17 |
| `UserFeature` | 16 |
| `DataContract` | 16 |
| `GlobalLanguage` | 10 |
| `ButtonMapping` | 9 |
| `FunctionMapping` | 6 |
| `Protocol` | 5 |
| `Logging` | 5 |
| `Release321` | 5 |
| `SearchMatch` | 4 |
| `Brand` | 4 |
| `RemoteInventory` | 3 |
| `com/harmony/services/romdata` | 3 |
| `Security` | 2 |
| `Error` | 2 |
| `Discovery` | 2 |
| `Service` | 1 |
| `Compile` | 1 |
| `Services` | 1 |
| `Device` | 1 |
| `AmazonS3` | 1 |
| `RF` | 1 |

## What can be asked of it

The entity half above says what the platform **holds**. This says what it can be **asked**, which is
the other thing a schema is good for and the part an importer needs. `reference/myharmony-operations.json`
is the data.

The proxy declares each operation twice, once as the request carrying the wire action and its typed
parameters and once as the reply, and joining the two gives 298 operations over 19 service interfaces
with a reply type resolved for every one of them.

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
over 50.

Eleven services appear in both this proxy and the Discovery listing. The proxy names operations the
listing does not on **all eleven**, the listing returns the favour on **seven**, and on those seven
each source is missing something the other has. So neither is a superset of the other, the platform is
larger than any single count of it, and the four remaining services are the only ones where one source
covers the other. The largest disagreement is `UserAccountDirector`, 49 advertised against 63 declared
with 26 in common.

**That paragraph first said "on every one of those eleven"**, generalised from a sample of three
services, and the test written for it refuted it within a minute on four.

Seven services the proxy declares are absent from the Discovery listing altogether, and they are the
ones a client reaches at a fixed address rather than by discovery: `Discovery` itself, both security
interfaces, products, help content, the ROM data library, the Amazon image service and ASP.NET's own
authentication service.

### Which operation can hand back which entity

Computed through inheritance, because a reply typed as a base class reaches everything below it.
Reading the reply type literally is wrong in exactly the case that matters: it says nothing returns an
`IrProtocol`, when `GetProtocolList` returns a list of that type's base class. 233 of the model's types
are reachable that way.

| entity | operations that can return one |
|---|---|
| Activity | 16 |
| Account | 9 |
| Device | 7 |
| Remote | 7 |
| `IrProtocol` | **1** |

**That one operation is broken on the live service.** `UserAccountDirector/ProtocolList` is advertised,
answers a POST with 405 and a GET with a bare gateway error, reproducibly, on two accounts. Two
neighbours on the same account scoped address answer normally, `ActivityList` and `FunctionList`, so
the address form and the verb are right and the failure belongs to those endpoints: `DeviceList` and
`CapabilityList` fail the same way. So `IrProtocol` stays schema without instances, and the reason is
now measured rather than unknown.

**The verb is worth writing down**, because it is not the one everything else here uses: the account
scoped addresses are `.../json/Account/<account>/<Name>` and they want a **GET**. Every other call on
this platform is a POST of a JSON body, and a POST to these answers 405.

## What a device's commands are called

A configuration addresses infrared codes **by number**. Nothing in it says which code is volume up.
The platform holds that layer separately, as a **function map**: one per appliance and one per
activity, each a set of named groups of functions, where a function carries a command name, a label
for a person to read, and an identifier.

Both kinds of map are the same shape in the schema, `DeviceFunctionMap` and `ActivityFunctionMap`
extending one `AbstractFunctionMap` that holds the groups. That is the operating concept in
`docs/how-a-harmony-works.md` stated by the vendor: a device's map and an activity's map are two maps
of the same keypad. A device map names the default mode, an activity map names its own activity.

### The canonical groups, and the catch all beside them

**A function in a named group states no transport; a function in `Miscellaneous` states infrared.**
That split has no exceptions over 1191 functions on two accounts. So the named groups are the
platform's canonical button vocabulary, independent of how a command reaches the appliance, and
`Miscellaneous` is where an appliance's own commands live, which exist only as a concrete infrared
code. `TransportType` has nine values including HDMI, three flavours of Bluetooth and two of network,
so the transport independence is real and not an artefact of an era that only had infrared.

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

**This vocabulary is not an enumeration and must not be treated as one.** It carries `OK` beside
`Ok`, `Prev` beside `Previous`, `SkipBack` beside `SkipBackward`, and a set of `iPod` prefixed
transport commands, so it is the union of what manufacturers' own command sets are called, bucketed
into groups, rather than a closed list somebody curated. Ten command names sit in more than one
group, so a group is not a function of a name either.

Two accounts and 14 appliances give 105 canonical command names and 301 device specific ones. The
device specific names are Logitech's own database content for particular appliances and stay in the
lab; the groups and the canonical names above are vocabulary.

**The two sets overlap on eight names**, `+10`, `Home`, `Options`, `PS`, `PresetNext`, `PresetPrev`,
`Select` and `Stop`. So the platform files the same command name in a named group for one appliance
and in the catch all for another, and being device specific is a property of an appliance's entry
rather than of a name.

## What bears on work already in flight

* **`DefaultInterKeyDelay`, `DefaultInterDeviceDelay` and `DefaultPressMinRepeats`** appear on a device
  in live replies and **not** in the schema. `docs/predictions-sequence-delay.md` is about exactly
  these quantities, scored against a config; here the platform names them.
* **`IsInterKeyDelayOptimized`** is in the schema, so the delay is something the platform tunes rather
  than a constant.
* **`IrProtocol` carries two segment collections**, `CodeSegments` and `IRSegments`, which is section
  159's finding that a code states its frames in two slots, in the vendor's own vocabulary.
* **`GlobalRemoteSkinId` sits beside `SkinId`** on a remote, so the trap the `myharmony-service` skill
  documents is two genuine fields rather than one misread.
* **`DefaultChannel`, `DefaultStation` and `DefaultStationName`** sit on an activity, next to the
  favourite channel work of sections 154 and 156.
* **`DeviceCategory` has six values** where the hub generation's icon set had 95 names,
  `reference/device-categories.md`. The categories a Harmony One era account can hold are the six.
