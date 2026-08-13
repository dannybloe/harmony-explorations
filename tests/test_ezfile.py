"""
The container readers, and the scrubber that must run before any `.hfw` is mirrored.
"""
import re
import unittest
import zipfile

import lab
from harmony import ezfile, gspm


class TestScrubDataXml(unittest.TestCase):
    """
    The archived `.hfw` packages carry the original downloader's account and session
    details. Anything that mirrors those files must scrub them first.
    """

    # Fabricated values in the real fields' shape. Deliberately not the values from an
    # actual package: those belong to a real person, and this file is public.
    #
    # pre-commit-allow-identity-sample: the shape is the point. `.githooks/pre-commit` refuses
    # identity fields carrying a value, and it is right to; a scrubber tested against data that
    # does not look like the real thing is testing nothing. Every value below is invented.
    SAMPLE = (
        '<Data><POSTOPTIONS><HEADERS><HEADER><KEY>Cookie</KEY>'
        '<VALUE>SKIN%5FID=Harmony; CookieKeyValue=%7BAAAAAAAA%2DBBBB%7D; '
        'ServerID=9999; ASPSESSIONIDEXAMPLE=SESSIONTOKENPLACEHOLDER</VALUE>'
        '</HEADER></HEADERS><PARAMETERS><PARAMETER><KEY>UserId</KEY>'
        '<VALUE>1234567</VALUE></PARAMETER></PARAMETERS></POSTOPTIONS></Data>'
    )

    def test_removes_every_sensitive_field(self):
        out = ezfile.scrub_data_xml(self.SAMPLE)
        for leak in ('1234567', 'ASPSESSIONIDEXAMPLE', 'SESSIONTOKENPLACEHOLDER',
                     'CookieKeyValue=%7BAAAAAAAA', 'ServerID=9999'):
            self.assertNotIn(leak, out, 'leaked %r' % leak)

    def test_keeps_the_structure_intact(self):
        out = ezfile.scrub_data_xml(self.SAMPLE)
        self.assertIn('<Data>', out)
        self.assertIn('REMOVED', out)

    @staticmethod
    def _sensitive_values(text):
        """Every value in `text` that the scrubber is supposed to remove.

        The three shapes `scrub_data_xml` handles, so this walks the same ground the scrubber
        does and can therefore be pointed at its input and its output and compared.
        """
        found = []
        for field in ezfile.SENSITIVE_XML_FIELDS:
            found += re.findall(r'<%s>(.*?)</%s>' % (field, field), text, re.DOTALL)
            found += re.findall(
                r'<KEY>%s</KEY>\s*<VALUE>(.*?)</VALUE>' % field, text, re.DOTALL)
        found += re.findall(r'<VALUE>([^<]*ASPSESSIONID[^<]*)</VALUE>', text)
        return [v for v in found if v.strip() and v.strip() != 'REMOVED']

    def test_real_package_metadata_is_clean(self):
        """No value the scrubber removes survives anywhere in its output.

        **This test used to inspect only lines that already named a sensitive field**, as
        `if field in line: assertIn('REMOVED', line)`. Measured on 13 August 2026, that ran one
        assertion out of four: `UserId` is a `<KEY>`/`<VALUE>` pair so its name survives, and
        `CookieKeyValue`, `ServerID` and `ASPSESSIONID` all sit inside one cookie value, so their
        names leave with it and the loop found no line to judge. Three fields asserting nothing
        was therefore a **consequence of the scrubber working**, which is exactly what the old
        shape could not tell apart from the scrubber having been deleted.

        So the claim is about values now, not names, and it is a differential: the same extraction
        is run over the input and the output, and it has to find something in the first.
        """
        lab.require('one_hfw')
        path = lab.path('one_hfw')
        with zipfile.ZipFile(path) as archive:
            name = next(n for n in archive.namelist() if n.lower().endswith('data.xml'))
            raw = archive.read(name).decode('utf-8', 'replace')
        clean = ezfile.read_hfw_metadata(path)

        # The control, and it comes first: an extraction that finds nothing would make every
        # assertion below vacuous, which is the failure this test is being rewritten out of.
        before = self._sensitive_values(raw)
        self.assertEqual(len(before), 4,
                         'the package should carry two UserId values and two cookie values; '
                         'found %d, so either the shape changed or the extraction is broken'
                         % len(before))
        # Long enough that finding it in a document this size is not a coincidence. The UserId
        # values are a short number, so containment cannot speak for them and the structural leg
        # below does.
        checkable = {v for v in before if len(v.strip()) >= 8}
        self.assertGreaterEqual(len(checkable), 1, 'nothing long enough to search for')

        # Teeth: the same search must succeed against the unscrubbed text.
        for value in checkable:
            self.assertIn(value, raw, 'the extraction does not find its own value')
        # The claim.
        for value in checkable:
            self.assertNotIn(value, clean,
                             'a %d character sensitive value survived scrubbing' % len(value))
        self.assertEqual(self._sensitive_values(clean), [],
                         'a sensitive value survived in one of the three shapes')

        # The structural leg, which covers the short values containment cannot: every sensitive
        # key that is still named in the output has REMOVED where its value was.
        keys = 0
        for field in ezfile.SENSITIVE_XML_FIELDS:
            for value in re.findall(
                    r'<KEY>%s</KEY>\s*<VALUE>(.*?)</VALUE>' % field, clean, re.DOTALL):
                keys += 1
                self.assertEqual(value, 'REMOVED', 'unscrubbed %s' % field)
        self.assertEqual(keys, 2, 'the two UserId pairs should still be named, with no value')

        self.assertIn('<Architecture>12</Architecture>', clean,
                      'useful metadata should survive scrubbing')


