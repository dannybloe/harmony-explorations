/**
 * **A Harmony Touch's default button maps, derived by rule from a device's command names and an activity's roles**:
 * which command each key sends in device mode, its long press, what goes on the device's screen list and in what
 * order, and for an activity which device answers each key, its gestures and its number pad.
 *
 * **Why a rule and not a table of Logitech's.** A Touch's maps are documents its account holds, one per device and
 * one per activity, and Logitech's service fills them in when a device or an activity is added: their client asks the
 * service for the defaults (`GetDefaultButtonMaps`, and `RestoreToDefaultButtonMaps` to go back to them) and derives
 * none itself, so the rule that makes them is not in any code this project can read. What can be read is what it
 * made: the bench setup, `packages/corpus/setups/touch-test.json`, whose maps were described from a set the service
 * built for seven devices and five activities, on an account filled partly by a script and partly by hand in
 * Logitech's client, `docs/test-notes/harmony-touch.md`; nothing records which maps the hand part changed. This module
 * is a rule fitted to that sample, and `test/families/harmony-touch/touch-default-maps.test.ts` scores it against
 * every map of the setup, exactly, with every difference listed and given a kind. **It does not have to equal
 * Logitech's defaults**: a person reviews the map in the application. **Seven devices is a small sample**: a
 * preference below that the sample exercises on one device, or not at all, is marked a hypothesis.
 *
 * **What a device mode key sends.** Each of the Touch's 26 keys, `BUTTON_KEYS`, has a list of the key's **own**
 * commands, the command named as the key and the catalogue's other names for the same function (`Mute` on
 * VolumeMute, `OK` and `Enter` on Select), and a list of **fallbacks**, a command doing a neighbouring job that the
 * key takes when the device has none of its own (`Home` on Menu, `DirectionUp` on Channel up, `SkipBack` on Rewind).
 * The key sends the first of the two lists, in order, that the device has, matched without regard to case as the
 * engine finds a command, and nothing when it has none. **A long press** is the first of the key's long press list the
 * device has, unless that is the command the press already sends. **That exception is a hypothesis resting on one
 * device and contradicted by another**: a long press equal to its press would arise on two devices of the seven only,
 * the Denon, where the setup states none on the three keys concerned (Rewind, Fast forward and Previous channel), and
 * the LG TV, where it states one on Menu, Home on both, which the score lists as a difference.
 *
 * **What goes on the device's screen list.** Every command of the device, but those a key takes as its own (by press
 * or by long press), and those the number pad draws. A command a key takes as a fallback **stays on the list too**:
 * the LG TV's Home on Menu, the Denon's SkipBack and SkipForward, the Xbox's A, B, X and Y on the colour keys. The
 * score's control that takes a fallback off the list as well loses 11 of the 254 entries and leaves 82 at their index
 * where this rule leaves 252. One reading
 * of the Denon rests on it: its Info command is on no key in the setup and still off its list, which an Info key
 * sending Info at some point would explain, while ModeJazzClub, which its Info key sends, is still on the list. That
 * is why the score suspects a hand edit there; it is a reading, not a record.
 *
 * **The number pad**, `FunctionGroupType` 2, holds the digits by name, `1` to `9` at 0 to 8 and `0` at 10, and the
 * two keys beside 0, at 9 and 11, each the first of a list the device has among the commands left for the screen,
 * `DEFAULT_PAD_LEFT` and `DEFAULT_PAD_RIGHT`. A device with any digit also gets the entry labelled `123`, group 36,
 * the client action that opens the pad, at its place in the list's numbering.
 *
 * **The list's order**: Home, the `123` entry, the three power commands, then `SCREEN_LEADS` where the device has
 * them, then every other command sorted without regard to case and with the hyphen ignored. Indices run on from 0
 * across group 0 and group 36, `activities-and-buttons.md` "Screen entries and the number pad".
 *
 * **Two things Logitech's maps do that this does not.** The LG TV's `-` and the Xbox's `#`, each a mark the pad draws
 * beside 0, are list entries in Logitech's maps written at index 11, the pad's right key, where another list entry
 * already is, with their own place in the list's numbering left empty. The remote keeps only the later of two entries
 * on one index, and the test notes record the LG TV's `-` and the Xbox's `B`, the Xbox's other entry on index 11,
 * missing from the screens after a sync, `docs/test-notes/harmony-touch.md`; so the LG TV's mark is hidden and the
 * Xbox's hides another. This rule writes the marks at their empty place, which is a list without a hole and without
 * two entries on one index. The score counts the two as differences of their own kind.
 *
 * **An activity's keys** follow the roles its devices hold, by the compiled families' rule itself, `keyDevicesOfRoles`
 * in `compose/activityroles.ts`, section 323, which the setup's five activities agree with: the volume keys go to the
 * device holding `Volume`; every other key to the device holding `ChannelChanging`, or where none does, the one
 * holding a play role; and the key sends what that device's own map sends for the same key, press and long press.
 * Two devices holding one of those roles are refused, as that rule refuses them: no setup under
 * `packages/corpus/setups/` has such an activity, and what a Touch does with two volume roles is not read in its
 * firmware, `activities-and-buttons.md` "An activity: what it is made of", so taking the first would be a guess. A key that
 * device's map leaves unbound stays unbound in the activity: no other device of the activity fills it. **Three
 * differences from the device's own map**, `ACTIVITY_KEY_CHANGES`, each fitted to one or two activities and so a
 * hypothesis: the channel keys carry no long press (Play a Game holds neither of the Xbox's PageUp and PageDown); where the
 * device has no channel command of its own they take its chapters rather than its own map's fallback (Watch a Blu-ray,
 * ChapterNext where the Blu-ray's own map sends DirectionUp); and Stop held ejects the disc where the device's own
 * Stop has no long press (Watch a Blu-ray and Play a Game).
 *
 * **An activity's gestures**: none on an activity of the Custom type; on every other, the five gestures, the swipes
 * up and down the volume device's volume keys, the swipes left and right the control device's Rewind and Fast forward
 * keys with their long presses, and Tap the control device's Play, held the volume device's mute, tapped twice its
 * Pause. The reference states the Custom exception for these documents and that whether it is Logitech's rule is not
 * checked, `activities-and-buttons.md` "Gestures"; the setup holds one Custom activity, so it is a hypothesis.
 *
 * **An activity's number pad**: the digits of the control device, and each key beside 0 from the first device of the
 * activity, the control device first, whose own pad holds one there; one activity, Switch Box, exercises the order.
 *
 * **What the rule does not state**: anything on an activity's screen list but its number pad, and whatever a person
 * changes. Those stay a person's choice in a document.
 *
 * **Nothing here is about another remote**: a Touch's documents are read by the Touch alone, so this is the Touch
 * family's own, and it is measured on one setup of seven devices and five activities of one remote. A Harmony Touch's
 * firmware reports architecture 17 and Logitech's templates file the Harmony Touch under 18.
 */
