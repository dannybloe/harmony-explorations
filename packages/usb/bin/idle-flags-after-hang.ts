/**
 * Does an odd count read leave flash content in the remote's data memory, and in the idle flags?
 *
 *   HARMONY_ODD_READ_EXPERIMENT=1 node packages/usb/bin/idle-flags-after-hang.ts
 *
 * `docs/findings.md` sections 96 and 99, and the prediction is committed before this runs.
 *
 * **Everything here is a read.** The one write-shaped thing is the hang itself, which is a `READ_FLASH`
 * with an odd count: it sends no data and changes no storage, and what it does is make the firmware's
 * own loop scribble over its own data memory. That is the subject, so it is gated behind
 * `HARMONY_ODD_READ_EXPERIMENT=1` and nothing else here needs a flag.
 *
 * The remote will drop off the bus for about three seconds. Every hang so far has cleared itself and
 * the config has read back identical afterwards, but data memory is not the same until the batteries
 * come out, which is the whole point of the measurement.
 *
 * What it checks, in order:
 *
 *  1. a baseline of the four idle flags and two controls, on a healthy remote
 *  2. the deliberate hang: 63 bytes at page `0xFF` offset `0x1000`
 *  3. after it recovers, the same reads again
 *  4. and a window of data memory compared **byte for byte** against the page `0xFF` image, because
 *     the runaway deposits what it reads and the lab has the bytes it was reading
 *
 * Step 4 is the one that can fail sharply. Steps 1 to 3 could be explained by a dozen things; a
 * window of data memory that reproduces a known stretch of flash cannot.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HarmonyRemote, listHarmony, openHarmony, ODD_READ_EXPERIMENT } from '../src/index.ts';
import { LAB } from '@harmony/lab';

const PRODUCT_ONE = 0xc121;

/** `0x2628E` returns "idle" only when all four of these are zero, and mode 2 needs that. */
const IDLE_FLAGS = [0xed5, 0xed6, 0xedc, 0xedd];
/** Below the buffer the runaway starts from, so these must not change. Negative controls. */
const CONTROLS = [0x284, 0x315];

/** The hang: an odd count, at the offset every recorded hang has used. */
const HANG_PAGE = 0xff;
const HANG_OFFSET = 0x1000;
const HANG_COUNT = 63;

/**
 * Where the runaway starts writing, and what it is reading when it does.
 *
 * The sender's pointer is reloaded per report and the read body sends two bytes before its loop, so
 * the first deposited byte lands at `0x046A`. A 63 byte request chunks 62 then 1, so the chunk that
 * never terminates starts at page offset `0x1000 + 62`.
 */
const DEPOSIT_BASE = 0x046a;
const RUNAWAY_START = HANG_OFFSET + 62;

/**
 * The window of data memory to compare, chosen to avoid two things.
 *
 * Not from `0x046A` itself: every reply this script reads is itself written into the endpoint buffer
 * there, so the first handful of deposited bytes are gone before they can be looked at. And not above
 * `0xD31`, because that is where the runaway overwrites its own counter and then its own address, so
 * beyond it the deposits come from wherever the read jumped to and are not predictable.
 */
const WINDOW_START = 0x0480;
const WINDOW_LENGTH = 48;

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function hex(values: readonly number[]): string {
  return values.map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

async function firstOne(): Promise<{ productId: number; path: string | undefined } | undefined> {
  const found = (await listHarmony()).filter((d) => d.productId === PRODUCT_ONE);
  if (found.length > 1) fail(`${found.length} Harmony Ones attached; attach only the spare`);
  return found[0] as { productId: number; path: string | undefined } | undefined;
}

async function open(): Promise<HarmonyRemote> {
  const found = await firstOne();
  if (found === undefined) fail('no Harmony One attached');
  return new HarmonyRemote(
    await openHarmony(
      found.path === undefined
        ? { productId: found.productId }
        : { productId: found.productId, path: found.path },
    ),
  );
}

async function wake(remote: HarmonyRemote): Promise<void> {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await remote.getVersion();
      return;
    } catch {
      /* a remote that has been idle loses the first command sent to it */
    }
  }
  fail('the remote is not answering');
}

async function readMany(remote: HarmonyRemote, addresses: readonly number[]): Promise<number[]> {
  const out: number[] = [];
  for (const address of addresses) out.push(await remote.readRam(address));
  return out;
}

if (!ODD_READ_EXPERIMENT) {
  fail(
    'this experiment hangs the remote on purpose, so it needs HARMONY_ODD_READ_EXPERIMENT=1.\n' +
      'Read docs/findings.md section 96 first: the hang writes flash content over data memory.',
  );
}

/**
 * The page 0xFF image, by path rather than through the lab registry.
 *
 * That page is deliberately not in `packages/lab`'s table, because it holds the remote's identity
 * block and a test that loads it could print those bytes on a failure. This is a bench script and
 * nothing it prints is committed: the window it compares sits around offset 0x1080, which is nowhere
 * near the identity block at 0xF400, and what lands in a document is a count of matching bytes.
 */
