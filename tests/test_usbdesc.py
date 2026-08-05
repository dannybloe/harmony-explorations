"""
The USB descriptor block, and what the device says about itself.

Every claim here is a quotation rather than an inference, which makes this the most solid
part of the transport work: the remote states its endpoints, its report size and its
product id in bytes it hands to the host at enumeration.

Two closures make the location of the block trustworthy on its own. The chain walks: nine
descriptors, each one's bLength landing exactly on the next. And the configuration
descriptor's wTotalLength, 0x29, is the sum of itself and the four descriptors under it.
"""
import unittest

import lab
from harmony import usbdesc

BASES = {'h700_code': 0x9000, 'one34_code': 0x20000}


def summary(name):
    return usbdesc.summary(lab.load(name), BASES[name])


class TestTheBlockIsFoundAndValidates(unittest.TestCase):
    def test_block_addresses(self):
        self.assertEqual(summary('h700_code')['block_at'], 0x1B7C6)
        self.assertEqual(summary('one34_code')['block_at'], 0x2E38E)

    def test_the_chain_is_the_same_nine_descriptors_on_both(self):
        expected = [usbdesc.DEVICE, usbdesc.CONFIGURATION, usbdesc.INTERFACE, usbdesc.HID,
                    usbdesc.ENDPOINT, usbdesc.ENDPOINT, usbdesc.STRING, usbdesc.STRING,
                    usbdesc.STRING]
        for name in BASES:
            got = [d.kind for d in summary(name)['descriptors']]
            self.assertEqual(got, expected, name)

    def test_lengths_are_contiguous(self):
        """Each descriptor starts exactly where the previous one ended."""
        for name in BASES:
            chain = summary(name)['descriptors']
            for previous, following in zip(chain, chain[1:]):
                self.assertEqual(previous.address + previous.length, following.address,
                                 '%s at 0x%05X' % (name, previous.address))

    def test_configuration_total_length_closes(self):
        """wTotalLength counts the configuration descriptor and everything under it."""
        for name in BASES:
            chain = summary(name)['descriptors']
            config = chain[1]
            under = [d for d in chain if d.kind in (usbdesc.CONFIGURATION, usbdesc.INTERFACE,
                                                    usbdesc.HID, usbdesc.ENDPOINT)]
            self.assertEqual(config.u16(2), sum(d.length for d in under), name)
            self.assertEqual(config.u16(2), 0x29, name)

    def test_walk_stops_at_the_report_descriptor(self):
        """
        The byte after the last string descriptor begins the HID report descriptor, which
        is not a standard descriptor. Read as one it looks like a 6 byte type 0x00, so the
        walk has to stop on the unknown type rather than on the length.
        """
        for name in BASES:
            chain = summary(name)['descriptors']
            after = chain[-1].address + chain[-1].length
            image, base = lab.load(name), BASES[name]
            self.assertEqual(image[after - base:after - base + 3], b'\x06\x00\xff', name)


