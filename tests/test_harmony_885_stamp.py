"""
The Harmony 880 and 885's base slot 3: not the clock, the zero point of a counter of seconds since the
build, whose start up load cannot run on this build.

**Read in the firmware** on 4 November 2026, item 3.10 of `todo/todo-prepare-885.md`, in the 885's
application 4.4 (`arch8_code_885`, base `0x010000`) and the Harmony 720's. **Measured in configurations**
over the sixteen distinct arch 8 containers of `tests/test_harmony_885_start_check.py`'s `CALIBRATION`. No
remote was opened. Addresses are the 885 application's.

**Sources checked before the work**: `reference/config-format/header-records.md`, "Base slot 3: when the
configuration was built" (sections 21, 138, 310 and 322: the record, the Harmony One's subtraction, the boot
read of three bytes at index 10 into the counter of time since the build on the One, 600 and 700, and its
`EF 00 00`), the state variable pages for the clock (section 138, `tests/test_harmony_885_state.py`: every
start reseeds the clock from base slot 13 on this platform), and `tests/test_harmony_885_slots.py`, whose
census finds base slot 3 sought twice. **Logitech's client, decision 2**: the classic client was read, and it
dates an arch 8 log record's three byte field as signed seconds after the date it reads from base slot 3,
checking the tag and the terminator and skipping the weekday (`getConfigurationBaseDateProtocol8` and
`EventIterator`); that is Stated by Logitech, in their client, and only consistent with what the firmware
does here, so nothing below asserts it.

## What base slot 3 feeds

**Not the clock.** The clock is state variables 0 to 6, seeded from base slot 13 at every start
(`tests/test_harmony_885_state.py`). Base slot 3 is sought by two routines only, and both write nothing but
a three byte counter at data `0x1CB` to `0x1CD`: **seconds since the configuration was built**, 24 bits.

**The boot read, `0x14FDA`**, clears the scheduler's state and the counter, then, only when a configuration
passed (data `0x086` bit 2 or 1), seeks base slot 3, steps ten bytes and reads three into `0x1CB`. **That arm
cannot run on this build.** Main, `0x16D12`, clears bits 1, 2 and 0 of `0x086` by its call at `0x16D1E`, four
calls before the boot read at `0x16D32`, and the only instructions that set bit 1 or 2 are at `0x1721E` and
`0x17244`, inside the start check `0x1701E`, which main calls later, at `0x16DDE` and `0x16DEC`. Main is
entered only from `0x1A85C`, the boot read only from `0x16D32`, and nothing branches into the arm or into
main's head. The other writes of the byte are a masked store that changes bit 3 alone (`0x16A60`) and
bit 3's own clears and sets; three instructions at `0x1053C` to `0x10554` name `0x86` under bank 1, so
they are `0x186`. **So the counter is 0 after every start**, and the `EF 00 00` the arm would load, which
sixteen of sixteen containers hold at `+0x0A`, is never loaded here. "Only" rests on a census of the
byte's direct writes, by banked address and by `MOVFF`; a write through a pointer is not excluded beyond
it, and the masked store at `0x16A60` is asserted as its `AND` with `0xF7`. On the 720 its main clears the
bits by its call at `0x16D96` before its boot read at `0x16DAA`, and the boot read is gated the same way;
that nothing else sets the bits there is not asserted.

**The recalculate, `0x15598`**, gated the same way, seeks base slot 3, steps two bytes and computes
`(s - s') + 60 (m - m') + 3600 (h - h')` against the clock's `0x108` to `0x10A`, then adds `86400` times the
days from the stamp's date to the clock's, reading the stamp's day, skipping its weekday (`0x1919E`), then
month and year. It is reached four ways: the action instruction `0x07` with low byte `0xF9` (`0x1398A`), the
`0x0F` band below, write misc selector 8 (`0x15A14`, `tests/test_harmony_885_write_end.py`), and a write of
state variable 0 by the state write's arm that skips the transitions (`0x17604`: the flag at `0x14E` set
branches past the transition walk, and an index of 0 then calls the recalculate). The tick adds an elapsed
count from `0x1D4` into it (`0x1503A`); that the clock's seconds take the same count is read by eye.

**What reads the counter**: the `0x0F` band `0xC0` to `0xCF` (`0x13890`), which on this ladder every opcode
from `0x0F` to `0x1E` reaches (`tests/test_harmony_885_actions.py`), and whose low two bits are an index
`i` and the next two an operation: 0 copies byte `0x1CB + i` into the byte register `0x30A`, 1 copies it
back, 2 does nothing and 3 is the recalculate. **Index 3 reaches `0x1CE`**, a byte of the scheduler, so
`0xC3` and `0xC7` touch the scheduler and not the counter. Every bank 1 access to `0x1CB` to `0x1CD` that a
walk following `MOVLB` in address order finds is the boot read's clear, the tick's add, the recalculate's
store and add, and that dispatcher's two `ADDLW 0xCB`; an access through a pointer computed some other way
is not excluded beyond that walk.

## The corpus

Sixteen of sixteen: the tag `0xADDF` and the terminator `0xEFBF`, three zero bytes after it, a weekday that
agrees with the date, and base slot 13's records 0 to 6 starting at exactly the stamp's seven fields, so the
compiler stamps both from one moment. **No `0x0F` instruction with a low byte from `0xC0` to `0xCF`
anywhere**, in action lists, transitions, base slot 8's bindings or the tagged lists of base slots 6 and 9,
so no configuration reads, writes or recalculates the counter by that band. The sixteen are copies of six
configurations. `0x07 0xFFF9` occurs 120 times in
each, all in action lists.

## For a writer

Stamp base slot 3 and base slot 13's records 0 to 6 from one moment; keep the tag and the terminator, which
Logitech's classic client finds the record by, and the three zero bytes every configuration carries; and
never emit an opcode from `0x0F` to `0x1E` with a low byte `0xC3` or `0xC7`. A wrong stamp changes nothing a person sees with any configuration in the corpus,
since nothing in them reads the counter.

## Reviewers

Two, per the `finding` skill; their findings are in the landing commit's message.
"""
import collections
import unittest

