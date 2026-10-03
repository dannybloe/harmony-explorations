/**
 * The container's frame, laid out from nothing: `todo-compile-650.md` 10.1.
 *
 * Until this existed a configuration could only be made by editing one Logitech had compiled,
 * because everything that is the container's own arithmetic rather than content came with the file:
 * the cookies, the format word, the section table and every address in it, the end address, the
 * build timestamp and the trailer checksum. This module produces all of those from the content
 * alone, for arch 14 (Harmony 600, 650 and 700), and it is a **linker**: the content arrives as
 * pieces of bytes whose address fields are symbolic, the frame decides where every piece goes, and
 * then writes each address field from where its target ended up.
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
 * **Where a piece goes is decided in four regions.** Their order is the one every arch 14 container
 * in the lab has; which parts of it the remote demands is mostly open, and said per region.
 *
 * 1. The key table, immediately after the end marker. It is base slot 6's first mode record,
 *    section 52, and both parsers here read it at that offset, which is why `relocationFloor` will
 *    not insert in front of it, section 172. Whether the firmware needs it there is not read here:
 *    section 311 reads the firmware reaching mode 0 through base slot 6, like any other mode.
 * 2. The body: every piece the caller lists, in the caller's order. Every piece in it is reached
 *    through an address, so the order is carried rather than derived; reproducing Logitech's
 *    emission order is a composer's question.
 * 3. The tables, base slot 0 to 17 in slot order, each as the pieces parked in front of it followed
 *    by the table. The tables ascend with the slot number in every container `parse` has read, its
 *    `sections_ascend` check. **What Logitech parks in front of a table is the same on all thirteen
 *    arch 14 compiles**, which `test/frame.test.ts` measures: base slot 5's groups in front of base
 *    slot 5's table, base slot 7's glyphs and sets in front of base slot 7's, the mode pages' tagged
 *    lists in front of base slot 9's, some action lists in front of base slot 10's and the parameter
 *    groups in front of base slot 15's. **That is Logitech's habit and not the remote's demand**: the
 *    configurations this project composed onto the Harmony 650 park infrared blocks in front of base
 *    slot 5 and base slot 9 lists in front of base slot 9, and the 650 ran them, sections 285 and 291.
 *    So the caller says what goes where, and the frame decides nothing about it.
 * 4. The picture bank, immediately after base slot 17's two bytes. On arch 14 base slot 17 names the
 *    bank two bytes in front of it, section 62, which is where this codec's readers find the bank;
 *    every picture of the thirteen compiles is also reached by a screen program's address, section
 *    146, so whether the
 *    firmware needs the bank there is open. Every later picture is the byte after the one before.
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
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  TRAILER_CHECKSUM_OFFSET,
  clockRecordFields,
  parse,
  trailerChecksum,
} from './gspm.ts';
import { claims } from './coverage.ts';
import { pointers } from './growth.ts';
import { relocationFloor } from './relocate.ts';
import { stateRecords } from './sections.ts';
import { PICTURE_BANK_BIAS, pictureBankStart } from './screen.ts';
import { TOUCH_MAP_SLOT } from './tables.ts';

/** A refusal, named so a caller can tell a bad layout from a bug. */
export class LayoutError extends Error {}

/** The one architecture this lays out. Arch 12 (Harmony One) has 22 slots and no stated bank. */
export const LAYOUT_ARCHITECTURE = 14;
/**
 * The format word for twenty slots: its byte at `0x09` is the pointer count, section 194, and the
 * rest is zero. Written as a `u32`, so its top byte is base slot 0's spare byte, which is zero too.
 */
export const LAYOUT_FORMAT_WORD = 0x1400;
/** Every arch 14 configuration is written at external flash `0x030000`, sections 281 and 302. */
export const LAYOUT_FLASH_BASE = 0x030000;
/** Base slot 1, the architecture record: the slot the frame writes itself. */
export const ARCHITECTURE_SLOT = 1;
/** Base slots 18 and 19 are NULL in every container of arch 8, 9, 12 and 14. */
export const FIRST_NULL_SLOT = 18;
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

/** One base slot: what Logitech parks in front of its table, then the table. */
export interface SectionPlacement {
  before: ContainerPiece[];
  /** The table entry names `head[0]`. Empty on the two slots the frame generates. */
  head: ContainerPiece[];
}

