"""
The cache drop in the Harmony 700's 2.8 application is the 0.2 builds' drop at other addresses, plus
the one flag section 283 read. Section 299.

`write-config.ts` refuses a commit on a build whose drop and restart nobody has read, because both
commands are the firmware's. On the Harmony 650's 0.2 build section 282 read `WRITE_MISC` selector 2:
a walk over four cache records, the verdict bit cleared, and a flag that the next `ERASE_FLASH` reads
and, for an erase at `0x030000`, uses to clear bit 0 of setting `0x80` in the settings store. The drop
was then sent to that unit. On 2.8 the selector sets that flag and a second, `0x1E9`, whose reader
section 283 found on the boot path. This asserts the rest is the same code: the arm, the erase
handler's use of the flag, the store's lookup and write, and the cache walk with its per record leaf,
instruction for instruction with only data addresses and call targets moved. The restart on 2.8 is
section 97's and is asserted in `test_harmony_700_status_byte.py`.
"""
import unittest

import lab
from harmony.firmware import parse_header
from harmony.pic18 import isa

BASE = 0x9000
SAMPLES = ('h650_bench_code', 'h700_code')

# Per build: the routine starts compared, and the flags. 0.2 is the Harmony 650's bench build.
BUILDS = {
    '0.2': dict(arm=0x0C344, walk=0x15E1E, leaf=0x107A2, erase=0x0C240, lookup=0x0DA04, write_caller=0x0DD16,
                store_write=0x0DB60,
                flag=0x725, verdict=0x68B, records=0x0EE6, entries=0x063),
    '2.8': dict(arm=0x0C3DA, walk=0x1776E, leaf=0x14CBC, erase=0x0C2D6, lookup=0x1155C, write_caller=0x1186E,
                store_write=0x116B8,
                flag=0x380, verdict=0x68E, records=0x06E5, entries=0xF03),
}
MOVED = ('target', 'src', 'dst')          # call targets and MOVFF addresses, which relocate


def at(code, address):
    return isa.decode(code, address - BASE, BASE)


def banked(code, movlb, instr):
    return (at(code, movlb).fields['k'] << 8) | at(code, instr).fields['f']


def moved(code, address, count):
    """Per instruction: its mnemonic, the banked data addresses it reaches and its control target.

    A banked operand is resolved through the last `MOVLB` in the window, and one met before any is
    left out rather than guessed. Access bank operands are compared by `shape` and are not here.
    """
    out, bank = [], None
    for _ in range(count):
        instr = at(code, address)
        f = instr.fields
        if instr.mnemonic == 'MOVLB':
            bank = f['k']
        data = [f[k] for k in ('src', 'dst') if k in f]
        if f.get('a') == 1 and bank is not None:
            data.append((bank << 8) | f['f'])
        out.append((instr.mnemonic, data, [f['target']] if 'target' in f else []))
        address += 2 * instr.words
    return out


def shape(code, address, count):
    """The instructions from `address` with their relocating operands removed.

    A bank selection moves with the data it selects, and so does a literal that is added to `FSR0`,
    which is how these routines form a table's address; `records` and `entries` below pin those. What
    this sets aside is held to one consistent relocation by the address map test.
    """
    out = []
    for _ in range(count):
        instr = at(code, address)
        after = at(code, address + 2 * instr.words)
        fields = {k: v for k, v in instr.fields.items() if k not in MOVED}
        if fields.get('a') == 1:
            del fields['f']       # a banked operand relocates with its bank; access bank ones must not
        if instr.mnemonic == 'MOVLB':
            fields = {}
        if instr.mnemonic == 'MOVLW' and after.mnemonic in ('ADDWF', 'ADDWFC') \
                and after.fields['a'] == 0 and after.fields['f'] in (0xE9, 0xEA):
            fields = {}
        out.append((instr.mnemonic, tuple(sorted(fields.items()))))
        address += 2 * instr.words
    return out


