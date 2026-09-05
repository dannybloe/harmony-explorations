"""Section 267: the Harmony 525's flash erase and write, read out of its application image.

Every assertion here is a byte at a stated address in `h525_code`, whose load base is `0x0000`, so
a file offset and an address are the same number. That shape is deliberate: the claims the section
makes are about which SPI opcode the firmware sends and which addresses it will accept, and an
assertion that decodes the whole routine would be asserting the disassembler.

The one exception is the last test, which scans the image rather than reading one address, because
the claim it pins is a negative: that a routine which looks like the write path has no caller.
"""

import unittest

import lab

# file offset -> the two bytes that must be there, and what they mean
ERASE_AND_WRITE_OPCODES = {
    0x0752C: (b'\x06\x0e', 'write enable, 0x06'),
    0x07532: (b'\x04\x0e', 'write disable, 0x04'),
    0x0753A: (b'\x05\x0e', 'read status register, 0x05'),
    0x0756C: (b'\x03\x0e', 'read data, 0x03'),
    0x0757A: (b'\xd8\x0e', 'block erase, 0xD8, which is what makes the block 64 KiB'),
    0x07642: (b'\x02\x0e', 'page program, 0x02'),
    0x0764C: (b'\xab\x0e', 'release from deep power down, 0xAB'),
}


class TheHarmony525DrivesItsFlashOverSPI(unittest.TestCase):
    """The driver is the Harmony 700's, section 13, with the chip select on a different pin."""

    def setUp(self):
        lab.require('h525_code')
        self.code = lab.load('h525_code')

    def test_the_spi_nor_opcodes_are_where_the_section_says(self):
        for addr, (want, what) in sorted(ERASE_AND_WRITE_OPCODES.items()):
            with self.subTest(hex(addr), what=what):
                self.assertEqual(self.code[addr:addr + 2], want, what)

    def test_the_chip_select_is_LATE_bit_2(self):
        # 0x07524 pulses it high then low to start a command. LATE is 0xF8D on the PIC18F4550, so
        # `8d 84` is BSF LATE,2 and `8d 94` is BCF LATE,2. Arch 14 (Harmony 700) uses LATF bit 7,
        # and that difference is the only thing separating the two drivers.
        self.assertEqual(self.code[0x07524:0x07528], b'\x8d\x84\x8d\x94')

    def test_the_erase_waits_for_the_part_before_returning(self):
        # ANDLW 0x01 then a branch back, which is the write in progress bit of the status register.
        self.assertEqual(self.code[0x07584:0x07586], b'\x01\x0b')
        self.assertEqual(self.code[0x07586:0x07588], b'\xfd\xe1')  # BNZ back to the RDSR

    def test_the_write_reissues_write_enable_for_every_single_byte(self):
        # 0x0758E is the whole per byte transaction and the loop at 0x0652E calls it once per byte:
        # RCALL 0x0752a (write enable), RCALL 0x07640 (select, 0x02, address), the data byte, end,
        # poll, then GOTO 0x07530 (write disable). No page buffer is ever filled, so a writer has no
        # page boundary to respect and pays a status round trip per byte.
        self.assertEqual(self.code[0x0758E:0x07590], b'\xcd\xdf')          # RCALL 0x0752a
        self.assertEqual(self.code[0x07590:0x07592], b'\x57\xd8')          # RCALL 0x07640
        self.assertEqual(self.code[0x075A4:0x075A8], b'\x98\xef\x3a\xf0')  # GOTO 0x07530
        self.assertEqual(self.code[0x0654E:0x06552], b'\xc7\xec\x3a\xf0')  # CALL 0x0758e, per byte


