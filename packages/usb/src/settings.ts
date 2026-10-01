/**
 * The arch 14 settings store as it sits in a dump of internal program memory, so a read over USB can
 * be compared with what the lab already holds. Sections 282 and 303.
 *
 * Two 1 KiB blocks from `0x01EC00`, used one at a time, each a four byte header and then two byte
 * records, setting then value, appended; the latest record for a setting wins. Settings `0x00` to
 * `0x13` are five power on delay slots and `0x18` to `0x2B` five inter device ones, each slot four
 * settings: a big endian key, then a big endian value. A slot is empty when its key's high byte is `0xFF`,
 * which is the test the firmware's save makes, `0xE0D0`, section 305; an empty slot normally reads
 * `0xFFFF`, and a clear interrupted after its first write leaves `0xFFxx`, which is empty all the same.
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
      // Empty by the firmware's own test, the key's high byte alone, section 305.
      if (at(s) === ERASED) continue;
      const key = (at(s) << 8) | at(s + 1);
      out.push({ table, slot, key, value: (at(s + 2) << 8) | at(s + 3) });
    }
  }
  return out;
}

/** One record a settings write appends: a setting and its new value. */
export interface SettingWrite {
  readonly setting: number;
  readonly value: number;
}

/** The active block's header on every arch 14 unit read here, the Harmony 600, 650 and 700. */
export const ACTIVE_BLOCK_HEADER: readonly number[] = [0xfc, 0xff, 0x00, 0x00];

/**
 * What the store's two blocks will hold after `writes`, computed the way the 0.2 firmware appends,
 * section 304, plus how many records that takes. `store` is the two blocks exactly, 2048 bytes.
 *
 * The firmware's append, `0xDB60`, looks the setting up first and **writes nothing** when it already
 * holds the value; otherwise it programs the setting and the value at the first record from offset 4
 * whose setting byte is `0xFF`, which is `0xD368`. Both are modelled here, so a read back after the
 * write can be compared byte for byte with this rather than with an expectation written by hand.
 *
 * **Refuses every store shape in which the firmware would do anything else**, since those are the
 * shapes this does not model: block 0 must carry the header all three units carry and block 1 must be
 * erased, so the copy between blocks has not run; everything after the first free record must be
 * erased, so the next append lands where this says; and the last write must end before the block's
 * last record, because a write landing there makes the firmware copy the store to the other block,
 * which erases a block of internal program memory, `0xDCF8`.
 */
export function predictStoreAfter(
  store: Uint8Array,
  writes: readonly SettingWrite[],
): { after: Uint8Array; appended: number; freeBefore: number } {
  if (store.length !== 2 * STORE_BLOCK_BYTES) {
    throw new Error(`the store is two blocks of ${STORE_BLOCK_BYTES} bytes, and this is ${store.length}`);
  }
  const header = [...store.subarray(0, 4)];
  if (header.some((b, i) => b !== ACTIVE_BLOCK_HEADER[i])) {
    throw new Error(`block 0's header is ${header.map((b) => b.toString(16)).join(' ')}, not the active header`);
  }
  if (store.subarray(STORE_BLOCK_BYTES).some((b) => b !== ERASED)) {
    throw new Error('block 1 is not erased, so the store is not in the shape every unit here is in');
  }
  let free = 4;
  while (free < STORE_BLOCK_BYTES && store[free] !== ERASED) free += 2;
  if (store.subarray(free, STORE_BLOCK_BYTES).some((b) => b !== ERASED)) {
    throw new Error(`the store holds bytes after its first free record at 0x${free.toString(16)}`);
  }
  const freeBefore = (STORE_BLOCK_BYTES - free) / 2;
  const after = Uint8Array.from(store);
  const latest = latestSettings(store);
  let appended = 0;
  for (const { setting, value } of writes) {
    if ((latest.get(setting) ?? ERASED) === value) continue;
    if (free + 2 >= STORE_BLOCK_BYTES) {
      throw new Error('the write would fill the block, and the firmware then copies the store and erases');
    }
    after[free] = setting;
    after[free + 1] = value;
    latest.set(setting, value);
    free += 2;
    appended += 1;
  }
  return { after, appended, freeBefore };
}

/** The four writes that empty a delay slot, in the order the firmware's own purge wrote them. */
export function clearSlotWrites(table: DelaySlot['table'], slot: number): SettingWrite[] {
  if (!Number.isInteger(slot) || slot < 0 || slot >= SLOTS_PER_TABLE) throw new Error(`no delay slot ${slot}`);
  const first = (table === 'power on' ? POWER_ON_SLOTS : INTER_DEVICE_SLOTS) + 4 * slot;
  return [0, 1, 2, 3].map((i) => ({ setting: first + i, value: ERASED }));
}
