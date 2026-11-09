"""
The two bench Harmony 885s read over USB: each configuration whole, the flash after it, and a clock that runs.

**Measured on a unit**, two units, on 5 November 2026, items 2.1 and 2.3 of `todo/todo-prepare-885.md`. No
remote is opened by this file; it reads what the bench session filed in the lab. Every command sent in that
session was a read: `read-identity.ts --record` first on each unit (the identity block matched the unit's
record, which is what says which unit was on the cable), then `read-config.ts` twice, `read-region.ts` twice
over `0x020000` to `0x1D0000`, and on unit A `read-ram.ts --address 0x108 --count 8` twice. Both units
report the version block `44 21 49 01 80 11 08`, which the reads' own records in the lab state and nothing
here asserts. The region read stops at `0x1D0000`, the staging source, short of the device window at
`0x1FE000` that `tests/harmony_880_885/test_harmony_885_reads.py` describes, and by the tool's own chunking every transfer
starts on a 16 KiB boundary, so none ends alone at `0x000104` or `0x000105`; that is the tool's design and
not asserted here.

**Sources checked before the work**: `reference/architectures/harmony-880-885/memory.md`, which listed what a
unit holds past its configuration, and what sits between a configuration and the log area, as not checked;
`tests/harmony_880_885/test_harmony_885_start_check.py`, the start check as the firmware performs it, whose simulation
`CheckAsRead` is reused here unchanged, its constants decoded out of the 885 image; section 215 (the spare
Harmony One's flash keeping 408034 bytes of an earlier configuration) and section 270 with
`tests/harmony_5xx/test_harmony_525_region.py` (the same on a Harmony 525); `tests/harmony_880_885/test_harmony_885_state.py` and
`reference/config-format/state.md` for the clock's seven variables at `0x108`; and the archive's section 138.
**Logitech's client, decision 2**: the classic client's constants for this platform (`classic_protocol8`, mined
into the lab's `PROTOCOL-CONSTANTS.md`) name the bootloader, the identity block at `0x000110` and the staging
address `0x1D0000`, and **no** user configuration base; `0x020000` is concordance's and the firmware's own
base selector's, `0x191C2`. The same client recalculates and sets the clock after a write, item 1.5; how it
reads the clock was not re-read here. MyHarmony does not serve this platform.

## The configurations

Unit A's configuration is 568020 bytes and unit B's 637127, each read twice and byte identical, each the length
its own header states (the reader stops at the stated end and checks the end marker and the trailer
checksum). **Two independent routes to the same bytes**: the configuration reader reads by the stated length,
the region reader a fixed range from `0x020000`, and each configuration is exactly the first bytes of its
unit's region. Both state the 885's architecture record, `08 08 11 0d`.

**Both pass the start check as the firmware performs it**, run on the region as it sits in flash at
`0x020000`, so on the bytes the firmware would read and not on a file trimmed for it: `TPTP` at the base,
`WLWL` at `+0x5F`, `DKDK` at the end the header states, and the XOR checksum with seeds `0x21` and `0x43`. The
end the check finds is the reader's length minus four plus the base; both read the header's own end field, so
that agreement is a consistency check, and the independent routes are the region against the configuration
read and the library's checksum, which slices from the length. The controls: one flipped bit inside the configuration fails the checksum, and one flipped bit in the bytes past
it passes, since the check reads nothing there. What either unit showed on its screen at start was not
recorded.

## The flash past each configuration

Unit A's configuration ends at `0x0AAAD4` and unit B's at `0x0BB8C7`. **Up to the next 64 KiB boundary
everything is erased**, and from that boundary, `0x0B0000` on A and `0x0C0000` on B, the bytes are not: A holds
86601 bytes that are not `0xFF` past its configuration and B 11743, the last of them at `0x0D00AA` on both,
and erased from there to `0x1D0000`. Erased up to the boundary and not beyond it is the shape item 1.3's reading
predicts for a write that erased only the sectors it needed, one erase removing one 64 KiB sector by every
source above `0x010000`. **The data alone cannot tell that from a 32 KiB half**: both configurations end in
the upper half of their sector, so the next 32 KiB and 64 KiB boundaries coincide; a 4 KiB sector is excluded,
since it would have left A's remains from `0x0AB000`.

**What sits there is the remains of earlier configurations**, inferred from three things and not decoded:
no `TPTP` cookie anywhere past either configuration, so every one of them is a tail whose start was
overwritten; every stretch of remains, taken as the bytes between gaps of at least 256 erased bytes, ends with
the end marker `DKDK`, four of four: each unit's predecessor (A's at `0x0C5429`, B's at `0x0C4590`) and the
171 bytes at `0x0D0000`, identical on both units and ending in `DKDK` at `0x0D00A7`, an older configuration
still, longer than the one after it. Those 171 bytes carry the same two byte word before the marker on both
units, the place a trailer checksum sits, and the same end, so both units once held a configuration ending
there with that checksum; which, and whether it is a factory one, is not checked. A reviewer's search found its
last sixty bytes in no other lab file than these four regions; not asserted here. **A region read therefore carries configurations
nobody meant to hand over**, as section 215 said of the Harmony One, which is why these reads stay in the lab.

## The clock

`READ_MISC` selector 7 at `0x108`, eight bytes, two reads seconds apart on unit A:
`0a 25 0b 17 06 09 14 01` and `0e 25 0b 17 06 09 14 01`. In the order of the configuration's records 0 to 6:
second 10 then 14, minute 37, hour 11, day 23 (the 24th, counted from 0), weekday 6 (Saturday, from Sunday),
month 9 (October, from 0), year 20. **Two controls, each independent of the layout being assumed**: the second
moved between the reads and nothing else did, so the clock runs; and the stored weekday agrees with the
stored date by the calendar, 24 October 2020 a Saturday, which a misaligned read of these bytes does not
give: a shift of one byte either way puts a field out of its range, an hour of 37 or a weekday of 9, asserted
below. Byte 7 at `0x10F` is variable 7, not the clock.

**Against the configuration's seeds**: unit A's records 0 to 6 state 2020-10-24 09:48:37, the date read and
a time 1 h 48 min 33 s before the first read. Every start reseeds the clock from those records on this
platform, `tests/harmony_880_885/test_harmony_885_state.py`, and this reading is consistent with that, the clock being the
seed plus a little under two hours; but it is a one sided check, which only a clock earlier than the seed or
on another date could have failed. **It does not settle** whether anything after the loader restores a
running clock, since when unit A last started is not known. The counting from 0 of the day and the month is
checked against the calendar too: counted from 1 they give no Saturday.

The clock is read one byte per exchange, `read-ram.ts` looping over the count, so each row is eight
exchanges in turn and not a snapshot.

## Unit B's configuration holds favourite channels

Found while registering the reads, because the golden vectors count number sender records: **unit B's
configuration holds two number sender records, base slot 16 opening with a count of 2**, where every 880, 885
and 880 Pro container of `tests/harmony_880_885/test_harmony_885_number_sender.py`'s sixteen holds none and the Harmony 720's
one. Both records have flags 0 and base 0 and three identical digit tables; the first asks for at least 3
digits, the second for none. **Forty three action lists hand them a number**, every one the 720's shape, a
constant loaded with `0x7A` and handed over with `0x1F` band `0xF3`: nineteen to record 0, values 41 to 724, and
twenty four to record 1, values 1 to 187, no value repeated within a record. No other band from `0xF3` to `0xF6`
occurs. Unit A's configuration holds none. So the reference's "no 880 or 885 configuration read holds a
favourite channel"<!--superseded--> was true of the contributed configurations and is not of the configurations read here;
that these lists are reached by keys, as favourite channels are, is inferred from the 720's reading and not
checked, and what each digit's list sends is not compared with the 720's.

## What was seen and is not a fact about the remote

From the session's console output, which was not filed, so nothing here can assert it: on unit B, before it
was restarted by hand, three of four reads met a `flash chunk out of sequence` a few KiB
into a window; the configuration reader asks for the window again and finished, the region reader has no
second ask and stopped. After the restart, two region reads, 3.5 MB, met none; unit A, on the same cable in the
same session, met none in four reads. The cause is open, the unit's state before the restart or the host at
that moment, and nothing here asserts it. `docs/test-notes/harmony-885.md` records it.

## Width

Measured on two Harmony 885s; an 880 is not checked. The facts land on the 885's own pages and the platform
page says they were measured on 885s only.

## Reviewers

Recorded in the commit that landed this file: a blind re-measurement and a prose audit, per the `finding`
skill.
"""
import datetime
import unittest

