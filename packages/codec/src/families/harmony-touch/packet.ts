/**
 * What a Harmony Touch's engine makes of a definition and a key code: the three sequences of words it puts in the
 * packet for its lamp, read the way the engine reads them. `todo-touch.md` 10.1.
 *
 * **Why this exists beside the writer.** `definition.ts` writes a definition from a row of our rhythm table and a
 * code into it, and until 10.1 nothing in the codec turned a Touch definition back into durations the way the
 * remote does. Every comparison went through the archive's renderer, `waveformOfArchiveCommand`, which reads a
 * definition back into a row of our own shape (`rhythmOfDefinition`, `blockOfDefinition`) and plays that, so a
 * definition written from a row and read back by it is a round trip through the same two shapes. This module is the
 * decoder that goes with the writer, read off the engine instead: segment by segment, header, cells, trailer and pad,
 * with none of the row's shapes in between. So a definition of ours compared through it against the row's own blocks
 * is held by two readings that share no code.
 *
 * **Not a second copy of the archive's renderer, because it reads for another consumer.** `waveformOfArchiveCommand`
 * is the codec's reading of a definition as the archive renders it, held against the archive's own renderings by
 * `make prontocheck`; this is the Touch's. The two part exactly where the engine does something the archive's
 * renderer does not, which `test/families/harmony-touch/touch-definition.test.ts` lists from the reading and `test/families/harmony-touch/touch-rhythm-table.test.ts`
 * measures: a duration under 30 microseconds, a zero included, goes out as 30; a pad's rest after 32767 is raised the
 * same way; a frame longer than its padded length goes out whole with no pad, where the renderer declines the value;
 * and a release is a sequence of its own.
 *
 * **What it is a reading of.** The engine in the Touch's production image 4.15.330, decompiled in the lab, summarised
 * in `reference/architectures/harmony-touch/devices-and-infrared.md`, "How a code becomes durations". Where to look,
 * by the names a search finds there: the definition is loaded by `initializeFromHarmonyProtocol`, `addIRSegments`,
 * `addCodeSegments`, `getSegmentId` and `processAtoms` in `model/protocol.lua`, and a key code becomes the packet in
 * `generateFromKeyCode`, `parseKeycode`, `parseSegment`, `generateSequence`, `getSegmentBits` and
 * `generateDataSequence` in `core/irmanager.lua`, a duration a word in `appendDurationToByteArray` in
 * `core/utility.lua`. This module is written in its own terms and none of that code is here.
 *
 * **Where the reading stops.** The engine hands the packet to its native program, which plays it; how the start,
 * repeat and finish sequences are played and how often the repeat goes out is not checked, "Not checked". So this
 * returns the sequences and the carrier period, not a train, and a caller that joins them into what a press sends is
 * making that reading itself and should say so.
 *
 * **Nothing here is about one remote's family of configurations**: the Harmony Touch reads these documents and
 * nothing else does, so this folder is the Touch's own, and no family of `families/` is asked anything. Which
 * architectures: the Harmony Touch alone, firmware 4.15.330; its firmware reports 17 and Logitech's templates file it
 * under 18.
 */
import { roundedPeriodOfCarrier } from '../../catalogue/archive.ts';
import type { Pulse } from '../../infrared/irframe.ts';
import type { Atom, IrProtocol } from './documents.ts';

/** The longest duration one word holds, fifteen bits of microseconds. */
export const ENGINE_WORD_MAX_US = 32767;

/** The shortest duration the engine writes: a shorter one, zero included, goes out as this. */
export const ENGINE_WORD_MIN_US = 30;

/**
 * A duration as the engine spells it in words: as many words of 32767 as fit while more than that is left, then one
 * for the rest, raised to 30 when shorter. A word keeps its kind; two of one kind in a row stay two words.
 *
 * **The floor is on the last word's value and not on the duration**, so a duration of 32780 goes out as 32767 and
 * 30, three microseconds longer than stated, and a zero goes out as a word of 30.
 */
export function engineWordsOf(us: number, mark: boolean): Pulse[] {
  const out: Pulse[] = [];
  let left = us;
  while (left > ENGINE_WORD_MAX_US) {
    out.push({ mark, us: ENGINE_WORD_MAX_US });
    left -= ENGINE_WORD_MAX_US;
  }
  out.push({ mark, us: Math.max(left, ENGINE_WORD_MIN_US) });
  return out;
}

/**
 * A segment's id as the engine reads it out of its name, under a definition named `family`: the family's own name is
 * `0`, a name holding `KeyCode` is whatever follows that word, and any other name is what follows the family's name
 * and one more character.
 *
 * **Not `segmentRefs` in `archive.ts`, deliberately**, though the rule is the same where a name is well formed. The
 * engine trims nothing and does not check the prefix: a name that is not the family's followed by a space still loses
 * that many characters. And where two segments come to one id the engine keeps the later, code segments after encoded
 * ones, where `segmentRefs` keeps the first. A writer's names have to mean the same to both, which the 10.1 test holds
 * for every definition of ours.
 */
