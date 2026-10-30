/**
 * Put a setup on a remote record of a test account and have Logitech compile it, leaving the setup in
 * place: the counterpart of `harvest.ts`, which removes what it added. Written for the Harmony 650's
 * starting setup, `todo-compile-650.md` 1.6; load the `gathering-logitech` and `myharmony-service`
 * skills before using it.
 *
 * ```
 * node packages/corpus/bin/build-setup.ts --setup packages/corpus/setups/h650-start.json \
 *     --record 16326458 --model 72 --label h650-start --stage devices|activities|options|favourites|compile \
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
 * * `options` changes what is already on the record to match the setup, for `todo-compile-650.md` 3.10
 *   and 3.11: a device's keep on flag, `poweredOnBetweenActivities`, saved with `SaveUserFeatures`
 *   (`MYHARMONY_ALLOW_FEATURE_WRITE=1`), and an activity the setup calls `Custom` that the record holds
 *   as another type, saved again as `Custom` so it holds no activity key (`MYHARMONY_ALLOW_ACTIVITY_WRITE=1`).
 *   Only those two changes; any other difference is refused rather than guessed at.
 * * `favourites` puts the setup's favourite channels on their device, for `todo-compile-350.md` 3.1: it reads
 *   the device's button map, refuses a map that already holds favourites, and saves the map with one button
 *   per channel appended, as MyHarmony's favourites screen does for a Harmony One, 600, 650 or 700; a Harmony
 *   300 or 350 is refused, since it keeps its favourites on its mode map, `favouriteIndexBase`. `favouritesPayload` in `src/setup.ts`, in
 *   one `SaveButtonMaps` (`MYHARMONY_ALLOW_BUTTONMAP_WRITE=1`); then reads the map back and refuses unless
 *   it holds exactly those channels. One device per run, as the client saves one device's map at a time.
 *   Without `--commit` it also files the save it would send in the lab, as `favourites-payload.json`.
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
import {
  activities as configActivities, devices as configDevices, parse, payloadOf, catalogueDevice, readRecipe,
} from '@harmony/codec';
import {
  ACCOUNT_DIRECTOR, ACCOUNT_MANAGER, BUTTON_MAPPING_MANAGER, DEVICE_MANAGER, MyHarmonySession, SVCS, credentials,
} from '../src/myharmony.ts';
import {
  HarvestRefusal, PROTECTED_RECORDS, addDeviceOperation, addRefusal, operationBag, readZip, type HarvestDevice,
} from '../src/harvest.ts';
import { compileRecord, devicesOnRecord, expectOk, pollCompile, searchDevice } from '../src/record.ts';
import {
  customPayload, favouriteIndexBase, favouritesOnMap, favouritesPayload, favouritesSavedProblems, getButtonMapsRequest,
  keepOnPayload, saveActivityPayload, type Setup,
} from '../src/setup.ts';

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
// The recipe's shape checked before anything is sent: a favourite channel written as a number, which would
// lose a leading zero, or naming no device of the setup, is refused here rather than on the account.
readRecipe(setup);
if (!['devices', 'activities', 'options', 'favourites', 'compile'].includes(stage)) throw new HarvestRefusal(`--stage ${stage} is not a stage`);
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

/** What the favourites stage reads off the record's remote: its skins and its surfaces, `{ Id }` each. */
interface HouseholdRemote {
  Id: { Value: number };
  GlobalRemoteSkinId?: number;
  SkinId?: number;
  Surfaces?: { Id: { Value: number } }[];
}

const household = expectOk('GetMyHousehold', await session.call('GetMyHousehold', ACCOUNT_MANAGER, {}));
const accounts = ((household['GetMyHouseholdResult'] as { Accounts?: unknown[] } | undefined)?.Accounts ?? []) as
  { Id: { Value: number }; ProductIdentifier?: string; Remotes?: HouseholdRemote[] }[];
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

