/**
 * The Harmony Touch reader's rules and its check, over synthetic documents: one clean configuration that
 * the check finds nothing in, and the same configuration broken once per rule, each break found by exactly
 * that rule and no other.
 *
 * **Why synthetic.** The recordings, `touch-reader.test.ts`, hold Logitech's documents as they arrive, and
 * those break two of the rules at most; the other rules are the reference's reading of the remote's program
 * and no document measured breaks them. So each is exercised here on documents built for it, in the shape
 * the recordings have, with invented names and numbers and no account's data. What the remote does with each
 * is the reference's, `reference/architectures/harmony-touch/devices-and-infrared.md`,
 * `activities-and-buttons.md` and `favourites-and-settings.md`, whose sections the rules in `src/harmony-touch/`
 * cite; this file checks that the code does what those sections say, not that the remote does.
 *
 * **The shape of each assertion.** A break is asserted as the whole of `findingsByRule`, so a rule that also
 * fires somewhere it should not, or a break that trips a second rule, fails as loudly as a rule that does not
 * fire. The clean configuration is the control for all of them: the check finds nothing there.
 *
 * No lab is needed and none is read.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TOP_LEVEL_LISTS, checkConfiguration, findingsByRule, refusalsBeforeASync } from '../src/harmony-touch/check.ts';
import { documentKeyOf, documentsOfAnswers, kindOf, type SyncDocuments } from '../src/harmony-touch/documents.ts';
import { DEFAULT_PRESS_REPEATS, FIRMWARE_SETTINGS, mapIdentifier, numberPadKey, readConfiguration, readSettings, stationLogo, uploadedLogo } from '../src/harmony-touch/read.ts';

// The documents are JSON; the synthetic ones are built and broken as such.
type Json = any;

/** A made up two cell family of eight bits, in the shape of a catalogue definition. */
function protocol(): Json {
  const atom = (Type: number, Value: number) => ({ Type, Value, MinValue: null, MaxValue: null });
  return {
    __type: 'IrProtocol', 'Id-': 900, Name: 'Synthetic 8 Bit', CarrierFrequency: 38000, Attributes: [], Flags: [],
    HoldDelay: null, HoldMinimumRepeats: null, PressMinimumRepeats: 2, ControlSection: null,
    IRSegments: [{
      Name: 'Synthetic 8 Bit', Header: [atom(1, 9000), atom(0, 4500)], Trailer: [atom(1, 560)], TotalLength: 108000,
      Payload: { EncodingType: 0, NumberOfBits: 8, ToggleBit: null, Encodings: [{ BitType: 0, Atoms: [atom(1, 560), atom(0, 560)] }, { BitType: 1, Atoms: [atom(1, 560), atom(0, 1690)] }] },
    }],
    CodeSegments: [],
    KeyCode: { Start: null, Repeat: [{ SegmentName: 'Synthetic 8 Bit', SegmentType: 1 }], Finish: null },
  };
}

const command = (Name: string, value: string): Json => ({
  Name, KeyCode: `G:Synthetic 8 Bit:()(0x${value})():3`, ProtocolId: 900, TransportType: 1, Raw: null, IsLearned: false, 'FunctionId-': 0,
});

const device = (id: number, inputs: string[]): Json => ({
  Device: {
    'Id-': id, Name: `Device ${id}`, Manufacturer: 'Synthetic', Model: `M${id}`, DeviceType: 1, Transport: 1, ControlPort: 0,
    PressMinRepeats: null, InterKeyDelay: 100, InterDeviceDelay: 0, ContentProfileKey: id * 10, DeviceProfileUri: `profile/device/${id}`,
  },
  DeviceFeatures: [
    { __type: 'PowerFeature', PowerTypeId: 1, PowerOnDelay: 500, ConnectedAppPowerOnDelay: 0, IsPowerAlwaysOn: false, IsPoweredOnBetweenActivities: false,
      PowerOnActions: [{ __type: 'IRPressAction', Order: 0, Duration: null, IRCommandName: 'PowerOn' }], PowerOffActions: [], PowerToggleActions: [] },
    { __type: 'InputFeature', InputDelay: 200, Inputs: inputs.map((InputName, InputOrder) => ({ InputName, InputOrder, IsOnline: false, Actions: [] })) },
    { __type: 'ChannelTuningFeature', FixedDigits: null, StartActions: [], GreaterTenActions: [], GreaterHundredActions: [],
      FinishActions: [{ __type: 'IRPressAction', Order: 0, Duration: null, IRCommandName: 'OK' }] },
  ],
  Commands: [command('PowerOn', '01'), command('Mute', '02'), command('OK', '03'), command('Clear', '04'), ...'0123456789'.split('').map((d) => command(d, `1${d}`))],
});

