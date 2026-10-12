/**
 * The one place a configuration's family is chosen, plan 007. Nothing else in the codec tests which
 * remote a configuration is for in order to pick behaviour; it asks for the family and calls it.
 *
 * The choice reads an architecture: the one a recipe's model has in its definition,
 * `packages/usb/src/models.ts`, `todo-compile-650.md` 10.7.4, where a model no family serves is refused,
 * or the one a container states, which a configuration composed onto a donor carries. A switch rather
 * than a table built at load time, so the choice never depends on the order the modules happen to be
 * evaluated in.
 */
import type { Container } from '../gspm.ts';
import type { CommonChoices, Family, FamilyTraits } from './family.ts';
import { FOUR_SLOT } from './four-slot/index.ts';
import { TOUCH } from './touch/index.ts';

/** The family of the remotes of an architecture, or undefined for one no family serves yet. */
export function familyOfArchitecture(architecture: number | undefined): Family | undefined {
  switch (architecture) {
    case 12: return TOUCH;
    case 14: return FOUR_SLOT;
    default: return undefined;
  }
}

/** The family a configuration's remote is in, by the architecture the container states. */
export function familyOf(c: Container): Family | undefined {
  return familyOfArchitecture(c.architecture);
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
