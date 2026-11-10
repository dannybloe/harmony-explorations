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
 * `activities-and-buttons.md` and `favourites-and-settings.md`, whose sections the rules in `src/families/harmony-touch/`
 * cite; this file checks that the code does what those sections say, not that the remote does.
 *
 * **The shape of each assertion.** A break is asserted as the whole of `findingsByRule`, so a rule that also
 * fires somewhere it should not, or a break that trips a second rule, fails as loudly as a rule that does not
 * fire. The clean configuration is the control for all of them: the check finds nothing there.
 *
 * No lab is needed and none is read, except by the last test, which reads the recorded syncs and skips
 * without them.
 *
 * ## The type name, `missing type`
 *
 * **The question.** Before a set of ours goes to a Touch the gate has to refuse every set the engine's
 * configuration reader raises on, since a raise inside the load ends the task that loads the configuration
 * and the way back is the recovery tier, `firmware.md` "A configuration that fails to load". The reader tells
 * most entries apart by a substring search of their `__type`; the list check caught a missing list and nothing
 * caught a missing type name.
 *
 * **What was read**, in the engine of production build 4.15.330, decompiled, with every file and line in the
 * lab's `work/touch-firmware/notes/6.7.1-type-field.md`. Fifty three lines name `__type` in the three files
 * that read it, the configuration reader, the protocol model and the start's compatibility pass. On the load,
 * `loadAll`, which the start calls with nothing to catch an error and a sync's reload calls again:
 *
 * * **eleven list paths raise on an absent type name**: a device feature (`getStatesConfiguration`), the
 *   action lists `getActionItems` reads off a feature, which depend on the feature's own kind (an input's
 *   actions, a power feature's four, a channel tuning feature's two, a state's reset actions and the actions of
 *   a state value whose `ActionSetType` is 1 or 2) plus the four every feature carries, an activity's roles
 *   and its start and end steps (`getActivitiesConfiguration`, `getActivityAction`), a map and its buttons
 *   (`getButtonMaps`), and every step of every sequence of every map (`getSequenceActions`, which the load
 *   runs for all sequences and not only those a button names);
 * * **one is guarded**: a button's three actions, `getButtonActions`, test the field first and pass over an
 *   action without it, or with `false`;
 * * **one never raises**: a protocol's name is compared for equality, `initializeFromHarmonyProtocol`, so a
 *   missing or strange one is logged;
 * * **an unknown name raises nowhere**: six dispatches log it, two keep the map or button under an empty name,
 *   and a role's name is stored as it stands. So there is no rule for it.
 *
 * **What a value does to the search.** The engine runs on LuaJIT, whose `string.find` takes a number as its
 * decimal text and raises on anything else that is not a string; that is LuaJIT's own behaviour and not read
 * in the image. JSON `null` decodes to the JSON library's null value, which disassembly of the library in the
 * image reads as a full userdata, `luaopen_json` and the decoder's null branch, so it raises. A boolean, an
 * object and an array raise. **A number passes**, as an unknown name, and the rule passes it too: a rule here
 * implements what the remote does, and inventing a refusal is what `isInfrared` in the check is written to
 * avoid. **An entry that is not an object raises on the same paths**, because the name is read off it.
 *
 * **What the rule is.** `typePlaces` walks the documents themselves along those paths, each list only where
 * the reader reaches it, and `checkTypes` refuses each place where the reader raises; `refusalsBeforeASync`
 * runs it beside the list check, before the view is built.
 *
 * **The closure, on the recordings.** A walk that knows nothing of the reader, every object holding a `__type`
 * anywhere in the documents, counts exactly the places the rule's walk visits plus the protocols: in the full
 * sync 1404 places and 5 protocols, in the trial sync 539 and 3. So every type name Logitech's documents carry
 * sits on a path the reader searches, apart from the protocols, which it compares, and the rule's walk misses
 * none of them; the two counts come from two walks of different design over the same documents, not from
 * one. Both sets pass the gate with no finding of this rule. Of the full sync's places 662 are a button's
 * actions, one short action on each of its 616 buttons, 42 long and 4 double, the last two the counts
 * `touch-activities.test.ts` measured.
 *
 * **Negatives asserted**: a power feature carrying an input's list, and a state value whose `ActionSetType` is
 * neither 1 nor 2, are not refused for an untyped action, since the reader never reads them; a protocol
 * without a type name is not refused; a guarded action's absent or `false` name passes.
 *
 * **Controls**, each run once by string replacement and failing as it should: an absent name treated as
 * searchable fails the per path test; every feature walked for every kind's lists fails the negatives; the
 * guard ignored fails the button action test; the sequences left unwalked fails the closure.
 *
 * **Width.** One build, 4.15.330, of one model, the Harmony Touch; the other remotes of that generation and
 * any other build are not checked. The screens, a program of their own, read `__type` too, and their reading
 * is not examined.
 *
 * **Sources checked first**: the reference's `answering-a-sync.md` and `firmware.md`, the lab notes
 * `1.3.2-the-configuration-reader.md`, `3.1-activities-and-button-maps.md` and `3.1-devices-and-protocols.md`,
 * against which the lab note above lists two disagreements, and this check's own list rule. Logitech's client
 * was not consulted: the remote reads these documents and the client hands them over unchanged.
 *
 * ## Every other field the load raises on, and the screens' reads
 *
 * **The question.** 6.7.1 closed the type name. What was left: an entry that is not an object on a list the
 * reader does not sort by type, any field the load indexes, computes with or passes to a string function
 * without a test, the start's compatibility pass, and the screens, a program of their own that reads the same
 * documents.
 *
 * **What was read**, in the same build, with file and line per place in the lab's
 * `work/touch-firmware/notes/6.10-reader-raises.md` (the engine) and `6.10-screens-reads.md` (the screens, read
 * by an agent from a brief in the same folder and checked by the author on its costliest rows only).
 *
 * * **The engine's load raises in more ways than a list or a type name**: 47 of the note's 59 rows were not
 *   covered before, and `ROWS` below asserts them in 60 rows of values, of five
 *   kinds and two single places, each a rule of `checkFields`: an entry that is not an object, a value used
 *   in arithmetic, a bitwise operation or a sort that is not a number, a value passed to a string function
 *   that is not text, a table key that is absent ("table index is nil"), a list walked that is not a table, an
 *   activity's `Alternatives` text that decodes to a scalar, and a device the start's fixes take for a Wii
 *   with no power state. How Lua treats each value is the language's documented behaviour on LuaJIT, not read
 *   in the image; the note lists the rules. **Where the reader would take a string of digits for a number the
 *   check refuses it**, the one place a rule refuses more than the remote raises on, since Logitech's
 *   documents state every such value as a number.
 * * **The compatibility pass cannot meet a set of ours** on this build: it walks the activities only when a
 *   file of a name nothing in 4.15.330 writes exists, and a committed sync from the account rebuilds the folder
 *   without it. Read in the sync's commit and the resource manager, not measured; nothing is built for it.
 * * **The screens catch their own raises**, in an event, a timer, a drawing and each turn of their main loop,
 *   so most cost one screen or one key; **three costs are the whole remote**, their program ending at every
 *   start, the error screen at every start whose one way on is a factory reset, and a sync that never
 *   commits. Every place of those three is `screens raise`, and so are three labels chapter 8 composes
 *   whatever they cost, a device's name, a screen entry's text and a sequence's name. The rows are
 *   `SCREEN_ROWS`. The note's other rows, each costing one screen, one key or a timer, are **not refused**,
 *   and the reference names them so. This said the rows costing the screens' hearing of the engine until a
 *   restart were not refused either, until 6.10.2 below refused them.
 *
 * **A defect this found in the view**: `read.ts` threw on a device's `Commands` stated as an object and on an IR
 * protocol's segment lists stated as one, where its header promises to read a malformed document without
 * throwing; a list that is not an array now reads as none, and the archive's segment rules are handed only
 * segments that are objects named by text.
 *
 * **The calibration** is Logitech's two recorded sets down and the five sets of ours a remote committed
 * (6.8 and 6.9), which pass every rule, against the synthetic sets with each value broken, which are refused at
 * their one place by their one rule. There is no independent closure: no second walk counts these places.
 *
 * **Negatives asserted**: each row's values the reader takes pass; a button without a name passes unless the
 * reader's own test gives it an action; a device not taken for a Wii, or with a power state, passes; a screen
 * entry's text is not asked off the number pad, when hidden, or without a press; an unranked channel needs no
 * station.
 *
 * **Controls**, each run once by string replacement and restored from a copy, every one failing as it should:
 * each of the six field helpers made silent (`entry not an object`, `required field`, `not a list`, the
 * protocol's `missing list`) or widened (`not a number` taking a string, `not text` taking anything), the
 * alternatives test, the Wii test, the action test, the screens' rule made silent, its language test widened,
 * its screen entry condition dropped, its ranked channel condition dropped, and the view's two fixes reverted.
 *
 * **Width.** One build, 4.15.330, of the Harmony Touch, whose screens are the `juniper` skin; the other skin in
 * the image and every other build are not checked.
 *
 * **Sources checked first**: 6.7.1's lab note and this file's 6.7.1 section, the reference pages above, and the
 * lab notes `1.3.2-the-configuration-reader.md` (which agrees on the sort keys and the protocol's lists and
 * calls `IsTuningDefault` listing only, which the pass and the favourites contradict) and the two `3.1-*.md`
 * notes, silent on most of these raises. Logitech's client was not consulted, for the reason above.
 *
 * ## The screens deaf to the engine until a restart
 *
 * **The question.** 34 rows of `6.10-screens-reads.md` cost "LH": a raise inside a notification from the
 * engine. Decided at the bench: they are refused too, since chapter 8 composes the names, labels and pictures
 * those screens read and a valid set never meets them. Before building, every one of the 34 was re-read in the
 * screens' Lua, because 6.10.1's author had checked only the costliest rows; the verdict per row is written
 * beside it in the lab note, section 6 there has the summary.
 *
 * **The mechanism, re-read first.** `Render:processEvent` (`draws/render.lua` 1314-1330) calls a socket's
 * callback with no guard and re-arms the socket only when the callback returns true; a raise leaves the
 * table entry, so `addFile` returns early ever after (1351-1356), and `ltcpsocket.lua` 107-145 to `hbus.lua`
 * 111-173 reach every subscriber and reply callback with no `pcall`. That the C side clears the descriptor
 * before posting the event is 6.10.1's disassembly, not re-read. **What reaches a document inside a
 * notification** on a Touch synced through a computer: the activity finished notification, which returns at
 * once while the remote is on USB (`harmony.lua` 3817) and otherwise runs `launcher.activityFinishedUiCallback`,
 * which builds the activity's command page, number pad, gesture pad when it is the start screen, and the
 * first activity tutorial by `loadfile` inside it (`render.lua` 1372, `carousel.lua` 150); the start activity
 * subscriber (`launcher.lua` 199-285); the help screen's replies; and the sync's end, `proxyFinishedCallback`.
 *
 * **The verdicts**: 19 rows confirmed as written, 15 corrected, none unconfirmed. Of the corrections: five
 * rows reach the deaf state only in hub mode, which a Touch synced through a computer is not, so are not
 * refused (the activity powered off label is reached only with `startingActivity` false, which the one
 * subscriber on such a Touch never passes; the first tutorial's name labels sit in its surface mode branch or
 * behind taps; the speakers need `hasSpeakers`, surface mode); a sequence's list is built only from a tap; and
 * the rest name a value or a cost the row missed: the user's pictures as text (`ipairs` at `harmony.lua`
 * 3397, at start whenever a background is named), a role's input that is a number or `true` (the tutorial's
 * guard lets them through, `firsttimetutorial.lua` 174-176), the device list drawing every device's picture
 * through `string.find` on `ParentDeviceModel` (`style.lua` 2047, the error screen on an account with no
 * activity), a press of any table kind on the command page and its type name searched for the picture
 * (`style.lua` 1874, 1914), a number pad command name that is not a number passing where the row had it raise
 * (only one read as a number off the pad's twelve keys raises, `numpad.lua` 71-78), a device id holding a
 * pattern character (the screens search with it as a pattern, `harmony.lua` 582, 615), a channel entry that cannot be indexed
 * and a ranked station's id passed to `gsub` (`harmony.lua` 3511, 1285), a favourites document that is a
 * number or `true` (the favourites manager's guards pass both), and the gesture pad's held forms. **One place
 * outside the 34 was found**: `getRequest` joins the Context's `AccountId-` into every document's address with
 * `table.concat` (`harmony.lua` 1220, 1252), which raises on anything but text at the screens' first reading,
 * so their program ends at every start. And one place the note named and 6.10.1 did not build: device mode's
 * reorder of the screen entries by `IndexInMenu + 1` (`harmony.lua` 428), the first screen on an account with
 * no activity.
 *
 * **What is built**, all under `screens raise`, whose message now names the deaf cost: the rule's name stays
 * one because the fault is one, a raise in the screens, and the gate and the answerer treat every refusal
 * alike. Where the code's condition is the activity a notification names, every activity or every activity
 * map is asked, the safe side; where the engine's reader already refuses the same value at the same place,
 * the screens' rule stays silent, so a value is told once.
 *
 * **The calibration** is Logitech's recorded full and trial syncs and the five sets of ours, which pass, and
 * which the new places meet: the full sync's one gesture pad activity has its map, with a sequence and nine
 * gesture actions, and is the one activity map with sequences; that map's sequences turned to text are refused
 * there. **Negatives asserted**: an object of roles passes; the gesture pad is not read for another start
 * screen; a double tap's own press and a hidden gesture pass; play and pause with its device's map passes, the
 * map found with the screens' prefix or without; a hard key the engine keys by its name is the engine's to
 * refuse; a press on a map without sequences is not searched; an entry of group 36 need not be indexable for
 * the command page; a hidden entry is not drawn or ordered; a device's index and model are asked only with no
 * activity listed; a Bluetooth keyboard needs no known model; an unranked channel's station id is not read;
 * a favourites document that is `false`, `null` or text passes.
 *
 * **Controls**, 33, each run once by string replacement on a copy of `check.ts` and restored from it, every one
 * failing a test as it should: each new condition made silent (the account id, the setup session, the user's
 * pictures as text, a role's device id and input, the device id's pattern, a Bluetooth device's model and its
 * known names, the model with no activity, the activity page's press and its type name, the activity and
 * device indexes, the number pad's press and name, a hard key's name, the press with sequences, a sequence
 * entry's index, the root map's key, the gesture pad's walk, its sequences, a sequence's id, an action's type
 * name, play and pause, an unknown kind, the held form, a favourites document, a channel, a station id), the
 * roles narrowed back to 6.10.1's two activities, a press of any table narrowed to an object, the engine first
 * skip on the index dropped, and the one finding per place dropped. Two controls first passed, because other
 * rows refused the same values; a scenario reaching only that condition was added for each.
 *
 * **Width.** One build, 4.15.330, of the Harmony Touch, the `juniper` skin. How Lua treats each value is the
 * language's documented behaviour on LuaJIT, not run; a malformed pattern raising is the same.
 *
 * **Sources checked first**: the lab notes `6.10-screens-reads.md`, `6.10-reader-raises.md` and
 * `6.10.2-brief.md`, this file's 6.10 section and the reference's `answering-a-sync.md`. Logitech's client was
 * not consulted, for the reason above.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { TOP_LEVEL_LISTS, checkConfiguration, checkFields, checkScreens, checkTypes, findingsByRule, readerRaises, refusalsBeforeASync, typePlaces } from '../../../src/families/harmony-touch/check.ts';
import { documentKeyOf, documentsOfAnswers, kindOf, type SyncAnswer, type SyncDocuments } from '../../../src/families/harmony-touch/documents.ts';
import { DEFAULT_PRESS_REPEATS, FIRMWARE_SETTINGS, mapIdentifier, numberPadKey, readConfiguration, readSettings, stationLogo, uploadedLogo } from '../../../src/families/harmony-touch/read.ts';
import { answersOf, FULL, TRIAL } from './touch-sync.ts';

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
    'Id-': id, Name: `Device ${id}`, Manufacturer: 'Synthetic', Model: `M${id}`, ParentDeviceModel: `M${id}`, DeviceType: 1, Transport: 1, ControlPort: 0,
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
  // The remote's reader lowers the name and raises on its absence, `not text`, which the check found nothing
  // of until the screens' reads were measured.
  const nameless = broken((x) => { delete firstDevice(x).Commands[1].Name; });
  const c = readConfiguration(nameless);
  assert.equal(c.devices[0]!.commands.length, 14);
  assert.equal(c.devices[0]!.commands[1]!.name, undefined);
  assert.equal(c.devices[0]!.commandsByName.has('mute'), false);
  assert.deepEqual(check(nameless), { 'not text': 1, 'action command missing': 4 });
  // A null button is skipped where it stands, and the paths after it still name their own entry. The check
  // finds it as an entry the remote's reader reads a type name off, which raises, `missing type`; it found
  // nothing here until the type name's read was measured.
  const button = broken((x) => { x.MapList.ButtonMaps[0].Buttons.splice(1, 0, null); });
  const map = readConfiguration(button).maps[0]!;
  assert.deepEqual(map.buttons.map((b) => b.path), ['ButtonMaps[0].Buttons[0]', 'ButtonMaps[0].Buttons[2]', 'ButtonMaps[0].Buttons[3]']);
  assert.deepEqual(check(button), { 'missing type': 1 });
  // A null sequence step is skipped too, and the steps still sort by their order; the same rule finds it.
  const step = broken((x) => { x.MapList.ButtonMaps[2].Sequences[0].Actions.splice(1, 0, null); });
  const sequence = readConfiguration(step).activities[0]!.map!.sequences[0]!;
  assert.deepEqual(sequence.steps.map((s) => [s.order, s.path]), [[1, 'ButtonMaps[2].Sequences[0].Actions[2]'], [2, 'ButtonMaps[2].Sequences[0].Actions[0]']]);
  assert.deepEqual(check(step), { 'missing type': 1 });
});

