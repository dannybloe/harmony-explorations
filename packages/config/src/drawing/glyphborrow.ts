/**
 * Borrowing the letters a configuration's fonts lack from another configuration of the same remotes,
 * which is how a setup composed onto a Harmony 880 or 885 compile is lettered while those two are not lettered in our
 * own, R42.
 *
 * **Why borrowing is needed at all.** A configuration gives a glyph to a character only where its own strings
 * draw it, `reference/config-format/screens.md` "Base slot 7: the font table": a set holds the glyphs its own
 * texts use and no others. So a configuration composed onto a Logitech compile can name a device only with the
 * letters the compile happened to need. Bench unit A's title font has no F, L, G, N, w or h and its label fonts no
 * z, q, J or Y, so of the test setup's names "LG TV" (L, G), "KPN" (N), "Switch" (w, h) and "Film kijken" (F)
 * cannot be drawn as a title on it as it is, and "Muziek" (z) not as a label (the lab's `compile-1.6-setup.md`,
 * section 3, which also listed "Denon" for an N; its N is lower case and every letter of it is drawn already). The
 * Harmony 650 track never met this, since it started from a Logitech compile of a setup chosen for its letters; no
 * such compile exists for the 885.
 *
 * **What this does.** It copies the glyph a donor configuration holds for a character into a set of the target
 * that has none, byte for byte, and points the set's code for that character at the copy. A character the target
 * has no code for at all gets the next code, the same in every set, as a generator gives one: every set's
 * pointer array grows by NULL entries so they keep one count, the shape every generated configuration has.
 *
 * **The rule that makes a copied glyph the right letter: same face, proved, not assumed.** A glyph is pixels in
 * colours, so a donor's `F` belongs in a target set only if the donor's set is the same typeface, at the same size,
 * in the same ink and shadow. Nothing in a set's header says which face it is, and two sets of one height can be
 * different faces (unit A's title font and the font of its firmware messages are both fourteen rows high and share no
 * letter's bytes). So the proof is the glyphs the two
 * sets already share: every character both draw, other than a blank, must be the same bytes in both, and there
 * must be at least `BORROW_PROOF_MINIMUM` of them. **The measurement behind it is bimodal**, and is asserted in
 * `test/drawing/glyphborrow.test.ts`: over the eight Harmony 880 and 885 configurations the lab holds, every pair of sets of
 * one height either agrees on every non blank glyph they share, 280 pairs sharing 5 or more, or on none of them,
 * 294 pairs. No pair agrees on some and not others, so one disagreeing glyph is a different face and is refused,
 * and the minimum only keeps a coincidence of one or two shapes from passing as a proof. Where several matching
 * donor sets hold the character, their glyphs must agree too, or the borrow refuses: a disagreement there would be
 * the proof failing, not a choice to make.
 *
 * **Where a copy goes, and why there.** Our readers bound a set's last glyph by the set's own header, since the
 * compiler lays a set's glyphs out immediately before the array that points at them, `decodedSet` in `font.ts`. So
 * the copies are inserted at the set's header, which moves the header up and leaves them just under it, through
 * `relocate`, which rewrites every pointer the move invalidates and restamps the end address and the checksum. The
 * pointer array is grown the same way, at its own end, whenever a set's array stops short of a code being written
 * into it, a new code or an old one. Every byte the target already had keeps its value: only NULL pointers are
 * filled in and the count bytes restated.
 *
 * **A new code is drawn only in the sets it was borrowed into.** In every other set its pointer is NULL, and the
 * firmware checks neither a NULL pointer nor the count, so a text spelled with it in such a set sends the text
 * routine to address zero, and what it draws from there is not read. The guard is the one speller every composer
 * spells through, `codesFor` in `shared/spelling.ts` (and `spelledText` over it): it takes a code for a character
 * only where `glyphOf` finds a glyph for it in that very set, which a NULL pointer and a code past the count both
 * fail, so it refuses rather than spelling. `test/drawing/glyphborrow.test.ts` holds that for the borrowed codes; this module adds no second speller.
 *
 * **What the firmware does with it, and where that was read.** The text routine finds a glyph from the set's
 * address and the pointer at `3 + 3 * (code - first)` and decodes it to its own end byte, using neither the height
 * nor the count: read on the Harmony 880 and 885's application, `reference/config-format/screens.md` (the
 * `[^t-885-screens]` footnote), and on the Harmony 650 and 700, archive section 368. So a glyph anywhere in the
 * container is drawn, and a set's count is not what bounds a code. **Where the borrow is allowed is the table below
 * and nothing else**: the Harmony 880 and 885 alone, the only remotes on which the proof was measured. Once a family
 * serves them this permission belongs with that family's fonts rather than in a table here.
 *
 * **Not a font of ours.** A borrowed glyph is Logitech's, carried from one of their compiles to another of the same
 * remote. The Harmony 880 and 885 still borrow Logitech's letters this way; lettering them in our own, as
 * `withOxaniumFonts` does on the 650, is open, R42.
 * Read only towards hardware: the result is bytes in memory.
 */
