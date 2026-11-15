/**
 * **The Harmony One's maps**, decision 43, `FamilyMaps` in `families/maps.ts`: the model's places, the commands it
 * carries of a device, a device's default map and an activity's, each derived by the same functions the One's build
 * runs, so what an application is shown for a key before anything is built is what the build gives that key.
 *
 * **Where each member's rule lives, and why none is restated here.**
 *
 * * **The commands** are the shared catalogue composer's judgement, `catalogueCommandsCarried`, which is the one
 *   `catalogueDevicePlan` takes a whole device's commands by: every name of the codeset once, carried where its code
 *   composes.
 * * **A device's default map** is the compiler's layout, `deviceModeLayout`, with the One's hard keys,
 *   `ONE_HARD_KEYS`, the table the build lays a whole device out by. The layout is computed over every command, carried
 *   or not, as the build computes it, and a command the build cannot carry is then dropped from the keys and the screen
 *   as the build drops it, `composeCatalogueDevice`, which leaves its key unbound and gives its place on the screen to
 *   the next; it does not move another command onto the key.
 * * **An activity's default map** is section 323's rule, `activityKeysOfDevices`, the function the build's
 *   `activityKeysFromRoles` calls with the same rules read off a container. Here it is given each device's default map
 *   with keys in Logitech's words, and the One's rules, `ONE_ACTIVITY_KEYS`, in the same words, `keyRulesIn`.
 *
 * **Keys in words.** A key is Logitech's word for it, the One's recipe keys, `ONE_RECIPE_KEYS`; a scan is turned into a
 * word through that table and never anywhere else, so a word the family takes is a word the build can bind.
 *
 * **What is not derived here, and why.** A device's screen in device mode is the layout's; the One draws a command's
 * label from its name, so the default screen carries no label. The build's device screen can hold one item more than
 * the default screen here: the made up amplifier of `test/families/harmony-one/onerecipemaps.test.ts`, two inputs,
 * gets an item that draws no label and runs a value map instead of sending a code; what it is and whether it belongs in
 * the default screen as an entry the remote acts on itself is not checked. An activity's working screen is empty by
 * default: the build puts on it what the document states and nothing else, `composeSetup`. What an activity's own
 * screens bind in its map, the code 55 that enters the device list, is no keypad key and no place a map chooses, so it
 * is not in the maps: the build binds it beside whatever the rule gives.
 *
 * Which architectures: the Harmony One alone, whose family this is. Which skins: every One skin is answered with the
 * same places, since the keypad and its scans are the same on each; the build is run on skin 54 only,
 * `composedSkins`, and refuses the others itself.
 */
import { catalogueCommandsCarried } from '../../compose/composecatalogue.ts';
import { activityKeysOfDevices, keyDevicesOfRoles, keyRulesIn, type ActivityKeyRules, type KeyRuleDevice } from '../../compose/activityroles.ts';
import { deviceModeLayout } from '../../compose/devicemode.ts';
import { RecipeError } from '../../recipe/recipe.ts';
import type {
  ActivityMap, ActivityMapBinding, DeviceMap, DeviceMapBinding, FamilyMaps, MapCommand, MapDeviceView, MapPlace, MapSurface,
} from '../maps.ts';
import { ONE_HARD_KEYS } from './devicekeys.ts';
import { ONE_ACTIVITY_KEYS } from './keypadrules.ts';
import { ONE_RECIPE_KEYS } from './recipekeys.ts';

/**
 * The word of each keypad scan the One's maps bind, from the recipe keys' own table, so a scan has one word in the
 * whole family: the word a document chooses a key by is the word its default is answered under.
 */
const WORD_OF_SCAN: ReadonlyMap<number, string> = new Map(ONE_RECIPE_KEYS.keys.flatMap((key) => {
  const scan = ONE_RECIPE_KEYS.scanOf(key);
  return scan === undefined ? [] : [[scan, key] as const];
}));

/**
 * The places of the keypad and the panel that no device's or activity's map binds, by the words the One's drawing gives
 * them, `reference/silhouettes/one.svg`, and why a person's choice is not built on each. The configuration binds each of
 * them outside those maps: Activities, Off and Help are scans 34, 37 and 38, and the page strips 46 and 47, whose presses
 * the fixed handler sets below every map bind, with the welcome screen's own map binding 34; the two keys below the
 * screen are 43 and 44, which the screens' own pages bind, `reference/architectures/harmony-one/compiler.md` and
 * `reference/remotes/harmony-one/keys.md`. What the remote then does on each press is the reference's to say, not this
 * table's. Activities, Off and Help are keypad keys; the other four are touch keys, as the drawing names them.
 */
const REMOTE_PLACES: readonly { readonly key: string; readonly surface: MapSurface; readonly why: string }[] = [
  { key: 'Activities', surface: 'keypad', why: 'no device\'s or activity\'s map binds this key; the configuration binds it outside them' },
  { key: 'Off', surface: 'keypad', why: 'no device\'s or activity\'s map binds this key; the configuration binds it outside them' },
  { key: 'Help', surface: 'keypad', why: 'no device\'s or activity\'s map binds this key; the configuration binds it outside them' },
  { key: 'ScreenPrev', surface: 'touch', why: 'no device\'s or activity\'s map binds this strip beside the screen; the configuration binds it outside them' },
  { key: 'ScreenNext', surface: 'touch', why: 'no device\'s or activity\'s map binds this strip beside the screen; the configuration binds it outside them' },
  { key: 'SoftLeft', surface: 'touch', why: 'no device\'s or activity\'s map binds this key below the screen; the configuration binds it outside them' },
  { key: 'SoftRight', surface: 'touch', why: 'no device\'s or activity\'s map binds this key below the screen; the configuration binds it outside them' },
];

