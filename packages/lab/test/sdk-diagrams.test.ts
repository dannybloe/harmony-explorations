/**
 * The four drawings of the SDK's overview page, `reference/sdk/diagrams/`,
 * are what the packages' sources make, `bin/sdk-diagrams.ts`.
 *
 * **What is held, and why not every SVG byte for byte.** graphviz does not
 * promise the same SVG from one version to the next, and the machines that run
 * this do not share one. So each DOT source is held to the generator exactly,
 * and each SVG to its DOT source by the digest the SVG records; where the
 * `dot` here is the version an SVG records, the SVG is drawn again and held
 * whole as well. A DOT source edited by hand, a source of the drawings changed
 * without them following, and an SVG left behind by its source all fail here,
 * naming the command that puts them right.
 *
 * **Its controls read the code another way than the generator does.** The
 * dependencies drawn are compared with each `package.json` read here; the
 * phases with the sync example's lists, read by a pattern rather than by the
 * compiler; and the endings with the states `SYNC_ENDINGS` names in the
 * source's text. The check itself is shown to find a DOT source changed by a
 * word, an SVG drawn from another source, and an SVG that is missing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT } from '../bin/api-reference.ts';
import {
  diagrams,
  digestOf,
  dotVersion,
  drawn,
  FOLDER,
  NOT_REACHED_YET,
  PACKAGES,
  PAGE,
  pageWithAlts,
  PHASE_LISTS,
  problemsWith,
  recordIn,
  run,
  SYNC_EXAMPLE,
} from '../bin/sdk-diagrams.ts';

function committed(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

test('every committed drawing is what the sources make', () => {
  assert.deepEqual(run(false), []);
});

test('the drawings are these four, each SVG drawn from its DOT source', () => {

  const names = diagrams().map((diagram) => diagram.name);

  assert.deepEqual(names, ['packages', 'life', 'shape', 'sync']);

  for (const name of names) {
    const svg = recordIn(committed(`${FOLDER}/${name}.svg`));
    const dot = committed(`${FOLDER}/${name}.dot`);

    assert.equal(svg?.digest, digestOf(dot), name);
  }

});

test('the check finds each kind of drift: DOT, SVG, missing, image text', () => {

  const expected = diagrams();
  const [first] = expected;
  const dotPath = `${FOLDER}/${first!.name}.dot`;
  const svgPath = `${FOLDER}/${first!.name}.svg`;
  const fix = 'run make sdk-diagrams-write';

  // The committed files with one of them read otherwise, as the check is
  // given them.
  const asIf = (changed: string, text: string | undefined) => {
    return (path: string): string | undefined => {
      return path === changed ? text : committed(path);
    };
  };

  const check = (files: (path: string) => string | undefined): string[] => {
    return problemsWith({
      expected,
      committed: files,
      version: undefined,
    });
  };

  // The baseline: the committed files pass, so each finding below is its
  // change's alone.
  assert.deepEqual(check(committed), []);

  const edited = committed(dotPath).replace('depends on', 'depends upon');
  const other = `sha256 ${'0'.repeat(64)}`;
  const redrawn = committed(svgPath).replace(/sha256 [0-9a-f]{64}/, other);
  const stale = committed(PAGE).replace('by name: base', 'by name: lab');

  assert.deepEqual(check(asIf(dotPath, edited)), [
    `${dotPath} differs from what the sources make: ${fix}`,
  ]);

  assert.deepEqual(check(asIf(svgPath, redrawn)), [
    `${svgPath} was drawn from another source: ${fix}`,
  ]);

  assert.deepEqual(check(asIf(svgPath, undefined)), [
    `${svgPath} is missing or records no source: ${fix}`,
  ]);

  assert.deepEqual(check(asIf(PAGE, stale)), [
    `${PAGE} has image texts the sources do not make: ${fix}`,
  ]);

});

test('the page shows each drawing once, with the text the sources make', () => {

  const page = committed(PAGE);
  const flat = page.replace(/\s+/g, ' ');

  for (const diagram of diagrams()) {
    const link = `](diagrams/${diagram.name}.svg)`;

    assert.equal(page.split(link).length, 2, diagram.name);
    assert.ok(flat.includes(`![${diagram.alt}${link}`), diagram.name);
  }

  // The control: a page that shows a drawing twice is refused rather than
  // filled twice.
  const twice = `${page}\n![again](diagrams/sync.svg)\n`;

  assert.throws(() => pageWithAlts(twice, diagrams()), /sync\.svg 2 times/);

});

test('one graphviz draws the same SVG twice from the same source', {
  skip: dotVersion() === undefined ? 'graphviz is not installed' : false,
}, () => {

  // What lets the check hold a whole SVG where the version matches.
  const version = dotVersion()!;
  const [first] = diagrams();

  assert.equal(drawn(first!, version), drawn(first!, version));

});

test('the packages drawing shows exactly the stated dependencies', () => {

  const dot = committed(`${FOLDER}/packages.dot`);
  const edge = /^ {2}(\w+) -> "([\w-]+)" \[label=" depends on"\];$/gm;

  const drawnEdges = [...dot.matchAll(edge)]
    .map((match) => `${match[1]} -> ${match[2]}`)
    .sort();

  // Every dependency of the five on each other and on node-hid, read off
  // each package.json here.
  const stated: string[] = [];

  for (const folder of PACKAGES) {
    const file = committed(`packages/${folder}/package.json`);
    const manifest: { dependencies?: Record<string, string> } = JSON.parse(file);
    const names = Object.keys(manifest.dependencies ?? {});

    for (const name of names) {
      if (name.startsWith('@freeharmony-sdk/') || name === 'node-hid') {
        stated.push(`${folder} -> ${name.replace('@freeharmony-sdk/', '')}`);
      }
    }
  }

  assert.deepEqual(drawnEdges, stated.sort());

  // The control: an edge the drawing must show is among them, so the
  // pattern above read the edges at all.
  assert.ok(drawnEdges.includes('remote -> usb'));

});

test('the sync drawing chains the example\'s phases and every state', () => {

  const example = committed(SYNC_EXAMPLE);
  const dot = committed(`${FOLDER}/sync.dot`);

  for (const [kind, constant] of Object.entries(PHASE_LISTS)) {
    const list = new RegExp(`const ${constant} = \\[([^\\]]*)\\]`).exec(example);

    assert.ok(list !== null, `${SYNC_EXAMPLE} has no ${constant}`);

    const chain = [...list[1]!.matchAll(/'([\w-]+)'/g)]
      .map((match) => `${kind}_${match[1]!.replace(/-/g, '_')}`)
      .join(' -> ');

    assert.ok(dot.includes(chain), kind);
  }

  // Every state an ending names, read off the source's text.
  const source = committed('packages/remote/src/sync.ts');
  const start = source.indexOf('export const SYNC_ENDINGS');
  const end = source.indexOf('export type SyncEnding');
  const endings = source.slice(start, end);
  const states = [...endings.matchAll(/state: '([\w-]+)'/g)];

  assert.equal(states.length, 7);

  for (const [, state] of states) {
    assert.ok(dot.includes(`>${state}</FONT>`), state);
  }

  // Every ending marked as reached by no model yet is one of them, and is
  // marked so in the drawing.
  const named = states.map((match) => match[1]);

  for (const state of NOT_REACHED_YET) {
    assert.ok(named.includes(state), state);

    const row = new RegExp(`>${state}</FONT>[^\\n]*?not reached by any model yet`);

    assert.ok(row.test(dot), state);
  }

});
