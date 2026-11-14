/**
 * The lab's sample of the infrared archive is its list, and the list is well formed.
 *
 * Tests read the sample and never the archive's checkout, `IR_ARCHIVE_SAMPLE` in the index, so the sample is test
 * data like any other the lab holds, and what makes it trustworthy is that it cannot change unseen: this repository
 * holds every path of it with the SHA-256 it was copied at, and the lab's folder is held to that list here, file by
 * file, with nothing beside them but the one note of ours. A file edited in the lab, one missing, one added by hand
 * and one listed but never taken are each a failure naming the file.
 *
 * The check is a function of a folder and a list, so its control runs it on a folder built to break each rule.
 *
 * **And no test reads the checkout.** The names that find it, `IR_ARCHIVE` and the two skips built on it, stand in
 * no test of either language; they are for the scripts under `bin/` and for the measurements over the whole
 * archive, the `*.measure.ts` files beside the tests, which `make archive-measure` runs and the suite does not. A
 * measurement in turn never reads the sample, since a count over a sample measures nothing about the archive.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatSampleList, IR_ARCHIVE_SAMPLE, IR_ARCHIVE_SAMPLE_LIST, IR_ARCHIVE_SAMPLE_NOTE, isSamplePath, parseSampleList,
  sampleFaults, sha256OfFile, skipWithoutIrArchiveSample,
} from '../src/index.ts';

const list = (): ReturnType<typeof parseSampleList> => parseSampleList(readFileSync(IR_ARCHIVE_SAMPLE_LIST, 'utf8'));

test('the list reads, sorted with no path twice, every file taken, and writes back as it stands', () => {
  const text = readFileSync(IR_ARCHIVE_SAMPLE_LIST, 'utf8');
  const entries = parseSampleList(text);
  assert.ok(entries.length > 0, 'the list names some files');
  // Every file has its checksum: a `-` is a file asked for and not yet taken, which is not a state to commit.
  assert.deepEqual(entries.filter((one) => one.sha256 === undefined).map((one) => one.path), []);
  assert.equal(formatSampleList(entries), text);
  // The archive's own description of itself is in it, which is how the sample says which release it is of.
  assert.ok(entries.some((one) => one.path === 'manifest.json'));
});

test('the list refuses a line that is not a checksum and a path, a path outside the archive\'s layout, and a path out of order', () => {
  const sum = 'a'.repeat(64);
  assert.throws(() => parseSampleList(`${sum} manifest.json\n`), /is not "<sha256>  <path>"/);
  assert.throws(() => parseSampleList(`${sum}  ../outside.json\n`), /names no file of the archive's layout/);
  assert.throws(() => parseSampleList(`${sum}  notes/readme.md\n`), /names no file of the archive's layout/);
  assert.throws(() => parseSampleList(`${sum}  manifest.json\n${sum}  index.json\n`), /out of order or twice/);
  assert.throws(() => parseSampleList(`${sum}  index.json\n${sum}  index.json\n`), /out of order or twice/);
  for (const path of ['manifest.json', 'index.json', 'devices/Sony/index.json', 'devices/Sony/KDL-32W705B.json', 'codesets/0a/0a8924875b3d98ac.json', 'protocols/NEC 32 Bit.json']) {
    assert.ok(isSamplePath(path), path);
  }
  for (const path of ['/etc/passwd', 'devices/../manifest.json', 'devices/Sony', 'codesets/zz/x.json', 'manifest.json/x']) {
    assert.ok(!isSamplePath(path), path);
  }
});

test('the lab\'s sample holds exactly the listed files, each at its checksum, and the note of ours',
  skipWithoutIrArchiveSample(), () => {
  assert.deepEqual(sampleFaults(IR_ARCHIVE_SAMPLE!, list(), [IR_ARCHIVE_SAMPLE_NOTE]), []);
  // The note says which release the sample was taken at, the one its own manifest states.
  const note = JSON.parse(readFileSync(join(IR_ARCHIVE_SAMPLE!, IR_ARCHIVE_SAMPLE_NOTE), 'utf8')) as { release?: unknown; files?: unknown };
  const manifest = JSON.parse(readFileSync(join(IR_ARCHIVE_SAMPLE!, 'manifest.json'), 'utf8')) as { generated?: unknown };
  assert.equal(note.release, manifest.generated);
  assert.equal(note.files, list().length);
});

test('the control: a file changed, one missing, one not on the list and one never taken are each found by name', () => {
  const folder = mkdtempSync(join(tmpdir(), 'ir-archive-sample-'));
  try {
    mkdirSync(join(folder, 'protocols'));
    writeFileSync(join(folder, 'manifest.json'), '{"generated":"a release"}');
    writeFileSync(join(folder, 'index.json'), '[]');
    writeFileSync(join(folder, 'protocols', 'One.json'), '{}');
    const entries = [
      { path: 'index.json', sha256: sha256OfFile(join(folder, 'index.json')) },
      { path: 'manifest.json', sha256: sha256OfFile(join(folder, 'manifest.json')) },
      { path: 'protocols/One.json', sha256: sha256OfFile(join(folder, 'protocols', 'One.json')) },
    ];
    assert.deepEqual(sampleFaults(folder, entries), []);
    // Each rule broken in turn, and put back.
    writeFileSync(join(folder, 'index.json'), '[1]');
    assert.deepEqual(sampleFaults(folder, entries), ['index.json: not the bytes the list states']);
    writeFileSync(join(folder, 'index.json'), '[]');
    assert.deepEqual(sampleFaults(folder, entries.slice(0, 2)), ['protocols/One.json: in the folder and not on the list']);
    assert.deepEqual(sampleFaults(folder, entries.slice(0, 2), ['protocols/One.json']), []);
    assert.deepEqual(sampleFaults(folder, [...entries, { path: 'protocols/Two.json', sha256: 'b'.repeat(64) }]), ['protocols/Two.json: missing']);
    assert.deepEqual(sampleFaults(folder, [...entries, { path: 'protocols/Two.json', sha256: undefined }]), ['protocols/Two.json: listed and not yet taken']);
    assert.deepEqual(sampleFaults(join(folder, 'absent'), entries), [`${join(folder, 'absent')}: no such folder`]);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Every file under a folder of the repository whose name passes, as paths from the root; dependencies skipped. */
