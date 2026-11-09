/**
 * A code family's definition in the shape a Harmony Touch reads, written from a row of our own rhythm table,
 * and a key code written into it. `todo-touch.md` 5.3, part A.
 *
 * **Why the Touch needs a definition at all.** A Harmony Touch is given no command as durations: it is given
 * each command as the catalogue writes it, a family's name and a number, and the family's definition beside
 * it, an `IrProtocol` in the sync's `ProtocolList`, and it works the durations out itself every time it
 * sends, `reference/architectures/harmony-touch/devices-and-infrared.md`, "Built at the moment of sending".
 * The definitions a sync measured are Logitech's catalogue definitions word for word. Decision 15's note of 3
 * November 2026 is the route this file takes: **the definition is written by our code from our own table,
 * never copied out of the archive's files**, so no definition of theirs sits in this repository or in
 * FreeHarmony, and a device that exists neither in the archive nor at Logitech, learned off its own remote,
 * gets a definition by the same writer.
 *
 * **What a row states and what a definition needs, and the gap between them.** A row of `PROTOCOLS` states
 * the frame: the lead in, the two cells (or the biphase half cell, or the cell table) and the carrier. A
 * definition needs more, because the Touch sends whole transmissions: what follows the frame (a stop mark, a
 * gap, the constant length a frame is padded to), what is sent once before the repetitions and what repeats.
 * **A row states that only in its blocks**: `held`, one repetition, and the first transmission, `tail` at
 * the compiler's own repeat count where the definition states one and otherwise `opening`, the same at one
 * repetition. So the definition is read out of the blocks, and a row with no `held` block is refused: it
 * states no trailer and no gap, and a definition made without them would send its frames back to back. Since
 * `todo-touch.md` 5.3.4 every stated row carries `held`, and 8 rows of the table's 681 still carry none, all
 * measured ones: 5 are refused for that, and 3 earlier as whole record shapes; 577 are written, and the 96 refused for a width the family's name does not give write at the
 * widths a caller states, `test/families/harmony-touch/touch-definition.test.ts`.
 *
 * **Reading a block back into segments is the inverse of `blockOfDefinition` in `archiveblock.ts`**, which built
 * those blocks out of Logitech's definitions in the first place, and of `pulsesOfBlock` in `irframe.ts`, which
 * plays them. Each emission of a block is one copy of a frame with what directly follows it, its trailer and
 * its pad, or one run of literal words; `blockOfDefinition` pushes each emission as its own items, which is
 * what makes the boundaries readable here. A copy becomes an encoded segment, a run of words a code segment,
 * and the stored form's one extra microsecond on a block's last duration, `blockOfDefinition`'s first
 * convention, is taken off again, since the Touch sends the signal and not the stored form.
 *
 * **The spelling follows Logitech's where the round trip needs it, and ours elsewhere.** A definition can
 * spell one wire in several ways, a cell as (mark, space) or as (space, mark) with the lead in shifted by
 * one, and the Touch sends all of them alike. `rhythmOfDefinition` in `archive.ts` reads only some of them
 * back as the row they came from, so three cases take Logitech's spelling: a pulse width family (Sony's
 * `header [2400]` and cells of (600 space, carried mark)), a family whose first mark differs from the rest
 * (the Sharp scheme's lone 270 header), and a family whose lead in goes out once before the repetitions
 * (JVC's `KeyCodeStart`). Every other row is spelled the way our table states it.
 *
 * **No toggle bit, because no row of our table states one.** A family such as RC5 flips one bit on every
 * press so a device can tell a second press from a held one, and Logitech's definitions name that bit, which
 * the Touch replaces with its own state on each send. Ours name none, so a Touch given one of ours sends a
 * toggling family's code unchanged on every press; the closure counts the codes that differ for that alone.
 *
 * **Nothing here is about one remote's family of configurations**: the Harmony Touch reads these documents
 * and nothing else does, so this folder is the Touch's own, as `documents.ts` says, and no family of
 * `families/` is asked anything.
 */
import { segmentRefs, type ArchiveProtocol } from '../../catalogue/archive.ts';
import type { BiphaseTimings, BlockTail, CellTimings, FrameShape, FrameTimings } from '../../infrared/irframe.ts';
import type { StatedProtocol } from '../../infrared/protocols.ts';
import { biphaseOf, cellsOf, statedCode, timingsOf, type StatedCode, type StatedWord } from '../../infrared/stated.ts';
import type { Atom, CodeSegment, Encoding, Id, IrProtocol, IrSegment, SegmentReference } from './documents.ts';

/** Why a row could not be written as a definition. Counted by the closure rather than thrown. */
export type DefinitionRefusal =
  | 'a whole record shape, which no segment of a definition states'
  | 'the row states its frame and not its repetition, so no trailer and no gap'
  | 'a carrier that does not give the row\'s period'
  | 'the family\'s name states no width for its values and none was given'
  | 'a width that is not a whole number of cells'
  | 'a copy names a rhythm the row does not state'
  | 'a copy\'s own lead in before a copy that sends the rhythm\'s'
  | 'a copy\'s own lead in followed by something other than its copy'
  | 'a copy\'s own lead in before a spelling that states a header of its own'
  | 'a pad that follows no copy'
  | 'a padded block with no total to solve its pads from'
  | 'a padded block whose other copies vary in length'
  | 'a padded block whose pads do not divide evenly'
  | 'pads of a stated period and pads solved from a total in one block'
  | 'a pad longer than its period before the block\'s end'
  | 'the values of a code are sent out of order'
  | 'more segments than a one digit index names'
  | 'more literal runs than the catalogue has words for'
  | 'a pulse width frame with an opening mark or a set mark of its own'
  | 'a pulse width lead in whose space is not the cell\'s constant half, and nothing after the frame to take that half out of'
  | 'a frame stating its carried half first and an opening mark of its own'
  | 'an opening mark of its own and no constant half after the frame to shift it onto'
  | 'a biphase opening mark of its own'
  | 'a biphase copy with no lead in'
  | 'a frame shape this file cannot spell';

