/**
 * **Every document of a Harmony Touch's configuration built from a document of version 2, with no Logitech document as
 * input**, decision 43.
 *
 * **What this changes against `setup.ts`.** There the four documents that name devices and activities are composed from
 * a description, onto a set of Logitech's documents with those four emptied, and each device's record is carried whole
 * from that set, `setupBaseOf` and `catalogueOfSet` in `setup.ts`; Context and Settings stay the remote's. Here nothing
 * is taken from a set: the base is four empty lists written here, each device's record is written from its catalogue
 * entry in the archive and from our rhythm table, `deviceRecordOfArchive`, and Settings and Context are written here
 * from the document and from a description of the account. **The composing itself is `setup.ts`'s**,
 * `composeTouchSetup`, so the maps, the activities and the person's choices for each device go through the code the
 * bench ran 418 of 418.
 *
 * **What the document is.** A recipe in the one shape every model shares, `packages/config/src/recipe/recipe.ts`: the
 * model, each device by its name and its catalogue entry, each activity by its name, type and devices with their inputs
 * and roles, and a person's choices as the fields of version 2 that a Touch's build reads, `VERSION_TWO` there. What the
 * document does not state the family derives, `touchSetupOfDocument` in `recipemaps.ts`: every key, pad place, gesture
 * and screen entry the person did not choose, the ids of ours from the toolkit's, the order devices are switched on in,
 * and the protocol id each infrared family of our rhythm table is written under.
 *
 * **A setup file of the earlier form**, a recipe with a block of the Touch's own, `touch`, stating every key, entry, id
 * and delay, is not read here: `earlierform.ts` reads it, for the converter, `describeTouchDocument`, and for the tests
 * that rebuild what was sent to a remote from one. Both routes end in the same assembly here, `sixOfSetup`, so a set of
 * either differs only where their setups or catalogues do.
 *
 * **What comes from the account, and only from it**: Context's seven fields a Touch reads, `OwnContext`, and the address
 * and key of the favourites documents the tuning device names, which the remote keeps and asks for by them. Neither is
 * Logitech's catalogue or a document of theirs, and both are the account's values, so they are kept in the lab and given
 * here as a `TouchAccount`; no document holds one.
 *
 * **Which generator writes each field**, the attribution the comparison of the earlier form's set counts:
 *
 * | document | field | written by |
 * |---|---|---|
 * | the four lists | the shell, each list empty | `emptyTouchLists` |
 * | `DeviceList` | a device's record from its catalogue entry, codes and features | `deviceRecordOfArchive` |
 * | `DeviceList` | a device's id, name, port, repeats, delays, power choices, input delay, channel tuning | `composeTouchSetup` from the setup |
 * | `DeviceList` | the tuning device's favourites address and key | `withTuningAddress` from the account |
 * | `ProtocolList` | each definition | `definitionOfRow` over the rhythm table, through `deviceRecordOfArchive` |
 * | `ActivityList`, `MapList` | every activity and map | `composeTouchSetup`, `composeTouchActivity` and `composeButtons` |
 * | `Settings` | every row and field | `settingsOfRows` |
 * | `Settings` | `BackgroundImage`, `UserImages` and `UserImageBucketUri` | `settingsOfRows` from `ourBackground` |
 * | `Context` | the seven fields read | `contextOfAccount` from the account |
 * | the background and its twin, two pictures | every byte | `ourBackground`, drawn here and encoded by `encodePng` |
 *
 * **The background is a picture of ours**, `ourBackground`, and it is what keeps a set of ours from losing the stored
 * pictures. The screens ask for the pictures `UserImages` names, each with its small twin (`submitBackgroundImageRequest`
 * in the screens' `appscommon/harmony.lua`), and asking for any picture is what makes them carry every picture the
 * remote stores into the new set, `empty.ts`; a Settings that names no user background makes them ask for none on a
 * set without favourites, and a remote then drops the user's own backgrounds from its picker. So a set of ours names one
 * background of its own, delivers it and its twin with 200, and shows it. The person's own backgrounds stay stored, since
 * the asking carries them, and leave the picker while a set of ours is held; a put back of the remote's own Settings
 * lists them again.
 *
 * **What it leaves out**, each named in the comparison with the set `setup.ts` composes,
 * `packages/remote/experiments/touchnothingset.ts`: a command's `FunctionId-`, which the archive does not hold and by
 * which the screens draw an entry's icon; Context's fourteen fields a Touch synced through a computer does not read;
 * and the favourites documents and their pictures, which stay the remote's.
 *
 * **Nothing here is about one remote's family of configurations**: the Harmony Touch reads these documents and nothing
 * else does, so this folder is the Touch's own. Which architectures: the Harmony Touch alone, firmware 4.15.330; its
 * firmware reports 17 and Logitech's templates file it under 18. **Nothing here sends anything.**
 */
