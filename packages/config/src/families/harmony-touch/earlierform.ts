/**
 * **A Harmony Touch's setup file of the earlier form**, decision 43: a recipe with a block of the Touch's own, `touch`,
 * that stated every key, every screen entry, every id and every delay, read and built here and nowhere else.
 *
 * **Why it is kept, and for whom.** No build an application reaches reads this form, since every model's document
 * has one shape: `readRecipe` refuses a document carrying the block, naming the converter, and the family builds from
 * a document of version 2, `buildTouchDocuments` in `fromnothing.ts`. It stays for two readers. **The converter**,
 * `describeTouchDocument` in `recipemaps.ts`, reads it to write the smallest document of version 2 that says the same.
 * **And the evidence**: the sets the bench Harmony Touch was sent were built from files of this form, and the tests
 * that pin those runs rebuild the exact set from the file in the lab and compare it byte for byte with what was sent,
 * so the route from this form to a set has to keep giving those bytes.
 *
 * **Where it is offered.** On no entry an application imports: it is not on the codec's main entry, nor in the
 * `harmonyTouch` namespace of `./build`, but in a namespace of its own on `./internal`, `earlierTouchSetupFile`, for
 * this repository's tests, experiments and scripts.
 *
 * **What a setup file of the earlier form is.** A recipe in the shape of `packages/remote/setups/touch-full.json`, the
 * model, each device by its name and its catalogue entry, each activity by its name, type and devices with their inputs
 * and jobs, and beside it the block, holding what a `TouchSetup` holds and the recipe does not, and two things neither
 * holds, each naming our own source: `protocols`, the families of our rhythm table the codes are written with, each
 * under a protocol id of ours; and `settings`, the remote's settings by row, each value the person's choice, but the
 * background, which is ours. What a recipe states is not stated twice: an activity's devices, their inputs and their
 * jobs come from the recipe, and the block adds only each device's two places in the power orders; a device's "kept on
 * between activities" is the recipe's `poweredOnBetweenActivities`. A device or an activity the two parts do not both
 * name is refused. **It states no field of version 2**: those fields are the shape every model shares, and a file stating one is
 * refused rather than read as half of each.
 *
 * Which architectures: the Harmony Touch alone, firmware 4.15.330; its firmware reports 17 and Logitech's templates file
 * it under 18. **Nothing here sends anything.**
 */
import type { CatalogueSource } from '../../catalogue/catalogue.ts';
import { readRecipe, type Recipe, type RecipeActivity, statedKeys, versionTwoFields } from '../../recipe/recipe.ts';
import {
  ACTIVITY_START_SCREENS, ACTIVITY_TYPES, ComposeRefusal, isOwnId, OWN_IDS,
  type ActivityTypeName, type OwnActivity, type OwnActivityStep, type OwnButton, type OwnSequence,
} from './compose.ts';
import type { Settings, SyncDocuments } from './documents.ts';
import {
  catalogueOfDevices, HARMONY_TOUCH_MODEL, roleKindsOf, settingsOfRows, sixOfSetup, withTuningAddress, type TouchAccount,
} from './fromnothing.ts';
import type { SetupButton, SetupChannelTuning, SetupDevice, TouchCatalogue, TouchSetup } from './setup.ts';

type Json = Record<string, unknown>;
const isRecord = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x);
const refuse = (message: string): never => {
  throw new ComposeRefusal(message);
};

/**
 * Refuses a file stating a field of version 2: the earlier form has none, and a route of this form that went ahead
 * would leave the field out without a word. A file read by `readEarlierTouchSetupFile` meets it there, and one built by
 * hand at each route below.
 */
function refuseVersionTwo(file: Recipe, route: string): void {
  const stated = versionTwoFields(file)[0];
  if (stated !== undefined) refuse(`${route}: a setup file of the earlier form states no field of version 2, and this one states ${stated.where}; a document of version 2 has no block of the Touch's own`);
}

// ---------------------------------------------------------------------------------------------------
// The setup file
// ---------------------------------------------------------------------------------------------------

