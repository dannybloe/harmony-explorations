/**
 * What the screen actually says: turning a string's glyph codes back into characters.
 *
 * A `SCREEN_TEXT_INLINE` instruction carries glyph codes, and a code is **not** a character. It is
 * an index into base slot 7, assigned per config in the order characters first appear in the
 * generator's own string list, which is not the order the strings sit in the file. So four Harmony
 * One configs agree about the first nineteen codes, because the list starts with the same
 * boilerplate in all of them, and then diverge: code 20 is a colon in one and the digit 1 in
 * another. A fixed code table is therefore wrong, and that is why this module keys on the glyph's
 * pixels instead.
 *
 * The shape of the derivation:
 *
 * 1. One config per typeface had its alphabet read off the rendered glyphs by eye. That is the
 *    seed, and it lives in `packages/codec/bin/alphabets.ts` beside the reasoning.
 * 2. `alphabets.ts` in this directory is generated from those seeds: per typeface, a table from a
 *    glyph's pixels to the character it draws.
 * 3. Any config is then decoded by looking its own glyphs up in that table, which works whatever
 *    codes its generator handed out.
 *
 * The closure is that the decoded text reproduces strings the container also carries as **ASCII**
 * in base slot 0, a section this module never reads. `docs/findings.md` section 112.
 *
 * Two honest limits, both reported rather than hidden:
 *
 * * **`I` and `l` are the same shape** in these typefaces at several sizes, so a code that only
 *   ever appears at those sizes cannot be told apart by pixels. Such a code lands in `ambiguous`,
 *   and `decode` falls back to what the seed config assigned to the same code, which is right
 *   whenever the two agree about that part of the list.
 * * **A typeface with no seed decodes to nothing at all**, rather than to plausible nonsense: the
 *   alphabet is chosen by how much of the container it explains, and a container it explains
 *   nothing of gets no alphabet.
 */
import { Container } from './gspm.ts';
import { fontSets, glyphAt } from './font.ts';
import type { Glyph } from './font.ts';
import {
  reachablePrograms,
  SCREEN_TEXT_AT,
  SCREEN_TEXT_INLINE,
  SCREEN_SELECT_FONT,
} from './screen.ts';
import type { ScreenInstruction } from './screen.ts';
import { ALPHABETS } from './alphabets.ts';
import type { Alphabet } from './alphabets.ts';

/**
 * The glyph code a font set starts at when the codes are ASCII rather than assigned.
 *
 * The arch 9 safe mode container's sets start here and its strings are ASCII outright, which is
 * how that alphabet was seeded without reading a single glyph. Everything else in the corpus
 * starts at 1. Resting on one container, so it is used only to break a tie, never to pick the
 * alphabet.
 */
export const ASCII_FIRST_CODE = 32;

