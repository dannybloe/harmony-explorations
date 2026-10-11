/**
 * Our letters blended into the colour they are drawn on: `todo-compile-650.md` 8.2.6.
 *
 * `fonttable.ts` letters every font set in one bit, as Logitech's are: an ink, a shadow, and skipped pixels
 * the background shows through. That is a staircase at every edge, and Logitech's letters hide it by being
 * drawn for the size. Ours are a typeface scaled down, so they are drawn from Oxanium's grey coverage
 * instead, each pixel the ink mixed with the colour under it (`lettering.ts`). A pixel is a full RGB565
 * colour, so the remote draws such a letter as it draws any other; what it cannot do is mix, so a letter
 * blended for orange is only right on orange.
 *
 * **So every background gets its own copy of a set.** A set is appended to base slot 7 per pair of a set
 * and a colour, its glyphs blended for that colour, and the `SCREEN_SELECT_FONT` that chose the set is
 * pointed at the copy. On all 13 Harmony 650 compiles no select governs strings on two colours, section 370,
 * so the select is the only byte that changes, and no program is copied.
 *
 * **Which colour a text is drawn on is read off the rendering**, `render.ts`'s `TextDrawn`: every page of
 * every mode is drawn, every variant of it, and for each string the pixels in its box before it is drawn.
 * Where every string a select governs sits on one colour, give or take the dithering of a designed picture
 * (`flatColour`), that select gets the blended
 * copy. Where it does not, because a box spans a picture, touches another colour, is on a page whose
 * variants were too many to draw, or no page reaches it, the select keeps the one bit set, which is right
 * on any background. That is the fallback, not an error, and on the 13 compiles no select needs it.
 *
 * Glyphs are shared as `fonttable.ts` shares them: one face in one colouring on one background draws a
 * character once.
 *
 * Gated on the Harmony 650, as `fonttable.ts` is. The firmware takes a select's operand as one byte, so at
 * most 256 sets; a configuration that would need more is refused.
 */
import type { Container } from './gspm.ts';
import type { ContainerLayout, ContainerPiece, PieceRef } from './frame.ts';
import { layOutContainer } from './frame.ts';
import { IMAGE_TABLE_SLOT, encodeGlyph, fontSets, glyphOf } from './font.ts';
import { characterMap } from './text.ts';
import { letterRows } from './lettering.ts';
import { UNDRAWN, renderVariants, type TextDrawn } from './render.ts';
import { modePages } from './sections.ts';
import { HARMONY_650_SKINS } from './backgrounds.ts';
import { FontTableError, type SetFace } from './fonttable.ts';

/** How many appearances of one page are drawn before the page counts as not fully seen. */
export const BLEND_VARIANT_LIMIT = 64;

/** The firmware reads a font select's operand as one byte. */
export const FONT_SET_CEILING = 0x100;

/** A blended copy of a set: which set it copies, the colour it is blended for, and its own index. */
export interface BlendedSet {
  source: number;
  background: number;
  set: number;
}

export interface LettersBlended {
  layout: ContainerLayout;
  /** The copies appended, in table order. */
  blended: BlendedSet[];
  /** Selects pointed at a copy. */
  repointed: number;
  /** Selects left on their one bit set, by why. */
  kept: { notFlat: number; twoColours: number; unseen: number };
  /** Glyphs the copies hold, each shared one once. */
  glyphs: number;
}

/**
 * How far a pixel of a box may be from the box's colour, per RGB565 channel, in steps of that channel. A
 * designed picture is dithered: the dark start up and Off screens vary by one step in every channel under
 * their second line, and a letter blended into the commonest of those colours is off by one step at most,
 * which this panel does not show. Two steps is a different colour.
 */
export const BLEND_DITHER_STEPS = 1;

/**
 * The colour a box is drawn on: its commonest pixel, where every pixel is within `BLEND_DITHER_STEPS` of it
 * in every channel. Undefined where a box is empty, holds a pixel nothing drew, or spans two colours.
 */
export function flatColour(under: readonly number[]): number | undefined {
  if (under.length === 0 || under.includes(UNDRAWN)) return undefined;
  const counts = new Map<number, number>();
  for (const p of under) counts.set(p, (counts.get(p) ?? 0) + 1);
  // The commonest, and of those the lowest, so the answer does not depend on the order pixels were met in.
  const colour = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
  const near = (p: number): boolean =>
    Math.abs((p >> 11) - (colour >> 11)) <= BLEND_DITHER_STEPS
    && Math.abs(((p >> 5) & 0x3f) - ((colour >> 5) & 0x3f)) <= BLEND_DITHER_STEPS
    && Math.abs((p & 0x1f) - (colour & 0x1f)) <= BLEND_DITHER_STEPS;
  return [...counts.keys()].every(near) ? colour : undefined;
}

