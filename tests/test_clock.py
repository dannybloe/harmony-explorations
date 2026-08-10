"""
The arch 12 clock: seven data memory bytes, base slot 3's encoding, and what the firmware does with
the record. `docs/findings.md` section 111, and the answer it gives to section 21's open question.

The claims under test, in the order they are argued in the section:

* `0x108` is a seconds field taken modulo 60, from the adder's own loop;
* the calendar's month table groups the twelve months exactly as a March to February year groups
  them by the weekday their first day falls on, which is what makes it a day of week computation
  rather than a table of month lengths. **The span matters**: grouping inside one calendar year gives
  a different and wrong answer, which is the point of the January and February adjustment;
* the clock's seven bytes pair one for one with base slot 3's record, because the firmware
  subtracts them, and the pairing skips the record's day of week byte on both sides;
* the log appender's case 3 copies six of those bytes in descending order of significance, so its
  record is a timestamp;
* what was measured on the bench remote is consistent with all of it.

The measured values are pinned as a **relation** and not only as bytes: a seconds field that steps
by four cannot leave its residue class modulo 4, and the observed set is exactly that class. A test
that asserted `0x108 == 0x2f` would pass for the wrong reason and fail on the next remote.

Nothing here needs a remote. The hardware half is in `packages/usb/test/hardware.test.ts`.
"""
import datetime
import unittest

import lab
from harmony import gspm
from harmony.pic18 import chains, isa

ONE_BASE = 0x20000
IMAGE = 'one34_code'

# The clock's fields in data memory, arch 12. Named by what the subtraction pairs them with.
SECOND = 0x108
MINUTE = 0x109
HOUR = 0x10A
DAY = 0x10B
WEEKDAY = 0x10C
MONTH = 0x10D
YEAR = 0x10E

# The seconds adder and its modulo 60 loop, section 111.
ADDER = 0x27A0E
SECONDS_PER_MINUTE = 60

# The calendar, its month table chain, and where it stores the weekday it derives.
CALENDAR = 0x27F78
MONTH_CHAIN = 0x27F9A           # the first XORLW, switching on the month 1 to 12
FALLTHROUGH_TEST = 0x27FC6      # the last one, whose BNZ leaves one month to fall through
FALLTHROUGH_MONTH = 6           # and it is June
FALLTHROUGH_PARTNER = 2         # which shares an arm with February, since both start alike
WEEKDAY_STORE = 0x2806C
DAY_ROLLOVER = 0x280E0
MONTHS_PER_YEAR = 12
# A common year, and a common one after it, so the March to February span has no leap day in it.
SPAN_YEAR = 2026

# The comparison against base slot 3, which is what names the fields.
COMPARE = 0x27F20               # seeks slot 3 and calls the two helpers
SEEKER = 0x2BA76                # the section seeker, section 35
CURSOR_SKIP = 0x2BA14           # advance the config cursor by a count
CURSOR_STEP = 0x2BA08           # advance it by one
READ_BYTE = 0x2B8F8             # read the byte at the cursor and advance
TIME_DIFFERENCE = 0x27CC0       # second, minute, hour against the record
DATE_DIFFERENCE = 0x27DFA       # day, month, year against the record, weekday skipped
CLOCK_RECORD_SLOT = 3
COOKIE_BYTES = 2                # 0xADDF, which the cursor steps past before the first field

# Base slot 3's record, from `docs/config-format.md`. Offsets within the eleven byte record.
RECORD_FIELDS = {
    'second': 0x02,
    'minute': 0x03,
    'hour': 0x04,
    'day': 0x05,
    'weekday': 0x06,
    'month': 0x07,
    'year': 0x08,
}
# What the firmware differences, in the order each helper reads the config.
TIME_PAIRS = ((SECOND, 'second'), (MINUTE, 'minute'), (HOUR, 'hour'))
DATE_PAIRS = ((DAY, 'day'), (MONTH, 'month'), (YEAR, 'year'))

# Section 47's log appender, case 3, whose six bytes are copied in this order.
LOG_CASE_THREE = 0x256BC
LOG_CASE_THREE_BYTES = (SECOND, MINUTE, HOUR, DAY, MONTH, YEAR)

# What the spare Harmony One held on 10 August 2026, read only. The date is the whole point: it is
# `one_spare_after_sync`'s own build date.
MEASURED = {SECOND: 47, MINUTE: 53, HOUR: 18, DAY: 6, WEEKDAY: 5, MONTH: 7, YEAR: 26}
MEASURED_SECONDS_SEEN = (47, 55, 3, 11, 23, 31)
MEASURED_DISTINCT_SECONDS_IN_A_MINUTE = 15
SECONDS_STEP = 4
MEASURED_UNIT = 'one_spare_after_sync'


