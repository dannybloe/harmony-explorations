/**
 * A configuration's font table in our own letters: `todo-compile-650.md` 8.2, decisions 19 and 20, built for
 * the Harmony 650 first and for the Harmony One since `todo-compile-one.md` 5.2.
 *
 * Base slot 7 is a table of font sets, a set a list of glyphs by code, and a code the configuration's own
 * number for a character, the same in every set (`text.ts`). A configuration gives a code only to a
 * character its own strings use, section 112, so no set of Logitech's holds a character beyond those, which
 * is why the composers had to borrow a letter from another set or refuse a name.
 *
 * **What this does is re-letter each set in place.** Each set keeps its place in the table, its height and
 * every code it had, so every text in the configuration, the ones no builder here generates among them,
 * still names the same character; each glyph is replaced by the same character in our letters, from
 * `lettering.ts`; and every printable ASCII character the configuration has no code for gets a new code,
 * the same in every set, appended after the highest. So every set spells every printable character, and a
 * text drawn in any of them can be spelled from its word.
 *
 * **Which of our faces a set gets is read off the set**, by measurements that tell Logitech's faces apart: its
 * height, whether its glyphs carry a shadow, the stroke, as the median run of ink along a row, and the median
 * row a capital starts on. `measureSet` takes the measurements, which are the same on every family, and the
 * configuration's family names the face, `Family.fonts`: the four slot family's nine faces by the table in
 * `families/four-slot/fonts.ts`, derived on the 13 Harmony 650 compiles, and the touch family's five by the
 * one in `families/touch/fonts.ts`, section 396. The faces themselves are `lettering.ts`'s, sized to land on
 * Logitech's rows. This module tested the architecture for it until `todo-compile-one.md` 3.3.3.5.
 *
 * **How a set is coloured is read off it as well**, `lettering.ts`: a set Logitech draws with a shadow gets
 * white letters over a black one, and a set drawn without one, the words on the white bars, dark letters.
 *
 * Glyphs are shared: one face in one colouring draws a character once, and every set of that face and
 * colouring points at it, where Logitech carries a copy per set: the table changes by -2.9 to +7.4 percent
 * on 12 of the 13 compiles while every set holds every character, and grows 36 percent on another owner's,
 * whose sets are few and small. No Logitech configuration shares a glyph, so this was
 * read in the firmware before it was relied on, section 368: on the Harmony 650 0.2 and the Harmony 700 2.8
 * the text routine finds a glyph from scratch for every character, the set's address and then the pointer
 * at `3 + 3 * (code - 1)`, and decodes it to its own end byte, consulting no neighbour, no count and no
 * cache. So whether sets share a glyph is the family's to say, `FamilyFonts.sharesGlyphs`, and the touch
 * family, whose routine is unread, does not. **It also ignores a set's first code**, always subtracting 1, so
 * a set that does not start at code 1 is refused here rather than carried; every set of the 13 compiles
 * starts there, and every set of the Harmony One's nineteen.
 *
 * Built only where the family says its faces were measured, `FamilyFonts.refusal`: the four slot family's on
 * the Harmony 650's skins alone, the touch family's on every Harmony One, and nothing for a configuration no
 * family serves. Read only towards hardware: the result is pieces.
 */
import type { Container } from './gspm.ts';
import type { ContainerLayout, ContainerPiece, PieceRef } from './frame.ts';
import { layOutContainer } from './frame.ts';
import { FONT_TABLE_COUNT_WIDTH, IMAGE_TABLE_SLOT, encodeGlyph, fontSets, glyphOf, type FontSet, type Glyph } from './font.ts';
import { Writer } from './emit.ts';
import { characterMap, type CharacterMap } from './text.ts';
import {
  LETTERING_CHARACTERS, defaultWeight, letterRows, type LetterFace, type LetterInks, type Lettering, type OxaniumFaceName,
  type OxaniumWeight,
} from './lettering.ts';
import { familyOf } from './families/registry.ts';

/** A refusal, named so a caller can tell a configuration this does not describe from a bug. */
export class FontTableError extends Error {}

/** A glyph code is seven bits in every string the composers write, `compose.ts`'s `codesFor`. */
export const FONT_CODE_CEILING = 0x80;

