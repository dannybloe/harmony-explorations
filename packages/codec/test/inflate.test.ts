/**
 * Our inflate, `inflateRaw` and `inflateZlib` in `deflate.ts`, gives `node:zlib`'s answer, `todo.md` 7.3.5. It replaced
 * Node's in the two readers that inflated, a PNG's image data, `readPng`, and the metadata archive a Harmony 300, 350,
 * 890 or 895 configuration carries, `metadata.ts`, so that the codec's main entry loads where there is no Node.
 *
 * **Why an inflater can be held to Node's exactly, where `deflate.ts` could not be held to Node's deflate.** A stream
 * decodes to one sequence of bytes whoever decodes it, so the only room for two inflaters to differ is in what each
 * refuses, and that room matters here: `metadata.ts` tries candidate offsets on a Harmony 890's container and takes a
 * refusal as "not here", so an inflater that accepted a stream zlib refuses, or refused one it accepts, would change
 * which archive is found. So every check below compares the outcome, the same bytes or a refusal from both.
 *
 * **The populations**, each counted exactly:
 *
 * * streams zlib writes, at every level and strategy, of random, repetitive and text like inputs, and the same streams
 *   damaged at random: a bit flipped, cut short, bytes appended, bytes overwritten; and random bytes as streams;
 * * every PNG file in the lab, its `IDAT` chunks joined as `readPng` joins them;
 * * every ZIP entry named `MetaData.xml` in every file the lab's table names, found the way `metadata.ts` finds one,
 *   and its text decoded as the reader decodes it, with `Buffer` before and with `TextDecoder` now.
 *
 * Measured once beyond these, on 8 November 2026, by a script that is not kept: every regular file in the lab under
 * 64 MiB outside git's own, 30177 files, the EzHex ones decoded as well, scanned for every PNG signature and every ZIP
 * local header. 9276 PNGs, inside other files as well as on their own, every one inflated to the same bytes; 185176
 * ZIP entries found the way `metadata.ts` finds one, 61612 inflated to the same bytes by both and 123564 refused by
 * both, none differing; 63 of them `MetaData.xml`, every one the same text.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { constants, deflateRawSync, deflateSync, inflateRawSync, inflateSync } from 'node:zlib';
import { IMAGES, LAB, imagePath, skipWithoutLab } from '@harmony/lab';
import { adler32, inflateRaw, inflateZlib } from '../src/deflate.ts';
import { payloadOf } from '../src/ezhex.ts';

type Outcome = Uint8Array | 'refused';

function outcome(inflate: () => Uint8Array): Outcome {
  try {
    return inflate();
  } catch {
    return 'refused';
  }
}

function sameOutcome(theirs: Outcome, ours: Outcome): boolean {
  if (theirs === 'refused' || ours === 'refused') return theirs === ours;
  return theirs.length === ours.length && Buffer.from(theirs).equals(Buffer.from(ours));
}

/** A small generator, so the streams are the same on every run. */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 2 ** 32;
  };
}

test('inflateRaw and inflateZlib give node:zlib\'s outcome on every stream zlib writes, damaged or not, and on noise', () => {
  const next = random(7_3_5);
  const tally = { inflated: 0, refused: 0 };
  const check = (raw: boolean, stream: Uint8Array): void => {
    const theirs = outcome(() => new Uint8Array(raw ? inflateRawSync(stream) : inflateSync(stream)));
    const ours = outcome(() => (raw ? inflateRaw(stream) : inflateZlib(stream)));
    assert.ok(sameOutcome(theirs, ours), `${raw ? 'raw' : 'zlib'} stream of ${stream.length} bytes, ${Buffer.from(stream.subarray(0, 32)).toString('hex')}`);
    tally[theirs === 'refused' ? 'refused' : 'inflated'] += 1;
  };
  const strategies = [constants.Z_DEFAULT_STRATEGY, constants.Z_FILTERED, constants.Z_HUFFMAN_ONLY, constants.Z_RLE, constants.Z_FIXED];
  for (let trial = 0; trial < 600; trial += 1) {
    const size = [0, 1, 5, 100, 1000, 20000, 70000][Math.floor(next() * 7)]!;
    const kind = Math.floor(next() * 4);
    const data = new Uint8Array(size);
    for (let at = 0; at < size; at += 1) {
      data[at] = kind === 0 ? Math.floor(next() * 256) : kind === 1 ? 65 + Math.floor(next() * 4) : kind === 2 ? at % 37
        : at > 10 && next() < 0.9 ? data[at - 1 - Math.floor(next() * 10)]! : Math.floor(next() * 256);
    }
    const raw = next() < 0.5;
    const options = { level: Math.floor(next() * 10), strategy: strategies[Math.floor(next() * strategies.length)]! };
    const stream = new Uint8Array(raw ? deflateRawSync(data, options) : deflateSync(data, options));
    check(raw, stream);
    for (let damage = 0; damage < 4; damage += 1) {
      const changed = stream.slice();
      const how = Math.floor(next() * 4);
      if (how === 0 && changed.length > 0) {
        changed[Math.floor(next() * changed.length)]! ^= 1 << Math.floor(next() * 8);
        check(raw, changed);
      } else if (how === 1) {
        check(raw, changed.subarray(0, Math.floor(next() * changed.length)));
      } else if (how === 2) {
        check(raw, Uint8Array.from([...changed, 1, 2, 3, 4, 5]));
      } else {
        for (let at = 0; at < changed.length; at += 1) if (next() < 0.02) changed[at] = Math.floor(next() * 256);
        check(raw, changed);
      }
    }
  }
  for (let trial = 0; trial < 4000; trial += 1) {
    const noise = Uint8Array.from({ length: 1 + Math.floor(next() * 64) }, () => Math.floor(next() * 256));
    check(true, noise);
    check(false, noise);
  }
  // The outcomes the seed gives, so a change to the generator that stops exercising one side is seen.
  assert.deepEqual(tally, { inflated: 1749, refused: 9251 });
});

