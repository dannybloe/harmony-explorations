/**
 * A whole Harmony Touch setup, every device and every activity, composed from a description onto a set with all of
 * them taken out: `src/families/harmony-touch/setup.ts` and the ordered form of a map in `src/families/harmony-touch/compose.ts`,
 *
 * **What has to hold, and why each test is here.**
 *
 * 1. **The base is the four lists emptied and nothing else**: Context, Settings and every other document as they
 *    stand, so the setup composed onto it lands in a set whose account half is the remote's own. 8.5's removal does
 *    not reach that state and is not changed to: it refuses taking out every device, every shown activity and the
 *    favourites' tuning device, `remove.ts`, and those refusals protect a remote. The base is never delivered.
 * 2. **The ordered form writes what either program reads, and only that**, `composeButtons`: a key as
 *    `HardRemoteButton`, a gesture as `GestureRemoteButton`, an entry as `SoftRemoteButton` with its label and
 *    `IndexInMenu`; `ButtonState` 0; the group; a command action with `EventType` 1, 2 or 3 by which press it is,
 *    `Order` 0 and the command's function id under `FunctionId-` where the command states one; a sequence step with
 *    `Order` from 1 and no function id. Why each field is or is not written is the composer's header and the
 *    reference's `activities-and-buttons.md`, "What a writer must carry".
 * 3. **What the remote would drop or do otherwise is refused**, the new refusals of 8.6 each tested: on a button, two
 *    names or none, a group outside the three, a key or gesture twice, a gesture the documents do not use, an entry
 *    without its place, a client action other than the number pad or not on the entry labelled `123`, a label that
 *    acts by itself; on a sequence, a name or id twice, no command, a pause that is not positive, and a button naming
 *    one the map does not hold; on an activity, both map forms, sequences without buttons, the favourites on an
 *    activity with no channel changing role, the Favorites start screen without them, the gesture screen without
 *    gestures, two steps on one order and a channel step that is not digits or on a device with no channel tuning; on
 *    a setup, a base not empty, an id not ours or given twice, two names differing in case, a maker and model the
 *    catalogue does not hold, and a command naming a definition it does not hold.
 * 4. **Describing Logitech's own documents and composing the description gives the same remote**, on the recorded
 *    full sync: every device by name, maker, model, delays, power, inputs and commands; every activity by name, place,
 *    start screen, the favourites, its devices with their roles and inputs, its steps, and every key, gesture, entry and
 *    sequence by what it sends; the favourites found; and the same findings of the check. Ids are ours, so the view
 *    compares by name.
 * 5. **The function id census behind `functionIdOf`'s docstring**, on the same documents: of the button actions
 *    naming a command, 530 name a command stating a number and carry it under `FunctionId-` (485 presses, 41 long
 *    presses, 4 double presses); 88 name a command stating none and carry `FunctionId-` 0 (87 presses, 1 long press);
 *    36 name a command stating none and carry `FunctionId` null without the hyphen; and both sequence steps carry
 *    `FunctionId-` 0 though their commands state 148 and 162. So composing the number where the command has one and
 *    leaving the key out otherwise changes no field the screens read: `FunctionId-` 0, nil and absent are alike to
 *    them, the lab's `notes/6.10-screens-reads.md` and `gesturepad.lua` 121 to 139.
 *
 * **What the setup's rules rest on, read in the firmware** (the lab's `notes/8.6-preflight.md` sections 2 and 3, from
 * the readings named below). The screens offer an activity's start screen by a condition each, and fall back to the
 * command list when it fails: Favorites only on the activity the favourite channels belong to, `IsTuningDefault`, which
 * tunes them through its channel changing role, and the gesture screen only where the map holds gestures; so the
 * composer writes either only where what it needs is. The engine sorts an activity's start and end steps by
 * `ActionOrder`, `orderTableItems`, keeping them in a table by that number, so only the order matters and two steps on
 * one order would be one; a channel step, `ChannelActivityAction`, tunes its digits through a device with channel
 * tuning. The favourites documents' address and key, `DeviceProfileUri` and `ContentProfileKey`, are carried on the
 * tuning device from the catalogue record: in Logitech's documents the key is the device's own id, and under an id of
 * ours it no longer is, but the screens' `favoritesmanager.lua` takes the pair by the device's `Id-` (lines 166 to 192
 * and 195 to 207), so it still finds them. These are readings, held here by the rules they produce and not by the
 * firmware's bytes; the 8.6 run on the bench Touch, `packages/bench/test/harmony-touch/touch-setup-runs.test.ts`, measured a setup built
 * on them: Watch TV, the favourites' activity, and the five favourites through the LG TV under an id of ours, 15 of 15,
 * and Switch Box's start steps, its channel step among them, heard in their order.
 *
 * **Sources checked first.** The 8.6 brief in the lab; `compose.ts` and `touch-activity-add.test.ts`, whose shape the
 * made up documents follow; `remove.ts` and `touch-removal.test.ts` for what the removal refuses; the reference's
 * `activities-and-buttons.md` and `devices-and-infrared.md`; the lab's decompiled engine, `userconfigreader.lua`
 * (`getButtonMaps`, the sequence reader's `type(map.Sequences) == "table"`, `EventType` read at 727 and 768 only), and
 * the screens' `gesturepad.lua`, `favoritesmanager.lua` and `harmony.lua` in the lab's copy of the image, for every
 * field left out. Logitech's client was not consulted: the documents are the remote's, and what is checked is ours.
 *
 * **Width.** One model, the Harmony Touch, firmware 4.15.330; its firmware reports architecture 17 and Logitech's
 * templates file it under 18. Nothing here touches a remote; the full sync's documents are read for names, counts and
 * shapes and nothing of the account in them is printed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { checkConfiguration, refusalsBeforeASync } from '../../../src/families/harmony-touch/check.ts';
import {
  ComposeRefusal, composeButtons, composeTouchActivity, functionIdOf, type OwnActivity, type OwnButton, type OwnSequence,
  type ResolvedCommand,
} from '../../../src/families/harmony-touch/compose.ts';
import { documentsOfAnswers, idText, type SyncDocuments } from '../../../src/families/harmony-touch/documents.ts';
import { readConfiguration, type Configuration, type ReadButtonAction } from '../../../src/families/harmony-touch/read.ts';
import {
  composeTouchSetup, describeTouchSetup, catalogueOfSet, setupBaseOf, type TouchSetup,
} from '../../../src/families/harmony-touch/setup.ts';
import { answersOf, FULL } from './touch-sync.ts';
import { proves } from '@harmony/testkit/proof';

const IDS = { device: 900000101, activity: 900000201, sequence: 900000301 };

/** Made up documents of Logitech's shape: a TV with two inputs, a tuner with channel tuning, one activity, three maps. */
function documents(): SyncDocuments {
  const command = (name: string, functionId?: number) => ({
    Name: name, KeyCode: 'G:Made Up 32 Bit:()(0x0)():3', ProtocolId: 2, TransportType: 1, Raw: null,
    ...(functionId === undefined ? {} : { 'FunctionId-': functionId }),
  });
  const device = (id: number, name: string, commands: [string, number?][], inputs: string[], tuning: boolean) => ({
    Device: { 'Id-': id, Name: name, DeviceType: 1, Manufacturer: 'M', Model: name, Transport: 1, ControlPort: 0, PressMinRepeats: 1, InterKeyDelay: 0, InterDeviceDelay: 0 },
    DeviceFeatures: [
      { __type: 'PowerFeature', 'DeviceId-': id, PowerTypeId: 1, PowerOnDelay: 0, IsPoweredOnBetweenActivities: false, IsPowerAlwaysOn: false, PowerOnActions: [], PowerOffActions: [], PowerToggleActions: [] },
      ...(inputs.length === 0 ? [] : [{
        __type: 'InputFeature', 'DeviceId-': id, InputType: 1, InputDelay: 0,
        Inputs: inputs.map((n, i) => ({ InputName: n, InputOrder: i + 1, ActionSetTypeId: 1, IsActiveInput: true, Actions: [] })),
      }]),
      ...(tuning ? [{ __type: 'ChannelTuningFeature', 'DeviceId-': id, FixedDigits: 0, StartActions: [], GreaterTenActions: [], GreaterHundredActions: [], FinishActions: [] }] : []),
    ],
    Commands: commands.map(([n, f]) => command(n, f)),
  });
  const map = (kind: 'Device' | 'Activity', id: number) => ({ __type: `${kind}ButtonMap`, ButtonMapIdentifier: `16417${kind}${id}`, Buttons: [], Sequences: [] });
  return {
    ActivityList: { Activities: [{ 'Id-': 53000001, Name: 'Made Up', ActivityGroup: 0, Type: 5, ActivityOrder: 0, Roles: [{ __type: 'DisplayActivityRole', 'DeviceId-': 83000001, PowerOnOrder: 1, PowerOffOrder: 1 }], EnterActions: [], LeaveActions: [] }] },
    DeviceList: { DevicesWithFeatures: [
      device(83000001, 'Their TV', [['PowerOn', 1], ['VolumeUp', 2], ['VolumeDown', 3], ['Mute', 4], ['Info']], ['HDMI 1', 'HDMI 2'], false),
      device(83000002, 'Their Tuner', [['PowerOn', 1], ['ChannelUp', 9], ['Guide'], ['DirectionUp', 12]], [], true),
    ] } as never,
    MapList: { ButtonMaps: [map('Device', 83000001), map('Device', 83000002), map('Activity', 53000001)] } as never,
    ProtocolList: { Protocols: [{ __type: 'IrProtocol', 'Id-': 2, Name: 'Made Up 32 Bit', CarrierFrequency: 38000, IRSegments: [], CodeSegments: [], Attributes: [], Flags: [], HoldDelay: null, HoldMinimumRepeats: null, KeyCode: null }] },
    Context: { 'AccountId-': 1 },
    Settings: { Settings: [] },
  } as SyncDocuments;
}

