"""
The config container, against every sample available.

Twelve samples across four architectures, five base addresses and three format versions. The
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