/** Why a code could not be written into a definition. */
export type KeyCodeRefusal =
  | 'the code states a release, which the definition does not send'
  | 'the code states another number of values than the definition sends'
  | 'the definition names a segment it does not hold'
  | 'a segment states no width'
  | 'a value wider than its cell segment'
  | 'a family name the notation cannot carry';

/**
 * Whether `definitionOfRow` refused. **A guard rather than `'refusal' in x`**, because a definition is an
 * `IrProtocol`, which carries every field it is given and so has an index signature: `in` cannot tell the
 * two apart for the type checker and leaves the refusal typed `unknown`.
 */
export function isDefinitionRefusal(
  x: IrProtocol | { readonly refusal: DefinitionRefusal },
): x is { readonly refusal: DefinitionRefusal } {
  return typeof (x as { refusal?: unknown }).refusal === 'string' && (x as { __type?: unknown }).__type === undefined;
}

/** What `definitionOfRow` may be told besides the row. */
export interface DefinitionOptions {
  /**
   * The width in bits of each value a code states, by its place in the code, or one width for all of them.
   *
   * **Absent, the family's name states it**, read by `statedCode`, the codec's one reading of the notation,
   * so the rule is the one every other caller gets: one width before `Bit` given to every value, or as many
   * widths as values paired in order. That is right for a two cell family on 179 of the 202 multi value
   * families section 230 measured and is not to be trusted for a cell table family, where the name's number
   * is a digit count, a bit count or neither, section 231; a caller that knows the width, as a learned code
   * does, passes it.
   */
  readonly bits?: number | readonly number[];
  /**
   * The carrier in hertz, where the caller knows it. The row states a period in nanoseconds, truncated,
   * `periodOfCarrier`, so several carriers give one period and the row alone cannot say which;
   * `carrierOfPeriod` picks one. A carrier given here has to give the row's own period.
   */
  readonly carrierHz?: number;
}

/**
 * The carrier a row's period most likely came from: of every whole number of hertz whose period truncates to
 * the row's, the one with the most trailing zeros, and the smallest of those.
 *
 * **A period truncated to whole nanoseconds loses the carrier**: 26315 nanoseconds is 38000 and 38001 hertz
 * alike, and at the carriers of a few hundred kilohertz the test families state, a hundred whole numbers. The
 * rule is a reading of how Logitech writes a carrier, in round numbers, and its score is the closure's: it
 * gives Logitech's own carrier for 641 of the table's 681 rows, every one of which the archive names,
 * `test/families/harmony-touch/touch-definition.test.ts`; `ATI 21 Bit`, a radio family at 433 MHz, is one of the 40 it misses. **The choice matters by one nanosecond at most**, since the Touch
 * rounds the period of whichever carrier it is given, `roundedPeriodOfCarrier`, and every candidate's period
 * truncates to the same number.
 */
export function carrierOfPeriod(periodNs: number): number | undefined {
  if (!(periodNs > 0)) return undefined;
  // The carriers whose truncated period is this one: 1e9 / hz in [periodNs, periodNs + 1).
  const lo = Math.floor(1e9 / (periodNs + 1)) + 1;
  const hi = Math.floor(1e9 / periodNs);
  for (let zeros = 9; zeros >= 0; zeros -= 1) {
    const step = 10 ** zeros;
    const first = Math.ceil(lo / step) * step;
    if (first <= hi && Math.floor(1e9 / first) === periodNs) return first;
  }
  return undefined;
}

// ---------------------------------------------------------------------------------------------------
// Reading a block back into its emissions
// ---------------------------------------------------------------------------------------------------

/** One copy of a frame and what directly follows it, as `blockOfDefinition` emits it. */
interface CopyEmission {
  readonly kind: 'copy';
  /** Which of the code's values it sends. */
  readonly at: number;
  /** Which of the row's rhythms it goes out in: 0 the row's own, k the `also` entry k - 1. */
  readonly shape: number;
  /** A copy without the rhythm's lead in. */
  readonly bare: boolean;
  /** The words that follow it, merged, signed microseconds. */
  readonly trailer: readonly number[];
  /** The constant length the copy is padded to, from its start, or undefined where it is not padded. */
  readonly total: number | undefined;
  /**
   * The copy's own lead in, signed microseconds, where its segment states one that is not the rhythm's: the
   * block's `ofCopy` words in front of a bare copy. Empty otherwise. It is part of the copy's segment, so the
   * copy's start, and with it a padded copy's length, counts from the first of these words.
   */
  readonly head: readonly number[];
}

/** A run of literal words between copies: a code segment. */
interface WordsEmission {
  readonly kind: 'words';
  readonly words: readonly number[];
}

type Emission = CopyEmission | WordsEmission;

/** One item of a block as read, before its pads are solved. */
type RawEmission =
  | { kind: 'copy'; at: number; shape: number; bare: boolean; trailer: number[] | undefined;
    pad: { extra: number; period: number | undefined } | undefined; head: number[] }
  | { kind: 'words'; words: number[] };

/**
 * Adjacent durations of one level joined, zeros dropped: the wire, which is what a segment states.
 *
 * **Why joining is safe here.** A block chunks a long gap at 32767, `GAP_CHUNK_US`, which is a stored word's
 * width and nothing the signal knows about; the Touch chunks any duration over 32767 itself, "A duration is a
 * 16 bit word", so a segment states the gap whole.
 */
function merged(words: readonly number[]): number[] {
  const out: number[] = [];
  for (const w of words) {
    if (w === 0) continue;
    const last = out[out.length - 1];
    if (last !== undefined && (last > 0) === (w > 0)) out[out.length - 1] = last + w;
    else out.push(w);
  }
  return out;
}

