/**
 * One build from a recipe, `buildFromRecipe` on the main entry, plan 014.
 *
 * **What is held here, with no lab and no archive**: a recipe with no device and no activity gives, for every model a
 * compiled family builds, exactly the empty configuration that family's own builder gives, so the function adds a
 * choice of route and no byte of its own; and the refusals an application meets, each naming what is wrong. The
 * setups themselves are held by the references of 7.3.11.6, one test per recipe.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// Our letters and pictures are drawn from the font and icon files the Node resources supply.
import '../../src/support/resources.node.ts';
import { readFileSync } from 'node:fs';

import { buildFromRecipe, RecipeError, unstatedChoices } from '../../src/node.ts';
import { carriedCatalogue } from '../../src/catalogue/carried.ts';
import { buildTouchDocuments, ourBackground, readTouchDocument } from '../../src/families/harmony-touch/fromnothing.ts';
import { touchSetupOfDocument } from '../../src/families/harmony-touch/recipemaps.ts';
import { HARMONY_TOUCH_FAMILY } from '../../src/families/harmony-touch/family.ts';
import { buildEmptyFourSlotConfiguration, buildEmptyNoScreenConfiguration, buildEmptyOneConfiguration, fourSlotChoices } from '../../src/build.ts';
import { OUR_FOUR_SLOT_CHOICES } from '../../src/families/harmony-600-650-700/choices.ts';
import { ONE_CHOICES } from '../../src/families/harmony-one/choices.ts';
import { proves } from '@harmony/testkit/proof';

const BUILT_AT = '2026-11-09T12:00:00';

const empty = (name: string, skin: number): unknown => ({ model: { name, skin }, devices: [], activities: [] });

function bytesOf(json: unknown): Uint8Array {
  const built = buildFromRecipe(json, { builtAt: BUILT_AT });
  assert.equal(built.kind, 'configuration');
  return (built as { bytes: Uint8Array }).bytes;
}

test('an empty recipe gives each compiled family\'s own empty configuration, byte for byte', () => {
  proves(61, ['harmony-one'], ['docs/test-notes/harmony-one.md#the-empty-configuration-and-the-setup-on-it']);
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
  proves(7, ['harmony-one', 'harmony-350']);
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
  // A Touch's own block, the earlier form, in a recipe for any model: the reader refuses it, naming the converter.
  refused({ ...(empty('Harmony One', 54) as object), touch: {} }, at, /a Harmony Touch's own block, touch, the earlier form .*describeTouchDocument/);
  // A device on a Harmony 300 or 350 needs its device key, and a key is checked as the recipe is read.
  refused({ ...(empty('Harmony 350', 104) as object), devices: [{ name: 'TV', device: 'LG/OLED65G26LA', key: { place: -1 } }] }, at, /no place/);
});

test('a recipe\'s choices reach the Harmony One, and a reference recipe can say it states them all', () => {
  proves(4, ['harmony-one'], ['docs/test-notes/harmony-one.md#the-empty-configuration-and-the-setup-on-it']);
  // Every choice stated at its default builds as no choice stated; one changed changes the bytes.
  const plain = bytesOf(empty('Harmony One', 54));
  assert.deepEqual(bytesOf({ ...(empty('Harmony One', 54) as object), choices: ONE_CHOICES }), plain);
  assert.notDeepEqual(bytesOf({ ...(empty('Harmony One', 54) as object), choices: { screenLightSeconds: 30 } }), plain);
  assert.throws(() => bytesOf({ ...(empty('Harmony One', 54) as object), choices: { screenLight: 30 } }), /makes no choice called screenLight/);
  assert.throws(() => bytesOf({ ...(empty('Harmony One', 54) as object), choices: { otherDeviceIcon: 'no-such-icon' } }), /has no icon of that name/);
  // What a recipe leaves to the defaults, by name: all of them, then none, and nothing for a family that makes none.
  assert.deepEqual(unstatedChoices(empty('Harmony One', 54)), Object.keys(ONE_CHOICES).sort());
  assert.deepEqual(unstatedChoices({ ...(empty('Harmony One', 54) as object), choices: ONE_CHOICES }), []);
  assert.deepEqual(unstatedChoices({ ...(empty('Harmony 650', 72) as object), choices: OUR_FOUR_SLOT_CHOICES }), []);
  assert.deepEqual(unstatedChoices(empty('Harmony Touch', 99)), []);
});

/**
 * A made up account, John Doe's: the seven fields of Context a Harmony Touch reads, in the forms its checks take, and a
 * favourites address on a domain that resolves nowhere. Never a real account's, which stay in the lab.
 */
