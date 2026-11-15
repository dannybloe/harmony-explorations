/**
 * An activity's keypad map and screen commands, built from its **roles** rather than copied from
 * another activity. Harmony 600, 650 and 700, section 323.
 *
 * Logitech's platform states an activity as roles, `reference/logitech/data-model/model.md`: a device that shows the
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
 * **Help is left out of the keypad map, deliberately**, a choice of ours with no decision yet: Help is
 * scan 3's release and repeat, and no device mode binds scan 3, so a map built from roles never holds it.
 * Logitech's compiles bind it in every activity's own map, release and repeat, 40 of 40, section 333, and
 * the four slot track builds without Help, so on an activity built here Help does nothing. The reference
 * states only the compiler's half, `reference/architectures/harmony-600-650-700/compiler.md`.
 *
 * **Roles are read off a compiled activity's sends where nothing states them**, `activityRolesFromSends`:
 * the volume device is the one VolumeUp sends to and the control device the one most other keys send
 * to. That is an inference, and it is checked against the devices Logitech's stated button maps give
 * the two activities of the calibration Harmony 600's account record.
 */
import type { Container } from '../container/gspm.ts';
import {
  ACTION_LIST_INDEX_OPCODE, handlerSets, modeRecords, taggedList,
} from '../container/sections.ts';
import {
  activities, deviceModeMaps, devices, deviceVariables, INPUT_PROPERTY, infraredCodesPerList, POWER_PROPERTY,
} from '../inventory/inventory.ts';
import { familyOf, traitsOf } from '../families/registry.ts';
import { ComposeError, type ComposeActivityTarget, type ComposeRow } from './compose.ts';
import { activityStartTargets } from './inputs.ts';

/** A press, the event type of every key binding that sends anything, section 17. */
const PRESS = 2;

/**
 * The keys section 323's rule names, per family, `Family.activityKeyRules`: which keys an activity takes from
 * its volume device, and the keys its three refinements move. Data of the family because they are its keypad's
 * scans; the rule is the same on the Harmony 600, 650 and 700 and on the Harmony One, section 398.
 *
 * **A key is a scan by default and may be anything a caller names keys by**, `K`: the rule itself,
 * `activityKeysOfDevices`, only asks whether two keys are the same key, so the container's caller hands it scans and a
 * family's maps hand it Logitech's words for the same keys, decision 43, `keyRulesIn` turning the one into the other.
 */
export interface ActivityKeyRules<K = number> {
  /** VolumeUp, VolumeDown and Mute: the keys taken from the volume device. */
  readonly volume: readonly K[];
  /**
   * Keys taken from another key of the control device when its own map leaves them unbound, as key and the
   * key it falls back to: the arrows beside the direction pad, which an activity sends DirectionUp and
   * DirectionDown on.
   */
  readonly fallback: ReadonlyMap<K, K>;
  /**
   * ChannelUp and ChannelDown, and what an activity puts on them instead when the control device's own map has
   * them doing the direction pad's job: SkipForward and SkipBack. A disc player carries its DirectionUp and
   * DirectionDown on the channel keys, and the compiler gives the activity the skip keys there instead.
   */
  readonly channel: readonly [K, K];
  readonly direction: readonly [K, K];
  readonly skip: readonly [K, K];
  /** The Exit key, which takes the control device's own `Exit` screen command where it has one. */
  readonly exit: K;
  /**
   * A key whose partner the control device's own map binds and which it leaves unbound itself, and the screen
   * commands of the device it then takes, in order: the Harmony One's lower arrow, which takes `PageDown` or
   * `StepBack` off the device's screen where its own map put `PageUp` or `StepForward` on the upper one. The
   * order is a choice of ours: no control device of the three activities it was read on draws both, section 398.
   * `scan` is the key, named so from when every key here was one.
   */
  readonly partners?: readonly { readonly scan: K; readonly when: K; readonly names: readonly string[] }[];
}

/**
 * A family's rules with every key named another way, by `name`: how a family's maps state its scans' rules in the
 * words its places use, so the rule is given the same keys either way and the rules stay one table, the family's.
 * Refused where `name` has no word for a key the rules name, since a rule on an unnamed key would silently drop it.
 */
