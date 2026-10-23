/**
 * The Harmony One's font table stated rather than read off a donor: `todo-compile-one.md` 7.1.1, findings
 * section 427, the touch family's half of what `four-slot/empty.ts`' `EMPTY_FONT_SETS` does for the Harmony 650.
 *
 * Until now the touch family only re-lettered a Logitech compile's sets, `letterTouchDonor`: which sets exist, in
 * what order, at what height and in what colours was read off Logitech's file. A configuration built from nothing
 * has no file to read, so this module states the table and builds base slot 7 from that statement alone.
 *
 * **What the statement is, measured on the sixteen English compiles of skin 54**:
 *
 * * **Sixteen sets every compile holds**, `TOUCH_FONT_SETS`, each a face of ours (section 396) and one of the
 *   pairs of an ink and a shadow Logitech draws it in, with what draws it. They are the same sixteen on all
 *   sixteen compiles; only their order moves, eight orders relative to each other, and the order here is the one Logitech's compile of two devices,
 *   `harvest_one_two_devices`, holds them in, as the Harmony 650's empty table takes the order of that model's
 *   two device compile. Two of them are the same face in the same colours, the "OK" of the fixed screens and
 *   the rows' set, and stay two since screens select them apart.
 * * **Two sets a compile holds only for some setups**, `TOUCH_CONTENT_FONT_SETS`: the start up screens' title,
 *   on a compile with an activity, and the page counts of the activity menu and the working screens, on a
 *   compile where one of those has more than one page. A table of ours holds neither. It holds the two copies
 *   `letterTouchDonor` adds in their place, `TOUCH_ADDED_SETS`: the title's face in `startTitleWeight` and the
 *   fixed screens' count face in the activity title's colours, each smoothed against black, the colour our
 *   screens draw under both, `todo-compile-one.md` 5.3.3.
 * * **The code order**, `TOUCH_GLYPH_ORDER`: every compile hands out its first 60 codes in one order, the same
 *   on all sixteen, and the 61st follows the setup's names. Ours keeps those 60 where Logitech puts them and
 *   gives the other 35 printable characters the codes after them in ASCII order, so every set spells all 95.
 *   A text of a fixed screen whose characters are all among the 60 is then spelled in Logitech's codes.
 * * **No start up title joiner.** Logitech joins "Starting" and an activity's name with a blank only the title's
 *   set holds, section 406; in our letters the two blanks draw alike, and our start up titles are spelled with
 *   the space, section 423, so no code stands for a second blank.
 * * **The header's form**: the count at +1 and a zero at +2, which reads as a first code of 1, on every set of
 *   the sixteen compiles.
 *
 * **What is not stated here is the blending.** The copies smoothed against a background, the labels on our
 * box colours and the letters on black, are added after the screens are drawn, `withBlendedLetters` in the
 * family's look, which reads them off the rendering; on the composed test setup 15 copies, 33 sets in all.
 *
 * Measured on the Harmony One, skin 54, alone: the four slot family states its own table in
 * `four-slot/empty.ts`. Read only towards hardware: the result is pieces.
 */
import type { ContainerPiece, PieceRef } from '../../frame.ts';
import { FONT_TABLE_COUNT_WIDTH, encodeGlyph } from '../../font.ts';
import { Writer } from '../../emit.ts';
import { type CharacterMap } from '../../text.ts';
import { type SetFace, FontTableError, letterFaceOf, letteredCodes } from '../../fonttable.ts';
import {
  LETTERING_CHARACTERS, OXANIUM_FACE_SPECS, defaultWeight, letterRows, type LetterInks, type OxaniumFaceName,
  type OxaniumWeight,
} from '../../lettering.ts';
import type { TouchChoices } from './choices.ts';
import { TOUCH_FONTS } from './fonts.ts';

/** The inks and shadows Logitech's Harmony One sets are drawn in, RGB565: ten pairs of them, section 396. */
const WHITE = 0xffff;
const BLACK = 0x0000;
/** The dark grey most of the sets' shadows are. */
const GREY = 0x31a6;
const GREEN = 0x9663;
const DARK_GREEN = 0x0060;
const BLUE = 0x973e;
const DARK_BLUE = 0x10e4;
const ORANGE = 0xdbc3;
const DARK_ORANGE = 0x0820;
const CLOCK_INK = 0xce79;
const CLOCK_SHADOW = 0x0020;

