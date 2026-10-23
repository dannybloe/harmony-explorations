/**
 * The Harmony One's skeleton, laid out from nothing: `todo-compile-one.md` 7.1.3, the touch family's half of
 * what `families/four-slot/empty.ts`' `buildEmptySkeleton` is for the Harmony 650, plan 008 step 1.
 *
 * Every other Harmony One configuration this codec writes starts from one of Logitech's compiles and replaces
 * parts of it. The empty One, 7.1, starts from no file, and this module is its frame: every table the
 * container states, in the empty form an empty One holds or in the form a caller hands it, our font table,
 * the state tables with the clock stamped, the key table and the Harmony One's own raw slot 18, handed to
 * the placer, `placePieces` (section 426, the rule of section 328 unchanged on the One), and laid out by
 * `layOutContainer`. Nothing in it is read off a compile.
 *
 * **What the skeleton builds itself**, since nothing it holds depends on how anything is numbered:
 *
 * * **base slot 7, our font table**, `buildTouchFontTable`, section 427: the sixteen sets every English
 *   compile of skin 54 holds, in `harvest_one_two_devices`' order, then the two copies a table of ours carries
 *   in place of the two the setup brings, 18 sets of the 95 printable characters in `TOUCH_GLYPH_ORDER`;
 * * **base slots 0, 13 and 14**, `buildStateTables` with the family's facts, `TOUCH_STATE_TABLES`: the
 *   firmware's eighteen variables, the first seven of them the clock stamped from the moment of building,
 *   `clockSpec`, then the compiler's two byte variable, and the name tree;
 * * **raw slot 18**, the section the Harmony One inserts after raw slot 17, which is two zero bytes with
 *   nothing parked in front on all nineteen of Logitech's One compiles, sections 426 and 431;
 * * **the empty form of every other table**: a count of nothing for the tables of a count and three byte
 *   addresses, base slots 5, 6, 9, 10, 11, 12, 15 and 17 (the touch hit map, a one byte count on the One),
 *   with the count widths all nineteen One compiles have, `TOUCH_COUNT_WIDTHS`; base slot 16 with no favourite
 *   channel, `numberSenderTable`; an action list of nothing for base slot 8; an event map with no status code
 *   for base slot 4; and for base slot 2 nine zero bytes, the log area's length on the One and a placeholder:
 *   every compile states its region, `buildLogArea`, and the wiring's log area replaces it. Base slots 2, 4, 8,
 *   12 and 15 are the wiring's, `buildTouchWiring` through `emptyTouchWiring`, so the skeleton holds none of it.
 *
 * **The seam with the numbering**, `todo-compile-one.md` 7.1.4, and the assembly, 7.1.7. The skeleton numbers
 * nothing. Everything that names a mode, a list, a variable, a value map, an entry, a program or a hit page by
 * its index comes in as `TouchSkeletonParts`: a table for any base slot but the four the skeleton builds, the
 * key table, the configuration's own variables and value maps with the clock's two lists, the body and the
 * loose pieces. So the skeleton with no parts is the empty frame this item asks for, the probe below is the
 * skeleton with one part, and the assembly hands it the rest through the same call; the tables, the state
 * tables, the font table and the placement are then laid out by one route, which is the point of a seam.
 *
 * **The key table is a part, and empty in the skeleton.** On the Harmony 650 the key table is mode 0's own list,
 * whose entries run nothing a configuration numbers, so its skeleton carries it. On the Harmony One mode 0 is Low
 * Battery, the first of the ten firmware screens, and the key table is its own key map: the same 55 entries on all
 * nineteen compiles, each calling the list its position numbers, section 431, lists 0 to 54, which are the firmware
 * screens' own lists. So it comes with the firmware screens, whose builder makes it, `families/touch/
 * firmwarescreens.ts`, and a skeleton with no list would name 55 that do not exist. Until then the key table is the
 * empty tagged list, `00 00`, the form every empty list in the corpus takes.
 *
 * **The probe, `touchSpellingContainer`.** The screen builders spell a word in a configuration's own codes through
 * the character map, `characterMap`, which names every glyph of every set by the alphabet that explains the most
 * codes the configuration's programs draw; a configuration that draws nothing, as the skeleton does, has no map and
 * spells nothing. The Harmony 650's empty build solved it with a container it spells from and never emits: the
 * skeleton with one base slot 11 program that draws every code once. This is that probe for the One. Drawing every
 * code is what makes our letters the alphabet chosen: a probe drawing the space alone, which every alphabet reads as
 * a blank, gets one seeded from Logitech's letters, naming 10 codes. Every touch builder takes the container it
 * spells from as an argument, `speller(c)`, `touchCharacterMap(c)` and the font table's sets and widths read off it,
 * so a builder given the probe spells in our codes and measures in our widths, and the probe itself is in no result.
 *
 * **All 18 sets stay, which 7.1.1 left to this item.** Nine of them are selected by no reachable program on the
 * composed setup. Five, sets 1, 4, 5, 6 and 8, because every select of them names a copy blended against a
 * background: the copy is made from the set when blending runs, after the screens are drawn, and the set stays
 * as the fallback a select keeps where its texts sit on more than one colour, `blending.ts`; leaving it out
 * would leave a builder nothing to select before blending. Three, sets 9, 10 and 12, because only the welcome
 * tour draws them and the tour is left out by default, `TouchChoices.welcomeTour`: they keep that choice open on
 * an empty One. One, set 14, because the composed device pages count in an added copy; it is the set Logitech's
 * compiles count a device page and a device list of several pages in, section 427, so it stays for a builder
 * that keeps that choice. Leaving any set out renumbers every later one, and what it saves is bytes only: the
 * nine are 90238 of the table's 183518 bytes, measured in section 431, on a region the Harmony One's writes
 * allow up to 0x390000 bytes of.
 *
 * The Harmony One, skin 54, the spare's, decision 23, and the touch family alone: the Harmony 600, 650 and 700's
 * skeleton is `families/four-slot/empty.ts`. Read only towards hardware: the result is bytes in memory.
 */
