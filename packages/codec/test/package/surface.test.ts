/**
 * `@harmony/codec`'s main entry, held to a list, plan 013 decision 6: a new public name is a
 * line in this file's diff, and so is one taken away. The lists are read off the entries' source,
 * `@harmony/testkit/surface`, which shows the types a loaded module does not, and each loaded module is held to the
 * same values, so a reading of the source that missed a name fails here.
 *
 * Four lists: the main entry, what an application reads, names, edits, starts a build with, checks before a write
 * and learns codes with; the Harmony Touch's view on it, the namespace `harmonyTouch`; the document toolkit on it, the namespace `recipe`; and what the Node entry adds
 * to the main entry, which it carries whole. The composers are `./build` and the format's parts `./internal`, each
 * module whole and held by no list, since they are not the designed surface.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { entryNames } from '@harmony/testkit/surface';

const ENTRY = new URL('../../src/index.ts', import.meta.url);
const TOUCH = new URL('../../src/families/harmony-touch/view.ts', import.meta.url);
const RECIPE = new URL('../../src/recipe/toolkit.ts', import.meta.url);
const NODE = new URL('../../src/node.ts', import.meta.url);
const MANIFEST = new URL('../../package.json', import.meta.url);

/** The main entry: the names that exist at run time. */
const VALUES = [
  'ACTIVITY_ROLE_NAMES', 'ArchiveError', 'ComposeError', 'Container', 'DEVICE_TYPE_NAMES', 'EditError',
  'EzFileError', 'GspmError', 'INTENDED_VERSION_FIELDS', 'NoFamilyError', 'NotBuiltError', 'PROTOCOLS', 'QueueError', 'RECIPE_VERSION', 'RecipeError',
  'ResourceError', 'SCREEN_SIZES', 'StateTableError', 'activities', 'activityBindings', 'activityCount',
  'activityNames', 'activityScreens', 'allChecksPass', 'applyEdits', 'assertQueueFits',
  'assertStateTableConsistent', 'buildFromRecipe', 'builtDigest', 'capabilitiesOf', 'chooseByModel', 'clockStateEdits', 'codeKey', 'commandsOfCodeset',
  'configLanguage', 'decodePayload', 'describeChoices', 'deviceCount', 'deviceDelays', 'deviceDriving',
  'deviceListRows', 'deviceModeMaps', 'deviceOfRecord', 'devices', 'encodePng', 'familyKind', 'familyOfModel',
  'fetchDevice', 'findDevices', 'framesOfPulses', 'fromFirstMark', 'harmonyTouch', 'identifyCodeset', 'introductionTour', 'inventory', 'irFrame',
  'irFrames', 'irGroups', 'irSendsPerPress', 'keyCodes', 'keyLabels', 'localTimestamp', 'manufacturersOfIndex',
  'metadataArchive', 'modelName', 'modelsOfIndex', 'networkArchiveSource', 'pageScans', 'parse', 'parseEzhex', 'payloadOf',
  'powerOnDelays', 'pulsesOfFrame', 'pulsesOfStatedCode', 'rasterPng', 'readPng', 'readPronto', 'readRecipe',
  'recipe', 'recipeTarget', 'renderPage', 'renderPages', 'renderVariants', 'saveEdits', 'setPageListEntry', 'setParameter',
  'setPowerOnDelay', 'setTimerDuration', 'skipIntroductionTour', 'statedCode', 'statedProtocol', 'summary',
  'supplyResources', 'timestampEdit', 'timestampOf', 'unstatedChoices', 'waveformOfArchiveCommand', 'writePronto',
];

