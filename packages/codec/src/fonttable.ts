/**
 * The Harmony 650's font table in our own letters: `todo-compile-650.md` 8.2, decisions 19 and 20.
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
 * **Which of our faces a set gets is read off the set**, by four measurements that tell Logitech's faces
 * apart: its height, whether its glyphs carry a shadow, the stroke, as the median run of ink along a row,
 * and on the 14 pixel bold sets the median row a capital starts on. The rule was derived on the 13 Harmony
 * 650 compiles in the lab (`work/fonts-8-2/faces.ts`), so on those it is a description; out of sample it
 * places all 18 sets of a fourteenth compile, `harvest_650_two_devices`, in the same groups. Nine faces,
 * `oxanium.ts`, sized to land on Logitech's rows:
 *
 * | height | stroke | face |
 * |---|---|---|
 * | 15 | one pixel | R15 |
 * | 15 | two | F15 |
 * | 14 | one | R14 |
 * | 14 | two, a capital from row 1 | F14W |
 * | 14 | two, a capital lower | F14 |
 * | 13 | one | R13, a Help style |
 * | 13 | two | F13 |
 * | 11 | any | F11 |
 * | 10 | any | F10 |
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
 * cache. **It also ignores a set's first code**, always subtracting 1, so a set that does not start at code
 * 1 is refused here rather than carried; every set of the 13 compiles starts there.
 *
 * Gated on the Harmony 650, whose compiles the faces were measured on, as `backgrounds.ts` is. Read only
 * towards hardware: the result is pieces.
 */
import type { Container } from './gspm.ts';
import type { ContainerLayout, ContainerPiece, PieceRef } from './frame.ts';
import { layOutContainer } from './frame.ts';
import { IMAGE_TABLE_SLOT, encodeGlyph, fontSets, glyphOf, type FontSet, type Glyph } from './font.ts';
import { characterMap, type CharacterMap } from './text.ts';
import { LETTERING_CHARACTERS, letterRows, type Lettering } from './lettering.ts';
import type { OxaniumFaceName } from './oxanium.ts';
import { HARMONY_650_SKINS } from './backgrounds.ts';

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
}

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
 * Measure a set and name its face, by the table in the header. The shadow is the colour every pixel of
 * which has the ink one up and one left of it; the ink is then the other most common colour. Refuses a
 * height none of the faces has.
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
  const face = ((): OxaniumFaceName => {
    switch (set.height) {
      case 15: return stroke >= 2 ? 'F15' : 'R15';
      case 14: return stroke < 2 ? 'R14' : capitalTop === 1 ? 'F14W' : 'F14';
      case 13: return stroke >= 2 ? 'F13' : 'R13';
      case 11: return 'F11';
      case 10: return 'F10';
      default: throw new FontTableError(`font set at ${set.address.toString(16)} is ${set.height} pixels high, which no face is`);
    }
  })();
  return { height: set.height, shadow, ink, stroke, capitalTop, face, lettering: shadow === undefined ? 'plain' : 'shadowed' };
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
 * Re-letter every font set of a Harmony 650 configuration in our letters and give every printable ASCII
 * character a code, per the header. `layout` is `takeApart` of the configuration. Refuses a configuration
 * whose texts no character map reads, a glyph whose character it does not settle, a character our letters
 * do not have, a code past seven bits, and a glyph something other than its set points at.
 */
export function withOxaniumFonts(layout: ContainerLayout): FontTableBuilt {
  const c = layOutContainer(layout).container;
  if (c.architecture !== 14 || !HARMONY_650_SKINS.has(layout.skin)) {
    throw new FontTableError('the font table is built for the Harmony 650 alone, whose fonts it was measured on');
  }
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
  const characters = new Map<number, string>();
  for (const [code, ch] of map.codes) characters.set(code, ch);
  const highest = Math.max(...sets.map((set) => set.first + set.count - 1), ...characters.keys());
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
  const last = next - 1;

  const faces = sets.map((set) => measureSet(c, set, map));
  const glyphPieces = new Map<string, ContainerPiece>();
  const glyphPiece = (face: SetFace, ch: string): ContainerPiece => {
    const key = `${face.face} ${face.lettering} ${ch}`;
    let piece = glyphPieces.get(key);
    if (piece === undefined) {
      const rows = letterRows(face.face, ch, face.lettering);
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
    for (let k = 0; k < count; k += 1) {
      const ch = characters.get(set.first + k);
      if (ch === undefined || !LETTERING_CHARACTERS.includes(ch)) continue;
      refs.push({ at: 3 + 3 * k, to: glyphPiece(face, ch), offset: 0 });
    }
    piece.bytes = bytes;
    piece.refs = refs;
  });

  section.before = [...glyphPieces.values(), ...setPieces];
  return { layout, faces, added, glyphs: glyphPieces.size };
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
      const want = letterRows(face.face, ch, face.lettering);
      if (JSON.stringify(glyph.rows) !== JSON.stringify(want)) {
        throw new FontTableError(`font set ${index}'s '${ch}' is not ${face.face} ${face.lettering}`);
      }
      glyphs += 1;
    }
  });
  return { sets: sets.length, glyphs };
}
