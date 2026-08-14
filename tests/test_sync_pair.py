"""The spare Harmony One either side of a sync, 7 August 2026.

findings.md section 58. Logitech's service compiled a config in 2026 and their software wrote it to
the remote; we read the unit before and after with our own USB path. This is the only pair in the
corpus whose difference was decided in advance rather than reconstructed afterwards, which is what
makes the assertions below checks rather than descriptions.

Two things are pinned here that nothing else in the suite can pin:

* **A config the current generator produced parses.** Everything else in the corpus was built
  between 2007 and 2023. A reader that had quietly grown dependent on a generator quirk of that era
  would pass every other test and fail this one.
* **The build timestamp against a date known independently.** Section 21's field assignment was the
  only one of 336 candidates that fits the corpus, which is a fit and not a confirmation. Here the
  answer was known before the config was read.
"""
import datetime
import unittest

import lab

PAIR = ('one_spare_before_sync', 'one_spare_after_sync')

# What was asked of the service, recorded before the sync ran. The device was picked
# arbitrarily from Logitech's database; the activity is there because their software will not
# proceed without one.
REQUESTED = 'one device, a Denon AV receiver, plus one activity'

# Section 21: the day of week byte is days since this date modulo 7.
CLOCK_EPOCH = datetime.date(2000, 1, 1)

# The build stamps, and for the second one the date is known independently: the
# change was made on 6 August 2026 and synced it on the 7th.
BUILT = {
    'one_spare_before_sync': datetime.datetime(2023, 7, 28, 13, 27, 33),
    'one_spare_after_sync': datetime.datetime(2026, 8, 6, 13, 54, 22),
}

# Slot 0's tree of state variable names, which is where a config says what it is for. The previous
# owner's television against the receiver that replaced it.
NAMES = {
    'one_spare_before_sync': ('TV_Input_12', 'TV_TVInput_3', 'TV_Screen_10', 'TV_Power_2'),
    'one_spare_after_sync': ('Denon_AV_Receiver_Input_23', 'Denon_AV_Receiver_Power_2'),
}


def container(name):
    from harmony import gspm
    return gspm.parse(lab.load(name))


class TestBothHalvesParse(unittest.TestCase):
    """The 2026 config is not a special case for the reader, and the sizes are the measured ones."""

    LENGTHS = {'one_spare_before_sync': 1232237, 'one_spare_after_sync': 1326564}

    def test_every_container_check_passes_on_both(self):
        lab.require(*PAIR)
        for name in PAIR:
            with self.subTest(name):
                self.assertTrue(container(name).all_checks_pass)

    def test_the_lengths_are_the_ones_read_off_the_remote(self):
        lab.require(*PAIR)
        for name, length in self.LENGTHS.items():
            with self.subTest(name):
                self.assertEqual(len(lab.load(name)), length)

    def test_the_config_grew(self):
        """Recorded because the naive expectation was an increment on the old one, and it is not:
        the previous owner's device is gone, so a whole regeneration happened to be larger."""
        lab.require(*PAIR)
        self.assertGreater(self.LENGTHS['one_spare_after_sync'],
                           self.LENGTHS['one_spare_before_sync'])

    def test_both_are_architecture_twelve_and_format_one_six(self):
        lab.require(*PAIR)
        for name in PAIR:
            with self.subTest(name):
                c = container(name)
                self.assertEqual(c.architecture, 12)
                self.assertEqual(c.format_version, '1.6')