const commandAction = (deviceId: number, CommandName: string): Json => ({ __type: 'ButtonCommandAction', EventType: 0, Id: 0, Order: 0, CommandName, 'DeviceId-': deviceId, 'FunctionId-': 0 });
const key = (ButtonKey: string, action: Json): Json => ({ __type: 'HardRemoteButton', ButtonKey, ButtonAction: action, ButtonLongPressAction: null, ButtonDoublePressAction: null, ButtonState: 0, FunctionGroupType: 0 });
const entry = (index: number, action: Json, group = 0): Json => ({
  __type: 'SoftRemoteButton', ButtonAction: action, ButtonLongPressAction: null, ButtonDoublePressAction: null, ButtonState: 0,
  FunctionGroupType: group, MenuItem: { IndexInMenu: index, MenuName: '' }, TextOnRemote: action.CommandName ?? '',
});

/** Two devices, one activity using both, a map each, favourites on the first device, every setting row. */
function clean(): Json {
  return {
    ProtocolList: { Protocols: [protocol()] },
    DeviceList: { DevicesWithFeatures: [device(1, ['HDMI 1', 'HDMI 2']), device(2, ['TV'])] },
    MapList: {
      ButtonMaps: [
        { __type: 'DeviceButtonMap', ButtonMapIdentifier: mapIdentifier('device', '1'), 'DeviceId-': 1, Sequences: null,
          Buttons: [key('VolumeMute', commandAction(1, 'mute')), entry(0, commandAction(1, 'Mute')), entry(0, commandAction(1, '7'), 2)] },
        { __type: 'DeviceButtonMap', ButtonMapIdentifier: mapIdentifier('device', '2'), 'DeviceId-': 2, Sequences: null,
          Buttons: [key('VolumeMute', commandAction(2, 'Mute'))] },
        { __type: 'ActivityButtonMap', ButtonMapIdentifier: mapIdentifier('activity', '7'), 'ActivityId-': 7,
          Sequences: [{ SequenceId: 3, Name: 'Both', Actions: [
            { ...commandAction(1, 'Mute'), Order: 2 },
            { __type: 'ButtonDelayAction', EventType: 0, Id: 0, Order: 1, Duration: 2 },
          ] }],
          Buttons: [
            key('VolumeMute', commandAction(2, 'Mute')),
            { ...key('Red', null), ButtonAction: null, ButtonLongPressAction: commandAction(1, 'Mute') },
            entry(0, { __type: 'ButtonSequenceAction', EventType: 0, Id: 0, Order: 0, SequenceId: 3 }),
          ] },
      ],
    },
    ActivityList: {
      Activities: [{
        'Id-': 7, Name: 'Watch', Type: 1, ActivityGroup: 1, ActivityOrder: 0, IsTuningDefault: true, StartScreen: 'Favorites', DefaultChannel: null, Zones: null,
        Roles: [
          { __type: 'DisplayActivityRole', 'DeviceId-': 2, PowerOnOrder: 1, PowerOffOrder: 2, NextDevicePowerOnDelay: null, SelectedInput: { Name: 'TV', ChannelNumber: null } },
          { __type: 'ChannelChangingActivityRole', 'DeviceId-': 1, PowerOnOrder: 0, PowerOffOrder: 1, NextDevicePowerOnDelay: null, SelectedInput: { Name: 'HDMI 1', ChannelNumber: null } },
          { __type: 'VolumeActivityRole', 'DeviceId-': 1, PowerOnOrder: 0, PowerOffOrder: 1, NextDevicePowerOnDelay: null, SelectedInput: { Name: 'HDMI 1', ChannelNumber: null } },
        ],
        EnterActions: [
          { __type: 'DelayActivityAction', ActionOrder: 5, Id: 0, Duration: 2 },
          { __type: 'CommandActivityAction', ActionOrder: 4, Id: 0, CommandName: 'OK', 'DeviceId-': 1, TargetLevel: null },
        ],
        LeaveActions: [],
      }],
    },
    Context: { 'AccountId-': 1, HouseholdUserProfileUri: 'profile/user/1', Language: 'en-GB', Email: null, InstallerId: null, CountryCode: 'GB', SetupSession: { Type: 0, SetupType: null } },
    Settings: {
      RemoteName: '', UserImageBucketUri: 'images/', DefaultImageBucketUri: 'defaults/',
      Settings: [
        { Name: 'ScreenBrightness', SettingId: 1, Values: [], DefaultValue: '50', MinCount: 1, MaxCount: 1 },
        { Name: 'KeyBrightness', SettingId: 2, Values: ['60'], DefaultValue: null, MinCount: 1, MaxCount: 1 },
        { Name: 'EditLock', SettingId: 3, Values: [], DefaultValue: 'true', MinCount: 1, MaxCount: 1 },
        { Name: 'TwelveHourClock', SettingId: 4, Values: ['false'], DefaultValue: 'true', MinCount: 1, MaxCount: 1 },
      ],
    },
    // The favourites documents, at the addresses the remote builds from the documents above.
    'content://1.0/user;profile/user/1': { id: 'u', preferences: { 10: { '{antenna}': { stations: [] }, svc: { stations: [{ id: 's2' }, { id: 's1' }, { id: 's9' }] } } } },
    'content://1.0/device;profile/device/1': { id: 'd', services: { svc: { dialPositions: [
      { station: 's1', number: '12', name: 'One', added: false },
      { station: 's9', number: '99', name: 'Mine', added: true, image: 'mine.png' },
    ] } } },
    'content://1.0/service/svc': { id: 'svc', channels: [{ number: '12', station: { id: 's1', shortName: 'ONE' } }, { number: '5', station: { id: 's2', shortName: 'TWO' } }] },
  };
}

