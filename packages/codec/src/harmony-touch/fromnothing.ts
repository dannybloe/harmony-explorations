/**
 * **Every document of a Harmony Touch's configuration built from a setup file, with no Logitech document as input**:
 * `todo-touch.md` 9.1.
 *
 * **What 9.1 changes against 8.6.** 8.6 composed the four documents that name devices and activities from a
 * description, onto a set of Logitech's documents with those four emptied, and carried each device's record whole from
 * that set, `setupBaseOf` and `catalogueOfSet` in `setup.ts`; Context and Settings stayed the remote's. Here nothing is
 * taken from a set: the base is four empty lists written here, each device's record is written from its catalogue entry
 * in the archive and from our rhythm table, `deviceRecordOfArchive`, and Settings and Context are written here from the
 * setup file and from a description of the account. **The composing itself is 8.6's**, `composeTouchSetup`, so the maps,
 * the activities and the person's choices for each device go through the code the bench ran 418 of 418.
 *
 * **What a setup file is.** A recipe, `packages/codec/src/recipe/recipe.ts`, in the shape of
 * `packages/corpus/setups/touch-full.json`: the model, each device by its name and its catalogue entry, each activity by
 * its name, type and devices with their inputs and jobs; that shape is what Logitech's service is given to build a
 * setup, and it is not enough here, since the service then fills in the maps, the delays and the rest itself. So the
 * file carries a part of the Touch's own beside it, `touch`, read by `readTouchSetupFile`, holding what 8.6's description
 * holds and the recipe does not, and two things neither holds, each naming our own source:
 *
 * * `protocols`: **the families of our rhythm table the codes are written with**, each under a protocol id of ours. A
 *   device's codes are read from its catalogue entry and each is written into a definition of ours of the family it
 *   names, and a family the file does not list is refused, so the families a set sends are stated in the file and
 *   checked against the catalogue.
 * * `settings`: the remote's settings, by row, each value the person's choice, but the background, which is ours.
 *
 * **What a recipe states is not stated twice**: an activity's devices, their inputs and their jobs come from the recipe,
 * and the Touch's part adds only each device's two places in the power orders; a device's "kept on between activities"
 * is the recipe's `poweredOnBetweenActivities`. A device or an activity the two parts do not both name is refused.
 *
 * **What comes from the account, and only from it**: Context's seven fields a Touch reads, `OwnContext`, and the address
 * and key of the favourites documents the tuning device names, which the remote keeps and asks for by them. Neither is
 * Logitech's catalogue or a document of theirs, and both are the account's values, so they are kept in the lab and given
 * here as a `TouchAccount`; no setup file holds one.
 *
 * **Which generator writes each field**, the attribution 9.3 counts:
 *
 * | document | field | written by |
 * |---|---|---|
 * | the four lists | the shell, each list empty | `emptyTouchLists` |
 * | `DeviceList` | a device's record from its catalogue entry, codes and features | `deviceRecordOfArchive` |
 * | `DeviceList` | a device's id, name, port, repeats, delays, power choices, input delay, channel tuning | `composeTouchSetup` from the Touch's part |
 * | `DeviceList` | the tuning device's favourites address and key | `buildTouchDocuments` from the account |
 * | `ProtocolList` | each definition | `definitionOfRow` over the rhythm table, through `deviceRecordOfArchive` |
 * | `ActivityList`, `MapList` | every activity and map | `composeTouchSetup`, `composeTouchActivity` and `composeButtons` |
 * | `Settings` | every row and field | `settingsOfSetupFile` |
 * | `Settings` | `BackgroundImage`, `UserImages` and `UserImageBucketUri` | `settingsOfSetupFile` from `ourBackground` |
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
 * **What it leaves for 9.3 and 9.4**, each named in the comparison with 8.6's set,
 * `packages/corpus/experiments/touchnothingset.ts`: a command's `FunctionId-`, which the archive does not hold and by which the
 * screens draw an entry's icon; Context's fourteen fields a Touch synced through a computer does not read; and the
 * favourites documents and their pictures, which stay the remote's.
 *
 * **Nothing here is about one remote's family of configurations**: the Harmony Touch reads these documents and nothing
 * else does, so this folder is the Touch's own. Which architectures: the Harmony Touch alone, firmware 4.15.330; its
 * firmware reports 17 and Logitech's templates file it under 18. **Nothing here sends anything.**
 */
