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
 * **A round trip and a save are not the same operation**, and that distinction is `FIELD_RULES`
 * below. Carrying every byte you did not edit is exactly right for a round trip and wrong for a
 * save, because two fields are not descriptions of the config: the trailer checksum, which stops
 * being true the moment anything changes, and base slot 3's timestamp, which an arch 12 remote sets
 * its clock from at every boot, section 111. Reproduce that and the remote's clock is wrong by
 * however stale the input was. So `applyEdits` is the faithful path and `saveEdits` is the other
 * one, and neither is the default: a caller has to say which it means.
 *
 * The rules are a table rather than prose because the interesting entries are the **negatives**.
 * Base slot 1's version word looks computable and is not, section 81. Base slot 2's log area looks
 * like something a writer should fill in and is copied by every config in the corpus, section 47.
 * Getting either of those wrong produces a file the remote accepts and mishandles, which is the
 * failure mode this whole layer exists to make impossible.
 *
 * Nothing here goes near a remote. It produces bytes; writing them is gated by
 * `packages/usb/src/rails.ts` and version 1 of the application is read only.
 */
import {
  ACTION_LIST_INDEX_OPCODE,
  CLOCK_STATE_MAXIMA,
  modeRecords,
  pageListCopies,
  stateRecords,
  taggedList,
} from './sections.ts';
import type { StateRecord, TaggedEntry } from './sections.ts';
import { FIRMWARE_STATE_VARIABLES } from './inventory.ts';
import {
  CLOCK_FIELDS_OFFSET,
  CLOCK_FIELD_COUNT,
  CLOCK_FIRST_YEAR,
  CLOCK_LAST_YEAR,
  CLOCK_RECORD_SLOT,
  Container,
  GspmError,
  TRAILER_CHECKSUM_OFFSET,
  clockRecord,
  clockRecordFields,
  trailerChecksum,
} from './gspm.ts';
import { claims } from './coverage.ts';
import { parameterGroups, timers } from './tables.ts';

/** What a caller may not do. Separate from `GspmError` so an editor can catch only its own. */
export class EditError extends GspmError {}

/**
 * What happens to a field that nobody edited, when the bytes are written back.
 *
 * * `recompute-always`: it is derived from the rest of the file, so carrying it is carrying a lie.
 * * `recompute-on-save`: carrying it is right for a round trip and wrong for a save.
 * * `carry`: it looks derivable and is not, so an editor copies it. These are the load bearing ones.
 * * `mirror`: it exists twice and both copies move together, or the remote reads a mismatch.
 */
export type FieldPolicy = 'recompute-always' | 'recompute-on-save' | 'carry' | 'mirror';

export interface FieldRule {
  /** What the field is, in the same words the documents use. */
  field: string;
  policy: FieldPolicy;
  /** The `docs/findings.md` section that establishes it. */
  section: number;
  /** Why it is that policy and not the obvious other one. */
  why: string;
}

/**
 * Every field in this format whose treatment on a write is not "carry it through unchanged".
 *
 * Exported because it is the answer to a question that otherwise lives in somebody's memory: does
 * this field go across, or does it get recomputed? `test/edit.test.ts` fails if a rule is added
 * without a test covering it, so the table cannot drift away from the code the way a comment would.
 */