import type { Container } from '../../gspm.ts';
import { BASE_SLOT_COUNT, actionListBytes } from '../../gspm.ts';
import type { ContainerLayout, ContainerPiece } from '../../frame.ts';
import { FRAME_ARCHITECTURES, countedTable, layOutContainer } from '../../frame.ts';
import { placePieces } from '../../placer.ts';
import { type BuiltStateTables, type StateTablesSpec, buildStateTables, clockSpec } from '../../statetables.ts';
import { numberSenderTable } from '../../tables.ts';
import { taggedListBytes } from '../../sections.ts';
import { buildEventMap } from '../../wiringparts.ts';
import { buildLogArea } from '../../firmwaresections.ts';
import { SCREEN_END, SCREEN_SELECT_FONT, SCREEN_TEXT_INLINE } from '../../screen.ts';
import type { SetFace } from '../../fonttable.ts';
import type { TouchChoices } from './choices.ts';
import { TOUCH_GLYPH_ORDER, type TouchFontTable, type TouchFontTableOptions, buildTouchFontTable } from './fontsets.ts';
import { TOUCH_STATE_TABLES } from './statetables.ts';

/** A refusal, named so a caller can tell a request the skeleton does not lay out from a bug. */
export class TouchSkeletonError extends Error {}

/** The family's remote, which the frame's and the log area's per architecture data are keyed by. */
const ARCHITECTURE = 12;

/**
 * The skins a Harmony One of ours is laid out for: 54, the Harmony One the spare reports, decision 23. Skin 59, the
 * European One, numbers its first 60 codes otherwise, section 427, so the stated font table is skin 54's alone.
 */
export const TOUCH_SKELETON_SKINS: ReadonlySet<number> = new Set([54]);

/** The base slots whose table the skeleton builds itself, which a part may not replace: the name tree, the font table and the state tables. */
const OWN_SLOTS: ReadonlySet<number> = new Set([0, 7, 13, 14]);

/** The base slots no table sits at: 1 and 3, which the frame generates, and 18 and 19, which are NULL on every architecture. */
const NO_TABLE: ReadonlySet<number> = new Set([1, 3, 18, 19]);

