# MyHarmony: every service contract, by area

**Generated** by `tools/myharmony_model.py` from `docs/myharmony/model.json`, so it
is never edited by hand. `docs/myharmony/model.md` is the reading; this is the
reference, and it is complete: 470 contracts, 1364 fields and 1084 enum values, every one
of them listed.

A contract's area is the last part of the server side namespace it declares. The 44
contracts that declare none are listed at the end.

## `Data`, 163 contracts

### `AbstractAliasId`

Extends `AbstractId`. Extended by 2: `BrandAliasId`, `DeviceModelAliasId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `AbstractDevice`

Extended by 2: `Device`, `GlobalDevice`.

| field | type | from |
|---|---|---|
| `DecodedEdid` | `string` | itself |
| `DefaultInterDeviceDelay` | `int` | itself |
| `DefaultInterKeyDelay` | `int` | itself |
| `DefaultPressMinRepeats` | `int` | itself |
| `DeviceOrder` | `int` | itself |
| `DeviceType` | `DeviceType` | itself |
| `EncodedEdid` | `byte[]` | itself |
| `HoldInterDeviceDelay` | `int` | itself |
| `HoldInterKeyDelay` | `int` | itself |
| `HoldMinRepeats` | `int` | itself |
| `InterDeviceDelay` | `int` | itself |
| `InterKeyDelay` | `int` | itself |
| `Manufacturer` | `string` | itself |
| `Model` | `string` | itself |
| `Name` | `string` | itself |
| `PictureId` | `PictureId` | itself |
| `PressMinRepeats` | `int` | itself |

### `AbstractDeviceId`

Extends `AbstractId`. Extended by 2: `DeviceId`, `GlobalDeviceId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `AbstractGlobalData`

Extended by 3: `AbstractProtocol`, `BrandAliases`, `Brands`. No fields of its own.

### `AbstractId`

Extended by 25: `AbstractAliasId`, `AbstractDeviceId`, `AccountId`, `ActivityId`, `ActivityInputStateId`, `ActivityRoleId`, `AggregatedDeviceId`, `BrandId`, `ButtonImageId`, `ButtonMapId`, `CommandId`, `CompilationId`, `DeviceFeatureId`, `FeatureId`, `FunctionId`, `GlobalDeviceVersionId`, `GlobalLanguageVersionId`, `HouseholdId`, `PairingId`, `PictureId`, `ProductId`, `ProtocolId`, `RemoteId`, `RoomId`, `SurfaceId`.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | itself |
| `Value` | `object` | itself |

### `AbstractProperty`

Extended by 1: `EnumProperty`.

| field | type | from |
|---|---|---|
| `Name` | `string` | itself |

### `AbstractPropertyValue`

Extended by 1: `EnumPropertyValue`.

| field | type | from |
|---|---|---|
| `Id` | `long` | itself |

### `AccountCapability`

| field | type | from |
|---|---|---|
| `AccountId` | `long` | itself |
| `UserHubCapabilities` | `UserHubCapability[]` | itself |

### `AccountHouseholdRequest`

| field | type | from |
|---|---|---|
| `accountId` | `long` | itself |

### `AccountId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `AccountMigrationStatus`

An enumeration of 4 values.

Values: `Successful`, `SourceAccountNotFound`, `NoRemoteInTargetAccount`, `PartialSuccess`.

### `ActivityDescription`

| field | type | from |
|---|---|---|
| `DiscardedSequences` | `string[]` | itself |
| `LeaveActionsDiscarded` | `bool` | itself |
| `MovedToNonSetup` | `bool` | itself |
| `Name` | `string` | itself |
| `StartActionsDiscarded` | `bool` | itself |

### `ActivityId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `AdminConfig`

| field | type | from |
|---|---|---|
| `EmailCampaignConfig` | `int` | itself |
| `IntermittentServiceDownMessage` | `string` | itself |
| `IntermittentServiceDownRequired` | `bool` | itself |
| `MaintainencePageRequired` | `bool` | itself |
| `ThresholdMaintainceRequired` | `bool` | itself |

### `AggregatedDeviceId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `AnalyzeInfraredResult`

Extended by 2: `FailedAnalyzeInfraredResult`, `SuccessAnalyzeInfraredResult`. No fields of its own.

### `Answer`

| field | type | from |
|---|---|---|
| `ChosenAnswer` | `PublicGlobalDeviceId` | itself |
| `QuestionType` | `QuestionType` | itself |

### `AutoDetectedDevice`

| field | type | from |
|---|---|---|
| `Class` | `string` | itself |
| `Id` | `string` | itself |
| `Manufacturer` | `string` | itself |
| `Model` | `string` | itself |
| `Name` | `string` | itself |
| `USN` | `string` | itself |

### `BrandAliasId`

Extends `AbstractAliasId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `BrandId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `BuildInfo`

| field | type | from |
|---|---|---|
| `BuildDate` | `string` | itself |
| `BuildVersionNumber` | `string` | itself |

### `ButtonImageId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `ButtonMapId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `ButtonMapType`

An enumeration of 6 values.

Values: `NoSetting`, `ModeTV`, `ModeCable`, `ModeDVD`, `ModeAux`, `Root`.

### `ChannelTuningFeature`

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | itself |
| `FixedDigits` | `int` | itself |
| `Id` | `long` | itself |

### `CloneAccountDTO`

| field | type | from |
|---|---|---|
| `sourceAccountIdDDeviceIdsCollection` | `Dictionary<AccountId, ObservableCollection<DeviceId>>` | itself |
| `sourceAccountIds` | `AccountId[]` | itself |
| `targetHouseholdId` | `HouseholdId` | itself |

### `CloneAccountResponse`

| field | type | from |
|---|---|---|
| `ClonedActivity` | `Activity[]` | itself |
| `Household` | `HouseholdId` | itself |
| `LogCloneStatus` | `Dictionary<string, string>` | itself |
| `NewAccounts` | `Account[]` | itself |
| `NewEmail` | `string` | itself |
| `NewPassWord` | `string` | itself |
| `NoOfGatewaysAdded` | `int` | itself |
| `SourceAccountIds` | `AccountId[]` | itself |
| `Status` | `Status` | itself |

### `Command`

Extended by 1: `RuntimeCommand`.

| field | type | from |
|---|---|---|
| `CommandTypeId` | `string` | itself |
| `DateTaught` | `DateTime` | itself |
| `FunctionGroupId` | `long` | itself |
| `FunctionId` | `FunctionId` | itself |
| `Id` | `CommandId` | itself |
| `IsLearned` | `bool` | itself |
| `KeyCode` | `string` | itself |
| `Name` | `string` | itself |
| `ProtocolId` | `long` | itself |
| `Raw` | `string` | itself |
| `TransportType` | `TransportType` | itself |

### `CommandId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `CommandToLearn`

| field | type | from |
|---|---|---|
| `Name` | `string` | itself |

### `CompilationId`

Extends `AbstractId`.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |
| `CompileQueueKey` | `string` | itself |

### `CompilerArchitectureType`

An enumeration of 4 values.

Values: `Unknown`, `ActivityCompiledController`, `CompiledController`, `SmartController`.

### `ControlPort`

An enumeration of 4 values.

Values: `Remote`, `HubInternal`, `HubBlaster1`, `HubBlaster2`.

### `ControlType`

An enumeration of 4 values.

Values: `IR`, `HID`, `CEC`, `TCP`.

### `Country`

| field | type | from |
|---|---|---|
| `Code` | `CountryType` | itself |
| `Name` | `string` | itself |
| `Region` | `Region` | itself |

### `CountryType`

An enumeration of 242 values.

Values: `XX`, `Unknown`, `AF`, `AL`, `DZ`, `AS`, `AD`, `AO`, `AI`, `AQ`, `AG`, `AR`, `AM`, `AW`, `AU`, `AT`, `AZ`, `BS`, `BH`, `BD`, `BB`, `BY`, `BE`, `BZ`, `BJ`, `BM`, `BT`, `BO`, `BA`, `BW`, `BV`, `BR`, `IO`, `BN`, `BG`, `BF`, `BI`, `KH`, `CM`, `CA`, `CV`, `KY`, `CF`, `TD`, `CL`, `CN`, `CX`, `CC`, `CO`, `KM`, `CG`, `CD`, `CK`, `CR`, `CI`, `HR`, `CY`, `CZ`, `DK`, `DJ`, `DM`, `DO`, `TL`, `EC`, `EG`, `SV`, `GQ`, `ER`, `EE`, `ET`, `FK`, `FO`, `FJ`, `FI`, `FR`, `GF`, `PF`, `TF`, `GA`, `GM`, `GE`, `DE`, `GH`, `GI`, `GR`, `GL`, `GD`, `GP`, `GU`, `GT`, `GN`, `GW`, `GY`, `HT`, `HM`, `HN`, `HK`, `HU`, `IS`, `IN`, `ID`, `IQ`, `IE`, `IL`, `IT`, `JM`, `JP`, `JO`, `KZ`, `KE`, `KI`, `KR`, `KW`, `KG`, `LA`, `LV`, `LB`, `LS`, `LR`, `LY`, `LI`, `LT`, `LU`, `MO`, `MK`, `MG`, `MW`, `MY`, `MV`, `ML`, `MT`, `MH`, `MQ`, `MR`, `MU`, `YT`, `MX`, `FM`, `UM`, `MD`, `MC`, `MN`, `MS`, `MA`, `MZ`, `MM`, `NA`, `NR`, `NP`, `NL`, `AN`, `NC`, `NZ`, `NI`, `NE`, `NG`, `NU`, `NF`, `MP`, `NO`, `OM`, `PK`, `PW`, `PA`, `PG`, `PY`, `PE`, `PH`, `PN`, `PL`, `PT`, `PR`, `QA`, `RE`, `RO`, `RU`, `RW`, `SH`, `KN`, `LC`, `PM`, `VC`, `WS`, `SM`, `ST`, `SA`, `SN`, `SC`, `SL`, `SG`, `SK`, `SI`, `SB`, `SO`, `ZA`, `GS`, `ES`, `LK`, `SR`, `SJ`, `SZ`, `SE`, `CH`, `TW`, `TJ`, `TZ`, `TH`, `TG`, `TK`, `TO`, `TT`, `TN`, `TR`, `TM`, `TC`, `TV`, `UG`, `UA`, `AE`, `UK`, `US`, `UY`, `UZ`, `VU`, `VA`, `VE`, `VN`, `VG`, `VI`, `WF`, `EH`, `YE`, `ZM`, `ZW`, `AX`, `BL`, `GG`, `IM`, `JE`, `ME`, `MF`, `RS`.

### `DetectLanguageForMultiCodeDeviceResult`

Extends `DetectLanguageResultBase`.

| field | type | from |
|---|---|---|
| `DetectLanguageCommands` | `CommandToLearn[]` | inherited |
| `Status` | `DetectLanguageStatus` | inherited |
| `GlobalLanguageVersionId` | `GlobalLanguageVersionId` | itself |

### `DetectLanguageResult`

Extends `DetectLanguageResultBase`.

| field | type | from |
|---|---|---|
| `DetectLanguageCommands` | `CommandToLearn[]` | inherited |
| `Status` | `DetectLanguageStatus` | inherited |
| `BestLanguage` | `GlobalLanguageVersionId` | itself |
| `UpdateLanguageOperation` | `UpdateLanguageOperation` | itself |

### `DetectLanguageResultBase`

Extended by 2: `DetectLanguageForMultiCodeDeviceResult`, `DetectLanguageResult`.

| field | type | from |
|---|---|---|
| `DetectLanguageCommands` | `CommandToLearn[]` | itself |
| `Status` | `DetectLanguageStatus` | itself |

### `DetectLanguageStatus`

An enumeration of 5 values.

Values: `Success`, `NeedMoreCommands`, `Failure`, `NoMatchFound`, `NoMoreCommandExist`.

### `DevActionType`

An enumeration of 3 values.

Values: `NotSpecified`, `ForceState`, `SetState`.

### `Device`

Extends `AbstractDevice`.

| field | type | from |
|---|---|---|
| `DecodedEdid` | `string` | inherited |
| `DefaultInterDeviceDelay` | `int` | inherited |
| `DefaultInterKeyDelay` | `int` | inherited |
| `DefaultPressMinRepeats` | `int` | inherited |
| `DeviceOrder` | `int` | inherited |
| `DeviceType` | `DeviceType` | inherited |
| `EncodedEdid` | `byte[]` | inherited |
| `HoldInterDeviceDelay` | `int` | inherited |
| `HoldInterKeyDelay` | `int` | inherited |
| `HoldMinRepeats` | `int` | inherited |
| `InterDeviceDelay` | `int` | inherited |
| `InterKeyDelay` | `int` | inherited |
| `Manufacturer` | `string` | inherited |
| `Model` | `string` | inherited |
| `Name` | `string` | inherited |
| `PictureId` | `PictureId` | inherited |
| `PressMinRepeats` | `int` | inherited |
| `ActivityIds` | `ActivityId[]` | itself |
| `AutoDetectedDevice` | `AutoDetectedDevice` | itself |
| `BTAddress` | `string` | itself |
| `Characterization` | `int` | itself |
| `ContentProfileKey` | `long` | itself |
| `ControlPort` | `int` | itself |
| `CopiedDeviceSource` | `short` | itself |
| `DeviceAddedDate` | `DateTime` | itself |
| `DeviceCapabilitiesWithPriority` | `PrioritizedDeviceCapability[]` | itself |
| `DeviceClassification` | `DeviceCategory` | itself |
| `DeviceProfileUri` | `Uri` | itself |
| `DeviceSearchType` | `int` | itself |
| `DeviceTypeDisplayName` | `string` | itself |
| `DongleIndex` | `int` | itself |
| `DongleRFID` | `long` | itself |
| `GlobalDeviceVersionId` | `GlobalDeviceVersionId` | itself |
| `GlobalLanguageVersionId` | `GlobalLanguageVersionId` | itself |
| `Icon` | `Icon` | itself |
| `Id` | `DeviceId` | itself |
| `IsInterKeyDelayOptimized` | `bool` | itself |
| `IsKeyboardAssociated` | `bool` | itself |
| `IsMultiCode` | `bool` | itself |
| `IsScartCableSupported` | `bool` | itself |
| `ParentDevice` | `PublicGlobalDeviceId` | itself |
| `ParentDeviceManufacturer` | `string` | itself |
| `ParentDeviceModel` | `string` | itself |
| `PrivateAddType` | `int` | itself |
| `RegionalCharset` | `string` | itself |
| `SetupState` | `int` | itself |
| `State` | `int` | itself |
| `SuggestedDisplay` | `string` | itself |
| `Transport` | `int` | itself |

### `DeviceCapabilityType`

An enumeration of 81 values.

Values: `None`, `Volume`, `Display`, `ChangingChannel`, `PlayGame`, `PlayMedia`, `PlayMovie`, `RunLogitechGoogleTV`, `InputSwitching`, `ControlsNetflix`, `AccessInternet`, `VideoCalling`, `ControlsAppleTV`, `ControlsRoku`, `AutomationGateway`, `ControlsComputer`, `KeyboardTextEntry`, `BluetoothHid`, `UsbHid`, `IPControl`, `BluetoothAvrcp`, `HomeAutomation`, `MacOS`, `WindowsOS`, `IsSmartTV`, `TrackpadHID`, `AcceleratedTrackpadHID`, `Channels`, `ContentMetaData`, `SingleIPDevice`, `Infrared`, `NoTextEntrySupport`, `ControlsMediaPlayer`, `ControlsSonos`, `HomeControl`, `Amplifier`, `ZigBee`, `ZWave`, `Module`, `Lock`, `Thermostat`, `Sensor`, `Dimmer`, `Switch`, `Lightbulb`, `Netflix`, `NexusPlayer`, `SupportsOnlineApps`, `ColourControl`, `Motion`, `Moisture`, `Contact`, `Humidity`, `Alarm`, `Temperature`, `EnergyManagement`, `ZHub`, `Unknown`, `BDPlayer`, `SoundBar`, `HDMICEC`, `FourK`, `MultiZone`, `MainZone`, `Shield`, `IPPairing`, `HEOS`, `TCPControl`, `IPPairingYesOrNo`, `AppSupport`, `DynamicApps`, `ProxyRequired`, `AlexaSupported`, `UnSupported`, `BTAppSupport`, `PlatformAppleTv`, `PROD_113_UnSupported_No`, `PROD_113_UnSupported_Yes`, `PROD_113_BluetoothHid_Yes`, `PROD_113_KeyboardTextEntry_Yes`, `PROD_113_TrackpadHID_Yes`.

### `DeviceCategory`

An enumeration of 6 values.

Values: `Any`, `AudioVideoReceiver`, `SetTopBox`, `Television`, `BluRayDvdPlayer`, `CompansionBox`.

### `DeviceCharacterizationType`

An enumeration of 3 values.

Values: `Full`, `Partial`, `TwoWayDevice`.

### `DeviceDescription`

| field | type | from |
|---|---|---|
| `ChannelCustomizationDropped` | `bool` | itself |
| `InputCustomizationDropped` | `bool` | itself |
| `ManufacturerName` | `string` | itself |
| `ModelName` | `string` | itself |
| `PowerCustomizationDropped` | `bool` | itself |

### `DeviceFeatureId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `DeviceId`

Extends `AbstractDeviceId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `DeviceInformation`

| field | type | from |
|---|---|---|
| `DeviceType` | `DeviceType` | itself |
| `InputSwitchingType` | `InputSwitchingType` | itself |
| `MinimizedSet` | `bool` | itself |
| `PowerButtonType` | `PowerButtonType` | itself |
| `SetTopBoxOptions` | `int` | itself |

### `DeviceList`

| field | type | from |
|---|---|---|
| `DevicesWithFeatures` | `DeviceWithFeatures[]` | itself |

### `DeviceModelAliasId`

Extends `AbstractAliasId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `DeviceSearchRequest`

| field | type | from |
|---|---|---|
| `DeviceType` | `DeviceType` | itself |
| `Manufacturer` | `string` | itself |
| `MaxResults` | `int` | itself |
| `ModelNumber` | `string` | itself |
| `SearchType` | `GlobalDeviceSearchType` | itself |

### `DeviceSearchResponse`

