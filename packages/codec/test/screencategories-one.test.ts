/**
 * Which screen bytes of a Harmony One configuration are fixed, dynamic or the setup's. Section 405, for
 * `todo-compile-one.md` 2.1, as section 317 did for the Harmony 650.
 *
 * The population is the sixteen English Harmony One compiles of skin 54, the skin the spare reports and the one
 * decision 23 builds for. Two more English compiles carry skin 59, the European Harmony One, and differ in ten
 * and four of the fixed screens, and one is Dutch; both are measured below rather than mixed in, because each is a reason a screen can
 * differ that is neither the setup nor the run time.
 *
 * **Unlike the Harmony 650's four, no device or activity name is in all of these**, which is what lets the census
 * decide the screens structure cannot name, `sharesNoHousehold`. That rules out a screen naming a device, not one
 * a feature every member has brings with it.
 *
 * Every figure is exact, and the lists are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type CensusMember,
  type Container,
  SCREEN_OWNERS,
  attributeScreens,
  coverage,
  eventMap,
  householdNames,
  modeRecords,
  modeRoles,
  parse,
  renderPage,
  screenCategoryTotals,
  screenCensus,
  screenUnits,
  sharesNoHousehold,
} from '../src/index.ts';

/** The sixteen English compiles of skin 54, in the order the per configuration figures are listed. */
const SKIN_54 = ['harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;
/** The two English compiles of skin 59, the European Harmony One: the everyday One's and its factory file. */
const SKIN_59 = ['one_config', 'one_config_unprogrammed'] as const;
/** The Dutch compile, the friend's One as found. */
const DUTCH = 'one_friend_asfound_config';

interface Loaded extends CensusMember { c: Container }
const cache = new Map<string, Loaded>();
function loaded(name: string): Loaded {
  let one = cache.get(name);
  if (one === undefined) {
    const c = parse(require_(name));
    const units = screenUnits(c);
    assert.ok(units !== undefined, `${name} has screen units`);
    one = { name, c, units, household: householdNames(c) };
    cache.set(name, one);
  }
  return one;
}
const population = (names: readonly string[]): Loaded[] => names.map(loaded);

test('section 405: every screen byte of a Harmony One configuration is in exactly one unit, and fixed is 795792 to 795925 bytes on each of the sixteen of skin 54',
     skipUnless(...SKIN_54, ...SKIN_59, DUTCH), () => {
  const sixteen = population(SKIN_54);
  // screen bytes, fixed, dynamic, setup
  const expected: Record<(typeof SKIN_54)[number], [number, number, number, number]> = {
    harvest_one_two_devices: [1093936, 795905, 12203, 285828],
    one_spare_after_sync: [1203552, 795873, 12203, 395476],
    one_spare_myharmony: [1410970, 795797, 12203, 602970],
    one_spare_20260830: [1419517, 795797, 12203, 611517],
    calibration_one: [1316051, 795848, 12203, 508000],
    calibration_favchannels: [1317078, 795848, 12203, 509027],
    calibration_favzero: [1419133, 795797, 12203, 611133],
    compiled_protocols: [1471029, 795793, 12203, 663033],
    compiled_protocols_2: [1442114, 795793, 12203, 634118],
    compiled_protocols_3: [1433127, 795792, 12203, 625132],
    harvest_one_families_1: [1071184, 795906, 12203, 263075],
    harvest_one_families_2: [1093488, 795925, 12203, 285360],
    harvest_one_families_3: [1121864, 795913, 12203, 313748],
    one_friend_legacy_sync_config: [1345522, 795807, 12203, 537512],
    phase7_before: [1317078, 795848, 12203, 509027],
    phase7_after: [1321688, 795848, 12203, 513637],
  };
  for (const one of sixteen) {
    const screen = coverage(one.c).byOwner
      .filter(([owner]) => SCREEN_OWNERS.has(owner)).reduce((n, [, bytes]) => n + bytes, 0);
    const totals = screenCategoryTotals(attributeScreens(one.units, sixteen));
    assert.deepEqual([screen, totals.fixed, totals.dynamic, totals.setup], expected[one.name as (typeof SKIN_54)[number]], one.name);
  }
  // Coverage with no overlaps on all nineteen, the three beyond skin 54 included.
  for (const one of population([...SKIN_54, ...SKIN_59, DUTCH])) {
    const screen = coverage(one.c).byOwner
      .filter(([owner]) => SCREEN_OWNERS.has(owner)).reduce((n, [, bytes]) => n + bytes, 0);
    assert.equal(one.units.reduce((n, unit) => n + unit.bytes, 0), screen, one.name);
    const ranges = one.units.flatMap((unit) => unit.ranges).sort((a, b) => a.start - b.start);
    for (let k = 1; k < ranges.length; k += 1) {
      assert.ok(ranges[k - 1]!.start + ranges[k - 1]!.length <= ranges[k]!.start, `${one.name}: overlap at ${ranges[k]!.start}`);
    }
  }
  // Only the 38 other modes change size: the rest of fixed is the same on each.
  for (const one of sixteen) {
    const fixed = attributeScreens(one.units, sixteen).filter((a) => a.category === 'fixed');
    const other = fixed.filter((a) => a.unit.kind === 'mode' && a.unit.role === 'other');
    assert.equal(fixed.reduce((n, a) => n + a.unit.bytes, 0) - other.reduce((n, a) => n + a.unit.bytes, 0), 785417, one.name);
  }
});

test('section 405: no device name and no activity name is in all sixteen, nor in all eighteen English compiles, and the European pair shares one',
     skipUnless(...SKIN_54, ...SKIN_59), () => {
  assert.equal(sharesNoHousehold(population(SKIN_54)), true);
  assert.equal(sharesNoHousehold(population([...SKIN_54, ...SKIN_59])), true);
  // The two European compiles share one device name, TV, and no activity.
  assert.equal(sharesNoHousehold(population(SKIN_59)), false);
  const [everyday, factory] = population(SKIN_59);
  assert.deepEqual([everyday!.household!.devices.filter((n) => factory!.household!.devices.includes(n)),
    everyday!.household!.activities.filter((n) => factory!.household!.activities.includes(n))], [['TV'], []]);
});

test('section 405: the head of a Harmony One mode table is the event map\'s 10 firmware screens and 30 status screens, 3 binding a keypad and 37 not, on all nineteen',
     skipUnless(...SKIN_54, ...SKIN_59, DUTCH), () => {
  for (const name of [...SKIN_54, ...SKIN_59, DUTCH]) {
    assert.equal(eventMap(loaded(name).c)?.fallback, 10, name);
    const roles = modeRoles(loaded(name).c);
    const head = roles.slice(0, 40);
    assert.deepEqual([head.filter((r) => r === 'system').length, head.filter((r) => r === 'status').length], [3, 37], name);
    assert.ok(!['system', 'status'].includes(roles[40] as string), name);
  }
});

test('section 405: the 78 fixed modes of skin 54 are the 40 of the head and 38 others, every one re-encoded per compile, and each renders to its twin\'s pixels, 1170 pairs',
     skipUnless(...SKIN_54), () => {
  const sixteen = population(SKIN_54);
  for (const one of sixteen) {
    const modes = attributeScreens(one.units, sixteen).filter((a) => a.unit.kind === 'mode' && a.category === 'fixed');
    const byRole: Record<string, number> = {};
    for (const a of modes) byRole[a.unit.role as string] = (byRole[a.unit.role as string] ?? 0) + 1;
    assert.deepEqual(byRole, { system: 3, status: 37, other: 38 }, one.name);
    // None byte identical once relocated: each binds action lists and sets the configuration numbers.
    assert.deepEqual([modes.filter((a) => a.strength === 'verbatim').length, modes.filter((a) => a.strength === 're-encoded').length], [0, 78], one.name);
  }
  // The renderer shares no code with the normal form: each fixed mode of the first, page by page, against its
  // twin in each of the other fifteen.
  const pixels = (c: Container, label: string): string =>
    modeRecords(c)![Number(label.split(' ')[1])]!.pages.map((page) => renderPage(c, page)!.raster.pixels.join(',')).join('|');
  const first = sixteen[0] as Loaded;
  let pairs = 0;
  for (const a of attributeScreens(first.units, sixteen)) {
    if (a.unit.kind !== 'mode' || a.category !== 'fixed') continue;
    const mine = pixels(first.c, a.unit.label);
    for (const other of sixteen.slice(1)) {
      const twin = other.units.find((unit) => unit.look === a.unit.look);
      assert.ok(twin !== undefined, `${a.unit.label} in ${other.name}`);
      assert.equal(pixels(other.c, twin.label), mine, `${a.unit.label} against ${other.name}'s ${twin.label}`);
      pairs += 1;
    }
  }
  assert.equal(pairs, 1170);
});

test('section 405: what each category holds on Logitech\'s compile of two devices',
     skipUnless(...SKIN_54), () => {
  const sixteen = population(SKIN_54);
  const tab: Record<string, [number, number]> = {};
  for (const a of attributeScreens(loaded('harvest_one_two_devices').units, sixteen)) {
    const key = `${a.category} ${a.unit.kind}${a.unit.role === undefined ? '' : `:${a.unit.role}`}`;
    const now = tab[key] ?? [0, 0];
    tab[key] = [now[0] + 1, now[1] + a.unit.bytes];
  }
  assert.deepEqual(tab, {
    'dynamic dynamic-program': [4, 3516], 'dynamic picture': [16, 8687],
    'fixed case-program': [9, 261], 'fixed glyph': [280, 32426], 'fixed hit-page': [25, 2125],
    'fixed mode:other': [38, 10488], 'fixed mode:status': [37, 4025], 'fixed mode:system': [3, 970], 'fixed picture': [36, 745610],
    'setup case-program': [16, 80], 'setup font-set': [16, 3600], 'setup glyph': [133, 14532], 'setup hit-page': [4, 319],
    'setup mode:device': [2, 6226], 'setup mode:device-list': [2, 394], 'setup mode:other': [11, 1626],
    'setup picture': [6, 258542], 'setup table': [4, 509],
  });
});

test('section 405: the two European compiles differ from skin 54 in 10 and 4 of the 78 fixed modes, and the Dutch compile in 69, every one that draws text',
     skipUnless(...SKIN_54, ...SKIN_59, DUTCH), () => {
  const sixteen = population(SKIN_54);
  const first = loaded('harvest_one_two_devices');
  const fixed = attributeScreens(first.units, sixteen).filter((a) => a.unit.kind === 'mode' && a.category === 'fixed');
  const own = screenCensus(first.units);
  const differing = (name: string): number => {
    const there = screenCensus(loaded(name).units);
    return fixed.filter((a) => (there.get(a.unit.look) ?? 0) !== own.get(a.unit.look)).length;
  };
  // The clock's pickers, the Options menu and the Remote Assistant's screens: the everyday One's compile holds no
  // assistant, section 403, and its factory file does.
  assert.deepEqual(SKIN_59.map(differing), [10, 4]);
  // Every fixed screen that draws text, in Dutch; the two head screens and seven blank ones that draw none are the same.
  const dutch = screenCensus(loaded(DUTCH).units);
  const head = fixed.filter((a) => a.unit.role === 'system' || a.unit.role === 'status');
  assert.equal(head.filter((a) => (dutch.get(a.unit.look) ?? 0) === 0).length, 38);
  assert.equal(fixed.filter((a) => (dutch.get(a.unit.look) ?? 0) !== own.get(a.unit.look)).length, 69);
});