import type { CatalogueSource } from '../../catalogue/catalogue.ts';
import { encodePng } from '../../screens/png.ts';
import { readRecipe, type Recipe, recipeToBuild } from '../../recipe/recipe.ts';
import { resource } from '../../support/resources.ts';
import { deviceRecordOfArchive } from './archivedevice.ts';
import { ComposeRefusal, type ActivityRoleKind } from './compose.ts';
import type { Context, DeviceWithFeatures, Id, IrProtocol, Settings, SyncDocuments } from './documents.ts';
import { BACKGROUND_BOX, BACKGROUND_TWIN_BOX } from './favourites.ts';
import { touchSetupOfDocument } from './recipemaps.ts';
import { composeTouchContext, settingText, type OwnContext } from './settings.ts';
import { composeTouchSetup, type TouchCatalogue, type TouchSetup } from './setup.ts';

const refuse = (message: string): never => {
  throw new ComposeRefusal(message);
};

/** The model a Touch's document names, Logitech's name for it, as `touch-full.json` names it. */
export const HARMONY_TOUCH_MODEL = 'Harmony Touch';

// ---------------------------------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------------------------------

/**
 * **A Harmony Touch's document out of parsed JSON**, decision 43: a recipe of the one shape every model shares, read by
 * `readRecipe`, for the Harmony Touch. What the family's build reads of it, and what it refuses, is
 * `touchSetupOfDocument`'s in `recipemaps.ts`. **Refuses** a recipe `readRecipe` refuses, a document with the earlier
 * form's own block among them, naming the converter, and a model other than the Harmony Touch.
 */
export function readTouchDocument(json: unknown): Recipe {
  const document = readRecipe(json);
  if (document.model.name !== HARMONY_TOUCH_MODEL) refuse(`the document is for the ${document.model.name}, not the ${HARMONY_TOUCH_MODEL}`);
  return document;
}

/**
 * A recipe's role, `Display`, as an activity role's kind, `DisplayActivityRole`; a device with none passes through. Read
 * by `recipemaps.ts`, which turns a document into a setup, and by the reader of a setup file of the earlier form.
 */
export function roleKindsOf(roles: readonly string[]): ActivityRoleKind[] {
  return roles.length === 0 ? ['PassThroughActivityRole'] : roles.map((r) => `${r}ActivityRole` as ActivityRoleKind);
}

/** One device a catalogue is written for: its catalogue entry, `<manufacturer>/<file>`, and its id of ours. */
export interface CatalogueDevice {
  readonly entry: string;
  readonly id: number;
}

/**
 * **The catalogue a setup's devices are composed from**: each device's record written from its catalogue entry in the
 * archive `archive` reads, `deviceRecordOfArchive`, under its id of ours, with each infrared family under the protocol
 * id `protocolIds` gives it; and each definition once. The records are in the order given, and a definition appears in
 * the order the records first name it.
 */
export function catalogueOfDevices(devices: readonly CatalogueDevice[], protocolIds: Readonly<Record<string, number>>, archive: CatalogueSource): TouchCatalogue {
  const records: DeviceWithFeatures[] = [];
  const protocols: IrProtocol[] = [];
  for (const one of devices) {
    const written = deviceRecordOfArchive(archive, { entry: one.entry, id: one.id, protocolIds });
    records.push(written.record);
    for (const d of written.protocols) if (!protocols.some((x) => x['Id-'] === d['Id-'])) protocols.push(d);
  }
  return { devices: records, protocols };
}

// ---------------------------------------------------------------------------------------------------
// The documents nothing in a setup names: the empty lists, Settings and Context
// ---------------------------------------------------------------------------------------------------

