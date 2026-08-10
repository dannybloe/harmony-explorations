/**
 * One round of the session-end control: does a clean read only session strand a remote?
 *
 *   node packages/usb/bin/session-end-control.ts
 *
 * `docs/findings.md` sections 95 and 99. The first round was run by hand on 10 August 2026 and the
 * remote left USB mode; this script exists so the repeats are cheap and, more to the point, so their
 * result is **recorded by the tooling rather than only seen**.
 *
 * The observation that matters is what the remote's screen does, and no script can see that. But
 * there is a machine readable proxy beside it: a remote stuck in USB mode does not enumerate when
 * the cable goes back in, sixteen seconds of polling and nothing, section 95. A remote that returned
 * to its normal display does enumerate. So plugging back in separates the two outcomes, and this
 * script does that leg itself and says which it saw.
 *
 * **Reads only, and it opens the device exactly once**, for the plain `READ_FLASH` that makes this a
 * session at all. Everything after that is enumeration, which asks the operating system what is
 * attached and sends nothing.
 *
 * Deliberately one round per run. A loop would invite leaving it going, and each round needs someone
 * watching a screen.
 */
import { HarmonyRemote, listHarmony, openHarmony } from '../src/index.ts';

const CONFIG_BASE = 0x040000;
const WINDOW = 32;
const PRODUCT_ONE = 0xc121;
/**
 * How long to wait for the remote to come back after a replug.
 *
 * **This was 25 seconds and that was too short, which cost a false negative on 10 August 2026.**
 * Section 95's stuck remote was polled for sixteen seconds, so 25 looked like margin. It is not:
 * the margin has to cover an operator walking to the desk and finding the socket, and round two of
 * the control took 17 seconds to re-enumerate for exactly that reason. A window that an unhurried
 * human can miss turns "the remote is stuck" and "the cable was not in yet" into the same output,
 * and the script then reports the first with a straight face.
 *
 * Two minutes, and the message on timeout now names both possibilities instead of one.
 */
const REPLUG_WAIT_MS = 120_000;
const POLL_MS = 1000;

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function hex(data: Uint8Array): string {
  return [...data].map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function attached(): Promise<boolean> {
  return (await listHarmony()).some((d) => d.productId === PRODUCT_ONE);
}

/** Polls enumeration until the predicate holds, or gives up. Returns how long it took. */
async function waitUntil(wanted: boolean, limitMs: number): Promise<number | undefined> {
  const started = Date.now();
  while (Date.now() - started < limitMs) {
    if ((await attached()) === wanted) return Date.now() - started;
    await sleep(POLL_MS);
  }
  return undefined;
}

if (!(await attached())) fail('attach the Harmony One first, then run this again');

const candidates = (await listHarmony()).filter((d) => d.productId === PRODUCT_ONE);
if (candidates.length > 1) fail(`${candidates.length} Harmony Ones attached; attach only one`);
const found = candidates[0] as { productId: number; path: string | undefined };

process.stdout.write(`product 0x${found.productId.toString(16)} at ${found.path}\n`);

const remote = new HarmonyRemote(
  await openHarmony(
    found.path === undefined
      ? { productId: found.productId }
      : { productId: found.productId, path: found.path },
  ),
);
let window: Uint8Array;
try {
  // Retried, because a remote that has been idle loses the first command sent to it.
  let version: Uint8Array | undefined;
  for (let attempt = 1; attempt <= 4 && version === undefined; attempt += 1) {
    try {
      version = await remote.getVersion();
    } catch {
      /* try again */
    }
  }
  if (version === undefined) fail('the remote is not answering');
  process.stdout.write(`version    ${hex(version)}\n`);
  window = await remote.readFlash(CONFIG_BASE, WINDOW);
  process.stdout.write(`config     ${hex(window)}\n`);
} finally {
  // The handle closes here, which is exactly what a read only session does and what section 95
  // thought was enough to strand a remote.
  await remote.close();
}

process.stdout.write('\nsession over, handle closed. Nothing else has been sent.\n\n');
process.stdout.write('Pull the USB cable now, and watch the screen.\n');

const gone = await waitUntil(false, 60_000);
if (gone === undefined) fail('the remote is still enumerated after 60 s: was the cable pulled?');
process.stdout.write(`  cable out after ${(gone / 1000).toFixed(0)} s\n\n`);

process.stdout.write('Now plug it back in, without touching anything else.\n');
const back = await waitUntil(true, REPLUG_WAIT_MS);

process.stdout.write('\n');
if (back === undefined) {
  process.stdout.write(
    `it did NOT enumerate within ${REPLUG_WAIT_MS / 1000} s.\n` +
      '  EITHER the remote is stuck in USB mode, section 95, OR the cable was not back in yet.\n' +
      '  This script cannot tell those apart, so it does not claim to: say which it was, and what\n' +
      '  the screen showed when the cable came out. If it is stuck, the batteries clear it.\n',
  );
} else {
  process.stdout.write(
    `it enumerated again after ${(back / 1000).toFixed(0)} s.\n` +
      '  consistent with the remote having left USB mode, which is what round one showed.\n' +
      '  Say what the screen showed anyway: enumerating is the proxy, the screen is the evidence.\n',
  );
}
