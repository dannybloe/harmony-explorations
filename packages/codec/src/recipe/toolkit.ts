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
 * **The same calls for every model**, decision 43. A Harmony One's document and a Harmony Touch's are one shape, and
 * every change here takes either. What a model lacks is a named answer, never a second function: a held press on a
 * Harmony One, a gesture in a device's own map or a screen on a remote without one is refused as **not on this model**,
 * `ChangeRefused` with `not-on-this-model`, from the model's places and capabilities; what nobody has written yet is
 * **not built**, `NotBuiltError`, naming the requirement it waits on, and so is every call that needs the family of a
 * model no family serves yet, `servedBy`. A change writes the document whether or not the
 * model's build reads the field yet, so a person's choice is kept while the build catches up; `check` lists what the
 * model's build does not read.
 *
 * **Three kinds of "this cannot be".** A change that is over what the model takes, a device more than it holds, or that
 * the model has no place for, is refused where it is asked, `ChangeRefused`, because no later step could make it
 * right. A document that is only not finished, an activity whose device has no input chosen, is allowed and listed:
 * `check` returns every problem, each with its place and a code an application can act on, and a build or a sync
 * refuses while it holds an error. A function not built refuses by name.
 *
 * **A person's choice is a deviation from a default.** What a key does, what a screen shows, how a device is
 * powered: the builders derive each from the catalogue and from which device has which role. The document states
 * only where a person chose otherwise, and every such setter takes `'default'` to put the choice back, so "what the
 * remote would do anyway" is never copied into the document, where it would go stale.
 *
 * **What is built and what refuses.** A fresh document and opening one; a device, an activity and a sequence added,
 * renamed, changed, moved and removed, with everything that named them settled through every field of version 2; a
 * definition fetched again; a key's every press, a screen whole, a device's timing, power and channel tuning, one
 * command's code and tuning, an activity's opening screen, favourites, power order and extra steps, and the remote's
 * settings; the lists, a device's commands and inputs, the sequences, what uses something, and the check; and the
 * questions about keys and screens, `keyNames`, `key`, `keys` and `screen`, for every model whose family states its
 * maps, decision 43, the Harmony One and the Harmony Touch, read off the maps the build binds by. A key's choice on a
 * model whose family has no maps yet refuses by name, `NotBuiltError`, as does every function and member with no
 * field in the document yet, favourites, the look, a device's inputs, an activity's icon and activity key;
 * `test/recipe/toolkit.test.ts` holds the list of those still refusing, which is the measure of what is left.
 *
 * **Ids are never given twice.** The document records the highest number given of each kind, `Recipe.highestIds`, and
 * the toolkit counts from it, so a device added after one was removed takes a new number, and nothing an application or
 * a remote's documents keyed by the old id passes to it.
 *
 * **A document comes through `create` or `open`.** Every other function addresses things by id, so it refuses a
 * recipe in which a device, an activity or a sequence has none, naming it, rather than guess an address for it.
 */
import { BENCH_MODELS } from '@harmony/base/requirements';

