"""
Regression tests for the memory maps.

`docs/memory-map.md` and the three device documents beside it restate figures that were established
elsewhere, which makes them the documents most likely to rot: nothing in them is derived, so nothing
in them fails when the underlying measurement is corrected. These tests take the figures back to the
images and, for the addresses no lab image covers, at least check that the document still says what
the rest of the suite believes.

Only the `0xFE` internal pages appear here. The `0xFF` pages hold each unit's identity block, so
they are deliberately absent from `tests/lab.py` and their rows in the maps are not executable.
"""
import os
import re
import unittest

import lab
from harmony import ezfile, firmware, gspm

_DOCS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs')
_MAPS = ('memory-map.md', 'memory-map-one.md', 'memory-map-600.md', 'memory-map-700.md')


def _doc(name):
    with open(os.path.join(_DOCS, name), encoding='utf-8') as fh:
        return fh.read()


class TestArch12Map(unittest.TestCase):
    """docs/memory-map-one.md"""

    def test_application_firmware_length_and_version(self):
        code = lab.load('one34_code')
        h = firmware.parse_header(code)
        self.assertEqual(len(code), 60050)
        self.assertEqual(h.version, '3.4')
        self.assertTrue(firmware.verify_checksum(code))
        # The map's row runs 0x020000 to 0x02EA92, which is the exec base plus the length.
        self.assertEqual(0x020000 + len(code), 0x02EA92)

    def test_safe_mode_config_sits_at_0x2000_and_is_8902_bytes(self):
        raw = lab.load('one_safemode')
        family, start = gspm.find_magic(raw)
        self.assertEqual(start, 0x2000, 'the container begins at flash 0x002000')
        c = gspm.parse(raw[start:])
        self.assertEqual(c.flash_base, 0x2000)
        self.assertEqual(c.format_version, '1.6')
        length = c.end_addr - c.flash_base + 4  # end_addr points at the end marker
        self.assertEqual(length, 0x22C6)
        self.assertEqual(0x002000 + length, 0x0042C6, 'the address the map gives for its end')

    def test_internal_page_fe_holds_the_bootloader_then_one_image(self):
        page = lab.load('one_internal_fe')
        self.assertEqual(page[0:1], b'\xd2', 'a GOTO at the reset vector')
        self.assertNotEqual(page[:0x1000], b'\xFF' * 0x1000, 'the bootloader is present')
        image = page[0x1000:]
        h = firmware.parse_header(image)
        self.assertTrue(h.has_magic)
        self.assertEqual(h.version, '3.4')
        size = firmware.recover_size(image)
        self.assertEqual(size, 45356)
        self.assertTrue(firmware.verify_checksum(image[:size]))
        self.assertEqual(0x1000 + size, 0xC12C, 'where the map says the image ends')
        self.assertEqual(set(page[0xC12C:]), {0xFF}, 'erased to the end of the page')

    def test_the_config_region_reaches_exactly_four_megabytes(self):
        """concordance reports 3840 KiB from 0x040000, and that lands on 0x400000."""
        self.assertEqual(0x040000 + 3840 * 1024, 0x400000)

    def test_the_two_config_samples_sit_at_the_documented_base(self):
        for name, length in (('one_config', 1672832), ('one_config_unprogrammed', 1232237)):
            with self.subTest(config=name):
                c = gspm.parse(ezfile.decode_payload(lab.load(name)).payload)
                self.assertEqual(c.flash_base, 0x040000)
                self.assertEqual(c.architecture, 12)

    def test_the_document_still_carries_these_addresses(self):
        text = _doc('memory-map-one.md')
        for token in ('0x002000', '0x0042C6', '0x020000', '0x02EA92', '0x040000',
                      '60050', '45356', '8438', '634', '3840 KiB'):
            self.assertIn(token, text, 'missing from docs/memory-map-one.md: %s' % token)


