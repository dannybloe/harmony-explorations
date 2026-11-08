/**
 * Devices and activities taken out of a Harmony Touch's documents with everything that names them,
 * `src/families/harmony-touch/remove.ts`, and the two rules of the check that say what a reference left dangling costs,
 * `todo-touch.md` 8.5.
 *
 * **What has to hold, and why each test is here.**
 *
 * 1. **Everything that names what is removed goes, and nothing else changes.** On made up documents of Logitech's
 *    shape: the entries and their own maps; every role and step naming the device; a key, an entry and a gesture whose
 *    press names it, taken out; a long press naming it, set to null with the button kept; a sequence step naming it,
 *    and a sequence left with no command step taken out with the key that ran it; a button starting the activity; the
 *    definitions only the device's commands named; the screen list's numbering closed up over an entry taken out, the
 *    number pad's left alone; the activities shown numbered again from 0; the power orders left as they are; and
 *    `Context` and `Settings` not returned at all. Every other entry is equal as parsed JSON.
 * 2. **What the remote would mishandle is refused**, each named in the module's header: the tuning default activity,
 *    every activity shown, the device the favourites are tuned through, a device whose removal leaves an activity with
 *    no role, every device, an id not listed or given twice, nothing named, and a name no entry or two entries carry.
 * 3. **On the recorded full sync**, whose four documents are the bench Touch's for 8.5, the removal 8.5 delivers,
 *    Listen to Music and the Denon AV Receiver: the gate passes, the check finds nothing the source did not (one
 *    finding fewer, the taken out map's), neither id occurs in any of the six, the two definitions only the receiver
 *    used are gone, and the four remaining activities are numbered 0 to 3.
 * 4. **The two rules of the check, each with a control.** `role device missing` is ignored, since the engine and the
 *    screens both pass a missing device over, and refused when any role of the activity states a numeric
 *    `NextDevicePowerOnDelay`, the one place the engine reads the missing device and raises; the control is the delay
 *    with no dangling role, found nothing, and the dangling role with no delay, ignored and not in the gate.
 *    `action activity missing` is ignored, the engine answering 567; its control is the same action naming an activity
 *    the list holds.
 *
 * **What the removal's rules rest on, read in the firmware** (the lab's `notes/8.5-preflight.md` section 1, from the
 * readings named below). The screens order the activity list and an entry list by building a table keyed by
 * `ActivityOrder + 1` and `IndexInMenu + 1`, `reorderActivities` and `reorderActivityButtonMaps`, and walk it with
 * `pairs`, which promises no order, so a gap in either numbering gives an order the documents do not mean; the remote's
 * own reorder, `juniper/activity.lua`, writes 0 to n - 1. So the removal numbers the shown activities again from 0 and
 * closes up an entry list's indices. The power, enter and leave orders are sorted by the engine's `orderTableItems`,
 * so a gap there costs nothing and they are left as they are. A role naming a device the list does not hold is passed
 * over by the engine's start and by `Action:getCommands`, both of which test the device first, and the screens list an
 * activity's devices by matching the device list against the roles, so it is simply not listed; **but** where a role of
 * the same activity states a number for `NextDevicePowerOnDelay`, the start reads the delay table by the missing
 * device's id after that test and raises, which is why the gate refuses exactly that case. A button whose action starts
 * an activity the list does not hold is stored at load without a lookup and answered 567, activity not found, when
 * pressed. These are readings, held here by the rules they produce and not by the firmware's bytes; the 8.5 run on the
 * bench Touch, `packages/bench/test/touch-removal-runs.test.ts`, measured a removal built on them.
 *
 * **Sources checked first.** The 8.5 brief in the lab; `compose.ts`'s `withoutTouchDevice` and `withoutTouchActivity`
 * and their tests, the inverses this generalises; the reference's `activities-and-buttons.md`; the lab's
 * `notes/6.10-screens-reads.md` and `notes/6.10-reader-raises.md` for every read of a device or an activity on both
 * sides; in the lab's decompiled engine `startActivity`, `Action:getCommands`, `orderTableItems` and the activity and
 * map readers; in the lab's copy of the screens `getDeviceDetails` and its callers, `getActivityDevices`,
 * `reorderActivities`, `reorderActivityButtonMaps`, `updateInfoFromActivity` and `getStations`, the launcher's start
 * subscriber, the gesture pad's `getRoleDeviceId`, and the remote's own reorder in `juniper/activity.lua`. Logitech's
 * client was not consulted: what the remote does with the documents is its own programs'.
 *
 * **Width.** One model, the Harmony Touch, firmware 4.15.330; its firmware reports architecture 17 and Logitech's
 * templates file it under 18. Nothing here touches a remote; the full sync's documents are read for names, counts and
 * shapes and nothing out of them is printed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { checkConfiguration, refusalsBeforeASync } from '../src/families/harmony-touch/check.ts';
import { ComposeRefusal } from '../src/families/harmony-touch/compose.ts';
import { CONFIGURATION_DOCUMENTS, documentsOfAnswers, type SyncDocuments } from '../src/families/harmony-touch/documents.ts';
import { readConfiguration } from '../src/families/harmony-touch/read.ts';
import { removalOfNames, withoutTouchActivities, withoutTouchDevices, withoutTouchEntries } from '../src/families/harmony-touch/remove.ts';
import { answersOf, FULL } from './touch-sync.ts';

type Json = Record<string, unknown>;

const TV = 83000001;
const RECEIVER = 83000002;
const PLAYER = 83000003;
const WATCH = 53000001;
const MOVIE = 53000002;
const MUSIC = 53000003;

/** Made up documents of Logitech's shape: a TV, a receiver and a player, three activities and their six maps. */
function documents(): SyncDocuments {
  const command = (name: string, protocol: number) => ({ Name: name, KeyCode: 'G:Made Up 32 Bit:()(0x0)():3', ProtocolId: protocol, TransportType: 1, Raw: null });
  const device = (id: number, name: string, protocol: number) => ({
    Device: { 'Id-': id, Name: name, DeviceType: 1, Manufacturer: 'M', Model: name, Transport: 1, ControlPort: 0, PressMinRepeats: 1, InterDeviceDelay: 0 },
    DeviceFeatures: [],
    Commands: ['PowerOn', 'VolumeUp', 'Mute', 'Play', 'Info', '0'].map((n) => command(n, protocol)),
  });
  const role = (kind: string, device: number, on: number, off: number) => ({ __type: kind, 'DeviceId-': device, PowerOnOrder: on, PowerOffOrder: off, NextDevicePowerOnDelay: null, SelectedInput: null });
  const press = (device: number, name: string) => ({ __type: 'ButtonCommandAction', 'DeviceId-': device, CommandName: name });
  const key = (k: string, action: Json, long: Json | null = null) => ({ __type: 'HardRemoteButton', ButtonKey: k, FunctionGroupType: 0, ButtonAction: action, ButtonLongPressAction: long, ButtonDoublePressAction: null });
  const entry = (label: string, index: number, action: Json, group = 0) => ({ __type: 'SoftRemoteButton', TextOnRemote: label, FunctionGroupType: group, MenuItem: { IndexInMenu: index }, ButtonAction: action, ButtonLongPressAction: null, ButtonDoublePressAction: null });
  const gesture = (k: string, action: Json, long: Json | null = null) => ({ __type: 'GestureRemoteButton', ButtonKey: k, ButtonAction: action, ButtonLongPressAction: long, ButtonDoublePressAction: null });
  const deviceMap = (id: number) => ({ __type: 'DeviceButtonMap', ButtonMapIdentifier: `16417Device${id}`, 'DeviceId-': id, Buttons: [key('Play', press(id, 'Play'))], Sequences: [] });
  const activityMap = (id: number, buttons: Json[], sequences: Json[] = []) => ({ __type: 'ActivityButtonMap', ButtonMapIdentifier: `16417Activity${id}`, 'ActivityId-': id, Buttons: buttons, Sequences: sequences });
  const activity = (id: number, name: string, order: number, roles: Json[], extra: Json = {}) => ({
    'Id-': id, Name: name, ActivityGroup: 0, Type: 5, ActivityOrder: order, IsTuningDefault: false, Roles: roles, EnterActions: [], LeaveActions: [], ...extra,
  });
  return {
    ActivityList: { Activities: [
      activity(WATCH, 'Watch', 0, [role('DisplayActivityRole', TV, 1, 1), role('ChannelChangingActivityRole', TV, 1, 1), role('VolumeActivityRole', RECEIVER, 2, 2)], { IsTuningDefault: true }),
      activity(MOVIE, 'Movie', 1, [role('DisplayActivityRole', TV, 1, 1), role('VolumeActivityRole', RECEIVER, 2, 2), role('PlayMovieActivityRole', PLAYER, 3, 3)], {
        EnterActions: [{ __type: 'CommandActivityAction', ActionOrder: 1, 'DeviceId-': RECEIVER, CommandName: 'Info' }, { __type: 'DelayActivityAction', ActionOrder: 2, Duration: 1 }, { __type: 'CommandActivityAction', ActionOrder: 3, 'DeviceId-': PLAYER, CommandName: 'Info' }],
        LeaveActions: [{ __type: 'CommandActivityAction', ActionOrder: 1, 'DeviceId-': RECEIVER, CommandName: 'Mute' }],
      }),
      activity(MUSIC, 'Music', 2, [role('VolumeActivityRole', RECEIVER, 1, 1), role('PlayMediaActivityRole', PLAYER, 2, 2)]),
    ] } as never,
    DeviceList: { DevicesWithFeatures: [device(TV, 'TV', 2), device(RECEIVER, 'Receiver', 3), device(PLAYER, 'Player', 2)] } as never,
    MapList: { ButtonMaps: [
      deviceMap(TV), deviceMap(RECEIVER), deviceMap(PLAYER),
      activityMap(WATCH, [key('VolumeUp', press(RECEIVER, 'VolumeUp')), key('Info', press(TV, 'Info')), gesture('Tap', press(TV, 'Play'), press(RECEIVER, 'Mute')), key('Red', { __type: 'ButtonActivityAction', 'ActivityId-': MUSIC })]),
      activityMap(MOVIE, [
        key('VolumeUp', press(RECEIVER, 'VolumeUp')), key('Play', press(PLAYER, 'Play'), press(RECEIVER, 'Mute')), key('Yellow', { __type: 'ButtonSequenceAction', SequenceId: 7 }),
        key('Blue', { __type: 'ButtonSequenceAction', SequenceId: 8 }),
        entry('TV Info', 0, press(TV, 'Info')), entry('Receiver Info', 1, press(RECEIVER, 'Info')), entry('Player Info', 2, press(PLAYER, 'Info')),
        entry('Odd', 3, press(PLAYER, 'Play'), 36), entry('0', 1, press(PLAYER, '0'), 2),
        gesture('SwipeUp', press(RECEIVER, 'VolumeUp')),
      ], [
        { SequenceId: 7, Name: 'Receiver only', Actions: [{ __type: 'ButtonCommandAction', Order: 1, 'DeviceId-': RECEIVER, CommandName: 'Mute' }, { __type: 'ButtonDelayAction', Order: 2, Duration: 1 }] },
        { SequenceId: 8, Name: 'Both', Actions: [{ __type: 'ButtonCommandAction', Order: 1, 'DeviceId-': RECEIVER, CommandName: 'Mute' }, { __type: 'ButtonCommandAction', Order: 2, 'DeviceId-': PLAYER, CommandName: 'Play' }] },
      ]),
      activityMap(MUSIC, [key('VolumeUp', press(RECEIVER, 'VolumeUp'))]),
    ] } as never,
    ProtocolList: { Protocols: [2, 3].map((id) => ({ __type: 'IrProtocol', 'Id-': id, Name: `Made Up ${id}`, CarrierFrequency: 38000, IRSegments: [], CodeSegments: [] })) } as never,
    Context: { 'AccountId-': 1 },
    Settings: { Settings: [] },
  };
}

