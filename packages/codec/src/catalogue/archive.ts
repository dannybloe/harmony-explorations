/**
 * Reading Logitech's own protocol definitions out of the Harmony infrared archive.
 *
 * **What the archive is.** A third party's checkout of Logitech's infrared database,
 * `github.com/pickysysadmin/logitech-harmony-ir-archive`, holding **Logitech's own definition for 684
 * protocol families, verbatim**, where this project has measured the timings for 37. Decision 15 in
 * `docs/plans/002-the-roadmap.md` is what may cross from it into this repository: durations and names, through this
 * converter, and never a file of the archive's own.
 *
 * **Why a converter and not a table.** Their definition states a family's rhythm in its own vocabulary,
 * a list of segments each carrying a header, one atom pair per bit value and a trailer. Our table states
 * the same rhythm as `FrameTimings`, which is what `pulsesOfFrame` emits from. This is the one place
 * that turns one into the other, so a family named by matching the catalogue and a family converted into
 * the table are the same derivation rather than two copies of it, which is what
 * `bin/protocols.ts` needs: it uses this to **name** a rhythm it measured off the corpus, and to
 * **add** the families the corpus holds no code of.
 *
 * **The naming job is why this exists at all.** A corpus measured entry used to take its family name
 * from Logitech's **analyser**, which section 160 retired as evidence, and all three of the entries
 * named that way were wrong: two carried another family's durations under a name whose real carrier is
 * 38.2 kHz, and one carried Toshiba's durations under Memorex's name. Their **catalogue** states the
 * rhythm, so the rhythm can be looked up in it, and 653 of the 684 definitions are distinct on carrier
 * and durations alone. The 24 collisions that remain are one family at several bit widths, Sony 12, 15
 * and 20 for instance, so `keycodeFields` supplies the width and 17 groups still collide after it.
 * Those are **refused** rather than guessed at, which is what `familiesOfRhythm` returning a list is for.
 *
 * **The schema version is the drift guard.** The archive states its own `schemaVersion` in
 * `manifest.json`, and this refuses any value it was not written against. That is deliberately the only
 * guard: checking in a few of the archive's files as test fixtures would put its JSON in this
 * repository, which decision 15 forbids, so the tests skip without a checkout exactly as the corpus
 * tests skip without a lab.
 *
 * **Two modules beside it since `todo.md` 7.3.8.** `archiveblock.ts` derives a whole block from a definition and
 * is re-exported here whole, so its names keep their path; `archiveschema.ts` is a definition's own shape as the
 * archive's files state it, which both read and neither re-exports, as none of it was public before.
 */
import {
  type BiphaseTimings, type CellTimings, type FrameCarrier, type FrameShape, type FrameTimings, type Pulse,
  pulsesOfBlock,
} from '../infrared/irframe.ts';
// A value import and not only a type: `waveformOfArchiveCommand` composes the keycode reader with the
// rest. The dependency runs one way, `stated.ts` importing nothing from here.
import { segmentIdOf, statedCode, type StatedCode, type StatedItem } from '../infrared/stated.ts';
import { blockOfDefinition, type BlockRefusal } from './archiveblock.ts';
import { type Atom, atomUs, type Definition, type Encoding, type Segment } from './archiveschema.ts';
export * from './archiveblock.ts';

/**
 * The archive schema this converter was written against.
 *
 * A different value is a refusal and not a warning: the layout of a definition is what every duration
 * here is read out of, so a changed schema means the numbers may be right, wrong or absent with nothing
 * to tell them apart. Pinned commit `d84df0b`, 30 August 2026, 684 definitions, at version 1.
 *
 * **Version 2 was re-read before it was accepted**, commit `f85f217`, and it is additive: against
 * `d84df0b` nothing under `codesets/` or `protocols/` changed, and in `devices/` every one of the
 * 276236 records lost exactly one line, its `model`, which came back with the same value and a comma
 * because new blocks follow it: `timing`, and on most records `power`, `inputs`, `channelTuning` and
 * `states`, the device features Logitech's service hands out per catalogue entry, section 305. So
 * every field this reader takes is byte for byte what version 1 held, and the new blocks are read by
 * nothing here yet.
 */
export const ARCHIVE_SCHEMA_VERSION = 2;

/** The three cycles of a transmission: what precedes it, what repeats, and what a release sends. */
export interface ArchiveKeyCode {
  readonly Start: readonly SegmentRef[] | null;
  readonly Repeat: readonly SegmentRef[] | null;
  readonly Finish: readonly SegmentRef[] | null;
}

/** One entry of a `KeyCode` list: a segment by name, and which of the two lists to find it in. */
export interface SegmentRef {
  readonly SegmentName: string | null;
  readonly SegmentType: number;
}

/** One protocol file of the archive, as it sits on disk. */
export interface ArchiveProtocol {
  readonly name: string;
  readonly carrierHz: number;
  readonly definition: Definition;
  /**
   * Per field, the width in bits and which segment carries it.
   *
   * This is where a family's bit width comes from, rather than the `irp` string, which states it too
   * and would have to be parsed. It said `NumberOfBits` was null on every definition read
   * here<!--superseded-->, and that was this reader looking in the wrong place: the field sits inside a
   * segment's `Payload` and is set on all 884 of them. Section 232. This is still the place to ask,
   * because a **code**'s widths are per field and a segment states one width for itself.
   */
  readonly keycodeFields: Readonly<Record<string, {
    readonly bits: number;
    readonly segment: string;
    readonly sequence: string;
    readonly toggleBit: number | null;
    /** Their own ordering key. Object key order is not the field order and must not be relied on. */
    readonly token: number;
  }>> | null;
  readonly logitechProtocolId: number | null;
  /** Their own name for the standard the family is a case of, `NEC1`, `Denon-K`, `SharpDVD`. */
  readonly standardProtocol: string | null;
  readonly pressMinimumRepeats: number | null;
  /** The rhythm in IRP notation, kept for a human reader and deliberately not parsed. */
  readonly irp: string | null;
}

export class ArchiveError extends Error {}

/** What an archive's manifest states, once its schema version is one this reader knows. */
export interface ArchiveManifest {
  readonly schemaVersion: number;
  readonly generated: string;
  readonly counts: Readonly<Record<string, number>>;
}

/**
 * Check a parsed `manifest.json` and hand back its counts; `archiveManifest` in `archive.node.ts` reads the file.
 *
 * Throws on an unknown schema version, which is the whole point: a reader that carries on against a
 * layout it does not know produces durations nobody can tell from correct ones.
 */
export function archiveManifestOf(parsed: unknown): ArchiveManifest {
  const manifest = parsed as {
    schemaVersion?: number; generated?: string; counts?: Record<string, number>;
  };
  if (manifest.schemaVersion !== ARCHIVE_SCHEMA_VERSION) {
    throw new ArchiveError(
      `archive schema version ${String(manifest.schemaVersion)}, this reader knows `
      + `${ARCHIVE_SCHEMA_VERSION}: re-read the layout before trusting any duration out of it`,
    );
  }
  return {
    schemaVersion: manifest.schemaVersion,
    generated: manifest.generated ?? 'unstated',
    counts: manifest.counts ?? {},
  };
}

/** The carrier as our table states it: a period in nanoseconds, **truncated and never rounded**. */
export function periodOfCarrier(hz: number): number {
  // Section 41: a record stores floor(1e9 / f). Rounding instead reports 30 of 37 families as
  // disagreeing with this archive by one nanosecond, which is how this was got backwards once.
  return Math.floor(1e9 / hz);
}

