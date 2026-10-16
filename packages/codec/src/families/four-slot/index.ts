/**
 * The four slot family, plan 007: the Harmony 600, 650 and 700, whose screens are 128 by 128 with an
 * item in each corner. Its modules are `chrome.ts`, `menus.ts`, `devicescreen.ts`, `activityscreen.ts`
 * and `devicelist.ts`, its choices `choices.ts`; this is the object the registry hands out.
 */
import type { Family } from '../family.ts';
import { FOUR_SLOT_ACTIVITY_KEYS } from './keypadrules.ts';
import { fourSlotDrawsName, fourSlotScreenItems } from './screenitems.ts';
import { HARD_KEYS } from '../../devicemode.ts';
import { composeFourSlotActivityRow, composeFourSlotActivityScreen } from './activityscreen.ts';
import { composeFourSlotDeviceScreen } from './devicescreen.ts';
import { composeActivityDeviceList } from './devicelist.ts';
import { fourSlotActivityMenu, fourSlotMenuMarkerWriter } from './chrome.ts';
import { FOUR_SLOT_CHOICES, type FourSlotChoices } from './choices.ts';

// The family's generated texts, which the four slot assembler runs, `assemble.ts`, until its four slot half moves
// here too, `todo-compile-one.md` 3.3.3.2.
export {
  ScreenTextError, buildScreenTexts, checkScreenTexts, describeScreenTexts, withScreenTexts,
} from './screentexts.ts';
export type * from './screentexts.ts';
export {
  buildFirmwareScreens, checkFirmwareScreens, describeFirmwareScreens, withFirmwareScreens,
} from './firmwarescreens.ts';

export const FOUR_SLOT: Family<FourSlotChoices> = {
  name: 'the Harmony 600, 650 and 700',
  traits: { sendPrelude: true, startSequence: 'start variable and flag', screenItemsBeep: false },
  choices: FOUR_SLOT_CHOICES,
  screenItems: fourSlotScreenItems,
  drawsName: fourSlotDrawsName,
  activityKeyRules: FOUR_SLOT_ACTIVITY_KEYS,
  deviceModeKeys: HARD_KEYS,
  composeDeviceScreen: composeFourSlotDeviceScreen,
  activityMenu: fourSlotActivityMenu,
  menuMarkerWriter: fourSlotMenuMarkerWriter,
  composeActivityRow: composeFourSlotActivityRow,
  composeActivityScreen: composeFourSlotActivityScreen,
  activityDeviceList: (c, activity) => composeActivityDeviceList(c, activity).bytes,
};
