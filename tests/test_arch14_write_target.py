"""Section 281: arch 14 (Harmony 600, 650 and 700) gets a write target, and it is the Harmony 650.

Two claims, each resting on bytes rather than on a document.

**The rails' two arch 14 numbers are the firmware's.** `WRITABLE_CEILING[14]` is `0x200000` because the
flash address classifier refuses a top byte of `0x20` or more, section 192, which
`test_findings.TestTheFlashAddressIsClassifiedBeforeItIsUsed` asserts on four arch 14 images now.
`ERASE_BLOCK_SIZE[14]` is 64 KiB because the one routine that erases external flash sends the SPI
opcode `0xD8`, which on the EON F16 the bench units carry is the 64 KiB block erase. That routine is
asserted here, in the same four images, by decoding the instruction that loads the opcode.

**The Harmony 650 is not the Harmony 600, and the unit check on the identity block is what refuses the
600.** Both report product id `0xC122` and architecture 14, so the write list admits both. Their skin
and hardware version differ too, and the rehearsal gates on neither. The
identity GUIDs differ and neither is filler, which is the precondition for the unit check being a
check at all; and the 650's are the ones its unit record in the lab holds, so a permission naming
`h650` refuses the 600.
"""

import os
import pathlib
import re
import unittest

import lab
from harmony.pic18 import isa

ROOT = pathlib.Path(__file__).resolve().parent.parent

#: image -> the address of the `MOVLW 0xD8` inside the external flash block erase. The routine selects
#: the part, sends write enable, and then loads the opcode for the byte sender, so the instruction
#: before it is a `MOVLB` and the one after a `MOVWF`, which is what separates it from the one other
#: `MOVLW 0xD8` in each image, a comparison followed by `SUBWF`.
ERASE_OPCODE_AT = {
    'h600_code_complete': 0x17462,
    'h650_bench_code': 0x17462,
    'h650_code': 0x18B9E,
    'h700_code': 0x18DC6,
}
BASE = 0x9000
SPI_BLOCK_ERASE = 0xD8

#: The identity block on page `0xFF` and the span of it that tells two units apart: the two GUIDs,
#: `packages/usb/src/identity.ts`'s `unitDiscriminator`.
IDENTITY_AT = 0xF400
GUIDS = slice(IDENTITY_AT + 0x10, IDENTITY_AT + 0x30)


def _uniform(field):
    """Whether a field is one byte repeated, which is what an unwritten one looks like."""
    return len(set(field)) == 1


def _rail_row(table):
    """One table of `rails.ts`, as {architecture: value}."""
    text = (ROOT / 'packages' / 'usb' / 'src' / 'rails.ts').read_text(encoding='utf-8')
    body = re.search(table + r'[^=]*= \{(.*?)\};', text, re.S)
    return {int(a): int(v, 16) for a, v in re.findall(r'(\d+):\s*(0x[0-9a-fA-F]+)', body.group(1))}


class TheArch14EraseIsASixtyFourKiBBlock(unittest.TestCase):

    def test_every_arch14_image_loads_the_block_erase_opcode_stores_it_and_calls_out(self):
        # What this asserts is the shape, `MOVLB`, `MOVLW 0xD8`, `MOVWF`, `CALL`. That the call lands
        # on the SPI byte sender is the blind reviewer's trace on the 600's image and is not re-derived
        # here for the other three, which is why the title stops at "calls out".
        lab.require(*ERASE_OPCODE_AT)
        for name, at in sorted(ERASE_OPCODE_AT.items()):
            with self.subTest(name):
                code = lab.load(name)
                before, here, after, call = (isa.decode(code, at - BASE + d, BASE)
                                             for d in (-2, 0, 2, 4))
                self.assertEqual(here.mnemonic, 'MOVLW')
                self.assertEqual(here.fields['k'], SPI_BLOCK_ERASE)
                self.assertEqual(before.mnemonic, 'MOVLB')
                self.assertEqual(after.mnemonic, 'MOVWF')
                self.assertEqual(call.mnemonic, 'CALL')

    def test_each_image_loads_that_opcode_in_exactly_two_places_and_only_one_is_a_send(self):
        # The control that the table above names the eraser and not an arbitrary 0xD8: every aligned
        # `MOVLW 0xD8` in each image, and the one that is not the eraser is a timer compare,
        # `SUBWF TMR0H,W` then a branch on carry.
        lab.require(*ERASE_OPCODE_AT)
        for name, at in sorted(ERASE_OPCODE_AT.items()):
            with self.subTest(name):
                code = lab.load(name)
                hits = [o + BASE for o in range(0, len(code) - 1, 2)
                        if code[o:o + 2] == bytes([SPI_BLOCK_ERASE, 0x0E])]
                self.assertEqual(len(hits), 2)
                self.assertIn(at, hits)
                other = next(h for h in hits if h != at)
                self.assertEqual(isa.decode(code, other - BASE + 2, BASE).mnemonic, 'SUBWF')

    def test_the_rails_carry_the_block_and_the_ceiling_the_two_firmware_tests_establish(self):
        # The firmware half is the eraser tests above and the classifier's ceiling in
        # `test_findings.TestTheFlashAddressIsClassifiedBeforeItIsUsed`; this is the rails half,
        # compared against the values those establish rather than reading the images again.
        self.assertEqual(_rail_row('ERASE_BLOCK_SIZE')[14], 0x10000)
        # The classifier's ceiling is a top byte, so the address is that byte shifted by sixteen.
        self.assertEqual(_rail_row('WRITABLE_CEILING')[14], 0x20 << 16)
        self.assertEqual(_rail_row('CONFIG_REGION_BASE')[14], 0x030000)


class TheHarmony650IsToldFromTheHarmony600ByItsIdentityAlone(unittest.TestCase):

    def setUp(self):
        lab.require('h600_page_ff', 'h650_page_ff')
        self.h600 = lab.load('h600_page_ff')[GUIDS]
        self.h650 = lab.load('h650_page_ff')[GUIDS]

    def test_both_units_carry_written_guids(self):
        # A uniform field is filler and would match every unit against every other, which is the
        # trap `identifiesAUnit` exists for.
        for name, guids in (('h600', self.h600), ('h650', self.h650)):
            with self.subTest(name):
                self.assertFalse(_uniform(guids[:0x10]), 'the first GUID is filler')
                self.assertFalse(_uniform(guids[0x10:]), 'the second GUID is filler')

    def test_the_two_units_differ(self):
        self.assertNotEqual(self.h600, self.h650)

    def test_the_650s_unit_record_is_its_own_identity_and_not_the_600s(self):
        record = os.path.join(lab.LAB or '', 'units', 'h650.txt')
        if not os.path.isfile(record):
            self.skipTest('no h650 unit record in the lab')
        with open(record, encoding='utf-8') as fh:
            words = fh.read().split()
        self.assertIn(self.h650.hex(), words)
        self.assertNotIn(self.h600.hex(), words)


if __name__ == '__main__':
    unittest.main()