/**
 * A carrier's period in nanoseconds **rounded to the nearest**, and so deliberately not `periodOfCarrier`:
 * the period as a Harmony Touch sends it. Named for its arithmetic rather than for the remote, since code
 * outside the families names no remote, `test/generic.test.ts`; which remote takes it is its reader's
 * choice, `families/harmony-touch/read.ts`. A compiled configuration stores the truncated period; a Touch is
 * given no compiled period at all and works one out each time it sends, through its engine's bit library,
 * whose conversion adds 2^52 + 2^51 in floating point and keeps the low word, which rounds.
 * `reference/architectures/harmony-touch/devices-and-infrared.md`, "How a code becomes durations", where
 * this is inferred from the decoded routine and not measured on the lamp. At 38 kHz the two differ by one,
 * 26316 against 26315. Kept beside the truncating one so that a reader choosing between them sees both.
 *
 * **The same addition, rather than `Math.round`.** An IEEE addition takes an exact half to the even
 * neighbour, where `Math.round` takes it up, so the two part at a carrier whose period is a whole number
 * and a half: 25600 Hz is 39062.5 nanoseconds, 39062 here and 39063 by `Math.round`. JavaScript's numbers
 * are the same doubles under the same default rounding, so adding and taking away the constant reproduces
 * the remote's arithmetic at every carrier rather than everywhere but the ties. The low word the engine
 * keeps is the whole number itself for any period below 2^31.
 */
export function roundedPeriodOfCarrier(hz: number): number {
  return 1e9 / hz + ROUNDING_CONSTANT - ROUNDING_CONSTANT;
}

/** 2^52 + 2^51: added to a double below 2^51 in size, it leaves no bits below the units, so it rounds. */
const ROUNDING_CONSTANT = 2 ** 52 + 2 ** 51;

/** Why a definition could not be read as one of our row shapes. Counted rather than thrown. */
export type ConversionRefusal =
  | 'no segments'
  | 'no carrier'
  | 'no segment named for the family'
  | 'no bit encodings'
  | 'a cell of this base states no intervals'
  | 'a cell of this base names a symbol outside its own range'
  | 'some other number of cells'
  | 'one interval per bit, so equal bits merge on the wire'
  | 'a cell is not one mark and one space'
  | 'the header is not one mark and one space'
  | 'the header has no space and the cell supplies none'
  | 'biphase, and its two cells disagree about their half cell lengths'
  | 'neither half of the cell is constant';

/**
 * The rhythm a definition states, in the terms our own table and emitter use.
 *
 * **Exactly one of `timings` and `biphase` is set**, which is our table's own arrangement: a row is a
 * frame of one cell per bit with one half constant, or it is biphase, where the bit is which half of the
 * cell carries the carrier, and never both.
 */
export interface ArchiveRhythm {
  readonly family: string;
  readonly periodNs: number;
  readonly timings?: FrameTimings;
  readonly biphase?: BiphaseTimings;
  /**
   * The cell table, where the family sends more than one bit per cell, section 231.
   *
   * Set instead of the other two. `CellTimings` in `irframe.ts` carries the argument for its shape; the
   * short of it is that a cell is a list of intervals and nothing about it is assumed, because three
   * fifths of the base four families have no constant half for a two cell reading to name.
   */
  readonly cells?: CellTimings;
  /** The width the family's keycode field states, or undefined where it states none. */
  readonly bits: number | undefined;
  /** The closing mark and inter frame gap the trailer states, microseconds, a space negative. */
  readonly trailer: readonly number[];
  /**
   * Whether the cell states the half that carries the bit **first**.
   *
   * The one thing a block derivation needs that the rhythm alone does not say. Our reader takes a train
   * from its first mark and reads (mark, space) pairs, so where the carried half comes first the whole
   * frame is shifted by one and the cell's constant half is left over at the end. `blockOfDefinition`
   * puts it back as a literal word, which is why `JVC 16 Bit`'s block carries a bare 500 after every
   * copy and `Toshiba 32 Bit`'s carries a 568 that their trailer states outright.
   */
  readonly cellCarriedFirst: boolean;
  /**
   * Whether the family's lead in came from its `KeyCodeStart` code segment rather than its own header.
   *
   * A block derivation must know, because a folded lead is **already inside** the first copy: emitting
   * that code segment as literal words as well would send `JVC 16 Bit`'s 8400 and 4200 twice. Where it
   * is folded the first copy is `full` and every later one `bare`, which is exactly the shape measured
   * off Logitech's compiler.
   */
  readonly leadFolded: boolean;
  /**
   * The constant total a pulse width frame is padded out to, our table's `framePeriod`.
   *
   * Their `TotalLength`, which is the `^45000u` of the IRP notation. Carried only where the mark is the
   * half that varies, because on a pulse distance family the same number is the whole first block's
   * total instead and our table states it in `tail.total`, which needs the block shape and not just the
   * rhythm.
   */
  readonly framePeriod: number | undefined;
}

/**
 * The segment a family's own frame lives in.
 *
 * **Not the first one, which is the pitfall this function exists for.** `JVC 16 Bit`'s first infrared
 * segment is its **repeat**, so reading segment zero gives a lead in carrying no payload, and comparing
 * that against our measured row reported a difference that was ours. The archive's own README warns
 * about the same trap from the other side, for 4.81% of its commands. A segment states its name, and
 * the one named for the family is the frame.
 */
function frameSegment(protocol: ArchiveProtocol): Segment | undefined {
  const segments = protocol.definition.IRSegments ?? [];
  const named = segments.find((s) => s.Name === protocol.name);
  if (named !== undefined) return named;
  return segments.length === 1 ? segments[0] : undefined;
}

/**
 * Read a definition whose cell is one of four or one of sixteen lengths, section 231.
 *
 * **Every cell is taken as written and nothing about its shape is required.** That is the whole reading
 * and it is why it is short: our two cell shape needs a constant half because a stored record states one
 * per record, and infrared does not, so demanding one here would refuse 31 of the 75 base four families
 * outright and mis-emit others. A cell is its intervals in order.
 *
 * The lead in is the segment's own header atoms as they stand, again without absorption: the shift that
 * a two cell reading needs, and the corrections that came with it, are about our table's `(mark, space)`
 * spelling and have no counterpart here.
 *
 * The one refusal is a cell with no intervals at all, which one family states and which would emit a
 * symbol that occupies no time.
 */
function cellRhythm(
  protocol: ArchiveProtocol, segment: Segment, encodings: readonly Encoding[],
): ArchiveRhythm | { readonly refusal: ConversionRefusal } {
  const bits = encodings.length === 16 ? 4 : encodings.length === 4 ? 2 : 1;
  const cells: number[][] = [];
  for (const one of encodings) {
    const atoms = one.Atoms ?? [];
    // **A zero length atom is kept**, section 233, which is the reverse of what this did for a day. It
    // was dropped on the argument that no renderer can express a zero, since a Pronto word floors at
    // one; the archive's renderer expresses it as exactly that floor, measured on the nine `QE` test
    // patterns, whose trailer is a zero mark and a long space and whose rendering is `1` and then the
    // space. So the definition's own statement is carried through and each consumer floors it.
    // **An empty cell is carried rather than refusing the whole family**, section 233. Two families
    // state one: `Ferguson 9 Bit Toggle` declares four symbols and leaves the fourth empty, and
    // `iMonFixed2` declares sixteen and fills ten. A symbol with no intervals cannot be sent, but that
    // is a fact about a **code** that uses it, and refusing the family refused 43 codes of which most
    // never name one. `pulsesOfCellFrame` throws where a value reaches an empty cell.
    // `BitType` is the symbol's own value, so the table is indexed by it rather than by written order.
    if (one.BitType < 0 || one.BitType >= encodings.length) {
      return { refusal: 'a cell of this base names a symbol outside its own range' };
    }
    cells[one.BitType] = atoms.map(atomUs);
  }
  if (cells.length !== encodings.length || cells.some((one) => one === undefined)) {
    return { refusal: 'a cell of this base names a symbol outside its own range' };
  }
  const field = Object.values(protocol.keycodeFields ?? {})[0];
  return {
    family: protocol.name,
    periodNs: periodOfCarrier(protocol.carrierHz),
    cells: {
      lead: (segment.Header ?? []).map(atomUs),
      cells,
      bits,
    },
    // **In digits and multiplied out to bits here**, because their field states a symbol count for these
    // families, which their `EncodingType` of 2 or 3 is what says so. Every other reading in this file
    // deals in bits and a second unit in one field is how a reader ends up sending half a command.
    bits: field === undefined ? undefined : field.bits * bits,
    trailer: (segment.Trailer ?? []).map(atomUs),
    framePeriod: undefined,
    // Neither applies: a cell is emitted as written, so nothing is left over and nothing is folded.
    cellCarriedFirst: false,
    leadFolded: false,
  };
}