/** One set of a stated table: its face, its ink and shadow, and what Logitech's compiles draw in it. */
export interface TouchFontSet {
  /** What Logitech's compiles of skin 54 draw in it, by the role names the touch family's builders describe. */
  readonly drawnBy: string;
  readonly face: OxaniumFaceName;
  /** RGB565. */
  readonly ink: number;
  /** RGB565; absent for the one set drawn without a shadow. */
  readonly shadow?: number;
}

/**
 * The sixteen sets every English Harmony One compile of skin 54 holds, in the order Logitech's compile of two
 * devices holds them. Section 427 has the census; the roles are those the builders' descriptions read on it.
 */
export const TOUCH_FONT_SETS: readonly TouchFontSet[] = [
  { face: 'OneR15', ink: WHITE, shadow: BLACK, drawnBy: 'the body of the firmware, fixed, status, help and tour screens, and a start up screen\'s lines' },
  { face: 'One14', ink: WHITE, shadow: GREY, drawnBy: 'the OK of the firmware, fixed, help and tour screens' },
  { face: 'One14', ink: GREEN, shadow: DARK_GREEN, drawnBy: 'the titles of the fixed, status, help and tour screens' },
  { face: 'One14', ink: BLUE, shadow: DARK_BLUE, drawnBy: 'the activity menu\'s title and an activity\'s title' },
  { face: 'One14', ink: GREEN, shadow: GREY, drawnBy: 'the activity menu\'s left key' },
  { face: 'One14', ink: ORANGE, shadow: GREY, drawnBy: 'the right key of the activity menu and the device pages, and "Devices" on a working screen' },
  { face: 'One11', ink: GREEN, shadow: DARK_GREEN, drawnBy: 'the fixed screens\' page count' },
  { face: 'One14', ink: WHITE, shadow: GREY, drawnBy: 'the fixed screens\' items, the tour\'s labels, and the rows of the device pages and the working screens' },
  { face: 'One14', ink: BLUE, shadow: GREY, drawnBy: 'the fixed screens\' keys, the device pages\' left key, the device list\'s headings and a working screen\'s favourites' },
  { face: 'One14', ink: WHITE, shadow: BLACK, drawnBy: 'the tour\'s text' },
  { face: 'One14', ink: WHITE, drawnBy: 'the tour\'s exit' },
  { face: 'One15', ink: WHITE, shadow: GREY, drawnBy: 'the fixed screens\' wide buttons, the tour\'s buttons and the rows of the activity menu and the device list' },
  { face: 'One16', ink: WHITE, shadow: BLACK, drawnBy: 'the tour\'s title' },
  { face: 'One14', ink: ORANGE, shadow: DARK_ORANGE, drawnBy: 'a device page\'s title and the device list\'s' },
  { face: 'One11', ink: ORANGE, shadow: DARK_ORANGE, drawnBy: 'the page count of a device page and of the device list' },
  { face: 'One11', ink: CLOCK_INK, shadow: CLOCK_SHADOW, drawnBy: 'the clock, in the programs the header queues' },
];

/**
 * The two sets Logitech's compiles hold only for some setups, which a table of ours replaces by the copies in
 * `TOUCH_ADDED_SETS`: the start up title's, held on the twelve compiles with an activity and on none of the four
 * without, and the activity page count's, held on the eleven where the activity menu or a working screen has
 * more than one page and on none of the five where neither has.
 */
export const TOUCH_CONTENT_FONT_SETS: { readonly startTitle: TouchFontSet; readonly pageCount: TouchFontSet } = {
  startTitle: { face: 'One15', ink: WHITE, shadow: BLACK, drawnBy: 'a start up screen\'s title, "Starting" and the activity\'s name' },
  pageCount: { face: 'One11', ink: BLUE, shadow: DARK_BLUE, drawnBy: 'the page count of the activity menu and the working screens' },
};

/**
 * A set of ours added after the stated ones, as `ExtraFontSet` states one for a donor: a copy of set `like`,
 * smoothed against `background`, in the weight the choice names or `like`'s own, and in `like`'s colours or,
 * where `inksOf` is given, in that set's.
 */
