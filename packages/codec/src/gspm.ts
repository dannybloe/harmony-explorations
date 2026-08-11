/**
 * The Harmony config container: `GSPM` and its relatives.
 *
 * A port of `src/harmony/gspm.py`, and for now a deliberately close one: the two are held
 * equivalent by golden vectors, so a difference in behaviour has to show up as a diff rather
 * than as a judgement call. The format is specified in `docs/config-format.md`.
 *
 * It is one container with a per architecture four letter cookie rather than one format per
 * architecture, which is why this is written against the shape and not against a model table:
 *
 *   * The flash base address the blob was linked for is recovered from a **content anchor**, the
 *     single slot 3 clock record, and not from the header's `endAddr` field. See
 *     `recoverFlashBase`: the obvious `base = endAddr - offsetOfEndMarker` reading is right on 23
 *     of the 24 containers here and silently wrong on the 24th.
 *   * The pointer table length differs per architecture and is not stated in the header, but it
 *     follows from where the marker after the table sits:
 *     `count = (markerOffset - 0x0B) / 4`.
 *   * That marker is itself found from the data: it is the first four uppercase letters preceded
 *     by zero padding. Which four letters they are is a per architecture fact and not derivable,
 *     so it is recorded per family and asserted rather than computed.
 *   * The architecture is stated by the config itself, in section slot 1, so it does not have to
 *     be inferred from the cookie. It cannot be: `GSPM` covers both arch 12 and arch 14.
 *
 * Accepts a bare blob or a raw flash dump with the blob somewhere inside it.
 */
import { ascii, bytesOf, indexOf, matchesAt, u16, u24, u32, u8, uint } from './bytes.ts';

export class GspmError extends Error {}

/** One container cookie and the end marker that goes with it. */
export interface Family {
  readonly magic: string;
  readonly endMarker: string;
  readonly architectures: string;
  /** The observed marker after the pointer table. */
  readonly headerMarker: string;
  /** Whether a key table starts at that marker. */
  readonly keyTableAtMarker: boolean;
}

/**
 * Verified against samples. The cookies also appear in concordance's per architecture table,
 * where arch 7 (the older 6xx) is listed as `BMBM`; no arch 7 sample has been seen here, so its
 * end marker is unknown and it is deliberately absent. Archs 2 and 3 use a two byte cookie and
 * are a different layout entirely.
 */
export const FAMILIES: readonly Family[] = [
  {
    magic: 'GSPM',
    endMarker: 'PTYY',
    architectures: '12 (One), 14 (600, 700)',
    headerMarker: 'LWJL',
    keyTableAtMarker: true,
  },
  {
    magic: 'TPTP',
    endMarker: 'DKDK',
    architectures: '8 (720, 785, 88x)',
    headerMarker: 'WLWL',
    keyTableAtMarker: true,
  },
  {
    magic: 'AHCM',
    endMarker: 'MCHA',
    architectures: '9 (36x, 51x, 52x, 55x)',
    headerMarker: 'CMAH',
    keyTableAtMarker: false,
  },
];

/**
 * The section table's own layout. An item is four bytes: one spare byte, then a three byte little
 * endian flash pointer. So the table begins at 0x0B and the pointers land on 0x0C, 0x10, 0x14 and
 * so on, which is what this file read directly while treating 0x0B as header.
 *
 * That cost one section. The last item's pointer occupies the three bytes immediately before the
 * trailer marker, and the old derivation subtracted exactly those three bytes as unexplained
 * padding, so every container was parsed one slot short. It went unnoticed because the final
 * section is NULL in all thirteen samples.
 *
 * The reading is closed by arithmetic rather than by inspection: 0x0B + 4 * count lands exactly on
 * the measured marker offset in every sample of all four architectures, which the old reading
 * could only match by subtracting three bytes it could not account for. See
 * `docs/findings.md` section 20.
 */
export const SECTION_TABLE_OFFSET = 0x0b;
export const SECTION_ITEM_SIZE = 4;
export const POINTER_SIZE = 3;
/** Where item 0's pointer lands. */
export const HEADER_PTR_OFFSET = SECTION_TABLE_OFFSET + 1;
export const MARKER_SEARCH_LIMIT = 0x200;
/** Arch 9 and 14 carry 20, arch 8 carries 21, arch 12 carries 22. */
export const KNOWN_POINTER_COUNTS: readonly number[] = [20, 21, 22];

/**
 * The trailer checksum's seed, written as two literals by the boot validator on all three images.
 * The checksum is a sixteen bit XOR of the container's little endian words from its first byte up
 * to the stored value, which sits six bytes from the end. `docs/findings.md` section 41.
 */
export const TRAILER_CHECKSUM_SEED = 0x4321;
/** From the end of the container, ahead of the four byte marker. */
export const TRAILER_CHECKSUM_OFFSET = 6;

/**
 * Recompute a container's trailer checksum from its bytes.
 *
 * An odd trailing byte is not folded in, because the firmware divides the byte count by two and
 * counts words. No container in the corpus has an odd body, so that is the firmware's behaviour
 * rather than a tested one.
 */