import lab  # noqa: F401, puts src/ on the path
from harmony import gspm
from test_harmony_885_actions import containers
from test_harmony_885_start_check import (BASE, CHECK, CHECK_END, CODE_END, MAIN, OTHER_APPLICATIONS, START_ROUTINE,
                                          application, by_name, listing, text, transfers_to, window)

BOOT_READ = 0x14FDA
RECALCULATE = 0x15598
DISPATCHER = 0x15788
BAND_C0 = 0x13890
SKIP_WEEKDAY = 0x1919E
COUNTER = (0x1CB, 0x1CC, 0x1CD)
BOOT_READ_720 = 0x15052
MAIN_720 = 0x16D8A
CLEAR_720 = 0x1854C


def flag_writes(code):
    """Every instruction that writes bank 0's 0x86 by its banked address, and every MOVFF into 0x086.

    Tests and reads are left out. The bank is not followed here; the three bank 1 writes are named
    separately with their `MOVLB`.
    """
    out = []
    for a, i in listing(code, BASE, CODE_END):
        f = i.fields
        if i.mnemonic == 'MOVFF' and f.get('dst') == 0x086:
            out.append((a, text(i)))
        elif f.get('f') == 0x86 and f.get('a') == 1:
            if i.mnemonic.startswith(('BTF', 'CPF', 'TSTFSZ')) or (f.get('d') == 0 and 'b' not in f):
                continue
            out.append((a, text(i)))
    return out


