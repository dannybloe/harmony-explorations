/**
 * The touch family, plan 007: the Harmony One, whose screen is 176 by 220 under a touch panel. Its
 * modules are `menus.ts` and `screens.ts`; this is the object the registry hands out.
 */
import type { Family } from '../family.ts';
import { composeTouchActivityRow, composeTouchActivityScreen, composeTouchDeviceScreen } from './screens.ts';

export const TOUCH: Family = {
  name: 'the Harmony One',
  traits: { sendPrelude: false, startSequence: 'timer cancel and active list', screenItemsBeep: true },
  composeDeviceScreen: composeTouchDeviceScreen,
  composeActivityRow: composeTouchActivityRow,
  composeActivityScreen: composeTouchActivityScreen,
};
