/**
 * What a bench model is and how far the FHSDK serves it, in one answer: the model's properties, as the model table
 * and the model's family state them, and the status of every requirement with its evidence, decision 33.
 *
 * **One call for an application.** `capabilitiesOf` takes the model's key, `harmony-650`, or a skin a connected
 * remote reported, and answers with everything an interface needs to decide what to offer: a feature is offered
 * where its requirement is met on that model; the other statuses, open, impossible and unknown, are for a developer,
 * each with the sentence that says why. The requirements and their statuses are data in the base,
 * `@harmony/base/requirements`, which has no import at all; this module joins them to what only the codec knows, the
 * family that builds for the model and the screen it draws on, so it sits beside the registry it asks.
 *
 * **A property the libraries do not hold is left out, never guessed.** Each comes from one of three places, said on
 * its field: the model table, `packages/base/src/models.ts`, whose capability fields are a community table's and
 * unconfirmed, the same standing they have there; the model's family, a constant the family builds with; or, for a
 * model the table deliberately holds no record of, a reference page that states the value, named in `references`.
 * The table keeps the Harmony 300, 350 and Touch out because nothing has read their capability fields out of their
 * firmware, `reference/remotes/harmony-300/features.md`, so their device limits are not answered here even though
 * Logitech's service and manuals state some: those are choices of Logitech's software, not limits of the remote.
 *
 * Loads anywhere, like the rest of the main entry: nothing here imports a Node module.
 */
import {
  benchModel, REQUIREMENTS, requirementState,
  type BenchModel, type BenchModelKey, type Requirement, type RequirementState,
} from '@harmony/base/requirements';
import { hasLongPress, modelForSkin, type Panel } from '@harmony/base/models';
import { SCREEN_SIZES } from '../screens/render.ts';
import { FOUR_SLOT } from './harmony-600-650-700/index.ts';
import { ACTIVITY_KEYS } from './harmony-600-650-700/activitykeys.ts';
import { NO_SCREEN_FAMILY } from './harmony-300-350/index.ts';
import { HARMONY_TOUCH_FAMILY } from './harmony-touch/family.ts';
import { FAVOURITES_LIMIT } from './harmony-touch/favourites.ts';
import { chooseByModel, familyKind, NoFamilyError, type AnyFamily } from './registry.ts';

// The requirement types an application meets in an answer, so it needs no second import to name them.
export type { BenchModelKey, Proof, Requirement, RequirementState, RequirementStatus } from '@harmony/base/requirements';

/** What a model is, as far as the libraries hold it. A field left out is a value nothing here states. */
export interface ModelProperties {
  /** The configuration architecture the model table gives the model, `reference/architectures/README.md`. */
  readonly architecture?: number;
  /**
   * The family that builds for the model, as the registry chooses it, by the name it gives itself and its kind: a
   * compiled family builds the one container the remote is written with, a document family the documents it
   * assembles one from. Left out for a model no family serves, the Harmony 525.
   */
  readonly family?: { readonly name: string; readonly kind: 'compiled' | 'document' };
  /** The most devices the host software lets the model hold, the model table's `maxDevices`. */
  readonly maxDevices?: number;
  /**
   * How many favourite channels the model holds: the model table's favourite channel buttons, or the family's limit
   * where the family composes favourites with one, the Harmony Touch's fifty.
   */
  readonly favourites?: number;
  /** The kind of panel: the model table's, or none for the two models without a screen, by their display pages. */
  readonly panel?: Panel;
  /** The screen's size in pixels, `SCREEN_SIZES`, by the architecture the model's remotes report. */
  readonly screen?: { readonly width: number; readonly height: number };
  /** Whether the screen is a touch panel: the model table's, or the Harmony Touch's display page. */
  readonly touch?: boolean;
  /** Whether Logitech's product records give the model a long press, a second action on a held key, `hasLongPress`. */
  readonly longPress: boolean;
  /** The most activities the model holds where the family builds a fixed number, one on the models without a screen. */
  readonly activitiesAtMost?: number;
  /** The keys printed on the remote that start an activity, by their printed names, where the family names them. */
  readonly activityKeys?: readonly string[];
  /** The reference pages a value above rests on, for the values no code holds. */
  readonly references: readonly string[];
}

/** One requirement and where it stands on the model asked about. */
export interface RequirementAnswer {
  readonly requirement: Requirement;
  readonly state: RequirementState;
}

