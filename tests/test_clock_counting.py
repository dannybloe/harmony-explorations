"""
How the remote counts the day of the month and the day of the week. `docs/findings.md` section 322.

The clock record's day is stored counted from 0 and its weekday counted from Sunday. This project read
the same bytes as a day counted from 1 and a weekday counted from Saturday, 1 January 2000. The two
readings name different dates for every stamp, one day apart, and both find the stored weekday
consistent with their own date, so they differ in what they **accept** in two places only: a stored day
of 0, which only the new reading can read and which is how a stamp made on the 1st of a month looks,
and a stored day equal to the month's length, which only the old reading can read and which the
firmware never holds. No container held either until a sync on 1 October 2026, so a fit to the corpus
could not tell them apart, and section 21's search of 336 candidates never had the day's base among
its candidates.

The claims under test, each with its own evidence:

* **the firmware states the last day of each month as an index**, and the index stops at 30 for a 31
  day month, 29 for a 30 day one and 28 or 27 for February by `year & 3`. Read out of the month end
  routine on every firmware image in the lab, nine images over five architectures, rather than
  transcribed: the switch's cases come from `chains.xor_chain` and the limits from the instructions
  at each case's target;
* **the firmware's weekday is Sunday based over the stored day plus one**, which the arch 12 routine
  states in its first instructions, `INCF` on the day and on the month;
* **every stamp with a date known from outside the record decodes to that date**, where the old
  reading put each one a day early, and the 1st of a month among them is the one the old reading
  could not read at all;
* **and the encoder writes what the firmware counts**, checked against Logitech's own bytes.

Nothing here needs a remote. The firmware half needs the images and the stamp half needs the configs.
"""
import datetime
import unittest

import lab
from harmony import gspm
from harmony.pic18 import chains, isa

#: image -> (load base, where the month end routine starts, where the state variables start).
#: The routine is found by its first instruction, a `MOVFF` of state variable 3, the day, so the third
#: column is what makes the address checkable rather than transcribed. Arch 12 keeps the variables at
#: 0x108, arch 8 too, the Harmony 600 and the bench 650 at 0xE10, the 650's 0.4 and the 700 at 0x900,
#: and the 525 at 0x160, the bases `tests/test_firmware_state_block.py` states for the first six. The
#: Harmony 350's 1.4, arch 16, keeps them at 0x108 as well; its routine was found by section 322's blind
#: reviewer, which is why it is checked here rather than assumed from the other seven.
MONTH_END = {
    'one34_code': (0x20000, 0x28072, 0x108),
    'h600_code_complete': (0x9000, 0x10BC0, 0xE10),
    'h650_bench_code': (0x9000, 0x10BC0, 0xE10),
    'h650_code': (0x9000, 0x14E90, 0x900),
    'h700_code': (0x9000, 0x150DA, 0x900),
    'h525_code': (0x0000, 0x04180, 0x160),
    'arch8_code_880': (0x10000, 0x156EA, 0x108),
    'arch8_code_885': (0x10000, 0x156EA, 0x108),
    'h350_code': (0x9000, 0x14382, 0x108),
}
ARCHITECTURES = {'one34_code': 12, 'h600_code_complete': 14, 'h650_bench_code': 14, 'h650_code': 14,
                 'h700_code': 14, 'h525_code': 9, 'arch8_code_880': 8, 'arch8_code_885': 8,
                 'h350_code': 16}
DAY, MONTH, YEAR = 3, 5, 6
MONTHS = range(12)
FEBRUARY = 1
#: How far the routine is walked looking for its own pieces. It is 80 instructions long on every image.
WINDOW = 60

#: The arch 12 weekday routine, section 111's calendar. It is walked to its first `RETURN`, which is the
#: instruction before the month end routine at 0x28072; the bound only stops a runaway walk.
ONE_WEEKDAY = 0x27F78
WEEKDAY_LENGTH = 120
#: Where the Harmony One keeps its state variables, and the routine's two scratch bytes for the day and
#: the month plus one.
ONE_VARIABLES = 0x108
DAY_PLUS_ONE, MONTH_PLUS_ONE = 0xD22, 0xD23


def walk(code, base, start, count):
    """`count` decoded instructions from `start`, as (address, Instr) pairs."""
    out = []
    offset = start - base
    for _ in range(count):
        instr = isa.decode(code, offset, base)
        out.append((base + offset, instr))
        offset += 2 * instr.words
    return out


def to_return(pairs):
    """A decoded run cut after its first `RETURN`, so a routine is not read into the next one."""
    for n, (_, instr) in enumerate(pairs):
        if instr.mnemonic == 'RETURN':
            return pairs[:n + 1]
    raise AssertionError('no RETURN in the run')