import type { CatalogueSource } from '../catalogue.ts';
import { encodePng } from '../png.ts';
import { readRecipe, type Recipe, type RecipeActivity } from '../recipe/recipe.ts';
import { resource } from '../resources.ts';
import { deviceRecordOfArchive } from './archivedevice.ts';
import {
  ACTIVITY_START_SCREENS, ACTIVITY_TYPES, ComposeRefusal, isOwnId, OWN_IDS,
  type ActivityRoleKind, type ActivityTypeName, type OwnActivity, type OwnActivityStep, type OwnButton, type OwnSequence,
} from './compose.ts';
import type { Context, DeviceWithFeatures, Id, IrProtocol, Settings, SyncDocuments } from './documents.ts';
import { BACKGROUND_BOX, BACKGROUND_TWIN_BOX } from './favourites.ts';
import { composeTouchContext, SETTING_ROWS, type OwnContext } from './settings.ts';
import { composeTouchSetup, type SetupButton, type SetupChannelTuning, type SetupDevice, type TouchCatalogue, type TouchSetup } from './setup.ts';

type Json = Record<string, unknown>;
const isRecord = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x);
const refuse = (message: string): never => {
  throw new ComposeRefusal(message);
};

/** The model a Touch's setup file names, Logitech's name for it, as `touch-full.json` names it. */
export const HARMONY_TOUCH_MODEL = 'Harmony Touch';

// ---------------------------------------------------------------------------------------------------
// The setup file
// ---------------------------------------------------------------------------------------------------

/** One device's part: what 8.6's description holds of a device and a recipe does not. Every number in milliseconds. */
export interface TouchPartDevice {
  /** The recipe device it belongs to, by the name the remote shows. */
  readonly device: string;
  readonly id: number;
  readonly controlPort: number;
  readonly pressRepeats: number | null;
  readonly interKeyDelayMs: number;
  readonly interDeviceDelayMs: number;
  readonly power?: { readonly onDelayMs?: number; readonly alwaysOn?: boolean };
  readonly inputDelayMs?: number;
  readonly channelTuning?: SetupChannelTuning;
  readonly buttons: readonly SetupButton[];
  readonly sequences?: readonly OwnSequence[];
}

/** One activity's part: what 8.6's description holds of an activity beyond the recipe's devices, inputs and jobs. */
export interface TouchPartActivity {
  /** The recipe activity it belongs to, by its name. */
  readonly activity: string;
  readonly id: number;
  readonly startScreen: OwnActivity['startScreen'];
  readonly order: number;
  readonly tuningDefault?: boolean;
  /** Each of the recipe activity's devices, by name, and its place in the power on order and in the power off order. */
  readonly powerOrder: Readonly<Record<string, readonly [number, number]>>;
  readonly enter?: readonly OwnActivityStep[];
  readonly leave?: readonly OwnActivityStep[];
  readonly buttons: readonly OwnButton[];
  readonly sequences?: readonly OwnSequence[];
}

/** The Touch's own part of a setup file. */
export interface TouchPart {
  /** Each family of our rhythm table the codes are written with, and the protocol id of ours its definition is under. */
  readonly protocols: Readonly<Record<string, number>>;
  /** The remote's settings, by row name, each the row's value as the remote reads it. */
  readonly settings: Readonly<Record<string, string>>;
  readonly devices: readonly TouchPartDevice[];
  readonly activities: readonly TouchPartActivity[];
}

/** A setup file: a recipe for the Harmony Touch with the Touch's part. */
export interface TouchSetupFile extends Omit<Recipe, 'touch'> {
  readonly touch: TouchPart;
}

/**
 * A setup file out of parsed JSON: the recipe read by `readRecipe`, and the Touch's part checked here. **Refuses**, with
 * the first thing wrong and by where it is: a recipe `readRecipe` refuses; a model other than the Harmony Touch; no
 * Touch's part; favourite channels, which nothing here composes; a device or an activity the two parts do not both name,
 * or one named twice; an id that is not ours or that two devices, two activities or two families share; a power order
 * that does not name exactly the activity's devices; and a settings value that is not text. What the composers refuse
 * beyond this, `composeTouchSetup` and the two documents' writers, they refuse when the file is built.
 */