if (stage === 'options') {
  const FEATURES = `${SVCS}/UserFeaturePlatform/UserFeatureManager.svc/json/`;
  const missingDevices = setup.devices.filter((one) => !held.has(one.name));
  if (missingDevices.length > 0) throw new HarvestRefusal(`run the devices stage first: ${missingDevices.length} missing`);
  // The keep on flag, per device, against what the record holds now.
  const reply = expectOk('GetUserFeatures', await session.call('GetUserFeatures', FEATURES, {
    deviceIds: setup.devices.map((one) => ({ IsPersisted: true, Value: held.get(one.name)! })) }));
  const byDevice = new Map(((reply['GetUserFeaturesResult'] ?? []) as { Key: { Value: number }; Value: Record<string, unknown>[] }[])
    .map((one) => [one.Key.Value, one.Value]));
  const flagChanges: { name: string; power: Record<string, unknown>; on: boolean }[] = [];
  for (const one of setup.devices) {
    const power = byDevice.get(held.get(one.name)!)?.find((f) => String(f['__type']).startsWith('PowerFeature:'));
    if (power === undefined) throw new HarvestRefusal(`${one.name} has no power feature to change`);
    const wanted = one.poweredOnBetweenActivities ?? false;
    if (power['IsPoweredOnBetweenActivities'] !== wanted) flagChanges.push({ name: one.name, power, on: wanted });
  }
  // The activities whose type differs, of which only a change to Custom is made.
  const list = await session.callAt('ActivityList', `${ACCOUNT_DIRECTOR}Account/${record}/ActivityList`, 'GET');
  const existing = ((list.json as { Activities?: Record<string, unknown>[] } | undefined)?.Activities ?? []);
  const retype: Record<string, unknown>[] = [];
  for (const activity of setup.activities) {
    const on = existing.filter((one) => one['Name'] === activity.name);
    if (on.length !== 1) throw new HarvestRefusal(`record ${record} holds ${on.length} activities called ${activity.name}`);
    if (on[0]!['SuggestedDisplay'] === activity.type) continue;
    if (activity.type !== 'Custom') throw new HarvestRefusal(`${activity.name}: only a change to Custom is made here`);
    retype.push(on[0]!);
  }
  for (const one of flagChanges) console.log(`  ${commit ? 'setting' : 'would set'} ${one.name}'s keep on flag to ${one.on}`);
  for (const one of retype) console.log(`  ${commit ? 'saving' : 'would save'} ${String(one['Name'])} as Custom, which holds no activity key`);
  if (!commit) {
    console.log('dry run: nothing was written');
    process.exit(0);
  }
  for (const one of flagChanges) {
    // The operation returns nothing, so an empty body is a success; the read back below is the check.
    const saved = await session.call('SaveUserFeatures', FEATURES, keepOnPayload(one.power, one.on));
    if (saved.status !== 200) throw new HarvestRefusal(`SaveUserFeatures answered status ${saved.status}; stopping`);
  }
  for (const one of retype) {
    expectOk('SaveActivities', await session.call('SaveActivities', ACCOUNT_DIRECTOR, customPayload(one, record)));
  }
  // Read both back, and refuse if either did not take or the activity count moved.
  const features = expectOk('GetUserFeatures', await session.call('GetUserFeatures', FEATURES, {
    deviceIds: setup.devices.map((one) => ({ IsPersisted: true, Value: held.get(one.name)! })) }));
  const after = new Map(((features['GetUserFeaturesResult'] ?? []) as { Key: { Value: number }; Value: Record<string, unknown>[] }[])
    .map((one) => [one.Key.Value, one.Value.find((f) => String(f['__type']).startsWith('PowerFeature:'))]));
  for (const one of setup.devices) {
    const now = after.get(held.get(one.name)!)?.['IsPoweredOnBetweenActivities'];
    if (now !== (one.poweredOnBetweenActivities ?? false)) throw new HarvestRefusal(`${one.name}'s keep on flag reads ${String(now)} after saving`);
  }
  const listed = await session.callAt('ActivityList', `${ACCOUNT_DIRECTOR}Account/${record}/ActivityList`, 'GET');
  const nowActivities = ((listed.json as { Activities?: Record<string, unknown>[] } | undefined)?.Activities ?? []);
  if (nowActivities.length !== existing.length) {
    throw new HarvestRefusal(`the record held ${existing.length} activities and holds ${nowActivities.length} after saving`);
  }
  for (const activity of setup.activities) {
    const one = nowActivities.find((each) => each['Name'] === activity.name);
    if (one?.['SuggestedDisplay'] !== activity.type) throw new HarvestRefusal(`${activity.name} reads ${String(one?.['SuggestedDisplay'])} after saving`);
    console.log(`  ${activity.name}: ${String(one['SuggestedDisplay'])}, activity group ${String(one['ActivityGroup'])}`);
  }
  console.log('every keep on flag and activity type on the record matches the setup');
}

