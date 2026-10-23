/**
 * The touch family, plan 007: the Harmony One, whose screen is 176 by 220 under a touch panel. Its
 * modules are `menus.ts` and `screens.ts`, its choices `choices.ts`; this is the object the registry hands out.
 */
import type { Family } from '../family.ts';
import { TOUCH_ACTIVITY_KEYS } from './keypadrules.ts';
import { touchDrawsName, touchScreenItems } from './screenitems.ts';
import { composeTouchActivityRow, composeTouchActivityScreen, composeTouchDeviceScreen } from './screens.ts';
import { TOUCH_CHOICES, type TouchChoices } from './choices.ts';
import { TOUCH_HARD_KEYS } from './devicekeys.ts';
import { touchActivityMenu } from './activityscreen.ts';
import { letterTouchDonor, touchDonorFaces, withTouchLook } from './look.ts';
import { TOUCH_STATE_TABLES } from './statetables.ts';
import { TOUCH_FONTS } from './fonts.ts';
import { checkTouchWiring } from './wiring.ts';
import { TOUCH_SENDS } from './sends.ts';
import { TOUCH_START } from './start.ts';
import { withTouchComposedBuilders } from './builders.ts';
import { withTouchActivityMenuRow } from './activitymenu.ts';
import { withTouchActivityDeviceList } from './devicelists.ts';
import { touchMenuMarkerWriter } from './menus.ts';

export const TOUCH: Family<TouchChoices> = {
  name: 'the Harmony One',
  traits: { screenItemsBeep: true },
  choices: TOUCH_CHOICES,
  screenItems: touchScreenItems,
  drawsName: touchDrawsName,
  activityKeyRules: TOUCH_ACTIVITY_KEYS,
  deviceModeKeys: TOUCH_HARD_KEYS,
  stateTables: TOUCH_STATE_TABLES,
  fonts: TOUCH_FONTS,
  sends: TOUCH_SENDS,
  activityStart: TOUCH_START,
  wiring: { check: checkTouchWiring },
  composeDeviceScreen: composeTouchDeviceScreen,
  activityMenu: touchActivityMenu,
  // The Harmony One writes the marker outside its rows 2 to 9 times, section 329; the leftover entry's Devices key list
  // writes it 1 on all nineteen compiles, which names it on a configuration with no row, `todo-compile-one.md` 8.1.1.
  menuMarkerWriter: touchMenuMarkerWriter,
  // A row in our pictures, which the activity's type gives, the composed path's, is put on by building the whole menu
  // again, `todo-compile-one.md` 4.1; without a type the copying composer adds one to a menu of Logitech's in its look.
  composeActivityRow: (c, label, set, menu, marker, options) => (options.type === undefined
    ? composeTouchActivityRow(c, label, set, menu, marker, options)
    : withTouchActivityMenuRow(c, label, set, menu, marker, options)),
  composeActivityScreen: composeTouchActivityScreen,
  // The Devices item opens a list of the activity's own, every device with those its start switches on first, as on
  // Logitech's compiles, `todo-compile-one.md` 4.3.3, findings section 424; until then it opened the idle list.
  activityDeviceList: withTouchActivityDeviceList,
  composedLook: { letterDonor: letterTouchDonor, look: withTouchLook, donorOfOurs: touchDonorFaces },
  // The parts the donor carried that a builder of the family's makes from a description, `todo-compile-one.md` 3.2.2,
  // after the welcome tour and the Remote Assistant are left out unless chosen, 4.10.
  composedBuilders: withTouchComposedBuilders,
  composedSkins: new Set([54]),
};