class TestHfwReader(unittest.TestCase):
    def test_one_package_regions(self):
        lab.load('one_hfw')
        regions = ezfile.read_hfw(lab.path('one_hfw'))
        self.assertEqual(sorted(regions), ['Region_2.EZUpgrade'])
        region = regions['Region_2.EZUpgrade']
        self.assertEqual(region.encoding, 'hex-data-elements')
        self.assertEqual(len(region.payload), 68952)
        self.assertTrue(region.looks_like_gspm)

    def test_700_package_regions(self):
        lab.load('h700_hfw')
        regions = ezfile.read_hfw(lab.path('h700_hfw'))
        self.assertEqual(sorted(regions), ['Region_2.EZUpgrade', 'Region_3.EZHex'])
        self.assertEqual(len(regions['Region_2.EZUpgrade'].payload), 76672)
        self.assertTrue(regions['Region_3.EZHex'].looks_like_gspm)
        # No XML at all: the file is the container, first byte to last. That is legal, and it
        # is the corpus's one instance of the branch a header-less file takes.
        self.assertEqual(regions['Region_3.EZHex'].encoding, 'bare-container')
        self.assertFalse(regions['Region_2.EZUpgrade'].looks_like_gspm,
                         'arch 14 ships code and config as separate regions')


class TestArch12RegionSplit(unittest.TestCase):
    """
    Arch 12 packs two destinations into one region: a GSPM config for flash 0x002000 then
    the code for flash 0x020000. The boundary is discoverable, because the container header
    records where it ends.
    """

    def test_split_matches_the_documented_sizes(self):
        payload = lab.load('one34_region2')
        config, code = ezfile.split_arch12_region2(payload)
        self.assertEqual(len(config), 0x22C6)
        self.assertEqual(len(code), 60050)
        self.assertEqual(len(config) + len(code), len(payload))

    def test_config_half_is_a_valid_container_for_flash_0x2000(self):
        config, _ = ezfile.split_arch12_region2(lab.load('one34_region2'))
        c = gspm.parse(config)
        self.assertEqual(c.flash_base, 0x002000)
        self.assertTrue(c.all_checks_pass)

    def test_code_half_is_a_firmware_image(self):
        from harmony import firmware
        _, code = ezfile.split_arch12_region2(lab.load('one34_region2'))
        header = firmware.parse_header(code, base=0x20000)
        self.assertTrue(header.has_magic)
        self.assertEqual(header.version, '3.4')
        self.assertEqual(header.entry_point, 0x2EA38)
        self.assertTrue(firmware.verify_checksum(code))