export interface TouchAddedSet {
  readonly drawnBy: string;
  readonly like: number;
  readonly weight?: 'startTitleWeight';
  readonly inksOf?: number;
  /** RGB565. */
  readonly background: number;
}

/**
 * The two sets ours carry in place of `TOUCH_CONTENT_FONT_SETS`, those `touchActivityFonts` adds to a donor: the
 * start up title in the bold 15 of the wide buttons, the only bold 15 every compile holds, lighter, and the
 * page count in the bold 11 of the fixed screens' count, in the activity title's colours. Both on black.
 */
export const TOUCH_ADDED_SETS: readonly TouchAddedSet[] = [
  { like: 11, weight: 'startTitleWeight', background: BLACK, drawnBy: 'a start up screen\'s title' },
  { like: 6, inksOf: 3, background: BLACK, drawnBy: 'the page count of the activity menu, the working screens and the device pages' },
];

/** The codes every English compile of skin 54 hands out first, in its order: the space is the 30th. */
const LOGITECH_FIRST_CODES = 'HySunMoTeWdhFriat12:34567890/ blvsw!OKUBCcpfgL.mGIzkREDPAq\\N';

/** How many codes every compile hands out in one order before the setup's names decide the next. */
export const TOUCH_FIXED_CODES = LOGITECH_FIRST_CODES.length;

/**
 * The character each code stands for in a table of ours, code k + 1 for entry k: Logitech's first 60, then the
 * other printable characters in ASCII order, 95 in all.
 */
export const TOUCH_GLYPH_ORDER: readonly string[] = [
  ...LOGITECH_FIRST_CODES, ...LETTERING_CHARACTERS.filter((ch) => !LOGITECH_FIRST_CODES.includes(ch)),
];

/**
 * What `measureSet` reads off Logitech's sets of each face, section 396's table: the stroke, one pixel for a
 * regular face and the bold 11 and two for the rest, and the row a capital starts on. A stated set has no
 * glyphs of Logitech's to measure, so it states what a donor's set of the face measures, and the faces of a
 * stated table equal a lettered donor's.
 */
const FACE_MEASURES: Readonly<Record<string, { stroke: number; capitalTop: number }>> = {
  One16: { stroke: 2, capitalTop: 3 },
  One15: { stroke: 2, capitalTop: 3 },
  OneR15: { stroke: 1, capitalTop: 3 },
  One14: { stroke: 2, capitalTop: 3 },
  One11: { stroke: 1, capitalTop: 2 },
};

/** The header of a set: its height, the count at +1 and a zero at +2, the form every Harmony One set is in. */
const SET_HEADER = 3;
const POINTER = 3;

export interface TouchFontTableOptions {
  /** The character each code stands for, code k + 1 for entry k; every printable character once. */
  readonly characters?: readonly string[];
  /** The sets, in table order; `TOUCH_FONT_SETS` unless a test states another. */
  readonly sets?: readonly TouchFontSet[];
  readonly added?: readonly TouchAddedSet[];
  /** A face's weight where it is not its default. */
  readonly weights?: Readonly<Partial<Record<OxaniumFaceName, OxaniumWeight>>>;
}

/** The font table built from a statement: the table, the sets and the glyphs, and each set's face. */
export interface TouchFontTable {
  table: ContainerPiece;
  sets: ContainerPiece[];
  glyphs: ContainerPiece[];
  /** Per set, in table order, as `withOxaniumFonts` reports a lettered donor's. */
  faces: SetFace[];
}

/** A set's face as a stated table gives it: always lettered, so its inks and weight are there. */
type StatedFace = SetFace & { inks: LetterInks; weight: OxaniumWeight };

/** The face of a stated set, as a donor's set of that face and colours is measured and lettered. */
function stated(set: TouchFontSet, weights: TouchFontTableOptions['weights'] = {}): StatedFace {
  const measures = FACE_MEASURES[set.face];
  if (measures === undefined) throw new FontTableError(`${set.face} is not one of the Harmony One's faces`);
  return {
    height: OXANIUM_FACE_SPECS[set.face].cell, shadow: set.shadow, ink: set.ink,
    stroke: measures.stroke, capitalTop: measures.capitalTop, face: set.face,
    lettering: set.shadow === undefined ? 'plain' : 'shadowed',
    inks: { shadowed: set.ink, plain: set.ink, shadow: set.shadow ?? set.ink },
    weight: weights[set.face] ?? defaultWeight(set.face),
  };
}

