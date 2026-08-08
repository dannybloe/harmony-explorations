/**
 * Which action list instructions have a reading, and how far that reading goes.
 *
 * This file is the step 6 progress number in executable form. The share of instructions whose
 * opcode nobody has read used to be quoted in prose and recomputed by hand each time, which is
 * exactly the shape of claim `reference/superseded.md` exists to stop. Here it is a function over
 * the corpus, so it moves when the reading moves and cannot drift away from the documents.
 *
 * The structure mirrors the firmware's, because anything else would be a second opcode table by
 * another name. Above `SECOND_SPACE_LIMIT` a binary search names one handler per opcode. Below it
 * the operand carries the rest of the opcode, and the dispatcher tests it in **bands** rather than
 * exact values: `0x3F` with a high byte anywhere in `0xF0` to `0xFF` reaches one routine. So the
 * key here is a band, not a value, and a band that the firmware tests and then does nothing with
 * is recorded as a reading too. "Does nothing" is a fact about the instruction, not an absence of
 * one, and an emitter needs it as much as any other.
 *
 * `docs/findings.md` sections 33, 34, 37, 39, 42, 43, 69, 70, 71, 72, 73 and 74.
 */

import { SECOND_SPACE_LIMIT, ACTION_NOOP_LIMIT } from './ir.ts';
import type { Instruction } from './gspm.ts';

/** The opcode above which bit 7 is stripped and one routine handles everything. */
export const STATE_WRITE_BASE = 0x80;

/**
 * How far a reading goes.
 *
 * `placement` means the handler is found and its immediate effect is known: which routine runs,
 * which RAM variable it writes. `meaning` means that effect is tied to something a config
 * describes, so an editor could put it in front of a user.
 *
 * The distinction is the point of this file. Counting a placement as a reading is how "the
 * language is read" gets said about a language a third of whose instructions nobody can name, and
 * the first draft of this table did exactly that and reported 100%.
 */
export type Depth = 'meaning' | 'placement';

export interface Reading {
  /** What the instruction does, in one line. */
  readonly what: string;
  /** Which `docs/findings.md` section argues it. */
  readonly section: number;
  readonly depth: Depth;
  /**
   * True when the firmware reaches this band and returns without acting. A no-op is always
   * `meaning`, since "does nothing" is as complete as a reading gets.
   */
  readonly noop?: boolean;
}

const means = (what: string, section: number): Reading => ({ what, section, depth: 'meaning' });
const placed = (what: string, section: number): Reading => ({ what, section, depth: 'placement' });
const noop = (section: number): Reading => ({
  what: 'nothing: the dispatcher returns without acting',
  section,
  depth: 'meaning',
  noop: true,
});

/**
 * Opcodes at or above `SECOND_SPACE_LIMIT`, where the opcode is the whole instruction.
 *
 * `0x80` and above are not here: they are one family with a parameter, resolved in `reading`.
 * `0x66`, `0x6E`, `0x6F` and `0x76` are absent because they have no reading at all; `0x6E` is the
 * only one of the four the corpus uses.
 */
const MAIN: ReadonlyMap<number, Reading> = new Map([
  [0x67, placed('third producer into the infrared queue, tag 5', 42)],
  [0x68, means('accumulator shifted right by the low byte', 34)],
  [0x69, means('accumulator XOR operand', 34)],
  [0x6a, means('accumulator OR operand', 34)],
  [0x6b, means('accumulator AND operand', 34)],
  [0x6c, means('write a device record', 71)],
  [0x6d, means('accumulator shifted left by the low byte', 34)],
  [0x70, means('compare, accumulator against a state variable', 34)],
  [0x71, means('compare, byte register against a state variable', 34)],
  [0x72, means("map a state variable's value through base slot 14", 39)],
  [0x73, means('run the base slot 11 screen program the operand indexes', 73)],
  [0x74, means('accumulate a digit into a twenty four bit value', 74)],
  [0x75, means('sound a tone: low byte the half period, high byte the cycles', 74)],
  [0x77, placed('an accumulator operation through a helper', 34)],
  [0x78, placed('an accumulator operation through a helper', 34)],
  [0x79, means('add the operand to the accumulator', 34)],
  [0x7a, means('load the accumulator with the operand', 34)],
  [0x7b, means('build an instruction at runtime and queue it', 34)],
  [0x7c, means('a per device quantity, capped at 100', 70)],
  [0x7d, means('send an infrared code', 33)],
  [0x7e, means('enter the base slot 6 mode the operand indexes', 37)],
  [0x7f, means('run the base slot 10 action list the operand indexes', 34)],
]);

