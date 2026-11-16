/**
 * The recipe: everything a configuration of ours depends on, as data, plan 007. The
 * setup files in `packages/remote/setups/` are recipes, and `docs/recipe.md` is the format's
 * preliminary definition, field by field against FreeHarmony's data model.
 *
 * **What it holds**: the model it is for, the devices by their catalogue entries, the activities with
 * each device's input and roles and the working screen's items, the choices of the model's family over
 * that family's defaults, and favourite channels, which only Logitech's service is given so far, since no
 * composer of ours writes one. **What it never holds is what the model can do**: how many devices it
 * takes, its screen, which family builds for it. Those come from the model's definition,
 * `packages/base/src/models.ts`, documented in `reference/remotes/`, so a recipe states a wish and the
 * model's definition says whether it can be granted.
 *
 * The model is named the way FreeHarmony names one, `RemoteModel`: Logitech's name, "Harmony 650", and
 * the skin where it is known. The skin is what tells a region's twin apart, the 650 from the 650 EMEA,
 * so a name two skins share is refused without one.
 *
 * This module reads a recipe and checks its shape; whether the devices are in the catalogue, the inputs
 * named the way the catalogue names them and the choices ones the family makes is for the steps that use
 * them, which already refuse each.
 *
 * **Version 2, decision 43**, is one document shape for every model: what a Harmony Touch's own block held a person's
 * choice of becomes ordinary fields that every model shares, a device's timing, power, channel tuning, screen and
 * commands, an activity's opening screen, favourites, power order, extra steps and sequences, the remote's settings,
 * and a third press. Version 2 only adds fields, so a version 1 document reads as it did; the fields of version 2 are
 * refused in a document of version 1, which is exactly what the reader of version 1 did with them. **A build reads a
 * field of version 2 only where the table below says so**, and a build must not leave one out without a word, since a timing dropped would give a
 * configuration the remote accepts and that sends at the catalogue's pace: `unbuiltFields` lists every one a document
 * states, and every build from a recipe refuses on the first, `refuseUnbuiltFields`.
 *
 * **Which build reads which field is one table**, `VERSION_TWO`: each part of a field says which kinds of family read
 * it, so the reader, the guard of every build and the toolkit's check all answer from it. The Harmony Touch's build
 * reads most of them, its documents being made from them; the compiled families' builds read none yet.
 *
 * **A document with a Harmony Touch's own block, `touch`, the earlier form, is refused**, naming the converter that
 * writes it in this shape, `harmonyTouch.describeTouchDocument` on the codec's `./build`. That form is read only by the
 * Touch family's reader of it, for the converter and for the tests that rebuild what was sent to a remote from it.
 */
import type { Model } from '@freeharmony-sdk/base/models';
import type { DeviceChannelTuning, DevicePower, DeviceTiming, DriveStep } from '../catalogue/driving.ts';
import { ACTIVITY_ROLE_NAMES, type ActivityRoleName } from '../compose/activityroles.ts';
import type { Pulse } from '../infrared/irframe.ts';
import { notBuilt } from '../support/contract.ts';
import type { DocumentFamily } from '../families/document.ts';
import type { Family } from '../families/family.ts';
import { chooseByModel, NoFamilyError, type ModelChoice } from '../families/registry.ts';

// Logitech's name for a model record, which the registry holds since it chooses by model, plan 013; exported here as
// it was, for the callers that took it from the recipe.
export { modelName } from '../families/registry.ts';

/** A recipe that cannot be read, or names a model nothing here can build for. */
export class RecipeError extends Error {}

/**
 * The converter of a Harmony Touch's document of the earlier form, with its own block, into the shape every model
 * shares, as an application finds it: what a refusal of that form names, decision 43.
 */
export const TOUCH_CONVERTER = 'harmonyTouch.describeTouchDocument on @freeharmony-sdk/config/build';

/**
 * The version of the recipe's format this reads and writes, `Recipe.version`. Version 2 adds the fields of one shape
 * for every model, decision 43, and changes the meaning of none, so a document of version 1 reads as before.
 */
export const RECIPE_VERSION = 2;

/**
 * How a key is pressed, wherever a key's choice or a key's place names one: `held` is the long press, a second
 * command chosen by how long the key is down, which is a property of the key, and not repeating while held, which is
 * the command's, `reference/how-a-harmony-works.md`; `double` is two presses in quick succession, which a Harmony
 * Touch's gestures take, R40. `double` is of version 2. Which presses a model has is its family's to say.
 */
export type RecipePress = 'short' | 'held' | 'double';

/** The model a recipe is for: FreeHarmony's `RemoteModel`, Logitech's name and the skin where known. */
export interface RecipeModel {
  readonly name: string;
  readonly skin?: number;
}

/**
 * One device: what the remote calls it, its catalogue entry as `<manufacturer>/<file>`, and MyHarmony's
 * "I want to keep this device on when switching Activities", absent meaning off.
 */
export interface RecipeDevice {
  /**
   * The device's id in this document, which the toolkit gives it and addresses it by, `recipe/toolkit.ts`: kept
   * through every rename, so an application's selection and undo never hold a name. Absent in a recipe written by
   * hand, which the toolkit's `open` gives one; the builders do not read it.
   */
  readonly id?: string;
  readonly name: string;
  readonly device: string;
  readonly poweredOnBetweenActivities?: boolean;
  /**
   * The device key it goes on, on a remote with a key per device and no screen, the Harmony 300 and 350: the key's
   * place as `DevicePlace` counts it, from 0, `DEVICE_KEYS` in the family's `keys.ts`, and a short or a long press, short unless given. Plan 014: a
   * person chooses it in MyHarmony, so it is the recipe's, and only that family reads it.
   */
  readonly key?: RecipeDeviceKey;
  /** The keys a person chose otherwise in this device's own map, device mode's; absent is none. */
  readonly keys?: readonly RecipeKey[];
  /**
   * The device's definition carried in the recipe, plan 014: the catalogue's record of it and its codeset's
   * commands, served before any archive, `carriedCatalogue` in `catalogue/carried.ts`. Absent, the build reads the
   * catalogue entry `device` names from the archive it is given.
   */
  readonly definition?: RecipeDefinition;
  /**
   * A person's timing for the device, R16 and R17, in the catalogue's own member names, `DeviceTiming`, each member
   * given standing over the catalogue's and every other the catalogue's. Kept apart from `definition` so that fetching
   * the definition again replaces the catalogue's statement and never the person's. Version 2.
   */
  readonly timing?: Partial<DeviceTiming>;
  /**
   * A person's choice of how the device is powered, R14: the catalogue's own members, `DevicePower`, each given
   * standing over the catalogue's, and `alwaysOn`, a device that is never switched off, which the catalogue does not
   * state. Kept on between activities is `poweredOnBetweenActivities`, the field version 1 has. Version 2.
   */
  readonly power?: RecipeDevicePower;
  /**
   * A person's choice of how a channel number is entered, R18, in the catalogue's shape, `DeviceChannelTuning`, whose
   * steps name the device's commands by name. **Member by member, as `timing` is**: each member stated, the digits or
   * one of the four lists, stands over the catalogue's, and each one left out keeps the catalogue's. Version 2.
   */
  readonly channelTuning?: DeviceChannelTuning;
  /**
   * The device's screen list in device mode as a person chose it, R35, stated whole: every entry in order, an empty
   * list for none. Absent is what the family derives. Version 2.
   */
  readonly screen?: readonly RecipeScreenCommand[];
  /**
   * A person's changes to single commands of the device, by command name, R19: a code replacing the definition's,
   * and the sending part, which is room only: nothing builds it yet. Kept apart from `definition` for the same reason
   * as `timing`. Version 2.
   */
  readonly commands?: Readonly<Record<string, RecipeCommand>>;
}

/** `RecipeDevice.power`: the catalogue's power members a person states, and whether the device is always on. */
export interface RecipeDevicePower extends Partial<DevicePower> {
  readonly alwaysOn?: boolean;
}

/**
 * A code for one command: the catalogue's own notation, or pulses learned from the device's original remote, R19 and
 * R11. The toolkit's `CommandCode` is this.
 */
export type RecipeCommandCode = { readonly keycode: string } | { readonly learned: readonly Pulse[] };

/**
 * How one command is sent, where a person tuned it over what its code states: the copies of the code in the first
 * block, the pace of the held block in milliseconds, and the silence before the first block in milliseconds, the lead
 * in the compiled families' composers already take per command, R89. **Room only**: the place is in the document so its
 * shape does not move again, and no build reads it.
 */
export interface RecipeSending {
  readonly copies?: number;
  readonly heldPaceMs?: number;
  readonly leadInMs?: number;
}

/** One command a person changed, `RecipeDevice.commands`: a code of its own, how it is sent, or both. */
export interface RecipeCommand {
  readonly code?: RecipeCommandCode;
  readonly sending?: RecipeSending;
}

/** A device's definition carried in a recipe, `RecipeDevice.definition`. */
export interface RecipeDefinition {
  /** The catalogue's record of the device, as the archive's device file holds it: its codeset, power, inputs, timing. */
  readonly record: Readonly<Record<string, unknown>>;
  /** The commands of the codeset the record names, each its name and its keycode, the protocol and the numbers it sends. */
  readonly commands: readonly { readonly name: string; readonly keycode: string }[];
}

/**
 * A person's choice for one key, over what the builders derive for it, `RecipeDevice.keys` for a device's own map in
 * device mode and `RecipeActivity.keys` for an activity's: the key by Logitech's word for it, the press, short unless
 * given, and what it does instead: a command of any device of the recipe, by the device's name and the command's, a
 * sequence of the same owner's screen by its name, or nothing at all. A key not listed keeps what the builders give
 * it, so a recipe never copies a default.
 *
 * **The key is named by its word, `VolumeMute`, `Info`, `Number0`, never by a number.** The words are Logitech's,
 * the ones every model's drawing carries, `packages/silhouettes` and `reference/silhouettes/`, and they are the same
 * key on every model that has it, where a scan code is a number inside one family's firmware: Mute is scan 9 on a
 * Harmony One and another number on a Harmony 650, and a Harmony Touch has no scan codes at all. So a document moved
 * to another model still means the same keys, and only the family that builds for the model turns a word into its
 * own number, `Family.recipeKeys`. Which words a model takes is the family's to say, and the toolkit asks it,
 * `recipe.keyNames`; this module only reads that a key has a name.
 */