/** What a set was measured to be, and the face and colouring it is given. */
export interface SetFace {
  height: number;
  /** Its shadow colour, or undefined for a set drawn without one. */
  shadow: number | undefined;
  ink: number;
  /** The median run of ink along a row: one pixel for a regular stroke, two for a bold one. */
  stroke: number;
  /** The median first row of ink of its capitals, undefined where it draws none. */
  capitalTop: number | undefined;
  face: OxaniumFaceName;
  lettering: Lettering;
  /**
   * The inks it is lettered in, the family's choice, `todo-compile-650.md` 10.7.5. Absent on a set only
   * measured, `measureSet`, since Logitech's set was not lettered by us.
   */
  inks?: LetterInks;
  /** The weight it is lettered in, the family's choice per face, `todo-compile-650.md` 10.8.5. Absent as `inks` is. */
  weight?: OxaniumWeight;
  /**
   * The one colour its letters are smoothed against, RGB565, on a set added by `extra`: every pixel a letter
   * partly covers is its ink mixed with this, so the set reads right on that colour alone. Absent on a set
   * drawn in its inks only.
   */
  background?: number;
}

/**
 * A font set added after a configuration's own: a copy of set `like`, in its face, height, lettering and
 * inks, lettered in `weight` and smoothed against `background`, RGB565. What a family asks for when text
 * sits on one known colour, the label on a flat box of ours, `todo-compile-one.md` 1.2.11.2: a letter's
 * smoothed edge carries the colour it was mixed with, so a set is smoothed for one background and no other,
 * and no set of the configuration's own can be, since each is drawn over several.
 */
export interface ExtraFontSet {
  like: number;
  /** Omitted, the weight set `like` is lettered in. */
  weight?: OxaniumWeight;
  background: number;
  /** Omitted, the inks set `like` is lettered in: a copy in another set's colours where given. */
  inks?: LetterInks;
}

/**
 * What `measureSet` reads off one of Logitech's sets that a family names its face by, `FamilyFonts.faceOf`.
 * The same measurements on every family; which face they make is the family's.
 */
export interface SetMeasurement {
  /** Where the set is, for a refusal. */
  address: number;
  height: number;
  /** The median run of ink along a row: one pixel for a regular stroke, two for a bold one. */
  stroke: number;
  /** The median first row of ink of its capitals, undefined where it draws none. */
  capitalTop: number | undefined;
}

/** A family's answer to `faceOf`: the face, or why none of its faces fits the set, which `measureSet` refuses with. */
export type FaceOrRefusal = OxaniumFaceName | { readonly refusal: string };

/** The decoded glyphs of a set with the code each draws. */
function setGlyphs(c: Container, set: FontSet): [number, Glyph][] {
  const out: [number, Glyph][] = [];
  set.glyphs.forEach((address, k) => {
    if (address === undefined) return;
    const glyph = glyphOf(c, set, set.first + k);
    if (glyph === undefined) throw new FontTableError(`font set at ${set.address.toString(16)}: code ${set.first + k} does not decode`);
    out.push([set.first + k, glyph]);
  });
  return out;
}

const median = (values: number[]): number | undefined => {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
};

/**
 * Measure a set and name its face, the configuration's family naming it from the measurements, per the
 * header. The shadow is the colour every pixel of which has the ink one up and one left of it; the ink is
 * then the other most common colour. Refuses a height none of the family's faces has, and a configuration no
 * family serves.
 */
