/**
 * An activity's keypad map and screen commands, built from its **roles** rather than copied from
 * another activity. Harmony 600, 650 and 700, section 323.
 *
 * Logitech's platform states an activity as roles, `docs/myharmony/model.md`: a device that shows the
 * picture, one that takes the volume, one that changes channels or plays the film. Its compiler turns
 * those into the two things this file builds:
 *
 * 1. **the keypad map**, the base slot 9 set the activity installs. Measured over the 40 activities of
 *    the 13 Logitech compiles for these three models: the three volume keys are the **volume** device's
 *    own device mode keys, and every other key is the **control** device's, the one that changes
 *    channels or else plays, again its own device mode key. Not a copy of the command: the **same base
 *    slot 10 list** the device's own map runs, which is what 1254 of the 1328 activity key bindings
 *    do, and none of the rest runs a copy. Three refinements, each named below, close what that
 *    leaves on Logitech's own calibration activity; two of them fire on that one activity only.
 *
 * 2. **the screen's commands**, the corner items of the working screen. Every item on those screens in
 *    the compiles that are Logitech's choice rather than a user's is an item of a device's own screen
 *    pages, the same list under the same label, so a command is named by its device and its label and
 *    resolved to that. **Which** commands and in which order is not derived: it is the platform's
 *    soft button list, a default suggestion or the user's choice, and neither order is a hash order
 *    of anything this project has tried. So the selection is an input here and the layout, four to a
 *    page in the order given, is `composeActivityScreen`'s.
 *
 * **Roles are read off a compiled activity's sends where nothing states them**, `activityRolesFromSends`:
 * the volume device is the one VolumeUp sends to and the control device the one most other keys send
 * to. That is an inference, and it is checked against the devices Logitech's stated button maps give
 * the two activities of the calibration Harmony 600's account record.
 */
import type { Container } from './gspm.ts';
import {
  ACTION_LIST_INDEX_OPCODE, handlerSets, modeRecords, taggedList,
} from './sections.ts';
import {
  activities, deviceModeMaps, FOUR_SLOT_ITEMS, fourSlotCellAt, infraredCodesPerList,
} from './inventory.ts';
import { characterMap, screenStrings } from './text.ts';
import { ComposeError, type ComposeRow } from './compose.ts';

/** VolumeUp, VolumeDown and Mute on the Harmony 600, 650 and 700's keypad, `reference/button-maps.md`. */
export const VOLUME_SCANS: readonly number[] = [14, 15, 16];
/** A press, the event type of every key binding that sends anything, section 17. */
const PRESS = 2;

/**
 * Keys whose binding the compiler takes from another key of the same device when the device's own map
 * leaves them unbound. The two arrow keys above the direction pad on a Harmony 600, scans 26 and 27,
 * are bound to nothing in most devices' own maps, and an activity then sends the device's DirectionUp
 * and DirectionDown on them, scans 50 and 42.
 */
const FALLBACK_SCANS: ReadonlyMap<number, number> = new Map([[26, 50], [27, 42]]);
/**
 * ChannelUp and ChannelDown, and what an activity puts on them instead when the device's own map has
 * them doing the direction pad's job: SkipForward and SkipBack. A device with no channels, a disc
 * player, carries its DirectionUp and DirectionDown on the channel keys in its own map, and the
 * compiler gives the activity the skip keys there instead, which is the stated map on the calibration
 * Harmony 600's "Watch a Movie" (`ChannelUp` to `SkipForward`).
 */
const CHANNEL_SCANS: readonly [number, number] = [31, 32];
const DIRECTION_SCANS: readonly [number, number] = [50, 42];
const SKIP_SCANS: readonly [number, number] = [38, 21];
/** The Exit key, and the label of a device's own Exit command where its map puts another on that key. */
const EXIT_SCAN = 12;
const EXIT_LABEL = 'Exit';

/** The devices an activity's roles name, each as an index into base slot 5's group array. */
export interface ActivityRoles {
  /** The device that takes VolumeUp, VolumeDown and Mute. */
  readonly volume?: number | undefined;
  /**
   * The device everything else on the keypad drives: the channel changing device, or where there is
   * none, the one that plays. A display that does neither contributes nothing to the keypad, which is
   * what Logitech's own function map states.
   */
  readonly control?: number | undefined;
}

