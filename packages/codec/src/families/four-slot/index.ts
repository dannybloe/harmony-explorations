/**
 * The four slot family, plan 007: the Harmony 600, 650 and 700, whose screens are 128 by 128 with an
 * item in each corner. Its modules are `chrome.ts`, `menus.ts`, `devicescreen.ts`, `activityscreen.ts`
 * and `devicelist.ts`, its choices `choices.ts`; this is the object the registry hands out.
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
import { checkWiring } from '../../wiring.ts';

// The family's generated texts, which the four slot assembler runs, `assemble.ts`, until its four slot half moves
// here too, `todo-compile-one.md` 3.3.3.2.
export {
  ScreenTextError, buildScreenTexts, checkScreenTexts, describeScreenTexts, withScreenTexts,
} from './screentexts.ts';
export type * from './screentexts.ts';
export {
  buildFirmwareScreens, checkFirmwareScreens, describeFirmwareScreens, withFirmwareScreens,
} from './firmwarescreens.ts';
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
  // Still outside the family until `todo-compile-one.md` 3.3.3.2 moves it here.
  wiring: { check: checkWiring },
  deviceModeKeys: HARD_KEYS,
  composeDeviceScreen: composeFourSlotDeviceScreen,
  activityMenu: fourSlotActivityMenu,
  menuMarkerWriter: fourSlotMenuMarkerWriter,
  composeActivityRow: composeFourSlotActivityRow,
  composeActivityScreen: composeFourSlotActivityScreen,
  activityDeviceList: (c, activity) => composeActivityDeviceList(c, activity).bytes,
};
