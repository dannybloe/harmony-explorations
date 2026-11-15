/**
 * The Harmony One built from a recipe, `Family.fromRecipe`, plan 014: the empty configuration of
 * `empty.ts` when the recipe holds no device and no activity, and otherwise the recipe composed onto that configuration
 * by `composeSetup`, the route `bin/empty-one.ts` has taken for every setup of ours the spare Harmony One ran.
 *
 * **Two empties, on purpose.** Our letters are blended into the colour under them as the look's last step. The empty
 * configuration that is the result is blended; the one a setup is composed onto is not, since the blending runs once,
 * last, over every text the composers add, `EmptyOneOptions.blend`.
 *
 * **The recipe's choices over `ONE_CHOICES`**, `oneChoices`, in both: the empty configuration is built with them,
 * and `composeSetup` reads them again through `Family.readChoices` for every step it runs.
 */
import { parse, type Container } from '../../container/gspm.ts';
import { recipeToBuild, type Recipe } from '../../recipe/recipe.ts';
import { composeSetup } from '../../shared/setup.ts';
import type { RecipeSources } from '../family.ts';
import { oneStartTitleRefusal } from './activityscreen.ts';
import { oneChoices } from './choices.ts';
import { oneDeviceNameRefusal } from './devicelists.ts';
import { buildEmptyOneConfiguration } from './empty.ts';

export function oneFromRecipe(recipe: Recipe, skin: number, sources: RecipeSources): Uint8Array {
  // A field of version 2 no compiled family's build reads yet stops this route as every other, decision 43, and an
  // activity switched off is left out as every build leaves it out, decision 44, `recipeToBuild`.
  recipe = recipeToBuild(recipe, 'the Harmony One\'s fromRecipe', 'compiled');
  const choices = oneChoices(recipe.choices ?? {});
  if (recipe.devices.length === 0 && recipe.activities.length === 0) {
    return buildEmptyOneConfiguration({ skin, builtAt: sources.builtAt, choices }).bytes;
  }
  const donor = buildEmptyOneConfiguration({ skin, builtAt: sources.builtAt, blend: false, choices });
  return composeSetup(recipe, {
    donor: donor.bytes, builtAt: sources.builtAt, ...(sources.archive === undefined ? {} : { archive: sources.archive }),
  }).bytes;
}

/**
 * The configurations names are judged on, by skin and choices: the one a setup is composed onto, built once each,
 * since a check asks of every name and a configuration takes a while to build.
 */
const JUDGED_ON = new Map<string, Container>();

/** A moment for the configuration names are judged on: the stamp moves no glyph and no font. */
const JUDGED_AT = '2026-01-01T00:00:00';

/**
 * **Why a build of `recipe` refuses a name**, `Family.nameRefusal`: asked of the configuration the build composes onto,
 * `oneFromRecipe`'s, by the builders' own judgements, a device's name on a device list's row, `oneDeviceNameRefusal`,
 * and an activity's on its start up title, `oneStartTitleRefusal`.
 */
export function oneNameRefusal(recipe: Recipe, skin: number, owner: 'device' | 'activity', name: string): string | undefined {
  const choices = oneChoices(recipe.choices ?? {});
  const key = `${skin} ${JSON.stringify(recipe.choices ?? {})}`;
  let c = JUDGED_ON.get(key);
  if (c === undefined) {
    c = parse(buildEmptyOneConfiguration({ skin, builtAt: JUDGED_AT, blend: false, choices }).bytes);
    JUDGED_ON.set(key, c);
  }
  return owner === 'device' ? oneDeviceNameRefusal(c, name) : oneStartTitleRefusal(c, name, choices);
}