def banked(pairs):
    """(address, mnemonic, full data address, destination bit) for every banked file access in a run.

    The bank comes from the last `MOVLB`, which is how the PIC18 resolves an access with `a` set; an
    access with `a` clear goes to the access bank and is left out, since this test asks about the
    clock's variables and the routine's scratch, which are all banked.
    """
    bank, out = None, []
    for address, instr in pairs:
        if instr.mnemonic == 'MOVLB':
            bank = instr.fields['k']
        elif 'f' in instr.fields and instr.fields.get('a') == 1 and bank is not None:
            out.append((address, instr.mnemonic, (bank << 8) | instr.fields['f'], instr.fields.get('d')))
    return out


def first_literal(pairs, start, mnemonic):
    """The literal of the first `mnemonic` at or after `start` in a decoded run."""
    for address, instr in pairs:
        if address >= start and instr.mnemonic == mnemonic:
            return address, instr.fields['k']
    raise AssertionError('no %s after 0x%X' % (mnemonic, start))


def last_index_per_month(name):
    """{(month, leap): the last stored day the routine allows}, read out of the image.

    Three things are read and nothing is assumed. The switch on the month, whose cases are the running
    XOR of its literals. The `SUBLW` that each case's arm opens with, which is the largest stored day it
    lets through unchanged. And on February's arm only, the two `MOVLW`s behind its `ANDLW 0x03`, which
    is the leap test: the first is taken when `year & 3` is zero. The arm the switch falls out of is the
    one every other month takes.
    """
    base, start, variables = MONTH_END[name]
    code = lab.load(name)
    pairs = walk(code, base, start, WINDOW)
    # The routine opens by copying day, month and year out of the clock, which is the evidence that
    # this is the clock's routine and that the address is right.
    sources = [i.fields['src'] for _, i in pairs[:3] if i.mnemonic == 'MOVFF']
    assert sources == [variables + DAY, variables + MONTH, variables + YEAR], (name, sources)
    chain_start = next(a for a, i in pairs if i.mnemonic == 'XORLW')
    cases = chains.xor_chain(code, base, chain_start)
    by_month = {case.value: case.target for case in cases}
    # The default arm is the instruction after the chain's last branch.
    last = max(case.at for case in cases)
    default = next(a for a, _ in pairs if a > last + 2)
    out = {}
    for month in MONTHS:
        arm = by_month.get(month, default)
        _, limit = first_literal(pairs, arm, 'SUBLW')
        for leap in (True, False):
            out[(month, leap)] = limit
    # February clamps to one more in a leap year, and that test is the only place the year is read.
    arm = by_month[FEBRUARY]
    andlw, mask = first_literal(pairs, arm, 'ANDLW')
    assert mask == 0x03, (name, mask)
    leap_at, leap = first_literal(pairs, andlw, 'MOVLW')
    _, common = first_literal(pairs, leap_at + 2, 'MOVLW')
    out[(FEBRUARY, True)] = leap
    out[(FEBRUARY, False)] = common
    return out, sorted(by_month)


