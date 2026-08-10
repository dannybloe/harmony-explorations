"""
The display light subsystem behind `0x3F` band `0xC0` selector 17. `docs/findings.md` section 103.

Also the three things reading it turned up: the instruction fetch's interception of `0x1F` band
`0xFC` on all four architectures, section 104, the charger input that closes section 44's battery
conjecture, section 105, and the I2C device whose enable is `LATC` bit 5 and whose channels are the
band's thirteen properties, section 106.

Addresses are recorded per image because finding them again is a search, the same reason
`test_interpreter.py` gives. Everything is asserted against decoded instructions rather than
against a hand written listing, so a wrong opcode table in `isa.py` fails these too.

The one assertion here that does not depend on an image is the ladder derivation: the 28 byte table
is checked against `CVREF` computed from the datasheet formula, not against a copy of itself, since
a table asserted against its own bytes only proves the file has not changed.
"""
from fractions import Fraction
import unittest

import lab
from harmony.pic18 import isa

ONE_BASE = 0x20000

# The application image, and the safe mode image on internal page 0xFE. Two independently built
# programs carrying the same routine, which is what makes this more than one sample.
BUILDS = {
    'one34_code': {
        'base': ONE_BASE,
        'setter': 0x23BA0,      # level -> CVRCON, and LATA bit 5
        'ladder': 0x2EA54,      # the 28 byte table it indexes
    },
    'one_internal_fe': {
        'base': 0x0000,
        'setter': 0x04F16,
        'ladder': 0x0C0E0,
    },
}

# The state machine and the routines around it, on the application image only.
STATE_MACHINE = 0x23952
STATE_CHAIN = 0x23A52           # the first XORLW of the arms for states 5 down to 0
BAND_CHAIN = 0x23980            # the first XORLW of state 6's band to state map
PREDICATE = 0x23CA6             # "is the cached level nonzero"
FADE = 0x23C02                  # walk one index at a time
GUARD = 0x23262                 # base slot 15's group guard, section 44
LEVEL_READER = 0x249A0          # group 9 at 4 * band, straight out over I2C
PROPERTY_READER = 0x2492E       # band 0xC0 selectors 0 to 12
BAND_READER = 0x234D4           # channel 1 -> a band 0 to 3 through group 4
CHARGER = 0x24042               # PORTB bit 1 and a software flag

# `CVRCON` on the PIC18F67J50 family, from Microchip's own header. Not shadowed, which is why the
# `ADSHR` window around the store means nothing.
CVRCON = 0x0F77
LATA = 0x0F89
PORTB = 0x0F81

# The highest level the setter accepts, which is also the number of distinct CVREF voltages.
LEVEL_CEILING = 0x1B
LADDER_BYTES = LEVEL_CEILING + 1

# Base slot 15 group offsets, as the guard takes them: a byte offset into a `u24` pointer array.
GROUP_STRIDE = 3
FADE_DELAY_GROUP = 0
LEVEL_GROUP = 1
THRESHOLD_GROUP = 4
DEVICE_LEVEL_GROUP = 9

# What the firmware falls back on when a group's length is wrong, section 44's mechanism.
DEFAULT_LEVELS = (9, 16, 24, 27)
DEFAULT_FADE_DELAY = 0x32
DEFAULT_DEVICE_LEVEL = 0x0040

# The fetch's interception of `0x1F` band `0xFC`, section 104. Value is the address of the `MOVLW
# 0x1F` that starts the two comparisons.
INTERCEPTS = {
    'one34_code': (ONE_BASE, 0x24DE4),
    'h600_code_complete': (0x9000, 0x0E752),
    'h700_code': (0x9000, 0x0EB38),
    'h525_code': (0x0000, 0x01BB4),
}
EVENT_OPCODE = 0x1F
EVENT_BAND = 0xFC

# The battery gauge's calibration words, section 105. Address -> the routine that fetches it.
CALIBRATION = {0x01F580: 0x231B0, 0x01F582: 0x231CE, 0x01F5C0: 0x231EC, 0x01F5C2: 0x2320A}
# This part has 128 KiB of on-chip program memory, so everything below this is internal and the
# application at 0x020000 is not. Page 0xFF of the internal window is the upper 64 KiB of it.
INTERNAL_FLASH_END = 0x020000
INTERNAL_PAGE_FF_BASE = 0x010000
# The scale's integer part, shared by both units; the fractional word is the per unit trim.
MILLIVOLT_SCALE_INTEGER = 4
# The arch 12 curve's ends, from base slot 15 groups 5 and 6.
CURVE_LOW = 3000
CURVE_HIGH_ON_CHARGE = 4170
# The literal the firmware compares the result against, in the same units.
LOW_BATTERY_MILLIVOLTS = 3400

