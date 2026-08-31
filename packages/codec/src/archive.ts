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
import type { BiphaseTimings, FrameCarrier, FrameTimings, Pulse } from './irframe.ts';

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
  | 'base four, a cell is one of four lengths'
  | 'base sixteen, a cell is one of sixteen lengths'
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
  /** The width the family's keycode field states, or undefined where it states none. */
  readonly bits: number | undefined;
  /** The closing mark and inter frame gap the trailer states, microseconds, a space negative. */
  readonly trailer: readonly number[];
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
  if (encodings.length === 4) return { refusal: 'base four, a cell is one of four lengths' };
  if (encodings.length === 16) return { refusal: 'base sixteen, a cell is one of sixteen lengths' };
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
  if (head.length === 0) header = [0, 0];
  else if (head.length === 2 && head[0]!.Type === 1 && head[1]!.Type === 0) {
    header = [head[0]!.Value, head[1]!.Value];
  } else if (head.length === 1 && head[0]!.Type === 1) {
    if (off.markFirst) return { refusal: 'the header has no space and the cell supplies none' };
    if (carries === 'mark') header = [head[0]!.Value, flat];
    else if (lead.length === 2 && lead[0]!.Type === 1 && lead[1]!.Type === 0) {
      header = [lead[0]!.Value, lead[1]!.Value];
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
      ...(oneMark === undefined ? {} : { oneMark }),
      ...(firstMark === undefined ? {} : { firstMark }),
    },
    bits: field?.bits,
    trailer: (segment.Trailer ?? []).map((a) => (a.Type === 1 ? a.Value : -a.Value)),
    framePeriod: carries === 'mark' && segment.TotalLength ? segment.TotalLength : undefined,
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
  periodNs: number, shape: { timings?: FrameTimings; biphase?: BiphaseTimings },
): string {
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
  shape: { timings?: FrameTimings; biphase?: BiphaseTimings },
  bits?: number,
): CatalogueFamily[] {
  const all = catalogue.get(rhythmKey(periodNs, shape)) ?? [];
  if (all.length < 2 || bits === undefined) return all;
  const narrowed = all.filter((one) => one.bits === bits);
  return narrowed.length === 0 ? all : narrowed;
}
