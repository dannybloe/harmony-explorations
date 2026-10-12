/**
 * The recipe: everything a configuration of ours depends on, as data, plan 007 and `todo-compile-650.md`
 * 10.7.4. The setup files in `packages/corpus/setups/` are recipes, and `docs/recipe.md` is the format's
 * preliminary definition, field by field against FreeHarmony's data model.
 *
 * **What it holds**: the model it is for, the devices by their catalogue entries, the activities with
 * each device's input and jobs and the working screen's items, and the choices of the model's family
 * over that family's defaults. **What it never holds is what the model can do**: how many devices it
 * takes, its screen, which family builds for it. Those come from the model's definition,
 * `packages/usb/src/models.ts`, documented in `reference/remotes/`, so a recipe states a wish and the
 * model's definition says whether it can be granted.
 *
 * The model is named the way FreeHarmony names one, `RemoteModel`: Logitech's name, "Harmony 650", and
 * the skin where it is known. The skin is what tells a region's twin apart, the 650 from the 650 EMEA,
 * so a name two skins share is refused without one.
 *
 * This module reads a recipe and checks its shape; whether the devices are in the catalogue, the inputs
 * named the way the catalogue names them and the choices ones the family makes is for the steps that use
 * them, which already refuse each.
 */
import { MODELS_BY_SKIN, type Model } from '@harmony/usb/models';
import { ACTIVITY_ROLE_NAMES, type ActivityRoleName } from '../activityroles.ts';
import type { Family } from '../families/family.ts';
import { familyOfArchitecture } from '../families/registry.ts';

/** A recipe that cannot be read, or names a model nothing here can build for. */
export class RecipeError extends Error {}

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
  readonly name: string;
  readonly device: string;
  readonly poweredOnBetweenActivities?: boolean;
}

/** One device's part in an activity: the input it is switched to, by the catalogue's name, and its jobs. */
export interface RecipeActivityDevice {
  readonly device: string;
  readonly input?: string;
  readonly roles: readonly ActivityRoleName[];
}

/**
 * One item of an activity's working screen, section 323: a device's command by the label that device's
 * own screen draws it under, or a sequence, Logitech's "sequence" of MyHarmony, by its name and its
 * steps. A step sends the command a device's key sends, by the key's scan code, `keys.md`, or pauses, in
 * tenths of a second.
 */
export type RecipeScreenItem =
  | { readonly device: string; readonly command: string }
  | { readonly sequence: string; readonly steps: readonly RecipeSequenceStep[] };
export type RecipeSequenceStep = { readonly device: string; readonly scan: number } | { readonly pause: number };

/**
 * One activity: its name, MyHarmony's type, its devices, and its working screen's items in order, which
 * a person chooses and the compile does not derive, section 323. Absent or empty is a screen with no item.
 */
export interface RecipeActivity {
  readonly name: string;
  readonly type: string;
  readonly devices: readonly RecipeActivityDevice[];
  readonly screen?: readonly RecipeScreenItem[];
}

/** A recipe. The activities are in the order the activity menu lists them. */
export interface Recipe {
  readonly about?: string;
  readonly model: RecipeModel;
  readonly devices: readonly RecipeDevice[];
  readonly activities: readonly RecipeActivity[];
  /**
   * The model's family's choices over its defaults, `FourSlotChoices` for a Harmony 600, 650 or 700. Read
   * by the family, which refuses one it does not make.
   */
  readonly choices?: Readonly<Record<string, unknown>>;
}

/** The model a recipe names, its skin and its definition, and the family that builds for it. */
export interface RecipeTarget {
  readonly skin: number;
  readonly model: Model;
  readonly family: Family;
}

/** Logitech's name for a model record: "Harmony 650" for the record called "650". */
export function modelName(model: Model): string {
  return `Harmony ${model.name}`;
}

/**
 * The model a recipe names, by its skin where given and by its name otherwise, with the family that builds
 * for it. Refused where the table has no such model, where a name and a skin disagree, where a name is two
 * skins' and none is given, and where no family serves the model's architecture.
 */