/** One device's part: what a `TouchSetup` holds of a device and a recipe does not. Every number in milliseconds. */
export interface EarlierTouchPartDevice {
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

/** One activity's part: what a `TouchSetup` holds of an activity beyond the recipe's devices, inputs and jobs. */
export interface EarlierTouchPartActivity {
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
export interface EarlierTouchPart {
  /** Each family of our rhythm table the codes are written with, and the protocol id of ours its definition is under. */
  readonly protocols: Readonly<Record<string, number>>;
  /** The remote's settings, by row name, each the row's value as the remote reads it. */
  readonly settings: Readonly<Record<string, string>>;
  readonly devices: readonly EarlierTouchPartDevice[];
  readonly activities: readonly EarlierTouchPartActivity[];
}

/** A setup file of the earlier form: a recipe for the Harmony Touch with the Touch's part. */
export interface EarlierTouchSetupFile extends Recipe {
  readonly touch: EarlierTouchPart;
}

/**
 * A setup file of the earlier form out of parsed JSON: the recipe beside the block read by `readRecipe`, which refuses
 * the block itself, and the block checked here. **Refuses**, with the first thing wrong and by where it is: a recipe
 * `readRecipe` refuses; a field of version 2, which this form has none of; a model other than the Harmony Touch; no
 * Touch's part; favourite channels, which nothing here composes; a device or an activity the two parts do not both name,
 * or one named twice; an id that is not ours or that two devices, two activities or two families share; a power order
 * that does not name exactly the activity's devices; and a settings value that is not text. What the composers refuse
 * beyond this, `composeTouchSetup` and the two documents' writers, they refuse when the file is built.
 */
export function readEarlierTouchSetupFile(json: unknown): EarlierTouchSetupFile {
  // The recipe without its block, which `readRecipe` refuses as the earlier form; the block is checked below.
  const { touch: t, ...rest } = (isRecord(json) ? json : {}) as Json;
  const recipe = readRecipe(isRecord(json) ? rest : json);
  refuseVersionTwo(recipe, 'readEarlierTouchSetupFile');
  if (recipe.model.name !== HARMONY_TOUCH_MODEL) refuse(`the setup file is for the ${recipe.model.name}, not the ${HARMONY_TOUCH_MODEL}`);
  if (recipe.favourites !== undefined) refuse('the setup file states favourite channels, which nothing here composes: the favourites documents stay the remote\'s');
  // The recipe's key choices, R31 and R32, are not what a Touch's buttons are built from, its own part is; refused
  // rather than left unread, since a file built without them has keys doing something else than the recipe says.
  const chosen = statedKeys(recipe)[0];
  if (chosen !== undefined) refuse(`the setup file chooses ${chosen.where}, and a Harmony Touch's keys are built from its own part`);
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
  return { ...recipe, touch: part as unknown as EarlierTouchPart };
}


// ---------------------------------------------------------------------------------------------------
// The setup, as a `TouchSetup`, and the catalogue, from the archive
// ---------------------------------------------------------------------------------------------------

/** An activity of the setup as a `TouchSetup` states one: the recipe's devices, inputs and jobs, and the Touch's part for the rest. */
function activityOf(r: RecipeActivity, p: EarlierTouchPartActivity): OwnActivity {
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
      roles: roleKindsOf(u.roles),
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
 * The catalogue a setup file's devices are composed from, `catalogueOfDevices` in `fromnothing.ts`: each device's record
 * written from its catalogue entry under the id the block gives it, with the families the block names. The records are
 * in the file's device order, and a definition appears in the order the records first name it.
 */
export function catalogueOfEarlierSetupFile(file: EarlierTouchSetupFile, archive: CatalogueSource): TouchCatalogue {
  const devices = file.devices.map((r) => ({ entry: r.device, id: file.touch.devices.find((x) => x.device === r.name)!.id }));
  return catalogueOfDevices(devices, file.touch.protocols, archive);
}

/**
 * The setup as a `TouchSetup`, for `composeTouchSetup`: each device with the maker and model its catalogue
 * record states, so the composer finds the record, and the person's choices; each activity from the recipe and the
 * Touch's part. Devices and activities in the recipe's order.
 */
export function setupOfEarlierSetupFile(file: EarlierTouchSetupFile, catalogue: TouchCatalogue): TouchSetup {
  refuseVersionTwo(file, 'setupOfEarlierSetupFile');
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


/**
 * Settings written from the block's `settings`, every row as text, by `settingsOfRows` in `fromnothing.ts`, which says
 * what each field is and why. **Refuses** a file stating a field of version 2, and what `settingsOfRows` refuses.
 */
export function settingsOfEarlierSetupFile(file: EarlierTouchSetupFile): Settings {
  refuseVersionTwo(file, 'settingsOfEarlierSetupFile');
  return settingsOfRows(file.touch.settings, file.model.name);
}

// ---------------------------------------------------------------------------------------------------
// The six
// ---------------------------------------------------------------------------------------------------

/**
 * **The six documents of a setup file of the earlier form**, in the order the remote asks for them: the catalogue the
 * archive gives, `catalogueOfEarlierSetupFile`, the setup the block states, `setupOfEarlierSetupFile`, the tuning
 * device's favourites address and key from the account, `withTuningAddress`, and the six assembled by `sixOfSetup` in
 * `fromnothing.ts`, the assembly a document of version 2 goes through too. **Refuses** a file stating a field of
 * version 2, and whatever the readers, `withTuningAddress` and the composers refuse.
 */
export function buildEarlierTouchDocuments(file: EarlierTouchSetupFile, options: { readonly archive: CatalogueSource; readonly account: TouchAccount }): SyncDocuments {
  refuseVersionTwo(file, 'buildEarlierTouchDocuments');
  const written = catalogueOfEarlierSetupFile(file, options.archive);
  const setup = setupOfEarlierSetupFile(file, written);
  // The address and key change no field the setup reads off the catalogue, its maker and model, so the setup read off
  // the catalogue before them is the setup composed with it after.
  const catalogue = withTuningAddress(written, setup, options.account);
  return sixOfSetup(setup, catalogue, settingsOfEarlierSetupFile(file), options.account);
}
