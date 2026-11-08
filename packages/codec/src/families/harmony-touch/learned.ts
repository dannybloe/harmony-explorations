/**
 * A learned infrared code in the two forms a Harmony Touch can be given it: as a raw code, the durations
 * written out as text, or as a code family's row and a value, which `definition.ts` turns into a family
 * definition and a key code. `todo-touch.md` 5.3, part B.
 *
 * **What a learned code is.** An infrared command is a lamp blinking in a precise rhythm, and learning one is
 * recording that rhythm off the original remote: how fast the lamp flickers, the carrier, and how long it is on
 * and off, in turn. What comes back is a list of durations and nothing else, so the question this module
 * answers is which of the two routes a Touch should get it by.
 *
 * **The raw route always works and says the least.** A Touch plays a raw code as one repeat sequence, exactly
 * as written, `devices-and-infrared.md`, "The packet". Nothing about the code's family is needed, and nothing
 * about it is known afterwards either: a person editing the device sees durations rather than a family and a
 * number.
 *
 * **The family route says more and has to be earned.** A learned code that is one of the families our rhythm
 * table holds, `PROTOCOLS`, is better sent as that family: the definition is shared by every command of the
 * device and the code reads back as a number. **It does not toggle**: the definitions `definition.ts` writes
 * state no toggle bit, since no row of the table states one, so a toggling family's code goes out exactly as
 * written on every press, as a raw code does, and a receiver that tracks the bit sees every press as the same
 * press. So
 * `rhythmOfLearned` asks the table first, then fits a row of our own where the code has a header and two
 * cells, and only then falls back on the raw route, and a refusal says which step stopped it.
 *
 * **No new decoder.** The values are read by the codec's own frame readers in `irframe.ts`: `framesOfPulses`
 * for a frame of two cell lengths under a header, `framesOfSegments` for a code of several frames, and
 * `biphaseFrames` for a code whose bit is which half of a cell carries the carrier. What they cannot do is say
 * which family a reading is, because a learned code's durations wobble by a few per cent and the table's own
 * lookup, `rhythmKey`, matches exact numbers by design. So a reading is held against each row by **rendering
 * the row** at the read value with the table's own encoder, `pulsesOfStatedRow`, and comparing the two trains
 * interval by interval. The row whose rendering is closest wins, and a row whose rendering strays past the
 * tolerance anywhere is not a candidate at all.
 *
 * **What the raw text is, read in the Touch's engine.** `tests/test_harmony_touch_devices.py` anchors the reader
 * in the firmware image and its header holds the reading; the short of it: the remote keeps a command's `Raw`
 * only when its first character is `F`, and only sends it when the command's `KeyCode` is empty or null. It
 * takes the dashes out, then reads tokens of an optional `P` or `S` and hexadecimal digits, so any other
 * character separates two tokens. The first token has to hold `F` and a hexadecimal carrier in hertz; every
 * later one has to start with `P`, the lamp flickering for that many microseconds in hexadecimal, or `S`, the
 * lamp dark. The letters are upper case only; the digits are either case. A token that breaks the pattern stops
 * the reading where it stands.
 *
 * **What the text looks like is MyHarmony's.** The engine accepts any spelling of that grammar, so the one
 * chosen here is the one Logitech's own learning code writes, which makes a code of ours look like a code
 * learned through their client: `F` and the carrier, then `P` or `S` and each duration, upper case
 * hexadecimal, four digits, or eight where the number does not fit in four, with no separators. Their recorder
 * starts on the first burst of carrier, so the text opens on a `P`. Stated by Logitech, in their client: the
 * carrier recorder of their desktop driver's learning parser, read in the lab's decompiled copy.
 *
 * **The Touch's own in its raw text, generic in its recognition.** The raw text and its reader, `rawOfLearned`,
 * `readTouchRaw` and their types, are the Harmony Touch's notation and are named for it, in the folder that is
 * the Touch's own. The recognition, `rhythmOfLearned`, reads no configuration and names no remote: it is
 * ordinary infrared over the rhythm table and would serve any family, and it lives here because the raw text it
 * falls back to is the Touch's alone.
 */
