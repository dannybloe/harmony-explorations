/**
 * The container's frame, laid out from nothing: `todo-compile-650.md` 10.1.
 *
 * Until this existed a configuration could only be made by editing one Logitech had compiled,
 * because everything that is the container's own arithmetic rather than content came with the file:
 * the cookies, the format word, the section table and every address in it, the end address, the
 * build timestamp and the trailer checksum. This module produces all of those from the content
 * alone, for arch 14 (Harmony 600, 650 and 700) and, since `todo-compile-one.md` 6.1, for arch 12
 * (Harmony One), and it is a **linker**: the content arrives as pieces of bytes whose address fields
 * are symbolic, the frame decides where every piece goes, and then writes each address field from
 * where its target ended up.
 *
 * **One linker, and what differs per architecture is data**, `FRAME_ARCHITECTURES`. The Harmony One's
 * container is the same format with two more pointer slots, a NULL at raw slot 8 and a section of its
 * own at raw slot 18, `INSERTED_SLOTS`; a format word stating 22 instead of 20; another flash base;
 * and a base slot 17 that is the touch hit map rather than the picture bank's two byte bias. Each of
 * those is a measurement on the One's own files, said where it is used, and none of them is a reason
 * for a second copy of the code below: the round trip in `test/frame.test.ts` is what says the one
 * implementation lays out both.
 *
 * **Why pieces and not one run of bytes per base slot.** That was the obvious shape and the files
 * refute it. A section's pointer names its table, and the table's contents are anywhere: on the
 * Harmony 600's configuration base slot 0's name tree begins 210690 bytes into the container, and
 * nearly everything below it is screen programs, mode pages, action lists, state records, timers,
 * value maps and infrared blocks, structures of eight slots interleaved in the compiler's own
 * emission order. Section 36 found the first instance, base slot 5's group arrays in base slot 4's
 * gap, and it turns out to be the rule rather than the exception. So the unit the frame moves is a
 * piece, and a slot is only the piece its table entry names.
 *
 * **Where a piece goes is decided in four regions.** Their order is the one every arch 14 and every
 * Harmony One container in the lab has; which parts of it the remote demands is mostly open, and said
 * per region.
 *
 * 1. The key table, immediately after the end marker. It is base slot 6's first mode record,
 *    section 52, and both parsers here read it at that offset, which is why `relocationFloor` will
 *    not insert in front of it, section 172. Section 311 reads the firmware reaching mode 0
 *    through base slot 6, like any other mode, and none of the four arch 14 application images read
 *    loads the key table's offset `0x5F` as a literal, section 328; a container with it elsewhere
 *    has not been written.
 * 2. The body: every piece the caller lists, in the caller's order. Every piece in it is reached
 *    through an address, so the order is carried rather than derived; reproducing Logitech's
 *    emission order is a composer's question.
 * 3. The tables, base slot 0 to 17 in slot order, each as the pieces parked in front of it followed
 *    by the table. The tables ascend with the slot number in every container `parse` has read, its
 *    `sections_ascend` check. **The order is the architecture's raw slot order**, which on the
 *    Harmony One puts its own raw slot 18 between base slot 16 and base slot 17, where its table
 *    entry sits; it is two zero bytes on all 36 distinct One containers in the lab, Logitech's, ours
 *    and the safe mode one alike, and nothing is parked in front of it on any of them. **What Logitech
 *    parks in front of a table is the same on all thirteen arch 14 compiles and on all nineteen
 *    distinct Harmony One compiles**, which `test/frame.test.ts` measures: base slot 5's groups in
 *    front of base slot 5's table, base slot 7's glyphs and sets in front of base slot 7's, the mode
 *    pages' tagged lists in front of base slot 9's, some action lists in front of base slot 10's and
 *    the parameter groups in front of base slot 15's. **That is Logitech's habit and not the remote's demand**: the
 *    configurations this project composed onto the Harmony 650 park infrared blocks in front of base
 *    slot 5 and base slot 9 lists in front of base slot 9, and the 650 ran them, sections 285 and 291.
 *    The ones this project wrote to the spare Harmony One park the same two kinds the same way, and
 *    the television answered the device of section 242, whose infrared blocks sit in front of base
 *    slot 5. So the caller says what goes where, and the frame decides nothing about it. `placer.ts`
 *    is the caller that decides it from the content the way Logitech's compiler does, section 328.
 * 4. The picture bank, immediately after base slot 17's two bytes. On arch 14 base slot 17 names the
 *    bank two bytes in front of it, section 62, which is where this codec's readers find the bank;
 *    every picture of the thirteen compiles is also reached by a screen program's address, section
 *    146, and the four arch 14 application images read fetch base slot 17 only as the touch hit map,
 *    never offset to the bank, section 328. So nothing found on the remote needs the bank there; no
 *    container with it elsewhere has been written. Every later picture is the byte after the one before.
 *    **On the Harmony One base slot 17 is the touch hit map's table**, a count and that many page
 *    addresses, and names the bank nowhere, section 62, so the codec finds the One's bank by search,
 *    `pictureBank`. The bank still starts on the byte after base slot 17's table on all 35 distinct One
 *    containers in the lab that have one, which is the same region in the same place with a table of
 *    its own length in front of it rather than two bytes. The hit map's pages and areas are not in
 *    this region: they are pieces like any other, wherever the caller puts them.
 *
 * Then the trailer: the checksum over every whole sixteen bit word below it, then the end marker.
 *
 * **Two sections are generated rather than given**, base slot 1 and base slot 3. Base slot 1 is the
 * architecture record, section 182: the architecture twice, the skin, the constant `0x0D` and three
 * zeros. The skin is an argument and **the content does not determine it**: two Harmony 600
 * compiles here carry 73 and 71, the Harmony 600 EMEA and the Harmony 600, and which of a regional
 * pair a compile states is open, section 131. Base slot 3 is the build timestamp, eleven bytes framed
 * by `0xADDF` and `0xEFBF` plus three zeros, section 84, stamped from the time the caller gives
 * through `clockRecordFields`, the one encoder there is. **Base slot 13's first seven records state
 * the same moment**, section 130, and they are the caller's content; the frame refuses a layout where
 * the two disagree. That is a consistency rule and not a hardware one: the remote's clock is seeded
 * from base slot 13, section 310, so a stale base slot 13 is a wrong clock whatever base slot 3 says,
 * and a save stamps both, `saveEdits`.
 *
 * **Everything else in a piece is carried.** Implied positions, the ones no field states, are inside
 * a piece by construction: a piece is cut only where an address lands, so whatever follows a
 * structure without being named, a mode page list's second copy or base slot 15's light band
 * fields, travels with the piece before it. The frame cannot misplace them, and it cannot place them
 * either; that is the composer's job.
 *
 * Read only towards hardware, like everything in this package. The result is bytes in memory.
 */
