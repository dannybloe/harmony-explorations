/**
 * The screen language: the config's second interpreter, ported from `src/harmony/gspm.py`.
 *
 * A one byte opcode language that draws the screen, found at `0x1879C` on the Harmony 700, and
 * documented in `docs/findings.md` section 40. Its programs live in base slot 11, in base slot
 * 14's lookups and in mode entries.
 *
 * **Instructions are variable length with no length field anywhere**, so a walk either stays in
 * step or falls off a cliff, and `undefined` is the cliff. That is also what makes this worth
 * porting first for M2: 18252 programs across ten configs decode with nothing left over, which is
 * a real check precisely because a misread length would desynchronise rather than mis-render.
 *
 * Every instruction carries `start` and `length`, which the Python original does not. The byte
 * accounting needs the extent, and the only place that can produce it without a second copy of
 * the length rules is the walk that already applies them.
 */
import { Container, GspmError, archSlot } from './gspm.ts';
import { u16, u24, u8 } from './bytes.ts';
import { valueMaps } from './valuemap.ts';
import { modePages, modeProgramRoots } from './sections.ts';
import { TOUCH_MAP_SLOT } from './tables.ts';

export const SCREEN_TABLE_SLOT = 11;

/**
 * Operand bytes per opcode, for the fixed length ones.
 *
 * 21 is arch 8 only and its length is inferred from the corpus rather than read from a firmware,
 * because no arch 8 image exists here.
 */
export const SCREEN_FIXED_OPERANDS: Readonly<Record<number, number>> = {
  1: 6,
  2: 5,
  3: 9,
  4: 5,
  16: 1,
  17: 3,
  20: 3,
  21: 4,
  // Arch 12 only and takes **no** operand: its handler at `0x29640` on the Harmony One 3.4 image
  // makes no read call at all, where every other handler calls its own reader. That one entry is
  // what unblocked arch 12's mode programs. `docs/findings.md` section 54.
  23: 0,
};

export const SCREEN_END = 0;
/**
 * Two position bytes then a `u24` naming a glyph run that lives **somewhere else**, section 121.
 *
 * The out of line twin of `SCREEN_TEXT_INLINE`, and the more common of the two by four to one. Its
 * target is never a place of its own: in all 12052 instances across the corpus it is the glyph
 * payload of some `SCREEN_TEXT_INLINE` instruction in another reachable program, so a string is
 * stored once by whichever program draws it inline and referenced by every other program that wants
 * it. That is why the byte accounting closed without anybody reading this opcode.
 */
export const SCREEN_TEXT_AT = 4;
/** Two position bytes then a terminated run of glyph codes. */
export const SCREEN_TEXT_INLINE = 5;
/** One operand: the base slot 7 entry every later string in the program draws with. */
export const SCREEN_SELECT_FONT = 16;
/** The bridge to the action list language. */
export const SCREEN_QUEUE_INSTRUCTION = 17;
export const SCREEN_SWITCH_NARROW = 18;
export const SCREEN_SWITCH_WIDE = 19;
export const SCREEN_JUMP = 20;
/**
 * The one opcode whose width is **not** the same on every architecture, so it cannot live in
 * `SCREEN_FIXED_OPERANDS`. Section 64.
 *
 * On arch 12 it is a call, from its handler at `0x2966E` on the Harmony One 3.4 image: it saves the
 * stream position plus three, then reads a `u24` and seeks there. Three operand bytes and a return
 * address, and opcode 23 is the matching return. No config uses it, so the width is firmware and
 * the semantics are untested.
 *
 * On arch 9 it takes **one**, and that operand is a row index. This said eleven until section 85,
 * on the strength of the trailing `u24` naming a picture. It does name one, but the picture belongs
 * to the **opcode 3** that follows it, which is nine operands ending in a flash address, and the
 * two readings consume the same twelve bytes whenever opcode 22 is followed by opcode 3. That is
 * 1856 times out of 1856 in the two arch 9 user configs, which is why the corpus could not tell
 * them apart; the safe mode container has four where it is not, and there the eleven byte reading
 * walks a program off the end.
 *
 * The closure is that the operand runs 0 to 7 uniformly, eight per mode page and `8 * pages` per
 * config, and that the opcode 3 after it draws at `y = 8 * operand`, 96 wide and 8 high. Eight rows
 * of eight pixels on a 96 by 64 screen, which is the picture the bank's own walk finds twice.
 */
