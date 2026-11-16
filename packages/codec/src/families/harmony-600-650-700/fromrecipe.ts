/**
 * The Harmony 600, 650 and 700 built from a recipe, `Family.fromRecipe`, plan 014: the empty
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
import { parse, type Container } from '../../container/gspm.ts';
import { recipeToBuild, type Recipe } from '../../recipe/recipe.ts';
import type { RecipeSources } from '../family.ts';
import { activityRowLabel, fourSlotStartupRefusal } from './activityscreen.ts';
import { assembleSetup } from './assemble.ts';
import { FOUR_SLOT_CHOICES, fourSlotChoices, OUR_FOUR_SLOT_CHOICES, type FourSlotChoicesGiven } from './choices.ts';
import { inOurLook } from './chrome.ts';
import { cornerLabelRefusal } from './devicescreen.ts';
import { buildEmptyFourSlotConfiguration } from './empty.ts';
import { fourSlotTemplate } from './menus.ts';
import { ourStateColours, withStateLook } from './statelook.ts';

export function fourSlotFromRecipe(recipe: Recipe, skin: number, sources: RecipeSources): Uint8Array {
  // A field of version 2 no compiled family's build reads yet stops this route as every other, decision 43, and an
  // activity switched off or with no device is left out as every build leaves it out, decision 44, `recipeToBuild`.
  recipe = recipeToBuild(recipe, 'the Harmony 600, 650 and 700\'s fromRecipe', 'compiled');
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

/**
 * The configurations names are judged on, by skin and choices: the one a setup is assembled onto, as each builder sees
 * it, built once each, since a check asks of every name and a configuration takes a while to build.
 */
const JUDGED_ON = new Map<string, { readonly device: Container; readonly activity: Container }>();

/** A moment for the configuration names are judged on: the stamp moves no glyph and no font. */
const JUDGED_AT = '2026-01-01T00:00:00';

/**
 * **Why a build of `recipe` refuses a name**, `Family.nameRefusal`: asked of the configuration the build assembles onto,
 * `fourSlotFromRecipe`'s, by the builders' own judgements, a device's name as its device mode label,
 * `cornerLabelRefusal`, and an activity's as its activity menu row's label, `activityRowLabel`, and on its start up
 * screen, `fourSlotStartupRefusal`.
 */
export function fourSlotNameRefusal(recipe: Recipe, skin: number, owner: 'device' | 'activity', name: string): string | undefined {
  const given = (recipe.choices ?? {}) as FourSlotChoicesGiven;
  const key = `${skin} ${JSON.stringify(given)}`;
  let judged = JUDGED_ON.get(key);
  if (judged === undefined) {
    const c = parse(buildEmptyFourSlotConfiguration({
      skin, builtAt: JUDGED_AT, choices: fourSlotChoices({ ...given, blendLetters: false }, OUR_FOUR_SLOT_CHOICES),
    }).bytes);
    // The device screen's builder first gives a configuration of ours the device state's look, which an empty one does
    // not hold until its first device, and judges on that; so the judgement here takes the same step, or it asks a
    // configuration no builder draws on. An activity's start up title is judged by the picture and the font alone,
    // which the empty configuration holds as it is, `fourSlotStartupRefusal`.
    const device = inOurLook(c) ? withStateLook(c, ourStateColours(c).device ?? FOUR_SLOT_CHOICES.stateColours.device) : c;
    judged = { device, activity: c };
    JUDGED_ON.set(key, judged);
  }
  const template = fourSlotTemplate(judged.device, undefined);
  if (owner === 'device') return cornerLabelRefusal(judged.device, template, name);
  // An activity's name is drawn twice: as its activity menu row's label, in the device pages' label font where the
  // page holds no label yet and in the font of the label already there otherwise, which is the same one unless that
  // label needed another to be spelled; and as the title of its start up screen.
  return activityRowLabel(judged.device, name, template.labelFont).refusal ?? fourSlotStartupRefusal(judged.activity, name);
}