import lab
from harmony import gspm
from .test_harmony_885_start_check import USER_BASE, CheckAsRead, Flash, application

UNITS = {
    'a': ('h885_a_config', 'h885_a_config_2', 'h885_a_region', 'h885_a_region_2'),
    'b': ('h885_b_config', 'h885_b_config_2', 'h885_b_region', 'h885_b_region_2'),
}
ALL = tuple(name for names in UNITS.values() for name in names)
CLOCK = 'h885_a_clock_ram'
REGION_END = 0x1D0000
SECTOR = 0x10000


def reads(unit):
    """The unit's two configuration reads and two region reads."""
    return [lab.load(name) for name in UNITS[unit]]


def clock_reads():
    """The eight byte rows of the clock file, comment lines dropped."""
    rows = []
    for line in lab.load(CLOCK).decode('utf-8').splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        address, *values = line.split()
        rows.append((int(address, 16), bytes(int(v, 16) for v in values)))
    return rows


def non_ff(data, start):
    """Absolute addresses of every byte that is not 0xFF, `data` sitting at `start`."""
    return [start + i for i, b in enumerate(data) if b != 0xFF]


def every(data, needle, start):
    """Absolute addresses of every occurrence of `needle`."""
    out, at = [], data.find(needle)
    while at >= 0:
        out.append(start + at)
        at = data.find(needle, at + 1)
    return out


