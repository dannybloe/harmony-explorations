/**
 * **One build from a recipe, for every remote the libraries serve**, plan 014: a recipe goes in,
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
 * `RecipeDevice.key`, and the Harmony Touch the fields of version 2 its documents are made from, decision 43, and the
 * keys a person chose, through its family's `readSetup` and `build`, which also take the account's own identifiers from
 * the sources, since those come off the remote and never sit in a recipe. A Touch's document of the earlier form, with
 * a block of its own, is refused by the reader, naming the converter.
 *
 * **What the family does not read is refused before anything is built**: a field of the recipe's version 2 that the
 * build of the model's kind of family does not read stops the build as a function not built does, with the requirement
 * it waits on, `refuseUnbuiltFields` over `VERSION_TWO`, which says per part which kind of family reads it. Refused
 * rather than left out, since a configuration built without a person's timing or power order is one the remote accepts
 * and that does something else than the document says. Here first, before any source is asked for, and again by every
 * route below it, each family's `fromRecipe`, the composers of a setup and the Harmony Touch's builder, since this
 * repository's scripts and an application through a family's own entries reach those without passing here.
 */
import { carriedCatalogue } from '../catalogue/carried.ts';
import type { CatalogueSource } from '../catalogue/catalogue.ts';
import { readRecipe, RecipeError, refuseUnbuiltFields, statedKeys, takingPart, type LeftOutActivity, type LeftOutReason } from '../recipe/recipe.ts';
import { notBuilt } from '../support/contract.ts';
import { resource } from '../support/resources.ts';
import type { SyncDocuments } from './harmony-touch/documents.ts';
import type { OwnPicture } from './harmony-touch/favourites.ts';
import type { TouchAccount } from './harmony-touch/fromnothing.ts';
import { chooseByModel, NoFamilyError, type ModelChoice } from './registry.ts';

/**
 * The Harmony Touch's account, the identifiers its documents carry, which an application reads off the remote and
 * hands to the build as `BuildSources.account`; exported beside the sources, so an application holding one names its
 * type rather than the option's.
 */
export type { TouchAccount };

/**
 * An activity a build left out and why, switched off, R92, or with no device, decision 44, exported beside what a build
 * gives.
 */
export type { LeftOutActivity, LeftOutReason };

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

/**
 * What a build gives: the configuration of a compiled family, or a document family's documents and pictures; and on
 * both, **the activities the build left out and why**, decision 44, in the document's order, empty where every activity
 * takes part: each one the document switches off, R92, and each one that uses no device, which is left out the same
 * way on every model. Said here because the bytes or documents built cannot say it: an activity left out is simply not
 * in them, and a person who switched one off and forgot, or removed its last device, would otherwise see it vanish
 * unexplained.
 */
export type Built =
  | {
    readonly kind: 'configuration'; readonly model: string; readonly skin: number; readonly bytes: Uint8Array;
    readonly leftOut: readonly LeftOutActivity[];
  }
  | {
    readonly kind: 'documents'; readonly model: string; readonly skin: number;
    readonly documents: SyncDocuments; readonly pictures: readonly OwnPicture[];
    readonly leftOut: readonly LeftOutActivity[];
  };

