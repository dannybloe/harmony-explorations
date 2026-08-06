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
import datetime
import itertools
import unittest

import lab
from harmony import gspm

# logical image name -> (magic, base, format version, pointer slots, marker, key records)
EXPECTED = {
    'one_safemode': (b'GSPM', 0x002000, '1.6', 22, b'LWJL', 2),
    'one34_region2': (b'GSPM', 0x002000, '1.6', 22, b'LWJL', 2),
    'h700_gspm': (b'GSPM', 0x020000, '1.4', 20, b'LWJL', 0),
    'one_config': (b'GSPM', 0x040000, '1.6', 22, b'LWJL', 55),
    'one_config_unprogrammed': (b'GSPM', 0x040000, '1.6', 22, b'LWJL', 55),
    'h600_config': (b'GSPM', 0x030000, '1.4', 20, b'LWJL', 162),
    'h700_config': (b'GSPM', 0x030000, '1.4', 20, b'LWJL', 163),
    'h700_config_2': (b'GSPM', 0x030000, '1.4', 20, b'LWJL', 163),
    'h525_config': (b'AHCM', 0x020000, '1.4', 20, b'CMAH', 0),
    'arch8_config_a': (b'TPTP', 0x020000, '1.5', 21, b'WLWL', 56),
    'arch8_config_b': (b'TPTP', 0x020000, '1.5', 21, b'WLWL', 56),
    'arch8_config_c': (b'TPTP', 0x020000, '1.5', 21, b'WLWL', 56),
    'arch8_config_d': (b'TPTP', 0x020000, '1.5', 21, b'WLWL', 56),
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
        """The table runs from 0x0B to the marker with nothing left over.

        Stated as the closure it is: the section table starts at 0x0B, an item is four bytes,
        and the marker begins exactly where the last item ends. The arithmetic that used to be
        here had a `+ 3` in it, which is what an off by one looks like before it is understood:
        those three bytes are the final item's pointer, not padding.
        """
        for name, (_, _, _, slots, _, _) in EXPECTED.items():
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                self.assertEqual(
                    c.marker_offset,
                    gspm.SECTION_TABLE_OFFSET + gspm.SECTION_ITEM_SIZE * slots)
                self.assertEqual(c.pointer_count, slots)

    def test_the_corpus_spans_more_than_one_of_everything(self):
        """A derivation confirmed on one value of a variable is not confirmed."""
        seen = [gspm.parse(lab.load(n)) for n in EXPECTED]
        self.assertGreaterEqual(len({c.family.magic for c in seen}), 3, 'architectures')
        self.assertGreaterEqual(len({c.flash_base for c in seen}), 4, 'base addresses')
        self.assertGreaterEqual(len({c.format_version for c in seen}), 3, 'format versions')
        self.assertGreaterEqual(len({c.pointer_count for c in seen}), 3, 'table lengths')
        self.assertGreaterEqual(len({c.architecture for c in seen}), 4, 'architectures')


class TestPointerTableLength(unittest.TestCase):
    """
    This class used to be called TestPointerTablePaddingAmbiguity, and it recorded a question the
    parser could not answer: a trailing NULL pointer is indistinguishable from a shorter table
    with more zero padding, so 18 pointers plus seven zero bytes reads identically to 19 plus
    three. It took the longer reading and pinned the consequence rather than claiming to know.

    The question is now closed, and the answer was a third reading neither option covered. The
    table starts at 0x0B, not 0x0C, because an item is a spare byte followed by a three byte
    pointer. Once the start is fixed the length follows from the marker position with nothing
    left over, so there is no padding to be ambiguous about: what looked like three bytes of it
    is the final item's pointer. Every architecture ends in NULL sections, two of them on the
    base layout, and they are sections rather than slack.
    """

    def test_the_table_ends_exactly_at_the_marker(self):
        for name in EXPECTED:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                # No remainder. A table start of 0x0C leaves three bytes over on every sample.
                self.assertEqual(
                    (c.marker_offset - gspm.SECTION_TABLE_OFFSET) % gspm.SECTION_ITEM_SIZE, 0)
                self.assertEqual(
                    gspm.SECTION_TABLE_OFFSET + gspm.SECTION_ITEM_SIZE * c.pointer_count,
                    c.marker_offset)

    def test_the_base_layout_ends_in_two_null_sections(self):
        """Base slots 18 and 19 are NULL on all four architectures, wherever they land."""
        for name in EXPECTED:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                for base in (18, 19):
                    slot = gspm.arch_slot(c.architecture, base)
                    self.assertTrue(c.sections[slot].is_null,
                                    'base slot %d (slot %d) is not NULL' % (base, slot))

    def test_reading_an_item_as_a_four_byte_pointer_is_indistinguishable_here(self):
        """Why the old reading produced correct addresses anyway, stated as a test.

        Every spare byte in the corpus is zero, so a four byte read at the pointer offset
        returns the same value as a three byte one. That is a property of these samples and not
        of the format, which is the reason the parser reads three and checks the spare byte.

        It holds for every slot but the last, and that exception is the whole story: a four byte
        read of the final item runs into the marker, which is why a parser built on four byte
        pointers could not have had that slot in the first place.
        """
        for name in EXPECTED:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                self.assertTrue(all(s.spare == 0 for s in c.sections))
                for s in c.sections[:-1]:
                    o = gspm.SECTION_TABLE_OFFSET + gspm.SECTION_ITEM_SIZE * s.slot + 1
                    self.assertEqual(int.from_bytes(c.blob[o:o + 4], 'little'), s.address)
                last = c.sections[-1]
                o = gspm.SECTION_TABLE_OFFSET + gspm.SECTION_ITEM_SIZE * last.slot + 1
                self.assertEqual(o + gspm.POINTER_SIZE, c.marker_offset)


class TestSlot3Timestamp(unittest.TestCase):
    """
    Base slot 3 is an eleven byte framed record holding when the config was built.

    The reason to believe the field assignment is that it is the only one that works, so the test
    that matters here is the search itself rather than a table of expected dates. A table would
    only restate the parser.
    """

    def records(self):
        for name in EXPECTED:
            data = lab.load(name)
            if data is None:
                continue
            c = gspm.parse(data)
            o = c.sections[gspm.CLOCK_RECORD_SLOT].address - c.flash_base
            yield name, c, o, bytes(c.blob[o + 2:o + 9])

    def test_every_sample_carries_the_record(self):
        for name, c, o, _ in self.records():
            with self.subTest(image=name):
                self.assertEqual(c.blob[o:o + 2], gspm.CLOCK_COOKIE)
                self.assertEqual(c.blob[o + 9:o + 11], gspm.CLOCK_END)
                self.assertIsNotNone(c.built_at)

    def test_the_cookie_pair_occurs_exactly_once_in_the_blob(self):
        """Unlike slot 0's 0xFEED, which turns up by chance about once per 64 KiB.

        That is why this record needs no length field to be recognised: the pair, nine bytes
        apart, is unique in every blob including the One's 1.6 MB one.
        """
        for name, c, o, _ in self.records():
            with self.subTest(image=name):
                hits = []
                i = c.blob.find(gspm.CLOCK_COOKIE)
                while i >= 0:
                    if c.blob[i + 9:i + 11] == gspm.CLOCK_END:
                        hits.append(i)
                    i = c.blob.find(gspm.CLOCK_COOKIE, i + 1)
                self.assertEqual(hits, [o])

    def test_the_day_of_week_byte_closes_on_the_epoch(self):
        """Days since 1 January 2000 modulo 7, computed without going through the parser.

        This is the independent closure: the weekday encoding and the year offset are two
        different fields that agree on one anchor, and 1 January 2000 was a Saturday, which is
        why 0 means Saturday.
        """
        self.assertEqual(gspm.CLOCK_EPOCH.strftime('%A'), 'Saturday')
        for name, c, _, raw in self.records():
            with self.subTest(image=name):
                second, minute, hour, day, dow, month, year = raw
                d = datetime.date(2000 + year, month + 1, day)
                self.assertEqual((d - gspm.CLOCK_EPOCH).days % 7, dow)

    def test_the_field_assignment_is_the_only_one_that_fits(self):
        """The search, not the answer.

        Of the 24 permutations of the four date bytes, times two month bases, times seven
        weekday offsets, exactly one assignment is consistent with every sample. Reorder the
        fields in `gspm.clock_record` and this fails, which a table of expected dates would not
        do in any informative way.
        """
        raws = [raw for _, _, _, raw in self.records()]
        self.assertGreaterEqual(len(raws), 9, 'not enough samples for the search to mean anything')
        solutions = []
        for day_i, mon_i, yr_i, dow_i in itertools.permutations(range(3, 7)):
            for mbase in (0, 1):
                for dbase in range(7):
                    ok = True
                    for r in raws:
                        month = r[mon_i] - mbase + 1
                        if not 1 <= month <= 12:
                            ok = False
                            break
                        try:
                            d = datetime.date(2000 + r[yr_i], month, r[day_i])
                        except ValueError:
                            ok = False
                            break
                        if (d.weekday() + dbase) % 7 != r[dow_i]:
                            ok = False
                            break
                    if ok:
                        solutions.append((day_i, mon_i, yr_i, dow_i, mbase, dbase))
        self.assertEqual(solutions, [(3, 5, 6, 4, 0, 2)],
                         'the field assignment is no longer uniquely determined')

    def test_the_two_one_factory_configs_agree_to_the_second(self):
        """One dumped off a remote, one extracted from firmware 3.4, same build.

        Two files obtained by completely different routes agreeing on a timestamp to the second
        is a check on the reading that no single file can give.
        """
        a, b = (lab.load('one_safemode'), lab.load('one34_region2'))
        if a is None or b is None:
            self.skipTest('need both One factory configs')
        self.assertEqual(gspm.parse(a).built_at, gspm.parse(b).built_at)
        self.assertEqual(gspm.parse(a).built_at, datetime.datetime(2007, 10, 24, 2, 22, 8))

    def test_the_arch8_cluster_shares_a_date(self):
        """Three of the four arch 8 configs were generated in one sitting, and it shows.

        Recorded here from an external source before this record could be read, which makes it a
        prediction the record either meets or does not.
        """
        got = {}
        for name in ('arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d'):
            data = lab.load(name)
            if data is None:
                self.skipTest('need the arch 8 set')
            got[name] = gspm.parse(data).built_at
        cluster = [got['arch8_config_b'], got['arch8_config_c'], got['arch8_config_d']]
        self.assertEqual(len({t.date() for t in cluster}), 1, 'b, c and d share a date')
        self.assertNotEqual(got['arch8_config_a'].date(), cluster[0].date())
        span = max(cluster) - min(cluster)
        self.assertLess(span, datetime.timedelta(hours=1))

    def test_a_day_of_week_that_disagrees_is_refused(self):
        """The check is in the parser, not only in this file, so a bad record reads as absent."""
        data = lab.load('one_config')
        if data is None:
            self.skipTest('need a config')
        c = gspm.parse(data)
        o = c.blob_offset + c.sections[gspm.CLOCK_RECORD_SLOT].address - c.flash_base
        broken = bytearray(data)
        broken[o + 6] = (broken[o + 6] + 1) % 7      # the day of week byte, still in range
        self.assertIsNone(gspm.parse(bytes(broken)).built_at)
        self.assertFalse(gspm.parse(bytes(broken)).checks['slot3_is_a_timestamp'])


class TestKeyTableAcrossArchitectures(unittest.TestCase):
    """
    The marker after the pointer table starts a key table on arch 8 and arch 12/14. On arch 9
    the byte where a count would sit is zero, so nothing is claimed for it.
    """

    def test_arch8_and_arch12_share_their_codes_with_no_event_bits(self):
        arch8 = gspm.parse(lab.load('arch8_config_a'))
        one = gspm.parse(lab.load('one_config'))
        virtual = lambda c: sorted(k.event_code for k in c.keys if not k.is_keypad)
        self.assertEqual(virtual(arch8), [0x06, 0x07, 0x2D])
        self.assertEqual(virtual(one), [0x06, 0x07, 0x2D])

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


class TestKeyCodesAreEventTypePlusScanCode(unittest.TestCase):
    """
    Corrects a reading this project published: that a key code is `0x80 | (row << 3) | col`
    with bit 7 marking a matrix key. It is an event type in the top two bits and the scanner's
    own scan code in the rest. Three agreements, in `docs/findings.md` section 17.
    """

    def test_arch14_is_54_scan_codes_times_three_event_types(self):
        """
        The closure. 54 times 3 is 162, which is exactly the 600's record count, and the 700
        has one more record, a code with no event bits at all. Under the old reading the same
        table looked like 108 matrix codes against 54 non matrix ones, which described no
        possible keypad.
        """
        for name, virtual in (('h600_config', []), ('h700_config', [0x06])):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                by_event = {}
                for k in c.keys:
                    by_event.setdefault(k.event_type, set()).add(k.scan_code)
                for ev in (gspm.EVENT_RELEASE, gspm.EVENT_PRESS, gspm.EVENT_REPEAT):
                    self.assertEqual(sorted(by_event[ev]), list(range(1, 55)),
                                     gspm.EVENT_NAMES[ev])
                self.assertEqual(sorted(k.event_code for k in c.keys if not k.is_keypad),
                                 virtual)
                self.assertEqual(len(c.keys), 54 * 3 + len(virtual))

    def test_the_scan_codes_fit_the_keypad_scanners_own_range(self):
        """
        Second agreement, and it comes from the firmware rather than the config: the arch 14
        keypad scanner at 0x190A6 returns a linear index 1 to 56, and the table uses 1 to 54.
        The old reading produced rows 0 to 6 and 8 to 14, which is not a range at all.
        """
        c = gspm.parse(lab.load('h700_config'))
        scans = {k.scan_code for k in c.keys if k.is_keypad}
        self.assertEqual(min(scans), 1)
        self.assertLessEqual(max(scans), 56)
        self.assertEqual(len(scans), 54)

    def test_every_arch14_scan_code_appears_in_all_three_event_classes(self):
        """
        Third agreement. If bit 7 addressed the keypad, a code and that code with bit 7 set
        would be different keys and there would be no reason for the sets to coincide.
        """
        for name in ('h700_config', 'h600_config'):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                sets = {}
                for k in c.keys:
                    if k.is_keypad:
                        sets.setdefault(k.event_type, set()).add(k.scan_code)
                self.assertEqual(len(sets), 3)
                self.assertEqual(len(set.intersection(*sets.values())), 54)

    def test_arch12_and_arch8_record_presses_only(self):
        """A real difference between architectures rather than an artefact of the reading."""
        for name, presses in (('one_config', 52), ('arch8_config_a', 53)):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                events = {k.event_type for k in c.keys}
                self.assertEqual(events, {gspm.EVENT_NONE, gspm.EVENT_PRESS})
                self.assertEqual(sum(1 for k in c.keys if k.event_type == gspm.EVENT_PRESS),
                                 presses)

    def test_the_safe_mode_config_binds_two_presses(self):
        c = gspm.parse(lab.load('one_safemode'))
        self.assertEqual([(k.event_name, k.scan_code) for k in c.keys],
                         [('press', 47), ('press', 46)])


class TestActionLists(unittest.TestCase):
    """
    Base slot 10 is a table of addresses of action lists, and a list is a count followed by
    that many three byte instructions. See `docs/findings.md` section 17.
    """

    CONFIGS = ('h700_config', 'h700_config_2', 'h600_config', 'h525_config', 'one_config',
               'one_config_unprogrammed', 'arch8_config_a')

    def test_the_table_and_the_counts_agree_on_the_packing(self):
        """
        The closure that carries the reading: addresses come from the pointer table, counts
        come from the lists, and all but four consecutive pairs sit exactly `1 + 3 * count`
        apart. Two unrelated parts of the file telling the same story.
        """
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                fit, of = c.action_list_packing()
                self.assertEqual(of - fit, 4, '%s: %d of %d packed' % (name, fit, of))

    def test_the_four_exceptions_are_run_boundaries(self):
        """
        Not noise: the lists are packed into exactly five contiguous runs, so there are four
        places where the next list is somewhere else entirely rather than the next byte.
        """
        c = gspm.parse(lab.load('h700_config'))
        table = c.pointer_array(gspm.arch_slot(c.architecture, 10))
        gaps = []
        for k in range(len(table) - 1):
            count = c.blob[c.blob_offset_of(table[k])]
            if table[k + 1] - table[k] != 1 + 3 * count:
                gaps.append(table[k + 1] - table[k])
        self.assertEqual(len(gaps), 4)
        # Every exception is a forward jump of many kilobytes, not an off by one.
        for gap in gaps:
            self.assertGreater(gap, 20000)

    @staticmethod
    def _runs(c):
        """The index of the last list in each contiguous run, derived from the table itself."""
        table = c.pointer_array(gspm.arch_slot(c.architecture, 10))
        lists = c.action_lists()
        ends = []
        for k in range(len(table) - 1):
            if table[k + 1] != table[k] + 1 + 3 * len(lists[k]):
                ends.append(k)
        ends.append(len(table) - 1)
        return ends

    def test_opcode_7f_takes_an_action_list_index_and_stops_at_a_run_boundary(self):
        """
        docs/findings.md section 26. Every `0x7F` operand indexes the action list table, and the
        largest is exactly the last index before the final run.

        The two halves come from unrelated parts of the file: the run boundaries from the pointer
        table and the list counts, the operand range from the instruction stream. Landing on the
        same index in two configs of different sizes is what makes this a reading rather than a
        range that happens to fit.
        """
        for name, expected_max in (('h700_config', 7655), ('h600_config', 4755)):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                lists = c.action_lists()
                operands = [i.operand for l in lists for i in l if i.opcode == 0x7F]
                self.assertGreater(len(operands), 1000, 'too few uses to say anything')

                self.assertTrue(all(0 <= o < len(lists) for o in operands),
                                'an operand that is not a valid list index')
                self.assertEqual(max(operands), expected_max)

                ends = self._runs(c)
                self.assertEqual(len(ends), 5, 'five runs, per section 17')
                self.assertEqual(max(operands), ends[-2],
                                 'the maximum is the last index before the final run')
                # And nothing reaches into that final run: those lists are entry points that
                # something other than an action list call reaches.
                self.assertEqual([o for o in operands if o > ends[-2]], [])

    def test_base_slot_8_references_every_list_in_the_final_run_and_no_other(self):
        """
        docs/findings.md section 26. The lists no `0x7F` names are owned by base slot 8.

        The closure is a set cover against a noise floor. The final run is 381 values of 65536 on
        the 700, so a section of that size holds about twenty by accident; it holds 384, they are
        381 distinct, and those are exactly the run.
        """
        for name in ('h700_config', 'h600_config'):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                ends = self._runs(c)
                first, last = ends[-2] + 1, ends[-1]

                slot8 = next(s for s in c.sections
                             if gspm.base_slot(c.architecture, s.slot) == 8)
                start = c.blob_offset_of(slot8.address)
                body = c.blob[start:start + c.section_length(slot8.slot)]
                found = {body[o] | (body[o + 1] << 8) for o in range(len(body) - 1)
                         if first <= (body[o] | (body[o + 1] << 8)) <= last}

                self.assertEqual(found, set(range(first, last + 1)),
                                 'slot 8 does not cover the final run exactly')

                # Against chance: the band is a few hundred values of 65536.
                readings = len(body) - 1
                expected = readings * (last - first + 1) / 65536
                hits = sum(1 for o in range(readings)
                           if first <= (body[o] | (body[o + 1] << 8)) <= last)
                self.assertGreater(hits, 10 * expected,
                                   'no more hits than coincidence would give')

    def test_slot_8_parses_as_bindings_and_consumes_the_section(self):
        """
        docs/findings.md section 27. A leading plain action list, then records of instructions
        with a tag byte in front.

        Consuming the section exactly is the validation, because a walk that starts one byte out
        desynchronises and runs off the end rather than producing plausible records.
        """
        expected = {
            'h700_config': (354, 765), 'h700_config_2': (354, 767),
            'h600_config': (191, 403), 'one_config': (268, 883),
            'h525_config': (82, 216), 'arch8_config_a': (100, 466),
        }
        for name, (records, entries) in expected.items():
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                recs = c.binding_records()
                self.assertIsNotNone(recs, 'the walk did not consume the section')
                self.assertEqual(len(recs), records)
                self.assertEqual(sum(len(r) for r in recs), entries)

    def test_every_binding_tag_is_a_key_press_and_the_codes_are_model_specific(self):
        """
        Four architectures, no exception: the tag's event bits are always 0x80. And the scan
        codes move between models, which is what physical buttons would do and what an abstract
        field would have no reason to do.
        """
        scans = {}
        for name in ('h700_config', 'h600_config', 'one_config', 'h525_config', 'arch8_config_a'):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                entries = [b for r in c.binding_records() for b in r]
                self.assertGreater(len(entries), 100)
                self.assertEqual({b.event_type for b in entries}, {gspm.EVENT_PRESS})
                scans[name] = frozenset(b.scan_code for b in entries)
        self.assertEqual(scans['h700_config'], scans['h600_config'], 'same architecture, same keypad')
        self.assertNotEqual(scans['h700_config'], scans['one_config'])
        self.assertNotEqual(scans['h700_config'], scans['h525_config'])

    def test_the_controlled_pair_gained_exactly_two_bindings(self):
        """
        The closure. The owner's account of the single change includes two new additional
        buttons; slot 8 grew by 8 bytes, an entry is 4, and the growth is one record going from
        two entries to four with the record count unchanged.
        """
        a = gspm.parse(lab.load('h700_config')).binding_records()
        b = gspm.parse(lab.load('h700_config_2')).binding_records()
        self.assertEqual(len(a), len(b), 'the number of records did not change')
        self.assertEqual(sum(len(r) for r in b) - sum(len(r) for r in a), 2)

        def sizes(recs):
            counted = {}
            for r in recs:
                counted[len(r)] = counted.get(len(r), 0) + 1
            return counted
        before, after = sizes(a), sizes(b)
        self.assertEqual(after[2] - before[2], -1, 'one record left the two entry group')
        self.assertEqual(after[4] - before[4], +1, 'and arrived in the four entry group')

    def test_slot_8_calls_every_list_in_the_final_run_exactly_once(self):
        """The same cover as section 26, now from the record parse rather than a byte sweep."""
        for name in ('h700_config', 'h600_config'):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                ends = self._runs(c)
                first, last = ends[-2] + 1, ends[-1]
                calls = [b.operand for r in c.binding_records() for b in r if b.opcode == 0x7F]
                final = [o for o in calls if first <= o <= last]
                self.assertEqual(sorted(final), list(range(first, last + 1)),
                                 'not a cover of the final run, once each')
                # And it calls plenty of lists outside that run as well.
                self.assertGreater(len(calls) - len(final), 100)

    def test_two_opcodes_carry_signed_operands(self):
        """
        Also section 26. `0x07` and `0x1F` never carry a value below 0xE800, which read as
        unsigned are numbers with no referent anywhere in the file and read as signed are small
        negative ones. Not a meaning, a constraint on what the meaning can be.
        """
        for name in ('h700_config', 'h600_config'):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                by_op = {}
                for l in c.action_lists():
                    for i in l:
                        by_op.setdefault(i.opcode, []).append(i.operand)
                self.assertTrue(all(o >= 0xFFF2 for o in by_op[0x07]), 'a 0x07 operand below -14')
                self.assertTrue(all(o >= 0xE800 for o in by_op[0x1F]), 'a 0x1F operand below -6144')

    def test_the_525_reproduces_the_count_reported_upstream(self):
        """
        harmony-decompiler discussion 5 reports 487 action lists for this sample and that 482
        of the 486 consecutive pairs are packed. Both come out of our own parser and our own
        slot numbering, which is worth pinning: it cross checks their reading and ours at once.
        """
        c = gspm.parse(lab.load('h525_config'))
        self.assertEqual(len(c.action_lists()), 487)
        self.assertEqual(c.action_list_packing(), (482, 486))

    def test_every_list_parses_and_the_instruction_count_is_plausible(self):
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                lists = c.action_lists()
                self.assertIsNotNone(lists)
                self.assertTrue(all(len(l) >= 1 for l in lists), 'an empty action list')
                self.assertLess(max(len(l) for l in lists), 32, 'implausibly long list')

    def test_the_opcode_inventory_differs_between_architectures(self):
        """
        Which is a finding rather than a wrinkle: arch 14 leans on opcodes the arch 9 sample
        never uses, so an opcode table derived from the 525 alone does not cover our targets.
        """
        ops = {}
        for name in ('h700_config', 'h525_config'):
            c = gspm.parse(lab.load(name))
            ops[name] = {i.opcode for l in c.action_lists() for i in l}
        self.assertIn(0x6C, ops['h700_config'])
        self.assertNotIn(0x6C, ops['h525_config'])
        # And they do overlap, so this is not two unrelated encodings.
        self.assertGreater(len(ops['h700_config'] & ops['h525_config']), 8)


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