/**
 * Read one definition as a pulse distance or pulse width rhythm, or say why it could not be.
 *
 * **This reads the two cell families only**, which is the shape `pulsesOfFrame` emits: a lead in, then
 * one (mark, space) cell per bit with one half constant. The catalogue also holds biphase families, base
 * four families whose cell is one of four lengths, and the 16 cell test protocols, and our table has a
 * shape for some of those already. Each needs its own reading rather than a coercion into this one, so
 * they are refused here and counted, and the count is one of the two numbers this exercise is for.
 *
 * **Their cell comes in both orders and that is not cosmetic.** A pulse distance family states
 * `(mark, space)` with the space carrying the bit; a pulse width family such as Sony states
 * `(space, mark)` with the mark carrying it. In our convention a train is read from its first mark, so
 * a `(space, mark)` cell's leading space is what our reader sees as the header's space and the cells
 * come out shifted by one. That is why the space moves into the header below rather than being dropped:
 * `Sony 12 Bit` is `header [2400, 600], flat 600, carries 'mark'` in our table and
 * `header [2400], cell (600 space, 600 or 1200 mark)` in theirs, and those are the same train.
 */
export function rhythmOfDefinition(
  protocol: ArchiveProtocol,
): ArchiveRhythm | { readonly refusal: ConversionRefusal } {
  if ((protocol.definition.IRSegments ?? []).length === 0) return { refusal: 'no segments' };
  if (!protocol.carrierHz) return { refusal: 'no carrier' };
  const segment = frameSegment(protocol);
  if (segment === undefined) return { refusal: 'no segment named for the family' };

  // **Each refusal names a shape**, because a single "could not read" bucket hides which reading to
  // write next. Base four is `Quad` in a family's own name and our table has a shape for it, though a
  // definition does not state that shape's digit widths or closing gap. Base sixteen is `Hex` and there
  // is no shape here at all.
  const encodings = segment.Payload?.Encodings ?? [];
  if (encodings.length === 0) return { refusal: 'no bit encodings' };
  // **A family that sends more than one bit per cell is read as a cell table**, section 231: base four
  // where `Quad` in the name is the base of its digits, base sixteen where `Hex` is. Two refusals stood
  // here until 31 August 2026 and between them they were the largest block of Logitech's catalogue this
  // project could not emit, 142 families.
  if (encodings.length === 4 || encodings.length === 16) {
    return cellRhythm(protocol, segment, encodings);
  }
  // **A two cell family that fits none of the specific readings is a cell table of two**, section 233,
  // and it is a fallback rather than a second way of saying the same thing: it is reached only where
  // every reading below has refused. Those readings carry meaning a cell table does not, a constant
  // half and which half carries the bit, and our own decoder needs them to read a stored train back. A
  // cell table needs none of that because it takes each cell exactly as Logitech writes it, which is
  // why it can emit shapes the others refuse: halves that differ by **position** rather than by level,
  // a cell of one interval, a header that is not one mark and one space.
  const specific = twoCellRhythm(protocol, segment, encodings);
  if (!('refusal' in specific)) return specific;
  const table = cellRhythm(protocol, segment, encodings);
  // The specific reading's refusal is the one reported where **both** refuse, since it names the shape
  // that was expected and the cell table's would only ever say the cell is empty.
  return 'refusal' in table ? specific : table;
}

/**
 * The two cell readings: a pulse distance or pulse width frame, or a biphase one.
 *
 * Split out of `rhythmOfDefinition` in section 233 so that a cell table of two can stand behind it as a
 * fallback. Nothing about the readings themselves moved.
 */
