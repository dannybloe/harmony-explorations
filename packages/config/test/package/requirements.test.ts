/**
 * What `bin/requirements.ts` generates, decision 33: the proofs module the base exports, read off the test sources,
 * the short requirements document, the document of the evidence and the checklist of each bench remote.
 *
 * **The committed files are what the sources give.** The generator reads every test statically for its calls of
 * `proves`, and from those and the written statuses writes all of the files above; a committed file that differs,
 * because a proof was added and not regenerated, a status changed, or a file edited by hand, fails here with the
 * command that fixes it. Above all `packages/base/src/proofs.ts`, which an application reads at run time: a met is
 * derived from it, so it agreeing with the tests is what makes a met mean a test proves it.
 *
 * **The reader of the sources has controls of its own**, each on a source written here, never on a test file of the
 * repository: a proof is found with the title of its test, a proof whose arguments are not literals or that stands
 * outside any test is a fault, and a call through another name is not a proof, in TypeScript and in Python alike.
 * And the Python helper's list of bench models is the base's, since the helper cannot ask the base.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BENCH_MODELS, PROOFS, type BenchModel } from '@freeharmony-sdk/base/requirements';
import {
  checklist, checklistPath, DOCUMENT, evidenceDocument, generatedFiles, introductionOf, PROOFS_MODULE, proofsInPython,
  proofsInTypeScript, proofsModule, requirementsDocument, ROOT, run, scanSources,
} from '../../bin/requirements.ts';

const committed = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

test('every committed file is what the sources generate: the proofs, both documents and the thirteen checklists', () => {
  assert.deepEqual(run(false), []);
  // Exactly these files, so one added or dropped shows in this diff.
  assert.deepEqual([...generatedFiles(PROOFS).keys()], [
    PROOFS_MODULE, 'docs/remote-requirements.md', 'docs/remote-requirements-evidence.md', ...BENCH_MODELS.map(checklistPath),
  ]);
});

test('the proofs module is the proofs the test sources hold, and the base loads the same', () => {
  const scan = scanSources();
  assert.deepEqual(scan.faults, []);
  assert.equal(committed(PROOFS_MODULE), proofsModule(scan.proofs));
  // What the base exports is what was read: a module edited by hand would differ from the sources above, and one
  // regenerated but not reloaded cannot happen in a fresh run.
  assert.deepEqual(PROOFS, scan.proofs);
  // The control: one proof more in the sources is another module.
  const extra = { requirement: 20, models: 'every' as const, test: 'packages/config/test/infrared/pronto.test.ts', title: 'planted', bench: [] };
  assert.notEqual(proofsModule([...scan.proofs, extra]), committed(PROOFS_MODULE));
});

test('a TypeScript proof is found with its test\'s title, and each argument read off its literal', () => {
  const source = [
    "import { test, describe, it } from 'node:test';",
    "test('reads the configuration', () => {",
    "  proves(1, ['harmony-650'], ['docs/test-notes/harmony-650.md#memory-as-read']);",
    '});',
    "describe('a group', () => {",
    "  it('writes Pronto Hex', { skip: false }, async () => { proves(20, 'every'); });",
    '});',
    'for (const name of NAMES) {',
    '  test(`${name} reads`, () => { proves(2, [\'harmony-one\']); });',
    '}',
  ].join('\n');
  const scan = proofsInTypeScript('packages/x/test/a.test.ts', source);
  assert.deepEqual(scan.faults, []);
  assert.deepEqual(scan.proofs, [
    { requirement: 1, models: ['harmony-650'], test: 'packages/x/test/a.test.ts', title: 'reads the configuration', bench: ['docs/test-notes/harmony-650.md#memory-as-read'] },
    { requirement: 20, models: 'every', test: 'packages/x/test/a.test.ts', title: 'writes Pronto Hex', bench: [] },
    // A title built in a loop is kept as its source reads.
    { requirement: 2, models: ['harmony-one'], test: 'packages/x/test/a.test.ts', title: '${name} reads', bench: [] },
  ]);
});

test('the control: a TypeScript proof that cannot be read is a fault, and a call through another name is no proof', () => {
  const source = [
    "test('one', () => { proves(NUMBER, ['harmony-650']); });",
    "test('two', () => { proves(1, MODELS); });",
    "test('three', () => { proves(1, ['harmony-650'], [PATH]); });",
    "proves(1, ['harmony-650']);",
    "test('four', () => { proof.proves(1, ['harmony-650']); const text = \"proves(1, ['harmony-one'])\"; });",
  ].join('\n');
  const scan = proofsInTypeScript('packages/x/test/b.test.ts', source);
  assert.deepEqual(scan.proofs, []);
  assert.deepEqual(scan.faults, [
    'packages/x/test/b.test.ts:1: a proof whose requirement is not a number written out',
    'packages/x/test/b.test.ts:2: a proof whose models are not a list of keys written out, or \'every\'',
    'packages/x/test/b.test.ts:3: a proof whose bench records are not a list of paths written out',
    'packages/x/test/b.test.ts:4: a proof outside any test',
  ]);
});

test('a Python proof is found in its test method, with its class, over several lines and after a docstring', () => {
  const source = [
    'import unittest',
    'from proves import proves',
    '',
    'class TheReads(unittest.TestCase):',
    '    def setUp(self):',
    '        self.x = 1',
    '',
    '    def test_the_read_is_whole(self):',
    '        """A docstring."""',
    "        proves(1, ['harmony-885'],",
    "               ['docs/test-notes/harmony-885.md#the-first-unit-h885_a'])  # a comment",
    '',
    '    def test_pronto(self):',
    "        proves(20, 'every')",
  ].join('\n');
  const scan = proofsInPython('tests/x/test_a.py', source);
  assert.deepEqual(scan.faults, []);
  assert.deepEqual(scan.proofs, [
    { requirement: 1, models: ['harmony-885'], test: 'tests/x/test_a.py', title: 'TheReads.test_the_read_is_whole', bench: ['docs/test-notes/harmony-885.md#the-first-unit-h885_a'] },
    { requirement: 20, models: 'every', test: 'tests/x/test_a.py', title: 'TheReads.test_pronto', bench: [] },
  ]);
});

test('the control: a Python proof that cannot be read is a fault, and a call through another name is no proof', () => {
  const source = [
    'import proves as helper',
    'def proves(number, models, bench=()):',
    '    pass',
    "proves(1, ['harmony-650'])",
    'class TheReads(unittest.TestCase):',
    '    def test_one(self):',
    "        proves(NUMBER, ['harmony-650'])",
    '    def test_two(self):',
    "        proves(1, ['harmony-650'], bench=['x'])",
    '    def test_three(self):',
    "        helper.proves(1, ['harmony-650'])",
    "        self.improves(1)",
  ].join('\n');
  const scan = proofsInPython('tests/x/test_b.py', source);
  assert.deepEqual(scan.proofs, []);
  assert.deepEqual(scan.faults, [
    'tests/x/test_b.py:4: a proof whose call stands outside any test method',
    'tests/x/test_b.py:7: a proof whose arguments are not two or three literals',
    'tests/x/test_b.py:9: a proof whose arguments are not two or three literals',
  ]);
});

test('the Python helper names the same bench models as the base, in the same order', () => {
  const keysIn = (text: string): string[] => {
    const tuple = /^BENCH_MODEL_KEYS = \(([^)]*)\)/m.exec(text);
    assert.ok(tuple, 'the helper states its keys as one tuple');
    return [...tuple[1]!.matchAll(/'([a-z0-9-]+)'/g)].map((match) => match[1]!);
  };
  const helper = committed('tests/proves.py');
  assert.deepEqual(keysIn(helper), BENCH_MODELS.map((model) => model.key));
  // The control: a key left out is seen.
  assert.notDeepEqual(keysIn(helper.replace("'harmony-525', ", '')), BENCH_MODELS.map((model) => model.key));
});

/** A bench model by key, for the checklist tests. */
const model = (key: string): BenchModel => BENCH_MODELS.find((one) => one.key === key)!;

