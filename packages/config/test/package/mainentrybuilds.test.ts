/**
 * Building and drawing through the codec's main entry, as a renderer does: with nothing supplied, and once it has handed
 * the codec its fonts, its icon list, a deflate and SHA-256 through `supplyResources`.
 *
 * **Why a test of its own.** `mainentryreads.test.ts` runs reading through the main entry and holds that it needs no
 * resource; `toolkitchanges.test.ts` holds what the check says with nothing supplied. Building and drawing through the
 * main entry were only type checked, and a type check of a consumer is not a run: reading once failed through this
 * entry on every configuration while every check passed, because a resource only the Node entry supplied was asked for
 * where nobody expected it. FreeHarmony's window imports this entry alone and supplies the resources itself.
 *
 * **Why the order of the tests matters.** A supplied resource cannot be taken back, so this file imports the main entry
 * and no module that supplies anything (the Node entry, `resources.node.ts`), runs the tests with nothing supplied
 * first, and supplies in the test after them. Node's runner runs a file's top level tests one after another in the
 * order written. The resources are read here the way a renderer would fetch or bundle them, from the same files the
 * Node entry reads, so a build here and through the Node entry has to come out the same bytes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { deflateSync } from 'node:zlib';

import {
  buildFromRecipe,
  builtDigest,
  encodePng,
  parse,
  readPng,
  rasterPng,
  recipe,
  renderPages,
  ResourceError,
  supplyResources,
  type CodecResources,
  type Recipe,
} from '../../src/index.ts';

const REFERENCES = new URL('../references/', import.meta.url);
const reference = (name: string): unknown => JSON.parse(readFileSync(new URL(`${name}.json`, REFERENCES), 'utf8'));

/** A recorded build: when it was stamped and the SHA-256 of its bytes, `references.json`. */
const RECORDED = reference('references') as readonly { readonly name: string; readonly builtAt: string; readonly sha256: string }[];
const recorded = (name: string) => RECORDED.find((one) => one.name === name)!;

/**
 * The Harmony 650 test setup cut down to its first device and no activity: the smallest build here that draws a
 * person's name, a device's corner label, and quick enough for the everyday run where the whole setup is not.
 */
function oneDevice650(name?: string): Recipe {
  let document = recipe.open(reference('h650-test'));
  for (const activity of document.activities) document = recipe.remove(document, { activity: activity.id! }).document;
  for (const device of document.devices.slice(1)) document = recipe.remove(document, { device: device.id! }).document;
  if (name !== undefined) document = recipe.setDevice(document, document.devices[0]!.id!, { name }).document;
  return document;
}

const BUILT_AT = recorded('h650-test').builtAt;

test('with nothing supplied, a build that draws is refused through the main entry with the ResourceError it exports', () => {
  // A refusal an application catches by the class it imported from the same entry, naming what it was not given,
  // and not a crash somewhere inside a font parser.
  const refusal = (error: unknown): boolean =>
    error instanceof ResourceError && /^the codec was supplied no \w+: /.test(error.message);
  assert.throws(() => buildFromRecipe(reference('one-empty'), { builtAt: recorded('one-empty').builtAt }), refusal);
  assert.throws(() => buildFromRecipe(oneDevice650(), { builtAt: BUILT_AT }), refusal);
  // Writing a drawing as a PNG asks for the deflate, and says so.
  assert.throws(() => encodePng(1, 1, new Uint8Array(3)),
    (error: unknown) => error instanceof ResourceError && /supplied no deflate/.test(error.message));
  // The control: a build that draws nothing, the Harmony 350's, which has no screen, builds with nothing supplied, so
  // the refusal above is about drawing and not about the entry.
  const built = buildFromRecipe(reference('h350-test'), { builtAt: recorded('h350-test').builtAt });
  assert.equal(built.kind, 'configuration');
});

test('once a renderer supplies the five, the empty Harmony One builds to its recorded fingerprint and its screens draw to a PNG', () => {
  const asked = new Set<string>();
  const require = createRequire(import.meta.url);
  const supplied: CodecResources = {
    oxanium: (weight) => {
      asked.add('oxanium');
      return readFileSync(new URL(`../../fonts/Oxanium/static/Oxanium-${weight}.ttf`, import.meta.url));
    },
    iconFont: () => {
      asked.add('iconFont');
      return readFileSync(require.resolve('@mdi/font/fonts/materialdesignicons-webfont.ttf'));
    },
    iconList: () => {
      asked.add('iconList');
      return readFileSync(require.resolve('@mdi/font/scss/_variables.scss'), 'utf8');
    },
    deflate: (bytes) => {
      asked.add('deflate');
      return new Uint8Array(deflateSync(bytes));
    },
    sha256: (bytes) => {
      asked.add('sha256');
      return createHash('sha256').update(bytes).digest('hex');
    },
  };
  supplyResources(supplied);
  const { builtAt, sha256 } = recorded('one-empty');
  const built = buildFromRecipe(reference('one-empty'), { builtAt });
  // The recorded fingerprint is of the build written to the spare Harmony One, so the letters and icons drawn from
  // what a renderer handed over are those bytes exactly.
  assert.equal(builtDigest(built), sha256);
  assert.deepEqual([...asked].sort(), ['iconFont', 'iconList', 'oxanium', 'sha256'], 'the build drew letters and icons');
  assert.equal(built.kind, 'configuration');
  if (built.kind !== 'configuration') return;
  // And a screen of it drawn and written as a PNG of the screen's size, the deflate asked for.
  const page = renderPages(parse(built.bytes)).find((one) => one !== undefined && one.strings > 0);
  assert.ok(page !== undefined, 'the empty Harmony One has a screen with a string on it');
  const header = readPng(rasterPng(page.raster));
  assert.deepEqual([header.width, header.height], [page.raster.width, page.raster.height]);
  assert.ok(asked.has('deflate'));
});

test('a build through the main entry draws a device\'s name: another name builds other bytes, and one too wide is refused as the check reports it', () => {
  // Runs after the resources were supplied above.
  const first = builtDigest(buildFromRecipe(oneDevice650(), { builtAt: BUILT_AT }));
  const renamed = builtDigest(buildFromRecipe(oneDevice650('TV'), { builtAt: BUILT_AT }));
  assert.notEqual(renamed, first, 'the name is in the bytes');
  // The check judges names now that it can draw them, where with nothing supplied it says it judged none.
  const codes = recipe.check(oneDevice650('TV')).map((one) => one.code);
  assert.ok(!codes.includes('names-not-judged'), codes.join(', '));
  assert.ok(!codes.includes('name-not-drawable'), codes.join(', '));
  // The control: a name wider than the Harmony 650's corner is refused by the build, in the words the check uses.
  const wide = oneDevice650('A'.repeat(20));
  const why = recipe.check(wide).filter((one) => one.code === 'name-not-drawable').map((one) => one.message);
  assert.equal(why.length, 1);
  const reason = / is 220 pixels wide and a corner holds 59: give it a shorter label$/;
  assert.match(why[0]!, reason);
  assert.throws(() => buildFromRecipe(wide, { builtAt: BUILT_AT }), (error: unknown) =>
    error instanceof Error && !(error instanceof ResourceError) && reason.test(error.message));
});
