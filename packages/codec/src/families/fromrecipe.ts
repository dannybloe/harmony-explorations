/**
 * **One build from a recipe, for every remote the libraries serve**, plan 014 and `todo.md` 7.3.11: a recipe goes in,
 * the JSON an application hands over with everything a remote is to hold, and what comes out is what is sent to that
 * remote. It sits beside the registry, in `families/`, since choosing a family and naming each kind's result is that
 * folder's work and not a shared module's, `generic.test.ts`. The application does not have to know which family builds for which model, nor the four routes each family
 * took before: the registry chooses by the recipe's model, `chooseByModel`, and the family builds.
 *
 * **From nothing only.** No compile of Logitech's goes in, so the same recipe, sources and stamp give the same bytes,
 * which is what the committed references are held to, decision 32. A build composed onto one of their compiles stays
 * its family's own function, for the tests that hold our composers to theirs.
 *
 * **Two kinds of result**, as there are two kinds of family, plan 013 decision 1. A compiled family's is the one
 * configuration a remote is written with, which `writeConfiguration` or the file write on `@harmony/corpus/write`
 * takes; a document family's, the Harmony Touch's, is the documents and the pictures a sync delivers, which
 * `answerTouchSync` takes. Sending stays there, behind its rails.
 *
 * **What the families read of a recipe that others do not**: the Harmony 300 and 350 a device key per device,
 * `RecipeDevice.key`, and the Harmony Touch its own part, `Recipe.touch`, read by its setup reader, which also takes
 * the account's own identifiers from the sources, since those come off the remote and never sit in a recipe.
 */
import { carriedCatalogue } from '../catalogue/carried.ts';
import type { CatalogueSource } from '../catalogue/catalogue.ts';
import { readRecipe, RecipeError } from '../recipe/recipe.ts';
import type { SyncDocuments } from './harmony-touch/documents.ts';
import type { OwnPicture } from './harmony-touch/favourites.ts';
import type { TouchAccount } from './harmony-touch/fromnothing.ts';
import { chooseByModel, NoFamilyError, type ModelChoice } from './registry.ts';

/** What a build takes besides the recipe. */
export interface BuildSources {
  /** When it is built, `YYYY-MM-DDTHH:MM:SS`: every stamp and clock record a configuration holds is taken from it. */
  readonly builtAt: string;
  /**
   * The catalogue the codes of a device the recipe names and does not carry come from: `archiveAt` of a checkout on
   * Node. A device the recipe carries, `RecipeDevice.definition`, is served from the recipe first.
   */
  readonly archive?: CatalogueSource;
  /** The Harmony Touch's account: the identifiers its documents carry, read off the remote and never in a recipe. */
  readonly account?: TouchAccount;
}

/** What a build gives: the configuration of a compiled family, or a document family's documents and pictures. */
export type Built =
  | { readonly kind: 'configuration'; readonly model: string; readonly skin: number; readonly bytes: Uint8Array }
  | {
    readonly kind: 'documents'; readonly model: string; readonly skin: number;
    readonly documents: SyncDocuments; readonly pictures: readonly OwnPicture[];
  };

/**
 * The remote a recipe describes, built from nothing. Takes the recipe as parsed JSON and reads it, so a caller hands
 * over what it holds; refused, as a `RecipeError`, where the recipe is not one, where its model is one no family
 * serves or a family that builds nothing from a recipe yet, and where a document family is given no archive or account;
 * the families refuse what they do not build, each with its own refusal.
 */
export function buildFromRecipe(json: unknown, sources: BuildSources): Built {
  const model = modelOf(json);
  let choice: ModelChoice;
  try {
    choice = chooseByModel(model);
  } catch (error) {
    if (error instanceof NoFamilyError) throw new RecipeError(error.message);
    throw error;
  }
  const { family, skin } = choice;
  if (family.kind === 'compiled' && family.fromRecipe === undefined) throw new RecipeError(`nothing here builds ${family.name} from a recipe yet`);
  const recipe = readRecipe(json);
  // The devices the recipe carries, over the archive given, `catalogue/carried.ts`.
  const archive = carriedCatalogue(recipe, sources.archive);
  if (family.kind === 'document') {
    if (archive === undefined) throw new RecipeError(`the ${model.name} is built from the catalogue, and the recipe carries no device and no archive was given`);
    if (sources.account === undefined) throw new RecipeError(`the ${model.name}'s documents carry its account's identifiers, and no account was given`);
    const setup = family.readSetup(json);
    return {
      kind: 'documents', model: model.name, skin,
      documents: family.build(setup, { archive, account: sources.account }) as SyncDocuments,
      pictures: family.buildPictures(setup) as readonly OwnPicture[],
    };
  }
  if (recipe.touch !== undefined) throw new RecipeError(`the recipe has a Harmony Touch's part, and it is for the ${model.name}`);
  return {
    kind: 'configuration', model: model.name, skin,
    bytes: family.fromRecipe!(recipe, skin, { builtAt: sources.builtAt, ...(archive === undefined ? {} : { archive }) }),
  };
}

/** The model a recipe names, read before the rest so the family's own reader reads the rest. */
function modelOf(json: unknown): { readonly name: string; readonly skin?: number } {
  const model = typeof json === 'object' && json !== null ? (json as { model?: unknown }).model : undefined;
  const name = typeof model === 'object' && model !== null ? (model as { name?: unknown }).name : undefined;
  if (typeof name !== 'string' || name === '') throw new RecipeError('the recipe names no model');
  const skin = (model as { skin?: unknown }).skin;
  if (skin !== undefined && !Number.isInteger(skin)) throw new RecipeError('the model\'s skin is not a number');
  return { name, ...(skin === undefined ? {} : { skin: skin as number }) };
}

/**
 * **The choices a recipe leaves to its family's defaults**, by name, plan 014 and `todo.md` 7.3.11.2: empty where the
 * recipe states every choice its family makes, which a reference recipe does, so that a default changed later cannot
 * change a reference without its recipe saying so. A family that makes no choice, a document family among them,
 * answers empty.
 */
export function unstatedChoices(json: unknown): readonly string[] {
  const { family } = chooseByModel(modelOf(json));
  if (family.kind === 'document') return [];
  const given = (json as { choices?: Readonly<Record<string, unknown>> }).choices ?? {};
  return Object.keys(family.choices).filter((name) => !(name in given)).sort();
}