function twoCellRhythm(
  protocol: ArchiveProtocol, segment: Segment, encodings: readonly Encoding[],
): ArchiveRhythm | { readonly refusal: ConversionRefusal } {
  if (encodings.length !== 2) return { refusal: 'some other number of cells' };
  // **One atom per cell is not biphase**, it is one interval per bit: `ADA 40 Bit` sends a clear bit as
  // an 833 space and a set bit as an 833 mark, so three set bits in a row are one 2499 mark on the wire
  // rather than three cells. Our table has no shape for it and a decoder cannot read one off a train
  // without knowing the family, since a long interval only divides into a count if the length is known.
  if (encodings.every((e) => (e.Atoms ?? []).length === 1)) {
    return { refusal: 'one interval per bit, so equal bits merge on the wire' };
  }
  const clear = encodings.find((e) => e.BitType === 0);
  const set = encodings.find((e) => e.BitType === 1);
  // Two cells that are not one clear and one set: a shape this reads nothing out of.
  if (clear === undefined || set === undefined) return { refusal: 'some other number of cells' };
  /** A cell as its mark, its space, and whether the mark came first on the wire. */
  const cell = (e: Encoding): { mark: number; space: number; markFirst: boolean } | undefined => {
    const atoms = e.Atoms ?? [];
    if (atoms.length !== 2) return undefined;
    const [a, b] = [atoms[0]!, atoms[1]!];
    if (a.Type === 1 && b.Type === 0) return { mark: a.Value, space: b.Value, markFirst: true };
    if (a.Type === 0 && b.Type === 1) return { mark: b.Value, space: a.Value, markFirst: false };
    return undefined;
  };
  const off = cell(clear);
  const on = cell(set);
  if (off === undefined || on === undefined) {
    return { refusal: 'a cell is not one mark and one space' };
  }
  // **The two cells stating the mark in different halves is biphase**, not a malformed pair: one bit
  // value is space then mark and the other mark then space, out of the same two lengths. 105 of the
  // catalogue's families are of this kind.
  //
  // The polarity is read off which cell opens on a mark, and it is per family rather than a convention:
  // Logitech's `Magnavox 13 Bit` sends a set bit mark first and their `Philips RC5 13 Bit Toggle`, which
  // their own schema calls RC5 as well, sends it space first. The lead in is the header's atoms exactly
  // as they stand, since our table stores intervals rather than a count of cells, and all four of the
  // biphase rows measured here reproduce theirs pulse for pulse including a thirteen interval one.
  if (off.markFirst !== on.markFirst) {
    if (off.mark !== on.mark || off.space !== on.space) {
      return { refusal: 'biphase, and its two cells disagree about their half cell lengths' };
    }
    const lead: Pulse[] = (segment.Header ?? []).map((a) => ({ mark: a.Type === 1, us: a.Value }));
    const field = Object.values(protocol.keycodeFields ?? {})[0];
    return {
      family: protocol.name,
      periodNs: periodOfCarrier(protocol.carrierHz),
      biphase: { mark: on.mark, space: on.space, lead, setIsMark: on.markFirst },
      bits: field?.bits,
      trailer: (segment.Trailer ?? []).map(atomUs),
      framePeriod: undefined,
      // A biphase cell states both halves in both orders, so a copy is complete and nothing is left
      // over; and the lead in is the header's own atoms, never another segment's.
      cellCarriedFirst: false,
      leadFolded: false,
    };
  }

  // Which half of the cell carries the bit. Both halves varying is the `oneMark` shape of section 170,
  // where the mark rides with its own cell's bit; neither varying would be a protocol that cannot
  // encode anything and does not occur.
  let carries: FrameCarrier;
  let flat: number;
  let zero: number;
  let one: number;
  let oneMark: number | undefined;
  if (off.mark === on.mark) {
    carries = 'space';
    flat = off.mark;
    zero = off.space;
    one = on.space;
  } else if (off.space === on.space) {
    carries = 'mark';
    flat = off.space;
    zero = off.mark;
    one = on.mark;
  } else {
    carries = 'space';
    flat = off.mark;
    oneMark = on.mark;
    zero = off.space;
    one = on.space;
  }
  if (zero === one) return { refusal: 'neither half of the cell is constant' };
  // **When the shift is not equivalent, the frame is emitted in the cell's own order instead.**
  // Logitech states a cell as (space, mark) on 37 families where our table stores (mark, space), and for
  // 32 of them the wire is identical: the segment's own header is a lone mark of exactly the constant
  // length, so it **is** the first constant half and the rest is one alternating chain. `FrameTimings`
  // carries the full argument on `carriedFirst`; two things break the equivalence and both were found by
  // comparing against the archive's renderings, section 230.
  //
  // This was a pair of refusals for one day, which was the honest answer while the emitter could not
  // say it: 1058 commands of five families were being emitted wrongly, and refusing beat approximating.
  const carriedFirst = carries === 'space' && !off.markFirst
    && (oneMark !== undefined || (segment.Header ?? []).length === 0);

  // A header of no atoms is [0, 0], which is a real shape rather than a sentinel: the Sharp scheme
  // opens on its first bit cell.
  //
  // **A lone mark means three different things and the cell says which**, which is the last convention
  // difference between their notation and ours. Our reader takes a train from its first mark and reads
  // (mark, space) pairs, so where a cell is stated space first, everything shifts by one:
  //
  // * the mark carries the bit, as Sony's does, and the cell's constant space is the header's space:
  //   their `header [2400], cell (600 space, 600 or 1200 mark)` is our `header [2400, 600], flat 600`
  // * the space carries and there is a lead in **in another slot**, as JVC's is: their
  //   `JVC 16 Bit KeyCodeStart` code segment holds `8400, 4200`, which is section 159's finding in
  //   Logitech's own vocabulary, and the lone mark is then the first bit cell's
  // * the space carries and there is no lead in at all, as the Sharp scheme has none: the lone mark is
  //   the opening burst our table calls `firstMark`, 270 against 260 for all fourteen later cells
  const head = segment.Header ?? [];
  const lead = (protocol.definition.CodeSegments ?? [])
    .find((s) => s.Name === `${protocol.name} KeyCodeStart`)?.Header ?? [];
  let header: readonly [number, number];
  let firstMark: number | undefined;
  let leadFolded = false;
  // **A carried first frame's header is the segment's own atoms and nothing else.** None of the three
  // absorptions below applies: the lone mark is a genuine lead in rather than the first constant half,
  // there is nothing to fold a `KeyCodeStart` into, and `firstMark` is a convention of the other
  // spelling. A header of a mark and no space is a real shape and the emitter states it as one.
  if (carriedFirst) {
    if (head.length === 0) header = [0, 0];
    else if (head.length === 1 && head[0]!.Type === 1) header = [head[0]!.Value, 0];
    else if (head.length === 2 && head[0]!.Type === 1 && head[1]!.Type === 0) {
      header = [head[0]!.Value, head[1]!.Value];
    } else return { refusal: 'the header is not one mark and one space' };
  } else if (head.length === 0) header = [0, 0];
  else if (head.length === 2 && head[0]!.Type === 1 && head[1]!.Type === 0) {
    header = [head[0]!.Value, head[1]!.Value];
  } else if (head.length === 1 && head[0]!.Type === 1) {
    if (off.markFirst) return { refusal: 'the header has no space and the cell supplies none' };
    if (carries === 'mark') header = [head[0]!.Value, flat];
    else if (lead.length === 2 && lead[0]!.Type === 1 && lead[1]!.Type === 0) {
      header = [lead[0]!.Value, lead[1]!.Value];
      leadFolded = true;
      if (head[0]!.Value !== flat) firstMark = head[0]!.Value;
    } else {
      header = [0, 0];
      if (head[0]!.Value !== flat) firstMark = head[0]!.Value;
    }
  } else return { refusal: 'the header is not one mark and one space' };

  const field = Object.values(protocol.keycodeFields ?? {})[0];
  return {
    family: protocol.name,
    periodNs: periodOfCarrier(protocol.carrierHz),
    timings: {
      header, flat, zero, one, carries,
      ...(carriedFirst ? { carriedFirst } : {}),
      ...(oneMark === undefined ? {} : { oneMark }),
      ...(firstMark === undefined ? {} : { firstMark }),
    },
    bits: field?.bits,
    trailer: (segment.Trailer ?? []).map(atomUs),
    framePeriod: carries === 'mark' && segment.TotalLength ? segment.TotalLength : undefined,
    cellCarriedFirst: carries === 'space' ? !off.markFirst : off.markFirst,
    leadFolded,
  };
}

/**
 * Read one **named** segment of a definition as a rhythm, rather than the family's frame segment.
 *
 * **A family can send several rhythms inside one repetition**, section 232, and 44 of Logitech's 684
 * definitions do: `Classe 16 Bit Toggle` states four mode bits at a 442 microsecond half cell, one bit
 * at 880 and sixteen data bits back at 442, as three segments with three different cells. Reading only
 * the frame segment can emit a third of such a command.
 *
 * **It reads through `rhythmOfDefinition` on a synthetic one segment definition rather than repeating
 * its body**, which is this repository's oldest rule: two copies of a derivation are two copies until
 * one of them moves, and that reader is 180 lines of corrections. Three things are deliberately blanked
 * on the synthetic copy. Its `CodeSegments` are empty, so no lead in is folded in from a
 * `KeyCodeStart` group, which belongs to the family's first copy and not to its third segment. Its
 * `keycodeFields` are empty, so `bits` comes back undefined, which is right: the width belongs to the
 * code and a secondary segment's field is looked up by the caller. And the segment is renamed to the
 * family, since that is how the reader finds the frame.
 */
export function rhythmOfSegment(
  protocol: ArchiveProtocol, segment: Segment,
): ArchiveRhythm | { readonly refusal: ConversionRefusal } {
  return rhythmOfDefinition({
    ...protocol,
    keycodeFields: {},
    definition: {
      ...protocol.definition,
      IRSegments: [{ ...segment, Name: protocol.name }],
      CodeSegments: [],
    },
  });
}

/** A rhythm as the shape an emitter takes, or undefined where the rhythm states none. */
export function shapeOfRhythm(rhythm: ArchiveRhythm): FrameShape {
  return {
    ...(rhythm.timings === undefined ? {} : { timings: rhythm.timings }),
    ...(rhythm.biphase === undefined ? {} : { biphase: rhythm.biphase }),
    ...(rhythm.cells === undefined ? {} : { cells: rhythm.cells }),
  };
}

/**
 * The key a rhythm is looked up by: the carrier plus every duration the shape states.
 *
 * **Not a tolerance.** A lookup either matches Logitech's stated numbers exactly or does not match,
 * since the point of asking their catalogue is to get their answer rather than a nearby one. 653 of the
 * 684 definitions are distinct on this key alone; the width settles the rest, see `familiesOfRhythm`.
 *
 * A biphase key carries its **whole lead in**, which is deliberate and not thoroughness: RC6 and its
 * relatives differ from each other in the lead and nowhere else, so a key without it would collapse
 * families that send genuinely different signals.
 */
export function rhythmKey(
  periodNs: number,
  shape: { timings?: FrameTimings; biphase?: BiphaseTimings; cells?: CellTimings },
): string {
  // A cell table family states no durations at all, only whole cells, so its key is its cells,
  // section 231. The prefix keeps it from ever colliding with a two symbol family's key, the way the
  // biphase one does.
  const c = shape.cells;
  if (c !== undefined) {
    return ['cells', periodNs, c.bits, c.lead.join('+'),
            c.cells.map((one) => one.join('+')).join('|')].join('/');
  }
  const b = shape.biphase;
  if (b !== undefined) {
    return ['biphase', periodNs, b.mark, b.space, b.firstMark ?? '', b.setIsMark,
            b.lead.map((one) => (one.mark ? one.us : -one.us)).join('+')].join('/');
  }
  const t = shape.timings!;
  return [
    periodNs, t.header[0], t.header[1], t.flat, t.zero, t.one,
    t.carries, t.oneMark ?? '', t.firstMark ?? '',
  ].join('/');
}