import { Container, GspmError, parse, TRAILER_CHECKSUM_OFFSET, trailerChecksum } from '../container/gspm.ts';
import { IMAGE_SET_HEADER, decodedSet, fontSets, type FontSet } from '../screens/font.ts';
import { characterMap, isBlank, type CharacterMap } from '../screens/text.ts';
import { FONT_CODE_CEILING } from './fonttable.ts';
import { relocate } from '../edit/relocate.ts';
import { Writer } from '../container/emit.ts';
import { sameBytes } from '../support/bytes.ts';

/** A refusal, named so a caller can tell a borrow that cannot be proved from a bug. */
export class GlyphBorrowError extends Error {}

/**
 * The architectures a borrow is allowed on: those where the same face proof was measured over the configurations
 * the lab holds. Arch 8, the Harmony 880 and 885 (one application, so one text routine), eight configurations, the
 * bimodal count in the header. Another architecture joins on its own measurement, not by analogy: the Harmony 525
 * packs its glyphs two bits a pixel, and on the Harmony One and the 600 family nothing has compared sets across
 * configurations.
 */
export const GLYPH_BORROW_ARCHITECTURES: ReadonlySet<number> = new Set([8]);

/**
 * How many non blank glyphs two sets must share, every one byte identical, before they count as one face. The
 * smallest real agreement measured is 5 glyphs, between two of the small sets that hold six to ten glyphs, and no
 * pair of different faces agrees on even one, so anything from 1 to 5 separates the eight configurations; 3 keeps a
 * margin either side.
 */
export const BORROW_PROOF_MINIMUM = 3;

/** A configuration offered as a source of glyphs, with the name it is reported by. */
export interface GlyphDonor {
  name: string;
  container: Container;
}

/** The characters wanted in one set of the target, by its index in base slot 7, the operand of opcode 16. */
export interface GlyphWant {
  set: number;
  characters: string;
}

/** Why a donor set is or is not the target set's face: how many non blank glyphs they share and how many differ. */
export interface FaceProof {
  shared: number;
  differing: number;
}

/** A donor set that holds the wanted character in the target set's face, with the proof. */
export interface GlyphSource {
  donor: string;
  donorSet: number;
  proof: FaceProof;
}

/** One wanted character in one set, and every donor set that can supply it, or none. */
export interface GlyphSupply {
  set: number;
  character: string;
  /** The target's code for the character, or undefined where it has none and a borrow gives it a new one. */
  code: number | undefined;
  /** Every matching donor set holding it, in donor order then set order; empty where nothing supplies it. */
  sources: GlyphSource[];
}

/** One glyph the borrow copied, and where from. */
export interface BorrowedGlyph {
  set: number;
  character: string;
  code: number;
  donor: string;
  donorSet: number;
  /** The glyph's length in bytes, width byte and end byte included. */
  length: number;
}

export interface GlyphsBorrowed {
  /** The new container, end address and checksum restamped. */
  bytes: Uint8Array;
  borrowed: BorrowedGlyph[];
  /** The characters that had no code in the target, with the code each was given. */
  added: [string, number][];
}

/** A set's glyphs by character, each with its code, its bytes and whether it is blank. */
interface CharacterGlyph {
  code: number;
  bytes: Uint8Array;
  blank: boolean;
}

/**
 * The glyphs of one set keyed by the character the configuration's own map settles for each code. A code the map
 * cannot settle, or settles only by falling back on the seed (`ambiguous`), names no character here, so it is
 * neither evidence for a face nor something to borrow: the `I` against `l` pair is exactly such a code.
 */
