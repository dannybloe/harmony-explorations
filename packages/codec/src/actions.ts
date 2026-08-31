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

import { SECOND_SPACE_LIMIT, ACTION_NOOP_LIMIT, subOpcode } from './ir.ts';
import type { Instruction } from './gspm.ts';

/**
 * The opcode above which bit 7 is stripped and one routine handles everything.
 *
 * The index is `opcode - STATE_WRITE_BASE`, so it is **seven** bits wide, 0 to 127, and not the five
 * this and section 73 both said<!--superseded-->: the corpus emits up to opcode `0xC5`, index 69,
 * over 4138 state writes, and base slot 13's own tables reach index 93. Every index below 128 makes
 * `0x80 | index` and `0x80 + index` the same byte, which is why the wrong width could sit next to
 * right code for a month. Section 139.
 */
export const STATE_WRITE_BASE = 0x80;

/**
 * The band opcode whose sub opcode is the operand's **high** byte, `BANDS_1F` below.
 *
 * Exported because `inventory.ts` has to recognise one instruction of this band by sight, and the
 * alternative was a bare `0x1f` in a second file. The two sub opcodes it needs are the pair below.
 */
export const STATE_BAND = 0x1f;

/** Sub opcode `0xF0`: the byte register takes the state variable the operand's low byte names. */
export const BYTE_REGISTER_FROM_STATE = 0xf0;

/** Sub opcode `0xEE`: the state variable the operand's low byte names takes the byte register. */
export const STATE_FROM_BYTE_REGISTER = 0xee;

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
 * Every opcode in this space has a reading since section 108, which read the last three, `0x65`,
 * `0x66` and `0x76`. No config in the corpus uses any of those, so they cost the number nothing;
 * they are here because an absent entry and a placement are different claims.
 *
 * **The block `0x65` to `0x6E` is arch 14 only**, `ARITHMETIC_BLOCK`, section 107. Arch 9 and arch
 * 12 test every one of those opcodes in the same descending ladder and branch to the dispatcher's
 * exit, so an entry below is a reading for arch 14 and a no-op everywhere else. This is the second
 * place the language is not one table across architectures, after arch 12's `0x3F` band `0xC0`.
 *
 * An entry may be a **function of the operand**, for the opcodes whose handler dispatches again on
 * a field of its own: `0x70` and `0x71` resolve eight operations out of bits 8 to 11 of the operand,
 * and read bit 15 as well.
 */
type MainEntry = Reading | ((operand: number) => Reading);

/**
 * The operations `0x70` and `0x71` select with the low nibble of the operand's high byte.
 *
 * Six comparisons in complementary pairs and two updates, from the `XORLW` chain at `0x0EEA8` on
 * the Harmony 700 and `0x25198` on the One, which are the same chain. The left hand side is the
 * accumulator for `0x70` and a byte register for `0x71`; the right hand side is always the state
 * variable the operand's low byte names. Nibbles 8 to 15 fall off the end of the chain, and bits
 * 12 to 14 are read by nothing and zero in every instruction in the corpus, so the high byte is a
 * nibble and a flag with three dead bits between them.
 *
 * Section 34 read this as "compare" alone, which is what six of the eight are. Nibble 7 is what a
 * generator builds a remainder out of, so calling it a comparison hid the whole of section 107.
 */
const STATE_OPERATIONS: readonly (readonly [string, boolean])[] = [
  ['is equal to', true],
  ['is not equal to', true],
  ['is greater than', true],
  ['is less than', true],
  ['is greater than or equal to', true],
  ['is less than or equal to', true],
  ['is added to', false],
  ['is subtracted from', false],
];

/** Opcodes only arch 14 implements: elsewhere the ladder tests them and returns. Section 107. */
export const ARITHMETIC_BLOCK: ReadonlySet<number> = new Set([
  0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e,
]);

