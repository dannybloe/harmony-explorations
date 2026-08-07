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
 * Present in the arch 12 dispatcher and used by no config in the corpus, so their operands are
 * not established. Listed so a parser refuses them rather than desynchronising silently.
 */
export const SCREEN_ARCH12_ONLY: ReadonlySet<number> = new Set([22, 23]);

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