/**
 * The One's places: the 37 keypad keys its maps bind, in the scan order of the recipe keys' table, a short press each,
 * since the One has no long press, bindable in a device's own map and an activity's; then the seven no such map binds,
 * not built.
 */
const ONE_PLACES: readonly MapPlace[] = [
  ...ONE_RECIPE_KEYS.keys.map((key): MapPlace => ({ key, surface: 'keypad', presses: ['short'], boundBy: 'both', built: true })),
  ...REMOTE_PLACES.map((one): MapPlace => ({
    key: one.key, surface: one.surface, presses: ['short'], boundBy: 'remote', built: false, why: one.why,
  })),
];

/**
 * The One's activity key rules in its words, made on first use rather than as the module loads: this module and the
 * one holding the rule reach each other through the registry, and a table made at load could run before the rule's
 * module is ready. Refused, by `keyRulesIn`, where a scan of the rules has no word.
 */
let wordRules: ActivityKeyRules<string> | undefined;
export const oneActivityKeyWords = (): ActivityKeyRules<string> => {
  wordRules ??= keyRulesIn(ONE_ACTIVITY_KEYS, (scan) => WORD_OF_SCAN.get(scan));
  return wordRules;
};

/**
 * A device's default map: the compiler's layout over every command, with the One's hard keys, its scans turned into
 * words, and what the build cannot carry dropped from both halves. A scan the hard keys bind that has no word would be
 * a key the build binds and the maps cannot name, so it is refused rather than left out.
 */
function oneDeviceMap(commands: readonly MapCommand[]): DeviceMap {
  const layout = deviceModeLayout(commands.map((one) => one.name), ONE_HARD_KEYS);
  const carried = new Set(commands.filter((one) => one.carried).map((one) => one.name));
  const keys: DeviceMapBinding[] = [];
  for (const [scan, command] of layout.keys) {
    if (!carried.has(command)) continue;
    const key = WORD_OF_SCAN.get(scan);
    if (key === undefined) throw new RecipeError(`the Harmony One's hard keys bind scan ${scan}, which has no word`);
    keys.push({ key, press: 'short', command });
  }
  return { keys, screen: layout.screen.filter((name) => carried.has(name)).map((command) => ({ command })) };
}

/**
 * **Whether a default screen's entry is drawn as `name`**, as the activity rule asks it of the control device's screen
 * for the Exit key and the lower arrow: where the entry's label, or its command's own name when it has none, is `name`.
 *
 * **Why this is not the build's own function.** The build asks the same question of a container, `oneDrawsName`: it lays
 * `name` out on a pad in the configuration's pad font and compares the lines with the lines the item draws. That needs a
 * container's font and character map, and the maps read no container, so the maps cannot call it; and the build cannot
 * call this one, since what a container holds is drawn text and not a command's name, a Logitech compile's among them.
 * The two part where the pad draws two names alike: measured, `SubtitleLanguage` and `Subtitle Language` are broken
 * onto the same two lines, so the build draws either as the other, where `PageDown` and `Page Down` are not, the first
 * fitting one line. The names the activity rule asks for, Exit, PageDown and StepBack, each fit one line, so for them
 * the two agree, which `test/families/harmony-one/onerecipemaps.test.ts` holds item by item on a document whose control
 * device draws two of them, with the measured parting as its control.
 */
export function oneScreenEntryDraws(entry: { readonly command: string; readonly label?: string }, name: string): boolean {
  return (entry.label ?? entry.command) === name;
}

/**
 * One device's default map as the activity rule reads it: its keys by word, and its screen's commands, each drawn as
 * `oneScreenEntryDraws` says.
 */
function ruleDevice(view: MapDeviceView): KeyRuleDevice<string, string> {
  return {
    keys: new Map(view.map.keys.filter((one) => one.press === 'short').map((one) => [one.key, one.command])),
    screen: () => view.map.screen.flatMap((one) => ('command' in one
      ? [{ command: one.command, draws: (name: string) => oneScreenEntryDraws(one, name) }]
      : [])),
  };
}

/**
 * An activity's default map: the two devices its keys follow, from its devices' roles, `keyDevicesOfRoles`, the rule
 * over their default maps, and each key bound to the command of the device it came from. The screen is empty, as the
 * build leaves an activity's working screen where the document states none.
 */
function oneActivityMap(activity: Parameters<FamilyMaps['activityMap']>[0], deviceOf: (device: string) => MapDeviceView): ActivityMap {
  const { volume, control } = keyDevicesOfRoles(activity.devices, (one) => one.device);
  const keys = activityKeysOfDevices(
    oneActivityKeyWords(),
    control === undefined ? undefined : ruleDevice(deviceOf(control)),
    volume === undefined ? undefined : ruleDevice(deviceOf(volume)),
  );
  const bindings: ActivityMapBinding[] = [...keys].map(([key, one]) => ({
    key, press: 'short', command: one.command, device: (one.from === 'control' ? control : volume) as string,
  }));
  return { keys: bindings, screen: [] };
}

export const ONE_MAPS: FamilyMaps = {
  places: () => ONE_PLACES,
  // The device's catalogue entry as the build reads it, `<manufacturer>/<model>`. A person's own codes for single
  // commands, `RecipeDevice.commands`, are not counted: no build reads them yet, and every build refuses a document
  // stating them, `refuseUnbuiltFields`.
  commands: (device, catalogue) => {
    const [manufacturer, model] = device.device.split('/');
    if (manufacturer === undefined || model === undefined) {
      throw new RecipeError(`${device.name}'s device is not <manufacturer>/<model>`);
    }
    return catalogueCommandsCarried(catalogue, manufacturer, model);
  },
  deviceMap: oneDeviceMap,
  activityMap: oneActivityMap,
};
