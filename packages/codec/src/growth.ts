/**
 * What moves when a config gets longer: the pointers that state a position, and the positions
 * nothing states.
 *
 * **Read only, and it has to be.** Nothing here writes a byte, moves a structure or goes near a
 * remote. It answers one question about a container that already exists: if one structure in it
 * changed length, what else would have to change. `edit.ts` refuses a length change outright and
 * says why in its own docstring; this is the survey that would have to be true before that refusal
 * could ever be lifted, and its value is that it is executable. Run it over the corpus and the
 * inventory is a number per sample rather than a paragraph.
 *
 * **The two populations, and the difference between them is the whole point.**
 *
 * * A **stated** position is written down: some field holds the flash address of the structure.
 *   Growing something below it moves the structure and a relocation rewrites the field. Mechanical,
 *   and the count is what says how much work it is.
 * * An **implied** position is not written down anywhere. It is the byte after something else, or
 *   the landing place of a walk, so nothing has to be rewritten and nothing can be checked either:
 *   a relocation that gets it wrong produces a file that parses and means something different.
 *   Section 55's picture bank is the canonical one and section 69's page list copy is the nastiest.
 *
 * **The implied set is derived rather than listed**, which is what makes it exhaustive. Every claim
 * `coverage.ts` makes is a structure this codec can see; every pointer below is an address this
 * codec can read. A claim whose start no pointer names is implied, by construction, so a reader
 * added tomorrow lands in one population or the other without anybody deciding. `IMPLIED_BY` then
 * has to say **why** nothing states it, per owner, and `growthReport` reports the owners it has no
 * answer for so that a new reader cannot quietly join the set.
 *
 * **Every pointer is checked against the reader that produced it.** The census reads a `u24` at an
 * offset it computes from a documented layout, which is a second copy of that layout and therefore
 * the state this repository's oldest rule forbids. So each entry asserts that the three bytes at
 * its own offset hold the address the reader returned, and a mismatch is a refusal rather than a
 * silent entry. If a layout in `sections.ts`, `ir.ts` or `font.ts` moves, this fails loudly instead
 * of reporting a pointer that is not there.
 */

import { u8, u16, u24 } from './bytes.ts';
import {
  Container,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  TRAILER_CHECKSUM_OFFSET,
  archSlot,
  trailerChecksum,
} from './gspm.ts';
import { claims, tableOwner } from './coverage.ts';
import {
  MODE_ENTRY_HEADER,
  handlerSets,
  logArea,
  modeRecords,
  modeTable,
  stateTable,
} from './sections.ts';
import {
  IR_HEADER_BASE,
  IR_HEADER_GROUP,
  IR_POINTER_LENGTH,
  IR_POINTERS_PER_GROUP,
  IR_RECORD_POINTER_BIAS,
  IR_TABLE_SLOT,
  irClass5Body,
  irGroups,
  irHeaderPointers,
  irRecordStart,
  irSymbolTable,
} from './ir.ts';
import {
  SCREEN_CALL,
  SCREEN_DRAW_IMAGE,
  SCREEN_DRAW_IMAGE_AT,
  SCREEN_JUMP,
  SCREEN_SWITCH_NARROW,
  SCREEN_SWITCH_WIDE,
  TRAILER_LENGTH,
  pictureBankStart,
  pictureReference,
  reachablePrograms,
} from './screen.ts';
import { referencedStringAddress } from './text.ts';
import { IMAGE_SET_HEADER, fontSets } from './font.ts';
import { TOUCH_AREA_SELF_AT, TOUCH_MAP_SLOT, touchPages } from './tables.ts';
import {
  VALUE_MAP_COUNT_WIDTH,
  VALUE_MAP_KEY_WIDTH,
  VALUE_MAP_RANGE_BYTES,
  VALUE_MAP_SECTION_COUNT_WIDTH,
  VALUE_MAP_SLOT,
  countedPointers,
  valueMaps,
} from './valuemap.ts';

/** How wide a flash address is in this format, everywhere it appears. */
export const POINTER_WIDTH = 3;