class TestEzHexHeader(unittest.TestCase):
    """
    A config EZHex is self-verifying: the header states the payload length and a checksum, so
    the split between XML and payload is checkable rather than guessed. That matters for the
    write path, because `INTENDEDVERSION` is what a remote compares against before accepting
    a file, and a mismatch is refused by the device.
    """

    # The two Harmony 700 configs were missing here until the TypeScript port wrote the same list
    # out a second time and the absence became visible. They verify like the rest, so it was a
    # coverage gap and not a property of those files.
    CONFIGS = ('h525_config', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c',
               'arch8_config_d', 'one_config', 'one_config_unprogrammed', 'h600_config',
               'h700_config', 'h700_config_2')

    def test_every_config_verifies_its_own_split(self):
        for name in self.CONFIGS:
            with self.subTest(config=name):
                ez = ezfile.parse_ezhex(lab.load(name), name)
                for check, ok in ez.checks.items():
                    self.assertTrue(ok, '%s failed %s' % (name, check))

    def test_checksum_is_an_xor_seeded_0x69(self):
        """Independent of the header: recompute and compare against the declared value."""
        for name in self.CONFIGS:
            with self.subTest(config=name):
                ez = ezfile.parse_ezhex(lab.load(name), name)
                self.assertEqual(ezfile.payload_checksum(ez.payload), ez.declared_checksum)

    def test_a_flipped_payload_byte_breaks_the_checksum(self):
        """A checksum that cannot fail is not a check."""
        blob = bytearray(lab.load('h525_config'))
        blob[-10] ^= 0x01
        ez = ezfile.parse_ezhex(bytes(blob), 'mutated')
        self.assertFalse(ez.checks['checksum_matches_declaration'])
        self.assertTrue(ez.checks['payload_length_matches_declaration'])

    def test_intended_version_pins_the_target_remote(self):
        ez = ezfile.parse_ezhex(lab.load('h525_config'), 'h525')
        self.assertEqual(ez.intended_version,
                         {'PROTOCOL': '9', 'SKIN': '22', 'FLASH': '0xFF:0x12',
                          'BOARD': '2.5.0', 'SOFTWARETYPE': '0'})
        ez = ezfile.parse_ezhex(lab.load('arch8_config_a'), 'arch8')
        self.assertEqual(ez.intended_version['PROTOCOL'], '8')
        self.assertEqual(ez.intended_version['SKIN'], '15')

    def test_every_config_states_a_software_type_and_none_states_an_architecture(self):
        """The two fields the four field reading missed, section 87.

        `SOFTWARETYPE` is compared and is present everywhere; `ARCHITECTURE` is compared and
        appears in no user config, so it matches by being absent. A reader that knows only
        four fields cannot tell those two cases apart.
        """
        for name in self.CONFIGS:
            with self.subTest(config=name):
                ez = ezfile.parse_ezhex(lab.load(name), name)
                self.assertEqual(ez.intended_version.get('SOFTWARETYPE'), '0')
                self.assertNotIn('ARCHITECTURE', ez.intended_version)

    def test_payload_is_the_container_the_parser_then_reads(self):
        for name in self.CONFIGS:
            with self.subTest(config=name):
                ez = ezfile.parse_ezhex(lab.load(name), name)
                c = gspm.parse(ez.payload)
                self.assertEqual(c.blob_offset, 0, 'payload starts at the container')
                self.assertEqual(c.length, len(ez.payload))