test('an empty sync reads as empty and names all six documents absent', () => {
  const c = readConfiguration({});
  assert.deepEqual(c.absent, ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList']);
  assert.deepEqual(checkConfiguration(c), []);
});

// ---------------------------------------------------------------------------------------------------
// The gate before a write
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

// ---------------------------------------------------------------------------------------------------
// The type name, `missing type`; the argument is this file's header
// ---------------------------------------------------------------------------------------------------

const press = (IRCommandName: string): Json => ({ __type: 'IRPressAction', Order: 0, Duration: null, IRCommandName });

/**
 * The clean set with an entry on every path the reader searches a type name on: every action list a feature
 * kind reads, a state feature with a value of each action set type the reader reads, an end step, a double
 * press. The control for every refusal below: the gate passes it.
 */
function everyPath(): Json {
  return broken((x) => {
    const [power, input, tuning] = firstDevice(x).DeviceFeatures;
    Object.assign(power, { PowerOffActions: [press('PowerOn')], PowerToggleActions: [press('PowerOn')], PowerOnResetActions: [press('PowerOn')] });
    input.Inputs[0].Actions = [press('OK')];
    Object.assign(tuning, { GreaterTenActions: [press('OK')], GreaterHundredActions: [press('OK')], StartActions: [press('OK')], NextActions: [press('OK')], PreviousActions: [press('OK')] });
    firstDevice(x).DeviceFeatures.push({
      __type: 'InternalStateFeature', StateName: 'Mode', ResetActions: [press('OK')],
      StateValues: [{ StateValueName: 'A', ActionSetType: 1, Actions: [press('OK')] }, { StateValueName: 'B', ActionSetType: 2, Actions: [press('OK')] }],
    });
    activity(x).LeaveActions = [{ __type: 'CommandActivityAction', ActionOrder: 1, Id: 0, CommandName: 'Mute', 'DeviceId-': 1, TargetLevel: null }];
    x.MapList.ButtonMaps[1].Buttons[0].ButtonDoublePressAction = commandAction(2, 'Mute');
  });
}

/** The container and key a place's path leads to in its document, so a test can change the entry or its name. */
function locate(d: Json, document: string, path: string): [Json, string | number] {
  const steps = path.split('.').flatMap((s): (string | number)[] => {
    const [, name, indices] = /^([^[]+)((?:\[\d+\])*)$/.exec(s)!;
    return [name!, ...[...indices!.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]))];
  });
  let here = d[document];
  for (const s of steps.slice(0, -1)) here = here[s];
  return [here, steps.at(-1)!];
}

