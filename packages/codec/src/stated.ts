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
import { pulsesOfBiphaseFrame, pulsesOfBlock, pulsesOfFrame, pulsesOfLongToggle, pulsesOfQuad,
  type BiphaseTimings, type FrameTimings, type Pulse }
  from './irframe.ts';
import { PROTOCOLS, type StatedProtocol } from './protocols.ts';

/**
 * One code as Logitech's database states it, read as the grammar it is.
 *
 * **Their string has three slots and two of them hold content**, which is a correction: it is
 * `G:<family>:(<A>)(<B>)(<C>):<n>`, and the first reading here treated slot A as parameters to be
 * skipped and read only slot B. Slot C is empty in all 2921 distinct codes measured.
 *
 * A slot holds a sequence of items joined by `_`, and an item is either a **value**, written with a one
 * digit prefix and hexadecimal digits, or one of three **words**. Over those 2921 codes the sequences
 * that occur are exactly seven:
 *
 * | codes | slot A | slot B | families like |
 * |---|---|---|---|
 * | 1026 | a value | `Repeat` | Toshiba 32 Bit |
 * | 936 | empty | a value | Sony 12 Bit |
 * | 512 | empty | two values | Sharp 15 Bit, Samsung 38 Bit |
 * | 293 | `Start` | a value | JVC 16 Bit |
 * | 119 | empty | three values | Philips Hurd 16 Bit LongToggle |
 * | 28 | empty | `Start`, two values, `Trailer` | MitsubishiO1 Dual 8 16 Bit |
 * | 7 | a value | a value | Pioneer 32 Bit 2 |
 *
 * **Two things the old reading was getting wrong, and both are the same quiet failure.** Reading slot B
 * alone **refused** every `Toshiba 32 Bit` code, because it found the word `Repeat` where it wanted a
 * number, and Toshiba is the family the most appliances in the census use. And on
 * `G:Pioneer 32 Bit 2:(0xC53A9966)(0xF50A5DA2)():3` it emitted the **second** frame as the whole
 * command, which parses cleanly, comes back from Logitech's own analyser carrying the number it was
 * built from, and sends half of what it should.
 *
 * **The words name what a frame is instead of stating it**, which is why they can be words: `Repeat` is
 * the ditto frame of the protocol concerned, `Start` a lead in sent once before the payload, `Trailer` a
 * closing frame. All three are published behaviour of the protocols they appear on.
 *
 * **The prefix digit is a position and its meaning stops there.** Across every code the digits, in
 * order, form exactly four runs: `0`, `00`, `01` and `012`. So it is 0 on a code stating one value, and
 * on a code stating several it ascends from 0 except in the `00` case, which is the families whose
 * values are all the same width. Whether it indexes the values, a field of the protocol, or the widths
 * the family name spells is **unread**, and it is kept as written rather than normalised.
 */
export type StatedWord = 'Start' | 'Repeat' | 'Trailer';

export interface StatedFrame {
  readonly value: bigint;
  /** The width this value is stated at, from the family's own name. */
  readonly bits: number;
  /** Their position digit as written. What it indexes is unread. */
  readonly index: number;
}

/** One item of a slot: a value, or a word standing in for a frame. */
export type StatedItem =
  | { readonly kind: 'frame'; readonly frame: StatedFrame }
  | { readonly kind: 'word'; readonly word: StatedWord };

export interface StatedCode {
  readonly family: string;
  /** Every item both slots state, in the order they are written, which is the order they are sent. */
  readonly items: readonly StatedItem[];
  /** The values alone, which is what an encoder needs. `items` filtered, kept because every caller wants it. */
  readonly frames: readonly StatedFrame[];
  /** The words alone, in order. A code with none of them states every frame it sends. */
  readonly words: readonly StatedWord[];
  /** The first value's width, which is what a code stating one value means by its width. */
  readonly bits: number;
}

/** The words seen, as a closed set, so a fourth one is a refusal rather than a guess. */
const WORDS = new Set<string>(['Start', 'Repeat', 'Trailer']);

