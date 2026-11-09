/**
 * One build from a recipe, `buildFromRecipe` on the main entry, plan 014 and `todo.md` 7.3.11.3.
 *
 * **What is held here, with no lab and no archive**: a recipe with no device and no activity gives, for every model a
 * compiled family builds, exactly the empty configuration that family's own builder gives, so the function adds a
 * choice of route and no byte of its own; and the refusals an application meets, each naming what is wrong. The
 * setups themselves are held by the references of 7.3.11.6, one test per recipe.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// Our letters and pictures are drawn from the font and icon files the Node resources supply.
import '../src/support/resources.node.ts';
import { buildFromRecipe } from '../src/index.ts';
import { buildEmptyFourSlotConfiguration, buildEmptyNoScreenConfiguration, buildEmptyOneConfiguration, fourSlotChoices } from '../src/build.ts';
import { OUR_FOUR_SLOT_CHOICES } from '../src/families/harmony-600-650-700/choices.ts';

const BUILT_AT = '2026-11-09T12:00:00';

const empty = (name: string, skin: number): unknown => ({ model: { name, skin }, devices: [], activities: [] });

function bytesOf(json: unknown): Uint8Array {
  const built = buildFromRecipe(json, { builtAt: BUILT_AT });
  assert.equal(built.kind, 'configuration');
  return (built as { bytes: Uint8Array }).bytes;
}

test('an empty recipe gives each compiled family\'s own empty configuration, byte for byte', () => {
  assert.deepEqual(bytesOf(empty('Harmony One', 54)), buildEmptyOneConfiguration({ skin: 54, builtAt: BUILT_AT }).bytes, 'Harmony One');
  // A build from nothing takes our look, `OUR_FOUR_SLOT_CHOICES`, on the three models of the family.
  for (const [name, skin] of [['Harmony 650', 72], ['Harmony 600', 71], ['Harmony 700', 66]] as const) {
    const own = buildEmptyFourSlotConfiguration({ skin, builtAt: BUILT_AT, choices: OUR_FOUR_SLOT_CHOICES }).bytes;
    assert.deepEqual(bytesOf(empty(name, skin)), own, name);
  }
  for (const [name, skin] of [['Harmony 350', 104], ['Harmony 300', 79]] as const) {
    assert.deepEqual(bytesOf(empty(name, skin)), buildEmptyNoScreenConfiguration({ skin, builtAt: BUILT_AT }).bytes, name);
  }
});

test('the control: the stamp and a choice in the recipe reach the bytes', () => {
  const plain = bytesOf(empty('Harmony 650', 72));
  assert.notDeepEqual(buildFromRecipe(empty('Harmony 650', 72), { builtAt: '2026-11-10T12:00:00' }), plain);
  const unblended = bytesOf({ ...(empty('Harmony 650', 72) as object), choices: { blendLetters: false } });
  assert.notDeepEqual(unblended, plain);
  const own = buildEmptyFourSlotConfiguration({ skin: 72, builtAt: BUILT_AT, choices: fourSlotChoices({ blendLetters: false }, OUR_FOUR_SLOT_CHOICES) }).bytes;
  assert.deepEqual(unblended, own);
});

test('what an application is refused, each naming what is wrong', () => {
  const refused = (json: unknown, sources: Parameters<typeof buildFromRecipe>[1], message: RegExp): void => {
    assert.throws(() => buildFromRecipe(json, sources), (error: unknown) => error instanceof Error && message.test(error.message));
  };
  const at = { builtAt: BUILT_AT };
  refused({ devices: [], activities: [] }, at, /names no model/);
  refused(empty('Harmony 9000', 1), at, /no model has skin 1/);
  // The Harmony 885 is served by a family that builds nothing from a recipe yet.
  refused(empty('Harmony 885', 17), at, /nothing here builds .* from a recipe yet/);
  // The Touch's documents carry the account's identifiers, and its devices come from the catalogue.
  refused(empty('Harmony Touch', 99), at, /no archive was given/);
  // A Touch's part in a recipe for another model.
  refused({ ...(empty('Harmony One', 54) as object), touch: {} }, at, /Harmony Touch's part/);
  // A device on a Harmony 300 or 350 needs its device key, and a key is checked as the recipe is read.
  refused({ ...(empty('Harmony 350', 104) as object), devices: [{ name: 'TV', device: 'LG/OLED65G26LA', key: { place: -1 } }] }, at, /no place/);
});