class TheFirmwareStatesTheLastDayAsAnIndex(unittest.TestCase):
    """The month end routine, on every image in the lab, five architectures."""

    def test_the_switch_names_the_four_short_months_and_february(self):
        lab.require(*MONTH_END)
        for name in MONTH_END:
            with self.subTest(image=name):
                _, cases = last_index_per_month(name)
                # Zero based months: April, June, September, November and February. That the month
                # is zero based is section 21's, and this agrees without assuming it: a one based
                # reading would make these May, July, October, December and January.
                self.assertEqual(cases, [1, 3, 5, 8, 10])

    def test_the_last_index_is_one_less_than_the_length_of_the_month(self):
        """The claim, and it is checked against the calendar rather than against a table of ours.

        A one based day would need 31 for a long month and 30 for a short one, and the routine says 30
        and 29. That is the whole correction in one comparison.
        """
        lab.require(*MONTH_END)
        for name in MONTH_END:
            with self.subTest(image=name):
                limits, _ = last_index_per_month(name)
                for (month, leap), limit in limits.items():
                    year = 2024 if leap else 2025
                    after = datetime.date(year + (month == 11), (month + 1) % 12 + 1, 1)
                    length = (after - datetime.date(year, month + 1, 1)).days
                    self.assertEqual(limit, length - 1, (month, leap))
                    # And the reader's own table is the firmware's, both leap halves.
                    self.assertEqual(limit, gspm.clock_last_day_index(month, 0 if leap else 1),
                                     (month, leap))

    def test_it_spans_five_architectures(self):
        lab.require(*MONTH_END)
        self.assertEqual(sorted(set(ARCHITECTURES[name] for name in MONTH_END)), [8, 9, 12, 14, 16])
        self.assertEqual(sorted(ARCHITECTURES), sorted(MONTH_END))

    def test_the_weekday_routine_adds_one_to_the_stored_day(self):
        """Section 111's calendar on the Harmony One, whose first loads are the day and month plus one.

        That is the firmware turning a day counted from 0 into a calendar day before computing the
        weekday from it, which the old reading had no use for: a day already counted from 1 needs no
        `INCF`. The month gets the same treatment because it is zero based too, section 21.

        Asserted on full data memory addresses, the bank from the `MOVLB` before each access, so a
        different variable that shares the low byte cannot pass: the day `0x10B` plus one goes to the
        routine's scratch at `0xD22`, the month `0x10D` plus one to `0xD23`, and the weekday the routine
        computes is stored into state variable 4, `0x10C`, which is the clock's own weekday.
        """
        lab.require('one34_code')
        code = lab.load('one34_code')
        pairs = to_return(walk(code, 0x20000, ONE_WEEKDAY, WEEKDAY_LENGTH))
        accesses = banked(pairs)
        increments = [(f, dest) for _, mnemonic, f, dest in accesses if mnemonic == 'INCF']
        self.assertEqual([f for f, _ in increments[:2]], [ONE_VARIABLES + DAY, ONE_VARIABLES + MONTH])
        stores = [f for _, mnemonic, f, _ in accesses if mnemonic == 'MOVWF']
        self.assertEqual(stores[:2], [DAY_PLUS_ONE, MONTH_PLUS_ONE])
        moves = [i.fields['dst'] for _, i in pairs if i.mnemonic == 'MOVFF']
        self.assertEqual(moves[-1], ONE_VARIABLES + 4, 'the result is the clock\'s weekday')
        # And the incremented day is what the routine adds at the end, just before its own plus one.
        adds = [address for address, mnemonic, f, _ in accesses
                if mnemonic == 'ADDWF' and f == DAY_PLUS_ONE]
        self.assertEqual(len(adds), 1)
        after = next(i for a, i in pairs if a > adds[0])
        self.assertEqual((after.mnemonic, after.fields['k']), ('ADDLW', 1))

    def test_the_weekday_formula_is_sunday_based_over_the_stored_day_plus_one(self):
        """The routine's arithmetic, its constants read out of the image, run over ninety years of dates.

        Every literal the formula below uses is taken from the routine: the month terms from its switch,
        and the year's threshold and modulus, the March test, the 21, the 28, the mask, the two sevens
        and the final plus one from the instructions after it, in the order they occur, which the test
        asserts so a transcription that drifted from the image fails. The two things not read are the
        shape of the steps between the literals and the routine called at `0x2EA70`, taken as a
        remainder; the result over 32873 dates is what bears both out. What this pins is the conclusion,
        that the routine's answer for a stored day `d` is the Sunday based weekday of the date `d + 1`.
        """
        lab.require('one34_code')
        code = lab.load('one34_code')
        pairs = to_return(walk(code, 0x20000, ONE_WEEKDAY, WEEKDAY_LENGTH))
        chain = next(a for a, i in pairs if i.mnemonic == 'XORLW')
        cases = chains.xor_chain(code, 0x20000, chain)
        table = {case.value: case.target for case in cases}
        # Each arm loads a multiple of four, which is the month's term times four; the fall through
        # month shares February's arm, `tests/test_clock.py` pins why.
        fall_through = next(a for a, i in pairs if a > max(c.at for c in cases) and i.mnemonic == 'BNZ')
        term = {}
        for month in range(1, 13):
            target = table.get(month)
            if target is None:
                target = fall_through + 2
            instr = isa.decode(code, target - 0x20000, 0x20000)
            term[month] = instr.fields['k'] if instr.mnemonic == 'MOVLW' else 0
        # The literals after the table, in order.
        tail_start = max(case.target for case in cases)
        literals = [(i.mnemonic, i.fields['k']) for a, i in pairs
                    if a > tail_start and i.mnemonic in ('SUBLW', 'MOVLW', 'ADDLW', 'ANDLW')]
        self.assertEqual([m for m, _ in literals],
                         ['SUBLW', 'MOVLW', 'MOVLW', 'SUBLW', 'MOVLW', 'MOVLW', 'MOVLW', 'MOVLW',
                          'ANDLW', 'MOVLW', 'ADDLW', 'MOVLW'])
        k = [v for _, v in literals]
        century_after, hundred, march, after, before = k[0], k[1], k[3], k[4], k[5]
        epoch, cycle, mask, week, plus, week_again = k[6], k[7], k[8], k[9], k[10], k[11]
        self.assertEqual(k[2], hundred)
        self.assertEqual((century_after, hundred, march, after, before, epoch, cycle, mask, week, plus,
                          week_again), (90, 100, 2, 1, 0, 21, 28, 0xFC, 7, 1, 7))
        checked = 0
        day = datetime.date(2000, 1, 1)
        while day.year < 2090:
            stored, month, year = day.day - 1, day.month, day.year - 2000
            y = year % hundred if year > century_after else year + hundred
            x = ((y - epoch) % cycle + term[month] + (after if month > march else before)) & 0xFF
            got = ((x + ((x & mask) >> 2)) % week + (stored + 1) + plus) % week_again
            self.assertEqual(got, (day.weekday() + 1) % 7, day)
            checked += 1
            day += datetime.timedelta(days=1)
        self.assertEqual(checked, 32873)