export function recipeTarget(recipe: Recipe): RecipeTarget {
  const { name, skin } = recipe.model;
  const named = Object.entries(MODELS_BY_SKIN).filter(([, model]) => modelName(model) === name);
  let chosen: [number, Model];
  if (skin !== undefined) {
    const model = MODELS_BY_SKIN[skin];
    if (model === undefined) throw new RecipeError(`no model has skin ${skin}`);
    if (modelName(model) !== name) throw new RecipeError(`skin ${skin} is the ${modelName(model)}, not the ${name}`);
    chosen = [skin, model];
  } else {
    if (named.length === 0) throw new RecipeError(`no model is called ${name}`);
    if (named.length > 1) {
      throw new RecipeError(`${name} is skins ${named.map(([one]) => one).join(' and ')}: name the skin`);
    }
    const [only] = named as [[string, Model]];
    chosen = [Number(only[0]), only[1]];
  }
  const family = familyOfArchitecture(chosen[1].architecture);
  if (family === undefined) throw new RecipeError(`nothing here builds a configuration for the ${name}`);
  return { skin: chosen[0], model: chosen[1], family };
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

function screenItem(value: unknown, what: string): RecipeScreenItem {
  const one = object(value, what);
  if ('sequence' in one) {
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
  fields(one, what, ['device', 'command']);
  return { device: text(one.device, `${what}'s device`), command: text(one.command, `${what}'s command`) };
}

/**
 * A recipe out of parsed JSON, its shape checked: every field one a recipe has, every name a name, every
 * role one of the contract's. Refused with the first thing wrong, by where it is.
 */
export function readRecipe(json: unknown): Recipe {
  const top = fields(json, 'the recipe', ['model', 'devices', 'activities'], ['about', 'choices']);
  const m = fields(top.model, 'the model', ['name'], ['skin']);
  if (m.skin !== undefined && !Number.isInteger(m.skin)) throw new RecipeError('the model\'s skin is not a number');
  const model: RecipeModel = { name: text(m.name, 'the model\'s name'), ...(m.skin === undefined ? {} : { skin: m.skin as number }) };
  const devices = list(top.devices, 'the devices').map((value, k): RecipeDevice => {
    const what = `device ${k + 1}`;
    const d = fields(value, what, ['name', 'device'], ['poweredOnBetweenActivities']);
    if (d.poweredOnBetweenActivities !== undefined && typeof d.poweredOnBetweenActivities !== 'boolean') {
      throw new RecipeError(`${what}'s poweredOnBetweenActivities is not true or false`);
    }
    return {
      name: text(d.name, `${what}'s name`), device: text(d.device, `${what}'s catalogue entry`),
      ...(d.poweredOnBetweenActivities === undefined ? {} : { poweredOnBetweenActivities: d.poweredOnBetweenActivities as boolean }),
    };
  });
  const activities = list(top.activities, 'the activities').map((value, k): RecipeActivity => {
    const a = fields(value, `activity ${k + 1}`, ['name', 'type', 'devices'], ['screen']);
    const what = `activity ${text(a.name, `activity ${k + 1}'s name`)}`;
    const used = list(a.devices, `${what}'s devices`).map((one, j): RecipeActivityDevice => {
      const at = `${what}'s device ${j + 1}`;
      const u = fields(one, at, ['device', 'roles'], ['input']);
      const roles = list(u.roles, `${at}'s roles`).map((role) => {
        if (!(ACTIVITY_ROLE_NAMES as readonly unknown[]).includes(role)) throw new RecipeError(`${at} has a role ${String(role)} no activity has`);
        return role as ActivityRoleName;
      });
      return { device: text(u.device, `${at}'s name`), ...(u.input === undefined ? {} : { input: text(u.input, `${at}'s input`) }), roles };
    });
    const screen = a.screen === undefined ? undefined
      : list(a.screen, `${what}'s screen`).map((item, j) => screenItem(item, `${what}'s screen item ${j + 1}`));
    return { name: a.name as string, type: text(a.type, `${what}'s type`), devices: used, ...(screen === undefined ? {} : { screen }) };
  });
  return {
    ...(top.about === undefined ? {} : { about: text(top.about, 'the recipe\'s about') }),
    model, devices, activities,
    ...(top.choices === undefined ? {} : { choices: object(top.choices, 'the choices') }),
  };
}