export interface RecipeKey {
  readonly key: string;
  readonly press?: RecipePress;
  readonly action: RecipeKeyAction;
}
export type RecipeKeyAction =
  | { readonly device: string; readonly command: string }
  | { readonly sequence: string }
  | { readonly nothing: true };

/** One key a recipe chooses otherwise, and whose map it is in: a device's own, device mode's, or an activity's. */
export interface StatedKey {
  readonly owner: 'device' | 'activity';
  /** The device's or the activity's name in the recipe. */
  readonly name: string;
  readonly key: RecipeKey;
  /** Where it is, for a refusal: "the device LG TV's VolumeUp key". */
  readonly where: string;
}

/**
 * Every key a recipe chooses otherwise, devices' first and then activities', each in the recipe's order. What a
 * builder that does not build them asks, so that it refuses a recipe stating one rather than building without it.
 */
export function statedKeys(recipe: Recipe): StatedKey[] {
  const place = (owner: StatedKey['owner'], name: string, key: RecipeKey): StatedKey => ({
    owner, name, key, where: `the ${owner} ${name}'s ${key.key} key${key.press === undefined || key.press === 'short' ? '' : `, ${key.press}`}`,
  });
  return [
    ...recipe.devices.flatMap((one) => (one.keys ?? []).map((key) => place('device', one.name, key))),
    ...recipe.activities.flatMap((one) => (one.keys ?? []).map((key) => place('activity', one.name, key))),
  ];
}

/** Whose a stated field of version 2 is: the document's, or a device's or an activity's by its name. */
export type StatedFieldOwner = { readonly document: true } | { readonly device: string } | { readonly activity: string };

/**
 * A kind of family, as a family states it, `Family.kind` and `DocumentFamily.kind`: what `VERSION_TWO` says reads a part.
 * **Per kind, because the kind names the families exactly today**: every compiled family's build reads the same of
 * version 2, none of it, and the Harmony Touch's is the one document family. Should one compiled family come to read a
 * field another does not, a person's timing on the Harmony One and not on the Harmony 650, this becomes a family's name.
 */
export type BuildKind = Family['kind'] | DocumentFamily['kind'];

/** One field of version 2 a recipe states, `versionTwoFields`. */
export interface StatedField {
  /** The member's name as the recipe spells it: `timing`, `powerOrder`, `keys` for a double press, `screen` for a label. */
  readonly field: string;
  readonly owner: StatedFieldOwner;
  /** Where it is, for a refusal: "the device Television's delays". */
  readonly where: string;
  /**
   * The requirement whose build will read it, `docs/remote-requirements.md`; undefined for a field no build has
   * anything to read in, `highestIds`, which changes no byte a remote receives.
   */
  readonly requirement: number | undefined;
  /** The kinds of family whose build reads it, `VERSION_TWO`; empty where none does yet. */
  readonly readBy: readonly BuildKind[];
}

/** One part of a stated field of version 2: what it is called after its owner's name, what its build waits on, who reads it. */
export interface VersionTwoPart {
  readonly what: string;
  /** A requirement's number, or `none` for a part no build has anything to read in. */
  readonly requirement: number | 'none';
  /** The kinds of family whose build reads this part; absent is none. */
  readonly readBy?: readonly BuildKind[];
}

/**
 * One field version 2 adds, `VERSION_TWO`: a member of its own, or a form of version 2 inside a member version 1
 * already has, `form`, such as a double press among a map's keys. **Every field states the requirements its parts
 * wait on, or `none`**, so a member added here cannot leave the guard's view: the reader takes exactly the members
 * this table names and gates exactly its forms, and the test walks the table, a sample for every field.
 */
export interface VersionTwoField {
  readonly owner: 'document' | 'device' | 'activity';
  /** The member's name in the recipe; for a form, the name of the member of version 1 it sits in. */
  readonly member: string;
  /** For a form inside a member of version 1, its name: `double`, `label`, `sequence`. */
  readonly form?: string;
  /** Every requirement a part of this field can wait on, `none` where nothing is built from it. */
  readonly requirements: readonly [number | 'none', ...(number | 'none')[]];
  /** The parts a stated value holds; for a form, the occurrences in the member's value, none where it holds none. */
  readonly parts: (value: unknown) => readonly VersionTwoPart[];
}

/** The repeat counts of `DeviceTiming`, R17; its other members are delays, R16. */
const REPEAT_COUNTS: readonly string[] = ['pressMinRepeats', 'minRepeats'];

/**
 * The members of a device's timing a Harmony Touch's build reads: the press count and the four delays its composer
 * writes into a device's record, `SetupDevice` in `families/harmony-touch/setup.ts`, each in the record's field of that
 * name, `reference/architectures/harmony-touch/devices-and-infrared.md`. The other four, the hold delay between devices,
 * the connected app's power on delay, the second repeat count and the flag for an optimised delay between keys, the
 * composer does not write, so a Touch's build does not read them and a document stating one is refused as not built.
 */
const TIMING_READ_BY_DOCUMENTS: readonly string[] = ['interKeyDelay', 'interDeviceDelay', 'powerOnDelay', 'inputDelay', 'pressMinRepeats'];

/** The kinds of family that read a part, written once. */
const DOCUMENTS: readonly BuildKind[] = ['document'];
/**
 * Both kinds: a part every build reads, the two of decision 44. An activity switched off is read once, before any
 * family builds, `takingPart`; an activity's attention mark changes no build, so every build reads it by building as
 * it would without it. Neither is ever refused as not built.
 */
const EVERY_BUILD: readonly BuildKind[] = ['compiled', 'document'];

/** A field stated whole: one part, what it is called, what it waits on and who reads it. */
const entire = (what: string, requirement: number | 'none', readBy?: readonly BuildKind[]) =>
  (): readonly VersionTwoPart[] => [{ what, requirement, ...(readBy === undefined ? {} : { readBy }) }];

/** The double presses among a map's keys, each a part waiting on R40: a double press is a gesture's alone. */
const doubles = (readBy?: readonly BuildKind[]) => (value: unknown): VersionTwoPart[] => ((value ?? []) as readonly RecipeKey[])
  .filter((key) => key.press === 'double')
  .map((key) => ({ what: `${key.key} key, pressed twice`, requirement: 40, ...(readBy === undefined ? {} : { readBy }) }));

/**
 * An activity's extra steps at its start or end, `which` naming them: the steps as one part a Touch's build reads, and
 * each step running a sequence a part of its own that no build reads, R30, since a Touch's activity holds no step of
 * any kind but a command or a pause, `reference/architectures/harmony-touch/activities-and-buttons.md`.
 */
const extraSteps = (which: string) => (value: unknown): VersionTwoPart[] => {
  const steps = value as readonly RecipeActivityStep[];
  const running = steps.flatMap((step, at) => ('sequence' in step ? [{ what: `step ${at + 1} ${which}, running the sequence ${step.sequence}`, requirement: 30 }] : []));
  return [...(running.length < steps.length ? [{ what: `steps ${which}`, requirement: 30, readBy: DOCUMENTS }] : []), ...running];
};

/**
 * **Every field version 2 adds, the requirement each waits on, and which builds read it**, decision 43. The one list the
 * reader takes its members of version 2 from, the guard of every build walks, `refuseUnbuiltFields`, and the toolkit's
 * check lists from, `unbuiltFields`.
 *
 * Two of the requirements are for one field each: R90, the order an activity switches its devices on and off, and
 * R91, the screen it opens on. A double press is R40, a gesture's, since no key but a gesture has one. A command's
 * code is R19 and how it is sent R89. The highest ids given wait on nothing, since they change no byte a remote
 * receives.
 *
 * **What a Harmony Touch's build reads**, `touchSetupOfDocument` in `families/harmony-touch/recipemaps.ts`, decision 43:
 * the settings; a device's timing in the members its composer writes, `TIMING_READ_BY_DOCUMENTS`, its being
 * always on, its channel tuning and its screen; an activity's opening screen, favourites, power order, extra steps but
 * one running a sequence, sequences, a screen entry's label and a sequence named on its screen, and a double press,
 * which its gestures have. **What it does not**: the rest of a device's timing and power, a command's code and how it is
 * sent, which its composer writes nothing of, and a device key's double press, which no key of a device's map has.
 * The compiled families' builds read none of it yet, but for the two every build reads, decision 44: an activity
 * switched off, R92, which `takingPart` reads before any family builds, and an activity's mark of needing attention,
 * R93, which changes no build.
 */
