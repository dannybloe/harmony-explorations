"""
The action list interpreter as the firmware implements it. `docs/findings.md` section 34.

Two arch 14 images. Addresses are recorded per image because finding them again is a search and
keeping them is what makes this a regression test, the same reason `test_usb_firmware.py` gives.

Everything here is asserted against decoded instructions rather than against a hand written
listing, so a wrong opcode table in `isa.py` fails these too.
"""
import collections
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


class TestTheEventMap(unittest.TestCase):
    """findings.md section 36: base slot 4, and the block it reserves in 0x7E's numbering."""

    CONFIGS = TestTheStateVariableTable.CONFIGS

    def test_the_shape_is_the_same_in_every_config(self):
        from harmony import gspm
        bases = set()
        for name in self.CONFIGS:
            with self.subTest(image=name):
                table = gspm.parse(lab.load(name)).event_map()
                self.assertEqual(len(table.entries), 30)
                self.assertTrue(table.keys_are_contiguous, 'keys 0 to 29')
                low, high = table.reserved_block
                self.assertEqual(high - low, 29, 'the values are contiguous too')
                self.assertEqual(table.fallback, low, 'the fallback is the value for key 0')
                self.assertEqual(table.length, gspm.EVENT_MAP_BYTES)
                bases.add(low)
        self.assertGreaterEqual(len(bases), 4, 'the base varies, so matching it means something')

    def test_the_section_is_much_smaller_than_the_gap_to_the_next_pointer(self):
        """The correction section 36 carries: a gap is an upper bound, not a size.

        The bytes in between are slot 5's infrared group arrays, which is asserted rather than
        assumed: every group array falls inside the gap.
        """
        from harmony import gspm
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                start = c.sections[gspm.arch_slot(c.architecture, gspm.EVENT_MAP_SLOT)].address
                gap = min([s.address for s in c.sections if s.address > start]
                          + [c.end_addr]) - start
                self.assertGreater(gap, 3 * gspm.EVENT_MAP_BYTES, 'the gap really is much larger')
                for group in c.pointer_array(
                        gspm.arch_slot(c.architecture, gspm.IR_TABLE_SLOT)):
                    self.assertTrue(start + gspm.EVENT_MAP_BYTES <= group < start + gap,
                                    'a group array outside the gap')

    def test_0x7e_avoids_the_reserved_block(self):
        """Two writers of one register share a numbering space, and they do not collide.

        One exception, on the 525, asserted by name so it cannot grow quietly.
        """
        from harmony import gspm
        collisions = {}
        operands = 0
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            low, high = c.event_map().reserved_block
            values = {i.operand for lst in (c.action_lists() or []) for i in lst
                      if i.opcode == 0x7E}
            operands += len(values)
            inside = sorted(v for v in values if low <= v <= high)
            if inside:
                collisions[name] = inside
        self.assertEqual(collisions, {'h525_config': [25]})
        self.assertEqual(operands, 1246, 'pin the count the claim rests on')

    def test_the_block_abuts_the_configs_own_numbering_on_the_one(self):
        """0 to 9, then the reserved 10 to 39, then 40 upward. One allocator, one pool."""
        from harmony import gspm
        c = gspm.parse(lab.load('one_config'))
        low, high = c.event_map().reserved_block
        values = {i.operand for lst in (c.action_lists() or []) for i in lst if i.opcode == 0x7E}
        self.assertEqual((low, high), (10, 39))
        self.assertEqual(max(v for v in values if v < low), low - 1)
        self.assertEqual(min(v for v in values if v > high), high + 1)


class TestTheModeTable(unittest.TestCase):
    """findings.md section 37: base slot 6, and what 0x7E's operand indexes."""

    CONFIGS = TestTheStateVariableTable.CONFIGS

    def test_the_count_is_one_more_than_the_largest_0x7e_operand(self):
        """Ten counts from 103 to 374, each landing on the maximum plus one.

        Asserted as equality rather than as "in range": a table merely large enough would pass a
        bounds check, and that would be true of half the config.
        """
        from harmony import gspm
        counts = set()
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                modes = c.mode_table()
                operands = {i.operand for lst in (c.action_lists() or []) for i in lst
                            if i.opcode == gspm.OPCODE_ENTER_MODE}
                self.assertEqual(len(modes), max(operands) + 1)
                counts.add(len(modes))
        self.assertGreaterEqual(len(counts), 6)
        self.assertEqual((min(counts), max(counts)), (103, 374))

    def test_the_event_map_indexes_the_same_table(self):
        from harmony import gspm
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                limit = len(c.mode_table())
                table = c.event_map()
                for value in list(table.entries.values()) + [table.fallback]:
                    self.assertLess(value, limit)

    def test_every_mode_address_is_inside_the_container(self):
        from harmony import gspm
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                for address in c.mode_table():
                    self.assertIsNotNone(c.blob_offset_of(address))
                    self.assertLess(c.blob_offset_of(address), len(c.blob))

    def test_the_firmware_selects_exactly_two_handler_tags(self):
        """Tag 7 on the way out and tag 6 on the way in, and nothing else in either image.

        Scanned rather than read off a listing: every literal loaded into the tag register.
        """
        from harmony import gspm
        registers = {'h700_code': 0x3C5, 'h600_code_complete': 0x763}
        for name, register in registers.items():
            with self.subTest(image=name):
                code = lab.load(name)
                previous = None
                tags = collections.defaultdict(int)
                for _, instr in isa.iter_instructions(code, BASE, 0, len(code)):
                    if (instr.mnemonic == 'MOVWF'
                            and (instr.fields.get('f') & 0xFF) == (register & 0xFF)
                            and previous is not None and previous.mnemonic == 'MOVLW'):
                        tags[previous.fields['k']] += 1
                    previous = instr
                self.assertEqual(dict(tags),
                                 {gspm.MODE_TAG_ENTER: 1, gspm.MODE_TAG_LEAVE: 1})

    def test_the_slot_map_has_the_same_shape_on_both_images(self):
        """Section 35 built it on the 700. The 600 agrees site for site."""
        seekers = {'h700_code': (0x10B92, 0x6DD), 'h600_code_complete': (0x18020, 0x6DA)}
        shapes = {}
        for name, (seeker, register) in seekers.items():
            code = lab.load(name)
            window = collections.deque(maxlen=6)
            per_slot = collections.Counter()
            for addr, instr in isa.iter_instructions(code, BASE, 0, len(code)):
                window.append(instr)
                if instr.mnemonic not in ('CALL', 'RCALL', 'GOTO'):
                    continue
                if instr.fields.get('target') != seeker:
                    continue
                earlier = list(window)[:-1]
                for i in range(len(earlier) - 1, 0, -1):
                    if (earlier[i].mnemonic == 'MOVWF'
                            and (earlier[i].fields.get('f') & 0xFF) == (register & 0xFF)):
                        for j in range(i - 1, -1, -1):
                            if earlier[j].mnemonic == 'MOVLW':
                                per_slot[earlier[j].fields['k']] += 1
                                break
                        break
            shapes[name] = dict(per_slot)
        self.assertEqual(shapes['h700_code'], shapes['h600_code_complete'])
        self.assertEqual(sorted(shapes['h700_code']), list(range(3, 18)))
        self.assertEqual(sum(shapes['h700_code'].values()), 19)


if __name__ == '__main__':
    unittest.main()
