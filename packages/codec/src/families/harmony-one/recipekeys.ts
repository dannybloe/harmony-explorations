/**
 * The keys a recipe chooses otherwise, built on the Harmony One, `Family.recipeKeys`, requirements R31 and R32: which
 * keys a recipe may name, and how a device mode's own map takes another binding once the device is composed.
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
 * Device mode's own map for the device of `group`, with the press of `scan` running `list`, or swallowed where `list`
 * is undefined. The device's mode is the one the device list enters for it, `devices`, which reads it off the list's
 * row and the pages the row reaches, never off the keypad map this changes.
 */
function bindOneDeviceModeKey(c: Container, group: number, scan: number, list: number | undefined): Uint8Array {
  if (!ONE_KEYPAD_SCANS.has(scan)) throw new ComposeError(`a Harmony One device mode binds no key of scan ${scan}`);
  const mode = devices(c).find((one) => one.group === group)?.mode;
  if (mode === undefined) throw new ComposeError(`device ${group} has no device mode the device list enters`);
  const tag = (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan;
  const record = (modeRecords(c) ?? [])[mode];
  const entries = record === undefined ? undefined : taggedList(c, record.start)?.entries;
  if (entries?.some((one) => one.tag === tag) !== true) {
    throw new ComposeError(`device ${group}'s mode ${mode} states no entry for scan ${scan}, which every device mode of the Harmony One does`);
  }
  // The trailer restamped first on a copy, since `applyEdits` refuses a container whose checksum disagrees with its
  // bytes and a composer's intermediate result is not always stamped.
  const stamped = parse(restamped(Uint8Array.from(c.blob)));
  try {
    const entry = list === undefined ? { operand: 0, opcode: 0 } : { operand: list, opcode: ACTION_LIST_INDEX_OPCODE };
    return applyEdits(stamped, setModeListEntry(stamped, mode, tag, entry)).bytes;
  } catch (error) {
    if (error instanceof EditError) throw new ComposeError(`binding scan ${scan} of device ${group}'s mode: ${error.message}`);
    throw error;
  }
}

export const ONE_RECIPE_KEYS: RecipeKeyBuilder = { scans: ONE_KEYPAD_SCANS, bindDeviceModeKey: bindOneDeviceModeKey };