/** Every string every page draws, over every variant of the page, and the selects of pages not fully drawn. */
function observeTexts(c: Container): { texts: TextDrawn[]; truncated: Set<number> } {
  const texts: TextDrawn[] = [];
  const truncated = new Set<number>();
  const programs = new Set(modePages(c).map((page) => page.program));
  for (const program of programs) {
    const seen: TextDrawn[] = [];
    const { truncated: cut } = renderVariants(c, program, BLEND_VARIANT_LIMIT, (text) => seen.push(text));
    texts.push(...seen);
    if (cut) for (const text of seen) if (text.selectAt !== undefined) truncated.add(text.selectAt);
  }
  return { texts, truncated };
}

/**
 * Per select, the colour every string it governs is drawn on, or why it has none. A select met on a page
 * whose variants were cut short has had strings drawn that nobody looked at, so it has none either.
 */
function selectColours(c: Container): Map<number, { font: number; colour?: number; why?: 'notFlat' | 'twoColours' | 'unseen' }> {
  const { texts, truncated } = observeTexts(c);
  const out = new Map<number, { font: number; colour?: number; why?: 'notFlat' | 'twoColours' | 'unseen' }>();
  for (const text of texts) {
    if (text.selectAt === undefined) continue;
    const had = out.get(text.selectAt);
    if (had?.why !== undefined) continue;
    const colour = flatColour(text.under);
    if (colour === undefined) out.set(text.selectAt, { font: text.font, why: 'notFlat' });
    else if (had !== undefined && had.colour !== colour) out.set(text.selectAt, { font: text.font, why: 'twoColours' });
    else out.set(text.selectAt, { font: text.font, colour });
  }
  for (const select of truncated) {
    const had = out.get(select);
    if (had !== undefined && had.why === undefined) out.set(select, { font: had.font, why: 'unseen' });
  }
  return out;
}

/**
 * Blend our letters into the colour under them, per the header. `layout` is the result of `withOxaniumFonts`,
 * laid out and taken apart or as it returned it, and `faces` its `faces`, one per set in table order: a set's
 * face was read off Logitech's glyphs, which are gone.
 */
export function withBlendedLetters(layout: ContainerLayout, faces: readonly SetFace[]): LettersBlended {
  const laid = layOutContainer(layout);
  const c = laid.container;
  if (c.architecture !== 14 || !HARMONY_650_SKINS.has(layout.skin)) {
    throw new FontTableError('blended letters are built for the Harmony 650 alone, whose fonts they were measured on');
  }
  const map = characterMap(c);
  if (map === undefined || map.alphabet !== 'oxanium') throw new FontTableError('the configuration is not lettered in our letters');
  const sets = fontSets(c) ?? [];
  if (sets.length !== faces.length) throw new FontTableError(`${sets.length} sets where ${faces.length} faces were given`);

  const section = layout.sections[IMAGE_TABLE_SLOT];
  const table = section?.head[0];
  if (section === undefined || table === undefined) throw new FontTableError('base slot 7 is not taken apart');
  const setPieces = [...table.refs].sort((a, b) => a.at - b.at).map((ref) => {
    if (!('to' in ref) || ref.offset !== 0) throw new FontTableError('a font table entry does not name a set piece');
    return ref.to;
  });

  // Where each piece landed, so a select's blob offset can be turned into a byte of a piece.
  const everyPiece = [layout.keyTable, ...layout.body, ...layout.pictures,
    ...layout.sections.flatMap((one) => (one === undefined ? [] : [...one.before, ...one.head]))];
  const located = everyPiece
    .map((piece) => ({ piece, at: laid.offsetOf(piece) }))
    .filter((one): one is { piece: ContainerPiece; at: number } => one.at !== undefined)
    .sort((a, b) => a.at - b.at);
  const pieceAt = (offset: number): { piece: ContainerPiece; at: number } => {
    let lo = 0;
    let hi = located.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (located[mid]!.at <= offset) lo = mid;
      else hi = mid - 1;
    }
    const found = located[lo];
    if (found === undefined || offset >= found.at + found.piece.bytes.length) {
      throw new FontTableError(`no piece holds offset ${offset}`);
    }
    return found;
  };

  const glyphPieces = new Map<string, ContainerPiece>();
  const copies = new Map<string, number>();
  const blended: BlendedSet[] = [];
  const newSets: ContainerPiece[] = [];
  const copyOf = (source: number, background: number): number => {
    const key = `${source} ${background}`;
    const had = copies.get(key);
    if (had !== undefined) return had;
    const index = sets.length + newSets.length;
    if (index >= FONT_SET_CEILING) throw new FontTableError(`a blended copy would be font set ${index}, past the one byte a select holds`);
    const face = faces[source]!;
    const set = sets[source]!;
    const from = setPieces[source]!;
    const refs: PieceRef[] = [];
    for (const ref of from.refs) {
      const code = set.first + (ref.at - 3) / 3;
      const ch = map.codes.get(code);
      if (ch === undefined) throw new FontTableError(`code ${code} of font set ${source} draws no character the map settles`);
      const glyphKey = `${face.face} ${face.lettering} ${background} ${ch}`;
      let piece = glyphPieces.get(glyphKey);
      if (piece === undefined) {
        const rows = letterRows(face.face, ch, face.lettering, background);
        piece = { bytes: encodeGlyph(rows[0]!.length, rows), refs: [], owner: 'slot-7-glyph' };
        glyphPieces.set(glyphKey, piece);
      }
      refs.push({ at: ref.at, to: piece, offset: 0 });
    }
    newSets.push({ bytes: Uint8Array.from(from.bytes), refs, owner: from.owner ?? 'slot-7-set' });
    blended.push({ source, background, set: index });
    copies.set(key, index);
    return index;
  };

  const kept = { notFlat: 0, twoColours: 0, unseen: 0 };
  let repointed = 0;
  for (const [select, found] of [...selectColours(c)].sort((a, b) => a[0] - b[0])) {
    if (found.why !== undefined) {
      kept[found.why] += 1;
      continue;
    }
    if (found.font < 0 || found.font >= sets.length) continue;
    const index = copyOf(found.font, found.colour as number);
    const { piece, at } = pieceAt(select);
    if (piece.bytes[select - at] !== 16 || piece.bytes[select - at + 1] !== found.font) {
      throw new FontTableError(`the select at ${select} is not where the renderer met it`);
    }
    piece.bytes = Uint8Array.from(piece.bytes);
    piece.bytes[select - at + 1] = index;
    repointed += 1;
  }

  // The table grows by the copies, its count a little endian u16 as `fontSets` reads it.
  const count = sets.length + newSets.length;
  const bytes = new Uint8Array(2 + 3 * count);
  bytes[0] = count & 0xff;
  bytes[1] = count >> 8;
  table.bytes = bytes;
  table.refs = [...setPieces, ...newSets].map((to, k) => ({ at: 2 + 3 * k, to, offset: 0 }));
  section.before = [...section.before, ...glyphPieces.values(), ...newSets];
  return { layout, blended, repointed, kept, glyphs: glyphPieces.size };
}