class TestTheSplitIsStructural(unittest.TestCase):
    """
    Section 87. The header ends at the line carrying `</INFORMATION>`; `BINARYDATASIZE` is a
    check on that and not the definition of it. Both derivations are computed and compared,
    which is the point: an arithmetic split from the end of the file and a structural one
    from the header's own terminator have no reason to agree unless both are right.
    """

    CONFIGS = TestEzHexHeader.CONFIGS

    def test_the_structural_and_declared_splits_agree_on_every_config(self):
        for name in self.CONFIGS:
            with self.subTest(config=name):
                ez = ezfile.parse_ezhex(lab.load(name), name)
                self.assertIsNotNone(ez.structural_split)
                self.assertEqual(ez.structural_split,
                                 len(lab.load(name)) - ez.declared_size)

    def test_the_header_terminator_is_followed_by_crlf_in_every_config(self):
        """True of the corpus, and not required by the format: see the EZUp test below."""
        for name in self.CONFIGS:
            with self.subTest(config=name):
                self.assertEqual(ezfile.parse_ezhex(lab.load(name), name).line_ending, 'crlf')

    def test_a_file_with_no_header_at_all_is_all_payload(self):
        """The 700 package's config region carries no XML. The old rule found it by
        searching for a container cookie, which is a guess that happened to be right."""
        lab.require('h700_hfw')
        blob = ezfile.read_hfw(lab.path('h700_hfw'))
        region = blob['Region_3.EZHex']
        self.assertEqual(region.encoding, 'bare-container')
        self.assertEqual(region.payload[:4], b'GSPM')
        ez = ezfile.parse_ezhex(region.payload, 'Region_3')
        self.assertFalse(ez.has_a_header)
        self.assertEqual(len(ez.payload), len(region.payload))
        self.assertTrue(ez.all_checks_pass, ez.checks)

    def test_a_declared_length_that_lies_is_caught_rather_than_obeyed(self):
        """A check that cannot fail is not a check. Shortening the declaration moves the
        arithmetic split and leaves the structural one where it was."""
        blob = bytearray(lab.load('h525_config'))
        text = bytes(blob)
        original = b'<BINARYDATASIZE>78486</BINARYDATASIZE>'
        self.assertIn(original, text)
        mutated = text.replace(original, b'<BINARYDATASIZE>78480</BINARYDATASIZE>')
        # Same length, so nothing else moves.
        self.assertEqual(len(mutated), len(text))
        ez = ezfile.parse_ezhex(mutated, 'mutated')
        self.assertFalse(ez.checks['the_two_splits_agree'])
        self.assertFalse(ez.checks['payload_length_matches_declaration'])
        # And the payload is still right, because the structural split wins.
        self.assertEqual(len(ez.payload), 78486)

    def test_an_absent_declaration_is_not_a_failure(self):
        """The reader that consumes these files treats a missing size or checksum as pass.
        Ours used to report the absence as a failed check, which conflates "this file does
        not say" with "this file is wrong"."""
        text = lab.load('h525_config')
        stripped = re.sub(rb'<BINARYDATASIZE>\d+</BINARYDATASIZE>', b'', text)
        stripped = re.sub(rb'<CHECKSUM>-?\d+</CHECKSUM>', b'', stripped)
        ez = ezfile.parse_ezhex(stripped, 'stripped')
        self.assertIsNone(ez.declared_size)
        self.assertIsNone(ez.declared_checksum)
        self.assertTrue(ez.all_checks_pass, ez.checks)
        self.assertEqual(len(ez.payload), 78486)

    def test_a_negative_checksum_reads_as_the_byte_it_narrows_to(self):
        """The consuming reader parses `<CHECKSUM>` as a signed 16 bit number and narrows it
        to a byte, so a value above 127 may legitimately be written negative. No sample does,
        which is exactly why a reader that matched digits only would have failed silently on
        the first one that did."""
        text = lab.load('h525_config')
        # 12 is the real value; -244 narrows to the same byte.
        rewritten = text.replace(b'<CHECKSUM>12</CHECKSUM>', b'<CHECKSUM>-244</CHECKSUM>')
        self.assertNotEqual(rewritten, text)
        ez = ezfile.parse_ezhex(rewritten, 'signed')
        self.assertEqual(ez.declared_checksum, -244)
        self.assertTrue(ez.checks['checksum_matches_declaration'])


