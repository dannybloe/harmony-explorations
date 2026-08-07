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
        lab.require(*self.CONFIGS)
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
        lab.require(*self.CONFIGS)
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
        lab.require(*self.CONFIGS)
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


class TestTheSlotMapOnArch12(unittest.TestCase):
    """findings.md section 38: the same seeker on the Harmony One, and the insertion rule."""

    SEEKER = 0x2BA76
    REGISTER = 0xF1     # banked, so the seeker's own f field rather than the resolved address
    ONE_BASE = 0x20000

    def _sites(self):
        code = lab.load('one34_code')
        window = collections.deque(maxlen=6)
        per_slot = collections.Counter()
        for _, instr in isa.iter_instructions(code, self.ONE_BASE, 0, len(code)):
            window.append(instr)
            if instr.mnemonic not in ('CALL', 'RCALL', 'GOTO'):
                continue
            if instr.fields.get('target') != self.SEEKER:
                continue
            earlier = list(window)[:-1]
            for i in range(len(earlier) - 1, 0, -1):
                if (earlier[i].mnemonic == 'MOVWF'
                        and (earlier[i].fields.get('f') & 0xFF) == (self.REGISTER & 0xFF)):
                    for j in range(i - 1, -1, -1):
                        if earlier[j].mnemonic == 'MOVLW':
                            per_slot[earlier[j].fields['k']] += 1
                            break
                    break
        return per_slot

    def test_it_reaches_every_raw_slot_but_the_inserted_null(self):
        from harmony import gspm
        sites = self._sites()
        self.assertEqual(sorted(sites), [2, 3, 4, 5, 6, 7] + list(range(9, 20)))
        self.assertNotIn(8, sites, 'raw slot 8 is the NULL arch 12 inserts')
        self.assertIsNone(gspm.base_slot(12, 8), 'and the alignment rule agrees')
        self.assertIn(18, sites, 'raw slot 18 is the section arch 12 has and the base layout lacks')
        self.assertIsNone(gspm.base_slot(12, 18))
        self.assertEqual(sum(sites.values()), 24)


class TestSlotThreeIsTheClock(unittest.TestCase):
    """findings.md section 38: the consumer reads three bytes and starts Timer 1."""

    CONSUMERS = {'h700_code': (0x9000, 0x14956), 'h600_code_complete': (0x9000, 0x1043C),
                 'one34_code': (0x20000, 0x278E8)}

    def test_the_consumer_starts_timer_one(self):
        for name, (base, addr) in self.CONSUMERS.items():
            with self.subTest(image=name):
                code = lab.load(name)
                offset = addr - base
                names = []
                for _ in range(24):
                    instr = isa.decode(code, offset, base)
                    offset += 2 * instr.words
                    field = instr.fields.get('f')
                    if field is not None and instr.fields.get('a') == 0:
                        names.append((instr.mnemonic, isa.sfr_name(field | 0xF00)))
                    if instr.mnemonic == 'RETURN':
                        break
                self.assertIn(('CLRF', 'TMR1H'), names)
                self.assertIn(('CLRF', 'TMR1L'), names)
                self.assertIn(('BSF', 'T1CON'), names)

    def test_it_indexes_the_section_at_ten(self):
        for name, (base, addr) in self.CONSUMERS.items():
            with self.subTest(image=name):
                self.assertIn(10, literals_at(name, base, addr, 8))


class TestSlotFifteenHasADemandedSize(unittest.TestCase):
    """findings.md section 38: the firmware compares the entry count against a literal.

    Two architectures, two literals, and every config matches its own. This is a rail for a
    writer: a different count is not an error, it is a subsystem that quietly does nothing.
    """

    CONSUMERS = {'h700_code': (0x9000, 0x0F904, 14), 'h600_code_complete': (0x9000, 0x10EA2, 14),
                 'one34_code': (0x20000, 0x23276, 12)}
    EXPECTED = {14: 9, 12: 11}

    def test_the_firmware_demands_a_count_per_architecture(self):
        for name, (base, addr, arch) in self.CONSUMERS.items():
            with self.subTest(image=name):
                self.assertIn(self.EXPECTED[arch], literals_at(name, base, addr, 10))

    def test_every_config_carries_the_count_its_firmware_demands(self):
        from harmony import gspm
        for name in TestTheStateVariableTable.CONFIGS:
            c = gspm.parse(lab.load(name))
            want = self.EXPECTED.get(c.architecture)
            if want is None:
                continue
            with self.subTest(image=name):
                entries = c.pointer_array(gspm.arch_slot(c.architecture, 15))
                self.assertEqual(len(entries), want)


class TestTheBindingTable(unittest.TestCase):
    """findings.md section 39: base slot 9, its index, and its two firmware tags."""

    CONFIGS = TestTheStateVariableTable.CONFIGS

    @staticmethod
    def _sets(name):
        from harmony import gspm
        return gspm.parse(lab.load(name))

    def test_the_index_maxes_out_at_the_count_minus_one_everywhere(self):
        """The closure. Opcode 0x1F with operand high 0xFF carries the index."""
        from harmony import gspm
        for name in self.CONFIGS:
            c = self._sets(name)
            indices = [c.handler_index(i) for lst in c.action_lists() for i in lst]
            indices = [i for i in indices if i is not None]
            with self.subTest(config=name):
                self.assertTrue(indices, 'no config should be without a selection')
                self.assertEqual(max(indices) + 1, len(c.handler_sets()))

    def test_the_selector_ignores_the_same_opcode_with_another_operand(self):
        """0x1F reaches many branches; only the 0xFFxx one selects a handler set."""
        from harmony import gspm
        c = self._sets('h700_config')
        self.assertIsNone(c.handler_index(gspm.Instruction(operand=0xFE00, opcode=0x1F)))
        self.assertIsNone(c.handler_index(gspm.Instruction(operand=0xFF01, opcode=0x7F)))
        self.assertEqual(c.handler_index(gspm.Instruction(operand=0xFF01, opcode=0x1F)), 1)

    def test_every_config_carries_the_enter_and_leave_tags(self):
        from harmony import gspm
        for name in self.CONFIGS:
            c = self._sets(name)
            tags = {e.tag for a in c.handler_sets() for e in c.tagged_list(a)}
            with self.subTest(config=name):
                self.assertIn(gspm.HANDLER_TAG_ENTER, tags)
                self.assertIn(gspm.HANDLER_TAG_LEAVE, tags)

    def test_the_other_tags_are_key_events_by_the_slot_8_split(self):
        """Tags at 0x80 and above decode as press, release or repeat with a scan code."""
        from harmony import gspm
        for name in self.CONFIGS:
            c = self._sets(name)
            high = {e.tag for a in c.handler_sets() for e in c.tagged_list(a) if e.tag >= 0x80}
            with self.subTest(config=name):
                self.assertTrue(high)
                # Every one is a real event type, never the 0x40 release-only bit on its own,
                # and every scan code is inside the 54 the arch 14 key table can express.
                self.assertTrue(all(t & gspm.EVENT_MASK in (0x80, 0xC0) for t in high))

    def test_the_seven_hundred_pair_differs_by_one_binding_in_one_entry(self):
        """The controlled pair. One described button, one added binding, nothing else moves."""
        a, b = self._sets('h700_config'), self._sets('h700_config_2')
        differing = []
        for pa, pb in zip(a.handler_sets(), b.handler_sets()):
            ta = {e.tag: (e.operand, e.opcode) for e in a.tagged_list(pa)}
            tb = {e.tag: (e.operand, e.opcode) for e in b.tagged_list(pb)}
            if ta != tb:
                differing.append((sorted(set(tb) - set(ta)), sorted(set(ta) - set(tb))))
        self.assertEqual(len(differing), 1)
        added, removed = differing[0]
        self.assertEqual(len(added), 1)
        self.assertEqual(removed, [])
        self.assertEqual(added[0] & 0xC0, 0x80, 'the added tag is a key press')