const JOHN_DOE = {
  context: {
    'AccountId-': '1000001', CountryCode: 'NL', Email: 'john.doe@example.com', HouseholdUserProfileUri: null,
    InstallerId: null, Language: 'en-GB', SetupSession: { Type: 0, SetupType: null },
  },
  tuning: { DeviceProfileUri: 'https://example.invalid/john-doe/favourites', ContentProfileKey: 1 },
} as const;

test('the Harmony Touch through the one build: its family\'s six documents of a document of version 2 and our background, with a made up account', () => {
  // The reference document, which carries every device's definition, so no archive is read.
  const json = JSON.parse(readFileSync(new URL('../references/touch-test.json', import.meta.url), 'utf8')) as unknown;
  const built = buildFromRecipe(json, { builtAt: BUILT_AT, account: JOHN_DOE as never });
  assert.equal(built.kind, 'documents');
  if (built.kind !== 'documents') return;
  const document = readTouchDocument(json);
  assert.deepEqual(built.documents, buildTouchDocuments(document, { archive: carriedCatalogue(document)!, account: JOHN_DOE as never }));
  const background = ourBackground();
  assert.deepEqual(built.pictures.map((p) => p.uri), [background.addresses.picture, background.addresses.twin]);
  assert.deepEqual(built.pictures[0]!.png, background.picture);
  // The account's own identifiers reach Context, and nothing builds without an account.
  assert.equal((built.documents.Context as unknown as Record<string, unknown>)['Email'], 'john.doe@example.com');
  assert.throws(() => buildFromRecipe(json, { builtAt: BUILT_AT }), /no account was given/);
});

test('a Harmony Touch\'s document of the earlier form, with a block of its own, is refused by the one build, naming the converter', () => {
  const earlier = JSON.parse(readFileSync(new URL('harmony-touch/touch-test-earlier-form.json', import.meta.url), 'utf8')) as unknown;
  assert.throws(() => buildFromRecipe(earlier, { builtAt: BUILT_AT, account: JOHN_DOE as never }),
    (error: unknown) => error instanceof RecipeError && /a Harmony Touch's own block, touch, the earlier form/.test(error.message) && /harmonyTouch\.describeTouchDocument/.test(error.message));
  // The control: the same document without its block reads, and stops only where an account is missing.
  const { touch: _touch, ...plain } = earlier as Record<string, unknown>;
  assert.throws(() => buildFromRecipe(plain, { builtAt: BUILT_AT }), /no account was given/);
});

test('a document that reached a Harmony Touch\'s build without the reader, carrying the earlier form\'s block, is refused by each of the three builds, naming the converter', () => {
  // A document of version 2 read as an application reads one, then given the block in code, as a cast would: the
  // reader never sees it, so the refusal has to sit where every build of a Touch passes, `touchSetupOfDocument`.
  const document = readTouchDocument(JSON.parse(readFileSync(new URL('../references/touch-test.json', import.meta.url), 'utf8')));
  const carried = { ...document, touch: { devices: [], activities: [], settings: {} } } as typeof document;
  const sources = { archive: carriedCatalogue(document)!, account: JOHN_DOE as never };
  const named = (error: unknown): boolean =>
    error instanceof RecipeError && /a Harmony Touch's own block, touch, the earlier form/.test(error.message) && /harmonyTouch\.describeTouchDocument/.test(error.message);
  assert.throws(() => touchSetupOfDocument(carried, sources.archive), named);
  assert.throws(() => buildTouchDocuments(carried, sources), named);
  assert.throws(() => HARMONY_TOUCH_FAMILY.build(carried, sources), named);
  // The control: the same document without the block goes through all three, the two builds to the same six.
  assert.equal(touchSetupOfDocument(document, sources.archive).setup.devices.length, 7);
  assert.deepEqual(HARMONY_TOUCH_FAMILY.build(document, sources), buildTouchDocuments(document, sources));
});
