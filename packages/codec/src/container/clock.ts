/**
 * Base slot 3's clock record: where it sits, its cookie and its seven fields, read and written, and the flash base
 * address recovered from it, which is the content anchor `gspm.ts`'s docstring describes. Re-exported whole by
 * `gspm.ts`, so every name keeps its path.
 */
import { indexOf, matchesAt, u8 } from '../support/bytes.ts';

/**
 * Section slot 3 is an eleven byte framed record holding a timestamp. Its cookie and terminator are
 * their own pair, nothing to do with slot 0's, and unlike `0xFEED` this pair occurs exactly once in
 * every one of the 33 containers the lab can parse, so it identifies the record without needing a
 * length to validate it.
 *
 * ```
 * +0x00  u16  0xADDF
 * +0x02  u8   second, minute, hour, day of month (0 = the 1st), day of week (0 = Sunday),
 *             month (0 = January)
 * +0x08  u8   year, offset from 2000
 * +0x09  u16  0xEFBF
 * ```
 *
 * The field assignment was a search result, section 21: of the 48 permutations of the four date
 * bytes times two month bases times seven weekday offsets, exactly one is consistent with every
 * sample. **The search could not see how the day is counted**, section 322, because a day counted from
 * 0 with a Sunday based weekday and a day counted from 1 with a Saturday based one accept the same
 * bytes, a day apart, on every stamp except one made on the 1st of a month, which stores a day of 0.
 * No container held one until 1 October 2026. The firmware settles it: every image read carries a
 * month end routine whose last valid day is 30 for a 31 day month and 29 for a 30 day one, and
 * Logitech's classic client writes the day minus one. So the day and the weekday both count from 0,
 * Sunday for the weekday, and this project read every date one day early until 3 October 2026.
 */
export const CLOCK_RECORD_SLOT = 3;
export const CLOCK_COOKIE = new Uint8Array([0xdf, 0xad]);
export const CLOCK_END = new Uint8Array([0xbf, 0xef]);
export const CLOCK_RECORD_LENGTH = 11;
/**
 * The section is three bytes longer than the record, and those three are zero in all nineteen
 * containers of the corpus. The record closes at `CLOCK_END`, so the tail is the section's own and
 * not part of the framing. `docs/findings.md` section 84.
 */
export const CLOCK_SECTION_LENGTH = 14;
/** The seven fields of the slot 3 record sit here, after the `0xADDF` cookie. */
export const CLOCK_FIELDS_OFFSET = 2;
export const CLOCK_FIELD_COUNT = 7;
/** The year is a `u8` offset from 2000, so this is the whole range the record can express. */
export const CLOCK_FIRST_YEAR = 2000;
export const CLOCK_LAST_YEAR = CLOCK_FIRST_YEAR + 0xff;

/**
 * The last valid **stored** day of `month` (0 = January) in year `2000 + yearOffset`, as the firmware
 * states it: 30 for a 31 day month, 29 for a 30 day one, and for February 28 when `yearOffset & 3` is
 * zero and 27 otherwise. Section 322.
 *
 * Read out of the month end routine, which is the same code on all nine firmware images in the lab,
 * five architectures: the Harmony One 3.4 at `0x28072`, the Harmony 600 0.2 and the bench 650's 0.2
 * at `0x10BC0`, the 650's 0.4 at `0x14E90`, the Harmony 700 2.8 at `0x150DA`, the Harmony 525 at
 * `0x4180`, the Harmony 880 and 885 at `0x156EA` and the Harmony 350 1.4 at `0x14382`. An `XORLW` chain picks April, June, September and
 * November (3, 5, 8 and 10) and February (1), and each arm compares the stored day against one
 * literal. So the stored day is counted from 0, and this is what a reader refuses past and an encoder
 * never writes past. `tests/firmware/test_clock_counting.py` reads the limits out of each image.
 *
 * **The leap test is the firmware's and not the calendar's**: `year & 3`, which disagrees with the
 * Gregorian rule in 2100 and 2200, both inside the record's range. A date the calendar does not have
 * is refused separately, so 29 February 2100 reads as nothing rather than as 1 March.
 */
export function clockLastDayIndex(month: number, yearOffset: number): number {
  if (month === 1) return (yearOffset & 3) === 0 ? 28 : 27;
  return [3, 5, 8, 10].includes(month) ? 29 : 30;
}