export const FIELD_RULES: readonly FieldRule[] = [
  {
    field: 'trailer checksum',
    policy: 'recompute-always',
    section: 41,
    why: 'the one field the remote checks, and it is a u16 XOR of the payload, so any edit voids it',
  },
  {
    field: 'base slot 3 build timestamp',
    policy: 'recompute-on-save',
    section: 111,
    why: 'an arch 12 remote sets its clock from it at boot, so a carried timestamp is a wrong clock '
      + 'by exactly its staleness. Stamping is also the right provenance value on an architecture '
      + 'that ignores it, so the rail does not wait on arch 14 and arch 9 being measured',
  },
  {
    field: 'base slot 3 day of week byte',
    policy: 'recompute-always',
    section: 21,
    why: 'derived from the date as days since 1 January 2000 modulo 7, and both parsers refuse a '
      + 'record where it disagrees, so a stamped date has to bring its own weekday',
  },
  {
    field: 'base slot 13 records 0 to 6, the firmware clock',
    policy: 'recompute-on-save',
    section: 130,
    why: 'the same moment as base slot 3, stored a second time as seven state variables, so a '
      + 'carried over config carries a stale clock in two places and stamping one of them is a '
      + 'config that disagrees with itself about when it was built',
  },
  {
    field: "base slot 13 record 6's maximum",
    policy: 'recompute-on-save',
    section: 130,
    why: 'the year\'s maximum is that year plus one where the other six maxima are fixed, so it is '
      + 'the one `second` a save writes: stamping the year alone would put the variable past its own '
      + 'declared range on any config saved more than a year after it was built',
  },
  {
    field: 'base slot 1 version word',
    policy: 'carry',
    section: 81,
    why: 'it is per config rather than per model and an editor copies it rather than computing it: '
      + 'one Harmony One carries two different words either side of one sync, and its low byte '
      + 'names a skin the remote does not have to report',
  },
  {
    field: 'base slot 2 log area',
    policy: 'carry',
    section: 47,
    why: 'three numbers reserving flash, and the limit is the generator\'s idea of the chip size '
      + 'rather than the remote\'s. No config in the corpus appends, so copying them unchanged is '
      + 'doing everything the corpus does',
  },
  {
    field: 'a mode page tagged list copy',
    policy: 'mirror',
    section: 69,
    why: 'nothing reads the copy and an emitter still has to reproduce it, so an edit to a page\'s '
      + 'list that leaves the copy behind passes every check the remote makes and is still wrong. '
      + '`setPageListEntry` writes both, and opcode 0x7F is refused because the two differ there',
  },
];

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
 * A local wall clock timestamp for `saveEdits`, from a `Date`.
 *
 * **The one place a timezone enters this codec**, and deliberately: the record carries no zone, the
 * remote displays it as the time of day, so a save wants the wall clock of whoever is saving rather
 * than UTC. `clockRecord` stays zone free on the way back out, which is what keeps the golden
 * vectors independent of where the tests run, so the two are not symmetrical on purpose.
 */
export function localTimestamp(when: Date): string {
  const p = (n: number, w = 2): string => String(n).padStart(w, '0');
  return `${p(when.getFullYear(), 4)}-${p(when.getMonth() + 1)}-${p(when.getDate())}`
    + `T${p(when.getHours())}:${p(when.getMinutes())}:${p(when.getSeconds())}`;
}

/**
 * The edit that stamps base slot 3's record with `builtAt`.
 *
 * Seven bytes, and the day of week is **computed** rather than taken from the caller, because both
 * parsers refuse a record whose weekday disagrees with its date, section 21. So a caller cannot
 * produce a record this project's own readers would reject, which is the closure worth having here.
 *
 * Exported on its own as well as through `saveEdits`, so a caller who wants to see it in the edit
 * list before applying it can, and so it goes through exactly the same rails as any other edit.
 */
export function timestampEdit(c: Container, builtAt: string): Edit[] {
  // One encoder, in `gspm.ts` beside the decoder it inverts. The day of week is computed there and
  // never taken from a caller, so nothing here can build a record `clockRecord` would reject.
  const bytes = clockRecordFields(builtAt);
  if (bytes === undefined) {
    throw new EditError(
      `${builtAt} is not a timestamp this record can hold: YYYY-MM-DDTHH:MM:SS, `
      + `year ${CLOCK_FIRST_YEAR} to ${CLOCK_LAST_YEAR}, and a date that exists`,
    );
  }
  const section = c.sections[CLOCK_RECORD_SLOT];
  if (section === undefined || section.isNull) {
    throw new EditError('this container has no base slot 3, so a save cannot stamp it');
  }
  const off = c.blobOffsetOf(section.address);
  if (off === undefined) throw new EditError('base slot 3 is outside the container');
  if (clockRecord(c.blob, off) === undefined) {
    // A save that silently stamped nothing is the failure this whole distinction is about, so an
    // unreadable record is refused rather than overwritten: whatever is there is not what we think.
    throw new EditError('base slot 3 does not hold a clock record, so it is not ours to overwrite');
  }
  if (bytes.length !== CLOCK_FIELD_COUNT) throw new EditError('the record is seven fields');
  return [{ start: off + CLOCK_FIELDS_OFFSET, bytes, owner: 'slot-3-timestamp' }];
}