class TheDropIsTheOldDropMoved(unittest.TestCase):

    def setUp(self):
        lab.require(*SAMPLES)
        self.code = {'0.2': lab.load('h650_bench_code'), '2.8': lab.load('h700_code')}

    def test_the_images_are_the_builds_named(self):
        for build, code in self.code.items():
            with self.subTest(build=build):
                self.assertEqual(parse_header(code).version, build)

    def test_the_arm_walks_the_cache_clears_the_verdict_and_sets_the_erase_flag(self):
        for build, code in self.code.items():
            with self.subTest(build=build):
                w = BUILDS[build]
                self.assertEqual((at(code, w['arm']).mnemonic, at(code, w['arm']).fields['target']), ('CALL', w['walk']))
                self.assertEqual((at(code, w['arm'] + 6).mnemonic, at(code, w['arm'] + 6).fields['b']), ('BCF', 2))
                self.assertEqual(banked(code, w['arm'] + 4, w['arm'] + 6), w['verdict'])
                self.assertEqual([at(code, w['arm'] + d).mnemonic for d in (10, 12)], ['MOVLW', 'MOVWF'])
                self.assertEqual(banked(code, w['arm'] + 8, w['arm'] + 12), w['flag'])

    def test_2_8_alone_sets_the_second_flag_section_283_read(self):
        code, w = self.code['2.8'], BUILDS['2.8']
        self.assertEqual(banked(code, w['arm'] + 14, w['arm'] + 18), 0x1E9)
        self.assertEqual(at(code, w['arm'] + 16).fields['k'], 1)
        # And the 0.2 arm goes straight on to test the container select bit instead.
        self.assertEqual(at(self.code['0.2'], BUILDS['0.2']['arm'] + 16).mnemonic, 'BTFSS')

    def test_the_erase_reads_the_flag_after_the_address_and_updates_setting_0x80_at_0x030000(self):
        for build, code in self.code.items():
            with self.subTest(build=build):
                w = BUILDS[build]
                e = w['erase']
                self.assertEqual(banked(code, e + 0x2A, e + 0x2C), w['flag'], 'tested')
                self.assertEqual(banked(code, e + 0x30, e + 0x32), w['flag'], 'and cleared')
                # The low and middle address bytes must both be zero, and the top one 3.
                self.assertEqual([at(code, e + d).mnemonic for d in (0x4E, 0x50, 0x52, 0x54)], ['MOVF', 'BNZ', 'MOVF', 'BNZ'])
                self.assertEqual(at(code, e + 0x56).fields['k'], 3, 'the top address byte against 3')
                self.assertEqual(at(code, e + 0x5C).fields['k'], 0x80, 'setting 0x80')
                self.assertEqual(at(code, e + 0x64).fields['target'], w['lookup'])
                self.assertEqual((at(code, e + 0x6E).mnemonic, at(code, e + 0x6E).fields['b']), ('BCF', 0))
                self.assertEqual(at(code, e + 0x7C).fields['target'], w['write_caller'])

    # Each routine to its return, except the arm, compared up to where 2.8 inserts its second flag, and
    # the erase handler, compared to the end of its parse.
    WINDOWS = (('arm', 6), ('walk', 45), ('leaf', 17), ('erase', 61), ('lookup', 150),
               ('write_caller', 74), ('store_write', 179))

    def test_the_routines_are_the_same_instructions_with_only_addresses_moved(self):
        a, b = BUILDS['0.2'], BUILDS['2.8']
        for name, count in self.WINDOWS:
            with self.subTest(routine=name):
                self.assertEqual(shape(self.code['0.2'], a[name], count), shape(self.code['2.8'], b[name], count))

    def test_the_moved_addresses_map_one_to_one(self):
        # What `shape` sets aside has to be a relocation and not a difference: across all the routines
        # at once every banked data address and every call or branch target on 0.2 corresponds to
        # exactly one on 2.8, and no two share one. A comparison that hid a real difference behind a
        # moved operand would break this.
        a, b = BUILDS['0.2'], BUILDS['2.8']
        data, code = {}, {}
        for name, count in self.WINDOWS:
            for (m0, d0, t0), (m1, d1, t1) in zip(moved(self.code['0.2'], a[name], count),
                                                  moved(self.code['2.8'], b[name], count)):
                self.assertEqual((m0, len(d0), len(t0)), (m1, len(d1), len(t1)))
                for old, new in zip(d0, d1):
                    self.assertEqual(data.setdefault(old, new), new, 'data 0x%X' % old)
                for old, new in zip(t0, t1):
                    self.assertEqual(code.setdefault(old, new), new, 'target 0x%X' % old)
        for mapping in (data, code):
            self.assertEqual(len(set(mapping.values())), len(mapping), 'no two old addresses share a new one')
        self.assertEqual((data[0x725], data[0x68B]), (0x380, 0x68E))

    def test_the_comparison_is_not_empty(self):
        # The control, and all it shows is that the comparison sees instructions: over the whole arm
        # the builds differ, by 2.8's extra flag. What stops it ignoring too much is the address map
        # test above, not this one.
        a, b = BUILDS['0.2'], BUILDS['2.8']
        self.assertNotEqual(shape(self.code['0.2'], a['arm'], 12), shape(self.code['2.8'], b['arm'], 12))

    def test_the_walk_covers_four_five_byte_records_at_each_builds_table(self):
        for build, code in self.code.items():
            with self.subTest(build=build):
                w = BUILDS[build]['walk']
                self.assertEqual(at(code, w + 4).fields['k'], 4, 'four records')
                self.assertEqual(at(code, w + 12).fields['k'], 5, 'five bytes each')
                base = at(code, w + 22).fields['k'] | (at(code, w + 26).fields['k'] << 8)
                self.assertEqual(base, BUILDS[build]['records'])
                # And the leaf zeroes a two byte entry per record, from its own table.
                leaf = BUILDS[build]['leaf']
                entries = at(code, leaf + 20).fields['k'] | (at(code, leaf + 24).fields['k'] << 8)
                self.assertEqual(entries, BUILDS[build]['entries'])


if __name__ == '__main__':
    unittest.main()
