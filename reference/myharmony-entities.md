# MyHarmony: every service contract, by area

**Generated** by `tools/myharmony_model.py` from `reference/myharmony-model.json`, so it
is never edited by hand. `docs/myharmony-model.md` is the reading; this is the index.

A contract's area is the last part of the server side namespace it declares. The 44
contracts that declare none are listed at the end.

## `Data`, 163 contracts

| contract | fields | enum values |
|---|---|---|
| `AbstractAliasId` | 0 | 0 |
| `AbstractDevice` | 17 | 0 |
| `AbstractDeviceId` | 0 | 0 |
| `AbstractGlobalData` | 0 | 0 |
| `AbstractId` | 2 | 0 |
| `AbstractProperty` | 1 | 0 |
| `AbstractPropertyValue` | 1 | 0 |
| `AccountCapability` | 2 | 0 |
| `AccountHouseholdRequest` | 1 | 0 |
| `AccountId` | 0 | 0 |
| `AccountMigrationStatus` | 0 | 4 |
| `ActivityDescription` | 5 | 0 |
| `ActivityId` | 0 | 0 |
| `AdminConfig` | 5 | 0 |
| `AggregatedDeviceId` | 0 | 0 |
| `AnalyzeInfraredResult` | 0 | 0 |
| `Answer` | 2 | 0 |
| `AutoDetectedDevice` | 6 | 0 |
| `BrandAliasId` | 0 | 0 |
| `BrandId` | 0 | 0 |
| `BuildInfo` | 2 | 0 |
| `ButtonImageId` | 0 | 0 |
| `ButtonMapId` | 0 | 0 |
| `ButtonMapType` | 0 | 6 |
| `ChannelTuningFeature` | 3 | 0 |
| `CloneAccountDTO` | 3 | 0 |
| `CloneAccountResponse` | 9 | 0 |
| `Command` | 11 | 0 |
| `CommandId` | 0 | 0 |
| `CommandToLearn` | 1 | 0 |
| `CompilationId` | 1 | 0 |
| `CompilerArchitectureType` | 0 | 4 |
| `ControlPort` | 0 | 4 |
| `ControlType` | 0 | 4 |
| `Country` | 3 | 0 |
| `CountryType` | 0 | 242 |
| `DetectLanguageForMultiCodeDeviceResult` | 1 | 0 |
| `DetectLanguageResult` | 2 | 0 |
| `DetectLanguageResultBase` | 2 | 0 |
| `DetectLanguageStatus` | 0 | 5 |
| `DevActionType` | 0 | 3 |
| `Device` | 32 | 0 |
| `DeviceCapabilityType` | 0 | 81 |
| `DeviceCategory` | 0 | 6 |
| `DeviceCharacterizationType` | 0 | 3 |
| `DeviceDescription` | 5 | 0 |
| `DeviceFeatureId` | 0 | 0 |
| `DeviceId` | 0 | 0 |
| `DeviceInformation` | 5 | 0 |
| `DeviceList` | 1 | 0 |
| `DeviceModelAliasId` | 0 | 0 |
| `DeviceSearchRequest` | 5 | 0 |
| `DeviceSearchResponse` | 5 | 0 |
| `DeviceSetupState` | 0 | 2 |
| `DeviceState` | 0 | 4 |
| `DeviceType` | 0 | 61 |
| `DeviceWithFeatures` | 3 | 0 |
| `EasyZapperAccountDetailsResponse` | 4 | 0 |
| `EnumProperty` | 1 | 0 |
| `EnumPropertyValue` | 1 | 0 |
| `FailedAnalyzeInfraredResult` | 1 | 0 |
| `FeatureId` | 0 | 0 |
| `FunctionGroupType` | 0 | 11 |
| `FunctionId` | 0 | 0 |
| `FunctionList` | 1 | 0 |
| `GeneralADUserDetails` | 4 | 0 |
| `GeneralUserRequest` | 3 | 0 |
| `GeneralUserResponse` | 5 | 0 |
| `GetActivityRolesRequest` | 3 | 0 |
| `GetActivityRolesResponse` | 1 | 0 |
| `GetActivityTypeRolesRequest` | 3 | 0 |
| `GetActivityTypeRolesResponse` | 1 | 0 |
| `GetActivityTypesAndRolesRequest` | 1 | 0 |
| `GetActivityTypesAndRolesResponse` | 1 | 0 |
| `GetAllTeachingCommandsResult` | 2 | 0 |
| `GetAllTeachingCommandsStatus` | 0 | 5 |
| `GetEasyZapperAccountDetailsRequest` | 3 | 0 |
| `GetHubCloudTokenResponse` | 1 | 0 |
| `GetPasswordQuestionResult` | 2 | 0 |
| `GetPasswordQuestionResultStatus` | 0 | 3 |
| `GetRecommendedActivitiesRequest` | 2 | 0 |
| `GetRecommendedActivitiesResponse` | 1 | 0 |
| `GlobalDevice` | 17 | 0 |
| `GlobalDeviceGlobalLanguage` | 2 | 0 |
| `GlobalDeviceId` | 0 | 0 |
| `GlobalDeviceSearchType` | 0 | 7 |
| `GlobalDeviceVersionId` | 2 | 0 |
| `GlobalDevicesSearchResult` | 2 | 0 |
| `GlobalDevicesSearchStatus` | 0 | 4 |
| `GlobalLanguageVersionId` | 1 | 0 |
| `GlobalLanguages` | 2 | 0 |
| `GlobalRemote` | 15 | 0 |
| `GlobalStateValueActionSetType` | 0 | 3 |
| `GtvAuthenticationResponse` | 3 | 0 |
| `GtvPackageCertificate` | 2 | 0 |
| `HandshakeResponse` | 2 | 0 |
| `HouseholdId` | 0 | 0 |
| `HouseholdRequest` | 4 | 0 |
| `HouseholdSupportPolicy` | 2 | 0 |
| `IPScanDeviceSearchRequest` | 10 | 0 |
| `Icon` | 0 | 63 |
| `ImageStoreInfo` | 8 | 0 |
| `InputSwitchingType` | 0 | 7 |
| `InputType` | 0 | 8 |
| `KeyCode` | 2 | 0 |
| `KeyboardLayoutType` | 0 | 4 |
| `KeyboardLocale` | 5 | 0 |
| `LearnedCommand` | 3 | 0 |
| `LearnedCommandStatus` | 0 | 4 |
| `LinkHandshakeResponse` | 2 | 0 |
| `LoginResponse` | 5 | 0 |
| `MapList` | 2 | 0 |
| `MigrateEasyZapperAccountRequest` | 3 | 0 |
| `MigrateEasyZapperAccountResponse` | 6 | 0 |
| `MigrateHarmonyPlatformDevicesAndActivitiesRequest` | 4 | 0 |
| `MigrateHarmonyPlatformDevicesAndActivitiesResponse` | 10 | 0 |
| `PairingId` | 0 | 0 |
| `PairingInfo` | 3 | 0 |
| `PictureId` | 0 | 0 |
| `PowerButtonType` | 0 | 4 |
| `PowerType` | 0 | 4 |
| `PrioritizedDeviceCapability` | 2 | 0 |
| `PrivateAddType` | 0 | 3 |
| `PrivateGlobalDeviceId` | 0 | 0 |
| `Product2` | 24 | 0 |
| `ProductCapabilitiesRequest` | 1 | 0 |
| `ProductCapabilitiesResponse` | 1 | 0 |
| `ProductCapabilitiesResponse2` | 1 | 0 |
| `ProductCapability` | 10 | 0 |
| `ProductId` | 0 | 0 |
| `ProtocolId` | 0 | 0 |
| `ProviderLoginRequest` | 3 | 0 |
| `PublicGlobalDeviceId` | 0 | 0 |
| `Question` | 2 | 0 |
| `QuestionType` | 0 | 3 |
| `QuestionVerifyDeviceResult` | 1 | 0 |
| `Region` | 0 | 5 |
| `RemoteId` | 0 | 0 |
| `RemoveAccountFromHouseholdResult` | 0 | 0 |
| `RoomId` | 0 | 0 |
| `SetupRatingCommentCategoryType` | 0 | 8 |
| `SignIn2Request` | 5 | 0 |
| `SignInRequest` | 2 | 0 |
| `SignUpRequest` | 2 | 0 |
| `SuccessAnalyzeInfraredResult` | 1 | 0 |
| `SuccessVerifyDeviceResult` | 1 | 0 |
| `SupportedCapability` | 0 | 123 |
| `SurfaceId` | 0 | 0 |
| `TransportType` | 0 | 9 |
| `UnifiedSupportPolicy` | 2 | 0 |
| `UnitDescription` | 4 | 0 |
| `UpdateCommandResult` | 1 | 0 |
| `UpdateStatus` | 0 | 2 |
| `UpgradeConfigRequest` | 2 | 0 |
| `UpgradeConfigResponse` | 0 | 2 |
| `UserAuthTokenResponse` | 2 | 0 |
| `UserDeviceSetupState` | 0 | 4 |
| `UserHubCapabilities` | 4 | 0 |
| `UserHubCapability` | 6 | 0 |
| `UserInfoRequest` | 2 | 0 |
| `UserInfoResult` | 4 | 0 |
| `VerifyDeviceResult` | 0 | 0 |
| `Workflow` | 0 | 4 |

