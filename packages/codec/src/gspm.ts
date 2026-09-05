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
 *     of the 24 containers that existed when it was measured and silently wrong on the 24th.
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
 * section is NULL in all 33 containers the lab can parse, which the `last_section_is_null` check
 * is what asserts.
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
/**
 * The pointer count a header states, which is what its second word actually is.
 *
 * Section 194. The high byte's value is the number of pointer slots, exact on all 30 containers
 * here across six architectures: `0x14` is 20 on arch 9 and 14, `0x15` is 21 on arch 8, `0x16` is
 * 22 on arch 12, `0x17` is 23 on arch 10 and `0x0F` is 15 on arch 16, the Harmony 350.
 *
 * This replaces an allow-list of counts, which had two problems. It stopped at 22, so every arch 10
 * container reported as unrecognised while its own header had been stating 23 all along. And it
 * bundled two different questions: whether the file is internally consistent, and whether this
 * project has a slot layout for that length. Those are separate, and only the first is a property
 * of the file, so only the first belongs in a container check.
 */
export function statedPointerCount(formatRaw: number): number {
  return (formatRaw >>> 8) & 0xff;
}

/**
 * The shortest blob `parse` will look at, which is the header through the key count of the longest
 * pointer table the lab holds.
 *
 * It was the literal `0x68`, unnamed and with no section reference, which is 104: arch 12's header
 * through its key count and **three bytes short of an arch 10 (Harmony 890) one**, whose 23 slots
 * need 107. So the guard was smaller than a header in the corpus while its message claimed to have
 * proved there is room for one. Derived from the three constants that decide it instead, and 23 is
 * deliberately taken from the samples, and it is the longest table seen rather than the longest a
 * header could state, since a header states one byte and this bounds a read.
 */
export const LONGEST_POINTER_TABLE = 23;
export const MINIMUM_HEADER_LENGTH =
  SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * LONGEST_POINTER_TABLE + 5;

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
 * counts words.
 *
 * This said "no container in the corpus has an odd body"<!--superseded--> and called that the
 * firmware's behaviour rather than a tested one, and both halves were wrong. **19 of the 33 parseable
 * containers here have an odd extent**, spanning arch 8, 9, 10, 12 and 14, and 14 of them verify
 * their stored checksum under exactly this loop. So the behaviour is tested, by more than half the
 * corpus, and it is the comment that was untested. The direction of the error is what makes it worth
 * correcting rather than deleting: it invited a reader to fold the last byte in on the grounds that
 * nothing would catch it, and folding it in breaks fourteen containers at once.
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
/** Both cookies are four ASCII bytes, magic and end marker alike. */
export const END_MARKER_LENGTH = 4;
/** An empty frame: cookie, a three byte zero length, then the terminator five bytes in. */
export const EMPTY_FRAME_LENGTH = 5;

/** Section slot 1 is a seven byte record that states the architecture twice over. */
export const ARCH_RECORD_SLOT = 1;
/**
 * Where arch 10 (Harmony 890 and 895) keeps it instead, because it has no base slot 0.
 *
 * Section 182. Every other architecture puts the `0xFEED` name tree at raw slot 0, so this is tried
 * second and only accepted on a fully formed record.
 */
export const ARCH_RECORD_FALLBACK_SLOT = 0;
/** Byte `+3` of the record, constant across all eight containers that carry one. Section 182. */
export const ARCH_RECORD_CONSTANT = 0x0d;
export const ARCH_RECORD_LENGTH = 7;
/** The version word is a `u16` at `+2`, so a shorter record does not carry one. Section 79. */
export const ARCH_VERSION_WORD_END = 4;

/**
 * How many bytes of base slot 1 belong to it, given the room before the next section.
 *
 * Seven in every generated config and three in the arch 9 (Harmony 525) safe mode container, where
 * reading a fixed seven takes the version word out of base slot 2. Sections 36, 76 and 79.
 *
 * **A function because this rule existed three times**: here in `parse`, in `coverage.ts`'s claim and
 * in `emit.ts`'s rebuilder, spelled `Math.min(ARCH_RECORD_LENGTH, room)` in all three with the
 * undefined case handled differently in each. They agreed, which is the state this repository's oldest
 * rule is about: two copies of a derivation are two copies until one of them moves, and here there
 * were three. `undefined` room means nothing bounds it, so the record is its full length.
 */