/** A copy of `everyPath` with one change made to the entry at a place. */
const changed = (document: string, path: string, change: (container: Json, key: string | number) => void): Json => {
  const d = everyPath();
  const [container, key] = locate(d, document, path);
  change(container, key);
  return d;
};

/** The gate's findings as rule, effect, document and path, the shape the assertions below compare whole. */
const places = (d: Json) => refusalsBeforeASync(d as SyncDocuments).map((f) => [f.rule, f.effect, f.document, f.path]);

/** A path with its indices taken out, the shape of a place. */
const shape = (document: string, path: string) => `${document} ${path.replace(/\[\d+\]/g, '[]')}`;

test('the walk reaches every path the reader searches a type name on, and the set built to hold one of each passes the gate', () => {
  assert.deepEqual(refusalsBeforeASync(everyPath()), []);
  // Named here as literals, so the walk cannot lose a path with the suite still passing.
  assert.deepEqual([...new Set(typePlaces(everyPath()).map((p) => shape(p.document, p.path) + (p.guarded ? ' guarded' : '')))].sort(), [
    'ActivityList Activities[].EnterActions[]',
    'ActivityList Activities[].LeaveActions[]',
    'ActivityList Activities[].Roles[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[].FinishActions[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[].GreaterHundredActions[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[].GreaterTenActions[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[].Inputs[].Actions[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[].NextActions[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[].PowerOffActions[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[].PowerOnActions[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[].PowerOnResetActions[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[].PowerToggleActions[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[].PreviousActions[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[].ResetActions[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[].StartActions[]',
    'DeviceList DevicesWithFeatures[].DeviceFeatures[].StateValues[].Actions[]',
    'MapList ButtonMaps[]',
    'MapList ButtonMaps[].Buttons[]',
    'MapList ButtonMaps[].Buttons[].ButtonAction guarded',
    'MapList ButtonMaps[].Buttons[].ButtonDoublePressAction guarded',
    'MapList ButtonMaps[].Buttons[].ButtonLongPressAction guarded',
    'MapList ButtonMaps[].Sequences[].Actions[]',
  ]);
});

test('the gate refuses an entry without a type name, or with one that is null, a boolean, an object or an array, on every path the reader searches it untested, and names that one place', () => {
  const unguarded = typePlaces(everyPath()).filter((p) => !p.guarded);
  // The clean set's 27, five entries of each device and five of the activity and twelve of the maps, and the
  // 14 everyPath adds to device 1 and the activity.
  assert.equal(unguarded.length, 41);
  for (const p of unguarded) {
    const named = [['missing type', 'refused', p.document, `${p.path}.__type`]];
    assert.deepEqual(places(changed(p.document, p.path, (c, k) => { delete c[k].__type; })), named, `${p.path} absent`);
    for (const [how, value] of [['null', null], ['true', true], ['false', false], ['an object', {}], ['an array', []]] as const) {
      assert.deepEqual(places(changed(p.document, p.path, (c, k) => { c[k].__type = value; })), named, `${p.path} ${how}`);
    }
    // The entry itself not an object: the name is read off it, and the place is named without the field.
    for (const [how, value] of [['null', null], ['a string', 'IRPressAction'], ['a number', 3], ['an array', []]] as const) {
      assert.deepEqual(places(changed(p.document, p.path, (c, k) => { c[k] = value; })), [['missing type', 'refused', p.document, p.path]], `${p.path} entry ${how}`);
    }
    // The controls: a number is searched as its digits and an unknown name is logged; neither raises.
    for (const value of [7, 'NoSuchKind']) {
      assert.deepEqual(places(changed(p.document, p.path, (c, k) => { c[k].__type = value; })), [], `${p.path} ${String(value)}`);
    }
  }
});

test('a button\'s three actions, which the reader tests for a type name first, are refused only for one the search raises on', () => {
  // The engine's reader's findings: since 6.10.2 the gate also refuses a press on an activity's map without a
  // type name, which the screens search, and that is asserted with the screens' rows below.
  const places = (d: Json) => readerRaises(d as SyncDocuments).map((f) => [f.rule, f.effect, f.document, f.path]);
  const guarded = typePlaces(everyPath()).filter((p) => p.guarded);
  // The six short presses the clean maps state as objects, the Red key's being null, its long press and the
  // added double press.
  assert.deepEqual(guarded.map((p) => p.path.replace(/.*\./, '')).sort(), [
    'ButtonAction', 'ButtonAction', 'ButtonAction', 'ButtonAction', 'ButtonAction', 'ButtonAction', 'ButtonDoublePressAction', 'ButtonLongPressAction',
  ]);
  for (const p of guarded) {
    // Absent, `false`, a number and an unknown name pass: the first two fail the test, the others are searched.
    assert.deepEqual(places(changed(p.document, p.path, (c, k) => { delete c[k].__type; })), [], `${p.path} absent`);
    for (const value of [false, 7, 'NoSuchKind']) {
      assert.deepEqual(places(changed(p.document, p.path, (c, k) => { c[k].__type = value; })), [], `${p.path} ${String(value)}`);
    }
    for (const [how, value] of [['null', null], ['true', true], ['an object', {}], ['an array', []]] as const) {
      assert.deepEqual(places(changed(p.document, p.path, (c, k) => { c[k].__type = value; })), [['missing type', 'refused', p.document, `${p.path}.__type`]], `${p.path} ${how}`);
    }
  }
});

test('a list the reader does not read for that feature or value is not refused for an untyped action, and a protocol is not walked', () => {
  const untyped = { Order: 0, IRCommandName: 'OK' };
  // An input feature's actions on a power feature: never read, so not refused; on the input feature, refused.
  assert.deepEqual(places(broken((x) => { firstDevice(x).DeviceFeatures[0].Inputs = [{ InputName: 'X', InputOrder: 0, Actions: [untyped] }]; })), []);
  assert.deepEqual(places(broken((x) => { firstDevice(x).DeviceFeatures[1].Inputs[0].Actions = [untyped]; })).map((f) => f[3]),
    ['DevicesWithFeatures[0].DeviceFeatures[1].Inputs[0].Actions[0].__type']);
  // A state value's actions are read for action set types 1 and 2 alone.
  const state = (ActionSetType: number) => broken((x) => {
    firstDevice(x).DeviceFeatures.push({ __type: 'InternalStateFeature', StateName: 'Mode', StateValues: [{ StateValueName: 'A', ActionSetType, Actions: [untyped] }] });
  });
  assert.deepEqual(places(state(0)), []);
  assert.deepEqual(places(state(3)), []);
  assert.deepEqual(places(state(2)).map((f) => f[3]), ['DevicesWithFeatures[0].DeviceFeatures[3].StateValues[0].Actions[0].__type']);
  // The kind is a substring of the name, as the reader searches it: a namespaced power feature reads its lists.
  assert.deepEqual(places(broken((x) => {
    Object.assign(firstDevice(x).DeviceFeatures[0], { __type: 'Logitech.Harmony.PowerFeature:#Logitech', PowerOffActions: [untyped] });
  })).map((f) => f[3]), ['DevicesWithFeatures[0].DeviceFeatures[0].PowerOffActions[0].__type']);
  // A protocol's name is compared, not searched, so its absence raises nothing and no place is a protocol.
  const protocol = broken((x) => { delete x.ProtocolList.Protocols[0].__type; });
  assert.equal(typePlaces(protocol).some((p) => p.document === 'ProtocolList'), false);
  assert.equal(findingsByRule(refusalsBeforeASync(protocol))['missing type'], undefined);
});

test('the check alone reports a missing type name too, so a caller of the check is told', () => {
  const d = broken((x) => { delete x.MapList.ButtonMaps[0].Buttons[0].__type; });
  assert.deepEqual(check(d), { 'missing type': 1 });
  assert.deepEqual(checkTypes(d as SyncDocuments).map((f) => f.path), ['ButtonMaps[0].Buttons[0].__type']);
  // And it runs beside the list check: a set missing a list and a type name is told both at once.
  const both = broken((x) => { delete x.MapList.ButtonMaps[1].Buttons; delete activity(x).Roles[0].__type; });
  assert.deepEqual(findingsByRule(refusalsBeforeASync(both)), { 'missing list': 1, 'missing type': 1 });
});