const check = (documents: Json) => findingsByRule(checkConfiguration(readConfiguration(documents as SyncDocuments)));
/** The clean configuration with one change made to a copy of it. */
const broken = (change: (d: Json) => void): Json => { const d = structuredClone(clean()); change(d); return d; };
const firstDevice = (d: Json): Json => d.DeviceList.DevicesWithFeatures[0];
const activity = (d: Json): Json => d.ActivityList.Activities[0];

test('the clean synthetic configuration reads whole and the check finds nothing in it', () => {
  const c = readConfiguration(clean());
  assert.deepEqual(c.absent, []);
  assert.equal(c.devices.length, 2);
  assert.equal(c.devices.every((d) => d.map !== undefined), true);
  assert.equal(c.activities[0]!.map?.kind, 'activity');
  assert.equal(c.devices.flatMap((d) => d.commands).every((x) => x.protocol !== undefined && x.code !== undefined && x.segments !== undefined), true);
  assert.deepEqual(check(clean()), {});
});

test('a device without a field the engine requires is reported, one finding per field', () => {
  assert.deepEqual(check(broken((d) => { delete firstDevice(d).Device.Manufacturer; })), { 'required field': 1 });
  assert.deepEqual(check(broken((d) => { delete firstDevice(d).Device.DeviceType; delete firstDevice(d).Device.Transport; })), { 'required field': 2 });
  assert.deepEqual(check(broken((d) => { delete firstDevice(d).Device.PressMinRepeats; })), { 'required field': 1 });
  // Only when infrared is sent: a device with no infrared command needs neither. The stand in is a device
  // with no command at all, which sends nothing by any transport; a `TransportType` other than 1 would not
  // do, since the engine sends over infrared every number that is not one of three the reference leaves
  // unnamed. The device gets a map of its own, so that the only thing it could be found for is the two fields.
  assert.deepEqual(check(broken((d) => {
    const silent = { ...device(3, []), Commands: [] };
    delete silent.Device.PressMinRepeats;
    delete silent.Device.InterDeviceDelay;
    d.DeviceList.DevicesWithFeatures.push(silent);
    d.MapList.ButtonMaps.push({ __type: 'DeviceButtonMap', ButtonMapIdentifier: mapIdentifier('device', '3'), 'DeviceId-': 3, Sequences: null, Buttons: [] });
  })), {});
});

test('a command without TransportType or without a Raw key is reported; a null Raw is not', () => {
  assert.deepEqual(check(broken((d) => { delete firstDevice(d).Commands[0].TransportType; })), { 'required field': 1 });
  assert.deepEqual(check(broken((d) => { delete firstDevice(d).Commands[0].Raw; })), { 'required field': 1 });
  assert.equal(clean().DeviceList.DevicesWithFeatures[0].Commands[0].Raw, null);
});

test('a command without a KeyCode key is reported, and so is one naming no listed protocol', () => {
  assert.deepEqual(check(broken((d) => { delete firstDevice(d).Commands[1].KeyCode; })), { 'no key code': 1 });
  assert.deepEqual(check(broken((d) => { firstDevice(d).Commands[1].ProtocolId = 901; })), { 'no protocol': 1 });
  // A learned raw code is built from its own text and names no family it needs.
  assert.deepEqual(check(broken((d) => { Object.assign(firstDevice(d).Commands[1], { ProtocolId: 901, Raw: 'F9470P0230S0230' }); })), {});
});

test('of two commands whose names differ only in case the reader takes the later, and the earlier is reported', () => {
  const d = broken((x) => { firstDevice(x).Commands.push(command('MUTE', '7F')); });
  const c = readConfiguration(d);
  assert.equal(c.devices[0]!.commandsByName.get('mute')!.name, 'MUTE');
  // The key that names `mute` reaches the later command.
  assert.equal(c.devices[0]!.map!.keys[0]!.press!.command!.name, 'MUTE');
  assert.deepEqual(check(d), { 'commands differ in case': 1 });
});