import { keyDevicesOfRoles, type ActivityRoleName } from '../../compose/activityroles.ts';
import { BUTTON_KEYS, type TouchButtonKey, type TouchGestureKey } from './compose.ts';
import { NUMBER_PAD_LEFT, NUMBER_PAD_RIGHT } from './read.ts';

// ---------------------------------------------------------------------------------------------------
// Device mode: the keys
// ---------------------------------------------------------------------------------------------------

/**
 * One key of the Touch in device mode: the commands that are its own, the ones it falls back on, and its long press.
 * Each list is in order of preference, the first the device has being the one bound.
 */
export interface TouchKeyRule {
  readonly key: TouchButtonKey;
  /** The command named as the key and the catalogue's other names for its function; taken off the screen list. */
  readonly own: readonly string[];
  /** Commands doing a neighbouring job, taken only when the device has none of `own`; left on the screen list. */
  readonly fallback?: readonly string[];
  /** The long press, when the device has one of these and it is not what the press sends. */
  readonly long?: readonly string[];
}

/**
 * The Touch's 26 keys, fitted to the seven devices of the bench setup. **Hypothesis** marks a preference the sample
 * exercises on one device only, or an order no device of the sample decides because none holds two of the names.
 *
 * Read against `HARD_KEYS`, this project's table for the Harmony 600, 650 and 700, fitted on twenty devices of their
 * configurations and held against two of Logitech's maps: the Touch's Exit takes Back before Return and no Cancel or
 * Clear; its Stop falls back on Back, where that table takes Pause; Previous channel takes Prev and Back; and the
 * colour keys fall back on a games console's buttons.
 */
