/**
 * Read a run of external flash off a connected remote and file it in the lab.
 *
 *   node packages/usb/bin/read-region.ts --label one-spare --from 0x040000 --to 0x1e0000
 *
 * **This exists because a write needs known good content for whole erase blocks, and a
 * configuration is not that.** `read-config.ts` reads the container and stops at its declared end,
 * which lands part way through a 64 KiB block; the trailer checksum is in that block, so any real
 * edit changes it, and the write rehearsal refuses a block its dump does not cover. Reading to the
 * end of the block is what makes such a write possible at all.
 *
 * Read only, and it opens the device, so reach for it deliberately. `list-remotes.ts` is the one
 * that only looks.
 *
 * **What it produces is more sensitive than a configuration**, which is why it goes to the lab and
 * why the filename says region. Past the end of the current configuration sits whatever a previous
 * one left, since flash is only erased where a write needs the room, so a region carries
 * configurations nobody meant to hand over. `CLAUDE.md` refuses to publish one; this does not
 * change that, it is the reason the rule is written down.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { LAB } from '@harmony/lab';

import {
  HarmonyRemote, architectureFromVersion, listHarmony, openHarmony,
} from '../src/index.ts';
import { CONFIG_REGION_BASE } from '../src/rails.ts';

/** One read, chosen so a stall reports a range rather than the whole run. */
const CHUNK = 0x8000;

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function address(text: string | undefined, what: string): number {
  if (text === undefined) fail(`${what} is required`);
  const value = Number(text);
  if (!Number.isInteger(value) || value < 0) fail(`${what} is not an address: ${text}`);
  return value;
}

const label = argument('label') ?? fail('--label says which unit this came off, and ends up in the '
  + 'filename: a lab full of reads called the same thing is a lab you cannot use');
if (LAB === undefined) fail('no lab directory found; set HARMONY_LAB');

const attached = await listHarmony();
const wanted = argument('product');
const candidates = wanted === undefined
  ? attached
  : attached.filter((d) => d.productId === Number.parseInt(wanted, 16));
if (candidates.length === 0) fail('no matching Harmony remote attached');
if (candidates.length > 1) {
  fail(`${candidates.length} remotes match; pass --product to say which`);
}
const productId = (candidates[0] as { productId: number }).productId;

const remote = new HarmonyRemote(await openHarmony({ productId }));
try {
  // **The first question asked of a remote is the one a previous session's leftovers answer**, which
  // `write-config.ts` has drained since section 242 and this did not. On 3 September 2026 a region
  // read straight after a replug failed with no reply to `GET_VERSION` in three polls, and the same
  // command through `read-identity.ts` answered immediately afterwards, so the pipe was dirty rather
  // than the remote unwell. Section 247.
  await remote.drainLeftovers();
  const architecture = architectureFromVersion(await remote.getVersion());
  if (architecture === undefined) fail('the remote did not say which architecture it is');
  const base = CONFIG_REGION_BASE[architecture];
  if (base === undefined) fail(`no config region base for architecture ${architecture}`);

  const from = argument('from') === undefined ? base : address(argument('from'), '--from');
  const to = address(argument('to'), '--to');
  if (to <= from) fail(`--to 0x${to.toString(16)} is not above --from 0x${from.toString(16)}`);
  process.stdout.write(`architecture ${architecture}, config region base `
    + `0x${base.toString(16)}\n`);

  const total = to - from;
  const out = new Uint8Array(total);
  for (let done = 0; done < total; done += CHUNK) {
    const length = Math.min(CHUNK, total - done);
    out.set(await remote.readFlash(from + done, length), done);
    process.stdout.write(`\r  reading ${done + length} of ${total} bytes `
      + `(${Math.floor((100 * (done + length)) / total)}%)`);
  }
  process.stdout.write('\n');

  const when = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z').replace('T', 'T');
  const name = `${when}-${label}-region-0x${from.toString(16)}-0x${to.toString(16)}.bin`;
  const path = join(LAB, 'reads', name);
  writeFileSync(path, out);
  process.stdout.write(`  filed as ${name}\n  in ${join(LAB, 'reads')}\n`);
} finally {
  try {
    await remote.close();
  } catch (error: unknown) {
    process.stderr.write(`(the device did not close cleanly: ${String(error)})\n`);
  }
}
