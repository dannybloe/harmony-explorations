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
 * **This is a decoder and not an encoder.** Going the other way needs the protocol, because the timings,
 * the header, the repeat and the trailing gap are all protocol facts that the bits do not carry.
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

/** A mark or a space, in microseconds. */
interface Pulse {
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
 * Every bit duration in the corpus is under 1800 us and every terminator is 32767, so the threshold
 * has three orders of magnitude of room and is not tuned.
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
 * The header is skipped as `headerPairs` whole pairs, which is one in every record here: Sony leads
 * with 2400 and 600, and the two 48 bit families with about 3400 and 1700. A protocol with no header
 * would need zero, so the parameter exists rather than the constant being wired in.
 */
export function irFrame(
  c: Container,
  record: number,
  headerPairs = 1,
): IrFrame | undefined {
  const readings = irFrames(c, record, headerPairs);
  return readings.length === 1 ? readings[0] : undefined;
}

/** Every convention under which a record's first block reads as a frame, which is one or none here. */
export function irFrames(c: Container, record: number, headerPairs = 1): IrFrame[] {
  const first = irHeaderPointers(c, record)[0];
  if (!first) return [];
  const words = irBlockWords(c, first);
  if (!words) return [];
  const d = pulses(words);
  const out: IrFrame[] = [];
  for (const carries of ['mark', 'space'] as const) {
    const one = decode(d, carries, headerPairs);
    if (one) out.push(one);
  }
  return out;
}

/** A frame as the key a lookup against an external catalogue of named commands uses. */
export function frameKey(f: IrFrame): string {
  return `${f.bits}:${f.value.toString(16)}`;
}
