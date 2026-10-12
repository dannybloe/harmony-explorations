/**
 * Spelling a word in a configuration's own fonts, and reading the texts already drawn: glyph codes from
 * the character map, widths, the font that spells a word, and readers of texts and numbers in a screen
 * program. Every family that draws glyph fonts uses these. Plan 007's shared part, cut out of
 * `compose.ts` unchanged.
 */
import { u24 } from '../bytes.ts';
import { type FontSet, fontSets, glyphOf } from '../font.ts';
import { Container } from '../gspm.ts';
import {
  SCREEN_CALL, SCREEN_SELECT_FONT, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, type ScreenInstruction, screenProgram,
} from '../screen.ts';
import { type ModePage } from '../sections.ts';
import { ComposeError } from '../shared/core.ts';
import { characterMap, type CharacterMap, glyphsReferencedBy } from '../text.ts';

/** The glyph codes that spell `text` in `set`, or a refusal naming the first missing character. */
export function codesFor(
  map: NonNullable<ReturnType<typeof characterMap>>,
  c: Container, set: FontSet, text: string, font: number,
): number[] {
  const out: number[] = [];
  for (const ch of text) {
    let found: number | undefined;
    for (const [code, char] of map.codes) {
      if (char !== ch || glyphOf(c, set, code) === undefined) continue;
      found = code;
      break;
    }
    if (found === undefined) {
      throw new ComposeError(`font ${font} has no glyph for '${ch}', so it cannot be drawn`);
    }
    if (found >= 0x80) throw new ComposeError(`'${ch}' has a wide glyph code, which no string here uses`);
    out.push(found);
  }
  return out;
}

/** The pixels a run of codes occupies: glyph widths summed, the letter gap being a glyph column. */
export function textWidth(c: Container, set: FontSet, codes: readonly number[]): number {
  return codes.reduce((sum, code) => sum + (glyphOf(c, set, code)?.width ?? 0), 0);
}

/**
 * A text spelled in one of the configuration's fonts, `codesFor`, with the pixels it occupies,
 * `textWidth`: for a caller that places it itself, the firmware's own screens of section 357 among them.
 * Refused where the configuration draws no text to spell from, lacks the font, or the font has no glyph
 * for a character.
 */
export function spelledText(c: Container, font: number, text: string): { codes: number[]; width: number } {
  return speller(c)(font, text);
}

/**
 * `spelledText` for many texts of one configuration: the character map and the font table are read
 * once, where `spelledText` reads them on every call, which is what spelling every text of a
 * configuration, section 358, cannot afford. The same refusals, from the same `codesFor`.
 */
export function speller(
  c: Container, map: CharacterMap | undefined = characterMap(c),
): (font: number, text: string) => { codes: number[]; width: number } {
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const sets = fontSets(c) ?? [];
  return (font, text) => {
    const set = sets[font];
    if (set === undefined) throw new ComposeError(`the config does not carry font ${font}`);
    const codes = codesFor(map, c, set, text, font);
    return { codes, width: textWidth(c, set, codes) };
  };
}

/** The glyphs a text instruction draws, inline or by reference, or undefined for anything else. */
export function textGlyphs(c: Container, one: ScreenInstruction): Uint8Array | undefined {
  if (one.opcode === SCREEN_TEXT_INLINE) return one.glyphs;
  if (one.opcode === SCREEN_TEXT_AT) return glyphsReferencedBy(c, one);
  return undefined;
}

/**
 * How a reader takes a value off a configuration's bytes: one byte at a blob offset. The readers that
 * describe a configuration for a builder take one, section 356, so a caller can record which bytes are
 * read as values and hand them bytes it has overwritten everywhere else; where the reading only finds
 * its way, by an opcode, a count or a position, it reads the container itself.
 */
export type ValueReader = (offset: number) => number;

/** The plain reader: the configuration's own bytes. */
export function blobReader(c: Container): ValueReader {
  return (offset) => c.blob[offset] as number;
}

