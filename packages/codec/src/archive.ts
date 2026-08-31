/**
 * Reading Logitech's own protocol definitions out of the Harmony infrared archive.
 *
 * **What the archive is.** A third party's checkout of Logitech's infrared database,
 * `github.com/pickysysadmin/logitech-harmony-ir-archive`, holding **Logitech's own definition for 684
 * protocol families, verbatim**, where this project has measured the timings for 37. Decision 15 in
 * `docs/roadmap.md` is what may cross from it into this repository: durations and names, through this
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
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type {
  BiphaseTimings, BlockTail, BlockTailItem, CellTimings, FrameCarrier, FrameShape, FrameTimings,
  Pulse,
} from './irframe.ts';
import { pulsesOfBlock } from './irframe.ts';
// A value import and not only a type: `waveformOfArchiveCommand` composes the keycode reader with the
// rest. The dependency runs one way, `stated.ts` importing nothing from here.
import { statedCode, type StatedCode, type StatedItem } from './stated.ts';

/**
 * The archive schema this converter was written against.
 *
 * A different value is a refusal and not a warning: the layout of a definition is what every duration
 * here is read out of, so a changed schema means the numbers may be right, wrong or absent with nothing
 * to tell them apart. Pinned commit `d84df0b`, 30 August 2026, 684 definitions.
 */
export const ARCHIVE_SCHEMA_VERSION = 1;

/** An atom of a segment: `Type` 1 is carrier on, 0 is carrier off, and `Value` is microseconds. */
interface Atom {
  readonly Type: number;
  readonly Value: number;
}

/** One bit value's cell, `BitType` 0 for a clear bit and 1 for a set one. */
interface Encoding {
  readonly BitType: number;
  readonly Atoms: readonly Atom[] | null;
}

interface Segment {
  readonly Name: string | null;
  readonly Header: readonly Atom[] | null;
  readonly Payload: {
    readonly Encodings: readonly Encoding[] | null;
    /**
     * The segment's own width, set on all 884 segments in the archive.
     *
     * **It lives inside `Payload` and this interface had it at the top level**, where it is set on none
     * of them, which is why the field's own docstring on `keycodeFields` said it was always null. The
     * correction matters where a family sends several rhythms in one repetition, section 232: a
     * secondary segment has no `keycodeFields` entry of its own to look up, so this is the only place
     * its width is stated.
     */
    readonly NumberOfBits: number | null;
  } | null;
  readonly Trailer: readonly Atom[] | null;
  readonly TotalLength: number | null;
}

/** Logitech's `IrProtocol`, the same contract `docs/myharmony/model.md` records from their schema. */
interface Definition {
  readonly CarrierFrequency: number | null;
  readonly IRSegments: readonly Segment[] | null;
  readonly CodeSegments: readonly Segment[] | null;
  readonly Attributes: readonly unknown[] | null;
  readonly Flags: readonly unknown[] | null;
  readonly HoldDelay: number | null;
  readonly HoldMinimumRepeats: number | null;
  /**
   * Which segments a block is made of, which is the block structure stated outright.
   *
   * **Read on 31 August 2026 and it had been sitting there unread**, which is worth recording because
   * the shape of a block was reconstructed by hand from our own measurements first: `Repeat` is one
   * repetition, in order, `Start` is what precedes the first one, and `Finish` is what a release sends.
   * `SegmentType` says which list a name is in, 1 an infrared segment carrying a payload and 0 a code
   * segment of literal durations.
   */
  readonly KeyCode: ArchiveKeyCode | null;
}

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

/**
 * Check the archive's manifest and hand back its counts.
 *
 * Throws on an unknown schema version, which is the whole point: a reader that carries on against a
 * layout it does not know produces durations nobody can tell from correct ones.
 */
