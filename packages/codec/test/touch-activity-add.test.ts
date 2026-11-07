/**
 * An activity of ours described by its devices, steps, keys and screen entries, and put into a whole set of a Harmony
 * Touch's documents, `src/harmony-touch/compose.ts`, `todo-touch.md` 8.2.
 *
 * **What has to hold, and why each test is here.**
 *
 * 1. **An activity described as a person describes it composes, and reads back** as a Touch would read it: its
 *    devices in the power on order given, each with the input named, its start and end steps in order with the delay
 *    in milliseconds, its map found by the engine's identifier `16417Activity` and the id, every key and screen entry
 *    sending a command its device has, and the check finding nothing. Nothing of a recorded activity is copied: every
 *    field is written from the description and the device list, `composeTouchActivity`'s header says which and why.
 * 2. **The type tables are what the documents state.** `ACTIVITY_TYPES` puts `SuggestedDisplay` at the position
 *    `Type` gives, and `ACTIVITY_GROUPS` the group each of the five measured types carries, on every activity of the
 *    recorded full sync, five of five; a type outside the five is refused rather than given a guessed group.
 * 3. **Adding is exact and taking out is its inverse.** `withTouchActivity` adds one entry to the activity list and
 *    one map to the end of the map list and changes nothing else, and `withoutTouchActivity` gives back the two
 *    documents as they were, as parsed JSON, on made up documents and on the recorded full sync's.
 * 4. **What the remote would drop or do otherwise is refused**, each named in the composer's header: an id not ours,
 *    an activity with no device (the screens' home list keeps only activities with roles), a device not listed or
 *    given twice, a role kind the documents measured do not hold, two devices on one power order, an input or a
 *    command a device lacks, a key name the documents do not use, a delay that is not positive, labels empty, twice
 *    or acting by themselves; and on adding, an id or a name already listed, a map identifier already listed, and a
 *    place on the list that is taken or negative. **The control** for the inverse is an activity a button of another
 *    map starts, which is refused rather than left dangling, and the tuning default, whose favourites live elsewhere.
 *
 * **Sources checked first.** The 8.2 brief in the lab; `compose.ts` and the 8.1 test beside this one, whose shape
 * this follows; the reference's `activities-and-buttons.md`; the engine's activity reader,
 * `getActivitiesConfiguration` in `loader/userconfigreader.lua`, and its map reader, `getButtonMaps` (the `16420`
 * keyboard mark), in the lab's decompiled engine; the screens' `reorderActivities`, `getActivityImage`,
 * `getActivityDetails`, `findButtonMap` and `submitActivityImageRequest` in `appscommon/harmony.lua`, and the start
 * screen's cases in `juniper/launcher.lua`, in the lab's copy of the image; the lab's `notes/6.10-screens-reads.md`
 * for every read of an activity on the screens' side. Logitech's client was not consulted: the documents are the
 * remote's, and what is checked is ours.
 *
 * **Width.** One model, the Harmony Touch, firmware 4.15.330; its firmware reports architecture 17 and Logitech's
 * templates file it under 18. Nothing here touches a remote; the full sync's documents are read for names, counts
 * and shapes and nothing out of them is printed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as lab from '@harmony/lab';
import { checkConfiguration, refusalsBeforeASync } from '../src/harmony-touch/check.ts';
import {
  ACTIVITY_GROUPS, ACTIVITY_TYPES, ComposeRefusal, composeTouchActivity, withTouchActivity, withoutTouchActivity,
  type OwnActivity,
} from '../src/harmony-touch/compose.ts';
import { documentsOfAnswers, type SyncDocuments } from '../src/harmony-touch/documents.ts';
import { readConfiguration } from '../src/harmony-touch/read.ts';
import { answersOf, FULL } from './touch-sync.ts';

/** Made up documents of Logitech's shape: a TV with two inputs and a player, one activity, and their three maps. */
function documents(): SyncDocuments {
  const command = (name: string) => ({ Name: name, KeyCode: 'G:Made Up 32 Bit:()(0x0)():3', ProtocolId: 2, TransportType: 1, Raw: null });
  const device = (id: number, name: string, commands: string[], inputs: string[]) => ({
    Device: { 'Id-': id, Name: name, DeviceType: 1, Manufacturer: 'M', Model: name, Transport: 1, ControlPort: 0, PressMinRepeats: 1, InterDeviceDelay: 0 },
    DeviceFeatures: inputs.length === 0 ? [] : [{
      __type: 'InputFeature', InputType: 1, InputDelay: 0,
      Inputs: inputs.map((n, i) => ({ InputName: n, InputOrder: i + 1, ActionSetTypeId: 1, IsActiveInput: true, Actions: [] })),
    }],
    Commands: commands.map(command),
  });
  const map = (kind: 'Device' | 'Activity', id: number) => ({ __type: `${kind}ButtonMap`, ButtonMapIdentifier: `16417${kind}${id}`, Buttons: [], Sequences: [] });
  return {
    ActivityList: { Activities: [{ 'Id-': 53000001, Name: 'Made Up', ActivityGroup: 0, Type: 5, ActivityOrder: 0, Roles: [{ __type: 'DisplayActivityRole', 'DeviceId-': 83000001, PowerOnOrder: 1, PowerOffOrder: 1 }], EnterActions: [], LeaveActions: [] }] },
    DeviceList: { DevicesWithFeatures: [
      device(83000001, 'Their TV', ['PowerOn', 'VolumeUp', 'VolumeDown', 'Mute', 'Info'], ['HDMI 1', 'HDMI 2']),
      device(83000002, 'Their Player', ['PowerOn', 'Play', 'Stop', 'TopMenu', 'DirectionUp'], []),
    ] } as never,
    MapList: { ButtonMaps: [map('Device', 83000001), map('Device', 83000002), map('Activity', 53000001)] } as never,
    ProtocolList: { Protocols: [{ __type: 'IrProtocol', 'Id-': 2, Name: 'Made Up 32 Bit', CarrierFrequency: 38000, IRSegments: [], CodeSegments: [], Attributes: [], Flags: [], HoldDelay: null, HoldMinimumRepeats: null, KeyCode: null }] },
    Context: { 'AccountId-': 1 },
    Settings: { Settings: [] },
  };
}

