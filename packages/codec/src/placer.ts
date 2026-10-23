/**
 * Where everything outside the body goes, decided from the pieces: `todo-compile-650.md` 10.5 for the
 * Harmony 600, 650 and 700, and `todo-compile-one.md` 6.2 for the Harmony One.
 *
 * `frame.ts` lays a container out once it is told where every piece goes. Of its four regions, the
 * key table and the body are given by whoever composed the content, and the tables are given by the
 * section they belong to; what it took as Logitech left it was **what sits in front of a table and
 * the order of the picture bank**, about half to two thirds of a Harmony 600, 650 or 700 configuration by bytes, 48 to 69 percent
 * on the thirteen compiles.
 * This module decides those from the content, with no offset of Logitech's as input: the caller hands
 * over the parked pieces and the pictures as a bag, in any order, and gets a `ContainerLayout` back.
 *
 * **One placer for both screen families, and nothing in it is either family's**, `docs/findings.md`
 * section 426: every rule below was measured on the thirteen arch 14 (Harmony 600, 650 and 700)
 * compiles of section 312, section 328, and again on the nineteen distinct arch 12 (Harmony One)
 * compiles of section 395, twenty fixtures, where every rule holds as it does on arch 14 and no rule
 * needed a second answer. What the Harmony One's container has and arch 14's does not, its own raw
 * slot 18, is the frame's data, `FRAME_ARCHITECTURES`: the placer carries its table through and parks
 * nothing in front of it, which is what all 36 distinct One containers in the lab do. So there is no
 * `Family` member here; a family whose compiles park differently would need one, and none measured does.
 *
 * **The rule is that the compiler emits a structure after everything it names**, and it is measured
 * on the thirteen arch 14 compiles of section 312, `docs/findings.md` section 328, and on the nineteen
 * Harmony One compiles, section 426. Each table that has
 * something parked in front of it is a root, and what is parked is its descendants, in the table's
 * own field order:
 *
 * | in front of base slot | what | in what order |
 * |---|---|---|
 * | 5 | the infrared group arrays | the order base slot 5's table names them |
 * | 7 | the glyphs and the font sets | per set in the table's order: the set's glyphs in its own field order, then the set |
 * | 9 | the mode pages' own tagged lists | see below |
 * | 10 | the action lists the body does not hold | the order base slot 10's table numbers them |
 * | 15 | the parameter groups | the order base slot 15's table names them |
 *
 * and the picture bank after base slot 17. Exact on 13 of 13 arch 14 compiles and on 19 of 19 Harmony
 * One compiles for slots 5, 7, 10 and 15.
 *
 * **Two orders are not in the content, and the placer chooses them.** The mode pages' lists and the
 * pictures come out of Logitech's compiler in an order that is not fixed by the pictures, the pages
 * or the order the body names them: `h700_config` and `h700_config_2` hold the same 24 pictures byte
 * for byte, a body of 16251 pieces of which 16237 are identical at the same place, and the body names
 * the pictures first in the same order in both, and their banks are two permutations with 1 of the 24
 * at the same place, their page lists likewise with 1 of 426. The pair differs in 14 body pieces and
 * its build time, so a dependence on those is not excluded. Over the thirteen, 17 pairs hold the same
 * pictures and none puts more than 3 of them at the same place. **The Harmony One's compiles say the
 * same**, section 426: `calibration_favchannels` and `phase7_before` hold the same 75 pictures and a
 * body of 4509 pieces of which 4504 are identical at the same place, the five that differ being clock
 * records, and their banks put 3 of the 75 pictures and their page lists 1 of 198 at the same place.
 * Whether the order follows the build time, the clock it seeds or a hash order is open, since no two
 * One compiles share a build time.
 * That is what iterating a hash table keyed by object identity
 * looks like, which section 315's reading of Logitech's compiler as Java makes the natural guess, and
 * it is a guess. So no placer here reproduces it, and none needs to, since nothing on the remote that
 * has been found reads an order (below). What the placer does instead:
 *
 * * **The page lists keep the one constraint the content does state.** On the thirteen arch 14
 *   compiles and the nineteen Harmony One ones every
 *   action list parked in front of base slot 10 is called by exactly one page list, through
 *   instruction `0x7F` and the list's number, and the page lists call them in ascending number. That
 *   order is fixed by the action list numbers the page lists carry, and the reading is that the
 *   compiler assigned those numbers in the order it emitted the page lists. So the page lists that
 *   call one are placed in the order of the numbers they call, which is Logitech's relative order on
 *   13 of 13 and 19 of 19, and the ones that call none, about half on arch 14 and 12 to 35 percent on the
 *   One, take the order of their pages in the body,
 *   which is our choice. It is a property of Logitech's compiles and not of a configuration that
 *   runs: our two that ran, sections 285 and 291, call 271 of 277 and 274 of 649 parked lists, and
 *   not in ascending order.
 * * **The pictures go in the order a screen program first names them**, walking the key table and
 *   the body, which is our choice too, and deterministic, so the same content gives the same bytes.
 *
 * **What the remote demands of any of this is nothing that has been found.** Every piece placed here
 * is reached through an address. On the Harmony 600 and 650 0.2, 650 0.4 and 700 2.8 images, the
 * firmware fetches base slot 17 at two places, both indexing it as the touch hit map's page array,
 * one count byte then three byte entries, and neither adding the two bytes that reach the bank. Past
 * the header, the cookie at 0 and `end_addr` at 4, the container validator's only fixed offset is the
 * marker at `0x5B`, and no literal instruction in any of the four loads the key table's `0x5F`.
 * And two configurations of ours that parked differently ran on the Harmony 650, sections 285 and
 * 291, and one with every picture and page list moved, section 328. **On the Harmony One that firmware
 * half is not read**, section 426: its bank is stated nowhere in the container, section 62, every reader
 * here finds it by a search, and it starts on the byte after base slot 17's table, which the placer keeps;
 * fifteen configurations of ours that park differently were written to the spare Harmony One and read
 * back, section 395, the device of section 242 among them ran, and none had its bank or page lists
 * reordered. So the rule above is Logitech's habit, reproduced so that a
 * configuration of ours reads like one of theirs. What has not been done is writing a container
 * with the key table or the bank somewhere else, and this codec's own readers find both by position.
 *
 * Read only towards hardware, like everything in this package. The result is a layout in memory.
 */