test('a map whose identifier the engine builds for no device or activity is reported unreachable, with the prefix or without it', () => {
  for (const identifier of ['Device1', '16420Device1', '16417device1', '16417Device9', '16417Activity1']) {
    const d = broken((x) => { x.MapList.ButtonMaps[0].ButtonMapIdentifier = identifier; });
    const c = readConfiguration(d);
    assert.equal(c.maps[0]!.reachable, false, identifier.replace(/\d+$/, ''));
    // And device 1, whose map that was, now has none, which is found as well.
    assert.equal(c.devices[0]!.map, undefined, 'and the device has no map the engine finds');
    assert.deepEqual(check(d), { 'map identifier': 1, 'no map': 1 }, identifier.replace(/\d+$/, ''));
  }
});

test('a map is found by its identifier alone: its own DeviceId- decides nothing', () => {
  // The identifier of another device: the map is reached, as that device's, and device 1 is left with none.
  const other = broken((x) => { x.MapList.ButtonMaps[0].ButtonMapIdentifier = mapIdentifier('device', '2'); });
  const c = readConfiguration(other);
  assert.deepEqual(c.maps[0]!.owner, { kind: 'device', id: '2' });
  assert.equal(c.maps[0]!.statedOwnerId, '1', 'the field still says 1, and is not what decides');
  assert.equal(c.devices[0]!.map, undefined);
  assert.deepEqual(check(other), { 'no map': 1 });
  // The field changed and the identifier left alone: nothing changes for the engine.
  const stated = broken((x) => { x.MapList.ButtonMaps[0]['DeviceId-'] = 9; });
  assert.equal(readConfiguration(stated).devices[0]!.map?.path, 'ButtonMaps[0]');
  assert.deepEqual(check(stated), {});
});

test('a device or an activity with no map under its identifier is found, the device in the device list and the activity in the activity list', () => {
  const device = check(broken((x) => { x.MapList.ButtonMaps.splice(1, 1); }));
  assert.deepEqual(device, { 'no map': 1 });
  const where = (d: Json) => checkConfiguration(readConfiguration(d)).map((f) => [f.document, f.path]);
  assert.deepEqual(where(broken((x) => { x.MapList.ButtonMaps.splice(1, 1); })), [['DeviceList', 'DevicesWithFeatures[1]']]);
  assert.deepEqual(where(broken((x) => { x.MapList.ButtonMaps.splice(2, 1); })), [['ActivityList', 'Activities[0]']]);
});

test('of two screen entries on one index the later is kept and the earlier reported; the number pad\'s own index does not count', () => {
  const d = broken((x) => { x.MapList.ButtonMaps[0].Buttons.push(entry(0, commandAction(1, 'OK'))); });
  const map = readConfiguration(d).maps[0]!;
  assert.equal(map.entries.get(0)!.press!.commandName, 'OK');
  assert.equal(map.shadowed.length, 1);
  assert.equal(map.shadowed[0]!.press!.commandName, 'Mute');
  assert.deepEqual(check(d), { 'repeated screen index': 1 });
  // The clean map already holds a number pad entry on index 0 beside the list's, which is not a repeat.
  assert.equal(readConfiguration(clean()).maps[0]!.numberPad.length, 1);
});

test('a number pad entry is placed by its command\'s name, and one placed on no key is reported unless deleted', () => {
  assert.deepEqual([numberPadKey('7'), numberPadKey('NumberPlus'), numberPadKey('ENT'), numberPadKey('Clear')], ['7', 'left of 0', 'right of 0', undefined]);
  assert.deepEqual(check(broken((x) => { x.MapList.ButtonMaps[0].Buttons.push(entry(1, commandAction(1, 'Clear'), 2)); })), { 'number pad entry on no key': 1 });
  assert.deepEqual(check(broken((x) => { x.MapList.ButtonMaps[0].Buttons.push({ ...entry(1, commandAction(1, 'Clear'), 2), ButtonState: 4 }); })), {});
});

test('an action naming a device or a command that does not exist is reported, in a map, a sequence and an activity\'s steps', () => {
  assert.deepEqual(check(broken((x) => { x.MapList.ButtonMaps[1].Buttons[0].ButtonAction['DeviceId-'] = 3; })), { 'action device missing': 1 });
  assert.deepEqual(check(broken((x) => { x.MapList.ButtonMaps[1].Buttons[0].ButtonAction.CommandName = 'Nothing'; })), { 'action command missing': 1 });
  assert.deepEqual(check(broken((x) => { x.MapList.ButtonMaps[2].Sequences[0].Actions[0].CommandName = 'Nothing'; })), { 'action command missing': 1 });
  assert.deepEqual(check(broken((x) => { activity(x).EnterActions[1]['DeviceId-'] = 3; })), { 'action device missing': 1 });
});