# Section 106: the I2C device band 0xC0 selectors 0 to 16 talk to.
SSP1CON2 = 0x0FC5
SSP1CON1 = 0x0FC6
SSP1BUF = 0x0FC9
LATC = 0x0F8B
DEVICE_WRITE_ADDRESS = 0xC0
DEVICE_ADDRESS = 0x60
ON_OFF_SEQUENCE = 0x23DF0
CHANNEL_SETTER = 0x2D254        # channel in gprF25F, value in gprF260, 40 call sites
POWER_DOWN_HIGH = 0x23E0C       # channels 12 down to 8, all zero
POWER_DOWN_LOW = 0x23EA2        # channels 0 up to 7, all zero
BAND_3F_C0_CHANNELS = 13
# Where the dispatcher puts bits 1 to 3 of the operand. The handler for selectors 0 to 12 reads this
# one and not the bit 0 register at 0xEBC, which section 103 had the wrong way round.
OPERAND_MID_FIELD = 0xBB


def page_ff(unit):
    """One Harmony One's internal page `0xFF`, by filename rather than through `lab.IMAGES`.

    That page is deliberately absent from the registry, because it holds the unit's identity block at
    `+0xF400` and a test that loaded it could print those bytes in a failure message. The two words
    this file needs are at `+0xF580` and `+0xF582`, nowhere near it, and nothing here prints a raw
    byte: only a scale computed from them and a count derived from that. Same reasoning as
    `packages/usb/bin/idle-flags-after-hang.ts`, which reaches the page the same way.
    """
    filename = 'one-3.4-internal-page-ff-%s.bin' % unit
    path = lab._find(filename)          # noqa: SLF001, the registry deliberately has no entry
    if not path:
        raise unittest.SkipTest('no %s found' % filename)
    with open(path, 'rb') as fh:
        return fh.read()


def instructions(name, base, start, count):
    """`count` decoded instructions from `start`, as (address, Instr) pairs."""
    code = lab.load(name)
    out = []
    offset = start - base
    for _ in range(count):
        instr = isa.decode(code, offset, base)
        out.append((base + offset, instr))
        offset += 2 * instr.words
    return out


def absolute(instr):
    """The full data address an access names, or None when it is banked rather than access bank."""
    f = instr.fields.get('f')
    if f is None:
        return None
    if instr.fields.get('a') == 0 and f >= 0x60:
        return 0xF00 | f
    return None


def cvref(byte):
    """CVREF as a fraction of AVDD for a CVRCON value, from the datasheet, CVRSS clear.

    Low range, `CVRR` set: `CVR / 24`. High range, `CVRR` clear: `1/4 + CVR / 32`.
    """
    return Fraction(byte & 0xF, 24) if (byte >> 5) & 1 else Fraction(1, 4) + Fraction(byte & 0xF, 32)


def derived_ladder():
    """The 27 distinct CVREF settings in ascending order, high range preferred on a tie.

    `CVR` runs 1 to 15 in each range, so thirty candidates, three of which collide. Nothing in this
    function knows what the firmware's table looks like.
    """
    seen = {}
    for cvrr in (1, 0):                     # low range first, so a tie keeps the high range
        for cvr in range(1, 16):
            byte = 0xC0 | (cvrr << 5) | cvr
            seen[cvref(byte)] = byte         # a later write wins, and the high range is later
    return [seen[value] for value in sorted(seen)]