/**
 * One field holding a flash address.
 *
 * `at` is where the field is, which is what a relocation rewrites; `target` is what it says, which
 * is what a relocation recomputes. `lands` is the same address as a blob offset, and undefined
 * means the target is outside this container: base slot 2's log area names flash above it, and
 * those two fields are the ones a relocation must **not** touch.
 */
export interface Pointer {
  at: number;
  target: number;
  lands: number | undefined;
  /** The structure the field sits in, in `coverage.ts`'s owner vocabulary where there is one. */
  holder: string;
  /** What the field names, in the same vocabulary. */
  names: string;
}

/**
 * Why a structure's position is not stated, in three kinds, because they cost different things.
 *
 * * `frame`: the container's own arithmetic decides, so a growth cannot move it wrongly. The
 *   cheapest kind and the only one a writer can ignore.
 * * `packed`: it sits immediately after a structure of a different kind, so whatever produced that
 *   structure has to produce this one in the same pass. Section 69's page list copy is the one with
 *   teeth, since nothing reads it and every check passes without it.
 * * `chain`: it is the byte after the previous element of the same run, so one element growing moves
 *   every later element and there is no field anywhere to correct. Section 55's picture bank, and
 *   every instruction of a screen program after the first.
 */
export type ImpliedKind = 'frame' | 'packed' | 'chain';

/** A structure whose position no field states. */
export interface Implied {
  start: number;
  length: number;
  owner: string;
  kind: ImpliedKind | undefined;
  /** What puts it there instead, and therefore what a relocation would have to reproduce. */
  because: string;
}

/**
 * Why nothing states each implied structure's position, by `coverage.ts` owner name.
 *
 * A row here is a claim about the format and not a note: it says what a writer would have to
 * recompute, and `growthReport` lists any implied owner missing from it rather than passing over it.
 * The table is therefore the falsifiable part of this file. A reader added tomorrow whose structure
 * no pointer names shows up in `unexplained` until somebody works out what does place it.
 */
export const IMPLIED_BY: Readonly<Record<string, { kind: ImpliedKind; because: string }>> = {
  // The furniture. Nothing points at the frame, and its positions are the format's own arithmetic.
  header: { kind: 'frame', because: 'the container begins there' },
  'section-table': { kind: 'frame', because: `a fixed ${SECTION_TABLE_OFFSET} bytes of header` },
  marker: {
    kind: 'frame',
    because: 'the section table, whose length is the pointer count times four',
  },
  trailer: { kind: 'frame', because: 'the end of the container, six bytes back' },
  // **The key table is not here, and that was measured rather than reasoned.** Nothing points at
  // the four bytes after the end marker, so it looked like a fourth frame position, and it is not:
  // it **is** base slot 6's first mode record, section 52, so the mode table names it like any
  // other mode. `test/growth.test.ts` demands every row be used, which is what caught the row.

  // Packed after something else, with nothing naming them.
  'slot-6-page-list-copy': {
    kind: 'packed',
    because: 'the page list before it, and nothing reads the copy at all, section 69',
  },
  'slot-15-band-pair': {
    kind: 'packed',
    because: 'group 9 continuing past the six entries its own header declares, section 103',
  },
  'slot-15-band-fields': {
    kind: 'packed',
    because: 'group 9 continuing, immediately after the pair, section 103',
  },

  // Runs, where one element growing moves every later one.
  'picture-bank': {
    kind: 'chain',
    because: 'the picture before it, and the first one by base slot 17 plus a two byte bias on '
      + 'arch 8, 9 and 14 and by a search over up to 1024 offsets on arch 12, sections 55 and 62',
  },
  'slot-11-program': {
    kind: 'chain',
    because: 'the instruction before it. A program is claimed instruction by instruction, because '
      + 'the generator shares tails, so only the first instruction of a program is ever addressed '
      + 'and a jump or a switch inside one names an absolute address like any other pointer',
  },
};

/**
 * Every address `c` states, in no particular order.
 *
 * `refusals` collects a census entry whose bytes do not hold the address the reader returned, as
 * `holder at offset: what was there`. Passed in rather than returned for the reason `claims` gives:
 * a refusal that is a silent `return` makes a broken layout and an absent structure the same thing
 * from outside. Every container in the corpus refuses zero.
 */