class TheConfigurationReads(unittest.TestCase):
    def setUp(self):
        lab.require(*ALL)

    def test_each_units_two_reads_are_identical_and_568020_and_637127_bytes_long(self):
        lengths = {}
        for unit in UNITS:
            config, config_2, _, _ = reads(unit)
            self.assertEqual(config, config_2, unit)
            lengths[unit] = len(config)
        self.assertEqual(lengths, {'a': 568020, 'b': 637127})

    def test_each_is_the_length_its_header_states_and_its_regions_first_bytes(self):
        for unit in UNITS:
            config, _, region, _ = reads(unit)
            with self.subTest(unit):
                # The header's end address, a u24 at +4, is where `DKDK` starts: four bytes before the
                # end of the read. And the region, read by a fixed range, opens with exactly these bytes.
                end = int.from_bytes(config[4:7], 'little')
                self.assertEqual(end + 4 - USER_BASE, len(config))
                self.assertEqual(config[-4:], b'DKDK')
                self.assertEqual(region[:len(config)], config)

    def test_both_are_885_configurations(self):
        for unit in UNITS:
            config = reads(unit)[0]
            with self.subTest(unit):
                c = gspm.parse(config)
                self.assertEqual(c.architecture, 8)
                record = int.from_bytes(config[0x10:0x13], 'little') - USER_BASE
                self.assertEqual(config[record:record + 4], bytes([0x08, 0x08, 0x11, 0x0D]))
                self.assertEqual(sorted(k for k, v in c.checks.items() if not v), [])


