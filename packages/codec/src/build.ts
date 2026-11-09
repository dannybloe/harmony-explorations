/**
 * `@harmony/codec/build`: the composers and builders, each module whole, `todo.md` 7.3.6. Off the main entry by
 * plan 007, which keeps a composer of one part behind its family and the registry: an application starts a build
 * from the main entry's recipe and registry, and what composes a device, an activity, a screen or a whole
 * container is reached here by this repository's scripts, tests and the libraries built on the codec.
 *
 * It loads anywhere, as the main entry does, `test/mainentry.test.ts`; a builder that draws a letter, an icon or
 * a picture asks for what the loader supplies, so a Node caller imports `@harmony/codec/node` as well.
 */

// The composers of a device, an activity, a menu row and a screen, every family's shared steps, plan 007; the
// family's traits and choices they ask.
export * from './compose/compose.ts';
// The setup's devices and activities composed onto a donor, and the checks of the result.
export * from './shared/setup.ts';
// The parts those composers are built from: a catalogue device whole and several in one run, its power, its
// inputs and its device mode; a sequence within the action queue; an activity's map and screen from its roles.
export * from './compose/composecatalogue.ts';
export * from './compose/devicepower.ts';
export * from './compose/inputs.ts';
export * from './compose/devicemode.ts';
export * from './compose/sequence.ts';
export * from './compose/activityroles.ts';
// The assembly's renumbering, the container's frame laid out from content, and what is placed in front of a
// table and in the picture bank.
export * from './assembly/assemble.ts';
export * from './assembly/frame.ts';
export * from './assembly/placer.ts';
// The state variables, value maps and name tree; the log area and the parameter block; the engine the families'
// wiring is built on.
export * from './assembly/statetables.ts';
export * from './assembly/firmwaresections.ts';
export { WiringError, builtPieces, withWiring } from './assembly/wiringparts.ts';
export type { BuiltWiring, DeviceTimer, WiringChecked, WiringInstruction } from './assembly/wiringparts.ts';
// The machinery every family builds a mode record with, and the screen part encoder.
export * from './compose/screenrecords.ts';
export * from './compose/screenparts.ts';
// Pictures and letters: the pictures drawn by rule, the rasteriser, our typeface and its lettering, the blended
// sets, the font table, letters borrowed from another compile, and the icons.
export * from './drawing/pictures.ts';
export * from './drawing/raster.ts';
export * from './drawing/typeface.ts';
export * from './drawing/lettering.ts';
export * from './drawing/blending.ts';
export * from './drawing/fonttable.ts';
export * from './drawing/glyphborrow.ts';
export * from './drawing/icons.ts';
// The bookkeeping of an attribution, which generator wrote each byte, the ledger every family's could share.
export * from './assembly/attribution.ts';
// The Harmony 300 and 350's family, plan 007: its composers of a device, its favourite channels, its activity and
// a whole setup; its constant sections and lists; its state tables and the allocator of a setup's variables; its
// metadata archive; the configuration with no device and no activity and a whole setup built from nothing; and
// which generator writes each byte, with the list writers it reads every list back through.
export {
  ACTIVITY_FLAG, composeNoScreenActivity, type ComposedNoScreenActivity, type NoScreenActivityRequest, WATCH_TV_SCAN, mapOfGroup,
  composeNoScreenDevice, composeNoScreenFavourites, type ComposedNoScreenDevice, type ComposedNoScreenFavourites,
  DEVICE_KEYS, FAVOURITE_SCANS, inCompilerOrder, LONG_PRESS_GROUP_BASE, NO_SCREEN_FAMILY, NO_SCREEN_HARD_KEYS,
  NO_SCREEN_SENDS, NUMBER_SENDER_BAND, type NoScreenDeviceRequest, type NoScreenFavouritesRequest, powerOnWaits,
  type AccountDevice, DIGIT_COPIES_BY_TYPE, RECEIVER_TYPE, TELEVISION_TYPE, volumeSource,
  type RemovedNoScreenDevice, withoutNoScreenDevice, composeNoScreenSetup, type ComposedNoScreenSetup, devicePlaces,
  type DevicePlace, groupOfPlace, type NoScreenSetupRequest,
  HOLD_TIME, NO_SCREEN_PARAMETERS, noScreenDigitEntryTable, noScreenLogArea, noScreenParameterBlock, noScreenSendEventEntries,
  noScreenSendEventLists, type NoScreenSendEventNumbers, noScreenStartUpLists, type NoScreenStartUpNumbers, noScreenStartUpTable,
  SEND_EVENT_PINS, type SendEventLists, SENDING_FLAG, START_UP_EVENT_COUNT, START_UP_OWN_EVENTS, startUpGroup,
  ACKNOWLEDGED_AS, noScreenAcknowledgingEntry, UNMASKED_SEND_EVENT,
  buildNoScreenStateTables, NO_SCREEN_FIRMWARE_STATE_RECORDS, NO_SCREEN_NARROW_MAX, NO_SCREEN_STATE_TABLES, type NoScreenStateDevice,
  type NoScreenStateRequest, type NoScreenStateTables, noScreenStateVariables, type NoScreenStateVariables, type NoScreenVariableRole,
  NO_SCREEN_METADATA_AFTER, NO_SCREEN_METADATA_BEFORE, type NoScreenMetadataChoices, type NoScreenMetadataDevice,
  noScreenMetadataSection, noScreenMetadataXml, noScreenZipTime, ZIP_TIME_BEFORE_STAMP_SECONDS,
  buildEmptyNoScreenConfiguration, EMPTY_LIST_NUMBERS, EMPTY_ZONE_HOURS, type EmptyNoScreenConfiguration,
  type EmptyNoScreenOptions, INFRARED_GROUPS_BY_SKIN, infraredGroupsOf, NO_SCREEN_COUNT_WIDTHS,
  buildNoScreenSetup, type NoScreenSetupFromNothing,
  NO_SCREEN_ATTRIBUTIONS, type NoScreenAttributed, type NoScreenAttribution, noScreenAttributedBytes, type NoScreenAttributionOptions,
  noScreenRegions, NO_SCREEN_LIST_KINDS, type ListKind, type ListNames, sendList, powerOnList, gateList, flipList, resetList, pressList,
  selectList, activityList, type ActivityStepWrite, conditionList, type ConditionArm, writesList, channelNumberList, channelDigitsList,
  readChannelDigits, keyTimerRecords, numberSenderBlock, TIMER_RECORD_LENGTH,
} from './families/harmony-300-350/index.ts';
// **The whole builds of the two screen families**, on no entry until `todo.md` 7.3.9's walk found them reached by
// scripts and tests alone, so an application could compose onto a donor but could not build a Harmony 600, 650 or
// 700 configuration from a setup, nor a Harmony One from nothing, nor the empty Harmony 600 family configuration a
// setup is composed onto. The family's own entry points and what a caller
// checks or compares a result with; the attributions, which say which generator wrote each byte, stay with the
// scripts and tests that read them by path.
export { assembleSetup, checkAssembled, type Assembled } from './families/harmony-600-650-700/assemble.ts';
export {
  buildEmptyFourSlotConfiguration, EmptyConfigurationError, type EmptyConfiguration, type EmptyFourSlotOptions,
} from './families/harmony-600-650-700/empty.ts';
export { FOUR_SLOT_CHOICES, fourSlotChoices, type FourSlotChoices } from './families/harmony-600-650-700/choices.ts';
export {
  compareViews, setupView, type CompareOptions, type SetupView, type ViewDifference, type ViewItem,
} from './families/harmony-600-650-700/compare.ts';
export {
  buildEmptyOneConfiguration, EmptyOneError, type EmptyOneConfiguration, type EmptyOneOptions,
} from './families/harmony-one/empty.ts';
export {
  compareOneViews, oneView, type OneView, type OneViewDifference, type OneViewOptions, type OneViewResult,
} from './families/harmony-one/view.ts';
// **The Harmony Touch's folder whole**: its documents, reader and check as on the main entry, and its composers,
// its documents built from nothing, its definitions and its engine's packet. The same namespace name as the main
// entry's narrower one, so a caller that needs a composer changes the import line and nothing else.
export * as harmonyTouch from './families/harmony-touch/index.ts';
