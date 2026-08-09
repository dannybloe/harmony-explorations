/**
 * Read a window of the data memory of a running remote and print it. Read only.
 *
 *   node packages/usb/bin/read-ram.ts --product 0xc111 --address 0x000 --count 256
 *   node packages/usb/bin/read-ram.ts --product 0xc111 --address 0x000 --count 0x800 --summary
 *
 * The RAM analogue of `read-window.ts`, and it exists for the same reason: `watch-keys.ts` reports
 * changes, so it cannot tell a variable that never moves from an address the remote does not
 * serve. Both look identical from the host, and on arch 9 that difference decided a measurement.
 * Every SFR read back zero there, `PORTC` included, which is impossible on a part that is actively
 * driving USB, so the reads were not landing where they were aimed. A watcher would have reported
 * that as a clean negative result.
 *
 * `--summary` prints how many bytes were nonzero instead of the bytes themselves, which is the
 * question a positive control actually asks: does this window contain anything at all.
 *
 * `READ_MISC` selector `0x07` reads one byte per exchange, so a window costs one exchange a byte
 * and a whole 2 KiB bank is slow but not unreasonable. Nothing is written; see
 * `packages/usb/src/rails.ts`.
 */
import { HarmonyRemote, listHarmony, openHarmony } from '../src/index.ts';
import { MISC_RAM, readMiscRequest } from '../src/protocol.ts';

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

const address = number(argument('address'), 'the address');
const count = number(argument('count'), 'the count') ?? 64;
if (address === undefined) {
  fail('usage: read-ram.ts --address 0x000 [--count 64] [--product 0xc111] [--summary]');
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
  const seen = candidates.map((d) => `0x${d.productId.toString(16)} at ${d.path}`).join(', ');
  fail(`${candidates.length} remotes match (${seen}); pass --path to say which`);
}

const found = candidates[0] as { productId: number; path: string | undefined };
process.stdout.write(`product 0x${found.productId.toString(16)} at ${found.path}\n`);

const remote = new HarmonyRemote(
  await openHarmony(
    found.path === undefined
      ? { productId: found.productId }
      : { productId: found.productId, path: found.path },
  ),
  { timeoutMs: 2000 },
);

try {
  // The wake up, retried, because a remote that has been idle loses the first command sent to it
  // and here that loss would look like a byte reading zero. Section 88.
  let awake = false;
  for (let attempt = 1; attempt <= 4 && !awake; attempt += 1) {
    try {
      await remote.getVersion();
      awake = true;
    } catch {
      // Deliberately swallowed: retrying is the handling, and failure is reported below.
    }
  }
  if (!awake) fail('the remote is not answering');

  // `--selector` exists because which selector reads data memory is per architecture and arch 9's
  // is not known. Arch 14's is `0x07`, derived from the firmware, where libconcord and Logitech's
  // own client both name `0x06` as the RAM one and `0x07` as something else. On arch 12 and arch
  // 14 that naming is simply wrong about behaviour, but it is a reason to try `0x06` on an
  // architecture where `0x07` answers nothing. `docs/findings.md` section 90.
  const selector = number(argument('selector'), 'the selector') ?? MISC_RAM;
  const readOne = async (at: number): Promise<number> => {
    if (selector === MISC_RAM) return remote.readRam(at);
    const reply = await (
      remote as unknown as {
        exchange(request: Uint8Array): Promise<{ kind: string; selector?: number; value?: number }>;
      }
    ).exchange(readMiscRequest(selector, at));
    if (reply.kind !== 'misc') throw new Error(`selector 0x${selector.toString(16)} answered a ${reply.kind} reply`);
    return reply.value ?? 0;
  };

  const data = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) data[i] = await readOne(address + i);

  if (process.argv.includes('--summary')) {
    const nonzero = [...data].filter((b) => b !== 0).length;
    const distinct = new Set(data).size;
    process.stdout.write(
      `0x${address.toString(16)}..0x${(address + count - 1).toString(16)}: ` +
        `${nonzero} of ${count} bytes nonzero, ${distinct} distinct values\n`,
    );
  } else {
    for (let i = 0; i < count; i += 16) {
      const row = [...data.slice(i, i + 16)];
      const hex = row.map((b) => b.toString(16).padStart(2, '0')).join(' ');
      const text = row.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');
      process.stdout.write(`0x${(address + i).toString(16).padStart(3, '0')}  ${hex.padEnd(47)}  |${text}|\n`);
    }
  }
} finally {
  await remote.close();
}