import {
  ARCH_RECORD_CONSTANT,
  ARCH_RECORD_LENGTH,
  BASE_SLOT_COUNT,
  CLOCK_COOKIE,
  CLOCK_END,
  CLOCK_FIELD_COUNT,
  CLOCK_FIELDS_OFFSET,
  CLOCK_RECORD_SLOT,
  CLOCK_SECTION_LENGTH,
  Container,
  END_MARKER_LENGTH,
  FAMILIES,
  FLASH_BASE_ALIGNMENT,
  INSERTED_SLOTS,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  TRAILER_CHECKSUM_OFFSET,
  archSlot,
  baseSlot,
  clockRecordFields,
  parse,
  trailerChecksum,
} from './gspm.ts';
import { RAW_SLOT_PREFIX, claims } from './coverage.ts';
import { pointers } from './growth.ts';
import { relocationFloor } from './relocate.ts';
import { stateRecords } from './sections.ts';
import { PICTURE_BANK_BIAS, PICTURE_BANK_UNADDRESSED, pictureBankStart } from './screen.ts';
import { TOUCH_MAP_SLOT } from './tables.ts';

/** A refusal, named so a caller can tell a bad layout from a bug. */
export class LayoutError extends Error {}

/** What the frame needs to know about one architecture beyond the slot alignment `gspm.ts` states. */
export interface FrameArchitecture {
  /** Where a user configuration is written in external flash, and so the default `flashBase`. */
  flashBase: number;
  /**
   * The raw slots this architecture inserts into the base layout that hold a section rather than
   * NULL. `INSERTED_SLOTS` says where the insertions are and not which of them are NULL, so this is
   * the half it cannot say.
   */
  insertedSections: readonly number[];
}

/**
 * The architectures the frame lays out, each measured on its own files.
 *
 * * **Arch 14 (Harmony 600, 650 and 700)**: written at external flash `0x030000`, sections 281 and
 *   302, and no insertions.
 * * **Arch 12 (Harmony One)**: written at external flash `0x040000`, the configuration region's start
 *   on that remote, sections 88 and 222, and the base on every One user configuration in the lab. It
 *   inserts two raw slots, `INSERTED_SLOTS`: raw slot 8 is NULL on every One container, and raw slot
 *   18 holds a section on every one, two zero bytes, which the One's firmware seeks twice, section 38.
 *
 * Arch 8 (Harmony 880 and 885), 9 (Harmony 525) and 10 (Harmony 890) are other containers of the same
 * format, and nothing here has measured what laying one out would take, so they are refused.
 */
export const FRAME_ARCHITECTURES: Readonly<Record<number, FrameArchitecture>> = {
  14: { flashBase: 0x030000, insertedSections: [] },
  12: { flashBase: 0x040000, insertedSections: [18] },
};