test('a sequence step without Order, an activity step without ActionOrder and an activity without ActivityGroup are reported', () => {
  assert.deepEqual(check(broken((x) => { delete x.MapList.ButtonMaps[2].Sequences[0].Actions[1].Order; })), { 'required field': 1 });
  assert.deepEqual(check(broken((x) => { delete activity(x).EnterActions[0].ActionOrder; })), { 'required field': 1 });
  assert.deepEqual(check(broken((x) => { delete activity(x).ActivityGroup; })), { 'required field': 1 });
});

test('an input that is not the device\'s is reported, and only for the first role of a device, the one the reference says makes the input step', () => {
  assert.deepEqual(check(broken((x) => { activity(x).Roles[0].SelectedInput.Name = 'HDMI 9'; })), { 'unknown input': 1 });
  // The second role of device 1 makes no input step of its own, so its input is not the one sent.
  assert.deepEqual(check(broken((x) => { activity(x).Roles[2].SelectedInput.Name = 'HDMI 9'; })), {});
});

test('two devices of an activity on one power order are reported', () => {
  assert.deepEqual(check(broken((x) => { activity(x).Roles[0].PowerOnOrder = 0; })), { 'shared power order': 1 });
  assert.deepEqual(check(broken((x) => { activity(x).Roles[0].PowerOffOrder = 1; })), { 'shared power order': 1 });
});

test('a power off order is every role\'s and a power on order only the first role\'s', () => {
  // Device 1's second role moves its power off onto device 2's number: every role's power off is
  // recorded, so the two devices collide there.
  assert.deepEqual(check(broken((x) => { activity(x).Roles[2].PowerOffOrder = 2; })), { 'shared power order': 1 });
  // The same move for power on is no collision: only device 1's first role makes its power on step.
  assert.deepEqual(check(broken((x) => { activity(x).Roles[2].PowerOnOrder = 1; })), {});
  // And two roles of one device on one number, as the clean configuration has, are one step and not two.
  assert.deepEqual(check(clean()), {});
});

test('two shown activities on one ActivityOrder are reported with the earlier named, and a negative order reads as hidden', () => {
  const twin = (order: number) => (x: Json): void => {
    x.ActivityList.Activities.push({ ...structuredClone(activity(x)), 'Id-': 8, IsTuningDefault: false, ActivityOrder: order });
    // With a map of its own, so that the order is the only thing it could be found for.
    x.MapList.ButtonMaps.push({ ...structuredClone(x.MapList.ButtonMaps[2]), ButtonMapIdentifier: mapIdentifier('activity', '8'), 'ActivityId-': 8 });
  };
  const d = broken(twin(0));
  assert.deepEqual(check(d), { 'shared activity order': 1 });
  // The earlier of the two is the one not shown.
  assert.equal(checkConfiguration(readConfiguration(d))[0]!.path, 'Activities[0]');
  const hidden = readConfiguration(broken(twin(-1)));
  assert.deepEqual(hidden.activities.map((a) => a.hidden), [false, true]);
  assert.deepEqual(check(broken(twin(-1))), {});
});

test('the activity view: devices in power on order by their first role, steps in ActionOrder, delays in milliseconds', () => {
  const a = readConfiguration(clean()).activities[0]!;
  assert.deepEqual(a.devices.map((d) => [d.deviceId, d.kinds]), [['1', ['ChannelChangingActivityRole', 'VolumeActivityRole']], ['2', ['DisplayActivityRole']]]);
  assert.deepEqual(a.enter.map((s) => [s.order, s.kind]), [[4, 'command'], [5, 'delay']]);
  assert.equal(a.enter[1]!.durationMs, 2000);
  const sequence = a.map!.sequences[0]!;
  assert.deepEqual(sequence.steps.map((s) => [s.order, s.kind, s.durationMs]), [[1, 'delay', 2000], [2, 'command', undefined]]);
});

test('a button holding only a long press reads it as its press; a device with no repeat count reads as three repeats', () => {
  const c = readConfiguration(clean());
  const red = c.activities[0]!.map!.keys.find((k) => k.key === 'Red')!;
  assert.equal(red.press?.commandName, 'Mute');
  assert.equal(red.longPress, undefined);
  assert.equal(c.devices[0]!.pressRepeats, DEFAULT_PRESS_REPEATS);
  assert.equal(readConfiguration(broken((x) => { firstDevice(x).Device.PressMinRepeats = -1; })).devices[0]!.pressRepeats, 3);
  assert.equal(readConfiguration(broken((x) => { firstDevice(x).Device.PressMinRepeats = 5; })).devices[0]!.pressRepeats, 5);
});

