/**
 * Our own deflate, `src/deflate.ts`, writes the stream stock zlib 1.2.12 writes at its defaults, `todo-compile-350.md`
 * 5.1.4. The six metadata archives the lab holds are the calibration that matters and `metadatabuild.test.ts` holds
 * them; this file holds the format half with no lab, and the calibration against stock zlib itself on inputs nobody
 * chose for being easy.
 *
 * **What it settled.** Against stock zlib 1.2.12, the one Python links here, called as the archive's writer is
 * (level 6, raw, window 15, memory level 8, default strategy), our stream is equal byte for byte on every input of
 * the synthetic set below: texts shaped like the archive's from 100 bytes to 65000, skewed byte distributions,
 * long runs, random bytes, and the edge cases of no byte to three, 61 inputs. Between them these reach branches the
 * archives do not, counted by instrumenting a copy of the module: stored blocks (random bytes), the fixed codes
 * (tiny inputs), 16 blocks of their own codes ended at 16383 symbols, all in the skewed inputs, 796 matches of 258
 * bytes, and
 * the length limit mended once, on the code length alphabet's 7 bits.
 *
 * **What each rule is worth, measured once by editing a copy of the module and scoring it**, recorded here rather
 * than asserted, since asserting it would put switches into the encoder for its test's sake:
 *
 * | rule taken out | the six archives | the 61 synthetic inputs |
 * |---|---|---|
 * | a tie in a Huffman heap going to the shallower node | 0 of 6 | 19 of 61 |
 * | a three byte match more than 4096 back dropped | 0 of 6 | 32 of 61 |
 * | lazy evaluation, the next position not searched while a match is held | 0 of 6 | 6 of 61 |
 * | position 0 never a match, the chains' empty value being 0 | 6 of 6 | 31 of 61 |
 *
 * So the archives alone do not calibrate the last rule, since no archive's text repeats its first three bytes
 * where it would matter, and the synthetic set does. One edit scored as no change at all, 6 of 6 and 61 of 61: a
 * search whose best so far starts at no length rather than the held match's, the chain's cut left on the held
 * match. It is not named as a rule in the module for that reason, since it changes which candidate is compared first
 * and never which match is taken; changing the cut as well does change the streams.
 *
 * **What it does not settle.** Another version of zlib (the calibration skips unless Python's is 1.2.12); an input
 * past `DEFLATE_MAX_INPUT`, which is refused; and the length limit on the two 15 bit alphabets, which no input here
 * reaches: it is the same code as the 7 bit case that is calibrated, at another limit, and not checked on its own.
 *
 * **Sources checked first.** RFC 1951 for the format; zlib's `algorithm.txt` and its documented level table for the
 * matcher's shape; `tests/test_harmony_350_metadata_deflate.py` for which zlib and which setting; Node's own zlib,
 * which `noscreencensus.test.ts` found writes none of the archives' streams. No zlib source is in this repository or
 * was ported into it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import { DEFLATE_MAX_INPUT, deflateRaw } from '../src/deflate.ts';

/** A small seeded generator, so the inputs are the same on every run and on every machine. */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The synthetic inputs, by name. */
function inputs(): Map<string, Uint8Array> {
  const random = generator(7);
  const pick = (n: number) => Math.floor(random() * n);
  const out = new Map<string, Uint8Array>();
  const ascii = (text: string) => new Uint8Array(Buffer.from(text, 'latin1'));
  out.set('no byte', new Uint8Array(0));
  out.set('one byte', ascii('a'));
  out.set('two bytes', ascii('ab'));
  out.set('three bytes', ascii('abc'));
  out.set('one byte a thousand times', ascii('a'.repeat(1000)));
  out.set('random 5000', Uint8Array.from({ length: 5000 }, () => pick(256)));
  out.set('random 40', Uint8Array.from({ length: 40 }, () => pick(256)));
  out.set('random 60000', Uint8Array.from({ length: 60000 }, () => pick(256)));
  const words = Array.from({ length: 300 }, () => Array.from({ length: 2 + pick(11) }, () => String.fromCharCode(97 + pick(26))).join(''));
  const sizes = [100, 1000, 5000, 20000, 40000, 60000, 65000];
  for (let k = 0; k < 30; k += 1) {
    const size = sizes[pick(sizes.length)]!;
    const vocabulary = words.slice(0, 5 + pick(296));
    let text = '';
    while (text.length < size) {
      const word = vocabulary[pick(vocabulary.length)]!;
      text += random() < 0.5 ? `<Command><Index>${pick(201)}</Index><Name>${word}</Name></Command>` : `${word} `;
    }
    out.set(`archive shaped ${k}`, ascii(text.slice(0, size)));
  }
  for (let k = 0; k < 15; k += 1) {
    const size = [3000, 30000, 65000][pick(3)]!;
    const spread = 2 + pick(39);
    out.set(`skewed ${k}`, Uint8Array.from({ length: size }, () => Math.min(255, Math.floor(-Math.log(1 - random()) * spread))));
  }
  for (let k = 0; k < 8; k += 1) {
    const size = [50000, 65000][pick(2)]!;
    const bytes: number[] = [];
    while (bytes.length < size) {
      const value = pick(4);
      for (let run = 1 + pick(600); run > 0; run -= 1) bytes.push(value);
    }
    out.set(`runs ${k}`, Uint8Array.from(bytes.slice(0, size)));
  }
  return out;
}

