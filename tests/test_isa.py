"""
The opcode table, pinned against the datasheet.

This file exists because two encodings in this project were once wrong in a way that
produced readable but incorrect listings: SUBFWB/SUBWFB were swapped, inverting an
arithmetic expression, and BTFSC/BTFSS were swapped, inverting the sense of every bit
test. Neither failed loudly. Both are asserted here.
"""
import unittest

import lab  # noqa: F401  (puts src on sys.path)
from harmony.pic18 import isa


def dec(word, second=None):
    blob = word.to_bytes(2, 'little')
    if second is not None:
        blob += second.to_bytes(2, 'little')
    return isa.decode(blob, 0)


class TestBitOperationEncodings(unittest.TestCase):
    """BTFSS is 1010, BTFSC is 1011. Getting this wrong inverts every conditional."""

    def test_bit_op_high_nibbles(self):
        self.assertEqual(isa.BIT_OPS[0x7], 'BTG')
        self.assertEqual(isa.BIT_OPS[0x8], 'BSF')
        self.assertEqual(isa.BIT_OPS[0x9], 'BCF')
        self.assertEqual(isa.BIT_OPS[0xA], 'BTFSS')
        self.assertEqual(isa.BIT_OPS[0xB], 'BTFSC')

    def test_decodes_bit_number_and_access_flag(self):
        # 1010 bbba ffffffff with b=2, a=0, f=0xF2 -> BTFSS INTCON,2
        instr = dec(0xA4F2)
        self.assertEqual(instr.mnemonic, 'BTFSS')
        self.assertEqual(instr.fields['b'], 2)
        self.assertEqual(instr.fields['a'], 0)
        addr, name = isa.resolve_file(instr.fields['f'], instr.fields['a'])
        self.assertEqual(addr, 0xFF2)
        self.assertEqual(name, 'INTCON')

    def test_semantic_check_against_a_real_wait_loop(self):
        """
        A polarity check that does not depend on the datasheet.

        The Harmony 700 firmware waits for a timer overflow at 0x195F2 with:

            195f2: f2 a4   BTFSx INTCON,2
            195f4: fe d7   BRA   0x195f2

        Read as BTFSS (skip if set) this is "loop until TMR0IF is set", which is a
        correct wait. Read as BTFSC it would be "loop while the flag is set", which
        would spin forever once the timer overflowed. Only one reading is coherent.
        """
        test = dec(0xA4F2)
        self.assertEqual(test.mnemonic, 'BTFSS')
        branch = isa.decode((0xD7FE).to_bytes(2, 'little'), 0, base=0x195F4)
        self.assertEqual(branch.mnemonic, 'BRA')
        self.assertEqual(branch.fields['target'], 0x195F2, 'branch should loop to itself')


class TestArithmeticEncodings(unittest.TestCase):
    """SUBFWB is 0x54-0x57, SUBWFB is 0x58-0x5B, SUBWF is 0x5C-0x5F."""

    def test_subtract_family_ranges(self):
        self.assertEqual(isa.FILE_DA_OPS[0x54], 'SUBFWB')
        self.assertEqual(isa.FILE_DA_OPS[0x58], 'SUBWFB')
        self.assertEqual(isa.FILE_DA_OPS[0x5C], 'SUBWF')

    def test_real_instruction_from_the_ir_scaling_block(self):
        # 0x558D at 0x19476: computes W = 0x65 - value, the NOP sled index inversion.
        instr = dec(0x558D)
        self.assertEqual(instr.mnemonic, 'SUBFWB')
        self.assertEqual(instr.fields['d'], 0, 'result goes to W')
        self.assertEqual(instr.fields['a'], 1, 'banked')

    def test_increment_skip_family(self):
        self.assertEqual(isa.FILE_DA_OPS[0x3C], 'INCFSZ')
        self.assertEqual(isa.FILE_DA_OPS[0x48], 'INFSNZ')


class TestTableIntegrity(unittest.TestCase):
    def test_no_high_byte_claimed_twice(self):
        isa._check_tables()  # raises on conflict

    def test_every_high_byte_decodes_without_raising(self):
        for hi in range(0x100):
            for lo in (0x00, 0x55, 0xFF):
                dec((hi << 8) | lo, 0xF000)


class TestInstructionLengths(unittest.TestCase):
    """A wrong length desynchronises every linear scan downstream."""

    def test_two_word_instructions(self):
        self.assertEqual(dec(0xEF1C, 0xF175).words, 2)   # GOTO
        self.assertEqual(dec(0xEC37, 0xF16C).words, 2)   # CALL
        self.assertEqual(dec(0xC08D, 0xFDBC).words, 2)   # MOVFF
        self.assertEqual(dec(0xEE05, 0xF000).words, 2)   # LFSR

    def test_single_word_instructions(self):
        for word in (0x0012, 0x0E14, 0x6F5F, 0x0100, 0xD7FE, 0xA4F2):
            self.assertEqual(dec(word).words, 1, hex(word))

    def test_call_and_goto_target_arithmetic(self):
        # 0xEF1C 0xF175 -> k = 0x1751C, byte address = 0x2EA38
        self.assertEqual(dec(0xEF1C, 0xF175).fields['target'], 0x2EA38)
        # 0xEC37 0xF16C -> k = 0x16C37, byte address = 0x2D86E
        self.assertEqual(dec(0xEC37, 0xF16C).fields['target'], 0x2D86E)

    def test_trailing_word_is_flagged(self):
        self.assertEqual(dec(0xF175).category, isa.SECOND_WORD)


