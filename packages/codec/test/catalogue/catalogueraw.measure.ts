/**
 * Measurements over the whole infrared archive that belong with `catalogueraw.test.ts`, run on request by
 * `make archive-measure` and never by the test suite.
 *
 * A test reads the lab's sample of the archive, a fixed copy of the few files it needs, which `@harmony/lab`
 * locates. What stands here walks the archive itself and states what it counted, which is a statement about
 * one release of a third party's repository and not about this project's code:
 * the archive's devices against the raw capture's side file, which is aligned to one release of the archive.
 * A measurement whose numbers move with the archive is bound to the release it was taken at and is skipped, never
 * passed, at any other; moving one to a newer release is to measure again and repin. What each establishes and why
 * is argued in the header of the test file beside this one.
 */
import assert from 'node:assert/strict';
import { createReadStream, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import test from 'node:test';
import { IR_ARCHIVE, imagePath, needing, skipUnless, skipUnlessIrArchiveRelease, skipWithoutIrArchive, slow } from '@harmony/lab';
import { deviceDriving } from '../../src/catalogue/driving.ts';
import { type RawDeviceRecord, alignDevice, rawProjection } from '../../src/catalogue/catalogueraw.ts';
import { catalogueRules, rawDerivedState } from '../../src/catalogue/catalogueraw.node.ts';

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

test('the one door answers from both sources: the Sony\'s Netflix numbered 1 and online, and recording steps marked',
  needing(skipUnlessIrArchiveRelease(), skipWithoutDerived()), () => {
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
  needing(skipUnlessIrArchiveRelease(), skipWithoutDerived()), () => {
    const denon = catalogueRules(IR_ARCHIVE!, 'Denon', 'AVR-1912', { raw: RAW_DIRECTORY! });
    const numbers = denon.raw!.inputs.map((one) => one['inputOrder']);
    const names = denon.archive.inputs!.list!.map((one) => one.name);
    assert.deepEqual([names[9], numbers[9], names[10], numbers[10]], ['CD', 11, 'QuickSelect 1', 11]);
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
  slow(needing(skipWithoutIrArchive(), skipUnless('ir_archive_raw_features'))), async () => {
    const where = new Map<number, string>();
    const root = join(IR_ARCHIVE!, 'devices');
    // Folders only: Finder leaves a .DS_Store beside them, which is not a device.
    for (const slug of readdirSync(root, { withFileTypes: true }).filter((one) => one.isDirectory()).map((one) => one.name)) {
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
      device: [480158, 3887, 480158, 0],
      input: [685859, 56463, 685859, 0],
      stateRoute: [83332, 5283, 83332, 0],
      stateList: [29526, 68, 29526, 0],
    });
    assert.deepEqual(unaligned, ['110096 states["AV4Input"]']);
  });