export interface LettersBlendedChecked {
  /** Strings drawn in a blended copy, each on the colour its copy was blended for. */
  strings: number;
  /** Glyphs compared with `letterRows`, a shared one once per copy. */
  glyphs: number;
}

/**
 * Read the blended copies back and hold them to what `withBlendedLetters` promises: every glyph of a copy is
 * its character blended for the copy's colour, every string drawn in a copy is drawn on exactly that colour
 * in a rendering of the result, and the character map reads every drawn code. The two ends are independent:
 * the colour a copy was built for is the build's record, the colour under its strings is the result's pixels.
 */
export function checkBlendedLetters(c: Container, faces: readonly SetFace[], blended: readonly BlendedSet[]): LettersBlendedChecked {
  const map = characterMap(c);
  if (map === undefined || map.alphabet !== 'oxanium') throw new FontTableError('the character map does not read our letters');
  if (map.drawn.resolved !== map.drawn.total) {
    throw new FontTableError(`${map.drawn.total - map.drawn.resolved} drawn codes are not resolved`);
  }
  const sets = fontSets(c) ?? [];
  const copies = new Map(blended.map((one) => [one.set, one]));
  let glyphs = 0;
  for (const one of blended) {
    const set = sets[one.set];
    const face = faces[one.source];
    if (set === undefined || face === undefined) throw new FontTableError(`font set ${one.set} is missing`);
    for (let code = set.first; code < set.first + set.count; code += 1) {
      const ch = map.codes.get(code);
      const glyph = glyphOf(c, set, code);
      if (ch === undefined || glyph === undefined) continue;
      if (JSON.stringify(glyph.rows) !== JSON.stringify(letterRows(face.face, ch, face.lettering, one.background))) {
        throw new FontTableError(`font set ${one.set}'s '${ch}' is not ${face.face} ${face.lettering} blended for ${one.background.toString(16)}`);
      }
      glyphs += 1;
    }
  }
  let strings = 0;
  for (const text of observeTexts(c).texts) {
    const copy = copies.get(text.font);
    if (copy === undefined) continue;
    const colour = flatColour(text.under);
    if (colour !== copy.background) {
      throw new FontTableError(`the string at ${text.at} is drawn in a set blended for ${copy.background.toString(16)} on ${colour?.toString(16) ?? 'more than one colour'}`);
    }
    strings += 1;
  }
  return { strings, glyphs };
}
