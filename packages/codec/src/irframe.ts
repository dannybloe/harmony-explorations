/**
 * Turning a stored pulse train back into the bit frame a device sees, `docs/findings.md` section 133.
 *
 * `ir.ts` reads a record as durations, which is what the firmware sends and therefore all the format
 * work needed. This module goes one level up and is deliberately **protocol agnostic**: consumer
 * infrared encodes a bit in the length of one half of a mark and space pair, so recovering the bits
 * needs to know which half carries the length and nothing else. It does not name the protocol, decode
 * an address or a command, or check a parity bit.
 *
 * Why that is worth having. A duration stream can be compared to another duration stream and to
 * nothing else, so two codes are either byte identical or unrelated. A **frame** can be compared to a
 * number written down somewhere else, which is what made section 133 possible: the frames a config
 * carries were matched against a catalogue of named commands, and a scan code got the name of the
 * button that sends it. It is also the first half of what learning a code needs, since what comes off
 * the remote during a capture is a duration stream too, section 98.
 *
 * **It decodes and it encodes the frame, and only the frame.** This said "this is a decoder and not an
 * encoder" until 23 August 2026, on the reasoning that going the other way needs the protocol because
 * the timings, the header, the repeat and the trailing gap are protocol facts the bits do not carry.
 * Half of that is measured and wrong, section 152: a record states its own timings, so the frame comes
 * back from five durations read off the record itself, exactly, on every one of the 3547 records in
 * the corpus that read as a frame. What the bits genuinely do not carry is everything **after** the
 * frame, the closing mark and the silence, and that stays undecided rather than being guessed at, so
 * `pulsesOfFrame` returns the frame and stops there.
 */
import type { Container } from './gspm.ts';
import { IR_PULSE_MARK, IR_PULSE_MAX, irBlockWords, irHeaderPointers } from './ir.ts';

/** Which half of a mark and space pair carries the bit. */
export type FrameCarrier = 'mark' | 'space';

export interface IrFrame {
  /** How many bits the train encodes. */
  bits: number;
  /**
   * The bits as one integer, first transmitted bit in the most significant position.
   *
   * A `bigint` because 48 bit frames are ordinary here: two of the three protocol families in the
   * calibration account are 48 bits, which a `number` cannot hold exactly above 2 to the 53.
   */
  value: bigint;
  carries: FrameCarrier;
  /** The short and the long duration the split was made on, in microseconds, for a caller that wants
   *  to sanity check the decode against a protocol it already knows. */
  short: number;
  long: number;
}

/**
 * A mark or a space, in microseconds.
 *
 * Exported since 22 August 2026, because FreeHarmony holds a command's durations in exactly this shape
 * and needed to frame them. It could not: every entry point here took a container and a record number,
 * so the only way to reuse the decoder was to copy it, and a second copy of a derivation is the one
 * thing this workspace refuses. `framesOfPulses` is the entry point that fixed that.
 */
export interface Pulse {
  mark: boolean;
  us: number;
}

/**
 * The words of a record's first block as pulses, from the first mark.
 *
 * The leading words are a gap: a block commonly starts with one or more `0x7FFF` spaces and then a
 * shorter one, which is the silence a receiver needs before the header. Starting at the first mark
 * drops all of it without having to know how many words it took.
 */
function pulses(words: readonly number[]): Pulse[] {
  const first = words.findIndex((w) => w & IR_PULSE_MARK);
  return first < 0
    ? []
    : words.slice(first).map((w) => ({ mark: !!(w & IR_PULSE_MARK), us: w & IR_PULSE_MAX }));
}