## `Activity`, 38 contracts

| contract | fields | enum values |
|---|---|---|
| `AbstractActivityAction` | 2 | 0 |
| `AbstractActivityRole` | 6 | 0 |
| `AccessInternetActivityRole` | 0 | 0 |
| `Activity` | 25 | 0 |
| `ActivityGroup` | 0 | 5 |
| `ActivityInputState` | 3 | 0 |
| `ActivityInputStateId` | 0 | 0 |
| `ActivityRoleId` | 0 | 0 |
| `ActivityRoleType` | 0 | 23 |
| `ActivityState` | 0 | 2 |
| `ActivityType` | 0 | 17 |
| `ChannelActivityAction` | 2 | 0 |
| `ChannelChangingActivityRole` | 0 | 0 |
| `CommandActivityAction` | 3 | 0 |
| `ControlsAppActivityRole` | 0 | 0 |
| `ControlsAppleTVActivityRole` | 0 | 0 |
| `ControlsComputerActivityRole` | 0 | 0 |
| `ControlsMediaPlayerActivityRole` | 0 | 0 |
| `ControlsNetflixActivityRole` | 0 | 0 |
| `ControlsRokuActivityRole` | 0 | 0 |
| `ControlsSonosActivityRole` | 0 | 0 |
| `ControlsSpeakerActivityRole` | 0 | 0 |
| `ControlsVideoCallActivityRole` | 0 | 0 |
| `DelayActivityAction` | 1 | 0 |
| `DeviceWithCapabilities` | 4 | 0 |
| `DisplayActivityRole` | 0 | 0 |
| `KeyboardTextEntryActivityRole` | 0 | 0 |
| `PassThroughActivityRole` | 0 | 0 |
| `PlayGameActivityRole` | 0 | 0 |
| `PlayMediaActivityRole` | 0 | 0 |
| `PlayMovieActivityRole` | 0 | 0 |
| `PowerInputActivityRole` | 1 | 0 |
| `RecommendedActivity` | 3 | 0 |
| `RoleToDeviceMapping` | 1 | 0 |
| `RunLogitechGoogleTVActivityRole` | 0 | 0 |
| `SilentActivityRole` | 0 | 0 |
| `SmartTVActivityRole` | 0 | 0 |
| `VolumeActivityRole` | 0 | 0 |

