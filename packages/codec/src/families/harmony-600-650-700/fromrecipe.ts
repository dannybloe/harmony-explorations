/**
 * The Harmony 600, 650 and 700 built from a recipe, `Family.fromRecipe`, plan 014 and `todo.md` 7.3.11: the empty
 * configuration of `empty.ts` when the recipe holds no device and no activity, and otherwise the recipe assembled onto
 * that configuration by `assembleSetup`, the route the Harmony 600 and 700 setups of ours were built by, findings
 * section 377 onwards.
 *
 * **The choices are the recipe's over `OUR_FOUR_SLOT_CHOICES`**, the defaults of a build from nothing: our letters,
 * our pictures and the state colours. `FOUR_SLOT_CHOICES` keeps Logitech's look for the assembly on one of their
 * compiles, which is not a route from nothing and not this one.
 *
 * **Two empties, on purpose**, as on the Harmony One: the empty configuration that is the result has its letters
 * blended when the choices say so, and the one a setup is assembled onto never has, since `assembleSetup` blends once,
 * last, over every text it adds, and refuses a donor that is blended already.
 */
import type { Recipe } from '../../recipe/recipe.ts';
import type { RecipeSources } from '../family.ts';
import { assembleSetup } from './assemble.ts';
import { fourSlotChoices, OUR_FOUR_SLOT_CHOICES, type FourSlotChoicesGiven } from './choices.ts';
import { buildEmptyFourSlotConfiguration } from './empty.ts';

export function fourSlotFromRecipe(recipe: Recipe, skin: number, sources: RecipeSources): Uint8Array {
  const given = (recipe.choices ?? {}) as FourSlotChoicesGiven;
  if (recipe.devices.length === 0 && recipe.activities.length === 0) {
    return buildEmptyFourSlotConfiguration({ skin, builtAt: sources.builtAt, choices: fourSlotChoices(given, OUR_FOUR_SLOT_CHOICES) }).bytes;
  }
  const donor = buildEmptyFourSlotConfiguration({
    skin, builtAt: sources.builtAt, choices: fourSlotChoices({ ...given, blendLetters: false }, OUR_FOUR_SLOT_CHOICES),
  });
  return assembleSetup(recipe, {
    donor: donor.bytes, builtAt: sources.builtAt, ...(sources.archive === undefined ? {} : { archive: sources.archive }),
  }).bytes;
}
