"""
Bench unit A's whole flash before its first write, and the one block written back unchanged.

**Measured on a unit**, one Harmony 885. No remote is opened by this
file; it reads what the bench session filed in the lab.

## What was done, in order

1. `rehearse-block.ts --dump h885_a_region --block 0x0c0000`, the dry run, first with the other bench unit on
   the cable, which the unit check refused (its identity block is not unit A's), then with unit A, which it
   passed. A dry run reads only.
2. `packages/corpus/bin/read-region.ts --address 0x000000 --count 0x1FE000 --anywhere`, twice. The reader
   reads in `0x4000` chunks from zero, so no transfer ends alone on `0x000104` or `0x000105`, and it stops at
   `0x1FE000`, where the device window starts. The first read finished. The second stopped twice on a
   `flash chunk out of sequence`, once late in the run and once early, and filed nothing; after the unit was
   restarted by hand it finished with no break. The same as unit B's region reads on 5 November 2026: breaks
   before a hand restart and none after, then; after the restart that ended unit B's first whole configuration write breaks came back,
   `tests/harmony_880_885/test_harmony_885_first_config_write.py`. The cause is open; the console output was not filed.
3. `rehearse-block.ts ... --commit` with both write flags: the unit check passed, the block read off the remote
   matched the dump, the neighbours `0x0B0000` and `0x0D0000` were read, `0x0C0000` was erased and read back
   as all ones, the neighbours read again unchanged, 21 transfers of at most 3150 bytes wrote the block, and
   it read back identical to the dump. The script prints no times, so how long the erase took is not
   measured. The remote's screen showed nothing during the write.
4. `read-config.ts` once: 568020 bytes, no window retried.
5. Unplugged and used: it woke, ran an activity and answered keys as before.

## What the backup settles

**The two reads are byte identical**, 2088960 bytes each, so the backup is a stable copy and not one read's
accident. **Its parts agree with three independent sources**: the application 64 KiB at `0x010000` is
Logitech's published 885 image (`arch8_code_885`) byte for byte; the bootloader 64 KiB at `0x000000` is the
published bootloader (`arch8_boot_885`) except 33 bytes, `0x000120` to `0x00013F` but `0x000137`, and
`0x000162` to `0x000163`: 31 bytes of the identity block's two per unit fields (`0x000137` happens to match)
and the two bytes after the battery calibration word at `0x000160`, whose own two bytes, `04 00`, match. Whether
`0x000162` is part of the calibration or a field of its own is not read here. The test checks positions only; the configuration region `0x020000` to `0x1D0000` is
the earlier region read `h885_a_region`. And the identity fields at `0x000120` are unit A's lab record and not
unit B's.

**Above the region**: the staging region from `0x1D0000` holds 48129 bytes that are not `0xFF`, and the
log area from `0x1E0000` to the device window is erased throughout. What the staging bytes are is not read
here.

## What the write settles

**The configuration did not move**: the read after the write is byte identical to `h885_a_config`, read on 5
November 2026.

**The erase measured on the part**: the bytes the block holds run from `0x0C0000` itself to `0x0C542C`, the
byte before the block, `0x0BFFFF`, is not `0xFF`, and neither is the byte after it, `0x0D0000`. After the
erase the block read as all ones and both neighbours read unchanged, by the rehearsal's own compares, which
were printed and not filed, so the test notes hold them and the tests below hold only the data around them. So one erase at `0x0C0000` removed at
least `0x0C0000` to `0x0C542C` and nothing below or above the 64 KiB block: the sector starts on that
address and is no larger than 64 KiB. **A 32 KiB sector is not excluded**, since everything the block held
sat in its lower half; a rehearsal on a block whose upper half holds data would decide it. Every source,
Logitech's classic client and concordance, states 64 KiB, `tests/logitech/test_host_client.py`. Whatever the size, a
later write cannot pass silently over a sector left unerased, since the write is read back and compared.

## Sources checked before the work

`recovering-a-remote`, section "The Harmony 880 and 885", which asks for the whole flash before a first
write; `reference/architectures/harmony-880-885/memory.md` for the map; `tests/harmony_880_885/test_harmony_885_bench_reads.py`
for the region and the remains; `tests/harmony_880_885/test_harmony_885_reads.py` for the read hazards; and the classic
client's erase geometry through `tests/logitech/test_host_client.py`.

## Width

One Harmony 885. An 880 runs the same application and is not checked; unit B's backup is its own step.
"""
import hashlib
import os
import re
import unittest

import lab

FLASH = ('h885_a_flash', 'h885_a_flash_2')
FLASH_END = 0x1FE000
APPLICATION = 0x010000
REGION = 0x020000
STAGING = 0x1D0000
LOG = 0x1E0000
BLOCK = 0x0C0000
SECTOR = 0x10000


def non_ff(data, start, end):
    """Absolute addresses of every byte in [start, end) that is not 0xFF."""
    return [a for a in range(start, end) if data[a] != 0xFF]


def unit_record(label):
    """The lab's identity record for a unit, as bytes, or None when the lab has none."""
    path = os.path.join(lab.LAB, 'units', f'{label}.txt')
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as handle:
        text = ''.join(line.split('#')[0] for line in handle)
    return bytes.fromhex(re.sub(r'[^0-9a-fA-F]', '', text))


