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
 *
 * **It was 4000 and a real protocol broke it**, section 161, and 8000 is measured rather than picked.
 * `JerroldO1 16 Bit` carries a set bit as a space of **4505**, so every record of it read as nothing at
 * all. Over every record that frames, in the nineteen containers and in the compiled sample, the longest
 * duration consumed as a bit is **3480** and the smallest that **ends** a frame is **15300**, so the
 * window between them holds nothing and 4505 sits inside it. This keeps a factor of 2.3 above the
 * longest bit and 1.9 below the smallest gap, where 4000 had 1.15 above and sat **below** a real bit.
 *
 * **Raising it alone would have been worse than leaving it**, which is why it took two goes: 45 records
 * of three arch 8 (Harmony 880) configs carry a mid frame gap of **4480**, twenty five microseconds
 * below Jerrold's set bit, and at 8000 they read as a plausible sixteen bit frame they are not. No
 * constant separates those two cases. `oneFlatLength` below is what does, and it has to be in place for
 * this value to be safe.
 *
 * What stops the headerless convention swallowing a lead in now that 4490 is under the threshold is
 * `TRAILING_GAP_US` on the other half: a header's mark is thousands of microseconds, so the pair is
 * consumed and the walk stops one bit in, which is under `MIN_BITS`.
 */
const GAP_US = 8000;
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
/**
 * Whether the half of the pair that carries no bit is one length, as a frame's definition requires.
 *
 * **This is the structural test no duration threshold can do**, section 163. `GAP_US` had to rise to
 * read a protocol whose set bit is a 4505 space, and 45 biphase records of three arch 8 (Harmony 880)
 * configs carry a mid frame gap of 4480, so a constant cannot tell the two apart. This can: a Jerrold
 * record's marks are 495 throughout while its spaces take two lengths, which is what a pulse distance
 * frame **is**, and those 45 take 840 and 1680 in both halves, which is what biphase is.
 *
 * `timingsOfFrame` has always demanded a constant non carrying half of the encoder side, so this is the
 * decoder agreeing with the encoder beside it rather than a new rule.
 *
 * The opening one may differ, which is `firstMark` and is measured rather than tolerated: the Sharp
 * family opens at 270 against 260 for every later cell.
 *
 * **What it cost is written down in section 163**: the 148 records that used to read under **both**
 * conventions now read under none, so the biconditional that identified a two pointer group record by
 * that ambiguity, section 134, holds in one direction only. Those records are biphase and `biphaseFrames`
 * reads them, which is why the loss is acceptable and not free.
 *
 * **It demanded exact equality until 24 August 2026 and that was too strict**, section 165. Logitech's
 * own generator emits a flat half of 433 on one cell and 434 on the next, and it emits a Pioneer code
 * whose mark is 560 before a short space and 594 before a long one, so ten records of the compiled
 * sample read as nothing at all. The test is now that the flat half does not **split**, by the same
 * `SPLIT_RATIO` the carried half has to split by, which makes the two halves' rules complementary
 * rather than one exact and one a ratio.
 *
 * The margin is measured and it is wide: over the corpus and the compiled sample, the largest flat
 * spread among the records this admits is **6.1%** and the smallest among everything it still refuses is
 * **100%**, which is a biphase code's two halves in a two to one ratio. Nothing at all lies between
 * 1.061 and 2.0, and the threshold is 1.4.
 */
function oneFlatLength(flats: readonly number[]): boolean {
  // The opening one may differ by any amount, which is `firstMark` and is a protocol's longer first
  // burst rather than jitter.
  const tail = flats.slice(1);
  if (tail.length === 0) return true;
  return Math.max(...tail) < Math.min(...tail) * SPLIT_RATIO;
}

