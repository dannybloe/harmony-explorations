/**
 * The no screen family, plan 007: the Harmony 300 and 350, architecture 16, whose remotes have no screen, keep
 * their configuration as a file reached over the file protocol, and allocate their infrared table at the model's
 * maximum. This is the object the registry hands out.
 *
 * **What is real and what refuses.** `todo-compile-350.md` 4.1 composes a device, so what a device needs is
 * built: the key table its map is laid out by, `deviceModeKeys`, and its send, `sends`, whose device half is
 * real; the composer itself is `composeNoScreenDevice` in `devices.ts`, since no member of the interface composes
 * a whole device, and it puts a device on a key's short press or, 4.4, its long press. The favourite channels,
 * 4.3, are `composeNoScreenFavourites` in `favourites.ts`, for the same reason. Everything else refuses with a
 * message saying why, as code-for-a-family's fourth question asks, rather than borrowing another family's answer:
 *
 * * **No screen**, so the screen members refuse for good: a device's screen, an activity's row, menu and screen,
 *   the screen items, the font sets.
 * * **Not measured yet**, each with the step that measures it: the activity's start and its keys, 4.2; the state
 *   tables and the wiring the builders check against, chapter 5; the inputs and the sequences the send refuses.
 *
 * A data member that cannot be stated refuses when it is read, `refusing` below, so a shared composer that asks
 * this family a question it has no answer to stops there with the reason, not with another family's answer.
 */
import type { ActivityKeyRules } from '../../activityroles.ts';
import { ComposeError } from '../../shared/core.ts';
import type { StateTableFacts } from '../../statetables.ts';
import type { ActivityStart, Family, FamilyFonts, FamilyTraits } from '../family.ts';
import { NO_SCREEN_HARD_KEYS } from './keys.ts';
import { NO_SCREEN_SENDS } from './sends.ts';

/** The models this family serves, as a person names them, for a refusal. */
const NAME = 'the Harmony 300 and 350';

/** Why a member about a screen has no answer here, for good. */
const NO_SCREEN = `${NAME} have no screen`;

/**
 * An object every property of which refuses when read, with `why`: a data member of the interface this family has
 * no answer for. A symbol, which is how a runtime asks whether something is a promise or how to print it, reads as
 * absent rather than refusing, so that holding the family is harmless and only asking it a question stops.
 */
function refusing<T extends object>(why: string): T {
  return new Proxy({} as T, {
    get(_target, property) {
      if (typeof property === 'symbol') return undefined;
      throw new ComposeError(`${why}: ${String(property)}`);
    },
  });
}

/** A member that is a function and refuses when called. */
const refuses = (why: string) => (): never => {
  throw new ComposeError(why);
};

export const NO_SCREEN_FAMILY: Family = {
  name: NAME,
  traits: refusing<FamilyTraits>(`${NO_SCREEN}, so a screen item has no traits`),
  // No choice of ours is made for this family yet: a device's power on delay is the catalogue's, as Logitech's
  // compile of the test setup states every device's, and no activity key exists to choose.
  choices: {},
  deviceModeKeys: NO_SCREEN_HARD_KEYS,
  activityKeyRules: refusing<ActivityKeyRules>(`an activity's keys are not composed for ${NAME} yet, todo-compile-350.md 4.2`),
  stateTables: refusing<StateTableFacts>(`the state tables are not built for ${NAME} yet, todo-compile-350.md 5.1`),
  wiring: { check: refuses(`the wiring is not built for ${NAME} yet, todo-compile-350.md 5.1`) },
  fonts: {
    faces: [],
    faceOf: () => ({ refusal: `${NO_SCREEN}, so nothing is lettered` }),
    sharesGlyphs: false,
    refusal: () => `${NO_SCREEN}, so nothing is lettered`,
  } satisfies FamilyFonts,
  sends: NO_SCREEN_SENDS,
  activityStart: refusing<ActivityStart>(`an activity's start is not composed for ${NAME} yet, todo-compile-350.md 4.2`),
  screenItems: refuses(NO_SCREEN),
  drawsName: refuses(NO_SCREEN),
  composeDeviceScreen: refuses(NO_SCREEN),
  activityMenu: refuses(NO_SCREEN),
  menuMarkerWriter: refuses(NO_SCREEN),
  composeActivityRow: refuses(NO_SCREEN),
  activityDeviceList: refuses(`${NO_SCREEN}, and an activity's device list is a screen`),
  composeActivityScreen: refuses(NO_SCREEN),
};

export { composeNoScreenDevice, type ComposedNoScreenDevice, inCompilerOrder, type NoScreenDeviceRequest } from './devices.ts';
export {
  composeNoScreenFavourites, type ComposedNoScreenFavourites, NUMBER_SENDER_BAND, type NoScreenFavouritesRequest,
} from './favourites.ts';
export {
  type AccountDevice, DEVICE_KEYS, DIGIT_COPIES_BY_TYPE, FAVOURITE_SCANS, LONG_PRESS_GROUP_BASE, NO_SCREEN_HARD_KEYS,
  RECEIVER_TYPE, TELEVISION_TYPE, volumeSource,
} from './keys.ts';
export { NO_SCREEN_SENDS, powerOnWaits } from './sends.ts';
