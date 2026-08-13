"""
The USB descriptor block, and what the device says about itself.

Every claim here is a quotation rather than an inference, which makes this the most solid
part of the transport work: the remote states its endpoints, its report size and its
product id in bytes it hands to the host at enumeration.

Two closures make the location of the block trustworthy on its own. The chain walks: nine
descriptors, each one's bLength landing exactly on the next. And the configuration
descriptor's wTotalLength, 0x29, is the sum of itself and the four descriptors under it.
"""
import re
import unittest

import lab
from harmony import usbdesc

BASES = {'h700_code': 0x9000, 'one34_code': 0x20000}

# The HID report descriptor of the Harmony 600 on the bench, read out of the live device with
# `ioreg -rc IOHIDInterface`, so a hardware measurement rather than an image. Enumeration
# only: no command was sent to the remote.
#
# It is here because the 600's firmware dump is truncated before its descriptor block, so
# these 33 bytes are the only direct evidence of what an arch 14 remote on this bench actually
# reports. Alongside it, the device reported bcdDevice 0x1071, product 0xC122, 64 byte input
# and output reports and a 1 ms interval, all of which the images predicted.
HARMONY_600_LIVE_REPORT_DESCRIPTOR = bytes.fromhex(
    '0600ff0901a101150026ff007508a102090295408106c0a102090595409102c0c0')

# The same remote's endpoint descriptors, read with pyusb because ioreg does not report them.
# Enumeration only again: libusb caches these when it enumerates, so no handle was opened and
# no transfer reached the remote. Format matches usbdesc.summary()['endpoints'].
HARMONY_600_LIVE_ENDPOINTS = [
    {'number': 1, 'direction': 'in', 'transfer': 'interrupt',
     'max_packet': 64, 'interval_ms': 1},
    {'number': 2, 'direction': 'out', 'transfer': 'interrupt',
     'max_packet': 64, 'interval_ms': 1},
]


def summary(name):
    return usbdesc.summary(lab.load(name), BASES[name])