export function archRecordExtent(room: number | undefined): number {
  return room === undefined ? ARCH_RECORD_LENGTH : Math.min(ARCH_RECORD_LENGTH, room);
}

/**
 * Section slot 3 is an eleven byte framed record holding a timestamp. Its cookie and terminator are
 * their own pair, nothing to do with slot 0's, and unlike `0xFEED` this pair occurs exactly once in
 * every one of the 33 containers the lab can parse, so it identifies the record without needing a
 * length to validate it.
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

/** How many slots the base layout has. Base 18 and 19 are NULL in every container. */
export const BASE_SLOT_COUNT = 20;

/**
 * Where each base slot sits on arch 10 (Harmony 890 and 895), or `undefined` where the architecture
 * does not have that slot at all. Index is the base slot. Section 183.
 *
 * **Stated rather than derived, because arch 10 cannot be described as insertions.** Five base slots
 * are **absent**, 0, 2, 8, 13 and 14, which is what `INSERTED_SLOTS` has no way to say, and that is
 * why this table exists at all rather than an arch 10 row being added there.
 *
 * Every present slot is placed by its own contents. What places each one is in the row comments and
 * asserted row by row in `packages/codec/test/arch10.test.ts`, the decisive one being base slot 10:
 * consecutive entries of its table sit `1 + 3 * count` apart, and exactly one arch 10 slot reproduces
 * arch 8's signature of four breaks where every other array scores near zero.
 *
 * **Section 183 placed four of these rows by order and two of the four were wrong**, section 184, and
 * that correction is the reason this docstring no longer has a paragraph excusing them. Base slots 4
 * and 6 confirmed: the event map is 125 bytes holding 30 entries on both arch 10 containers, exactly
 * as on arch 8, and every mode record on both carries a screen program that decodes, 137 of 137 and
 * 169 of 169. Base slots 13 and 14 are **refuted** and are absent here as a result. The lesson is
 * section 183's own, one turn later: a slot between two placed neighbours has only one home given a
 * monotone mapping, and "only one home" is not evidence that the section is there at all.
 */
export const ARCH10_SLOT_MAP: readonly (number | undefined)[] = [
  undefined, // 0, absent: no 0xFEED word occurs anywhere in either payload
  0, // 1, the architecture record, which is why arch 10 looked like it stated none
  undefined, // 2, absent: the log area closure holds on no candidate
  4, // 3, the 0xADDF clock frame. Raw slot 3 itself is the metadata archive, section 260, which is
  //    one of the eight raw slots this map places nothing on
  5, // 4, the event map: 125 bytes holding 30 entries, the same on arch 8 and on both arch 10 configs
  6, // 5, four infrared groups holding all 300 records
  9, // 6, the mode table: every record carries a screen program that decodes, 137/137 and 169/169
  10, // 7, all eight font set addresses
  undefined, // 8, absent: nowhere to go once base 9 takes raw 11
  11, // 9, twelve tagged lists and 323 bindings against the Harmony 880's twelve and 322
  12, // 10, the packing closure, four breaks, arch 8's exact signature
  14, // 11, a u16 array all resolving, 39 against the Harmony 880's 38
  15, // 12, a u8 count of 17 in 52 bytes, identical to the Harmony 880's
  // 13, absent: section 130's closure is that the first seven records hold the build timestamp's own
  // fields, and searching both payloads for a run of pointers whose targets carry those seven values
  // finds nothing, at every field offset 0 to 8 and at both one and two bytes wide, where the arch 8
  // control hits exactly once. Raw slot 16, which section 183 put this on, is a fixed table of about
  // 1024 bytes in which no three byte value resolves to an address at all.
  undefined,
  // 14, absent: base slot 14's section count is one byte on every architecture and raw slot 17's is
  // two, and no slot in either container satisfies the record shape, whose signature is a leading
  // byte of 2 and targets that decode as screen programs. Raw 17's own targets are neither: 11 of 41
  // decode as a program on the Harmony 890 and 2 of 32 on the Harmony 895.
  undefined,
  18, // 15, a u8 count, 14 against the Harmony 880's 9, per architecture by section 44
  19, // 16, an empty array, as on arch 8
  20, // 17, two bytes before the picture bank
  21, // 18, NULL
  22, // 19, NULL
];