/**
 * The remote a recipe describes, built from nothing. Takes the recipe as parsed JSON and reads it, so a caller hands
 * over what it holds. **A build says no in three ways an application tells apart, on every model**:
 *
 * * `ComposeError`, the build refuses the document: the families refuse what they will not build with it or a
 *   subclass of it, `support/refusal.ts`;
 * * `NotBuiltError`, what the document asks for is not built yet: a field of version 2 the family does not read, a key
 *   a recipe chooses where the family builds none, and a model whose family builds nothing from a recipe yet, each
 *   naming the requirement it waits on;
 * * `RecipeError`, a source the caller must give is missing: an account for a Harmony Touch, and an archive for a
 *   device the document carries no definition of. The same class refuses a recipe that is not one, before any of this,
 *   and a model no family serves.
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
  // A family that builds nothing from a recipe, the Harmony 880 and 885's today: what is missing is the build, R4.
  if (family.kind === 'compiled' && family.fromRecipe === undefined) notBuilt(`buildFromRecipe for ${family.name}`, 4);
  const read = readRecipe(json);
  // A field of version 2 this kind of family's build does not read, before anything is built or any source is asked for.
  refuseUnbuiltFields(read, 'buildFromRecipe', family.kind);
  // The activities that take no part, left out here, once, before any family builds, decision 44: those switched off,
  // R92, and those that use no device, on every model alike. Every family's build reads both by never meeting such an
  // activity, so a family's own refusal of an activity with no device is never reached from here, and the result says
  // which were left out and why.
  const { recipe, leftOut } = takingPart(read);
  // A key the recipe chooses otherwise, R31 and R32, is built by a compiled family that states how,
  // `Family.recipeKeys`, and refused by every other before anything is built: a file built without the choice is one
  // the remote accepts and whose key does something else. The Harmony Touch builds every choice its places take, its
  // maps' `resolveMaps`, and refuses one they do not, `touchSetupOfDocument`.
  const chosen = statedKeys(recipe)[0];
  if (chosen !== undefined && family.kind === 'compiled' && family.recipeKeys === undefined) {
    // An activity's key is R31, a device's own R32.
    notBuilt(`buildFromRecipe for ${chosen.where} on ${family.name}`, chosen.owner === 'device' ? 32 : 31);
  }
  // A device the document carries no definition of is built from the archive, which is then a source the caller must
  // give; without it the catalogue's own refusal would come from deep inside a family, of a class no caller expects.
  const uncarried = recipe.devices.find((one) => one.definition === undefined);
  if (uncarried !== undefined && sources.archive === undefined) {
    throw new RecipeError(`${uncarried.name} carries no definition of ${uncarried.device}, and no archive was given to build it from`);
  }
  // The devices the recipe carries, over the archive given, `catalogue/carried.ts`.
  const archive = carriedCatalogue(recipe, sources.archive);
  if (family.kind === 'document') {
    if (archive === undefined) throw new RecipeError(`the ${model.name} is built from the catalogue, and the recipe carries no device and no archive was given`);
    if (sources.account === undefined) throw new RecipeError(`the ${model.name}'s documents carry its account's identifiers, and no account was given`);
    // The family reads the document with the activities that take no part taken out, as it was read here.
    const setup = family.readSetup(recipe);
    return {
      kind: 'documents', model: model.name, skin,
      documents: family.build(setup, { archive, account: sources.account }) as SyncDocuments,
      pictures: family.buildPictures(setup) as readonly OwnPicture[],
      leftOut,
    };
  }
  return {
    kind: 'configuration', model: model.name, skin,
    bytes: family.fromRecipe!(recipe, skin, { builtAt: sources.builtAt, ...(archive === undefined ? {} : { archive }) }),
    leftOut,
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
 * **The choices a recipe leaves to its family's defaults**, by name, plan 014: empty where the
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

/**
 * **A build's fingerprint**, plan 014 and decision 32: the SHA-256 of what is sent, so two builds are the same exactly
 * when their fingerprints are. A configuration's is that of its bytes. A set of documents' is that of one text
 * holding each document as JSON in the order the build gives them, and each picture's address and the SHA-256 of its
 * bytes, so a document or a picture changed anywhere changes it. The references are held by these: the bytes a
 * reference stood for are rebuilt from its recipe at the commit that recorded it, which is what `bin/reference.ts`
 * does to show where two builds differ.
 */
export function builtDigest(built: Built): string {
  const sha256 = resource('sha256');
  if (built.kind === 'configuration') return sha256(built.bytes);
  const text = JSON.stringify({
    documents: built.documents,
    pictures: built.pictures.map((p) => [p.uri, sha256(p.png)]),
  });
  return sha256(new TextEncoder().encode(text));
}
