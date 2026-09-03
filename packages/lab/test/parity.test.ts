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
  // 90 since the fourth region read of the spare Harmony One, section 246.
  // 91 since the read taken after the write of section 247.
  // 92 since the read taken after the revert of section 248.
  assert.equal(Object.keys(pythonImages()).length, 92, 'every fixture tests/lab.py names');
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
  // Eight since 1 September 2026. Three are byte for byte duplicates of a container already counted;
  // two are the reads taken after the writes that **changed** something, each that same container
  // plus two or three known operand bytes; the sixth is that container again read as a flash region
  // rather than as a container, which a write needs because an edit moves the trailer checksum into
  // a block a container stops part way through. Counting any of them would count one configuration
  // twice for every total that does not depend on those bytes, which is all of them. One state of a
  // remote per write is what the write path's compare demands, so this list grows with the writes
  // and that is by design rather than accumulation. The seventh is the first container the codec
  // itself produced, which differs from the pre write read in the one delay it was asked to change
  // and in the checksum that follows from it. The ninth, 3 September 2026, is the remote as the first
  // write that added a device left it, read as a region: section 241's candidate byte for byte, a
  // configuration this project composed rather than one Logitech compiled, so it is not a corpus
  // member either, section 242.
  // The tenth is that same state finished, read again because the write before it invalidated
  // the dump, which is the wart section 237 records rather than solves.
  // The eleventh is that same unit after the write of section 247, which is that container plus
  // one delay operand and the checksum that follows from it.
  // The twelfth is the revert of section 248, which is byte for byte the ninth again.
  assert.equal(names.length, 13, 'each one a container already counted, or that container plus a known edit');
});