/**
 * Base slot to raw slot on arch 16 (Harmony 300 and 350), section 259, partial by design.
 *
 * **Fifteen slots, and they are not the base twenty with insertions**, so nothing transfers by index
 * and every entry here is measured. The instrument is the firmware's own section seeker at `0x10BCE`
 * in the skin 104 image, which computes `0x0B + 4 * slot` from a slot number its callers load as a
 * literal: fourteen callers naming raw slots 3 to 12, which is the same shape section 35 used on arch
 * 14. An entry is `undefined` where the slot has not been identified rather than where the container
 * lacks it, which is the opposite of arch 10's map and is why this comment says so: `archSlot` throws
 * for an absent base slot, so an unread slot refuses rather than answering wrongly, and that is the
 * rail this architecture needs most.
 */
export const ARCH16_SLOT_MAP: readonly (number | undefined)[] = [
  0, // 0, the 0xFEED name tree, 131 bytes under Root, State and Radio
  1, // 1, seven bytes: architecture 16 twice, skin 104, then the constant 0x0d
  // 2, the log area, section 260. Eight bytes, and they are byte for byte what the Harmony 525's base
  //    slot 2 holds, `00 20 00 00 07 00 00 08`, on a different architecture. The archive in raw slot
  //    13 of the same container states the log's own record layout, an infrared event carrying a
  //    device and a command and a device selected event, which is a second source with nothing in
  //    common with the byte match. The firmware never seeks it, exactly as arch 14 never seeks base
  //    slot 2.
  2,
  3, // 3, the 0xADDF framed clock record, which the container check already verified
  undefined, // 4, unread
  4, // 5, the infrared database. Eight groups, each `u8 spare; u16 count; u24 record[]`, and a record
  //    is the base layout exactly: the pointer bias of 7, a group count byte, then three block
  //    pointers per group. Its once blocks open with the 50 ms lead in silence section 174 measured
  //    and its held blocks do not, so once and held are in their base positions.
  undefined, // 6, unread
  undefined, // 7, unread
  undefined, // 8, unread
  undefined, // 9, unread
  7, // 10, the action list table. 171 lists, each `u8 length` then three byte instructions, and the
  //    idiom `xx 00 7f` is section 26's call to another list, which is what the key table holds too.
  undefined, // 11, unread
  undefined, // 12, unread
  undefined, // 13, unread
  undefined, // 14, unread
  10, // 15, the parameter block. Five groups, each `u8 length` then that many bytes, which is base
  //     slot 15's shape and per architecture by section 44.
  // 16, the number sender, section 262, and the **differential** is what names it rather than a
  //     shape: raw slot 11 is a count of zero in the factory configuration and a count of one in the
  //     programmed one, whose owner put five favourite channels on exactly one device. Its record is
  //     base slot 16's layout byte for byte, fourteen bytes of header then three digit table
  //     pointers, and each table's ten entries call a list that sends a code from the group the same
  //     device's own digits belong to. So the mechanism section 154 measured on arch 12 is unchanged
  //     here, which is not true of every slot on this architecture.
  11,
  undefined, // 17, unread
  undefined, // 18, unread
  undefined, // 19, unread
];

/**
 * Base slot to raw slot for every architecture whose alignment is established.
 *
 * **The four insertion architectures are derived from `INSERTED_SLOTS` rather than written out**, so
 * there is still one statement of their alignment and not two. Only arch 10 is stated, because
 * insertions cannot express an absent slot. Same rule as the opcode table: a derivation lives once.
 */
