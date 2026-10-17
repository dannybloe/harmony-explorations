/**
 * The four slot family, plan 007: the Harmony 600, 650 and 700, whose screens are 128 by 128 with an
 * item in each corner. Its modules are `chrome.ts`, `menus.ts`, `devicescreen.ts`, `activityscreen.ts`
 * and `devicelist.ts`, its choices `choices.ts`, its wiring `wiring.ts` and mode 0 `modezero.ts`, and the
 * chain that builds a whole configuration from a setup, `assemble.ts`, which this index does not take, since
 * nothing the registry hands out runs it; this is the object the registry hands out.
 */
import type { Family } from '../family.ts';
// First, so a four slot module still outside the family that reaches the skins through this index while the
// family is being evaluated finds them set: `backgrounds.ts` builds its own skin sets from them on load.
export { HARMONY_650_SKINS } from './skins.ts';
import { FOUR_SLOT_ACTIVITY_KEYS } from './keypadrules.ts';
import { fourSlotDrawsName, fourSlotScreenItems } from './screenitems.ts';
import { HARD_KEYS } from './devicemode.ts';
import { composeFourSlotActivityRow, composeFourSlotActivityScreen } from './activityscreen.ts';
import { composeFourSlotDeviceScreen } from './devicescreen.ts';
import { composeActivityDeviceList } from './devicelist.ts';
import { fourSlotActivityMenu, fourSlotMenuMarkerWriter } from './chrome.ts';
import { FOUR_SLOT_CHOICES, type FourSlotChoices } from './choices.ts';
import { FOUR_SLOT_ACTIVITY_KEY_EDITOR } from './activitykeys.ts';
import { FOUR_SLOT_STATE_TABLES } from './statetables.ts';
import { FOUR_SLOT_FONTS } from './fonts.ts';
import { FOUR_SLOT_SENDS } from './sends.ts';
import { FOUR_SLOT_START, fourSlotActivityRewiring } from './start.ts';
import { checkWiring } from './wiring.ts';

// The family's generated texts and firmware screens were passed on here for the four slot assembler in
// `assemble.ts`; since `todo-compile-one.md` 3.3.3.2 the assembler is the family's own, `assemble.ts` here, and
// takes them from their modules.
// What the four slot modules still outside the family reach, `screenrecords`, `backgrounds` and `compare`,
// until they move here too, `todo-compile-one.md` 3.3.3.2 and 3.3.3.5. `compose.ts` passed these through
// until 3.3.3.3.
export { activityKeyedRecords, fixedLineScreenParts, startupPicture } from './activityscreen.ts';
export { DEVICE_MODE_PROGRAM_TAG, DEVICES_KEY_TAG, SCAN_FOUR_TAG, cornerPrograms, holdsLogitechLook } from './chrome.ts';
export { activityRowListBody, deviceListRowBody } from './devicelist.ts';
export {
  type FourSlotMenuChrome, type FourSlotMenuKind, type FourSlotMenuLabel, type FourSlotMenuPageContent, type MenuPart,
  fourSlotMenuChrome, fourSlotMenuWords, fourSlotMenus, menuPageContent, menuPageListBytes, menuPageParts, menuPartsBytes,
} from './menus.ts';
// The wiring's description and the keypad's scan range, which `screenrecords` read from `wiring.ts` and
// `modezero.ts` until both moved here, `todo-compile-one.md` 3.3.3.2.
export { describeWiring } from './wiring.ts';
export { KEYPAD_FIRST_SCAN, KEYPAD_LAST_SCAN } from './modezero.ts';

export const FOUR_SLOT: Family<FourSlotChoices> = {
  name: 'the Harmony 600, 650 and 700',
  traits: { screenItemsBeep: false },
  choices: FOUR_SLOT_CHOICES,
  screenItems: fourSlotScreenItems,
  drawsName: fourSlotDrawsName,
  activityKeyRules: FOUR_SLOT_ACTIVITY_KEYS,
  activityKeyEditor: FOUR_SLOT_ACTIVITY_KEY_EDITOR,
  stateTables: FOUR_SLOT_STATE_TABLES,
  fonts: FOUR_SLOT_FONTS,
  sends: FOUR_SLOT_SENDS,
  activityStart: FOUR_SLOT_START,
  activityRewiring: fourSlotActivityRewiring,
  // The family's catalogue over the shared engine, `wiring.ts`, since `todo-compile-one.md` 3.3.3.2.
  wiring: { check: checkWiring },
  deviceModeKeys: HARD_KEYS,
  composeDeviceScreen: composeFourSlotDeviceScreen,
  activityMenu: fourSlotActivityMenu,
  menuMarkerWriter: fourSlotMenuMarkerWriter,
  composeActivityRow: composeFourSlotActivityRow,
  composeActivityScreen: composeFourSlotActivityScreen,
  activityDeviceList: (c, activity) => composeActivityDeviceList(c, activity).bytes,
};
