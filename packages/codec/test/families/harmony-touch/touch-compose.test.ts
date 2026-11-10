/**
 * A Harmony Touch device written by us, `src/families/harmony-touch/compose.ts`.
 *
 * **What is held, and against what.** Three things, each by something that did not write the documents:
 *
 * 1. **The codec's own reader and check take the composed documents as a Touch would**: `readConfiguration`
 *    finds the device's map by the identifier the engine builds, every command its definition or its raw
 *    code, every key and list entry its command, and `checkConfiguration` reports nothing. The check is the
 *    reference's rules, "What a writer must carry" and "How a key press becomes a command", so a document it
 *    passes carries every field whose absence the reference reads as stopping the engine.
 * 2. **The shapes are Logitech's**: every field our device record, command, map and button states is one
 *    Logitech's own of the same kind states in the full sync measured (field names, not values: Logitech's
 *    devices state `ControlPort` 7 on five of seven where ours state 0, and one of their maps states
 *    `ButtonState` 1 and event 0 throughout, where ours state 0 and 1), the list entries count from the same
 *    first index as theirs, and a press is the event number theirs carry. A field of our own invention
 *    would be one the remote has never been shown.
 * 3. **The 26 key names are the ones the measured documents use**, so a key binding of ours names a key
 *    the engine knows.
 *
 * **Negatives**: two names differing only in case, a key naming a command the device lacks and a key name
 *    no document uses are refused at composing; a definition left out of the protocol list is caught by the
 *    check, so the positive above is not the check passing everything.
 *
 * **What is not held**: anything on a remote. No composed document has been put on a Touch, since no write
 * path exists, decision 29; that the engine accepts a device with no features, or a field of Logitech's
 * records being absent, is the reference's reading of the engine and not a measurement.
 *
 * The full sync holds the test account's data, so the lab half asserts names and counts and prints nothing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { checkConfiguration } from '../../../src/families/harmony-touch/check.ts';
import {
  codeOfLearned, ComposeRefusal, composeTouchDevice, keysByName, BUTTON_KEYS, type OwnDevice,
} from '../../../src/families/harmony-touch/compose.ts';
import { rawOfLearned, readTouchRaw } from '../../../src/families/harmony-touch/learned.ts';
import { waveformOfArchiveCommand } from '../../../src/catalogue/archive.ts';
import { mergedIntervals, type Pulse } from '../../../src/infrared/irframe.ts';
import { pulsesOfStatedRow, statedProtocol } from '../../../src/infrared/stated.ts';
import { documentsOfAnswers, kindOf, type IrProtocol, type SyncDocuments } from '../../../src/families/harmony-touch/documents.ts';
import { readConfiguration } from '../../../src/families/harmony-touch/read.ts';
import { answersOf, FULL } from './touch-sync.ts';

/**
 * A definition written by hand for the test, a pulse distance family of 32 bits under a name of our own:
 * not Logitech's and not from the archive. `touch-definition.test.ts` holds the composed ones.
 */
const OWN_FAMILY: IrProtocol = {
  'Id-': 900001,
  Name: 'Own 32 Bit',
  CarrierFrequency: 38000,
  IRSegments: [{
    Name: 'Own 32 Bit',
    Header: [{ Type: 1, Value: 9000 }, { Type: 0, Value: 4500 }],
    Trailer: [{ Type: 1, Value: 560 }],
    TotalLength: 108000,
    Payload: {
      EncodingType: 0,
      NumberOfBits: 32,
      ToggleBit: null,
      Encodings: [
        { BitType: 0, Atoms: [{ Type: 1, Value: 560 }, { Type: 0, Value: 560 }] },
        { BitType: 1, Atoms: [{ Type: 1, Value: 560 }, { Type: 0, Value: 1690 }] },
      ],
    },
  }],
  CodeSegments: [],
  Attributes: null,
  Flags: null,
  HoldDelay: null,
  HoldMinimumRepeats: null,
  KeyCode: { Start: [], Repeat: [{ SegmentName: 'Own 32 Bit', SegmentType: 1 }], Finish: [] },
};
const code = (value: string): string => `G:Own 32 Bit:()(0x${value})():3`;

function device(over: Partial<OwnDevice> = {}): OwnDevice {
  const commands = over.commands ?? [
    { name: 'PowerToggle', label: 'Power', code: { kind: 'stated' as const, protocol: OWN_FAMILY, keyCode: code('20DF10EF') } },
    { name: 'VolumeUp', code: { kind: 'stated' as const, protocol: OWN_FAMILY, keyCode: code('20DF40BF') } },
    { name: 'VolumeDown', code: { kind: 'stated' as const, protocol: OWN_FAMILY, keyCode: code('20DFC03F') } },
    { name: 'Lamp', label: 'Lamp on', code: { kind: 'raw' as const, raw: rawOfLearned([mark(342), space(171)], 38000) } },
  ];
  return {
    id: 900100, name: 'Our amplifier', manufacturer: 'Ours', model: 'A1', deviceType: 2,
    interKeyDelayMs: 300, interDeviceDelayMs: 0, commands,
    keys: { ...keysByName(commands), Info: { press: 'Lamp', longPress: 'PowerToggle' } },
    ...over,
  };
}

