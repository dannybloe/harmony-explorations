/**
 * The two fixture tables must name the same files under the same logical names.
 *
 * There are two of them because there are two suites, and the port is only provably equivalent
 * if both read the same bytes. A name present on one side only produces a golden vector nobody
 * checks, which looks exactly like a passing test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { IMAGES } from '../src/index.ts';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');

function pythonImages(): Record<string, string> {
  const source = readFileSync(join(REPO_ROOT, 'tests', 'lab.py'), 'utf8');
  const block = /^IMAGES = \{$(.*?)^\}$/ms.exec(source);
  assert.ok(block, 'tests/lab.py has no IMAGES table in the expected shape');
  const out: Record<string, string> = {};
  for (const m of block[1]!.matchAll(/^\s*'([a-z0-9_]+)':\s*'([^']+)',/gm)) {
    out[m[1]!] = m[2]!;
  }
  return out;
}

test('the TypeScript and Python fixture tables agree', () => {
  assert.deepEqual(IMAGES, pythonImages());
});

test('the Python table was actually parsed, rather than read as empty', () => {
  // Without this, a change to lab.py's formatting would turn the check above into a comparison
  // of two empty objects, and it would pass.
  //
  // Exact, and the number is the point: the floor that stood here was 18, which was the size of the
  // table when it was written. The table is 52 entries now, so the guard had been satisfied by 35% of
  // it for weeks, and a regex that lost two thirds of the lines would have passed.
  assert.equal(Object.keys(pythonImages()).length, 54, 'every fixture tests/lab.py names');
});
