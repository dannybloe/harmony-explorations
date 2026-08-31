/**
 * Pronto Hex, read and written.
 *
 * **What a Pronto string is.** An infrared command is a lamp blinking in a precise rhythm, and the
 * durations of those blinks are what a remote stores. Pronto Hex is the interchange spelling of the
 * same thing, and it was Philips's before it was everybody's: a run of four digit hexadecimal words,
 * the first four of them a header and the rest alternating a mark and a space.
 *
 * ```
 * 0000 006D 0022 0002   the header: learned format, the carrier, then two burst counts
 * 0157 00AB 0016 0015   the bursts, mark then space, mark then space
 * ```
 *
 * **A duration is a count of carrier cycles and not a number of microseconds**, which is the one thing
 * a reader has to get right. The second word states the carrier as `round(1e6 / (hz * 0.241246))`, and
 * every later word is a multiple of that same clock. So two waveforms are compared **in Pronto units**:
 * converting to microseconds first and comparing there introduces a rounding of our own on top of
 * theirs and turns an exact agreement into a near one.
 *
 * **The two sections are a once and a repeat**, whose lengths in **pairs** are the third and fourth
 * words. A player sends the first section, then loops the second for as long as the key is held, which
 * is the same division our own block pair makes: a first block and a held block.
 *
 * Only the `0000` learned format is handled. `0100` is the raw unmodulated variant and there is no
 * reason to grow one here until something needs it.
 */

/** Microseconds per Pronto unit at a carrier word of 1, which is Philips's constant. */
export const PRONTO_CLOCK = 0.241246;

/** A Pronto string read into its two sections, in Pronto units rather than in microseconds. */
export interface ProntoCode {
  /** The carrier word as written, which is what every duration is a multiple of. */
  readonly carrier: number;
  /** The carrier in Hz, derived from that word. */
  readonly hz: number;
  /** Microseconds per unit, which is the carrier word times the clock. */
  readonly unitUs: number;
  /** The first section, one signed value per interval, positive a mark and negative a space. */
  readonly once: readonly number[];
  /** The looping section, empty where the string states none. */
  readonly repeat: readonly number[];
}

/** The carrier word for a frequency, which is what a Pronto header's second word holds. */
export function prontoCarrier(hz: number): number {
  return Math.round(1e6 / (hz * PRONTO_CLOCK));
}

/**
 * Read a Pronto string, or undefined where it is not a well formed learned code.
 *
 * Refused rather than repaired: a wrong word count, a format other than `0000`, a carrier of zero, or
 * a section whose stated pair count does not match the words present. A silent repair here would show
 * up later as a waveform that disagrees for a reason nobody could find.
 */
export function readPronto(text: string): ProntoCode | undefined {
  const words: number[] = [];
  for (const one of text.trim().split(/\s+/)) {
    if (!/^[0-9A-Fa-f]{1,4}$/.test(one)) return undefined;
    words.push(parseInt(one, 16));
  }
  if (words.length < 4) return undefined;
  if (words[0] !== 0) return undefined;
  const carrier = words[1]!;
  if (carrier === 0) return undefined;
  const pairs = [words[2]!, words[3]!];
  if (4 + 2 * (pairs[0]! + pairs[1]!) !== words.length) return undefined;
  // Odd indices are spaces. The header's four words are not part of the alternation.
  const signed = words.slice(4).map((v, at) => (at % 2 === 0 ? v : -v));
  const unitUs = carrier * PRONTO_CLOCK;
  return {
    carrier,
    hz: 1e6 / unitUs,
    unitUs,
    once: signed.slice(0, 2 * pairs[0]!),
    repeat: signed.slice(2 * pairs[0]!),
  };
}

/**
 * A pulse train in Pronto units, ready to compare against a section of a Pronto string.
 *
 * Two things happen here and both are needed for a comparison to mean anything. Adjacent intervals of
 * the same level are **merged**, because a block states a trailer and a gap as separate words where the
 * wire carries one space, and a zero length interval is dropped. Then each duration is rounded to the
 * nearest unit, which is what their renderer does, so a disagreement is a disagreement about the
 * signal rather than about rounding.
 */
export function prontoUnits(
  pulses: readonly { readonly mark: boolean; readonly us: number }[], unitUs: number,
): number[] {
  const merged: number[] = [];
  for (const one of pulses) {
    if (one.us === 0) continue;
    const value = one.mark ? one.us : -one.us;
    const last = merged[merged.length - 1];
    if (last !== undefined && Math.sign(last) === Math.sign(value)) merged[merged.length - 1] = last + value;
    else merged.push(value);
  }
  // **No Pronto word is ever zero, and that is not rounding but a floor.** A word states a count of
  // carrier cycles, and a count of zero states no interval at all, which would silently merge the two
  // neighbours around it. So a duration shorter than half a unit still costs one: `Nokia 11 Bit` carries
  // a 20 microsecond mark at a 15.3 kHz carrier, where one unit is 65 microseconds, and Logitech's own
  // renderer writes 1 for it on all 149 of its commands. Section 230.
  return merged.map((v) => Math.sign(v) * Math.max(1, Math.round(Math.abs(v) / unitUs)));
}

/**
 * A train padded out to whole pairs, which is the form a Pronto section takes.
 *
 * A Pronto section is counted in **pairs**, so a transmission whose last interval is a mark needs a
 * space after it. Logitech's renderer writes **one unit** there rather than zero, consistent with the
 * floor above, and the value carries no signal: it is the shortest space that can be written down. A
 * comparison passes both sides through this so a family whose trailer ends on a mark is not reported as
 * a disagreement about its final space.
 */
export function prontoPairs(units: readonly number[]): number[] {
  const out = [...units];
  if (out.length % 2 === 1) out.push(-1);
  return out;
}

/** Render a pulse train as a Pronto string, the once section and the looping one. */
export function writePronto(
  hz: number,
  once: readonly { readonly mark: boolean; readonly us: number }[],
  repeat: readonly { readonly mark: boolean; readonly us: number }[] = [],
): string {
  const carrier = prontoCarrier(hz);
  const unitUs = carrier * PRONTO_CLOCK;
  const [a, b] = [prontoUnits(once, unitUs), prontoUnits(repeat, unitUs)];
  const [pa, pb] = [prontoPairs(a), prontoPairs(b)];
  const word = (v: number): string => Math.abs(v).toString(16).toUpperCase().padStart(4, '0');
  return [0, carrier, pa.length / 2, pb.length / 2, ...pa, ...pb].map(word).join(' ');
}