/** A bench model, its properties and the status of every requirement on it, in number order. */
export interface ModelCapabilities {
  readonly key: BenchModelKey;
  readonly name: string;
  readonly skins: readonly number[];
  readonly properties: ModelProperties;
  readonly requirements: readonly RequirementAnswer[];
}

/** The family the registry chooses for a model by its name and first skin, or undefined where it refuses. */
function familyOfBenchModel(model: BenchModel): AnyFamily | undefined {
  try {
    return chooseByModel({ name: model.name, skin: model.skins[0]! }).family;
  } catch (error) {
    if (error instanceof NoFamilyError) return undefined;
    throw error;
  }
}

/**
 * The properties a family states for every model it serves, beyond the model table: the 600 family's three activity
 * keys, the no screen family's one activity on its Watch TV key and its missing screen, and the Harmony Touch's
 * favourites limit and its touch screen. A family not named here states none, which leaves the fields out. Each
 * value that is a reference page's and not a constant the family builds with names the page.
 */
function familyProperties(family: AnyFamily | undefined): Partial<ModelProperties> {
  if (family === FOUR_SLOT) return { activityKeys: Object.keys(ACTIVITY_KEYS) };
  if (family === NO_SCREEN_FAMILY) {
    return {
      // The family builds one activity, started by the Watch TV key, the only key either model's face gives one.
      activitiesAtMost: 1,
      activityKeys: ['Watch TV'],
      panel: 'none',
      touch: false,
      references: ['reference/how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity'],
    };
  }
  if (family === HARMONY_TOUCH_FAMILY) {
    return {
      favourites: FAVOURITES_LIMIT,
      touch: true,
      references: ['reference/remotes/harmony-touch/display.md'],
    };
  }
  return {};
}

/**
 * The display pages of the two models without a screen, which state that they have none; named per model so each
 * answer points at its own model's page.
 */
const DISPLAY_PAGES: Readonly<Partial<Record<BenchModelKey, string>>> = {
  'harmony-300': 'reference/remotes/harmony-300/display.md',
  'harmony-350': 'reference/remotes/harmony-350/display.md',
};

/**
 * The architecture a remote of the model reports for itself where the model table has no record: the Harmony Touch's
 * 17, which `SCREEN_SIZES` holds its screen under, `reference/remotes/harmony-touch/README.md`. Only used to find the
 * screen; the property `architecture` stays the model table's.
 */
const REPORTED_ARCHITECTURE: Readonly<Partial<Record<BenchModelKey, number>>> = { 'harmony-touch': 17 };

/** A model's properties, from the model table, its family and the pages named. */
function propertiesOf(model: BenchModel): ModelProperties {
  const record = modelForSkin(model.skins[0]);
  const family = familyOfBenchModel(model);
  const own = familyProperties(family);
  const screenArchitecture = record?.architecture ?? REPORTED_ARCHITECTURE[model.key];
  const screen = screenArchitecture === undefined ? undefined : SCREEN_SIZES[screenArchitecture];
  const display = DISPLAY_PAGES[model.key];
  const references = [...(own.references ?? []), ...(display === undefined ? [] : [display])];
  const favourites = record?.favourites ?? own.favourites;
  const panel = record?.panel ?? own.panel;
  const touch = record?.touch ?? own.touch;
  return {
    ...(record === undefined ? {} : { architecture: record.architecture, maxDevices: record.maxDevices }),
    ...(family === undefined ? {} : { family: { name: family.name, kind: familyKind(family) } }),
    ...(favourites === undefined ? {} : { favourites }),
    ...(panel === undefined ? {} : { panel }),
    ...(screen === undefined ? {} : { screen: { width: screen.width, height: screen.height } }),
    ...(touch === undefined ? {} : { touch }),
    longPress: model.skins.some((skin) => hasLongPress(skin)),
    ...(own.activitiesAtMost === undefined ? {} : { activitiesAtMost: own.activitiesAtMost }),
    ...(own.activityKeys === undefined ? {} : { activityKeys: own.activityKeys }),
    references,
  };
}

/**
 * A bench model's properties and the status of every requirement on it, by its key or by a skin one of its remotes
 * reports; undefined for a key or a skin no bench model has, a remote these statuses were never judged for.
 */
export function capabilitiesOf(keyOrSkin: BenchModelKey | number): ModelCapabilities | undefined {
  const model = benchModel(keyOrSkin);
  if (model === undefined) return undefined;
  return {
    key: model.key,
    name: model.name,
    skins: model.skins,
    properties: propertiesOf(model),
    requirements: REQUIREMENTS.map((requirement) => ({ requirement, state: requirementState(model.key, requirement.number) })),
  };
}