/**
 * The stored microsecond off a run's last word, read on the words as the block states them, before they are
 * joined.
 *
 * **A last word of zero carries none, unless the word before it is the microsecond itself.** Two writers put
 * it there and they differ exactly at a zero. `blockOfDefinition` adds the sign of the last word, which is
 * nothing for a zero: `QE Time Delay B 20K` closes on a zero length mark, floored to 1 by `atomUs`, and a
 * zero space, `[1, 0]`, and taking a microsecond off it removed the 1. Logitech's compiler, measured, carves
 * the microsecond off a trailing gap as a word of its own, a silence of 1, and closes on a zero after it:
 * `Microsoft 30 Bit`'s `[..., -17938, -1, 0]`. So a zero takes one off the word before it only where that word
 * is a silence of exactly one microsecond.
 */
function unstored(words: readonly number[]): number[] {
  const out = [...words];
  const n = out.length;
  const last = out[n - 1];
  if (last === undefined) return out;
  if (last !== 0) out[n - 1] = last - Math.sign(last);
  else if (out[n - 2] === -1) out[n - 2] = 0;
  return out;
}

/**
 * How many microseconds a row's block carries on its last duration beyond the signal: the stored form's one, or
 * none. The rule `unstored` and `emissionsOf` apply, stated once for a caller that plays a block, `pulsesOfBlock`,
 * and wants the signal a Touch sends instead: a block that ends on a pad carries it, in the pad or in the total it
 * is solved from; one that ends on words carries it on its last word, or on a silence of exactly one microsecond
 * before a closing zero; one that ends on a copy carries none.
 */
export function storedMicrosecondOf(block: BlockTail): 0 | 1 {
  const last = block.items[block.items.length - 1];
  if (last === undefined || 'copy' in last) return 0;
  if ('pad' in last) return 1;
  const words = last.words;
  const end = words[words.length - 1];
  if (end === undefined) return 0;
  if (end !== 0) return 1;
  return words[words.length - 2] === -1 ? 1 : 0;
}

/**
 * How long a copy runs whatever its value, where that does not depend on the value: a biphase copy, whose two
 * cells hold the same two halves. Undefined for every other shape.
 */
function fixedCopyLength(shape: FrameShape, bare: boolean, bits: number): number | undefined {
  const b = shape.biphase;
  if (b === undefined || bare || shape.timings !== undefined || shape.cells !== undefined) return undefined;
  return b.lead.reduce((n, p) => n + p.us, 0) + bits * (b.mark + b.space);
}

/**
 * A block read back as its emissions, with every pad solved into the constant length it pads a copy to.
 *
 * **The pad arithmetic is `pulsesOfBlock`'s, inverted.** A pad either stretches a copy to a stated period,
 * its own `period` or the block's `copyPeriod`, and then that period is the copy's length from its start; or
 * it shares one value with every other pad, solved from the block's `total`, and then every padded copy runs
 * the same length, which is `blockOfDefinition`'s condition for choosing a total (one padded frame value per
 * repetition). The second case is solved here as (total, less every literal run and every copy that is not
 * padded, less the stored microsecond) over the number of pads.
 *
 * **The stored microsecond is taken off where it landed**: the last pad's copy runs one longer than its
 * period, or the last run of words is one longer. Both forms occur, `blockOfDefinition` puts it on the pad's
 * own extra and in the total, and the blocks measured off Logitech's compiles carry it in the total alone, and
 * the arithmetic here does not need to know which. **A block that ends on a copy carries none**: Logitech's
 * definition states nothing after that frame, and `blockOfDefinition` adds the microsecond to a last pad or a
 * last word only, never to a frame's own last duration. This refused such a block, 13 rows, until
 * `todo-touch.md` 5.3.4 gave the stated rows count free blocks and the refusal turned out to be this file's
 * reading rather than the rows': there is simply nothing to take off.
 */
