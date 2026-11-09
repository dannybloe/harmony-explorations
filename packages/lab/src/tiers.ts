/**
 * The two tiers of the TypeScript suite, and the families of compiles a test walks on each.
 *
 * **The slow tier** is `slow()`: a test that runs only when `HARMONY_SLOW_TESTS=1`, which `make ts-test-all`
 * and so `make all` set before a push. A step runs `make ts-test` and the files it touches.
 *
 * **The families** are the lists of compiles the tests of one family of remotes walk: the nineteen Harmony
 * One compiles, the sixteen of them in skin 54, the thirteen or twenty two Harmony 600, 650 and 700 compiles,
 * and so on. Each was written out again in every file that walked it, 127 lists of five or more names in 86
 * files when the test review counted them, one of them commented "as `fonttable.test.ts`'s", and two lists
 * nobody compares drift apart (the `finding` skill). So each lives here once, whole, with a pair chosen from
 * it, and `TheCorpusWidePopulationsAgree` in `tests/project/test_toolchain.py` reads them statically: each held to
 * its count, the pair inside its list, the lists nesting as they should, and no test file writing one out
 * again.
 *
 * **Why a pair on a step.** The same review measured that about 199 tests and 1581 of the 4849 seconds the
 * tests ran in total composed, rebuilt or read something over every compile of one family, where most of
 * those claims are about a builder: two compiles that differ already show what the builder does. The whole
 * list shows that no compile the lab holds is a counterexample, which is a census, and the slow tier keeps
 * it: `sampled` hands back the whole list whenever `HARMONY_SLOW_TESTS=1`, so `make ts-test-all` walks
 * exactly what every test walked before.
 *
 * **Which tests walk which.** A test whose claim is per compile (each compile parses, round trips, rebuilds
 * byte for byte) walks `sampled(family)`, and its title says so, since "all thirteen" over two of them would
 * overclaim. A test whose claim is about the whole list (a total, a count over the population, "13 of 13",
 * a span) walks `family.full` under `slow()`, because its exact count is the point.
 */

/** The variable that runs the slow tier, set by `make ts-test-all` and so by `make all`. */
export const SLOW_TESTS = 'HARMONY_SLOW_TESTS';

/** Whether this run is the slow tier, the one switch both `slow` and `sampled` read. */
function slowTier(): boolean {
  return process.env[SLOW_TESTS] === '1';
}

/**
 * A test of the slow tier: it runs only when `HARMONY_SLOW_TESTS=1`, and otherwise skips naming how to run it.
 * Wraps the test's own skip options, whose reason wins when they skip anyway.
 *
 * **Why a tier.** Measured on 8 November 2026 over a full run on a quiet machine: 30 of 3633 tests did 2304 of
 * the 4849 seconds the tests ran in total, each composing every device or activity of the corpus again and
 * comparing the result with Logitech's byte for byte. They ran on every step however small the change, so
 * waiting for them was most of the work. They still run, in `make ts-test-all` and in `make all` before a push;
 * a step checks the fast tier, `make ts-test`, and the tests it touches. A test joins the tier only by a
 * measurement of its time, never to make a run pass.
 */
export function slow(options: { skip: string | false } = { skip: false }): { skip: string | false } {
  if (options.skip !== false) return options;
  return slowTier()
    ? options
    : { skip: `slow tier, run by make ts-test-all (${SLOW_TESTS}=1)` };
}

/** One family's compiles: every one its tests walk in the slow tier, and the two a step walks. */
export interface Family {
  /** Every compile of the family the lab holds that its tests walked, in the order most of them walked it. */
  readonly full: readonly string[];
  /** The two a step walks, both in `full`, chosen to differ the way the family's lists already tell apart. */
  readonly pair: readonly [string, string];
}

/**
 * The nineteen Harmony One compiles: Logitech's, in every skin the lab holds.
 *
 * The pair is two skins and two owners: `one_config`, a contributor's programmed One in the European skin,
 * one of the three outside skin 54; and `one_spare_myharmony`, the test account's setup compiled by
 * MyHarmony in skin 54, five devices and seven activities, the richest of the sixteen.
 */
export const ONE_FAMILY: Family = {
  full: ['one_config', 'one_config_unprogrammed', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
    'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
    'compiled_protocols_3', 'harvest_one_two_devices', 'harvest_one_families_1', 'harvest_one_families_2',
    'harvest_one_families_3', 'one_friend_asfound_config', 'one_friend_legacy_sync_config', 'phase7_before',
    'phase7_after'],
  pair: ['one_config', 'one_spare_myharmony'],
};

/**
 * The sixteen of them in the English skin 54, the population every builder of the Harmony One family rebuilds.
 *
 * The pair is two owners and two of Logitech's clients: `one_spare_myharmony`, the test account's setup
 * compiled by MyHarmony, and `one_friend_legacy_sync_config`, somebody else's setup synced onto the friend's
 * One by Harmony Desktop.
 */
