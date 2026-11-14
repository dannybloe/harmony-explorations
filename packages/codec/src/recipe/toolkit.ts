/**
 * The document toolkit, the contract: everything an application does to one remote's setup, as functions on the
 * recipe, decision 37. On the main entry as the namespace `recipe`.
 *
 * **The document is the recipe, plain data.** An application holds a `Recipe` and never looks inside it: it changes
 * it through the functions here, each of which returns a new document and leaves the one it was given alone, asks it
 * through the questions here, and checks it with `check`. So a document goes to disk, across the boundary between an
 * application's two processes and onto an undo stack as it is, and an interface that redraws on a new value needs
 * nothing more.
 *
 * **Things are addressed by id, never by name or position.** A device, an activity and a sequence each carry an id
 * the toolkit gave them, `open` giving one to whatever arrives without. A name is a label a person changes; an id is
 * what an application keeps in its selection and its undo. How the recipe refers to a device internally is the
 * toolkit's business, which is what "no knowledge of how a recipe is laid out" means in R76.
 *
 * **A change reports what else it touched.** Removing a device takes it out of the activities and favourites that
 * used it, R13; the `Change` says so in `effects`, each with its place. Since nothing is changed in place, an
 * application shows the effects and then keeps the new document or drops it: there is no separate preview.
 *
 * **Two kinds of "this cannot be".** A change that is over what the model takes, a device more than it holds, is
 * refused where it is asked, `ChangeRefused`, because no later step could make it right. A document that is only
 * not finished, an activity whose device has no input chosen, is allowed and listed: `check` returns every problem,
 * each with its place and a code an application can act on, and a build or a sync refuses while it holds an error.
 *
 * **A person's choice is a deviation from a default.** What a key does, what a screen shows, how a device is
 * powered: the builders derive each from the catalogue and from which device does which job. The document states
 * only where a person chose otherwise, and every such setter takes `'default'` to put the choice back, so "what the
 * remote would do anyway" is never copied into the document, where it would go stale.
 *
 * **What is built and what refuses.** A fresh document and opening one; a device and an activity added, renamed,
 * changed, moved and removed, with everything that named them settled; a key's choice; the lists, a device's
 * commands and inputs, what uses something, and the check. Every other function refuses by name, `NotBuiltError`,
 * with the requirement it waits on, and so does a member of a built one that nothing reads yet, a device's power or
 * an activity's icon; `test/recipe/toolkit.test.ts` holds the list of those still refusing, which is the measure of
 * what is left.
 *
 * **A document that carries the part of a remote given documents is changed by nothing here yet.** That part names
 * the devices and activities itself, by name and in a form this module does not read, so a rename or a removal here
 * would leave it naming what is gone. Every change refuses such a document by name until the toolkit reads that
 * part; the questions and the check answer for it as for any other.
 *
 * **A document comes through `create` or `open`.** Every other function addresses things by id, so it refuses a
 * recipe in which a device or an activity has none, naming it, rather than guess an address for it.
 */
import type { DeviceChannelTuning, DeviceInputs, DevicePower, DeviceTiming } from '../catalogue/driving.ts';
import type { ArchiveProtocol } from '../catalogue/archive.ts';
import type { CarriedDevice } from '../catalogue/search.ts';
import { deviceDriving } from '../catalogue/driving.ts';
import { ACTIVITY_ROLE_NAMES, type ActivityRoleName } from '../compose/activityroles.ts';
import { catalogueProtocol } from '../compose/cataloguecodes.ts';
import { capabilitiesOf } from '../families/capabilities.ts';
import { chooseByModel, NoFamilyError } from '../families/registry.ts';
import type { Pulse } from '../infrared/irframe.ts';
import { notBuilt } from '../support/contract.ts';
import {
  readRecipe, RECIPE_VERSION, RecipeError,
  type Recipe, type RecipeActivity, type RecipeDevice, type RecipeDeviceKey, type RecipeKey, type RecipeKeyAction,
  type RecipeModel, type RecipeScreenItem,
} from './recipe.ts';

// ---------------------------------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------------------------------

/** A device's id in its document: given by `addDevice` or `open`, kept through every rename and move. */
export type DeviceId = string;
/** An activity's id in its document. */
export type ActivityId = string;
/** A sequence's id in its document. */
export type SequenceId = string;

/**
 * What has keys and a screen of its own: an activity, or a device in device mode. The two are separate maps of the
 * same keypad, authored separately, `reference/how-a-harmony-works.md`, so a key or a screen is always some owner's.
 */
export type Owner = { readonly activity: ActivityId } | { readonly device: DeviceId };

/**
 * One key of an owner. `scan` is the key's scan code on the model, the number its drawing carries as `data-scan`
 * and the builders bind by, so an application reads it off the key a person clicked; the drawing's name for the key
 * is for showing. `press` tells a key's second command, sent when it is held, from its first, R38; absent is the
 * short press.
 */
export interface KeyPlace {
  readonly owner: Owner;
  readonly scan: number;
  readonly press?: 'short' | 'held';
}

/**
 * Where in a document something is: what a problem concerns, what a change touched, what uses a device. An
 * application turns one into the screen and the field to show.
 */
export type Place =
  | { readonly kind: 'document' }
  | { readonly kind: 'device'; readonly device: DeviceId }
  | { readonly kind: 'command'; readonly device: DeviceId; readonly command: string }
  | { readonly kind: 'activity'; readonly activity: ActivityId }
  | { readonly kind: 'activity-device'; readonly activity: ActivityId; readonly device: DeviceId }
  | { readonly kind: 'step'; readonly activity: ActivityId; readonly when: 'start' | 'end'; readonly step: number }
  | { readonly kind: 'key'; readonly owner: Owner; readonly scan: number; readonly press?: 'short' | 'held' }
  | { readonly kind: 'screen-item'; readonly owner: Owner; readonly item: number }
  | { readonly kind: 'sequence'; readonly sequence: SequenceId }
  | { readonly kind: 'favourite'; readonly device: DeviceId; readonly favourite: number }
  | { readonly kind: 'look' }
  | { readonly kind: 'setting'; readonly setting: string };

// ---------------------------------------------------------------------------------------------------
// What a change gives back, what a check lists, and the refusal
// ---------------------------------------------------------------------------------------------------

/** One thing a change did beyond what was asked, in words a person reads and at a place an application can show. */
export interface Effect {
  readonly place: Place;
  readonly effect: 'removed' | 'changed';
  readonly message: string;
}