import { periodOfCarrier, roundedPeriodOfCarrier } from '../../archive.ts';
import {
  GAP_US, biphaseFrames, framesOfPulses, framesOfSegments, fromFirstMark, mergedIntervals, pulsesOfBlock,
  type BlockTail, type Pulse,
} from '../../irframe.ts';
import { PROTOCOLS, type StatedProtocol } from '../../protocols.ts';
import { pulsesOfStatedRow, statedCode, timingsOf } from '../../stated.ts';

// ---------------------------------------------------------------------------------------------------
// The raw text
// ---------------------------------------------------------------------------------------------------

/**
 * A number as MyHarmony's learning code writes it: upper case hexadecimal, four digits, or eight where it
 * does not fit in four. The engine reads any width, so this is spelling and not grammar.
 */
function hexOf(n: number): string {
  const digits = n.toString(16).toUpperCase();
  return digits.padStart(n > 0xFFFF ? 8 : 4, '0');
}

/**
 * The `Raw` text a Harmony Touch plays for a learned code: `F` and the carrier, then `P` and `S` values.
 *
 * **Every interval goes out as given, in order**, adjacent intervals of one kind included: the engine turns
 * each into words of its own and never merges two, and two words of one kind in a row are one interval on the
 * lamp, so nothing is gained by merging here and the text stays the caller's train. A trailing silence is kept
 * too. The engine puts the whole text in the packet as its one repeat sequence, which is read in the
 * firmware; that the silence a recording ends on is then also the pause between repetitions of a held key is
 * this module's reading of that and **not checked**, since how the native program plays the repeat sequence is
 * not, `devices-and-infrared.md`, "Not checked". Shortening it is the caller's decision, since only the caller
 * knows how the recording ended.
 *
 * **What the engine does with a value** is not this function's business and is left alone: an interval over
 * 32767 microseconds goes out as several words, and one under 30 is raised to 30, `devices-and-infrared.md`.
 *
 * Throws on a carrier that does not round to a positive number of hertz, since the engine divides by it, and
 * on an interval that is not a positive whole number of microseconds, which no recording produces and the
 * notation cannot write.
 */
export function rawOfLearned(train: readonly Pulse[], carrierHz: number): string {
  const hz = Math.round(carrierHz);
  if (!Number.isFinite(hz) || hz < 1) throw new Error(`a carrier of ${carrierHz} Hz cannot be written`);
  const parts = [`F${hexOf(hz)}`];
  for (const one of train) {
    if (!Number.isInteger(one.us) || one.us < 1) {
      throw new Error(`an interval of ${one.us} microseconds cannot be written`);
    }
    parts.push(`${one.mark ? 'P' : 'S'}${hexOf(one.us)}`);
  }
  return parts.join('');
}

/** A raw text read the way the Touch's engine reads it. */
export interface TouchRaw {
  /** The carrier the text states, in hertz. */
  readonly carrierHz: number;
  /**
   * The carrier period the engine puts in its packet: a billion over the carrier, rounded to the nearest
   * nanosecond by the engine's bit library, `roundedPeriodOfCarrier`.
   */
  readonly periodNs: number;
  /** The intervals in the order written, before the engine spells them as words. */
  readonly train: readonly Pulse[];
}

/** Why a raw text does not read, and so what the remote does with it instead. */
export type TouchRawRefusal =
  /** The remote drops the `Raw` of a command whose text does not open on `F`, at load. */
  | 'does not start with F'
  /** The engine's first token holds no `F` followed by digits; it stops reading and sends nothing useful. */
  | 'no carrier first'
  /** A later token does not start with `P` or `S`; the engine stops reading there. */
  | 'a value with no P or S before it'
  /**
   * The carrier is zero. The engine divides a billion by it; what its packet then holds is not checked, so
   * this is refused rather than given a period.
   */
  | 'a carrier of zero';

