/**
 * Put a setup on a remote record of a test account and have Logitech compile it, leaving the setup in
 * place: the counterpart of `harvest.ts`, which removes what it added. Written for the Harmony 650's
 * starting setup, `todo-compile-650.md` 1.6; load the `gathering-logitech` and `myharmony-service`
 * skills before using it.
 *
 * ```
 * node packages/corpus/bin/build-setup.ts --setup packages/corpus/setups/h650-start.json \
 *     --record 16326458 --model 72 --label h650-start --stage devices|activities|compile \
 *     [--account 1] [--commit]
 * ```
 *
 * **One stage per run**, so each kind of write is looked at before the next is sent:
 *
 * * `devices` adds every setup device the record does not already hold by that name, in one
 *   `UpdateMultiple` (`MYHARMONY_ALLOW_DEVICE_WRITE=1`), and then reads the devices' features, the input
 *   and power records an activity's inputs are named against, into the lab.
 * * `activities` saves every setup activity the record does not already hold by that name, one
 *   `SaveActivities` each, in the setup's order (`MYHARMONY_ALLOW_ACTIVITY_WRITE=1`).
 * * `compile` compiles the record once (`MYHARMONY_ALLOW_COMPILE=1`) and files the result. With
 *   `--poll <download address>` it starts nothing and polls a compile an earlier run started and gave up
 *   waiting for, which is a read.
 *
 * **Without `--commit` a stage writes nothing**: it signs in, reads the record and says what it would
 * send. Every reply is filed in the lab under `work/setups/<label>/replies/`, numbered on from the last.
 *
 * **The rails.** A protected record is refused, and so is a record for another model or with other than
 * one remote. A setup device name the record holds is reused, never added twice, so a rerun after a stop
 * sends only what is missing. Adding stops at the service's refusal to add, the warning that came before
 * it blocked a serial, and is never retried. Nothing is ever removed and nothing is sent to a remote. The
 * session waits at least ten seconds between any two requests.
 *
 * **The compile's check**, from the `gathering-logitech` skill: the file must hold every device and every
 * activity of the setup, by name, and as many devices as the setup has.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { LAB, IR_ARCHIVE } from '@harmony/lab';
import { activities as configActivities, devices as configDevices, parse, payloadOf, catalogueDevice } from '@harmony/codec';
import { ACCOUNT_DIRECTOR, ACCOUNT_MANAGER, DEVICE_MANAGER, MyHarmonySession, SVCS, credentials } from '../src/myharmony.ts';
import {
  HarvestRefusal, PROTECTED_RECORDS, addDeviceOperation, addRefusal, operationBag, readZip, type HarvestDevice,
} from '../src/harvest.ts';
import { compileRecord, devicesOnRecord, expectOk, pollCompile, searchDevice } from '../src/record.ts';
import { saveActivityPayload, type Setup } from '../src/setup.ts';

function flag(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}
function required(name: string): string {
  const value = flag(name);
  if (value === undefined) throw new HarvestRefusal(`--${name} is required`);
  return value;
}

const commit = process.argv.includes('--commit');
const selector = flag('account') ?? '1';
const record = Number(required('record'));
const model = required('model');
const label = required('label');
const stage = required('stage');
const setup = JSON.parse(readFileSync(required('setup'), 'utf8')) as Setup;
if (!['devices', 'activities', 'compile'].includes(stage)) throw new HarvestRefusal(`--stage ${stage} is not a stage`);
if (LAB === undefined) throw new HarvestRefusal('no lab: a setup files everything there');
if (IR_ARCHIVE === undefined) throw new HarvestRefusal('no archive checkout: devices are named out of it');
if (!/^[\w.-]+$/.test(label)) throw new HarvestRefusal(`--label ${label} is not a plain folder name`);
if (PROTECTED_RECORDS.has(record)) throw new HarvestRefusal(`record ${record} is protected`);

const dir = join(LAB, 'work', 'setups', label);
const replies = join(dir, 'replies');
mkdirSync(replies, { recursive: true });
let sequence = Math.max(0, ...readdirSync(replies).map((file) => Number(/^(\d+)-/.exec(file)?.[1] ?? 0)));
const session = new MyHarmonySession((operation, reply) => {
  sequence += 1;
  writeFileSync(join(replies, `${String(sequence).padStart(4, '0')}-${operation}.bin`), reply.bytes);
});

const { email, password } = credentials(selector);
await session.login(email, password);
console.log(`signed in to test account ${selector}`);

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

/** The record's devices by name, and a refusal if a name occurs twice, since a name is the setup's key. */
async function deviceIds(): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  for (const one of await devicesOnRecord(session, record)) {
    const name = one.Name ?? '';
    if (ids.has(name)) throw new HarvestRefusal(`record ${record} holds two devices called ${name}`);
    ids.set(name, one.Id.Value);
  }
  return ids;
}

const held = await deviceIds();
console.log(`record ${record}: model ${model}, remote ${remote}, ${held.size} devices`);

