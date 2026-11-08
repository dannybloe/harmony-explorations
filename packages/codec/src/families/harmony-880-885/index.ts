/**
 * The side keys family, plan 007: the Harmony 880 and 885, architecture 8, whose colour screen of 128 by 160 has
 * eight keys beside it, two columns of four, and whose pages are cells beside those keys. This is the object the
 * registry hands out, since `todo-compile-885.md` 2.1 composed a first device for it.
 *
 * **Which models.** The registry chooses by architecture, and arch 8 holds the Harmony 880, 885 and 880 Pro, and the
 * Harmony 720, whose pages are six cells of 64 by 42. Everything here is measured on the eight arch 8
 * configurations the lab holds of the 880 and 885, six contributed and the two bench units', and a composer reads
 * its geometry off the configuration it is given, so it refuses a page it cannot read rather than assuming one;
 * the 720 and the 880 Pro are not checked.
 *
 * **What is real and what refuses.** A device is composed: its records and lists through the shared device
 * composer, with this family's send, `sends.ts`, and its screen and its row on every copy of the device list,
 * `composeDeviceScreen`, `devicescreen.ts`, on the page grammar of `pages.ts`. Everything else refuses, saying
 * which step of `todo-compile-885.md` measures it, rather than answering with another family's: activities and
 * their screens and menu, chapter 3; the keys a device's commands take, 2.5; the state tables a builder makes and the wiring it checks,
 * chapter 10; fonts of ours, chapter 8. The traits are stated: a device list row has no beep on these remotes, and
 * neither has an item of a device's page, which calls the command's send list itself, on every arch 8
 * configuration read.
 */
import type { ActivityKeyRules } from '../../activityroles.ts';
import type { HardKey } from '../../devicemode.ts';
import type { StateTableFacts } from '../../statetables.ts';
import { ComposeError } from '../../shared/core.ts';
import type { ActivityStart, Family, FamilyFonts } from '../family.ts';
import { composeSideKeysDeviceScreen } from './devicescreen.ts';
import { SIDE_KEYS_NAME, SIDE_KEYS_SENDS } from './sends.ts';

/**
 * An object every property of which refuses when read, with `why`: a data member this family has no answer for
 * yet. A symbol reads as absent, so holding the family is harmless and only asking it a question stops. The no
 * screen family's device, which this repeats rather than imports, since a family never imports another.
 */
function refusing<T extends object>(why: string): T {
  return new Proxy({} as T, {
    get(_target, property) {
      if (typeof property === 'symbol') return undefined;
      throw new ComposeError(`${why}: ${String(property)}`);
    },
  });
}

/** A member that is a function and refuses when called, with the step of `todo-compile-885.md` that measures it. */
const notYet = (what: string, step: string) => (): never => {
  throw new ComposeError(`${what} is not composed for ${SIDE_KEYS_NAME} yet, todo-compile-885.md ${step}`);
};

export const SIDE_KEYS: Family = {
  kind: 'compiled',
  name: SIDE_KEYS_NAME,
  // A device list row is `enter the mode, write the mark`, no beep, `DEVICE_LIST_ROW_BEEPS`; a device page's item
  // calls its command's send list with nothing in front, on every arch 8 configuration read.
  traits: { screenItemsBeep: false },
  // No choice of ours yet: a device's power on delay is the catalogue's, and the delay between devices lives in its
  // power codes' opening silence, the catalogue's too, `SIDE_KEYS_SENDS.powerStep`, todo-compile-885.md 2.3; the
  // default for a device that states none is a constant beside it, since nothing but the send asks for it.
  choices: {},
  // A getter rather than a refusing object: the one caller iterates the table, and iterating asks for a symbol,
  // which `refusing` answers as absent, so the refusal would come out as a type error and not as this reason.
  get deviceModeKeys(): readonly HardKey[] {
    throw new ComposeError(`which command each key takes in a device mode of ${SIDE_KEYS_NAME} is not read, todo-compile-885.md 2.5`);
  },
  activityKeyRules: refusing<ActivityKeyRules>(`an activity's keys are not composed for ${SIDE_KEYS_NAME} yet, todo-compile-885.md 3.3`),
  stateTables: refusing<StateTableFacts>(`the state tables of ${SIDE_KEYS_NAME} are not built yet, todo-compile-885.md 10.3`),
  wiring: { check: notYet('checking the wiring', '10.2') },
  fonts: {
    faces: [],
    faceOf: () => ({ refusal: `no face of ours is measured for ${SIDE_KEYS_NAME} yet, todo-compile-885.md 8.2` }),
    sharesGlyphs: false,
    refusal: () => `no face of ours is measured for ${SIDE_KEYS_NAME} yet, todo-compile-885.md 8.2`,
  } satisfies FamilyFonts,
  sends: SIDE_KEYS_SENDS,
  activityStart: refusing<ActivityStart>(`an activity's start is not composed for ${SIDE_KEYS_NAME} yet, todo-compile-885.md 3.2`),
  screenItems: notYet('reading a device page\'s items for an activity', '3.3'),
  drawsName: notYet('reading a device page\'s items for an activity', '3.3'),
  composeDeviceScreen: (c, label, rows, options) => composeSideKeysDeviceScreen(c, label, rows, options),
  activityMenu: notYet('the activity menu', '3.2'),
  menuMarkerWriter: notYet('the activity menu', '3.2'),
  composeActivityRow: notYet('an activity\'s row', '3.2'),
  activityDeviceList: notYet('an activity\'s device list', '3.2'),
  composeActivityScreen: notYet('an activity\'s screen', '3.4'),
};

export { composeSideKeysDeviceScreen } from './devicescreen.ts';
export {
  SIDE_KEYS_ARROW_X, SIDE_KEYS_BOTTOM_ROW, SIDE_KEYS_GRID, SIDE_KEYS_LABEL_WIDTH, SIDE_KEYS_LEFT_X, SIDE_KEYS_LINE_Y,
  SIDE_KEYS_NUMBER_END, SIDE_KEYS_OF_X, SIDE_KEYS_PER_PAGE, SIDE_KEYS_RIGHT_END, SIDE_KEYS_ROW_PITCH, SIDE_KEYS_ROW_TOP,
  SIDE_KEYS_SEPARATOR_X, SIDE_KEYS_TITLE_XY, SIDE_KEYS_TOP_ROWS, SIDE_KEYS_TOTAL_X, sideKeysChrome, sideKeysCounter,
} from './pages.ts';
export {
  SIDE_KEYS_GROUPS, SIDE_KEYS_INTER_DEVICE_DEFAULT, SIDE_KEYS_LONGEST_INTER_DEVICE, SIDE_KEYS_LONGEST_WAIT,
  SIDE_KEYS_NAME, SIDE_KEYS_POWER_QUANTITY, SIDE_KEYS_SENDS, SIDE_KEYS_SHARED_TOGGLE_FROM, SIDE_KEYS_SHORTEST_LEAD_US,
  SIDE_KEYS_STATE_BYTES,
} from './sends.ts';