export const VERSION_TWO: readonly VersionTwoField[] = [
  { owner: 'document', member: 'settings', requirements: [47], parts: entire('settings', 47, DOCUMENTS) },
  { owner: 'document', member: 'highestIds', requirements: ['none'], parts: entire('highest ids given', 'none') },
  {
    owner: 'device', member: 'timing', requirements: [16, 17],
    parts: (value) => {
      const members = Object.keys(value as object);
      const read = (one: string): boolean => TIMING_READ_BY_DOCUMENTS.includes(one);
      return [
        ...(members.some((one) => !REPEAT_COUNTS.includes(one) && read(one)) ? [{ what: 'delays', requirement: 16, readBy: DOCUMENTS }] : []),
        ...(members.some((one) => REPEAT_COUNTS.includes(one) && read(one)) ? [{ what: 'repeat count', requirement: 17, readBy: DOCUMENTS }] : []),
        // A member no build reads is named by itself, so a refusal says which.
        ...members.filter((one) => !read(one)).map((one) => ({ what: one, requirement: REPEAT_COUNTS.includes(one) ? 17 : 16 })),
      ];
    },
  },
  {
    owner: 'device', member: 'power', requirements: [14],
    parts: (value) => {
      const members = Object.keys(value as object);
      return [
        ...(members.includes('alwaysOn') ? [{ what: 'power', requirement: 14, readBy: DOCUMENTS }] : []),
        ...members.filter((one) => one !== 'alwaysOn').map((one) => ({ what: `power ${one}`, requirement: 14 })),
      ];
    },
  },
  { owner: 'device', member: 'channelTuning', requirements: [18], parts: entire('channel tuning', 18, DOCUMENTS) },
  { owner: 'device', member: 'screen', requirements: [35], parts: entire('screen', 35, DOCUMENTS) },
  {
    owner: 'device', member: 'commands', requirements: [19, 89],
    parts: (value) => Object.entries(value as Readonly<Record<string, RecipeCommand>>).flatMap(([name, command]) => [
      ...(command.code === undefined ? [] : [{ what: `command ${name}'s code`, requirement: 19 }]),
      ...(command.sending === undefined ? [] : [{ what: `command ${name}'s sending`, requirement: 89 }]),
    ]),
  },
  { owner: 'device', member: 'keys', form: 'double', requirements: [40], parts: doubles() },
  { owner: 'activity', member: 'opensOn', requirements: [91], parts: entire('opening screen', 91, DOCUMENTS) },
  { owner: 'activity', member: 'favourites', requirements: [45], parts: entire('hold on the favourites', 45, DOCUMENTS) },
  { owner: 'activity', member: 'powerOrder', requirements: [90], parts: entire('power order', 90, DOCUMENTS) },
  { owner: 'activity', member: 'start', requirements: [30], parts: extraSteps('at its start') },
  { owner: 'activity', member: 'end', requirements: [30], parts: extraSteps('at its end') },
  { owner: 'activity', member: 'sequences', requirements: [37], parts: entire('sequences', 37, DOCUMENTS) },
  {
    owner: 'activity', member: 'screen', form: 'label', requirements: [34],
    parts: (value) => ((value ?? []) as readonly RecipeScreenItem[]).flatMap((item, at) =>
      ('device' in item && item.label !== undefined ? [{ what: `screen item ${at + 1}'s label`, requirement: 34, readBy: DOCUMENTS }] : [])),
  },
  {
    owner: 'activity', member: 'screen', form: 'sequence', requirements: [37],
    parts: (value) => ((value ?? []) as readonly RecipeScreenItem[]).flatMap((item, at) =>
      ('sequence' in item && item.steps === undefined ? [{ what: `screen item ${at + 1}, the sequence ${item.sequence}`, requirement: 37, readBy: DOCUMENTS }] : [])),
  },
  { owner: 'activity', member: 'keys', form: 'double', requirements: [40], parts: doubles(DOCUMENTS) },
  { owner: 'activity', member: 'enabled', requirements: [92], parts: entire('switch', 92, EVERY_BUILD) },
  { owner: 'activity', member: 'attention', requirements: [93], parts: entire('attention mark', 93, EVERY_BUILD) },
];

/**
 * The members of version 2 an owner takes, from `VERSION_TWO`: what the reader accepts beside the members of
 * version 1, so a member the reader takes is a member the guard walks. A form is a member of version 1 read otherwise
 * and gated where it is read, `formOfVersionTwo`.
 */
function versionTwoMembers(owner: VersionTwoField['owner']): string[] {
  return VERSION_TWO.filter((one) => one.owner === owner && one.form === undefined).map((one) => one.member);
}

/** Refuses a member of version 2 an owner states in a document of version 1, every one `VERSION_TWO` names. */
function gateVersionTwo(owner: VersionTwoField['owner'], value: Json, version: number, what: string): void {
  for (const member of versionTwoMembers(owner)) {
    if (value[member] !== undefined) ofVersionTwo(version, `${what} ${member}`);
  }
}

/**
 * **Every field of version 2 a recipe states**, decision 43: the document's first, then the devices' and the
 * activities', each in the recipe's order and each owner's in the order of `VERSION_TWO`, each part with the kinds of
 * family whose build reads it. One walk for every question about them: every build refuses on the first its kind does
 * not read, `refuseUnbuiltFields`, and the toolkit's check lists those the build of the document's model does not
 * read, `unbuiltFields`. The toolkit's changes and `uses` do not ask it: they write and follow every field whatever a
 * build reads, so a person's choice is kept while the build catches up.
 */
export function versionTwoFields(recipe: Recipe): StatedField[] {
  const out: StatedField[] = [];
  const walk = (kind: VersionTwoField['owner'], value: object, owner: StatedFieldOwner, whose: string): void => {
    for (const field of VERSION_TWO.filter((one) => one.owner === kind)) {
      const stated = (value as Record<string, unknown>)[field.member];
      if (stated === undefined) continue;
      for (const part of field.parts(stated)) {
        out.push({
          field: field.member, owner, where: `${whose} ${part.what}`,
          requirement: part.requirement === 'none' ? undefined : part.requirement, readBy: part.readBy ?? [],
        });
      }
    }
  };
  walk('document', recipe, { document: true }, 'the remote\'s');
  for (const device of recipe.devices) walk('device', device, { device: device.name }, `the device ${device.name}'s`);
  for (const activity of recipe.activities) walk('activity', activity, { activity: activity.name }, `the activity ${activity.name}'s`);
  return out;
}

/**
 * **The fields of version 2 a recipe states that a build of `kind` does not read yet**, each with the requirement it
 * waits on, so that what a document states is either in what is built or the reason nothing is: never left out, where
 * a configuration built without a person's timing would pass every check and send at the catalogue's pace. Empty for
 * every document of version 1.
 *
 * **Without `kind`, the build of the document's own model**, its family's kind as the registry chooses it, which is
 * what the toolkit's check asks; a model no family serves has no build, so every stated field is listed for it.
 */
export function unbuiltFields(recipe: Recipe, kind?: BuildKind): StatedField[] {
  const reader = kind ?? kindOfModel(recipe.model);
  return versionTwoFields(recipe).filter((one) => one.requirement !== undefined && (reader === undefined || !one.readBy.includes(reader)));
}

/** The kind of the family that builds for a model, or undefined where none serves it. */
function kindOfModel(model: RecipeModel): BuildKind | undefined {
  try {
    return chooseByModel(model).family.kind;
  } catch (error) {
    if (error instanceof NoFamilyError) return undefined;
    throw error;
  }
}

/**
 * **Refuse a build of a recipe that states a field a build of `kind` does not read yet**, as a function not built,
 * `route` naming the build and the field's requirement the refusal: `buildFromRecipe for the device Television's
 * delays`. Called first by every function that builds from a recipe, the one build, each family's `fromRecipe`, the
 * composers of a setup and the Harmony Touch's builder, each saying which kind of family's build it is, so that no
 * route to a configuration or a set of documents passes one by, and a field the Touch's build reads still stops a
 * compiled family's.
 */
export function refuseUnbuiltFields(recipe: Recipe, route: string, kind: BuildKind): void {
  const unbuilt = unbuiltFields(recipe, kind)[0];
  if (unbuilt !== undefined) notBuilt(`${route} for ${unbuilt.where}`, unbuilt.requirement!);
}

/** A device key, `RecipeDevice.key`. */
export interface RecipeDeviceKey {
  readonly place: number;
  readonly press?: 'short' | 'long';
}

/** One device's part in an activity: the input it is switched to, by the catalogue's name, and its roles. */
export interface RecipeActivityDevice {
  readonly device: string;
  readonly input?: string;
  readonly roles: readonly ActivityRoleName[];
}

/**
 * A command entry of a screen list: a device's command, by the device's name and the command's, and in version 2 the
 * label the screen shows for it, R34, absent for the command's own name. The steps of a version 1 screen use no label.
 */
export interface RecipeScreenCommand {
  readonly device: string;
  readonly command: string;
  readonly label?: string;
}

/**
 * One item of an activity's working screen, section 323: a device's command by the label that device's own screen
 * draws it under, or a sequence, Logitech's "sequence" of MyHarmony. **Two forms of a sequence**: version 1 states
 * one where it sits, by its name and its steps, a step sending the command a device's key sends by the key's scan
 * code, `keys.md`, or pausing, in tenths of a second; version 2 names one of the activity's own sequences,
 * `RecipeActivity.sequences`, whose steps name commands and never a scan, so a document moved to another model means
 * the same commands. `steps` is what tells the two apart: present on the first form, never on the second.
 */
export type RecipeScreenItem =
  | RecipeScreenCommand
  | { readonly sequence: string; readonly steps: readonly RecipeSequenceStep[] }
  | { readonly sequence: string; readonly steps?: undefined };
export type RecipeSequenceStep = { readonly device: string; readonly scan: number } | { readonly pause: number };

/**
 * One step of a version 2 sequence, R37: a device's command by the device's name and the command's, or a pause in
 * tenths of a second, as the toolkit's `SequenceStep` and the version 1 steps count a pause.
 */
export type RecipeCommandStep = { readonly device: string; readonly command: string } | { readonly pause: number };

/**
 * A named sequence an activity owns, R37: its id in the document, which the toolkit gives it as it gives a device's,
 * its name, and its steps, at least one of them sending a command. It draws on its activity's devices; a key, a
 * screen item and an extra step of the same activity name it. Version 2.
 */
export interface RecipeSequence {
  readonly id?: string;
  readonly name: string;
  readonly steps: readonly RecipeCommandStep[];
}

/**
 * One step an activity takes at its start or its end beyond what its devices need anyway, R30: a device's command, a
 * pause in tenths of a second, one of the activity's sequences by its name, or a channel tuned through a device,
 * `RecipeChannelStep`. The first three are the toolkit's `ActivityStep`'s; the channel is the document's alone, since
 * the toolkit's step has no channel. Devices by name, since the recipe names a device by its name underneath. Version 2.
 */
export type RecipeActivityStep = RecipeCommandStep | { readonly sequence: string } | RecipeChannelStep;

/**
 * A channel tuned through one of the activity's devices as a step at its start or its end, R30: the channel's digits
 * **as text**, so a leading zero survives, as a favourite channel's does, and the device tunes it the way its channel
 * tuning says. A step of the activity's own and never of a sequence: a Harmony Touch, the one remote whose documents
 * were measured holding one, keeps a channel step among an activity's start steps, and its engine skips a sequence's
 * step of any kind but a command or a pause, `reference/architectures/harmony-touch/activities-and-buttons.md`. Version 2.
 */