/**
 * The bands each second space opcode's dispatcher tests, highest first.
 *
 * A band is `[floor, reading]`: the first entry whose floor the sub opcode reaches wins, which is
 * how the firmware's descending chain of `SUBWF` and `BNC` behaves. Anything below the last floor
 * falls off the end of the chain and does nothing.
 */
type Band = readonly [number, Reading];

const BANDS_3F: readonly Band[] = [
  [0xf0, placed('six stores, disjoint between architectures; nibble 3 is the sound enable', 74)],
  [0xe0, placed('four operations on a pair of RAM words', 73)],
  [0xd0, placed('consume the following three bytes as an argument, a six byte instruction', 73)],
  [0xb0, placed('a peripheral operation selected by operand bits 4 to 8', 73)],
];

const BANDS_1F: readonly Band[] = [
  [0xff, means('select the current binding table entry, base slot 9', 39)],
  [0xfe, placed('add the low byte to a set the interpreter keeps', 73)],
  [0xfd, placed('remove the low byte from that set', 73)],
  [0xfc, noop(73)],
  [0xfb, means('load the byte register with the low byte', 73)],
  [0xfa, means('add the low byte to the byte register', 73)],
  [0xf9, means('multiply the byte register by the low byte', 73)],
  [0xf8, means('divide the byte register by the low byte', 73)],
  [0xf7, means('execute the accumulator as an instruction, low byte its opcode', 73)],
  [0xf6, means('send the byte register to base slot 16', 39)],
  [0xf5, means('send the byte register to base slot 14', 39)],
  [0xf4, means('send the accumulator to base slot 16', 39)],
  [0xf3, means('send the accumulator to base slot 14', 39)],
  [0xf2, means('increment the state variable the low byte names', 73)],
  [0xf1, means('decrement the state variable the low byte names', 73)],
  [0xf0, means('byte register = the state variable the low byte names', 73)],
  [0xef, means('accumulator = the state variable the low byte names', 73)],
  [0xee, means('the state variable the low byte names = byte register', 73)],
  [0xed, means('the state variable the low byte names = accumulator', 73)],
  [0xec, placed('store the low byte and call a helper', 73)],
  [0xeb, means('start the base slot 12 timer the low byte indexes', 43)],
  [0xea, means('cancel the base slot 12 timer the low byte indexes', 43)],
  [0xe9, placed('split the low byte into three fields and act on them', 73)],
  [0xe8, placed('store the low byte in a RAM variable', 73)],
  [0xe7, placed('load the accumulator from one of three system registers', 73)],
  [0xe6, placed('store the low byte and call a helper', 73)],
  [0xe0, noop(73)],
];

const BANDS_0F: readonly Band[] = [
  [0xf0, noop(73)],
  [0xe0, placed('emit one to three bytes on a diagnostic channel', 73)],
  [0xc0, placed('a two field peripheral operation', 73)],
  [0xb0, placed('a one field peripheral operation', 73)],
  [0xa0, placed('a boolean peripheral operation', 73)],
  [0x80, means('move between the byte register and the accumulator', 73)],
  [0x50, noop(73)],
  [0x40, placed('a lookup whose sixteen bit result goes to scratch', 73)],
];

