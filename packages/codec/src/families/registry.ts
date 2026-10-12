/**
 * The one place a configuration's family is chosen, plan 007. Nothing else in the codec tests which
 * remote a configuration is for in order to pick behaviour; it asks for the family and calls it.
 *
 * Today the choice reads the architecture the container states, since a configuration composed onto a
 * donor carries it. When the recipe names its target model, `todo-compile-650.md` 10.7.4, the choice
 * reads the model's definition instead, `packages/usb/src/models.ts`, and a model no family serves is
 * refused there. A switch rather than a table built at load time, so the choice never depends on the
 * order the modules happen to be evaluated in.
 */
import type { Container } from '../gspm.ts';
import type { CommonChoices, Family, FamilyTraits } from './family.ts';
import { FOUR_SLOT } from './four-slot/index.ts';
import { TOUCH } from './touch/index.ts';

/** The family a configuration's remote is in, or undefined for one no family serves yet. */
export function familyOf(c: Container): Family | undefined {
  switch (c.architecture) {
    case 12: return TOUCH;
    case 14: return FOUR_SLOT;
    default: return undefined;
  }
}

/**
 * What a configuration no family serves gets from a shared composer: commands as the plain send pair,
 * which is how every architecture but the Harmony 600, 650 and 700's sends, and the Harmony One's
 * shapes otherwise, which is what the composers did for every architecture but those three before
 * plan 007. A composer that has not been measured on such a configuration refuses it itself.
 */
export const PLAIN_TRAITS: FamilyTraits = {
  sendPrelude: false, startSequence: 'timer cancel and active list', screenItemsBeep: true,
};

/** The traits a shared composer asks about, of the configuration's family or `PLAIN_TRAITS`. */
export function traitsOf(c: Container): FamilyTraits {
  return familyOf(c)?.traits ?? PLAIN_TRAITS;
}

/** The choices a shared composer asks about, of the configuration's family or none. */
export function choicesOf(c: Container): CommonChoices {
  return familyOf(c)?.choices ?? {};
}