/** A setup over the made up catalogue: both devices under ids of ours, and one activity of each kind of map form. */
function setup(over: Partial<TouchSetup> = {}): TouchSetup {
  return {
    devices: [
      {
        id: 900000101, name: 'Our TV', manufacturer: 'M', model: 'Their TV', controlPort: 0, pressRepeats: 2,
        interKeyDelayMs: 100, interDeviceDelayMs: 200, power: { onDelayMs: 4000 }, inputDelayMs: 300,
        buttons: [{ key: 'VolumeUp', press: 'VolumeUp' }, { entry: 'Info', index: 0, press: 'Info' }],
      },
      {
        id: 900000102, name: 'Our Tuner', manufacturer: 'M', model: 'Their Tuner', controlPort: 0, pressRepeats: null,
        interKeyDelayMs: 0, interDeviceDelayMs: 0,
        buttons: [{ key: 'ChannelUp', press: 'ChannelUp', longPress: 'Guide' }, { entry: 'Guide', index: 0, press: 'Guide' }],
      },
    ],
    activities: [watchTv()],
    ...over,
  };
}

/** An activity in the ordered form, owning the favourites, opening on them, with a channel step and a sequence. */
function watchTv(over: Partial<OwnActivity> = {}): OwnActivity {
  return {
    id: 900000201, name: 'Watch TV', type: 'WatchTV', startScreen: 'Favorites', order: 0, tuningDefault: true,
    devices: [
      { device: 'Our TV', roles: ['DisplayActivityRole', 'VolumeActivityRole'], powerOn: 1, powerOff: 1, input: 'HDMI 2' },
      { device: 'Our Tuner', roles: ['ChannelChangingActivityRole'], powerOn: 2, powerOff: 2 },
    ],
    enter: [{ delaySeconds: 2, order: 4 }, { device: 'Our Tuner', channel: '101', order: 5 }],
    buttons: [
      { key: 'VolumeUp', press: { device: 'Our TV', command: 'VolumeUp' } },
      { key: 'ChannelUp', press: { device: 'Our Tuner', command: 'ChannelUp' }, longPress: { device: 'Our Tuner', command: 'Guide' } },
      { gesture: 'SwipeUp', press: { device: 'Our Tuner', command: 'DirectionUp' }, doublePress: { device: 'Our TV', command: 'Mute' } },
      { entry: 'Guide', index: 0, press: { sequence: 'Guide Twice' } },
      { entry: '123', index: 1, group: 36, press: { client: 'Numpad' } },
    ],
    sequences: [{ id: 900000301, name: 'Guide Twice', steps: [{ device: 'Our Tuner', command: 'Guide' }, { delaySeconds: 0.5 }, { device: 'Our Tuner', command: 'ChannelUp' }] }],
    ...over,
  };
}