function decode(d: readonly Pulse[], carries: FrameCarrier, headerPairs: number,
  gapUs = GAP_US): IrFrame | undefined {
  const durations: number[] = [];
  // The other half of every pair, so the frame can be required to have a constant one. The pair that
  // ends the frame is left out: on a pulse width protocol its other half is the trailing gap.
  const flats: number[] = [];
  for (let i = 2 * headerPairs; i + 1 < d.length; i += 2) {
    const mark = d[i];
    const space = d[i + 1];
    // A pair that is not mark then space means the alternation broke, so whatever follows is not
    // this frame.
    if (!mark || !space || !mark.mark || space.mark) break;
    const measured = carries === 'mark' ? mark.us : space.us;
    const other = carries === 'mark' ? space.us : mark.us;
    if (measured > gapUs) break;
    durations.push(measured);
    if (other > TRAILING_GAP_US) break;
    flats.push(other);
  }
  if (durations.length < MIN_BITS) return undefined;
  if (!oneFlatLength(flats)) return undefined;
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
 *
 * **Adjacent durations of one kind are merged first**, section 164, because two words of the same kind
 * in a row are one interval and a receiver cannot see the join. Reading them unmerged gave 45 records
 * of three arch 8 (Harmony 880) configs an eight bit frame they do not have, all 45 reading the same
 * value, which forty five different commands cannot be. It costs those 45 and nothing else across the
 * corpus, since requiring a constant non carrying half already refuses everything else the merge
 * changes.
 */
export function framesOfPulses(train: readonly Pulse[], headerPairs = 1, gapUs?: number): IrFrame[] {
  const d = fromFirstMark(mergedIntervals(train));
  const out: IrFrame[] = [];
  for (const carries of ['mark', 'space'] as const) {
    const one = decode(d, carries, headerPairs, gapUs);
    if (one) out.push(one);
  }
  return out;
}

/**
 * The gap bound a segment earns once the real gaps have been cut away, section 167.
 *
 * `GAP_US` cannot rise: a space of 8310 is a bit (`Short 11 Bit 2`) and a space of 8460 is a real frame
 * ending gap (`RCAV1 LF 24 Bit`'s inter frame silence), 1.8% apart, so no constant separates them. What
 * does is scale: within one **segment** of `frameSegments`, whose boundaries are already four times the
 * median space, a space four times the segment's own median cannot occur, so the reader may accept the
 * segment's own scale. The floor keeps the default for ordinary segments, where the median is small and
 * the constant is the stronger rule.
 */
export function segmentGapUs(segment: readonly Pulse[], factor = FRAME_BOUNDARY_FACTOR): number {
  const spaces = segment.filter((one) => !one.mark).map((one) => one.us).sort((a, b) => a - b);
  const median = spaces[Math.floor(spaces.length / 2)];
  return Math.max(GAP_US, median === undefined ? 0 : median * factor);
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
 * Durations of the same kind that sit next to each other are one interval.
 *
 * **This is the rule that matters, and the corpus is why.** A stored duration is fifteen bits, so a
 * silence longer than 32767 microseconds is spelled as several words in a row, and the corpus does
 * that constantly: a closing gap is commonly two or three maximum length spaces and a remainder. The
 * client's recorder adds each new duration to the interval it is already in when the kind has not
 * changed, so it sees one long silence where the block holds four words. A caller that copied the
 * words across one for one would hand the service a code with four short gaps in place of one long
 * one.
 *
 * **It lived in `irda.ts` and it belongs here**, section 164. It was written for Logitech's own
 * notation, where it is a fact about their recorder, and that read as though the merge were a
 * property of their format. It is a property of the emitter: an interval is a length of time the
 * carrier is on or off, and nothing about a stored word divides one interval from the next. So the
 * reader below merges too, and the two cannot be separate copies of the rule.
 *
 * **What it is not applied to is the biphase reader**, and that is measured rather than an oversight:
 * a biphase family spells a code in unit half cells, so two adjacent cells of one kind are two cells
 * and merging them destroys the reading. `pulsesOfBiphaseFrame` emits them unmerged for the same
 * reason. The distinction is that a pulse distance frame's adjacent same kind durations are always a
 * split word and a biphase frame's are always two cells.
 */
export function mergedIntervals(train: readonly Pulse[]): Pulse[] {
  const out: Pulse[] = [];
  for (const one of train) {
    if (one.us === 0) continue;
    const last = out[out.length - 1];
    if (last !== undefined && last.mark === one.mark) out[out.length - 1] = { mark: last.mark, us: last.us + one.us };
    else out.push({ mark: one.mark, us: one.us });
  }
  return out;
}

/**
 * How much longer than a frame's own bit cells a space has to be to be a boundary between frames.
 *
 * **Not fitted, and what says so is that a neighbouring value reaches the same answer.** Measured over
 * the three compiled samples, 2777 records, counting records whose every stated value is found: 4
 * explains 1848 and 6 explains exactly the same 1848, while 3 explains 1797 and 9 explains 1694.
 *
 * **The cut is not identical at 4 and 6, and saying so matters**, because the first version of this
 * paragraph claimed it was. They cut 72 of those 2777 records differently and still read the same
 * numbers off them, which is a weaker and truer statement: the value is inside a range that does not
 * change the outcome rather than inside a gap where nothing happens. What 9 loses is
 * `Samsung 16 and 20 Bit`, whose separator is nine times its own clear bit exactly, and it cuts 293
 * records differently.
 *
 * The median is the scale to compare against because a frame is mostly bit cells, so half of a train's
 * spaces are one, whatever the protocol. On the fifteen user configs, where the multi frame families
 * barely appear, 4, 6 and 9 cut every record identically: the corpus cannot settle this and the
 * compiled samples are the evidence.
 */
const FRAME_BOUNDARY_FACTOR = 4;

/**
 * A train cut into the frames it holds, in the order they are sent.
 *
 * **Why this exists at all.** A stored command is often more than one frame: `Samsung 16 and 20 Bit`
 * sends a 16 bit frame, a 4495 microsecond separator and then a 20 bit frame, and their catalogue states
 * both values for one command. `decode` reads one frame from the start of a train, so before this the
 * whole thing was read as a single frame spanning both halves, which lands on a number nothing states.
 * Ten of the families in Logitech's catalogue were unanswered for that reason while their records sat in
 * the lab.
 *
 * **`keepBoundary` is a real question and not a tidiness one, and both answers are needed.** The
 * separator terminates the frame before it, and whether it is *part* of that frame depends on which half
 * of the signal carries the bits:
 *
 * * on a **space carrying** protocol, keeping it makes it one more bit cell, and that refused every
 *   `Samsung` code;
 * * on a **mark carrying** protocol, the last cell is a mark, and a mark with no space after it is
 *   unterminated, so dropping it refused every `Sony` code.
 *
 * Each half of that was found by breaking the other. A caller that does not know the protocol tries
 * both, which is what `framesOfSegments` does, exactly as it already tries both bit conventions.
 *
 * **The train must be merged first**, section 164, and this deliberately does not merge it itself: a
 * separator spelled as three maximum length words is one separator, and a caller that skipped the merge
 * would see three boundaries. Passing an unmerged train is a caller error rather than something to
 * paper over, so the merge is the caller's and stays visible at the call site.
 *
 * `factor` exists so that a test can vary it, which is the only thing that makes the claim about
 * `FRAME_BOUNDARY_FACTOR` checkable: that 4 and 6 cut every record here identically and 9 does not is
 * the evidence that the value sits inside a gap rather than being chosen, and that cannot be asserted
 * against a constant nothing can move.
 */
export function frameSegments(train: readonly Pulse[], keepBoundary: boolean,
                              factor = FRAME_BOUNDARY_FACTOR): Pulse[][] {
  const spaces = train.filter((one) => !one.mark).map((one) => one.us).sort((a, b) => a - b);
  if (spaces.length === 0) return train.length === 0 ? [] : [[...train]];
  const median = spaces[Math.floor(spaces.length / 2)] as number;
  const out: Pulse[][] = [];
  let current: Pulse[] = [];
  for (const one of train) {
    // **A boundary cannot fall inside the first few cells, and that is what excludes the header.** A
    // lead in is a mark and a long space, and on several families here that space is more than four
    // times the median, so a rule with no floor cuts the header off as a segment of its own and then
    // every frame reads a bit short: a Samsung code came out as `15:400` rather than `16:400` and a
    // 48 bit Kaseikyo one disappeared from a corpus record that used to read. A frame is at least
    // `MIN_BITS` bits, so a long space before that many cells have gone by is part of the frame.
    if (!one.mark && one.us >= median * factor && current.length >= 2 * MIN_BITS) {
      if (keepBoundary) current.push(one);
      out.push(current);
      current = [];
      continue;
    }
    current.push(one);
  }
  if (current.length > 0) out.push(current);
  return out;
}

/**
 * Every frame a train can be read as, across both boundary conventions and both bit conventions.
 *
 * Deliberately not a replacement for `framesOfPulses`: that one answers "what is the frame at the start
 * of this train", which is what the biphase detector of section 134 and the timing measurement need, and
 * this one answers "which numbers does this record carry". Duplicates are removed by `frameKey`, so a
 * single frame train answers exactly what `framesOfPulses` answers for it.
 *
 * **Not applied to biphase**, for the same reason the merge is not: a biphase frame's cells are all one
 * length, so there is nothing here that distinguishes a separator from a cell, and `biphaseFrames` reads
 * a whole train on its own terms.
 *
 * **Each segment is read at its own scale**, section 167: the reader's gap ceiling cannot rise as a
 * constant, because a space of 8310 is a bit in one family and 8460 a real gap in another, and what
 * separates them is that within a segment the real gaps are already cut away. That is what lets
 * `Short 11 Bit 2` and `Videocrypt 11 Bit Toggle`, whose bits are spaces of up to 8310, read here while
 * `framesOfPulses` on the raw train still refuses them, and it changes nothing for a segment whose
 * spaces are ordinary, where the floor keeps the constant.
 */
export function framesOfSegments(train: readonly Pulse[], headerPairs = 1): IrFrame[] {
  const seen = new Set<string>();
  const out: IrFrame[] = [];
  for (const keepBoundary of [true, false]) {
    for (const segment of frameSegments(train, keepBoundary)) {
      for (const frame of framesOfPulses(segment, headerPairs, segmentGapUs(segment))) {
        const key = frameKey(frame);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(frame);
      }
    }
  }
  return out;
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
   * The mark that opens the frame, where it is not the same length as every later one.
   *
   * **Measured, not a tolerance.** Every Sharp record in the configuration Logitech's own compiler
   * produced opens on a mark of 270 microseconds and then uses 260 for all fourteen remaining bit
   * cells, and it does so again after each inter frame gap. Without somewhere to put that, the half of
   * a pair that has to be constant is not constant and a strict reader refuses the record, which is
   * what kept the whole Sharp family out of the table.
   *
   * It is **not** a lead in, and the difference is settled rather than assumed: reading the first mark
   * as part of the first bit cell makes 162 of 162 of the frames land on numbers Logitech's catalogue
   * states for the same appliances, and reading it as a header would shift every bit by one.
   */
  firstMark?: number;
  /**
   * The space that closes the last pair, where the bit is in the mark.
   *
   * **A pulse width frame's last space is a trailing gap and not a bit cell**, and reading it as one is
   * what made 200 records of the corpus look as though their timings did not split: 112 of twelve bits
   * and 88 of fifteen, all of them in the two configurations Logitech compiled to our own
   * specification, all with two values in the half that is supposed to be constant. The second value
   * was always the last one. So it is one number more for that convention and not a defect, and it is
   * absent for a pulse distance frame, where the last space is an ordinary bit. **A sectioned frame
   * states it too**, because its last bit lives inside the closing silence, see `sections`.
   */
  closing?: number;
  /**
   * The frame is one value sent in sections, this many bits each, and the last bit of every section is
   * carried by a structural space rather than by an ordinary cell.
   *
   * **Measured on `Samsung 38 Bit`, section 166, and it is what "38 Bit" turns out to mean**: one
   * header, sixteen bit cells, a 4470 space, twenty one more cells whose last is swallowed by the
   * closing silence. 17 + 21 = 38, the catalogue states the two section values separately, and reading
   * the 4470 space as section one's final set bit lands all 35 records of the compiled sample on their
   * stated pairs exactly. So a non final section's last bit is emitted as `sectionSpace` and the final
   * section's as `closing`, and both must be **set** bits: every stated value of the family is odd, in
   * both sections, so a frame whose section ends in a zero has never been seen and is refused rather
   * than invented.
   */
  sections?: readonly number[];
  /** The space carrying a non final section's last set bit. Present exactly when `sections` is. */
  sectionSpace?: number;
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
  // Merged for the same reason the decoder above merges, and it has to be the **same** train or the
  // bit count and the durations come from two different readings of one record.
  const d = fromFirstMark(mergedIntervals(train));
  const cells = d.slice(2 * headerPairs, 2 * headerPairs + 2 * frame.bits);
  if (cells.length !== 2 * frame.bits) return undefined;
  const at = frame.carries === 'mark' ? 0 : 1;
  const carried = new Set(cells.filter((_, i) => i % 2 === at).map((p) => p.us));
  // Every pair but the last contributes its flat half. The last pair's other half closes the frame,
  // and on a pulse width protocol that is the trailing gap rather than another cell of the same length.
  const flats = cells.slice(0, -1).filter((_, i) => i % 2 !== at).map((p) => p.us);
  const flat = new Set(flats);
  // **The opening one is allowed to differ, and only the opening one.** Two values where the first is
  // the odd one out is a protocol whose first burst is longer, which the Sharp family measurably is.
  // Anything else is a record whose constant half is not constant, and that stays a refusal.
  const opening = flat.size === 2 && flats.length > 1
    && flats.slice(1).every((one) => one === flats[1]) && flats[0] !== flats[1]
    ? flats[0] : undefined;
  if ((flat.size !== 1 && opening === undefined) || carried.size > 2 || carried.size === 0) {
    return undefined;
  }
  const lengths = [...carried].sort((a, b) => a - b);
  const header = d.slice(0, 2 * headerPairs);
  if (header.length !== 2 * headerPairs) return undefined;
  const base = {
    header: [header[0]?.us ?? 0, header[1]?.us ?? 0] as const,
    flat: opening === undefined ? [...flat][0]! : flats[1]!,
    ...(opening === undefined ? {} : { firstMark: opening }),
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
  if (t.sections !== undefined) return pulsesOfSections(t, bits, value);
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
      // The opening burst where the protocol has a longer one, and `flat` everywhere else.
      const first = i === bits - 1 && t.firstMark !== undefined;
      out.push({ mark: true, us: first ? t.firstMark! : t.flat });
      out.push({ mark: false, us: carried });
    }
  }
  return out;
}

/**
 * The sectioned form of `pulsesOfFrame`, split out because its refusals are its own.
 *
 * The value is the concatenation of the section values, most significant section first, and the whole
 * train is emitted including the closing silence, because the final bit lives inside it: a comparison
 * that stopped before the closing would never check that bit at all. Section 166.
 */
function pulsesOfSections(t: FrameTimings, bits: number, value: bigint): Pulse[] {
  const sections = t.sections!;
  const total = sections.reduce((a, b) => a + b, 0);
  if (bits !== total) throw new Error(`a sectioned frame is ${total} bits, not ${bits}`);
  if (t.sectionSpace === undefined || t.closing === undefined || t.carries !== 'space') {
    throw new Error('a sectioned frame needs its section space and its closing, and carries the space');
  }
  const out: Pulse[] = [{ mark: true, us: t.header[0] }, { mark: false, us: t.header[1] }];
  let consumed = 0;
  for (const [at, width] of sections.entries()) {
    const section = (value >> BigInt(total - consumed - width)) & ((1n << BigInt(width)) - 1n);
    consumed += width;
    // The last bit of a section is carried by a structural space, so it can only be emitted when it is
    // set: every stated value of the one family measured is odd in every section, and a zero here would
    // be a frame no record has ever shown, which is a refusal and not an extrapolation.
    if ((section & 1n) === 0n) {
      throw new Error(`section ${at} ends in a zero bit, which the structural space cannot carry`);
    }
    for (let i = width - 1; i >= 1; i -= 1) {
      out.push({ mark: true, us: t.flat });
      out.push({ mark: false, us: (section >> BigInt(i)) & 1n ? t.one : t.zero });
    }
    out.push({ mark: true, us: t.flat });
    out.push({ mark: false, us: at === sections.length - 1 ? t.closing : t.sectionSpace! });
  }
  return out;
}

/** A frame as the key a lookup against an external catalogue of named commands uses. */
export function frameKey(f: IrFrame): string {
  return `${f.bits}:${f.value.toString(16)}`;
}

/**
 * A biphase reading of a train: the half cell, where the payload starts, and the bits.
 *
 * **Separate from `IrFrame` because it is a different measurement**, section 162. A pulse distance frame
 * has a constant half and a carrying half and the two durations are the protocol's own; a biphase frame
 * has **one** duration, the half cell, and the bit is in which half of the cell the carrier is on. There
 * is nothing here to fill `short`, `long` or `carries` with that would not be a lie.
 */
export interface BiphaseFrame {
  /** The half cell, in microseconds: the shortest interval in the frame, which every other is a multiple of. */
  base: number;
  /** How many half cells sit before the first bit cell, which is the lead in this reader does not interpret. */
  skipped: number;
  bits: number;
  /** First transmitted bit in the most significant position, as `IrFrame.value` does it. */
  value: bigint;
}

/** How many bit cells a biphase reading needs before it is a frame rather than a run of noise. */
const MIN_BIPHASE_BITS = 8;
/** The longest interval accepted as a multiple of the half cell. RC-6's lead in mark is six. */
const MAX_HALF_CELLS = 6;
/** How far an interval may sit from a whole number of half cells, as a share of one. */
const HALF_CELL_SLACK = 0.3;

/**
 * The half cells of a train, one entry per half cell, `true` for carrier present.
 *
 * The frame is taken up to the first interval too long to be a multiple of the half cell, which is the
 * gap before the next copy. Every interval inside it has to be a whole number of half cells, and that is
 * the test that says the code is biphase at all: a pulse distance frame's long half is 3 or 4 times its
 * short one and its lead in is 10 or 20, so it fails this rather than reading as nonsense.
 */
function halfCells(train: readonly Pulse[]): { base: number; cells: boolean[] } | undefined {
  const inside: Pulse[] = [];
  for (const one of train) {
    // A zero closes the block and a one is the marker the emitter leaves; neither is a duration.
    if (one.us <= 1) break;
    if (one.us > GAP_US) break;
    inside.push(one);
  }
  if (inside.length < 2 * MIN_BIPHASE_BITS) return undefined;
  const base = Math.min(...inside.map((one) => one.us));
  if (base <= 0) return undefined;
  const cells: boolean[] = [];
  for (const one of inside) {
    const n = Math.round(one.us / base);
    if (n < 1 || n > MAX_HALF_CELLS) return undefined;
    if (Math.abs(one.us - n * base) > base * HALF_CELL_SLACK) return undefined;
    for (let i = 0; i < n; i += 1) cells.push(one.mark);
  }
  return { base, cells };
}

/**
 * The biphase frame a train encodes, or `undefined` where it is not biphase.
 *
 * **The polarity is a convention pinned from outside, exactly as the pulse distance one is.** A mark in
 * the first half of a cell is a set bit. Both readings are self consistent, so nothing in the durations
 * decides it, and this one is what makes 105 of 106 `Magnavox 13 Bit` records and 56 of 57
 * `Kreatel IP 22 Bit` records land on the numbers Logitech's own catalogue states for those very
 * commands, section 162. The other reading is the complement, and a family may well use it: that already
 * happened on the pulse distance side, where `Logitech 24 Bit` states the complement of what this file
 * reads and the rhythm table carries the polarity in its two durations.
 *
 * **Two readings, and the longest is not the answer**, which cost two attempts to learn. Where the
 * payload starts cannot be read off the train: the lead in differs per family and part of it is not
 * transmitted at all, since an RC-5 frame's first start bit begins with a space, so a capture opens on a
 * lone half cell. Taking the longest run gets `Magnavox 13 Bit` right and both of the others wrong, by
 * one bit on `Kreatel IP 22 Bit` and by two on RC-6.
 *
 * What the train does decide is the **parity** of the alignment, and there are only two. Within one
 * parity the shorter runs are the longest one with leading bits dropped, so two readings cover every
 * alignment and a caller matching against a catalogue trims to the width it is looking for. That is the
 * same shape as `irFrames` returning both carrier conventions: the reading that survives is chosen by
 * evidence from outside the file, and section 162 measured which one each family uses.
 */
export function biphaseFrames(train: readonly Pulse[]): BiphaseFrame[] {
  const read = halfCells(train);
  if (read === undefined) return [];
  const { base, cells } = read;
  const out: BiphaseFrame[] = [];
  for (const parity of [0, 1]) {
    let best: BiphaseFrame | undefined;
    for (let skipped = parity; skipped + 2 * MIN_BIPHASE_BITS <= cells.length; skipped += 2) {
      let value = 0n;
      let bits = 0;
      for (let at = skipped; at + 1 < cells.length; at += 2) {
        // A cell whose two halves are the same is not a bit, so the run ends there. That is what stops
        // this walking through RC-6's double width trailer bit as though it were payload.
        if (cells[at] === cells[at + 1]) break;
        value = (value << 1n) | (cells[at] ? 1n : 0n);
        bits += 1;
      }
      // **The reading has to reach the end of the frame region**, and this is what stops the reader
      // answering for codes that are not biphase at all, section 163. A `Sony 12 Bit` frame's durations
      // are 600, 1200 and 2400, all whole multiples of 600, so it passes the half cell test and its bit
      // pattern can yield a run of eight or more valid cells by luck: 50 records of the two calibration
      // configs did. A real biphase frame's cells run from its lead in to the gap with nothing left
      // over, which all three measured families do exactly.
      if (bits >= MIN_BIPHASE_BITS && skipped + 2 * bits === cells.length
          && (best === undefined || bits > best.bits)) {
        best = { base, skipped, bits, value };
      }
    }
    if (best !== undefined) out.push(best);
  }
  return out;
}

/**
 * What a biphase family's pulses are made of, which is the encoder's side of `biphaseFrames`.
 *
 * **Three numbers and a lead in, against a pulse distance frame's five.** There is one cell length, so
 * a bit is which half of it carries, and the only durations are the mark and the space that make one
 * half cell. What varies between families is the lead in, which is a fixed prelude they all send and
 * none of them derives from the bits: `Magnavox 13 Bit` sends a single mark, `Microsoft 30 Bit` sends
 * eleven intervals of RC-6 preamble, and `Kreatel IP 22 Bit` sends nothing at all.
 *
 * The lead in is carried as the intervals a record stores rather than as a count of half cells, because
 * that is what makes an emitted frame byte identical to a stored one: RC-6's preamble holds a 2632 and a
 * 1323 that are six and three half cells long, and their own generator writes 443 and 439 in two places
 * where the cell is 441.
 */
export interface BiphaseTimings {
  /** One half cell of carrier. */
  mark: number;
  /** One half cell of silence. */
  space: number;
  /** A different opening mark where the family sends one, as `FrameTimings.firstMark`. */
  firstMark?: number;
  /** Everything before the first bit cell, exactly as a record stores it. */
  lead: readonly Pulse[];
  /** Whether a mark in the **first** half of a cell means a set bit. RC-6 is the other way up. */
  setIsMark: boolean;
}

/**
 * A long toggle family's whole record shape, section 168: Logitech's `Philips Hurd 16 Bit LongToggle`.
 *
 * A code of this family states **three** values, and the wire is one biphase like signal in three
 * regions plus a repeat: a leader pair; `head.bits` cells at `head.mark` and `head.space` per **kind**;
 * one double width toggle cell whose two double halves are one stored word of `toggle` each, which is
 * the "LongToggle" of the family's own name; `data.bits` cells whose halves are `data.first` and
 * `data.second` per **position** whichever kind each is; and the whole frame `copies` times with the
 * stored words of `gap` after every copy. One bit convention covers all three regions: a set bit is the
 * cell whose **first half is silence**. Every length here is measured off 46 of 46 records of the
 * compiled sample, three identical copies each, and every record matches a stated triple exactly.
 */
export interface LongToggleTimings {
  readonly leader: readonly [number, number];
  readonly head: { readonly mark: number; readonly space: number; readonly bits: number };
  /** One stored word per double half, so a toggle cell is two words of this length. */
  readonly toggle: number;
  readonly data: { readonly first: number; readonly second: number; readonly bits: number };
  /** The stored words of the silence after each copy, verbatim, last copy included. */
  readonly gap: readonly number[];
  readonly copies: number;
}

/**
 * The pulses a long toggle record stores, all copies and gaps included, word for word.
 *
 * Word boundaries are part of the claim: the generator stores each half cell as its own word in the
 * head and data regions even where two of one kind sit adjacent, and stores each toggle double half
 * **merged** as one word, so an emitter that merged everywhere or nowhere would not reproduce the file.
 */
export function pulsesOfLongToggle(t: LongToggleTimings, values: readonly bigint[]): Pulse[] {
  const [head, toggle, data] = values;
  if (values.length !== 3 || head === undefined || toggle === undefined || data === undefined) {
    throw new Error('a long toggle code states three values');
  }
  const copy: Pulse[] = [{ mark: true, us: t.leader[0] }, { mark: false, us: t.leader[1] }];
  // One rule for all three regions: a set bit's first half is silence.
  const cell = (set: boolean, first: number, second: number): Pulse[] => set
    ? [{ mark: false, us: first }, { mark: true, us: second }]
    : [{ mark: true, us: first }, { mark: false, us: second }];
  for (let i = t.head.bits - 1; i >= 0; i -= 1) {
    const set = ((head >> BigInt(i)) & 1n) === 1n;
    copy.push(...cell(set, set ? t.head.space : t.head.mark, set ? t.head.mark : t.head.space));
  }
  copy.push(...cell((toggle & 1n) === 1n, t.toggle, t.toggle));
  for (let i = t.data.bits - 1; i >= 0; i -= 1) {
    copy.push(...cell(((data >> BigInt(i)) & 1n) === 1n, t.data.first, t.data.second));
  }
  const out: Pulse[] = [];
  for (let n = 0; n < t.copies; n += 1) {
    out.push(...copy);
    out.push(...t.gap.map((us) => ({ mark: false, us })));
  }
  return out;
}

/**
 * The pulses a biphase frame makes, one word per half cell, which is how a record stores them.
 *
 * **Unmerged on purpose.** Two adjacent half cells of one kind are one interval physically, and a config
 * stores them as two words of the half cell length; merging them is what section 153 is about, and an
 * emitter that merged would not reproduce the file.
 */
export function pulsesOfBiphaseFrame(t: BiphaseTimings, bits: number, value: bigint): Pulse[] {
  const out: Pulse[] = [...t.lead];
  for (let i = bits - 1; i >= 0; i -= 1) {
    const set = ((value >> BigInt(i)) & 1n) === 1n;
    const markFirst = set === t.setIsMark;
    const halves: boolean[] = markFirst ? [true, false] : [false, true];
    for (const mark of halves) {
      const first = out.length === 0 && t.firstMark !== undefined;
      out.push({ mark, us: mark ? (first ? t.firstMark! : t.mark) : t.space });
    }
  }
  return out;
}

/**
 * The durations behind a biphase reading, or `undefined` where the train is not made of one cell length.
 *
 * The inverse of `pulsesOfBiphaseFrame`, beside it because a field's encoder lives next to its decoder.
 * It takes the reading rather than finding one, since which alignment is the payload is decided outside
 * this file by what the catalogue states, section 162.
 */
export function timingsOfBiphase(
  train: readonly Pulse[], skipped: number, bits: number, setIsMark: boolean,
): BiphaseTimings | undefined {
  const read = halfCells(train);
  if (read === undefined) return undefined;
  const { base } = read;
  // The lead in is whole intervals, so it only exists where the skipped half cells end on an interval
  // boundary. They always do here: a stored interval is a whole number of half cells.
  const lead: Pulse[] = [];
  let covered = 0;
  let at = 0;
  while (covered < skipped) {
    const one = train[at];
    if (one === undefined) return undefined;
    lead.push(one);
    covered += Math.round(one.us / base);
    at += 1;
  }
  if (covered !== skipped) return undefined;
  // The payload has to be exactly one mark length and one space length, the opening mark aside.
  const cells = train.slice(at, at + 2 * bits);
  if (cells.length !== 2 * bits) return undefined;
  const marks = cells.filter((one) => one.mark).map((one) => one.us);
  const spaces = cells.filter((one) => !one.mark).map((one) => one.us);
  if (marks.length === 0 || spaces.length === 0) return undefined;
  if (new Set(spaces).size !== 1) return undefined;
  const distinct = [...new Set(marks)];
  // One mark length, or two where the odd one out is the very first interval of the whole train.
  const firstMark = distinct.length === 2 && lead.length === 0 && marks[0] !== marks[1]
    && new Set(marks.slice(1)).size === 1 ? marks[0] : undefined;
  if (distinct.length > 1 && firstMark === undefined) return undefined;
  return {
    mark: firstMark === undefined ? distinct[0]! : marks[1]!,
    space: spaces[0]!,
    ...(firstMark === undefined ? {} : { firstMark }),
    lead,
    setIsMark,
  };
}