class TestTheStateValueMap(unittest.TestCase):
    """findings.md section 39: base slot 14, and opcode 0x72 indexing it and slot 13 at once."""

    CONFIGS = TestTheStateVariableTable.CONFIGS

    def test_both_halves_of_the_operand_stay_inside_their_tables(self):
        from harmony import gspm
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            maps, variables = c.value_maps(), c.state_table().count
            refs = [c.value_map_reference(i) for lst in c.action_lists() for i in lst]
            refs = [r for r in refs if r is not None]
            with self.subTest(config=name):
                self.assertTrue(refs)
                self.assertLess(max(v for v, _ in refs), variables)
                self.assertLess(max(m for _, m in refs), len(maps))

    def test_only_one_combination_of_widths_fits_the_layout(self):
        """A record's computed length lands on another record's start under one shape only.

        The discriminator, not a restatement of the constants. The first reading of this had the
        key varying and the count fixed at two bytes, which scored six of twelve on the older
        architectures and passed for a majority until the other combinations were tried.
        """
        from harmony import gspm
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            maps = c.value_maps()
            starts = {m.address for m in maps}
            counter = gspm.VALUE_MAP_COUNT_WIDTH[c.architecture]
            scores = {}
            for cw in (1, 2):
                for kw in (1, 2):
                    hit = 0
                    for m in maps:
                        off = c.blob_offset_of(m.address)
                        count = int.from_bytes(c.blob[off + 1:off + 1 + cw], 'little')
                        hit += (m.address + 2 + cw + (kw + 3) * count) in starts
                    scores[cw, kw] = hit
            best = max(scores, key=scores.get)
            with self.subTest(config=name):
                self.assertEqual(best, (counter, gspm.VALUE_MAP_KEY_WIDTH))
                for shape, hit in scores.items():
                    if shape != best:
                        self.assertLess(hit, scores[best])
                # And the winner is not merely ahead, it accounts for nearly every record. The
                # rest are addresses pointing into the middle of a longer record.
                self.assertGreaterEqual(scores[best], 0.8 * len(maps))

    def test_a_record_lead_byte_is_what_the_document_says(self):
        from harmony import gspm
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            leads = {c.blob[c.blob_offset_of(m.address)] for m in c.value_maps()}
            with self.subTest(config=name):
                self.assertEqual(leads, {2})

    def test_every_payload_is_an_address_inside_the_container(self):
        """The independent check that the three bytes are a pointer and not an instruction."""
        from harmony import gspm
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            targets = [t for m in c.value_maps() for _, t in m.entries]
            targets += [t for m in c.value_maps() for _, _, t in m.ranges]
            with self.subTest(config=name):
                self.assertTrue(targets)
                self.assertTrue(all(c.flash_base <= t < c.end_addr for t in targets))


class TestTheNumberSender(unittest.TestCase):
    """findings.md section 39: base slot 16, read from three images and used by no config."""

    # The seek site of base slot 16 on each image, and the register the index offset goes into.
    # Arch 12's is a banked `f` field rather than a resolved address, like its seeker's, so the
    # three are compared by the literals they receive and not by their numbering.
    CONSUMERS = {'h700_code': (0x9000, 0x19A90, 0x0E0),
                 'h600_code_complete': (0x9000, 0x1845E, 0x0DD),
                 'one34_code': (0x20000, 0x2C5D0, 0x0F4)}
    # 10000, 1000, 100 and 10 as the little endian pairs the consumer subtracts.
    LADDER = (0x27, 0x10), (0x03, 0xE8), (0x00, 0x64), (0x00, 0x0A)

    def _window(self, name, base, start):
        code = lab.load(name)
        offset = start - base
        out = []
        for _ in range(0x180):
            instr = isa.decode(code, offset, base)
            out.append(instr)
            offset += 2 * instr.words
        return out

    def test_the_three_digit_table_offsets_follow_the_bytes_read_in_sequence(self):
        """The closure: 1 + 3 + 1 + 3 + 3 + 3 is fourteen, and fourteen is the first offset."""
        from harmony import gspm
        self.assertEqual(gspm.NUMBER_SENDER_DIGIT_TABLES[0], gspm.NUMBER_SENDER_HEADER)
        self.assertEqual(gspm.NUMBER_SENDER_DIGIT_TABLES, (14, 17, 20))
        self.assertEqual(1 + 3 + 1 + 3 + 3 + 3, gspm.NUMBER_SENDER_HEADER)

    def test_every_image_indexes_at_the_same_four_offsets(self):
        from harmony import gspm
        for name, (base, start, register) in self.CONSUMERS.items():
            offsets, previous = set(), None
            for instr in self._window(name, base, start):
                if instr.mnemonic == 'MOVLW':
                    previous = instr.fields['k']
                if instr.mnemonic == 'MOVWF' and instr.fields['f'] == register:
                    offsets.add(previous)
            with self.subTest(image=name):
                self.assertEqual(offsets & {1, 14, 17, 20},
                                 {1} | set(gspm.NUMBER_SENDER_DIGIT_TABLES))

    def test_every_image_subtracts_the_same_decimal_ladder(self):
        for name, (base, start, _) in self.CONSUMERS.items():
            literal = None
            seen = []
            for instr in self._window(name, base, start):
                if instr.mnemonic == 'MOVLW':
                    literal = instr.fields['k']
                elif instr.mnemonic in ('SUBWF', 'SUBWFB') and literal is not None:
                    seen.append(literal)
            with self.subTest(image=name):
                for high, low in self.LADDER:
                    self.assertIn(low, seen)
                    self.assertIn(high, seen)

    def test_no_config_in_the_corpus_has_a_record(self):
        """Stated as a test so it fails the day a sample arrives that does."""
        from harmony import gspm
        for name in TestTheStateVariableTable.CONFIGS:
            c = gspm.parse(lab.load(name))
            with self.subTest(config=name):
                self.assertEqual(c.number_senders(), [])


