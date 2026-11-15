/**
 * **The Harmony Touch's maps in the one document shape of decision 43**: its places, the default maps the family derives,
 * a document of version 2 turned into the setup the Touch's composer builds, and an old document with a Touch's own
 * block described in the new shape.
 *
 * **Why this module exists.** A document for a Harmony Touch carried a block of its own, `Recipe.touch`, that stated every
 * key, every screen entry, every identifier and every delay, so the toolkit's changes, written for the shape every model
 * shares, did not reach it. Decision 43 makes the Touch's document that shared shape: a person's choices as ordinary
 * fields, and everything else derived by the family. This module is the family's half of that:
 *
 * * **`TOUCH_MAPS`**, the family's `FamilyMaps`, `families/maps.ts`: the places a person can bind, the commands the family
 *   carries for a device, and the default maps of a device and of an activity, each by calling the rule in
 *   `defaultmaps.ts`. Nothing here derives a map a second time; it only turns the rule's answer into the interface's
 *   words and back.
 * * **`touchSetupOfDocument`**, a document of version 2 to the `TouchSetup` that `composeTouchSetup` in `setup.ts` builds,
 *   through the shared `resolveMaps`, so what an application is shown of a key is what is built. No build calls it:
 *   the Touch's build reads the document's own block, `readTouchSetupFile`, and this is the route a document of
 *   version 2 takes to the same composer.
 * * **`describeTouchDocument`**, the converter: an old document with a Touch's block to the smallest document of
 *   version 2 that says the same, by comparing the block with the derived defaults and stating only what differs.
 *
 * **The places, in the words every model's drawing uses.** A key is named as `reference/silhouettes/touch.svg` names it,
 * so one choice of a key means the same key on every model that has it: the 26 keys a Touch's documents bind, the
 * drawing's `Dvr` among them, which the documents spell `DVR` (`DOCUMENT_KEYS` below, the one place the two spellings
 * meet); the number pad's places as keys named as the Harmony One's keys are, `Number0` to `Number9`, `NumberPlus`
 * left of 0 and `Enter` right of it, the One's words for the same three keys, so one `setKey` names the same key on
 * both models; and the five gestures by the names the
 * documents already give them, `SwipeUp`, `SwipeDown`, `SwipeLeft`, `SwipeRight` and `Tap`, which are the names this
 * interface asks for, so no name had to be chosen. Off, and the two touch zones Home and Favorites, are listed and not
 * built: the remote acts on them itself, `reference/remotes/harmony-touch/keys.md`.
 *
 * **The presses each place has**, read in the reference: a key a short press and a long press, chosen by how long it is
 * down, a property of the key, and no double press, which the engine reads only for home control rocker keys; a pad
 * place a tap alone, since the pad sends each tap as one request with no hold; a gesture a tap, a hold and a double tap,
 * `reference/architectures/harmony-touch/activities-and-buttons.md`. A key and a pad place can be bound by a device's
 * own map and by an activity's; a gesture by an activity's alone, since the documents measured put gestures on every
 * activity but the Custom one and on no device map.
 *
 * **Which architectures**: the Harmony Touch alone, firmware 4.15.330; its firmware reports 17 and Logitech's templates
 * file it under 18. Nothing here sends anything.
 */
import type { CatalogueSource } from '../../catalogue/catalogue.ts';
import type { DeviceChannelTuning, DeviceTiming, DriveStep } from '../../catalogue/driving.ts';
import { statedCode, statedProtocol } from '../../infrared/stated.ts';
import { notBuilt } from '../../support/contract.ts';
import {
  resolveMaps, type ActivityMap, type ActivityMapBinding, type DeviceMap, type DeviceMapBinding, type DeviceMapEntry,
  type FamilyMaps, type MapActivity, type MapCommand, type MapDeviceView, type MapPlace, type MapScreenEntry,
  type ResolvedKey, type ResolvedOwner,
} from '../maps.ts';
import {
  readRecipe, type Recipe, type RecipeActivity, type RecipeActivityStep, type RecipeDevice, type RecipeKey,
  type RecipeKeyAction, type RecipePress, type RecipeScreenCommand, type RecipeScreenItem, type RecipeSequence, type RecipeSetting,
} from '../../recipe/recipe.ts';
import {
  ACTIVITY_START_SCREENS, ACTIVITY_TYPES, BUTTON_KEYS, ComposeRefusal, GESTURE_KEYS, OWN_IDS,
  type ActivityTypeName, type OwnActivity, type OwnActivityStep, type OwnButton, type OwnPress, type OwnSequence,
  type TouchButtonKey, type TouchGestureKey,
} from './compose.ts';
import {
  defaultActivityGestures, defaultActivityKeys, defaultActivityNumberPad, defaultDeviceEntries, defaultDeviceKeys,
  LEFT_LABEL, LEFT_SLOT, LIST_GROUP, PAD_GROUP, PAD_KEYS, PAD_OPENER_GROUP, PAD_OPENER_LABEL, RIGHT_LABEL, RIGHT_SLOT,
  type DefaultActivityButton, type DefaultDeviceKeys, type DefaultEntry, type DeviceMapView,
} from './defaultmaps.ts';
import { definitionOfRow, isDefinitionRefusal, keyCodeText } from './definition.ts';
import type { IrProtocol } from './documents.ts';
import {
  catalogueOfArchive, HARMONY_TOUCH_MODEL, roleKindsOf, SETTINGS_ROWS_WRITTEN, settingText, setupOfSetupFile, type TouchSetupFile,
} from './fromnothing.ts';
import { SETTING_ROWS } from './settings.ts';
import type { SetupButton, SetupChannelTuning, SetupDevice, SetupPress, TouchSetup } from './setup.ts';

const refuse = (message: string): never => {
  throw new ComposeRefusal(message);
};

/**
 * A table built on its first use rather than when the module loads. **This module is loaded inside a cycle**: the
 * family object imports it, the registry imports the family object, and modules this one imports reach the registry,
 * so a table built at load from another module's constants can meet them before they are set. Built on first use, it
 * only ever meets them set.
 */
function once<T>(make: () => T): () => T {
  let made: { readonly value: T } | undefined;
  return () => (made ??= { value: make() }).value;
}

// ---------------------------------------------------------------------------------------------------
// The places
// ---------------------------------------------------------------------------------------------------

/**
 * **The one place the drawing's word for a key and the documents' word meet**: a key whose two spellings differ, by the
 * documents' spelling. The drawing names the key `Dvr`, as it reads the printed DVR, and a Touch's documents write
 * `DVR`; every other key is spelt alike in both. A key is a place by the drawing's word everywhere a document of
 * version 2 or an application names it, and by the documents' word only inside the documents this family composes.
 */
const DOCUMENT_KEYS: Readonly<Partial<Record<TouchButtonKey, string>>> = { DVR: 'Dvr' };

/** The place a key of the documents is, by the drawing's word. */
export function placeOfTouchKey(key: TouchButtonKey): string {
  return DOCUMENT_KEYS[key] ?? key;
}

/** The key of the documents a place is, or undefined where the place is no key of theirs. */
export function touchKeyOfPlace(place: string): TouchButtonKey | undefined {
  return BUTTON_KEYS.find((key) => placeOfTouchKey(key) === place);
}

/** One place of the number pad: its word, its slot, the label a person's choice there is given, and what the pad draws there. */
interface PadPlace {
  readonly key: string;
  readonly slot: number;
  readonly label: string;
  readonly draws: readonly string[];
}