| field | type | from |
|---|---|---|
| `Id` | `string` | itself |
| `GlobalDeviceSearchResult` | `GlobalDevicesSearchResult` | itself |
| `Manufacturer` | `string` | itself |
| `ModelNumber` | `string` | itself |
| `USN` | `string` | itself |

### `DeviceSetupState`

An enumeration of 2 values.

Values: `PartiallySetup`, `Setup`.

### `DeviceState`

An enumeration of 4 values.

Values: `Unknown`, `Setup`, `NotSetup`, `Archived`.

### `DeviceType`

An enumeration of 61 values.

Values: `Unknown`, `Default`, `Amplifier`, `AudioVideoSwitch`, `CableBox`, `CDJukebox`, `CDPlayer`, `ClimateControl`, `Computer`, `DAT`, `DigitalMusicServer`, `DigitalSetTopBox`, `DVD`, `DVDRecorder`, `DVDVCR`, `DVDRVCR`, `GameConsole`, `GameConsoleWithDvd`, `HomeAppliance`, `Laptop`, `LaserdiscPlayer`, `LightController`, `MediaCenterPC`, `MiniSystemCDRadioCassette`, `MiniSystemDvdCDRadio`, `MiniSystemDvdVcrRadio`, `MinidiscPlayer`, `Monitor`, `Projector`, `PVR`, `RadioTuner`, `Satellite`, `StereoReceiver`, `TapeDeck`, `Television`, `TVDVD`, `TVDVDVCR`, `TVHDD`, `TVVCR`, `VCR`, `ZWave`, `TVCamera`, `AppleTV`, `Roku`, `AutomationGateway`, `AirConditioner`, `Fan`, `Blinds`, `Controller`, `DoorLock`, `Thermostat`, `Camera`, `ProjectorScreen`, `TVStand`, `MediaPlayer`, `Sensor`, `Plug`, `Dimmer`, `SmokeDetector`, `Remote`, `SoundBar`.

### `DeviceWithFeatures`

| field | type | from |
|---|---|---|
| `Commands` | `Command[]` | itself |
| `Device` | `Device` | itself |
| `DeviceFeatures` | `DeviceFeature[]` | itself |

### `EasyZapperAccountDetailsResponse`

| field | type | from |
|---|---|---|
| `AccountAvailable` | `bool` | itself |
| `ActivitiesCount` | `int` | itself |
| `DevicesCount` | `int` | itself |
| `Unit` | `UnitDescription` | itself |

### `EnumProperty`

Extends `AbstractProperty`.

| field | type | from |
|---|---|---|
| `Name` | `string` | inherited |
| `Values` | `EnumPropertyValue[]` | itself |

### `EnumPropertyValue`

Extends `AbstractPropertyValue`.

| field | type | from |
|---|---|---|
| `Id` | `long` | inherited |
| `Text` | `string` | itself |

### `FailedAnalyzeInfraredResult`

Extends `AnalyzeInfraredResult`.

| field | type | from |
|---|---|---|
| `ErrorCondition` | `string` | itself |

### `FeatureId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `FunctionGroupType`

An enumeration of 11 values.

Values: `Default`, `Numeric`, `ClientActions`, `KeyboardAlphabets`, `KeyboardModifiers`, `CursorNavigation`, `KeyboardSymbols`, `SpecialCharacter`, `KeyboardFunctions`, `KeyboardSpecialModifiers`, `KeyboardNumeric`.

### `FunctionId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `FunctionList`

| field | type | from |
|---|---|---|
| `FunctionMaps` | `AbstractFunctionMap[]` | itself |

### `GeneralADUserDetails`

| field | type | from |
|---|---|---|
| `email` | `string` | itself |
| `isExists` | `bool` | itself |
| `isLocked` | `bool` | itself |
| `name` | `string` | itself |

### `GeneralUserRequest`

| field | type | from |
|---|---|---|
| `email` | `string` | itself |
| `isAccountExists` | `bool` | itself |
| `password` | `string` | itself |

### `GeneralUserResponse`

| field | type | from |
|---|---|---|
| `email` | `string` | itself |
| `firstName` | `string` | itself |
| `isExists` | `bool` | itself |
| `lastName` | `string` | itself |
| `locale` | `string` | itself |

### `GetActivityRolesRequest`

| field | type | from |
|---|---|---|
| `AccountId` | `AccountId` | itself |
| `ActivityTypes` | `ActivityType[]` | itself |
| `DevicesWithCapabilities` | `DeviceWithCapabilities[]` | itself |

### `GetActivityRolesResponse`

| field | type | from |
|---|---|---|
| `Data` | `Dictionary<ActivityType, RoleToDeviceMapping>` | itself |

### `GetActivityTypeRolesRequest`

| field | type | from |
|---|---|---|
| `AccountId` | `AccountId` | itself |
| `ActivityTypes` | `RecommendedActivity[]` | itself |
| `DevicesWithCapabilities` | `DeviceWithCapabilities[]` | itself |

### `GetActivityTypeRolesResponse`

| field | type | from |
|---|---|---|
| `Data` | `Dictionary<string, RoleToDeviceMapping>` | itself |

### `GetActivityTypesAndRolesRequest`

| field | type | from |
|---|---|---|
| `AccountId` | `AccountId` | itself |

### `GetActivityTypesAndRolesResponse`

| field | type | from |
|---|---|---|
| `Data` | `Dictionary<ActivityType, ObservableCollection<AbstractActivityRole>>` | itself |

### `GetAllTeachingCommandsResult`

| field | type | from |
|---|---|---|
| `CommandsToLearn` | `CommandToLearn[]` | itself |
| `Status` | `GetAllTeachingCommandsStatus` | itself |

### `GetAllTeachingCommandsStatus`

An enumeration of 5 values.

Values: `Success`, `FailedDeviceIdNotFound`, `FailedNoTemplateAvailableForDeviceType`, `FailedDeviceTypeNotSet`, `FailedUnknownReason`.

### `GetEasyZapperAccountDetailsRequest`

| field | type | from |
|---|---|---|
| `SourceAccountPassword` | `string` | itself |
| `SourceAccountUserName` | `string` | itself |
| `TargetAccountId` | `long` | itself |

### `GetHubCloudTokenResponse`

| field | type | from |
|---|---|---|
| `HubCloudToken` | `string` | itself |

### `GetPasswordQuestionResult`

| field | type | from |
|---|---|---|
| `PasswordQuestion` | `string` | itself |
| `Status` | `GetPasswordQuestionResultStatus` | itself |

### `GetPasswordQuestionResultStatus`

An enumeration of 3 values.

Values: `Success`, `FailedAccountNotFound`, `FailedUnknownError`.

### `GetRecommendedActivitiesRequest`

| field | type | from |
|---|---|---|
| `AccountId` | `AccountId` | itself |
| `DevicesWithCapabilities` | `DeviceWithCapabilities[]` | itself |

### `GetRecommendedActivitiesResponse`

| field | type | from |
|---|---|---|
| `Data` | `ActivityType[]` | itself |

### `GlobalDevice`

Extends `AbstractDevice`.

| field | type | from |
|---|---|---|
| `DecodedEdid` | `string` | inherited |
| `DefaultInterDeviceDelay` | `int` | inherited |
| `DefaultInterKeyDelay` | `int` | inherited |
| `DefaultPressMinRepeats` | `int` | inherited |
| `DeviceOrder` | `int` | inherited |
| `DeviceType` | `DeviceType` | inherited |
| `EncodedEdid` | `byte[]` | inherited |
| `HoldInterDeviceDelay` | `int` | inherited |
| `HoldInterKeyDelay` | `int` | inherited |
| `HoldMinRepeats` | `int` | inherited |
| `InterDeviceDelay` | `int` | inherited |
| `InterKeyDelay` | `int` | inherited |
| `Manufacturer` | `string` | inherited |
| `Model` | `string` | inherited |
| `Name` | `string` | inherited |
| `PictureId` | `PictureId` | inherited |
| `PressMinRepeats` | `int` | inherited |
| `ChannelTuningFeature` | `ChannelTuningFeature` | itself |
| `Countries` | `Country[]` | itself |
| `DefaultGlobalLanguageVersionId` | `long` | itself |
| `DeviceCapabilitiesWithPriority` | `PrioritizedDeviceCapability[]` | itself |
| `GlobalDeviceVersionId` | `GlobalDeviceVersionId` | itself |
| `GlobalDeviceVersionIds` | `GlobalDeviceVersionId[]` | itself |
| `GlobalLanguages` | `GlobalDeviceGlobalLanguage[]` | itself |
| `Id` | `long` | itself |
| `IsFirmwareRevision` | `bool` | itself |
| `IsInterKeyDelayOptimized` | `bool` | itself |
| `IsMultiCode` | `bool` | itself |
| `IsRegionalRevision` | `bool` | itself |
| `MinRepeats` | `int` | itself |
| `PrimaryBrandId` | `long` | itself |
| `PrimaryManufacturerAlias` | `string` | itself |
| `PrimaryModelAlias` | `string` | itself |
| `UserDeviceCount` | `long` | itself |

### `GlobalDeviceGlobalLanguage`

| field | type | from |
|---|---|---|
| `GlobalLanguage` | `GlobalLanguages` | itself |
| `IsDefault` | `bool` | itself |

### `GlobalDeviceId`

Extends `AbstractDeviceId`. Extended by 2: `PrivateGlobalDeviceId`, `PublicGlobalDeviceId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `GlobalDeviceSearchType`

An enumeration of 7 values.

Values: `ExactMatch`, `DidYouMeanMatch`, `CloseMatch`, `LastChanceMatch`, `DeviceAutocomplete`, `ManufacturerAutocomplete`, `ClassificationMatch`.

### `GlobalDeviceVersionId`

Extends `AbstractId`.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |
| `IsDefault` | `bool` | itself |
| `VersionId` | `long` | itself |

### `GlobalDevicesSearchResult`

| field | type | from |
|---|---|---|
| `Matches` | `PublicDeviceSearchMatch[]` | itself |
| `Status` | `GlobalDevicesSearchStatus` | itself |

### `GlobalDevicesSearchStatus`

An enumeration of 4 values.

Values: `Success`, `NoMatchFound`, `DidYouMean`, `RemoteModelFound`.

### `GlobalLanguageVersionId`

Extends `AbstractId`.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |
| `VersionId` | `long` | itself |

### `GlobalLanguages`

| field | type | from |
|---|---|---|
| `Id` | `GlobalLanguageVersionId` | itself |
| `Name` | `string` | itself |

### `GlobalRemote`

| field | type | from |
|---|---|---|
| `DateCreated` | `DateTime` | itself |
| `GlobalRemoteId` | `long` | itself |
| `IsBanished` | `bool` | itself |
| `IsLocked` | `bool` | itself |
| `IsProSKU` | `bool` | itself |
| `LastProductIdentifier` | `string` | itself |
| `OriginalProductIdentifier` | `string` | itself |
| `ProductId` | `int` | itself |
| `Region` | `int` | itself |
| `RemoteRefurbishedDate` | `DateTime` | itself |
| `RemoteRefurbishedStatus` | `short` | itself |
| `SerialNumber` | `string` | itself |
| `SkinId` | `int` | itself |
| `Status` | `short` | itself |
| `VendorId` | `int` | itself |

### `GlobalStateValueActionSetType`

An enumeration of 3 values.

Values: `NotSpecified`, `SetStateValue`, `ChangeSetStateValue`.

### `GtvAuthenticationResponse`

| field | type | from |
|---|---|---|
| `Challenge2` | `string` | itself |
| `EncryptedUserId` | `string` | itself |
| `Status` | `int` | itself |

### `GtvPackageCertificate`

| field | type | from |
|---|---|---|
| `PackageInfoAndChallenge` | `string` | itself |
| `Signature` | `string` | itself |

### `HandshakeResponse`

| field | type | from |
|---|---|---|
| `Challenge` | `byte[]` | itself |
| `Nonce` | `long` | itself |

### `HouseholdId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `HouseholdRequest`

| field | type | from |
|---|---|---|
| `access_token` | `string` | itself |
| `id_token` | `string` | itself |
| `password` | `string` | itself |
| `userName` | `string` | itself |

### `HouseholdSupportPolicy`

| field | type | from |
|---|---|---|
| `AccountSupportPolicies` | `Dictionary<long, CustomerSupportPolicy>` | itself |
| `CombinedSupportPolicy` | `CustomerSupportPolicy` | itself |

### `IPScanDeviceSearchRequest`

| field | type | from |
|---|---|---|
| `Id` | `string` | itself |
| `DeviceClass` | `string` | itself |
| `Manufacturer` | `string` | itself |
| `ModelName` | `string` | itself |
| `ModelNumber` | `string` | itself |
| `FriendlyName` | `string` | itself |
| `IpAddress` | `string` | itself |
| `ServiceType` | `string` | itself |
| `Usn` | `string` | itself |
| `SerialNumber` | `string` | itself |

### `Icon`

An enumeration of 63 values.

Values: `Unknown`, `Default`, `Amplifier`, `AudioVideoSwitch`, `CableBox`, `CDJukebox`, `CDPlayer`, `ClimateControl`, `Computer`, `DAT`, `DigitalMusicServer`, `DigitalSetTopBox`, `DVD`, `DVDRecorder`, `DVDVCR`, `DVDRVCR`, `GameConsole`, `GameConsoleWithDvd`, `HomeAppliance`, `Laptop`, `LaserdiscPlayer`, `LightController`, `MediaCenterPC`, `MiniSystemCDRadioCassette`, `MiniSystemDvdCDRadio`, `MiniSystemDvdVcrRadio`, `MinidiscPlayer`, `Monitor`, `Projector`, `PVR`, `RadioTuner`, `Satellite`, `StereoReceiver`, `TapeDeck`, `Television`, `TVDVD`, `TVDVDVCR`, `TVHDD`, `TVVCR`, `VCR`, `ZWave`, `Revue`, `TVCamera`, `AppleTV`, `Roku`, `PCTV`, `AirConditioner`, `Fan`, `Blinds`, `Controller`, `DoorLock`, `Thermostat`, `Camera`, `ProjectorScreen`, `TVStand`, `AutomationGateway`, `MediaPlayer`, `Sensor`, `Plug`, `Dimmer`, `SmokeDetector`, `Remote`, `SoundBar`.

### `ImageStoreInfo`

| field | type | from |
|---|---|---|
| `AccessControlList` | `Grant[]` | itself |
| `AccessKey` | `string` | itself |
| `Bucket` | `string` | itself |
| `Path` | `string` | itself |
| `Signatures` | `Dictionary<OperationType, string>` | itself |
| `StorageClass` | `StorageClass` | itself |
| `TimeStamp` | `DateTime` | itself |
| `UriBase` | `Uri` | itself |

### `InputSwitchingType`

An enumeration of 7 values.

Values: `NotSpecified`, `Discrete`, `Toggle`, `MenuDiscrete`, `MenuToggle`, `MultiMethod`, `SingleInput`.

### `InputType`

An enumeration of 8 values.

Values: `Unknown`, `NotSpecified`, `Discrete`, `Toggle`, `MenuDiscrete`, `MenuToggle`, `MultiMethod`, `SingleInput`.

### `KeyCode`

| field | type | from |
|---|---|---|
| `Code` | `string` | itself |
| `Protocol` | `string` | itself |

### `KeyboardLayoutType`

An enumeration of 4 values.

Values: `Undefined`, `QWERTY`, `QWERTZ`, `AZERTY`.

### `KeyboardLocale`

| field | type | from |
|---|---|---|
| `Id` | `int` | itself |
| `LanguageCode` | `string` | itself |
| `LocaleCode` | `string` | itself |
| `Name` | `string` | itself |
| `SupportedCountries` | `CountryType[]` | itself |

### `LearnedCommand`

| field | type | from |
|---|---|---|
| `KeyCode` | `KeyCode` | itself |
| `Name` | `string` | itself |
| `Status` | `LearnedCommandStatus` | itself |

### `LearnedCommandStatus`

An enumeration of 4 values.

Values: `Learned`, `Skipped`, `Failed`, `NotYetLearned`.

### `LinkHandshakeResponse`

| field | type | from |
|---|---|---|
| `Challenge` | `string` | itself |
| `Nonce` | `long` | itself |

### `LoginResponse`

| field | type | from |
|---|---|---|
| `AccountId` | `string` | itself |
| `AuthToken` | `string` | itself |
| `Email` | `string` | itself |
| `IsLockedOut` | `bool` | itself |
| `IsNewUser` | `bool` | itself |

### `MapList`

| field | type | from |
|---|---|---|
| `ButtonMaps` | `AbstractButtonMap[]` | itself |
| `FunctionMaps` | `AbstractFunctionMap[]` | itself |

### `MigrateEasyZapperAccountRequest`

| field | type | from |
|---|---|---|
| `SourceAccountPassword` | `string` | itself |
| `SourceAccountUserName` | `string` | itself |
| `TargetAccountId` | `long` | itself |

### `MigrateEasyZapperAccountResponse`

| field | type | from |
|---|---|---|
| `AccountMigrationStatus` | `AccountMigrationStatus` | itself |
| `DiscardedActivities` | `ActivityDescription[]` | itself |
| `DiscardedDevices` | `DeviceDescription[]` | itself |
| `MigratedActivities` | `ActivityDescription[]` | itself |
| `MigratedDevices` | `DeviceDescription[]` | itself |
| `Unit` | `UnitDescription` | itself |

### `MigrateHarmonyPlatformDevicesAndActivitiesRequest`

| field | type | from |
|---|---|---|
| `sourceAccountId` | `AccountId` | itself |
| `sourceAccountIdDeviceIdsCollection` | `Dictionary<AccountId, ObservableCollection<DeviceId>>` | itself |
| `targetAccountId` | `AccountId` | itself |
| `targetHouseholdId` | `HouseholdId` | itself |

### `MigrateHarmonyPlatformDevicesAndActivitiesResponse`

| field | type | from |
|---|---|---|
| `Household` | `HouseholdId` | itself |
| `IsFavoritesMigrated` | `bool` | itself |
| `LogCloneStatus` | `Dictionary<string, string>` | itself |
| `NoOfGatewaysAdded` | `int` | itself |
| `NoOfMigratedActivities` | `int` | itself |
| `NoOfMigratedDevices` | `int` | itself |
| `SourceAccountId` | `AccountId` | itself |
| `Status` | `Status` | itself |
| `targetAccountId` | `AccountId` | itself |
| `targetHouseholdId` | `HouseholdId` | itself |