export function trailerChecksum(blob: Uint8Array): number {
  let accumulator = TRAILER_CHECKSUM_SEED;
  const end = blob.length - TRAILER_CHECKSUM_OFFSET;
  for (let offset = 0; offset + 1 < end; offset += 2) {
    accumulator ^= blob[offset]! | (blob[offset + 1]! << 8);
  }
  return accumulator;
}

/**
 * Section slot 0 is a single 0xFEED framed block. Stored little endian, so the cookie reads
 * `ed fe` in a hex dump.
 */
export const FRAME_COOKIE = new Uint8Array([0xed, 0xfe]);
export const FRAME_END = new Uint8Array([0xef, 0xbe]);
/** The terminator sits outside the frame's stated length, so a frame occupies `length + 2`. */
export const FRAME_END_LENGTH = 2;
/** An empty frame: cookie, a three byte zero length, then the terminator five bytes in. */
export const EMPTY_FRAME_LENGTH = 5;

/** Section slot 1 is a seven byte record that states the architecture twice over. */
export const ARCH_RECORD_SLOT = 1;
export const ARCH_RECORD_LENGTH = 7;
/** The version word is a `u16` at `+2`, so a shorter record does not carry one. Section 79. */
export const ARCH_VERSION_WORD_END = 4;

/**
 * Section slot 3 is an eleven byte framed record holding a timestamp. Its cookie and terminator are
 * their own pair, nothing to do with slot 0's, and unlike `0xFEED` this pair occurs exactly once in
 * every one of the thirteen samples, so it identifies the record without needing a length to
 * validate it.
 *
 * ```
 * +0x00  u16  0xADDF
 * +0x02  u8   second, minute, hour, day of month, day of week, month (0 = January)
 * +0x08  u8   year, offset from 2000
 * +0x09  u16  0xEFBF
 * ```
 *
 * The field assignment is not a reading, it is a search result: of the 48 permutations of the four
 * date bytes times two month bases times seven weekday offsets, exactly one is consistent with
 * every sample. See `docs/findings.md` section 21.
 */
export const CLOCK_RECORD_SLOT = 3;
export const CLOCK_COOKIE = new Uint8Array([0xdf, 0xad]);
export const CLOCK_END = new Uint8Array([0xbf, 0xef]);
export const CLOCK_RECORD_LENGTH = 11;
/**
 * The section is three bytes longer than the record, and those three are zero in all nineteen
 * containers of the corpus. The record closes at `CLOCK_END`, so the tail is the section's own and
 * not part of the framing. `docs/findings.md` section 84.
 */
export const CLOCK_SECTION_LENGTH = 14;
/**
 * Day of week is stored as days since 1 January 2000 modulo 7, which is why 0 means Saturday: that
 * date was one. The same epoch explains the year offset, so two fields agree on one anchor.
 */
export const CLOCK_EPOCH_MS = Date.UTC(2000, 0, 1);
export const MS_PER_DAY = 86400000;

/**
 * The pointer table is one table across architectures, with per architecture insertions rather
 * than a per architecture meaning. Arch 9 and arch 14 carry the base layout of 20 slots, whose last
 * two, base 18 and base 19, are NULL in every sample. Arch 8 adds a NULL at slot 8, so everything
 * from there on shifts up by one and it carries 21. Arch 12 adds that same NULL plus a real section
 * at slot 18, so it carries 22 and the two trailing NULLs land at 20 and 21.
 *
 * Worth having because the project decodes arch 14, where every config read passes through one
 * SPI primitive, while the popular remote is the arch 12 Harmony One. A section labelled on one
 * transfers to the other through this table rather than through a second investigation.
 */
export const INSERTED_SLOTS: Readonly<Record<number, readonly number[]>> = {
  9: [],
  14: [],
  8: [8],
  12: [8, 18],
};

function insertions(architecture: number): readonly number[] {
  const inserted = INSERTED_SLOTS[architecture];
  if (inserted === undefined) {
    throw new GspmError(`slot alignment not established for architecture ${architecture}`);
  }
  return inserted;
}

/**
 * Map a slot on `architecture` to the same section's slot in the 20 slot base layout.
 *
 * Returns undefined for a slot that architecture inserted and the base layout does not have, and
 * throws for an architecture whose insertions have not been established.
 */
export function baseSlot(architecture: number, slot: number): number | undefined {
  const inserted = insertions(architecture);
  if (inserted.includes(slot)) return undefined;
  return slot - inserted.filter((i) => i < slot).length;
}

/** Inverse of `baseSlot`: where the base layout's slot sits on `architecture`. */
export function archSlot(architecture: number, base: number): number {
  let slot = base;
  for (const i of [...insertions(architecture)].sort((a, b) => a - b)) {
    if (i <= slot) slot += 1;
  }
  return slot;
}

/**
 * An event code is an event type in the top two bits plus a scan code in the rest. NOT a matrix
 * address with 0x80 as an "is a key" flag; see `docs/findings.md` section 17 for the correction
 * and its evidence. The old reading split the arch 14 table into 108 "matrix" and 54 "non matrix"
 * codes, which is really 54 press plus 54 repeat against 54 release.
 */
