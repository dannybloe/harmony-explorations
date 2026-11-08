/**
 * `@harmony/base`'s main entry, held to a list, `todo.md` 7.3.6 and plan 013 decision 6: a new public name is a
 * line in this file's diff, and so is one taken away. The list is read off the entry's source,
 * `@harmony/testkit/surface`, which shows the types a loaded module does not, and the loaded module is held to the
 * same values, so a reading of the source that missed a name fails here.
 *
 * The base is the model table, the trailer checksum, the key codes and the byte comparison, each module whole, and each is also its own
 * subpath for a browser page that loads one module at a time.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { entryNames } from '@harmony/testkit/surface';

const ENTRY = new URL('../src/index.ts', import.meta.url);
const MANIFEST = new URL('../package.json', import.meta.url);

/** The main entry's names that exist at run time. */
const VALUES = [
  'ARCH_8_PRODUCT', 'MODELS_BY_SKIN', 'MODELS_WITHOUT_A_SKIN', 'OUT_OF_TRANSPORT_REACH',
  'SKINS_WITHOUT_A_MODEL_RECORD', 'SKINS_WITH_A_LONG_PRESS', 'TRAILER_CHECKSUM_OFFSET', 'TRAILER_CHECKSUM_SEED',
  'WATCH', 'WATCH_BY_SKIN', 'architectureHasTouch', 'hasLongPress', 'modelForSkin', 'sameBytes', 'trailerChecksum',
];

/** The main entry's types and interfaces, which only the source shows. */
const TYPES = [
  'Model', 'MotionSensor', 'Panel', 'Watch',
];

/** Every subpath `package.json` exports, `.` the main entry. */
const SUBPATHS = [
  '.', './models', './trailer', './keys', './bytes',
];

test('the main entry exports exactly its list, by explicit names', async () => {
  const names = entryNames(ENTRY);
  assert.deepEqual(names.starExports, [], 'an export * makes every name of a module public by default');
  assert.deepEqual(names.values, VALUES);
  assert.deepEqual(names.types, TYPES);
  // The loaded module agrees with the reading of its source.
  assert.deepEqual(Object.keys(await import(ENTRY.href)).sort(), VALUES);
});

test('the package exports exactly its list of subpaths', () => {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { exports: Record<string, string> };
  assert.deepEqual(Object.keys(manifest.exports), SUBPATHS);
});