/**
 * The glyph codes a text instruction draws, as `textGlyphs` finds them, taken through `read`: the
 * inline codes where it draws them inline, and where it draws them by reference the address read
 * through `read` and the codes at it, as many as the reference names. Undefined for anything else.
 */
export function textValues(c: Container, one: ScreenInstruction, read: ValueReader): number[] | undefined {
  const glyphs = textGlyphs(c, one);
  if (glyphs === undefined) return undefined;
  if (one.opcode === SCREEN_TEXT_INLINE) return [...glyphs].map((_, k) => read(one.start + 3 + k));
  const address = read(one.start + 3) | (read(one.start + 4) << 8) | (read(one.start + 5) << 16);
  const off = c.blobOffsetOf(address);
  if (off === undefined) return undefined;
  return [...glyphs].map((_, k) => read(off + k));
}

/** The text instruction a program draws at `(x, y)`, its index and the font in effect there. */
export function textAt(
  program: readonly ScreenInstruction[], x: number, y: number,
): { index: number; font: number | undefined } | undefined {
  let font: number | undefined;
  for (let index = 0; index < program.length; index += 1) {
    const one = program[index] as ScreenInstruction;
    if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0];
    if ((one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT)
        && one.operands[0] === x && one.operands[1] === y) {
      return { index, font };
    }
  }
  return undefined;
}

/** The screen program a page calls first, its header, as an address, or undefined without one. */
export function headerOf(c: Container, page: ModePage): number | undefined {
  const first = screenProgram(c, page.program)?.[0];
  return first?.opcode === SCREEN_CALL ? u24(first.operands, 0) : undefined;
}

/**
 * Whether font `font`, set `set`, holds a glyph for every character of `text`: what `codesFor` refuses
 * without. A configuration carries only the glyphs its compiler needed, so this is per configuration.
 */
export function spellsIn(
  map: NonNullable<ReturnType<typeof characterMap>>, c: Container, set: FontSet, text: string, font: number,
): boolean {
  try {
    codesFor(map, c, set, text, font);
    return true;
  } catch {
    return false;
  }
}

/**
 * The font to draw a menu label in: the one the page already uses where it can spell the label, and
 * otherwise the nearest in height that can.
 *
 * **A configuration carries only the glyphs it draws**, so a font is a partial alphabet and which
 * one is complete is per configuration rather than per model. Measured over 63 letters, digits and
 * the space on three arch 12 (Harmony One) configurations, section 275: the best set covers 61, 58
 * and 55 of them and it is font 9, 9 and **5**. So an index cannot be tabulated, which is what
 * `DEVICE_ROW_FONT` does and why a device title is refused for most words on the factory
 * configuration.
 *
 * Height is the tie break rather than coverage, because a label is going into a row of fixed pitch:
 * a set that spells the word in the wrong size draws over its neighbours, where a set one glyph
 * short simply refuses.
 */
export function fontThatSpells(
  c: Container,
  map: NonNullable<ReturnType<typeof characterMap>>,
  text: string,
  preferred: number,
): number {
  const sets = fontSets(c) ?? [];
  const spells = (font: number): boolean => {
    const set = sets[font];
    return set !== undefined && spellsIn(map, c, set, text, font);
  };
  if (spells(preferred)) return preferred;
  const want = sets[preferred]?.height;
  const able = sets.map((_, font) => font).filter(spells);
  if (able.length === 0 || want === undefined) {
    // Reported against the font the page actually uses, since that is the one a reader will look at.
    codesFor(map, c, sets[preferred] as FontSet, text, preferred);
    throw new ComposeError(`no font in this config spells '${text}'`);
  }
  return able.reduce((best, font) =>
    Math.abs((sets[font] as FontSet).height - want) < Math.abs((sets[best] as FontSet).height - want)
      ? font : best);
}