def instructions(start, count, name=IMAGE, base=ONE_BASE):
    """`count` decoded instructions from `start`, as (address, Instr) pairs."""
    code = lab.load(name)
    out = []
    offset = start - base
    for _ in range(count):
        instr = isa.decode(code, offset, base)
        out.append((base + offset, instr))
        offset += 2 * instr.words
    return out


def calls(pairs):
    """Every call target in a decoded run, in order. `RCALL` counts: half of these are relative."""
    return [i.fields['target'] for _, i in pairs if i.mnemonic in ('CALL', 'RCALL')]


def branches(pairs):
    """Every unconditional short branch target, which is how the reduction loops."""
    return [i.fields['target'] for _, i in pairs if i.mnemonic == 'BRA']


def banked_reads(pairs, addresses):
    """Which of `addresses` a decoded run reads, in the order it reads them.

    `MOVFF` names both operands in full, which is how the clock's fields are copied, so this does
    not need the bank tracking that a `MOVF` would.
    """
    wanted = set(addresses)
    out = []
    for _, instr in pairs:
        if instr.mnemonic != 'MOVFF':
            continue
        src = instr.fields.get('src')
        if src in wanted:
            out.append(src)
    return out


def month_group(month):
    """Which months the firmware's table has to group together, derived from the calendar.

    Not "months that start on the same weekday" in one calendar year, which is a different and wrong
    grouping. The routine adjusts January and February into the **previous** year two instructions
    earlier, which is the standard trick that puts the leap day at the end, so the grouping it needs
    is over a March to February span: two months share an arm when their first days fall on the same
    weekday with January and February taken from the following year. A common year on both sides, so
    the span carries no leap day.
    """
    return datetime.date(SPAN_YEAR if month >= 3 else SPAN_YEAR + 1, month, 1).weekday()


def weekday_from_the_records_epoch(date):
    """Days since 1 January 2000 modulo 7, which is base slot 3's convention: 0 is Saturday.

    Section 21 confirmed this on sixteen samples, so it is the calibrated half of the pairing: the
    RAM byte is believed to use it because the firmware differences the RAM fields against the
    record's, not because it happens to fit one observation.
    """
    return (date - datetime.date(2000, 1, 1)).days % 7


class TheSecondsFieldTest(unittest.TestCase):
    """`0x108` counts seconds and the firmware says so."""

    def test_the_adder_reduces_the_seconds_field_modulo_sixty(self):
        got = instructions(ADDER, 14)
        # An ADDWF into the field, a compare against 60, a carry call, a subtract of 60, and a branch
        # back to the compare. The loop rather than a single subtract is what makes a step of more
        # than one second safe, which is what the remote turns out to take.
        arithmetic = [(a, i) for a, i in got
                      if i.mnemonic in ('ADDWF', 'SUBWF') and i.fields.get('f') == SECOND & 0xFF]
        self.assertEqual([i.mnemonic for _, i in arithmetic], ['ADDWF', 'SUBWF', 'SUBWF'],
                         'add the elapsed seconds, compare against 60, subtract 60')
        self.assertEqual(arithmetic[1][1].fields['d'], 0, 'the compare discards its result')
        self.assertEqual(arithmetic[2][1].fields['d'], 1, 'the subtract keeps it')
        literals = [i.fields['k'] for _, i in got if i.mnemonic == 'MOVLW']
        self.assertEqual(literals.count(SECONDS_PER_MINUTE), 2, 'once to compare, once to subtract')
        back = branches(got)
        self.assertTrue(back, 'the reduction is a loop, so there is a backward branch')
        self.assertLess(back[-1], arithmetic[1][0] + 2, 'and it lands on or before the compare')

    def test_a_four_second_step_cannot_leave_its_residue_class(self):
        # Not a property of the image: a property of the arithmetic, which is why the measured set
        # of values is one residue class rather than all sixty.
        self.assertEqual(SECONDS_PER_MINUTE % SECONDS_STEP, 0)
        for start in MEASURED_SECONDS_SEEN:
            self.assertEqual(start % SECONDS_STEP, MEASURED[SECOND] % SECONDS_STEP)
        self.assertEqual(SECONDS_PER_MINUTE // SECONDS_STEP,
                         MEASURED_DISTINCT_SECONDS_IN_A_MINUTE)

    def test_the_measured_wrap_is_what_the_loop_predicts(self):
        # 55 plus 4 is 59, and 59 plus 4 is 63, which one subtraction of 60 turns into 3. The
        # measurement went 55 then 3 across a nine second gap, with the minute carrying.
        value = 55
        for _ in range(2):
            value += SECONDS_STEP
            while value >= SECONDS_PER_MINUTE:
                value -= SECONDS_PER_MINUTE
        self.assertEqual(value, 3)
        self.assertIn(3, MEASURED_SECONDS_SEEN)


