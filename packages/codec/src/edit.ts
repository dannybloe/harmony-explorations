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
  CLOCK_DAY_INDEX,
  CLOCK_STATE_MAXIMA,
  modeRecords,
  pageListCopies,
  stateRecords,
  taggedList,
} from './sections.ts';
import type { StateRecord, TaggedEntry } from './sections.ts';
import {
  deviceIdOfGroup, FIRMWARE_STATE_VARIABLES, POWER_ON_DELAY_CASES, powerOnInstructions, stateVariables,
} from './inventory.ts';
import {
  CLOCK_FIELDS_OFFSET,
  CLOCK_FIELD_COUNT,
  CLOCK_FIRST_YEAR,
  CLOCK_LAST_YEAR,
  ACTION_LIST_TABLE_SLOT,
  CLOCK_RECORD_SLOT,
  Container,
  GspmError,
  TRAILER_CHECKSUM_OFFSET,
  archSlot,
  clockRecord,
  clockRecordFields,
  timestampOf,
  trailerChecksum,
} from './gspm.ts';
import { claims } from './coverage.ts';
import { parameterGroups, timers } from './tables.ts';
import { IR_QUANTITY_CAP } from './ir.ts';
import { STATE_WRITE_BASE, stateVariableSite } from './actions.ts';

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
 * Every **field** whose treatment on a write is not "carry it through unchanged".
 *
 * Exported because it is the answer to a question that otherwise lives in somebody's memory: does
 * this field go across, or does it get recomputed? `test/edit.test.ts` fails if a rule is added
 * without a test covering it, so the table cannot drift away from the code the way a comment would.
 *
 * **What it deliberately does not cover is sharing, and a caller has to know that.** This used to
 * say "every field in this format", which reads as a complete list of the write rails and is not
 * one: the rails a config's structure imposes are **relations** rather than fields, so none of them
 * can be a row here. An infrared duration block is named by several records, section 61; a glyph
 * string is drawn from several programs, section 121; a mode page's tagged list has a second copy,
 * section 69; and a picture's position is implied by everything before it, section 55. Editing one
 * end of any of those changes the other end and no field says so. They are enforced where they can
 * be seen, in the individual editors, and the whole reason `edit.ts` refuses to change a length is
 * that a length change moves everything downstream and no table can catch that either. The full
 * list is "Rails a writer will have to respect" in `CLAUDE.md`.
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
    why: 'derived from the date, counted from Sunday as 0 as the firmware counts it, section 322, and '
      + 'both parsers refuse a record where it disagrees, so a stamped date has to bring its own weekday',
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
 * The claims that are the container's frame rather than its content.
 *
 * **An edit may not touch any of them**, and nothing stopped it: they are claims like any other, so
 * the containment rail below happily accepted a four byte write at offset 0 that replaced the `GSPM`
 * cookie with `AAAA`, on every container tried. The header holds the flash base and `end_addr`, the
 * section table holds every pointer, and the trailer holds the checksum this function stamps itself.
 * A same length edit has no business in any of them, and an editor that reaches one has computed an
 * offset wrong rather than found a field.
 */
export const FRAME_OWNERS: ReadonlySet<string> = new Set([
  'header',
  'section-table',
  'marker',
  'trailer',
]);

/**
 * Apply the edits to a copy of the container's bytes and recompute the trailer.
 *
 * Refuses, in this order: a container whose own trailer checksum disagrees with its bytes, an edit
 * outside the blob, an edit touching the container frame, an edit no reader's claim covers, and two
 * edits on one byte. An empty list is the identity and gives the input back, which is the check that
 * this writes nothing of its own.
 *
 * **The first of those is new and it is section 122's hazard.** This stamps a fresh checksum, so a
 * container that arrived damaged went in inconsistent and came out passing the only check the remote
 * makes: measured by flipping one pixel byte of `one_config`, whose stored `0xC9CE` then disagreed
 * with its own `0x36CE`, editing an unrelated field, and reading `0x36E1` back out of the result.
 * `packages/corpus/src/read.ts` performs this check after every read, because an arch 10 (Harmony 890)
 * read inserts duplicate chunks; nothing performed it before an edit, which is the end where the
 * damage becomes permanent.
 */