export const TOUCH_KEY_RULES: readonly TouchKeyRule[] = [
  // Hypotheses both: Home pressed on the LG TV alone, which has no Menu; Home held on the Blu-ray alone, which has
  // both (the LG TV's Home held is the long press equal to its press, the module docstring's exception).
  { key: 'Menu', own: ['Menu'], fallback: ['Home'], long: ['Home'] },
  // Hypotheses: Back on the Denon alone, which has Back and Return; Return on the Blu-ray alone, which has no Back.
  // The Xbox has Back and states no Exit at all, which no order can give, and the score lists it.
  { key: 'Exit', own: ['Exit', 'Back', 'Return'] },
  // Display on the Blu-ray alone, a hypothesis; the Xbox has both and takes Info.
  { key: 'Info', own: ['Info', 'Display'] },
  // Hypotheses: Prev the Plex's alone, Back the Denon's alone and Return the Blu-ray's alone. Back held on the LG TV
  // and the Xbox, which keeps it off their lists although no press sends it.
  { key: 'PrevChannel', own: ['ChannelPrev', 'Prev', 'Back', 'Return'], long: ['Back'] },
  // `Xbox Guide` before `Guide` rests on the Xbox alone, a hypothesis; its list holds Guide and not Xbox Guide, which
  // fits Xbox Guide being on the key from the start, a reading. The fallbacks: Select on the Blu-ray alone and Enter
  // on the Denon alone, OK on none; their order is a hypothesis, since no device the fallback reaches holds two.
  { key: 'Guide', own: ['Xbox Guide', 'Guide'], fallback: ['Select', 'Enter', 'OK'] },
  // A games console's four buttons by their colour on its pad, the Xbox's alone, a hypothesis.
  { key: 'Red', own: ['Red'], fallback: ['B'] },
  { key: 'Green', own: ['Green'], fallback: ['A'] },
  { key: 'Yellow', own: ['Yellow'], fallback: ['Y'] },
  { key: 'Blue', own: ['Blue'], fallback: ['X'] },
  { key: 'VolumeUp', own: ['VolumeUp'] },
  { key: 'VolumeDown', own: ['VolumeDown'] },
  { key: 'VolumeMute', own: ['Mute'] },
  { key: 'DirectionUp', own: ['DirectionUp'] },
  { key: 'DirectionDown', own: ['DirectionDown'] },
  { key: 'DirectionLeft', own: ['DirectionLeft'] },
  { key: 'DirectionRight', own: ['DirectionRight'] },
  // OK on the LG TV, the Plex (spelt Ok) and the Xbox, which has Enter too, so OK before Enter rests on the Xbox
  // alone; Enter on the Denon alone. Both hypotheses.
  { key: 'Select', own: ['Select', 'OK', 'Enter'] },
  // Hypotheses all: TuneUp and TuneDown on the Denon alone, which has PresetNext too; DirectionUp and DirectionDown on
  // the Blu-ray alone. PageUp and PageDown held on the Denon and the Xbox.
  { key: 'ChannelUp', own: ['ChannelUp', 'TuneUp'], fallback: ['DirectionUp'], long: ['PageUp'] },
  { key: 'ChannelDown', own: ['ChannelDown', 'TuneDown'], fallback: ['DirectionDown'], long: ['PageDown'] },
  { key: 'DVR', own: ['DVR'] },
  // SkipBack and SkipForward pressed on the Denon alone, which has no Rewind, a hypothesis. Held, each device's skip
  // by whichever name it has, each name a hypothesis on one device: the Blu-ray's ChapterPrev and ChapterNext, the
  // Plex's SkipBackward, the KPN's Replay and Advance, the Xbox's SkipBack; SkipForward held on the Plex and the Xbox.
  { key: 'Rewind', own: ['Rewind'], fallback: ['SkipBack'], long: ['ChapterPrev', 'SkipBack', 'SkipBackward', 'Replay'] },
  { key: 'FastForward', own: ['FastForward'], fallback: ['SkipForward'], long: ['ChapterNext', 'SkipForward', 'Advance'] },
  { key: 'Record', own: ['Record'] },
  { key: 'Play', own: ['Play'] },
  { key: 'Pause', own: ['Pause'] },
  // Back on the Denon, which has no Stop, a hypothesis resting on that one device: it has Pause too, which the
  // Harmony 600, 650 and 700's table would take.
  { key: 'Stop', own: ['Stop'], fallback: ['Back'] },
];