function emissionsOf(
  block: BlockTail, shapes: readonly FrameShape[], widthAt: (at: number) => number | undefined,
  literals: ReadonlySet<string> = new Set(),
): Emission[] | DefinitionRefusal {
  const raws: RawEmission[] = [];
  /** An `ofCopy` run waiting for the copy it belongs to. */
  let head: number[] | undefined;
  for (const [index, item] of block.items.entries()) {
    if ('copy' in item) {
      const shape = item.shape ?? 0;
      if (shapes[shape] === undefined) return 'a copy names a rhythm the row does not state';
      // A head goes with a bare copy only: a full one would send the rhythm's own lead in after it.
      if (head !== undefined && item.copy !== 'bare') return 'a copy\'s own lead in before a copy that sends the rhythm\'s';
      raws.push({ kind: 'copy', at: item.at ?? 0, shape, bare: item.copy === 'bare', trailer: undefined, pad: undefined, head: head ?? [] });
      head = undefined;
      continue;
    }
    if (head !== undefined) return 'a copy\'s own lead in followed by something other than its copy';
    const last = raws[raws.length - 1];
    if ('words' in item) {
      // **A copy's own lead in**, `BlockTailItem.ofCopy`: the header of a segment whose lead in is not the
      // rhythm's, which `blockOfDefinition` writes as words in front of a bare copy, archive.ts's `ownHead`.
      // `Daewoo 40 Bit` repeats a segment opening on 9000 and 2260 where its frame opens on 9000 and 4500. It
      // is held for the copy that follows and becomes that copy's segment's header, which is where Logitech's
      // definitions state it and where a copy period counts it from.
      if (item.ofCopy === true) { head = [...item.words]; continue; }
      // **Words directly after a copy are that copy's trailer**, since `blockOfDefinition` pushes a copy's
      // closing words as one item right after it; any later run is an emission of its own.
      // **Unless the repetition sends the same run as a literal of its own**, `literals`: then it is that
      // literal here too, and reading it as a trailer would make the first transmission's copy a segment the
      // repetition does not hold. `X10 AllOnOff 11 Bit Dual` is the case, a run between its two frames that
      // its repetition opens on. Only where a copy follows, as there: a run followed by a pad is a copy's, and
      // one followed by another run is a copy's trailer that happens to equal the repetition's literal,
      // `KMD 77 Bit`'s closing 818, 6544, 818, 818 before a ditto of the same durations.
      const next = block.items[index + 1];
      const literal = literals.has(JSON.stringify(item.words)) && next !== undefined && 'copy' in next;
      if (!literal && last?.kind === 'copy' && last.trailer === undefined && last.pad === undefined) last.trailer = [...item.words];
      else raws.push({ kind: 'words', words: [...item.words] });
      continue;
    }
    if (last?.kind !== 'copy' || last.pad !== undefined) return 'a pad that follows no copy';
    last.pad = { extra: item.pad, period: item.period ?? block.copyPeriod };
  }
  if (head !== undefined) return 'a copy\'s own lead in followed by something other than its copy';
  if (raws.length === 0) return [];

  const lastRaw = raws[raws.length - 1]!;
  const lastIndex = raws.length - 1;
  const solved = raws.filter((r) => r.kind === 'copy' && r.pad !== undefined && r.pad.period === undefined);
  const periodic = raws.filter((r) => r.kind === 'copy' && r.pad !== undefined && r.pad.period !== undefined);
  if (solved.length > 0 && periodic.length > 0) return 'pads of a stated period and pads solved from a total in one block';

  // A pad solved from the total: every padded copy runs one constant length.
  let shared: number | undefined;
  if (solved.length > 0) {
    if (block.total === undefined) return 'a padded block with no total to solve its pads from';
    let fixed = 0;
    for (const r of raws) {
      if (r.kind === 'words') { fixed += r.words.reduce((n, w) => n + Math.abs(w), 0); continue; }
      if (r.pad !== undefined) continue;
      const bits = widthAt(r.at);
      const length = bits === undefined ? undefined : fixedCopyLength(shapes[r.shape]!, r.bare, bits);
      if (length === undefined) return 'a padded block whose other copies vary in length';
      // A copy's own lead in is inside its segment, so it counts with the copy; a padded copy's runs within
      // the shared length and is left out with it.
      fixed += length + [...r.head, ...r.trailer ?? []].reduce((n, w) => n + Math.abs(w), 0);
    }
    const stored = lastRaw.kind === 'copy' && lastRaw.pad !== undefined ? 1 : 0;
    const room = block.total - fixed - stored;
    if (room <= 0 || room % solved.length !== 0) return 'a padded block whose pads do not divide evenly';
    shared = room / solved.length;
  }

  const out: Emission[] = [];
  for (const [index, r] of raws.entries()) {
    const isLast = index === lastIndex;
    if (r.kind === 'words') {
      out.push({ kind: 'words', words: merged(isLast ? unstored(r.words) : r.words) });
      continue;
    }
    let trailer = merged(isLast && r.pad === undefined ? unstored(r.trailer ?? []) : r.trailer ?? []);
    let total: number | undefined;
    if (r.pad !== undefined) {
      if (r.pad.period !== undefined) {
        // A pad's extra is the stored microsecond on the block's last pad and nothing anywhere else.
        if (r.pad.extra !== 0 && !isLast) return 'a pad longer than its period before the block\'s end';
        total = r.pad.period;
      } else total = shared;
    }
    out.push({ kind: 'copy', at: r.at, shape: r.shape, bare: r.bare, trailer, total, head: merged(r.head) });
  }
  return out;
}

/**
 * A block's items with each folded lead in put back as a run of words in front of a bare copy.
 *
 * **What a folded lead is**, `ArchiveRhythm.leadFolded`: a lead in Logitech's definition sends once, before
 * the first repetition, in a code segment of its own, and which `blockOfDefinition` writes into the first
 * copy's header, so a first block opens on a `full` copy and every repetition is `bare`. `JVC 16 Bit` is the
 * case: 8400 and 4200 once, then frames of 45000 microseconds with no lead in. Read as it stands the first
 * copy would be a second segment, sent in the start group as a frame of its own, and the Touch would send one
 * frame more than the code means. So where the repetition holds a copy only `bare`, a `full` copy of it in
 * the first block is split back into the lead and the bare copy.
 */
function withLeadsSplit(tail: BlockTail, held: BlockTail, shapes: readonly FrameShape[]): BlockTail {
  const key = (at: number, shape: number) => `${at}/${shape}`;
  const bareOnly = new Set<string>();
  const full = new Set<string>();
  for (const item of held.items) {
    if (!('copy' in item)) continue;
    (item.copy === 'bare' ? bareOnly : full).add(key(item.at ?? 0, item.shape ?? 0));
  }
  for (const k of full) bareOnly.delete(k);
  const items: BlockTail['items'][number][] = [];
  for (const item of tail.items) {
    if ('copy' in item && item.copy === 'full' && bareOnly.has(key(item.at ?? 0, item.shape ?? 0))) {
      const lead = leadOf(shapes[item.shape ?? 0]);
      if (lead.length > 0) items.push({ words: lead });
      items.push({ ...item, copy: 'bare' });
    } else items.push(item);
  }
  return { ...tail, items };
}

/** What a `full` copy of a rhythm sends before its first cell and a `bare` one does not, signed. */
function leadOf(shape: FrameShape | undefined): number[] {
  if (shape?.cells !== undefined) return [...shape.cells.lead];
  const t = shape?.timings;
  if (t === undefined) return [];
  return [...(t.header[0] === 0 ? [] : [t.header[0]]), ...(t.header[1] === 0 ? [] : [-t.header[1]])];
}

// ---------------------------------------------------------------------------------------------------
// Writing segments
// ---------------------------------------------------------------------------------------------------

/** A signed duration as an atom: positive the lamp flickering, otherwise dark. The bounds are null, as on
 * 12827 of the 12830 atoms of Logitech's catalogue, counting every header, trailer, literal and cell,
 * `test/families/harmony-touch/touch-definition.test.ts`. */
