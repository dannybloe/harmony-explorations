/**
 * The one Harmony config codec.
 *
 * "One" is the point: `CLAUDE.md` bans a second PIC18 opcode table because two diverging copies
 * once produced readable but wrong listings, and the same reasoning applies here. The Python
 * container parser stays in `src/harmony/` for the reverse engineering tools, and the two are
 * held equal by golden vectors until it is retired.
 *
 * **This entry loads anywhere**, an Electron renderer or a browser as well as Node, plan 013 decision 5: nothing it
 * reaches imports a Node module or names a Node global, `test/mainentry.test.ts`. What reads the disk is the Node
 * entry's, `@harmony/codec/node`, `node.ts`, which carries this one whole as well; a builder that needs the catalogue
 * is handed a `CatalogueSource`, and one that draws a letter, an icon or a picture asks for what the loader supplies,
 * `resources.ts`.
 */
export * as bytes from './bytes.ts';
export * from './gspm.ts';
export * from './ezhex.ts';
export * from './valuemap.ts';
export * from './screen.ts';
export * from './sections.ts';
export * from './ir.ts';
// **Exported since 13 August 2026, and its absence was a defect rather than an omission.** `ir.ts`
// held a second function called `irFrame`, and a barrel that exports one of two same named readers
// exports whichever file it lists: `import { irFrame } from '@harmony/codec'` got the heuristic one,
// which read a neighbouring record's durations, while the tested decoder here was reachable only by
// file path. The wrong one is gone and this is the only `irFrame` now.
export * from './irframe.ts';
export * from './irda.ts';
// **The rhythm table and the reader over it, exported because the application is what consumes them.**
// They were reachable only by file path until 24 August 2026, which is the shape of defect the comment
// above records: FreeHarmony carried its own reader for Logitech's catalogue notation for weeks, taking
// 1221 of 5219 commands against this one's 2921 of 2921 distinct codes, and a barrel that does not offer
// a reader is part of why a second one gets written.
export * from './protocols.ts';
export * from './stated.ts';
// After both, since it composes them. Section 139.
export * from './summary.ts';
export * from './actions.ts';
export * from './emit.ts';
export * from './tables.ts';
export * from './touch.ts';
export * from './inventory.ts';
export * from './font.ts';
export * from './alphabets.ts';
export * from './text.ts';
export * from './language.ts';
export * from './render.ts';
export * from './png.ts';
export * from './coverage.ts';
// Which screen bytes are the same on every configuration of a model, which draw run time state, and
// which follow from the setup. After the coverage, since it cuts up what the byte accounting claims.
// Section 317.
export * from './screencategories.ts';
export * from './edit.ts';
// The order a key list is stored in, section 315; mode 0's own list is the four slot family's since
// todo-compile-one 3.3.3.2, families/harmony-600-650-700/modezero.ts.
export * from './modezero.ts';
export * from './queue.ts';
export * from './growth.ts';
export * from './relocate.ts';
// The container's frame laid out from content, todo-compile-650 10.1.
export * from './frame.ts';
// What Logitech parks in front of a table, and the bank, placed from the content, todo-compile-650 10.5.
export * from './placer.ts';
// The state variables, value maps and name tree built from a description, todo-compile-650 10.3.
export * from './statetables.ts';
// The log area and the parameter block built for an architecture, todo-compile-one 6.4.
export * from './firmwaresections.ts';
// The engine the families' wiring is built on, sections 347 and 410; the Harmony 600, 650 and 700's own
// catalogue, todo-compile-650 10.2, is families/harmony-600-650-700/wiring.ts since todo-compile-one 3.3.3.2.
export { WiringError, builtPieces, withWiring } from './wiringparts.ts';
export type { BuiltWiring, DeviceTimer, WiringChecked, WiringInstruction } from './wiringparts.ts';
export * from './compose.ts';
// The machinery every family builds a mode record with, reading its frame, building its pieces and placing
// them, sections 356 and 357. The Harmony 600, 650 and 700's own three screen records and their state
// backgrounds are that family's since todo-compile-one 3.3.3.2, families/harmony-600-650-700/screenrecords.ts and
// backgrounds.ts, and the screen part encoder is screenparts.ts.
export * from './screenrecords.ts';
export * from './screenparts.ts';
// The firmware's own screens built whole from a description, todo-compile-650 7.4, section 357, on
// `screenrecords.ts`'s reading, building and placing.
// Every text of a configuration generated from its word and its font, its place by its screen's rule and
// its form by the first copy, todo-compile-650 8.1, section 358. After the screens it rewrites the texts of.
// The Harmony 650's pictures, those drawn by rule built from their drawing and the artwork named,
// todo-compile-650 9.1, section 363.
export * from './pictures.ts';
export * from './raster.ts';
export * from './typeface.ts';
export * from './lettering.ts';
export * from './blending.ts';
export * from './fonttable.ts';
// Letters a Logitech compile lacks, copied from another compile of the same remotes in the same face, until our
// own letters replace them, todo-compile-885.md 1.6 and chapter 8.
export * from './glyphborrow.ts';
// **The metadata archive**, section 260: the ZIP two architectures carry inside the container,
// which on arch 16 (Harmony 300 and 350) names every device and every command. Exported for the
// same reason the archive readers below are: FreeHarmony is what wants a command's name, and
// what it must not do is grow a second reader for a format we already read.
export * from './metadata.ts';
// And the deflate it writes with, our own, which writes the stream stock zlib writes at its defaults, as Logitech's
// compiler does, todo-compile-350.md 5.1.4.
export * from './deflate.ts';
// **The infrared archive's two readers**, added 31 August 2026 for the reason the `protocols.ts`
// comment above records: FreeHarmony is what consumes a device catalogue, and a barrel that does not
// offer a reader is part of why a second one gets written. `archive.ts` reads Logitech's protocol
// definitions and `catalogue.ts` their device catalogue, out of the same public checkout. Since todo.md
// 7.3.5 these parse what they are handed and the files are read on the Node entry, `*.node.ts`.
export * from './archive.ts';
export * from './catalogue.ts';
// And how to drive a catalogue device, from the archive's schema version 2: power, inputs, channel
// entry, states and timing, section 305.
export * from './driving.ts';
// And what the archive drops from those rules, out of the raw capture behind it, attached through one door,
// `catalogueRules`: whether a state step sends, how Logitech numbers an input, and its connected app mark.
export * from './catalogueraw.ts';
// And what of that a composed device takes: its power actions and its three delays as the catalogue
// states them, section 320.
export * from './devicepower.ts';
// And what those rules become in a configuration: a device's input and state variables, composed and
// read back, section 321. After `compose.ts` and `driving.ts`, which it builds on.
export * from './inputs.ts';
// And how the compiler lays a whole device out in device mode: which commands go to the keys and which
// to the screen pages, in what order, and how a label is sized and split, section 325.
export * from './devicemode.ts';
// A catalogue device composed whole, and several of them in one run, todo-compile-650 2.7. After every
// composer it calls: the device, its power, its inputs and its device mode.
export * from './composecatalogue.ts';
// A sequence, several commands and pauses on one key or screen item, composed within the action queue,
// todo-compile-650 4.2. After `compose.ts`, whose list append it uses.
export * from './sequence.ts';
// Pronto Hex, which is not the archive's format but is how the comparison against it is made, and is
// the interchange spelling anybody importing or exporting one command will reach for.
export * from './pronto.ts';
// An activity's keypad map and screen commands from its roles, section 323. After `compose.ts`, whose
// rows and errors it uses.
export * from './activityroles.ts';
// Which action lists a configuration names, and dropping the ones nothing names, the renumbering the
// assembly runs; the assembly itself, todo-compile-650 10.6, is families/harmony-600-650-700/assemble.ts since
// todo-compile-one 3.3.3.2.
export * from './assemble.ts';
// The setup's devices and activities composed onto a donor, every family's steps, plan 007.
export * from './shared/setup.ts';
// The recipe a configuration of ours is built from, todo-compile-650 10.7.4, `docs/recipe.md`.
export * from './recipe/recipe.ts';
// The family that builds for a model, of either kind, or the refusal naming it, plan 013 decisions 1 and 2. The
// families themselves stay behind the registry; what a caller choosing by model needs is the answer and its kind.
export {
  chooseByModel, familyKind, familyOfModel, NoFamilyError, type AnyFamily, type ModelChoice, type ModelNamed,
} from './families/registry.ts';
export type { DocumentFamily, DocumentTypes } from './families/document.ts';
export * from './icons.ts';
// What the codec asks its loader for, fonts, the icon list, a PNG's deflate and SHA-256, todo.md 7.3.5.
export * from './resources.ts';
// The Harmony 300 and 350's family, plan 007, its device composer, todo-compile-350.md 4.1 and 4.4, its
// favourite channels, 4.3, its activity, 4.2, and a whole setup, 4.5.
export {
  ACTIVITY_FLAG, composeNoScreenActivity, type ComposedNoScreenActivity, type NoScreenActivityRequest, WATCH_TV_SCAN, mapOfGroup,
  composeNoScreenDevice, composeNoScreenFavourites, type ComposedNoScreenDevice, type ComposedNoScreenFavourites,
  DEVICE_KEYS, FAVOURITE_SCANS, inCompilerOrder, LONG_PRESS_GROUP_BASE, NO_SCREEN_FAMILY, NO_SCREEN_HARD_KEYS,
  NO_SCREEN_SENDS, NUMBER_SENDER_BAND, type NoScreenDeviceRequest, type NoScreenFavouritesRequest, powerOnWaits,
  type AccountDevice, DIGIT_COPIES_BY_TYPE, RECEIVER_TYPE, TELEVISION_TYPE, volumeSource,
  type RemovedNoScreenDevice, withoutNoScreenDevice, composeNoScreenSetup, type ComposedNoScreenSetup, devicePlaces,
  type DevicePlace, groupOfPlace, type NoScreenSetupRequest,
  // Its constant sections and lists, todo-compile-350.md 5.1.3.
  HOLD_TIME, NO_SCREEN_PARAMETERS, noScreenDigitEntryTable, noScreenLogArea, noScreenParameterBlock, noScreenSendEventEntries,
  noScreenSendEventLists, type NoScreenSendEventNumbers, noScreenStartUpLists, type NoScreenStartUpNumbers, noScreenStartUpTable,
  SEND_EVENT_PINS, type SendEventLists, SENDING_FLAG, START_UP_EVENT_COUNT, START_UP_OWN_EVENTS, startUpGroup,
  // The entry binding event 0xFF that makes a Harmony 300 send from groups 4 to 7, todo-compile-350.md 5.4.
  ACKNOWLEDGED_AS, noScreenAcknowledgingEntry, UNMASKED_SEND_EVENT,
  // Its state tables and the allocator of a setup's variables, todo-compile-350.md 5.1.2.
  buildNoScreenStateTables, NO_SCREEN_FIRMWARE_STATE_RECORDS, NO_SCREEN_NARROW_MAX, NO_SCREEN_STATE_TABLES, type NoScreenStateDevice,
  type NoScreenStateRequest, type NoScreenStateTables, noScreenStateVariables, type NoScreenStateVariables, type NoScreenVariableRole,
  NO_SCREEN_METADATA_AFTER, NO_SCREEN_METADATA_BEFORE, type NoScreenMetadataChoices, type NoScreenMetadataDevice,
  noScreenMetadataSection, noScreenMetadataXml, noScreenZipTime, ZIP_TIME_BEFORE_STAMP_SECONDS,
  // The configuration with no device and no activity, built from nothing, todo-compile-350.md 5.1.5.
  buildEmptyNoScreenConfiguration, EMPTY_LIST_NUMBERS, EMPTY_ZONE_HOURS, type EmptyNoScreenConfiguration,
  type EmptyNoScreenOptions, INFRARED_GROUPS_BY_SKIN, infraredGroupsOf, NO_SCREEN_COUNT_WIDTHS,
  // A whole setup composed onto that configuration, so built with no Logitech file, todo-compile-350.md 5.1.6.
  buildNoScreenSetup, type NoScreenSetupFromNothing,
  // Which generator writes each byte, and the list writers it reads every list back through, todo-compile-350.md 5.2.1.
  NO_SCREEN_ATTRIBUTIONS, type NoScreenAttributed, type NoScreenAttribution, noScreenAttributedBytes, type NoScreenAttributionOptions,
  noScreenRegions, NO_SCREEN_LIST_KINDS, type ListKind, type ListNames, sendList, powerOnList, gateList, flipList, resetList, pressList,
  selectList, activityList, type ActivityStepWrite, conditionList, type ConditionArm, writesList, channelNumberList, channelDigitsList,
  readChannelDigits, keyTimerRecords, numberSenderBlock, TIMER_RECORD_LENGTH,
} from './families/harmony-300-350/index.ts';
// The bookkeeping of an attribution, the ledger every family's could share, todo-compile-350.md 5.2.1.
export * from './attribution.ts';
// **The Harmony Touch's configuration**, todo-touch.md 3.3: not a container but Logitech's JSON documents,
// which the remote fetches through the computer and keeps itself. Read into a typed view and checked for
// what the remote would refuse or ignore. One namespace rather than a star export, because "touch" names
// the Harmony One's touch panel elsewhere in this codec, `touch.ts`, and the two must not meet by name.
export * as harmonyTouch from './families/harmony-touch/index.ts';