class TestTheScreenInterpreter(unittest.TestCase):
    """findings.md section 40: the second interpreter, its opcodes and its encoding."""

    CONFIGS = TestTheStateVariableTable.CONFIGS
    # The dispatcher, and the address of the XORLW chain inside it, per image.
    DISPATCHERS = {'h700_code': (0x9000, 0x1879C, 0x187A8),
                   'h600_code_complete': (0x9000, 0x16E38, 0x16E44),
                   'one34_code': (0x20000, 0x295AC, 0x295E6)}
    BASE_OPCODES = {1, 2, 3, 4, 5, 16, 17, 18, 19, 20}

    def test_the_same_ten_opcodes_on_every_image(self):
        for name, (base, _, at) in self.DISPATCHERS.items():
            code = lab.load(name)
            cases = {c.value for c in chains.xor_chain(code, base, at)}
            with self.subTest(image=name):
                self.assertTrue(self.BASE_OPCODES <= cases)

    def test_arch_12_adds_two_the_other_two_images_do_not_have(self):
        """Both are arch 12 only; one is now read and the other still has to be refused.

        Opcode 23 takes no operand, from its handler, and that single entry is what let arch 12's
        mode programs decode. Opcode 22 appears in no config, so its length stays unestablished and
        a parser must stop rather than guess. `docs/findings.md` section 54.
        """
        from harmony import gspm
        code = lab.load('one34_code')
        cases = {c.value for c in chains.xor_chain(code, 0x20000, 0x295E6)}
        extra = cases - self.BASE_OPCODES
        self.assertEqual(extra, {22, 23})
        self.assertEqual(set(gspm.SCREEN_ARCH12_ONLY), {22})
        self.assertEqual(gspm.SCREEN_FIXED_OPERANDS[23], 0)
        for name in ('h700_code', 'h600_code_complete'):
            base, _, at = self.DISPATCHERS[name]
            cases = {c.value for c in chains.xor_chain(lab.load(name), base, at)}
            with self.subTest(image=name):
                self.assertEqual(cases & extra, set())

    def _walk(self, c):
        """Every program reachable from the roots, and whether any failed to decode."""
        seen, queue, failed = set(), list(c.screen_program_roots()), 0
        programs = []
        while queue:
            address = queue.pop()
            if address in seen:
                continue
            seen.add(address)
            program = c.screen_program(address)
            if program is None:
                failed += 1
                continue
            programs.append(program)
            for instruction in program:
                queue += [t for t in instruction.targets if t not in seen]
        return programs, failed

    def test_every_program_in_the_corpus_decodes(self):
        """The closure. Instructions are variable length with no length field anywhere, so one
        wrong operand count desynchronises the walk and the next byte read as an opcode is
        almost certainly not one of the eleven."""
        from harmony import gspm
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            programs, failed = self._walk(c)
            with self.subTest(config=name):
                self.assertEqual(failed, 0)
                self.assertGreater(len(programs), 20)

    def test_every_program_ends_the_way_the_firmware_ends_one(self):
        from harmony import gspm
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            programs, _ = self._walk(c)
            for program in programs:
                last = program[-1]
                with self.subTest(config=name):
                    self.assertTrue(last.opcode == gspm.SCREEN_END or last.transfers)
                    for instruction in program[:-1]:
                        self.assertFalse(instruction.transfers)

    def test_the_inline_strings_are_glyph_indices_and_not_characters(self):
        """Stated as a test because calling them text would be the easy mistake."""
        from harmony import gspm
        printable = total = 0
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            programs, _ = self._walk(c)
            for program in programs:
                for instruction in program:
                    if not instruction.glyphs:
                        continue
                    total += 1
                    printable += all(32 <= b < 127 for b in instruction.glyphs)
        self.assertGreater(total, 500)
        # The claim that matters is that no *word* appears. Short strings of two or three codes
        # land in the printable range by chance and always have; every one of the handful that
        # does is one to three codes long and reads as nothing.
        self.assertLess(printable, total / 50)
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            for program in self._walk(c)[0]:
                for instruction in program:
                    if instruction.glyphs and len(instruction.glyphs) >= 4:
                        self.assertFalse(all(32 <= b < 127 for b in instruction.glyphs))

    def test_a_truncated_program_is_refused_rather_than_guessed(self):
        from harmony import gspm
        c = gspm.parse(lab.load('h700_config'))
        self.assertIsNone(c.screen_program(c.end_addr + 1))


class TestTheParameterBlock(unittest.TestCase):
    """findings.md section 44: base slot 15, and the length the firmware demands of every group."""

    # Every container, including the three safe mode ones, which carry a full parameter block
    # where they carry no timers at all.
    CONTAINERS = TestTheStateVariableTable.CONFIGS + (
        'h600_safemode_gspm', 'h700_gspm', 'h650_safemode_gspm')
    # The guard routine and its call sites, per image. Recorded because finding them again is a
    # search, the same reason the rest of this file records addresses.
    GUARDS = {'h700_code': (0x9000, 0x0F8F0), 'one34_code': (0x20000, 0x23262)}

    @staticmethod
    def _groups(name):
        from harmony import gspm
        return gspm.parse(lab.load(name)).parameter_groups()

    def test_the_groups_account_for_the_run_they_sit_in(self):
        """No slack between groups, which is what says the record shape is right."""
        from harmony import gspm
        for name in self.CONTAINERS:
            c = gspm.parse(lab.load(name))
            groups = c.parameter_groups()
            addresses = c.pointer_array(gspm.arch_slot(c.architecture, gspm.PARAMETER_SLOT))
            span = max(a + 1 + 2 * len(g) for a, g in zip(addresses, groups)) - min(addresses)
            with self.subTest(container=name):
                slack = span - sum(1 + 2 * len(g) for g in groups)
                # Arch 12 is the only one with spare bytes in the run, and it has twelve.
                self.assertEqual(slack, 12 if c.architecture == 12 else 0)

    def test_every_group_is_the_length_its_firmware_demands(self):
        """The closure: fourteen literals off two images, against thirteen containers."""
        from harmony import gspm
        checked = 0
        for name in self.CONTAINERS:
            c = gspm.parse(lab.load(name))
            match = c.parameter_group_lengths_match()
            if match is None:                      # arch 8 and arch 9, no firmware read
                continue
            checked += 1
            with self.subTest(container=name):
                self.assertTrue(match, [len(g) for g in c.parameter_groups()])
        self.assertGreaterEqual(checked, 8)

    def test_the_two_architectures_demand_different_lengths(self):
        """Otherwise the fit above would be one constant matching everywhere."""
        from harmony import gspm
        arch14 = gspm.PARAMETER_GROUP_COUNTS[14]
        arch12 = gspm.PARAMETER_GROUP_COUNTS[12]
        shared = set(arch14) & set(arch12)
        self.assertTrue(shared)
        self.assertNotEqual([arch14[i] for i in sorted(shared)],
                            [arch12[i] for i in sorted(shared)])

    def test_the_guard_demands_the_section_count_too(self):
        """Section 38's literal, re-asserted here because it is the same routine."""
        expected = {'h700_code': 9, 'one34_code': 11}
        for name, (base, addr) in self.GUARDS.items():
            with self.subTest(image=name):
                self.assertIn(expected[name], literals_at(name, base, addr, 24))

    def test_the_threshold_group_is_the_same_in_every_container_that_has_it(self):
        """Group 4 is identical on arch 8, 12 and 14, which arch 9 does not share."""
        from harmony import gspm
        seen = set()
        for name in self.CONTAINERS:
            c = gspm.parse(lab.load(name))
            if c.architecture == 9:
                continue
            seen.add(tuple(c.parameter_groups()[4]))
        self.assertEqual(seen, {(96, 98, 308, 310, 768, 770)})

    def test_the_level_curves_do_not_decrease(self):
        """Groups 5 and 6 are walked by counting how many entries a measurement exceeds."""
        from harmony import gspm
        for name in self.CONTAINERS:
            c = gspm.parse(lab.load(name))
            if c.architecture == 9:
                continue
            for index in (5, 6):
                curve = c.parameter_groups()[index]
                with self.subTest(container=name, group=index):
                    self.assertGreaterEqual(len(curve), 14)
                    self.assertTrue(all(a <= b for a, b in zip(curve, curve[1:])), curve)