function sources(folder: string, wanted: (name: string) => boolean): string[] {
  const found: string[] = [];
  const walk = (at: string): void => {
    // A package without tests has no such folder.
    if (!existsSync(join(ROOT, at))) return;
    for (const entry of readdirSync(join(ROOT, at), { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__pycache__' || entry.name.startsWith('.')) continue;
      const path = `${at}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (wanted(entry.name)) found.push(path);
    }
  };
  walk(folder);
  return found.sort();
}

/** The names that find the checkout, as a test or a measurement would write them; the sample's names are longer. */
const CHECKOUT = /\bIR_ARCHIVE\b(?!_)|\bskipWithoutIrArchive\b|\bskipUnlessIrArchiveRelease\b|\birArchivePath\b|\birArchiveRelease\b/;
/** The names that find the sample. */
const SAMPLE = /\bIR_ARCHIVE_SAMPLE\b|\bskipWithoutIrArchiveSample\b/;

/** The files among `paths` whose text matches, read from the repository. */
const naming = (paths: readonly string[], pattern: RegExp): string[] =>
  paths.filter((path) => pattern.test(readFileSync(join(ROOT, path), 'utf8')));

test('no test names the archive\'s checkout, and no measurement names the sample', () => {
  const packages = readdirSync(join(ROOT, 'packages'), { withFileTypes: true }).filter((one) => one.isDirectory()).map((one) => one.name);
  const inTests = (suffix: string): string[] => packages.flatMap((name) => sources(`packages/${name}/test`, (file) => file.endsWith(suffix)));
  const tests = inTests('.test.ts');
  const measurements = inTests('.measure.ts');
  const python = sources('tests', (file) => file.endsWith('.py'));
  assert.ok(tests.length > 100 && measurements.length > 0 && python.length > 100, 'the walk found the sources');
  // This file states the names it looks for, and is the one test that may.
  const own = 'packages/lab/test/irarchivesample.test.ts';
  assert.deepEqual(naming(tests, CHECKOUT).filter((path) => path !== own), []);
  assert.deepEqual(naming(python, CHECKOUT), []);
  assert.deepEqual(naming(measurements, SAMPLE), []);
  // Each measurement does name the checkout: a file with that suffix that reads no archive is a test and belongs
  // in the suite.
  assert.deepEqual(measurements.filter((path) => !CHECKOUT.test(readFileSync(join(ROOT, path), 'utf8'))), []);
  // And a good many tests read the sample, so the first assertion is not passing over an empty population.
  assert.ok(naming(tests, SAMPLE).length > 40, 'tests read the sample');
});

test('the control: each name of the checkout is seen, and the sample\'s names are not taken for it', () => {
  for (const line of ['catalogueCommands(IR_ARCHIVE!, codeset)', 'needing(skipWithoutIrArchive())', '{ ...skipUnlessIrArchiveRelease() }',
    'lab.irArchivePath(\'protocols\')']) {
    assert.ok(CHECKOUT.test(line), line);
  }
  for (const line of ['catalogueCommands(IR_ARCHIVE_SAMPLE!, codeset)', 'needing(skipWithoutIrArchiveSample())', 'IR_ARCHIVE_SAMPLE_LIST']) {
    assert.ok(!CHECKOUT.test(line), line);
  }
  assert.ok(SAMPLE.test('needing(skipWithoutIrArchiveSample())') && !SAMPLE.test('needing(skipWithoutIrArchive())'));
});