#: Stamps whose date is known from outside the record: the date a file was read or fetched, written
#: into its lab filename or manifest by the tool that saved it, and for the calibration pair the date
#: section 125 made them. Each is the date the stamp has to decode to, and each is a day after what the
#: old reading gave.
KNOWN = {
    # Section 58's sync, on 7 August 2026 by its META.md; the old reading said the 6th.
    'one_spare_after_sync': datetime.date(2026, 8, 7),
    # Sections 121 and 125, made on 13 August 2026.
    'calibration_one': datetime.date(2026, 8, 13),
    'calibration_h600': datetime.date(2026, 8, 13),
    # Danny's MyHarmony account synced to the spare, read on 23 August 2026 by its META.md.
    'one_spare_myharmony': datetime.date(2026, 8, 23),
    # Two more calibration compiles, in lab directories named for 23 August 2026.
    'calibration_favchannels': datetime.date(2026, 8, 23),
    'calibration_favzero': datetime.date(2026, 8, 23),
    # Three compiles fetched into files and directories named for 24 August 2026.
    'compiled_protocols': datetime.date(2026, 8, 24),
    'compiled_protocols_2': datetime.date(2026, 8, 24),
    'compiled_protocols_3': datetime.date(2026, 8, 24),
    # A before and after pair in a lab directory named for 25 August 2026.
    'phase7_before': datetime.date(2026, 8, 25),
    'phase7_after': datetime.date(2026, 8, 25),
    # The Harmony 650 as it arrived and was synced, read on 27 September 2026.
    'h650_config_region': datetime.date(2026, 9, 27),
    # The Harmony 700 after Harmony Desktop rewrote it on 2.8, read on 29 September 2026.
    'h700_28_config_region': datetime.date(2026, 9, 29),
    # The 650 after the Panasonic television was synced on 1 October 2026: stored day 0, which the old
    # reading refused, so this is also the case that exposed it, todo-compile-650 1.3.1.
    'h650_panasonic_config': datetime.date(2026, 10, 1),
    # Section 306 to 308's compiles, fetched on 2 October 2026 into directories named for that day.
    'h700_power_hold_compile': datetime.date(2026, 10, 2),
    'h650_power_hold_compile': datetime.date(2026, 10, 2),
    'h700_power_hold_compile_2': datetime.date(2026, 10, 2),
    'h650_power_hold_compile_2': datetime.date(2026, 10, 2),
    'h700_power_hold_compile_3': datetime.date(2026, 10, 2),
    'h700_power_hold_compile_4': datetime.date(2026, 10, 2),
    # Arch 16 (Harmony 350 and Harmony 300), sections 262, 263 and 265: three compiles read off the
    # bench remotes on 5 September 2026, by the files' own times and the commits that landed them. The
    # old reading put all three on the 4th, which section 263 rules out for the second: it is the
    # remote after a device was removed from the configuration read at 12:13 on the 5th, with the
    # questions about that removal committed before it was read.
    'h350_programmed_config': datetime.date(2026, 9, 5),
    'h350_three_devices_config': datetime.date(2026, 9, 5),
    'h300_programmed_config': datetime.date(2026, 9, 5),
}


def raw_fields(name):
    """The seven stored bytes of a container's clock record, read without the reader's help."""
    container = gspm.parse(lab.load(name))
    offsets = gspm.find_clock_records(container.blob)
    assert len(offsets) == 1, (name, offsets)
    return tuple(container.blob[offsets[0] + 2:offsets[0] + 9]), container


