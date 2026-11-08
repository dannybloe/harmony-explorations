/**
 * `@harmony/codec`, the main entry: the one Harmony configuration codec as an application uses it, to read a
 * configuration, show its devices, activities and screens, edit it, start a build, check it before a write, and
 * learn and name infrared codes.
 *
 * "One" is the point: `CLAUDE.md` bans a second PIC18 opcode table because two diverging copies once produced
 * readable but wrong listings, and the same reasoning applies here. The Python container parser stays in
 * `src/harmony/` for the reverse engineering tools, and the two are held equal by golden vectors.
 *
 * **Explicit names, grouped by what an application does with them**, `todo.md` 7.3.6 and plan 013 decision 6;
 * `test/surface.test.ts` holds the list, so a new public name is a line in that list's diff. Everything else
 * this package offers is under a named subpath, each module whole: `./build` holds the composers and builders,
 * which stay off this entry by plan 007, and `./internal` the format's parts below the application's view, for
 * this repository's scripts, tests and libraries. A name here may also be reached through the subpath that
 * carries its module; a caller that needs only this entry imports it from here.
 *
 * **This entry loads anywhere**, an Electron renderer or a browser as well as Node, plan 013 decision 5:
 * nothing it reaches imports a Node module or names a Node global, `test/mainentry.test.ts`, and the same holds
 * for `./build` and `./internal`. What reads the disk is the Node entry's, `@harmony/codec/node`, `node.ts`,
 * which carries this one whole as well; a builder that needs the catalogue is handed a `CatalogueSource`, and
 * one that draws a letter, an icon or a picture asks for what the loader supplies, `resources.ts`.
 */

// What the codec asks its loader for, the fonts, the icon list, a PNG's deflate and SHA-256: supplied by the
// Node entry, or by a renderer through `supplyResources` before it builds. Reading asks for none of them.
export { ResourceError, supplyResources } from './resources.ts';
export type { CodecResources } from './resources.ts';

// Reading a configuration: the container out of its bytes, or out of Logitech's EzHex file, and what it says
// about itself.
export { Container, GspmError, parse, timestampOf } from './gspm.ts';
export { summary } from './summary.ts';
export { configLanguage } from './language.ts';
export type { ConfigLanguage } from './language.ts';
export { allChecksPass, decodePayload, EzFileError, INTENDED_VERSION_FIELDS, parseEzhex, payloadOf } from './ezhex.ts';
export type { EzHex, IntendedVersionField } from './ezhex.ts';
// The names a Harmony 300 or 350 keeps of its devices and their commands, in the archive inside its container.
export { metadataArchive } from './metadata.ts';
export type { Metadata, MetadataCommand, MetadataDevice } from './metadata.ts';

// Its devices and activities: what each device is and sends, what each activity starts and binds, the device
// mode maps and the keys, and the delays.
export {
  activities,
  activityBindings,
  activityCount,
  activityNames,
  activityScreens,
  deviceCount,
  deviceDelays,
  deviceListRows,
  deviceModeMaps,
  devices,
  inventory,
  keyCodes,
  keyLabels,
  pageScans,
  powerOnDelays,
} from './inventory.ts';
export type {
  Activity,
  ActivityBinding,
  ActivityName,
  ActivityScreens,
  Device,
  DeviceDelays,
  DeviceListRow,
  DeviceModeMap,
  InfraredCode,
  Inventory,
  KeyCode,
  KeyLabel,
  PowerOnDelay,
} from './inventory.ts';

// Its screens, drawn as the remote draws them, and a drawing written as a PNG.
export { describeChoices } from './inventory.ts';
export { renderPage, renderPages, renderVariants, SCREEN_SIZES } from './render.ts';
export type { Raster, RenderedPage, ScreenChoice, ScreenVariant } from './render.ts';
export { encodePng, rasterPng, readPng } from './png.ts';
export type { PngHeader } from './png.ts';