/** A catalogue family at a rhythm, with the width its keycode field states. */
export interface CatalogueFamily {
  readonly family: string;
  readonly bits: number | undefined;
}

/**
 * Logitech's catalogue indexed by rhythm, for asking which family a measured rhythm is.
 *
 * Only the definitions `rhythmOfDefinition` can read are in it, so a rhythm being absent means either
 * that Logitech states no such family or that its shape is one this converter still refuses. Those two
 * are not distinguished here, which is why a caller that finds nothing keeps the name it had.
 */
export function catalogueByRhythmOf(protocols: readonly ArchiveProtocol[]): Map<string, CatalogueFamily[]> {
  const out = new Map<string, CatalogueFamily[]>();
  for (const protocol of protocols) {
    const read = rhythmOfDefinition(protocol);
    if ('refusal' in read) continue;
    const at = rhythmKey(read.periodNs, read);
    out.set(at, [...(out.get(at) ?? []), { family: read.family, bits: read.bits }]);
  }
  return out;
}

/**
 * Which catalogue families have this rhythm, narrowed by the width where the rhythm alone is ambiguous.
 *
 * **The width is a tie breaker rather than part of the key**, which is what the catalogue's own shape
 * asks for: every one of the 24 rhythms held by more than one family is that family at several bit
 * widths, `Sony 12`, `15` and `20` for instance. Using it as a tie breaker rather than a key also means
 * a family whose stated keycode width differs from the width of the frame on the wire, as a sectioned
 * one does, is still found.
 *
 * A list of more than one is **ambiguous and must not be collapsed by the caller**: 17 rhythms stay
 * ambiguous after the width, `Motorola 9 Bit Quad` against `Russound 9 Bit Quad` among them.
 */
export function familiesOfRhythm(
  catalogue: Map<string, CatalogueFamily[]>,
  periodNs: number,
  shape: { timings?: FrameTimings; biphase?: BiphaseTimings; cells?: CellTimings },
  bits?: number,
): CatalogueFamily[] {
  const all = catalogue.get(rhythmKey(periodNs, shape)) ?? [];
  if (all.length < 2 || bits === undefined) return all;
  const narrowed = all.filter((one) => one.bits === bits);
  return narrowed.length === 0 ? all : narrowed;
}

/**
 * The width of each frame a code of this family states, as the definition states them.
 *
 * **The family's own name is not enough and section 230 measured where it fails.** `statedCode` takes a
 * frame's width from the name, which is where Logitech put it and which is right for 179 of the 202
 * families whose codes state several values: `Akai 32 Bit` states two values of 32 bits each. On the
 * other **23** the name states the **total**: `Daewoo 16 Bit` sends two frames of 8 bits, and reading
 * both as 16 sends twice the bits, which is what comparing against the archive's renderings showed on
 * every one of its 9492 commands.
 *
 * The definition settles it: `keycodeFields` states a width per field, and the fields are ordered by
 * their own `token`. Returns undefined where the definition states no fields, in which case the name's
 * width is all there is.
 *
 * **In bits, always.** Their field states a **digit** count for a family whose cell carries more than one
 * bit, and this multiplies it out, so a caller never has to know which unit it is holding. Section 231.
 */
/**
 * The definition's keycode fields in the order a code states their values.
 *
 * **The order is by `sequence` and then by `token`, and `token` alone is ambiguous on 103 of the 681
 * definitions that state fields**, section 232. `Cisco 16 Bit Hex` states four fields whose tokens are
 * 0, 1, 0, 1, and what separates the pairs is that two belong to the start block and two to the repeat
 * cycle. Ordering by token alone left those to whatever order the JSON object happened to hold, which
 * this file's own docstring says must not be relied on, and it put the repeat cycle's value in the start
 * block on every one of that family's 720 commands.
 *
 * `sequence` plus `token` is unique on all 681, which is what makes this a total order rather than a
 * tidier guess.
 */
export function orderedFields(protocol: ArchiveProtocol): readonly {
  readonly bits: number; readonly segment: string; readonly sequence: string;
  readonly toggleBit: number | null; readonly token: number;
}[] {
  const rank = (one: string): number => (one === 'start' ? 0 : one === 'repeat' ? 1 : 2);
  return Object.values(protocol.keycodeFields ?? {})
    .sort((a, b) => rank(a.sequence) - rank(b.sequence) || a.token - b.token);
}

/**
 * How wide one of a code's values is and what base its digits are written in, resolved once.
 *
 * **Two sources state a value's width and the code's own index says which applies**, section 233. A
 * keycode writes each value as `<index>x<digits>`, and that index is a **segment id**: Logitech's
 * `Imon Multi Bit Hex` holds ten segments of seven, eight, nine and ten digits and its codes pick one
 * per group, so the width belongs to the segment the code names and not to the field's position. Ten
 * families of 684 disagree between the two, and taking the segment's word where it has one is what
 * brought the `Imon` pair and the last `Galaxis` command into agreement.
 *
 * Where the named segment states no width, the field at that position states it, which is every other
 * family. So this is one rule with a fallback rather than two rules.
 */
function statedShape(
  protocol: ArchiveProtocol, at: number, count: number, slot?: FrameSlot,
): { bits: number; per: number } | undefined {
  const refs = segmentRefs(protocol);
  const segments = protocol.definition.IRSegments ?? [];
  const named = slot === undefined ? undefined : refs.get(String(slot.index))?.SegmentName;
  const own = named === undefined ? undefined : segments.find((x) => x.Name === named);
  const stated = own?.Payload?.NumberOfBits;
  const shape = ((): { bits: number; per: number } | undefined => {
    if (stated !== undefined && stated !== null && stated > 0) {
      const per = bitsPerDigit(protocol, own);
      return { bits: stated * per, per };
    }
    const field = fieldAt(protocol, at, count);
    if (field === undefined) return undefined;
    const name = refs.get(field.segment)?.SegmentName;
    const per = bitsPerDigit(protocol, name === undefined ? undefined
      : segments.find((x) => x.Name === name));
    return { bits: field.bits * per, per };
  })();
  if (shape === undefined || slot === undefined) return shape;
  // **A cell family's own digit count wins where it is wider than the stated width**, section 233, and
  // the reason it applies to a cell family alone is what makes it a reading rather than a fit. Where a
  // digit is a whole cell, the number of digits **is** the number of cells the code sends, so a code
  // writing eight digits against a width of seven is stating a longer frame: `Galaxis 16 Bit Quad
  // Toggle` has one such command out of 21398 and the archive's renderer sends its eighth cell.
  //
  // For a two symbol family the digit count says nothing, since the value is written in hexadecimal and
  // a leading zero costs a digit and no bits. `Game Elements 15 Bit` is the case: 13 bits stated, four
  // hexadecimal digits written, and reading those as 16 bits sends three cells that are not there. So
  // the wider reading is taken only where a digit is a cell.
  const own_ = slot.digits * shape.per;
  return shape.per > 1 && own_ > shape.bits ? { bits: own_, per: shape.per } : shape;
}

/** One value as a keycode writes it: the segment id it names, and how many digits it spells. */
export interface FrameSlot {
  readonly index: number;
  readonly digits: number;
}

/**
 * The values a keycode writes, in order, as the segment each names and the digits each spells.
 *
 * Both halves are needed to say how wide a value is, section 233: the index names the segment whose
 * `NumberOfBits` states the width, and the digit count overrides it upward for a cell family, where a
 * digit is a whole cell and the code's own spelling is therefore a statement about length.
 */
export function frameSlots(keyCode: string): FrameSlot[] {
  const parsed = /^G:[^:]+:\(([^)]*)\)\(([^)]*)\)\(([^)]*)\)/.exec(keyCode);
  if (parsed === null) return [];
  const out: FrameSlot[] = [];
  for (const slot of [parsed[1]!, parsed[2]!, parsed[3]!]) {
    for (const part of slot.trim().split('_')) {
      const m = /^(\d)x([0-9A-Fa-f]+)$/.exec(part);
      if (m !== null) out.push({ index: Number(m[1]), digits: m[2]!.length });
    }
  }
  return out;
}

