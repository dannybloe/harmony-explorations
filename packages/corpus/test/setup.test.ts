/**
 * The setup builder's offline half, `todo-compile-650.md` 1.6: the `SaveActivities` payload, its door,
 * and the starting setup's own data checked against the catalogue it names. Nothing here touches the
 * network.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE } from '@harmony/lab';

import { ServiceRefusal, assertCallAllowed } from '../src/myharmony.ts';
import { activityRoles, customPayload, keepOnPayload, saveActivityPayload, type Setup } from '../src/setup.ts';

const START = JSON.parse(readFileSync(new URL('../setups/h650-start.json', import.meta.url), 'utf8')) as Setup;
const IDS = new Map(START.devices.map((one, i) => [one.name, 1000 + i]));

test('saving an activity needs its own door, and no other door opens it', () => {
  const others = { MYHARMONY_ALLOW_COMPILE: '1', MYHARMONY_ALLOW_DEVICE_WRITE: '1', MYHARMONY_ALLOW_DELETE: '1' };
  assert.throws(() => assertCallAllowed('SaveActivities', others), ServiceRefusal);
  assert.doesNotThrow(() => assertCallAllowed('SaveActivities', { MYHARMONY_ALLOW_ACTIVITY_WRITE: '1' }));
});

test('an activity\'s roles: one per job, the input on every role of its device, a pass through for a device with no job', () => {
  const kodi = START.activities.find((one) => one.name === 'Kodi kijken')!;
  const roles = activityRoles(kodi, IDS) as { __type: string; DeviceId: { Value: number };
    SelectedInput: { Name: string } | null }[];
  assert.deepEqual(roles.map((one) => [one.__type.split(':')[0], one.DeviceId.Value, one.SelectedInput?.Name ?? null]), [
    ['DisplayActivityRole', IDS.get('LG TV'), 'HDMI 3'],
    ['VolumeActivityRole', IDS.get('LG TV'), 'HDMI 3'],
    ['PlayMovieActivityRole', IDS.get('Kodi'), null],
    ['PassThroughActivityRole', IDS.get('Switch'), 'Input 2'],
  ]);
  // The deserialiser binds a role's subclass only when `__type` comes first.
  for (const role of roles) assert.equal(Object.keys(role)[0], '__type');
  assert.throws(() => activityRoles(kodi, new Map()), /no device called LG TV/);
});

test('the payload names the account twice and carries the activity\'s type, name and place', () => {
  const tv = START.activities.find((one) => one.name === 'TV kijken')!;
  const payload = saveActivityPayload(tv, 16326458, IDS, 2) as { accountId: { Value: number };
    activities: { AccountId: { Value: number }; Name: string; Type: number; SuggestedDisplay: string;
      ActivityOrder: number; State: number; Id: null }[] };
  assert.equal(payload.accountId.Value, 16326458);
  assert.equal(payload.activities.length, 1);
  const [one] = payload.activities;
  assert.deepEqual([one!.AccountId.Value, one!.Name, one!.Type, one!.SuggestedDisplay, one!.ActivityOrder, one!.State, one!.Id],
    [16326458, 'TV kijken', 1, 'WatchTV', 2, 0, null]);
});

test('the starting setup: seven devices, four activities, and every input named as the catalogue names it',
  { skip: IR_ARCHIVE === undefined ? 'no archive checkout' : false }, () => {
    assert.deepEqual([START.devices.length, START.activities.length], [7, 4]);
    const catalogue = new Map(START.devices.map((one) => {
      const path = join(IR_ARCHIVE!, 'devices', `${one.device}.json`);
      assert.ok(existsSync(path), one.device);
      const entry = JSON.parse(readFileSync(path, 'utf8')) as { inputs?: { list?: { name: string }[] } };
      return [one.name, new Set((entry.inputs?.list ?? []).map((input) => input.name))];
    }));
    const inputs = START.activities.flatMap((activity) => activity.devices.filter((one) => one.input !== undefined));
    assert.equal(inputs.length, 7);
    for (const { device, input } of inputs) assert.ok(catalogue.get(device)?.has(input!), `${device} has no input ${input}`);
  });

const OPTIONS = JSON.parse(readFileSync(new URL('../setups/h650-options.json', import.meta.url), 'utf8')) as Setup;

test('saving a device feature needs its own door, and the activity door does not open it', () => {
  const others = { MYHARMONY_ALLOW_COMPILE: '1', MYHARMONY_ALLOW_DEVICE_WRITE: '1', MYHARMONY_ALLOW_ACTIVITY_WRITE: '1' };
  assert.throws(() => assertCallAllowed('SaveUserFeatures', others), ServiceRefusal);
  assert.doesNotThrow(() => assertCallAllowed('SaveUserFeatures', { MYHARMONY_ALLOW_FEATURE_WRITE: '1' }));
});

test('the keep on payload changes the flag and the state and carries every other member through', () => {
  const power = { __type: 'PowerFeature:#Logitech.Harmony.Services.DataContract.UserFeature', DeviceId: { Value: 7 },
    IsPowerAlwaysOn: false, IsPoweredOnBetweenActivities: false, PowerOnDelay: 10000, State: 0 };
  const payload = keepOnPayload(power, true) as { deviceFeatures: Record<string, unknown>[] };
  assert.equal(payload.deviceFeatures.length, 1);
  const [one] = payload.deviceFeatures;
  assert.equal(Object.keys(one!)[0], '__type');
  const changed = Object.keys(power).filter((key) => JSON.stringify(one![key]) !== JSON.stringify(power[key as keyof typeof power]));
  assert.deepEqual(changed, ['IsPoweredOnBetweenActivities', 'State']);
  assert.deepEqual([one!['IsPoweredOnBetweenActivities'], one!['State']], [true, 1]);
  assert.throws(() => keepOnPayload({ __type: 'InputFeature:#x' }, true), /not a power feature/);
});

test('saving an activity as Custom keeps its id and roles and changes its type, display and group only', () => {
  const existing = { AccountId: { Value: 16326458 }, ActivityGroup: 3, Id: { IsPersisted: false, Value: 53989708 },
    Name: 'Muziek', Roles: [{ __type: 'VolumeActivityRole:#x' }], SuggestedDisplay: 'ListenToMusic', Type: 4 };
  const payload = customPayload(existing, 16326458) as { accountId: { Value: number }; activities: Record<string, unknown>[] };
  assert.equal(payload.accountId.Value, 16326458);
  const [one] = payload.activities;
  const changed = Object.keys(existing).filter((key) => JSON.stringify(one![key]) !== JSON.stringify(existing[key as keyof typeof existing]));
  assert.deepEqual(changed, ['ActivityGroup', 'SuggestedDisplay', 'Type']);
  assert.deepEqual([one!['ActivityGroup'], one!['SuggestedDisplay'], one!['Type']], [0, 'Custom', 5]);
  assert.throws(() => customPayload({ ...existing, Id: null }, 16326458), /no id/);
});

test('the options setup is the starting setup with the Denon kept on and Muziek made Custom, and nothing else', () => {
  const strip = (setup: Setup) => JSON.stringify({ devices: setup.devices, activities: setup.activities });
  assert.notEqual(strip(OPTIONS), strip(START));
  const undo: Setup = {
    devices: OPTIONS.devices.map(({ poweredOnBetweenActivities: _, ...rest }) => rest),
    activities: OPTIONS.activities.map((one) => one.name === 'Muziek' ? { ...one, type: 'ListenToMusic' as const } : one),
  };
  assert.equal(strip(undo), strip(START));
  assert.deepEqual(OPTIONS.devices.filter((one) => one.poweredOnBetweenActivities === true).map((one) => one.name), ['Denon']);
});