### `PairingId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `PairingInfo`

| field | type | from |
|---|---|---|
| `EquadID` | `string` | itself |
| `RFID` | `string` | itself |
| `SkinId` | `string` | itself |

### `PictureId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `PowerButtonType`

An enumeration of 4 values.

Values: `NotSpecified`, `Discrete`, `Toggle`, `Manual`.

### `PowerType`

An enumeration of 4 values.

Values: `NotSpecified`, `Discrete`, `Toggle`, `Manual`.

### `PrioritizedDeviceCapability`

| field | type | from |
|---|---|---|
| `DeviceCapability` | `DeviceCapabilityType` | itself |
| `Priority` | `int` | itself |

### `PrivateAddType`

An enumeration of 3 values.

Values: `NotApplicable`, `DidYouMean`, `NoMatch`.

### `PrivateGlobalDeviceId`

Extends `GlobalDeviceId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `Product2`

| field | type | from |
|---|---|---|
| `CompilerArchitecture` | `CompilerArchitecture` | itself |
| `DefaultMode` | `int` | itself |
| `DisplayName` | `string` | itself |
| `Displays` | `Display[]` | itself |
| `IsAlwaysConnected` | `bool` | itself |
| `IsEnabled` | `bool` | itself |
| `IsHosted` | `bool` | itself |
| `IsStaticLocation` | `bool` | itself |
| `Keyboards` | `Keyboard[]` | itself |
| `Manufacturer` | `Manufacturer` | itself |
| `MaxActivities` | `int` | itself |
| `MaxDevicesPerAccount` | `int` | itself |
| `MaxDevicesPerTimePeriod` | `int` | itself |
| `MaxFavoriteChannels` | `int` | itself |
| `MinutesPerTimePeriod` | `int` | itself |
| `Name` | `string` | itself |
| `NumOfAddDevice` | `int` | itself |
| `ProSKUDisplayName` | `string` | itself |
| `ProductId` | `int` | itself |
| `ProductIdentifier` | `string` | itself |
| `ProductSettings` | `ProductSetting[]` | itself |
| `Region` | `Region` | itself |
| `SkinId` | `int` | itself |
| `SupportedCapabilities` | `SupportedCapability[]` | itself |

### `ProductCapabilitiesRequest`

| field | type | from |
|---|---|---|
| `accountId` | `long` | itself |

### `ProductCapabilitiesResponse`

| field | type | from |
|---|---|---|
| `Product` | `Product` | itself |

### `ProductCapabilitiesResponse2`

| field | type | from |
|---|---|---|
| `Product` | `Product2` | itself |

### `ProductCapability`

| field | type | from |
|---|---|---|
| `CapabilityId` | `int` | itself |
| `CountryId` | `int` | itself |
| `Data` | `string` | itself |
| `FWFeatureDependencies` | `string` | itself |
| `IsDeny` | `bool` | itself |
| `Name` | `string` | itself |
| `ParentCapabilityId` | `int` | itself |
| `RequiredFor` | `string` | itself |
| `Status` | `string` | itself |
| `Type` | `int` | itself |

### `ProductId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `ProtocolId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `ProviderLoginRequest`

| field | type | from |
|---|---|---|
| `access_token` | `string` | itself |
| `id_token` | `string` | itself |
| `providerType` | `string` | itself |

### `PublicGlobalDeviceId`

Extends `GlobalDeviceId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `Question`

| field | type | from |
|---|---|---|
| `Answers` | `PublicDeviceSearchMatch[]` | itself |
| `QuestionType` | `QuestionType` | itself |

### `QuestionType`

An enumeration of 3 values.

Values: `BrandTypo`, `ModelTypo`, `BrandModelTypo`.

### `QuestionVerifyDeviceResult`

Extends `VerifyDeviceResult`.

| field | type | from |
|---|---|---|
| `Question` | `Question` | itself |

### `Region`

An enumeration of 5 values.

Values: `Unknown`, `Amr`, `Emea`, `Global`, `Apac`.

### `RemoteId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `RemoveAccountFromHouseholdResult`

No fields of its own.

### `RoomId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `SetupRatingCommentCategoryType`

An enumeration of 8 values.

Values: `NotSpecified`, `OnlineSetup`, `RemoteControlDesign`, `ControlOfDevices`, `CustomerService`, `Documentation`, `Other`, `BasicSetup`.

### `SignIn2Request`

| field | type | from |
|---|---|---|
| `access_token` | `string` | itself |
| `id_token` | `string` | itself |
| `latitude` | `double` | itself |
| `longitude` | `double` | itself |
| `timezone` | `string` | itself |

### `SignInRequest`

| field | type | from |
|---|---|---|
| `simpleRequest` | `GeneralUserRequest` | itself |
| `socialRequest` | `ProviderLoginRequest` | itself |

### `SignUpRequest`

| field | type | from |
|---|---|---|
| `simpleRequest` | `CreateAccountRequest` | itself |
| `socialRequest` | `ProviderLoginRequest` | itself |

### `SuccessAnalyzeInfraredResult`

Extends `AnalyzeInfraredResult`.

| field | type | from |
|---|---|---|
| `KeyCode` | `string` | itself |

### `SuccessVerifyDeviceResult`

Extends `VerifyDeviceResult`.

| field | type | from |
|---|---|---|
| `AddDeviceOperation` | `AddDeviceOperation` | itself |

### `SupportedCapability`

An enumeration of 123 values.

Values: `Activities`, `FavoriteChannels`, `ModeMap`, `Wifi`, `RemoteSettings`, `ColourDisplay`, `FunctionMapping`, `CompiledRemoteButtonMapping`, `ActivityCompiledRemoteButtonMapping`, `PartiallySetupActivities`, `HidControl`, `ActivityReorder`, `LocaleEnabled`, `WPSEnabled`, `DeviceDelay`, `FeaturesNotRequired`, `SupportsProvisioning`, `ActivityMapping`, `SupportsCertificateActivation`, `SupportActivityIcon`, `SupportsVideoCalling`, `SupportActivitySequence`, `ButtonSequences`, `LeaveDevicesPoweredOn`, `Bluetooth`, `Pairing`, `BackgroundImage`, `RemoteAndHubAssignment`, `DeviceSetupHelp`, `LongPressAction`, `PremiumAccounts`, `SupportsWatchAppleTVActivity`, `SupportsRokuActivity`, `IsExtendible`, `SupportsHomeAutomation`, `SupportsGateway`, `SupportsMHAssist`, `PCTV`, `SupportsEmailCampaign`, `KeyboardTextEntry`, `SupportsCosmoUpgrade`, `SupportsIPDeviceScanning`, `SmartTV`, `BluetoothHid`, `UsbHid`, `IPControl`, `SonosFavorites`, `RokuFavorites`, `iControl`, `Nest`, `Honeywell`, `August`, `SmartThings`, `SupportsFireTVActivity`, `SupportsKeyboardUpgrade`, `ListenToSonos`, `GreyMarketRestriction`, `SupportsGroup`, `ActivityTrigger`, `Zigbee`, `Zwave`, `HomeControl`, `PEQ`, `ActivityStartUpChannel`, `Caseta`, `SupportsPrograms`, `SupportsOOH`, `SupportsInAppPurchase`, `MobileActivityIcon`, `SupportsPlugs`, `moosehead`, `DanaLock`, `NestProtect`, `Rheem`, `SupportsWatchApp`, `Lifx`, `HomeHubExtender`, `Insteon`, `SupportsChangeUsername`, `HCMapping`, `WatchNexus`, `SupportsTimezone`, `Qivicon`, `Ecobee`, `DishHopper`, `HCMappingLegacy`, `OnDemandPackageUpdate`, `HarmonyUltimateHub`, `HarmonySmartControl`, `HarmonyTouch`, `HarmonyUltimateRemote`, `HarmonyKeyboard`, `HarmonyUltimateOne`, `HarmonyUltimateHomeRemote`, `HarmonyHomeHub`, `HarmonyHomeControlRemote`, `HarmonyUltimateHomeRemoteWhite`, `HarmonyHomeControlRemoteWhite`, `HarmonyHomeHubExtender`, `HarmonyElitePlus`, `HarmonyElite`, `HarmonyOne`, `Olive`, `Harmony300`, `Harmony200`, `Harmony700`, `Harmony600`, `Harmony650`, `OliveEMEA`, `Harmony300EMEA`, `Harmony200EMEA`, `Harmony700EMEA`, `Harmony600EMEA`, `Harmony650EMEA`, `HarmonyUltimate`, `Harmony350`, `HarmonySmartControlAndKeyboard`, `HarmonyUltimateHome`, `HarmonyHomeControl`, `HarmonyUltimateHomeWhite`, `HarmonyHomeControlWhite`, `SupportsCertificateActivationWithHub`, `scenes`.

### `SurfaceId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `TransportType`

An enumeration of 9 values.

Values: `None`, `Infrared`, `UsbHid`, `HdmiCec`, `BluetoothAvrcp`, `BluetoothHogp`, `BluetoothHid`, `IPControl`, `TCPControl`.

### `UnifiedSupportPolicy`

| field | type | from |
|---|---|---|
| `AccountSupportPolicies` | `Dictionary<long, ObservableCollection<CustomerSupportPolicy>>` | itself |
| `CombinedSupportPolicy` | `CustomerSupportPolicy` | itself |

### `UnitDescription`

| field | type | from |
|---|---|---|
| `DisplayName` | `string` | itself |
| `ModelName` | `string` | itself |
| `SkinId` | `int` | itself |
| `UserUnitId` | `int` | itself |

### `UpdateCommandResult`

| field | type | from |
|---|---|---|
| `Success` | `bool` | itself |

### `UpdateStatus`

An enumeration of 2 values.

Values: `Failed`, `Successful`.

### `UpgradeConfigRequest`

| field | type | from |
|---|---|---|
| `AccountId` | `long` | itself |
| `ConfigVersion` | `string` | itself |

### `UpgradeConfigResponse`

An enumeration of 2 values.

Values: `Successful`, `Failed`.

### `UserAuthTokenResponse`

| field | type | from |
|---|---|---|
| `AccountId` | `long` | itself |
| `UserAuthToken` | `string` | itself |

### `UserDeviceSetupState`

An enumeration of 4 values.

Values: `Unknown`, `Ready`, `IncorrectModelNumber`, `IncorrectLanguage`.

### `UserHubCapabilities`

| field | type | from |
|---|---|---|
| `Capabilities` | `UserHubCapability[]` | itself |
| `DisplayName` | `string` | itself |
| `MaxActivities` | `int` | itself |
| `MaxDevices` | `int` | itself |

### `UserHubCapability`

| field | type | from |
|---|---|---|
| `Data` | `string` | itself |
| `Id` | `int` | itself |
| `Name` | `string` | itself |
| `Status` | `string` | itself |
| `Type` | `int` | itself |
| `requiredFor` | `string` | itself |

### `UserInfoRequest`

| field | type | from |
|---|---|---|
| `email` | `string` | itself |
| `password` | `string` | itself |

### `UserInfoResult`

| field | type | from |
|---|---|---|
| `contactme` | `bool` | itself |
| `country` | `string` | itself |
| `firstname` | `string` | itself |
| `lastname` | `string` | itself |

### `VerifyDeviceResult`

Extended by 2: `QuestionVerifyDeviceResult`, `SuccessVerifyDeviceResult`. No fields of its own.

### `Workflow`

An enumeration of 4 values.

Values: `None`, `Upgrade`, `Downgrade`, `ModeConversion`.

## `Activity`, 38 contracts

### `AbstractActivityAction`

Extended by 3: `ChannelActivityAction`, `CommandActivityAction`, `DelayActivityAction`.

| field | type | from |
|---|---|---|
| `ActionOrder` | `int` | itself |
| `Id` | `long` | itself |

### `AbstractActivityRole`

Extended by 22: `AccessInternetActivityRole`, `ChannelChangingActivityRole`, `ControlsAppActivityRole`, `ControlsAppleTVActivityRole`, `ControlsComputerActivityRole`, `ControlsMediaPlayerActivityRole`, `ControlsNetflixActivityRole`, `ControlsRokuActivityRole`, `ControlsSonosActivityRole`, `ControlsSpeakerActivityRole`, `ControlsVideoCallActivityRole`, `DisplayActivityRole`, `KeyboardTextEntryActivityRole`, `PassThroughActivityRole`, `PlayGameActivityRole`, `PlayMediaActivityRole`, `PlayMovieActivityRole`, `PowerInputActivityRole`, `RunLogitechGoogleTVActivityRole`, `SilentActivityRole`, `SmartTVActivityRole`, `VolumeActivityRole`.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | itself |
| `Id` | `ActivityRoleId` | itself |
| `NextDevicePowerOnDelay` | `int` | itself |
| `PowerOffOrder` | `int` | itself |
| `PowerOnOrder` | `int` | itself |
| `SelectedInput` | `ActivityInputState` | itself |

### `AccessInternetActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `Activity`

| field | type | from |
|---|---|---|
| `AccountId` | `AccountId` | itself |
| `ActivityDisplayName` | `string` | itself |
| `ActivityGroup` | `ActivityGroup` | itself |
| `ActivityOrder` | `short` | itself |
| `Alternatives` | `string` | itself |
| `BaseImageUri` | `string` | itself |
| `DateCreated` | `DateTime` | itself |
| `DateModified` | `DateTime` | itself |
| `DefaultChannel` | `string` | itself |
| `DefaultStation` | `string` | itself |
| `DefaultStationName` | `string` | itself |
| `EnterActions` | `AbstractActivityAction[]` | itself |
| `Icon` | `string` | itself |
| `Id` | `ActivityId` | itself |
| `ImageKey` | `string` | itself |
| `IsDefault` | `bool` | itself |
| `IsMultiZone` | `bool` | itself |
| `IsTuningDefault` | `bool` | itself |
| `LeaveActions` | `AbstractActivityAction[]` | itself |
| `Name` | `string` | itself |
| `Roles` | `AbstractActivityRole[]` | itself |
| `StartScreen` | `string` | itself |
| `State` | `ActivityState` | itself |
| `SuggestedDisplay` | `string` | itself |
| `Type` | `ActivityType` | itself |

### `ActivityGroup`

An enumeration of 5 values.

Values: `VirtualGeneric`, `VirtualTelevisionN`, `VirtualDvd`, `VirtualCdMulti`, `VirtualGameConsole`.

### `ActivityInputState`

| field | type | from |
|---|---|---|
| `ChannelNumber` | `string` | itself |
| `Id` | `ActivityInputStateId` | itself |
| `Name` | `string` | itself |

### `ActivityInputStateId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `ActivityRoleId`

Extends `AbstractId`. No fields of its own.

| field | type | from |
|---|---|---|
| `IsPersisted` | `bool` | inherited |
| `Value` | `object` | inherited |

### `ActivityRoleType`

An enumeration of 23 values.

Values: `None`, `Volume`, `Display`, `ChangingChannel`, `PassThrough`, `PlayGame`, `PlayMedia`, `PlayMovie`, `RunLogitechGoogleTV`, `PowerInputActivityRole`, `ControlsNetflix`, `AccessInternet`, `Silent`, `ControlsVideoCall`, `ControlsAppleTV`, `ControlsRoku`, `ControlsComputer`, `KeyboardTextEntry`, `SmartTV`, `ControlsMediaPlayer`, `ControlsSonos`, `ControlsApp`, `ControlsSpeaker`.

### `ActivityState`

An enumeration of 2 values.

Values: `Setup`, `NonSetup`.

### `ActivityType`

An enumeration of 17 values.

Values: `NotSpecified`, `WatchTV`, `WatchDvd`, `PlayGame`, `ListenToMusic`, `Custom`, `SurfWeb`, `WatchNetflix`, `MakeVideoCall`, `WatchAppleTV`, `WatchRoku`, `PCTV`, `SmartTV`, `WatchFireTV`, `ListenToSonos`, `WatchApp`, `ListenToSpeaker`.

### `ChannelActivityAction`

Extends `AbstractActivityAction`.

| field | type | from |
|---|---|---|
| `ActionOrder` | `int` | inherited |
| `Id` | `long` | inherited |
| `ChannelNumber` | `string` | itself |
| `DeviceId` | `DeviceId` | itself |

### `ChannelChangingActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `CommandActivityAction`

Extends `AbstractActivityAction`.

| field | type | from |
|---|---|---|
| `ActionOrder` | `int` | inherited |
| `Id` | `long` | inherited |
| `CommandName` | `string` | itself |
| `DeviceId` | `DeviceId` | itself |
| `TargetLevel` | `int` | itself |

### `ControlsAppActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `ControlsAppleTVActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `ControlsComputerActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `ControlsMediaPlayerActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `ControlsNetflixActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `ControlsRokuActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `ControlsSonosActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `ControlsSpeakerActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `ControlsVideoCallActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `DelayActivityAction`

Extends `AbstractActivityAction`.

| field | type | from |
|---|---|---|
| `ActionOrder` | `int` | inherited |
| `Id` | `long` | inherited |
| `Duration` | `int` | itself |

### `DeviceWithCapabilities`

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | itself |
| `DeviceType` | `DeviceType` | itself |
| `Transport` | `TransportType` | itself |
| `PrioritizedCapabilities` | `PrioritizedDeviceCapability[]` | itself |

### `DisplayActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `KeyboardTextEntryActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `PassThroughActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `PlayGameActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `PlayMediaActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `PlayMovieActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `PowerInputActivityRole`

Extends `AbstractActivityRole`.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |
| `DeviceClassificationName` | `string` | itself |

### `RecommendedActivity`

| field | type | from |
|---|---|---|
| `Type` | `ActivityType` | itself |
| `SuggestedDisplay` | `string` | itself |
| `ImageKey` | `string` | itself |

### `RoleToDeviceMapping`

| field | type | from |
|---|---|---|
| `Mapping` | `Dictionary<AbstractActivityRole, ObservableCollection<DeviceId>>` | itself |

### `RunLogitechGoogleTVActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `SilentActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `SmartTVActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