/** A digit string in the base its family states, which is 16 everywhere but the one quaternary family. */
function valueOf(digits: string, base: number): bigint {
  if (base === 16) return BigInt(`0x${digits}`);
  const radix = BigInt(base);
  return [...digits].reduce((total, one) => total * radix + BigInt(parseInt(one, base)), 0n);
}

/**
 * Read one of their catalogue codes, or `undefined` where the shape is not one this has seen.
 *
 * **The widths come out of the family's own name, which is where they put them.** A name stating as
 * many widths as the code states values pairs them in order, which is what "Samsung 16 and 20 Bit" and
 * "MitsubishiO1 Dual 8 16 Bit" need; a name stating one width gives it to every value. The closure is
 * that **no value in the census exceeds the width it is given**, over 2921 codes and 3440 values, and
 * that is what makes the pairing a reading rather than a convention: a wrong pairing would put a 20 bit
 * number in a 16 bit frame somewhere.
 *
 * **A value that does not fit its width is a refusal, not a wider frame.** That check is what found the
 * one family in the census whose digits are not hexadecimal, and it is now what confirms the fix rather
 * than what refuses it: see the base below.
 *
 * **`Quad` in a family name is the base of its digits, not a count of its frames**, and reading it as
 * hexadecimal overstated every one of its values. `Galaxis 16 Bit Quad Toggle` is the only family in the
 * census that names it, and under base 16 its three values need 26, 1 and 26 bits against the 16 the name
 * states, so all 69 of its codes were refused. Under base **4**, two bits a digit, all 69 fit, and their
 * digit counts are 1, 7 and 8, an eight digit value being exactly the 16 bits the name claims. Three
 * things hold the reading up. Every digit of every value of every Galaxis code is 0, 1, 2 or 3, 69 of 69.
 * The width check goes from 0 of 69 fitting to 69 of 69, which is the same falsifier that caught the
 * error. And `Quad` cannot be a frame count here, because these codes state **three** values, where the
 * four families naming `Dual` state two.
 *
 * **The name is the discriminator and the digit set is only corroboration**, which is measured rather
 * than chosen: six families have codes whose digits all happen to be 0 to 3, and Galaxis is the only one
 * where that holds for every code, so a reader keyed on the digits would have to guess on a `Sony 12 Bit`
 * code that uses no digit above 3. A second family naming `Quad` would have to be measured before this
 * is assumed to be about the word in general; until then the width check is what would catch it, since a
 * quaternary reading of hexadecimal digits refuses on the digit set alone.
 *
 * A family naming one width and stating two values means the width **across the pair**, which was open
 * here until section 166 read it off the wire: "Samsung 38 Bit" sends one frame of 17 plus 21 bits, the
 * sections' widths summing to exactly the 38 the name states, with each section's final set bit carried
 * structurally. The per value widths are not in the name; they are stated by the rhythm table entry's
 * `sections`, so this reader keeps `bits` as the name's width on every frame of such a code.
 */
