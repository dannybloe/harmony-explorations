/**
 * Harvest Logitech compiles: put catalogue devices on a disposable remote record, have Logitech compile
 * it, file the result in the lab with a manifest, remove the devices again. `todo-secure-logitech.md`
 * 1.1; load the `gathering-logitech` skill before using it.
 *
 * ```
 * node packages/corpus/bin/harvest.ts --record 16318261 --model 72 --label families-001 \
 *     --device Denon/AVR-X4800H.json --device LG/OLED65G26LA.json [--devices list.json]
 *     [--account 2] [--batch 15] [--pause 30] [--empty-record] [--skip-unresolved] [--commit]
 * ```
 *
 * `--devices` is a JSON array of `{ "manufacturer": ..., "file": ... }`, the archive's folder and file.
 *
 * **Without `--commit` it writes nothing**: it logs in, reads the household, checks the record, and
 * resolves every device through the service's search, all reads, then prints what a run would do. That
 * half is worth running on its own, since a device that does not resolve refuses the whole run.
 *
 * **With `--commit` it writes three kinds of thing**, each behind the door the lab client already uses:
 * adding devices (`MYHARMONY_ALLOW_DEVICE_WRITE=1`), compiling (`MYHARMONY_ALLOW_COMPILE=1`) and
 * removing them (`MYHARMONY_ALLOW_DELETE=1`). Nothing is ever sent to a remote.
 *
 * **The rails**, each here because of a way a harvest could go wrong:
 *
 * * A record on `PROTECTED_RECORDS` is refused, and so is **any record holding a device when the run
 *   starts**, which is what keeps a real record off the list from being touched: a harvest only ever
 *   uses an empty record and leaves it empty. `--empty-record` is the one exception, for a record
 *   there is a go-ahead to repurpose: with `--commit` it removes every device the record holds before
 *   the first batch, the device list having been filed among the replies by the read before it.
 * * The record's model has to be the one `--model` names, so a family is never compiled for the wrong
 *   remote by a mistyped record id.
 * * Every device must resolve to exactly one search match carrying the archive's device id before
 *   anything is written, so a typo cannot half apply a batch.
 * * The devices are removed after every compile, failed or not, and the record is read back empty; if
 *   it is not, the run stops rather than compile the next batch on top of leftovers.
 * * One compile at a time, `--pause` seconds apart, and the run stops at the first refusal it does not
 *   understand rather than retrying blind.
 *
 * **A compile that fails is split**, `splitBatch`: the devices are removed, the batch halved, and each
 * half compiled on its own, until the device that breaks Logitech's compiler stands alone and is
 * recorded in the manifest's `failed` list. Every other device still gets compiled.
 *
 * **The check that makes a compile count**, from the `gathering-logitech` skill: the fetched file is
 * parsed and must hold as many devices as went in. A per family check of the infrared records is
 * `todo-secure-logitech.md` 2.3's and runs over the filed compiles afterwards.
 *
 * Everything lands in the lab under `work/harvest/<label>/`: each compile's ZIP and its extracted
 * files, every reply the service gave, and `manifest.json`. Nothing of it enters this repository.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { LAB, IR_ARCHIVE } from '@harmony/lab';
import { devices as configDevices, parse, payloadOf, catalogueDevice } from '@harmony/codec';
import {
  ACCOUNT_MANAGER, DELETION_MANAGER, DEVICE_MANAGER, MyHarmonySession,
  credentials, type Reply,
} from '../src/myharmony.ts';
import {
  compileRecord, devicesOnRecord as recordDevices, searchDevice, type CompileResult,
} from '../src/record.ts';
import {
  HarvestRefusal, PROTECTED_RECORDS, addDeviceOperation, addRefusal, deviceName, operationBag,
  readZip, splitBatch, type HarvestDevice,
} from '../src/harvest.ts';

function flag(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}
function flags(name: string): string[] {
  return process.argv.flatMap((arg, i) => (arg === `--${name}` ? [process.argv[i + 1] ?? ''] : []));
}
function required(name: string): string {
  const value = flag(name);
  if (value === undefined) throw new HarvestRefusal(`--${name} is required`);
  return value;
}

const commit = process.argv.includes('--commit');
const selector = flag('account') ?? '2';
const record = Number(required('record'));
const model = required('model');
const label = required('label');
const batchSize = Number(flag('batch') ?? 15);
const pauseSeconds = Number(flag('pause') ?? 30);
if (LAB === undefined) throw new HarvestRefusal('no lab: a harvest files everything there');
if (IR_ARCHIVE === undefined) throw new HarvestRefusal('no archive checkout: devices are named out of it');
if (!/^[\w.-]+$/.test(label)) throw new HarvestRefusal(`--label ${label} is not a plain folder name`);
if (PROTECTED_RECORDS.has(record)) throw new HarvestRefusal(`record ${record} is protected`);

// The devices, named as the archive names them, and resolved out of it so the id is the archive's.
const named: { manufacturer: string; file: string }[] = [
  ...flags('device').map((one) => {
    const [manufacturer, file] = one.split('/');
    if (!manufacturer || !file) throw new HarvestRefusal(`--device ${one} is not <manufacturer>/<file>`);
    return { manufacturer, file };
  }),
  ...(flag('devices') ? JSON.parse(readFileSync(flag('devices')!, 'utf8')) as { manufacturer: string; file: string }[] : []),
];
if (named.length === 0) throw new HarvestRefusal('no devices named');
const wanted: HarvestDevice[] = named.map(({ manufacturer, file }) => {
  const entry = catalogueDevice(IR_ARCHIVE!, manufacturer, file);
  if (entry.model === null) throw new HarvestRefusal(`${manufacturer}/${file} has no model in the archive`);
  return { manufacturer: entry.manufacturer, file, model: entry.model, globalDeviceId: entry.globalDeviceId };
});

const dir = join(LAB, 'work', 'harvest', label);
const replies = join(dir, 'replies');
mkdirSync(replies, { recursive: true });
// A label is one harvest and a rerun resumes it, so numbering continues after the replies already filed
// rather than writing over them: every reply the service gave is kept.
let sequence = Math.max(0, ...readdirSync(replies).map((file) => Number(/^(\d+)-/.exec(file)?.[1] ?? 0)));
const session = new MyHarmonySession((operation, reply) => {
  sequence += 1;
  writeFileSync(join(replies, `${String(sequence).padStart(4, '0')}-${operation}.bin`), reply.bytes);
});

const manifestPath = join(dir, 'manifest.json');
interface Compiled { file: string; status: string; devices: (HarvestDevice & { deviceId: number })[];
  inFile: number; namesFound: boolean; checked: boolean }
/** A device the service would not put on this model's record, with the message it gave. */
interface Refused extends HarvestDevice { message: string }
/** A compile that never left "Compiling": kept with its address, so it can be fetched again later. */
interface Stuck { downloadUrl: string; devices: HarvestDevice[] }
const manifest: { record: number; model: string; account: string; compiles: Compiled[];
  failed: HarvestDevice[]; stuck: Stuck[]; unresolved?: HarvestDevice[]; refused?: Refused[] } = existsSync(manifestPath)
  ? { stuck: [], ...JSON.parse(readFileSync(manifestPath, 'utf8')) }
  : { record, model, account: selector, compiles: [], failed: [], stuck: [] };