export function measureSet(c: Container, set: FontSet, map: CharacterMap): SetFace {
  const glyphs = setGlyphs(c, set);
  const counts = new Map<number, number>();
  for (const [, g] of glyphs) for (const row of g.rows) for (const p of row) if (p !== undefined) counts.set(p, (counts.get(p) ?? 0) + 1);
  const byCount = [...counts].sort((a, b) => b[1] - a[1]).map(([value]) => value);
  let ink = byCount[0];
  let shadow: number | undefined;
  for (const candidate of byCount.slice(0, 2)) {
    const other = byCount.find((value) => value !== candidate);
    if (other === undefined) continue;
    let seen = 0;
    let under = true;
    for (const [, g] of glyphs) {
      g.rows.forEach((row, y) => row.forEach((p, x) => {
        // A pixel on the top row or the first column has no ink one up and one left inside the glyph to
        // be the shadow of: an accent clipped by the cell leaves its shadow there, as the French compile's
        // do, one pixel in 535 to 1005, and counting it would read the whole set as unshadowed.
        if (p !== other || y === 0 || x === 0) return;
        seen += 1;
        if (g.rows[y - 1]![x - 1] !== candidate) under = false;
      }));
    }
    if (under && seen > 0) {
      ink = candidate;
      shadow = other;
    }
  }
  if (ink === undefined) throw new FontTableError(`font set at ${set.address.toString(16)} draws nothing`);
  const runs: number[] = [];
  const tops: number[] = [];
  for (const [code, g] of glyphs) {
    for (const row of g.rows) {
      let run = 0;
      for (const p of [...row, undefined]) {
        if (p === ink) run += 1;
        else {
          if (run > 0) runs.push(run);
          run = 0;
        }
      }
    }
    if (/^[A-Z]$/.test(map.codes.get(code) ?? '')) {
      const top = g.rows.findIndex((row) => row.includes(ink));
      if (top >= 0) tops.push(top);
    }
  }
  const stroke = median(runs) ?? 0;
  const capitalTop = median(tops);
  // The family names the face, since which of our faces a set of a given height and stroke is differs between
  // the families' compiles; a configuration no family serves has had no face measured for it.
  const fonts = familyOf(c)?.fonts;
  if (fonts === undefined) {
    throw new FontTableError(`no family serves architecture ${c.architecture}, so no face of ours was measured for its font sets`);
  }
  const named = fonts.faceOf({ address: set.address, height: set.height, stroke, capitalTop });
  if (typeof named !== 'string') throw new FontTableError(named.refusal);
  const face = named;
  return { height: set.height, shadow, ink, stroke, capitalTop, face, lettering: shadow === undefined ? 'plain' : 'shadowed' };
}

/**
 * The character each code of a configuration lettered in ours stands for, `withOxaniumFonts`' numbering: every
 * code the configuration's character map reads keeps its character, and every printable character it has no
 * code for takes the next code after the highest one in use, the map's or a set's (`highestSet`), in
 * `LETTERING_CHARACTERS` order. A family that states its table for a configuration built from nothing reads
 * a donor's numbering through this, so the two cannot drift, `families/touch/fontsets.ts`. Refuses a
 * character past the seven bits a code has.
 */
export function letteredCodes(
  map: CharacterMap, highestSet: number,
): { characters: Map<number, string>; added: [string, number][]; last: number } {
  const characters = new Map<number, string>();
  for (const [code, ch] of map.codes) characters.set(code, ch);
  const highest = Math.max(highestSet, ...characters.keys());
  const have = new Set(characters.values());
  const added: [string, number][] = [];
  let next = highest + 1;
  for (const ch of LETTERING_CHARACTERS) {
    if (have.has(ch)) continue;
    if (next >= FONT_CODE_CEILING) throw new FontTableError(`no seven bit code is left for '${ch}'`);
    characters.set(next, ch);
    added.push([ch, next]);
    next += 1;
  }
  return { characters, added, last: next - 1 };
}

export interface FontTableBuilt {
  layout: ContainerLayout;
  /** Per set, in table order, what it was measured to be and given. */
  faces: SetFace[];
  /** The characters that had no code, with the code each was given. */
  added: [string, number][];
  /** How many glyphs the table holds now, each shared glyph once. */
  glyphs: number;
}

/**
 * Re-letter every font set of a configuration in our letters and give every printable ASCII
 * character a code, per the header. `layout` is `takeApart` of the configuration. Refuses a configuration
 * whose texts no character map reads, a glyph whose character it does not settle, a character our letters
 * do not have, a code past seven bits, and a glyph something other than its set points at.
 */