class LadderTest(unittest.TestCase):
    def test_the_ladder_is_the_distinct_cvref_settings_and_not_a_tuned_list(self):
        derived = derived_ladder()
        self.assertEqual(len(derived), LEVEL_CEILING)
        # Ascending in voltage, which is what makes an index a brightness rather than a code.
        voltages = [cvref(b) for b in derived]
        self.assertEqual(voltages, sorted(voltages))
        self.assertEqual(len(set(voltages)), len(voltages))
        for name, where in BUILDS.items():
            with self.subTest(name):
                code = lab.load(name)
                offset = where['ladder'] - where['base']
                table = list(code[offset:offset + LADDER_BYTES])
                self.assertEqual(table[0], 0x00, 'entry 0 is CVREN clear, the light off')
                self.assertEqual(table[1:], derived)

    def test_three_voltages_have_two_encodings_and_the_table_keeps_one_of_each(self):
        # The dedup is why the table is 28 bytes and not 31, and it is what the ceiling counts.
        by_value = {}
        for cvrr in (0, 1):
            for cvr in range(1, 16):
                byte = 0xC0 | (cvrr << 5) | cvr
                by_value.setdefault(cvref(byte), []).append(byte)
        collisions = {v: bs for v, bs in by_value.items() if len(bs) > 1}
        self.assertEqual(sorted(float(v) for v in collisions), [0.375, 0.5, 0.625])
        ladder = derived_ladder()
        for value, bytes_ in collisions.items():
            present = [b for b in bytes_ if b in ladder]
            self.assertEqual(len(present), 1, 'exactly one encoding survives per voltage')
            self.assertEqual((present[0] >> 5) & 1, 0, 'and it is the high range one')


class SetterTest(unittest.TestCase):
    def test_both_builds_bound_the_level_at_the_ladder_length(self):
        # `SUBLW 0x1b` then `BNC`, so anything above 27 returns without touching the peripheral.
        for name, where in BUILDS.items():
            with self.subTest(name):
                got = instructions(name, where['base'], where['setter'], 4)
                self.assertEqual([i.mnemonic for _, i in got][:4],
                                 ['MOVLB', 'MOVF', 'SUBLW', 'BNC'])
                self.assertEqual(got[2][1].fields['k'], LEVEL_CEILING)

    def test_both_builds_write_the_table_byte_to_cvrcon(self):
        for name, where in BUILDS.items():
            with self.subTest(name):
                found = [a for a, i in instructions(name, where['base'], where['setter'], 40)
                         if i.mnemonic == 'MOVWF' and absolute(i) == CVRCON]
                self.assertEqual(len(found), 1, 'one store, to the comparator reference')

    def test_both_builds_follow_lata_bit_5_on_whether_the_level_is_zero(self):
        for name, where in BUILDS.items():
            with self.subTest(name):
                bits = [(i.mnemonic, i.fields['b'])
                        for _, i in instructions(name, where['base'], where['setter'], 44)
                        if i.category == isa.BIT and absolute(i) == LATA]
                self.assertEqual(bits, [('BSF', 5), ('BCF', 5)])

    def test_the_adshr_bracket_around_the_store_is_a_compiler_idiom(self):
        # `0xF77` carries no shadow register, so setting ADSHR there changes nothing. The proof that
        # the bracket is not evidence is that the same pair appears with no instruction inside it.
        self.assertNotIn(CVRCON, isa.SFR_SHADOW)
        for start in (0x23440, 0x232AE):
            with self.subTest(hex(start)):
                got = instructions('one34_code', ONE_BASE, start, 2)
                self.assertEqual([i.mnemonic for _, i in got], ['BSF', 'BCF'])
                for _, instr in got:
                    self.assertEqual(absolute(instr), isa.ADSHR_REGISTER)
                    self.assertEqual(instr.fields['b'], isa.ADSHR_BIT)