/**
 * Read a `Raw` text by the Touch engine's own grammar, the inverse of `rawOfLearned` and stricter than it.
 *
 * **Written to the engine and not to MyHarmony**, so a text another writer spelled differently reads the way
 * the remote reads it: a dash anywhere is removed first; tokens are an optional upper case `P` or `S` and one
 * or more hexadecimal digits of either case, found left to right, so every other character only separates two
 * tokens; the first token must hold an `F` followed by digits, found anywhere in it, and is the carrier;
 * every later token must hold `P` or `S` followed by digits. `F` is itself a hexadecimal digit, which has two
 * consequences the engine has as well: a carrier's digits run on until the next `P` or `S`, and an `F` after a
 * value is read as one more digit of that value.
 *
 * **A text that breaks the grammar is a refusal with what was read before the break**, because that is what
 * the engine has in its packet when it stops: it returns without setting the sequence's length and the sender
 * goes ahead regardless. What the native program then plays is not checked.
 */
export function readTouchRaw(text: string):
  TouchRaw | { readonly refusal: TouchRawRefusal; readonly read: readonly Pulse[] } {
  if (!text.startsWith('F')) return { refusal: 'does not start with F', read: [] };
  const tokens = text.replace(/-/g, '').match(/[PS]?[0-9A-Fa-f]+/g) ?? [];
  let carrierHz: number | undefined;
  const train: Pulse[] = [];
  for (const token of tokens) {
    if (carrierHz === undefined) {
      const carrier = /F([0-9A-Fa-f]+)/.exec(token);
      if (carrier === null) return { refusal: 'no carrier first', read: train };
      carrierHz = parseInt(carrier[1]!, 16);
      if (carrierHz === 0) return { refusal: 'a carrier of zero', read: train };
      continue;
    }
    const value = /([PS])([0-9A-Fa-f]+)/.exec(token);
    if (value === null) return { refusal: 'a value with no P or S before it', read: train };
    train.push({ mark: value[1] === 'P', us: parseInt(value[2]!, 16) });
  }
  if (carrierHz === undefined) return { refusal: 'no carrier first', read: train };
  return { carrierHz, periodNs: roundedPeriodOfCarrier(carrierHz), train };
}

// ---------------------------------------------------------------------------------------------------
// Which row a learned code is
// ---------------------------------------------------------------------------------------------------

/**
 * How far a learned interval may sit from a rendered one and still be the same interval, as a share of the
 * rendered one.
 *
 * **A learned code wobbles, and this is the room it gets.** A recording rounds each interval to its own clock
 * and the original remote's oscillator is not exact, so a few per cent is ordinary. The families of the
 * rhythm table sit further apart than that on the intervals that carry their bits, which is what lets a wide
 * tolerance work: the closest rendering is chosen, and the tolerance only decides what is a candidate. The
 * calibration in `test/touch-learned.test.ts` states what this value scores at a jitter of four per cent.
 */
export const LEARNED_TOLERANCE = 0.12;

/**
 * The smallest room an interval gets, in microseconds, so that a short one is not held to a fraction of a
 * microsecond. Thirty is the shortest interval a Touch sends, `devices-and-infrared.md`.
 */
export const LEARNED_FLOOR_US = 30;

/**
 * How far the learned carrier may sit from a row's, as a share of the row's period. A recorder measures the
 * carrier over a few cycles, so it is rougher than the durations; families at 36, 38 and 40 kHz are five per
 * cent apart, and the durations decide between rows at one carrier.
 */
export const LEARNED_CARRIER_TOLERANCE = 0.06;

/**
 * How many times longer than every mark of the frame a code's opening mark has to be to count as a header,
 * where a row of our own is fitted. A lead in is several cells long on every family the table holds with one;
 * the smallest ratio is Sony's two, and a factor of 1.5 leaves that room for a wobble.
 */
const HEADER_FACTOR = 1.5;

