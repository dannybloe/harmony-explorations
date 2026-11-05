/**
 * Where a running remote keeps the key being pressed, per model: the data memory addresses a host polls
 * over `READ_MISC` selector `0x07` to see a key without the remote sending anything of its own.
 *
 * **Moved out of `packages/usb/bin/watch-keys.ts` so that a browser can import it.** Two readers need the
 * same table: the command line watcher, which reaches the remote through node-hid, and the key reader page
 * of `packages/keyreader`, which reaches it through the browser's WebHID. A copy in the page would be a
 * second derivation of the same addresses, which this repository refuses, and the barrel of this package
 * pulls in node-hid, which a browser cannot load. So the table sits in a module that **imports nothing**,
 * like `protocol.ts` and `models.ts`, and both readers import it: the watcher through the barrel, the page
 * through the `@harmony/usb/keys` subpath.
 *
 * Choosing an entry for an attached remote stays with each reader, because each learns the skin a different
 * way: the watcher from `bcdDevice` (`skinId`), which WebHID does not expose, and the page from the
 * version block's field 5.
 */

/** What to watch on one model: its name for the banner and the data memory addresses. */
export interface Watch {
  readonly name: string;
  readonly addresses: readonly number[];
}

/**
 * The variable holding the scan code of the key currently held, per model.
 *
 * Read off each architecture's own firmware rather than assumed to be shared, because the RAM
 * layout is not: the 700 keeps it at `0x3A2` and the 600's build of the same code keeps it at
 * `0x73D`. The One gets two addresses because it has two candidates and no reason yet to prefer
 * one, which is exactly the kind of question a live read settles faster than a disassembler.
 *
 * Keyed by product id. That names the One and the 525, but `0xC122` is the 600's, 650's and 700's alike,
 * so on a 700 this entry watches the 600's address and `--address 0x3a2` is needed; the skin would
 * tell them apart, as it does for arch 8, and that change is not made here. Arch 8's product id is
 * not in this table, because every arch 8 model shares it and their addresses differ: `WATCH_BY_SKIN`.
 */
export const WATCH: Readonly<Record<number, Watch>> = {
  0xc122: { name: 'Harmony 600', addresses: [0x073d] },
  0xc121: { name: 'Harmony One', addresses: [0x02fb, 0x0202] },
  // Arch 9, read out of the 525's own internal firmware. `0x0701C` returns the scan code and the
  // handler at `0x070FA` holds the previous one in `0x2DE`, returning early when they are equal,
  // which is the debounce; on a change it copies to `0x2DE` and `0x3C8` and then ORs the event
  // type on elsewhere. Same three part shape as the 600's `0x73D`/`0x73F` and the 700's
  // `0x3A2`/`0x3A4`, so the pair is watched for the same reason.
  0xc111: { name: 'Harmony 525', addresses: [0x02de, 0x03c8] },
};

/** The product id every arch 8 remote enumerates with: the 880, 885, 880 Pro, 720 and 785 alike. */
export const ARCH_8_PRODUCT = 0xc110;

/**
 * Arch 8's defaults by skin.
 *
 * The held key and the last key pressed, **in that order**, as a pair, for the same reason as the 525's.
 * The key reader page relies on the order: the first address is the key held, zero when none, and the
 * second the last key pressed, which nothing clears. On the 880, the 885 and the 880 Pro, skins 15, 17
 * and 39, the press handler keeps the held key at `0x295` and copies it to `0x3A1`; the three applications
 * carry that handler byte for byte. The Harmony 720, skin 44, runs its own build of the same handler with
 * the held key at `0x296`, still copied to `0x3A1`. **The product id cannot choose between them, and the
 * wrong choice is not merely silent**: on an 885 `0x296` holds what the keypad's debounce is loaded from,
 * set at start and not moved by the keys. The 785, skin 45, has no image here and gets no entry. Read in
 * the images, and the 885's measured on two units: `tests/test_harmony_885_keys.py`.
 */
export const WATCH_BY_SKIN: Readonly<Record<number, Watch>> = {
  15: { name: 'Harmony 880', addresses: [0x0295, 0x03a1] },
  17: { name: 'Harmony 885', addresses: [0x0295, 0x03a1] },
  39: { name: 'Harmony 880 Pro', addresses: [0x0295, 0x03a1] },
  44: { name: 'Harmony 720', addresses: [0x0296, 0x03a1] },
};