/** A change's result: the new document, and everything else the change touched to keep it consistent. */
export interface Change {
  readonly document: Recipe;
  readonly effects: readonly Effect[];
}

/**
 * The codes a problem carries, which is what an application acts on; the sentence beside it is for a person. The
 * list grows with the libraries, and a new code arrives with a new version, never silently.
 */
export const PROBLEM_CODES = [
  // The document names something it does not hold, or its definition does not.
  'unknown-device', 'unknown-command', 'unknown-input', 'unknown-key', 'unknown-sequence',
  // A device with no definition carried, so nothing can be built for it without a source.
  'no-definition',
  // Two things a remote lists side by side under one name, or a name its screen cannot draw.
  'name-taken', 'name-not-drawable',
  // More than the model takes, in a document that did not come through the toolkit's own changes.
  'over-limit',
  // Something the model cannot do at all, or that is not built for it yet.
  'not-on-this-model',
  // A sequence longer than the remote survives.
  'sequence-too-long',
  // Not wrong, not finished: a job no device does, an input not chosen.
  'unfinished',
] as const;
export type ProblemCode = typeof PROBLEM_CODES[number];

/**
 * One problem of a document, R78. An `error` is something a build or a sync refuses on; a `note` is worth showing
 * and stops nothing. `place` is what it concerns, `message` an English sentence naming it.
 */
export interface Problem {
  readonly severity: 'error' | 'note';
  readonly code: ProblemCode;
  readonly place: Place;
  readonly message: string;
}

/**
 * A change that cannot be made: it names something the document does not hold, it would put more on the model than
 * the model takes, or what it was given makes no sense. The document is as it was, since nothing changes in place.
 */
export class ChangeRefused extends RecipeError {
  readonly reason: 'unknown' | 'over-limit' | 'invalid';
  readonly place: Place;

  constructor(reason: 'unknown' | 'over-limit' | 'invalid', place: Place, message: string) {
    super(message);
    this.name = 'ChangeRefused';
    this.reason = reason;
    this.place = place;
  }
}

// ---------------------------------------------------------------------------------------------------
// What a person chooses
// ---------------------------------------------------------------------------------------------------

/**
 * A code for a device's command, R19 and R11: the catalogue's own notation, or pulses learned from the device's
 * original remote, which the definition then marks as learned.
 */
export type CommandCode = { readonly keycode: string } | { readonly learned: readonly Pulse[] };

/**
 * A device as it is added: what the remote calls it and the definition a search fetched for it, R10, or one built
 * from learned commands, R11.
 */
export interface NewDevice {
  readonly name: string;
  readonly device: CarriedDevice;
}

/**
 * What a person changes about a device; a member left out is left as it is. Each of power, inputs, timing and
 * channel tuning has the shape the catalogue states the same thing in, since a person's choice replaces the
 * catalogue's statement and `'default'` gives it back, R14 to R18.
 */
export interface DeviceChanges {
  /** R12. Every reference to the device follows, since references are by id. */
  readonly name?: string;
  /** Kept on when an activity that does not use it starts, R14. */
  readonly keptOnBetweenActivities?: boolean;
  readonly power?: DevicePower | 'default';
  readonly inputs?: DeviceInputs | 'default';
  /** The delays and the repeat count, R16 and R17; only the members given are changed. */
  readonly timing?: Partial<DeviceTiming> | 'default';
  readonly channelTuning?: DeviceChannelTuning | 'default';
  /** The device key it goes on, on a model with a key per device, R39. */
  readonly deviceKey?: RecipeDeviceKey | 'none';
}

/** One device's part in an activity: the input it is switched to, or none to leave it alone, and its jobs, R22 to R24. */
export interface ActivityDeviceChoice {
  readonly device: DeviceId;
  readonly input?: string;
  readonly roles: readonly ActivityRoleName[];
}

/** One step of an activity's start or end beyond what its devices need anyway, R30. A pause is in tenths of a second. */
export type ActivityStep =
  | { readonly device: DeviceId; readonly command: string }
  | { readonly pause: number }
  | { readonly sequence: SequenceId };

/** An activity as it is added: its name, Logitech's kind, and its devices with their jobs, R21. */
export interface NewActivity {
  readonly name: string;
  readonly type: string;
  readonly devices: readonly ActivityDeviceChoice[];
}

/** What a person changes about an activity; a member left out is left as it is. */
export interface ActivityChanges {
  /** R25. */
  readonly name?: string;
  readonly type?: string;
  /** The devices and their jobs, in the order the activity lists them, R22 to R24 and R28. */
  readonly devices?: readonly ActivityDeviceChoice[];
  /** R27, by the name of one of our icons. */
  readonly icon?: string | 'none';
  readonly start?: readonly ActivityStep[] | 'default';
  readonly end?: readonly ActivityStep[] | 'default';
  /** Which activity key starts it, counted from 0, on a model with activity keys, R29. */
  readonly activityKey?: number | 'none';
}

/** One step of a sequence, R37: a device's command by its name, or a pause in tenths of a second. */
export type SequenceStep = { readonly device: DeviceId; readonly command: string } | { readonly pause: number };

/** A sequence as it is added: its name and its steps. Put on a key or a screen by its id. */
export interface NewSequence {
  readonly name: string;
  readonly steps: readonly SequenceStep[];
}

/** What a key does, R31 and R32: a command of any device, a sequence, or nothing at all. */
export type KeyAction =
  | { readonly device: DeviceId; readonly command: string }
  | { readonly sequence: SequenceId }
  | { readonly nothing: true };

/**
 * One item of an owner's screen, in the order a person put them; the toolkit pages them by the model's screen, R34
 * and R35. A label left out is the command's or the sequence's own. An item with `page` opens a page of the items
 * given, with a way back, R36.
 */
export type ScreenItem =
  | { readonly label?: string; readonly device: DeviceId; readonly command: string }
  | { readonly label?: string; readonly sequence: SequenceId }
  | { readonly label: string; readonly page: readonly ScreenItem[] };

/** A favourite channel, R45 and R46: the number as text, since a leading zero is a channel of its own. */
export interface Favourite {
  readonly channel: string;
  readonly name?: string;
  /** By the name of an icon the document carries. */
  readonly icon?: string;
}

/** What `remove` takes away. */
export type Removable = { readonly device: DeviceId } | { readonly activity: ActivityId } | { readonly sequence: SequenceId };

/**
 * What `move` puts at another position, R28: a device in the device list, an activity in the activity menu, or a
 * device within one activity's list.
 */