### `VolumeActivityRole`

Extends `AbstractActivityRole`. No fields of its own.

| field | type | from |
|---|---|---|
| `DeviceId` | `DeviceId` | inherited |
| `Id` | `ActivityRoleId` | inherited |
| `NextDevicePowerOnDelay` | `int` | inherited |
| `PowerOffOrder` | `int` | inherited |
| `PowerOnOrder` | `int` | inherited |
| `SelectedInput` | `ActivityInputState` | inherited |

## `Search`, 37 contracts

### `AbstractGlobalDataSearchCriteria`

Extended by 8: `AbstractSearchBrandCriteria`, `AbstractSearchGlobalDeviceCriteria`, `AbstractSearchGlobalLanguageCriteria`, `AbstractSearchGlobalLanguageElementCriteria`, `AbstractSearchGlobalLanguageElementFunctionCriteria`, `AbstractSearchGlobalLanguageVersionsCriteria`, `AbstractSearchKeyCodeCriteria`, `AbstractSearchProtocolsCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | itself |
| `SkipResults` | `int` | itself |

### `AbstractSearchBrandCriteria`

Extends `AbstractGlobalDataSearchCriteria`. Extended by 2: `SearchBrandsByAliasNameCriteria`, `SearchBrandsByIdCriteria`. No fields of its own.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |

### `AbstractSearchGlobalDeviceCriteria`

Extends `AbstractGlobalDataSearchCriteria`. Extended by 10: `SearchGlobalDeviceByBrandAliasCriteria`, `SearchGlobalDeviceByGlobalDeviceIdCriteria`, `SearchGlobalDeviceByGlobalDeviceIdsCriteria`, `SearchGlobalDeviceByLanguageIdCriteria`, `SearchGlobalDeviceByLanguageVersionIdsCriteria`, `SearchGlobalDeviceByModelAliasCriteria`, `SearchGlobalDeviceByMultipleGroupCriteria`, `SearchGlobalDeviceByPromotableCriteria`, `SearchGlobalDeviceByVersionIdCriteria`, `SearchGlobalDeviceByVersionIdsCriteria`. No fields of its own.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |

### `AbstractSearchGlobalLanguageCriteria`

Extends `AbstractGlobalDataSearchCriteria`. Extended by 6: `SearchGlobalLanguageByElementNameCriteria`, `SearchGlobalLanguageByExactNameCriteria`, `SearchGlobalLanguageByIdCriteria`, `SearchGlobalLanguageByKeyCodeCriteria`, `SearchGlobalLanguageByNameAndRemoteModelCriteria`, `SearchGlobalLanguageByNameCriteria`. No fields of its own.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |

### `AbstractSearchGlobalLanguageElementCriteria`

Extends `AbstractGlobalDataSearchCriteria`. Extended by 1: `SearchGlobalLanguageElementByCustomCriteria`. No fields of its own.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |

### `AbstractSearchGlobalLanguageElementFunctionCriteria`

Extends `AbstractGlobalDataSearchCriteria`. Extended by 2: `SearchGlobalLanguageElementFunctionByNameCriteria`, `SearchGlobalLanguageElementFunctionCriteria`. No fields of its own.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |

### `AbstractSearchGlobalLanguageVersionsCriteria`

Extends `AbstractGlobalDataSearchCriteria`. Extended by 3: `SearchGlobalLanguageVersionsByCustomCriteria`, `SearchGlobalLanguageVersionsByIdCriteria`, `SearchGlobalLanguageVersionsByIdsCriteria`. No fields of its own.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |

### `AbstractSearchKeyCodeCriteria`

Extends `AbstractGlobalDataSearchCriteria`. Extended by 1: `SearchKeyCodeByValueCriteria`. No fields of its own.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |

### `AbstractSearchProtocolsCriteria`

Extends `AbstractGlobalDataSearchCriteria`. Extended by 2: `SearchProtocolsByIdCriteria`, `SearchProtocolsByNameCriteria`. No fields of its own.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |

### `GlobalDeviceOrder`

An enumeration of 1 values.

Values: `UserDeviceCount`.

### `SearchBrandsByAliasNameCriteria`

Extends `AbstractSearchBrandCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `IsBrandAutoCompleteSearch` | `bool` | itself |
| `Name` | `string` | itself |

### `SearchBrandsByIdCriteria`

Extends `AbstractSearchBrandCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `Id` | `long` | itself |

### `SearchGlobalDeviceByBrandAliasCriteria`

Extends `AbstractSearchGlobalDeviceCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `Name` | `string` | itself |

### `SearchGlobalDeviceByGlobalDeviceIdCriteria`

Extends `AbstractSearchGlobalDeviceCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `GlobalDeviceId` | `long` | itself |

### `SearchGlobalDeviceByGlobalDeviceIdsCriteria`

Extends `AbstractSearchGlobalDeviceCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `GlobalDeviceIds` | `long[]` | itself |

### `SearchGlobalDeviceByLanguageIdCriteria`

Extends `AbstractSearchGlobalDeviceCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `LanguageId` | `long` | itself |

### `SearchGlobalDeviceByLanguageVersionIdsCriteria`

Extends `AbstractSearchGlobalDeviceCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `GlobalLanguageVersionIds` | `long[]` | itself |

### `SearchGlobalDeviceByModelAliasCriteria`

Extends `AbstractSearchGlobalDeviceCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `IsPublic` | `bool` | itself |
| `Name` | `string` | itself |

### `SearchGlobalDeviceByMultipleGroupCriteria`

Extends `AbstractSearchGlobalDeviceCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `DeviceTypeFilter` | `DeviceType[]` | itself |
| `Manufacturer` | `BrandId` | itself |
| `ModelName` | `string` | itself |
| `OrderResults` | `GlobalDeviceOrder` | itself |
| `RequirePublicModelAlias` | `bool` | itself |
| `SearchAllDeviceTypes` | `bool` | itself |
| `TopResults` | `int` | itself |
| `UserDeviceMaximum` | `int` | itself |
| `UserDeviceMinimum` | `int` | itself |

### `SearchGlobalDeviceByPromotableCriteria`

Extends `AbstractSearchGlobalDeviceCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `DeviceTypeFilter` | `DeviceType[]` | itself |
| `Manufacturer` | `BrandId` | itself |
| `OrderResults` | `GlobalDeviceOrder` | itself |
| `RequirePublicModelAlias` | `bool` | itself |
| `SearchAllDeviceTypes` | `bool` | itself |
| `TopResults` | `int` | itself |
| `UserDeviceMaximum` | `int` | itself |
| `UserDeviceMinimum` | `int` | itself |

### `SearchGlobalDeviceByVersionIdCriteria`

Extends `AbstractSearchGlobalDeviceCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `GlobalDeviceVersionId` | `long` | itself |

### `SearchGlobalDeviceByVersionIdsCriteria`

Extends `AbstractSearchGlobalDeviceCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `GlobalDeviceVersionIds` | `long[]` | itself |

### `SearchGlobalLanguageByElementNameCriteria`

Extends `AbstractSearchGlobalLanguageCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `ElementName` | `string` | itself |

### `SearchGlobalLanguageByExactNameCriteria`

Extends `AbstractSearchGlobalLanguageCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `Name` | `string` | itself |

### `SearchGlobalLanguageByIdCriteria`

Extends `AbstractSearchGlobalLanguageCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `GlobalLanguageId` | `long` | itself |
| `VersionId` | `long` | itself |

### `SearchGlobalLanguageByKeyCodeCriteria`

Extends `AbstractSearchGlobalLanguageCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `KeyCode` | `GlobalLanguageKeyCode` | itself |

### `SearchGlobalLanguageByNameAndRemoteModelCriteria`

Extends `AbstractSearchGlobalLanguageCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `Name` | `string` | itself |
| `RemoteModel` | `string` | itself |

### `SearchGlobalLanguageByNameCriteria`

Extends `AbstractSearchGlobalLanguageCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `Name` | `string` | itself |

### `SearchGlobalLanguageElementByCustomCriteria`

Extends `AbstractSearchGlobalLanguageElementCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `ButtonLabel` | `string` | itself |
| `ElementName` | `string` | itself |
| `FunctionId` | `long` | itself |
| `KeyCodeId` | `long` | itself |

### `SearchGlobalLanguageElementFunctionByNameCriteria`

Extends `AbstractSearchGlobalLanguageElementFunctionCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `Name` | `string` | itself |

### `SearchGlobalLanguageElementFunctionCriteria`

Extends `AbstractSearchGlobalLanguageElementFunctionCriteria`. No fields of its own.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |

### `SearchGlobalLanguageVersionsByCustomCriteria`

Extends `AbstractSearchGlobalLanguageVersionsCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `GlobalDeviceVersionId` | `GlobalDeviceVersionId` | itself |
| `GlobalLanguageAttributeType` | `GlobalLanguageAttributeTypes` | itself |
| `KeyCodeValue` | `string` | itself |
| `LanguageElementName` | `string` | itself |

### `SearchGlobalLanguageVersionsByIdCriteria`

Extends `AbstractSearchGlobalLanguageVersionsCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `GlobalLanguageVersionId` | `long` | itself |

### `SearchGlobalLanguageVersionsByIdsCriteria`

Extends `AbstractSearchGlobalLanguageVersionsCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `Ids` | `long[]` | itself |

### `SearchKeyCodeByValueCriteria`

Extends `AbstractSearchKeyCodeCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `KeyCodeValue` | `string` | itself |

### `SearchProtocolsByIdCriteria`

Extends `AbstractSearchProtocolsCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `ProtocolId` | `long` | itself |

### `SearchProtocolsByNameCriteria`

Extends `AbstractSearchProtocolsCriteria`.

| field | type | from |
|---|---|---|
| `MaxResults` | `int` | inherited |
| `SkipResults` | `int` | inherited |
| `ProtocolName` | `string` | itself |

## `UserButtonMapping`, 29 contracts

### `AbstractButtonAction`

Extended by 8: `ButtonActivityAction`, `ButtonChannelAction`, `ButtonClientAction`, `ButtonCommandAction`, `ButtonDelayAction`, `ButtonHomeControlAction`, `ButtonProgramAction`, `ButtonSequenceAction`.

| field | type | from |
|---|---|---|
| `EventType` | `int` | itself |
| `Id` | `long` | itself |
| `Order` | `int` | itself |

### `AbstractButtonMap`

Extended by 3: `ActivityButtonMap`, `DeviceButtonMap`, `RootButtonMap`.

| field | type | from |
|---|---|---|
| `ButtonMapId` | `ButtonMapId` | itself |
| `ButtonMapIdentifier` | `string` | itself |
| `ButtonMapSurfaceId` | `SurfaceId` | itself |
| `Buttons` | `AbstractRemoteButton[]` | itself |
| `DateModified` | `DateTime` | itself |
| `RemoteId` | `RemoteId` | itself |
| `Sequences` | `Sequence[]` | itself |
| `SurfaceId` | `SurfaceId` | itself |

### `AbstractRemoteButton`

Extended by 4: `GestureRemoteButton`, `HardRemoteButton`, `SoftRemoteButton`, `VoiceRemoteButton`.

| field | type | from |
|---|---|---|
| `ButtonAction` | `AbstractButtonAction` | itself |
| `ButtonDoublePressAction` | `AbstractButtonAction` | itself |
| `ButtonId` | `long` | itself |
| `ButtonLongPressAction` | `AbstractButtonAction` | itself |
| `ButtonState` | `ButtonState` | itself |
| `FunctionGroupType` | `FunctionGroupType` | itself |

### `ActivityButtonMap`

Extends `AbstractButtonMap`.

| field | type | from |
|---|---|---|
| `ButtonMapId` | `ButtonMapId` | inherited |
| `ButtonMapIdentifier` | `string` | inherited |
| `ButtonMapSurfaceId` | `SurfaceId` | inherited |
| `Buttons` | `AbstractRemoteButton[]` | inherited |
| `DateModified` | `DateTime` | inherited |
| `RemoteId` | `RemoteId` | inherited |
| `Sequences` | `Sequence[]` | inherited |
| `SurfaceId` | `SurfaceId` | inherited |
| `ActivityId` | `ActivityId` | itself |

### `ActivityChangeRequest`

| field | type | from |
|---|---|---|
| `AccountId` | `AccountId` | itself |
| `ActivityIds` | `ActivityId[]` | itself |
| `AffectedRolePlayingDeviceIds` | `Dictionary<ActivityId, ObservableCollection<DeviceId>>` | itself |
| `ParticipatingDeviceIds` | `Dictionary<ActivityId, ObservableCollection<DeviceId>>` | itself |
| `TextEntryRoleEffectedActivities` | `ActivityId[]` | itself |

### `ActivityChangeResponse`

| field | type | from |
|---|---|---|
| `Status` | `int` | itself |

### `ButtonActivityAction`

Extends `AbstractButtonAction`.

| field | type | from |
|---|---|---|
| `EventType` | `int` | inherited |
| `Id` | `long` | inherited |
| `Order` | `int` | inherited |
| `ActivityId` | `ActivityId` | itself |

### `ButtonChannelAction`

Extends `AbstractButtonAction`.

| field | type | from |
|---|---|---|
| `EventType` | `int` | inherited |
| `Id` | `long` | inherited |
| `Order` | `int` | inherited |
| `ChannelNumber` | `string` | itself |
| `DeviceId` | `DeviceId` | itself |

### `ButtonClientAction`

Extends `AbstractButtonAction`.

| field | type | from |
|---|---|---|
| `EventType` | `int` | inherited |
| `Id` | `long` | inherited |
| `Order` | `int` | inherited |
| `ActionName` | `string` | itself |

### `ButtonCommandAction`

Extends `AbstractButtonAction`.

| field | type | from |
|---|---|---|
| `EventType` | `int` | inherited |
| `Id` | `long` | inherited |
| `Order` | `int` | inherited |
| `CommandName` | `string` | itself |
| `DeviceId` | `DeviceId` | itself |
| `FunctionId` | `FunctionId` | itself |

### `ButtonDelayAction`

Extends `AbstractButtonAction`.

| field | type | from |
|---|---|---|
| `EventType` | `int` | inherited |
| `Id` | `long` | inherited |
| `Order` | `int` | inherited |
| `Duration` | `int` | itself |

### `ButtonHomeControlAction`

Extends `AbstractButtonAction`.

| field | type | from |
|---|---|---|
| `EventType` | `int` | inherited |
| `Id` | `long` | inherited |
| `Order` | `int` | inherited |
| `ChangeType` | `string` | itself |
| `DeviceId` | `string` | itself |
| `GroupId` | `string` | itself |
| `Property` | `string` | itself |
| `SubDeviceId` | `string` | itself |
| `Targets` | `HomeControlTarget[]` | itself |
| `Value` | `string` | itself |

### `ButtonProgramAction`

Extends `AbstractButtonAction`.

| field | type | from |
|---|---|---|
| `EventType` | `int` | inherited |
| `Id` | `long` | inherited |
| `Order` | `int` | inherited |
| `ProgramId` | `string` | itself |
| `Rule` | `string` | itself |

### `ButtonSequenceAction`

Extends `AbstractButtonAction`.

| field | type | from |
|---|---|---|
| `EventType` | `int` | inherited |
| `Id` | `long` | inherited |
| `Order` | `int` | inherited |
| `SequenceId` | `long` | itself |

### `ButtonState`

An enumeration of 5 values.

Values: `Default`, `Original`, `Added`, `Modified`, `Deleted`.

### `DeviceButtonMap`

Extends `AbstractButtonMap`.

| field | type | from |
|---|---|---|
| `ButtonMapId` | `ButtonMapId` | inherited |
| `ButtonMapIdentifier` | `string` | inherited |
| `ButtonMapSurfaceId` | `SurfaceId` | inherited |
| `Buttons` | `AbstractRemoteButton[]` | inherited |
| `DateModified` | `DateTime` | inherited |
| `RemoteId` | `RemoteId` | inherited |
| `Sequences` | `Sequence[]` | inherited |
| `SurfaceId` | `SurfaceId` | inherited |
| `DeviceId` | `DeviceId` | itself |

### `GestureRemoteButton`

Extends `AbstractRemoteButton`.

| field | type | from |
|---|---|---|
| `ButtonAction` | `AbstractButtonAction` | inherited |
| `ButtonDoublePressAction` | `AbstractButtonAction` | inherited |
| `ButtonId` | `long` | inherited |
| `ButtonLongPressAction` | `AbstractButtonAction` | inherited |
| `ButtonState` | `ButtonState` | inherited |
| `FunctionGroupType` | `FunctionGroupType` | inherited |
| `ButtonImageKey` | `string` | itself |
| `ButtonKey` | `string` | itself |

### `HardRemoteButton`

Extends `AbstractRemoteButton`. Extended by 2: `KeyboardButton`, `SlideOutKeypadButton`.

| field | type | from |
|---|---|---|
| `ButtonAction` | `AbstractButtonAction` | inherited |
| `ButtonDoublePressAction` | `AbstractButtonAction` | inherited |
| `ButtonId` | `long` | inherited |
| `ButtonLongPressAction` | `AbstractButtonAction` | inherited |
| `ButtonState` | `ButtonState` | inherited |
| `FunctionGroupType` | `FunctionGroupType` | inherited |
| `ButtonKey` | `string` | itself |

### `HomeControlTarget`

| field | type | from |
|---|---|---|
| `ChangeType` | `string` | itself |
| `DeviceId` | `string` | itself |
| `GroupId` | `string` | itself |
| `Id` | `string` | itself |
| `IsPositive` | `bool` | itself |
| `NegativeValue` | `string` | itself |
| `PositiveValue` | `string` | itself |
| `Property` | `string` | itself |
| `SubDeviceId` | `string` | itself |

### `KeyboardButton`

Extends `HardRemoteButton`.

| field | type | from |
|---|---|---|
| `ButtonAction` | `AbstractButtonAction` | inherited |
| `ButtonDoublePressAction` | `AbstractButtonAction` | inherited |
| `ButtonId` | `long` | inherited |
| `ButtonLongPressAction` | `AbstractButtonAction` | inherited |
| `ButtonState` | `ButtonState` | inherited |
| `FunctionGroupType` | `FunctionGroupType` | inherited |
| `ButtonKey` | `string` | inherited |
| `ActiveKeys` | `string[]` | itself |
| `HasPassThroughSupport` | `bool` | itself |

