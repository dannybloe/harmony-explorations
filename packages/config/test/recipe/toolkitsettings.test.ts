/**
 * **The remote's own settings through the toolkit**, R47: the question `settings`, the change `setSetting` and the
 * check, each judged by the model's family, `FamilySettings` in `src/families/settings.ts`, and the build that writes
 * them, `buildFromRecipe`.
 *
 * **What is claimed.**
 *
 * * **A Harmony Touch document builds whatever settings it states**, none, some or all: the family's default stands for
 *   every row not stated and a stated row stands over it, read back off the Settings document the build wrote. The
 *   defaults are the family's table, `TOUCH_SETTING_DEFAULTS`, whose source is held by
 *   `test/families/harmony-touch/touch-setting-defaults.test.ts`.
 * * **`settings` answers every row the build writes**, each with its value, whether that is the default, the default
 *   and the kind of value it takes; a value stated as text is answered as what it means, a value equal to the default
 *   is the person's, and every answer is the caller's own.
 * * **The change, the check and the build agree on every setting**, over every row of the table, a value inside its
 *   range at both ends and as text, a value outside it at both ends, of another kind and not whole, every row the build
 *   does not write yet and names the model does not have: `setSetting` refuses as `invalid`, not built with the row's
 *   requirement, or not on this model; `check` lists exactly one error at the setting, coded the same, not built being
 *   the check's `not-on-this-model` naming the requirement; and the build refuses with the class an application
 *   catches, `ComposeError`, or `NotBuiltError` with the same requirement, and builds exactly where the other two say
 *   nothing.
 * * **On a model whose build reads no setting from a document**, every compiled family's, `settings` answers not built,
 *   R47, and `setSetting` writes the document unjudged while `check` lists the field as one the build does not read.
 *
 * **The control**: one planted disagreement, a value the family's judgement is told to pass, has to be seen by the
 * agreement's comparison, so a comparison that cannot fail does not pass here.
 *
 * Scope: the Harmony Touch, whose family states its settings, and the Harmony One, 650 and 350 for the families that
 * state none. No remote.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildFromRecipe, ComposeError, harmonyTouch, NotBuiltError, recipe } from '../../src/node.ts';
import { TOUCH_SETTINGS } from '../../src/families/harmony-touch/settings.ts';
import type { FamilySettings } from '../../src/families/settings.ts';
import type { Recipe, RecipeSetting } from '../../src/recipe/recipe.ts';

type Json = any;
const REFERENCES = new URL('../references/', import.meta.url);
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const reference = (name: string): Json => JSON.parse(readFileSync(new URL(`${name}.json`, REFERENCES), 'utf8'));

/** The references' invented account, John Doe's, which a Touch's documents carry. */
const ACCOUNT = reference('john-doe-account') as never;
const SOURCES = { builtAt: '2026-11-15T09:00:00', account: ACCOUNT };

/** The bench Touch's test setup as a document, with the settings given in place of the seven it states. */
function touchWith(settings: Readonly<Record<string, RecipeSetting>> | undefined): Recipe {
  const json = reference('touch-test');
  delete json.settings;
  if (settings !== undefined) json.settings = settings;
  return recipe.open(json);
}

/** The Settings rows a build wrote, by name, each its first value, the one the remote reads; the backgrounds left out. */
function builtRows(document: Recipe): Record<string, string | null> {
  const built = buildFromRecipe(document, SOURCES);
  assert.equal(built.kind, 'documents');
  const rows = (built as Extract<typeof built, { kind: 'documents' }>).documents.Settings?.Settings;
  assert.ok(Array.isArray(rows), 'the build wrote a Settings with rows');
  return Object.fromEntries(rows.filter((row) => row.Name !== 'UserImages' && row.Name !== 'BackgroundImage').map((row) => [row.Name, row.Values?.[0] ?? null]));
}

/** The family's defaults as the text a row holds them in. */
const DEFAULT_ROWS = Object.fromEntries(TOUCH_SETTINGS.rows.map((row) => [row.name, String(row.default)]));

test('a Harmony Touch document builds with no setting stated, some or all: the family\'s default for every row not stated, a stated row over it', () => {
  assert.deepEqual(builtRows(touchWith(undefined)), DEFAULT_ROWS);
  assert.deepEqual(builtRows(touchWith({ ScreenTimeout: 30, TwelveHourClock: true })), { ...DEFAULT_ROWS, ScreenTimeout: '30', TwelveHourClock: 'true' });
  // The reference states all seven, each over its default, the timeout and the lock screen among them.
  const all = { TwelveHourClock: false, ScreenBrightness: 100, ScreenTimeout: 10, ScreenLockFlag: false, EditLock: false, KeyBrightness: 97, AccelFlag: true };
  assert.deepEqual(builtRows(touchWith(all)), Object.fromEntries(Object.entries(all).map(([name, value]) => [name, String(value)])));
  // The control: the defaults are not what a stated document builds, so the first comparison could fail.
  assert.notDeepEqual(builtRows(touchWith(all)), DEFAULT_ROWS);
  // Read back as the remote reads it: the timeout as stated and the brightness the family's 85.
  const read = harmonyTouch.readConfiguration((buildFromRecipe(touchWith({ ScreenTimeout: 30 }), SOURCES) as Json).documents).settings!;
  assert.deepEqual([read.screenTimeout.value, read.screenBrightness.value, read.screenLock.value], [30, 85, true]);
});

