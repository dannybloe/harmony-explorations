/**
 * Three more sections, each a count prefixed pointer array over fixed size records, ported from
 * `src/harmony/gspm.py` for milestone M2: the timer table (base slot 12), the parameter block (15)
 * and the touch screen hit map (17).
 *
 * They are grouped because they share the property that makes them safe to claim: a record's size
 * is stated by the format, not inferred from the distance to the next one. That is what base slot
 * 5's records lack, which is why the accounting claims these and not those.
 *
 * Base slot 16, the number sender, **is** here since 23 August 2026, and this docstring said it was
 * deliberately absent because every config in the corpus carries a count of zero for it, so a port
 * would be exercised by nothing. That was true of every config that had been **found**. A config was
 * then **made**: three favourite channels on a Harmony One, compiled by Logitech's own service, and it
 * carries one record. Section 154. The reason to note the old wording rather than replace it is that
 * the same sentence could be written today about the three unused infrared encoding classes, and it
 * would be just as true and just as temporary.
 */
import { Container, GspmError, archSlot } from './gspm.ts';
import type { Instruction } from './gspm.ts';
import { u16, u24, u8 } from './bytes.ts';
import { countedPointers } from './valuemap.ts';

export const TIMER_SLOT = 12;
export const TIMER_RECORD_LENGTH = 7;
export const PARAMETER_SLOT = 15;
export const TOUCH_MAP_SLOT = 17;
/** The one architecture where that slot is a touch map. Everywhere else it names the picture bank. */
export const TOUCH_MAP_ARCHITECTURE = 12;
export const TOUCH_AREA_LENGTH = 12;
/**
 * Where an area's back pointer to itself sits, which is what makes the twelve byte reading self
 * checking. Named because `growth.ts` counts it as a pointer and a literal 9 in two files is two
 * copies of one layout.
 */
export const TOUCH_AREA_SELF_AT = 9;
/** The firmware runs at most this many timers at once, however many the config describes. */
export const TIMER_SLOTS_IN_RAM = 4;
export const TIMER_KIND_SCHEDULED = 0x01;
export const NUMBER_SENDER_SLOT = 16;
/**
 * The bytes the consumer reads in sequence before it indexes anything, and the closure for the
 * layout: `1 + 3 + 1 + 3 + 3 + 3` is exactly where the first of the three fixed offsets sits, so the
 * record is one structure rather than two that happen to be adjacent. Section 39.
 */
export const NUMBER_SENDER_HEADER = 14;
/** First digit, middle digits, last digit, at fixed byte offsets in the record. */
export const NUMBER_SENDER_DIGIT_TABLES = [14, 17, 20] as const;
export const NUMBER_SENDER_DIGITS = 10;
/** `0x14 + 3`, the last of the three pointers plus its own width. */
export const NUMBER_SENDER_RECORD_LENGTH = 23;
export const NUMBER_SENDER_TABLE_LENGTH = 3 * NUMBER_SENDER_DIGITS;

function slotOf(c: Container, base: number): number | undefined {
  if (c.architecture === undefined) return undefined;
  try {
    return archSlot(c.architecture, base);
  } catch (error) {
    if (error instanceof GspmError) return undefined;
    throw error;
  }
}

export interface Timer {
  address: number;
  kind: number;
  /** Seconds, for the scheduled kind. Clamped to sixteen bits by the firmware, with no error. */
  duration: number;
  /** The single action list instruction queued when it expires. Not a list: one instruction. */
  instruction: { opcode: number; operand: number };
}

export interface Table<T> {
  records: T[];
  /** The section's own pointer array, for the accounting. */
  start: number;
  length: number;
}

/**
 * Base slot 12: `u8 count` then `u24 address[count]`, and at each address
 * `{ u8 kind; u24 duration; u24 instruction }`.
 */
export function timers(c: Container): Table<Timer> | undefined {
  const slot = slotOf(c, TIMER_SLOT);
  if (slot === undefined) return undefined;
  const table = countedPointers(c, slot, 1);
  if (table === undefined) return undefined;
  const records: Timer[] = [];
  for (const address of table.values) {
    const off = c.blobOffsetOf(address);
    if (off === undefined || off + TIMER_RECORD_LENGTH > c.blob.length) return undefined;
    records.push({
      address,
      kind: u8(c.blob, off),
      duration: u24(c.blob, off + 1),
      instruction: { operand: u16(c.blob, off + 4), opcode: u8(c.blob, off + 6) },
    });
  }
  return { records, start: table.start, length: table.length };
}