export function withOxaniumFonts(
  layout: ContainerLayout, inks: LetterInks | 'own', weights: Readonly<Partial<Record<OxaniumFaceName, OxaniumWeight>>> = {},
  extra: readonly ExtraFontSet[] = [],
): FontTableBuilt {
  if (inks !== 'own' && new Set([inks.shadowed, inks.plain, inks.shadow]).size !== 3) {
    throw new FontTableError('the two inks and the shadow are three colours, or a letter could not be read back');
  }
  const c = layOutContainer(layout).container;
  // Built only where the family's faces were measured, which the family says per skin, and nowhere no family
  // serves; the reason is the family's own.
  const fonts = familyOf(c)?.fonts;
  const unmeasured = 'the font table is built only where a family\'s faces were measured';
  if (fonts === undefined) throw new FontTableError(`${unmeasured}: no family serves architecture ${c.architecture}`);
  const refusal = fonts.refusal(layout.skin);
  if (refusal !== undefined) throw new FontTableError(`${unmeasured}: ${refusal}`);
  const map = characterMap(c);
  if (map === undefined) throw new FontTableError('the configuration draws no text a character map reads');
  const sets = fontSets(c);
  if (sets === undefined || sets.length === 0) throw new FontTableError('base slot 7 holds no font set');

  // The pieces: the table is base slot 7's head, its sets and their glyphs what sits in front of it.
  const section = layout.sections[IMAGE_TABLE_SLOT];
  const table = section?.head[0];
  if (section === undefined || table === undefined) throw new FontTableError('base slot 7 is not taken apart');
  const tableRefs = [...table.refs].sort((a, b) => a.at - b.at);
  const setPieces = tableRefs.map((ref) => {
    if (!('to' in ref) || ref.offset !== 0) throw new FontTableError('a font table entry does not name a set piece');
    return ref.to;
  });
  if (setPieces.length !== sets.length) throw new FontTableError('the font table and its pieces disagree about how many sets');
  const oldGlyphs = new Set<ContainerPiece>();
  for (const piece of setPieces) for (const ref of piece.refs) if ('to' in ref) oldGlyphs.add(ref.to);
  const everyPiece = [layout.keyTable, ...layout.body, ...layout.pictures,
    ...layout.sections.flatMap((one) => (one === undefined ? [] : [...one.before, ...one.head]))];
  for (const piece of everyPiece) {
    if (setPieces.includes(piece)) continue;
    if (piece.refs.some((ref) => 'to' in ref && oldGlyphs.has(ref.to))) {
      throw new FontTableError(`${piece.owner ?? 'a piece'} points at a glyph, which only a font set may`);
    }
  }

  // Every character a code stands for, which every set will now draw, and a code for those with none.
  const { characters, added, last } = letteredCodes(map, Math.max(...sets.map((set) => set.first + set.count - 1)));

  const faces = sets.map((set): SetFace => {
    const measured = measureSet(c, set, map);
    // `own` keeps each set's colours, its ink and its shadow: a Harmony One draws every set in a pair of its
    // own, ten pairs over its compiles, where the 650 family letters every set in one scheme.
    const setInks = inks === 'own'
      ? { shadowed: measured.ink, plain: measured.ink, shadow: measured.shadow ?? measured.ink }
      : inks;
    return { ...measured, inks: setInks, weight: weights[measured.face] ?? defaultWeight(measured.face) };
  });
  const glyphPieces = new Map<string, ContainerPiece>();
  // A glyph is shared between sets only where the firmware's text routine was read to allow it, section 368,
  // which is the family's to say: otherwise each set gets glyphs of its own.
  const shared = fonts.sharesGlyphs;
  // `again` is the code of a second code in one set that stands for a character an earlier code already does:
  // Logitech's Harmony One compiles carry two blank codes, a 3 and a 4 pixel space, both a space by the
  // character map. Two codes of one set may not point at one glyph, since a set's glyphs are bounded by the
  // next one's address, `decodedSet`, so the second gets a copy of its own.
  const glyphPiece = (face: SetFace, ch: string, index: number, again?: number): ContainerPiece => {
    const own = lettered(face);
    const key = `${shared ? '' : `${index} `}${face.face} ${face.weight} ${face.lettering} ${own.shadowed} ${own.plain} ${own.shadow} ${ch}`
      + (face.background === undefined ? '' : ` on ${face.background}`) + (again === undefined ? '' : ` again ${again}`);
    let piece = glyphPieces.get(key);
    if (piece === undefined) {
      const rows = letterRows(letterFaceOf(face), ch, face.lettering, own, face.background);
      piece = { bytes: encodeGlyph(rows[0]!.length, rows), refs: [], owner: 'slot-7-glyph' };
      glyphPieces.set(key, piece);
    }
    return piece;
  };

  sets.forEach((set, index) => {
    if (set.first !== 1) throw new FontTableError(`font set ${index} starts at code ${set.first}, which the firmware does not read`);
    const face = faces[index]!;
    // Every code the set had keeps its character, and the set now runs to the last code given.
    for (const [code] of setGlyphs(c, set)) {
      const ch = characters.get(code);
      if (ch === undefined) throw new FontTableError(`code ${code} of font set ${index} draws no character the map settles`);
      if (!LETTERING_CHARACTERS.includes(ch)) throw new FontTableError(`code ${code} draws '${ch}', which our letters do not have`);
    }
    const count = last - set.first + 1;
    if (count > 0xff) throw new FontTableError(`font set ${index} would hold ${count} codes`);
    const piece = setPieces[index]!;
    const bytes = new Uint8Array(3 + 3 * count);
    bytes[0] = set.height;
    // The header keeps the form it was read in, `fontSetHeader`: the count at +2 after the first code, or
    // at +1 with a zero after it.
    if (set.countAt === 2) {
      bytes[1] = set.first;
      bytes[2] = count;
    } else {
      bytes[1] = count;
      bytes[2] = 0;
    }
    const refs: PieceRef[] = [];
    const drawn = new Set<string>();
    for (let k = 0; k < count; k += 1) {
      const ch = characters.get(set.first + k);
      if (ch === undefined || !LETTERING_CHARACTERS.includes(ch)) continue;
      refs.push({ at: 3 + 3 * k, to: glyphPiece(face, ch, index, drawn.has(ch) ? set.first + k : undefined), offset: 0 });
      drawn.add(ch);
    }
    piece.bytes = bytes;
    piece.refs = refs;
  });

  // The added sets, after the configuration's own so no index a screen selects moves: each spells every
  // code the others do, in its header's form, and the table grows by their pointers and its count.
  const extraFaces: SetFace[] = [];
  const extraPieces = extra.map((one, k): ContainerPiece => {
    const like = sets[one.like];
    const likeFace = faces[one.like];
    if (like === undefined || likeFace === undefined) throw new FontTableError(`an added set copies set ${one.like}, which the configuration does not carry`);
    const face: SetFace = {
      ...likeFace, weight: one.weight ?? likeFace.weight ?? defaultWeight(likeFace.face), background: one.background,
      ...(one.inks === undefined ? {} : { inks: one.inks }),
    };
    extraFaces.push(face);
    const index = sets.length + k;
    const count = last - like.first + 1;
    const bytes = new Uint8Array(3 + 3 * count);
    bytes[0] = like.height;
    if (like.countAt === 2) {
      bytes[1] = like.first;
      bytes[2] = count;
    } else {
      bytes[1] = count;
      bytes[2] = 0;
    }
    const refs: PieceRef[] = [];
    const drawn = new Set<string>();
    for (let code = like.first; code <= last; code += 1) {
      const ch = characters.get(code);
      if (ch === undefined || !LETTERING_CHARACTERS.includes(ch)) continue;
      refs.push({ at: 3 + 3 * (code - like.first), to: glyphPiece(face, ch, index, drawn.has(ch) ? code : undefined), offset: 0 });
      drawn.add(ch);
    }
    return { bytes, refs, owner: setPieces[0]?.owner ?? 'slot-7-set' };
  });
  if (extraPieces.length > 0) {
    if (table.bytes.length !== FONT_TABLE_COUNT_WIDTH + 3 * sets.length) {
      throw new FontTableError('the font table is not a count and its pointers alone, so it is not grown');
    }
    const total = sets.length + extraPieces.length;
    const grown = new Uint8Array(FONT_TABLE_COUNT_WIDTH + 3 * total);
    grown.set(table.bytes);
    grown.set(new Writer(2).u16(total).bytes, 0);
    table.bytes = grown;
    table.refs = [...table.refs,
      ...extraPieces.map((to, k): PieceRef => ({ at: FONT_TABLE_COUNT_WIDTH + 3 * (sets.length + k), to, offset: 0 }))];
  }

  section.before = [...glyphPieces.values(), ...setPieces, ...extraPieces];
  return { layout, faces: [...faces, ...extraFaces], added, glyphs: glyphPieces.size };
}

