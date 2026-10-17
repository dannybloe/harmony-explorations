/**
 * The log area and the parameter block built for an architecture, `todo-compile-one.md` 6.4, measured
 * against Logitech's own compiles of the Harmony One and of the Harmony 600, 650 and 700.
 *
 * **Nothing here is read off the compile being rebuilt**: the log area is the architecture's and the
 * parameter block the model's, so the builder takes no description at all, and laying the built pieces
 * into a compile in place of Logitech's and getting the compile back byte for byte says both are right.
 * There is no blind control because there is nothing to blind; the failing controls are the other
 * architecture's log area, the One's block without the twelve bytes past group 9, and the refusals.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Container, ContainerPiece } from '../src/index.ts';
import {
  FirmwareSectionsError,
  LOG_AREAS,
  PARAMETER_VALUES,
  buildLogArea,
  buildParameterBlock,
  describeWiring,
  layOutContainer,
  lightBandExtras,
  logArea,
  parameterGroups,
  parse,
  takeApart,
  withFirmwareSections,
} from '../src/index.ts';
import { TOUCH_PARAMETERS } from '../src/families/touch/parameters.ts';

/** The 19 distinct Harmony One compiles, `todo-compile-one.md` 2.2, as `startupassistant.test.ts` lists them. */
const ONE_COMPILES = ['one_config', 'one_config_unprogrammed', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_two_devices', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_asfound_config', 'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;

/** The thirteen arch 14 compiles section 312 names, as `frame.test.ts` lists them. */
const ARCH14_COMPILES = [
  'h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4',
] as const;

const containerOf = (name: string): Container => parse(load(name) as Uint8Array);
const same = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((v, i) => v === b[i]);
const targets = (table: ContainerPiece): ContainerPiece[] =>
  [...table.refs].sort((a, b) => a.at - b.at).map((ref) => ('to' in ref ? ref.to : undefined)!);

test('todo-compile-one 6.4: the log area and the parameter block of all 19 Harmony One compiles are built byte for byte, part by part',
     skipUnless(...ONE_COMPILES), () => {
  const tally = { whole: 0, log: 0, logRefs: 0, table: 0, groups: 0, bandGroup: 0 };
  let bytes = 0;
  for (const name of ONE_COMPILES) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const log = buildLogArea(12);
    const block = buildParameterBlock(12, TOUCH_PARAMETERS);
    // Each built piece against Logitech's, whose address fields `takeApart` zeroed as the builder leaves its own.
    const theirLog = layout.sections[2]!.head[0]!;
    if (same(log.bytes, theirLog.bytes)) tally.log += 1;
    if (JSON.stringify(log.refs) === JSON.stringify(theirLog.refs)) tally.logRefs += 1;
    const table = layout.sections[15]!.head[0]!;
    if (same(block.table.bytes, table.bytes)) tally.table += 1;
    targets(table).forEach((p, k) => {
      if (!same(block.groups[k]!.bytes, p.bytes)) return;
      tally.groups += 1;
      // Group 9 carries the twelve bytes its firmware reads past the six values it declares.
      if (k === 9 && p.bytes.length === 1 + 12 + 12) tally.bandGroup += 1;
    });
    bytes += log.bytes.length + block.table.bytes.length + block.groups.reduce((sum, p) => sum + p.bytes.length, 0);
    const laid = layOutContainer(withFirmwareSections(layout, log, block)).bytes;
    if (same(laid, c.blob)) tally.whole += 1;
  }
  assert.deepEqual(tally, { whole: 19, log: 19, logRefs: 19, table: 19, groups: 11 * 19, bandGroup: 19 });
  // Nine bytes of log area, a table of 34 and 151 bytes of groups, on each.
  assert.equal(bytes, 19 * (9 + 34 + 151));
});

test('todo-compile-one 6.4: the Harmony One\'s log area and parameter values are one set on all 19, as read',
     skipUnless(...ONE_COMPILES), () => {
  let log = 0;
  let values = 0;
  let band = 0;
  for (const name of ONE_COMPILES) {
    const c = containerOf(name);
    const area = logArea(c)!;
    if (area.capacity === LOG_AREAS[12]!.capacity && area.start === LOG_AREAS[12]!.start && area.limit === LOG_AREAS[12]!.limit && area.length === 9) log += 1;
    if (JSON.stringify(parameterGroups(c)!.map((g) => g.values)) === JSON.stringify(TOUCH_PARAMETERS.groups)) values += 1;
    const extras = lightBandExtras(c)!;
    if (JSON.stringify([extras.pair.values, extras.fields.bytes]) === JSON.stringify([TOUCH_PARAMETERS.lightBand!.pair, TOUCH_PARAMETERS.lightBand!.fields])) band += 1;
  }
  assert.deepEqual({ log, values, band }, { log: 19, values: 19, band: 19 });
});

test('todo-compile-one 6.4: the same builders give the thirteen arch 14 compiles their log area and their model\'s parameter block',
     skipUnless(...ARCH14_COMPILES), () => {
  let whole = 0;
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const block = buildParameterBlock(14, { groups: PARAMETER_VALUES[describeWiring(layout).model] });
    if (same(layOutContainer(withFirmwareSections(layout, buildLogArea(14), block)).bytes, c.blob)) whole += 1;
  }
  assert.equal(whole, 13);
});

test('todo-compile-one 6.4: the other architecture\'s log area fails every Harmony One compile, and what the firmware would ignore is refused',
     skipUnless(...ONE_COMPILES), () => {
  let differs = 0;
  for (const name of ONE_COMPILES) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const laid = layOutContainer(withFirmwareSections(layout, buildLogArea(14), buildParameterBlock(12, TOUCH_PARAMETERS))).bytes;
    if (!same(laid, c.blob)) differs += 1;
  }
  assert.equal(differs, 19);
  // Without the twelve bytes past group 9, which the Harmony One's firmware reads whatever is there.
  assert.throws(() => buildParameterBlock(12, { groups: TOUCH_PARAMETERS.groups }), /reads past group 9 and nothing is given/);
  // With them on arch 14, whose firmware is not read past its groups.
  assert.throws(() => buildParameterBlock(14, { groups: PARAMETER_VALUES['harmony-650'], lightBand: TOUCH_PARAMETERS.lightBand! }), /not read past group 9/);
  // A group whose length the firmware does not demand: arch 14's four light levels in the One's group 1.
  const short = TOUCH_PARAMETERS.groups.map((g, k) => (k === 1 ? PARAMETER_VALUES['harmony-650'][1]! : g));
  assert.throws(() => buildParameterBlock(12, { ...TOUCH_PARAMETERS, groups: short }), /demands 6 values in group 1, not 4/);
  // A value past two bytes, and architectures with no reading.
  const wide = TOUCH_PARAMETERS.groups.map((g, k) => (k === 8 ? [70000, 10980] : g));
  assert.throws(() => buildParameterBlock(12, { ...TOUCH_PARAMETERS, groups: wide }), /a parameter is a u16, not 70000/);
  assert.throws(() => buildLogArea(9), FirmwareSectionsError);
  assert.throws(() => buildParameterBlock(9, { groups: [] }), FirmwareSectionsError);
});