### `MenuItem`

| field | type | from |
|---|---|---|
| `IndexInMenu` | `int` | itself |
| `MenuName` | `string` | itself |

### `RegenerateButtonMapsRequest`

| field | type | from |
|---|---|---|
| `AccountId` | `AccountId` | itself |
| `ActivityIds` | `ActivityId[]` | itself |
| `DeviceIds` | `DeviceId[]` | itself |
| `RemoteId` | `RemoteId` | itself |
| `SkinId` | `long` | itself |
| `SurfaceId` | `long` | itself |
| `Workflow` | `Workflow` | itself |

### `RegenerateButtonMapsResponse`

| field | type | from |
|---|---|---|
| `Status` | `int` | itself |

### `RootButtonMap`

Extends `AbstractButtonMap`. No fields of its own.

| field | type | from |
|---|---|---|
| `ButtonMapId` | `ButtonMapId` | inherited |
| `ButtonMapIdentifier` | `string` | inherited |
| `ButtonMapSurfaceId` | `SurfaceId` | inherited |
| `Buttons` | `AbstractRemoteButton[]` | inherited |
| `DateModified` | `DateTime` | inherited |
| `RemoteId` | `RemoteId` | inherited |
| `Sequences` | `Sequence[]` | inherited |
| `SurfaceId` | `SurfaceId` | inherited |

### `Sequence`

| field | type | from |
|---|---|---|
| `Actions` | `AbstractButtonAction[]` | itself |
| `Name` | `string` | itself |
| `SequenceId` | `long` | itself |

### `SlideOutKeypadButton`

Extends `HardRemoteButton`. No fields of its own.

| field | type | from |
|---|---|---|
| `ButtonAction` | `AbstractButtonAction` | inherited |
| `ButtonDoublePressAction` | `AbstractButtonAction` | inherited |
| `ButtonId` | `long` | inherited |
| `ButtonLongPressAction` | `AbstractButtonAction` | inherited |
| `ButtonState` | `ButtonState` | inherited |
| `FunctionGroupType` | `FunctionGroupType` | inherited |
| `ButtonKey` | `string` | inherited |

### `SoftRemoteButton`

Extends `AbstractRemoteButton`.

| field | type | from |
|---|---|---|
| `ButtonAction` | `AbstractButtonAction` | inherited |
| `ButtonDoublePressAction` | `AbstractButtonAction` | inherited |
| `ButtonId` | `long` | inherited |
| `ButtonLongPressAction` | `AbstractButtonAction` | inherited |
| `ButtonState` | `ButtonState` | inherited |
| `FunctionGroupType` | `FunctionGroupType` | inherited |
| `ButtonImageKey` | `string` | itself |
| `ButtonImagePath` | `string` | itself |
| `ImageId` | `ButtonImageId` | itself |
| `MenuItem` | `MenuItem` | itself |
| `TextOnRemote` | `string` | itself |

### `UserActivityModeMappingInfo`

| field | type | from |
|---|---|---|
| `AccountId` | `AccountId` | itself |
| `ActivityId` | `ActivityId` | itself |
| `Mode` | `DeviceModeType` | itself |

### `VoiceRemoteButton`

Extends `AbstractRemoteButton`.

| field | type | from |
|---|---|---|
| `ButtonAction` | `AbstractButtonAction` | inherited |
| `ButtonDoublePressAction` | `AbstractButtonAction` | inherited |
| `ButtonId` | `long` | inherited |
| `ButtonLongPressAction` | `AbstractButtonAction` | inherited |
| `ButtonState` | `ButtonState` | inherited |
| `FunctionGroupType` | `FunctionGroupType` | inherited |
| `ButtonKey` | `string` | itself |

## `Account`, 26 contracts

### `Account`

| field | type | from |
|---|---|---|
| `AccountTypeId` | `int` | itself |
| `AccountUri` | `Uri` | itself |
| `Activities` | `Activity[]` | itself |
| `ConfigVersion` | `string` | itself |
| `CreateDate` | `DateTime` | itself |
| `Devices` | `Device[]` | itself |
| `EmailToken` | `string` | itself |
| `HouseholdId` | `HouseholdId` | itself |
| `Id` | `AccountId` | itself |
| `IsRemoved` | `bool` | itself |
| `LastSetupRating` | `byte` | itself |
| `Latitude` | `double` | itself |
| `Longitude` | `double` | itself |
| `OriginalProductIdentifier` | `string` | itself |
| `ProductIdentifier` | `string` | itself |
| `Properties` | `AccountProperties` | itself |
| `Remotes` | `Remote[]` | itself |
| `SetupSession` | `SetupSession` | itself |
| `Surfaces` | `Surface[]` | itself |
| `TimeZone` | `string` | itself |
| `UserTimeZone` | `string` | itself |

### `AccountProperties`

| field | type | from |
|---|---|---|
| `AnonymizedEmail` | `string` | itself |
| `ConfigVersion` | `string` | itself |
| `ContactMe` | `bool` | itself |
| `CountryType` | `CountryType` | itself |
| `Email` | `string` | itself |
| `FirstName` | `string` | itself |
| `IsPolicyAccepted` | `bool` | itself |
| `LastName` | `string` | itself |
| `Latitude` | `double` | itself |
| `Longitude` | `double` | itself |
| `RemoteLanguage` | `string` | itself |
| `TimeZone` | `string` | itself |
| `UserKey` | `string` | itself |
| `UserTimeZone` | `string` | itself |
| `ZipCode` | `string` | itself |

### `ChangeClaimRequest`

| field | type | from |
|---|---|---|
| `country` | `string` | itself |
| `email` | `string` | itself |
| `firstname` | `string` | itself |
| `lastname` | `string` | itself |

### `CreateAccountRequest`

| field | type | from |
|---|---|---|
| `ContactMe` | `bool` | itself |
| `CountryType` | `CountryType` | itself |
| `Email` | `string` | itself |
| `FirstName` | `string` | itself |
| `IsPolicyAccepted` | `bool` | itself |
| `IsSocialProviderCall` | `bool` | itself |
| `Language` | `string` | itself |
| `LastName` | `string` | itself |
| `Latitude` | `double` | itself |
| `Longitude` | `double` | itself |
| `Password` | `string` | itself |
| `PasswordAnswer` | `string` | itself |
| `PasswordQuestion` | `string` | itself |
| `SetupSessionClient` | `string` | itself |
| `SetupSessionType` | `string` | itself |
| `TimeZone` | `string` | itself |
| `UserTimeZone` | `string` | itself |

### `CreateAccountResponse`

| field | type | from |
|---|---|---|
| `Account` | `Account` | itself |
| `Result` | `CreateAccountResult` | itself |

### `CreateAccountResult`

An enumeration of 4 values.

Values: `Failed`, `Successful`, `DuplicateEmail`, `InvalidPasswordLength`.

### `Dongle`

| field | type | from |
|---|---|---|
| `Id` | `long` | itself |
| `Index` | `short` | itself |
| `RFID` | `long` | itself |

### `EmailPreference`

| field | type | from |
|---|---|---|
| `EmailType` | `int` | itself |
| `Status` | `bool` | itself |

### `EmailPreferenceResponse`

| field | type | from |
|---|---|---|
| `AccountId` | `string` | itself |
| `Preferences` | `EmailPreference[]` | itself |

### `Household`

| field | type | from |
|---|---|---|
| `Accounts` | `Account[]` | itself |
| `DefaultLanguage` | `string` | itself |
| `DefaultUserProfileUri` | `Uri` | itself |
| `Id` | `HouseholdId` | itself |
| `Name` | `string` | itself |
| `Remotes` | `Remote[]` | itself |
| `Rooms` | `Room[]` | itself |

### `Locale`

| field | type | from |
|---|---|---|
| `Location` | `Location` | itself |
| `TimeZone` | `string` | itself |
| `UserTimeZone` | `string` | itself |

### `Location`

| field | type | from |
|---|---|---|
| `Latitude` | `double` | itself |
| `Longitude` | `double` | itself |

### `Remote`

| field | type | from |
|---|---|---|
| `ComputedProductSerial` | `string` | itself |
| `DateCreated` | `string` | itself |
| `Dongles` | `Dongle[]` | itself |
| `FirstConnectDate` | `DateTime` | itself |
| `FirstSyncDate` | `string` | itself |
| `GlobalRemoteId` | `long` | itself |
| `GlobalRemoteRefurbishedDate` | `DateTime` | itself |
| `GlobalRemoteRefurbishedStatus` | `short` | itself |
| `GlobalRemoteSkinId` | `int` | itself |
| `GlobalRemoteStatus` | `short` | itself |
| `HubRemoteId` | `long` | itself |
| `Id` | `RemoteId` | itself |
| `IsAcceptLicense` | `bool` | itself |
| `IsActiveRemote` | `bool` | itself |
| `IsGlobalRemoteLocked` | `bool` | itself |
| `IsProSKU` | `bool` | itself |
| `IsSyncRequired` | `bool` | itself |
| `JabberId` | `string` | itself |
| `KeyboardLayout` | `KeyboardLayoutType` | itself |
| `KeyboardLocale` | `string` | itself |
| `LastProductIdentifier` | `string` | itself |
| `LastSyncDate` | `string` | itself |
| `LogitechProductId` | `long` | itself |
| `LogitechSerial` | `string` | itself |
| `Mode` | `int` | itself |
| `OriginalProductIdentifier` | `string` | itself |
| `RFEquadID` | `string` | itself |
| `RFID` | `string` | itself |
| `RemoteProperties` | `RemoteProperties` | itself |
| `SerialNumber` | `string` | itself |
| `SkinId` | `int` | itself |
| `Surfaces` | `Surface[]` | itself |

### `RemoteContext`

| field | type | from |
|---|---|---|
| `AccountId` | `AccountId` | itself |
| `AccountUri` | `Uri` | itself |
| `ConfigVersion` | `string` | itself |
| `CountryCode` | `string` | itself |
| `GlobalRemoteUri` | `Uri` | itself |
| `HouseholdDeviceProfileUri` | `Uri` | itself |
| `HouseholdId` | `HouseholdId` | itself |
| `HouseholdUserProfileUri` | `Uri` | itself |
| `InstallerId` | `string` | itself |
| `KeyboardLocale` | `string` | itself |
| `Language` | `string` | itself |
| `Locale` | `Locale` | itself |
| `Mode` | `int` | itself |
| `Name` | `string` | itself |
| `RemoteJid` | `string` | itself |
| `SetupSession` | `SetupSession` | itself |

### `RemoteInfo`

| field | type | from |
|---|---|---|
| `AccountId` | `AccountId` | itself |
| `KeyPadLayout` | `KeyboardLayoutType` | itself |
| `LatestFirmwareVersion` | `string` | itself |
| `Mode` | `int` | itself |
| `Name` | `string` | itself |
| `ProductId` | `ProductId` | itself |
| `ProductIdentifier` | `string` | itself |
| `RFEquadID` | `string` | itself |
| `RFID` | `string` | itself |
| `SerialNumber` | `string` | itself |
| `SkinId` | `int` | itself |
| `UsbPid` | `string` | itself |
| `UsbVid` | `string` | itself |

### `RemoteProperties`

| field | type | from |
|---|---|---|
| `GlobalRemoteRefurbishedDate` | `DateTime` | itself |
| `GlobalRemoteRefurbishedStatus` | `short` | itself |
| `IsActiveRemote` | `bool` | itself |
| `IsLocked` | `bool` | itself |
| `KeyboardLocale` | `string` | itself |
| `RemoteName` | `string` | itself |
| `Status` | `short` | itself |

### `RemoteSetting`

| field | type | from |
|---|---|---|
| `DefaultValue` | `string` | itself |
| `MaxCount` | `int` | itself |
| `MinCount` | `int` | itself |
| `Name` | `string` | itself |
| `SettingId` | `int` | itself |
| `Values` | `string[]` | itself |

### `RemoteSettings`

| field | type | from |
|---|---|---|
| `DefaultImageBucketUri` | `Uri` | itself |
| `RemoteName` | `string` | itself |
| `Settings` | `RemoteSetting[]` | itself |
| `UserImageBucketUri` | `Uri` | itself |

### `Room`

| field | type | from |
|---|---|---|
| `Id` | `RoomId` | itself |
| `Name` | `string` | itself |

### `SaveRemotePropertiesResult`

An enumeration of 2 values.

Values: `Failed`, `Successful`.

### `SaveRemoteSettingsResult`

An enumeration of 2 values.

Values: `Failed`, `Successful`.

### `SearchResult`

| field | type | from |
|---|---|---|
| `Accounts` | `Account[]` | itself |
| `ErrorCode` | `int` | itself |
| `Token` | `string` | itself |

### `SetupSession`

| field | type | from |
|---|---|---|
| `Client` | `string` | itself |
| `IsStale` | `bool` | itself |
| `SetupType` | `string` | itself |
| `Type` | `long` | itself |

### `SocialIdentity`

| field | type | from |
|---|---|---|
| `Provider` | `string` | itself |
| `IdToken` | `string` | itself |
| `AccessToken` | `string` | itself |

### `Surface`

| field | type | from |
|---|---|---|
| `EquadId` | `long` | itself |
| `Id` | `SurfaceId` | itself |
| `RemoteId` | `long` | itself |
| `RfSurfaceId` | `long` | itself |
| `SkinId` | `int` | itself |

### `UpdateUserPropertiesRequest`

| field | type | from |
|---|---|---|
| `access_token` | `string` | itself |
| `household_id` | `long` | itself |
| `id_token` | `string` | itself |
| `users` | `User[]` | itself |

## `Infrared`, 18 contracts

### `Atom`

| field | type | from |
|---|---|---|
| `MaxValue` | `long` | itself |
| `MinValue` | `long` | itself |
| `Type` | `AtomType` | itself |
| `Value` | `long` | itself |

### `AtomType`

An enumeration of 2 values.

Values: `Space`, `Pulse`.

### `AttributeType`

An enumeration of 4 values.

Values: `LockedByAdmin`, `IgnoreDetectOptions`, `Retired`, `Reviewed`.

### `BitType`

An enumeration of 32 values.

Values: `Zero`, `One`, `Two`, `Three`, `Four`, `Five`, `Six`, `Seven`, `Eight`, `Nine`, `A`, `B`, `C`, `D`, `E`, `F`, `B16`, `B17`, `B18`, `B19`, `B20`, `B21`, `B22`, `B23`, `B24`, `B25`, `B26`, `B27`, `B28`, `B29`, `B30`, `B31`.

### `CodeSegment`

Extends `Segment`.

| field | type | from |
|---|---|---|
| `Name` | `string` | inherited |
| `Atoms` | `Atom[]` | itself |
| `Header` | `Atom[]` | itself |
| `Payload` | `Payload` | itself |
| `TotalLength` | `long` | itself |
| `Trailer` | `Atom[]` | itself |

### `EncodingType`

An enumeration of 5 values.

Values: `BitEncoding`, `BiphasicEncoding`, `QuadEncoding`, `HexEncoding`, `ByteEncoding`.

### `FlagType`

An enumeration of 4 values.

Values: `HighBitRate`, `NoCarrier`, `HighFrequency`, `BitToggle`.

### `IREncoding`

| field | type | from |
|---|---|---|
| `Atoms` | `Atom[]` | itself |
| `BitType` | `BitType` | itself |

### `IRProtocolSendingTypeContract`

An enumeration of 5 values.

Values: `Normal`, `NoCarrier`, `HighFrequency`, `IRDA`, `RadioFrequency`.

### `IRSegment`

Extends `Segment`.

| field | type | from |
|---|---|---|
| `Name` | `string` | inherited |
| `Header` | `Atom[]` | itself |
| `Payload` | `Payload` | itself |
| `TotalLength` | `long` | itself |
| `Trailer` | `Atom[]` | itself |

### `IrProtocol`

Extends `AbstractProtocol`.

| field | type | from |
|---|---|---|
| `Id` | `ProtocolId` | inherited |
| `Name` | `string` | inherited |
| `Attributes` | `AttributeType[]` | itself |
| `CarrierFrequency` | `long` | itself |
| `CodeSegments` | `CodeSegment[]` | itself |
| `Flags` | `FlagType[]` | itself |
| `HoldDelay` | `long` | itself |
| `HoldMinimumRepeats` | `long` | itself |
| `IRSegments` | `IRSegment[]` | itself |
| `IsFullSequence` | `bool` | itself |
| `IsPadded` | `bool` | itself |
| `IsPublic` | `bool` | itself |
| `KeyCode` | `ParsedKeyCode` | itself |
| `NumberOfLinkedLanguage` | `long` | itself |
| `PressMinimumRepeats` | `long` | itself |
| `Rating` | `long` | itself |
| `RelatedProtocols` | `ProtocolRelation[]` | itself |
| `SendingType` | `IRProtocolSendingTypeContract` | itself |
| `Status` | `string` | itself |

### `KeyCodeElement`

| field | type | from |
|---|---|---|
| `SegmentName` | `string` | itself |
| `SegmentType` | `SegmentType` | itself |

### `ParsedKeyCode`

| field | type | from |
|---|---|---|
| `Finish` | `KeyCodeElement[]` | itself |
| `Repeat` | `KeyCodeElement[]` | itself |
| `Start` | `KeyCodeElement[]` | itself |

### `Payload`

| field | type | from |
|---|---|---|
| `EncodingType` | `EncodingType` | itself |
| `Encodings` | `IREncoding[]` | itself |
| `NumberOfBits` | `long` | itself |
| `ToggleBit` | `long` | itself |

### `ProtocolRelation`

| field | type | from |
|---|---|---|
| `ProtocolName` | `string` | itself |
| `RelationType` | `RelationType` | itself |

### `RelationType`

An enumeration of 7 values.

Values: `VerySimilarTo`, `ModeratelySimilarTo`, `PromotedInFavorOf`, `MadeObsoleteFor`, `IsPrototypeOf`, `HasPrototype`, `Overlapping`.

### `Segment`

Extended by 2: `CodeSegment`, `IRSegment`.

| field | type | from |
|---|---|---|
| `Name` | `string` | itself |

### `SegmentType`

An enumeration of 2 values.

Values: `IRSegment`, `CodeSegment`.