/**
 * `0x70` and `0x71`, whose operand bits 8 to 11 pick one of eight operations on a state variable.
 *
 * A comparison is a meaning: it sets the condition flag the caller's next instruction consumes. An
 * update is a meaning too, and a stronger one, because the value written is clamped to the range
 * base slot 13 states for that variable, which is a rail an editor has to respect.
 */
function stateOperation(opcode: number, operand: number): Reading {
  const nibble = (operand >>> 8) & 0x0f;
  const entry = STATE_OPERATIONS[nibble];
  // Nibbles 8 to 15 reach no arm of the chain. The variable has already been read by then, so the
  // instruction costs a read and changes nothing, which is a reading and not a gap.
  if (entry === undefined) return noop(107);
  const left = opcode === 0x70 ? 'the accumulator' : 'the byte register';
  const [what, compares] = entry;
  if (!compares) {
    return means(
      `${left} ${what} the state variable the low byte names, clamped to its stated range`,
      107,
    );
  }
  // Bit 15 is the **else** arm, section 140. Section 34 saw the bit and could only say the
  // dispatcher masks it off with `& 0x0F`, which is true of the nibble decode above and not of the
  // instruction: the same handler tests it with a `BTFSS`, at `0x0EF62` on the Harmony 700, `0x25252`
  // on the Harmony One, `0x01EFE` on the Harmony 525 and `0x134A0` on the Harmony 880, so all seven
  // images and all four architectures we hold firmware for implement it identically, which is not
  // something to assume here: three structures in this language are per architecture.
  // A false comparison always skips the next instruction by fetching
  // it; with the bit set, a **true** one additionally zeroes the three bytes two slots ahead in the
  // queue, and opcode `0x00` does nothing. So the two instructions after the comparison are the two
  // arms, and whichever is not taken is neutralised rather than jumped over. It has to be
  // neutralised, because the handler returns before the arm runs and the interpreter has no way to
  // skip an instruction it has not reached: which is also why the queue is a writable copy in RAM.
  return means(
    `condition: ${left} ${what} the state variable the low byte names, ` +
      (operand & 0x8000
        ? 'and the next two instructions are its two arms'
        : 'and the next instruction runs only if it holds'),
    operand & 0x8000 ? 140 : 34,
  );
}

