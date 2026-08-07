/**
 * Watch the keypad scanner's RAM while somebody presses keys. Read only.
 *
 *   node packages/usb/bin/watch-keys.ts --product 0xc122
 *   node packages/usb/bin/watch-keys.ts --product 0xc121 --address 0x2fb,0x202
 *
 * This is the button mapping experiment of `docs/roadmap.md` step 6, and the reason the emulator
 * could be deferred: `READ_MISC` selector `0x07` reads one byte of the data memory of a running
 * remote, so the scanner's own variable can be watched from the host while a human works the
 * keypad. Nothing is written and nothing is queued; see `packages/usb/src/rails.ts`.
 *
 * The addresses default to what the firmware says they are for the attached model, so the normal
 * invocation names no address at all. `--address` exists for trying a candidate.
 *
 * Output is one line per change, `<seconds> <address> <old> -> <new>`, plus the decoded scan code.
 * A key that reads 0 means nothing is held, so a press and its release are two lines.
 */
import { HarmonyRemote, listHarmony, openHarmony } from '@harmony/usb';

/**
 * The variable holding the scan code of the key currently held, per model.
 *
 * Read off each architecture's own firmware rather than assumed to be shared, because the RAM
 * layout is not: the 700 keeps it at `0x3A2` and the 600's build of the same code keeps it at
 * `0x73D`. The One gets two addresses because it has two candidates and no reason yet to prefer
 * one, which is exactly the kind of question a live read settles faster than a disassembler.
 */
const WATCH: Record<number, { name: string; addresses: number[] }> = {
  0xc122: { name: 'Harmony 600', addresses: [0x073d] },
  0xc121: { name: 'Harmony One', addresses: [0x02fb, 0x0202] },
};

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
const known = WATCH[found.productId];
const override = argument('address');
const addresses =
  override === undefined
    ? known?.addresses
    : override.split(',').map((t) => Number.parseInt(t.trim(), 16));

if (addresses === undefined) {
  fail(
    `no default address for product 0x${found.productId.toString(16)}; pass --address 0x73d`,
  );
}

const remote = new HarmonyRemote(await openHarmony({ productId: found.productId }), {
  timeoutMs: 2000,
});

const label = known?.name ?? `product 0x${found.productId.toString(16)}`;
const watched = addresses.map((a) => `0x${a.toString(16).padStart(3, '0')}`).join(' ');
process.stderr.write(`watching ${label}, data ${watched}. Ctrl-C to stop.\n`);
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
  for (const address of addresses) previous.set(address, await remote.readRam(address));
  for (const [address, value] of previous) {
    process.stderr.write(`  resting 0x${address.toString(16)} = ${value}\n`);
  }
  process.stderr.write('\n');

  while (running) {
    for (const address of addresses) {
      const value = await remote.readRam(address);
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