test('a checklist ticks what is proven, says what an open one waits on, marks what is unknown, leaves out the impossible and the FHSDK\'s own', () => {
  const text = checklist(model('harmony-one'), PROOFS, undefined);
  const lines = text.split('\n');
  // R1 is proven on the One, R3 open, R40 unknown, R29 impossible: the One has no activity keys.
  assert.ok(lines.includes('- [x] R1 Read the configuration off the remote, whole and checked.'));
  // An open one says whose work is missing: R3 waits on the FHSDK alone, R10 on the FHSDK and the One's family, and
  // R41, whose screens render, only on a run on a unit.
  assert.ok(lines.some((line) => line.startsWith('- [ ] R3 ') && line.endsWith(' (waits on the FHSDK)')));
  assert.ok(lines.some((line) => line.startsWith('- [ ] R10 ') && line.endsWith(' (waits on the FHSDK and its family)')));
  assert.ok(lines.some((line) => line.startsWith('- [ ] R41 ') && line.endsWith(' (waits on a run on a unit)')));
  // The open ones are counted by owner before the list, each once, so the three add up to the open boxes.
  const counts = /^Open: (\d+), of which (\d+) its own or its family's work, (\d+) the FHSDK's work alone and (\d+) a run on a unit alone\.$/.exec(lines.find((line) => line.startsWith('Open: '))!);
  assert.ok(counts, 'the count line');
  const [open, own, shared, run] = counts.slice(1).map(Number);
  assert.equal(open, lines.filter((line) => line.startsWith('- [ ] ') && line.includes(' (waits on ')).length);
  assert.equal(own! + shared! + run!, open);
  assert.ok(lines.some((line) => line.startsWith('- [ ] R40 ') && line.endsWith(' (find out first)')));
  assert.ok(!lines.some((line) => line.startsWith('- [x] R29 ') || line.startsWith('- [ ] R29 ')));
  // The requirements of the FHSDK as a whole are no remote's: the two subjects, R68, and those that work on a recipe
  // or the catalogue alone, renaming among them.
  for (const number of [9, 12, 20, 25, 57, 60, 68, 73, 74, 75]) assert.ok(!lines.some((line) => / R(\d+) /.exec(line)?.[1] === String(number)), `R${number}`);
  // Every box is one line under a subject.
  assert.equal(lines.filter((line) => line.startsWith('- [x] ')).length, 14);
});

