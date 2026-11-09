/**
 * `@harmony/codec`'s main entry, held to a list, `todo.md` 7.3.6 and plan 013 decision 6: a new public name is a
 * line in this file's diff, and so is one taken away. The lists are read off the entries' source,
 * `@harmony/testkit/surface`, which shows the types a loaded module does not, and each loaded module is held to the
 * same values, so a reading of the source that missed a name fails here.
 *
 * Three lists: the main entry, what an application reads, names, edits, starts a build with, checks before a write
 * and learns codes with; the Harmony Touch's view on it, the namespace `harmonyTouch`; and what the Node entry adds
 * to the main entry, which it carries whole. The composers are `./build` and the format's parts `./internal`, each
 * module whole and held by no list, since they are not the designed surface.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { entryNames } from '@harmony/testkit/surface';

const ENTRY = new URL('../../src/index.ts', import.meta.url);
const TOUCH = new URL('../../src/families/harmony-touch/view.ts', import.meta.url);
const NODE = new URL('../../src/node.ts', import.meta.url);
const MANIFEST = new URL('../../package.json', import.meta.url);

/** The main entry: the names that exist at run time. */
const VALUES = [
  'ACTIVITY_ROLE_NAMES', 'ArchiveError', 'ComposeError', 'Container', 'DEVICE_TYPE_NAMES', 'EditError',
  'EzFileError', 'GspmError', 'INTENDED_VERSION_FIELDS', 'NoFamilyError', 'PROTOCOLS', 'QueueError', 'RecipeError',
  'ResourceError', 'SCREEN_SIZES', 'StateTableError', 'activities', 'activityBindings', 'activityCount',
  'activityNames', 'activityScreens', 'allChecksPass', 'applyEdits', 'assertQueueFits',
  'assertStateTableConsistent', 'buildFromRecipe', 'builtDigest', 'chooseByModel', 'clockStateEdits', 'codeKey', 'commandsOfCodeset',
  'configLanguage', 'decodePayload', 'describeChoices', 'deviceCount', 'deviceDelays', 'deviceDriving',
  'deviceListRows', 'deviceModeMaps', 'deviceOfRecord', 'devices', 'encodePng', 'familyKind', 'familyOfModel',
  'framesOfPulses', 'fromFirstMark', 'harmonyTouch', 'identifyCodeset', 'introductionTour', 'inventory', 'irFrame',
  'irFrames', 'irGroups', 'irSendsPerPress', 'keyCodes', 'keyLabels', 'localTimestamp', 'manufacturersOfIndex',
  'metadataArchive', 'modelName', 'modelsOfIndex', 'pageScans', 'parse', 'parseEzhex', 'payloadOf',
  'powerOnDelays', 'pulsesOfFrame', 'pulsesOfStatedCode', 'rasterPng', 'readPng', 'readPronto', 'readRecipe',
  'recipeTarget', 'renderPage', 'renderPages', 'renderVariants', 'saveEdits', 'setPageListEntry', 'setParameter',
  'setPowerOnDelay', 'setTimerDuration', 'skipIntroductionTour', 'statedCode', 'statedProtocol', 'summary',
  'supplyResources', 'timestampEdit', 'timestampOf', 'unstatedChoices', 'waveformOfArchiveCommand', 'writePronto',
];

/** The main entry: the types and interfaces, which only the source shows. */
const TYPES = [
  'Activity', 'ActivityBinding', 'ActivityName', 'ActivityRoleName', 'ActivityScreens', 'AnyFamily',
  'ArchiveManifest', 'ArchiveProtocol', 'BuildSources', 'Built', 'CatalogueCommand', 'CatalogueDevice', 'CatalogueManufacturer',
  'CatalogueModel', 'CatalogueSource', 'CodecResources', 'ConfigLanguage', 'Device', 'DeviceChannelTuning',
  'DeviceDelays', 'DeviceDriving', 'DeviceInput', 'DeviceInputs', 'DeviceListRow', 'DeviceModeMap', 'DevicePower',
  'DeviceState', 'DeviceTiming', 'DocumentFamily', 'DocumentTypes', 'Edit', 'EditReport', 'EzHex',
  'Identification', 'InfraredCode', 'IntendedVersionField', 'IntroductionTour', 'Inventory', 'IrFrame', 'IrGroup',
  'KeyCode', 'KeyLabel', 'Metadata', 'MetadataCommand', 'MetadataDevice', 'ModelChoice', 'ModelNamed', 'PngHeader',
  'PowerOnDelay', 'ProntoCode', 'Pulse', 'Raster', 'Recipe', 'RecipeActivity', 'RecipeActivityDevice',
  'RecipeDevice', 'RecipeDeviceKey', 'RecipeFavourites', 'RecipeModel', 'RecipeScreenItem', 'RecipeSequenceStep', 'RecipeTarget',
  'RenderedPage', 'ScreenChoice', 'ScreenVariant', 'StatedCode', 'StatedProtocol',
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

/** What the Node entry adds to the main entry: the names that exist at run time. */
const NODE_VALUES = [
  'NODE_RESOURCES', 'archiveAt', 'archiveManifest', 'archiveProtocols', 'carryCodes', 'catalogueByRhythm', 'catalogueCommands',
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