const list = (doc: unknown, field: string): Json[] => (doc as Json)[field] as Json[];
const mapOf = (docs: { MapList: unknown }, id: number): Json => list(docs.MapList, 'ButtonMaps').find((m) => m['ButtonMapIdentifier'] === `16417Activity${id}`)!;
const buttonsOf = (m: Json): string[] => (m['Buttons'] as Json[]).map((b) => String(b['ButtonKey'] ?? b['TextOnRemote']));

test('taking out an activity and a device takes out everything naming them and changes nothing else', () => {
  const docs = documents();
  const out = withoutTouchEntries(docs, { activities: [MUSIC], devices: [RECEIVER] });
  assert.deepEqual(Object.keys(out).sort(), ['ActivityList', 'DeviceList', 'MapList', 'ProtocolList'], 'Context and Settings are not returned');

  // The entries and their own maps.
  assert.deepEqual(list(out.ActivityList, 'Activities').map((a) => a['Name']), ['Watch', 'Movie']);
  assert.deepEqual(list(out.DeviceList, 'DevicesWithFeatures').map((d) => (d['Device'] as Json)['Name']), ['TV', 'Player']);
  assert.deepEqual(list(out.MapList, 'ButtonMaps').map((m) => m['ButtonMapIdentifier']),
    [`16417Device${TV}`, `16417Device${PLAYER}`, `16417Activity${WATCH}`, `16417Activity${MOVIE}`]);
  // The definition only the receiver's commands named.
  assert.deepEqual(list(out.ProtocolList, 'Protocols').map((p) => p['Id-']), [2]);

  // Roles and steps naming the receiver, and nothing else of the activity; power orders as they were.
  const [watch, movie] = list(out.ActivityList, 'Activities');
  assert.deepEqual((watch!['Roles'] as Json[]).map((r) => [r['__type'], r['DeviceId-'], r['PowerOnOrder']]), [['DisplayActivityRole', TV, 1], ['ChannelChangingActivityRole', TV, 1]]);
  assert.deepEqual((movie!['Roles'] as Json[]).map((r) => [r['DeviceId-'], r['PowerOnOrder'], r['PowerOffOrder']]), [[TV, 1, 1], [PLAYER, 3, 3]]);
  assert.deepEqual((movie!['EnterActions'] as Json[]).map((s) => [s['__type'], s['ActionOrder']]), [['DelayActivityAction', 2], ['CommandActivityAction', 3]]);
  assert.deepEqual(movie!['LeaveActions'], []);
  // The activities shown, numbered again from 0; here they already were.
  assert.deepEqual(list(out.ActivityList, 'Activities').map((a) => a['ActivityOrder']), [0, 1]);

  // Watch: the volume key taken out, the gesture's long press set to null and the gesture kept, the key starting Music taken out.
  const w = mapOf(out, WATCH);
  assert.deepEqual(buttonsOf(w), ['Info', 'Tap']);
  const tap = (w['Buttons'] as Json[])[1]!;
  assert.equal(tap['ButtonLongPressAction'], null);
  assert.deepEqual(tap['ButtonAction'], { __type: 'ButtonCommandAction', 'DeviceId-': TV, CommandName: 'Play' });
  // Movie: the receiver's key, entry and gesture gone; Play kept with no long press; the receiver only sequence and
  // its key gone; the other sequence kept with the player's step alone.
  const m = mapOf(out, MOVIE);
  assert.deepEqual(buttonsOf(m), ['Play', 'Blue', 'TV Info', 'Player Info', 'Odd', '0']);
  assert.deepEqual((m['Sequences'] as Json[]).map((s) => [s['SequenceId'], (s['Actions'] as Json[]).map((a) => a['CommandName'])]), [[8, ['Play']]]);
  // The list closed up over the entry taken out, group 36 with it, the number pad left alone.
  assert.deepEqual((m['Buttons'] as Json[]).filter((b) => b['__type'] === 'SoftRemoteButton').map((b) => [b['TextOnRemote'], b['FunctionGroupType'], (b['MenuItem'] as Json)['IndexInMenu']]),
    [['TV Info', 0, 0], ['Player Info', 0, 1], ['Odd', 36, 2], ['0', 2, 1]]);

  // Every other entry is the source's, as parsed JSON.
  const before = documents();
  assert.deepEqual(list(out.MapList, 'ButtonMaps')[0], list(before.MapList, 'ButtonMaps')[0]);
  assert.deepEqual(list(out.DeviceList, 'DevicesWithFeatures')[1], list(before.DeviceList, 'DevicesWithFeatures')[2]);
  assert.deepEqual(docs, before, 'nothing changed in place');
  // The result reads, passes the gate and the check finds nothing dangling.
  const after = { ...docs, ...out };
  assert.deepEqual(refusalsBeforeASync(after), []);
  assert.deepEqual(checkConfiguration(readConfiguration(after)).map((f) => f.rule), []);
});