const BANDS_07: readonly Band[] = [
  [0xff, means('make the next state variable write silent', 74)],
  [0xfe, means("run the current binding set's list with tag 5", 39)],
  [0xfd, placed('push a register pair on the interpreter stack', 73)],
  [0xfc, placed('pop it, and act unless the slot holds the empty marker', 73)],
  [0xfb, means('cancel all four running timers', 73)],
  [0xfa, placed('a helper with no argument', 73)],
  [0xf9, means('read the clock, base slot 3', 73)],
  [0xf8, means('step the date held in state variables 3, 5 and 6', 74)],
  [0xf7, means("re-run the current mode page's tagged list", 69)],
  [0xf6, placed('a helper with no argument', 73)],
  [0xf5, placed('pop the interpreter stack and mark the slot empty', 73)],
  [0xf4, placed('a helper with no argument', 73)],
  [0xf3, placed('a helper with no argument', 73)],
  [0xf2, placed('a helper with no argument', 73)],
];

/**
 * Arch 12 moves `0x3F`'s lowest band up a nibble, from `0xB0` to `0xC0`, and puts a different
 * routine behind it.
 *
 * This is the one place the second operand space is not one table across architectures, which is
 * why the architecture is a required argument rather than an optional one. Reading an arch 12
 * `0x3F 0xC0` through the arch 14 handler says it indexes base slot 8, and the corpus refutes
 * that: indices reach 194 where that slot's leading byte is 1.
 */
function bandsFor(opcode: number, architecture: number): readonly Band[] | undefined {
  switch (opcode) {
    case 0x3f:
      return architecture === 12
        ? BANDS_3F.map((b) => (b[0] === 0xb0 ? ([0xc0, b[1]] as const) : b))
        : BANDS_3F;
    case 0x1f:
      return BANDS_1F;
    case 0x0f:
      return BANDS_0F;
    case 0x07:
      return BANDS_07;
    default:
      return undefined;
  }
}

/** What an instruction does, or nothing when its opcode has not been read. */
export function reading(instruction: Instruction, architecture: number): Reading | undefined {
  const { opcode, operand } = instruction;

  if (opcode >= STATE_WRITE_BASE) {
    return means(`state variable ${opcode - STATE_WRITE_BASE} = the operand`, 73);
  }
  if (opcode >= SECOND_SPACE_LIMIT) return MAIN.get(opcode);

  // Below `ACTION_NOOP_LIMIT` the dispatcher returns before looking at the operand at all, so
  // there is no sub opcode to resolve and every operand value means the same nothing.
  if (opcode < ACTION_NOOP_LIMIT) return noop(72);

  const bands = bandsFor(opcode, architecture);
  if (bands === undefined) return undefined;

  // Opcodes from `0x1F` up dispatch on the operand's high byte, those below it on the low byte.
  const sub = opcode >= 0x1f ? operand >>> 8 : operand & 0xff;
  for (const [floor, what] of bands) if (sub >= floor) return what;

  // Past the end of the chain: the firmware falls through to its common exit. A reading rather
  // than a gap, since the instruction is well formed and does nothing.
  return noop(73);
}

export interface ReadingCoverage {
  /** Instructions whose meaning for a config is known. */
  meaning: number;
  /** Instructions whose handler is found but whose meaning is not. */
  placement: number;
  total: number;
  /** What has no reading at all, keyed `0x3f/0xd0` for a band or `0x6e` for a plain opcode. */
  unread: Map<string, number>;
}

/** How much of a config's action lists anyone can say the meaning of. */
export function readingCoverage(
  lists: Iterable<readonly Instruction[]>,
  architecture: number,
): ReadingCoverage {
  const out: ReadingCoverage = { meaning: 0, placement: 0, total: 0, unread: new Map() };
  for (const list of lists) {
    for (const instruction of list) {
      out.total += 1;
      const r = reading(instruction, architecture);
      if (r?.depth === 'meaning') {
        out.meaning += 1;
        continue;
      }
      if (r !== undefined) {
        out.placement += 1;
        continue;
      }
      const { opcode, operand } = instruction;
      const key =
        opcode < SECOND_SPACE_LIMIT
          ? `0x${opcode.toString(16).padStart(2, '0')}/0x${(operand >>> 8).toString(16).padStart(2, '0')}`
          : `0x${opcode.toString(16).padStart(2, '0')}`;
      out.unread.set(key, (out.unread.get(key) ?? 0) + 1);
    }
  }
  return out;
}