export function keyRulesIn<K, J>(rules: ActivityKeyRules<K>, name: (key: K) => J | undefined): ActivityKeyRules<J> {
  const of = (key: K): J => {
    const named = name(key);
    if (named === undefined) throw new ComposeError(`the activity key rules name a key with no other name, ${String(key)}`);
    return named;
  };
  const pair = (keys: readonly [K, K]): readonly [J, J] => [of(keys[0]), of(keys[1])];
  return {
    volume: rules.volume.map(of),
    fallback: new Map([...rules.fallback].map(([key, from]) => [of(key), of(from)])),
    channel: pair(rules.channel), direction: pair(rules.direction), skip: pair(rules.skip),
    exit: of(rules.exit),
    ...(rules.partners === undefined ? {} : {
      partners: rules.partners.map((one) => ({ scan: of(one.scan), when: of(one.when), names: one.names })),
    }),
  };
}

/** The label of a device's own Exit command where its map puts another on the Exit key. */
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
  /** The label as drawn, its lines joined with a space. */
  readonly label: string;
  readonly list: number;
  /** The label's lines as drawn, where a family breaks a name over lines by a rule `drawsName` reapplies. */
  readonly lines?: readonly string[];
}

/** The configuration's family, which reads its own screens; a configuration no family serves is refused. */
function screenFamily(c: Container) {
  const family = familyOf(c);
  if (family === undefined) throw new ComposeError(`no family reads the screens of arch ${c.architecture}`);
  return family;
}

/** A device's own screen commands, page by page, in the order its family's pages fill, `Family.screenItems`. */
export function deviceScreenItems(c: Container, group: number): DeviceScreenItem[] {
  const map = deviceModeMaps(c).find((one) => one.group === group);
  if (map === undefined) throw new ComposeError(`device ${group} has no device mode record`);
  return modeScreenItems(c, map.mode);
}

/** The items of every page of a mode, in page order and the family's item order, `Family.screenItems`. */
export function modeScreenItems(c: Container, mode: number): DeviceScreenItem[] {
  return screenFamily(c).screenItems(c, mode);
}

/** Whether an item is drawn the way its family draws `name`, `Family.drawsName`. */
export function drawsName(c: Container, item: DeviceScreenItem, name: string): boolean {
  return screenFamily(c).drawsName(c, item, name);
}

/**
 * One device as the activity rule reads it: its own keypad map, key to command, and its own screen's commands in
 * order, each with whether it is drawn as a given name. A command is whatever the caller names commands by, a list on
 * a container, a command's name in a family's maps; the rule only asks whether two are the same. The screen is a
 * function so that it is read only for the control device, whose screen two refinements look in, and never for the
 * volume device: `activityKeysOfDevices` asks for it once whenever there is a control device, whether or not a
 * refinement then finds anything on it.
 */
export interface KeyRuleDevice<K, C> {
  readonly keys: ReadonlyMap<K, C>;
  readonly screen: () => readonly { readonly command: C; readonly draws: (name: string) => boolean }[];
}

/** One key of an activity's map as the rule gives it: the command, and which of the two devices it is the command of. */
export interface RuleBinding<C> {
  readonly from: 'control' | 'volume';
  readonly command: C;
}

/**
 * **The activity keypad rule**, section 323, over two devices' own maps: the volume keys from the volume device's own
 * map, everything else from the control device's, and then the three refinements. The first is read off the compiles
 * and is right on five distinct activities and wrong on four; the other two fire on one activity, the calibration disc
 * player's, where they agree with Logitech's stated map, so they are fitted to it:
 *
 * - the arrows, on a Harmony 600 scans 26 and 27, fall back to the control device's DirectionUp and
 *   DirectionDown when its own map leaves them unbound;
 * - ChannelUp and ChannelDown take SkipForward and SkipBack when the control device's own map has the
 *   channel keys doing the direction pad's job;
 * - Exit takes the control device's own `Exit` screen command when it has one, which is where its own
 *   map put the command it calls Exit after giving the key to something else.
 *
 * The keys are the family's, `ActivityKeyRules`. On the Harmony One the rule holds with its own keys and one addition,
 * section 398: the lower arrow takes the device's `PageDown` or `StepBack` off its screen where its own map put the
 * partner on the upper one.
 *
 * **The one rule, with two callers**, decision 43: `activityKeysFromRoles` reads the two maps off a container and names
 * a command by the list it runs, and a family's maps name keys by Logitech's words and commands by their names, so
 * what an application is shown for an activity's key before anything is built is what the build gives it. Pure.
 * The map's order is the order the rule set its keys in, which neither caller relies on.
 */
