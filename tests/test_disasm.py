"""
Formatting and the two pieces of state a linear disassembly has to carry.

Bank tracking through MOVLB was always here. ADSHR tracking was added when the SFR map
was corrected: WDTCON bit 4 swaps a second register in at ten addresses, so a listing that
ignores it names the wrong register there. The evidence is a real code window rather than a
synthetic one, so this test doubles as the record of that window.
"""
import re
import unittest

import lab  # noqa: F401  (puts src on sys.path)
from harmony.pic18 import disasm

# A listing line is "  1b8bc: c2 6a       CLRF ADCON0": address, raw bytes, then the text.
_LINE = re.compile(r'^\s*([0-9a-f]+): ((?:[0-9a-f]{2} )+)\s*(.*)$')


def texts(blob, base=0, start=None, count=None):
    """The instruction text of each line, with the address and raw bytes stripped off."""
    start = base if start is None else start
    count = len(blob) // 2 if count is None else count
    out = []
    for line in disasm.disassemble(blob, base, start, count):
        match = _LINE.match(line)
        assert match, 'unparsable listing line: %r' % line
        out.append(match.group(3))
    return out


# The analogue pin configuration in the Harmony 700 2.8 image at 0x1B8BC. ADCON1 and
# ADCON0 are written, then the same two addresses are written again with ADSHR set, which
# is where ANCON0 and ANCON1 live. Read without the bit, the block writes ADCON1 twice.
ADSHR_WINDOW = bytes.fromhex('c26a 860e c16e c088 f80e c16e c268 c08e c098'.replace(' ', ''))


MOVWF_FC1 = bytes.fromhex('c16e')     # MOVWF 0xC1, access bank, so 0xFC1
MOVWF_5F_BANKED = bytes.fromhex('5f6f')  # MOVWF 0x5F, a=1, so bank comes from BSR
MOVLB_D = bytes.fromhex('0d01')
RETURN = bytes.fromhex('1200')


class TestAdshrTracking(unittest.TestCase):
    def test_the_shared_addresses_change_name_inside_the_window(self):
        self.assertEqual(texts(ADSHR_WINDOW, base=0x1B8BC), [
            'CLRF ADCON0',      # ADSHR still clear
            'MOVLW 0x86',
            'MOVWF ADCON1',     # ADSHR still clear
            'BSF WDTCON,4',     # ADSHR now set
            'MOVLW 0xf8',
            'MOVWF ANCON0',     # same address as ADCON1
            'SETF ANCON1',      # same address as ADCON0
            'BSF WDTCON,7',     # REGSLP, an unrelated bit, must not disturb the state
            'BCF WDTCON,4',     # ADSHR clear again
        ])

    def test_the_state_survives_to_the_end_of_the_window_only(self):
        """A write to 0xFC1 after the closing BCF is ADCON1 again."""
        self.assertEqual(texts(ADSHR_WINDOW + MOVWF_FC1, base=0x1B8BC)[-1],
                         'MOVWF ADCON1')

    def test_a_bit_operation_on_another_register_does_not_set_the_state(self):
        bsf_porta_4 = bytes.fromhex('8088')  # BSF 0x80,4 in the access bank, so PORTA
        self.assertEqual(texts(bsf_porta_4 + MOVWF_FC1)[-1], 'MOVWF ADCON1')


class TestBankTracking(unittest.TestCase):
    def test_banked_operand_is_unresolved_until_a_movlb(self):
        self.assertEqual(texts(MOVWF_5F_BANKED)[0], 'MOVWF 0x5f,B')

    def test_movlb_resolves_the_bank(self):
        self.assertEqual(texts(MOVLB_D + MOVWF_5F_BANKED)[-1], 'MOVWF 0xd5f')

    def test_control_flow_drops_the_bank_again(self):
        self.assertEqual(texts(MOVLB_D + RETURN + MOVWF_5F_BANKED)[-1], 'MOVWF 0x5f,B')


if __name__ == '__main__':
    unittest.main()
