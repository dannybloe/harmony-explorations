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

import { IMAGES, PARSEABLE_EXCLUDED } from '../src/index.ts';

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
  // table when it was written. The table is 58 entries now, so the guard had been satisfied by 31% of
  // it for weeks, and a regex that lost two thirds of the lines would have passed.
  //
  // 62 since the Harmony 895 was registered, section 177, 63 since the Harmony 350's config, section
  // 194, 65 since its firmware and the package it came in, section 196, and 68 since three files of
  // MyHarmony's own source, sections 202 and 203. 69 since the classic client's own wire log,
  // section 210, which is the first fixture here that is a capture rather than a file off a device,
  // 72 since the classic client's three single byte memory services, section 211, and 77 since
  // five more of the same client's HID services, section 213. 78 since the update service,
  // section 214, whose region table is the source end of a closure against the wire log above. 80
  // since two regions Logitech's own client read off a Harmony One, section 215.
  // This is a **pure text** check on lab.py, so it runs with no lab at all and is what
  // `make test-nolab` caught, four times now, when the count was left behind by a registration.
  // 81 since `one_spare_20260830`, the fourth state of the spare Harmony One, read on 30 August 2026.
  // 82 since the read taken after the first write, section 222.
  assert.equal(Object.keys(pythonImages()).length, 83, 'every fixture tests/lab.py names');
});

test('the two sides exclude the same fixtures from the parseable population', () => {
  // A second pair of lists that nobody compares is the defect section 141 was written for, and this
  // one decides two corpus wide totals, so it gets the same equality check as IMAGES rather than a
  // comment asking people to keep them in step. Section 215.
  const source = readFileSync(join(REPO_ROOT, 'tests', 'lab.py'), 'utf8');
  const block = /^PARSEABLE_EXCLUDED = \((.*?)\)$/ms.exec(source);
  assert.ok(block, 'tests/lab.py has no PARSEABLE_EXCLUDED tuple in the expected shape');
  const names = [...block[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
  assert.deepEqual([...PARSEABLE_EXCLUDED].sort(), names.sort());
  // Four since 1 September 2026. Three of them are byte for byte duplicates of a container already
  // counted; the fourth, the read taken after the first write that **changed** something, is that
  // same container plus two known operand bytes, so counting it would count one configuration twice
  // for every total that does not depend on those two bytes, which is all of them.
  assert.equal(names.length, 4, 'each one a container already counted, or that container plus a known edit');
});