export function activityKeysOfDevices<K, C>(
  rules: ActivityKeyRules<K>, control: KeyRuleDevice<K, C> | undefined, volume: KeyRuleDevice<K, C> | undefined,
): Map<K, RuleBinding<C>> {
  const keys = new Map<K, RuleBinding<C>>();
  const fromControl = (command: C): RuleBinding<C> => ({ from: 'control', command });
  if (control !== undefined) {
    const own = control.keys;
    for (const [key, command] of own) if (!rules.volume.includes(key)) keys.set(key, fromControl(command));
    for (const [key, from] of rules.fallback) {
      const fallback = own.get(from);
      if (!own.has(key) && fallback !== undefined) keys.set(key, fromControl(fallback));
    }
    const channelIsDirection = rules.channel.every((key, k) =>
      own.has(key) && own.get(key) === own.get(rules.direction[k] as K));
    if (channelIsDirection && rules.skip.every((key) => own.has(key))) {
      rules.channel.forEach((key, k) => keys.set(key, fromControl(own.get(rules.skip[k] as K) as C)));
    }
    const items = control.screen();
    const exit = items.find((one) => one.draws(EXIT_LABEL));
    if (exit !== undefined) keys.set(rules.exit, fromControl(exit.command));
    for (const partner of rules.partners ?? []) {
      if (own.has(partner.scan) || !own.has(partner.when)) continue;
      const item = partner.names.map((name) => items.find((one) => one.draws(name))).find((one) => one !== undefined);
      if (item !== undefined) keys.set(partner.scan, fromControl(item.command));
    }
  }
  if (volume !== undefined) {
    for (const key of rules.volume) {
      const command = volume.keys.get(key);
      if (command !== undefined) keys.set(key, { from: 'volume', command });
    }
  }
  return keys;
}

/**
 * The activity's keypad map from its roles: a scan and the list its press runs, ascending by scan,
 * ready for `composeActivity`'s `keys`.
 *
 * The rule is `activityKeysOfDevices`; this is its caller on a container. Each device's own map is read off the
 * configuration, a command named by the list it runs, and a screen item by the list its key runs, which on the Harmony
 * One is the send a screen command calls rather than the command with its click, section 398, `keyListOfItem`; an
 * item is drawn as a name the way its family draws it, `drawsName`.
 *
 * The **order** of the set's entries is not this function's: `composeActivity` writes the set, and a
 * set's entries are in Java's hash bucket order, `keyListBucket`, on 40 of 40 activity sets, with the
 * order inside a bucket depending on the order they were added, which is not established.
 */
export function activityKeysFromRoles(c: Container, roles: ActivityRoles): { scan: number; list: number }[] {
  const rules = screenFamily(c).activityKeyRules;
  const view = (group: number): KeyRuleDevice<number, number> => ({
    keys: deviceKeypadLists(c, group),
    screen: () => deviceScreenItems(c, group).map((item) => ({
      command: keyListOfItem(c, item.list), draws: (name: string) => drawsName(c, item, name),
    })),
  });
  // The control device's own map read before the volume device's, as before the rule was a function of its own; its
  // screen is now read after the volume device's map rather than before, which changes only which refusal a
  // configuration failing on both gives first.
  const control = roles.control === undefined ? undefined : view(roles.control);
  const volume = roles.volume === undefined ? undefined : view(roles.volume);
  const keys = activityKeysOfDevices(rules, control, volume);
  return [...keys].sort((a, b) => a[0] - b[0]).map(([scan, one]) => ({ scan, list: one.command }));
}

/**
 * The list a key runs for a screen command: the item's own where a screen item is the command alone, and the
 * list it calls where a screen item opens with the click, `FamilyTraits.screenItemsBeep`, the Harmony One's,
 * whose activity keys run the send without the click on four of four, section 398, which are one activity in four
 * compiles.
 */
