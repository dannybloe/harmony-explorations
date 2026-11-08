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
 *
 * **Two later uses, and still one encoder.** A Harmony Touch is handed its channel logos as PNG files, and the
 * ones Logitech's service delivered in the recorded syncs are eight bits a channel with alpha, colour type 6,
 * so `encodePng` writes that too when asked for four channels, `todo-touch.md` 8.3. And the answerer of a sync
 * has to know a picture it is about to hand the remote is one the remote's screens can draw, so `readPng`
 * reads a file back: its header and every chunk checked, and its image data inflated and measured, the reader
 * beside the writer as `CLAUDE.md` asks of every encoding.
 *
 * **The compression is two halves since `todo.md` 7.3.5**, so the module loads where there is no Node. Reading
 * inflates with our own `inflateZlib`, beside `deflate.ts`'s writer, since every decoder gives the same bytes;
 * writing deflates with the `deflate` the codec's loader supplies, `resources.ts`, Node's zlib on the Node entry,
 * because that is what every PNG here was written with and a Harmony Touch background of ours is named by the hash
 * of its bytes.
 */
import { concatBytes, crc32 } from '../support/bytes.ts';
import { inflateZlib } from '../support/deflate.ts';
import { UNDRAWN, type Raster } from './render.ts';
import { resource } from '../support/resources.ts';

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

/**
 * Eight bits a channel to RGB565, each rounded to its 5, 6 and 5 bits: `rgb565`'s inverse, beside it so the
 * two scalings are read together. A round trip does not return the input, since the panel holds fewer
 * levels: `rgb(184 32 55)` comes back as `rgb(181 32 58)`.
 */
export function rgbTo565(red: number, green: number, blue: number): number {
  for (const channel of [red, green, blue]) {
    if (!Number.isInteger(channel) || channel < 0 || channel > 255) throw new RangeError(`${channel} is not a colour channel`);
  }
  return (Math.round((red * 31) / 255) << 11) | (Math.round((green * 63) / 255) << 5) | Math.round((blue * 31) / 255);
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

/**
 * A truecolour PNG from RGB rows, or from RGBA rows when `channels` is 4, which is colour type 6. Each row is
 * prefixed with filter type 0, which is no filter.
 */
export function encodePng(width: number, height: number, rgb: Uint8Array, channels: 3 | 4 = 3): Uint8Array {
  const stride = width * channels;
  if (rgb.length !== height * stride) throw new RangeError(`${rgb.length} bytes are not ${height} rows of ${stride}`);
  const raw = new Uint8Array(height * (1 + stride));
  for (let row = 0; row < height; row += 1) {
    raw[row * (1 + stride)] = 0;
    raw.set(rgb.subarray(row * stride, (row + 1) * stride), row * (1 + stride) + 1);
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8;
  header[9] = channels === 4 ? 6 : 2;
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', resource('deflate')(raw)),
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

/** What `readPng` finds in a file: its header's fields and its chunks' kinds in order. */
export interface PngHeader {
  readonly width: number;
  readonly height: number;
  readonly bitDepth: number;
  /** 0 grey, 2 truecolour, 3 palette, 4 grey with alpha, 6 truecolour with alpha. */
  readonly colourType: number;
  readonly interlace: number;
  readonly chunks: readonly string[];
}

/** The PNG signature, eight bytes. */
const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Samples per pixel by colour type, PNG section 11.2.2. */
const SAMPLES: Readonly<Record<number, number>> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/**
 * A PNG file read back far enough to say it decodes: the signature, every chunk's length and CRC, `IHDR` first
 * and `IEND` last with nothing after it, the `IDAT` chunks together, and their data inflated to exactly one
 * filter byte and one row of samples per row, each filter byte one of the five PNG defines. A file that fails
 * any of it throws a `RangeError` saying which. **Interlaced images are read only as far as the header**, since
 * their data is seven passes of other sizes; a caller that refuses them refuses them by the header's field.
 * The pixels are not unfiltered: nothing here needs them, and a file whose rows inflate to the right length
 * with valid filter bytes is one a decoder can unfilter.
 */
export function readPng(bytes: Uint8Array): PngHeader {
  if (bytes.length < SIGNATURE.length || SIGNATURE.some((b, i) => bytes[i] !== b)) throw new RangeError('not a PNG: the signature is wrong');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: string[] = [];
  const data: Uint8Array[] = [];
  let header: Omit<PngHeader, 'chunks'> | undefined;
  let at = SIGNATURE.length;
  let ended = false;
  while (at < bytes.length) {
    if (ended) throw new RangeError('bytes follow the IEND chunk');
    if (at + 12 > bytes.length) throw new RangeError('a chunk is cut short');
    const length = view.getUint32(at);
    if (at + 12 + length > bytes.length) throw new RangeError('a chunk runs past the end of the file');
    const kind = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (!/^[A-Za-z]{4}$/.test(kind)) throw new RangeError('a chunk has no name of four letters');
    if (crc32(bytes.subarray(at + 4, at + 8 + length)) !== view.getUint32(at + 8 + length)) throw new RangeError(`the ${kind} chunk's CRC is wrong`);
    const body = bytes.subarray(at + 8, at + 8 + length);
    if (chunks.length === 0 && kind !== 'IHDR') throw new RangeError('the first chunk is not IHDR');
    if (kind === 'IHDR') {
      if (chunks.length > 0 || length !== 13) throw new RangeError('IHDR is not one chunk of 13 bytes, first');
      const h = new DataView(body.buffer, body.byteOffset, 13);
      header = { width: h.getUint32(0), height: h.getUint32(4), bitDepth: body[8]!, colourType: body[9]!, interlace: body[12]! };
    }
    if (kind === 'IDAT') {
      if (chunks.length > 0 && chunks.at(-1) !== 'IDAT' && chunks.includes('IDAT')) throw new RangeError('the IDAT chunks are not together');
      data.push(body);
    }
    if (kind === 'IEND') ended = true;
    chunks.push(kind);
    at += 12 + length;
  }
  if (header === undefined || !ended) throw new RangeError('the file has no IHDR or no IEND');
  const samples = SAMPLES[header.colourType];
  if (samples === undefined) throw new RangeError(`colour type ${header.colourType} is not one PNG defines`);
  if (header.width === 0 || header.height === 0) throw new RangeError('the image has no pixels');
  if (data.length === 0) throw new RangeError('the file has no image data');
  if (header.interlace !== 0) return { ...header, chunks };
  let raw: Uint8Array;
  try {
    raw = inflateZlib(concatBytes(data));
  } catch {
    throw new RangeError('the image data does not inflate');
  }
  const stride = 1 + Math.ceil((header.width * samples * header.bitDepth) / 8);
  if (raw.length !== header.height * stride) throw new RangeError(`the image data inflates to ${raw.length} bytes where ${header.height} rows take ${header.height * stride}`);
  for (let row = 0; row < header.height; row += 1) {
    if (raw[row * stride]! > 4) throw new RangeError(`row ${row} names filter ${raw[row * stride]}, which PNG does not define`);
  }
  return { ...header, chunks };
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
  // The grid is laid out from the first raster's size and each tile was then copied at its **own**
  // size, so a wider one wrote across the tile beside it and a taller one past the end of the
  // buffer. Only reachable by putting two architectures in one sheet, which no caller does today,
  // and the failure is a silently wrong picture rather than an error. Section 139.
  if (rasters.some((r) => r.width !== width || r.height !== height)) return undefined;
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
