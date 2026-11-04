"""
The Harmony 880 and 885's state variables: 64 bytes, the two counts right after them, and no bound a
configuration is checked against, so 64 bytes is a writer's ceiling.

**Read in the firmware** on 4 November 2026, item 3.3 of `todo/todo-prepare-885.md`, in the 885's
application 4.4 (`arch8_code_885`, base `0x010000`; the 880's and the 880 Pro's differ in the two skin bytes
only, `tests/test_harmony_885_start_check.py`) and the Harmony 720's application. **Measured in
configurations** over the sixteen distinct arch 8 containers of that file's `CALIBRATION` and the built in
configuration inside each of the five application images. No remote was opened. Addresses are the 885
application's.

**Sources checked before the work**: `reference/config-format/state.md`, "What the four header words do"
(section 276: the storage is `narrow + 2 * wide`, the fill's ceiling per image, `0x7F` on the Harmony One,
`0xFF` on the Harmony 700, `0xC0` on the Harmony 600, arch 9 unread), "Variables 7 to 17 belong to the
firmware too" (section 284: no data memory checksum on the arch 8 images) and "A configuration holds at
most 128 state variables" (section 331); `reference/architectures/harmony-880-885/memory.md`, which put
the storage at `0x108` to `0x147` and the counts at `0x148` and `0x149` from item 1.5's reading, and listed
whether the interpreter's writes check the 64 byte bound as not read; `tests/test_harmony_885_write_end.py`,
the loader's one caller. **Logitech's client, decision 2**: MyHarmony's source was searched by the name
`StateVariable`; the hit is the Harmony Touch's driver, nothing about this platform's storage. The classic
client was not searched for this item.

## The loader

`0x172AA`, called once, from main's start at `0x16E3E` (`tests/test_harmony_885_write_end.py`). It clears
both counts (`CLRF 0x48`, `CLRF 0x49` under bank 1, `0x148` and `0x149`), and seeds only when a
configuration passed (data `0x086` bit 2 or bit 1). It seeks raw slot `0x0E`, which the library's arch 8
map calls base slot 13, reads four `u16` words and keeps the low byte of the first three: `count` into
scratch `0x2B6`, `narrow` into `0x148` (`0x172F0`) and `wide` into `0x149` (`0x17302`); the fourth, `narrow
again`, is read and kept nowhere. Those two `MOVFF` are the only absolute writes to the counts in the whole
application. The seed loop runs a byte index while it is below `count`, reads each record's `first` and
stores it through `0x176CE` unless it is `0xFEFE`. **There is no guard but "a configuration passed"**, so
every start reseeds every variable whose `first` is not `0xFEFE`, which in the sixteen is every variable,
the clock's seven included; the Harmony One guards its seeding with a
checksum of the data memory (section 138), and section 284 found no such checksum in these images.
Whether anything after the loader restores the clock is not read.

**The fill.** The start is `narrow + 2 * wide` (`0x17362` to `0x17368`, eight bit), or the literal 18 when
the built in configuration is the one in use or none passed; the loop paints `0xFE` at `0x108 + start` while
the start is below **`0x40`** (`0x17388`). So the last byte it can paint is `0x147`, index 63: the bound is
the size of the storage, where on the Harmony One, 700 and 600 the same loop's literal is `0x7F`, `0xFF` and
`0xC0`. The address arithmetic is `ADDLW 0x08` and `ADDWFC` of `0x01`, which is `0x108`; the store
`0x176CE` uses the same.

**The store and the read check nothing.** `0x176CE` writes `0x108 + i` for a narrow index and `0x108 +
narrow + 2 * ((i - narrow) & 0x7F)` for a wide one, with no comparison against `count`, `0x40` or anything
else; `0x17718`, the read, is the same arithmetic. The one bound in the firmware is `0x176C0`, `index <
narrow + wide`, whose two callers are write misc and read misc selector 1 (`0x159C0`, `0x15EEE`): the host's,
not the configuration's. Its four store callers are selector 1, the loader, the state write and the step.

## The ceiling

**`narrow + 2 * wide` at most 64.** Inside it, a variable past `narrow + wide` is seeded and then painted
`0xFE`, as on the other platforms. Past it nothing paints and nothing refuses: the seeding stores run on into
`0x148` and `0x149`, overwriting the counts with a variable's starting value, after which every wide
variable is read and written at the wrong place. **That consequence is inferred from the arithmetic**, not
observed. With the one wide variable every configuration here declares, the ceiling is 63 variables,
indices 0 to 62, and since the firmware owns 0 to 17 (section 284), **45 of them the configuration's own**.
That is about half the 128 the seven bit index of `0x80 | n` allows, so on arch 8 the storage binds
before the index does. Whether it binds before the model's device limit, fifteen on the 880 and 885, is not
established: the configurations hold 15 to 23 own variables for 3 to 7 devices.

`narrow` must be at least 18 as well: the firmware writes variable 17 as one byte at `0x119`, which is
`0x108 + 17` only while every variable below 18 is narrow (`tests/test_harmony_885_actions.py`). The
firmware's ownership of 13 to 17 is section 284's; this file reads variable 17 alone. Every configuration read has 32 or more narrow. The "15 to 23 own variables for 3 to 7
devices" above is item 3.3's count through the codec's device reader, not asserted here.

## The corpus

Sixteen of sixteen: one wide variable, the last, whose `max` is 65277; `narrow + wide == count`; `narrow
again == narrow`; no `first` is `0xFEFE`; and the bytes used are 34 to 42 of the 64, per container below.
Every state index any action list names is below its container's `count`, and every `0x80 | n` write is
below `narrow`. The built in configuration of all five application images states count 19, narrow 18,
wide 1: 20 bytes, and since its fill starts at 18 after seeding, its variable 18 is seeded and painted
over; whether the built in configuration reads it is not checked. Read through raw slot 14 by its pointer,
as the loader does, rather than through the library's slot map, because the built in configuration's
architecture record is zero.

## The Harmony 720

Its loader at `0x17322` is the 885's instruction for instruction in mnemonics, and its literals agree except
the scratch pointers its reads are given; `0x0E`, `0xFE`, 18 and `0x40` are the same.

## Reviewers

Two, per the `finding` skill. **The blind re-measurement** reproduced the loader, the `0x40` bound, the
store's one comparison and every table above. **The prose audit** found "binds first" said where only the
128 index limit is beaten, "at most 63" without its one wide variable, the reseeding stated without its
`0xFEFE` exception, `narrow` at least 18 resting on an arch 12 and 14 reading where variable 17's fixed byte
is enough, the read's body unasserted and a title wider than its body; all corrected before landing.
"""
import unittest