test('the carrier is rounded by the reading of the engine\'s conversion and truncated as a compiled configuration states it', () => {
  // The rounding is inferred from the decoded routine, `devices-and-infrared.md`, and not measured on the lamp.
  const p = readConfiguration(clean()).protocols[0]!;
  assert.equal(p.periodNs, 26316);
  assert.equal(p.compiledPeriodNs, 26315);
  // At an exact half the addition the routine makes goes to the even neighbour, and rounding half up would
  // not: 25600 Hz is 39062.5 nanoseconds. The control is the other rule giving the other answer.
  const tie = readConfiguration(broken((x) => { x.ProtocolList.Protocols[0].CarrierFrequency = 25600; })).protocols[0]!;
  assert.equal(tie.periodNs, 39062);
  assert.equal(Math.round(1e9 / 25600), 39063);
  assert.equal(readConfiguration(broken((x) => { x.ProtocolList.Protocols[0].CarrierFrequency = 38400; })).protocols[0]!.periodNs, 26042);
});

test('a value is read at the width of the segment it names, where the family\'s name says another', () => {
  // `Synthetic 8 Bit`'s segment states 12: the Touch pads each value to its segment's `NumberOfBits`.
  const wide = broken((x) => { x.ProtocolList.Protocols[0].IRSegments[0].Payload.NumberOfBits = 12; });
  const widths = readConfiguration(wide).devices[0]!.commands.map((c) => c.code?.frames[0]?.bits);
  assert.equal(widths.length, 14);
  assert.equal(widths.every((bits) => bits === 12), true);
  // The control: the clean family's segment and name agree on 8.
  assert.equal(readConfiguration(clean()).devices[0]!.commands.every((c) => c.code?.frames[0]?.bits === 8), true);
  // And narrower than the name: 4 bits, read at 4, the value left as the code writes it.
  const narrow = readConfiguration(broken((x) => { x.ProtocolList.Protocols[0].IRSegments[0].Payload.NumberOfBits = 4; }));
  const mute = narrow.devices[0]!.commandsByName.get('mute')!.code!.frames[0]!;
  assert.deepEqual([mute.bits, mute.value], [4, 2n]);
});

test('favourites: the user document\'s order, the antenna service skipped, the line up filling what a dial position leaves out', () => {
  const [f] = readConfiguration(clean()).favourites;
  assert.equal(f!.serviceId, 'svc');
  assert.deepEqual(f!.missing, []);
  assert.deepEqual(f!.favourites.map((x) => [x.station, x.number, x.name, x.added, x.logo]), [
    // No dial position: everything from the line up.
    ['s2', '5', 'TWO', false, stationLogo('s2')],
    // A dial position: its own number and name, the station's logo.
    ['s1', '12', 'One', false, stationLogo('s1')],
    // Added by hand, with an uploaded picture: from the dial position alone.
    ['s9', '99', 'Mine', true, uploadedLogo('mine.png')],
  ]);
  assert.equal(f!.tuning?.finish[0]?.commandName, 'OK');
});

test('favourites need the household user profile, and a missing document is named rather than guessed', () => {
  assert.equal(readConfiguration(broken((x) => { x.Context.HouseholdUserProfileUri = null; })).favourites.length, 0);
  const [f] = readConfiguration(broken((x) => { delete x['content://1.0/service/svc']; })).favourites;
  assert.deepEqual(f!.missing, ['content://1.0/service/svc']);
  assert.equal(f!.favourites[0]!.number, undefined, 'a station with no dial position has no number without the line up');
});

test('a favourite\'s number holding anything but digits, - and . is reported for an infrared device, named by its place', () => {
  const dial = broken((x) => { x['content://1.0/device;profile/device/1'].services.svc.dialPositions[0].number = '12A'; });
  assert.deepEqual(check(dial), { 'favourite number': 1 });
  // The place and the kind of document, never the document's address, which is built from the account's
  // own identifiers; the service's key is written `*`.
  const [finding] = checkConfiguration(readConfiguration(dial));
  assert.deepEqual([finding!.document, finding!.path], ['ContentDevice', 'services.*.dialPositions[0].number']);
  // A number the line up filled in is named in the line up.
  const lineUp = broken((x) => { x['content://1.0/service/svc'].channels[1].number = '5A'; });
  assert.deepEqual(checkConfiguration(readConfiguration(lineUp)).map((f) => [f.rule, f.document, f.path]), [['favourite number', 'ContentService', 'channels[1].number']]);
  assert.deepEqual(check(broken((x) => { x['content://1.0/device;profile/device/1'].services.svc.dialPositions[0].number = '12.1-2'; })), {});
});

test('a dial position\'s picture that is null or empty is none, and the station\'s logo applies', () => {
  for (const image of [null, '']) {
    const [f] = readConfiguration(broken((x) => {
      x['content://1.0/device;profile/device/1'].services.svc.dialPositions[0].image = image;
    })).favourites;
    assert.equal(f!.favourites[1]!.logo, stationLogo('s1'));
  }
});