/** One of a record's three digit tables: ten instructions, indexed by the digit. */
export interface DigitTable {
  address: number;
  instructions: Instruction[];
}

/**
 * One base slot 16 record: a **method for sending a number**, not a number.
 *
 * The firmware adds `base` to the value it was handed, converts the sum to packed decimal by repeated
 * subtraction of 10000, 1000, 100 and 10, and queues one instruction per digit, taken from the first,
 * middle or last table according to where the digit sits. `digits` is a floor that the conversion
 * raises to however many digits the value needs.
 *
 * **That a record is a method is the thing the first sample settled.** Three favourite channels
 * produce **one** record, and the three numbers live in three action lists that each load a constant
 * and hand it to this record. Had a record been a channel, the count would have been three and section
 * 39's central claim would have been wrong. Section 154.
 */
export interface NumberSender {
  address: number;
  /**
   * Bits 1 and 2 set the threshold the packed decimal value is compared against before `prefix`
   * fires, `0x0100` and `0x0010`, so a hundred and ten; with neither the threshold is `0xFFFF` and it
   * never fires. Bit 0 makes the prefix consume one of the digits. Bits above 2 are unread.
   */
  flags: number;
  /** Added to the value before conversion. */
  base: number;
  /** Minimum digit count, a floor rather than a width. */
  digits: number;
  /** Queued before anything else. NULL in the one sample. */
  prologue: Instruction;
  /** Queued after the last digit. The television's own `Select` in the one sample. */
  epilogue: Instruction;
  /** Queued before the digits when the value clears the `flags` threshold. */
  prefix: Instruction;
  /** First, middle and last, in that order. Three distinct addresses in the one sample. */
  tables: DigitTable[];
}

/**
 * Base slot 16: `u8 count` then `u24 address[count]`, and at each address a 23 byte record.
 *
 * **The slot is not NULL in a config that has no channels, it is a count of zero**, which this
 * docstring got wrong for its first hour by predicting undefined. Every container in the corpus states
 * this section and gives it one byte; the made sample gives it four, a count and a single pointer. So
 * `undefined` here means the architecture has no such slot or the array could not be read, and an
 * empty `records` means the config declares no method for sending a number. A caller that conflates
 * the two would report a Harmony 890, whose slot mapping is deliberately ungated, as a remote with no
 * channels rather than as a remote nobody has read.
 */
export function numberSenders(c: Container): Table<NumberSender> | undefined {
  const slot = slotOf(c, NUMBER_SENDER_SLOT);
  if (slot === undefined) return undefined;
  const table = countedPointers(c, slot, 1);
  if (table === undefined) return undefined;
  const records: NumberSender[] = [];
  for (const address of table.values) {
    const off = c.blobOffsetOf(address);
    if (off === undefined || off + NUMBER_SENDER_RECORD_LENGTH > c.blob.length) return undefined;
    const tables: DigitTable[] = [];
    for (const at of NUMBER_SENDER_DIGIT_TABLES) {
      const target = c.blobOffsetOf(u24(c.blob, off + at));
      if (target === undefined || target + NUMBER_SENDER_TABLE_LENGTH > c.blob.length) return undefined;
      const instructions: Instruction[] = [];
      for (let d = 0; d < NUMBER_SENDER_DIGITS; d += 1) {
        instructions.push({
          operand: u16(c.blob, target + 3 * d),
          opcode: u8(c.blob, target + 3 * d + 2),
        });
      }
      tables.push({ address: u24(c.blob, off + at), instructions });
    }
    records.push({
      address,
      flags: u8(c.blob, off),
      base: u24(c.blob, off + 1),
      digits: u8(c.blob, off + 4),
      prologue: { operand: u16(c.blob, off + 5), opcode: u8(c.blob, off + 7) },
      epilogue: { operand: u16(c.blob, off + 8), opcode: u8(c.blob, off + 10) },
      prefix: { operand: u16(c.blob, off + 11), opcode: u8(c.blob, off + 13) },
      tables,
    });
  }
  return { records, start: table.start, length: table.length };
}

export interface ParameterGroup {
  address: number;
  values: number[];
  /** `1 + 2 * values.length`, stated by the group's own entry count. */
  length: number;
}