/**
 * The number pad's places, one for each key of `PAD_KEYS` in `defaultmaps.ts`, named as the Harmony One names the same
 * keys: the digits `Number0` to `Number9`, the key left of 0 `NumberPlus` and the key right of 0 `Enter`. The word is
 * the place's and not a command's: the commands the pad draws on the key right of 0 keep their own names, `Enter`,
 * `NumberEnter`, `#` and `ENT`. A person's choice there is labelled as the rule labels the key.
 */
const padPlaces = once((): readonly PadPlace[] => PAD_KEYS.map((key): PadPlace => {
  if (key.slot === LEFT_SLOT) return { key: 'NumberPlus', slot: key.slot, label: LEFT_LABEL, draws: key.draws };
  if (key.slot === RIGHT_SLOT) return { key: 'Enter', slot: key.slot, label: RIGHT_LABEL, draws: key.draws };
  return { key: `Number${key.draws[0]!}`, slot: key.slot, label: key.draws[0]!, draws: key.draws };
}));

/** The pad's place at a slot of its numbering, or undefined where the pad has none there. */
function padPlaceAt(slot: number): string | undefined {
  return padPlaces().find((one) => one.slot === slot)?.key;
}

/** A pad place's slot, or undefined where the place is not the pad's. */
function slotOfPadPlace(place: string): number | undefined {
  return padPlaces().find((one) => one.key === place)?.slot;
}

/**
 * Why a key the remote binds itself takes no choice, `reference/remotes/harmony-touch/keys.md`: Off is the firmware's
 * `PowerOffActivity`, and Home and Favorites are zones of the touch sensor rather than keys; none is among the 26 names
 * a Touch's documents bind.
 */
const REMOTE_PLACES: readonly { readonly key: string; readonly why: string }[] = [
  { key: 'Off', why: 'the remote ends the running activity on it itself, and no map binds it' },
  { key: 'Home', why: 'a zone of the touch sensor that the screens act on themselves, and no map binds it' },
  { key: 'Favorites', why: 'a zone of the touch sensor that the screens act on themselves, and no map binds it' },
];

/**
 * Every place of a Harmony Touch, in this order: its 26 keys a map binds, in the documents' order with the drawing's
 * words, then the three the remote binds itself, then the pad by its numbering, then the five gestures.
 */
const touchPlaces = once((): readonly MapPlace[] => [
  ...BUTTON_KEYS.map((key): MapPlace => ({ key: placeOfTouchKey(key), surface: 'keypad', presses: ['short', 'held'], boundBy: 'both', built: true })),
  ...REMOTE_PLACES.map((one): MapPlace => ({ key: one.key, surface: 'keypad', presses: ['short'], boundBy: 'remote', built: false, why: one.why })),
  ...padPlaces().map((one): MapPlace => ({ key: one.key, surface: 'pad', presses: ['short'], boundBy: 'both', built: true })),
  ...GESTURE_KEYS.map((key): MapPlace => ({ key, surface: 'gesture', presses: ['short', 'held', 'double'], boundBy: 'activity', built: true })),
]);

// ---------------------------------------------------------------------------------------------------
// The commands the family carries
// ---------------------------------------------------------------------------------------------------

/** A catalogue entry's two halves, `<manufacturer slug>/<file>`, as `deviceRecordOfArchive` splits it. */
function entryOf(entry: string): { readonly slug: string; readonly file: string } {
  const slash = entry.indexOf('/');
  if (slash <= 0 || slash === entry.length - 1) refuse(`"${entry}" is not a catalogue entry, a manufacturer and a file joined by a slash`);
  return { slug: entry.slice(0, slash), file: entry.slice(slash + 1) };
}

/**
 * Whether the family can write a keycode, by the same steps `deviceRecordOfArchive` takes: the code reads as a family
 * and numbers, our rhythm table holds a row of that family, the row writes as a definition, and the numbers write into
 * it. The id given the definition here is a placeholder, since only whether it writes is asked; each family's answer is
 * kept, since a device's commands mostly share one.
 */
function carrier(): (keycode: string) => boolean {
  const definitions = new Map<string, IrProtocol | undefined>();
  return (keycode) => {
    const code = statedCode(keycode);
    if (code === undefined) return false;
    if (!definitions.has(code.family)) {
      const row = statedProtocol(code.family);
      const written = row === undefined ? undefined : definitionOfRow(row, OWN_IDS.first);
      definitions.set(code.family, written === undefined || isDefinitionRefusal(written) ? undefined : written);
    }
    const definition = definitions.get(code.family);
    return definition !== undefined && typeof keyCodeText(code, definition) === 'string';
  };
}

/** A device's catalogue commands, each its name and keycode, from its entry. */
function catalogueCommands(device: RecipeDevice, catalogue: CatalogueSource): readonly { readonly name: string; readonly keycode: string }[] {
  const { slug, file } = entryOf(device.device);
  const found = catalogue.device(slug, file);
  if (found.codeset === undefined) refuse(`${device.device}: the catalogue holds no codes for it`);
  return catalogue.commands(found.codeset!);
}

// ---------------------------------------------------------------------------------------------------
// The default maps, in the interface's words, from the rule
// ---------------------------------------------------------------------------------------------------

/** A device's default map from its carried commands: the rule's keys, its pad as pad places, and its list. */
function touchDeviceMap(commands: readonly MapCommand[]): DeviceMap {
  const names = commands.filter((one) => one.carried).map((one) => one.name);
  const keys: DeviceMapBinding[] = [];
  for (const [key, bound] of Object.entries(defaultDeviceKeys(names)) as [TouchButtonKey, { press: string; longPress?: string }][]) {
    keys.push({ key: placeOfTouchKey(key), press: 'short', command: bound.press });
    if (bound.longPress !== undefined) keys.push({ key: placeOfTouchKey(key), press: 'held', command: bound.longPress });
  }
  const entries = defaultDeviceEntries(names);
  const screen: DeviceMapEntry[] = [];
  for (const entry of entries) {
    if (entry.group === PAD_GROUP) {
      // The rule's pad entries always send a command; the opener is the list's.
      keys.push({ key: padPlaceAt(entry.index)!, press: 'short', command: entry.press as string, label: entry.entry });
      continue;
    }
    // The list and the opener share one numbering and the rule writes them in it, so their order is the list's.
    screen.push(typeof entry.press === 'string'
      ? { command: entry.press, ...(entry.entry === entry.press ? {} : { label: entry.entry }) }
      : { label: entry.entry, client: entry.press.client });
  }
  return { keys, screen };
}

/**
 * A device's default map as the activity's rule reads it, `DeviceMapView` of `defaultmaps.ts`: the keys by the
 * documents' words and the pad by its numbering. A translation of the interface's map back to the rule's own form,
 * never the rule run again, so an activity reads the same default map a device page is shown.
 */
function ruleViewOf(view: MapDeviceView): DeviceMapView {
  const keys: DefaultDeviceKeys = {};
  const pad: DefaultEntry[] = [];
  for (const binding of view.map.keys) {
    const key = touchKeyOfPlace(binding.key);
    if (key !== undefined) {
      const was = keys[key];
      keys[key] = binding.press === 'held' ? { press: was?.press ?? '', longPress: binding.command } : { ...was, press: binding.command };
      continue;
    }
    const slot = slotOfPadPlace(binding.key);
    if (slot !== undefined) pad.push({ entry: binding.label ?? binding.command, index: slot, group: PAD_GROUP, press: binding.command });
  }
  return { commands: view.commands.filter((one) => one.carried).map((one) => one.name), keys, pad: pad.sort((a, b) => a.index - b.index) };
}

