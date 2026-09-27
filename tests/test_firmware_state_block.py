"""Section 284: the firmware's own state variables run to 17 on arch 8, 12 and 14, and to 12 on arch 9.

Section 138 cut the block at 12 because index 13 varies and is named on arch 9 (Harmony 525), and read
that boundary as every architecture's. The configurations' half of the correction, that 13 to 17 are
fixed per architecture and named by none on arch 8, 12 and 14, is `packages/codec/test/inventory.test.ts`,
since naming a variable is the TypeScript codec's reader. This file is the firmware's half, and it reads
bytes of the image rather than any document:

* the seeder's alternative fill starts at the literal 18 on seven images of six builds, the Harmony
  One, the Harmony 700, both Harmony 650 builds, the Harmony 600's read of the 0.2 build and the Harmony
  880 and 885, so on that path the firmware keeps 0 to 17 and paints the rest;
* the checksum that decides whether the seeder runs starts at index 18 too, shown here on the Harmony
  One and in `test_arch14_write_target` for the other two;
* the firmware stores into variables inside 13 to 17 directly on every image and into none from 18 up
  to where each image's fill stops, bar a handful of hits inside data that only decodes as code: the
  USB report descriptor, and on arch 8 the text of its flash commands;
* and on arch 9 the alternative fill starts at 13, beside section 274's guard at the same literal.
"""

import unittest

import lab
from harmony.pic18 import isa, trace

#: image -> (load base, where the variables start in data memory, the `MOVLW 0x12` of the fill arm,
#: the highest index the fill paints, from its loop's bound: `0x7F`, `0xFF`, `0xC0` and `0x40`)
IMAGES = {
    'one34_code': (0x20000, 0x108, 0x2A33E, 126),
    'h700_code': (0x9000, 0x900, 0x17A52, 254),
    'h650_bench_code': (0x9000, 0xE10, 0x16102, 191),
    'h600_code_complete': (0x9000, 0xE10, 0x16102, 191),
    'h650_code': (0x9000, 0x900, 0x1782A, 254),
    'arch8_code_880': (0x10000, 0x108, 0x17370, 63),
    'arch8_code_885': (0x10000, 0x108, 0x17370, 63),
}

#: image -> the indices from 13 to 17 with a direct store, byte or bit, as the tracer sees them.
DIRECTLY_WRITTEN = {
    'one34_code': [13, 15, 16, 17],
    'h700_code': [13, 14, 15, 16, 17],
    'h650_bench_code': [13, 16, 17],
    'h600_code_complete': [13, 16, 17],
    'h650_code': [13, 16, 17],
    'arch8_code_880': [13, 15, 16, 17],
    'arch8_code_885': [13, 15, 16, 17],
}

#: image -> every code address that stores above 17, each inside data that only decodes as code: the
#: USB report descriptor, or on arch 8 the text of the flash commands. Their bank selects are words like
#: `0x01A1` and `0x01E1`, `MOVLB` only by ignoring its four reserved bits, which no compiler emits.
TABLE_HITS = {
    'one34_code': [0x2E440],
    'h600_code_complete': [0x19FB0],
    'arch8_code_880': [0x1A67E, 0x1E17C, 0x1E1AA, 0x1E20C, 0x1E216],
    'arch8_code_885': [0x1A67E, 0x1E17C, 0x1E1AA, 0x1E20C, 0x1E216],
}
#: What the bytes around a table hit are: a HID report descriptor's collection with its logical range
#: and report size, or the flash commands' names.
TABLE_CONTENT = (b'\xa1\x01\x15\x00&\xff\x00u\x08', b'\x09\x05\x95@\x91\x02\xc0', b'FLASH Memory')


def _is_store(kind):
    """A byte store or a bit store, as the tracer labels them."""
    return 'WRITE' in kind or kind.startswith(('BSF', 'BCF', 'BTG'))


def _writers(code, base, address):
    return [hit.addr for hit in trace.trace(code, base, [address])[address] if _is_store(hit.kind)]


