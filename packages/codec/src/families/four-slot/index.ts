/**
 * The four slot family, plan 007: the Harmony 600, 650 and 700, whose screens are 128 by 128 with an
 * item in each corner. Its modules are `chrome.ts`, `menus.ts`, `devicescreen.ts`, `activityscreen.ts`
 * and `devicelist.ts`, its choices `choices.ts`; this is the object the registry hands out.
 */
import type { Family } from '../family.ts';
import { composeFourSlotActivityRow, composeFourSlotActivityScreen } from './activityscreen.ts';
import { composeFourSlotDeviceScreen } from './devicescreen.ts';
import { FOUR_SLOT_CHOICES, type FourSlotChoices } from './choices.ts';

export const FOUR_SLOT: Family<FourSlotChoices> = {
  name: 'the Harmony 600, 650 and 700',
  traits: { sendPrelude: true, startSequence: 'start variable and flag', screenItemsBeep: false },
  choices: FOUR_SLOT_CHOICES,
  composeDeviceScreen: composeFourSlotDeviceScreen,
  composeActivityRow: composeFourSlotActivityRow,
  composeActivityScreen: composeFourSlotActivityScreen,
};
