/**
 * Section 305: how to drive a catalogue device, read out of the archive's schema version 2.
 *
 * Three kinds of claim. The reader's shape, on records made up here, which need no checkout and are not
 * the archive's JSON, per decision 15. One device read two ways, the archive against what Logitech's own
 * service answered for the same catalogue entry, which is the closure: two routes with nothing in common
 * past Logitech's database. And the whole archive read through, so a record the survey missed fails by
 * name rather than being skipped.
 */
import assert from 'node:assert/strict';
import { createReadStream, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import test from 'node:test';
import { IR_ARCHIVE, imagePath, needing, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import { ArchiveError, archiveManifest } from '../src/archive.ts';
import { catalogueDriving, deviceDriving, driveSteps } from '../src/driving.ts';
import type { DeviceDriving, DriveStep } from '../src/driving.ts';

/** A minimal version 2 record, made up: only the timing block every record carries. */
const TIMING = {
  interKeyDelay: 100, interDeviceDelay: 500, holdInterDeviceDelay: 0, inputDelay: 0,
  connectedAppPowerOnDelay: 0, pressMinRepeats: 3, isInterKeyDelayOptimized: false,
};

test('the five step shapes read as four kinds, and a sixth is refused', () => {
  assert.deepEqual(driveSteps([
    'PowerOn', { command: 'PowerOff', durationMs: 1000 }, { hold: 'Play' }, { delayMs: 500 },
    { set: 'InputType', to: 'TV' },
  ], 'test'), [
    { kind: 'send', command: 'PowerOn' },
    { kind: 'send', command: 'PowerOff', holdMs: 1000 },
    { kind: 'hold', command: 'Play' },
    { kind: 'wait', ms: 500 },
    { kind: 'state', state: 'InputType', value: 'TV' },
  ]);
  // The control for each refusal: one key too many, one missing, and a wrong type.
  assert.throws(() => driveSteps([{ command: 'X', durationMs: 1, extra: 1 }], 'test'), ArchiveError);
  assert.throws(() => driveSteps([{ command: 'X' }], 'test'), ArchiveError);
  assert.throws(() => driveSteps([{ delayMs: '500' }], 'test'), ArchiveError);
  assert.throws(() => driveSteps('PowerOn', 'test'), ArchiveError);
});

test('a block Logitech said nothing about stays absent, and a version 1 record is refused', () => {
  const bare = deviceDriving({ manufacturer: 'M', model: 'X', globalDeviceId: 1, deviceType: 1, codeset: null, timing: TIMING });
  assert.deepEqual(Object.keys(bare), ['timing']);
  assert.equal('powerOnDelay' in bare.timing, false);
  // Version 1 had no timing on any record. Reading it as "a device with no rules" would be wrong, since
  // the truth is an archive too old to say, so it throws.
  assert.throws(() => deviceDriving({ manufacturer: 'M', model: 'X', globalDeviceId: 1, deviceType: 1 }), ArchiveError);
  // An unknown field anywhere is refused rather than dropped.
  assert.throws(() => deviceDriving({ timing: TIMING, remoteControl: {} }), /unknown field remoteControl/);
  assert.throws(() => deviceDriving({ timing: { ...TIMING, newDelay: 1 } }), /unknown field newDelay/);
  assert.throws(() => deviceDriving({ timing: TIMING, power: { type: 'sometimes' } }), /unknown sometimes/);
});

test('inputs, channel entry and states keep their action lists and their order', () => {
  const read = deviceDriving({
    timing: TIMING,
    inputs: { type: 5, list: [{ name: 'HDMI 1', commands: ['InputHdmi1'], ports: ['HDMI'] }, { name: 'Tuner' }], next: ['InputNext'] },
    channelTuning: { fixedDigits: 2, finish: ['Enter'] },
    states: { InputType: { values: [{ name: 'HDMI1', select: [{ setType: 2, commands: ['InputHdmi1'] }] }, { name: 'TV' }], next: ['InputNext'] } },
  });
  assert.deepEqual(read.inputs?.list?.map((one) => one.name), ['HDMI 1', 'Tuner']);
  assert.deepEqual(read.inputs?.list?.[0]?.commands, [{ kind: 'send', command: 'InputHdmi1' }]);
  assert.equal(read.inputs?.list?.[1]?.commands, undefined);
  assert.equal(read.channelTuning?.fixedDigits, 2);
  assert.deepEqual([...read.states!.keys()], ['InputType']);
  assert.deepEqual(read.states!.get('InputType')!.values[0]!.select, [{ setType: 2, steps: [{ kind: 'send', command: 'InputHdmi1' }] }]);
});

/**
 * The Panasonic television of section 305, read out of the archive and compared with what Logitech's
 * service answered for the same catalogue entry: its features copied off the entry, and the entry's own
 * timing record. Every value the two routes both state is compared, so a mapping of ours that renamed a
 * field onto the wrong one fails here.
 */
test('the archive states what Logitech\'s service answered for the same television, field for field',
  needing(skipWithoutIrArchive(), skipUnless('h650_panasonic_catalogue_features', 'h650_panasonic_catalogue_device')), () => {
    const read = catalogueDriving(IR_ARCHIVE!, 'Panasonic', 'TX-P42GT30E');
    type Feature = { __type: string; [k: string]: unknown };
    const features = (JSON.parse(readFileSync(imagePath('h650_panasonic_catalogue_features')!, 'utf8')) as {
      CopyFeaturesFromGlobalDeviceResult: Feature[];
    }).CopyFeaturesFromGlobalDeviceResult;
    const feature = (kind: string) => features.filter((one) => one.__type.startsWith(`${kind}:`));
    const entry = (JSON.parse(readFileSync(imagePath('h650_panasonic_catalogue_device')!, 'utf8')) as {
      GetGlobalDevicesResult: Record<string, unknown>[];
    }).GetGlobalDevicesResult[0]!;

    // Power: the service's press actions against the archive's steps.
    const [power] = feature('PowerFeature');
    const served = (list: string) => (power![list] as { IRCommandName: string; Duration: number | null }[])
      .map((one): DriveStep => (one.Duration === null
        ? { kind: 'send', command: one.IRCommandName }
        : { kind: 'send', command: one.IRCommandName, holdMs: one.Duration }));
    assert.equal(read.power?.type, 'discrete');
    assert.deepEqual(read.power?.on, served('PowerOnActions'));
    assert.deepEqual(read.power?.off, served('PowerOffActions'));
    assert.deepEqual(read.power?.on, [{ kind: 'send', command: 'PowerOn', holdMs: 1000 }]);
    assert.equal(read.timing.powerOnDelay, power!['PowerOnDelay']);

    // Inputs: the same names in the same order, and the same settling delay.
    const [input] = feature('InputFeature');
    assert.deepEqual(read.inputs?.list?.map((one) => one.name),
      (input!['Inputs'] as { InputName?: string; Name?: string }[]).map((one) => one.InputName ?? one.Name));
    assert.equal(read.inputs?.type, input!['InputType']);
    assert.equal(read.timing.inputDelay, input!['InputDelay']);

    // Channel entry, and the device's states by name.
    const [tuning] = feature('ChannelTuningFeature');
    assert.equal(read.channelTuning?.fixedDigits, tuning!['FixedDigits']);
    assert.deepEqual([...read.states!.keys()].sort(),
      feature('InternalStateFeature').map((one) => String(one['StateName'] ?? one['Name'])).sort());

    // The entry's own timing record.
    assert.equal(read.timing.interDeviceDelay, entry['InterDeviceDelay']);
    assert.equal(read.timing.interKeyDelay, entry['InterKeyDelay']);
    assert.equal(read.timing.pressMinRepeats, entry['MinRepeats']);
  });

/**
 * Every record of the archive read through, with the counts the survey found. Exact, per the house rule:
 * a record the reader refuses fails by name, and a count that moves says the archive changed under us.
 */
test('every device record in the archive reads, and the power and input counts are what was surveyed',
  skipWithoutIrArchive(), () => {
    assert.equal(archiveManifest(IR_ARCHIVE!).schemaVersion, 2);
    const powerTypes = new Map<string, number>();
    let records = 0;
    let timedPower = 0;
    let holds = 0;
    let digitHolds = 0;
    let named = 0;
    let inputs = 0;
    const count = (steps: readonly DriveStep[] | undefined) => {
      for (const step of steps ?? []) {
        if (step.kind === 'hold') {
          holds += 1;
          if (/^\d+$/.test(step.command)) digitHolds += 1;
        }
      }
    };
    const root = join(IR_ARCHIVE!, 'devices');
    for (const slug of readdirSync(root)) {
      for (const file of readdirSync(join(root, slug))) {
        if (file === 'index.json') continue;
        const raw = JSON.parse(readFileSync(join(root, slug, file), 'utf8')) as unknown;
        let read;
        try {
          read = deviceDriving(raw);
        } catch (error) {
          throw new Error(`${slug}/${file}: ${(error as Error).message}`);
        }
        records += 1;
        const type = read.power?.type ?? 'absent';
        powerTypes.set(type, (powerTypes.get(type) ?? 0) + 1);
        const power = [...(read.power?.on ?? []), ...(read.power?.off ?? []), ...(read.power?.toggle ?? [])];
        if (power.some((step) => step.kind === 'send' && step.holdMs !== undefined)) timedPower += 1;
        for (const steps of [read.power?.on, read.power?.off, read.power?.toggle, read.power?.onReset,
          read.inputs?.next, read.inputs?.previous, read.inputs?.start, read.inputs?.finish,
          ...(read.inputs?.list ?? []).map((one) => one.commands),
          read.channelTuning?.start, read.channelTuning?.finish, read.channelTuning?.greaterTen,
          read.channelTuning?.greaterHundred]) count(steps);
        for (const state of read.states?.values() ?? []) {
          for (const steps of [state.next, state.previous, state.start, state.finish,
            ...state.values.flatMap((value) => (value.select ?? []).map((way) => way.steps))]) count(steps);
        }
        if (read.inputs?.list !== undefined) {
          named += 1;
          inputs += read.inputs.list.length;
        }
      }
    }
    assert.equal(records, 276236);
    assert.deepEqual(Object.fromEntries([...powerTypes].sort()),
      { absent: 35409, discrete: 63924, none: 3, toggle: 176596, unknown: 304 });
    // Section 305's television is one of these: a power press held for a stated time.
    assert.equal(timedPower, 3234);
    assert.equal(holds, 49);
    assert.equal(digitHolds, 14);
    assert.equal(named, 209007);
    assert.equal(inputs, 1089512);
  });

/**
 * The archive's step order against the service's own. Its author's notes say an action list's order is the
 * steps' `Order` field and not their position in the array, on a small share of lists, so a projection that
 * kept array position would turn a power toggle's press, wait, press into press, press, wait. Measured over
 * the raw capture the archive was projected from: 3884 of 477079 lists are stored out of order, and every
 * one of them reads in `Order` sequence through this reader. A hold of 0 ms is projected as a plain press,
 * which the comparison follows. Only the lists a device states once are compared, power, input switching
 * and channel entry, not the per input and per state ones. The capture is a release asset rather than part
 * of the checkout, 329 MB, so this skips without it.
 */
test('the archive puts every power, input and channel action list in the service\'s own step order',
  needing(skipWithoutIrArchive(), skipUnless('ir_archive_raw_features')), async () => {
    const where = new Map<number, string>();
    const root = join(IR_ARCHIVE!, 'devices');
    for (const slug of readdirSync(root)) {
      for (const row of JSON.parse(readFileSync(join(root, slug, 'index.json'), 'utf8')) as { f: string; id: number }[]) {
        where.set(row.id, join(root, slug, row.f));
      }
    }
    type Action = { __type: string; Order?: number; IRCommandName?: string; Duration?: number | null;
      StateName?: string; StateValue?: string; Delay?: number };
    const step = (one: Action): DriveStep => {
      const kind = one.__type.split(':')[0];
      if (kind === 'IRPressAction') {
        return one.Duration ? { kind: 'send', command: one.IRCommandName!, holdMs: one.Duration }
          : { kind: 'send', command: one.IRCommandName! };
      }
      if (kind === 'IRDevAction') return { kind: 'state', state: one.StateName!, value: one.StateValue! };
      if (kind === 'IRDelayAction') return { kind: 'wait', ms: one.Delay! };
      if (kind === 'IRHoldAction') return { kind: 'hold', command: one.IRCommandName! };
      throw new Error(`unknown action ${one.__type}`);
    };
    // The service's list name against the reader's, per feature.
    const lists: Record<string, [keyof DeviceDriving, Record<string, string>]> = {
      PowerFeature: ['power', { PowerOnActions: 'on', PowerOffActions: 'off', PowerToggleActions: 'toggle', PowerOnResetActions: 'onReset' }],
      InputFeature: ['inputs', { NextActions: 'next', PreviousActions: 'previous', StartActions: 'start', FinishActions: 'finish' }],
      ChannelTuningFeature: ['channelTuning', { StartActions: 'start', FinishActions: 'finish', GreaterTenActions: 'greaterTen', GreaterHundredActions: 'greaterHundred' }],
    };
    let compared = 0;
    let shuffled = 0;
    const lines = createInterface({ input: createReadStream(imagePath('ir_archive_raw_features')!).pipe(createGunzip()) });
    for await (const line of lines) {
      const raw = JSON.parse(line) as { id: number; features?: ({ __type: string } & Record<string, unknown>)[] | null };
      const file = where.get(raw.id);
      assert.ok(file !== undefined, `device ${raw.id} is in the capture and not in the archive`);
      let read: DeviceDriving | undefined;
      for (const feature of raw.features ?? []) {
        const mapping = lists[feature.__type.split(':')[0]!];
        if (mapping === undefined) continue;
        const [block, names] = mapping;
        for (const [served, ours] of Object.entries(names)) {
          const actions = feature[served] as Action[] | null | undefined;
          if (!actions || actions.length === 0) continue;
          read ??= deviceDriving(JSON.parse(readFileSync(file, 'utf8')));
          const sorted = [...actions].sort((a, b) => (a.Order ?? 0) - (b.Order ?? 0));
          if (sorted.some((one, i) => one !== actions[i])) shuffled += 1;
          const projected = (read[block] as Record<string, unknown> | undefined)?.[ours];
          assert.deepEqual(projected, sorted.map(step), `device ${raw.id}, ${served}`);
          compared += 1;
        }
      }
    }
    assert.equal(compared, 477079);
    assert.equal(shuffled, 3884);
  });