export type Movable =
  | { readonly device: DeviceId }
  | { readonly activity: ActivityId }
  | { readonly activity: ActivityId; readonly device: DeviceId };

// ---------------------------------------------------------------------------------------------------
// What a question answers
// ---------------------------------------------------------------------------------------------------

/** A device as a list shows it. */
export interface DeviceSummary {
  readonly id: DeviceId;
  readonly name: string;
  /** Its catalogue entry, `<manufacturer>/<file>`. */
  readonly entry: string;
  readonly manufacturer?: string;
  readonly model?: string;
  readonly type?: string;
  /** Whether any of its commands was learned rather than taken from a catalogue. */
  readonly learned: boolean;
}

/** An activity as a list shows it. */
export interface ActivitySummary {
  readonly id: ActivityId;
  readonly name: string;
  readonly type: string;
  readonly devices: readonly ActivityDeviceChoice[];
}

/** A sequence as a list shows it. */
export interface SequenceSummary {
  readonly id: SequenceId;
  readonly name: string;
  readonly steps: readonly SequenceStep[];
}

/** One command of a device: its name, and whether a person changed its code or learned it. */
export interface CommandSummary {
  readonly name: string;
  readonly changed: boolean;
  readonly learned: boolean;
}

/** What a key does and whether that is the default or a person's choice, R77. */
export interface KeyAnswer {
  readonly place: KeyPlace;
  readonly action: KeyAction;
  readonly isDefault: boolean;
}

/** An owner's screen: its items in order, and whether that is the default or a person's choice. */
export interface ScreenAnswer {
  readonly items: readonly ScreenItem[];
  readonly isDefault: boolean;
}

// ---------------------------------------------------------------------------------------------------
// What the functions below share
// ---------------------------------------------------------------------------------------------------

/**
 * What the model takes, as the capability API states it: the most devices and the most activities. A limit the API
 * does not state is not checked here, which is the honest reading of "nothing here states one". Refused, as a
 * `RecipeError` naming it, for a model no family serves, since nothing could be built for the document at all.
 */
function limitsOf(model: RecipeModel): { readonly maxDevices: number | undefined; readonly maxActivities: number | undefined } {
  let skin: number;
  try {
    skin = chooseByModel(model).skin;
  } catch (error) {
    if (error instanceof NoFamilyError) throw new RecipeError(error.message);
    throw error;
  }
  const properties = capabilitiesOf(skin)?.properties;
  return { maxDevices: properties?.maxDevices, maxActivities: properties?.activitiesAtMost };
}

/**
 * The next id of a kind: its letter and one more than the highest number an id of that kind carries. Counted from
 * the document and nothing else, so the same change on the same document gives the same id, which is what lets a
 * test and an undo stack compare documents. An id is never taken from a name: a name changes.
 */
function nextId(letter: string, taken: readonly (string | undefined)[]): string {
  let highest = 0;
  for (const id of taken) {
    const match = id === undefined ? null : new RegExp(`^${letter}([0-9]+)$`).exec(id);
    if (match !== null) highest = Math.max(highest, Number(match[1]));
  }
  return `${letter}${highest + 1}`;
}

/**
 * Hold a document to having come through `create` or `open`: every device and activity has an id. A recipe written
 * by hand has none, and addressing its devices by position would give an address that moves with the next change.
 */
function opened(document: Recipe): void {
  const device = document.devices.find((one) => one.id === undefined);
  if (device !== undefined) throw new RecipeError(`device ${device.name} has no id: a document comes through recipe.open or recipe.create`);
  const activity = document.activities.find((one) => one.id === undefined);
  if (activity !== undefined) throw new RecipeError(`activity ${activity.name} has no id: a document comes through recipe.open or recipe.create`);
}

/** The device with an id, or the refusal naming it. */
function deviceOf(document: Recipe, id: DeviceId): RecipeDevice {
  const found = document.devices.find((one) => one.id === id);
  if (found === undefined) throw new ChangeRefused('unknown', { kind: 'device', device: id }, `the document holds no device ${id}`);
  return found;
}

/** The activity with an id, or the refusal naming it. */
function activityOf(document: Recipe, id: ActivityId): RecipeActivity {
  const found = document.activities.find((one) => one.id === id);
  if (found === undefined) throw new ChangeRefused('unknown', { kind: 'activity', activity: id }, `the document holds no activity ${id}`);
  return found;
}

/** A name a person gave something: text with something in it, as it stands and untrimmed, since a remote draws it as given. */
function named(value: unknown, what: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new ChangeRefused('invalid', { kind: 'document' }, `${what} has no name`);
  return value;
}

/** The commands a device's carried definition holds, by name, or undefined where it carries none and nothing can be said. */
function commandNames(device: RecipeDevice): ReadonlySet<string> | undefined {
  return device.definition === undefined ? undefined : new Set(device.definition.commands.map((one) => one.name));
}

/**
 * The inputs a device's carried definition names, or undefined where it carries none or states them in a form the
 * reader of the catalogue's records does not take, in which case nothing is said about an input rather than
 * something wrong.
 */
function inputNames(device: RecipeDevice): ReadonlySet<string> | undefined {
  if (device.definition === undefined) return undefined;
  try {
    const list = deviceDriving(device.definition.record).inputs?.list;
    return list === undefined ? undefined : new Set(list.map((one) => one.name));
  } catch {
    return undefined;
  }
}

/**
 * Refuse a change to a document that carries the part of a remote given documents, `Recipe.touch`: that part names
 * devices and activities itself, and no change here follows it yet. Said as a function not built, with the
 * requirement of the toolkit's changes, so an application meets one kind of "not yet".
 */
function changeable(document: Recipe, contract: string): void {
  opened(document);
  if (document.touch !== undefined) notBuilt(`${contract} for a document of a remote given documents`, 76);
}

/**
 * An activity's devices as the recipe states them, from the ids a caller gave: each a device of the document, named
 * once, with jobs an activity has. An input is not judged here: whether a device has it is the check's to say, so
 * an activity can be put together before every choice is made.
 */
function chosenDevices(document: Recipe, activity: string, choices: readonly ActivityDeviceChoice[]): RecipeActivity['devices'] {
  const seen = new Set<DeviceId>();
  return choices.map((choice) => {
    const device = deviceOf(document, choice.device);
    if (seen.has(choice.device)) {
      throw new ChangeRefused('invalid', { kind: 'device', device: choice.device }, `activity ${activity} names ${device.name} twice`);
    }
    seen.add(choice.device);
    for (const role of choice.roles) {
      if (!(ACTIVITY_ROLE_NAMES as readonly string[]).includes(role)) {
        throw new ChangeRefused('invalid', { kind: 'device', device: choice.device }, `activity ${activity} gives ${device.name} a job ${String(role)} no activity has`);
      }
    }
    // The recipe names a device by its name underneath, which is why a rename has to follow every reference.
    return { device: device.name, ...(choice.input === undefined ? {} : { input: choice.input }), roles: [...choice.roles] };
  });
}