class TheWholeFlashBackup(unittest.TestCase):
    def setUp(self):
        lab.require(*FLASH)
        self.flash = lab.load('h885_a_flash')

    def test_the_two_reads_are_identical_and_end_at_the_device_window(self):
        second = lab.load('h885_a_flash_2')
        self.assertEqual(len(self.flash), FLASH_END)
        self.assertEqual(hashlib.sha256(self.flash).digest(), hashlib.sha256(second).digest())

    def test_the_application_is_the_published_885_image(self):
        lab.require('arch8_code_885')
        image = lab.load('arch8_code_885')
        self.assertEqual(len(image), 0x10000)
        self.assertEqual(self.flash[APPLICATION:APPLICATION + len(image)], image)

    def test_the_bootloader_differs_from_the_published_one_only_at_0x120_to_0x13f_and_0x162_to_0x163(self):
        lab.require('arch8_boot_885')
        image = lab.load('arch8_boot_885')
        differ = [a for a in range(len(image)) if self.flash[a] != image[a]]
        self.assertEqual(len(differ), 33)
        self.assertEqual(set(differ) - set(range(0x120, 0x140)) - {0x162, 0x163}, set())
        # The control: the published image is not simply the backup with those bytes blank.
        self.assertNotEqual(self.flash[0x120:0x140], image[0x120:0x140])

    def test_the_configuration_region_is_the_earlier_region_read(self):
        lab.require('h885_a_region')
        self.assertEqual(self.flash[REGION:STAGING], lab.load('h885_a_region'))

    def test_the_identity_fields_are_unit_as_and_not_unit_bs(self):
        a, b = unit_record('h885_a'), unit_record('h885_b')
        if a is None or b is None:
            self.skipTest('the lab holds no unit records')
        self.assertEqual(self.flash[0x120:0x120 + len(a)], a)
        self.assertEqual(self.flash.find(b), -1)

    def test_the_staging_region_holds_48129_bytes_and_the_log_area_is_erased(self):
        self.assertEqual(len(non_ff(self.flash, STAGING, LOG)), 48129)
        self.assertEqual(non_ff(self.flash, LOG, FLASH_END), [])


class TheBlockWrittenBack(unittest.TestCase):
    def setUp(self):
        lab.require('h885_a_flash')
        self.flash = lab.load('h885_a_flash')

    def test_the_configuration_read_after_the_write_is_the_one_read_before(self):
        lab.require('h885_a_config', 'h885_a_after_block_config')
        after = lab.load('h885_a_after_block_config')
        self.assertEqual(len(after), 568020)
        self.assertEqual(after, lab.load('h885_a_config'))

    def test_the_block_and_the_bytes_either_side_of_it_held_data_before_the_erase(self):
        # What the erase did to the neighbours is the rehearsal's own before and after compare, printed and
        # not filed, so it is the test notes' record; this holds only the precondition that made the compare
        # a bound: data directly on both sides.
        held = non_ff(self.flash, BLOCK, BLOCK + SECTOR)
        self.assertEqual((held[0], held[-1], len(held)), (BLOCK, 0x0C542C, 21433))
        self.assertNotEqual(self.flash[BLOCK - 1], 0xFF)
        self.assertNotEqual(self.flash[BLOCK + SECTOR], 0xFF)

    def test_everything_the_block_held_sits_in_its_lower_half_so_32_kib_is_not_excluded(self):
        self.assertEqual(non_ff(self.flash, BLOCK + SECTOR // 2, BLOCK + SECTOR), [])



class UnitB(unittest.TestCase):
    """Unit B: the same backup and one block written back, at `0x0D0000`.

    **Why another block than A's.** B's configuration ends at `0x0BB8C7`, so the block under `0x0C0000` is
    live configuration on B; at `0x0D0000` both neighbours hold only remains or nothing. B's second flash read
    met two sequence breaks and filed nothing until B was restarted by hand, as A's did, and then finished.
    The write followed the same order as A's: the dry run, both reads compared, the commit, the configuration
    read once, the remote used.
    """

    def setUp(self):
        lab.require('h885_b_flash', 'h885_b_flash_2')
        self.flash = lab.load('h885_b_flash')

    def test_the_two_reads_are_identical(self):
        self.assertEqual(len(self.flash), FLASH_END)
        self.assertEqual(self.flash, lab.load('h885_b_flash_2'))

    def test_the_application_is_the_published_image_and_the_region_the_earlier_read(self):
        lab.require('arch8_code_885', 'h885_b_region')
        self.assertEqual(self.flash[APPLICATION:REGION], lab.load('arch8_code_885'))
        self.assertEqual(self.flash[REGION:STAGING], lab.load('h885_b_region'))

    def test_the_bootloader_differs_only_at_0x120_to_0x13f_and_0x162_to_0x163(self):
        lab.require('arch8_boot_885')
        image = lab.load('arch8_boot_885')
        differ = [a for a in range(len(image)) if self.flash[a] != image[a]]
        self.assertEqual(len(differ), 34)
        self.assertEqual(set(differ) - set(range(0x120, 0x140)) - {0x162, 0x163}, set())

    def test_the_identity_fields_are_unit_bs(self):
        b = unit_record('h885_b')
        if b is None:
            self.skipTest('the lab holds no unit records')
        self.assertEqual(self.flash[0x120:0x120 + len(b)], b)

    def test_no_neighbour_of_its_block_is_live_configuration(self):
        lab.require('h885_b_config')
        end = REGION + len(lab.load('h885_b_config'))
        self.assertEqual(end, 0x0BB8C7)
        block = 0x0D0000
        self.assertGreaterEqual(block - SECTOR, end)
        held = non_ff(self.flash, block, block + SECTOR)
        self.assertEqual((held[0], held[-1], len(held)), (block, 0x0D00AA, 171))

    def test_the_configuration_read_after_the_write_is_the_one_read_before(self):
        lab.require('h885_b_config', 'h885_b_after_block_config')
        self.assertEqual(lab.load('h885_b_after_block_config'), lab.load('h885_b_config'))


if __name__ == '__main__':
    unittest.main()
