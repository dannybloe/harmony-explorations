/**
 * Byte accounting: which bytes of a container belong to a structure this codec understands.
 *
 * This is the progress measure for milestone M2 in `docs/roadmap.md`, and it comes before the
 * emitter on purpose. A round trip that rebuilds a config byte for byte can only rebuild what it
 * can attribute, so "what fraction is attributed" is the number that has to reach 100 first, and
 * it is a number that can only go up as readers land.
 *
 * It is also a check rather than only a report. Two structures claiming the same byte means one of
 * them is sized wrong, and a claim that runs past the end of its section means the same. Neither
 * shows up in a reader's own tests, because a reader that returns plausible values from slightly
 * the wrong number of bytes looks correct until something else needs the boundary.
 *
 * **A claim is made by the reader that already knows the size.** Nothing here re-derives a length
 * from a structure's contents; where a length was only computed inside a reader, that reader grew
 * a variant which returns it. A second copy of a size rule is free to drift from the first, which
 * is the mistake `src/harmony/pic18/isa.py` exists to prevent on the disassembly side.
 */
import { Container, SECTION_ITEM_SIZE, SECTION_TABLE_OFFSET, archSlot } from './gspm.ts';
import { fontSets, glyphs } from './font.ts';
import { bitmaps, pictureBank, reachablePrograms } from './screen.ts';
import { countedPointers, valueMaps } from './valuemap.ts';
import { IR_CLASS_STREAM, IR_HEADER_CLASSES, IR_HEADER_LENGTH, irBlockLength, irClass, irGroups,
  irRecordBlocks, irRecordStart } from './ir.ts';
import { eventMap, handlerSets, modeRecords, modeTable, stateRecords, stateTable, taggedList }
  from './sections.ts';
import { TIMER_RECORD_LENGTH, TOUCH_AREA_LENGTH, parameterGroups, timers, touchPages }
  from './tables.ts';

/** One attributed run of bytes, as offsets into the container blob. */
export interface Claim {
  start: number;
  length: number;
  /** What claimed it, for the per owner breakdown. Slot owners read `slot-<base>-<part>`. */
  owner: string;
}

export interface Overlap {
  start: number;
  length: number;
  owners: string[];
}

export interface CoverageReport {
  total: number;
  accounted: number;
  /** `accounted / total`, the number M2 is trying to move. */
  fraction: number;
  /** Bytes attributed per owner, largest first, counting each byte once. */
  byOwner: [string, number][];
  /** Runs nothing claims, largest first. Where the remaining work is. */
  gaps: { start: number; length: number }[];
  /** Runs more than one claim wants. Always a defect in one of them. */
  overlaps: Overlap[];
}

/** How many of the largest gaps and overlaps a report carries. The rest are counted, not listed. */
export const REPORT_LIMIT = 20;

/**
 * Every claim this codec can make about `c`, in no particular order and possibly overlapping.
 *
 * Deliberately separate from folding them into a map, so a caller debugging a bad extent can see
 * the raw claims with their owners rather than only the merged result.
 */