export const EVENT_MASK = 0xc0;
export const SCAN_MASK = 0x3f;
export const EVENT_NONE = 0x00;
export const EVENT_RELEASE = 0x40;
export const EVENT_PRESS = 0x80;
export const EVENT_REPEAT = 0xc0;

export const EVENT_NAMES: Readonly<Record<number, string>> = {
  [EVENT_NONE]: 'none',
  [EVENT_RELEASE]: 'release',
  [EVENT_PRESS]: 'press',
  [EVENT_REPEAT]: 'repeat',
};

/** One LWJL entry. */
export class KeyRecord {
  readonly indexInTable: number;
  readonly eventCode: number;
  readonly index: number;
  readonly flags: number;

  constructor(indexInTable: number, eventCode: number, index: number, flags: number) {
    this.indexInTable = indexInTable;
    this.eventCode = eventCode;
    this.index = index;
    this.flags = flags;
  }

  /** `EVENT_PRESS`, `EVENT_RELEASE`, `EVENT_REPEAT`, or `EVENT_NONE`. */
  get eventType(): number {
    return this.eventCode & EVENT_MASK;
  }

  get eventName(): string {
    return EVENT_NAMES[this.eventType] as string;
  }

  /**
   * The keypad scanner's own linear index, or a virtual event's number. On arch 14 these run 1
   * to 54 within the scanner's range of 1 to 56, one of the three agreements that established
   * this reading.
   */
  get scanCode(): number {
    return this.eventCode & SCAN_MASK;
  }

  /** False for the handful of codes that carry no event bits at all. */
  get isKeypad(): boolean {
    return this.eventType !== EVENT_NONE;
  }
}

/** Base slot 10 is a table of addresses of action lists. `docs/findings.md` section 17. */
export const ACTION_LIST_TABLE_SLOT = 10;
/**
 * Base slot 8, the key press bindings, whose section opens with one ordinary action list.
 * `docs/findings.md` sections 27 and 83.
 */
export const BINDING_SLOT = 8;
export const INSTRUCTION_LENGTH = 3;

/**
 * One action list instruction: a 16 bit operand and an opcode byte. Opcode meanings are not
 * established. The inventory differs by architecture, which is itself a finding: arch 14 leans on
 * opcodes that do not appear in the arch 9 sample at all.
 */
export interface Instruction {
  readonly operand: number;
  readonly opcode: number;
}

export class Section {
  readonly slot: number;
  readonly address: number;
  /**
   * The item's leading byte, the one the three byte pointer does not use. Zero in every section
   * of every sample, so its meaning is unestablished rather than known to be padding. Parsed and
   * checked rather than skipped, because reading the item as a four byte pointer instead would
   * turn a nonzero value here into a silently wrong address.
   */
  readonly spare: number;

  constructor(slot: number, address: number, spare: number = 0) {
    this.slot = slot;
    this.address = address;
    this.spare = spare;
  }

  get isNull(): boolean {
    return this.address === 0;
  }
}

export class Container {
  /** Offset of the cookie within whatever was parsed: an EZHex file, or a flash dump. */
  readonly blobOffset: number;
  readonly length: number;
  readonly flashBase: number;
  readonly endAddr: number;
  readonly formatRaw: number;
  readonly pointerCount: number;
  readonly markerOffset: number;
  readonly marker: string;
  readonly family: Family;
  readonly trailerChecksum: number;
  /** The container itself, cookie through end marker. */
  readonly blob: Uint8Array;
  readonly sections: readonly Section[];
  /** Stated by section slot 1, see `ARCH_RECORD_SLOT`. */
  architecture: number | undefined = undefined;
  /** The u16 beside it, meaning not established. */
  versionWord: number | undefined = undefined;
  /** Slot 0's 0xFEED frame, undefined when absent. */
  frameLength: number | undefined = undefined;
  /** Slot 3's timestamp as `YYYY-MM-DDTHH:MM:SS`, see `CLOCK_RECORD_SLOT`. */
  builtAt: string | undefined = undefined;
  keys: KeyRecord[] = [];
  checks: Record<string, boolean> = {};

  constructor(fields: {
    blobOffset: number;
    length: number;
    flashBase: number;
    endAddr: number;
    formatRaw: number;
    pointerCount: number;
    markerOffset: number;
    marker: string;
    family: Family;
    trailerChecksum: number;
    blob: Uint8Array;
    sections: readonly Section[];
  }) {
    this.blobOffset = fields.blobOffset;
    this.length = fields.length;
    this.flashBase = fields.flashBase;
    this.endAddr = fields.endAddr;
    this.formatRaw = fields.formatRaw;
    this.pointerCount = fields.pointerCount;
    this.markerOffset = fields.markerOffset;
    this.marker = fields.marker;
    this.family = fields.family;
    this.trailerChecksum = fields.trailerChecksum;
    this.blob = fields.blob;
    this.sections = fields.sections;
  }