/**
 * The tables of a count and three byte addresses, by base slot, and the width of the count: the same on all
 * nineteen of Logitech's Harmony One compiles, section 431, base slot 16's the favourite channels' one byte,
 * `numberSenderTable`, and base slot 17's the touch hit map's.
 */
export const TOUCH_COUNT_WIDTHS: Readonly<Record<number, number>> = { 5: 1, 6: 3, 9: 1, 10: 2, 11: 2, 12: 1, 15: 1, 16: 1, 17: 1 };

/** A piece of `length` zero bytes and no address. */
const zeros = (owner: string, length: number): ContainerPiece => ({ bytes: new Uint8Array(length), refs: [], owner });

/**
 * The empty form of every table the skeleton does not build, by base slot. Each is built afresh, since a piece is
 * placed by identity and two layouts must not share one.
 */
function emptyTables(): (ContainerPiece | undefined)[] {
  const tables: (ContainerPiece | undefined)[] = new Array(BASE_SLOT_COUNT).fill(undefined);
  // The log area, the wiring's: the One's length, a three byte capacity and the region's two ends, every field
  // zero, since the region is the wiring's to state, `buildLogArea`.
  tables[2] = zeros('slot-2-log', buildLogArea(ARCHITECTURE).bytes.length);
  // The event map, the wiring's: a fallback mode and a count of no status code.
  tables[4] = { bytes: buildEventMap(0, 0, false), refs: [], owner: 'slot-4-event' };
  tables[8] = { bytes: actionListBytes([]), refs: [], owner: 'slot-8-list' };
  for (const [slot, width] of Object.entries(TOUCH_COUNT_WIDTHS)) tables[Number(slot)] = countedTable(width, [], `slot-${slot}-table`);
  // Base slot 16 has an encoder of its own, the same shape, so the empty form is its.
  tables[16] = numberSenderTable([]);
  return tables;
}

export interface TouchSkeletonOptions {
  /** The model the configuration states, `TOUCH_SKELETON_SKINS`. */
  skin: number;
  /** When it is built, `YYYY-MM-DDTHH:MM:SS`, which the clock records are stamped from. */
  builtAt: string;
  /** The family's choices; the font table takes the start up title's weight from them. */
  choices: TouchChoices;
  /** A statement of the font table other than section 427's, where a test states one. */
  fonts?: TouchFontTableOptions;
}

/**
 * What fills the skeleton: everything that is numbered, the numbering's (7.1.4) and the builders' (7.1.7). Each
 * is empty where it is not given.
 */
export interface TouchSkeletonParts {
  /** Mode 0's own key map, Low Battery's on the One; the empty tagged list where none is given. */
  keyTable?: ContainerPiece;
  /** A table for a base slot in place of its empty form: any slot but 0, 7, 13 and 14, which the skeleton builds, and 1, 3, 18 and 19, which hold none. */
  tables?: Readonly<Partial<Record<number, ContainerPiece>>>;
  /**
   * The configuration's own variables and value maps and the clock's two lists, which `buildStateTables` builds
   * base slots 0, 13 and 14 from with the stamped clock. None where it is not given, and then both of the clock's
   * transitions name list 0, which the skeleton does not hold.
   */
  states?: Omit<StateTablesSpec, 'clock'>;
  /** The body in the caller's order; the state records and the value maps follow it. */
  body?: readonly ContainerPiece[];
  /** What the placer places beside the font table's glyphs and sets: lists, page lists, parameter groups, pictures. */
  loose?: readonly ContainerPiece[];
}

export interface TouchSkeleton {
  bytes: Uint8Array;
  container: Container;
  /** The layout as placed, before it is laid out: what a later step, the letters' blending, takes. */
  layout: ContainerLayout;
  /** Per set, in table order, the face it is lettered in, which blending and its check take. */
  faces: SetFace[];
  fonts: TouchFontTable;
  states: BuiltStateTables;
}

/** The skeleton with nothing in it: every table empty but the font table, the state tables and raw slot 18. */
export function buildTouchSkeleton(options: TouchSkeletonOptions): TouchSkeleton {
  return layOutTouchSkeleton(options, {});
}

