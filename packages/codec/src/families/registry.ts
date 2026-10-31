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
import type { ActivityStart, CommonChoices, Family, FamilyTraits, SendShape } from './family.ts';
import { FOUR_SLOT } from './four-slot/index.ts';
import { NO_SCREEN_FAMILY } from './no-screen/index.ts';
import { TOUCH } from './touch/index.ts';

/**
 * The family of the remotes of an architecture, or undefined for one no family serves yet. The Harmony 300 and
 * 350's, architecture 16, since `todo-compile-350.md` 4.1, which composes a device for it and refuses the rest.
 */
export function familyOfArchitecture(architecture: number | undefined): Family | undefined {
  switch (architecture) {
    case 12: return TOUCH;
    case 14: return FOUR_SLOT;
    case 16: return NO_SCREEN_FAMILY;
    default: return undefined;
  }
}

/** The family a configuration's remote is in, by the architecture the container states. */
export function familyOf(c: Container): Family | undefined {
  return familyOfArchitecture(c.architecture);
}

/**
 * What a configuration no family serves gets from a shared composer: the Harmony One's shapes, which is
 * what the composers did for every architecture but the Harmony 600, 650 and 700's before plan 007. A
 * composer that has not been measured on such a configuration refuses it itself.
 */
export const PLAIN_TRAITS: FamilyTraits = { screenItemsBeep: true };

/** The traits a shared composer asks about, of the configuration's family or `PLAIN_TRAITS`. */
export function traitsOf(c: Container): FamilyTraits {
  return familyOf(c)?.traits ?? PLAIN_TRAITS;
}

/**
 * How a configuration's commands are sent, its family's or, where no family serves it, the send and its
 * quantity alone, which is how every architecture but the Harmony 600, 650 and 700's sends: the touch family's,
 * as before plan 007. Read at the call and not held in a constant, so the order the families' modules are
 * evaluated in never leaves it unset.
 */
export function sendsOf(c: Container): SendShape {
  return familyOf(c)?.sends ?? TOUCH.sends;
}

/**
 * The shape of an activity's start, its family's or, where no family serves it, the Harmony One's, as before
 * plan 007. No such configuration takes a screen, since the screen composers refuse it, so only the enter list's
 * writes are built there, which every start shares.
 */
export function activityStartOf(c: Container): ActivityStart {
  return familyOf(c)?.activityStart ?? TOUCH.activityStart;
}

/** The choices a shared composer asks about, of the configuration's family or none. */
export function choicesOf(c: Container): CommonChoices {
  return familyOf(c)?.choices ?? {};
}