import type { DeviceChannelTuning, DeviceInputs, DeviceTiming, DriveStep } from '../catalogue/driving.ts';
import type { ArchiveProtocol } from '../catalogue/archive.ts';
import type { CatalogueSource } from '../catalogue/catalogue.ts';
import type { CarriedDevice } from '../catalogue/search.ts';
import { carriedCatalogue } from '../catalogue/carried.ts';
import { deviceDriving } from '../catalogue/driving.ts';
import { ACTIVITY_ROLE_NAMES, type ActivityRoleName } from '../compose/activityroles.ts';
import { catalogueProtocol } from '../compose/cataloguecodes.ts';
import { capabilitiesOf } from '../families/capabilities.ts';
import {
  binds, resolveMaps, type MapBinder, type MapPlace, type MapScreenEntry, type MapSurface, type ResolvedKey, type ResolvedMaps, type ResolvedOwner,
} from '../families/maps.ts';
import { chooseByModel, mapsOfModel, NoFamilyError, settingsOfModel, type ModelChoice, type ModelMaps } from '../families/registry.ts';
import { settingValue, type FamilySettings, type SettingKind } from '../families/settings.ts';
import { notBuilt } from '../support/contract.ts';
import { ResourceError } from '../support/resources.ts';
import {
  readRecipe, RECIPE_VERSION, RecipeError, unbuiltFields,
  type Recipe, type RecipeActivity, type RecipeActivityStep, type RecipeCommand, type RecipeCommandCode, type RecipeCommandStep,
  type RecipeDevice, type RecipeDeviceKey, type RecipeDevicePower, type RecipeKey, type RecipeKeyAction, type RecipeModel,
  type RecipePress, type RecipeScreenCommand, type RecipeScreenItem, type RecipeSending, type RecipeSequence,
  type RecipeSequenceStep, type RecipeSetting, type RecipeAttention, type RecipeAttentionKey,
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
 * One key of an owner. `key` is Logitech's word for the key, `VolumeMute`, `Info`, `Number0`: the name the model's
 * drawing carries as `data-name`, so an application reads it off the key a person clicked, and the same key on every
 * model that has it. Which words a document's model takes is `keyNames`'s answer; the number a family's firmware
 * knows the key by is the family's and never the document's, `RecipeKey`. `press` tells a key's second command, sent
 * when it is held, from its first, R38, and in the document's version 2 its double press; absent is the short press,
 * `RecipePress`.
 */
export interface KeyPlace {
  readonly owner: Owner;
  readonly key: string;
  readonly press?: RecipePress;
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
  /**
   * One role of an activity, by the document's word for it, `ActivityRoleName`, Logitech's: where a change says that no
   * device of the activity has that role any more. A role is the document's and the same word on every model, and never
   * required, decision 44; what a model does without it, such as volume keys that then send nothing, is the model's
   * family's and not said here.
   */
  | { readonly kind: 'role'; readonly activity: ActivityId; readonly role: ActivityRoleName }
  /**
   * An activity's mark of needing attention, `RecipeActivity.attention`, R93, decision 44: where a change says it set
   * the mark, or added a reason to it, and why.
   */
  | { readonly kind: 'attention'; readonly activity: ActivityId }
  | { readonly kind: 'step'; readonly activity: ActivityId; readonly when: 'start' | 'end'; readonly step: number }
  /** A device's place in the order an activity switches its devices on and off, `ActivityChanges.powerOrder`. */
  | { readonly kind: 'power-order'; readonly activity: ActivityId; readonly device: DeviceId }
  | { readonly kind: 'key'; readonly owner: Owner; readonly key: string; readonly press?: RecipePress }
  | { readonly kind: 'screen-item'; readonly owner: Owner; readonly item: number }
  | { readonly kind: 'sequence'; readonly sequence: SequenceId }
  /** One step of a sequence, counted from 0. */
  | { readonly kind: 'sequence-step'; readonly sequence: SequenceId; readonly step: number }
  | { readonly kind: 'favourite'; readonly device: DeviceId; readonly favourite: number }
  | { readonly kind: 'look' }
  | { readonly kind: 'setting'; readonly setting: string };

// ---------------------------------------------------------------------------------------------------
// What a change gives back, what a check lists, and the refusal
// ---------------------------------------------------------------------------------------------------

/**
 * One thing a change did beyond what was asked, in words a person reads and at a place an application can show.
 * `missing` is a place the change left as it was and that now names a command its device does not have, as a
 * definition fetched again can leave a key, `refreshDevice`: the choice stays the person's, and `check` lists it until
 * they choose again.
 */
export interface Effect {
  readonly place: Place;
  readonly effect: 'removed' | 'changed' | 'missing';
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
  // Two things a remote lists side by side under one name, or a name its screen cannot draw; and the note that names
  // could not be judged, since judging draws them and the codec was given nothing to draw with.
  'name-taken', 'name-not-drawable', 'names-not-judged',
  // More than the model takes, in a document that did not come through the toolkit's own changes.
  'over-limit',
  // Something the model cannot do at all, or that is not built for it yet.
  'not-on-this-model',
  // What makes no sense where it stands, as a change refuses it `invalid`: a value outside the range its setting takes,
  // a sequence on a device's own key, which a device has none of.
  'invalid',
  // A sequence longer than the remote survives.
  'sequence-too-long',
  // Not wrong, not finished: an activity that uses no device yet, an input not chosen.
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
 * Why a change is refused: `unknown`, it names something the document does not hold; `over-limit`, it would put more
 * on the model than the model takes; `invalid`, what it was given makes no sense, or would leave the document naming
 * what is gone; `not-on-this-model`, the model does not have the thing at all, as its family's places or its
 * capabilities say: a held press on a Harmony One, a gesture in a device's own map, a screen on a remote without one.
 *
 * **Not on this model is not "not built"**: a function nobody has written refuses as `NotBuiltError`, naming the
 * requirement it waits on, and an application may offer it later; what a model lacks it never offers on that model.
 */
export type RefusalReason = 'unknown' | 'over-limit' | 'invalid' | 'not-on-this-model';

/**
 * A change that cannot be made, `RefusalReason`. The document is as it was, since nothing changes in place.
 */
export class ChangeRefused extends RecipeError {
  readonly reason: RefusalReason;
  readonly place: Place;

  constructor(reason: RefusalReason, place: Place, message: string) {
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
 * original remote, which the definition then marks as learned. The document holds it as `RecipeCommandCode`, in
 * `RecipeDevice.commands`, so this is that type.
 */
export type CommandCode = RecipeCommandCode;

/**
 * A device as it is added: what the remote calls it and the definition a search fetched for it, R10, or one built
 * from learned commands, R11.
 */
export interface NewDevice {
  readonly name: string;
  readonly device: CarriedDevice;
}

/**
 * A person's change to a record stated member by member: each member given a value of its own, or `'default'` to drop
 * the person's value for that member and keep the catalogue's; a member left out is left as it is.
 */
export type MemberChanges<T> = { readonly [K in keyof T]?: T[K] | 'default' };

/**
 * What a person changes about a device; a member left out is left as it is. Each of power, inputs, timing and
 * channel tuning has the shape the catalogue states the same thing in, since a person's choice stands over the
 * catalogue's statement, **member by member**: a member given is the person's, `'default'` on a member gives that one
 * back, and `'default'` for the whole gives every one back, R14 to R18. The document keeps only what a person chose,
 * so a definition fetched again replaces none of it, `refreshDevice`.
 */
export interface DeviceChanges {
  /** R12. Every reference to the device follows, since references are by id. */
  readonly name?: string;
  /** Kept on when an activity that does not use it starts, R14. */
  readonly keptOnBetweenActivities?: boolean;
  /** How it is powered, R14, the catalogue's members and `alwaysOn`, a device never switched off. */
  readonly power?: MemberChanges<RecipeDevicePower> | 'default';
  readonly inputs?: DeviceInputs | 'default';
  /** The delays and the repeat counts, R16 and R17, in the catalogue's own member names, `DeviceTiming`. */
  readonly timing?: MemberChanges<DeviceTiming> | 'default';
  /** How a channel number is entered, R18, its steps naming the device's commands by name. */
  readonly channelTuning?: MemberChanges<DeviceChannelTuning> | 'default';
  /** The device key it goes on, on a model with a key per device, R39. */
  readonly deviceKey?: RecipeDeviceKey | 'none';
}

/**
 * A person's change to one command of a device, R19 and R89: a code of its own, `'original'` to drop it and send the
 * definition's code again, and how that one command is sent, member by member as a device's timing is, the copies of
 * the code in a press, the pace of the held block and the silence before the first block, `RecipeSending`.
 */
export interface CommandChange {
  readonly code?: CommandCode | 'original';
  readonly sending?: MemberChanges<RecipeSending> | 'default';
}

/** One device's part in an activity: the input it is switched to, or none to leave it alone, and its roles, R22 to R24. */
export interface ActivityDeviceChoice {
  readonly device: DeviceId;
  readonly input?: string;
  readonly roles: readonly ActivityRoleName[];
}

/**
 * One step of an activity's start or end beyond what its devices need anyway, R30: a command of one of the activity's
 * devices, a pause in tenths of a second, one of the activity's own sequences, or a channel tuned through one of its
 * devices, its digits as text so a leading zero survives, `RecipeChannelStep`.
 */
export type ActivityStep =
  | { readonly device: DeviceId; readonly command: string }
  | { readonly pause: number }
  | { readonly sequence: SequenceId }
  | { readonly device: DeviceId; readonly channel: string };

/** An activity as it is added: its name, Logitech's kind, and its devices with their roles, R21. */
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
  /** The devices and their roles, in the order the activity lists them, R22 to R24 and R28. */
  readonly devices?: readonly ActivityDeviceChoice[];
  /** R27, by the name of one of our icons. */
  readonly icon?: string | 'none';
  /** Extra steps at its start and its end, R30, each list whole; `'default'` is none. */
  readonly start?: readonly ActivityStep[] | 'default';
  readonly end?: readonly ActivityStep[] | 'default';
  /** Which activity key starts it, counted from 0, on a model with activity keys, R29. */
  readonly activityKey?: number | 'none';
  /** The screen it opens on, R91, by the word the model's family names it by; `'default'` is the family's. */
  readonly opensOn?: string | 'default';
  /**
   * Whether it holds the favourite channels, R45: true takes the hold off whichever activity had it, since one
   * activity holds them; false says this one does not; `'default'` leaves it to the family.
   */
  readonly favourites?: boolean | 'default';
  /** The order it switches its devices on and off in, R90, every device of the activity once; `'default'` is the family's. */
  readonly powerOrder?: readonly DeviceId[] | 'default';
  /**
   * Whether it is switched on, R92, decision 44: false keeps it in the document and out of every build and sync, which
   * say they left it out; true switches it on again, the same activity under the same id.
   */
  readonly enabled?: boolean;
}

/** One step of a sequence, R37: a device's command by its name, or a pause in tenths of a second. */
export type SequenceStep = { readonly device: DeviceId; readonly command: string } | { readonly pause: number };

/**
 * A sequence as it is added: its name and its steps. **A sequence is its activity's**, decision 43: it is added to one
 * activity, its steps send to that activity's devices, and a key, a screen entry or an extra step of the same activity
 * runs it, by its id.
 */
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
  /** False where a person switched it off, R92: a build and a sync leave it out, and say so. */
  readonly enabled: boolean;
  /**
   * Why it needs attention, R93, each reason as the document records it, `Attention`; empty where it needs none. An
   * activity needing attention is still built and synced: it is never invalid, decision 44.
   */
  readonly attention: readonly Attention[];
}

/**
 * One reason an activity needs attention, R93, decision 44, as the document records it, `RecipeAttention`: what
 * happened, `device-removed` or `marked`; the device by the name it had, since one removed has no id left; every press
 * of the activity whose answer the removal changed, with what it did and does, where the keys are known; and a sentence
 * in English. **Data an application words itself**: the sentence is there for one that does not.
 */
export type Attention = RecipeAttention;

/**
 * One press of an activity's key whose answer a change made otherwise, `RecipeAttentionKey`: the key, the press, what it
 * did, `was`, and what it does, `now`, each a device's command by the device's name, a sequence by its name, or nothing.
 * By name and not by id, as the record it is: the device it sent to may be gone.
 */
export type AttentionKey = RecipeAttentionKey;

/** A sequence as a list shows it, with the activity it belongs to. */
export interface SequenceSummary {
  readonly id: SequenceId;
  readonly activity: ActivityId;
  readonly name: string;
  readonly steps: readonly SequenceStep[];
}

/** One command of a device: its name, and whether a person changed its code or learned it. */
export interface CommandSummary {
  readonly name: string;
  readonly changed: boolean;
  readonly learned: boolean;
}

/**
 * What the questions about keys and screens are given beside the document, R77: an archive serving the definitions of
 * the devices the document carries none of. A definition the document carries is served first, `carriedCatalogue`, so a
 * document that carries every device's definition needs nothing here.
 */
export interface QuestionSources {
  readonly archive?: CatalogueSource;
}

/**
 * Where a key is on the remote, the maps' word for it, `MapSurface`: the keypad, the number pad a screen draws, a
 * gesture on a touch surface, or a touch key beside a screen.
 */
export type KeySurface = MapSurface;

/**
 * Whose map can bind a key, `MapBinder`: a device's own, an activity's, both, or `remote`, neither, where the
 * configuration binds the key outside every map and a person's choice there is not built.
 */
export type KeyBinder = MapBinder;

/**
 * One key of a document's model as `keyNames` answers it, R77: Logitech's word for it, where it is, the presses it has
 * on this model, the short press first, whose map binds it, whether a person's choice on it is built, and why not
 * where it is not. The places are the model's family's, `FamilyMaps.places`, the ones its build binds by.
 */
export interface KeyPlaceSummary {
  readonly key: string;
  readonly surface: KeySurface;
  readonly presses: readonly RecipePress[];
  readonly boundBy: KeyBinder;
  readonly built: boolean;
  readonly why?: string;
}

/**
 * One setting a command is sent with, R77: its value, and whether that is the default, the catalogue's statement of
 * the device, or the person's, the document's own.
 *
 * **What the document says, not what a build honours.** A value the document states is answered as the person's on
 * every model, also where the model's build does not read that field yet and refuses a document stating it, as every
 * build of a Harmony One does a stated timing, R16 and R17, and a command's tuning, R89. Whether this model's build
 * reads a stated field is what `check` lists, a problem at the device saying the field is not built; an application
 * shows both, the person's value here and the problem there.
 */
export interface SettingAnswer<T> {
  readonly value: T;
  readonly isDefault: boolean;
}

/**
 * How a device's commands are sent, member by member in the catalogue's own terms, `DeviceTiming` in
 * `catalogue/driving.ts`: how many times one press sends the code, the pause after a command before the next one to
 * the same device and before one to another device, the wait after the device is switched on, and the wait after an
 * input is changed, each in milliseconds. A member a person states in `RecipeDevice.timing` is theirs and stands over
 * the catalogue's; every other is the catalogue's.
 *
 * **Why these five and not every member of `DeviceTiming`.** They are the members a device's settings carry on every
 * family whose build sends by them, the Harmony Touch's device record among them, `TIMING_READ_BY_DOCUMENTS` in `recipe.ts`. The other four
 * are left out rather than answered: which of the two repeat counts wins, `pressMinRepeats` or `minRepeats`, is not
 * read; and the delay while a key is held, the connected app's delay and the optimisation flag are sent by no build of
 * ours, so an answer would show a setting with no effect. **The wait after power on is absent** where neither the
 * catalogue nor the document states one, 8184 of the catalogue's records, since what a remote then waits is its
 * family's and not knowable from the two.
 */
export interface DeviceSettingsAnswer {
  readonly pressMinRepeats: SettingAnswer<number>;
  readonly interKeyDelay: SettingAnswer<number>;
  readonly interDeviceDelay: SettingAnswer<number>;
  readonly powerOnDelay?: SettingAnswer<number>;
  readonly inputDelay: SettingAnswer<number>;
}

/**
 * How one command is sent where a person tuned it, `RecipeDevice.commands[name].sending`: the copies of the code in the
 * first block, the pace of the held block and the silence before the first block, each the person's. **Only what the
 * document states is answered**: what a command does untuned is in its code, which only a build turns into blocks, so
 * a member not stated is left out rather than given a value no build has made.
 */
export interface CommandTuningAnswer {
  readonly copies?: SettingAnswer<number>;
  readonly heldPaceMs?: SettingAnswer<number>;
  readonly leadInMs?: SettingAnswer<number>;
}

/**
 * How a press's command is sent, R77: the target device's settings, and beside them the tuning of that one command
 * where the document states one. The settings are the device's and stored on it alone, so two keys that send one
 * device's commands answer the same settings, and a change to them changes both.
 */
export interface SendingAnswer {
  readonly settings: DeviceSettingsAnswer;
  readonly command?: CommandTuningAnswer;
}

/**
 * One step of a sequence as a question answers it: a device's command, a pause in tenths of a second, or, in a
 * sequence written out in the form of version 1, the command a device's key sends, by the key's scan code as that form
 * states it, `RecipeSequenceStep`, since that form names no command.
 */
export type SequenceStepAnswer = SequenceStep | { readonly device: DeviceId; readonly scan: number };

/**
 * A sequence a press runs: its name in its activity, the id the document gives it where it has one (a sequence written
 * out where it sits on a screen, the form of version 1, has none), and its steps in order.
 */
export interface SequenceAnswer {
  readonly id?: SequenceId;
  readonly name: string;
  readonly steps: readonly SequenceStepAnswer[];
}

/** What a press shares whatever it does: which press, the label a pad draws for it, and whether it is the default. */
interface PressCommon {
  readonly press: RecipePress;
  /** The label a pad place draws, where the family gives one. */
  readonly label?: string;
  /**
   * True where the family derived it, false where the document chose it. **A choice equal to the default is still
   * the person's**, false: the document states it, so it stays what it is when the family's default changes later,
   * and `setKey` with `'default'` is what gives the key back to the family.
   */
  readonly isDefault: boolean;
}

/**
 * One press of a key and what it does, R77: a device's command, with how it is sent; one of the activity's sequences,
 * by its name, with its steps; or nothing, where the place is unbound or a person chose nothing.
 */
export type PressAnswer =
  | PressCommon & { readonly action: { readonly device: DeviceId; readonly command: string }; readonly sending: SendingAnswer }
  | PressCommon & { readonly action: { readonly sequence: string }; readonly sequence: SequenceAnswer }
  | PressCommon & { readonly action: { readonly nothing: true } };

/**
 * One key of an owner as the remote will have it, R77, before anything is built: the owner, the key and where it is,
 * one entry per press the model has for that key, and, where a person cannot choose what it does, why.
 *
 * **A key the owner's map does not bind has no presses**: the configuration binds it outside every map, or the model's
 * maps bind it for the other kind of owner only, so nothing here can say what it does, and `why` says which. A key the
 * owner's map binds and whose choice is not built has its presses as the build gives them, and `why` as well.
 *
 * **Not answered: whether a key repeats while held.** Repeating is a property of the command's code, its held part, and
 * not of the key, `reference/how-a-harmony-works.md`, and how a code's held part is sent is decided when a build
 * writes it; nothing in the document or the catalogue's statement of a device says it.
 */
export interface KeyAnswer {
  readonly owner: Owner;
  readonly key: string;
  readonly surface: KeySurface;
  readonly presses: readonly PressAnswer[];
  readonly why?: string;
}

/** An entry of an owner's screen, in order, as the remote will have it. */
export type ScreenEntryAnswer =
  /** A device's command, labelled with its own name where no label is given. */
  | { readonly device: DeviceId; readonly command: string; readonly label?: string; readonly isDefault: boolean }
  /** One of the activity's sequences, by its name, with its id where it has one. */
  | { readonly sequence: string; readonly id?: SequenceId; readonly label?: string; readonly isDefault: boolean }
  /** An entry the remote acts on itself and that sends nothing, such as one opening the number pad, by the family's name for it. */
  | { readonly label: string; readonly client: string; readonly isDefault: boolean };

/**
 * An owner's screen, R77: its entries in order, each marked default or the person's, and whether the list as a whole
 * is the default. A person states a screen whole, so every entry has the list's mark; the list's own mark is what tells
 * a screen a person emptied from one the family leaves empty.
 */
export interface ScreenAnswer {
  readonly owner: Owner;
  readonly items: readonly ScreenEntryAnswer[];
  readonly isDefault: boolean;
}

/** The kind of value a remote's setting takes, yes or no or a whole number in a range, `families/settings.ts`. */
export type { SettingKind };

/**
 * One of the remote's own settings as the remote will have it, R47, before anything is built: its name as the family
 * gives it, its value, whether that is the default, what the default is, and the kind of value it takes, the choices of
 * a yes or no setting or the range of a number.
 *
 * **The value is the document's where it states one**, as what the family takes it to mean, true or false or a number,
 * also where it is written as text; a value the family's build refuses is answered as the document states it, and
 * `check` lists it. **A value equal to the default is still the person's**, `isDefault` false, since the document
 * states it and it stays when the family's default changes; `setSetting` with `'default'` gives it back.
 */
export interface RemoteSettingAnswer {
  readonly name: string;
  readonly value: boolean | number | string;
  readonly isDefault: boolean;
  readonly default: boolean | number;
  readonly takes: SettingKind;
}

// ---------------------------------------------------------------------------------------------------
// What the functions below share
// ---------------------------------------------------------------------------------------------------

/**
 * What a call is, for its not built answer: the function as an application calls it, and the requirement it serves,
 * R76 for a change, R77 for a question and R78 for the check.
 */
type Asked = readonly [contract: string, requirement: number];

/**
 * Whether a model is one the FHSDK judges, a bench model by its name and, where given, one of its skins: a document
 * naming one that no family serves yet, a Harmony 525, 515 or 785, is a document of a real remote that nothing is built
 * for, where one naming no such model names no remote at all.
 */
function benchNamed(model: RecipeModel): boolean {
  return BENCH_MODELS.some((one) => one.name === model.name && (model.skin === undefined || one.skins.includes(model.skin)));
}

/**
 * **The family that builds for a document's model**, as the registry chooses it, `chooseByModel`, and the one place
 * every call meets a model no family serves. **That is not built**, `NotBuiltError` naming the call and the model with
 * the call's requirement: the same kind of answer from every change, question and check that needs the family, so an
 * application tells "not yet for this remote" from one call as from any other. A model that is no bench model, or a
 * name and a skin that disagree, names no remote, and is refused as `RecipeError` with the registry's sentence.
 */
function servedBy(model: RecipeModel, [contract, requirement]: Asked): ModelChoice {
  try {
    return chooseByModel(model);
  } catch (error) {
    if (!(error instanceof NoFamilyError)) throw error;
    if (benchNamed(model)) return notBuilt(`${contract} for the ${model.name}`, requirement);
    throw new RecipeError(error.message);
  }
}

/**
 * What the model takes, as the capability API states it: the most devices and the most activities. A limit the API
 * does not state is not checked here, which is the honest reading of "nothing here states one".
 */
function limitsOf(model: RecipeModel, asked: Asked): { readonly maxDevices: number | undefined; readonly maxActivities: number | undefined } {
  const properties = capabilitiesOf(servedBy(model, asked).skin)?.properties;
  return { maxDevices: properties?.maxDevices, maxActivities: properties?.activitiesAtMost };
}

/**
 * The kind of panel the model has, as the capability API states it: `none` for a model without a screen, the Harmony
 * 300 and 350, which is what a screen's change refuses as not on this model; undefined where the API states none.
 */
function panelOf(model: RecipeModel, asked: Asked): string | undefined {
  return capabilitiesOf(servedBy(model, asked).skin)?.properties.panel;
}

/**
 * Whether the model cannot do what a requirement asks at all, as its capabilities state it: the requirement's status
 * on the model is impossible, with the reference page that says why. **Asked of the capability API and nothing else**,
 * so the toolkit's "not on this model" and the status an application shows for the model say the same; false where
 * the API states nothing about the model.
 */
function impossibleOn(model: RecipeModel, requirement: number, asked: Asked): boolean {
  const found = capabilitiesOf(servedBy(model, asked).skin)?.requirements.find((one) => one.requirement.number === requirement);
  return found?.state.status === 'impossible';
}

/**
 * Whether the model's build takes a held press, a double press and a sequence on a key where its places have them.
 * **Asked of the kind of family, not of a remote**: a compiled family builds a recipe's keys through the shared
 * composer, which refuses all three, `checkStatedKeys` in `shared/setup.ts`; a document family resolves every press its
 * places have and builds each, the Harmony Touch's `touchSetupOfDocument`.
 */
function keyFormsBuilt(model: RecipeModel, asked: Asked): boolean {
  return servedBy(model, asked).family.kind === 'document';
}

/**
 * The keys a document of the model may choose otherwise, by Logitech's word for each, in the family's order, as its
 * family's builder states them, `Family.recipeKeys`; undefined where the family builds no key's choice, a document
 * family's or a compiled one stating none. **Asked only where the model's family has no maps**: where it has, its
 * places are what `setKey` and `check` hold a choice to, `mapsOf`, the ones its build binds by.
 */
function keyNamesOf(model: RecipeModel, asked: Asked): readonly string[] | undefined {
  const { family } = servedBy(model, asked);
  return family.kind === 'compiled' ? family.recipeKeys?.keys : undefined;
}

/** The maps of a document's model, decision 43, as `mapsOfModel` gives them: undefined where its family states none yet. */
function mapsOf(model: RecipeModel, asked: Asked): ModelMaps | undefined {
  servedBy(model, asked);
  return mapsOfModel(model);
}

/**
 * The maps a question about keys and screens answers from, or the reason it cannot answer, in the words an
 * application shows: **not built** for a model whose family has no maps yet, naming the model, R77, the questions'
 * requirement, as for a model no family serves. A document carrying a Harmony Touch's own block, the earlier form,
 * never reaches a question: the reader refuses it, naming the converter.
 */
function mapsToAnswer(document: Recipe, contract: string): ModelMaps {
  const found = mapsOf(document.model, [contract, 77]);
  if (found === undefined) return notBuilt(`${contract} for the ${document.model.name}`, 77);
  return found;
}

/**
 * **Every word a key has on some model**, the places of every bench model whose family states its maps and the words
 * of every compiled family's builder: what tells a key a document's model lacks, a gesture on a Harmony One, from a
 * word no remote has, so the first is answered as not on this model and the second as unknown. Asked of the registry
 * for each bench model's skins, once, and kept: it is the same for every document.
 */
let everyKeyWord: ReadonlySet<string> | undefined;
function keyWordsOfEveryModel(): ReadonlySet<string> {
  if (everyKeyWord !== undefined) return everyKeyWord;
  const words = new Set<string>();
  for (const model of BENCH_MODELS) {
    for (const skin of model.skins) {
      let family: ModelChoice['family'];
      try {
        family = chooseByModel({ name: model.name, skin }).family;
      } catch (error) {
        if (error instanceof NoFamilyError) continue;
        throw error;
      }
      for (const place of family.maps?.places(skin) ?? []) words.add(place.key);
      if (family.kind === 'compiled') for (const word of family.recipeKeys?.keys ?? []) words.add(word);
    }
  }
  everyKeyWord = words;
  return words;
}

/** The refusal of a key word a model has no place of: not on this model where another model has it, unknown otherwise. */
function noSuchKey(model: string, word: string, place: Place): ChangeRefused {
  return keyWordsOfEveryModel().has(word)
    ? new ChangeRefused('not-on-this-model', place, `a ${model} has no ${word} key, which other models have`)
    : new ChangeRefused('unknown', place, `no model has a key named ${word}`);
}

/**
 * The catalogue that stands in where a document carries no definition and no archive is given: refusing every
 * question, since a question that reaches it would otherwise be told a device has no commands. Reached only for a
 * document with no device at all, since a device without its definition is refused before, `resolvedOf`.
 */
const NO_CATALOGUE: CatalogueSource = {
  protocols: () => [],
  device: () => { throw new RecipeError('the document carries no definition, and no archive was given'); },
  commands: () => { throw new RecipeError('the document carries no definition, and no archive was given'); },
  driving: () => { throw new RecipeError('the document carries no definition, and no archive was given'); },
};

/** What every question about keys and screens works from: the model's places, the resolved maps and the catalogue. */
interface Resolved {
  readonly model: string;
  readonly places: readonly MapPlace[];
  readonly maps: ResolvedMaps;
  readonly catalogue: CatalogueSource;
}

/**
 * **The one route to a document's maps for every question**: the model's family's maps, and `resolveMaps` over them,
 * the function the build calls, so what an application is shown of a key is what is built, decision 43. Nothing here
 * derives a map, a default or a place of its own; `test/recipe/toolkitkeys.test.ts` holds the questions to what
 * `resolveMaps` answers and this module to calling nothing else for a map.
 *
 * **The definitions**: the document's carried ones first, then the archive given, `carriedCatalogue`. With neither for
 * a device, the questions stop with the error `commands` gives for it, naming the device. `resolveMaps` answers the
 * whole document or nothing, its docstring says why, so one device without its definition stops every owner's answers,
 * not only those that use it.
 */
function resolvedOf(document: Recipe, contract: string, sources: QuestionSources | undefined): Resolved {
  opened(document);
  const { skin, maps } = mapsToAnswer(document, contract);
  if (sources?.archive === undefined) {
    const bare = document.devices.find((one) => one.definition === undefined);
    if (bare !== undefined) throw new RecipeError(`${bare.name} carries no definition, so its commands are not in the document`);
  }
  const catalogue = carriedCatalogue(document, sources?.archive) ?? NO_CATALOGUE;
  return { model: document.model.name, places: maps.places(skin), maps: resolveMaps(maps, skin, document, catalogue), catalogue };
}

/** The resolved owner an `Owner` addresses, by its position in the document, which is the resolved maps' order too. */
function resolvedOwner(document: Recipe, resolved: Resolved, owner: Owner): ResolvedOwner {
  if ('device' in owner) {
    const device = deviceOf(document, owner.device);
    return resolved.maps.devices[document.devices.indexOf(device)]!;
  }
  const activity = activityOf(document, owner.activity);
  return resolved.maps.activities[document.activities.indexOf(activity)]!;
}

/** The kind of an owner, as `binds` in `families/maps.ts` asks it: who binds a place is judged there and nowhere else. */
const kindOf = (owner: Owner): 'device' | 'activity' => ('device' in owner ? 'device' : 'activity');

/**
 * Turns resolved keys into a question's answers. The device's settings are the same at every key that sends its
 * commands, so the catalogue is asked once per device; each answer is still an object of its own.
 */
class Answerer {
  /** Each device's timing as the catalogue states it, read once per device. */
  private readonly timings = new Map<string, DeviceTiming>();
  private readonly ids: ReadonlyMap<string, DeviceId>;
  private readonly document: Recipe;
  private readonly resolved: Resolved;

  constructor(document: Recipe, resolved: Resolved) {
    this.document = document;
    this.resolved = resolved;
    this.ids = new Map(document.devices.map((one) => [one.name, one.id!]));
  }

  /** A device's id by the name the document gives it, or the refusal naming where it was met. */
  private idOf(name: string, where: string): DeviceId {
    const id = this.ids.get(name);
    if (id === undefined) throw new RecipeError(`${where} names ${name}, which is no device of the document; the check lists it`);
    return id;
  }

  /**
   * A device's settings: each of the five members the document's `timing` states, the person's, over the catalogue's
   * statement of the device, `DeviceDriving.timing`, the default. The catalogue is the one the maps were resolved
   * with, so the device's definition the document carries is what is read. **A new object for every press**: the
   * catalogue is asked once per device, but an answer is the caller's to keep or change, so two presses of one device
   * share no object and a change to one answer reaches neither another answer nor the document.
   */
  private settingsOf(device: RecipeDevice): DeviceSettingsAnswer {
    let catalogue = this.timings.get(device.name);
    if (catalogue === undefined) {
      const slash = device.device.indexOf('/');
      if (slash <= 0) throw new RecipeError(`${device.name}'s device is not <manufacturer>/<model>`);
      catalogue = this.resolved.catalogue.driving(device.device.slice(0, slash), device.device.slice(slash + 1)).timing;
      this.timings.set(device.name, catalogue);
    }
    const known = catalogue;
    const stated = device.timing ?? {};
    const one = <K extends 'pressMinRepeats' | 'interKeyDelay' | 'interDeviceDelay' | 'inputDelay'>(member: K): SettingAnswer<number> =>
      (stated[member] !== undefined ? { value: stated[member]!, isDefault: false } : { value: known[member], isDefault: true });
    const powerOn = stated.powerOnDelay !== undefined ? { value: stated.powerOnDelay, isDefault: false }
      : known.powerOnDelay !== undefined ? { value: known.powerOnDelay, isDefault: true } : undefined;
    return {
      pressMinRepeats: one('pressMinRepeats'),
      interKeyDelay: one('interKeyDelay'),
      interDeviceDelay: one('interDeviceDelay'),
      ...(powerOn === undefined ? {} : { powerOnDelay: powerOn }),
      inputDelay: one('inputDelay'),
    };
  }

  /** How a device's command is sent: the device's settings, and the document's tuning of that one command where it states one. */
  sendingOf(device: RecipeDevice, command: string): SendingAnswer {
    const own = device.commands !== undefined && Object.hasOwn(device.commands, command) ? device.commands[command]!.sending : undefined;
    const theirs = (value: number | undefined): SettingAnswer<number> | undefined => (value === undefined ? undefined : { value, isDefault: false });
    const tuned: CommandTuningAnswer | undefined = own === undefined ? undefined : {
      ...(own.copies === undefined ? {} : { copies: theirs(own.copies)! }),
      ...(own.heldPaceMs === undefined ? {} : { heldPaceMs: theirs(own.heldPaceMs)! }),
      ...(own.leadInMs === undefined ? {} : { leadInMs: theirs(own.leadInMs)! }),
    };
    return { settings: this.settingsOf(device), ...(tuned === undefined ? {} : { command: tuned }) };
  }

  /**
   * One of an activity's sequences by its name, with its steps: a sequence of version 2, `RecipeActivity.sequences`,
   * or one written out where it sits on the activity's screen, the form of version 1. The reader refuses a key naming
   * a sequence the activity has under neither form, so one is always found for a document that reads.
   */
  sequenceOf(activity: RecipeActivity | undefined, name: string, where: string): SequenceAnswer {
    const own = activity?.sequences?.find((one) => one.name === name);
    if (own !== undefined) {
      return {
        ...(own.id === undefined ? {} : { id: own.id }),
        name,
        steps: own.steps.map((step): SequenceStepAnswer => ('pause' in step ? { pause: step.pause } : { device: this.idOf(step.device, where), command: step.command })),
      };
    }
    let written: readonly RecipeSequenceStep[] | undefined;
    for (const item of activity?.screen ?? []) {
      if ('sequence' in item && item.sequence === name && item.steps !== undefined) written = item.steps;
    }
    if (written === undefined) throw new RecipeError(`${where} runs the sequence ${name}, which is not one of the activity's`);
    return {
      name,
      steps: written.map((step): SequenceStepAnswer => ('pause' in step ? { pause: step.pause } : { device: this.idOf(step.device, where), scan: step.scan })),
    };
  }

  /** One resolved press as a question answers it. */
  pressOf(owner: Owner, found: ResolvedKey): PressAnswer {
    const common = {
      press: found.press,
      ...(found.label === undefined ? {} : { label: found.label }),
      isDefault: found.isDefault,
    };
    const where = `${'device' in owner ? `device ${owner.device}` : `activity ${owner.activity}`}'s ${found.key} key`;
    const action = found.action;
    if ('nothing' in action) return { ...common, action: { nothing: true } };
    if ('sequence' in action) {
      const activity = 'activity' in owner ? activityOf(this.document, owner.activity) : undefined;
      return { ...common, action: { sequence: action.sequence }, sequence: this.sequenceOf(activity, action.sequence, where) };
    }
    const id = this.idOf(action.device, where);
    const device = deviceOf(this.document, id);
    return { ...common, action: { device: id, command: action.command }, sending: this.sendingOf(device, action.command) };
  }

  /**
   * One place of an owner, every press it has. A place the owner's map does not bind answers no press and why; a
   * press asked for that the place does not have answers none, and says so.
   */
  keyOf(owner: Owner, place: MapPlace, keys: readonly ResolvedKey[], press?: RecipePress): KeyAnswer {
    // The owner copied, so no two answers, and no answer and the caller's own value, share an object.
    const base = { owner: { ...owner }, key: place.key, surface: place.surface };
    if (!binds(place, kindOf(owner))) {
      const why = place.boundBy === 'remote'
        ? place.why ?? 'no device\'s or activity\'s map binds this key'
        : `on a ${this.resolved.model} only ${place.boundBy === 'device' ? 'a device\'s own map' : 'an activity\'s map'} binds this key`;
      return { ...base, presses: [], why };
    }
    if (press !== undefined && !place.presses.includes(press)) {
      return { ...base, presses: [], why: `a ${this.resolved.model}'s ${place.key} has no ${press} press: not on this model` };
    }
    const presses = keys.filter((one) => one.key === place.key && (press === undefined || one.press === press)).map((one) => this.pressOf(owner, one));
    return { ...base, presses, ...(place.built ? {} : { why: place.why ?? 'a person\'s choice on this key is not built' }) };
  }

  /** One entry of a resolved screen as a question answers it. */
  entryOf(owner: Owner, entry: MapScreenEntry, isDefault: boolean): ScreenEntryAnswer {
    const where = `${'device' in owner ? `device ${owner.device}` : `activity ${owner.activity}`}'s screen`;
    if ('client' in entry) return { label: entry.label, client: entry.client, isDefault };
    if ('sequence' in entry) {
      const activity = 'activity' in owner ? activityOf(this.document, owner.activity) : undefined;
      const id = activity?.sequences?.find((one) => one.name === entry.sequence)?.id;
      return { sequence: entry.sequence, ...(id === undefined ? {} : { id }), ...(entry.label === undefined ? {} : { label: entry.label }), isDefault };
    }
    return { device: this.idOf(entry.device, where), command: entry.command, ...(entry.label === undefined ? {} : { label: entry.label }), isDefault };
  }
}

// ---------------------------------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------------------------------

/** The three kinds of thing the toolkit gives an id, and the letter each kind's ids start with. */
type IdKind = 'device' | 'activity' | 'sequence';
const ID_LETTERS: Readonly<Record<IdKind, string>> = { device: 'd', activity: 'a', sequence: 's' };
const ID_KINDS: readonly IdKind[] = ['device', 'activity', 'sequence'];

/** The number an id of the toolkit's form carries, a letter and a number, or undefined for an id written otherwise. */
function idNumber(kind: IdKind, id: string | undefined): number | undefined {
  const match = id === undefined ? null : new RegExp(`^${ID_LETTERS[kind]}([0-9]+)$`).exec(id);
  return match === null ? undefined : Number(match[1]);
}

/** Every id of a kind the document holds, a sequence's across every activity, since a sequence's id is the document's. */
function idsOf(document: Recipe, kind: IdKind): (string | undefined)[] {
  if (kind === 'device') return document.devices.map((one) => one.id);
  if (kind === 'activity') return document.activities.map((one) => one.id);
  return document.activities.flatMap((one) => (one.sequences ?? []).map((sequence) => sequence.id));
}

/**
 * The highest number an id of a kind has carried in the document: the one it records, `highestIds`, or a higher one an
 * id it holds carries. **Ids are never reused**, decision 43: an application keeps ids in its selection and its undo,
 * and a Harmony Touch's documents key a device's favourites by the id its own follows, so a device added after one was
 * removed must not inherit the removed one's id and what was keyed by it. The toolkit counts from this, records it in
 * the document whenever it gives an id, `givenId`, and keeps it whenever a removal takes the highest away,
 * `keptHighest`. Counted from the document and nothing else, so the same change on the same document gives the same id,
 * which lets a test and an undo stack compare documents. An id is never taken from a name: a name changes.
 */
function highestOf(document: Recipe, kind: IdKind, ids = idsOf(document, kind)): number {
  let highest = document.highestIds?.[kind] ?? 0;
  for (const id of ids) highest = Math.max(highest, idNumber(kind, id) ?? 0);
  return highest;
}

/** The document recording `number` as the highest id of a kind given, where it records less. */
function withHighest(document: Recipe, kind: IdKind, number: number): Recipe {
  if (number <= (document.highestIds?.[kind] ?? 0)) return document;
  return { ...document, highestIds: { ...document.highestIds, [kind]: number } };
}

/** The next id of a kind, one more than the highest ever given, and the document recording it as given. */
function givenId(document: Recipe, kind: IdKind): { readonly id: string; readonly document: Recipe } {
  const number = highestOf(document, kind) + 1;
  return { id: `${ID_LETTERS[kind]}${number}`, document: withHighest(document, kind, number) };
}

/**
 * `after` recording every highest id `before` had and `after` no longer holds, so a removal never frees a number: the
 * device removed last leaves its number in `highestIds`, and the next device added takes the one after it.
 */
function keptHighest(before: Recipe, after: Recipe): Recipe {
  let out = after;
  for (const kind of ID_KINDS) {
    const was = highestOf(before, kind);
    if (was > highestOf(out, kind)) out = withHighest(out, kind, was);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------
// What the changes share
// ---------------------------------------------------------------------------------------------------

/** A copy of plain data through JSON, which a recipe is by definition, so the copy loses nothing and shares nothing. */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * **A change's new document, checked and of its own.** Checked as `readRecipe` checks a document read off disk, so a
 * change never returns a document that would not open again, and what the reader refuses, a pause that is no whole
 * number, a timing member the catalogue has no name for, a power order that misses a device, is refused here as
 * `invalid` at `place`, the one reading of what a recipe may hold rather than a second copy of its rules. Then copied
 * whole, so the returned document shares no object with the document given or with anything a caller passed in: a
 * caller changing one never sees it in the other.
 */
function finished(next: Recipe, place: Place): Recipe {
  try {
    readRecipe(next);
  } catch (error) {
    if (error instanceof RecipeError) throw new ChangeRefused('invalid', place, inWords(error.message, next));
    throw error;
  }
  return plain(next);
}

/**
 * **The reader's sentence in a person's words.** The reader reads a file, where a position is all there is, so it says
 * "device 3's timing"; a person changing a document gave an id and sees names, so the position becomes the device's
 * name, an activity's sequence by its position its name, and favourites by their position the device that holds them.
 * And where the reader says a field stating nothing "is said by leaving it out", a file's way of putting it, the person
 * is told what the document holds instead. A sentence naming no position is left as it is.
 */
function inWords(message: string, document: Recipe): string {
  return message
    .replace(/^device ([0-9]+)\b/, (all, n: string) => document.devices[Number(n) - 1]?.name ?? all)
    .replace(/^activity ([0-9]+)\b/, (all, n: string) => {
      const activity = document.activities[Number(n) - 1];
      return activity?.id === undefined ? all : `activity ${activity.id}`;
    })
    .replace(/^activity (.+?)'s sequence ([0-9]+)\b/, (all, owner: string, n: string) => {
      const sequence = document.activities.find((one) => one.name === owner)?.sequences?.[Number(n) - 1];
      return sequence === undefined ? all : `activity ${owner}'s sequence ${sequence.name}`;
    })
    .replace(/^favourites ([0-9]+)\b/, (all, n: string) => {
      const held = document.favourites?.[Number(n) - 1];
      return held === undefined ? all : `${held.device}'s favourites`;
    })
    .replace(/ states nothing, which is said by leaving it out$/, ' states nothing, and a document states a record only where it holds something')
    .replace(/ is empty, which is said by leaving it out$/, ' is empty, and a document states a list only where it holds something');
}

/**
 * Hold a document to having come through `create` or `open`: every device, activity and sequence has an id. A recipe
 * written by hand has none, and addressing its devices by position would give an address that moves with the next
 * change.
 */
function opened(document: Recipe): void {
  const device = document.devices.find((one) => one.id === undefined);
  if (device !== undefined) throw new RecipeError(`device ${device.name} has no id: a document comes through recipe.open or recipe.create`);
  const activity = document.activities.find((one) => one.id === undefined);
  if (activity !== undefined) throw new RecipeError(`activity ${activity.name} has no id: a document comes through recipe.open or recipe.create`);
  for (const one of document.activities) {
    const sequence = (one.sequences ?? []).find((s) => s.id === undefined);
    if (sequence !== undefined) throw new RecipeError(`activity ${one.name}'s sequence ${sequence.name} has no id: a document comes through recipe.open or recipe.create`);
  }
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

/** A sequence and the activity it belongs to. */
interface OwnedSequence {
  readonly activity: RecipeActivity;
  readonly sequence: RecipeSequence;
}

/** The sequence with an id and its activity, or the refusal naming it. A sequence's id is the document's, not its activity's. */
function sequenceOf(document: Recipe, id: SequenceId): OwnedSequence {
  for (const activity of document.activities) {
    const sequence = (activity.sequences ?? []).find((one) => one.id === id);
    if (sequence !== undefined) return { activity, sequence };
  }
  throw new ChangeRefused('unknown', { kind: 'sequence', sequence: id }, `the document holds no sequence ${id}`);
}

/** A sequence of one activity by its id: one of another activity's is refused as one this activity does not hold. */
function ownSequence(document: Recipe, activity: RecipeActivity, id: SequenceId): RecipeSequence {
  const { activity: owner, sequence } = sequenceOf(document, id);
  if (owner.id !== activity.id) {
    throw new ChangeRefused('unknown', { kind: 'sequence', sequence: id }, `the sequence ${sequence.name} is activity ${owner.name}'s, not activity ${activity.name}'s, and a sequence runs in its own activity`);
  }
  return sequence;
}

/**
 * Hold what a caller passed to being a record, an object that is not a list, or refuse it as `invalid` at `place`. An
 * application's types say so already; this is for what arrives untyped, a value read back from storage or sent across a
 * process boundary, which would otherwise end in a `TypeError` an application cannot tell from a fault of the toolkit.
 */
function given(value: unknown, what: string, place: Place): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new ChangeRefused('invalid', place, `what was given for ${what} is no record`);
}

/**
 * Hold an owner to naming exactly one device or one activity by its id, or refuse it as `invalid`: an owner stating
 * both would leave which map a key or a screen is in to the order the toolkit happens to test them in.
 */
function ownerGiven(owner: unknown): Owner {
  const whole: Place = { kind: 'document' };
  given(owner, 'an owner', whole);
  const stated = owner as Partial<Record<'device' | 'activity', unknown>>;
  const device = 'device' in stated;
  const activity = 'activity' in stated;
  if (device === activity) throw new ChangeRefused('invalid', whole, device ? 'an owner names both a device and an activity, and is one of the two' : 'an owner names neither a device nor an activity');
  const id = device ? stated.device : stated.activity;
  if (typeof id !== 'string') throw new ChangeRefused('invalid', whole, `an owner names its ${device ? 'device' : 'activity'} by no id`);
  return owner as Owner;
}

/** Hold what `remove` and `uses` are given to naming one device, one activity or one sequence by its id. */
function removable(what: unknown): void {
  const whole: Place = { kind: 'document' };
  given(what, 'what is removed', whole);
  const named = (['device', 'activity', 'sequence'] as const).filter((kind) => kind in (what as object));
  if (named.length !== 1 || typeof (what as Record<string, unknown>)[named[0]!] !== 'string') {
    throw new ChangeRefused('invalid', whole, 'what is removed names one device, one activity or one sequence by its id');
  }
}

/** A name a person gave something: text with something in it, as it stands and untrimmed, since a remote draws it as given. */
function named(value: unknown, what: string, place: Place = { kind: 'document' }): string {
  if (typeof value !== 'string' || value.trim() === '') throw new ChangeRefused('invalid', place, `${what} has no name`);
  return value;
}

/**
 * The commands a device has, by name: its carried definition's, or where it carries none, those `archive` holds for
 * its entry; and either way those the document adds with a code of their own, `RecipeDevice.commands`. Undefined where
 * nothing says, a device carrying no definition with no archive given or one the archive cannot answer for: nothing is
 * then said about a command of it rather than something wrong, and the build, which is given a catalogue, refuses a
 * command the device does not have.
 */
function knownCommands(device: RecipeDevice, archive?: CatalogueSource): ReadonlySet<string> | undefined {
  let names: readonly string[] | undefined = device.definition?.commands.map((one) => one.name);
  if (names === undefined && archive !== undefined) {
    const slash = device.device.indexOf('/');
    try {
      const codeset = slash <= 0 ? undefined : archive.device(device.device.slice(0, slash), device.device.slice(slash + 1)).codeset;
      if (typeof codeset === 'string') names = archive.commands(codeset).map((one) => one.name);
    } catch {
      names = undefined;
    }
  }
  if (names === undefined) return undefined;
  const own = Object.entries(device.commands ?? {}).filter(([, one]) => one.code !== undefined).map(([name]) => name);
  return new Set([...names, ...own]);
}

/** Refuse a command a device does not have, where the document says which it has; `id` is the device's id. */
function commandKnown(device: RecipeDevice, id: DeviceId, command: unknown): string {
  if (typeof command !== 'string' || command === '') throw new ChangeRefused('invalid', { kind: 'device', device: id }, `a command of ${device.name} is named by no name`);
  if (knownCommands(device)?.has(command) === false) {
    throw new ChangeRefused('unknown', { kind: 'command', device: id, command }, `${device.name} has no command ${command}`);
  }
  return command;
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
 * What every change asks of a document before it touches it: that it came through `create` or `open`, so everything
 * in it has an address. **Every field of version 2 is followed by every change**, decision 43, through a rename, a
 * removal and the ids given, so no document is refused for stating one; and a document carrying a Harmony Touch's own
 * block of the earlier form never gets here, since the reader refuses it and names its converter.
 */
function changeable(document: Recipe): void {
  opened(document);
}

/**
 * An activity's devices as the recipe states them, from the ids a caller gave: each a device of the document, named
 * once, with roles an activity has. An input is not judged here: whether a device has it is the check's to say, so
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
        throw new ChangeRefused('invalid', { kind: 'device', device: choice.device }, `activity ${activity} gives ${device.name} a role ${String(role)} no activity has`);
      }
    }
    // The recipe names a device by its name underneath, which is why a rename has to follow every reference.
    return { device: device.name, ...(choice.input === undefined ? {} : { input: choice.input }), roles: [...choice.roles] };
  });
}

/** The key place a key's choice is at, with its press where not the short one. */
const keyPlace = (owner: Owner, key: RecipeKey): Place => ({ kind: 'key', owner, key: key.key, ...(key.press === undefined ? {} : { press: key.press }) });

/** A place of a sequence, or of its activity where the sequence has no id to name it by, which `opened` rules out. */
const sequencePlace = (activity: RecipeActivity, sequence: RecipeSequence, step?: number): Place => (sequence.id === undefined
  ? { kind: 'activity', activity: activity.id! }
  : step === undefined ? { kind: 'sequence', sequence: sequence.id } : { kind: 'sequence-step', sequence: sequence.id, step });

/** The lists of steps a device's power and channel tuning state, each by its name for a sentence. */
function driveListsOf(device: RecipeDevice): [string, readonly DriveStep[] | undefined][] {
  return [
    ...(['on', 'off', 'toggle', 'onReset'] as const).map((member): [string, readonly DriveStep[] | undefined] => [`power ${member}`, device.power?.[member]]),
    ...(['start', 'finish', 'greaterTen', 'greaterHundred'] as const)
      .map((member): [string, readonly DriveStep[] | undefined] => [`channel tuning ${member}`, device.channelTuning?.[member]]),
  ];
}

/** One place a document names a device's command, `commandUses`. */
interface CommandUse {
  readonly place: Place;
  /** The device by its name in the document, and the command by its name. */
  readonly device: string;
  readonly command: string;
  /** In words, for a sentence: `activity Watch TV's VolumeUp key`. */
  readonly where: string;
  /** A key's choice, which the check judges with the key, or any other use. */
  readonly kind: 'key' | 'other';
}

/**
 * **Every place a document names a device's command**: a key's choice in any map, an entry of any screen, a step of a
 * sequence, a step at an activity's start or end, and a step of a device's own power or channel tuning. The one walk
 * `refreshDevice` reports from, `setDeviceCommand` refuses a removal by, and `check` holds to each device's commands,
 * so the three cannot disagree about where a command is used. A sequence written out on a screen, the form of version
 * 1, names a key's scan and no command, so it is not here.
 */
function commandUses(document: Recipe): CommandUse[] {
  const out: CommandUse[] = [];
  const keysOf = (owner: Owner, keys: readonly RecipeKey[] | undefined, what: string): void => {
    for (const key of keys ?? []) {
      if ('device' in key.action) out.push({ place: keyPlace(owner, key), ...key.action, where: `${what}'s ${key.key} key`, kind: 'key' });
    }
  };
  const screenOf = (owner: Owner, items: readonly RecipeScreenItem[] | undefined, what: string): void => {
    (items ?? []).forEach((item, at) => {
      if ('device' in item) out.push({ place: { kind: 'screen-item', owner, item: at }, device: item.device, command: item.command, where: `${what} screen entry ${at + 1}`, kind: 'other' });
    });
  };
  for (const device of document.devices) {
    const owner: Owner = { device: device.id! };
    keysOf(owner, device.keys, `${device.name}'s own map`);
    screenOf(owner, device.screen, `${device.name}'s own`);
    for (const [list, steps] of driveListsOf(device)) {
      for (const step of steps ?? []) {
        if (step.kind === 'send' || step.kind === 'hold') {
          out.push({ place: { kind: 'command', device: device.id!, command: step.command }, device: device.name, command: step.command, where: `${device.name}'s ${list}`, kind: 'other' });
        }
      }
    }
  }
  for (const activity of document.activities) {
    const owner: Owner = { activity: activity.id! };
    screenOf(owner, activity.screen, `activity ${activity.name}'s`);
    keysOf(owner, activity.keys, `activity ${activity.name}`);
    for (const sequence of activity.sequences ?? []) {
      sequence.steps.forEach((step, k) => {
        if ('device' in step) out.push({ place: sequencePlace(activity, sequence, k), ...step, where: `activity ${activity.name}'s sequence ${sequence.name}, step ${k + 1}`, kind: 'other' });
      });
    }
    for (const when of ['start', 'end'] as const) {
      (activity[when] ?? []).forEach((step, k) => {
        if ('command' in step) out.push({ place: { kind: 'step', activity: activity.id!, when, step: k }, ...step, where: `activity ${activity.name}'s ${when} step ${k + 1}`, kind: 'other' });
      });
    }
  }
  return out;
}

/**
 * One place a device or a sequence is named, and what kind of mention it is, which is what a removal does about it:
 * a key's choice, a part in an activity, a place in a power order, an entry of a screen, a sequence written out on a
 * screen (version 1's form), a sequence of an activity's own, a key, entry or extra step running a sequence that goes,
 * an extra step at a start or an end, the favourites, and a role of an activity that no device of it has once the
 * device is gone.
 */
interface Mention {
  readonly place: Place;
  readonly kind: 'key' | 'part' | 'role' | 'order' | 'screen' | 'step' | 'sequence' | 'runs' | 'activity-step' | 'favourites';
  /** In words, for an effect's sentence: `activity Watch TV's VolumeUp key`. */
  readonly where: string;
  /** For a sequence: whether it goes, having no step left that sends a command. */
  readonly goes?: boolean;
}

/**
 * Everywhere an activity runs one of its sequences, by the sequence's name: a key, and where `entries` is set an entry
 * of its screen and a step at its start or end. A sequence written out on a screen, version 1's form, is its own
 * screen entry and runs at no step, so for one of those only the keys are asked.
 */
function runsOf(activity: RecipeActivity, name: string, entries: boolean): Mention[] {
  const owner: Owner = { activity: activity.id! };
  const found: Mention[] = [];
  if (entries) {
    (activity.screen ?? []).forEach((item, at) => {
      if ('sequence' in item && item.steps === undefined && item.sequence === name) {
        found.push({ place: { kind: 'screen-item', owner, item: at }, kind: 'runs', where: `activity ${activity.name}'s screen entry ${at + 1}, which runs ${name},` });
      }
    });
    for (const when of ['start', 'end'] as const) {
      (activity[when] ?? []).forEach((step, k) => {
        if ('sequence' in step && step.sequence === name) {
          found.push({ place: { kind: 'step', activity: activity.id!, when, step: k }, kind: 'runs', where: `activity ${activity.name}'s ${when} step ${k + 1}, which runs ${name},` });
        }
      });
    }
  }
  for (const key of activity.keys ?? []) {
    if ('sequence' in key.action && key.action.sequence === name) {
      found.push({ place: keyPlace(owner, key), kind: 'runs', where: `activity ${activity.name}'s ${key.key} key, which runs ${name},` });
    }
  }
  return found;
}

/**
 * **The roles an activity loses in a change of its devices**: every role a device of `before` had that no device of
 * `after` has, once each, in the order `before` lists them, with the device that had it (the first, where two had).
 * The one reading of a role left with no device, which a removal of a device and `setActivity` both report, so the two
 * say the same thing of the same loss.
 *
 * **A role is the document's**, Logitech's word for what a device does in an activity, `ActivityRoleName`, and the same
 * on every model. **It is never required**, decision 44: an activity with no device for the volume may be just what a
 * person wants, so this is said as an effect, a fact a person may want to know, and never as a problem. What a model's
 * remote then does, such as an activity's volume keys sending nothing where a family follows the volume role for them,
 * is the family's, and what it does to the keys is the attention mark's to say, `attentionOf`. A device with no role, a
 * pass through device, takes no role with it when it goes.
 */
function rolesLeft(before: RecipeActivity['devices'], after: RecipeActivity['devices']): { readonly role: ActivityRoleName; readonly device: string }[] {
  const kept = new Set(after.flatMap((used) => used.roles));
  const left: { role: ActivityRoleName; device: string }[] = [];
  for (const used of before) {
    for (const role of used.roles) {
      if (!kept.has(role) && !left.some((one) => one.role === role)) left.push({ role, device: used.device });
    }
  }
  return left;
}

/** The sentence for a role no device of an activity has any more, which a removal and `setActivity` both say. */
const roleLeftMessage = (where: string, device: string): string => `${where} was ${device}'s, and no device of the activity has it now`;

/**
 * **Every press of each activity named whose answer differs between two documents**, decision 44: every press of the
 * activity's map that does one thing in `before` and another in `after`, with both. Read off the resolved maps of the
 * two documents, `resolveMaps`, the maps the build binds by and the questions answer from, so what is listed is
 * exactly what a person asking `keys` would see change: a key that sent the removed device's command, and as much a
 * default that followed a role to another device, or a sequence that went with the device's last step.
 *
 * **Undefined, with why, where the keys cannot be known**: the model's family states no maps yet, or a device's
 * commands cannot be read, a definition neither carried nor in the archive given. An activity whose keys are known and
 * none changed answers an empty list.
 */
function pressesChanged(
  before: Recipe, after: Recipe, activities: readonly ActivityId[], sources: QuestionSources | undefined,
): { readonly keys: ReadonlyMap<ActivityId, RecipeAttentionKey[]> } | { readonly why: string } {
  let found: ModelMaps | undefined;
  try {
    found = mapsOfModel(before.model);
  } catch (error) {
    if (error instanceof NoFamilyError) return { why: `no family serves the ${before.model.name} yet` };
    throw error;
  }
  if (found === undefined) return { why: `the keys of a ${before.model.name} are not built yet, R77` };
  const { skin, maps } = found;
  let was: ResolvedMaps;
  let now: ResolvedMaps;
  try {
    was = resolveMaps(maps, skin, before, carriedCatalogue(before, sources?.archive) ?? NO_CATALOGUE);
    now = resolveMaps(maps, skin, after, carriedCatalogue(after, sources?.archive) ?? NO_CATALOGUE);
  } catch (error) {
    // A device whose commands cannot be read stops every map, `resolveMaps` says why, and the questions stop on it too;
    // a change never does, so the answer names no key and says why in the reader's words, or plainly where the error
    // came from deeper than the reader, a definition whose codes the catalogue cannot read.
    return { why: error instanceof RecipeError ? error.message : 'the commands of the document\'s devices could not be read' };
  }
  const same = (a: RecipeKeyAction, b: RecipeKeyAction): boolean => JSON.stringify(a) === JSON.stringify(b);
  const NOTHING: RecipeKeyAction = { nothing: true };
  const keys = new Map<ActivityId, RecipeAttentionKey[]>();
  for (const id of activities) {
    const old = was.activities.find((one) => one.id === id)?.keys ?? [];
    const fresh = now.activities.find((one) => one.id === id)?.keys ?? [];
    const changed: RecipeAttentionKey[] = [];
    // Every press either side answers, in the order the map before lists them and then any only the map after has.
    const presses = [...old, ...fresh.filter((one) => !old.some((other) => other.key === one.key && other.press === one.press))];
    for (const { key, press } of presses) {
      const then = old.find((one) => one.key === key && one.press === press)?.action ?? NOTHING;
      const after_ = fresh.find((one) => one.key === key && one.press === press)?.action ?? NOTHING;
      if (!same(then, after_)) changed.push({ key, press, was: then, now: after_ });
    }
    keys.set(id, changed);
  }
  return { keys };
}

/** A press as a sentence names it: the key alone for a short press, with the press otherwise, `Guide held`. */
const pressWords = (key: { readonly key: string; readonly press: RecipePress }): string => (key.press === 'short' ? key.key : `${key.key} ${key.press}`);

/** A list in words: `A`, `A and B`, `A, B and C`. */
const listed = (items: readonly string[]): string => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)!}`);

/** What a press does, in words: a device's command, a sequence, or nothing. */
const actionWords = (action: RecipeKeyAction): string => ('device' in action ? `${action.device}'s ${action.command}`
  : 'sequence' in action ? `the sequence ${action.sequence}` : 'nothing');

/**
 * What changed presses do now, in words: those that send nothing first, then each that sends something else; empty
 * where no press changed.
 */
function changedWords(keys: readonly RecipeAttentionKey[]): string {
  const nothing = keys.filter((one) => 'nothing' in one.now).map(pressWords);
  const elsewhere = keys.filter((one) => !('nothing' in one.now)).map((one) => `${pressWords(one)} sends ${actionWords(one.now)}`);
  return [
    ...(nothing.length === 0 ? [] : [`${listed(nothing)} ${nothing.length === 1 ? 'sends' : 'send'} nothing now`]),
    ...(elsewhere.length === 0 ? [] : [`${listed(elsewhere)} instead`]),
  ].join(', and ');
}

/**
 * The sentence of a removal's reason, `RecipeAttention.message`: the device removed, and then which presses of the
 * activity do otherwise now, that none does, or, where the keys are not known, why.
 */
function attentionMessage(device: string, keys: readonly RecipeAttentionKey[] | undefined, why?: string): string {
  const what = `${device} was removed`;
  if (keys === undefined) return `${what}, and what the activity's keys do now is not known, since ${why ?? 'nothing says'}`;
  if (keys.length === 0) return `${what}, and no key of the activity does otherwise now`;
  return `${what}; of the activity's keys, ${changedWords(keys)}`;
}

/**
 * **The mark a removal of a device sets**, decision 44: for each activity that used `device`, a reason, `RecipeAttention`,
 * with every press of the activity whose answer the removal changed, and the effect that tells a person, at the
 * activity's mark. Every activity that used the device is marked, whether or not a key changed, since the removal of a
 * device it used is worth a look; `after` is the document the removal makes, its activities given the reasons here.
 */
function withAttention(
  before: Recipe, after: Recipe, device: string, activities: readonly ActivityId[], sources: QuestionSources | undefined,
): { readonly document: Recipe; readonly effects: Effect[] } {
  if (activities.length === 0) return { document: after, effects: [] };
  const changed = pressesChanged(before, after, activities, sources);
  const effects: Effect[] = [];
  const marked = after.activities.map((activity) => {
    if (!activities.includes(activity.id!)) return activity;
    const keys = 'keys' in changed ? changed.keys.get(activity.id!) ?? [] : undefined;
    const reason: RecipeAttention = {
      happened: 'device-removed', device, ...(keys === undefined ? {} : { keys }),
      message: attentionMessage(device, keys, 'why' in changed ? changed.why : undefined),
    };
    effects.push({ place: { kind: 'attention', activity: activity.id! }, effect: 'changed', message: `activity ${activity.name} needs attention: ${reason.message}` });
    return { ...activity, attention: [...(activity.attention ?? []), reason] };
  });
  return { document: { ...after, activities: marked }, effects };
}

/**
 * **The presses a change of an activity itself made otherwise**, as effects, one per press at the key's place: what a
 * person changing the activity's devices or roles through `setActivity` is told, in place of a mark, since that person is
 * looking at the activity. The same reading a removal's mark takes, `pressesChanged`; nothing where the keys are not
 * known, which `keys` then answers not built itself.
 */
function pressEffects(before: Recipe, after: Recipe, activity: RecipeActivity, sources: QuestionSources | undefined): Effect[] {
  const changed = pressesChanged(before, after, [activity.id!], sources);
  if (!('keys' in changed)) return [];
  return (changed.keys.get(activity.id!) ?? []).map((one): Effect => ({
    place: { kind: 'key', owner: { activity: activity.id! }, key: one.key, press: one.press }, effect: 'changed',
    message: `activity ${activity.name}'s ${pressWords(one)} sent ${actionWords(one.was)} and sends ${actionWords(one.now)} now`,
  }));
}

/** Whether a step sends to a device of that name, a command or a channel tuned through it. */
const sendsTo = (step: object, name: string): boolean => 'device' in step && (step as { device: string }).device === name;

/**
 * **Everywhere a document names a device**, other than the device itself: the one walk both `uses` and `remove` take,
 * so what a removal says it will touch and what it touches cannot differ. A sequence that sends only to this device
 * among its commands goes with it, and so then does everything that runs that sequence, which is listed too.
 */
function mentionsOf(document: Recipe, device: RecipeDevice): Mention[] {
  const found: Mention[] = [];
  const name = device.name;
  const keysOf = (owner: Owner, keys: readonly RecipeKey[] | undefined, what: string): void => {
    for (const key of keys ?? []) {
      if ('device' in key.action && key.action.device === name) found.push({ place: keyPlace(owner, key), kind: 'key', where: `${what}'s ${key.key} key` });
    }
  };
  for (const other of document.devices) {
    if (other.id === device.id) continue;
    keysOf({ device: other.id! }, other.keys, `${other.name}'s own map`);
    (other.screen ?? []).forEach((item, at) => {
      if (item.device === name) found.push({ place: { kind: 'screen-item', owner: { device: other.id! }, item: at }, kind: 'screen', where: `${other.name}'s own screen` });
    });
  }
  for (const activity of document.activities) {
    const owner: Owner = { activity: activity.id! };
    if (activity.devices.some((used) => used.device === name)) {
      found.push({ place: { kind: 'activity-device', activity: activity.id!, device: device.id! }, kind: 'part', where: `activity ${activity.name}` });
      // Each role the device had that no other device of the activity has: the activity keeps its devices' other
      // roles, and a person is told which one has no device left, beside the part it names.
      for (const { role } of rolesLeft(activity.devices, activity.devices.filter((used) => used.device !== name))) {
        found.push({ place: { kind: 'role', activity: activity.id!, role }, kind: 'role', where: `activity ${activity.name}'s role ${role}` });
      }
    }
    if (activity.powerOrder?.includes(name) === true) {
      found.push({ place: { kind: 'power-order', activity: activity.id!, device: device.id! }, kind: 'order', where: `activity ${activity.name}'s power order` });
    }
    (activity.screen ?? []).forEach((item, at) => {
      if ('sequence' in item) {
        // A sequence named by the activity's own list, of version 2, carries no steps here to name a device.
        if (item.steps === undefined || !item.steps.some((step) => sendsTo(step, name))) return;
        found.push({ place: { kind: 'screen-item', owner, item: at }, kind: 'step', where: `activity ${activity.name}'s sequence ${item.sequence}` });
        // One left with no step that sends goes, and the keys that ran it go back to their defaults.
        if (!item.steps.some((step) => 'device' in step && step.device !== name)) found.push(...runsOf(activity, item.sequence, false));
      } else if (item.device === name) {
        found.push({ place: { kind: 'screen-item', owner, item: at }, kind: 'screen', where: `activity ${activity.name}'s screen` });
      }
    });
    for (const sequence of activity.sequences ?? []) {
      if (!sequence.steps.some((step) => sendsTo(step, name))) continue;
      const goes = !sequence.steps.some((step) => 'device' in step && step.device !== name);
      found.push({ place: sequencePlace(activity, sequence), kind: 'sequence', where: `activity ${activity.name}'s sequence ${sequence.name}`, goes });
      if (goes) found.push(...runsOf(activity, sequence.name, true));
    }
    for (const when of ['start', 'end'] as const) {
      (activity[when] ?? []).forEach((step, k) => {
        if (sendsTo(step, name)) found.push({ place: { kind: 'step', activity: activity.id!, when, step: k }, kind: 'activity-step', where: `activity ${activity.name}'s ${when} step ${k + 1}` });
      });
    }
    keysOf(owner, activity.keys, `activity ${activity.name}`);
  }
  const channels = (document.favourites ?? []).find((one) => one.device === name)?.channels.length;
  if (channels !== undefined) {
    found.push({ place: { kind: 'favourite', device: device.id!, favourite: 0 }, kind: 'favourites', where: `${channels} favourite ${channels === 1 ? 'channel' : 'channels'}` });
  }
  return found;
}

/**
 * **What removing an activity touches beyond itself**, the one walk `uses` and `remove` take for an activity: nothing
 * names an activity, its sequences and everything running them go with it, and only the hold on the favourite channels
 * is the document's, `RecipeActivity.favourites`. An activity holding them leaves them held by none, which the family
 * then places by its own rule, so a person is told, at the document, since the hold has no place of its own.
 */
function activityMentions(activity: RecipeActivity): Mention[] {
  if (activity.favourites !== true) return [];
  return [{ place: { kind: 'document' }, kind: 'favourites', where: `activity ${activity.name} held the favourite channels, and no activity holds them now` }];
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

/**
 * The document's protocol definitions after a device's definition changed or went: `before`'s, without those only
 * `gone` was written in, unless a device of `after` is written in them. One the document held for no device of its own
 * is left alone. Absent where none is left.
 */
function protocolsAfter(before: Recipe, gone: RecipeDevice, after: Recipe): Recipe['protocols'] {
  const theirs = protocolsOf(before, gone);
  const needed = new Set(after.devices.flatMap((one) => [...protocolsOf(after, one)]));
  const written = after.protocols?.filter((one) => !theirs.has(String(one['name'])) || needed.has(String(one['name'])));
  return written === undefined || written.length === 0 ? undefined : written;
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

/** An object without the members named, so a field given back to its default leaves nothing behind. */
function without<T extends object, K extends keyof T>(value: T, ...members: K[]): Omit<T, K> {
  const out = { ...value };
  for (const member of members) delete out[member];
  return out;
}

/** A member set where `value` is given and absent where not: the recipe states a person's choice and nothing else. */
const stated = <K extends string, V>(member: K, value: V | undefined): { [P in K]?: V } => (value === undefined ? {} : { [member]: value } as { [P in K]?: V });

/**
 * A record stated member by member after a person's change, `MemberChanges`: each member given stands, each given
 * `'default'` goes, each left out stays; `'default'` for the whole drops it. Undefined where nothing is left, since a
 * record stating nothing is said by leaving it out. Whether a member is one the record has and its value one it takes
 * is the reader's to say, through `finished`.
 */
function members<T extends object>(now: T | undefined, changes: MemberChanges<T> | 'default' | undefined, place: Place, what: string): T | undefined {
  if (changes === undefined) return now;
  if (changes === 'default') return undefined;
  if (typeof changes !== 'object' || changes === null || Array.isArray(changes)) throw new ChangeRefused('invalid', place, `${what} is not a record of members`);
  const out: Record<string, unknown> = { ...now };
  for (const [member, value] of Object.entries(changes)) {
    // An object built by assignment takes `__proto__` as its prototype, so the member would vanish without a word.
    if (member === '__proto__') throw new ChangeRefused('invalid', place, `${what} has a member named __proto__`);
    if (value === undefined) continue;
    if (value === 'default') delete out[member];
    else out[member] = value;
  }
  return Object.keys(out).length === 0 ? undefined : out as T;
}

/**
 * The document with every mention of a device's name made the new one: the recipe names a device by its name
 * underneath, so a rename follows it into an activity's devices and power order, every key's choice, every screen's
 * entries, a sequence's steps of either form, the steps at a start or an end, what a key of an attention mark does now,
 * and the favourites. Ids do not move. A mark's device, what its keys did and its sentence are left as they were
 * written: they say what happened, then, to a device that is gone.
 */
function renamedDevice(document: Recipe, from: string, to: string): Recipe {
  const entry = <T extends { readonly device: string }>(item: T): T => (item.device === from ? { ...item, device: to } : item);
  const step = <T extends object>(item: T): T => ('device' in item ? entry(item as T & { device: string }) : item);
  const keys = (list: readonly RecipeKey[] | undefined): { keys?: readonly RecipeKey[] } => stated('keys', list?.map((one) =>
    ('device' in one.action && one.action.device === from ? { ...one, action: { ...one.action, device: to } } : one)));
  return {
    ...document,
    devices: document.devices.map((one) => ({ ...one, ...keys(one.keys), ...stated('screen', one.screen?.map(entry)) })),
    activities: document.activities.map((activity) => ({
      ...activity,
      devices: activity.devices.map(entry),
      ...stated('screen', activity.screen?.map((item): RecipeScreenItem => ('sequence' in item
        ? (item.steps === undefined ? item : { ...item, steps: item.steps.map(step) })
        : entry(item)))),
      ...keys(activity.keys),
      ...stated('powerOrder', activity.powerOrder?.map((one) => (one === from ? to : one))),
      ...stated('sequences', activity.sequences?.map((one) => ({ ...one, steps: one.steps.map(step) }))),
      ...stated('start', activity.start?.map(step)),
      ...stated('end', activity.end?.map(step)),
      // An attention mark's device is one that is gone, and a key's `was` what was: both stay as recorded, since a device
      // of that name now is another device. A key's `now` names a device that is there, and follows it.
      ...stated('attention', activity.attention?.map((reason) => (reason.keys === undefined ? reason : {
        ...reason,
        keys: reason.keys.map((key) => ('device' in key.now && key.now.device === from ? { ...key, now: { ...key.now, device: to } } : key)),
      }))),
    })),
    ...stated('favourites', document.favourites?.map(entry)),
  };
}

/** An activity with one of its sequences named anew everywhere the activity runs it: its keys, its screen and its extra steps. */
function renamedSequence(activity: RecipeActivity, from: string, to: string): RecipeActivity {
  const runs = (item: object): boolean => 'sequence' in item && (item as { sequence: string }).sequence === from;
  const step = (one: RecipeActivityStep): RecipeActivityStep => (runs(one) ? { sequence: to } : one);
  return {
    ...activity,
    ...stated('screen', activity.screen?.map((item): RecipeScreenItem => (runs(item) && 'sequence' in item && item.steps === undefined ? { sequence: to } : item))),
    ...stated('keys', activity.keys?.map((one) => (runs(one.action) ? { ...one, action: { sequence: to } } : one))),
    ...stated('start', activity.start?.map(step)),
    ...stated('end', activity.end?.map(step)),
    ...stated('sequences', activity.sequences?.map((one) => (one.name === from ? { ...one, name: to } : one))),
  };
}

/** A sequence's steps as the recipe states them, from the ids a caller gave: each to one of the activity's devices. */
function sequenceSteps(document: Recipe, activity: RecipeActivity, steps: readonly SequenceStep[], place: Place): RecipeCommandStep[] {
  if (!Array.isArray(steps)) throw new ChangeRefused('invalid', place, 'a sequence\'s steps are not a list');
  return steps.map((step): RecipeCommandStep => {
    if (step !== null && typeof step === 'object' && 'pause' in step) return { pause: step.pause };
    const device = deviceOf(document, step.device);
    // A step sends to a device its activity switches on: one it does not would be sent to while it may be off.
    if (!activity.devices.some((used) => used.device === device.name)) {
      throw new ChangeRefused('invalid', { kind: 'activity-device', activity: activity.id!, device: step.device }, `activity ${activity.name} does not use ${device.name}, so a step of its sequence cannot send to it`);
    }
    return { device: device.name, command: commandKnown(device, step.device, step.command) };
  });
}

/** An activity's extra steps as the recipe states them, from the ids a caller gave: each to one of `activity`'s devices or sequences. */
function activitySteps(document: Recipe, activity: RecipeActivity, steps: readonly ActivityStep[], place: Place): RecipeActivityStep[] {
  if (!Array.isArray(steps)) throw new ChangeRefused('invalid', place, 'an activity\'s extra steps are not a list');
  return steps.map((step): RecipeActivityStep => {
    if (step !== null && typeof step === 'object' && 'pause' in step) return { pause: step.pause };
    if ('sequence' in step) return { sequence: ownSequence(document, activity, step.sequence).name };
    const device = deviceOf(document, step.device);
    if (!activity.devices.some((used) => used.device === device.name)) {
      throw new ChangeRefused('invalid', { kind: 'activity-device', activity: activity.id!, device: step.device }, `activity ${activity.name} does not use ${device.name}, so a step at its start or end cannot send to it`);
    }
    if ('channel' in step) return { device: device.name, channel: step.channel };
    return { device: device.name, command: commandKnown(device, step.device, step.command) };
  });
}

/** What was given for a device's definition, held to the shape a search fetches, or the refusal naming the device. */
function carriedDefinition(carried: CarriedDevice, name: string, place: Place): CarriedDevice {
  const commands = carried?.definition?.commands;
  if (typeof carried?.entry !== 'string' || carried.entry === '' || !Array.isArray(commands)
    || typeof carried.definition.record?.['codeset'] !== 'string' || !Array.isArray(carried.protocols)
    || commands.some((one) => typeof one?.name !== 'string' || typeof one?.keycode !== 'string')) {
    throw new ChangeRefused('invalid', place, `what was given for ${name} is not a device with a definition: an entry, a record naming its codeset, commands each a name and a keycode, and its protocols`);
  }
  return carried;
}

/** The document's protocol definitions with a device's added: one a device already brought is kept as it is. */
function protocolsWith(document: Recipe, carried: CarriedDevice): readonly Readonly<Record<string, unknown>>[] {
  // The definitions are the document's, by name: two devices of one archive name the same definition and the builders
  // are served the first by that name.
  const held = new Set((document.protocols ?? []).map((one) => one['name']));
  return [...(document.protocols ?? []), ...carried.protocols.filter((one) => !held.has(one['name']))];
}

// ---------------------------------------------------------------------------------------------------
// A document to start from
// ---------------------------------------------------------------------------------------------------

/**
 * A fresh document for a model: no device, no activity, and valid as it stands. Not built for a model no family serves
 * yet, and refused as a `RecipeError` for one that names no remote, `servedBy`, so a document is never started that
 * nothing could build.
 */
export function create(model: RecipeModel): Recipe {
  servedBy(model, ['recipe.create', 76]);
  return {
    version: RECIPE_VERSION,
    model: { name: model.name, ...(model.skin === undefined ? {} : { skin: model.skin }) },
    devices: [],
    activities: [],
  };
}

/**
 * A document out of parsed JSON or out of a recipe written by hand: its shape checked as `readRecipe` checks it, an
 * id given to every device, activity and sequence that has none, in the document's own order and past the highest
 * any id of that kind has carried, and the version stated. A document that already went through here comes back
 * equal, so opening is safe to do on every load; and it is a copy, sharing nothing with the value given.
 */
export function open(json: unknown): Recipe {
  const read = readRecipe(json);
  /** Gives each item without an id the next number of its kind, counted on from the highest. */
  const counter = (kind: IdKind): (<T extends { readonly id?: string }>(one: T) => T) => {
    let highest = highestOf(read, kind);
    return (one) => (one.id !== undefined ? one : { id: `${ID_LETTERS[kind]}${++highest}`, ...one });
  };
  const device = counter('device');
  const activity = counter('activity');
  const sequence = counter('sequence');
  const devices = read.devices.map(device);
  const activities = read.activities.map(activity).map((one) => (one.sequences === undefined ? one : { ...one, sequences: one.sequences.map(sequence) }));
  let opened: Recipe = { ...read, version: RECIPE_VERSION, devices, activities };
  // A kind the document records the highest id of records the ids given here too, or the next opening would read an
  // id past what the document says was given. A kind it records nothing of stays so: its ids say it all.
  for (const kind of ID_KINDS) {
    if (read.highestIds?.[kind] !== undefined) opened = withHighest(opened, kind, highestOf(opened, kind));
  }
  // Read again as what it now is, a document of the current version: a version 1 file can state what version 2
  // refuses, a key running a sequence the activity does not name, and opening it unchecked would hand back a document
  // that does not open a second time, where opening is meant to be safe on every load.
  readRecipe(opened);
  return plain(opened);
}

// ---------------------------------------------------------------------------------------------------
// Changes
// ---------------------------------------------------------------------------------------------------

/**
 * Add a device with its definition, R10, last in the device list, under an id no device of the document has carried.
 * The definition is carried in the document, with the protocol definitions its commands are written in, so the setup
 * builds and stays editable when no source of devices answers any more. Refused over the model's device count, and
 * under a name another device has: the remote lists devices by name, and so does the recipe underneath.
 */
export function addDevice(document: Recipe, device: NewDevice): Change {
  changeable(document);
  const { maxDevices } = limitsOf(document.model, ['recipe.addDevice', 76]);
  const whole: Place = { kind: 'document' };
  given(device, 'the device', whole);
  const name = named(device.name, 'the device');
  if (document.devices.some((one) => one.name === name)) {
    throw new ChangeRefused('invalid', whole, `the document already holds a device named ${name}`);
  }
  if (maxDevices !== undefined && document.devices.length >= maxDevices) {
    throw new ChangeRefused('over-limit', whole, `a ${document.model.name} holds ${maxDevices} devices, and the document holds that many`);
  }
  const carried = carriedDefinition(device.device, name, whole);
  const protocols = protocolsWith(document, carried);
  const { id, document: counted } = givenId(document, 'device');
  const added: RecipeDevice = { id, name, device: carried.entry, definition: carried.definition };
  const next: Recipe = { ...counted, devices: [...counted.devices, added], ...stated('protocols', protocols.length === 0 ? undefined : protocols) };
  return { document: finished(next, whole), effects: [] };
}

/**
 * **Fetch a device's definition again**, decision 43: replaces the definition the document carries for the device, and
 * nothing else. Its name, its keys and screen, its timing, power and channel tuning, its own commands, and every
 * choice that names it stay as they are, also a stated value equal to what the new definition states: a person's
 * choice is theirs, and stays theirs when the catalogue later changes its mind. The protocol definitions follow the
 * new commands, the old ones going where no device is written in them any more.
 *
 * **Every choice that names a command the new definition lacks** is reported as an effect, `missing`, at its place: a
 * key, a screen entry, a step of a sequence or at a start or end, a step of the device's power or tuning, and a tuning
 * of a command it no longer has. Each stays in the document, and `check` lists it until a person chooses again.
 * Nothing refreshes on its own. Refused for a definition of another catalogue entry, which is another device and is
 * added as one.
 */
export function refreshDevice(document: Recipe, device: DeviceId, carried: CarriedDevice): Change {
  changeable(document);
  const now = deviceOf(document, device);
  const place: Place = { kind: 'device', device };
  const fetched = carriedDefinition(carried, now.name, place);
  if (fetched.entry !== now.device) {
    throw new ChangeRefused('invalid', place, `${now.name} is ${now.device} in the catalogue, and the definition given is of ${fetched.entry}: a definition fetched again is of the same entry, and another device is added as one`);
  }
  const refreshed: RecipeDevice = { ...now, definition: fetched.definition };
  const merged: Recipe = { ...withDevice(document, refreshed), protocols: protocolsWith(document, fetched) };
  const protocols = protocolsAfter(document, now, merged);
  const next: Recipe = { ...without(merged, 'protocols'), ...stated('protocols', protocols) };
  const known = knownCommands(refreshed)!;
  const effects: Effect[] = commandUses(next).filter((use) => use.device === now.name && !known.has(use.command)).map((use): Effect => ({
    place: use.place, effect: 'missing', message: `${use.where} names ${now.name}'s ${use.command}, which its new definition does not have`,
  }));
  for (const [name, one] of Object.entries(now.commands ?? {})) {
    if (one.code === undefined && !known.has(name)) {
      effects.push({ place: { kind: 'command', device, command: name }, effect: 'missing', message: `${now.name}'s ${name} is tuned, and its new definition has no command of that name` });
    }
  }
  return { document: finished(next, place), effects };
}

/**
 * Change a device, member by member: its name, R12, which follows the device everywhere the document names it, since
 * underneath the recipe names a device by its name, and that is the toolkit keeping the whole consistent and not an
 * effect to report; whether it stays on between activities and its device key; and its power, R14, timing, R16 and
 * R17, and channel tuning, R18, each a person's member standing over the catalogue's, `DeviceChanges`. **This writes
 * the document**: whether the model's build reads a stated timing, power or tuning is what `check` lists, so a person's
 * choice is kept while the build for their model catches up. Its inputs have no field in the document yet and refuse by
 * name.
 */
export function setDevice(document: Recipe, device: DeviceId, changes: DeviceChanges): Change {
  changeable(document);
  const now = deviceOf(document, device);
  const place: Place = { kind: 'device', device };
  given(changes, `${now.name}'s changes`, place);
  if (changes.inputs !== undefined) return notBuilt('recipe.setDevice for its inputs', 15);
  let name = now.name;
  if (changes.name !== undefined) {
    name = named(changes.name, 'the device', place);
    if (document.devices.some((one) => one.id !== device && one.name === name)) {
      throw new ChangeRefused('invalid', place, `the document already holds a device named ${name}`);
    }
  }
  if (changes.keptOnBetweenActivities !== undefined && typeof changes.keptOnBetweenActivities !== 'boolean') {
    throw new ChangeRefused('invalid', place, `whether ${name} is kept on between activities is neither true nor false`);
  }
  if (changes.deviceKey !== undefined && changes.deviceKey !== 'none') {
    // A key per device is a Harmony 300's and 350's, R39; a model whose capabilities say it has none has no place for one.
    if (impossibleOn(document.model, 39, ['recipe.setDevice', 76])) {
      throw new ChangeRefused('not-on-this-model', place, `a ${document.model.name} has no device keys`);
    }
    given(changes.deviceKey, `${name}'s device key`, place);
    if (!Number.isInteger(changes.deviceKey.place) || changes.deviceKey.place < 0) {
      throw new ChangeRefused('invalid', place, `${name}'s device key is at no place`);
    }
  }
  // Rebuilt member by member, so a field given back to its default leaves nothing behind.
  const rest = without(now, 'name', 'poweredOnBetweenActivities', 'key', 'timing', 'power', 'channelTuning');
  const kept = changes.keptOnBetweenActivities ?? now.poweredOnBetweenActivities === true;
  const key = changes.deviceKey === undefined ? now.key : changes.deviceKey === 'none' ? undefined : changes.deviceKey;
  const changed: RecipeDevice = {
    ...rest, name,
    ...(kept ? { poweredOnBetweenActivities: true } : {}),
    ...stated('key', key),
    ...stated('timing', members(now.timing, changes.timing, place, `${name}'s timing`)),
    ...stated('power', members(now.power, changes.power, place, `${name}'s power`)),
    ...stated('channelTuning', members(now.channelTuning, changes.channelTuning, place, `${name}'s channel tuning`)),
  };
  // A step of its power or its channel tuning that this change writes names a command of the device, held to its
  // commands as every other change holds a command; a list the change leaves as it was is not judged again, so a
  // document that holds an unknown one can still have its other members changed, and `check` lists that one.
  const before = new Map(driveListsOf(now).map(([list, steps]) => [list, JSON.stringify(steps)]));
  for (const [list, steps] of driveListsOf(changed)) {
    if (!Array.isArray(steps) || JSON.stringify(steps) === before.get(list)) continue;
    for (const step of steps as readonly unknown[]) {
      if (step === null || typeof step !== 'object') continue;
      const { kind, command } = step as { kind?: unknown; command?: unknown };
      if ((kind === 'send' || kind === 'hold') && typeof command === 'string') commandKnown(now, device, command);
    }
  }
  let next = withDevice(document, changed);
  if (name !== now.name) next = renamedDevice(next, now.name, name);
  return { document: finished(next, place), effects: [] };
}

/**
 * Change one command of a device, R19 and R89, in the document's own commands of it, `RecipeDevice.commands`: a code
 * of its own, replacing the definition's or adding a command the definition lacks; how that one command is sent, member
 * by member; `'original'` to drop both and send the definition's code as the definition sends it; and `'removed'` to
 * take away a command the document added. **This writes the document**: whether the model's build reads a stated code
 * or tuning is what `check` lists.
 *
 * Refused: a tuning of a command the device does not have, where its definition says which it has; `'original'` of a
 * command the document added, which has no original; and `'removed'` of a command still used, naming where, since the
 * key or the step that sends it is a person's choice that only they can replace. Taking away a command of the
 * definition itself has no field in the document and refuses by name.
 */
export function setDeviceCommand(document: Recipe, device: DeviceId, command: string, change: CommandChange | 'original' | 'removed'): Change {
  changeable(document);
  const now = deviceOf(document, device);
  const place: Place = { kind: 'command', device, command };
  if (typeof command !== 'string' || command === '' || command === '__proto__') throw new ChangeRefused('invalid', place, `${String(command)} is no command's name`);
  const defined = now.definition === undefined ? undefined : now.definition.commands.some((one) => one.name === command);
  const own = now.commands !== undefined && Object.hasOwn(now.commands, command) ? now.commands[command]! : undefined;
  const added = defined === false && own?.code !== undefined;
  let entry: RecipeCommand | undefined;
  if (change === 'removed') {
    if (defined === true) return notBuilt('recipe.setDeviceCommand taking away a command of the device\'s definition', 19);
    if (own?.code === undefined) throw new ChangeRefused('unknown', place, `the document adds no command ${command} to ${now.name}`);
    const used = commandUses(document).find((use) => use.device === now.name && use.command === command);
    if (used !== undefined) throw new ChangeRefused('invalid', used.place, `${now.name}'s ${command} is still used by ${used.where}`);
    entry = undefined;
  } else if (change === 'original') {
    if (added) throw new ChangeRefused('invalid', place, `${now.name}'s ${command} is the document's own and has no original code; 'removed' takes it away`);
    entry = undefined;
  } else {
    if (typeof change !== 'object' || change === null) throw new ChangeRefused('invalid', place, `what was given for ${now.name}'s ${command} is no change`);
    if (change.code === 'original' && added) throw new ChangeRefused('invalid', place, `${now.name}'s ${command} is the document's own and has no original code; 'removed' takes it away`);
    const code = change.code === undefined ? own?.code : change.code === 'original' ? undefined : change.code;
    // A command is the device's where its definition has it or the document gives it a code of its own.
    if (defined === false && code === undefined) throw new ChangeRefused('unknown', place, `${now.name} has no command ${command}, and a code is what adds one`);
    const sending = members(own?.sending, change.sending, place, `${now.name}'s ${command}'s sending`);
    entry = code === undefined && sending === undefined ? undefined : { ...stated('code', code), ...stated('sending', sending) };
  }
  const commands: Record<string, RecipeCommand> = { ...now.commands };
  if (entry === undefined) delete commands[command];
  else commands[command] = entry;
  const changed: RecipeDevice = { ...without(now, 'commands'), ...stated('commands', Object.keys(commands).length === 0 ? undefined : commands) };
  return { document: finished(withDevice(document, changed), place), effects: [] };
}

/**
 * Add an activity, R21, last in the activity menu, under an id no activity has carried: its devices by id, each with
 * its roles and the input it is switched to, or none. Refused over the model's activity count, under a name another
 * activity has, with a device the document does not hold or names twice, and with a role no activity has. An input is
 * not judged here: whether a device has it is the check's to say, so an activity can be put together before every
 * choice is made.
 */
export function addActivity(document: Recipe, activity: NewActivity): Change {
  changeable(document);
  const { maxActivities } = limitsOf(document.model, ['recipe.addActivity', 76]);
  const whole: Place = { kind: 'document' };
  given(activity, 'the activity', whole);
  const name = named(activity.name, 'the activity');
  if (document.activities.some((one) => one.name === name)) {
    throw new ChangeRefused('invalid', whole, `the document already holds an activity named ${name}`);
  }
  if (typeof activity.type !== 'string' || activity.type === '') {
    throw new ChangeRefused('invalid', whole, `activity ${name} states no kind`);
  }
  if (!Array.isArray(activity.devices)) throw new ChangeRefused('invalid', whole, `activity ${name}'s devices are not a list`);
  // A new activity is switched on, so it counts against the remote's limit as every activity switched on does.
  if (maxActivities !== undefined && switchedOnCount(document) >= maxActivities) {
    throw new ChangeRefused('over-limit', whole, activityLimitMessage(document.model.name, maxActivities, 'holds that many'));
  }
  const devices = chosenDevices(document, name, activity.devices);
  const { id, document: counted } = givenId(document, 'activity');
  const added: RecipeActivity = { id, name, type: activity.type, devices };
  return { document: finished({ ...counted, activities: [...counted.activities, added] }, whole), effects: [] };
}

/**
 * **The activities a remote is given**: those switched on, decision 44. The limit on activities is the remote's, so it
 * counts these and not the ones a build leaves out, and `check`, `addActivity` and `setActivity` count alike.
 */
const switchedOnCount = (document: Recipe): number => document.activities.filter((one) => one.enabled !== false).length;

/** The sentence an activity over the model's limit is told in, by what the document holds. */
const activityLimitMessage = (model: string, max: number, holds: string): string =>
  `a ${model} holds ${max} ${max === 1 ? 'activity' : 'activities'} switched on, and the document ${holds}`;

/**
 * **Why a model takes no activity opening on `screen`**, R91, or undefined where it takes it, the one judgement
 * `setActivity` refuses by and `check` lists by: a model without a screen opens an activity on none, as its
 * capabilities say; a family that names its screens, `FamilyMaps.openingScreens`, takes those words and no other. A
 * family naming none has not been read for it, which `openingScreen` answers as not built.
 */
function openingScreenRefusal(model: RecipeModel, screen: string, asked: Asked): string | undefined {
  if (impossibleOn(model, 91, asked)) return `a ${model.name} has no screen, so an activity opens on none`;
  const words = mapsOf(model, asked)?.maps.openingScreens;
  if (words !== undefined && !words.includes(screen)) return `an activity of a ${model.name} opens on ${words.join(', ')}, and not on ${screen}`;
  return undefined;
}

/**
 * The screen an activity opens on, held to the model, or the answer why not: not on this model, `openingScreenRefusal`,
 * and not built where the model's family names no screens yet, since then nobody has said which words it takes.
 */
function openingScreen(model: RecipeModel, screen: string, place: Place, asked: Asked): string {
  const why = openingScreenRefusal(model, screen, asked);
  if (why !== undefined) throw new ChangeRefused('not-on-this-model', place, why);
  if (mapsOf(model, asked)?.maps.openingScreens === undefined) return notBuilt(`recipe.setActivity for the screen a ${model.name}'s activity opens on`, 91);
  return screen;
}

/**
 * Change an activity, member by member: its name, R25, its kind, its devices with their roles and inputs, whole and in
 * the order given, R22 to R24 and R28; the screen it opens on, R91; whether it holds the favourite channels, R45, true
 * taking the hold off the activity that had it, which is reported; the order it switches its devices on and off in,
 * R90; and its extra steps at its start and its end, R30, each list whole, a sequence of its own by id. `'default'`, or
 * an empty list of steps, gives a member back.
 *
 * **Its devices changed, what names them follows**: a power order loses a device no longer used and puts one newly
 * used last; a step of its sequences, or at its start or end, that sends to a device no longer used refuses the change,
 * naming the step, since that step is a person's and only they know what replaces it; and each role a device had that
 * no device of the activity has afterwards is an effect at that role, naming the activity and the role, as a removal of
 * the device reports it; and every press of the activity whose answer the change made otherwise is an effect at that
 * key, saying what it did and does, read off the maps with `sources` as a removal's mark reads them. **No mark is
 * set**, decision 44: the person making the change is looking at the activity.
 * **Whether it is switched on**, R92: false keeps it out of every build and sync, true switches it on again, the same
 * activity under the same id, refused as over the limit where the model takes no more activities switched on.
 * Switching off the activity that holds the favourite channels is an effect at it, naming the activity that holds them
 * while it is off, by the family's rule, or saying none does. Its icon and its activity key have no field in the document yet and refuse by name.
 * **This writes the document**: whether the model's build reads a stated member is what `check` lists.
 */
export function setActivity(document: Recipe, activity: ActivityId, changes: ActivityChanges, sources?: QuestionSources): Change {
  changeable(document);
  const now = activityOf(document, activity);
  given(changes, `activity ${now.name}'s changes`, { kind: 'activity', activity });
  if (changes.icon !== undefined) return notBuilt('recipe.setActivity for its icon', 27);
  if (changes.activityKey !== undefined) return notBuilt('recipe.setActivity for its activity key', 29);
  const place: Place = { kind: 'activity', activity };
  let name = now.name;
  if (changes.name !== undefined) {
    name = named(changes.name, 'the activity', place);
    if (document.activities.some((one) => one.id !== activity && one.name === name)) {
      throw new ChangeRefused('invalid', place, `the document already holds an activity named ${name}`);
    }
  }
  if (changes.type !== undefined && (typeof changes.type !== 'string' || changes.type === '')) {
    throw new ChangeRefused('invalid', place, `activity ${name} states no kind`);
  }
  const used = changes.devices === undefined ? now.devices : chosenDevices(document, name, changes.devices);
  const usedNames = new Set(used.map((one) => one.device));
  if (changes.devices !== undefined) {
    // A step that sends to a device the activity stops using is refused where it is, not dropped: it is a person's.
    for (const sequence of now.sequences ?? []) {
      sequence.steps.forEach((step, k) => {
        if ('device' in step && !usedNames.has(step.device)) {
          throw new ChangeRefused('invalid', sequencePlace(now, sequence, k), `activity ${now.name}'s sequence ${sequence.name} still sends to ${step.device} at step ${k + 1}, so the activity keeps using it`);
        }
      });
    }
    for (const when of ['start', 'end'] as const) {
      if (changes[when] !== undefined) continue;
      (now[when] ?? []).forEach((step, k) => {
        if ('device' in step && !usedNames.has(step.device)) {
          throw new ChangeRefused('invalid', { kind: 'step', activity, when, step: k }, `activity ${now.name}'s ${when} step ${k + 1} still sends to ${step.device}, so the activity keeps using it`);
        }
      });
    }
  }
  // The power order: the one given, the family's for `'default'`, or the stated one following the devices.
  let order: readonly string[] | undefined = now.powerOrder;
  if (changes.powerOrder !== undefined) {
    order = changes.powerOrder === 'default' ? undefined : changes.powerOrder.map((id) => deviceOf(document, id).name);
  } else if (order !== undefined && changes.devices !== undefined) {
    const was = order;
    order = [...was.filter((one) => usedNames.has(one)), ...used.map((one) => one.device).filter((one) => !was.includes(one))];
  }
  if (order !== undefined && order.length === 0 && used.length === 0) order = undefined;
  const target: RecipeActivity = { ...now, devices: used };
  const steps = (when: 'start' | 'end'): readonly RecipeActivityStep[] | undefined => {
    const given = changes[when];
    if (given === undefined) return now[when];
    if (given === 'default' || (Array.isArray(given) && given.length === 0)) return undefined;
    return activitySteps(document, target, given, { kind: 'activity', activity });
  };
  const opensOn = changes.opensOn === undefined ? now.opensOn : changes.opensOn === 'default' ? undefined
    : openingScreen(document.model, named(changes.opensOn, `activity ${name}'s opening screen`, place), place, ['recipe.setActivity', 76]);
  if (changes.favourites !== undefined && changes.favourites !== 'default' && typeof changes.favourites !== 'boolean') {
    throw new ChangeRefused('invalid', place, `whether activity ${name} holds the favourites is neither true nor false`);
  }
  const holds = changes.favourites === undefined ? now.favourites : changes.favourites === 'default' ? undefined : changes.favourites;
  if (changes.enabled !== undefined && typeof changes.enabled !== 'boolean') {
    throw new ChangeRefused('invalid', place, `whether activity ${name} is switched on is neither true nor false`);
  }
  // Switched off is stated as false and on by leaving the field out, so an activity switched on again is the one it was.
  const enabled = changes.enabled === undefined ? now.enabled : changes.enabled ? undefined : false;
  // Switching one on is refused past the remote's limit, which counts the activities switched on, as `addActivity` is.
  if (now.enabled === false && enabled === undefined) {
    const { maxActivities } = limitsOf(document.model, ['recipe.setActivity', 76]);
    if (maxActivities !== undefined && switchedOnCount(document) >= maxActivities) {
      throw new ChangeRefused('over-limit', place, activityLimitMessage(document.model.name, maxActivities, 'holds that many'));
    }
  }
  const changed: RecipeActivity = {
    ...without(now, 'name', 'type', 'devices', 'opensOn', 'favourites', 'powerOrder', 'start', 'end', 'enabled'),
    name, type: changes.type ?? now.type, devices: used,
    ...stated('opensOn', opensOn),
    ...stated('favourites', holds),
    ...stated('powerOrder', order),
    ...stated('start', steps('start')),
    ...stated('end', steps('end')),
    ...stated('enabled', enabled),
  };
  let next = withActivity(document, changed);
  // A role a device had that no device of the activity has after the change, a device dropped or its roles changed, is
  // told to a person at the role, as a removal of the device tells it: the activity is kept, only the role has no device.
  const effects: Effect[] = changes.devices === undefined ? [] : rolesLeft(now.devices, used).map(({ role, device }): Effect => ({
    place: { kind: 'role', activity, role }, effect: 'changed', message: roleLeftMessage(`activity ${name}'s role ${role}`, device),
  }));
  // Every press of the activity the change of its devices or roles made otherwise is told as an effect at the key,
  // decision 44: no mark, since the person making the change is looking at the activity.
  if (changes.devices !== undefined) effects.push(...pressEffects(document, next, changed, sources));
  if (holds === true) {
    // One activity holds the favourite channels: the one that had them gives them up, which a person is told.
    next = {
      ...next,
      activities: next.activities.map((one) => {
        if (one.id === activity || one.favourites !== true) return one;
        effects.push({ place: { kind: 'activity', activity: one.id! }, effect: 'changed', message: `activity ${one.name} no longer holds the favourite channels, which activity ${name} now holds` });
        return without(one, 'favourites');
      }),
    };
  }
  // Switched off while it holds the favourite channels: a person is told who holds them while it is off, as a removal
  // tells that none does.
  if (now.enabled !== false && enabled === false) {
    const before = favouritesHolderOf(document);
    if (before?.id === activity) {
      const after = favouritesHolderOf(next);
      effects.push({
        place, effect: 'changed',
        message: `activity ${name} held the favourite channels, and while it is switched off ${after === undefined ? 'no activity holds them' : `activity ${after.name} holds them`}`,
      });
    }
  }
  return { document: finished(next, place), effects };
}

/**
 * **Which activity a build gives the favourite channels to**, of those switched on: by the family's own rule where its
 * maps state one, `FamilyMaps.favouritesHolder`, the Harmony Touch's, and otherwise the one the document says holds
 * them. Undefined where none does.
 */
function favouritesHolderOf(document: Recipe): RecipeActivity | undefined {
  const on = document.activities.filter((one) => one.enabled !== false);
  let rule: ((activities: readonly RecipeActivity[]) => number) | undefined;
  try {
    rule = mapsOfModel(document.model)?.maps.favouritesHolder;
  } catch (error) {
    if (!(error instanceof NoFamilyError)) throw error;
  }
  if (rule === undefined) return on.find((one) => one.favourites === true);
  const at = rule(on);
  return at < 0 ? undefined : on[at];
}

/**
 * **Mark an activity as needing attention by hand**, R93, decision 44: an application may have reasons of its own, a
 * person's note, a device it knows to be faulty. The reason is added to whatever the activity's mark already holds, as
 * `marked` with the sentence given, without the space around it, and no device or key, and the activity is still built
 * and synced as it is. Refused as `invalid` for a sentence with nothing in it.
 */
export function markAttention(document: Recipe, activity: ActivityId, message: string): Change {
  changeable(document);
  const now = activityOf(document, activity);
  const place: Place = { kind: 'attention', activity };
  // A sentence a person reads, kept as given; one with nothing in it gives no reason, and a mark is never set without one.
  if (typeof message !== 'string' || message.trim() === '') {
    throw new ChangeRefused('invalid', place, `the reason activity ${now.name} needs attention says nothing`);
  }
  // Kept without the space around it, which a person typing a note leaves by accident and a list shows as a gap.
  const said = message.trim();
  const changed: RecipeActivity = { ...now, attention: [...(now.attention ?? []), { happened: 'marked', message: said }] };
  return { document: finished(withActivity(document, changed), place), effects: [] };
}

/**
 * **Clear an activity's mark of needing attention**, R93, decision 44: every reason at once, the one call an
 * application makes once a person has seen why. When it does so is the application's business; nothing here clears a
 * mark of its own accord, since only a person can say the activity is now as they want it. An activity with no mark is
 * left as it is.
 */
export function clearAttention(document: Recipe, activity: ActivityId): Change {
  changeable(document);
  const now = activityOf(document, activity);
  return { document: finished(withActivity(document, without(now, 'attention')), { kind: 'attention', activity }), effects: [] };
}

/**
 * Add a sequence to an activity, R37, last among its sequences, under an id no sequence has carried: its name, once
 * within the activity, and its steps, each a command of one of the activity's devices or a pause in tenths of a
 * second, at least one sending a command. It sends nothing until a key, a screen entry or an extra step of the same
 * activity runs it, by its id.
 */
export function addSequence(document: Recipe, activity: ActivityId, sequence: NewSequence): Change {
  changeable(document);
  const owner = activityOf(document, activity);
  const place: Place = { kind: 'activity', activity };
  given(sequence, 'the sequence', place);
  const name = named(sequence.name, 'the sequence', place);
  // One name is one sequence in an activity, either form, since a key and a screen entry name it by its name underneath.
  const taken = [...(owner.sequences ?? []).map((one) => one.name), ...(owner.screen ?? []).flatMap((item) => ('sequence' in item ? [item.sequence] : []))];
  if (taken.includes(name)) throw new ChangeRefused('invalid', place, `activity ${owner.name} already has a sequence named ${name}`);
  const steps = sequenceSteps(document, owner, sequence.steps, place);
  const { id, document: counted } = givenId(document, 'sequence');
  const next = withActivity(counted, { ...owner, sequences: [...(owner.sequences ?? []), { id, name, steps }] });
  return { document: finished(next, place), effects: [] };
}

/**
 * Change a sequence's name or its steps, R37. A new name follows it everywhere its activity runs it, a key, a screen
 * entry and an extra step; the steps are given whole, as `addSequence` takes them.
 */
export function setSequence(document: Recipe, sequence: SequenceId, changes: Partial<NewSequence>): Change {
  changeable(document);
  const { activity, sequence: now } = sequenceOf(document, sequence);
  const place: Place = { kind: 'sequence', sequence };
  given(changes, `the sequence ${now.name}'s changes`, place);
  let name = now.name;
  if (changes.name !== undefined) {
    name = named(changes.name, 'the sequence', place);
    const taken = [...(activity.sequences ?? []).filter((one) => one.id !== sequence).map((one) => one.name),
      ...(activity.screen ?? []).flatMap((item) => ('sequence' in item && item.steps !== undefined ? [item.sequence] : []))];
    if (taken.includes(name)) throw new ChangeRefused('invalid', place, `activity ${activity.name} already has a sequence named ${name}`);
  }
  const steps = changes.steps === undefined ? now.steps : sequenceSteps(document, activity, changes.steps, place);
  let changed: RecipeActivity = { ...activity, sequences: (activity.sequences ?? []).map((one) => (one.id === sequence ? { ...one, steps } : one)) };
  if (name !== now.name) changed = renamedSequence(changed, now.name, name);
  return { document: finished(withActivity(document, changed), place), effects: [] };
}

/**
 * Say what a key does, in an activity, R31, or for a device in device mode, R32, for each press the key has on the
 * model: `short`, absent, the first command; `held`, the long press, R38; `double`, a gesture pressed twice, R40. What it
 * does: a command of any device of the document, a sequence of the activity's own by its id, or nothing; `'default'`
 * gives that press back to what the family derives. Judged by the model's places, the ones `keyNames` lists and the
 * build binds by, decision 43:
 *
 * * **not on this model**, `ChangeRefused` `not-on-this-model`: a press the key does not have, a held press on a Harmony
 *   One; a key only the other kind of owner binds, a gesture in a device's own map; and a choice the model's family
 *   refuses, `FamilyMaps.refusedChoice`, such as a command a Harmony Touch's number pad draws on no key;
 * * **unknown**: a word that is no key of the model, a key the remote binds outside every map, with the reason, and a
 *   device, a command or a sequence the document does not hold, or a sequence of another activity;
 * * **invalid**: a sequence on a device's own map, since a device has no sequences;
 * * **not built**, by name: every choice on a model whose family has no maps yet.
 *
 * Giving a press back is judged by none of these, so a document that holds a choice can always be put right. **This
 * writes the document**: whether the model's build takes a held press or a sequence on a key is what `check` lists.
 */
export function setKey(document: Recipe, key: KeyPlace, action: KeyAction | 'default'): Change {
  changeable(document);
  given(key, 'a key', { kind: 'document' });
  ownerGiven(key.owner);
  const place: Place = { kind: 'key', owner: key.owner, key: key.key, ...(key.press === undefined ? {} : { press: key.press }) };
  // A word and never a number: a scan code is one family's, and a document naming one would point at another key
  // once moved to another model.
  if (typeof key.key !== 'string' || key.key === '') throw new ChangeRefused('invalid', place, `${String(key.key)} is no key's name`);
  const press: RecipePress = key.press ?? 'short';
  if (press !== 'short' && press !== 'held' && press !== 'double') throw new ChangeRefused('invalid', place, `${String(press)} is no press`);
  const kind = kindOf(key.owner);
  const owner = 'device' in key.owner ? deviceOf(document, key.owner.device) : activityOf(document, key.owner.activity);
  const what = 'device' in key.owner ? `${owner.name}'s own map` : `activity ${owner.name}`;
  const model = document.model.name;
  let chosen: RecipeKeyAction | undefined;
  if (action !== 'default') {
    const asked: Asked = ['recipe.setKey', 76];
    const found = mapsOf(document.model, asked);
    if (found === undefined) {
      // A model whose family states no places: the builder's own list of words, where it has one, as before maps.
      const names = keyNamesOf(document.model, asked);
      if (names === undefined) return notBuilt(`recipe.setKey for the ${model}`, kind === 'device' ? 32 : 31);
      if (!names.includes(key.key)) throw noSuchKey(model, key.key, place);
      if (press === 'held') return notBuilt('recipe.setKey for a held press', 38);
      if (press === 'double') return notBuilt('recipe.setKey for a double press', 40);
    } else {
      const at = found.maps.places(found.skin).find((one) => one.key === key.key);
      if (at === undefined) throw noSuchKey(model, key.key, place);
      if (at.boundBy === 'remote') throw new ChangeRefused('unknown', place, `a ${model}'s maps bind no key named ${key.key}: ${at.why ?? 'the configuration binds it outside them'}`);
      if (!binds(at, kind)) {
        throw new ChangeRefused('not-on-this-model', place, `on a ${model} only ${at.boundBy === 'device' ? 'a device\'s own map' : 'an activity\'s map'} binds the ${key.key} key`);
      }
      if (!at.presses.includes(press)) throw new ChangeRefused('not-on-this-model', place, `a ${model}'s ${key.key} key has no ${press} press`);
      if (!at.built) return notBuilt(`recipe.setKey for a ${model}'s ${key.key} key`, kind === 'device' ? 32 : 31);
    }
    if (typeof action !== 'object' || action === null) throw new ChangeRefused('invalid', place, 'what was given for the key is no action');
    if ('nothing' in action) {
      chosen = { nothing: true };
    } else if ('sequence' in action) {
      if (!('activity' in key.owner)) throw new ChangeRefused('invalid', place, `${what} runs no sequence: a sequence is an activity's, and a device has none`);
      chosen = { sequence: ownSequence(document, owner as RecipeActivity, action.sequence).name };
    } else {
      const device = deviceOf(document, action.device);
      chosen = { device: device.name, command: commandKnown(device, action.device, action.command) };
    }
    // What the family refuses beyond its places, asked of the choice as the document will state it.
    const why = found?.maps.refusedChoice?.(found.skin, {
      owner: kind, what, key: key.key, press, action: chosen,
      commandsOf: (name) => {
        const device = document.devices.find((one) => one.name === name);
        const known = device === undefined ? undefined : knownCommands(device);
        return known === undefined ? undefined : [...known];
      },
    });
    if (why !== undefined) throw new ChangeRefused('not-on-this-model', place, why);
  }
  /** The owner's choices with this key and press replaced, or taken out for the default; none left is no field. */
  const replaced = (keys: readonly RecipeKey[] | undefined): readonly RecipeKey[] | undefined => {
    const others = (keys ?? []).filter((one) => !(one.key === key.key && (one.press ?? 'short') === press));
    const next = chosen === undefined ? others : [...others, { key: key.key, ...(press === 'short' ? {} : { press }), action: chosen }];
    return next.length === 0 ? undefined : next;
  };
  const next = 'device' in key.owner
    ? withDevice(document, { ...without(owner as RecipeDevice, 'keys'), ...stated('keys', replaced(owner.keys)) })
    : withActivity(document, { ...without(owner as RecipeActivity, 'keys'), ...stated('keys', replaced(owner.keys)) });
  return { document: finished(next, place), effects: [] };
}

/**
 * Say what an owner's screen shows, R34 and R35, the list whole and in order; `'default'` gives it back to what the
 * family derives. An entry is a device's command, any device of the document as device mode sends to any, with a
 * label of its own or the command's; or, on an activity's screen, one of its own sequences by its id. An empty list is
 * a screen a person emptied, which is not the default.
 *
 * Refused: a screen on a model that has none, `not-on-this-model`; a sequence on a device's screen, since a device has
 * none; a device, a command or a sequence the document does not hold. A page of entries, R36, and a label of a
 * sequence's own have no field in the document yet and refuse by name. **This writes the document**: whether the
 * model's build reads a stated screen is what `check` lists.
 */
export function setScreen(document: Recipe, owner: Owner, items: readonly ScreenItem[] | 'default'): Change {
  changeable(document);
  ownerGiven(owner);
  const isDevice = 'device' in owner;
  const place: Place = isDevice ? { kind: 'device', device: owner.device } : { kind: 'activity', activity: owner.activity };
  const target = isDevice ? deviceOf(document, owner.device) : activityOf(document, owner.activity);
  let entries: RecipeScreenItem[] | undefined;
  if (items !== 'default') {
    if (panelOf(document.model, ['recipe.setScreen', 76]) === 'none') throw new ChangeRefused('not-on-this-model', place, `a ${document.model.name} has no screen`);
    if (!Array.isArray(items)) throw new ChangeRefused('invalid', place, 'a screen\'s entries are not a list');
    entries = items.map((item, at): RecipeScreenItem => {
      const here: Place = { kind: 'screen-item', owner, item: at };
      if (item === null || typeof item !== 'object') throw new ChangeRefused('invalid', here, 'a screen entry is no entry');
      if ('page' in item) return notBuilt('recipe.setScreen for a page of entries', 36);
      const label = item.label === undefined ? undefined : named(item.label, 'a screen entry\'s label', here);
      if ('sequence' in item) {
        if (isDevice) throw new ChangeRefused('invalid', here, `${target.name}'s screen runs no sequence: a sequence is an activity's, and a device has none`);
        if (label !== undefined) return notBuilt('recipe.setScreen for a label of a sequence\'s own', 34);
        return { sequence: ownSequence(document, target as RecipeActivity, item.sequence).name };
      }
      const device = deviceOf(document, item.device);
      return { device: device.name, command: commandKnown(device, item.device, item.command), ...stated('label', label) };
    });
  }
  const next = isDevice
    ? withDevice(document, { ...without(target as RecipeDevice, 'screen'), ...stated('screen', entries as RecipeScreenCommand[] | undefined) })
    : withActivity(document, { ...without(target as RecipeActivity, 'screen'), ...stated('screen', entries) });
  return { document: finished(next, place), effects: [] };
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

/**
 * The settings a document of the model may state, R47, as its family states them, `settingsOfModel`: undefined where
 * the family's build reads none from a document, every compiled family's; not built, as every call answers, for a model
 * no family serves yet.
 */
function remoteSettingsOf(model: RecipeModel, asked: Asked): FamilySettings | undefined {
  servedBy(model, asked);
  return settingsOfModel(model);
}

/**
 * **What a family says of one setting a document states**, the one judgement `setSetting` and `check` both take, so the
 * two code a setting alike and neither passes what the build refuses: nothing where the build writes the row and takes
 * the value; `invalid` for a value the build refuses, in the build's own words, `FamilySettings.refusedValue`; not built,
 * with the requirement, for a row the remote has and the build does not write yet; and not on this model for any other
 * name, naming the ones a document states.
 */
type SettingVerdict =
  | { readonly reason: 'invalid' | 'not-on-this-model'; readonly message: string }
  | { readonly requirement: number };

function settingVerdict(family: FamilySettings, model: string, name: string, value: RecipeSetting): SettingVerdict | undefined {
  if (family.rows.some((one) => one.name === name)) {
    const why = family.refusedValue(name, value);
    return why === undefined ? undefined : { reason: 'invalid', message: why };
  }
  // Own names only, so a name such as `constructor` is no setting the table inherits.
  if (Object.hasOwn(family.notBuilt, name)) return { requirement: family.notBuilt[name]! };
  return { reason: 'not-on-this-model', message: `a ${model} has no setting ${name}: the settings a document states are ${family.rows.map((one) => one.name).join(', ')}` };
}

/**
 * One of the remote's own settings by its name, R47, `Recipe.settings`: a text, a number or true or false; `'default'`
 * drops the choice and leaves the family's default, which `settings` answers. **Judged by the model's family where it
 * states its settings**, `FamilySettings`, by the one judgement `check` takes too, `settingVerdict`:
 *
 * * **invalid**: a value the build refuses for the row, outside its range or of another kind, in the build's words;
 * * **not built**, `NotBuiltError` with the requirement: a setting the remote has that the build does not write yet,
 *   such as a Harmony Touch's vibration;
 * * **not on this model**: any other name, a setting the model does not have.
 *
 * **Where the family states none**, every compiled family, whose build reads no setting from a document, the name and
 * the value are written as given and not judged: a change writes the document whether or not the model's build reads
 * the field, and `check` lists the field as one the build does not read. Giving a setting back is judged by none of
 * these, so a document that holds a setting can always be put right. Not built, as every call that needs its family,
 * for a model no family serves yet.
 */
export function setSetting(document: Recipe, setting: string, value: number | boolean | string | 'default'): Change {
  changeable(document);
  const place: Place = { kind: 'setting', setting };
  if (typeof setting !== 'string' || setting === '' || setting === '__proto__') throw new ChangeRefused('invalid', place, `${String(setting)} is no setting's name`);
  if (value !== 'default') {
    const family = remoteSettingsOf(document.model, ['recipe.setSetting', 47]);
    const verdict = family === undefined ? undefined : settingVerdict(family, document.model.name, setting, value);
    if (verdict !== undefined && 'requirement' in verdict) return notBuilt(`recipe.setSetting for the ${document.model.name}'s setting ${setting}`, verdict.requirement);
    if (verdict !== undefined) throw new ChangeRefused(verdict.reason, place, verdict.message);
  }
  const settings: Record<string, RecipeSetting> = { ...document.settings };
  if (value === 'default') delete settings[setting];
  else settings[setting] = value;
  const next: Recipe = { ...without(document, 'settings'), ...stated('settings', Object.keys(settings).length === 0 ? undefined : settings) };
  return { document: finished(next, place), effects: [] };
}

/**
 * Remove a device, R13, an activity, R26, or a sequence, R37, and settle everything that used it, each as an effect,
 * the places `uses` lists. Every removal keeps the highest id given, so the id is not given again.
 *
 * * **A device** leaves the activities that used it, which stay, with their other devices or with none, and their
 *   power orders; each role it had in an activity that no other device of the activity has is an effect at that role,
 *   naming the activity and the role, since what followed the role (an activity's volume keys following its volume
 *   device, on a family whose keys do) has no device left to follow; a key's choice that sent one of its commands goes
 *   back to the key's default; an entry of any screen that showed one goes; a step at a start or an end that sent to it
 *   goes; a sequence loses the steps that sent to it, and goes with its last step that sends a command, as then does
 *   every key, entry and step that ran it; and its favourite channels go with it. The protocol definitions its commands
 *   were written in go too, unless a device that stays is written in them; one the document held for no device of its
 *   own is left alone. **Last, every activity that used it is marked as needing attention**, R93, decision 44, with
 *   every press of its keys whose answer the removal changed and what each did and does, read off the maps before and
 *   after with `sources` as the questions read them: none where no key changed, and no list where the keys cannot be
 *   known, a model whose maps are not built yet or a device whose commands cannot be read. The activity is kept, built
 *   and synced: it is never invalid.
 * * **An activity** goes with its sequences; nothing else names an activity, and its one effect beyond itself is the
 *   hold on the favourite channels, where it held them: they are then held by no activity, reported at the document.
 * * **A sequence** goes from its activity, and every key that ran it goes back to its default, every screen entry and
 *   extra step that ran it goes.
 */
export function remove(document: Recipe, what: Removable, sources?: QuestionSources): Change {
  changeable(document);
  removable(what);
  if ('sequence' in what) {
    const { activity, sequence } = sequenceOf(document, what.sequence);
    const place: Place = { kind: 'sequence', sequence: what.sequence };
    const effects = runsOf(activity, sequence.name, true).map((one): Effect => ({
      place: one.place, effect: 'removed',
      message: one.place.kind === 'key' ? `${one.where} goes back to its default, since ${sequence.name} is removed` : `${one.where} goes with it`,
    }));
    const changed = settledActivity(activity, undefined, new Set([sequence.name]));
    return { document: finished(keptHighest(document, withActivity(document, changed)), place), effects };
  }
  if ('activity' in what) {
    const gone = activityOf(document, what.activity);
    const effects = activityMentions(gone).map((one): Effect => ({ place: one.place, effect: 'changed', message: one.where }));
    const next = { ...document, activities: document.activities.filter((one) => one.id !== gone.id) };
    return { document: finished(keptHighest(document, next), { kind: 'activity', activity: what.activity }), effects };
  }
  const { document: next, effects } = removedDevice(document, deviceOf(document, what.device), sources);
  return { document: finished(keptHighest(document, next), { kind: 'device', device: what.device }), effects };
}

/**
 * **A device removed**, the one reading `remove` and `uses` both take: the document without it, everything that named it
 * settled, and every effect, the mentions' in the walk's order and then every activity that used it marked as needing
 * attention, decision 44, `withAttention`. Not yet checked or given its
 * highest ids back; `remove` does both.
 */
function removedDevice(document: Recipe, gone: RecipeDevice, sources: QuestionSources | undefined): { readonly document: Recipe; readonly effects: Effect[] } {
  const name = gone.name;
  const effects: Effect[] = mentionsOf(document, gone).map((one): Effect => {
    switch (one.kind) {
      case 'part': return { place: one.place, effect: 'changed', message: `${one.where} no longer uses ${name}` };
      case 'role': return { place: one.place, effect: 'changed', message: roleLeftMessage(one.where, name) };
      case 'order': return { place: one.place, effect: 'changed', message: `${one.where} no longer switches ${name}` };
      case 'key': return { place: one.place, effect: 'removed', message: `${one.where} sent a command of ${name} and goes back to its default` };
      case 'screen': return { place: one.place, effect: 'removed', message: `${one.where} showed a command of ${name}, which is taken off it` };
      case 'step': return { place: one.place, effect: 'changed', message: `${one.where} loses the steps that sent a command of ${name}` };
      case 'sequence': return one.goes === true
        ? { place: one.place, effect: 'removed', message: `${one.where} sent commands to ${name} alone and goes with it` }
        : { place: one.place, effect: 'changed', message: `${one.where} loses the steps that sent a command of ${name}` };
      case 'runs': return { place: one.place, effect: 'removed', message: `${one.where} goes with that sequence` };
      case 'activity-step': return { place: one.place, effect: 'removed', message: `${one.where} sent to ${name}, and is taken out` };
      default: return { place: one.place, effect: 'removed', message: `${name}'s ${one.where} go with it` };
    }
  });
  /** An owner's choices without the ones that sent the gone device's commands; none left is no field. */
  const keysLeft = (keys: readonly RecipeKey[] | undefined): readonly RecipeKey[] | undefined => {
    const left = (keys ?? []).filter((one) => !('device' in one.action && one.action.device === name));
    return left.length === 0 ? undefined : left;
  };
  const devices = document.devices.filter((one) => one.id !== gone.id).map((one): RecipeDevice => ({
    ...without(one, 'keys', 'screen'),
    ...stated('keys', keysLeft(one.keys)),
    // A device's screen is stated whole, so one left empty is still the person's list, and stays.
    ...stated('screen', one.screen?.filter((item) => item.device !== name)),
  }));
  const activities = document.activities.map((activity) => settledActivity(activity, name, new Set()));
  const after: Recipe = { ...without(document, 'favourites', 'protocols'), devices, activities };
  const kept = document.favourites?.filter((one) => one.device !== name);
  const protocols = protocolsAfter(document, gone, { ...after, ...stated('protocols', document.protocols) });
  const next: Recipe = {
    ...after,
    ...stated('favourites', kept === undefined || kept.length === 0 ? undefined : kept),
    ...stated('protocols', protocols),
  };
  // Last, every activity that used the device, marked as needing attention: kept,
  // built and synced, and the keys said, decision 44.
  const users = document.activities.filter((one) => one.devices.some((used) => used.device === name)).map((one) => one.id!);
  const marked = withAttention(document, next, name, users, sources);
  return { document: marked.document, effects: [...effects, ...marked.effects] };
}

/**
 * An activity with a device of that name gone from it, where `device` is given, and with the sequences of `goneNames`
 * gone: every sequence left with no step sending a command goes too, and with every gone sequence, each key, screen
 * entry and extra step that ran it. A field left empty is no field, but a screen, which a person states whole.
 */
function settledActivity(activity: RecipeActivity, device: string | undefined, goneNames: Set<string>): RecipeActivity {
  const sends = (step: object): boolean => device !== undefined && sendsTo(step, device);
  const sequences = (activity.sequences ?? []).flatMap((one): RecipeSequence[] => {
    if (goneNames.has(one.name)) return [];
    const steps = one.steps.filter((step) => !sends(step));
    if (steps.some((step) => 'device' in step)) return [{ ...one, steps }];
    goneNames.add(one.name);
    return [];
  });
  const screen = activity.screen?.flatMap((item): RecipeScreenItem[] => {
    if (!('sequence' in item)) return sends(item) ? [] : [item];
    if (item.steps === undefined) return goneNames.has(item.sequence) ? [] : [item];
    const steps = item.steps.filter((step) => !sends(step));
    // A sequence written out with no step left that sends goes, and the keys that ran it with it.
    if (steps.some((step) => 'device' in step)) return [{ ...item, steps }];
    goneNames.add(item.sequence);
    return [];
  });
  const runsGone = (item: object): boolean => 'sequence' in item && goneNames.has((item as { sequence: string }).sequence);
  const keys = activity.keys?.filter((one) => !sends(one.action) && !runsGone(one.action));
  const steps = (when: 'start' | 'end'): readonly RecipeActivityStep[] | undefined => {
    const left = activity[when]?.filter((step) => !sends(step) && !runsGone(step));
    return left === undefined || left.length === 0 ? undefined : left;
  };
  const devices = activity.devices.filter((used) => used.device !== device);
  const order = activity.powerOrder?.filter((one) => one !== device);
  return {
    ...without(activity, 'devices', 'screen', 'keys', 'powerOrder', 'start', 'end', 'sequences'),
    devices,
    ...stated('screen', screen),
    ...stated('keys', keys === undefined || keys.length === 0 ? undefined : keys),
    ...stated('powerOrder', order === undefined || (order.length === 0 && devices.length === 0) ? undefined : order),
    ...stated('start', steps('start')),
    ...stated('end', steps('end')),
    ...stated('sequences', sequences.length === 0 ? undefined : sequences),
  };
}

/** Put a device, an activity or an activity's device at another position, counted from 0, R28. */
export function move(document: Recipe, what: Movable, to: number): Change {
  changeable(document);
  given(what, 'what is moved', { kind: 'document' });
  if ('activity' in what) {
    const activity = activityOf(document, what.activity);
    if ('device' in what) {
      const device = deviceOf(document, what.device);
      const from = activity.devices.findIndex((used) => used.device === device.name);
      const place: Place = { kind: 'activity-device', activity: what.activity, device: what.device };
      if (from < 0) throw new ChangeRefused('unknown', place, `activity ${activity.name} does not use ${device.name}`);
      return { document: finished(withActivity(document, { ...activity, devices: moved(activity.devices, from, to, place, device.name) }), place), effects: [] };
    }
    const place: Place = { kind: 'activity', activity: what.activity };
    const from = document.activities.findIndex((one) => one.id === activity.id);
    return { document: finished({ ...document, activities: moved(document.activities, from, to, place, `activity ${activity.name}`) }, place), effects: [] };
  }
  const device = deviceOf(document, what.device);
  const place: Place = { kind: 'device', device: what.device };
  const from = document.devices.findIndex((one) => one.id === device.id);
  return { document: finished({ ...document, devices: moved(document.devices, from, to, place, device.name) }, place), effects: [] };
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
      // A command whose code the document states as learned pulses, decision 43; no definition marks one as learned
      // yet, R11, so that is the only place a learned command can be.
      learned: Object.values(one.commands ?? {}).some((command) => command.code !== undefined && 'learned' in command.code),
    };
  });
}

/**
 * The activities, in the order of the activity menu, each with whether it is switched on, R92, and why it needs
 * attention, R93, where it does: a switched off activity is listed, since it is still the document's.
 */
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
    enabled: one.enabled !== false,
    // Each reason the caller's own, so changing one changes neither the document nor another answer.
    attention: plain(one.attention ?? []),
  }));
}