export interface RecipeChannelStep {
  readonly device: string;
  readonly channel: string;
}

/**
 * One activity: its name, MyHarmony's type, its devices, and its working screen's items in order, which
 * a person chooses and the compile does not derive, section 323. Absent or empty is a screen with no item.
 */
export interface RecipeActivity {
  /** The activity's id in this document, as `RecipeDevice.id` is a device's. */
  readonly id?: string;
  readonly name: string;
  readonly type: string;
  /**
   * The devices it uses. **None is allowed and kept**, decision 44: an activity with no device stays in the document,
   * and every build and sync leaves it out and says so, `leftOutBecause`, until a device is added.
   */
  readonly devices: readonly RecipeActivityDevice[];
  readonly screen?: readonly RecipeScreenItem[];
  /** The keys a person chose otherwise in this activity's map; absent is none. */
  readonly keys?: readonly RecipeKey[];
  /**
   * The screen the activity opens on, R91, by the word the model's family names it by; absent is the family's
   * default. Which words there are is the family's to say, so this reader takes any. Version 2.
   */
  readonly opensOn?: string;
  /**
   * Whether this activity holds the favourite channels, R45: at most one activity of a document says true. Absent is
   * the family's default, false says this one does not. Version 2.
   */
  readonly favourites?: boolean;
  /**
   * The order the activity switches its devices on and off in, R90, by their names: every device of the activity once.
   * Absent is the family's default. Version 2.
   */
  readonly powerOrder?: readonly string[];
  /** Extra steps when the activity starts, R30; absent is none. Version 2. */
  readonly start?: readonly RecipeActivityStep[];
  /** Extra steps when the activity ends, R30; absent is none. Version 2. */
  readonly end?: readonly RecipeActivityStep[];
  /** The activity's own sequences, R37, each named once within it. Version 2. */
  readonly sequences?: readonly RecipeSequence[];
  /**
   * **Switched off**, R92, decision 44: stated only as `false`, since an activity is on unless it says otherwise, and a
   * field stating what holds anyway is said by leaving it out. A person switches an activity off on purpose, to keep it
   * in the document without giving it to the remote: every build leaves it out, `takingPart`, before any family builds,
   * and says which it left out. Kept apart from everything else about the activity, so switching it on again gives back
   * the activity it was, under the same id. Version 2.
   */
  readonly enabled?: false;
  /**
   * **Needs attention**, R93, decision 44: why a change may have left the activity in a state the person does not want,
   * one reason or more, each as data an application words itself, `RecipeAttention`. **Stored, because it cannot be
   * worked out again**: once a device is removed, nothing left in the document says what the activity's keys did with
   * it. It changes no build: an activity needing attention is built and synced as it is, since it is never invalid. The
   * toolkit sets it when a device the activity used is removed, and an application clears it by one call. Version 2.
   */
  readonly attention?: readonly RecipeAttention[];
}

/**
 * One reason an activity needs attention, `RecipeActivity.attention`: what happened, the device it happened to by the
 * name it had, the keys it changed, and a sentence in English for a person. **What happened** is one of two:
 *
 * * `device-removed`: a device the activity used was removed from the document;
 * * `marked`: an application marked it for a reason of its own, whose sentence is `message` alone.
 *
 * **`keys` absent means the keys are not known**: where the model's maps are not built yet, or a device's commands
 * cannot be read, nothing says what the activity's keys did. **An empty list means none changed**: the activity used
 * the device and is marked all the same, since a removal of a device it used is worth a person's look.
 */
export interface RecipeAttention {
  readonly happened: 'device-removed' | 'marked';
  /**
   * The device, by the name it had when it was removed: one removed has no id left to name it by, and a device added
   * later under that name is another device, so a rename never follows into this field.
   */
  readonly device?: string;
  readonly keys?: readonly RecipeAttentionKey[];
  readonly message: string;
}

/**
 * One press of an activity's key whose answer the removal changed, every press of the activity and not only those that
 * sent the removed device's commands: what it did before, `was`, and what it does after, `now`, each nothing, a command
 * of a device by that device's name, or a sequence by its name. `was` records what was, a device that is gone among
 * it, and is never rewritten; `now` names what is, so a device named there that is renamed later is followed into it.
 */
export interface RecipeAttentionKey {
  readonly key: string;
  readonly press: RecipePress;
  readonly was: RecipeKeyAction;
  readonly now: RecipeKeyAction;
}

/**
 * **Why a build leaves an activity out**, decision 44, a closed list an application words itself:
 *
 * * `switched-off`: a person switched it off, R92, `RecipeActivity.enabled`;
 * * `no-device`: it uses no device, so there is nothing for it to switch on, put on an input or send a key to. **No
 *   device, no activity**: it is left out as a switched off one is, on every model, and never refused, since an
 *   activity is never invalid. Taken on 16 November 2026, decision 44.
 *
 * An activity both switched off and with no device is left out as `switched-off`, the person's own choice, which is
 * what switching it on again would answer first.
 */
export type LeftOutReason = 'switched-off' | 'no-device';

/** An activity a build left out, decision 44: its id where it has one, its name, and why, `LeftOutReason`. */
export interface LeftOutActivity {
  readonly id?: string;
  readonly name: string;
  readonly reason: LeftOutReason;
}

/**
 * **Why every build leaves this activity out**, or undefined where it takes part, decision 44: switched off first, then
 * no device. The one judgement of it, read by `takingPart` before any family builds and by the toolkit wherever it asks
 * which activities a remote is given, its limit on activities among them, so a build, a sync, the check and a change
 * always agree on which activities count.
 */
export function leftOutBecause(activity: RecipeActivity): LeftOutReason | undefined {
  if (activity.enabled === false) return 'switched-off';
  if (activity.devices.length === 0) return 'no-device';
  return undefined;
}

/**
 * **The document as every build reads it**, R92, decision 44: the activities that take no part taken out, and which
 * they were and why, `leftOutBecause`: those switched off and those that use no device. The one place either is
 * judged for a build, called before any family builds by `recipeToBuild`, so no family's build meets an activity left
 * out and each family's build reads both without knowing it. A family's own refusal of an activity with no device, the
 * Harmony Touch's and the Harmony 350's composers have one each, is therefore never met on this path. **What names an
 * activity goes with it**, which is only what the activity holds itself, its keys, screen, sequences and steps, and its
 * hold on the favourite channels: nothing else in a document names an activity, so a family places the favourites by
 * its own rule among the activities left, as it does for a document where none holds them. An activity switched on
 * again, or given a device again, is the same activity under the same id, since the document kept it whole; what a
 * family numbers by position, a compiled configuration's activities, follows the activities left, as it would had the
 * document never held the one left out.
 */
export function takingPart(recipe: Recipe): { readonly recipe: Recipe; readonly leftOut: readonly LeftOutActivity[] } {
  const leftOut = recipe.activities.flatMap((one): LeftOutActivity[] => {
    const reason = leftOutBecause(one);
    return reason === undefined ? [] : [{ ...(one.id === undefined ? {} : { id: one.id }), name: one.name, reason }];
  });
  if (leftOut.length === 0) return { recipe, leftOut };
  return { recipe: { ...recipe, activities: recipe.activities.filter((one) => leftOutBecause(one) === undefined) }, leftOut };
}

/**
 * **What a route to a build builds from**: a field of version 2 the build of `kind` does not read refused as not built,
 * `refuseUnbuiltFields`, then the activities that take no part left out, `takingPart`. Called first by every function that
 * builds from a recipe, so a route reached past `buildFromRecipe`, by this repository's scripts and tests, builds what
 * the one build builds; only the one build says which activities it left out, since what the others return has no
 * place to say it.
 */
export function recipeToBuild(recipe: Recipe, route: string, kind: BuildKind): Recipe {
  refuseUnbuiltFields(recipe, route, kind);
  return takingPart(recipe).recipe;
}

/**
 * One device's favourite channels, in the order of the remote's favourite keys: the device by its setup
 * name, and each channel as **text**, because Logitech's service holds a channel as text and a leading
 * zero is a channel of its own ("07" is not "7"), `reference/logitech/service.md`, "Button maps". A digit,
 * a dot or a dash only, the characters MyHarmony's favourites screen reads a channel number for.
 *
 * **Sent to Logitech's service and built by nothing yet**: `packages/remote/bin/build-setup.ts --stage
 * favourites` saves them on a test account's record, so a compile of theirs holds them, and the codec's
 * composers refuse a recipe that states any, since none of them writes a favourite channel.
 */
export interface RecipeFavourites {
  readonly device: string;
  readonly channels: readonly string[];
}

/** A recipe. The activities are in the order the activity menu lists them. */
export interface Recipe {
  /**
   * The version of the recipe's format, a whole number from 1; absent is 1. It moves when a field changes meaning,
   * so that a document saved by an older application is brought up on opening rather than misread.
   */
  readonly version?: number;
  readonly about?: string;
  readonly model: RecipeModel;
  readonly devices: readonly RecipeDevice[];
  readonly activities: readonly RecipeActivity[];
  /** Favourite channels, per device; absent is none. */
  readonly favourites?: readonly RecipeFavourites[];
  /**
   * The model's family's choices over its defaults, `FourSlotChoices` for a Harmony 600, 650 or 700. Read
   * by the family, which refuses one it does not make.
   */
  readonly choices?: Readonly<Record<string, unknown>>;
  /**
   * The protocol definitions the carried devices' commands are written in, as the archive's protocol files hold
   * them, plan 014; served before the archive's, by name.
   */
  readonly protocols?: readonly Readonly<Record<string, unknown>>[];
  /**
   * The remote's own settings a person chose, R47, by the names the model's family gives them, each a text, a number
   * or true or false; absent is the family's defaults. Which names there are is the family's to say. Version 2.
   */
  readonly settings?: Readonly<Record<string, RecipeSetting>>;
  /**
   * The highest number the toolkit has given an id of each kind, so that an id is never given twice: a device added
   * after one was removed takes a new number, and nothing keyed by the old id, a favourite on a Harmony Touch among
   * them, passes to it. Version 2. See `RecipeIds`.
   */
  readonly highestIds?: RecipeIds;
}