export function archiveManifest(root: string): {
  readonly schemaVersion: number;
  readonly generated: string;
  readonly counts: Readonly<Record<string, number>>;
} {
  const path = join(root, 'manifest.json');
  if (!existsSync(path)) throw new ArchiveError(`no manifest.json in ${root}`);
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as {
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

/**
 * Every protocol definition in the archive, in the order the filesystem hands them over.
 *
 * `protocols/index.json` is skipped: it is the archive's own index of the other files, not a
 * definition, and counting it is what made an early reading of this checkout report 685 families where
 * the manifest says 684.
 */
export function archiveProtocols(root: string): ArchiveProtocol[] {
  archiveManifest(root);
  const directory = join(root, 'protocols');
  if (!existsSync(directory)) throw new ArchiveError(`no protocols/ in ${root}`);
  const out: ArchiveProtocol[] = [];
  for (const file of readdirSync(directory).sort()) {
    if (!file.endsWith('.json') || file === 'index.json') continue;
    out.push(JSON.parse(readFileSync(join(directory, file), 'utf8')) as ArchiveProtocol);
  }
  return out;
}

/** The carrier as our table states it: a period in nanoseconds, **truncated and never rounded**. */
export function periodOfCarrier(hz: number): number {
  // Section 41: a record stores floor(1e9 / f). Rounding instead reports 30 of 37 families as
  // disagreeing with this archive by one nanosecond, which is how this was got backwards once.
  return Math.floor(1e9 / hz);
}

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
/**
 * One stated interval as a signed number of microseconds, positive a mark and negative a space.
 *
 * **A stated zero becomes one microsecond**, section 233, and that is a reading rather than a rounding.
 * Nine of Logitech's families state a zero length interval, `QE Pulse Test 1`'s trailer being a zero
 * mark followed by a 25000 space, and six of the fifteen occurrences are zero **spaces**, so a zero
 * cannot be read as one polarity or the other. It cannot be carried as a zero either: this whole file
 * states an interval's polarity as its sign, and zero has none, so a stated zero mark arrived downstream
 * as a space and merged with the interval after it.
 *
 * **A zero space is left at zero and only a zero mark is floored**, which is asymmetric because the
 * convention it has to survive is: positive is a mark, zero or negative is a space. A zero space is
 * therefore expressible and a zero mark is not. Both are then handled the same way downstream, since a
 * zero contributes nothing to the merge of adjacent same polarity intervals and any word left standing
 * after it is floored to one unit. Logitech's renderer answers both cases exactly that way, measured:
 * `QE Pulse Test 1`'s zero mark sits between two spaces, cannot merge, and is rendered `1`, while
 * `QE Space 100K Old`'s zero space is followed by another space, merges, and adds nothing to it.
 */
function atomUs(a: { readonly Type: number; readonly Value: number }): number {
  return a.Type === 1 ? Math.max(1, a.Value) : -a.Value;
}

function cellRhythm(
  protocol: ArchiveProtocol, segment: Segment, encodings: readonly Encoding[],
): ArchiveRhythm | { readonly refusal: ConversionRefusal } {
  const bits = encodings.length === 16 ? 4 : encodings.length === 4 ? 2 : 1;
  const cells: number[][] = [];
  for (const one of encodings) {
    const atoms = one.Atoms ?? [];
    // **A zero length atom is kept**, section 233, which is the reverse of what this did for a day. It
    // was dropped on the argument that no renderer can express a zero, since a Pronto word floors at
    // one; Logitech's own renderer expresses it as exactly that floor, measured on the nine `QE` test
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
  // comparing against Logitech's own renderings, section 230.
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
export function catalogueByRhythm(root: string): Map<string, CatalogueFamily[]> {
  const out = new Map<string, CatalogueFamily[]>();
  for (const protocol of archiveProtocols(root)) {
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
 * both as 16 sends twice the bits, which is what comparing against Logitech's own renderings showed on
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
  // Toggle` has one such command out of 21398 and Logitech's renderer sends its eighth cell.
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
 * The three cycles **one command** states, in the shape the definition states its own default in.
 *
 * **A definition's `KeyCode` is the family's default and a command may name other segments**, which is
 * section 230's correction and which nothing here read for a while. `RCAV1 24 Bit 2` defaults to
 * repeating its second segment, whose lead in is 4000 microseconds; every command of it in Logitech's
 * catalogue writes `(0xE301CF)(0xE301CF)()`, both groups naming segment 0, whose lead in is 19800, and
 * Logitech's own renderer sends the 19800 in the repeat. So a held block built from the definition alone
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
      const ref = refs.get(one.kind === 'frame' ? String(one.frame.index) : one.word);
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
  // symbols: `Mapletree 11 Bit Quad` sent six cells where Logitech's renderer sends eleven, on all 1972
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
    const toggle = fieldAt(protocol, at, frames.length)?.toggleBit;
    if (toggle === undefined || toggle === null || toggle < 0 || toggle >= frame.bits) return frame;
    const mask = 1n << BigInt(frame.bits - 1 - toggle);
    return { ...frame, value: frame.value & ~mask };
  });
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
 * so a comparison against Logitech's renderer passes `false` and a writer wants the default.
 */
export function waveformOfArchiveCommand(
  protocol: ArchiveProtocol, keycode: string,
  options: { readonly storedForm?: boolean; readonly repeats?: number } = {},
): { once: Pulse[]; held: Pulse[] } | { refusal: WaveformRefusal } {
  const rhythm = rhythmOfDefinition(protocol);
  if ('refusal' in rhythm) return { refusal: 'no rhythm derivable for the family' };
  // **The code's own spelling decides each value's width**, section 233: the segment its index names
  // states the width, and for a cell family its digit count can widen it.
  const slots = frameSlots(keycode);
  const widths = frameWidths(protocol, slots);
  const perDigit = frameDigitBases(protocol, slots) ?? [bitsPerDigit(protocol)];
  // The definition's widths go **into** the reader and not over its answer: a base four or base sixteen
  // code is refused outright against the width its family's name states, so correcting it afterwards
  // would never see the code. Section 231.
  const code = statedCode(keycode, widths === undefined
    ? { bitsPerDigit: perDigit } : { widths, bitsPerDigit: perDigit });
  if (code === undefined) return { refusal: 'our keycode reader declines the code' };
  const keyCode = keyCodeOfStatedCode(protocol, code);
  if (keyCode === undefined) return { refusal: 'our keycode reader declines the code' };
  const built = blockOfDefinition(protocol, options.repeats ?? 1, {
    ...(options.storedForm === undefined ? {} : { storedForm: options.storedForm }),
    keyCode,
  });
  if ('refusal' in built) return { refusal: built.refusal };
  const frames = withToggleCleared(protocol, withStatedWidths(protocol, code.frames, slots));
  const shape: FrameShape = { ...shapeOfRhythm(rhythm), also: built.also };
  try {
    return {
      // **The release block goes on the end of the first transmission**, section 233, which is where
      // Logitech's own renderer puts it: their string has two sections and a press cycle has three
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

/** Why a block could not be derived from a definition. Counted rather than thrown, as a refusal is. */
export type BlockRefusal =
  | 'the rhythm itself could not be read'
  | 'the definition states no repeat cycle'
  | 'a cycle names a segment the definition does not hold'
  | 'a cycle names an infrared segment stating no readable rhythm'
  | 'a padded cycle of several frames whose shared period is not one number'
  | 'a copy stating its constant half last follows a mark';

/**
 * A block as our table states it, derived from a definition, plus the repeat count it stated.
 *
 * `tail` is the whole first block and `held` is one repetition, which is our table's pair. **`held`
 * needs no repeat count and `tail` does**, which is the finding this type carries in its shape: a
 * repetition is stated in full by `KeyCode.Repeat`, and how many of them Logitech's compiler emits is
 * stated on 39 definitions of 684 and nowhere else.
 */
export interface ArchiveBlock {
  readonly tail: BlockTail;
  readonly held: BlockTail;
  /**
   * The block a remote sends when the key comes up, on the 60 families whose keycode names a third
   * group and undefined on the rest. Section 233.
   *
   * A configuration's record holds three block pointers and this is the third. Logitech's own renderer
   * has only two sections and appends this one to the **first**, which is how it was read.
   */
  readonly release?: BlockTail;
  /** `pressMinimumRepeats`, or undefined on the 645 definitions that state none. */
  readonly statedRepeats: number | undefined;
  /**
   * The **other** rhythms this block's copies go out in, for `FrameShape.also`.
   *
   * Empty on all but the 44 families whose segments do not state one rhythm, section 232. A copy item's
   * `shape` indexes it, offset by one, so a caller must pass this to the emitter or a copy naming a
   * later shape throws. That is deliberate: a silent fallback to the first shape would send one
   * segment in another's rhythm and the waveform would look well formed.
   */
  readonly also: readonly FrameShape[];
}

/**
 * Derive a family's first block and its held block from Logitech's own definition.
 *
 * **What a definition states and what it does not.** `KeyCode` names the segments of one repetition,
 * of a preceding start block and of a release block; each infrared segment states its trailer and, where
 * it is padded, the constant duration a copy is stretched to; each code segment states literal
 * durations. All of that is the block's **shape** and it is derived here. What is **not** stated, on 645
 * definitions of 684, is how many repetitions the compiler emits, so it is an argument rather than a
 * derivation. Where `pressMinimumRepeats` does state it, it agrees with all five of the blocks measured
 * here that have it, which is the only calibration available for it.
 *
 * **Three conventions of theirs are folded in, each measured against our own blocks.**
 *
 * * The block's **final duration is one microsecond longer** than the definition states. Measured on
 *   every one of the measured families that can show it, in both places it can land: the last pad where
 *   the block is padded, and the last literal word where it is not. **It is the stored form's and not
 *   the signal's**, section 230, which is what `storedForm: false` turns off: Logitech's compiler adds
 *   it when writing a configuration and their renderer does not when producing a waveform.
 * * A **padded copy** becomes a pad our emitter solves, against a block total where one repetition holds
 *   a single frame and against a per copy period where it holds several. The second branch is the two
 *   `Sharp 15` families, whose two frames differ in duration so one shared pad cannot state both.
 * * A **biphase** copy has a fixed duration, so its gap is a literal rather than a pad. That is not a
 *   choice: our emitter solves one pad value for a whole block, and the `+ 1` makes that division
 *   inexact, which is why Logitech's compiler stores literals for these families too.
 *
 * The gap is chunked at 32767 microseconds, which is the widest duration a stored word holds. **The
 * chunking is ours and not theirs**: `Magnavox 13 Bit`'s 92000 is stored as 32767, 32767 and 26466,
 * greedily, while `Microsoft 30 Bit`'s 68643 is stored as 32767, 17938 and 17938, which no greedy rule
 * produces. A gap is additive on the wire, so both send the same signal and a comparison is made on the
 * train rather than on the words.
 */
export function blockOfDefinition(
  protocol: ArchiveProtocol, repeats: number,
  options: { readonly storedForm?: boolean; readonly keyCode?: ArchiveKeyCode } = {},
): ArchiveBlock | { readonly refusal: BlockRefusal } {
  // **The one microsecond belongs to the stored form and not to the signal**, section 230. It is what
  // Logitech's **compiler** writes into a configuration, measured on every block we have off it; their
  // own **renderer**, which turns the same definition into a waveform, does not add it. Comparing our
  // blocks against 13 million of those renderings is what separated the two, and before that separation
  // the difference read as our being wrong by one unit on the last word of every padded family.
  const storedForm = options.storedForm ?? true;
  const rhythm = rhythmOfDefinition(protocol);
  if ('refusal' in rhythm) return { refusal: 'the rhythm itself could not be read' };
  // A command's own groups where the caller has them, the family's default otherwise. See
  // `keyCodeOfStatedCode` for why the two are not the same thing.
  const keycode = options.keyCode ?? protocol.definition.KeyCode;
  const cycle = keycode?.Repeat ?? [];
  const start = keycode?.Start ?? [];
  /** How many frames one repetition sends, which is where the release block's own frames start. */
  const cyclePayloadCount = cycle.filter((r) => r.SegmentType === 1).length;
  // **How many frames the code sends, which is the greater of what the definition names and what the
  // cycles ask for.** Taking it from `keycodeFields` alone is section 230's last correction: `Revox 11
  // Bit` declares **one** field and every one of its codes states **two** values, so a copy index
  // clamped at zero sent the first value twice and the second never. That is 79 commands over six
  // families, and it is the failure that is hardest to see from the outside, because the waveform is
  // well formed, decodes cleanly, and carries the wrong number.
  const frames = Math.max(
    Object.keys(protocol.keycodeFields ?? {}).length,
    [keycode?.Start ?? [], keycode?.Repeat ?? [], keycode?.Finish ?? []]
      .flat().filter((r) => r.SegmentType === 1).length,
    1,
  );
  const startPayloads = (keycode?.Start ?? []).filter((r) => r.SegmentType === 1).length;
  /**
   * How many values the code actually states, which is the ceiling on a copy's frame index.
   *
   * **`frames` is the greater of the field count and the payload count and cannot be that ceiling**,
   * section 232. A code stating **fewer** values than the definition has fields is real:
   * `Revox 11 Bit 2` declares two fields and 73 of its codes state one value, naming the second segment,
   * so a copy clamped at the field count asked for a frame the code does not hold and the emitter threw.
   * A code stating **more** than the field count is also real, section 230's `Revox 11 Bit`, which is why
   * `frames` takes the maximum. So the count of values is the supplied keycode's own payloads, and only
   * where no keycode was supplied does the field count have to stand in for it.
   */
  const values = options.keyCode === undefined ? frames : Math.max(
    [keycode?.Start ?? [], keycode?.Repeat ?? [], keycode?.Finish ?? []]
      .flat().filter((r) => r.SegmentType === 1).length,
    1,
  );
  const infrared = protocol.definition.IRSegments ?? [];
  const literals = protocol.definition.CodeSegments ?? [];

  /**
   * Every infrared segment's own rhythm, section 232, with the frame segment first.
   *
   * **A second infrared segment need not state the frame's rhythm and 44 families prove it.** A dual
   * family such as `Samsung 16 and 20 Bit` states two frames of the same shape and those are one entry
   * here; a toggle family such as `Classe 16 Bit Toggle` states three cells of different widths and
   * those are three. Reading only the first would emit a third of that command, and refusing the family
   * is what this did until 31 August 2026, at a cost of 84694 commands.
   *
   * Compared on the shape rather than on the segment objects, which carry per atom bounds that differ
   * between two segments stating the same rhythm, and keyed on the shape so two segments of one rhythm
   * share one entry and every existing block keeps its single shape and its `shape`-free copies.
   */
  const shapes: FrameShape[] = [];
  const readings: ArchiveRhythm[] = [];
  const shapeAt = new Map<string, number>();
  const frameOf = infrared.find((s) => s.Name === protocol.name)
    ?? (infrared.length === 1 ? infrared[0] : undefined);
  /**
   * A rhythm's key, **without its lead in**, which is what makes this additive rather than a rewrite.
   *
   * Two segments of one rhythm and two lead ins are already handled, by emitting the second's header as
   * literal words in front of a bare copy: that is `ownHeader` below and section 230 measured it into
   * place. Keying on the lead as well would give such a segment a shape of its own and route it down the
   * new path instead, which is a second way of saying the same thing and would have to earn its place
   * by measurement. So the key is the cells and the durations, and a difference in the lead alone still
   * takes the old route.
   */
  const shapeKey = (r: ArchiveRhythm): string => JSON.stringify([
    // **The lead is part of the key for the two shapes that have no bare form.** A pulse timing copy can
    // be emitted bare, by zeroing its header, so a segment differing only in its lead takes the older
    // route: its header goes out as literal words in front of a bare copy. A biphase or cell table copy
    // has no such form, so a lead of its own has to be a shape of its own or the frame's lead would be
    // sent again in front of every one of its copies.
    r.cells === undefined ? null : [r.cells.cells, r.cells.bits, r.cells.lead],
    r.biphase === undefined ? null
      : [r.biphase.mark, r.biphase.space, r.biphase.firstMark ?? null, r.biphase.setIsMark,
         r.biphase.lead],
    r.timings === undefined ? null
      : [r.timings.flat, r.timings.zero, r.timings.one, r.timings.carries, r.timings.oneMark ?? null,
         r.timings.firstMark ?? null, r.timings.carriedFirst === true, r.timings.closing ?? null],
    r.framePeriod ?? null,
  ]);
  if (frameOf !== undefined) {
    shapes.push(shapeOfRhythm(rhythm));
    readings.push(rhythm);
    shapeAt.set(shapeKey(rhythm), 0);
  }
  /** Which rhythm a segment goes out in, or a refusal naming why it could not be read. */
  const shapeIndex = (segment: Segment): number | BlockRefusal => {
    if (segment === frameOf) return 0;
    const read = rhythmOfSegment(protocol, segment);
    if ('refusal' in read) return 'a cycle names an infrared segment stating no readable rhythm';
    const key = shapeKey(read);
    const known = shapeAt.get(key);
    if (known !== undefined) return known;
    shapes.push(shapeOfRhythm(read));
    readings.push(read);
    shapeAt.set(key, shapes.length - 1);
    return shapes.length - 1;
  };
  const named = (ref: SegmentRef): Segment | undefined =>
    (ref.SegmentType === 1 ? infrared : literals).find((s) => s.Name === ref.SegmentName);
  /** A segment's full name back to the short id a `keycodeFields` entry names it by. */
  const refIds = new Map([...segmentRefs(protocol)].map(([id, ref]) => [ref.SegmentName ?? '', id]));

  /** The words a payload copy leaves over: the constant half where the cell states it last, then the
   * trailer. */
  const closing = (trailer: readonly number[], which: number): number[] => {
    const out: number[] = [];
    // **The rhythm the copy actually went out in**, section 232, not the family's first: a family can
    // send several and only the segment that was emitted knows whether its cell left a half over.
    const of = readings[which] ?? rhythm;
    // Nothing is left over where the emitter states the cell in its own order: the copy already ends on
    // its constant half, so appending another would send it twice.
    if (of.timings !== undefined && of.cellCarriedFirst && of.timings.carriedFirst !== true) {
      out.push(of.timings.carries === 'space' ? of.timings.flat : -of.timings.flat);
    }
    out.push(...trailer);
    return out;
  };
  /** A gap in stored words, each at most the widest a duration word holds. */
  const chunked = (us: number): number[] => {
    const out: number[] = [];
    for (let left = us; left > 0; left -= 32767) out.push(-Math.min(left, 32767));
    return out;
  };
  /**
   * How long one biphase copy runs, which is fixed because both cells hold the same two halves.
   *
   * **Per rhythm and per width since section 232**, because a family can send several: `Classe 16 Bit
   * Toggle`'s three segments are 442, 880 and 442 microsecond half cells at 4, 1 and 16 bits, so one
   * answer for the family would be wrong for two of the three. Undefined where the segment states no
   * width, since a copy's duration cannot be known without one.
   */
  const biphaseCopy = (which: number, bits: number | undefined): number | undefined => {
    const b = shapes[which]?.biphase;
    if (b === undefined || bits === undefined) return undefined;
    return b.lead.reduce((n, p) => n + p.us, 0) + bits * (b.mark + b.space);
  };

  // One emission of a `KeyCode` entry: its items and the duration it nominally runs for, which is what
  // a block total is summed from. A payload emission's own duration is value dependent, so an unpadded
  // one contributes nothing and the block then carries no total, which is right: it has no pad either.
  interface Emission {
    items: BlockTailItem[];
    nominal: number | undefined;
    padded: boolean;
    /** Which of the code's frames this copy sent, so a block can tell one padded frame from two. */
    frame?: number;
  }
  let payloads = 0;
  let base = 0;
  /** How many payload copies the whole block has emitted, which is what decides the folded lead. */
  let emitted = 0;

  /**
   * Which of the code's values each segment carries, keyed by the segment id a keycode names.
   *
   * **A cycle position picks the next unused field whose `segment` matches it**, section 232, and that
   * is a strict generalisation of counting payloads rather than a second rule: where every field names
   * segment `"0"`, the list for `"0"` is 0, 1, 2 and taking the k-th gives exactly the payload counter.
   * Where a cycle names segments in an order the fields do not, it differs and the fields win.
   * `LifesizeIconA 17 Bit Toggle` is the case: its cycle is 0, 1, 0, 1 and its fields in token order are
   * 0, 0, 1, 1, so the counter pairs the second cycle position with the second field and the pairing
   * rule pairs it with the third.
   *
   * Used only where there is a field per frame and every payload's id has one, since otherwise it
   * cannot answer: `Revox 11 Bit` declares one field and its codes state two values, section 230, and
   * there the payload counter is still the reading.
   */
  const perSegment = new Map<string, number[]>();
  {
    const fields = orderedFields(protocol);
    fields.forEach((f, at) => {
      const key = `${f.sequence}|${f.segment}`;
      perSegment.set(key, [...(perSegment.get(key) ?? []), at]);
    });
    const asked = [
      ...(keycode?.Start ?? []).map((r) => ['start', r] as const),
      ...cycle.map((r) => ['repeat', r] as const),
    ].filter(([, r]) => r.SegmentType === 1)
      .map(([seq, r]) => `${seq}|${refIds.get(r.SegmentName ?? '') ?? ''}`);
    // **Every position asked for needs a field of its own**, which is the guard rather than tidiness: a
    // dual family's code states two values and gives both the position digit `0`, so its cycle names
    // segment `"0"` twice where only one field does. Pairing both with that one field sent the first
    // value twice and the second never, on 8 `MemorexV2 32 Bit Dual` commands and 48 `Daewoo 16 Bit`
    // ones. Where the pairing cannot answer, the payload counter is still the reading.
    const wanted = new Map<string, number>();
    for (const key of asked) wanted.set(key, (wanted.get(key) ?? 0) + 1);
    const short = [...wanted].some(([key, n]) => (perSegment.get(key) ?? []).length < n);
    if (fields.length !== frames || short) perSegment.clear();
  }
  /** How many times this group has already named each segment id, keyed as the map above. */
  let seenId = new Map<string, number>();
  const emit = (
    ref: SegmentRef, first: boolean, sequence: 'start' | 'repeat' | 'finish', previous?: BlockTailItem,
  ): Emission | BlockRefusal => {
    const segment = named(ref);
    if (segment === undefined) return 'a cycle names a segment the definition does not hold';
    // **A segment with no payload is a literal whatever its declared type**, section 233. `Airboard
    // 9 Bit` states its repeat and its release as infrared segments, type 1, carrying a whole waveform
    // in the header and no `Payload` at all, so reading the type alone sent them down the frame path
    // and refused 151 codes. There is nothing to fill in, which is what makes it a literal.
    if (ref.SegmentType !== 1 || segment.Payload === undefined || segment.Payload === null) {
      // A literal group: its header and trailer verbatim, padded out to its own stated total. This is
      // the ditto `Toshiba 32 Bit` and `JerroldO1 16 Bit` send after their one frame.
      const words = [...(segment.Header ?? []), ...(segment.Trailer ?? [])]
        .map(atomUs);
      const stated = segment.TotalLength ?? 0;
      const held = words.reduce((n, w) => n + Math.abs(w), 0);
      if (stated > held) words.push(...chunked(stated - held));
      return { items: [{ words }], nominal: Math.max(stated, held), padded: false };
    }
    // The frame, and **which of the family's rhythms it goes out in**, section 232. A dual family such
    // as `Samsung 16 and 20 Bit` states two frames of the same shape and both are rhythm 0 at two frame
    // indices; a toggle family such as `Classe 16 Bit Toggle` states three cells of different widths and
    // those are three rhythms in one repetition. This refused the second case outright until 31 August
    // 2026, at a cost of 84694 commands, and a segment stating a shape our reader cannot read at all is
    // still a refusal rather than a coercion into the frame's.
    const frame = frameOf;
    const which = shapeIndex(segment);
    if (typeof which === 'string') return which;
    // Which of the code's frames this copy sends. **The index restarts with every repetition**, which
    // the two `Sharp 15` families measure: they alternate their two frames rather than sticking on the
    // second. The start block's payloads come first, so a cycle of one payload after a payload start is
    // the **second** frame, which is what `Pioneer 32 Bit 2` does.
    // **Which of the code's values this copy carries.** The k-th time a group names a segment, it takes
    // the k-th field of that group with that segment, section 232. Where every field names segment `"0"`
    // that is exactly the payload counter below, so this is a generalisation rather than a second rule;
    // where a group names its segments in an order the fields do not, the fields win, which is what
    // `LifesizeIconA 17 Bit Toggle`'s 0, 1, 0, 1 cycle over 0, 0, 1, 1 fields needs. `base` plays no
    // part here because the group already says whether this is the start block or a repetition.
    const key = `${sequence}|${refIds.get(ref.SegmentName ?? '') ?? ''}`;
    const mine = perSegment.get(key);
    const kth = seenId.get(key) ?? 0;
    seenId.set(key, kth + 1);
    const at = mine === undefined ? Math.min(base + payloads, values - 1)
      : Math.min(mine[kth] ?? mine[mine.length - 1]!, values - 1);
    payloads += 1;
    emitted += 1;
    // A folded lead sits inside the first block's first copy; every later copy drops it, and so does
    // every copy of the held block, which is what `JVC 16 Bit`'s measured pair shows.
    // **A second segment states its own header, and it need not be the frame's.** Three cases occur and
    // one rule covers them: the second frame of `Samsung 16 and 20 Bit` has no header at all and opens
    // straight on a bit cell, `BelCanto 16 Bit`'s has a header of its own, 525 and 4200 where the frame's
    // is 8400 and 4200, and `Sharp 15 Bit`'s cycle names the same segment twice so there is nothing to
    // differ. A copy's header comes from the shape, which is one per family, so a header of its own is
    // emitted as literal words and the copy is `bare`.
    //
    // Found by comparing against Logitech's own renderings, section 230: taking the second copy as
    // `full` sent the frame's 8400 lead in where their renderer sends 525, on every code of the family.
    const ownHead = (segment.Header ?? []).map(atomUs);
    const frameHead = (frame?.Header ?? []).map(atomUs);
    // **Only where the copy goes out in the frame's own rhythm**, section 232. A segment with a rhythm
    // of its own carries its own lead in inside that rhythm, so emitting the header again as literal
    // words would send it twice, and marking the copy `bare` would drop a biphase lead the emitter has
    // no way to put back.
    const ownHeader = which === 0 && segment !== frame
      && JSON.stringify(ownHead) !== JSON.stringify(frameHead);
    // **The shift that models a constant half stated last needs a space in front of the copy.** Our
    // emitter opens a copy on the flat half, and for such a family that half belongs at the **end** of
    // the previous cell, so it only lands right where nothing carrying a level precedes it: an absorbed
    // header, or a gap. Where a mark comes immediately before, the two merge into one longer mark and
    // the signal is wrong by the length of the flat half.
    //
    // `Bell 16 Bit` and `Panasonic 31 Bit` are the case, section 230: both open on a lead in whose last
    // atom is a mark and both close each copy on a mark, so every one of their 905 commands disagreed
    // with Logitech's own rendering on that one interval. Refused rather than approximated.
    const of = readings[which] ?? rhythm;
    if (of.cellCarriedFirst && !ownHeader && of.timings?.carriedFirst !== true) {
      const before = previous;
      if (before !== undefined && 'words' in before) {
        const last = before.words[before.words.length - 1];
        if (last !== undefined && last > 0) return 'a copy stating its constant half last follows a mark';
      }
    }
    const bare = ownHeader || (of.leadFolded && !(first && emitted === 1));
    const items: BlockTailItem[] = [];
    // Marked as the copy's own, so a copy period counts it: the lead in belongs to this segment and not
    // to the gap before it. Section 230.
    if (ownHeader && ownHead.length > 0) items.push({ words: ownHead, ofCopy: true });
    items.push({
      copy: bare ? 'bare' : 'full',
      ...(at === 0 ? {} : { at }),
      ...(which === 0 ? {} : { shape: which }),
    });
    const words = closing((segment.Trailer ?? []).map(atomUs),
                          which);
    const stated = segment.TotalLength ?? 0;
    const fixed = biphaseCopy(which,
      which === 0 ? rhythm.bits : (segment.Payload?.NumberOfBits ?? undefined));
    if (stated > 0 && fixed !== undefined) {
      // Biphase: the copy's duration is known, so the gap is a literal.
      const held = words.reduce((n, w) => n + Math.abs(w), 0);
      if (words.length > 0) items.push({ words: [...words, ...chunked(stated - fixed - held)] });
      else items.push({ words: chunked(stated - fixed) });
      return { items, nominal: stated, padded: false };
    }
    if (words.length > 0) items.push({ words });
    if (stated > 0) items.push({ pad: 0 });
    return { items, nominal: stated > 0 ? stated : undefined, padded: stated > 0, frame: at };
  };

  const build = (
    refs: readonly (readonly SegmentRef[])[], first: boolean, from: number,
    named?: readonly ('start' | 'repeat' | 'finish')[],
  ): BlockTail | BlockRefusal => {
    base = from;
    payloads = 0;
    seenId = new Map();
    emitted = 0;
    const opens = first && start.length > 0 && refs.length > 1;
    const items: BlockTailItem[] = [];
    let nominal = 0;
    let pads = 0;
    let known = true;
    let period: number | undefined;
    let cyclePayloads = 0;
    /** The frames a pad was solved for, which is one of the two tests between the two pad rules. */
    const paddedFrames = new Set<number>();
    /** Set once two padded copies of one cycle state different periods. */
    let perPad = false;
    /** Each padded copy's own stated period, and where its pad item sits, so it can be stamped. */
    const nominals: (number | undefined)[] = [];
    const padItems: number[] = [];
    for (const [index, list] of refs.entries()) {
      payloads = 0;
      seenId = new Map();
      // Every repetition counts its frames from where the start block stopped.
      if (opens && index > 0) base = startPayloads;
      for (const ref of list) {
        // The code segment a folded lead came from is skipped: its durations are already the first
        // copy's header, and emitting them again sends the lead twice.
        if (rhythm.leadFolded && ref.SegmentType === 0
          && ref.SegmentName === `${protocol.name} KeyCodeStart`) continue;
        const one = emit(ref, first,
                         named?.[index] ?? (opens && index === 0 ? 'start' : 'repeat'),
                         items[items.length - 1]);
        if (typeof one === 'string') return one;
        items.push(...one.items);
        if (one.nominal === undefined) known = false; else nominal += one.nominal;
        if (one.padded) {
          pads += 1;
          if (one.frame !== undefined) paddedFrames.add(one.frame);
          // **Where two copies of one cycle state different periods, each pad carries its own**,
          // section 233. This was a refusal, 7353 codes over 21 families, on the reading that a block
          // has one copy period. It has one **default**: 21 families state a `TotalLength` per segment
          // and send two of them per repetition, `Adcom 12 Bit Dual` padding to 53500 and then to
          // 107000, so the number belongs to the pad and the block's is what a pad falls back on.
          if (period !== undefined && period !== one.nominal) perPad = true;
          period = one.nominal;
          nominals.push(one.nominal);
          padItems.push(items.length - 1);
        }
      }
      if (index === refs.length - 1) cyclePayloads = list.filter((r) => r.SegmentType === 1).length;
    }
    // The one microsecond the compiler adds to a block's last duration, in whichever of the two places
    // that block ends.
    const last = storedForm ? items[items.length - 1] : undefined;
    if (last !== undefined && 'pad' in last) items[items.length - 1] = { pad: 1 };
    else if (last !== undefined && 'words' in last && last.words.length > 0) {
      const words = [...last.words];
      const at = words.length - 1;
      words[at] = words[at]! + Math.sign(words[at]!);
      items[items.length - 1] = { words };
    }
    const lead = first && rhythm.leadFolded && rhythm.timings !== undefined
      ? rhythm.timings.header[0] + rhythm.timings.header[1] : 0;
    if (pads === 0) return { items };
    // Stamping happens after the walk, since whether the periods differ is only known at the end.
    //
    // **A block total nobody can compute is the second case for a per pad period**, section 233. The
    // first is two pads disagreeing; this one is a cycle where a padded copy sits beside an unpadded
    // one whose length the definition does not state, so the block has no total to solve against while
    // the pad itself knows exactly what it is stretching to. `Airboard 9 Bit` is the case, 151 codes: a
    // start block of one padded segment and one that states no total at all.
    if (perPad || !known) {
      for (const [n, at] of padItems.entries()) {
        const item = items[at];
        const own = nominals[n];
        if (item === undefined || !('pad' in item) || own === undefined) {
          return 'a padded cycle of several frames whose shared period is not one number';
        }
        items[at] = { ...item, period: own };
      }
      return { items };
    }
    // **A block pads each copy to its own period where the copies can differ in length, and against a
    // single block total where they cannot. Two tests and not one, which cost a measurement to get
    // right**, section 230. A cycle of several payloads needs a pad each, those frames being different
    // values. So does a block whose **start block and cycle** pad different frames, which is the case
    // that was missed: `Roku 32 Bit 1` states one payload per cycle and pads twice, its start block's
    // value and its repetition's, and the two carry a different number of set bits, so one shared pad
    // splits the difference and both are wrong. 52 of its 918 commands, the other 866 agreeing only
    // because their two values happen to run the same length; `Daewoo 40 Bit` is the same shape and was
    // wrong on all 27 of its.
    //
    // **Replacing the first test rather than joining it costs 9488 commands**, measured over the whole
    // archive: a cycle of two payloads that clamp to one frame index has one padded frame and several
    // pads, so it needs the per copy rule, and the frame test alone sends it to the block total where
    // the division does not come out whole and the emitter refuses. Both tests are load bearing.
    if (cyclePayloads > 1 || paddedFrames.size > 1) return { items, copyPeriod: period! };
    if (!known) return 'a padded cycle of several frames whose shared period is not one number';
    return { items, total: nominal + lead + (storedForm ? 1 : 0) };
  };

  // The first block is the start block then the cycle as many times as asked; the held block is one
  // cycle, and needs no count at all.
  // **A code may state no repetition, and then its start block is the whole transmission**, section
  // 233. This was a refusal, 1334 codes over 21 families, on the reading that a block pair needs a
  // cycle. It does not: `B and O 17 Bit 2` writes `(0x01111111111111111)()()`, a start block and
  // nothing else, which is a command sent once however long the key is held. So the held block is
  // **empty** rather than absent, which is the honest answer and is what a remote does with it: it
  // repeats nothing.
  if (cycle.length === 0 && start.length === 0) {
    return { refusal: 'the definition states no repeat cycle' };
  }
  const tail = build(cycle.length === 0 ? [start]
    : [...(start.length > 0 ? [start] : []), ...Array.from({ length: repeats }, () => cycle)], true, 0);
  if (typeof tail === 'string') return { refusal: tail };
  // The held block starts where the first block's start block left off, which is why
  // `Pioneer 32 Bit 2` repeats its **second** frame: its start block sent the first.
  const held = cycle.length === 0 ? { items: [] } : build([cycle], false, startPayloads);
  if (typeof held === 'string') return { refusal: held };
  // **The release block, which our table does have a slot for after all**, section 233. This refused
  // any family whose keycode names a third group, 60 families and 17230 codes, on the ground that our
  // block pair had nowhere to put it. A configuration's record holds **three** block pointers, once,
  // held and tail, and the third is exactly this: what a remote sends when the key comes up.
  //
  // What settled it was Logitech's own rendering, which has only two sections and puts the release
  // group at the end of the **first** one. Ours was an exact prefix of theirs on every one of the 60
  // families, and every length difference was a whole number of the release group's own frames, so
  // reading it as a block appended to the first transmission is a measurement rather than a guess.
  //
  // It is built as its own block rather than appended to `tail`, because a configuration keeps it in a
  // pointer of its own and because appending it would move the pad arithmetic: the pad rule reads the
  // payload count of the **last** group it walked, and the stored form's one extra microsecond lands on
  // the block's last duration.
  const finish = keycode?.Finish ?? [];
  let release: BlockTail | undefined;
  if (finish.length > 0) {
    const built = build([finish], false, startPayloads + cyclePayloadCount, ['finish']);
    if (typeof built === 'string') return { refusal: built };
    release = built;
  }
  return {
    tail, held,
    ...(release === undefined ? {} : { release }),
    statedRepeats: protocol.pressMinimumRepeats ?? undefined,
    also: shapes.slice(1),
  };
}