/** An activity's default map from the rule: its keys, its gestures and its pad, and an empty list, which the rule does not state. */
function touchActivityMap(activity: MapActivity, deviceOf: (device: string) => MapDeviceView): ActivityMap {
  const views = new Map<string, DeviceMapView>();
  const mapOf = (device: string): DeviceMapView => {
    const known = views.get(device);
    if (known !== undefined) return known;
    const view = ruleViewOf(deviceOf(device));
    views.set(device, view);
    return view;
  };
  const rule = { type: activity.type, devices: activity.devices };
  const keys: ActivityMapBinding[] = [];
  const bindingsOf = (place: string, button: DefaultActivityButton): void => {
    keys.push({ key: place, press: 'short', device: button.press.device, command: button.press.command });
    if (button.longPress !== undefined) keys.push({ key: place, press: 'held', device: button.longPress.device, command: button.longPress.command });
    if (button.doublePress !== undefined) keys.push({ key: place, press: 'double', device: button.doublePress.device, command: button.doublePress.command });
  };
  for (const [key, button] of Object.entries(defaultActivityKeys(rule, mapOf)) as [TouchButtonKey, DefaultActivityButton][]) bindingsOf(placeOfTouchKey(key), button);
  for (const [gesture, button] of Object.entries(defaultActivityGestures(rule, mapOf)) as [string, DefaultActivityButton][]) bindingsOf(gesture, button);
  for (const entry of defaultActivityNumberPad(rule, mapOf)) {
    keys.push({ key: padPlaceAt(entry.index)!, press: 'short', device: entry.press.device, command: entry.press.command, label: entry.entry });
  }
  return { keys, screen: [] };
}

/**
 * **The Harmony Touch's maps**, decision 43: its places, the commands it carries for a device, and the default maps,
 * each from `defaultmaps.ts`'s rule. The skin is not asked, since the Touch is one model.
 */
export const TOUCH_MAPS: FamilyMaps = {
  places: () => touchPlaces(),
  commands: (device, catalogue) => {
    const carries = carrier();
    return catalogueCommands(device, catalogue).map((one) => ({ name: one.name, carried: carries(one.keycode) }));
  },
  deviceMap: (commands) => touchDeviceMap(commands),
  activityMap: (activity, deviceOf) => touchActivityMap(activity, deviceOf),
};

// ---------------------------------------------------------------------------------------------------
// A document of version 2 to the setup the composer builds
// ---------------------------------------------------------------------------------------------------

/**
 * **Where the ids of ours a document's toolkit ids become start**, one hundred apart: the toolkit's `d3` is device
 * 900000103, `a2` activity 900000202, `s1` sequence 900000301, and the n-th infrared family the devices name is under
 * protocol id 900000400 and n. These are the numbers the bench setup's block states, so a document converted from it
 * keeps every id the remote knows. Each kind holds 99, which the Touch's fifteen devices stay well inside.
 */
const ID_BASES = { device: 900_000_100, activity: 900_000_200, sequence: 900_000_300, protocol: 900_000_400 } as const;
const ID_LETTERS = { device: 'd', activity: 'a', sequence: 's' } as const;
const MOST_OF_A_KIND = 99;

/**
 * The id of ours a toolkit id is, or a refusal where the document gives none of the toolkit's exact form: the kind's
 * letter and a number from 1 with no leading zero. **The exact form, because two spellings of one number would be one
 * id on the remote**: `d1` and `d01` both give 900000101, and the composer would refuse the second only as a device
 * already given, far from the document's mistake.
 */
function ourId(kind: keyof typeof ID_LETTERS, id: string | undefined, what: string): number {
  const match = id === undefined ? null : new RegExp(`^${ID_LETTERS[kind]}([1-9][0-9]*)$`).exec(id);
  const n = match === null ? 0 : Number(match[1]);
  if (n < 1 || n > MOST_OF_A_KIND) {
    const given = id === undefined ? 'has no id' : `has the id ${id}, which is not`;
    refuse(`${what} ${given} of the toolkit's form, ${ID_LETTERS[kind]}1 to ${ID_LETTERS[kind]}${MOST_OF_A_KIND} with no leading zero, which its id on the remote is derived from; the toolkit's open gives one`);
  }
  return ID_BASES[kind] + n;
}

/** The toolkit id an id of ours is, the inverse of `ourId`, or a refusal where the id is outside the kind's hundred. */
function toolkitId(kind: keyof typeof ID_LETTERS, id: number, what: string): string {
  const n = id - ID_BASES[kind];
  if (!Number.isInteger(n) || n < 1 || n > MOST_OF_A_KIND) refuse(`${what}'s id ${id} is not one a document's id can give back, ${ID_BASES[kind] + 1} to ${ID_BASES[kind] + MOST_OF_A_KIND}`);
  return `${ID_LETTERS[kind]}${n}`;
}

/** The Harmony Touch's skin, the remote's own, as the registry chooses the model by; its places do not depend on it. */
const TOUCH_SKIN = 99;

/**
 * The screen an activity opens on when the document states none: the command list, the screens' own fallback for a
 * start screen whose condition fails, `activities-and-buttons.md`. **A hypothesis** as a default: three of the bench
 * setup's five activities open on it and two on screens a person chose in Logitech's client, the favourites and the
 * gesture screen, and which screen Logitech's service gives a new activity was not read.
 */
const DEFAULT_OPENS_ON: OwnActivity['startScreen'] = 'Commands';

/**
 * The order an activity switches its devices on in when the document states none: the device holding `Display`, then
 * the one holding `Volume`, then the rest in the document's order. **A hypothesis**, fitted to the bench setup's five
 * activities, all five of which it gives.
 */
function defaultPowerOrder(activity: RecipeActivity): string[] {
  const holding = (role: string): string[] => activity.devices.filter((one) => one.roles.some((r) => r === role)).map((one) => one.device);
  const display = holding('Display');
  const volume = holding('Volume').filter((name) => !display.includes(name));
  const rest = activity.devices.map((one) => one.device).filter((name) => !display.includes(name) && !volume.includes(name));
  return [...display, ...volume, ...rest];
}

/**
 * Which activity holds the favourite channels: the one the document says does, or where none says so, the first that
 * uses a device changing channels and does not say it holds none. **A hypothesis**, on one setup with one such activity.
 */
function favouritesActivity(activities: readonly RecipeActivity[]): number {
  const stated = activities.findIndex((one) => one.favourites === true);
  if (stated >= 0) return stated;
  return activities.findIndex((one) => one.favourites !== false && one.devices.some((u) => u.roles.includes('ChannelChanging')));
}

/** The members of a device's timing the Touch's device record carries, by the name `SetupDevice` gives each. */
const TIMING_CARRIED: readonly (keyof DeviceTiming)[] = ['interKeyDelay', 'interDeviceDelay', 'powerOnDelay', 'inputDelay', 'pressMinRepeats'];

/** The four step lists of a channel tuning. */
const TUNING_LISTS = ['start', 'finish', 'greaterTen', 'greaterHundred'] as const;

/** A device's command as the device spells it, found without regard to case as the engine finds one; undefined where it has none. */
type Spelling = (command: string) => string | undefined;

/** The spelling of one device's commands, its catalogue's and its own, `TOUCH_MAPS.commands`, the first of a name kept. */
function spellingOfDevice(device: RecipeDevice, catalogue: CatalogueSource): Spelling {
  const known = new Map<string, string>();
  for (const one of TOUCH_MAPS.commands(device, catalogue)) {
    if (!known.has(one.name.toLowerCase())) known.set(one.name.toLowerCase(), one.name);
  }
  return (command) => known.get(command.toLowerCase());
}

/**
 * A channel tuning's steps as presses of commands by name, as the setup states them, each in the device's own
 * spelling. Refused: a step other than a plain press, which a Harmony Touch's channel tuning does not hold.
 */
