#!/usr/bin/env python3
"""The Harmony 515 on the cable: which model it says it is, from two independent sources, and its firmware.

Until a unit arrived, nothing about the Harmony 515 had been measured. The reference placed it on the
5xx platform by `MODELS_BY_SKIN`, which names skin 67 as Logitech's client does, and took its firmware
version, 3.4.0, from the forum comparison table. One unit, read only, settles what is below.

## What was measured, and how

The unit was read on 3 November 2026 by this library and nothing else: enumeration through `ioreg`,
`GET_VERSION` through `read-identity.ts`, a configuration read through `read-config.ts`, and the two
64 KiB blocks of external flash below the configuration through `read-region.ts --anywhere`. Nothing
was written, erased or reset. The unit's record is `docs/test-notes/harmony-515.md`.

| route | what it states |
|---|---|
| the USB device descriptor, read off the live unit | product id `0xC111`, `bcdDevice` `0x0943`, product string `Harmony Remote 0-3.4.0` |
| `GET_VERSION`, the seven fields without the reply byte, which was not kept | `34 10 12 ff 90 43 09`: firmware 3.4, hardware 1.0, flash `FF:12`, architecture 9 with software type 0, skin `0x43`, platform `0x09` |
| the device descriptor inside the application image read at `0x810000` | `bcdDevice` `0x0943`, the same product string |
| base slot 1 of the configuration read off the unit | `09 09 43 0d 00 00 00`, architecture 9 and a version word whose low byte is `0x43` |

**Skin 67 from two independent sources.** The first three rows all come out of one firmware build:
the live descriptor and the image's are the same table, at rest and served, and whether the version
reply's skin comes from a separate field of the 515's image has not been read (on the Harmony 525 it
does). The configuration's record is the independent end, written by Logitech's compiler, a different
program on a different machine. Who compiled this configuration, and for which remote, is not known;
the unit is second hand. A posted 515 configuration from another owner, kkong42's issue 35, states
skin 67 in its EZHex header too, which this test does not read.

**The `bcdDevice` follows the plain binary rule of the 525's generation**, protocol in the high byte
and skin in the low byte (`tests/usb_protocol/test_usbdesc.py`, `TestBcdDeviceCarriesTheSkin`), which the 880, 885
and 525 already established. The 515 adds a fourth model to it and no new evidence for the rule
itself: the skin is read with the rule and the configuration agrees.

**The version block's fields read as on the 525.** Firmware 3.4 is what the forum table states as the
newest it knows for skin 67, so 3.4 is now measured on a unit; whether a later build exists is not
known. Hardware 1.0 is the board revision kkong42's issue 35 states for the same model; the 525
reports 2.5.

## The firmware

**Both stored images on the unit are byte for byte the ones kkong42 posted for a Harmony 515**, the
application at `0x810000` and the safe mode image at `0x800000`, 65536 of 65536 bytes each. Those had
been the only 515 firmware here, from one stranger's upload; they are now confirmed on a second unit.

**The application is a different build from the 525's**, which its own descriptor says: `Harmony
Remote 0-3.4.0` against the 525's `0-3.0.0`. A byte count does not show it: 27249 of the 65536 bytes
agree at the same offsets, but 17426 of those are erased flash after the embedded container, and an
aligned count cannot see code that has moved, so it says nothing either way about how close the two
builds are. That count is not asserted here.

**The application image carries a safe mode container**, at offset `0x8000`, flash `0x818000`, as the
525's does. Its base slot 1 is `09 09 43 0c 00 00 00`, a full record naming skin 67, the unit's own,
where the 525's is the three bytes `09 09 12` and names skin 18, the 520. Its build timestamp is
2008-03-13, before 2009, so its `0x0C` high byte agrees with the header record page's dating of that
byte. **What decides the skin a safe mode container names is not established**: 18 and 67 are each
the lower skin of their regional pair in the remotes index, so "the remote's own model" and "the
lower of the pair" both fit, and a 510 or 520 container would separate them.

## What this does not settle

The 515's face, keys, screen, flash size beyond the identity `FF:12`, and its configuration beyond the
container checks. The device maximum of 5 in the skin table stays the forum's. Whether the 510, skin
68, behaves the same is not checked. The 515's stored safe mode image states `Harmony Remote
4-3.4.0` in its descriptor where the 525 in safe mode was measured enumerating as `Harmony Safe Mode!`;
what a 515 in safe mode enumerates as is not measured, and safe mode must not be entered to find out.

## Sources checked first

The reference (`reference/architectures/harmony-5xx/` and `reference/config-format/header-records.md`),
the archive's sections 76 and 195 for the 525's measurement and the `bcdDevice` rule, and kkong42's
issue 35 dump with its lab note. Logitech's client was not read for this: the skin's name is already
its statement through `models.ts`, and nothing here depends on how the client drives the remote.

## Review

Two reviewers read this before it landed. One re-measured blind and agreed on every number. The other
audited the prose and corrected four claims of the first draft: that the skin came from four
independent fields, that 67 separates the two `bcdDevice` encodings where 22 could not (0x0916 is valid
BCD too, `reference/usb-protocol/transport.md`), that the aligned byte count showed a separate build, and
that the safe mode container names its own model "as the Harmony One's does".
"""
import unittest

