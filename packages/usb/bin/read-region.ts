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

import { HarmonyRemote, architectureFromVersion, listHarmony, openHarmony } from '../src/index.ts';
import { readFlashWindow } from '../src/internal.ts';
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
  // **Arch 8 (Harmony 880 and 885) reached this script with `todo-compile-885.md` 1.2**, which gave it a
  // config region base for a write, and until then the missing base refused it. Two reads there are not
  // reads, `reference/architectures/harmony-880-885/usb.md` "Reading flash": from `0x1FE000` up sit the
  // keypad, the USB controller and the display, and a read ending on `0x000104` or `0x000105` runs code.
  // The library bounds a read by its start only, so this bounds the end, and keeps both ends even, which
  // is what keeps every chunk from ending alone on either of the two. Pointed out by the review of the
  // 1.2 commit, as a read path that commit had opened without saying so.
  if (architecture === 8 && (to > 0x1fe000 || from % 2 !== 0 || to % 2 !== 0)) {
    fail('on a Harmony 880 or 885 a region read ends at or below 0x1fe000, where flash stops, and '
      + 'starts and ends on an even address, so no chunk ends alone on 0x000104 or 0x000105');
  }
  process.stdout.write(`architecture ${architecture}, config region base `
    + `0x${base.toString(16)}\n`);

  const total = to - from;
  const out = new Uint8Array(total);
  let retries = 0;
  for (let done = 0; done < total; done += CHUNK) {
    const length = Math.min(CHUNK, total - done);
    // **A failed window is asked for again**, through `readFlashWindow`, the one retry loop
    // `readConfig` uses too, section 223. Until `todo-compile-885.md` 1.10 this read had no retry, so a
    // single lost chunk, `flash chunk out of sequence`, stopped the whole read and filed nothing, which
    // is what both bench Harmony 885s did on long reads, `docs/test-notes/harmony-885.md`. A retry sends
    // the same window again, the same address and count, so the arch 8 bounds above still describe
    // every request this loop sends: the even ends and the `0x8000` chunks are untouched by it.
    //
    // Said out loud rather than absorbed, as `read-config.ts` does: a retry is recovery working, and a
    // run full of them is a fault worth seeing at the moment it happens.
    const got = await readFlashWindow(remote, from + done, length, ({ at, attempt, error }) => {
      const why = error instanceof Error ? error.message : String(error);
      process.stdout.write(`\n  retrying 0x${at.toString(16)} (attempt ${attempt}): ${why}\n`);
    });
    retries += got.retries;
    // Setting a short array would leave zeros behind it and file them as flash, so a length that is
    // not the one asked for stops the read. `readFlash` already throws on a short transfer; this is the
    // check that does not depend on it. Thrown rather than `fail`, so the `finally` below still closes
    // the device.
    if (got.bytes.length !== length) {
      throw new Error(`read ${got.bytes.length} of ${length} bytes at 0x${(from + done).toString(16)}; `
        + 'nothing has been filed');
    }
    out.set(got.bytes, done);
    process.stdout.write(`\r  reading ${done + length} of ${total} bytes `
      + `(${Math.floor((100 * (done + length)) / total)}%)`);
  }
  process.stdout.write('\n');

  const when = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z').replace('T', 'T');
  const name = `${when}-${label}-region-0x${from.toString(16)}-0x${to.toString(16)}.bin`;
  const path = join(LAB, 'reads', name);
  writeFileSync(path, out);
  process.stdout.write(
    (retries === 0 ? '  no window retried\n' : `  ${retries} window(s) retried\n`)
      + `  filed as ${name}\n  in ${join(LAB, 'reads')}\n`,
  );
} finally {
  try {
    await remote.close();
  } catch (error: unknown) {
    process.stderr.write(`(the device did not close cleanly: ${String(error)})\n`);
  }
}
