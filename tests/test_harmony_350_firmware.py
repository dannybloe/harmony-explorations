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
import io
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


if __name__ == '__main__':
    unittest.main()
