/**
 * What a connected Harmony One holds in RAM, against the config it is holding in flash.
 *
 * This lives here rather than in `packages/usb` because it needs the codec as well as the remote,
 * and `packages/usb` deliberately does not depend on the codec. It is the only test in the workspace
 * that reads live RAM and a container in the same breath, which is exactly the claim it is for:
 * **section 111**, that an arch 12 remote on USB has read its own base slot 15.
 *
 * Three bytes carry it. `0x110` is the display light band, `0x112` the saved state and `0x113` the
 * cached level, and section 103 read the state machine that ties them together: state 6 maps band 0
 * to 3 onto states 2 to 5, and each band's level is one of the four base slot 15 group 1 states. So
 * the test is that the three agree with each other **through the attached unit's own config**, which
 * three plausible numbers would not.
 *
 * Gated three times: on the hardware flag, on exactly one Harmony One being attached, and on the
 * unit being identifiable from a stored dump. Read only, and it opens the device.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parse, parameterGroups } from '@harmony/codec';
import { load, skipUnless } from '@harmony/lab';
import { HarmonyRemote, listHarmony, openHarmony } from '@harmony/usb';

const ONE = 0xc121;
const HARDWARE = process.env['HARMONY_HARDWARE_TESTS'] === '1';

/** The display light state, in the One's data memory. `docs/findings.md` section 103. */
const BAND = 0x110;
const SAVED_STATE = 0x112;
const CACHED_LEVEL = 0x113;
/** Band 0 to 3 becomes state 2 to 5, which is the relation the three bytes have to satisfy. */
const STATE_FOR_BAND_ZERO = 2;
/** Group 1 holds six entries and the firmware reads and discards the first two. */
const LEVEL_GROUP = 1;
const DISCARDED_ENTRIES = 2;
/** What the firmware substitutes when a group's length is wrong, so the negative can be checked. */
const DEFAULT_LEVELS = [9, 16, 24, 27];

/** Every arch 12 dump, because two Harmony Ones exist and one of them has two configs on record. */
const ARCH12_DUMPS = [
  'one_config',
  'one_config_unprogrammed',
  'one_spare_before_sync',
  'one_spare_after_sync',
];

/** Exactly one, because `openHarmony({ productId })` refuses an ambiguous selector. */
async function oneAttached(): Promise<boolean> {
  const all = await listHarmony();
  return all.filter((d) => d.productId === ONE).length === 1;
}

/** Which unit it is, from what it holds rather than from its path or its label. */
function identify(read: Uint8Array): string | undefined {
  for (const name of ARCH12_DUMPS) {
    const dump = load(name);
    if (dump === undefined) continue;
    const at = dump.findIndex(
      (_b, i) =>
        dump[i] === 0x47 && dump[i + 1] === 0x53 && dump[i + 2] === 0x50 && dump[i + 3] === 0x4d,
    );
    if (at >= 0 && read.every((b, i) => b === dump[at + i])) return name;
  }
  return undefined;
}

test("the display light state agrees with the attached One's own base slot 15", async (t) => {
  if (!HARDWARE || !(await oneAttached())) {
    t.skip('needs HARMONY_HARDWARE_TESTS=1 and exactly one Harmony One attached');
    return;
  }
  const remote = new HarmonyRemote(await openHarmony({ productId: ONE }), { timeoutMs: 500 });
  try {
    const unit = identify(await remote.readFlash(0x040000, 64));
    if (unit === undefined) {
      t.skip('the attached One matches no stored dump, so nothing per unit can be asserted');
      return;
    }
    const blob = load(unit);
    assert.ok(blob !== undefined);
    const groups = parameterGroups(parse(blob));
    assert.ok(groups !== undefined, 'base slot 15 parses');
    const levels = groups[LEVEL_GROUP]?.values.slice(DISCARDED_ENTRIES);
    assert.ok(levels !== undefined && levels.length === 4, 'group 1 states four levels');

    const band = await remote.readRam(BAND);
    const state = await remote.readRam(SAVED_STATE);
    const level = await remote.readRam(CACHED_LEVEL);
    assert.ok(band <= 3, `the band is 0 to 3, got ${band}`);
    assert.equal(state, band + STATE_FOR_BAND_ZERO, 'the saved state is the band plus two');
    assert.equal(level, levels[band], "the cached level is this config's level for that band");

    // The negative, and without it the test proves much less: a level that also appears among the
    // compiled in defaults would be there whether or not a config had been read. Both Harmony One
    // configs state levels the firmware's defaults do not contain, so this holds on the bench and
    // would skip loudly rather than pass quietly on a config where it does not.
    assert.ok(
      !DEFAULT_LEVELS.includes(level),
      `level ${level} is also a firmware default, so it does not show the config was read`,
    );
  } finally {
    await remote.close();
  }
});

test(
  'every arch 12 config states light levels the firmware defaults do not',
  skipUnless(...ARCH12_DUMPS),
  () => {
    // The half of the test above that runs without a remote, and the reason its negative is sound.
    // Declared up front with `skipUnless` rather than skipped per sample inside the loop, so a lab
    // that is present and missing a dump fails loudly instead of counting zero.
    for (const name of ARCH12_DUMPS) {
      const blob = load(name);
      assert.ok(blob !== undefined);
      const groups = parameterGroups(parse(blob));
      assert.ok(groups !== undefined, `${name} has a base slot 15`);
      const levels = groups[LEVEL_GROUP]?.values.slice(DISCARDED_ENTRIES) ?? [];
      assert.equal(levels.length, 4, `${name} states four levels`);
      for (const level of levels) {
        assert.ok(!DEFAULT_LEVELS.includes(level), `${name} level ${level} is a firmware default`);
      }
    }
  },
);
