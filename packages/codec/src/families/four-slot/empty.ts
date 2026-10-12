/**
 * The Harmony 650 built from nothing: `todo-compile-650.md` 11.1.1, plan 008.
 *
 * Every other route to a configuration starts from a Logitech compile and overwrites parts of it. This one
 * starts from no file at all: it numbers every table entry itself, asks each generator for fresh pieces on
 * those numbers, and hands the pieces to the linker, `placePieces` and `layOutContainer`. Nothing it emits
 * is read off a compile; what it knows about the remote it knows from the generators' own descriptions,
 * whose facts were measured on Logitech's compiles and are stated in those modules.
 *
 * **Only our own look can be built this way**, our letters, and later the state colours and our pictures,
 * since Logitech's letters and designed backgrounds are their artwork and exist only in a compile.
 *
 * **The font table is described here rather than measured.** A donor's sets are lettered by measuring
 * which of Logitech's faces each one is, `withOxaniumFonts`; with no donor there is nothing to measure,
 * so the sets are stated: one per face and colouring a screen of ours draws in, in `EMPTY_FONT_SETS`'
 * order, and every printable ASCII character takes the code of its place in `LETTERING_CHARACTERS`
 * plus one, the same in every set. The order of the sets is the order the faces first appear in on
 * Logitech's two device compile, `harvest_650_two_devices`, which is what a reader that takes "the
 * first set of this height" has always been run against: the plain bold 14 before the shadowed one,
 * the regular 15 before the bold one. The regular 13, which only Help draws, is left out with Help.
 *
 * Arch 14 only, the Harmony 650. Read only towards hardware: the result is bytes in memory.
 */
import type { Container } from '../../gspm.ts';
import { CLOCK_FIELD_COUNT, clockRecordFields } from '../../gspm.ts';
import type { ContainerPiece, PieceRef } from '../../frame.ts';
import { layOutContainer } from '../../frame.ts';
import { placePieces } from '../../placer.ts';
import { encodeGlyph } from '../../font.ts';
import { CLOCK_STATE_MAXIMA } from '../../sections.ts';
import { buildStateTables, type StateTablesSpec } from '../../statetables.ts';
import { modeZeroKeyList } from '../../modezero.ts';
import { type SetFace, letterFaceOf } from '../../fonttable.ts';
import {
  LETTERING_CHARACTERS, OXANIUM_FACE_SPECS, defaultWeight, letterRows, type LetterInks, type Lettering,
  type OxaniumFaceName, type OxaniumWeight,
} from '../../lettering.ts';
import { HARMONY_650_SKINS } from '../../backgrounds.ts';

/** A refusal, named so a caller can tell a request this does not build from a bug. */
export class EmptyConfigurationError extends Error {}

/** The font sets an empty configuration of ours carries, in table order: a face and how it is lettered. */
export const EMPTY_FONT_SETS: readonly { face: OxaniumFaceName; lettering: Lettering }[] = [
  { face: 'R15', lettering: 'shadowed' },
  { face: 'F14', lettering: 'plain' },
  { face: 'R14', lettering: 'shadowed' },
  { face: 'F15', lettering: 'shadowed' },
  { face: 'F10', lettering: 'shadowed' },
  { face: 'F14W', lettering: 'shadowed' },
  { face: 'F13', lettering: 'shadowed' },
  { face: 'F11', lettering: 'shadowed' },
  { face: 'F14', lettering: 'shadowed' },
];

/** The code a character takes in a configuration of ours: its place among the printable characters, from 1. */
export function emptyCodeOf(ch: string): number {
  const k = LETTERING_CHARACTERS.indexOf(ch);
  if (k < 0) throw new EmptyConfigurationError(`'${ch}' is not a character our letters draw`);
  return k + 1;
}

/** A font set's header, `fontSetHeader`'s form with the first code at +1 and the count at +2. */
const FONT_SET_HEADER = 3;
/** Every table here names its entries in three byte addresses. */
const POINTER = 3;

/** Our font table, built from `EMPTY_FONT_SETS`: the table, the sets and the glyphs, each shared glyph once. */
export interface EmptyFontTable {
  table: ContainerPiece;
  sets: ContainerPiece[];
  glyphs: ContainerPiece[];
  /** Per set, in table order, the face it is lettered in, as `withOxaniumFonts` reports a donor's. */
  faces: SetFace[];
}