export const ONE_SKIN_54_FAMILY: Family = {
  full: ['harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
    'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
    'compiled_protocols_3', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
    'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'],
  pair: ['one_spare_myharmony', 'one_friend_legacy_sync_config'],
};

/**
 * The thirteen Harmony 600, 650 and 700 compiles of section 312.
 *
 * The pair is two models, two skins and the two shapes of the activity keys: `h650_panasonic_config`, the
 * bench Harmony 650 programmed through MyHarmony, skin 72, an activity on each of the three keys; and
 * `h700_power_hold_compile`, Logitech's compile of a test account's Harmony 700 record, skin 66, two
 * activities and Listen to Music empty, which is the case the activity key tests branch on (seven of the
 * thirteen hold three activities, six hold two). Neither is one of the two the activity tests set apart as
 * not Logitech's choices, the person's own Harmony 600 and the calibration compile.
 */
export const ARCH14_FAMILY: Family = {
  full: ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
    'h700_config', 'h700_config_2', 'h700_28_config_region',
    'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
    'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4'],
  pair: ['h650_panasonic_config', 'h700_power_hold_compile'],
};

/**
 * Logitech's eight later compiles of the test record's Harmony 650, sections 337 to 351.
 *
 * One record, so the pair differs in what was set on it: `h650_start_config`, the starting setup of seven
 * devices and four activities, and `h650_favourites_config`, a later setup with four favourite channels on
 * each of two devices, which changes the screens most of these tests read.
 */
export const LATER_650_FAMILY: Family = {
  full: ['h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
    'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean'],
  pair: ['h650_start_config', 'h650_favourites_config'],
};

/**
 * The 22 Harmony 600, 650 and 700 compiles sections 356 to 360 measure: the thirteen, the eight later
 * compiles of the test record's Harmony 650, and the Harmony 650 another owner posted as harmony-decompiler
 * issue 36.
 *
 * The pair is one of the thirteen and one of the nine added, two models and two owners outside this project:
 * `h700_config`, a contributor's Harmony 700, and `h650_issue36_config`, another owner's Harmony 650.
 */
export const ARCH14_22_FAMILY: Family = {
  full: ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
    'h700_config', 'h700_config_2', 'h700_28_config_region',
    'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
    'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4',
    'h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
    'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean',
    'h650_issue36_config'],
  pair: ['h700_config', 'h650_issue36_config'],
};

/**
 * The thirteen Harmony 650 compiles: the bench unit's, its test record's, and issue 36's.
 *
 * The pair is two owners of the one model: `h650_panasonic_config`, the bench Harmony 650 programmed through
 * MyHarmony, and `h650_issue36_config`, another owner's.
 */
export const H650_FAMILY: Family = {
  full: ['h650_config_region', 'h650_panasonic_config', 'h650_power_hold_compile', 'h650_power_hold_compile_2',
    'h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
    'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean',
    'h650_issue36_config'],
  pair: ['h650_panasonic_config', 'h650_issue36_config'],
};

/**
 * The five Harmony 300 and 350 configurations, the file based family, outside every corpus wide total.
 *
 * The pair is two models and two owners: `h350_programmed_config`, the bench Harmony 350 as programmed here,
 * and `h300_config`, the bench Harmony 300 as a previous owner left it.
 */
export const FILE_BASED_FAMILY: Family = {
  full: ['h350_config', 'h350_three_devices_config', 'h350_programmed_config', 'h300_config',
    'h300_programmed_config'],
  pair: ['h350_programmed_config', 'h300_config'],
};

/**
 * Every Harmony 880 and 885 configuration the lab holds: six contributed, and the two bench 885s'.
 *
 * The pair is two models and two owners: `arch8_config_880`, a contributor's Harmony 880 with the description
 * he sent, and `h885_b_config`, the bench Harmony 885 B.
 */
export const ARCH8_FAMILY: Family = {
  full: ['arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d', 'arch8_config_880',
    'arch8_config_885', 'h885_a_config', 'h885_b_config'],
  pair: ['arch8_config_880', 'h885_b_config'],
};

/**
 * The compiles a test walks: in the slow tier every one of `within`, on a step those of the family's pair.
 *
 * `within` is the family's whole list unless a test walks a narrower one, a family less the compiles one claim
 * excludes, with the reason beside it. A pair member the narrower list leaves out is made up from its first
 * names, so a step still walks two compiles. The order is `within`'s, so both tiers meet a compile in the same
 * place.
 */
export function sampled(family: Family, within: readonly string[] = family.full): readonly string[] {
  if (slowTier()) return within;
  const walked = within.filter((name) => family.pair.includes(name));
  for (const name of within) {
    if (walked.length >= 2) break;
    if (!walked.includes(name)) walked.push(name);
  }
  return within.filter((name) => walked.includes(name));
}