/**
 * Base slot 7 from the statement: every set holds a glyph for every code, our letter in its face and colours,
 * and no glyph is shared between sets, since the touch family's text routine is unread, `TOUCH_FONTS`. The
 * pieces come out in the order `withOxaniumFonts` leaves a lettered donor's in, every glyph set by set, then the
 * sets, so a stated table that equals a donor's lays out to the same bytes. Refuses a code order that is not
 * every printable character once, and an added set that copies a set the table does not hold.
 */
export function buildTouchFontTable(choices: TouchChoices, options: TouchFontTableOptions = {}): TouchFontTable {
  const characters = options.characters ?? TOUCH_GLYPH_ORDER;
  if (characters.length !== LETTERING_CHARACTERS.length || new Set(characters).size !== characters.length
      || characters.some((ch) => !LETTERING_CHARACTERS.includes(ch))) {
    throw new FontTableError('a stated table gives every printable character one code, and this order does not');
  }
  const own = (options.sets ?? TOUCH_FONT_SETS).map((set) => stated(set, options.weights));
  const added = (options.added ?? TOUCH_ADDED_SETS).map((one): StatedFace => {
    const like = own[one.like];
    if (like === undefined) throw new FontTableError(`an added set copies set ${one.like}, which the table does not hold`);
    const inks: LetterInks | undefined = one.inksOf === undefined ? undefined : own[one.inksOf]?.inks;
    if (one.inksOf !== undefined && inks === undefined) throw new FontTableError(`an added set takes the colours of set ${one.inksOf}, which the table does not hold`);
    return {
      ...like, weight: one.weight === undefined ? like.weight : choices[one.weight], background: one.background,
      ...(inks === undefined ? {} : { inks }),
    };
  });
  const faces = [...own, ...added];

  const glyphs: ContainerPiece[] = [];
  const shared = new Map<string, ContainerPiece>();
  const sets = faces.map((face, index): ContainerPiece => {
    const bytes = new Uint8Array(SET_HEADER + POINTER * characters.length);
    bytes[0] = face.height;
    bytes[1] = characters.length;
    const refs: PieceRef[] = characters.map((ch, k) => {
      const { inks } = face;
      const key = `${TOUCH_FONTS.sharesGlyphs ? '' : `${index} `}${face.face} ${face.weight} ${face.lettering} `
        + `${inks.shadowed} ${inks.plain} ${inks.shadow} ${ch} on ${face.background}`;
      let glyph = shared.get(key);
      if (glyph === undefined) {
        const rows = letterRows(letterFaceOf(face), ch, face.lettering, inks, face.background);
        glyph = { bytes: encodeGlyph(rows[0]!.length, rows), refs: [], owner: 'slot-7-glyph' };
        shared.set(key, glyph);
        glyphs.push(glyph);
      }
      return { at: SET_HEADER + POINTER * k, to: glyph, offset: 0 };
    });
    return { bytes, refs, owner: 'slot-7-set' };
  });
  const table = new Uint8Array(FONT_TABLE_COUNT_WIDTH + POINTER * sets.length);
  table.set(new Writer(FONT_TABLE_COUNT_WIDTH).u16(sets.length).bytes);
  return {
    table: {
      bytes: table, owner: 'slot-7-table',
      refs: sets.map((to, k): PieceRef => ({ at: FONT_TABLE_COUNT_WIDTH + POINTER * k, to, offset: 0 })),
    },
    sets, glyphs, faces,
  };
}

/**
 * The code order a donor lettered in ours has, `withOxaniumFonts`' numbering read through `letteredCodes`: what a
 * stated table takes to equal that donor's, since the codes past the first 60 follow the donor's names.
 */
export function donorGlyphOrder(map: CharacterMap, highestSet: number): string[] {
  const { characters, last } = letteredCodes(map, highestSet);
  return Array.from({ length: last }, (_, k) => {
    const ch = characters.get(k + 1);
    if (ch === undefined) throw new FontTableError(`code ${k + 1} of the donor stands for no character`);
    return ch;
  });
}
