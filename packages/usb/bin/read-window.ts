/**
 * Read one window of external flash off a connected remote and print it.
 *
 *   node packages/usb/bin/read-window.ts --address 0x230000 --count 16
 *   node packages/usb/bin/read-window.ts --address 0x230000 --count 16 --compare 0x030000
 *
 * `--path` picks between remotes that enumerate identically, which two Harmony Ones do. It says
 * which port, not which unit: identify the unit from what it holds.
 *
 * For answering a question about a specific address, which `read-config.ts` cannot do because it
 * reads the config region and nothing else. Read only, and it opens the device, so reach for it
 * deliberately: `list-remotes.ts` is the one that only looks.
 *
 * `--compare` reads a second window of the same length and reports whether the two are identical.
 * That is the shape most address questions here take: does this address alias that one, which is
 * how a flash part that ignores an address bit gives itself away.
 *
 * Internal program memory is deliberately not reachable from here. It has its own path, which
 * refuses an odd count, because the firmware's fetch loop subtracts two and exits on zero.
 *
 * **It sends `GET_VERSION` first, and that is not politeness.** A remote that has been idle loses
 * the first command sent to it: a Harmony One returned nothing at its own config base on the first
 * try and the same read three times in a row immediately after. Since the question this tool
 * usually answers is "does this address answer", a silence with two possible causes is worthless,
 * so the version exchange goes first and its failure is reported as the remote not answering
 * rather than as an empty window.
 */
import {
  HarmonyRemote,
  SOFTWARE_TYPE_SAFE_MODE,
  architectureFromVersion,
  listHarmony,
  openHarmony,
  softwareTypeFromVersion,
} from '../src/index.ts';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function number(text: string | undefined, what: string): number | undefined {
  if (text === undefined) return undefined;
  const value = Number(text);
  if (!Number.isInteger(value) || value < 0) fail(`${what} is not a whole number: ${text}`);
  return value;
}

function hex(data: Uint8Array): string {
  return [...data].map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

/** Printable ASCII, so a container cookie is readable beside the bytes that spell it. */
function ascii(data: Uint8Array): string {
  return [...data].map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');
}

const address = number(argument('address'), 'the address');
const count = number(argument('count'), 'the count') ?? 16;
const compare = number(argument('compare'), 'the compare address');
if (address === undefined) {
  fail('usage: read-window.ts --address 0x... [--count 16] [--compare 0x...] [--product 0xc122]');
}
if (count <= 0 || count > 0x1000) fail(`a count of ${count} is outside what this tool will do`);

const wanted = argument('product');
const wantedPath = argument('path');
const attached = await listHarmony();
const candidates = attached.filter(
  (d) =>
    (wanted === undefined || d.productId === Number.parseInt(wanted, 16)) &&
    (wantedPath === undefined || d.path === wantedPath),
);

if (candidates.length === 0) fail('no matching Harmony remote attached');
if (candidates.length > 1) {
  // Two Harmony Ones enumerate identically, so `--product` cannot separate them. The path can,
  // and it says which port rather than which unit: identify the unit from what it holds, never
  // from the path or the label. `docs/findings.md` section 88.
  const seen = candidates.map((d) => `0x${d.productId.toString(16)} at ${d.path}`).join(', ');
  fail(`${candidates.length} remotes match (${seen}); pass --path to say which`);
}

const found = candidates[0] as { productId: number; path: string | undefined };
process.stdout.write(`product 0x${found.productId.toString(16)} at ${found.path}\n`);

const architecture = number(argument('architecture'), 'the architecture');
const remote = new HarmonyRemote(
  await openHarmony(
    found.path === undefined
      ? { productId: found.productId }
      : { productId: found.productId, path: found.path },
  ),
  architecture === undefined ? {} : { architecture },
);
try {
  // The wake up and the go/no-go in one. See the note at the top: without it, a lost first command
  // is indistinguishable from an address the device refuses, which is the thing this tool is for.
  //
  // Retried, because the version exchange is itself a first command and so is itself the one that
  // gets lost. A remote that has been sitting idle swallowed three of these in a row on 9 August
  // 2026 and answered on the fourth, which is why the count is not one.
  let version: Uint8Array | undefined;
  let lastError = '';
  for (let attempt = 1; attempt <= 4 && version === undefined; attempt += 1) {
    try {
      version = await remote.getVersion();
      if (attempt > 1) process.stdout.write(`(woke on attempt ${attempt})\n`);
    } catch (error) {
      lastError = (error as Error).message;
    }
  }
  if (version === undefined) fail(`the remote is not answering: ${lastError}`);
  process.stdout.write(`version   ${hex(version)}\n`);

  // The remote has just stated its own architecture and its own software type. Use them, rather
  // than letting the region validator fall back to arch 12 with the answer sitting right here:
  // that refused a legitimate 525 read while printing a reply that said 9. Section 118.
  const stated = architectureFromVersion(version);
  const software = softwareTypeFromVersion(version);
  if (software === SOFTWARE_TYPE_SAFE_MODE) {
    process.stdout.write('          this remote is in SAFE MODE (software type 4)\n');
  }
  if (architecture === undefined && stated !== undefined) {
    process.stdout.write(`          using architecture ${stated}, as the remote states it\n`);
    remote.useArchitecture(stated);
  } else if (architecture !== undefined && stated !== undefined && stated !== architecture) {
    // A disagreement is worth stopping for: one of the two is wrong about which address rule
    // applies, and guessing which would be exactly the silent wrong answer this tool exists to avoid.
    fail(`--architecture ${architecture} but the remote states ${stated}`);
  }

  const first = await remote.readFlash(address, count);
  process.stdout.write(`0x${address.toString(16).padStart(6, '0')}  ${hex(first)}  |${ascii(first)}|\n`);

  if (compare !== undefined) {
    const second = await remote.readFlash(compare, count);
    process.stdout.write(
      `0x${compare.toString(16).padStart(6, '0')}  ${hex(second)}  |${ascii(second)}|\n`,
    );
    const same = first.length === second.length && first.every((b, i) => b === second[i]);
    process.stdout.write(same ? '\nidentical\n' : '\ndifferent\n');
  }
} finally {
  await remote.close();
}
