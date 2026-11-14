/**
 * The keys a recipe chooses otherwise, built on the Harmony One, `Family.recipeKeys`, requirements R31 and R32: which
 * keys a recipe may name, by Logitech's word for each, the scan each word is, and how a device mode's own map takes
 * another binding once the device is composed.
 *
 * **Which keys.** The 37 keypad keys a device mode's own map holds an entry for on every device mode of the eighteen
 * English compiles, `DEVICE_MODE_SCANS` without its touch codes, section 397 and 420: scans 1 to 40 but 34, 37 and 38,
 * the Activities, Off and Help keys, which no map binds. The touch codes are left out because a device mode binds
 * them to nothing on every compile and the pages beside it bind them, and an activity's keypad map is a set of keypad
 * keys, `reference/config-format/modes-and-keys.md`, so a choice there would take a screen's key away.
 *
 * **How device mode's map is rebound: in place.** Every One device mode states all 46 key codes, each bound to a list
 * or swallowed, `00 00 00`, section 420, so changing what a key does there is one entry's operand and opcode, a same
 * length edit, `setModeListEntry`, and leaving it bound to nothing is the swallow the compiles already write for a key
 * the device has no command for. The device pages builder on the composed path describes every device mode off the
 * configuration, the list each key runs included, and builds it again, `devicepages.ts`, so what this writes is what
 * that builds. The press only: the One records presses alone, section 17.
 *
 * Measured on configurations, never on a unit: a device mode whose key sends another device's code is not in any
 * compile read, and what the remote does with one is not checked.
 */
import { type Container, parse } from '../../container/gspm.ts';
import { ACTION_LIST_INDEX_OPCODE, modeRecords, taggedList } from '../../container/sections.ts';
import { applyEdits, EditError, setModeListEntry } from '../../edit/edit.ts';
import { devices } from '../../inventory/inventory.ts';
import { KEY_EVENT_PRESS, KEY_EVENT_SHIFT } from '../../inventory/instructions.ts';
import { ComposeError, restamped } from '../../shared/core.ts';
import type { RecipeKeyBuilder } from '../family.ts';
import { DEVICE_MODE_SCANS } from './devicepages.ts';

/** The touch codes start here: 43 and 44 the keys below the screen, 45, and the pads' 48 to 53, section 125. */
const FIRST_TOUCH_CODE = 43;

/** The keypad keys a device mode's map and an activity's map bind on the Harmony One, 37 of them. */
export const ONE_KEYPAD_SCANS: ReadonlySet<number> = new Set(DEVICE_MODE_SCANS.filter((scan) => scan < FIRST_TOUCH_CODE));

/**
 * Logitech's word for each of the 37 keypad keys a recipe may choose on the Harmony One, by scan, in scan order: the
 * words `reference/remotes/harmony-one/keys.md` gives each scan, which Logitech's button maps named against a
 * configuration compiled to a known setup, section 133, and the devices' own maps decided for the four arrow keys,
 * section 398. The scans are `ONE_KEYPAD_SCANS` exactly, which `onerecipekeys.test.ts` holds.
 *
 * **Scan 13 is `Enter`, the key printed "E" with "enter" below it**, which the drawing names but carries no scan for,
 * since no button map of section 133's names it. Two routes give it, each from other fields than the other:
 *
 * * **What Logitech binds to it.** In device mode Logitech's compiler binds scan 13 to a device's `NumberEnter`, on
 *   four of the 33 device modes of seven One compiles, and to its `Enter` on three of the six that hold an `Enter`
 *   and no `NumberEnter`: the command the Enter key takes on the Harmony 600, 650 and 700 too, scan 54
 *   of that family's table, `HARD_KEYS`; section 397, and `ONE_HARD_KEYS` here.
 * * **It is the one key left.** The keypad has 40 keys, `keys.md`, and reports scans 1 to 40. The drawing gives 36 of
 *   them a scan; the welcome tour asks for the Activities, Help and Off keys as scans 34, 38 and 37, section 412; that
 *   leaves scan 13 and one drawn key with no scan, Enter.
 *
 * Neither is a press of the key on a unit, which nothing has measured.
 */