class TestArch14Map(unittest.TestCase):
    """docs/memory-map-600.md"""

    def test_application_firmware_length_and_version(self):
        code = lab.load('h600_code_complete')
        h = firmware.parse_header(code)
        self.assertEqual(len(code), 70336)
        self.assertEqual(h.version, '0.2')
        self.assertEqual(h.entry_point, 0x01A26E)
        self.assertTrue(firmware.verify_checksum(code))

    def test_the_application_spans_the_page_boundary(self):
        """0x9000 plus 70336 lands in the 0xFF page, which is why a 64 KiB read truncates it."""
        end = 0x9000 + 70336
        self.assertGreater(end, 0x10000)
        self.assertEqual(end - 0x10000, 0xA2C0, 'the offset in the 0xFF page the map gives')

    def test_internal_page_fe_holds_the_bootloader_safe_mode_and_the_application(self):
        page = lab.load('h600_internal_fe')
        self.assertNotEqual(page[:0x1000], b'\xFF' * 0x1000, 'the bootloader is present')

        safe = page[0x1000:]
        h = firmware.parse_header(safe)
        self.assertTrue(h.has_magic)
        self.assertEqual(h.version, '0.2')
        size = firmware.recover_size(safe)
        self.assertEqual(size, 24320)
        self.assertTrue(firmware.verify_checksum(safe[:size]))
        self.assertEqual(0x1000 + size, 0x6F00, 'where the map says safe mode ends')
        self.assertEqual(set(page[0x6F00:0x9000]), {0xFF}, 'erased between safe mode and the application')

        app = firmware.parse_header(page[0x9000:])
        self.assertTrue(app.has_magic, 'the application starts at +0x9000')
        self.assertEqual(app.version, '0.2')

    def test_the_config_region_reaches_exactly_four_megabytes(self):
        """concordance reports 3904 KiB from 0x030000, and that lands on 0x400000."""
        self.assertEqual(0x030000 + 3904 * 1024, 0x400000)

    def test_the_config_sample_sits_at_the_documented_base(self):
        c = gspm.parse(ezfile.decode_payload(lab.load('h600_config')).payload)
        self.assertEqual(c.flash_base, 0x030000)
        self.assertEqual(c.architecture, 14)

    def test_the_safe_mode_config_is_where_the_700s_package_said_it_would_be(self):
        """Read off the 600's own external flash, where the address came from the 700's installer.

        The base address is not an assumption handed to the parser: `flash_base` is recovered from
        `end_addr` minus the distance to the end marker, so a file read from 0x020000 independently
        saying it belongs at 0x020000 is the closure.
        """
        raw = lab.load('h600_safemode_gspm')
        self.assertEqual(len(raw), 8192, 'the read as it came off the device')
        c = gspm.parse(raw)
        self.assertEqual(c.flash_base, 0x020000)
        self.assertEqual(c.architecture, 14)
        self.assertEqual(c.format_version, '1.4')
        self.assertEqual(len(c.sections), 20)
        self.assertEqual(c.end_addr - c.flash_base + 4, 7115)
        self.assertTrue(c.all_checks_pass, c.checks)
        self.assertEqual(set(raw[7115:]), {0xFF}, 'erased after the container')

    def test_the_600_and_700_safe_mode_configs_share_a_layout(self):
        """Same length, same twenty pointers, 83 differing bytes, mostly in the key table.

        Which is the opposite of how user configs behave: section 16 has three of those, generated
        ten minutes apart, differing in most of their bytes. These two were built five months apart.
        """
        a = lab.load('h600_safemode_gspm')[:7115]
        b = lab.load('h700_gspm')[:7115]
        self.assertEqual(len(a), len(b))
        differing = [i for i in range(len(a)) if a[i] != b[i]]
        self.assertEqual(len(differing), 83)

        ca, cb = gspm.parse(a), gspm.parse(b)
        self.assertEqual([s.address for s in ca.sections], [s.address for s in cb.sections],
                         'the section tables are identical')
        self.assertNotEqual(ca.built_at, cb.built_at, 'built at different times')

        # Most of the difference is below the first section, in the LWJL block the section table
        # does not point at. That is the key table, and two keypads differing is expected.
        first_section = min(s.address - ca.flash_base for s in ca.sections if s.address)
        below = [i for i in differing if i < first_section]
        self.assertGreater(len(below), len(differing) // 2,
                           'the differences moved out of the key table region')

    def test_the_document_still_carries_these_addresses(self):
        text = _doc('memory-map-600.md')
        for token in ('+0x1000', '+0x9000', '+0xA2C0', '0x030000', '0x020000', '0x021BCB',
                      '70336', '24320', '7115', '3904 KiB'):
            self.assertIn(token, text, 'missing from docs/memory-map-600.md: %s' % token)