## `Search`, 37 contracts

| contract | fields | enum values |
|---|---|---|
| `AbstractGlobalDataSearchCriteria` | 2 | 0 |
| `AbstractSearchBrandCriteria` | 0 | 0 |
| `AbstractSearchGlobalDeviceCriteria` | 0 | 0 |
| `AbstractSearchGlobalLanguageCriteria` | 0 | 0 |
| `AbstractSearchGlobalLanguageElementCriteria` | 0 | 0 |
| `AbstractSearchGlobalLanguageElementFunctionCriteria` | 0 | 0 |
| `AbstractSearchGlobalLanguageVersionsCriteria` | 0 | 0 |
| `AbstractSearchKeyCodeCriteria` | 0 | 0 |
| `AbstractSearchProtocolsCriteria` | 0 | 0 |
| `GlobalDeviceOrder` | 0 | 1 |
| `SearchBrandsByAliasNameCriteria` | 2 | 0 |
| `SearchBrandsByIdCriteria` | 1 | 0 |
| `SearchGlobalDeviceByBrandAliasCriteria` | 1 | 0 |
| `SearchGlobalDeviceByGlobalDeviceIdCriteria` | 1 | 0 |
| `SearchGlobalDeviceByGlobalDeviceIdsCriteria` | 1 | 0 |
| `SearchGlobalDeviceByLanguageIdCriteria` | 1 | 0 |
| `SearchGlobalDeviceByLanguageVersionIdsCriteria` | 1 | 0 |
| `SearchGlobalDeviceByModelAliasCriteria` | 2 | 0 |
| `SearchGlobalDeviceByMultipleGroupCriteria` | 9 | 0 |
| `SearchGlobalDeviceByPromotableCriteria` | 8 | 0 |
| `SearchGlobalDeviceByVersionIdCriteria` | 1 | 0 |
| `SearchGlobalDeviceByVersionIdsCriteria` | 1 | 0 |
| `SearchGlobalLanguageByElementNameCriteria` | 1 | 0 |
| `SearchGlobalLanguageByExactNameCriteria` | 1 | 0 |
| `SearchGlobalLanguageByIdCriteria` | 2 | 0 |
| `SearchGlobalLanguageByKeyCodeCriteria` | 1 | 0 |
| `SearchGlobalLanguageByNameAndRemoteModelCriteria` | 2 | 0 |
| `SearchGlobalLanguageByNameCriteria` | 1 | 0 |
| `SearchGlobalLanguageElementByCustomCriteria` | 4 | 0 |
| `SearchGlobalLanguageElementFunctionByNameCriteria` | 1 | 0 |
| `SearchGlobalLanguageElementFunctionCriteria` | 0 | 0 |
| `SearchGlobalLanguageVersionsByCustomCriteria` | 4 | 0 |
| `SearchGlobalLanguageVersionsByIdCriteria` | 1 | 0 |
| `SearchGlobalLanguageVersionsByIdsCriteria` | 1 | 0 |
| `SearchKeyCodeByValueCriteria` | 1 | 0 |
| `SearchProtocolsByIdCriteria` | 1 | 0 |
| `SearchProtocolsByNameCriteria` | 1 | 0 |