/** The frame data for `architecture`, or a refusal that names what is laid out. */
export function frameArchitecture(architecture: number): FrameArchitecture & { pointerCount: number } {
  const profile = FRAME_ARCHITECTURES[architecture];
  const inserted = INSERTED_SLOTS[architecture];
  if (profile === undefined || inserted === undefined) {
    const known = Object.keys(FRAME_ARCHITECTURES).map((one) => `arch ${one}`).join(' and ');
    throw new LayoutError(`only ${known} are laid out, not arch ${architecture}`);
  }
  // The slot count is the base layout plus the insertions, the same arithmetic `SLOT_MAPS` is built
  // with, rather than a second statement of 20 and 22.
  return { ...profile, pointerCount: BASE_SLOT_COUNT + inserted.length };
}

/**
 * The format word for `pointerCount` slots: its byte at `0x09` is the pointer count, section 194, and
 * the rest is zero, `0x1400` on arch 14 and `0x1600` on the Harmony One. Written as a `u32`, so its top
 * byte is base slot 0's spare byte, which is zero too.
 */
export function formatWord(pointerCount: number): number {
  return pointerCount << 8;
}

/** Base slot 1, the architecture record: the slot the frame writes itself. */
export const ARCHITECTURE_SLOT = 1;
/** Base slots 18 and 19 are NULL in every container of arch 8, 9, 12 and 14. */
export const FIRST_NULL_SLOT = 18;

/**
 * What one raw slot of `architecture` is: a base slot, a section the architecture inserts, or NULL,
 * which is base slots 18 and 19 everywhere and an inserted slot that holds nothing, the Harmony One's
 * raw slot 8. One statement of it, so `layOutContainer` and `takeApart` cannot read the table two ways.
 */
type RawSlot = { kind: 'base'; base: number } | { kind: 'inserted' } | { kind: 'null' };

function rawSlots(architecture: number): RawSlot[] {
  const { pointerCount, insertedSections } = frameArchitecture(architecture);
  return Array.from({ length: pointerCount }, (_unused, raw): RawSlot => {
    const base = baseSlot(architecture, raw);
    if (base !== undefined) return base >= FIRST_NULL_SLOT ? { kind: 'null' } : { kind: 'base', base };
    return insertedSections.includes(raw) ? { kind: 'inserted' } : { kind: 'null' };
  });
}
/** The highest address a three byte field can state. */
const ADDRESS_CEILING = 0xffffff;
/** An address field is three bytes everywhere in this format. */
const ADDRESS_WIDTH = 3;

/**
 * A run of content bytes and the address fields inside it.
 *
 * The bytes at a field's position are overwritten by the frame, so what a caller leaves there does
 * not matter; `takeApart` zeroes them, which is what makes its round trip a test of the frame rather
 * than of a copy.
 */
export interface ContainerPiece {
  bytes: Uint8Array;
  refs: PieceRef[];
  /** What the piece is, in `coverage.ts`'s owner vocabulary where it came from a container. */
  owner?: string;
}

/**
 * One address field: `at` bytes into its piece, naming `offset` bytes into another piece, or naming
 * an absolute `address` the container does not own. The second form is base slot 2's log area,
 * which names flash above the container, section 2 of the census in `growth.ts`.
 */
export type PieceRef =
  | { at: number; to: ContainerPiece; offset: number }
  | { at: number; address: number };

/**
 * A table of a count and three byte addresses, the shape of base slots 5, 7, 9, 10, 11, 12, 14 and 15,
 * whose count is one or two bytes, of base slot 6, whose count is three, and on the Harmony One of base
 * slot 17, the touch hit map, whose count is one: the same widths on arch 12 (Harmony One) and arch 14
 * (Harmony 600, 650 and 700), read off their compiles. Each entry names its piece's start, or `offsets[k]`
 * bytes into it. Moved here out of `families/four-slot/empty.ts` with `todo-compile-one.md` 7.1.3, since
 * both families build a configuration from nothing through it and nothing in it is either's.
 */
export function countedTable(
  countWidth: number, targets: readonly ContainerPiece[], owner: string, offsets: readonly number[] = [],
): ContainerPiece {
  if (targets.length >= 1 << (8 * countWidth)) throw new LayoutError(`${targets.length} entries do not fit a ${countWidth} byte count`);
  const bytes = new Uint8Array(countWidth + ADDRESS_WIDTH * targets.length);
  for (let k = 0; k < countWidth; k += 1) bytes[k] = (targets.length >> (8 * k)) & 0xff;
  return {
    bytes, owner,
    refs: targets.map((to, k): PieceRef => ({ at: countWidth + ADDRESS_WIDTH * k, to, offset: offsets[k] ?? 0 })),
  };
}

/** One base slot: what Logitech parks in front of its table, then the table. */
export interface SectionPlacement {
  before: ContainerPiece[];
  /** The table entry names `head[0]`. Empty on the two slots the frame generates. */
  head: ContainerPiece[];
}

