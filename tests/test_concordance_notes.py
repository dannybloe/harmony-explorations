"""
Regression tests for `reference/concordance-notes.md`.

The note describes a defect in someone else's source tree, which makes it the claim in this
repository least able to defend itself: nothing here fails when concordance changes, and nothing
here failed when the note turned out to be scoped more narrowly than it was written. So these tests
read the constants straight out of a concordance checkout and assert what the note says about them.

The checkout is not part of the lab, because it is public source rather than anything proprietary.
It is looked for at `$CONCORDANCE_SRC`, then at a `concordance` directory alongside this repository,
and the tests skip when there is none. Skipping is declared up front rather than raised inside a
loop, for the reason CLAUDE.md gives: a skip inside `subTest` lets the loop finish and a later total
is then asserted against nothing.
"""
import os
import re
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))


def _find_source():
    """The concordance checkout, or None."""
    candidates = []
    if os.environ.get('CONCORDANCE_SRC'):
        candidates.append(os.environ['CONCORDANCE_SRC'])
    candidates.append(os.path.normpath(os.path.join(_HERE, '..', '..', 'concordance')))
    for path in candidates:
        if os.path.isfile(os.path.join(path, 'libconcord', 'remote_info.h')):
            return path
    return None


SRC = _find_source()
skipWithoutSource = unittest.skipUnless(
    SRC, 'no concordance checkout; set CONCORDANCE_SRC or clone one beside this repository')


def _read(*parts):
    with open(os.path.join(SRC, *parts), encoding='utf-8', errors='replace') as fh:
        return fh.read()


# An architecture entry is a brace block introduced by a `/* arch N */` comment, and every field in
# it is a value followed by a trailing comment naming it. Reading the names rather than counting
# positions means an inserted field cannot silently shift what this test believes it is reading.
_ARCH = re.compile(r'/\*\s*arch\s+(\d+)[^*]*\*/\s*\{(.*?)\n\s*\},', re.S)
_FIELD = re.compile(r'^\s*([^,\n]+?)\s*,\s*//\s*(\w+)', re.M)


def _arch_table():
    """{arch number: {field name: value}}, numeric fields only."""
    table = {}
    for number, body in _ARCH.findall(_read('libconcord', 'remote_info.h')):
        fields = {}
        for value, name in _FIELD.findall(body):
            try:
                fields[name] = int(value, 0)
            except ValueError:
                pass  # SERIAL_LOCATION_*, micro and usb names: not what this test is about
        table[int(number)] = fields
    return table


@skipWithoutSource
class TestTheDumpReadsTheWrongRegion(unittest.TestCase):
    """The defect itself, which is a property of two architectures and not of the tool."""

    def setUp(self):
        self.arch = _arch_table()

    def test_the_two_dumps_differ_only_in_which_base_they_read(self):
        source = _read('libconcord', 'libconcord.cpp')
        safemode = re.search(r'int read_safemode_from_remote\(.*?\n\}', source, re.S).group(0)
        firmware = re.search(r'int read_firmware_from_remote\(.*?\n\}', source, re.S).group(0)
        self.assertIn('ri.arch->flash_base', safemode)
        self.assertIn('ri.arch->firmware_base', firmware)
        for body in (safemode, firmware):
            self.assertIn('FIRMWARE_MAX_SIZE', body, 'the size is fixed, not per architecture')

    def test_firmware_max_size_is_64_kib(self):
        self.assertIn('#define FIRMWARE_MAX_SIZE 64*1024', _read('libconcord', 'remote.h'))

    def test_arch_12_and_14_read_flash_zero_for_both_dumps(self):
        for number in (12, 14):
            entry = self.arch[number]
            self.assertEqual(entry['flash_base'], 0)
            self.assertEqual(entry['firmware_base'], 0,
                             'arch %d aims the firmware dump at the safe mode region' % number)

    def test_arch_12_reads_a_region_that_holds_no_application(self):
        # The application is at flash 0x020000 on the One, which the dump never reaches.
        self.assertEqual(self.arch[12]['config_base'], 0x040000)
        self.assertLess(self.arch[12]['firmware_base'] + 0x10000, 0x020000)

    def test_arch_14_reads_firmware_but_truncates_it(self):
        # Address zero is the firmware here, so the dump is code; it is the 64 KiB cap that bites,
        # against 70336 bytes on the 600 and 76672 on the 700.
        self.assertEqual(self.arch[14]['firmware_base'], 0)
        self.assertLess(self.arch[14]['firmware_base'] + 0x10000, 70336)


@skipWithoutSource
class TestArch8And9DumpTheWholeFirmware(unittest.TestCase):
    """Why asking a stranger for `concordance -b -f` is worth doing on those two and not on ours."""

    def setUp(self):
        self.arch = _arch_table()

    def test_the_firmware_base_is_its_own_region(self):
        for number in (8, 9):
            entry = self.arch[number]
            self.assertNotEqual(entry['firmware_base'], entry['flash_base'],
                                'arch %d does not confuse the two dumps' % number)

    def test_the_region_is_exactly_the_64_kib_that_gets_read(self):
        # firmware_base to config_base is the whole firmware region, and it is 0x10000 on both, so
        # a FIRMWARE_MAX_SIZE read covers it with nothing left over and nothing truncated.
        for number in (8, 9):
            entry = self.arch[number]
            self.assertEqual(entry['config_base'] - entry['firmware_base'], 0x10000,
                             'arch %d firmware region' % number)

    def test_arch_8_addresses(self):
        entry = self.arch[8]
        self.assertEqual(entry['flash_base'], 0x000000)
        self.assertEqual(entry['firmware_base'], 0x010000)
        self.assertEqual(entry['config_base'], 0x020000)

    def test_arch_9_addresses(self):
        entry = self.arch[9]
        self.assertEqual(entry['flash_base'], 0x800000)
        self.assertEqual(entry['firmware_base'], 0x810000)
        self.assertEqual(entry['config_base'], 0x820000)

    def test_an_arch_8_firmware_dump_cannot_contain_the_serial(self):
        # The claim made when asking for a dump: the serial lives below the region that is read.
        entry = self.arch[8]
        self.assertEqual(entry['serial_address'], 0x000110)
        self.assertLess(entry['serial_address'], entry['firmware_base'])


if __name__ == '__main__':
    unittest.main()