export const SCREEN_CALL = 22;
export const SCREEN_OPERANDS_BY_ARCHITECTURE: Readonly<Record<number, Record<number, number>>> = {
  9: { 22: 1 },
  12: { 22: 3 },
};
/**
 * Whether opcode 22's trailing `u24` is a program to walk into. On arch 12 it is; on arch 9 it is a
 * picture, which is a different kind of thing and must not be handed to the program decoder.
 */
export const SCREEN_CALL_TARGET_ARCHITECTURES: ReadonlySet<number> = new Set([12]);

export interface ScreenInstruction {
  opcode: number;
  /** The raw operand bytes: mostly coordinates and identifiers whose meaning is not established. */
  operands: Uint8Array;
  /**
   * Set only by `SCREEN_TEXT_INLINE`. Glyph indices and **not characters**: the renderer indexes a
   * font by the code minus one, and the assignment is per config rather than an encoding. `text.ts`
   * turns them back into characters by matching the glyph's pixels. Sections 46 and 112.
   */
  glyphs?: Uint8Array;
  /** Where the stream continues, for the opcodes that transfer control. */
  targets: number[];
  /** Offset of the opcode byte within the container blob. */
  start: number;
  /** Bytes this instruction occupies, opcode included. */
  length: number;
}

/** Whether the stream continues somewhere else rather than after this instruction. */
export function transfers(instruction: ScreenInstruction): boolean {
  return (
    instruction.opcode === SCREEN_JUMP ||
    instruction.opcode === SCREEN_SWITCH_NARROW ||
    instruction.opcode === SCREEN_SWITCH_WIDE
  );
}

/**
 * The screen language program at an absolute flash address, or undefined if the walk falls off.
 *
 * ```
 * 0        end
 * 1        6 operand bytes
 * 2, 4     5, of which the last three are a flash address
 * 3        9, likewise
 * 5        two position bytes then a terminated run of glyph codes
 * 16       1, an index into base slot 7
 * 17       3, an action list instruction, queued
 * 18, 19   a switch on a state variable, below
 * 20       3, a flash address, and the program continues there
 * 21       4, arch 8 only, length inferred from the corpus
 * ```
 *
 * A switch reads a state variable index, then a table of exact values and a table of inclusive
 * ranges, and jumps to the first target that matches. The counts, the values and the bounds are
 * one byte in opcode 18 and two in opcode 19; the target is always three.
 *
 * Stops at the end opcode, at a jump, or at a switch, since after any of those the stream is
 * somewhere else. The successors are in each instruction's `targets`.
 */