class StateMachineTest(unittest.TestCase):
    def test_it_is_eight_states_over_one_variable(self):
        # States 7 and 6 are tested up front against literals; 5 down to 0 are an XORLW chain, whose
        # literals are differences rather than case values, so it is decoded rather than read.
        got = instructions('one34_code', ONE_BASE, STATE_MACHINE, 8)
        self.assertEqual(got[0][1].fields['k'], 7)
        self.assertEqual([i.mnemonic for _, i in got][:4], ['MOVLW', 'MOVLB', 'SUBWF', 'BNZ'])
        state = got[2][1].fields['f']
        second = instructions('one34_code', ONE_BASE, 0x23968, 4)
        self.assertEqual(second[0][1].fields['k'], 6)
        self.assertEqual(second[2][1].fields['f'], state, 'the same variable both times')

        cases = self._chain(STATE_CHAIN)
        self.assertEqual(sorted(cases), [0, 1, 2, 3, 4, 5])
        # Eight arms in all, which is what "eight states" means.
        self.assertEqual(len(cases) + 2, 8)

    def test_the_bands_map_onto_the_four_level_states(self):
        # State 6 reads the band and enters state 2 + band, so a four level input picks one of four
        # levels. Asserted through the chain rather than from the branch targets, because an XORLW
        # chain's literals are differences and reading them directly gives the wrong cases.
        cases = self._chain(BAND_CHAIN)
        self.assertEqual(sorted(cases), [0, 1, 2, 3])
        # And the four targets are four distinct arms, which is what makes them four states.
        self.assertEqual(len(set(self._chain(BAND_CHAIN, targets=True))), 4)

    def _chain(self, start, targets=False):
        from harmony.pic18 import chains
        code = lab.load('one34_code')
        decoded = chains.xor_chain(code, ONE_BASE, start)
        return [case.target if targets else case.value for case in decoded]

    def test_the_predicate_is_the_cached_level_being_nonzero(self):
        got = instructions('one34_code', ONE_BASE, PREDICATE, 5)
        self.assertEqual([i.mnemonic for _, i in got],
                         ['MOVLB', 'MOVF', 'BZ', 'RETLW', 'RETLW'])
        self.assertEqual(got[3][1].fields['k'], 1)
        self.assertEqual(got[4][1].fields['k'], 0)

    def test_the_firmware_defaults_are_the_ladder_ends(self):
        # 9, 16, 24, 27 written as literals when group 1's length is wrong, and 27 is the ceiling.
        literals = [i.fields['k'] for _, i in instructions('one34_code', ONE_BASE, 0x23A36, 12)
                    if i.mnemonic == 'MOVLW']
        self.assertEqual(tuple(literals), DEFAULT_LEVELS)
        self.assertEqual(literals[-1], LEVEL_CEILING)
        self.assertEqual(sorted(literals), literals, 'ascending, so a fuller band is brighter')


class ParameterBlockTest(unittest.TestCase):
    """Which base slot 15 groups this subsystem reads, from the guard's arguments.

    The guard's first argument is a byte offset into a `u24` pointer array, so a group index is that
    offset divided by three. Reading it as an index directly is what makes group 9 look like group
    27, which is how the twelve spare bytes stayed unexplained.
    """

    def _guard_call(self, start, span=16):
        """The (group, expected length) a call site sets up, reading forwards to the call.

        `gprF07` is the byte offset and `gprF08` the expected length. A `CLRF` counts: the fade's
        call site sets the offset to zero that way, and a helper that only understood `MOVLW`
        followed by `MOVWF` reported no offset at all rather than group 0.
        """
        found = {}
        last = None
        for _, instr in instructions('one34_code', ONE_BASE, start, span):
            if instr.mnemonic == 'MOVLW':
                last = instr.fields['k']
            elif instr.mnemonic in ('MOVWF', 'CLRF') and instr.fields.get('f') in (0x07, 0x08):
                found[instr.fields['f']] = 0 if instr.mnemonic == 'CLRF' else last
        self.assertEqual(sorted(found), [0x07, 0x08], 'both arguments set before the call')
        offset, length = found[0x07], found[0x08]
        self.assertEqual(offset % GROUP_STRIDE, 0, 'an offset into a three byte array')
        return offset // GROUP_STRIDE, length

    def test_the_guard_reads_base_slot_15_and_demands_its_entry_count(self):
        # Raw slot 0x10 is base slot 15 on arch 12, and 11 is the count section 44 records.
        literals = [i.fields['k'] for _, i in instructions('one34_code', ONE_BASE, GUARD, 20)
                    if i.mnemonic == 'MOVLW']
        self.assertIn(0x10, literals)
        self.assertIn(0x0B, literals)

    def test_the_four_groups_the_subsystem_reads(self):
        self.assertEqual(self._guard_call(0x239B8), (LEVEL_GROUP, 6))
        self.assertEqual(self._guard_call(0x23C0C), (FADE_DELAY_GROUP, 1))
        self.assertEqual(self._guard_call(BAND_READER + 0x0A, 12), (THRESHOLD_GROUP, 6))
        self.assertEqual(self._guard_call(LEVEL_READER), (DEVICE_LEVEL_GROUP, 6))
        self.assertEqual(self._guard_call(PROPERTY_READER), (DEVICE_LEVEL_GROUP, 6))

    def test_the_fade_delay_and_device_level_defaults(self):
        fade = [i.fields['k'] for _, i in instructions('one34_code', ONE_BASE, 0x23C3A, 2)
                if i.mnemonic == 'MOVLW']
        self.assertEqual(fade, [DEFAULT_FADE_DELAY])
        level = [i.fields['k'] for _, i in instructions('one34_code', ONE_BASE, 0x249F8, 3)
                 if i.mnemonic == 'MOVLW']
        self.assertEqual(level, [DEFAULT_DEVICE_LEVEL & 0xFF])

    def test_the_level_reader_indexes_at_four_bytes_a_band(self):
        # `4 * band` bytes, so band 3 reads bytes 12 to 15 of a group whose header declares six
        # `u16` entries. That overrun is the first four of the twelve spare bytes, section 103.
        # Both halves go out over I2C as device register values; section 103 called them timeouts and
        # section 106 corrected that, because nothing counts them down.
        got = instructions('one34_code', ONE_BASE, LEVEL_READER, 18)
        muls = [i for _, i in got if i.mnemonic == 'MULWF']
        self.assertEqual(len(muls), 1, 'one multiply, and its multiplicand is the stride')
        before = [i.fields['k'] for a, i in got if i.mnemonic == 'MOVLW' and a < 0x249C0]
        self.assertEqual(before[-1], 4, 'four bytes a band, which is two u16 values')

    def test_the_property_reader_indexes_past_the_declared_entries(self):
        # `0x10 + 4 * bit0 + (selector >> 2)`, a byte rather than a `u16`, so the eight bytes above
        # band 3's pair. The `0x10` is the whole point: twelve `u16` entries end at byte 12.
        literals = [i.fields['k'] for _, i in instructions('one34_code', ONE_BASE, 0x2494A, 12)
                    if i.mnemonic in ('MOVLW', 'ADDLW', 'ANDLW')]
        self.assertIn(0x10, literals)
        self.assertIn(4, literals)
        self.assertIn(0x3F, literals)