class TestKnownInstructions(unittest.TestCase):
    def test_common_encodings(self):
        cases = {
            0x0012: 'RETURN',
            0x0000: 'NOP',
            0x00FF: 'RESET',
            0x010F: 'MOVLB',
            0x0E14: 'MOVLW',
            0x6F5F: 'MOVWF',
            0x6BC7: 'CLRF',
            0x5165: 'MOVF',
            0x2415: 'ADDWF',
        }
        for word, mnemonic in cases.items():
            self.assertEqual(dec(word).mnemonic, mnemonic, hex(word))

    def test_movlb_literal(self):
        self.assertEqual(dec(0x010D).fields['k'], 0xD)


class TestSfrMapIsTheJ50FamilyNotTheGenericOne(unittest.TestCase):
    """
    The SFR table was the generic high-end PIC18 map and eight names were wrong here.

    Each address below sits at a different register on a classic part such as the
    PIC18F4550, so a regression to the generic map fails this test rather than quietly
    producing a readable but wrong listing. The USB block matters most: it is twenty six
    registers, and on the classic map those addresses are parallel port and CCP registers,
    so a whole USB driver would read as something else entirely.
    """

    def test_usb_registers_are_where_this_family_puts_them(self):
        self.assertEqual(isa.SFR[0xF65], 'UCON')     # 0xF6D on the classic map
        self.assertEqual(isa.SFR[0xF64], 'USTAT')
        self.assertEqual(isa.SFR[0xF62], 'UIR')
        self.assertEqual(isa.SFR[0xF5F], 'UCFG')
        self.assertEqual(isa.SFR[0xF5E], 'UADDR')
        self.assertEqual(isa.SFR[0xF4C], 'UEP0')     # 0xF70 on the classic map
        self.assertEqual(isa.SFR[0xF5B], 'UEP15')

    def test_the_moved_ccp_and_analogue_block(self):
        self.assertEqual(isa.SFR[0xFBB], 'CCP1CON')  # generic map says CCPR2L
        self.assertEqual(isa.SFR[0xFBC], 'CCPR1L')   # generic map says CCPR2H
        self.assertEqual(isa.SFR[0xFBD], 'CCPR1H')   # generic map says CCP1CON
        self.assertEqual(isa.SFR[0xFC0], 'WDTCON')   # generic map says ADCON2
        self.assertEqual(isa.SFR[0xFD1], 'CM2CON')   # generic map says WDTCON

    def test_no_adcon2_on_this_family(self):
        """A part with WDTCON at 0xFC0 has no room for ADCON2, so the name must be gone."""
        self.assertNotIn('ADCON2', isa.SFR.values())

    def test_the_eighty_pin_extras_are_present(self):
        """PORTH, PORTJ and their latch and direction registers exist on the 87J50 only."""
        for addr, name in ((0xF87, 'PORTH'), (0xF88, 'PORTJ'), (0xF90, 'LATH'),
                           (0xF91, 'LATJ'), (0xF99, 'TRISH'), (0xF9A, 'TRISJ')):
            self.assertEqual(isa.SFR[addr], name)


class TestAdshrSelectsAShadowRegister(unittest.TestCase):
    """
    WDTCON bit 4 swaps a second register in at ten addresses.

    Confirmed from the 700 2.8 image at 0x1B8BC, which writes 0xFC1 and 0xFC2 on both
    sides of the bit with different values. Without this, initialisation appears to write
    ADCON1 twice and contradict itself.
    """

    def test_the_bit_is_wdtcon_four(self):
        self.assertEqual(isa.ADSHR_REGISTER, 0xFC0)
        self.assertEqual(isa.SFR[isa.ADSHR_REGISTER], 'WDTCON')
        self.assertEqual(isa.ADSHR_BIT, 4)

    def test_shadow_names_replace_primary_names_at_the_shared_addresses(self):
        self.assertEqual(isa.sfr_name(0xFC1, adshr=False), 'ADCON1')
        self.assertEqual(isa.sfr_name(0xFC1, adshr=True), 'ANCON0')
        self.assertEqual(isa.sfr_name(0xFC2, adshr=False), 'ADCON0')
        self.assertEqual(isa.sfr_name(0xFC2, adshr=True), 'ANCON1')

    def test_unshared_addresses_ignore_the_bit(self):
        self.assertEqual(isa.sfr_name(0xF65, adshr=True), 'UCON')

    def test_every_shadow_address_also_has_a_primary_register(self):
        for addr in isa.SFR_SHADOW:
            self.assertIn(addr, isa.SFR, hex(addr))

    def test_resolve_file_passes_the_bit_through(self):
        # MOVWF 0xC1 with a=0 is 0x6EC1: the access bank, so the SFR page.
        instr = dec(0x6EC1)
        self.assertEqual(isa.resolve_file(instr.fields['f'], instr.fields['a'],
                                          adshr=False), (0xFC1, 'ADCON1'))
        self.assertEqual(isa.resolve_file(instr.fields['f'], instr.fields['a'],
                                          adshr=True), (0xFC1, 'ANCON0'))


if __name__ == '__main__':
    unittest.main()