/** Every object holding a `__type` key anywhere in a document, counted by a walk that knows nothing of the reader. */
function typedObjects(x: unknown): number {
  if (Array.isArray(x)) return x.reduce((n: number, y) => n + typedObjects(y), 0);
  if (typeof x !== 'object' || x === null) return 0;
  return (Object.prototype.hasOwnProperty.call(x, '__type') ? 1 : 0) + Object.values(x).reduce((n: number, y) => n + typedObjects(y), 0);
}

test('Logitech\'s recorded sets down pass the type rule and the gate, and the walk meets every type name they carry but the protocols\'', lab.skipUnless(FULL, TRIAL), () => {
  for (const [fixture, walked, guarded, protocols] of [[FULL, 1404, 662, 5], [TRIAL, 539, 241, 3]] as const) {
    const d = documentsOfAnswers(answersOf(fixture));
    assert.deepEqual(checkTypes(d), [], fixture);
    assert.deepEqual(refusalsBeforeASync(d), [], fixture);
    const found = typePlaces(d);
    assert.equal(found.length, walked, fixture);
    assert.equal(found.filter((p) => p.guarded).length, guarded, fixture);
    // The closure, per document: the blind count equals the walk's, and in the protocol list, which the walk
    // leaves out because the reader compares its names, the blind count is the protocols.
    for (const document of ['DeviceList', 'ActivityList', 'MapList', 'ProtocolList'] as const) {
      const blind = typedObjects(d[document]);
      const ours = found.filter((p) => p.document === document).length;
      assert.equal(blind, document === 'ProtocolList' ? protocols : ours, `${fixture} ${document}`);
    }
    assert.equal(found.filter((p) => p.document === 'ProtocolList').length, 0);
  }
});

// ---------------------------------------------------------------------------------------------------
// Every other field the load raises on, `checkFields`; the argument is this file's header
// ---------------------------------------------------------------------------------------------------

const atom = (Type: number, Value: number): Json => ({ Type, Value, MinValue: null, MaxValue: null });

/**
 * `everyPath` with a value at every place `checkFields` reads that the clean set leaves empty: an activity's
 * alternatives as text, a code segment, a home control action with targets, a program action, a fourth map
 * whose identifier holds 16420 with a hard key on it. The control for every refusal below: the gate passes it.
 */
function everyField(): Json {
  const d = everyPath();
  activity(d).Alternatives = '{"devices":null,"inputs":null}';
  d.ProtocolList.Protocols[0].CodeSegments = [{ Name: 'Synthetic 8 Bit', TotalLength: 1000, Atoms: [atom(1, 500)] }];
  d.MapList.ButtonMaps[1].Buttons.push(entry(1, { __type: 'ButtonHomeControlAction', EventType: 1, Targets: [{ Id: 1 }, {}, []] }));
  d.MapList.ButtonMaps[1].Buttons.push(entry(2, { __type: 'ButtonProgramAction', EventType: 1, ProgramId: 4 }));
  d.MapList.ButtonMaps.push({ __type: 'ActivityButtonMap', ButtonMapIdentifier: '16420Activity7', 'ActivityId-': 7, Sequences: null, Buttons: [key('Menu', commandAction(1, 'OK'))] });
  return d;
}

/** A copy of `everyField` with the value at a path set, or taken out when it is undefined. */
const withValue = (document: string, path: string, value: unknown): Json => {
  const d = everyField();
  const [container, k] = locate(d, document, path);
  if (value === undefined) delete container[k]; else container[k] = value;
  return d;
};

/**
 * One place per row: where the value sits, the values the reader raises on, each with the rule and the place
 * the finding names (the value's own path unless stated), and the values it takes. The values are the
 * reader's, `6.10-reader-raises.md`; `ABSENT` is the key taken out.
 */
const ABSENT = undefined;
type Row = { document: string; path: string; rule: string; bad: readonly unknown[]; good: readonly unknown[]; named?: string };
const NOT_AN_OBJECT = [null, 'x', 3, true, []] as const;
const DEVICE = 'DevicesWithFeatures[0]';
const ROWS: readonly Row[] = [
  // DeviceList, `getDevicesConfiguration`, `getCommandsAndToggleBytes`, `getStatesConfiguration`, `postLoad`.
  { document: 'DeviceList', path: DEVICE, rule: 'entry not an object', bad: NOT_AN_OBJECT, good: [] },
  { document: 'DeviceList', path: `${DEVICE}.Device.DeviceType`, rule: 'not a number', bad: [null, 'x', '1', true, {}], good: [0, 5] },
  { document: 'DeviceList', path: `${DEVICE}.Device.Transport`, rule: 'not a number', bad: [null, '1', true, []], good: [1, 65] },
  { document: 'DeviceList', path: `${DEVICE}.Device.Manufacturer`, rule: 'not text', bad: [null, true, {}, []], good: ['Other', 7] },
  { document: 'DeviceList', path: `${DEVICE}.Device.Model`, rule: 'not text', bad: [null, true, {}, []], good: [ABSENT, false, 'Other', 7] },
  { document: 'DeviceList', path: `${DEVICE}.Commands`, rule: 'not a list', bad: [null, 'x', 3, true], good: [ABSENT, false, {}] },
  { document: 'DeviceList', path: `${DEVICE}.Commands[0]`, rule: 'entry not an object', bad: NOT_AN_OBJECT, good: [] },
  { document: 'DeviceList', path: `${DEVICE}.Commands[0].Name`, rule: 'not text', bad: [ABSENT, null, true, {}, []], good: ['Other', 5] },
  { document: 'DeviceList', path: `${DEVICE}.Commands[0].Raw`, rule: 'not text', bad: [true, {}, []], good: [null, 'x', 5] },
  { document: 'DeviceList', path: `${DEVICE}.Commands[0].TransportType`, rule: 'not a number', bad: [null, '1', true], good: [1, 2] },
  { document: 'DeviceList', path: `${DEVICE}.DeviceFeatures[1].Inputs[0]`, rule: 'entry not an object', bad: NOT_AN_OBJECT, good: [] },
  { document: 'DeviceList', path: `${DEVICE}.DeviceFeatures[1].Inputs[0].InputOrder`, rule: 'required field', bad: [ABSENT], good: [0, 7.5] },
  { document: 'DeviceList', path: `${DEVICE}.DeviceFeatures[1].Inputs[0].InputOrder`, rule: 'not a number', bad: [null, '0', true], good: [] },
  { document: 'DeviceList', path: `${DEVICE}.DeviceFeatures[1].Inputs[0].InputName`, rule: 'required field', bad: [ABSENT], good: [null, 'Other'] },
  { document: 'DeviceList', path: `${DEVICE}.DeviceFeatures[3].StateValues[0]`, rule: 'entry not an object', bad: [null, 3, true], good: ['x', []] },
  { document: 'DeviceList', path: `${DEVICE}.DeviceFeatures[3].StateValues[0].StateValueName`, rule: 'required field', bad: [ABSENT], good: [null, 'Other'] },
  { document: 'DeviceList', path: `${DEVICE}.DeviceFeatures[0].PowerOnActions[0].IRCommandName`, rule: 'not text', bad: [true, {}, []], good: [ABSENT, null, false, 'OK', 5] },
  // ActivityList, `getActivitiesConfiguration`, `getActivityAction`.
  { document: 'ActivityList', path: 'Activities[0]', rule: 'entry not an object', bad: NOT_AN_OBJECT, good: [] },
  { document: 'ActivityList', path: 'Activities[0].ActivityGroup', rule: 'not a number', bad: [null, '1', true, {}], good: [0, 4] },
  { document: 'ActivityList', path: 'Activities[0].Alternatives', rule: 'alternatives not an object', bad: ['5', 'true', 'null'], good: [ABSENT, null, '"x"', '[1]', 'not json', '{}'] },
  { document: 'ActivityList', path: 'Activities[0].EnterActions[0].Duration', rule: 'not a number', bad: [ABSENT, null, '2', true], good: [0, 2.5] },
  { document: 'ActivityList', path: 'Activities[0].EnterActions[0].ActionOrder', rule: 'not a number', bad: [null, '5', true], good: [9] },
  { document: 'ActivityList', path: 'Activities[0].EnterActions[1].CommandName', rule: 'not text', bad: [null, true, {}], good: [false, 'Mute', 5] },
  // MapList, `getButtonMaps`, `getButtonActions`, `setHomeControlActions`, `getSequenceActions`.
  { document: 'MapList', path: 'ButtonMaps[0].ButtonMapIdentifier', rule: 'required field', bad: [ABSENT], good: [null, true, 5] },
  { document: 'MapList', path: 'ButtonMaps[2].ButtonMapIdentifier', rule: 'required field', bad: [ABSENT], good: [5] },
  { document: 'MapList', path: 'ButtonMaps[2].ButtonMapIdentifier', rule: 'not text', bad: [null, true, {}], good: [] },
  { document: 'MapList', path: 'ButtonMaps[0].Buttons[0].ButtonKey', rule: 'required field', bad: [ABSENT], good: [null, 5] },
  { document: 'MapList', path: 'ButtonMaps[0].Buttons[1].MenuItem', rule: 'required field', bad: [ABSENT, null, 3, true], good: [] },
  { document: 'MapList', path: 'ButtonMaps[0].Buttons[1].MenuItem', rule: 'required field', bad: ['x', {}, []], good: [], named: 'ButtonMaps[0].Buttons[1].MenuItem.IndexInMenu' },
  { document: 'MapList', path: 'ButtonMaps[0].Buttons[1].MenuItem.IndexInMenu', rule: 'required field', bad: [ABSENT], good: [null, 'x'] },
  { document: 'MapList', path: 'ButtonMaps[2].Buttons[2].MenuItem.IndexInMenu', rule: 'required field', bad: [ABSENT], good: [] },
  { document: 'MapList', path: 'ButtonMaps[1].Buttons[1].MenuItem.IndexInMenu', rule: 'required field', bad: [ABSENT], good: [] },
  { document: 'MapList', path: 'ButtonMaps[1].Buttons[2].MenuItem.IndexInMenu', rule: 'required field', bad: [ABSENT], good: [] },
  { document: 'MapList', path: 'ButtonMaps[3].Buttons[0].ButtonKey', rule: 'not text', bad: [ABSENT, null, true, {}], good: ['Back', 5] },
  { document: 'MapList', path: 'ButtonMaps[0].Buttons[0].ButtonAction.CommandName', rule: 'not text', bad: [null, true, {}], good: [false, 5] },
  { document: 'MapList', path: 'ButtonMaps[1].Buttons[1].ButtonAction.Targets', rule: 'not a list', bad: [null, 'x', 3, true], good: [ABSENT, false, [], {}] },
  { document: 'MapList', path: 'ButtonMaps[1].Buttons[1].ButtonAction.Targets[0]', rule: 'entry not an object', bad: [null, 'x', 3, true], good: [false, [], {}] },
  { document: 'MapList', path: 'ButtonMaps[2].Sequences[0]', rule: 'entry not an object', bad: NOT_AN_OBJECT, good: [] },
  { document: 'MapList', path: 'ButtonMaps[2].Sequences[0].Actions[0].Order', rule: 'not a number', bad: [null, '2', true], good: [7] },
  { document: 'MapList', path: 'ButtonMaps[2].Sequences[0].Actions[0].CommandName', rule: 'not text', bad: [null, true, []], good: [false, 'OK', 5] },
  { document: 'MapList', path: 'ButtonMaps[2].Sequences[0].Actions[1].Duration', rule: 'not a number', bad: [ABSENT, null, '2', true], good: [0, 1.5] },
  // ProtocolList, `initializeFromHarmonyProtocol`, `addIRSegments`, `addCodeSegments`, `getSegmentId`, `processAtoms`.
  { document: 'ProtocolList', path: 'Protocols[0]', rule: 'entry not an object', bad: [null, 3, true], good: ['x', []] },
  { document: 'ProtocolList', path: 'Protocols[0].CarrierFrequency', rule: 'not a number', bad: [ABSENT, null, '38000', true], good: [36000, 0] },
  { document: 'ProtocolList', path: 'Protocols[0].IRSegments', rule: 'missing list', bad: [ABSENT, null, 'x', 3], good: [{}] },
  { document: 'ProtocolList', path: 'Protocols[0].CodeSegments', rule: 'missing list', bad: [ABSENT, null, 'x', 3], good: [[], {}] },
  { document: 'ProtocolList', path: 'Protocols[0].IRSegments[0]', rule: 'entry not an object', bad: NOT_AN_OBJECT, good: [] },
  { document: 'ProtocolList', path: 'Protocols[0].CodeSegments[0]', rule: 'entry not an object', bad: NOT_AN_OBJECT, good: [] },
  { document: 'ProtocolList', path: 'Protocols[0].IRSegments[0].Name', rule: 'not text', bad: [ABSENT, null, 5, true], good: ['Other', 'Synthetic KeyCode2'] },
  { document: 'ProtocolList', path: 'Protocols[0].Name', rule: 'not text', bad: [ABSENT, null, 5], good: ['Other'] },
  { document: 'ProtocolList', path: 'Protocols[0].IRSegments[0].Payload', rule: 'required field', bad: [ABSENT, null, 3, 'x', []], good: [] },
  { document: 'ProtocolList', path: 'Protocols[0].IRSegments[0].Payload.Encodings', rule: 'missing list', bad: [ABSENT, null, 'x'], good: [[], {}] },
  { document: 'ProtocolList', path: 'Protocols[0].IRSegments[0].Payload.Encodings[0]', rule: 'entry not an object', bad: NOT_AN_OBJECT, good: [] },
  { document: 'ProtocolList', path: 'Protocols[0].IRSegments[0].Payload.Encodings[0].BitType', rule: 'not a number', bad: [ABSENT, null, '0'], good: [7] },
  { document: 'ProtocolList', path: 'Protocols[0].IRSegments[0].Payload.Encodings[0].Atoms', rule: 'not a list', bad: [null, 'x', 3, true], good: [ABSENT, false, [], {}] },
  { document: 'ProtocolList', path: 'Protocols[0].IRSegments[0].Header', rule: 'not a list', bad: [null, 'x', 3, true], good: [ABSENT, false, []] },
  { document: 'ProtocolList', path: 'Protocols[0].IRSegments[0].Trailer', rule: 'not a list', bad: [null, 'x'], good: [ABSENT, false] },
  { document: 'ProtocolList', path: 'Protocols[0].CodeSegments[0].Atoms', rule: 'not a list', bad: [null, 'x'], good: [ABSENT, false] },
  { document: 'ProtocolList', path: 'Protocols[0].IRSegments[0].Header[0]', rule: 'entry not an object', bad: NOT_AN_OBJECT, good: [] },
  { document: 'ProtocolList', path: 'Protocols[0].IRSegments[0].Header[0].Value', rule: 'not a number', bad: [ABSENT, null, '9000', true], good: [0, 40000] },
  { document: 'ProtocolList', path: 'Protocols[0].CodeSegments[0].TotalLength', rule: 'not a number', bad: [ABSENT, null, '5'], good: [0] },
];