export function readTouchSetupFile(json: unknown): TouchSetupFile {
  const recipe = readRecipe(json);
  if (recipe.model.name !== HARMONY_TOUCH_MODEL) refuse(`the setup file is for the ${recipe.model.name}, not the ${HARMONY_TOUCH_MODEL}`);
  if (recipe.favourites !== undefined) refuse('the setup file states favourite channels, which nothing here composes: the favourites documents stay the remote\'s');
  const t = recipe.touch;
  if (t === undefined) refuse('the setup file has no Touch\'s part, `touch`');
  const part = t as Json;
  for (const key of ['protocols', 'settings', 'devices', 'activities']) if (!(key in part)) refuse(`the Touch's part has no ${key}`);
  if (!isRecord(part['protocols'])) refuse('the Touch\'s protocols are not an object');
  if (!isRecord(part['settings'])) refuse('the Touch\'s settings are not an object');
  if (!Array.isArray(part['devices']) || !Array.isArray(part['activities'])) refuse('the Touch\'s devices or activities are not a list');
  const protocols = part['protocols'] as Record<string, unknown>;
  const ids = new Set<string>();
  const ours = (id: unknown, what: string): void => {
    if (typeof id !== 'number' || !isOwnId(id)) refuse(`${what}'s id is not one of ours, ${OWN_IDS.first} to ${OWN_IDS.last}`);
    if (ids.has(String(id))) refuse(`${what}'s id is another's too`);
    ids.add(String(id));
  };
  for (const [family, id] of Object.entries(protocols)) ours(id, `the family ${family}`);
  for (const [row, value] of Object.entries(part['settings'] as Record<string, unknown>)) {
    if (typeof value !== 'string') refuse(`the setting ${row} is not text, which is what the remote reads a setting as`);
  }
  const devices = part['devices'] as Json[];
  const named = new Set<string>();
  for (const [k, d] of devices.entries()) {
    if (!isRecord(d) || typeof d['device'] !== 'string') refuse(`the Touch's device ${k + 1} names no device`);
    const name = d['device'] as string;
    if (!recipe.devices.some((r) => r.name === name)) refuse(`the Touch's part names a device "${name}" the recipe does not`);
    if (named.has(name)) refuse(`the Touch's part names the device "${name}" twice`);
    named.add(name);
    ours(d['id'], `the device "${name}"`);
    if (!Array.isArray(d['buttons'])) refuse(`the device "${name}" has no list of buttons`);
  }
  for (const r of recipe.devices) if (!named.has(r.name)) refuse(`the recipe's device "${r.name}" has no part of the Touch's`);
  const activities = part['activities'] as Json[];
  const done = new Set<string>();
  for (const [k, a] of activities.entries()) {
    if (!isRecord(a) || typeof a['activity'] !== 'string') refuse(`the Touch's activity ${k + 1} names no activity`);
    const name = a['activity'] as string;
    const r = recipe.activities.find((x) => x.name === name);
    if (r === undefined) refuse(`the Touch's part names an activity "${name}" the recipe does not`);
    if (done.has(name)) refuse(`the Touch's part names the activity "${name}" twice`);
    done.add(name);
    ours(a['id'], `the activity "${name}"`);
    if (!(ACTIVITY_START_SCREENS as readonly unknown[]).includes(a['startScreen'])) refuse(`the activity "${name}" opens on no screen a Touch has`);
    const order = a['powerOrder'];
    if (!isRecord(order)) refuse(`the activity "${name}" states no power order`);
    const listed = Object.keys(order as Json).sort();
    const used = r!.devices.map((u) => u.device).sort();
    if (JSON.stringify(listed) !== JSON.stringify(used)) refuse(`the activity "${name}"'s power order does not name exactly its devices`);
    for (const [device, places] of Object.entries(order as Json)) {
      if (!Array.isArray(places) || places.length !== 2 || !places.every((p) => Number.isInteger(p) && p > 0)) {
        refuse(`the activity "${name}"'s power order for "${device}" is not two places counted from 1`);
      }
    }
    if (!Array.isArray(a['buttons'])) refuse(`the activity "${name}" has no list of buttons`);
  }
  for (const r of recipe.activities) if (!done.has(r.name)) refuse(`the recipe's activity "${r.name}" has no part of the Touch's`);
  return { ...recipe, touch: part as unknown as TouchPart };
}

// ---------------------------------------------------------------------------------------------------
// The setup, in 8.6's form, and the catalogue, from the archive
// ---------------------------------------------------------------------------------------------------

/** A recipe's job, `Display`, as an activity role's kind, `DisplayActivityRole`; a device with none passes through. */
function rolesOf(roles: readonly string[]): ActivityRoleKind[] {
  return roles.length === 0 ? ['PassThroughActivityRole'] : roles.map((r) => `${r}ActivityRole` as ActivityRoleKind);
}