import type { ContainerLayout, ContainerPiece, SectionPlacement } from './frame.ts';
import { ARCHITECTURE_SLOT, FIRST_NULL_SLOT, LayoutError } from './frame.ts';
import { BASE_SLOT_COUNT, CLOCK_RECORD_SLOT } from './gspm.ts';
import { taggedListExtent } from './sections.ts';

/** The base slots whose table has something parked in front of it on a Logitech compile. */
export const INFRARED_SLOT = 5;
export const GLYPH_SLOT = 7;
export const HANDLER_SET_SLOT = 9;
export const ACTION_LIST_SLOT = 10;
export const PARAMETER_GROUP_SLOT = 15;

/**
 * The kinds of loose piece the placer has a rule for, in `coverage.ts`'s owner vocabulary, which is
 * what `takeApart` labels a piece with. A loose piece of any other kind is refused rather than put
 * somewhere: the body is the composer's, and a piece the placer has no rule for belongs there.
 */
export const LOOSE_KINDS = [
  'slot-5-group', 'slot-7-glyph', 'slot-7-set', 'slot-6-page-list', 'slot-10-list', 'slot-15-group',
  'picture-bank',
] as const;

/** The owner of a mode page, whose first field names its tagged list. Section 66. */
const PAGE_OWNER = 'slot-6-page';
/** Instruction `0x7F` calls the action list its operand numbers. Section 34. */
const CALL_OPCODE = 0x7f;

/** Everything a container holds, with the parked pieces and the pictures still unplaced. */
export interface UnplacedContainer {
  architecture: number;
  skin: number;
  builtAt: string | Uint8Array;
  flashBase?: number;
  /** Mode 0's record, which `layOutContainer` puts directly after the end marker. */
  keyTable: ContainerPiece;
  /** The composers' emission order, carried: nothing in it is placed here. */
  body: ContainerPiece[];
  /**
   * Each base slot's table, the one piece its section table entry names. Absent for the two slots the
   * frame generates, 1 and 3, and for 18 and 19, which are NULL.
   */
  tables: (ContainerPiece | undefined)[];
  /**
   * The table of each section the architecture inserts, by **raw** slot, as `ContainerLayout.inserted`
   * holds them: the Harmony One's raw slot 18, absent on arch 14. Nothing is parked in front of one,
   * which is what all 36 distinct One containers in the lab do, Logitech's and ours, section 395, so the
   * placer has no rule that puts anything there.
   */
  inserted?: Readonly<Record<number, ContainerPiece>>;
  /** Everything else, in any order: the placer decides where each goes. */
  loose: Iterable<ContainerPiece>;
}

