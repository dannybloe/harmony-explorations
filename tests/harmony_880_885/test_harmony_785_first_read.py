"""
The first Harmony 785 on the bench, unit A, read on first contact. **Measured on a unit.** No remote is opened
by this file; it reads what the bench session filed in the lab.

## What was done, in order

1. The remote was enumerated, which sends it nothing: product `0xC110`, `bcdDevice` `0x082D`, product string
   `Harmony Remote 0-4.5.0`.
2. `docs/predictions/harmony-785.md` was committed, predicting the version block and the memory from the
   platform and from the Harmony 720's images.
3. `read-identity.ts --product 0xc110`, then again with `--record h785_a`, which reads the identity block at
   `0x000110` into the lab's `units/`.
4. `read-config.ts --label h785-a`: 425953 bytes, no window retried.
5. `read-region.ts --address 0x000000 --count 0x1FE000 --anywhere`, twice. The reader reads in `0x4000`
   chunks from zero, so no transfer ends alone on `0x000104` or `0x000105`, and it stops at `0x1FE000`. Both
   reads finished with no window retried, which the 885s' first whole flash reads did not.

## What the version block said

Seven bytes, `45 09 49 01 80 2D 08`: application 4.5, hardware 0.9, flash `0x49` from manufacturer `0x01`,
architecture 8 and software type 0, skin 45, platform `0x08`. Every field the prediction named held; the
hardware version was not predicted, and fields 7 to 11 do not exist on a block of seven. The version block is
not filed, so this test cannot hold it; the application's own accessor, which the block is copied from, is
held below instead.

## What the flash settles

**The two reads are byte identical**, 2088960 bytes each. Its parts, each against a source outside it:

* **The application at `0x010000` is the Harmony 720's 4.5 with ten bytes changed**: the skin at
  `0x011C04` and `0x01A6CC`, 45 where the 720's says 44, and eight more at `0x01E6B1`, `0x01E6B8`,
  `0x01E6C7`, `0x01E80C` to `0x01E80E` and `0x01FAD9` to `0x01FADA`. What those eight are is not read here.
  So the 785's application is the 720's 4.5 with ten bytes changed; whether the two come from one source is not
  shown while eight of the ten are unexplained. The 880's and 885's images differ in the skin bytes alone,
  `reference/architectures/harmony-880-885/firmware.md`.
* **Its version accessor**, five `RETLW` at `0x011C00`, returns `0x45, 0, 45, 8, 8`: version 4.5, software
  type 0, skin 45, platform 8, architecture 8, the version block's own fields.
* **The bottom 64 KiB is a bootloader none of this project's images is**: 20882 bytes differ from the 720's
  and 18997 from the 880's. Its accessor at `0x00192E` returns `0x44, 3, 45, 0, 8`, version 4.4, software type 3
  (a bootloader), skin 45, platform 0, and its product string, at `0x006164`, is `Harmony Remote 3-4.4.2`. The
  720's bootloader is 4.2 and the 880's and 885's 4.0.
* **The configuration region from `0x020000` holds the configuration read**, byte for byte over its length.
* **The staging region from `0x1D0000` holds the running application**, its 64 KiB equal to the 64 KiB at
  `0x010000` but for the byte at offset 2.
* **The log area from `0x1E0000` holds six bytes that are not `0xFF`**, at `0x1E0000` to `0x1E0004` and
  `0x1E0007`, and the rest of it is erased.
* **The identity fields at `0x000120` are the lab's record for unit A.**

## What the configuration states

Every container check passes. Base slot 1 states architecture 8 and skin 45, and base slot 2 is
`15360, 0x1E0000, 0x1FE000`, as every Harmony 880 and 885 configuration states it. It holds a previous owner's
three devices and three activities, which are a stranger's equipment and never published.

## Sources checked before the work

The `harmony-885` and `probe-remote` skills for the read hazards and the backup procedure;
`reference/architectures/harmony-880-885/firmware.md` "The Harmony 720's images" and `usb.md`;
`reference/usb-protocol/version-block.md` for the accessor's field order.

## The second unit, B

The same reads on the second bench 785. Its version block was `45 08 49 01 80 2D 08`, A's but for the hardware
version, 0.8; its identity block is not A's. The configuration read took 518269 bytes with no window retried,
and the whole flash read twice is byte identical; a first attempt at the second read stopped after its retries
and filed nothing, and its error was not kept. A second attempt finished with no window retried.

* **Its application is A's**, the same 64 KiB at `0x010000`, and its staging region holds it but for offset 2,
  as on A.
* **Its bootloader is not A's: it is the Harmony 720's 4.2 build with the skin set to 45** in its two places,
  the version accessor's literal at `0x0019CE` and the USB descriptor's `bcdDevice` at `0x0063E6`. The other 34
  bytes it differs from the 720's image in are the identity fields from `0x000120` and the two bytes after the
  calibration word, `0x000162` and `0x000163`, the same positions an 885's backup differs from its published
  bootloader in. Its product string is `Harmony Remote 3-4.2.4`.
* **Its log area holds 118 entries of eight bytes, all the same**, `02 00 00 00 00 FF FF 05`, where A's holds
  one, and that one is the same entry. What an entry means is not read here.

## Width

Two Harmony 785s, and they carry two bootloader builds, 4.4 and 4.2, over one application. Which one
Logitech shipped first, and whether one replaced the other in the field, is not read.
"""
import hashlib
import os
import re
import unittest