class TestTheBuildTimestamp(unittest.TestCase):
    """Section 21, against a date that was known before the config was read."""

    def test_the_stamps_are_the_measured_ones(self):
        lab.require(*PAIR)
        for name, expected in BUILT.items():
            with self.subTest(name):
                self.assertEqual(container(name).built_at, expected)

    def test_the_second_stamp_is_the_day_the_change_was_made(self):
        """
        The independent case section 21 did not have. Every other config in the corpus arrived
        with its stamp and no way to check it; this one was compiled while we watched, on
        6 August 2026, and the reader recovers that date without being told.
        """
        lab.require('one_spare_after_sync')
        self.assertEqual(container('one_spare_after_sync').built_at.date(),
                         datetime.date(2026, 8, 6))

    def test_the_day_of_week_byte_closes_on_both(self):
        """
        The stored byte against the arithmetic, read out of the record rather than taken from the
        reader. `clock_record` applies this check itself and returns None when it fails, so going
        through `built_at` would only assert that the parser ran its own test. The byte is at
        +0x06 in the record, after second, minute, hour and day of month.
        """
        from harmony import gspm
        lab.require(*PAIR)
        for name, expected in BUILT.items():
            with self.subTest(name):
                c = container(name)
                at = c.blob.find(gspm.CLOCK_COOKIE + bytes([expected.second, expected.minute]))
                self.assertNotEqual(at, -1, 'the clock record is not where its cookie says')
                self.assertEqual(c.blob[at + 6], (expected.date() - CLOCK_EPOCH).days % 7)

    def test_the_stamps_order_the_pair_correctly(self):
        """
        Section 21 warns that the stamp contradicts the recorded direction of the Harmony 700 pair
        and refuses to order two configs with it. This pair's direction is not recorded, it is
        observed, and the stamp gets it right. One case does not settle the 700's contradiction,
        so the warning stands; this is the first evidence on the other side of it.
        """
        lab.require(*PAIR)
        self.assertLess(container('one_spare_before_sync').built_at,
                        container('one_spare_after_sync').built_at)


class TestWhatTheChangeDid(unittest.TestCase):
    """The requested change, visible in the config, by name."""

    def test_slot_zero_names_the_device_in_each(self):
        """
        Slot 0 is a tree of state variable names and the device's name is in them. This is the
        assertion that ties the config to what was asked for: the receiver appears and the
        previous owner's television is gone.
        """
        import re

        from harmony import gspm
        lab.require(*PAIR)
        for name, expected in NAMES.items():
            with self.subTest(name):
                c = container(name)
                at = c.blob_offset_of(c.sections[0].address)
                self.assertNotEqual(at, -1)
                frame = c.blob[at:at + c.frame_length]
                found = {m.group().decode('ascii') for m in re.finditer(rb'[ -~]{3,}', frame)}
                self.assertTrue(set(expected) <= found, '%s missing from %s' % (expected, found))
                # And the other config's names are absent, so this is a replacement rather than
                # an addition. Without this half the test would pass on a config holding both.
                other = NAMES['one_spare_after_sync' if name == PAIR[0] else 'one_spare_before_sync']
                self.assertFalse(set(other) & found)

    def test_the_infrared_database_grew_with_the_device(self):
        """125 records against 97, one group either side. A device is codes before it is anything
        else, so this is the count that had to move."""
        lab.require(*PAIR)
        counts = {}
        for name in PAIR:
            groups = container(name).ir_groups()
            self.assertEqual(len(groups), 1)
            counts[name] = sum(len(g) for g in groups)
        self.assertEqual(counts['one_spare_before_sync'], 97)
        self.assertEqual(counts['one_spare_after_sync'], 125)

    def test_the_new_config_decodes_with_nothing_left_over(self):
        """
        The screen programs are the strongest single check available on a config, because the
        instructions are variable length with no length field: a walk that desynchronises fails
        rather than returning something plausible. 588 programs, none undecodable, on a file the
        current generator produced. 384 before section 66 added the programs a mode's pages state,
        and the check is stronger at the larger number rather than merely different.
        """
        lab.require('one_spare_after_sync')
        programs, failed = container('one_spare_after_sync').reachable_screen_programs()
        self.assertEqual(len(failed), 0)
        self.assertEqual(len(programs), 588)

    def test_the_picture_bank_still_walks_to_the_trailer(self):
        """
        Section 55: the bank is found by the walk landing exactly on the trailer, and a start one
        to three bytes out does not walk at all. So finding it in a config nobody had seen before
        is a check on the whole layout rule and not only on the pictures.
        """
        lab.require('one_spare_after_sync')
        bank = container('one_spare_after_sync').picture_bank()
        self.assertIsNotNone(bank)
        self.assertEqual(len(bank), 64)