/**
 * The four lists a setup is composed onto, each empty, written here: the shell of each document is its one list, the
 * field the engine and the screens read it by. `MapList` is asked for without function maps,
 * `excludeFunctionMaps=true`, and nothing on the remote names `FunctionMaps`, so it is left out.
 */
export function emptyTouchLists(): SyncDocuments {
  return {
    ActivityList: { Activities: [] },
    DeviceList: { DevicesWithFeatures: [] },
    MapList: { ButtonMaps: [] },
    ProtocolList: { Protocols: [] },
  };
}

/**
 * The rows a Settings of ours holds, in the order Logitech's documents hold them: the nine the remote reads,
 * `favourites-and-settings.md` "Settings", less none. `IsWiFiEnabled` and `TimeZoneFlag`, which Logitech's documents
 * also carry, are named nowhere in the remote's software and are left out; `HapticFlag` and `HapticEffect` arrived in
 * no sync measured and are left out as Logitech's documents leave them out.
 */
export const SETTINGS_ROWS_WRITTEN = [
  'UserImages', 'BackgroundImage', 'TwelveHourClock', 'ScreenBrightness', 'ScreenTimeout', 'ScreenLockFlag', 'EditLock',
  'KeyBrightness', 'AccelFlag',
] as const;

// ---------------------------------------------------------------------------------------------------
// The background, a picture of ours
// ---------------------------------------------------------------------------------------------------

/**
 * Where a Settings of ours says the user's backgrounds are kept, `UserImageBucketUri`. **Nothing fetches from it**: on a
 * Touch synced through a computer every request goes to the program answering the sync, which answers this address
 * with the picture, and the address is only the text the screens prefix a background's name with
 * (`submitBackgroundImageRequest`). It is ours, under a name the reserved `.invalid` domain guarantees resolves nowhere,
 * rather than the address of Logitech's store a Settings of theirs names. It starts with `https`, because the engine
 * passes a failed answer to an address starting `http` without aborting the sync (`validStatusCode` in the engine's
 * `apihandler/response.lua`), where a failed answer to an address of no such start aborts it.
 */
export const OUR_PICTURE_STORE = 'https://pictures.invalid/backgrounds/';

/** The two colours of our background, top and bottom, dark blues the screens' white text reads on. */
const BACKGROUND_TOP = [11, 29, 58] as const;
const BACKGROUND_BOTTOM = [30, 96, 145] as const;
/** The bright yellow band across its foot, so the picture is told from a built in one at a glance. */
const BACKGROUND_BAND = [255, 214, 10] as const;

/** One drawing of our background at a size: the two blues blended from top to bottom, and the band at a fortieth of its height. */
function drawBackground(width: number, height: number): Uint8Array {
  const band = Math.max(2, Math.round(height / 40));
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const t = height === 1 ? 0 : y / (height - 1);
    const colour = y >= height - 2 * band && y < height - band
      ? BACKGROUND_BAND
      : BACKGROUND_TOP.map((top, c) => Math.round(top + (BACKGROUND_BOTTOM[c]! - top) * t));
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      rgba[at] = colour[0]!;
      rgba[at + 1] = colour[1]!;
      rgba[at + 2] = colour[2]!;
      rgba[at + 3] = 255;
    }
  }
  return encodePng(width, height, rgba, 4);
}

/** Our background: its name, the two pictures, and the addresses the screens ask for them at. */
export interface OurBackground {
  /** The file name `UserImages` and `BackgroundImage` hold: a digest of the picture's bytes and `.png`. */
  readonly name: string;
  /** The background, at the screen's 240 by 320. */
  readonly picture: Uint8Array;
  /** Its small twin for the picker, 60 by 80, kept under the name with `_small` before `.png`. */
  readonly twin: Uint8Array;
  /** The two addresses the screens build, `OUR_PICTURE_STORE` and each name, the background first. */
  readonly addresses: { readonly picture: string; readonly twin: string };
}