/**
 * Whether a set's letters are smoothed: drawn in more colours than an ink and a shadow, every pixel a letter
 * partly covers being a mix. Every set of Logitech's is an ink and at most a shadow, `lettering.ts`, so a
 * smoothed set is one of ours, lettered against a background.
 */
export function isSmoothedSet(c: Container, set: FontSet): boolean {
  const colours = new Set<number>();
  for (const [, glyph] of setGlyphs(c, set)) {
    for (const row of glyph.rows) for (const p of row) if (p !== undefined) colours.add(p);
    if (colours.size > 2) return true;
  }
  return false;
}

/**
 * The set `withOxaniumFonts` added as a copy of set `like` in `weight` smoothed against `background`, found by
 * its letters rather than its index: the one whose capital A is that face's, so a caller holds no set number.
 * `weight` omitted is the face's default, the weight `like` is lettered in where its build named none, and
 * `inks` omitted are `like`'s own.
 * Undefined where the configuration carries no such set.
 */
export function fontSetOn(
  c: Container, like: number, weight: OxaniumWeight | undefined, background: number, inks?: LetterInks,
): number | undefined {
  const map = characterMap(c);
  const sets = fontSets(c);
  const likeSet = sets?.[like];
  if (map === undefined || sets === undefined || likeSet === undefined) return undefined;
  const measured = measureSet(c, likeSet, map);
  const own = inks ?? { shadowed: measured.ink, plain: measured.ink, shadow: measured.shadow ?? measured.ink };
  const want = JSON.stringify(letterRows({ name: measured.face, weight: weight ?? defaultWeight(measured.face) }, 'A',
    measured.lettering, own, background));
  const code = [...map.codes].find(([, ch]) => ch === 'A')?.[0];
  if (code === undefined) return undefined;
  const found = sets.findIndex((set, index) => index !== like && set.height === likeSet.height
    && JSON.stringify(glyphOf(c, set, code)?.rows) === want);
  return found < 0 ? undefined : found;
}