const refused = (f: () => unknown, pattern: RegExp) => assert.throws(f, (e: unknown) => e instanceof ComposeRefusal && pattern.test(e.message));
const composed = (s: TouchSetup = setup()) => { const d = documents(); return composeTouchSetup(setupBaseOf(d), s, catalogueOfSet(d)); };

test('the base is the four lists emptied and nothing else, and a set lacking one of them is refused rather than given one', () => {
  const docs = documents();
  const base = setupBaseOf(docs);
  assert.deepEqual(base.ActivityList, { Activities: [] });
  assert.deepEqual(base.DeviceList, { DevicesWithFeatures: [] });
  assert.deepEqual(base.MapList, { ButtonMaps: [] });
  assert.deepEqual(base.ProtocolList, { Protocols: [] });
  assert.deepEqual(base.Context, docs.Context);
  assert.deepEqual(base.Settings, docs.Settings);
  assert.equal((docs.DeviceList as unknown as { DevicesWithFeatures: unknown[] }).DevicesWithFeatures.length, 2, 'the documents given are not changed');
  // The gate does not refuse the base itself, which is why it is never handed to the answerer: nothing stops it there.
  assert.deepEqual(refusalsBeforeASync(base), []);
  refused(() => setupBaseOf({ ...docs, MapList: {} as never }), /MapList holds no list of ButtonMaps/);
});

