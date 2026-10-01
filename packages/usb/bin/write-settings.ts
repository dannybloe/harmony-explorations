/**
 * Empty one saved delay slot in an arch 14 remote's settings store, over USB, so the configuration's
 * own value for that delay applies again at the next start. Sections 303 and 304.
 *
 *   node packages/usb/bin/write-settings.ts --unit h600 --table 'power on' --key 0x0edc
 *   HARMONY_ENABLE_WRITES=1 HARMONY_SETTINGS_WRITE=1 \
 *     node packages/usb/bin/write-settings.ts --unit h600 --table 'power on' --key 0x0edc --commit
 *
 * **Without `--commit` it only reads**: the unit against the lab record, the store's two blocks, the
 * slot holding the key, both by the store's bytes and by the remote's own lookup, and the four records
 * a clear would append, with the store as it would be afterwards. The store is filed in the lab either
 * way, in `reads/`, since it is the backup a write needs.
 *
 * `--commit` sends four `0x14 0xB3` writes, each setting of the slot to `0xFF`, which is what the
 * firmware's own purge wrote into a slot, in the purge's order: key high, key low, value high, value
 * low. The first one alone already frees the slot, since the firmware's save tests the key's high byte. It
 * then reads the store back and compares it **byte for byte** with `predictStoreAfter`, and reads the
 * four settings through the remote's lookup, which must answer `0xFF`. A difference anywhere exits 2.
 *
 * Why an empty slot gives the configuration back its value: the start up program reads the slot into
 * one variable and copies it into the delay only when the read did not answer `0xFEFD`, the firmware's
 * value for a key it does not hold, section 303. That guard was read on the Harmony 600's configuration.
 *
 * Every line it prints is also appended to a journal beside the filed stores, which is the writer's
 * journal rule: an afternoon once lost the record of a write and the flash was the only witness left.
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { LAB, unitIdentity, unitIdentityPath } from '@harmony/lab';
import {
  HarmonyRemote,
  STORE_BLOCK_BYTES,
  architectureFromVersion,
  assertUnitIsPermitted,
  clearSlotWrites,
  delaySlots,
  latestSettings,
  listHarmony,
  openHarmony,
  predictStoreAfter,
  readVersion,
  unitIdentityFromText,
  unitIdentityText,
} from '../src/index.ts';
import type { DelaySlot } from '../src/index.ts';

/** The units whose firmware's settings write is read: the two 0.2 builds. */
const UNITS = ['h600', 'h650'];

class Refusal extends Error {}

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

const unitLabel = argument('unit');
const table = argument('table') as DelaySlot['table'] | undefined;
const keyText = argument('key');
const commit = process.argv.includes('--commit');

if (unitLabel === undefined || keyText === undefined || (table !== 'power on' && table !== 'inter device')) {
  process.stderr.write("usage: write-settings.ts --unit <label> --table 'power on'|'inter device' --key 0x.... [--commit]\n");
  process.exit(2);
}
if (!UNITS.includes(unitLabel)) {
  process.stderr.write(`refused: ${unitLabel} is not a unit this may write; it takes ${UNITS.join(', ')}\n`);
  process.exit(1);
}
if (LAB === undefined) {
  process.stderr.write('refused: no lab directory, and the store is filed there before anything is written\n');
  process.exit(1);
}
const key = Number.parseInt(keyText, 16);
if (!Number.isInteger(key) || key < 0 || key >= 0xffff) {
  process.stderr.write(`refused: ${keyText} is not a key\n`);
  process.exit(2);
}

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z').slice(0, 13) + 'Z';
const reads = join(LAB, 'reads');
mkdirSync(reads, { recursive: true });
const base = join(reads, `${stamp}-${unitLabel}-settings`);
const journal = `${base}-journal.txt`;

function say(line: string): void {
  process.stdout.write(`${line}\n`);
  appendFileSync(journal, `${line}\n`);
}

const hex = (n: number, width = 2) => `0x${n.toString(16).padStart(width, '0')}`;

function slotOf(store: Uint8Array): DelaySlot {
  const found = delaySlots(latestSettings(store)).filter((s) => s.table === table && s.key === key);
  if (found.length !== 1) throw new Refusal(`the store holds ${found.length} ${table} slots for key ${hex(key, 4)}`);
  return found[0]!;
}

