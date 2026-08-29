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
import glob
import re
import unittest

import lab
from harmony import ezfile, firmware, gspm
from harmony.pic18 import isa, loadaddr

_DOCS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs')

#: The shared document first, then every per device map. **Globbed rather than listed**, because it
#: was listed and `docs/memory-map-525.md` was never added: the arch 9 map had not been seen by the
#: identity byte guard below at all, from the day it was written. A publication check that has to be
#: extended by hand is a publication check that covers whatever somebody remembered.
_MAPS = ('memory-map.md',) + tuple(
    sorted(os.path.basename(p) for p in glob.glob(os.path.join(_DOCS, 'memory-map-*.md'))))


# concordance's own architecture table, read out of the sibling checkout. Imported rather than
# reparsed, since `test_concordance_notes.py` already has the reader and two copies of a derivation
# is this repository's oldest rule.
def _concordance_config_base(architecture):
    """`config_base` for an architecture, or None when the checkout is not beside this one."""
    try:
        import test_concordance_notes
        return test_concordance_notes._arch_table()[architecture]['config_base']
    except (ImportError, OSError, KeyError):
        return None


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
        """The 3840 KiB the map quotes is derived, not a figure concordance reports.

        It is 4 MiB above concordance's own `config_base`.

        **The whole body used to be `assertEqual(0x040000 + 3840 * 1024, 0x400000)`**, arithmetic over
        its own literals, with a docstring crediting concordance for the 3840. Measured on 13 August:
        concordance's table carries `flash_size 0` for this architecture, so the figure is not in the
        source the docstring names and cannot be. What is there is `config_base`, and the KiB number is
        derived from it, which is what this asserts.
        """
        base = _concordance_config_base(12)
        if base is None:
            self.skipTest('no concordance checkout beside this one')
        self.assertEqual(base, 0x040000, "concordance's own config_base")
        self.assertEqual((0x400000 - base) // 1024, 3840, 'which is the KiB figure the map quotes')
        self.assertIn('3840 KiB', _doc('memory-map-one.md'))

    def test_the_two_config_samples_sit_at_the_documented_base(self):
        # The population up front, so a partial lab skips this whole test rather than shrinking its
        # own claim to whatever is present. ASampleLoopStatesItsPopulation in test_toolchain.py.
        lab.require('one_config', 'one_config_unprogrammed')
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

    def test_the_config_region_stops_two_megabytes_short_of_concordances_figure(self):
        """Renamed on 29 August 2026, because the old title was a claim the firmware had refuted.

        It was `test_the_config_region_reaches_exactly_four_megabytes`, and section 88 established
        that the arch 14 part is 2 MiB: the firmware refuses every flash address at or above
        `0x200000`, agreed by the validator's bound, the `FLASH` capacity byte, the part number and
        the bench remote. A test's title is a claim, per the `finding` skill, so a body that no
        longer supports its own title is a renaming rather than a deletion.

        What stays true and is worth pinning is where concordance's 3904 KiB comes from: it is not a
        figure concordance reports, since its table carries `flash_size 0` for this architecture. It
        is derived by assuming the region reaches `0x400000`, which is the assumption that was wrong.
        So this asserts the derivation **and** that the documents state the refutation rather than
        the dead figure, which is what would fail if somebody restored `0x400000`.
        """
        base = _concordance_config_base(14)
        if base is None:
            self.skipTest('no concordance checkout beside this one')
        self.assertEqual(base, 0x030000, "concordance's own config_base")
        self.assertEqual((0x400000 - base) // 1024, 3904,
                         'the 3904 KiB figure is what a 4 MiB top would imply, and that is its only source')
        self.assertEqual((0x200000 - base) // 1024, 1856, 'the region the firmware actually permits')

        # The shared map is the document a reader opens first, and it endorsed the dead figure for
        # both architectures until this correction. Assert the live claim rather than the absence of
        # the dead one, so a reworded restatement fails too.
        shared = _doc('memory-map.md')
        self.assertIn('0x200000', shared, 'the shared map states the arch 14 ceiling')
        six = _doc('memory-map-600.md')
        self.assertIn('3904 KiB is wrong', six, 'the 600 map still carries the refutation')
        self.assertIn('0x030000` to `0x200000', six, 'and the measured region')

        # The 700's map may guess, but not from the refuted number. Assert the live claim rather
        # than the absence of the dead phrase: this document records its own correction in place, so
        # the dead words are present on purpose and an absence test fires on the correction itself.
        seven = _doc('memory-map-700.md')
        self.assertIn("the architecture's own bound, `0x030000` to\n`0x200000`", seven,
                      'the 700 guess rests on the architecture bound, not on concordance')

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
        lab.require('h700_config', 'h700_config_2')
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


class TestTheHarmony650IsArch14(unittest.TestCase):
    """The third published firmware package, and the one nobody here had opened.

    `reference/checksums.md` listed it as arch 15 for as long as it went unexamined, which would
    have put it in the network-transport family alongside the 900 and the 1100. It is arch 14, the
    same as the 600 on the bench, and that matters twice: it is a third independent arch 14 sample,
    and it makes the 650 a model whose firmware can be checked against a published image if one is
    ever connected.
    """

    def test_the_code_region_loads_at_the_arch_14_base(self):
        """Derived, not assumed: `find_base` is given the bytes and no hint.

        Reported with the runner-up, per the verification standard, because a base address that
        wins narrowly is a guess wearing a number.
        """
        code = lab.load('h650_code')
        self.assertEqual(len(code), 75392)
        best, ranked = loadaddr.find_base(code)
        self.assertEqual(best.base, 0x9000, 'the arch 14 execution base')
        self.assertGreater(best.boundary_hits, 3 * ranked[1].boundary_hits,
                           'and it wins by a margin rather than a nose')

    def test_its_own_header_checksum_verifies(self):
        code = lab.load('h650_code')
        h = firmware.parse_header(code)
        self.assertEqual(h.version, '0.4')
        self.assertTrue(firmware.verify_checksum(code))

    def test_the_safe_mode_config_states_arch_14_itself(self):
        """The architecture is read out of section slot 1, which is the only place that states it.

        Everything else about this file would fit arch 9 too, since arch 9 also carries format
        0x1400. Slot 1 is what separates them.
        """
        c = gspm.parse(lab.load('h650_safemode_gspm'))
        self.assertEqual(c.architecture, 14)
        self.assertEqual(c.format_version, '1.4')
        self.assertEqual(c.flash_base, 0x020000)
        self.assertEqual(len(c.sections), 20)
        self.assertEqual(c.end_addr - c.flash_base + 4, 7115)
        self.assertTrue(c.all_checks_pass, c.checks)

    def test_all_three_arch_14_safe_mode_configs_share_one_section_table(self):
        """600, 650 and 700: three models, three firmware versions, one layout.

        Two samples were the standard here; three across three models is what makes the arch 14
        safe mode layout a property of the architecture rather than of a device.
        """
        blobs = {name: lab.load(name)[:7115]
                 for name in ('h600_safemode_gspm', 'h650_safemode_gspm', 'h700_gspm')}
        tables = {name: [(s.slot, s.address, s.spare) for s in gspm.parse(b).sections]
                  for name, b in blobs.items()}
        first = tables['h600_safemode_gspm']
        for name, table in tables.items():
            self.assertEqual(table, first, '%s has a different section table' % name)

        # And they are genuinely three different files, not one image shipped three times.
        stamps = {gspm.parse(b).built_at for b in blobs.values()}
        self.assertEqual(len(stamps), 3, 'three distinct build timestamps')


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


class TestTheBootloaderChoosesWhatToRun(unittest.TestCase):
    """
    Section 87. The first 4 KiB of internal program memory is a bootloader, and it makes the same
    decision the same way on both architectures: scan the keypad, compare the code against two
    literals, otherwise check that the image at `0x1000` carries the `48 47` header magic.

    Written up because somebody asked which keys put a remote into safe mode. The answer this
    settles is that a boot time key check exists and what its **scan code** is; which physical key
    carries that code is section 48's open item and is not answered here.
    """

    # image -> (the two key literals, the address of the compare, the status codes)
    #
    # The two literals are in the same order in both images: the first keeps the bootloader
    # running and answers with status 6, the second transfers to the image at 0x1000.
    BOOTLOADERS = {
        'one_internal_fe': (0x0E, 0x1E, 0x00080, 0x0009E),
        'h600_internal_fe': (0x14, 0x2C, 0x00726, 0x00744),
    }

    ENTRY = 0x0100A          # the image at 0x1000, entered through its header's GOTO at +0x0A
    MAGIC_ADDRESS = 0x001008  # where the validity check looks, which is that image's magic

    def test_both_bootloaders_compare_two_key_codes_and_hand_off_to_the_same_entry(self):
        lab.require(*self.BOOTLOADERS)
        for image, (stay, handoff, compare, goto) in self.BOOTLOADERS.items():
            with self.subTest(image):
                page = lab.load(image)
                first = isa.decode(page, compare, 0)
                self.assertEqual((first.mnemonic, first.fields['k']), ('MOVLW', stay))
                # The second compare sits eight instructions later on both, after the branch.
                second = [isa.decode(page, a, 0) for a in range(compare, goto, 2)]
                literals = [i.fields['k'] for i in second
                            if i.mnemonic == 'MOVLW' and i.fields['k'] in (stay, handoff)]
                self.assertIn(handoff, literals, 'the second key code is not compared')
                transfer = isa.decode(page, goto, 0)
                self.assertEqual((transfer.mnemonic, transfer.fields['target']),
                                 ('GOTO', self.ENTRY))

    def test_the_fallback_is_a_header_magic_check_rather_than_a_checksum(self):
        """
        The other route to the same entry, and it is cheap: two bytes. It reads `0x001008` and
        compares `0x48` then `0x47`, which is the `48 47` magic at offset 8 of an image header,
        section 4. So the bootloader validates that an image is present, not that it is intact.
        """
        lab.require('h600_internal_fe', 'one_internal_fe')
        for image, validator in (('h600_internal_fe', 0x00782), ('one_internal_fe', 0x001FE)):
            with self.subTest(image):
                page = lab.load(image)
                # The 24 bit address is loaded a byte at a time into three consecutive registers.
                loads = [isa.decode(page, a, 0) for a in range(validator, validator + 14, 2)]
                literals = [i.fields['k'] for i in loads if i.mnemonic == 'MOVLW']
                self.assertEqual(literals[:2], [self.MAGIC_ADDRESS & 0xFF,
                                                (self.MAGIC_ADDRESS >> 8) & 0xFF])
                # And the two bytes it compares against.
                window = [isa.decode(page, a, 0) for a in range(validator, validator + 40, 2)]
                compared = [i.fields['k'] for i in window
                            if i.mnemonic == 'MOVLW' and i.fields['k'] in (0x48, 0x47)]
                self.assertEqual(compared, [0x48, 0x47])

    def test_the_two_key_codes_of_the_600_sit_in_one_keypad_column(self):
        """
        A sanity check on the scan code reading rather than a claim about the keys. Section 48
        gives the arch 14 column as `(code - 1) mod 4` over a 14 by 4 matrix, and both boot codes
        land in the same column, ten rows and four rows down. Two keys in one column is what a
        real keypad looks like; two codes that decoded to impossible positions would mean the
        namespace was wrong.
        """
        stay, handoff = self.BOOTLOADERS['h600_internal_fe'][:2]
        self.assertEqual((stay - 1) % 4, (handoff - 1) % 4)
        for code in (stay, handoff):
            self.assertLess((code - 1) // 4, 14, 'outside the 14 row matrix')


class TestTheSharedMap(unittest.TestCase):
    """docs/memory-map.md, which carries what the per device maps have in common."""

    def test_it_links_to_every_device_map(self):
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


#: The byte runs any memory map may carry, each compared **whole**: a substring test would let any
#: window of one pass, and would let an unrelated run through for sitting inside one of these.
#:
#: Both are properties of a model rather than of a unit, and both are published in
#: `docs/usb-protocol.md` already. The second was found by widening this check: it is the Harmony
#: 525's `GET_VERSION` reply, seven fields naming its protocol, skin, board and flash id, with no
#: serial in it. A unit's serial GUIDs are what this test exists to keep out, and they appear in
#: `concordance -i` output rather than in a version reply.
_PUBLISHABLE_BYTE_RUNS = {
    '09 00 20 11 02 18 e0 3c 00 67 01',      # the Harmony 600's descriptor bytes
    '27 30 25 12 ff 90 16 09',               # the Harmony 525's GET_VERSION reply
    # Base slot 3's clock record on the bench Harmony 525: a build timestamp of 2013-10-01, the
    # unit on our own bench, and the document spells out what each byte means two lines above it.
    '2c 28 12 01 03 09 0d',
}

#: What an account id looks like, the same shape `.githooks/pre-commit` refuses in staged content.
_GUID = re.compile(r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')

#: Six or more hex byte pairs in a row, separated by spaces or commas, in either case. Six rather
#: than eight because a serial GUID is sixteen bytes and half of one is still identifying.
_BYTE_RUN = re.compile(r'(?:\b[0-9a-fA-F]{2}\b[ ,]+){5,}\b[0-9a-fA-F]{2}\b')


class TestEveryMap(unittest.TestCase):
    def test_none_of_them_publishes_identity_bytes(self):
        """A remote's GUIDs are personal data. The maps give the offset and the length only.

        **Three things were wrong with this check and all three were measured**, in a review sweep on
        13 August 2026. Its regex was `(?:\\b[0-9a-f]{2}\\b[ ]){7,}`, lower case and space separated
        and seven long, which matched in **one** of the four documents, so for three of them the loop
        body never ran. Its assertion was `assertIn(run, whitelist)`, a **substring** test, so any
        window of the permitted run passed and so did any run that happened to sit inside it. And
        `_MAPS` was a hand written tuple that never gained `docs/memory-map-525.md`, so the arch 9 map
        had never been examined at all.

        A publication guard is the one kind of test where a vacuous pass is not merely useless. This
        one now globs the documents, matches either case and both separators, compares a run whole
        against a named set, and looks for the GUID shape directly rather than inferring it from a
        byte run's length. It also asserts that it examined every document, because the failure it is
        replacing was silence.
        """
        self.assertEqual(len(_MAPS), 5, 'the memory map glob stopped matching')
        examined = 0
        for name in _MAPS:
            with self.subTest(document=name):
                text = _doc(name)
                examined += 1
                for run in _BYTE_RUN.findall(text):
                    self.assertIn(' '.join(run.replace(',', ' ').split()),
                                  _PUBLISHABLE_BYTE_RUNS,
                                  'an unexplained byte run in %s' % name)
                self.assertEqual(_GUID.findall(text), [],
                                 'something shaped like an account GUID in %s' % name)
        self.assertEqual(examined, len(_MAPS), 'a document went unread')


if __name__ == '__main__':
    unittest.main()