test('a whole setup composes and reads back: devices from their catalogue record with what the person chose, maps in the ordered form, an activity with the favourites, a channel step and a sequence', () => {
  proves(31, ['harmony-touch'], ['packages/bench/test/harmony-touch/touch-activity-runs.test.ts', 'packages/bench/test/harmony-touch/touch-setup-runs.test.ts', 'docs/test-notes/harmony-touch.md']);
  proves(37, ['harmony-touch'], ['packages/bench/test/harmony-touch/touch-setup-runs.test.ts', 'docs/test-notes/harmony-touch.md']);
  proves(38, ['harmony-touch'], ['packages/bench/test/harmony-touch/touch-setup-runs.test.ts', 'docs/test-notes/harmony-touch.md']);
  const docs = composed();
  assert.deepEqual(refusalsBeforeASync(docs), []);
  const c = readConfiguration(docs);
  assert.deepEqual(c.devices.map((d) => [d.id, d.name, d.model, d.pressRepeats, d.interKeyDelayMs, d.interDeviceDelayMs, d.power?.onDelayMs, d.inputDelayMs]), [
    ['900000101', 'Our TV', 'Their TV', 2, 100, 200, 4000, 300],
    ['900000102', 'Our Tuner', 'Their Tuner', 3, 0, 0, 0, undefined],
  ]);
  // Carried from the catalogue: the commands, the inputs and the channel tuning, each feature naming the id of ours.
  const tv = (docs.DeviceList as unknown as { DevicesWithFeatures: { DeviceFeatures: Record<string, unknown>[]; Commands: unknown[] }[] }).DevicesWithFeatures[0]!;
  assert.deepEqual(tv.DeviceFeatures.map((f) => f['DeviceId-']), [900000101, 900000101]);
  assert.deepEqual(tv.Commands, (documents().DeviceList as unknown as { DevicesWithFeatures: { Commands: unknown[] }[] }).DevicesWithFeatures[0]!.Commands);
  assert.deepEqual(c.devices[1]!.channelTuning !== undefined, true);
  assert.equal((docs.ProtocolList as unknown as { Protocols: unknown[] }).Protocols.length, 1, 'one definition, named by both devices, once');
  // The device maps, found by the engine's identifier, and a device's own command named alone.
  assert.deepEqual(c.devices.map((d) => d.map?.keys.map((k) => [k.key, k.press?.command?.name, k.longPress?.command?.name])), [
    [['VolumeUp', 'VolumeUp', undefined]], [['ChannelUp', 'ChannelUp', 'Guide']],
  ]);
  const a = c.activities[0]!;
  assert.deepEqual([a.id, a.name, a.order, a.startScreen, a.tuningDefault], ['900000201', 'Watch TV', 0, 'Favorites', true]);
  assert.deepEqual(a.enter.map((s) => [s.kind, s.order, s.durationMs, s.channelNumber, s.device?.name]), [
    ['delay', 4, 2000, undefined, undefined], ['channel', 5, undefined, '101', 'Our Tuner'],
  ]);
  const map = a.map!;
  assert.equal(map.reachable, true);
  assert.deepEqual(map.gestures.map((g) => [g.key, g.press?.command?.name, g.doublePress?.command?.name]), [['SwipeUp', 'DirectionUp', 'Mute']]);
  assert.deepEqual([...map.entries.values()].map((e) => [e.index, e.label, e.press?.kind]), [[0, 'Guide', 'sequence'], [1, '123', 'client']]);
  assert.deepEqual(map.sequences.map((s) => [s.name, s.steps.map((x) => [x.kind, x.order, x.commandName ?? x.durationMs])]), [
    ['Guide Twice', [['command', 1, 'Guide'], ['delay', 2, 500], ['command', 3, 'ChannelUp']]],
  ]);
});