export interface ContainerLayout {
  /** 14 or 12, the architectures `FRAME_ARCHITECTURES` holds. */
  architecture: number;
  /** The skin byte of the architecture record, which names the model. Section 131. */
  skin: number;
  /**
   * When the configuration is built, `YYYY-MM-DDTHH:MM:SS`, or the record's seven field bytes as
   * stored for a stamp the reader refuses. Every compile in the lab reads now: the one that did not, a
   * Harmony 650 sync stamped on 1 October with a stored day of 0, is how the 1st is stored, since the
   * day counts from 0 and the weekday from Sunday, `docs/findings.md` section 322. This said it held
   * 30 September's weekday and that six others stamped on 1 October stored day 1; those six were made
   * on 2 October. The bytes path stays for a damaged stamp, which a layout must still carry.
   */
  builtAt: string | Uint8Array;
  /** Defaults to the architecture's own, `FRAME_ARCHITECTURES`. */
  flashBase?: number;
  /** Mode 0's record, which is the key table. */
  keyTable: ContainerPiece;
  body: ContainerPiece[];
  /** Indexed by base slot, `BASE_SLOT_COUNT` long. 1 and 3 are generated; 18 and 19 must be absent. */
  sections: (SectionPlacement | undefined)[];
  /**
   * The sections an architecture has and the base layout does not, by **raw** slot: on the Harmony
   * One raw slot 18, and absent or empty on arch 14. Kept apart from `sections` so that a base slot
   * number means the same section on every architecture, which is the point of the base layout.
   */
  inserted?: Readonly<Record<number, SectionPlacement>>;
  pictures: ContainerPiece[];
}

export interface LaidOut {
  bytes: Uint8Array;
  /** The result parsed, so a caller does not parse it twice. */
  container: Container;
  /** Where each piece landed, as a blob offset, for a caller that wants to address one. */
  offsetOf: (piece: ContainerPiece) => number | undefined;
}

/** `GSPM` and its end marker `PTYY`, with the marker after the table, `LWJL`. */
const FAMILY = FAMILIES.find((one) => one.magic === 'GSPM')!;

/** The architecture record for `skin`: section 182's seven bytes, of which the frame owns all. */
export function architectureRecord(architecture: number, skin: number): Uint8Array {
  if (!Number.isInteger(skin) || skin < 0 || skin > 0xff) {
    throw new LayoutError(`a skin is one byte, not ${skin}`);
  }
  // Byte 3 is the version word's high byte, `0x0D` on every container built from 2009 onward, and
  // the last three are zero on every arch 14 and Harmony One container: the record is seven bytes
  // long and states four. Section 182 and `reference/config-format/header-records.md`'s "Slot 1". **The one container here it
  // does not lay out is the Harmony One's safe mode configuration**, stamped 2007, whose byte 3 is
  // `0x0C`: rebuilt, it differs in that byte and in the trailer checksum it moves, and nowhere else.
  // It is the firmware's own fallback and not something a composer makes, so the constant stays.
  const out = new Uint8Array(ARCH_RECORD_LENGTH);
  out.set([architecture, architecture, skin, ARCH_RECORD_CONSTANT]);
  return out;
}

/** The seven field bytes for a stamp: through `clockRecordFields` for a time, as given otherwise. */
function stampFields(builtAt: string | Uint8Array): Uint8Array {
  if (typeof builtAt !== 'string') {
    if (builtAt.length !== CLOCK_FIELD_COUNT) {
      throw new LayoutError(`a build timestamp is ${CLOCK_FIELD_COUNT} field bytes, not ${builtAt.length}`);
    }
    return builtAt;
  }
  const fields = clockRecordFields(builtAt);
  if (fields === undefined) {
    throw new LayoutError(`${builtAt} is not a time base slot 3 can hold`);
  }
  return fields;
}

/** Base slot 3 for a stamp: cookie, seven fields, terminator, three zeros. Section 84. */
export function buildTimestampSection(builtAt: string | Uint8Array): Uint8Array {
  const out = new Uint8Array(CLOCK_SECTION_LENGTH);
  out.set(CLOCK_COOKIE, 0);
  out.set(stampFields(builtAt), CLOCK_FIELDS_OFFSET);
  out.set(CLOCK_END, CLOCK_FIELDS_OFFSET + CLOCK_FIELD_COUNT);
  return out;
}

/**
 * Lay out a whole arch 14 or Harmony One container from its content.
 *
 * Refuses rather than repairs: an architecture `FRAME_ARCHITECTURES` does not hold, a missing table,
 * an inserted section the architecture does not have or lacks, a piece listed twice, a field outside
 * its piece, an address naming a piece that is not in the layout, on arch 14 a base slot 17 that is
 * not exactly the bank's two byte bias, and a base slot 13 clock that disagrees with the stamp. The
 * result is parsed before it is returned and every container check `parse` makes has to pass, except
 * base slot 3's own when the stamp is given as field bytes the reader refuses, which no compile here
 * needs.
 */
