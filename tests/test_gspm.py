"""
The config container, against every sample available.

Thirteen samples across four architectures, five base addresses and three format versions. The
point is that the parser derives the base address, the pointer count and the marker position
from the data rather than from a per-model table, so these assertions check that derivation
rather than a hardcoded lookup.

The two non-GSPM architectures are here on purpose. `docs/config-format.md` claims this is
one container with a per-architecture cookie rather than a family resemblance, and arch 8 and
arch 9 are the samples that can falsify that claim. They currently confirm it.
"""
import unittest

import lab
from harmony import gspm

# logical image name -> (magic, base, format version, pointer slots, marker, key records)
EXPECTED = {
    'one_safemode': (b'GSPM', 0x002000, '1.6', 21, b'LWJL', 2),
    'one34_region2': (b'GSPM', 0x002000, '1.6', 21, b'LWJL', 2),
    'h700_gspm': (b'GSPM', 0x020000, '1.4', 19, b'LWJL', 0),
    'one_config': (b'GSPM', 0x040000, '1.6', 21, b'LWJL', 55),
    'one_config_unprogrammed': (b'GSPM', 0x040000, '1.6', 21, b'LWJL', 55),
    'h600_config': (b'GSPM', 0x030000, '1.4', 19, b'LWJL', 162),
    'h700_config': (b'GSPM', 0x030000, '1.4', 19, b'LWJL', 163),
    'h700_config_2': (b'GSPM', 0x030000, '1.4', 19, b'LWJL', 163),
    'h525_config': (b'AHCM', 0x020000, '1.4', 19, b'CMAH', 0),
    'arch8_config_a': (b'TPTP', 0x020000, '1.5', 20, b'WLWL', 56),
    'arch8_config_b': (b'TPTP', 0x020000, '1.5', 20, b'WLWL', 56),
    'arch8_config_c': (b'TPTP', 0x020000, '1.5', 20, b'WLWL', 56),
    'arch8_config_d': (b'TPTP', 0x020000, '1.5', 20, b'WLWL', 56),
}

# logical image name -> the architecture the sample is independently known to be, from the
# EZHex header's <PROTOCOL> field or from the firmware package the container came out of.
# This is the calibration set for the claim that slot 1 states the architecture: every entry
# has an answer established without reading slot 1 at all.
KNOWN_ARCHITECTURE = {
    'one_safemode': 12,             # dumped from a Harmony One
    'one34_region2': 12,            # packed inside One firmware 3.4
    'h700_gspm': 14,                # packed inside Harmony 700 firmware 2.8
    'one_config': 12,               # <PROTOCOL>12</PROTOCOL>
    'one_config_unprogrammed': 12,
    'h600_config': 14,
    'h700_config': 14,
    'h700_config_2': 14,
    'h525_config': 9,
    'arch8_config_a': 8,
    'arch8_config_b': 8,
    'arch8_config_c': 8,
    'arch8_config_d': 8,
}


class TestContainerAcrossSamples(unittest.TestCase):
    def test_each_sample_parses_with_expected_shape(self):
        for name, (magic, base, version, slots, marker, keys) in EXPECTED.items():
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                self.assertEqual(c.family.magic, magic)
                self.assertEqual(c.flash_base, base, 'recovered flash base')
                self.assertEqual(c.format_version, version)
                self.assertEqual(c.pointer_count, slots)
                self.assertEqual(c.marker, marker)
                self.assertEqual(len(c.keys), keys)

    def test_all_consistency_checks_pass(self):
        for name in EXPECTED:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                for check, ok in c.checks.items():
                    self.assertTrue(ok, '%s failed check %s' % (name, check))

    def test_end_addr_locates_the_end_marker(self):
        for name in EXPECTED:
            with self.subTest(image=name):
                data = lab.load(name)
                c = gspm.parse(data)
                blob = data[c.blob_offset:c.blob_offset + c.length]
                off = c.end_addr - c.flash_base
                self.assertEqual(blob[off:off + 4], c.family.end_marker)

    def test_pointer_count_derivation_matches_marker_position(self):
        """The marker sits at 0x0C + 4 * slots + 3, whatever the architecture."""
        for name, (_, _, _, slots, _, _) in EXPECTED.items():
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                self.assertEqual(c.marker_offset, 0x0C + 4 * slots + 3)

    def test_the_corpus_spans_more_than_one_of_everything(self):
        """A derivation confirmed on one value of a variable is not confirmed."""
        seen = [gspm.parse(lab.load(n)) for n in EXPECTED]
        self.assertGreaterEqual(len({c.family.magic for c in seen}), 3, 'architectures')
        self.assertGreaterEqual(len({c.flash_base for c in seen}), 4, 'base addresses')
        self.assertGreaterEqual(len({c.format_version for c in seen}), 3, 'format versions')
        self.assertGreaterEqual(len({c.pointer_count for c in seen}), 3, 'table lengths')
        self.assertGreaterEqual(len({c.architecture for c in seen}), 4, 'architectures')