test('adler32 is zlib\'s, across the reduction every 5552 bytes', () => {
  const next = random(5552);
  for (const size of [0, 1, 5551, 5552, 5553, 100000]) {
    const data = Uint8Array.from({ length: size }, () => Math.floor(next() * 256));
    const stream = new Uint8Array(deflateSync(data));
    const stated = new DataView(stream.buffer, stream.byteOffset).getUint32(stream.length - 4);
    assert.equal(adler32(data), stated, `${size} bytes`);
  }
});

/** Every regular file under `directory`, depth first, leaving out git's own and not following a link. */
function filesUnder(directory: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(directory).sort()) {
    if (name === '.git') continue;
    const path = join(directory, name);
    const stat = lstatSync(path);
    if (stat.isDirectory()) out.push(...filesUnder(path));
    else if (stat.isFile()) out.push(path);
  }
  return out;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** A PNG's `IDAT` chunks joined, as `readPng` joins them, or undefined where the file is not one whole PNG. */
function imageData(bytes: Uint8Array): Uint8Array | undefined {
  if (!PNG_SIGNATURE.every((one, at) => bytes[at] === one)) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts: Uint8Array[] = [];
  for (let at = 8; at + 12 <= bytes.length;) {
    const length = view.getUint32(at);
    const kind = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (at + 12 + length > bytes.length) return undefined;
    if (kind === 'IDAT') parts.push(bytes.subarray(at + 8, at + 8 + length));
    if (kind === 'IEND') return parts.length > 0 ? Buffer.concat(parts) : undefined;
    at += 12 + length;
  }
  return undefined;
}

test('every PNG file in the lab inflates to node:zlib\'s bytes', skipWithoutLab(), () => {
  const pngs = filesUnder(LAB!).filter((path) => /\.png$/i.test(path));
  let whole = 0;
  for (const path of pngs) {
    const data = imageData(new Uint8Array(readFileSync(path)));
    if (data === undefined) continue;
    whole += 1;
    assert.ok(sameOutcome(outcome(() => new Uint8Array(inflateSync(data))), outcome(() => inflateZlib(data))), path);
  }
  // Two of the files are not one whole PNG, so there is no image data to compare.
  assert.deepEqual({ files: pngs.length, whole }, { files: 4354, whole: 4352 });
});

const u16 = (bytes: Uint8Array, at: number): number => bytes[at]! | (bytes[at + 1]! << 8);
const u32 = (bytes: Uint8Array, at: number): number => (u16(bytes, at) | (u16(bytes, at + 2) << 16)) >>> 0;

/**
 * Every `MetaData.xml` entry's stream in `blob`, found as `metadata.ts`'s `inflateOneEntry` finds one: at a local header,
 * its compressed length from the header or, where a descriptor defers it, from the first central directory entry after.
 */
function metadataStreams(blob: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let at = blob.indexOf(0x50); at >= 0 && at + 30 <= blob.length; at = blob.indexOf(0x50, at + 1)) {
    if (u32(blob, at) !== 0x04034b50) continue;
    const nameLength = u16(blob, at + 26);
    if (new TextDecoder('latin1').decode(blob.subarray(at + 30, at + 30 + nameLength)) !== 'MetaData.xml') continue;
    const data = at + 30 + nameLength + u16(blob, at + 28);
    let compressed = u32(blob, at + 18);
    if (compressed === 0) {
      let central = -1;
      for (let scan = data; scan + 46 <= blob.length; scan += 1) if (u32(blob, scan) === 0x02014b50) { central = scan; break; }
      if (central < 0) continue;
      compressed = u32(blob, central + 20);
    }
    if (compressed !== 0 && data + compressed <= blob.length) out.push(blob.subarray(data, data + compressed));
  }
  return out;
}

test('every metadata archive in the files the lab names inflates to node:zlib\'s bytes and decodes to the same text', skipWithoutLab(), () => {
  const seen = new Set<string>();
  let archives = 0;
  for (const name of Object.keys(IMAGES)) {
    const path = imagePath(name);
    if (path === undefined || seen.has(path)) continue;
    seen.add(path);
    let blob: Uint8Array;
    try {
      if (!statSync(path).isFile()) continue;
      blob = new Uint8Array(readFileSync(path));
    } catch {
      continue;
    }
    const blobs = [blob];
    if (/\.ezhex$/i.test(path)) blobs.push(payloadOf(blob, path));
    for (const one of blobs) {
      for (const stream of metadataStreams(one)) {
        archives += 1;
        const theirs = outcome(() => new Uint8Array(inflateRawSync(stream)));
        const ours = outcome(() => inflateRaw(stream));
        assert.ok(sameOutcome(theirs, ours), `${name}: the stream`);
        if (theirs === 'refused' || ours === 'refused') continue;
        assert.equal(new TextDecoder('utf-8', { ignoreBOM: true }).decode(ours), Buffer.from(theirs).toString('utf8'), `${name}: the text`);
      }
    }
  }
  assert.equal(archives, 18);
});