## `Operation`, 17 contracts

### `AddCommandOperation`

Extends `CreateOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `ReturnIdAsKey` | `object` | inherited |
| `ReturnObjectAsKey` | `object` | inherited |
| `TemporaryId` | `object` | inherited |
| `DeviceId` | `DeviceId` | itself |
| `KeyCode` | `string` | itself |
| `Name` | `string` | itself |
| `RawInfrared` | `string` | itself |

### `AddDeviceBySearchResultOperation`

Extends `AddDeviceOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `ReturnIdAsKey` | `object` | inherited |
| `ReturnObjectAsKey` | `object` | inherited |
| `TemporaryId` | `object` | inherited |
| `ControlPort` | `int` | inherited |
| `DeviceClassification` | `DeviceCategory` | inherited |
| `DeviceName` | `string` | inherited |
| `HouseholdAccount` | `HouseholdId` | inherited |
| `IsScartCableSupported` | `bool` | inherited |
| `SetupState` | `int` | inherited |
| `State` | `int` | inherited |
| `Transport` | `int` | inherited |
| `AutoDetectedDeviceClass` | `string` | itself |
| `AutoDetectedDeviceId` | `string` | itself |
| `AutoDetectedDeviceManufacturer` | `string` | itself |
| `AutoDetectedDeviceModel` | `string` | itself |
| `AutoDetectedDeviceName` | `string` | itself |
| `AutoDetectedDeviceUSN` | `string` | itself |
| `BTAddress` | `string` | itself |
| `Match` | `PublicDeviceSearchMatch` | itself |
| `PrivateAddTypeUsed` | `PrivateAddType` | itself |
| `ParentDeviceId` | `long` | itself |
| `GroupName` | `string` | itself |

### `AddDeviceOperation`

Extends `CreateOperation`. Extended by 2: `AddDeviceBySearchResultOperation`, `AddNewDeviceOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `ReturnIdAsKey` | `object` | inherited |
| `ReturnObjectAsKey` | `object` | inherited |
| `TemporaryId` | `object` | inherited |
| `ControlPort` | `int` | itself |
| `DeviceClassification` | `DeviceCategory` | itself |
| `DeviceName` | `string` | itself |
| `HouseholdAccount` | `HouseholdId` | itself |
| `IsScartCableSupported` | `bool` | itself |
| `SetupState` | `int` | itself |
| `State` | `int` | itself |
| `Transport` | `int` | itself |

### `AddNewDeviceOperation`

Extends `AddDeviceOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `ReturnIdAsKey` | `object` | inherited |
| `ReturnObjectAsKey` | `object` | inherited |
| `TemporaryId` | `object` | inherited |
| `ControlPort` | `int` | inherited |
| `DeviceClassification` | `DeviceCategory` | inherited |
| `DeviceName` | `string` | inherited |
| `HouseholdAccount` | `HouseholdId` | inherited |
| `IsScartCableSupported` | `bool` | inherited |
| `SetupState` | `int` | inherited |
| `State` | `int` | inherited |
| `Transport` | `int` | inherited |
| `CharacterizationType` | `DeviceCharacterizationType` | itself |
| `DeviceType` | `DeviceType` | itself |
| `Manufacturer` | `string` | itself |
| `ModelName` | `string` | itself |
| `PrivateAddTypeUsed` | `PrivateAddType` | itself |
| `Properties` | `AbstractPropertyValue[]` | itself |

### `CreateOperation`

Extends `Operation`. Extended by 3: `AddCommandOperation`, `AddDeviceOperation`, `GroupCommandOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `ReturnIdAsKey` | `object` | itself |
| `ReturnObjectAsKey` | `object` | itself |
| `TemporaryId` | `object` | itself |

### `DeleteCommandOperation`

Extends `DeleteOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `ObjectId` | `AbstractId` | inherited |
| `DeviceId` | `DeviceId` | itself |
| `LanguageElementIds` | `long[]` | itself |

### `DeleteOperation`

Extends `Operation`. Extended by 2: `DeleteCommandOperation`, `DeleteUserDeviceOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `ObjectId` | `AbstractId` | itself |

### `DeleteUserDeviceOperation`

Extends `DeleteOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `ObjectId` | `AbstractId` | inherited |
| `DeviceId` | `DeviceId` | itself |

### `GroupCommandOperation`

Extends `CreateOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `ReturnIdAsKey` | `object` | inherited |
| `ReturnObjectAsKey` | `object` | inherited |
| `TemporaryId` | `object` | inherited |
| `AddLanguage` | `AddCommandOperation[]` | itself |
| `DeviceId` | `DeviceId` | itself |

### `Operation`

Extended by 4: `CreateOperation`, `DeleteOperation`, `OperationBag`, `UpdateOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | itself |

### `OperationBag`

Extends `Operation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `Items` | `Operation[]` | itself |

### `TransportTypeOperation`

| field | type | from |
|---|---|---|
| `AccountId` | `AccountId` | itself |
| `AdditionalControlType` | `ControlType` | itself |
| `DeviceId` | `DeviceId` | itself |
| `RegionalCharset` | `string` | itself |

### `UpdateDeviceNameOperation`

Extends `UpdateOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `Object` | `AbstractId` | inherited |
| `DeviceId` | `DeviceId` | itself |
| `DeviceName` | `string` | itself |

### `UpdateLanguageOperation`

Extends `UpdateOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `Object` | `AbstractId` | inherited |
| `DeviceId` | `DeviceId` | itself |
| `DeviceSetupState` | `int` | itself |
| `DeviceState` | `int` | itself |
| `GlobalLanguageVersionId` | `GlobalLanguageVersionId` | itself |
| `RequiredCommands` | `string[]` | itself |

### `UpdateOperation`

Extends `Operation`. Extended by 4: `UpdateDeviceNameOperation`, `UpdateLanguageOperation`, `UpdateScartCableOperation`, `UpdateUserDeviceOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `Object` | `AbstractId` | itself |

### `UpdateScartCableOperation`