function pageImage(): Uint8Array | undefined {
  if (LAB === undefined) return undefined;
  try {
    const path = join(LAB, 'firmware', 'derived', 'one-3.4-internal-page-ff-programmed.bin');
    return new Uint8Array(readFileSync(path));
  } catch {
    return undefined;
  }
}

const page = pageImage();
if (page === undefined) {
  process.stdout.write(
    'note: no page 0xFF image found, so step 4 will report the bytes without comparing them.\n\n',
  );
}

// Step 1: the baseline, on a healthy remote.
let baseline: number[];
let baselineControls: number[];
{
  const remote = await open();
  try {
    await wake(remote);
    baseline = await readMany(remote, IDLE_FLAGS);
    baselineControls = await readMany(remote, CONTROLS);
    process.stdout.write(`baseline idle flags   ${hex(baseline)}\n`);
    process.stdout.write(`baseline controls     ${hex(baselineControls)}   (0x284, 0x315)\n`);
  } finally {
    await remote.close();
  }
}
if (baseline.some((b) => b !== 0)) {
  process.stdout.write(
    '\nthe baseline is already not all zero, which the reading did not expect.\n' +
      'Take the batteries out, put them back, and run this again before reading anything into it.\n',
  );
  process.exit(1);
}
process.stdout.write('all four idle flags are zero, so the remote can reach its application\n\n');

// Step 2: the hang.
process.stdout.write(
  `hanging it on purpose: ${HANG_COUNT} bytes at page 0x${HANG_PAGE.toString(16)} offset ` +
    `0x${HANG_OFFSET.toString(16)}. It will leave the bus for a few seconds.\n`,
);
{
  const remote = await open();
  try {
    await wake(remote);
    await remote.readInternalMemoryExpectingAHang(HANG_PAGE, HANG_OFFSET, HANG_COUNT);
    process.stdout.write('  it RETURNED, which this offset has never done. Stop and read section 96.\n');
    process.exit(1);
  } catch {
    process.stdout.write('  it stopped answering, as expected\n');
  } finally {
    try {
      await remote.close();
    } catch {
      /* the handle is already gone with the device */
    }
  }
}

// Step 3: wait for it to come back on its own.
process.stdout.write('waiting for it to come back\n');
let back = false;
for (let waited = 0; waited < 60 && !back; waited += 1) {
  await sleep(1000);
  back = (await firstOne()) !== undefined;
}
if (!back) {
  fail('it did not come back within 60 s: this is the state the batteries clear, section 95');
}
process.stdout.write('  back on the bus\n\n');

{
  const remote = await open();
  try {
    await wake(remote);
    const after = await readMany(remote, IDLE_FLAGS);
    const afterControls = await readMany(remote, CONTROLS);
    process.stdout.write(`after    idle flags   ${hex(after)}\n`);
    process.stdout.write(`after    controls     ${hex(afterControls)}   (0x284, 0x315)\n\n`);

    const dirty = after.filter((b) => b !== 0).length;
    if (dirty > 0) {
      process.stdout.write(
        `${dirty} of the four idle flags are nonzero, so 0x2628E now reports "not idle".\n` +
          '  That is the hypothesis: the remote cannot enter its application by that route.\n',
      );
    } else {
      process.stdout.write(
        'all four are still zero, so the hypothesis is wrong or the recovery cleared data memory.\n' +
          '  Those are separable: a real reset also resets the clock, so look at the screen.\n',
      );
    }

    // Step 4: the sharp one. What the runaway deposited, against what it was reading.
    process.stdout.write('\ndata memory against the page 0xFF image:\n');
    const addresses = Array.from({ length: WINDOW_LENGTH }, (_, i) => WINDOW_START + i);
    const observed = await readMany(remote, addresses);
    process.stdout.write(`  0x${WINDOW_START.toString(16)}  ${hex(observed)}\n`);
    if (page !== undefined) {
      const from = RUNAWAY_START + (WINDOW_START - DEPOSIT_BASE);
      const expected = [...page.subarray(from, from + WINDOW_LENGTH)];
      process.stdout.write(`  page   ${hex(expected)}\n`);
      const same = observed.filter((b, i) => b === expected[i]).length;
      process.stdout.write(
        `  ${same} of ${WINDOW_LENGTH} bytes match, reading page 0x${HANG_PAGE.toString(16)} from ` +
          `offset 0x${from.toString(16)}\n`,
      );
      process.stdout.write(
        same === WINDOW_LENGTH
          ? '  byte for byte: the runaway deposited exactly what it was reading.\n'
          : '  not byte for byte. Section 96 predicted it would be; the difference is the finding.\n',
      );
    }
  } finally {
    await remote.close();
  }
}

process.stdout.write(
  '\nThe remote has flash content over its data memory now. Take the batteries out before\n' +
    'using it for anything else, and say what its screen was doing while all this happened.\n',
);