export function layOutContainer(layout: ContainerLayout): LaidOut {
  const profile = frameArchitecture(layout.architecture);
  const slots = rawSlots(layout.architecture);
  const base = layout.flashBase ?? profile.flashBase;
  if (base % FLASH_BASE_ALIGNMENT !== 0) {
    // 4 KiB, the alignment `parse` checks a recovered base against, and not the 64 KiB erase block.
    throw new LayoutError(`a container starts on a 4 KiB boundary, and 0x${base.toString(16)} is not one`);
  }
  if (layout.sections.length !== BASE_SLOT_COUNT) {
    throw new LayoutError(`a layout states ${BASE_SLOT_COUNT} base slots, not ${layout.sections.length}`);
  }

  // The two generated sections, as pieces like any other so the section table can name them.
  const fields = stampFields(layout.builtAt);
  const generated = new Map<number, ContainerPiece>([
    [ARCHITECTURE_SLOT, {
      bytes: architectureRecord(layout.architecture, layout.skin), refs: [], owner: 'slot-1-arch' }],
    [CLOCK_RECORD_SLOT, { bytes: buildTimestampSection(fields), refs: [], owner: 'slot-3-clock' }],
  ]);

  // An inserted section the architecture does not have would otherwise be dropped without a word.
  for (const raw of Object.keys(layout.inserted ?? {}).map(Number)) {
    if (slots[raw]?.kind !== 'inserted') {
      throw new LayoutError(`arch ${layout.architecture} has no section of its own at raw slot ${raw}`);
    }
  }

  // The order, region by region, and which piece each table entry names. The table is walked in the
  // architecture's raw slot order, so an inserted section lands between its neighbours as its table
  // entry does, and `heads` is indexed by raw slot like the table itself.
  const order: ContainerPiece[] = [layout.keyTable, ...layout.body];
  const heads: (ContainerPiece | undefined)[] = [];
  for (const [raw, kind] of slots.entries()) {
    if (kind.kind === 'null') {
      // Base slots 18 and 19 are NULL on arch 8, 9, 12 and 14, and `findMarker` relies on the last
      // being NULL, section 20; the Harmony One's raw slot 8 is NULL on every One container, and its
      // firmware never seeks it, section 38.
      const base = baseSlot(layout.architecture, raw);
      if (base !== undefined && layout.sections[base] !== undefined) {
        throw new LayoutError(`base slot ${base} is NULL on arch ${layout.architecture}`);
      }
      heads.push(undefined);
      continue;
    }
    if (kind.kind === 'inserted') {
      // The Harmony One's raw slot 18: every One container states it, so a layout without it is one
      // nothing here has seen the remote run.
      const placed = layout.inserted?.[raw];
      if (placed === undefined || placed.head.length === 0) {
        throw new LayoutError(`raw slot ${raw} of arch ${layout.architecture} has no table`);
      }
      order.push(...placed.before, ...placed.head);
      heads.push(placed.head[0]);
      continue;
    }
    const slot = kind.base;
    const placed = layout.sections[slot];
    const own = generated.get(slot);
    if (own !== undefined) {
      if (placed !== undefined && placed.head.length > 0) {
        throw new LayoutError(`base slot ${slot} is the frame's own, so its head is not given`);
      }
      order.push(...(placed?.before ?? []), own);
      heads.push(own);
      continue;
    }
    // Every arch 14 compile states all eighteen, and the firmware seeks raw slots 3 to 17 on the
    // Harmony 700, section 35; every Harmony One container states them too, and its firmware seeks
    // every raw slot from 2 to 19 but 8, section 38. A NULL among them is a configuration nothing
    // here has seen boot.
    if (placed === undefined || placed.head.length === 0) {
      throw new LayoutError(`base slot ${slot} has no table`);
    }
    // On arch 14 base slot 17 is the bank's two byte bias and nothing else. On the Harmony One it is
    // the touch hit map's table, whose length is its own count, so there is no length to demand:
    // `PICTURE_BANK_UNADDRESSED` is the statement that the One names its bank nowhere.
    if (slot === TOUCH_MAP_SLOT && !PICTURE_BANK_UNADDRESSED.has(layout.architecture)) {
      const length = placed.head.reduce((sum, piece) => sum + piece.bytes.length, 0);
      if (length !== PICTURE_BANK_BIAS) {
        throw new LayoutError(
          `base slot ${TOUCH_MAP_SLOT} is the ${PICTURE_BANK_BIAS} bytes in front of the picture bank, `
          + `not ${length}: the codec finds the bank by its address, section 62`);
      }
    }
    order.push(...placed.before, ...placed.head);
    heads.push(placed.head[0]);
  }
  order.push(...layout.pictures);

  // Offsets. The content starts after the header, the table and the end marker of the table, and the
  // table is the architecture's own length: 20 items on arch 14, 22 on the Harmony One.
  const tableEnd = SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * profile.pointerCount;
  const offsets = new Map<ContainerPiece, number>();
  let at = tableEnd + END_MARKER_LENGTH;
  for (const piece of order) {
    if (offsets.has(piece)) throw new LayoutError(`a piece${label(piece)} is listed twice`);
    offsets.set(piece, at);
    at += piece.bytes.length;
  }
  const length = at + TRAILER_CHECKSUM_OFFSET;
  const addressOf = (piece: ContainerPiece, offset: number): number => {
    const start = offsets.get(piece);
    if (start === undefined) {
      throw new LayoutError(`an address names a piece${label(piece)} that is not in the layout`);
    }
    if (offset < 0 || offset > piece.bytes.length) {
      throw new LayoutError(`an address names ${offset} bytes into a piece${label(piece)} of ${piece.bytes.length}`);
    }
    const address = base + start + offset;
    if (address > ADDRESS_CEILING) throw new LayoutError(`0x${address.toString(16)} is past a three byte address`);
    return address;
  };

  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  // The header: cookie, `end_addr`, the format word. `end_addr` names the end marker itself, the
  // flash base plus the length less four, on every arch 14 and Harmony One container here, which is
  // `parse`'s `end_addr_points_at_end_marker`. growth.ts's `restamps`. Both architectures are `GSPM`.
  bytes.set(asciiBytes(FAMILY.magic), 0);
  view.setUint32(4, base + length - END_MARKER_LENGTH, true);
  view.setUint32(8, formatWord(profile.pointerCount), true);
  // The section table, `{ u8 spare; u24 address }`, spare zero in every item of every container, and
  // a NULL item all four bytes zero.
  heads.forEach((head, raw) => {
    const item = SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * raw;
    bytes[item] = 0;
    if (head !== undefined) writeU24(bytes, item + 1, addressOf(head, 0));
  });
  bytes.set(asciiBytes(FAMILY.headerMarker), tableEnd);

  // The content, then every address field written from where its target landed.
  for (const piece of order) {
    const start = offsets.get(piece)!;
    bytes.set(piece.bytes, start);
    for (const ref of piece.refs) {
      if (ref.at < 0 || ref.at + ADDRESS_WIDTH > piece.bytes.length) {
        throw new LayoutError(`an address field at ${ref.at} is outside its piece${label(piece)}`);
      }
      const address = 'to' in ref ? addressOf(ref.to, ref.offset) : ref.address;
      writeU24(bytes, start + ref.at, address);
    }
  }

  // The trailer. The checksum covers every whole sixteen bit word below it, so on an odd length the
  // last byte before it is left out, section 41; the end marker after it is covered by nothing.
  bytes.set(asciiBytes(FAMILY.endMarker), length - END_MARKER_LENGTH);
  view.setUint16(length - TRAILER_CHECKSUM_OFFSET, trailerChecksum(bytes), true);

  const container = parse(bytes);
  checkLaidOut(container, base, fields, typeof layout.builtAt === 'string');
  return { bytes, container, offsetOf: (piece) => offsets.get(piece) };
}

