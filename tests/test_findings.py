"""
Regression tests for every documented finding.

The analysis in docs/ was produced by an AI and is published as such, so the claims need
to be executable rather than merely written down. Each test here pins one statement from
docs/findings.md. If a refactor breaks a conclusion, this is where it shows up.
"""
import os
import re
import unittest

import lab
from harmony import firmware, gspm
from harmony.pic18 import chains, disasm, isa, trace


class TestFirmwareHeader(unittest.TestCase):
    # logical name -> (version, family byte, size field, true size)
    EXPECTED = {
        'one34_code': ('3.4', 0x00, 0xEA8A, 0x0EA92),
        'h700_code': ('2.8', 0x01, 0x2B78, 0x12B80),
        'h600_code': ('0.2', 0x01, 0x12B8, 0x112C0),
    }

    def test_header_fields(self):
        # The population up front, so a partial lab skips this whole test rather than shrinking its
        # own claim to whatever is present. ASampleLoopStatesItsPopulation in test_toolchain.py.
        lab.require(*self.EXPECTED)
        for name, (version, family, size_field, _) in self.EXPECTED.items():
            with self.subTest(image=name):
                h = firmware.parse_header(lab.load(name))
                self.assertEqual(h.version, version)
                self.assertEqual(h.family_byte, family)
                self.assertEqual(h.size_field, size_field)
                self.assertTrue(h.has_magic, '0x48 0x47 magic at offset 8')

    def test_size_field_encodes_length_minus_eight(self):
        lab.require('one34_code', 'h700_code')
        for name in ('one34_code', 'h700_code'):
            with self.subTest(image=name):
                code = lab.load(name)
                h = firmware.parse_header(code)
                self.assertEqual(h.size_field, (len(code) - 8) & 0xFFFF)

    def test_size_field_recovers_the_truncated_600_length(self):
        """
        concordance returns 65536 bytes; the real image is 70336. The header says so, and
        that figure agrees independently with the highest observed branch target.
        """
        code = lab.load('h600_code')
        self.assertEqual(len(code), 65536, 'the dump really is 64 KiB')
        self.assertEqual(firmware.recover_size(code), 0x112C0)
        self.assertEqual(0x112C0 - len(code), 4800, 'bytes missing from the dump')

    def test_checksum_over_complete_images(self):
        lab.require('one34_code', 'h700_code')
        for name in ('one34_code', 'h700_code'):
            with self.subTest(image=name):
                self.assertTrue(firmware.verify_checksum(lab.load(name)))

    def test_checksum_fails_on_the_truncated_image(self):
        self.assertFalse(firmware.verify_checksum(lab.load('h600_code')))

    def test_the_complete_600_image_verifies_where_the_truncated_one_does_not(self):
        """The 600's firmware, read off the remote, checked by the image's own header.

        This is the pair that makes the read trustworthy. The truncated dump fails its checksum
        at every candidate length; the complete image passes at exactly one, 70336 bytes, which
        is the length the size field encodes. A 16 bit checksum over 70 KiB does not agree by
        accident, and the wrong lengths show what disagreement looks like.
        """
        code = lab.load('h600_code_complete')
        self.assertEqual(len(code), 0x112C0, '70336 bytes')
        self.assertTrue(firmware.verify_checksum(code))
        h = firmware.parse_header(code, base=0x9000)
        self.assertEqual(h.size_field, (len(code) - 8) & 0xFFFF)
        self.assertEqual(h.entry_point, 0x1A26E, 'the entry point CLAUDE.md records for the 600')
        # And it was past the truncation, which is why it could not be disassembled before.
        self.assertGreater(h.entry_point, 0x9000 + 65536)
        for wrong in (0x12C0, 0x212C0):
            if wrong <= len(code):
                self.assertFalse(firmware.verify_checksum(code[:wrong]),
                                 'a wrong length must not verify')

    def test_the_two_600_images_agree_wherever_both_have_bytes(self):
        """65534 of 65536, and the two that differ are the two nobody can read.

        The offset clamp at 0xFFC0 puts program 0x0FFFE and 0x0FFFF out of reach of a 62 byte
        read, so the complete image takes those from the truncated dump. Everything else was
        obtained twice, by different software years apart.
        """
        old = lab.load('h600_code')
        new = lab.load('h600_code_complete')
        self.assertEqual(old, new[:len(old)], 'the complete image contains the truncated one')

    def test_the_ones_internal_page_holds_an_image_that_verifies(self):
        """Code that no package in the corpus contains, checked by its own header.

        On arch 12 the application runs from external NOR, so nothing in any `.hfw` covers the
        internal flash. There is no second copy to compare against, which is why the checksum is
        the whole argument: the image at +0x1000 declares its own length and its own checksum, and
        both agree.
        """
        page = lab.load('one_internal_fe')
        self.assertEqual(len(page), 0xFFFE, 'two bytes short of a page, per the offset clamp')
        h = firmware.parse_header(page[0x1000:])
        self.assertTrue(h.has_magic)
        self.assertEqual(h.version_bcd, 0x34, 'firmware 3.4, like the remote it came from')
        size = firmware.recover_size(page[0x1000:])
        self.assertEqual(size, 45356)
        self.assertTrue(firmware.verify_checksum(page[0x1000:0x1000 + size]))
        # The bootloader sits below it and has no header of its own: the reset vector is at zero.
        self.assertEqual(page[0:2], b'\xd2\xef', 'GOTO at the reset vector')

    def test_the_600s_safe_mode_image_is_not_what_the_safe_dump_holds(self):
        """`*-safe.bin` means different things on the two architectures.

        The safety rails name that file as the first recovery path. On the One it holds the safe
        mode container. On the 600 it is the application firmware from program 0x9000, truncated,
        and the real safe mode is an image at internal 0xFE+0x1000 that nothing had read until the
        internal pages were swept. Pinned because a rail resting on a wrong assumption is worse
        than no rail.
        """
        page = lab.load('h600_internal_fe')
        stored = lab.load('h600_code')
        # What the safe dump actually is: the page from program 0x9000, not from zero. The dump
        # runs past the end of this page, into the 0xFF one, so only the overlap is comparable.
        overlap = len(page) - 0x9000
        self.assertEqual(page[0x9000:], stored[:overlap])
        self.assertNotEqual(page[:overlap], stored[:overlap], 'not a dump from program zero')
        # The real safe mode image, which the safe dump does not contain at all.
        h = firmware.parse_header(page[0x1000:])
        self.assertTrue(h.has_magic)
        self.assertEqual(h.version_bcd, 0x02)
        size = h.size_field + 8
        self.assertEqual(size, 24320)
        self.assertTrue(firmware.verify_checksum(page[0x1000:0x1000 + size]))

    # What each remote reports in version block fields 8 and 9, measured over USB and published in
    # docs/usb-protocol.md. They are here because the refutation below needs both ends and only one
    # of them is in a sample: no `h600_internal_ff` was ever taken, so "nothing at 0xFF +0x0000 and
    # nothing at 0xFF +0xE000" is a hardware reading and not something this test can recompute.
    REPORTED_IMAGE_FIELDS = {'h600': (0x00, 0x00), 'one': (0x34, 0x16)}

    def test_version_block_field_8_names_an_image_the_600_does_not_have(self):
        """Fields 8 and 9 were the last unidentified bytes of the version block.

        Both name images in internal memory by version, and both read zero when the image is
        absent. The 600 is the negative case for each, and this test carries the refutation of the
        one competing reading: that field 8 names the safe mode image.

        It used to assert only that the safe mode image is at version 0x02, which is byte for byte
        what its neighbour above already asserts, so it restated its premise and tested nothing.
        """
        lab.require('h600_internal_fe')
        page = lab.load('h600_internal_fe')
        safe_mode_version = firmware.parse_header(page[0x1000:]).version_bcd
        field_8, field_9 = self.REPORTED_IMAGE_FIELDS['h600']
        # The refutation: the 600 does have a safe mode image, at a version that is not zero, and
        # still reports zero in field 8. So field 8 cannot be naming it.
        self.assertEqual(safe_mode_version, 0x02)
        self.assertNotEqual(safe_mode_version, field_8,
                            'field 8 would have to equal the safe mode version to name it')
        self.assertEqual((field_8, field_9), (0x00, 0x00), 'the 600 is the negative case for both')
        # And the positive case exists, so zero is a reading of an absent image rather than a field
        # nothing ever fills.
        self.assertNotEqual(self.REPORTED_IMAGE_FIELDS['one'], (0x00, 0x00))

    def test_recover_size_checks_rather_than_guesses_when_it_can(self):
        """It used to take the smallest candidate at least as long as the buffer.

        Right for a truncated file, wrong for a buffer holding more than the image, which is what
        reading the memory around an image produces: it answered 135872 for the 600. A candidate
        inside the buffer can have its checksum verified instead.
        """
        code = lab.load('h600_code_complete')
        self.assertEqual(firmware.recover_size(code), 0x112C0)
        self.assertEqual(firmware.recover_size(code + b'\xff' * 4096), 0x112C0,
                         'trailing bytes must not push the answer to the next 64 KiB')
        self.assertEqual(firmware.recover_size(lab.load('h600_code')), 0x112C0,
                         'the truncated case still works, by the fallback rule')


