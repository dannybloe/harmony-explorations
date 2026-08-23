/**
 * A pulse train as Logitech's own analysis service takes it, `docs/host-client.md`.
 *
 * **This is not part of the config format and it is here because this is where pulses live.** The
 * service `infraredAnalysisManager.AnalyzeInfrared` takes a code as a string of durations and answers
 * with a protocol name and a frame value, which is the step Logitech's user manuals describe as
 * uploading a learned signal and looking for a matching pattern. Two things that buys:
 *
 * * a **learned** code gets a name and a canonical value without this project owning a protocol table
 * * a code that is **already in a config** can be sent the same way, which puts Logitech's own decoder
 *   beside `irframe.ts` on thousands of records. That is a check no amount of internal consistency can
 *   provide, and it is the reason this file exists before any learning is possible here
 *
 * The format is read out of the desktop client's own analyser, five modules that turn a capture into
 * this string, and it is **client sourced**: nothing here has seen the service accept one yet.
 */
import { IR_PULSE_MARK, IR_PULSE_MAX } from './ir.ts';
import type { Pulse } from './irframe.ts';

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
 * The code up to its first long silence, which is the part a pattern matcher needs.
 *
 * **This exists because Logitech's own string format is ambiguous and the corpus says where.** A
 * duration is padded to four hexadecimal digits, or eight when it does not fit, and `F` is both a
 * token letter and a hexadecimal digit: 833 of 2204 class 1 records in the corpus hold a duration
 * whose four digits contain an `F`. So the field cannot be found by scanning for letters and has to
 * be read at a fixed width, and a width that is sometimes four and sometimes eight cannot be read at
 * all without knowing which.
 *
 * Cutting at the first long silence removes the problem rather than solving it, and the measurement
 * is why it is allowed to: 1575 of those 2204 records hold an interval above 65535 microseconds, and
 * **none of them holds one before its first long silence**. So every duration in the part that
 * carries the code fits in four digits, on every record in the corpus. What is dropped is the
 * closing silence and any repeat beyond the first, which is what the frame does not depend on.
 */
export function untilSilence(train: readonly Pulse[], us = 20_000): Pulse[] {
  const merged = mergedIntervals(train);
  const at = merged.findIndex((one) => !one.mark && one.us > us);
  if (at < 0) return merged;
  // **The closing silence is kept, and cutting before it was a bug worth recording.** A pulse width
  // protocol carries its last bit in a mark whose space is the trailing gap, section 133, so a train
  // that stops at the gap has a mark with no partner and the decoder drops the last bit: a Sony frame
  // read as twelve bits over the whole block read as eleven over the cut one.
  //
  // Clamped, because the gap's own length is not information: it says the code has ended. Clamping is
  // what keeps every duration inside four hexadecimal digits, which is what the format needs.
  const closing = merged[at]!;
  return [...merged.slice(0, at), { mark: false, us: Math.min(closing.us, IR_PULSE_MAX * 2 + 1) }];
}

/**
 * Four hexadecimal digits, or eight, upper case, which is the client's own padding.
 *
 * The client's version has a bug worth not copying: it strips a leading `0000` by calling
 * `substring(4, 4)`, which in JavaScript returns the empty string rather than the rest, so a value
 * whose hexadecimal starts with four zeroes would come out blank. That cannot arise from its own
 * inputs, since a duration of zero is never recorded, so it never fires. This pads and does not strip.
 */
function padded(value: number): string {
  const hex = value.toString(16).toUpperCase();
  return hex.padStart(hex.length > 4 ? 8 : 4, '0');
}

/**
 * The whole string: the carrier in hertz, then one letter and one duration per interval.
 *
 * `P` for a mark, which the client calls a carrier interval because that is when the emitter is
 * modulating, and `S` for a space. Microseconds throughout.
 */
export function irdaString(train: readonly Pulse[], hertz: number): string {
  if (!Number.isFinite(hertz) || hertz <= 0) throw new Error('a carrier frequency must be positive');
  let out = `F${padded(Math.round(hertz))}`;
  for (const one of mergedIntervals(train)) {
    if (one.us > IR_PULSE_MAX * 8) throw new Error(`an interval of ${one.us} us is not a duration`);
    out += `${one.mark ? 'P' : 'S'}${padded(one.us)}`;
  }
  return out;
}

/** A block's words as pulses, which is the shape both this file and the frame decoder want. */
export function pulsesOfWords(words: readonly number[]): Pulse[] {
  return words.map((word) => ({ mark: (word & IR_PULSE_MARK) !== 0, us: word & IR_PULSE_MAX }));
}
