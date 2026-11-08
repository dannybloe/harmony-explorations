/**
 * A device of ours described by its family and numbers, and put into a whole set of a Harmony Touch's documents,
 * `src/families/harmony-touch/compose.ts`, `todo-touch.md` 8.1.
 *
 * **What has to hold, and why each test is here.**
 *
 * 1. **A device described by a row of our rhythm table and numbers composes, and reads back** as a Touch would
 *    read it: every command with the one definition and a key code, its map found by the engine's identifier,
 *    its keys by the same name rule as 5.3, and the check finding nothing. `composeTouchDeviceOfRow` writes no
 *    rhythm itself: the definition is `definitionOfRow`'s and the key code `keyCodeText`'s, through `codeOfRow`,
 *    the one place a row and a number become both, which `codeOfLearned` now goes through too.
 * 2. **Our Sony 12 Bit definition has the shape of the Sony 20 Bit one the bench Touch sends**: the same fields,
 *    one header, two cells, the same frame period, the key code in the repeat group, differing in the width.
 *    That is why 8.1 chose that family: the one definition a unit has already sent that ours resembles most.
 * 3. **Adding is exact and taking out is its inverse.** `withTouchDevice` adds one entry to each of the device,
 *    map and protocol lists and changes nothing else, and `withoutTouchDevice` gives back the three documents as
 *    they were, as parsed JSON, on made up documents and on the recorded full sync's.
 * 4. **The identifiers are ours and collide with nothing.** `OWN_IDS`, nine digits from 900000000; a device id
 *    one of whose digits contain another device's id, or are contained in it, is refused, since the screens
 *    search a device's id as a pattern (the lab's `notes/6.10-screens-reads.md`, row 200); so are an id that is
 *    not ours, a device name another device has, a map identifier already listed and a protocol id listed with
 *    another definition. **The control** for the inverse is a device an activity names, which is refused rather
 *    than left dangling: 8.5's general removal is what takes such a device out.
 *
 * **Sources checked first.** The 8.1 brief in the lab; `compose.ts`, `definition.ts` and their tests; the
 * screens' device list and device mode, `juniper/devicemode.lua` (the order a new device joins the list, the
 * command list by `IndexInMenu`), `appscommon/harmony.lua` (`getHEDeviceImage`, `checkIconPresence`,
 * `findButtonMap`) in the lab's copy of the image; the engine's `buttonPress` in `apihandler/activity.lua` (a
 * device's map by `16417Device` and the id, then the root map); the third party archive's protocol ids for the
 * range. Logitech's client was not consulted: the documents are the remote's, and what is checked is ours.
 *
 * **Width.** One model, the Harmony Touch, firmware 4.15.330; its firmware reports architecture 17 and Logitech's
 * templates file it under 18. Nothing here touches a remote; the full sync's documents are read for names, counts
 * and shapes and nothing out of them is printed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { checkConfiguration, refusalsBeforeASync } from '../src/families/harmony-touch/check.ts';
import {
  ComposeRefusal, OWN_IDS, codeOfLearned, codeOfRow, composeTouchDeviceOfRow, isOwnId, withTouchDevice, withoutTouchDevice,
  type RowDevice,
} from '../src/families/harmony-touch/compose.ts';
import { documentsOfAnswers, type SyncDocuments } from '../src/families/harmony-touch/documents.ts';
import { readConfiguration } from '../src/families/harmony-touch/read.ts';
import { pulsesOfStatedRow, statedProtocol } from '../src/stated.ts';
import { answersOf, FULL } from './touch-sync.ts';

/** A device of ours in the shape of 8.1's: Sony 12 Bit, numbers of ours, keys by name, one entry screen only. */
function rowDevice(over: Partial<RowDevice> = {}): RowDevice {
  return {
    id: 900000001, name: 'Made Up Projector', manufacturer: 'Ours', model: 'P1', deviceType: 7, pressRepeats: 3,
    interKeyDelayMs: 100, interDeviceDelayMs: 500, family: 'Sony 12 Bit', protocolId: 900000002, keys: 'by name',
    commands: [
      { name: 'PowerToggle', label: 'Power', value: '0x80F' },
      { name: 'DirectionUp', label: 'Up', value: '0x40F' },
      { name: 'Select', label: 'OK', value: 0x60F },
      { name: 'VolumeMute', label: 'Mute', value: '0xD0F', onScreen: false },
    ],
    ...over,
  };
}