function glyphsByCharacter(c: Container, map: CharacterMap, set: FontSet): Map<string, CharacterGlyph> {
  const out = new Map<string, CharacterGlyph>();
  for (const { index, address, glyph } of decodedSet(c, set)) {
    if (glyph === undefined) continue;
    const code = set.first + index;
    if (map.ambiguous.has(code)) continue;
    const character = map.codes.get(code);
    if (character === undefined || out.has(character)) continue;
    const off = c.blobOffsetOf(address);
    if (off === undefined) continue;
    out.set(character, { code, bytes: c.blob.slice(off, off + glyph.length), blank: isBlank(glyph) });
  }
  return out;
}

/**
 * Whether each set of one configuration is the face of each set of another, by the glyphs both already draw, per
 * the header: indexed `[set][otherSet]`, undefined where the heights differ, and otherwise the non blank characters
 * the two share, counted and compared byte for byte. A blank is left out because a blank glyph is a space of some
 * width in any face, so it proves nothing about the letters. The measurement the header quotes is this, over every
 * pair of the eight configurations.
 */
export function faceProofs(one: Container, other: Container): (FaceProof | undefined)[][] {
  const a = readSets(one);
  const b = readSets(other);
  return a.sets.map((set, k) => b.sets.map((candidate, j) => (
    candidate.height === set.height ? compare(a.glyphs[k]!, b.glyphs[j]!) : undefined)));
}

/** Whether a proof shows one face: at least `BORROW_PROOF_MINIMUM` shared, none differing. */
export function provesOneFace(proof: FaceProof | undefined): boolean {
  return proof !== undefined && proof.differing === 0 && proof.shared >= BORROW_PROOF_MINIMUM;
}

function compare(one: Map<string, CharacterGlyph>, two: Map<string, CharacterGlyph>): FaceProof {
  let shared = 0;
  let differing = 0;
  for (const [character, glyph] of one) {
    const other = two.get(character);
    if (other === undefined || glyph.blank || other.blank) continue;
    shared += 1;
    if (!sameBytes(glyph.bytes, other.bytes)) differing += 1;
  }
  return { shared, differing };
}

/** A configuration's sets, its map and each set's glyphs by character, read once. */
function readSets(c: Container): { map: CharacterMap; sets: FontSet[]; glyphs: Map<string, CharacterGlyph>[] } {
  const map = characterMap(c);
  if (map === undefined) throw new GlyphBorrowError('the configuration draws no text a character map reads');
  const sets = fontSets(c);
  if (sets === undefined || sets.length === 0) throw new GlyphBorrowError('base slot 7 holds no font set');
  return { map, sets, glyphs: sets.map((set) => glyphsByCharacter(c, map, set)) };
}

/** Refuses a container the borrow has not been measured on, and a donor that is not of the target's architecture. */
function checkArchitectures(target: Container, donors: readonly GlyphDonor[]): void {
  if (target.architecture === undefined || !GLYPH_BORROW_ARCHITECTURES.has(target.architecture)) {
    throw new GlyphBorrowError(`borrowing glyphs is measured on the Harmony 880 and 885 alone, not architecture ${target.architecture}`);
  }
  for (const donor of donors) {
    // The same architecture, compared between the two containers rather than against a number: a donor of another
    // architecture may store its glyphs another way, and its sets were never part of the measurement.
    if (donor.container.architecture !== target.architecture) {
      throw new GlyphBorrowError(`${donor.name} is architecture ${donor.container.architecture}, the target ${target.architecture}`);
    }
  }
}

/**
 * For every character wanted in every set, the target's code for it and every donor set that can supply its glyph
 * in the target set's face; a character the set already draws is left out, since there is nothing to borrow. Plans
 * a borrow without performing it, and is what a report of which donor holds which letter reads.
 */