/** An activity of ours over the two made up devices, in the shape of 8.2's. */
function activity(over: Partial<OwnActivity> = {}): OwnActivity {
  return {
    id: 900000003, name: 'Our Cinema', type: 'Custom', startScreen: 'Commands',
    devices: [
      { device: 'Their Player', roles: ['PlayMovieActivityRole'], powerOn: 1, powerOff: 2 },
      { device: 'Their TV', roles: ['DisplayActivityRole', 'VolumeActivityRole'], powerOn: 2, powerOff: 1, input: 'HDMI 2' },
    ],
    enter: [{ delaySeconds: 3 }, { device: 'Their Player', command: 'topmenu' }],
    leave: [{ device: 'Their Player', command: 'Stop' }],
    keys: {
      VolumeUp: { device: 'Their TV', command: 'VolumeUp' },
      VolumeMute: { device: 'Their TV', command: 'Mute' },
      DirectionUp: { device: 'Their Player', command: 'DirectionUp' },
      Play: { device: 'Their Player', command: 'Play', longPress: { device: 'Their Player', command: 'Stop' } },
    },
    entries: [{ label: 'Top Menu', device: 'Their Player', command: 'TopMenu' }, { label: 'TV Info', device: 'Their TV', command: 'Info' }],
    ...over,
  };
}