/** Where the placer put things, beside the layout, so a caller can see which orders were chosen. */
export interface Placement {
  layout: ContainerLayout;
  /**
   * The page lists whose position the content states, by the action list they call, and the ones
   * whose position is the placer's choice. The two together are base slot 9's `before`.
   */
  pageListsStated: ContainerPiece[];
  pageListsChosen: ContainerPiece[];
}

/** The pieces a piece names through an address, in the order its fields sit, each once. */
function named(piece: ContainerPiece): ContainerPiece[] {
  const out: ContainerPiece[] = [];
  const seen = new Set<ContainerPiece>();
  for (const ref of [...piece.refs].sort((a, b) => a.at - b.at)) {
    if (!('to' in ref) || seen.has(ref.to)) continue;
    seen.add(ref.to);
    out.push(ref.to);
  }
  return out;
}

/** The action list numbers a tagged list calls, in entry order. */
function calledLists(list: ContainerPiece): number[] {
  const extent = taggedListExtent(list.bytes, 0);
  if (extent === undefined || extent.length > list.bytes.length) {
    throw new LayoutError('a mode page list does not read as a tagged list');
  }
  const stride = extent.wide ? 5 : 4;
  const first = extent.wide ? 2 : 1;
  const out: number[] = [];
  for (let k = 0; k < extent.count; k += 1) {
    // The last three bytes of an entry are the instruction, whichever form the list takes.
    const at = first + stride * k + stride - 3;
    if (list.bytes[at + 2] === CALL_OPCODE) out.push(list.bytes[at]! | (list.bytes[at + 1]! << 8));
  }
  return out;
}

/**
 * Decide where every loose piece goes and return the layout `layOutContainer` takes.
 *
 * Refuses a loose piece of a kind it has no rule for, one its rule does not reach (a glyph no set
 * names, a picture no screen program draws), and a loose piece listed twice. Nothing about the
 * order `loose` arrives in reaches the result, which `test/placer.test.ts` checks by shuffling it.
 */