class TestCycleDelayRoutine(unittest.TestCase):
    """
    0x10D00 is the most called routine in the arch 14 image: a computed jump into a run of
    NOPs, giving a cycle-exact delay.
    """
    ADDR = 0x10D00
    BASE = 0x9000

    def test_computed_jump_into_a_nop_sled(self):
        code = lab.load('h700_code')
        lines = list(disasm.disassemble(code, self.BASE, self.ADDR, 3))
        self.assertIn('ADDWF PCL,W', lines[0])
        self.assertIn('MOVWF PCL', lines[1])
        self.assertIn('NOP', lines[2])

    def test_sled_is_one_hundred_nops_then_return(self):
        """
        The scaling constant in the IR path is 0x65 = 101, so a parameter of
        (101 - x) * 2 lands x NOPs from the end and burns exactly x cycles. That only
        works if the sled is exactly 100 long.
        """
        code = lab.load('h700_code')
        offset = self.ADDR - self.BASE + 4          # past ADDWF PCL,W / MOVWF PCL
        nops = 0
        while code[offset + 2 * nops:offset + 2 * nops + 2] == b'\x00\x00':
            nops += 1
        self.assertEqual(nops, 100)
        after = isa.decode(code, offset + 2 * nops, self.BASE)
        self.assertEqual(after.mnemonic, 'RETURN')


class TestTheSectionSeekerCensus(unittest.TestCase):
    """Which sections the firmware ever fetches, computed rather than quoted.

    The seeker takes a raw slot number in a register every caller loads with a literal, so one
    scan gives the whole census. What it says is as interesting for what is missing: raw slots 0
    and 1 appear on neither architecture, so base slot 0's name tree and base slot 1's
    architecture record are read by the host and never by the remote. `docs/findings.md`
    section 81.
    """

    SEEKERS = {'one34_code': (0x20000, 0x2BA76), 'h700_code': (0x9000, 0x10B92)}
    # Sites, then the raw slots. The One skips raw 8, which is the NULL arch 12 inserts and the
    # slot arch 14 does not have at all, so the gap is the container's and not the census's.
    EXPECTED = {
        'one34_code': (24, [n for n in range(2, 20) if n != 8]),
        'h700_code': (19, list(range(3, 18))),
    }

    def census(self, name):
        """Every call site of the seeker, with the literal slot each one loads."""
        base, seeker = self.SEEKERS[name]
        code = lab.load(name)
        sites = trace.xrefs(code, base, [seeker])[seeker]
        slots = []
        for site in sites:
            offset = site.addr - base
            for back in range(2, 30, 2):
                if offset - back < 0:
                    break
                instr = isa.decode(code, offset - back, base)
                if instr.mnemonic == 'MOVLW':
                    slots.append(instr.fields['k'])
                    break
                if instr.mnemonic in ('RETURN', 'RETLW', 'GOTO'):
                    break
        return sites, slots

    def test_every_call_site_resolves_to_a_literal_slot(self):
        """A site whose slot could not be recovered would make the absences below meaningless."""
        for name in self.SEEKERS:
            lab.require(name)
            sites, slots = self.census(name)
            with self.subTest(image=name):
                self.assertEqual(len(slots), len(sites))
                self.assertEqual(len(sites), self.EXPECTED[name][0])

    def test_the_seeked_slots_are_the_ones_recorded(self):
        for name, (_, expected) in self.EXPECTED.items():
            lab.require(name)
            _, slots = self.census(name)
            with self.subTest(image=name):
                self.assertEqual(sorted(set(slots)), expected)

    def test_neither_firmware_ever_seeks_raw_slot_zero_or_one(self):
        """The point of section 81: those two sections exist for the host software."""
        for name in self.SEEKERS:
            lab.require(name)
            _, slots = self.census(name)
            with self.subTest(image=name):
                self.assertNotIn(0, slots)
                self.assertNotIn(1, slots)


class TestArch9Infrared(unittest.TestCase):
    """The infrared chain on the Harmony 525, read out of the first arch 9 firmware.

    Addresses are pinned rather than described, for the reason the rest of this file pins them:
    finding them again is a search. `docs/findings.md` section 80.
    """

    BASE = 0x0000
    PART = '4550'
    SPI_READ_BYTE = 0x07F8E
    SPI_WRITE_BYTE = 0x07F7A
    CARRIER_ON = 0x07680
    CARRIER_OFF = 0x076C0
    PLAYER = 0x076CE
    CLASS_DISPATCH = 0x05108
    CLASS5 = 0x0513E
    QUEUE_PUSH_PAIR = 0x0277C
    # Section 82: the loader that reads a class 5 body, and the helpers it reads the fields with.
    CLASS5_LOADER = 0x04FF6
    SAVE_WALKING_POINTER = 0x05326
    READ_U16 = 0x0658E
    READ_U24 = 0x065BE
    READ_U24_INTO_TBLPTR = 0x06560
    CLASS5_SEEK_SYMBOL = 0x05370
    INDEX_TO_ENTRY = 0x066F4

    def code(self):
        return lab.load('h525_code')

    def text(self, at, count):
        return '\n'.join(disasm.disassemble(self.code(), self.BASE, at, count, self.PART))

    def test_the_spi_primitive_is_the_config_choke_point(self):
        """The arch 9 analogue of arch 14's 0x1B9AC: every config byte comes through here."""
        lab.require('h525_code')
        self.assertIn('MOVFF SSPBUF,0x75c', self.text(self.SPI_READ_BYTE, 4))
        self.assertIn('MOVFF 0x3f3,SSPBUF', self.text(self.SPI_WRITE_BYTE, 4))
        # And the write is what the read is built on, which is how an SPI read works: clock a
        # dummy byte out to clock the answer in.
        self.assertIn('RCALL 0x07f7a', self.text(self.SPI_READ_BYTE, 4))

    def test_the_carrier_is_ccp1_in_pwm_mode(self):
        """0x0C into CCP1CON is PWM mode. On the default register map that address is CCPR1H,
        where the same byte is a duty cycle and says nothing, which is why the map is chosen."""
        lab.require('h525_code')
        on = self.text(self.CARRIER_ON, 32)
        self.assertIn('MOVWF PR2', on)
        self.assertIn('MOVLW 0x0c', on)
        self.assertIn('MOVWF CCP1CON', on)
        self.assertIn('BSF T2CON,2', on)
        off = self.text(self.CARRIER_OFF, 8)
        self.assertIn('CLRF CCP1CON', off)
        self.assertIn('BCF T2CON,2', off)

    def test_a_pulse_is_a_u16_whose_top_bit_is_the_carrier(self):
        """The player reads pairs of bytes out of a RAM queue at 0x600 and tests bit 15."""
        lab.require('h525_code')
        instr = isa.decode(self.code(), 0x07744, self.BASE)
        self.assertEqual(instr.mnemonic, 'BTFSS')
        self.assertEqual(instr.fields['b'], 7)
        carrier_on = self.text(0x07748, 1)
        # Bit set means carry the duty over from 0x22c; bit clear means clear the duty, so the
        # top bit is carrier on and the rest is a timer count.
        self.assertIn('MOVFF 0x22c,CCPR1', carrier_on)
        self.assertIn('CLRF CCPR1', self.text(0x07752, 1))

    def test_the_class_byte_is_switched_on_at_a_single_place(self):
        """Class 1 and class 5 each get their own arm, and everything else falls through."""
        lab.require('h525_code')
        text = self.text(self.CLASS_DISPATCH, 30)
        self.assertIn('DECF 0x2a,B,W', text)     # class 1
        self.assertIn('MOVLW 0x05', text)        # class 5
        self.assertIn('SUBWF 0x2a,B,W', text)

    def test_class_five_pushes_u16_words_it_reads_from_the_config(self):
        """The loop: a count, then that many words, each pushed as a pulse.

        Where the words come from was open when section 80 was written and is closed by section 82.
        `0x0658E` reads two bytes into the variable named by 0x14e and 0x14f.
        """
        lab.require('h525_code')
        text = self.text(self.CLASS5, 80)
        self.assertIn('CALL 0x0658e', text)
        self.assertIn('CALL 0x0277c', text)
        # And the push helper adds two to the queue's byte count, so a queue entry is a u16.
        push = self.text(self.QUEUE_PUSH_PAIR, 16)
        self.assertIn('MOVLW 0x02', push)
        self.assertIn('ADDWF 0x2d8,F', push)

    def test_the_two_read_helpers_state_their_own_widths(self):
        """Section 82's field widths are literals in the code, not inferences from the data.

        `0x0658E` reads a u16 into the pointer at 0x14e, `0x065BE` a u24 into the pointer at
        0x150, each by clocking bytes through the SPI reader and stepping the destination.
        """
        lab.require('h525_code')
        self.assertEqual(self.text(self.READ_U16, 15).count('CALL 0x07572'), 2)
        self.assertEqual(self.text(self.READ_U24, 22).count('CALL 0x07572'), 3)

    def test_the_loader_reads_a_table_pointer_only_for_class_five(self):
        """The body's first two fields, and the class byte is what gates the first of them.

        A class 1 pointer names durations straight away; a class 5 pointer names a body, and only
        then does the loader take a u24 table address. Section 82.
        """
        lab.require('h525_code')
        text = self.text(self.CLASS5_LOADER, 22)
        self.assertIn('MOVLW 0x05', text)
        self.assertIn('SUBWF 0x22a,W', text)          # the class byte, bank 2
        self.assertIn('MOVLW 0x2d', text)             # destination 0x22d
        self.assertIn('CALL 0x%05x' % self.READ_U24, text)
        self.assertIn('MOVLW 0x30', text)             # destination 0x230, the u16 index count
        self.assertIn('CALL 0x%05x' % self.READ_U16, text)
        # And the read position afterwards becomes the walking pointer over the index stream.
        self.assertIn('MOVFF TBLPTRL,0x291', self.text(self.SAVE_WALKING_POINTER, 4))

    def test_an_index_reaches_a_three_byte_table_entry(self):
        """`3 * index + 1`: the stride is the entry width and the one skips the table's count."""
        lab.require('h525_code')
        text = self.text(self.INDEX_TO_ENTRY, 20)
        self.assertIn('MOVF 0x15c,W', text)           # the index byte
        self.assertIn('MOVLW 0x03', text)             # three bytes an entry
        self.assertIn('MULWF', text)
        self.assertIn('MOVF 0x15b,W', text)           # the addend, loaded with 1 by 0x05370
        self.assertIn('MOVWF 0x5b,B', self.text(self.CLASS5_SEEK_SYMBOL, 1))
        self.assertIn('MOVLW 0x01', self.text(self.CLASS5 + 0x2C, 2))
        # The entry itself is a u24 read straight into the table pointer and seeked.
        self.assertIn('MOVWF TBLPTRU', self.text(self.READ_U24_INTO_TBLPTR, 8))