const MAIN: ReadonlyMap<number, MainEntry> = new Map<number, MainEntry>([
  // `0x65` and `0x66` are two more producers into the diagnostic channel `0x0F`'s `0xE0` band
  // feeds, which section 108 read to the end: it is a byte at a time page program into a region of
  // the external serial flash. Placement, because nothing names what the bytes are for.
  [0x65, placed("appends the operand's low byte and then its high byte to the flash journal", 108)],
  [0x66, placed("appends the operand's high byte to the flash journal", 108)],
  [0x67, placed('third producer into the infrared queue, tag 5', 42)],
  [0x68, means('accumulator shifted right by the low byte', 34)],
  [0x69, means('accumulator XOR operand', 34)],
  [0x6a, means('accumulator OR operand', 34)],
  [0x6b, means('accumulator AND operand', 34)],
  [0x6c, means('write a device record', 71)],
  [0x6d, means('accumulator shifted left by the low byte', 34)],
  // The remainder of the same division the divide opcode below takes the quotient of: one helper,
  // two result slots. Arch 14 only, like the rest of this block. Section 107.
  [0x6e, means('accumulator modulo the operand, unsigned', 107)],
  // Not absent and not a gap: the handler reads the accumulator, tests it for zero and returns by
  // the same path either way, on all three architectures whose firmware we hold. Section 107.
  [
    0x6f,
    {
      what: 'nothing: the handler tests the accumulator for zero and both arms return',
      section: 107,
      depth: 'meaning',
      noop: true,
    },
  ],
  [0x70, (operand: number): Reading => stateOperation(0x70, operand)],
  [0x71, (operand: number): Reading => stateOperation(0x71, operand)],
  [0x72, means("map a state variable's value through base slot 14", 39)],
  [0x73, means('run the base slot 11 screen program the operand indexes', 73)],
  [0x74, means('accumulate a digit into a twenty four bit value', 74)],
  [0x75, means('sound a tone: low byte the half period, high byte the cycles', 74)],
  // Section 34 could only say "an accumulator operation through a helper" because it had not read
  // the helpers. They are a restoring division and a 16 by 16 multiply, and both are compiled into
  // all four images. Section 107.
  // Positions a serial flash cursor at the record its operand indexes, in a three byte pointer
  // array the section could not identify. Section 108.
  [
    0x76,
    placed(
      'positions a serial flash cursor at the record its operand indexes, remembering the index ' +
        'so a later instruction walks forward instead of restarting',
      108,
    ),
  ],
  [0x77, means('accumulator divided by the operand, unsigned; the quotient', 107)],
  [0x78, means('accumulator times the operand, the low sixteen bits', 107)],
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
 *
 * A band's reading may be a **function of the whole operand** instead of a constant, for the one
 * band whose handler dispatches again on a field of its own. Arch 12's `0xC0` is that band: one
 * Reading for it would have to pick a single depth for three unrelated mechanisms, and the honest
 * answer differs per selector. Section 103.
 */
type Band = readonly [number, Reading | ((operand: number) => Reading)];

const BANDS_3F: readonly Band[] = [
  // The nibble selects through an `XORLW` chain whose **case set differs per architecture**, so the
  // wording says which is which rather than stating one remote's as everyone's. It read "six
  // stores, disjoint between architectures; nibble 3 is the sound enable", and nibble 3 is the
  // sound enable on arch 12 (Harmony One), section 74, while on arch 14 (Harmony 600 and 700) the
  // chain's cases are 0, 1, 2, 6 and 7, so nibbles 3 and 5 fall into the default and do nothing,
  // section 73. One line cannot be both, and the corpus uses those nibbles 84 times.
  [0xf0, placed('six stores selected by the nibble through a per architecture chain; nibble 3 is '
    + 'the sound enable on arch 12 and falls into the default on arch 14', 74)],
  [0xe0, placed('four operations on a pair of RAM words', 73)],
  [0xd0, placed('consume the following three bytes as an argument, a six byte instruction', 73)],
  // Arch 14's lowest band, and the wording is deliberately its own. Describing it as "a peripheral
  // operation selected by the operand's low bits" was arch 12's `0x24F24` again, the mistake
  // section 102 records, put back on arch 14's floor: section 73 says `0x0F782` **seeks base slot
  // 8** and bounds the operand against that section's leading byte. `BANDS_3F_ARCH12` has the
  // peripheral one, at its own floor.
  [0xb0, placed("arch 14's handler seeks base slot 8 and bounds the operand against its leading "
    + 'byte', 73)],
];

/**
 * The Harmony 525's own `0x3F` bands, read out of `h525_code`.
 *
 * Four bands like everywhere else and **the lowest is at `0xC0`, not `0xB0`**, so the shared table
 * gave a `0xC0` to `0xCF` instruction arch 14's base slot 8 reading and gave one at `0xB0` to `0xBF`
 * a reading where this firmware simply exits. The ladder: `0x01F78` tests `0xF0`, `0x01F8E` tests
 * `0xE0`, `0x01FD4` tests `0xD0` and hands the six byte path at `0x01FDA` two more fetched bytes,
 * and `0x02030` tests `0xC0`, masks the low nibble into `0x3DC` and calls `0x02432`. Below `0xC0`
 * every arm branches to the dispatcher's exit at `0x023E4`.
 *
 * `0x02432` is neither arch 12's `0x24F24` nor arch 14's `0x0F782`: it reads a bit of `0x109` and
 * switches on the stored nibble. It has not been read further, so the entry is placement and says
 * so, which is the honest depth for a handler nobody has followed. Section 139 entry 23.
 */
const BANDS_3F_ARCH9: readonly Band[] = [
  BANDS_3F[0] as Band,
  BANDS_3F[1] as Band,
  BANDS_3F[2] as Band,
  [0xc0, placed('the handler at 0x02432, which reads a bit of 0x109 and switches on the nibble; '
    + 'not arch 12\'s peripheral handler and not arch 14\'s base slot 8 seeker', 139)],
];

const BANDS_1F: readonly Band[] = [
  [0xff, means('select the current binding table entry, base slot 9', 39)],
  // **A stack and not a set**, section 176, which is what moved these two from `placed` to
  // `means`. Key lookup walks a stack of base slot 9's binding lists top down and the first match
  // wins, so the low byte is an index into that array and the ordering is the whole mechanism: it
  // is what lets one list override another rather than merely coexist with it. The old wording
  // said "a set the interpreter keeps", <!--superseded--> which was not vague but wrong in the
  // one respect that carries the behaviour. It also explains base slot 9's enter and leave
  // handlers, section 67,
  // which the spec recorded structurally and never accounted for.
  //
  // The firmware reading is trelowney's and has not been repeated here. What the corpus adds is
  // that the counts are fixed scaffolding: 5 and 0 on arch 9 and arch 14, 13 and 8 on arch 8,
  // 14 and 9 on arch 12, identical within an architecture whether a config drives one device or
  // seven, where `0xFF` above swings from 3 to 180 across the same configs.
  [0xfe, means('push a base slot 9 binding list onto the key lookup stack', 176)],
  [0xfd, means('remove that base slot 9 binding list from the key lookup stack', 176)],
  // Not a no-op, and the dispatcher is not where to look for it: the instruction **fetch** tests
  // for this exact opcode and band before dispatching, and routes the low byte to the stack of
  // active handlers instead. So the dispatcher's arm genuinely does nothing and the instruction
  // never reaches it. Section 104, and no config in the corpus emits one.
  [
    0xfc,
    means('deliver the low byte as a firmware event to the innermost handler that accepts it', 104),
  ],
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
  [BYTE_REGISTER_FROM_STATE, means('byte register = the state variable the low byte names', 73)],
  [0xef, means('accumulator = the state variable the low byte names', 73)],
  [STATE_FROM_BYTE_REGISTER, means('the state variable the low byte names = byte register', 73)],
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
  [0xe0, placed('append one to three bytes to the flash journal, `0x159F4`', 108)],
  [0xc0, placed('a two field peripheral operation', 73)],
  [0xb0, placed('a one field peripheral operation', 73)],
  [0xa0, placed('a boolean peripheral operation', 73)],
  [0x80, means('move between the byte register and the accumulator', 73)],
  [0x50, noop(73)],
  [0x40, placed('a lookup whose sixteen bit result goes to scratch', 73)],
];

/**
 * The Harmony 525's own `0x0F` ladder, read out of `h525_code` at `0x02246` to `0x02344`.
 *
 * **`BANDS_0F` was one table for four architectures and that was not established anywhere.** The
 * shared entries come from section 73, which read the arch 12 (Harmony One) and arch 14 (Harmony 600
 * and 700) dispatchers; arch 9 was never one of them. Its ladder differs in four ways, and one of them
 * was answering for real instructions: the two Harmony 525 configs emit `0x0F` with low byte `0x60` or
 * `0x61` twelve times, the shared table sent those to its `[0x50, noop]` entry, and the reading came
 * back "nothing: the dispatcher returns without acting" at depth `meaning`. The firmware masks bit 0
 * of the low byte into `0x0C3` and calls `0x03602`. A no-op is the strongest claim this table can make
 * and it was being made, for another remote's dispatcher, about a call.
 *
 * `docs/findings.md` section 73 is the shared reading and section 139 is this one. Disassembled with
 * `--part 4550`: on this part the default register map names the wrong registers, section 80.
 *
 * Read conservatively. Where the arm's mechanism is visible the meaning is stated; where it only
 * reaches a routine nobody has followed, the depth is placement, which is what the arch 14 table would
 * have claimed and could not support.
 */
const BANDS_0F_ARCH9: readonly Band[] = [
  [0xf0, noop(139)],
  // A three case switch on the low nibble that feeds one or two bytes to `0x0108C`, or calls
  // `0x010A4` for case 0. Not arch 14's flash journal append, which is what the shared table said.
  [0xe0, placed('one to three bytes handed to `0x0108C`, selected by the low nibble', 139)],
  // Tested and skipped: the arm branches to the dispatcher's exit before doing anything.
  [0xd0, noop(139)],
  [0xc0, placed('two fields, bits 0 to 1 and bits 2 to 3, into `0x1EA` and `0x1E9`, `0x04212`', 139)],
  [0xb0, placed('the low nibble into `0x1E0`, then `0x03DE8`', 139)],
  [0xa0, placed('the low nibble as a boolean into `0x3EA`, then `0x05C88`', 139)],
  // Gated on PORTB bit 5, which the other architectures' ladders have no equivalent of at all.
  [0x90, placed('gated on a port bit: the low nibble into `0x102`, then `0x07944`', 139)],
  [0x80, means('move between the byte register and the accumulator', 139)],
  [0x70, noop(139)],
  // The arm the shared table called a no-op.
  [0x60, placed('bit 0 of the low byte into `0x0C3`, then `0x03602`', 139)],
  // Below `0x60` the chain falls off its end, so nothing. Stated rather than left implicit, because
  // the shared table has a **real** arm at `0x40` and this architecture does not.
  [0x00, noop(139)],
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
 * Arch 12's own lowest `0x3F` band, at `0xC0` where arch 14 has `0xB0`.
 *
 * This is the one place the second operand space is not one table across architectures, which is
 * why the architecture is a required argument rather than an optional one. Reading an arch 12
 * `0x3F 0xC0` through the arch 14 handler says it indexes base slot 8, and the corpus refutes
 * that: indices reach 194 where that slot's leading byte is 1.
 *
 * **It used to be built by renaming arch 14's `0xB0` entry to `0xC0`**, which kept arch 14's
 * description on arch 12's handler. That is the mistake section 73 warns about in the same breath,
 * committed one line below the warning, and the text survived only because it was vague enough to
 * read as true. Arch 12 has its own entry now, from `0x24F24` reached by the dispatcher at
 * `0x25330`, section 102.
 *
 * **And it resolves by selector rather than carrying one reading**, section 103, because `0x24F24`
 * dispatches on the selector into three unrelated mechanisms and only one of them has a meaning.
 * The single reading it had before was accurate and had to call the whole band placement, which
 * understated 68 of the 106 uses in each One config.
 */

/**
 * The selector, operand bits 4 to 8. Five bits, so bit 8 is shared with the band's own high byte:
 * selectors 0 to 15 arrive with high byte `0xC0` and 16 to 31 with `0xC1`.
 */
export const BAND_3F_C0_SELECTOR = (operand: number): number => (operand >>> 4) & 0x1f;

/** Selector 17, the display light state machine at `0x23952`. */
export const BAND_3F_C0_LIGHT = 17;
/** Selector 16, which drives `LATC` bit 5 and nothing this project can name. */
export const BAND_3F_C0_PIN = 16;
/** Selectors 0 to this, the bit table past base slot 15 group 9's declared entries. */
export const BAND_3F_C0_PROPERTY_LIMIT = 12;

/**
 * What one arch 12 `0x3F` `0xC0` instruction does, by selector, the way `0x24F24` decides it.
 *
 * Only selector 17 is a meaning. Its effect is stated by base slot 15 groups 0, 1, 4 and 9, so an
 * editor could offer "turn the display light off", "bring it up to the automatic level" and "fade
 * rather than snap" and be describing the config rather than the silicon. The other two are
 * placement: `LATC` bit 5 has no name, and neither do the thirteen properties, whose table is the
 * same in both One configs so no comparison can name them either.
 */
function band3fC0Arch12(operand: number): Reading {
  const selector = BAND_3F_C0_SELECTOR(operand);
  if (selector === BAND_3F_C0_LIGHT) {
    return means(
      "set the display's light level: bits 1 to 3 pick one of eight states and bit 0 fades " +
        'rather than snaps. States 2 to 5 take a level from base slot 15 group 1 and a pair of ' +
        "device levels from group 9, state 6 picks the state from the measured band, states 0 " +
        'and 1 turn it off',
      103,
    );
  }
  if (selector === BAND_3F_C0_PIN) {
    // Placement, deliberately. Section 106 names the pin as the enable of the I2C device at 0x60,
    // which is its immediate effect and not what it means for a config: nobody knows what the
    // device does, so there is nothing here to put in front of a user.
    return placed(
      'enables the I2C device at address 0x60, LATC bit 5, set when bits 1 to 3 are nonzero',
      106,
    );
  }
  if (selector <= BAND_3F_C0_PROPERTY_LIMIT) {
    // Bits 1 to 3, not bit 0: `0x24F6C` normalises `0xEBB` to a boolean and bit 0 never reaches the
    // handler. Section 103 had this the other way round for a few hours.
    return placed(
      'sets channel ' +
        String(selector) +
        ' of the I2C device at 0x60 to the two bit value base slot 15 states for bits 1 to 3 ' +
        'being nonzero, in the twelve bytes above group 9',
      106,
    );
  }
  // 13 to 15 and 18 to 31 fall to the handler's exit, and the corpus never emits one.
  return noop(103);
}

/**
 * The second dispatcher tests **ranges**, not the four canonical opcodes.
 *
 * `0x0F160` on the Harmony 700 and `0x25330` on the One are the same descending pair of
 * comparisons: at or above `0x3F` takes the `0x3F` bands, at or above `0x1F` the `0x1F` bands, at or
 * above `0x0F` the `0x0F` bands, and the rest the `0x07` ones. So `0x20` behaves exactly like
 * `0x1F`. Every config in the corpus emits only the four canonical values, which is why reading this
 * as four exact cases cost nothing; it was still wrong. Section 108.
 */
const BAND_FLOORS: readonly (readonly [number, readonly Band[]])[] = [
  [0x3f, BANDS_3F],
  [STATE_BAND, BANDS_1F],
  [0x0f, BANDS_0F],
  [ACTION_NOOP_LIMIT, BANDS_07],
];

function bandsFor(opcode: number, architecture: number): readonly Band[] | undefined {
  for (const [floor, bands] of BAND_FLOORS) {
    if (opcode < floor) continue;
    // Arch 9 (Harmony 525) has its own `0x0F` ladder, read from its own firmware. Until 13 August
    // 2026 it borrowed arch 14's, which is how twelve of its instructions were reported as no-ops.
    if (bands === BANDS_0F && architecture === 9) return BANDS_0F_ARCH9;
    if (bands !== BANDS_3F) return bands;
    // Arch 9 (Harmony 525) has its own lowest floor too, `0xC0` like arch 12's and with a different
    // handler behind it. Until 13 August 2026 it borrowed arch 14's `0xB0`, so a `0xC0` instruction
    // read as a base slot 8 seek and a `0xB0` one read as anything at all where its firmware exits.
    if (architecture === 9) return BANDS_3F_ARCH9;
    if (architecture !== 12) return bands;
    return BANDS_3F.map((b) => (b[0] === 0xb0 ? ([0xc0, band3fC0Arch12] as const) : b));
  }
  return undefined;
}

/** What an instruction does, or nothing when its opcode has not been read. */
export function reading(instruction: Instruction, architecture: number): Reading | undefined {
  const { opcode, operand } = instruction;

  if (opcode >= STATE_WRITE_BASE) {
    return means(`state variable ${opcode - STATE_WRITE_BASE} = the operand`, 73);
  }
  if (opcode >= SECOND_SPACE_LIMIT) {
    // The arithmetic block exists only on arch 14. Everywhere else the ladder tests the opcode and
    // branches to the exit, so the reading is "nothing" rather than the arch 14 one. Section 107.
    if (architecture !== 14 && ARITHMETIC_BLOCK.has(opcode)) return noop(107);
    const entry = MAIN.get(opcode);
    return typeof entry === 'function' ? entry(operand) : entry;
  }

  // Below `ACTION_NOOP_LIMIT` the dispatcher returns before looking at the operand at all, so
  // there is no sub opcode to resolve and every operand value means the same nothing.
  if (opcode < ACTION_NOOP_LIMIT) return noop(72);

  const bands = bandsFor(opcode, architecture);
  if (bands === undefined) return undefined;

  // Opcodes from `0x1F` up dispatch on the operand's high byte, those below it on the low byte. The
  // boundary is the band floor, not the canonical opcode, for the same reason as `BAND_FLOORS`.
  //
  // **Through `subOpcode`, because this was a second copy of it.** The expression here read
  // `opcode >= 0x1f ? operand >>> 8 : operand & 0xff`, byte for byte what `ir.ts` already computes,
  // with the boundary as a bare literal in both. The two guards above narrow the opcode to exactly
  // `subOpcode`'s domain, so it cannot answer undefined here, and the fallback is the safe half of
  // the split rather than a non null assertion.
  const sub = subOpcode(instruction)?.value ?? (operand & 0xff);
  for (const [floor, what] of bands) {
    if (sub >= floor) return typeof what === 'function' ? what(operand) : what;
  }

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
  /**
   * Three byte slots that are the **argument** of the six byte instruction before them, not
   * instructions.
   *
   * Counted separately and excluded from `total` since section 139. `0x3F` with a high byte in
   * `0xD0` to `0xDF` consumes the following three bytes, section 73, and this table had been
   * resolving those bytes as though they were an instruction of their own: they decode as `0x7F` 55
   * times, `0x7E` 19 and `0x72` once, all at depth `meaning`, so 75 arguments across the corpus were
   * counted as instructions whose meaning is known. Section 73 recorded that consequence and nothing
   * acted on it, because a decoder that misreads a boundary and then realigns produces no error.
   */
  arguments: number;
}

/**
 * Whether an instruction consumes the following three byte slot as its argument.
 *
 * `0x3F` with an operand high byte in `0xD0` to `0xDF`, section 73, which pops three bytes off the
 * interpreter's own queue rather than fetching an instruction. Every one of the 75 in the corpus sits
 * at index 0 of a two slot list, so the whole list is one instruction.
 *
 * **A caller that walks a list for meaning has to skip the slot after this returns true.** A caller
 * that walks it for bytes must not, which is why `Container.actionList` still returns both and this is
 * a predicate rather than a filter: the emitter reproduces the slot and the reader must not read it.
 */
export function takesFollowingSlot(instruction: Instruction, architecture: number): boolean {
  if (instruction.opcode !== SIX_BYTE_OPCODE) return false;
  if (bandsFor(instruction.opcode, architecture) === undefined) return false;
  const sub = instruction.operand >>> 8;
  return sub >= SIX_BYTE_BAND_FLOOR && sub < SIX_BYTE_BAND_CEILING;
}

/** `0x3F`, the opcode whose `0xD0` band is six bytes long. */
export const SIX_BYTE_OPCODE = 0x3f;
export const SIX_BYTE_BAND_FLOOR = 0xd0;
/** `0xE0` is the next band up and is four operations on a pair of RAM words, three bytes like the rest. */
export const SIX_BYTE_BAND_CEILING = 0xe0;

/** How much of a config's action lists anyone can say the meaning of. */
export function readingCoverage(
  lists: Iterable<readonly Instruction[]>,
  architecture: number,
): ReadingCoverage {
  const out: ReadingCoverage = {
    meaning: 0,
    placement: 0,
    total: 0,
    unread: new Map(),
    arguments: 0,
  };
  for (const list of lists) {
    let skip = false;
    for (const instruction of list) {
      if (skip) {
        // The argument of the six byte instruction before it. Not resolved, because resolving it is
        // what produced 75 instructions of false `meaning`.
        out.arguments += 1;
        skip = false;
        continue;
      }
      skip = takesFollowingSlot(instruction, architecture);
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