export function emptyFontTable(
  inks: LetterInks, weights: Readonly<Partial<Record<OxaniumFaceName, OxaniumWeight>>> = {},
): EmptyFontTable {
  const glyphPieces = new Map<string, ContainerPiece>();
  const faces = EMPTY_FONT_SETS.map(({ face, lettering }): SetFace => ({
    height: OXANIUM_FACE_SPECS[face].cell,
    shadow: lettering === 'shadowed' ? inks.shadow : undefined,
    ink: inks[lettering],
    // The two measurements `measureSet` tells Logitech's faces apart by, stated for ours: a label face's
    // stroke is two pixels and a regular face's one. Nothing reads a capital's top on a set we letter.
    stroke: face.startsWith('R') ? 1 : 2,
    capitalTop: undefined,
    face,
    lettering,
    inks,
    weight: weights[face] ?? defaultWeight(face),
  }));
  const count = LETTERING_CHARACTERS.length;
  const sets = faces.map((one): ContainerPiece => {
    const bytes = new Uint8Array(FONT_SET_HEADER + POINTER * count);
    bytes[0] = one.height;
    bytes[1] = 1;
    bytes[2] = count;
    const refs: PieceRef[] = LETTERING_CHARACTERS.map((ch, k) => {
      const key = `${one.face} ${one.weight} ${one.lettering} ${ch}`;
      let glyph = glyphPieces.get(key);
      if (glyph === undefined) {
        const rows = letterRows(letterFaceOf(one), ch, one.lettering, inks);
        glyph = { bytes: encodeGlyph(rows[0]!.length, rows), refs: [], owner: 'slot-7-glyph' };
        glyphPieces.set(key, glyph);
      }
      return { at: FONT_SET_HEADER + POINTER * k, to: glyph, offset: 0 };
    });
    return { bytes, refs, owner: 'slot-7-set' };
  });
  return { table: countedTable(2, sets, 'slot-7-table'), sets, glyphs: [...glyphPieces.values()], faces };
}

/**
 * A table of a count and three byte addresses, the shape of base slots 5, 7, 9, 10, 11, 12, 14 and 15,
 * whose count is one or two bytes, and of base slot 6, whose count is three. Each entry names its piece's
 * start, or `offsets[k]` bytes into it.
 */
export function countedTable(
  countWidth: number, targets: readonly ContainerPiece[], owner: string, offsets: readonly number[] = [],
): ContainerPiece {
  const bytes = new Uint8Array(countWidth + POINTER * targets.length);
  for (let k = 0; k < countWidth; k += 1) bytes[k] = (targets.length >> (8 * k)) & 0xff;
  if (targets.length >= 1 << (8 * countWidth)) throw new EmptyConfigurationError(`${targets.length} entries do not fit a ${countWidth} byte count`);
  return {
    bytes, owner,
    refs: targets.map((to, k): PieceRef => ({ at: countWidth + POINTER * k, to, offset: offsets[k] ?? 0 })),
  };
}

/** The seven clock records stamped from the moment of building: each field its `first`, the year's maximum one above it. */
export function clockSpec(builtAt: string): StateTablesSpec['clock'] {
  const fields = clockRecordFields(builtAt);
  if (fields === undefined) throw new EmptyConfigurationError(`${builtAt} is not a time base slot 3 can hold`);
  return Array.from({ length: CLOCK_FIELD_COUNT }, (_, k) => ({
    first: fields[k]!, max: CLOCK_STATE_MAXIMA[k] ?? fields[k]! + 1,
  }));
}

export interface EmptyOptions {
  skin: number;
  builtAt: string;
  inks: LetterInks;
  weights?: Readonly<Partial<Record<OxaniumFaceName, OxaniumWeight>>>;
}

export interface EmptyBuilt {
  bytes: Uint8Array;
  container: Container;
  faces: SetFace[];
}

/**
 * The skeleton, plan 008's first step: our font table, every section table, the clock and mode 0's key
 * list, laid out. It holds no screen yet, so nothing in it can be shown on a remote.
 */
export function buildEmptySkeleton(options: EmptyOptions): EmptyBuilt {
  if (!HARMONY_650_SKINS.has(options.skin)) throw new EmptyConfigurationError(`an empty configuration is built for the Harmony 650, not skin ${options.skin}`);
  const fonts = emptyFontTable(options.inks, options.weights);
  const states = buildStateTables({ clock: clockSpec(options.builtAt), hourList: 0, variables: [], valueMaps: [] });
  const empty = (owner: string, length: number): ContainerPiece => ({ bytes: new Uint8Array(length), refs: [], owner });
  const tables: (ContainerPiece | undefined)[] = new Array(20).fill(undefined);
  tables[0] = states.nameTree;
  tables[2] = empty('slot-2-log', 8);
  tables[4] = empty('slot-4-event', 1);
  tables[5] = countedTable(1, [], 'slot-5-table');
  tables[6] = countedTable(3, [], 'slot-6-table');
  tables[7] = fonts.table;
  tables[8] = empty('slot-8-list', 1);
  tables[9] = countedTable(1, [], 'slot-9-table');
  tables[10] = countedTable(2, [], 'slot-10-table');
  tables[11] = countedTable(2, [], 'slot-11-table');
  tables[12] = countedTable(1, [], 'slot-12-table');
  tables[13] = states.stateTable;
  tables[14] = states.valueMapTable;
  tables[15] = countedTable(1, [], 'slot-15-table');
  tables[16] = empty('slot-16-table', 1);
  tables[17] = empty('slot-17-table', 2);
  const keyTable: ContainerPiece = { bytes: modeZeroKeyList('harmony-650'), refs: [], owner: 'key-table' };
  const placed = placePieces({
    architecture: 14, skin: options.skin, builtAt: options.builtAt, keyTable,
    body: [...states.records, ...states.valueMaps],
    tables,
    loose: [...fonts.glyphs, ...fonts.sets],
  });
  const laid = layOutContainer(placed.layout);
  return { bytes: laid.bytes, container: laid.container, faces: fonts.faces };
}