/**
 * The Harmony 300 and 350, whose configuration our container reader does not yet count devices in: a
 * count off their file came back 8 for one device. For them the check is the device names alone.
 */
const FILE_BASED_MODELS = new Set(['78', '79', '104']);
function saveManifest(): void { writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 1)}\n`); }

function expectOk(operation: string, reply: Reply): Record<string, unknown> {
  if (reply.status !== 200 || typeof reply.json !== 'object' || reply.json === null) {
    throw new HarvestRefusal(`${operation} answered status ${reply.status}; stopping`);
  }
  return reply.json as Record<string, unknown>;
}

const devicesOnRecord = (): Promise<{ Id: { Value: number } }[]> => recordDevices(session, record);

const { email, password } = credentials(selector);
await session.login(email, password);
console.log(`signed in to test account ${selector}`);

// The record: on this account, empty, and for the model asked for.
const household = expectOk('GetMyHousehold', await session.call('GetMyHousehold', ACCOUNT_MANAGER, {}));
const accounts = ((household['GetMyHouseholdResult'] as { Accounts?: unknown[] } | undefined)?.Accounts ?? []) as
  { Id: { Value: number }; ProductIdentifier?: string; Remotes?: { Id: { Value: number } }[] }[];
const chosen = accounts.find((one) => one.Id.Value === record);
if (chosen === undefined) throw new HarvestRefusal(`record ${record} is not on test account ${selector}`);
if (chosen.ProductIdentifier !== model) {
  throw new HarvestRefusal(`record ${record} is for model ${chosen.ProductIdentifier}, not ${model}`);
}
const remote = chosen.Remotes?.[0]?.Id.Value;
if (remote === undefined || (chosen.Remotes?.length ?? 0) !== 1) {
  throw new HarvestRefusal(`record ${record} holds ${chosen.Remotes?.length ?? 0} remotes, not 1`);
}
const emptyRecord = process.argv.includes('--empty-record');
const already = await devicesOnRecord();
if (already.length > 0 && !emptyRecord) {
  throw new HarvestRefusal(`record ${record} holds ${already.length} devices; a harvest only uses an empty record`);
}
console.log(`record ${record}: model ${model}, remote ${remote}, `
  + (already.length === 0 ? 'empty' : `${already.length} devices to remove first`));

// Every device resolved before anything is written.
const matches = new Map<HarvestDevice, Record<string, unknown>>();
const skipUnresolved = process.argv.includes('--skip-unresolved');
const unresolved: HarvestDevice[] = [];
for (const device of wanted) {
  try {
    matches.set(device, await searchDevice(session, device));
  } catch (error) {
    // `--skip-unresolved` is for a long list built by `harvest-list.ts`, where one device the service
    // no longer finds should not stop every other family: it is recorded and left out instead.
    if (!skipUnresolved || !(error instanceof HarvestRefusal)) throw error;
    unresolved.push(device);
    console.log(`  NOT resolved, left out: ${(error as Error).message}`);
    continue;
  }
  console.log(`  resolved ${device.manufacturer} ${device.model}, device ${device.globalDeviceId}`);
}
if (unresolved.length > 0) {
  const known = new Set((manifest.unresolved ?? []).map((one) => one.globalDeviceId));
  manifest.unresolved = [...(manifest.unresolved ?? []), ...unresolved.filter((one) => !known.has(one.globalDeviceId))];
  saveManifest();
}
// A rerun under the same label resumes: a device this harvest already compiled, saw fail or saw refused
// is not sent again, so a run that stopped part way picks up where it stopped.
const handled = new Set([
  ...manifest.compiles.flatMap((one) => one.devices), ...manifest.failed, ...(manifest.refused ?? []),
].map((one) => one.globalDeviceId));
const resolvedDevices = wanted.filter((device) => matches.has(device) && !handled.has(device.globalDeviceId));
if (handled.size > 0) console.log(`resuming: ${handled.size} devices already handled under this label are left out`);

if (!commit) {
  console.log(`dry run: ${resolvedDevices.length} devices in batches of ${batchSize} would be compiled for record `
    + `${record}; nothing was written.`);
  process.exit(0);
}

/** Remove the devices a batch added, and stop the run if the record does not read back empty. */
async function clear(ids: number[]): Promise<void> {
  if (ids.length > 0) {
    expectOk('DeleteDevices', await session.call('DeleteDevices', DELETION_MANAGER,
      { accountId: { Value: record }, deviceIds: ids.map((Value) => ({ Value })) }));
  }
  const left = await devicesOnRecord();
  if (left.length > 0) throw new HarvestRefusal(`record ${record} still holds ${left.length} devices; stopping`);
}

/** One compile of the record as it stands, through the module the setup builder shares. */
const compile = (): Promise<CompileResult> => compileRecord(session, record, remote);

async function harvest(batch: HarvestDevice[], retried = false): Promise<void> {
  const before = new Set((await devicesOnRecord()).map((one) => one.Id.Value));
  const reply = await session.call('UpdateMultiple', DEVICE_MANAGER, operationBag(record,
    batch.map((device) => addDeviceOperation(matches.get(device)!, device, record, randomUUID()))));
  // The service's refusal to add is the warning that came before it blocked the spare Harmony One's serial
  // for good on 7 October 2026, so it stops the run: never split around it, never retry it. The
  // `myharmony-service` skill holds the incident.
  const refusal = addRefusal(reply.status, reply.json);
  if (refusal !== undefined) {
    await clear((await devicesOnRecord()).map((one) => one.Id.Value).filter((id) => !before.has(id)));
    manifest.refused = [...(manifest.refused ?? []), ...batch.map((device) => ({ ...device, message: refusal }))];
    saveManifest();
    throw new HarvestRefusal(`adding ${batch.length} devices refused: ${refusal}; stopping, see the myharmony-service skill`);
  }
  expectOk('UpdateMultiple', reply);
  const added = (await devicesOnRecord()).map((one) => one.Id.Value).filter((id) => !before.has(id));
  let result: CompileResult = { status: 'not compiled' };
  try {
    if (added.length !== batch.length) {
      throw new HarvestRefusal(`${batch.length} devices sent, ${added.length} on the record; stopping`);
    }
    result = await compile();
  } finally {
    await clear(added);
  }
  if (result.zip !== undefined) {
    const name = `compile-${String(manifest.compiles.length + 1).padStart(3, '0')}`;
    writeFileSync(join(dir, `${name}.zip`), result.zip);
    const files = readZip(result.zip);
    for (const [file, bytes] of files) writeFileSync(join(dir, `${name}-${file}`), bytes);
    const ezhex = [...files].find(([file]) => file.toLowerCase().endsWith('.ezhex'))?.[1];
    // The check: the compiled file holds every device that went in. Every model's file carries each
    // device's model name as text, so that half holds everywhere; the device count is added where our
    // reader counts devices for the model.
    const payload = ezhex === undefined ? new Uint8Array() : payloadOf(ezhex);
    const text = new TextDecoder('latin1').decode(payload);
    // A name tree writes a space as an underscore, so "Plex Player" is stored as "Plex_Player".
    const namesFound = ezhex !== undefined
      && batch.every((device) => text.includes(device.model) || text.includes(device.model.replaceAll(' ', '_')));
    const counted = !FILE_BASED_MODELS.has(model);
    const inFile = ezhex === undefined || !counted ? 0 : configDevices(parse(payload)).length;
    const checked = namesFound && (!counted || inFile === batch.length);
    manifest.compiles.push({ file: `${name}.zip`, status: result.status, inFile, namesFound, checked,
      devices: batch.map((device, i) => ({ ...device, deviceId: added[i] ?? 0 })) });
    saveManifest();
    console.log(`  ${name}: ${batch.length} devices, names ${namesFound ? 'found' : 'MISSING'}`
      + (counted ? `, ${inFile} counted` : '') + (checked ? '' : ', CHECK FAILED'));
    return;
  }
  console.log(`  compile of ${batch.length} devices failed: ${result.status}`);
  if (result.downloadUrl !== undefined) {
    manifest.stuck.push({ downloadUrl: result.downloadUrl, devices: batch });
    saveManifest();
    // A compile that hangs is retried once whole before the batch is split: on the Harmony 350 a hang
    // turned out to be a one off on Logitech's side, which MyHarmony's own sync ran into as well, and
    // the same two devices compiled at the next attempt.
    if (!retried) {
      await sleep(pauseSeconds * 1000);
      await harvest(batch, true);
      return;
    }
  }
  if (batch.length === 1) {
    manifest.failed.push(batch[0]!);
    saveManifest();
    return;
  }
  for (const half of splitBatch(batch)) {
    await sleep(pauseSeconds * 1000);
    await harvest(half);
  }
}

if (already.length > 0) {
  await clear(already.map((one) => one.Id.Value));
  console.log(`removed the record's ${already.length} devices; it reads back empty`);
}

for (let at = 0; at < resolvedDevices.length; at += batchSize) {
  if (at > 0) await sleep(pauseSeconds * 1000);
  const batch = resolvedDevices.slice(at, at + batchSize);
  console.log(`batch ${at / batchSize + 1}: ${batch.map(deviceName).join(', ')}`);
  await harvest(batch);
}
console.log(`done: ${manifest.compiles.length} compiles filed, ${manifest.failed.length} devices failed, in ${dir}`);