## `UserButtonMapping`, 29 contracts

| contract | fields | enum values |
|---|---|---|
| `AbstractButtonAction` | 3 | 0 |
| `AbstractButtonMap` | 8 | 0 |
| `AbstractRemoteButton` | 6 | 0 |
| `ActivityButtonMap` | 1 | 0 |
| `ActivityChangeRequest` | 5 | 0 |
| `ActivityChangeResponse` | 1 | 0 |
| `ButtonActivityAction` | 1 | 0 |
| `ButtonChannelAction` | 2 | 0 |
| `ButtonClientAction` | 1 | 0 |
| `ButtonCommandAction` | 3 | 0 |
| `ButtonDelayAction` | 1 | 0 |
| `ButtonHomeControlAction` | 7 | 0 |
| `ButtonProgramAction` | 2 | 0 |
| `ButtonSequenceAction` | 1 | 0 |
| `ButtonState` | 0 | 5 |
| `DeviceButtonMap` | 1 | 0 |
| `GestureRemoteButton` | 2 | 0 |
| `HardRemoteButton` | 1 | 0 |
| `HomeControlTarget` | 9 | 0 |
| `KeyboardButton` | 2 | 0 |
| `MenuItem` | 2 | 0 |
| `RegenerateButtonMapsRequest` | 7 | 0 |
| `RegenerateButtonMapsResponse` | 1 | 0 |
| `RootButtonMap` | 0 | 0 |
| `Sequence` | 3 | 0 |
| `SlideOutKeypadButton` | 0 | 0 |
| `SoftRemoteButton` | 5 | 0 |
| `UserActivityModeMappingInfo` | 3 | 0 |
| `VoiceRemoteButton` | 1 | 0 |

## `Account`, 26 contracts

