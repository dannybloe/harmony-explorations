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
import { modeProgramRoots } from './sections.ts';

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
 * Present in the arch 12 dispatcher and used by no config in the corpus, so its operand count is
 * not established. Listed so a parser refuses it rather than desynchronising silently. 23 was here
 * too until section 54 read its handler.
 */
export const SCREEN_ARCH12_ONLY: ReadonlySet<number> = new Set([22]);

export interface ScreenInstruction {
  opcode: number;
  /** The raw operand bytes: mostly coordinates and identifiers whose meaning is not established. */
  operands: Uint8Array;
  /**
   * Set only by `SCREEN_TEXT_INLINE`. Glyph indices and **not characters**: the renderer indexes
   * a font by the code minus one, and none of it decodes as ASCII. See section 46.
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

    const fixed = SCREEN_FIXED_OPERANDS[opcode];
    if (fixed !== undefined) {
      if (off + fixed > limit) return undefined;
      out.push({
        opcode,
        operands: c.blob.subarray(off, off + fixed),
        targets: [],
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
 * Opcode 2 draws a picture that lives at an address rather than inline, which makes it the only
 * screen instruction naming a place outside its own program. `docs/findings.md` section 50.
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
export function pictureBank(c: Container, from: number, search = 1024): Bitmap[] | undefined {
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
