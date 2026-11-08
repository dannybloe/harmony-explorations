/**
 * What makes `packages/base` a base: nothing native, nothing reading the disk, nothing outside Node's own.
 *
 * Plan 013 decision 4. The point of the package is that a browser page, an Electron window and the codec
 * can all load it without the HID transport, so the property that matters is about its imports, and no
 * other test would notice one being added. The key reader page publishes `keys.ts` and `models.ts` to a
 * stranger's browser as they are, which is the strictest reader: there, any import at all is a file
 * nobody chose to publish.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const MANIFEST = fileURLToPath(new URL('../package.json', import.meta.url));

/** The import and export from specifiers of a module, comment lines skipped. */
function specifiers(source: string): string[] {
  const found: string[] = [];
  for (const line of source.split('\n')) {
    if (/^\s*(\*|\/\/)/.test(line)) continue;
    const match = /^\s*(?:import|export)\b.*\bfrom\s+['"]([^'"]+)['"]/.exec(line) ?? /\bimport\(\s*['"]([^'"]+)['"]/.exec(line);
    if (match) found.push(match[1]!);
  }
  return found;
}

test('the package holds exactly its four modules and its index', () => {
  // Exact, so a module added here is a decision that shows up in this diff and gets asked whether it belongs.
  assert.deepEqual(readdirSync(SRC).sort(), ['bytes.ts', 'index.ts', 'keys.ts', 'models.ts', 'trailer.ts']);
});

test('the four modules import nothing, and the index only them', () => {
  for (const name of ['bytes.ts', 'keys.ts', 'models.ts', 'trailer.ts']) {
    assert.deepEqual(specifiers(readFileSync(SRC + name, 'utf8')), [], name);
  }
  // The index may name a module more than once since `todo.md` 7.3.6, for its values and for its types,
  // `test/surface.test.ts`; still the modules and nothing else, the byte comparison the fourth since `todo.md` 7.3.7.
  assert.deepEqual([...new Set(specifiers(readFileSync(SRC + 'index.ts', 'utf8')))], ['./models.ts', './trailer.ts', './keys.ts', './bytes.ts']);
});

test('the package depends on nothing, and its tests on the test kit alone', () => {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, unknown>;
  assert.equal(manifest['dependencies'], undefined);
  // The allow list test reads the main entry's names through `@harmony/testkit/surface`, `todo.md` 7.3.6. A dev
  // dependency is not installed with the package and nothing in `src` may import it, which the test above holds.
  assert.deepEqual(manifest['devDependencies'], { '@harmony/testkit': 'workspace:*' });
});