export function frameWidths(
  protocol: ArchiveProtocol, slots?: readonly FrameSlot[],
): number[] | undefined {
  const fields = orderedFields(protocol);
  if (fields.length === 0) return undefined;
  // **Per segment and not per family**, section 232. A family sending several rhythms can mix the bases:
  // `Motorola 16 Bit Quad Toggle` states eight base four digits, then **one** plain bit, then seven more
  // base four digits, so multiplying every field by the frame segment's two put an extra cell in the
  // middle of all 679 of its commands. A field with no segment of its own falls back to the family's.
  //
  // **And per the code's own segment where it names one**, section 233: pass the code's indices and each
  // width comes from the segment that index names, which is what the `Imon` families need.
  const positions = slots ?? fields.map(() => undefined);
  return positions.map((slot, at) =>
    statedShape(protocol, at, positions.length, slot)?.bits ?? 0);
}

/**
 * What base each of this family's values is written in, one entry per field, parallel to `frameWidths`.
 *
 * **The base is per field for the same reason the width is**, section 233, and this is the second half
 * of a correction that landed with only its first half. `frameWidths` was made per segment when
 * `Motorola 16 Bit Quad Toggle` turned out to mix a base four field with a plain bit, and the base a
 * keycode's digits are **parsed** in stayed one number for the whole family. On `Grundig 7 Bit Quad`
 * that reads a quaternary field's `0000010` as hexadecimal and sends 16 where the appliance is told 4.
 *
 * A family whose fields all agree yields an array of one value, which pairs with any number of values
 * and so behaves exactly as the single number did.
 */
export function frameDigitBases(
  protocol: ArchiveProtocol, slots?: readonly FrameSlot[],
): number[] | undefined {
  const fields = orderedFields(protocol);
  if (fields.length === 0) return undefined;
  const positions = slots ?? fields.map(() => undefined);
  const per = positions.map((slot, at) =>
    statedShape(protocol, at, positions.length, slot)?.per ?? 1);
  return per.every((one) => one === per[0]) ? [per[0]!] : per;
}

/**
 * How many bits one digit of this family's values carries: 1, 2 or 4.
 *
 * **A field's width is in digits where a cell carries more than one bit**, and that is Logitech's own
 * `EncodingType`, 2 or 3 for those families. Read off the cell count instead, which says the same thing
 * and is already in hand: four cells carry two bits each and sixteen carry four. Section 231.
 *
 * The reason this is a function rather than a constant is that a second unit in one field is how a reader
 * ends up sending half a command, so every width that leaves this file is in bits.
 *
 * **It is also the only trustworthy answer to what base a code's digits are written in**, which the
 * family's own name gets wrong. `Quad 5 Bit` names the word and is an ordinary two symbol family: five
 * bits, two encodings, its values plain hexadecimal. Read as quaternary its `0x13` becomes 7 and three
 * of its five renderable codes came out wrong, each with the leading digits of another number. So a
 * caller passes this into `statedCode` rather than letting the name decide. Section 231.
 */
export function bitsPerDigit(protocol: ArchiveProtocol, of?: Segment): number {
  const segment = of ?? frameSegment(protocol);
  const cells = (segment?.Payload?.Encodings ?? []).length;
  return cells === 16 ? 4 : cells === 4 ? 2 : 1;
}

/**
 * Every segment a definition holds, under the short id a keycode names it by.
 *
 * A keycode names its segments by an id and the definition names them by a full name, so this is the
 * join between the two. The rule is Logitech's and is read off their own names: a segment called
 * exactly the family's name is `"0"`, one whose name holds `KeyCode` is the text after that word, and
 * anything else is the text after the family's name and a space, which is how `RCAV1 24 Bit 2 1`
 * becomes `"1"`.
 */
export function segmentRefs(protocol: ArchiveProtocol): Map<string, SegmentRef> {
  const out = new Map<string, SegmentRef>();
  const add = (name: string | null, type: 0 | 1): void => {
    if (name === null) return;
    let id: string;
    if (name === protocol.name) id = '0';
    else if (name.includes('KeyCode')) id = name.slice(name.indexOf('KeyCode') + 'KeyCode'.length).trim();
    else if (name.startsWith(`${protocol.name} `)) id = name.slice(protocol.name.length + 1).trim();
    else id = name;
    if (!out.has(id)) out.set(id, { SegmentName: name, SegmentType: type });
  };
  for (const one of protocol.definition.IRSegments ?? []) add(one.Name, 1);
  for (const one of protocol.definition.CodeSegments ?? []) add(one.Name, 0);
  return out;
}

/**
 * One segment's length as the definition states it, and whether it closes a frame, section 308.
 *
 * **What a held power press is counted against.** Logitech's compiler fills a power step held for a
 * stated time with as many frames as **start** inside it, and it times each frame at the length the
 * definition states rather than the one the code is sent at: a segment's `TotalLength` where it has one,
 * and otherwise its header, its trailer and every bit at the **mean** of its two cell lengths, since
 * the compiler does not look at which bits a given code sets. All 27 held records of six compiles
 * follow it, and only the Panasonic power codes separate it from the sent lengths, their 48 bits being
 * mostly the shorter cell. The mean is preferred over the shorter and longer cell, 27 against 12 and 18,
 * and not identified: on that one family anything from 24 to 28 long bits of 48 fits.
 *
 * **`closes` is whether the segment ends a frame**, meaning its last duration is a silence over 10 ms,
 * the gap that separates frames everywhere else here. A segment that does not close is part of the frame
 * after it, which is the JVC family's opening `KeyCodeStart`: 8400 and 4200 microseconds, after which
 * the first frame is stated at 57.6 ms and compiled at exactly that. A padded segment, one stating a
 * `TotalLength`, always closes, its padding being the gap.
 */
export interface StatedSegmentLength {
  readonly us: number;
  readonly closes: boolean;
}

/** The gap between two frames: a silence longer than this separates them, as in `irframe.ts`. */
const FRAME_GAP_US = 10000;

/**
 * Every segment of a definition with a length the rule above can state, keyed the way a stated code
 * names it, `segmentRefs`. A payload segment with other than two cells and no `TotalLength` is left out,
 * the mean of two cells being all section 308 measured, and a caller needing it then refuses.
 */
export function statedSegmentLengths(protocol: ArchiveProtocol): Map<string, StatedSegmentLength> {
  const sum = (atoms: readonly Atom[] | null | undefined) => (atoms ?? []).reduce((total, one) => total + one.Value, 0);
  const closesOn = (atoms: readonly Atom[]) => {
    const last = atoms[atoms.length - 1];
    return last !== undefined && last.Type === 0 && last.Value > FRAME_GAP_US;
  };
  const byName = new Map<string, Segment>();
  for (const one of [...(protocol.definition.IRSegments ?? []), ...(protocol.definition.CodeSegments ?? [])]) {
    if (one.Name !== null && !byName.has(one.Name)) byName.set(one.Name, one);
  }
  const out = new Map<string, StatedSegmentLength>();
  for (const [id, ref] of segmentRefs(protocol)) {
    const segment = ref.SegmentName === null ? undefined : byName.get(ref.SegmentName);
    if (segment === undefined) continue;
    if (segment.TotalLength !== null && segment.TotalLength > 0) {
      out.set(id, { us: segment.TotalLength, closes: true });
      continue;
    }
    const payload = segment.Payload;
    if (payload !== null && payload.Encodings !== null && payload.Encodings.length > 0) {
      const cells = payload.Encodings.map((one) => sum(one.Atoms));
      if (cells.length !== 2 || payload.NumberOfBits === null) continue;
      out.set(id, {
        us: sum(segment.Header) + sum(segment.Trailer) + payload.NumberOfBits * (cells[0]! + cells[1]!) / 2,
        closes: closesOn(segment.Trailer ?? []),
      });
      continue;
    }
    // A code segment states its durations literally; one that states none in `Atoms` states them as a
    // header and a trailer, which is how the JVC lead in is written, both forms holding the same two.
    const atoms = segment.Atoms !== undefined && segment.Atoms !== null && segment.Atoms.length > 0
      ? segment.Atoms : [...(segment.Header ?? []), ...(segment.Trailer ?? [])];
    if (atoms.length === 0) continue;
    out.set(id, { us: sum(atoms), closes: closesOn(atoms) });
  }
  return out;
}