function documentsOf(d: OwnDevice): SyncDocuments {
  const c = composeTouchDevice(d);
  return {
    DeviceList: { DevicesWithFeatures: [c.device] },
    ProtocolList: { Protocols: c.protocols },
    MapList: { ButtonMaps: [c.map] },
  };
}

test('the codec\'s reader finds the device\'s map, every command its code and every key and entry its command, and the check finds nothing', () => {
  const c = readConfiguration(documentsOf(device()));
  assert.equal(c.devices.length, 1);
  const d = c.devices[0]!;
  assert.equal(d.map?.kind, 'device');
  assert.equal(d.map?.reachable, true);
  assert.equal(d.commands.length, 4);
  // The three stated codes read against their definition; the raw code needs none.
  assert.deepEqual(d.commands.map((x) => [x.name, x.protocol?.name, x.code === undefined, x.raw]), [
    ['PowerToggle', 'Own 32 Bit', false, null],
    ['VolumeUp', 'Own 32 Bit', false, null],
    ['VolumeDown', 'Own 32 Bit', false, null],
    ['Lamp', undefined, true, rawOfLearned([mark(342), space(171)], 38000)],
  ]);
  assert.equal(d.pressRepeats, 3);
  assert.deepEqual(d.map!.keys.map((k) => [k.key, k.press?.command?.name, k.longPress?.command?.name]), [
    ['VolumeUp', 'VolumeUp', undefined], ['VolumeDown', 'VolumeDown', undefined], ['Info', 'Lamp', 'PowerToggle'],
  ]);
  assert.deepEqual([...d.map!.entries.values()].map((e) => [e.index, e.label, e.press?.command?.name]), [
    [0, 'Power', 'PowerToggle'], [1, 'VolumeUp', 'VolumeUp'], [2, 'VolumeDown', 'VolumeDown'], [3, 'Lamp on', 'Lamp'],
  ]);
  assert.deepEqual(checkConfiguration(c), []);
});

test('a definition left out of the protocol list is caught by the check, so the check is not passing everything', () => {
  const docs = documentsOf(device());
  const findings = checkConfiguration(readConfiguration({ ...docs, ProtocolList: { Protocols: [] } }));
  assert.deepEqual(findings.map((f) => f.rule), ['no protocol', 'no protocol', 'no protocol']);
});

test('what the remote would ignore is refused at composing: names differing in case, a key naming no command, a key the Touch does not have', () => {
  const base = device();
  assert.throws(() => composeTouchDevice({ ...base, commands: [...base.commands, { ...base.commands[1]!, name: 'volumeup' }] }), ComposeRefusal);
  assert.throws(() => composeTouchDevice({ ...base, keys: { Red: { press: 'Mute' } } }), ComposeRefusal);
  assert.throws(() => composeTouchDevice({ ...base, keys: { Mute: { press: 'VolumeUp' } } as never }), ComposeRefusal);
  // A key name matches a command case blind, as the engine finds a command, and the action names the
  // command as it is spelt.
  assert.equal(composeTouchDevice({ ...base, keys: { Red: { press: 'lamp' } } }).map.Buttons![0]!.ButtonAction!.CommandName, 'Lamp');
});

test('keysByName binds a key only to a command of exactly its name, and invents no synonym', () => {
  const by = keysByName([
    { name: 'VolumeMute', code: { kind: 'raw', raw: 'F1' } },
    { name: 'Mute', code: { kind: 'raw', raw: 'F1' } },
    { name: 'volumeup', code: { kind: 'raw', raw: 'F1' } },
  ]);
  assert.deepEqual(by, { VolumeMute: { press: 'VolumeMute' } });
});

// ------------------------------------------------------------------------------------------------------
// Against Logitech's own documents, the full sync measured
// ------------------------------------------------------------------------------------------------------

type Json = Record<string, unknown>;
const fieldsOf = (xs: readonly unknown[]): Set<string> => new Set(xs.flatMap((x) => Object.keys(x as Json)));
const outside = (ours: Set<string>, theirs: Set<string>): string[] => [...ours].filter((f) => !theirs.has(f)).sort();