export function glyphDonors(target: Container, donors: readonly GlyphDonor[], wants: readonly GlyphWant[]): GlyphSupply[] {
  checkArchitectures(target, donors);
  const own = readSets(target);
  const read = donors.map((donor) => ({ name: donor.name, ...readSets(donor.container) }));
  const codeOf = codesByCharacter(own.map);
  const out: GlyphSupply[] = [];
  for (const want of wants) {
    const set = own.sets[want.set];
    if (set === undefined) throw new GlyphBorrowError(`the target has no font set ${want.set}`);
    const mine = own.glyphs[want.set]!;
    // Every donor set of the target set's face, proved once per set rather than once per character.
    const faces: { donor: (typeof read)[number]; donorSet: number; proof: FaceProof }[] = [];
    for (const donor of read) {
      donor.sets.forEach((candidate, donorSet) => {
        if (candidate.height !== set.height) return;
        const proof = compare(mine, donor.glyphs[donorSet]!);
        if (provesOneFace(proof)) faces.push({ donor, donorSet, proof });
      });
    }
    for (const character of new Set(want.characters)) {
      if (mine.has(character)) continue;
      const code = codeOf.get(character);
      // A character whose code the target cannot settle is not borrowed into: the glyph would land on a code whose
      // character is a guess.
      if (code !== undefined && own.map.ambiguous.has(code)) {
        throw new GlyphBorrowError(`the target's code ${code} for '${character}' is ambiguous`);
      }
      const sources = faces
        .filter(({ donor, donorSet }) => donor.glyphs[donorSet]!.has(character))
        .map(({ donor, donorSet, proof }) => ({ donor: donor.name, donorSet, proof }));
      out.push({ set: want.set, character, code, sources });
    }
  }
  return out;
}

/**
 * The code each character the map settles stands for. One code per character is the generator's rule, section 112;
 * where a configuration breaks it, two blank codes of different widths on the Harmony One, the lowest is kept.
 */
function codesByCharacter(map: CharacterMap): Map<string, number> {
  const out = new Map<string, number>();
  for (const [code, character] of [...map.codes].sort((x, y) => x[0] - y[0])) {
    if (!out.has(character)) out.set(character, code);
  }
  return out;
}

/** Restate the trailer checksum over the finished bytes, after a write `relocate` did not make. */
function restamp(bytes: Uint8Array): void {
  bytes.set(new Writer(2).u16(trailerChecksum(bytes)).bytes, bytes.length - TRAILER_CHECKSUM_OFFSET);
}

/** Write a set's count, in the form its header was read in, `fontSetHeader`. */
function writeCount(bytes: Uint8Array, at: number, set: FontSet, count: number): void {
  if (count > 0xff) throw new GlyphBorrowError(`a set at 0x${set.address.toString(16)} would hold ${count} codes`);
  if (set.countAt === 2) bytes[at + 2] = count;
  else bytes[at + 1] = count;
}

/**
 * Borrow every wanted character into its set from the donors, per the header, and return the new container. Refuses
 * an architecture the borrow was not measured on, a donor of another architecture, a wanted character no donor holds
 * in the set's face (naming every one, so a caller sees the whole gap at once), donors whose matching glyphs
 * disagree, and a new code past seven bits.
 */