export function engineSegmentId(family: string, segmentName: string): string {
  if (segmentName === family) return '0';
  const at = segmentName.indexOf('KeyCode');
  if (at >= 0) return segmentName.slice(at + 'KeyCode'.length);
  return segmentName.slice(family.length + 1);
}

/** Why a definition and a code do not make a packet: where the engine raises or stops, or reads what this does not. */
export type TouchPacketRefusal =
  | 'no carrier'
  | 'a segment with no name'
  | 'a duration of neither kind'
  | 'a length the engine cannot subtract from'
  | 'an encoded segment with no payload'
  | 'the code names a segment the definition does not hold'
  | 'a digit that is not hexadecimal'
  | 'a symbol the segment has no cell for'
  | 'a toggle bit outside the value';

/** The packet's content for one code: the carrier period and the three sequences, each as the engine's words. */
export interface TouchPacket {
  /** A billion over the carrier, rounded to the nearest nanosecond as the engine's bit library does. */
  readonly periodNs: number;
  readonly start: readonly Pulse[];
  readonly repeat: readonly Pulse[];
  readonly finish: readonly Pulse[];
}

/** A segment as the engine holds it after loading the definition. */
type Loaded =
  | { readonly kind: 'encoded'; readonly header: readonly Pulse[]; readonly headerUs: number;
    readonly trailer: readonly Pulse[]; readonly trailerUs: number; readonly totalLength: number;
    readonly cells: ReadonlyMap<number, { readonly words: readonly Pulse[]; readonly us: number }>;
    readonly numberOfBits: number; readonly encodingType: number | undefined; readonly toggleBit: number | null }
  | { readonly kind: 'fixed'; readonly words: readonly Pulse[] };

class Refused extends Error {
  readonly refusal: TouchPacketRefusal;
  constructor(refusal: TouchPacketRefusal) { super(refusal); this.refusal = refusal; }
}

/** A list of atoms as words, and the sum of their stated values, which is what a pad is measured against. */
function wordsOfAtoms(atoms: readonly Atom[] | null | undefined): { words: Pulse[]; us: number } {
  const words: Pulse[] = [];
  let us = 0;
  // The engine reads a missing list as empty, after logging it.
  for (const a of atoms ?? []) {
    if (a.Type !== 0 && a.Type !== 1) throw new Refused('a duration of neither kind');
    us += a.Value;
    words.push(...engineWordsOf(a.Value, a.Type === 1));
  }
  return { words, us };
}

/**
 * The definition loaded as the engine loads it: encoded segments first, then code segments, each under its id, a
 * later one replacing an earlier one of the same id. A code segment is padded here, at load, to its `TotalLength`
 * when that is longer; an encoded one when it is sent, since its length depends on the value.
 */
function loaded(definition: IrProtocol): Map<string, Loaded> {
  const out = new Map<string, Loaded>();
  for (const s of definition.IRSegments ?? []) {
    if (typeof s.Name !== 'string') throw new Refused('a segment with no name');
    const p = s.Payload;
    if (p === null || p === undefined) throw new Refused('an encoded segment with no payload');
    if (typeof s.TotalLength !== 'number' || typeof p.NumberOfBits !== 'number') throw new Refused('a length the engine cannot subtract from');
    const header = wordsOfAtoms(s.Header);
    const trailer = wordsOfAtoms(s.Trailer);
    const cells = new Map<number, { words: Pulse[]; us: number }>();
    for (const e of p.Encodings ?? []) {
      const c = wordsOfAtoms(e.Atoms);
      cells.set(Number(e.BitType), c);
    }
    out.set(engineSegmentId(definition.Name, s.Name), {
      kind: 'encoded', header: header.words, headerUs: header.us, trailer: trailer.words, trailerUs: trailer.us,
      totalLength: s.TotalLength, cells, numberOfBits: p.NumberOfBits, encodingType: p.EncodingType,
      toggleBit: typeof p.ToggleBit === 'number' ? p.ToggleBit : null,
    });
  }
  for (const s of definition.CodeSegments ?? []) {
    if (typeof s.Name !== 'string') throw new Refused('a segment with no name');
    if (typeof s.TotalLength !== 'number') throw new Refused('a length the engine cannot subtract from');
    const body = wordsOfAtoms(s.Atoms);
    const pad = s.TotalLength - body.us;
    out.set(engineSegmentId(definition.Name, s.Name), {
      kind: 'fixed', words: pad > 0 ? [...body.words, ...engineWordsOf(pad, false)] : body.words,
    });
  }
  return out;
}

