/**
 * `todo-touch.md` 9.3: **every field of the Harmony Touch set built from nothing is credited to a generator, and none is
 * carried from a Logitech document**, found from the code rather than from the attribution tables in the headers of
 * `fromnothing.ts` and `archivedevice.ts`; and the set still passes the answerer's gate, the reader and the check.
 *
 * **What is held.**
 *
 * 1. **The inputs, by watching the file system.** While `withNothing` builds the set from the setup file and the
 *    account file, both handed over as parsed JSON, every file the process reads, tests for or lists is recorded:
 *    **every one is in the archive of the catalogue**, 56 calls on 15 distinct files (the archive's manifest, and per
 *    device of the seven its catalogue entry and its code set), and nothing in the lab and nothing of 8.6's set. Our
 *    rhythm table is code, `PROTOCOLS` in the codec, so it is read by no file. So the only inputs are the five the brief names: the
 *    setup file, the archive through our readers, our rhythm table, the lab's account description and the picture drawn
 *    in `ourBackground`.
 * 2. **Every field and its generator**, `attributeNothingSet` in `experiments/touchattribution.ts`: each step of the build run
 *    again by itself and a field credited to the latest step whose own output holds that value at that place, the
 *    composer's own writes told from what it carries by composing the same devices onto skeleton records. On the lab's
 *    set, `work/touch-firmware/sets/9.1-nothing`, which 9.4 delivers: 10671 fields, per document and generator exactly as
 *    `EXPECTED` below, **0 carried and 0 unattributed**. The split is the headers' tables, now measured: on the device
 *    list the composer writes 110 fields (each device's id, name, control port, press repeats and two delays, every
 *    feature's device id, each power choice and input delay, and the LG TV's channel tuning), the account's step the
 *    tuning device's favourites address and key, and the rest is the record as `deviceRecordOfArchive` writes it from
 *    the archive (1562, the maker and model among them, every command's name, transport and raw code), its features as
 *    `featuresOfDriving` writes them (633) and every key code as `keyCodeText` writes it into our definition (373).
 * 3. **The control**: the same set with one command's protocol id replaced by the one 8.6's set gives that command, a
 *    command naming Logitech's definition, reports that one field as carried from a Logitech document and every other
 *    field as before; with Logitech's icon added to a device, the same; and a value found in neither our generators nor
 *    Logitech's documents is reported unattributed. So "0 carried" can fail, and the two kinds are told apart. Each
 *    changed answer is retagged with `ourTag` of its new body, so the field is the only thing that differs; left with
 *    its old tag, the tag is reported unattributed as well.
 * 4. **The set passes the reader and the check**: the gate with 8 tags stated and none the answerer's, the reader 5
 *    activities, 7 devices, 12 maps and 5 definitions, the check the two findings of the screens' lists 8.6's set finds
 *    and nothing refused, and nothing `refusalsBeforeASync` refuses. 9.1 held the same on a set built afresh,
 *    `touch-nothing-set.test.ts`; here it is held on the lab's set itself.
 *
 * **Why a field equal by coincidence is no hole.** A field our generator reproduces is ours whatever Logitech's
 * documents hold there: the key codes, for one, are the same text in 8.6's set, since 9.1's comparison lists no key code
 * among its differences, and the control that copies one in changes nothing, which is the claim. What the attribution cannot see is a generator that reads a Logitech document
 * itself, and that is what point 1 rules out.
 *
 * **Sources checked first.** The 9.3 and 9.4 brief in the lab; the codec's `fromnothing.ts` and `archivedevice.ts`, whose
 * tables this checks; `touch-nothing-set.test.ts`, whose sets it reads. Logitech's client was not consulted: what is
 * attributed is ours.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330; its firmware reports 17 and Logitech's templates file it
 * under 18. The test reads the lab's sets and account file and the archive, prints no value out of them and touches no
 * remote.
 */