export function claims(c: Container, withPictures = true): Claim[] {
  const out: Claim[] = [];
  let bankClaims: () => void = () => {};
  const add = (start: number | undefined, length: number | undefined, owner: string): void => {
    if (start === undefined || length === undefined || length <= 0) return;
    if (start < 0 || start + length > c.blob.length) return;
    out.push({ start, length, owner });
  };
  const at = (address: number, length: number | undefined, owner: string): void =>
    add(c.blobOffsetOf(address), length, owner);

  // The fixed furniture. The header runs to the section table, the table to the marker, and the
  // last six bytes are the trailer checksum and the end marker.
  add(0, SECTION_TABLE_OFFSET, 'header');
  add(SECTION_TABLE_OFFSET, SECTION_ITEM_SIZE * c.pointerCount, 'section-table');
  add(c.markerOffset, 4, 'marker');
  add(c.blob.length - 6, 6, 'trailer');

  // The key table follows the marker on the families that carry one: a u8 count and four byte
  // records. `parse` reads it there, so this is the same layout and not a second opinion.
  //
  // **It is also base slot 6's first mode record**, byte for byte, which the overlap detector
  // found rather than anybody noticing: same offset, same count, same four byte entries. It is
  // claimed once, here, and the mode loop below skips whichever record starts on it.
  // `docs/findings.md` section 52.
  if (c.hasKeyTable && c.keys.length > 0) {
    add(c.markerOffset + 4, 1 + 4 * c.keys.length, 'key-table');
  }

  const slot = (base: number): number | undefined => {
    if (c.architecture === undefined) return undefined;
    try {
      const s = archSlot(c.architecture, base);
      return s < c.sections.length ? s : undefined;
    } catch {
      return undefined;
    }
  };

  // Slot 0 states its own length, which is what makes it the only section whose extent is read
  // rather than inferred.
  const tree = c.sections[0];
  if (tree !== undefined && !tree.isNull) at(tree.address, c.frameLength, 'slot-0-tree');

  const arch = slot(1);
  if (arch !== undefined) at((c.sections[arch] as { address: number }).address, 7, 'slot-1-arch');

  const clock = slot(3);
  if (clock !== undefined && c.builtAt !== undefined) {
    at((c.sections[clock] as { address: number }).address, 11, 'slot-3-clock');
  }

  const log = slot(2);
  if (log !== undefined) {
    add(c.blobOffsetOf((c.sections[log] as { address: number }).address), c.sectionLength(log),
        'slot-2-log');
  }

  // The six counted pointer arrays, each claiming exactly the bytes its own width rule settled on.
  for (let i = 0; i < c.sections.length; i += 1) {
    const array = c.pointerArrayAt(i);
    if (array === undefined) continue;
    const base = c.architecture === undefined ? undefined : baseOf(c, i);
    add(array.start, array.length, `slot-${base ?? i}-table`);
  }

  // What the action list table addresses. The extent is `1 + 3 * count` and the count is the list
  // itself, so this needs no size rule of its own.
  const lists = c.actionLists();
  const listSlot = slot(10);
  if (lists !== undefined && listSlot !== undefined) {
    const table = c.pointerArray(listSlot) ?? [];
    for (let k = 0; k < table.length && k < lists.length; k += 1) {
      at(table[k] as number, 1 + 3 * (lists[k] as unknown[]).length, 'slot-10-list');
    }
  }

  // Every screen program reachable from base slot 11 and from base slot 14's lookups, claimed
  // instruction by instruction. Not program by program: the generator shares tails, so two
  // programs can run into the same continuation and claiming whole programs would report an
  // overlap where the file has none.
  for (const [, program] of reachablePrograms(c)) {
    for (const instruction of program) {
      add(instruction.start, instruction.length, 'slot-11-program');
    }
  }

  // The pictures, in two claims that between them name every byte once.
  //
  // The bank is the whole region above the named content, one contiguous array of pictures of
  // which screen opcode 2 now names all of on arch 12 and all but two elsewhere, section 66; the
  // walk it performs is its own proof, because
  // landing exactly on the trailer after dozens of variable length records is not something a
  // wrong start does. It is deferred because its start is where every other claim stops, and the
  // trailer is excluded from that because it sits at the very end.
  //
  // `slot-11-bitmap` then covers only the pictures **outside** the bank, so the two never collide.
  bankClaims = () => {
    const bank = pictureBank(c, namedContentEnd(c)) ?? [];
    const inside = new Set(bank.map((picture) => picture.address));
    for (const picture of bank) at(picture.address, picture.length, 'picture-bank');
    for (const bitmap of bitmaps(c)) {
      if (!inside.has(bitmap.address)) at(bitmap.address, bitmap.length, 'slot-11-bitmap');
    }
  };

  // The four tabular sections, each claiming the length its own reader computed. None of them is
  // large; what makes them worth claiming is that the length is read rather than taken as the gap
  // to the next pointer, which for base slot 4 would be up to twelve times too long.
  const events = eventMap(c);
  if (events !== undefined) {
    const start = slot(4);
    if (start !== undefined) {
      at((c.sections[start] as { address: number }).address, events.length, 'slot-4-event');
    }
  }
  const modes = modeTable(c);
  if (modes !== undefined) add(modes.start, modes.length, 'slot-6-table');
  const bindings = handlerSets(c);
  if (bindings !== undefined) add(bindings.start, bindings.length, 'slot-9-table');
  const state = stateTable(c);
  if (state !== undefined) add(state.start, state.length, 'slot-13-table');

  // Base slot 13's records. The length is `7 + 8 * count` and nothing declares it, so the claim
  // is the size rule under test: an overlap here would mean the rule is wrong somewhere.
  for (const record of stateRecords(c) ?? []) at(record.address, record.length, 'slot-13-record');

  // Base slot 6's entries, at the record start the back pointer names rather than at the pointer
  // itself. Only the tagged list is claimed: a record runs to about seven hundred bytes and the
  // list is about forty five of them, so the rest is undecoded and stays unattributed.
  for (const record of modeRecords(c) ?? []) {
    // The one that is the key table is already claimed above, under the name it had first.
    if (c.blobOffsetOf(record.start) !== c.markerOffset + 4) {
      at(record.start, record.length, 'slot-6-mode');
    }
    // The entry, which used to be claimed as four bytes because the page count and the page
    // array below it were not read. Section 66.
    add(c.blobOffsetOf(record.address), record.entryLength, 'slot-6-entry');
    for (const page of record.pages) {
      at(page.address, page.length, 'slot-6-page');
      // A page's own tagged list. These sit together in one run directly above base slot 7's
      // table, and claiming them fills all but a few bytes of it.
      const list = taggedList(c, page.list);
      if (list !== undefined) at(page.list, list.length, 'slot-6-page-list');
    }
  }

  // Base slot 9's sets, which this deliberately did not claim while it was open whether the
  // pointer lands on the list or inside a record the way base slot 6's does. It does not: read as
  // slot 6's shape, `u8 kind` and a `u24` back pointer, **not one of the 54 sets in the corpus
  // gives an address below itself**, where all 1616 of slot 6's do. So the pointer is the start
  // and the list states its own length. Section 67.
  for (const address of handlerSets(c)?.addresses ?? []) {
    const list = taggedList(c, address);
    if (list !== undefined) at(address, list.length, 'slot-9-list');
  }

  // The infrared database. This used to claim the group arrays alone, because a record's extent
  // was not established and the duration run was located as the longest alternating one, which is
  // a heuristic wearing a measurement's clothes. Section 61 replaced it: the header is 21 bytes and
  // names two data blocks below itself, and a block ends at a zero word, so both extents are read
  // rather than inferred. A block may be named by two records, hence the deduplication, and one
  // that does not close is not claimed at all. What keeps arch 9 out is the **class byte**, not the
  // terminator: all 277 of its blocks find a zero word and none of them is the right one.
  for (const group of irGroups(c) ?? []) {
    add(group.start, group.length, 'slot-5-group');
  }
  const irBlocks = new Set<number>();
  for (const group of irGroups(c) ?? []) {
    for (const address of group.addresses) {
      const encoding = irClass(c, address);
      if (encoding === undefined || !IR_HEADER_CLASSES.has(encoding)) continue;
      const start = irRecordStart(c, address);
      if (start !== undefined) at(start, IR_HEADER_LENGTH, 'slot-5-header');
      // Only class 1's blocks are duration streams. Class 5 shares the header and nothing below
      // it, so its 24511 bytes of block area stay in the gaps where they belong. Section 65.
      if (encoding !== IR_CLASS_STREAM) continue;
      for (const block of irRecordBlocks(c, address)) irBlocks.add(block);
    }
  }
  for (const block of irBlocks) {
    const length = irBlockLength(c, block);
    if (length !== undefined) at(block, length, 'slot-5-block');
  }

  // Three more count prefixed arrays whose records state their own size. Base slot 12's pointer
  // array is not one of the six `pointerArrayAt` recognises, so it is claimed here; base slot 15's
  // is, so only its groups are.
  const timerTable = timers(c);
  if (timerTable !== undefined) {
    add(timerTable.start, timerTable.length, 'slot-12-table');
    for (const timer of timerTable.records) at(timer.address, TIMER_RECORD_LENGTH, 'slot-12-record');
  }
  for (const group of parameterGroups(c) ?? []) {
    at(group.address, group.length, 'slot-15-group');
  }
  const touch = touchPages(c);
  if (touch !== undefined) {
    add(touch.start, touch.length, 'slot-17-table');
    for (const page of touch.records) {
      add(page.start, page.length, 'slot-17-page');
      for (const area of page.areas) at(area.address, TOUCH_AREA_LENGTH, 'slot-17-area');
    }
  }

  // Base slot 14's own records, which are what supplied half of those roots.
  const maps = valueMaps(c);
  if (maps !== undefined) {
    const slot14 = slot(14);
    if (slot14 !== undefined) {
      const header = countedPointers(c, slot14, 1);
      if (header !== undefined) add(header.start, header.length, 'slot-14-table');
    }
    // Records overlap by design where the generator shared a tail, so each is claimed only up to
    // the next one that starts inside it. An overlap here would be the file's, not a defect, and
    // the report must not turn a known sharing into a false alarm.
    const starts = [...maps].map((m) => c.blobOffsetOf(m.address)).filter((o) => o !== undefined);
    for (const record of maps) {
      const start = c.blobOffsetOf(record.address);
      if (start === undefined) continue;
      const inside = starts.filter((o) => o > start && o < start + record.length);
      const bound = inside.length === 0 ? record.length : Math.min(...inside) - start;
      add(start, bound, 'slot-14-record');
    }
  }

  // The glyph sets and their bitmaps. A set's header sits immediately after the glyphs it points
  // at, and both are claimed with the length their own decoder settled on.
  for (const font of fontSets(c) ?? []) {
    at(font.address, font.length, 'slot-7-set');
  }
  for (const set of glyphs(c) ?? []) {
    for (const picture of set) at(picture.address, picture.length, 'slot-7-glyph');
  }

  // Deferred until every other claim exists, because the bank starts where they stop.
  if (withPictures) bankClaims();
  return out;
}

