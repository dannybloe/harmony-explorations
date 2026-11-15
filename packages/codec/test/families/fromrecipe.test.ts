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

import { buildFromRecipe, ComposeError, NotBuiltError, RecipeError, unstatedChoices } from '../../src/node.ts';
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

test('a build that says no throws ComposeError, the main entry\'s one refusal class, from a Harmony Touch\'s build and from every compiled family\'s', () => {
  // Each refusal below is thrown by a class of its family's own, which is why the test catches it by the one class an
  // application has, the main entry's `ComposeError`, and names the class it came as, so a family that went back to a
  // class of its own outside it fails here by name.
  const caught = (build: () => unknown): string => {
    try {
      build();
    } catch (error) {
      assert.ok(error instanceof ComposeError, `${String(error)} is no ComposeError`);
      assert.ok(!(error instanceof RecipeError) && !(error instanceof NotBuiltError), String(error));
      return `${error.constructor.name}: ${error.message}`;
    }
    return assert.fail('the build did not refuse');
  };
  const reference = (name: string): Record<string, unknown> =>
    JSON.parse(readFileSync(new URL(`../references/${name}.json`, import.meta.url), 'utf8')) as Record<string, unknown>;
  // The Harmony Touch's composer: a timeout of no seconds, which the remote's sleep timer does not hold.
  const touch = reference('touch-test');
  touch.settings = { ...(touch.settings as object), ScreenTimeout: 0 };
  assert.match(caught(() => buildFromRecipe(touch, { builtAt: BUILT_AT, account: JOHN_DOE as never })), /^ComposeRefusal: ScreenTimeout: 0 is outside 1 to 30/);
  // The Harmony One's shared assembly: a key no map of the One binds.
  const one = reference('one-test');
  (one.activities as { name: string; keys?: unknown }[]).find((activity) => activity.name === 'Muziek')!.keys = [{ key: 'Activities', action: { nothing: true } }];
  assert.match(caught(() => buildFromRecipe(one, { builtAt: BUILT_AT })), /^AssemblyError: .*Activities is no key the Harmony One's maps bind/);
  // A name the build cannot draw: a device's wider than the Harmony One's device list row, which its screen records
  // refuse and its assembly passes on naming the devices it was composing, and wider than a corner of a device page,
  // on the Harmony 650.
  const longOne = reference('one-test');
  (longOne.devices as { name: string }[])[0]!.name = 'A'.repeat(20);
  assert.match(caught(() => buildFromRecipe(longOne, { builtAt: BUILT_AT })), /^AssemblyError: composing A{20}, .*: 'A{20}' is wider than 101 pixels on its own$/);
  const longFour = reference('h650-test');
  (longFour.devices as { name: string }[])[0]!.name = 'Living Room TV';
  assert.match(caught(() => buildFromRecipe(longFour, { builtAt: BUILT_AT })), /'Living Room TV' is \d+ pixels wide and a corner holds 59/);
  // The Harmony One's own choices, and the Harmony 600, 650 and 700's, each a choice the family does not make.
  assert.match(caught(() => buildFromRecipe({ ...(empty('Harmony One', 54) as object), choices: { screenLight: 30 } }, { builtAt: BUILT_AT })), /^ComposeError: .*no choice called screenLight/);
  assert.match(caught(() => buildFromRecipe({ ...(empty('Harmony 650', 72) as object), choices: { screenLight: 30 } }, { builtAt: BUILT_AT })), /^ChoiceError: .*no choice called screenLight/);
  // The Harmony 300 and 350's: a device given no device key, which these remotes need for every device.
  const noScreen = reference('h350-test');
  const [first, ...rest] = noScreen.devices as { name: string; key?: unknown }[];
  const { key: _key, ...keyless } = first!;
  assert.match(caught(() => buildFromRecipe({ ...noScreen, devices: [keyless, ...rest] }, { builtAt: BUILT_AT })),
    new RegExp(`^ComposeError: device ${first!.name} states no device key`));
  // The control: a document that is not one, and a function not built, are the two other answers and no refusal of a
  // build, so an application tells the three apart by class.
  assert.throws(() => buildFromRecipe({ devices: [], activities: [] }, { builtAt: BUILT_AT }), (error: unknown) => error instanceof RecipeError && !(error instanceof ComposeError));
  assert.ok(!(new NotBuiltError('recipe.setLook', 42) instanceof ComposeError));
});

test('what is missing answers in one of two classes on every model: a build not built yet, or a source the caller did not give', () => {
  // Not built: the Harmony 885's family builds nothing from a recipe yet, R4, and a key a recipe chooses is built on the
  // Harmony One and the Harmony Touch alone, R32 for a device's key.
  assert.throws(() => buildFromRecipe(empty('Harmony 885', 17), { builtAt: BUILT_AT }),
    (error: unknown) => error instanceof NotBuiltError && error.requirement === 4 && error.contract === 'buildFromRecipe for the Harmony 880 and 885');
  for (const name of ['h650-test', 'h350-test']) {
    const keyed = JSON.parse(readFileSync(new URL(`../references/${name}.json`, import.meta.url), 'utf8')) as { devices: { keys?: unknown }[] };
    keyed.devices[0]!.keys = [{ key: 'VolumeUp', action: { nothing: true } }];
    assert.throws(() => buildFromRecipe(keyed, { builtAt: BUILT_AT }), (error: unknown) => error instanceof NotBuiltError && error.requirement === 32, name);
  }
  // A missing source: a device that carries no definition, built with no archive, on a model of every kind. The class
  // is the one "no account was given" answers with, and the message names the device and what to give.
  for (const name of ['one-test', 'h650-test', 'h350-test', 'touch-test']) {
    const bare = JSON.parse(readFileSync(new URL(`../references/${name}.json`, import.meta.url), 'utf8')) as { devices: { name: string; device: string; definition?: unknown }[] };
    const first = bare.devices[0]!;
    delete first.definition;
    assert.throws(() => buildFromRecipe(bare, { builtAt: BUILT_AT, account: JOHN_DOE as never }),
      (error: unknown) => error instanceof RecipeError && !(error instanceof ComposeError)
        && error.message === `${first.name} carries no definition of ${first.device}, and no archive was given to build it from`, name);
  }
  // The Touch's account is the other source, and it answers in the same class.
  const touch = JSON.parse(readFileSync(new URL('../references/touch-test.json', import.meta.url), 'utf8')) as unknown;
  assert.throws(() => buildFromRecipe(touch, { builtAt: BUILT_AT }), (error: unknown) => error instanceof RecipeError && /no account was given/.test(error.message));
});
