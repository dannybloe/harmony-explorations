"""Which of a record's two pointer groups a send plays, read in the firmware: findings section 365.

A record of a toggling code carries two pointer groups, the code as stated and the same code with its
toggle bit flipped, `docs/config-format.md` "Which group a send plays". Section 134 left which group a press
uses unconfirmed, because the firmware side had not been traced. It is traced here on two images:

* the bench Harmony 650's own 0.2 application (arch 14), and
* the Harmony One's 3.4 application (arch 12).

On both, one state bit per infrared group lives in a sixteen bit word. A send that reaches the record start
XORs into it a mask of `1 << (tag & 0x0F)`, where the tag is the queue entry's byte whose low nibble is the
infrared group, and whether the bit is set afterwards becomes a flag. On the Harmony 650 a tag with bit 4 or 5
set returns before the XOR, and what those bits mean is not read. The record start then reads the record's
group count and skips one group of nine bytes fewer when the count is 2 and that flag is set. So a set bit
plays the first group and a clear bit the second. On the Harmony 650 the word is cleared at `0x11D08`, whose
caller is not read, and the first send after that sets the bit and plays the first group, the code as the
catalogue states it; the next plays the second.

The calibration is the count of 1. It goes through the same skip loop with no extra decrement and plays
its only group, which is what every record that does not toggle relies on.

Not read: what clears the word on the Harmony One, and the group selection on the Harmony 600's, 700's
and 350's images, whose XOR update and mask routine are found at the addresses in `docs/findings.md`
section 365. This file asserts only the two images whose selection was read. The Harmony 525's (arch 9)
application image is in the lab and was not searched.
"""
import unittest

import lab
from harmony.pic18 import isa

#: Per image: its lab name, the base it executes at, and the addresses this file reads.
IMAGES = {
    'h650_bench_code': {
        'base': 0x9000,
        'mask_routine': 0x1A24C,     # PROD = 1 << (W & 0x0F)
        'update': 0x1285C,           # MOVF tag; CALL mask; XOR into the word
        'tag': 0xD14,
        'bank_select': 0x1284E,
        'word': (0x3DA, 0x3DB),
        'flag': (0xD17, 0x71F),      # the bit set after the XOR, then where the record start reads it
        'store': 0x128A4,            # MOVFF flag, the record start's copy
        'select': 0x167FE,           # MOVWF count into 0xD05, then the test
    },
    'one34_code': {
        'base': 0x20000,
        'mask_routine': 0x20CE6,
        'update': 0x277C8,
        'tag': 0xD13,
        'bank_select': 0x277C6,
        'word': (0x6A9, 0x6AA),
        'flag': (0xD16, 0x2B0),
        'store': 0x27810,
        'select': 0x299DA,
    },
}
COUNT = 0xD05


def _at(name, address):
    image = IMAGES[name]
    return isa.decode(lab.load(name), address - image['base'], image['base'])


def _run(name, start, n):
    """`n` instructions from `start`, in order, each with its address."""
    out, address = [], start
    for _ in range(n):
        one = _at(name, address)
        out.append((address, one))
        address += 2 * one.words
    return out


def _banked(listing, bank=None):
    """Each banked file operand of the listing resolved through the `MOVLB` before it, as a full address.

    `bank` is the bank selected where the listing starts, for a listing that opens before its first `MOVLB`.
    """
    out = []
    for _, one in listing:
        if one.mnemonic == 'MOVLB':
            bank = one.fields['k']
        elif 'f' in one.fields and one.fields.get('a') == 1:
            assert bank is not None, 'a banked operand before any MOVLB'
            out.append((one.mnemonic, (bank << 8) | one.fields['f']))
    return out