import assert from 'node:assert/strict';
import fs, { readFileSync, realpathSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { sep } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { harmonyTouch } from '@harmony/codec/node';
import * as lab from '@harmony/lab';

import { attributeNothingSet, attributionCounts, layersOf, withField, type AttributedField, type NothingInputs } from '../../experiments/touchattribution.ts';
import { withNothing, type TouchAccountFile } from '../../experiments/touchnothingset.ts';
import { keyOf, prepareSet, type TouchSet } from '../../src/touchsync.ts';

/** 8.6's set, Logitech's documents under tags of ours, which a field no generator reproduces is looked up in. */
const SETUP = 'touch_setup_set';
/** The account file and the set 9.1 built in the lab, which 9.4 delivers. */
const ACCOUNT = 'touch_nothing_account';
const BUILT = 'touch_nothing_set';
const SETUP_FILE = fileURLToPath(new URL('../../setups/touch-test.json', import.meta.url));

const json = (fixture: string): unknown => JSON.parse(new TextDecoder().decode(lab.require_(fixture)));
const inputs = (): NothingInputs => ({
  file: JSON.parse(readFileSync(SETUP_FILE, 'utf8')),
  archive: lab.IR_ARCHIVE!,
  account: (json(ACCOUNT) as { account: TouchAccountFile }).account,
});
const documentsOf = (set: TouchSet): harmonyTouch.SyncDocuments => harmonyTouch.documentsOfAnswers(set.answers as unknown as harmonyTouch.SyncAnswer[]);
const counts = (fields: readonly AttributedField[]) => attributionCounts(fields).map((c) => [c.document, c.by, c.fields]);

/** Every field of the lab's set, per document and generator, in the set's order and the generators' order. */
const EXPECTED = [
  ['ActivityList', 'composeTouchActivity', 216], ['ActivityList', 'withNothing', 2], ['ActivityList', 'ourTag', 1],
  ['DeviceList', 'deviceRecordOfArchive', 1562], ['DeviceList', 'featuresOfDriving', 633], ['DeviceList', 'keyCodeText', 373],
  ['DeviceList', 'composeTouchSetup', 110], ['DeviceList', 'buildTouchDocuments', 2], ['DeviceList', 'withNothing', 2], ['DeviceList', 'ourTag', 1],
  ['MapList', 'composeButtons', 4667], ['MapList', 'composeTouchActivity', 2680], ['MapList', 'withNothing', 2], ['MapList', 'ourTag', 1],
  ['Context', 'contextOfAccount', 10], ['Context', 'withNothing', 2], ['Context', 'ourTag', 1],
  ['Settings', 'settingsOfSetupFile', 27], ['Settings', 'ourBackground', 3], ['Settings', 'withNothing', 2], ['Settings', 'ourTag', 1],
  ['ProtocolList', 'definitionOfRow', 362], ['ProtocolList', 'withNothing', 2], ['ProtocolList', 'ourTag', 1],
  ['the background', 'ourBackground', 2], ['the background', 'withNothing', 1], ['the background', 'ourTag', 1],
  ['the background\'s twin', 'ourBackground', 2], ['the background\'s twin', 'withNothing', 1], ['the background\'s twin', 'ourTag', 1],
];

/**
 * What the process reads while `build` runs: every path handed to the file system's reading, testing and listing calls,
 * through the named imports of every module as well, since `syncBuiltinESMExports` carries the replacement into them.
 */
function readsDuring(build: () => void): string[] {
  const names = ['readFileSync', 'existsSync', 'readdirSync', 'statSync', 'lstatSync', 'openSync', 'accessSync', 'opendirSync'] as const;
  const fsx = fs as unknown as Record<string, (...args: unknown[]) => unknown>;
  const kept = Object.fromEntries(names.map((n) => [n, fsx[n]]));
  const reads: string[] = [];
  for (const n of names) {
    fsx[n] = (...args: unknown[]) => {
      if (typeof args[0] === 'string') reads.push(args[0]);
      return kept[n]!(...args);
    };
  }
  syncBuiltinESMExports();
  try {
    build();
  } finally {
    for (const n of names) fsx[n] = kept[n]!;
    syncBuiltinESMExports();
  }
  return reads;
}

const needed = lab.needing(lab.skipWithoutIrArchive(), lab.skipUnless(SETUP, ACCOUNT, BUILT)).skip;

describe('9.3: every field of the set from nothing credited to a generator, none carried', { skip: needed }, () => {
  it('the build reads no file but the archive\'s: 56 calls on 15 files, the manifest and each device\'s entry and code set, none in the lab', () => {
    const given = inputs();
    let built: ReturnType<typeof withNothing> | undefined;
    const reads = readsDuring(() => {
      built = withNothing(given);
    });
    assert.ok(built !== undefined && 'set' in built);
    const archive = realpathSync(lab.IR_ARCHIVE!) + sep;
    const outside = reads.filter((p) => !realpathSync(p).startsWith(archive));
    assert.equal(outside.length, 0, 'a file outside the archive was read');
    assert.deepEqual([reads.length, new Set(reads).size], [56, 15]);
    assert.equal(reads.filter((p) => realpathSync(p).startsWith(realpathSync(lab.LAB!) + sep)).length, 0);
    // The manifest, and per device of the seven its catalogue entry and its code set.
    const files = [...new Set(reads.map((p) => realpathSync(p).slice(archive.length).split(sep)[0]!))];
    assert.deepEqual(['manifest.json', 'devices', 'codesets'].map((top) => [...new Set(reads)].filter((p) => realpathSync(p).slice(archive.length).split(sep)[0] === top).length), [1, 7, 7]);
    assert.deepEqual(files.sort(), ['codesets', 'devices', 'manifest.json']);
  });

  it('the lab\'s set: 10671 fields, each credited to a generator by the code, per document and generator exactly, 0 carried, 0 unattributed', () => {
    const fields = attributeNothingSet(json(BUILT) as TouchSet, inputs(), json(SETUP) as TouchSet);
    assert.equal(fields.length, 10671);
    assert.deepEqual(counts(fields), EXPECTED);
    assert.deepEqual([fields.filter((f) => f.by === 'carried from a Logitech document').length, fields.filter((f) => f.by === 'unattributed').length], [0, 0]);
  });

  it('the device list split as the headers state it: the composer\'s 110 fields, the account\'s two, the rest the archive\'s record', () => {
    const fields = attributeNothingSet(json(BUILT) as TouchSet, inputs(), json(SETUP) as TouchSet).filter((f) => f.document === 'DeviceList');
    const fieldsBy = (by: string): string[] => [...new Set(fields.filter((f) => f.by === by).map((f) => f.field.replace(/^resource\.DevicesWithFeatures\[\]\./, '')))].sort();
    assert.deepEqual(fieldsBy('buildTouchDocuments'), ['Device.ContentProfileKey', 'Device.DeviceProfileUri']);
    assert.deepEqual(fieldsBy('composeTouchSetup'), [
      'Device.ControlPort', 'Device.Id-', 'Device.InterDeviceDelay', 'Device.InterKeyDelay', 'Device.Name', 'Device.PressMinRepeats',
      'DeviceFeatures[].DeviceId-',
      'DeviceFeatures[].FinishActions[].Duration', 'DeviceFeatures[].FinishActions[].IRCommandName', 'DeviceFeatures[].FinishActions[].Order', 'DeviceFeatures[].FinishActions[].__type',
      'DeviceFeatures[].FixedDigits',
      'DeviceFeatures[].GreaterHundredActions[].Duration', 'DeviceFeatures[].GreaterHundredActions[].IRCommandName', 'DeviceFeatures[].GreaterHundredActions[].Order', 'DeviceFeatures[].GreaterHundredActions[].__type',
      'DeviceFeatures[].GreaterTenActions[].Duration', 'DeviceFeatures[].GreaterTenActions[].IRCommandName', 'DeviceFeatures[].GreaterTenActions[].Order', 'DeviceFeatures[].GreaterTenActions[].__type',
      'DeviceFeatures[].InputDelay', 'DeviceFeatures[].IsPowerAlwaysOn', 'DeviceFeatures[].IsPoweredOnBetweenActivities', 'DeviceFeatures[].PowerOnDelay',
      'DeviceFeatures[].StartActions[].Duration', 'DeviceFeatures[].StartActions[].IRCommandName', 'DeviceFeatures[].StartActions[].Order', 'DeviceFeatures[].StartActions[].__type',
    ]);
    assert.deepEqual(fieldsBy('keyCodeText'), ['Commands[].KeyCode']);
    assert.deepEqual(fieldsBy('deviceRecordOfArchive').filter((f) => f.startsWith('Device.')), [
      'Device.DefaultInterDeviceDelay', 'Device.DefaultInterKeyDelay', 'Device.DeviceType', 'Device.IsMultiCode', 'Device.IsScartCableSupported',
      'Device.Manufacturer', 'Device.Model', 'Device.ParentDeviceManufacturer', 'Device.ParentDeviceModel', 'Device.Transport',
    ]);
    assert.deepEqual(fieldsBy('deviceRecordOfArchive').filter((f) => f.startsWith('Commands')), ['Commands[].Name', 'Commands[].ProtocolId', 'Commands[].Raw', 'Commands[].TransportType']);
  });

  it('the control: a protocol id or an icon copied in from 8.6\'s set is carried, a value of nobody\'s is unattributed, and nothing else moves', () => {
    const given = inputs();
    const layers = layersOf(given);
    const ours = json(BUILT) as TouchSet;
    const theirs = json(SETUP) as TouchSet;
    const deviceList = (s: TouchSet) => (documentsOf(s).DeviceList as { DevicesWithFeatures: harmonyTouch.DeviceWithFeatures[] }).DevicesWithFeatures;
    const at = deviceList(ours).findIndex((d) => d.Device.Name === 'LG TV');
    const lg = deviceList(ours)[at]!;
    const logitechLg = deviceList(theirs).find((d) => d.Device.Name === 'LG TV')!;
    const k = lg.Commands!.findIndex((c) => logitechLg.Commands!.some((x) => x.Name === c.Name && x.ProtocolId !== c.ProtocolId));
    const theirProtocol = logitechLg.Commands!.find((x) => x.Name === lg.Commands![k]!.Name)!.ProtocolId;
    const cases: [TouchSet, string, string][] = [
      [withField(ours, 'DeviceList', `DevicesWithFeatures[${at}].Commands[${k}].ProtocolId`, theirProtocol), 'resource.DevicesWithFeatures[].Commands[].ProtocolId', 'carried from a Logitech document'],
      [withField(ours, 'DeviceList', `DevicesWithFeatures[${at}].Device.Icon`, logitechLg.Device['Icon']), 'resource.DevicesWithFeatures[].Device.Icon', 'carried from a Logitech document'],
      [withField(ours, 'DeviceList', `DevicesWithFeatures[${at}].Device.Name`, 'no generator writes this'), 'resource.DevicesWithFeatures[].Device.Name', 'unattributed'],
    ];
    const base = counts(attributeNothingSet(ours, given, theirs, layers));
    for (const [changed, field, kind] of cases) {
      const fields = attributeNothingSet(changed, given, theirs, layers);
      const off = fields.filter((f) => f.by === 'carried from a Logitech document' || f.by === 'unattributed');
      assert.deepEqual(off.map((f) => [f.document, f.field, f.by]), [['DeviceList', field, kind]], field);
      // Every other field as before: a replaced field moves one count from its generator, an added one adds one.
      const others = counts(fields.filter((f) => f !== off[0]));
      const replaced = field.endsWith('.Icon') ? 0 : 1;
      assert.equal(others.reduce((n, c) => n + Number(c[2]), 0), base.reduce((n, c) => n + Number(c[2]), 0) - replaced, field);
    }
    // A field equal by coincidence: Logitech's key code for the same command is the same text, so copying it in moves
    // nothing, which is the claim, a field our generator reproduces being ours.
    const theirCode = logitechLg.Commands!.find((x) => x.Name === lg.Commands![k]!.Name)!.KeyCode;
    assert.deepEqual(counts(attributeNothingSet(withField(ours, 'DeviceList', `DevicesWithFeatures[${at}].Commands[${k}].KeyCode`, theirCode), given, theirs, layers)), base);
  });

  it('the lab\'s set passes the gate, the reader and the check as 8.6\'s does, refusing nothing', () => {
    const ours = json(BUILT) as TouchSet;
    const gate = prepareSet(ours);
    assert.ok(!('refusals' in gate));
    assert.deepEqual([gate.set.tags.stated, gate.set.tags.ours], [8, 0]);
    const read = harmonyTouch.readConfiguration(documentsOf(ours));
    assert.deepEqual([read.activities.length, read.devices.length, read.maps.length, read.protocols.length, read.absent.length], [5, 7, 12, 5, 0]);
    const findings = (s: TouchSet) => harmonyTouch.findingsByRule(harmonyTouch.checkConfiguration(harmonyTouch.readConfiguration(documentsOf(s))));
    assert.deepEqual(findings(ours), { 'repeated screen index': 2, 'number pad entry on no key': 2 });
    assert.deepEqual(findings(ours), findings(json(SETUP) as TouchSet));
    assert.deepEqual(harmonyTouch.refusalsBeforeASync(documentsOf(ours)), []);
    assert.deepEqual(ours.answers.slice(0, 6).map((a) => keyOf(a.uri)), harmonyTouch.CONFIGURATION_DOCUMENTS);
  });
});
