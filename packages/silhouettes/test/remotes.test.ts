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

test('a model folder and its drawings serve the same skins, and every drawing is a folder\'s', () => {
  // Two lists of one population, and nothing compared them until 9 October 2026: the Harmony 300's
  // folder named 78 and 79 while its drawing served 78 alone, so a drawing looked up by the skin a
  // bench unit states about itself, 79, section 264, found nothing. A folder whose drawing is a
  // sibling's, the 650's taking the 600's shapes, still has a drawing of its own with its own skins.
  // A model with two printings, the Harmony 300's, has a drawing per printing, and the folder's skins are
  // theirs together, each skin served by exactly one of them.
  for (const r of REMOTES) {
    if (r.drawing === undefined) continue; // the next test holds which folders may have none
    const served = [r.drawing, ...(r.printings ?? [])].flatMap((id) =>
      (MODELS[id] ?? assert.fail(`${r.folder}: no drawing ${id}`)).skins);
    // A skin whose face is not the one drawn is named as undrawn rather than dropped from the folder, as the
    // Harmony 880, skin 15, was in the 885's folder until its drawing landed. A skin may not be both served
    // and undrawn.
    const undrawn = r.undrawn ?? [];
    assert.deepEqual(served.filter((s) => undrawn.includes(s)), [], `${r.folder}: a skin served and undrawn`);
    assert.deepEqual([...served, ...undrawn].sort((a, b) => a - b), [...r.skins].sort((a, b) => a - b), r.folder);
  }
  // The Harmony 880's skin 15 was undrawn until its face was drawn as a printing of the 885's folder. The
  // Harmony 890 and 895, skins 19 and 23, are undrawn since their folder was given the 890 Pro's drawing: the folder describes all three, and only the Pro's face is drawn.
  assert.deepEqual(REMOTES.filter((r) => r.undrawn !== undefined).map((r) => [r.folder, r.undrawn]),
    [['harmony-890', [19, 23]]], 'every skin a folder describes is served by one of its drawings, or named undrawn');
  assert.deepEqual(MODELS.h885!.skins, [17], 'the Harmony 885 drawing serves skin 17');
  assert.deepEqual(MODELS.h880!.skins, [15], 'and the Harmony 880, its regional twin, has a drawing of its own');
  assert.deepEqual(MODELS.h300!.skins, [78], 'the Harmony 300 drawing serves the US skin');
  assert.deepEqual(MODELS.h300eu!.skins, [79], 'and its European printing has a drawing of its own');
  assert.deepEqual(MODELS.h880pro!.skins, [39], 'the Harmony 880 Pro, a printing of the 885\'s shapes, serves skin 39');
  assert.deepEqual(MODELS.h890pro!.skins, [40], 'the Harmony 890 Pro serves skin 40');
  assert.deepEqual(MODELS.h720!.skins, [44], 'the Harmony 720 serves skin 44 and not the 785\'s 45, whose face has teletext keys');
  assert.deepEqual(MODELS.h785!.skins, [45], 'and the Harmony 785 has a drawing of its own');
  // Every drawing is some folder's drawing or printing, so a printing cannot be drawn and described nowhere.
  const described = REMOTES.flatMap((r) => [...(r.drawing === undefined ? [] : [r.drawing]), ...(r.printings ?? [])]);
  assert.deepEqual(Object.keys(MODELS).filter((id) => !described.includes(id)), []);
});

test('no model folder is without a drawing, so a drawn model cannot lose its drawing', () => {
  // Plan 009 step 3.5 made `drawing` optional so that the two models known only from contributed
  // configurations could have their full folders before anybody draws them. An optional field is also a
  // way for every other row to drop its drawing without a failure anywhere, since the keys and display
  // blocks would simply say none exists. So the folders allowed to lack one are named here, exactly: a
  // drawing added for either shrinks this list, and any other row losing its drawing fails.
  const undrawn = REMOTES.filter((r) => r.drawing === undefined).map((r) => r.folder).sort();
  // The Harmony 885 left this list when its drawing landed, and the Harmony 890 when the 890 Pro's did. This
  // test said only the Harmony 890 folder was without one until then. The Harmony 785 joined it with its folder,
  // read off two remotes before anybody drew its face, and left it when `h785.ts` landed.
  assert.deepEqual(undrawn, []);
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