const atom = (us: number): Atom => ({ Type: us > 0 ? 1 : 0, Value: Math.abs(us), MinValue: null, MaxValue: null });
const atoms = (words: readonly number[]): Atom[] => words.map(atom);
const cell = (bitType: number, words: readonly number[]): Encoding => ({ BitType: bitType, Atoms: atoms(words) });

/** The lead in of a two cell frame as words: the mark, then the space, a zero of either left out. */
const headerWords = (h: readonly [number, number]): number[] =>
  [...(h[0] === 0 ? [] : [h[0]]), ...(h[1] === 0 ? [] : [-h[1]])];

/** One encoded segment's durations, before it is given a name, a width and a length. */
interface SpelledSegment {
  readonly header: readonly number[];
  readonly cells: readonly Encoding[];
  readonly trailer: readonly number[];
  readonly encodingType: number;
  /** How many bits one digit of a value carries: 1 for two cells, 2 for four, 4 for sixteen. */
  readonly bitsPerDigit: number;
}

/**
 * The durations of one copy of a frame as a segment states them.
 *
 * **Three spellings, each chosen for a reason the docstring above gives.** `shifted` is the Sharp and JVC
 * spelling, a lone mark as the header and every cell stated (carried space, constant mark), which moves the
 * constant mark that closes a frame from our trailer into the last cell; it needs that trailer to open on the
 * constant mark, and a family whose first mark differs has no other spelling. The pulse width spelling is
 * Sony's. Everything else is the table's own (constant mark, carried space).
 */
function spelled(
  shape: FrameShape, bare: boolean, trailer: readonly number[], padded: boolean, preferShifted: boolean,
): SpelledSegment | DefinitionRefusal {
  if (shape.cells !== undefined) return spelledCells(shape.cells, bare, trailer);
  if (shape.timings === undefined) {
    if (shape.biphase === undefined) return 'a frame shape this file cannot spell';
    return spelledBiphase(shape.biphase, bare, trailer);
  }
  const t: FrameTimings = shape.timings;
  if (t.sections !== undefined) return 'a whole record shape, which no segment of a definition states';
  const header: readonly [number, number] = bare ? [0, 0] : t.header;
  const two = (clear: readonly number[], set: readonly number[]) => [cell(0, clear), cell(1, set)];
  if (t.carries === 'mark') {
    // Sony's: `header [2400]` and cells of (600 space, carried mark), which is our `header [2400, 600],
    // flat 600, carries 'mark'` read the other way round. It is the spelling that ends a frame on its last
    // carried mark, as a block's copy does, so a trailer or a pad follows it unchanged.
    if (t.firstMark !== undefined || t.oneMark !== undefined || t.carriedFirst === true) {
      return 'a pulse width frame with an opening mark or a set mark of its own';
    }
    if (header[0] !== 0 && header[1] === t.flat) {
      return { header: [header[0]], cells: two([-t.flat, t.zero], [-t.flat, t.one]), trailer, encodingType: 0, bitsPerDigit: 1 };
    }
    // **Where the lead in's space is not the constant half, or there is no lead in, the cells are stated mark
    // first**, (carried mark, constant space), which is how Logitech states such families, `Emotiva 24 Bit`'s
    // frame and `Sunfire 23 Bit`'s second, headerless, segment among them. That
    // spelling ends a frame on a constant space the copy does not send, so the space is taken out of what
    // follows: out of the pad where the copy is padded, which absorbs it, and out of the trailer's opening
    // silence otherwise. A trailer that opens on a mark, or on a silence no longer than the constant half,
    // has nothing to take it out of; one shorter than the half could not have followed it.
    if (trailer.length === 0) {
      return padded ? { header: headerWords(header), cells: two([t.zero, -t.flat], [t.one, -t.flat]), trailer, encodingType: 0, bitsPerDigit: 1 }
        : 'a pulse width lead in whose space is not the cell\'s constant half, and nothing after the frame to take that half out of';
    }
    const opening = trailer[0]!;
    // A silence of exactly the constant half is that half itself, which is how `blockOfDefinition` writes the
    // closing of a frame stated mark first (`Emotiva 24 Bit`, `Scenario 12 Bit`): it is taken out whole.
    if (opening >= 0 || -opening < t.flat) {
      return 'a pulse width lead in whose space is not the cell\'s constant half, and nothing after the frame to take that half out of';
    }
    return {
      header: headerWords(header), cells: two([t.zero, -t.flat], [t.one, -t.flat]),
      trailer: opening + t.flat === 0 ? trailer.slice(1) : [opening + t.flat, ...trailer.slice(1)], encodingType: 0, bitsPerDigit: 1,
    };
  }
  if (t.carriedFirst === true) {
    if (t.firstMark !== undefined) return 'a frame stating its carried half first and an opening mark of its own';
    return {
      header: headerWords(header), cells: two([-t.zero, t.flat], [-t.one, t.oneMark ?? t.flat]),
      trailer, encodingType: 0, bitsPerDigit: 1,
    };
  }
  const opensOnFlat = trailer[0] === t.flat && t.oneMark === undefined;
  if ((t.firstMark !== undefined || preferShifted) && opensOnFlat) {
    return {
      header: [...headerWords(header), t.firstMark ?? t.flat],
      cells: two([-t.zero, t.flat], [-t.one, t.flat]),
      trailer: trailer.slice(1), encodingType: 0, bitsPerDigit: 1,
    };
  }
  if (t.firstMark !== undefined) return 'an opening mark of its own and no constant half after the frame to shift it onto';
  return {
    header: headerWords(header), cells: two([t.flat, -t.zero], [t.oneMark ?? t.flat, -t.one]),
    trailer, encodingType: 0, bitsPerDigit: 1,
  };
}

/**
 * A biphase frame: the lead in as it stands, and the two cells, each the same two halves in opposite orders.
 * `EncodingType` 1, which is what the catalogue's 144 biphase definitions state; the Touch does not tell it
 * from 0, "How a code becomes durations", the meaning being entirely in the cells.
 */
