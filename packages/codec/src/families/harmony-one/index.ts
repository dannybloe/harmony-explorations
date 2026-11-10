/**
 * The One family, plan 007: the Harmony One, whose screen is 176 by 220 under a touch panel. Its
 * modules are `menus.ts` and `screens.ts`, its choices `choices.ts`; this is the object the registry hands out.
 */
import type { Family } from '../family.ts';
import { ONE_ACTIVITY_KEYS } from './keypadrules.ts';
import { oneDrawsName, oneScreenItems } from './screenitems.ts';
import { composeOneActivityRow, composeOneActivityScreen, composeOneDeviceScreen } from './screens.ts';
import { ONE_CHOICES, oneChoices, type OneChoices } from './choices.ts';
import { ONE_HARD_KEYS } from './devicekeys.ts';
import { oneActivityMenu } from './activityscreen.ts';
import { letterOneDonor, oneDonorFaces, withOneLook } from './look.ts';
import { ONE_STATE_TABLES } from './statetables.ts';
import { ONE_FONTS } from './fonts.ts';
import { checkOneWiring } from './wiring.ts';
import { ONE_SENDS } from './sends.ts';
import { ONE_START } from './start.ts';
import { withOneComposedBuilders } from './builders.ts';
import { withOneActivityMenuRow } from './activitymenu.ts';
import { withOneActivityDeviceList } from './devicelists.ts';
import { oneMenuMarkerWriter } from './menus.ts';
import { oneFromRecipe } from './fromrecipe.ts';

export const ONE: Family<OneChoices> = {
  kind: 'compiled',
  name: 'the Harmony One',
  traits: { screenItemsBeep: true },
  choices: ONE_CHOICES,
  screenItems: oneScreenItems,
  drawsName: oneDrawsName,
  activityKeyRules: ONE_ACTIVITY_KEYS,
  deviceModeKeys: ONE_HARD_KEYS,
  stateTables: ONE_STATE_TABLES,
  fonts: ONE_FONTS,
  sends: ONE_SENDS,
  activityStart: ONE_START,
  wiring: { check: checkOneWiring },
  composeDeviceScreen: composeOneDeviceScreen,
  activityMenu: oneActivityMenu,
  // The Harmony One writes the marker outside its rows 2 to 9 times, section 329; the leftover entry's Devices key list
  // writes it 1 on all nineteen compiles, which names it on a configuration with no row, section 435.
  menuMarkerWriter: oneMenuMarkerWriter,
  // A row in our pictures, which the activity's type gives, the composed path's, is put on by building the whole menu
  // again, section 419; without a type the copying composer adds one to a menu of Logitech's in its look.
  composeActivityRow: (c, label, set, menu, marker, options) => (options.type === undefined
    ? composeOneActivityRow(c, label, set, menu, marker, options)
    : withOneActivityMenuRow(c, label, set, menu, marker, options)),
  composeActivityScreen: composeOneActivityScreen,
  // The Devices item opens a list of the activity's own, every device with those its start switches on first, as on
  // Logitech's compiles, findings section 424, rather than the idle list.
  activityDeviceList: withOneActivityDeviceList,
  composedLook: { letterDonor: letterOneDonor, look: withOneLook, donorOfOurs: oneDonorFaces },
  // The parts the donor carried that a builder of the family's makes from a description,
  // after the welcome tour and the Remote Assistant are left out unless chosen, section 421.
  composedBuilders: withOneComposedBuilders,
  composedSkins: new Set([54]),
  // The configuration a recipe describes, from nothing, plan 014.
  fromRecipe: oneFromRecipe,
  readChoices: oneChoices,
};