export const SLOT_MAPS: Readonly<Record<number, readonly (number | undefined)[]>> = {
  ...Object.fromEntries(Object.entries(INSERTED_SLOTS).map(([architecture, inserted]) => {
    const sorted = [...inserted].sort((a, b) => a - b);
    return [architecture, Array.from({ length: BASE_SLOT_COUNT }, (_unused, base) => {
      let slot = base;
      for (const at of sorted) if (at <= slot) slot += 1;
      return slot;
    })];
  })),
  10: ARCH10_SLOT_MAP,
  16: ARCH16_SLOT_MAP,
};

function slotMap(architecture: number): readonly (number | undefined)[] {
  const map = SLOT_MAPS[architecture];
  if (map === undefined) {
    throw new GspmError(`slot alignment not established for architecture ${architecture}`);
  }
  return map;
}

/**
 * Map a slot on `architecture` to the same section's slot in the 20 slot base layout.
 *
 * Returns undefined for a raw slot the base layout does not have, whether because the architecture
 * inserted it or because it is one of arch 10's eight that correspond to no base slot. Throws for an
 * architecture whose alignment has not been established.
 */
export function baseSlot(architecture: number, slot: number): number | undefined {
  const map = slotMap(architecture);
  const base = map.indexOf(slot);
  return base === -1 ? undefined : base;
}

/**
 * Inverse of `baseSlot`: where the base layout's slot sits on `architecture`.
 *
 * **Throws when the architecture does not have that base slot**, which arch 10 is the first case of.
 * Returning a number would hand a reader the neighbouring section, which is exactly the failure the
 * arch 10 rail was put up to prevent, so the absence has to be loud. Callers that can carry on
 * without a section already catch `GspmError` and return undefined.
 */