| contract | fields | enum values |
|---|---|---|
| `Account` | 21 | 0 |
| `AccountProperties` | 15 | 0 |
| `ChangeClaimRequest` | 4 | 0 |
| `CreateAccountRequest` | 17 | 0 |
| `CreateAccountResponse` | 2 | 0 |
| `CreateAccountResult` | 0 | 4 |
| `Dongle` | 3 | 0 |
| `EmailPreference` | 2 | 0 |
| `EmailPreferenceResponse` | 2 | 0 |
| `Household` | 7 | 0 |
| `Locale` | 3 | 0 |
| `Location` | 2 | 0 |
| `Remote` | 32 | 0 |
| `RemoteContext` | 16 | 0 |
| `RemoteInfo` | 13 | 0 |
| `RemoteProperties` | 7 | 0 |
| `RemoteSetting` | 6 | 0 |
| `RemoteSettings` | 4 | 0 |
| `Room` | 2 | 0 |
| `SaveRemotePropertiesResult` | 0 | 2 |
| `SaveRemoteSettingsResult` | 0 | 2 |
| `SearchResult` | 3 | 0 |
| `SetupSession` | 4 | 0 |
| `SocialIdentity` | 3 | 0 |
| `Surface` | 5 | 0 |
| `UpdateUserPropertiesRequest` | 4 | 0 |

## `Infrared`, 18 contracts

| contract | fields | enum values |
|---|---|---|
| `Atom` | 4 | 0 |
| `AtomType` | 0 | 2 |
| `AttributeType` | 0 | 4 |
| `BitType` | 0 | 32 |
| `CodeSegment` | 5 | 0 |
| `EncodingType` | 0 | 5 |
| `FlagType` | 0 | 4 |
| `IREncoding` | 2 | 0 |
| `IRProtocolSendingTypeContract` | 0 | 5 |
| `IRSegment` | 4 | 0 |
| `IrProtocol` | 17 | 0 |
| `KeyCodeElement` | 2 | 0 |
| `ParsedKeyCode` | 3 | 0 |
| `Payload` | 4 | 0 |
| `ProtocolRelation` | 2 | 0 |
| `RelationType` | 0 | 7 |
| `Segment` | 1 | 0 |
| `SegmentType` | 0 | 2 |

## `Operation`, 17 contracts

| contract | fields | enum values |
|---|---|---|
| `AddCommandOperation` | 4 | 0 |
| `AddDeviceBySearchResultOperation` | 11 | 0 |
| `AddDeviceOperation` | 8 | 0 |
| `AddNewDeviceOperation` | 6 | 0 |
| `CreateOperation` | 3 | 0 |
| `DeleteCommandOperation` | 2 | 0 |
| `DeleteOperation` | 1 | 0 |
| `DeleteUserDeviceOperation` | 1 | 0 |
| `GroupCommandOperation` | 2 | 0 |
| `Operation` | 1 | 0 |
| `OperationBag` | 1 | 0 |
| `TransportTypeOperation` | 4 | 0 |
| `UpdateDeviceNameOperation` | 2 | 0 |
| `UpdateLanguageOperation` | 5 | 0 |
| `UpdateOperation` | 1 | 0 |
| `UpdateScartCableOperation` | 2 | 0 |
| `UpdateUserDeviceOperation` | 2 | 0 |

## `DataContract`, 16 contracts

| contract | fields | enum values |
|---|---|---|
| `ButtonDefinition` | 2 | 0 |
| `ButtonDefinitionType` | 0 | 5 |
| `CompilerArchitecture` | 8 | 0 |
| `CustomerSupportDetail` | 7 | 0 |
| `CustomerSupportPolicy` | 15 | 0 |
| `Display` | 6 | 0 |
| `HarmonyProduct` | 9 | 0 |
| `Keyboard` | 4 | 0 |
| `KeyboardLayout` | 2 | 0 |
| `Manufacturer` | 2 | 0 |
| `Product` | 26 | 0 |
| `ProductButtonList` | 1 | 0 |
| `ProductSetting` | 6 | 0 |
| `Setting` | 2 | 0 |
| `VendorId` | 0 | 2 |
| `VendorSerial` | 2 | 0 |

## `UserFeature`, 16 contracts