/** Made up documents of two devices of Logitech's shape, one activity naming the first, and their two maps. */
function documents(): SyncDocuments {
  const theirs = (id: number, name: string) => ({
    Device: { 'Id-': id, Name: name, DeviceType: 1, Manufacturer: 'M', Model: name, Transport: 1, ControlPort: 0, PressMinRepeats: 1, InterDeviceDelay: 0 },
    DeviceFeatures: [],
    Commands: [{ Name: 'PowerToggle', KeyCode: 'G:Made Up 32 Bit:()(0x0)():3', ProtocolId: 2, TransportType: 1, Raw: null }],
  });
  const map = (kind: 'Device' | 'Activity', id: number) => ({
    __type: `${kind}ButtonMap`, ButtonMapIdentifier: `16417${kind}${id}`, Buttons: [], Sequences: [],
  });
  return {
    ActivityList: { Activities: [{ 'Id-': 53000001, Name: 'Made Up', ActivityGroup: 0, Type: 5, ActivityOrder: 0, Roles: [{ __type: 'DisplayActivityRole', 'DeviceId-': 83000001 }], EnterActions: [], LeaveActions: [] }] },
    DeviceList: { DevicesWithFeatures: [theirs(83000001, 'Their TV'), theirs(83000002, 'Their Box')] } as never,
    MapList: { ButtonMaps: [map('Device', 83000001), map('Device', 83000002), map('Activity', 53000001)] } as never,
    ProtocolList: { Protocols: [{ __type: 'IrProtocol', 'Id-': 2, Name: 'Made Up 32 Bit', CarrierFrequency: 38000, IRSegments: [], CodeSegments: [], Attributes: [], Flags: [], HoldDelay: null, HoldMinimumRepeats: null, KeyCode: null }] },
  };
}

test('a device of a row and numbers composes and reads back: one definition, every command its key code, its map by the engine\'s identifier, no finding', () => {
  const composed = composeTouchDeviceOfRow(rowDevice());
  assert.equal(composed.protocols.length, 1);
  assert.equal(composed.protocols[0]!['Id-'], 900000002);
  assert.deepEqual(composed.device.Commands!.map((c) => c['KeyCode']), [
    'G:Sony 12 Bit:()(0x80F)():3', 'G:Sony 12 Bit:()(0x40F)():3', 'G:Sony 12 Bit:()(0x60F)():3', 'G:Sony 12 Bit:()(0xD0F)():3',
  ]);
  const c = readConfiguration({ DeviceList: { DevicesWithFeatures: [composed.device] }, MapList: { ButtonMaps: [composed.map] }, ProtocolList: { Protocols: composed.protocols } });
  const d = c.devices[0]!;
  assert.equal(d.map?.identifier, '16417Device900000001');
  assert.equal(d.map?.reachable, true);
  assert.deepEqual(d.commands.map((x) => [x.name, x.protocol?.name, x.code === undefined]), [
    ['PowerToggle', 'Sony 12 Bit', false], ['DirectionUp', 'Sony 12 Bit', false], ['Select', 'Sony 12 Bit', false], ['VolumeMute', 'Sony 12 Bit', false],
  ]);
  // The same name rule as 5.3: PowerToggle names no key, the other three their own; Mute is off the screen list.
  assert.deepEqual(d.map!.keys.map((k) => [k.key, k.press?.command?.name]), [['DirectionUp', 'DirectionUp'], ['Select', 'Select'], ['VolumeMute', 'VolumeMute']]);
  assert.deepEqual([...d.map!.entries.values()].map((e) => [e.index, e.label]), [[0, 'Power'], [1, 'Up'], [2, 'OK']]);
  assert.equal(d.pressRepeats, 3);
  assert.deepEqual(checkConfiguration(c), []);
});