/**
 * A segment's value as the symbols it is sent in: for encoding types 0 and 1 each hexadecimal digit as four bits, most
 * significant first; for 2 and 3 each digit as one symbol. Padded on the left with zeros to the segment's width, and
 * for types 0 and 1 only cut from the left when longer.
 */
function symbolsOf(value: string, segment: Extract<Loaded, { kind: 'encoded' }>, toggle: 0 | 1): number[] {
  const symbols: number[] = [];
  const type = segment.encodingType;
  // Any other type, a missing one included: the engine reads no digits, after logging it, and the padding below
  // sends the segment's width in zeros.
  const read = type === 0 || type === 1 || type === 2 || type === 3;
  for (const c of read ? value : '') {
    if (!/^[0-9A-Fa-f]$/.test(c)) throw new Refused('a digit that is not hexadecimal');
    const n = parseInt(c, 16);
    if (type === 0 || type === 1) for (let b = 3; b >= 0; b -= 1) symbols.push((n >> b) & 1);
    else symbols.push(n);
  }
  while (symbols.length < segment.numberOfBits) symbols.unshift(0);
  if (symbols.length > segment.numberOfBits && (type === 0 || type === 1)) symbols.splice(0, symbols.length - segment.numberOfBits);
  if (segment.toggleBit !== null) {
    // Counted from the left of the padded value; a place past its end would lengthen the value, which no definition
    // measured asks for, so it is refused rather than guessed at.
    if (segment.toggleBit < 0 || segment.toggleBit >= symbols.length) throw new Refused('a toggle bit outside the value');
    symbols[segment.toggleBit] = toggle;
  }
  return symbols;
}

/** One sequence: the code's group of items, each a segment id or an id, an `x` and a value. */
function sequenceOf(items: readonly string[], segments: ReadonlyMap<string, Loaded>, toggle: 0 | 1): Pulse[] {
  const out: Pulse[] = [];
  for (const item of items) {
    // An `x` as the item's second character separates a one character id from its value; anything else is an id.
    const split = item.indexOf('x') === 1;
    const id = split ? item.slice(0, 1) : item;
    const value = split ? item.slice(2) : '';
    const segment = segments.get(id);
    if (segment === undefined) throw new Refused('the code names a segment the definition does not hold');
    if (segment.kind === 'fixed') { out.push(...segment.words); continue; }
    let us = segment.headerUs + segment.trailerUs;
    out.push(...segment.header);
    for (const s of symbolsOf(value, segment, toggle)) {
      const cell = segment.cells.get(s);
      if (cell === undefined) throw new Refused('a symbol the segment has no cell for');
      out.push(...cell.words);
      us += cell.us;
    }
    out.push(...segment.trailer);
    // The pad is measured against the stated durations, before any is raised to the floor.
    const pad = segment.totalLength - us;
    if (pad > 0) out.push(...engineWordsOf(pad, false));
  }
  return out;
}

/**
 * The groups of a key code as the engine reads them: every balanced bracket pair in order, the first three being the
 * start, the repeat and the finish, each split at underscores with empty parts dropped. `G:`, the family and the
 * trailing number are never read.
 */
export function engineKeyCodeGroups(keyCode: string): [string[], string[], string[]] {
  const groups: string[][] = [];
  let depth = 0;
  let from = -1;
  for (let i = 0; i < keyCode.length; i += 1) {
    const c = keyCode[i];
    if (c === '(') { if (depth === 0) from = i + 1; depth += 1; } else if (c === ')' && depth > 0) {
      depth -= 1;
      if (depth === 0) groups.push(keyCode.slice(from, i).split('_').filter((p) => p !== ''));
    }
  }
  return [groups[0] ?? [], groups[1] ?? [], groups[2] ?? []];
}

/**
 * The packet a Harmony Touch makes for a code under a definition, as its engine builds it, or why it would not.
 *
 * `toggle` is the value the engine keeps per device and family and puts at a segment's toggle bit: 0 on the first
 * send, flipped on every send after. A definition that states no toggle bit ignores it.
 */
export function enginePacketOf(
  definition: IrProtocol, keyCode: string, options: { readonly toggle?: 0 | 1 } = {},
): TouchPacket | { readonly refusal: TouchPacketRefusal } {
  const hz = definition.CarrierFrequency;
  if (typeof hz !== 'number' || !(hz > 0)) return { refusal: 'no carrier' };
  try {
    const segments = loaded(definition);
    const [start, repeat, finish] = engineKeyCodeGroups(keyCode);
    const toggle = options.toggle ?? 0;
    return {
      periodNs: roundedPeriodOfCarrier(hz),
      start: sequenceOf(start, segments, toggle),
      repeat: sequenceOf(repeat, segments, toggle),
      finish: sequenceOf(finish, segments, toggle),
    };
  } catch (e) {
    if (e instanceof Refused) return { refusal: e.refusal };
    throw e;
  }
}