/**
 * **The background of a set of ours**, drawn here: two dark blues blended from top to bottom with a bright yellow band
 * across the foot, at the 240 by 320 a background is drawn at and the 60 by 80 of its twin, `BACKGROUND_BOX` and
 * `BACKGROUND_TWIN_BOX`, the sizes the one recorded sync that carried a user background delivered; as a PNG of eight
 * bits a channel with alpha, the form `pictureRefusals` holds a picture of ours to, by the codec's own encoder.
 *
 * **Its name is the first 32 hexadecimal digits of the SHA-256 of the background's bytes**, so the same drawing has the
 * same name wherever it is built, and a changed drawing a new one. Hexadecimal digits hold no `p`, `n` or `g`, which
 * matters: the screens make the twin's name with `string.gsub(v, ".png", "_small.png")`, a pattern in which the dot
 * matches any character, so a name holding a character and `png` before its end would be rewritten there too. And it
 * is one run of digits with no hyphen, never in the shape of an account identifier.
 */
export function ourBackground(): OurBackground {
  const picture = drawBackground(BACKGROUND_BOX.width, BACKGROUND_BOX.height);
  const twin = drawBackground(BACKGROUND_TWIN_BOX.width, BACKGROUND_TWIN_BOX.height);
  const name = `${resource('sha256')(picture).slice(0, 32)}.png`;
  return { name, picture, twin, addresses: { picture: `${OUR_PICTURE_STORE}${name}`, twin: `${OUR_PICTURE_STORE}${name.replace(/\.png$/, '_small.png')}` } };
}

/**
 * **Settings written from the remote's settings by row**, each value as the text the remote reads, every row of
 * `SETTINGS_ROWS_WRITTEN` but the two background rows given a value there, under `remoteName`. **What each field is and
 * why**: `RemoteName` the model's name, which the About screen shows; each row its name and one value, which is all the
 * remote reads of a row but a yes or no row's `DefaultValue`, consulted only when the row has no value, and ours always
 * has one, so it is null; `UserImages` our background alone and `BackgroundImage` the same name, `ourBackground`, so the
 * screens ask for it and its twin, which a set of ours delivers, and show it; `UserImageBucketUri` our store,
 * `OUR_PICTURE_STORE`, which the two addresses are built from; and `DefaultImageBucketUri` empty text, since the remote
 * reads it only for a background neither built in nor the user's, `favourites-and-settings.md` "A background".
 *
 * **Refuses**, by row: a row this does not write, or either background row, which are ours; a written row with no value;
 * a yes or no row's value other than `"true"` or `"false"`; and a number row's value that is not a whole number in
 * decimal digits, or outside the range `SETTING_ROWS` gives it, which is where the remote mishandles a value or its own
 * screens cannot show it.
 */
export function settingsOfRows(values: Readonly<Record<string, string>>, remoteName: string): Settings {
  const background = ourBackground();
  for (const name of Object.keys(values)) {
    if (name === 'UserImages' || name === 'BackgroundImage') refuse(`${name} is not given a value: the background is the picture of ours a set delivers, \`ourBackground\``);
    if (!(SETTINGS_ROWS_WRITTEN as readonly string[]).includes(name)) refuse(`${name} is not a setting a Settings of ours writes`);
  }
  const rows = SETTINGS_ROWS_WRITTEN.map((name) => {
    if (name === 'UserImages' || name === 'BackgroundImage') return { Name: name, Values: [background.name], DefaultValue: null };
    const value = values[name];
    if (value === undefined) refuse(`the setting ${name} is given no value`);
    return { Name: name, Values: [settingText(name, value!)], DefaultValue: null };
  });
  return { RemoteName: remoteName, DefaultImageBucketUri: '', Settings: rows, UserImageBucketUri: OUR_PICTURE_STORE } as Settings;
}

/**
 * What a set of ours takes from the account: Context's seven fields a Touch reads, and the address and key of the
 * tuning device's favourites documents. Kept in the lab; never in a setup file, a fixture or a test.
 */
export interface TouchAccount {
  readonly context: OwnContext;
  readonly tuning?: { readonly DeviceProfileUri: string; readonly ContentProfileKey: Id };
}

/**
 * Context written from the account's seven fields alone, in the alphabetical order Logitech's documents keep, through
 * `composeTouchContext`'s checks of each field. **The other fourteen are left out**: a Touch synced through a computer
 * reads none of them, the reading in `settings.ts`; the remote took a Context that lacks them on the bench Touch, and
 * the comparison with the set `setup.ts` composes names each.
 */