test('the ordered form writes each button with the fields either program reads: its kind, state 0, its group, and actions with their event, order 0 and the function id where the command states one', () => {
  const docs = composed();
  const maps = (docs.MapList as unknown as { ButtonMaps: { Buttons: Record<string, unknown>[]; Sequences: { Actions: Record<string, unknown>[] }[] }[] }).ButtonMaps;
  const activity = maps.at(-1)!;
  assert.deepEqual(activity.Buttons.map((b) => [b['__type'], b['ButtonKey'] ?? b['TextOnRemote'], b['ButtonState'], b['FunctionGroupType']]), [
    ['HardRemoteButton', 'VolumeUp', 0, 0], ['HardRemoteButton', 'ChannelUp', 0, 0], ['GestureRemoteButton', 'SwipeUp', 0, 0],
    ['SoftRemoteButton', 'Guide', 0, 0], ['SoftRemoteButton', '123', 0, 36],
  ]);
  assert.deepEqual(activity.Buttons[1], {
    __type: 'HardRemoteButton', ButtonKey: 'ChannelUp', ButtonState: 0, FunctionGroupType: 0,
    ButtonAction: { __type: 'ButtonCommandAction', EventType: 1, Order: 0, CommandName: 'ChannelUp', 'DeviceId-': 900000102, 'FunctionId-': 9 },
    ButtonLongPressAction: { __type: 'ButtonCommandAction', EventType: 2, Order: 0, CommandName: 'Guide', 'DeviceId-': 900000102 },
    ButtonDoublePressAction: null,
  });
  assert.deepEqual((activity.Buttons[2]!['ButtonDoublePressAction'] as Record<string, unknown>)['EventType'], 3);
  assert.deepEqual(activity.Buttons[3]!['MenuItem'], { IndexInMenu: 0 });
  assert.deepEqual(activity.Buttons[4]!['ButtonAction'], { __type: 'ButtonClientAction', EventType: 1, Order: 0, ActionName: 'Numpad' });
  // A sequence's steps are numbered from 1 and carry no function id, though ChannelUp states 9.
  assert.deepEqual(activity.Sequences[0]!.Actions, [
    { __type: 'ButtonCommandAction', EventType: 1, Order: 1, CommandName: 'Guide', 'DeviceId-': 900000102 },
    { __type: 'ButtonDelayAction', EventType: 1, Order: 2, Duration: 0.5 },
    { __type: 'ButtonCommandAction', EventType: 1, Order: 3, CommandName: 'ChannelUp', 'DeviceId-': 900000102 },
  ]);
  // functionIdOf reads both keys the documents use, and a null as none.
  assert.equal(functionIdOf({ Name: 'x', 'FunctionId-': 7 } as never), 7);
  assert.equal(functionIdOf({ Name: 'x', FunctionId: 8 } as never), 8);
  assert.equal(functionIdOf({ Name: 'x', FunctionId: null } as never), undefined);
  assert.equal(functionIdOf(undefined), undefined);
});