function spelledBiphase(b: BiphaseTimings, bare: boolean, trailer: readonly number[]): SpelledSegment | DefinitionRefusal {
  if (b.firstMark !== undefined) return 'a biphase opening mark of its own';
  if (bare) return 'a biphase copy with no lead in';
  const markFirst = [b.mark, -b.space];
  const spaceFirst = [-b.space, b.mark];
  return {
    header: b.lead.map((p) => (p.mark ? p.us : -p.us)),
    cells: b.setIsMark ? [cell(0, spaceFirst), cell(1, markFirst)] : [cell(0, markFirst), cell(1, spaceFirst)],
    trailer, encodingType: 1, bitsPerDigit: 1,
  };
}

/**
 * A cell table frame, section 231: every symbol's cell as written. `EncodingType` 2 for four cells and 3 for
 * sixteen, which is how the catalogue's 105 and 109 such definitions state them, and 0 for a table of two,
 * whose digits are hexadecimal as any two cell family's are.
 */
function spelledCells(c: CellTimings, bare: boolean, trailer: readonly number[]): SpelledSegment {
  return {
    header: bare ? [] : [...c.lead],
    cells: c.cells.map((one, at) => cell(at, one)),
    trailer,
    encodingType: c.cells.length === 16 ? 3 : c.cells.length === 4 ? 2 : 0,
    bitsPerDigit: c.bits,
  };
}

// ---------------------------------------------------------------------------------------------------
// The definition
// ---------------------------------------------------------------------------------------------------

/**
 * The words a literal run is named by, in the order they are handed out.
 *
 * **What a word is to the Touch**: the id of a segment, nothing more, "How a code becomes durations": a code
 * segment whose name holds `KeyCode` is found by the text after that word. So the words need not mean what
 * their names say; they need to be among the fourteen `statedCode` reads as framing rather than a value, so
 * the codec's own reader takes the code we write. `Start` is kept for a folded lead in, where it is also the
 * name `rhythmOfDefinition` folds back, and `Repeat` for the first run a repetition sends, which is the name
 * Logitech gives a ditto.
 */
const SPARE_WORDS: readonly StatedWord[] = [
  'Spacer', 'Spacer2', 'Divider', 'Space', 'LongSpace', 'Trailer', 'StopSpacer', 'SS', 'LS', 'LRS', 'RepeatStart', 'Finish',
];

/**
 * A row of our rhythm table as a definition a Harmony Touch reads, under protocol id `id`.
 *
 * **What it holds.** The carrier, `carrierOfPeriod` or the one given; one encoded segment per distinct copy
 * the row's blocks send, the one carrying the first value named for the family and the others `<family> 1`,
 * `<family> 2`, which is the naming the Touch reads a value's segment id out of; one code segment per distinct
 * run of literal words, named `<family> KeyCode<word>`; and its own `KeyCode`, start and repeat, which the
 * Touch never reads and which `keyCodeText` writes a code into. `TotalLength` is a padded copy's constant
 * length, a pulse width family's frame period among them. **No toggle bit, because no row states one**, so a
 * Touch given this definition sends a toggling family's code exactly as written on every press; the closure
 * counts what that costs.
 *
 * **The repeat count goes in `PressMinimumRepeats`**, as many repetitions as the row's first block holds,
 * which the Touch stores and never reads, "How many times a press repeats the code": the device's own count
 * is what it sends. It is there so that `blockOfDefinition` gives the row's own first block back.
 *
 * **Any well formed row is taken, not only those of `PROTOCOLS`**: a row fitted to a learned code, part B of
 * `todo-touch.md` 5.3, is written by the same rules, and has to carry what every row of the table carries
 * where it has blocks: `held`, one repetition, and the whole first transmission, `tail` or `opening`, when
 * that differs, both in the stored form, their last duration one microsecond longer than the signal.
 */