/** Parse the first Harmony config container found in `data`. */
/**
 * The timestamp in the slot 3 record at `off`, as `YYYY-MM-DDTHH:MM:SS`, or undefined if there is
 * not one there.
 *
 * A string rather than a `Date`, and formatted by hand rather than through `toISOString`, because
 * the value carries no timezone: it is whatever clock wrote it. Going through `Date` would attach
 * one and then the golden vectors would depend on where the tests run.
 *
 * **The stored day is counted from 0 and the weekday from Sunday**, section 322, so the date is the
 * stored day plus one. This read the stored day as the date and the weekday as days since 1 January
 * 2000, which is the same bytes on every date the corpus held, so every date this project reported
 * was one day early and a stamp made on the 1st of a month, a stored 0, was refused outright. That
 * refusal is what exposed it, todo-compile-650 1.3.1.
 *
 * Undefined rather than an error for anything that does not fit: a stored day past the firmware's own
 * last index for its month, `clockLastDayIndex`, a date the calendar does not have, or a stored day of
 * week that disagrees with the date. That last check is the reason to trust the reading at all, so it
 * stays in the parser rather than only in a test.
 */
export function clockRecord(blob: Uint8Array, off: number): string | undefined {
  if (!matchesAt(blob, off, CLOCK_COOKIE)) return undefined;
  if (!matchesAt(blob, off + 9, CLOCK_END)) return undefined;
  const second = u8(blob, off + 2);
  const minute = u8(blob, off + 3);
  const hour = u8(blob, off + 4);
  const stored = u8(blob, off + 5);
  const dow = u8(blob, off + 6);
  const month = u8(blob, off + 7);
  const yearOffset = u8(blob, off + 8);
  const year = CLOCK_FIRST_YEAR + yearOffset;
  if (month > 11 || hour > 23 || minute > 59 || second > 59) return undefined;
  // The firmware's own limit, which is what makes a stored 30 in April a refusal and not the 31st.
  if (stored > clockLastDayIndex(month, yearOffset)) return undefined;
  const day = stored + 1;
  const date = new Date(Date.UTC(year, month, day));
  // Rejects a date the calendar does not have, which Date.UTC would roll over instead. Past the limit
  // above, only 29 February of a year the firmware's `& 3` calls leap and the calendar does not, 2100
  // and 2200, can reach here.
  if (date.getUTCMonth() !== month || date.getUTCDate() !== day) return undefined;
  // Sunday is 0, which is JavaScript's own convention, so the weekday needs no epoch at all.
  if (date.getUTCDay() !== dow) return undefined;
  return timestampOf(year, month + 1, day, hour, minute, second);
}

/**
 * The one place a `builtAt` string is spelled, `YYYY-MM-DDTHH:MM:SS` with every field padded.
 *
 * It was spelled twice, here and in `edit.ts`'s `localTimestamp`, each with its own `padStart`
 * helper and both correct. Two right copies is the state that precedes two diverging ones, which is
 * this repository's oldest rule and which no test can see while they agree. `TIMESTAMP` below is
 * what parses the result, so the encoder and its decoder sit together.
 */
export function timestampOf(
  year: number, month: number, day: number, hour: number, minute: number, second: number,
): string {
  const p = (n: number, w = 2): string => String(n).padStart(w, '0');
  return `${p(year, 4)}-${p(month)}-${p(day)}T${p(hour)}:${p(minute)}:${p(second)}`;
}

/**
 * Every offset in `blob` where a clock record validates.
 *
 * Exactly one in all 33 containers the lab can parse, which is what makes it usable as an
 * anchor. `clockRecord` requires the stored day of week to agree with the stored date, so a hit
 * is a closure and not a two byte cookie match: the pair turns up by chance roughly once per
 * 32 KiB and none of those chance hits validates.
 */
export function findClockRecords(blob: Uint8Array): number[] {
  const out: number[] = [];
  // From cookie to cookie through `indexOf` rather than a comparison at every offset, which cost five
  // milliseconds a configuration and ran on every `parse`. The same offsets: each one holding the cookie
  // with a whole record after it.
  for (let off = indexOf(blob, CLOCK_COOKIE); off >= 0 && off + 11 <= blob.length; off = indexOf(blob, CLOCK_COOKIE, off + 1)) {
    if (clockRecord(blob, off) !== undefined) out.push(off);
  }
  return out;
}

/**
 * A container is written at the start of a flash block, so its base is a multiple of this. Every
 * base established here is: 0x002000, 0x018000, 0x01E000, 0x020000, 0x030000 and 0x040000. It is
 * what makes the clock anchor land on one answer instead of a dozen.
 */
export const FLASH_BASE_ALIGNMENT = 0x1000;