/**
 * Base slot 15: one of the six recognised pointer arrays, over `{ u8 entries; u16 value[] }`.
 *
 * The firmware demands the section's count and every group's length, and silently substitutes
 * compiled in defaults for a group whose length differs, so neither is cosmetic.
 */
export function parameterGroups(c: Container): ParameterGroup[] | undefined {
  const slot = slotOf(c, PARAMETER_SLOT);
  if (slot === undefined || slot >= c.sections.length) return undefined;
  const section = c.sections[slot];
  if (section === undefined || section.isNull) return undefined;
  const addresses = c.pointerArray(slot);
  if (addresses === undefined) return undefined;
  const out: ParameterGroup[] = [];
  for (const address of addresses) {
    const off = c.blobOffsetOf(address);
    if (off === undefined || off >= c.blob.length) return undefined;
    const entries = u8(c.blob, off);
    if (off + 1 + 2 * entries > c.blob.length) return undefined;
    const values: number[] = [];
    for (let i = 0; i < entries; i += 1) values.push(u16(c.blob, off + 1 + 2 * i));
    out.push({ address, values, length: 1 + 2 * entries });
  }
  return out;
}

/** Which group carries the display light band's continuation, and where in it the two readers look. */
export const LIGHT_BAND_GROUP = 9;
/** Band 3's pair of device levels, at `4 * band` past the cursor, which is past the declared entries. */
export const LIGHT_BAND_PAIR_AT = 12;
export const LIGHT_BAND_PAIR_LENGTH = 4;
/** The two bit field table, addressed as `0x10 + 4 * flag + (selector >> 2)`. */
export const LIGHT_BAND_FIELDS_AT = 16;
export const LIGHT_BAND_FIELDS_LENGTH = 8;

export interface LightBandExtras {
  /** Band 3's two `u16` device levels, which the group's own entry count does not cover. */
  pair: { address: number; length: number; values: number[] };
  /** Sixteen two bit fields per value of the flag, eight bytes, all of which the band indexes. */
  fields: { address: number; length: number; bytes: number[] };
}

/**
 * What the `0x3F` band `0xC0` state machine reads past base slot 15 group 9's declared entries.
 *
 * The group's header declares six entries and two sites read further: `0x249A0` adds `4 * band` to
 * the cursor, so band 3 reads bytes 12 to 15 of a twelve byte body, and `0x2492E` reads a single
 * byte at `0x10 + 4 * flag + (selector >> 2)` and extracts the two bit field `selector & 3`.
 * Twelve bytes, both readers, nothing left over. Section 103.
 *
 * **This exists because the byte accounting used to attribute those twelve by position.** A
 * `slot-15-spare` owner filled every unclaimed byte between the lowest group and the pointer array,
 * with no cap and no content test, so zeroing any group's entry count made the catch-all swallow the
 * bytes the group stopped claiming and the accounting still reported 100.00%: 32 bytes absorbed on a
 * Harmony One, 28 on a Harmony 600 and a Harmony 880, 8 on a Harmony 525. Section 84 claimed them by
 * position when nothing had read them and section 103 read them; the offsets here are the firmware's
 * own, so what used to be inferred from what was left over is now stated and can be wrong.
 *
 * Returns undefined where the group is absent, which is every architecture but arch 12 (Harmony One):
 * arch 8 (Harmony 880) and arch 14 (Harmony 600 and 700) carry nine groups and arch 9 (Harmony 525)
 * five, so there is no group 9 to continue. It does **not** check the twelve bytes are unclaimed,
 * deliberately: a collision with another group is what the accounting's overlap detector is for, and
 * a reader that consults what is already taken is the shape this replaces.
 */
export function lightBandExtras(c: Container): LightBandExtras | undefined {
  const groups = parameterGroups(c);
  const group = groups?.[LIGHT_BAND_GROUP];
  if (group === undefined) return undefined;
  const body = c.blobOffsetOf(group.address);
  if (body === undefined) return undefined;
  // Past the count byte, so an offset the firmware computes from its cursor is an offset from here.
  const cursor = body + 1;
  const end = cursor + LIGHT_BAND_FIELDS_AT + LIGHT_BAND_FIELDS_LENGTH;
  if (end > c.blob.length) return undefined;
  const pairAt = cursor + LIGHT_BAND_PAIR_AT;
  const fieldsAt = cursor + LIGHT_BAND_FIELDS_AT;
  return {
    pair: {
      address: group.address + 1 + LIGHT_BAND_PAIR_AT,
      length: LIGHT_BAND_PAIR_LENGTH,
      values: [u16(c.blob, pairAt), u16(c.blob, pairAt + 2)],
    },
    fields: {
      address: group.address + 1 + LIGHT_BAND_FIELDS_AT,
      length: LIGHT_BAND_FIELDS_LENGTH,
      bytes: [...c.blob.slice(fieldsAt, fieldsAt + LIGHT_BAND_FIELDS_LENGTH)],
    },
  };
}