test('composeButtons refuses a button the remote would drop or act on otherwise, and a sequence it would not run as written', () => {
  const resolve = (c: { device: string; command: string }): ResolvedCommand => ({ name: c.command, deviceId: 900000101, functionId: undefined });
  const one = (b: OwnButton, s: OwnSequence[] = []) => () => composeButtons([b], s, resolve);
  const cmd = { device: 'D', command: 'C' };
  refused(one({ key: 'VolumeUp', entry: 'E', index: 0, press: cmd }), /exactly one of a key, a gesture and an entry/);
  refused(one({ press: cmd }), /exactly one of a key, a gesture and an entry/);
  refused(one({ key: 'VolumeUp', group: 5, press: cmd }), /group 5 is not one/);
  refused(one({ key: 'NotAKey' as never, press: cmd }), /not a key name/);
  refused(one({ gesture: 'SwipeUpHold' as never, press: cmd }), /not a gesture a map of ours holds/);
  refused(() => composeButtons([{ key: 'VolumeUp', press: cmd }, { key: 'VolumeUp', press: cmd }], [], resolve), /given twice/);
  refused(one({ entry: 'E', press: cmd }), /no place in its list/);
  refused(one({ entry: ' ', index: 0, press: cmd }), /no label/);
  refused(one({ entry: '12', index: 0, press: { client: 'Numpad' } }), /entry labelled 123/);
  refused(one({ entry: '123', index: 0, press: { client: 'Keyboard' as never } }), /not a client action/);
  refused(one({ entry: 'Gesturepad', index: 0, press: cmd }), /acts by itself/);
  refused(one({ entry: '123', index: 0, press: cmd }), /acts by itself/);
  refused(one({ entry: 'E', index: 0, press: { sequence: 'Missing' } }), /which the map does not hold/);
  const seq = (over: Partial<OwnSequence>): OwnSequence => ({ id: 900000301, name: 'S', steps: [cmd], ...over });
  refused(one({ key: 'Play', press: cmd }, [seq({}), seq({ id: 900000302 })]), /two sequences are named "S"/);
  refused(one({ key: 'Play', press: cmd }, [seq({}), seq({ name: 'T' })]), /not one of ours or is given twice/);
  refused(one({ key: 'Play', press: cmd }, [seq({ id: 83000001 })]), /not one of ours/);
  refused(one({ key: 'Play', press: cmd }, [seq({ steps: [{ delaySeconds: 1 }] })]), /sends no command/);
  refused(one({ key: 'Play', press: cmd }, [seq({ steps: [cmd, { delaySeconds: 0 }] })]), /pause is not a positive number/);
  // The control: the same shapes, well formed, compose.
  assert.equal(composeButtons([{ entry: '123', index: 0, group: 36, press: { client: 'Numpad' } }, { key: 'Play', press: { sequence: 'S' } }], [seq({})], resolve).buttons.length, 2);
});

test('an activity is refused both map forms, sequences without buttons, the favourites without a channel role, a start screen it cannot fill, two steps on one order and a channel step that sends nothing', () => {
  const base = composed(setup({ activities: [] }));
  const one = (over: Partial<OwnActivity>) => () => composeTouchActivity(watchTv(over), base);
  refused(one({ keys: { Play: { device: 'Our TV', command: 'Info' } } }), /not both/);
  refused(one({ buttons: undefined as never, startScreen: 'Commands', tuningDefault: true }), /sequences are given only with the ordered buttons/);
  refused(one({ devices: [{ device: 'Our TV', roles: ['DisplayActivityRole'], powerOn: 1, powerOff: 1 }], enter: [] }), /channel changing role/);
  refused(one({ tuningDefault: false }), /only the activity the favourite channels belong to opens on them/);
  refused(one({ startScreen: 'Gesturepad', buttons: [{ key: 'VolumeUp', press: { device: 'Our TV', command: 'VolumeUp' } }], sequences: [] }), /gesture screen only when its map holds gestures/);
  refused(one({ enter: [{ delaySeconds: 1, order: 2 }, { device: 'Our TV', command: 'Info', order: 2 }] }), /two steps share order 2/);
  refused(one({ enter: [{ device: 'Our Tuner', channel: '1a' }] }), /no channel of digits/);
  refused(one({ enter: [{ device: 'Our TV', channel: '101' }] }), /no channel tuning/);
  // The control: the activity as given composes on the same documents.
  assert.equal(composeTouchActivity(watchTv(), base).activity.Name, 'Watch TV');
});