function keyListOfItem(c: Container, list: number): number {
  if (!traitsOf(c).screenItemsBeep) return list;
  const last = (c.actionLists() ?? [])[list]?.at(-1);
  return last?.opcode === ACTION_LIST_INDEX_OPCODE ? last.operand : list;
}

/** A command for the activity's screen: which device's, and the label its own screen draws it under. */
export interface ActivityScreenPick {
  readonly group: number;
  readonly label: string;
}

/**
 * The activity screen's rows from the commands chosen for it, each resolved to the device's own screen
 * item of that label, so it runs the same command and is drawn under the same name. Refused where the
 * device's own screen has no such item, rather than reaching for a keypad command or a catalogue name,
 * since neither says how the remote should label it.
 */
export function activityScreenRows(c: Container, picks: readonly ActivityScreenPick[]): ComposeRow[] {
  return picks.map((pick) => {
    const found = deviceScreenItems(c, pick.group).find((one) => drawsName(c, one, pick.label));
    if (found === undefined) {
      throw new ComposeError(`device ${pick.group}'s own screen has no command labelled '${pick.label}'`);
    }
    // The command under the device page's click, since the activity screen's pad clicks itself: the item's own
    // list would click twice, section 404.
    return { label: pick.label, list: keyListOfItem(c, found.list) };
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
  const volumeKeys = screenFamily(c).activityKeyRules.volume;
  const tally = new Map<number, number>();
  let volume: number | undefined;
  for (const entry of taggedList(c, sets.addresses[one.set] as number)?.entries ?? []) {
    if (entry.tag >> 6 !== PRESS || entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
    const group = codes.get(entry.operand)?.[0]?.group;
    if (group === undefined) continue;
    const scan = entry.tag & 0x3f;
    if (scan === volumeKeys[0]) volume = group;
    else if (!volumeKeys.includes(scan)) tally.set(group, (tally.get(group) ?? 0) + 1);
  }
  const control = [...tally].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
  return { volume, control };
}

/**
 * The jobs a device can do in an activity, by the names Logitech's contract gives their role types,
 * `reference/logitech/data-model/model.md`. A device listed with **none** of them is a pass through device, the
 * contract's `PassThroughActivityRole`: one the signal passes through unaltered, an HDMI switch or an
 * amplifier that only routes the picture. MyHarmony states it as a role of its own; here it is the
 * empty list, because it does none of the jobs and the compile gives it nothing a job would.
 */
export const ACTIVITY_ROLE_NAMES = ['Display', 'Volume', 'ChannelChanging', 'PlayMovie', 'PlayMedia', 'PlayGame'] as const;
export type ActivityRoleName = (typeof ACTIVITY_ROLE_NAMES)[number];

/** The roles that make a device the control device when no device changes channels, section 323. */
const PLAY_ROLES: readonly ActivityRoleName[] = ['PlayMovie', 'PlayMedia', 'PlayGame'];

/** One device of an activity in the platform's terms: which device, its jobs, and its input. */
export interface ActivityDevice {
  /** The device, as an index into base slot 5's group array, as `ActivityRoles` names it. */
  readonly group: number;
  /** Its jobs in this activity. Empty is a pass through device, switched on and to its input only. */
  readonly roles: readonly ActivityRoleName[];
  /**
   * The input the activity puts it on: what `inputTarget` gives for a composed device, or the device's
   * own `Input` variable and a value for one already in the configuration. It must be this device's.
   */
  readonly input?: ComposeActivityTarget;
}

/** What `activityFromRoles` hands `composeActivity` and `activityKeysFromRoles`. */
export interface ActivityFromRoles {
  /** The start's writes in Logitech's order: power on, inputs, every other device off. */
  readonly targets: ComposeActivityTarget[];
  /** The volume and control devices, for `activityKeysFromRoles`. */
  readonly roles: ActivityRoles;
  /** The devices listed with no role, in the order given, for a caller to report. */
  readonly passThrough: number[];
}

/**
 * An activity stated the way MyHarmony states it, devices with roles, turned into what the composer
 * takes: the start's writes and the two devices the keypad is built from, a pass
 * through device among them.
 *
 * **Every device listed is switched on and put on its input, whatever its roles**, and that is the
 * whole of what Logitech's compiler does for a pass through device. Measured on the one compile in the
 * lab whose saved activity states one, `h650_start_config`'s "Kodi kijken" with the Ligawo HDMI switch
 * saved under `PassThroughActivityRole` on Input 2: the switch's power is the third write of the
 * start's power on list, after the television's and Kodi's, in the order the saved roles number their
 * `PowerOnOrder`, 1 to 3; its input is the second write of the input list, after the television's; the
 * same input write is in the list that picking the activity again runs; the switch is third on the
 * activity's own device list; and **no key of the activity's keypad map and no item of its working
 * screen sends one of its codes**. The other three activities of that compile hold the switch in their
 * power off lists, as every device an activity does not use.
 *
 * **So the pass through role leaves no trace of its own in the compile.** A display device with no
 * screen items has the same shape, "TV kijken"'s television in the same compile, so the role cannot be
 * read back off a configuration, and the empty list here is the platform's statement carried as an
 * input.
 *
 * The order of the start is `activityStartTargets`', which this calls rather than repeats: power on in
 * the order the devices are listed, then their inputs in the same order, then 0 into every other
 * device's power. A device with **no power variable**, an always on device such as a media player, is
 * left out of the power writes and keeps its roles: Logitech's compiler writes an instruction of
 * opcode and operand zero in its place, section 294, which `composeActivity` does not write.
 *
 * The roles go the way section 323 measured: the volume keys to the device with `Volume`, everything
 * else to the one with `ChannelChanging`, or where none changes channels the one that plays. A display
 * or a pass through device contributes no key. Two devices claiming one of those two jobs are refused,
 * since the keypad follows only one.
 */
export function activityFromRoles(c: Container, listed: readonly ActivityDevice[]): ActivityFromRoles {
  const variables = deviceVariables(c);
  const byGroup = new Map(devices(c).map((one) => [one.group, one]));
  const seen = new Set<number>();
  const on: number[] = [];
  const inputs: ComposeActivityTarget[] = [];
  const passThrough: number[] = [];
  for (const one of listed) {
    const device = byGroup.get(one.group);
    if (device === undefined) throw new ComposeError(`device ${one.group} is not a device of this configuration`);
    if (seen.has(one.group)) throw new ComposeError(`device ${one.group} is listed twice`);
    seen.add(one.group);
    const own = variables.filter((variable) => device.variables.includes(variable.index));
    const power = own.find((variable) => variable.property === POWER_PROPERTY);
    if (power !== undefined) on.push(power.index);
    const input = one.input;
    if (input !== undefined) {
      // An input target of another device would switch that device's input while this one stays where
      // it was, and the start would read correctly to everything but the person watching.
      if (own.find((variable) => variable.index === input.variable)?.property !== INPUT_PROPERTY) {
        throw new ComposeError(`variable ${input.variable} is not device ${one.group}'s input`);
      }
      inputs.push(input);
    }
    if (one.roles.length === 0) passThrough.push(one.group);
  }
  const { volume, control } = keyDevicesOfRoles(listed, (one) => one.group);
  return { targets: activityStartTargets(c, on, inputs), roles: { volume, control }, passThrough };
}

/**
 * **The two devices an activity's keys follow, from the roles its devices are listed with**, section 323: the volume
 * device holds `Volume`; the control device holds `ChannelChanging`, or where none does, one of the play roles. Two
 * devices holding one of those jobs are refused, since the keys follow only one. Pure and named by `nameOf`, so a
 * caller that names a device otherwise than by a group, a document family by the device's name, asks the same rule
 * rather than keeping a copy of it; `activityFromRoles` is one caller.
 */
export function keyDevicesOfRoles<T extends { readonly roles: readonly ActivityRoleName[] }, N>(
  listed: readonly T[], nameOf: (one: T) => N,
): { readonly volume: N | undefined; readonly control: N | undefined } {
  const holding = (roles: readonly ActivityRoleName[]): N | undefined => {
    const found = listed.filter((one) => one.roles.some((role) => roles.includes(role)));
    if (found.length > 1) {
      throw new ComposeError(`devices ${found.map(nameOf).join(' and ')} both hold ${roles.join(' or ')}`);
    }
    return found[0] === undefined ? undefined : nameOf(found[0]);
  };
  return { volume: holding(['Volume']), control: holding(['ChannelChanging']) ?? holding(PLAY_ROLES) };
}
