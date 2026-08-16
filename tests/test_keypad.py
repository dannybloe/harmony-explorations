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

# Counted by hand on the bench Harmony 525 on 9 August 2026, after the derivation predicting it had
# been committed. The only hardware number in this half of the file, and the only one there needs to
# be: arch 9 senses on one line, so pressing keys while the host watches yields nothing at all.
BUTTONS_COUNTED_ON_THE_525 = 50
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

    The arch 14 census cost an evening of pressing 54 buttons; the arch 9 equivalent falls out of
    the firmware's own lattice meeting the configs' own codes, and the one hardware number it needs
    is a count of the buttons. What it still does not give is which physical button a code belongs
    to, because arch 9 senses on a single line.
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

    def test_the_bound_codes_match_the_buttons_counted_on_the_remote(self):
        """The closure against hardware, and it needed no presses.

        Fifty was derived from firmware plus config and committed before anyone looked, and the
        owner then counted fifty buttons on the bench 525 on 9 August 2026. Equality in both
        directions is the content: every matrix button is bound and every bound code has a button,
        where the 600 has two matrix positions with neither.
        """
        self.assertEqual(len(arch9_press_codes('h525_config')), BUTTONS_COUNTED_ON_THE_525)


# Arch 8's scan code encoder, one routine present in all four arch 8 images. findings.md section
# 144. The addresses differ between an application and a bootloader and are identical between the
# two models, which is what the pair of them being one build predicts.
ARCH8_ENCODER_AT = {
    'arch8_code_880': 0x08C26,
    'arch8_code_885': 0x08C26,
    'arch8_boot_880': 0x04D06,
    'arch8_boot_885': 0x04D14,
}

# What the routine is, instruction for instruction: decrement both inputs, multiply the line by
# four, add the sense input back, add one. So `scan = (line - 1) * 4 + input`.
ARCH8_ENCODER = (
    'DECF', 'DECF', 'MOVLW', 'MULWF', 'MOVFF', 'MOVF', 'ADDWF', 'INCF', 'MOVF', 'RETURN',
)

ARCH8_COLUMNS = 4
ARCH8_LINES = 16

# Every other firmware image this project holds, so that the negative is over a population rather
# than over whatever was to hand. Arch 12 (Harmony One), arch 14 (Harmony 600, 650 and 700) and
# arch 9 (Harmony 525).
IMAGES_WITHOUT_THE_ARCH8_ENCODER = (
    'one34_code', 'h600_code_complete', 'h700_code', 'h650_code', 'h525_code',
)

ARCH8_CONTAINERS = ('arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d',
                    'arch8_config_880', 'arch8_config_885')

# Counted off an 885 board by a third party and reported in harmony-decompiler discussion 6 on 15
# August 2026, as four pad letters against sixteen numbered nets. Held here as somebody else's
# measurement, per the standing rule that an upstream finding is a hypothesis: what this file
# checks is that our own configs agree with it, not that it is true because it was published.
ARCH8_885_COLUMN_CENSUS_REPORTED_UPSTREAM = (14, 14, 14, 13)


def multiply_by_four_sites(name):
    """Every `MOVLW 0x04` immediately followed by a `MULWF`, and whether two `DECF` precede it.

    The literal load and the multiply on their own are not distinctive: each arch 8 image holds
    three of them and the other images hold one or two. The decrement pair in front is what selects
    the encoder, and reporting both counts is what makes this a calibration rather than a search
    that found what it was looking for.
    """
    from harmony.pic18 import isa

    code, plain, with_decrements = lab.load(name), [], []
    for at in range(4, len(code) - 4, 2):
        here, then = isa.decode(code, at, 0), isa.decode(code, at + 2, 0)
        if here.mnemonic != 'MOVLW' or here.fields.get('k') != 4 or then.mnemonic != 'MULWF':
            continue
        before = (isa.decode(code, at - 4, 0).mnemonic, isa.decode(code, at - 2, 0).mnemonic)
        (with_decrements if before == ('DECF', 'DECF') else plain).append(at)
    return plain, with_decrements


def arch8_press_codes(name):
    """Every scan code an arch 8 container binds with a press event, out of its key table."""
    from harmony import gspm

    container = gspm.parse(lab.load(name))
    return {key.scan_code for key in container.keys if key.event_type == PRESS}


def column_census(codes):
    """How many of the codes fall in each of the four sense inputs, in input order.

    Under `scan = (line - 1) * 4 + input` the input is `(scan - 1) mod 4` counting from zero, so
    this is the same census the 600 was measured for by pressing all of its buttons, computed from
    a file instead of from a remote.
    """
    return tuple(sum(1 for scan in codes if (scan - 1) % ARCH8_COLUMNS == i)
                 for i in range(ARCH8_COLUMNS))