test('the activities shown are numbered again from 0 in the order they had, and a hidden one keeps its number', () => {
  const docs = documents();
  const activities = list(docs.ActivityList, 'Activities');
  activities[0]!['ActivityOrder'] = 2;
  activities[1]!['ActivityOrder'] = -1;
  activities[2]!['ActivityOrder'] = 5;
  activities.push({ ...activities[2]!, 'Id-': 53000004, Name: 'Fourth', ActivityOrder: 0 });
  const out = withoutTouchActivities(docs, [MUSIC]);
  assert.deepEqual(list(out.ActivityList, 'Activities').map((a) => [a['Name'], a['ActivityOrder']]), [['Watch', 1], ['Movie', -1], ['Fourth', 0]]);
});

test('refuses what the remote would mishandle or what would cost the person something silently', () => {
  const refused = (f: () => unknown, pattern: RegExp) => assert.throws(f, (e: unknown) => e instanceof ComposeRefusal && pattern.test(e.message));
  const docs = documents();
  refused(() => withoutTouchActivities(docs, [WATCH]), /favourite channels belong to/);
  refused(() => withoutTouchActivities({ ...docs, ActivityList: { Activities: list(docs.ActivityList, 'Activities').map((a) => ({ ...a, IsTuningDefault: false })) } as never }, [WATCH, MOVIE, MUSIC]), /leaves no activity on the list/);
  refused(() => withoutTouchDevices(docs, [TV]), /favourite channels are tuned through/);
  refused(() => withoutTouchDevices(docs, [PLAYER, RECEIVER]), /activity 53000003 would be left with no device/);
  refused(() => withoutTouchDevices({ ...docs, ActivityList: { Activities: [] } as never }, [TV, RECEIVER, PLAYER]), /leaves no device/);
  refused(() => withoutTouchDevices(docs, [12345678]), /not listed/);
  refused(() => withoutTouchDevices(docs, [RECEIVER, String(RECEIVER)]), /named twice/);
  refused(() => withoutTouchEntries(docs, {}), /nothing is named/);
  refused(() => withoutTouchDevices({ ...docs, MapList: {} as never }, [RECEIVER]), /MapList holds no list/);
  refused(() => removalOfNames(docs, { devices: ['Nobody'] }), /no device named "Nobody"/);
  const twice = { ...docs, ActivityList: { Activities: [...list(docs.ActivityList, 'Activities'), { ...list(docs.ActivityList, 'Activities')[2]!, 'Id-': 53000009 }] } as never };
  refused(() => removalOfNames(twice, { activities: ['Music'] }), /2 activities named "Music"/);
  // The control: the same removal the first test makes is refused by none of these.
  assert.doesNotThrow(() => withoutTouchEntries(docs, removalOfNames(docs, { activities: ['Music'], devices: ['Receiver'] })));
});