/** An activity of the setup in 8.6's form: the recipe's devices, inputs and jobs, and the Touch's part for the rest. */
function activityOf(r: RecipeActivity, p: TouchPartActivity): OwnActivity {
  if (!(ACTIVITY_TYPES as readonly string[]).includes(r.type)) refuse(`the activity "${r.name}" is of the type ${r.type}, which is no type of Logitech's`);
  return {
    id: p.id,
    name: r.name,
    type: r.type as ActivityTypeName,
    startScreen: p.startScreen,
    order: p.order,
    ...(p.tuningDefault === true ? { tuningDefault: true } : {}),
    devices: r.devices.map((u) => ({
      device: u.device,
      roles: rolesOf(u.roles),
      powerOn: p.powerOrder[u.device]![0],
      powerOff: p.powerOrder[u.device]![1],
      ...(u.input === undefined ? {} : { input: u.input }),
    })),
    ...(p.enter === undefined ? {} : { enter: p.enter }),
    ...(p.leave === undefined ? {} : { leave: p.leave }),
    buttons: p.buttons,
    ...(p.sequences === undefined ? {} : { sequences: p.sequences }),
  };
}

/**
 * The catalogue a setup file's devices are composed from: each device's record written from its catalogue entry in the
 * archive `archive` reads, `deviceRecordOfArchive`, under its id of ours, with the families the file names; and each definition
 * once. The records are in the file's device order, and a definition appears in the order the records first name it.
 */
export function catalogueOfArchive(file: TouchSetupFile, archive: CatalogueSource): TouchCatalogue {
  const devices: DeviceWithFeatures[] = [];
  const protocols: IrProtocol[] = [];
  for (const r of file.devices) {
    const p = file.touch.devices.find((x) => x.device === r.name)!;
    const written = deviceRecordOfArchive(archive, { entry: r.device, id: p.id, protocolIds: file.touch.protocols });
    devices.push(written.record);
    for (const d of written.protocols) if (!protocols.some((x) => x['Id-'] === d['Id-'])) protocols.push(d);
  }
  return { devices, protocols };
}

/**
 * The setup in 8.6's form, `TouchSetup`, for `composeTouchSetup`: each device with the maker and model its catalogue
 * record states, so the composer finds the record, and the person's choices; each activity from the recipe and the
 * Touch's part. Devices and activities in the recipe's order.
 */