/** FNV-1a, so a shape key needs no dependency and is stable across platforms. */
function fnv1a(text: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    // The multiply is done in halves because the FNV prime overflows a double's integer range.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * A glyph's identity: its height, its pixels, and nothing else.
 *
 * Height is part of the key because `I` and `l` are one shape at some sizes and two at others, so
 * a size blind table reads a tall `l` as an `I` from a smaller set. That happened, and it is what
 * the height prefix prevents.
 */
export function shapeKey(height: number, glyph: Glyph): string {
  const body = glyph.rows
    .map((row) => row.map((p) => (p === undefined ? '_' : p.toString(36))).join(','))
    .join(';');
  const low = fnv1a(body, 0x811c9dc5).toString(16).padStart(8, '0');
  const high = fnv1a(body, 0x01000193).toString(16).padStart(8, '0');
  return `${height}:${low}${high}`;
}

/**
 * Whether a glyph draws nothing: every pixel the same, so there is no shape to recognise.
 *
 * Such a glyph is a space for decoding purposes whatever the generator meant by it, and it must
 * not be evidence about anything else: a font set carries a blank slot for codes it does not draw,
 * and the same code is a real letter in another set. Treating a blank as evidence made arch 8's
 * `V`, `?` and `x` decode as spaces.
 */
export function isBlank(glyph: Glyph): boolean {
  const first = glyph.rows[0]?.[0];
  return glyph.rows.every((row) => row.every((p) => p === first));
}

/** A container's codes, resolved as far as the pixels allow. */
export interface CharacterMap {
  /** Which alphabet was used, by name. */
  alphabet: string;
  /** Code to character, for the codes one character explains. */
  codes: Map<number, string>;
  /**
   * Codes the pixels cannot settle, with every character still in the running. `codes` holds the
   * seed's own answer for these when it is among the candidates, so decoding still produces a
   * string; the entry here is what says not to trust that character.
   */
  ambiguous: Map<number, string[]>;
  /** How many of the codes the container's strings draw were resolved, and how many there are. */
  drawn: { resolved: number; total: number };
}

/** Every glyph code a container's strings actually draw. */
/**
 * The address a `SCREEN_TEXT_AT` names: two position bytes, then a `u24` little endian.
 *
 * Returns undefined for any other opcode, so a caller can hand it every instruction of a program
 * without filtering first.
 */
export function referencedStringAddress(instruction: ScreenInstruction): number | undefined {
  if (instruction.opcode !== SCREEN_TEXT_AT) return undefined;
  const o = instruction.operands;
  if (o.length < 5) return undefined;
  return (o[2] as number) + ((o[3] as number) << 8) + ((o[4] as number) << 16);
}

/**
 * The glyph run at a flash address, read the way the inline one is read.
 *
 * Terminated by a zero byte, with a code whose bit 7 is set taking a second byte with it, exactly as
 * `SCREEN_TEXT_INLINE` is decoded. Sharing that rule matters: every target in the corpus **is** an
 * inline instruction's payload, so a different terminator here would mean two readings of the same
 * bytes.
 */
export function glyphRunAt(c: Container, address: number): Uint8Array | undefined {
  const start = c.blobOffsetOf(address);
  if (start === undefined || start >= c.blob.length) return undefined;
  let end = start;
  while (end < c.blob.length && c.blob[end] !== 0) end += (c.blob[end] as number) & 0x80 ? 2 : 1;
  if (end > c.blob.length) return undefined;
  return c.blob.subarray(start, end);
}

export function drawnCodes(c: Container): Set<number> {
  const out = new Set<number>();
  for (const [, program] of reachablePrograms(c)) {
    for (const instruction of program) {
      // Both text opcodes, because a code that only ever appears in a referenced string is still
      // drawn on the screen. Counting the inline ones alone was an undercount and not a definition:
      // it hid 131 unreadable strings in one container and 12052 draws across the corpus.
      const glyphs =
        instruction.opcode === SCREEN_TEXT_INLINE
          ? instruction.glyphs
          : glyphsReferencedBy(c, instruction);
      if (glyphs === undefined) continue;
      for (const code of glyphs) out.add(code);
    }
  }
  return out;
}

/** The glyph run a `SCREEN_TEXT_AT` draws, or undefined for any other instruction. */
function glyphsReferencedBy(c: Container, instruction: ScreenInstruction): Uint8Array | undefined {
  const address = referencedStringAddress(instruction);
  return address === undefined ? undefined : glyphRunAt(c, address);
}

/**
 * Resolve a container's codes against one alphabet.
 *
 * Evidence is intersected across font sets rather than counted, because a size where two
 * characters share a shape says less than a size where they do not, and what survives every size
 * is the answer. An empty intersection means the two disagree, which is a contradiction rather
 * than an ambiguity, so it is reported as such by leaving the code out of `codes`.
 */
function resolveWith(c: Container, alphabet: Alphabet): CharacterMap {
  const candidates = new Map<number, Set<string>>();
  const blankOnly = new Map<number, boolean>();
  for (const set of fontSets(c) ?? []) {
    for (const [index, address] of set.glyphs.entries()) {
      if (address === undefined) continue;
      const glyph = glyphAt(c, address);
      if (glyph === undefined) continue;
      const code = set.first + index;
      if (isBlank(glyph)) {
        if (!blankOnly.has(code)) blankOnly.set(code, true);
        continue;
      }
      blankOnly.set(code, false);
      const character = alphabet.shapes[shapeKey(set.height, glyph)];
      if (character === undefined) continue;
      const had = candidates.get(code);
      candidates.set(
        code,
        had === undefined
          ? new Set(character)
          : new Set([...had].filter((one) => character.includes(one))),
      );
    }
  }

  const codes = new Map<number, string>();
  const ambiguous = new Map<number, string[]>();
  for (const [code, found] of candidates) {
    if (found.size === 1) {
      codes.set(code, [...found][0] as string);
      continue;
    }
    // An empty intersection is a contradiction rather than an ambiguity: two sizes name two
    // characters and no shape draws both. It is left unresolved on purpose, since guessing which
    // size to believe is exactly what the intersection was there to avoid.
    if (found.size === 0) continue;
    ambiguous.set(code, [...found]);
    // A code the pixels cannot settle. Two fallbacks, in order: the ASCII convention decides it
    // outright when the container's sets state ASCII, and otherwise the seed config's own
    // assignment is the best evidence there is, since the codes of one skin share a prefix.
    const ascii = String.fromCharCode(code);
    if (usesAscii(c) && found.has(ascii)) {
      codes.set(code, ascii);
      continue;
    }
    const seeded = alphabet.codes?.[code - 1];
    if (seeded !== undefined && found.has(seeded)) codes.set(code, seeded);
  }
  // A code whose every glyph is blank draws nothing, so it is a space. Nothing else can be said
  // about it and nothing else needs to be.
  for (const [code, blank] of blankOnly) if (blank && !codes.has(code)) codes.set(code, ' ');

  const drawn = drawnCodes(c);
  let resolved = 0;
  for (const code of drawn) if (codes.has(code)) resolved += 1;
  return { alphabet: alphabet.name, codes, ambiguous, drawn: { resolved, total: drawn.size } };
}

/** Whether the container's font sets state ASCII codes, per `ASCII_FIRST_CODE`. */
export function usesAscii(c: Container): boolean {
  const sets = fontSets(c) ?? [];
  return sets.length > 0 && sets.every((set) => set.first >= ASCII_FIRST_CODE);
}

/**
 * The alphabet that explains the most of a container's drawn codes, resolved.
 *
 * Undefined when no alphabet explains anything, which is what a typeface with no seed looks like:
 * the three safe mode typefaces were each a separate seed for exactly this reason, and a container
 * drawn with a fourth would return undefined rather than nonsense.
 */
export function characterMap(c: Container): CharacterMap | undefined {
  let best: CharacterMap | undefined;
  for (const alphabet of ALPHABETS) {
    const found = resolveWith(c, alphabet);
    if (found.drawn.resolved === 0) continue;
    if (best === undefined || found.drawn.resolved > best.drawn.resolved) best = found;
  }
  return best;
}

/** The character a code stands for, or `undefined` when nothing settles it. */
export function character(map: CharacterMap, code: number): string | undefined {
  return map.codes.get(code);
}

/**
 * One string, decoded. Codes with no character become `replacement`, which defaults to a question
 * mark in guillemets so an unread code cannot be mistaken for a character the config carried.
 */
export function decode(glyphs: Uint8Array, map: CharacterMap, replacement = '¿'): string {
  let out = '';
  for (const code of glyphs) out += map.codes.get(code) ?? replacement;
  return out;
}

/** A string a screen program draws, with where it is drawn and what draws it. */
export interface ScreenString {
  /** The program the instruction belongs to, as the container addresses it. */
  program: number;
  /** Blob offset of the instruction, so two copies of the same text can be told apart. */
  at: number;
  /**
   * The address the glyphs were read from when the instruction was a `SCREEN_TEXT_AT`, and undefined
   * when it carried them inline.
   *
   * The distinction is what a writer needs: the bytes behind a referenced string belong to another
   * program, so editing them in place changes every draw that names them. Section 121.
   */
  referencedFrom?: number;
  /** The base slot 7 entry the last `SCREEN_SELECT_FONT` chose, or -1 before any. */
  font: number;
  x: number;
  y: number;
  text: string;
  /** How many of the string's codes had no character, so `text` has that many replacements. */
  unread: number;
}

/**
 * Every string the container's reachable screen programs draw, decoded.
 *
 * Font selection is per program and carries forward within it, which is how the remote reads it:
 * the opcode sets a variable the text opcode uses. It does not carry between programs here,
 * because the walk order is not the run order.
 *
 * **Both text opcodes**, since section 121. One draw is one entry, so a string referenced twenty
 * times appears twenty times with twenty positions, which is what a reader asking "what does this
 * page say" wants. `referencedFrom` tells the two apart, and the shared bytes appear once as the
 * inline draw and once per reference on purpose.
 */
export function screenStrings(c: Container, map = characterMap(c)): ScreenString[] {
  if (map === undefined) return [];
  const out: ScreenString[] = [];
  for (const [program, instructions] of reachablePrograms(c)) {
    let font = -1;
    for (const instruction of instructions) {
      if (instruction.opcode === SCREEN_SELECT_FONT) font = instruction.operands[0] ?? -1;
      const referencedFrom = referencedStringAddress(instruction);
      const glyphs =
        instruction.opcode === SCREEN_TEXT_INLINE
          ? instruction.glyphs
          : glyphsReferencedBy(c, instruction);
      if (glyphs === undefined) continue;
      let unread = 0;
      for (const code of glyphs) if (!map.codes.has(code)) unread += 1;
      out.push({
        program,
        at: instruction.start,
        ...(referencedFrom === undefined ? {} : { referencedFrom }),
        font,
        x: instruction.operands[0] ?? 0,
        y: instruction.operands[1] ?? 0,
        text: decode(glyphs, map),
        unread,
      });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * How much of a container's drawn text has a character behind it.
 *
 * **Counted per draw and over both text opcodes**, since section 121, so `referenced` is included in
 * `strings` and its glyphs in `glyphs`. The figures grew by roughly a factor of four when the
 * referenced draws were added, and the growth is a correction of an undercount: opcode 4 is the
 * commoner of the two and nothing had followed its pointer.
 */
export function textCoverage(c: Container): {
  glyphs: number;
  read: number;
  strings: number;
  /** Of `strings`, how many were drawn by reference rather than inline. */
  referenced: number;
} {
  const map = characterMap(c);
  let glyphs = 0;
  let read = 0;
  let strings = 0;
  let referenced = 0;
  for (const [, program] of reachablePrograms(c)) {
    for (const instruction of program) {
      const inline = instruction.opcode === SCREEN_TEXT_INLINE;
      const codes = inline ? instruction.glyphs : glyphsReferencedBy(c, instruction);
      if (codes === undefined) continue;
      strings += 1;
      if (!inline) referenced += 1;
      for (const code of codes) {
        glyphs += 1;
        if (map !== undefined && map.codes.has(code)) read += 1;
      }
    }
  }
  return { glyphs, read, strings, referenced };
}