test('settings answers every row the build writes, the default where none is stated and the person\'s value where one is, text read as what it means', () => {
  const answers = recipe.settings(touchWith(undefined));
  assert.deepEqual(answers.map((one) => [one.name, one.value, one.isDefault, one.default]), TOUCH_SETTINGS.rows.map((row) => [row.name, row.default, true, row.default]));
  assert.deepEqual(answers.find((one) => one.name === 'ScreenTimeout')!.takes, { kind: 'whole number', min: 1, max: 30 });
  assert.deepEqual(answers.find((one) => one.name === 'EditLock')!.takes, { kind: 'yes or no', choices: [true, false] });
  // Stated: as text and as a value, and one equal to its default, which is still the person's.
  const stated = recipe.settings(touchWith({ ScreenTimeout: '30', EditLock: 'true', KeyBrightness: 35 }));
  const row = (name: string) => stated.find((one) => one.name === name)!;
  assert.deepEqual([row('ScreenTimeout').value, row('ScreenTimeout').isDefault], [30, false]);
  assert.deepEqual([row('EditLock').value, row('EditLock').isDefault], [true, false]);
  assert.deepEqual([row('KeyBrightness').value, row('KeyBrightness').isDefault, row('KeyBrightness').default], [35, false, 35]);
  // A value the build refuses is answered as the document states it, and a setting the model does not have is not
  // answered at all: `check` lists both.
  const wrong = recipe.settings(touchWith({ ScreenTimeout: 0, TouchSound: true }));
  assert.deepEqual([wrong.length, wrong.find((one) => one.name === 'ScreenTimeout')!.value], [7, 0]);
  // Every answer is the caller's own.
  const first = recipe.settings(touchWith(undefined));
  (first[0]!.takes as unknown as { choices: boolean[] }).choices.push(false);
  assert.deepEqual(recipe.settings(touchWith(undefined))[0]!.takes, { kind: 'yes or no', choices: [true, false] });
});

test('on a model whose build reads no setting from a document, settings is not built, and setSetting writes what the check lists as not read', () => {
  for (const name of ['one-test', 'h650-test', 'h350-test']) {
    const document = recipe.open(reference(name));
    assert.throws(() => recipe.settings(document), (error: unknown) => error instanceof NotBuiltError && error.requirement === 47
      && error.contract === `recipe.settings for the ${document.model.name}`, name);
    const set = recipe.setSetting(document, 'Anything', 3).document;
    assert.equal(set.settings!['Anything'], 3, name);
    const listed = recipe.check(set).filter((one) => one.message.includes('settings'));
    assert.deepEqual(listed.map((one) => [one.severity, one.code, one.place]), [['error', 'not-on-this-model', { kind: 'document' }]], name);
  }
  // A model no family serves answers not built from both.
  const h525 = { ...recipe.create({ name: 'Harmony One', skin: 54 }), model: { name: 'Harmony 525' } } as Recipe;
  assert.throws(() => recipe.settings(h525), (error: unknown) => error instanceof NotBuiltError && error.requirement === 47);
  assert.throws(() => recipe.setSetting(h525, 'ScreenTimeout', 30), (error: unknown) => error instanceof NotBuiltError && error.requirement === 47);
});

/** One answer of the three, in a form the three can be compared in: ok, a reason, or not built with its requirement. */
// 'refused' is said by the build alone, which refuses a value and a name alike; the change and the check tell them apart.
type Said = 'ok' | 'invalid' | 'not-on-this-model' | 'refused' | `not built R${number}`;

/** What `setSetting` says of a setting. */
function changeSays(document: Recipe, name: string, value: RecipeSetting): Said {
  try {
    recipe.setSetting(document, name, value);
    return 'ok';
  } catch (error) {
    if (error instanceof recipe.ChangeRefused) {
      assert.deepEqual(error.place, { kind: 'setting', setting: name });
      return error.reason as Said;
    }
    if (error instanceof NotBuiltError) return `not built R${error.requirement}`;
    throw error;
  }
}

/** What the check says of a document stating the setting, at the setting's place: nothing, or exactly one error. */
function checkSays(document: Recipe): Said {
  const at = recipe.check(document).filter((one) => one.place.kind === 'setting');
  if (at.length === 0) return 'ok';
  assert.equal(at.length, 1, JSON.stringify(at));
  const [one] = at;
  assert.equal(one!.severity, 'error');
  const built = /, R([0-9]+)$/.exec(one!.message);
  return one!.code === 'not-on-this-model' && built !== null ? `not built R${Number(built[1])}` : one!.code as Said;
}