class TheStartCheckPassesOnTheFlashAsRead(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        lab.require(*ALL)
        cls.check = CheckAsRead(application())
        cls.regions = {unit: reads(unit)[2] for unit in UNITS}
        cls.configs = {unit: reads(unit)[0] for unit in UNITS}

    def verdict(self, unit, offset=None):
        region = bytearray(self.regions[unit])
        if offset is not None:
            region[offset] ^= 0x01
        return self.check(Flash().place(USER_BASE, region), USER_BASE)

    def test_both_pass_and_the_check_finds_the_end_the_reader_found(self):
        for unit in UNITS:
            with self.subTest(unit):
                verdict, end = self.verdict(unit)
                self.assertEqual(verdict, 'pass')
                self.assertEqual(end, USER_BASE + len(self.configs[unit]) - 4)
                # The library's checksum, which slices from the length rather than from the stated end.
                config = self.configs[unit]
                self.assertEqual(gspm.trailer_checksum(config), int.from_bytes(config[-6:-4], 'little'))

    def test_a_flipped_bit_inside_fails_and_one_past_the_configuration_passes(self):
        for unit in UNITS:
            length = len(self.configs[unit])
            with self.subTest(unit):
                self.assertEqual(self.verdict(unit, 0x1000)[0], 'checksum')
                self.assertEqual(self.verdict(unit, length + 0x100)[0], 'pass')


class TheFlashPastTheConfiguration(unittest.TestCase):
    def setUp(self):
        lab.require(*ALL)

    def test_each_units_two_region_reads_are_identical_and_reach_0x1D0000(self):
        for unit in UNITS:
            _, _, region, region_2 = reads(unit)
            with self.subTest(unit):
                self.assertEqual(region, region_2)
                self.assertEqual(USER_BASE + len(region), REGION_END)

    def test_erased_to_the_next_64_KiB_boundary_then_86601_and_11743_bytes_to_0x0D00AA(self):
        found = {}
        for unit in UNITS:
            config, _, region, _ = reads(unit)
            end = USER_BASE + len(config)
            past = non_ff(region[len(config):], end)
            boundary = (end + SECTOR - 1) // SECTOR * SECTOR
            found[unit] = (hex(end), len(past), hex(past[0]), hex(past[-1]), hex(boundary))
        self.assertEqual(found, {
            'a': ('0xaaad4', 86601, '0xb0000', '0xd00aa', '0xb0000'),
            'b': ('0xbb8c7', 11743, '0xc0000', '0xd00aa', '0xc0000'),
        })

    def test_no_cookie_past_either_configuration_and_the_end_markers_and_last_bytes_are_these(self):
        found = {}
        for unit in UNITS:
            config, _, region, _ = reads(unit)
            past = region[len(config):]
            start = USER_BASE + len(config)
            # The last byte that is not 0xFF in each 64 KiB block holding any, and the end markers.
            lasts = {}
            for address in non_ff(past, start):
                lasts[address // SECTOR * SECTOR] = address
            found[unit] = (every(past, b'TPTP', start), [hex(a) for a in every(past, b'DKDK', start)],
                           {hex(block): hex(last) for block, last in lasts.items()})
        self.assertEqual(found, {
            'a': ([], ['0xc5429', '0xd00a7'], {'0xb0000': '0xbffff', '0xc0000': '0xc542c', '0xd0000': '0xd00aa'}),
            'b': ([], ['0xc4590', '0xd00a7'], {'0xc0000': '0xc4593', '0xd0000': '0xd00aa'}),
        })

    def test_every_stretch_of_remains_ends_in_the_end_marker(self):
        # A stretch is the bytes between gaps of at least 256 erased bytes, which keeps the 539 erased bytes
        # scattered inside A's 0x0B0000 block within its stretch, the largest such gap there being smaller.
        ends = {}
        for unit in UNITS:
            config, _, region, _ = reads(unit)
            addresses = non_ff(region[len(config):], USER_BASE + len(config))
            stretches, start = [], addresses[0]
            for before, after in zip(addresses, addresses[1:]):
                if after - before > 256:
                    stretches.append((start, before))
                    start = after
            stretches.append((start, addresses[-1]))
            ends[unit] = [(hex(s), hex(e), bytes(region[e - 3 - USER_BASE:e + 1 - USER_BASE])) for s, e in stretches]
        self.assertEqual(ends, {
            'a': [('0xb0000', '0xc542c', b'DKDK'), ('0xd0000', '0xd00aa', b'DKDK')],
            'b': [('0xc0000', '0xc4593', b'DKDK'), ('0xd0000', '0xd00aa', b'DKDK')],
        })

    def test_the_171_bytes_at_0x0D0000_are_the_same_on_both_units(self):
        a, b = reads('a')[2], reads('b')[2]
        span = slice(0x0D0000 - USER_BASE, 0x0D00AB - USER_BASE)
        self.assertEqual(len(a[span]), 171)
        self.assertEqual(a[span], b[span])
        self.assertNotIn(0xFF, a[span][-8:])
        # The two bytes before the marker, where a trailer checksum sits, and the marker itself.
        self.assertEqual(a[span][-6:], bytes([0x46, 0x60]) + b'DKDK')
        # And the blocks before it differ, so the agreement is not the two reads being one.
        before = slice(0x0C0000 - USER_BASE, 0x0C4594 - USER_BASE)
        self.assertNotEqual(a[before], b[before])


class TheClockRuns(unittest.TestCase):
    def setUp(self):
        lab.require(CLOCK, 'h885_a_config')

    def fields(self, row):
        second, minute, hour, day, weekday, month, year = row[:7]
        return second, minute, hour, day, weekday, month, year

    def calendar_agrees(self, row):
        second, minute, hour, day, weekday, month, year = self.fields(row)
        if not (second < 60 and minute < 60 and hour < 24 and weekday < 7 and month < 12):
            return False
        try:
            date = datetime.date(2000 + year, month + 1, day + 1)
        except ValueError:
            return False
        return date.isoweekday() % 7 == weekday

    def test_two_reads_at_0x108_whose_seconds_moved_and_nothing_else(self):
        rows = clock_reads()
        self.assertEqual([address for address, _ in rows], [0x108, 0x108])
        (_, first), (_, second) = rows
        self.assertEqual(first, bytes([0x0A, 0x25, 0x0B, 0x17, 0x06, 0x09, 0x14, 0x01]))
        self.assertEqual((first[0], second[0]), (10, 14))
        self.assertEqual(first[1:], second[1:])

    def test_the_weekday_agrees_with_the_date_and_no_shifted_reading_does(self):
        (_, first), _ = clock_reads()
        self.assertTrue(self.calendar_agrees(first))
        self.assertEqual(datetime.date(2020, 10, 24).strftime('%A'), 'Saturday')
        # The day and the month counted from 0 is itself checked: counted from 1, either or both, the
        # date is a Wednesday, a Thursday or a Friday, never the stored Saturday.
        day, weekday, month, year = first[3], first[4], first[5], first[6]
        others = {(d, m): datetime.date(2000 + year, m, d).isoweekday() % 7
                  for d in (day, day + 1) for m in (month, month + 1) if (d, m) != (day + 1, month + 1)}
        self.assertEqual(others, {(23, 9): 3, (24, 9): 4, (23, 10): 5})
        self.assertNotIn(weekday, others.values())
        # The control: the same bytes read one place off either way. A shift left starts at the minute,
        # so the weekday field holds the month, 9; a shift right has no byte before 0x108 in the read, so
        # variable 7 stands in for it, and the hour field holds the minute, 37. Both out of range.
        left, right = first[1:8], bytes([first[7]]) + first[:6]
        self.assertEqual((left[4], right[2]), (9, 37))
        self.assertFalse(self.calendar_agrees(left))
        self.assertFalse(self.calendar_agrees(right))

    def test_the_clock_reads_the_seeds_date_1_h_48_min_33_s_later(self):
        c = gspm.parse(lab.load('h885_a_config'))
        seeds = []
        for record in c.state_records()[:7]:
            at = c.blob_offset_of(record.address)
            seeds.append(int.from_bytes(c.blob[at:at + 2], 'little'))
        (_, first), _ = clock_reads()

        def moment(f):
            second, minute, hour, day, _, month, year = f
            return datetime.datetime(2000 + year, month + 1, day + 1, hour, minute, second)
        self.assertEqual(seeds[3:7], list(first[3:7]))
        self.assertEqual(moment(first[:7]) - moment(seeds), datetime.timedelta(hours=1, minutes=48, seconds=33))


class UnitBHoldsFavouriteChannels(unittest.TestCase):
    def setUp(self):
        lab.require('h885_a_config', 'h885_b_config')

    def handovers(self, name):
        """Every list that hands a number to the number sender: (band, record, list shape, value)."""
        c = gspm.parse(lab.load(name))
        out = []
        for li in c.action_lists():
            for x in li:
                if 0x1F <= x.opcode <= 0x3E and 0xF3 <= x.operand >> 8 <= 0xF6:
                    out.append((x.operand >> 8, x.operand & 0xFF, tuple(y.opcode for y in li), li[0].operand))
        return c, out

    def test_two_records_on_b_and_none_on_a(self):
        found = {}
        for name in ('h885_a_config', 'h885_b_config'):
            c, _ = self.handovers(name)
            section = c.sections[gspm.arch_slot(8, gspm.NUMBER_SENDER_SLOT)]
            records = c.number_senders()
            zero = gspm.Instruction(0, 0)
            found[name] = (c.blob[c.blob_offset_of(section.address)],
                           [(r.flags, r.base, r.digits, r.first == r.middle == r.last,
                             (r.prologue, r.epilogue, r.prefix) == (zero, zero, zero)) for r in records])
        self.assertEqual(found, {'h885_a_config': (0, []),
                                 'h885_b_config': (2, [(0, 0, 3, True, True), (0, 0, 0, True, True)])})

    def test_forty_three_lists_load_a_constant_and_hand_it_over_with_band_F3(self):
        _, a = self.handovers('h885_a_config')
        _, b = self.handovers('h885_b_config')
        self.assertEqual(a, [])
        self.assertEqual({(band, shape) for band, _, shape, _ in b}, {(0xF3, (0x7A, 0x1F))})
        per = {}
        for _, record, _, value in b:
            per.setdefault(record, []).append(value)
        self.assertEqual({r: (len(v), len(set(v)), min(v), max(v)) for r, v in per.items()},
                         {0: (19, 19, 41, 724), 1: (24, 24, 1, 187)})


if __name__ == '__main__':
    unittest.main()
