/**
 * Read the config off a connected remote and file it in the lab corpus.
 *
 *   node packages/corpus/bin/read-config.ts --label oneres
 *   node packages/corpus/bin/read-config.ts --label h600 --product 0xc122
 *
 * Read only. This opens the device, which `list-remotes.ts` deliberately does not, so it is the
 * heavier of the two: use that one to find out what is attached and this one when you mean it.
 */
import { LAB } from '@harmony/lab';
import { HarmonyRemote, listHarmony, openHarmony } from '@harmony/usb';

import { fileRead, profileFor, readConfig } from '../src/index.ts';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const label = argument('label');
if (label === undefined) fail('usage: read-config.ts --label <name> [--product 0xc121]');
if (LAB === undefined) fail('no lab directory found; set HARMONY_LAB');

const wanted = argument('product');
const attached = await listHarmony();
const candidates =
  wanted === undefined
    ? attached
    : attached.filter((d) => d.productId === Number.parseInt(wanted, 16));

if (candidates.length === 0) fail('no matching Harmony remote attached');
if (candidates.length > 1) {
  // The same refusal openHarmony makes, said earlier so the message can name the models.
  const seen = candidates.map((d) => `0x${d.productId.toString(16)}`).join(', ');
  fail(`${candidates.length} remotes match (${seen}); pass --product to say which`);
}

const found = candidates[0] as { productId: number };
const profile = profileFor(found.productId);
process.stdout.write(`${profile.model}, architecture ${profile.architecture}\n`);

const remote = new HarmonyRemote(await openHarmony({ productId: found.productId }), {
  timeoutMs: 2000,
});
try {
  let lastPercent = -1;
  const read = await readConfig(remote, profile, {
    onProgress: ({ done, total }) => {
      const percent = Math.floor((done / total) * 100);
      if (percent === lastPercent) return;
      lastPercent = percent;
      process.stdout.write(`\r  reading ${done} of ${total} bytes (${percent}%)`);
    },
  });
  process.stdout.write('\n');

  const filed = fileRead(LAB, read, label as string, new Date());
  const rate = Math.round(read.bytes.length / (read.durationMs / 1000) / 1024);
  process.stdout.write(
    `  ${read.bytes.length} bytes in ${(read.durationMs / 1000).toFixed(1)}s (${rate} KiB/s)\n` +
      `  filed as ${filed.config}\n  in ${filed.directory}\n`,
  );
} finally {
  await remote.close();
}
