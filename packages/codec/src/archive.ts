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
  BiphaseTimings, BlockTail, BlockTailItem, CellTimings, FrameCarrier, FrameTimings, Pulse,
} from './irframe.ts';
import type { StatedCode, StatedItem } from './stated.ts';

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
  readonly Payload: { readonly Encodings: readonly Encoding[] | null } | null;
  readonly Trailer: readonly Atom[] | null;
  readonly NumberOfBits: number | null;
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
   * and would have to be parsed, or `NumberOfBits`, which is null on every definition read here.
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
function cellRhythm(
  protocol: ArchiveProtocol, segment: Segment, encodings: readonly Encoding[],
): ArchiveRhythm | { readonly refusal: ConversionRefusal } {
  const bits = encodings.length === 4 ? 2 : 4;
  const cells: number[][] = [];
  for (const one of encodings) {
    const atoms = one.Atoms ?? [];
    // A zero length atom is nothing on the wire, so it is dropped rather than emitted: a zero interval
    // would key and compare like any other and would be floored to one unit by a renderer. Nothing in
    // the archive states one inside a cell, only in a header, and the drop is here so a future one is
    // handled the same way rather than sending an inaudible pulse.
    if (atoms.filter((a) => a.Value !== 0).length === 0) {
      return { refusal: 'a cell of this base states no intervals' };
    }
    // `BitType` is the symbol's own value, so the table is indexed by it rather than by written order.
    if (one.BitType < 0 || one.BitType >= encodings.length) {
      return { refusal: 'a cell of this base names a symbol outside its own range' };
    }
    cells[one.BitType] = atoms.filter((a) => a.Value !== 0)
      .map((a) => (a.Type === 1 ? a.Value : -a.Value));
  }
  if (cells.length !== encodings.length || cells.some((one) => one === undefined)) {
    return { refusal: 'a cell of this base names a symbol outside its own range' };
  }
  const field = Object.values(protocol.keycodeFields ?? {})[0];
  return {
    family: protocol.name,
    periodNs: periodOfCarrier(protocol.carrierHz),
    cells: {
      // **The zero length atoms go**, and one definition has one: `QE Space 100K Old` states its header
      // as a 5000 mark and a space of length 0, which is a mark and nothing after it. Emitting the zero
      // puts an interval on the wire that no renderer can express, since a Pronto word floors at one.
      lead: (segment.Header ?? []).filter((a) => a.Value !== 0)
        .map((a) => (a.Type === 1 ? a.Value : -a.Value)),
      cells,
      bits,
    },
    // **In digits and multiplied out to bits here**, because their field states a symbol count for these
    // families, which their `EncodingType` of 2 or 3 is what says so. Every other reading in this file
    // deals in bits and a second unit in one field is how a reader ends up sending half a command.
    bits: field === undefined ? undefined : field.bits * bits,
    trailer: (segment.Trailer ?? []).filter((a) => a.Value !== 0)
      .map((a) => (a.Type === 1 ? a.Value : -a.Value)),
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
      trailer: (segment.Trailer ?? []).map((a) => (a.Type === 1 ? a.Value : -a.Value)),
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
    trailer: (segment.Trailer ?? []).map((a) => (a.Type === 1 ? a.Value : -a.Value)),
    framePeriod: carries === 'mark' && segment.TotalLength ? segment.TotalLength : undefined,
    cellCarriedFirst: carries === 'space' ? !off.markFirst : off.markFirst,
    leadFolded,
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
export function frameWidths(protocol: ArchiveProtocol): number[] | undefined {
  const fields = Object.values(protocol.keycodeFields ?? {});
  if (fields.length === 0) return undefined;
  return [...fields].sort((a, b) => a.token - b.token).map((one) => one.bits * bitsPerDigit(protocol));
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
export function bitsPerDigit(protocol: ArchiveProtocol): number {
  const segment = frameSegment(protocol);
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
function fieldAt(protocol: ArchiveProtocol, at: number):
{ bits: number; toggleBit: number | null } | undefined {
  const fields = Object.values(protocol.keycodeFields ?? {}).sort((a, b) => a.token - b.token);
  if (fields.length === 0) return undefined;
  return fields[Math.min(at, fields.length - 1)];
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
): readonly { readonly bits: number; readonly value: bigint }[] {
  // **In bits, like everything that leaves this file.** Their field states a digit count where a cell
  // carries more than one bit, and taking it raw is what made every base four family emit half its
  // symbols: `Mapletree 11 Bit Quad` sent six cells where Logitech's renderer sends eleven, on all 1972
  // of its commands. Section 231.
  const per = bitsPerDigit(protocol);
  return frames.map((frame, at) => {
    const stated = fieldAt(protocol, at)?.bits;
    if (stated === undefined) return frame;
    const bits = stated * per;
    if (bits === frame.bits) return frame;
    return { ...frame, bits, value: frame.value & ((1n << BigInt(bits)) - 1n) };
  });
}

export function withToggleCleared(
  protocol: ArchiveProtocol,
  frames: readonly { readonly bits: number; readonly value: bigint }[],
): readonly { readonly bits: number; readonly value: bigint }[] {
  return frames.map((frame, at) => {
    const toggle = fieldAt(protocol, at)?.toggleBit;
    if (toggle === undefined || toggle === null || toggle < 0 || toggle >= frame.bits) return frame;
    const mask = 1n << BigInt(frame.bits - 1 - toggle);
    return { ...frame, value: frame.value & ~mask };
  });
}

/** Why a block could not be derived from a definition. Counted rather than thrown, as a refusal is. */
export type BlockRefusal =
  | 'the rhythm itself could not be read'
  | 'the definition states no repeat cycle'
  | 'a release block, which our table has no slot for'
  | 'a cycle names a segment the definition does not hold'
  | 'a cycle names an infrared segment stating a different rhythm'
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
  /** `pressMinimumRepeats`, or undefined on the 645 definitions that state none. */
  readonly statedRepeats: number | undefined;
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
  if (cycle.length === 0) return { refusal: 'the definition states no repeat cycle' };
  // A release block is a third block our table states no slot for, so a family that has one would be
  // emitted incomplete. 64 definitions carry one and none of the families measured here does.
  if ((keycode?.Finish ?? []).length > 0) {
    return { refusal: 'a release block, which our table has no slot for' };
  }
  const start = keycode?.Start ?? [];
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
  const infrared = protocol.definition.IRSegments ?? [];
  const literals = protocol.definition.CodeSegments ?? [];
  const named = (ref: SegmentRef): Segment | undefined =>
    (ref.SegmentType === 1 ? infrared : literals).find((s) => s.Name === ref.SegmentName);

  /** The words a payload copy leaves over: the constant half where the cell states it last, then the
   * trailer. */
  const closing = (trailer: readonly number[]): number[] => {
    const out: number[] = [];
    // Nothing is left over where the emitter states the cell in its own order: the copy already ends on
    // its constant half, so appending another would send it twice.
    if (rhythm.timings !== undefined && rhythm.cellCarriedFirst
      && rhythm.timings.carriedFirst !== true) {
      out.push(rhythm.timings.carries === 'space' ? rhythm.timings.flat : -rhythm.timings.flat);
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
  /** How long one biphase copy runs, which is fixed because both cells hold the same two halves. */
  const biphaseCopy = (): number | undefined => {
    const b = rhythm.biphase;
    if (b === undefined || rhythm.bits === undefined) return undefined;
    return b.lead.reduce((n, p) => n + p.us, 0) + rhythm.bits * (b.mark + b.space);
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
  const emit = (ref: SegmentRef, first: boolean, previous?: BlockTailItem): Emission | BlockRefusal => {
    const segment = named(ref);
    if (segment === undefined) return 'a cycle names a segment the definition does not hold';
    if (ref.SegmentType !== 1) {
      // A literal group: its header and trailer verbatim, padded out to its own stated total. This is
      // the ditto `Toshiba 32 Bit` and `JerroldO1 16 Bit` send after their one frame.
      const words = [...(segment.Header ?? []), ...(segment.Trailer ?? [])]
        .map((a) => (a.Type === 1 ? a.Value : -a.Value));
      const stated = segment.TotalLength ?? 0;
      const held = words.reduce((n, w) => n + Math.abs(w), 0);
      if (stated > held) words.push(...chunked(stated - held));
      return { items: [{ words }], nominal: Math.max(stated, held), padded: false };
    }
    // The frame. Only the segment the rhythm was read from can be emitted, since every duration in the
    // copy comes from that reading; a cycle naming another one is refused rather than approximated.
    const frame = infrared.find((s) => s.Name === protocol.name)
      ?? (infrared.length === 1 ? infrared[0] : undefined);
    // **A second infrared segment is not automatically a second rhythm.** A dual family such as
    // `Samsung 16 and 20 Bit` states its two frames as two segments, and our table holds one shape per
    // family, so the copies are the same shape at two frame indices. That is only sound if the second
    // segment states the same durations, which is checked here rather than assumed: a segment whose
    // header, trailer, padding or cells differ is refused.
    if (segment !== frame) {
      // Compared on the cells' own durations rather than on the raw objects, which carry per atom
      // bounds that differ between two segments stating the same rhythm.
      const cells = (one: Segment): string => JSON.stringify(
        (one.Payload?.Encodings ?? []).map((e) => [
          e.BitType, (e.Atoms ?? []).map((a) => (a.Type === 1 ? a.Value : -a.Value)),
        ]),
      );
      if (frame === undefined || cells(segment) !== cells(frame)) {
        return 'a cycle names an infrared segment stating a different rhythm';
      }
    }
    // Which of the code's frames this copy sends. **The index restarts with every repetition**, which
    // the two `Sharp 15` families measure: they alternate their two frames rather than sticking on the
    // second. The start block's payloads come first, so a cycle of one payload after a payload start is
    // the **second** frame, which is what `Pioneer 32 Bit 2` does.
    const at = Math.min(base + payloads, frames - 1);
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
    const ownHead = (segment.Header ?? []).map((a) => (a.Type === 1 ? a.Value : -a.Value));
    const frameHead = (frame?.Header ?? []).map((a) => (a.Type === 1 ? a.Value : -a.Value));
    const ownHeader = segment !== frame && JSON.stringify(ownHead) !== JSON.stringify(frameHead);
    // **The shift that models a constant half stated last needs a space in front of the copy.** Our
    // emitter opens a copy on the flat half, and for such a family that half belongs at the **end** of
    // the previous cell, so it only lands right where nothing carrying a level precedes it: an absorbed
    // header, or a gap. Where a mark comes immediately before, the two merge into one longer mark and
    // the signal is wrong by the length of the flat half.
    //
    // `Bell 16 Bit` and `Panasonic 31 Bit` are the case, section 230: both open on a lead in whose last
    // atom is a mark and both close each copy on a mark, so every one of their 905 commands disagreed
    // with Logitech's own rendering on that one interval. Refused rather than approximated.
    if (rhythm.cellCarriedFirst && !ownHeader && rhythm.timings?.carriedFirst !== true) {
      const before = previous;
      if (before !== undefined && 'words' in before) {
        const last = before.words[before.words.length - 1];
        if (last !== undefined && last > 0) return 'a copy stating its constant half last follows a mark';
      }
    }
    const bare = ownHeader || (rhythm.leadFolded && !(first && emitted === 1));
    const items: BlockTailItem[] = [];
    // Marked as the copy's own, so a copy period counts it: the lead in belongs to this segment and not
    // to the gap before it. Section 230.
    if (ownHeader && ownHead.length > 0) items.push({ words: ownHead, ofCopy: true });
    items.push({ copy: bare ? 'bare' : 'full', ...(at === 0 ? {} : { at }) });
    const words = closing((segment.Trailer ?? []).map((a) => (a.Type === 1 ? a.Value : -a.Value)));
    const stated = segment.TotalLength ?? 0;
    const fixed = biphaseCopy();
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
  ): BlockTail | BlockRefusal => {
    base = from;
    payloads = 0;
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
    for (const [index, list] of refs.entries()) {
      payloads = 0;
      // Every repetition counts its frames from where the start block stopped.
      if (opens && index > 0) base = startPayloads;
      for (const ref of list) {
        // The code segment a folded lead came from is skipped: its durations are already the first
        // copy's header, and emitting them again sends the lead twice.
        if (rhythm.leadFolded && ref.SegmentType === 0
          && ref.SegmentName === `${protocol.name} KeyCodeStart`) continue;
        const one = emit(ref, first, items[items.length - 1]);
        if (typeof one === 'string') return one;
        items.push(...one.items);
        if (one.nominal === undefined) known = false; else nominal += one.nominal;
        if (one.padded) {
          pads += 1;
          if (one.frame !== undefined) paddedFrames.add(one.frame);
          if (period !== undefined && period !== one.nominal) {
            return 'a padded cycle of several frames whose shared period is not one number';
          }
          period = one.nominal;
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
  const tail = build(
    [...(start.length > 0 ? [start] : []), ...Array.from({ length: repeats }, () => cycle)], true, 0,
  );
  if (typeof tail === 'string') return { refusal: tail };
  // The held block starts where the first block's start block left off, which is why
  // `Pioneer 32 Bit 2` repeats its **second** frame: its start block sent the first.
  const held = build([cycle], false, startPayloads);
  if (typeof held === 'string') return { refusal: held };
  return { tail, held, statedRepeats: protocol.pressMinimumRepeats ?? undefined };
}
