/**
 * Which screen bytes of a Harmony 650 configuration are fixed, dynamic or the setup's. Section 317, for
 * `todo-compile-650.md` 7.2.
 *
 * The population is the four Harmony 650 configurations Logitech compiled that the lab holds: the 650's
 * own read off the remote, the one after a Panasonic television was added through MyHarmony, and two
 * power hold compiles of the test account's 650 record. **They are not four independent setups**: all
 * four carry one household's devices and three of its activities, and that is measured below rather
 * than hidden, because it is why a census of these four cannot decide fixed on its own.
 *
 * Every figure is exact. The lists are literals in this file, so a figure moves only when a reader or
 * the population changes, and then it moves in the diff.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type CensusMember,
  type Container,
  FIXED_MODE_ROLES,
  SCREEN_OWNERS,
  attributeScreens,
  coverage,
  devices,
  activityNames,
  modeRecords,
  modeRoles,
  parse,
  renderPage,
  screenCategoryTotals,
  screenCensus,
  screenUnits,
} from '../src/index.ts';

/** The four Harmony 650 compiles, in the order the per configuration figures below are listed. */
const H650 = ['h650_config_region', 'h650_panasonic_config', 'h650_power_hold_compile',
  'h650_power_hold_compile_2'] as const;
/** The Harmony 700 compiles Logitech's service made in 2026, the same service generation as the 650's. */
const H700_CURRENT = ['h700_28_config_region', 'h700_power_hold_compile', 'h700_power_hold_compile_2',
  'h700_power_hold_compile_3', 'h700_power_hold_compile_4'] as const;
/** The two older Harmony 700 compiles, built in 2021 and 2023. */
const H700_OLDER = ['h700_config', 'h700_config_2'] as const;
const H600 = ['h600_config', 'calibration_h600'] as const;
const ARCH14 = [...H650, ...H600, ...H700_OLDER, ...H700_CURRENT];

interface Loaded extends CensusMember { c: Container }

/** Parsed and cut once per name, since every test here wants the same units. */
const cache = new Map<string, Loaded>();
function loaded(name: string): Loaded {
  let one = cache.get(name);
  if (one === undefined) {
    const c = parse(require_(name));
    const units = screenUnits(c);
    assert.ok(units !== undefined, `${name} has screen units`);
    one = { name, c, units };
    cache.set(name, one);
  }
  return one;
}
const population = (names: readonly string[]): Loaded[] => names.map(loaded);

test('every screen byte of a Harmony 650 configuration is in exactly one unit and gets one of three categories',
     skipUnless(...H650), () => {
  // `screenUnits` throws on a byte in no unit or in two, so reaching the sums is half the assertion;
  // the other half is that the units add up to what the byte accounting gives the screen owners, which
  // is computed by `coverage` and not by anything in `screencategories.ts`.
  const four = population(H650);
  const expected: Record<(typeof H650)[number], [number, number, number, number]> = {
    // screen bytes, fixed, dynamic, setup
    h650_config_region: [628447, 471329, 13391, 143727],
    h650_panasonic_config: [645496, 471328, 13391, 160777],
    h650_power_hold_compile: [679481, 471328, 13391, 194762],
    h650_power_hold_compile_2: [681067, 471328, 13391, 196348],
  };
  for (const one of four) {
    const screen = coverage(one.c).byOwner
      .filter(([owner]) => SCREEN_OWNERS.has(owner)).reduce((n, [, bytes]) => n + bytes, 0);
    const inUnits = one.units.reduce((n, unit) => n + unit.bytes, 0);
    const totals = screenCategoryTotals(attributeScreens(one.units, four));
    assert.deepEqual([screen, totals.fixed, totals.dynamic, totals.setup],
                     expected[one.name as (typeof H650)[number]], one.name);
    assert.equal(inUnits, screen, `${one.name}: the units cover the screen bytes exactly`);
    assert.equal(totals.fixed + totals.dynamic + totals.setup, screen, one.name);
    // Disjoint, checked here too rather than only inside the reader: every unit's ranges against
    // every other's, as one sorted sweep.
    const ranges = one.units.flatMap((unit) => unit.ranges).sort((a, b) => a.start - b.start);
    for (let k = 1; k < ranges.length; k += 1) {
      assert.ok(ranges[k - 1]!.start + ranges[k - 1]!.length <= ranges[k]!.start, `${one.name}: overlap at ${ranges[k]!.start}`);
    }
  }
});