function tuningPressesOf(steps: readonly DriveStep[], spell: Spelling, what: string): string[] {
  return steps.map((step) => {
    if (step.kind !== 'send' || step.holdMs !== undefined) refuse(`${what}: a step of channel tuning is a press of a command, and a ${step.kind === 'send' ? 'held send' : step.kind} is not one a Harmony Touch's channel tuning holds`);
    return spell((step as { command: string }).command) ?? (step as { command: string }).command;
  });
}

/**
 * **A device's channel tuning, member by member**: each member a document states stands over the catalogue's, and each
 * it does not state keeps the catalogue's, as `timing` does, so a person who changes how a number ends changes nothing
 * of how it starts. The catalogue's members are written as the device's record writes them, `featuresOfDriving` in
 * `archivedevice.ts`, so a member kept is the record's own. **A document's empty list is Logitech's press of no
 * command**, `['']`: their client saves "no command" that way, `favourites-and-settings.md` "How a channel is entered",
 * and a document says the same thing as an empty list, so the two are one statement, written in the documents' form
 * so a set converted from theirs keeps its bytes. **Refused**: a stated step naming a command the device does not have,
 * which the engine would send as nothing, and a stated step other than a plain press.
 */
function setupTuningOf(stated: DeviceChannelTuning, catalogue: DeviceChannelTuning | undefined, spell: Spelling, what: string): SetupChannelTuning {
  const out: { -readonly [K in keyof SetupChannelTuning]: SetupChannelTuning[K] } = { fixedDigits: stated.fixedDigits ?? catalogue?.fixedDigits ?? null };
  for (const member of TUNING_LISTS) {
    const steps = stated[member];
    if (steps !== undefined) {
      for (const step of steps) {
        if (step.kind === 'send' && spell(step.command) === undefined) refuse(`${what}'s ${member} presses ${step.command}, which the device has no command of`);
      }
      out[member] = steps.length === 0 ? [''] : tuningPressesOf(steps, spell, `${what}'s ${member}`);
      continue;
    }
    const kept = catalogue?.[member];
    if (kept !== undefined) out[member] = tuningPressesOf(kept, spell, `${what}'s catalogue ${member}, kept since the document states none,`);
  }
  return out;
}

/** Refuses what a document states of a device that the Harmony Touch's documents carry no field for yet. */
function refuseUncarried(device: RecipeDevice): void {
  const what = `the device ${device.name}`;
  if (device.key !== undefined) refuse(`${what} states a device key, which is the Harmony 300 and 350's; a Harmony Touch has none`);
  for (const member of Object.keys(device.timing ?? {}) as (keyof DeviceTiming)[]) {
    if (!TIMING_CARRIED.includes(member)) notBuilt(`the Harmony Touch's documents for ${what}'s ${member}`, member === 'minRepeats' ? 17 : 16);
  }
  for (const member of Object.keys(device.power ?? {})) {
    if (member !== 'alwaysOn') notBuilt(`the Harmony Touch's documents for ${what}'s power ${member}`, 14);
  }
  for (const [name, command] of Object.entries(device.commands ?? {})) {
    if (command.code !== undefined) notBuilt(`the Harmony Touch's documents for ${what}'s command ${name}'s code`, 19);
    if (command.sending !== undefined) notBuilt(`the Harmony Touch's documents for ${what}'s command ${name}'s sending`, 89);
  }
}

/**
 * **Refuses a key a document chooses that no place of the Touch takes**: a word that is no place, a place the owner's map
 * does not bind (a gesture in a device's map), one the remote binds itself, or a press the place does not have.
 * `resolveMaps` answers none of these and leaves them to the toolkit's check, so a build that did not refuse them would
 * build a remote whose key does something other than the document says, without a word.
 */
function refuseUnplaced(document: Recipe): void {
  const owners = [
    ...document.devices.map((one) => ({ keys: one.keys, owner: 'device' as const, what: `the device ${one.name}` })),
    ...document.activities.map((one) => ({ keys: one.keys, owner: 'activity' as const, what: `the activity ${one.name}` })),
  ];
  for (const { keys, owner, what } of owners) {
    for (const key of keys ?? []) {
      const press = key.press ?? 'short';
      const place = touchPlaces().find((one) => one.key === key.key);
      if (place === undefined) refuse(`${what} chooses the key ${key.key}, which is no place of a Harmony Touch`);
      if (!place!.built) refuse(`${what} chooses ${key.key}, which the remote binds itself: ${place!.why ?? ''}`);
      if (place!.boundBy !== 'both' && place!.boundBy !== owner) refuse(`${what} chooses ${key.key}, which a ${owner}'s map does not bind`);
      if (!place!.presses.includes(press)) refuse(`${what} chooses ${key.key} ${press}, a press that place does not have on a Harmony Touch`);
    }
  }
}

/** A key's or an entry's action as the setup states it: a device's own command by its name alone, as the block did. */
function setupPressOf(action: RecipeKeyAction, own: string | undefined, what: string): SetupPress | undefined {
  if ('nothing' in action) return undefined;
  if ('sequence' in action) {
    if (own !== undefined) refuse(`${what} runs a sequence, and a device has no sequences`);
    return { sequence: action.sequence };
  }
  return own !== undefined && action.device === own ? action.command : { device: action.device, command: action.command };
}

/**
 * Whether a person's choice on a pad place is one the pad shows there: the pad screen places an entry by its command's
 * name, so a command of another name than those `PAD_KEYS` gives the key would be on no key of the pad, and a sequence
 * has no command name to be placed by. Nothing is always a choice it takes. The rule's own defaults are not held to
 * this, since the rule puts the Plex's `Clear` on the key left of 0, `DEFAULT_PAD_LEFT`.
 */
function refuseUndrawnChoice(place: PadPlace, key: ResolvedKey, deviceSpelling: (device: string) => Spelling, what: string): void {
  if (key.isDefault || 'nothing' in key.action) return;
  if ('sequence' in key.action) refuse(`${what} runs the sequence ${key.action.sequence} on the pad's ${place.key}, and the pad places an entry by its command's name, which a sequence has none of`);
  const action = key.action as { device: string; command: string };
  const spelt = deviceSpelling(action.device)(action.command);
  if (spelt === undefined) refuse(`${what} puts ${action.device}'s ${action.command} on the pad's ${place.key}, and ${action.device} has no command of that name`);
  if (!place.draws.includes(spelt!)) {
    refuse(`${what} puts ${action.device}'s ${spelt!} on the pad's ${place.key}, and the pad draws on that key only a command named ${place.draws.join(', ')}; a command of any other name is on no key of the pad`);
  }
}

/**
 * An owner's resolved keys as buttons of the ordered form: each key with its press, long press and double press, each
 * gesture alike, and each pad place an entry of the pad's group at its slot, labelled as the default labels it or, for
 * a person's choice, by the place's own label. **Refuses** a long or a double press on a key or gesture whose short
 * press sends nothing, which a button cannot carry, since the documents name a button's action by its short press; and
 * a choice on a pad place the pad would draw on no key, `refuseUndrawnChoice`.
 */