/** The main entry: the types and interfaces, which only the source shows. */
const TYPES = [
  'Activity', 'ActivityBinding', 'ActivityName', 'ActivityRoleName', 'ActivityScreens', 'AnyFamily',
  'ArchiveManifest', 'ArchiveProtocol', 'BenchModelKey', 'BuildSources', 'Built', 'CarriedDevice', 'CatalogueCommand', 'CatalogueDevice', 'CatalogueManufacturer',
  'CatalogueModel', 'CatalogueSource', 'CodecResources', 'ConfigLanguage', 'Device', 'DeviceCache', 'DeviceChannelTuning',
  'DeviceDelays', 'DeviceDriving', 'DeviceInput', 'DeviceInputs', 'DeviceListRow', 'DeviceModeMap', 'DevicePower',
  'DeviceQuery', 'DeviceSearch', 'DeviceSource', 'DeviceState', 'DeviceTiming', 'DocumentFamily', 'DocumentTypes', 'Edit', 'EditReport', 'EzHex',
  'FoundDevice', 'Identification', 'InfraredCode', 'IntendedVersionField', 'IntroductionTour', 'Inventory', 'IrFrame', 'IrGroup',
  'KeyCode', 'KeyLabel', 'Metadata', 'MetadataCommand', 'MetadataDevice', 'ModelCapabilities', 'ModelChoice', 'ModelNamed',
  'ModelProperties', 'NetworkArchiveOptions', 'PngHeader',
  'PowerOnDelay', 'ProntoCode', 'Proof', 'Pulse', 'Raster', 'Recipe', 'RecipeActivity', 'RecipeActivityDevice',
  'RecipeActivityStep', 'RecipeChannelStep', 'RecipeCommand', 'RecipeCommandCode', 'RecipeCommandStep', 'RecipeDevice', 'RecipeDeviceKey', 'RecipeDevicePower',
  'RecipeFavourites', 'RecipeIds', 'RecipeKey', 'RecipeKeyAction', 'RecipeModel', 'RecipePress', 'RecipeScreenCommand', 'RecipeScreenItem',
  'RecipeSending', 'RecipeSequence', 'RecipeSequenceStep', 'RecipeSetting', 'RecipeTarget',
  'RenderedPage', 'Requirement', 'RequirementAnswer', 'RequirementState', 'RequirementStatus', 'RequirementWait', 'ScreenChoice', 'ScreenVariant', 'StatedCode', 'StatedProtocol',
];

/** The Harmony Touch's view, `harmonyTouch` on the main entry: the names that exist at run time. */
const TOUCH_VALUES = [
  'BETWEEN_STEPS_MS', 'CHANNEL_DEVICE_ORDER', 'CONFIGURATION_DOCUMENTS', 'CONTENT_DEVICE', 'CONTENT_SERVICE',
  'CONTENT_USER', 'DEFAULT_PRESS_REPEATS', 'DELETED_ON_REMOTE', 'FAVOURITES_ROLES', 'FIRMWARE_SETTINGS',
  'HARMONY_TOUCH_FAMILY', 'INFRARED_TRANSPORT', 'NUMBER_PAD_GROUP', 'NUMBER_PAD_LEFT', 'NUMBER_PAD_RIGHT',
  'SCREENS_IDENTIFIER', 'TIMING', 'TouchEngine', 'airtimeOf', 'checkConfiguration', 'documentKeyOf',
  'documentsOfAnswers', 'favouritesAddressFindings', 'findingsByRule', 'idText', 'kindOf', 'mapIdentifier',
  'numberPadKey', 'readConfiguration', 'readContext', 'readSettings', 'readerRaises', 'refusalsBeforeASync',
  'stationLogo', 'uploadedLogo',
];

/** The Harmony Touch's view, `harmonyTouch` on the main entry: the types and interfaces. */
const TOUCH_TYPES = [
  'Activity', 'ActivityAction', 'ActivityList', 'Airtime', 'Atom', 'Button', 'ButtonActionDocument', 'ButtonMap',
  'Carried', 'Channel', 'CodeSegment', 'Command', 'Configuration', 'ContentDevice', 'ContentService',
  'ContentUser', 'Context', 'Device', 'DeviceFeature', 'DeviceList', 'DeviceWithFeatures', 'DialPosition',
  'Encoding', 'FeatureAction', 'Finding', 'FirstFrame', 'Id', 'Input', 'IrProtocol', 'IrSegment', 'MapList',
  'Place', 'ProtocolList', 'ReadActivity', 'ReadActivityDevice', 'ReadActivityStep', 'ReadButton',
  'ReadButtonAction', 'ReadChannelTuning', 'ReadCommand', 'ReadContext', 'ReadDevice', 'ReadFavourite',
  'ReadFavourites', 'ReadFeatureAction', 'ReadInput', 'ReadMap', 'ReadPower', 'ReadProtocol', 'ReadRole',
  'ReadSequence', 'ReadSettings', 'Role', 'Rule', 'SegmentReference', 'Send', 'Sequence', 'Setting',
  'SettingValue', 'Settings', 'SyncAnswer', 'SyncDocuments', 'Timing', 'TouchTypes', 'Typed',
];

/** The document toolkit, `recipe` on the main entry: the names that exist at run time. */
const RECIPE_VALUES = [
  'ChangeRefused', 'PROBLEM_CODES', 'activities', 'addActivity', 'addDevice', 'addSequence', 'check', 'commands',
  'create', 'devices', 'favourites', 'inputs', 'key', 'keyNames', 'keys', 'move', 'open', 'remove', 'screen', 'sequences',
  'setActivity', 'setDevice', 'setDeviceCommand', 'setFavourites', 'setKey', 'setLook', 'setScreen', 'setSequence',
  'setSetting', 'unfilled', 'uses',
];