test('an activity described by its devices composes and reads back: devices in order with their input, steps, its map by the engine\'s identifier, no finding', () => {
  const docs = documents();
  const added = { ...docs, ...withTouchActivity(docs, composeTouchActivity(activity(), docs)) };
  assert.deepEqual(refusalsBeforeASync(added), []);
  const c = readConfiguration(added);
  const a = c.activities.find((x) => x.id === '900000003')!;
  assert.equal(a.name, 'Our Cinema');
  assert.equal(a.type, 5);
  assert.equal(a.order, 1, 'after the one activity listed');
  assert.equal(a.hidden, false);
  assert.equal(a.startScreen, 'Commands');
  assert.equal(a.tuningDefault, false);
  // The player first, as its power on order says, and the TV with its input; the TV's second role adds its kind.
  assert.deepEqual(a.devices.map((d) => [d.device?.name, d.role.input ?? null, d.role.inputKnown, d.kinds]), [
    ['Their Player', null, false, ['PlayMovieActivityRole']],
    ['Their TV', 'HDMI 2', true, ['DisplayActivityRole', 'VolumeActivityRole']],
  ]);
  assert.deepEqual(a.roles.map((r) => [r.kind, r.powerOnOrder, r.powerOffOrder, r.nextDevicePowerOnDelay]), [
    ['PlayMovieActivityRole', 1, 2, null], ['DisplayActivityRole', 2, 1, null], ['VolumeActivityRole', 2, 1, null],
  ]);
  // A command is written as the device spells it, though the description wrote it in lower case.
  assert.deepEqual(a.enter.map((s) => [s.kind, s.order, s.durationMs, s.command?.name]), [['delay', 1, 3000, undefined], ['command', 2, undefined, 'TopMenu']]);
  assert.deepEqual(a.leave.map((s) => [s.kind, s.device?.name, s.command?.name]), [['command', 'Their Player', 'Stop']]);
  const map = a.map!;
  assert.equal(map.identifier, '16417Activity900000003');
  assert.equal(map.reachable, true);
  assert.deepEqual(map.keys.map((k) => [k.key, k.press?.device?.name, k.press?.command?.name, k.longPress?.command?.name]), [
    ['VolumeUp', 'Their TV', 'VolumeUp', undefined], ['VolumeMute', 'Their TV', 'Mute', undefined],
    ['DirectionUp', 'Their Player', 'DirectionUp', undefined], ['Play', 'Their Player', 'Play', 'Stop'],
  ]);
  assert.deepEqual([...map.entries.values()].map((e) => [e.index, e.label, e.press?.device?.name, e.press?.command?.name]), [
    [0, 'Top Menu', 'Their Player', 'TopMenu'], [1, 'TV Info', 'Their TV', 'Info'],
  ]);
  assert.deepEqual(map.gestures, []);
  assert.deepEqual(map.sequences, []);
  assert.deepEqual(checkConfiguration(c).map((f) => f.rule), checkConfiguration(readConfiguration(docs)).map((f) => f.rule));
});

test('the type tables are what the recorded full sync states: SuggestedDisplay at Type\'s position and the group of each type, five activities of five', lab.skipUnless(FULL), () => {
  const docs = documentsOfAnswers(answersOf(FULL));
  const activities = docs.ActivityList!.Activities;
  assert.equal(activities.length, 5);
  assert.deepEqual(activities.map((a) => ACTIVITY_TYPES[a.Type!] === a['SuggestedDisplay']), [true, true, true, true, true]);
  assert.deepEqual(activities.map((a) => ACTIVITY_GROUPS[a['SuggestedDisplay'] as keyof typeof ACTIVITY_GROUPS] === a.ActivityGroup), [true, true, true, true, true]);
  assert.deepEqual(Object.keys(ACTIVITY_GROUPS).sort(), activities.map((a) => String(a['SuggestedDisplay'])).sort());
  assert.throws(() => composeTouchActivity(activity({ type: 'WatchNetflix' }), documents()), /no activity of the type WatchNetflix has been measured/);
});

test('withTouchActivity adds one entry to the activity list and one map at the end of the map list, and withoutTouchActivity gives the two back as they were', () => {
  const docs = documents();
  const added = withTouchActivity(docs, composeTouchActivity(activity(), docs));
  assert.deepEqual(added.ActivityList.Activities.slice(0, 1), docs.ActivityList!.Activities);
  assert.equal(added.ActivityList.Activities.length, 2);
  assert.deepEqual(added.MapList.ButtonMaps.slice(0, 3), docs.MapList!.ButtonMaps);
  assert.equal(added.MapList.ButtonMaps.length, 4);
  assert.equal(added.MapList.ButtonMaps[3]!.ButtonMapIdentifier, '16417Activity900000003');
  // Nothing in place: the documents given are as they were.
  assert.deepEqual(docs, documents());
  const back = withoutTouchActivity({ ...docs, ...added }, 900000003);
  assert.deepEqual(back, { ActivityList: docs.ActivityList, MapList: docs.MapList });
  // The fields written are the composer's list and no other: none of the seven read by neither program.
  const record = added.ActivityList.Activities[1]!;
  assert.deepEqual(Object.keys(record), [
    'Id-', 'Name', 'Type', 'ActivityGroup', 'SuggestedDisplay', 'ActivityOrder', 'StartScreen', 'IsTuningDefault', 'DefaultChannel',
    'ImageKey', 'BaseImageUri', 'Icon', 'ActivityDisplayName', 'Alternatives', 'IsMultiZone', 'Zones', 'Roles', 'EnterActions', 'LeaveActions',
  ]);
});

