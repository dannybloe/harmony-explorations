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
 * **Nothing in it is a remote's**: it reads a rendering, the colour under each text and the faces it is given.
 * Checked again for `todo-compile-one.md` 3.3.3.5, which moved the font table's per family facts into the
 * families: this module had none to move, the weight of a copy being already the caller's, `WeightFor`.
 * Whether a configuration's letters are blended is its builder's choice, `FourSlotChoices.blendLetters` on the
 * Harmony 600, 650 and 700; this said the step was gated on the Harmony 650 until 16 October 2026, when the
 * Harmony One's configuration came to be blended too, `todo-compile-one.md` 1.2.11.2, and the gate moved to
 * the callers, where the choice already was. The firmware takes a select's operand as one byte, read on the
 * Harmony 650 0.2 and the Harmony One 3.4, so at most 256 sets; a configuration that would need more is refused.
 *
 * A select already pointing at a set smoothed for one background, one a font step added, `ExtraFontSet`, is
 * left as it is: its letters are right where they are drawn, and a copy of a copy would blend twice.
 */
import { type Container, parse } from './gspm.ts';
import type { ContainerLayout, ContainerPiece, PieceRef } from './frame.ts';
import { layOutContainer, takeApart } from './frame.ts';
import { SCREEN_SELECT_FONT, reachablePrograms } from './screen.ts';
import { IMAGE_TABLE_SLOT, encodeGlyph, fontSets, glyphOf } from './font.ts';
import { characterMap } from './text.ts';
import { letterRows, type OxaniumWeight } from './lettering.ts';
import { UNDRAWN, renderVariants, type TextDrawn } from './render.ts';
import { modePages } from './sections.ts';
import { FontTableError, type SetFace, letterFaceOf, lettered } from './fonttable.ts';

/** How many appearances of one page are drawn before the page counts as not fully seen. */
export const BLEND_VARIANT_LIMIT = 64;

/** The firmware reads a font select's operand as one byte. */
export const FONT_SET_CEILING = 0x100;

/** A blended copy of a set: which set it copies, the colour it is blended for, and its own index. */
export interface BlendedSet {
  source: number;
  background: number;
  set: number;
  /** The weight it is lettered in where `weightFor` chose one other than its source's. */
  weight?: OxaniumWeight;
}

/**
 * A builder's say over the weight of a copy: given the face of the set a text was drawn in and the colour it
 * is drawn on, the weight to letter the copy in, or undefined for the set's own. What lets a family draw the
 * labels on its own boxes lighter than the same face elsewhere, which a set shared by every screen cannot
 * be: the Harmony One's labels on its activity and device boxes, `TouchChoices.labelWeight`.
 */