test('a row and a number are written by one function: the definition and key code codeOfRow gives are the ones the table\'s row renders', () => {
  const row = statedProtocol('Sony 12 Bit')!;
  const one = codeOfRow(row, 900000002, 0x80Fn);
  assert.ok(!('refusal' in one) && one.code.kind === 'stated');
  // The learned route goes through the same function: the table's own rendering of a code, learned back, gives
  // the same definition and key code under the same id.
  const train = pulsesOfStatedRow(row, 12, 0x80Fn)!;
  const learned = codeOfLearned(train, 40000, 900000002);
  assert.deepEqual(learned.code, one.code);
});

test('refuses a family the table does not hold, a protocol id not ours, a number that is not one', () => {
  assert.throws(() => composeTouchDeviceOfRow(rowDevice({ family: 'No Such 12 Bit' })), /not a family of the rhythm table/);
  assert.throws(() => composeTouchDeviceOfRow(rowDevice({ protocolId: 18 })), /not one of ours/);
  assert.throws(() => composeTouchDeviceOfRow(rowDevice({ commands: [{ name: 'PowerToggle', value: '0xZZ' }] })), /is not a number/);
});

test('our Sony 12 Bit definition has the fields and the shape of the Sony 20 Bit one the bench Touch is given, differing in the width', lab.skipUnless(FULL), () => {
  const theirs = documentsOfAnswers(answersOf(FULL)).ProtocolList!.Protocols.find((p) => p.Name === 'Sony 20 Bit');
  assert.ok(theirs !== undefined, 'the full sync holds Sony 20 Bit');
  const ours = composeTouchDeviceOfRow(rowDevice()).protocols[0]!;
  assert.deepEqual(Object.keys(ours).sort(), Object.keys(theirs).sort());
  const shape = (p: typeof ours) => ({
    carrier: p.CarrierFrequency,
    segments: p.IRSegments!.map((s) => ({
      header: s.Header?.map((a) => [a.Type, a.Value]), trailer: s.Trailer?.map((a) => [a.Type, a.Value]), total: s.TotalLength,
      cells: s.Payload?.Encodings?.map((e) => e.Atoms?.map((a) => [a.Type, a.Value])), bits: s.Payload?.NumberOfBits,
    })),
    repeat: p.KeyCode?.Repeat?.length, start: p.KeyCode?.Start?.length ?? 0, finish: p.KeyCode?.Finish?.length ?? 0,
  });
  const a = shape(ours);
  const b = shape(theirs);
  assert.deepEqual({ ...a, segments: a.segments.map((s) => ({ ...s, bits: 0 })) }, { ...b, segments: b.segments.map((s) => ({ ...s, bits: 0 })) });
  assert.deepEqual([a.segments[0]!.bits, b.segments[0]!.bits], [12, 20]);
});

test('withTouchDevice adds one entry to each of the three lists, the map after the last device map, and withoutTouchDevice gives the three back as they were', () => {
  const docs = documents();
  const added = withTouchDevice(docs, composeTouchDeviceOfRow(rowDevice()));
  assert.equal(added.DeviceList.DevicesWithFeatures.length, 3);
  assert.equal(added.DeviceList.DevicesWithFeatures[2]!.Device['Id-'], 900000001);
  assert.deepEqual(added.MapList.ButtonMaps.map((m) => m.ButtonMapIdentifier), ['16417Device83000001', '16417Device83000002', '16417Device900000001', '16417Activity53000001']);
  assert.deepEqual(added.ProtocolList.Protocols.map((p) => p['Id-']), [2, 900000002]);
  // Nothing else of the three changed, and the documents handed in are untouched.
  assert.deepEqual(added.DeviceList.DevicesWithFeatures.slice(0, 2), docs.DeviceList!.DevicesWithFeatures);
  assert.deepEqual(documents(), docs);
  const back = withoutTouchDevice({ ...docs, ...added }, 900000001);
  assert.deepEqual(back, { DeviceList: docs.DeviceList, MapList: docs.MapList, ProtocolList: docs.ProtocolList });
});