/**
 * A silence longer than this many of a train's shortest intervals ends a biphase frame. The biphase reader in
 * `irframe.ts` accepts an interval of at most six half cells inside a frame, so a silence past six and a half
 * is the gap after it.
 */
const BIPHASE_GAP_CELLS = 6.5;

/** The rows the table's encoder can render one value of, which are the only ones a reading can be held to. */
function renderable(row: StatedProtocol): boolean {
  // A cell table family's value is which of four or sixteen whole cells goes out, and no reader in the codec
  // reads that, so no reading can be proposed for it. **A table of two one bit cells is the exception**: it is
  // a two cell family written cell by cell, mostly with its silence first, and the two cell reader reads it
  // like any other. The two whole record shapes, `quad` and `longToggle`, state several values per code and
  // render none alone.
  return (row.cells === undefined || row.cells.bits === 1) && row.quad === undefined && row.longToggle === undefined;
}

/** The width a row's codes state their value at, from its own name, or undefined where the name states none. */
function widthOf(row: StatedProtocol): number | undefined {
  // The codec's one reading of a family's name, `statedCode`, rather than a second pattern for the word `Bit`.
  return statedCode(`G:${row.family}:()(0x0)():3`)?.bits;
}

const widths = new Map<string, number | undefined>();

/** `widthOf`, read once per row rather than once per comparison. */
function widthOfRow(row: StatedProtocol): number | undefined {
  if (!widths.has(row.family)) widths.set(row.family, widthOf(row));
  return widths.get(row.family);
}

/**
 * How closely a rendered train matches a learned one: the mean share each interval is off, or undefined where
 * any interval is out of tolerance, of the other kind, or missing.
 *
 * **Both trains are merged first and start at their first mark**, since a recording sees one interval where an
 * encoder writes two words of one kind, and a biphase encoder writes every half cell as a word of its own.
 *
 * **The rendering's last interval, when it is a silence, may be a gap in the recording**, unless `openEnd`
 * is false. A rendered frame ends where the frame ends, and a recording carries on into the gap before the
 * next copy or into the silence the recording stops on, which the merge has joined to it. So a last silence
 * that is longer than the rendered one and long enough to end a frame, `GAP_US`, the bound the frame reader
 * itself ends a frame on, is the gap, or the end of the recording; it counts as off by the whole tolerance in
 * the mean and not at all in the largest share. A shorter one, or a long silence below that bound, which is a
 * bit cell's, is compared like any other. A comparison of two whole trains, or of a copy whose last interval
 * is followed by more of the code, closes the end.
 */
function closeness(
  rendered: readonly Pulse[], learned: readonly Pulse[], openEnd = true,
): { mean: number; max: number } | undefined {
  const r = fromFirstMark(mergedIntervals(rendered));
  if (r.length === 0) return undefined;
  let sum = 0;
  let max = 0;
  let n = 0;
  for (let i = 0; i < r.length; i += 1) {
    const want = r[i]!;
    const got = learned[i];
    const last = i === r.length - 1;
    const room = Math.max(LEARNED_TOLERANCE * want.us, LEARNED_FLOOR_US);
    // The frame's closing silence run on into the gap after it, or a recording that stopped there. It is
    // accepted at the cost of the whole tolerance, so that a row whose closing the recording does match, as a
    // pulse width family's is matched between two copies, is preferred over one that is merely not refuted.
    if (openEnd && last && !want.mark
      && (got === undefined || (!got.mark && got.us > want.us + room && got.us > GAP_US))) {
      sum += LEARNED_TOLERANCE;
      n += 1;
      break;
    }
    if (got === undefined || got.mark !== want.mark) return undefined;
    const off = Math.abs(got.us - want.us);
    if (off > room) return undefined;
    const share = off / want.us;
    sum += share;
    max = Math.max(max, share);
    n += 1;
  }
  return { mean: n === 0 ? 0 : sum / n, max };
}