export function placePieces(input: UnplacedContainer): Placement {
  if (input.tables.length !== BASE_SLOT_COUNT) {
    throw new LayoutError(`the placer takes ${BASE_SLOT_COUNT} tables, not ${input.tables.length}`);
  }
  const loose = new Set<ContainerPiece>();
  for (const piece of input.loose) {
    if (loose.has(piece)) throw new LayoutError('a loose piece is listed twice');
    if (!(LOOSE_KINDS as readonly (string | undefined)[]).includes(piece.owner)) {
      throw new LayoutError(`the placer has no rule for a loose ${piece.owner ?? 'unnamed'} piece`);
    }
    loose.add(piece);
  }
  const placed = new Set<ContainerPiece>();
  /** Take a loose piece of `kind`, once; anything else is left for the next rule. */
  const take = (piece: ContainerPiece, kind: string): boolean => {
    if (!loose.has(piece) || placed.has(piece) || piece.owner !== kind) return false;
    placed.add(piece);
    return true;
  };
  const table = (slot: number): ContainerPiece => {
    const piece = input.tables[slot];
    if (piece === undefined) throw new LayoutError(`base slot ${slot} has no table`);
    return piece;
  };

  // Base slots 5, 10 and 15: the loose pieces the table names, in the table's own order. For base
  // slot 10 that is the action list numbering, and the loose lists are the ones the body does not
  // hold, which on every compile is the tail of the table: the lists numbered after the body's.
  const inTableOrder = (slot: number, kind: string): ContainerPiece[] =>
    named(table(slot)).filter((piece) => take(piece, kind));
  const groups = inTableOrder(INFRARED_SLOT, 'slot-5-group');

  // Base slot 7: each font set after its own glyphs, the sets in the table's order. A glyph two sets
  // name goes with the first, though no compile here shares one.
  const glyphs: ContainerPiece[] = [];
  for (const set of named(table(GLYPH_SLOT))) {
    if (!loose.has(set)) continue;
    for (const glyph of named(set)) if (take(glyph, 'slot-7-glyph')) glyphs.push(glyph);
    if (take(set, 'slot-7-set')) glyphs.push(set);
  }

  const actionTable = named(table(ACTION_LIST_SLOT));
  const lists = actionTable.filter((piece) => take(piece, 'slot-10-list'));
  const parameterGroups = inTableOrder(PARAMETER_GROUP_SLOT, 'slot-15-group');

  // In front of base slot 9: the mode pages' own lists. The ones that call a loose action list go
  // in the order of the list they call, which is the order the compiler numbered those lists in;
  // the others keep their pages' order in the body, and they fill the positions the body order
  // gives them, the stated ones being re-sorted among the positions stated ones occupy.
  const looseNumber = new Map<number, ContainerPiece>();
  actionTable.forEach((piece, number) => { if (loose.has(piece)) looseNumber.set(number, piece); });
  const pageLists: ContainerPiece[] = [];
  for (const page of input.body) {
    if (page.owner !== PAGE_OWNER) continue;
    for (const list of named(page)) if (take(list, 'slot-6-page-list')) pageLists.push(list);
  }
  const callsLoose = (list: ContainerPiece): number | undefined => {
    const numbers = calledLists(list).filter((number) => looseNumber.has(number));
    return numbers.length === 0 ? undefined : Math.min(...numbers);
  };
  const stated = pageLists.filter((list) => callsLoose(list) !== undefined)
    .sort((a, b) => callsLoose(a)! - callsLoose(b)!);
  const chosen = pageLists.filter((list) => callsLoose(list) === undefined);
  let next = 0;
  const pageListOrder = pageLists.map((list) => (callsLoose(list) === undefined ? list : stated[next++]!));

  // The sections, with what is parked in front of each.
  const before = new Map<number, ContainerPiece[]>([
    [INFRARED_SLOT, groups], [GLYPH_SLOT, glyphs], [HANDLER_SET_SLOT, pageListOrder],
    [ACTION_LIST_SLOT, lists], [PARAMETER_GROUP_SLOT, parameterGroups],
  ]);
  const sections: (SectionPlacement | undefined)[] = [];
  for (let slot = 0; slot < BASE_SLOT_COUNT; slot += 1) {
    if (slot >= FIRST_NULL_SLOT) {
      if (input.tables[slot] !== undefined) throw new LayoutError(`base slot ${slot} is NULL on every architecture`);
      sections.push(undefined);
      continue;
    }
    const generated = slot === ARCHITECTURE_SLOT || slot === CLOCK_RECORD_SLOT;
    if (generated && input.tables[slot] !== undefined) {
      throw new LayoutError(`base slot ${slot} is the frame's own, so its table is not given`);
    }
    sections.push({ before: before.get(slot) ?? [], head: generated ? [] : [table(slot)] });
  }
  // The sections the architecture inserts, the Harmony One's raw slot 18, carried with nothing in front:
  // whether the architecture has the slot is the frame's to check, `layOutContainer`, which refuses one it
  // does not have, so the placer states no architecture's slots of its own.
  const inserted: Record<number, SectionPlacement> = {};
  for (const [raw, piece] of Object.entries(input.inserted ?? {})) inserted[Number(raw)] = { before: [], head: [piece] };

  // The pictures, in the order a screen program first names them, walking the key table and the
  // body and then the tables in base slot order, with an inserted section's table last. Every picture
  // of the thirteen arch 14 compiles is named by a program in the body, section 146, and so is every
  // picture of the nineteen Harmony One compiles, 1506 over the twenty fixtures, section 426, so the
  // walk past the body names none of Logitech's; a picture nothing names is refused rather than appended.
  const pictures: ContainerPiece[] = [];
  const walk = [input.keyTable, ...input.body];
  for (const placement of sections) if (placement !== undefined) walk.push(...placement.before, ...placement.head);
  for (const placement of Object.values(inserted)) walk.push(...placement.head);
  for (const piece of walk) for (const target of named(piece)) if (take(target, 'picture-bank')) pictures.push(target);

  const left = [...loose].filter((piece) => !placed.has(piece));
  if (left.length > 0) {
    throw new LayoutError(
      `${left.length} loose pieces no rule reaches, the first a ${left[0]!.owner}: `
      + 'a glyph no set names, a list no page names or a picture nothing draws');
  }
  return {
    layout: {
      architecture: input.architecture,
      skin: input.skin,
      builtAt: input.builtAt,
      ...(input.flashBase === undefined ? {} : { flashBase: input.flashBase }),
      keyTable: input.keyTable,
      body: input.body,
      sections,
      ...(Object.keys(inserted).length === 0 ? {} : { inserted }),
      pictures,
    },
    pageListsStated: stated,
    pageListsChosen: chosen,
  };
}