| contract | fields | enum values |
|---|---|---|
| `AbstractIRAction` | 2 | 0 |
| `ChannelTuningFeature1` | 5 | 0 |
| `DeviceFeature` | 4 | 0 |
| `FeatureState` | 0 | 2 |
| `IRDelayAction` | 1 | 0 |
| `IRDevAction` | 3 | 0 |
| `IRHoldAction` | 1 | 0 |
| `IRPressAction` | 2 | 0 |
| `Input` | 15 | 0 |
| `InputFeature` | 12 | 0 |
| `InternalStateFeature` | 8 | 0 |
| `Output` | 4 | 0 |
| `OutputFeature` | 3 | 0 |
| `PowerFeature` | 16 | 0 |
| `StateValue` | 5 | 0 |
| `UserInput` | 15 | 0 |

## `GlobalLanguage`, 10 contracts

| contract | fields | enum values |
|---|---|---|
| `DeviceRemote` | 2 | 0 |
| `GlobalLanguage` | 11 | 0 |
| `GlobalLanguageAttributeTypes` | 0 | 19 |
| `GlobalLanguageElement` | 5 | 0 |
| `GlobalLanguageElementFunction` | 4 | 0 |
| `GlobalLanguageElementFunctionGroup` | 2 | 0 |
| `GlobalLanguageKeyCode` | 4 | 0 |
| `GlobalLanguageSource` | 0 | 4 |
| `GlobalLanguageType` | 0 | 5 |
| `GlobalLanguageVersionAttribute` | 5 | 0 |

## `ButtonMapping`, 9 contracts

| contract | fields | enum values |
|---|---|---|
| `AbstractButton` | 2 | 0 |
| `AbstractButtonAssignment` | 0 | 0 |
| `ButtonMap` | 6 | 0 |
| `ButtonMapButtonAssignment` | 1 | 0 |
| `ChannelButtonAssignment` | 2 | 0 |
| `CommandButtonAssignment` | 3 | 0 |
| `DeviceModeType` | 0 | 5 |
| `HardButton` | 0 | 0 |
| `UserModeMappingInfo` | 4 | 0 |

## `FunctionMapping`, 6 contracts

| contract | fields | enum values |
|---|---|---|
| `AbstractFunctionMap` | 2 | 0 |
| `ActivityFunctionMap` | 1 | 0 |
| `DeviceFunctionMap` | 1 | 0 |
| `FunctionAction` | 5 | 0 |
| `FunctionBase` | 1 | 0 |
| `FunctionGroup` | 1 | 0 |

## `Logging`, 5 contracts

| contract | fields | enum values |
|---|---|---|
| `ClientUserDataLog` | 7 | 0 |
| `SubType` | 0 | 4 |
| `TargetType` | 0 | 22 |
| `UserEventType` | 0 | 4 |
| `UserTargetOperation` | 0 | 151 |

## `Protocol`, 5 contracts

| contract | fields | enum values |
|---|---|---|
| `AbstractProtocol` | 2 | 0 |
| `BluetoothProtocol` | 0 | 0 |
| `HidProtocol` | 0 | 0 |
| `ProtocolList` | 1 | 0 |
| `UsbHidProtocol` | 0 | 0 |

## `Release321`, 5 contracts

| contract | fields | enum values |
|---|---|---|
| `HouseholdProduct` | 2 | 0 |
| `RefineActivityResponse` | 2 | 0 |
| `RolloutSettings` | 3 | 0 |
| `SaveDeviceWithFeatureRequest` | 1 | 0 |
| `SimpleRestSaveActivityRequest` | 3 | 0 |

## `Brand`, 4 contracts

| contract | fields | enum values |
|---|---|---|
| `AliasQualityTypes` | 0 | 4 |
| `BrandAliases` | 6 | 0 |
| `BrandTypes` | 0 | 2 |
| `Brands` | 5 | 0 |

## `SearchMatch`, 4 contracts

| contract | fields | enum values |
|---|---|---|
| `AbstractSearchMatch` | 2 | 0 |
| `CategorySearchMatch` | 0 | 0 |
| `DeviceSearchMatch` | 5 | 0 |
| `PublicDeviceSearchMatch` | 6 | 0 |

## `RemoteInventory`, 3 contracts

| contract | fields | enum values |
|---|---|---|
| `GetSyncStatusResult` | 0 | 4 |
| `NotifySyncStatusResult` | 0 | 2 |
| `SyncStatus` | 0 | 3 |

