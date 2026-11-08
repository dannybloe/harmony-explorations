/**
 * How a logical name becomes a path, which nothing tested because nothing ever asked twice.
 *
 * Two defects, both found by review rather than by a failure, both in `find`: it took the first
 * match in traversal order with no uniqueness check, and it called `statSync` outside the `try` that
 * exists for exactly the case that call throws on. `docs/findings.md` section 139.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

import { IMAGES, LAB, imagePath, imagePaths, skipWithoutLab } from '../src/index.ts';

test('a name that resolves twice resolves to the curated copy, not the scratch one', skipWithoutLab(), () => {
  // The ambiguity is real and is not being removed: the lab is ours and holds working copies.
  // What is fixed is that the choice is now a stated rule rather than the filesystem's traversal
  // order. Both pairs are byte identical today, which is why nothing was wrong and why nothing would
  // have said so if one had been edited.
  const ambiguous = Object.keys(IMAGES).filter((name) => imagePaths(name).length > 1);
  for (const name of ambiguous) {
    const chosen = imagePath(name) as string;
    const relative = chosen.slice((LAB as string).length + 1);
    assert.notEqual(relative.split(sep)[0], 'work', `${name} resolved to the scratch copy`);
    assert.equal(chosen, imagePaths(name)[0], `${name}: imagePath disagrees with imagePaths`);
  }
  // Every present name resolves to something, and nothing resolves to more than the lab holds.
  for (const name of Object.keys(IMAGES)) {
    const all = imagePaths(name);
    const one = imagePath(name);
    assert.equal(all.length === 0, one === undefined, name);
  }
});

test('a dangling symlink named as a lab image is skipped, not thrown out of', async () => {
  // `skipUnless` is what a test declares up front, so a throw from `imagePath` does not skip a test,
  // it takes the whole file with it. The comment on the catch below the offending call already said
  // a dangling symlink is not worth failing a run over, three lines under the call that did.
  const root = mkdtempSync(join(tmpdir(), 'harmony-lab-'));
  try {
    const filename = IMAGES['h525_config'] as string;
    mkdirSync(join(root, 'dumps'), { recursive: true });
    symlinkSync(join(root, 'nothing-here'), join(root, 'dumps', filename));
    // The real file sits deeper, so the walk has to survive the broken one to reach it.
    mkdirSync(join(root, 'dumps', 'real'), { recursive: true });
    writeFileSync(join(root, 'dumps', 'real', filename), 'not a container');
    const previous = process.env['HARMONY_LAB'];
    process.env['HARMONY_LAB'] = root;
    try {
      // A fresh module instance, because `LAB` and the cache are read once at import.
      const url = new URL('../src/index.ts', import.meta.url).href + `?dangling=${Date.now()}`;
      const fresh: typeof import('../src/index.ts') = await import(url);
      const found = fresh.imagePath('h525_config');
      assert.notEqual(found, undefined, 'the walk stopped at the broken link');
      assert.ok((found as string).endsWith(join('real', filename)), found);
    } finally {
      if (previous === undefined) delete process.env['HARMONY_LAB'];
      else process.env['HARMONY_LAB'] = previous;
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the ranking rule decides, not the alphabet or the traversal order', async () => {
  // **The rule earns nothing on the real lab**, and that is worth knowing rather than assuming: both
  // ambiguous names there also sort correctly by path alone, so a control that removed the scratch
  // and depth terms still passed. The case is constructed here so the rule has something to do.
  const root = mkdtempSync(join(tmpdir(), 'harmony-rank-'));
  try {
    const filename = IMAGES['h525_config'] as string;
    // `work` sorts before `zcurated`, so an alphabet-only rule takes the scratch copy.
    for (const dir of ['work', join('zcurated', 'derived')]) {
      mkdirSync(join(root, dir), { recursive: true });
      writeFileSync(join(root, dir, filename), dir);
    }
    const previous = process.env['HARMONY_LAB'];
    process.env['HARMONY_LAB'] = root;
    try {
      const url = new URL('../src/index.ts', import.meta.url).href + `?rank=${Date.now()}`;
      const fresh: typeof import('../src/index.ts') = await import(url);
      const all = fresh.imagePaths('h525_config');
      assert.equal(all.length, 2);
      const chosen = fresh.imagePath('h525_config') as string;
      assert.ok(chosen.includes('zcurated'), chosen);
      assert.ok((all[1] as string).includes(`${sep}work${sep}`), 'and the scratch copy is still listed');
    } finally {
      if (previous === undefined) delete process.env['HARMONY_LAB'];
      else process.env['HARMONY_LAB'] = previous;
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the walk follows no linked folder out of the lab and ends on a loop of links', async () => {
  // A scratch checkout in the lab links its `node_modules` to this repository's, and once two packages
  // depended on each other those links made a loop the walk followed without end; see `labIndex`. Here
  // a lab holds one image of its own, a link to a folder outside it holding another, and a link from a
  // folder back to its parent. The control is the first assertion: the image inside is found, so the
  // walk ran; the outside one is not, so the link out was not followed; and the call returns at all.
  const root = mkdtempSync(join(tmpdir(), 'harmony-lab-'));
  const outside = mkdtempSync(join(tmpdir(), 'harmony-outside-'));
  try {
    const own = IMAGES['h525_config'] as string;
    const elsewhere = IMAGES['h650_config_region'] as string;
    mkdirSync(join(root, 'dumps', 'deep'), { recursive: true });
    writeFileSync(join(root, 'dumps', 'deep', own), 'inside');
    writeFileSync(join(outside, elsewhere), 'outside');
    symlinkSync(outside, join(root, 'dumps', 'linked-out'));
    symlinkSync(join(root, 'dumps'), join(root, 'dumps', 'deep', 'back-up'));
    const previous = process.env['HARMONY_LAB'];
    process.env['HARMONY_LAB'] = root;
    try {
      const url = new URL('../src/index.ts', import.meta.url).href + `?loop=${Date.now()}`;
      const fresh: typeof import('../src/index.ts') = await import(url);
      const found = fresh.imagePaths('h525_config');
      assert.equal(found.length, 1, found.join(', '));
      assert.ok(found[0]!.endsWith(join('deep', own)), found[0]);
      assert.deepEqual(fresh.imagePaths('h650_config_region'), [], 'a file outside the lab was found through a link');
    } finally {
      if (previous === undefined) delete process.env['HARMONY_LAB'];
      else process.env['HARMONY_LAB'] = previous;
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
