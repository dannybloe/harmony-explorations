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

import { REMOTES, expectedBlocks, regenerate, run } from '../bin/remotes.ts';

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

test('every model folder has the same ten files', () => {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const ten = ['README.md', 'behaviour.md', 'display.md', 'features.md', 'firmware.md', 'hardware.md',
    'keys.md', 'memory.md', 'misc.md', 'usb.md'];
  for (const r of REMOTES) {
    assert.deepEqual(readdirSync(join(repo, 'reference', 'remotes', r.folder)).sort(), ten, r.folder);
  }
});
