/**
 * A raster as a PNG, so a screen can be shown rather than described.
 *
 * **Here and in one place only.** The bench instrument serves rendered screens over HTTP and
 * `bin/render.ts` writes them to disk, and two encoders would be the state `CLAUDE.md` warns about
 * where both copies are right until one is edited. It is deliberately the smallest thing that a
 * browser and an image viewer both accept: truecolour, eight bits a channel, no palette, no alpha, no
 * interlacing, one `IDAT`.
 *
 * Nothing here is a reading of the Harmony format. `render.ts` is the reading; this is how a person
 * looks at it.
 */
import { deflateSync } from 'node:zlib';

import { UNDRAWN, type Raster } from './render.ts';

/** CRC32, the PNG variant. Computed rather than tabulated: it runs four times per image. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** One chunk: length, kind, body, and the CRC over the kind and the body together. */
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

/** RGB565 to eight bits a channel, low bits replicated so that `0xffff` comes out as white. */
export function rgb565(value: number): [number, number, number] {
  const red = (value >> 11) & 0x1f;
  const green = (value >> 5) & 0x3f;
  const blue = value & 0x1f;
  return [(red << 3) | (red >> 2), (green << 2) | (green >> 4), (blue << 3) | (blue >> 2)];
}

/**
 * A raster as RGB bytes, row major.
 *
 * `undrawn` is what a pixel no instruction reached becomes, and the choice matters: black is what the
 * screen looks like, and magenta is what says the difference between a screen a config deliberately
 * leaves dark and a region nothing drew. Most pages of a Harmony One draw no background at all.
 */
export function rasterBytes(raster: Raster, undrawn: [number, number, number] = [0, 0, 0]): Uint8Array {
  const bytes = new Uint8Array(raster.width * raster.height * 3);
  raster.pixels.forEach((value, at) => {
    const [red, green, blue] = value === UNDRAWN ? undrawn : rgb565(value);
    bytes[at * 3] = red;
    bytes[at * 3 + 1] = green;
    bytes[at * 3 + 2] = blue;
  });
  return bytes;
}

/** A truecolour PNG from RGB rows. Each row is prefixed with filter type 0, which is no filter. */
export function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
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

/** A whole raster as a PNG, which is the two calls above and the pair a caller almost always wants. */
export function rasterPng(raster: Raster, undrawn?: [number, number, number]): Uint8Array {
  return encodePng(raster.width, raster.height, rasterBytes(raster, undrawn));
}

/**
 * Several rasters tiled into one PNG, with a border between them.
 *
 * **This is what says a whole config draws.** A config has 135 to 340 pages and a broken decode is
 * something the eye finds in a grid of two dozen of them at once. Scoring pages by how rough they are
 * was tried first and finds contrast rather than corruption: the roughest pages of a Harmony One are
 * white text on black.
 */
export function contactSheetPng(
  rasters: readonly Raster[],
  columns = 6,
  undrawn?: [number, number, number],
): Uint8Array | undefined {
  const first = rasters[0];
  if (first === undefined) return undefined;
  const { width, height } = first;
  const gap = 4;
  const rows = Math.ceil(rasters.length / columns);
  const total = { width: columns * (width + gap) + gap, height: rows * (height + gap) + gap };
  const bytes = new Uint8Array(total.width * total.height * 3);
  bytes.fill(0x5a);
  rasters.forEach((raster, at) => {
    const left = gap + (at % columns) * (width + gap);
    const top = gap + Math.floor(at / columns) * (height + gap);
    const tile = rasterBytes(raster, undrawn);
    for (let row = 0; row < raster.height; row += 1) {
      const from = row * raster.width * 3;
      bytes.set(tile.subarray(from, from + raster.width * 3),
        ((top + row) * total.width + left) * 3);
    }
  });
  return encodePng(total.width, total.height, bytes);
}