export function setupOfSetupFile(file: TouchSetupFile, catalogue: TouchCatalogue): TouchSetup {
  const devices: SetupDevice[] = file.devices.map((r) => {
    const p = file.touch.devices.find((x) => x.device === r.name)!;
    const record = catalogue.devices.find((d) => d.Device['Id-'] === p.id);
    if (record === undefined) refuse(`the catalogue holds no record for the device "${r.name}"`);
    return {
      id: p.id,
      name: r.name,
      manufacturer: String(record!.Device.Manufacturer),
      model: String(record!.Device.Model),
      controlPort: p.controlPort,
      pressRepeats: p.pressRepeats,
      interKeyDelayMs: p.interKeyDelayMs,
      interDeviceDelayMs: p.interDeviceDelayMs,
      power: {
        ...(p.power?.onDelayMs === undefined ? {} : { onDelayMs: p.power.onDelayMs }),
        keptOnBetweenActivities: r.poweredOnBetweenActivities ?? false,
        ...(p.power?.alwaysOn === undefined ? {} : { alwaysOn: p.power.alwaysOn }),
      },
      ...(p.inputDelayMs === undefined ? {} : { inputDelayMs: p.inputDelayMs }),
      ...(p.channelTuning === undefined ? {} : { channelTuning: p.channelTuning }),
      buttons: p.buttons,
      ...(p.sequences === undefined ? {} : { sequences: p.sequences }),
    };
  });
  const activities = file.activities.map((r) => activityOf(r, file.touch.activities.find((x) => x.activity === r.name)!));
  return { devices, activities };
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
 * Settings written from the setup file's `settings`, every row of `SETTINGS_ROWS_WRITTEN` but the two background rows
 * given a value there. **What each field is and why**: `RemoteName` the model's name, which the About screen shows; each
 * row its name and one value, which is all the remote reads of a row but a yes or no row's `DefaultValue`, consulted
 * only when the row has no value, and ours always has one, so it is null; `UserImages` our background alone and
 * `BackgroundImage` the same name, `ourBackground`, so the screens ask for it and its twin, which a set of ours delivers,
 * and show it; `UserImageBucketUri` our store, `OUR_PICTURE_STORE`, which the two addresses are built from; and
 * `DefaultImageBucketUri` empty text, since the remote reads it only for a background neither built in nor the user's,
 * `favourites-and-settings.md` "A background".
 *
 * **Refuses**, by row: a row this does not write, or either background row, which are ours; a written row with no value;
 * a yes or no row's value other than `"true"` or `"false"`; and a number row's value that is not a whole number in
 * decimal digits, or outside the range `SETTING_ROWS` gives it, which is where the remote mishandles a value or its own
 * screens cannot show it.
 */
export function settingsOfSetupFile(file: TouchSetupFile): Settings {
  const values = file.touch.settings;
  const background = ourBackground();
  for (const name of Object.keys(values)) {
    if (name === 'UserImages' || name === 'BackgroundImage') refuse(`${name} is not given a value: the background is the picture of ours a set delivers, \`ourBackground\``);
    if (!(SETTINGS_ROWS_WRITTEN as readonly string[]).includes(name)) refuse(`${name} is not a setting a Settings of ours writes`);
  }
  const rows = SETTINGS_ROWS_WRITTEN.map((name) => {
    if (name === 'UserImages' || name === 'BackgroundImage') return { Name: name, Values: [background.name], DefaultValue: null };
    const value = values[name];
    if (value === undefined) refuse(`the setting ${name} is given no value`);
    const row = SETTING_ROWS[name]!;
    if (row.kind === 'yes or no' && value !== 'true' && value !== 'false') refuse(`${name}: a yes or no setting takes "true" or "false"`);
    if (row.kind === 'whole number') {
      if (!/^(0|[1-9][0-9]*)$/.test(value!)) refuse(`${name}: the value is not a whole number written in decimal digits`);
      const n = Number(value);
      if (n < row.min || n > row.max) refuse(`${name}: ${value} is outside ${row.min} to ${row.max}, which the remote mishandles or its own screens cannot show`);
    }
    return { Name: name, Values: [value!], DefaultValue: null };
  });
  return { RemoteName: file.model.name, DefaultImageBucketUri: '', Settings: rows, UserImageBucketUri: OUR_PICTURE_STORE } as Settings;
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
 * reads none of them, the reading of `todo-touch.md` 8.4 in `settings.ts`; whether the remote takes a Context that lacks
 * them is the prediction 9.4 tests, and the comparison with 8.6's set names each.
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
 * **The six documents of a setup file**, in the order the remote asks for them: the four lists composed by
 * `composeTouchSetup` onto `emptyTouchLists` from the catalogue `archive` gives, Context from the account
 * and Settings from the file.
 *
 * **The tuning device**, the device of the favourites activity, `tuningDefault`, that changes channels, carries the
 * account's favourites address and key, since the remote asks for the favourites documents it keeps by them, and no
 * other device carries either. **Refuses** a favourites activity with no device that changes channels, or with one and
 * an account that states no favourites, and whatever the readers and composers refuse.
 */
export function buildTouchDocuments(file: TouchSetupFile, options: { readonly archive: CatalogueSource; readonly account: TouchAccount }): SyncDocuments {
  let catalogue = catalogueOfArchive(file, options.archive);
  const favourites = file.touch.activities.find((a) => a.tuningDefault === true);
  if (favourites !== undefined) {
    const r = file.activities.find((a) => a.name === favourites.activity)!;
    const tuner = r.devices.find((u) => u.roles.includes('ChannelChanging'));
    if (tuner === undefined) refuse(`the favourites activity "${r.name}" has no device that changes channels`);
    if (options.account.tuning === undefined) refuse('the account states no favourites address and key for the tuning device');
    const id = file.touch.devices.find((d) => d.device === tuner!.device)!.id;
    const at = catalogue.devices.findIndex((d) => d.Device['Id-'] === id);
    const record = catalogue.devices[at]!;
    const devices = [...catalogue.devices];
    devices[at] = { ...record, Device: { ...record.Device, DeviceProfileUri: options.account.tuning!.DeviceProfileUri, ContentProfileKey: options.account.tuning!.ContentProfileKey } };
    catalogue = { ...catalogue, devices };
  }
  const four = composeTouchSetup(emptyTouchLists(), setupOfSetupFile(file, catalogue), catalogue);
  return {
    ActivityList: four.ActivityList!,
    DeviceList: four.DeviceList!,
    MapList: four.MapList!,
    Context: contextOfAccount(options.account),
    Settings: settingsOfSetupFile(file),
    ProtocolList: four.ProtocolList!,
  };
}