class TestInfraredChain(unittest.TestCase):
    BASE = 0x9000

    def test_carrier_variables_have_the_expected_access_counts(self):
        hits = trace.trace(lab.load('h700_code'), self.BASE, [0x08D, 0x08E, 0x3BF])
        self.assertEqual(len(hits[0x08D]), 15)
        self.assertEqual(len(hits[0x08E]), 7)
        self.assertEqual(len(hits[0x3BF]), 2)

    def test_the_mask_reaches_the_modulator_from_the_ring_buffer(self):
        """0x3BF is written once, from 0xDBB, immediately before the modulator call."""
        hits = trace.trace(lab.load('h700_code'), self.BASE, [0x3BF])
        writes = [a for a in hits[0x3BF] if 'WRITE' in a.kind]
        self.assertEqual(len(writes), 1)
        self.assertEqual(writes[0].addr, 0x195EC)
        self.assertIn('0xDBB', writes[0].detail)

    def test_modulator_drives_portc_bit_2(self):
        code = lab.load('h700_code')
        text = '\n'.join(disasm.disassemble(code, self.BASE, 0x194B4, 8))
        self.assertIn('BSF PORTC,2', text)
        self.assertIn('BCF PORTC,2', text)
        self.assertIn('CALL 0x10d00', text)

    def test_enable_mask_is_inverted(self):
        """
        The half-cycle test is BTFSS, not BTFSC, so the guarded `BSF PORTC,2` runs when
        the mask bit is CLEAR. The mask is active low. An earlier version of this project
        had the two mnemonics swapped and stated the opposite polarity.
        """
        code = lab.load('h700_code')
        instr = isa.decode(code, 0x194C4 - self.BASE, self.BASE)
        self.assertEqual(instr.mnemonic, 'BTFSS')
        self.assertEqual(instr.fields['b'], 0)
        following = isa.decode(code, 0x194C6 - self.BASE, self.BASE)
        self.assertEqual(following.mnemonic, 'BSF')

    def test_carrier_period_field_scaling_closes_on_38khz(self):
        """
        The firmware computes cycles as value * 4 / 10 and then subtracts 19 cycles of loop
        overhead. At 4 MIPS a 38 kHz carrier is a 26.3 us period, so the config stores 263.

        **Every constant here is decoded out of the image, and until 13 August 2026 none of them
        was.** This test used to be four lines of arithmetic on its own literals, `263 * 4 // 10 ==
        105` and `105 / 4.0 == 26.25`, with no firmware, no config and no library in it: it passed
        with no lab at all, and it would have passed if the firmware used any other numbers.
        `CLAUDE.md` cites this closure under "Verification standard" as the project's model of an
        independent numeric check, which is what made it worth repairing rather than deleting.

        The closure only means something when the two ends are independent. One end is the datasheet
        figure, a 38 kHz carrier, and the other is these three constants, so they have to come from
        the code.
        """
        code = lab.load('h700_code')

        # The multiplier is a shift count in WREG, consumed by the RLCF pair at 0x193E4, not a
        # literal 4 anywhere: `MOVLW 0x02` then a two step 16 bit shift left.
        shift = isa.decode(code, 0x193E0 - self.BASE, self.BASE)
        self.assertEqual(shift.mnemonic, 'MOVLW')
        loop = [isa.decode(code, a - self.BASE, self.BASE)
                for a in (0x193E4, 0x193E6, 0x193E8, 0x193EA, 0x193EC)]
        self.assertEqual([i.mnemonic for i in loop],
                         ['BCF', 'RLCF', 'RLCF', 'DECF', 'BNZ'])
        self.assertEqual(loop[4].fields['target'], 0x193E4, 'the shift really is a loop')
        multiplier = 1 << shift.fields['k']

        # The divisor, staged into the divide helper's argument pair before the call.
        divisor = isa.decode(code, 0x193EE - self.BASE, self.BASE)
        self.assertEqual(divisor.mnemonic, 'MOVLW')
        self.assertEqual(isa.decode(code, 0x193FC - self.BASE, self.BASE).mnemonic, 'CALL')

        # The loop overhead, subtracted and clamped at zero rather than allowed to wrap.
        overhead = isa.decode(code, 0x1940C - self.BASE, self.BASE)
        self.assertEqual(overhead.mnemonic, 'SUBLW')
        clamp = isa.decode(code, 0x19410 - self.BASE, self.BASE)
        self.assertEqual(clamp.mnemonic, 'CLRF', 'below the overhead it clamps at zero')

        # Now the closure, with nothing of our own in it but the carrier frequency.
        self.assertEqual((multiplier, divisor.fields['k'], overhead.fields['k']), (4, 10, 19))
        stored = 263                         # what a config carries for 38 kHz, in units of 0.1 us
        cycles = stored * multiplier // divisor.fields['k']
        self.assertEqual(cycles, 105)
        microseconds = cycles / 4.0          # 4 instruction cycles per microsecond, so 16 MHz
        self.assertAlmostEqual(microseconds, 26.25, places=2)
        # And back to a frequency, which is where the closure is either loose or it is not. 26.25 us
        # is 38095 Hz rather than 38000, because a period of 26.3 us cannot be represented in whole
        # units of 0.1 us: the field quantises 263.15 down to 263. The error is 0.2506%, measured
        # rather than asserted at a round number, and it is stated here instead of being hidden
        # behind a rounding, because a closure whose slack nobody wrote down is one nobody can check.
        hertz = 1e6 / microseconds
        self.assertAlmostEqual(hertz, 38095.24, places=1)
        self.assertLess(abs(hertz - 38000) / 38000, 0.003)


class TestKeypadScanner(unittest.TestCase):
    BASE = 0x9000

    def test_column_reader_returns_one_to_four(self):
        code = lab.load('h700_code')
        text = list(disasm.disassemble(code, self.BASE, 0x19094, 9))
        self.assertIn('BTFSS PORTB,4', text[0])
        self.assertIn('RETLW 0x01', text[1])
        self.assertIn('BTFSS PORTB,7', text[6])
        self.assertIn('RETLW 0x04', text[7])
        self.assertIn('RETLW 0x00', text[8])

    def test_columns_are_active_low(self):
        """
        BTFSS skips the RETLW when the bit is set, so a code is returned for the first line
        found LOW. Consistent with the active-low row drive.
        """
        code = lab.load('h700_code')
        instr = isa.decode(code, 0x19094 - self.BASE, self.BASE)
        self.assertEqual(instr.mnemonic, 'BTFSS')

    def test_key_code_is_row_times_four_plus_column(self):
        code = lab.load('h700_code')
        text = '\n'.join(disasm.disassemble(code, self.BASE, 0x19274, 12))
        self.assertIn('MULLW 0x04', text)
        self.assertIn('MOVF PRODL,W', text)

    def test_hardwired_reset_combination_fires_when_the_key_is_pressed(self):
        """
        BTFSS PORTB,6 then RESET: the RESET executes when PORTB,6 is CLEAR, which in an
        active-low matrix means the key is held. An earlier version of this project read
        this as BTFSC and stated the inverse.
        """
        code = lab.load('h700_code')
        test = isa.decode(code, 0x19120 - self.BASE, self.BASE)
        self.assertEqual(test.mnemonic, 'BTFSS')
        self.assertEqual(test.fields['b'], 6)
        following = isa.decode(code, 0x19122 - self.BASE, self.BASE)
        self.assertEqual(following.mnemonic, 'RESET')