export interface FontTableChecked {
  sets: number;
  /** How many glyphs were compared with our letters, a shared one once per set. */
  glyphs: number;
}

/**
 * Read a configuration's font table back and hold it to what `withOxaniumFonts` promises: every set spells
 * every printable ASCII character, each glyph is exactly that character in the face and colouring the set
 * was given, and the character map reads the configuration through our alphabet with every drawn code
 * resolved. `faces` is the build's own, since a set's face is read off Logitech's glyphs, which are gone.
 */
export function checkOxaniumFonts(c: Container, faces: readonly SetFace[]): FontTableChecked {
  const map = characterMap(c);
  if (map === undefined || map.alphabet !== 'oxanium') throw new FontTableError('the character map does not read our letters');
  if (map.drawn.resolved !== map.drawn.total) {
    throw new FontTableError(`${map.drawn.total - map.drawn.resolved} drawn codes are not resolved`);
  }
  const sets = fontSets(c) ?? [];
  if (sets.length !== faces.length) throw new FontTableError(`${sets.length} sets where ${faces.length} were built`);
  const codeOf = new Map<string, number>();
  for (const [code, ch] of map.codes) if (!codeOf.has(ch)) codeOf.set(ch, code);
  let glyphs = 0;
  sets.forEach((set, index) => {
    const face = faces[index]!;
    for (const ch of LETTERING_CHARACTERS) {
      const code = codeOf.get(ch);
      if (code === undefined) throw new FontTableError(`no code draws '${ch}'`);
      const glyph = glyphOf(c, set, code);
      if (glyph === undefined) throw new FontTableError(`font set ${index} has no glyph for '${ch}'`);
      const want = letterRows(letterFaceOf(face), ch, face.lettering, lettered(face), face.background);
      if (JSON.stringify(glyph.rows) !== JSON.stringify(want)) {
        throw new FontTableError(`font set ${index}'s '${ch}' is not ${face.face} ${face.weight} ${face.lettering}`);
      }
      glyphs += 1;
    }
  });
  return { sets: sets.length, glyphs };
}

/** The inks a set was lettered in, which only a set `withOxaniumFonts` lettered has. */
export function lettered(face: SetFace): LetterInks {
  if (face.inks === undefined) throw new FontTableError(`a ${face.face} set was measured and not lettered`);
  return face.inks;
}

/** The face a lettered set is drawn in, its weight included. */
export function letterFaceOf(face: SetFace): LetterFace {
  if (face.weight === undefined) throw new FontTableError(`a ${face.face} set was measured and not lettered`);
  return { name: face.face, weight: face.weight };
}
