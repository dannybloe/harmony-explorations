/**
 * Report the keypad column of every key pressed on a connected remote. Read only.
 *
 *   node packages/usb/bin/watch-columns.ts --product 0xc122
 *
 * **Why the column and not the scan code.** A remote on USB sits in sync mode and does not run
 * its application, so the keypad handler never runs and the scan code is never computed: the
 * variable it would land in stays put no matter what is pressed. What the firmware does instead is
 * park all fourteen row lines low and enable interrupt-on-change on the column port, so that any
 * key pulls its own column down and wakes the part. That parked state is readable, which makes the
 * column observable and the row not.
 *
 * The scan code is `row * 4 + column` with the column running 1 to 4, so a pressed key reports
 * `(code - 1) mod 4` and nothing more. A quarter of the mapping, and the only quarter USB gives.
 *
 * The port and the bit numbering come from the firmware's own column reader, which returns 1 for
 * `PORTB` bit 4 through 4 for bit 7, testing with `BTFSS` so a low bit is the active one.
 * `docs/findings.md` section 13.
 */
import { HarmonyRemote, listHarmony, openHarmony } from '@harmony/usb';

/** `PORTB`. The column lines are its top nibble; the low nibble belongs to something else. */
const PORTB = 0x0f81;
const COLUMN_MASK = 0xf0;
const FIRST_COLUMN_BIT = 4;
const POLL_INTERVAL_MS = 15;

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/** Which columns are active, as 1 to 4. Active low, so a clear bit is a pressed column. */
function columnsOf(portb: number): number[] {
  const out: number[] = [];
  for (let bit = FIRST_COLUMN_BIT; bit < 8; bit += 1) {
    if ((portb & (1 << bit)) === 0) out.push(bit - FIRST_COLUMN_BIT + 1);
  }
  return out;
}

const wanted = argument('product');
const attached = await listHarmony();
const candidates =
  wanted === undefined
    ? attached
    : attached.filter((d) => d.productId === Number.parseInt(wanted, 16));
if (candidates.length === 0) fail('no matching Harmony remote attached');
if (candidates.length > 1) fail(`${candidates.length} remotes match; pass --product to say which`);

const found = candidates[0] as (typeof attached)[number];
const remote = new HarmonyRemote(await openHarmony({ productId: found.productId }), {
  timeoutMs: 2000,
});

let running = true;
process.on('SIGINT', () => {
  running = false;
});

const started = Date.now();
let presses = 0;
try {
  let previous = (await remote.readRam(PORTB)) & COLUMN_MASK;
  process.stderr.write(
    `watching PORTB on product 0x${found.productId.toString(16)}, ` +
      `resting columns 0x${previous.toString(16)}. Ctrl-C to stop.\n\n`,
  );
  if (previous !== COLUMN_MASK) {
    process.stderr.write('warning: a column reads low at rest, so a key looks stuck down.\n\n');
  }

  while (running) {
    const value = (await remote.readRam(PORTB)) & COLUMN_MASK;
    if (value !== previous) {
      const seconds = ((Date.now() - started) / 1000).toFixed(2);
      // Only a transition into a pressed state is a press. Everything else is the release, which
      // is printed too, because a missing release means two keys overlapped and the next press
      // number would silently be wrong.
      if (value === COLUMN_MASK) {
        process.stdout.write(`${seconds.padStart(9)}  release\n`);
      } else {
        presses += 1;
        const columns = columnsOf(value).join('+');
        process.stdout.write(
          `${seconds.padStart(9)}  press ${String(presses).padStart(2)}  column ${columns}\n`,
        );
      }
      previous = value;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
} finally {
  await remote.close();
  process.stderr.write(`\n${presses} presses. closed.\n`);
}