class TheBootReadCannotLoad(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_it_clears_the_counter_and_reads_three_bytes_at_ten_only_when_a_configuration_passed(self):
        body = window(self.code, BOOT_READ, 32)
        self.assertEqual(body[17:20], ['CLRF 0xcb', 'CLRF 0xcc', 'CLRF 0xcd'])
        self.assertEqual(body[20:32],
                         ['MOVLB 0x0', 'MOVF 0x86,W', 'ANDLW 0x04', 'BNZ 0x15010', 'MOVF 0x86,W', 'ANDLW 0x02',
                          'BZ 0x15032', 'MOVLB 0x0', 'MOVLW 0x03', 'MOVWF 0xd3', 'CALL 0x191de', 'MOVLB 0x0'])
        self.assertEqual(window(self.code, 0x1501C, 8),
                         ['MOVLW 0x0a', 'MOVWF 0xd1', 'CALL 0x191aa', 'MOVLB 0x0', 'MOVLW 0xcb', 'MOVWF 0xcd',
                          'MOVLW 0x01', 'MOVWF 0xce'])

    def test_main_clears_the_gate_before_the_boot_read_and_checks_after_it(self):
        self.assertEqual(window(self.code, MAIN, 9)[3:], ['CALL 0x180a4', 'CALL 0x1a17c', 'CALL 0x10cfe',
                                                          'CALL 0x1891c', 'CALL 0x157c2', 'CALL 0x14fda'])
        self.assertEqual(window(self.code, START_ROUTINE, 4), ['MOVLB 0x0', 'BCF 0x86,1', 'BCF 0x86,2', 'BCF 0x86,0'])
        self.assertEqual(transfers_to(self.code, START_ROUTINE), [0x16D1E])
        self.assertEqual(transfers_to(self.code, BOOT_READ), [0x16D32])
        self.assertEqual(transfers_to(self.code, CHECK), [0x16DDE, 0x16DEC])
        self.assertEqual(transfers_to(self.code, MAIN), [0x1A85C])

    def test_nothing_enters_mains_head_or_the_arm_from_elsewhere(self):
        inside = [(a, ins.fields['target']) for a, ins in listing(self.code, BASE, CODE_END)
                  if MAIN <= ins.fields.get('target', 0) <= 0x16D32 or 0x15010 <= ins.fields.get('target', 0) <= 0x15032]
        self.assertEqual(inside, [(0x15008, 0x15010), (0x1500E, 0x15032), (0x1A85C, MAIN)])

    def test_only_the_start_check_sets_bit_1_or_2(self):
        writes = flag_writes(self.code)
        sets = [a for a, t in writes if t in ('BSF 0x86,1', 'BSF 0x86,2')]
        self.assertEqual(sets, [0x1721E, 0x17244])
        self.assertTrue(all(CHECK <= a < CHECK_END for a in sets))
        whole = [(a, t) for a, t in writes if not t.startswith(('BSF', 'BCF'))]
        self.assertEqual(whole, [(0x1053C, 'SUBWF 0x86'), (0x1054C, 'MOVWF 0x86'), (0x10554, 'RLNCF 0x86'),
                                 (0x16A60, 'MOVWF 0x86')])
        self.assertEqual(window(self.code, 0x10538, 1), ['MOVLB 0x1'])
        self.assertEqual(window(self.code, 0x16A5A, 4), ['MOVLW 0xf7', 'ANDWF 0x86,W', 'IORWF 0xff3,W', 'MOVWF 0x86'])

    def test_the_720_clears_the_gate_before_its_boot_read_too(self):
        (h720,) = by_name(OTHER_APPLICATIONS['720'])
        head = window(h720, MAIN_720, 9)
        self.assertEqual((head[3], head[8]), ('CALL 0x%05x' % CLEAR_720, 'CALL 0x%05x' % BOOT_READ_720))
        self.assertEqual(window(h720, CLEAR_720, 4), ['MOVLB 0x0', 'BCF 0x86,1', 'BCF 0x86,2', 'BCF 0x86,0'])
        self.assertEqual(window(h720, BOOT_READ_720 + 0x28, 8),
                         ['MOVLB 0x0', 'MOVF 0x86,W', 'ANDLW 0x04', 'BNZ 0x15088', 'MOVF 0x86,W', 'ANDLW 0x02',
                          'BZ 0x150aa', 'MOVLB 0x0'])
        self.assertEqual(window(h720, BOOT_READ_720 + 0x36, 4)[1:], ['MOVLW 0x03', 'MOVWF 0xd3', 'CALL 0x1926e'])


class TheRecalculate(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_it_seeks_base_slot_3_and_stores_into_the_counter(self):
        self.assertEqual(window(self.code, RECALCULATE + 0x10, 11),
                         ['MOVLW 0x03', 'MOVWF 0xd3', 'CALL 0x191de', 'MOVLB 0x0', 'MOVLW 0x02', 'MOVWF 0xd1',
                          'CALL 0x191aa', 'RCALL 0x15338', 'MOVFF 0x01d,0x1cb', 'MOVFF 0x01e,0x1cc',
                          'MOVFF 0x01f,0x1cd'])
        self.assertEqual(window(self.code, 0x155D6, 12),
                         ['MOVLB 0x2', 'MOVF 0xe0,W', 'MOVLB 0x1', 'ADDWF 0xcb', 'MOVLB 0x2', 'MOVF 0xe1,W',
                          'MOVLB 0x1', 'ADDWFC 0xcc', 'MOVLB 0x2', 'MOVF 0xe2,W', 'MOVLB 0x1', 'ADDWFC 0xcd'])

    def test_seconds_minutes_and_hours_against_the_clock_with_60_and_3600(self):
        self.assertEqual(window(self.code, 0x15338, 3),
                         ['MOVFF 0x108,0x2d9', 'MOVFF 0x109,0x2da', 'MOVFF 0x10a,0x2db'])
        literals = [int(t.split()[1], 16) for _, t in ((a, text(i)) for a, i in listing(self.code, 0x15338, 0x15472))
                    if t.startswith('MOVLW')]
        self.assertIn(60, literals)
        self.assertIn(3600 & 0xFF, literals)
        self.assertIn(3600 >> 8, literals)

    def test_days_skip_the_weekday_and_count_86400_seconds(self):
        self.assertEqual(window(self.code, 0x15472, 3),
                         ['MOVFF 0x10b,0x2d9', 'MOVFF 0x10d,0x2da', 'MOVFF 0x10e,0x2db'])
        self.assertEqual(window(self.code, 0x15486, 1), ['CALL 0x1919e'])
        self.assertEqual(window(self.code, SKIP_WEEKDAY, 4)[1:3], ['INCF 0x80', 'MOVLW 0x00'])
        constant = window(self.code, 0x15562, 6)
        self.assertEqual(int(constant[4].split()[1], 16) << 16 | int(constant[2].split()[1], 16) << 8
                         | int(constant[0].split()[1], 16), 86400)

    def test_four_triggers(self):
        self.assertEqual(transfers_to(self.code, RECALCULATE), [0x1398A, 0x157BE, 0x15A14, 0x17604])
        self.assertEqual(window(self.code, 0x13984, 4), ['MOVLW 0xf9', 'SUBWF 0xb2,W', 'BNC 0x13990', 'CALL 0x15598'])
        self.assertEqual(window(self.code, 0x175E0, 3), ['MOVLB 0x1', 'MOVF 0x4e,W', 'BNZ 0x17600'])
        # With the flag clear the write walks the transitions instead: the record seek and the walk.
        self.assertEqual(window(self.code, 0x175EA, 1), ['RCALL 0x17774'])
        self.assertEqual(window(self.code, 0x175FC, 1), ['GOTO 0x173a6'])
        self.assertEqual(window(self.code, 0x17600, 3), ['MOVF 0x4f,W', 'BNZ 0x17608', 'CALL 0x15598'])


class TheCounterIsReadByOneBandOnly(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_the_0x0F_band_C0_splits_an_index_and_an_operation(self):
        self.assertEqual(window(self.code, BAND_C0, 4), ['MOVLW 0xc0', 'SUBWF 0xb2,W', 'BNC 0x138b4', 'MOVLW 0x03'])
        self.assertEqual(window(self.code, 0x138A8, 4), ['ANDLW 0x3f', 'MOVLB 0x1', 'MOVWF 0xe0', 'CALL 0x15788'])
        self.assertEqual(transfers_to(self.code, DISPATCHER), [0x138AE])

    def test_read_write_nothing_and_recalculate_at_0x1CB_plus_the_index(self):
        body = window(self.code, DISPATCHER, 28)
        self.assertEqual(body[2:9], ['XORLW 0x03', 'BZ 0x157be', 'XORLW 0x02', 'BZ 0x157ac', 'XORLW 0x01',
                                     'BZ 0x1579a', 'RETURN'])
        self.assertEqual(body[9:16], ['MOVF 0xe1,W', 'CLRF 0xfea', 'ADDLW 0xcb', 'MOVWF 0xfe9', 'MOVLW 0x01',
                                      'ADDWFC 0xfea', 'MOVFF 0xfef,0x30a'])
        self.assertEqual(body[17:24], ['MOVF 0xe1,W', 'CLRF 0xfea', 'ADDLW 0xcb', 'MOVWF 0xfe9', 'MOVLW 0x01',
                                       'ADDWFC 0xfea', 'MOVFF 0x30a,0xfef'])
        self.assertEqual(body[25], 'GOTO 0x15598')
        # Index 3 is 0x1CE, the scheduler's byte, which the boot read clears with the rest of its state.
        self.assertEqual(window(self.code, 0x14FF0, 1), ['CLRF 0xce'])

    def test_every_bank_1_access_to_the_counter(self):
        found, bank = [], None
        for a, i in listing(self.code, BASE, CODE_END):
            f, t = i.fields, text(i)
            if i.mnemonic == 'MOVLB':
                bank = f['k']
            if (bank == 1 and f.get('a') == 1 and f.get('f') in (0xCB, 0xCC, 0xCD)) \
                    or (i.mnemonic == 'MOVFF' and (f.get('src') in COUNTER or f.get('dst') in COUNTER)) \
                    or (i.mnemonic in ('MOVLW', 'ADDLW') and f.get('k') == 0xCB and bank in (0, 1)):
                found.append(a)
        self.assertEqual(found, [0x14FFC, 0x14FFE, 0x15000, 0x15026, 0x15046, 0x1504A, 0x1504E, 0x155BC, 0x155C0,
                                 0x155C4, 0x155DC, 0x155E4, 0x155EC, 0x1579E, 0x157B0])


class TheCorpus(unittest.TestCase):
    def test_the_record_and_the_clock_seeds_from_one_moment(self):
        found = collections.Counter()
        for name, c in containers():
            off = c.blob_offset_of(c.sections[gspm.arch_slot(8, 3)].address)
            record = c.blob[off:off + 14]
            fields = list(record[2:9])
            seeds = []
            for r in c.state_records()[:7]:
                at = c.blob_offset_of(r.address)
                seeds.append(int.from_bytes(c.blob[at:at + 2], 'little'))
            found[(record[:2], record[9:11], record[11:14], record[10:13],
                   gspm.clock_record(c.blob, off) is not None, seeds == fields)] += 1
        self.assertEqual(found, {(b'\xdf\xad', b'\xbf\xef', b'\x00\x00\x00', b'\xef\x00\x00', True, True): 16})

    def test_no_instruction_names_the_counter_band_and_f9_is_120_in_each(self):
        band, f9 = [], collections.Counter()

        def look(name, opcode, operand):
            if 0x0F <= opcode <= 0x1E and 0xC0 <= operand & 0xFF <= 0xCF:
                band.append((name, opcode, operand))

        for name, c in containers():
            for li in c.action_lists():
                for ins in li:
                    look(name, ins.opcode, ins.operand)
                    if ins.opcode == 0x07 and ins.operand == 0xFFF9:
                        f9[name] += 1
            for r in c.state_records():
                for t in r.values:
                    look(name, t[7], int.from_bytes(t[5:7], 'little'))
            for record in c.binding_records():
                for b in record:
                    look(name, b.opcode, b.operand)
            for address in c.handler_sets():
                for e in c.tagged_list(address):
                    look(name, e.opcode, e.operand)
            for m in c.mode_records():
                for e in m.entries or []:
                    look(name, e.opcode, e.operand)
        self.assertEqual(band, [])
        self.assertEqual(set(f9.values()), {120})
        self.assertEqual(len(f9), 16)


if __name__ == '__main__':
    unittest.main()