class TestArch14UsesSpi(unittest.TestCase):
    BASE = 0x9000

    def test_config_reads_go_through_the_mssp(self):
        """
        0x1B9AC clocks a byte in through SSP1BUF. That is hardware SPI, which means the
        arch 14 config is not memory mapped, which in turn is why the firmware has to be
        copied into internal flash to run.

        The register was called SSPBUF here until the SFR table was rebuilt from the
        PIC18F67J50 map. The address is the same 0xFC9; the part has two synchronous serial
        ports, so the ports are now numbered and the config flash hangs off port 1.
        """
        code = lab.load('h700_code')
        text = '\n'.join(disasm.disassemble(code, self.BASE, 0x1B9AC, 4))
        self.assertIn('SETF SSP1BUF', text)
        self.assertIn('MOVF SSP1BUF,W', text)
        self.assertIn('BTFSS SSP1STAT,0', text)

    def test_chip_select_is_latf_bit_7(self):
        code = lab.load('h700_code')
        text = '\n'.join(disasm.disassemble(code, self.BASE, 0x18CEC, 3))
        self.assertIn('BSF LATF,7', text)
        self.assertIn('BCF LATF,7', text)


class TestArch9ScreenOpcodes22And23(unittest.TestCase):
    """Section 101: a page select and a page transfer, not a row marker.

    The lead was trelowney's, on 10 August 2026, and decision 7 says an upstream finding is a
    hypothesis. So every address is asserted against this project's own 525 image, and the
    dispatcher through `chains` rather than by eye.
    """

    NAME, BASE = 'h525_code', 0x0000
    DISPATCH = 0x0465C
    OPCODE_22, OPCODE_23 = 22, 23
    ROW_MATH = 0x038EC
    TRANSFER = 0x03898

    def at(self, code, addr):
        return isa.decode(code, addr - self.BASE, self.BASE)

    def test_the_dispatcher_names_a_handler_for_both(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        table = chains.chain_table(code, self.BASE, self.DISPATCH)
        self.assertIn(self.OPCODE_22, table)
        self.assertIn(self.OPCODE_23, table)
        self.assertEqual(table[self.OPCODE_22], 0x046D6)
        self.assertEqual(table[self.OPCODE_23], 0x046E8)

    def test_opcode_22_takes_one_byte_and_derives_the_page_bounds(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # One operand byte into 0xD9, then the call that keeps it and computes row * 8 and + 7.
        call = self.at(code, 0x046E2)
        self.assertEqual(call.mnemonic, 'CALL')
        self.assertEqual(call.fields['target'], self.ROW_MATH)
        self.assertEqual(self.at(code, 0x038F0).fields['k'], 8)
        self.assertEqual(self.at(code, 0x038F4).mnemonic, 'MULWF')
        self.assertEqual(self.at(code, 0x038FA).fields['k'], 7)

    def test_the_transfer_sends_a_page_address_command(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # 0xB0 | page is the page address command of a page addressed controller, and it is what
        # makes the operand a page index rather than a marker. This is the assertion the whole
        # reading rests on. Which controller is a separate question, below: one command names a
        # family of families, and naming a part on it was the error this section corrected.
        self.assertEqual(self.at(code, self.TRANSFER).mnemonic, 'MOVLW')
        self.assertEqual(self.at(code, self.TRANSFER).fields['k'], 0xB0)
        self.assertEqual(self.at(code, 0x0389C).mnemonic, 'IORWF')
        # And opcode 23 loads the panel's width before calling it.
        self.assertEqual(self.at(code, 0x046EE).fields['k'], 0x60)
        transfer = self.at(code, 0x04714)
        self.assertEqual(transfer.mnemonic, 'CALL')
        self.assertEqual(transfer.fields['target'], self.TRANSFER)

    def test_opcode_23_brackets_the_transfer_with_two_port_bits(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        # LATE bit 2 and LATA bit 5 around it, restored after. Asserted because a later reader
        # changing the transfer has to keep the bracket, and because the arch 9 external latch is
        # clocked with LATE.
        self.assertEqual(self.at(code, 0x046E8).mnemonic, 'BSF')
        self.assertEqual(self.at(code, 0x046EA).mnemonic, 'BCF')
        self.assertEqual(self.at(code, 0x04718).mnemonic, 'BSF')
        self.assertEqual(self.at(code, 0x0471A).mnemonic, 'BCF')


class TestTheArch9DisplayControllerIsST7565Class(unittest.TestCase):
    """Section 101, corrected on 10 August 2026: the page command names a family of families.

    The reading of screen opcodes 22 and 23 rests on `0xB0 | page`, which the ST7565 and the
    SSD1306 both use, so it cannot name a part. The rest of the driver can, and the test is the
    positive and the negative together: an init sequence full of one family's commands is only
    evidence if the other family's are absent.
    """

    NAME, BASE = 'h525_code', 0x0000
    # The display driver, which holds both the init sequence and the page transfer.
    LOW, HIGH = 0x03500, 0x03D00
    LITERALS = ('MOVLW', 'IORLW', 'ADDLW')

    # Commands only the ST7565 and UC1701 family define.
    ST7565_ONLY = {0xE2: 'software reset', 0xA2: 'LCD bias', 0x24: 'resistor ratio 4',
                   0x25: 'resistor ratio 5', 0x2F: 'power control', 0xF8: 'booster ratio'}
    # Commands only the SSD1306 defines. The negative control, and an SSD1306 cannot be brought up
    # without 0x8D at least, so their joint absence is the strong half of this.
    SSD1306_ONLY = {0x8D: 'charge pump', 0xD5: 'display clock divide', 0xD9: 'precharge',
                    0xDA: 'COM pins', 0xDB: 'VCOMH deselect', 0xA8: 'multiplex ratio',
                    0xD3: 'display offset', 0x21: 'column address range',
                    0x22: 'page address range'}

    def sites(self, code):
        """Every literal load in the driver region, value to offsets."""
        out = {}
        for off in range(self.LOW, min(self.HIGH, len(code)) - 1, 2):
            ins = isa.decode(code, off, self.BASE)
            if ins is None or ins.mnemonic not in self.LITERALS:
                continue
            k = ins.fields.get('k')
            if k is not None:
                out.setdefault(k, []).append(off)
        return out

    def test_every_st7565_only_command_appears_in_the_driver(self):
        lab.require(self.NAME)
        sites = self.sites(lab.load(self.NAME))
        for value, name in sorted(self.ST7565_ONLY.items()):
            with self.subTest(command='0x%02X %s' % (value, name)):
                self.assertTrue(sites.get(value), '0x%02X %s is absent' % (value, name))

    def test_no_ssd1306_only_command_appears_anywhere_in_the_driver(self):
        """The negative control. Without this the positive result is just a list of byte values."""
        lab.require(self.NAME)
        sites = self.sites(lab.load(self.NAME))
        found = {'0x%02X %s' % (v, n): sites.get(v) for v, n in self.SSD1306_ONLY.items()
                 if sites.get(v)}
        self.assertEqual(found, {})

    def test_the_init_sequence_is_that_family_in_order(self):
        """
        Scattered literals are weak and a sequence is strong, so the order is asserted too: the
        commands the family documents for bring-up, in the positions the firmware issues them.
        """
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        expected = [(0x0357A, 0xC0), (0x03582, 0xA0), (0x03586, 0x25), (0x0358E, 0x81),
                    (0x03594, 0xA2), (0x0359C, 0xC0), (0x035A0, 0x24), (0x035C2, 0xF8),
                    (0x035CA, 0x40), (0x035CE, 0xAF), (0x035D8, 0xE2), (0x035DE, 0xAE)]
        for addr, value in expected:
            with self.subTest(addr='0x%05X' % addr):
                ins = isa.decode(code, addr - self.BASE, self.BASE)
                self.assertEqual(ins.mnemonic, 'MOVLW')
                self.assertEqual(ins.fields['k'], value)

    def test_the_transfer_addresses_a_column_three_to_the_right_of_the_panels(self):
        """
        The renderer facing half. A page command alone would not need a column, and the offset of
        three is what a controller with more RAM than panel produces.
        """
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        at = lambda a: isa.decode(code, a - self.BASE, self.BASE)   # noqa: E731
        self.assertEqual(at(0x038BA).fields['k'], 3)
        self.assertEqual(at(0x038C0).fields['k'], 3)
        # The high nibble command is 0x10 | (col >> 4), built out of a swap and a mask.
        self.assertEqual(at(0x03C3E).fields['k'], 0xF0)
        self.assertEqual(at(0x03C40).mnemonic, 'SWAPF')
        self.assertEqual(at(0x03C44).mnemonic, 'IORLW')
        self.assertEqual(at(0x03C44).fields['k'], 0x10)
        # And the low nibble is 0x00 | (col & 0x0F), which is why the mask is asserted rather than
        # an OR: on this family the low nibble command's opcode bits are zero.
        self.assertEqual(at(0x038C6).mnemonic, 'ANDLW')
        self.assertEqual(at(0x038C6).fields['k'], 0x0F)

    def test_one_command_in_the_init_is_unexplained_and_stays_recorded(self):
        """Recorded rather than explained, so it cannot be quietly dropped from the sequence."""
        lab.require(self.NAME)
        ins = isa.decode(lab.load(self.NAME), 0x0357E - self.BASE, self.BASE)
        self.assertEqual(ins.fields['k'], 0x89)
        self.assertNotIn(0x89, self.ST7565_ONLY)
        self.assertNotIn(0x89, self.SSD1306_ONLY)


class TestScreenProgramPopulations(unittest.TestCase):
    """Section 118: a count with no population attached, and what each population holds.

    Section 101 explained a discrepancy by naming base slot 11, which carries no opcode 22 at all.
    These tests pin each population separately, because the error was possible only while the
    figures floated free of the code that produced them.
    """

    ARCH9 = ('h525_config', 'h525_config_2', 'h525_safemode_ahcm')

    def containers(self):
        lab.require(*self.ARCH9)
        return [(n, gspm.parse(lab.load(n))) for n in self.ARCH9]

    def count(self, container, addresses, opcode):
        total = 0
        for address in addresses:
            for instruction in container.screen_program(address) or []:
                total += instruction.opcode == opcode
        return total

    def test_base_slot_11_holds_no_screen_draw_at_all(self):
        """The claim section 101 got wrong, asserted as the negative it is."""
        for name, c in self.containers():
            with self.subTest(sample=name):
                slot = gspm.arch_slot(c.architecture, gspm.SCREEN_TABLE_SLOT)
                addresses = c.pointer_array(slot) or []
                self.assertTrue(addresses)
                opcodes = set()
                for address in addresses:
                    opcodes |= {i.opcode for i in c.screen_program(address) or []}
                # An end, a queued action list instruction, and in the safe mode container a
                # switch. **No drawing opcode of any kind**, which is the claim: these programs
                # queue work and branch, they do not put pixels on the panel. Asserted as a set
                # difference rather than an equality, because the exact set is per container and
                # an equality here would fail on the next sample without meaning anything.
                self.assertEqual(opcodes - {gspm.SCREEN_END, gspm.SCREEN_QUEUE_INSTRUCTION,
                                            gspm.SCREEN_SWITCH_NARROW, gspm.SCREEN_SWITCH_WIDE},
                                 set())
                for drawing in (2, 3, 4, 5, gspm.SCREEN_CALL):
                    self.assertEqual(self.count(c, addresses, drawing), 0)

    def test_every_mode_record_root_is_also_a_page_program(self):
        """
        The mechanism behind the double count, and the reason the total is not the sum of its
        populations. Address identity, which holds on all three, rather than a product of counts.
        """
        for name, c in self.containers():
            with self.subTest(sample=name):
                pages = {p.program for p in c.mode_pages()}
                roots = c.mode_program_roots()
                self.assertTrue(roots)
                self.assertTrue(set(roots) <= pages)

    def test_the_product_of_counts_is_a_coincidence_the_safe_mode_container_breaks(self):
        """
        `records * 8` matches on the two user configs and not on the safe mode container, which
        holds one page program drawing four rows instead of eight. Asserted so that nobody
        reintroduces the arithmetic as the explanation.
        """
        lab.require(*self.ARCH9)
        for name in ('h525_config', 'h525_config_2'):
            with self.subTest(sample=name):
                c = gspm.parse(lab.load(name))
                roots = c.mode_program_roots()
                self.assertEqual(self.count(c, roots, gspm.SCREEN_CALL), 8 * len(roots))
        c = gspm.parse(lab.load('h525_safemode_ahcm'))
        roots = c.mode_program_roots()
        self.assertNotEqual(self.count(c, roots, gspm.SCREEN_CALL), 8 * len(roots))
        self.assertEqual(self.count(c, roots, gspm.SCREEN_CALL), 8 * len(roots) - 4)

    def test_the_reachable_walk_deduplicates_and_the_naive_one_does_not(self):
        """Where 1992 came from. The deduplicated figure is the one a document may quote."""
        lab.require('h525_config')
        c = gspm.parse(lab.load('h525_config'))
        programs, failed = c.reachable_screen_programs()
        self.assertEqual(failed, [])
        deduped = sum(i.opcode == gspm.SCREEN_CALL
                      for prog in programs.values() for i in prog)
        roots = c.screen_program_roots()
        naive = self.count(c, roots, gspm.SCREEN_CALL)
        self.assertEqual(deduped, 1080)
        self.assertEqual(naive, 1992)
        self.assertGreater(len(roots), len(set(roots)))


class TestScreenOpcode3IsDestinationFirst(unittest.TestCase):
    """Section 118. The order is settled by the page opcode 22 selected, not by the layout.

    trelowney's lead, verified here against this project's own configs, and given a closure his
    typographic argument does not need: a transfer cannot reach a page that is not selected.
    """

    DRAW = 3
    ASYMMETRIC = (0, 12, 0, 0, 96, 1)

    def draws(self, c):
        """Every opcode 3, with the page selected when it runs."""
        out = []
        programs, _ = c.reachable_screen_programs()
        for _, program in sorted(programs.items()):
            page = None
            for instruction in program:
                if instruction.opcode == gspm.SCREEN_CALL and instruction.operands:
                    page = instruction.operands[0]
                elif instruction.opcode == self.DRAW and len(instruction.operands) >= 6:
                    out.append((page, list(instruction.operands)))
        return out

    def test_the_asymmetric_draws_are_one_shape_naming_one_picture(self):
        lab.require('h525_config')
        c = gspm.parse(lab.load('h525_config'))
        draws = self.draws(c)
        asymmetric = [o for _, o in draws if tuple(o[0:2]) != tuple(o[2:4])]
        self.assertEqual(len(draws), 1114)
        self.assertEqual(len(asymmetric), 34)
        self.assertEqual({tuple(o[0:6]) for o in asymmetric}, {self.ASYMMETRIC})
        pictures = {int.from_bytes(bytes(o[6:9]), 'little') for o in asymmetric}
        self.assertEqual(len(pictures), 1)
        # A 96 by 64 bitmap, so a rule is one row off the top of a full screen of solid ink.
        picture = c.bitmap_at(pictures.pop())
        self.assertEqual((picture.stride, picture.rows), (96, 64))

    def test_the_first_pair_is_the_one_inside_the_selected_page(self):
        """
        The closure. A page holds rows `8 * page` to `8 * page + 7` and a transfer cannot reach
        outside it, so whichever pair lands inside is the destination. 55 of 55 against 0 of 55.
        """
        lab.require('h525_config', 'h525_config_2')
        first = second = total = 0
        for name in ('h525_config', 'h525_config_2'):
            c = gspm.parse(lab.load(name))
            for page, operands in self.draws(c):
                if page is None or tuple(operands[0:2]) == tuple(operands[2:4]):
                    continue
                total += 1
                low, high, height = page * 8, page * 8 + 7, operands[5]
                first += low <= operands[1] and operands[1] + height - 1 <= high
                second += low <= operands[3] and operands[3] + height - 1 <= high
        self.assertEqual(total, 55)
        self.assertEqual(first, 55)
        self.assertEqual(second, 0)

    def test_the_symmetric_draws_are_the_calibration_case(self):
        """
        A test that only fires on the disputed instructions proves nothing about the rule. Every
        symmetric draw lands inside its own selected page too, which is the case whose answer was
        never in doubt.
        """
        lab.require('h525_config')
        c = gspm.parse(lab.load('h525_config'))
        inside = total = 0
        for page, operands in self.draws(c):
            if page is None or tuple(operands[0:2]) != tuple(operands[2:4]):
                continue
            total += 1
            low, high = page * 8, page * 8 + 7
            inside += low <= operands[1] and operands[1] + operands[5] - 1 <= high
        self.assertEqual(total, 1080)
        self.assertEqual(inside, 1080)


class TestAConfigCannotChooseWhereItWrites(unittest.TestCase):
    """Section 118, against the caveat that a config could write to arbitrary flash.

    The path is real and section 108 read it. These tests pin the two things that bound it, so a
    later change to either is visible: the write routine's own refusals, and the fact that the one
    architecture whose firmware shares flash with its config does not implement the opcodes.
    """

    ARCH14, ARCH14_BASE = 'h700_code', 0x9000
    ARCH12, ARCH12_BASE = 'one34_code', 0x020000
    APPEND = 0x159F4          # what opcodes 0x65 and 0x66 reach
    OUT_OF_RANGE = 0x15BDE    # where the bounds test sends an address it will not write

    def test_the_append_routine_refuses_before_it_writes(self):
        """
        Five zero tests and two range tests, every one of them ending in a RETURN rather than in a
        send. Both kinds are counted by shape, so the seven are seven and not "at least five".

        It used to count RETURN instructions in a window and demand five or more, which is a floor
        under the number it was measuring and counts the wrong thing besides: a RETURN is also how
        the routine ends normally, so the count did not separate a refusal from a completion. Each
        zero test is now identified as a `BNZ` over a RETURN it skips, and each range test as the
        branch to the out of range arm, which is a different shape entirely.
        """
        lab.require(self.ARCH14)
        code = lab.load(self.ARCH14)
        zero_tests, range_tests = [], []
        for addr in range(self.APPEND, self.OUT_OF_RANGE, 2):
            ins = isa.decode(code, addr - self.ARCH14_BASE, self.ARCH14_BASE)
            if ins is None:
                continue
            after = isa.decode(code, addr + 2 - self.ARCH14_BASE, self.ARCH14_BASE)
            if (ins.mnemonic == 'BNZ' and ins.fields['target'] == addr + 4
                    and after is not None and after.mnemonic == 'RETURN'):
                zero_tests.append(addr)
            if ins.mnemonic in ('BRA', 'GOTO') and ins.fields.get('target') == self.OUT_OF_RANGE:
                range_tests.append(addr)
        self.assertEqual(len(zero_tests), 5, 'the five zero tests')
        self.assertEqual(len(range_tests), 2, 'the two range tests')
        # And the out of range arm returns rather than clamping and carrying on: nothing between it
        # and its RETURN is a call, so no send is reached from there.
        tail = [isa.decode(code, a - self.ARCH14_BASE, self.ARCH14_BASE)
                for a in range(self.OUT_OF_RANGE, self.OUT_OF_RANGE + 0x1A, 2)]
        reached = tail[:1 + next(n for n, i in enumerate(tail)
                                if i is not None and i.mnemonic == 'RETURN')]
        self.assertEqual([i.mnemonic for i in reached if i is not None and 'CALL' in i.mnemonic], [])

    def test_arch_12_implements_none_of_the_flash_writing_opcodes(self):
        """
        The structural half, and the one that matters for the write rails: arch 12 is where firmware
        and config share one mapped NOR, and its dispatcher sends every opcode in 0x65 to 0x6E to
        the common exit. Section 107 read the ladder; this asserts the consequence.
        """
        lab.require(self.ARCH12)
        c12 = [gspm.parse(lab.load(n)) for n in ('one_config', 'one_config_unprogrammed')
               if lab.path(n)]
        self.assertTrue(c12)
        for container in c12:
            lists = container.action_lists() or []
            self.assertTrue(lists)
            used = {i.opcode for l in lists for i in l}
            # No arch 12 config emits one, which is the corpus agreeing with the firmware.
            self.assertEqual(used & {0x65, 0x66}, set())

    def test_no_config_in_the_corpus_writes_to_flash(self):
        """The corpus wide negative, across every architecture, so a new sample that does stands out."""
        lab.require(*lab.CONTAINERS)
        for name in lab.CONTAINERS:
            with self.subTest(sample=name):
                container = gspm.parse(lab.load(name))
                used = {i.opcode for l in container.action_lists() or [] for i in l}
                self.assertEqual(used & {0x65, 0x66}, set())


class TestTheArch12BootloaderDoesNotTestAKey(unittest.TestCase):
    """Section 118. The safe mode trigger is a cold boot key hold, and it is not in the bootloader.

    A negative result, asserted because it is the half that is measured. The procedure itself comes
    from a third party repair sheet and is deliberately **not** asserted here: a published
    instruction is not a property of this image, and confirming it needs the remote.
    """

    PORTS = frozenset({0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86})
    READS = ('BTFSS', 'BTFSC', 'MOVF')
    BOOTLOADER_END = 0x1000

    def port_access(self, code, low, high, reads_only):
        out = []
        for off in range(low, min(high, len(code) - 1), 2):
            ins = isa.decode(code, off, 0)
            if ins is None or ins.fields.get('a') != 0:
                continue
            if ins.fields.get('f') not in self.PORTS:
                continue
            if reads_only and ins.mnemonic not in self.READS:
                continue
            out.append((off, ins.mnemonic))
        return out

    def test_the_bootloader_reads_no_port_at_all(self):
        """
        So the key cannot be tested there. Both halves asserted: no reads, and writes present, since
        "no reads" from a scan that finds nothing at all would prove only that the scan is broken.
        """
        lab.require('one_internal_fe')
        code = lab.load('one_internal_fe')
        self.assertEqual(self.port_access(code, 0, self.BOOTLOADER_END, True), [])
        writes = self.port_access(code, 0, self.BOOTLOADER_END, False)
        self.assertEqual(len(writes), 13, 'port writes in the bootloader, which is the positive half')

    def test_the_safe_mode_image_does_read_the_matrix(self):
        """The positive control for the scan, and consistent with a mode that answers buttons."""
        lab.require('one_internal_fe')
        code = lab.load('one_internal_fe')
        reads = self.port_access(code, self.BOOTLOADER_END, 0x8000, True)
        self.assertEqual(len(reads), 15, 'port reads above the bootloader, so safe mode does scan')

    def test_no_literal_config_base_reaches_the_table_pointer(self):
        """
        The remaining thread, recorded as a measurement: the config base arrives in a variable, so
        neither container address appears as a literal into TBLPTRU. Zero sites, which is why the
        obvious search for the safe mode container's address finds nothing.
        """
        lab.require('one34_code')
        code = lab.load('one34_code')
        base, tblptru, sites = 0x020000, 0xFF8, 0
        for off in range(0, len(code) - 3, 2):
            a = isa.decode(code, off, base)
            b = isa.decode(code, off + 2, base)
            if a is None or b is None:
                continue
            if a.mnemonic == 'MOVLW' and b.mnemonic == 'MOVWF' and b.fields.get('f') == tblptru:
                sites += 1
        self.assertEqual(sites, 0)


class TestTheArch9SafeModeImageIsNotTheApplication(unittest.TestCase):
    """Section 118. Entering safe mode on arch 9 overwrites the application, so the images differ.

    The live remote is not available to a test run, so what is asserted here is the half that lives
    in the dump: the application's own accessors, and the absence of the safe mode ones. That
    absence is what proved the resident image is a different one, so it is the assertion worth
    keeping. The measured live bytes are in the section.
    """

    NAME = 'h525_code'
    # Section 87's five accessors, in order: firmware version, software type, skin, platform,
    # architecture. Read off the live remote as 30 / 0 / 22 / 9 / 9 running normally.
    APPLICATION_ACCESSORS = 0x05774
    APPLICATION = (0x30, 0x00, 0x16, 0x09, 0x09)
    # What the same five must be in the image that answers in safe mode, from the version reply
    # `20 25 12 ff 94 16 00` measured on 11 August 2026.
    SAFE_MODE = (0x20, 0x04, 0x16, 0x00, 0x09)

    def test_the_application_carries_its_five_accessors_where_expected(self):
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        for i, value in enumerate(self.APPLICATION):
            addr = self.APPLICATION_ACCESSORS + 2 * i
            with self.subTest(field=i):
                ins = isa.decode(code, addr, 0)
                self.assertEqual(ins.mnemonic, 'RETLW')
                self.assertEqual(ins.fields['k'], value)

    def test_the_safe_mode_accessors_are_nowhere_in_the_dump(self):
        """
        The negative that identifies the resident image as a different one. Searched as the RETLW
        run it would have to be, not as bare bytes, so a coincidental data match cannot satisfy it.
        """
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        run = b''.join(bytes([value, 0x0C]) for value in self.SAFE_MODE)
        self.assertEqual(code.find(run), -1)
        # The control: the application's own run is found this way, so the search works.
        control = b''.join(bytes([value, 0x0C]) for value in self.APPLICATION)
        self.assertEqual(code.find(control), self.APPLICATION_ACCESSORS)

    def test_the_application_fills_the_part_leaving_no_room_for_a_second_image(self):
        """
        The mechanism behind the overwrite, from the dump alone: 32 KiB, a 4 KiB bootloader and an
        application that populates almost all of the rest. A second image would have to fit somewhere
        in here, and there is nowhere.

        Scoped to internal program flash on purpose. Both images are resident in **external** flash,
        which is where the one this erases comes from, so the crowding is what makes the copy
        destructive rather than what makes safe mode a transfer.
        `TestTheStagedFirmwareSurvivedSafeMode` is that half.
        """
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        self.assertEqual(len(code), 0x8000)
        populated = sum(1 for b in code[0x1000:0x8000] if b != 0xFF)
        self.assertGreater(populated / (0x8000 - 0x1000), 0.95)


class TestArch9AddressesFourWindowsBelowItsFlash(unittest.TestCase):
    """Section 119. What the protocol calls flash 0x200000 is the on chip EEPROM.

    The validator is an XORLW chain, so it is decoded with `chains` and never read literally. Both
    the application and the safe mode image carry it, which is the two sample requirement met inside
    one architecture by two independently built programs.

    Section 88 read this validator from its default arm and reported only the flash range, which is
    why `packages/usb` refused three regions the device serves. Asserted here as the chain, so the
    same mistake cannot be made by reading from the middle again.
    """

    # Where the chain starts in each image, and the base each image loads at.
    APPLICATION = ('h525_code', 0x0000, 0x02E14)
    SAFE_MODE = ('h525_safemode_firmware', 0x1000, 0x01836)
    # Top byte to the offset bound its arm subtracts against. Every bound is a documented size of the
    # PIC18F4550, which is the closure: the chain and the datasheet agree without either being fitted
    # to the other.
    WINDOWS = {0x00: 0x8000, 0x20: 0x0100, 0x30: 0x0008, 0x40: 0x0800}

    def _chain(self, name, base, start):
        lab.require(name)
        return chains.chain_table(lab.load(name), base, start + 4)

    def _windows(self, name, base, start):
        """Decode each arm's own bound, so `WINDOWS` is a reading rather than four restated numbers.

        An arm is a sixteen bit compare, `MOVLW lo; SUBWF; MOVLW hi; SUBWFB; BC out`, so the bound is
        `lo | hi << 8`. Until 13 August 2026 both tests here compared `sorted(table)` against this
        dict, which takes its **keys**: the four top bytes were checked twice and the four bounds by
        nothing at all, in the one table whose values are what a read is refused against.
        """
        data = lab.load(name)
        found = {}
        for top, target in self._chain(name, base, start).items():
            low = isa.decode(data, target - base, base)
            high = isa.decode(data, target + 4 - base, base)
            self.assertEqual([low.mnemonic, high.mnemonic], ['MOVLW', 'MOVLW'],
                             'the arm at %s is not the compare this reads' % hex(target))
            found[top] = low.fields['k'] | (high.fields['k'] << 8)
        return found

    def test_both_images_test_the_same_four_top_bytes(self):
        for name, base, start in (self.APPLICATION, self.SAFE_MODE):
            with self.subTest(image=name):
                self.assertEqual(self._windows(name, base, start), self.WINDOWS)

    def test_the_flash_range_test_is_the_default_arm_and_not_the_whole_rule(self):
        """
        The correction. Section 88 quoted 0x02E30, which is inside the fall through, so its rule is
        what an unmatched top byte gets. The four cases are tested above it, and 0x02E30 is past the
        last of their branches.
        """
        name, base, start = self.APPLICATION
        table = self._chain(name, base, start)
        # An `all(target < X or target > X)` line used to stand here, which is `target != X` written
        # so that it reads as two bounds, and the line below already implies it. Removed rather than
        # corrected: two assertions where the weaker one is a rearrangement of the stronger make a
        # test look like it checks more than it does.
        #
        # Every case branches forward past the range test, so none of them reaches it.
        self.assertTrue(all(target > 0x02E30 for target in table.values()))
        self.assertTrue(table, 'the chain decoded to nothing, so nothing was checked')

    def test_the_eeprom_arm_reaches_EEADR_and_EEDATA_in_both_images(self):
        """
        What names the window. A bound of 256 would fit several things; the register does not.
        """
        for name, base, helper in (('h525_code', 0x0000, 0x07D68),
                                   ('h525_safemode_firmware', 0x1000, 0x034FE)):
            with self.subTest(image=name):
                lab.require(name)
                text = '\n'.join(disasm.disassemble(lab.load(name), base, helper, 6, part='4550'))
                self.assertIn('EEADR', text)
                self.assertIn('EEDATA', text)

    def test_the_safe_mode_image_can_write_the_eeprom_as_well_as_read_it(self):
        """
        Necessary for a one byte recovery to exist: the write arrives at a remote running the safe
        mode image, not the application. Write enable is EECON1 bit 2, so the literal 0x04 into
        EECON1 is what distinguishes a write path from a read path.
        """
        lab.require('h525_safemode_firmware')
        text = '\n'.join(disasm.disassemble(
            lab.load('h525_safemode_firmware'), 0x1000, 0x0350A, 8, part='4550'))
        self.assertIn('EEADR', text)
        self.assertIn('EEDATA', text)
        self.assertIn('EECON1', text)

    def test_the_library_serves_the_windows_the_firmware_serves(self):
        """
        The executable half of the correction, on the Python side of the mirror. The TypeScript
        assertion is in `packages/usb/test/protocol.test.ts`; this one exists so the bound table and
        the chain cannot drift apart without a Python test failing too.

        It used to repeat the line above it verbatim, which compares the chain's case values against
        this dict's keys and reaches `packages/usb` not at all, so nothing here had ever checked the
        claim in its own title. Section 88 is why that matters: reading this validator from its
        default arm made the library refuse three regions the device serves. The library's copy is
        read out of the TypeScript source rather than restated, because two copies of a derivation is
        this repository's oldest rule and a third would be worse than the second.
        """
        name, base, start = self.APPLICATION
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            '..', 'packages', 'usb', 'src', 'protocol.ts')
        with open(path, encoding='utf-8') as fh:
            source = fh.read()
        body = source[source.index('ARCH9_WINDOWS'):]
        body = body[:body.index('};')]
        library = {int(top, 16): int(bound, 16) for top, bound in
                   re.findall(r'(0x[0-9a-fA-F]+):\s*\{[^}]*bound:\s*(0x[0-9a-fA-F]+)', body)}
        self.assertEqual(library, self._windows(name, base, start),
                         'the arch 9 windows disagree between the firmware and the library')


class TestTheArch9BootStateMachine(unittest.TestCase):
    """Section 119. EEPROM byte 0 selects which of the two external images the bootloader installs.

    Read out of the bootloader, which is the first 4 KiB of `h525_code`. This is what makes safe mode
    latched, and the measured value on the stranded remote refuted the reading's first version: the
    latch is passive, not an active reinstall.
    """

    NAME = 'h525_code'
    CHAIN = 0x007AC
    # Case value to the arm it dispatches to.
    CASES = {0x01: 0x007F2, 0x02: 0x007C0, 0x05: 0x007F2, 0x06: 0x007BE}

    def test_the_state_byte_comes_from_the_eeprom(self):
        lab.require(self.NAME)
        text = '\n'.join(disasm.disassemble(lab.load(self.NAME), 0x0000, 0x00AD0, 5, part='4550'))
        self.assertIn('EECON1', text)
        self.assertIn('EEADR', text)
        self.assertIn('EEDATA', text)

    def test_the_chain_dispatches_the_four_states_it_dispatches(self):
        lab.require(self.NAME)
        table = chains.chain_table(lab.load(self.NAME), 0x0000, self.CHAIN)
        self.assertEqual(table, self.CASES)

    def test_state_two_selects_the_application_and_marks_it_four(self):
        """
        concordance's byte, confirmed from the firmware rather than believed on its word. The arm
        writes 4 to EEPROM address 0 and sets the image selector to 1.
        """
        lab.require(self.NAME)
        text = '\n'.join(disasm.disassemble(lab.load(self.NAME), 0x0000, 0x007C0, 11, part='4550'))
        self.assertIn('MOVLW 0x04', text)      # the value written back
        self.assertIn('CALL 0x00adc', text)    # the EEPROM write helper
        self.assertIn('MOVLW 0x01', text)      # the selector: the application
        self.assertIn('CALL 0x00422', text)    # the install routine

    def test_state_one_selects_the_safe_mode_image_and_marks_it_three(self):
        """The mirror arm, which is what a remote that has been told to enter safe mode takes."""
        lab.require(self.NAME)
        text = '\n'.join(disasm.disassemble(lab.load(self.NAME), 0x0000, 0x007F2, 8, part='4550'))
        self.assertIn('MOVLW 0x03', text)
        self.assertIn('CALL 0x00adc', text)
        self.assertIn('CLRF 0x09a', text)      # the selector: safe mode

    def test_three_and_four_are_folded_before_the_chain_so_an_interrupted_install_retries(self):
        """
        Which is why the chain has no case for them, and why neither is a dead end. This is the power
        fail interlock: the mark back is the same value that requests the retry.
        """
        lab.require(self.NAME)
        text = '\n'.join(disasm.disassemble(lab.load(self.NAME), 0x0000, 0x00788, 12, part='4550'))
        self.assertIn('MOVLW 0x03', text)
        self.assertIn('MOVLW 0x04', text)
        table = chains.chain_table(lab.load(self.NAME), 0x0000, self.CHAIN)
        self.assertNotIn(0x03, table)
        self.assertNotIn(0x04, table)

    def test_the_selector_names_the_two_external_images(self):
        """
        The selector becomes a chip address: 0x010004 for the application and 0x000004 for safe mode,
        the +4 being firmware_4847_offset and the `HG` magic the bootloader checks before copying.
        """
        lab.require(self.NAME)
        text = '\n'.join(disasm.disassemble(lab.load(self.NAME), 0x0000, 0x00422, 24, part='4550'))
        self.assertIn('DECF 0x09a', text)
        self.assertIn('MOVLW 0x04', text)      # the offset of the magic
        self.assertIn('MOVLW 0x48', text)      # 'H'
        self.assertIn('MOVLW 0x47', text)      # 'G'
        # The two arms differ in one byte, the high byte of the chip address: 0x01 for the
        # application and cleared for safe mode. That is the whole of the selection.
        self.assertIn('MOVLW 0x01\n  00434: 02 6f       MOVWF 0x202', text)
        self.assertIn('CLRF 0x202', text)

    def test_a_successful_install_leaves_six_and_the_application_clears_it(self):
        """
        The step the first reading of this section missed, and the measured zero is what found it. The
        bootloader's 3 and 4 are in progress marks written before the copy; on success it writes 6 and
        jumps to the application entry point, and the application consumes the 6 by writing 0 and
        setting a status bit. That bit is why a recovered remote says so on its screen.
        """
        lab.require(self.NAME)
        code = lab.load(self.NAME)
        after = '\n'.join(disasm.disassemble(code, 0x0000, 0x0082A, 10, part='4550'))
        self.assertIn('MOVF 0x20c', after)      # the success flag
        self.assertIn('MOVLW 0x06', after)      # the value written on success
        self.assertIn('CALL 0x00adc', after)    # the EEPROM write helper
        self.assertIn('GOTO 0x01008', after)    # the application entry point
        consumer = '\n'.join(disasm.disassemble(code, 0x0000, 0x07900, 18, part='4550'))
        self.assertIn('MOVLW 0x06', consumer)    # what it compares against
        self.assertIn('CALL 0x07d74', consumer)  # the application's EEPROM write
        self.assertIn('CLRF 0x25e', consumer)    # EEDATA = 0
        self.assertIn('CLRF 0x25d', consumer)    # EEADR = 0
        # The status bit, which is the only other thing this path does and therefore what makes the
        # 6 a message. Matched on the bit number rather than the spacing of the mnemonic.
        self.assertRegex(consumer, r'BSF 0x109\s*,\s*5')

    def test_a_failed_application_install_falls_back_to_safe_mode(self):
        """
        The safety net. Both failure branches of the value 2 arm land on the value 1 arm, so a remote
        whose application copy goes wrong ends up in safe mode rather than with nothing bootable.
        """
        lab.require(self.NAME)
        text = '\n'.join(disasm.disassemble(lab.load(self.NAME), 0x0000, 0x007D4, 12, part='4550'))
        self.assertEqual(text.count('BZ 0x007f2'), 2)
        # And 0x007F2 is the arm that installs the safe mode image, which the test above pins.
        self.assertIn('CALL 0x00422', text)

    def test_state_zero_installs_nothing_which_is_why_the_latch_is_passive(self):
        """
        The measured value on the stranded 525, and the arm that refutes the first reading. Normal
        boot validates the `HG` of whatever is already in internal program flash and runs it, so
        safe mode persists by being resident rather than by being reinstalled.
        """
        lab.require(self.NAME)
        table = chains.chain_table(lab.load(self.NAME), 0x0000, self.CHAIN)
        self.assertNotIn(0x00, table)
        text = '\n'.join(disasm.disassemble(lab.load(self.NAME), 0x0000, 0x003BA, 10, part='4550'))
        self.assertIn('MOVLW 0x48', text)
        self.assertIn('MOVLW 0x47', text)
        # And no EEPROM write on this path, which is what "installs nothing" means concretely.
        self.assertNotIn('CALL 0x00adc', text)


class TestTheStagedFirmwareSurvivedSafeMode(unittest.TestCase):
    """Section 118. Two resident arch 9 images in external flash, and the internal region is a copy.

    The claim these pin is not "external flash holds firmware", which section 118 argues from
    concordance's table. It is the narrower measured one, in three parts: the copy read while the
    remote was stranded in safe mode is byte identical to the copy read before any of it happened;
    the 64 KiB below it is a second, distinct image carrying the accessor values a safe mode remote
    reports; and internal program flash right now is a copy of that lower image. So entering safe
    mode is a copy between two images the remote already holds, and leaving it is the other copy.
    """

    APPLICATION = 0x1000
    END = 0x8000
    LENGTH = END - APPLICATION

    def test_the_safe_mode_read_matches_the_running_application(self):
        lab.require('h525_staged_firmware', 'h525_code')
        staged = lab.load('h525_staged_firmware')
        code = lab.load('h525_code')
        self.assertEqual(len(staged), self.LENGTH)
        self.assertEqual(staged, code[self.APPLICATION:self.END])

    def test_the_safe_mode_read_matches_the_august_read_of_the_same_address(self):
        """
        The second leg, and the reason the correction in section 118 was owed: this read was offered
        as a missing backup when the lab already held the whole region. It is a confirmation, and a
        confirmation needs the earlier copy to compare against.
        """
        lab.require('h525_staged_firmware', 'h525_external_firmware')
        staged = lab.load('h525_staged_firmware')
        external = lab.load('h525_external_firmware')
        self.assertGreaterEqual(len(external), len(staged))
        self.assertEqual(staged, external[:len(staged)])

    def test_the_august_read_holds_the_safe_mode_container_above_the_application(self):
        """
        Why the earlier read is longer, and the check that its tail is content rather than erased
        flash: the arch 9 safe mode container sits at region offset 0x8000, which is flash 0x818000.
        """
        lab.require('h525_external_firmware')
        external = lab.load('h525_external_firmware')
        self.assertEqual(len(external), 0x10000)
        self.assertEqual(external[self.END:self.END + 4], b'AHCM')

    def test_the_two_external_images_are_distinct_and_each_holds_one_accessor_run(self):
        """
        The pair that explains the overwrite: both images live in external flash, so the single
        internal application region holds whichever one the bootloader copied in.

        The accessor runs are what identify them, and they identify them exclusively: the safe mode
        values are in the lower image and nowhere in the upper one, and the application's are the
        other way round. Asserted as the `RETLW` run rather than as bare bytes, for the same reason
        as the search above.
        """
        lab.require('h525_safemode_firmware', 'h525_external_firmware')
        safemode = lab.load('h525_safemode_firmware')
        staged = lab.load('h525_external_firmware')
        self.assertNotEqual(safemode, staged)
        # Section 87's five accessors, as the remote reports them in each state. The safe mode row is
        # the version reply `20 25 12 ff 94 16 00` measured on 11 August 2026.
        safe_run = b''.join(bytes([v, 0x0C]) for v in (0x20, 0x04, 0x16, 0x00, 0x09))
        app_run = b''.join(bytes([v, 0x0C]) for v in (0x30, 0x00, 0x16, 0x09, 0x09))
        self.assertEqual(safemode.find(safe_run), 0x1406)
        self.assertEqual(safemode.find(app_run), -1)
        self.assertEqual(staged.find(app_run), 0x4774)
        self.assertEqual(staged.find(safe_run), -1)

    def test_the_internal_region_read_in_safe_mode_is_a_copy_of_the_lower_image(self):
        """
        The measured window, pinned so the image and the device cannot drift apart.

        62 bytes read off the stranded remote at internal `0x002400`, which under the convention the
        0x810000 read established is external file offset `0x1400`. Written down as a prediction
        before the read and confirmed by it, along with the negative: internal `0x001406`, where the
        other convention would have put the run, holds something else.
        """
        lab.require('h525_safemode_firmware')
        safemode = lab.load('h525_safemode_firmware')
        live = bytes.fromhex(
            '9b6f7fef1af0200c040c160c000c090ce2c3eef0e3c3eff072ec16f00001'
            'da5103e115ec16f0fad7120090ec1bf0ffec0bf03dec19f0deec0bf0deec0bf0')
        self.assertEqual(len(live), 62)
        self.assertEqual(safemode[0x1400:0x1400 + len(live)], live)
        # The negative window, also read off the remote. It is not the run, and the assertion is
        # against the live bytes rather than against the image, since the point is what the device
        # holds.
        other = bytes.fromhex('e552e5cfdaff110000001dd889 9a0001'.replace(' ', ''))
        self.assertEqual(len(other), 16)
        self.assertNotIn(b''.join(bytes([v, 0x0C]) for v in (0x20, 0x04)), other)

    def test_the_three_copies_are_not_trivially_equal(self):
        """
        The negative. Comparing 0xFF against 0xFF would satisfy every assertion above, so the shared
        bytes have to be an image: mostly populated, and carrying the arch 9 firmware header.
        """
        lab.require('h525_staged_firmware')
        staged = lab.load('h525_staged_firmware')
        self.assertEqual(staged[4:6], b'HG')
        populated = sum(1 for b in staged if b != 0xFF)
        self.assertGreater(populated / len(staged), 0.95)


if __name__ == '__main__':
    unittest.main()