test('the set holding a value at every place the load raises on passes the gate, and every row is a different place', () => {
  assert.deepEqual(refusalsBeforeASync(everyField()), []);
  assert.deepEqual(findingsByRule(checkConfiguration(readConfiguration(everyField()))), { 'map identifier': 1 }, 'the 16420 map is reached by no press, which the remote ignores');
  // 60 rows; two places carry two rules each and one place two rows of one rule that name different paths, so
  // 59 distinct place and rule pairs. A row added twice would show as a pair counted twice.
  assert.equal(ROWS.length, 60);
  assert.equal(new Set(ROWS.map((r) => `${r.document} ${r.path} ${r.rule}`)).size, 59);
});

test('the gate refuses each value the load raises on, at its one place and by its one rule, and passes each value the load takes', () => {
  for (const row of ROWS) {
    for (const value of row.bad) {
      assert.deepEqual(places(withValue(row.document, row.path, value)), [[row.rule, 'refused', row.document, row.named ?? row.path]], `${row.path} ${JSON.stringify(value) ?? 'absent'}`);
    }
    for (const value of row.good) {
      assert.deepEqual(places(withValue(row.document, row.path, value)), [], `${row.path} ${JSON.stringify(value) ?? 'absent'} passes`);
    }
  }
});

test('a button without a name is refused only when it ends with an action, by the reader\'s own test of that', () => {
  // The engine's reader's findings: the screens refuse a screen entry of an activity's map without an index
  // whatever its action, since 6.10.2, which the screens' rows below assert.
  const places = (d: Json) => readerRaises(d as SyncDocuments).map((f) => [f.rule, f.effect, f.document, f.path]);
  const nameless = (change: (b: Json, m: Json) => void): Json => {
    const d = everyField();
    const m = d.MapList.ButtonMaps[2];
    delete m.Buttons[2].MenuItem.IndexInMenu;
    change(m.Buttons[2], m);
    return places(d);
  };
  const refused = [['required field', 'refused', 'MapList', 'ButtonMaps[2].Buttons[2].MenuItem.IndexInMenu']];
  // A sequence gives an action when the map's sequence of that id has a step.
  assert.deepEqual(nameless(() => {}), refused);
  assert.deepEqual(nameless((b) => { b.ButtonAction.SequenceId = 99; }), []);
  assert.deepEqual(nameless((_, m) => { m.Sequences[0].Actions = []; }), []);
  // No press, or a press of a kind that gives nothing, or one without a type name; a long press counts.
  assert.deepEqual(nameless((b) => { b.ButtonAction = null; }), []);
  for (const kind of ['ButtonClientAction', 'ButtonChannelAction', 'ButtonBookmarkAction', 'NoSuchKind']) {
    assert.deepEqual(nameless((b) => { b.ButtonAction = { __type: kind }; }), [], kind);
  }
  assert.deepEqual(nameless((b) => { b.ButtonAction = { EventType: 0 }; }), []);
  assert.deepEqual(nameless((b) => { b.ButtonLongPressAction = b.ButtonAction; b.ButtonAction = null; }), refused);
  // A double press alone does not make a button kept.
  assert.deepEqual(nameless((b) => { b.ButtonDoublePressAction = b.ButtonAction; b.ButtonAction = null; }), []);
  // A program gives one when it states a program.
  for (const ProgramId of [null, false, ABSENT]) {
    assert.deepEqual(nameless((b) => { b.ButtonAction = { __type: 'ButtonProgramAction', ProgramId }; }), [], String(ProgramId));
  }
  // An unknown kind of button keeps the empty name and is never refused.
  assert.deepEqual(nameless((b) => { b.__type = 'NoSuchButton'; }), []);
});