if (stage === 'devices') {
  const missing = setup.devices.filter((one) => !held.has(one.name));
  console.log(`${setup.devices.length - missing.length} of ${setup.devices.length} setup devices already on the record`);
  const wanted: { name: string; device: HarvestDevice; match: Record<string, unknown> }[] = [];
  for (const { name, device } of missing) {
    const [manufacturer, file] = device.split('/');
    const entry = catalogueDevice(IR_ARCHIVE, manufacturer!, `${file}.json`);
    if (entry.model === null) throw new HarvestRefusal(`${device} has no model in the archive`);
    const one: HarvestDevice = { manufacturer: entry.manufacturer, file: `${file}.json`, model: entry.model,
      globalDeviceId: entry.globalDeviceId };
    wanted.push({ name, device: one, match: await searchDevice(session, one) });
    console.log(`  resolved ${name}: ${entry.manufacturer} ${entry.model}, device ${entry.globalDeviceId}`);
  }
  if (!commit) {
    console.log(`dry run: ${wanted.length} devices would be added; nothing was written`);
    process.exit(0);
  }
  if (wanted.length > 0) {
    const reply = await session.call('UpdateMultiple', DEVICE_MANAGER, operationBag(record,
      wanted.map(({ name, device, match }) => addDeviceOperation(match, device, record, randomUUID(), name))));
    const refusal = addRefusal(reply.status, reply.json);
    if (refusal !== undefined) throw new HarvestRefusal(`adding refused: ${refusal}; stopping, see the myharmony-service skill`);
    expectOk('UpdateMultiple', reply);
  }
  const now = await deviceIds();
  const absent = setup.devices.filter((one) => !now.has(one.name));
  if (absent.length > 0) throw new HarvestRefusal(`not on the record after adding: ${absent.map((one) => one.name).join(', ')}`);
  // The features are what an activity's inputs are named against; read and filed, so the next stage can
  // be checked against them before anything is saved.
  const features = await session.call('GetUserFeatures', `${SVCS}/UserFeaturePlatform/UserFeatureManager.svc/json/`, {
    deviceIds: setup.devices.map((one) => ({ IsPersisted: true, Value: now.get(one.name)! })) });
  console.log(`all ${setup.devices.length} devices on the record; their features answered ${features.status}`);
}

if (stage === 'activities') {
  const missingDevices = setup.devices.filter((one) => !held.has(one.name));
  if (missingDevices.length > 0) throw new HarvestRefusal(`run the devices stage first: ${missingDevices.length} missing`);
  const list = await session.callAt('ActivityList', `${ACCOUNT_DIRECTOR}Account/${record}/ActivityList`, 'GET');
  const existing = ((list.json as { Activities?: { Name?: string }[] } | undefined)?.Activities ?? []);
  const names = new Set(existing.map((one) => one.Name));
  const todo = setup.activities.filter((one) => !names.has(one.name));
  console.log(`${setup.activities.length - todo.length} of ${setup.activities.length} setup activities already on the record`);
  let order = existing.length;
  for (const activity of todo) {
    const payload = saveActivityPayload(activity, record, held, order);
    if (!commit) {
      console.log(`  would save ${activity.name}, ${(payload['activities'] as { Roles: unknown[] }[])[0]!.Roles.length} roles`);
      continue;
    }
    expectOk('SaveActivities', await session.call('SaveActivities', ACCOUNT_DIRECTOR, payload));
    console.log(`  saved ${activity.name}`);
    order += 1;
  }
  if (commit) {
    const after = await session.callAt('ActivityList', `${ACCOUNT_DIRECTOR}Account/${record}/ActivityList`, 'GET');
    const now = new Set(((after.json as { Activities?: { Name?: string }[] } | undefined)?.Activities ?? []).map((one) => one.Name));
    const absent = setup.activities.filter((one) => !now.has(one.name));
    if (absent.length > 0) throw new HarvestRefusal(`not on the record after saving: ${absent.map((one) => one.name).join(', ')}`);
    console.log(`all ${setup.activities.length} activities on the record`);
  } else {
    console.log('dry run: nothing was written');
  }
}

if (stage === 'compile') {
  const earlier = flag('poll');
  if (!commit && earlier === undefined) {
    console.log('dry run: the record would be compiled once; nothing was written');
    process.exit(0);
  }
  const result = earlier === undefined ? await compileRecord(session, record, remote) : await pollCompile(session, earlier);
  if (result.zip === undefined) throw new HarvestRefusal(`compile ${result.status}${result.downloadUrl ? `, ${result.downloadUrl}` : ''}`);
  writeFileSync(join(dir, 'compile.zip'), result.zip);
  const files = readZip(result.zip);
  for (const [file, bytes] of files) writeFileSync(join(dir, `compile-${file}`), bytes);
  const ezhex = [...files].find(([file]) => file.toLowerCase().endsWith('.ezhex'))?.[1];
  if (ezhex === undefined) throw new HarvestRefusal('the compile holds no configuration file');
  const payload = payloadOf(ezhex);
  const text = new TextDecoder('latin1').decode(payload);
  // A name tree writes a space as an underscore.
  const holds = (name: string): boolean => text.includes(name) || text.includes(name.replaceAll(' ', '_'));
  const config = parse(payload);
  // An activity's name is not stored as text the way a device's is, so it is checked through the
  // reader: on the 650's starting setup none of the four names occurs in the bytes, and the reader
  // names all four.
  const activityNames = new Set(configActivities(config).map((one) => one.name));
  const report = {
    devicesCounted: configDevices(config).length,
    activitiesCounted: activityNames.size,
    devicesMissing: setup.devices.map((one) => one.name).filter((name) => !holds(name)),
    activitiesMissing: setup.activities.map((one) => one.name).filter((name) => !activityNames.has(name)),
  };
  writeFileSync(join(dir, 'compile-check.json'), `${JSON.stringify(report, null, 1)}\n`);
  console.log(JSON.stringify(report));
}