  get hasKeyTable(): boolean {
    return this.family.keyTableAtMarker;
  }

  /** Nibble BCD: 0x1600 is 1.6, 0x1400 is 1.4. */
  get formatVersion(): string {
    return `${this.formatRaw >>> 12}.${(this.formatRaw >>> 8) & 0xf}`;
  }

  get allChecksPass(): boolean {
    return Object.values(this.checks).every((ok) => ok);
  }

  /** Convert an absolute flash address to an offset within the container blob. */
  blobOffsetOf(address: number): number | undefined {
    if (address === 0) return undefined;
    return address - this.flashBase;
  }

  /**
   * Convert an absolute flash address to an offset within the file that was parsed.
   *
   * Distinct from `blobOffsetOf` by `blobOffset`, which is non zero whenever the container sits
   * inside something larger: an EZHex file with its XML header, or a flash dump. Conflating the
   * two silently shifts every section by the header length and produces a plausible looking
   * wrong answer rather than an error, which has already cost time here.
   */
  fileOffset(address: number): number | undefined {
    const off = this.blobOffsetOf(address);
    return off === undefined ? undefined : this.blobOffset + off;
  }

  /**
   * Bytes from this section's start to the next non NULL one, or to the end marker.
   *
   * The header does not state section lengths, so they come from the layout: the non NULL
   * pointers ascend with the slot number in every sample, which is what makes this well defined.
   * NULL slots have no length.
   */
  sectionLength(slot: number): number | undefined {
    const section = this.sections[slot];
    if (section === undefined || section.isNull) return undefined;
    const following = this.sections.slice(slot + 1).filter((s) => !s.isNull);
    const next = following[0];
    return (next === undefined ? this.endAddr : next.address) - section.address;
  }

  /**
   * Read a section as a count followed by that many three byte flash pointers.
   *
   * Six sections per architecture are arrays of this shape, and they are recognised rather than
   * tabulated: the count is a `u8` or a `u16` and is accepted only when `width + 3 * count`
   * accounts for the section exactly. That test is strict enough to pick out the same six slots
   * in all nine config samples and no others.
   *
   * Returns undefined when the section is not this shape, or when there is no blob to read.
   */
  pointerArray(slot: number): number[] | undefined {
    return this.pointerArrayAt(slot)?.values;
  }

  /**
   * The same read, with the bytes it occupies.
   *
   * `pointerArray` is this with the extent dropped. One implementation rather than two, because
   * the byte accounting of `coverage` needs exactly the width this loop settles on, and a second
   * copy of the width rule would be free to disagree with the first. The same reason there is one
   * opcode table.
   */
  pointerArrayAt(
    slot: number,
  ): { values: number[]; start: number; length: number; width: number } | undefined {
    const length = this.sectionLength(slot);
    const section = this.sections[slot];
    if (length === undefined || section === undefined || this.blob.length === 0) return undefined;
    const off = this.blobOffsetOf(section.address);
    if (off === undefined) return undefined;
    for (const width of [1, 2]) {
      if (off + width > this.blob.length) continue;
      const count = uint(this.blob, off, width);
      if (count !== 0 && width + 3 * count === length) {
        const base = off + width;
        if (base + 3 * count > this.blob.length) continue;
        const values: number[] = [];
        for (let k = 0; k < count; k += 1) values.push(u24(this.blob, base + 3 * k));
        return { values, start: off, length: width + 3 * count, width };
      }
    }
    return undefined;
  }

  /** Which slots read as pointer arrays. A per architecture fingerprint in practice. */
  get pointerArraySlots(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.sections.length; i += 1) {
      if (this.pointerArray(i) !== undefined) out.push(i);
    }
    return out;
  }

  /**
   * The action list at an absolute flash address: a count, then that many instructions.
   *
   * ```
   * +0x00  u8   count
   *        { u16 operand; u8 opcode }[count]
   * ```
   *
   * Returns undefined when the address is outside the container. Nothing else is validated,
   * because there is nothing to validate against: what makes this reading believable is that
   * consecutive entries of the table sit `1 + 3 * count` apart, which `actionListPacking` checks
   * in aggregate rather than per list.
   */
  actionList(address: number): Instruction[] | undefined {
    const off = this.blobOffsetOf(address);
    if (off === undefined || this.blob.length === 0 || off < 0 || off >= this.blob.length) {
      return undefined;
    }
    const count = u8(this.blob, off);
    const end = off + 1 + INSTRUCTION_LENGTH * count;
    if (end > this.blob.length) return undefined;
    const out: Instruction[] = [];
    for (let k = 0; k < count; k += 1) {
      out.push({
        operand: u16(this.blob, off + 1 + 3 * k),
        opcode: u8(this.blob, off + 3 + 3 * k),
      });
    }
    return out;
  }

  /** Every action list the table at base slot 10 addresses, in table order. */
  actionLists(): Instruction[][] | undefined {
    if (this.architecture === undefined) return undefined;
    let slot: number;
    try {
      slot = archSlot(this.architecture, ACTION_LIST_TABLE_SLOT);
    } catch (error) {
      if (error instanceof GspmError) return undefined;
      throw error;
    }
    const table = slot < this.sections.length ? this.pointerArray(slot) : undefined;
    if (table === undefined) return undefined;
    const lists = table.map((a) => this.actionList(a));
    if (lists.some((l) => l === undefined)) return undefined;
    return lists as Instruction[][];
  }

  /**
   * How many consecutive table entries sit exactly `1 + 3 * count` apart, and of how many.
   *
   * This is the check that carries the whole reading: the addresses come from the pointer table
   * and the counts come from the lists themselves, so agreement between them is two unrelated
   * parts of the file telling the same story. Across the corpus it holds for all but exactly four
   * pairs per config, and those four are the boundaries between the runs the lists are packed
   * into.
   */
  actionListPacking(): [number, number] {
    if (this.architecture === undefined) throw new GspmError('architecture not stated');
    const table = this.pointerArray(archSlot(this.architecture, ACTION_LIST_TABLE_SLOT));
    if (table === undefined) throw new GspmError('no action list table to measure');
    let fit = 0;
    for (let k = 0; k < table.length - 1; k += 1) {
      const off = this.blobOffsetOf(table[k] as number);
      if (off === undefined) continue;
      const count = u8(this.blob, off);
      if ((table[k + 1] as number) - (table[k] as number) === 1 + INSTRUCTION_LENGTH * count) {
        fit += 1;
      }
    }
    return [fit, Math.max(0, table.length - 1)];
  }
}