class TestPhases(unittest.TestCase):
    """
    Section 87. An EZUp states its own contents: a `<PHASE>` per destination, each with a
    `<TYPE>`. The arch 12 package's two phases are the split section 3 recomputed from the
    container header, and the two routes agree to the byte.
    """

    def test_the_arch12_package_states_its_own_split(self):
        lab.require('one_hfw')
        with zipfile.ZipFile(lab.path('one_hfw')) as zf:
            phases = ezfile.read_phases(zf.read('Region_2.EZUpgrade'))
        self.assertEqual([p.kind for p in phases],
                         ['Configuration_Static', 'Firmware_Main'])
        self.assertEqual([len(p.payload) for p in phases], [8902, 60050])

        # The independent route: the same two numbers out of the GSPM header's own length,
        # with the phases thrown away.
        payload = ezfile.load_image(lab.path('one_hfw'))
        config, code = ezfile.split_arch12_region2(payload)
        self.assertEqual(config, phases[0].payload)
        self.assertEqual(code, phases[1].payload)

    def test_the_arch14_package_carries_one_phase_and_the_config_is_a_separate_region(self):
        lab.require('h700_hfw')
        with zipfile.ZipFile(lab.path('h700_hfw')) as zf:
            phases = ezfile.read_phases(zf.read('Region_2.EZUpgrade'))
            self.assertEqual([p.kind for p in phases], ['Firmware_Main'])
            self.assertEqual(len(phases[0].payload), 76672)
            self.assertEqual(ezfile.read_phases(zf.read('Region_3.EZHex')), [])

    def test_a_data_element_carries_32_bytes_and_the_last_one_the_remainder(self):
        lab.require('one_hfw')
        with zipfile.ZipFile(lab.path('one_hfw')) as zf:
            blob = zf.read('Region_2.EZUpgrade')
        for body in re.findall(rb'<PHASE>(.*?)</PHASE>', blob, re.S):
            chunks = re.findall(rb'<DATA>([0-9A-Fa-f]*)</DATA>', body)
            widths = [len(c) // 2 for c in chunks]
            self.assertTrue(all(w == 32 for w in widths[:-1]), sorted(set(widths[:-1])))
            self.assertLessEqual(widths[-1], 32)
            self.assertGreater(widths[-1], 0)

    def test_a_firmware_wrapper_declares_neither_a_length_nor_a_checksum(self):
        """Which is why an absent declaration cannot be treated as a failure."""
        lab.require('h700_hfw')
        with zipfile.ZipFile(lab.path('h700_hfw')) as zf:
            blob = zf.read('Region_2.EZUpgrade')
        self.assertNotIn(b'<BINARYDATASIZE>', blob)
        self.assertNotIn(b'<CHECKSUM>', blob)
        # And its header ends its lines with bare LF after the first, which is the case the
        # corpus of configs cannot show: every config is CR LF throughout. A reader that
        # requires CR LF before the payload gets this file's split wrong by one byte per
        # line, which is why the split is taken from the terminator and not from arithmetic
        # over line counts.
        self.assertIn(b'</INFORMATION>', blob)
        header = blob[:blob.index(b'</INFORMATION>')]
        self.assertEqual(header.count(b'\r\n'), 1, 'only the XML declaration ends CR LF')
        self.assertEqual(header.count(b'\n'), 79, 'every other line ends with a bare LF')


class TestLoadImage(unittest.TestCase):
    def test_load_image_unwraps_a_single_region_package(self):
        lab.load('one_hfw')
        self.assertEqual(len(ezfile.load_image(lab.path('one_hfw'))), 68952)

    def test_load_image_requires_a_region_for_multi_region_packages(self):
        lab.load('h700_hfw')
        with self.assertRaises(ezfile.EzFileError):
            ezfile.load_image(lab.path('h700_hfw'))
        self.assertEqual(
            len(ezfile.load_image(lab.path('h700_hfw'), region='Region_2')), 76672)

    def test_load_image_passes_through_a_raw_binary(self):
        lab.require('h700_code')
        self.assertEqual(len(ezfile.load_image(lab.path('h700_code'))), 76672)


if __name__ == '__main__':
    unittest.main()