test('settings: a number ignores the row\'s default, a yes or no takes it, and a missing row is the firmware\'s', () => {
  const s = readSettings(clean().Settings);
  assert.deepEqual(s.screenBrightness, { value: FIRMWARE_SETTINGS.ScreenBrightness, from: 'firmware' });
  assert.deepEqual(s.keyBrightness, { value: 60, from: 'account' });
  assert.deepEqual(s.editLock, { value: true, from: 'row default' });
  assert.deepEqual(s.twelveHourClock, { value: false, from: 'account' });
  assert.deepEqual(s.screenTimeout, { value: FIRMWARE_SETTINGS.ScreenTimeout, from: 'firmware' });
  assert.deepEqual(s.motionSensor, { value: true, from: 'firmware' });
  assert.deepEqual(s.screenLock, { value: false, from: 'firmware' });
  assert.deepEqual(s.vibrationEffect, { value: '13', from: 'firmware' });
  assert.deepEqual(s.background, { value: undefined, from: 'firmware' });
});

test('the answers of a sync become documents: harmony addresses by their last segment, content addresses whole, pictures left out', () => {
  const d = documentsOfAnswers([
    { uri: 'harmony://Account/1/Remote/2/Settings?etag=x', resource: { a: 1 } },
    { uri: 'content://1.0/user;profile', resource: { b: 2 } },
    { uri: 'content-image://1.0/station/s/image;maxX=54;maxY=54;type=png', resource: 'iVBOR' },
    { uri: 'https://example.invalid/UserImages/x.png', resource: 'iVBOR' },
    { uri: 'proxy://Finished' },
  ]);
  assert.deepEqual(Object.keys(d).sort(), ['Settings', 'content://1.0/user;profile']);
  assert.equal(kindOf({ __type: 'ChannelChangingActivityRole:#Logitech.Harmony' }), 'ChannelChangingActivityRole');
  assert.equal(kindOf({ __type: 'Logitech.Harmony.IRPressAction, Logitech.Harmony.Data' }), 'IRPressAction');
});

test('the answers keep an address ending in __proto__ as a key, never as the prototype', () => {
  const d = documentsOfAnswers([
    { uri: 'harmony://Account/1/__proto__', resource: { DeviceList: 'not a document' } },
    { uri: 'harmony://Account/1/Remote/2/Settings', resource: { a: 1 } },
  ]);
  assert.equal(Object.getPrototypeOf(d), null);
  assert.deepEqual(Object.keys(d).sort(), ['Settings', '__proto__']);
  // Nothing reads through the planted object: the device list is still absent.
  assert.equal(d.DeviceList, undefined);
  assert.equal(readConfiguration(d).absent.includes('DeviceList'), true);
});

test('a malformed document reads without throwing: a device without its record, a command without a name, a null button and a null step', () => {
  // A device entry without its record reads as one stating nothing, and the check names the fields.
  const bare = broken((x) => { delete firstDevice(x).Device; });
  assert.doesNotThrow(() => checkConfiguration(readConfiguration(bare)));
  assert.equal(readConfiguration(bare).devices[0]!.id, '');
  assert.equal(check(bare)['required field'], 5, 'the three fields the engine requires and the two infrared needs');
  // A command without a name is kept under none, so nothing reaches it, and the buttons naming it find nothing.
  const nameless = broken((x) => { delete firstDevice(x).Commands[1].Name; });
  const c = readConfiguration(nameless);
  assert.equal(c.devices[0]!.commands.length, 14);
  assert.equal(c.devices[0]!.commands[1]!.name, undefined);
  assert.equal(c.devices[0]!.commandsByName.has('mute'), false);
  assert.deepEqual(check(nameless), { 'action command missing': 4 });
  // A null button is skipped where it stands, and the paths after it still name their own entry.
  const button = broken((x) => { x.MapList.ButtonMaps[0].Buttons.splice(1, 0, null); });
  const map = readConfiguration(button).maps[0]!;
  assert.deepEqual(map.buttons.map((b) => b.path), ['ButtonMaps[0].Buttons[0]', 'ButtonMaps[0].Buttons[2]', 'ButtonMaps[0].Buttons[3]']);
  assert.deepEqual(check(button), {});
  // A null sequence step is skipped too, and the steps still sort by their order.
  const step = broken((x) => { x.MapList.ButtonMaps[2].Sequences[0].Actions.splice(1, 0, null); });
  const sequence = readConfiguration(step).activities[0]!.map!.sequences[0]!;
  assert.deepEqual(sequence.steps.map((s) => [s.order, s.path]), [[1, 'ButtonMaps[2].Sequences[0].Actions[2]'], [2, 'ButtonMaps[2].Sequences[0].Actions[0]']]);
  assert.deepEqual(check(step), {});
});

