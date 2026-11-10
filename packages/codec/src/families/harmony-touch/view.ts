/**
 * The Harmony Touch as the codec's main entry offers it, as the namespace `harmonyTouch`: its documents, the view
 * of them the remote reads, the check of what it would refuse or ignore, its engine's sends, and its family,
 * plan 013 decision 6. Explicit names, so a module of this folder that gains an export does not join the main entry
 * by default; `test/package/surface.test.ts` holds the list. The composers of the folder, a device, an activity,
 * favourites, settings, a removal, a whole setup and the documents built from nothing, are the namespace of the
 * same name on `@harmony/codec/build`, `index.ts` in this folder, whole.
 */

// The documents a Touch stores as its configuration, typed, and the set a sync delivers.
export {
  CONFIGURATION_DOCUMENTS,
  CONTENT_DEVICE,
  CONTENT_SERVICE,
  CONTENT_USER,
  documentKeyOf,
  documentsOfAnswers,
  idText,
  kindOf,
} from './documents.ts';
export type {
  Activity,
  ActivityAction,
  ActivityList,
  Atom,
  Button,
  ButtonActionDocument,
  ButtonMap,
  Carried,
  Channel,
  CodeSegment,
  Command,
  ContentDevice,
  ContentService,
  ContentUser,
  Context,
  Device,
  DeviceFeature,
  DeviceList,
  DeviceWithFeatures,
  DialPosition,
  Encoding,
  FeatureAction,
  Id,
  Input,
  IrProtocol,
  IrSegment,
  MapList,
  ProtocolList,
  Role,
  SegmentReference,
  Sequence,
  Setting,
  Settings,
  SyncAnswer,
  SyncDocuments,
  Typed,
} from './documents.ts';

// The documents read as the remote reads them: devices, activities, buttons, favourites, context and settings.
export {
  CHANNEL_DEVICE_ORDER,
  DEFAULT_PRESS_REPEATS,
  DELETED_ON_REMOTE,
  FAVOURITES_ROLES,
  FIRMWARE_SETTINGS,
  INFRARED_TRANSPORT,
  mapIdentifier,
  NUMBER_PAD_GROUP,
  NUMBER_PAD_LEFT,
  NUMBER_PAD_RIGHT,
  numberPadKey,
  readConfiguration,
  readContext,
  readSettings,
  SCREENS_IDENTIFIER,
  stationLogo,
  uploadedLogo,
} from './read.ts';
export type {
  Configuration,
  Place,
  ReadActivity,
  ReadActivityDevice,
  ReadActivityStep,
  ReadButton,
  ReadButtonAction,
  ReadChannelTuning,
  ReadCommand,
  ReadContext,
  ReadDevice,
  ReadFavourite,
  ReadFavourites,
  ReadFeatureAction,
  ReadInput,
  ReadMap,
  ReadPower,
  ReadProtocol,
  ReadRole,
  ReadSequence,
  ReadSettings,
  SettingValue,
} from './read.ts';

// What the remote would refuse or ignore in them, and what refuses a set before a sync.
export {
  checkConfiguration,
  favouritesAddressFindings,
  findingsByRule,
  readerRaises,
  refusalsBeforeASync,
} from './check.ts';
export type { Finding, Rule } from './check.ts';

// What the remote's engine sends for a press, and when, predicted from the documents.
export { airtimeOf, BETWEEN_STEPS_MS, TIMING, TouchEngine } from './engine.ts';
export type { Airtime, FirstFrame, Send, Timing } from './engine.ts';

// The Touch as a document family, which the registry chooses by model.
export { HARMONY_TOUCH_FAMILY } from './family.ts';
export type { TouchTypes } from './family.ts';
