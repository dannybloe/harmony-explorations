/**
 * The arch 14 settings store as it sits in a dump of internal program memory, so a read over USB can
 * be compared with what the lab already holds. Sections 282 and 303.
 *
 * Two 1 KiB blocks from `0x01EC00`, used one at a time, each a four byte header and then two byte
 * records, setting then value, appended; the latest record for a setting wins. Settings `0x00` to
 * `0x13` are five power on delay slots and `0x18` to `0x2B` five inter device ones, each slot four
 * settings: a big endian key, then a big endian value, `0xFFFF` in the key when empty.
 *
 * Nothing here talks to a remote. `HarmonyRemote.readSetting` is the other half.
 */

/** Where the store starts inside a dump of internal page `0xFF`, and its two blocks. */
export const STORE_OFFSET_IN_PAGE = 0xec00;
export const STORE_BLOCK_BYTES = 0x400;
const ERASED = 0xff;

/** The settings that hold saved delays, in the order a slot is laid out, and setting `0x80`. */
export const POWER_ON_SLOTS = 0x00;
export const INTER_DEVICE_SLOTS = 0x18;
export const SLOTS_PER_TABLE = 5;
export const SETTING_0X80 = 0x80;
export const DELAY_SETTINGS: readonly number[] = [
  ...Array.from({ length: SLOTS_PER_TABLE * 4 }, (_, i) => POWER_ON_SLOTS + i),
  ...Array.from({ length: SLOTS_PER_TABLE * 4 }, (_, i) => INTER_DEVICE_SLOTS + i),
];

/**
 * The latest value of every setting in a page `0xFF` dump, or of the store alone when `page` is
 * exactly the two blocks.
 *
 * **The active block is the one whose header is not erased**, and a dump where both carry one is
 * refused: which of the two the firmware is using is decided by header bits nobody here has
 * re-derived, section 282, and guessing would compare a read against the wrong block.
 */
export function latestSettings(page: Uint8Array): Map<number, number> {
  const base = page.length === 2 * STORE_BLOCK_BYTES ? 0 : STORE_OFFSET_IN_PAGE;
  const blocks = [0, 1].map((n) => page.subarray(base + n * STORE_BLOCK_BYTES, base + (n + 1) * STORE_BLOCK_BYTES));
  if (blocks.some((block) => block.length !== STORE_BLOCK_BYTES)) {
    throw new Error(`a dump of ${page.length} bytes does not hold the store`);
  }
  const live = blocks.filter((block) => block.subarray(0, 4).some((b) => b !== ERASED));
  if (live.length !== 1) throw new Error(`${live.length} of the store's two blocks carry a header`);
  const block = live[0]!;
  const latest = new Map<number, number>();
  for (let at = 4; at < block.length; at += 2) {
    const setting = block[at]!;
    const value = block[at + 1]!;
    if (setting === ERASED && value === ERASED) continue;
    latest.set(setting, value);
  }
  return latest;
}

/** One saved delay slot: its key and value, or undefined for an empty slot. */
export interface DelaySlot {
  readonly table: 'power on' | 'inter device';
  readonly slot: number;
  readonly key: number;
  readonly value: number;
}

/**
 * The delay slots that hold a key, read out of any map from setting to value: the store's latest
 * values from a dump, or what the remote answered over USB. An absent setting reads as erased.
 */
export function delaySlots(settings: ReadonlyMap<number, number>): DelaySlot[] {
  const at = (setting: number) => settings.get(setting) ?? ERASED;
  const out: DelaySlot[] = [];
  for (const [table, first] of [['power on', POWER_ON_SLOTS], ['inter device', INTER_DEVICE_SLOTS]] as const) {
    for (let slot = 0; slot < SLOTS_PER_TABLE; slot += 1) {
      const s = first + 4 * slot;
      const key = (at(s) << 8) | at(s + 1);
      if (key === 0xffff) continue;
      out.push({ table, slot, key, value: (at(s + 2) << 8) | at(s + 3) });
    }
  }
  return out;
}