/** What the build says of the same document. */
function buildSays(document: Recipe): Said {
  try {
    buildFromRecipe(document, SOURCES);
    return 'ok';
  } catch (error) {
    if (error instanceof NotBuiltError) return `not built R${error.requirement}`;
    // The family's refusal, of either reason: the build does not tell the two apart, the change and the check do.
    if (error instanceof ComposeError) return 'refused';
    throw error;
  }
}

/** Every case the agreement is held over: each row's values in and out of its range, the rows not built, names the model lacks. */
function cases(family: FamilySettings): [string, RecipeSetting][] {
  const out: [string, RecipeSetting][] = [];
  for (const row of family.rows) {
    if (row.takes.kind === 'yes or no') out.push([row.name, true], [row.name, false], [row.name, 'true'], [row.name, 'false'], [row.name, 1], [row.name, 'yes']);
    else {
      const { min, max } = row.takes;
      out.push([row.name, min], [row.name, max], [row.name, String(max)], [row.name, min - 1], [row.name, max + 1], [row.name, min + 0.5], [row.name, true], [row.name, 'ten']);
    }
  }
  for (const name of Object.keys(family.notBuilt)) out.push([name, true]);
  out.push(['IsWiFiEnabled', true], ['TouchSound', true], ['constructor', 1]);
  return out;
}

/** The three answers over every case, and the cases where they do not agree. */
function disagreements(family: FamilySettings): { counted: Record<string, number>; differing: string[] } {
  const counted: Record<string, number> = {};
  const differing: string[] = [];
  const base = touchWith(undefined);
  for (const [name, value] of cases(family)) {
    const change = changeSays(base, name, value);
    const stated = touchWith({ [name]: value });
    const check = checkSays(stated);
    const build = buildSays(stated);
    counted[change] = (counted[change] ?? 0) + 1;
    const buildAgrees = change === 'ok' || change.startsWith('not built') ? build === change : build === 'refused';
    if (change !== check || !buildAgrees) differing.push(`${name} ${JSON.stringify(value)}: change ${change}, check ${check}, build ${build}`);
  }
  return { counted, differing };
}

test('the change, the check and the build agree on every setting: every row in and out of its range, every row not built, names the model lacks', () => {
  const { counted, differing } = disagreements(TOUCH_SETTINGS);
  assert.deepEqual(differing, []);
  // Four yes or no rows of four values taken and two refused, three number rows of three taken and five refused; five
  // rows not built, two of them the look's; three names the model does not have.
  assert.deepEqual(counted, { ok: 25, invalid: 23, 'not built R47': 3, 'not built R42': 2, 'not-on-this-model': 3 });
});

test('the control: a value the change is told to take while the build refuses it is seen as a disagreement', () => {
  // The family's judgement, made to pass a timeout of 0 that the build's own check still refuses.
  const lenient: FamilySettings = {
    ...TOUCH_SETTINGS,
    refusedValue: (name, value) => (name === 'ScreenTimeout' && value === 0 ? undefined : TOUCH_SETTINGS.refusedValue(name, value)),
  };
  const toldToPass = cases(lenient).filter(([name, value]) => name === 'ScreenTimeout' && value === 0);
  assert.equal(toldToPass.length, 1);
  // The change and the check read the family through the registry, so the lenient table reaches them only by being
  // that family's; it is put there for this one comparison and taken back after it.
  const held = Object.getOwnPropertyDescriptor(harmonyTouch.HARMONY_TOUCH_FAMILY, 'settings')!;
  Object.defineProperty(harmonyTouch.HARMONY_TOUCH_FAMILY, 'settings', { get: () => lenient, configurable: true });
  try {
    assert.deepEqual(disagreements(lenient).differing, ['ScreenTimeout 0: change ok, check ok, build refused']);
  } finally {
    Object.defineProperty(harmonyTouch.HARMONY_TOUCH_FAMILY, 'settings', held);
  }
  assert.deepEqual(disagreements(TOUCH_SETTINGS).differing, []);
});

test('a setting given back is judged by nothing, so a document holding one the model refuses can be put right', () => {
  const holding = touchWith({ ScreenTimeout: 0, TouchSound: true, HapticFlag: true });
  let document = holding;
  for (const name of ['ScreenTimeout', 'TouchSound', 'HapticFlag']) document = recipe.setSetting(document, name, 'default').document;
  assert.equal(document.settings, undefined);
  assert.deepEqual(recipe.check(document).filter((one) => one.place.kind === 'setting'), []);
  assert.equal(recipe.check(holding).filter((one) => one.place.kind === 'setting').length, 3);
});