/**
 * The edits that stamp base slot 13's clock, which is the **second** place the build time is stored.
 *
 * Section 130: base slot 13's first seven records are the firmware's own clock, and each one's
 * `first` is the corresponding field of base slot 3's timestamp in every container of the corpus.
 * So a config carried over with its old records carries a stale clock in two places, not one, and
 * `timestampEdit` on its own leaves the remote's seconds, minute and hour set to whenever the input
 * was generated.
 *
 * **Seven values are stamped and an eighth is derived**, which is the part that is easy to miss. The
 * year's maximum is that year plus one, in all nineteen containers measured, where the other six
 * maxima are fixed. Stamp the year without it and a config saved more than a year after it was built
 * declares a value outside the variable's own declared range: built in 2023 the year record is 23 with
 * a maximum of 24, and saving it in 2026 would write 26 into a range that stops at 24. Nothing here
 * has watched a remote mishandle that, so it is a rail taken from the format's own rule rather than
 * from a measured failure, which is the weaker of the two kinds and is marked as such.
 *
 * The seven values come from `clockRecordFields`, the same encoder base slot 3 uses, rather than from
 * a second decomposition of the same string: that is the rule this project bans two copies of.
 *
 * The transitions those records carry are **not** touched. They are structural, not date derived: the
 * seven records carry the same skeleton in every container, a minute, hour, day and month each with
 * one transition in the register machine band and the other three with none, and the only part that
 * varies is which action list a `0x7F` names.
 */
export function clockStateEdits(c: Container, builtAt: string): Edit[] {
  const fields = clockRecordFields(builtAt);
  if (fields === undefined) {
    throw new EditError(
      `${builtAt} is not a timestamp this record can hold: YYYY-MM-DDTHH:MM:SS, `
      + `year ${CLOCK_FIRST_YEAR} to ${CLOCK_LAST_YEAR}, and a date that exists`,
    );
  }
  const records = stateRecords(c);
  if (records === undefined) {
    throw new EditError('this container has no base slot 13, so a save cannot stamp its clock');
  }
  if (records.length < CLOCK_FIELD_COUNT) {
    throw new EditError(
      `base slot 13 holds ${records.length} records and the clock is the first ${CLOCK_FIELD_COUNT}`,
    );
  }
  const out: Edit[] = [];
  for (let index = 0; index < CLOCK_FIELD_COUNT; index += 1) {
    const record = records[index] as StateRecord;
    const name = `slot-13 ${FIRMWARE_STATE_VARIABLES[index] ?? index}`;
    const most = CLOCK_STATE_MAXIMA[index];
    // Whatever declares a different range is not the clock, so it is refused rather than stamped:
    // the same reasoning as refusing a base slot 3 that does not hold a readable clock record. The
    // year is deliberately not checked, because its maximum is what this repairs.
    if (most !== undefined && record.second !== most) {
      throw new EditError(
        `${name} declares a maximum of ${record.second} where the clock's is ${most}, `
        + 'so this is not the record we think it is',
      );
    }
    const off = c.blobOffsetOf(record.address);
    if (off === undefined) throw new EditError(`${name} is outside the container`);
    const value = fields[index] as number;
    // `first` at +0x00 and `second` at +0x02, so the year's two fields are one adjacent four byte
    // edit rather than two, which also keeps them from being reported as separate changed runs.
    const bytes = most === undefined
      ? [value & 0xff, value >>> 8, (value + 1) & 0xff, (value + 1) >>> 8]
      : [value & 0xff, value >>> 8];
    out.push({ start: off, bytes: Uint8Array.from(bytes), owner: name });
  }
  return out;
}

/**
 * Apply the edits **as a save**: everything `applyEdits` does, plus every field the build time owns.
 *
 * The difference from `applyEdits` is eight values in two structures and it is not cosmetic. See
 * `FIELD_RULES`, and see `docs/findings.md` section 111 for the measurement that started it, a power
 * cycled Harmony One reading its config's build timestamp as the time of day, and section 130 for the
 * seven state records that hold the same moment a second time.
 *
 * An empty edit list is meaningful here where it is the identity in `applyEdits`: it means "write
 * this config back unchanged", and the clock still moves, because the file is being saved now.
 */
export function saveEdits(c: Container, edits: Edit[], builtAt: string): EditReport {
  return applyEdits(c, [...edits, ...timestampEdit(c, builtAt), ...clockStateEdits(c, builtAt)]);
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
