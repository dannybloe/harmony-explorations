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
 * **A claim is made by the reader that already knows the size**, and where a length was only computed
 * inside a reader, that reader grew a variant which returns it. A second copy of a size rule is free
 * to drift from the first, which is the mistake `src/harmony/pic18/isa.py` exists to prevent on the
 * disassembly side, and the pointer array loop below is what happens when it is not prevented: it
 * claimed base slot 12's table in all nineteen containers alongside the section's own reader.
 *
 * **This used to add "nothing here re-derives a length from a structure's contents", and three claims
 * did.** The clock's zero tail test, base slot 3's, is still one and is deliberate. What is gone is the
 * base slot 15 scan, which claimed whatever was left over between two structures, and the base slot 17
 * header, which subtracted two offsets that differ by a constant and presented the constant as derived.
 * A sentence stating a property the file does not have is worse than no sentence, because the next
 * reader has no reason to check.
 */
import { BINDING_SLOT, CLOCK_RECORD_LENGTH, CLOCK_SECTION_LENGTH, Container,
  EMPTY_FRAME_LENGTH, FRAME_END_LENGTH, INSTRUCTION_LENGTH, SECTION_ITEM_SIZE, SECTION_TABLE_OFFSET,
  archRecordExtent, archSlot }
  from './gspm.ts';
import { fontSets, glyphs } from './font.ts';
import {
  PICTURE_BANK_BIAS,
  TRAILER_LENGTH,
  bitmaps,
  deadTerminator,
  pictureBank,
  pictureBankStart,
  reachablePrograms,
} from './screen.ts';
import { countedPointers, valueMaps } from './valuemap.ts';
import { IR_CLASS_STREAM, IR_HEADER_CLASSES, irBlockLength, irClass, irClass5Body, irGroups,
  irHeaderLength, irRecordBlocks, irRecordStart, irSymbolBlock, irSymbolTable } from './ir.ts';
import { eventMap, handlerSets, logArea, modeRecords, modeTable, stateRecords, stateTable,
  taggedList, taggedListPools } from './sections.ts';
import { TIMER_RECORD_LENGTH, TOUCH_AREA_LENGTH, lightBandExtras, parameterGroups, timers,
  touchMapStart, touchPages } from './tables.ts';

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
  /**
   * Every gap grouped by its length, by total bytes.
   *
   * **This is the view that finds structures, and `gaps` is the one that hides them.** Sections 75
   * and 66 were both found by asking for the whole gap list and noticing families with the same
   * count: 37 short infrared headers, 37 unclaimed blocks and the 37 gaps between them, all of
   * which sat below the twenty largest and so below the cut. Arch 9's remainder read as 154 x 43,
   * 213 x 30 and 157 x 35, which said "three structures with a fixed size" before a byte of it was
   * read, and section 82 read exactly three. Unlike `gaps` this is computed over all of them.
   */
  gapFamilies: { length: number; count: number; bytes: number }[];
  /** How many gaps there are in total and how many bytes they hold, whatever `gaps` lists. */
  gapCount: number;
  gapBytes: number;
  /** Runs more than one claim wants. Always a defect in one of them. */
  overlaps: Overlap[];
}

/** How many of the largest gaps and overlaps a report carries. The rest are counted, not listed. */
export const REPORT_LIMIT = 20;
/** How many gap families a report carries, by total bytes. */
export const FAMILY_LIMIT = 12;
/**
 * The longest section that may be claimed as an empty counted array.
 *
 * Three, because a count is one or two bytes and arch 12 pads base slot 16's to three. Anything
 * longer that reads as nothing but zeros is a structure this codec has not read, not an absence.
 */
export const EMPTY_ARRAY_LIMIT = 3;

/**
 * Every claim this codec can make about `c`, in no particular order and possibly overlapping.
 *
 * Deliberately separate from folding them into a map, so a caller debugging a bad extent can see
 * the raw claims with their owners rather than only the merged result.
 */
