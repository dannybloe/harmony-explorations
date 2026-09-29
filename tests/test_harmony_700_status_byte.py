"""
The update status byte's handler in the Harmony 700's 2.5 application, section 297.

Logitech's template for skin 66 sets data memory `0x100` with `A3 06 00 02` whether the remote is in
safe mode or running normally, and section 295 read only the safe mode image's handler. This is the
application's, read off the unit's own internal flash while it ran 2.5: the `WRITE_MISC` selector
chain sends 6 to an arm that moves the packet's two bytes into `0x103` and `0x102` and calls a
routine storing `0x103` into `0x100` when `0x102` is 0. That reading is what lets the staging and
reinstall rails admit a 2.5 remote that is not in safe mode, `STATUS_BYTE_READ_ON_APPLICATION`.
"""
import unittest

import lab
from harmony.firmware import parse_header
from harmony.pic18 import chains, isa

CHAIN = 0x0C314     # the selector chain, at the same address as on the Harmony 650's 0.2 build
ARM = 0x0C364
ROUTINE = 0x19868


def program(name_fe, name_ff):
    """The two internal pages as one 128 KiB image, which is how the addresses read."""
    return lab.load(name_fe) + lab.load(name_ff)


def at(code, address):
    return isa.decode(code, address)


class TheApplicationStoresTheStatusByte(unittest.TestCase):

    def setUp(self):
        lab.require('h700_posthd_internal_fe', 'h700_posthd_internal_ff')
        self.code = program('h700_posthd_internal_fe', 'h700_posthd_internal_ff')

    def test_the_build_read_is_2_5(self):
        # The version word the image header states, so the reading below is attached to the build the
        # rail names and not to whatever the unit runs now.
        self.assertEqual(parse_header(self.code[0x9000:]).version, '2.5')

    def test_selector_6_goes_to_the_arm(self):
        table = chains.chain_table(self.code, 0, CHAIN)
        self.assertEqual(table.get(6), ARM)

    def test_the_arm_moves_the_two_bytes_and_calls_the_routine(self):
        first = at(self.code, ARM)
        second = at(self.code, ARM + 4)
        call = at(self.code, ARM + 8)
        self.assertEqual((first.mnemonic, first.fields['src'], first.fields['dst']), ('MOVFF', 0xD5E, 0x103))
        self.assertEqual((second.mnemonic, second.fields['src'], second.fields['dst']), ('MOVFF', 0xD5F, 0x102))
        self.assertEqual((call.mnemonic, call.fields['target']), ('CALL', ROUTINE))

    def test_the_routine_stores_the_value_into_0x100_when_the_index_is_0(self):
        steps = [at(self.code, ROUTINE + d) for d in (0, 2, 4, 6, 10)]
        self.assertEqual([s.mnemonic for s in steps], ['MOVLB', 'MOVF', 'BNZ', 'MOVFF', 'RETURN'])
        self.assertEqual(steps[0].fields['k'], 1)
        self.assertEqual((steps[1].fields['f'], steps[1].fields['a']), (0x02, 1), 'tests 0x102, banked')
        self.assertEqual((steps[3].fields['src'], steps[3].fields['dst']), (0x103, 0x100))


if __name__ == '__main__':
    unittest.main()