import lab
from proves import proves

FLASH = ('h785_a_flash', 'h785_a_flash_2')
FLASH_END = 0x1FE000
APPLICATION = 0x010000
REGION = 0x020000
STAGING = 0x1D0000
LOG = 0x1E0000

# The Harmony 720's two images, found by file name as tests/harmony_880_885/test_harmony_885_bootloader.py
# finds them, which says why they are not registered.
H720_APPLICATION = 'H720-Firmware.bin'
H720_BOTTOM = 'H720-Safemode.bin'
H880_BOTTOM = 'H880-safemode.bin'


def by_name(*filenames):
    """The bytes of lab files found by name, all of them or a skip of the whole test."""
    paths = [lab._find(f) for f in filenames]   # noqa: SLF001, deliberately unregistered
    missing = [f for f, p in zip(filenames, paths) if not p]
    if missing:
        raise unittest.SkipTest('no %s found' % ', '.join(missing))
    out = []
    for p in paths:
        with open(p, 'rb') as fh:
            out.append(fh.read())
    return out


def unit_record(label):
    """The lab's identity record for a unit, as bytes, or None when the lab has none."""
    path = os.path.join(lab.LAB, 'units', f'{label}.txt')
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as handle:
        text = ''.join(line.split('#')[0] for line in handle)
    return bytes.fromhex(re.sub(r'[^0-9a-fA-F]', '', text))


def retlw_values(data, at, count=5):
    """The literals of `count` consecutive RETLW instructions at `at`, refusing anything that is not one."""
    values = []
    for k in range(count):
        literal, opcode = data[at + 2 * k], data[at + 2 * k + 1]
        if opcode != 0x0C:
            raise AssertionError('no RETLW at 0x%06X' % (at + 2 * k))
        values.append(literal)
    return values


