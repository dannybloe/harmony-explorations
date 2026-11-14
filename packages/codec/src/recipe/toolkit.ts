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
 * Nothing here is built yet. Every function refuses by name, `NotBuiltError`, with the requirement it waits on, and
 * `test/recipe/toolkit.test.ts` holds the list of those still refusing, which is the measure of what is left.
 */
import type { DeviceChannelTuning, DeviceInputs, DevicePower, DeviceTiming } from '../catalogue/driving.ts';
import type { CarriedDevice } from '../catalogue/search.ts';
import type { ActivityRoleName } from '../compose/activityroles.ts';
import type { Pulse } from '../infrared/irframe.ts';
import { notBuilt } from '../support/contract.ts';
import { RecipeError, type Recipe, type RecipeDeviceKey, type RecipeModel } from './recipe.ts';

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
 * One key of an owner. `key` is the name the model's drawing gives the key, Logitech's own vocabulary, `VolumeUp`,
 * `DirectionLeft`, the same on every model that has the key. `press` tells a key's second command, sent when it is
 * held, from its first, R38; absent is the short press.
 */
export interface KeyPlace {
  readonly owner: Owner;
  readonly key: string;
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
  | { readonly kind: 'key'; readonly owner: Owner; readonly key: string; readonly press?: 'short' | 'held' }
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
// A document to start from
// ---------------------------------------------------------------------------------------------------

/** A fresh document for a model: no device, no activity, and valid as it stands. */
export function create(model: RecipeModel): Recipe {
  void model;
  return notBuilt('recipe.create', 76);
}

/**
 * A document out of parsed JSON or out of a recipe written by hand: its shape checked as `readRecipe` checks it,
 * an id given to every device, activity and sequence that has none, and an older version brought up to this one.
 */
export function open(json: unknown): Recipe {
  void json;
  return notBuilt('recipe.open', 76);
}

// ---------------------------------------------------------------------------------------------------
// Changes
// ---------------------------------------------------------------------------------------------------

/** Add a device with its definition, R10 and R11. Refused over the model's device count. */
export function addDevice(document: Recipe, device: NewDevice): Change {
  void document; void device;
  return notBuilt('recipe.addDevice', 10);
}

/** Change a device: its name, how it is powered, its inputs, its timing, its channel tuning, its device key. */
export function setDevice(document: Recipe, device: DeviceId, changes: DeviceChanges): Change {
  void document; void device; void changes;
  return notBuilt('recipe.setDevice', 12);
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

/** Add an activity, R21, last in the activity menu. Refused over the model's activity count. */
export function addActivity(document: Recipe, activity: NewActivity): Change {
  void document; void activity;
  return notBuilt('recipe.addActivity', 21);
}

/** Change an activity: its name, its devices and their jobs and inputs, its icon, its extra steps, its activity key. */
export function setActivity(document: Recipe, activity: ActivityId, changes: ActivityChanges): Change {
  void document; void activity; void changes;
  return notBuilt('recipe.setActivity', 25);
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
  void document; void key; void action;
  return notBuilt('recipe.setKey', 31);
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

/** Remove a device, R13, an activity, R26, or a sequence, and settle everything that used it, each as an effect. */
export function remove(document: Recipe, what: Removable): Change {
  void document; void what;
  return notBuilt('recipe.remove', 13);
}

/** Put a device, an activity or an activity's device at another position, counted from 0, R28. */
export function move(document: Recipe, what: Movable, to: number): Change {
  void document; void what; void to;
  return notBuilt('recipe.move', 28);
}

// ---------------------------------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------------------------------

/** The devices, in the order the remote lists them. */
export function devices(document: Recipe): DeviceSummary[] {
  void document;
  return notBuilt('recipe.devices', 77);
}

/** The activities, in the order of the activity menu. */
export function activities(document: Recipe): ActivitySummary[] {
  void document;
  return notBuilt('recipe.activities', 77);
}

/** The sequences. */
export function sequences(document: Recipe): SequenceSummary[] {
  void document;
  return notBuilt('recipe.sequences', 77);
}

/** A device's commands, by name. */
export function commands(document: Recipe, device: DeviceId): CommandSummary[] {
  void document; void device;
  return notBuilt('recipe.commands', 77);
}

/** The inputs a device can be switched to, by the names an activity chooses one by. */
export function inputs(document: Recipe, device: DeviceId): string[] {
  void document; void device;
  return notBuilt('recipe.inputs', 77);
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

/** Everything that names a device, an activity or a sequence: what removing it would touch. */
export function uses(document: Recipe, what: Removable): Place[] {
  void document; void what;
  return notBuilt('recipe.uses', 77);
}

/** What is not yet filled in, R77: the places of the problems `check` codes `unfinished`. */
export function unfilled(document: Recipe): Place[] {
  void document;
  return notBuilt('recipe.unfilled', 77);
}

// ---------------------------------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------------------------------

/**
 * Every problem of a document as a list, without building it, R78. Empty is a document a build takes; a build and a
 * sync refuse while the list holds an error, and say the same problems.
 */
export function check(document: Recipe): Problem[] {
  void document;
  return notBuilt('recipe.check', 78);
}