export function screenProgram(c: Container, address: number): ScreenInstruction[] | undefined {
  const first = c.blobOffsetOf(address);
  if (first === undefined) return undefined;
  let off: number = first;
  const limit = c.blob.length;
  const out: ScreenInstruction[] = [];

  for (;;) {
    if (off < 0 || off >= limit) return undefined;
    const start = off;
    const opcode = u8(c.blob, off);
    off += 1;

    if (opcode === SCREEN_END) {
      out.push({ opcode, operands: new Uint8Array(0), targets: [], start, length: 1 });
      return out;
    }

    if (opcode === SCREEN_JUMP) {
      if (off + 3 > limit) return undefined;
      out.push({
        opcode,
        operands: c.blob.subarray(off, off + 3),
        targets: [u24(c.blob, off)],
        start,
        length: 4,
      });
      return out;
    }

    const perArch =
      c.architecture === undefined ? undefined : SCREEN_OPERANDS_BY_ARCHITECTURE[c.architecture];
    const fixed = perArch?.[opcode] ?? SCREEN_FIXED_OPERANDS[opcode];
    if (fixed !== undefined) {
      if (off + fixed > limit) return undefined;
      const operands = c.blob.subarray(off, off + fixed);
      // A call continues after its operands rather than transferring for good, so it is a target
      // plus a fall through, unlike the jump above. On arch 9 the same opcode's address is a
      // picture and is deliberately not walked into.
      const calls =
        opcode === SCREEN_CALL &&
        c.architecture !== undefined &&
        SCREEN_CALL_TARGET_ARCHITECTURES.has(c.architecture);
      out.push({
        opcode,
        operands,
        targets: calls ? [u24(c.blob, off + fixed - 3)] : [],
        start,
        length: 1 + fixed,
      });
      off += fixed;
      continue;
    }

    if (opcode === SCREEN_TEXT_INLINE) {
      // A code with bit 7 set is the first half of a wide one and takes a second byte with it, so
      // the terminator cannot be found by scanning for a zero. No string in the corpus is wide,
      // but a parser that assumed narrow would desynchronise on the first one that is.
      let end = off + 2;
      while (end < limit && u8(c.blob, end) !== 0) end += u8(c.blob, end) & 0x80 ? 2 : 1;
      if (end >= limit) return undefined;
      out.push({
        opcode,
        operands: c.blob.subarray(off, off + 2),
        glyphs: c.blob.subarray(off + 2, end),
        targets: [],
        start,
        length: end + 1 - start,
      });
      off = end + 1;
      continue;
    }

    if (opcode === SCREEN_SWITCH_NARROW || opcode === SCREEN_SWITCH_WIDE) {
      const width = opcode === SCREEN_SWITCH_WIDE ? 2 : 1;
      const body = off;
      off += 1; // the state variable index
      const targets: number[] = [];
      for (const entry of [width + 3, 2 * width + 3]) {
        if (off + width > limit) return undefined;
        const count = width === 1 ? u8(c.blob, off) : u16(c.blob, off);
        off += width;
        if (off + entry * count > limit) return undefined;
        for (let k = 0; k < count; k += 1) targets.push(u24(c.blob, off + entry * k + entry - 3));
        off += entry * count;
      }
      out.push({
        opcode,
        operands: c.blob.subarray(body, off),
        targets,
        start,
        length: off - start,
      });
      return out;
    }

    return undefined;
  }
}

/** One arm of a screen switch: the value or the range that takes it, and where it goes. */
export interface ScreenCase {
  /** The value that selects this arm, for an exact case. */
  value?: number;
  /** The inclusive bounds that select it, for a range case. */
  from?: number;
  to?: number;
  target: number;
}

/**
 * A switch decoded into its condition and its arms, which is what a caller needs to say **why** a
 * screen looks the way it does.
 *
 * The layout is the one the walk above consumes, and this is the same bytes read for their meaning
 * rather than for their length: the state variable index, then the exact cases, then the inclusive
 * ranges, one byte a field in opcode 18 and two in opcode 19, with a three byte target throughout.
 * The firmware takes the first arm that matches, so the order is data and the exact cases are tested
 * before the ranges.
 *
 * **This is where `targets` comes from**, in that order, so the two cannot disagree about which arm is
 * which. Returns nothing for an instruction that is not a switch.
 */
export function screenSwitch(
  instruction: ScreenInstruction,
): { variable: number; cases: ScreenCase[] } | undefined {
  const wide = instruction.opcode === SCREEN_SWITCH_WIDE;
  if (!wide && instruction.opcode !== SCREEN_SWITCH_NARROW) return undefined;
  const width = wide ? 2 : 1;
  const bytes = instruction.operands;
  const number = (at: number): number => (width === 1 ? u8(bytes, at) : u16(bytes, at));
  const cases: ScreenCase[] = [];
  let at = 1;
  const variable = u8(bytes, 0);
  for (const fields of [1, 2]) {
    const count = number(at);
    at += width;
    const entry = fields * width + 3;
    for (let k = 0; k < count; k += 1) {
      const target = u24(bytes, at + entry * k + entry - 3);
      if (fields === 1) cases.push({ value: number(at + entry * k), target });
      else cases.push({ from: number(at + entry * k), to: number(at + entry * k + width), target });
    }
    at += entry * count;
  }
  return { variable, cases };
}