import lab
from harmony import gspm
from test_harmony_885_actions import containers
from test_harmony_885_start_check import (BASE, OTHER_APPLICATIONS, application, by_name, listing, text, transfers_to,
                                          window)

LOADER = 0x172AA
LOADER_END = 0x173A6
STORE = 0x176CE
READ = 0x17718
BOUND = 0x176C0
#: The storage, from the loader's and the store's own address arithmetic.
STATE_BASE = 0x108
#: Raw slot 14, the loader's seek literal.
STATE_SLOT_RAW = 0x0E
#: The firmware's own variables, section 284.
FIRMWARE_OWNS = 18
#: The seven bit index of `0x80 | n`, section 331.
INDEX_LIMIT = 128
LOADER_720 = 0x17322
BUILT_IN = 0xE000

#: count, narrow, wide and the bytes they use, per container.
TABLES = {
    'Update.EZHex': (33, 32, 1, 34), 'Update-1.EZHex': (37, 36, 1, 38), 'Update-2.EZHex': (38, 37, 1, 39),
    'Update-3.EZHex': (38, 37, 1, 39), 'H880-Bedroom.EZHex': (36, 35, 1, 37),
    'H880-Bedroom-Spare-1.EZHex': (36, 35, 1, 37), 'H880-Bedroom-Spare-2.EZHex': (36, 35, 1, 37),
    'H880-Bedroom-Spare-3.EZHex': (36, 35, 1, 37), 'H885-Bedroom.EZHex': (36, 35, 1, 37),
    'H885-LivingRoom.EZHex': (41, 40, 1, 42), 'H885-LivingRoom-Spare-1.EZHex': (41, 40, 1, 42),
    'H885-LivingRoom-Spare-2.EZHex': (41, 40, 1, 42), 'H885-LivingRoom-Spare-3.EZHex': (41, 40, 1, 42),
    'H880-Pro.EZHex': (34, 33, 1, 35), 'H880-Spare-4.EZHex': (37, 36, 1, 38), 'H720-Config.EZHex': (38, 37, 1, 39),
}


def fill_bound(code):
    (bound,) = [int(t.split()[1], 16) for a, t in ((a, text(i)) for a, i in listing(code, 0x17388, 0x1738A))]
    return bound