/** Locate the earliest known container cookie in `data`. */
export function findMagic(data: Uint8Array): { family: Family; offset: number } {
  let best: { family: Family; offset: number } | undefined;
  for (const family of FAMILIES) {
    const off = indexOf(data, bytesOf(family.magic));
    if (off < 0) continue;
    if (best === undefined || off < best.offset) best = { family, offset: off };
  }
  if (best === undefined) {
    throw new GspmError(
      `no known container magic found (looked for ${FAMILIES.map((f) => f.magic).join(', ')})`,
    );
  }
  return best;
}

/**
 * Offset of the four letter marker that follows the pointer table.
 *
 * Derived rather than looked up: it is the first run of four uppercase letters that is preceded
 * by three zero bytes.
 *
 * Those three bytes are not padding, which is what this comment used to imply. They are the final
 * section's pointer, and it is NULL in every sample, so the heuristic works for a reason rather
 * than by luck. It would stop working on a container whose last section is populated, and nothing
 * in the format says one cannot be.
 */
export function findMarker(blob: Uint8Array): number {
  const limit = Math.min(blob.length - 4, MARKER_SEARCH_LIMIT);
  for (let off = HEADER_PTR_OFFSET + 4; off < limit; off += 1) {
    if (blob[off - 3] !== 0 || blob[off - 2] !== 0 || blob[off - 1] !== 0) continue;
    let allUpper = true;
    for (let i = 0; i < 4; i += 1) {
      const c = blob[off + i] as number;
      if (c < 0x41 || c > 0x5a) {
        allUpper = false;
        break;
      }
    }
    if (allUpper) return off;
  }
  throw new GspmError('no four letter marker found after the pointer table');
}

/**
 * Length of the 0xFEED frame at `off`, or undefined if there is not one there.
 *
 * ```
 * +0x00  u16     0xFEED
 * +0x02  u24     length, counted from the cookie and excluding the terminator
 * +0x05  ...     payload, starting with 0xA7 then "Root"
 * +len   u16     0xBEEF
 * ```
 *
 * So the frame occupies `length + 2` bytes, and that lands exactly on the next section in all
 * twelve samples. The length is validated by requiring the terminator where it says, which is
 * what distinguishes a real frame from the `ed fe` byte pair that turns up by chance roughly once
 * per 64 KiB: the One's 1.6 MB config holds 31 of those pairs and only one of them is a frame.
 *
 * **The length is 24 bits and not 16.** This read a `u16` with the byte at `+0x04` described as
 * "zero in every sample", which it is, because no name tree in the corpus reaches 64 KiB. Logitech
 * 's own client reads three bytes here, `docs/host-client.md`, and that is client sourced and
 * unconfirmed. It is adopted anyway because the two readings cannot disagree on any sample this
 * project has, `test/gspm.test.ts` says so, and the wider one is the one that survives a config
 * the corpus does not contain. Same family as the font header's spare byte, which was the first
 * glyph code, section 78: when a byte next to a length is always zero, suspect the length.
 */
export function frameLength(blob: Uint8Array, off: number): number | undefined {
  if (!matchesAt(blob, off, FRAME_COOKIE)) return undefined;
  const length = u24(blob, off + 2);
  if (length === 0) {
    // Degenerate empty frame: cookie, a zero length, terminator.
    return matchesAt(blob, off + EMPTY_FRAME_LENGTH, FRAME_END) ? 0 : undefined;
  }
  if (!matchesAt(blob, off + length, FRAME_END)) return undefined;
  return length;
}