test('refuses on composing what the remote would drop or do otherwise', () => {
  const docs = documents();
  const refused = (over: Partial<OwnActivity>, pattern: RegExp) => assert.throws(() => composeTouchActivity(activity(over), docs), (e: unknown) => e instanceof ComposeRefusal && pattern.test(e.message), String(pattern));
  const two = activity().devices;
  refused({ id: 83000003 }, /not one of ours/);
  refused({ type: 'Nothing' as never }, /not one of Logitech's activity types/);
  refused({ startScreen: 'Numpad' as never }, /needs what this composer does not write/);
  refused({ devices: [] }, /left off the screens' home list/);
  refused({ devices: [{ ...two[0]!, device: 'No Such Device' }] }, /no device named "No Such Device"/);
  refused({ devices: [two[0]!, { ...two[0]!, powerOn: 3, powerOff: 3 }] }, /given twice/);
  refused({ devices: [{ ...two[0]!, roles: ['SmartTVActivityRole' as never] }] }, /not a role kind/);
  refused({ devices: [{ ...two[0]!, roles: [] }] }, /given no role/);
  refused({ devices: [two[0]!, { ...two[1]!, powerOn: 1 }] }, /share power on order 1/);
  refused({ devices: [two[0]!, { ...two[1]!, powerOff: 2 }] }, /share power off order 2/);
  refused({ devices: [{ ...two[0]!, powerOn: 0 }] }, /not a whole number from 1/);
  refused({ devices: [two[0]!, { ...two[1]!, input: 'HDMI 9' }] }, /no input "HDMI 9"/);
  refused({ enter: [{ device: 'Their TV', command: 'Eject' }] }, /no command "Eject"/);
  refused({ enter: [{ delaySeconds: 0 }] }, /not a positive number/);
  refused({ keys: { Home: { device: 'Their TV', command: 'Info' } } as never }, /not a key name/);
  refused({ keys: { Play: { device: 'Their Player', command: 'Play', longPress: { device: 'Their TV', command: 'Eject' } } } }, /no command "Eject"/);
  refused({ entries: [{ label: ' ', device: 'Their TV', command: 'Info' }] }, /has no label/);
  refused({ entries: [{ label: 'A', device: 'Their TV', command: 'Info' }, { label: 'A', device: 'Their TV', command: 'Mute' }] }, /two screen entries are labelled "A"/);
  refused({ entries: [{ label: '123', device: 'Their TV', command: 'Info' }] }, /acts by itself/);
});

test('refuses on adding an id, a name, a map or a place already taken, and a negative place', () => {
  const docs = documents();
  const refused = (composed: ReturnType<typeof composeTouchActivity>, d: SyncDocuments, pattern: RegExp) =>
    assert.throws(() => withTouchActivity(d, composed), (e: unknown) => e instanceof ComposeRefusal && pattern.test(e.message), String(pattern));
  const ours = composeTouchActivity(activity(), docs);
  const once = { ...docs, ...withTouchActivity(docs, ours) };
  refused(ours, once, /already listed/);
  refused(composeTouchActivity(activity({ id: 900000004, name: 'MADE UP' }), docs), docs, /already named "MADE UP"/);
  refused(composeTouchActivity(activity({ id: 900000004, name: 'Other', order: 0 }), docs), docs, /place 0 on the activity list is another activity's/);
  refused(composeTouchActivity(activity({ id: 900000004, name: 'Other', order: -1 }), docs), docs, /negative one hides/);
  const mapOnly = { ...docs, MapList: { ButtonMaps: [...docs.MapList!.ButtonMaps, { __type: 'ActivityButtonMap', ButtonMapIdentifier: '16417Activity900000003', Buttons: [], Sequences: [] }] } } as SyncDocuments;
  refused(ours, mapOnly, /already holds a map/);
  const keyboard = { ...ours, map: { ...ours.map, ButtonMapIdentifier: '16420Activity900000003' } };
  refused(keyboard, docs, /read as a keyboard map/);
  const deviceId = { ...docs, DeviceList: { DevicesWithFeatures: [...docs.DeviceList!.DevicesWithFeatures, { Device: { 'Id-': 900000003 }, DeviceFeatures: [], Commands: [] }] } } as SyncDocuments;
  refused(ours, deviceId, /a listed device's id/);
});

test('the inverse refuses an activity not ours, one not listed, the tuning default and one a button of another map starts: the control, nothing left dangling', () => {
  const docs = documents();
  const added = { ...docs, ...withTouchActivity(docs, composeTouchActivity(activity(), docs)) };
  assert.throws(() => withoutTouchActivity(added, 53000001), /not one of ours/);
  assert.throws(() => withoutTouchActivity(docs, 900000003), /not listed/);
  const tuning = { ...added, ActivityList: { Activities: added.ActivityList.Activities.map((a) => (a['Id-'] === 900000003 ? { ...a, IsTuningDefault: true } : a)) } } as SyncDocuments;
  assert.throws(() => withoutTouchActivity(tuning, 900000003), /tunes the favourites/);
  const starter = {
    __type: 'SoftRemoteButton', TextOnRemote: 'Go', MenuItem: { IndexInMenu: 0 }, FunctionGroupType: 0,
    ButtonAction: { __type: 'ButtonActivityAction', 'ActivityId-': 900000003 },
  };
  const maps = added.MapList.ButtonMaps.map((m, i) => (i === 0 ? { ...m, Buttons: [starter] } : m));
  assert.throws(() => withoutTouchActivity({ ...added, MapList: { ButtonMaps: maps } } as SyncDocuments, 900000003), /a button of another map starts/);
});

/** The activity of 8.2, read from the file the bench set is built from. */
const DESCRIPTION = fileURLToPath(new URL('../../corpus/touch-activities/test-cinema.json', import.meta.url));
const cinema = (): OwnActivity => (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { activity: OwnActivity }).activity;

test('on the recorded full sync\'s documents: Test Cinema added passes the gate and reads back whole; taken out, the two documents are as before', lab.skipUnless(FULL), () => {
  const docs = documentsOfAnswers(answersOf(FULL));
  const added = { ...docs, ...withTouchActivity(docs, composeTouchActivity(cinema(), docs)) };
  assert.deepEqual(refusalsBeforeASync(added), []);
  const read = readConfiguration(added);
  const a = read.activities.find((x) => x.id === '900000003')!;
  assert.deepEqual([a.name, a.type, a.order, a.hidden], ['Test Cinema', 5, 5, false]);
  assert.deepEqual(a.devices.map((d) => [d.device?.name, d.role.input ?? null, typeof d.role.input !== 'string' || d.role.inputKnown]), [
    ['Blu-ray', null, true], ['LG TV', 'HDMI 2', true],
  ]);
  assert.deepEqual([...a.enter, ...a.leave].map((s) => (s.kind === 'delay' ? `${s.durationMs} ms` : `${s.device?.name} ${s.command?.name}`)),
    ['3000 ms', 'Blu-ray TopMenu', 'Blu-ray Stop']);
  const map = a.map!;
  assert.equal(map.reachable, true);
  assert.equal(map.keys.length, 13);
  assert.equal(map.entries.size, 4);
  // Every key and entry sends a command its device has, the volume keys to the TV and the rest to the player.
  const sends = [...map.keys, ...map.entries.values()].map((b) => `${b.press?.device?.name} ${b.press?.command?.name}`);
  assert.ok(sends.every((s) => !s.includes('undefined')), sends.join(', '));
  assert.deepEqual([...new Set(map.keys.map((k) => k.press?.device?.name))].sort(), ['Blu-ray', 'LG TV']);
  assert.deepEqual(map.keys.filter((k) => k.press?.device?.name === 'LG TV').map((k) => k.key), ['VolumeUp', 'VolumeDown', 'VolumeMute']);
  // The check finds on the added set exactly what it finds on the documents as they came: four findings, none ours.
  const findings = (c: typeof read) => checkConfiguration(c).map((f) => `${f.rule} ${f.document} ${f.path}`);
  assert.deepEqual(findings(read), findings(readConfiguration(docs)));
  assert.equal(findings(read).length, 4);
  const back = withoutTouchActivity(added, 900000003);
  assert.deepEqual(back, { ActivityList: docs.ActivityList, MapList: docs.MapList });
});