export function archSlot(architecture: number, base: number): number {
  const slot = slotMap(architecture)[base];
  if (slot === undefined) {
    throw new GspmError(`architecture ${architecture} has no base slot ${base}`);
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
  /** Which raw slot the architecture record was found in, 1 normally and 0 on arch 10. */
  architectureSlot?: number;
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

  /**
   * How many bytes slot 0's frame occupies, terminator included.
   *
   * `frameLength` is the field, and for an empty frame the field is **zero**, which is a sentinel
   * meaning `EMPTY_FRAME_LENGTH` and nothing in the type says so. Three call sites decoded it
   * separately and a fourth writing `frameLength + FRAME_END_LENGTH` would get 2 where the answer
   * is 7. Measured before this existed: the frame tiles to the next section on 24 of the 26
   * containers that have one, and the two misses are exactly the two empty frames, so the sentinel
   * was already producing a wrong extent in a probe written to check something else.
   */
  get frameExtent(): number | undefined {
    if (this.frameLength === undefined) return undefined;
    const stated = this.frameLength === 0 ? EMPTY_FRAME_LENGTH : this.frameLength;
    return stated + FRAME_END_LENGTH;
  }

  /** The pointer count the header states. Section 194, and independent of `pointerCount`. */
  get statedPointerCount(): number {
    return statedPointerCount(this.formatRaw);
  }

  /**
   * The **legacy label**, kept because every document and sample table here uses it.
   *
   * It splits one byte into nibbles and prints them as major.minor, which reads as a plausible
   * version for `0x14` to `0x17` and as nonsense otherwise: an arch 16 (Harmony 350) container comes
   * out `0.15`, a lower version than a remote five years older. Section 194 read the byte instead and
   * it is the pointer count. Prefer `statedPointerCount`.
   */
  get formatVersion(): string {
    return `${this.formatRaw >>> 12}.${(this.formatRaw >>> 8) & 0xf}`;
  }

  get allChecksPass(): boolean {
    return Object.values(this.checks).every((ok) => ok);
  }

  /**
   * Convert an absolute flash address to an offset within the container blob.
   *
   * Undefined for a NULL pointer and for an address outside the blob. It used to test only
   * `address === 0`, so it was a NULL test wearing a range test's signature: it answered 16515071
   * for a 1.6 MB blob and -16 for an address below the base. Every caller guarded the upper bound
   * and none guarded the lower, so a pointer below the base reached `u8` and `u24` and threw a
   * `BytesError` out of functions typed `| undefined`, which is a crash where the type says
   * "no answer". Nothing in the corpus carries such a pointer; a container whose base came from
   * the marker fallback can.
   */
  blobOffsetOf(address: number): number | undefined {
    if (address === 0) return undefined;
    const off = address - this.flashBase;
    if (off < 0 || off >= this.blob.length) return undefined;
    return off;
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
   * pointers ascend with the slot number in every sample, which the `sections_ascend` check now
   * verifies rather than this comment asserting it. NULL slots have no length.
   *
   * The **last** section's end is the end marker's own position and not the header's `endAddr`,
   * which is the same correction the base got in section 117 and for the same reason: `endAddr` is
   * a declared field, and where a container actually ends is data. They agree on 31 of the 33
   * parseable containers here; on the two that disagree, both damaged reads of one Harmony 890,
   * this used to report the last section 864 and 324 bytes short with nothing saying so. The
   * marker's position is where `end_addr_points_at_end_marker` looks, so the file that fails that
   * check is exactly the file where the two answers differ.
   */
  sectionLength(slot: number): number | undefined {
    const section = this.sections[slot];
    if (section === undefined || section.isNull) return undefined;
    const following = this.sections.slice(slot + 1).filter((s) => !s.isNull);
    const next = following[0];
    const end = this.flashBase + this.blob.length - END_MARKER_LENGTH;
    return (next === undefined ? end : next.address) - section.address;
  }

  /**
   * Read a section as a count followed by that many three byte flash pointers.
   *
   * Six sections per architecture are arrays of this shape, and they are recognised rather than
   * tabulated: the count is a `u8` or a `u16` and is accepted only when `width + 3 * count`
   * accounts for the section exactly. That test is strict enough to pick out the same six slots
   * in the same six slots per architecture across the corpus and in no others.
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
 * container that has one, once the empty frame's zero length is read as `EMPTY_FRAME_LENGTH`; see
 * `frameExtent`. The length is validated by requiring the terminator where it says, which is
 * what distinguishes a real frame from the `ed fe` byte pair that turns up by chance roughly once
 * per 64 KiB: the One's 1.6 MB config holds 31 of those pairs and only one of them is a frame.
 *
 * **The length is 24 bits and not 16.** This read a `u16` with the byte at `+0x04` described as
 * "zero in every sample", which it is, because no name tree in the corpus reaches 64 KiB. Logitech
 * 's own client reads three bytes here, `docs/host-client.md`, and that is client sourced and
 * unconfirmed. It is adopted anyway because the two readings cannot disagree on any sample this
 * project has, `test/gspm.test.ts` says so, and the wider one is the one that survives a config
 * the corpus does not contain. Same family as the font header's spare byte<!--superseded-->, which was
 * the first glyph code, section 78: when a byte next to a length is always zero, suspect the length.
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
  return timestampOf(year, month + 1, day, hour, minute, second);
}

/**
 * The one place a `builtAt` string is spelled, `YYYY-MM-DDTHH:MM:SS` with every field padded.
 *
 * It was spelled twice, here and in `edit.ts`'s `localTimestamp`, each with its own `padStart`
 * helper and both correct. Two right copies is the state that precedes two diverging ones, which is
 * this repository's oldest rule and which no test can see while they agree. `TIMESTAMP` below is
 * what parses the result, so the encoder and its decoder sit together.
 */
export function timestampOf(
  year: number, month: number, day: number, hour: number, minute: number, second: number,
): string {
  const p = (n: number, w = 2): string => String(n).padStart(w, '0');
  return `${p(year, 4)}-${p(month)}-${p(day)}T${p(hour)}:${p(minute)}:${p(second)}`;
}

/**
 * Every offset in `blob` where a clock record validates.
 *
 * Exactly one in all 33 containers the lab can parse, which is what makes it usable as an
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
 * 24 of the 27 containers it was measured over, the three misses being the damaged Harmony 890
 * reads below. Of those 24: 23 where the base was already established, spanning five architectures and
 * six bases, plus the one where the two readings disagree and this one agrees with the
 * independent fact that its trailer checksum fails. `docs/findings.md` section 117.
 *
 * Undefined when the anchor is unavailable or ambiguous, so the caller falls back rather than
 * this guessing. This said "nothing in the corpus reaches that path"<!--superseded--> and **three
 * lab samples do**: `h890_config_2_rescan`, `h890_config_2_redump_2` and `h890_config_2_redump_3`,
 * all reads of one Harmony 890 whose clock record sits 54 bytes off the pointer that names it, so
 * no candidate is aligned and none survives. The fallback then returns `0x02FF94`, `0x02FEF2` and
 * `0x02FD78`, **none of them block aligned**, and `end_addr_points_at_end_marker` reports true for
 * each because the base came from the marker's own position. That is section 117's circularity,
 * still live inside the second arm of the `??`, which is why `flash_base_is_block_aligned` is a
 * check now: it is the one thing about a fallback base that can fail.
 *
 * `src/harmony/gspm.py` has carried the corrected sentence since section 122 and this copy did not,
 * which is the two copies rule caught in its documentation rather than in its arithmetic.
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

/**
 * Where the container is inside a file: from its magic to four bytes past its end marker.
 *
 * Exported because it is the extent the **trailer checksum** is computed over, and two callers need
 * it. `packages/probe` had its own idea of that extent, which was "the whole file", so on a raw flash
 * read with fill past the end marker it read the stored `u16` out of the fill and reported a checksum
 * failure for a container that is fine: two of the four Harmony 890 reads here, section 139. A
 * contribution probe saying a good config is damaged is the worst direction for that error, since
 * nobody chases a file the tool has already condemned.
 *
 * Throws for a file whose magic has no end marker after it, which is the case a caller has to handle
 * rather than paper over: without the marker there is no extent, so there is nothing to checksum.
 */
export function containerExtent(data: Uint8Array): { family: Family; start: number; blob: Uint8Array } {
  const { family, offset: start } = findMagic(data);
  const endMarker = indexOf(data, bytesOf(family.endMarker), start);
  if (endMarker < 0) {
    throw new GspmError(`no ${family.endMarker} end marker found after ${family.magic}`);
  }
  return { family, start, blob: data.subarray(start, endMarker + 4) };
}

export function parse(data: Uint8Array): Container {
  const { family, start, blob } = containerExtent(data);
  if (blob.length < MINIMUM_HEADER_LENGTH) {
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
    recoverFlashBase(blob, sections.map((s) => s.address)) ??
    // `blob` ends four bytes past the end marker, so the marker's own offset is that less four.
    endAddr - (blob.length - END_MARKER_LENGTH);

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
    trailerChecksum: u16(blob, blob.length - TRAILER_CHECKSUM_OFFSET),
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

  // Raw slot 1 on arch 8, 9, 12 and 14, and raw slot 0 on arch 10, which has no base slot 0 at all.
  // Tried in that order, and the fallback is admitted only on a **fully formed** record: section 182.
  for (const slot of [ARCH_RECORD_SLOT, ARCH_RECORD_FALLBACK_SLOT]) {
    if (container.architecture !== undefined) break;
    const archSection = sections[slot];
    if (archSection === undefined) continue;
    const o = archSection.address !== 0 ? archSection.address - flashBase : -1;
    // The record is seven bytes in every generated config and three in the arch 9 safe mode
    // container, so its extent is the distance to the next pointer, like every other section's.
    // Reading a fixed seven takes the version word out of slot 2 there. Sections 36 and 79.
    const room = container.sectionLength(slot) ?? 0;
    if (o < 0 || o + archRecordExtent(room) > blob.length) continue;
    // The architecture is stored twice. Reading it only when the two copies agree keeps a
    // coincidence from being reported as a fact.
    const doubled = room >= 2 && u8(blob, o) === u8(blob, o + 1);
    if (slot === ARCH_RECORD_FALLBACK_SLOT) {
      // **The fallback demands more than the primary does**, because raw slot 0 is the name tree on
      // every architecture that has one and a loose test there would read a tree length as an
      // architecture. A full record is exactly seven bytes with the constant at `+3`, and the tree's
      // own first two bytes are `0xFEED`, which can never be a doubled byte. So this cannot fire on
      // arch 8, 9, 12 or 14, and a test asserts that rather than leaving it to the argument.
      if (!doubled || room !== ARCH_RECORD_LENGTH) continue;
      if (u8(blob, o + 3) !== ARCH_RECORD_CONSTANT) continue;
      container.architecture = u8(blob, o);
      container.versionWord = u16(blob, o + 2);
      container.architectureSlot = slot;
      continue;
    }
    if (doubled) {
      container.architecture = u8(blob, o);
      container.architectureSlot = slot;
    }
    if (room >= ARCH_VERSION_WORD_END) container.versionWord = u16(blob, o + 2);
  }

  // **Through the mapping, not by raw index.** A comment two blocks down used to justify indexing
  // base slots 1 and 3 directly, on the grounds that both sit below arch 8's and arch 12's first
  // insertion at slot 8. That was true of every architecture then established and arch 10 breaks it:
  // its clock record is raw slot 4. The architecture is read just above, so it is available here.
  const clockSlot = container.architecture === undefined
    ? CLOCK_RECORD_SLOT
    : (SLOT_MAPS[container.architecture]?.[CLOCK_RECORD_SLOT] ?? CLOCK_RECORD_SLOT);
  const clockSection = sections[clockSlot];
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
    // The one thing about a **fallback** base that can fail, and the reason it is a check rather
    // than an assumption: when the clock anchor refuses, the base comes from the marker's own
    // position, and then the check above passes by construction. Three Harmony 890 reads take that
    // path and every one of them lands off a block boundary. A container is written at the start
    // of a flash block, so an unaligned base is not a base. `recoverFlashBase`, section 122.
    flash_base_is_block_aligned: flashBase % FLASH_BASE_ALIGNMENT === 0,
    // Both halves of the format word are read, because the version only uses the top two nibbles
    // and nothing said the rest is zero. It is, in all 33 parseable containers, and without this
    // a `formatRaw` of 0x00011600 would render as "17.6" rather than being refused.
    format_high_half_is_zero: formatRaw >>> 16 === 0,
    // The table has to end exactly where the marker begins, which fails if the marker offset is
    // not congruent to the table start. This is the check that would have caught the off by one
    // had it existed: under the old derivation the table stopped three bytes short.
    section_table_ends_at_the_marker:
      SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * pointerCount === markerOffset,
    last_section_is_null: sections[sections.length - 1]?.isNull === true,
    section_spare_bytes_are_zero: sections.every((s) => s.spare === 0),
    marker_as_expected_for_family: container.marker === family.headerMarker,
    // Two independent fields: the count comes from where the marker sits, the stated count from the
    // header word. Nothing derives one from the other, which is what makes this a check.
    format_states_the_pointer_count: statedPointerCount(formatRaw) === pointerCount,
    sections_within_blob: sections.every(
      (s) => s.isNull || (s.address - flashBase >= 0 && s.address - flashBase < blob.length),
    ),
    // `sectionLength` is the distance to the next non NULL pointer, so it silently returns a
    // negative if they ever stop ascending, and `pointerArrayAt` then reports "not a pointer
    // array" rather than refusing. The ascent was stated as a precondition in a comment and
    // checked by nothing; it holds on all 33 parseable containers.
    sections_ascend: (() => {
      let previous = 0;
      for (const s of sections) {
        if (s.isNull) continue;
        if (s.address < previous) return false;
        previous = s.address;
      }
      return true;
    })(),
    slot0_is_a_feed_frame: container.frameLength !== undefined,
    slot1_states_the_architecture: container.architecture !== undefined,
    // Passing this means the stored day of week agrees with the date, so it is a closure and not
    // just a shape match. **Both records are located through the slot mapping now**: this comment
    // used to say slots 1 and 3 sit below the first insertion at 8 so a base slot number indexes
    // them directly, which was true of the four architectures established at the time and is false
    // on arch 10, where they are raw slots 0 and 4. Section 183.
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
    // The loop above stops at the end of the blob and used to say nothing about having stopped, so
    // a damaged read with a short tail yielded fewer records than the table declares while section
    // 17's whole argument about the key table is a count. Declared and parsed agree on every
    // container here, so this is a guard rather than a live defect.
    container.checks['key_table_is_complete'] = container.keys.length === count;
  }


  return container;
}