/**
 * What the frame demands of its own result: every `parse` check, the base it was linked for, and
 * the two clocks agreeing.
 */
function checkLaidOut(c: Container, base: number, fields: Uint8Array, readable: boolean): void {
  if (c.flashBase !== base) {
    throw new LayoutError(`the result reads as based at 0x${c.flashBase.toString(16)}, not 0x${base.toString(16)}`);
  }
  const failed = Object.entries(c.checks)
    .filter(([name, ok]) => !ok && (readable || name !== 'slot3_is_a_timestamp'))
    .map(([name]) => name);
  if (failed.length > 0) throw new LayoutError(`the result fails ${failed.join(', ')}`);
  // Base slot 13's records 0 to 6 hold the same seven fields, each record's `first`, section 130.
  const records = stateRecords(c);
  if (records === undefined || records.length < CLOCK_FIELD_COUNT) {
    throw new LayoutError(`base slot 13 has to hold the ${CLOCK_FIELD_COUNT} clock records`);
  }
  for (let index = 0; index < CLOCK_FIELD_COUNT; index += 1) {
    const stated = records[index]!.first;
    if (stated !== fields[index]) {
      throw new LayoutError(
        `base slot 13's clock record ${index} states ${stated} where the build timestamp states `
        + `${fields[index]}: stamp both from the same moment, section 310`);
    }
  }
}

/**
 * Take a laid out arch 14 or Harmony One container apart into the pieces `layOutContainer` puts back.
 *
 * Every address field the census in `growth.ts` knows becomes a reference and its bytes are zeroed,
 * the two generated sections are dropped, and the header, the section table and the trailer are
 * not carried at all. So laying the result out again reproduces the container only if the frame
 * computes every one of those bytes itself, which is the measurement `test/frame.test.ts` makes.
 *
 * A piece is cut where an address lands on the start of a structure `coverage.ts` claims, and at the
 * region boundaries; an address landing inside a structure, an infrared record's pointer seven bytes
 * in or a string shared from another program's text, is a reference with an offset. A section's
 * table is the run of its own slot's pieces from where the pointer lands; what follows it up to the
 * next table is that next slot's `before`.
 */