class TheLoader(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_it_clears_the_counts_and_seeds_only_when_a_configuration_passed(self):
        self.assertEqual(window(self.code, LOADER, 7),
                         ['MOVLB 0x1', 'CLRF 0x48', 'CLRF 0x49', 'MOVLB 0x0', 'MOVF 0x86,W', 'ANDLW 0x04',
                          'BNZ 0x172be'])
        self.assertEqual(window(self.code, 0x172B8, 3), ['MOVF 0x86,W', 'ANDLW 0x02', 'BZ 0x1736e'])
        self.assertEqual(transfers_to(self.code, LOADER), [0x16E3E])

    def test_it_seeks_raw_slot_14_and_keeps_the_low_bytes_of_three_words(self):
        self.assertEqual(window(self.code, 0x172C4, 3), ['MOVLW 0x0e', 'MOVWF 0xd3', 'CALL 0x191de'])
        self.assertEqual([window(self.code, a, 1)[0] for a in (0x172DE, 0x172F0, 0x17302)],
                         ['MOVFF 0x2b3,0x2b6', 'MOVFF 0x2b3,0x148', 'MOVFF 0x2b3,0x149'])
        # The fourth read lands in the same scratch and the loop starts without using it.
        self.assertEqual(window(self.code, 0x17310, 4), ['CALL 0x190a0', 'MOVLB 0x2', 'MOVF 0xb6,W', 'SUBWF 0xb5,W'])
        writes = [a for a, i in listing(self.code, 0x010400, 0x01E000)
                  if i.mnemonic == 'MOVFF' and i.fields.get('dst') in (0x148, 0x149)]
        self.assertEqual(writes, [0x172F0, 0x17302])

    def test_a_first_of_0xFEFE_is_skipped(self):
        self.assertEqual(window(self.code, 0x17340, 6),
                         ['MOVLW 0xfe', 'MOVLB 0x2', 'XORWF 0xb7,W', 'BNZ 0x1734c', 'MOVLW 0xfe', 'XORWF 0xb8,W'])
        self.assertEqual(window(self.code, 0x1735A, 1), ['RCALL 0x176ce'])

    def test_the_fill_starts_at_narrow_plus_twice_wide_and_stops_below_0x40(self):
        self.assertEqual(window(self.code, 0x17362, 4), ['MOVLB 0x1', 'MOVF 0x49,W', 'ADDWF 0xfe8,W', 'ADDWF 0x48,W'])
        self.assertEqual(window(self.code, 0x17370, 1), ['MOVLW 0x12'])
        self.assertEqual(window(self.code, 0x17384, 1), ['MOVLW 0x12'])
        self.assertEqual(window(self.code, 0x17388, 12),
                         ['MOVLW 0x40', 'MOVLB 0x2', 'SUBWF 0xb2,W', 'BC 0x173a4', 'MOVF 0xb2,W', 'CLRF 0xfea',
                          'ADDLW 0x08', 'MOVWF 0xfe9', 'MOVLW 0x01', 'ADDWFC 0xfea', 'MOVLW 0xfe', 'MOVWF 0xfef'])
        self.assertEqual(fill_bound(self.code), 0x40)
        self.assertEqual(STATE_BASE + fill_bound(self.code), 0x148)


class TheStoreChecksNothing(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_the_store_and_the_read_compare_only_with_narrow(self):
        for routine in (STORE, READ):
            with self.subTest(hex(routine)):
                head = window(self.code, routine, 4)
                self.assertEqual(head[:3], ['MOVLB 0x1', 'MOVF 0x48,W', head[2]])
                self.assertTrue(head[2].startswith('SUBWF 0x5'))
        # Every literal and every subtraction in the store: narrow from the index twice, and the high
        # byte of 0x108 three times. Nothing names 0x40, the count or a limit.
        body = [text(i) for _, i in listing(self.code, STORE, READ)]
        self.assertEqual([t for t in body if t.startswith(('MOVLW', 'SUBWF', 'CPF'))],
                         ['SUBWF 0x57,W', 'MOVLW 0x01', 'SUBWF 0x57', 'MOVLW 0x01', 'MOVLW 0x01'])
        # The read, to its last RETURN: the same, on its own index 0x15A.
        read = [text(i) for _, i in listing(self.code, READ, 0x17774)]
        self.assertEqual([t for t in read if t.startswith(('MOVLW', 'SUBWF', 'CPF'))],
                         ['SUBWF 0x5a,W', 'MOVLW 0x01', 'SUBWF 0x5a', 'MOVLW 0x01', 'MOVLW 0x01'])
        self.assertEqual(window(self.code, 0x176D8, 6),
                         ['CLRF 0xfea', 'ADDLW 0x08', 'MOVWF 0xfe9', 'MOVLW 0x01', 'ADDWFC 0xfea', 'MOVFF 0x158,0xfef'])

    def test_the_one_bound_is_the_hosts(self):
        self.assertEqual(window(self.code, BOUND, 7),
                         ['MOVLB 0x1', 'MOVF 0x48,W', 'ADDWF 0x49,W', 'SUBWF 0x56,W', 'BC 0x176cc', 'RETLW 0x01',
                          'RETLW 0x00'])
        self.assertEqual(transfers_to(self.code, BOUND), [0x159C0, 0x15EEE])
        self.assertEqual(transfers_to(self.code, STORE), [0x159D6, 0x1735A, 0x175DE, 0x176A0])


class TheCeiling(unittest.TestCase):
    def test_sixty_three_variables_forty_five_of_them_the_configurations(self):
        storage = fill_bound(application())
        wide = 1
        variables = storage - 2 * wide + wide
        self.assertEqual((storage, variables, variables - FIRMWARE_OWNS), (64, 63, 45))
        self.assertLess(variables, INDEX_LIMIT)


class TheCorpus(unittest.TestCase):
    def test_every_table_has_one_wide_variable_and_uses_34_to_42_bytes(self):
        found = {}
        for name, c in containers():
            t = c.state_table()
            records = c.state_records()
            firsts = [int.from_bytes(c.blob[c.blob_offset_of(r.address):][:2], 'little') for r in records]
            with self.subTest(name):
                self.assertTrue(t.is_consistent)
                self.assertEqual(t.narrow_again, t.narrow)
                self.assertEqual(firsts.count(0xFEFE), 0)
                self.assertEqual(records[t.narrow].second, 65277)
                # The loader's own route: raw slot 14 by its pointer, the table's words at its address.
                item = 0x0B + 4 * STATE_SLOT_RAW
                address = int.from_bytes(c.blob[item + 1:item + 4], 'little')
                words = [int.from_bytes(c.blob[c.blob_offset_of(address) + 2 * k:][:2], 'little') for k in range(3)]
                self.assertEqual(words, [t.count, t.narrow, t.wide])
            found[name] = (t.count, t.narrow, t.wide, t.ram_bytes)
        self.assertEqual(found, TABLES)
        self.assertEqual((min(v[3] for v in found.values()), max(v[3] for v in found.values())), (34, 42))

    def test_every_index_an_action_list_instruction_names_is_inside_the_table(self):
        outside = []
        named = 0
        for name, c in containers():
            t = c.state_table()
            for li in c.action_lists():
                for ins in li:
                    if ins.opcode >= 0x80:
                        named += 1
                        if ins.opcode & 0x7F >= t.narrow:
                            outside.append((name, ins))
                    elif ins.opcode in (0x70, 0x71, 0x72) or (
                            0x1F <= ins.opcode < 0x3F and 0xED <= ins.operand >> 8 <= 0xF2):
                        named += 1
                        if ins.operand & 0xFF >= t.count:
                            outside.append((name, ins))
        self.assertEqual((named, outside), (4885 + 2137 + 993, []))

    def test_the_built_in_configurations_state_19_18_and_1(self):
        lab.require('arch8_code_880')
        images = {'885': application(), '880': lab.load('arch8_code_880')}
        images.update(zip(OTHER_APPLICATIONS, by_name(*OTHER_APPLICATIONS.values())))
        found = {}
        for model, image in images.items():
            blob = image[BUILT_IN:]
            item = 0x0B + 4 * STATE_SLOT_RAW
            address = int.from_bytes(blob[item + 1:item + 4], 'little') - (BASE + BUILT_IN)
            found[model] = tuple(int.from_bytes(blob[address + 2 * k:address + 2 * k + 2], 'little')
                                 for k in range(4))
            self.assertEqual(gspm.find_magic(blob)[1], 0)
        self.assertEqual(found, {m: (19, 18, 1, 18) for m in images})


class TheHarmony720(unittest.TestCase):
    def test_its_loader_is_the_885s_with_its_scratch_pointers_moved(self):
        code = application()
        (h720,) = by_name(OTHER_APPLICATIONS['720'])
        ours = [(a, i) for a, i in listing(code, LOADER, LOADER_END)]
        theirs = [(a, i) for a, i in listing(h720, LOADER_720, LOADER_720 + 2 * (LOADER_END - LOADER))][:len(ours)]
        self.assertEqual([i.mnemonic for _, i in ours], [i.mnemonic for _, i in theirs])
        moved = [(text(o), text(t)) for (_, o), (_, t) in zip(ours, theirs)
                 if o.mnemonic == 'MOVLW' and o.fields != t.fields]
        kept = [text(o) for (_, o), (_, t) in zip(ours, theirs) if o.mnemonic == 'MOVLW' and o.fields == t.fields]
        self.assertEqual(sorted(set(moved)), [('MOVLW 0xb3', 'MOVLW 0xbb'), ('MOVLW 0xb7', 'MOVLW 0xbf')])
        for literal in ('MOVLW 0x0e', 'MOVLW 0xfe', 'MOVLW 0x12', 'MOVLW 0x40'):
            self.assertIn(literal, kept)


if __name__ == '__main__':
    unittest.main()