/** The document toolkit, `recipe` on the main entry: the types and interfaces. */
const RECIPE_TYPES = [
  'ActivityChanges', 'ActivityDeviceChoice', 'ActivityId', 'ActivityStep', 'ActivitySummary', 'Change',
  'CommandCode', 'CommandSummary', 'CommandTuningAnswer', 'DeviceChanges', 'DeviceId', 'DeviceSettingsAnswer', 'DeviceSummary',
  'Effect', 'Favourite', 'KeyAction', 'KeyAnswer', 'KeyBinder', 'KeyPlace', 'KeyPlaceSummary', 'KeySurface', 'Movable',
  'NewActivity', 'NewDevice', 'NewSequence', 'Owner', 'Place', 'PressAnswer', 'Problem', 'ProblemCode', 'QuestionSources',
  'Removable', 'ScreenAnswer', 'ScreenEntryAnswer', 'ScreenItem', 'SendingAnswer', 'SequenceAnswer', 'SequenceId',
  'SequenceStep', 'SequenceStepAnswer', 'SequenceSummary', 'SettingAnswer',
];

/** What the Node entry adds to the main entry: the names that exist at run time. */
const NODE_VALUES = [
  'NODE_RESOURCES', 'archiveAt', 'archiveManifest', 'archiveProtocols', 'archiveSourceAt', 'carryCodes', 'catalogueByRhythm', 'catalogueCommands',
  'catalogueDevice', 'catalogueDriving', 'catalogueManufacturers', 'catalogueModels', 'catalogueRules',
  'codeIndex', 'rawCaptureDevice', 'rawCaptureLine', 'rawDerivedState', 'segmentLengthsModule', 'statedSha256',
];

/** What the Node entry adds to the main entry: the types and interfaces, which only the source shows. */
const NODE_TYPES: string[] = [];

/** Every subpath `package.json` exports, `.` the main entry. */
const SUBPATHS = [
  '.', './node', './build', './internal',
];

test('the main entry exports exactly its list, by explicit names', async () => {
  const names = entryNames(ENTRY);
  assert.deepEqual(names.starExports, [], 'an export * makes every name of a module public by default');
  assert.deepEqual(names.values, VALUES);
  assert.deepEqual(names.types, TYPES);
  // The loaded module agrees with the reading of its source.
  assert.deepEqual(Object.keys(await import(ENTRY.href)).sort(), VALUES);
});

test('the Harmony Touch on the main entry is its view, by explicit names, and no composer', async () => {
  const names = entryNames(TOUCH);
  assert.deepEqual(names.starExports, []);
  assert.deepEqual(names.values, TOUCH_VALUES);
  assert.deepEqual(names.types, TOUCH_TYPES);
  const { harmonyTouch } = await import(ENTRY.href) as { harmonyTouch: Record<string, unknown> };
  assert.deepEqual(Object.keys(harmonyTouch).sort(), TOUCH_VALUES);
  // The control: the composers are on `./build`'s namespace of the same name, so this is a boundary and not a loss.
  const build = await import('../../src/build.ts');
  assert.equal(typeof build.harmonyTouch.composeTouchDeviceOfRow, 'function');
  assert.equal(harmonyTouch['composeTouchDeviceOfRow'], undefined);
});

test('the document toolkit on the main entry is its own list, by explicit names', async () => {
  const names = entryNames(RECIPE);
  assert.deepEqual(names.starExports, []);
  assert.deepEqual(names.values, RECIPE_VALUES);
  assert.deepEqual(names.types, RECIPE_TYPES);
  const { recipe } = await import(ENTRY.href) as { recipe: Record<string, unknown> };
  assert.deepEqual(Object.keys(recipe).sort(), RECIPE_VALUES);
});

test('the Node entry is the main entry whole and its own list', async () => {
  const names = entryNames(NODE);
  // The one export * is the main entry, whose names are its own list.
  assert.deepEqual(names.starExports, ['./index.ts']);
  assert.deepEqual(names.values, NODE_VALUES);
  assert.deepEqual(names.types, NODE_TYPES);
  assert.deepEqual(Object.keys(await import(NODE.href)).sort(), [...VALUES, ...NODE_VALUES].sort());
});

test('the package exports exactly its list of subpaths', () => {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { exports: Record<string, string> };
  assert.deepEqual(Object.keys(manifest.exports), SUBPATHS);
});