/**
 * The flash address the container was linked for, anchored on the clock record.
 *
 * **This used to be `endAddr - (offsetOfEndMarker - offsetOfMagic)`, and that reading is
 * circular.** The base came out of the marker's position, and the check meant to validate it
 * asked whether `endAddr` lands on the marker, which it then always did. A check that cannot fail
 * is not a check, and this one hid a real error for as long as it existed: `H890-Bedroom-2` has
 * 864 bytes between the end its header declares and its end marker, so the subtraction returned a
 * base 864 too low and every pointer resolved 864 bytes late. That file is a damaged read rather than
 * a generator error, section 122, and `0x030000` is the base its repaired container verifies under.
 * A wrong base does not fail, it
 * reads the neighbouring bytes.
 *
 * So the base comes from the data. Each non-NULL pointer is absolute and exactly one targets the
 * clock record, so `address - offsetOfClockRecord` is a candidate base per pointer, filtered by
 * block alignment and by every other pointer resolving inside the blob. One candidate survives in
 * 24 of the 27 containers it was measured over, the three misses being the damaged Harmony 890
 * reads below. Of those 24: 23 where the base was already established, spanning five architectures and
 * six bases, plus the one where the two readings disagree and this one agrees with the
 * independent fact that its trailer checksum fails. `docs/findings.md` section 117.
 *
 * Undefined when the anchor is unavailable or ambiguous, so the caller falls back rather than
 * this guessing. This said "nothing in the corpus reaches that path"<!--superseded--> and **three
 * lab samples do**: `h890_config_2_rescan`, `h890_config_2_redump_2` and `h890_config_2_redump_3`,
 * all reads of one Harmony 890 whose clock record sits 54 bytes off the pointer that names it, so
 * no candidate is aligned and none survives. The fallback then returns `0x02FF94`, `0x02FEF2` and
 * `0x02FD78`, **none of them block aligned**, and `end_addr_points_at_end_marker` reports true for
 * each because the base came from the marker's own position. That is section 117's circularity,
 * still live inside the second arm of the `??`, which is why `flash_base_is_block_aligned` is a
 * check now: it is the one thing about a fallback base that can fail.
 *
 * `src/harmony/gspm.py` has carried the corrected sentence since section 122 and this copy did not,
 * which is the two copies rule caught in its documentation rather than in its arithmetic.
 */
export function recoverFlashBase(blob: Uint8Array, addresses: number[]): number | undefined {
  const clocks = findClockRecords(blob);
  if (clocks.length !== 1) return undefined;
  const clockOff = clocks[0] as number;
  const candidates = new Set<number>();
  for (const address of addresses) {
    if (!address) continue;
    const base = address - clockOff;
    if (base < 0 || base % FLASH_BASE_ALIGNMENT !== 0) continue;
    if (addresses.every((a) => !a || (a - base >= 0 && a - base < blob.length))) {
      candidates.add(base);
    }
  }
  return candidates.size === 1 ? [...candidates][0] : undefined;
}

/** `YYYY-MM-DDTHH:MM:SS`, which is what `clockRecord` returns and what this takes back. */
const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

/**
 * The seven field bytes of a slot 3 record for `builtAt`, or undefined if it cannot hold it.
 *
 * **The exact inverse of `clockRecord`, and it lives beside it on purpose.** Two callers need this,
 * the emitter and the edit layer, and before they shared it they each derived the day of week
 * themselves with a different spelling of the same epoch. That is the shape of defect this project
 * bans for the opcode table: two copies of one derivation, both plausible, diverging quietly. So
 * there is one encoder, one decoder, and a test that walks the corpus asserting they are inverses.
 *
 * **The day is written counted from 0 and the weekday from Sunday**, section 322, which is how the
 * remote counts both. This wrote the day of the month itself until 3 October 2026, so every
 * configuration this project stamped set the remote's clock one day ahead: on the spare Harmony One
 * every save from section 242 on, and on the Harmony 650 every save from section 285 on. A round trip
 * never showed it, because the decoder made the same mistake in the other direction.
 *
 * The day of week is **computed** rather than taken from the caller, because `clockRecord` refuses a
 * record whose weekday disagrees with its date and that refusal is the reason to trust the whole
 * reading, section 21. So nothing here can produce a record our own reader would reject.
 *
 * Undefined rather than an error, mirroring the decoder, so each caller can raise the error its own
 * layer promises. `edit.ts` turns it into an `EditError`.
 */
export function clockRecordFields(builtAt: string): Uint8Array | undefined {
  const parts = TIMESTAMP.exec(builtAt);
  if (parts === null) return undefined;
  const [year, month, day, hour, minute, second] = parts.slice(1).map(Number) as [
    number, number, number, number, number, number,
  ];
  if (year < CLOCK_FIRST_YEAR || year > CLOCK_LAST_YEAR) return undefined;
  if (month < 1 || month > 12 || day < 1) return undefined;
  if (hour > 23 || minute > 59 || second > 59) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects a day its month does not have, which Date.UTC rolls over instead.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  // And a day the firmware would not hold. The calendar check above already covers every date, since
  // the two limits differ only where the firmware's `& 3` allows a 29 February the calendar does not,
  // but stating it keeps the encoder's range the decoder's by construction rather than by argument.
  if (day - 1 > clockLastDayIndex(month - 1, year - CLOCK_FIRST_YEAR)) return undefined;
  return new Uint8Array([
    second, minute, hour, day - 1, date.getUTCDay(), month - 1, year - CLOCK_FIRST_YEAR,
  ]);
}
