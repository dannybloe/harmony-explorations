/**
 * The one place a family is chosen, plan 007, and since plan 013 decisions 1 and 2 the place both kinds of
 * family are chosen and the place a remote no family serves is refused. Nothing else in the codec tests which
 * remote a configuration is for in order to pick behaviour; it asks for the family and calls it.
 *
 * **Two questions, two routes.** By model, `familyOfModel`: a model as a recipe or FreeHarmony names it, by
 * Logitech's name and the skin where known, looked up in the model table, `packages/base/src/models.ts`, or among
 * the models a family serves that the table holds no record of, `MODELS_OUTSIDE_THE_TABLE`; the answer is a family
 * of either kind, a compiled one, `Family`, or a document one, `DocumentFamily`. By container, `familyOf`: the
 * architecture a configuration states, which is how a configuration composed onto a donor or read off a remote
 * finds its family, and which answers with a compiled family only, since a container is compiled for one
 * architecture. The model route is the one by model and not by architecture number, decision 1, because the
 * Harmony Touch's firmware reports 17, the number it shares with the hubs.
 *
 * **The refusal, decision 2.** `traitsOf`, `sendsOf`, `activityStartOf` and `choicesOf`, the four questions a shared
 * composer asks, refuse a configuration no family serves, through `NoFamilyError`, naming its architecture and its
 * model. Until plan 013 they answered with the Harmony One's shapes, `PLAIN_TRAITS` and the One family's sends and
 * start, so a composer on a configuration of the Harmony 525 or 890 built the One's lists without a word;
 * `code-for-a-family`'s question 4 asked for a refusal and nothing held it. `familyOf` itself still answers
 * undefined for such a configuration, since readers ask it whether a family reads a part at all and read Logitech's
 * compiles of every architecture either way.
 *
 * A switch rather than a table built at load time, so the choice never depends on the order the modules happen to
 * be evaluated in.
 */
import { MODELS_BY_SKIN, modelForSkin, type Model } from '@harmony/base/models';
import type { Container } from '../container/gspm.ts';
import { ComposeError } from '../shared/core.ts';
import { HARMONY_TOUCH_FAMILY } from './harmony-touch/family.ts';
import type { DocumentFamily } from './document.ts';
import type { ActivityStart, CommonChoices, Family, FamilyTraits, SendShape } from './family.ts';
import { FOUR_SLOT } from './harmony-600-650-700/index.ts';
import { NO_SCREEN_FAMILY } from './harmony-300-350/index.ts';
import { SIDE_KEYS } from './harmony-880-885/index.ts';
import { ONE } from './harmony-one/index.ts';

/** A family of either kind, plan 013 decision 1: `kind` tells them apart. */
export type AnyFamily = Family | DocumentFamily;

/**
 * A family's kind, `Family.kind` or `DocumentFamily.kind`, which every family states.
 */
export function familyKind(family: AnyFamily): 'compiled' | 'document' {
  return family.kind;
}

/**
 * What the registry refuses with: a model or a configuration no family serves. A `ComposeError`, since what asks
 * is a composer and every caller that already meets a composer's refusal meets this one the same way.
 */
export class NoFamilyError extends ComposeError {}

/**
 * The family of the remotes of an architecture, or undefined for one no family serves yet, for the container route:
 * the compiled families alone, since an architecture a container states is a compiled one. The Harmony 300 and
 * 350's, architecture 16, since `todo-compile-350.md` 4.1, which composes a device for it and refuses the rest; the
 * Harmony 880 and 885's, architecture 8, since `todo-compile-885.md` 2.1, likewise.
 */
export function familyOfArchitecture(architecture: number | undefined): Family | undefined {
  switch (architecture) {
    case 8: return SIDE_KEYS;
    case 12: return ONE;
    case 14: return FOUR_SLOT;
    case 16: return NO_SCREEN_FAMILY;
    default: return undefined;
  }
}

/**
 * The family a configuration's remote is in, by the architecture the container states, or undefined where no family
 * serves it. The container route: a container is compiled for one architecture, so the answer is a compiled family.
 * A reader asks this to learn whether a family reads a part; a builder asks the four questions below, which refuse.
 */
export function familyOf(c: Container): Family | undefined {
  return familyOfArchitecture(c.architecture);
}

// ---------------------------------------------------------------------------------------------------
// By model
// ---------------------------------------------------------------------------------------------------

/** A model as it is asked about: Logitech's name, "Harmony 650", and the skin where known. FreeHarmony's `RemoteModel`. */
export interface ModelNamed {
  readonly name: string;
  readonly skin?: number;
}

/** Logitech's name for a model record: "Harmony 650" for the record called "650". */
export function modelName(model: Model): string {
  return `Harmony ${model.name}`;
}

