/**
 * `@harmony/silhouettes`'s main entry, held to a list, plan 013 decision 6: a new public name
 * is a line in this file's diff, and so is one taken away. The list is read off the entry's source,
 * `@harmony/testkit/surface`, which shows the types a loaded module does not, and the loaded module is held to the
 * same values, so a reading of the source that missed a name fails here.
 *
 * The models, the key lookups and the drawing; what a geometry table is written with is `./internal`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { entryNames } from '@harmony/testkit/surface';

const ENTRY = new URL('../src/index.ts', import.meta.url);
const MANIFEST = new URL('../package.json', import.meta.url);

/** The main entry's names that exist at run time. */
const VALUES = [
  'CASE_HEIGHT', 'DEFAULTS', 'DETAIL', 'H300', 'H300EU', 'H350', 'H515', 'H525', 'H600', 'H650', 'H700', 'H720', 'H785',
  'H880', 'H880PRO', 'H885', 'H890PRO', 'ICONS', 'LAYERS', 'MODELS', 'ONE', 'SCAN_SOURCES', 'TOUCH', 'elementId',
  'extentOf', 'keyOf', 'keyOfScan', 'pathBounds', 'pathPolygon', 'pointInPath', 'toSvg',
];

/** The main entry's types and interfaces, which only the source shows. */
const TYPES = [
  'Bounds', 'Icon', 'IconPart', 'Key', 'KeyKind', 'Label', 'LabelPlace', 'LayerName', 'Model', 'Provenance',
  'Region', 'ScanSource', 'Screen', 'Shape', 'SvgOptions',
];

/** Every subpath `package.json` exports, `.` the main entry. */
const SUBPATHS = [
  '.', './internal',
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
