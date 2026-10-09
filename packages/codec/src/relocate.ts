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
  parse,
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

/**
 * Remove `count` bytes at blob offset `at` and return a container that means the same, less them.
 *
 * **`relocate`'s mirror, and it exists for one structure first**: a one page screen deadens the two
 * page turn keys with entries in its mode record's own tagged list, 598 of 598 one page modes of the
 * six Harmony One containers, 531 of them both null, and a menu that grows to a second page has to lose
 * them or its second page cannot be reached. Rebinding them to something else instead would be a
 * list no compiled configuration carries, so the entries are cut, which is a length change that
 * shrinks.
 *
 * The same census does the work, in the other direction: everything above the cut moves down by
 * `count`, every pointer landing above it is rewritten, `end_addr` shrinks and the checksum is
 * recomputed last. **What it refuses is what makes a cut unsafe and an insertion never is**: a
 * pointer field inside the removed bytes, since the field itself would vanish, and a pointer landing
 * inside them, since the thing it names would. A pointer landing exactly on `at + count` is fine and
 * moves to `at`. Like `relocate`, the choice of `at` is the caller's: cutting through an implied
 * chain produces a file that parses and means something else, so a caller cuts whole entries at a
 * stated boundary and its own check is what shows the readers agree afterwards.
 */
export function excise(c: Container, at: number, count: number): Relocated {
  if (!Number.isInteger(at) || !Number.isInteger(count) || count <= 0) {
    throw new RelocateError(`a cut removes a positive whole number of bytes, not ${count}`);
  }
  const floor = relocationFloor(c);
  const ceiling = c.blob.length - TRAILER_CHECKSUM_OFFSET;
  if (at < floor || at + count > ceiling) {
    throw new RelocateError(
      `a cut of ${count} at ${at} is outside the content, which runs from ${floor} to ${ceiling}`);
  }

  const refusals: string[] = [];
  const census = pointers(c, refusals);
  if (refusals.length > 0) {
    throw new RelocateError(`the census disagrees with its readers: ${refusals[0]}`);
  }
  const end = at + count;
  for (const p of census) {
    if (p.at < end && p.at + POINTER_WIDTH > at) {
      throw new RelocateError(`a cut of ${count} at ${at} removes the ${p.holder} field at ${p.at}`);
    }
    if (p.lands !== undefined && p.lands >= at && p.lands < end) {
      throw new RelocateError(
        `a cut of ${count} at ${at} removes what the ${p.holder} field at ${p.at} names`);
    }
  }

  const bytes = new Uint8Array(c.blob.length - count);
  bytes.set(c.blob.subarray(0, at), 0);
  bytes.set(c.blob.subarray(end), at);

  const rewritten: RewrittenField[] = [];
  for (const p of census) {
    if (p.lands === undefined || p.lands < end) continue;
    const fieldAt = p.at >= end ? p.at - count : p.at;
    bytes.set(new Writer(POINTER_WIDTH).u24(p.target - count).bytes, fieldAt);
    rewritten.push({ at: fieldAt, to: p.target - count, holder: p.holder });
  }

  bytes.set(new Writer(4).u32(u32(c.blob, 4) - count).bytes, 4);
  bytes.set(new Writer(2).u16(trailerChecksum(bytes)).bytes,
            bytes.length - TRAILER_CHECKSUM_OFFSET);

  return { bytes, rewritten };
}

/** What `rebase` produced: the moved bytes, the fields it rewrote, and the ones it left alone. */
export interface Rebased extends Relocated {
  /** The flash address the bytes are now linked for. */
  base: number;
  /**
   * Fields naming flash outside the container, left exactly as they were, since moving a container
   * does not move what it names elsewhere: base slot 2's log area on the Harmony 600, 650 and 700
   * containers, and on the Harmony 300 and 350 that plus thirteen base slot 5 entries such as
   * `0x7F0082`, which are not addresses at all. A caller writing the result somewhere else decides
   * whether that flash is still right there.
   */
  outward: { at: number; target: number; holder: string }[];
}

/**
 * Link a container for another flash address without moving a byte of it: every census pointer
 * landing inside the container moves by the difference, `end_addr` moves with them, and the trailer
 * checksum is recomputed last. `todo-compile-650.md` 7.1.1.
 *
 * **Why it is needed.** A container states absolute flash addresses, so one built for one place is
 * wrong anywhere else. The Harmony 650's status screen library, the container its firmware package
 * carries, is linked for `0x020000`, and written unchanged at the configuration's `0x030000` every
 * one of its addresses pointed sixty four kilobytes short, which the writer's read back refused,
 * section 353. Placing a container where it was not built is the whole of what this does.
 *
 * **The same census as `relocate`**, which is what makes the two agree on what an address is: an
 * insertion moves the pointers landing above it, a rebase moves all of them, so a reader that joins
 * the census joins both.
 *
 * **It checks its own result and refuses rather than return one it cannot vouch for**: the input has
 * to pass its own checks, and the output has to parse at the new base, pass them too, and have every
 * census field on the same byte naming the same byte. That is only as complete as the census, so a
 * kind of pointer the census does not know would pass it; what reads the result, the section claims,
 * the screen text and the keys, is the check that does not share the census's blind spots, and the
 * tests hold both, section 353. The input check is what refuses every Harmony 890 file in the lab,
 * none of which passes its own checks, and whose census reads differently at another base.
 */
export function rebase(c: Container, base: number, options: { omitForTest?: string } = {}): Rebased {
  if (!Number.isInteger(base) || base <= 0 || base > POINTER_CEILING) {
    throw new RelocateError(`a container is linked for a positive three byte address, not ${base}`);
  }
  if (!c.allChecksPass) throw new RelocateError('a container that fails its own checks cannot be vouched for at another base');
  const delta = base - c.flashBase;
  const refusals: string[] = [];
  const census = pointers(c, refusals);
  if (refusals.length > 0) {
    throw new RelocateError(`the census disagrees with its readers: ${refusals[0]}`);
  }
  const bytes = new Uint8Array(c.blob);
  const rewritten: RewrittenField[] = [];
  const outward: Rebased['outward'] = [];
  for (const p of census) {
    if (p.lands === undefined) {
      outward.push({ at: p.at, target: p.target, holder: p.holder });
      continue;
    }
    if (options.omitForTest !== undefined && p.holder === options.omitForTest) continue;
    const to = p.target + delta;
    if (to <= 0 || to > POINTER_CEILING) {
      throw new RelocateError(`${p.holder} would state 0x${to.toString(16)}, outside a u24`);
    }
    bytes.set(new Writer(POINTER_WIDTH).u24(to).bytes, p.at);
    rewritten.push({ at: p.at, to, holder: p.holder });
  }
  bytes.set(new Writer(4).u32(u32(c.blob, 4) + delta).bytes, 4);
  bytes.set(new Writer(2).u16(trailerChecksum(bytes)).bytes,
            bytes.length - TRAILER_CHECKSUM_OFFSET);
  // The control test leaves a kind of field out on purpose to see what notices, so it skips this.
  if (options.omitForTest === undefined) {
    const after = parse(bytes);
    if (after.flashBase !== base) {
      throw new RelocateError(`the result parses at 0x${after.flashBase.toString(16)}, not 0x${base.toString(16)}`);
    }
    if (!after.allChecksPass) throw new RelocateError('the result fails its own checks');
    const landings = (x: Container): string => pointers(x).map((p) => `${p.holder}@${p.at}>${p.lands}`).join();
    if (landings(after) !== landings(c)) throw new RelocateError('a census field lands somewhere else after the move');
  }
  return { bytes, rewritten, base, outward };
}