function buttonsOf(owner: ResolvedOwner, own: string | undefined, deviceSpelling: (device: string) => Spelling): SetupButton[] {
  const what = own === undefined ? `the activity ${owner.name}` : `the device ${owner.name}`;
  const at = (key: string, press: RecipePress): ResolvedKey | undefined => owner.keys.find((one) => one.key === key && one.press === press);
  const out: SetupButton[] = [];
  for (const place of touchPlaces()) {
    // A place the remote binds itself is answered for no owner; `refuseUnplaced` refused a choice on one.
    if (!place.built) continue;
    const short = at(place.key, 'short');
    if (short === undefined) continue;
    const pressed = (press: RecipePress): SetupPress | undefined => {
      const k = at(place.key, press);
      return k === undefined ? undefined : setupPressOf(k.action, own, `${what}'s ${place.key} key`);
    };
    const press = pressed('short');
    const longPress = pressed('held');
    const doublePress = pressed('double');
    if (press === undefined) {
      if (longPress !== undefined || doublePress !== undefined) refuse(`${what}'s ${place.key} is held or pressed twice and sends nothing on a press, which a button of a Harmony Touch cannot carry`);
      continue;
    }
    const pad = padPlaces().find((one) => one.key === place.key);
    if (place.surface === 'pad' && pad !== undefined) {
      refuseUndrawnChoice(pad, short, deviceSpelling, what);
      out.push({ entry: short.label ?? pad.label, index: pad.slot, group: PAD_GROUP, press });
      continue;
    }
    const named = place.surface === 'gesture' ? { gesture: place.key as TouchGestureKey } : { key: touchKeyOfPlace(place.key)! };
    out.push({
      ...named, press,
      ...(longPress === undefined ? {} : { longPress }),
      ...(doublePress === undefined ? {} : { doublePress }),
    });
  }
  return out;
}

/**
 * An owner's screen list as entries of the ordered form, numbered from 0 in the list's order. **A device's stated list
 * gets the pad's opener** where its pad binds a place, since a list a person states names commands and the opener is
 * none; it goes where the rule puts it, right after an entry sending Home that leads the list, or first.
 *
 * **That default is a hypothesis.** What it rests on: in the bench setup's documents every device map with number pad
 * entries holds the opener, the six command actions naming no device, `activities-and-buttons.md` "How a key press
 * becomes a command", and the rule in `defaultmaps.ts` places it after a leading Home on that sample. What was not read is what Logitech's
 * client does with the opener when a person reorders or empties a device's list, so a list stated whole that ends up
 * without the opener, or with it elsewhere, cannot be stated yet.
 */
function entriesOf(owner: ResolvedOwner, own: string | undefined, sequences: ReadonlySet<string>): SetupButton[] {
  const what = own === undefined ? `the activity ${owner.name}` : `the device ${owner.name}`;
  const items: MapScreenEntry[] = [...owner.screen.items];
  if (own !== undefined && !owner.screen.isDefault) {
    const padBound = owner.keys.some((one) => one.surface === 'pad' && !('nothing' in one.action));
    if (padBound) {
      const first = items[0];
      const homeFirst = first !== undefined && 'command' in first && first.command.toLowerCase() === 'home';
      items.splice(homeFirst ? 1 : 0, 0, { label: PAD_OPENER_LABEL, client: 'Numpad' });
    }
  }
  return items.map((item, index): SetupButton => {
    if ('client' in item) {
      if (item.client !== 'Numpad') refuse(`${what}'s screen holds an entry acting as ${item.client}, which a list of ours does not carry`);
      return { entry: item.label, index, group: PAD_OPENER_GROUP, press: { client: 'Numpad' } };
    }
    if ('sequence' in item) {
      if (!sequences.has(item.sequence)) refuse(`${what}'s screen names the sequence ${item.sequence}, which it does not hold`);
      return { entry: item.label ?? item.sequence, index, press: { sequence: item.sequence } };
    }
    return { entry: item.label ?? item.command, index, press: setupPressOf({ device: item.device, command: item.command }, own, `${what}'s screen`)! };
  });
}

/** An activity's step as the setup states it: a pause in tenths as seconds, the order the family numbers it by. */
function stepOf(step: RecipeActivityStep, order: number, what: string): OwnActivityStep {
  if ('sequence' in step) return notBuilt(`the Harmony Touch's documents for ${what}, a step running the sequence ${step.sequence}`, 30);
  if ('pause' in step) return { delaySeconds: step.pause / 10, order };
  if ('channel' in step) return { device: step.device, channel: step.channel, order };
  return { device: step.device, command: step.command, order };
}

/** A sequence's steps as the setup states them, a pause in tenths as seconds. */
function sequenceOf(sequence: RecipeSequence, what: string): OwnSequence {
  return {
    id: ourId('sequence', sequence.id, `${what}'s sequence ${sequence.name}`),
    name: sequence.name,
    steps: sequence.steps.map((step) => ('pause' in step ? { delaySeconds: step.pause / 10 } : { device: step.device, command: step.command })),
  };
}

/**
 * The settings as the remote reads a row, as text, every row through the same check the Touch's own block takes,
 * `settingText` in `fromnothing.ts`: a yes or no row true or false, a number row a whole number in its range.
 */
function settingsOf(document: Recipe): Record<string, string> {
  const settings = document.settings;
  if (settings === undefined) refuse('the document states no settings, and a Harmony Touch\'s Settings states every row; there is no table of Logitech\'s defaults to take them from yet');
  const written = SETTINGS_ROWS_WRITTEN.filter((name) => name !== 'UserImages' && name !== 'BackgroundImage');
  for (const name of Object.keys(settings!)) {
    if (!(written as readonly string[]).includes(name)) refuse(`the setting ${name} is not one a Harmony Touch's Settings of ours writes, ${written.join(', ')}`);
  }
  const out: Record<string, string> = {};
  for (const name of written) {
    const value: RecipeSetting | undefined = settings![name];
    if (value === undefined) refuse(`the setting ${name} is not stated, and a Harmony Touch's Settings states every row`);
    out[name] = settingText(name, value!);
  }
  return out;
}

/**
 * The protocol id of ours each infrared family is written under: 900000400 and n for the n-th family the devices name,
 * the devices in the document's order and each device's commands in its codeset's, a family counted where a command's
 * code first names it. Every family a readable code names is counted, carried or not, since `deviceRecordOfArchive`
 * asks for an id for every one before it finds whether our rhythm table holds it.
 *
 * **What moves, and why that is accepted.** The numbering follows the devices, so removing a device, moving one, or
 * adding one before another renumbers the families of devices it did not touch: take out the LG TV, the first to name
 * `Toshiba 32 Bit`, and every family after it moves down one. That costs nothing a person keeps. A protocol id joins a
 * command to its definition inside the two documents built together, the device list and the protocol list, and both
 * are built whole from the same document every time; nothing the remote keeps between syncs, the favourites documents
 * among them, is keyed by a protocol id, as far as `devices-and-infrared.md` says, which is the reference's account of
 * what a writer must carry.
 */
function protocolIdsOf(document: Recipe, catalogue: CatalogueSource): Record<string, number> {
  const out: Record<string, number> = {};
  let next = ID_BASES.protocol;
  for (const device of document.devices) {
    for (const command of catalogueCommands(device, catalogue)) {
      const family = statedCode(command.keycode)?.family;
      if (family === undefined || family in out) continue;
      next += 1;
      if (next - ID_BASES.protocol > MOST_OF_A_KIND) refuse(`the devices name more than ${MOST_OF_A_KIND} infrared families`);
      out[family] = next;
    }
  }
  return out;
}

/** What `touchSetupOfDocument` gives: the setup the composer builds, and the two things a setup does not hold. */
export interface TouchDocumentParts {
  readonly setup: TouchSetup;
  /** Each infrared family the devices' codes name, and the protocol id of ours its definition goes under. */
  readonly protocols: Readonly<Record<string, number>>;
  /** The remote's settings by row, each as the text the remote reads. */
  readonly settings: Readonly<Record<string, string>>;
}