def header_skin(blob):
    """The skin a config states in the `<SKIN>` element of its EZHex header.

    The independent oracle for `skin_id`: this number comes from the host software that built
    the config, and the `bcdDevice` it is compared against comes from the firmware's own
    descriptor. Deliberately a two line regular expression rather than a call into
    `harmony.ezfile`, so that a change to the container reader cannot make both sides agree by
    moving together.
    """
    found = re.search(rb'<SKIN>(\d+)</SKIN>', blob[:4096])
    assert found is not None, 'the config states no skin'
    return int(found.group(1))


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
    The device release number's low byte is the skin, and its encoding is per generation.

    Four architectures, each with an independent oracle: every config states its own skin in
    the `<SKIN>` element of its EZHex header, and the firmware image of the same model carries
    a `bcdDevice`. The pairs are 880 (15, 0x080F), 885 (17, 0x0811), 525 (22, 0x0916), One
    (54, 0x1054), 700 (66, 0x1066), 600 (71, 0x1071) and 650 (72, 0x1072).

    Arch 8 and arch 9 carry the skin as plain binary with the protocol in the high byte; arch
    12 and arch 14 carry it as BCD under a constant 0x10. **The 885 is what settles that**,
    because 0x0F reads as 15 under either rule and 0x11 does not.

    This is the only thing that separates a 600 from a 700 before any config is read, since
    both are product id 0xC122. findings.md section 113.
    """

    def test_the_bcd_generation(self):
        self.assertEqual(summary('one34_code')['bcd_device'], 0x1054)
        self.assertEqual(summary('one34_code')['skin'], 54)
        self.assertEqual(summary('h700_code')['bcd_device'], 0x1066)
        self.assertEqual(summary('h700_code')['skin'], 66)

    def test_the_binary_generation(self):
        """Arch 8 and arch 9, where the low byte is the skin and the high byte the protocol."""
        lab.require('arch8_code_880', 'arch8_code_885', 'h525_code')
        self.assertEqual(usbdesc.summary(lab.load('arch8_code_880'), 0x10000)['bcd_device'],
                         0x080F)
        self.assertEqual(usbdesc.summary(lab.load('arch8_code_880'), 0x10000)['skin'], 15)
        self.assertEqual(usbdesc.summary(lab.load('arch8_code_885'), 0x10000)['bcd_device'],
                         0x0811)
        self.assertEqual(usbdesc.summary(lab.load('arch8_code_885'), 0x10000)['skin'], 17)
        # The 525's real block, not the Microchip stock one that also validates in its image.
        self.assertEqual(usbdesc.summary(lab.load('h525_code'), 0x0000)['bcd_device'], 0x0916)
        self.assertEqual(usbdesc.summary(lab.load('h525_code'), 0x0000)['skin'], 22)

    def test_each_image_agrees_with_a_config_that_states_its_skin(self):
        """
        The closure, and the reason the rule is believed rather than fitted: the skin comes out
        of the firmware's descriptor and out of a config's XML header, which are different
        files produced by different halves of Logitech's toolchain.
        """
        pairs = [('arch8_code_880', 0x10000, 'arch8_config_a'),
                 ('arch8_code_885', 0x10000, 'arch8_config_885'),
                 ('h525_code', 0x0000, 'h525_config'),
                 ('one34_code', 0x20000, 'one_config'),
                 ('h700_code', 0x9000, 'h700_config')]
        lab.require(*[name for name, _, _ in pairs], *[c for _, _, c in pairs])
        for image, base, config in pairs:
            stated = header_skin(lab.load(config))
            found = usbdesc.summary(lab.load(image), base)['skin']
            self.assertEqual(found, stated, '%s against %s' % (image, config))

    def test_a_wrong_reading_names_a_different_remote_rather_than_failing(self):
        """
        Why the encoding is keyed on the high byte instead of one formula being applied to all.

        Both wrong readings produce a number in range, so neither raises: the 885's 0x0811 read
        as BCD is 11, and the 700's 0x1066 read as binary is 102. Logitech's own model list has
        entries at both, a Harmony 655 and a Harmony Ultimate One. That is the failure mode this
        project keeps meeting, a wrong rule with a plausible answer, so the two rules are kept
        apart and an unknown generation returns None.
        """
        self.assertEqual(usbdesc.skin_id(0x0811), 17)
        self.assertEqual((0x11 >> 4) * 10 + (0x11 & 0x0F), 11, 'the reading that was shipped')
        self.assertEqual(usbdesc.skin_id(0x1066), 66)
        self.assertEqual(0x66, 102, 'the reading that would be wrong the other way')

    def test_an_unknown_generation_is_none_rather_than_a_guess(self):
        # 0x0A is the obvious prediction for the 890, and no arch 10 firmware exists here to
        # check it, so it must not be implemented. This test is what would fail if it were.
        self.assertIsNone(usbdesc.skin_id(0x0A13))
        self.assertIsNone(usbdesc.skin_id(0x0000), 'the Microchip stock descriptor')
        self.assertIsNone(usbdesc.skin_id(0x1154))

    def test_product_ids(self):
        self.assertEqual(summary('one34_code')['product'], 0xC121)
        self.assertEqual(summary('h700_code')['product'], 0xC122)
        for name in BASES:
            self.assertEqual(summary(name)['vendor'], 0x046D, name)


class TestTheLiveArch14RemoteMatchesTheArch14Image(unittest.TestCase):
    """
    The one place in this project where an image claim is checked against hardware.

    The 700 image is the arch 14 reading reference because the 600 dump is truncated, and the
    700 is not on the bench. So the question that matters is whether the 600 behaves like the
    700, and for the report descriptor the answer is byte for byte yes.
    """

    def test_the_700_image_carries_exactly_what_the_600_reports(self):
        info = summary('h700_code')
        offset = info['report_descriptor_at'] - BASES['h700_code']
        from_image = lab.load('h700_code')[offset:offset + 33]
        self.assertEqual(from_image, HARMONY_600_LIVE_REPORT_DESCRIPTOR)

    def test_the_arch_12_image_differs_from_the_live_arch_14_remote(self):
        """
        And in exactly the one byte, the input item flag. If this ever came out as zero
        differences the two architectures would be indistinguishable here, and if it came out
        as more than one the claim that the descriptors are otherwise shared would be wrong.
        """
        info = summary('one34_code')
        offset = info['report_descriptor_at'] - BASES['one34_code']
        from_image = lab.load('one34_code')[offset:offset + 33]
        differing = [i for i, (a, b) in
                     enumerate(zip(from_image, HARMONY_600_LIVE_REPORT_DESCRIPTOR)) if a != b]
        self.assertEqual(differing, [21])
        self.assertEqual(from_image[21], 0x02, 'arch 12 declares the input report Absolute')
        self.assertEqual(HARMONY_600_LIVE_REPORT_DESCRIPTOR[21], 0x06, 'arch 14, Relative')

    def test_the_endpoints_the_image_declares_are_the_endpoints_the_device_has(self):
        """
        Including the asymmetry, which is the thing a host implementation gets wrong: IN on
        endpoint 1 and OUT on endpoint 2, measured rather than read off a proxy.
        """
        self.assertEqual(summary('h700_code')['endpoints'], HARMONY_600_LIVE_ENDPOINTS)
        self.assertEqual(summary('one34_code')['endpoints'], HARMONY_600_LIVE_ENDPOINTS)

    def test_the_measured_descriptor_is_the_declared_length(self):
        self.assertEqual(len(HARMONY_600_LIVE_REPORT_DESCRIPTOR), 33)
        self.assertEqual(summary('h700_code')['report_descriptor_length'], 33)

    def test_the_measured_descriptor_declares_the_same_geometry(self):
        report = usbdesc.report_geometry(HARMONY_600_LIVE_REPORT_DESCRIPTOR)
        self.assertEqual(report['usage_page'], 0xFF00)
        self.assertEqual(report['input_bytes'], 64)
        self.assertEqual(report['output_bytes'], 64)
        self.assertFalse(report['has_report_id'])


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


class TestAStartBelowTheBaseIsRefused(unittest.TestCase):
    """A negative index reads from the end in Python, so a wrong base walked the image's tail.

    `walk` takes `base` from its caller and `tools/usbdesc.py` takes it from the command line, so
    the wrong one is a typo away. Three of its four stopping conditions are tested above; the
    fourth is that the walk cannot start below the image at all, because `start - base` negative
    made every bound comparison pass and every read land in the tail. Same class as a wrong load
    address producing a listing rather than an error, `CLAUDE.md`.
    """

    def test_a_negative_offset_walks_nothing(self):
        image = lab.load('h700_code')
        at = usbdesc.find_block(image, 0x9000)
        self.assertIsNotNone(at)
        # The control first: the real chain still walks under the right base.
        self.assertEqual(len(usbdesc.walk(image, 0x9000, at)), 9)
        # And a base above the start, which is the shape a mistyped one takes.
        self.assertEqual(usbdesc.walk(image, at + 2, at), [])

    def test_a_tail_that_reads_as_a_descriptor_is_not_reported(self):
        """The demonstration, on bytes chosen to be a valid descriptor at the end of an image."""
        tail = bytes([4, usbdesc.STRING, 0x41, 0x00])
        image = bytes(16) + tail
        # Read from the end, those four bytes are a well formed string descriptor, so the old walk
        # had something to report for a start four bytes below its base.
        self.assertEqual(usbdesc.Descriptor(0, usbdesc.STRING, tail).text(), 'A')
        self.assertEqual(usbdesc.walk(image, 4, 0), [])


if __name__ == '__main__':
    unittest.main()