/** One key's binding in a device's own map: the command its press sends, and its long press where it has one. */
export interface DefaultKey {
  readonly press: string;
  readonly longPress?: string;
}

/** A device's own map's keys, by key. A key it leaves unbound is absent. */
export type DefaultDeviceKeys = Partial<Record<TouchButtonKey, DefaultKey>>;

/** The device's spelling of each command, by the name folded to lower case, as the engine finds a command. */
function spellings(commands: readonly string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const name of commands) if (!out.has(name.toLowerCase())) out.set(name.toLowerCase(), name);
  return out;
}

/** The first of `wanted` the device has, in the device's own spelling. */
function firstHeld(spelt: ReadonlyMap<string, string>, wanted: readonly string[] | undefined): string | undefined {
  for (const name of wanted ?? []) {
    const own = spelt.get(name.toLowerCase());
    if (own !== undefined) return own;
  }
  return undefined;
}

/** The keys and, beside them, the commands they take as their own, which the screen list leaves out. */
function keysAndOwn(commands: readonly string[], rules: readonly TouchKeyRule[]): { keys: DefaultDeviceKeys; own: Set<string> } {
  const spelt = spellings(commands);
  const keys: DefaultDeviceKeys = {};
  const own = new Set<string>();
  for (const rule of rules) {
    const mine = firstHeld(spelt, rule.own);
    const press = mine ?? firstHeld(spelt, rule.fallback);
    if (press === undefined) continue;
    if (mine !== undefined) own.add(mine);
    const held = firstHeld(spelt, rule.long);
    const longPress = held === undefined || held === press ? undefined : held;
    // A long press of a command that is one of the key's own presses, Back on Previous channel, leaves the list too:
    // the LG TV's and the Xbox's Back are on no press and off their lists.
    if (longPress !== undefined && rule.own.some((name) => name.toLowerCase() === longPress.toLowerCase())) own.add(longPress);
    keys[rule.key] = longPress === undefined ? { press } : { press, longPress };
  }
  return { keys, own };
}

/** The keys a device's own map binds by default, from its command names, in the order of `BUTTON_KEYS`. */
export function defaultDeviceKeys(commands: readonly string[], rules: readonly TouchKeyRule[] = TOUCH_KEY_RULES): DefaultDeviceKeys {
  const { keys } = keysAndOwn(commands, rules);
  const out: DefaultDeviceKeys = {};
  for (const key of BUTTON_KEYS) if (keys[key] !== undefined) out[key] = keys[key];
  return out;
}

// ---------------------------------------------------------------------------------------------------
// Device mode: the screen list and the number pad
// ---------------------------------------------------------------------------------------------------

/** The list's group, the number pad's, and the group of the entry that opens the pad, `BUTTON_GROUPS`. */
export const LIST_GROUP = 0;
export const PAD_GROUP = 2;
export const PAD_OPENER_GROUP = 36;

/** Where the pad holds each digit: `1` to `9` from 0, and `0` below 8's row, at 10. */
export const DIGIT_SLOTS: Readonly<Record<string, number>> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 0: 10 };
/** The pad's keys left and right of 0, by their place in the pad's numbering. */
export const LEFT_SLOT = 9;
export const RIGHT_SLOT = 11;

/** One key of the number pad: its slot in the pad's numbering, and the command names the pad screen draws on it. */
export interface PadKey {
  readonly slot: number;
  readonly draws: readonly string[];
}

/**
 * **What the number pad screen draws on each of its twelve keys**, by slot: each digit's own name on its key, and on
 * the keys beside 0 the firmware's lists, `NUMBER_PAD_LEFT` and `NUMBER_PAD_RIGHT` in `read.ts`; the screen places an
 * entry of the pad's group by its command's name, and an entry of any other name on no key,
 * `activities-and-buttons.md` "Screen entries and the number pad". The one table the rule reads its digits from and
 * the check of a person's choice on a pad key holds to, `recipemaps.ts`. The rule's own preferences beside 0,
 * `DEFAULT_PAD_LEFT` and `DEFAULT_PAD_RIGHT`, are a choice among a device's commands and not this table: they put the
 * Plex's `Clear` on the left key, which the pad draws on no key, as the score of the rule records.
 */