const ONE_KEYPAD_KEYS: readonly { readonly scan: number; readonly key: string }[] = [
  { scan: 1, key: 'Number4' }, { scan: 2, key: 'Exit' }, { scan: 3, key: 'VolumeUp' }, { scan: 4, key: 'VolumeDown' },
  { scan: 5, key: 'Rewind' }, { scan: 6, key: 'SkipBack' }, { scan: 7, key: 'Record' }, { scan: 8, key: 'Number1' },
  { scan: 9, key: 'VolumeMute' }, { scan: 10, key: 'Info' }, { scan: 11, key: 'DirectionLeft' },
  { scan: 12, key: 'NumberPlus' }, { scan: 13, key: 'Enter' }, { scan: 14, key: 'Number0' }, { scan: 15, key: 'Number9' },
  { scan: 16, key: 'Number8' }, { scan: 17, key: 'Number6' }, { scan: 18, key: 'Guide' }, { scan: 19, key: 'ChannelUp' },
  { scan: 20, key: 'ChannelDown' }, { scan: 21, key: 'FastForward' }, { scan: 22, key: 'SkipForward' },
  { scan: 23, key: 'Stop' }, { scan: 24, key: 'Number3' }, { scan: 25, key: 'Number5' }, { scan: 26, key: 'DownArrow' },
  { scan: 27, key: 'DirectionUp' }, { scan: 28, key: 'Select' }, { scan: 29, key: 'DirectionDown' },
  { scan: 30, key: 'Play' }, { scan: 31, key: 'Pause' }, { scan: 32, key: 'Number2' }, { scan: 33, key: 'DirectionRight' },
  { scan: 35, key: 'PrevChannel' }, { scan: 36, key: 'UpArrow' }, { scan: 39, key: 'Number7' }, { scan: 40, key: 'Menu' },
];

/** The scan of each word, for the shared composer and the binding below; a word not on the keypad has none. */
const SCAN_OF_KEY: ReadonlyMap<string, number> = new Map(ONE_KEYPAD_KEYS.map((one) => [one.key, one.scan]));

/**
 * Device mode's own map for the device of `group`, with the press of the key named `key` running `list`, or swallowed
 * where `list` is undefined. The device's mode is the one the device list enters for it, `devices`, which reads it
 * off the list's row and the pages the row reaches, never off the keypad map this changes.
 */
function bindOneDeviceModeKey(c: Container, group: number, key: string, list: number | undefined): Uint8Array {
  const scan = SCAN_OF_KEY.get(key);
  if (scan === undefined || !ONE_KEYPAD_SCANS.has(scan)) throw new ComposeError(`a Harmony One device mode binds no key named ${key}`);
  const mode = devices(c).find((one) => one.group === group)?.mode;
  if (mode === undefined) throw new ComposeError(`device ${group} has no device mode the device list enters`);
  const tag = (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan;
  const record = (modeRecords(c) ?? [])[mode];
  const entries = record === undefined ? undefined : taggedList(c, record.start)?.entries;
  if (entries?.some((one) => one.tag === tag) !== true) {
    throw new ComposeError(`device ${group}'s mode ${mode} states no entry for the ${key} key, scan ${scan}, which every device mode of the Harmony One does`);
  }
  // The trailer restamped first on a copy, since `applyEdits` refuses a container whose checksum disagrees with its
  // bytes and a composer's intermediate result is not always stamped.
  const stamped = parse(restamped(Uint8Array.from(c.blob)));
  try {
    const entry = list === undefined ? { operand: 0, opcode: 0 } : { operand: list, opcode: ACTION_LIST_INDEX_OPCODE };
    return applyEdits(stamped, setModeListEntry(stamped, mode, tag, entry)).bytes;
  } catch (error) {
    if (error instanceof EditError) throw new ComposeError(`binding the ${key} key of device ${group}'s mode: ${error.message}`);
    throw error;
  }
}

export const ONE_RECIPE_KEYS: RecipeKeyBuilder = {
  keys: ONE_KEYPAD_KEYS.map((one) => one.key),
  scanOf: (key) => SCAN_OF_KEY.get(key),
  bindDeviceModeKey: bindOneDeviceModeKey,
};
