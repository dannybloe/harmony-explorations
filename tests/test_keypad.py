"""The Harmony 600's keypad, measured on the device.

findings.md section 48. Every one of the remote's 54 buttons was pressed while the host watched
`PORTB` over USB, which yields the button's matrix **column** and not its scan code: a remote on
USB sits in sync mode and never runs the scan that would produce one. See the section for why that
is a ceiling rather than a setup mistake.

The table below is the measurement. It is pinned here because a hardware number that is not
executable is a note, and because the check it enables is not a restatement of it: the per column
census it implies is compared against the scan codes in a config read off the same unit, which is
an independent artefact.
"""
import unittest

import lab

# One row per physical button, in the order they were pressed, with the column the device
# reported. Columns are 1 to 4, matching the firmware's own column reader, which returns 1 for
# PORTB bit 4 through 4 for bit 7. Names are the labels printed on the remote.
#
# Measured 7 August 2026 on the bench Harmony 600, firmware 0.2, over READ_MISC selector 0x07.
BUTTON_COLUMNS = (
    ('Menu', 2), ('Info', 4), ('Exit', 4), ('Guide', 1), ('up', 2), ('down', 3),
    ('red', 1), ('green', 1), ('yellow', 4), ('blue', 1),
    ('volume up', 2), ('volume down', 3), ('channel up', 3), ('channel down', 4),
    ('pad up', 2), ('pad left', 4), ('OK', 3), ('pad right', 1), ('pad down', 2),
    ('mute', 4), ('back', 3), ('rewind', 2), ('fast forward', 2),
    ('replay', 1), ('skip', 2),
    ('play', 4), ('pause', 2), ('record', 3), ('stop', 4),
    ('1', 4), ('2', 3), ('3', 3), ('4', 1), ('5', 4),
    ('6', 1), ('7', 2), ('8', 1), ('9', 1), ('0', 4),
    ('clear', 3), ('enter', 2),
    ('screen left top', 4), ('screen left bottom', 1),
    ('screen right top', 2), ('screen right bottom', 2),
    ('devices', 1), ('page left', 3), ('page right', 3),
    ('watch TV', 1), ('watch a movie', 1), ('listen to music', 3),
    ('more activities', 4), ('help', 3), ('power', 2),
)

# The matrix the firmware drives, 14 rows by 4 columns. `docs/findings.md` section 13.
MATRIX_ROWS = 14
MATRIX_COLUMNS = 4


def column_of(scan_code):
    """The column a scan code implies, from the scanner's own `row * 4 + column`."""
    return (scan_code - 1) % MATRIX_COLUMNS + 1


class TestTheHarmony600Keypad(unittest.TestCase):
    """findings.md section 48: what pressing every button on a connected remote established."""

    def test_every_button_is_a_matrix_button(self):
        """54 presses, 54 column reports. Not one button failed to pull a column low, so there is
        no button on this remote wired outside the matrix."""
        self.assertEqual(len(BUTTON_COLUMNS), 54)
        for name, column in BUTTON_COLUMNS:
            with self.subTest(button=name):
                self.assertIn(column, range(1, MATRIX_COLUMNS + 1))

    def test_no_column_holds_more_buttons_than_it_has_rows(self):
        """A hard cap rather than a tendency: a column has exactly `MATRIX_ROWS` positions, so a
        census that overflowed one would falsify either the matrix shape or the measurement."""
        for column in range(1, MATRIX_COLUMNS + 1):
            count = sum(1 for _, c in BUTTON_COLUMNS if c == column)
            with self.subTest(column=column):
                self.assertLessEqual(count, MATRIX_ROWS)

    def test_the_census_matches_the_config_read_off_the_same_unit(self):
        """The closure, and it is independent: the buttons were counted by hand off the hardware,
        the scan codes come out of a config, and the two agree column by column.

        The config carries 54 scan codes, contiguous 1 to 54, so of the 56 matrix positions exactly
        55 and 56 are unoccupied. Those two sit in columns 3 and 4, and the measured census is short
        by exactly one in column 3 and one in column 4.
        """
        import collections

        from harmony import gspm

        container = gspm.parse(lab.load('h600_config'))
        codes = sorted({k.scan_code for k in container.keys if k.is_keypad})
        self.assertEqual(codes, list(range(1, 55)))

        predicted = collections.Counter(column_of(code) for code in codes)
        measured = collections.Counter(column for _, column in BUTTON_COLUMNS)
        self.assertEqual(dict(measured), dict(predicted))
        self.assertEqual(dict(sorted(measured.items())), {1: 14, 2: 14, 3: 13, 4: 13})

    def test_the_unoccupied_positions_are_the_last_two(self):
        """Which two positions have no button, stated separately because it is what a writer needs:
        a config that binds 55 or 56 binds a key nobody can press."""
        from harmony import gspm

        container = gspm.parse(lab.load('h600_config'))
        codes = {k.scan_code for k in container.keys if k.is_keypad}
        absent = [n for n in range(1, MATRIX_ROWS * MATRIX_COLUMNS + 1) if n not in codes]
        self.assertEqual(absent, [55, 56])
        self.assertEqual([column_of(n) for n in absent], [3, 4])