export const PAD_KEYS: readonly PadKey[] = [
  ...Object.entries(DIGIT_SLOTS).map(([digit, slot]) => ({ slot, draws: [digit] })),
  { slot: LEFT_SLOT, draws: NUMBER_PAD_LEFT },
  { slot: RIGHT_SLOT, draws: NUMBER_PAD_RIGHT },
].sort((a, b) => a.slot - b.slot);

/**
 * The command a default map puts on the pad's key left of 0: `.` on the LG TV, `*` on the Xbox, `Clear` on the Plex,
 * each on that one device, and the order a hypothesis, since none holds two of them. Labelled `NumberPlus` on the LG
 * TV and the Plex; the Xbox's `.` label the score lists.
 * What the pad draws on that key is the firmware's list, `NUMBER_PAD_LEFT` in `read.ts`, which has no `Clear`: the
 * Plex's sits on the key in the document and the pad draws nothing there.
 */
export const DEFAULT_PAD_LEFT: readonly string[] = ['.', '*', 'Clear'];
/**
 * The command a default map puts on the pad's key right of 0: `Enter` on the Plex alone, labelled `Number Enter`, and
 * `NumberEnter` on no device of the sample, both hypotheses. `-` and `#`
 * come first because a device holding one keeps the right key for it, the LG TV and the Xbox, whose `Enter` stays on
 * its list; Logitech's maps then write the mark as a list entry on the right key's index rather than on the pad, which
 * the module docstring describes and this rule does not copy: a mark chosen here goes in the list at its own place,
 * and the pad's right key stays empty. Each of the two rests on one device, a hypothesis; the firmware draws `-` on
 * the key left of 0, `NUMBER_PAD_LEFT` in `read.ts`, so Logitech's index 11 for it is not where the pad would put it.
 * The Denon's Enter is taken by its Select key, so it is not left for the screen and not on the pad.
 */
export const DEFAULT_PAD_RIGHT: readonly string[] = ['-', '#', 'NumberEnter', 'Enter'];
/** The marks a device's right key keeps for itself and the list holds, `DEFAULT_PAD_RIGHT`. */
const LISTED_MARKS: ReadonlySet<string> = new Set(['-', '#']);

/** The labels a default map gives the pad's two keys beside 0, and the entry that opens the pad. */
export const LEFT_LABEL = 'NumberPlus';
export const RIGHT_LABEL = 'Number Enter';
export const PAD_OPENER_LABEL = '123';

/**
 * The commands the list opens with, after Home, the pad's opener and the three power commands, in this order where
 * the device has them. Counted over the seven devices: SkipForward is on three; SkipBack, PageUp and PageDown on two
 * each (the Denon and the Xbox); every other lead on one, a hypothesis each: ChapterPrev, ChapterNext, Open/Close,
 * Subtitle and Audio the Blu-ray's, SkipBackward the Plex's, Replay and Advance the KPN's, LiveTv, Y, B, X, A,
 * Open / Close and Media Center the Xbox's, and `Clear`, on the Plex and the Xbox, a lead on the Xbox only (the
 * Plex's is on its pad's left key and sorted with the rest, which is why the list asks for it only where the pad has
 * not taken it). Advance and Audio change nothing on this sample, the sorted order putting each where it leads,
 * which the score asserts; they are kept as the KPN's and the Blu-ray's own order states them.
 */
export const SCREEN_LEADS: readonly string[] = [
  'Clear',
  'ChapterPrev', 'SkipBack', 'SkipBackward', 'Replay', 'ChapterNext', 'SkipForward', 'Advance', 'PageUp', 'PageDown',
  'LiveTv', 'Y', 'B', 'X', 'A', 'Open/Close', 'Open / Close', 'Media Center', 'Subtitle', 'Audio',
];

/** What the list opens with before `SCREEN_LEADS`: Home, then the pad's opener, then power. */
const SCREEN_HOME = 'Home';
const SCREEN_POWER: readonly string[] = ['PowerToggle', 'PowerOn', 'PowerOff'];

/** What a screen entry does: a command of the device by name, or the client action that opens the pad. */
export type DefaultEntryPress = string | { readonly client: 'Numpad' };

/** One entry of a device's screen: its label, its place, its group, and what it does. */
export interface DefaultEntry {
  readonly entry: string;
  readonly index: number;
  readonly group: number;
  readonly press: DefaultEntryPress;
}

/** What `defaultDeviceEntries` may be told otherwise, so the score can run it with other lists. */
export interface ScreenRules {
  readonly keys?: readonly TouchKeyRule[];
  readonly leads?: readonly string[];
}