export function borrowGlyphs(target: Container, donors: readonly GlyphDonor[], wants: readonly GlyphWant[]): GlyphsBorrowed {
  const supplies = glyphDonors(target, donors, wants);
  const unsupplied = supplies.filter((one) => one.sources.length === 0);
  if (unsupplied.length > 0) {
    throw new GlyphBorrowError(`no donor holds ${unsupplied.map((one) => `'${one.character}' in set ${one.set}`).join(', ')} in that set's face`);
  }

  // The glyph bytes for each supply, the first source's, after checking every other source agrees with it.
  const byDonor = new Map(donors.map((donor) => [donor.name, readSets(donor.container)]));
  const glyphOf = (source: GlyphSource, character: string): Uint8Array => byDonor.get(source.donor)!.glyphs[source.donorSet]!.get(character)!.bytes;
  const chosen = supplies.map((supply) => {
    const first = supply.sources[0]!;
    const bytes = glyphOf(first, supply.character);
    for (const other of supply.sources.slice(1)) {
      if (!sameBytes(bytes, glyphOf(other, supply.character))) {
        throw new GlyphBorrowError(`${first.donor} set ${first.donorSet} and ${other.donor} set ${other.donorSet} prove one face and draw '${supply.character}' differently`);
      }
    }
    return { supply, source: first, bytes };
  });

  // New codes, after the highest any set covers or the map names, in the order the characters were first wanted.
  const own = readSets(target);
  // **A new code only where every code the target draws a glyph for is settled.** A code the map cannot name may
  // be the very character wanted, and giving that character a second code breaks the generator's rule of one code
  // per character, section 112: a text spelled with the new code would then find nothing in the sets that hold the
  // old one. Unit A's `J` was such a code, drawn in `Ja` and `Jaar` and named by no shape until its configuration
  // was added to the arch 8 alphabet's seeds, `bin/alphabets.ts`.
  if (chosen.some(({ supply }) => supply.code === undefined)) {
    const unsettled = new Set<number>();
    own.sets.forEach((set) => {
      for (const { index, glyph } of decodedSet(target, set)) {
        const code = set.first + index;
        if (glyph !== undefined && !isBlank(glyph) && (!own.map.codes.has(code) || own.map.ambiguous.has(code))) unsettled.add(code);
      }
    });
    if (unsettled.size > 0) {
      throw new GlyphBorrowError(`the target's codes ${[...unsettled].sort((x, y) => x - y).join(', ')} name no settled character, so no character can be given a new code`);
    }
  }
  const highest = Math.max(...own.sets.map((set) => set.first + set.count - 1), ...own.map.codes.keys());
  const added: [string, number][] = [];
  const newCode = new Map<string, number>();
  for (const { supply } of chosen) {
    if (supply.code !== undefined || newCode.has(supply.character)) continue;
    const code = highest + 1 + added.length;
    if (code >= FONT_CODE_CEILING) throw new GlyphBorrowError(`no seven bit code is left for '${supply.character}'`);
    newCode.set(supply.character, code);
    added.push([supply.character, code]);
  }
  const codeFor = (supply: GlyphSupply): number => supply.code ?? newCode.get(supply.character)!;

  let c = target;
  // First the pointer arrays, so every set reaches every code that will be written into it: each grown at its own
  // end by NULL entries and its count restated, one set at a time with the container read again in between, since
  // every insertion moves what is above it. Two reasons a set grows, and either suffices. A new code reaches every
  // set, so all sets keep one count as a generator's do. And an old code can lie past a set's own count, since a
  // count is per set and a configuration where one set stops short of another is readable, so the code written
  // into it decides, not only whether a code was added. A set that already reaches both keeps its array.
  const last = added.length > 0 ? added[added.length - 1]![1] : 0;
  for (let index = 0; index < own.sets.length; index += 1) {
    const set = fontSets(c)![index]!;
    const written = chosen.filter(({ supply }) => supply.set === index).map(({ supply }) => codeFor(supply));
    const reach = Math.max(last, ...written);
    const count = reach - set.first + 1;
    if (count > set.count) {
      const header = c.blobOffsetOf(set.address)!;
      const grown = relocate(c, header + IMAGE_SET_HEADER + 3 * set.count, 3 * (count - set.count)).bytes;
      writeCount(grown, header, set, count);
      restamp(grown);
      c = parse(grown);
    }
  }

  // Then the glyphs, set by set: inserted together at the set's header, so they sit just under it, and each code's
  // NULL pointer pointed at its copy.
  const borrowed: BorrowedGlyph[] = [];
  for (const index of [...new Set(chosen.map(({ supply }) => supply.set))]) {
    const mine = chosen.filter(({ supply }) => supply.set === index);
    const total = mine.reduce((sum, one) => sum + one.bytes.length, 0);
    const set = fontSets(c)![index]!;
    const at = c.blobOffsetOf(set.address)!;
    const bytes = relocate(c, at, total).bytes;
    const header = at + total;
    let next = at;
    for (const { supply, source, bytes: glyph } of mine) {
      const code = codeFor(supply);
      const pointer = header + IMAGE_SET_HEADER + 3 * (code - set.first);
      // Only a NULL entry is ever filled: a glyph the set already had is what the caller's text draws today.
      if (bytes[pointer] !== 0 || bytes[pointer + 1] !== 0 || bytes[pointer + 2] !== 0) {
        throw new GlyphBorrowError(`set ${index} already points code ${code} somewhere`);
      }
      bytes.set(glyph, next);
      bytes.set(new Writer(3).u24(c.flashBase + next).bytes, pointer);
      borrowed.push({ set: index, character: supply.character, code, donor: source.donor, donorSet: source.donorSet, length: glyph.length });
      next += glyph.length;
    }
    restamp(bytes);
    try {
      c = parse(bytes);
    } catch (error) {
      if (error instanceof GspmError) throw new GlyphBorrowError(`set ${index}'s borrowed glyphs left a container that does not parse: ${error.message}`);
      throw error;
    }
  }
  return { bytes: c.blob, borrowed, added };
}