/** Parse the first Harmony config container found in `data`. */
/**
 * The timestamp in the slot 3 record at `off`, as `YYYY-MM-DDTHH:MM:SS`, or undefined if there is
 * not one there.
 *
 * A string rather than a `Date`, and formatted by hand rather than through `toISOString`, because
 * the value carries no timezone: it is whatever clock wrote it. Going through `Date` would attach
 * one and then the golden vectors would depend on where the tests run.
 *
 * Undefined rather than an error for anything that does not fit, including a stored day of week
 * that disagrees with the date. That check is the reason to trust the reading at all, so it stays
 * in the parser rather than only in a test.
 */
export function clockRecord(blob: Uint8Array, off: number): string | undefined {
  if (!matchesAt(blob, off, CLOCK_COOKIE)) return undefined;
  if (!matchesAt(blob, off + 9, CLOCK_END)) return undefined;
  const second = u8(blob, off + 2);
  const minute = u8(blob, off + 3);
  const hour = u8(blob, off + 4);
  const day = u8(blob, off + 5);
  const dow = u8(blob, off + 6);
  const month = u8(blob, off + 7);
  const year = 2000 + u8(blob, off + 8);
  if (month > 11 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return undefined;
  const utc = Date.UTC(year, month, day, hour, minute, second);
  const back = new Date(utc);
  // Rejects a day that its month does not have, which Date.UTC would roll over instead.
  if (back.getUTCMonth() !== month || back.getUTCDate() !== day) return undefined;
  const days = Math.floor((Date.UTC(year, month, day) - CLOCK_EPOCH_MS) / MS_PER_DAY);
  if (((days % 7) + 7) % 7 !== dow) return undefined;
  const p = (n: number, w = 2): string => String(n).padStart(w, '0');
  return `${p(year, 4)}-${p(month + 1)}-${p(day)}T${p(hour)}:${p(minute)}:${p(second)}`;
}

/**
 * Every offset in `blob` where a clock record validates.
 *
 * Exactly one in all 24 containers this project holds, which is what makes it usable as an
 * anchor. `clockRecord` requires the stored day of week to agree with the stored date, so a hit
 * is a closure and not a two byte cookie match: the pair turns up by chance roughly once per
 * 32 KiB and none of those chance hits validates.
 */
export function findClockRecords(blob: Uint8Array): number[] {
  const out: number[] = [];
  for (let off = 0; off + 11 <= blob.length; off += 1) {
    if (!matchesAt(blob, off, CLOCK_COOKIE)) continue;
    if (clockRecord(blob, off) !== undefined) out.push(off);
  }
  return out;
}

/**
 * A container is written at the start of a flash block, so its base is a multiple of this. Every
 * base established here is: 0x002000, 0x018000, 0x01E000, 0x020000, 0x030000 and 0x040000. It is
 * what makes the clock anchor land on one answer instead of a dozen.
 */
export const FLASH_BASE_ALIGNMENT = 0x1000;

/**
 * The flash address the container was linked for, anchored on the clock record.
 *
 * **This used to be `endAddr - (offsetOfEndMarker - offsetOfMagic)`, and that reading is
 * circular.** The base came out of the marker's position, and the check meant to validate it
 * asked whether `endAddr` lands on the marker, which it then always did. A check that cannot fail
 * is not a check, and this one hid a real error for as long as it existed: `H890-Bedroom-2` has
 * 864 bytes between the end its header declares and its end marker, so the subtraction returned a
 * base 864 too low and every pointer resolved 864 bytes late. That file is a damaged read rather than
 * a generator error, section 122, and `0x030000` is the base its repaired container verifies under.
 * A wrong base does not fail, it
 * reads the neighbouring bytes.
 *
 * So the base comes from the data. Each non-NULL pointer is absolute and exactly one targets the
 * clock record, so `address - offsetOfClockRecord` is a candidate base per pointer, filtered by
 * block alignment and by every other pointer resolving inside the blob. One candidate survives in
 * all 24 containers: 23 where the base was already established, spanning five architectures and
 * six bases, plus the one where the two readings disagree and this one agrees with the
 * independent fact that its trailer checksum fails. `docs/findings.md` section 117.
 *
 * Undefined when the anchor is unavailable or ambiguous, so the caller falls back rather than
 * this guessing. Nothing in the corpus reaches that path.
 */
export function recoverFlashBase(blob: Uint8Array, addresses: number[]): number | undefined {
  const clocks = findClockRecords(blob);
  if (clocks.length !== 1) return undefined;
  const clockOff = clocks[0] as number;
  const candidates = new Set<number>();
  for (const address of addresses) {
    if (!address) continue;
    const base = address - clockOff;
    if (base < 0 || base % FLASH_BASE_ALIGNMENT !== 0) continue;
    if (addresses.every((a) => !a || (a - base >= 0 && a - base < blob.length))) {
      candidates.add(base);
    }
  }
  return candidates.size === 1 ? [...candidates][0] : undefined;
}

/** The seven fields of the slot 3 record sit here, after the `0xADDF` cookie. */
export const CLOCK_FIELDS_OFFSET = 2;
export const CLOCK_FIELD_COUNT = 7;
/** The year is a `u8` offset from 2000, so this is the whole range the record can express. */
export const CLOCK_FIRST_YEAR = 2000;
export const CLOCK_LAST_YEAR = CLOCK_FIRST_YEAR + 0xff;
/** `YYYY-MM-DDTHH:MM:SS`, which is what `clockRecord` returns and what this takes back. */
const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

/**
 * The seven field bytes of a slot 3 record for `builtAt`, or undefined if it cannot hold it.
 *
 * **The exact inverse of `clockRecord`, and it lives beside it on purpose.** Two callers need this,
 * the emitter and the edit layer, and before they shared it they each derived the day of week
 * themselves with a different spelling of the same epoch. That is the shape of defect this project
 * bans for the opcode table: two copies of one derivation, both plausible, diverging quietly. So
 * there is one encoder, one decoder, and a test that walks the corpus asserting they are inverses.
 *
 * The day of week is **computed** rather than taken from the caller, because `clockRecord` refuses a
 * record whose weekday disagrees with its date and that refusal is the reason to trust the whole
 * reading, section 21. So nothing here can produce a record our own reader would reject.
 *
 * Undefined rather than an error, mirroring the decoder, so each caller can raise the error its own
 * layer promises. `edit.ts` turns it into an `EditError`.
 */
export function clockRecordFields(builtAt: string): Uint8Array | undefined {
  const parts = TIMESTAMP.exec(builtAt);
  if (parts === null) return undefined;
  const [year, month, day, hour, minute, second] = parts.slice(1).map(Number) as [
    number, number, number, number, number, number,
  ];
  if (year < CLOCK_FIRST_YEAR || year > CLOCK_LAST_YEAR) return undefined;
  if (month < 1 || month > 12 || day < 1) return undefined;
  if (hour > 23 || minute > 59 || second > 59) return undefined;
  const utc = new Date(Date.UTC(year, month - 1, day));
  // Rejects a day its month does not have, which Date.UTC rolls over instead.
  if (utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) return undefined;
  const days = Math.floor((utc.getTime() - CLOCK_EPOCH_MS) / MS_PER_DAY);
  const weekday = ((days % 7) + 7) % 7;
  return new Uint8Array([
    second, minute, hour, day, weekday, month - 1, year - CLOCK_FIRST_YEAR,
  ]);
}

export function parse(data: Uint8Array): Container {
  const { family, offset: start } = findMagic(data);
  const endMarker = indexOf(data, bytesOf(family.endMarker), start);
  if (endMarker < 0) {
    throw new GspmError(`no ${family.endMarker} end marker found after ${family.magic}`);
  }

  const blob = data.subarray(start, endMarker + 4);
  if (blob.length < 0x68) {
    throw new GspmError(`blob too short to hold a header: ${blob.length} bytes`);
  }

  const endAddr = u32(blob, 4);
  const formatRaw = u32(blob, 8);

  const markerOffset = findMarker(blob);
  const pointerCount = Math.floor((markerOffset - SECTION_TABLE_OFFSET) / SECTION_ITEM_SIZE);
  if (pointerCount < 1) throw new GspmError(`implausible pointer count ${pointerCount}`);

  // Three byte pointers, read as three bytes. Reading four worked on the whole corpus only
  // because the next item's spare byte is always zero; one nonzero byte would have added
  // 0x1000000 to a section address and produced a plausible looking wrong answer.
  const sections: Section[] = [];
  for (let i = 0; i < pointerCount; i += 1) {
    const item = SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * i;
    sections.push(new Section(i, u24(blob, item + 1), u8(blob, item)));
  }

  // The pointers are absolute and so are readable before the base is known, which is what lets
  // the base be anchored on one of them rather than on the marker's position. The marker
  // subtraction stays as the fallback, and it is the reading that `end_addr_points_at_end_marker`
  // can only test once it is no longer the reading that produced the base. See
  // `recoverFlashBase`, and `docs/findings.md` section 117.
  const flashBase =
    recoverFlashBase(blob, sections.map((s) => s.address)) ?? endAddr - (endMarker - start);

  const container = new Container({
    blobOffset: start,
    length: blob.length,
    flashBase,
    endAddr,
    formatRaw,
    pointerCount,
    markerOffset,
    marker: ascii(blob, markerOffset, 4),
    family,
    trailerChecksum: u16(blob, blob.length - 6),
    blob,
    sections,
  });

  // Slot 0's frame and slot 1's architecture record, both read here because `parse` is the only
  // place holding the blob. Guarded rather than assumed: a container with fewer than two slots,
  // or with either slot NULL, simply leaves these undefined.
  const slot0 = sections[0]?.address ?? 0;
  if (slot0 !== 0) {
    const off = slot0 - flashBase;
    if (off >= 0 && off < blob.length) container.frameLength = frameLength(blob, off);
  }

  const archSection = sections[ARCH_RECORD_SLOT];
  if (archSection !== undefined) {
    const o = archSection.address !== 0 ? archSection.address - flashBase : -1;
    // The record is seven bytes in every generated config and three in the arch 9 safe mode
    // container, so its extent is the distance to the next pointer, like every other section's.
    // Reading a fixed seven takes the version word out of slot 2 there. Sections 36 and 79.
    const room = container.sectionLength(ARCH_RECORD_SLOT) ?? 0;
    if (o >= 0 && o + Math.min(ARCH_RECORD_LENGTH, room) <= blob.length) {
      // The architecture is stored twice. Reading it only when the two copies agree keeps a
      // coincidence from being reported as a fact.
      if (room >= 2 && u8(blob, o) === u8(blob, o + 1)) container.architecture = u8(blob, o);
      if (room >= ARCH_VERSION_WORD_END) container.versionWord = u16(blob, o + 2);
    }
  }

  const clockSection = sections[CLOCK_RECORD_SLOT];
  if (clockSection !== undefined) {
    const o = clockSection.address !== 0 ? clockSection.address - flashBase : -1;
    if (o >= 0 && o + CLOCK_RECORD_LENGTH <= blob.length) {
      container.builtAt = clockRecord(blob, o);
    }
  }

  const endOff = endAddr - flashBase;
  container.checks = {
    // A real check since the base stopped coming out of the marker's position. It asks whether the
    // end the header declares is where the end marker actually is, and it fails on
    // `H890-Bedroom-2`, whose header describes a container 864 bytes shorter than the body behind
    // it. Under the old circular reading it could not fail on any input at all.
    end_addr_points_at_end_marker: matchesAt(blob, endOff, bytesOf(family.endMarker)),
    // The table has to end exactly where the marker begins, which fails if the marker offset is
    // not congruent to the table start. This is the check that would have caught the off by one
    // had it existed: under the old derivation the table stopped three bytes short.
    section_table_ends_at_the_marker:
      SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * pointerCount === markerOffset,
    last_section_is_null: sections[sections.length - 1]?.isNull === true,
    section_spare_bytes_are_zero: sections.every((s) => s.spare === 0),
    marker_as_expected_for_family: container.marker === family.headerMarker,
    pointer_count_known: KNOWN_POINTER_COUNTS.includes(pointerCount),
    sections_within_blob: sections.every(
      (s) => s.isNull || (s.address - flashBase >= 0 && s.address - flashBase < blob.length),
    ),
    slot0_is_a_feed_frame: container.frameLength !== undefined,
    slot1_states_the_architecture: container.architecture !== undefined,
    // Passing this means the stored day of week agrees with the date, so it is a closure and not
    // just a shape match. Slots 1 and 3 sit below the first insertion at 8, so a base slot number
    // indexes them directly on all four architectures.
    slot3_is_a_timestamp: container.builtAt !== undefined,
    // The one check a writer cannot skip: the remote refuses a config whose trailer checksum does
    // not recompute, so this is the boot validator's own test run here.
    trailer_checksum_recomputes: trailerChecksum(blob) === container.trailerChecksum,
  };

  if (family.keyTableAtMarker) {
    const count = u8(blob, markerOffset + 4);
    for (let k = 0; k < count; k += 1) {
      const o = markerOffset + 5 + 4 * k;
      if (o + 4 > blob.length) break;
      container.keys.push(new KeyRecord(k, u8(blob, o), u16(blob, o + 1), u8(blob, o + 3)));
    }
  }

  return container;
}

/**
 * The container as a plain object, the same shape `tools/gspm_parse.py --json` emits.
 *
 * That shape is the golden vector format, which is why the field names are snake_case here and
 * camelCase everywhere else: the vector is generated by the Python parser and read back by both,
 * so the JSON is a contract between the two rather than this package's own idiom.
 *
 * Pointer array entries are counted rather than listed, because the largest array seen holds
 * 8037 of them and would bury everything else.
 */
export function summary(c: Container): Record<string, unknown> {
  return {
    blob_offset: c.blobOffset,
    length: c.length,
    flash_base: c.flashBase,
    end_addr: c.endAddr,
    format_version: c.formatVersion,
    format_raw: c.formatRaw,
    pointer_count: c.pointerCount,
    architecture: c.architecture ?? null,
    version_word: c.versionWord ?? null,
    frame_length: c.frameLength ?? null,
    built_at: c.builtAt ?? null,
    trailer_checksum: c.trailerChecksum,
    checks: c.checks,
    sections: c.sections.map((s) => {
      const entries = c.pointerArray(s.slot);
      return {
        slot: s.slot,
        address: s.address,
        spare: s.spare,
        blob_offset: c.blobOffsetOf(s.address) ?? null,
        file_offset: c.fileOffset(s.address) ?? null,
        length: c.sectionLength(s.slot) ?? null,
        pointer_array_entries: entries === undefined ? null : entries.length,
      };
    }),
    keys: c.keys.map((k) => ({
      i: k.indexInTable,
      code: k.eventCode,
      index: k.index,
      flags: k.flags,
      event: k.eventName,
      scan: k.scanCode,
    })),
  };
}