test('an empty sync reads as empty and names all six documents absent', () => {
  const c = readConfiguration({});
  assert.deepEqual(c.absent, ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList']);
  assert.deepEqual(checkConfiguration(c), []);
});

// ---------------------------------------------------------------------------------------------------
// The gate before a write, `todo-touch.md` 6.6
// ---------------------------------------------------------------------------------------------------

/** The gate's verdict on a set, by rule, the shape every assertion below compares whole. */
const gate = (documents: Json) => findingsByRule(refusalsBeforeASync(documents as SyncDocuments));

test('the gate passes the clean set, which is the control for every refusal below', () => {
  assert.deepEqual(refusalsBeforeASync(clean()), []);
});

test('the gate refuses a set missing each top level list the engine walks, absent or null, and names that one list', () => {
  // Named here as literals, so the table cannot lose a list with the suite still passing.
  assert.deepEqual(TOP_LEVEL_LISTS, {
    ActivityList: 'Activities', DeviceList: 'DevicesWithFeatures', MapList: 'ButtonMaps', ProtocolList: 'Protocols', Settings: 'Settings',
  });
  for (const [document, list] of Object.entries(TOP_LEVEL_LISTS)) {
    for (const how of ['absent', 'null', 'a string'] as const) {
      const set = broken((x) => {
        if (how === 'absent') delete x[document][list];
        else x[document][list] = how === 'null' ? null : 'not a list';
      });
      const found = refusalsBeforeASync(set);
      assert.deepEqual(found.map((f) => [f.rule, f.effect, f.document, f.path]), [['missing list', 'refused', document, list]], `${document}.${list} ${how}`);
      // The same finding from the check itself, so a caller of the check alone is told too. Not for a string,
      // which the view does not read as a list, and which only the gate meets, before the view is built.
      if (how !== 'a string') assert.equal(findingsByRule(checkConfiguration(readConfiguration(set)))['missing list'], 1, `${document}.${list} ${how} in the check`);
    }
  }
});

test('the gate refuses a set missing a list the reader walks inside an entry: a device\'s features, a map\'s buttons and a sequence\'s steps', () => {
  assert.deepEqual(refusalsBeforeASync(broken((x) => { delete firstDevice(x).DeviceFeatures; })).map((f) => f.path), ['DevicesWithFeatures[0].DeviceFeatures']);
  assert.deepEqual(refusalsBeforeASync(broken((x) => { firstDevice(x).DeviceFeatures = null; })).map((f) => f.path), ['DevicesWithFeatures[0].DeviceFeatures']);
  assert.deepEqual(refusalsBeforeASync(broken((x) => { delete x.MapList.ButtonMaps[1].Buttons; })).map((f) => f.path), ['ButtonMaps[1].Buttons']);
  assert.deepEqual(refusalsBeforeASync(broken((x) => { delete x.MapList.ButtonMaps[2].Sequences[0].Actions; })).map((f) => f.path), ['ButtonMaps[2].Sequences[0].Actions']);
  // The negatives: a null sequence list and a null input list are guarded by the reader, so neither is refused.
  assert.equal(gate(broken((x) => { x.MapList.ButtonMaps[2].Sequences = null; }))['missing list'], undefined);
  assert.deepEqual(gate(broken((x) => { firstDevice(x).DeviceFeatures[1].Inputs = null; })), {});
});

test('the gate refuses a set missing a document, or holding one that is not an object, before it reads anything', () => {
  for (const name of ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList']) {
    assert.deepEqual(gate(broken((x) => { delete x[name]; })), { 'document absent': 1 }, `${name} absent`);
    assert.deepEqual(gate(broken((x) => { x[name] = JSON.stringify(x[name]); })), { 'not a document': 1 }, `${name} as a string`);
    assert.deepEqual(gate(broken((x) => { x[name] = []; })), { 'not a document': 1 }, `${name} as an array`);
  }
});

test('the gate keeps what the check finds refused and passes what it finds ignored', () => {
  // A required field, refused: the device type.
  assert.deepEqual(gate(broken((x) => { delete firstDevice(x).Device.DeviceType; })), { 'required field': 1 });
  // A repeated screen index, ignored, which Logitech's own documents carry: not a refusal.
  const shadowed = broken((x) => { x.MapList.ButtonMaps[0].Buttons.push(entry(0, commandAction(1, 'OK'))); });
  assert.equal(findingsByRule(checkConfiguration(readConfiguration(shadowed)))['repeated screen index'], 1);
  assert.deepEqual(gate(shadowed), {});
});

test('a document is kept by its last segment for a harmony address, whole for a content address, and not at all otherwise', () => {
  assert.equal(documentKeyOf('harmony://Account/1/MapList?excludeFunctionMaps=true'), 'MapList');
  assert.equal(documentKeyOf('harmony://Account/1/Remote/2/Settings'), 'Settings');
  assert.equal(documentKeyOf('content://1.0/service/svc'), 'content://1.0/service/svc');
  assert.equal(documentKeyOf('content-image://1.0/image/x.png;maxX=54;maxY=54'), undefined);
  assert.equal(documentKeyOf('proxy://Finished'), undefined);
});