Extends `UpdateOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `Object` | `AbstractId` | inherited |
| `DeviceId` | `DeviceId` | itself |
| `IsScartCableSupported` | `bool` | itself |

### `UpdateUserDeviceOperation`

Extends `UpdateOperation`.

| field | type | from |
|---|---|---|
| `ParentAccount` | `AccountId` | inherited |
| `Object` | `AbstractId` | inherited |
| `Device` | `Device` | itself |
| `RegionalCharset` | `string` | itself |

## `DataContract`, 16 contracts

### `ButtonDefinition`

| field | type | from |
|---|---|---|
| `ButtonKey` | `string` | itself |
| `ButtonType` | `ButtonDefinitionType` | itself |

### `ButtonDefinitionType`

An enumeration of 5 values.

Values: `NonModifiableButton`, `FavoriteChannelButton`, `StandardButton`, `QuickPowerButton`, `ModeButton`.

### `CompilerArchitecture`

| field | type | from |
|---|---|---|
| `Architecture` | `int` | itself |
| `CompilerArchitectureId` | `int` | itself |
| `DefaultSkinId` | `int` | itself |
| `Flash` | `string` | itself |
| `Protocol` | `int` | itself |
| `RegionID` | `int` | itself |
| `SoftwareType` | `int` | itself |
| `Type` | `CompilerArchitectureType` | itself |

### `CustomerSupportDetail`

| field | type | from |
|---|---|---|
| `AccountId` | `AccountId` | itself |
| `CountryType` | `CountryType` | itself |
| `FirstConnectDate` | `DateTime` | itself |
| `IsAgreeLicense` | `bool` | itself |
| `IsRefurbished` | `bool` | itself |
| `Region` | `Region` | itself |
| `SkinId` | `int` | itself |

### `CustomerSupportPolicy`

| field | type | from |
|---|---|---|
| `ChatSupportRemainingDays` | `int` | itself |
| `ChatSupportStatus` | `bool` | itself |
| `EmailSupportRemainingDays` | `int` | itself |
| `EmailSupportStatus` | `bool` | itself |
| `HardwareSupportRemainingDays` | `int` | itself |
| `HardwareSupportStatus` | `bool` | itself |
| `IsAmr` | `bool` | itself |
| `PhoneSupportRemainingDays` | `int` | itself |
| `PhoneSupportStatus` | `bool` | itself |
| `SkinId` | `int` | itself |
| `VendorSerial` | `VendorSerial` | itself |
| `Discount` | `string` | itself |
| `EOLDate` | `string` | itself |
| `PromoCode` | `string` | itself |
| `WarrantyFormLink` | `string` | itself |

### `Display`

| field | type | from |
|---|---|---|
| `ColorDisplay` | `bool` | itself |
| `DisplayId` | `int` | itself |
| `Height` | `int` | itself |
| `NumColumns` | `int` | itself |
| `NumRows` | `int` | itself |
| `Width` | `int` | itself |

### `HarmonyProduct`

| field | type | from |
|---|---|---|
| `IsProSKUEnabled` | `bool` | itself |
| `DisplayName` | `string` | itself |
| `DisplayPriority` | `int` | itself |
| `Name` | `string` | itself |
| `ProSKUDisplayName` | `string` | itself |
| `ProductFamily` | `string` | itself |
| `ProductId` | `int` | itself |
| `ProductIdentifier` | `string` | itself |
| `SkinId` | `int` | itself |

### `Keyboard`

| field | type | from |
|---|---|---|
| `KeyboardId` | `int` | itself |
| `KeyboardLayout` | `KeyboardLayout` | itself |
| `KeyboardLayoutId` | `int` | itself |
| `ProductId` | `int` | itself |

### `KeyboardLayout`

| field | type | from |
|---|---|---|
| `KeyboardLayoutId` | `int` | itself |
| `Name` | `string` | itself |

### `Manufacturer`

| field | type | from |
|---|---|---|
| `ManufacturerId` | `int` | itself |
| `Name` | `string` | itself |

### `Product`

| field | type | from |
|---|---|---|
| `CompilerArchitecture` | `CompilerArchitecture` | itself |
| `DefaultMode` | `int` | itself |
| `DisplayName` | `string` | itself |
| `Displays` | `Display[]` | itself |
| `IsAlwaysConnected` | `bool` | itself |
| `IsEnabled` | `bool` | itself |
| `IsHosted` | `bool` | itself |
| `IsStaticLocation` | `bool` | itself |
| `Keyboards` | `Keyboard[]` | itself |
| `Manufacturer` | `Manufacturer` | itself |
| `MaxActivities` | `int` | itself |
| `MaxDevicesPerAccount` | `int` | itself |
| `MaxDevicesPerTimePeriod` | `int` | itself |
| `MaxFavoriteChannels` | `int` | itself |
| `MinutesPerTimePeriod` | `int` | itself |
| `Name` | `string` | itself |
| `NumOfAddDevice` | `int` | itself |
| `Pairings` | `Dictionary<int, string>` | itself |
| `ProSKUDisplayName` | `string` | itself |
| `ProductFamily` | `string` | itself |
| `ProductId` | `int` | itself |
| `ProductIdentifier` | `string` | itself |
| `ProductSettings` | `ProductSetting[]` | itself |
| `Region` | `Region` | itself |
| `SkinId` | `int` | itself |
| `SupportedCapabilities` | `ProductCapability[]` | itself |

### `ProductButtonList`

| field | type | from |
|---|---|---|
| `Buttons` | `ButtonDefinition[]` | itself |

### `ProductSetting`

| field | type | from |
|---|---|---|
| `DefaultValue` | `string` | itself |
| `MaxCount` | `int` | itself |
| `MinCount` | `int` | itself |
| `ProductId` | `int` | itself |
| `ProductSettingId` | `int` | itself |
| `Setting` | `Setting` | itself |

### `Setting`

| field | type | from |
|---|---|---|
| `Name` | `string` | itself |
| `SettingId` | `int` | itself |

### `VendorId`

An enumeration of 2 values.

Values: `Logitech`, `Dish`.

### `VendorSerial`

| field | type | from |
|---|---|---|
| `SerialNumber` | `string` | itself |
| `VendorId` | `VendorId` | itself |

## `UserFeature`, 16 contracts

### `AbstractIRAction`

Extended by 4: `IRDelayAction`, `IRDevAction`, `IRHoldAction`, `IRPressAction`.

| field | type | from |
|---|---|---|
| `ActionId` | `int` | itself |
| `Order` | `int` | itself |

### `ChannelTuningFeature1`

Extends `DeviceFeature`.

| field | type | from |
|---|---|---|
| `DateModified` | `DateTime` | inherited |
| `DeviceId` | `DeviceId` | inherited |
| `GlobalDeviceVersionId` | `GlobalDeviceVersionId` | inherited |
| `State` | `FeatureState` | inherited |
| `FinishActions` | `AbstractIRAction[]` | itself |
| `FixedDigits` | `int` | itself |
| `GreaterHundredActions` | `AbstractIRAction[]` | itself |
| `GreaterTenActions` | `AbstractIRAction[]` | itself |
| `StartActions` | `AbstractIRAction[]` | itself |

### `DeviceFeature`

Extended by 5: `ChannelTuningFeature1`, `InputFeature`, `InternalStateFeature`, `OutputFeature`, `PowerFeature`.

| field | type | from |
|---|---|---|
| `DateModified` | `DateTime` | itself |
| `DeviceId` | `DeviceId` | itself |
| `GlobalDeviceVersionId` | `GlobalDeviceVersionId` | itself |
| `State` | `FeatureState` | itself |

### `FeatureState`

An enumeration of 2 values.

Values: `NotCompleted`, `Completed`.

### `IRDelayAction`

Extends `AbstractIRAction`.

| field | type | from |
|---|---|---|
| `ActionId` | `int` | inherited |
| `Order` | `int` | inherited |
| `Delay` | `int` | itself |

### `IRDevAction`

Extends `AbstractIRAction`.

| field | type | from |
|---|---|---|
| `ActionId` | `int` | inherited |
| `Order` | `int` | inherited |
| `DevActionType` | `DevActionType` | itself |
| `StateName` | `string` | itself |
| `StateValue` | `string` | itself |

### `IRHoldAction`

Extends `AbstractIRAction`.

| field | type | from |
|---|---|---|
| `ActionId` | `int` | inherited |
| `Order` | `int` | inherited |
| `IRCommandName` | `string` | itself |

### `IRPressAction`

Extends `AbstractIRAction`.

| field | type | from |
|---|---|---|
| `ActionId` | `int` | inherited |
| `Order` | `int` | inherited |
| `Duration` | `int` | itself |
| `IRCommandName` | `string` | itself |

### `Input`

| field | type | from |
|---|---|---|
| `ActionId` | `int` | itself |
| `ActionName` | `string` | itself |
| `ActionSetTypeId` | `int` | itself |
| `Actions` | `AbstractIRAction[]` | itself |
| `DevActionType` | `int` | itself |
| `HasAdditionalActions` | `bool` | itself |
| `Id` | `long` | itself |
| `InputName` | `string` | itself |
| `InputOrder` | `int` | itself |
| `IsActiveInput` | `bool` | itself |
| `IsAutoSwitch` | `bool` | itself |
| `IsOnline` | `bool` | itself |
| `PressDuration` | `int` | itself |
| `StateName` | `string` | itself |
| `StateValue` | `string` | itself |

### `InputFeature`

Extends `DeviceFeature`.

| field | type | from |
|---|---|---|
| `DateModified` | `DateTime` | inherited |
| `DeviceId` | `DeviceId` | inherited |
| `GlobalDeviceVersionId` | `GlobalDeviceVersionId` | inherited |
| `State` | `FeatureState` | inherited |
| `CanSkipInputs` | `int` | itself |
| `DefaultInputDelay` | `int` | itself |
| `FinishActions` | `AbstractIRAction[]` | itself |
| `HasAdditionalActions` | `bool` | itself |
| `Id` | `long` | itself |
| `InputDelay` | `int` | itself |
| `InputType` | `InputType` | itself |
| `Inputs` | `Input[]` | itself |
| `IsActiveInput` | `bool` | itself |
| `NextActions` | `AbstractIRAction[]` | itself |
| `PreviousActions` | `AbstractIRAction[]` | itself |
| `StartActions` | `AbstractIRAction[]` | itself |

### `InternalStateFeature`

Extends `DeviceFeature`.

| field | type | from |
|---|---|---|
| `DateModified` | `DateTime` | inherited |
| `DeviceId` | `DeviceId` | inherited |
| `GlobalDeviceVersionId` | `GlobalDeviceVersionId` | inherited |
| `State` | `FeatureState` | inherited |
| `FinishActions` | `AbstractIRAction[]` | itself |
| `NextActions` | `AbstractIRAction[]` | itself |
| `PreviousActions` | `AbstractIRAction[]` | itself |
| `ResetActions` | `AbstractIRAction[]` | itself |
| `StartActions` | `AbstractIRAction[]` | itself |
| `StateName` | `string` | itself |
| `StateValues` | `StateValue[]` | itself |
| `ValueDelay` | `int` | itself |

### `Output`

| field | type | from |
|---|---|---|
| `Id` | `long` | itself |
| `IsActiveOutput` | `bool` | itself |
| `NoOfPorts` | `int` | itself |
| `OutputName` | `string` | itself |

### `OutputFeature`

Extends `DeviceFeature`.

| field | type | from |
|---|---|---|
| `DateModified` | `DateTime` | inherited |
| `DeviceId` | `DeviceId` | inherited |
| `GlobalDeviceVersionId` | `GlobalDeviceVersionId` | inherited |
| `State` | `FeatureState` | inherited |
| `Id` | `long` | itself |
| `Outputs` | `Output[]` | itself |
| `IsConfirmed` | `bool` | itself |

### `PowerFeature`

Extends `DeviceFeature`.

| field | type | from |
|---|---|---|
| `DateModified` | `DateTime` | inherited |
| `DeviceId` | `DeviceId` | inherited |
| `GlobalDeviceVersionId` | `GlobalDeviceVersionId` | inherited |
| `State` | `FeatureState` | inherited |
| `ConnectedAppPowerOnDelay` | `int` | itself |
| `DefaultPowerOnDelay` | `int` | itself |
| `HasAdditionalActions` | `bool` | itself |
| `Id` | `long` | itself |
| `IsPowerAlwaysOn` | `bool` | itself |
| `IsPoweredOnBetweenActivities` | `bool` | itself |
| `PowerOffActionId` | `int` | itself |
| `PowerOffActions` | `AbstractIRAction[]` | itself |
| `PowerOnActionId` | `int` | itself |
| `PowerOnActions` | `AbstractIRAction[]` | itself |
| `PowerOnDelay` | `int` | itself |
| `PowerOnResetActions` | `AbstractIRAction[]` | itself |
| `PowerOnResetInputName` | `string` | itself |
| `PowerToggleActionId` | `int` | itself |
| `PowerToggleActions` | `AbstractIRAction[]` | itself |
| `PowerTypeId` | `PowerType` | itself |

### `StateValue`

| field | type | from |
|---|---|---|
| `ActionSetType` | `GlobalStateValueActionSetType` | itself |
| `Actions` | `AbstractIRAction[]` | itself |
| `IsAutoSwitch` | `bool` | itself |
| `Order` | `int` | itself |
| `StateValueName` | `string` | itself |

### `UserInput`

| field | type | from |
|---|---|---|
| `ActionId` | `int` | itself |
| `ActionName` | `string` | itself |
| `ActionSetTypeId` | `int` | itself |
| `Actions` | `AbstractIRAction[]` | itself |
| `DevActionType` | `int` | itself |
| `HasAdditionalActions` | `bool` | itself |
| `Id` | `long` | itself |
| `InputName` | `string` | itself |
| `InputOrder` | `int` | itself |
| `IsActiveInput` | `bool` | itself |
| `IsAutoSwitch` | `bool` | itself |
| `IsOnline` | `bool` | itself |
| `PressDuration` | `int` | itself |
| `StateName` | `string` | itself |
| `StateValue` | `string` | itself |

## `GlobalLanguage`, 10 contracts

### `DeviceRemote`

| field | type | from |
|---|---|---|
| `Id` | `long` | itself |
| `Name` | `string` | itself |

### `GlobalLanguage`

| field | type | from |
|---|---|---|
| `Brand` | `Brands` | itself |
| `DeviceRemote` | `DeviceRemote` | itself |
| `GlobalLanguageElements` | `GlobalLanguageElement[]` | itself |
| `GlobalLanguageVersionAttributes` | `GlobalLanguageVersionAttribute[]` | itself |
| `Id` | `GlobalLanguageVersionId` | itself |
| `LanguageSource` | `GlobalLanguageSource` | itself |
| `LanguageType` | `GlobalLanguageType` | itself |
| `Manufacturer` | `Manufacturer` | itself |
| `MinRepeats` | `long` | itself |
| `Name` | `string` | itself |
| `VersionId` | `long` | itself |

### `GlobalLanguageAttributeTypes`

An enumeration of 19 values.

Values: `Retired`, `AllCorrectKeyCodes`, `HasFullCommandSet`, `HasAllCommandsOnTheRemote`, `NeedsReview`, `HasEmptyKeyCodes`, `ContainsIrrelevantCommands`, `SuitedForConfirmIR`, `CanBeAddedToAPublicDevice`, `AllCommandsConfirmedWithManufacturer`, `AllCommandsConfirmedWithCS`, `RLAllCommandsConfirmedWithUsersTaughtCommands`, `RLMissingMinimumCommands`, `RLMissingCommands`, `RLCertainCommandsNotConfirmedWithTaughtCommands`, `DSMinimumCommandsConfirmedByUsers`, `DSCertainCommandsNeedConfirmation`, `DSNoConfirmation`, `None`.

### `GlobalLanguageElement`

| field | type | from |
|---|---|---|
| `ButtonLabel` | `string` | itself |
| `GlobalLanguageElementFunction` | `GlobalLanguageElementFunction` | itself |
| `Id` | `long` | itself |
| `KeyCode` | `GlobalLanguageKeyCode` | itself |
| `Name` | `string` | itself |

### `GlobalLanguageElementFunction`

| field | type | from |
|---|---|---|
| `Description` | `string` | itself |
| `GlobalLanguageElementFunctionGroup` | `GlobalLanguageElementFunctionGroup` | itself |
| `Id` | `long` | itself |
| `Name` | `string` | itself |

### `GlobalLanguageElementFunctionGroup`

| field | type | from |
|---|---|---|
| `Id` | `long` | itself |
| `Name` | `string` | itself |

### `GlobalLanguageKeyCode`

| field | type | from |
|---|---|---|
| `AbstractProtocol` | `AbstractProtocol` | itself |
| `AbstractProtocolId` | `long` | itself |
| `Id` | `long` | itself |
| `Value` | `string` | itself |

### `GlobalLanguageSource`

An enumeration of 4 values.

Values: `Other`, `UserDevice`, `Manufacturer`, `ThirdParty`.

### `GlobalLanguageType`

An enumeration of 5 values.

Values: `Other`, `RemoteLanguage`, `DeviceSpecificLanguage`, `GenericLanguage`, `DeviceTypeManufacturer`.

### `GlobalLanguageVersionAttribute`

| field | type | from |
|---|---|---|
| `Confidence` | `long` | itself |
| `Id` | `long` | itself |
| `IsSpecified` | `bool` | itself |
| `LanguageAttributeType` | `GlobalLanguageAttributeTypes` | itself |
| `LanguageQualityId` | `int` | itself |

## `ButtonMapping`, 9 contracts

### `AbstractButton`

Extended by 1: `HardButton`.

| field | type | from |
|---|---|---|
| `ButtonAssignment` | `AbstractButtonAssignment` | itself |
| `ButtonKey` | `string` | itself |

### `AbstractButtonAssignment`

Extended by 3: `ButtonMapButtonAssignment`, `ChannelButtonAssignment`, `CommandButtonAssignment`. No fields of its own.

### `ButtonMap`

| field | type | from |
|---|---|---|
| `ButtonMapId` | `ButtonMapId` | itself |
| `ButtonMapType` | `ButtonMapType` | itself |
| `Buttons` | `AbstractButton[]` | itself |
| `PrimaryDeviceReferenceId` | `DeviceId` | itself |
| `Remote` | `Remote` | itself |
| `SurfaceId` | `long` | itself |

### `ButtonMapButtonAssignment`

Extends `AbstractButtonAssignment`.

| field | type | from |
|---|---|---|
| `ButtonMap` | `ButtonMap` | itself |

### `ChannelButtonAssignment`

Extends `AbstractButtonAssignment`.

| field | type | from |
|---|---|---|
| `Channel` | `string` | itself |
| `DeviceId` | `DeviceId` | itself |

### `CommandButtonAssignment`

Extends `AbstractButtonAssignment`.

| field | type | from |
|---|---|---|
| `CommandId` | `CommandId` | itself |
| `OverriddenButtonMapType` | `ButtonMapType` | itself |
| `OverriddenDeviceId` | `DeviceId` | itself |

### `DeviceModeType`

An enumeration of 5 values.

Values: `NoSetting`, `ModeTV`, `ModeCable`, `ModeDVD`, `ModeAux`.

### `HardButton`

Extends `AbstractButton`. No fields of its own.

| field | type | from |
|---|---|---|
| `ButtonAssignment` | `AbstractButtonAssignment` | inherited |
| `ButtonKey` | `string` | inherited |

### `UserModeMappingInfo`

| field | type | from |
|---|---|---|
| `AccountId` | `AccountId` | itself |
| `LongPressActionDeviceId` | `DeviceId` | itself |
| `Mode` | `DeviceModeType` | itself |
| `ShortPressActionDeviceId` | `DeviceId` | itself |

## `FunctionMapping`, 6 contracts

### `AbstractFunctionMap`

Extended by 2: `ActivityFunctionMap`, `DeviceFunctionMap`.

| field | type | from |
|---|---|---|
| `FunctionGroups` | `FunctionGroup[]` | itself |
| `UIModeName` | `string` | itself |

### `ActivityFunctionMap`

Extends `AbstractFunctionMap`.

| field | type | from |
|---|---|---|
| `FunctionGroups` | `FunctionGroup[]` | inherited |
| `UIModeName` | `string` | inherited |
| `ActivityId` | `ActivityId` | itself |

### `DeviceFunctionMap`

Extends `AbstractFunctionMap`.

| field | type | from |
|---|---|---|
| `FunctionGroups` | `FunctionGroup[]` | inherited |
| `UIModeName` | `string` | inherited |
| `DeviceId` | `DeviceId` | itself |

### `FunctionAction`

Extends `FunctionBase`.

| field | type | from |
|---|---|---|
| `Name` | `string` | inherited |
| `CommandName` | `string` | itself |
| `DeviceId` | `DeviceId` | itself |
| `FunctionId` | `FunctionId` | itself |
| `Label` | `string` | itself |
| `TransportType` | `int` | itself |

### `FunctionBase`

Extended by 2: `FunctionAction`, `FunctionGroup`.

| field | type | from |
|---|---|---|
| `Name` | `string` | itself |

### `FunctionGroup`

Extends `FunctionBase`.

| field | type | from |
|---|---|---|
| `Name` | `string` | inherited |
| `Functions` | `FunctionBase[]` | itself |

## `Logging`, 5 contracts

### `ClientUserDataLog`

| field | type | from |
|---|---|---|
| `Id` | `long` | itself |
| `Parameters` | `Dictionary<string, string>` | itself |
| `UserEventDate` | `DateTime` | itself |
| `UserEventType` | `UserEventType` | itself |
| `UserSubType` | `SubType` | itself |
| `UserTargetOperation` | `UserTargetOperation` | itself |
| `UserTargetType` | `TargetType` | itself |

### `SubType`

An enumeration of 4 values.

Values: `None`, `Invoke`, `Log`, `Completed`.

### `TargetType`

An enumeration of 22 values.

Values: `None`, `AccountManager`, `RemoteManager`, `DeviceManager`, `LoggingManager`, `WebClient`, `ActivityManager`, `DesktopService`, `AuthenticationManager`, `KaDevice`, `GlobalDeviceManager`, `UserFeatureManager`, `InfraredAnalysisManager`, `UserButtonMappingManager`, `DeletionManager`, `UserAccountDirector`, `SecurityDirector`, `PushServer`, `CoreControl`, `ProductManager`, `FavoriteChannelImageManager`, `FirmwareRetriever`.

### `UserEventType`

An enumeration of 4 values.

Values: `None`, `ClientSideEvent`, `KaSideEvent`, `Hp`.

### `UserTargetOperation`

An enumeration of 151 values.

Values: `None`, `AddRemote`, `AddSetupRating`, `AnalyzeIR`, `Authentication`, `CheckLatestFirmware`, `DetectLanguage`, `DetectLanguageForMultiCodeDevice`, `DownloadFirmware`, `GetAllTeachingCommands`, `GetButtonMaps`, `GetCommands`, `GetDevice`, `GetDevices`, `GetMyAccount`, `GetPasswordQuestion`, `GetRemote`, `GetRemoteCanvas`, `GetRemoteConfigAndStartConfigUpdate`, `GetRootButtonMap`, `GetTaskCache`, `HandleGlobalError`, `Operation`, `RegisterSuccessfulCompile`, `ResetToDefaultButtonMaps`, `SearchGlobalDevice`, `SearchGlobalDevices`, `SearchManufacturers`, `SearchPublicDevices`, `StartCompile`, `UnitDisconnected`, `UnitInitialization`, `UpdateButtonMaps`, `UpdateMultiple`, `UpdateMyAccountProperties`, `UpdateMyData`, `UpdatePasswordByOldPassword`, `UpdatePasswordByPasswordAnswer`, `UpdatePasswordQuestionAndAnswer`, `ValidateAuthentication`, `ValidateDevice`, `SubmitUserDataLogs`, `GetActivities`, `SaveActivities`, `CrashLog`, `AddPublicDevice`, `AddPrivateDevice`, `EasyZapperMigration`, `SaveRemoteSettings`, `GetRootDeviceModeButtonMap`, `LoadXapCache`, `ResetToDefaultDeviceModeButtonMaps`, `UpdateDeviceModeButtonMaps`, `GetInputInfo`, `RemoteSync`, `DeleteActivities`, `GetRemoteDefinitions`, `GetUserFeatures`, `SaveUserFeatures`, `DeleteUserFeatures`, `GetDefaultButtonMaps`, `SaveButtonMaps`, `ResetActivitiesToDefault`, `GetActivityRoles`, `GetRecommendedActivitiesFromDevicesAsync`, `DeleteDevices`, `ResolvePrimaryDeviceForActivityAsync`, `ActivityManagerPing`, `SimpleGetActivities`, `GetActivityTypesAndRoles`, `StartTeachingSession`, `GetTeachingStatus`, `StartIsRemoteSyncRequired`, `StartIsUserConfigChanged`, `UpdateUserModeMapping`, `SaveWifiNetworkSettings`, `SaveUnitProperties`, `BeginGetAvailableWifiNetworks`, `GetSavedWifiNetworkSettings`, `NinjectInvocation`, `BeginGetWifiNetworkStatus`, `GetAllLocales`, `GetDefaultLocaleMappings`, `SaveRemoteProperties`, `GetKeyboardLocales`, `DeleteButtonMaps`, `AddRemoteToAccount`, `IsolatedStorageSave`, `StartCompileWithLocaleId`, `SavePairings`, `GetAccountProducts`, `GetActivityUserModeMappingByAccountId`, `SaveUserActivityModeMappings`, `SaveAuthToken`, `GetUserAuthToken`, `SaveProvisionSettings`, `UpdateForUser`, `BeginGetProvisionSettingStatus`, `GetRemoteSettings`, `GetRootButtonMapForSurface`, `CreateNewAccountForHouseHold`, `BeginSyncRemote`, `BeginGetDeviceInfo`, `GetLatestFirmwareUpdate`, `GetNamedActivityTypes`, `GetRemoteContext`, `PushSyncNotification`, `GetProvisionInfo`, `SaveProvisionInfo`, `GetRequest`, `PostResponse`, `RemoteSyncRequired`, `UpdateDevices`, `OnTextingDeviceChanged`, `GetImageStoreInfo`, `UpdateMyHousehold`, `MigrateEasyZapperAccount`, `GetOnRemoteChanges`, `SaveConfigChanged`, `CreateButtonMaps`, `SaveSequence`, `DeleteSequence`, `OnActivityChanged`, `HubFirmwareUpgrade`, `RemoteOperation`, `ClientInfo`, `FixIncorrectModelNumber`, `ReplaceDevice`, `BeginSimplePostResponse`, `ApplicationException`, `DSException`, `CommunicationException`, `SecureControllerHandshake`, `RemoveAccountFromHousehold`, `ValidateUser`, `Login`, `IsLoggedIn`, `Logout`, `AccountManagerPing`, `GetProductButtonList`, `GetProduct`, `GetHarmonyProducts`, `NotifySyncStatus`, `SetRemoteSyncRequired`, `General`, `UploadImage`, `DownloadConfigURI`, `AddRemoteByMode`, `UserAccountCloning`, `UpgradeOrDowngrade`, `GetActivityTypeRoles`.

## `Protocol`, 5 contracts

### `AbstractProtocol`

Extends `AbstractGlobalData`. Extended by 5: `BluetoothProtocol`, `HidProtocol`, `IrProtocol`, `RfProtocol`, `UsbHidProtocol`.

| field | type | from |
|---|---|---|
| `Id` | `ProtocolId` | itself |
| `Name` | `string` | itself |

### `BluetoothProtocol`

Extends `AbstractProtocol`. No fields of its own.

| field | type | from |
|---|---|---|
| `Id` | `ProtocolId` | inherited |
| `Name` | `string` | inherited |

### `HidProtocol`

Extends `AbstractProtocol`. No fields of its own.

| field | type | from |
|---|---|---|
| `Id` | `ProtocolId` | inherited |
| `Name` | `string` | inherited |

### `ProtocolList`

| field | type | from |
|---|---|---|
| `Protocols` | `AbstractProtocol[]` | itself |

### `UsbHidProtocol`

Extends `AbstractProtocol`. No fields of its own.

| field | type | from |
|---|---|---|
| `Id` | `ProtocolId` | inherited |
| `Name` | `string` | inherited |

## `Release321`, 5 contracts

### `HouseholdProduct`

| field | type | from |
|---|---|---|
| `AccountId` | `long` | itself |
| `ProductDetails` | `Product` | itself |

### `RefineActivityResponse`

| field | type | from |
|---|---|---|
| `Activities` | `ActivityList` | itself |
| `StatusCode` | `string` | itself |

### `RolloutSettings`

| field | type | from |
|---|---|---|
| `SettingsID` | `int` | itself |
| `SettingsName` | `string` | itself |
| `SettingsValue` | `string` | itself |

### `SaveDeviceWithFeatureRequest`

| field | type | from |
|---|---|---|
| `deviceList` | `DeviceWithFeatures[]` | itself |

### `SimpleRestSaveActivityRequest`

| field | type | from |
|---|---|---|
| `accountId` | `AccountId` | itself |
| `activities` | `Activity[]` | itself |
| `refineActivity` | `bool` | itself |

## `Brand`, 4 contracts

### `AliasQualityTypes`

An enumeration of 4 values.

Values: `Valid`, `Typo`, `ProductName`, `Other`.

### `BrandAliases`

Extends `AbstractGlobalData`.

| field | type | from |
|---|---|---|
| `Id` | `BrandAliasId` | itself |
| `IsPrimary` | `bool` | itself |
| `IsPublic` | `bool` | itself |
| `Name` | `string` | itself |
| `Quality` | `AliasQualityTypes` | itself |
| `QualityRating` | `int` | itself |

### `BrandTypes`

An enumeration of 2 values.

Values: `Manufacturer`, `ServiceProvider`.

### `Brands`

Extends `AbstractGlobalData`.

| field | type | from |
|---|---|---|
| `Aliases` | `BrandAliases[]` | itself |
| `BrandType` | `BrandTypes` | itself |
| `Id` | `BrandId` | itself |
| `IsAggregatedBrand` | `bool` | itself |
| `SupportedCountries` | `CountryType[]` | itself |

## `SearchMatch`, 4 contracts

### `AbstractSearchMatch`

Extended by 2: `CategorySearchMatch`, `DeviceSearchMatch`.

| field | type | from |
|---|---|---|
| `DisplayText` | `string` | itself |
| `SelectedText` | `string` | itself |

### `CategorySearchMatch`

Extends `AbstractSearchMatch`. No fields of its own.

| field | type | from |
|---|---|---|
| `DisplayText` | `string` | inherited |
| `SelectedText` | `string` | inherited |

### `DeviceSearchMatch`

Extends `AbstractSearchMatch`. Extended by 1: `PublicDeviceSearchMatch`.

| field | type | from |
|---|---|---|
| `DisplayText` | `string` | inherited |
| `SelectedText` | `string` | inherited |
| `DeviceModel` | `string` | itself |
| `GlobalDeviceSearchType` | `GlobalDeviceSearchType` | itself |
| `Manufacturer` | `string` | itself |
| `TypedDeviceModel` | `string` | itself |
| `TypedManufacturer` | `string` | itself |

### `PublicDeviceSearchMatch`

Extends `DeviceSearchMatch`.

| field | type | from |
|---|---|---|
| `DisplayText` | `string` | inherited |
| `SelectedText` | `string` | inherited |
| `DeviceModel` | `string` | inherited |
| `GlobalDeviceSearchType` | `GlobalDeviceSearchType` | inherited |
| `Manufacturer` | `string` | inherited |
| `TypedDeviceModel` | `string` | inherited |
| `TypedManufacturer` | `string` | inherited |
| `Description` | `string` | itself |
| `DeviceType` | `DeviceType` | itself |
| `GlobalLanguageVersionId` | `GlobalLanguageVersionId` | itself |
| `Id` | `PublicGlobalDeviceId` | itself |
| `IsMultiCode` | `bool` | itself |
| `ParentDeviceId` | `long` | itself |

## `RemoteInventory`, 3 contracts

### `GetSyncStatusResult`

An enumeration of 4 values.

Values: `Unknown`, `Successful`, `Failed`, `Waiting`.

### `NotifySyncStatusResult`

An enumeration of 2 values.

Values: `Failed`, `Successful`.

### `SyncStatus`

An enumeration of 3 values.

Values: `Successful`, `Failed`, `Waiting`.

## `com/harmony/services/romdata`, 3 contracts

### `RequestOperationData`

| field | type | from |
|---|---|---|
| `OperationName` | `string` | itself |
| `SkinId` | `string` | itself |

### `RequestRomData`

| field | type | from |
|---|---|---|
| `ActionType` | `string` | itself |
| `SkinId` | `string` | itself |

### `RomOutput`

| field | type | from |
|---|---|---|
| `RomTemplate` | `string` | itself |

## `Discovery`, 2 contracts

### `ServiceDescription`

| field | type | from |
|---|---|---|
| `Address` | `string` | itself |
| `EnvironmentId` | `string` | itself |
| `Identifier` | `string` | itself |
| `Name` | `string` | itself |

### `Services`

| field | type | from |
|---|---|---|
| `Json2Services` | `ServiceDescription[]` | itself |
| `JsonServices` | `ServiceDescription[]` | itself |
| `SoapServices` | `ServiceDescription[]` | itself |

## `Error`, 2 contracts

### `ErrorCodes`

An enumeration of 2 values.

Values: `AM0001`, `RM0001`.

### `FaultDetail`

| field | type | from |
|---|---|---|
| `ErrorCode` | `ErrorCodes` | itself |
| `Guid` | `Guid` | itself |
| `Message` | `string` | itself |

## `Security`, 2 contracts

### `ActiveDirectoryMembershipUser`

Extends `MembershipUser`.

| field | type | from |
|---|---|---|
| `_Comment` | `string` | inherited |
| `_CreationDate` | `DateTime` | inherited |
| `_Email` | `string` | inherited |
| `_IsApproved` | `bool` | inherited |
| `_IsLockedOut` | `bool` | inherited |
| `_LastActivityDate` | `DateTime` | inherited |
| `_LastLockoutDate` | `DateTime` | inherited |
| `_LastLoginDate` | `DateTime` | inherited |
| `_LastPasswordChangedDate` | `DateTime` | inherited |
| `_PasswordQuestion` | `string` | inherited |
| `_ProviderName` | `string` | inherited |
| `_ProviderUserKey` | `object` | inherited |
| `_UserName` | `string` | inherited |
| `commentModified` | `bool` | itself |
| `emailModified` | `bool` | itself |
| `isApprovedModified` | `bool` | itself |
| `sidBinaryForm` | `byte[]` | itself |

### `MembershipUser`

Extended by 1: `ActiveDirectoryMembershipUser`.

| field | type | from |
|---|---|---|
| `_Comment` | `string` | itself |
| `_CreationDate` | `DateTime` | itself |
| `_Email` | `string` | itself |
| `_IsApproved` | `bool` | itself |
| `_IsLockedOut` | `bool` | itself |
| `_LastActivityDate` | `DateTime` | itself |
| `_LastLockoutDate` | `DateTime` | itself |
| `_LastLoginDate` | `DateTime` | itself |
| `_LastPasswordChangedDate` | `DateTime` | itself |
| `_PasswordQuestion` | `string` | itself |
| `_ProviderName` | `string` | itself |
| `_ProviderUserKey` | `object` | itself |
| `_UserName` | `string` | itself |

## `AmazonS3`, 1 contracts

### `OperationType`

An enumeration of 3 values.

Values: `PutObjectInline`, `DeleteObject`, `ListBucket`.

## `Compile`, 1 contracts

### `CompileRequest`

| field | type | from |
|---|---|---|
| `ApproximateSize` | `int` | itself |
| `DownloadUrl` | `string` | itself |
| `SimulationDownloadUrl` | `string` | itself |

## `Device`, 1 contracts

### `InputInformation`

| field | type | from |
|---|---|---|
| `InputType` | `InputType` | itself |
| `Inputs` | `Input[]` | itself |

## `RF`, 1 contracts

### `RfProtocol`

Extends `AbstractProtocol`.

| field | type | from |
|---|---|---|
| `Id` | `ProtocolId` | inherited |
| `Name` | `string` | inherited |
| `DataRate` | `long` | itself |

## `Service`, 1 contracts

### `ClientInfo`

| field | type | from |
|---|---|---|
| `appVersion` | `string` | itself |
| `clientDevice` | `string` | itself |
| `clientOS` | `string` | itself |

## `Services`, 1 contracts

### `HelpDocument`

| field | type | from |
|---|---|---|
| `FontFamily` | `string` | itself |
| `FontSize` | `string` | itself |
| `HelpHeader` | `string` | itself |
| `HtmlContent` | `string` | itself |
| `Title` | `string` | itself |

## Declaring no area, 44 contracts

### `ActivityList`

| field | type | from |
|---|---|---|
| `Activities` | `Activity[]` | itself |

### `ChangeChannelRequest`

| field | type | from |
|---|---|---|
| `Uid` | `string` | itself |
| `DeviceId` | `long` | itself |
| `ChannelId` | `long` | itself |
| `Group` | `ChannelGroup[]` | itself |

### `ClientNetworkStatus`

| field | type | from |
|---|---|---|
| `ssid` | `string` | itself |
| `Status` | `string` | itself |
| `Gateway` | `string` | itself |
| `Address` | `string` | itself |
| `NameServer` | `string` | itself |

### `DSRequest`

| field | type | from |
|---|---|---|
| `URI` | `string` | itself |
| `Verb` | `string` | itself |
| `Resource` | `string` | itself |
| `ETag` | `string` | itself |
| `LtcpDropPath` | `string` | itself |

### `Data`

| field | type | from |
|---|---|---|
| `ProvisionInfo` | `ProvisionInfo` | itself |

### `DownloadContentPercentage`

| field | type | from |
|---|---|---|
| `ExtModeBasicSettingsWithoutFavorites` | `int` | itself |
| `ExtModeBasicSettingsWithFavorites` | `int` | itself |
| `ExtModeFavorites` | `int` | itself |
| `ExtModeRemoteUpdate` | `int` | itself |
| `ExtModeRemoteFirmware` | `int` | itself |
| `ExtModeBasicSettingsWithFirmware` | `int` | itself |
| `ExtModeRemoteFirmwareWithoutFavorites` | `int` | itself |
| `ExtModeHubFirmware` | `int` | itself |
| `ExtModeFirmwareTimer` | `int` | itself |
| `ExtModeAfterFirmwareTimer` | `int` | itself |
| `ExtModeWithoutFirmwareAndFavoritesTimer` | `int` | itself |
| `ExtModeWithoutFirmwareTimer` | `int` | itself |
| `ExtModeHubFirmwareTimer` | `int` | itself |
| `HubModeHubReprovision` | `int` | itself |
| `HubModeHubConfig` | `int` | itself |
| `HubModeAccountInfo` | `int` | itself |
| `HubModeRemoteFirmware` | `int` | itself |
| `HubModeHubFirmware` | `int` | itself |
| `HubModeHubReprovisionAfterFirmware` | `int` | itself |
| `HubModeHubConfigAfterFirmware` | `int` | itself |
| `HubModeHubFirmwareWithRemoteFirmware` | `int` | itself |
| `HubModeHubReprovisionWithBothFirmware` | `int` | itself |
| `HubModeHubConfigWithBothFirmware` | `int` | itself |
| `HubModeBothFirmwareTimer` | `int` | itself |
| `HubModeFirmwareTimer` | `int` | itself |
| `HubModeAfterFirmwareTimer` | `int` | itself |
| `HubModeWithoutFirmwareTimer` | `int` | itself |
| `HubModeAccountInfoWithFavoritesTimer` | `int` | itself |
| `HubModeAccountInfoWithoutFavoritesTimer` | `int` | itself |
| `Stopper` | `int` | itself |

### `DragInputBase`

| field | type | from |
|---|---|---|
| `ValueString` | `string` | itself |
| `StateName` | `string` | itself |
| `DevActionType` | `int` | itself |
| `ActionTypeId` | `int` | itself |
| `ActionId` | `int` | itself |
| `PressDuration` | `int` | itself |
| `ActionSetTypeId` | `int` | itself |
| `Index` | `int` | itself |
| `Actions` | `AbstractIRAction[]` | itself |
| `CommandName` | `string` | itself |
| `ItemSource` | `object` | itself |

### `FirmwareUpdateDetail`

| field | type | from |
|---|---|---|
| `CurrentVersion` | `string` | itself |
| `DownloadingVersion` | `string` | itself |
| `Status` | `int` | itself |
| `PackageId` | `string` | itself |

### `FirmwareUpdateRequest`

| field | type | from |
|---|---|---|
| `CriticalOnly` | `string` | itself |

### `GetRokuChannelRequest`

| field | type | from |
|---|---|---|
| `Uid` | `string` | itself |

### `HubIPScannedResult`

| field | type | from |
|---|---|---|
| `ScannedDevices` | `Dictionary<string, ScannedDevice>` | itself |
| `ErrorCode` | `string` | itself |

### `JsonDeviceInfoResponse`

| field | type | from |
|---|---|---|
| `Count` | `int` | itself |
| `EquadId` | `string` | itself |
| `RFID` | `string` | itself |
| `SkinId` | `string` | itself |
| `Pairings` | `Pairing[]` | itself |

### `JsonNetworkStatus`

| field | type | from |
|---|---|---|
| `ClientNetwork` | `ClientNetworkStatus` | itself |
| `ServerStatus` | `IDictionary<string, ServerNetworkStatus>` | itself |

### `JsonPostResponse`

| field | type | from |
|---|---|---|
| `Id` | `int` | itself |
| `Code` | `int` | itself |
| `Data` | `T` | itself |
| `Id` | `int` | itself |
| `Code` | `int` | itself |

### `JsonPostResponseError`

| field | type | from |
|---|---|---|
| `ErrorString` | `string` | itself |
| `ErrorCode` | `int` | itself |

### `JsonPostResponseStatus`

| field | type | from |
|---|---|---|
| `ErrorStatus` | `int` | itself |

### `JsonProvisioningRemoteResponse`

| field | type | from |
|---|---|---|
| `ErrorCode` | `string` | itself |
| `ErrorMessage` | `string` | itself |
| `MimeType` | `string` | itself |
| `Result` | `ProvisioningResult` | itself |

### `JsonRemoteRequest`

| field | type | from |
|---|---|---|
| `Id` | `int` | itself |
| `Command` | `string` | itself |
| `TimeOut` | `int` | itself |
| `Id` | `int` | itself |
| `Command` | `string` | itself |
| `Data` | `T` | itself |
| `TimeOut` | `int` | itself |

### `JsonRemoteResponse`

| field | type | from |
|---|---|---|
| `ErrorCode` | `string` | itself |
| `ErrorMessage` | `string` | itself |
| `MimeType` | `string` | itself |
| `Result` | `Result` | itself |
| `Status` | `string` | itself |
| `Data` | `JsonResult` | itself |

### `JsonRemoteUnPairRequest`

| field | type | from |
|---|---|---|
| `Id` | `int` | itself |
| `Command` | `string` | itself |
| `TimeOut` | `int` | itself |
| `Data` | `int` | itself |

### `JsonRemoteUnit`

| field | type | from |
|---|---|---|
| `UsbProductId` | `string` | itself |
| `Skin` | `string` | itself |
| `SerialNumber` | `string` | itself |
| `FirmwareVersion` | `string` | itself |
| `Arch` | `string` | itself |
| `Status` | `string` | itself |
| `HardwareVersion` | `string` | itself |
| `BlueToothAddress` | `string` | itself |
| `UsbVendorId` | `string` | itself |
| `LinkType` | `string` | itself |
| `FirmwareType` | `string` | itself |
| `LinkPacketLength` | `string` | itself |
| `LinkHardWare` | `string` | itself |
| `Feature` | `string[]` | itself |

### `JsonRemoteWriteResponse`

| field | type | from |
|---|---|---|
| `ErrorCode` | `string` | itself |
| `ErrorMessage` | `string` | itself |
| `MimeType` | `string` | itself |

### `JsonResponseForHubIPScan`

| field | type | from |
|---|---|---|
| `Code` | `int` | itself |
| `Data` | `T` | itself |

### `JsonResult`

| field | type | from |
|---|---|---|
| `ProvisionStatus` | `string` | itself |
| `ProvisionedEmail` | `string` | itself |
| `ErrorMessage` | `string` | itself |

### `PairAutomationGateway`

| field | type | from |
|---|---|---|
| `Gateway` | `Gateway` | itself |

### `PairedDevice`

| field | type | from |
|---|---|---|
| `EquadID` | `string` | itself |
| `RFID` | `string` | itself |
| `DeviceIndex` | `int` | itself |
| `SkinId` | `string` | itself |

### `Pairing`

| field | type | from |
|---|---|---|
| `EquadId` | `string` | itself |
| `SkinId` | `string` | itself |
| `SurfaceId` | `string` | itself |
| `DeviceIndex` | `string` | itself |

### `ProductInfo`

| field | type | from |
|---|---|---|
| `RemoteProductInfo` | `Product` | itself |
| `SurfacesProductInfo` | `Product[]` | itself |

### `ProvisionHubResponse`

| field | type | from |
|---|---|---|
| `HubCloudToken` | `string` | itself |
| `HubId` | `long` | itself |

### `ProvisionInfo`

| field | type | from |
|---|---|---|
| `AuthToken` | `string` | itself |
| `AccountId` | `string` | itself |
| `Language` | `string` | itself |
| `Username` | `string` | itself |
| `DiscoveryServer` | `string` | itself |
| `Mode` | `string` | itself |
| `ActiveRemoteId` | `string` | itself |
| `Email` | `string` | itself |
| `SUSChannel` | `string` | itself |
| `HubName` | `string` | itself |

### `ProvisioningResult`

| field | type | from |
|---|---|---|
| `Language` | `string` | itself |
| `DiscoveryServer` | `string` | itself |
| `AccountId` | `string` | itself |
| `ProvisionedEmail` | `string` | itself |
| `Mode` | `string` | itself |

### `ProxyPutRequest`

| field | type | from |
|---|---|---|
| `Resource` | `JObject` | itself |
| `Uri` | `string` | itself |
| `HEtag` | `string` | itself |
| `ETag` | `string` | itself |

### `ProxyResourceRequest`

| field | type | from |
|---|---|---|
| `Uri` | `string` | itself |

### `RemoveDeviceRequest`

| field | type | from |
|---|---|---|
| `DeviceId` | `string` | itself |

### `RemoveGatewayRequest`

| field | type | from |
|---|---|---|
| `GatewayId` | `string` | itself |

### `RokuFavoriteChannelResult`

| field | type | from |
|---|---|---|
| `ChannelList` | `Dictionary<string, DeviceService>` | itself |
| `ErrorCode` | `string` | itself |

### `SavePairingResult`

| field | type | from |
|---|---|---|
| `Successful` | `bool` | itself |

### `ScannedDevice`

Extended by 1: `UIScannedDevice`.

| field | type | from |
|---|---|---|
| `DeviceClass` | `string` | itself |
| `Manufacturer` | `string` | itself |
| `ModelName` | `string` | itself |
| `ModelNumber` | `string` | itself |
| `FriendlyName` | `string` | itself |
| `SerialNumber` | `string` | itself |
| `IpAddress` | `string` | itself |
| `ServiceType` | `string` | itself |
| `Usn` | `string` | itself |

### `SendCommandRequest`

| field | type | from |
|---|---|---|
| `Name` | `string` | itself |

### `ServerNetworkStatus`

| field | type | from |
|---|---|---|
| `Address` | `string` | itself |
| `Http` | `bool` | itself |
| `Https` | `bool` | itself |

### `ServiceResponse`

| field | type | from |
|---|---|---|
| `CacheControl` | `string` | itself |
| `BodyType` | `string` | itself |
| `Etag` | `string` | itself |
| `Uri` | `string` | itself |
| `StatusCode` | `string` | itself |
| `Resource` | `object` | itself |

### `UnpairRequest`

| field | type | from |
|---|---|---|
| `DeviceIndex` | `int` | itself |

### `UserFeatureList`

| field | type | from |
|---|---|---|
| `UserFeatures` | `Dictionary<DeviceId, ObservableCollection<DeviceFeature>>` | itself |

### `ZScanRequest`

| field | type | from |
|---|---|---|
| `GatewayType` | `string` | itself |
| `CancelOperation` | `bool` | itself |
| `DoneOperation` | `bool` | itself |
| `Timeout` | `int` | itself |