test('every field we state is one Logitech\'s own device, command, map, button and action of the same kind state', lab.skipUnless(FULL), () => {
  const theirs = documentsOfAnswers(answersOf(FULL));
  const ours = documentsOf(device());
  const devices = theirs.DeviceList!.DevicesWithFeatures;
  const deviceMaps = theirs.MapList!.ButtonMaps.filter((m) => kindOf(m) === 'DeviceButtonMap');
  const ourMap = ours.MapList!.ButtonMaps[0]!;
  const buttonsOf = (maps: readonly typeof ourMap[], kind: string) => maps.flatMap((m) => m.Buttons ?? []).filter((b) => kindOf(b) === kind);
  const actionsOf = (maps: readonly typeof ourMap[]) => maps.flatMap((m) => m.Buttons ?? []).flatMap((b) => [b.ButtonAction, b.ButtonLongPressAction]).filter((a) => a);

  assert.deepEqual(outside(fieldsOf([ours.DeviceList!.DevicesWithFeatures[0]!.Device]), fieldsOf(devices.map((d) => d.Device))), []);
  assert.deepEqual(outside(fieldsOf(ours.DeviceList!.DevicesWithFeatures[0]!.Commands!), fieldsOf(devices.flatMap((d) => d.Commands ?? []))), []);
  assert.deepEqual(outside(fieldsOf([ourMap]), fieldsOf(deviceMaps)), []);
  for (const kind of ['HardRemoteButton', 'SoftRemoteButton']) {
    assert.deepEqual(outside(fieldsOf(buttonsOf([ourMap], kind)), fieldsOf(buttonsOf(deviceMaps, kind))), [], kind);
  }
  assert.deepEqual(outside(fieldsOf(actionsOf([ourMap])), fieldsOf(actionsOf(deviceMaps))), []);
  // The negative: a field of our own invention is caught.
  assert.deepEqual(outside(fieldsOf([{ ...ourMap, OurOwnField: 1 }]), fieldsOf(deviceMaps)), ['OurOwnField']);
});

test('the list counts from the first index Logitech\'s device lists count from, and a press and a long press are their event numbers', lab.skipUnless(FULL), () => {
  const theirs = documentsOfAnswers(answersOf(FULL));
  const maps = theirs.MapList!.ButtonMaps.filter((m) => kindOf(m) === 'DeviceButtonMap');
  // A list entry is any screen entry outside the number pad's group 2: Logitech's maps also hold group 36
  // entries, one per map on six of the seven, in the same numbering. Counted with them, every list starts
  // at 0; counted without, five start at 1, which is where this test's first draft looked.
  const entries = (m: typeof maps[number]) => (m.Buttons ?? []).filter((b) => kindOf(b) === 'SoftRemoteButton' && b.FunctionGroupType !== 2);
  assert.deepEqual(maps.map((m) => Math.min(...entries(m).map((b) => b.MenuItem!.IndexInMenu!))), Array(7).fill(0));
  assert.deepEqual(maps.map((m) => Math.min(...entries(m).filter((b) => b.FunctionGroupType === 0).map((b) => b.MenuItem!.IndexInMenu!))).sort(), [0, 0, 1, 1, 1, 1, 1]);
  // One group 36 entry on each of six maps and none on the seventh, on an index no group 0 entry of its
  // map holds.
  assert.deepEqual(maps.map((m) => entries(m).filter((b) => b.FunctionGroupType === 36).length).sort(), [0, 1, 1, 1, 1, 1, 1]);
  const second = maps.flatMap((m) => entries(m).filter((b) => b.FunctionGroupType === 36).map((b) => ({ m, at: b.MenuItem!.IndexInMenu! })));
  assert.equal(second.filter(({ m, at }) => !entries(m).some((b) => b.FunctionGroupType === 0 && b.MenuItem!.IndexInMenu === at)).length, 6);
  const keys = maps.flatMap((m) => m.Buttons ?? []).filter((b) => kindOf(b) === 'HardRemoteButton');
  // On a key holding both, the press is event 1 and the long press 2, on all 17 such device map keys. One
  // key of the 139 holds a long press alone, stored as its only action with event 2, which the engine
  // takes as the short action; we never write that form, since a key of ours with a long press has a press.
  const both = keys.filter((b) => b.ButtonAction && b.ButtonLongPressAction);
  assert.equal(both.length, 17);
  assert.deepEqual(new Set(both.map((b) => `${b.ButtonAction!.EventType} ${b.ButtonLongPressAction!.EventType}`)), new Set(['1 2']));
  assert.deepEqual(keys.filter((b) => b.ButtonAction?.EventType === 2 && !b.ButtonLongPressAction).length, 1);
  const ours = composeTouchDevice(device()).map.Buttons!;
  assert.equal(ours.find((b) => b.ButtonKey === 'Info')!.ButtonLongPressAction!.EventType, 2);
});

test('the 26 key names are the ones Logitech\'s documents use', lab.skipUnless(FULL), () => {
  const theirs = documentsOfAnswers(answersOf(FULL));
  const names = new Set(theirs.MapList!.ButtonMaps.flatMap((m) => m.Buttons ?? [])
    .filter((b) => kindOf(b) === 'HardRemoteButton').map((b) => b.ButtonKey!));
  assert.deepEqual([...names].sort(), [...BUTTON_KEYS].sort());
  assert.equal(BUTTON_KEYS.length, 26);
});