export function statedCode(keyCode: string): StatedCode | undefined {
  const parsed = /^G:([^:]+):\(([^)]*)\)\(([^)]*)\)\(([^)]*)\)/.exec(keyCode);
  if (parsed === null) return undefined;
  const family = parsed[1]!.trim();
  // **The widths are the run of numbers immediately before the word `Bit`**, which is one match and not
  // one per number: "Samsung 16 and 20 Bit" writes `Bit` once for two widths, and a pattern demanding
  // `<number> Bit` finds only the 20 and then gives it to both frames. "MitsubishiO1 Dual 8 16 Bit" is
  // the same shape with the conjunction left out.
  //
  // The run has to start at a word boundary, which is not tidiness: "JVCO1 16 Bit" ends its family name
  // in a digit, so an unanchored run reads "1 16" as two widths and then refuses the code for stating
  // two widths and one frame.
  const stated = /(?:^|\s)((?:\d+\s*(?:and\s+)?)+)Bit/i.exec(family);
  const widths = [...(stated?.[1] ?? '').matchAll(/\d+/g)].map((one) => Number(one[0]));
  if (widths.length === 0 || widths.some((one) => one === 0)) return undefined;
  // **The base the digits are written in, out of the family's own name**, like the widths. Two bits a
  // digit where the name says `Quad`, four everywhere else.
  const base = /\bQuad\b/i.test(family) ? 4 : 16;
  // Read in slot order and keep it, since the order is the order the frames go out in.
  const raw: ({ value: bigint; index: number } | StatedWord)[] = [];
  for (const slot of [parsed[2]!, parsed[3]!, parsed[4]!]) {
    if (slot.trim() === '') continue;
    for (const part of slot.trim().split('_')) {
      if (WORDS.has(part)) { raw.push(part as StatedWord); continue; }
      const value = /^(\d)x([0-9A-Fa-f]+)$/.exec(part);
      if (value === null) return undefined;
      const digits = value[2]!;
      // A quaternary family's digits are 0 to 3 and nothing else, so a digit outside that is a refusal
      // rather than a value read in whichever base happens to accept it.
      if (base === 4 && !/^[0-3]+$/.test(digits)) return undefined;
      raw.push({ value: valueOf(digits, base), index: Number(value[1]) });
    }
  }
  const values = raw.filter((one): one is { value: bigint; index: number } => typeof one !== 'string');
  if (values.length === 0) return undefined;
  if (widths.length !== 1 && widths.length !== values.length) return undefined;
  const width = (at: number): number => widths.length === 1 ? widths[0]! : widths[at]!;
  let seen = 0;
  const items: StatedItem[] = raw.map((one) => typeof one === 'string'
    ? { kind: 'word' as const, word: one }
    : { kind: 'frame' as const, frame: { value: one.value, bits: width(seen++), index: one.index } });
  const frames = items.flatMap((one) => one.kind === 'frame' ? [one.frame] : []);
  // The check that makes the width pairing a reading rather than a convention. A wrong pairing puts a
  // number in a frame too narrow to hold it, and that is visible; a value read in the wrong base is too.
  if (frames.some((one) => one.value >= 1n << BigInt(one.bits))) return undefined;
  const words = items.flatMap((one) => one.kind === 'word' ? [one.word] : []);
  return { family, items, frames, words, bits: frames[0]!.bits };
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
export function timingsOf(entry: StatedProtocol): FrameTimings | undefined {
  // A biphase family has none of these fields, section 162, so there is nothing to build and the
  // caller wants `biphaseOf` instead. Returning `undefined` rather than throwing keeps the two shapes
  // symmetrical: each function answers for its own kind of family and nothing for the other.
  if (entry.header === undefined || entry.flat === undefined || entry.zero === undefined
      || entry.one === undefined || entry.carries === undefined) {
    return undefined;
  }
  return {
    header: [entry.header[0], entry.header[1]],
    flat: entry.flat,
    // `exactOptionalPropertyTypes`, so the field is present or it is not there at all.
    ...(entry.firstMark === undefined ? {} : { firstMark: entry.firstMark }),
    // The set cell's own mark, on the families whose mark rides with the bit, section 170.
    ...(entry.oneMark === undefined ? {} : { oneMark: entry.oneMark }),
    zero: entry.zero,
    one: entry.one,
    carries: entry.carries,
    // The sectioned form, section 166: the value is one frame sent in sections, the boundary space and
    // the closing each carrying a section's final set bit, so the encoder needs all three together.
    ...(entry.sections === undefined ? {} : { sections: entry.sections,
      sectionSpace: entry.sectionSpace!, closing: entry.closing! }),
  };
}

