"""
The container readers, and the scrubber that must run before any `.hfw` is mirrored.
"""
import unittest

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

    def test_real_package_metadata_is_clean(self):
        lab.load('one_hfw')            # skips if unavailable
        text = ezfile.read_hfw_metadata(lab.path('one_hfw'))
        for field in ezfile.SENSITIVE_XML_FIELDS:
            for line in text.splitlines():
                if field in line:
                    self.assertIn('REMOVED', line, 'unscrubbed %s' % field)
        self.assertIn('<Architecture>12</Architecture>', text,
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
        self.assertEqual(regions['Region_3.EZHex'].encoding, 'raw-after-xml')
        self.assertTrue(regions['Region_3.EZHex'].looks_like_gspm)
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
                          'BOARD': '2.5.0'})
        ez = ezfile.parse_ezhex(lab.load('arch8_config_a'), 'arch8')
        self.assertEqual(ez.intended_version['PROTOCOL'], '8')
        self.assertEqual(ez.intended_version['SKIN'], '15')

    def test_payload_is_the_container_the_parser_then_reads(self):
        for name in self.CONFIGS:
            with self.subTest(config=name):
                ez = ezfile.parse_ezhex(lab.load(name), name)
                c = gspm.parse(ez.payload)
                self.assertEqual(c.blob_offset, 0, 'payload starts at the container')
                self.assertEqual(c.length, len(ez.payload))


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
