/**
 * Read one window of external flash off a connected remote and print it.
 *
 *   node packages/usb/bin/read-window.ts --address 0x230000 --count 16
 *   node packages/usb/bin/read-window.ts --address 0x230000 --count 16 --compare 0x030000
 *
 * For answering a question about a specific address, which `read-config.ts` cannot do because it
 * reads the config region and nothing else. Read only, and it opens the device, so reach for it
 * deliberately: `list-remotes.ts` is the one that only looks.
 *
 * `--compare` reads a second window of the same length and reports whether the two are identical.
 * That is the shape most address questions here take: does this address alias that one, which is
 * how a flash part that ignores an address bit gives itself away.
 *
 * Internal program memory is deliberately not reachable from here. It has its own path with a one
 * chunk cap, because a multi chunk internal read restarts the remote.
 */
import { HarmonyRemote, listHarmony, openHarmony } from '../src/index.ts';

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

const found = candidates[0] as { productId: number };
process.stdout.write(`product 0x${found.productId.toString(16)}\n`);

const remote = new HarmonyRemote(await openHarmony({ productId: found.productId }));
try {
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
