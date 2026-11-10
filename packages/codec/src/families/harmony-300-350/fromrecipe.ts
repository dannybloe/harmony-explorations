/**
 * The Harmony 300 and 350 built from a recipe, `Family.fromRecipe`, plan 014: the empty
 * configuration of `empty.ts` when the recipe holds no device and no activity, and otherwise `buildNoScreenSetup`,
 * the route every Harmony 350 setup of ours built from nothing takes.
 *
 * **Which device key each device goes on is the recipe's**, `RecipeDevice.key`: these remotes have a key per device
 * and no screen, and nothing in a recipe written for another family says which key, so a device without one is
 * refused rather than given a place this family would have to invent.
 */
import { ComposeError } from '../../shared/core.ts';
import type { Recipe } from '../../recipe/recipe.ts';
import type { RecipeSources } from '../family.ts';
import { buildEmptyNoScreenConfiguration } from './empty.ts';
import { buildNoScreenSetup, type DevicePlace } from './setup.ts';

export function noScreenFromRecipe(recipe: Recipe, skin: number, sources: RecipeSources): Uint8Array {
  if (recipe.devices.length === 0 && recipe.activities.length === 0) {
    return buildEmptyNoScreenConfiguration({ skin, builtAt: sources.builtAt }).bytes;
  }
  if (sources.archive === undefined) throw new ComposeError('the Harmony 300 and 350 compose their devices from the catalogue, and no archive was given');
  const keys: Record<string, DevicePlace> = {};
  for (const device of recipe.devices) {
    if (device.key === undefined) throw new ComposeError(`device ${device.name} states no device key, which the Harmony 300 and 350 need for every device`);
    keys[device.name] = { place: device.key.place, press: device.key.press ?? 'short' };
  }
  return buildNoScreenSetup(sources.archive, { recipe, keys, builtAt: sources.builtAt }).bytes;
}