class TheCalendarTest(unittest.TestCase):
    """The routine above the minute is a day of week computation, and the table proves it."""

    def test_the_month_table_groups_the_months_that_start_on_the_same_weekday(self):
        code = lab.load(IMAGE)
        cases = chains.xor_chain(code, ONE_BASE, MONTH_CHAIN)
        values = sorted(case.value for case in cases)
        # Eleven cases, not twelve: the last comparison is a `BNZ` past the table, so one month
        # reaches its arm by falling through. That is the only warning a chain gives.
        self.assertEqual(values, sorted(set(range(1, MONTHS_PER_YEAR + 1)) - {FALLTHROUGH_MONTH}))

        # Group the months by the address each case branches to. Two months share a target exactly
        # when they start on the same weekday, which is a statement about the calendar and not about
        # this image, so it is computed rather than tabulated.
        by_target = {}
        for case in cases:
            by_target.setdefault(case.target, set()).add(case.value)

        expected = {}
        for month in range(1, MONTHS_PER_YEAR + 1):
            expected.setdefault(month_group(month), set()).add(month)
        # The fall-through month belongs to whichever group the calendar puts it in, and the test is
        # that the firmware's own grouping of the other eleven agrees with that.
        wanted = sorted(sorted(g - {FALLTHROUGH_MONTH})
                        for g in expected.values() if g - {FALLTHROUGH_MONTH})
        self.assertEqual(sorted(sorted(g) for g in by_target.values()), wanted)

    def test_the_fall_through_month_lands_on_the_arm_its_weekday_group_names(self):
        code = lab.load(IMAGE)
        cases = {case.value: case.target for case in chains.xor_chain(code, ONE_BASE, MONTH_CHAIN)}
        # Which month shares a first weekday with the fall-through one, by the calendar alone.
        partners = {month for month in range(1, MONTHS_PER_YEAR + 1)
                    if month != FALLTHROUGH_MONTH
                    and month_group(month) == month_group(FALLTHROUGH_MONTH)}
        self.assertEqual(partners, {FALLTHROUGH_PARTNER})
        # And the chain's last test is a `BNZ` past the table, so the instruction after it is the
        # fall-through arm. It has to be that partner's arm, and it is.
        got = instructions(FALLTHROUGH_TEST, 3)
        self.assertEqual([i.mnemonic for _, i in got][:2], ['XORLW', 'BNZ'])
        self.assertEqual(got[2][0], cases[FALLTHROUGH_PARTNER])

    def test_the_calendar_stores_its_result_in_the_weekday_byte(self):
        got = dict(instructions(WEEKDAY_STORE, 1))
        instr = got[WEEKDAY_STORE]
        self.assertEqual(instr.mnemonic, 'MOVFF')
        self.assertEqual(instr.fields['dst'], WEEKDAY)

    def test_the_day_rollover_reduces_the_month_modulo_twelve(self):
        got = instructions(DAY_ROLLOVER, 24)
        literals = [i.fields['k'] for _, i in got if i.mnemonic == 'MOVLW']
        self.assertIn(MONTHS_PER_YEAR, literals)
        written = [i.fields['dst'] for _, i in got if i.mnemonic == 'MOVFF']
        self.assertIn(MONTH, written)
        self.assertIn(DAY, written)


class ThePairingWithTheBuildTimestampTest(unittest.TestCase):
    """What names the fields: the firmware subtracts them from base slot 3's record."""

    def test_the_comparison_seeks_base_slot_three_and_steps_past_the_cookie(self):
        got = instructions(COMPARE, 20)
        literals = [i.fields['k'] for _, i in got if i.mnemonic == 'MOVLW']
        self.assertIn(CLOCK_RECORD_SLOT, literals, 'the slot number is a literal at the call site')
        self.assertIn(COOKIE_BYTES, literals, 'and the cursor steps past 0xADDF before reading')
        targets = calls(got)
        self.assertIn(SEEKER, targets)
        self.assertIn(CURSOR_SKIP, targets)
        self.assertIn(TIME_DIFFERENCE, targets)
        self.assertIn(DATE_DIFFERENCE, targets)
        self.assertLess(targets.index(SEEKER), targets.index(TIME_DIFFERENCE),
                        'the seek comes first, so the bytes read are the record')
        self.assertLess(targets.index(TIME_DIFFERENCE), targets.index(DATE_DIFFERENCE),
                        'and time before date, which is the order the record has them in')

    def test_the_time_helper_pairs_three_ram_bytes_with_three_record_fields(self):
        got = instructions(TIME_DIFFERENCE, 12)
        self.assertEqual(banked_reads(got, [SECOND, MINUTE, HOUR]), [SECOND, MINUTE, HOUR])
        self.assertEqual(calls(got).count(READ_BYTE), 3, 'three record bytes, one per field')
        # The record has these three consecutive, so consecutive reads pair them in order.
        offsets = [RECORD_FIELDS[name] for _, name in TIME_PAIRS]
        self.assertEqual(offsets, list(range(offsets[0], offsets[0] + len(offsets))))

    def test_the_date_helper_skips_the_records_own_weekday_byte(self):
        got = instructions(DATE_DIFFERENCE, 14)
        self.assertEqual(banked_reads(got, [DAY, MONTH, YEAR]), [DAY, MONTH, YEAR])
        targets = calls(got)
        self.assertEqual(targets.count(READ_BYTE), 3)
        self.assertEqual(targets.count(CURSOR_STEP), 1,
                        'one extra advance, which is the weekday byte going past unread')
        # And it is between the first and the second read, because that is where the record's
        # weekday sits: day, weekday, month, year.
        first = targets.index(READ_BYTE)
        self.assertEqual(targets[first + 1], CURSOR_STEP)
        self.assertEqual(RECORD_FIELDS['weekday'], RECORD_FIELDS['day'] + 1)
        self.assertEqual(RECORD_FIELDS['month'], RECORD_FIELDS['weekday'] + 1)

    def test_neither_helper_touches_the_derived_weekday(self):
        for start, count in ((TIME_DIFFERENCE, 12), (DATE_DIFFERENCE, 14)):
            got = instructions(start, count)
            self.assertEqual(banked_reads(got, [WEEKDAY]), [],
                             'the firmware derives the weekday, so a difference would be circular')