/**
 * Where the named content stops, which is the lower bound for the picture bank's start.
 *
 * Everything but the pictures themselves and the trailer, the first because the bank is what this
 * is used to find and the second because it sits at the very end of the container.
 */
export function namedContentEnd(c: Container): number {
  let top = 0;
  for (const claim of claims(c, false)) {
    if (claim.owner === 'trailer') continue;
    top = Math.max(top, claim.start + claim.length);
  }
  return top;
}

/** The base slot number an architecture slot corresponds to, or undefined when it is inserted. */
function baseOf(c: Container, slot: number): number | undefined {
  if (c.architecture === undefined) return undefined;
  for (let base = 0; base < 20; base += 1) {
    try {
      if (archSlot(c.architecture, base) === slot) return base;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** Fold the claims about `c` into a report. */
export function coverage(c: Container): CoverageReport {
  const total = c.blob.length;
  // One byte per byte is the honest way to count when claims may overlap: a merged interval list
  // would have to resolve overlaps to count them, and resolving them is what hides the defect.
  const owner = new Array<string | undefined>(total);
  const overlapping = new Map<number, string[]>();
  const byOwner = new Map<string, number>();

  for (const claim of claims(c)) {
    for (let i = claim.start; i < claim.start + claim.length; i += 1) {
      const held = owner[i];
      if (held === undefined) {
        owner[i] = claim.owner;
        byOwner.set(claim.owner, (byOwner.get(claim.owner) ?? 0) + 1);
      } else if (held !== claim.owner) {
        const seen = overlapping.get(i) ?? [held];
        if (!seen.includes(claim.owner)) seen.push(claim.owner);
        overlapping.set(i, seen);
      }
    }
  }

  const accounted = owner.reduce<number>((n, o) => (o === undefined ? n : n + 1), 0);
  return {
    total,
    accounted,
    fraction: total === 0 ? 0 : accounted / total,
    byOwner: [...byOwner.entries()].sort((a, b) => b[1] - a[1]),
    gaps: runs(total, (i) => owner[i] === undefined).slice(0, REPORT_LIMIT),
    overlaps: mergeOverlaps(total, overlapping).slice(0, REPORT_LIMIT),
  };
}

/** Maximal runs of consecutive indices satisfying `pick`, longest first. */
function runs(total: number, pick: (i: number) => boolean): { start: number; length: number }[] {
  const out: { start: number; length: number }[] = [];
  let start: number | undefined;
  for (let i = 0; i <= total; i += 1) {
    const inside = i < total && pick(i);
    if (inside && start === undefined) start = i;
    if (!inside && start !== undefined) {
      out.push({ start, length: i - start });
      start = undefined;
    }
  }
  return out.sort((a, b) => b.length - a.length);
}

function mergeOverlaps(total: number, at: Map<number, string[]>): Overlap[] {
  const out: Overlap[] = [];
  let start: number | undefined;
  let owners: string[] = [];
  for (let i = 0; i <= total; i += 1) {
    const here = at.get(i);
    const key = here === undefined ? '' : here.join('+');
    if (start !== undefined && key !== owners.join('+')) {
      out.push({ start, length: i - start, owners });
      start = undefined;
      owners = [];
    }
    if (here !== undefined && start === undefined) {
      start = i;
      owners = here;
    }
  }
  return out.sort((a, b) => b.length - a.length);
}
