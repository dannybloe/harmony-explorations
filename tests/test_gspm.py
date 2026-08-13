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
import collections
import datetime
import itertools
import os
import re
import unittest

import lab
from harmony import gspm

# logical image name -> (magic, base, format version, pointer slots, marker, key records)
EXPECTED = {
    'one_safemode': (b'GSPM', 0x002000, '1.6', 22, b'LWJL', 2),
    'one34_region2': (b'GSPM', 0x002000, '1.6', 22, b'LWJL', 2),
    'h700_gspm': (b'GSPM', 0x020000, '1.4', 20, b'LWJL', 0),
    # The other two arch 14 safe mode configs. Both were in the corpus without being in this
    # table, which is how docs/config-format.md came to say thirteen samples while fifteen
    # containers were being parsed elsewhere.
    'h600_safemode_gspm': (b'GSPM', 0x020000, '1.4', 20, b'LWJL', 0),
    'h650_safemode_gspm': (b'GSPM', 0x020000, '1.4', 20, b'LWJL', 0),
    'one_config': (b'GSPM', 0x040000, '1.6', 22, b'LWJL', 55),
    'one_config_unprogrammed': (b'GSPM', 0x040000, '1.6', 22, b'LWJL', 55),
    'h600_config': (b'GSPM', 0x030000, '1.4', 20, b'LWJL', 162),
    'h700_config': (b'GSPM', 0x030000, '1.4', 20, b'LWJL', 163),
    'h700_config_2': (b'GSPM', 0x030000, '1.4', 20, b'LWJL', 163),
    'h525_config': (b'AHCM', 0x020000, '1.4', 20, b'CMAH', 0),
    # The bench 525's own config, read over USB on 8 August 2026. Identical in every container
    # field to the published sample from another owner, which is the second arch 9 sample this
    # table has wanted since the architecture was added. findings.md section 76.
    'h525_config_2': (b'AHCM', 0x020000, '1.4', 20, b'CMAH', 0),
    # The 525's safe mode config, cut out of its firmware region at flash 0x818000. Its base is
    # 0x018000, which is 0x800000 below the address READ_FLASH names, exactly as the user config's
    # 0x020000 is below 0x820000: two containers, one offset. findings.md sections 76 to 79.
    'h525_safemode_ahcm': (b'AHCM', 0x018000, '1.4', 20, b'CMAH', 0),
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
    # Read off the same Harmony 600 whose user config header says <PROTOCOL>14</PROTOCOL>.
    'h600_safemode_gspm': 14,
    # Packed inside Harmony 650 firmware 0.4, whose code region loads at 0x9000. That is the
    # arch 14 execution base against arch 12's 0x020000, and it is a property of the firmware
    # rather than of the container, so this entry stays a calibration case and not a circle.
    'h650_safemode_gspm': 14,
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
        # The population up front, so a partial lab skips this whole test rather than shrinking its
        # own claim to whatever is present. ASampleLoopStatesItsPopulation in test_toolchain.py.
        lab.require(*EXPECTED)
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
        lab.require(*EXPECTED)
        for name in EXPECTED:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                # The names, not only their values. A loop over an empty `checks` dict passes every
                # assertion inside it, so a parser that stopped reporting checks would have satisfied
                # this test rather than failed it.
                self.assertGreaterEqual(len(c.checks), 4,
                                        '%s reported %d checks' % (name, len(c.checks)))
                self.assertIn('trailer_checksum_recomputes', c.checks, name)
                for check, ok in c.checks.items():
                    self.assertTrue(ok, '%s failed check %s' % (name, check))

    def test_end_addr_locates_the_end_marker(self):
        lab.require(*EXPECTED)
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
        lab.require(*EXPECTED)
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

    def test_the_document_quotes_the_spread_this_table_actually_has(self):
        """The header of docs/config-format.md states the corpus in numbers, and it drifted.

        It said thirteen samples after two more had been added, five base addresses beside a list
        of four, and four pointer table lengths where there are three. Counting the table here and
        asserting the words is the only version of that claim that cannot go stale quietly.
        """
        seen = [gspm.parse(lab.load(n)) for n in EXPECTED]
        counts = {
            'samples': len(seen),
            'architectures': len({c.architecture for c in seen}),
            'bases': len({c.flash_base for c in seen}),
            'versions': len({c.format_version for c in seen}),
            'lengths': len({c.pointer_count for c in seen}),
        }
        self.assertEqual(counts, {'samples': 17, 'architectures': 4, 'bases': 5,
                                  'versions': 3, 'lengths': 3})

        path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                            'docs', 'config-format.md')
        with open(path, encoding='utf-8') as fh:
            text = fh.read()
        self.assertIn('**seventeen samples across four architectures**, five base addresses', text)
        self.assertIn('three format versions and three\npointer table lengths (20, 21, 22)', text)
        # No assertion that the old wording is gone: the correction note below the paragraph
        # quotes it on purpose, and the two positive checks above already fail if it comes back.

        # Every base address the document names is one the corpus actually has, and vice versa.
        # Scoped to the sentence that names them, not the whole file, which quotes addresses for
        # a dozen other reasons.
        sentence = re.search(r'five base addresses\s*\n?\(([^)]*)\)', text)
        self.assertIsNotNone(sentence, 'the base address list moved')
        named = {int(m, 16) for m in re.findall(r'`0x([0-9A-Fa-f]+)`', sentence.group(1))}
        self.assertEqual(named, {c.flash_base for c in seen})


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
        lab.require(*EXPECTED)
        for name in EXPECTED:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                # No remainder. A table start of 0x0C leaves three bytes over on every sample.
                self.assertEqual(
                    (c.marker_offset - gspm.SECTION_TABLE_OFFSET) % gspm.SECTION_ITEM_SIZE, 0)
                self.assertEqual(
                    gspm.SECTION_TABLE_OFFSET + gspm.SECTION_ITEM_SIZE * c.pointer_count,
                    c.marker_offset)

    def test_arch8_carries_21_slots_where_the_vendor_client_declares_20(self):
        """The measurement that makes Logitech's own client a source of hypotheses, not truth.

        `docs/host-client.md` records the client's per architecture container constants, which
        reproduce this project's reading exactly on arch 9 (marker at 91) and arch 12 (99) and
        state 20 slots with a marker at 91 for arch 8. Four real arch 8 configs put it at 95.

        Pinned here rather than left in prose because the failure mode is somebody deciding the
        vendor must know its own format and "correcting" the parser to agree. The client is
        wrong, or it describes a variant nobody here has, and either way the corpus decides.
        """
        lab.require('arch8_config_a')
        seen = 0
        for name in EXPECTED:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                if c.architecture != 8:
                    continue
                self.assertEqual(c.pointer_count, 21)
                self.assertEqual(c.marker_offset, 95)
                seen += 1
        # Guarded up front by lab.require, so a corpus that stopped covering arch 8 fails here
        # rather than passing a loop that never ran. See CLAUDE.md on skip inside subTest.
        self.assertEqual(seen, 4, 'the four arch 8 configs are what carry this claim')

    def test_the_base_layout_ends_in_two_null_sections(self):
        """Base slots 18 and 19 are NULL on all four architectures, wherever they land."""
        lab.require(*EXPECTED)
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
        lab.require(*EXPECTED)
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
            got[name] = gspm.parse(data).built_at
        cluster = [got['arch8_config_b'], got['arch8_config_c'], got['arch8_config_d']]
        self.assertEqual(len({t.date() for t in cluster}), 1, 'b, c and d share a date')
        self.assertNotEqual(got['arch8_config_a'].date(), cluster[0].date())
        span = max(cluster) - min(cluster)
        self.assertLess(span, datetime.timedelta(hours=1))

    def test_a_day_of_week_that_disagrees_is_refused(self):
        """The check is in the parser, not only in this file, so a bad record reads as absent."""
        data = lab.load('one_config')
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
        lab.require(*KNOWN_ARCHITECTURE)
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

    def test_the_version_word_is_per_config_and_usually_agrees_within_a_model(self):
        """
        The u16 beside the architecture, as far as the corpus pins it. **This test used to claim
        the word is per model rather than per config**<!--superseded-->, which section 81 falsified with a pair
        nobody had compared: one physical Harmony One carries a different word before and after
        the sync of section 58. The observations below all survived that, so they stay; the claim
        the name made did not.
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

    def test_one_remote_carries_two_different_words(self):
        """Section 81, and it is why the claim above is about configs and not about models.

        The spare Harmony One either side of the sync section 58 performed and watched. Same
        unit, same model, same skin, two configs from Logitech's own service, two words. The low
        byte moves from 59 to 54, and 54 is the skin that remote reports over USB.
        """
        lab.require('one_spare_before_sync', 'one_spare_after_sync')
        before = gspm.parse(lab.load('one_spare_before_sync')).version_word
        after = gspm.parse(lab.load('one_spare_after_sync')).version_word
        self.assertEqual((before, after), (0x0D3B, 0x0D36))
        self.assertNotEqual(before, after)
        # The high byte is the same on both, so what moved is the low one.
        self.assertEqual(before >> 8, after >> 8)

    def test_the_low_byte_is_the_remotes_skin_in_seven_containers_of_nine(self):
        """Section 81. Stated as the count it is, with the two exceptions named rather than hidden.

        A skin is known independently: from the EZHex header for a config that has one, and from
        `bcdDevice` for a remote on the bench. Seven containers carry it exactly in the low byte and
        two carry a number unallocated in Logitech's own table, one per family.

        **The 885 is the entry that carries the weight**, and it arrived on 10 August 2026. It is
        the only one of the nine that distinguishes a plain reading of this byte from a BCD one,
        since `0x11` is 17 in binary and 11 in BCD where `0x0F` is 15 either way. Section 113 is
        what needed that: the skin rule in `packages/usb` and `harmony.usbdesc` had read the USB
        descriptor's `bcdDevice` as BCD on every architecture, and this byte is what says the skin
        itself is not a BCD quantity anywhere.
        """
        known = {
            'one_safemode': 54, 'one_spare_after_sync': 54,
            'h700_config': 66, 'h700_gspm': 66, 'h600_safemode_gspm': 71,
            'h650_safemode_gspm': 72, 'h525_config': 22, 'arch8_config_a': 15,
            'arch8_config_885': 17,
        }
        exceptions = {'one_config': (59, 54), 'h600_config': (73, 71)}
        lab.require(*known, *exceptions)
        for name, skin in known.items():
            with self.subTest(container=name):
                self.assertEqual(gspm.parse(lab.load(name)).version_word & 0xFF, skin)
        for name, (carried, skin) in exceptions.items():
            with self.subTest(container=name):
                word = gspm.parse(lab.load(name)).version_word & 0xFF
                self.assertEqual(word, carried)
                self.assertNotEqual(word, skin)

    def test_the_two_skins_no_config_explained_are_the_european_models(self):
        """Section 131, and it replaces a test that asserted the opposite for four days.

        The classic client table in `reference/models.md` holds 46 skins and lacks 59 and 73, the
        two numbers containers here carry where the remote reports 54 and 71. Two rules were
        derived from that absence and both are dead, `reference/superseded.md`; the second one
        said each was the first free number above the run containing the remote's own skin, and
        it was asserted here, exactly, computed from the table.

        It was arithmetic where a fact was missing. **59 is the Harmony One EMEA and 73 is the
        Harmony 600 EMEA**, from Logitech's live catalogue, which lists 80 skins below 100. The
        old rule worked because each European variant was allocated immediately above the run its
        American sibling sat in, so it read the allocation order out of the gaps it left. It fitted
        both cases and predicted nothing, which is the shape of a wrong rule that never fails.

        What this asserts instead is the pairing, from the corpus rather than from either table:
        each of the two contested numbers belongs to a container whose remote reports the other
        member of a regional pair, and the corpus holds both members of both pairs. The classic
        table is still checked for what it is good for, that every independently measured skin is
        in it, because it quietly becoming the source of those numbers instead of a check on them
        is the failure that has not gone away.
        """
        classic = {3, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
                   36, 39, 40, 41, 44, 45, 48, 49, 50, 52, 53, 54, 55, 56, 57, 58, 60, 61,
                   62, 63, 64, 65, 66, 67, 68, 71, 72}
        self.assertEqual(len(classic), 46)
        for skin in (54, 66, 71, 72, 22, 15):
            self.assertIn(skin, classic, 'a measured skin missing from the classic table')
        # And the two the classic table lacks, which is what made them look like artefacts.
        for skin in (59, 73):
            self.assertNotIn(skin, classic)

        # The pairing, measured against the corpus. Each entry is (samples carrying the European
        # skin, samples carrying its American sibling), so both members have to be present for the
        # pair to mean anything: one config carrying an odd number proves nothing about a pair.
        pairs = {
            (54, 59): (('one_config',), ('one_spare_after_sync',)),
            (71, 73): (('h600_config',), ()),
        }
        for (home, emea), (emea_samples, home_samples) in pairs.items():
            names = [n for group in (emea_samples, home_samples) for n in group]
            lab.require(*names)
            for name in emea_samples:
                word = gspm.parse(lab.load(name)).version_word & 0xFF
                self.assertEqual(word, emea, '%s should carry the European skin' % name)
            for name in home_samples:
                word = gspm.parse(lab.load(name)).version_word & 0xFF
                self.assertEqual(word, home, '%s should carry the non European skin' % name)
            # The two members are adjacent in the vendor's numbering, which is what the old rule
            # was really seeing. Asserted so that the coincidence is on the record rather than
            # being rediscovered as a rule a third time.
            self.assertGreater(emea, home)

    def test_a_three_byte_record_states_an_architecture_and_no_version_word(self):
        """Section 79. The record's extent is the gap to the next pointer, like every section's.

        Sixteen containers carry seven bytes and the arch 9 safe mode container carries three, so
        a fixed seven byte read takes its version word out of base slot 2 and reports it as this
        section's. Nothing would have failed: `0x0012` is a plausible word.
        """
        lab.require('h525_safemode_ahcm', 'h525_config')
        short = gspm.parse(lab.load('h525_safemode_ahcm'))
        self.assertEqual(short.section_length(gspm.ARCH_RECORD_SLOT), 3)
        self.assertEqual(short.architecture, 9)
        self.assertIsNone(short.version_word)
        # The negative: the same architecture with room for the word does carry one, so this is
        # about the extent and not about arch 9.
        full = gspm.parse(lab.load('h525_config'))
        self.assertEqual(full.section_length(gspm.ARCH_RECORD_SLOT), gspm.ARCH_RECORD_LENGTH)
        self.assertIsNotNone(full.version_word)


class TestSlotZeroIsTheOnlyFeedFrame(unittest.TestCase):
    """
    Corrects a claim this project published: that every section the pointer table points at
    is a `0xFEED`/`0xBEEF` frame. Only slot 0 is. The reasoning is in `docs/findings.md`.
    """

    def test_slot0_is_a_frame_in_every_sample(self):
        lab.require(*EXPECTED)
        for name in EXPECTED:
            with self.subTest(image=name):
                self.assertIsNotNone(gspm.parse(lab.load(name)).frame_length)

    def test_the_length_is_three_bytes_and_no_sample_can_tell(self):
        """Why the width was widened on a claim this corpus cannot check. `docs/host-client.md`.

        The reader took a `u16` at +0x02 and called the byte at +0x04 "zero in every sample".
        Logitech's own client reads three bytes there, which is client sourced and unconfirmed,
        and this is the honest statement of what the corpus can say about it: the byte is zero
        everywhere, so the two readings agree everywhere, so **no sample here falsifies either
        one**. The wider reading was taken because it is the one that survives a name tree past
        64 KiB, and the largest in the corpus is nowhere near that.

        Stated as a test rather than a comment so that a sample which *could* tell them apart
        fails here loudly instead of being absorbed.
        """
        # Guarded up front, because the corpus wide assertion below is not skippable. A skip
        # raised inside `subTest` skips that sample and lets the loop finish, so without this the
        # aggregate runs with `largest == 0` and fails against 2326 while saying nothing at all
        # about the format. Reported by trelowney on 10 August 2026 against a nonexistent
        # `HARMONY_LAB`: 567 passed, 921 skipped, and this one failure.
        lab.require(*EXPECTED)
        largest = 0
        for name in EXPECTED:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                o = c.blob_offset_of(c.sections[0].address)
                self.assertEqual(c.blob[o + 4], 0, 'a sample that separates u16 from u24')
                narrow = int.from_bytes(c.blob[o + 2:o + 4], 'little')
                self.assertEqual(narrow, c.frame_length)
                largest = max(largest, c.frame_length or 0)
        # And how far the corpus is from being able to tell, so the claim is not open ended.
        # The largest name tree here is 2326 bytes, twenty eight times below the 16 bit
        # boundary, so this is not a case of the corpus nearly reaching it.
        self.assertEqual(largest, 2326)

    def test_the_frame_ends_exactly_where_the_next_section_starts(self):
        """
        The frame occupies length + 2 bytes: the length counts from the cookie and stops
        short of the terminator. That the next pointer lands on exactly that byte is an
        independent confirmation of the length rule, since the two come from different
        places in the file.
        """
        lab.require(*EXPECTED)
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
        lab.require(*EXPECTED)
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

    def test_every_non_empty_frame_holds_a_root_node(self):
        """`Root` is a name at level 0, not a header.

        This test used to assert that every frame *starts* with those nine bytes, which is true
        of every config anyone has and is not what the bytes mean: they are one node of a list,
        and the arch 9 safe mode container in the 525's firmware region puts `Root` third. So the
        assertion is containment, and the position is deliberately not asserted. Section 77.
        """
        lab.require(*EXPECTED)
        for name in EXPECTED:
            with self.subTest(image=name):
                data = lab.load(name)
                c = gspm.parse(data)
                if not c.frame_length:
                    continue
                o = c.blob_offset_of(c.sections[0].address)
                frame = c.blob[o + 5:o + c.frame_length]
                self.assertIn(gspm.ROOT_NODE, frame)

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
        lab.require('h600_config', 'h700_config')
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
        lab.require('h700_config', 'h600_config')
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
        lab.require('one_config', 'arch8_config_a')
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
        lab.require(*self.CONFIGS)
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
        lab.require('h700_config', 'h600_config')
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
        lab.require('h700_config', 'h600_config')
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
        lab.require(*expected)
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
        lab.require(*self.CONFIGS)
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
        lab.require('h700_config', 'h600_config')
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

    def test_arch_14_is_mostly_one_cross_product_against_a_fixed_vocabulary(self):
        """
        docs/findings.md section 28. Most of an arch 14 config is two instruction lists of shape
        `{0x7A a; 0x6C b}`, partitioned by the first operand into groups that all carry the same
        472 values of the second.

        The closure is that the 472 do not depend on the config: two remotes, two owners, two
        sizes, one set. That makes it a vocabulary the format carries rather than user data.
        """
        lab.require('h700_config', 'h600_config')
        vocabularies = {}
        for name, groups in (('h700_config', 6), ('h600_config', 4)):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                lists = c.action_lists()

                pairs = [l for l in lists
                         if len(l) == 2 and l[0].opcode == 0x7A and l[1].opcode == 0x6C]
                total_6c = sum(1 for l in lists for i in l if i.opcode == 0x6C)
                self.assertEqual(len(pairs), total_6c,
                                 '0x6C appears somewhere other than in one of these lists')

                by_selector = {}
                for l in pairs:
                    by_selector.setdefault(l[0].operand, []).append(l[1].operand)
                self.assertEqual(len(by_selector), groups)
                self.assertEqual({len(v) for v in by_selector.values()}, {472})
                sets = {frozenset(v) for v in by_selector.values()}
                self.assertEqual(len(sets), 1, 'the groups do not share one value set')
                vocabularies[name] = next(iter(sets))

        self.assertEqual(vocabularies['h700_config'], vocabularies['h600_config'],
                         'the vocabulary differs between configs, so it is not fixed')

        vocabulary = sorted(vocabularies['h700_config'])
        low = [v for v in vocabulary if not v & 0x8000]
        high = [v for v in vocabulary if v & 0x8000]
        self.assertEqual(low, list(range(0, 451)))
        self.assertEqual(high, [0x8000 + k for k in range(21)])

    def test_opcode_7c_spells_out_values_above_its_field_maximum(self):
        """
        docs/findings.md section 29. The operand is a group in the high byte and 1 to 100 in the
        low one, and a pure list of length k reads as (k - 1) * 100 + n.

        The closure is the ceiling. These lists express 101 to 450, and section 28's fixed 0x6C
        vocabulary is 0 to 450, which is a count of list lengths times a field maximum agreeing
        with a set of operand values. Nothing connects the two but the format.
        """
        lab.require('h700_config', 'h600_config')
        for name, groups in (('h700_config', 6), ('h600_config', 4)):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                lists = c.action_lists()
                pure = [[i.operand for i in l] for l in lists
                        if l and all(i.opcode == 0x7C for i in l)]

                # Every 0x7C is either in one of these or in a {0x7F, 0x7D, 0x7C}.
                trailing = sum(1 for l in lists
                               if [i.opcode for i in l] == [0x7F, 0x7D, 0x7C])
                total = sum(1 for l in lists for i in l if i.opcode == 0x7C)
                self.assertEqual(sum(len(p) for p in pure) + trailing, total)

                self.assertTrue(all(len({o >> 8 for o in p}) == 1 for p in pure),
                                'a list changes group part way through')
                self.assertEqual({o & 0xFF for p in pure for o in p[:-1]}, {100},
                                 'a leading operand is not the field maximum')
                self.assertEqual({p[0] >> 8 for p in pure}, set(range(groups)))

                expressed = {}
                for p in pure:
                    expressed.setdefault(p[0] >> 8, set()).add((len(p) - 1) * 100 + (p[-1] & 0xFF))
                for group, values in expressed.items():
                    self.assertEqual(values, set(range(101, 451)),
                                     'group %d does not express 101 to 450 exactly once' % group)

                vocabulary = {l[1].operand for l in lists
                              if len(l) == 2 and l[0].opcode == 0x7A and l[1].opcode == 0x6C
                              and not l[1].operand & 0x8000}
                self.assertEqual(max(vocabulary), 450, 'the two ceilings have stopped agreeing')

    def test_two_opcodes_carry_signed_operands(self):
        """
        Also section 26. `0x07` and `0x1F` never carry a value below 0xE800, which read as
        unsigned are numbers with no referent anywhere in the file and read as signed are small
        negative ones. Not a meaning, a constraint on what the meaning can be.
        """
        lab.require('h700_config', 'h600_config')
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
        lab.require(*self.CONFIGS)
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


class TestTheArch9InfraredHeader(unittest.TestCase):
    """findings.md section 65: class 5 shares class 1's header and nothing below it.

    What class 5 *is* stays unknown and needs a firmware nobody here has. What is claimable is the
    header, because every structural property section 61 read off class 1 holds on all 200 arch 9
    records too, and because the area they occupy has both its ends fixed independently.
    """

    SAMPLE = 'h525_config'
    RECORDS = 200
    REGION = (0x021F3B, 0x028F62)

    def _records(self):
        from harmony import gspm
        lab.require(self.SAMPLE)
        c = gspm.parse(lab.load(self.SAMPLE))
        return c, sorted(a for group in c.ir_groups() for a in group)

    def test_every_record_is_class_five_and_carries_the_shared_header(self):
        """Four fields, each of them a property rather than a value, on all 200."""
        from harmony import gspm
        c, records = self._records()
        self.assertEqual(len(records), self.RECORDS)
        low, high = self.REGION
        for address in records:
            start = c.ir_record_start(address)
            with self.subTest(record=hex(address)):
                self.assertEqual(c.ir_class(address), gspm.IR_CLASS_ARCH9)
                # The pointer at +8 names the record's own start, seven bytes back.
                self.assertEqual(address - start, gspm.IR_RECORD_POINTER_BIAS)
                # Both data pointers point backwards and stay inside the area.
                for block in c.ir_record_blocks(address):
                    self.assertTrue(low <= block < start, hex(block))
                # Group 1's third `u24` is NULL in every record, which is the tail block section
                # 127 names and the field class 1 does not have a use for either. Scoped to group 1
                # since section 139: 61 of these records declare a second group, whose pointers
                # start at +21 and are not NULL.
                off = c.blob_offset_of(start)
                self.assertEqual(int.from_bytes(c.blob[off + 18:off + 21], 'little'), 0)

    def test_the_headers_never_overlap(self):
        """Each header's own stated length, which is only claimable if they fit side by side.

        **This asserted a flat twenty one bytes until section 139**, which is `12 + 9 * 1` and is
        therefore the weakest bound this sample allows: 61 of its 200 records declare two groups and
        so occupy 30 bytes. A gap of 21 satisfied the old assertion while two headers overlapped by
        nine, and the test would have said so had it read the count the record states.
        """
        c, records = self._records()
        pairs = sorted((c.ir_record_start(a), a) for a in records)
        for i in range(1, len(pairs)):
            with self.subTest(header=hex(pairs[i][0])):
                self.assertGreaterEqual(
                    pairs[i][0], pairs[i - 1][0] + c.ir_header_length(pairs[i - 1][1]))

    def test_the_area_lands_exactly_on_what_the_accounting_could_not_attribute(self):
        """The closure. Both ends, and neither was chosen to make them agree.

        The bottom is the lowest backward pointer any record names and the top is the end of the
        highest header. The region they bracket is the one large gap the byte accounting reported
        before this reading existed, to the byte at both ends.
        """
        c, _ = self._records()
        self.assertEqual(c.ir_region(), self.REGION)

    def test_the_blocks_are_not_claimed_and_the_reason_is_the_class(self):
        """The negative case, and it is deliberate rather than an omission.

        Class 5's bytes below the header are not duration streams, so a reader that walked them to
        a zero word would claim the wrong extent with no way to notice. Section 61 already records
        that all of them find a zero word and none of them is the right one.
        """
        from harmony import gspm
        c, records = self._records()
        self.assertNotIn(gspm.IR_CLASS_ARCH9, gspm.IR_CLASSES)
        self.assertIn(gspm.IR_CLASS_ARCH9, gspm.IR_HEADER_CLASSES)
        # `ir_frame` used to be asserted None here. It is gone, section 139, so what stands in its
        # place is the gate that made it None: the durations reader refuses a class it does not read.
        self.assertEqual(c.ir_pulses(records[0]), [])

    def test_the_other_architectures_are_unaffected(self):
        """The calibration: opening the header claim to class 5 must not touch class 1."""
        from harmony import gspm
        for name in ('h700_config', 'one_config', 'arch8_config_a'):
            lab.require(name)
            c = gspm.parse(lab.load(name))
            classes = {c.ir_class(a) for g in c.ir_groups() for a in g}
            with self.subTest(config=name):
                self.assertEqual(classes, {gspm.IR_CLASS_STREAM})


class TestTheInfraredRecordExtent(unittest.TestCase):
    """findings.md section 61: where an infrared record's bytes actually are.

    The header states its own length, `12 + 9 * count` at `+0x0B`, and each nine byte group is three
    pointers naming data blocks that sit **below** it, so a record is not one contiguous run and the
    durations are not after the header. A block ends at a zero word.

    This docstring said a flat twenty one bytes with two pointers until section 139, which is the
    `count == 1` case with its third pointer dropped. Section 75 corrected it in `packages/codec` and
    this side kept the old reading for a week.

    The reason this matters beyond tidiness is that it replaced a heuristic. The duration run used
    to be located as the longest alternating one, which found a single frame of a record that holds
    three, and claiming that extent put runs on top of base slot 10 lists. Both closures below are
    the ones the heuristic could not pass.
    """

    STREAM = ('h700_config', 'h700_config_2', 'h600_config', 'one_config',
              'one_config_unprogrammed', 'arch8_config_a', 'arch8_config_b',
              'arch8_config_c', 'arch8_config_d', 'one_spare_before_sync',
              'one_spare_after_sync')

    def blocks_and_headers(self, c):
        """Every distinct block address, every record header start, and the top of the area.

        The top used to be `max(start) + 21`, a flat header. It is the highest header's **own**
        length now, since a two group header is 30 bytes, section 139.
        """
        starts = {}
        blocks = set()
        for group in c.ir_groups():
            for address in group:
                starts[c.ir_record_start(address)] = address
                blocks.update(c.ir_record_blocks(address))
        highest = max(starts)
        return sorted(starts), blocks, highest + c.ir_header_length(starts[highest])

    def test_a_block_ends_exactly_where_the_layout_says_it_does(self):
        """
        The closure. A block's length is read from its own terminator, and independently the
        headers and blocks tile a region, so the distance to the next boundary is a second opinion
        on the same number. They agree for every block on the two target architectures.

        Arch 8 is included and counted separately: some of its blocks stop **short** of the next
        boundary, which is padding rather than a wrong rule, and short is the safe direction since
        it can only under claim.
        """
        from harmony import gspm
        lab.require(*self.STREAM)
        exact = short = over = 0
        for name in self.STREAM:
            c = gspm.parse(lab.load(name))
            starts, blocks, top = self.blocks_and_headers(c)
            bounds = sorted(blocks | set(starts))
            for index, boundary in enumerate(bounds):
                if boundary not in blocks:
                    continue
                expected = (bounds[index + 1] if index + 1 < len(bounds) else top) - boundary
                measured = c.ir_block_length(boundary)
                with self.subTest(image=name, block=boundary):
                    self.assertIsNotNone(measured, 'a class 1 block always closes')
                    self.assertLessEqual(measured, expected, 'a block may not overrun the next')
                if measured == expected:
                    exact += 1
                elif measured < expected:
                    short += 1
                else:
                    over += 1
        self.assertEqual(over, 0)
        # **3357 exact and 133 short until section 139**, and the 133 were reported as padding on
        # arch 8 (Harmony 880). They were not padding: they stopped short of a boundary this reader
        # could not see, because the header's second pointer group was missing from the boundary list.
        # With all three pointers of every declared group the tiling is exact on every block, which
        # makes it a real closure rather than one with an unexplained remainder.
        self.assertEqual(short, 0)
        self.assertEqual(exact, 3715)

    def test_arch_9_finds_a_terminator_and_it_is_the_wrong_one(self):
        """
        The negative case, and it is sharper than expected. The first guess was that arch 9's
        records simply would not close, so the terminator alone would keep them out. They do close:
        all 277 blocks find a zero word, and **none of them** lands where the layout says the block
        ends. A zero word is common enough in arbitrary data to be found by accident.

        So the terminator is not a validity check, and what actually keeps arch 9 out of the byte
        accounting is the **class byte**: every one of its records reads 5 and only class 1 is
        claimed. This test exists because the first version of it asserted the opposite and failed.
        """
        from harmony import gspm
        lab.require('h525_config')
        c = gspm.parse(lab.load('h525_config'))
        starts, blocks, top = self.blocks_and_headers(c)
        bounds = sorted(blocks | set(starts))
        closing = agreeing = 0
        for index, boundary in enumerate(bounds):
            if boundary not in blocks:
                continue
            expected = (bounds[index + 1] if index + 1 < len(bounds) else top) - boundary
            measured = c.ir_block_length(boundary)
            closing += measured is not None
            agreeing += measured == expected
        # 277 until section 139: 61 of these 200 records declare a second pointer group, so this
        # config names 380 distinct blocks and the reader had been seeing two thirds of them.
        self.assertEqual(closing, 380)
        self.assertEqual(agreeing, 0)
        self.assertEqual({c.ir_class(a) for g in c.ir_groups() for a in g}, {5})

    def test_blocks_are_shared_between_records(self):
        """
        Why a caller has to deduplicate. Some records carry no durations of their own and name a
        block another record also names, which is how one stream serves several codes. A config
        with more block pointers than distinct blocks is the observable form of that.
        """
        from harmony import gspm
        lab.require('one_spare_after_sync')
        c = gspm.parse(lab.load('one_spare_after_sync'))
        pointers = sum(len(c.ir_record_blocks(a)) for g in c.ir_groups() for a in g)
        _, blocks, _ = self.blocks_and_headers(c)
        self.assertGreater(pointers, len(blocks))

    def test_the_pointers_point_backwards(self):
        """A record's durations sit below its header, in every block in the corpus. Worth pinning
        because it is the opposite of what every other record shape here does."""
        from harmony import gspm
        lab.require(*self.STREAM)
        for name in self.STREAM:
            c = gspm.parse(lab.load(name))
            for group in c.ir_groups():
                for address in group:
                    start = c.ir_record_start(address)
                    for block in c.ir_record_blocks(address):
                        with self.subTest(image=name, record=start):
                            self.assertLess(block, start)


class TestTheInfraredDatabase(unittest.TestCase):
    """findings.md section 32: base slot 5 is the infrared database.

    The claim rests on two closures that do not depend on each other. One is arithmetic on the
    container: the group count matches the `0x7C` group count in every config. The other is
    arithmetic on the records: the bit count implied by a record's length matches the bit count of
    the protocol its header timings name.
    """

    CONFIGS = ('h700_config', 'h700_config_2', 'h600_config', 'one_config',
               'one_config_unprogrammed', 'arch8_config_a', 'arch8_config_b',
               'arch8_config_c', 'arch8_config_d')

    # Header timings, as a tolerance band, against the bit count the protocol specifies. The bands
    # are wide because the corpus holds several calibrations of each: NEC turns up as 8990/4490 and
    # as 9000/4500, Kaseikyo as 3364/1682, 3460/1730 and 3480/1730.
    PROTOCOLS = (
        ('NEC 9000/4500', (8900, 9100), (4400, 4600), 32),
        ('Kaseikyo 3456/1728', (3350, 3520), (1650, 1760), 48),
    )

    def test_the_group_count_matches_the_0x7c_group_count(self):
        """Ten configs, four architectures, counts from 1 to 7, and it matches every time.

        Includes the arch 9 sample, whose records use a different encoding: the two level pointer
        structure is shared even where the leaf format is not.
        """
        lab.require(*self.CONFIGS, 'h525_config')
        for name in self.CONFIGS + ('h525_config',):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                groups = {i.operand >> 8 for lst in (c.action_lists() or []) for i in lst
                          if i.opcode == 0x7C}
                self.assertEqual(len(c.ir_groups()), len(groups))
                self.assertEqual(groups, set(range(len(groups))), 'and contiguous from zero')

    def test_the_unprogrammed_one_is_the_minimal_case(self):
        """A count that is always 6 would match any table. This one goes down to 1."""
        counts = {name: len(gspm.parse(lab.load(name)).ir_groups())
                  for name in self.CONFIGS}
        self.assertEqual(counts['one_config_unprogrammed'], 1)
        self.assertEqual(max(counts.values()), 7)

    def test_the_two_level_table_is_exactly_packed(self):
        """Lead byte zero, `3 + 3 * count` bytes per group, groups adjacent, pointers in range."""
        lab.require(*self.CONFIGS, 'h525_config')
        groups = records = 0
        # Includes arch 9, whose leaf records use a different encoding: the two level pointer
        # structure holds there too, and saying so is the point of the wide totals.
        for name in self.CONFIGS + ('h525_config',):
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                table = c.pointer_array(gspm.arch_slot(c.architecture, gspm.IR_TABLE_SLOT))
                for k, address in enumerate(table):
                    off = c.blob_offset_of(address)
                    self.assertEqual(c.blob[off], 0, 'the spare byte')
                    count = int.from_bytes(c.blob[off + 1:off + 3], 'little')
                    end = off + 3 + 3 * count
                    if k + 1 < len(table):
                        self.assertEqual(end, c.blob_offset_of(table[k + 1]), 'packed adjacently')
                    groups += 1
                    records += count
                for group in c.ir_groups():
                    for address in group:
                        self.assertLess(c.blob_offset_of(address), len(c.blob))
        self.assertEqual((groups, records), (49, 3058), 'pin the corpus wide totals')

    def test_no_record_pointer_is_an_action_list(self):
        """Which is what makes this a different table rather than another view of slot 10."""
        lab.require(*self.CONFIGS)
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                lists = set(c.pointer_array(
                    gspm.arch_slot(c.architecture, gspm.ACTION_LIST_TABLE_SLOT)) or [])
                reached = {a for g in c.ir_groups() for a in g}
                self.assertEqual(lists & reached, set())

    def test_the_record_header_pointer_is_the_record_minus_seven(self):
        lab.require(*self.CONFIGS)
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                for group in c.ir_groups():
                    for address in group:
                        off = c.blob_offset_of(address)
                        first = int.from_bytes(c.blob[off + 1:off + 4], 'little')
                        self.assertEqual(first, address - 7)

    def test_a_once_block_holds_more_than_one_code(self):
        """The block a record sends once carries the code and then keeps going.

        **This asserted `2 * bits + 4` until section 139**, meaning the block holds exactly the frame
        and a terminating pair. It does not: a once block commonly carries the code, a gap, the
        protocol's **repeat header** and a long silence. The old identity held because the run being
        measured came from a neighbouring record, where the arithmetic happened to land, and it is
        that identity which made the wrong locator look confirmed.

        Stated without decoding anything, since the frame decoder is `packages/codec`'s: a once block
        contains a duration long enough to be a gap, somewhere other than at its end, which is what
        says a single block is more than one transmission.
        """
        lab.require(*self.CONFIGS)
        with_interior_gap = 0
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            for group in c.ir_groups():
                for address in group:
                    pulses = c.ir_pulses(address)
                    if not pulses:
                        continue
                    interior = [us for _, us in pulses[:-1] if us > 4000]
                    if interior:
                        with_interior_gap += 1
        # Every class 1 record in the corpus, which is why the old identity could not hold on any of
        # them once the right bytes were being read.
        self.assertEqual(with_interior_gap, 2858)

    # `test_the_header_timings_and_the_length_agree_on_the_bit_count` lived here and is now
    # `the header timings and the bit count name the same protocol` in
    # `packages/codec/test/irframe.test.ts`. It moved with the frame decoder, section 139: two
    # decoders disagreed about 37 records of one arch 8 (Harmony 880) config, and the one that had
    # been checked against a catalogue of named commands is the one that was kept.

    def test_arch_9_does_not_use_this_encoding(self):
        """Stated as a fact rather than left as a silent gap in the coverage.

        The firmware routes four infrared encoding classes. Reading the 525's records as this one
        produces header pairs that name no protocol, so the decoder must not claim them.
        """
        c = gspm.parse(lab.load('h525_config'))
        records = [a for g in c.ir_groups() for a in g]
        self.assertEqual(len(records), 200)
        # **Not one of them yields a duration**, where this said "fewer than a quarter frame" until
        # section 139. The reader gates on the class byte now instead of reading whatever bytes it
        # finds, so the statement is the one the firmware makes rather than an observation about how
        # few succeed. What class 5 does store is a dictionary body, section 82, read by
        # `packages/codec`.
        self.assertEqual([a for a in records if c.ir_pulses(a)], [])
        # And the gate is the class, not the shape: every record here reads 5.
        self.assertEqual({c.ir_class(a) for a in records}, {gspm.IR_CLASS_ARCH9})


class TestOpcode7DSendsInfrared(unittest.TestCase):
    """findings.md section 33: 0x7D's operand is a `{group, index}` into the infrared database.

    The claim is stronger than "in range": it is a bijection, so the test asserts the mapping is
    both onto and one to one. An operand that merely landed inside a valid group would pass a
    range check and fail this.
    """

    CONFIGS = ('h700_config', 'h700_config_2', 'h600_config', 'h525_config', 'one_config',
               'one_config_unprogrammed', 'arch8_config_a', 'arch8_config_b',
               'arch8_config_c', 'arch8_config_d')

    def test_the_operands_are_exactly_the_valid_group_index_pairs(self):
        """Onto, and nothing outside the table. Set equality, not a range check.

        Not one to one: a record can be sent from more than one list, 372 instructions naming 350
        records on the 700. What is exact is the set of operands, which is why this asserts
        equality of sets rather than of counts.
        """
        lab.require(*self.CONFIGS)
        total = 0
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                sizes = [len(g) for g in c.ir_groups()]
                everything = {(g, j) for g, n in enumerate(sizes) for j in range(n)}
                named = set(c.ir_references())
                self.assertEqual(named, everything)
                total += len(everything)
        self.assertEqual(total, 3058, 'pin the corpus wide count')

    def test_a_record_may_be_sent_from_more_than_one_list(self):
        """The exception to exactness, stated so the claim above is not read as stronger."""
        c = gspm.parse(lab.load('h700_config'))
        refs = c.ir_references()
        self.assertEqual((len(refs), len(set(refs))), (372, 350))

    def test_the_group_sizes_are_irregular_enough_for_that_to_mean_something(self):
        """Guard against the bijection being trivial.

        If every group held 256 records any byte pair would be in range. The 700's groups hold
        30, 111, 65, 52, 10 and 82, so an operand has to know which group it is in.
        """
        c = gspm.parse(lab.load('h700_config'))
        self.assertEqual([len(g) for g in c.ir_groups()], [30, 111, 65, 52, 10, 82])

    def test_it_appears_in_exactly_one_list_shape(self):
        expected = {14: (0x7F, 0x7D, 0x7C), 12: (0x7D, 0x7C),
                    9: (0x7D, 0x7C), 8: (0x7D, 0x7C)}
        lab.require(*self.CONFIGS)
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                shapes = {tuple(i.opcode for i in lst) for lst in c.action_lists()
                          if any(i.opcode == gspm.OPCODE_SEND_IR for i in lst)}
                self.assertEqual(shapes, {expected[c.architecture]})

    def test_the_0x7c_beside_it_always_carries_the_same_group(self):
        """The second closure, and it does not involve the infrared table at all."""
        checked = 0
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            for lst in c.action_lists():
                ops = [i.opcode for i in lst]
                if gspm.OPCODE_SEND_IR not in ops:
                    continue
                send = lst[ops.index(gspm.OPCODE_SEND_IR)]
                value = lst[ops.index(0x7C)]
                with self.subTest(image=name):
                    self.assertEqual(value.operand >> 8, send.operand >> 8)
                checked += 1
        self.assertEqual(checked, 3164, 'pin the count over all ten configs')

    def test_the_accompanying_count_is_small(self):
        """Recorded because it is what rules out the 0x7C being a second identifier."""
        seen = set()
        for name in self.CONFIGS:
            c = gspm.parse(lab.load(name))
            for lst in c.action_lists():
                ops = [i.opcode for i in lst]
                if gspm.OPCODE_SEND_IR in ops:
                    seen.add(lst[ops.index(0x7C)].operand & 0xFF)
        self.assertEqual(seen, {0, 1, 2, 4, 5, 10})


class TestTheHighOperandBand(unittest.TestCase):
    """findings.md section 31: four opcodes keep their operand at or above one band, and never leave it.

    Section 31 called the band "a second operand space"<!--superseded--> and section 72 read the
    dispatcher: it is the opcode continuing into the operand, and `0xC000` is the lowest band tested.
    The partition below is unaffected, which is why the class is still here under a better name.

    Every config in the corpus that has action lists, so ten of them across four architectures.
    The claim is a partition, which means the interesting assertion is the absence of a
    counterexample rather than the presence of an example.
    """

    CONFIGS = ('h700_config', 'h700_config_2', 'h600_config', 'h525_config', 'one_config',
               'one_config_unprogrammed', 'arch8_config_a', 'arch8_config_b',
               'arch8_config_c', 'arch8_config_d')

    # Two configs of one architecture, three times over. Both members of a pair must agree for
    # a value set to count as a vocabulary rather than as this config's contents.
    PAIRS = (('h700_config', 'h600_config'),
             ('one_config', 'one_config_unprogrammed'),
             ('arch8_config_a', 'arch8_config_b'))

    @staticmethod
    def _instructions(name):
        c = gspm.parse(lab.load(name))
        return [i for lst in (c.action_lists() or []) for i in lst]

    def test_the_four_never_carry_an_operand_below_the_band(self):
        lab.require(*self.CONFIGS)
        total = 0
        for name in self.CONFIGS:
            with self.subTest(image=name):
                low = [i for i in self._instructions(name)
                       if i.opcode in gspm.HIGH_BAND_OPCODES
                       and i.operand < gspm.OPERAND_HIGH_BAND]
                self.assertEqual(low, [], '%s: %d below the band' % (name, len(low)))
                total += sum(1 for i in self._instructions(name)
                             if i.opcode in gspm.HIGH_BAND_OPCODES)
        # The claim rests on the count, so the count is the count. `assertGreater(total, 10000)`
        # stood here against a measured 10381, which is a floor 3.8% under the figure it was
        # guarding: the four samples that carry over 900 each could have dropped out together and
        # left it passing. The population is a literal tuple above, so an exact total is stable.
        self.assertEqual(total, 10381)

    def test_the_floor_is_exactly_the_band_boundary(self):
        """Not merely at or above 0xC000: the lowest value observed IS 0xC000.

        A floor that lands on a power of two is a boundary somebody chose. A floor at, say,
        0xC391 would only be the smallest value that happened to be used.
        """
        seen = [i.operand for name in self.CONFIGS for i in self._instructions(name)
                if i.opcode in gspm.HIGH_BAND_OPCODES]
        self.assertEqual(min(seen), gspm.OPERAND_HIGH_BAND)

    def test_no_value_is_ever_carried_by_two_of_the_four(self):
        by_opcode = collections.defaultdict(set)
        for name in self.CONFIGS:
            for i in self._instructions(name):
                if i.opcode in gspm.HIGH_BAND_OPCODES:
                    by_opcode[i.opcode].add(i.operand)
        ops = sorted(by_opcode)
        for a, b in itertools.combinations(ops, 2):
            with self.subTest(pair='%02X/%02X' % (a, b)):
                self.assertEqual(by_opcode[a] & by_opcode[b], set())
        # And the bands are wide enough that disjointness is a claim about sets, not ranges:
        # 0x1F and 0x3F overlap as intervals and still never collide.
        self.assertLess(min(by_opcode[0x3F]), min(by_opcode[0x1F]))
        self.assertLess(min(by_opcode[0x1F]), max(by_opcode[0x3F]))

    def test_the_band_is_not_reserved_to_those_four(self):
        """Stated so the finding is not read as more than it is: other opcodes reach up here too."""
        others = set()
        for name in self.CONFIGS:
            for i in self._instructions(name):
                if i.operand >= gspm.OPERAND_HIGH_BAND and i.opcode not in gspm.HIGH_BAND_OPCODES:
                    others.add(i.opcode)
        self.assertEqual(others, {0x79, 0x7A})

    # The one pair and opcode where a member uses the opcode not at all, so there is nothing to
    # compare. Named rather than skipped by a bare `continue`: five of the six comparisons run, and
    # a silent sixth is how a test ends up asserting less than its title says.
    NO_SECOND_MEMBER = (('arch8_config_a', 'arch8_config_b'), 0x0F)

    def test_0x07_and_0x0f_are_a_vocabulary_fixed_per_architecture(self):
        lab.require(*sorted({n for pair in self.PAIRS for n in pair}))
        compared = 0
        for a, b in self.PAIRS:
            for op in (0x07, 0x0F):
                sa = {i.operand for i in self._instructions(a) if i.opcode == op}
                sb = {i.operand for i in self._instructions(b) if i.opcode == op}
                if not sa or not sb:
                    self.assertEqual(((a, b), op), self.NO_SECOND_MEMBER,
                                     'a new pair stopped comparing, which is not a pass')
                    continue
                compared += 1
                with self.subTest(pair='%s/%s' % (a, b), opcode='%02X' % op):
                    self.assertEqual(sa, sb)
        self.assertEqual(compared, 5, 'five of the six comparisons have both members')

    def test_one_list_shape_carries_the_same_seven_values_on_two_different_models(self):
        """[0x1F, 0x7F] over 1068 lists on two remotes that share no equipment.

        This is the observation the "not config data" conclusion rests on, so it is asserted on
        the exact values rather than on the size of the set.
        """
        # -5872, then -1280 with offsets 0, 1, 2, 3, 5 and 20.
        expected = {0xE910, 0xFB00, 0xFB01, 0xFB02, 0xFB03, 0xFB05, 0xFB14}
        counts = {}
        for name in ('h700_config', 'h600_config'):
            c = gspm.parse(lab.load(name))
            lists = [lst for lst in c.action_lists()
                     if [i.opcode for i in lst] == [0x1F, 0x7F]]
            counts[name] = len(lists)
            with self.subTest(image=name):
                self.assertEqual({lst[0].operand for lst in lists}, expected)
        self.assertEqual(counts, {'h700_config': 710, 'h600_config': 358})

    def test_the_operand_is_not_a_relative_action_list_reference(self):
        """A ruled out hypothesis, kept because its null case is the point.

        Adding the operand to the index of the containing list would be a backward call. It
        misses badly for 0x1F and 0x3F. It scores 100% for 0x07, which proves nothing: with
        operands of -14 to -1 and thousands of lists, landing in range is guaranteed.
        """
        c = gspm.parse(lab.load('one_config'))
        lists = c.action_lists()
        def in_range(op):
            hit = tot = 0
            for k, lst in enumerate(lists):
                for i in lst:
                    if i.opcode == op:
                        tot += 1
                        target = k + i.operand - 0x10000
                        hit += 0 <= target < len(lists)
            return hit, tot

        hit, tot = in_range(0x1F)
        self.assertLess(hit / tot, 0.10, 'an addressing mode does not miss 90%% of the time')
        hit, tot = in_range(0x07)
        self.assertEqual(hit, tot, 'and the null case scores perfectly, which is the warning')
        self.assertLess(max(0x10000 - i.operand for i in self._instructions('one_config')
                            if i.opcode == 0x07), len(lists),
                        'because every 0x07 operand is smaller than the table')


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
        lab.require(*self.CONFIGS)
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                found = [gspm.base_slot(c.architecture, s) for s in c.pointer_array_slots]
                self.assertEqual(found, self.BASE_SLOTS)

    def test_every_entry_is_an_address_inside_the_config(self):
        """A three byte value that lands outside the config would mean the reading is wrong."""
        lab.require(*self.CONFIGS)
        for name in self.CONFIGS:
            with self.subTest(image=name):
                c = gspm.parse(lab.load(name))
                for slot in c.pointer_array_slots:
                    for addr in c.pointer_array(slot):
                        self.assertTrue(c.flash_base <= addr <= c.end_addr,
                                        'slot %d has 0x%06X outside 0x%06X..0x%06X'
                                        % (slot, addr, c.flash_base, c.end_addr))

    def test_entries_ascend(self):
        lab.require(*self.CONFIGS)
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
        lab.require('h700_config', 'h600_config', 'h525_config', 'one_config', 'one_config_unprogrammed', 'arch8_config_a')
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
        lab.require('h700_config', 'h525_config', 'one_config', 'arch8_config_a')
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

    def test_arch_10_has_no_alignment_and_therefore_no_readers(self):
        """
        Section 117: arch 10 is **not** a relabelling of the base layout, so it must stay out of
        `INSERTED_SLOTS` and every reader must refuse rather than read the neighbouring section.

        This is the gate the two Harmony 890 configs sit behind. Adding an entry here without
        deriving the mapping would turn twenty refusals into twenty plausible wrong answers, which
        is the failure mode the arch 9 register map already cost this project once.
        """
        self.assertNotIn(10, gspm.INSERTED_SLOTS)
        for base in (0, 3, 5, 10, 17):
            with self.subTest(base=base):
                with self.assertRaises(gspm.GspmError):
                    gspm.arch_slot(10, base)


class TestTheFlashBaseIsAnchoredOnContent(unittest.TestCase):
    """
    Section 117. The base used to come out of the end marker's position, and the check that was
    meant to validate it asked whether `end_addr` lands on the marker, which it then always did.

    These tests are about the two halves of that: the anchor recovers every base that was already
    established, and the check it frees up can now fail on a real sample.
    """

    def test_every_container_holds_exactly_one_validating_clock_record(self):
        """The premise. One record is what makes it an anchor rather than a search."""
        lab.require(*lab.CONTAINERS)
        for name in lab.CONTAINERS:
            with self.subTest(sample=name):
                c = gspm.parse(lab.load(name))
                self.assertEqual(len(gspm.find_clock_records(c.blob)), 1)

    def test_the_anchor_recovers_every_base_the_old_reading_got_right(self):
        """
        The calibration, and it is the whole argument: 23 containers had a base established by the
        marker subtraction and the anchor agrees with all of them, across five architectures and
        six distinct bases.
        """
        expected = {
            'one_safemode': 0x002000, 'h700_gspm': 0x020000, 'h600_safemode_gspm': 0x020000,
            'h650_safemode_gspm': 0x020000, 'h525_safemode_ahcm': 0x018000,
            'one_config': 0x040000, 'one_config_unprogrammed': 0x040000,
            'h600_config': 0x030000, 'h700_config': 0x030000, 'h700_config_2': 0x030000,
            'h525_config': 0x020000, 'h525_config_2': 0x020000,
            'arch8_config_a': 0x020000, 'arch8_config_885': 0x020000,
            'h890_config': 0x030000,
        }
        lab.require(*expected)
        for name, base in sorted(expected.items()):
            with self.subTest(sample=name):
                c = gspm.parse(lab.load(name))
                anchored = gspm.recover_flash_base(
                    c.blob, [s.address for s in c.sections], c.end_addr)
                self.assertEqual(anchored, base)
                self.assertEqual(c.flash_base, base)

    def test_the_two_readings_disagree_on_one_sample_and_the_anchor_is_right(self):
        """
        `H890-Bedroom-2` is the counterexample. Its header declares an end 864 bytes before its own
        end marker, so the marker subtraction returns a base 864 too low, silently.

        The anchor is believed over it for two independent reasons stated here rather than in
        prose: the other 890 config, which is consistent, gives 0x030000 too, and the clock record
        the anchor lands on validates its own day of week.
        """
        lab.require('h890_config', 'h890_config_2')
        c = gspm.parse(lab.load('h890_config_2'))
        marker_reading = c.end_addr - (len(c.blob) - len(c.family.end_marker))
        self.assertEqual(marker_reading, 0x02FCA0)
        self.assertEqual(c.flash_base, 0x030000)
        self.assertEqual(c.flash_base - marker_reading, 864)
        # The consistent sibling agrees, and both are linked at a flash block boundary.
        self.assertEqual(gspm.parse(lab.load('h890_config')).flash_base, 0x030000)
        self.assertEqual(c.flash_base % gspm.FLASH_BASE_ALIGNMENT, 0)

    def test_the_end_marker_check_can_now_fail_and_does(self):
        """
        The negative. Under the old reading no input could fail this check, because the base was
        derived from the thing it tested. A check that cannot fail is not a check.
        """
        lab.require('h890_config', 'h890_config_2')
        self.assertTrue(gspm.parse(lab.load('h890_config'))
                        .checks['end_addr_points_at_end_marker'])
        self.assertFalse(gspm.parse(lab.load('h890_config_2'))
                         .checks['end_addr_points_at_end_marker'])

    def test_a_container_with_no_clock_record_falls_back_rather_than_guessing(self):
        """
        The anchor refuses when it has nothing to anchor on, which is why `parse` keeps the marker
        subtraction as a fallback. A damaged copy is still the clearest way to exercise it, and this
        used to add that nothing in the corpus reaches the path. `h890_config_2_rescan` does, for a
        different reason, and the test below covers that.
        """
        lab.require('h600_config')
        c = gspm.parse(lab.load('h600_config'))
        damaged = bytearray(c.blob)
        off = gspm.find_clock_records(c.blob)[0]
        damaged[off:off + 2] = b'\x00\x00'
        self.assertEqual(gspm.find_clock_records(bytes(damaged)), [])
        self.assertIsNone(gspm.recover_flash_base(
            bytes(damaged), [s.address for s in c.sections], c.end_addr))
        self.assertEqual(gspm.parse(bytes(damaged)).flash_base, c.flash_base)


    def test_a_second_read_of_the_same_arch_10_remote_disagrees_with_the_first(self):
        """
        Section 122, and it is what took section 117's writer rail off the board.

        `H890-Bedroom-2` was read as declaring an end 864 bytes before its own end marker, and that
        was written up as a generator that failed to restamp `end_addr` when a section grew. The
        remote was read again ten hours later at the contributor's own initiative. The second file
        puts the marker **108** bytes past the declared end and recomputes a different checksum,
        while declaring the same end address and the same checksum as the first.

        Two reads cannot both be the config. So the 864 was a property of that read, not of the
        file, and no rail can rest on it.
        """
        lab.require('h890_config_2', 'h890_config_2_rescan')
        first = gspm.parse(lab.load('h890_config_2'))
        again = gspm.parse(lab.load('h890_config_2_rescan'))
        # Identical headers: the same declared end and the same declared checksum.
        self.assertEqual(first.end_addr, again.end_addr)
        self.assertEqual(first.trailer_checksum, again.trailer_checksum)
        # Different bytes, and neither verifies.
        self.assertNotEqual(bytes(first.blob), bytes(again.blob))
        self.assertFalse(first.checks['trailer_checksum_recomputes'])
        self.assertFalse(again.checks['trailer_checksum_recomputes'])
        # And the gap between the declared end and the marker is not the same number twice, which is
        # the whole point: a property of the config would reproduce.
        base = 0x030000
        for container, expected in ((first, 864), (again, 108)):
            marker = bytes(container.blob).rindex(container.family.end_marker)
            self.assertEqual(marker - (container.end_addr - base), expected)

    def test_the_other_arch_10_remote_reads_the_same_way_twice(self):
        """
        The control, without which the test above says nothing. If every arch 10 read disagreed with
        every other, the pair would be evidence about the transport and not about that one remote.

        `H890-Bedroom-1` was also read twice. Its container is byte identical across the two reads,
        its checksum verifies in both, and the second file is 594 bytes shorter, all of it trailing
        slack past the trailer. So a stable arch 10 read exists and this is one.
        """
        lab.require('h890_config', 'h890_config_rescan')
        first = gspm.parse(lab.load('h890_config'))
        again = gspm.parse(lab.load('h890_config_rescan'))
        self.assertTrue(first.checks['trailer_checksum_recomputes'])
        self.assertTrue(again.checks['trailer_checksum_recomputes'])
        self.assertEqual(first.trailer_checksum, again.trailer_checksum)
        self.assertEqual(first.flash_base, again.flash_base)
        self.assertEqual(first.end_addr, again.end_addr)
        # The containers are byte identical, which is the claim. `blob` is the container rather than
        # the file, so the 594 bytes are measured on disk: they are trailing slack past the trailer
        # and no reader ever looks at them.
        self.assertEqual(bytes(first.blob), bytes(again.blob))
        sizes = [os.path.getsize(lab.path(n)) for n in ('h890_config', 'h890_config_rescan')]
        self.assertEqual(sizes[0] - sizes[1], 594)

    def test_the_bad_rescan_defeats_the_anchor_and_the_fallback_lies_about_it(self):
        """
        Why the anchor refusing is the right behaviour, demonstrated on a real file rather than a
        damaged copy.

        In `H890-Bedroom-2-New` the clock record sits 54 bytes further into the blob than the
        pointer naming it, so every candidate base fails the alignment filter and none survives.
        The fallback then returns an **unaligned** base, and under it the circular check reports
        that the declared end lands on the end marker, for a file whose checksum does not recompute.
        That is the failure mode section 117 removed, caught in the act on a new input.
        """
        lab.require('h890_config_2_rescan')
        c = gspm.parse(lab.load('h890_config_2_rescan'))
        blob = bytes(c.blob)
        self.assertIsNone(gspm.recover_flash_base(
            blob, [s.address for s in c.sections], c.end_addr))
        self.assertNotEqual(c.flash_base % gspm.FLASH_BASE_ALIGNMENT, 0)
        # The circular check passes on a file that does not verify, which is the point.
        self.assertTrue(c.checks['end_addr_points_at_end_marker'])
        self.assertFalse(c.checks['trailer_checksum_recomputes'])
        # The clock record moved relative to the sibling reads, all three of which agree.
        moved = gspm.find_clock_records(blob)[0]
        # `lab.IMAGES and name` used to stand where `name` does, which evaluates to `name` and did
        # nothing, and the `continue` under it skipped a sibling with no counter, in a test whose
        # docstring says all three agree. All three are in the lab, so all three are required.
        siblings = ('h890_config', 'h890_config_rescan', 'h890_config_2')
        lab.require(*siblings)
        for name in siblings:
            other = gspm.parse(lab.load(name))
            self.assertEqual(gspm.find_clock_records(bytes(other.blob))[0], moved - 54)

    def test_a_wrong_base_is_silent_which_is_why_the_anchor_exists(self):
        """
        The cost of getting it wrong, asserted rather than argued. Under the base the marker
        subtraction returns for this sample, the container still passes `sections_within_blob`: a
        wrong base does not fail, it reads the neighbouring bytes.
        """
        lab.require('h890_config_2')
        c = gspm.parse(lab.load('h890_config_2'))
        wrong = 0x02FCA0
        self.assertTrue(all(s.is_null or 0 <= s.address - wrong < len(c.blob)
                            for s in c.sections))
        # And the version word in slot 1 reads differently under each, which is the quiet kind of
        # wrong this guards: two numbers, no error, one of them meaningless.
        self.assertNotEqual(c.blob[c.sections[1].address - wrong],
                            c.blob[c.sections[1].address - c.flash_base])


class TestTheTwoHarmony890Configs(unittest.TestCase):
    """
    Section 117. Arch 10 is in the corpus and nothing reads it; these tests pin what is measured
    about it so that a later reader cannot be built on a guess.
    """

    def test_both_are_format_1_7_with_23_pointer_slots(self):
        lab.require('h890_config', 'h890_config_2')
        for name in ('h890_config', 'h890_config_2'):
            with self.subTest(sample=name):
                c = gspm.parse(lab.load(name))
                self.assertEqual(c.format_raw, 0x1700)
                self.assertEqual(c.pointer_count, 23)
                self.assertEqual(c.family.magic, b'TPTP')
                self.assertEqual(c.marker, b'WLWL')
                # 23 is deliberately not in KNOWN_POINTER_COUNTS: the count is measured and the
                # layout is not, so the check reports that rather than blessing it.
                self.assertFalse(c.checks['pointer_count_known'])

    def test_the_clock_record_sits_one_slot_later_than_everywhere_else(self):
        """
        The one thing the mapping does say. On arch 8, 9, 12 and 14 the clock is base slot 3 at raw
        slot 3; on arch 10 the single validating record is the target of raw slot 4. So arch 10
        inserts a slot below 3, and `slot3_is_a_timestamp` fails for that reason rather than for
        want of a record.
        """
        lab.require('h890_config', 'h890_config_2')
        for name in ('h890_config', 'h890_config_2'):
            with self.subTest(sample=name):
                c = gspm.parse(lab.load(name))
                off = gspm.find_clock_records(c.blob)[0]
                landing = [i for i, s in enumerate(c.sections)
                           if not s.is_null and s.address - c.flash_base == off]
                self.assertEqual(landing, [4])
                self.assertFalse(c.checks['slot3_is_a_timestamp'])
                self.assertIsNone(c.built_at)

    def test_neither_config_carries_a_name_tree(self):
        """
        No validating 0xFEED frame anywhere in either payload, so an arch 10 config does not state
        the names of its devices and activities the way section 86 reads them everywhere else.

        Stated as the measurement and not as an interpretation: what is established is that this
        parser's frame validator finds nothing, not that the format has no equivalent structure.
        """
        lab.require('h890_config', 'h890_config_2')
        for name in ('h890_config', 'h890_config_2'):
            with self.subTest(sample=name):
                c = gspm.parse(lab.load(name))
                frames = [off for off in range(len(c.blob) - 7)
                          if c.blob[off:off + 2] == gspm.FRAME_COOKIE
                          and gspm.frame_length(c.blob, off) is not None]
                self.assertEqual(frames, [])
                self.assertFalse(c.checks['slot0_is_a_feed_frame'])

    def test_the_pair_agrees_on_every_pointer_and_was_generated_minutes_apart(self):
        """
        Two configs of one setup, generated three minutes apart, agreeing on all 23 addresses and
        differing in almost every byte after the first 4875. The agreement is why the second one's
        base could be checked against the first at all.
        """
        lab.require('h890_config', 'h890_config_2')
        a = gspm.parse(lab.load('h890_config'))
        b = gspm.parse(lab.load('h890_config_2'))
        self.assertEqual([s.address for s in a.sections], [s.address for s in b.sections])
        self.assertEqual(a.end_addr, b.end_addr)
        # Same version word once the base is right, which is one more agreement the wrong base
        # destroyed: it reported two different numbers for a field both files share.
        self.assertEqual(a.version_word, b.version_word)
        stamps = [gspm.clock_record(c.blob, gspm.find_clock_records(c.blob)[0]) for c in (a, b)]
        self.assertEqual(len({s.date() for s in stamps}), 1)
        self.assertLess(abs((stamps[0] - stamps[1]).total_seconds()), 600)

    def test_the_two_remotes_carry_configs_of_the_same_length_and_shape(self):
        """
        Every section is the same length in both, the last one included, and so is the container.

        **This used to assert that the second file was 864 bytes longer and that the growth was all
        in the final section**, which was section 117's evidence that a generator had failed to
        restamp `end_addr`. The 864 bytes are not in the config at all, section 122: they are
        duplicated transfer chunks, and the file the remote holds is the same 396225 bytes as its
        sibling's. So the pair is a pair of equals and the interesting difference was never there.
        """
        lab.require('h890_config', 'h890_config_2', 'h890_config_2_rescan')
        a = gspm.parse(lab.load('h890_config'))
        b = gspm.parse(lab.load('h890_config_2'))
        self.assertEqual(len(a.blob), ARCH10_CONFIG_LENGTH)
        # Through the rescan, which is the read of this remote that can be repaired: the first read
        # duplicated a chunk inside a filler run as well, where the content cannot say which copy
        # is surplus. It does not have to, because either choice gives the same bytes.
        self.assertEqual(len(repair_duplicated_chunks(gspm.parse(lab.load('h890_config_2_rescan')))),
                         ARCH10_CONFIG_LENGTH)
        for slot in range(a.pointer_count):
            with self.subTest(slot=slot):
                self.assertEqual(a.section_length(slot), b.section_length(slot))


#: What an arch 10 read chunk is, section 122. Measured, not derived from a protocol document.
ARCH10_CHUNK = 54
#: The length both 890 containers verify at, which is what the repair has to land on.
ARCH10_CONFIG_LENGTH = 396225
#: The two chunks `H890-Bedroom-2-New` duplicated, derived below rather than asserted here.
RESCAN_DUPLICATES = (0x18E0A, 0x2D60A)
#: The one repeat that is content, because the verifying sibling read carries it at the same place.
GENUINE_REPEAT = 0x1F13A


def surplus_duplicate_chunks(blob, unit=ARCH10_CHUNK):
    """Positions where the `unit` bytes at p recur immediately, with how many extra copies follow.

    Filler regions produce hundreds of these legitimately, so a caller that wants the anomalies
    filters on content as well.
    """
    out = []
    p = 0
    while p + 2 * unit <= len(blob):
        if blob[p:p + unit] == blob[p + unit:p + 2 * unit]:
            extra = 1
            while blob[p:p + unit] == blob[p + (extra + 1) * unit:p + (extra + 2) * unit]:
                extra += 1
            out.append((p, extra))
            p += (extra + 1) * unit
        else:
            p += 1
    return out


def interesting_duplicates(blob, unit=ARCH10_CHUNK):
    """The repeats worth looking at: more than two distinct byte values in the repeated run."""
    return [p for p, _ in surplus_duplicate_chunks(blob, unit) if len(set(blob[p:p + unit])) > 2]


def repair_duplicated_chunks(container, positions=RESCAN_DUPLICATES, unit=ARCH10_CHUNK):
    """Drop one copy of the chunk at each named position, highest offset first.

    Takes the positions rather than finding them, because finding them needs a control from outside
    the file: a config legitimately repeats a chunk here and there, and telling those from a
    duplicating read means comparing against a read that verified. The test below does that.
    """
    out = bytearray(container.blob)
    for offset in sorted(positions, reverse=True):
        del out[offset:offset + unit]
    return bytes(out)


class TestTheArch10ReadDuplicatesChunks(unittest.TestCase):
    """
    Section 122. Two reads of one Harmony 890 disagree, and what separates them is whole 54 byte
    chunks appearing twice. Nothing is ever missing, which is why the damage is invisible: the file
    parses, every pointer resolves and only the checksum says otherwise.
    """

    def test_both_reads_of_the_second_remote_carry_the_same_config(self):
        """
        The premise the rest depends on. If the remote had been re-synced between the two reads its
        clock record would say so, because that record is the config's build timestamp and a
        generator stamps it per config. It is identical byte for byte, so one config, two reads.
        """
        lab.require('h890_config_2', 'h890_config_2_rescan')
        first = gspm.parse(lab.load('h890_config_2'))
        again = gspm.parse(lab.load('h890_config_2_rescan'))
        records = [gspm.find_clock_records(bytes(c.blob))[0] for c in (first, again)]
        self.assertEqual(bytes(first.blob)[records[0]:records[0] + gspm.CLOCK_RECORD_LENGTH],
                         bytes(again.blob)[records[1]:records[1] + gspm.CLOCK_RECORD_LENGTH])
        self.assertEqual([s.address for s in first.sections], [s.address for s in again.sections])
        self.assertEqual(first.end_addr, again.end_addr)
        self.assertEqual(first.trailer_checksum, again.trailer_checksum)
        # And the record moved anyway, by one chunk, because bytes were inserted ahead of it.
        self.assertEqual(records[1] - records[0], ARCH10_CHUNK)

    def test_which_repeats_are_the_duplication_is_decided_by_the_verifying_read(self):
        """
        How the two positions were found, so the repair below is a derivation and not a fit.

        A config does repeat a 54 byte run now and then, so a repeat is not by itself a duplicated
        chunk. The verifying sibling read supplies the control: it carries exactly one repeat with
        more than two distinct bytes in it, and the rescan carries three. One of the three is that
        same content, displaced by the one chunk duplicated ahead of it, and the other two are the
        duplication.
        """
        lab.require('h890_config', 'h890_config_2_rescan')
        sibling = bytes(gspm.parse(lab.load('h890_config')).blob)
        self.assertEqual(interesting_duplicates(sibling), [GENUINE_REPEAT])
        rescan = bytes(gspm.parse(lab.load('h890_config_2_rescan')).blob)
        found = interesting_duplicates(rescan)
        self.assertEqual(len(found), 3)
        displaced = GENUINE_REPEAT + ARCH10_CHUNK
        self.assertIn(displaced, found)
        self.assertEqual(sorted(p for p in found if p != displaced), sorted(RESCAN_DUPLICATES))
        # The displacement is one chunk because exactly one of the two sits below it.
        self.assertEqual(len([p for p in RESCAN_DUPLICATES if p < displaced]), 1)

    def test_dropping_the_duplicated_chunks_makes_the_rescan_verify(self):
        """
        The closure, and it is the whole finding: the repair uses the length and the duplication and
        never touches the checksum, and the checksum it lands on is the one the file declares. A
        sixteen bit value hit by construction rather than by search.
        """
        lab.require('h890_config_2_rescan')
        c = gspm.parse(lab.load('h890_config_2_rescan'))
        self.assertFalse(c.checks['trailer_checksum_recomputes'])
        fixed = repair_duplicated_chunks(c)
        self.assertEqual(len(fixed), ARCH10_CONFIG_LENGTH)
        self.assertEqual(len(c.blob) - len(fixed), 2 * ARCH10_CHUNK)
        self.assertEqual(gspm.trailer_checksum(fixed), c.trailer_checksum)
        # The end marker lands where the header says, under the base the sibling read establishes.
        self.assertEqual(fixed.rindex(c.family.end_marker), c.end_addr - 0x030000)
        # And the anchor, which refuses on the file as read, recovers the base once it is repaired.
        self.assertEqual(
            gspm.recover_flash_base(fixed, [s.address for s in c.sections], c.end_addr), 0x030000)

    def test_the_first_read_is_the_same_config_with_more_duplicates(self):
        """
        Sixteen chunks against the rescan's two, at ten places, and the alignment consumes both
        files to the last byte with nothing missing in either direction. Measured against the
        repaired rescan rather than against the sibling remote, so the comparison is one config.
        """
        lab.require('h890_config_2', 'h890_config_2_rescan')
        truth = repair_duplicated_chunks(gspm.parse(lab.load('h890_config_2_rescan')))
        read = bytes(gspm.parse(lab.load('h890_config_2')).blob)
        i = j = 0
        surplus, missing = 0, 0
        while i < len(read) and j < len(truth):
            if read[i] == truth[j]:
                i += 1
                j += 1
                continue
            for k in range(1, 9):
                if read[i + k * ARCH10_CHUNK:i + k * ARCH10_CHUNK + 96] == truth[j:j + 96]:
                    surplus += k
                    i += k * ARCH10_CHUNK
                    break
            else:
                for k in range(1, 9):
                    if read[i:i + 96] == truth[j + k * ARCH10_CHUNK:j + k * ARCH10_CHUNK + 96]:
                        missing += k
                        j += k * ARCH10_CHUNK
                        break
                else:
                    self.fail(f'the reads do not align at {i:#x} against {j:#x}')
        self.assertEqual((i, j), (len(read), len(truth)))
        self.assertEqual(missing, 0)
        self.assertEqual(surplus, 16)
        self.assertEqual(surplus * ARCH10_CHUNK, len(read) - len(truth))

    def test_the_surplus_is_counted_the_same_by_a_second_route(self):
        """
        Independent of the alignment above: count how many immediately repeated chunks each file
        holds. The repaired content has 946, the read that duplicated sixteen has 962 and the one
        that duplicated two has 948. Two methods, one answer.
        """
        lab.require('h890_config_2', 'h890_config_2_rescan')
        truth = repair_duplicated_chunks(gspm.parse(lab.load('h890_config_2_rescan')))
        base = sum(extra for _, extra in surplus_duplicate_chunks(truth))
        for name, expected in (('h890_config_2', 16), ('h890_config_2_rescan', 2)):
            with self.subTest(sample=name):
                blob = bytes(gspm.parse(lab.load(name)).blob)
                self.assertEqual(sum(extra for _, extra in surplus_duplicate_chunks(blob)) - base,
                                 expected)

    def test_every_read_is_the_config_plus_whole_chunks(self):
        """
        Across all four files, including the two that verify: the bytes concordance wrote after the
        XML header are always the config's own 396225 plus a whole number of 54 byte chunks, 13, 2,
        28 and 6 of them. That is what makes 54 the unit rather than a number fitted to one file.

        The trailing bytes past the container are zero, so a duplicate that lands there is harmless
        and a duplicate inside is not. Which of the two happens is luck, and the two remotes here
        got one each.
        """
        lab.require('h890_config', 'h890_config_rescan', 'h890_config_2', 'h890_config_2_rescan')
        expected = {'h890_config': 13, 'h890_config_rescan': 2,
                    'h890_config_2': 28, 'h890_config_2_rescan': 6}
        for name, chunks in sorted(expected.items()):
            with self.subTest(sample=name):
                data = lab.load(name)
                c = gspm.parse(data)
                stream = data[c.blob_offset:]
                self.assertEqual(len(stream), ARCH10_CONFIG_LENGTH + chunks * ARCH10_CHUNK)
                # The EZHex header counts what was written, so it cannot report the duplication: it
                # is the same process reporting on itself, which is the trap section 117 fell into.
                self.assertIn(b'<BINARYDATASIZE>%d<' % len(stream), data[:c.blob_offset])
                self.assertEqual(set(stream[len(c.blob):]), {0} if chunks else set())

    def test_the_prediction_holds_on_three_reads_it_was_not_written_from(self):
        """
        The out of sample test, and the reason those three files are in the corpus.

        Section 122 was written from four files and says an arch 10 read is the config plus a whole
        number of 54 byte chunks. Three more reads of the same remote arrived the next day, before
        anybody here had asked for them, and they carry 11, 13 and 17. Nothing about a whole number
        is implied by a file being damaged: 594, 702 and 918 bytes over could as easily have been
        anything else.
        """
        names = ('h890_config_2_redump_1', 'h890_config_2_redump_2', 'h890_config_2_redump_3')
        lab.require(*names)
        expected = dict(zip(names, (11, 13, 17)))
        for name, chunks in sorted(expected.items()):
            with self.subTest(sample=name):
                data = lab.load(name)
                c = gspm.parse(data)
                stream = len(data) - c.blob_offset
                self.assertEqual(stream, ARCH10_CONFIG_LENGTH + chunks * ARCH10_CHUNK)
                # And every one of them is still damaged, which is the other half of the point: five
                # reads of this remote and not one of them verifies as it arrived.
                self.assertFalse(c.checks['trailer_checksum_recomputes'])

    def test_all_five_reads_of_that_remote_are_the_same_config(self):
        """
        Each read aligns against the repaired content to the last byte of both, with surplus chunks
        and **nothing missing**, so what the remote holds is not in doubt even though no read of it
        has ever verified.

        The anchor is worth watching here too: it recovers `0x030000` on the reads where no duplicate
        landed below the clock record and refuses on the rest, which is the behaviour section 122
        wanted from it rather than a coincidence.
        """
        names = ('h890_config_2', 'h890_config_2_rescan', 'h890_config_2_redump_1',
                 'h890_config_2_redump_2', 'h890_config_2_redump_3')
        lab.require(*names)
        truth = repair_duplicated_chunks(gspm.parse(lab.load('h890_config_2_rescan')))
        self.assertEqual(gspm.trailer_checksum(truth), 0x5DE1)
        expected = dict(zip(names, (16, 2, 6, 5, 12)))
        for name, surplus in sorted(expected.items()):
            with self.subTest(sample=name):
                read = bytes(gspm.parse(lab.load(name)).blob)
                i = j = 0
                found = 0
                while i < len(read) and j < len(truth):
                    if read[i] == truth[j]:
                        i += 1
                        j += 1
                        continue
                    for k in range(1, 13):
                        step = k * ARCH10_CHUNK
                        if read[i + step:i + step + 96] == truth[j:j + 96]:
                            found += k
                            i += step
                            break
                    else:
                        self.fail(f'{name} does not align at {i:#x} against {j:#x}')
                self.assertEqual((i, j), (len(read), len(truth)), 'both consumed to the last byte')
                self.assertEqual(found, surplus)

    def test_a_duplicated_chunk_of_zeroes_would_pass_the_checksum(self):
        """
        The limit of the check, stated because a contributor's file will be judged by it. The
        trailer checksum is a word XOR, so inserting 54 bytes whose 27 words XOR to zero leaves it
        unchanged, and a run of zeroes is exactly that. The two chunks the rescan duplicated are not
        zero runs, which is why it was caught at all.
        """
        lab.require('h890_config')
        c = gspm.parse(lab.load('h890_config'))
        blob = bytes(c.blob)
        zeroes = blob.index(bytes(2 * ARCH10_CHUNK))
        damaged = blob[:zeroes] + bytes(ARCH10_CHUNK) + blob[zeroes:]
        self.assertEqual(gspm.trailer_checksum(damaged), gspm.trailer_checksum(blob))
        self.assertEqual(gspm.trailer_checksum(damaged), c.trailer_checksum)
        # What still catches it is the end marker's position, which the insertion moves.
        self.assertNotEqual(damaged.rindex(c.family.end_marker), c.end_addr - c.flash_base)


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


class TestTheInfraredClassByte(unittest.TestCase):
    """findings.md section 42: the byte the pointer array lands on selects the send routine."""

    CONFIGS = ('h700_config', 'h700_config_2', 'h600_config', 'h525_config', 'one_config',
               'one_config_unprogrammed', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c',
               'arch8_config_d')

    def _records(self, name):
        c = gspm.parse(lab.load(name))
        return c, [a for group in (c.ir_groups() or []) for a in group]

    def test_the_pointer_lands_seven_bytes_into_every_record(self):
        for name in self.CONFIGS:
            c, records = self._records(name)
            with self.subTest(config=name):
                self.assertTrue(records)
                for address in records:
                    self.assertEqual(address - c.ir_record_start(address),
                                     gspm.IR_RECORD_POINTER_BIAS)

    def test_one_class_per_architecture_and_nothing_mixed(self):
        """The census. Three architectures use class 1 and only class 1."""
        seen = {}
        for name in self.CONFIGS:
            c, records = self._records(name)
            classes = {c.ir_class(a) for a in records}
            with self.subTest(config=name):
                self.assertEqual(len(classes), 1, 'a config never mixes classes')
            seen.setdefault(c.architecture, set()).update(classes)
        self.assertEqual(seen[8], {gspm.IR_CLASS_STREAM})
        self.assertEqual(seen[12], {gspm.IR_CLASS_STREAM})
        self.assertEqual(seen[14], {gspm.IR_CLASS_STREAM})
        # Arch 9 reads 5, which is not one of the four its cousins dispatch over, and no arch 9
        # firmware exists to say whether that is a fifth class or a different field entirely.
        self.assertEqual(seen[9], {5})

    def test_the_records_that_store_no_durations_are_the_same_class(self):
        """So they need a better class 1 reader, not one of the other three classes.

        Phrased on the durations rather than on a frame since section 139, when the frame decoder
        moved to `packages/codec`. The claim is the same one and it is now closer to the bytes: a
        record with no duration words is not a record of a class this reader does not cover.
        """
        for name in self.CONFIGS:
            c, records = self._records(name)
            empty = [a for a in records if not c.ir_pulses(a)]
            if not empty:
                continue
            with self.subTest(config=name):
                self.assertEqual({c.ir_class(a) for a in empty},
                                 {c.ir_class(a) for a in records})


class TestTheTrailerChecksum(unittest.TestCase):
    """findings.md section 41: a seeded sixteen bit word XOR, derived from the boot validator."""

    SAMPLES = ('h700_config', 'h700_config_2', 'h600_config', 'h525_config', 'one_config',
               'one_config_unprogrammed', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c',
               'arch8_config_d', 'h600_safemode_gspm', 'h650_safemode_gspm', 'h700_gspm',
               'one_safemode')

    def test_it_recomputes_on_every_container_in_the_corpus(self):
        for name in self.SAMPLES:
            data = lab.load(name)
            c = gspm.parse(data)
            with self.subTest(sample=name):
                self.assertEqual(gspm.trailer_checksum(c.blob), c.trailer_checksum)
                self.assertTrue(c.checks['trailer_checksum_recomputes'])

    def test_the_firmware_loads_the_seed_as_two_literals(self):
        """Where `0x4321` comes from, which the data cannot say.

        This replaces a test called `test_the_seed_is_what_makes_it_fit`, whose docstring claimed to
        pin the value from the data side and which was **algebra rather than a measurement**. It
        computed `trailer_checksum(blob) ^ SEED` and required that not to equal the stored value.
        Since the checksum is `SEED ^ body`, that expression is `body`, and `body == SEED ^ body`
        reduces to `SEED == 0`. So it held for any nonzero seed whatever the bytes were, and setting
        the constant to `0x1234` left it green.

        There is no data side test to write in its place, and that is worth saying rather than
        working around. The checksum is XOR linear in the seed, so one container determines it
        exactly and any other value fails every container; `test_it_recomputes_on_every_container`
        already carries that, over fourteen containers of four architectures. A second test asserting
        the same algebra from another angle would be a second copy of one derivation.

        What the data genuinely cannot say is where the number came from, so the closure is the other
        side: the boot validator loads it as two literals into an adjacent register pair, low byte
        first, on three images spanning both bench architectures. Section 41.
        """
        from harmony.pic18 import isa
        # image -> (base, the address of the MOVLW that loads the low byte). Each sits inside that
        # unit's own validator; the second site on each image is the write path and is not read here.
        SITES = {
            'h700_code': (0x9000, 0x16562),
            'h600_code_complete': (0x9000, 0x15292),
            'one34_code': (0x20000, 0x28E36),
        }
        lab.require(*SITES)
        for name, (base, at) in SITES.items():
            with self.subTest(image=name):
                code = lab.load(name)
                pairs = []
                offset = at - base
                for _ in range(4):
                    instr = isa.decode(code, offset, base)
                    pairs.append(instr)
                    offset += 2 * instr.words
                self.assertEqual([i.mnemonic for i in pairs],
                                 ['MOVLW', 'MOVWF', 'MOVLW', 'MOVWF'])
                low, high = pairs[0].fields['k'], pairs[2].fields['k']
                self.assertEqual(low | (high << 8), gspm.TRAILER_CHECKSUM_SEED)
                # An adjacent pair, which is what makes the two bytes one sixteen bit accumulator
                # rather than two unrelated constants that happen to sit together.
                self.assertEqual(pairs[3].fields['f'], pairs[1].fields['f'] + 1)

    def test_a_flipped_byte_is_caught(self):
        """A word XOR misses a byte swap but not a changed byte, which is the case that matters."""
        data = lab.load('h600_safemode_gspm')
        c = gspm.parse(data)
        damaged = bytearray(c.blob)
        damaged[0x40] ^= 0x01
        self.assertNotEqual(gspm.trailer_checksum(bytes(damaged)), c.trailer_checksum)


if __name__ == '__main__':
    unittest.main()

