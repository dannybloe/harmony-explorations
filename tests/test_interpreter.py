"""
The action list interpreter as the firmware implements it. `docs/findings.md` section 34.

Two arch 14 images. Addresses are recorded per image because finding them again is a search and
keeping them is what makes this a regression test, the same reason `test_usb_firmware.py` gives.

Everything here is asserted against decoded instructions rather than against a hand written
listing, so a wrong opcode table in `isa.py` fails these too.
"""
import unittest

import lab
from harmony.pic18 import chains, isa

BASE = 0x9000

# image -> the addresses of the routines section 34 names.
IMAGES = {
    'h700_code': {
        'executor': 0x0EB20,        # pops three bytes and dispatches
        'dispatcher': 0x0EC8E,      # the binary search on the opcode
        'queue_full': 0x0E7EC,      # returns 1 when the queue holds 0x78 bytes
        'queue_init': 0x0E7D6,      # sets both pointers to the buffer start
        'compare_chain': 0x0EEAE,   # the comparison selector switch
        'buffer_start': 0x0127,
        'buffer_wrap': 0x019F,
    },
    'h600_code_complete': {
        'executor': 0x0E73A,
        'dispatcher': 0x0E89E,
        'queue_full': 0x0E40A,
        'queue_init': 0x0E3F4,
        'compare_chain': None,      # not located on this image; the rest is enough
        'buffer_start': 0x021E,
        'buffer_wrap': 0x0296,
    },
}

QUEUE_BYTES = 0x78
INSTRUCTION_BYTES = 3


def instructions(name, start, count):
    code = lab.load(name)
    out = []
    offset = start - BASE
    for _ in range(count):
        instr = isa.decode(code, offset, BASE)
        out.append((BASE + offset, instr))
        offset += 2 * instr.words
    return out


def literals(name, start, count, mnemonic):
    """The `k` field of every instruction with this mnemonic in a window."""
    return [i.fields['k'] for _, i in instructions(name, start, count)
            if i.mnemonic == mnemonic]