test('a device the start\'s fixes take for a Wii is refused without a power state, and only that device', () => {
  const wii = (change: (device: Json, protocol: Json) => void): Json => {
    const d = everyField();
    const protocol = { __type: 'BluetoothProtocol', 'Id-': 901, Name: 'WiiBT 6 Bit' };
    const device = {
      Device: { 'Id-': 3, Name: 'Console', Manufacturer: 'Synthetic', Model: 'W', ParentDeviceModel: 'Wii', DeviceType: 9, Transport: 9, PressMinRepeats: null, InterDeviceDelay: 0 },
      DeviceFeatures: [] as Json[],
      Commands: [{ Name: 'Home', KeyCode: 'x', ProtocolId: 901, TransportType: 8, Raw: null }],
    };
    change(device, protocol);
    d.DeviceList.DevicesWithFeatures.push(device);
    d.ProtocolList.Protocols.push(protocol);
    d.MapList.ButtonMaps.push({ __type: 'DeviceButtonMap', ButtonMapIdentifier: mapIdentifier('device', '3'), 'DeviceId-': 3, Sequences: null, Buttons: [] });
    return places(d);
  };
  assert.deepEqual(wii(() => {}), [['no power state', 'refused', 'DeviceList', 'DevicesWithFeatures[2]']]);
  // A keyboard command, 32, is taken the same way.
  assert.deepEqual(wii((d) => { d.Commands[0].TransportType = 32; }).length, 1);
  // A power feature, or an internal state named Power, is a power state.
  assert.deepEqual(wii((d) => { d.DeviceFeatures.push({ __type: 'PowerFeature', PowerTypeId: 2 }); }), []);
  assert.deepEqual(wii((d) => { d.DeviceFeatures.push({ __type: 'InternalStateFeature', StateName: 'Power', StateValues: [] }); }), []);
  assert.deepEqual(wii((d) => { d.DeviceFeatures.push({ __type: 'InternalStateFeature', StateName: 'Mode', StateValues: [] }); }).length, 1);
  // Not a Bluetooth device, no Bluetooth or keyboard command, or another protocol: not a Wii.
  assert.deepEqual(wii((d) => { d.Device.Transport = 1; }), []);
  assert.deepEqual(wii((d) => { d.Commands[0].TransportType = 1; }), []);
  assert.deepEqual(wii((_, p) => { p.Name = 'PlayStationBT 26 Bit'; }), []);
});

test('the check alone reports the fields too, and the gate tells them with a missing list and a type name at once', () => {
  assert.deepEqual(check(withValue('DeviceList', `${DEVICE}.Device.DeviceType`, '1')), { 'not a number': 1, 'map identifier': 1 });
  const all = withValue('ActivityList', 'Activities[0].ActivityGroup', null);
  delete all.MapList.ButtonMaps[1].Buttons;
  delete activity(all).Roles[0].__type;
  assert.deepEqual(findingsByRule(refusalsBeforeASync(all)), { 'missing list': 1, 'missing type': 1, 'not a number': 1 });
  assert.deepEqual(readerRaises(all).map((f) => f.rule), ['missing list', 'missing type', 'not a number']);
});

/** The lab's sets of ours that went to the bench unit, as documents. */
const OUR_SETS = ['touch_own_set', 'touch_changed_set_delay', 'touch_changed_set_delay_back', 'touch_changed_set_label', 'touch_changed_set_label_back'] as const;
const setDocuments = (fixture: string): SyncDocuments =>
  documentsOfAnswers((JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as { answers: SyncAnswer[] }).answers);

test('Logitech\'s recorded sets down and the five sets of ours a remote committed pass every rule of the load and the gate', lab.skipUnless(FULL, TRIAL, ...OUR_SETS), () => {
  for (const fixture of [FULL, TRIAL]) {
    const d = documentsOfAnswers(answersOf(fixture));
    assert.deepEqual(checkFields(d), [], fixture);
    assert.deepEqual(refusalsBeforeASync(d), [], fixture);
  }
  for (const fixture of OUR_SETS) {
    const d = setDocuments(fixture);
    assert.deepEqual(readerRaises(d), [], fixture);
    assert.deepEqual(refusalsBeforeASync(d), [], fixture);
  }
});

// ---------------------------------------------------------------------------------------------------
// The screens' own reads, `screens raise`; the argument is this file's header
// ---------------------------------------------------------------------------------------------------

const USER = 'content://1.0/user;profile/user/1';
const DIAL = 'content://1.0/device;profile/device/1';
const LINE_UP = 'content://1.0/service/svc';

/**
 * `everyField` with a background, a picture of the user's and an activity picture fetched from an address; and
 * for 6.10.2 a ranked channel, a Bluetooth device, a root map with a hard key, and the activity's start screen
 * the gesture pad, with a gesture of each kind the pad names on the activity's map: a command with a long press,
 * and a play and pause.
 */
function everyScreen(): Json {
  const d = everyField();
  d.Settings.Settings.push({ Name: 'BackgroundImage', SettingId: 5, Values: ['background.png'], DefaultValue: null, MinCount: 1, MaxCount: 1 });
  d.Settings.Settings.push({ Name: 'UserImages', SettingId: 6, Values: ['mine.png'], DefaultValue: null, MinCount: 0, MaxCount: 5 });
  Object.assign(activity(d), { ImageKey: 'Activity/watch.png', BaseImageUri: 'images/', StartScreen: 'Gesturepad' });
  d[LINE_UP].channels[0].popularRank = 1;
  d.DeviceList.DevicesWithFeatures.push({
    Device: { 'Id-': 3, Name: 'Console', Manufacturer: 'Synthetic', Model: 'W', ParentDeviceModel: 'Wii', DeviceType: 9, Transport: 8, PressMinRepeats: null, InterDeviceDelay: 0 },
    DeviceFeatures: [], Commands: [],
  });
  d.MapList.ButtonMaps.push({ __type: 'DeviceButtonMap', ButtonMapIdentifier: mapIdentifier('device', '3'), 'DeviceId-': 3, Sequences: null, Buttons: [] });
  d.MapList.ButtonMaps.push({ __type: 'RootButtonMap', ButtonMapIdentifier: 'Root', Sequences: null, Buttons: [key('HomeControl1', commandAction(1, 'OK'))] });
  d.MapList.ButtonMaps[2].Buttons.push(
    { ...key('SwipeUp', commandAction(1, 'OK')), __type: 'GestureRemoteButton', ButtonLongPressAction: commandAction(1, 'Mute') },
    { ...key('Tap', { __type: 'ButtonClientAction', EventType: 0, ActionName: 'PLAY_PAUSE_TOGGLE' }), __type: 'GestureRemoteButton' },
  );
  return d;
}

const withScreenValue = (document: string, path: string, value: unknown): Json => {
  const d = everyScreen();
  const [container, k] = locate(d, document, path);
  if (value === undefined) delete container[k]; else container[k] = value;
  return d;
};