export interface ContainerLayout {
  /** 14, and only 14; see `LAYOUT_ARCHITECTURE`. */
  architecture: number;
  /** The skin byte of the architecture record, which names the model. Section 131. */
  skin: number;
  /**
   * When the configuration is built, `YYYY-MM-DDTHH:MM:SS`, or the record's seven field bytes as
   * stored for a stamp the reader refuses. One Logitech compile here states October with day 0 and
   * 30 September's weekday, where six others stamped on 1 October state day 1, so the cause is open,
   * `todo-compile-650.md` 1.3.1; reproducing that compile has to carry the bytes.
   */
  builtAt: string | Uint8Array;
  /** Defaults to `LAYOUT_FLASH_BASE`. */
  flashBase?: number;
  /** Mode 0's record, which is the key table. */
  keyTable: ContainerPiece;
  body: ContainerPiece[];
  /** Indexed by base slot, `BASE_SLOT_COUNT` long. 1 and 3 are generated; 18 and 19 must be absent. */
  sections: (SectionPlacement | undefined)[];
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
  // the last three are zero on every arch 14 container: the record is seven bytes long and states
  // four. Section 182 and config-format.md's "Slot 1".
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
 * Lay out a whole arch 14 container from its content.
 *
 * Refuses rather than repairs: a missing table, a piece listed twice, a field outside its piece, an
 * address naming a piece that is not in the layout, a base slot 17 that is not exactly the bank's
 * two byte bias, and a base slot 13 clock that disagrees with the stamp. The result is parsed
 * before it is returned and every container check `parse` makes has to pass, except base slot 3's
 * own when the stamp is given as field bytes the reader refuses, the day 0 stamp above.
 */
export function layOutContainer(layout: ContainerLayout): LaidOut {
  if (layout.architecture !== LAYOUT_ARCHITECTURE) {
    throw new LayoutError(`only arch ${LAYOUT_ARCHITECTURE} is laid out, not ${layout.architecture}`);
  }
  const base = layout.flashBase ?? LAYOUT_FLASH_BASE;
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

  // The order, region by region, and which piece each table entry names.
  const order: ContainerPiece[] = [layout.keyTable, ...layout.body];
  const heads: (ContainerPiece | undefined)[] = [];
  for (let slot = 0; slot < BASE_SLOT_COUNT; slot += 1) {
    const placed = layout.sections[slot];
    if (slot >= FIRST_NULL_SLOT) {
      // NULL on arch 8, 9, 12 and 14, and `findMarker` relies on the last being NULL, section 20.
      if (placed !== undefined) throw new LayoutError(`base slot ${slot} is NULL on arch 14`);
      heads.push(undefined);
      continue;
    }
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
    // Harmony 700, section 35; a NULL among them is a configuration nothing here has seen boot.
    if (placed === undefined || placed.head.length === 0) {
      throw new LayoutError(`base slot ${slot} has no table`);
    }
    if (slot === TOUCH_MAP_SLOT) {
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

  // Offsets. The content starts after the header, the table and the end marker of the table.
  const tableEnd = SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * BASE_SLOT_COUNT;
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
  // flash base plus the length less four, on every arch 14 container here. growth.ts's `restamps`.
  bytes.set(asciiBytes(FAMILY.magic), 0);
  view.setUint32(4, base + length - END_MARKER_LENGTH, true);
  view.setUint32(8, LAYOUT_FORMAT_WORD, true);
  // The section table, `{ u8 spare; u24 address }`, spare zero in every item of every container.
  heads.forEach((head, slot) => {
    const item = SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * slot;
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
 * Take a laid out arch 14 container apart into the pieces `layOutContainer` puts back.
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
  if (c.architecture !== LAYOUT_ARCHITECTURE || c.family !== FAMILY || c.pointerCount !== BASE_SLOT_COUNT) {
    throw new LayoutError('only an arch 14 container of twenty slots is taken apart');
  }
  const starts: number[] = [];
  for (let slot = 0; slot < FIRST_NULL_SLOT; slot += 1) {
    const section = c.sections[slot];
    const off = section === undefined ? undefined : c.blobOffsetOf(section.address);
    if (off === undefined) throw new LayoutError(`base slot ${slot} is NULL or outside the container`);
    if (slot > 0 && off <= starts[slot - 1]!) throw new LayoutError(`base slot ${slot} does not ascend`);
    starts.push(off);
  }
  if (c.sections.slice(FIRST_NULL_SLOT).some((section) => !section.isNull)) {
    throw new LayoutError('base slots 18 and 19 are NULL on arch 14');
  }
  const bank = pictureBankStart(c);
  if (bank === undefined) throw new LayoutError('the picture bank has no stated start');
  const keyStart = c.markerOffset + END_MARKER_LENGTH;
  const keyEnd = relocationFloor(c);
  const trailer = c.blob.length - TRAILER_CHECKSUM_OFFSET;
  const generated = new Map<number, [number, number]>([
    [ARCHITECTURE_SLOT, [starts[ARCHITECTURE_SLOT]!, starts[ARCHITECTURE_SLOT + 1]!]],
    [CLOCK_RECORD_SLOT, [starts[CLOCK_RECORD_SLOT]!, starts[CLOCK_RECORD_SLOT + 1]!]],
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
  for (const claim of claims(c)) {
    const seen = owners.get(claim.start);
    if (seen === undefined) owners.set(claim.start, claim.owner);
  }
  const cuts = new Set<number>([keyStart, keyEnd, ...starts, bank, trailer]);
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
  let before: ContainerPiece[] = [];
  for (let slot = 0; slot < FIRST_NULL_SLOT; slot += 1) {
    const end = slot + 1 < FIRST_NULL_SLOT ? starts[slot + 1]! : bank;
    if (generated.has(slot)) {
      sections[slot] = { before, head: [] };
      before = [];
      continue;
    }
    const region = within(starts[slot]!, end);
    // The table is the run of this slot's own pieces from where the pointer lands. Whatever follows
    // belongs in front of the next table, which is where section 36 found base slot 5's groups.
    let split = 1;
    while (split < region.length && slotOf(region[split]!.owner) === slot) split += 1;
    sections[slot] = { before, head: region.slice(0, split) };
    before = region.slice(split);
  }
  if (before.length > 0) throw new LayoutError('something sits between base slot 17 and the picture bank');

  return {
    architecture: c.architecture,
    skin: c.blob[starts[ARCHITECTURE_SLOT]! + 2]!,
    builtAt: c.builtAt ?? c.blob.slice(
      starts[CLOCK_RECORD_SLOT]! + CLOCK_FIELDS_OFFSET,
      starts[CLOCK_RECORD_SLOT]! + CLOCK_FIELDS_OFFSET + CLOCK_FIELD_COUNT),
    flashBase: c.flashBase,
    keyTable: keyPieces[0]!,
    body: within(keyEnd, starts[0]!),
    sections,
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