/**
 * A duration above this is a gap rather than a bit, so it ends the frame.
 *
 * **Both thresholds are tuned, and this said they are not.** The claim was "every bit duration in the
 * corpus is under 1800 us and every terminator is 32767, so the threshold has three orders of
 * magnitude of room", and the terminator is not what either constant separates a bit from. Measured
 * over every record the reader frames: the largest duration actually consumed as a bit is **1850**, in
 * 20 records, and the smallest duration at or above 2000 anywhere in a framed record's block is
 * **2230**. So `TRAILING_GAP_US` sits 7.5% above the largest bit and 10% below the smallest gap, which
 * is a real margin and a narrow one: a device whose long bit runs 8% above this population truncates
 * its own frame.
 *
 * `GAP_US` keeps its 53.8% margin against the same 1850, and the corpus does hold durations of exactly
 * 4000, which the strict `>` admits as a bit. None of them is in a framed record today. The numbers
 * are asserted in `test/irframe.test.ts` so widening either constant has to be a decision rather than
 * a habit.
 */
const GAP_US = 4000;
/** The other half of a pair being this long also ends the frame, which is how a pulse width protocol
 *  such as Sony terminates: the marks stay short and the final space is the gap. */
const TRAILING_GAP_US = 2000;
/** Fewer bits than this and it is not a frame. */
const MIN_BITS = 8;
/**
 * The long duration has to be at least this multiple of the short one for the two to be populations
 * rather than jitter. The real ratios here are 2.0 for Sony and 2.9 for the two 48 bit families, so
 * the test separates a frame from a train of equal marks by a wide margin, and a train of equal
 * marks is exactly what the wrong convention produces.
 */
const SPLIT_RATIO = 1.4;

/**
 * Decode a pulse train under one convention, or `undefined` if it does not read as a frame.
 *
 * Two mistakes are worth naming because both produced a decoder that matched nothing at all while
 * looking correct:
 *
 * The **terminator is not a bit.** A 48 bit frame ends with a pair whose space is 32767, and counting
 * that pair gave 49 bits, which matched no catalogue entry. Hence the `GAP_US` test **before** the
 * push.
 *
 * The **trailing gap arrives with the last bit, not instead of it.** A Sony frame's final bit is a
 * mark followed by the long gap, so testing the other half before pushing dropped the last bit and
 * made every 12 bit frame read as 11. Hence the `TRAILING_GAP_US` test **after** the push. The two
 * tests look redundant and are the opposite: one guards the measured half and one the other half.
 */
function decode(d: readonly Pulse[], carries: FrameCarrier, headerPairs: number): IrFrame | undefined {
  const durations: number[] = [];
  for (let i = 2 * headerPairs; i + 1 < d.length; i += 2) {
    const mark = d[i];
    const space = d[i + 1];
    // A pair that is not mark then space means the alternation broke, so whatever follows is not
    // this frame.
    if (!mark || !space || !mark.mark || space.mark) break;
    const measured = carries === 'mark' ? mark.us : space.us;
    const other = carries === 'mark' ? space.us : mark.us;
    if (measured > GAP_US) break;
    durations.push(measured);
    if (other > TRAILING_GAP_US) break;
  }
  if (durations.length < MIN_BITS) return undefined;
  const short = Math.min(...durations);
  const long = Math.max(...durations);
  if (long < short * SPLIT_RATIO) return undefined;
  const mid = (short + long) / 2;
  let value = 0n;
  for (const us of durations) value = (value << 1n) | (us > mid ? 1n : 0n);
  return { bits: durations.length, value, carries, short, long };
}

/**
 * The frame a record's first block encodes, or `undefined` where it does not read as one.
 *
 * **The convention selects itself and that is the closure this rests on.** Under the wrong one every
 * measured duration is the constant half of the pair, so `SPLIT_RATIO` rejects it: a pulse width
 * protocol read as pulse distance yields a train of identical spaces. So the caller does not have to
 * know the protocol family, and a record that decodes under both conventions is a warning rather
 * than a result. `irFrames` returns every reading so that a caller can see such a case.
 *
 * The header is skipped as `headerPairs` whole pairs, one by default: Sony leads with 2400 and 600,
 * and the two 48 bit families with about 3400 and 1700. A protocol with no header would need zero, so
 * the parameter exists rather than the constant being wired in.
 *
 * **Whether one is right for every record here is open**, and the wording was "which is one in every
 * record here", which is a claim nothing checks. A structural test of it was tried on 13 August 2026
 * and was wrong in its own premise, taking a block's marks and spaces to alternate by position when
 * the flag is in the word: the first block of a Harmony One record can open with fourteen spaces of
 * 32767, which is a leading gap and neither a header nor a bit. So the question stands, and what would
 * settle it is a record whose frame is named outside this codec, which the calibration pair provides
 * for two configs and nothing provides for the rest.
 */
