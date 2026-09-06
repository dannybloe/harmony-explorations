/**
 * Read a stated range of a remote's flash and file it in the lab. **Read only.**
 *
 *   node packages/corpus/bin/read-region.ts --label h525-region --address 0x820000 --count 0x10000
 *
 * ## Why this is not `read-config.ts`
 *
 * That one reads the **configuration**: it parses the container's header and stops at the length the
 * container states. This one reads what the caller names, which is the only way to obtain a whole
 * **erase block**, and an erase block is the unit a write works in.
 *
 * The two come apart on the Harmony 525. Its configuration is 51195 bytes and an erase block is
 * 65536, so the configuration does not fill even the first block, and `rehearse-block.ts` refuses
 * with "the block runs past the end of the dump" because the bytes it would write back do not all
 * exist in the lab. On a Harmony One the question never arose: its configuration is 1.6 MB and
 * covers twenty five blocks, so a configuration read happened to be a region read as well.
 *
 * ## What a region carries that a configuration does not
 *
 * **Somebody else's old configuration**, section 215: past the end of the current one on the spare
 * Harmony One sit 408034 bytes of a previous one, never wiped, because flash is only erased where a
 * write needs the room. So the output of this script is more sensitive than a config dump and not
 * less, and `CLAUDE.md`'s refusal to publish one covers it more strongly. It lands in the lab, like
 * every other read here, and it never goes anywhere else.
 *
 * ## Rails
 *
 * There are none beyond the transport's, on purpose, because every command this sends is a read.
 * `openHarmony` returns a guarded transport whose allow list is the three commands that only read,
 * so the write path is not reachable from here at all. What this script does add is a refusal for a
 * range outside the architecture's configuration region: not because a read there is dangerous, but
 * because the artefact is filed under a label somebody will trust later, and a region read of the
 * firmware would sit in the lab looking like a configuration. `--anywhere` is the named door, and it
 * exists because reading the firmware region is a legitimate thing to want and should be a decision.
 */
import { LAB } from '@harmony/lab';
import {
  CONFIG_REGION_BASE,
  HarmonyRemote,
  WRITABLE_CEILING,
  listHarmony,
  openHarmony,
} from '@harmony/usb';

import { fileRegion, profileFor } from '../src/index.ts';

/** Bytes per `READ_FLASH`, matching what the config reader uses. */
const CHUNK = 0x4000;

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
  if (!Number.isInteger(value) || value < 0) fail(`${what} is not an address or count: ${text}`);
  return value;
}

const label = argument('label');
const address = number(argument('address'), 'the address');
const count = number(argument('count'), 'the count') ?? 0x10000;
const anywhere = process.argv.includes('--anywhere');
if (label === undefined || address === undefined) {
  fail('usage: read-region.ts --label <name> --address 0x820000 [--count 0x10000] '
    + '[--product 0xc121] [--anywhere]');
}
if (count <= 0) fail(`a count of ${count} is not a read`);
if (LAB === undefined) fail('no lab directory found; set HARMONY_LAB');

const wanted = argument('product');
const attached = await listHarmony();
const candidates = wanted === undefined
  ? attached
  : attached.filter((d) => d.productId === Number.parseInt(wanted, 16));
if (candidates.length === 0) fail('no matching Harmony remote attached');
if (candidates.length > 1) {
  const seen = candidates.map((d) => `0x${d.productId.toString(16)}`).join(', ');
  fail(`${candidates.length} remotes match (${seen}); pass --product to say which`);
}

const found = candidates[0] as { productId: number };
const profile = profileFor(found.productId);
process.stdout.write(`${profile.model}, architecture ${profile.architecture}\n`);

// The region check, and it is about what gets **filed** rather than about what is safe to read.
const base = CONFIG_REGION_BASE[profile.architecture];
const ceiling = WRITABLE_CEILING[profile.architecture];
if (!anywhere) {
  if (base === undefined || ceiling === undefined) {
    fail(`architecture ${profile.architecture} has no recorded config region, so this cannot say `
      + 'whether the range is one. Pass --anywhere to file it regardless, and say so in the label');
  }
  if (address < base || address + count > ceiling) {
    fail(`0x${address.toString(16)} to 0x${(address + count).toString(16)} is outside the config `
      + `region 0x${base.toString(16)}..0x${ceiling.toString(16)}. Reading there is harmless and `
      + 'filing it under a label that reads like a configuration is not, so pass --anywhere and '
      + 'name it for what it is');
  }
}

const remote = new HarmonyRemote(await openHarmony({ productId: found.productId }), {
  architecture: profile.architecture,
  timeoutMs: 2000,
});
try {
  const versionBlock = await remote.getVersion();
  const bytes = new Uint8Array(count);
  const started = performance.now();
  let lastPercent = -1;
  for (let done = 0; done < count; done += CHUNK) {
    const length = Math.min(CHUNK, count - done);
    bytes.set(await remote.readFlash(address + done, length), done);
    const percent = Math.floor(((done + length) / count) * 100);
    if (percent !== lastPercent) {
      lastPercent = percent;
      process.stdout.write(`\r  reading ${done + length} of ${count} bytes (${percent}%)`);
    }
  }
  const durationMs = performance.now() - started;
  process.stdout.write('\n');

  const filed = fileRegion(LAB, {
    bytes,
    address,
    versionBlock,
    productId: profile.productId,
    architecture: profile.architecture,
    model: profile.model,
    durationMs,
  }, label, new Date());
  const rate = Math.round(bytes.length / (durationMs / 1000) / 1024);
  process.stdout.write(
    `  ${bytes.length} bytes from 0x${address.toString(16)} in ${(durationMs / 1000).toFixed(1)}s `
      + `(${rate} KiB/s)\n  filed as ${filed.config}\n  in ${filed.directory}\n`
      + '  register that filename in packages/lab/src/index.ts and tests/lab.py before anything '
      + 'can name it\n',
  );
} finally {
  await remote.close();
}