/**
 * The text of `src/infrared/segmentlengths.ts` as the archive's definitions state it, which `bin/segmentlengths.ts`
 * writes and a test compares the checked in file against; `segmentLengthsModule` in `archive.node.ts` reads them.
 */
export function segmentLengthsModuleOf(protocols: readonly ArchiveProtocol[]): string {
  const rows = protocols
    .map((protocol) => ({ family: protocol.name, lengths: statedSegmentLengths(protocol) }))
    .filter((one) => one.lengths.size > 0)
    .sort((a, b) => a.family.localeCompare(b.family));
  const quote = (text: string) => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const body = rows.map(({ family, lengths }) => {
    const ids = [...lengths].sort(([a], [b]) => a.localeCompare(b))
      .map(([id, one]) => `${quote(id)}: [${one.us}, ${one.closes}]`).join(', ');
    return `  ${quote(family)}: { ${ids} },`;
  }).join('\n');
  return `/**
 * Every protocol family's segment lengths as Logitech's own definitions state them: microseconds, and
 * whether the segment closes a frame. What a held power press is counted against, section 308, read by
 * \`longPressFramesOfStatedCode\` in \`stated.ts\`.
 *
 * **Generated by \`packages/codec/bin/segmentlengths.ts --write\` from the infrared archive alone, do not
 * edit by hand.** \`statedSegmentLengths\` in \`archive.ts\` says how each length is read. A segment is
 * keyed the way a stated code names it, its position digit or its word.
 */
export const SEGMENT_LENGTHS: Readonly<Record<string, Readonly<Record<string, readonly [number, boolean]>>>> = {
${body}
};
`;
}

/**
 * The three cycles **one command** states, in the shape the definition states its own default in.
 *
 * **A definition's `KeyCode` is the family's default and a command may name other segments**, which is
 * section 230's correction and which nothing here read for a while. `RCAV1 24 Bit 2` defaults to
 * repeating its second segment, whose lead in is 4000 microseconds; every command of it in Logitech's
 * catalogue writes `(0xE301CF)(0xE301CF)()`, both groups naming segment 0, whose lead in is 19800, and
 * the archive's renderer sends the 19800 in the repeat. So a held block built from the definition alone
 * is the family's default rather than that command's, and for this family they differ on every code.
 *
 * Returns undefined where a group names an id the definition does not hold, which is a refusal rather
 * than a guess.
 */
export function keyCodeOfStatedCode(
  protocol: ArchiveProtocol, code: StatedCode,
): ArchiveKeyCode | undefined {
  const refs = segmentRefs(protocol);
  const group = (items: readonly StatedItem[]): SegmentRef[] | undefined => {
    const out: SegmentRef[] = [];
    for (const one of items) {
      const ref = refs.get(segmentIdOf(one));
      if (ref === undefined) return undefined;
      out.push(ref);
    }
    return out;
  };
  const [start, repeat, finish] = [
    group(code.groups[0] ?? []), group(code.groups[1] ?? []), group(code.groups[2] ?? []),
  ];
  if (start === undefined || repeat === undefined || finish === undefined) return undefined;
  return { Start: start, Repeat: repeat, Finish: finish };
}

/**
 * The same frames with every toggle bit cleared.
 *
 * **What a toggle bit is.** A handful of protocol families, RC5 and its relatives, put one bit in the
 * command that has nothing to do with which button was pressed: it flips on every press, so an appliance
 * can tell a second press from the same press held down. The value is state, not identity.
 *
 * So a **rendering** of a command has to pick one, and the archive picks zero on all 13.29 million of
 * them, which its own README states. That is a condition on the comparison rather than a fact about the
 * command, and honouring it took 429 disagreements off the list: 369 `Thomson 12 Bit Toggle`, 52
 * `Videocrypt 11 Bit Toggle` and 8 `Philips RC5 13 Bit Toggle`. Section 230.
 *
 * **The position is counted from the top of the field**, which their own IRP string is the check on:
 * `Thomson 12 Bit Toggle` states `toggleBit` 4 over 12 bits and writes `Code0A:4, T:1, Code0B:7`, so the
 * toggle is the fifth bit sent and the fields either side of it are 4 and 7 wide.
 *
 * **A writer must not use this.** A real transmission alternates the bit, which is what
 * `pressMinimumRepeats` repetitions of a held key need; clearing it is for reproducing a rendering.
 */
/**
 * The definition's keycode fields in their own order, which is by `token` and not by object key.
 *
 * **A code may state more values than the definition has fields, and the fields still apply.** Their
 * renderer takes the last field for the extras, which is what `Philips 13 Bit` needs: one field of 13
 * bits and codes that state the same value three times. So the lookup **clamps** rather than requiring
 * the two counts to match, and requiring it is what left two of its commands and one of `Streamzap 14
 * Bit`'s with their toggle bit uncleared, section 230.
 */
function fieldAt(protocol: ArchiveProtocol, at: number, of: number):
{ bits: number; toggleBit: number | null; segment: string } | undefined {
  const fields = orderedFields(protocol);
  if (fields.length === 0) return undefined;
  // **The fields repeat where a code states a whole multiple of them, and clamp otherwise**, section
  // 232. Repeating is what `Galaxis 16 Bit Quad Toggle`'s three-repetition codes need, nine values over
  // three fields; clamping is what `Philips 13 Bit` needed and the two agree there, one field dividing
  // everything. A count that divides neither way keeps the clamp, which is the measured behaviour.
  const index = of % fields.length === 0 ? at % fields.length : Math.min(at, fields.length - 1);
  return fields[index];
}

/**
 * The same frames at the widths the definition states, rather than at the ones the family's name does.
 *
 * See `frameWidths` for why the name is not enough. This is the applier, and it exists beside
 * `withToggleCleared` because the two are the same kind of thing: what the definition says about a field,
 * imposed on a code that states only a value. **Wider than its field, a value loses its leading bits**,
 * which is Logitech's own stated rule and is what `Game Elements 15 Bit` needs: a name saying 15, a field
 * saying 13, and a code stating a 15 bit number.
 */
export function withStatedWidths(
  protocol: ArchiveProtocol,
  frames: readonly { readonly bits: number; readonly value: bigint }[],
  slots?: readonly FrameSlot[],
): readonly { readonly bits: number; readonly value: bigint }[] {
  // **In bits, like everything that leaves this file.** Their field states a digit count where a cell
  // carries more than one bit, and taking it raw is what made every base four family emit half its
  // symbols: `Mapletree 11 Bit Quad` sent six cells where the archive's renderer sends eleven, on all 1972
  // of its commands. Section 231.
  return frames.map((frame, at) => {
    // **The digit width is the field's own segment's**, section 232, since a family sending several
    // rhythms can mix the bases, and the **code's** own segment's where it names one, section 233.
    const shape = statedShape(protocol, at, frames.length, slots?.[at]);
    if (shape === undefined || shape.bits === frame.bits) return frame;
    return { ...frame, bits: shape.bits, value: frame.value & ((1n << BigInt(shape.bits)) - 1n) };
  });
}

export function withToggleCleared(
  protocol: ArchiveProtocol,
  frames: readonly { readonly bits: number; readonly value: bigint }[],
): readonly { readonly bits: number; readonly value: bigint }[] {
  return frames.map((frame, at) => {
    const mask = toggleMask(protocol, at, frames.length, frame.bits);
    return mask === undefined ? frame : { ...frame, value: frame.value & ~mask };
  });
}

/**
 * Where a frame's toggle bit sits, as a mask over its value, or `undefined` where its field states none or
 * states one outside the frame. The one place the position is computed, for clearing it and for flipping it.
 */