test('on the recorded full sync, Listen to Music and the Denon AV Receiver taken out: the gate passes and neither id is left anywhere', lab.skipUnless(FULL), () => {
  const docs = documentsOfAnswers(answersOf(FULL));
  const removal = removalOfNames(docs, { activities: ['Listen to Music'], devices: ['Denon AV Receiver'] });
  const after = { ...docs, ...withoutTouchEntries(docs, removal) };
  assert.deepEqual(refusalsBeforeASync(after), []);
  const before = checkConfiguration(readConfiguration(docs));
  const now = checkConfiguration(readConfiguration(after));
  // One finding fewer, a number pad entry on no key of the map taken out, and none the source did not have.
  assert.equal(before.length, 4);
  assert.equal(now.length, 3);
  for (const f of now) assert.ok(before.some((b) => b.rule === f.rule && b.message === f.message), f.rule);
  for (const id of [...removal.devices!, ...removal.activities!]) {
    for (const name of CONFIGURATION_DOCUMENTS) assert.equal(JSON.stringify(after[name]).includes(String(id)), false, name);
  }
  const c = readConfiguration(after);
  assert.deepEqual(c.activities.map((a) => [a.name, a.order]), [['Watch TV', 0], ['Watch a Blu-ray', 1], ['Switch Box', 2], ['Play a Game', 3]]);
  assert.deepEqual(c.devices.map((d) => d.name), ['LG TV', 'Blu-ray', 'Plex', 'KPN', 'Xbox', 'Switch']);
  assert.deepEqual(c.protocols.map((p) => p.name), ['Toshiba 32 Bit', 'Sony 20 Bit', 'Microsoft 30 Bit']);
  // Watch a Blu-ray's list closed up over the receiver's entry: eight entries, 0 to 7.
  assert.deepEqual([...c.activities[1]!.map!.entries.keys()].sort((x, y) => x - y), [0, 1, 2, 3, 4, 5, 6, 7]);
  // The favourites are untouched: Watch TV is still tuned through the LG TV.
  assert.equal(c.activities[0]!.roles.find((r) => r.kind === 'ChannelChangingActivityRole')?.device?.name, 'LG TV');
});