class EventInterceptTest(unittest.TestCase):
    """Section 104: the fetch tests for `0x1F` band `0xFC` before the dispatcher runs."""

    def test_all_four_architectures_intercept_it_in_the_fetch(self):
        lab.require(*INTERCEPTS)
        for name, (base, start) in INTERCEPTS.items():
            with self.subTest(name):
                got = instructions(name, base, start, 6)
                shape = [i.mnemonic for _, i in got]
                self.assertEqual(shape, ['MOVLW', 'SUBWF', 'BNZ', 'MOVLW', 'SUBWF', 'BNZ'])
                self.assertEqual(got[0][1].fields['k'], EVENT_OPCODE)
                self.assertEqual(got[3][1].fields['k'], EVENT_BAND)
                # Both comparisons fail into the same place, which is the normal dispatch path.
                self.assertEqual(got[2][1].fields['target'], got[5][1].fields['target'])

    def test_the_announcer_pushes_that_instruction(self):
        # `0x24BF0` pushes the code, then `0xFC`, then `0x1F`, which the fetch pops as operand low,
        # operand high, opcode. So a firmware event is an action list instruction.
        literals = [i.fields['k'] for _, i in instructions('one34_code', ONE_BASE, 0x24BF0, 12)
                    if i.mnemonic == 'MOVLW']
        self.assertEqual(literals, [EVENT_BAND, EVENT_OPCODE])


