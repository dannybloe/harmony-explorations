/**
 * The composers' public face, plan 007: the shared composers' names callers have always imported from here,
 * now living in `shared/`, and the three composers whose work differs by kind of screen, which choose
 * the family through `families/registry.ts` and nowhere else. **Nothing of a family's own passes through
 * here** since `todo-compile-one.md` 3.3.3.3: a family's modules are reached through the family, and a test
 * or a script that wants one of them imports it from `families/` itself.
 *
 * **The layout.** `shared/` holds what every family does alike: infrared groups, devices, activities,
 * power, spelling in a configuration's fonts, the menus' common records and the core edits. `families/`
 * holds one module set per kind of screen, `touch/` for the Harmony One and `four-slot/` for the 600,
 * 650 and 700, and a family never imports another. The registry is the one place a family is chosen.
 * Today it reads the architecture the container states; when the recipe names its model,
 * `todo-compile-650.md` 10.7.4, it reads the model's definition instead.
 */
import { activityStartOf, choicesOf, familyOf, sendsOf } from './families/registry.ts';
import type { DelayDefaults } from './families/family.ts';
import { Container } from './gspm.ts';
import { handlerSets } from './sections.ts';
import { composeActivityFor, type ComposeActivity, type ComposedActivity } from './shared/activities.ts';
import { ComposeError } from './shared/core.ts';
import { composeDeviceFor, type ComposeDevice, type ComposedDevice } from './shared/devices.ts';
import {
  activityMenus, type ComposeActivityRowOptions, type ComposeActivityScreenOptions, type ComposedActivityRow,
  type ComposedActivityScreen, type ComposedScreen, type ComposeRow, type ComposeScreenOptions,
} from './shared/menus.ts';

export {
  type ComposeActivity,
  type ComposeActivityTarget,
  type ComposedActivity,
  nextActivityValue,
  SILENT_WRITE,
} from './shared/activities.ts';
export {
  ACTION_TABLE_SLOT,
  appendActionLists,
  appendNarrowStateVariable,
  ComposeError,
  nextDeviceIdentifier,
  orderNameTree,
  renumberStateVariables,
  restamped,
  STATE_WRITE_LIMIT,
} from './shared/core.ts';
export {
  type ComposedDevice,
  type ComposeDevice,
  type DevicePlacement,
} from './shared/devices.ts';
export {
  appendTableEntries,
  blockWordsOf,
  COMPILED_LEAD_IN_US,
  compiledBlockWords,
  type ComposeCommand,
  type ComposedGroup,
  composeIrGroup,
  fillIrGroup,
  type ComposePowerStep,
  type StatedBlocks,
  type ToggledCode,
} from './shared/infrared.ts';
export {
  type ComposeActivityRowOptions,
  type ComposeActivityScreenOptions,
  type ComposedActivityRow,
  type ComposedActivityScreen,
  type ComposedScreen,
  type ComposeRow,
  type ComposeScreenOptions,
  menuMarkerOf,
} from './shared/menus.ts';
export {
  activityPowerTargets,
  type JoinedPowerOff,
  joinPowerOff,
  keepDeviceOn,
  type KeptOn,
  startsSwitchingOff,
} from './shared/power.ts';
export {
  blobReader,
  spelledText,
  speller,
  textValues,
  type ValueReader,
} from './shared/spelling.ts';

export function composeDeviceScreen(
  c: Container, label: string, rows: readonly ComposeRow[], options: ComposeScreenOptions = {},
): ComposedScreen {
  const family = familyOf(c);
  if (family === undefined) {
    throw new ComposeError('the screen half is composed for the Harmony One and arch 14 alone');
  }
  return family.composeDeviceScreen(c, label, rows, options);
}

/**
 * Give a composed activity its working screen, and put it where the remote looks for it.
 *
 * `activity` is the value the activity has or will have, `nextActivityValue` before
 * `composeActivity` runs. `rows` are the pads, drawn top left first, at most as many as the
 * template's hit page offers, which is five on the spare Harmony One and two on the everyday one;
 * none is a real shape too, one of the everyday Harmony One's eight working screens carrying only its
 * Devices key.
 *
 * **Everything that is the same on every working screen is shared rather than copied**: the record's
 * enter, leave and header handler lists, the header timer those start, the background, the "Devices"
 * string, the pad pictures. The four one page working screens on the spare Harmony One carry
 * byte identical copies of each handler list, each copy its own list, and one timer between them, so sharing the lists is
 * what their compiler does with the duplicates folded, and the rule a writer must respect is only
 * that two working screens are never on at once, which a mode switch guarantees.
 *
 * **What is ours**: the title, drawn inline in the chrome's own font where that font spells it; the
 * pads' labels; the page list and its pool copy; and the Devices key, which enters the **all devices**
 * menu where a real activity's enters a device list of its own devices. That last one is a known
 * simplification, since building a per activity device list is a second screen.
 */
