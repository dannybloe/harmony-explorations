/**
 * The four slot family, plan 007: the Harmony 600, 650 and 700, whose screens are 128 by 128 with an
 * item in each corner. Its modules are `chrome.ts`, `menus.ts`, `devicescreen.ts`, `activityscreen.ts`
 * and `devicelist.ts`, its choices `choices.ts`, its wiring `wiring.ts` and mode 0 `modezero.ts`, and the
 * chain that builds a whole configuration from a setup, `assemble.ts`, which this index does not take, since
 * nothing the registry hands out runs it; this is the object the registry hands out.
 */
import type { Family } from '../family.ts';
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
// The modules that stood outside the family and reached its internals through this index, `screenrecords`,
// `backgrounds` and `compare`, are the family's own since `todo-compile-one.md` 3.3.3.2, so the index passes
// nothing on any more: it is the object the registry hands out.

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