if (stage === 'favourites') {
  const wanted = setup.favourites ?? [];
  if (wanted.length !== 1) throw new HarvestRefusal(`the setup states favourites for ${wanted.length} devices; this stage saves one device's`);
  const [{ device: name, channels }] = wanted as [{ device: string; channels: readonly string[] }];
  const deviceId = held.get(name);
  if (deviceId === undefined) throw new HarvestRefusal(`run the devices stage first: no ${name} on the record`);
  // The client asks for a map by the remote's skin and the account's one surface, `ButtonMappingStore`. The
  // read asks with `GlobalRemoteSkinId` and the read back after a save with `SkinId`, both the client's
  // choices; the skill's trap is that the first need not name the model, so the two have to agree here.
  const onRemote = chosen.Remotes![0]!;
  const skin = onRemote.GlobalRemoteSkinId;
  if (skin === undefined || skin !== onRemote.SkinId) {
    throw new HarvestRefusal(`the remote's skins disagree, ${String(skin)} and ${String(onRemote.SkinId)}: which one a map is asked by is not settled`);
  }
  const surfaces = onRemote.Surfaces ?? [];
  if (surfaces.length !== 1) throw new HarvestRefusal(`the remote has ${surfaces.length} surfaces, not 1`);
  const surface = surfaces[0]!.Id.Value;
  const indexBase = favouriteIndexBase(setup.model.name);
  /** The device's one map as the service holds it now. */
  const readMap = async (): Promise<Record<string, unknown>> => {
    const reply = expectOk('GetButtonMaps', await session.call('GetButtonMaps', BUTTON_MAPPING_MANAGER,
      getButtonMapsRequest([deviceId], skin, record, surface)));
    const maps = ((reply['GetButtonMapsResult'] ?? []) as Record<string, unknown>[])
      .filter((one) => (one['DeviceId'] as { Value?: number } | null)?.Value === deviceId);
    if (maps.length !== 1) throw new HarvestRefusal(`GetButtonMaps answered ${maps.length} maps for ${name}, not 1`);
    return maps[0]!;
  };
  const before = await readMap();
  const already = favouritesOnMap(before);
  if (already.length > 0) {
    throw new HarvestRefusal(`${name} already holds favourites ${already.map((one) => one.channel).join(', ')}; refused rather than overwritten`);
  }
  const payload = favouritesPayload(before, deviceId, channels, surface, indexBase);
  const sent = (payload['buttonMaps'] as { Buttons: Record<string, unknown>[] }[])[0]!;
  const stored = (before['ButtonMapId'] as { Value?: unknown } | null)?.Value;
  console.log(`${name}, device ${deviceId}: a ${stored === undefined ? 'default' : 'stored'} map of ${sent.Buttons.length - channels.length} buttons`);
  for (const button of sent.Buttons.slice(-channels.length)) console.log(`  ${commit ? 'adding' : 'would add'} ${JSON.stringify(button)}`);
  writeFileSync(join(dir, 'favourites-payload.json'), `${JSON.stringify(payload, null, 1)}\n`);
  if (!commit) {
    console.log(`dry run: one SaveButtonMaps of ${sent.Buttons.length} buttons would be sent, filed as favourites-payload.json; nothing was written`);
    process.exit(0);
  }
  // The operation returns nothing, so an empty body is a success; the read back below is the check.
  const saved = await session.call('SaveButtonMaps', BUTTON_MAPPING_MANAGER, payload);
  if (saved.status !== 200) throw new HarvestRefusal(`SaveButtonMaps answered status ${saved.status}; stopping`);
  const after = await readMap();
  const problems = favouritesSavedProblems(before, after, deviceId, channels);
  if (problems.length > 0) throw new HarvestRefusal(`after saving: ${problems.join('; ')}`);
  console.log(`${name} holds favourites ${favouritesOnMap(after).map((one) => `${one.channel} at ${one.index}`).join(', ')}`);
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