/** One place a device is named, and what kind of mention it is, which is what a removal does about it. */
interface Mention {
  readonly place: Place;
  /** A key's choice, a part in an activity, an item of a screen, a step of a sequence on a screen, the favourites. */
  readonly kind: 'key' | 'part' | 'screen' | 'step' | 'favourites';
  /** In words, for an effect's sentence: `activity Watch TV's key 3`. */
  readonly where: string;
}

/**
 * Everywhere a document names a device, other than the device itself: the one walk both `uses` and `remove` take,
 * so that what a removal says it will touch and what it touches cannot differ.
 */
function mentionsOf(document: Recipe, device: RecipeDevice): Mention[] {
  const found: Mention[] = [];
  const keysOf = (owner: Owner, keys: readonly RecipeKey[] | undefined, what: string): void => {
    for (const key of keys ?? []) {
      if ('device' in key.action && key.action.device === device.name) {
        found.push({ place: { kind: 'key', owner, scan: key.scan, ...(key.press === undefined ? {} : { press: key.press }) }, kind: 'key', where: `${what}'s key ${key.scan}` });
      }
    }
  };
  for (const other of document.devices) {
    if (other.id !== device.id) keysOf({ device: other.id! }, other.keys, `${other.name}'s own map`);
  }
  for (const activity of document.activities) {
    const owner: Owner = { activity: activity.id! };
    if (activity.devices.some((used) => used.device === device.name)) {
      found.push({ place: { kind: 'activity-device', activity: activity.id!, device: device.id! }, kind: 'part', where: `activity ${activity.name}` });
    }
    (activity.screen ?? []).forEach((item, at) => {
      if ('sequence' in item) {
        if (item.steps.some((step) => 'device' in step && step.device === device.name)) {
          found.push({ place: { kind: 'screen-item', owner, item: at }, kind: 'step', where: `activity ${activity.name}'s sequence ${item.sequence}` });
        }
      } else if (item.device === device.name) {
        found.push({ place: { kind: 'screen-item', owner, item: at }, kind: 'screen', where: `activity ${activity.name}'s screen` });
      }
    });
    keysOf(owner, activity.keys, `activity ${activity.name}`);
  }
  const channels = (document.favourites ?? []).find((one) => one.device === device.name)?.channels.length;
  if (channels !== undefined) {
    found.push({ place: { kind: 'favourite', device: device.id!, favourite: 0 }, kind: 'favourites', where: `${channels} favourite ${channels === 1 ? 'channel' : 'channels'}` });
  }
  return found;
}

/**
 * The names of the document's protocol definitions a device's carried commands are written in, by the one reading
 * of which definition a command's code names, `catalogueProtocol`. None for a device that carries no definition.
 */
function protocolsOf(document: Recipe, device: RecipeDevice): Set<string> {
  const held = new Map((document.protocols ?? []).map((one) => [String(one['name']), one as unknown as ArchiveProtocol]));
  const names = new Set<string>();
  for (const command of device.definition?.commands ?? []) {
    const found = catalogueProtocol(command.keycode, held);
    if (found !== undefined) names.add(found.name);
  }
  return names;
}