/**
 * **A document of version 2 as the setup the Touch's composer builds**, decision 43: the document's choices over the
 * family's defaults through the shared `resolveMaps`, and every field of version 2 a Touch carries read from it.
 *
 * **What comes from where.**
 *
 * * **Ids** from the toolkit's, `ID_BASES`; a device, an activity or a sequence without one is refused.
 * * **The control port is 0**, the remote's own lamp, whatever Logitech's documents said: it is not a person's choice,
 *   and a device of ours was heard sending from it on the bench.
 * * **A device's timing** is the document's `timing` over the catalogue's, the press count, the two delays, the power on
 *   delay and the input delay; **always on** is its `power.alwaysOn`, kept on between activities its
 *   `poweredOnBetweenActivities`, each false where absent; **its channel tuning** the document's where it states one,
 *   the catalogue's otherwise, which the composer keeps when the setup states none.
 * * **Keys, pad and gestures** from the resolved maps; **a device's list** the rule's, or the document's whole with
 *   the pad's opener added where its pad binds a place.
 * * **An activity's place** is its place in the document; **the screen it opens on** its `opensOn`, the command list
 *   where absent; **the favourites** `favouritesActivity`; **the power on order** its `powerOrder` or
 *   `defaultPowerOrder`; **its list, its sequences and its extra steps** the document's.
 *
 * **How the steps and power places are numbered**, which only orders each list, the engine sorting each by number,
 * `activities-and-buttons.md` "An activity: what it is made of": the power on places 1 to n in the power order, the start
 * steps on from n + 1, the end steps from 1, and the power off places on from after the end steps. That is how
 * Logitech's client numbered the one activity of the bench setup with steps, so a set converted from theirs keeps its
 * numbers. **The power off order is the power on order, a hypothesis**: the document has one power order, and on all
 * five activities of the bench setup the devices are switched off in the order they are switched on.
 *
 * **Refuses**: a document for another model, one carrying a Touch's own block (which `readTouchSetupFile` reads), favourite channels, choices; what `refuseUncarried` refuses of a device; a key no place takes,
 * `refuseUnplaced`; a start screen the
 * Touch's composer does not write; a step running a sequence; a list item of version 1's form; a document stating no
 * settings or not every row; and whatever `resolveMaps` and the family's maps refuse.
 */
export function touchSetupOfDocument(document: Recipe, catalogue: CatalogueSource): TouchDocumentParts {
  if (document.model.name !== HARMONY_TOUCH_MODEL) refuse(`the document is for the ${document.model.name}, not the ${HARMONY_TOUCH_MODEL}`);
  if (document.touch !== undefined) refuse('the document carries a Touch\'s own block, which is read by readTouchSetupFile; describeTouchDocument writes it in the shape of version 2');
  if (document.favourites !== undefined) refuse('the document states favourite channels, which nothing here composes: the favourites documents stay the remote\'s');
  if (document.choices !== undefined) refuse('the document states choices, and the Harmony Touch\'s family makes none');
  for (const device of document.devices) refuseUncarried(device);
  refuseUnplaced(document);
  const resolved = resolveMaps(TOUCH_MAPS, document.model.skin ?? TOUCH_SKIN, document, catalogue);
  // Each device's commands by their name folded to lower case, as the engine finds a command, for the checks below.
  const spellings = new Map<string, Spelling>();
  const spellingOf = (name: string): Spelling => {
    let spell = spellings.get(name);
    if (spell === undefined) {
      spell = spellingOfDevice(document.devices.find((d) => d.name === name)!, catalogue);
      spellings.set(name, spell);
    }
    return spell;
  };

  const devices = document.devices.map((device, k): SetupDevice => {
    const what = `the device ${device.name}`;
    const { slug, file } = entryOf(device.device);
    const found = catalogue.device(slug, file);
    const t = { ...catalogue.driving(slug, file).timing, ...device.timing };
    const owner = resolved.devices[k]!;
    return {
      id: ourId('device', device.id, what),
      name: device.name,
      manufacturer: found.manufacturer,
      model: found.model ?? refuse(`${device.device}: the catalogue states no model`),
      controlPort: 0,
      pressRepeats: t.pressMinRepeats,
      interKeyDelayMs: t.interKeyDelay,
      interDeviceDelayMs: t.interDeviceDelay,
      power: {
        onDelayMs: t.powerOnDelay ?? 0,
        keptOnBetweenActivities: device.poweredOnBetweenActivities ?? false,
        alwaysOn: device.power?.alwaysOn ?? false,
      },
      inputDelayMs: t.inputDelay,
      // No tuning stated is the catalogue's whole, which the composer keeps when the setup states none.
      ...(device.channelTuning === undefined ? {} : {
        channelTuning: setupTuningOf(device.channelTuning, catalogue.driving(slug, file).channelTuning, spellingOf(device.name), `${what}'s channel tuning`),
      }),
      buttons: [...buttonsOf(owner, device.name, spellingOf), ...entriesOf(owner, device.name, new Set())],
    };
  });

  const favourites = favouritesActivity(document.activities);
  const activities = document.activities.map((activity, k): OwnActivity => {
    const what = `the activity ${activity.name}`;
    const owner = resolved.activities[k]!;
    if (!(ACTIVITY_TYPES as readonly string[]).includes(activity.type)) refuse(`${what} is of the type ${activity.type}, which is no type of Logitech's`);
    const opensOn = activity.opensOn ?? DEFAULT_OPENS_ON;
    if (!(ACTIVITY_START_SCREENS as readonly string[]).includes(opensOn)) refuse(`${what} opens on ${opensOn}, and a Harmony Touch's activity of ours opens on ${ACTIVITY_START_SCREENS.join(', ')}`);
    for (const item of activity.screen ?? []) {
      if ('steps' in item && item.steps !== undefined) refuse(`${what}'s screen states the sequence ${item.sequence} with steps by scan code, which a Harmony Touch has none of`);
    }
    const order = activity.powerOrder ?? defaultPowerOrder(activity);
    const start = activity.start ?? [];
    const end = activity.end ?? [];
    const sequences = (activity.sequences ?? []).map((one) => sequenceOf(one, what));
    return {
      id: ourId('activity', activity.id, what),
      name: activity.name,
      type: activity.type as ActivityTypeName,
      startScreen: opensOn as OwnActivity['startScreen'],
      order: k,
      ...(k === favourites ? { tuningDefault: true } : {}),
      devices: activity.devices.map((u) => ({
        device: u.device,
        roles: roleKindsOf(u.roles),
        powerOn: order.indexOf(u.device) + 1,
        // The power off order is the power on order, numbered after the end steps: the module docstring's hypothesis.
        powerOff: end.length + order.indexOf(u.device) + 1,
        ...(u.input === undefined ? {} : { input: u.input }),
      })),
      ...(start.length === 0 ? {} : { enter: start.map((step, j) => stepOf(step, order.length + j + 1, `${what}'s start`)) }),
      ...(end.length === 0 ? {} : { leave: end.map((step, j) => stepOf(step, j + 1, `${what}'s end`)) }),
      buttons: [...buttonsOf(owner, undefined, spellingOf), ...entriesOf(owner, undefined, new Set(sequences.map((one) => one.name)))] as OwnButton[],
      ...(sequences.length === 0 ? {} : { sequences }),
    };
  });

  return { setup: { devices, activities }, protocols: protocolIdsOf(document, catalogue), settings: settingsOf(document) };
}

// ---------------------------------------------------------------------------------------------------
// The converter: an old document's block in the shape of version 2
// ---------------------------------------------------------------------------------------------------

/** One place and press of a map, by the place's word, and what it does there. */
type Bindings = Map<string, RecipeKeyAction>;

/** An action of the ordered form as a document states one. */
function actionOf(press: SetupPress | OwnPress | undefined, own: string | undefined, what: string): RecipeKeyAction | undefined {
  if (press === undefined) return undefined;
  if (typeof press === 'string') return { device: own!, command: press };
  if ('client' in press) return refuse(`${what} opens the number pad, which a key of a document does not state`);
  if ('sequence' in press) return { sequence: press.sequence };
  return { device: press.device, command: press.command };
}

