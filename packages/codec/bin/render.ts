/**
 * Draw a config's screens as PNG files, which is what checks the readers a test cannot see.
 *
 * ```
 * node packages/codec/bin/render.ts --config one_config --page 45        one page
 * node packages/codec/bin/render.ts --config one_config --pages 45,46    several
 * node packages/codec/bin/render.ts --config one_config --sheet          every page, one strip each
 * node packages/codec/bin/render.ts --config one_config --page 45 --undrawn
 * ```
 *
 * `--undrawn` paints the pixels nothing drew in magenta instead of black, which is the only way to
 * see the difference between a screen the config deliberately leaves dark and a region no instruction
 * reached. `--out` chooses the directory, and it defaults to the lab's `work/render`, because a
 * rendered screen is a picture of somebody's own equipment and this repository is public.
 *
 * The PNG writer is here rather than in `src/` on purpose: the raster is a reading of the format and
 * belongs to the codec, and the file format is presentation.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { LAB, load } from '@harmony/lab';
import {
  UNDRAWN,
  modePages,
  parse,
  renderPage,
  type RenderedPage,
} from '../src/index.ts';

const argument = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};

const config = argument('config') ?? 'one_config';
const undrawnVisible = process.argv.includes('--undrawn');
const sheet = process.argv.includes('--sheet');

if (LAB === undefined) {
  console.log('no lab directory, so there is nothing to render');
  process.exit(0);
}

const out = argument('out') ?? join(LAB, 'work', 'render');
mkdirSync(out, { recursive: true });

const blob = load(config);
if (blob === undefined) {
  console.error(`no config called ${config} in the lab`);
  process.exit(1);
}
const c = parse(blob);
const pages = modePages(c);

/** CRC32, the PNG variant, computed rather than tabulated since it is used a handful of times. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(kind: string, body: Uint8Array): Uint8Array {
  const name = new TextEncoder().encode(kind);
  const framed = new Uint8Array(name.length + body.length);
  framed.set(name);
  framed.set(body, name.length);
  const out = new Uint8Array(8 + body.length + 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, body.length);
  out.set(framed, 4);
  view.setUint32(out.length - 4, crc32(framed));
  return out;
}

/** A truecolour PNG from RGB rows, which is all this needs: no palette, no interlacing, no alpha. */
function png(width: number, height: number, rgb: Uint8Array): Uint8Array {
  const raw = new Uint8Array(height * (1 + width * 3));
  for (let row = 0; row < height; row += 1) {
    raw[row * (1 + width * 3)] = 0;
    raw.set(rgb.subarray(row * width * 3, (row + 1) * width * 3), row * (1 + width * 3) + 1);
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8;
  header[9] = 2;
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', new Uint8Array(deflateSync(raw))),
    chunk('IEND', new Uint8Array()),
  ];
  const size = parts.reduce((total, part) => total + part.length, 0);
  const file = new Uint8Array(size);
  let at = 0;
  for (const part of parts) {
    file.set(part, at);
    at += part.length;
  }
  return file;
}

/** RGB565 to eight bits a channel, with the low bits replicated so white stays white. */
function rgb(value: number): [number, number, number] {
  if (value === UNDRAWN) return undrawnVisible ? [255, 0, 255] : [0, 0, 0];
  const red = (value >> 11) & 0x1f;
  const green = (value >> 5) & 0x3f;
  const blue = value & 0x1f;
  return [(red << 3) | (red >> 2), (green << 2) | (green >> 4), (blue << 3) | (blue >> 2)];
}

function write(name: string, rendered: RenderedPage): void {
  const { raster } = rendered;
  const bytes = new Uint8Array(raster.width * raster.height * 3);
  raster.pixels.forEach((value, at) => {
    const [red, green, blue] = rgb(value);
    bytes[at * 3] = red;
    bytes[at * 3 + 1] = green;
    bytes[at * 3 + 2] = blue;
  });
  writeFileSync(join(out, name), png(raster.width, raster.height, bytes));
}

const chosen = ((): number[] => {
  if (sheet) return pages.map((_, index) => index);
  const list = argument('pages');
  if (list !== undefined) return list.split(',').map(Number);
  return [Number(argument('page') ?? 0)];
})();

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
  const name = `${config}-page${String(index).padStart(3, '0')}.png`;
  write(name, rendered);
  drawn += 1;
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
console.log(`\n${drawn} page(s) in ${out}`);