export function pointers(c: Container, refusals: string[] = []): Pointer[] {
  const out: Pointer[] = [];

  const add = (at: number, target: number, holder: string, names: string): void => {
    if (at < 0 || at + POINTER_WIDTH > c.blob.length) {
      refusals.push(`${holder} at ${at}: outside the container`);
      return;
    }
    const held = u24(c.blob, at);
    if (held !== target) {
      refusals.push(`${holder} at ${at}: holds 0x${held.toString(16)}, reader said `
        + `0x${target.toString(16)}`);
      return;
    }
    out.push({ at, target, lands: c.blobOffsetOf(target), holder, names });
  };

  const slot = (base: number): number | undefined => {
    if (c.architecture === undefined) return undefined;
    try {
      const s = archSlot(c.architecture, base);
      return s < c.sections.length ? s : undefined;
    } catch {
      return undefined;
    }
  };
  const sectionStart = (base: number): number | undefined => {
    const s = slot(base);
    if (s === undefined) return undefined;
    const section = c.sections[s];
    if (section === undefined || section.isNull) return undefined;
    return c.blobOffsetOf(section.address);
  };

  // The section table. Twenty to twenty three items of `{ u8 spare; u24 address }`, so the address
  // sits one byte into the item, which is section 20's correction and the reason `spare` is parsed.
  for (const section of c.sections) {
    if (section.isNull) continue;
    add(SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * section.slot + 1, section.address,
        'section-table', `slot ${section.slot}`);
  }

  // The six counted arrays, whichever slots they are on this architecture. `pointerArrayAt` is
  // what settles the count's width, so the offsets come from its own answer rather than from a
  // table of widths here.
  for (let i = 0; i < c.sections.length; i += 1) {
    const array = c.pointerArrayAt(i);
    if (array === undefined) continue;
    const owner = tableOwner(c, i);
    array.values.forEach((target, k) => {
      add(array.start + array.width + POINTER_WIDTH * k, target, owner, `${owner} entry ${k}`);
    });
  }

  // **Base slot 4 holds no addresses**, which was worth measuring rather than assuming from the
  // `u24` width: its fallback and its thirty entries are mode indices, the operand opcode 0x7E
  // takes, and all 589 values across the corpus are between 0 and 48 with not one of them landing
  // inside a container. A census that took a `u24` for a pointer would have invented 31 of them per
  // sample. Section 36 and section 39.

  // Base slot 6's mode table, a `u24` count then that many mode addresses.
  const modes = modeTable(c);
  if (modes !== undefined) {
    modes.addresses.forEach((target, k) => {
      add(modes.start + 3 + POINTER_WIDTH * k, target, 'slot-6-table', `mode ${k}`);
    });
  }

  // Base slot 9's sets, a `u8` count then that many addresses.
  const sets = handlerSets(c);
  if (sets !== undefined) {
    sets.addresses.forEach((target, k) => {
      add(sets.start + 1 + POINTER_WIDTH * k, target, 'slot-9-table', `set ${k}`);
    });
  }

  // Base slot 13's table, whose entries begin eight bytes in.
  const states = stateTable(c);
  if (states !== undefined) {
    states.entries.forEach((target, k) => {
      add(states.start + 8 + POINTER_WIDTH * k, target, 'slot-13-table', `variable ${k}`);
    });
  }

  // A mode: the back pointer to its own start, then its page array, then two pointers per page.
  // The entry's pointer lands on a discriminator byte with the back pointer after it, section 52,
  // so the record's start is stated rather than computed from the entry.
  for (const record of modeRecords(c) ?? []) {
    const entry = c.blobOffsetOf(record.address);
    if (entry === undefined) continue;
    add(entry + 1, record.start, 'slot-6-entry', 'the mode record it belongs to');
    record.pages.forEach((page, k) => {
      add(entry + MODE_ENTRY_HEADER + POINTER_WIDTH * k, page.address, 'slot-6-entry', `page ${k}`);
      const pageAt = c.blobOffsetOf(page.address);
      if (pageAt === undefined) return;
      const lead = record.pages[k]?.lead === undefined ? 0 : 1;
      add(pageAt + lead, page.list, 'slot-6-page', 'its tagged list');
      add(pageAt + lead + POINTER_WIDTH, page.program, 'slot-6-page', 'its screen program');
    });
  }

  // Base slot 5. A group is a count and a record array; a record header carries three block
  // pointers per group, and a class 5 record's first block is a body naming a symbol table.
  const irSlot = slot(IR_TABLE_SLOT);
  if (irSlot !== undefined) {
    for (const group of irGroups(c) ?? []) {
      group.addresses.forEach((target, k) => {
        add(group.start + 3 + IR_POINTER_LENGTH * k, target, 'slot-5-group', `record ${k}`);
      });
      for (const address of group.addresses) {
        const landing = c.blobOffsetOf(address);
        const start = irRecordStart(c, address);
        if (landing === undefined || start === undefined) continue;
        add(landing + 1, start, 'slot-5-header', 'where its own data begins');
        // **The block pointers are `IR_HEADER_BASE` past the record's own start and not past the
        // pointer's landing**, which is seven bytes lower, `IR_RECORD_POINTER_BIAS`. The first cut
        // of this census read them at the landing and reported 465 pointers per arch 14 (Harmony
        // 600) container naming flash outside the container. It went unnoticed for one run because
        // the entry's own check was **vacuous**: the target was read from the same three bytes the
        // check then compared it against, which is the pitfall `CLAUDE.md` states as "a closure
        // whose two ends come from the same bytes is not a closure". So the targets come from
        // `irHeaderPointers`, whose order is group by group and slot by slot, and only the offsets
        // are computed here.
        const record = c.blobOffsetOf(start);
        if (record === undefined) continue;
        irHeaderPointers(c, address).forEach((target, k) => {
          if (target === 0) return;
          const g = Math.floor(k / IR_POINTERS_PER_GROUP);
          const inGroup = k % IR_POINTERS_PER_GROUP;
          const at = record + IR_HEADER_BASE + IR_HEADER_GROUP * g + POINTER_WIDTH * inGroup;
          add(at, target, 'slot-5-header', `block ${inGroup} of pointer group ${g}`);
        });
      }
    }
    // The class 5 chain, walked from the bodies the accounting already found rather than from the
    // records again, so the two cannot disagree about which records are class 5.
    for (const claim of claims(c, false)) {
      if (claim.owner === 'slot-5-class5-body') {
        const body = irClass5Body(c, c.flashBase + claim.start);
        if (body === undefined) continue;
        add(claim.start, body.table, 'slot-5-class5-body', 'its symbol table');
      }
      if (claim.owner === 'slot-5-symbol-table') {
        const table = irSymbolTable(c, c.flashBase + claim.start);
        if (table === undefined) continue;
        table.symbols.forEach((target, k) => {
          add(claim.start + 1 + IR_POINTER_LENGTH * k, target, 'slot-5-symbol-table',
              `symbol ${k}`);
        });
      }
    }
  }

  // Base slot 7's font sets, each a three byte header then a glyph address per code. A zero entry
  // is a code the set does not draw, and it is not a pointer.
  for (const set of fontSets(c) ?? []) {
    const off = c.blobOffsetOf(set.address);
    if (off === undefined) continue;
    set.glyphs.forEach((target, k) => {
      if (target === undefined) return;
      add(off + IMAGE_SET_HEADER + POINTER_WIDTH * k, target, 'slot-7-set', `glyph code ${k}`);
    });
  }

  // The two section headers that are a count and a pointer array **followed by their own records**,
  // so `pointerArrayAt` refuses them: the array does not account for the section. Their offsets
  // come from `countedPointers`, the call the readers themselves make, and their targets from the
  // readers, so neither end of the check is this file's own arithmetic.
  const valueSlot = slot(VALUE_MAP_SLOT);
  const valueHeader = valueSlot === undefined
    ? undefined
    : countedPointers(c, valueSlot, VALUE_MAP_SECTION_COUNT_WIDTH);
  if (valueHeader !== undefined) {
    (valueMaps(c) ?? []).forEach((map, k) => {
      add(valueHeader.start + VALUE_MAP_SECTION_COUNT_WIDTH + POINTER_WIDTH * k, map.address,
          'slot-14-table', `record ${k}`);
    });
  }
  const touchSlot = slot(TOUCH_MAP_SLOT);
  const touchHeader = touchSlot === undefined ? undefined : countedPointers(c, touchSlot, 1);
  const touch = touchPages(c);
  if (touchHeader !== undefined && touch !== undefined) {
    touch.records.forEach((page, k) => {
      add(touchHeader.start + 1 + POINTER_WIDTH * k, page.address, 'slot-17-table', `page ${k}`);
    });
  }

  // Base slot 17 on arch 12: a page is a count and an area array, and each area carries a back
  // pointer to itself, which is what makes the twelve byte reading self checking.
  for (const page of touch?.records ?? []) {
    page.areas.forEach((area, k) => {
      add(page.start + 1 + POINTER_WIDTH * k, area.address, 'slot-17-page', `area ${k}`);
      const at = c.blobOffsetOf(area.address);
      if (at === undefined) return;
      add(at + TOUCH_AREA_SELF_AT, area.self, 'slot-17-area', 'itself');
    });
  }

  // Base slot 14: exact cases then inclusive ranges, each naming a screen program. The counter's
  // width is per architecture, which is why it comes from the table rather than from a literal.
  const counter = c.architecture === undefined ? undefined : VALUE_MAP_COUNT_WIDTH[c.architecture];
  if (counter !== undefined) {
    for (const map of valueMaps(c) ?? []) {
      const off = c.blobOffsetOf(map.address);
      if (off === undefined) continue;
      const stride = VALUE_MAP_KEY_WIDTH + POINTER_WIDTH;
      const base = off + 1 + counter;
      map.entries.forEach(([, target], k) => {
        add(base + stride * k + VALUE_MAP_KEY_WIDTH, target, 'slot-14-record', `case ${k}`);
      });
      const spans = base + stride * map.entries.length;
      map.ranges.forEach(([, , target], k) => {
        add(spans + 1 + VALUE_MAP_RANGE_BYTES * k + 2 * VALUE_MAP_KEY_WIDTH, target,
            'slot-14-record', `range ${k}`);
      });
    }
  }

  // The screen language. Four opcodes carry an address in their last three operand bytes, a jump
  // carries one, and a switch carries one per arm. Opcode 22 is a call on arch 12 and takes one
  // operand on arch 9, where there is no address at all, so the width decides rather than a list.
  for (const [, program] of reachablePrograms(c)) {
    for (const instruction of program) {
      const { opcode, start, length, operands } = instruction;
      if (opcode === SCREEN_JUMP) {
        add(start + 1, instruction.targets[0] as number, 'slot-11-program', 'where it continues');
        continue;
      }
      if (opcode === SCREEN_SWITCH_NARROW || opcode === SCREEN_SWITCH_WIDE) {
        const width = opcode === SCREEN_SWITCH_WIDE ? 2 : 1;
        const body = start + 1;
        let at = 1;
        let arm = 0;
        for (const fields of [1, 2]) {
          const count = width === 1 ? u8(operands, at) : u16(operands, at);
          at += width;
          const entry = fields * width + POINTER_WIDTH;
          for (let k = 0; k < count; k += 1) {
            const where = at + entry * k + entry - POINTER_WIDTH;
            add(body + where, u24(operands, where), 'slot-11-program', `arm ${arm}`);
            arm += 1;
          }
          at += entry * count;
        }
        continue;
      }
      // The three opcodes whose last three operand bytes are an address, each taken from the
      // reader that already follows it rather than read again here. Opcode 22 is a call on arch 12
      // (Harmony One) and one operand wide on arch 9 (Harmony 525), where there is no address at
      // all, so `targets` decides rather than a list of architectures.
      const picture = pictureReference(instruction);
      if (picture !== undefined) {
        add(start + length - POINTER_WIDTH, picture, 'slot-11-program',
            opcode === SCREEN_DRAW_IMAGE_AT ? 'a picture, by opcode 3' : 'a picture');
        continue;
      }
      const string = referencedStringAddress(instruction);
      if (string !== undefined) {
        add(start + length - POINTER_WIDTH, string, 'slot-11-program',
            'a glyph run in another program');
        continue;
      }
      if (opcode === SCREEN_CALL && instruction.targets.length === 1) {
        add(start + length - POINTER_WIDTH, instruction.targets[0] as number, 'slot-11-program',
            'the program it calls');
      }
    }
  }

  // Base slot 2's log area, whose two addresses are the only ones in the format that deliberately
  // name flash **outside** the container. Section 47, and section 111 for what the remote does with
  // them: on arch 12 both One configs declare the top sixteen bytes of flash and the writer
  // disarms itself. They are in the census so that a relocation can be told not to touch them.
  const area = logArea(c);
  const areaAt = sectionStart(2);
  if (area !== undefined && areaAt !== undefined) {
    const width = c.sectionLength(slot(2) as number) === 9 ? 3 : 2;
    add(areaAt + width, area.start, 'slot-2-log', 'the bottom of the reserved region');
    add(areaAt + width + POINTER_WIDTH, area.limit, 'slot-2-log', 'one past its top');
  }

  return out;
}

