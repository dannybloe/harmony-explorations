/**
 * Turning a code stated as a protocol name and a number into the rhythm a remote sends.
 *
 * **This is the step between Logitech's device database and a config.** Their catalogue gives
 * `G:Sony 12 Bit:()(0x910)():3`, a family and a number, and never the rhythm: the raw field was null on
 * all 419 commands ever fetched from it. A config holds durations. Section 152 measured that the
 * durations of a code can be copied off any other code of the same **appliance**, exactly, which serves a
 * config that already drives it and cannot serve a document starting from nothing. `protocols.ts` is the
 * measured table that removes the sibling, and this is the lookup and the encoder over it.
 *
 * **It sits beside `irframe.ts` rather than inside it** for one reason: the generated table imports a type
 * from that file, so putting the lookup there would make the pair circular. Nothing else is different, and
 * `pulsesOfFrame` is still the only thing that turns bits into pulses.
 *
 * **Where it stops is where the evidence stops.** A record holds the frame several times over with gaps
 * between the copies, and none of that follows from the bits, 151 distinct shapes across the corpus. So
 * this returns the frame and a caller that wants a whole block still has to decide the rest.
 */
import { pulsesOfFrame, type FrameTimings, type Pulse } from './irframe.ts';
import { PROTOCOLS, type StatedProtocol } from './protocols.ts';

/**
 * One code as Logitech's database states it: a family, and one or two frames.
 *
 * **Two frames, and that is the part a first reading of this notation missed.** Their string is
 * `G:<family>:(<parameters>)(<frames>)(<...>):<n>`, and the frames field holds one value or two joined by
 * an underscore: `0x1BAC_0x1853` for Sharp 15 Bit, `0x0400_1xED02F` for the family they call
 * "Samsung 16 and 20 Bit". A pattern reading hexadecimal up to the underscore takes the first and drops
 * the second silently, which is a code that sends half of what it should.
 *
 * **It closes a loop with section 152**, which measured that 226 records of the corpus hold a second,
 * different code in the tail, systematic rather than authored, being a complement or a near variant or a
 * constant lead in, and said a writer has to know which shape its group is in. For these families it does
 * not have to work it out: the catalogue states the second frame outright.
 *
 * The `1x` prefix on a second value is theirs and its meaning is unread. It is kept as written rather
 * than normalised, because a notation nobody has decoded is not a notation to tidy.
 */
export interface StatedCode {
  readonly family: string;
  readonly bits: number;
  readonly frames: readonly bigint[];
  /** The second frame's prefix as written, `0x` or `1x`, where there is a second frame. */
  readonly secondPrefix?: string;
}

/**
 * Read one of their catalogue codes, or `undefined` where the shape is not one this has seen.
 *
 * The bit width comes out of the family's own name, which is where they put it, and a family naming two
 * widths, "Samsung 16 and 20 Bit", yields the last one. That is a guess about their spelling and it is
 * marked as such: nothing here has established which width belongs to which frame.
 */
export function statedCode(keyCode: string): StatedCode | undefined {
  const parsed = /^G:([^:]+):\([^)]*\)\(([^)]*)\)/.exec(keyCode);
  if (parsed === null) return undefined;
  const family = parsed[1]!.trim();
  const widths = [...family.matchAll(/(\d+)\s*Bit/gi)].map((one) => Number(one[1]));
  const bits = widths[widths.length - 1];
  if (bits === undefined || bits === 0) return undefined;
  const parts = parsed[2]!.split('_');
  const frames: bigint[] = [];
  let secondPrefix: string | undefined;
  for (const [at, part] of parts.entries()) {
    const value = /^([01])x([0-9A-Fa-f]+)$/.exec(part);
    if (value === null) return undefined;
    frames.push(BigInt(`0x${value[2]!}`));
    if (at === 1) secondPrefix = `${value[1]!}x`;
  }
  if (frames.length === 0 || frames.length > 2) return undefined;
  return { family, bits, frames, ...(secondPrefix === undefined ? {} : { secondPrefix }) };
}

/**
 * The entry for a family, at a carrier where one is given.
 *
 * **The carrier is part of the key and that is measured, not tidiness.** SharpO1 48 Bit arrives at 36.4
 * and 38 kHz and its durations came out as two sets until they were split that way, after which each half
 * reproduces every one of its codes to the microsecond. So asking without a carrier is asking for
 * whichever variant was measured over more codes, which is the best guess available and is not the same
 * question.
 */
export function statedProtocol(family: string, periodNs?: number): StatedProtocol | undefined {
  const matches = PROTOCOLS.filter((one) => one.family === family);
  if (periodNs === undefined) {
    return [...matches].sort((a, b) => b.codes - a.codes)[0];
  }
  return matches.find((one) => one.periodNs === periodNs);
}

/**
 * The durations an entry states, in the shape `pulsesOfFrame` takes.
 *
 * `closing` is left out here and filled in per code by `pulsesOfStatedCode`, because on a pulse width
 * protocol it is the gap that pads the frame out to a constant total and therefore depends on how many
 * one bits the code carries. Tabling it would make one protocol look like one protocol per code.
 */
export function timingsOf(entry: StatedProtocol): FrameTimings {
  return {
    header: [entry.header[0], entry.header[1]],
    flat: entry.flat,
    zero: entry.zero,
    one: entry.one,
    carries: entry.carries,
  };
}

/** The space that closes a pulse width frame: the frame period minus everything before it. */
export function closingSpace(
  entry: StatedProtocol, bits: number, value: bigint,
): number | undefined {
  if (entry.framePeriod === undefined) return undefined;
  const t = timingsOf(entry);
  let before = t.header[0] + t.header[1];
  for (let i = bits - 1; i >= 0; i -= 1) {
    before += (value >> BigInt(i)) & 1n ? t.one : t.zero;
    if (i > 0) before += t.flat;
  }
  return entry.framePeriod - before;
}

/**
 * The frame a stated code sends, or `undefined` where nothing here knows that family.
 *
 * `undefined` is the answer to keep rather than a fallback, and there is a real population behind it: of
 * the codes Logitech's own analyser named across this corpus, the biphase ones are not in this table at
 * all, because our own decoder cannot produce their number and so no durations were ever derived for
 * them. A guessed rhythm for `Microsoft 30 Bit` would be a command that does nothing, presented as one
 * that works.
 */
export function pulsesOfStatedCode(
  family: string, bits: number, value: bigint, periodNs?: number,
): Pulse[] | undefined {
  const entry = statedProtocol(family, periodNs);
  if (entry === undefined) return undefined;
  const base = timingsOf(entry);
  const closing = closingSpace(entry, bits, value);
  const timings: FrameTimings = closing === undefined ? base : { ...base, closing };
  if (timings.carries === 'mark' && timings.closing === undefined) return undefined;
  return pulsesOfFrame(timings, bits, value);
}