class EveryStampWithAKnownDateDecodesToIt(unittest.TestCase):
    """The reader against the outside world, which is the check section 21 never had enough of."""

    def test_every_known_date_is_recovered(self):
        lab.require(*KNOWN)
        for name, date in KNOWN.items():
            with self.subTest(config=name):
                _, container = raw_fields(name)
                self.assertIsNotNone(container.built_at, 'the stamp reads')
                self.assertEqual(container.built_at.date(), date)
        self.assertEqual(len(KNOWN), 23)

    def test_the_old_reading_was_a_day_early_on_every_one_and_blind_on_the_first(self):
        """The negative, so a reversion fails here and not only in the golden vectors.

        Read the stored day as the date and the weekday as days since 1 January 2000, which is what this
        project did: twenty two of the twenty three come out one day before the known date and pass
        that reading's own weekday check, and the last, the 1st of October, does not read at all.
        """
        lab.require(*KNOWN)
        early, unreadable = 0, []
        for name, date in KNOWN.items():
            with self.subTest(config=name):
                (_, _, _, stored, weekday, month, year), _ = raw_fields(name)
                try:
                    old = datetime.date(2000 + year, month + 1, stored)
                except ValueError:
                    unreadable.append(name)
                    continue
                self.assertEqual((old - datetime.date(2000, 1, 1)).days % 7, weekday)
                self.assertEqual(old, date - datetime.timedelta(days=1))
                early += 1
        self.assertEqual((early, unreadable), (22, ['h650_panasonic_config']))

    def test_the_first_of_the_month_is_stored_as_zero_with_its_own_weekday(self):
        lab.require('h650_panasonic_config')
        (_, _, _, stored, weekday, month, year), _ = raw_fields('h650_panasonic_config')
        self.assertEqual((stored, month, year), (0, 9, 26))
        # 1 October 2026 is a Thursday, which is 4 counted from Sunday.
        self.assertEqual(datetime.date(2026, 10, 1).strftime('%A'), 'Thursday')
        self.assertEqual(weekday, 4)

    def test_a_logitech_build_on_a_31st_stores_30_against_a_maximum_of_30(self):
        """`h700_config` was built on 31 July 2021, which the old reading took for the 30th.

        Its base slot 13 day record holds 30 with a maximum of 30, so Logitech's generator writes the
        31st as index 30 and leaves the maximum alone. The old reading had concluded no container was
        built on a 31st and that what the generator does on one was unknown; it was in the corpus all
        along.
        """
        lab.require('h700_config')
        (_, _, _, stored, _, month, year), container = raw_fields('h700_config')
        self.assertEqual((stored, month, year), (30, 6, 21))
        self.assertEqual(container.built_at.date(), datetime.date(2021, 7, 31))
        table = container.state_table()
        off = container.blob_offset_of(table.entries[DAY])
        first = int.from_bytes(container.blob[off:off + 2], 'little')
        most = int.from_bytes(container.blob[off + 2:off + 4], 'little')
        self.assertEqual((first, most), (30, 30))


class TheReaderRefusesWhatTheFirmwareWouldNot(unittest.TestCase):
    """The limits as a reader property, on synthetic records, so they run without a lab."""

    @staticmethod
    def record(stored, weekday, month, year):
        return gspm.CLOCK_COOKIE + bytes([0, 0, 12, stored, weekday, month, year]) + gspm.CLOCK_END

    def test_day_zero_is_the_first(self):
        stamp = gspm.clock_record(self.record(0, 4, 9, 26), 0)
        self.assertEqual(stamp, datetime.datetime(2026, 10, 1, 12, 0, 0))

    def test_the_last_index_of_each_month_reads_and_the_next_does_not(self):
        for month in MONTHS:
            for year in (24, 25):
                with self.subTest(month=month, year=year):
                    last = gspm.clock_last_day_index(month, year)
                    date = datetime.date(2000 + year, month + 1, last + 1)
                    weekday = (date.weekday() + 1) % 7
                    self.assertEqual(gspm.clock_record(self.record(last, weekday, month, year), 0)
                                     .date(), date)
                    # One past the end is refused whatever weekday it claims.
                    for claimed in range(7):
                        self.assertIsNone(
                            gspm.clock_record(self.record(last + 1, claimed, month, year), 0))

    def test_the_firmware_leap_test_is_not_the_calendars_and_the_calendar_wins(self):
        """2100 is `& 3` leap and not a Gregorian one, so 29 February 2100 reads as nothing."""
        self.assertEqual(gspm.clock_last_day_index(FEBRUARY, 100), 28)
        for weekday in range(7):
            self.assertIsNone(gspm.clock_record(self.record(28, weekday, FEBRUARY, 100), 0))


if __name__ == '__main__':
    unittest.main()