/** One setting's value, `Recipe.settings`. */
export type RecipeSetting = string | number | boolean;

/**
 * `Recipe.highestIds`: per kind, the highest number an id of that kind has carried, the toolkit's ids being a letter
 * and a number, `d3` a device's, `a2` an activity's, `s1` a sequence's. Three numbers is the smallest record that
 * keeps the ids apart without listing every id ever given; a kind absent is one that never had an id past what the
 * document holds now. No build reads it, nor needs to: it changes no byte a remote receives.
 */
export interface RecipeIds {
  readonly device?: number;
  readonly activity?: number;
  readonly sequence?: number;
}

/** The model a recipe names, its skin and its definition, and the family that builds for it. */
export interface RecipeTarget {
  readonly skin: number;
  readonly model: Model;
  readonly family: Family;
}

/**
 * The model a recipe names, its skin and its definition, and the family that builds for it, chosen by the registry,
 * `chooseByModel`, plan 013: by its skin where given and by its name otherwise. Refused, as a `RecipeError` with the
 * registry's message, where the table has no such model, where a name and a skin disagree, where a name is two skins'
 * and none is given, and where no family serves the model's architecture; and refused where the model's family is a
 * document family, the Harmony Touch's, which builds its documents from the recipe through its own members,
 * `HARMONY_TOUCH_FAMILY.readSetup` and `build`, rather than from a recipe target.
 */
export function recipeTarget(recipe: Recipe): RecipeTarget {
  let choice: ModelChoice;
  try {
    choice = chooseByModel(recipe.model);
  } catch (error) {
    if (error instanceof NoFamilyError) throw new RecipeError(error.message);
    throw error;
  }
  const { family, model, skin } = choice;
  if (family.kind === 'document') {
    throw new RecipeError(`the ${recipe.model.name} is given documents, which its family builds from the recipe through its own members and not from a recipe target`);
  }
  if (model === undefined) {
    // The Harmony 300 and 350: a compiled family serves them and builds from a setup with its own builder.
    throw new RecipeError(`the ${recipe.model.name} is built from a setup by its family's own builder, buildNoScreenSetup, and not from a recipe target`);
  }
  return { skin, model, family };
}

// ---------------------------------------------------------------------------------------------------
// Reading one
// ---------------------------------------------------------------------------------------------------

type Json = Record<string, unknown>;

function object(value: unknown, what: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new RecipeError(`${what} is not an object`);
  return value as Json;
}

function list(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) throw new RecipeError(`${what} is not a list`);
  return value;
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string' || value === '') throw new RecipeError(`${what} is not a name`);
  return value;
}

/** An object with exactly the fields given, the ones marked optional allowed to be absent. */
function fields(value: unknown, what: string, required: readonly string[], optional: readonly string[] = []): Json {
  const one = object(value, what);
  for (const key of Object.keys(one)) {
    if (!required.includes(key) && !optional.includes(key)) throw new RecipeError(`${what} has a field ${key} no recipe has`);
  }
  for (const key of required) if (!(key in one)) throw new RecipeError(`${what} has no ${key}`);
  return one;
}

/**
 * Refuse a field of version 2 in a document of an earlier version: the reader of version 1 refused every field it did
 * not know, so a document of version 1 that states one reads exactly as it did, refused, and the field's meaning is
 * never guessed at.
 */
function ofVersionTwo(version: number, what: string): void {
  if (version < 2) throw new RecipeError(`${what} is of version 2, and the recipe is of version ${version}`);
}

/**
 * The same for a form of version 2 inside a member of version 1, which must be one `VERSION_TWO` names: a form the
 * reader takes and the table does not would be one the guard of every build never sees, so it fails here, on its
 * first reading, rather than pass a build by.
 */
function formOfVersionTwo(version: number, owner: VersionTwoField['owner'], member: string, form: string, what: string): void {
  if (!VERSION_TWO.some((one) => one.owner === owner && one.member === member && one.form === form)) {
    throw new Error(`the reader takes the form ${form} of an ${owner}'s ${member}, which VERSION_TWO does not name`);
  }
  ofVersionTwo(version, what);
}

/**
 * A whole number from `least`, by default 0, and a safe one, so it survives a round trip through JSON as itself.
 * **No upper bound here**: how long a delay, how many copies or how long a pause a remote takes is the family's to
 * say when it builds one, since the limits differ per family and a reader knows no model's.
 */
function whole(value: unknown, what: string, least = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < least) throw new RecipeError(`${what} is not a whole number from ${least}`);
  return value as number;
}

/**
 * A name a person gave something that a record is keyed by, a command's or a setting's: text with something in it,
 * and never `__proto__`, which an object built by assignment would take as its prototype rather than as a member, so
 * the entry would vanish from the document and from every check of it.
 */
function keyName(name: string, what: string): string {
  if (name === '') throw new RecipeError(`${what} has an entry with no name`);
  if (name === '__proto__') throw new RecipeError(`${what} has an entry named __proto__, which no record of a recipe can hold`);
  return name;
}

/** A time in milliseconds: a number from 0, not necessarily whole, since a pace may fall between two. */
function milliseconds(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new RecipeError(`${what} is not a number of milliseconds from 0`);
  return value;
}

function truth(value: unknown, what: string): boolean {
  if (typeof value !== 'boolean') throw new RecipeError(`${what} is not true or false`);
  return value;
}

/** An activity's switch, `RecipeActivity.enabled`: false only, since true is what leaving the field out says. */
function switchedOff(value: unknown, what: string): false {
  if (value === true) throw new RecipeError(`${what} is true, which is said by leaving it out`);
  if (value !== false) throw new RecipeError(`${what} is not false`);
  return false;
}

/**
 * An object that states at least one member: a person's choice is a deviation from a default, so a field stated
 * with nothing in it says nothing and is refused rather than kept as a second way of saying "absent".
 */
function something(value: Json, what: string): Json {
  if (Object.keys(value).length === 0) throw new RecipeError(`${what} states nothing, which is said by leaving it out`);
  return value;
}

/** A list that holds at least one item, for the same reason as `something`. */
function some(value: unknown, what: string): unknown[] {
  const items = list(value, what);
  if (items.length === 0) throw new RecipeError(`${what} is empty, which is said by leaving it out`);
  return items;
}

/**
 * Steps in the catalogue's own form, `DriveStep`, as a device's power and channel tuning state them: a send of a
 * command by name, held for a time where given, a hold, a wait, or a state the device is now in. The form is ours,
 * as the catalogue's reader gives it, and not the archive's, which `driveSteps` in `catalogue/driving.ts` reads.
 */
function driveStepsOf(value: unknown, what: string): DriveStep[] {
  return list(value, what).map((one, k): DriveStep => {
    const at = `${what}'s step ${k + 1}`;
    const step = object(one, at);
    switch (step.kind) {
      case 'send': {
        const s = fields(step, at, ['kind', 'command'], ['holdMs']);
        return { kind: 'send', command: text(s.command, `${at}'s command`), ...(s.holdMs === undefined ? {} : { holdMs: whole(s.holdMs, `${at}'s holdMs`) }) };
      }
      case 'hold': {
        const s = fields(step, at, ['kind', 'command']);
        return { kind: 'hold', command: text(s.command, `${at}'s command`) };
      }
      case 'wait': {
        const s = fields(step, at, ['kind', 'ms']);
        return { kind: 'wait', ms: whole(s.ms, `${at}'s ms`) };
      }
      case 'state': {
        const s = fields(step, at, ['kind', 'state', 'value']);
        return { kind: 'state', state: text(s.state, `${at}'s state`), value: text(s.value, `${at}'s value`) };
      }
      default:
        throw new RecipeError(`${at} is of no kind a step has: send, hold, wait or state`);
    }
  });
}

/**
 * The members of `DeviceTiming`, which a person's timing may state. The type check below holds the list to the
 * catalogue's type, so a member added there is a member this reader takes, or the build of this file fails.
 */
const TIMING_MEMBERS = [
  'interKeyDelay', 'interDeviceDelay', 'holdInterDeviceDelay', 'powerOnDelay', 'inputDelay', 'connectedAppPowerOnDelay',
  'pressMinRepeats', 'minRepeats', 'isInterKeyDelayOptimized',
] as const satisfies readonly (keyof DeviceTiming)[];
const TIMING_COVERS_THE_CATALOGUE: [Exclude<keyof DeviceTiming, typeof TIMING_MEMBERS[number]>] extends [never] ? true : false = true;
void TIMING_COVERS_THE_CATALOGUE;

/** A person's timing, `RecipeDevice.timing`: the catalogue's members, delays in milliseconds and two repeat counts. */
function timingOf(value: unknown, what: string): Partial<DeviceTiming> {
  const t = something(fields(value, what, [], TIMING_MEMBERS), what);
  const out: Record<string, number | boolean> = {};
  for (const member of TIMING_MEMBERS) {
    if (t[member] === undefined) continue;
    out[member] = member === 'isInterKeyDelayOptimized' ? truth(t[member], `${what}'s ${member}`) : whole(t[member], `${what}'s ${member}`);
  }
  return out as Partial<DeviceTiming>;
}

/** The power types the catalogue states, `DevicePower.type`. */
const POWER_TYPES: readonly string[] = ['discrete', 'toggle', 'none', 'unknown'];

/**
 * A person's power, `RecipeDevice.power`: the catalogue's members, each a list of steps but the type, and always on.
 * **An empty list of steps is a choice and is kept**, unlike an empty member: each list stands over the catalogue's,
 * so `on: []` says the device is switched on by nothing at all, where leaving `on` out keeps the catalogue's steps.
 */
function powerOf(value: unknown, what: string): RecipeDevicePower {
  const p = something(fields(value, what, [], ['type', 'on', 'off', 'toggle', 'onReset', 'alwaysOn']), what);
  if (p.type !== undefined && !POWER_TYPES.includes(p.type as string)) throw new RecipeError(`${what}'s type is none of ${POWER_TYPES.join(', ')}`);
  const steps = (member: 'on' | 'off' | 'toggle' | 'onReset'): Partial<DevicePower> =>
    (p[member] === undefined ? {} : { [member]: driveStepsOf(p[member], `${what}'s ${member}`) });
  return {
    ...(p.type === undefined ? {} : { type: p.type as DevicePower['type'] }),
    ...steps('on'), ...steps('off'), ...steps('toggle'), ...steps('onReset'),
    ...(p.alwaysOn === undefined ? {} : { alwaysOn: truth(p.alwaysOn, `${what}'s alwaysOn`) }),
  };
}