async function main(): Promise<void> {
  const stored = unitIdentity(unitLabel as string);
  if (stored === undefined) throw new Refusal(`the lab has no recorded identity at ${unitIdentityPath(unitLabel as string)}`);
  const permittedUnit = unitIdentityFromText(stored);

  const attached = await listHarmony();
  if (attached.length !== 1) throw new Refusal(`${attached.length} remotes are attached; attach only the one to write`);
  const found = attached[0] as { productId: number; path: string | undefined };
  say(`${commit ? 'commit' : 'dry run, reads only'}: ${unitLabel}, ${table} slot for key ${hex(key, 4)} (${key})`);
  say(`product ${hex(found.productId, 4)} at ${found.path}`);
  const remote = new HarmonyRemote(await openHarmony(
    found.path === undefined ? { productId: found.productId } : { productId: found.productId, path: found.path },
  ), { timeoutMs: 2000, architecture: 14 });

  try {
    const versionBytes = await remote.getVersion();
    const version = readVersion(versionBytes);
    say(`firmware ${version.firmware}, architecture ${architectureFromVersion(versionBytes)}, skin ${version.skin}`);
    const identityBlock = await remote.readUnitIdentity();
    assertUnitIsPermitted({ identityBlock, permittedUnit });
    say(`unit identity ${unitIdentityText(identityBlock).slice(0, 8)}..., which matches the recorded ${unitLabel}`);

    const store = await remote.readSettingsStore();
    writeFileSync(`${base}-before.bin`, store);
    say(`store read, ${store.length} bytes, filed as ${base}-before.bin`);
    const slot = slotOf(store);
    const writes = clearSlotWrites(slot.table, slot.slot);
    const looked = [];
    for (const { setting } of writes) looked.push(await remote.readSetting(setting));
    say(`slot ${slot.slot}: key ${hex(slot.key, 4)}, value ${slot.value} tenths; the remote's lookup answers `
      + `${looked.map((v) => hex(v)).join(' ')} for settings ${writes.map((w) => hex(w.setting)).join(' ')}`);
    if (((looked[0]! << 8) | looked[1]!) !== slot.key || ((looked[2]! << 8) | looked[3]!) !== slot.value) {
      throw new Refusal('the remote\'s lookup disagrees with its own store\'s bytes');
    }
    const plan = predictStoreAfter(store, writes);
    say(`${plan.freeBefore} free records; a clear appends ${plan.appended}: `
      + writes.map((w) => `${hex(w.setting)}=${hex(w.value)}`).join(' '));
    say(`afterwards the saved delays would be: ${delaySlots(latestSettings(plan.after))
      .map((s) => `${s.table} slot ${s.slot} key ${hex(s.key, 4)} value ${s.value}`).join('; ') || 'none'}`);
    if (!commit) {
      say('nothing written; pass --commit with HARMONY_ENABLE_WRITES=1 and HARMONY_SETTINGS_WRITE=1 to write');
      return;
    }

    const result = await remote.writeSettings({ permittedUnit }, writes);
    writeFileSync(`${base}-after.bin`, result.after);
    result.replies.forEach((reply, i) => say(`write ${hex(writes[i]!.setting)}=${hex(writes[i]!.value)} answered `
      + [...reply].map((b) => b.toString(16).padStart(2, '0')).join(' ')));
    say(`sent ${result.replies.length} of ${writes.length} writes${result.error === undefined ? '' : `, stopped: ${result.error}`}`);
    say(`store read back, filed as ${base}-after.bin`);
    let wrong = result.error !== undefined;
    if (!result.before.every((b, i) => b === store[i])) {
      say('the store changed between the dry read and the write\'s own read: comparing against the latter');
    }
    const expected = predictStoreAfter(result.before, writes).after;
    const differing = [...expected.keys()].filter((i) => expected[i] !== result.after[i]);
    say(`read back against the prediction: ${expected.length - differing.length} of ${expected.length} bytes agree`);
    for (const i of differing.slice(0, 16)) {
      say(`  block ${Math.floor(i / STORE_BLOCK_BYTES)} offset ${hex(i % STORE_BLOCK_BYTES, 3)}: `
        + `remote ${hex(result.after[i]!)}, predicted ${hex(expected[i]!)}`);
    }
    if (differing.length > 0) wrong = true;
    const answers = [];
    for (const { setting } of writes) answers.push(await remote.readSetting(setting));
    say(`the remote's lookup now answers ${answers.map((v) => hex(v)).join(' ')}`);
    if (answers.some((v) => v !== 0xff)) wrong = true;
    say(wrong ? 'FAILED: see above' : 'the slot is empty, on the store\'s bytes and through the remote\'s own lookup');
    if (wrong) process.exitCode = 2;
  } finally {
    await remote.close();
  }
}

main().catch((error: unknown) => {
  say(`${error instanceof Refusal ? 'refused' : 'error'}: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
