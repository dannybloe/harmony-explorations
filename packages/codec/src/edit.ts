/**
 * Editing a config as a minimal diff, milestone M3's groundwork.
 *
 * **Why a diff and not a rebuild.** Three arch 8 configs generated ten minutes apart differ in 73
 * to 84 percent of their bytes, so reproducing what Logitech's generator would have emitted is not
 * achievable and is not the goal. An editor changes what the user changed and carries everything
 * else through byte for byte, which is also the only way to keep the structures no reader can
 * reconstruct: a glyph and an encoded picture cannot be re-encoded from their pixels.
 *
 * **So this API cannot move a byte.** Every edit replaces a run with a run of the same length, and
 * there is deliberately no way to insert, delete or resize anything. That is not a limitation to be
 * lifted later without argument: a picture's position is implied by everything before it, section
 * 55, and base slot 15's group lengths are demanded by the firmware, section 44, so a resize is a
 * relocation of everything above it and belongs to a different and much larger piece of work.
 *
 * **The rails are refusals, not documentation.** An edit outside every claim the byte accounting
 * makes is refused, because a run no reader understands is a run nobody can say the consequences of
 * changing. Two edits touching one byte are refused. And the trailer checksum is recomputed rather
 * than carried, because it is the one field the remote checks.
 *
 * Nothing here goes near a remote. It produces bytes; writing them is gated by
 * `packages/usb/src/rails.ts` and version 1 of the application is read only.
 */
import { ACTION_LIST_INDEX_OPCODE, modeRecords, pageListCopies, taggedList } from './sections.ts';
import type { TaggedEntry } from './sections.ts';
import { Container, GspmError, TRAILER_CHECKSUM_OFFSET, trailerChecksum } from './gspm.ts';
import { claims } from './coverage.ts';
import { parameterGroups, timers } from './tables.ts';

/** What a caller may not do. Separate from `GspmError` so an editor can catch only its own. */
export class EditError extends GspmError {}

/** One same length replacement, as a blob offset. */
export interface Edit {
  start: number;
  bytes: Uint8Array;
  /** Which structure asked for it. Reported back, and used in the refusals. */
  owner: string;
}

export interface EditReport {
  bytes: Uint8Array;
  /** Every run that differs from the input, in order, the trailer word included. */
  changed: { start: number; length: number }[];
}

/** The runs where two buffers of the same length differ. The measure of "minimal". */
export function diffRanges(a: Uint8Array, b: Uint8Array): { start: number; length: number }[] {
  if (a.length !== b.length) throw new EditError(`lengths differ: ${a.length} and ${b.length}`);
  const out: { start: number; length: number }[] = [];
  let from: number | undefined;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === b[i]) {
      if (from !== undefined) out.push({ start: from, length: i - from });
      from = undefined;
    } else if (from === undefined) {
      from = i;
    }
  }
  if (from !== undefined) out.push({ start: from, length: a.length - from });
  return out;
}

/**
 * Apply the edits to a copy of the container's bytes and recompute the trailer.
 *
 * Refuses, in this order: an edit outside the blob, an edit no reader's claim covers, and two edits
 * on one byte. An empty list is the identity and gives the input back, which is the check that this
 * writes nothing of its own.
 */
export function applyEdits(c: Container, edits: Edit[]): EditReport {
  const bytes = Uint8Array.from(c.blob);
  const owned = claims(c);
  const touched = new Map<number, string>();
  for (const edit of edits) {
    if (edit.bytes.length === 0) throw new EditError(`${edit.owner}: an empty edit`);
    if (edit.start < 0 || edit.start + edit.bytes.length > bytes.length) {
      throw new EditError(`${edit.owner}: outside the container`);
    }
    // Inside one claim, not merely covered by several: a run that spans two structures is two
    // edits, and asking for it as one is a sign the caller has the wrong extent.
    const inside = owned.some(
      (claim) => edit.start >= claim.start
        && edit.start + edit.bytes.length <= claim.start + claim.length,
    );
    if (!inside) {
      throw new EditError(
        `${edit.owner}: 0x${edit.start.toString(16)} is not inside a structure any reader claims`,
      );
    }
    for (let i = 0; i < edit.bytes.length; i += 1) {
      const at = edit.start + i;
      const other = touched.get(at);
      if (other !== undefined) {
        throw new EditError(`${edit.owner} and ${other} both write 0x${at.toString(16)}`);
      }
      touched.set(at, edit.owner);
      bytes[at] = edit.bytes[i] as number;
    }
  }
  // The one field the remote checks, and a weak one: a u16 XOR of little endian words, blind to two
  // transposed words. Recomputed rather than carried, so a passing file is at least self consistent.
  const sum = trailerChecksum(bytes);
  const at = bytes.length - TRAILER_CHECKSUM_OFFSET;
  bytes[at] = sum & 0xff;
  bytes[at + 1] = (sum >>> 8) & 0xff;
  return { bytes, changed: diffRanges(c.blob, bytes) };
}

