/**
 * The raw capture behind the infrared archive, todo-later 1.3 and 1.4, section 305.
 *
 * Three kinds of claim. The projection, the alignment and the side file's sparseness, on records made up
 * here, which need no lab and are not Logitech's data. The archive's statement that every action list is
 * in `Order` sequence, measured over the whole capture for the per input and per state lists, which the
 * section's first measurement left out. And the derived files `make catalogue-raw` writes: fresh against
 * the lab's `SHA256SUMS` or failing loudly, a device fetched without a scan, and the fields the archive
 * drops arriving through the one door on the calibration devices of section 321.
 *
 * **Token rule: never print a raw line or a whole device**, here or while debugging one of these tests.
 * One line is up to 130 KB.
 */
import assert from 'node:assert/strict';
import { createReadStream, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import test from 'node:test';
import { IR_ARCHIVE, imagePath, needing, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import { deviceDriving } from '../src/driving.ts';
import {
  RAW_BLOCKS_FILE, RAW_DERIVED_DIRECTORY, RAW_FIELDS, RAW_FIELDS_FILE, RAW_FIELDS_FORMAT, RAW_INDEX_FILE,
  RAW_MANIFEST_FILE, RAW_SUMS_FILE, type RawDeviceRecord, alignDevice, catalogueRules, rawCaptureDevice,
  rawDerivedState, rawFieldsEntry, rawProjection,
} from '../src/catalogueraw.ts';

/** The timing block every archive record carries, made up. */
const TIMING = {
  interKeyDelay: 100, interDeviceDelay: 500, holdInterDeviceDelay: 0, inputDelay: 0,
  connectedAppPowerOnDelay: 0, pressMinRepeats: 3, isInterKeyDelayOptimized: false,
};

const press = (name: string, order: number) => ({ __type: 'IRPressAction', Order: order, Duration: null, IRCommandName: name });
const record = (state: string, value: string, order: number, devActionType: number) =>
  ({ __type: 'IRDevAction', Order: order, DevActionType: devActionType, StateName: state, StateValue: value });

/** A made up raw device with every shape the projection has to get right, and two the archive drops. */
const SCREEN = {
  __type: 'InternalStateFeature:#x', StateName: 'Screen', NextActions: [],
  StateValues: [
    { StateValueName: 'A', ActionSetType: 0, Actions: [] },
    // Stored out of order, and repeated word for word, which the archive keeps once.
    { StateValueName: 'A', ActionSetType: 2, Actions: [press('InputTv', 2), record('Other', 'X', 1, 1)] },
    { StateValueName: 'A', ActionSetType: 2, Actions: [press('InputTv', 2), record('Other', 'X', 1, 1)] },
  ],
};
const RAW: RawDeviceRecord = {
  id: 1,
  features: [
    { __type: 'PowerFeature:#x', PowerToggleActions: [press('Power', 2), { __type: 'IRDelayAction', Order: 1, Delay: 500 }] },
    {
      __type: 'InputFeature:#x', Inputs: [
        { InputName: 'HDMI 1', InputOrder: 2, IsOnline: false, Actions: [record('Screen', 'A', 1, 1)] },
        { InputName: null, InputOrder: 9, IsOnline: false, Actions: [] },
        { InputName: 'Netflix', InputOrder: 1, IsOnline: true, Actions: [press('Netflix', 1)] },
      ],
    },
    SCREEN,
    // The same state stated again word for word, which the archive also keeps once.
    SCREEN,
  ],
};
/** The archive's projection of the same device, written the way the archive writes it. */
const ARCHIVED = {
  timing: TIMING,
  power: { type: 'toggle', toggle: [{ delayMs: 500 }, 'Power'] },
  inputs: { type: 0, list: [{ name: 'HDMI 1', commands: [{ set: 'Screen', to: 'A' }] }, { name: 'Netflix', commands: ['Netflix'] }] },
  states: { Screen: { values: [{ name: 'A', select: [{ setType: 2, commands: [{ set: 'Other', to: 'X' }, 'InputTv'] }] }] } },
};

test('a raw device projects onto the archive\'s coordinates: sorted on Order, values grouped, repeats and nameless inputs dropped', () => {
  const projection = rawProjection(RAW);
  assert.deepEqual(projection.lists.map((one) => one.path), [
    'power.toggle', 'inputs.list[0].commands', 'inputs.list[1].commands', 'states["Screen"].values[0].select[0]',
  ]);
  assert.deepEqual(projection.inputs.map((one) => one['InputName']), ['HDMI 1', 'Netflix']);
  const alignment = alignDevice(projection, deviceDriving(ARCHIVED));
  assert.deepEqual(alignment.unaligned, []);
  assert.ok(alignment.compared.every((one) => one.matchesSorted));
  // The power toggle is stored [2, 1]: the archive equals it sorted, and not as stored.
  const toggle = alignment.compared.find((one) => one.path === 'power.toggle')!;
  assert.deepEqual([toggle.storedOutOfOrder, toggle.matchesSorted, toggle.matchesStored], [true, true, false]);
});

test('the side file stores only what differs from each field\'s usual value, in the archive\'s coordinates', () => {
  const projection = rawProjection(RAW);
  const entry = rawFieldsEntry(projection, alignDevice(projection, deviceDriving(ARCHIVED)));
  assert.deepEqual(entry, {
    // Input 0 is numbered 2 where its position says 1, and Netflix 1 where its position says 2, and online.
    i: { 0: { inputOrder: 2 }, 1: { inputOrder: 1, online: true } },
    // Both state steps only record; the press beside one carries no step field at all.
    s: { 'inputs.list[0].commands[0]': { devActionType: 1 }, 'states["Screen"].values[0].select[0][0]': { devActionType: 1 } },
  });
  // The field list is the one place to extend, and every entry hangs off something the door can address.
  assert.deepEqual(RAW_FIELDS.map((one) => [one.name, one.raw, one.anchor]), [
    ['devActionType', 'DevActionType', 'step'], ['inputOrder', 'InputOrder', 'input'], ['online', 'IsOnline', 'input'],
  ]);
});

test('a list the archive states differently is left unaligned and nothing is attached under it', () => {
  const projection = rawProjection(RAW);
  // The control for each: a changed command, renamed inputs, and a state stated twice differently.
  const changed = { ...ARCHIVED, inputs: { type: 0, list: [ARCHIVED.inputs.list[0]!, { name: 'Netflix', commands: ['Other'] }] } };
  const one = alignDevice(projection, deviceDriving(changed));
  assert.deepEqual(one.unaligned, ['inputs.list[1].commands']);
  const renamed = { ...ARCHIVED, inputs: { type: 0, list: [{ name: 'HDMI', commands: [{ set: 'Screen', to: 'A' }] }, ARCHIVED.inputs.list[1]!] } };
  const two = alignDevice(projection, deviceDriving(renamed));
  assert.deepEqual(two.unaligned, ['inputs.list']);
  assert.equal(rawFieldsEntry(projection, two)?.i, undefined);
  const twice = { ...RAW, features: [...RAW.features!, { ...SCREEN, NextActions: [press('Blue', 1)] }] };
  assert.deepEqual(alignDevice(rawProjection(twice), deviceDriving(ARCHIVED)).unaligned, ['states["Screen"]']);
});

test('derived files are absent without a manifest and stale when SHA256SUMS states another capture', () => {
  const directory = mkdtempSync(join(tmpdir(), 'raw-'));
  try {
    assert.deepEqual(rawDerivedState(directory), { state: 'absent' });
    mkdirSync(join(directory, RAW_DERIVED_DIRECTORY));
    for (const file of [RAW_BLOCKS_FILE, RAW_INDEX_FILE, RAW_FIELDS_FILE]) writeFileSync(join(directory, RAW_DERIVED_DIRECTORY, file), '');
    const manifest = {
      format: RAW_FIELDS_FORMAT, source: { file: 'device_features_raw.jsonl.gz', sha256: 'a'.repeat(64) },
      archive: { generated: 'x' }, fields: RAW_FIELDS.map((one) => one.name), devices: 0, blockLines: 16,
    };
    writeFileSync(join(directory, RAW_DERIVED_DIRECTORY, RAW_MANIFEST_FILE), JSON.stringify(manifest));
    writeFileSync(join(directory, RAW_SUMS_FILE), `${'a'.repeat(64)}  device_features_raw.jsonl.gz\n`);
    assert.equal(rawDerivedState(directory).state, 'fresh');
    // A newer release downloaded and not yet derived: stale, naming both checksums.
    writeFileSync(join(directory, RAW_SUMS_FILE), `${'b'.repeat(64)}  device_features_raw.jsonl.gz\n`);
    const stale = rawDerivedState(directory);
    assert.equal(stale.state, 'stale');
    assert.match((stale as { reason: string }).reason, /aaaaaaaaaaaa.*bbbbbbbbbbbb/);
    // And a field list that has moved since the derivation.
    writeFileSync(join(directory, RAW_SUMS_FILE), `${'a'.repeat(64)}  device_features_raw.jsonl.gz\n`);
    writeFileSync(join(directory, RAW_DERIVED_DIRECTORY, RAW_MANIFEST_FILE), JSON.stringify({ ...manifest, fields: ['devActionType'] }));
    assert.equal(rawDerivedState(directory).state, 'stale');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

/**
 * Item 1.4. The archive's README says every action list was sorted on `Order`, the per input and per
 * state ones included; section 305 had compared the power, input switching and channel entry lists only.
 * Measured both ways over the whole capture: every list equals the raw one sorted on `Order`, and of the
 * ones stored out of order not one equals it as stored. The counts are exact, so a capture that changes
 * fails here by name. The 1 unaligned path is a state Panasonic's TX-W32D3DPL states twice with
 * different `next` lists, where the archive kept the first; the projection refuses it rather than pick.
 */
test('every per input and per state action list in the archive is in the service\'s Order sequence, and none in stored order',
  needing(skipWithoutIrArchive(), skipUnless('ir_archive_raw_features')), async () => {
    const where = new Map<number, string>();
    const root = join(IR_ARCHIVE!, 'devices');
    for (const slug of readdirSync(root)) {
      for (const row of JSON.parse(readFileSync(join(root, slug, 'index.json'), 'utf8')) as { f: string; id: number }[]) {
        where.set(row.id, join(root, slug, row.f));
      }
    }
    const counts: Record<string, [number, number, number, number]> = {};
    const unaligned: string[] = [];
    const lines = createInterface({ input: createReadStream(imagePath('ir_archive_raw_features')!).pipe(createGunzip()), crlfDelay: Infinity });
    for await (const line of lines) {
      const raw = JSON.parse(line) as RawDeviceRecord;
      const file = where.get(raw.id);
      assert.ok(file !== undefined, `device ${raw.id} is in the capture and not in the archive`);
      const alignment = alignDevice(rawProjection(raw), deviceDriving(JSON.parse(readFileSync(file, 'utf8'))));
      unaligned.push(...alignment.unaligned.map((path) => `${raw.id} ${path}`));
      for (const one of alignment.compared) {
        // Compared, stored out of order, equal sorted, and equal as stored where stored out of order.
        const family = counts[one.family] ??= [0, 0, 0, 0];
        family[0] += 1;
        if (one.storedOutOfOrder) family[1] += 1;
        if (one.matchesSorted) family[2] += 1;
        if (one.storedOutOfOrder && one.matchesStored) family[3] += 1;
      }
    }
    assert.deepEqual(counts, {
      device: [477079, 3884, 477079, 0],
      input: [680091, 55744, 680091, 0],
      stateRoute: [82622, 5282, 82622, 0],
      stateList: [29326, 68, 29326, 0],
    });
    assert.deepEqual(unaligned, ['110096 states["AV4Input"]']);
  });

const featuresPath = imagePath('ir_archive_raw_features');
const RAW_DIRECTORY = featuresPath === undefined ? undefined : dirname(featuresPath);

/**
 * Skip when no derivation exists, and only then: a derivation that exists and is stale is a failure, so a
 * newer release downloaded and not derived is noticed rather than read through.
 */
function skipWithoutDerived(): { skip: string | false } {
  if (RAW_DIRECTORY === undefined) return { skip: 'no raw capture in the lab' };
  if (rawDerivedState(RAW_DIRECTORY).state === 'absent') return { skip: 'no derived raw files; run make catalogue-raw' };
  return { skip: false };
}

test('the derived raw files are fresh against the lab\'s SHA256SUMS', needing(skipWithoutDerived()), () => {
  const state = rawDerivedState(RAW_DIRECTORY!);
  assert.equal(state.state, 'fresh', state.state === 'stale' ? state.reason : '');
  if (state.state !== 'fresh') return;
  assert.equal(state.manifest.devices, 276236);
  // The index holds every device once, sorted, which is what the binary search relies on.
  const index = readFileSync(join(RAW_DIRECTORY!, RAW_DERIVED_DIRECTORY, RAW_INDEX_FILE));
  assert.equal(index.readUInt32LE(4), 276236);
  let previous = -1;
  for (let at = 0; at < 276236; at++) {
    const id = index.readUInt32LE(8 + at * 20);
    assert.ok(id > previous, `index entry ${at} is out of order`);
    previous = id;
  }
});

test('one device is fetched out of the capture without a scan', needing(skipWithoutDerived()), () => {
  // The Panasonic television of section 305, cold and then warm. Only fields are compared, never printed.
  let started = performance.now();
  const device = rawCaptureDevice(RAW_DIRECTORY!, 219481);
  const cold = performance.now() - started;
  assert.equal(device?.id, 219481);
  assert.equal(device?.ok, true);
  started = performance.now();
  for (const id of [154, 260473, 512015]) assert.equal(rawCaptureDevice(RAW_DIRECTORY!, id)?.id, id);
  const warm = (performance.now() - started) / 3;
  // `assert.ok` on purpose: `assert.equal` would print the whole device if one came back, which is the
  // token rule broken by a failing test. Global ids run from 1 to the low six figures, so this one is free.
  assert.ok(rawCaptureDevice(RAW_DIRECTORY!, 4000000000) === undefined, 'an id the capture does not hold');
  // Ceilings at about fifty times what was measured, 4 ms cold and 1.5 ms warm, so they catch a scan
  // creeping back in and say nothing about a slow machine.
  assert.ok(cold < 250, `cold lookup took ${cold.toFixed(0)} ms`);
  assert.ok(warm < 100, `warm lookup took ${warm.toFixed(0)} ms`);
});

test('the one door answers from both sources: the Sony\'s Netflix numbered 1 and online, and recording steps marked',
  needing(skipWithoutIrArchive(), skipWithoutDerived()), () => {
    // Section 321: the Sony KDL-32W705B has Netflix at InputOrder 1 and last in the archive's array.
    const sony = catalogueRules(IR_ARCHIVE!, 'Sony', 'KDL-32W705B', { raw: RAW_DIRECTORY! });
    assert.equal(sony.globalDeviceId, 260473);
    const names = sony.archive.inputs!.list!.map((one) => one.name);
    assert.equal(names.at(-1), 'Netflix');
    assert.deepEqual(sony.raw!.inputs.at(-1), { inputOrder: 1, online: true });
    assert.deepEqual(sony.raw!.inputs.filter((one) => one['online'] === true).length, 1);
    assert.ok(sony.sources.raw !== undefined && sony.sources.archive.generated === sony.sources.raw.archiveGenerated);
    // The archive alone, when no raw directory is given: the same rules and no raw half.
    const archiveOnly = catalogueRules(IR_ARCHIVE!, 'Sony', 'KDL-32W705B');
    assert.equal(archiveOnly.raw, undefined);
    assert.deepEqual(archiveOnly.archive, sony.archive);
    // Two of section 321's devices whose compiles each hold one silent input transition the archive could
    // not explain: the raw capture marks exactly one input state step of each as only recording.
    const recordingInputSteps = (slug: string, file: string): string[] =>
      [...catalogueRules(IR_ARCHIVE!, slug, file, { raw: RAW_DIRECTORY! }).raw!.steps]
        .filter(([path, fields]) => path.startsWith('inputs.list[') && fields['devActionType'] === 1).map(([path]) => path);
    assert.deepEqual(recordingInputSteps('Panasonic', 'TX-29AK40F'), ['inputs.list[0].commands[1]']);
    assert.deepEqual(recordingInputSteps('Thomson', '25DT60H'), ['inputs.list[2].commands[0]']);
    // And every state step of the LG sends, which its exact compile of section 321 agrees with.
    const lg = catalogueRules(IR_ARCHIVE!, 'LG', 'OLED65G26LA', { raw: RAW_DIRECTORY! });
    assert.equal(lg.raw!.steps.size, 13);
    assert.ok([...lg.raw!.steps.values()].every((fields) => fields['devActionType'] === 2));
  });

test('InputOrder is not a unique numbering: two of the Denon AVR-1912\'s inputs share one',
  needing(skipWithoutIrArchive(), skipWithoutDerived()), () => {
    const denon = catalogueRules(IR_ARCHIVE!, 'Denon', 'AVR-1912', { raw: RAW_DIRECTORY! });
    const numbers = denon.raw!.inputs.map((one) => one['inputOrder']);
    const names = denon.archive.inputs!.list!.map((one) => one.name);
    assert.deepEqual([names[9], numbers[9], names[10], numbers[10]], ['CD', 11, 'QuickSelect 1', 11]);
  });