/** The space that closes a pulse width frame: the frame period minus everything before it. */
export function closingSpace(
  entry: StatedProtocol, bits: number, value: bigint,
): number | undefined {
  if (entry.framePeriod === undefined) return undefined;
  const t = timingsOf(entry);
  if (t === undefined) return undefined;
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
/** The entry's biphase shape as the encoder's own type, or `undefined` on a pulse timing family. */
export function biphaseOf(entry: StatedProtocol): BiphaseTimings | undefined {
  if (entry.biphase === undefined) return undefined;
  return {
    mark: entry.biphase.mark,
    space: entry.biphase.space,
    ...(entry.biphase.firstMark === undefined ? {} : { firstMark: entry.biphase.firstMark }),
    lead: entry.biphase.lead.map((one) => ({ mark: one.mark, us: one.us })),
    setIsMark: entry.biphase.setIsMark,
  };
}

export function pulsesOfStatedCode(
  family: string, bits: number, value: bigint, periodNs?: number,
): Pulse[] | undefined {
  const entry = statedProtocol(family, periodNs);
  if (entry === undefined) return undefined;
  // **A biphase family is emitted by its own encoder**, section 162: one half cell, a fixed prelude and
  // which half of the cell means a set bit, with none of the five durations below.
  const b = biphaseOf(entry);
  if (b !== undefined) return pulsesOfBiphaseFrame(b, bits, value);
  const base = timingsOf(entry);
  if (base === undefined) return undefined;
  const closing = closingSpace(entry, bits, value);
  const timings: FrameTimings = closing === undefined ? base : { ...base, closing };
  if (timings.carries === 'mark' && timings.closing === undefined) return undefined;
  return pulsesOfFrame(timings, bits, value);
}

/**
 * The whole first block a stated code sends: the frame in its copies, the gaps, the closing.
 *
 * **This is what a record actually stores**, and `pulsesOfStatedCode` deliberately stops short of it,
 * section 152: nothing after the frame follows from the bits. What fills the gap is section 171's per
 * family measurement, three ways. A family whose shape already carries the whole record (the
 * sectioned, long toggle and quaternary ones) is emitted by that shape. A family with a measured
 * `tail` is the frame plus its copies, literal words and pads, `pulsesOfBlock`. And a family with
 * neither is `undefined` rather than a guess, because a tail can hold a second command, section 152,
 * and replaying one record's tail for another value would send it.
 *
 * Takes the catalogue's own string (or its parse), not a bare number, because the whole record shapes
 * need every stated value and a single `(bits, value)` cannot carry them.
 */
export function blockOfStatedCode(
  code: string | StatedCode, periodNs?: number, which: 'once' | 'held' = 'once',
): Pulse[] | undefined {
  const read = typeof code === 'string' ? statedCode(code) : code;
  if (read === undefined) return undefined;
  const entry = statedProtocol(read.family, periodNs);
  if (entry === undefined) return undefined;
  const values = read.frames.map((one) => one.value);
  // The whole record shapes carry the once block in the shape itself; what their records' second
  // pointers hold has not been measured, so asking for the held block refuses rather than
  // repeating the press on a guess.
  if (which === 'held'
    && (entry.quad !== undefined || entry.longToggle !== undefined || entry.sections !== undefined)) {
    return undefined;
  }
  if (entry.quad !== undefined) {
    if (values.length !== entry.quad.digits.length) return undefined;
    try { return pulsesOfQuad(entry.quad, values); } catch { return undefined; }
  }
  if (entry.longToggle !== undefined) {
    if (values.length !== 3) return undefined;
    try { return pulsesOfLongToggle(entry.longToggle, values as [bigint, bigint, bigint]); }
    catch { return undefined; }
  }
  if (entry.sections !== undefined) {
    // One frame sent in sections, section 166: the value is the concatenation of the stated section
    // values, most significant section first, and the emitted train is already the whole block.
    if (values.length !== entry.sections.length) return undefined;
    const t = timingsOf(entry);
    if (t === undefined) return undefined;
    const bits = entry.sections.reduce((a, one) => a + one, 0);
    const value = entry.sections.reduce((acc, width, at) => (acc << BigInt(width)) | values[at]!, 0n);
    try { return pulsesOfFrame(t, bits, value); } catch { return undefined; }
  }
  // The held block is the record's second pointer, what repeats while the key is down, section
  // 127; the once block is the press. A family whose records never showed the asked for one is a
  // refusal.
  const block = which === 'held' ? entry.held : entry.tail;
  if (block === undefined) return undefined;
  const t = timingsOf(entry);
  const b = biphaseOf(entry);
  if (t === undefined && b === undefined) return undefined;
  // `exactOptionalPropertyTypes`, so a field is present or it is not there at all.
  const shape = { ...(t === undefined ? {} : { timings: t }), ...(b === undefined ? {} : { biphase: b }) };
  // Every stated frame goes in, because a tail item may name the code's second one, section 171
  // stage two; a tail asking for a frame the code does not state is a refusal inside the encoder.
  try { return pulsesOfBlock(shape, read.frames, block); }
  catch { return undefined; }
}
