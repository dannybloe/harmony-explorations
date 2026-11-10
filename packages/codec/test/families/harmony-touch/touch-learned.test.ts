/**
 * A learned code for a Harmony Touch: its raw text, `rawOfLearned` and `readTouchRaw`, and which row of the rhythm
 * table it is, `rhythmOfLearned`. `src/families/harmony-touch/learned.ts` holds the why.
 *
 * ## The raw text
 *
 * **Read in the Touch's engine**, the infrared manager's raw code path and the loader in the decompiled engine,
 * anchored in the compiled image by `tests/harmony_touch/test_harmony_touch_devices.py`, fact 9, where the reading is written
 * out and `reference/architectures/harmony-touch/devices-and-infrared.md`, "The packet", where the remote's half
 * of it is stated. In short: a `Raw` kept only when it starts with `F`; dashes removed; tokens of an optional
 * upper case `P` or `S` and hexadecimal digits of either case, anything else a separator; the first token an
 * `F` and the carrier in hexadecimal hertz, rounded into a period; every later token `P` for a mark or else a
 * space; a broken token ends the reading.
 *
 * **The spelling is MyHarmony's**, read in its learning parser's carrier recorder in the lab's decompiled client:
 * `F` and the carrier, then `P` or `S` and each interval, in upper case hexadecimal, four digits or eight where
 * four do not hold the number, no separators, opening on the first burst of carrier. Stated by Logitech, in
 * their client. The engine accepts any spelling, so this is the convention a writer follows and nothing the
 * remote checks.
 *
 * ## The calibration
 *
 * **Codes rendered from known rows come back as their row and value**, with jitter. Every row of `PROTOCOLS` whose
 * name states a width is rendered at three values drawn from a seeded generator by the table's own encoder,
 * `pulsesOfStatedRow`, and made into what a recording of one press would hold: a pulse width frame twice over at its
 * own period, any other frame twice with a gap of 40 ms after each, then the long silence a recording ends on. A
 * frame whose bit is in its silences gets a closing mark of the row's constant half before each gap, and **that mark
 * is the test's**: such a frame shows its last bit only when a mark ends it, which on the wire the family's trailer
 * does and which a row of the table does not state. Each interval is then moved by up to four per cent either way
 * and the carrier by up to two, which is the jitter a learned code has.
 *
 * **What this scores and what it does not.** The recordings are rendered by the table's own encoder and identified
 * against the same table, so the calibration scores how well the recognition stands up to jitter, and not how it
 * does on real recordings, of which none is in hand. The tolerance, `LEARNED_TOLERANCE`, was chosen against these
 * same cases, with no cases held out. At four per cent 876 of the 1679 codes, about 52 per cent, come back as their
 * row and value, and 681, about 41 per cent, go raw. **The counts move with the seed**: seed 1, the one asserted,
 * gives 876 right and 8 wrong, and seeds 2 and 3 give 883 and 7, and 893 and 10, measured once and not asserted.
 *
 * An answer is scored four ways: **right**, the row and the value; **the same lamp**, another row or value whose
 * rendering is the original frame to within five per cent on every interval, which is a rhythm a recording
 * cannot tell apart at this jitter (most are one rhythm under two names, the rest a complement read the other
 * way up); **wrong**, any other row; and the two refusals, a row of our own and raw. The counts are exact.
 *
 * **What the refusals are**: in the main the readers' own limits, which this deliberately does not work around,
 * since the brief was to read with the codec's readers rather than add a decoder. The two cell reader reads no
 * frame under eight bits, none whose set cell's mark differs from its clear cell's (`oneMark`), none whose
 * opening mark is longer than its trailing gap bound, not the first bit of a family that opens on a
 * silence, and not at its stated width a family whose lead in ends in a pair that reads as one more bit;
 * the biphase reader reads none whose lead in is not a whole number of half cells or whose two halves differ by
 * much; and no reader reads a table of four or sixteen cells. Every refused code still goes raw, and
 * the raw text reads back to the same train.
 *
 * Sources read before this was written: `reference/architectures/harmony-touch/devices-and-infrared.md`, the
 * decompiled engine's `irmanager.lua`, `utility.lua` and `userconfigreader.lua`, MyHarmony's learning parser, and
 * `irframe.ts`, `stated.ts` and `archive.ts` here. No lab and no archive is read; nothing here touches a remote.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  LEARNED_TOLERANCE, readTouchRaw, rawOfLearned, rhythmOfLearned, type LearnedRow,
} from '../../../src/families/harmony-touch/learned.ts';
import { mergedIntervals, type Pulse } from '../../../src/infrared/irframe.ts';
import { PROTOCOLS, type StatedProtocol } from '../../../src/infrared/protocols.ts';
import { pulsesOfStatedRow, statedCode, statedProtocol } from '../../../src/infrared/stated.ts';

const mark = (us: number): Pulse => ({ mark: true, us });
const space = (us: number): Pulse => ({ mark: false, us });

/** A seeded generator, so every count below is reproducible. Mulberry32. */
function generator(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------------------
// The raw text
// ---------------------------------------------------------------------------------------------------

test('a raw text is F and the carrier, then P and S, upper case hexadecimal in four digits, as MyHarmony spells one', () => {
  assert.equal(rawOfLearned([mark(9000), space(4500), mark(560), space(1690), mark(560), space(40000)], 38000),
    'F9470P2328S1194P0230S069AP0230S9C40');
});

test('a number that four hexadecimal digits do not hold is written in eight', () => {
  assert.equal(rawOfLearned([mark(560), space(70000)], 38000), 'F9470P0230S00011170');
  assert.equal(rawOfLearned([mark(560)], 455000), 'F0006F158P0230');
});

test('a carrier or an interval the notation cannot write is refused', () => {
  assert.throws(() => rawOfLearned([mark(560)], 0));
  assert.throws(() => rawOfLearned([mark(560)], 0.4));
  assert.throws(() => rawOfLearned([mark(560.5)], 38000));
  assert.throws(() => rawOfLearned([mark(0)], 38000));
});

test('the engine rounds the carrier into its period, so F9470 is 26316 nanoseconds', () => {
  const read = readTouchRaw('F9470P0230S0230');
  assert.ok(!('refusal' in read));
  assert.equal(read.carrierHz, 38000);
  assert.equal(read.periodNs, 26316);
  assert.deepEqual(read.train, [mark(560), space(560)]);
});

test('dashes are removed, other characters separate, and the digits are either case', () => {
  for (const text of ['F9470P0230S069a', 'F9470-P02-30-S069A', 'F9470 P0230, S069A', 'F9470\nP0230\nS069A']) {
    const read = readTouchRaw(text);
    assert.ok(!('refusal' in read), text);
    assert.deepEqual(read.train, [mark(560), space(1690)], text);
  }
});

test('an F after a value is one more digit of it, and a broken token stops the reading with what was read', () => {
  // An F after a value is one more hexadecimal digit of it.
  const run = readTouchRaw('F9470P02F0');
  assert.ok(!('refusal' in run));
  assert.deepEqual(run.train, [mark(0x2F0)]);
  // A lower case p is no prefix, so it separates, and the bare digits after it are a token with none.
  assert.deepEqual(readTouchRaw('F9470P0230p0230S0230'), { refusal: 'a value with no P or S before it', read: [mark(560)] });
  assert.deepEqual(readTouchRaw('P0230'), { refusal: 'does not start with F', read: [] });
  assert.deepEqual(readTouchRaw('F'), { refusal: 'no carrier first', read: [] });
  assert.deepEqual(readTouchRaw('FP0230'), { refusal: 'no carrier first', read: [] });
  assert.deepEqual(readTouchRaw('F0P0230'), { refusal: 'a carrier of zero', read: [] });
});

// ---------------------------------------------------------------------------------------------------
// The calibration
// ---------------------------------------------------------------------------------------------------

/** Four per cent, the jitter the counts below are stated at, and two per cent on the carrier. */
const JITTER = 0.04;
const CARRIER_JITTER = 0.02;
const VALUES_PER_ROW = 3;

type Outcome = 'right' | 'the same lamp' | 'wrong' | 'a row of our own' | 'raw';

interface Case {
  readonly row: StatedProtocol;
  readonly bits: number;
  readonly value: bigint;
  readonly frame: readonly Pulse[];
  readonly learned: readonly Pulse[];
  readonly carrierHz: number;
}

/** What a recording of one press of `frame` holds: see the header. */
function recording(row: StatedProtocol, frame: readonly Pulse[]): Pulse[] {
  if (row.carries === 'mark') return mergedIntervals([...frame, ...frame, space(100000)]);
  const closing = row.carries === 'space' ? [mark(row.flat!)] : [];
  const once = [...frame, ...closing, space(40000)];
  return mergedIntervals([...once, ...once, space(100000)]);
}

/** The calibration's codes, and how many rows each skip took out before any code was made. */
function calibration(jitter: number): { cases: Case[]; noWidth: number; notRenderable: number } {
  const random = generator(1);
  const cases: Case[] = [];
  let noWidth = 0;
  let notRenderable = 0;
  for (const row of PROTOCOLS) {
    const bits = statedCode(`G:${row.family}:()(0x0)():3`)?.bits;
    if (bits === undefined) { noWidth += 1; continue; }
    let made = 0;
    for (let k = 0; k < VALUES_PER_ROW; k += 1) {
      let value = 0n;
      for (let b = 0; b < bits; b += 1) value = (value << 1n) | (random() < 0.5 ? 1n : 0n);
      let frame: Pulse[] | undefined;
      try { frame = pulsesOfStatedRow(row, bits, value); } catch { frame = undefined; }
      // A frame with no burst of carrier, which one family's rendering at some values is, sends nothing.
      if (frame === undefined || !frame.some((one) => one.mark)) continue;
      const learned = recording(row, frame).map((one) => ({
        mark: one.mark, us: Math.max(1, Math.round(one.us * (1 + jitter * (2 * random() - 1)))),
      }));
      const carrierHz = (1e9 / row.periodNs) * (1 + CARRIER_JITTER * (2 * random() - 1));
      cases.push({ row, bits, value, frame, learned, carrierHz });
      made += 1;
    }
    if (made === 0) notRenderable += 1;
  }
  return { cases, noWidth, notRenderable };
}

/** Whether a reading renders the original frame to within `share` on every interval, the intervals counted alike. */
function sameLamp(answer: LearnedRow, frame: readonly Pulse[], share: number): boolean {
  let rendered: Pulse[] | undefined;
  try { rendered = pulsesOfStatedRow(answer.row, answer.bits, answer.value); } catch { return false; }
  if (rendered === undefined) return false;
  const a = mergedIntervals(frame);
  const b = mergedIntervals(rendered);
  return a.length === b.length
    && a.every((one, i) => one.mark === b[i]!.mark && Math.abs(one.us - b[i]!.us) <= share * one.us);
}

function outcome(c: Case): Outcome {
  const got = rhythmOfLearned(c.learned, c.carrierHz);
  if (got.kind === 'raw') return 'raw';
  if (got.kind === 'fitted') return 'a row of our own';
  if (got.row.family === c.row.family && got.value === c.value && got.bits === c.bits) return 'right';
  return sameLamp(got, c.frame, 0.05) ? 'the same lamp' : 'wrong';
}

function scores(cases: readonly Case[]): Record<Outcome, number> {
  const out: Record<Outcome, number> = { right: 0, 'the same lamp': 0, wrong: 0, 'a row of our own': 0, raw: 0 };
  for (const c of cases) out[outcome(c)] += 1;
  return out;
}

const AT_JITTER = calibration(JITTER);

test('the calibration renders three codes of every row whose name states a width and that renders', () => {
  // 681 rows: 75 whose name states no width, 46 that render no code alone (the whole record shapes, and cell
  // tables whose width is not a whole number of cells), and 560 rendered three times, less one code of one row
  // that renders as silence alone at that value.
  assert.equal(PROTOCOLS.length, 681);
  assert.equal(AT_JITTER.noWidth, 75);
  assert.equal(AT_JITTER.notRenderable, 46);
  assert.equal(AT_JITTER.cases.length, 1679);
  // By shape: 291 biphase codes, 156 of a table of four or sixteen cells, which no reader reads, and 1232 of
  // two cells, a table of two one bit cells among them.
  assert.equal(AT_JITTER.cases.filter((c) => c.row.biphase !== undefined).length, 291);
  assert.equal(AT_JITTER.cases.filter((c) => c.row.cells !== undefined && c.row.cells.bits > 1).length, 156);
});

test('at four per cent of jitter 876 of 1679 codes come back as their row and value, 8 wrong and 681 raw', () => {
  // 876 of 1679 right, 99 the same lamp under another name or the other way up, 8 wrong: 8 of the 983 codes
  // answered with a row of the table. The rest are refused and go raw or get a row of our own. By shape, two
  // cells: 759 right, 77 the same lamp, 8 wrong, 14 a row of our own, 374 raw; biphase: 117, 22, 0, 1, 151; the
  // 156 codes of a table of four or sixteen cells all raw.
  assert.deepEqual(scores(AT_JITTER.cases), {
    right: 876, 'the same lamp': 99, wrong: 8, 'a row of our own': 15, raw: 681,
  });
});

test('with no jitter the same codes come back right more often, and wrong no less often', () => {
  // The control for the count above: the same codes unmoved. More come back right and fewer as the same lamp,
  // and the wrong ones do not fall. Unmoved, all ten are codes of four rows whose own row was no candidate,
  // since no reading the readers propose fits it: a seven bit row, under the readers' eight; a row opening on a
  // silence, whose first bit a recording cannot hold; one with a long opening mark; and one whose lead in ends in
  // a pair that reads as one more bit. A neighbouring row renders each recording within tolerance.
  assert.deepEqual(scores(calibration(0).cases), {
    right: 985, 'the same lamp': 42, wrong: 10, 'a row of our own': 12, raw: 630,
  });
});

test('every calibration code, whatever route it took, reads back from its raw text as the same train', () => {
  for (const c of AT_JITTER.cases) {
    const read = readTouchRaw(rawOfLearned(c.learned, c.carrierHz));
    assert.ok(!('refusal' in read), c.row.family);
    assert.deepEqual(read.train, c.learned, c.row.family);
    assert.equal(read.carrierHz, Math.round(c.carrierHz), c.row.family);
  }
});

// ---------------------------------------------------------------------------------------------------
// The routes, one case each
// ---------------------------------------------------------------------------------------------------

/** A Sony 12 Bit code as a recording would hold it, the row of the table measured off the most records. */
function sony(value: bigint, stretch: (at: number, us: number) => number = (_, us) => us): Pulse[] {
  const row = statedProtocol('Sony 12 Bit')!;
  const frame = pulsesOfStatedRow(row, 12, value)!;
  return recording(row, frame).map((one, at) => ({ mark: one.mark, us: stretch(at, one.us) }));
}

test('a Sony 12 Bit code is found as Sony 12 Bit with its value', () => {
  const got = rhythmOfLearned(sony(0x5A3n), 40000);
  assert.equal(got.kind, 'family');
  assert.ok(got.kind === 'family');
  assert.equal(got.row.family, 'Sony 12 Bit');
  assert.equal(got.bits, 12);
  assert.equal(got.value, 0x5A3n);
});

test('the negative: one interval stretched past the tolerance and Sony 12 Bit no longer renders the code', () => {
  // The fifth interval is a carried mark, 600 or 1200 microseconds; a fifth longer is past the twelve per cent.
  const got = rhythmOfLearned(sony(0x5A3n, (at, us) => (at === 4 ? Math.round(us * 1.2) : us)), 40000);
  assert.ok(!(got.kind === 'family' && got.row.family === 'Sony 12 Bit' && got.value === 0x5A3n));
  assert.ok(LEARNED_TOLERANCE < 0.2);
});

/** A rhythm no row of the table states: a 6000 and 3000 lead in, 700 marks, 700 and 2100 spaces, 20 bits. */
function invented(values: readonly bigint[], wobble = 0): { train: Pulse[]; carrierHz: number } {
  const random = generator(7);
  const out: Pulse[] = [];
  for (const value of values) {
    out.push(mark(6000), space(3000));
    for (let i = 19; i >= 0; i -= 1) out.push(mark(700), space((value >> BigInt(i)) & 1n ? 2100 : 700));
    out.push(mark(700), space(30000));
  }
  return {
    train: out.map((one) => ({ mark: one.mark, us: Math.round(one.us * (1 + wobble * (2 * random() - 1))) })),
    carrierHz: 33000,
  };
}

test('a rhythm no row states gets a row of our own, which renders the whole code back', () => {
  const { train, carrierHz } = invented([0xA5C3En, 0xA5C3En], 0.04);
  const got = rhythmOfLearned(train, carrierHz);
  assert.equal(got.kind, 'fitted');
  assert.ok(got.kind === 'fitted');
  assert.equal(got.noFamily, 'no row renders it');
  assert.equal(got.row.family, 'Learned 20 Bit');
  assert.equal(got.row.source, 'learned');
  assert.equal(got.bits, 20);
  assert.equal(got.value, 0xA5C3En);
  // The fitted rhythm is the invented one to within the wobble, and its blocks are the code's own: the whole of it
  // as the first transmission, a copy, the closing mark and gap, a second copy, the closing mark and the gap the
  // recording ends on; and the first copy with its closing mark and gap as the one repetition a held key sends.
  assert.equal(got.row.carries, 'space');
  for (const [fitted, made] of [[got.row.header![0], 6000], [got.row.header![1], 3000], [got.row.flat!, 700],
    [got.row.zero!, 700], [got.row.one!, 2100]] as const) {
    assert.ok(Math.abs(fitted - made) <= 0.04 * made, `${fitted} against ${made}`);
  }
  const kinds = (items: readonly object[]) => items.map((one) => ('copy' in one ? 'copy' : 'words' in one ? 'words' : 'pad'));
  assert.deepEqual(kinds(got.row.tail!.items), ['copy', 'words', 'copy', 'words']);
  assert.deepEqual(kinds(got.row.held!.items), ['copy', 'words']);
  // In the stored form: the code's own last silence, one microsecond longer.
  const last = got.row.tail!.items.at(-1)!;
  assert.ok('words' in last);
  assert.equal(last.words.at(-1), -(train.at(-1)!.us + 1));
  const held = got.row.held!.items.at(-1)!;
  assert.ok('words' in held);
  assert.deepEqual(held.words.map(Math.sign), [1, -1]);
  // The name carries the width the way a family's does, so a code of the row reads.
  assert.equal(statedCode(`G:${got.row.family}:()(0x${got.value.toString(16)})():3`)?.bits, 20);
  assert.ok(got.error.max <= LEARNED_TOLERANCE);
});

test('a code whose second frame carries another value is not taken as the family of its first', () => {
  // NEC 32 Bit, two frames of two values, as a family stating two values per code sends them.
  const row = statedProtocol('NEC 32 Bit')!;
  const frame = (value: bigint) => [...pulsesOfStatedRow(row, 32, value)!, mark(row.flat!), space(40000)];
  const one = rhythmOfLearned(mergedIntervals(frame(0x20DF10EFn)), 1e9 / row.periodNs);
  assert.equal(one.kind, 'family');
  const two = rhythmOfLearned(mergedIntervals([...frame(0x20DF10EFn), ...frame(0x20DF40BFn)]), 1e9 / row.periodNs);
  assert.notEqual(two.kind, 'family');
  assert.ok(two.kind !== 'family');
  assert.equal(two.noFamily, 'a later frame carries another value');
});

test('a pulse width code with no second copy cannot have its frame period fitted, and goes raw', () => {
  // Sony's rhythm at a carrier no Sony row is at, so the table does not take it, recorded once.
  const row = statedProtocol('Sony 12 Bit')!;
  const train = [...pulsesOfStatedRow(row, 12, 0x5A3n)!, space(100000)];
  const got = rhythmOfLearned(mergedIntervals(train), 56000);
  assert.equal(got.kind, 'raw');
  assert.ok(got.kind === 'raw');
  assert.equal(got.noFit, 'no second copy to measure the frame period from');
  assert.equal(got.raw, rawOfLearned(mergedIntervals(train), 56000));
});

test('a train with no frame in it goes raw, with both reasons', () => {
  const random = generator(3);
  const train: Pulse[] = [];
  for (let i = 0; i < 40; i += 1) train.push(mark(200 + Math.round(random() * 3000)), space(200 + Math.round(random() * 3000)));
  const got = rhythmOfLearned(train, 38000);
  assert.deepEqual(got.kind === 'raw' ? [got.noFamily, got.noFit] : got.kind,
    ['no row renders it', 'no frame under a header']);
});

test('a train with no burst of carrier, or no carrier, is no code at all', () => {
  assert.throws(() => rhythmOfLearned([space(1000)], 38000));
  assert.throws(() => rhythmOfLearned([mark(1000)], 0));
});
