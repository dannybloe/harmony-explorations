/**
 * The population the byte accounting reports run over, defined once.
 *
 * `coverage.ts` and `emit.ts` used to walk every entry in the lab's `IMAGES` table and keep whatever
 * parsed as a container, on the reasoning that a firmware image never does. **An arch 8 firmware
 * image does**, section 114: it carries a complete safe mode container at flash `0x01E000`, so
 * registering one silently added a twentieth and twenty first "container" to a corpus wide figure and
 * printed a coverage percentage for a 64 KiB program image, which is a category error rather than a
 * low number. The lesson is the one `reading.ts` already learned when no sample list reproduced its
 * quoted instruction count: a population that is discovered rather than stated cannot be checked.
 *
 * So it is stated. Nineteen containers, and the additions of 10 August 2026 are deliberately **not**
 * among them:
 *
 * * the two arch 8 firmware images, because a share of a program image means nothing;
 * * `arch8_config_885` and `h890_config`, because admitting them would move every corpus wide number
 *   in a commit whose subject is a descriptor field. They are in the lab table and in the golden
 *   vectors, which is what sections 113 and 115 need of them, and adding them to the accounting is
 *   its own piece of work with its own document sweep.
 */

/** The nineteen containers, in the order the reports print them. */
export const CONTAINERS = [
  'one_safemode',
  'one34_region2',
  'h700_gspm',
  'h600_safemode_gspm',
  'h650_safemode_gspm',
  'one_config',
  'one_config_unprogrammed',
  'h600_config',
  'h700_config',
  'h700_config_2',
  'h525_config',
  'h525_config_2',
  'arch8_config_a',
  'arch8_config_b',
  'arch8_config_c',
  'arch8_config_d',
  'h525_safemode_ahcm',
  'one_spare_before_sync',
  'one_spare_after_sync',
];

/**
 * Every container that inlines a power on delay, section 236. Arch 14 (Harmony 600 and 700) keeps
 * the delay in a state variable and so has no member here by construction. The test table in
 * `test/inventory.test.ts` pairs each name with its counts and asserts that its names are exactly
 * these, so the two lists cannot drift apart; `bin/devices.ts` computes the corpus wide totals the
 * documents quote over this list, which is what makes those numbers facts rather than sentences.
 */
export const INLINE_DELAY_CONTAINERS = [
  'one_spare_before_sync',
  'one_spare_after_sync',
  'one_config',
  'one_config_unprogrammed',
  'arch8_config_a',
  'arch8_config_b',
  'arch8_config_c',
  'arch8_config_d',
  'h525_config',
  'h525_config_2',
  'arch8_config_880',
  'arch8_config_885',
  'calibration_one',
  'calibration_favchannels',
  'one_spare_myharmony',
  'calibration_favzero',
  'one_spare_20260830',
];