export function definitionOfRow(
  row: StatedProtocol, id: Id, options: DefinitionOptions = {},
): IrProtocol | { readonly refusal: DefinitionRefusal } {
  const refuse = (refusal: DefinitionRefusal) => ({ refusal });
  if (row.quad !== undefined || row.longToggle !== undefined || row.sections !== undefined) {
    return refuse('a whole record shape, which no segment of a definition states');
  }
  if (row.held === undefined) return refuse('the row states its frame and not its repetition, so no trailer and no gap');
  const hz = options.carrierHz ?? carrierOfPeriod(row.periodNs);
  if (hz === undefined || !(hz > 0) || Math.floor(1e9 / hz) !== row.periodNs) {
    return refuse('a carrier that does not give the row\'s period');
  }
  const t = timingsOf(row);
  const b = biphaseOf(row);
  const c = cellsOf(row);
  const own: FrameShape = {
    ...(t === undefined ? {} : { timings: t }),
    ...(b === undefined ? {} : { biphase: b }),
    ...(c === undefined ? {} : { cells: c }),
  };
  const shapes: readonly FrameShape[] = [own, ...(row.also ?? [])];

  // The widths, by the place of a value in a code. One stated width serves every value.
  // The first transmission: the compiler's own where the row has one, else the row's count free one, which
  // a stated row whose definition states no count carries instead, todo-touch 5.3.4. The start group is what
  // precedes the repetitions in either, and the count, which a Touch never reads, is however many there are.
  const first = row.tail ?? row.opening;
  const places = 1 + Math.max(0, ...[...row.held.items, ...(first?.items ?? [])]
    .map((one) => ('copy' in one ? one.at ?? 0 : 0)));
  const widths = widthsOf(row.family, places, options.bits);
  const widthAt = (at: number): number | undefined => (widths === undefined ? undefined : widths[at] ?? widths[widths.length - 1]);

  // One repetition, and the first transmission as a start group followed by repetitions of it.
  const held = emissionsOf(row.held, shapes, widthAt);
  if (typeof held === 'string') return refuse(held);
  const tailBlock = first === undefined ? undefined : withLeadsSplit(first, row.held, shapes);
  // The runs the repetition sends as literals of their own, which the first transmission reads alike.
  const heldLiterals = new Set(held.flatMap((e) => (e.kind === 'words' ? [JSON.stringify(e.words)] : [])));
  const tail = tailBlock === undefined ? undefined : emissionsOf(tailBlock, shapes, widthAt, heldLiterals);
  if (typeof tail === 'string') return refuse(tail);
  const same = (a: readonly Emission[], b2: readonly Emission[]) => JSON.stringify(a) === JSON.stringify(b2);
  let start: Emission[] = tail === undefined ? [] : [...tail];
  let repeats = 0;
  while (held.length > 0 && start.length >= held.length && same(start.slice(start.length - held.length), held)) {
    start = start.slice(0, start.length - held.length);
    repeats += 1;
  }
  // The values go out in order, start then repetition, which is how `keyCodeText` hands them out.
  const order = [...start, ...held].flatMap((e) => (e.kind === 'copy' ? [e.at] : []));
  if (order.some((at, i) => at !== i)) return refuse('the values of a code are sent out of order');
  if (widths === undefined && order.length > 0) return refuse('the family\'s name states no width for its values and none was given');

  // The lead in a split put in front of the first repetition is the folded lead: named `KeyCodeStart`, and
  // the frame after it spelled shifted, so `rhythmOfDefinition` folds it back into the row's header.
  const foldedLead = tailBlock !== undefined && tailBlock.items.length !== first!.items.length;
  const leadWords = foldedLead ? JSON.stringify(leadOf(own)) : undefined;

  const irSegments: IrSegment[] = [];
  const codeSegments: CodeSegment[] = [];
  const segmentKeys = new Map<string, SegmentReference>();
  const wordKeys = new Map<string, SegmentReference>();
  const spare = [...SPARE_WORDS];
  let repeatTaken = false;
  const refOf = (e: Emission, group: 'start' | 'repeat'): SegmentReference | DefinitionRefusal => {
    if (e.kind === 'words') {
      const key = JSON.stringify(e.words);
      const known = wordKeys.get(key);
      if (known !== undefined) return known;
      let word: StatedWord | undefined;
      if (group === 'start' && key === leadWords) word = 'Start';
      else if (group === 'repeat' && !repeatTaken) { word = 'Repeat'; repeatTaken = true; } else word = spare.shift();
      if (word === undefined) return 'more literal runs than the catalogue has words for';
      const name = `${row.family} KeyCode${word}`;
      // **The durations go in `Atoms`, which is what the Touch reads, and in `Header` too**, which is what the
      // archive's readers read: `blockOfDefinition` emits a code segment as its header and trailer, and
      // `rhythmOfDefinition` folds a `KeyCodeStart` lead out of its header. Logitech's own literals hold
      // both, `Atoms` and the two halves, so this states nothing theirs do not.
      codeSegments.push({ Name: name, Atoms: atoms(e.words), Header: atoms(e.words), Trailer: [], TotalLength: 0, Payload: null });
      const ref = { SegmentName: name, SegmentType: 0 };
      wordKeys.set(key, ref);
      return ref;
    }
    const bits = widthAt(e.at)!;
    const key = JSON.stringify([e.shape, e.bare, e.trailer, e.total ?? null, bits, e.head]);
    const known = segmentKeys.get(key);
    if (known !== undefined) return known;
    const own = e.head.length > 0;
    const spell = spelled(shapes[e.shape]!, e.bare, e.trailer, e.total !== undefined, !own && foldedLead && e.bare && e.shape === 0);
    if (typeof spell === 'string') return spell;
    // **A copy's own lead in is the segment's header**, as in Logitech's definitions, archive.ts's `ownHead`:
    // the bare spelling states nothing before its first cell, so the header is that lead in alone, and
    // `blockOfDefinition` reads it back as the `ofCopy` words in front of a bare copy. A spelling that does
    // put something there for a bare copy would have it read back as part of the lead in, so it is refused.
    if (own && spell.header.length > 0) return 'a copy\'s own lead in before a spelling that states a header of its own';
    const header = own ? e.head : spell.header;
    if (bits % spell.bitsPerDigit !== 0) return 'a width that is not a whole number of cells';
    const index = irSegments.length;
    if (index > 9) return 'more segments than a one digit index names';
    const name = index === 0 ? row.family : `${row.family} ${index}`;
    irSegments.push({
      Name: name,
      Header: atoms(header),
      Trailer: atoms(spell.trailer),
      TotalLength: e.total ?? 0,
      Payload: { EncodingType: spell.encodingType, Encodings: spell.cells, NumberOfBits: bits / spell.bitsPerDigit, ToggleBit: null },
    });
    const ref = { SegmentName: name, SegmentType: 1 };
    segmentKeys.set(key, ref);
    return ref;
  };
  // The start group first and then the repetition, so the segment named for the family, the one
  // `rhythmOfDefinition` reads as the frame, is the first copy a transmission sends.
  const startRefs: SegmentReference[] = [];
  const repeatRefs: SegmentReference[] = [];
  for (const [list, group, into] of [[start, 'start', startRefs], [held, 'repeat', repeatRefs]] as const) {
    for (const e of list) {
      const ref = refOf(e, group);
      if (typeof ref === 'string') return refuse(ref);
      into.push(ref);
    }
  }

  // Every key Logitech's definitions carry, so a document of ours is a document of theirs in shape: the
  // fields nothing on the remote reads are written as their catalogue's neutral values, "What a writer must
  // carry", since a remote's own screens send a document back whole.
  return {
    __type: 'IrProtocol',
    'Id-': id,
    Name: row.family,
    CarrierFrequency: hz,
    IRSegments: irSegments,
    CodeSegments: codeSegments,
    Attributes: [],
    Flags: [],
    ControlSection: null,
    HoldDelay: null,
    HoldMinimumRepeats: null,
    // Only where the row states the compiler's own first block: an `opening` is built at one repetition
    // because the definition states no count, and writing 1 here would state one Logitech's does not.
    PressMinimumRepeats: row.tail === undefined ? null : repeats,
    IsFullSequence: null,
    IsPadded: null,
    IsPublic: false,
    NumberOfLinkedLanguage: 0,
    Rating: null,
    RelatedProtocols: [],
    SendingType: 0,
    Status: null,
    KeyCode: { Start: startRefs, Repeat: repeatRefs, Finish: [] },
  };
}