class TestTheArch8Keypad(unittest.TestCase):
    """findings.md section 144: the Harmony 880 and 885 encode a scan code as a line times four.

    Prompted by an upstream claim and confirmed here against our own images, which is the whole
    point of holding them. What is **not** adopted is the physical geometry that came with it: a
    board survey we have not seen says which net is which key, and this file has nothing that could
    check that.
    """

    def setUp(self):
        lab.require(*ARCH8_ENCODER_AT, *IMAGES_WITHOUT_THE_ARCH8_ENCODER, *ARCH8_CONTAINERS)

    def test_all_four_images_carry_the_same_encoder(self):
        """One routine, four images, two models, an application and a bootloader each."""
        from harmony.pic18 import isa

        lab.require(*ARCH8_ENCODER_AT)
        for name, at in ARCH8_ENCODER_AT.items():
            with self.subTest(image=name):
                code, decoded, offset = lab.load(name), [], at
                for _ in ARCH8_ENCODER:
                    instruction = isa.decode(code, offset, 0)
                    decoded.append(instruction.mnemonic)
                    offset += 2 * instruction.words
                self.assertEqual(tuple(decoded), ARCH8_ENCODER)
                self.assertEqual(isa.decode(code, at + 4, 0).fields['k'], ARCH8_COLUMNS)

    def test_the_two_images_of_a_model_pair_differ_only_in_where_the_variables_live(self):
        """Byte identical bar the operand of each instruction that names one of the two variables.

        An application holds them at `0x2b2` and `0x2b3` and a bootloader at `0x200` and `0x201`,
        so the raw bytes differ while the arithmetic does not. Comparing the decoded operands
        against each other is what says the difference is an offset and not a different routine.
        """
        from harmony.pic18 import isa

        shapes = {}
        for name, at in ARCH8_ENCODER_AT.items():
            code, fields, offset = lab.load(name), [], at
            for _ in ARCH8_ENCODER:
                instruction = isa.decode(code, offset, 0)
                # The low byte of a file operand is what moves; everything else has to match.
                fields.append((instruction.mnemonic, instruction.words,
                               instruction.fields.get('f', 0) & 0x01))
                offset += 2 * instruction.words
            shapes[name] = tuple(fields)
        self.assertEqual(len(set(shapes.values())), 1, shapes)

    def test_no_other_image_carries_it(self):
        """The negative, with the score for the wrong answer beside it.

        A bare multiply by four is common: every image here has one or two that are not this
        routine. With the decrement pair in front it appears exactly once in each of the four arch
        8 images and in none of the five others, so the discriminator scores 4 of 4 and 0 of 5
        against a background of 13 near misses it correctly refuses.
        """
        for name in ARCH8_ENCODER_AT:
            with self.subTest(image=name):
                plain, found = multiply_by_four_sites(name)
                self.assertEqual(len(found), 1, f'{name}: {found}')
                self.assertEqual(len(plain), 2, 'the near misses are what make this a calibration')
        for name in IMAGES_WITHOUT_THE_ARCH8_ENCODER:
            with self.subTest(image=name):
                plain, found = multiply_by_four_sites(name)
                self.assertEqual(found, [], f'{name} carries the arch 8 encoder')
                # Two in the Harmony One's image and one in each of the others. Stated exactly
                # rather than as a floor, so that a reader losing sight of a site shows up here.
                self.assertEqual(len(plain), 2 if name == 'one34_code' else 1)

    def test_every_bound_code_fits_a_four_wide_lattice(self):
        """The closure from the other end: the configs, which share no code with the firmware.

        A scan code is a line times four plus an input, so with sixteen lines the range is 1 to 64.
        Every code every arch 8 container binds is inside it, and all four inputs are occupied,
        which is what says the four is a real factor rather than an artefact of the arithmetic.
        """
        for name in ARCH8_CONTAINERS:
            with self.subTest(container=name):
                codes = arch8_press_codes(name)
                self.assertTrue(codes <= set(range(1, ARCH8_COLUMNS * ARCH8_LINES + 1)))
                self.assertTrue(all(census > 0 for census in column_census(codes)))

    def test_the_last_position_is_bound_by_nothing(self):
        """Every container stops at 63, so line 16 input 4 exists and carries no button.

        The same shape as the 600's two unoccupied positions and the 525's unpopulated column, and
        it is the reason the range is quoted as 1 to 63 rather than 1 to 64: the ceiling is a
        property of these boards and the arithmetic reaches one higher.
        """
        for name in ARCH8_CONTAINERS:
            with self.subTest(container=name):
                self.assertEqual(max(arch8_press_codes(name)), ARCH8_COLUMNS * ARCH8_LINES - 1)

    def test_the_885_census_agrees_with_the_board_somebody_else_counted(self):
        """Two routes, no shared code, and neither of them ours alone.

        The census here is computed from an 885 config's key table through the firmware's own
        arithmetic. The one it is compared against was counted off an 885 circuit board by somebody
        who has never seen this repository. They agree number for number, which is the strongest
        thing said about arch 8 here and the reason the encoder is believed rather than merely
        decoded.

        The 880 is deliberately asserted too and deliberately differs: 53 codes against 55, which
        is the two colour keys the 885 has and the 880 does not.
        """
        self.assertEqual(column_census(arch8_press_codes('arch8_config_885')),
                         ARCH8_885_COLUMN_CENSUS_REPORTED_UPSTREAM)
        self.assertEqual(sum(ARCH8_885_COLUMN_CENSUS_REPORTED_UPSTREAM), 55)
        self.assertEqual(column_census(arch8_press_codes('arch8_config_880')), (14, 14, 13, 12))
        self.assertEqual(len(arch8_press_codes('arch8_config_880')), 53)


if __name__ == '__main__':
    unittest.main()
