"""
Formatting and the two pieces of state a linear disassembly has to carry.

Bank tracking through MOVLB was always here. ADSHR tracking was added when the SFR map
was corrected: WDTCON bit 4 swaps a second register in at ten addresses, so a listing that
ignores it names the wrong register there. The evidence is a real code window rather than a
synthetic one, so this test doubles as the record of that window.
"""
import re
import unittest

import lab
from harmony.pic18 import disasm, isa

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
MOVWF_5E_BANKED = bytes.fromhex('5e6f')  # the same, one address lower, which is UADDR
MOVLB_D = bytes.fromhex('0d01')
MOVLB_F = bytes.fromhex('0f01')   # bank 15, the only route to the block below the access bank
RETURN = bytes.fromhex('1200')


#: image -> (load base, the SFR names a banked operand reaches and how often). Every one is in
#: `0xF40` to `0xF5F`, the USB block section 18 found, which sits below the access bank on this
#: family. Arch 9 (Harmony 525) is deliberately absent: its PIC18F4550 page starts at `0xF60`, so
#: the whole map is inside the access bank there and this shape of access does not occur.
USB_BANKED_ACCESSES = {
    'h700_code': (0x09000, {'UIE': 16, 'UCFG': 3, 'UEP0': 3, 'UADDR': 2,
                            'UEP1': 1, 'UEP2': 1, 'UEIE': 1}),
    'one34_code': (0x20000, {'UIE': 16, 'UEP0': 3, 'UADDR': 2, 'UCFG': 1,
                             'UEP1': 1, 'UEP2': 1, 'UEIE': 1}),
}


def _named_banked_sfrs(code, base, part=isa.DEFAULT_PART):
    """{register name: count} over every banked file operand a linear scan resolves."""
    found = {}
    bsr = None
    for _, instr in isa.iter_instructions(code, base):
        if instr.category == isa.BANKSEL:
            bsr = instr.fields['k']
            continue
        if instr.category in (isa.FILE_A, isa.FILE_DA, isa.BIT) and instr.fields['a'] == 1:
            _, name = isa.resolve_file(instr.fields['f'], 1, bsr, part=part)
            if not name.startswith('0x'):
                found[name] = found.get(name, 0) + 1
        if instr.category in (isa.REL8, isa.REL11, isa.ABS20) or instr.mnemonic in (
                'RETURN', 'RETURN FAST', 'RETFIE', 'RETFIE FAST', 'RETLW', 'RESET'):
            bsr = None
    return found


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

    def test_a_resolved_bank_in_the_sfr_page_names_the_register(self):
        """A listing reached the USB block only through a bank and then would not name it.

        `MOVLB 0xF; MOVWF 0x5F` is `UCFG` on this family, in the block at `0xF40` to `0xF5F`
        that section 18 found and that sits below the access bank, so this is the only shape of
        instruction that can reach it. It printed `MOVWF 0xf5f`.
        """
        self.assertEqual(texts(MOVLB_F + MOVWF_5F_BANKED)[-1], 'MOVWF UCFG')
        self.assertEqual(texts(MOVLB_F + MOVWF_5E_BANKED)[-1], 'MOVWF UADDR')
        # And the same bytes on the part whose page starts at 0xF60, where there is no register.
        self.assertEqual(
            [m.group(3) for m in (_LINE.match(line) for line in disasm.disassemble(
                MOVLB_F + MOVWF_5E_BANKED, 0, 0, 2, '4550')) if m][-1],
            'MOVWF 0xf5e')

    def test_the_real_images_name_their_usb_registers(self):
        """The count the change is worth, so it cannot quietly go back to zero.

        Every one of these is in the block below the access bank, which no access bank operand can
        reach, so before this they were the only registers in the map a listing never named.
        """
        lab.require(*USB_BANKED_ACCESSES)
        for name, (base, expected) in USB_BANKED_ACCESSES.items():
            with self.subTest(image=name):
                self.assertEqual(_named_banked_sfrs(lab.load(name), base), expected)


if __name__ == '__main__':
    unittest.main()