/**
 * The sequences, R37, each with the activity it belongs to, in the document's order: the activities' in the menu's
 * order and each activity's in its own. A step names its device by id. A sequence written out on a screen, the form of
 * version 1, has no id to address it by and is not listed; `key` and `screen` still answer it where it runs.
 */
export function sequences(document: Recipe): SequenceSummary[] {
  opened(document);
  const ids = new Map(document.devices.map((one) => [one.name, one.id!]));
  return document.activities.flatMap((activity) => (activity.sequences ?? []).map((one): SequenceSummary => ({
    id: one.id!,
    activity: activity.id!,
    name: one.name,
    steps: one.steps.map((step): SequenceStep => {
      if ('pause' in step) return { pause: step.pause };
      const id = ids.get(step.device);
      // A step names one of its activity's devices, and an activity naming a device the document lacks is the check's.
      if (id === undefined) throw new RecipeError(`activity ${activity.name}'s sequence ${one.name} sends to ${step.device}, which is no device of the document; the check lists it`);
      return { device: id, command: step.command };
    }),
  })));
}

/**
 * A device's commands, by name, in its definition's own order, then any the document's own commands of the device
 * name that the definition does not, in the order they are stated. A command is changed where the document states a
 * code for it, of either kind, and learned where that code is learned pulses, `RecipeDevice.commands`; how it is
 * sent is no change of its code. Refused, as a `RecipeError`, for a device that carries no definition: its commands
 * are in a catalogue and not in the document, and an empty list would say it has none.
 */