class ASendFlipsItsGroupsBit(unittest.TestCase):
    """The word holds a bit per infrared group, and a send reaching the record start XORs its group's bit."""

    def test_the_mask_routine_shifts_a_one_left_by_the_tags_low_nibble(self):
        lab.require(*IMAGES)
        for name, image in IMAGES.items():
            with self.subTest(name):
                listing = [one for _, one in _run(name, image['mask_routine'], 9)]
                self.assertEqual([one.mnemonic for one in listing],
                                 ['CLRF', 'CLRF', 'INCF', 'ANDLW', 'BZ', 'BCF', 'RLCF', 'RLCF', 'DECF'])
                self.assertEqual(listing[3].fields['k'], 0x0F)

    def test_the_update_xors_that_mask_into_the_word_and_keeps_whether_the_bit_is_now_set(self):
        lab.require(*IMAGES)
        for name, image in IMAGES.items():
            with self.subTest(name):
                # The tag's bank is selected before the update on both images: 0xD, at 0x1284E on the
                # Harmony 650 ahead of its gate and at 0x277C6 on the Harmony One.
                self.assertEqual(_at(name, image['bank_select']).fields['k'], 0xD)
                listing = _run(name, image['update'], 20)
                banked = _banked(listing, bank=0xD)
                self.assertEqual(banked[0], ('MOVF', image['tag']))
                self.assertEqual((listing[1][1].mnemonic, listing[1][1].fields['target']),
                                 ('CALL', image['mask_routine']))
                # Both bytes of the word, low then high, each written back to the file, in their own bank.
                self.assertEqual([address for mnemonic, address in banked if mnemonic == 'XORWF'],
                                 list(image['word']))
                self.assertEqual([one.fields['d'] for _, one in listing if one.mnemonic == 'XORWF'], [1, 1])
                ands = [one for _, one in listing if one.mnemonic == 'ANDWF']
                self.assertEqual(len(ands), 2, 'the word is masked again, so the flag is this group\'s bit alone')
                move = _at(name, image['store'])
                self.assertEqual((move.mnemonic, move.fields['src'], move.fields['dst']), ('MOVFF', *image['flag']))

    def test_on_the_650_a_tag_with_bit_4_or_5_set_returns_before_the_xor(self):
        lab.require('h650_bench_code')
        listing = _run('h650_bench_code', 0x1284C, 5)
        self.assertEqual([(one.mnemonic, one.fields.get('k')) for _, one in listing[:1]], [('MOVLW', 0x30)])
        self.assertEqual(_banked(listing)[0], ('ANDWF', 0xD14))
        branch = listing[3][1]
        self.assertEqual((branch.mnemonic, branch.fields['target']), ('BZ', 0x1285C))


class TheFlagChoosesTheFirstGroup(unittest.TestCase):
    """A set bit skips one group fewer, so it plays the first; a clear one the second."""

    def test_a_count_of_two_with_the_flag_set_takes_one_decrement_more_and_the_branches_say_so(self):
        lab.require(*IMAGES)
        for name, image in IMAGES.items():
            with self.subTest(name):
                listing = _run(name, image['select'] - 2, 20)
                ops = [one for _, one in listing]
                at = [address for address, _ in listing]
                banked = _banked(listing)
                self.assertEqual(banked[0], ('MOVWF', COUNT))
                # count - 2, and only on zero is the flag read: BNZ jumps past the flag to the loop.
                self.assertEqual((ops[2].mnemonic, ops[2].fields['k']), ('MOVLW', 2))
                self.assertEqual(ops[3].mnemonic, 'SUBWF')
                loop = at[10]
                self.assertEqual((ops[4].mnemonic, ops[4].fields['target']), ('BNZ', loop))
                self.assertIn(('MOVF', image['flag'][1]), banked)
                # A clear flag jumps past the extra decrement; a set one falls into it.
                self.assertEqual((ops[7].mnemonic, ops[7].fields['target']), ('BZ', loop))
                self.assertEqual(banked[3], ('DECF', COUNT))
                # The loop: decrement, stop at zero, else skip nine bytes and go round.
                self.assertEqual(banked[4], ('DECF', COUNT))
                self.assertEqual((ops[13].mnemonic, ops[13].fields['k']), ('SUBLW', 0))
                self.assertEqual(ops[14].mnemonic, 'BC')
                self.assertEqual((ops[16].mnemonic, ops[16].fields['k']), ('MOVLW', 9))
                self.assertEqual((ops[19].mnemonic, ops[19].fields['target']), ('BRA', loop))

    def test_the_skip_arithmetic_as_listed_skips_no_group_for_one_and_for_two_with_the_flag_set_and_one_with_it_clear(self):
        # The listing above, run as arithmetic: how many nine byte groups are skipped. This reads no image;
        # the test above is what ties these steps to the two images.
        def skipped(count, flag):
            left = count - 1 if count == 2 and flag else count
            skips = 0
            while True:
                left -= 1
                if left <= 0:
                    return skips
                skips += 1
        self.assertEqual(skipped(1, False), 0)
        self.assertEqual(skipped(1, True), 0)
        self.assertEqual(skipped(2, True), 0)
        self.assertEqual(skipped(2, False), 1)


class TheWordIsCleared(unittest.TestCase):
    """On the Harmony 650 the word is cleared, so the next send sets its bit: the first group."""

    def test_the_650_clears_both_bytes_of_the_word_in_its_bank(self):
        lab.require('h650_bench_code')
        listing = _run('h650_bench_code', 0x11D02, 6)
        cleared = [address for mnemonic, address in _banked(listing) if mnemonic == 'CLRF']
        self.assertEqual(cleared[:2], [0x3DA, 0x3DB])


if __name__ == '__main__':
    unittest.main()