/**
 * The models a family serves that the model table holds no record of, by Logitech's name and their skin. The table
 * keeps out a model whose capability fields nothing has read, `SKINS_WITHOUT_A_MODEL_RECORD`, and the Harmony Touch is
 * not in it, so the Touch is chosen here: skin 99, the remote's own, read off its `/sys/sysinfo` and its `bcdDevice`,
 * `reference/remotes/harmony-touch/README.md`. Not by product id: `0xc12b` is the Harmony Ultimate's too.
 *
 * **The Harmony 300 and 350 are here too**, skins 79 and 104, which the table holds no record of: the no screen family
 * serves their architecture and builds a configuration from a setup with its own builder, `buildNoScreenSetup`, so
 * choosing them by model answers that family, and `recipeTarget` refuses them as a recipe target, naming that builder.
 */
const MODELS_OUTSIDE_THE_TABLE: readonly { readonly name: string; readonly skin: number; readonly family: () => AnyFamily }[] = [
  { name: 'Harmony Touch', skin: 99, family: () => HARMONY_TOUCH_FAMILY },
  { name: 'Harmony 300', skin: 79, family: () => NO_SCREEN_FAMILY },
  { name: 'Harmony 350', skin: 104, family: () => NO_SCREEN_FAMILY },
];

/** What choosing by model found: the skin, the model table's record where it has one, and the family. */
export interface ModelChoice {
  readonly skin: number;
  /** The model table's record, or undefined for a model `MODELS_OUTSIDE_THE_TABLE` names. */
  readonly model: Model | undefined;
  readonly family: AnyFamily;
}

/**
 * The model asked about and the family that builds for it, either kind, by its skin where given and by its name
 * otherwise. **Refuses**, through `NoFamilyError` and naming the model: a skin no model has, a name no model has, a
 * name and a skin that disagree, a name two skins share and no skin given, and a model whose architecture no family
 * serves.
 */
export function chooseByModel(asked: ModelNamed): ModelChoice {
  const { name, skin } = asked;
  const outside = MODELS_OUTSIDE_THE_TABLE.filter((one) => (skin === undefined ? one.name === name : one.skin === skin));
  if (outside.length === 1) {
    const [one] = outside as [typeof outside[number]];
    if (one.name !== name) throw new NoFamilyError(`skin ${one.skin} is the ${one.name}, not the ${name}`);
    return { skin: one.skin, model: undefined, family: one.family() };
  }
  let chosen: [number, Model];
  if (skin !== undefined) {
    const model = MODELS_BY_SKIN[skin];
    if (model === undefined) throw new NoFamilyError(`no model has skin ${skin}`);
    if (modelName(model) !== name) throw new NoFamilyError(`skin ${skin} is the ${modelName(model)}, not the ${name}`);
    chosen = [skin, model];
  } else {
    const named = Object.entries(MODELS_BY_SKIN).filter(([, model]) => modelName(model) === name);
    if (named.length === 0) throw new NoFamilyError(`no model is called ${name}`);
    if (named.length > 1) throw new NoFamilyError(`${name} is skins ${named.map(([one]) => one).join(' and ')}: name the skin`);
    const [only] = named as [[string, Model]];
    chosen = [Number(only[0]), only[1]];
  }
  const family = familyOfArchitecture(chosen[1].architecture);
  if (family === undefined) {
    throw new NoFamilyError(`nothing here builds a configuration for the ${name}: no family serves arch ${chosen[1].architecture}`);
  }
  return { skin: chosen[0], model: chosen[1], family };
}

/** The family that builds for a model, either kind, or a refusal naming the model, `chooseByModel`. */
export function familyOfModel(asked: ModelNamed): AnyFamily {
  return chooseByModel(asked).family;
}

// ---------------------------------------------------------------------------------------------------
// The four questions a shared composer asks, which refuse
// ---------------------------------------------------------------------------------------------------

/** The configuration's model as a refusal names it, by the skin its architecture record states. */
function modelOfContainer(c: Container): string {
  const skin = c.versionWord === undefined ? undefined : c.versionWord & 0xff;
  if (skin === undefined) return 'a skin it does not state';
  const model = modelForSkin(skin);
  return model === undefined ? `skin ${skin}, which the model table holds no record of` : `skin ${skin}, the ${modelName(model)}`;
}

/** The configuration's family, or the refusal every question below gives where none serves it. */
function servingFamily(c: Container, question: string): Family {
  const family = familyOf(c);
  if (family === undefined) {
    throw new NoFamilyError(`no family serves arch ${c.architecture}, ${modelOfContainer(c)}, so ${question} has no answer for it`);
  }
  return family;
}

/** The traits a shared composer asks about, of the configuration's family; refused where no family serves it. */
export function traitsOf(c: Container): FamilyTraits {
  return servingFamily(c, 'how its action lists are shaped').traits;
}

/**
 * How a configuration's commands are sent, its family's; refused where no family serves it. Read at the call and not
 * held in a constant, so the order the families' modules are evaluated in never leaves it unset.
 */
export function sendsOf(c: Container): SendShape {
  return servingFamily(c, 'how its commands are sent').sends;
}

/** The shape of an activity's start, its family's; refused where no family serves it. */
export function activityStartOf(c: Container): ActivityStart {
  return servingFamily(c, 'how its activities start').activityStart;
}

/** The choices a shared composer asks about, of the configuration's family; refused where no family serves it. */
export function choicesOf(c: Container): CommonChoices {
  return servingFamily(c, 'what its family chooses').choices;
}