export function claims(c: Container, withPictures = true): Claim[] {
  const out: Claim[] = [];
  let bankClaims: () => void = () => {};
  // The pointer array claims, deferred so they can compare against a section reader's own claim
  // rather than duplicating it. See the comment beside their loop below.
  let tableClaims: () => void = () => {};
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
  add(c.blob.length - TRAILER_LENGTH, TRAILER_LENGTH, 'trailer');

  // The key table follows the marker on the families that carry one: a u8 count and four byte
  // records. `parse` reads it there, so this is the same layout and not a second opinion.
  //
  // **It is also base slot 6's first mode record**, byte for byte, which the overlap detector
  // found rather than anybody noticing: same offset, same count, same four byte entries. It is
  // claimed once, here, and the mode loop below skips whichever record starts on it.
  // `docs/findings.md` section 52.
  //
  // **Its extent is the record's, not `1 + 4 * count`.** A mode record has two forms, and an empty
  // one is the wide form: a zero lead byte and a zero count, two bytes where the narrow arithmetic
  // says one. That is the whole of it on the arch 14 safe mode containers, and the reason those
  // carried two unclaimed bytes each. Section 84.
  const keyRecord = (modeRecords(c) ?? [])
    .find((record) => c.blobOffsetOf(record.start) === c.markerOffset + 4);
  if (c.hasKeyTable && keyRecord !== undefined) {
    add(c.markerOffset + 4, keyRecord.length, 'key-table');
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
  // rather than inferred. **The terminator sits outside that length**, so the frame is
  // `length + 2` bytes and this used to claim two short in every container; the emitter has always
  // written the extra pair, which is where the mismatch showed. An empty frame states a length of
  // zero and is the fixed seven bytes of cookie, length, spare and terminator. Section 83.
  const tree = c.sections[0];
  const extent = c.frameExtent;
  if (tree !== undefined && !tree.isNull && extent !== undefined) {
    at(tree.address, extent, 'slot-0-tree');
  }

  // Base slot 8's leading action list, `u8 count; { u16 operand; u8 opcode }[count]`, which is
  // what section 27 used to fix where the section's records begin. Everything above it in the
  // section is claimed already, as the mode page lists: **every page's list is inside base slot
  // 8's section** in every container, and the leading list plus those lists account for the
  // section exactly. Section 83.
  const binding = slot(BINDING_SLOT);
  if (binding !== undefined) {
    const address = (c.sections[binding] as { address: number }).address;
    const list = c.actionList(address);
    if (list !== undefined) at(address, 1 + INSTRUCTION_LENGTH * list.length, 'slot-8-list');
  }

  // Base slot 1's seven byte record, **bounded by whatever starts next**. The gap to base slot 2
  // is exactly seven on all sixteen other containers and three on the 525's safe mode config, so
  // there a seven byte claim runs four bytes into slot 2. Bounding it is the same rule base slot
  // 14's records already use, and for the same reason: where the file shares bytes, the report
  // must not turn that into a false alarm. Which section really owns those four is open, and
  // section 76 says so rather than this pretending to have settled it.
  const arch = slot(1);
  if (arch !== undefined) {
    at((c.sections[arch] as { address: number }).address,
       archRecordExtent(c.sectionLength(arch)), 'slot-1-arch');
  }

  // Base slot 3, the whole section rather than the record. The record is eleven bytes and closes
  // at its own terminator; the section is fourteen and the last three are zero in all nineteen
  // containers, which is why they are claimed here and written as zeros by the emitter rather than
  // carried. A tail that is not zero is not this section's, so the claim falls back to the record.
  const clock = slot(3);
  if (clock !== undefined && c.builtAt !== undefined) {
    const address = (c.sections[clock] as { address: number }).address;
    const off = c.blobOffsetOf(address);
    const length = c.sectionLength(clock);
    const padded = off !== undefined && length === CLOCK_SECTION_LENGTH
      && c.blob.subarray(off + CLOCK_RECORD_LENGTH, off + length).every((b) => b === 0);
    at(address, padded ? CLOCK_SECTION_LENGTH : CLOCK_RECORD_LENGTH, 'slot-3-clock');
  }

  // Base slot 2's three numbers, claimed with the length its own reader computes from the consumer,
  // `width + 6`, and not with the gap to the next pointer.
  //
  // **They are the same in all nineteen containers and only one of them is a reading.** Section 36 is
  // explicit that a gap is an upper bound rather than a section's size, and base slot 4 is the
  // standing counterexample at 125 bytes against a gap of up to 1532. This claimed the gap, which is
  // right here only because the layout happens to abut: a container that padded after the log area
  // would claim unread bytes and still report every byte accounted for. The test asserts the two agree
  // rather than this assuming it, which is the difference between a coincidence and a check.
  const area = logArea(c);
  if (area !== undefined) {
    const log = slot(2);
    if (log !== undefined) {
      add(c.blobOffsetOf((c.sections[log] as { address: number }).address), area.length, 'slot-2-log');
    }
  }

  // The six counted pointer arrays, each claiming exactly the bytes its own width rule settled on.
  //
  // **A count of zero is an array too**, and `pointerArrayAt` refuses one on purpose: with no
  // entries there is nothing for `width + 3 * count === length` to check, so accepting it would
  // let any short section pass as an array. So it is claimed here instead, under the same name,
  // and only when the section is at most `EMPTY_ARRAY_LIMIT` bytes and every one of them is zero.
  // That is the whole of base slot 16 in every container, since no config in the corpus uses the
  // number sender, and of base slots 5 and 11 in the safe mode containers. Section 83.
  //
  // **Deferred, because several sections read their own table and this used to claim it again.**
  // The comment beside base slot 12 said its array is not one `pointerArrayAt` recognises, and it is:
  // `slot-12-table` was claimed twice in all nineteen containers and `slot-9-table` in six, once here
  // from `width + 3 * count === length` and once from the section reader's own `countedPointers`. The
  // two agreed on every extent, which is worse than disagreeing, because two right copies are the
  // state that precedes two diverging ones and no test could see these: the overlap detector treats an
  // identical run as legitimate, since a shared infrared block genuinely is one. So the loop runs last
  // now and **compares** where a reader has already claimed, pushing its own claim only when the
  // extents differ, which makes a divergence an overlap instead of a silent second opinion.
  tableClaims = () => {
    for (let i = 0; i < c.sections.length; i += 1) {
      const base = c.architecture === undefined ? undefined : baseOf(c, i);
      const owner = base === undefined ? `${RAW_SLOT_PREFIX}-${i}-table` : `slot-${base}-table`;
      const already = out.find((claim) => claim.owner === owner);
      const array = c.pointerArrayAt(i);
      if (array !== undefined) {
        if (already?.start === array.start && already.length === array.length) continue;
        add(array.start, array.length, owner);
        continue;
      }
      const section = c.sections[i];
      const length = c.sectionLength(i);
      if (section === undefined || section.isNull || length === undefined) continue;
      if (length < 1 || length > EMPTY_ARRAY_LIMIT) continue;
      const off = c.blobOffsetOf(section.address);
      if (off === undefined || off + length > c.blob.length) continue;
      if (c.blob.subarray(off, off + length).some((b) => b !== 0)) continue;
      if (already?.start === off && already.length === length) continue;
      add(off, length, owner);
    }
  };

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
    // Plus the terminator after a program that ended by transferring, which the walk stops before
    // and which the generator emitted anyway. Section 84, and the whole of what arch 8 had left.
    const dead = deadTerminator(c, program);
    if (dead !== undefined) add(dead, 1, 'slot-11-program');
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
    // The one that is the key table is already claimed above, under the name it had first. Only
    // where there is a key table: arch 9 has none, so there the record is an ordinary mode record
    // and skipping it left 189 bytes of the safe mode container unclaimed. Section 84.
    if (!c.hasKeyTable || c.blobOffsetOf(record.start) !== c.markerOffset + 4) {
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
  const setStarts = new Set<number>();
  for (const address of handlerSets(c)?.addresses ?? []) {
    const list = taggedList(c, address);
    if (list === undefined) continue;
    const off = c.blobOffsetOf(address);
    if (off !== undefined) setStarts.add(off);
    at(address, list.length, 'slot-9-list');
  }

  // The other lists in those runs, one per mode page and named by nothing. Section 67 claimed
  // them under a name that said only what they are, because what walks them was open. Section 69
  // closed it: each is a second copy of one page's own list, identical in meaning, and no firmware
  // path reads it. The name says that now, since an emitter has to reproduce them.
  for (const pool of taggedListPools(c)) {
    for (const list of pool.lists) {
      if (setStarts.has(list.start)) continue;
      add(list.start, list.length, 'slot-6-page-list-copy');
    }
  }

  // The infrared database. This used to claim the group arrays alone, because a record's extent
  // was not established and the duration run was located as the longest alternating one, which is
  // a heuristic wearing a measurement's clothes. Section 61 replaced it and section 75 fixed the
  // header's size: it states its own length, `12 + 9 * count`, and each group of nine bytes is three
  // pointers to data blocks below it, and a block ends at a zero word, so both extents are read
  // rather than inferred. A block may be named by two records, hence the deduplication, and one
  // that does not close is not claimed at all. What keeps arch 9 out is the **class byte**, not the
  // terminator: all 380 of its blocks find a zero word and none of them is the right one.
  //
  // This comment said "21 bytes and two data blocks" and "277 blocks" until section 139. The claim
  // code was right, because it asks the reader for the extent rather than computing one, which is
  // exactly why nothing failed while the sentence beside it was a week out of date.
  for (const group of irGroups(c) ?? []) {
    add(group.start, group.length, 'slot-5-group');
  }
  const irBlocks = new Set<number>();
  const irBodies = new Set<number>();
  for (const group of irGroups(c) ?? []) {
    for (const address of group.addresses) {
      const encoding = irClass(c, address);
      if (encoding === undefined || !IR_HEADER_CLASSES.has(encoding)) continue;
      const start = irRecordStart(c, address);
      if (start !== undefined) at(start, irHeaderLength(c, address), 'slot-5-header');
      // The two classes put different things behind the same pointers: class 1 a duration stream
      // ending at a zero word, class 5 a body that names a shared symbol table. Section 82.
      for (const block of irRecordBlocks(c, address)) {
        (encoding === IR_CLASS_STREAM ? irBlocks : irBodies).add(block);
      }
    }
  }
  for (const block of irBlocks) {
    const length = irBlockLength(c, block);
    if (length !== undefined) at(block, length, 'slot-5-block');
  }
  // Class 5, and every set here is deduplicated because sharing is the whole point of the shape:
  // two records name one body, hundreds of bodies name one symbol table, and a symbol block is
  // reused by many codes. An editor that changes one in place has to know who else names it.
  const irTables = new Set<number>();
  for (const address of irBodies) {
    const body = irClass5Body(c, address);
    if (body === undefined) continue;
    add(body.start, body.length, 'slot-5-class5-body');
    irTables.add(body.table);
  }
  const irSymbols = new Set<number>();
  for (const address of irTables) {
    const table = irSymbolTable(c, address);
    if (table === undefined) continue;
    add(table.start, table.length, 'slot-5-symbol-table');
    for (const symbol of table.symbols) irSymbols.add(symbol);
  }
  for (const address of irSymbols) {
    const block = irSymbolBlock(c, address);
    if (block !== undefined) add(block.start, block.length, 'slot-5-symbol-block');
  }

  // Three more count prefixed arrays whose records state their own size.
  //
  // **Base slot 12's pointer array is one of the six `pointerArrayAt` recognises**, which this said
  // it is not, so the table below and the deferred loop both claimed it in all nineteen containers.
  // Base slot 9's is recognised in six. Both claims are made here, by the reader, and the loop
  // compares rather than repeating. Base slot 15's groups are claimed here and its array by the loop.
  const timerTable = timers(c);
  if (timerTable !== undefined) {
    add(timerTable.start, timerTable.length, 'slot-12-table');
    for (const timer of timerTable.records) at(timer.address, TIMER_RECORD_LENGTH, 'slot-12-record');
  }
  const groups = parameterGroups(c) ?? [];
  for (const group of groups) {
    at(group.address, group.length, 'slot-15-group');
  }
  // The twelve bytes past base slot 15 group 9, which only arch 12 (Harmony One) carries: band 3's
  // pair of device levels and the two bit field table, at the offsets the firmware computes.
  //
  // **This used to be a `slot-15-spare` owner filling every unclaimed byte** between the lowest group
  // and the pointer array, from section 84, which claimed them by position because nothing had read
  // them. Section 103 read them, and the catch-all outlived the reason for it. It was also unbounded
  // and content blind, so it absorbed whatever a broken group stopped claiming: zeroing one group's
  // entry count still reported 100.00%, zero gaps and zero overlaps, with 32 bytes absorbed on a
  // Harmony One, 28 on a Harmony 600 and a Harmony 880 and 8 on a Harmony 525. Measured over all
  // nineteen containers, the owner claimed exactly these twelve and nothing else anywhere, so the two
  // stated claims replace it byte for byte and an unread run in base slot 15 is a gap again.
  const extras = lightBandExtras(c);
  if (extras !== undefined) {
    at(extras.pair.address, extras.pair.length, 'slot-15-band-pair');
    at(extras.fields.address, extras.fields.length, 'slot-15-band-fields');
  }
  // Base slot 17 is two different sections, and which one it is comes from the architecture rather
  // than from the shape of what is there. On arch 12 (Harmony One) it is the touch map; everywhere
  // else it names the picture bank, and its own part is the two bytes in front of it. Section 84.
  //
  // **The architecture decides, not an empty table.** This asked `touchPages(c)` on every
  // architecture and read `records.length === 0` as "picture bank", which is a rule derived from a
  // reader that should have refused, spelled out here and again in `emit.ts`. A nonzero leading
  // byte in front of a bank would have made both claim the wrong length.
  //
  // The constant is named rather than subtracted for the same reason as before: this read
  // `pictureBankStart(c) - touch.start`, presented as derived from where the bank sits, and the
  // difference was `PICTURE_BANK_BIAS` by construction.
  const touch = touchPages(c);
  const slot17 = touchMapStart(c);
  if (touch !== undefined) {
    add(touch.start, touch.length, 'slot-17-table');
    for (const page of touch.records) {
      add(page.start, page.length, 'slot-17-page');
      for (const area of page.areas) at(area.address, TOUCH_AREA_LENGTH, 'slot-17-area');
    }
  } else if (slot17 !== undefined && pictureBankStart(c) !== undefined) {
    add(slot17, PICTURE_BANK_BIAS, 'slot-17-table');
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
    //
    // **The sharing it defends against has never happened**, 0 of 239 records across the corpus, so
    // this bound has no case behind it and a record whose `length` is wrong gets clipped into a
    // plausible extent with no sample to show it. It stays, because a defence measured at zero is a
    // prediction rather than dead code, and the test asserts the zero: the day it fires, either the
    // sharing is real or `valueMaps` has started returning a length that runs into its neighbour, and
    // both are worth reading rather than absorbing.
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

  // The tables come before the bank, since the bank starts where every other claim stops and a
  // table is one of those claims.
  tableClaims();
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

/**
 * What to call a slot whose base number is not established.
 *
 * **Not the raw index.** `baseOf` returns undefined for an architecture with no slot mapping, and the
 * owner name used to fall back to the index, so `h890_config` reported `slot-2-table`, `slot-13-table`
 * and `slot-18-table` for an arch 10 (Harmony 890) container whose slot mapping section 117 measured
 * and refused to guess: the best of 1330 candidate insertions reaches 34 of 47 where arch 8 (Harmony
 * 880), arch 9 (Harmony 525) and arch 14 (Harmony 600 and 700) each score 47 uniquely. A raw slot
 * printed as a base slot is the one relabelling that section forbids, and it was in a report.
 */
export const RAW_SLOT_PREFIX = 'raw';

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

  // **Which claim holds a byte, not just which owner.** The test used to be `held !== claim.owner`,
  // so two claims of the same reader could not collide, and that is where nearly all the bytes are:
  // 1657850 of `one_config`'s 1672926 claimed bytes belong to owner names with more than one claim.
  // Measured on 13 August 2026: growing one base slot 13 record's count so its `7 + 8 * count`
  // swallows the next record's header still reported 100.00%, zero overlaps and zero gaps, and a
  // single flipped byte made two `slot-10-list` claims overlap by three with nothing to see it. Since
  // `accounted` is a union, over-claiming cannot lower the percentage either, so the overlap list is
  // the only thing standing behind the headline number and it had a blind spot over 99% of it.
  //
  // The identical run is the legitimate case and stays legitimate: two records naming one shared
  // infrared block, section 61, or two readers reaching one structure, which `emit.ts` deduplicates
  // the same way. Anything else is an overlap now, owner name or not. It costs nothing: over all
  // nineteen containers the stricter rule finds zero bytes.
  const list = claims(c);
  const which = new Int32Array(total).fill(-1);

  list.forEach((claim, index) => {
    for (let i = claim.start; i < claim.start + claim.length; i += 1) {
      const held = which[i] as number;
      if (held < 0) {
        which[i] = index;
        owner[i] = claim.owner;
        byOwner.set(claim.owner, (byOwner.get(claim.owner) ?? 0) + 1);
        continue;
      }
      const other = list[held] as Claim;
      if (other.start === claim.start && other.length === claim.length) continue;
      const seen = overlapping.get(i) ?? [other.owner];
      if (other.owner === claim.owner) {
        // One reader twice, which the owner name cannot distinguish, so the name is repeated.
        if (seen.length < 2) seen.push(claim.owner);
      } else if (!seen.includes(claim.owner)) {
        seen.push(claim.owner);
      }
      overlapping.set(i, seen);
    }
  });

  const accounted = owner.reduce<number>((n, o) => (o === undefined ? n : n + 1), 0);
  const gaps = runs(total, (i) => owner[i] === undefined);
  return {
    total,
    accounted,
    fraction: total === 0 ? 0 : accounted / total,
    byOwner: [...byOwner.entries()].sort((a, b) => b[1] - a[1]),
    gaps: gaps.slice(0, REPORT_LIMIT),
    gapFamilies: gapFamilies(gaps),
    gapCount: gaps.length,
    gapBytes: gaps.reduce((n, gap) => n + gap.length, 0),
    overlaps: mergeOverlaps(total, overlapping).slice(0, REPORT_LIMIT),
  };
}

/**
 * The gaps grouped by length, by total bytes, capped at `FAMILY_LIMIT`.
 *
 * Exported so the grouping can be tested on a list nobody had to produce a container for. **That
 * matters more than it used to**: every user config is fully accounted now, so the corpus can no
 * longer supply a container with more gaps than `REPORT_LIMIT`, and the property this function
 * exists for is precisely that it counts all of them rather than the listed ones. A test that can
 * only be written against a fixture that no longer exists is a test that quietly stops checking.
 */
export function gapFamilies(
  gaps: readonly { length: number }[],
): { length: number; count: number; bytes: number }[] {
  const families = new Map<number, number>();
  for (const gap of gaps) families.set(gap.length, (families.get(gap.length) ?? 0) + 1);
  return [...families.entries()]
    .map(([length, count]) => ({ length, count, bytes: length * count }))
    .sort((a, b) => b.bytes - a.bytes || b.length - a.length)
    .slice(0, FAMILY_LIMIT);
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