/**
 * A person's channel tuning, `RecipeDevice.channelTuning`, in the catalogue's shape, read member by member: a member
 * left out is left out here, so a build keeps the catalogue's for it. An empty list of steps is kept for the reason
 * `powerOf` gives: `start: []` says nothing is sent before the digits, over the catalogue's steps.
 */
function channelTuningOf(value: unknown, what: string): DeviceChannelTuning {
  const c = something(fields(value, what, [], ['fixedDigits', 'start', 'finish', 'greaterTen', 'greaterHundred']), what);
  const steps = (member: 'start' | 'finish' | 'greaterTen' | 'greaterHundred'): Partial<DeviceChannelTuning> =>
    (c[member] === undefined ? {} : { [member]: driveStepsOf(c[member], `${what}'s ${member}`) });
  return {
    ...(c.fixedDigits === undefined ? {} : { fixedDigits: whole(c.fixedDigits, `${what}'s fixedDigits`, 1) }),
    ...steps('start'), ...steps('finish'), ...steps('greaterTen'), ...steps('greaterHundred'),
  };
}

/** A code of one command, `RecipeCommandCode`: a keycode in the catalogue's notation, or learned pulses. */
function commandCodeOf(value: unknown, what: string): RecipeCommandCode {
  const c = object(value, what);
  if ('learned' in c) {
    fields(c, what, ['learned']);
    const pulses = some(c.learned, `${what}'s pulses`).map((one, k): Pulse => {
      const at = `${what}'s pulse ${k + 1}`;
      const p = fields(one, at, ['mark', 'us']);
      return { mark: truth(p.mark, `${at}'s mark`), us: whole(p.us, `${at}'s us`, 1) };
    });
    return { learned: pulses };
  }
  fields(c, what, ['keycode']);
  return { keycode: text(c.keycode, `${what}'s keycode`) };
}

/** How one command is sent, `RecipeSending`. */
function sendingOf(value: unknown, what: string): RecipeSending {
  const s = something(fields(value, what, [], ['copies', 'heldPaceMs', 'leadInMs']), what);
  return {
    ...(s.copies === undefined ? {} : { copies: whole(s.copies, `${what}'s copies`, 1) }),
    ...(s.heldPaceMs === undefined ? {} : { heldPaceMs: milliseconds(s.heldPaceMs, `${what}'s heldPaceMs`) }),
    ...(s.leadInMs === undefined ? {} : { leadInMs: milliseconds(s.leadInMs, `${what}'s leadInMs`) }),
  };
}

/** A device's changed commands, `RecipeDevice.commands`, by command name; `what` names the device. */
function commandsOf(value: unknown, what: string): Record<string, RecipeCommand> {
  const all = something(object(value, `${what}'s commands`), `${what}'s commands`);
  const out: Record<string, RecipeCommand> = {};
  for (const [name, one] of Object.entries(all)) {
    const at = `${what}'s command ${keyName(name, `${what}'s commands`)}`;
    const c = something(fields(one, at, [], ['code', 'sending']), at);
    out[name] = {
      ...(c.code === undefined ? {} : { code: commandCodeOf(c.code, `${at}'s code`) }),
      ...(c.sending === undefined ? {} : { sending: sendingOf(c.sending, `${at}'s sending`) }),
    };
  }
  return out;
}

/**
 * A command entry of a screen list, `RecipeScreenCommand`. Its label is of version 2 on an activity's screen, a form
 * the caller gates; a device's screen is of version 2 whole.
 */
function screenCommand(one: Json, what: string): RecipeScreenCommand {
  fields(one, what, ['device', 'command'], ['label']);
  return {
    device: text(one.device, `${what}'s device`), command: text(one.command, `${what}'s command`),
    ...(one.label === undefined ? {} : { label: text(one.label, `${what}'s label`) }),
  };
}

/**
 * One item of an activity's screen, either form of a sequence: with its steps where it sits, of version 1, or by
 * the name of one of the activity's sequences, of version 2, which `sequences` must hold.
 */
function screenItem(value: unknown, what: string, version: number, sequences: ReadonlySet<string>): RecipeScreenItem {
  const one = object(value, what);
  if ('sequence' in one) {
    if (!('steps' in one)) {
      fields(one, what, ['sequence']);
      formOfVersionTwo(version, 'activity', 'screen', 'sequence', `${what}, a sequence by its name alone,`);
      const name = text(one.sequence, `${what}'s sequence`);
      if (!sequences.has(name)) throw new RecipeError(`${what} names the sequence ${name}, which is not one of the activity's`);
      return { sequence: name };
    }
    fields(one, what, ['sequence', 'steps']);
    const steps = list(one.steps, `${what}'s steps`).map((step, k): RecipeSequenceStep => {
      const at = `${what}'s step ${k + 1}`;
      const s = object(step, at);
      if ('pause' in s) {
        fields(s, at, ['pause']);
        if (!Number.isInteger(s.pause) || (s.pause as number) <= 0) throw new RecipeError(`${at} pauses for no whole number of tenths`);
        return { pause: s.pause as number };
      }
      fields(s, at, ['device', 'scan']);
      if (!Number.isInteger(s.scan) || (s.scan as number) < 0) throw new RecipeError(`${at} names no key`);
      return { device: text(s.device, `${at}'s device`), scan: s.scan as number };
    });
    if (steps.length === 0) throw new RecipeError(`${what} has no step`);
    return { sequence: text(one.sequence, `${what}'s name`), steps };
  }
  if (one.label !== undefined) formOfVersionTwo(version, 'activity', 'screen', 'label', `${what}'s label`);
  return screenCommand(one, what);
}

/** A step that sends a command or pauses, `RecipeCommandStep`; a pause in whole tenths of a second. */
function commandStep(s: Json, at: string): RecipeCommandStep {
  if ('pause' in s) {
    fields(s, at, ['pause']);
    if (!Number.isInteger(s.pause) || (s.pause as number) <= 0) throw new RecipeError(`${at} pauses for no whole number of tenths`);
    return { pause: s.pause as number };
  }
  fields(s, at, ['device', 'command']);
  return { device: text(s.device, `${at}'s device`), command: text(s.command, `${at}'s command`) };
}

/**
 * An activity's sequences, `RecipeSequence`: each named once within the activity, each with a step that sends
 * something, since a sequence of pauses alone sends nothing and a removal takes one away when it comes to that. Its
 * id, where given, is of the toolkit's form, `s` and a number, which `highestIds` counts: a sequence has no id written
 * by hand to keep, since version 1 had no sequence of its own.
 */
function sequencesOf(value: unknown, what: string): RecipeSequence[] {
  const out = some(value, `${what}'s sequences`).map((one, k): RecipeSequence => {
    const at = `${what}'s sequence ${k + 1}`;
    const s = fields(one, at, ['name', 'steps'], ['id']);
    const name = text(s.name, `${at}'s name`);
    const steps = some(s.steps, `${at}'s steps`).map((step, j) => commandStep(object(step, `${at}'s step ${j + 1}`), `${at}'s step ${j + 1}`));
    if (!steps.some((step) => 'device' in step)) throw new RecipeError(`${at} sends nothing: it has pauses alone`);
    const id = s.id === undefined ? undefined : text(s.id, `${at}'s id`);
    if (id !== undefined && !/^s[0-9]+$/.test(id)) throw new RecipeError(`${at}'s id ${id} is not of the toolkit's form, s and a number`);
    return { ...(id === undefined ? {} : { id }), name, steps };
  });
  const names = out.map((one) => one.name);
  if (new Set(names).size !== names.length) throw new RecipeError(`${what} names one sequence twice`);
  return out;
}

/** An activity's extra steps at its start or end, `RecipeActivityStep`; a sequence one of `sequences`. */
function activityStepsOf(value: unknown, what: string, sequences: ReadonlySet<string>): RecipeActivityStep[] {
  return some(value, what).map((one, k): RecipeActivityStep => {
    const at = `${what} step ${k + 1}`;
    const s = object(one, at);
    if ('sequence' in s) {
      fields(s, at, ['sequence']);
      const name = text(s.sequence, `${at}'s sequence`);
      if (!sequences.has(name)) throw new RecipeError(`${at} runs the sequence ${name}, which is not one of the activity's`);
      return { sequence: name };
    }
    if ('channel' in s) {
      // Digits as text and nothing else: a number would drop a leading zero, and a dot or a dash, which a favourite
      // channel may hold, is not something a channel step was measured carrying.
      fields(s, at, ['device', 'channel']);
      if (typeof s.channel !== 'string' || !/^[0-9]+$/.test(s.channel)) throw new RecipeError(`${at} tunes no channel of digits written as text`);
      return { device: text(s.device, `${at}'s device`), channel: s.channel };
    }
    return commandStep(s, at);
  });
}

/**
 * The keys a person chose otherwise, `RecipeKey`: each key named by a word, each key and press once, each action one
 * of the three. Whether the model has a key of that name is not this reader's to say, since the reader knows no
 * model's keys: the build asks the model's family and refuses a word it does not take, and the toolkit's check lists
 * it, `unknown-key`. A double press is of version 2.
 */
function keysOf(value: unknown, what: string, version: number, owner: 'device' | 'activity'): RecipeKey[] {
  const keys = list(value, `${what}'s keys`).map((one, k): RecipeKey => {
    const at = `${what}'s key ${k + 1}`;
    const key = fields(one, at, ['key', 'action'], ['press']);
    // A word and never a number: a number is a scan code, which is one family's and means another key on another
    // model, so a document naming one would point at the wrong key once moved. Refused by the field's own reading.
    if (typeof key.key !== 'string' || key.key === '') throw new RecipeError(`${at} names no key by its name`);
    if (key.press !== undefined && key.press !== 'short' && key.press !== 'held' && key.press !== 'double') {
      throw new RecipeError(`${at} is pressed neither short, held nor double`);
    }
    if (key.press === 'double') formOfVersionTwo(version, owner, 'keys', 'double', `${at}'s double press`);
    return { key: key.key, ...(key.press === undefined ? {} : { press: key.press as RecipePress }), action: keyActionOf(key.action, `${at}'s action`) };
  });
  // One key and press states one thing: stated twice, which of the two a builder took would be its own order.
  const places = keys.map((one) => `${one.key}/${one.press ?? 'short'}`);
  if (new Set(places).size !== places.length) throw new RecipeError(`${what} states one key twice`);
  return keys;
}