/** A list with the item at one position put at another, both counted from 0, or the refusal naming the position. */
function moved<T>(list: readonly T[], from: number, to: number, place: Place, what: string): T[] {
  if (!Number.isInteger(to) || to < 0 || to >= list.length) {
    throw new ChangeRefused('invalid', place, `${what} cannot go to position ${String(to)}: there are ${list.length}`);
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/** The document with one device replaced, by id. */
function withDevice(document: Recipe, device: RecipeDevice): Recipe {
  return { ...document, devices: document.devices.map((one) => (one.id === device.id ? device : one)) };
}

/** The document with one activity replaced, by id. */
function withActivity(document: Recipe, activity: RecipeActivity): Recipe {
  return { ...document, activities: document.activities.map((one) => (one.id === activity.id ? activity : one)) };
}

// ---------------------------------------------------------------------------------------------------
// A document to start from
// ---------------------------------------------------------------------------------------------------

/**
 * A fresh document for a model: no device, no activity, and valid as it stands. Refused, as a `RecipeError`, for a
 * model no family serves, so a document is never started that nothing could build.
 */
export function create(model: RecipeModel): Recipe {
  limitsOf(model);
  return {
    version: RECIPE_VERSION,
    model: { name: model.name, ...(model.skin === undefined ? {} : { skin: model.skin }) },
    devices: [],
    activities: [],
  };
}

/**
 * A document out of parsed JSON or out of a recipe written by hand: its shape checked as `readRecipe` checks it, an
 * id given to every device and activity that has none, in the document's own order, and the version stated. A
 * document that already went through here comes back equal, so opening is safe to do on every load.
 */
export function open(json: unknown): Recipe {
  const read = readRecipe(json);
  const deviceIds = read.devices.map((one) => one.id);
  const devices = read.devices.map((one, at): RecipeDevice => {
    if (one.id !== undefined) return one;
    const id = nextId('d', deviceIds);
    deviceIds[at] = id;
    return { id, ...one };
  });
  const activityIds = read.activities.map((one) => one.id);
  const activities = read.activities.map((one, at): RecipeActivity => {
    if (one.id !== undefined) return one;
    const id = nextId('a', activityIds);
    activityIds[at] = id;
    return { id, ...one };
  });
  return { ...read, version: RECIPE_VERSION, devices, activities };
}

// ---------------------------------------------------------------------------------------------------
// Changes
// ---------------------------------------------------------------------------------------------------

/**
 * Add a device with its definition, R10, last in the device list. The definition is carried in the document, with
 * the protocol definitions its commands are written in, so the setup builds and stays editable when no source of
 * devices answers any more. Refused over the model's device count, and under a name another device has: the remote
 * lists devices by name, and so does the recipe underneath.
 */
export function addDevice(document: Recipe, device: NewDevice): Change {
  changeable(document, 'recipe.addDevice');
  const name = named(device.name, 'the device');
  if (document.devices.some((one) => one.name === name)) {
    throw new ChangeRefused('invalid', { kind: 'document' }, `the document already holds a device named ${name}`);
  }
  const { maxDevices } = limitsOf(document.model);
  if (maxDevices !== undefined && document.devices.length >= maxDevices) {
    throw new ChangeRefused('over-limit', { kind: 'document' }, `a ${document.model.name} holds ${maxDevices} devices, and the document holds that many`);
  }
  const carried = device.device;
  const commands = carried.definition?.commands;
  if (typeof carried.entry !== 'string' || carried.entry === '' || !Array.isArray(commands)
    || typeof carried.definition.record?.['codeset'] !== 'string'
    || commands.some((one) => typeof one?.name !== 'string' || typeof one?.keycode !== 'string')) {
    throw new ChangeRefused('invalid', { kind: 'document' }, `what was given for ${name} is not a device with a definition: an entry, a record naming its codeset, and commands each a name and a keycode`);
  }
  // The protocol definitions are the document's, by name: one a device already brought is kept as it is, since two
  // devices of one archive name the same definition and the builders are served the first by that name.
  const held = new Set((document.protocols ?? []).map((one) => one['name']));
  const protocols = [...(document.protocols ?? []), ...carried.protocols.filter((one) => !held.has(one['name']))];
  const added: RecipeDevice = {
    id: nextId('d', document.devices.map((one) => one.id)),
    name,
    device: carried.entry,
    definition: carried.definition,
  };
  return {
    document: { ...document, devices: [...document.devices, added], ...(protocols.length === 0 ? {} : { protocols }) },
    effects: [],
  };
}

/**
 * Change a device: its name, R12, whether it stays on between activities, and its device key. A new name follows
 * the device everywhere the document names it, an activity's devices, a key's choice, a screen's items, a
 * sequence's steps and the favourites, since underneath the recipe names a device by its name; that is the
 * toolkit keeping the whole consistent and not an effect to report. Its power, inputs, timing and channel tuning
 * are in the contract and read by no builder yet: each refuses by name.
 */
export function setDevice(document: Recipe, device: DeviceId, changes: DeviceChanges): Change {
  changeable(document, 'recipe.setDevice');
  const now = deviceOf(document, device);
  if (changes.power !== undefined) return notBuilt('recipe.setDevice for its power', 14);
  if (changes.inputs !== undefined) return notBuilt('recipe.setDevice for its inputs', 15);
  if (changes.timing !== undefined) return notBuilt('recipe.setDevice for its timing', 16);
  if (changes.channelTuning !== undefined) return notBuilt('recipe.setDevice for its channel tuning', 18);
  const place: Place = { kind: 'device', device };
  let name = now.name;
  if (changes.name !== undefined) {
    name = named(changes.name, 'the device');
    if (document.devices.some((one) => one.id !== device && one.name === name)) {
      throw new ChangeRefused('invalid', place, `the document already holds a device named ${name}`);
    }
  }
  if (changes.deviceKey !== undefined && changes.deviceKey !== 'none'
    && (!Number.isInteger(changes.deviceKey.place) || changes.deviceKey.place < 0)) {
    throw new ChangeRefused('invalid', place, `${name}'s device key is at no place`);
  }
  // Rebuilt member by member in the recipe's own order, so a field given back to its default leaves nothing behind.
  const { name: _name, poweredOnBetweenActivities: keptOn, key: deviceKey, ...rest } = now;
  const kept = changes.keptOnBetweenActivities ?? keptOn === true;
  const key = changes.deviceKey === undefined ? deviceKey : changes.deviceKey === 'none' ? undefined : changes.deviceKey;
  const changed: RecipeDevice = { ...rest, name, ...(kept ? { poweredOnBetweenActivities: true } : {}), ...(key === undefined ? {} : { key }) };
  let next = withDevice(document, changed);
  if (name !== now.name) {
    // Every mention of the old name becomes the new one. A key's choice may name the device from any map.
    const renamed = (keys: readonly RecipeKey[] | undefined): readonly RecipeKey[] | undefined => keys?.map((one) =>
      ('device' in one.action && one.action.device === now.name ? { ...one, action: { ...one.action, device: name } } : one));
    next = {
      ...next,
      devices: next.devices.map((one) => (one.keys === undefined ? one : { ...one, keys: renamed(one.keys)! })),
      activities: next.activities.map((activity) => ({
        ...activity,
        devices: activity.devices.map((used) => (used.device === now.name ? { ...used, device: name } : used)),
        ...(activity.screen === undefined ? {} : {
          screen: activity.screen.map((item) => ('sequence' in item
            ? { ...item, steps: item.steps.map((step) => ('device' in step && step.device === now.name ? { ...step, device: name } : step)) }
            : item.device === now.name ? { ...item, device: name } : item)),
        }),
        ...(activity.keys === undefined ? {} : { keys: renamed(activity.keys)! }),
      })),
      ...(next.favourites === undefined ? {} : {
        favourites: next.favourites.map((one) => (one.device === now.name ? { ...one, device: name } : one)),
      }),
    };
  }
  return { document: next, effects: [] };
}

/**
 * Add a command to a device or fix one's code, R19; `'original'` puts a fixed one back to the catalogue's code and
 * `'removed'` takes a command away, with what used it reported.
 */
export function setDeviceCommand(
  document: Recipe, device: DeviceId, command: string, code: CommandCode | 'original' | 'removed',
): Change {
  void document; void device; void command; void code;
  return notBuilt('recipe.setDeviceCommand', 19);
}

/**
 * Add an activity, R21, last in the activity menu: its devices by id, each with its jobs and the input it is
 * switched to, or none. Refused over the model's activity count, under a name another activity has, with a device
 * the document does not hold or names twice, and with a job no activity has. An input is not judged here: whether
 * a device has it is the check's to say, so an activity can be put together before every choice is made.
 */
export function addActivity(document: Recipe, activity: NewActivity): Change {
  changeable(document, 'recipe.addActivity');
  const name = named(activity.name, 'the activity');
  if (document.activities.some((one) => one.name === name)) {
    throw new ChangeRefused('invalid', { kind: 'document' }, `the document already holds an activity named ${name}`);
  }
  if (typeof activity.type !== 'string' || activity.type === '') {
    throw new ChangeRefused('invalid', { kind: 'document' }, `activity ${name} states no kind`);
  }
  const { maxActivities } = limitsOf(document.model);
  if (maxActivities !== undefined && document.activities.length >= maxActivities) {
    throw new ChangeRefused('over-limit', { kind: 'document' }, `a ${document.model.name} holds ${maxActivities} ${maxActivities === 1 ? 'activity' : 'activities'}, and the document holds that many`);
  }
  const devices = chosenDevices(document, name, activity.devices);
  const added: RecipeActivity = { id: nextId('a', document.activities.map((one) => one.id)), name, type: activity.type, devices };
  return { document: { ...document, activities: [...document.activities, added] }, effects: [] };
}

/**
 * Change an activity: its name, R25, its kind, and its devices with their jobs and inputs, whole and in the order
 * given, R22 to R24 and R28. Its icon, its extra steps and its activity key are in the contract and read by no
 * builder yet: each refuses by name.
 */
export function setActivity(document: Recipe, activity: ActivityId, changes: ActivityChanges): Change {
  changeable(document, 'recipe.setActivity');
  const now = activityOf(document, activity);
  if (changes.icon !== undefined) return notBuilt('recipe.setActivity for its icon', 27);
  if (changes.start !== undefined || changes.end !== undefined) return notBuilt('recipe.setActivity for its extra steps', 30);
  if (changes.activityKey !== undefined) return notBuilt('recipe.setActivity for its activity key', 29);
  const place: Place = { kind: 'activity', activity };
  let name = now.name;
  if (changes.name !== undefined) {
    name = named(changes.name, 'the activity');
    if (document.activities.some((one) => one.id !== activity && one.name === name)) {
      throw new ChangeRefused('invalid', place, `the document already holds an activity named ${name}`);
    }
  }
  if (changes.type !== undefined && (typeof changes.type !== 'string' || changes.type === '')) {
    throw new ChangeRefused('invalid', place, `activity ${name} states no kind`);
  }
  const changed: RecipeActivity = {
    ...now, name,
    ...(changes.type === undefined ? {} : { type: changes.type }),
    ...(changes.devices === undefined ? {} : { devices: chosenDevices(document, name, changes.devices) }),
  };
  return { document: withActivity(document, changed), effects: [] };
}

/** Add a sequence, R37. It sends nothing until it is put on a key or a screen. */
export function addSequence(document: Recipe, sequence: NewSequence): Change {
  void document; void sequence;
  return notBuilt('recipe.addSequence', 37);
}

/** Change a sequence's name or its steps. */
export function setSequence(document: Recipe, sequence: SequenceId, changes: Partial<NewSequence>): Change {
  void document; void sequence; void changes;
  return notBuilt('recipe.setSequence', 37);
}

/**
 * Say what a key does, in an activity, R31, or for a device in device mode, R32; with `press: 'held'`, its second
 * command, R38. `'default'` gives the key back to what the builders derive for it.
 */
export function setKey(document: Recipe, key: KeyPlace, action: KeyAction | 'default'): Change {
  changeable(document, 'recipe.setKey');
  const place: Place = { kind: 'key', owner: key.owner, scan: key.scan, ...(key.press === undefined ? {} : { press: key.press }) };
  // A key's second command and a sequence on a key are in the contract and not built: said by name, so that an
  // application meets the same refusal here as from a function that is not built at all.
  if (key.press === 'held') return notBuilt('recipe.setKey for a held press', 38);
  if (action !== 'default' && 'sequence' in action) return notBuilt('recipe.setKey for a sequence', 37);
  if (!Number.isInteger(key.scan) || key.scan < 0) throw new ChangeRefused('invalid', place, `${String(key.scan)} is no key's scan code`);
  let stated: RecipeKeyAction | undefined;
  if (action !== 'default') {
    if ('nothing' in action) {
      stated = { nothing: true };
    } else {
      const device = deviceOf(document, action.device);
      const commands = commandNames(device);
      // Where the device carries its definition the command is known or not; where it carries none nothing can be
      // said here, and the build, which is given a catalogue, refuses a command the device does not have.
      if (commands !== undefined && !commands.has(action.command)) {
        throw new ChangeRefused('unknown', { kind: 'command', device: action.device, command: action.command }, `${device.name} has no command ${action.command}`);
      }
      stated = { device: device.name, command: action.command };
    }
  }
  /** The owner's choices with this key's replaced, or taken out for the default; no choice left is no field at all. */
  const chosen = (keys: readonly RecipeKey[] | undefined): readonly RecipeKey[] | undefined => {
    const others = (keys ?? []).filter((one) => !(one.scan === key.scan && (one.press ?? 'short') === 'short'));
    const next = stated === undefined ? others : [...others, { scan: key.scan, action: stated }];
    return next.length === 0 ? undefined : next;
  };
  if ('device' in key.owner) {
    const { keys: _dropped, ...device } = deviceOf(document, key.owner.device);
    const keys = chosen(_dropped);
    return { document: withDevice(document, { ...device, ...(keys === undefined ? {} : { keys }) }), effects: [] };
  }
  const { keys: _dropped, ...activity } = activityOf(document, key.owner.activity);
  const keys = chosen(_dropped);
  return { document: withActivity(document, { ...activity, ...(keys === undefined ? {} : { keys }) }), effects: [] };
}

/** Say what an owner's screen shows, in order, R34 to R36; `'default'` gives it back to what the builders derive. */
export function setScreen(document: Recipe, owner: Owner, items: readonly ScreenItem[] | 'default'): Change {
  void document; void owner; void items;
  return notBuilt('recipe.setScreen', 34);
}

/** A device's favourite channels, whole and in order, R45; an empty list is none. Refused over the model's count. */
export function setFavourites(document: Recipe, device: DeviceId, favourites: readonly Favourite[]): Change {
  void document; void device; void favourites;
  return notBuilt('recipe.setFavourites', 45);
}

/**
 * The look of the screens, R42: the choices of the model's family over its defaults, only the ones given changed;
 * `'default'` drops every choice.
 */
export function setLook(document: Recipe, choices: Readonly<Record<string, unknown>> | 'default'): Change {
  void document; void choices;
  return notBuilt('recipe.setLook', 42);
}

/** One of the remote's own settings by its name, R47; `'default'` drops the choice. */
export function setSetting(document: Recipe, setting: string, value: number | boolean | string | 'default'): Change {
  void document; void setting; void value;
  return notBuilt('recipe.setSetting', 47);
}

/**
 * Remove a device, R13, or an activity, R26, and settle everything that used it, each as an effect. A device
 * leaves the activities that used it, which stay, with their other devices or with none; a key's choice that sent
 * one of its commands goes back to the key's default; an item of a screen that showed one of its commands goes, a
 * sequence loses the steps that sent them and goes with its last step; and its favourite channels go with it.
 * The protocol definitions its commands were written in go too, unless a device that stays is written in them;
 * one the document held for no device of its own is left alone.
 * Nothing names an activity, so removing one has no effect beyond itself. A sequence of its own is not built.
 */
export function remove(document: Recipe, what: Removable): Change {
  changeable(document, 'recipe.remove');
  if ('sequence' in what) return notBuilt('recipe.remove for a sequence', 37);
  if ('activity' in what) {
    const gone = activityOf(document, what.activity);
    return { document: { ...document, activities: document.activities.filter((one) => one.id !== gone.id) }, effects: [] };
  }
  const gone = deviceOf(document, what.device);
  const effects: Effect[] = mentionsOf(document, gone).map((one): Effect => {
    switch (one.kind) {
      case 'part': return { place: one.place, effect: 'changed', message: `${one.where} no longer uses ${gone.name}` };
      case 'key': return { place: one.place, effect: 'removed', message: `${one.where} sent a command of ${gone.name} and goes back to its default` };
      case 'screen': return { place: one.place, effect: 'removed', message: `${one.where} showed a command of ${gone.name}, which is taken off it` };
      case 'step': return { place: one.place, effect: 'changed', message: `${one.where} loses the steps that sent a command of ${gone.name}` };
      default: return { place: one.place, effect: 'removed', message: `${gone.name}'s ${one.where} go with it` };
    }
  });
  /** An owner's choices without the ones that sent the gone device's commands; none left is no field. */
  const without = (keys: readonly RecipeKey[] | undefined): readonly RecipeKey[] | undefined => {
    const left = (keys ?? []).filter((one) => !('device' in one.action && one.action.device === gone.name));
    return left.length === 0 ? undefined : left;
  };
  const devices = document.devices.filter((one) => one.id !== gone.id).map((one): RecipeDevice => {
    const { keys, ...rest } = one;
    const left = without(keys);
    return { ...rest, ...(left === undefined ? {} : { keys: left }) };
  });
  const activities = document.activities.map((activity): RecipeActivity => {
    const { keys, screen, ...rest } = activity;
    const left = without(keys);
    const items = screen?.flatMap((item): RecipeScreenItem[] => {
      if (!('sequence' in item)) return item.device === gone.name ? [] : [item];
      const steps = item.steps.filter((step) => !('device' in step && step.device === gone.name));
      // A sequence has at least one step that sends something: one left with pauses alone, or with none, goes.
      return steps.some((step) => 'device' in step) ? [{ ...item, steps }] : [];
    });
    return {
      ...rest,
      devices: activity.devices.filter((used) => used.device !== gone.name),
      ...(items === undefined ? {} : { screen: items }),
      ...(left === undefined ? {} : { keys: left }),
    };
  });
  const { favourites, protocols, ...rest } = document;
  const kept = favourites?.filter((one) => one.device !== gone.name);
  const theirs = protocolsOf(document, gone);
  const needed = new Set(devices.flatMap((one) => [...protocolsOf(document, one)]));
  const written = protocols?.filter((one) => !theirs.has(String(one['name'])) || needed.has(String(one['name'])));
  return {
    document: {
      ...rest, devices, activities,
      ...(kept === undefined || kept.length === 0 ? {} : { favourites: kept }),
      ...(written === undefined || written.length === 0 ? {} : { protocols: written }),
    },
    effects,
  };
}

/** Put a device, an activity or an activity's device at another position, counted from 0, R28. */
export function move(document: Recipe, what: Movable, to: number): Change {
  changeable(document, 'recipe.move');
  if ('activity' in what) {
    const activity = activityOf(document, what.activity);
    if ('device' in what) {
      const device = deviceOf(document, what.device);
      const from = activity.devices.findIndex((used) => used.device === device.name);
      const place: Place = { kind: 'activity-device', activity: what.activity, device: what.device };
      if (from < 0) throw new ChangeRefused('unknown', place, `activity ${activity.name} does not use ${device.name}`);
      return { document: withActivity(document, { ...activity, devices: moved(activity.devices, from, to, place, device.name) }), effects: [] };
    }
    const from = document.activities.findIndex((one) => one.id === activity.id);
    return { document: { ...document, activities: moved(document.activities, from, to, { kind: 'activity', activity: what.activity }, `activity ${activity.name}`) }, effects: [] };
  }
  const device = deviceOf(document, what.device);
  const from = document.devices.findIndex((one) => one.id === device.id);
  return { document: { ...document, devices: moved(document.devices, from, to, { kind: 'device', device: what.device }, device.name) }, effects: [] };
}

// ---------------------------------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------------------------------

/** The devices, in the order the remote lists them. */
export function devices(document: Recipe): DeviceSummary[] {
  opened(document);
  return document.devices.map((one): DeviceSummary => {
    // The catalogue's entry is `<manufacturer>/<file>`, and the file is the model number as the catalogue spells it.
    const slash = one.device.indexOf('/');
    return {
      id: one.id!,
      name: one.name,
      entry: one.device,
      ...(slash < 0 ? {} : { manufacturer: one.device.slice(0, slash), model: one.device.slice(slash + 1) }),
      // No definition marks a command as learned yet, R11, so no device is.
      learned: false,
    };
  });
}

/** The activities, in the order of the activity menu. */
export function activities(document: Recipe): ActivitySummary[] {
  opened(document);
  const idOf = new Map(document.devices.map((one) => [one.name, one.id!]));
  return document.activities.map((one): ActivitySummary => ({
    id: one.id!,
    name: one.name,
    type: one.type,
    // A device the document does not hold has no id to give; the check lists it, and a list of devices leaves it out.
    devices: one.devices.filter((used) => idOf.has(used.device)).map((used) => ({
      device: idOf.get(used.device)!, ...(used.input === undefined ? {} : { input: used.input }), roles: used.roles,
    })),
  }));
}

/** The sequences. */
export function sequences(document: Recipe): SequenceSummary[] {
  void document;
  return notBuilt('recipe.sequences', 77);
}

/**
 * A device's commands, by name, in its definition's own order. Refused, as a `RecipeError`, for a device that
 * carries no definition: its commands are in a catalogue and not in the document, and an empty list would say it
 * has none.
 */
export function commands(document: Recipe, device: DeviceId): CommandSummary[] {
  opened(document);
  const one = deviceOf(document, device);
  if (one.definition === undefined) throw new RecipeError(`${one.name} carries no definition, so its commands are not in the document`);
  // No definition marks a command as changed or learned yet, R19 and R11.
  return one.definition.commands.map((command) => ({ name: command.name, changed: false, learned: false }));
}

/**
 * The inputs a device can be switched to, by the names an activity chooses one by; none for a device that states
 * no list of them, which is one that can only step through its inputs. Refused as `commands` is for a device that
 * carries no definition.
 */
export function inputs(document: Recipe, device: DeviceId): string[] {
  opened(document);
  const one = deviceOf(document, device);
  if (one.definition === undefined) throw new RecipeError(`${one.name} carries no definition, so its inputs are not in the document`);
  return [...(inputNames(one) ?? [])];
}

/** What one key does. */
export function key(document: Recipe, place: KeyPlace): KeyAnswer {
  void document; void place;
  return notBuilt('recipe.key', 77);
}

/** What every key of an owner does, the default ones included: the whole keypad as the remote will have it. */
export function keys(document: Recipe, owner: Owner): KeyAnswer[] {
  void document; void owner;
  return notBuilt('recipe.keys', 77);
}

/** What an owner's screen shows. */
export function screen(document: Recipe, owner: Owner): ScreenAnswer {
  void document; void owner;
  return notBuilt('recipe.screen', 77);
}

/** A device's favourite channels, in order. */
export function favourites(document: Recipe, device: DeviceId): Favourite[] {
  void document; void device;
  return notBuilt('recipe.favourites', 77);
}

/**
 * Everything that names a device or an activity: what removing it would touch, the same places `remove` reports as
 * effects. Nothing names an activity, so its list is empty. A sequence of its own is not built.
 */
export function uses(document: Recipe, what: Removable): Place[] {
  opened(document);
  if ('sequence' in what) return notBuilt('recipe.uses for a sequence', 37);
  if ('activity' in what) {
    activityOf(document, what.activity);
    return [];
  }
  return mentionsOf(document, deviceOf(document, what.device)).map((one) => one.place);
}

/** What is not yet filled in, R77: the places of the problems `check` codes `unfinished`. */
export function unfilled(document: Recipe): Place[] {
  return check(document).filter((one) => one.code === 'unfinished').map((one) => one.place);
}

// ---------------------------------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------------------------------

/**
 * Every problem of a document as a list, without building it, R78. Empty is a document a build takes; a build and a
 * sync refuse while the list holds an error, and say the same problems.
 */
export function check(document: Recipe): Problem[] {
  opened(document);
  const problems: Problem[] = [];
  const say = (severity: 'error' | 'note', code: ProblemCode, place: Place, message: string): void => {
    problems.push({ severity, code, place, message });
  };
  const whole: Place = { kind: 'document' };

  // The model: one no family serves is a document nothing builds, and then no limit can be read either.
  let limits: ReturnType<typeof limitsOf> | undefined;
  try {
    limits = limitsOf(document.model);
  } catch (error) {
    if (!(error instanceof RecipeError)) throw error;
    say('error', 'not-on-this-model', whole, error.message);
  }
  if (limits?.maxDevices !== undefined && document.devices.length > limits.maxDevices) {
    say('error', 'over-limit', whole, `a ${document.model.name} holds ${limits.maxDevices} devices, and the document holds ${document.devices.length}`);
  }
  if (limits?.maxActivities !== undefined && document.activities.length > limits.maxActivities) {
    say('error', 'over-limit', whole, `a ${document.model.name} holds ${limits.maxActivities} ${limits.maxActivities === 1 ? 'activity' : 'activities'}, and the document holds ${document.activities.length}`);
  }

  const byName = new Map<string, RecipeDevice>();
  for (const device of document.devices) {
    const place: Place = { kind: 'device', device: device.id! };
    // The first of a name keeps it; every later one is the problem, so that fixing the listed ones is enough.
    if (byName.has(device.name)) say('error', 'name-taken', place, `two devices are named ${device.name}`);
    else byName.set(device.name, device);
    if (device.definition === undefined) {
      say('note', 'no-definition', place, `${device.name} carries no definition, so it builds only where a catalogue holding ${device.device} is given`);
    }
  }

  /** The problems of one owner's key choices: a device or a command that is not there, and what is not built. */
  const checkKeys = (owner: Owner, keys: readonly RecipeKey[] | undefined, what: string): void => {
    for (const key of keys ?? []) {
      const place: Place = { kind: 'key', owner, scan: key.scan, ...(key.press === undefined ? {} : { press: key.press }) };
      if (key.press === 'held') say('error', 'not-on-this-model', place, `${what} gives key ${key.scan} a second command when held, which nothing builds yet`);
      if ('sequence' in key.action) {
        say('error', 'not-on-this-model', place, `${what} puts a sequence on key ${key.scan}, which nothing builds yet`);
      } else if ('device' in key.action) {
        const device = byName.get(key.action.device);
        if (device === undefined) {
          say('error', 'unknown-device', place, `${what} gives key ${key.scan} a command of ${key.action.device}, which is no device of the document`);
        } else if (commandNames(device)?.has(key.action.command) === false) {
          say('error', 'unknown-command', place, `${what} gives key ${key.scan} ${device.name}'s ${key.action.command}, which ${device.name} does not have`);
        }
      }
    }
  };
  for (const device of document.devices) checkKeys({ device: device.id! }, device.keys, `${device.name}'s own map`);

  const activityNames = new Set<string>();
  for (const activity of document.activities) {
    const place: Place = { kind: 'activity', activity: activity.id! };
    if (activityNames.has(activity.name)) say('error', 'name-taken', place, `two activities are named ${activity.name}`);
    activityNames.add(activity.name);
    if (activity.devices.length === 0) say('note', 'unfinished', place, `activity ${activity.name} uses no device yet`);
    for (const used of activity.devices) {
      const device = byName.get(used.device);
      if (device === undefined) {
        say('error', 'unknown-device', place, `activity ${activity.name} uses ${used.device}, which is no device of the document`);
        continue;
      }
      if (used.input !== undefined && inputNames(device)?.has(used.input) === false) {
        say('error', 'unknown-input', { kind: 'activity-device', activity: activity.id!, device: device.id! },
          `activity ${activity.name} switches ${device.name} to ${used.input}, which is not one of its inputs`);
      }
    }
    for (const item of activity.screen ?? []) {
      if ('device' in item && !byName.has(item.device)) {
        say('error', 'unknown-device', place, `activity ${activity.name}'s screen shows a command of ${item.device}, which is no device of the document`);
      }
    }
    checkKeys({ activity: activity.id! }, activity.keys, `activity ${activity.name}`);
  }
  return problems;
}