class TheFirmwareOwnsZeroToSeventeenOnArch8And12And14(unittest.TestCase):

    def test_the_alternative_fill_starts_at_eighteen_on_every_arch_8_12_and_14_image_here(self):
        lab.require(*IMAGES)
        for name, (base, _, at, _) in IMAGES.items():
            with self.subTest(name):
                code = lab.load(name)
                here = isa.decode(code, at - base, base)
                after = isa.decode(code, at + 2 - base, base)
                self.assertEqual((here.mnemonic, here.fields['k']), ('MOVLW', 0x12))
                # Straight into the byte the fill loop counts up from, which is where the computed arm,
                # `narrow + 2 * wide`, branches to as well: a BRA just before lands on this store.
                self.assertEqual(after.mnemonic, 'MOVWF')
                joins = [a for a in range(at - 8, at, 2)
                         if isa.decode(code, a - base, base).mnemonic == 'BRA'
                         and isa.decode(code, a - base, base).fields['target'] == at + 2]
                self.assertEqual(len(joins), 1)

    def test_the_firmware_stores_inside_thirteen_to_seventeen_and_nowhere_above_up_to_the_fills_top(self):
        lab.require(*IMAGES)
        for name, (base, variables, _, top) in IMAGES.items():
            with self.subTest(name):
                code = lab.load(name)
                hits = trace.trace(code, base, [variables + i for i in range(13, top + 1)])
                stores = {i: [h.addr for h in hits[variables + i] if _is_store(h.kind)] for i in range(13, top + 1)}
                self.assertEqual([i for i in range(13, 18) if stores[i]], DIRECTLY_WRITTEN[name])
                above = sorted(a for i in range(18, top + 1) for a in stores[i])
                self.assertEqual(above, TABLE_HITS.get(name, []))
                for w in above:
                    # The bank select nearest before each hit has its reserved bits set, and the bytes
                    # around it are a descriptor or a string.
                    words = [isa.decode(code, a - base, base).raw for a in range(w - 0x20, w, 2)
                             if isa.decode(code, a - base, base).mnemonic == 'MOVLB']
                    self.assertNotEqual(words[-1] & 0x00F0, 0, hex(w))
                    around = code[w - base - 32:w - base + 32]
                    self.assertTrue(any(marker in around for marker in TABLE_CONTENT), hex(w))

    def test_the_checksum_that_gates_the_seeder_starts_at_eighteen_on_the_harmony_one(self):
        # The arch 14 images' sums are asserted in test_arch14_write_target, from 0x912 and 0xE22.
        lab.require('one34_code')
        code = lab.load('one34_code')
        at = lambda a: isa.decode(code, a - 0x20000, 0x20000)
        self.assertEqual([(at(a).mnemonic, at(a).fields.get('k')) for a in (0x2A238, 0x2A23C, 0x2A240)],
                         [('MOVLW', 0xA5), ('MOVLW', 0x1A), ('MOVLW', 0x01)])
        # The seed, then the pointer's low and high bytes: 0x11A, which is 0x108 plus 18.
        # And it gates the seeder, the same shape as the 0.2 build's: called at 0x2A278, compared with
        # the byte stored at 0x189, and the verdict kept at 0xD03.
        self.assertEqual((at(0x2A278).mnemonic, at(0x2A278).fields.get('target')), ('RCALL', 0x2A234))
        self.assertEqual((at(0x2A27C).mnemonic, at(0x2A27C).fields.get('f')), ('SUBWF', 0x89))
        self.assertEqual((at(0x2A288).mnemonic, at(0x2A288).fields.get('f')), ('MOVWF', 0x03))


class TheHarmony525sBlockEndsAtTwelve(unittest.TestCase):

    def test_its_alternative_fill_starts_at_thirteen(self):
        lab.require('h525_code')
        code = lab.load('h525_code')
        # The opcode decodes the same whatever the part; only register names differ, section 80.
        here = isa.decode(code, 0x4824, 0)
        self.assertEqual((here.mnemonic, here.fields['k']), ('MOVLW', 0x0D))
        # And the computed arm joins at the store after it, as on the other images.
        join = isa.decode(code, 0x4820, 0)
        self.assertEqual((join.mnemonic, join.fields['target']), ('BRA', 0x4826))


if __name__ == '__main__':
    unittest.main()