// ------------------------------------------------------------------------------------------------------
// A learned code, end to end: recorded, read, written as a definition or as raw, composed, read back
// ------------------------------------------------------------------------------------------------------

const mark = (us: number): Pulse => ({ mark: true, us });
const space = (us: number): Pulse => ({ mark: false, us });
/** The marks and spaces of a train as signed microseconds, for comparing two renderings. */
const signed = (xs: readonly Pulse[]): number[] => mergedIntervals(xs).map((p) => (p.mark ? p.us : -p.us));

test('a learned Toshiba 32 Bit code becomes that family\'s definition and a key code, and the codec\'s renderer of a catalogue definition sends the recorded frame back from them', () => {
  // One family of the 60 rows a definition can be written for: the rest of the table falls back to raw on
  // this route, `definitionOfRow`. The renderer is `waveformOfArchiveCommand`, our reading of how a
  // catalogue definition sends, calibrated against the archive's own renderings and not Logitech's code.
  // Only the first frame and its end mark are compared: how many times a press sends it is the device's
  // count, 3 by default, and not the recording's.
  // A recording of one press of a Toshiba 32 Bit code, as a learned code arrives: the frame, its end mark
  // and the silence after it, at the family's carrier.
  const row = statedProtocol('Toshiba 32 Bit')!;
  const frame = pulsesOfStatedRow(row, 32, 0x02FD48B7n)!;
  const learned = codeOfLearned([...frame, mark(row.flat!), space(40000)], 1e9 / row.periodNs, 900002);
  assert.equal(learned.refusal, undefined);
  assert.equal(learned.learned.kind, 'family');
  assert.ok(learned.code.kind === 'stated');
  assert.equal(learned.code.protocol.Name, 'Toshiba 32 Bit');

  const c = readConfiguration(documentsOf(device({ commands: [{ name: 'Play', code: learned.code }], keys: { Play: { press: 'Play' } } })));
  assert.deepEqual(checkConfiguration(c), []);
  const read = c.devices[0]!.commands[0]!;
  assert.deepEqual(read.code?.frames.map((f) => f.value), [0x02FD48B7n]);
  // The other end: the codec's renderer of a catalogue definition, applied to the documents we wrote,
  // gives the recorded frame back to the microsecond, before the silence a repetition pads to.
  const sent = waveformOfArchiveCommand(read.protocol!.archive, read.keyCode!);
  assert.ok(!('refusal' in sent));
  const recorded = signed([...frame, mark(row.flat!)]);
  assert.deepEqual(signed(sent.once).slice(0, recorded.length), recorded);
});

test('a learned code of no family becomes a definition of our own when its rhythm can be fitted, else its raw text, and both read back', () => {
  // A pulse distance rhythm no family has: a 3000/1500 lead in, cells of 500 against 500 or 1500, 16 bits,
  // at 36 kHz, recorded twice over so the repetition is measured.
  const bit = (one: boolean) => [mark(500), space(one ? 1500 : 500)];
  const value = 0xA5C3;
  const once = [mark(3000), space(1500), ...[...Array(16)].flatMap((_, i) => bit(((value >> (15 - i)) & 1) === 1)), mark(500), space(30000)];
  const fitted = codeOfLearned([...once, ...once], 36000, 900003);
  assert.equal(fitted.learned.kind, 'fitted');
  assert.equal(fitted.refusal, undefined);
  assert.ok(fitted.code.kind === 'stated');
  const sent = waveformOfArchiveCommand(
    readConfiguration(documentsOf(device({ commands: [{ name: 'Mine', code: fitted.code }], keys: {} }))).devices[0]!.commands[0]!.protocol!.archive,
    fitted.code.keyCode,
  );
  assert.ok(!('refusal' in sent));
  // Within the fit's means, which are the recorded durations here since the recording has no jitter.
  assert.deepEqual(signed(sent.once).slice(0, 35), signed(once).slice(0, 35));

  // Three bursts with nothing regular between them: no frame, no fit, raw.
  const odd = [mark(900), space(2100), mark(4200), space(700), mark(1300), space(20000)];
  const raw = codeOfLearned(odd, 38000, 900004);
  assert.equal(raw.learned.kind, 'raw');
  assert.ok(raw.code.kind === 'raw');
  const back = readTouchRaw(raw.code.raw);
  assert.ok(!('refusal' in back));
  assert.deepEqual(signed(back.train), signed(odd));
  assert.deepEqual(checkConfiguration(readConfiguration(documentsOf(device({ commands: [{ name: 'Odd', code: raw.code }], keys: {} })))), []);
});