const SCREEN_ROWS: readonly Omit<Row, 'rule'>[] = [
  { document: 'Settings', path: 'Settings[0]', bad: [null, 3, true], good: ['x', []] },
  { document: 'Settings', path: 'Settings[0].Values', bad: [ABSENT, null, 3, true], good: ['x', []] },
  { document: 'Settings', path: 'Settings[4].Values[0]', bad: [null, true, false, {}, []], good: ['other.png', 5] },
  { document: 'Settings', path: 'Settings[5].Values[0]', bad: [null, true, {}], good: ['other.png', 5] },
  { document: 'Settings', path: 'UserImageBucketUri', bad: [ABSENT, null, 5], good: ['other/'] },
  { document: 'Settings', path: 'DefaultImageBucketUri', bad: [ABSENT, null, 5], good: ['other/'] },
  { document: 'Context', path: 'Language', bad: [null, true, {}, 'en', 5], good: [ABSENT, 'nl-NL'] },
  { document: 'Context', path: 'HouseholdUserProfileUri', bad: [null, true, {}], good: [false] },
  { document: 'ActivityList', path: 'Activities[0].ActivityOrder', bad: [ABSENT, null, '0', true, {}], good: [3, -1] },
  { document: 'ActivityList', path: 'Activities[0].Name', bad: [ABSENT, null, true, {}, []], good: ['Other', 5] },
  { document: 'ActivityList', path: 'Activities[0].ImageKey', bad: [true, {}, []], good: [ABSENT, null, false, 'Activity/other.png'] },
  { document: 'ActivityList', path: 'Activities[0].BaseImageUri', bad: [ABSENT, null, true, {}], good: ['other/', 5] },
  // An object of roles is a table and passes here; on this set the gesture pad's play and pause then finds no
  // role, which the test below asserts with the object.
  { document: 'ActivityList', path: 'Activities[0].Roles', bad: [ABSENT, null, 'x', 3, true, false], good: [] },
  { document: 'ActivityList', path: 'Activities[0].Id-', bad: [ABSENT], good: [8] },
  { document: 'DeviceList', path: `${DEVICE}.Device.Id-`, bad: [ABSENT, null, true, {}, '1(', '%', '[1', ')'], good: [9, 'd9', '1.5-'] },
  { document: 'DeviceList', path: `${DEVICE}.Device.Name`, bad: [null, true, false, {}, []], good: [ABSENT, 'Other', 5] },
  { document: 'MapList', path: 'ButtonMaps[0].Buttons[1].TextOnRemote', bad: [ABSENT, null, true, {}], good: ['Other', 5] },
  { document: 'MapList', path: 'ButtonMaps[2].Sequences[0].Name', bad: [null, true, {}], good: [ABSENT, false, 'Other', 5] },
  // 6.10.2, the places whose cost is the screens deaf to the engine until a restart, and the places found while
  // re-reading those rows whose cost is the program ending or the error screen at every start.
  { document: 'Context', path: 'AccountId-', bad: [null, true, false, {}], good: [ABSENT, 7, 'a7'] },
  { document: 'Context', path: 'SetupSession', bad: [null, 3, true], good: [ABSENT, false, {}, 'x', []] },
  { document: 'Settings', path: 'Settings[5].Values', bad: ['x', ABSENT, null, 3], good: [[], {}] },
  { document: 'ActivityList', path: 'Activities[0].Roles[0].DeviceId-', bad: [ABSENT, null, true, {}], good: [2, '2'] },
  { document: 'ActivityList', path: 'Activities[0].Roles[0].SelectedInput', bad: [3, true], good: [ABSENT, null, false, 'TV', {}] },
  { document: 'DeviceList', path: 'DevicesWithFeatures[2].Device.ParentDeviceModel', bad: [ABSENT, null, true, {}, 'Other', 5, 'wii'], good: ['Wii U', 'Wii mini', 'PlayStation 3 Slim', 'playstation 4', 'Amazon Fire TV', 'Nexus Player'] },
  { document: 'MapList', path: 'ButtonMaps[2].Buttons[2].MenuItem.IndexInMenu', bad: [null, true, 'x', '0', {}], good: [5, 0.5] },
  { document: 'MapList', path: 'ButtonMaps[2].Buttons[2].ButtonAction', bad: [ABSENT, null, 3, 'x', [], { SequenceId: 3 }, { __type: false, SequenceId: 3 }], good: [{ __type: 'NoSuchKind' }, { __type: 7 }] },
  { document: 'MapList', path: 'ButtonMaps[2].Buttons[0].ButtonAction', bad: [ABSENT, null, 'x', [], { CommandName: 'Mute' }], good: [{ __type: 'NoSuchKind' }] },
  { document: 'MapList', path: 'ButtonMaps[0].Buttons[2].ButtonAction', bad: [ABSENT, null, 3, true], good: ['x', []] },
  { document: 'MapList', path: 'ButtonMaps[0].Buttons[2].ButtonAction.CommandName', bad: ['13', '-1', '1.5', 13, ' 0x10 ', 'inf', 'NaN'], good: ['0', '12', ' 9 ', 0, 'Enter', '', false, ABSENT] },
  { document: 'MapList', path: 'ButtonMaps[5].Buttons[0].ButtonKey', bad: [null, true, {}], good: ['Other', 5] },
  { document: 'MapList', path: 'ButtonMaps[2].Buttons[3].ButtonAction', bad: [[], { CommandName: 'OK' }, { __type: false }, { __type: 'ButtonChannelAction' }, { __type: 7 }], good: [{ __type: 'ButtonSequenceAction', SequenceId: 3 }, { __type: 'ButtonClientAction', ActionName: 'Numpad' }] },
  { document: 'MapList', path: 'ButtonMaps[2].Buttons[3].ButtonKey', bad: ['SwipeUpHold', 'TapHold', 'SwipeRelease', 'DoubleTap'], good: ['SwipeDown', 'Tap', 'Other'] },
  { document: 'MapList', path: 'ButtonMaps[2].Sequences', bad: ['x', 3, true], good: [null, false, [], {}] },
  { document: 'MapList', path: 'ButtonMaps[2].Sequences[0].SequenceId', bad: [ABSENT], good: [null, 9] },
  { document: LINE_UP, path: 'channels[1]', bad: [null, 3, true], good: ['x', {}] },
  { document: LINE_UP, path: 'channels[0].station.id', bad: [ABSENT, null, true, {}], good: ['s7', 7] },
  { document: USER, path: 'preferences', bad: [null, 'x', 5, true, []], good: [ABSENT] },
  { document: USER, path: 'preferences.10', bad: [null, 'x', 5, []], good: [] },
  { document: USER, path: 'preferences.10.svc', bad: [null, 'x', 5], good: [] },
  { document: USER, path: 'preferences.10.svc.stations', bad: [null, 5, true], good: [[], ABSENT] },
  { document: LINE_UP, path: 'channels', bad: [ABSENT, null, 5, 'x'], good: [[], {}] },
  { document: LINE_UP, path: 'channels[0].number', bad: [null, true, {}], good: ['7', 7] },
  { document: LINE_UP, path: 'channels[0].station.shortName', bad: [null, true, {}], good: ['Other', ABSENT] },
  { document: DIAL, path: 'services', bad: [ABSENT, null, 5, 'x'], good: [{}] },
  { document: DIAL, path: 'services.svc', bad: [null, 5, 'x'], good: [] },
  { document: DIAL, path: 'services.svc.dialPositions', bad: [ABSENT, null, 5], good: [[]] },
  { document: DIAL, path: 'services.svc.dialPositions[0]', bad: [null, 'x', 5], good: [] },
  { document: DIAL, path: 'services.svc.dialPositions[0].name', bad: [null, true, {}], good: [ABSENT, 'Other', 5] },
  { document: DIAL, path: 'services.svc.dialPositions[1].image', bad: [null, true, {}], good: [ABSENT, 'other.png'] },
  { document: DIAL, path: 'services.svc.dialPositions[0].number', bad: [null, true, []], good: ['7', 7] },
];

test('the screens: the set with a value at every place they raise on passes the gate, and each value they raise on is refused at its one place', () => {
  assert.deepEqual(refusalsBeforeASync(everyScreen()), []);
  assert.deepEqual(checkScreens(everyScreen()), []);
  assert.equal(SCREEN_ROWS.length, 50);
  for (const row of SCREEN_ROWS) {
    for (const value of row.bad) {
      assert.deepEqual(places(withScreenValue(row.document, row.path, value)), [['screens raise', 'refused', row.document, row.path]], `${row.document} ${row.path} ${JSON.stringify(value) ?? 'absent'}`);
    }
    for (const value of row.good) {
      assert.deepEqual(places(withScreenValue(row.document, row.path, value)), [], `${row.document} ${row.path} ${JSON.stringify(value) ?? 'absent'} passes`);
    }
  }
});

test('the screens: each place is asked only where they read it', () => {
  const screens = (d: Json) => checkScreens(d).map((f) => f.path);
  // An activity picture's address is read in the sync when it is not a string; with a null picture too.
  assert.deepEqual(screens((() => { const d = everyScreen(); Object.assign(activity(d), { ImageKey: null, BaseImageUri: true }); return d; })()), ['Activities[0].BaseImageUri']);
  // Roles are read at start on the activity that tunes channels and on a television activity, which is the error
  // screen; on any other activity, since 6.10.2, when it starts or finishes starting, which is the screens deaf.
  const other = (Type: number, IsTuningDefault: boolean) => {
    const d = everyScreen();
    Object.assign(activity(d), { Type, IsTuningDefault });
    delete activity(d).Roles;
    return checkScreens(d).map((f) => [f.path, f.message.includes('error screen') ? 'error screen' : f.message.includes('stop hearing') ? 'deaf' : 'other']);
  };
  assert.deepEqual(other(1, false), [['Activities[0].Roles', 'error screen']]);
  assert.deepEqual(other(3, true), [['Activities[0].Roles', 'error screen']]);
  assert.deepEqual(other(3, false), [['Activities[0].Roles', 'deaf']]);
  // An activity that does not tune channels may leave its id out, as far as the screens go.
  assert.deepEqual(screens((() => { const d = everyScreen(); activity(d).IsTuningDefault = false; delete activity(d)['Id-']; return d; })()), []);
  // A screen entry's text is read only for an entry with a press, off the number pad, and not hidden.
  for (const change of [(b: Json) => { b.ButtonAction = null; }, (b: Json) => { b.FunctionGroupType = 2; }, (b: Json) => { b.ButtonState = 4; }, (b: Json) => { b.__type = 'HardRemoteButton'; }]) {
    const d = everyScreen();
    const b = d.MapList.ButtonMaps[0].Buttons[1];
    delete b.TextOnRemote;
    change(b);
    assert.deepEqual(screens(d), []);
  }
  // A ranked channel has to state its station; an unranked one need not.
  const ranked = (popularRank: unknown) => { const d = everyScreen(); Object.assign(d[LINE_UP].channels[0], { popularRank, station: null }); return screens(d); };
  assert.deepEqual(ranked(1), ['channels[0].station']);
  assert.deepEqual(ranked(ABSENT), []);
  assert.deepEqual(ranked(null), ['channels[0].station']);
  // No background and no pictures of the user's: neither address is asked.
  const bare = everyScreen();
  bare.Settings.Settings.splice(4, 2);
  delete bare.Settings.UserImageBucketUri;
  delete bare.Settings.DefaultImageBucketUri;
  assert.deepEqual(screens(bare), []);
});