import lab
from harmony import gspm, usbdesc

# Read off the unit, not out of any file: these are the hardware half of the closure.
MEASURED_BCD_DEVICE = 0x0943
MEASURED_PRODUCT_STRING = 'Harmony Remote 0-3.4.0'
MEASURED_VERSION_FIELDS = bytes.fromhex('34 10 12 ff 90 43 09')

SKIN = 67


def slot_bytes(data: bytes, slot: int) -> bytes:
    """A base slot's bytes, taken as the gap to the next pointer, the way the reference states it."""
    container = gspm.parse(data)
    addresses = {s.slot: s.address for s in container.sections}
    start = container.blob_offset + addresses[slot] - container.flash_base
    end = container.blob_offset + addresses[slot + 1] - container.flash_base
    return data[start:end]


class TheFirmwareAndTheConfigurationBothStateSkin67(unittest.TestCase):

    def test_the_measured_descriptor_reads_as_skin_67_under_the_plain_rule(self):
        self.assertEqual(MEASURED_BCD_DEVICE >> 8, 9, 'the protocol, in the high byte')
        self.assertEqual(usbdesc.skin_id(MEASURED_BCD_DEVICE), SKIN)

    def test_the_version_fields_state_the_same_skin_and_firmware_3_4(self):
        fields = MEASURED_VERSION_FIELDS
        self.assertEqual((fields[0] >> 4, fields[0] & 0xF), (3, 4), 'firmware 3.4')
        self.assertEqual((fields[1] >> 4, fields[1] & 0xF), (1, 0), 'hardware 1.0')
        self.assertEqual((fields[4] >> 4, fields[4] & 0xF), (9, 0), 'architecture 9, application')
        self.assertEqual(fields[5], SKIN)
        self.assertEqual(fields[6], 0x09, 'platform byte, as on the Harmony 525')

    def test_the_firmware_image_carries_the_descriptor_the_unit_served(self):
        image = lab.load('h515_application_firmware')
        found = usbdesc.summary(image, 0)
        self.assertIsNotNone(found)
        self.assertEqual(found['bcd_device'], MEASURED_BCD_DEVICE)
        self.assertEqual(found['skin'], SKIN)
        self.assertIn(MEASURED_PRODUCT_STRING, found['strings'])

    def test_the_configuration_read_off_it_states_the_same_skin(self):
        """The independent end: written by Logitech's compiler, not by the remote's firmware."""
        config = lab.load('h515_onyiaic_asfound_config')
        container = gspm.parse(config)
        self.assertEqual(container.architecture, 9)
        self.assertEqual(container.version_word, 0x0D43)
        self.assertEqual(container.version_word & 0xFF, SKIN)
        self.assertEqual(slot_bytes(config, 1), bytes.fromhex('09 09 43 0d 00 00 00'))

    def test_the_same_two_readers_give_22_on_the_harmony_525(self):
        """The calibration: the image's descriptor and a configuration's record, on the other model."""
        lab.require('h525_code', 'h525_friend_asfound_config')
        self.assertEqual(usbdesc.summary(lab.load('h525_code'), 0x0000)['skin'], 22)
        self.assertEqual(gspm.parse(lab.load('h525_friend_asfound_config')).version_word & 0xFF, 22)


class TheUnitRunsTheContributedFirmware(unittest.TestCase):

    def test_both_stored_images_equal_the_two_kkong42_posted(self):
        lab.require('h515_application_firmware', 'h515_contributed_application',
                    'h515_safemode_firmware', 'h515_contributed_safemode')
        for ours, theirs in (('h515_application_firmware', 'h515_contributed_application'),
                             ('h515_safemode_firmware', 'h515_contributed_safemode')):
            mine, posted = lab.load(ours), lab.load(theirs)
            self.assertEqual(len(mine), 65536)
            self.assertEqual(mine, posted, ours)

    def test_its_application_states_firmware_3_4_where_the_525s_states_3_0(self):
        lab.require('h515_application_firmware', 'h525_external_firmware')
        mine = usbdesc.summary(lab.load('h515_application_firmware'), 0)['strings']
        theirs = usbdesc.summary(lab.load('h525_external_firmware'), 0)['strings']
        self.assertIn('Harmony Remote 0-3.4.0', mine)
        self.assertIn('Harmony Remote 0-3.0.0', theirs)
        self.assertNotIn('Harmony Remote 0-3.0.0', mine)

    def test_the_safe_mode_container_inside_states_skin_67_in_a_full_record(self):
        """Where the 525's states skin 18 in three bytes; what decides the skin is not established."""
        lab.require('h515_application_firmware', 'h525_external_firmware')
        image = lab.load('h515_application_firmware')
        container = gspm.parse(image)
        self.assertEqual(container.blob_offset, 0x8000)
        self.assertEqual(container.version_word, 0x0C00 | SKIN)
        self.assertEqual(container.built_at.year, 2008)
        self.assertEqual(slot_bytes(image, 1), bytes([9, 9, SKIN, 0x0C, 0, 0, 0]))
        self.assertEqual(slot_bytes(lab.load('h525_external_firmware'), 1), bytes([9, 9, 18]))


if __name__ == '__main__':
    unittest.main()