class TestTheTransport(unittest.TestCase):
    """What packages/usb has to implement, in the device's own words."""

    def test_two_interrupt_endpoints_sixty_four_bytes_each_way(self):
        for name in BASES:
            self.assertEqual(summary(name)['endpoints'], [
                {'number': 1, 'direction': 'in', 'transfer': 'interrupt',
                 'max_packet': 64, 'interval_ms': 1},
                {'number': 2, 'direction': 'out', 'transfer': 'interrupt',
                 'max_packet': 64, 'interval_ms': 1},
            ], name)

    def test_in_is_endpoint_one_but_out_is_endpoint_two(self):
        """
        Worth stating separately because it is the easy thing to get wrong. The numbering is
        asymmetric: the host reads from endpoint 1 and writes to endpoint 2.
        """
        for name in BASES:
            endpoints = summary(name)['endpoints']
            self.assertEqual((endpoints[0]['direction'], endpoints[0]['number']), ('in', 1))
            self.assertEqual((endpoints[1]['direction'], endpoints[1]['number']), ('out', 2))

    def test_plain_hid_with_no_boot_protocol(self):
        """
        Class 3 subclass 0 protocol 0: a HID device that is not a boot keyboard or mouse, so
        no operating system will claim it as an input device.
        """
        for name in BASES:
            info = summary(name)
            self.assertEqual(info['interface_class'], 0x03, name)
            self.assertEqual(info['interface_subclass'], 0x00, name)
            self.assertEqual(info['interface_protocol'], 0x00, name)

    def test_report_descriptor_is_vendor_defined_with_no_report_ids(self):
        for name in BASES:
            report = summary(name)['report']
            self.assertEqual(report['usage_page'], 0xFF00, name)
            self.assertEqual(report['input_bytes'], 64, name)
            self.assertEqual(report['output_bytes'], 64, name)
            self.assertFalse(report['has_report_id'], name)

    def test_report_descriptor_length_matches_what_the_hid_descriptor_declares(self):
        for name in BASES:
            info = summary(name)
            self.assertEqual(info['report_descriptor_length'], 33, name)

    def test_the_one_byte_the_two_architectures_disagree_on(self):
        """
        The 33 byte descriptors are identical except one flag bit: the arch 14 input report
        is declared Relative and the arch 12 one Absolute. Meaningless for a vendor defined
        blob that no HID parser interprets, and recorded because it is the only difference,
        so a future image can be classified by it.
        """
        self.assertEqual(summary('h700_code')['report']['input_flags'], 0x06)   # relative
        self.assertEqual(summary('one34_code')['report']['input_flags'], 0x02)  # absolute
        for name in BASES:
            self.assertEqual(summary(name)['report']['output_flags'], 0x02, name)

        # And nothing else differs. Counted rather than eyeballed, per the house rule.
        blobs = []
        for name in BASES:
            info = summary(name)
            offset = info['report_descriptor_at'] - BASES[name]
            blobs.append(lab.load(name)[offset:offset + 33])
        differing = [i for i, (a, b) in enumerate(zip(*blobs)) if a != b]
        self.assertEqual(differing, [21], 'only the input item flags should differ')


class TestBcdDeviceCarriesTheSkin(unittest.TestCase):
    """
    The device release number's low byte is the skin, in BCD.

    Two samples, two architectures, and both were known independently: the Harmony One on
    the bench reports skin 54 and its image carries 0x1054, the publicly posted Harmony 700
    config is skin 66 and the 700 image carries 0x1066.

    This is the only thing that separates a 600 from a 700 before any config is read, since
    both are product id 0xC122.
    """

    def test_the_two_known_pairs(self):
        self.assertEqual(summary('one34_code')['bcd_device'], 0x1054)
        self.assertEqual(summary('one34_code')['skin'], 54)
        self.assertEqual(summary('h700_code')['bcd_device'], 0x1066)
        self.assertEqual(summary('h700_code')['skin'], 66)

    def test_bcd_decoding_rejects_a_plain_hex_reading(self):
        """0x66 read as hex is 102, and there is no skin 102. BCD is the only reading."""
        self.assertEqual(usbdesc.skin_id(0x1066), 66)
        self.assertEqual(usbdesc.skin_id(0x1071), 71)   # what the 600 should carry

    def test_product_ids(self):
        self.assertEqual(summary('one34_code')['product'], 0xC121)
        self.assertEqual(summary('h700_code')['product'], 0xC122)
        for name in BASES:
            self.assertEqual(summary(name)['vendor'], 0x046D, name)


class TestTheStringsNameTheFirmwareVersion(unittest.TestCase):
    """
    An independent check that the block belongs to the image it was found in: the product
    string carries the firmware version, which was known from the package it came out of.
    """

    def test_versions(self):
        self.assertEqual(summary('h700_code')['strings'],
                         ['Harmony Remote 0-2.8.0'] * 2)
        self.assertEqual(summary('one34_code')['strings'],
                         ['Harmony Remote 0-3.4.0'] * 2)

    def test_the_descriptor_includes_the_c_string_terminator(self):
        """
        A 22 character string in a 48 byte descriptor is 23 UTF-16 units, so the firmware
        copies the NUL terminator into the descriptor too. Harmless, and a fingerprint.
        """
        for name in BASES:
            strings = [d for d in summary(name)['descriptors'] if d.kind == usbdesc.STRING]
            product = strings[-1]
            self.assertEqual(product.length, 48, name)
            self.assertEqual(len(product.text()), 22, name)


class TestTheTruncated600ImageHasNoBlock(unittest.TestCase):
    """
    Not a defect, a measurement. concordance stops the 600 dump at 65536 of 70336 bytes,
    and the descriptor block is past the cut, so the 600's own skin cannot be read yet. A
    complete dump of that remote is the first payoff of our own read path.
    """

    def test_no_block_in_the_truncated_dump(self):
        code = lab.load('h600_code')
        self.assertIsNone(usbdesc.find_block(code, 0x9000))


if __name__ == '__main__':
    unittest.main()