/**
 * The `SCREEN_END` byte a program's own walk never reaches, as a blob offset, if it has one.
 *
 * A program that ends by transferring control, a jump or a switch, is finished as far as the walk
 * is concerned, so the walk stops at that instruction and any byte after it belongs to whatever
 * comes next. On arch 8 there is often nothing next: 49 to 64 of these per config are followed by
 * a single zero byte and then a mode page record, and nothing claimed that byte.
 *
 * It is the program's terminator, emitted whether or not it can be reached. The closure is
 * positional and comes from the same containers: at that exact position, between a program and
 * the page record after it, every other program in the file ends with a `SCREEN_END` the walk
 * **does** reach, 91 to 140 of them per config. Same place, same value, and the only difference is
 * whether the last instruction fell into it. `docs/findings.md` section 84.
 *
 * Returns nothing when the byte is not zero, which is what a program abutting the next structure
 * looks like, and 36 arch 12 programs do that.
 */
export function deadTerminator(c: Container, program: ScreenInstruction[]): number | undefined {
  const last = program[program.length - 1];
  if (last === undefined || !transfers(last)) return undefined;
  const after = last.start + last.length;
  if (after >= c.blob.length || u8(c.blob, after) !== SCREEN_END) return undefined;
  return after;
}

/**
 * Every address the firmware is known to start a screen program at.
 *
 * Two sources, both derived rather than guessed: base slot 11 is an array of them, and every
 * target of a base slot 14 lookup is one. A mode entry carries a third on arch 8 and arch 14,
 * which is not included here because the same rule finds nothing on arch 9 and arch 12.
 */
export function screenProgramRoots(c: Container): number[] {
  let slot: number;
  try {
    if (c.architecture === undefined) return [];
    slot = archSlot(c.architecture, SCREEN_TABLE_SLOT);
  } catch (error) {
    if (error instanceof GspmError) return [];
    throw error;
  }
  const out = [...(slot < c.sections.length ? (c.pointerArray(slot) ?? []) : [])];
  for (const record of valueMaps(c) ?? []) {
    for (const [, target] of record.entries) out.push(target);
    for (const [, , target] of record.ranges) out.push(target);
  }
  out.push(...modeProgramRoots(c));
  // A mode's pages each name a program outright, which is a stronger source than the computed
  // root above: on arch 12 the two never coincide, because the stated one begins with a call to
  // the fragment that sits after the tagged list. `docs/findings.md` section 66.
  for (const page of modePages(c)) out.push(page.program);
  return out;
}

/**
 * Every program reachable from `roots`, keyed by its address, following control transfers.
 *
 * A program stops at a jump or a switch, so the successors have to be walked to reach the rest.
 * Addresses are visited once: the generator shares tails, so several programs land on the same
 * continuation and a naive walk would revisit them and, for a switch that reaches backwards,
 * never stop.
 */
export function reachablePrograms(
  c: Container,
  roots: readonly number[] = screenProgramRoots(c),
): Map<number, ScreenInstruction[]> {
  const found = new Map<number, ScreenInstruction[]>();
  const pending = [...roots];
  const seen = new Set<number>(roots);
  while (pending.length > 0) {
    const address = pending.pop() as number;
    const program = screenProgram(c, address);
    if (program === undefined) continue;
    found.set(address, program);
    for (const instruction of program) {
      for (const target of instruction.targets) {
        if (target === 0 || seen.has(target)) continue;
        seen.add(target);
        pending.push(target);
      }
    }
  }
  return found;
}

/**
 * Opcode 2 draws a picture that lives at an address rather than inline. `docs/findings.md` section 50.
 *
 * This used to add "which makes it the only screen instruction naming a place outside its own<!--superseded-->
 * program", and `SCREEN_TEXT_AT` is the counterexample: it names a glyph run in another program and
 * is four times more common. The wrong half of that sentence is why nothing followed opcode 4's
 * pointer for as long as the picture pointer had been followed.
 */
export const SCREEN_DRAW_IMAGE = 2;
/** `u8 kind` then two `u16`, so the pixels start five bytes in. */
export const BITMAP_HEADER = 5;
/** `rows` rows of `stride` bytes, straight through. */
export const BITMAP_RAW = 0;
/** The skip and literal encoding a base slot 7 glyph uses, section 46. */
export const BITMAP_ENCODED = 1;
/** A bare RETURN in the firmware: a valid byte that draws nothing. */
export const BITMAP_NOTHING = 2;
/**
 * The two control bytes of the encoded kind. Both are special cased in the firmware ahead of the
 * generic bit 7 path, so the row break is a fact rather than a skip of zero read charitably.
 */