test('the fixed screens of a Harmony 650 are the firmware screens, the tour and Off, 55 of them, all four compiles alike',
     skipUnless(...H650), () => {
  const four = population(H650);
  for (const one of four) {
    const answers = attributeScreens(one.units, four);
    const fixedModes = answers.filter((a) => a.unit.kind === 'mode' && a.category === 'fixed');
    const byRole = new Map<string, number>();
    for (const a of fixedModes) byRole.set(a.unit.role as string, (byRole.get(a.unit.role as string) ?? 0) + 1);
    assert.deepEqual(Object.fromEntries(byRole), { system: 7, status: 37, tour: 10, off: 1 }, one.name);
    // Every mode structure allows to be fixed passes the census in all four. A failure here is the
    // falsification: a firmware screen, a tour screen or Off that differs between two 650 compiles.
    const eligible = answers.filter((a) => a.unit.kind === 'mode' && FIXED_MODE_ROLES.has(a.unit.role!));
    assert.equal(eligible.length, 55, one.name);
    assert.ok(eligible.every((a) => a.category === 'fixed'), one.name);
    // **What fixed means**: the same look. Byte identical once relocated is the stronger answer, and
    // 40 of the 55 have it; the other 15 differ only in numbers the configuration assigns.
    assert.equal(fixedModes.filter((a) => a.strength === 'verbatim').length, 40, one.name);
    assert.equal(fixedModes.filter((a) => a.strength === 're-encoded').length, 15, one.name);
  }
});

test('every page of a fixed screen renders to the same pixels on the other three Harmony 650 compiles, 165 pairs',
     skipUnless(...H650), () => {
  // The renderer is a second route to "the same screen": it draws the page from the bytes and shares no
  // code with the normal form. 55 fixed modes of the first compile, each against its twin in each of the
  // other three, 165 pairs; each pair compares every page. A mode's own program, which runs before its
  // pages, is not rendered on its own here.
  const four = population(H650);
  const pixels = (c: Container, label: string): string => {
    const record = (modeRecords(c) ?? [])[Number(label.split(' ')[1])];
    assert.ok(record !== undefined);
    return record.pages.map((page) => {
      const drawn = renderPage(c, page);
      assert.ok(drawn !== undefined);
      return drawn.raster.pixels.join(',');
    }).join('|');
  };
  const first = four[0] as Loaded;
  let pairs = 0;
  for (const answer of attributeScreens(first.units, four)) {
    if (answer.unit.kind !== 'mode' || answer.category !== 'fixed') continue;
    const mine = pixels(first.c, answer.unit.label);
    for (const other of four.slice(1)) {
      const twin = other.units.find((unit) => unit.look === answer.unit.look);
      assert.ok(twin !== undefined, `${answer.unit.label} has a twin in ${other.name}`);
      assert.equal(pixels(other.c, twin.label), mine, `${answer.unit.label} against ${other.name}'s ${twin.label}`);
      pairs += 1;
    }
  }
  assert.equal(pairs, 165);
});

test('a census of four Harmony 650 compiles alone would call 166 setup screens fixed, which is why structure decides',
     skipUnless(...H650), () => {
  // The four share one household's devices and activities, so a help screen about the Denon occurs
  // once in each. These are the modes structure makes the setup's whose look occurs as often in all
  // four; a census alone would have put them in fixed. The figure is a statement about this population.
  const four = population(H650);
  const censuses = four.map((one) => screenCensus(one.units));
  const expected = [166, 166, 166, 166];
  four.forEach((one, k) => {
    const own = screenCensus(one.units);
    const passengers = attributeScreens(one.units, four).filter((a) => a.unit.kind === 'mode'
      && a.category === 'setup' && censuses.every((census) => census.get(a.unit.look) === own.get(a.unit.look)));
    assert.equal(passengers.length, expected[k], one.name);
  });
});

test('some setup glyphs and case programs are setup by the census and not by structure, counted per compile',
     skipUnless(...H650), () => {
  // The other direction of the rule above: a unit structure would allow, refused because its count or its
  // look varies. Glyphs a fixed screen draws, refused because the same glyph occurs a different number of
  // times in another compile (6 against 7, or 1 against 2); case programs of a lookup the reader ties
  // to no device or activity, refused because the same look is a keyed case in another compile, or
  // absent from one. Per compile: [setup glyphs only setup screens draw, the other setup glyphs, case
  // programs keyed by a device's delay or the running activity, the other case programs], as counts.
  const four = population(H650);
  const expected = [[487, 7, 4284, 468], [491, 7, 5232, 470], [560, 9, 7120, 474], [576, 9, 7120, 474]];
  four.forEach((one, k) => {
    const setup = attributeScreens(one.units, four).filter((a) => a.category === 'setup');
    const glyphs = setup.filter((a) => a.unit.kind === 'glyph');
    const cases = setup.filter((a) => a.unit.kind === 'case-program');
    const bySetupScreens = glyphs.filter((a) => a.reason === 'a glyph only setup screens draw').length;
    const keyed = cases.filter((a) => a.unit.setupBy !== undefined).length;
    assert.deepEqual([bySetupScreens, glyphs.length - bySetupScreens, keyed, cases.length - keyed], expected[k], one.name);
  });
});