// Editing it in place: the edits a configuration takes without changing length, and the stamp a save gives it.
export {
  applyEdits,
  clockStateEdits,
  EditError,
  introductionTour,
  localTimestamp,
  saveEdits,
  setPageListEntry,
  setParameter,
  setPowerOnDelay,
  setTimerDuration,
  skipIntroductionTour,
  timestampEdit,
} from './edit.ts';
export type { Edit, EditReport, IntroductionTour } from './edit.ts';

// Building: the recipe a build starts from, and the family that builds for a model, of either kind, or the
// refusal naming it, plan 013 decisions 1 and 2. A document family builds through its own members; the
// composers and the builders of a compiled family's container are `./build`.
export { readRecipe, recipeTarget, RecipeError } from './recipe/recipe.ts';
export type {
  Recipe,
  RecipeActivity,
  RecipeActivityDevice,
  RecipeDevice,
  RecipeFavourites,
  RecipeModel,
  RecipeScreenItem,
  RecipeSequenceStep,
  RecipeTarget,
} from './recipe/recipe.ts';
export { ACTIVITY_ROLE_NAMES } from './activityroles.ts';
export type { ActivityRoleName } from './activityroles.ts';
export { chooseByModel, familyKind, familyOfModel, modelName, NoFamilyError } from './families/registry.ts';
export type { AnyFamily, ModelChoice, ModelNamed } from './families/registry.ts';
export type { DocumentFamily, DocumentTypes } from './families/document.ts';
export { ComposeError } from './shared/core.ts';

// Before a write: the checks a writer runs before anything is erased, the action queue's peak depth and the
// state table's sizing.
export { assertQueueFits, QueueError } from './queue.ts';
export { assertStateTableConsistent, StateTableError } from './sections.ts';

// Infrared: a configuration's codes, a code heard or learned cut into frames, Pronto Hex, our rhythm table, and
// Logitech's device catalogue and protocol archive as parsed from what a caller hands over (the Node entry reads
// them off the disk).
export { irGroups } from './ir.ts';
export type { IrGroup } from './ir.ts';
export { framesOfPulses, fromFirstMark, irFrame, irFrames, irSendsPerPress, pulsesOfFrame } from './irframe.ts';
export type { IrFrame, Pulse } from './irframe.ts';
export { readPronto, writePronto } from './pronto.ts';
export type { ProntoCode } from './pronto.ts';
export { PROTOCOLS } from './protocols.ts';
export type { StatedProtocol } from './protocols.ts';
export { pulsesOfStatedCode, statedCode, statedProtocol } from './stated.ts';
export type { StatedCode } from './stated.ts';
export { ArchiveError, waveformOfArchiveCommand } from './archive.ts';
export type { ArchiveManifest, ArchiveProtocol } from './archive.ts';
export {
  codeKey,
  commandsOfCodeset,
  DEVICE_TYPE_NAMES,
  deviceOfRecord,
  identifyCodeset,
  manufacturersOfIndex,
  modelsOfIndex,
} from './catalogue.ts';
export type {
  CatalogueCommand,
  CatalogueDevice,
  CatalogueManufacturer,
  CatalogueModel,
  CatalogueSource,
  Identification,
} from './catalogue.ts';
export { deviceDriving } from './driving.ts';
export type {
  DeviceChannelTuning,
  DeviceDriving,
  DeviceInput,
  DeviceInputs,
  DevicePower,
  DeviceState,
  DeviceTiming,
} from './driving.ts';

// **The Harmony Touch's configuration**: not a container but Logitech's documents, which the remote fetches
// through the computer and keeps itself. Read into a typed view, checked for what the remote would refuse or
// ignore, its engine's sends predicted, and its family. One namespace, `harmonyTouch`, kept apart by name from
// the families of the compiled remotes; its composers are the namespace of the same name on `./build`.
export * as harmonyTouch from './families/harmony-touch/view.ts';