/** The first block's type, the two bits after the first: 0 stored, 1 fixed codes, 2 its own codes. */
const firstBlockType = (stream: Uint8Array) => (stream[0]! >> 1) & 3;

test('every synthetic input inflates back to itself', () => {
  for (const [name, input] of inputs()) {
    assert.deepEqual(new Uint8Array(inflateRawSync(deflateRaw(input))), input, name);
  }
});

test('the encoder writes each kind of block: stored for random bytes, fixed codes for a tiny input, its own codes for text', () => {
  const all = inputs();
  assert.equal(firstBlockType(deflateRaw(all.get('random 5000')!)), 0);
  assert.equal(firstBlockType(deflateRaw(all.get('three bytes')!)), 1);
  assert.equal(firstBlockType(deflateRaw(all.get('archive shaped 0')!)), 2);
  // The empty input is one final block of fixed codes holding only its end, three bits and seven, two bytes.
  assert.deepEqual([...deflateRaw(new Uint8Array(0))], [0x03, 0x00]);
});

test('a block ends after 16383 symbols: 60000 random bytes are four stored blocks of five bytes overhead each', () => {
  const input = inputs().get('random 60000')!;
  // Every byte a literal, so the blocks are 16383, 16383, 16383 and 10851 bytes, each stored behind a header byte
  // and its two length words.
  assert.equal(deflateRaw(input).length, 60000 + 4 * 5);
});

test('an input past the largest size zlib writes without sliding its window is refused, and the largest is written', () => {
  assert.throws(() => deflateRaw(new Uint8Array(DEFLATE_MAX_INPUT + 1)), RangeError);
  assert.equal(new Uint8Array(inflateRawSync(deflateRaw(new Uint8Array(DEFLATE_MAX_INPUT)))).length, DEFLATE_MAX_INPUT);
});

/** Stock zlib's streams for `all`, through Python, or undefined where Python or its zlib 1.2.12 is not there. */
function stockZlib(all: readonly Uint8Array[]): { version: string; streams?: Uint8Array[] } {
  const script = [
    'import base64, json, sys, zlib',
    'inputs = json.load(sys.stdin)',
    'def deflated(data):',
    '    packer = zlib.compressobj(6, zlib.DEFLATED, -15, 8, zlib.Z_DEFAULT_STRATEGY)',
    '    return packer.compress(data) + packer.flush()',
    'out = [base64.b64encode(deflated(base64.b64decode(one))).decode() for one in inputs]',
    'json.dump({"version": zlib.ZLIB_RUNTIME_VERSION, "streams": out}, sys.stdout)',
  ].join('\n');
  const run = spawnSync('python3', ['-I', '-c', script], {
    input: JSON.stringify(all.map((one) => Buffer.from(one).toString('base64'))), maxBuffer: 64 * 1024 * 1024,
  });
  if (run.status !== 0) return { version: 'none' };
  const answer = JSON.parse(run.stdout.toString()) as { version: string; streams: string[] };
  return { version: answer.version, streams: answer.streams.map((one) => new Uint8Array(Buffer.from(one, 'base64'))) };
}

const STOCK = (() => {
  const all = [...inputs()];
  const stock = stockZlib(all.map(([, input]) => input));
  return { all, stock };
})();
const withStockZlib = STOCK.stock.version === '1.2.12' ? {} : { skip: `stock zlib 1.2.12 is not what python3 links here (${STOCK.stock.version})` };

test('our stream equals stock zlib 1.2.12\'s at its defaults on all 61 synthetic inputs', withStockZlib, () => {
  const equal = STOCK.all.filter(([, input], k) => Buffer.from(deflateRaw(input)).equals(Buffer.from(STOCK.stock.streams![k]!)))
    .map(([name]) => name);
  assert.equal(STOCK.all.length, 61);
  assert.deepEqual(equal, STOCK.all.map(([name]) => name));
});