/**
 * The width of each of `places` values, from the caller or else from the family's name.
 *
 * The name is read by `statedCode` on a code of `places` zeros, which is the codec's one reading of a
 * family's widths rather than a second copy of its pattern: one width before `Bit` goes to every value, as
 * many as there are values pair with them in order, and anything else is no answer.
 */
function widthsOf(family: string, places: number, given: number | readonly number[] | undefined): number[] | undefined {
  if (typeof given === 'number') return [given];
  if (given !== undefined) return given.length === 0 ? undefined : [...given];
  if (places > 10 || /[:()]/.test(family)) return undefined;
  const probe = statedCode(`G:${family}:()(${Array.from({ length: places }, (_, i) => `${i}x0`).join('_')})():3`, { bitsPerDigit: 1 });
  return probe === undefined ? undefined : probe.frames.map((one) => one.bits);
}

// ---------------------------------------------------------------------------------------------------
// The key code
// ---------------------------------------------------------------------------------------------------

/**
 * A code's values written into a definition's own structure, in the catalogue's notation, the form a Touch
 * reads: `G:<family>:(<start>)(<repeat>)(<finish>):3`.
 *
 * **The structure is the definition's and the values are the code's.** Each group is the definition's own
 * `KeyCode` list: an encoded segment takes the code's next value, written as the segment's id, an `x` and the
 * value's digits, and a code segment is written as its word, which is its id, "How a code becomes durations".
 * So a code's own words and grouping are not carried over: what the Touch sends is decided by the segments
 * the groups name, and the definition is the one place that states which segments a transmission is made of.
 * The values are taken in order, the start group's first, which is the order `definitionOfRow` checks the
 * row's copies send them in.
 *
 * **The digits are the ones the Touch reads**: hexadecimal for a two cell family, each digit four bits,
 * written to the segment's whole width so no leading zero is lost, and a value wider than its segment cut
 * from the left, which is what the Touch does to it, "cut from the left when longer". For a cell table
 * family each digit is one symbol, base four for four cells and base sixteen for sixteen, written to the
 * segment's width in symbols; a value wider than that is refused, since the Touch would send every digit
 * and the code would carry symbols the family's width does not.
 *
 * **`G:` and the trailing number are never read by a Touch**; the trailing number is written as 3, which is
 * what every code of the sync measured carries.
 */
export function keyCodeText(
  code: StatedCode, definition: IrProtocol,
): string | { readonly refusal: KeyCodeRefusal } {
  const refuse = (refusal: KeyCodeRefusal) => ({ refusal });
  if (/[:()]/.test(definition.Name)) return refuse('a family name the notation cannot carry');
  // The segment ids by the Touch's naming rule, through the codec's one statement of it.
  const asArchive: ArchiveProtocol = {
    name: definition.Name, carrierHz: definition.CarrierFrequency ?? 0, definition, keycodeFields: null,
    logitechProtocolId: null, standardProtocol: null, pressMinimumRepeats: null, irp: null,
  };
  const idOf = new Map([...segmentRefs(asArchive)].map(([ref, one]) => [one.SegmentName, ref]));
  const segments = new Map((definition.IRSegments ?? []).map((one) => [one.Name, one]));
  // **A release is refused rather than folded into the repetition**: the Touch sends a code's third group
  // when the key comes up, and a definition whose own `KeyCode` states none has nowhere for it to go. No
  // row of the table states a release, so no definition written from one has one.
  if ((code.groups[2] ?? []).length > 0 && (definition.KeyCode?.Finish ?? []).length === 0) {
    return refuse('the code states a release, which the definition does not send');
  }
  const values = code.frames.map((one) => one.value);
  let next = 0;
  const groups: string[] = [];
  for (const list of [definition.KeyCode?.Start, definition.KeyCode?.Repeat, definition.KeyCode?.Finish]) {
    const items: string[] = [];
    for (const ref of list ?? []) {
      const id = idOf.get(ref.SegmentName);
      if (id === undefined) return refuse('the definition names a segment it does not hold');
      if (ref.SegmentType !== 1) { items.push(id); continue; }
      const segment = segments.get(ref.SegmentName);
      const width = segment?.Payload?.NumberOfBits;
      if (segment === undefined || !/^\d$/.test(id)) return refuse('the definition names a segment it does not hold');
      if (typeof width !== 'number' || width <= 0) return refuse('a segment states no width');
      const value = values[next];
      if (value === undefined) return refuse('the code states another number of values than the definition sends');
      next += 1;
      const encoding = segment.Payload?.EncodingType ?? 0;
      let digits: string;
      if (encoding === 2 || encoding === 3) {
        const base = encoding === 2 ? 4 : 16;
        digits = value.toString(base).toUpperCase();
        if (digits.length > width) return refuse('a value wider than its cell segment');
        digits = digits.padStart(width, '0');
      } else {
        const cut = value & ((1n << BigInt(width)) - 1n);
        digits = cut.toString(16).toUpperCase().padStart(Math.ceil(width / 4), '0');
      }
      items.push(`${id}x${digits}`);
    }
    groups.push(items.join('_'));
  }
  if (next !== values.length) return refuse('the code states another number of values than the definition sends');
  return `G:${definition.Name}:(${groups[0]})(${groups[1]})(${groups[2]}):3`;
}
