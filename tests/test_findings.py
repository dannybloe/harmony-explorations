"""
Regression tests for every documented finding.

The analysis in docs/ was produced by an AI and is published as such, so the claims need
to be executable rather than merely written down. Each test here pins one statement from
docs/findings.md. If a refactor breaks a conclusion, this is where it shows up.
"""
import unittest

import lab
from harmony import firmware, gspm
from harmony.pic18 import disasm, isa, trace


class TestFirmwareHeader(unittest.TestCase):
    # logical name -> (version, family byte, size field, true size)
    EXPECTED = {
        'one34_code': ('3.4', 0x00, 0xEA8A, 0x0EA92),
        'h700_code': ('2.8', 0x01, 0x2B78, 0x12B80),
        'h600_code': ('0.2', 0x01, 0x12B8, 0x112C0),
    }

    def test_header_fields(self):
        for name, (version, family, size_field, _) in self.EXPECTED.items():
            with self.subTest(image=name):
                h = firmware.parse_header(lab.load(name))
                self.assertEqual(h.version, version)
                self.assertEqual(h.family_byte, family)
                self.assertEqual(h.size_field, size_field)
                self.assertTrue(h.has_magic, '0x48 0x47 magic at offset 8')

    def test_size_field_encodes_length_minus_eight(self):
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
        if code is None:
            self.skipTest('the complete 600 image is not in this lab')
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
        if old is None or new is None:
            self.skipTest('need both 600 images')
        self.assertEqual(old, new[:len(old)], 'the complete image contains the truncated one')

    def test_recover_size_checks_rather_than_guesses_when_it_can(self):
        """It used to take the smallest candidate at least as long as the buffer.

        Right for a truncated file, wrong for a buffer holding more than the image, which is what
        reading the memory around an image produces: it answered 135872 for the 600. A candidate
        inside the buffer can have its checksum verified instead.
        """
        code = lab.load('h600_code_complete')
        if code is None:
            self.skipTest('the complete 600 image is not in this lab')
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
        """
        stored = 263
        cycles = stored * 4 // 10
        self.assertEqual(cycles, 105)
        microseconds = cycles / 4.0          # 4 instruction cycles per microsecond
        self.assertAlmostEqual(microseconds, 26.25, places=2)


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


if __name__ == '__main__':
    unittest.main()