/**
 * A timer's duration, in seconds.
 *
 * Refuses above sixteen bits, which is the rail section 43 found: the firmware clamps there with no
 * error, so a longer duration is silently a different timer. The field itself is a `u24`, and the
 * extra byte is written as the record already has it rather than zeroed.
 */
export function setTimerDuration(c: Container, index: number, seconds: number): Edit[] {
  const table = timers(c);
  const timer = table?.records[index];
  if (table === undefined || timer === undefined) throw new EditError(`no timer ${index}`);
  if (!Number.isInteger(seconds) || seconds < 0) throw new EditError('a duration is a whole number');
  if (seconds > 0xffff) {
    throw new EditError(`${seconds} seconds is past the sixteen bits the firmware clamps to`);
  }
  const off = c.blobOffsetOf(timer.address);
  if (off === undefined) throw new EditError(`timer ${index} is outside the container`);
  return [{
    start: off + 1,
    bytes: Uint8Array.from([seconds & 0xff, (seconds >>> 8) & 0xff, (timer.duration >>> 16) & 0xff]),
    owner: `timer ${index}`,
  }];
}

/**
 * One `u16` of one parameter group.
 *
 * The group's own length is what the firmware demands, section 44: a group of a different length is
 * silently replaced by compiled in defaults, and a group index does not port between architectures.
 * Neither is at risk here, since nothing can change a length, but both are why the index is checked
 * against the group's own count rather than against the section.
 */
export function setParameter(c: Container, group: number, index: number, value: number): Edit[] {
  const groups = parameterGroups(c);
  const found = groups?.[group];
  if (groups === undefined || found === undefined) throw new EditError(`no parameter group ${group}`);
  if (index < 0 || index >= found.values.length) {
    throw new EditError(`group ${group} holds ${found.values.length} values, not ${index + 1}`);
  }
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new EditError(`${value} is not a u16`);
  }
  const off = c.blobOffsetOf(found.address);
  if (off === undefined) throw new EditError(`group ${group} is outside the container`);
  return [{
    start: off + 1 + 2 * index,
    bytes: Uint8Array.from([value & 0xff, (value >>> 8) & 0xff]),
    owner: `parameter ${group}.${index}`,
  }];
}

/**
 * One entry of one mode page's tagged list, **and its copy**.
 *
 * The rail this exists for. Every page's list has a second copy in the pool, section 69, which
 * nothing reads and which an emitter still has to reproduce; an editor that changed one and not the
 * other would produce a file the remote accepts and every check here passes. So both are written,
 * and a caller cannot ask for only one.
 *
 * Opcode `0x7F` is refused in either copy. It is the one field the two are allowed to disagree on,
 * because they name different base slot 10 entries holding identical action lists, so writing one
 * value into both would break exactly the thing this function exists to preserve.
 */
export function setPageListEntry(
  c: Container,
  page: number,
  index: number,
  entry: Pick<TaggedEntry, 'tag' | 'operand' | 'opcode'>,
): Edit[] {
  const pages = (modeRecords(c) ?? []).flatMap((record) => record.pages);
  const target = pages[page];
  if (target === undefined) throw new EditError(`no mode page ${page}`);
  const copies = pageListCopies(c);
  const copy = copies[page];
  if (copy === undefined) {
    throw new EditError(`page ${page} has no list copy, and every page in the corpus has one`);
  }
  if (entry.opcode === ACTION_LIST_INDEX_OPCODE) {
    throw new EditError('opcode 0x7F names a base slot 10 entry, which the two copies disagree on');
  }
  const out: Edit[] = [];
  for (const [where, start] of [['list', c.blobOffsetOf(target.list)], ['copy', copy]] as const) {
    if (start === undefined) throw new EditError(`page ${page}'s ${where} is outside the container`);
    const list = taggedList(c, start + c.flashBase);
    const existing = list?.entries[index];
    if (list === undefined || existing === undefined) {
      throw new EditError(`page ${page}'s ${where} has no entry ${index}`);
    }
    if (existing.opcode === ACTION_LIST_INDEX_OPCODE) {
      throw new EditError(`page ${page} entry ${index} is a 0x7F, which the copies disagree on`);
    }
    const wide = existing.flags !== undefined;
    const stride = wide ? 5 : 4;
    const at = list.start + (wide ? 2 : 1) + stride * index;
    const bytes = wide
      ? [existing.flags as number, entry.tag]
      : [entry.tag];
    bytes.push(entry.operand & 0xff, (entry.operand >>> 8) & 0xff, entry.opcode);
    out.push({ start: at, bytes: Uint8Array.from(bytes), owner: `page ${page} ${where} ${index}` });
  }
  return out;
}
