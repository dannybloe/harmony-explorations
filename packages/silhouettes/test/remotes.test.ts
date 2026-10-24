/**
 * The per remote reference agrees with the code it quotes.
 *
 * `reference/remotes/` and `reference/architectures/` are hand written, and the facts in them that also
 * live in code sit inside generated blocks that `bin/remotes.ts` owns. This is what makes that more than
 * a convention: a change to the skin table, a drawing's scan codes, the screen raster or a write list
 * that leaves a document behind fails here, with the file and the block named. **No lab needed**, since
 * both sides are in the repository.
 */
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { ARCHITECTURES, MODEL_FILES, REMOTES, expectedBlocks, regenerate, run } from '../bin/remotes.ts';
import { MODELS } from '../src/index.ts';

test('every generated block in the remote reference matches the code it is generated from', () => {
  assert.deepEqual(run(false), []);
});

test('the check names a block that has drifted, so the test above can fail', () => {
  // The control. A block whose body differs from what the code says has to be reported, or a passing
  // run above would say nothing.
  const [file, blocks] = [...expectedBlocks()][0] ?? assert.fail('no generated blocks at all');
  const [name] = [...blocks.keys()];
  const drifted = `before\n<!-- generated:${name} -->\nan old copy\n<!-- /generated -->\nafter\n`;
  const others = [...blocks.keys()].filter((n) => n !== name)
    .map((n) => `<!-- generated:${n} -->\n${blocks.get(n)}\n<!-- /generated -->\n`).join('');
  const { problems, text } = regenerate(file, drifted + others, blocks);
  assert.deepEqual(problems, [`${file}: block ${name} differs from the code`]);
  assert.ok(text.startsWith('before\n') && text.includes('after\n'), 'text outside the markers is kept');
});

test('a marker nothing generates and a block a file lacks are both reported', () => {
  const blocks = new Map([['wanted', 'body']]);
  const { problems } = regenerate('x.md', '<!-- generated:stray -->\nold\n<!-- /generated -->\n', blocks);
  assert.deepEqual(problems, ['x.md: a block named stray that nothing generates',
    'x.md: block wanted is missing, add the two markers where it belongs']);
});

test('a model folder and its drawing serve the same skins', () => {
  // Two lists of one population, and nothing compared them until 9 October 2026: the Harmony 300's
  // folder named 78 and 79 while its drawing served 78 alone, so a drawing looked up by the skin a
  // bench unit states about itself, 79, section 264, found nothing. A folder whose drawing is a
  // sibling's, the 650's taking the 600's shapes, still has a drawing of its own with its own skins.
  for (const r of REMOTES) {
    if (r.drawing === undefined) continue; // the next test holds which folders may have none
    const drawing = MODELS[r.drawing] ?? assert.fail(`${r.folder}: no drawing ${r.drawing}`);
    assert.deepEqual([...drawing.skins].sort((a, b) => a - b), [...r.skins].sort((a, b) => a - b), r.folder);
  }
  assert.deepEqual(MODELS.h300!.skins, [78, 79], 'the Harmony 300 drawing serves both regional skins');
});

test('only the Harmony 885 and 890 folders are without a drawing, so a drawn model cannot lose its drawing', () => {
  // Plan 009 step 3.5 made `drawing` optional so that the two models known only from contributed
  // configurations could have their full folders before anybody draws them. An optional field is also a
  // way for every other row to drop its drawing without a failure anywhere, since the keys and display
  // blocks would simply say none exists. So the folders allowed to lack one are named here, exactly: a
  // drawing added for either shrinks this list, and any other row losing its drawing fails.
  const undrawn = REMOTES.filter((r) => r.drawing === undefined).map((r) => r.folder).sort();
  assert.deepEqual(undrawn, ['harmony-885', 'harmony-890']);
  for (const r of REMOTES) {
    if (r.drawing !== undefined) assert.ok(MODELS[r.drawing] !== undefined, `${r.folder}: no drawing ${r.drawing}`);
  }
});

test('every model and architecture folder holds exactly the files its row declares', () => {
  // Plan 009 section 5. This held the model folders to one list of ten and looked at no architecture
  // folder at all, so a folder gaining `compiler.md` or a thin folder of three files had nowhere to say
  // so. Each row states its files now, a model row only where it differs from the ten, and both
  // directions fail: a file the row does not name, and a file the row names that is not there.
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const sorted = (names: readonly string[]): string[] => [...names].sort();
  for (const r of REMOTES) {
    const dir = join(repo, 'reference', 'remotes', r.folder);
    assert.deepEqual(readdirSync(dir).sort(), sorted(r.files ?? MODEL_FILES), `reference/remotes/${r.folder}`);
  }
  for (const a of ARCHITECTURES) {
    const dir = join(repo, 'reference', 'architectures', a.folder);
    assert.deepEqual(readdirSync(dir).sort(), sorted(a.files), `reference/architectures/${a.folder}`);
  }
});

test('every folder under reference/remotes and reference/architectures has a row', () => {
  // The other half of the test above, which only visits folders that have a row: a folder added without
  // one would be checked by nothing, its shape and its generated blocks both.
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const folders = (under: string): string[] => readdirSync(join(repo, 'reference', under), { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name).sort();
  assert.deepEqual(folders('remotes'), REMOTES.map((r) => r.folder).sort());
  assert.deepEqual(folders('architectures'), ARCHITECTURES.map((a) => a.folder).sort());
});
