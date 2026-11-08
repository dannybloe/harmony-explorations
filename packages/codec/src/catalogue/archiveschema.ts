/**
 * Logitech's protocol definition as a file of the archive states it, below the public `ArchiveProtocol`: its atoms,
 * its bit encodings, its segments and the definition they make up, and one stated interval read as signed
 * microseconds. What `archive.ts` and `archiveblock.ts` both read, and not re-exported by either, since none of it
 * was public when the two were one module.
 */
import type { ArchiveKeyCode } from './archive.ts';

/** An atom of a segment: `Type` 1 is carrier on, 0 is carrier off, and `Value` is microseconds. */
export interface Atom {
  readonly Type: number;
  readonly Value: number;
}

/** One bit value's cell, `BitType` 0 for a clear bit and 1 for a set one. */
export interface Encoding {
  readonly BitType: number;
  readonly Atoms: readonly Atom[] | null;
}

export interface Segment {
  readonly Name: string | null;
  readonly Header: readonly Atom[] | null;
  /** A code segment's literal durations. Absent on an infrared segment, which states a payload instead. */
  readonly Atoms?: readonly Atom[] | null;
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

/** Logitech's `IrProtocol`, the same contract `reference/logitech/data-model/model.md` records from their schema. */
export interface Definition {
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

/**
 * One stated interval as a signed number of microseconds, positive a mark and negative a space.
 *
 * **A stated zero becomes one microsecond**, section 233, and that is a reading rather than a rounding.
 * Nine of Logitech's families state a zero length interval, `QE Pulse Test 1`'s trailer being a zero
 * mark followed by a 25000 space, and six of the fifteen occurrences are zero **spaces**, so a zero
 * cannot be read as one polarity or the other. It cannot be carried as a zero either: the archive's reading,
 * `archive.ts` and `archiveblock.ts`, states an interval's polarity as its sign, and zero has none, so a stated zero mark arrived downstream
 * as a space and merged with the interval after it.
 *
 * **A zero space is left at zero and only a zero mark is floored**, which is asymmetric because the
 * convention it has to survive is: positive is a mark, zero or negative is a space. A zero space is
 * therefore expressible and a zero mark is not. Both are then handled the same way downstream, since a
 * zero contributes nothing to the merge of adjacent same polarity intervals and any word left standing
 * after it is floored to one unit. The archive's renderer answers both cases exactly that way, measured:
 * `QE Pulse Test 1`'s zero mark sits between two spaces, cannot merge, and is rendered `1`, while
 * `QE Space 100K Old`'s zero space is followed by another space, merges, and adds nothing to it.
 */
export function atomUs(a: { readonly Type: number; readonly Value: number }): number {
  return a.Type === 1 ? Math.max(1, a.Value) : -a.Value;
}
