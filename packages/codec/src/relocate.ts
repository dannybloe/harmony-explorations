/**
 * Make room in a container: shift everything at or above one offset, rewrite every field that
 * states a moved address, and restamp what a length change invalidates.
 *
 * **This is the write side of `growth.ts`, and deliberately nothing more.** The survey there
 * answers "what would a length change move"; this performs exactly that list and not one byte
 * else. The pointer census is the single source of what gets rewritten, so a reader added
 * tomorrow joins the rewrite by joining the census, and `growth.ts`'s own rule that every entry
 * is checked against the reader that produced it holds here too: a census refusal aborts the
 * relocation rather than producing a file with one stale field.
 *
 * **What it does not do is decide where an insertion is safe.** The bytes between structures are
 * mechanical; the choice of `at` is not. Inserting inside an implied chain, a picture's rows or a
 * screen program's instruction run, produces a file that parses and means something different,
 * which is section 117's cloning demonstration, so a caller inserts at a stated boundary and the
 * corpus check in `test/relocate.test.ts` is what demonstrates those boundaries hold. The floor
 * and ceiling here refuse the only offsets that are wrong for **every** caller: the header and
 * section table, whose layout is the format's own arithmetic, and the trailer.
 *
 * **`edit.ts` keeps refusing length changes and this does not weaken that.** A same length edit
 * must not accidentally take this road: the two are separate entry points on purpose, and nothing
 * in `edit.ts` calls this.
 *
 * Read only towards hardware, like everything in this package: the result is bytes in memory, and
 * what may ever be written to a remote is `packages/usb`'s rails' question, not this file's.
 */
import { u32 } from './bytes.ts';
import {
  Container,
  END_MARKER_LENGTH,
  TRAILER_CHECKSUM_OFFSET,
  trailerChecksum,
} from './gspm.ts';
import { POINTER_WIDTH, pointers } from './growth.ts';
import { modeRecords } from './sections.ts';
import { Writer } from './emit.ts';

/** A refusal, named so a caller can tell a bad argument from a container the census disowns. */
export class RelocateError extends Error {}

/** One field the relocation rewrote, at its offset in the **new** blob, for the check to consume. */
export interface RewrittenField {
  at: number;
  /** The address now written there, which is the old target plus the delta. */
  to: number;
  /** The structure the field sits in, `coverage.ts`'s owner vocabulary via the census. */
  holder: string;
}

export interface Relocated {
  bytes: Uint8Array;
  /**
   * Every pointer field whose value changed, so a check can demand that the byte diff against the
   * shifted original is exactly this list plus the two restamps, and nothing else.
   */
  rewritten: RewrittenField[];
}

/** The largest address a three byte pointer can state, which a growth must not push one past. */
const POINTER_CEILING = 0xffffff;

/**
 * The lowest offset an insertion can go, which is **past the key table** and not merely past the
 * marker, and the corpus check is what established that rather than a reading: the firmware's own
 * parse reads the key table at a fixed offset after the marker, section 52, so filler between the
 * two would be read as key records whatever the mode table's rewritten pointer says. The one place
 * in the format where a structure's position is stated by a pointer **and** demanded by arithmetic
 * at once, which is why it gets its own function rather than a constant.
 */
export function relocationFloor(c: Container): number {
  const content = c.markerOffset + END_MARKER_LENGTH;
  const keyRecord = (modeRecords(c) ?? [])
    .find((record) => c.blobOffsetOf(record.start) === content);
  return c.hasKeyTable && keyRecord !== undefined ? content + keyRecord.length : content;
}

/**
 * Insert `delta` bytes of `fill` at blob offset `at` and return a container that means the same.
 *
 * Everything below `at` keeps its bytes; everything at or above moves up by `delta`; every census
 * pointer whose target moved is rewritten to the new address; `end_addr` grows by `delta` and the
 * trailer checksum is recomputed last, over the finished bytes. The two outward pointers, base
 * slot 2's log area naming flash above the container, are deliberately untouched: they state
 * flash the container does not own, so no shift of the container moves what they name.
 *
 * `omitForTest` disables the rewrite of one census holder class and exists only so the corpus
 * check can prove it would notice: a file relocated with a class omitted is exactly the valid
 * looking wrong file section 117 warns about, which is why the option's name says what it is for.
 */
export function relocate(
  c: Container,
  at: number,
  delta: number,
  options: { fill?: number; omitForTest?: string } = {},
): Relocated {
  if (!Number.isInteger(at) || !Number.isInteger(delta) || delta <= 0) {
    throw new RelocateError(`a relocation inserts a positive whole number of bytes, not ${delta}`);
  }
  // The floor is the first insertable byte of content, past the marker **and** past the key
  // table, per `relocationFloor`. The ceiling allows an insertion immediately below the trailer
  // and nowhere inside it.
  const floor = relocationFloor(c);
  const ceiling = c.blob.length - TRAILER_CHECKSUM_OFFSET;
  if (at < floor || at > ceiling) {
    throw new RelocateError(
      `insertion at ${at} is outside the content, which runs from ${floor} to ${ceiling}`);
  }

  const refusals: string[] = [];
  const census = pointers(c, refusals);
  if (refusals.length > 0) {
    throw new RelocateError(`the census disagrees with its readers: ${refusals[0]}`);
  }
  for (const p of census) {
    if (p.at < at && at < p.at + POINTER_WIDTH) {
      throw new RelocateError(
        `insertion at ${at} splits the ${p.holder} field at ${p.at}`);
    }
    if (p.lands !== undefined && p.lands >= at && p.target + delta > POINTER_CEILING) {
      throw new RelocateError(
        `${p.holder} would state 0x${(p.target + delta).toString(16)}, past a u24`);
    }
  }

  const bytes = new Uint8Array(c.blob.length + delta);
  bytes.set(c.blob.subarray(0, at), 0);
  bytes.fill(options.fill ?? 0, at, at + delta);
  bytes.set(c.blob.subarray(at), at + delta);

  const rewritten: RewrittenField[] = [];
  for (const p of census) {
    // A field's own position moves with the shift; whether its value moves is where it points.
    if (p.lands === undefined || p.lands < at) continue;
    if (options.omitForTest !== undefined && p.holder === options.omitForTest) continue;
    const fieldAt = p.at >= at ? p.at + delta : p.at;
    bytes.set(new Writer(POINTER_WIDTH).u24(p.target + delta).bytes, fieldAt);
    rewritten.push({ at: fieldAt, to: p.target + delta, holder: p.holder });
  }

  // The two restamps a growth invalidates, `restamps` in growth.ts: `end_addr` first, because the
  // checksum runs over it. The end marker's own position after the section table is untouched,
  // since it moves only when the slot count changes, which is per architecture and never a growth.
  bytes.set(new Writer(4).u32(u32(c.blob, 4) + delta).bytes, 4);
  bytes.set(new Writer(2).u16(trailerChecksum(bytes)).bytes,
            bytes.length - TRAILER_CHECKSUM_OFFSET);

  return { bytes, rewritten };
}