class TheWholeFlash(unittest.TestCase):
    def setUp(self):
        lab.require(*FLASH)
        self.flash = lab.load('h785_a_flash')

    def test_the_two_reads_are_identical_and_end_at_the_device_window(self):
        proves(58, ['harmony-785'], ['docs/test-notes/harmony-785.md#the-first-unit-h785_a'])
        second = lab.load('h785_a_flash_2')
        self.assertEqual(len(self.flash), FLASH_END)
        self.assertEqual(hashlib.sha256(self.flash).digest(), hashlib.sha256(second).digest())

    def test_the_application_is_the_720s_build_with_ten_bytes_changed(self):
        (image,) = by_name(H720_APPLICATION)
        self.assertEqual(len(image), 0x10000)
        differ = [APPLICATION + i for i in range(len(image)) if self.flash[APPLICATION + i] != image[i]]
        self.assertEqual(differ, [0x011C04, 0x01A6CC, 0x01E6B1, 0x01E6B8, 0x01E6C7,
                                  0x01E80C, 0x01E80D, 0x01E80E, 0x01FAD9, 0x01FADA])
        # The first two are the skin: 45 here, 44 in the 720's image.
        for at in (0x011C04, 0x01A6CC):
            self.assertEqual((self.flash[at], image[at - APPLICATION]), (45, 44))

    def test_the_applications_version_accessor_says_4_5_type_0_skin_45(self):
        self.assertEqual(retlw_values(self.flash, 0x011C00), [0x45, 0, 45, 8, 8])

    def test_the_bootloader_is_neither_the_720s_nor_the_880s(self):
        h720, h880 = by_name(H720_BOTTOM, H880_BOTTOM)
        for image, expected in ((h720, 20882), (h880, 18997)):
            self.assertEqual(sum(1 for a in range(len(image)) if self.flash[a] != image[a]), expected)

    def test_the_bootloaders_accessor_says_4_4_type_3_skin_45_and_its_string_agrees(self):
        self.assertEqual(retlw_values(self.flash, 0x00192E), [0x44, 3, 45, 0, 8])
        text = 'Harmony Remote 3-4.4.2'.encode('utf-16-le')
        self.assertEqual(self.flash[0x006164:0x006164 + len(text)], text)
        self.assertEqual(self.flash[0:0x10000].count(text), 1)

    def test_the_configuration_region_holds_the_configuration_read(self):
        proves(1, ['harmony-785'], ['docs/test-notes/harmony-785.md#the-first-unit-h785_a'])
        lab.require('h785_a_config')
        config = lab.load('h785_a_config')
        self.assertEqual(len(config), 425953)
        self.assertEqual(self.flash[REGION:REGION + len(config)], config)

    def test_the_staging_region_holds_the_application_but_for_one_byte(self):
        application = self.flash[APPLICATION:APPLICATION + 0x10000]
        staged = self.flash[STAGING:STAGING + 0x10000]
        self.assertEqual([i for i in range(0x10000) if application[i] != staged[i]], [2])

    def test_the_log_area_holds_six_bytes(self):
        written = [a for a in range(LOG, FLASH_END) if self.flash[a] != 0xFF]
        self.assertEqual(written, [0x1E0000, 0x1E0001, 0x1E0002, 0x1E0003, 0x1E0004, 0x1E0007])

    def test_the_identity_fields_are_unit_as(self):
        record = unit_record('h785_a')
        if record is None:
            self.skipTest('the lab holds no record for the unit')
        self.assertEqual(self.flash[0x120:0x120 + len(record)], record)


class TheConfiguration(unittest.TestCase):
    def setUp(self):
        lab.require('h785_a_config')
        self.config = lab.load('h785_a_config')

    def test_base_slots_1_and_2_state_architecture_8_skin_45_and_the_platforms_log_area(self):
        # The pointer table from 0x0B, { u8 spare; u24 address } per slot, little endian, addresses absolute from 0x020000.
        def slot(n):
            entry = self.config[0x0B + 4 * n:0x0B + 4 * n + 4]
            self.assertEqual(entry[0], 0)
            return int.from_bytes(entry[1:], 'little') - REGION
        one, two = slot(1), slot(2)
        self.assertEqual(list(self.config[one:one + 3]), [8, 8, 45])
        self.assertEqual(self.config[two:two + 8], bytes.fromhex('003c00001e00e01f'))