class TestTheQueue(unittest.TestCase):
    """A circular buffer of 120 bytes, which is exactly 40 three byte instructions."""

    def test_the_buffer_is_forty_instructions_on_both_images(self):
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                span = at['buffer_wrap'] - at['buffer_start']
                self.assertEqual(span, QUEUE_BYTES)
                self.assertEqual(span // INSTRUCTION_BYTES, 40)
                self.assertEqual(span % INSTRUCTION_BYTES, 0, 'no partial instruction fits')

    def test_the_full_test_compares_against_the_buffer_length(self):
        """The size is not inferred from the pointers alone: the firmware states it."""
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                self.assertIn(QUEUE_BYTES, literals(name, at['queue_full'], 4, 'MOVLW'))

    def test_the_init_routine_sets_both_pointers_to_the_buffer_start(self):
        """Read and write pointer, low byte then high byte, twice over."""
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                loaded = literals(name, at['queue_init'], 10, 'MOVLW')
                low = at['buffer_start'] & 0xFF
                high = at['buffer_start'] >> 8
                self.assertEqual(loaded[:4], [low, high, low, high])


class TestTheExecutor(unittest.TestCase):
    """Pop three bytes, then dispatch, with one special case that nothing in the corpus takes."""

    def test_it_pops_exactly_three_bytes(self):
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                window = instructions(name, at['executor'], 14)
                calls = [i for _, i in window if i.mnemonic in ('RCALL', 'CALL')]
                self.assertGreaterEqual(len(calls), 4, 'empty test plus three pops')

    def test_the_special_case_is_opcode_0x1f_with_operand_high_0xfc(self):
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                loaded = literals(name, at['executor'], 20, 'MOVLW')
                self.assertIn(0x1F, loaded)
                self.assertIn(0xFC, loaded)
                self.assertLess(loaded.index(0x1F), loaded.index(0xFC), 'opcode tested first')

    def test_no_config_in_the_corpus_reaches_that_case(self):
        """So the firmware has a path the corpus does not exercise. Worth knowing before a
        writer emits an operand it has never seen the remote handle."""
        from harmony import gspm
        seen = set()
        for config in ('h700_config', 'h700_config_2', 'h600_config', 'h525_config',
                       'one_config', 'one_config_unprogrammed', 'arch8_config_a',
                       'arch8_config_b', 'arch8_config_c', 'arch8_config_d'):
            c = gspm.parse(lab.load(config))
            for lst in (c.action_lists() or []):
                for i in lst:
                    if i.opcode == 0x1F:
                        seen.add(i.operand >> 8)
        self.assertNotIn(0xFC, seen)
        self.assertEqual(min(seen), 0xE7, 'and the band it does use, pinned')
        self.assertEqual(max(seen), 0xFF)


class TestTheDispatcher(unittest.TestCase):
    """A binary search on the opcode. Section 26 searched for an XORLW chain and there is none."""

    BOUNDARIES = (0x65, 0x80, 0x7A)

    def test_it_compares_the_opcode_against_boundaries_in_this_order(self):
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                loaded = literals(name, at['dispatcher'], 24, 'MOVLW')
                self.assertEqual(loaded[:3], list(self.BOUNDARIES))

    def test_the_high_family_has_bit_seven_cleared(self):
        """Everything at 0x80 and above is one routine with the bit stripped, so the opcode byte
        carries a flag rather than 55 separate instructions."""
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                window = instructions(name, at['dispatcher'], 24)
                bcf = [i for _, i in window if i.mnemonic == 'BCF' and i.fields.get('b') == 7]
                self.assertTrue(bcf, 'no BCF of bit 7 near the 0x80 boundary')

    def test_the_dispatcher_itself_contains_no_computed_jump(self):
        """The other thing the dispatch could have been, ruled out rather than assumed.

        Scoped to the dispatcher rather than to the image: the 700 does hold three writes to PCL
        elsewhere, so "the image has no jump table" would be false. What is true is that this
        routine reaches its handlers by comparing and branching.
        """
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                window = instructions(name, at['dispatcher'], 60)
                pcl = [a for a, i in window
                       if i.fields.get('f') == 0xF9 and i.mnemonic not in ('MOVFF',)]
                self.assertEqual(pcl, [], 'the dispatcher writes PCL')


class TestTheComparisonSelector(unittest.TestCase):
    """0x70 and 0x71: the low nibble of the operand's high byte picks the operator."""

    def test_the_chain_has_seven_cases_numbered_one_to_seven(self):
        name = 'h700_code'
        at = IMAGES[name]
        with self.subTest(image=name):
            cases = chains.xor_chain(lab.load(name), BASE, at['compare_chain'], limit=40)
            self.assertEqual(sorted(c.value for c in cases), [1, 2, 3, 4, 5, 6, 7])
            self.assertEqual(len({c.target for c in cases}), 7, 'seven distinct bodies')

    def test_0x71_uses_the_six_comparisons_and_nothing_else(self):
        """The closure: the operand statistics said the high byte took six values, and the
        firmware says exactly six of the eight selectors are comparisons.

        0x70 is the counterexample that keeps this honest. It also reaches selector 7, which is
        not a comparison, nine times. So the rule belongs to 0x71 and not to the pair.
        """
        from harmony import gspm
        selectors = {0x70: set(), 0x71: set()}
        for config in ('h700_config', 'h700_config_2', 'h600_config', 'h525_config',
                       'one_config', 'one_config_unprogrammed', 'arch8_config_a',
                       'arch8_config_b', 'arch8_config_c', 'arch8_config_d'):
            c = gspm.parse(lab.load(config))
            for lst in (c.action_lists() or []):
                for i in lst:
                    if i.opcode in selectors:
                        selectors[i.opcode].add((i.operand >> 8) & 0x0F)
        self.assertEqual(selectors[0x71], {0, 1, 2, 3, 4, 5})
        self.assertEqual(selectors[0x70], {0, 1, 2, 3, 7})
        self.assertNotIn(6, selectors[0x70] | selectors[0x71], 'selector 6 is never used')

    def test_the_index_byte_stays_under_the_lookup_bound(self):
        """Every 0x70, 0x71 and 0x72 operand's low byte is under 64, in every config."""
        from harmony import gspm
        worst = 0
        for config in ('h700_config', 'h600_config', 'h525_config', 'one_config',
                       'one_config_unprogrammed', 'arch8_config_a', 'arch8_config_c'):
            c = gspm.parse(lab.load(config))
            for lst in (c.action_lists() or []):
                for i in lst:
                    if i.opcode == 0x71:
                        worst = max(worst, i.operand & 0xFF)
        self.assertLess(worst, 64)
        self.assertEqual(worst, 63, 'and it reaches the bound, so 64 is the size not a ceiling')


class TestTheStateVariableTable(unittest.TestCase):
    """findings.md section 35: base slot 13, and the split the firmware's lookup uses."""

    CONFIGS = ('h700_config', 'h700_config_2', 'h600_config', 'h525_config', 'one_config',
               'one_config_unprogrammed', 'arch8_config_a', 'arch8_config_b',
               'arch8_config_c', 'arch8_config_d')

    @staticmethod
    def _table(name):
        from harmony import gspm
        return gspm.parse(lab.load(name)).state_table()

    def test_the_header_is_self_consistent_and_accounts_for_the_section(self):
        from harmony import gspm
        counts = set()
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                table = c.state_table()
                self.assertTrue(table.is_consistent, table)

                slot = gspm.arch_slot(c.architecture, gspm.STATE_TABLE_SLOT)
                start = c.sections[slot].address
                after = min([s.address for s in c.sections if s.address > start]
                            + [c.end_addr])
                self.assertEqual(8 + 3 * table.count, after - start,
                                 'the header accounts for the whole section')
                counts.add(table.count)
        self.assertGreater(len(counts), 5, 'the count varies, so matching it means something')
        self.assertEqual((min(counts), max(counts)), (24, 94))

    def test_every_index_is_inside_its_own_config_s_table(self):
        from harmony import gspm
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                table = c.state_table()
                used = [c.state_index(i) for lst in (c.action_lists() or []) for i in lst
                        if c.state_index(i) is not None]
                self.assertTrue(used)
                self.assertLess(max(used), table.count)

    def test_0x71_reads_the_narrow_half_and_0x70_the_wide_half(self):
        """The closure of section 35.

        The firmware says 0x71 compares a byte and 0x70 compares the sixteen bit accumulator. The
        config data cannot know that, and it never once crosses the boundary its own header
        declares, which is a different number in every config.
        """
        from harmony import gspm
        narrow_uses = wide_uses = 0
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            table = c.state_table()
            for lst in (c.action_lists() or []):
                for i in lst:
                    if i.opcode == 0x71:
                        narrow_uses += 1
                        with self.subTest(image=name, opcode='0x71'):
                            self.assertTrue(table.is_narrow(i.operand & 0xFF))
                    elif i.opcode == 0x70:
                        wide_uses += 1
                        with self.subTest(image=name, opcode='0x70'):
                            self.assertFalse(table.is_narrow(i.operand & 0xFF))
        self.assertEqual((narrow_uses, wide_uses), (2164, 146), 'pin what the claim rests on')

    def test_the_boundary_is_not_the_same_number_in_every_config(self):
        """Otherwise the previous test would pass on a constant rather than on a match."""
        boundaries = {self._table(name).narrow for name in self.CONFIGS}
        self.assertGreaterEqual(len(boundaries), 6)


if __name__ == '__main__':
    unittest.main()
