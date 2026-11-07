"""
The first whole configuration written to a Harmony 885 and restarted: unit B's own, with a fresh stamp.

**Measured on a unit**, one Harmony 885, item 1.4 of `todo/todo-compile-885.md`. No remote is opened by this
file; it reads what the bench session filed in the lab.

## What was done, in order

1. `write-config.ts --config <a copy of h885_b_config> --dump h885_b_region`, the dry run, twice. The first
   stopped on a `flash chunk out of sequence` while comparing blocks, with nothing written; unit B was
   restarted by hand. The second passed: the unit check matched `h885_b`, the stamp moved 17 bytes in three
   blocks, `0x020000`, `0x050000` and `0x0B0000`, each block on the remote matched the dump, and the install
   status at data `0x100` read 0.
2. The same with `--commit` and both write flags, which stamped the file again: the status read 0; the cache
   drop, `WRITE_MISC` selector 2, was answered; each of the three blocks was erased, read back as all ones with
   its neighbours unchanged, and written; the whole configuration read back identical to the file; the status
   read 0 again; and the restart `E1 02` was sent. The writer's journals sit beside the file in the lab.
3. The remote left the bus and was listed again within five seconds.
4. `read-ram.ts --address 0x100 --count 16` once, then `read-config.ts` once (one window retried), then
   `read-region.ts` over `0x020000` to `0x1D0000` twice; the first finished, the second stopped on a sequence
   break. So every read that met a break is not before a hand restart: one came after this restart.

## What it settles

**The remote took the configuration up across the restart**: what it holds afterwards is the file byte for
byte, read by two readers, and the region read differs from the region before the write in exactly the
stamp's 17 bytes, in the three blocks written, and nowhere else.

**The restart reseeded the clock from the configuration**: the clock read back stands on the stamp's date
and minute, 11 seconds after the stamp's second, `2026-11-07 12:09:18` against `12:09:07`; the host clock
read 12:10:56 as the command started, so the clock did not keep the time it ran before. That the seeding
happens at every start is the firmware's, `tests/test_harmony_885_state.py`; this is the first time it was
seen across a write's restart. **The install status read 0** after the restart, the value at `0x100`.

**Not settled**: how long the restart takes beyond "under five seconds"; what the screen showed during it was
not recorded here; the clock's 11 seconds bound the time from the restart's reseed to the read only loosely,
since the stamp was taken before the write and the restart came at its end.

## Width

One Harmony 885, firmware 4.4. An 880 runs the same application and is not checked.
"""
import datetime
import unittest

import lab
from harmony import gspm

STAMPED = 'h885_b_written_1_4'
REGION_BASE = 0x020000
SECTOR = 0x10000


def clock_row():
    """The one row of the clock file, as (address, bytes)."""
    for line in lab.load('h885_b_clock_after_1_4').decode('utf-8').splitlines():
        if line.strip() and not line.startswith('#'):
            address, *values = line.split()
            return int(address, 16), bytes(int(v, 16) for v in values)
    raise AssertionError('the clock file holds no row')


def moment(fields):
    second, minute, hour, day, _, month, year = fields
    return datetime.datetime(2000 + year, month + 1, day + 1, hour, minute, second)


class TheConfigurationWrittenToB(unittest.TestCase):
    def setUp(self):
        lab.require(STAMPED, 'h885_b_config', 'h885_b_after_1_4_config', 'h885_b_after_1_4_region',
                    'h885_b_region')
        self.written = lab.load(STAMPED)

    def test_what_the_remote_holds_afterwards_is_the_file(self):
        self.assertEqual(len(self.written), 637127)
        self.assertEqual(lab.load('h885_b_after_1_4_config'), self.written)
        region = lab.load('h885_b_after_1_4_region')
        self.assertEqual(region[:len(self.written)], self.written)

    def test_the_region_moved_17_bytes_in_the_three_blocks_written_and_nowhere_else(self):
        before, after = lab.load('h885_b_region'), lab.load('h885_b_after_1_4_region')
        self.assertEqual(len(before), len(after))
        moved = [i for i in range(len(before)) if before[i] != after[i]]
        self.assertEqual(len(moved), 17)
        blocks = sorted({(REGION_BASE + i) & ~(SECTOR - 1) for i in moved})
        self.assertEqual(blocks, [0x020000, 0x050000, 0x0B0000])
        # The same 17 against the configuration read before, so they are the file's and not the remains'.
        old = lab.load('h885_b_config')
        self.assertEqual(sum(1 for i in range(len(old)) if old[i] != self.written[i]), 17)


class TheClockAfterTheRestart(unittest.TestCase):
    def setUp(self):
        lab.require(STAMPED, 'h885_b_clock_after_1_4')

    def test_the_install_status_reads_0_and_the_clock_stands_11_seconds_after_the_stamp(self):
        address, row = clock_row()
        self.assertEqual(address, 0x100)
        self.assertEqual(row[0], 0)
        clock = row[8:15]
        c = gspm.parse(lab.load(STAMPED))
        seeds = []
        for record in c.state_records()[:7]:
            at = c.blob_offset_of(record.address)
            seeds.append(int.from_bytes(c.blob[at:at + 2], 'little'))
        self.assertEqual(moment(seeds), datetime.datetime(2026, 11, 7, 12, 9, 7))
        self.assertEqual(moment(clock), datetime.datetime(2026, 11, 7, 12, 9, 18))
        # The weekday agrees: Saturday, counted from Sunday as 0.
        self.assertEqual(clock[4], 6)
        self.assertEqual(datetime.date(2026, 11, 7).isoweekday() % 7, 6)



class TheComposedConfigurationOnB(unittest.TestCase):
    """Item 2.1: unit A's configuration with the Sony HT composed onto it, written to unit B.

    **Measured on a unit.** The writer's first commit run stopped on a sequence break during its compare
    before the first erase, with nothing written; its block reads then gained the shared window retry and the
    same command ran through: nine sectors, `0x020000` to `0x0A0000`, each matched against B's region after 1.4
    before its erase, the whole configuration read back identical, the status 0 before and after, `E1 02`, and
    B back on the bus within ten seconds with its clock on the new stamp. Checked at the bench against the
    prediction in `packages/codec/test/sidekeysdevice.test.ts`'s header: the device list's second page shows
    Sony HT at the top left, outside the activities and inside one of them, its page shows the title and the
    eight labels where predicted, and nothing else looked wrong. What the keys send was not measured here.
    """

    def setUp(self):
        lab.require('h885_composed_2_1', 'h885_b_written_2_1', 'h885_b_after_2_1_config')

    def test_b_holds_the_composed_file_with_only_its_stamp_changed(self):
        written = lab.load('h885_b_written_2_1')
        self.assertEqual(len(written), 572238)
        self.assertEqual(lab.load('h885_b_after_2_1_config'), written)
        composed = lab.load('h885_composed_2_1')
        self.assertEqual(len(composed), len(written))
        # The stamp's fields that moved between composing and writing, and the trailer checksum.
        self.assertEqual(sum(1 for i in range(len(composed)) if composed[i] != written[i]), 6)


if __name__ == '__main__':
    unittest.main()