class TestPointerTablePaddingAmbiguity(unittest.TestCase):
    """
    On arch 8 and arch 9 the derived slot count leaves a trailing NULL pointer, and that is
    indistinguishable from a shorter table with more zero padding: 18 pointers plus seven
    zero bytes reads identically to 19 pointers plus three. Both decode the same, because a
    zero pointer means the section is absent, so the parser takes the longer reading and this
    test pins the consequence rather than pretending the question is settled.
    """

    def test_trailing_slot_is_null_where_the_padding_is_long(self):
        for name in ('h525_config', 'arch8_config_a'):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                self.assertTrue(c.sections[-1].is_null)
                self.assertFalse(c.sections[-2].is_null)


class TestKeyTableAcrossArchitectures(unittest.TestCase):
    """
    The marker after the pointer table starts a key table on arch 8 and arch 12/14. On arch 9
    the byte where a count would sit is zero, so nothing is claimed for it.
    """

    def test_arch8_and_arch12_share_their_non_matrix_codes(self):
        arch8 = gspm.parse(lab.load('arch8_config_a'))
        one = gspm.parse(lab.load('one_config'))
        non_matrix = lambda c: sorted(k.event_code for k in c.keys if not k.is_matrix)
        self.assertEqual(non_matrix(arch8), [0x06, 0x07, 0x2D])
        self.assertEqual(non_matrix(one), [0x06, 0x07, 0x2D])

    def test_arch8_and_arch12_share_a_canonical_code_ordering(self):
        """
        47 codes appear in both tables, and on that shared subset the two architectures list
        them in the same order apart from one adjacent transposition: the One has 0x06 0x8E
        0x07 where arch 8 has 0x06 0x07 0x8E. Drop 0x8E and the sequences are identical.

        That matters for the button mapping problem. If the ordering is Logitech's canonical
        key order rather than anything per model, then establishing which physical button
        each code belongs to on one remote carries most of the way to the others.
        """
        one = [k.event_code for k in gspm.parse(lab.load('one_config')).keys]
        arch8 = [k.event_code for k in gspm.parse(lab.load('arch8_config_a')).keys]
        shared = set(one) & set(arch8)
        self.assertEqual(len(shared), 47)

        one_seq = [c for c in one if c in shared and c != 0x8E]
        arch8_seq = [c for c in arch8 if c in shared and c != 0x8E]
        self.assertEqual(one_seq, arch8_seq)

        # And the transposition really is only 0x8E: with it in place they differ.
        self.assertNotEqual([c for c in one if c in shared],
                            [c for c in arch8 if c in shared])

    def test_the_four_arch8_configs_carry_an_identical_key_table(self):
        """Four configs of one remote, 73 to 84 percent of bytes different, same key table."""
        tables = []
        for name in ('arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d'):
            c = gspm.parse(lab.load(name))
            tables.append([(k.event_code, k.flags) for k in c.keys])
        for other in tables[1:]:
            self.assertEqual(tables[0], other)

    def test_arch9_declares_no_key_records_at_its_marker(self):
        c = gspm.parse(lab.load('h525_config'))
        self.assertFalse(c.has_key_table)
        self.assertEqual(c.keys, [])