/** Every key, gesture and pad place a map binds, by `place/press`. */
function bindingsOf(buttons: readonly (SetupButton | OwnButton)[], own: string | undefined, what: string): Bindings {
  const out: Bindings = new Map();
  const put = (place: string, press: RecipePress, p: SetupPress | OwnPress | undefined): void => {
    const action = actionOf(p, own, `${what}'s ${place}`);
    if (action !== undefined) out.set(`${place}/${press}`, action);
  };
  for (const b of buttons) {
    const named = b.key !== undefined ? placeOfTouchKey(b.key) : b.gesture;
    if (named !== undefined) {
      put(named, 'short', b.press);
      put(named, 'held', b.longPress);
      put(named, 'double', b.doublePress);
      continue;
    }
    if (b.group === PAD_GROUP) {
      const place = padPlaceAt(b.index ?? -1);
      if (place === undefined) refuse(`${what}'s number pad holds an entry at ${String(b.index)}, where the pad has no key`);
      put(place!, 'short', b.press);
    }
  }
  return out;
}

/** The choices that make `derived` bind as `given` does, in the order of the places and their presses. */
function keyChoices(given: Bindings, derived: Bindings): RecipeKey[] {
  const out: RecipeKey[] = [];
  for (const place of touchPlaces()) {
    for (const press of place.presses) {
      const at = `${place.key}/${press}`;
      const g = given.get(at);
      const d = derived.get(at);
      if (JSON.stringify(g) === JSON.stringify(d)) continue;
      out.push({ key: place.key, ...(press === 'short' ? {} : { press }), action: g ?? { nothing: true } });
    }
  }
  return out;
}

/** A map's list entries, the pad's aside, in the order of their place, a shared place in the map's own order. */
function listOf(buttons: readonly (SetupButton | OwnButton)[]): (SetupButton | OwnButton)[] {
  return buttons.filter((b) => b.entry !== undefined && b.group !== PAD_GROUP).map((b, k) => ({ b, k }))
    .sort((x, y) => (x.b.index! - y.b.index!) || (x.k - y.k)).map((one) => one.b);
}

/** What one entry is, its group, label and action, so two lists can be compared entry for entry. */
const entryText = (b: SetupButton | OwnButton): string => JSON.stringify([b.group ?? LIST_GROUP, b.entry, b.press]);

/**
 * Whether a derived list says what a given one does: the same entries, each at the same place, but where the given list
 * puts two entries on one place. **A document's list cannot stack two entries on one place**, and the remote shows only
 * the later of two, `activities-and-buttons.md` "Three traps in IndexInMenu"; the rule puts each at a place of its own.
 * So an entry Logitech's set stacks on another's place is read as the rule's entry at its own place, and the difference
 * is the round trip's to list, not a list the converter states.
 */
function sameList(given: readonly (SetupButton | OwnButton)[], derived: readonly (SetupButton | OwnButton)[]): boolean {
  if (given.length !== derived.length) return false;
  const placeOf = new Map(derived.map((b) => [entryText(b), b.index]));
  const shared = (index: number | undefined): boolean => given.filter((b) => b.index === index).length > 1;
  return given.every((b) => placeOf.has(entryText(b)) && (placeOf.get(entryText(b)) === b.index || shared(b.index)));
}

/** A list of the ordered form as a document's screen items, the pad's opener left to the family. */
function screenOf(list: readonly (SetupButton | OwnButton)[], own: string | undefined, what: string): RecipeScreenItem[] {
  return list.flatMap((b): RecipeScreenItem[] => {
    if (typeof b.press !== 'string' && 'client' in b.press) {
      if (own === undefined) refuse(`${what}'s list holds an entry opening the number pad, which an activity's list of a document does not state`);
      return [];
    }
    if (typeof b.press !== 'string' && 'sequence' in b.press) {
      if (b.entry !== b.press.sequence) refuse(`${what}'s entry ${String(b.entry)} runs the sequence ${b.press.sequence} under another name, which a document's list does not state`);
      return [{ sequence: b.press.sequence }];
    }
    const action = actionOf(b.press, own, what) as { device: string; command: string };
    return [{ device: action.device, command: action.command, ...(b.entry === action.command ? {} : { label: b.entry! }) }];
  });
}

/** A step of the setup as a document states it: seconds as whole tenths, the order left to the family. */
function documentStepOf(step: OwnActivityStep, what: string): RecipeActivityStep {
  if ('delaySeconds' in step) {
    const tenths = Math.round(step.delaySeconds * 10);
    if (Math.abs(tenths - step.delaySeconds * 10) > 1e-9 || tenths < 1) refuse(`${what} pauses ${step.delaySeconds} seconds, which is no whole number of tenths`);
    return { pause: tenths };
  }
  if ('channel' in step) return { device: step.device, channel: step.channel };
  return { device: step.device, command: step.command };
}

/**
 * **A block's channel tuning as the members a document states**, member by member against the catalogue's, which is
 * what `setupTuningOf` keeps for a member a document leaves out: a member the block gives as the catalogue's is left
 * out, and one it gives otherwise is stated. Undefined where nothing differs, the block states no tuning among them.
 * **Refused**: a member the block gives as none, a null list or null digits, where the catalogue's has one, since a
 * document leaving the member out keeps the catalogue's and an empty list is a press of no command, not none.
 */