function toggleMask(protocol: ArchiveProtocol, at: number, of: number, bits: number): bigint | undefined {
  const toggle = fieldAt(protocol, at, of)?.toggleBit;
  if (toggle === undefined || toggle === null || toggle < 0 || toggle >= bits) return undefined;
  return 1n << BigInt(bits - 1 - toggle);
}

/**
 * The same frames with every toggle bit flipped: what the code sends on every second press, and what
 * Logitech's compiler writes into a record's **second pointer group**, todo-process-logitech 2.5.
 *
 * **What a configuration stores for a toggling code.** The remote cannot compute a bit, since the action
 * list language has no arithmetic reaching a duration stream, section 134, so the record carries the code
 * twice: the first pointer group as the code states it and the second with its toggle bit flipped, in its
 * first and held blocks; no toggling record in the lab has a tail. Measured on every record matched to a
 * toggling catalogue code in the lab's configurations, on the Harmony One, 650, 700 and 350 and the
 * contributed Harmony 880 or 885 configurations: the second group is this function's frames and nothing
 * else. The firmware picks the group, one bit per infrared group flipped on each send that reaches the
 * record start, read on the Harmony 650's 0.2 image and the Harmony One's 3.4, section 365.
 *
 * `undefined` where no frame carries a toggle bit, so a caller can tell a code that toggles from one whose
 * flip would change nothing.
 */
export function withToggleFlipped<F extends { readonly bits: number; readonly value: bigint }>(
  protocol: ArchiveProtocol, frames: readonly F[],
): readonly F[] | undefined {
  let flipped = false;
  const out = frames.map((frame, at): F => {
    const mask = toggleMask(protocol, at, frames.length, frame.bits);
    if (mask === undefined) return frame;
    flipped = true;
    return { ...frame, value: frame.value ^ mask };
  });
  return flipped ? out : undefined;
}

/**
 * One catalogue code read at the widths and in the bases its family's definition states, rather than the
 * ones its name spells: the reading `waveformOfArchiveCommand` makes, and the one the catalogue composer
 * makes since section 359. `undefined` where even the definition's widths do not read it.
 *
 * **Why this is a function of its own.** Until section 359 it was three lines inside
 * `waveformOfArchiveCommand`, and the composer read the same codes with `statedCode` alone, which takes
 * each width from the number before `Bit` in the family's name. Of the 142 families whose cell carries more
 * than one bit that number is the digit count on 66 and neither the digit nor the bit count on 72, section
 * 231; 43 names state no width at all, section 233; and a few state the right width and write values wider
 * than it, which the definition's route masks. So the composer refused 52658 commands of 156 families as unreadable while the
 * renderer that `make prontocheck` holds against every rendering in the archive read 52486 of them. Two
 * readings of one string is the state `CLAUDE.md` warns precedes two diverging answers, and it had
 * diverged: on 224 codes of three Quad Toggle families both read the code and the composer's widths sent
 * a different block. So both callers read through here.
 */
export function statedCodeOfDefinition(protocol: ArchiveProtocol, keycode: string): StatedCode | undefined {
  // **The code's own spelling decides each value's width**, section 233: the segment its index names
  // states the width, and for a cell family its digit count can widen it.
  const slots = frameSlots(keycode);
  const widths = frameWidths(protocol, slots);
  const perDigit = frameDigitBases(protocol, slots) ?? [bitsPerDigit(protocol)];
  // The definition's widths go **into** the reader and not over its answer: a base four or base sixteen
  // code is refused outright against the width its family's name states, so correcting it afterwards
  // would never see the code. Section 231.
  return statedCode(keycode, widths === undefined
    ? { bitsPerDigit: perDigit } : { widths, bitsPerDigit: perDigit });
}

/** Why a catalogue command could not be turned into a waveform. Each names a reading still to do. */
export type WaveformRefusal =
  | 'no rhythm derivable for the family'
  | 'our keycode reader declines the code'
  // The block's own reason is passed through rather than collapsed, since "no block" covered three
  // different causes and finding out which one dominated took a separate probe every time.
  | BlockRefusal
  | 'our encoder threw';

/**
 * The waveform one command of Logitech's catalogue sends, from their own protocol definition.
 *
 * **This composes seven readings and it exists so that there is one of it.** Reading a catalogue command
 * takes the family's rhythm, the definition's own field widths, the keycode grammar, the command's own
 * cycles rather than the family's default, the widths and the toggle bit imposed on the values, the
 * block derivation, and the extra rhythms a repetition may send. `make prontocheck` and
 * `test/pronto.test.ts` both need all seven, and the test carried its own copy until section 232, where
 * the copy fell two readings behind: it built a shape of two fields where there are three, so every cell
 * table family threw, and it had drifted silently once before that.
 *
 * `storedForm` is the one microsecond a configuration's last duration carries and a rendering does not,
 * so a comparison against the archive's renderer passes `false` and a writer wants the default.
 *
 * **`asStored` is the writer's other two differences from a rendering**, section 348, and it exists so
 * that the composer reads a command through these same seven readings rather than an eighth copy. A
 * rendering clears every toggle bit, which is the archive's convention for comparing, and a writer sends
 * the value the code states, which is what Logitech's compiles hold on every toggle family section 348
 * compared. And a rendering appends the release block to the first transmission, where a configuration
 * keeps it behind a pointer of its own: so under `asStored` the release block comes back separately as
 * `release`, and `once` is the record's first block alone. `toggleFlipped` builds the record's second
 * pointer group, todo-process-logitech 2.5: the same blocks with the toggle bit flipped, and the stated
 * frames where no frame carries one.
 */
export function waveformOfArchiveCommand(
  protocol: ArchiveProtocol, keycode: string,
  options: {
    readonly storedForm?: boolean; readonly repeats?: number; readonly asStored?: boolean;
    /** Under `asStored`, the code with its toggle bit flipped, `withToggleFlipped`: a record's second group. */
    readonly toggleFlipped?: boolean;
  } = {},
): { once: Pulse[]; held: Pulse[]; release?: Pulse[] } | { refusal: WaveformRefusal } {
  const rhythm = rhythmOfDefinition(protocol);
  if ('refusal' in rhythm) return { refusal: 'no rhythm derivable for the family' };
  const slots = frameSlots(keycode);
  const code = statedCodeOfDefinition(protocol, keycode);
  if (code === undefined) return { refusal: 'our keycode reader declines the code' };
  const keyCode = keyCodeOfStatedCode(protocol, code);
  if (keyCode === undefined) return { refusal: 'our keycode reader declines the code' };
  const built = blockOfDefinition(protocol, options.repeats ?? 1, {
    ...(options.storedForm === undefined ? {} : { storedForm: options.storedForm }),
    keyCode,
  });
  if ('refusal' in built) return { refusal: built.refusal };
  const widened = withStatedWidths(protocol, code.frames, slots);
  const frames = options.asStored !== true ? withToggleCleared(protocol, widened)
    : options.toggleFlipped === true ? withToggleFlipped(protocol, widened) ?? widened : widened;
  const shape: FrameShape = { ...shapeOfRhythm(rhythm), also: built.also };
  try {
    if (options.asStored === true) {
      return {
        once: pulsesOfBlock(shape, frames, built.tail),
        held: pulsesOfBlock(shape, frames, built.held),
        ...(built.release === undefined ? {} : { release: pulsesOfBlock(shape, frames, built.release) }),
      };
    }
    return {
      // **The release block goes on the end of the first transmission**, section 233, which is where
      // the archive's renderer puts it: its string has two sections and a press cycle has three
      // blocks. A configuration keeps it in a pointer of its own, which is why `built` hands it over
      // separately rather than already joined.
      once: [
        ...pulsesOfBlock(shape, frames, built.tail),
        ...(built.release === undefined ? [] : pulsesOfBlock(shape, frames, built.release)),
      ],
      held: pulsesOfBlock(shape, frames, built.held),
    };
  } catch {
    return { refusal: 'our encoder threw' };
  }
}