export function commands(document: Recipe, device: DeviceId): CommandSummary[] {
  opened(document);
  const one = deviceOf(document, device);
  if (one.definition === undefined) throw new RecipeError(`${one.name} carries no definition, so its commands are not in the document`);
  const own = one.commands ?? {};
  const summary = (name: string): CommandSummary => {
    const code = Object.hasOwn(own, name) ? own[name]!.code : undefined;
    return { name, changed: code !== undefined, learned: code !== undefined && 'learned' in code };
  };
  const defined = one.definition.commands.map((command) => command.name);
  // A command the document adds by its name alone would otherwise be missing from the list while it is in the file.
  return [...defined, ...Object.keys(own).filter((name) => !defined.includes(name))].map(summary);
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

/**
 * **Every key of a document's model as data**, R77: each place its family's maps name, keypad keys, number pad places,
 * gestures and touch keys, in the family's order, with where it is, the presses it has on this model, whose map binds
 * it, and whether a person's choice on it is built and why not, `KeyPlaceSummary`. The places `check` holds a
 * document's choices to and `keys` answers by, `FamilyMaps.places`, so an application drawing the remote shows what the
 * build binds. Not built, by name with R77, for a model whose family has no maps yet, rather than answering an empty
 * list that would say the model has no keys, and for a model no family serves, `servedBy`.
 *
 * A word here is the name the model's drawing carries for the key, `data-name`, so an application colours and finds
 * the key on the drawing by it. `setKey` takes a choice on exactly the places listed here as built, for the presses
 * listed and the kind of owner whose map binds it.
 */
export function keyNames(document: Recipe): KeyPlaceSummary[] {
  const { skin, maps } = mapsToAnswer(document, 'recipe.keyNames');
  return maps.places(skin).map((place): KeyPlaceSummary => ({
    key: place.key, surface: place.surface, presses: [...place.presses], boundBy: place.boundBy, built: place.built,
    ...(place.why === undefined ? {} : { why: place.why }),
  }));
}

/**
 * **What one key of an owner does**, R77, before anything is built: every press the model has for it, each with what
 * it does and whether that is the default, how a command is sent or a sequence's steps; or, with `press` given, that
 * press alone. Read off the same maps the build binds by, `resolvedOf`. Where the owner's map does not bind the key, it
 * answers no press and why; a key the model has no place of is refused, as `ChangeRefused` naming the key.
 *
 * **Not built**, by name with R77, for a model whose family has no maps yet; refused as `commands` refuses where a
 * device carries no definition and no archive is given.
 */
export function key(document: Recipe, place: KeyPlace, sources?: QuestionSources): KeyAnswer {
  given(place, 'a key', { kind: 'document' });
  ownerGiven(place.owner);
  const resolved = resolvedOf(document, 'recipe.key', sources);
  const owner = resolvedOwner(document, resolved, place.owner);
  const at = resolved.places.find((one) => one.key === place.key);
  if (at === undefined) throw noSuchKey(document.model.name, place.key, { kind: 'key', owner: place.owner, key: place.key });
  return new Answerer(document, resolved).keyOf(place.owner, at, owner.keys, place.press);
}

/**
 * **What every key of an owner does**, R77, the default ones included: every place the owner's map can bind, bound or
 * not, in the model's order, each with every press the model has for it; the whole map as the remote will have it,
 * which is what an application shows on its drawing of the keypad. A place the owner's map cannot bind is not listed,
 * `keyNames` lists it with why; asked for alone, `key` answers it with why. Not built and refused as `key` is.
 *
 * **A device's own map and an activity's are separate**, `reference/how-a-harmony-works.md`: a choice in a device's map,
 * device mode's, changes that device's answer and no activity's, and the other way round.
 *
 * **A choice naming a device the document does not hold stops this owner's answer**, as a `RecipeError` naming the key
 * and the device, since a press of a device that is not there has no id and no settings to answer; `check` lists the
 * same choice as `unknown-device`. Only that owner stops: `key` still answers the owner's other keys one at a time, and
 * its screen and every other owner answer. A screen entry naming such a device never reaches a question, since the
 * reader refuses the document.
 */
export function keys(document: Recipe, owner: Owner, sources?: QuestionSources): KeyAnswer[] {
  ownerGiven(owner);
  const resolved = resolvedOf(document, 'recipe.keys', sources);
  const found = resolvedOwner(document, resolved, owner);
  const answerer = new Answerer(document, resolved);
  return resolved.places.filter((place) => binds(place, kindOf(owner))).map((place) => answerer.keyOf(owner, place, found.keys));
}

/**
 * **What an owner's screen shows**, R77: its entries in order, the family's default list or the one the document
 * states whole, each entry marked accordingly. Not built and refused as `key` is.
 */
export function screen(document: Recipe, owner: Owner, sources?: QuestionSources): ScreenAnswer {
  ownerGiven(owner);
  const resolved = resolvedOf(document, 'recipe.screen', sources);
  const found = resolvedOwner(document, resolved, owner).screen;
  const answerer = new Answerer(document, resolved);
  return { owner: { ...owner }, items: found.items.map((entry) => answerer.entryOf(owner, entry, found.isDefault)), isDefault: found.isDefault };
}

/**
 * **The remote's own settings as the remote will have them**, R47, before anything is built: every setting the model's
 * build writes from a document, in the order it writes them, each with its value, whether that is the default, the
 * default, and the kind of value it takes, `RemoteSettingAnswer`. Read off the model's family, `FamilySettings`, the
 * table its build writes by, so what an application is shown is what is built.
 *
 * **Only the settings the build writes are listed.** A setting the document states that the model does not have, or
 * that the build does not write yet, is not answered here; `check` lists it, as `setSetting` refuses it.
 *
 * **Not built**, R47, for a model whose build reads no setting from a document, which is every compiled family's: the
 * Harmony One's and the Harmony 600, 650 and 700's settings are build choices of their own, and whether the Harmony 300
 * and 350 have any is not checked, so an empty list would say what is not known. The Harmony Touch answers its seven.
 * Every answer is the caller's own, so changing one changes no other and not the document.
 */
export function settings(document: Recipe): RemoteSettingAnswer[] {
  const family = remoteSettingsOf(document.model, ['recipe.settings', 47]);
  if (family === undefined) return notBuilt(`recipe.settings for the ${document.model.name}`, 47);
  const stated: Readonly<Record<string, RecipeSetting>> = document.settings ?? {};
  return family.rows.map((row): RemoteSettingAnswer => {
    const takes: SettingKind = row.takes.kind === 'yes or no' ? { kind: 'yes or no', choices: [true, false] } : { ...row.takes };
    // Own names only, so a document's `constructor` is no value of a row.
    if (!Object.hasOwn(stated, row.name)) return { name: row.name, value: row.default, isDefault: true, default: row.default, takes };
    const own = stated[row.name]!;
    const value = family.refusedValue(row.name, own) === undefined ? settingValue(row, own) : own;
    return { name: row.name, value, isDefault: false, default: row.default, takes };
  });
}

/** A device's favourite channels, in order. */
export function favourites(document: Recipe, device: DeviceId): Favourite[] {
  void document; void device;
  return notBuilt('recipe.favourites', 77);
}

/**
 * **Everything that names a device or a sequence**: what removing it would touch, the same places, in the same order,
 * that `remove` reports as effects, since both take one walk. For a device, every key's choice, screen entry, part in
 * an activity, role of an activity that no other device of it has, place in a power order, step of a sequence of either
 * form, extra step at a start or an end and its favourites; and where a sequence goes with the device, everything that
 * runs that sequence. A role is not a mention of the device's name, but a removal leaves it with no device, so it is
 * listed where the removal reports it; and last, the attention mark of every activity that used the device, decision 44,
 * its keys read off the resolved maps with `sources` as the questions read them. For a
 * sequence, every key, screen entry and extra step of its activity that runs it.
 * For an activity, the document where it holds the favourite channels, which its removal leaves held by none, and
 * nothing otherwise, since nothing names an activity.
 */
export function uses(document: Recipe, what: Removable, sources?: QuestionSources): Place[] {
  opened(document);
  removable(what);
  if ('sequence' in what) {
    const { activity, sequence } = sequenceOf(document, what.sequence);
    return runsOf(activity, sequence.name, true).map((one) => one.place);
  }
  if ('activity' in what) return activityMentions(activityOf(document, what.activity)).map((one) => one.place);
  // The removal's own reading, so the attention marks it would set are listed as it sets them.
  return removedDevice(document, deviceOf(document, what.device), sources).effects.map((one) => one.place);
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
 * sync refuse while the list holds an error, and say the same problems. Each problem is a sentence a person reads,
 * with the place it concerns.
 *
 * **Held to the model's places**, decision 43, the ones `keyNames` lists and the build binds by: a key's choice on a
 * word that is no key of the model, on a key the owner's map does not bind, with a press the key does not have, or on
 * a key the model's build takes no choice on; a held press, a double press or a sequence on a key where the model's
 * build takes none, `keyFormsBuilt`; and a choice the model's family refuses, `FamilyMaps.refusedChoice`.
 *
 * **Held to each device's commands**, where the document says which it has: its carried definition, or `sources`'
 * archive for a device carrying none, and the commands the document adds. A key's choice, a screen entry of any owner,
 * a step of a sequence or at a start or an end, a step of a device's power or channel tuning, and a tuning of one
 * command, each naming a command its device does not have, is a problem at its place. Where nothing says which
 * commands a device has, nothing is said of them: the device's own note says it carries no definition.
 *
 * **Held to the model's capabilities** as the changes are: a key word another model has and this one lacks, an opening
 * screen the model does not have, and a device key on a model without device keys, each not on this model. A field of
 * version 2 the model's build does not read is listed naming the model, since the build of another reads it. Not built,
 * as every call is, for a model no family serves yet.
 */
export function check(document: Recipe, sources?: QuestionSources): Problem[] {
  opened(document);
  const problems: Problem[] = [];
  const say = (severity: 'error' | 'note', code: ProblemCode, place: Place, message: string): void => {
    problems.push({ severity, code, place, message });
  };
  const whole: Place = { kind: 'document' };

  // The model: one no family serves is not built, the same answer every call gives, `servedBy`.
  const asked: Asked = ['recipe.check', 78];
  const limits = limitsOf(document.model, asked);
  if (limits.maxDevices !== undefined && document.devices.length > limits.maxDevices) {
    say('error', 'over-limit', whole, `a ${document.model.name} holds ${limits.maxDevices} devices, and the document holds ${document.devices.length}`);
  }
  if (limits.maxActivities !== undefined && switchedOnCount(document) > limits.maxActivities) {
    say('error', 'over-limit', whole, activityLimitMessage(document.model.name, limits.maxActivities, `has ${switchedOnCount(document)} switched on`));
  }

  // A name the build would refuse to draw, asked of the model's family by its own judgement, `Family.nameRefusal`:
  // each device, and each activity switched on, since the build leaves the others out.
  const choice = servedBy(document.model, asked);
  const drawable = choice.family.kind === 'compiled' ? choice.family.nameRefusal : undefined;
  if (drawable !== undefined) {
    const skin = choice.skin;
    // Judging a name draws it, in the fonts the codec is supplied, and the main entry loads with none, `resources.ts`:
    // a check there says once that it judged no name rather than failing or passing every name unseen.
    try {
      for (const device of document.devices) {
        const why = drawable(document, skin, 'device', device.name);
        if (why !== undefined) say('error', 'name-not-drawable', { kind: 'device', device: device.id! }, `the build cannot draw the device ${device.name}'s name: ${why}`);
      }
      for (const activity of document.activities.filter((one) => one.enabled !== false)) {
        const why = drawable(document, skin, 'activity', activity.name);
        if (why !== undefined) say('error', 'name-not-drawable', { kind: 'activity', activity: activity.id! }, `the build cannot draw the activity ${activity.name}'s name: ${why}`);
      }
    } catch (error) {
      if (!(error instanceof ResourceError)) throw error;
      say('note', 'names-not-judged', whole, `no name was judged against what a ${document.model.name} draws, since ${error.message}`);
    }
  }

  const byName = new Map<string, RecipeDevice>();
  for (const device of document.devices) {
    const place: Place = { kind: 'device', device: device.id! };
    // The first of a name keeps it; every later one is the problem, so that fixing the listed ones is enough.
    if (byName.has(device.name)) say('error', 'name-taken', place, `two devices are named ${device.name}`);
    else byName.set(device.name, device);
    // A device with no definition is built from the archive, a source the caller gives the build: without one given
    // here its commands cannot be judged, and the build refuses it as a source missing; with one that holds it, it is
    // judged by that archive below, and with one that does not, it cannot be.
    if (device.definition === undefined && knownCommands(device, sources?.archive) === undefined) {
      say('note', 'no-definition', place, sources?.archive === undefined
        ? `${device.name} carries no definition and no archive was given, so its commands cannot be judged, and it builds only where an archive holding ${device.device} is given`
        : `${device.name} carries no definition, and the archive given does not hold ${device.device}, so its commands cannot be judged`);
    }
    if (device.key !== undefined && impossibleOn(document.model, 39, asked)) {
      say('error', 'not-on-this-model', place, `${device.name} is put on a device key, and a ${document.model.name} has no device keys`);
    }
  }
  // Each device's commands once, by its name, read as `knownCommands` reads them for a change.
  const known = new Map<string, ReadonlySet<string> | undefined>();
  const commandsOf = (name: string): ReadonlySet<string> | undefined => {
    if (!known.has(name)) {
      const device = byName.get(name);
      known.set(name, device === undefined ? undefined : knownCommands(device, sources?.archive));
    }
    return known.get(name);
  };

  // The keys the model's builder takes a choice for, where its family states no maps.
  const names = keyNamesOf(document.model, asked);
  // The model's places, the ones `keyNames` and `keys` answer by and the build binds by, decision 43; none where the
  // model's family has no maps yet, where the builder's words above are all there is to hold a choice to.
  const modelMaps = mapsOf(document.model, asked);
  const places = modelMaps?.maps.places(modelMaps.skin);
  const forms = keyFormsBuilt(document.model, asked);
  /** A word the model has no key of: another model's key is not on this model, a word no model has is unknown. */
  const noKey = (place: Place, what: string, word: string): void => {
    if (keyWordsOfEveryModel().has(word)) say('error', 'not-on-this-model', place, `${what} chooses what the ${word} key does, and a ${model} has no ${word} key, which other models have`);
    else say('error', 'unknown-key', place, `${what} chooses what the ${word} key does, and no model has a key of that name`);
  };
  const model = document.model.name;

  /**
   * Whether a key's choice names a place the owner's map binds, with a press the place has, saying the problem where
   * not: a word that is no place of the model, a place the remote binds outside every map or that only the other kind
   * of owner's map binds, and a press the place does not have on this model. True where nothing was said, so what is
   * not built is said only of a choice that is otherwise right, and never twice of one.
   */
  const placed = (owner: Owner, key: RecipeKey, place: Place, what: string): boolean => {
    if (places === undefined) return true;
    const press = key.press ?? 'short';
    const at = places.find((one) => one.key === key.key);
    if (at === undefined) {
      noKey(place, what, key.key);
      return false;
    }
    if (!binds(at, kindOf(owner))) {
      // Coded as `setKey` refuses the same place, so an application that acts on a code meets one answer whichever of
      // the two it asked: a key the remote binds outside every map is no key a person can choose, unknown; a key only
      // the other kind of owner's map binds is a key the model has, just not in this map, not on this model.
      if (at.boundBy === 'remote') {
        say('error', 'unknown-key', place, `${what} chooses what the ${key.key} key does, and a ${model}'s maps bind no key of that name: ${at.why ?? 'the configuration binds it outside them'}`);
      } else {
        say('error', 'not-on-this-model', place, `${what} chooses what the ${key.key} key does, and on a ${model} only ${at.boundBy === 'device' ? 'a device\'s own map' : 'an activity\'s map'} binds it`);
      }
      return false;
    }
    if (!at.presses.includes(press)) {
      say('error', 'not-on-this-model', place, `${what} gives the ${key.key} key a ${press} press, which the ${key.key} key of a ${model} does not have`);
      return false;
    }
    return true;
  };

  /**
   * The problems of one owner's key choices, **in the order `setKey` judges the same choice and coded as it refuses
   * it**, so an application that acts on a code meets one answer whichever of the two it asked: the place first, then
   * the action, a sequence on a device's own key `invalid` and a device, a command or a sequence the document does not
   * hold unknown, and the family's own refusal last, asked only of a choice whose place and action are both right, as
   * `setKey` asks it once it has found the action. What is not built is said only of a choice that is otherwise right.
   */
  const checkKeys = (owner: Owner, keys: readonly RecipeKey[] | undefined, what: string, sequences: ReadonlySet<string>): void => {
    for (const key of keys ?? []) {
      const place = keyPlace(owner, key);
      const onAPlace = placed(owner, key, place, what);
      if (onAPlace) {
        const at = places?.find((one) => one.key === key.key);
        if (at !== undefined && !at.built) {
          say('error', 'not-on-this-model', place, `${what} chooses what the ${key.key} key does, which nothing builds for a ${model} yet: ${at.why ?? 'the build takes no choice on it'}`);
        } else if (places === undefined && names === undefined) {
          say('error', 'not-on-this-model', place, `${what} chooses what the ${key.key} key does, which nothing builds for a ${model} yet`);
        } else if (places === undefined && names?.includes(key.key) === false) {
          noKey(place, what, key.key);
        }
        if (!forms && key.press === 'held') say('error', 'not-on-this-model', place, `${what} gives the ${key.key} key a second command when held, which nothing builds for a ${model} yet`);
        if (!forms && key.press === 'double') say('error', 'not-on-this-model', place, `${what} gives the ${key.key} key a command when pressed twice, which nothing builds for a ${model} yet`);
      }
      // The action, as `readRecipe` and `setKey` hold it: true where it names what the document holds.
      let held = true;
      if ('sequence' in key.action) {
        if ('device' in owner) {
          // A device has no sequences: `readRecipe` refuses a document stating one and `setKey` refuses the choice as
          // `invalid`, so a document that reached the check without the reader is told the same.
          say('error', 'invalid', place, `${what} runs the sequence ${key.action.sequence} on the ${key.key} key, and a device has no sequences`);
          held = false;
        } else if (!sequences.has(key.action.sequence)) {
          say('error', 'unknown-sequence', place, `${what} runs the sequence ${key.action.sequence} on the ${key.key} key, which is not one of the activity's`);
          held = false;
        } else if (!forms) {
          say('error', 'not-on-this-model', place, `${what} puts a sequence on the ${key.key} key, which nothing builds for a ${model} yet`);
        }
      } else if ('device' in key.action) {
        const device = byName.get(key.action.device);
        if (device === undefined) {
          say('error', 'unknown-device', place, `${what} gives the ${key.key} key a command of ${key.action.device}, which is no device of the document`);
          held = false;
        } else if (commandsOf(device.name)?.has(key.action.command) === false) {
          say('error', 'unknown-command', place, `${what} gives the ${key.key} key ${device.name}'s ${key.action.command}, which ${device.name} does not have`);
          held = false;
        }
      }
      // What the model's family refuses beyond its places, asked only of a choice its places take and whose action the
      // document holds, as `setKey` asks it last.
      if (onAPlace && held && places !== undefined) {
        const why = modelMaps!.maps.refusedChoice?.(modelMaps!.skin, {
          owner: kindOf(owner), what, key: key.key, press: key.press ?? 'short', action: key.action,
          commandsOf: (name) => { const found = commandsOf(name); return found === undefined ? undefined : [...found]; },
        });
        if (why !== undefined) say('error', 'not-on-this-model', place, why);
      }
    }
  };
  for (const device of document.devices) checkKeys({ device: device.id! }, device.keys, `${device.name}'s own map`, new Set());

  const activityNames = new Set<string>();
  for (const activity of document.activities) {
    const place: Place = { kind: 'activity', activity: activity.id! };
    if (activityNames.has(activity.name)) say('error', 'name-taken', place, `two activities are named ${activity.name}`);
    activityNames.add(activity.name);
    if (activity.devices.length === 0) say('note', 'unfinished', place, `activity ${activity.name} uses no device yet`);
    // A screen it opens on that the model does not have; one on a model whose family names none is listed below, as a
    // field its build does not read.
    const opens = activity.opensOn === undefined ? undefined : openingScreenRefusal(document.model, activity.opensOn, asked);
    if (opens !== undefined) say('error', 'not-on-this-model', place, `activity ${activity.name} opens on ${activity.opensOn}, and ${opens}`);
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
    // The sequences a key of it may run, by name, either form, as `readRecipe` holds them: its own, and one written out
    // where it sits on its screen, the form of version 1.
    const runnable = new Set([
      ...(activity.sequences ?? []).map((one) => one.name),
      ...(activity.screen ?? []).flatMap((item) => ('sequence' in item && 'steps' in item ? [item.sequence] : [])),
    ]);
    checkKeys({ activity: activity.id! }, activity.keys, `activity ${activity.name}`, runnable);
  }

  // Every other place a command is named, held to its device's commands: a key's were said with the key above.
  for (const use of commandUses(document)) {
    if (use.kind === 'key' || !byName.has(use.device)) continue;
    if (commandsOf(use.device)?.has(use.command) === false) {
      say('error', 'unknown-command', use.place, `${use.where} names ${use.device}'s ${use.command}, which ${use.device} does not have`);
    }
  }
  // A tuning of one command the device does not have: a command with a code of its own is the document's and is had.
  for (const device of document.devices) {
    for (const [name, one] of Object.entries(device.commands ?? {})) {
      if (one.code === undefined && commandsOf(device.name)?.has(name) === false) {
        say('error', 'unknown-command', { kind: 'command', device: device.id!, command: name }, `${device.name}'s ${name} is tuned, and ${device.name} has no command of that name`);
      }
    }
  }

  // The remote's own settings, held to the model's family by the judgement `setSetting` takes, `settingVerdict`, so the
  // two code a setting alike and the build refuses nothing the check passed: a value the build refuses invalid, a
  // setting the build does not write yet not built, said with its requirement, and any other name not on this model.
  // Where the family states no settings, the field is said below as one the model's build does not read.
  const remote = remoteSettingsOf(document.model, asked);
  for (const [name, value] of Object.entries(remote === undefined ? {} : document.settings ?? {})) {
    const verdict = settingVerdict(remote!, model, name, value);
    if (verdict === undefined) continue;
    const place: Place = { kind: 'setting', setting: name };
    if ('requirement' in verdict) say('error', 'not-on-this-model', place, `the document states the setting ${name}, which nothing builds for a ${model} yet, R${verdict.requirement}`);
    else say('error', verdict.reason, place, verdict.message);
  }

  // The fields of version 2 the build of the document's model does not read yet, decision 43, `unbuiltFields` over the
  // one table that says per part which kinds of family read it: each is an error, since the build refuses on it, said
  // where it is. A double press is said by the keys above already, so it is not said twice.
  const activityByName = new Map(document.activities.map((one) => [one.name, one]));
  for (const field of unbuiltFields(document)) {
    if (field.field === 'keys') continue;
    const owner = field.owner;
    const place: Place = 'device' in owner && byName.has(owner.device) ? { kind: 'device', device: byName.get(owner.device)!.id! }
      : 'activity' in owner && activityByName.has(owner.activity) ? { kind: 'activity', activity: activityByName.get(owner.activity)!.id! }
        : whole;
    say('error', 'not-on-this-model', place, `the document states ${field.where}, which the ${model}'s build does not read yet`);
  }
  return problems;
}