export function irFrame(
  c: Container,
  record: number,
  headerPairs = 1,
): IrFrame | undefined {
  const readings = irFrames(c, record, headerPairs);
  return readings.length === 1 ? readings[0] : undefined;
}

/**
 * Every convention under which a record's first block reads as a frame.
 *
 * **Usually one, sometimes both, often none**, and this said "which is one or none here" while the
 * test two files over asserted 3547 one, 148 both and 935 none. The 148 are the point of returning a
 * list rather than a value: a record that decodes under both conventions is a warning, and `irFrame`
 * refuses it for exactly that reason. A summary of a closure that contradicts the test proving it, in
 * the direction of over-claiming, is the shape this repository keeps finding in its own prose.
 */
export function irFrames(c: Container, record: number, headerPairs = 1): IrFrame[] {
  const first = irHeaderPointers(c, record)[0];
  if (!first) return [];
  const words = irBlockWords(c, first);
  if (!words) return [];
  return framesOfPulses(pulses(words), headerPairs);
}

/**
 * The same, from a pulse train somebody already has.
 *
 * **The one entry point that does not need a container**, and it exists because a caller turned up that
 * has the durations and not the file: FreeHarmony keeps a command's marks and spaces in its own model,
 * copied out of a config at import, and wanted the frame so it could be matched against a catalogue of
 * named commands. Without this the only route was a second decoder, which is the state this workspace's
 * oldest rule is about. `irFrames` above is now a thin wrapper over it, so there is one decoder and a
 * test asserts the two agree on every record in the corpus.
 *
 * The leading gap is trimmed here rather than by the caller, since a block commonly opens with several
 * 32767 spaces and knowing that is knowing the format.
 */
export function framesOfPulses(train: readonly Pulse[], headerPairs = 1): IrFrame[] {
  const d = fromFirstMark(train);
  const out: IrFrame[] = [];
  for (const carries of ['mark', 'space'] as const) {
    const one = decode(d, carries, headerPairs);
    if (one) out.push(one);
  }
  return out;
}

/**
 * A pulse train from its first mark, which is where a frame starts.
 *
 * Exported so that the encoder below and the decoder above agree about it. A block commonly opens with
 * several 32767 spaces and then a shorter one, and two copies of that rule are two copies.
 */
export function fromFirstMark(train: readonly Pulse[]): readonly Pulse[] {
  const first = train.findIndex((one) => one.mark);
  return first < 0 ? [] : train.slice(first);
}

/**
 * The durations a frame is built out of, in microseconds, section 152.
 *
 * **Five numbers, and they come off the record rather than out of a protocol table.** That is the
 * finding: a stored record states its own timings, so nothing here has to know what a Panasonic or an
 * NEC frame looks like in order to write one. What it cannot do is invent them, which is the shape of
 * the problem FreeHarmony has with Logitech's catalogue: that service states a protocol family and a
 * frame value and no durations at all, so the timings have to come from a record of the same family
 * that some configuration already holds.
 */
export interface FrameTimings {
  /**
   * The header: a mark, and the space between it and the first bit.
   *
   * **`[0, 0]` means the protocol has none**, which is not a tidy sentinel but the only shape some
   * families come in: the Sharp scheme opens on its first bit with no lead in at all, so a table
   * entry for it has to be able to say so. A decoded record never carries it, because a duration
   * read off a config is a real pulse and therefore positive.
   */
  header: readonly [number, number];
  /** The half of every pair that carries no bit, and is one length throughout. */
  flat: number;
  /** The carried half's length for a zero bit, and for a one bit. */
  zero: number;
  one: number;
  carries: FrameCarrier;
  /**
   * The space that closes the last pair, where the bit is in the mark.
   *
   * **A pulse width frame's last space is a trailing gap and not a bit cell**, and reading it as one is
   * what made 200 records of the corpus look as though their timings did not split: 112 of twelve bits
   * and 88 of fifteen, all of them in the two configurations Logitech compiled to our own
   * specification, all with two values in the half that is supposed to be constant. The second value
   * was always the last one. So it is one number more for that convention and not a defect, and it is
   * absent for a pulse distance frame, where the last space is an ordinary bit.
   */
  closing?: number;
}