export interface TouchArea {
  x: number;
  width: number;
  y: number;
  height: number;
  /** The key code a hit reports. */
  code: number;
  /** The record's own address, which is what makes the twelve byte reading self checking. */
  self: number;
  address: number;
}

export interface TouchPage {
  address: number;
  areas: TouchArea[];
  /** The page's own `u8 count` plus its pointers. */
  start: number;
  length: number;
}

/**
 * Base slot 17: `u8 pages`, `u24 page[]`, each page `u8 areas`, `u24 area[]`, each area twelve
 * bytes of `{ u16 x; u16 width; u16 y; u16 height; u8 code; u24 self }`.
 *
 * Arch 12 only, and the firmware answers a touch with the **first** rectangle the point falls in,
 * so a page's order is data rather than presentation.
 *
 * **The architecture gate is enforced here now and was documentation before.** Elsewhere base slot
 * 17 names the picture bank, and this read it anyway, returning `{ records: [], length: 1 }` on 17
 * containers of arch 8, 9 and 14: "no touch pages" where the truth is "not a touch map". Two
 * callers then re derived `records.length === 0` as the picture bank discriminator, which is two
 * copies of one rule with `c.architecture` in hand, and a nonzero leading byte in front of a
 * picture bank would have made both mis-account and fabricated areas out of pixels.
 */
/**
 * Where base slot 17 begins, whatever it holds there.
 *
 * Exists because `touchPages` is gated on arch 12 now, and the two callers that account for that
 * slot still need its offset on the architectures where it names the picture bank instead. They
 * used to get it from `touchPages` answering with an empty table, which is the fabrication the
 * gate removes.
 */
export function touchMapStart(c: Container): number | undefined {
  const slot = slotOf(c, TOUCH_MAP_SLOT);
  if (slot === undefined) return undefined;
  const section = c.sections[slot];
  if (section === undefined || section.address === 0) return undefined;
  return c.blobOffsetOf(section.address);
}

export function touchPages(c: Container): Table<TouchPage> | undefined {
  if (c.architecture !== TOUCH_MAP_ARCHITECTURE) return undefined;
  const slot = slotOf(c, TOUCH_MAP_SLOT);
  if (slot === undefined) return undefined;
  const table = countedPointers(c, slot, 1);
  if (table === undefined) return undefined;
  const pages: TouchPage[] = [];
  for (const address of table.values) {
    const off = c.blobOffsetOf(address);
    if (off === undefined || off >= c.blob.length) return undefined;
    const count = u8(c.blob, off);
    if (off + 1 + 3 * count > c.blob.length) return undefined;
    const areas: TouchArea[] = [];
    for (let k = 0; k < count; k += 1) {
      const at = u24(c.blob, off + 1 + 3 * k);
      const p = c.blobOffsetOf(at);
      if (p === undefined || p + TOUCH_AREA_LENGTH > c.blob.length) return undefined;
      // The back pointer at +0x09 is what makes the twelve byte reading self checking, and until
      // now nothing compared it: the field was read, documented as the closure, and never used as
      // one. It holds on all 977 areas in the corpus, so this refuses nothing that was being read.
      if (u24(c.blob, p + TOUCH_AREA_SELF_AT) !== at) return undefined;
      areas.push({
        x: u16(c.blob, p),
        width: u16(c.blob, p + 2),
        y: u16(c.blob, p + 4),
        height: u16(c.blob, p + 6),
        code: u8(c.blob, p + 8),
        self: u24(c.blob, p + TOUCH_AREA_SELF_AT),
        address: at,
      });
    }
    pages.push({ address, areas, start: off, length: 1 + 3 * count });
  }
  return { records: pages, start: table.start, length: table.length };
}