/** The pad's entries of a device: its digits and the keys beside 0, from the commands left for the screen. */
function padEntries(left: readonly string[]): DefaultEntry[] {
  const spelt = spellings(left);
  const pad: DefaultEntry[] = [];
  // Each digit by the name the pad draws on its key, `PAD_KEYS`.
  for (const key of PAD_KEYS) {
    if (key.slot === LEFT_SLOT || key.slot === RIGHT_SLOT) continue;
    const own = spelt.get(key.draws[0]!);
    if (own !== undefined) pad.push({ entry: own, index: key.slot, group: PAD_GROUP, press: own });
  }
  const leftKey = firstHeld(spelt, DEFAULT_PAD_LEFT);
  if (leftKey !== undefined) pad.push({ entry: LEFT_LABEL, index: LEFT_SLOT, group: PAD_GROUP, press: leftKey });
  // A mark the right key keeps for itself stays a list entry and leaves the right key empty, `DEFAULT_PAD_RIGHT`.
  const rightKey = firstHeld(spelt, DEFAULT_PAD_RIGHT);
  if (rightKey !== undefined && !LISTED_MARKS.has(rightKey)) pad.push({ entry: RIGHT_LABEL, index: RIGHT_SLOT, group: PAD_GROUP, press: rightKey });
  return pad.sort(byIndex);
}

const byIndex = (a: DefaultEntry, b: DefaultEntry): number => a.index - b.index;

/**
 * A device's screen by default, list and pad: every command of the device but those a key takes as its own and those
 * the pad draws, in the order the module docstring gives, each labelled with its own name; the pad's entries after
 * them, by place. `Clear` on the pad's left key stays on the list as well, since the pad draws no key for it,
 * `activities-and-buttons.md` "Screen entries and the number pad", and the Plex's list holds it.
 */
export function defaultDeviceEntries(commands: readonly string[], rules: ScreenRules = {}): DefaultEntry[] {
  const { own } = keysAndOwn(commands, rules.keys ?? TOUCH_KEY_RULES);
  const left = commands.filter((name) => !own.has(name));
  const pad = padEntries(left);
  // What the pad holds leaves the list, but Clear, which the pad draws on no key.
  const onPad = new Set(pad.map((one) => (typeof one.press === 'string' ? one.press : '')));
  onPad.delete('Clear');
  const listed = left.filter((name) => !onPad.has(name));
  const hasDigit = commands.some((name) => name in DIGIT_SLOTS);

  const spelt = spellings(listed);
  const placed: DefaultEntryPress[] = [];
  const take = (name: string): void => {
    const own = spelt.get(name.toLowerCase());
    if (own !== undefined && !placed.includes(own)) placed.push(own);
  };
  take(SCREEN_HOME);
  if (hasDigit) placed.push({ client: 'Numpad' });
  for (const name of SCREEN_POWER) take(name);
  // Clear leads only where the pad has not put it on its left key, which is the Plex's and the one difference
  // between the Plex and the Xbox, a hypothesis on those two.
  for (const name of rules.leads ?? SCREEN_LEADS) if (!(name === 'Clear' && onPadLeft(pad))) take(name);
  const rest = listed.filter((name) => !placed.includes(name)).sort(byName);
  placed.push(...rest);

  const list: DefaultEntry[] = placed.map((press, index) => typeof press === 'string'
    ? { entry: press, index, group: LIST_GROUP, press }
    : { entry: PAD_OPENER_LABEL, index, group: PAD_OPENER_GROUP, press });
  return [...list, ...pad];
}

/** Whether the pad's left key holds Clear. */
const onPadLeft = (pad: readonly DefaultEntry[]): boolean => pad.some((one) => one.index === LEFT_SLOT && one.press === 'Clear');

/**
 * The order of the list's rest: without regard to case, as the Denon's list puts DTSNEO:XToggle after Dimmer and
 * DolbyAtmos, and **with the hyphen ignored**, as the LG TV's puts In-Start and In-Stop after InputTv and the Denon's
 * InputBluetooth before InputBlu-ray. That is how .NET's culture aware comparison orders text, which fits the service
 * being written in it; a reading of the two lists, not of their code. A tie, two names equal once folded, falls back
 * on the folded names with their hyphens and then on the names as spelt, so the order never depends on the input's.
 */