export function composeActivityScreen(
  c: Container, activity: number, label: string, rows: readonly ComposeRow[],
  options: ComposeActivityScreenOptions = {},
): ComposedActivityScreen {
  const family = familyOf(c);
  if (family === undefined) {
    throw new ComposeError('an activity screen is composed for the Harmony One, 600, 650 and 700 alone');
  }
  return family.composeActivityScreen(c, activity, label, rows, options);
}

/**
 * Put a composed activity on the activity menu: one row on its last page, with the activity's name.
 *
 * The other half of `composeActivity`, which builds everything a remote needs to **run** an activity
 * and nothing that lets anybody **start** one.
 *
 * **A separate builder from `composeMenuPage`, deliberately: decision 17.** The first attempt reused
 * the device list's page builder on the strength of the two menus sharing a row pitch, and it threw
 * on every real configuration, correctly: an activity page has two bottom keys where a device page
 * has one, so its hit page offers a different number of rectangles. Reuse would have meant
 * a builder branching on which menu it was building, which is the shape that rots. What the two may
 * share is a **step**, and they do: `withActivityHitPage` composes a hit page the same way
 * `composeMenuPage` does. See `ACTIVITY_ROWS` for the measured layout and section 275 for the
 * evidence.
 *
 * **Arch 12 (Harmony One) here, and arch 14 (Harmony 600, 650 and 700) in
 * `composeFourSlotActivityRow`**, decision 16's question answered: the pixel grid, the hit rectangles
 * and the screen program around a row are the Harmony One's, and arch 14 has no touch panel at all,
 * its menu being section 289's two row layout, so the two share nothing but the menu finder and this
 * function's refusals. Arch 8 (Harmony 880 and 885) and arch 9 (Harmony 525) are refused, the 525
 * binding its activities to keys rather than to a list.
 *
 * **It fills the last page, and adds one when that page is full**, `composeActivityMenuPage`, since
 * section 293. Until then a full last page was refused, because a new page needs a page counter, a
 * pool copy, a page count and, on a menu of one page, the page turn keys brought back, none of which
 * had been measured on an activity menu; that is `todo.md` 1.2.2.
 */
export function composeActivityMenuRow(
  c: Container, label: string, set: number, options: ComposeActivityRowOptions = {},
): ComposedActivityRow {
  const family = familyOf(c);
  if (family === undefined) {
    throw new ComposeError('the activity menu is composed for the Harmony One, 600, 650 and 700 alone');
  }
  if (!Number.isInteger(set) || set < 0 || set >= 0xff) {
    // 0xff is the mask the selector's own operand carries, so an entry there reads as no entry.
    throw new ComposeError(`${set} is not a base slot 9 index this composer can select`);
  }
  const startSets = handlerSets(c);
  if (startSets === undefined) throw new ComposeError('base slot 9 does not read as a table');
  if (set >= startSets.addresses.length) {
    // A row selecting an entry that does not exist renders correctly and starts nothing, which is
    // the failure class every refusal in this file is for.
    throw new ComposeError(`entry ${set} is past the ${startSets.addresses.length} that exist`);
  }
  const { menu, marker } = activityMenus(c);
  if (menu === undefined || marker === undefined) {
    throw new ComposeError('no activity menu found to add a row to');
  }
  return family.composeActivityRow(c, label, set, menu, marker, options);
}

/**
 * Compose a device into a configuration, with the send of the family its remote is in, `sendsOf`, and,
 * where the device states no delay, the family's delays or the ones given: `composeDeviceFor`
 * in `shared/devices.ts` carries the whole account.
 */
export function composeDevice(
  c: Container, device: ComposeDevice, delays: DelayDefaults | undefined = choicesOf(c).delays,
): ComposedDevice {
  return composeDeviceFor(c, device, sendsOf(c), delays);
}

/**
 * Compose an activity into a configuration, with the start of the family its remote is in,
 * `activityStartOf`, and that family's activity keys and wiring: `composeActivityFor` in
 * `shared/activities.ts` carries the whole account.
 */
export function composeActivity(c: Container, activity: ComposeActivity): ComposedActivity {
  return composeActivityFor(c, activity, activityStartOf(c), familyOf(c));
}

export type { CommonChoices, DelayDefaults, FamilyTraits, WithChoices } from './families/family.ts';