export function contextOfAccount(account: TouchAccount): Context {
  const c = account.context;
  const held = Object.fromEntries(['AccountId-', 'CountryCode', 'Email', 'HouseholdUserProfileUri', 'InstallerId', 'Language', 'SetupSession']
    .map((f) => [f, c[f as keyof OwnContext]]));
  return composeTouchContext(c, held as Context);
}

// ---------------------------------------------------------------------------------------------------
// The six
// ---------------------------------------------------------------------------------------------------

/**
 * **The account's favourites address and key on the tuning device's record**: the device of the favourites activity,
 * `tuningDefault`, that changes channels, the first of its devices with that role, carries both, since the remote asks
 * for the favourites documents it keeps by them, and no other device carries either. The catalogue as given where no
 * activity holds the favourites. **Refuses** a favourites activity with no device that changes channels, and one with
 * such a device and an account that states no favourites address and key.
 */
export function withTuningAddress(catalogue: TouchCatalogue, setup: TouchSetup, account: TouchAccount): TouchCatalogue {
  const favourites = setup.activities.find((a) => a.tuningDefault === true);
  if (favourites === undefined) return catalogue;
  const tuner = favourites.devices.find((u) => u.roles.includes('ChannelChangingActivityRole'));
  if (tuner === undefined) refuse(`the favourites activity "${favourites.name}" has no device that changes channels`);
  if (account.tuning === undefined) refuse('the account states no favourites address and key for the tuning device');
  const id = setup.devices.find((d) => d.name === tuner!.device)!.id;
  const at = catalogue.devices.findIndex((d) => d.Device['Id-'] === id);
  const record = catalogue.devices[at]!;
  const devices = [...catalogue.devices];
  devices[at] = { ...record, Device: { ...record.Device, DeviceProfileUri: account.tuning!.DeviceProfileUri, ContentProfileKey: account.tuning!.ContentProfileKey } };
  return { ...catalogue, devices };
}

/**
 * **The six documents of a setup**, in the order the remote asks for them: the four lists composed by
 * `composeTouchSetup` onto `emptyTouchLists` from `catalogue`, Context from the account and Settings as given. One
 * assembly for both routes to a set, a document of version 2, `buildTouchDocuments`, and a setup file of the earlier
 * form, `buildEarlierTouchDocuments` in `earlierform.ts`, so the two can differ only in the setup and the catalogue
 * they are handed.
 */
export function sixOfSetup(setup: TouchSetup, catalogue: TouchCatalogue, settings: Settings, account: TouchAccount): SyncDocuments {
  const four = composeTouchSetup(emptyTouchLists(), setup, catalogue);
  return {
    ActivityList: four.ActivityList!,
    DeviceList: four.DeviceList!,
    MapList: four.MapList!,
    Context: contextOfAccount(account),
    Settings: settings,
    ProtocolList: four.ProtocolList!,
  };
}

/**
 * **The six documents of a Harmony Touch's document**, decision 43, with no Logitech document as input: the setup, the
 * protocol ids and the settings `touchSetupOfDocument` reads off the document; each device's record written from the
 * catalogue `archive` gives, under the device's id, `catalogueOfDevices`; the tuning device's favourites address and key
 * from the account, `withTuningAddress`; and the six assembled by `sixOfSetup`. **This is the build an application
 * reaches**, through the family's `build` and `buildFromRecipe`.
 *
 * **Refuses** first a field of version 2 the Touch's build does not read, as not built, `refuseUnbuiltFields`, and then
 * whatever `touchSetupOfDocument`, the catalogue's writer, `withTuningAddress` and the composers refuse.
 */
export function buildTouchDocuments(document: Recipe, options: { readonly archive: CatalogueSource; readonly account: TouchAccount }): SyncDocuments {
  // A field of version 2 the Touch's build does not read stops this route as every other, decision 43, and an
  // activity switched off or with no device is left out as every build leaves it out, decision 44, `recipeToBuild`.
  document = recipeToBuild(document, 'buildTouchDocuments', 'document');
  const parts = touchSetupOfDocument(document, options.archive);
  const written = catalogueOfDevices(document.devices.map((d, k) => ({ entry: d.device, id: parts.setup.devices[k]!.id })), parts.protocols, options.archive);
  const catalogue = withTuningAddress(written, parts.setup, options.account);
  return sixOfSetup(parts.setup, catalogue, settingsOfRows(parts.settings, document.model.name), options.account);
}
