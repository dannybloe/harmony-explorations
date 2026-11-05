/**
 * Watch the keypad scanner's RAM while somebody presses keys. Read only.
 *
 *   node packages/usb/bin/watch-keys.ts --product 0xc122
 *   node packages/usb/bin/watch-keys.ts --product 0xc121 --address 0x2fb,0x202
 *   node packages/usb/bin/watch-keys.ts --product 0xc121 --address 0xf81 --mask 0xf3
 *
 * This is the button mapping experiment of `docs/plans/002-the-roadmap.md` step 6, and the reason the emulator
 * could be deferred: `READ_MISC` selector `0x07` reads one byte of the data memory of a running
 * remote, so the scanner's own variable can be watched from the host while a human works the
 * keypad. Nothing is written and nothing is queued; see `packages/usb/src/rails.ts`.
 *
 * The addresses default to what the firmware says they are for the attached model, so the normal
 * invocation names no address at all. `--address` exists for trying a candidate.
 *
 * Output is one line per change, `<seconds> <address> <old> -> <new>`, plus the decoded scan code.
 * A key that reads 0 means nothing is held, so a press and its release are two lines.
 *
 * The body runs only when this file is the program, so a test can import the default table and
 * `defaultWatch` with no remote attached, `packages/usb/test/watch-keys.test.ts`.
 */
import { HarmonyRemote, listHarmony, openHarmony, skinId } from '@harmony/usb';

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
 * Arch 8's defaults by skin, which this platform's `bcdDevice` carries in plain binary (`skinId`).
 *
 * The held key and the last key pressed, as a pair, for the same reason as the 525's. On the 880, the
 * 885 and the 880 Pro, skins 15, 17 and 39, the press handler keeps the held key at `0x295` and copies
 * it to `0x3A1`, which nothing clears; the three applications carry that handler byte for byte. The
 * Harmony 720, skin 44, runs its own build of the same handler with the held key at `0x296`, still
 * copied to `0x3A1`. **The product id cannot choose between them, and the wrong choice is not merely
 * silent**: on an 885 `0x296` holds what the keypad's debounce is loaded from, set at start and not
 * moved by the keys. The 785, skin 45, has
 * no image here and gets no default. Read in the images, and the 885's measured on two units:
 * `tests/test_harmony_885_keys.py`.
 */
export const WATCH_BY_SKIN: Readonly<Record<number, Watch>> = {
  15: { name: 'Harmony 880', addresses: [0x0295, 0x03a1] },
  17: { name: 'Harmony 885', addresses: [0x0295, 0x03a1] },
  39: { name: 'Harmony 880 Pro', addresses: [0x0295, 0x03a1] },
  44: { name: 'Harmony 720', addresses: [0x0296, 0x03a1] },
};

/**
 * The default for an attached remote, from its product id and its `bcdDevice` (`FoundRemote.release`),
 * or undefined when nothing has been read for it. On arch 8 the skin decides, and a `bcdDevice` that is
 * missing or names no skin gives no default rather than a guess.
 */
export function defaultWatch(productId: number, release: number | undefined): Watch | undefined {
  if (productId === ARCH_8_PRODUCT) {
    const skin = release === undefined ? undefined : skinId(release);
    return skin === undefined ? undefined : WATCH_BY_SKIN[skin];
  }
  return WATCH[productId];
}

/** Health check: a byte whose value the firmware fixes, so a wrong answer is visible. */
const POLL_INTERVAL_MS = 25;

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const wanted = argument('product');
  const attached = await listHarmony();
  const candidates =
    wanted === undefined
      ? attached
      : attached.filter((d) => d.productId === Number.parseInt(wanted, 16));

  if (candidates.length === 0) fail('no matching Harmony remote attached');
  if (candidates.length > 1) {
    const seen = candidates.map((d) => `0x${d.productId.toString(16)}`).join(', ');
    fail(`${candidates.length} remotes match (${seen}); pass --product to say which`);
  }

  const found = candidates[0] as (typeof attached)[number];
  const known = defaultWatch(found.productId, found.release);
  const override = argument('address');
  const addresses =
    override === undefined
      ? known?.addresses
      : override.split(',').map((t) => Number.parseInt(t.trim(), 16));

  if (addresses === undefined) {
    const release = found.release === undefined ? '' : `, bcdDevice 0x${found.release.toString(16)}`;
    fail(`no default address for product 0x${found.productId.toString(16)}${release}; pass --address 0x73d`);
  }

  // Watching a port rather than a variable means watching a byte with unrelated traffic in it: the
  // Harmony 600 and the One both toggle PORTB bit 2 independently of the keypad, which doubles the
  // line count and makes a press easy to miscount. A mask keeps the bits that are being studied.
  const maskArgument = argument('mask');
  const mask = maskArgument === undefined ? 0xff : Number.parseInt(maskArgument, 16);

  const remote = new HarmonyRemote(await openHarmony({ productId: found.productId }), {
    timeoutMs: 2000,
  });

  const label = known?.name ?? `product 0x${found.productId.toString(16)}`;
  const watched = addresses.map((a) => `0x${a.toString(16).padStart(3, '0')}`).join(' ');
  const masked = mask === 0xff ? '' : `, mask 0x${mask.toString(16)}`;
  process.stderr.write(`watching ${label}, data ${watched}${masked}. Ctrl-C to stop.\n`);
  process.stderr.write('press each key in turn and hold it briefly.\n\n');

  // Ctrl-C has to close the handle rather than kill the process, or the device is left claimed.
  let running = true;
  process.on('SIGINT', () => {
    running = false;
  });

  const started = Date.now();
  // Seeded from the first read rather than from 0, so the resting value is not reported as an event.
  const previous = new Map<number, number>();
  try {
    // A remote that has been idle loses the first command sent to it, and here that command would be
    // the read that seeds the resting value: a lost read seeds a phantom, and every later comparison
    // is against it. So the version exchange goes first and absorbs the loss, retried because it is
    // itself a first command. Same reasoning as `read-window.ts`, `docs/findings.md` section 88.
    let awake = false;
    for (let attempt = 1; attempt <= 4 && !awake; attempt += 1) {
      try {
        await remote.getVersion();
        awake = true;
        if (attempt > 1) process.stderr.write(`(woke on attempt ${attempt})\n`);
      } catch {
        // Deliberately swallowed: the retry is the handling, and the failure is reported below.
      }
    }
    if (!awake) fail('the remote is not answering');

    for (const address of addresses) previous.set(address, (await remote.readRam(address)) & mask);
    for (const [address, value] of previous) {
      process.stderr.write(`  resting 0x${address.toString(16)} = ${value}\n`);
    }
    process.stderr.write('\n');

    while (running) {
      for (const address of addresses) {
        const value = (await remote.readRam(address)) & mask;
        const was = previous.get(address);
        if (value === was) continue;
        previous.set(address, value);
        const seconds = ((Date.now() - started) / 1000).toFixed(2);
        // The event type bits are ORed on by the firmware when it raises the event, so what sits in
        // this variable is the bare scan code and the two top bits should stay clear. Report them if
        // they do not, rather than masking them away and hiding the surprise.
        const extra = value & 0xc0 ? `  (top bits set: 0x${(value & 0xc0).toString(16)})` : '';
        process.stdout.write(
          `${seconds.padStart(8)}  0x${address.toString(16).padStart(3, '0')}  ` +
            `${String(was).padStart(3)} -> ${String(value).padStart(3)}${extra}\n`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  } finally {
    await remote.close();
    process.stderr.write('\nclosed.\n');
  }
}

if (import.meta.main) await main();