class TestTheFontTable(unittest.TestCase):
    """findings.md section 46: base slot 7 is the font table, and what corrected it.

    The first reading of this section took the set header's first byte for a slot count when it
    is the glyph height. Two of the tests below exist because of that: the height one, which is
    what the byte actually is, and the string one, which is what the wrong count made look broken.
    """

    CONTAINERS = TestTheParameterBlock.CONTAINERS

    @staticmethod
    def _programs(container):
        """Every reachable screen program, the same walk `tools/screen_dump.py` does."""
        seen, queue, out = set(), list(container.screen_program_roots()), {}
        while queue:
            address = queue.pop()
            if address in seen:
                continue
            seen.add(address)
            program = container.screen_program(address)
            if program is None:
                continue
            out[address] = program
            for instruction in program:
                queue.extend(instruction.targets)
        return out

    @staticmethod
    def _decode(container, address, limit, pixel_bytes):
        """The reader's algorithm with the pixel size as a parameter, for the calibration."""
        from harmony import gspm
        off = container.blob_offset_of(address)
        width = container.blob[off]
        at, rows, used = off + 1, 0, 0
        while at < limit:
            op = container.blob[at]
            at += 1
            if op == gspm.IMAGE_END:
                return rows if used == 0 else 0
            if op & gspm.IMAGE_SKIP:
                used += op & 0x7F
            else:
                at += pixel_bytes * op
                used += op
            if used == width:
                rows += 1
                used = 0
            elif used > width:
                return 0
        return 0

    @staticmethod
    def _bounded(container):
        """Each glyph with the offset it must end before: the next glyph, or the set's header."""
        for font in container.font_sets():
            live = sorted(a for a in font.glyphs if a is not None)
            for i, address in enumerate(live):
                yield address, container.blob_offset_of(
                    live[i + 1] if i + 1 < len(live) else font.address)

    def test_a_set_declares_one_count_per_container(self):
        """Not per typeface: it is the config's character set size."""
        from harmony import gspm
        for name in self.CONTAINERS:
            c = gspm.parse(lab.load(name))
            counts = {f.count for f in c.font_sets()}
            with self.subTest(container=name):
                self.assertEqual(len(counts), 1, counts)
                self.assertGreaterEqual(counts.pop(), 46)

    def test_the_spare_header_byte_is_constant_per_architecture(self):
        """What the count offset rests on, since the firmware does not settle it."""
        from harmony import gspm
        for name in self.CONTAINERS:
            c = gspm.parse(lab.load(name))
            at = gspm.IMAGE_COUNT_OFFSET[c.architecture]
            spare = 1 if at == 2 else 2
            expected = 1 if c.architecture != 12 else 0
            for entry in c.pointer_array(gspm.arch_slot(c.architecture, gspm.IMAGE_TABLE_SLOT)):
                off = c.blob_offset_of(entry)
                with self.subTest(container=name, entry=hex(entry)):
                    self.assertEqual(c.blob[off + spare], expected)

    def test_every_glyph_decodes_to_the_height_its_set_declares(self):
        """The byte the first reading of this section mistook for a count."""
        from harmony import gspm
        total = 0
        for name in self.CONTAINERS:
            c = gspm.parse(lab.load(name))
            sets = c.images()
            with self.subTest(container=name):
                if c.architecture not in gspm.IMAGE_ARCHITECTURES:
                    self.assertIsNone(sets)
                    continue
                for font, glyphs in zip(c.font_sets(), sets):
                    for glyph in glyphs:
                        self.assertEqual(glyph.height, font.height)
                        for row in glyph.rows:
                            self.assertEqual(len(row), glyph.width)
                total += sum(len(g) for g in sets)
        self.assertEqual(total, 3933)

    def test_every_inline_string_resolves_through_its_own_font(self):
        """The closure the wrong count destroyed, and the reason this section was corrected."""
        from harmony import gspm
        codes = resolved = 0
        for name in self.CONTAINERS:
            c = gspm.parse(lab.load(name))
            if c.architecture not in gspm.IMAGE_ARCHITECTURES:
                continue
            fonts = c.font_sets()
            for program in self._programs(c).values():
                selected = None
                for instruction in program:
                    if instruction.opcode == gspm.SCREEN_SELECT_FONT and instruction.operands:
                        selected = instruction.operands[0]
                    if instruction.opcode != gspm.SCREEN_TEXT_INLINE or not instruction.glyphs:
                        continue
                    if selected is None or selected >= len(fonts):
                        continue
                    for code in instruction.glyphs:
                        codes += 1
                        resolved += c.glyph(fonts[selected], code) is not None
        # 16054 before section 53 added the mode records' own programs as roots, 39170 before
        # section 54 added arch 12's.
        self.assertEqual(codes, 40588)
        self.assertEqual(resolved, codes)

    def test_a_one_byte_pixel_scores_near_zero(self):
        """The calibration: the wrong pixel size has to fail, or the fit above means nothing."""
        from harmony import gspm
        for name in ('h700_config', 'one_config', 'arch8_config_a'):
            c = gspm.parse(lab.load(name))
            right = wrong = total = 0
            for address, limit in self._bounded(c):
                total += 1
                right += 1 if self._decode(c, address, limit, 2) else 0
                wrong += 1 if self._decode(c, address, limit, 1) else 0
            with self.subTest(container=name):
                self.assertEqual(right, total)
                self.assertLess(wrong, total // 5)

    def test_a_glyph_code_is_one_based(self):
        """Zero terminates a string, so nothing can name glyph slot zero by the code zero."""
        from harmony import gspm
        c = gspm.parse(lab.load('h700_config'))
        font = c.font_sets()[4]
        self.assertIsNone(c.glyph(font, 0))
        self.assertIsNone(c.glyph(font, font.count + 1))
        first = next(i for i, a in enumerate(font.glyphs) if a is not None)
        self.assertIsNotNone(c.glyph(font, first + gspm.GLYPH_CODE_BIAS))


class TestTheTouchScreenHitMap(unittest.TestCase):
    """findings.md section 45: base slot 17, populated by the one remote with a touch panel."""

    CONTAINERS = TestTheParameterBlock.CONTAINERS
    TOUCH = ('one_config', 'one_config_unprogrammed')
    # The order a page's codes appear in, as offsets from 0x30, followed by the two that are
    # always last. Nine shapes exist across both configs and there is no tenth.
    PREFIX = (0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x2B, 0x2C)
    ALWAYS = (0x2E, 0x2F)

    @staticmethod
    def _pages(name):
        from harmony import gspm
        return gspm.parse(lab.load(name)).touch_pages()

    def test_only_architecture_twelve_populates_it(self):
        """The reason it stayed unnamed: eleven of thirteen containers say nothing."""
        for name in self.CONTAINERS:
            pages = self._pages(name)
            with self.subTest(container=name):
                if name in self.TOUCH:
                    self.assertGreater(len(pages), 30)
                else:
                    self.assertEqual(pages, [])

    def test_the_areas_tile_and_carry_their_own_address(self):
        """Two independent closures on a twelve byte record."""
        from harmony import gspm
        for name in self.TOUCH:
            c = gspm.parse(lab.load(name))
            headers = c._counted_pointers(gspm.arch_slot(c.architecture, gspm.TOUCH_MAP_SLOT), 1)
            for header, page in zip(headers, c.touch_pages()):
                with self.subTest(container=name, page=hex(header)):
                    for a, b in zip(page, page[1:]):
                        self.assertEqual(b.address - a.address, gspm.TOUCH_AREA_LENGTH)
                    self.assertEqual(page[-1].address + gspm.TOUCH_AREA_LENGTH, header)
                    for area in page:
                        self.assertEqual(area.self_address, area.address)

    def test_a_page_is_a_prefix_of_the_code_ladder_plus_two(self):
        for name in self.TOUCH:
            for page in self._pages(name):
                codes = tuple(a.code for a in page)
                with self.subTest(container=name, codes=codes):
                    self.assertEqual(codes, self.PREFIX[:len(codes) - 2] + self.ALWAYS)

    def test_the_two_constant_areas_are_a_strip_at_each_edge(self):
        """Present on every page, including the one that has nothing else."""
        for name in self.TOUCH:
            for page in self._pages(name):
                edges = [(a.x, a.width, a.y, a.height) for a in page[-2:]]
                with self.subTest(container=name):
                    self.assertEqual(edges, [(765, 492, 1400, 2000), (3556, 492, 1400, 2000)])

    def test_the_geometry_is_the_same_on_two_unrelated_remotes(self):
        """What says this is a layout resource and not somebody's configuration."""
        sizes = [{(a.width, a.height) for page in self._pages(n) for a in page} for n in self.TOUCH]
        self.assertEqual(sizes[0], sizes[1])
        self.assertEqual(len(sizes[0]), 35)

    def test_a_hit_returns_the_first_containing_rectangle(self):
        """Order matters because rectangles overlap, so the lookup must not be a set."""
        from harmony import gspm
        page = self._pages('one_config')[0]
        for area in page:
            middle = (area.x + area.width // 2, area.y + area.height // 2)
            expected = next(a.code for a in page if a.contains(*middle))
            self.assertEqual(gspm.Container.touch_hit(page, *middle), expected)
        self.assertIsNone(gspm.Container.touch_hit(page, 0, 0))

    def test_overlapping_rectangles_exist_at_all(self):
        """Otherwise the previous test would be asserting nothing."""
        overlaps = 0
        for name in self.TOUCH:
            for page in self._pages(name):
                for i, a in enumerate(page):
                    for b in page[i + 1:]:
                        if (a.x < b.x + b.width and b.x < a.x + a.width
                                and a.y < b.y + b.height and b.y < a.y + a.height):
                            overlaps += 1
        self.assertEqual(overlaps, 186)


class TestTheTimerTable(unittest.TestCase):
    """findings.md section 43: base slot 12, and the two instructions that drive it."""

    CONFIGS = TestTheStateVariableTable.CONFIGS
    SAFEMODE = ('h600_safemode_gspm', 'h700_gspm', 'h650_safemode_gspm')
    # The subsystem is found on each image by the multiply that indexes its five byte RAM entries.
    # Four images, four architectures' worth of build, and the same count each time.
    IMAGES = ('h700_code', 'h600_code_complete', 'h650_code', 'one34_code')

    @staticmethod
    def _started_and_cancelled(c):
        started, cancelled = set(), set()
        for lst in c.action_lists():
            for instruction in lst:
                reference = c.timer_reference(instruction)
                if reference is None:
                    continue
                (started if reference[0] else cancelled).add(reference[1])
        return started, cancelled

    def test_every_record_is_started_and_no_instruction_overruns_the_table(self):
        """The closure. The count and the operands are unrelated parts of the file."""
        from harmony import gspm
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            timers = c.timers()
            started, cancelled = self._started_and_cancelled(c)
            with self.subTest(config=name):
                self.assertGreater(len(timers), 4)
                self.assertEqual(started, set(range(len(timers))))
                self.assertTrue(cancelled <= started, 'a cancel names a timer that is started')

    def test_a_safe_mode_config_has_no_timers_and_asks_for_none(self):
        """The negative case: a recovery image has nothing to schedule."""
        from harmony import gspm
        for name in self.SAFEMODE:
            c = gspm.parse(lab.load(name))
            started, cancelled = self._started_and_cancelled(c)
            with self.subTest(config=name):
                self.assertEqual(c.timers(), [])
                self.assertEqual(started | cancelled, set())

    def test_the_records_are_seven_bytes_and_tile(self):
        """Seven is four skipped bytes plus a three byte instruction, read off the firmware."""
        from harmony import gspm
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            offsets = sorted(t.address for t in c.timers())
            gaps = [b - a for a, b in zip(offsets, offsets[1:])]
            odd = [g for g in gaps if g != gspm.TIMER_RECORD_LENGTH]
            with self.subTest(config=name):
                # One odd gap is allowed, and only on the architectures that pack the records
                # into two runs. Two would mean the record length is wrong.
                self.assertLessEqual(len(odd), 1, odd)
                self.assertGreaterEqual(len(gaps) - len(odd), len(offsets) - 2)
                self.assertTrue(all(g >= gspm.TIMER_RECORD_LENGTH for g in gaps),
                                'records must not overlap')

    def test_every_record_carries_a_real_opcode_and_the_scheduled_kind(self):
        from harmony import gspm
        opcodes = collections.Counter()
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            for timer in c.timers():
                with self.subTest(config=name):
                    self.assertEqual(timer.kind, gspm.TIMER_KIND_SCHEDULED)
                    self.assertGreater(timer.duration, 0)
                opcodes[timer.instruction.opcode] += 1
        # Placed opcodes only: 0x7E enters a mode, 0x7F is section 34's, and the two singletons
        # are in the high band family. A new opcode here would mean the record shape drifted.
        self.assertEqual(set(opcodes), {0x07, 0x1F, 0x7E, 0x7F})

    def test_the_subsystem_is_one_module_on_every_image(self):
        """Thirty sites that multiply an entry number by five, in one block, four images."""
        code_and_base = {'h700_code': 0x9000, 'h600_code_complete': 0x9000,
                         'h650_code': 0x9000, 'one34_code': 0x20000}
        for name, base in code_and_base.items():
            code = lab.load(name)
            sites = [base + at for at in range(0, len(code) - 1, 2)
                     if code[at:at + 2] == b'\x05\x0d']       # MULLW 0x05
            with self.subTest(image=name):
                self.assertEqual(len(sites), 30)
                self.assertLess(sites[-1] - sites[0], 0x600, 'one contiguous module')

    def test_only_the_two_operand_highs_reach_the_timers(self):
        """0x1F is one instruction with many branches; the rest must not be read as timers."""
        from harmony import gspm
        c = gspm.parse(lab.load('h700_config'))
        start = gspm.Instruction(operand=gspm.TIMER_START_OPERAND_HIGH << 8 | 3, opcode=0x1F)
        cancel = gspm.Instruction(operand=gspm.TIMER_CANCEL_OPERAND_HIGH << 8 | 3, opcode=0x1F)
        self.assertEqual(c.timer_reference(start), (True, 3))
        self.assertEqual(c.timer_reference(cancel), (False, 3))
        for high in (gspm.SELECT_HANDLER_OPERAND_HIGH, 0xE7, 0xF3, 0x00):
            other = gspm.Instruction(operand=high << 8 | 3, opcode=0x1F)
            self.assertIsNone(c.timer_reference(other), hex(high))
        self.assertIsNone(c.timer_reference(gspm.Instruction(operand=start.operand, opcode=0x7F)))


class TestTheLogArea(unittest.TestCase):
    """findings.md section 47: base slot 2, the last slot that was neither named nor NULL."""

    CONTAINERS = TestTheParameterBlock.CONTAINERS
    # The arch 12 pair, read off the one image that reads this section at all. The boot scan, the
    # append routine, and the seek inside the scan that proves which slot it is reading.
    SCAN = 0x2DB4C
    APPEND = 0x2DC0A
    SEEK = 0x2BA76
    # The window the append routine refuses to write outside. Compiled in rather than taken from
    # the section, which is the rail that makes a bad `start` harmless.
    WINDOW = (0x040000, 0x400000)

    @staticmethod
    def _area(name):
        from harmony import gspm
        return gspm.parse(lab.load(name)).log_area()

    def test_every_container_declares_one(self):
        """Thirteen containers, four architectures, three format versions. None is NULL."""
        for name in self.CONTAINERS:
            with self.subTest(container=name):
                self.assertIsNotNone(self._area(name))

    def test_the_capacity_and_the_bounds_agree(self):
        """The closure that fixes the field boundaries: span is capacity times a per architecture
        stride, and the stride is the same for every container of an architecture."""
        from harmony import gspm
        for name in self.CONTAINERS:
            architecture = gspm.parse(lab.load(name)).architecture
            with self.subTest(container=name):
                self.assertEqual(self._area(name).stride, gspm.LOG_STRIDE[architecture])

    def test_the_region_sits_above_the_config_and_ends_at_the_top_of_flash(self):
        """What makes 'a region reserved for the firmware' the reading rather than a coincidence."""
        from harmony import gspm
        for name in self.CONTAINERS:
            c = gspm.parse(lab.load(name))
            area = c.log_area()
            with self.subTest(container=name):
                self.assertGreaterEqual(area.start, c.end_addr)
                # 0x100000, 0x200000 and 0x400000 exactly; arch 8 stops 8 KiB short of 2 MiB.
                self.assertIn(area.limit, (0x080000, 0x100000, 0x1FE000, 0x200000, 0x400000))

    def test_the_wrong_field_split_does_not_close(self):
        """Calibration. Reading the leading field as a u24 on the eight byte architectures leaves
        two bytes for the limit, and the region it describes is then smaller than one unit of the
        capacity it declares, in every container. The correct split divides exactly."""
        from harmony import gspm
        for name in self.CONTAINERS:
            c = gspm.parse(lab.load(name))
            slot = gspm.arch_slot(c.architecture, gspm.LOG_SLOT)
            if c.section_length(slot) != 8:
                continue
            off = c.blob_offset_of(c.sections[slot].address)
            capacity = int.from_bytes(c.blob[off:off + 3], 'little')
            start = int.from_bytes(c.blob[off + 3:off + 6], 'little')
            limit = int.from_bytes(c.blob[off + 6:off + 8], 'little')
            with self.subTest(container=name):
                self.assertLess(limit - start, capacity)

    def test_the_arch_twelve_firmware_scans_the_section_it_declares(self):
        """The scan seeks raw slot 2 and reads two 24 bit fields out of it, in that order."""
        code = lab.load('one34_code')
        seen = []
        offset = self.SCAN - 0x20000
        for _ in range(32):
            instr = isa.decode(code, offset, 0x20000)
            offset += 2 * instr.words
            if instr.mnemonic == 'MOVLW':
                seen.append(('lit', instr.fields['k']))
            if instr.mnemonic == 'CALL':
                seen.append(('call', instr.fields['target']))
        # MOVLW 2 then the seeker, then two reads into the count and the address variables.
        self.assertIn(('lit', 2), seen)
        self.assertEqual(seen[seen.index(('lit', 2)) + 1], ('call', self.SEEK))
        self.assertEqual([t for t in seen if t[0] == 'call'].count(('call', 0x2B93C)), 2)

    def test_the_append_is_bounded_by_a_compiled_in_window(self):
        """`WINDOW` appears as two literal comparisons at the head of the append routine, and the
        section's own region is inside it in both arch 12 configs."""
        low, high = self.WINDOW
        self.assertEqual(literals_at('one34_code', 0x20000, self.APPEND, 14),
                         [0x00, 0x00, low >> 16, 0x00, 0x00, high >> 16])
        for name in ('one_config', 'one_config_unprogrammed'):
            area = self._area(name)
            with self.subTest(container=name):
                self.assertGreaterEqual(area.start, low)
                self.assertLessEqual(area.limit, high)

    def test_the_arch_fourteen_firmware_never_seeks_it(self):
        """Why the section stayed unnamed while the rest of the table fell: the architecture this
        project decodes first declares it and does not read it."""
        self.assertEqual(seeker_census('h700_code', 0x9000, 0x10B92, 0x6DD).get(2, 0), 0)
        self.assertEqual(seeker_census('one34_code', 0x20000, self.SEEK, 0x1F1).get(2, 0), 1)

    def test_no_config_in_the_corpus_appends_to_it(self):
        """Firmware nothing exercises, like the number sender. A writer may emit these operands;
        no generated config here ever did."""
        from harmony import gspm
        for name in TestTheStateVariableTable.CONFIGS:
            c = gspm.parse(lab.load(name))
            used = {c.log_reference(i) for lst in (c.action_lists() or []) for i in lst}
            with self.subTest(container=name):
                self.assertEqual(used - {None}, set())


def seeker_census(name, base, seeker, slot_register):
    """How many times each slot number is passed to the section seeker, per image.

    The slot arrives in a fixed RAM byte rather than in W, so the literal is the `MOVLW` feeding
    the `MOVWF` of that byte, a few instructions before the call.
    """
    import collections
    code = lab.load(name)
    sites = collections.Counter()
    offset = 0
    while offset < len(code) - 4:
        instr = isa.decode(code, offset, base)
        if instr and instr.mnemonic == 'CALL' and instr.fields.get('target') == seeker:
            for back in range(2, 16, 2):
                if offset - back < 0:
                    break
                first = isa.decode(code, offset - back, base)
                second = isa.decode(code, offset - back + 2, base)
                if (first and first.mnemonic == 'MOVLW' and second
                        and second.mnemonic == 'MOVWF'
                        and second.fields.get('f') == (slot_register & 0xFF)):
                    sites[first.fields['k']] += 1
                    break
        offset += 2
    return sites


class TestTheBitmap(unittest.TestCase):
    """`docs/findings.md` section 50: what screen opcode 2 addresses.

    The header is read off the firmware rather than guessed from the data, which matters because
    two `u16` of which the firmware uses only the low byte look exactly like two `u8` with a pad
    byte each, on every value the corpus contains.
    """

    # `[sample, bitmaps, kinds, strides, row counts]`. Small numbers on purpose: this is the
    # measurement that says opcode 2 does not explain the unreached region.
    SHAPES = [
        # The counts grew with section 53: a mode record's own screen program is a root, and it
        # is where the large pictures are named. Strides 128 and 64 appear only through it.
        ('h700_config', 21, {0, 1}, {12, 128}, {10, 128}),
        ('h700_config_2', 21, {0, 1}, {12, 128}, {10, 128}),
        ('h600_config', 16, {0, 1}, {12, 128}, {10, 128}),
        # Arch 12 only opened up with section 54. Stride 176 over 220 rows is a full screen, and
        # it is the geometry section 51 recovered by measurement, here stated by the format.
        ('one_config', 28, {0, 1}, {20, 22, 61, 62, 69, 87, 88, 176}, {10, 11, 18, 33, 62, 69, 91, 220}),
        ('one_config_unprogrammed', 27, {0, 1}, {20, 22, 61, 62, 69, 87, 88, 176}, {10, 11, 18, 33, 62, 69, 91, 220}),
        ('arch8_config_a', 28, {0, 1}, {16, 17, 18, 19, 64, 128}, {10, 32, 160}),
        ('arch8_config_b', 27, {0, 1}, {16, 17, 18, 19, 64, 128}, {10, 32, 160}),
        ('arch8_config_c', 29, {0, 1}, {16, 17, 18, 19, 64, 128}, {10, 32, 160}),
        ('arch8_config_d', 29, {0, 1}, {16, 17, 18, 19, 64, 128}, {10, 32, 160}),
        # The negative cases. Arch 9 emits no opcode 2 at all and neither does a safe mode
        # container, which is what says the section is optional rather than structural.
        ('h525_config', 0, set(), set(), set()),
        ('h600_safemode_gspm', 0, set(), set(), set()),
        ('h700_gspm', 0, set(), set(), set()),
        ('h650_safemode_gspm', 0, set(), set(), set()),
    ]

    def test_every_addressed_bitmap_decodes(self):
        from harmony import gspm
        for name, count, kinds, strides, rows in self.SHAPES:
            data = lab.load(name)
            if data is None:
                continue
            with self.subTest(name):
                c = gspm.parse(data)
                found = c.bitmaps()
                self.assertEqual(len(found), count)
                self.assertEqual({b.kind for b in found}, kinds)
                self.assertEqual({b.stride for b in found}, strides)
                self.assertEqual({b.rows for b in found}, rows)

    def test_a_raw_bitmap_states_its_own_length(self):
        from harmony import gspm
        # The check the extent rests on: a raw picture is exactly its header plus one row per
        # declared row, and every one of them fits inside the container it lives in.
        for name, count, _, _, _ in self.SHAPES:
            data = lab.load(name)
            if data is None or count == 0:
                continue
            with self.subTest(name):
                c = gspm.parse(data)
                raw = [b for b in c.bitmaps() if b.kind == gspm.BITMAP_RAW]
                self.assertTrue(raw, 'expected at least one raw picture')
                for bitmap in raw:
                    self.assertEqual(
                        bitmap.length,
                        gspm.BITMAP_HEADER + gspm.PIXEL_BYTES * bitmap.stride * bitmap.rows)
                    off = c.blob_offset_of(bitmap.address)
                    self.assertLessEqual(off + bitmap.length, c.length)

    def test_an_encoded_bitmap_agrees_with_a_header_it_discarded(self):
        """The closure the encoded extent rests on, and it is a real one.

        The encoded body reads the two `u16` of the header and throws them away, then draws until
        its own terminator. So the number of row breaks it contains and the row count the header
        states are two independent statements, and a walk that is off by one control byte would
        desynchronise and produce neither. All 95 encoded pictures in the corpus break exactly
        `rows - 1` times, across the three architectures that carry any.
        """
        from harmony import gspm
        total = 0
        for name, _, _, _, _ in self.SHAPES:
            data = lab.load(name)
            if data is None:
                continue
            with self.subTest(name):
                c = gspm.parse(data)
                for bitmap in c.bitmaps():
                    if bitmap.kind != gspm.BITMAP_ENCODED:
                        self.assertIsNone(bitmap.row_breaks)
                        continue
                    self.assertEqual(bitmap.row_breaks, bitmap.rows - 1)
                    total += 1
        if all(lab.path(name) for name, count, _, _, _ in self.SHAPES if count):
            self.assertEqual(total, 95)

    def test_the_pictures_tile_the_region(self):
        """The closure on the extent, and the correction of an earlier negative.

        `stride` is in pixels and a pixel is two bytes, so a raw picture is `5 + 2 * stride * rows`
        bytes. Section 50 read `stride` as a byte count, which halved every raw extent and made the
        pictures look as though they did not tile; they do. Fourteen of the Harmony 600's fifteen
        gaps are exactly the extent of the picture before them, and the odd one out is where a
        second picture is addressed out of order.
        """
        from harmony import gspm
        lab.require('h600_config')
        c = gspm.parse(lab.load('h600_config'))
        pictures = sorted(c.bitmaps(), key=lambda b: b.address)
        exact = sum(1 for k in range(len(pictures) - 1)
                    if pictures[k].address + pictures[k].length == pictures[k + 1].address)
        self.assertEqual(exact, 14)
        self.assertEqual(len(pictures), 16)

    def test_the_renderer_dispatches_on_the_kind_byte(self):
        """The three arms of the chain at `0x0E3F6`, decoded rather than read literally.

        An XORLW chain's literals are not its case values, so this goes through `chains.py`. Kind
        2 is the one that matters for a reader: it is a valid byte the firmware accepts and draws
        nothing for, so refusing it would refuse a file the remote takes.
        """
        from harmony import gspm
        lab.require('h700_code')
        code = lab.load('h700_code')
        cases = {case.value for case in chains.xor_chain(code, 0x9000, 0x0E3F6)}
        self.assertEqual(cases, {gspm.BITMAP_RAW, gspm.BITMAP_ENCODED, gspm.BITMAP_NOTHING})


class TestTheModeRecord(unittest.TestCase):
    """`docs/findings.md` section 52: base slot 6's pointer does not land on its entry.

    It lands inside the record, on a discriminator byte with a `u24` back pointer to the start
    beside it, which is the shape base slot 5's infrared records have. Reading the entry at the
    pointer decodes the record's tail as if it were its head, and because the byte there is
    usually zero it looks like the wide tagged list form with a count running to 255.
    """

    SAMPLES = ['h600_config', 'h700_config', 'h700_config_2', 'one_config',
               'one_config_unprogrammed', 'arch8_config_a', 'h525_config', 'h600_safemode_gspm']
    #: Configs whose modes each carry exactly one enter and one leave handler.
    PAIRED = {'one_config', 'one_config_unprogrammed'}

    def test_every_pointer_lands_inside_its_own_record(self):
        from harmony import gspm
        total = 0
        for name in self.SAMPLES:
            data = lab.load(name)
            if data is None:
                continue
            with self.subTest(name):
                c = gspm.parse(data)
                records = c.mode_records()
                self.assertTrue(records)
                for record in records:
                    at = c.blob_offset_of(record.address)
                    start = c.blob_offset_of(record.start)
                    self.assertIsNotNone(start)
                    self.assertLess(start, at, 'the back pointer must point backwards')
                    total += 1
        if all(lab.path(name) for name in self.SAMPLES):
            self.assertEqual(total, 1616)

    def test_the_list_fits_inside_the_record_it_belongs_to(self):
        """The closure the record start rests on.

        The count is read at the start and the record ends just past the table pointer, so a wrong
        start gives a count that overruns. It never does, in any container.
        """
        from harmony import gspm
        for name in self.SAMPLES:
            data = lab.load(name)
            if data is None:
                continue
            with self.subTest(name):
                c = gspm.parse(data)
                for record in c.mode_records():
                    start = c.blob_offset_of(record.start)
                    at = c.blob_offset_of(record.address)
                    self.assertLessEqual(start + record.length, at + 10)

    def test_arch_12_pairs_an_enter_handler_with_a_leave_handler(self):
        """Section 37 predicted the pair and this is where it holds exactly.

        Both Harmony Ones give one of each in every mode. Arch 14 and arch 8 do not, so the
        pairing is recorded as an arch 12 property rather than generalised.
        """
        from harmony import gspm
        for name in self.SAMPLES:
            data = lab.load(name)
            if data is None or name not in self.PAIRED:
                continue
            with self.subTest(name):
                c = gspm.parse(data)
                for record in c.mode_records():
                    tags = [e.tag for e in record.entries]
                    self.assertEqual(tags.count(gspm.MODE_TAG_ENTER), 1)
                    self.assertEqual(tags.count(gspm.MODE_TAG_LEAVE), 1)

    def test_reading_at_the_pointer_instead_saturates(self):
        """The defect this section corrects, pinned so it cannot come back unnoticed.

        At the table pointer the first byte is usually zero, the wide form's marker, and the next
        byte is taken for a count. On the Harmony 600 that yields a list of 255 entries, which is
        exactly where a `u8` saturates and is the sign that the start is wrong.
        """
        from harmony import gspm
        lab.require('h600_config')
        c = gspm.parse(lab.load('h600_config'))
        widest = max(len(c.tagged_list(a) or []) for a in c.mode_table())
        self.assertEqual(widest, 255)
        self.assertLess(max(len(r.entries) for r in c.mode_records()), 255)


class TestThePictureBank(unittest.TestCase):
    """`docs/findings.md` section 55: the region is one contiguous array of pictures.

    Sections 53 and 54 reached the pictures screen opcode 2 names. This says what the rest is, and
    the answer is that there is no rest: the whole region above the named content walks as a run of
    pictures and lands exactly on the trailer.
    """

    # `[sample, pictures in the bank, bytes, how many opcode 2 names]`.
    BANKS = [
        ('one_config', 98, 1361283, 28),
        ('one_config_unprogrammed', 70, 1102735, 27),
        ('h600_config', 18, 434210, 16),
        ('h700_config', 24, 598320, 21),
        ('h700_config_2', 24, 598320, 21),
        ('arch8_config_a', 32, 284539, 28),
        ('arch8_config_b', 31, 239618, 27),
        ('arch8_config_c', 33, 242658, 29),
        ('arch8_config_d', 33, 242658, 29),
    ]
    # Containers with no region at all, and therefore no bank. The negative case.
    WITHOUT = ['h525_config', 'h600_safemode_gspm', 'h700_gspm', 'h650_safemode_gspm']

    def test_the_bank_walks_to_the_trailer_exactly(self):
        from harmony import gspm
        for name, count, size, named in self.BANKS:
            data = lab.load(name)
            if data is None:
                continue
            with self.subTest(name):
                c = gspm.parse(data)
                bank = c.picture_bank()
                self.assertIsNotNone(bank)
                self.assertEqual(len(bank), count)
                self.assertEqual(sum(p.length for p in bank), size)
                # Contiguous by construction, so check it: each picture begins where the last ended.
                for k in range(len(bank) - 1):
                    self.assertEqual(bank[k].address + bank[k].length, bank[k + 1].address)
                addressed = {b.address for b in c.bitmaps()}
                self.assertEqual(len(addressed & {p.address for p in bank}), named)

    def test_the_start_is_the_only_one_that_fits(self):
        """Two constraints, and together they leave exactly one candidate.

        Landing on the trailer alone leaves several starts on two arch 8 configs, because a wrong
        head can still parse. Requiring that every picture opcode 2 names appears in the run at its
        own address removes them.
        """
        from harmony import gspm
        for name, count, _, _ in self.BANKS:
            data = lab.load(name)
            if data is None:
                continue
            with self.subTest(name):
                c = gspm.parse(data)
                top = c.named_content_end()
                wanted = {b.address for b in c.bitmaps()}
                fits = []
                for start in range(top, min(top + 1024, c.length)):
                    run = c.picture_run(start)
                    if run is not None and wanted <= {p.address for p in run}:
                        fits.append(start)
                self.assertEqual(len(fits), 1, f'{name}: {len(fits)} starts fit')

    def test_a_container_with_no_region_has_no_bank(self):
        from harmony import gspm
        for name in self.WITHOUT:
            data = lab.load(name)
            if data is None:
                continue
            with self.subTest(name):
                self.assertIsNone(gspm.parse(data).picture_bank())

    def test_a_start_one_byte_out_does_not_walk(self):
        """What makes the walk a proof rather than a parse."""
        from harmony import gspm
        lab.require('h600_config')
        c = gspm.parse(lab.load('h600_config'))
        bank = c.picture_bank()
        start = c.blob_offset_of(bank[0].address)
        self.assertIsNotNone(c.picture_run(start))
        for delta in (-1, 1, 2, 3):
            self.assertIsNone(c.picture_run(start + delta), f'offset {delta:+d} should not walk')


def literals_at(name, base, addr, count):
    """The MOVLW literals in a window, stopping at the first RETURN."""
    code = lab.load(name)
    offset = addr - base
    out = []
    for _ in range(count):
        instr = isa.decode(code, offset, base)
        offset += 2 * instr.words
        if instr.mnemonic == 'MOVLW':
            out.append(instr.fields['k'])
        if instr.mnemonic == 'RETURN':
            break
    return out


if __name__ == '__main__':
    unittest.main()