test('a setup is refused onto a base not empty, with an id not ours or given twice, two names differing in case, a model the catalogue lacks and a definition it lacks', () => {
  const docs = documents();
  const base = setupBaseOf(docs);
  const catalogue = catalogueOfSet(docs);
  const devices = setup().devices;
  refused(() => composeTouchSetup(docs, setup(), catalogue), /the base's ActivityList is not empty/);
  refused(() => composeTouchSetup(base, setup({ devices: [{ ...devices[0]!, id: 83000001 }], activities: [] }), catalogue), /not one of ours/);
  refused(() => composeTouchSetup(base, setup({ devices: [devices[0]!, { ...devices[1]!, id: 900000101 }], activities: [] }), catalogue), /another device's or one inside the other/);
  refused(() => composeTouchSetup(base, setup({ devices: [devices[0]!, { ...devices[1]!, name: 'OUR TV' }], activities: [] }), catalogue), /two devices are named/);
  refused(() => composeTouchSetup(base, setup({ devices: [{ ...devices[0]!, model: 'Nobody' }], activities: [] }), catalogue), /holds no records of M Nobody/);
  refused(() => composeTouchSetup(base, setup({ activities: [] }), { ...catalogue, protocols: [] }), /names definition 2, which the catalogue does not hold/);
  refused(() => composeTouchSetup(base, setup({ devices: [{ ...devices[0]!, buttons: [{ key: 'Play', press: 'Nothing' }] }], activities: [] }), catalogue), /has no command "Nothing"/);
});

/** What a remote does with a configuration, by name: the devices, the activities and every map, and no id. */
function view(c: Configuration): unknown {
  const press = (x: ReadButtonAction | undefined) => x === undefined ? null
    : [x.kind, x.device?.name ?? null, x.command?.name ?? x.commandName ?? null, x.actionName ?? null, x.durationMs ?? null,
      x.sequenceId === undefined ? null : c.maps.flatMap((m) => m.sequences).find((s) => s.id === x.sequenceId)?.name ?? '?'];
  const mapView = (m: Configuration['maps'][number] | undefined) => m === undefined ? null : {
    keys: m.keys.map((k) => [k.key, k.group, press(k.press), press(k.longPress), press(k.doublePress)]),
    gestures: m.gestures.map((k) => [k.key, press(k.press), press(k.longPress), press(k.doublePress)]),
    entries: [...m.entries.values()].map((e) => [e.index, e.label, e.group, press(e.press), press(e.longPress)]),
    numberPad: m.numberPad.map((e) => [e.index, e.label, e.group, press(e.press)]),
    shadowed: m.shadowed.map((e) => [e.index, e.label]),
    sequences: m.sequences.map((s) => [s.name, s.steps.map(press)]),
  };
  return {
    devices: c.devices.map((d) => ({
      name: d.name, manufacturer: d.manufacturer, model: d.model, port: d.controlPort, repeats: d.pressRepeats,
      delays: [d.interKeyDelayMs, d.interDeviceDelayMs, d.inputDelayMs],
      power: d.power === undefined ? null : [d.power.typeId, d.power.onDelayMs, d.power.alwaysOn, d.power.keptOnBetweenActivities, d.power.on.length, d.power.off.length],
      inputs: d.inputs.map((i) => [i.name, i.order, i.actions.length]),
      tuning: d.channelTuning !== undefined, commands: d.commands.map((x) => x.name), map: mapView(d.map),
    })),
    activities: c.activities.map((a) => ({
      name: a.name, type: a.type, group: a.group, order: a.order, hidden: a.hidden, startScreen: a.startScreen, tuningDefault: a.tuningDefault,
      devices: a.devices.map((d) => [d.device?.name, d.kinds, d.role.powerOnOrder, d.role.powerOffOrder, d.role.input ?? null]),
      enter: a.enter.map((s) => [s.kind, s.order, s.device?.name ?? null, s.commandName ?? null, s.durationMs ?? null, s.channelNumber ?? null]),
      leave: a.leave.map((s) => [s.kind, s.order, s.device?.name ?? null, s.commandName ?? null, s.durationMs ?? null, s.channelNumber ?? null]),
      map: mapView(a.map),
    })),
    favourites: c.favourites.map((f) => [f.activity.name, f.device?.name, f.favourites.length, f.missing]),
  };
}

test('describing Logitech\'s own documents and composing the description gives the same remote: every device, activity, map, favourite and finding, compared by name', lab.skipUnless(FULL), () => {
  proves(3, ['harmony-touch']);
  const docs = documentsOfAnswers(answersOf(FULL));
  const description = describeTouchSetup(docs, IDS);
  assert.deepEqual([description.devices.length, description.activities.length], [7, 5]);
  assert.equal(description.devices.reduce((n, d) => n + d.buttons.length, 0) + description.activities.reduce((n, a) => n + (a.buttons?.length ?? 0), 0), 616);
  const ours = composeTouchSetup(setupBaseOf(docs), description, catalogueOfSet(docs));
  assert.deepEqual(refusalsBeforeASync(ours), []);
  const theirs = readConfiguration(docs);
  const composedView = readConfiguration(ours);
  assert.deepEqual(view(composedView), view(theirs));
  assert.equal(composedView.favourites.length, 1);
  assert.equal(composedView.favourites[0]!.favourites.length, 5);
  assert.deepEqual(checkConfiguration(composedView).map((f) => f.rule), checkConfiguration(theirs).map((f) => f.rule));
  // Every id in the composed lists is ours; the description holds none of Logitech's.
  assert.ok(composedView.devices.every((d) => /^9000001\d\d$/.test(d.id)) && composedView.activities.every((a) => /^9000002\d\d$/.test(a.id)));
  // Described again, the composed documents give the same description: the round trip closes.
  assert.deepEqual(describeTouchSetup(ours, IDS), description);
  // The control: one key of the first activity sending the next key's command instead makes the view differ.
  const [first, ...rest] = description.activities;
  const buttons = [...first!.buttons!];
  buttons[0] = { ...buttons[0]!, press: buttons[1]!.press };
  const changed = composeTouchSetup(setupBaseOf(docs), { ...description, activities: [{ ...first!, buttons }, ...rest] }, catalogueOfSet(docs));
  assert.notDeepEqual(view(readConfiguration(changed)), view(theirs));
});

test('the function id census: 530 actions name a command stating a number and carry it, 88 carry 0 and 36 null where the command states none, and both sequence steps carry 0', lab.skipUnless(FULL), () => {
  const docs = documentsOfAnswers(answersOf(FULL));
  const c = readConfiguration(docs);
  const tally = new Map<string, number>();
  const add = (k: string) => tally.set(k, (tally.get(k) ?? 0) + 1);
  for (const m of c.maps) {
    for (const b of m.buttons) {
      for (const [which, x] of [['press', b.source.ButtonAction], ['long', b.source.ButtonLongPressAction], ['double', b.source.ButtonDoublePressAction]] as const) {
        const a = x as Record<string, unknown> | null | undefined;
        if (a?.['__type'] !== 'ButtonCommandAction') continue;
        const device = c.devices.find((d) => d.id === idText(a['DeviceId-'] as number));
        const stated = functionIdOf(device?.commandsByName.get(String(a['CommandName']).toLowerCase())?.source);
        const carried = 'FunctionId-' in a ? (a['FunctionId-'] === stated ? 'the same' : `hyphen ${String(a['FunctionId-'])}`) : 'FunctionId' in a ? `plain ${String(a['FunctionId'])}` : 'none';
        add(`${which}, command ${stated === undefined ? 'states none' : 'states one'}, ${carried}`);
      }
    }
    for (const s of m.sequences) {
      for (const x of s.steps) {
        if (x.kind !== 'command') continue;
        add(`step, command states ${String(functionIdOf(x.command?.source))}, hyphen ${String((x.source as Record<string, unknown>)['FunctionId-'])}`);
      }
    }
  }
  assert.deepEqual(Object.fromEntries([...tally].sort()), {
    'double, command states one, the same': 4,
    'long, command states none, hyphen 0': 1,
    'long, command states one, the same': 41,
    'press, command states none, hyphen 0': 87,
    'press, command states none, plain null': 36,
    'press, command states one, the same': 485,
    'step, command states 148, hyphen 0': 1,
    'step, command states 162, hyphen 0': 1,
  });
});
