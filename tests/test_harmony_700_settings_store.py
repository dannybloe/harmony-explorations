"""
What a Harmony Desktop sync does to the bench Harmony 700 when it offers no firmware, section 296.

Read either side of the sync with the remote running its 2.5 application: both firmware pages and the
staging chip, where an install would stage an image, are byte for byte what they were, and the
settings store in page 0xFF gained two records for setting 0x80, first with bit 0 clear and then set
again. The earlier sync, done while the remote was in safe mode, appended nothing, and neither did the
reinstall that repaired it.
"""
import unittest

import lab

STORE = 0xEC00          # the settings store's first block, as an offset into page 0xFF
BLOCK = 0x400


def records(page):
    """The store's header and its two byte records, setting then value, up to the first erased slot."""
    block = page[STORE:STORE + BLOCK]
    out = []
    for i in range(4, BLOCK, 2):
        if block[i:i + 2] == b'\xff\xff':
            break
        out.append((block[i], block[i + 1]))
    return block[:4], out


# Setting 0x80 on this unit before any sync of ours, as it arrived: four pairs of 0xF8 and 0xFF, then two
# of 0xFE and 0xFF. The values the 600 and the 650 held, section 282, end at 0xFE instead.
ARRIVED = [(0x80, v) for v in (0xF8, 0xFF) * 4 + (0xFE, 0xFF) * 2]


class TheSyncAppendsTwoRecordsAndTouchesNoFirmware(unittest.TestCase):

    def test_the_store_as_it_arrived_and_after_the_safe_mode_sync_and_the_repair(self):
        names = ('h700_internal_ff', 'h700_after_hd_internal_ff', 'h700_repaired_internal_ff',
                 'h700_prehd_internal_ff')
        lab.require(*names)
        for name in names:
            with self.subTest(read=name):
                header, recs = records(lab.load(name))
                self.assertEqual(header, bytes.fromhex('fcff0000'))
                self.assertEqual(recs, ARRIVED)

    def test_a_sync_on_the_running_application_appends_0xfe_then_0xff(self):
        lab.require('h700_prehd_internal_ff', 'h700_posthd_internal_ff')
        before = lab.load('h700_prehd_internal_ff')
        after = lab.load('h700_posthd_internal_ff')
        self.assertEqual(records(after)[1], ARRIVED + [(0x80, 0xFE), (0x80, 0xFF)])
        changed = [i for i in range(len(before)) if before[i] != after[i]]
        # The three bytes the two records needed, the last value being 0xFF, which is erased flash.
        self.assertEqual(changed, [STORE + 0x1C, STORE + 0x1D, STORE + 0x1E])
        # The second block stays erased, so the store did not copy.
        self.assertEqual(after[STORE + BLOCK:STORE + 2 * BLOCK], b'\xff' * BLOCK)

    def test_the_firmware_page_and_the_staging_chip_are_unchanged(self):
        lab.require('h700_prehd_internal_fe', 'h700_posthd_internal_fe', 'h700_staging_region',
                    'h700_posthd_staging_region')
        self.assertEqual(lab.load('h700_posthd_internal_fe'), lab.load('h700_prehd_internal_fe'))
        self.assertEqual(lab.load('h700_posthd_staging_region'), lab.load('h700_staging_region'))


if __name__ == '__main__':
    unittest.main()