test('role device missing: ignored, and refused only where a role of the activity states a power on delay; with controls', () => {
  const docs = documents();
  const withRoles = (roles: (r: Json[]) => Json[]): SyncDocuments => {
    const activities = list(docs.ActivityList, 'Activities').map((a) => (a['Id-'] === MOVIE ? { ...a, Roles: roles(a['Roles'] as Json[]) } : a));
    return { ...docs, ActivityList: { Activities: activities } as never };
  };
  const missing = (r: Json[]) => [...r, { ...r[2]!, 'DeviceId-': 83999999, PowerOnOrder: 4, PowerOffOrder: 4 }];
  const delayed = (r: Json[]) => r.map((x, i) => (i === 0 ? { ...x, NextDevicePowerOnDelay: 2 } : x));
  const rules = (d: SyncDocuments) => checkConfiguration(readConfiguration(d)).filter((f) => f.rule === 'role device missing').map((f) => f.effect);

  // The dangling role alone: ignored, and the gate passes.
  assert.deepEqual(rules(withRoles(missing)), ['ignored']);
  assert.deepEqual(refusalsBeforeASync(withRoles(missing)), []);
  // With a delay on another role of the activity: refused, and the gate refuses it.
  assert.deepEqual(rules(withRoles((r) => delayed(missing(r)))), ['refused']);
  assert.deepEqual(refusalsBeforeASync(withRoles((r) => delayed(missing(r)))).map((f) => f.rule), ['role device missing']);
  // The control: the delay with no dangling role finds nothing.
  assert.deepEqual(rules(withRoles(delayed)), []);
  assert.deepEqual(refusalsBeforeASync(withRoles(delayed)), []);
});

test('action activity missing: a button starting an activity the list does not hold is ignored; the control names one it holds', () => {
  const docs = documents();
  const dangling = withoutTouchActivities(docs, [MUSIC]);
  // Put the key that starts Music back by hand, which the removal took out.
  const watch = mapOf(dangling, WATCH);
  (watch['Buttons'] as Json[]).push({ __type: 'HardRemoteButton', ButtonKey: 'Red', FunctionGroupType: 0, ButtonAction: { __type: 'ButtonActivityAction', 'ActivityId-': MUSIC }, ButtonLongPressAction: null, ButtonDoublePressAction: null });
  const findings = checkConfiguration(readConfiguration({ ...docs, ...dangling })).filter((f) => f.rule === 'action activity missing');
  assert.deepEqual(findings.map((f) => [f.effect, f.document]), [['ignored', 'MapList']]);
  assert.deepEqual(checkConfiguration(readConfiguration(docs)).filter((f) => f.rule === 'action activity missing'), []);
});