/** The bits and values the readers find in a train, each a candidate to render a row at. */
interface Reading {
  readonly bits: number;
  readonly value: bigint;
  /** Whether the reading came from the biphase reader, whose readings may carry leading bits to trim. */
  readonly biphase: boolean;
}

/**
 * Every reading the codec's readers give of a learned train, under every convention they try.
 *
 * **Several, deliberately, and the rendering chooses.** Which half of a pair carries the bit, how many pairs
 * lead in, where a biphase payload starts and which way up its cells are, are each settled outside a reader by
 * what the family states, so every reading goes forward with its complement and the rendering against each row
 * decides which, if any, is that row's.
 */
function readingsOf(d: readonly Pulse[]): Reading[] {
  const out = new Map<string, Reading>();
  const add = (bits: number, value: bigint, biphase: boolean): void => {
    const mask = (1n << BigInt(bits)) - 1n;
    for (const v of [value, ~value & mask]) out.set(`${biphase}:${bits}:${v}`, { bits, value: v, biphase });
  };
  for (const headerPairs of [0, 1]) {
    for (const one of framesOfPulses(d, headerPairs)) add(one.bits, one.value, false);
    for (const one of framesOfSegments(d, headerPairs)) add(one.bits, one.value, false);
  }
  // **A recording loses a biphase frame's last half cell when that half is silence**: it runs straight into the
  // gap after the frame and the merge makes the two one interval, so the frame stops half a cell short and the
  // reader, which demands that the cells run out exactly at the gap, finds no frame. A stored record keeps the
  // half as a word of its own, which is why the reader never needed this. So the frame is also offered cut at
  // its gap with one half cell of silence put back, the half cell being the train's shortest interval, as the
  // reader's own is; the rendering against each row decides whether that half was there.
  const shortest = Math.min(...d.map((one) => one.us));
  const gap = d.findIndex((one) => !one.mark && one.us > BIPHASE_GAP_CELLS * shortest);
  const frame = gap < 0 ? d : d.slice(0, gap);
  for (const train of [d, [...frame, { mark: false, us: shortest }]]) {
    for (const one of biphaseFrames(train)) add(one.bits, one.value, true);
  }
  return [...out.values()];
}

/** The order rows are preferred in when two render a code equally closely: the more evidence, the earlier. */
const SOURCE_RANK: Readonly<Record<StatedProtocol['source'], number>> = {
  both: 0, compiled: 1, corpus: 2, stated: 3, documented: 4, learned: 5,
};

/** A learned code read as a row of the rhythm table, or as a row of our own fitted to it. */
export interface LearnedRow {
  /** `family` where the row is the table's own, `fitted` where it is ours, made for this code. */
  readonly kind: 'family' | 'fitted';
  readonly row: StatedProtocol;
  /** The width and the value the code states, as a code of the row writes them. */
  readonly bits: number;
  readonly value: bigint;
  /** How closely the row's rendering matches the code: the mean share an interval is off, and the largest. */
  readonly error: { readonly mean: number; readonly max: number };
  /**
   * Other rows of the table that render the code within tolerance too, closest first. Usually the same rhythm
   * under another family's name, which sends the same lamp; a caller that wants a particular name looks here.
   */
  readonly alternatives: readonly string[];
  /** On a fitted row, why no row of the table was taken. */
  readonly noFamily?: NoFamily;
}

/** Why no row of the table was taken for a learned code. */
export type NoFamily =
  /** No row at the code's carrier renders any reading of it within tolerance. */
  | 'no row renders it'
  /**
   * A row renders its first frame, but a later frame of the code carries another value, which a code of that
   * row would not send: a family whose codes state two values reads its first one as the whole command.
   */
  | 'a later frame carries another value';

