/**
 * Read the saved delays out of a running Harmony 600, 650 or 700's settings store, over USB, and
 * optionally compare them with a dump of the same unit's internal program memory in the lab. Read only.
 *
 *   node packages/usb/bin/read-settings.ts --product 0xc122
 *   node packages/usb/bin/read-settings.ts --product 0xc122 --compare h600_internal_ff_region
 *
 * Forty one `0x13 0xB2` reads: the two delay tables, settings `0x00` to `0x13` and `0x18` to `0x2B`,
 * and setting `0x80`, sections 303 and 304. The request and its reply are the firmware's statement and
 * this is the first thing to send them, so a reply in any other shape stops the run with its bytes
 * printed rather than being read at a guessed offset.
 *
 * `--compare` names a lab dump of internal page `0xFF`, read by `read-region.ts`. The three arch 14
 * units enumerate alike, so a comparison against another unit's dump will disagree, which is the
 * signal to check which remote is on the cable. Nothing is written; the settings write is refused by
 * the transport.
 */
import { require_ } from '@harmony/lab';
import {
  DELAY_SETTINGS,
  HarmonyRemote,
  SETTING_0X80,
  delaySlots,
  latestSettings,
  listHarmony,
  openHarmony,
} from '../src/index.ts';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const hex = (n: number, width = 2) => `0x${n.toString(16).padStart(width, '0')}`;

const wanted = argument('product');
const wantedPath = argument('path');
const compare = argument('compare');
// Loaded before the remote is opened, so a wrong lab name costs nothing on the cable.
const dump = compare === undefined ? undefined : latestSettings(require_(compare));

const attached = await listHarmony();
const candidates = attached.filter(
  (d) =>
    (wanted === undefined || d.productId === Number.parseInt(wanted, 16)) &&
    (wantedPath === undefined || d.path === wantedPath),
);
if (candidates.length === 0) fail('no matching Harmony remote attached');
if (candidates.length > 1) {
  const seen = candidates.map((d) => `0x${d.productId.toString(16)} at ${d.path}`).join(', ');
  fail(`${candidates.length} remotes match (${seen}); pass --product or --path to say which`);
}
const found = candidates[0] as { productId: number; path: string | undefined };
process.stdout.write(`product 0x${found.productId.toString(16)} at ${found.path}\n`);

const remote = new HarmonyRemote(
  await openHarmony(
    found.path === undefined ? { productId: found.productId } : { productId: found.productId, path: found.path },
  ),
  { timeoutMs: 2000 },
);

try {
  // `getVersion` pins the architecture, which `readSetting` requires to be 14, and retries once on a
  // remote that has been idle, section 155.
  await remote.getVersion();
  const settings = [...DELAY_SETTINGS, SETTING_0X80];
  const read = new Map<number, number>();
  for (const setting of settings) read.set(setting, await remote.readSetting(setting));

  process.stdout.write(`\nread ${read.size} settings\n`);
  const slots = delaySlots(read);
  if (slots.length === 0) process.stdout.write('no saved delays\n');
  for (const slot of slots) {
    process.stdout.write(
      `${slot.table} slot ${slot.slot}: key ${hex(slot.key, 4)} (${slot.key}), value ${slot.value} tenths\n`,
    );
  }
  process.stdout.write(`setting 0x80: ${hex(read.get(SETTING_0X80)!)}\n`);

  if (dump !== undefined) {
    const differing = settings.filter((s) => read.get(s) !== (dump.get(s) ?? 0xff));
    process.stdout.write(`\nagainst ${compare}: ${settings.length - differing.length} of ${settings.length} agree\n`);
    for (const s of differing) {
      process.stdout.write(`  setting ${hex(s)}: remote ${hex(read.get(s)!)}, dump ${hex(dump.get(s) ?? 0xff)}\n`);
    }
    if (differing.length > 0) process.exitCode = 2;
  }
} finally {
  await remote.close();
}