class UnitB(unittest.TestCase):
    def setUp(self):
        lab.require('h785_b_flash', 'h785_b_flash_2')
        self.flash = lab.load('h785_b_flash')

    def test_the_two_reads_are_identical(self):
        proves(58, ['harmony-785'], ['docs/test-notes/harmony-785.md#the-second-unit-h785_b'])
        second = lab.load('h785_b_flash_2')
        self.assertEqual(len(self.flash), FLASH_END)
        self.assertEqual(hashlib.sha256(self.flash).digest(), hashlib.sha256(second).digest())

    def test_the_application_is_unit_as(self):
        lab.require('h785_a_flash')
        a = lab.load('h785_a_flash')
        self.assertEqual(self.flash[APPLICATION:APPLICATION + 0x10000], a[APPLICATION:APPLICATION + 0x10000])
        staged = self.flash[STAGING:STAGING + 0x10000]
        self.assertEqual([i for i in range(0x10000) if self.flash[APPLICATION + i] != staged[i]], [2])

    def test_the_bootloader_is_the_720s_with_the_skin_set_to_45(self):
        (image,) = by_name(H720_BOTTOM)
        differ = [a for a in range(len(image)) if self.flash[a] != image[a]]
        self.assertEqual(len(differ), 36)
        self.assertEqual(set(differ) - set(range(0x120, 0x140)) - {0x162, 0x163}, {0x0019CE, 0x0063E6})
        for at in (0x0019CE, 0x0063E6):
            self.assertEqual((self.flash[at], image[at]), (45, 44))
        self.assertEqual(retlw_values(self.flash, 0x0019CA), [0x42, 3, 45, 0, 8])
        # The device descriptor's vendor, product and bcdDevice around the second byte.
        self.assertEqual(self.flash[0x0063E2:0x0063EA], bytes.fromhex('6d0410c12d080404'))
        text = 'Harmony Remote 3-4.2.4'.encode('utf-16-le')
        self.assertEqual(self.flash[0x0063AE:0x0063AE + len(text)], text)

    def test_the_bootloader_is_not_unit_as(self):
        lab.require('h785_a_flash')
        a = lab.load('h785_a_flash')
        self.assertEqual(sum(1 for i in range(0x10000) if a[i] != self.flash[i]), 20884)

    def test_the_configuration_region_holds_the_configuration_read(self):
        proves(1, ['harmony-785'], ['docs/test-notes/harmony-785.md#the-second-unit-h785_b'])
        lab.require('h785_b_config')
        config = lab.load('h785_b_config')
        self.assertEqual(len(config), 518269)
        self.assertEqual(self.flash[REGION:REGION + len(config)], config)

    def test_the_log_area_holds_118_identical_entries_and_as_holds_one_of_them(self):
        log = self.flash[LOG:FLASH_END]
        entry = bytes.fromhex('0200000000ffff05')
        self.assertEqual(log[:118 * 8], entry * 118)
        self.assertEqual(set(log[118 * 8:]), {0xFF})
        lab.require('h785_a_flash')
        a = lab.load('h785_a_flash')
        self.assertEqual(a[LOG:LOG + 8], entry)

    def test_base_slots_1_and_2_state_what_unit_as_do(self):
        proves(1, ['harmony-785'], ['docs/test-notes/harmony-785.md#the-second-unit-h785_b'])
        lab.require('h785_b_config')
        config = lab.load('h785_b_config')
        def slot(n):
            entry = config[0x0B + 4 * n:0x0B + 4 * n + 4]
            self.assertEqual(entry[0], 0)
            return int.from_bytes(entry[1:], 'little') - REGION
        one, two = slot(1), slot(2)
        self.assertEqual(list(config[one:one + 3]), [8, 8, 45])
        self.assertEqual(config[two:two + 8], bytes.fromhex('003c00001e00e01f'))

    def test_the_identity_fields_are_unit_bs_and_not_unit_as(self):
        b, a = unit_record('h785_b'), unit_record('h785_a')
        if a is None or b is None:
            self.skipTest('the lab holds no records for the units')
        self.assertEqual(self.flash[0x120:0x120 + len(b)], b)
        self.assertEqual(self.flash.find(a), -1)


if __name__ == '__main__':
    unittest.main()
