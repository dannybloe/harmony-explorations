/**
 * Measurements over the whole infrared archive that belong with `driving.test.ts`, run on request by
 * `make archive-measure` and never by the test suite.
 *
 * A test reads the lab's sample of the archive, a fixed copy of the few files it needs, which `@harmony/lab`
 * locates. What stands here walks the archive itself and states what it counted, which is a statement about
 * one release of a third party's repository and not about this project's code:
 * that every device record reads, with the power and input counts surveyed, and that every action list is in the service's step order.
 * A measurement whose numbers move with the archive is bound to the release it was taken at and is skipped, never
 * passed, at any other; moving one to a newer release is to measure again and repin. What each establishes and why
 * is argued in the header of the test file beside this one.
 */
import assert from 'node:assert/strict';
import { createReadStream, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import test from 'node:test';
import { IR_ARCHIVE, imagePath, needing, skipUnless, skipUnlessIrArchiveRelease, slow } from '@harmony/lab';
import { archiveManifest } from '../../src/catalogue/archive.node.ts';
import { deviceDriving } from '../../src/catalogue/driving.ts';
import type { DeviceDriving, DriveStep } from '../../src/catalogue/driving.ts';

/**
 * Every record of the archive read through, with the counts the survey found. Exact, per the house rule:
 * a record the reader refuses fails by name, and a count that moves says the archive changed under us.
 */
test('every device record in the archive reads, and the power and input counts are what was surveyed',
  slow(skipUnlessIrArchiveRelease()), () => {
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
    // Folders only: Finder leaves a .DS_Store beside them, which is not a device.
    for (const slug of readdirSync(root, { withFileTypes: true }).filter((one) => one.isDirectory()).map((one) => one.name)) {
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
 * which the comparison follows. Only the lists a device states once are compared here, power, input
 * switching and channel entry; the per input and per state ones are compared in `catalogueraw.test.ts`,
 * through the projection the side file is built on. The capture is a release asset rather than part
 * of the checkout, 329 MB, so this skips without it.
 */
test('the archive puts every power, input and channel action list in the service\'s own step order',
  slow(needing(skipUnlessIrArchiveRelease(), skipUnless('ir_archive_raw_features'))), async () => {
    const where = new Map<number, string>();
    const root = join(IR_ARCHIVE!, 'devices');
    // Folders only: Finder leaves a .DS_Store beside them, which is not a device.
    for (const slug of readdirSync(root, { withFileTypes: true }).filter((one) => one.isDirectory()).map((one) => one.name)) {
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