## `com/harmony/services/romdata`, 3 contracts

| contract | fields | enum values |
|---|---|---|
| `RequestOperationData` | 2 | 0 |
| `RequestRomData` | 2 | 0 |
| `RomOutput` | 1 | 0 |

## `Discovery`, 2 contracts

| contract | fields | enum values |
|---|---|---|
| `ServiceDescription` | 4 | 0 |
| `Services` | 3 | 0 |

## `Error`, 2 contracts

| contract | fields | enum values |
|---|---|---|
| `ErrorCodes` | 0 | 2 |
| `FaultDetail` | 3 | 0 |

## `Security`, 2 contracts

| contract | fields | enum values |
|---|---|---|
| `ActiveDirectoryMembershipUser` | 4 | 0 |
| `MembershipUser` | 13 | 0 |

## `AmazonS3`, 1 contracts

| contract | fields | enum values |
|---|---|---|
| `OperationType` | 0 | 3 |

## `Compile`, 1 contracts

| contract | fields | enum values |
|---|---|---|
| `CompileRequest` | 3 | 0 |

## `Device`, 1 contracts

| contract | fields | enum values |
|---|---|---|
| `InputInformation` | 2 | 0 |

## `RF`, 1 contracts

| contract | fields | enum values |
|---|---|---|
| `RfProtocol` | 1 | 0 |

## `Service`, 1 contracts

| contract | fields | enum values |
|---|---|---|
| `ClientInfo` | 3 | 0 |

## `Services`, 1 contracts

| contract | fields | enum values |
|---|---|---|
| `HelpDocument` | 5 | 0 |

## Declaring no area, 44 contracts

| contract | fields | enum values |
|---|---|---|
| `ActivityList` | 1 | 0 |
| `ChangeChannelRequest` | 4 | 0 |
| `ClientNetworkStatus` | 5 | 0 |
| `DSRequest` | 5 | 0 |
| `Data` | 1 | 0 |
| `DownloadContentPercentage` | 30 | 0 |
| `DragInputBase` | 11 | 0 |
| `FirmwareUpdateDetail` | 4 | 0 |
| `FirmwareUpdateRequest` | 1 | 0 |
| `GetRokuChannelRequest` | 1 | 0 |
| `HubIPScannedResult` | 2 | 0 |
| `JsonDeviceInfoResponse` | 5 | 0 |
| `JsonNetworkStatus` | 2 | 0 |
| `JsonPostResponse` | 5 | 0 |
| `JsonPostResponseError` | 2 | 0 |
| `JsonPostResponseStatus` | 1 | 0 |
| `JsonProvisioningRemoteResponse` | 4 | 0 |
| `JsonRemoteRequest` | 7 | 0 |
| `JsonRemoteResponse` | 6 | 0 |
| `JsonRemoteUnPairRequest` | 4 | 0 |
| `JsonRemoteUnit` | 14 | 0 |
| `JsonRemoteWriteResponse` | 3 | 0 |
| `JsonResponseForHubIPScan` | 2 | 0 |
| `JsonResult` | 3 | 0 |
| `PairAutomationGateway` | 1 | 0 |
| `PairedDevice` | 4 | 0 |
| `Pairing` | 4 | 0 |
| `ProductInfo` | 2 | 0 |
| `ProvisionHubResponse` | 2 | 0 |
| `ProvisionInfo` | 10 | 0 |
| `ProvisioningResult` | 5 | 0 |
| `ProxyPutRequest` | 4 | 0 |
| `ProxyResourceRequest` | 1 | 0 |
| `RemoveDeviceRequest` | 1 | 0 |
| `RemoveGatewayRequest` | 1 | 0 |
| `RokuFavoriteChannelResult` | 2 | 0 |
| `SavePairingResult` | 1 | 0 |
| `ScannedDevice` | 9 | 0 |
| `SendCommandRequest` | 1 | 0 |
| `ServerNetworkStatus` | 3 | 0 |
| `ServiceResponse` | 6 | 0 |
| `UnpairRequest` | 1 | 0 |
| `UserFeatureList` | 1 | 0 |
| `ZScanRequest` | 4 | 0 |