class TheLogRecordTest(unittest.TestCase):
    """Section 47's case 3 appends a timestamp, which the copy order says on its own."""

    def test_case_three_copies_the_clock_in_descending_significance(self):
        got = instructions(LOG_CASE_THREE, 6)
        copied = banked_reads(got, LOG_CASE_THREE_BYTES)
        self.assertEqual(copied, list(LOG_CASE_THREE_BYTES))
        # Reversed, the record is year, month, day, hour, minute, second. Stated as a property of
        # the field order rather than as a list, so it fails if the pairing above changes.
        significance = [YEAR, MONTH, DAY, HOUR, MINUTE, SECOND]
        self.assertEqual(list(reversed(copied)), significance)

    def test_the_appended_record_omits_the_weekday(self):
        self.assertNotIn(WEEKDAY, LOG_CASE_THREE_BYTES)
        self.assertEqual(len(LOG_CASE_THREE_BYTES), len(RECORD_FIELDS) - 1)


class WhatTheBenchRemoteHeldTest(unittest.TestCase):
    """The measurement, checked for self consistency rather than pinned as seven bytes."""

    def test_the_measured_weekday_agrees_with_the_measured_date(self):
        date = datetime.date(2000 + MEASURED[YEAR], MEASURED[MONTH] + 1, MEASURED[DAY])
        self.assertEqual(weekday_from_the_records_epoch(date), MEASURED[WEEKDAY])
        self.assertEqual(date.strftime('%A'), 'Thursday')

    def test_the_measured_date_is_the_units_own_config_build_date(self):
        skip = lab.require(MEASURED_UNIT)
        if skip:
            raise unittest.SkipTest(skip)
        container = gspm.parse(lab.load(MEASURED_UNIT))
        slot = gspm.arch_slot(container.architecture, CLOCK_RECORD_SLOT)
        offset = container.blob_offset_of(container.sections[slot].address)
        built = gspm.clock_record(container.blob, offset)
        self.assertEqual((built.year, built.month, built.day),
                         (2000 + MEASURED[YEAR], MEASURED[MONTH] + 1, MEASURED[DAY]),
                         'the remote was holding its own config build date')
        # The minute agrees too, which is what makes the initialisation hypothesis worth a battery
        # pull. The hour does not, and that difference is the whole open question.
        self.assertEqual(built.minute, MEASURED[MINUTE] + 1)
        self.assertNotEqual(built.hour, MEASURED[HOUR])

    def test_the_measured_month_field_is_zero_based_like_the_record(self):
        # August is 8 and the field is 7, on both sides. Asserted because a one based reading of
        # either would have made this section's first pass right about the date.
        skip = lab.require(MEASURED_UNIT)
        if skip:
            raise unittest.SkipTest(skip)
        container = gspm.parse(lab.load(MEASURED_UNIT))
        slot = gspm.arch_slot(container.architecture, CLOCK_RECORD_SLOT)
        offset = container.blob_offset_of(container.sections[slot].address)
        raw = container.blob[offset + RECORD_FIELDS['month']]
        self.assertEqual(raw, MEASURED[MONTH])
        self.assertEqual(container.blob[offset + RECORD_FIELDS['day']], MEASURED[DAY])
        self.assertEqual(container.blob[offset + RECORD_FIELDS['weekday']], MEASURED[WEEKDAY])


if __name__ == '__main__':
    unittest.main()