export type WeightFor = (face: SetFace, background: number) => OxaniumWeight | undefined;

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
    // A string pictures paint over afterwards is never seen, so the colour under it says nothing.
    if (text.selectAt === undefined || text.covered) continue;
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
export function withBlendedLetters(layout: ContainerLayout, faces: readonly SetFace[], weightFor?: WeightFor): LettersBlended {
  const laid = layOutContainer(layout);
  const c = laid.container;
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
    const own = faces[source]!;
    const weight = weightFor?.(own, background);
    const face: SetFace = weight === undefined ? own : { ...own, weight };
    const set = sets[source]!;
    const from = setPieces[source]!;
    const refs: PieceRef[] = [];
    for (const ref of from.refs) {
      const code = set.first + (ref.at - 3) / 3;
      const ch = map.codes.get(code);
      if (ch === undefined) throw new FontTableError(`code ${code} of font set ${source} draws no character the map settles`);
      // Shared by face, weight, colouring, inks and background: two sets of one face in different inks, which
      // every Harmony One configuration has and no Harmony 650 one does, blend a character apart.
      const inks = lettered(face);
      const glyphKey = `${face.face} ${face.weight} ${face.lettering} ${inks.shadowed} ${inks.plain} ${inks.shadow} ${background} ${ch}`;
      let piece = glyphPieces.get(glyphKey);
      if (piece === undefined) {
        const rows = letterRows(letterFaceOf(face), ch, face.lettering, lettered(face), background);
        piece = { bytes: encodeGlyph(rows[0]!.length, rows), refs: [], owner: 'slot-7-glyph' };
        glyphPieces.set(glyphKey, piece);
      }
      refs.push({ at: ref.at, to: piece, offset: 0 });
    }
    newSets.push({ bytes: Uint8Array.from(from.bytes), refs, owner: from.owner ?? 'slot-7-set' });
    blended.push({ source, background, set: index, ...(weight === undefined ? {} : { weight }) });
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
    if (faces[found.font]?.background !== undefined) continue;
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
    const own = faces[one.source];
    if (set === undefined || own === undefined) throw new FontTableError(`font set ${one.set} is missing`);
    const face: SetFace = one.weight === undefined ? own : { ...own, weight: one.weight };
    for (let code = set.first; code < set.first + set.count; code += 1) {
      const ch = map.codes.get(code);
      const glyph = glyphOf(c, set, code);
      if (ch === undefined || glyph === undefined) continue;
      if (JSON.stringify(glyph.rows) !== JSON.stringify(letterRows(letterFaceOf(face), ch, face.lettering, lettered(face), one.background))) {
        throw new FontTableError(`font set ${one.set}'s '${ch}' is not ${face.face} ${face.lettering} blended for ${one.background.toString(16)}`);
      }
      glyphs += 1;
    }
  }
  let strings = 0;
  for (const text of observeTexts(c).texts) {
    const copy = copies.get(text.font);
    if (copy === undefined || text.covered) continue;
    const colour = flatColour(text.under);
    if (colour !== copy.background) {
      throw new FontTableError(`the string at ${text.at} is drawn in a set blended for ${copy.background.toString(16)} on ${colour?.toString(16) ?? 'more than one colour'}`);
    }
    strings += 1;
  }
  return { strings, glyphs };
}

/**
 * The configuration with every font select the blending pointed at a copy pointed back at the set the copy was
 * blended from, `blended` being what `withBlendedLetters` made of it: the same length and every other byte as
 * it is, the copies themselves left in the font table, named by nothing, and the trailer restated.
 *
 * **What it is for**: a reader that knows a role by one font. The blending gives a select the copy for the
 * colour under its strings, so the selects one role makes on several backgrounds name several sets after it,
 * where they named one before; a screen builder's description refuses that, as it should on a compile of
 * Logitech's, which blends nothing. Pointed back, the configuration reads as it did before the blending, which
 * is what `todo-compile-one.md` 3.2.2's attribution describes the screens off. Only a select some page reaches,
 * `reachablePrograms`, is pointed back; the blending reads its selects off the same pages' renderings, and one
 * it repointed that this misses stays a copy, which the description then refuses rather than misreads.
 */
export function unblendedSelects(c: Container, blended: readonly BlendedSet[]): Container {
  if (blended.length === 0) return c;
  const source = new Map(blended.map((one) => [one.set, one.source]));
  const bytes = c.blob.slice();
  for (const program of reachablePrograms(c).values()) {
    for (const one of program) {
      if (one.opcode !== SCREEN_SELECT_FONT) continue;
      const from = source.get(one.operands[0] ?? -1);
      if (from === undefined) continue;
      // `start` is the opcode's blob offset, and a select is the opcode and the set, `withBlendedLetters`' check.
      if (bytes[one.start] !== SCREEN_SELECT_FONT) throw new FontTableError(`the select at ${one.start} is not where its program puts it`);
      bytes[one.start + 1] = from;
    }
  }
  // Laid out again so the trailer agrees with the bytes; nothing moves, since no length changed.
  return layOutContainer(takeApart(parse(bytes))).container;
}
