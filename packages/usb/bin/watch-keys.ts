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
 * The body runs only when this file is the program, so a test can import `defaultWatch` with no remote
 * attached, `packages/usb/test/watch-keys.test.ts`. The tables it chooses from are
 * `packages/base/src/keys.ts`, shared with the key reader page.
 */
import { HarmonyRemote, listHarmony, openHarmony, skinId } from '@harmony/usb';
import { ARCH_8_PRODUCT, WATCH, WATCH_BY_SKIN, type Watch } from '@harmony/base/keys';

// The tables of addresses lived here until the key reader page needed them too. They are in
// `packages/base/src/keys.ts` now, which imports nothing so that a browser can load it, and this script
// keeps only the choice of an entry from what node-hid reports.

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