/**
 * What a key does, `RecipeKeyAction`: nothing, only as true; a sequence by its name; or a device's command by the two
 * names. The one reading of an action, which a key's choice and a key an attention mark records both take.
 */
function keyActionOf(value: unknown, what: string): RecipeKeyAction {
  const a = object(value, what);
  if ('nothing' in a) {
    fields(a, what, ['nothing']);
    if (a.nothing !== true) throw new RecipeError(`${what} is nothing only as true`);
    return { nothing: true };
  }
  if ('sequence' in a) {
    fields(a, what, ['sequence']);
    return { sequence: text(a.sequence, `${what}'s sequence`) };
  }
  fields(a, what, ['device', 'command']);
  return { device: text(a.device, `${what}'s device`), command: text(a.command, `${what}'s command`) };
}

/** What can have happened to an activity that needs attention, `RecipeAttention.happened`. */
const ATTENTION_HAPPENINGS: readonly RecipeAttention['happened'][] = ['device-removed', 'marked'];

/**
 * An activity's attention mark, `RecipeActivity.attention`: one reason or more, each with what happened, the device for
 * a removal and for no other, the keys where they are known, an empty list where none changed, and a sentence for a
 * person. **Keys are a record and not a
 * choice**: whether a key or a device named in them is one the model or the document still has is not judged, since a
 * later change can take either away and the record stays what happened.
 */
function attentionOf(value: unknown, what: string): RecipeAttention[] {
  return some(value, what).map((one, k): RecipeAttention => {
    const at = `${what} ${k + 1}`;
    const r = fields(one, at, ['happened', 'message'], ['device', 'keys']);
    if (!(ATTENTION_HAPPENINGS as readonly unknown[]).includes(r.happened)) {
      throw new RecipeError(`${at} says ${String(r.happened)} happened, which is none of ${ATTENTION_HAPPENINGS.join(', ')}`);
    }
    const happened = r.happened as RecipeAttention['happened'];
    if ((happened === 'marked') !== (r.device === undefined)) {
      throw new RecipeError(happened === 'marked' ? `${at} names a device, and a mark set by hand names none` : `${at} names no device, and ${happened} happens to one`);
    }
    if (happened === 'marked' && r.keys !== undefined) throw new RecipeError(`${at} names keys, and a mark set by hand names none`);
    // An empty list says the keys are known and none changed, which is not what leaving the field out says.
    const keys = r.keys === undefined ? undefined : list(r.keys, `${at}'s keys`).map((key, j): RecipeAttentionKey => {
      const where = `${at}'s key ${j + 1}`;
      const f = fields(key, where, ['key', 'press', 'was', 'now']);
      if (f.press !== 'short' && f.press !== 'held' && f.press !== 'double') throw new RecipeError(`${where} is pressed neither short, held nor double`);
      return { key: text(f.key, `${where}'s key`), press: f.press, was: keyActionOf(f.was, `${where}'s action before`), now: keyActionOf(f.now, `${where}'s action now`) };
    });
    return {
      happened,
      ...(r.device === undefined ? {} : { device: text(r.device, `${at}'s device`) }),
      ...(keys === undefined ? {} : { keys }),
      message: text(r.message, `${at}'s message`),
    };
  });
}

/** A carried definition: a record naming its codeset, and commands each a name and a keycode. */
function definitionOf(value: unknown, what: string): RecipeDefinition {
  const d = fields(value, what, ['record', 'commands']);
  const record = object(d.record, `${what}'s record`);
  text(record.codeset, `${what}'s record's codeset`);
  const commands = list(d.commands, `${what}'s commands`).map((one, k) => {
    const c = fields(one, `${what}'s command ${k + 1}`, ['name', 'keycode']);
    return { name: text(c.name, `${what}'s command ${k + 1}'s name`), keycode: text(c.keycode, `${what}'s command ${k + 1}'s keycode`) };
  });
  return { record, commands };
}

/** The remote's settings, `Recipe.settings`: a name each, and a text, a number or true or false. */
function settingsOf(value: unknown): Record<string, RecipeSetting> {
  const all = something(object(value, 'the settings'), 'the settings');
  const out: Record<string, RecipeSetting> = {};
  for (const [name, one] of Object.entries(all)) {
    keyName(name, 'the settings');
    if (typeof one !== 'string' && typeof one !== 'boolean' && !(typeof one === 'number' && Number.isFinite(one))) {
      throw new RecipeError(`the setting ${name} is neither a text, a number nor true or false`);
    }
    out[name] = one;
  }
  return out;
}

/** The highest ids given, `Recipe.highestIds`, each a safe whole number from 0. */
function highestIdsOf(value: unknown): RecipeIds {
  const ids = something(fields(value, 'the highest ids', [], ['device', 'activity', 'sequence']), 'the highest ids');
  const one = (kind: 'device' | 'activity' | 'sequence'): RecipeIds => (ids[kind] === undefined ? {} : { [kind]: whole(ids[kind], `the highest ${kind} id`) });
  return { ...one('device'), ...one('activity'), ...one('sequence') };
}

/**
 * **Refuses a Harmony Touch's own block, `touch`**, the earlier form of a Touch's document, decision 43, which no build
 * reads, naming the converter that writes it in the shape every model shares. The reader calls it on what it is given,
 * and the Touch's build calls it again on the document it is handed, since a document that reached the build without
 * the reader, built in code or cast, would otherwise have its block passed over without a word.
 */
export function refuseEarlierTouchBlock(json: unknown): void {
  if (typeof json === 'object' && json !== null && (json as { touch?: unknown }).touch !== undefined) {
    throw new RecipeError(`the recipe carries a Harmony Touch's own block, touch, the earlier form no build reads; ${TOUCH_CONVERTER} writes it in the shape every model shares`);
  }
}

/**
 * A recipe out of parsed JSON, its shape checked: every field one a recipe has, every name a name, every
 * role one of the contract's, and a field of version 2 only in a document of version 2. Refused with the first thing
 * wrong, by where it is.
 */