/** A device's own keypad: what each scan's press runs, from the device mode record, section 271. */
export function deviceKeypadLists(c: Container, group: number): Map<number, number> {
  const map = deviceModeMaps(c).find((one) => one.group === group);
  if (map === undefined) throw new ComposeError(`device ${group} has no device mode record`);
  const record = (modeRecords(c) ?? [])[map.mode];
  const out = new Map<number, number>();
  for (const entry of record?.entries ?? []) {
    if (entry.tag >> 6 !== PRESS || entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
    out.set(entry.tag & 0x3f, entry.operand);
  }
  return out;
}

/** One item of a device's own screen pages: its drawn label and the list it runs. */
export interface DeviceScreenItem {
  readonly label: string;
  readonly list: number;
}

/**
 * A device's own screen commands, page by page and within a page in the order the corners fill,
 * `FOUR_SLOT_ITEMS`. A label drawn over two lines is read back with a space between them.
 */
export function deviceScreenItems(c: Container, group: number): DeviceScreenItem[] {
  const map = deviceModeMaps(c).find((one) => one.group === group);
  if (map === undefined) throw new ComposeError(`device ${group} has no device mode record`);
  return modeScreenItems(c, map.mode);
}

/** The corner items of every page of a mode, in page order and corner order. */
export function modeScreenItems(c: Container, mode: number): DeviceScreenItem[] {
  const record = (modeRecords(c) ?? [])[mode];
  if (record === undefined) throw new ComposeError(`mode ${mode} does not exist`);
  const drawn = screenStrings(c, characterMap(c));
  const out: DeviceScreenItem[] = [];
  for (const page of record.pages) {
    const lines = drawn.filter((one) => one.program === page.program && one.y >= 20 && one.y <= 100);
    const entries = taggedList(c, page.list)?.entries ?? [];
    FOUR_SLOT_ITEMS.forEach((item, k) => {
      const entry = entries.find((one) => (one.tag & 0x3f) === item.scan && one.opcode === ACTION_LIST_INDEX_OPCODE);
      if (entry === undefined) return;
      const label = lines.filter((one) => fourSlotCellAt(one.x, one.y) === k)
        .sort((a, b) => a.y - b.y).map((one) => one.text.trim()).join(' ');
      out.push({ label, list: entry.operand });
    });
  }
  return out;
}

/**
 * The activity's keypad map from its roles: a scan and the list its press runs, ascending by scan,
 * ready for `composeActivity`'s `keys`.
 *
 * The volume keys come from the volume device's own map, everything else from the control device's,
 * and then the three refinements. The first is read off the compiles and is right on five distinct
 * activities and wrong on four; the other two fire on one activity, the calibration disc player's, where
 * they agree with Logitech's stated map, so they are fitted to it:
 *
 * - the arrows, scans 26 and 27, fall back to the control device's DirectionUp and DirectionDown when
 *   its own map leaves them unbound;
 * - ChannelUp and ChannelDown take SkipForward and SkipBack when the control device's own map has the
 *   channel keys doing the direction pad's job;
 * - Exit takes the control device's own `Exit` screen command when it has one, which is where its own
 *   map put the command it calls Exit after giving the key to something else.
 *
 * The **order** of the set's entries is not this function's: `composeActivity` writes the set, and a
 * set's entries are in Java's hash bucket order, `keyListBucket`, on 40 of 40 activity sets, with the
 * order inside a bucket depending on the order they were added, which is not established.
 */
export function activityKeysFromRoles(c: Container, roles: ActivityRoles): { scan: number; list: number }[] {
  const keys = new Map<number, number>();
  if (roles.control !== undefined) {
    const own = deviceKeypadLists(c, roles.control);
    for (const [scan, list] of own) if (!VOLUME_SCANS.includes(scan)) keys.set(scan, list);
    for (const [scan, from] of FALLBACK_SCANS) {
      const fallback = own.get(from);
      if (!own.has(scan) && fallback !== undefined) keys.set(scan, fallback);
    }
    const channelIsDirection = CHANNEL_SCANS.every((scan, k) =>
      own.has(scan) && own.get(scan) === own.get(DIRECTION_SCANS[k] as number));
    if (channelIsDirection && SKIP_SCANS.every((scan) => own.has(scan))) {
      CHANNEL_SCANS.forEach((scan, k) => keys.set(scan, own.get(SKIP_SCANS[k] as number) as number));
    }
    const exit = deviceScreenItems(c, roles.control).find((one) => one.label === EXIT_LABEL);
    if (exit !== undefined) keys.set(EXIT_SCAN, exit.list);
  }
  if (roles.volume !== undefined) {
    const own = deviceKeypadLists(c, roles.volume);
    for (const scan of VOLUME_SCANS) {
      const list = own.get(scan);
      if (list !== undefined) keys.set(scan, list);
    }
  }
  return [...keys].sort((a, b) => a[0] - b[0]).map(([scan, list]) => ({ scan, list }));
}

/** A command for the activity's screen: which device's, and the label its own screen draws it under. */
export interface ActivityScreenPick {
  readonly group: number;
  readonly label: string;
}

/**
 * The activity screen's rows from the commands chosen for it, each resolved to the device's own screen
 * item of that label, so it runs the same list and is drawn under the same name. Refused where the
 * device's own screen has no such item, rather than reaching for a keypad command or a catalogue name,
 * since neither says how the remote should label it.
 */
export function activityScreenRows(c: Container, picks: readonly ActivityScreenPick[]): ComposeRow[] {
  return picks.map((pick) => {
    const found = deviceScreenItems(c, pick.group).find((one) => one.label === pick.label);
    if (found === undefined) {
      throw new ComposeError(`device ${pick.group}'s own screen has no command labelled '${pick.label}'`);
    }
    return { label: found.label, list: found.list };
  });
}

/**
 * The roles a compiled activity's sends imply, for an activity whose roles nothing states: the device
 * its VolumeUp key sends to, and the device most of its other keys send to. An inference, and named as
 * one wherever it is used. Undefined where the activity's keys send nothing to choose from.
 */
export function activityRolesFromSends(c: Container, activity: number): ActivityRoles {
  const one = activities(c).find((each) => each.activity === activity);
  const sets = handlerSets(c);
  if (one === undefined || sets === undefined) throw new ComposeError(`activity ${activity} does not exist`);
  const codes = infraredCodesPerList(c);
  const tally = new Map<number, number>();
  let volume: number | undefined;
  for (const entry of taggedList(c, sets.addresses[one.set] as number)?.entries ?? []) {
    if (entry.tag >> 6 !== PRESS || entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
    const group = codes.get(entry.operand)?.[0]?.group;
    if (group === undefined) continue;
    const scan = entry.tag & 0x3f;
    if (scan === VOLUME_SCANS[0]) volume = group;
    else if (!VOLUME_SCANS.includes(scan)) tally.set(group, (tally.get(group) ?? 0) + 1);
  }
  const control = [...tally].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
  return { volume, control };
}