class ChargerTest(unittest.TestCase):
    """Section 105: `PORTB` bit 1 chooses the curve, ratchets the gauge, and is therefore charging."""

    def test_the_selector_reads_portb_bit_1_and_a_software_flag(self):
        got = instructions('one34_code', ONE_BASE, CHARGER, 9)
        self.assertEqual(absolute(got[0][1]), PORTB)
        self.assertEqual(got[1][1].fields['k'], 0x02, 'bit 1, by mask rather than by BTFSS')
        self.assertEqual([i.mnemonic for _, i in got[-2:]], ['RETLW', 'RETLW'])
        self.assertEqual({i.fields['k'] for _, i in got[-2:]}, {0, 1})

    def test_the_curve_pair_is_chosen_by_it(self):
        # Group 5 at offset 0x0F and group 6 at 0x12, the two arms of one branch on the answer, both
        # demanding sixteen entries. Group 6's demand was missing from `PARAMETER_GROUP_COUNTS`
        # because only one of the two arms had been read.
        literals = [i.fields['k'] for _, i in instructions('one34_code', ONE_BASE, 0x238A4, 12)
                    if i.mnemonic == 'MOVLW']
        self.assertEqual(literals, [0x10, 0x12, 0x10, 0x0F])
        self.assertEqual({literals[1] // GROUP_STRIDE, literals[3] // GROUP_STRIDE}, {5, 6})

    def test_the_gauge_ratchets_and_the_pin_picks_the_direction(self):
        # One branch keeps the higher of old and new, the other the lower, and the test is the same
        # bit. A gauge that only climbs on charge and only falls off it is what the pin has to be.
        got = instructions('one34_code', ONE_BASE, 0x2391A, 16)
        self.assertEqual(got[0][1].mnemonic, 'BTFSC')
        self.assertEqual(absolute(got[0][1]), PORTB)
        self.assertEqual(got[0][1].fields['b'], 1)
        subtractions = [i.mnemonic for _, i in got if i.mnemonic in ('SUBWF', 'SUBFWB')]
        self.assertEqual(subtractions, ['SUBWF', 'SUBFWB'], 'opposite senses, one per branch')

    def test_the_scaling_reads_a_calibration_word_out_of_flash(self):
        # Four fixed addresses, each a `u16` fetched through the same helper, and the caller treats
        # 0xFFFF as absent. They are in **internal** program memory, page 0xFF, not in the external
        # part: this MCU has 128 KiB on chip at 0x000000 to 0x01FFFF and the application sits above
        # it at 0x020000, so a TBLRD here never leaves the chip. A `READ_FLASH` over USB at the same
        # number reads the external part and answers 0xFF, which is how this got written up once as
        # unread.
        for address, start in CALIBRATION.items():
            with self.subTest(hex(address)):
                literals = [i.fields['k'] for _, i in instructions('one34_code', ONE_BASE, start, 7)
                            if i.mnemonic == 'MOVLW']
                self.assertEqual(literals,
                                 [address & 0xFF, (address >> 8) & 0xFF, (address >> 16) & 0xFF])
                self.assertLess(address, INTERNAL_FLASH_END, 'on chip, so page 0xFF holds it')
        erased = [i.fields['k'] for _, i in instructions('one34_code', ONE_BASE, 0x23778, 6)
                  if i.mnemonic == 'MOVLW']
        self.assertEqual(erased, [0xFF, 0xFF], 'an erased word means uncalibrated')

    def test_the_scale_is_millivolts_a_count_and_the_curve_needs_it_to_be(self):
        """The closure: the two words give a scale that fits the curve and nothing else would.

        `millivolts = mean * word(0x01F580) + ((mean * word(0x01F582)) >> 16)`, the mean being eight
        samples of channel 0 shifted right three. Both words come off the units' own page 0xFF.
        """
        page = page_ff('programmed')
        spare = page_ff('unprogrammed')

        def word(image, address):
            off = address - INTERNAL_PAGE_FF_BASE
            return int.from_bytes(image[off:off + 2], 'little')

        # The integer part is shared and the fine trim is not, which is what makes it calibration.
        self.assertEqual(word(page, 0x01F580), word(spare, 0x01F580))
        self.assertEqual(word(page, 0x01F580), MILLIVOLT_SCALE_INTEGER)
        self.assertNotEqual(word(page, 0x01F582), word(spare, 0x01F582))

        for image, name in ((page, 'programmed'), (spare, 'spare')):
            with self.subTest(name):
                scale = word(image, 0x01F580) + word(image, 0x01F582) / 65536
                # The trim is small: the two units are 4.281 and 4.286 mV a count, a 0.1% spread.
                self.assertAlmostEqual(scale, 4.284, places=2)
                # The curve's ends have to land inside the converter's range, with room to spare.
                for millivolts, ceiling in ((CURVE_LOW, 1023), (CURVE_HIGH_ON_CHARGE, 1023)):
                    counts = millivolts / scale
                    self.assertLess(counts, ceiling, f'{millivolts} mV needs {counts:.0f} counts')
                    self.assertGreater(counts, ceiling / 2, 'and uses most of the range')
                # A scale of 4 puts a full cell off the top of a ten bit converter; 8 puts an empty
                # one in the bottom quarter. Neither is what the curve was written against.
                self.assertGreater(CURVE_HIGH_ON_CHARGE / 4, 1023)
                self.assertLess(CURVE_LOW / 8, 1023 / 2)

    def test_the_firmware_compares_the_result_against_a_literal_in_the_same_units(self):
        # 3400 at `0x2385C`, a low battery warning for one lithium cell, inside the config's own
        # curve. Two numbers in the same units, one from the config and one from the code.
        got = instructions('one34_code', ONE_BASE, 0x23862, 4)
        literals = [i.fields['k'] for _, i in got if i.mnemonic == 'MOVLW']
        self.assertEqual((literals[1] << 8) | literals[0], LOW_BATTERY_MILLIVOLTS)
        self.assertLess(CURVE_LOW, LOW_BATTERY_MILLIVOLTS)
        self.assertLess(LOW_BATTERY_MILLIVOLTS, CURVE_HIGH_ON_CHARGE)


class DeviceTest(unittest.TestCase):
    """Section 106: the pin enables an I2C device, and the thirteen properties are its channels."""

    def test_the_bus_is_the_hardware_i2c_master(self):
        # `SSP1CON2` exists only in I2C mode, so its bits name the transaction: SEN, RSEN, PEN and
        # the acknowledge. Asserted through the SFR map, so a wrong `--part` fails this.
        # start, repeated start, stop. `0x2DCCC` clears an interrupt flag first; the other two open
        # with the bit set, so each is found rather than indexed at a fixed offset.
        wanted = {0x2DCCC: 0, 0x2DCDA: 1, 0x2DCE6: 2}
        for start, bit in wanted.items():
            with self.subTest(hex(start)):
                sets = [i for _, i in instructions('one34_code', ONE_BASE, start, 3)
                        if i.mnemonic == 'BSF' and absolute(i) == SSP1CON2]
                self.assertEqual(len(sets), 1)
                self.assertEqual(sets[0].fields['b'], bit)
        # And the byte goes through SSP1BUF, with the write collision flag checked afterwards.
        got = instructions('one34_code', ONE_BASE, 0x2DD16, 3)
        self.assertEqual(got[0][1].fields.get('src'), 0x30E)
        self.assertEqual(got[0][1].fields.get('dst'), SSP1BUF)
        self.assertEqual(absolute(got[1][1]), SSP1CON1)
        self.assertEqual(got[1][1].fields['b'], 7)

    def test_only_arch_12_runs_the_peripheral_in_i2c_mode(self):
        """The reason band `0xC0` is arch 12 only: arch 14 needs the same peripheral for SPI.

        Counted rather than argued. `SSP1CON2` has no meaning outside I2C master mode, so an image
        that never writes it is not running an I2C master.
        """
        lab.require('one34_code', 'h600_code_complete', 'h700_code')
        counts = {}
        for name, base in (('one34_code', ONE_BASE), ('h600_code_complete', 0x9000),
                           ('h700_code', 0x9000)):
            code = lab.load(name)
            seen = {SSP1CON2: 0, SSP1BUF: 0}
            offset = 0
            while offset < len(code) - 1:
                try:
                    instr = isa.decode(code, offset, base)
                except Exception:                       # noqa: BLE001, a data byte is not an error
                    offset += 2
                    continue
                address = absolute(instr)
                if address in seen:
                    seen[address] += 1
                offset += 2 * instr.words
            counts[name] = seen
        self.assertGreater(counts['one34_code'][SSP1CON2], 0, 'arch 12 is an I2C master')
        for name in ('h600_code_complete', 'h700_code'):
            self.assertEqual(counts[name][SSP1CON2], 0, f'{name} never writes an I2C only register')
            self.assertGreater(counts[name][SSP1BUF], 0, f'{name} still uses the peripheral')

    def test_the_address_byte_is_a_write_to_0x60(self):
        # `0xC0` to write and `0xC1` to read, so the seven bit address is 0x60.
        write = [i.fields['k'] for _, i in instructions('one34_code', ONE_BASE, 0x2D30C, 6)
                 if i.mnemonic == 'MOVLW']
        self.assertEqual(write, [DEVICE_WRITE_ADDRESS])
        read = [i.fields['k'] for _, i in instructions('one34_code', ONE_BASE, 0x2D348, 4)
                if i.mnemonic == 'MOVLW']
        self.assertEqual(read, [DEVICE_WRITE_ADDRESS | 1])
        self.assertEqual(DEVICE_WRITE_ADDRESS >> 1, DEVICE_ADDRESS)

    def test_the_level_pair_goes_to_registers_2_to_5(self):
        # `register = 2 * flag + 3` then `2 * flag + 2`, so the pair fills 2 and 3 for flag 0 and 4
        # and 5 for flag 1. This is what makes group 9 device levels rather than timeouts: the two
        # halves leave the remote and nothing counts them down.
        got = instructions('one34_code', ONE_BASE, 0x2D2E6, 18)
        adds = [i.fields['k'] for _, i in got if i.mnemonic == 'ADDLW']
        self.assertEqual(adds, [3, 2])
        self.assertEqual([i.mnemonic for _, i in got].count('ADDWF'), 2, 'flag doubled each time')

    def test_the_pin_is_set_after_power_up_and_cleared_before_power_down(self):
        # Which is what makes it an enable rather than a signal.
        got = instructions('one34_code', ONE_BASE, ON_OFF_SEQUENCE, 14)
        bits = [(a, i.mnemonic) for a, i in got if i.category == isa.BIT and absolute(i) == LATC]
        self.assertEqual([m for _, m in bits], ['BSF', 'BCF'])
        # The set is the last thing the on arm does and the clear is followed only by a RETURN.
        for address, _ in bits:
            after = instructions('one34_code', ONE_BASE, address + 2, 1)
            self.assertEqual(after[0][1].mnemonic, 'RETURN')

    def test_the_power_down_arm_writes_every_channel_to_zero(self):
        """Thirteen channels, each with the value zero, and no fourteenth.

        The arm is two straight line routines rather than one, `0x23E0C` for channels 12 down to 8
        and `0x23EA2` for 0 up to 7, each ending in a tail call to the channel setter. Walking a
        fixed number of instructions instead runs off the end into the unreachable on arm at
        `0x23E52`, which writes the same channels with the value one, so each routine is walked to
        its own `GOTO` and not to an instruction count.
        """
        code = lab.load('one34_code')
        channels = []
        for start in (POWER_DOWN_HIGH, POWER_DOWN_LOW):
            offset = start - ONE_BASE
            value = None
            literal = None
            while True:
                instr = isa.decode(code, offset, ONE_BASE)
                if instr.mnemonic == 'CLRF' and instr.fields.get('f') == 0x60:
                    value = 0
                elif instr.mnemonic == 'MOVLW':
                    literal = instr.fields['k']
                elif instr.mnemonic == 'MOVWF' and instr.fields.get('f') == 0x60:
                    value = literal
                elif instr.mnemonic == 'MOVWF' and instr.fields.get('f') == 0x5F:
                    channels.append((literal, value))
                elif instr.mnemonic == 'CLRF' and instr.fields.get('f') == 0x5F:
                    channels.append((0, value))
                offset += 2 * instr.words
                if instr.mnemonic == 'GOTO':                # the tail call ends the routine
                    self.assertEqual(instr.fields['target'], CHANNEL_SETTER)
                    break
        self.assertEqual(len(channels), BAND_3F_C0_CHANNELS)
        self.assertEqual(sorted(c for c, _ in channels), list(range(BAND_3F_C0_CHANNELS)))
        self.assertEqual({v for _, v in channels}, {0}, 'every channel to zero')

    def test_the_firmware_never_switches_the_device_on(self):
        """`gprF14` is written only with zero, so only the power-down arm is reachable.

        The consequence is a rail rather than a curiosity: everything that enables this device or
        sets a channel comes out of a config.
        """
        from harmony.pic18 import trace
        code = lab.load('one34_code')
        hits = trace.trace(code, ONE_BASE, [0xF14])
        writes = [a for a in hits[0xF14] if 'WRITE' in a.kind]
        self.assertEqual(sorted(a.addr for a in writes), [0x28CAE, 0x2C9A6])
        for site in writes:
            with self.subTest(hex(site.addr)):
                instr = instructions('one34_code', ONE_BASE, site.addr, 1)[0][1]
                self.assertEqual(instr.mnemonic, 'CLRF', 'the only value written is zero')

    def test_the_channel_selector_uses_bits_1_to_3_and_not_bit_0(self):
        # The correction section 106 makes to section 103. `0x24F6C` reads the bits 1 to 3 register,
        # normalises it to a boolean and hands that on; the bit 0 register is not touched.
        got = instructions('one34_code', ONE_BASE, 0x24F6C, 12)
        self.assertEqual(got[0][1].fields.get('f'), OPERAND_MID_FIELD)
        moves = [(i.fields.get('src'), i.fields.get('dst')) for _, i in got if i.mnemonic == 'MOVFF']
        self.assertIn((0xEBB, 0xF21), moves, 'bits 1 to 3 become the flag')
        self.assertNotIn(0xEBC, [source for source, _ in moves], 'bit 0 never reaches the handler')


if __name__ == '__main__':
    unittest.main()