export function readRecipe(json: unknown): Recipe {
  // Said by name, with the converter, rather than as a field no recipe has.
  refuseEarlierTouchBlock(json);
  // The members of version 1 here, and those of version 2 from the one table the guard of every build walks.
  const top = fields(json, 'the recipe', ['model', 'devices', 'activities'],
    ['version', 'about', 'choices', 'favourites', 'protocols', ...versionTwoMembers('document')]);
  if (top.version !== undefined && (!Number.isInteger(top.version) || (top.version as number) < 1)) {
    throw new RecipeError('the recipe\'s version is not a whole number from 1');
  }
  if (top.version !== undefined && (top.version as number) > RECIPE_VERSION) {
    throw new RecipeError(`the recipe is of version ${String(top.version)}, and this reads up to ${RECIPE_VERSION}`);
  }
  // Absent is 1, as it was before there was a version to state.
  const version = (top.version as number | undefined) ?? 1;
  gateVersionTwo('document', top, version, 'the recipe\'s');
  const m = fields(top.model, 'the model', ['name'], ['skin']);
  if (m.skin !== undefined && !Number.isInteger(m.skin)) throw new RecipeError('the model\'s skin is not a number');
  const model: RecipeModel = { name: text(m.name, 'the model\'s name'), ...(m.skin === undefined ? {} : { skin: m.skin as number }) };
  const devices = list(top.devices, 'the devices').map((value, k): RecipeDevice => {
    const what = `device ${k + 1}`;
    const d = fields(value, what, ['name', 'device'],
      ['id', 'poweredOnBetweenActivities', 'key', 'keys', 'definition', ...versionTwoMembers('device')]);
    if (d.poweredOnBetweenActivities !== undefined && typeof d.poweredOnBetweenActivities !== 'boolean') {
      throw new RecipeError(`${what}'s poweredOnBetweenActivities is not true or false`);
    }
    gateVersionTwo('device', d, version, `${what}'s`);
    let key: RecipeDeviceKey | undefined;
    if (d.key !== undefined) {
      const k = fields(d.key, `${what}'s key`, ['place'], ['press']);
      if (!Number.isInteger(k.place) || (k.place as number) < 0) throw new RecipeError(`${what}'s key is at no place`);
      if (k.press !== undefined && k.press !== 'short' && k.press !== 'long') throw new RecipeError(`${what}'s key is pressed neither short nor long`);
      key = { place: k.place as number, ...(k.press === undefined ? {} : { press: k.press as 'short' | 'long' }) };
    }
    return {
      ...(d.id === undefined ? {} : { id: text(d.id, `${what}'s id`) }),
      name: text(d.name, `${what}'s name`), device: text(d.device, `${what}'s catalogue entry`),
      ...(d.poweredOnBetweenActivities === undefined ? {} : { poweredOnBetweenActivities: d.poweredOnBetweenActivities as boolean }),
      ...(key === undefined ? {} : { key }),
      ...(d.keys === undefined ? {} : { keys: keysOf(d.keys, what, version, 'device') }),
      ...(d.definition === undefined ? {} : { definition: definitionOf(d.definition, `${what}'s definition`) }),
      ...(d.timing === undefined ? {} : { timing: timingOf(d.timing, `${what}'s timing`) }),
      ...(d.power === undefined ? {} : { power: powerOf(d.power, `${what}'s power`) }),
      ...(d.channelTuning === undefined ? {} : { channelTuning: channelTuningOf(d.channelTuning, `${what}'s channel tuning`) }),
      // A screen list stated whole may be empty: a device whose screen shows nothing is a choice.
      ...(d.screen === undefined ? {} : {
        screen: list(d.screen, `${what}'s screen`).map((item, j) => screenCommand(object(item, `${what}'s screen item ${j + 1}`), `${what}'s screen item ${j + 1}`)),
      }),
      ...(d.commands === undefined ? {} : { commands: commandsOf(d.commands, what) }),
    };
  });
  const activities = list(top.activities, 'the activities').map((value, k): RecipeActivity => {
    const a = fields(value, `activity ${k + 1}`, ['name', 'type', 'devices'],
      ['id', 'screen', 'keys', ...versionTwoMembers('activity')]);
    const what = `activity ${text(a.name, `activity ${k + 1}'s name`)}`;
    gateVersionTwo('activity', a, version, `${what}'s`);
    const used = list(a.devices, `${what}'s devices`).map((one, j): RecipeActivityDevice => {
      const at = `${what}'s device ${j + 1}`;
      const u = fields(one, at, ['device', 'roles'], ['input']);
      const roles = list(u.roles, `${at}'s roles`).map((role) => {
        if (!(ACTIVITY_ROLE_NAMES as readonly unknown[]).includes(role)) throw new RecipeError(`${at} has a role ${String(role)} no activity has`);
        return role as ActivityRoleName;
      });
      return { device: text(u.device, `${at}'s name`), ...(u.input === undefined ? {} : { input: text(u.input, `${at}'s input`) }), roles };
    });
    // The sequences first, since the screen and the extra steps name them.
    const sequences = a.sequences === undefined ? undefined : sequencesOf(a.sequences, what);
    const sequenceNames = new Set((sequences ?? []).map((one) => one.name));
    const screen = a.screen === undefined ? undefined
      : list(a.screen, `${what}'s screen`).map((item, j) => screenItem(item, `${what}'s screen item ${j + 1}`, version, sequenceNames));
    // A sequence written out on the screen, version 1's form, is named as well, and one name is one sequence: the
    // same name for that and for one of `sequences` would leave which a key or a step runs to a builder's order.
    const written = (screen ?? []).flatMap((item) => ('sequence' in item && item.steps !== undefined ? [item.sequence] : []));
    for (const name of written) {
      if (sequenceNames.has(name)) throw new RecipeError(`${what} names two sequences ${name}, one on its screen with its steps and one of its sequences`);
    }
    const devicesUsed = new Set(used.map((one) => one.device));
    // The steps of a sequence and those at the start or the end send to the activity's own devices: a device the
    // activity does not switch on would be sent to while it may be off. All of these are of version 2, so no
    // document of version 1 meets this.
    const steps = [
      ...(sequences ?? []).flatMap((one) => one.steps.map((step, j) => ({ step, at: `${what}'s sequence ${one.name}'s step ${j + 1}` }))),
      ...(['start', 'end'] as const).flatMap((when) => (a[when] === undefined ? [] : some(a[when], `${what}'s ${when}`)
        .map((step, j) => ({ step: step as RecipeActivityStep, at: `${what}'s ${when} step ${j + 1}` })))),
    ];
    for (const { step, at } of steps) {
      if (step !== null && typeof step === 'object' && 'device' in step && typeof step.device === 'string' && !devicesUsed.has(step.device)) {
        throw new RecipeError(`${at} sends to ${step.device}, which is not one of the activity's devices`);
      }
    }
    const keys = a.keys === undefined ? undefined : keysOf(a.keys, what, version, 'activity');
    if (version >= 2) {
      // A key that runs a sequence runs one of this activity's, by its name, either form. Checked from version 2
      // only, where an activity's sequences are named things; what version 1 allowed it still does.
      const runnable = new Set([...sequenceNames, ...written]);
      for (const key of keys ?? []) {
        if ('sequence' in key.action && !runnable.has(key.action.sequence)) {
          throw new RecipeError(`${what}'s ${key.key} key runs the sequence ${key.action.sequence}, which is not one of the activity's`);
        }
      }
    }
    let powerOrder: string[] | undefined;
    if (a.powerOrder !== undefined) {
      powerOrder = list(a.powerOrder, `${what}'s power order`).map((one, j) => text(one, `${what}'s power order ${j + 1}`));
      // Every device of the activity once: an order that leaves one out says nothing of when it is switched on.
      const listed = [...powerOrder].sort();
      const wanted = used.map((one) => one.device).sort();
      if (JSON.stringify(listed) !== JSON.stringify(wanted)) throw new RecipeError(`${what}'s power order does not name each of its devices once`);
    }
    return {
      ...(a.id === undefined ? {} : { id: text(a.id, `${what}'s id`) }),
      name: a.name as string, type: text(a.type, `${what}'s type`), devices: used, ...(screen === undefined ? {} : { screen }),
      ...(keys === undefined ? {} : { keys }),
      ...(a.opensOn === undefined ? {} : { opensOn: text(a.opensOn, `${what}'s opensOn`) }),
      ...(a.favourites === undefined ? {} : { favourites: truth(a.favourites, `${what}'s favourites`) }),
      ...(powerOrder === undefined ? {} : { powerOrder }),
      ...(a.start === undefined ? {} : { start: activityStepsOf(a.start, `${what}'s start`, sequenceNames) }),
      ...(a.end === undefined ? {} : { end: activityStepsOf(a.end, `${what}'s end`, sequenceNames) }),
      ...(sequences === undefined ? {} : { sequences }),
      // Switched off is said only as false: on is what an activity is when the field is left out.
      ...(a.enabled === undefined ? {} : { enabled: switchedOff(a.enabled, `${what}'s enabled`) }),
      ...(a.attention === undefined ? {} : { attention: attentionOf(a.attention, `${what}'s attention`) }),
    };
  });
  // The favourite channels belong to one activity: two holding them would leave which one the remote shows to a
  // builder's own order.
  if (activities.filter((one) => one.favourites === true).length > 1) throw new RecipeError('two activities hold the favourites');
  const favourites = top.favourites === undefined ? undefined
    : list(top.favourites, 'the favourites').map((value, k): RecipeFavourites => {
      const what = `favourites ${k + 1}`;
      const f = fields(value, what, ['device', 'channels']);
      const device = text(f.device, `${what}'s device`);
      if (!devices.some((one) => one.name === device)) throw new RecipeError(`${what} names ${device}, which is no device of the recipe`);
      const channels = list(f.channels, `${what}'s channels`).map((channel, j) => {
        // Text and never a number: a number would drop a leading zero, which is a channel of its own.
        if (typeof channel !== 'string' || !/^[0-9]+([.-][0-9]+)?$/.test(channel)) {
          throw new RecipeError(`${what}'s channel ${j + 1} is not a channel number written as text`);
        }
        return channel;
      });
      if (channels.length === 0) throw new RecipeError(`${what} has no channel`);
      return { device, channels };
    });
  if (favourites !== undefined && new Set(favourites.map((one) => one.device)).size !== favourites.length) {
    throw new RecipeError('the favourites name one device twice');
  }
  // An id names one thing: two devices, two activities or two sequences under one id would make every address
  // ambiguous. A sequence's id is the document's, not its activity's, as the toolkit addresses it.
  const sequenceIds = activities.flatMap((one) => (one.sequences ?? []).map((s) => s.id));
  for (const [what, ids] of [['devices', devices.map((one) => one.id)], ['activities', activities.map((one) => one.id)], ['sequences', sequenceIds]] as const) {
    const given = ids.filter((id) => id !== undefined);
    if (new Set(given).size !== given.length) throw new RecipeError(`two of the ${what} have one id`);
  }
  // Every device a screen names is one of the document's: a device's own screen sends to any device, as device mode
  // does, and an activity's screen of version 2 is held to the same. Version 1 is left as it was.
  const deviceNames = new Set(devices.map((one) => one.name));
  const screens = [
    ...devices.flatMap((one) => (one.screen ?? []).map((item, j) => ({ item: item as RecipeScreenItem, at: `device ${one.name}'s screen item ${j + 1}` }))),
    ...(version >= 2 ? activities.flatMap((one) => (one.screen ?? []).map((item, j) => ({ item, at: `activity ${one.name}'s screen item ${j + 1}` }))) : []),
  ];
  for (const { item, at } of screens) {
    if ('device' in item && !deviceNames.has(item.device)) throw new RecipeError(`${at} names ${item.device}, which is no device of the recipe`);
  }
  // A device has no sequences of its own, so in a document of version 2, where sequences are named things, a device's
  // key running one names nothing.
  if (version >= 2) {
    for (const device of devices) {
      for (const key of device.keys ?? []) {
        if ('sequence' in key.action) throw new RecipeError(`device ${device.name}'s ${key.key} key runs the sequence ${key.action.sequence}, and a device has no sequences`);
      }
    }
  }
  const highestIds = top.highestIds === undefined ? undefined : highestIdsOf(top.highestIds);
  if (highestIds !== undefined) {
    // An id past the highest the document says was given contradicts it, and the next id given could be one in use.
    for (const [kind, letter, ids] of [['device', 'd', devices.map((one) => one.id)], ['activity', 'a', activities.map((one) => one.id)], ['sequence', 's', sequenceIds]] as const) {
      const highest = highestIds[kind];
      if (highest === undefined) continue;
      for (const id of ids) {
        const match = id === undefined ? null : new RegExp(`^${letter}([0-9]+)$`).exec(id);
        if (match !== null && Number(match[1]) > highest) {
          throw new RecipeError(`the ${kind} ${id} has a number past ${highest}, the highest ${kind} id the document says was given`);
        }
      }
    }
  }
  return {
    ...(top.version === undefined ? {} : { version: top.version as number }),
    ...(top.about === undefined ? {} : { about: text(top.about, 'the recipe\'s about') }),
    model, devices, activities,
    ...(top.choices === undefined ? {} : { choices: object(top.choices, 'the choices') }),
    ...(favourites === undefined ? {} : { favourites }),
    ...(top.protocols === undefined ? {} : {
      protocols: list(top.protocols, 'the protocols').map((one, k) => {
        const p = object(one, `protocol ${k + 1}`);
        text(p.name, `protocol ${k + 1}'s name`);
        return p;
      }),
    }),
    ...(top.settings === undefined ? {} : { settings: settingsOf(top.settings) }),
    ...(highestIds === undefined ? {} : { highestIds }),
  };
}