/** Every structure whose start no field in the container states. */
export function impliedPositions(c: Container): Implied[] {
  const named = new Set<number>();
  for (const pointer of pointers(c)) {
    if (pointer.lands !== undefined) named.add(pointer.lands);
  }
  const out: Implied[] = [];
  for (const claim of claims(c)) {
    if (named.has(claim.start)) continue;
    const reason = IMPLIED_BY[claim.owner];
    out.push({
      start: claim.start,
      length: claim.length,
      owner: claim.owner,
      kind: reason?.kind,
      because: reason?.because ?? '',
    });
  }
  return out;
}

/** A field that is computed from the rest of the container rather than carried. */
export interface Restamp {
  at: number;
  width: number;
  field: string;
  /** How to compute it, and what makes it wrong if a length changed and it did not. */
  how: string;
}

/**
 * The fields a length change makes wrong on its own, before anything has moved.
 *
 * Deliberately only the ones a **growth** invalidates. `FIELD_RULES` in `edit.ts` is the wider
 * table, and it covers a save's stamping of base slot 3 and base slot 13, which is a different
 * question: those are wrong because time passed, not because the file got longer.
 */
export function restamps(c: Container): Restamp[] {
  return [
    {
      at: 4,
      width: 4,
      field: 'end_addr',
      how: "the end marker's own address, which is the flash base plus the length less four, "
        + 'exactly, on all nineteen containers. The one header field that moves with a growth, and '
        + "the container's base is anchored on the clock record rather than on this, section 117: "
        + 'computing the base from `end_addr` and the marker offset tests the assumption it was '
        + 'just computed from, so no input can fail it',
    },
    {
      at: c.blob.length - TRAILER_CHECKSUM_OFFSET,
      width: 2,
      field: 'the trailer checksum',
      how: 'a u16 XOR of little endian words seeded 0x4321 over everything below it, section 41. '
        + 'The only check the remote makes, and blind to two transposed words, so it says the file '
        + 'will be accepted and not that it is right',
    },
    {
      at: SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * c.pointerCount,
      width: 4,
      field: 'the end marker\'s position',
      how: 'the pointer count times four past the section table. It moves only if the number of '
        + 'slots changes, which is per architecture, so a growth never touches it',
    },
  ];
}

