"""
The Harmony 300 and Harmony 350 firmware, section 196.

The fourth published Harmony firmware image, and the first that Logitech's own infrastructure
serves rather than a third party repair site. Everything here starts from the ZIP as downloaded,
because the point of the finding is that the artefact reads with the tools this project already
had, and a test that started from a file this project produced would be testing its own output.

Two closures carry it, and each could fail independently of the other:

* the package's `Description.xml` states a checksum seed, algorithm, offset and expected value,
  and recomputing that checksum over the decoded payload reproduces the stated value. The seed
  and the algorithm are section 41's, derived here from config container trailers, so this is
  Logitech stating a rule we had inferred, by a route with no shared bytes.
* the image's header carries an entry point, and the instruction sitting at the derived base is a
  `GOTO` to exactly that address. Two fields, one answer.
"""
import collections
import io
import re
import unittest
import zipfile

import lab
from harmony import ezfile, firmware, gspm
from harmony.pic18 import loadaddr

#: Straight out of the package's own Description.xml, which is quoted rather than parsed so that a
#: change in the file shows up here as a failure rather than being silently absorbed.
STATED_SKINS = ('78', '79', '104')
STATED_SEED = 0x4321
STATED_OFFSET = 0x0004
STATED_LENGTH = 0x11EF8
STATED_CHECKSUM = 0x8F7B
STATED_VERSION = '1.4'

#: Derived, with the margin recorded in section 196 rather than a bound under it.
DERIVED_BASE = 0x9000
DERIVED_ENTRY = 0x1AED4


def _package():
    with zipfile.ZipFile(io.BytesIO(lab.load('h350_package'))) as z:
        return (z.read('Description.xml').decode('utf-8'),
                z.read('Region_2.EZUpgrade'))


def _payload():
    """The code half, decoded out of the region wrapper by this project's own reader."""
    return ezfile.decode_payload(_package()[1], 'Region_2.EZUpgrade').payload


class TestThePackageStatesWhatItHolds(unittest.TestCase):
    def test_one_image_covers_the_harmony_300_and_the_harmony_350(self):
        lab.require('h350_package')
        xml = _package()[0]
        for skin in STATED_SKINS:
            self.assertIn('<SKIN>%s</SKIN>' % skin, xml.replace(' ', ''))
        self.assertEqual(xml.count('<SKIN>'), len(STATED_SKINS),
                         'a fourth skin would mean this image covers a model nobody checked')

    def test_the_manifest_states_the_version_the_header_carries(self):
        lab.require('h350_package')
        xml, _ = _package()
        self.assertIn('VERSION="%s"' % STATED_VERSION, xml)
        header = firmware.parse_header(_payload())
        # BCD, so 1.4 is 0x14. Read as decimal it would be 20 and the check would pass for the
        # wrong reason, which is why the comparison is against the digits.
        self.assertEqual('%x.%x' % (header.version_bcd >> 4, header.version_bcd & 0xF),
                         STATED_VERSION)


class TestLogitechStatesSection41sChecksum(unittest.TestCase):
    """The independent closure, and the reason this package is worth a test of its own."""

    def test_the_stated_checksum_recomputes_over_the_stated_range(self):
        lab.require('h350_package')
        xml, _ = _package()
        # The document says it, so the test reads it from the document rather than trusting the
        # constants above to still match.
        # Case as the file writes it: a lowercase 0x prefix with uppercase hex digits, which is
        # why this matches on the file's own spelling instead of folding case.
        self.assertIn('SEED="0x%04X"' % STATED_SEED, xml)
        self.assertIn('TYPE="XOR"', xml)
        self.assertIn('OFFSET="0x%04X"' % STATED_OFFSET, xml)
        self.assertIn('LENGTH="0x%X"' % STATED_LENGTH, xml)
        self.assertIn('EXPECTEDVALUE="0x%04X"' % STATED_CHECKSUM, xml)
        body = _payload()[STATED_OFFSET:STATED_OFFSET + STATED_LENGTH]
        self.assertEqual(len(body), STATED_LENGTH)
        self.assertEqual(gspm.xor_words(body, STATED_SEED), STATED_CHECKSUM)

    def test_the_image_carries_that_value_in_its_own_first_two_bytes(self):
        lab.require('h350_package')
        payload = _payload()
        self.assertEqual(payload[0] | (payload[1] << 8), STATED_CHECKSUM,
                         'the checksum is stored where the covered range starts just after')

    def test_a_flipped_payload_byte_breaks_the_checksum(self):
        """A checksum that cannot fail is not a check."""
        lab.require('h350_package')
        payload = bytearray(_payload())
        payload[STATED_OFFSET + 0x40] ^= 0x01
        body = bytes(payload[STATED_OFFSET:STATED_OFFSET + STATED_LENGTH])
        self.assertNotEqual(gspm.xor_words(body, STATED_SEED), STATED_CHECKSUM)

    def test_the_seed_is_what_pins_it(self):
        """Solve for the seed instead of asserting it, so the claim is a measurement."""
        lab.require('h350_package')
        body = _payload()[STATED_OFFSET:STATED_OFFSET + STATED_LENGTH]
        self.assertEqual(gspm.xor_words(body, 0) ^ STATED_CHECKSUM, STATED_SEED)