function byName(a: string, b: string): number {
  const fold = (name: string): string => name.toLowerCase().replaceAll('-', '');
  for (const [x, y] of [[fold(a), fold(b)], [a.toLowerCase(), b.toLowerCase()], [a, b]] as const) {
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

// ---------------------------------------------------------------------------------------------------
// An activity
// ---------------------------------------------------------------------------------------------------

/** A device of an activity, by its name, with the roles the recipe gives it (`Volume`, `ChannelChanging`, ...). */
export interface DefaultActivityDevice {
  readonly device: string;
  readonly roles: readonly ActivityRoleName[];
}

/** An activity as the rule needs it: its type, by Logitech's name, and its devices in the order the recipe lists them. */
export interface DefaultActivity {
  readonly type: string;
  readonly devices: readonly DefaultActivityDevice[];
}

/** A command of a device of the activity. */
export interface DefaultActivityCommand {
  readonly device: string;
  readonly command: string;
}

/** One key or gesture of an activity's map. */
export interface DefaultActivityButton {
  readonly press: DefaultActivityCommand;
  readonly longPress?: DefaultActivityCommand;
  readonly doublePress?: DefaultActivityCommand;
}

/** The volume keys, which go to the device holding the volume role. */
const VOLUME_KEYS: ReadonlySet<TouchButtonKey> = new Set(['VolumeUp', 'VolumeDown', 'VolumeMute']);
/** The type whose activities measured carry no gesture; one activity of the setup, a hypothesis. */
const NO_GESTURE_TYPE = 'Custom';

/**
 * The two devices an activity's keys follow, the volume device and the control device, either undefined: the shared
 * rule, `keyDevicesOfRoles`, by device name. It refuses two devices holding one role, `ComposeError`.
 */
export function activityKeyDevices(activity: DefaultActivity): { readonly volume: string | undefined; readonly control: string | undefined } {
  return keyDevicesOfRoles(activity.devices, (one) => one.device);
}

/** A device's own map as an activity reads it: the device's commands, its keys, and its pad's entries. */
export interface DeviceMapView {
  readonly commands: readonly string[];
  readonly keys: DefaultDeviceKeys;
  readonly pad: readonly DefaultEntry[];
}

/** Where an activity's key differs from its device's own map, the module docstring's three differences. */
export interface ActivityKeyChange {
  readonly key: TouchButtonKey;
  /** The key's long press is dropped. */
  readonly noLongPress?: boolean;
  /** Taken in place of the device's own map's binding where that binding is not one of the key's own commands. */
  readonly fallback?: readonly string[];
  /** The long press where the device's own map gives the key none. */
  readonly long?: readonly string[];
}

/**
 * The three differences of an activity's keys from the device's own map, each a hypothesis on one or two activities
 * of the five: the chapters on the channel keys and no long press there, Watch a Blu-ray and Play a Game; and the
 * disc's eject held on Stop, Watch a Blu-ray and Play a Game, whose devices spell it two ways.
 */
export const ACTIVITY_KEY_CHANGES: readonly ActivityKeyChange[] = [
  { key: 'ChannelUp', noLongPress: true, fallback: ['ChapterNext'] },
  { key: 'ChannelDown', noLongPress: true, fallback: ['ChapterPrev'] },
  { key: 'Stop', long: ['Open/Close', 'Open / Close'] },
];

/** The keys of an activity's map by default, from its roles and its devices' own maps, `mapOf`. */
export function defaultActivityKeys(
  activity: DefaultActivity, mapOf: (device: string) => DeviceMapView, changes: readonly ActivityKeyChange[] = ACTIVITY_KEY_CHANGES,
): Partial<Record<TouchButtonKey, DefaultActivityButton>> {
  const { volume, control } = activityKeyDevices(activity);
  const out: Partial<Record<TouchButtonKey, DefaultActivityButton>> = {};
  for (const key of BUTTON_KEYS) {
    const device = VOLUME_KEYS.has(key) ? volume : control;
    if (device === undefined) continue;
    const map = mapOf(device);
    const bound = map.keys[key];
    if (bound === undefined) continue;
    const change = changes.find((one) => one.key === key);
    const spelt = spellings(map.commands);
    // The device's own binding stands where it is one of the key's own commands; otherwise the change's fallback,
    // where the device has one, takes its place.
    const ownNames = TOUCH_KEY_RULES.find((rule) => rule.key === key)?.own ?? [];
    const isOwn = ownNames.some((name) => name.toLowerCase() === bound.press.toLowerCase());
    const press = isOwn ? bound.press : firstHeld(spelt, change?.fallback) ?? bound.press;
    const held = change?.noLongPress === true ? undefined : bound.longPress ?? firstHeld(spelt, change?.long);
    out[key] = held === undefined
      ? { press: { device, command: press } }
      : { press: { device, command: press }, longPress: { device, command: held } };
  }
  return out;
}

/**
 * The gestures of an activity's map by default: none on a Custom activity, and on any other the five, each from a key
 * of the volume or the control device's own map. A gesture whose key that map leaves unbound is left out.
 */
export function defaultActivityGestures(activity: DefaultActivity, mapOf: (device: string) => DeviceMapView): Partial<Record<TouchGestureKey, DefaultActivityButton>> {
  if (activity.type === NO_GESTURE_TYPE) return {};
  const { volume, control } = activityKeyDevices(activity);
  const at = (device: string | undefined, key: TouchButtonKey): { command: DefaultActivityCommand; held?: DefaultActivityCommand } | undefined => {
    if (device === undefined) return undefined;
    const bound = mapOf(device).keys[key];
    if (bound === undefined) return undefined;
    return { command: { device, command: bound.press }, ...(bound.longPress === undefined ? {} : { held: { device, command: bound.longPress } }) };
  };
  const out: Partial<Record<TouchGestureKey, DefaultActivityButton>> = {};
  const up = at(volume, 'VolumeUp');
  if (up !== undefined) out.SwipeUp = { press: up.command };
  const down = at(volume, 'VolumeDown');
  if (down !== undefined) out.SwipeDown = { press: down.command };
  // The swipes sideways are the control device's Rewind and Fast forward keys whole, their long press included.
  for (const [gesture, key] of [['SwipeLeft', 'Rewind'], ['SwipeRight', 'FastForward']] as const) {
    const side = at(control, key);
    if (side !== undefined) out[gesture] = side.held === undefined ? { press: side.command } : { press: side.command, longPress: side.held };
  }
  const play = at(control, 'Play');
  if (play !== undefined) {
    const mute = at(volume, 'VolumeMute');
    const pause = at(control, 'Pause');
    out.Tap = {
      press: play.command,
      ...(mute === undefined ? {} : { longPress: mute.command }),
      ...(pause === undefined ? {} : { doublePress: pause.command }),
    };
  }
  return out;
}

/** One entry of an activity's number pad: as a device's, with the device its command goes to. */
export interface DefaultActivityPadEntry {
  readonly entry: string;
  readonly index: number;
  readonly press: DefaultActivityCommand;
}

/**
 * The number pad of an activity's map by default: the control device's digits, and each key beside 0 from the first
 * device of the activity, the control device first, whose own pad holds one there, an order one activity exercises,
 * Switch Box, a hypothesis. Labelled as a device's pad is by default, `NumberPlus` and `Number Enter`, whatever label
 * the device's own map gives it, a hypothesis too: only Play a Game's label differs from its device's. **No pad at
 * all where the control device has no digit**: Watch a Blu-ray has none, though the LG TV in it has a key left of 0.
 */
export function defaultActivityNumberPad(activity: DefaultActivity, mapOf: (device: string) => DeviceMapView): DefaultActivityPadEntry[] {
  const { control } = activityKeyDevices(activity);
  if (control === undefined) return [];
  const out: DefaultActivityPadEntry[] = [];
  for (const one of mapOf(control).pad) {
    if (one.index === LEFT_SLOT || one.index === RIGHT_SLOT || typeof one.press !== 'string') continue;
    out.push({ entry: one.entry, index: one.index, press: { device: control, command: one.press } });
  }
  if (out.length === 0) return [];
  const order = [control, ...activity.devices.map((one) => one.device).filter((name) => name !== control)];
  for (const [slot, label] of [[LEFT_SLOT, LEFT_LABEL], [RIGHT_SLOT, RIGHT_LABEL]] as const) {
    for (const device of order) {
      const found = mapOf(device).pad.find((one) => one.index === slot);
      if (found === undefined || typeof found.press !== 'string') continue;
      out.push({ entry: label, index: slot, press: { device, command: found.press } });
      break;
    }
  }
  return out.sort((a, b) => a.index - b.index);
}
