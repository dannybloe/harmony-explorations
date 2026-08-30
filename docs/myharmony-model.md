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