export const BITMAP_END = 0x00;
export const BITMAP_ROW_BREAK = 0x80;
/** A pixel, in both kinds and in a base slot 7 glyph. */
export const PIXEL_BYTES = 2;
/**
 * `kind` selects the pixel depth and the depths are per architecture. Arch 9's remote has a
 * monochrome LCD and its kind 2 is one bit a pixel, where the same kind on the other three
 * architectures is a handler that draws nothing. `docs/findings.md` section 62.
 */
export const BITMAP_MONOCHROME_ARCHITECTURES = new Set([9]);
export const PIXEL_BITS = 8;
/** Base slot 17 points two bytes ahead of the picture bank, except on arch 12. */
export const PICTURE_BANK_BIAS = 2;
export const PICTURE_BANK_UNADDRESSED = new Set([12]);

export interface Bitmap {
  address: number;
  kind: number;
  /**
   * Pixels per row. A pixel is two bytes, as it is in a glyph, so a raw row occupies `2 * stride`
   * bytes. Section 50 first read this as a byte count and halved every raw extent; the corpus
   * settles it, because consecutive pictures then sit exactly `5 + 2 * stride * rows` apart.
   */
  stride: number;
  rows: number;
  /**
   * The whole object including its header. A raw picture states it; an encoded one is walked to
   * its terminator. Undefined means the walk ran off the end, which is a refusal, not a picture.
   */
  length: number | undefined;
  /**
   * Row breaks in the encoded body, and set only for that kind. The closure the extent rests on:
   * the body discards the header, so this and `rows` are two independent statements of one number.
   */
  rowBreaks: number | undefined;
}

/** The address a `SCREEN_DRAW_IMAGE` names: its last three operand bytes. */
export function bitmapReference(instruction: ScreenInstruction): number | undefined {
  if (instruction.opcode !== SCREEN_DRAW_IMAGE) return undefined;
  if (instruction.operands.length < 5) return undefined;
  return u24(instruction.operands, instruction.operands.length - 3);
}

/**
 * Decode the header of the picture at `address`.
 *
 * ```
 * +0x00  u8   kind
 * +0x01  u16  stride, in bytes per row
 * +0x03  u16  rows
 * +0x05       the pixels
 * ```
 *
 * The firmware loads only the **low byte** of each `u16`, so a writer emitting a stride or a row
 * count above 255 gets it modulo 256 and no error. Every value in the corpus is far below that,
 * which is why data cannot tell the two readings apart and the firmware has to settle it.
 */
export function bitmapAt(c: Container, address: number): Bitmap | undefined {
  const off = c.blobOffsetOf(address);
  if (off === undefined || off + BITMAP_HEADER > c.blob.length) return undefined;
  const kind = u8(c.blob, off);
  if (kind > BITMAP_NOTHING) return undefined;
  const stride = u16(c.blob, off + 1);
  const rows = u16(c.blob, off + 3);
  let length: number | undefined;
  let rowBreaks: number | undefined;
  if (kind === BITMAP_RAW) {
    length = BITMAP_HEADER + PIXEL_BYTES * stride * rows;
    if (off + length > c.blob.length) return undefined;
  } else if (kind === BITMAP_NOTHING && BITMAP_MONOCHROME_ARCHITECTURES.has(c.architecture ?? -1)) {
    // **A row is padded to a whole byte.** Every picture in both arch 9 user configs is 96 pixels
    // wide, where padding changes nothing, so `stride * rows / 8` fitted them exactly; the safe
    // mode container's 19 pixel picture is what tells the two apart, and at three bytes a row its
    // bank walks onto the trailer exactly. Section 85.
    length = BITMAP_HEADER + Math.ceil(stride / PIXEL_BITS) * rows;
    if (off + length > c.blob.length) return undefined;
  } else if (kind === BITMAP_ENCODED) {
    const walked = encodedExtent(c, off + BITMAP_HEADER);
    if (walked === undefined) return undefined;
    ({ length, rowBreaks } = walked);
  }
  return { address, kind, stride, rows, length, rowBreaks };
}

