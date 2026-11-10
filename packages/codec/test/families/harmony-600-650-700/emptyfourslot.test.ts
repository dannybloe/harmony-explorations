/**
 * The empty Harmony 600, 650 and 700 configuration as an application builds it, `buildEmptyFourSlotConfiguration` on
 * `@harmony/codec/build`.
 *
 * **Why it exists.** `buildEmptyConfiguration` takes the family's look piece by piece, and only `empty.test.ts`
 * assembled those pieces from `FOUR_SLOT_CHOICES`, so nothing outside the tests could build the configuration a
 * setup is composed onto. The check of what no entry reaches missed it, since that check is per
 * module and `empty.ts` is reached through `assemble.ts`; it surfaced when the person asked whether the 600 can be
 * built from nothing at all. The wrapper reads every piece out of one set of choices, and this holds it byte for
 * byte to the assembly `empty.test.ts` has always built with, on the three models the family builds for.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// Our letters and pictures are drawn from the font and icon files the Node resources supply.
import '../../../src/support/resources.node.ts';
import {
  buildEmptyFourSlotConfiguration, FOUR_SLOT_CHOICES, fourSlotChoices,
} from '../../../src/build.ts';
import { buildEmptyConfiguration } from '../../../src/families/harmony-600-650-700/empty.ts';
import { ONE_LOOK_SKINS } from '../../../src/families/harmony-600-650-700/backgrounds.ts';

const BUILT_AT = '2026-10-23T12:00:00';

/** The assembly `empty.test.ts` builds with, from the choices piece by piece. */
function assembled(skin: number, blendLetters: boolean): Uint8Array {
  return buildEmptyConfiguration({
    skin,
    builtAt: BUILT_AT,
    inks: FOUR_SLOT_CHOICES.letterInks,
    settings: FOUR_SLOT_CHOICES.settings,
    look: {
      // The Harmony 600 is drawn in one look, so its idle state is the one grey; the others draw the idle colour.
      idleColour: ONE_LOOK_SKINS.has(skin) ? FOUR_SLOT_CHOICES.oneLookColour : FOUR_SLOT_CHOICES.stateColours.idle,
      barColour: FOUR_SLOT_CHOICES.barColour,
      pictures: {
        icons: FOUR_SLOT_CHOICES.icons, colour: FOUR_SLOT_CHOICES.iconColour, background: FOUR_SLOT_CHOICES.iconBackground,
      },
    },
    blendLetters,
  }).bytes;
}

test('the empty configuration from the family\'s choices is the one the tests assemble, on the 650, 600 and 700', () => {
  // Skin 72 the Harmony 650, 71 a Harmony 600, 66 the Harmony 700.
  for (const skin of [72, 71, 66]) {
    const built = buildEmptyFourSlotConfiguration({ skin, builtAt: BUILT_AT }).bytes;
    assert.deepEqual(built, assembled(skin, FOUR_SLOT_CHOICES.blendLetters), `skin ${skin}`);
  }
});

test('the Harmony 600 is drawn in its one grey and the 650 and 700 in the idle colour, which differ', () => {
  assert.ok(ONE_LOOK_SKINS.has(71) && !ONE_LOOK_SKINS.has(72) && !ONE_LOOK_SKINS.has(66));
  assert.notEqual(FOUR_SLOT_CHOICES.oneLookColour, FOUR_SLOT_CHOICES.stateColours.idle);
});

test('the control: a changed choice reaches the bytes, so the comparison above can fail', () => {
  // Blending the letters is a choice the wrapper passes on; turned the other way, the bytes differ.
  const plain = buildEmptyFourSlotConfiguration({ skin: 72, builtAt: BUILT_AT }).bytes;
  const blended = buildEmptyFourSlotConfiguration({
    skin: 72, builtAt: BUILT_AT, choices: fourSlotChoices({ blendLetters: !FOUR_SLOT_CHOICES.blendLetters }),
  }).bytes;
  assert.notDeepEqual(blended, plain);
  assert.deepEqual(blended, assembled(72, !FOUR_SLOT_CHOICES.blendLetters));
});