class TestTheConfigStatesItsOwnArchitecture(unittest.TestCase):
    """
    Section slot 1 is a seven byte record whose first two bytes are the architecture number,
    written twice. That is what lets a config read off a remote be parsed correctly: over USB
    there is no EZHex header to read <PROTOCOL> from, and the cookie is not enough because
    `GSPM` covers both arch 12 and arch 14.
    """

    def test_slot1_agrees_with_the_independently_known_architecture(self):
        for name, arch in KNOWN_ARCHITECTURE.items():
            with self.subTest(image=name):
                self.assertEqual(gspm.parse(lab.load(name)).architecture, arch)

    def test_the_calibration_set_covers_four_architectures(self):
        """Otherwise this is confirmed on one value of the variable being claimed."""
        self.assertEqual(sorted(set(KNOWN_ARCHITECTURE.values())), [8, 9, 12, 14])

    def test_the_architecture_is_not_derivable_from_the_cookie(self):
        """The reason slot 1 is needed at all: GSPM spans two architectures."""
        by_cookie = {}
        for name in KNOWN_ARCHITECTURE:
            c = gspm.parse(lab.load(name))
            by_cookie.setdefault(c.family.magic, set()).add(c.architecture)
        self.assertEqual(by_cookie[b'GSPM'], {12, 14})

    def test_disagreeing_copies_are_not_reported_as_an_architecture(self):
        """
        Two identical bytes could be a coincidence, so the parser only believes them when
        they agree. Corrupt one copy and it must report nothing rather than guess.
        """
        data = bytearray(lab.load('h700_config'))
        c = gspm.parse(bytes(data))
        o = c.file_offset(c.sections[1].address)
        self.assertEqual(data[o], 14)
        data[o + 1] ^= 0xFF
        broken = gspm.parse(bytes(data))
        self.assertIsNone(broken.architecture)
        self.assertFalse(broken.checks['slot1_states_the_architecture'])

    def test_the_version_word_is_per_model_not_per_config(self):
        """
        The u16 beside the architecture is identical in configs of the same model and differs
        between models, including across the two arch 14 models. Its meaning is not
        established; this pins the observation so a later claim has to survive it.
        """
        word = lambda n: gspm.parse(lab.load(n)).version_word

        # Two different Harmony One units, two configs, same word.
        self.assertEqual(word('one_config'), word('one_config_unprogrammed'))
        # Four arch 8 configs of one remote, generated minutes apart, same word.
        self.assertEqual(len({word(n) for n in ('arch8_config_a', 'arch8_config_b',
                                               'arch8_config_c', 'arch8_config_d')}), 1)
        # The 600 and the 700 are both arch 14 and differ, so it is not the architecture.
        self.assertNotEqual(word('h600_config'), word('h700_config'))
        # A user config for a 700 and the container inside 700 firmware 2.8 agree, which is
        # the same value reached by two unrelated provenances.
        self.assertEqual(word('h700_config'), word('h700_gspm'))
        # And it is not the skin: the One's safe mode config is the same model as its user
        # config, same skin, yet carries an older word.
        self.assertNotEqual(word('one_config'), word('one_safemode'))


class TestSlotZeroIsTheOnlyFeedFrame(unittest.TestCase):
    """
    Corrects a claim this project published: that every section the pointer table points at
    is a `0xFEED`/`0xBEEF` frame. Only slot 0 is. The reasoning is in `docs/findings.md`.
    """

    def test_slot0_is_a_frame_in_every_sample(self):
        for name in EXPECTED:
            with self.subTest(image=name):
                self.assertIsNotNone(gspm.parse(lab.load(name)).frame_length)

    def test_the_frame_ends_exactly_where_the_next_section_starts(self):
        """
        The frame occupies length + 2 bytes: the length counts from the cookie and stops
        short of the terminator. That the next pointer lands on exactly that byte is an
        independent confirmation of the length rule, since the two come from different
        places in the file.
        """
        for name in EXPECTED:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                if not c.frame_length:
                    continue                       # empty frame, nothing to close
                start = c.blob_offset_of(c.sections[0].address)
                self.assertEqual(c.blob_offset_of(c.sections[1].address),
                                 start + c.frame_length + 2)

    def test_no_other_frame_exists_in_the_container(self):
        """
        The negative, and the one that matters: chance `ed fe` byte pairs are common in a
        1.6 MB config, and none of them validates. Without this the correction is only an
        assertion that the other sections were not checked.
        """
        for name in EXPECTED:
            with self.subTest(image=name):
                data = lab.load(name)
                c = gspm.parse(data)
                blob = data[c.blob_offset:c.blob_offset + c.length]
                frames = [o for o in range(len(blob) - 8)
                          if gspm.frame_length(blob, o) is not None]
                self.assertEqual(frames, [c.blob_offset_of(c.sections[0].address)])

    def test_chance_cookies_outnumber_real_frames_in_the_one_config(self):
        """Why counting the cookie was the wrong check, as a number rather than a claim."""
        data = lab.load('one_config')
        c = gspm.parse(data)
        blob = data[c.blob_offset:c.blob_offset + c.length]
        self.assertGreater(blob.count(gspm.FRAME_COOKIE), 20)

    def test_every_non_empty_frame_carries_the_same_prologue(self):
        for name in EXPECTED:
            with self.subTest(image=name):
                data = lab.load(name)
                c = gspm.parse(data)
                if not c.frame_length:
                    continue
                o = c.file_offset(c.sections[0].address)
                self.assertEqual(data[o + 5:o + 5 + len(gspm.FRAME_PROLOGUE)],
                                 gspm.FRAME_PROLOGUE)

    def test_a_flipped_length_byte_stops_the_frame_validating(self):
        """A frame check that cannot fail is not a check."""
        data = bytearray(lab.load('h700_config'))
        c = gspm.parse(bytes(data))
        o = c.file_offset(c.sections[0].address)
        data[o + 2] ^= 0x01
        self.assertIsNone(gspm.frame_length(
            bytes(data[c.blob_offset:c.blob_offset + c.length]),
            c.blob_offset_of(c.sections[0].address)))