/** Why no row of our own could be fitted to a learned code, and so why it goes raw. */
export type NoFit =
  /** No frame of two cell lengths reads after a lead in pair. */
  | 'no frame under a header'
  /** The code's opening pair is no longer than its cells, so it has no lead in to fit. */
  | 'no header'
  /** A pulse width code ends its last cell in a silence that is either the frame's padding or the end of the
   * recording, and with no second copy there is nothing to tell the two apart. */
  | 'no second copy to measure the frame period from'
  /** The fitted row, rendered back with the code's own tail, does not reproduce the code within tolerance. */
  | 'the fitted row does not reproduce the code';

/** A learned code that is sent raw, and why neither row route took it. */
export interface LearnedRaw {
  readonly kind: 'raw';
  readonly raw: string;
  readonly noFamily: NoFamily;
  readonly noFit: NoFit;
}

/**
 * Which row of the rhythm table a learned code is, with its value; else a row of our own fitted to it; else
 * its raw text, `rawOfLearned`.
 *
 * **The table first.** Every reading of the code is rendered at each row whose carrier is within
 * `LEARNED_CARRIER_TOLERANCE`, at the row's own width, and the row whose rendering of the first frame is closest
 * wins, ties going to the row with more evidence behind it. A reading wider than the row's width is trimmed from the
 * left only where it is biphase, whose reader cannot tell lead in cells from payload; a two cell reading has to be
 * the row's width exactly. Trimming those as well was measured on the calibration in `test/touch-learned.test.ts`
 * and is worse: at four per cent of jitter 7 more codes come back right and 24 more come back wrong, and at two
 * other seeds 9 more right against 26 and 18 more wrong. **Measured by hand and held by no test**, since holding
 * it would need the rejected rule kept in the code as an option. **A row is refused when a later frame of the
 * code reads as another value of the same width**, since the row's code would send its first value only.
 *
 * **Then a row of our own**, `fitRow`, where the code opens with a lead in pair and its frame is two cell
 * lengths: the means of what was read, with the code's own tail as literal words, so that the row renders
 * the whole code back. Its name is `name` when given, else `Learned <bits> Bit`, which is a name no family of
 * Logitech's catalogue has and which `statedCode` reads the width out of.
 *
 * **Else the raw text**, which every learned code has, with both reasons the routes before it gave up.
 *
 * Throws where the code cannot be sent by either route: a train with no burst of carrier, or a carrier that is
 * not a positive number.
 */
export function rhythmOfLearned(
  train: readonly Pulse[], carrierHz: number, options: { readonly name?: string } = {},
): LearnedRow | LearnedRaw {
  if (!(carrierHz > 0)) throw new Error(`a carrier of ${carrierHz} Hz is no carrier`);
  const d = fromFirstMark(mergedIntervals(train));
  if (d.length === 0) throw new Error('a learned code with no burst of carrier sends nothing');
  const family = familyOf(d, carrierHz);
  if (family.kind !== 'none') return family;
  const fit = fitRow(d, carrierHz, options.name);
  if (!('refusal' in fit)) return { ...fit, noFamily: family.noFamily };
  return { kind: 'raw', raw: rawOfLearned(train, carrierHz), noFamily: family.noFamily, noFit: fit.refusal };
}