/**
 * The inverse, for measuring: a laid out container's pieces with the parked ones and the pictures
 * loosened into one bag, in the order given by `shuffle` so a test can show the order is not carried.
 */
export function loosen(layout: ContainerLayout,
                       shuffle: (pieces: ContainerPiece[]) => ContainerPiece[] = (p) => p): UnplacedContainer {
  const tables: (ContainerPiece | undefined)[] = layout.sections.map((placement) => {
    if (placement === undefined || placement.head.length === 0) return undefined;
    if (placement.head.length !== 1) throw new LayoutError('a table is more than one piece');
    return placement.head[0];
  });
  const bag: ContainerPiece[] = [];
  for (const placement of layout.sections) if (placement !== undefined) bag.push(...placement.before);
  bag.push(...layout.pictures);
  // An inserted section's table, kept by its raw slot. Something parked in front of one has no rule in
  // the placer to put it back, so it is refused here rather than dropped.
  const inserted: Record<number, ContainerPiece> = {};
  for (const [raw, placement] of Object.entries(layout.inserted ?? {})) {
    if (placement.before.length > 0) throw new LayoutError(`something is parked in front of raw slot ${raw}, and the placer has no rule for it`);
    if (placement.head.length !== 1) throw new LayoutError(`raw slot ${raw}'s table is not one piece`);
    inserted[Number(raw)] = placement.head[0]!;
  }
  return {
    architecture: layout.architecture,
    skin: layout.skin,
    builtAt: layout.builtAt,
    ...(layout.flashBase === undefined ? {} : { flashBase: layout.flashBase }),
    keyTable: layout.keyTable,
    body: layout.body,
    tables,
    ...(Object.keys(inserted).length === 0 ? {} : { inserted }),
    loose: shuffle(bag),
  };
}

/**
 * Every parked piece of a kind the placer has no rule for, into the body. A composer parks what it adds
 * in front of a table: a composed activity's key map in front of base slot 9's, a composed device's
 * infrared records in front of base slot 5's. Logitech's compiler parks only the kinds `LOOSE_KINDS`
 * names, exact on the thirteen arch 14 compiles of section 328 and on the nineteen Harmony One compiles
 * of section 395, so everything else is a body piece in its compiles: on `h650_test_config_clean`,
 * `h650_start_config`, `h700_config` and `h600_config` every key map is in the body, the activities' in
 * one run that ends with the last. So each piece goes after the body's last piece of its own kind, which
 * is our choice, as the page lists' order is, section 328, and at the end of the body where it holds none
 * of that kind, section 378. Generic: the configurations this project wrote to the spare Harmony One park
 * the same two kinds the Harmony 650's do, section 395, and this takes both families' alike, section 426.
 * Moved here from the Harmony 600 family's assembly for `todo-compile-one.md` 6.2, which places a setup
 * composed onto a Harmony One compile through it; that module re-exports it for the todo-compile-650 10.5
 * bench file, which takes this step rather than a copy of it.
 */
export function composedIntoBody(layout: ContainerLayout): { layout: ContainerLayout; moved: number } {
  const ruled = new Set<string | undefined>(LOOSE_KINDS);
  const moving = layout.sections.flatMap((s) => s?.before.filter((piece) => !ruled.has(piece.owner)) ?? []);
  if (moving.length === 0) return { layout, moved: 0 };
  const body = [...layout.body];
  for (const piece of moving) {
    let last = -1;
    body.forEach((one, k) => {
      if (one.owner === piece.owner) last = k;
    });
    // A body with none of its kind, an empty configuration's first device's infrared records, takes it last:
    // where it goes is our choice either way, and Logitech's compiles interleave those records with the
    // state records, 73 of 73 arch 14 compiles, so no one kind marks where the first would go. Section 378.
    body.splice(last < 0 ? body.length : last + 1, 0, piece);
  }
  const gone = new Set(moving);
  return {
    layout: {
      ...layout,
      body,
      sections: layout.sections.map((s) => (s === undefined ? s : { ...s, before: s.before.filter((piece) => !gone.has(piece)) })),
    },
    moved: moving.length,
  };
}