class TestItIsAnOrdinaryPic18Image(unittest.TestCase):
    def test_the_header_reader_accepts_it(self):
        lab.require('h350_package')
        payload = _payload()
        self.assertTrue(firmware.verify_checksum(payload))
        header = firmware.parse_header(payload)
        self.assertTrue(header.has_magic)

    def test_it_declares_the_same_family_as_the_arch_14_images(self):
        """Measured against the other images rather than asserted as a constant."""
        lab.require('h350_package', 'h700_code', 'h600_code', 'one34_code')
        family = firmware.parse_header(_payload()).family_byte
        for name in ('h700_code', 'h600_code'):
            self.assertEqual(family, firmware.parse_header(lab.load(name)).family_byte,
                             '%s should declare the same family byte' % name)
        self.assertNotEqual(family, firmware.parse_header(lab.load('one34_code')).family_byte,
                            'the Harmony One is the other family, so the byte separates two things')

    def test_the_base_derivation_is_decisive(self):
        lab.require('h350_package')
        best, ranked = loadaddr.find_base(_payload())
        self.assertEqual(best.base, DERIVED_BASE)
        self.assertGreater(best.boundary - ranked[1].boundary, 0.30,
                           'margin over the runner-up should be decisive')

    def test_the_entry_point_field_and_the_instruction_at_the_base_agree(self):
        """The closure that makes the derived base more than a score."""
        lab.require('h350_package')
        self.assertEqual(loadaddr.entry_point(_payload(), DERIVED_BASE), DERIVED_ENTRY)




class TheFirmwareStatesItsOwnFilesystem(unittest.TestCase):
    """Section 199. The name pool and the file table, which is where a config lives on this family.

    Every number here is read out of the image. Two of them are checked against answers this project
    already had by other routes, which is what makes the record layout believed rather than fitted:
    `/fw/normalmode` states the load base section 196 derived, and `/fw/safemode` ends exactly where
    it begins.
    """

    #: The pool of NUL terminated names, and the table of 11 byte records indexing it.
    POOL = 0x00910A
    TABLE = 0x0092A6
    RECORD_BYTES = 11
    ROWS = 23

    def _image(self):
        return lab.load('h350_code')

    def _names(self, image):
        names = {}
        for match in re.finditer(rb'/[!-~]{2,}\x00', image[self.POOL - DERIVED_BASE : 0x9210 - DERIVED_BASE]):
            names[match.start() + self.POOL] = match.group(0)[:-1].decode()
        return names

    def _rows(self, image):
        names = self._names(image)
        rows = []
        for index in range(self.ROWS):
            at = self.TABLE - DERIVED_BASE + index * self.RECORD_BYTES
            record = image[at : at + self.RECORD_BYTES]
            pointer = record[1] | (record[2] << 8)
            rows.append(
                {
                    'index': index,
                    'id': record[0],
                    'name': names.get(pointer),
                    'flags': record[3],
                    'medium': chr(record[4]),
                    'offset': record[5] | (record[6] << 8) | (record[7] << 16),
                    'size': record[8] | (record[9] << 8) | (record[10] << 16),
                }
            )
        return rows

    def test_every_row_resolves_to_a_name_in_the_pool(self):
        """The layout's own falsifier: a wrong stride or a wrong field offset misses the pool."""
        image = self._image()
        rows = self._rows(image)
        self.assertEqual(len(rows), self.ROWS)
        self.assertTrue(all(row['name'] is not None for row in rows),
                        'a row whose pointer misses the name pool means the layout is wrong')
        self.assertEqual(len({row['name'] for row in rows}), self.ROWS - 1,
                         'exactly one name appears twice, which is /fw/normalmode')

    def test_the_two_rows_this_project_already_knew_the_answer_to(self):
        """The calibration. Both numbers were derived before this table was found."""
        rows = {(row['name'], row['medium']): row for row in self._rows(self._image())}
        normalmode = rows[('/fw/normalmode', 'I')]
        self.assertEqual(normalmode['offset'], DERIVED_BASE,
                         'the application region begins at the load base section 196 derived')
        safemode = rows[('/fw/safemode', 'I')]
        self.assertEqual(safemode['offset'] + safemode['size'], DERIVED_BASE,
                         'and safe mode ends exactly where the application begins')

    def test_the_configuration_is_external_flash_at_0x020000(self):
        """Section 199's point. Section 193 said this family has no address; the firmware has one."""
        rows = {(row['name'], row['medium']): row for row in self._rows(self._image())}
        usercfg = rows[('/cfg/usercfg', 'E')]
        self.assertEqual(usercfg['offset'], 0x020000)
        self.assertEqual(usercfg['size'], 0x040000)

    def test_the_media_are_four_letters_and_their_populations_are_exact(self):
        """`D` is what makes the identity file generated text rather than a stored file."""
        rows = self._rows(self._image())
        counts = collections.Counter(row['medium'] for row in rows)
        self.assertEqual(dict(counts), {'I': 12, 'E': 3, 'D': 7, 'S': 1})
        dynamic = {row['name'] for row in rows if row['medium'] == 'D'}
        self.assertIn('/sys/sysinfo', dynamic, 'the identity file stores nothing')
        streamed = {row['name'] for row in rows if row['medium'] == 'S'}
        self.assertEqual(streamed, {'/ir/ir_cap'}, 'a learn capture is a stream, not a file')

    def test_a_dynamic_row_states_no_offset_and_no_size(self):
        """Which is the closure on what `D` means, rather than a label read off one example."""
        for row in self._rows(self._image()):
            if row['medium'] == 'D':
                with self.subTest(name=row['name']):
                    self.assertEqual((row['offset'], row['size']), (0, 0))

    def test_the_id_is_the_row_index_except_for_the_one_duplicate(self):
        """So there is no file id 3: /fw/normalmode has two rows and the second reuses id 2."""
        rows = self._rows(self._image())
        ids = [row['id'] for row in rows]
        self.assertEqual(ids[:6], [0, 1, 2, 2, 4, 5])
        self.assertNotIn(3, ids)
        for row in rows:
            if row['index'] != 3:
                self.assertEqual(row['id'], row['index'])

if __name__ == '__main__':
    unittest.main()