/**
 * The timings a record's own frame was built with, or `undefined` where they do not split.
 *
 * They split on every framed record in the corpus, so this returning `undefined` is a claim about a
 * record and not a limitation here: it means the half that should be constant is not, which would be
 * a protocol this corpus does not hold.
 */
export function timingsOfFrame(
  train: readonly Pulse[],
  frame: IrFrame,
  headerPairs = 1,
): FrameTimings | undefined {
  const d = fromFirstMark(train);
  const cells = d.slice(2 * headerPairs, 2 * headerPairs + 2 * frame.bits);
  if (cells.length !== 2 * frame.bits) return undefined;
  const at = frame.carries === 'mark' ? 0 : 1;
  const carried = new Set(cells.filter((_, i) => i % 2 === at).map((p) => p.us));
  // Every pair but the last contributes its flat half. The last pair's other half closes the frame,
  // and on a pulse width protocol that is the trailing gap rather than another cell of the same length.
  const flat = new Set(cells.slice(0, -1).filter((_, i) => i % 2 !== at).map((p) => p.us));
  if (flat.size !== 1 || carried.size > 2 || carried.size === 0) return undefined;
  const lengths = [...carried].sort((a, b) => a - b);
  const header = d.slice(0, 2 * headerPairs);
  if (header.length !== 2 * headerPairs) return undefined;
  const base = {
    header: [header[0]!.us, header[1]!.us] as const,
    flat: [...flat][0]!,
    zero: lengths[0]!,
    one: lengths[lengths.length - 1]!,
    carries: frame.carries,
  };
  // `exactOptionalPropertyTypes`, so the field is present or it is not there at all.
  return frame.carries === 'mark'
    ? { ...base, closing: cells[cells.length - 1]!.us }
    : base;
}

/**
 * The pulse train a frame and its timings make, which is the encoder.
 *
 * **The frame and nothing after it.** A record's block holds the frame one, three, seven, eleven or
 * thirty times over, with a gap between the copies and a closing silence at the end, and none of that
 * follows from the bits: it is 151 distinct shapes across the corpus. So this stops where the evidence
 * does, and a caller that wants a whole block copies the rest from a record that already has one.
 *
 * Refuses a pulse width frame with no closing space rather than falling back on `flat`, because that
 * would emit a frame no remote in the corpus has ever stored.
 */
export function pulsesOfFrame(t: FrameTimings, bits: number, value: bigint): Pulse[] {
  if (t.carries === 'mark' && t.closing === undefined) {
    throw new Error('a pulse width frame needs the space that closes its last pair');
  }
  // A zero length header is no header, and emitting it as two pulses of zero would put a pair in the
  // train that no receiver could see and that our own decoder would then read as a bit cell.
  const out: Pulse[] = t.header[0] === 0 && t.header[1] === 0
    ? []
    : [{ mark: true, us: t.header[0] }, { mark: false, us: t.header[1] }];
  for (let i = bits - 1; i >= 0; i -= 1) {
    const carried = (value >> BigInt(i)) & 1n ? t.one : t.zero;
    if (t.carries === 'mark') {
      out.push({ mark: true, us: carried });
      out.push({ mark: false, us: i === 0 ? t.closing! : t.flat });
    } else {
      out.push({ mark: true, us: t.flat });
      out.push({ mark: false, us: carried });
    }
  }
  return out;
}

/** A frame as the key a lookup against an external catalogue of named commands uses. */
export function frameKey(f: IrFrame): string {
  return `${f.bits}:${f.value.toString(16)}`;
}