/**
 * The skeleton with `parts` in it, placed and laid out: the one route by which an empty One's tables, state
 * tables, font table and key table reach the frame. Refuses a skin the skeleton is not laid out for, a part for
 * a base slot the skeleton builds or no table sits at, and anything the state tables, the placer or the frame
 * refuse.
 */
export function layOutTouchSkeleton(options: TouchSkeletonOptions, parts: TouchSkeletonParts): TouchSkeleton {
  if (!TOUCH_SKELETON_SKINS.has(options.skin)) {
    throw new TouchSkeletonError(`a Harmony One of ours is laid out for skin ${[...TOUCH_SKELETON_SKINS].join(', ')}, not skin ${options.skin}`);
  }
  const fonts = buildTouchFontTable(options.choices, options.fonts);
  const states = buildStateTables({
    clock: clockSpec(options.builtAt),
    ...(parts.states ?? { hourList: 0, minuteList: 0, variables: [], valueMaps: [] }),
  }, TOUCH_STATE_TABLES);

  const tables = emptyTables();
  for (const [key, piece] of Object.entries(parts.tables ?? {})) {
    const slot = Number(key);
    if (OWN_SLOTS.has(slot)) throw new TouchSkeletonError(`base slot ${slot}'s table is the skeleton's own and is not taken as a part`);
    if (NO_TABLE.has(slot) || !(slot >= 0 && slot < BASE_SLOT_COUNT)) throw new TouchSkeletonError(`no table sits at base slot ${slot}`);
    tables[slot] = piece;
  }
  tables[0] = states.nameTree;
  tables[7] = fonts.table;
  tables[13] = states.stateTable;
  tables[14] = states.valueMapTable;

  // The Harmony One's own sections, by raw slot, each its two zero bytes, section 426: raw slot 18 alone, which
  // is the frame's data, `FRAME_ARCHITECTURES`.
  const inserted = Object.fromEntries(FRAME_ARCHITECTURES[ARCHITECTURE]!.insertedSections
    .map((raw) => [raw, zeros(`raw-${raw}-table`, 2)]));
  const placed = placePieces({
    architecture: ARCHITECTURE, skin: options.skin, builtAt: options.builtAt,
    keyTable: parts.keyTable ?? { bytes: taggedListBytes([]), refs: [], owner: 'key-table' },
    body: [...(parts.body ?? []), ...states.records, ...states.valueMaps],
    tables, inserted,
    loose: [...fonts.glyphs, ...fonts.sets, ...(parts.loose ?? [])],
  });
  const laid = layOutContainer(placed.layout);
  return { bytes: laid.bytes, container: laid.container, layout: placed.layout, faces: fonts.faces, fonts, states };
}

/**
 * The probe's one program: select set 0 and draw every code of the table once, inline at the top left, in code
 * order. Set 0 is enough, since every set holds every code, section 427, and the character map names a code by its
 * glyphs in every set that holds it, `characterMap`; what the drawn codes decide is which alphabet names them, and
 * with all 95 drawn ours explains every one.
 */
export function touchProbeProgram(characters: readonly string[] = TOUCH_GLYPH_ORDER): ContainerPiece {
  const codes = characters.map((_, k) => k + 1);
  return {
    bytes: Uint8Array.from([SCREEN_SELECT_FONT, 0, SCREEN_TEXT_INLINE, 0, 0, ...codes, 0, SCREEN_END]),
    refs: [], owner: 'slot-11-program',
  };
}

/**
 * The container a screen builder spells through while an empty One has no screen of its own: the skeleton with
 * the probe as base slot 11's one program. Every touch builder that writes a word takes the container it spells
 * from, so given this one it writes our codes, `TOUCH_GLYPH_ORDER`, and measures in our letters' widths. The
 * probe is the spelling's and no result's: what a builder writes names no piece of it.
 */
export function touchSpellingContainer(options: TouchSkeletonOptions): Container {
  const probe = touchProbeProgram(options.fonts?.characters);
  return layOutTouchSkeleton(options, { tables: { 11: countedTable(TOUCH_COUNT_WIDTHS[11]!, [probe], 'slot-11-table') }, body: [probe] }).container;
}
