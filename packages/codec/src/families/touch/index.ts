/**
 * The touch family, plan 007: the Harmony One, whose screen is 176 by 220 under a touch panel. Its
 * modules are `menus.ts` and `screens.ts`, its choices `choices.ts`; this is the object the registry hands out.
 */
import type { Family } from '../family.ts';
import { composeTouchActivityRow, composeTouchActivityScreen, composeTouchDeviceScreen } from './screens.ts';
import { TOUCH_CHOICES, type TouchChoices } from './choices.ts';
import { activityMenuByRows } from '../../shared/menus.ts';

export const TOUCH: Family<TouchChoices> = {
  name: 'the Harmony One',
  traits: { sendPrelude: false, startSequence: 'timer cancel and active list', screenItemsBeep: true },
  choices: TOUCH_CHOICES,
  composeDeviceScreen: composeTouchDeviceScreen,
  activityMenu: activityMenuByRows,
  // The Harmony One writes the marker outside its rows 2 to 9 times, none read as its own: section 329.
  menuMarkerWriter: () => undefined,
  composeActivityRow: composeTouchActivityRow,
  composeActivityScreen: composeTouchActivityScreen,
};