/** The table route of `rhythmOfLearned`. */
function familyOf(d: readonly Pulse[], carrierHz: number):
  LearnedRow | { readonly kind: 'none'; readonly noFamily: NoFamily } {
  const periodNs = 1e9 / carrierHz;
  const readings = readingsOf(d);
  const matches: { row: StatedProtocol; bits: number; value: bigint; mean: number; max: number }[] = [];
  for (const row of PROTOCOLS) {
    if (!renderable(row)) continue;
    if (Math.abs(row.periodNs - periodNs) > LEARNED_CARRIER_TOLERANCE * row.periodNs) continue;
    const width = widthOfRow(row);
    if (width === undefined) continue;
    let best: { bits: number; value: bigint; mean: number; max: number } | undefined;
    for (const reading of readings) {
      if (reading.bits < width || (reading.bits > width && !reading.biphase)) continue;
      const value = reading.value & ((1n << BigInt(width)) - 1n);
      let rendered: Pulse[] | undefined;
      try { rendered = pulsesOfStatedRow(row, width, value); } catch { rendered = undefined; }
      if (rendered === undefined) continue;
      const near = closeness(rendered, d);
      if (near !== undefined && (best === undefined || near.mean < best.mean)) best = { bits: width, value, ...near };
    }
    if (best !== undefined) matches.push({ row, ...best });
  }
  if (matches.length === 0) return { kind: 'none', noFamily: 'no row renders it' };
  matches.sort((a, b) => a.mean - b.mean || SOURCE_RANK[a.row.source] - SOURCE_RANK[b.row.source]
    || b.row.codes - a.row.codes || a.row.family.localeCompare(b.row.family));
  const chosen = matches[0]!;
  // A later frame of another value. Only a two cell row is asked, since `framesOfSegments` reads two cell
  // frames and nothing else; its complement is the same frame read the other way up, so it is not another
  // value.
  if (chosen.row.biphase === undefined) {
    const mask = (1n << BigInt(chosen.bits)) - 1n;
    const same = new Set([chosen.value, ~chosen.value & mask]);
    const headerPairs = chosen.row.header !== undefined && chosen.row.header[0] === 0 ? 0 : 1;
    if (framesOfSegments(d, headerPairs).some((one) => one.bits === chosen.bits && !same.has(one.value))) {
      return { kind: 'none', noFamily: 'a later frame carries another value' };
    }
  }
  return {
    kind: 'family',
    row: chosen.row,
    bits: chosen.bits,
    value: chosen.value,
    error: { mean: chosen.mean, max: chosen.max },
    alternatives: matches.slice(1).map((one) => one.row.family),
  };
}

const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * A row of our own for a learned code no row of the table renders: its lead in pair, its two cell lengths and
 * its constant half as the means of what was read, and everything after the first frame as the row's blocks.
 *
 * **The blocks are the code itself**, so that the row is a statement of what was learned and can be checked
 * against it. After the first frame the code is walked: wherever the frame recurs within tolerance it is a
 * copy, and every other interval is a literal word, the closing mark, a gap, a short repeat frame of another
 * shape, whatever the original remote sent. The row is then rendered whole with the table's own block encoder,
 * `pulsesOfBlock`, and has to reproduce the code within `LEARNED_TOLERANCE` everywhere, which is what the
 * literal words make possible and the means make meaningful: a copy that strays shows there.
 *
 * **A pulse width code states `framePeriod`, measured as the first copy's own length up to the next burst**,
 * since the table renders that family's closing silence from it. With no second burst the closing silence and
 * the end of the recording are one interval and nothing separates them, so that is a refusal.
 */
