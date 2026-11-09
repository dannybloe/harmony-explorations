/**
 * The Harmony One built from a recipe, `Family.fromRecipe`, plan 014 and `todo.md` 7.3.11: the empty configuration of
 * `empty.ts` when the recipe holds no device and no activity, and otherwise the recipe composed onto that configuration
 * by `composeSetup`, the route `bin/empty-one.ts` has taken for every setup of ours the spare Harmony One ran.
 *
 * **Two empties, on purpose.** Our letters are blended into the colour under them as the look's last step. The empty
 * configuration that is the result is blended; the one a setup is composed onto is not, since the blending runs once,
 * last, over every text the composers add, `EmptyOneOptions.blend`.
 *
 * **The recipe's choices over `ONE_CHOICES`**, `oneChoices`, in both: the empty configuration is built with them,
 * and `composeSetup` reads them again through `Family.readChoices` for every step it runs, `todo.md` 7.3.11.2.
 */
import type { Recipe } from '../../recipe/recipe.ts';
import { composeSetup } from '../../shared/setup.ts';
import type { RecipeSources } from '../family.ts';
import { oneChoices } from './choices.ts';
import { buildEmptyOneConfiguration } from './empty.ts';

export function oneFromRecipe(recipe: Recipe, skin: number, sources: RecipeSources): Uint8Array {
  const choices = oneChoices(recipe.choices ?? {});
  if (recipe.devices.length === 0 && recipe.activities.length === 0) {
    return buildEmptyOneConfiguration({ skin, builtAt: sources.builtAt, choices }).bytes;
  }
  const donor = buildEmptyOneConfiguration({ skin, builtAt: sources.builtAt, blend: false, choices });
  return composeSetup(recipe, {
    donor: donor.bytes, builtAt: sources.builtAt, ...(sources.archive === undefined ? {} : { archive: sources.archive }),
  }).bytes;
}