/**
 * Walk an encoded body from `off`, one control byte at a time exactly as the firmware does it.
 *
 * `BITMAP_END` stops, `BITMAP_ROW_BREAK` starts the next row, any other byte with bit 7 set skips
 * that many pixels, and a byte below it introduces that many literal two byte pixels.
 */
function encodedExtent(
  c: Container,
  from: number,
): { length: number; rowBreaks: number } | undefined {
  let off = from;
  let rowBreaks = 0;
  while (off < c.blob.length) {
    const control = u8(c.blob, off);
    off += 1;
    if (control === BITMAP_END) return { length: BITMAP_HEADER + off - from, rowBreaks };
    if (control === BITMAP_ROW_BREAK) rowBreaks += 1;
    else if ((control & 0x80) === 0) off += 2 * control;
  }
  return undefined;
}

/** The trailer: a sixteen bit checksum and the four byte end marker. */
export const TRAILER_LENGTH = 6;

/**
 * Every picture from blob `from` to the trailer, or undefined if the walk does not land there.
 *
 * **Self verifying, which is the whole point.** Pictures are variable length and state their own
 * size, so a walk starting one byte out reads a header out of pixel data and either stops early or
 * overshoots. Landing exactly on the trailer after dozens of records is the check.
 * `docs/findings.md` section 55.
 */
export function pictureRun(c: Container, from: number): Bitmap[] | undefined {
  const end = c.blob.length - TRAILER_LENGTH;
  const out: Bitmap[] = [];
  let at = from;
  while (at < end) {
    const picture = bitmapAt(c, c.flashBase + at);
    if (picture?.length === undefined || picture.length <= BITMAP_HEADER) return undefined;
    out.push(picture);
    at += picture.length;
  }
  return at === end && out.length > 0 ? out : undefined;
}

/**
 * The whole picture array, found by trying start offsets just above the named content.
 *
 * The bank begins where everything with a name ends, but not on that exact byte: sections this
 * codec does not fully read leave a short head, 181 bytes on one Harmony One. So offsets are tried
 * in order under two constraints, and exactly one start satisfies both in every container that has
 * a bank: the walk lands on the trailer, **and** every picture opcode 2 names appears in it at its
 * own address. The first alone leaves several candidates on two arch 8 configs.
 */
/**
 * Where the picture array begins when the container says so, as a blob offset.
 *
 * Base slot 17 points two bytes in front of it on arch 8, 9 and 14, exact on all seven samples.
 * Arch 12 uses that slot for the touch screen hit map and names the bank nowhere, which is why
 * `pictureBank` still searches. `docs/findings.md` section 62.
 */
export function pictureBankStart(c: Container): number | undefined {
  if (c.architecture === undefined || PICTURE_BANK_UNADDRESSED.has(c.architecture)) return undefined;
  let slot: number;
  try {
    slot = archSlot(c.architecture, TOUCH_MAP_SLOT);
  } catch {
    return undefined;
  }
  const section = c.sections[slot];
  if (section === undefined || section.address === 0) return undefined;
  const off = c.blobOffsetOf(section.address);
  return off === undefined ? undefined : off + PICTURE_BANK_BIAS;
}

export function pictureBank(c: Container, from: number, search = 1024): Bitmap[] | undefined {
  const stated = pictureBankStart(c);
  if (stated !== undefined) {
    const run = pictureRun(c, stated);
    if (run !== undefined) return run;
  }
  const wanted = new Set(bitmaps(c).map((b) => b.address));
  for (let start = from; start < Math.min(from + search, c.blob.length); start += 1) {
    const run = pictureRun(c, start);
    if (run === undefined) continue;
    const have = new Set(run.map((b) => b.address));
    if ([...wanted].every((a) => have.has(a))) return run;
  }
  return undefined;
}

/** Every distinct picture any reachable screen program addresses, in address order. */
export function bitmaps(c: Container): Bitmap[] {
  const addresses = new Set<number>();
  for (const [, program] of reachablePrograms(c)) {
    for (const instruction of program) {
      const reference = bitmapReference(instruction);
      if (reference !== undefined) addresses.add(reference);
    }
  }
  const out: Bitmap[] = [];
  for (const address of [...addresses].sort((a, b) => a - b)) {
    const bitmap = bitmapAt(c, address);
    if (bitmap !== undefined) out.push(bitmap);
  }
  return out;
}