export function applyEdits(c: Container, edits: Edit[]): EditReport {
  const bytes = Uint8Array.from(c.blob);
  const stored = c.trailerChecksum;
  const actual = trailerChecksum(c.blob);
  if (stored !== actual) {
    throw new EditError(
      `the container's own trailer checksum is 0x${stored.toString(16)} and its bytes give `
        + `0x${actual.toString(16)}: it is damaged, and editing it would stamp the damage as valid`,
    );
  }
  const owned = claims(c);
  const touched = new Map<number, string>();
  for (const edit of edits) {
    if (edit.bytes.length === 0) throw new EditError(`${edit.owner}: an empty edit`);
    if (edit.start < 0 || edit.start + edit.bytes.length > bytes.length) {
      throw new EditError(`${edit.owner}: outside the container`);
    }
    const frame = owned.find(
      (claim) => FRAME_OWNERS.has(claim.owner)
        && edit.start < claim.start + claim.length
        && claim.start < edit.start + edit.bytes.length,
    );
    if (frame !== undefined) {
      throw new EditError(
        `${edit.owner}: 0x${edit.start.toString(16)} is inside the container frame (${frame.owner})`,
      );
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
 *
 * **Which zone Logitech stamps in is open, and it does not look like the saver's**, section 322: a
 * MyHarmony sync of the Harmony 650 stamped 14:32:27 and the remote was read at 14:34:08 UTC on the
 * same day, so that stamp was within two minutes of UTC and could not have been the local time of
 * this bench, two hours later. Other Logitech stamps sit an hour or more from UTC either way, so no
 * single zone explains all of them. This stays local until the remote's own display says otherwise.
 */
export function localTimestamp(when: Date): string {
  // Through `timestampOf`, beside `clockRecord`, because this used to spell the same padded format
  // out again with its own helper. Both were right, which is the state that precedes two that are
  // not, and nothing could have seen it while they agreed.
  return timestampOf(when.getFullYear(), when.getMonth() + 1, when.getDate(),
    when.getHours(), when.getMinutes(), when.getSeconds());
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
    // A stamp made on the 1st of a month, a stored day of 0, had an exception here while the reader
    // refused it; section 322 made it an ordinary date, so there is no exception any more.
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
    const value = fields[index] as number;
    // The maximum this record should declare once the field is stamped. Only the year's moves: it is
    // that year plus one. Section 130 and the note on `CLOCK_STATE_MAXIMA`.
    //
    // **The day's used to move too, and that was this project's own mistake.** Read as counted from
    // 1, a save on a 31st wrote a day of 31 into a variable whose maximum is 30, so this raised the
    // maximum to 31. The day is counted from 0, section 322, so the 31st is stored as 30 and the 30
    // that every container declares is exactly the last day of a long month, which is also the
    // firmware's own limit. A save never writes a day above 30 now, so the maximum stays put.
    const stamped = most === undefined ? value + 1 : most;
    // Whatever declares a different range is not the clock, so it is refused rather than stamped:
    // the same reasoning as refusing a base slot 3 that does not hold a readable clock record. The
    // year is deliberately not checked, because its maximum is what this repairs. The day still
    // accepts a maximum of 31, which only a save of ours on a 31st under the old reading can have
    // written, so that such a config can be saved again and gets its maximum put back to 30.
    if (most !== undefined && record.second !== most
        && !(index === CLOCK_DAY_INDEX && record.second === most + 1)) {
      throw new EditError(
        `${name} declares a maximum of ${record.second} where the clock's is ${most}, `
        + 'so this is not the record we think it is',
      );
    }
    const off = c.blobOffsetOf(record.address);
    if (off === undefined) throw new EditError(`${name} is outside the container`);
    // `first` at +0x00 and `second` at +0x02, so a field whose maximum moves is one adjacent four byte
    // edit rather than two, which also keeps them from being reported as separate changed runs. For
    // the day that edit writes the 30 that is already there, which changes no byte, except on a config
    // an old save of ours left at 31, which it repairs.
    const bytes = most === undefined || index === CLOCK_DAY_INDEX
      ? [value & 0xff, value >>> 8, stamped & 0xff, stamped >>> 8]
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
  // The third byte is the record's own, carried through because this writes a fixed width field
  // and only the low sixteen bits are the duration. That leaks the rail it sits under: a record
  // whose stored duration already has a high byte keeps it, so a caller asking for 100 seconds
  // produces a `u24` the firmware clamps, which is exactly what the refusal above exists to stop.
  // All 222 corpus timers sit under sixteen bits, so this refuses nothing that is being read.
  if (timer.duration >>> 16) {
    throw new EditError(
      `timer ${index} already stores 0x${timer.duration.toString(16)}, whose high byte this write `
      + 'would carry through into a value the firmware clamps',
    );
  }
  return [{
    start: off + 1,
    bytes: Uint8Array.from([seconds & 0xff, (seconds >>> 8) & 0xff, 0]),
    owner: `timer ${index}`,
  }];
}

/**
 * One device's power on delay, on the architectures that inline it.
 *
 * **The smallest change this format admits**: one byte, in place, moving nothing and restamping no
 * count, which is why it is the first thing this project ever changed on a remote. The instruction
 * is the single `0x7C` at the top level of the action list that device's `Power` variable runs on
 * its 0 to 1 transition, `powerOnInstructions`.
 *
 * **`tenths` is capped at 100, which no inline power on delay here exceeds, not a field width.** A byte
 * holds 255, and the enqueueing worker folds two consecutive quantities for one device by taking the
 * larger **except** at 100, where it pushes a second entry instead, section 70. No inline power on delay
 * on arch 8, 9 or 12 exceeds 100, and a larger one spelled out would be a length change and not a byte
 * edit. Logitech's compiler does write a single `0x7C` above 100 for a sequence's pause on the Harmony
 * One, section NNN, and the Harmony 350's factory configuration holds one of 170 in an unread list, but
 * whether the remote honours one is unmeasured, so a caller asking for one here is asking for something
 * this function cannot honestly do.
 *
 * **What it will not tell you is whether the delay does anything**, section 236. The quantity holds
 * back the next command to its own device and nothing else, so in an activity that sends that device
 * only its power code the value is inert however large it is. That is a question about an activity
 * rather than about a device, `powerOnDelayReach` answers it, and it deliberately does not gate this
 * edit: a delay that is inert in one activity may not be in another.
 */
export function setPowerOnDelay(c: Container, group: number, tenths: number): Edit[] {
  const found = powerOnInstructions(c).get(group);
  if (found === undefined) {
    throw new EditError(`no device with infrared group ${group} states a power on delay inline`);
  }
  if (!Number.isInteger(tenths) || tenths < 0) {
    throw new EditError('a delay is a whole number of tenths of a second');
  }
  if (tenths > IR_QUANTITY_CAP) {
    throw new EditError(
      `${tenths} tenths is past the ${IR_QUANTITY_CAP} one instruction carries, and spelling it `
      + 'out takes more instructions, which is a length change rather than a byte edit',
    );
  }
  const table = c.pointerArray(archSlot(c.architecture as number, ACTION_LIST_TABLE_SLOT));
  const address = table?.[found.list];
  if (address === undefined) throw new EditError(`action list ${found.list} has no address`);
  // The operand's low byte, an instruction being `{ u16 operand; u8 opcode }` with the operand low
  // byte first and instruction k at `listAddress + 1 + 3k` past the count byte.
  const off = c.blobOffsetOf(address + 1 + 3 * found.at);
  if (off === undefined) throw new EditError(`action list ${found.list} is outside the container`);
  return [{
    start: off,
    bytes: Uint8Array.from([tenths]),
    owner: `power on delay of group ${group}`,
  }];
}

/**
 * One device's power on delay where it is a **stored setting** rather than an instruction, in tenths of
 * a second: the Harmony 600, 650 and 700.
 *
 * On those remotes a delay is a base slot 13 state variable, `PowerOnDelay_<device id>`, and the value
 * is the record's `first`, which the firmware seeds the running variable from, section 234. So the edit
 * is two bytes of a record and not the `0x7C` operand `setPowerOnDelay` edits on the other architectures,
 * where the same delay is written into the device's power on list.
 *
 * **Its calibration is the Harmony 650's own write**, section 283: the Denon's delay raised from 60 to
 * 90 by a script that was not kept, and read back off the remote. This reproduces that region read byte
 * for byte from the read before it, which is the test.
 *
 * Only `PowerOnDelay` moves. `DefaultPowerOnDelay` is what the slider's reset returns to and the 650's
 * write left it alone, so this does too.
 *
 * **The ceiling is 450 and it is not the record's.** The variable states 65277 as its highest value,
 * which bounds nothing anybody chose. What bounds a delay is how it is spent: the device's on transition
 * maps the variable through a table of `POWER_ON_DELAY_CASES` entries, 0 to 45 seconds, section 288,
 * and the remote draws exactly that many strings for its slider. A value past the table has no case,
 * so it is refused here rather than written and left to whatever the firmware does with a miss.
 * The first version of this said "the record's own stated maximum, 450", which nobody had read; the
 * refusal test found 65277.
 */
export function setPowerOnDelayVariable(c: Container, group: number, tenths: number): Edit[] {
  const id = deviceIdOfGroup(c).get(group);
  if (id === undefined) {
    throw new EditError(`no device with infrared group ${group} has a Logitech device identifier here`);
  }
  const variable = stateVariables(c).find((one) => one.label === `PowerOnDelay_${id}`);
  const record = variable?.record;
  if (variable === undefined || record === undefined) {
    throw new EditError(`group ${group} has no PowerOnDelay variable, so its delay is not a stored setting`);
  }
  if (!Number.isInteger(tenths) || tenths < 0) {
    throw new EditError('a delay is a whole number of tenths of a second');
  }
  if (tenths >= POWER_ON_DELAY_CASES || tenths > record.second) {
    throw new EditError(
      `${tenths} tenths is past the ${POWER_ON_DELAY_CASES - 1} the delay table has a case for, 45 seconds`,
    );
  }
  const off = c.blobOffsetOf(record.address);
  if (off === undefined) throw new EditError(`the PowerOnDelay record of group ${group} is outside the container`);
  // `first` is the record's opening u16, little endian, as `clockStateEdits` writes it.
  return [{
    start: off,
    bytes: Uint8Array.from([tenths & 0xff, tenths >>> 8]),
    owner: `power on delay variable of group ${group}`,
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
  // The copy is paired by position, and that pairing is checked rather than assumed. It holds on
  // every full config, 426 pages of `h700_config` down to 135 of `h525_config`, and it does not hold
  // at all on `h525_safemode_ahcm`, which has 44 pages and 2 copies because 43 of them share one list
  // address. So the message below used to state a falsehood, "every page in the corpus has one", and
  // the page that did get a copy there was paired with a list holding a different number of entries.
  const copies = pageListCopies(c);
  const copy = copies[page];
  if (copy === undefined) {
    throw new EditError(
      `page ${page} has no list copy of its own: this container has ${pages.length} pages and ` +
        `${copies.length} copies, so pages share lists and an edit cannot say which copy is whose`,
    );
  }
  // **The range checks come before the 0x7F test, and their absence made that test bypassable.**
  // The bytes are assembled with `Uint8Array.from`, which truncates to eight bits, so `opcode: 0x17F`
  // passed the comparison below and wrote `0x7F` into the page's list **and** its copy, giving both
  // the same base slot 10 index: exactly the invariant this function exists to protect, in a file that
  // then recomputes the trailer checksum, so the product passes every check the remote makes. Measured
  // on `h600_config` on 13 August 2026, with plain `0x7F` correctly refused beside it.
  //
  // The same truncation turned `tag: 511` into 255, `operand: 0x1FFFF` into 0xFFFF and `tag: 1.7`
  // into 1, where `setParameter` and `setTimerDuration` both refuse such inputs. So this is one rule
  // for all three fields rather than a guard bolted onto the opcode.
  const field = (name: string, value: number, max: number): number => {
    if (!Number.isInteger(value) || value < 0 || value > max) {
      throw new EditError(`${name} ${value} is not in 0 to ${max}, and a write here truncates`);
    }
    return value;
  };
  field('tag', entry.tag, 0xff);
  field('operand', entry.operand, 0xffff);
  field('opcode', entry.opcode, 0xff);
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
    // **And the copy has to be this page's copy.** Nothing compared the two, so a mispaired copy took
    // a write into an unrelated list and the trailer checksum was recomputed over it. The two agree
    // except in a 0x7F's operand, section 69, and a 0x7F is refused above, so tag, flags and opcode
    // must match entry for entry.
    if (where === 'copy') {
      const own = taggedList(c, (c.blobOffsetOf(target.list) as number) + c.flashBase);
      const mine = own?.entries[index];
      if (mine === undefined
          || mine.tag !== existing.tag
          || mine.opcode !== existing.opcode
          || mine.flags !== existing.flags) {
        throw new EditError(
          `page ${page}'s copy does not hold this page's list: entry ${index} differs, so the ` +
            'pairing by position is wrong for this container and a write would land elsewhere',
        );
      }
    }
    // The list's own answer rather than a third derivation: this took the form from whether the
    // parsed entry carries a flags byte, which is true today and is not what decides it.
    const wide = list.wide;
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

/** Opcode 0x7E: enter the mode the operand indexes. */
const ENTER_MODE = 0x7e;

/** Where a configuration's introduction tour starts and how it ends, as `introductionTour` found it. */
export interface IntroductionTour {
  /**
   * `shown` when the list enters the tour's first screen, `skipped` when it calls the tour's exit
   * instead, which is the form Logitech's own compiler writes on `h600_config` and both Harmony 700
   * configurations and the form `skipIntroductionTour` produces.
   */
  state: 'shown' | 'skipped';
  /** The base slot 10 list that marks the tour started and then enters it or skips it. */
  list: number;
  /** The state variable that list sets to 1, which no other `0x80 + v` write in an action list sets. */
  variable: number;
  /** The tour's first screen, where the list enters one; a skipped tour names none. */
  mode?: number;
  /** How many screens the tour is, walking every mode its screens enter. */
  modes: number;
  /** The list the tour's last screen runs, which is how the tour ends. */
  exit: number;
}

/**
 * Find the introduction tour a configuration opens after every reload, and whether it is skipped.
 *
 * **What the tour is**, section 286: ten screens, `Welcome to your Harmony 650 remote` to `You can now
 * enjoy your entertainment system`, which a Harmony 650 was seen opening after a write, when the
 * configuration is reloaded. It is started by one list of two instructions, **set a variable
 * to 1, then enter the tour's first screen**, and it ends when its last screen runs one list, the
 * list that returns the remote to its Remote Assistant screen. The variable is seeded 0, and that exit
 * route calls the tour itself while it is 0, which is why the tour sets it first.
 *
 * **Logitech's compiler writes the same list in a second form**, set the variable and then call the
 * exit, so the tour is never entered: on `h600_config` and both Harmony 700 configurations, lists 364
 * and 1157, where on the Harmony 650's configuration and `calibration_h600` it enters the tour. So the
 * edit below produces the vendor's own form rather than one of ours.
 *
 * Found structurally rather than by number: a two instruction list `[0x80 + v := 1, x]` whose
 * variable no other `0x80 + v` write in an action list sets, where `x` either enters a mode whose screens reach exactly
 * one list between them, or calls a list that exactly one set of screens reaches in that way.
 */
export function introductionTour(c: Container): IntroductionTour {
  const lists = c.actionLists() ?? [];
  const records = modeRecords(c) ?? [];
  // How many instructions write each variable through the opcode, which is how a list sets one.
  const writes = new Map<number, number>();
  for (const list of lists) {
    for (const one of list) {
      const site = stateVariableSite(one);
      if (site?.where === 'opcode') writes.set(site.index, (writes.get(site.index) ?? 0) + 1);
    }
  }
  const bindings = (mode: number): TaggedEntry[] => [
    ...(records[mode]?.entries ?? []),
    ...(records[mode]?.pages ?? []).flatMap((page) => taggedList(c, page.list)?.entries ?? []),
  ];
  // A set of screens: every mode reached from one by the modes they enter, and the lists they run.
  const screens = (from: number): { modes: Set<number>; exits: Set<number> } => {
    const modes = new Set<number>();
    const exits = new Set<number>();
    const queue = [from];
    while (queue.length > 0) {
      const mode = queue.shift() as number;
      if (modes.has(mode)) continue;
      modes.add(mode);
      for (const entry of bindings(mode)) {
        if (entry.opcode === ENTER_MODE) queue.push(entry.operand);
        else if (entry.opcode === ACTION_LIST_INDEX_OPCODE) exits.add(entry.operand);
      }
    }
    return { modes, exits };
  };
  // For the skipped form: which screen sets, closed under the modes they enter, run a list and only
  // that list. Keyed by the list, with the size of each set that does.
  const toursEnding = new Map<number, number[]>();
  records.forEach((_, mode) => {
    const { modes, exits } = screens(mode);
    if (exits.size !== 1 || modes.size < 2) return;
    const exit = [...exits][0] as number;
    const smallest = Math.min(...modes);
    if (smallest !== mode) return;  // one entry per set, keyed on its lowest mode
    toursEnding.set(exit, [...(toursEnding.get(exit) ?? []), modes.size]);
  });
  const found: IntroductionTour[] = [];
  lists.forEach((list, index) => {
    const [mark, next] = list;
    if (list.length !== 2 || mark === undefined || next === undefined) return;
    if (mark.opcode < STATE_WRITE_BASE || mark.operand !== 1) return;
    const variable = mark.opcode - STATE_WRITE_BASE;
    if (writes.get(variable) !== 1) return;
    if (next.opcode === ENTER_MODE) {
      const { modes, exits } = screens(next.operand);
      if (exits.size !== 1) return;
      found.push({ state: 'shown', list: index, variable, mode: next.operand, modes: modes.size,
                   exit: [...exits][0] as number });
    } else if (next.opcode === ACTION_LIST_INDEX_OPCODE) {
      const tours = toursEnding.get(next.operand);
      if (tours?.length !== 1) return;
      found.push({ state: 'skipped', list: index, variable, modes: tours[0] as number, exit: next.operand });
    }
  });
  if (found.length !== 1) {
    throw new EditError(`${found.length} lists have the introduction tour's shape, and one is needed`);
  }
  return found[0] as IntroductionTour;
}

/** The edit `introductionTour` describes: the tour list's enter becomes a call to its exit. */
export function skipIntroductionTour(c: Container): Edit[] {
  const tour = introductionTour(c);
  if (tour.state === 'skipped') {
    throw new EditError(`the introduction tour is already skipped: list ${tour.list} calls its exit`);
  }
  const table = c.pointerArray(archSlot(c.architecture as number, ACTION_LIST_TABLE_SLOT));
  const address = table?.[tour.list];
  if (address === undefined) throw new EditError(`action list ${tour.list} has no address`);
  // The second instruction, `{ u16 operand; u8 opcode }` with the operand low byte first, past the
  // count byte and the first instruction.
  const off = c.blobOffsetOf(address + 1 + 3);
  if (off === undefined) throw new EditError(`action list ${tour.list} is outside the container`);
  if (tour.exit > 0xffff) throw new EditError(`list ${tour.exit} does not fit an operand`);
  return [{
    start: off,
    bytes: Uint8Array.from([tour.exit & 0xff, tour.exit >>> 8, ACTION_LIST_INDEX_OPCODE]),
    owner: `introduction tour list ${tour.list}`,
  }];
}