class TestPointerArraySections(unittest.TestCase):
    """
    Six sections per architecture are a count followed by that many three byte absolute flash
    pointers. They are recognised structurally, not tabulated: the count is a u8 or a u16 and
    is accepted only when `width + 3 * count` accounts for the section exactly.
    """

    # Slot numbers in the 19 slot base layout, so one expectation covers all architectures.
    BASE_SLOTS = [5, 7, 10, 11, 12, 15]

    CONFIGS = ('h700_config', 'h600_config', 'h525_config', 'one_config',
               'one_config_unprogrammed', 'arch8_config_a', 'arch8_config_b',
               'arch8_config_c', 'arch8_config_d')

    def test_the_same_six_sections_are_arrays_in_every_config(self):
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                found = [gspm.base_slot(c.architecture, s) for s in c.pointer_array_slots]
                self.assertEqual(found, self.BASE_SLOTS)

    def test_every_entry_is_an_address_inside_the_config(self):
        """A three byte value that lands outside the config would mean the reading is wrong."""
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                for slot in c.pointer_array_slots:
                    for addr in c.pointer_array(slot):
                        self.assertTrue(c.flash_base <= addr <= c.end_addr,
                                        'slot %d has 0x%06X outside 0x%06X..0x%06X'
                                        % (slot, addr, c.flash_base, c.end_addr))

    def test_entries_ascend(self):
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                for slot in c.pointer_array_slots:
                    entries = c.pointer_array(slot)
                    self.assertEqual(entries, sorted(entries), 'slot %d' % slot)

    def test_a_section_that_is_not_an_array_reads_as_none(self):
        """The recogniser has to reject, or finding six slots means nothing."""
        c = gspm.parse(lab.load('h700_config'))
        for slot in (0, 1, 2, 3, 4, 6, 8, 9, 13, 14, 16, 17, 18):
            self.assertIsNone(c.pointer_array(slot), 'slot %d' % slot)


