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
  /**
   * True where a word was wider than the format's four hexadecimal digits, which is a defect in
   * whoever wrote the string rather than a variant of it. Section 233.
   *
   * A Pronto word is a 16 bit field. The value is read anyway, since it is unambiguous and refusing it
   * loses a comparison over somebody else's overflow, and this flag is what keeps that visible rather
   * than quietly widening the format.
   */
  readonly overlong: boolean;
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
  // **A word wider than four hexadecimal digits is accepted and reported**, section 233. A Pronto word
  // is a 16 bit field, so five digits is not the format; the archive's renderer writes one anyway on
  // 119 commands over three families, `5C3F2` being 378354 units of gap where 65535 is the ceiling. The
  // number is still unambiguous, and refusing the string threw away a comparison of our own encoder
  // over a defect on their side, so the value is read and `overlong` says the string was not legal.
  let overlong = false;
  for (const one of text.trim().split(/\s+/)) {
    if (!/^[0-9A-Fa-f]{1,6}$/.test(one)) return undefined;
    if (one.length > 4) overlong = true;
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
    overlong,
  };
}

/**
 * A pulse train in Pronto units, ready to compare against a section of a Pronto string.
 *
 * Two things happen here and both are needed for a comparison to mean anything. Adjacent intervals of
 * the same level are **merged**, because a block states a trailer and a gap as separate words where the
 * wire carries one space. Then each duration is rounded to the nearest unit, which is what their
 * renderer does, so a disagreement is a disagreement about the signal rather than about rounding. A
 * zero length interval is **kept**, section 233, and this said it was dropped.
 */
export function prontoUnits(
  pulses: readonly { readonly mark: boolean; readonly us: number }[], unitUs: number,
): number[] {
  const merged: number[] = [];
  // **A zero length interval is kept, and the merge keys on the pulse's own polarity rather than on the
  // sign of its duration**, section 233. Both halves were wrong and each hid the other. A zero was
  // skipped outright, which contradicted the floor twenty lines below: that floor exists precisely so a
  // word of zero cannot silently merge its two neighbours, and skipping the interval performed the merge
  // the floor was there to prevent. And a zero duration has no sign, so once it was kept it merged with
  // whatever came before it regardless of which side of the carrier it was on. Logitech's own renderer
  // answers both cases and the nine `QE` test patterns are where it says so: a zero mark between two
  // spaces cannot merge and is rendered `1`, and a zero space before another space merges and adds
  // nothing to it.
  // The polarity is carried beside the duration for the whole of this function rather than taken from
  // its sign, since a zero has no sign and the whole point is that a zero interval keeps its side.
  const marks: boolean[] = [];
  for (const one of pulses) {
    if (marks[marks.length - 1] === one.mark) merged[merged.length - 1]! += one.us;
    else { merged.push(one.us); marks.push(one.mark); }
  }
  // **A section never opens on a space, so a leading one is dropped.** The format's first burst word is
  // a mark by construction, and silence before a transmission carries nothing a receiver could time
  // from. It matters for a family whose cell states its carried half first: its repeat group opens on
  // the first bit's own space, and Logitech's renderer drops it, which their README states as the rule.
  // One consequence worth knowing rather than hiding: **their repeat section for such a family cannot be
  // played back correctly**, the first bit having gone with the space. Our block keeps it, and the
  // comparison is made on their spelling.
  while (marks.length > 0 && !marks[0]!) { merged.shift(); marks.shift(); }
  // **No Pronto word is ever zero, and that is not rounding but a floor.** A word states a count of
  // carrier cycles, and a count of zero states no interval at all, which would silently merge the two
  // neighbours around it. So a duration shorter than half a unit still costs one: `Nokia 11 Bit` carries
  // a 20 microsecond mark at a 15.3 kHz carrier, where one unit is 65 microseconds, and Logitech's own
  // renderer writes 1 for it on all 149 of its commands. Section 230.
  return merged.map((us, at) => (marks[at]! ? 1 : -1) * Math.max(1, Math.round(us / unitUs)));
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