# Arch 9's matrix, from the 525's own firmware. `0x06FA4` binary searches one group of eight lines
# and returns 1 to 8; `0x0701C` searches the second group and adds one of these to it. So a scan
# code is `group * 8 + column` with both running 1 to 8, and the eight offsets below are the whole
# of the second dimension. findings.md section 89.
ARCH9_GROUP_OFFSETS = (0x00, 0x08, 0x10, 0x18, 0x20, 0x28, 0x30, 0x38)
ARCH9_COLUMNS = 8
ARCH9_CONTAINERS = ('h525_config', 'h525_config_2', 'h525_safemode_ahcm')

# The event bits of a key record, which a mode record's entries carry too. findings.md section 52.
EVENT_MASK, SCAN_MASK, PRESS = 0xC0, 0x3F, 0x80


def arch9_press_codes(name):
    """Every scan code an arch 9 container binds with a press event.

    Arch 9 has no key table at the marker, so the codes come out of the mode records, whose entries
    have the same four byte layout. That equivalence is section 52's and is what makes this
    extractable at all.
    """
    from harmony import gspm

    container = gspm.parse(lab.load(name))
    blob, out = container.blob, set()
    for record in container.mode_records():
        start = container.blob_offset_of(record.start)
        for k in range(blob[start]):
            at = start + 1 + 4 * k
            if at + 4 <= len(blob) and blob[at] & EVENT_MASK == PRESS:
                out.add(blob[at] & SCAN_MASK)
    return out


class TestTheHarmony525Keypad(unittest.TestCase):
    """findings.md section 89: arch 9's keypad, derived rather than pressed.

    No hardware measurement backs this one, and that is the point of it: the arch 14 census cost an
    evening of pressing 54 buttons, and the arch 9 equivalent falls out of the firmware's own
    lattice meeting the configs' own codes. What it does not give is which physical button a code
    belongs to, because arch 9 senses on a single line.
    """

    def setUp(self):
        lab.require(*ARCH9_CONTAINERS)

    def test_the_group_offsets_are_eight_multiples_of_eight(self):
        """The literals the combiner adds. Eight of them, evenly spaced, which is what makes the
        matrix 8 by 8 rather than some other factorisation of 64."""
        self.assertEqual(len(ARCH9_GROUP_OFFSETS), 8)
        self.assertEqual(ARCH9_GROUP_OFFSETS,
                         tuple(g * ARCH9_COLUMNS for g in range(8)))

    def test_both_user_configs_bind_the_same_fifty_codes(self):
        """Two configs of the same remote, generated years apart by Logitech's own software. A
        keypad is a property of the model, so a difference here would mean the extraction is wrong
        rather than that the remote changed."""
        first, second = arch9_press_codes('h525_config'), arch9_press_codes('h525_config_2')
        self.assertEqual(first, second)
        self.assertEqual(len(first), 50)

    def test_the_safe_mode_container_binds_a_subset(self):
        """A recovery interface binds fewer keys, not different ones. A code outside the user
        configs' set would mean the lattice is bigger than the user configs show."""
        self.assertTrue(arch9_press_codes('h525_safemode_ahcm') <= arch9_press_codes('h525_config'))

    def test_no_bound_code_is_a_multiple_of_eight(self):
        """The closure, and the negative that carries it. The scanner can produce any code from 1
        to 64, so the eight multiples of eight are reachable; no container binds one, which is what
        says that column is unpopulated rather than that the reading is off by one."""
        for name in ARCH9_CONTAINERS:
            with self.subTest(container=name):
                self.assertEqual({c for c in arch9_press_codes(name) if c % ARCH9_COLUMNS == 0},
                                 set())

    def test_the_bound_codes_are_contiguous_in_the_seven_of_eight_lattice(self):
        """Not merely inside the lattice: contiguous from its first position to the highest bound
        one, so the fifty are a prefix and the six above them are the only gap."""
        lattice = [g + c for g in ARCH9_GROUP_OFFSETS for c in range(1, ARCH9_COLUMNS)]
        codes = arch9_press_codes('h525_config')
        self.assertTrue(codes <= set(lattice))
        self.assertEqual(sorted(codes), [n for n in sorted(lattice) if n <= max(codes)])
        self.assertEqual([n for n in sorted(lattice) if n > max(codes)], [58, 59, 60, 61, 62, 63])

    def test_the_predicted_button_count_is_stated(self):
        """Fifty matrix buttons on a Harmony 525. Unconfirmed against the physical remote, and
        recorded here so that counting them later refutes something."""
        self.assertEqual(len(arch9_press_codes('h525_config')), 50)


if __name__ == '__main__':
    unittest.main()
