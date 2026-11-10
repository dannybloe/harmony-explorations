/**
 * The codec's source does not depend on `packages/usb`, plan 013 decision 4.
 *
 * Before that decision the codec imported the model table and the trailer checksum from `@harmony/usb`, so a
 * program that only wanted to parse a configuration pulled in the HID transport and its native module.
 * Both live in `packages/base` now. What keeps it that way is this test, because nothing else would fail:
 * an import of `@harmony/usb` in `src` would typecheck and run as long as the workspace links the package.
 *
 * The scope is `src` on purpose. The codec's scripts and tests still import `@harmony/usb`, its rails and
 * a recorded Touch sync's decoder, which is why the package keeps it as a development dependency; what tests
 * share across packages lives in `@harmony/testkit`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const MANIFEST = fileURLToPath(new URL('../../package.json', import.meta.url));

/** Every TypeScript file under a directory, found by walking, so a new file is covered without a list. */
function sources(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...sources(path));
    else if (entry.name.endsWith('.ts')) found.push(path);
  }
  return found;
}

/**
 * A module specifier naming `@harmony/usb` or one of its subpaths, in a static import, an export from or a
 * dynamic import. Matched on the quoted specifier rather than on the statement's shape, so a type import,
 * a multi line import and `await import(...)` are all caught.
 */
const USB_SPECIFIER = /['"]@harmony\/usb(?:\/[^'"]*)?['"]/;

test('no file in the codec source imports @harmony/usb', () => {
  const files = sources(SRC);
  // The walk found the source rather than nothing, which would make the check below pass vacuously.
  assert.ok(files.some((f) => f.endsWith(join('src', 'container', 'gspm.ts'))), 'the walk found gspm.ts');
  const offending = files
    .filter((f) => readFileSync(f, 'utf8').split('\n').some((line) => !/^\s*(\*|\/\/)/.test(line) && USB_SPECIFIER.test(line)))
    .map((f) => f.slice(SRC.length));
  assert.deepEqual(offending, []);
});

test('the codec states the base as a dependency and the transport only as a development one', () => {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.equal(manifest.dependencies?.['@harmony/base'], 'workspace:*');
  assert.equal(manifest.dependencies?.['@harmony/usb'], undefined);
});