class TheInterlockProtectsTheFirmwareAndNotTheConfiguration(unittest.TestCase):
    """The finding with a consequence: nothing guards the external flash path.

    `0x06500` resets the processor unless `0x105` holds 0xAC, and it is called by the two internal
    program flash routines and by nothing else. So a self programming call reached by any route but
    a command handler kills the remote's current boot, and an external flash erase reached the same
    way simply happens.
    """

    def setUp(self):
        lab.require('h525_code')
        self.code = lab.load('h525_code')

    def test_the_guard_resets_rather_than_returning_a_failure(self):
        self.assertEqual(self.code[0x06500:0x06502], b'\xac\x0e')  # MOVLW 0xac
        self.assertEqual(self.code[0x06508:0x0650A], b'\xff\x00')  # RESET
        self.assertEqual(self.code[0x0650A:0x0650C], b'\x12\x00')  # RETURN

    def test_the_erase_handler_arms_it_before_the_selector_switch(self):
        # 0x02F7C arms, 0x02FAC clears on the way out. The arming sits above the switch, so it
        # covers the internal arm whichever selector arrives.
        self.assertEqual(self.code[0x02F7C:0x02F7E], b'\xac\x0e')
        self.assertEqual(self.code[0x02FAC:0x02FAE], b'\x05\x6b')  # CLRF 0x105

    def test_the_external_flash_arm_reaches_the_erase_without_consulting_the_guard(self):
        # 0x02F9E is the arm: RCALL 0x03500 to load the address, then CALL 0x0655C, which is a bare
        # GOTO to the erase at 0x07576. Three instructions, no test of 0x105 among them.
        self.assertEqual(self.code[0x02F9E:0x02FA0], b'\xb0\xda')          # RCALL 0x03500
        self.assertEqual(self.code[0x02FA0:0x02FA4], b'\xae\xec\x32\xf0')  # CALL 0x0655c
        self.assertEqual(self.code[0x0655C:0x06560], b'\xbb\xef\x3a\xf0')  # GOTO 0x07576


class TheAcceptedAddressesAreTheWholePart(unittest.TestCase):
    """Why our own rail is the only bound on an erase.

    The classifier at 0x02E14 tests the top byte against 0x80 and 0x88 and subtracts 0x80 out of it,
    so tags 0x80 to 0x87 become chip addresses 0x000000 to 0x07FFFF. That is eight 64 KiB blocks and
    a 512 KiB part, which closes against `docs/memory-map-525.md`'s figure from an unrelated route.
    """

    def setUp(self):
        lab.require('h525_code')
        self.code = lab.load('h525_code')

    def test_the_external_window_runs_from_0x80_to_0x87_inclusive(self):
        self.assertEqual(self.code[0x02E30:0x02E32], b'\x80\x0e')  # MOVLW 0x80, the floor
        self.assertEqual(self.code[0x02E46:0x02E48], b'\x88\x0e')  # MOVLW 0x88, the exclusive top

    def test_the_tag_is_subtracted_out_so_the_part_sees_a_clean_address(self):
        self.assertEqual(self.code[0x02E92:0x02E94], b'\x80\x0e')  # MOVLW 0x80
        self.assertEqual(self.code[0x02E94:0x02E96], b'\x7f\x6f')  # MOVWF 0x27f, the selector
        self.assertEqual(self.code[0x02E96:0x02E98], b'\x7b\x5f')  # SUBWF 0x27b,F, the top byte
        self.assertEqual(self.code[0x02E98:0x02E9A], b'\x01\x0c')  # RETLW 0x01, accepted

    def test_the_eight_tags_cover_the_part_exactly(self):
        # Not arithmetic for its own sake: this is the closure between the command's accepted range
        # and the erase opcode's granularity, and it is what makes 64 KiB the block size rather than
        # an assumption carried over from arch 12 (Harmony One).
        tags = 0x88 - 0x80
        self.assertEqual(tags * 0x10000, 512 * 1024)


class TheRoutineThatHoistsWriteEnableIsDead(unittest.TestCase):
    """0x075A8 reads as the obvious write loop and nothing calls it.

    Recorded because a later session finding it would reasonably take it for the write path, and on
    a standard part it would not work: a program cycle clears the write enable latch, so only its
    first byte would land. The live path is 0x0758E, which re-enables per byte.
    """

    def test_no_instruction_in_the_image_reaches_it(self):
        lab.require('h525_code')
        code = lab.load('h525_code')
        target = 0x075A8
        word = target // 2
        callers = []
        for opcode in (0xEF, 0xEC):  # GOTO, CALL
            pattern = bytes([word & 0xFF, opcode, (word >> 8) & 0xFF, 0xF0])
            start = 0
            while True:
                start = code.find(pattern, start)
                if start < 0:
                    break
                callers.append(start)
                start += 2
        for offset in range(0, len(code) - 1, 2):
            value = code[offset] | (code[offset + 1] << 8)
            if value >> 11 in (0b11010, 0b11011):  # BRA, RCALL
                delta = value & 0x7FF
                if delta & 0x400:
                    delta -= 0x800
                if offset + 2 + 2 * delta == target:
                    callers.append(offset)
        self.assertEqual(callers, [], 'section 267 says this routine is unreachable')


if __name__ == '__main__':
    unittest.main()