class TestArch14MapFor700(unittest.TestCase):
    """docs/memory-map-700.md, which is the one map with no device behind it."""

    def test_application_firmware_length_and_entry_point(self):
        code = lab.load('h700_code')
        h = firmware.parse_header(code)
        self.assertEqual(len(code), 76672)
        self.assertEqual(h.version, '2.8')
        self.assertEqual(h.entry_point, 0x01BB38)
        self.assertTrue(firmware.verify_checksum(code))
        self.assertEqual(0x9000 + len(code) - 0x10000, 0xBB80, 'where the map says it ends')
        self.assertLess(0xBB80, 0xFFC0, 'and that is inside the read window')

    def test_the_safe_mode_config_declares_the_base_both_arch_14_maps_use(self):
        c = gspm.parse(lab.load('h700_gspm'))
        self.assertEqual(c.flash_base, 0x020000)
        self.assertEqual(c.format_version, '1.4')
        self.assertEqual(c.architecture, 14)
        self.assertEqual(c.end_addr - c.flash_base + 4, 7115)
        self.assertEqual(0x020000 + 7115, 0x021BCB, 'the address both arch 14 maps give')

    def test_both_700_configs_sit_at_the_documented_base(self):
        for name in ('h700_config', 'h700_config_2'):
            with self.subTest(config=name):
                c = gspm.parse(ezfile.decode_payload(lab.load(name)).payload)
                self.assertEqual(c.flash_base, 0x030000)
                self.assertEqual(c.architecture, 14)

    def test_the_document_says_no_700_has_been_read(self):
        """The whole point of this map is that it is unmeasured. If that sentence goes, so does
        the reason every row is marked presumed."""
        text = _doc('memory-map-700.md')
        self.assertIn('No Harmony 700 has ever been connected', text)
        self.assertIn('presumed', text)

    def test_the_document_still_carries_these_addresses(self):
        text = _doc('memory-map-700.md')
        for token in ('+0x9000', '+0xBB80', '0x012B80', '0x021BCB', '0x030000',
                      '76672', '7115', '0x01BB38'):
            self.assertIn(token, text, 'missing from docs/memory-map-700.md: %s' % token)