test('the screens, 6.10.2: the places that leave them deaf, and those found beside them, are asked only where the screens read them', () => {
  const screens = (d: Json) => checkScreens(d).map((f) => f.path);
  const variant = (change: (d: Json) => void): Json => { const d = everyScreen(); change(d); return d; };
  const gestureMap = (d: Json) => d.MapList.ButtonMaps[2];
  // Roles that are an object are a table: they pass, unless the gesture pad's play and pause then finds no role.
  assert.deepEqual(screens(variant((d) => { activity(d).Roles = {}; activity(d).StartScreen = 'Commands'; })), []);
  assert.deepEqual(screens(variant((d) => { activity(d).Roles = {}; })), ['ButtonMaps[2].Buttons[4].ButtonAction']);
  // The gesture pad is read only for an activity whose start screen it is.
  assert.deepEqual(screens(variant((d) => { gestureMap(d).Buttons[3].ButtonKey = 'SwipeUpHold'; activity(d).StartScreen = 'Commands'; })), []);
  assert.deepEqual(screens(variant((d) => { gestureMap(d).Sequences[0] = { Name: 'Both', Actions: [] }; activity(d).StartScreen = 'Favorites'; })), []);
  // A held press is kept only under the five gestures that have a held form; a double tap's own press is not.
  assert.deepEqual(screens(variant((d) => { Object.assign(gestureMap(d).Buttons[3], { ButtonKey: 'DoubleTap', ButtonLongPressAction: null }); })), []);
  assert.deepEqual(screens(variant((d) => { Object.assign(gestureMap(d).Buttons[3], { ButtonKey: 'TapHold', ButtonAction: null }); })), ['ButtonMaps[2].Buttons[3].ButtonKey']);
  assert.deepEqual(screens(variant((d) => { gestureMap(d).Buttons[3].ButtonState = 4; gestureMap(d).Buttons[3].ButtonKey = 'SwipeRelease'; })), []);
  // Play and pause needs a role of the activity type's main role whose device has a map.
  for (const change of [(d: Json) => { activity(d).Type = 9; }, (d: Json) => { activity(d).Type = 2; }, (d: Json) => { d.MapList.ButtonMaps[0].ButtonMapIdentifier = 'Device99'; }]) {
    assert.deepEqual(screens(variant(change)), ['ButtonMaps[2].Buttons[4].ButtonAction']);
  }
  assert.deepEqual(screens(variant((d) => { d.MapList.ButtonMaps[0].ButtonMapIdentifier = 'Device1'; })), []);
  // A hard key without a name: the screens' when the engine does not key the key by it, the engine's otherwise.
  const nameless = variant((d) => { delete gestureMap(d).Buttons[0].ButtonKey; });
  assert.deepEqual(places(nameless), [['required field', 'refused', 'MapList', 'ButtonMaps[2].Buttons[0].ButtonKey']]);
  assert.deepEqual(screens(variant((d) => { gestureMap(d).Buttons[0].ButtonAction = { __type: 'ButtonClientAction', ActionName: 'Home' }; delete gestureMap(d).Buttons[0].ButtonKey; })), ['ButtonMaps[2].Buttons[0].ButtonKey']);
  // A press's type name is searched on an activity's map with sequences; without them, only a screen entry's of
  // group 0 has to be indexable, and only on an activity's map.
  assert.deepEqual(screens(variant((d) => { d.MapList.ButtonMaps[3].Buttons[0].ButtonAction = null; })), []);
  assert.deepEqual(screens(variant((d) => { d.MapList.ButtonMaps[3].Buttons.push({ ...entry(4, commandAction(1, 'OK'), 36), ButtonAction: null }); })), []);
  assert.deepEqual(screens(variant((d) => { d.MapList.ButtonMaps[3].Buttons.push({ ...entry(4, commandAction(1, 'OK')), ButtonAction: null }); })), ['ButtonMaps[3].Buttons[1].ButtonAction']);
  assert.deepEqual(screens(variant((d) => { d.MapList.ButtonMaps[0].Buttons[1].ButtonAction = 3; })), []);
  // On an activity's page the press's type name is searched for the entry's picture, sequences or none, unless
  // the entry's text is one of three names; a hidden entry is not drawn.
  const drawn = (TextOnRemote: string, ButtonState = 0) => screens(variant((d) => {
    d.MapList.ButtonMaps[3].Buttons.push({ ...entry(4, { CommandName: 'OK' }), TextOnRemote, ButtonState });
  }));
  assert.deepEqual(drawn('OK'), ['ButtonMaps[3].Buttons[1].ButtonAction']);
  assert.deepEqual(drawn('123'), []);
  assert.deepEqual(drawn('OK', 4), []);
  // A screen entry naming a sequence is kept by its index when the map has sequences, whatever its group or
  // state, where the reorder asks only groups 0 and 36 not hidden; with no action the engine does not ask it.
  const sequenceEntry = (change: (b: Json) => void) => screens(variant((d) => {
    const b = gestureMap(d).Buttons[2];
    b.ButtonAction.SequenceId = 99;
    delete b.MenuItem.IndexInMenu;
    change(b);
  }));
  assert.deepEqual(sequenceEntry((b) => { b.FunctionGroupType = 1; }), ['ButtonMaps[2].Buttons[2].MenuItem.IndexInMenu']);
  assert.deepEqual(sequenceEntry((b) => { b.ButtonState = 4; }), ['ButtonMaps[2].Buttons[2].MenuItem.IndexInMenu']);
  assert.deepEqual(sequenceEntry((b) => { b.FunctionGroupType = 1; b.ButtonAction.__type = 'ButtonCommandAction'; }), []);
  // A screen entry whose press is an array is drawn with its text.
  assert.deepEqual(screens(variant((d) => { Object.assign(d.MapList.ButtonMaps[0].Buttons[1], { ButtonAction: [] }); delete d.MapList.ButtonMaps[0].Buttons[1].TextOnRemote; })), ['ButtonMaps[0].Buttons[1].TextOnRemote']);
  // The index orders an activity's entries unless hidden, and a device's only on an account with no activity
  // listed, where device mode is the first screen; so is every device's model, which picks its picture there.
  assert.deepEqual(screens(variant((d) => { Object.assign(gestureMap(d).Buttons[2], { ButtonState: 4 }); gestureMap(d).Buttons[2].MenuItem.IndexInMenu = 'x'; })), []);
  const deviceMode = (listed: boolean) => checkScreens(variant((d) => {
    d.MapList.ButtonMaps[0].Buttons[1].MenuItem.IndexInMenu = 'x';
    delete firstDevice(d).Device.ParentDeviceModel;
    if (!listed) activity(d).ActivityOrder = -1;
  })).map((f) => [f.path, f.message.includes('error screen')]);
  assert.deepEqual(deviceMode(true), []);
  assert.deepEqual(deviceMode(false), [['DevicesWithFeatures[0].Device.ParentDeviceModel', true], ['ButtonMaps[0].Buttons[1].MenuItem.IndexInMenu', true]]);
  // A Bluetooth keyboard device's model is searched; only a Bluetooth device needs a model with a picture.
  const keyboard = (Transport: number, model: unknown) => screens(variant((d) => { Object.assign(d.DeviceList.DevicesWithFeatures[2].Device, { Transport, ParentDeviceModel: model }); }));
  assert.deepEqual(keyboard(0x20, null), ['DevicesWithFeatures[2].Device.ParentDeviceModel']);
  assert.deepEqual(keyboard(0x20, 'Other'), []);
  assert.deepEqual(keyboard(1, 'Other'), []);
  // A ranked channel's station id names its picture; an unranked one's is not read.
  assert.deepEqual(screens(variant((d) => { delete d[LINE_UP].channels[0].popularRank; d[LINE_UP].channels[0].station.id = null; })), []);
  // A favourites document that is a number or true is read into; false, null and text are not.
  for (const [name, cost] of [[USER, 'ends'], [LINE_UP, 'ends'], [DIAL, 'error screen']] as const) {
    for (const value of [5, true]) {
      const found = checkScreens(variant((d) => { d[name] = value; }));
      assert.deepEqual(found.map((f) => [f.document, f.path, f.message.includes(cost)]), [[name, '', true]], `${name} ${String(value)}`);
    }
    for (const value of [false, null, 'x']) assert.deepEqual(screens(variant((d) => { d[name] = value; })), [], `${name} ${String(value)}`);
  }
  // The deaf places say so in their message.
  assert.match(checkScreens(variant((d) => { d.Context.SetupSession = null; }))[0]!.message, /stop hearing the engine until the remote restarts/);
});

test('the gate tells the engine\'s raises and the screens\' at once, and the five sets of ours and Logitech\'s recorded sets meet none of the screens\'', lab.skipUnless(FULL, TRIAL, ...OUR_SETS), () => {
  const both = withScreenValue('ActivityList', 'Activities[0].Name', null);
  firstDevice(both).Device.DeviceType = 'x';
  assert.deepEqual(findingsByRule(refusalsBeforeASync(both)), { 'not a number': 1, 'screens raise': 1 });
  for (const fixture of [FULL, TRIAL]) assert.deepEqual(checkScreens(documentsOfAnswers(answersOf(fixture))), [], fixture);
  for (const fixture of OUR_SETS) assert.deepEqual(checkScreens(setDocuments(fixture)), [], fixture);
  // 6.10.2's places meet Logitech's documents, so their passing is not for want of anything to read: the full
  // sync's one activity whose start screen is the gesture pad has its map, with a sequence and nine gesture
  // actions, which is also the one activity map with sequences; and a control: that map with its sequences
  // walked as text is refused there.
  const full: Json = documentsOfAnswers(answersOf(FULL));
  const pads = full.ActivityList.Activities.filter((a: Json) => a.StartScreen === 'Gesturepad');
  assert.equal(pads.length, 1);
  const padMaps = full.MapList.ButtonMaps.filter((m: Json) => m.ButtonMapIdentifier === mapIdentifier('activity', String(pads[0]['Id-'])));
  assert.equal(padMaps.length, 1);
  assert.equal(padMaps[0].Sequences.length, 1);
  const actions = padMaps[0].Buttons.filter((b: Json) => String(b.__type).includes('GestureRemoteButton'))
    .flatMap((b: Json) => [b.ButtonAction, b.ButtonLongPressAction, b.ButtonDoublePressAction].filter((x) => typeof x === 'object' && x !== null));
  assert.equal(actions.length, 9);
  assert.equal(full.MapList.ButtonMaps.filter((m: Json) => Array.isArray(m.Sequences) && m.Sequences.length > 0).length, 1);
  padMaps[0].Sequences = 'x';
  assert.deepEqual(checkScreens(full).map((f) => f.path), [`ButtonMaps[${full.MapList.ButtonMaps.indexOf(padMaps[0])}].Sequences`]);
});