export function takeApart(c: Container): ContainerLayout {
  const architecture = c.architecture;
  if (architecture === undefined || FRAME_ARCHITECTURES[architecture] === undefined || c.family !== FAMILY) {
    throw new LayoutError(
      `only a GSPM container of ${Object.keys(FRAME_ARCHITECTURES).map((one) => `arch ${one}`).join(' or ')} `
      + `is taken apart, not arch ${architecture}`);
  }
  const profile = frameArchitecture(architecture);
  if (c.pointerCount !== profile.pointerCount) {
    throw new LayoutError(
      `arch ${architecture} has ${profile.pointerCount} pointer slots and this container ${c.pointerCount}`);
  }
  const slots = rawSlots(architecture);
  // Where each section starts, by raw slot, and the raw slots that hold one, in table order.
  const starts: (number | undefined)[] = [];
  const real: number[] = [];
  for (const [raw, kind] of slots.entries()) {
    const section = c.sections[raw]!;
    if (kind.kind === 'null') {
      if (!section.isNull) {
        throw new LayoutError(`raw slot ${raw} is NULL on arch ${architecture}, and this container states one`);
      }
      starts.push(undefined);
      continue;
    }
    const off = c.blobOffsetOf(section.address);
    if (section.isNull || off === undefined) {
      throw new LayoutError(`raw slot ${raw} is NULL or outside the container`);
    }
    const previous = real.length === 0 ? undefined : starts[real[real.length - 1]!]!;
    if (previous !== undefined && off <= previous) throw new LayoutError(`raw slot ${raw} does not ascend`);
    starts.push(off);
    real.push(raw);
  }
  /** Where the section after raw slot `raw` starts, which is where `raw`'s region ends. */
  const nextStart = (raw: number, otherwise: number): number => {
    const after = real[real.indexOf(raw) + 1];
    return after === undefined ? otherwise : starts[after]!;
  };
  const claimed = claims(c);
  const trailer = c.blob.length - TRAILER_CHECKSUM_OFFSET;
  // The picture bank. Stated on arch 14, two bytes behind base slot 17's address. The Harmony One
  // states it nowhere, so its start is where the codec's own search put the first picture, which is
  // the reader every other Harmony One consumer uses; a container with no picture at all has an empty
  // bank in front of the trailer.
  const bank = PICTURE_BANK_UNADDRESSED.has(architecture)
    ? Math.min(trailer, ...claimed.filter((one) => one.owner === 'picture-bank').map((one) => one.start))
    : pictureBankStart(c);
  if (bank === undefined) throw new LayoutError('the picture bank has no stated start');
  const keyStart = c.markerOffset + END_MARKER_LENGTH;
  const keyEnd = relocationFloor(c);
  const archRaw = archSlot(architecture, ARCHITECTURE_SLOT);
  const clockRaw = archSlot(architecture, CLOCK_RECORD_SLOT);
  const generated = new Map<number, [number, number]>([
    [archRaw, [starts[archRaw]!, nextStart(archRaw, bank)]],
    [clockRaw, [starts[clockRaw]!, nextStart(clockRaw, bank)]],
  ]);

  const refusals: string[] = [];
  const census = pointers(c, refusals);
  if (refusals.length > 0) throw new LayoutError(`the census disagrees with its readers: ${refusals[0]}`);
  // The table's own items are the frame's; every other field is content's. One field can be read by
  // two readers, so a field is kept once and has to say the same thing both times.
  const tableEnd = c.markerOffset;
  const fieldsAt = new Map<number, (typeof census)[number]>();
  for (const p of census) {
    if (p.at < tableEnd) {
      if ((p.at - SECTION_TABLE_OFFSET) % SECTION_ITEM_SIZE !== 1) {
        throw new LayoutError(`${p.holder} at ${p.at} is in the header and is not a table item`);
      }
      continue;
    }
    const seen = fieldsAt.get(p.at);
    if (seen !== undefined && seen.target !== p.target) {
      throw new LayoutError(`the field at ${p.at} is read as two addresses`);
    }
    fieldsAt.set(p.at, p);
  }

  // Where pieces are cut: the region boundaries, and every landing on a claimed structure's start.
  const owners = new Map<number, string>();
  for (const claim of claimed) {
    const seen = owners.get(claim.start);
    if (seen === undefined) owners.set(claim.start, claim.owner);
  }
  const cuts = new Set<number>([keyStart, keyEnd, ...real.map((raw) => starts[raw]!), bank, trailer]);
  for (const [, generatedRange] of generated) cuts.add(generatedRange[1]);
  for (const p of fieldsAt.values()) {
    if (p.lands !== undefined && p.lands >= keyEnd && p.lands < trailer && owners.has(p.lands)) {
      cuts.add(p.lands);
    }
  }
  const sorted = [...cuts].sort((a, b) => a - b);
  const pieceStarts: number[] = [];
  const pieces: ContainerPiece[] = [];
  for (let i = 0; i + 1 < sorted.length; i += 1) {
    const from = sorted[i]!;
    const to = sorted[i + 1]!;
    if (from < keyStart || from >= trailer) continue;
    const piece: ContainerPiece = { bytes: c.blob.slice(from, to), refs: [] };
    const owner = owners.get(from);
    if (owner !== undefined) piece.owner = owner;
    pieceStarts.push(from);
    pieces.push(piece);
  }
  const containing = (offset: number): number => {
    let low = 0;
    let high = pieceStarts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (pieceStarts[mid]! <= offset) low = mid;
      else high = mid - 1;
    }
    return low;
  };
  const inGenerated = (offset: number): boolean =>
    [...generated.values()].some(([from, to]) => offset >= from && offset < to);

  for (const p of fieldsAt.values()) {
    if (p.at < keyStart || p.at + ADDRESS_WIDTH > trailer || inGenerated(p.at)) {
      throw new LayoutError(`${p.holder} at ${p.at} is outside the content`);
    }
    const index = containing(p.at);
    const piece = pieces[index]!;
    const at = p.at - pieceStarts[index]!;
    if (at + ADDRESS_WIDTH > piece.bytes.length) {
      throw new LayoutError(`${p.holder} at ${p.at} straddles two pieces`);
    }
    piece.bytes.fill(0, at, at + ADDRESS_WIDTH);
    if (p.lands === undefined) {
      piece.refs.push({ at, address: p.target });
      continue;
    }
    if (p.lands < keyStart || inGenerated(p.lands)) {
      throw new LayoutError(`${p.holder} at ${p.at} names the frame's own bytes`);
    }
    const target = containing(p.lands);
    piece.refs.push({ at, to: pieces[target]!, offset: p.lands - pieceStarts[target]! });
  }

  // The regions.
  const within = (from: number, to: number): ContainerPiece[] =>
    pieces.filter((_, i) => pieceStarts[i]! >= from && pieceStarts[i]! < to);
  const keyPieces = within(keyStart, keyEnd);
  if (keyPieces.length !== 1) throw new LayoutError('the key table is not one piece');
  const sections: (SectionPlacement | undefined)[] = Array.from({ length: BASE_SLOT_COUNT }, () => undefined);
  const inserted: Record<number, SectionPlacement> = {};
  let before: ContainerPiece[] = [];
  for (const raw of real) {
    const kind = slots[raw]!;
    const placeAt = (placement: SectionPlacement): void => {
      if (kind.kind === 'base') sections[kind.base] = placement;
      else inserted[raw] = placement;
    };
    if (generated.has(raw)) {
      placeAt({ before, head: [] });
      before = [];
      continue;
    }
    const region = within(starts[raw]!, nextStart(raw, bank));
    // The table is the run of this slot's own pieces from where the pointer lands. Whatever follows
    // belongs in front of the next table, which is where section 36 found base slot 5's groups. An
    // inserted slot's own pieces carry its raw number, `tableOwner`, since it has no base number.
    const own = (piece: ContainerPiece): boolean => (kind.kind === 'base'
      ? slotOf(piece.owner) === kind.base
      : piece.owner?.startsWith(`${RAW_SLOT_PREFIX}-${raw}-`) === true);
    let split = 1;
    while (split < region.length && own(region[split]!)) split += 1;
    placeAt({ before, head: region.slice(0, split) });
    before = region.slice(split);
  }
  if (before.length > 0) throw new LayoutError('something sits between base slot 17 and the picture bank');

  return {
    architecture,
    skin: c.blob[starts[archRaw]! + 2]!,
    builtAt: c.builtAt ?? c.blob.slice(
      starts[clockRaw]! + CLOCK_FIELDS_OFFSET,
      starts[clockRaw]! + CLOCK_FIELDS_OFFSET + CLOCK_FIELD_COUNT),
    flashBase: c.flashBase,
    keyTable: keyPieces[0]!,
    body: within(keyEnd, starts[real[0]!]!),
    sections,
    ...(Object.keys(inserted).length > 0 ? { inserted } : {}),
    pictures: within(bank, trailer),
  };
}

/** The base slot an owner name belongs to, `slot-<n>-...`, or undefined for anything else. */
export function slotOf(owner: string | undefined): number | undefined {
  const match = owner === undefined ? null : /^slot-(\d+)-/.exec(owner);
  return match === null ? undefined : Number(match[1]);
}

function label(piece: ContainerPiece): string {
  return piece.owner === undefined ? '' : ` (${piece.owner})`;
}

function asciiBytes(text: string): Uint8Array {
  return Uint8Array.from(text, (ch) => ch.charCodeAt(0));
}

function writeU24(bytes: Uint8Array, at: number, value: number): void {
  bytes[at] = value & 0xff;
  bytes[at + 1] = (value >>> 8) & 0xff;
  bytes[at + 2] = (value >>> 16) & 0xff;
}