function fitRow(d: readonly Pulse[], carrierHz: number, name: string | undefined):
  Omit<LearnedRow, 'noFamily'> | { readonly refusal: NoFit } {
  const reading = framesOfPulses(d, 1)[0];
  if (reading === undefined) return { refusal: 'no frame under a header' };
  const { bits, carries } = reading;
  const cells = d.slice(2, 2 + 2 * bits);
  const header: readonly [number, number] = [d[0]!.us, d[1]!.us];
  const marks = cells.filter((one) => one.mark).map((one) => one.us);
  if (header[0] < HEADER_FACTOR * Math.max(...marks)) return { refusal: 'no header' };
  // The carried half of each pair, split where the reader split it, and the constant half. On a pulse width
  // frame the last pair's silence is the closing and not a constant half.
  const at = carries === 'mark' ? 0 : 1;
  const mid = (reading.short + reading.long) / 2;
  const carried = cells.filter((_, i) => i % 2 === at).map((one) => one.us);
  const flats = (carries === 'mark' ? cells.slice(0, -1) : cells).filter((_, i) => i % 2 !== at).map((one) => one.us);
  const zero = Math.round(mean(carried.filter((us) => us <= mid)));
  const one = Math.round(mean(carried.filter((us) => us > mid)));
  const flat = Math.round(mean(flats));
  let framePeriod: number | undefined;
  if (carries === 'mark') {
    if (d[2 + 2 * bits] === undefined) return { refusal: 'no second copy to measure the frame period from' };
    framePeriod = d.slice(0, 2 + 2 * bits).reduce((n, p) => n + p.us, 0);
  }
  const frame = {
    family: name ?? `Learned ${bits} Bit`,
    periodNs: periodOfCarrier(carrierHz),
    header: [Math.round(header[0]), Math.round(header[1])] as const,
    flat, zero, one, carries,
    ...(framePeriod === undefined ? {} : { framePeriod }),
  };
  const timings = timingsOf({ ...frame, codes: 1, exact: 0, spread: 0, source: 'learned' })!;
  // A copy as `pulsesOfBlock` emits it, which on a pulse width frame is without its closing silence: that is
  // the tail's, a literal word here. Merged, so that its length counts the intervals a recording holds.
  const copy = mergedIntervals(pulsesOfBlock({ timings }, [{ bits, value: reading.value }], { items: [{ copy: 'full' }] }));
  const items: Item[] = [{ copy: 'full' }];
  let words: number[] = [];
  const flush = (): void => {
    if (words.length > 0) items.push({ words });
    words = [];
  };
  for (let p = copy.length; p < d.length;) {
    if (d[p]!.mark && closeness(copy, d.slice(p), false) !== undefined) {
      flush();
      items.push({ copy: 'full' });
      p += copy.length;
      continue;
    }
    // A literal word, signed as the table writes them, positive a mark. One word per interval, however long:
    // the table's own rows spell a long silence in words of the stored width because they were read off stored
    // records, and every reader of a row joins words of one kind, so the spelling carries nothing.
    words.push(d[p]!.mark ? Math.round(d[p]!.us) : -Math.round(d[p]!.us));
    p += 1;
  }
  flush();
  // The whole code rendered back, before the stored microsecond below is put on: this is the check that the row
  // is what was learned.
  const block = pulsesOfBlock({ timings }, [{ bits, value: reading.value }], { items });
  const near = closenessWhole(block, d);
  if (near === undefined) return { refusal: 'the fitted row does not reproduce the code' };
  // **One repetition, `held`, is the first copy and what followed it up to the next**, the closing mark and the
  // gap: what a held key repeats, as far as one recording shows it. **`tail`, the whole first transmission, is
  // the code itself**, and is left out where it is that one repetition. Both in the table's stored form, their
  // last duration one microsecond longer than the signal, which is how every row of the table states a block
  // and how `definition.ts` reads one back.
  const second = items.findIndex((one, i) => i > 0 && 'copy' in one);
  const held = stored(second < 0 ? items : items.slice(0, second));
  const row: StatedProtocol = {
    ...frame,
    held: { items: held },
    ...(second < 0 ? {} : { tail: { items: stored(items) } }),
    codes: 1, exact: 0, spread: Math.round(near.max * 1e4) / 1e4, source: 'learned',
  };
  return { kind: 'fitted', row, bits, value: reading.value, error: near, alternatives: [] };
}

type Item = BlockTail['items'][number];

/** A block in the table's stored form: its last word one microsecond longer, its level kept. */
function stored(items: readonly Item[]): Item[] {
  const out = [...items];
  const last = out[out.length - 1];
  if (last !== undefined && 'words' in last && last.words.length > 0) {
    const words = [...last.words];
    const end = words[words.length - 1]!;
    words[words.length - 1] = end + Math.sign(end);
    out[out.length - 1] = { words };
  }
  return out;
}

/** `closeness` over two whole trains: the same length after the merge, and no leniency at the end. */
function closenessWhole(rendered: readonly Pulse[], learned: readonly Pulse[]): { mean: number; max: number } | undefined {
  const r = fromFirstMark(mergedIntervals(rendered));
  if (r.length !== learned.length) return undefined;
  return closeness(r, learned, false);
}
