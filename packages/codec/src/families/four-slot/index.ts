/**
 * The four slot family, plan 007: the Harmony 600, 650 and 700, whose screens are 128 by 128 with an
 * item in each corner. Its modules are `chrome.ts`, `menus.ts`, `devicescreen.ts`, `activityscreen.ts`
 * and `devicelist.ts`; this is the object the registry hands out.
 */
import type { Family } from '../family.ts';
import { composeFourSlotActivityRow, composeFourSlotActivityScreen } from './activityscreen.ts';
import { composeFourSlotDeviceScreen } from './devicescreen.ts';

export const FOUR_SLOT: Family = {
  name: 'the Harmony 600, 650 and 700',
  traits: { sendPrelude: true, startSequence: 'start variable and flag', screenItemsBeep: false },
  composeDeviceScreen: composeFourSlotDeviceScreen,
  composeActivityRow: composeFourSlotActivityRow,
  composeActivityScreen: composeFourSlotActivityScreen,
};
