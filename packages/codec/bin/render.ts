/**
 * Draw a config's screens as PNG files, which is what checks the readers a test cannot see.
 *
 * ```
 * node packages/codec/bin/render.ts --config one_config --page 45        one page
 * node packages/codec/bin/render.ts --config one_config --pages 45,46    several
 * node packages/codec/bin/render.ts --config one_config --sheet          all of them, tiled
 * node packages/codec/bin/render.ts --config one_config --sheet --every 13 --columns 6
 * node packages/codec/bin/render.ts --config one_config --page 45 --undrawn
 * node packages/codec/bin/render.ts --file <path> --sheet                  a file no lab name covers, one we built
 * ```
 *
 * **`--sheet` is the one to reach for.** A config has 135 to 340 pages, and a corrupt decode is
 * something the eye finds in a grid of them in a second and a metric does not find at all: page
 * roughness ranks white text on black above anything actually broken, which was tried first. One image
 * of 24 pages is what says a whole config draws.
 *
 * `--undrawn` paints the pixels nothing drew in magenta instead of black, which is the only way to
 * see the difference between a screen the config deliberately leaves dark and a region no instruction
 * reached. Most pages of a Harmony One draw no background at all, so this is more of them than one
 * would guess. `--out` chooses the directory, and it defaults to the lab's `work/render`, because a
 * rendered screen is a picture of somebody's own equipment and this repository is public.
 *
 * The PNG encoding is `src/png.ts`, shared with the bench instrument, which serves the same rasters
 * over HTTP. Two encoders would be two things to keep right.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { LAB, load } from '@harmony/lab';
import { parse, rasterPng, renderPage, type RenderedPage } from '../src/index.ts';
import { UNDRAWN, contactSheetPng, modePages } from '../src/internal.ts';
import '../src/resources.node.ts';
import { commandLine } from '@harmony/lab/cli';

const cli = commandLine({
  usage: [
    'usage: node packages/codec/bin/render.ts (--config one_config | --file <path>) (--page 45 | --pages 45,46 | --sheet)',
    '         [--every 13] [--columns 6] [--undrawn] [--out <directory>]',
  ].join('\n'),
  values: ['file', 'config', 'out', 'every', 'columns', 'pages', 'page'],
  flags: ['undrawn', 'sheet'],
});

const file = cli.value('file');
const config = file === undefined ? cli.value('config') ?? 'one_config' : basename(file).replace(/\.[^.]*$/, '');
const undrawnVisible = cli.flag('undrawn');
const sheet = cli.flag('sheet');

if (LAB === undefined) {
  console.log('no lab directory, so there is nothing to render');
  process.exit(0);
}

const out = cli.value('out') ?? join(LAB, 'work', 'render');
mkdirSync(out, { recursive: true });

const blob = file === undefined ? load(config) : new Uint8Array(readFileSync(file));
if (blob === undefined) {
  console.error(`no config called ${config} in the lab`);
  process.exit(1);
}
const c = parse(blob);
const pages = modePages(c);

const every = Number(cli.value('every') ?? 1);
const columns = Number(cli.value('columns') ?? 6);

const chosen = ((): number[] => {
  if (sheet) return pages.map((_, index) => index).filter((index) => index % every === 0);
  const list = cli.value('pages');
  if (list !== undefined) return list.split(',').map(Number);
  return [Number(cli.value('page') ?? 0)];
})();

/**
 * Magenta where nothing drew, when asked for, and otherwise the black a dark screen really is.
 *
 * The sheet always shows it, since a tile whose edge cannot be seen is a tile whose edge cannot be
 * checked.
 */
const undrawn: [number, number, number] = undrawnVisible ? [255, 0, 255] : [0, 0, 0];

function write(name: string, rendered: RenderedPage): void {
  writeFileSync(join(out, name), rasterPng(rendered.raster, undrawn));
}

/** Every rendered page in one image, in a grid, with a border between them so edges are visible. */
function contactSheet(rendered: RenderedPage[]): void {
  const file = contactSheetPng(rendered.map((page) => page.raster), columns, [40, 0, 40]);
  if (file === undefined) return;
  const name = `${config}-sheet.png`;
  writeFileSync(join(out, name), file);
  console.log(`${name}  ${rendered.length} pages, ${columns} across`);
}

const sheeted: RenderedPage[] = [];
let drawn = 0;
for (const index of chosen) {
  const page = pages[index];
  if (page === undefined) {
    console.error(`no page ${index}, the config has ${pages.length}`);
    continue;
  }
  const rendered = renderPage(c, page);
  if (rendered === undefined) {
    console.error(`page ${index} did not render, which means the architecture has no known display`);
    continue;
  }
  drawn += 1;
  if (sheet) {
    sheeted.push(rendered);
    continue;
  }
  const name = `${config}-page${String(index).padStart(3, '0')}.png`;
  write(name, rendered);
  const dark = rendered.raster.pixels.reduce((n, value) => n + (value === UNDRAWN ? 1 : 0), 0);
  console.log(
    `${name}  ${rendered.raster.width}x${rendered.raster.height}  ` +
      `${rendered.pictures} pictures, ${rendered.strings} strings, ` +
      `${rendered.branches} branch(es), ${dark} pixels undrawn` +
      (rendered.picturesMissing + rendered.glyphsMissing > 0
        ? `, MISSING ${rendered.picturesMissing} picture(s) and ${rendered.glyphsMissing} glyph(s)`
        : ''),
  );
}
if (sheet) {
  contactSheet(sheeted);
  // The totals a per page line would have carried. `missing` is the number to watch: it is zero for
  // every container in the corpus, so anything else is a reader that stopped resolving something.
  const sum = (of: (page: RenderedPage) => number): number => sheeted.reduce((n, p) => n + of(p), 0);
  const missing = sum((p) => p.picturesMissing) + sum((p) => p.glyphsMissing);
  console.log(
    `${sum((p) => p.pictures)} pictures, ${sum((p) => p.strings)} strings, ` +
      `${sum((p) => p.branches)} branch(es), ${missing} missing`,
  );
}
console.log(`\n${drawn} page(s) in ${out}`);