/** What inserting bytes at one offset would cost. */
export interface InsertionCost {
  /** Where the insertion would go, as a blob offset. */
  at: number;
  /** Pointers whose target sits at or above it, so a relocation rewrites them. */
  rewrite: number;
  /** Structures at or above it whose position nothing states, so nothing can be rewritten. */
  implied: number;
  /** Distinct targets at or above it that more than one pointer names. */
  shared: number;
}

/**
 * The cost of making room at `at`, as three counts.
 *
 * This is the number the whole survey exists to produce, and it is a function of the offset rather
 * than one figure per container: growth at the very top of a container costs nothing at all,
 * because the picture bank is the last thing in it and no pointer names anything above. Growth in
 * the middle rewrites thousands of fields. So "how expensive is a length change" has no answer and
 * "where is it cheap" has one.
 */
export function insertionCost(
  c: Container,
  at: number,
  census?: { pointers: readonly Pointer[]; implied: readonly Implied[] },
): InsertionCost {
  const found = census?.pointers ?? pointers(c);
  const implied = census?.implied ?? impliedPositions(c);
  const above = found.filter((p) => p.lands !== undefined && p.lands >= at);
  const holders = new Map<number, number>();
  for (const pointer of above) {
    holders.set(pointer.target, (holders.get(pointer.target) ?? 0) + 1);
  }
  return {
    at,
    rewrite: above.length,
    implied: implied.filter((i) => i.start >= at).length,
    shared: [...holders.values()].filter((count) => count > 1).length,
  };
}