function tuningChoicesOf(tuning: SetupChannelTuning | undefined, device: RecipeDevice, catalogue: CatalogueSource, what: string): DeviceChannelTuning | undefined {
  if (tuning === undefined) return undefined;
  const { slug, file } = entryOf(device.device);
  const kept = setupTuningOf({}, catalogue.driving(slug, file).channelTuning, spellingOfDevice(device, catalogue), `${what}'s channel tuning`);
  // Logitech's press of no command is an empty list in a document, `setupTuningOf`.
  const steps = (names: readonly string[]): DriveStep[] => (names.length === 1 && names[0] === '' ? [] : names.map((command) => ({ kind: 'send' as const, command })));
  const out: { fixedDigits?: number; start?: DriveStep[]; finish?: DriveStep[]; greaterTen?: DriveStep[]; greaterHundred?: DriveStep[] } = {};
  if (tuning.fixedDigits !== kept.fixedDigits) {
    if (tuning.fixedDigits === null) refuse(`${what}'s channel tuning sends a number as it stands where the catalogue's fixes its digits at ${kept.fixedDigits}, which a document cannot state`);
    out.fixedDigits = tuning.fixedDigits!;
  }
  for (const member of TUNING_LISTS) {
    const given = tuning[member];
    if (JSON.stringify(given) === JSON.stringify(kept[member])) continue;
    if (given === undefined) refuse(`${what}'s channel tuning has no ${member} where the catalogue's has one, which a document cannot state`);
    out[member] = steps(given!);
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

/** A setting's text as a document states it: a yes or no row true or false, a number row a number. */
function typedSetting(name: string, value: string): RecipeSetting {
  const row = SETTING_ROWS[name];
  if (row?.kind === 'yes or no' && (value === 'true' || value === 'false')) return value === 'true';
  if (row?.kind === 'whole number' && /^(0|[1-9][0-9]*)$/.test(value)) return Number(value);
  return value;
}

/**
 * **An old document with a Touch's own block, as the smallest document of version 2 that says the same**, decision 43.
 * The block's setup, `setupOfSetupFile` over the records `catalogueOfArchive` writes from `catalogue`, is compared with
 * the setup the family derives from a document stating only the devices, the activities and the settings, and every
 * field of version 2 is stated where the two differ and left out where they agree.
 *
 * **What it cannot state, and so leaves for the comparison to list**: a control port, which the family writes as 0; two
 * list entries stacked on one place, `sameList`; a pad entry's label, which the family gives; a key's group; the numbers
 * the block gives steps and power places, which the family numbers; and a power off order other than the power on order.
 * Each changes a field of the documents built; `touch-resolve.test.ts` lists what it changes on the bench setup.
 *
 * **Refuses**: an id outside the hundred `ID_BASES` gives each kind, since a document's id could not give it back; a
 * press count of null, which a document's timing cannot state; a pause that is no whole number of tenths; an entry
 * opening the pad on an activity's list, or one running a sequence under another name; and what `setupOfSetupFile`
 * and `touchSetupOfDocument` refuse.
 */
export function describeTouchDocument(old: TouchSetupFile, catalogue: CatalogueSource): Recipe {
  const given = setupOfSetupFile(old, catalogueOfArchive(old, catalogue));
  const partOfActivity = (name: string) => old.touch.activities.find((one) => one.activity === name)!;
  // The activities in the order the block lists them, which is the document's order in version 2.
  const activities = [...old.activities].sort((a, b) => partOfActivity(a.name).order - partOfActivity(b.name).order);
  const base: Recipe = {
    version: 2,
    ...(old.about === undefined ? {} : { about: old.about }),
    model: old.model,
    devices: old.devices.map((d): RecipeDevice => {
      const part = old.touch.devices.find((one) => one.device === d.name)!;
      return {
        id: toolkitId('device', part.id, `the device ${d.name}`), name: d.name, device: d.device,
        ...(d.poweredOnBetweenActivities === undefined ? {} : { poweredOnBetweenActivities: d.poweredOnBetweenActivities }),
        ...(d.definition === undefined ? {} : { definition: d.definition }),
      };
    }),
    activities: activities.map((a): RecipeActivity => ({
      id: toolkitId('activity', partOfActivity(a.name).id, `the activity ${a.name}`), name: a.name, type: a.type, devices: a.devices,
    })),
    ...(old.protocols === undefined ? {} : { protocols: old.protocols }),
    settings: Object.fromEntries(Object.entries(old.touch.settings).map(([name, value]) => [name, typedSetting(name, value)])),
  };
  const derived = touchSetupOfDocument(base, catalogue).setup;

  const devices = base.devices.map((device, k): RecipeDevice => {
    const what = `the device ${device.name}`;
    const g = given.devices[k]!;
    const d = derived.devices[k]!;
    // The five members a Touch's device record carries, `TIMING_CARRIED`, each a number.
    const timing: { pressMinRepeats?: number; interKeyDelay?: number; interDeviceDelay?: number; powerOnDelay?: number; inputDelay?: number } = {};
    if (g.pressRepeats !== d.pressRepeats) {
      if (g.pressRepeats === null) refuse(`${what} repeats a press as the engine's own count, which a document's timing does not state`);
      timing.pressMinRepeats = g.pressRepeats!;
    }
    if (g.interKeyDelayMs !== d.interKeyDelayMs) timing.interKeyDelay = g.interKeyDelayMs;
    if (g.interDeviceDelayMs !== d.interDeviceDelayMs) timing.interDeviceDelay = g.interDeviceDelayMs;
    if (g.power?.onDelayMs !== undefined && g.power.onDelayMs !== d.power?.onDelayMs) timing.powerOnDelay = g.power.onDelayMs;
    if (g.inputDelayMs !== undefined && g.inputDelayMs !== d.inputDelayMs) timing.inputDelay = g.inputDelayMs;
    const channelTuning = tuningChoicesOf(g.channelTuning, device, catalogue, what);
    const keys = keyChoices(bindingsOf(g.buttons, device.name, what), bindingsOf(d.buttons, device.name, what));
    const list = listOf(g.buttons);
    const screen = sameList(list, listOf(d.buttons)) ? undefined : screenOf(list, device.name, what);
    return {
      ...device,
      ...(keys.length === 0 ? {} : { keys }),
      ...(Object.keys(timing).length === 0 ? {} : { timing }),
      ...(g.power?.alwaysOn === true && d.power?.alwaysOn !== true ? { power: { alwaysOn: true } } : {}),
      ...(channelTuning === undefined ? {} : { channelTuning }),
      // A device's list names commands alone, `screenOf` leaving the pad's opener to the family.
      ...(screen === undefined ? {} : { screen: screen as readonly RecipeScreenCommand[] }),
    };
  });

  const givenActivity = (name: string): OwnActivity => given.activities.find((one) => one.name === name)!;
  const favouritesGiven = base.activities.findIndex((a) => givenActivity(a.name).tuningDefault === true);
  const favouritesDerived = derived.activities.findIndex((a) => a.tuningDefault === true);
  const activityDocs = base.activities.map((activity, k): RecipeActivity => {
    const what = `the activity ${activity.name}`;
    const g = givenActivity(activity.name);
    const d = derived.activities[k]!;
    // The favourites: stated where the block gives them to another activity than the rule would, and where the block
    // gives them to none, refused on each activity the rule could pick, so it picks none.
    let favourites: boolean | undefined;
    if (favouritesGiven !== favouritesDerived) {
      if (k === favouritesGiven) favourites = true;
      else if (favouritesGiven < 0 && activity.devices.some((u) => u.roles.includes('ChannelChanging'))) favourites = false;
    }
    const byPlace = (orders: (u: OwnActivity['devices'][number]) => number) => [...g.devices].sort((x, y) => orders(x) - orders(y)).map((u) => u.device);
    const powerOrder = byPlace((u) => u.powerOn);
    const derivedOrder = [...d.devices].sort((x, y) => x.powerOn - y.powerOn).map((u) => u.device);
    const sorted = (steps: readonly OwnActivityStep[] | undefined) => [...(steps ?? [])].map((step, j) => ({ step, j }))
      .sort((x, y) => ((x.step.order ?? x.j + 1) - (y.step.order ?? y.j + 1))).map((one) => one.step);
    const start = sorted(g.enter).map((step) => documentStepOf(step, `${what}'s start`));
    const end = sorted(g.leave).map((step) => documentStepOf(step, `${what}'s end`));
    const sequences = (g.sequences ?? []).map((s): RecipeSequence => ({
      id: toolkitId('sequence', s.id, `${what}'s sequence ${s.name}`), name: s.name,
      steps: s.steps.map((step) => ('delaySeconds' in step ? documentStepOf(step, `${what}'s sequence ${s.name}`) as { pause: number } : step)),
    }));
    const keys = keyChoices(bindingsOf(g.buttons ?? [], undefined, what), bindingsOf(d.buttons ?? [], undefined, what));
    const list = listOf(g.buttons ?? []);
    const screen = sameList(list, listOf(d.buttons ?? [])) ? undefined : screenOf(list, undefined, what);
    return {
      ...activity,
      ...(screen === undefined ? {} : { screen }),
      ...(keys.length === 0 ? {} : { keys }),
      ...(g.startScreen === d.startScreen ? {} : { opensOn: g.startScreen }),
      ...(favourites === undefined ? {} : { favourites }),
      ...(JSON.stringify(powerOrder) === JSON.stringify(derivedOrder) ? {} : { powerOrder }),
      ...(start.length === 0 ? {} : { start }),
      ...(end.length === 0 ? {} : { end }),
      ...(sequences.length === 0 ? {} : { sequences }),
    };
  });

  // Read back as a document, so what the converter gives is one the reader takes, and every member left undefined goes.
  return readRecipe(JSON.parse(JSON.stringify({ ...base, devices, activities: activityDocs })));
}
