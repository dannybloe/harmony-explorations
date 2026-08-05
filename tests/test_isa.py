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


if __name__ == '__main__':
    unittest.main()