class TestTheConfigurationWords(unittest.TestCase):
    """findings.md section 25: the six bytes at 0xFF +0xFFF8.

    The identification rests on arithmetic plus an authoritative table, and the table is a file
    on this machine rather than a datasheet quote, so the test reads it. `0xFF` pages are not in
    `tests/lab.py` on purpose, since they carry identity blocks, so what is executable here is the
    address reasoning and not the bytes.
    """

    # gputils installs its linker scripts here. Homebrew on Apple silicon first, then Intel, then
    # a distribution package.
    LKR_DIRS = (
        '/opt/homebrew/share/gputils/lkr',
        '/usr/local/share/gputils/lkr',
        '/usr/share/gputils/lkr',
    )
    CONFIG_START = 0x1FFF8
    CONFIG_END = 0x1FFFD
    PAGE_SIZE = 0x10000
    READ_CLAMP = 0xFFC0
    REPORT_BYTES = 62

    def _linker_script(self, part):
        for directory in self.LKR_DIRS:
            path = os.path.join(directory, '%s_g.lkr' % part)
            if os.path.isfile(path):
                with open(path, encoding='utf-8') as fh:
                    return fh.read()
        raise unittest.SkipTest('gputils linker scripts not installed (looked in %s)'
                                % ', '.join(self.LKR_DIRS))

    def _codepages(self, part):
        text = self._linker_script(part)
        found = {}
        for name, start, end in re.findall(
                r'CODEPAGE\s+NAME=(\w+)\s+START=(0x[0-9A-Fa-f]+)\s+END=(0x[0-9A-Fa-f]+)', text):
            found[name] = (int(start, 16), int(end, 16))
        return found

    def test_both_candidate_parts_put_the_config_words_in_the_same_place(self):
        """The 600 is a PIC18F67J50 and the One is inferred to be the 80 pin sibling."""
        for part in ('18f67j50', '18f87j50'):
            with self.subTest(part=part):
                pages = self._codepages(part)
                self.assertEqual(pages.get('config'), (self.CONFIG_START, self.CONFIG_END))
                self.assertEqual(pages.get('page'), (0x0, self.CONFIG_START - 1))
                self.assertEqual(pages.get('devid'), (0x3FFFFE, 0x3FFFFF))

    def test_the_observed_run_is_at_the_config_address_and_the_config_length(self):
        """0xFE maps from program zero, so 0xFF +0xFFF8 is program 0x1FFF8."""
        observed_offset = 0xFFF8
        observed_length = 6
        self.assertEqual(self.PAGE_SIZE + observed_offset, self.CONFIG_START)
        self.assertEqual(self.CONFIG_END - self.CONFIG_START + 1, observed_length)

    def test_the_config_words_are_inside_the_read_window_and_the_lost_bytes_are_not_config(self):
        """The clamp costs the last two bytes of each page, and they are not configuration."""
        last_readable = self.READ_CLAMP + self.REPORT_BYTES - 1
        self.assertEqual(self.PAGE_SIZE + last_readable, self.CONFIG_END,
                         'the last readable byte is exactly the last configuration byte')
        for lost in (0x1FFFE, 0x1FFFF):
            self.assertGreater(lost, self.CONFIG_END, 'past the configuration region')

    def test_the_documents_name_them(self):
        for name in ('memory-map.md', 'memory-map-one.md', 'memory-map-600.md'):
            with self.subTest(document=name):
                text = _doc(name)
                self.assertIn('configuration words', text)
                self.assertIn('0x1FFF8', text)
        findings = _doc('findings.md')
        self.assertIn('## 25.', findings)
        self.assertIn('18f67j50_g.lkr', findings)


class TestTheSharedMap(unittest.TestCase):
    """docs/memory-map.md, which carries what the three device maps have in common."""

    def test_it_links_to_all_three_device_maps(self):
        text = _doc('memory-map.md')
        for name in _MAPS[1:]:
            self.assertIn(name, text, 'the index does not mention %s' % name)

    def test_each_device_map_points_back_at_it(self):
        for name in _MAPS[1:]:
            with self.subTest(document=name):
                self.assertIn('memory-map.md', _doc(name))

    def test_the_shared_rules_are_stated_once(self):
        """The 0xFFC0 clamp and the two page window belong in one document, not three."""
        shared = _doc('memory-map.md')
        self.assertIn('0xFFC0', shared)
        for name in _MAPS[1:]:
            with self.subTest(document=name):
                self.assertNotIn('0xFFC0', _doc(name), 'repeated instead of referenced')


class TestEveryMap(unittest.TestCase):
    def test_none_of_them_publishes_identity_bytes(self):
        """A remote's GUIDs are personal data. The maps give the offset and the length only."""
        for name in _MAPS:
            with self.subTest(document=name):
                text = _doc(name)
                runs = re.findall(r'(?:\b[0-9a-f]{2}\b[ ]){7,}', text)
                for run in runs:
                    self.assertIn(run.strip(), '09 00 20 11 02 18 e0 3c 00 67 01',
                                  'an unexplained byte run in %s' % name)


if __name__ == '__main__':
    unittest.main()