class TestTheHarmony700Pair(unittest.TestCase):
    """
    Two configs of the same Harmony 700, posted together by their owner in harmony-decompiler
    issue 9, with their own written account of what differs: one new sequence, one reassigned
    standard button, two new additional buttons, and no device changed. `h700_config_2` is the
    older of the two.

    A described change against an unchanged structure is what makes negatives possible, and the
    negatives here are firmer than any label: the key table cannot be the button to action map,
    and nothing the pointer arrays index is allocated per assignment. The pair also pins that
    those arrays hold real pointers, since every entry moves by exactly the layout shift and
    that shift is known independently from the header's own pointer table.
    """

    def setUp(self):
        self.a = gspm.parse(lab.load('h700_config'))
        self.b = gspm.parse(lab.load('h700_config_2'))

    def test_the_pair_is_the_same_remote(self):
        for attr in ('architecture', 'version_word', 'flash_base', 'pointer_count',
                     'format_raw', 'frame_length'):
            self.assertEqual(getattr(self.a, attr), getattr(self.b, attr), attr)
        # Slot 0 holds the named state variables, so an identical slot 0 means an identical
        # set of devices with identical roles. This is what makes them the same installation
        # rather than merely the same model.
        la = self.a.section_length(0)
        self.assertEqual(la, self.b.section_length(0))
        pa = self.a.blob[self.a.blob_offset_of(self.a.sections[0].address):][:la]
        pb = self.b.blob[self.b.blob_offset_of(self.b.sections[0].address):][:la]
        self.assertEqual(pa, pb, 'the state variable section is byte identical')
        # And the key table, byte for byte, so no button was remapped.
        self.assertEqual([(k.event_code, k.index, k.flags) for k in self.a.keys],
                         [(k.event_code, k.index, k.flags) for k in self.b.keys])

    def test_exactly_one_section_changed_size(self):
        changed = [i for i in range(self.a.pointer_count)
                   if self.a.section_length(i) != self.b.section_length(i)]
        self.assertEqual(changed, [8])
        # `b` is the older dump, so the newer one is eight bytes shorter here and 58 shorter
        # overall, despite the owner's notes describing only additions.
        self.assertEqual(self.b.section_length(8) - self.a.section_length(8), 8)
        self.assertEqual(len(self.b.blob) - len(self.a.blob), 58)

    def test_the_key_table_does_not_hold_button_assignments(self):
        """
        The owner's notes say this change reassigned UpArrow and added TV Vol+ and TV Vol-. The
        key table is byte identical across the pair, so it cannot be the button to action map.
        A negative, and the most solid conclusion the pair supports.
        """
        end_a = self.a.marker_offset + 5 + 4 * len(self.a.keys)
        end_b = self.b.marker_offset + 5 + 4 * len(self.b.keys)
        self.assertEqual(self.a.blob[self.a.marker_offset:end_a],
                         self.b.blob[self.b.marker_offset:end_b])
        self.assertEqual(len(self.a.keys), 163)

    def test_no_pointer_array_count_changed(self):
        """So nothing those arrays index is allocated per button or per sequence."""
        self.assertEqual([len(self.a.pointer_array(s)) for s in self.a.pointer_array_slots],
                         [len(self.b.pointer_array(s)) for s in self.b.pointer_array_slots])
        self.assertEqual([len(self.a.pointer_array(s)) for s in self.a.pointer_array_slots],
                         [6, 17, 8037, 5711, 9, 9])

    def test_the_sections_rewritten_wholesale_are_not_merely_displaced(self):
        """
        Slots 9 and 17 differ in about 90 percent of their bytes at unchanged size. Read as 2, 3
        or 4 byte values almost none of them moved by the layout shift, so that is new content
        rather than the same content at new addresses. This is what stops "only one section
        changed size" being read as "only one section changed".
        """
        for slot in (9, 17):
            with self.subTest(slot=slot):
                length = self.a.section_length(slot)
                self.assertEqual(length, self.b.section_length(slot))
                oa = self.a.blob_offset_of(self.a.sections[slot].address)
                ob = self.b.blob_offset_of(self.b.sections[slot].address)
                differing = sum(1 for x, y in zip(self.a.blob[oa:oa + length],
                                                  self.b.blob[ob:ob + length]) if x != y)
                self.assertGreater(differing / length, 0.85)
                for stride in (2, 3, 4):
                    moved = 0
                    for k in range(length // stride):
                        x = int.from_bytes(self.a.blob[oa+k*stride:oa+(k+1)*stride], 'little')
                        y = int.from_bytes(self.b.blob[ob+k*stride:ob+(k+1)*stride], 'little')
                        if x - y in (50, 58):
                            moved += 1
                    self.assertLess(moved / (length // stride), 0.01,
                                    'stride %d looks displaced rather than rewritten' % stride)

    def test_the_state_variable_section_survived_a_change_that_touched_no_device(self):
        """The pair's calibration case for slot 0: it should not have moved, and it did not."""
        length = self.a.section_length(0)
        oa = self.a.blob_offset_of(self.a.sections[0].address)
        ob = self.b.blob_offset_of(self.b.sections[0].address)
        self.assertEqual(self.a.blob[oa:oa + length], self.b.blob[ob:ob + length])

    def test_the_version_word_is_not_a_timestamp_or_a_revision(self):
        """Two dumps of one remote about two years apart, with a change between them."""
        self.assertEqual(self.a.version_word, self.b.version_word)
        self.assertEqual(self.a.version_word, 3394)

    def test_the_layout_shift_is_uniform_either_side_of_it(self):
        """50 bytes up to the section whose size changed, 58 after it, which is 50 plus its 8."""
        shifts = {}
        for i in range(self.a.pointer_count):
            if self.a.sections[i].is_null:
                continue
            shifts.setdefault(
                self.b.sections[i].address - self.a.sections[i].address, []).append(i)
        self.assertEqual(sorted(shifts), [50, 58])
        self.assertEqual(shifts[50], list(range(0, 9)))
        self.assertEqual(shifts[58], list(range(9, 18)))

    def test_every_pointer_array_entry_moves_by_the_layout_shift(self):
        """
        The closure that makes these arrays pointers rather than a coincidence: the shift is
        derived from the header's pointer table, and the entries of six unrelated sections
        reproduce it. Slot 10 is excluded because it addresses the region that was rewritten,
        where targets moved by varying amounts rather than by the layout shift alone.
        """
        for slot in self.a.pointer_array_slots:
            if slot == 10:
                continue
            with self.subTest(slot=slot):
                deltas = {y - x for x, y in zip(self.a.pointer_array(slot),
                                                self.b.pointer_array(slot))}
                self.assertEqual(len(deltas), 1, 'slot %d has mixed deltas' % slot)
                self.assertIn(deltas.pop(), (50, 58))

    def test_slot10_addresses_the_region_that_was_rewritten(self):
        """Stated as the exception it is, rather than left as an unexplained failure."""
        deltas = {y - x for x, y in zip(self.a.pointer_array(10), self.b.pointer_array(10))}
        self.assertGreater(len(deltas), 1)
        self.assertEqual(len(self.a.pointer_array(10)), 8037)


class TestSlotAlignmentAcrossArchitectures(unittest.TestCase):
    """
    The pointer table is one table with per architecture insertions, so a section labelled on
    one architecture transfers to the others by index. That matters because the format work is
    done on arch 14, where every config read passes through a single SPI primitive, while the
    popular remote is the arch 12 Harmony One.
    """

    def test_the_mapping_collapses_every_fingerprint_onto_the_base_layout(self):
        """
        Two independent fingerprints, the six pointer array slots and the single one byte
        section, both land on the same base slots for all four architectures. Two anchors that
        agree is what makes this an alignment rather than an arithmetic coincidence.
        """
        for name in ('h700_config', 'h600_config', 'h525_config', 'one_config',
                     'one_config_unprogrammed', 'arch8_config_a'):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                arrays = [gspm.base_slot(c.architecture, s) for s in c.pointer_array_slots]
                one_byte = [gspm.base_slot(c.architecture, i)
                            for i in range(c.pointer_count) if c.section_length(i) == 1]
                self.assertEqual(arrays, [5, 7, 10, 11, 12, 15])
                self.assertEqual(one_byte, [16])

    def test_the_base_layouts_trailing_slot_is_null_on_every_architecture(self):
        """A third anchor, and it is free: base slot 18 is NULL in all four."""
        for name in ('h700_config', 'h525_config', 'one_config', 'arch8_config_a'):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                self.assertTrue(c.sections[gspm.arch_slot(c.architecture, 18)].is_null)

    def test_inserted_slots_are_null_except_the_one_arch12_uses(self):
        c12 = gspm.parse(lab.load('one_config'))
        self.assertTrue(c12.sections[8].is_null)
        self.assertFalse(c12.sections[18].is_null)
        self.assertIsNone(gspm.base_slot(12, 18))
        c8 = gspm.parse(lab.load('arch8_config_a'))
        self.assertTrue(c8.sections[8].is_null)

    def test_the_mapping_round_trips(self):
        for arch in (8, 9, 12, 14):
            for base in range(19):
                with self.subTest(arch=arch, base=base):
                    self.assertEqual(gspm.base_slot(arch, gspm.arch_slot(arch, base)), base)

    def test_an_unknown_architecture_refuses_rather_than_guesses(self):
        with self.assertRaises(gspm.GspmError):
            gspm.base_slot(7, 0)


class TestArch12SafeModeConfig(unittest.TestCase):
    def test_two_key_recovery_ui(self):
        c = gspm.parse(lab.load('one_safemode'))
        self.assertEqual([k.event_code for k in c.keys], [0xAF, 0xAE])
        self.assertTrue(all(k.flags == 0 for k in c.keys))

    def test_region2_prefix_is_the_same_container(self):
        """
        The arch 12 update package packs the safe-mode config ahead of the code, and it is
        byte-identical to what the remote hands back. That equality is what establishes the
        split point between the two halves.
        """
        dumped = lab.load('one_safemode')
        packaged = lab.load('one34_region2')
        from_dump = gspm.parse(dumped)
        blob = dumped[from_dump.blob_offset:from_dump.blob_offset + from_dump.length]
        self.assertEqual(packaged[:len(blob)], blob)


if __name__ == '__main__':
    unittest.main()