test('the dynamic screen bytes of a Harmony 650 are five switching programs and four pictures, 13391 bytes',
     skipUnless(...H650, ...H700_CURRENT), () => {
  const four = population(H650);
  const current700 = population(H700_CURRENT);
  for (const one of four) {
    const dynamic = attributeScreens(one.units, four).filter((a) => a.category === 'dynamic');
    assert.deepEqual(dynamic.map((a) => a.unit.kind).sort(),
                     ['dynamic-program', 'dynamic-program', 'dynamic-program', 'dynamic-program', 'dynamic-program',
                      'picture', 'picture', 'picture', 'picture'], one.name);
    assert.equal(dynamic.reduce((n, a) => n + a.unit.bytes, 0), 13391, one.name);
    // Each one occurs, in look, on every Harmony 650 and every 2026 Harmony 700 compile.
    for (const a of dynamic) {
      for (const other of [...four, ...current700]) {
        assert.ok(other.units.some((unit) => unit.look === a.unit.look), `${a.unit.label} in ${other.name}`);
      }
    }
  }
});

test("53 of the Harmony 650's 55 fixed screens occur on every 2026 Harmony 700 compile and none on a Harmony 600",
     skipUnless(...H650, ...H600, ...H700_CURRENT, ...H700_OLDER), () => {
  // Scope. "The same on every 650" was measured on 650s; this is how far the same set reaches. Against
  // the five Harmony 700 compiles of the same service generation, 53 of the 55 fixed screens occur in
  // every one. The two that do not are the tour's welcome, which names the model, and mode 4, one of the
  // seven screens binding a whole keypad, which draws no text; why that one differs is not read. Against
  // the two Harmony 600 compiles none does, and of the 19 pictures two do. The two older 700 compiles,
  // built in 2021 and 2023, carry 3 of the 19, so fixed is a statement about one service generation.
  const four = population(H650);
  const first = four[0] as Loaded;
  const looks = (names: readonly string[]): Set<string>[] =>
    population(names).map((one) => new Set(one.units.map((unit) => unit.look)));
  const in700 = looks(H700_CURRENT);
  const in700older = looks(H700_OLDER);
  const in600 = looks(H600);
  const answers = attributeScreens(first.units, four);
  const fixedModes = answers.filter((a) => a.unit.kind === 'mode' && a.category === 'fixed');
  const missing700 = fixedModes.filter((a) => !in700.every((set) => set.has(a.unit.look))).map((a) => a.unit.label);
  assert.deepEqual(missing700, ['mode 4', 'mode 216']);
  assert.equal(fixedModes.filter((a) => in600.some((set) => set.has(a.unit.look))).length, 0);
  const pictures = first.units.filter((unit) => unit.kind === 'picture');
  assert.equal(pictures.length, 19);
  assert.equal(pictures.filter((unit) => in700.every((set) => set.has(unit.look))).length, 19);
  assert.equal(pictures.filter((unit) => in700older.every((set) => set.has(unit.look))).length, 3);
  assert.equal(pictures.filter((unit) => in600.every((set) => set.has(unit.look))).length, 2);
});

test('the mode roles hold on all thirteen arch 14 compiles: one Off, a start up screen per activity, a mode per device',
     skipUnless(...ARCH14), () => {
  // The structural half of fixed rests on these readers, so they are checked on every Harmony 600, 650
  // and 700 compile here and not only on the 650s: exactly one Off screen, a start up screen for every
  // activity, a device mode for every device, ten tour screens, no program bytes two units share, and
  // a head of the mode table that is 44 modes on the 600 and 650 and 49 on the 700.
  for (const name of ARCH14) {
    const { c, units } = loaded(name);
    const roles = modeRoles(c);
    const count = (role: string): number => roles.filter((one) => one === role).length;
    assert.equal(count('off'), 1, name);
    assert.equal(count('start-up'), activityNames(c).length, name);
    assert.equal(count('device'), devices(c).length, name);
    assert.equal(count('tour'), 10, name);
    assert.equal(count('system') + count('status'), name.startsWith('h700') ? 49 : 44, name);
    assert.equal(units.filter((unit) => unit.kind === 'shared-program').length, 0, name);
  }
});

test('screen categories answer only on arch 14', skipUnless('one_config', 'h525_config'), () => {
  for (const name of ['one_config', 'h525_config']) {
    assert.equal(screenUnits(parse(require_(name))), undefined, name);
  }
});

test('an empty population makes nothing fixed', skipUnless('h650_config_region'), () => {
  const one = loaded('h650_config_region');
  const totals = screenCategoryTotals(attributeScreens(one.units, []));
  assert.equal(totals.fixed, 0);
  assert.equal(totals.dynamic, 13391);
});