test('a checklist keeps its header and the remote\'s own work as written, and refuses a file without its markers', () => {
  const generated = checklist(model('harmony-650'), PROOFS, undefined);
  const edited = generated.replace(/^# .*$/m, '# My own title').concat('\n- [ ] fix the 650 thing\n');
  const again = checklist(model('harmony-650'), PROOFS, edited);
  assert.ok(again.startsWith('# My own title\n'));
  assert.ok(again.includes('- [ ] fix the 650 thing'));
  // The control: a box ticked by hand inside the markers is put back.
  const ticked = generated.replace('- [ ] R3 ', '- [x] R3 ');
  assert.notEqual(ticked, generated);
  assert.equal(checklist(model('harmony-650'), PROOFS, ticked), generated);
  assert.throws(() => checklist(model('harmony-650'), PROOFS, '# no markers\n'), /no <!-- checklist -->/);
  // And the committed one is the generated one.
  assert.equal(committed(checklistPath(model('harmony-650'))), checklist(model('harmony-650'), PROOFS, committed(checklistPath(model('harmony-650')))));
});

test('the short document is the introduction, two tables and the requirements; the evidence is its own document', () => {
  const text = readFileSync(DOCUMENT, 'utf8');
  const headings = text.split('\n').filter((line) => /^##? /.test(line));
  assert.deepEqual(headings, ['# The FHSDK\'s requirements, per remote', '## Where each remote stands', '## What the open ones wait on', '## The requirements']);
  // A row per remote: proven, open, unknown, impossible, and proven of possible, as the data counts them.
  assert.ok(text.includes('| Harmony 650 | 10 | 54 | 3 | 9 | 10 of 67 |'));
  // And a row per remote of whose work its open ones are: its own or its family's, the FHSDK's alone, a run alone.
  assert.ok(text.includes('| Harmony 650 | 54 | 25 | 19 | 10 |'));
  // The Harmony 515, which no family serves, waits on the FHSDK alone for one requirement only.
  assert.ok(text.includes('| Harmony 515 | 52 | 51 | 1 | 0 |'));
  // The evidence document names the tests that prove a met, by file and title.
  const evidence = evidenceDocument(PROOFS);
  const one = PROOFS.find((proof) => proof.requirement === 1 && proof.models !== 'every' && proof.models.includes('harmony-650'))!;
  assert.ok(evidence.includes(`\`${one.test}\`, "${one.title}"`));
});

test('the control: a document whose generated part was edited by hand differs, and its introduction is kept', () => {
  // Without this the test above could pass by comparing a text with itself.
  const document = readFileSync(DOCUMENT, 'utf8');
  const introduction = introductionOf(document);
  assert.ok(introduction.length > 0, 'the introduction is found');
  const edited = document.replace('| Harmony 650 | 10 |', '| Harmony 650 | 12 |');
  assert.notEqual(edited, document, 'the document holds the row to edit');
  assert.notEqual(requirementsDocument(introductionOf(edited), PROOFS), edited);
  assert.equal(requirementsDocument(introductionOf(edited), PROOFS), document);
});

test('a document without its introduction markers is refused, rather than written without one', () => {
  assert.throws(() => introductionOf('# a title\n\nno markers\n'), /no <!-- introduction -->/);
});
