/**
 * Produce a structural report about a connected remote, for contributing.
 *
 *   node packages/probe/bin/probe.ts > report.json
 *   node packages/probe/bin/probe.ts --product 0xc122
 *   node packages/probe/bin/probe.ts --file <config.EZHex>     no remote needed
 *
 * Read only, and the output is deliberately publishable: shape, counts, addresses and check
 * outcomes, never a section's contents and never the unit's serial. Read it before you send it;
 * it is a few kilobytes of JSON and that is the point.
 *
 * This opens the device, which `packages/usb/bin/list-remotes.ts` deliberately does not.
 */
import { readFileSync } from 'node:fs';

import { payloadOf } from '@harmony/codec';
import { HarmonyRemote, listHarmony, openHarmony } from '@harmony/usb';

import { buildReport, probeRemote, usbReport } from '../src/index.ts';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const file = argument('file');
if (file !== undefined) {
  // An EZHex declares its own payload length in its XML header, so the split is read rather than
  // guessed. A bare container has no header and `payloadOf` hands it back whole.
  const data = new Uint8Array(readFileSync(file));
  let blob: Uint8Array;
  try {
    blob = payloadOf(data, file);
  } catch {
    blob = data;
  }
  process.stdout.write(`${JSON.stringify(buildReport({ blob }), null, 2)}\n`);
  process.exit(0);
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
const remote = new HarmonyRemote(await openHarmony({ productId: found.productId }), {
  timeoutMs: 2000,
});
try {
  let lastPercent = -1;
  const report = await probeRemote(remote, usbReport(found), {
    onProgress: (done, total) => {
      const percent = Math.floor((done / total) * 100);
      if (percent === lastPercent) return;
      lastPercent = percent;
      process.stderr.write(`\r  reading ${done} of ${total} bytes (${percent}%)`);
    },
  });
  process.stderr.write('\n');
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await remote.close();
}