export interface GrowthReport {
  pointers: Pointer[];
  /** Census entries whose bytes did not hold what the reader said. Zero on every sample here. */
  refusals: string[];
  /** Pointers naming flash outside the container, which a relocation must not rewrite. */
  outward: Pointer[];
  /** Targets more than one pointer names, largest first. Editing one changes several meanings. */
  shared: { target: number; holders: string[] }[];
  implied: Implied[];
  /** Implied structures whose owner `IMPLIED_BY` has no reason for. Empty, and a test says so. */
  unexplained: string[];
  restamps: Restamp[];
  /**
   * Where the container states its picture bank begins, minus the two byte bias, or undefined on
   * arch 12 (Harmony One), which names the bank nowhere at all. Section 62.
   */
  bankStart: number | undefined;
  /**
   * The cost of making room on the first byte of content, above the end marker. The ceiling: every
   * pointer in the container names something above it, bar base slot 2's two outward ones.
   */
  atContent: InsertionCost;
  /** The cost at the bottom of the picture bank, which is the cheapest place a config can grow. */
  atBank: InsertionCost | undefined;
  /** The cost just above the end of everything named, which is where an append would go. */
  atEnd: InsertionCost;
}

export function growthReport(c: Container): GrowthReport {
  const refusals: string[] = [];
  const found = pointers(c, refusals);
  const implied = impliedPositions(c);

  const byTarget = new Map<number, string[]>();
  for (const pointer of found) {
    if (pointer.lands === undefined) continue;
    const already = byTarget.get(pointer.target);
    if (already === undefined) byTarget.set(pointer.target, [pointer.holder]);
    else already.push(pointer.holder);
  }
  const shared = [...byTarget]
    .filter(([, holders]) => holders.length > 1)
    .map(([target, holders]) => ({ target, holders }))
    .sort((a, b) => b.holders.length - a.holders.length);

  // The lowest picture, whether or not a program addresses it. Taken from the claims rather than
  // from `implied`, because with opcode 3 read every picture in every bank but two is addressed, so
  // asking `implied` for the bank's bottom answers "there is no bank" on eighteen of nineteen
  // containers.
  const bank = claims(c)
    .filter((claim) => claim.owner === 'picture-bank')
    .reduce<number | undefined>(
      (low, claim) => (low === undefined ? claim.start : Math.min(low, claim.start)),
      undefined,
    );

  return {
    pointers: found,
    refusals,
    outward: found.filter((p) => p.lands === undefined),
    shared,
    implied,
    unexplained: [...new Set(implied.filter((i) => i.because === '').map((i) => i.owner))].sort(),
    restamps: restamps(c),
    bankStart: pictureBankStart(c),
    atContent: insertionCost(c, c.markerOffset + 4, { pointers: found, implied }),
    atBank: bank === undefined ? undefined : insertionCost(c, bank, { pointers: found, implied }),
    atEnd: insertionCost(c, c.blob.length - TRAILER_LENGTH, { pointers: found, implied }),
  };
}

/** Whether the container's own trailer agrees with its bytes, which every claim here assumes. */
export function trailerAgrees(c: Container): boolean {
  return trailerChecksum(c.blob) === c.trailerChecksum;
}