test('refuses ids that are not ours or that collide, a name already listed, a map already listed and a protocol id listed otherwise', () => {
  const docs = documents();
  const add = (over: Partial<RowDevice>) => () => withTouchDevice(docs, composeTouchDeviceOfRow(rowDevice(over)));
  assert.throws(add({ id: 83000003 }), /device id 83000003 is not one of ours/);
  // Nine digits holding an eight digit id of theirs: the screens' pattern search would find their device in ours.
  assert.throws(add({ id: 983000001 }), /one inside the other/);
  assert.throws(add({ name: 'their tv' }), /already named/);
  const twice = { ...docs, ...withTouchDevice(docs, composeTouchDeviceOfRow(rowDevice())) };
  assert.throws(() => withTouchDevice(twice, composeTouchDeviceOfRow(rowDevice())), /already listed/);
  // The same definition under the same id is shared, a different one refused.
  const shared = withTouchDevice(twice, composeTouchDeviceOfRow(rowDevice({ id: 900000003, name: 'Second Projector' })));
  assert.deepEqual(shared.ProtocolList.Protocols.map((p) => p['Id-']), [2, 900000002]);
  assert.throws(() => withTouchDevice(twice, composeTouchDeviceOfRow(rowDevice({ id: 900000003, name: 'Second Projector', family: 'Sony 20 Bit' }))), /already listed with another definition/);
  const mapTaken = { ...docs, MapList: { ButtonMaps: [...docs.MapList!.ButtonMaps, { __type: 'DeviceButtonMap', ButtonMapIdentifier: '16417Device900000001', Buttons: [], Sequences: [] }] } };
  assert.throws(() => withTouchDevice(mapTaken as SyncDocuments, composeTouchDeviceOfRow(rowDevice())), /already holds a map/);
});

test('the inverse refuses a device of theirs and one an activity names, the control: it never leaves a reference dangling', () => {
  const docs = documents();
  assert.throws(() => withoutTouchDevice(docs, 83000001), /not one of ours/);
  assert.throws(() => withoutTouchDevice(docs, 900000001), /is not listed/);
  const added = { ...docs, ...withTouchDevice(docs, composeTouchDeviceOfRow(rowDevice())) };
  const named = {
    ...added,
    ActivityList: { Activities: [{ ...docs.ActivityList!.Activities[0]!, Roles: [...docs.ActivityList!.Activities[0]!.Roles!, { __type: 'VolumeActivityRole', 'DeviceId-': 900000001 }] }] },
  };
  assert.throws(() => withoutTouchDevice(named as SyncDocuments, 900000001), /an activity names device 900000001/);
});

test('the identifiers of ours are nine digits from 900000000, given as a number or as digits', () => {
  assert.deepEqual(OWN_IDS, { first: 900000000, last: 999999999 });
  assert.deepEqual([900000000, '900000001', 999999999, 899999999, 1000000000, 83968654, '9e8', 900000000.5].map(isOwnId),
    [true, true, true, false, false, false, false, false]);
  assert.ok(OWN_IDS.last < 2 ** 31);
});

test('on the recorded full sync\'s documents: added, the set passes the gate\'s check and reads the device; taken out, the three are as before', lab.skipUnless(FULL), () => {
  const docs = documentsOfAnswers(answersOf(FULL));
  const added = { ...docs, ...withTouchDevice(docs, composeTouchDeviceOfRow(rowDevice())) };
  assert.deepEqual(refusalsBeforeASync(added), []);
  const read = readConfiguration(added);
  assert.equal(read.devices.length, docs.DeviceList!.DevicesWithFeatures.length + 1);
  const d = read.devices.find((x) => x.id === '900000001')!;
  assert.equal(d.commands.filter((x) => x.protocol !== undefined && typeof x.keyCode === 'string').length, 4);
  assert.equal(d.map?.reachable, true);
  // The check finds on the added set what it finds on the documents as they came: the same findings of the
  // same buttons, the maps after the inserted one counted one place later.
  const findings = (c: typeof read) => checkConfiguration(c).map((f) => `${f.rule} ${f.document} ${f.path.replace(/^ButtonMaps\[\d+\]/, 'ButtonMaps[]')}`);
  assert.deepEqual(findings(read), findings(readConfiguration(docs)));
  assert.equal(findings(read).length, 4);
  const back = withoutTouchDevice(added, 900000001);
  assert.deepEqual(back, { DeviceList: docs.DeviceList, MapList: docs.MapList, ProtocolList: docs.ProtocolList });
});
