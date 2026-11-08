"""
The Harmony 880 and 885's number sender: base slot 16 read by one routine, driven by two bands of `0x1F`,
with a Harmony 720 configuration that uses it; and on seven images, a prefix that fires from 10000 when
neither of its flags is set.

**Read in the firmware** on 4 November 2026, item 3.7 of `todo/todo-prepare-885.md`, in the 885's application
4.4 (`arch8_code_885`, base `0x010000`; the 880's differs in two skin bytes only,
`tests/test_harmony_885_start_check.py`) and the Harmony 720's, and for the prefix threshold also in the
Harmony 700 2.8 (`h700_code`), the Harmony 600 0.2 complete image (`h600_code_complete`), the Harmony 650 0.4
(`h650_code`), the Harmony One 3.4 (`one34_code`) and the Harmony 525's internal program flash
(`h525_code`). **Measured in configurations** over the sixteen distinct arch 8 containers of that file's
`CALIBRATION`, six configurations' lineages, one of them a Harmony 720's. No remote was opened. Addresses
are the 885 application's unless named.

**Sources checked before the work**: `reference/config-format/state.md`, "Base slot 16: the number sender"
(section 39's layout and conversion, read on the Harmony 700, 600 and One; sections 154 and 156, the Harmony
One compiles that carry a record; section 262, the Harmony 300 and 350), the `writing-a-config` skill's two
favourite channel rows, `gspm.number_senders`, `BANDS_1F` in `packages/codec/src/actions.ts` and
`NUMBER_SENDER_BAND` in `packages/codec/src/families/harmony-300-350/lists.ts`, and items 3.1 and 3.4 of this
track (the `0x1F` dispatch and the seeker's census, where raw slot 17 is sought once). **Logitech's client,
decision 2**: not searched for this item; how a number becomes digits is the firmware's alone, and the 720's
configuration is itself a Logitech compile.

## The routine

`0x19340` is the only function that seeks raw slot 17, which is base slot 16 on arch 8 (item 3.4's census
of the seeker's 22 literals), and it has one caller, the `0x1F` band ladder at `0x1372A`. **The band ladder
on the operand's high byte**, from `0x136DE`: at or above `0xF6` it loads the byte register `0x30A` into
`0x29C` and calls the base slot 14 consumer `0x10C14`; at `0xF5` it loads the byte register into `0x299` and
calls `0x19340`; at `0xF4` the accumulator `0x30B`/`0x30C` into `0x29C`/`0x29D` and `0x10C14`; at `0xF3` the
accumulator into `0x299`/`0x29A` and `0x19340`. Both put the operand's low byte, the record index, in a byte
of their own first. **So `0xF3` (accumulator) and `0xF5` (byte register) send a number, and `0xF4` and
`0xF6` reach base slot 14**: section 39's pairing on arch 14 and the reverse of the labels `BANDS_1F` in
`packages/codec/src/actions.ts` gives these four. That is a codec candidate and not changed here.

The routine returns at once unless a configuration passed its start check (data `0x086` bit 2 or bit 1,
`0x19344` to `0x19354`), seeks raw 17, and takes the pointer at `1 + 3 * index` with **no comparison of the
index against the count**. It then reads the record in the order `reference/config-format/state.md` gives:
flags, base, minimum, and the three instructions, with the three digit tables reached later at `+0x0E`,
`+0x11` and `+0x14` from the saved record start. It converts by subtracting 10000, 1000, 100 and 10, each
loop counting into a byte of a three byte packed decimal at `0x2BB` to `0x2BD` and raising the digit count
to 5, 4, 3 and 2. **The ten thousands count goes into the high byte `0x2BD` in binary**, so from 100000 its
nibble is ten or more and indexes past a table's ten entries. The digits are then aligned by shifting the
packed value left `4 * (6 - count)` bits, computed in eight bits, so a minimum above 6 shifts 255 times.
Per digit, **the last digit takes the last table**, checked first, so a one digit number takes it too; the
first of two or more takes the first table, and the rest the middle one.

It spools four times: the instruction at `+0x05` (`0x193B0`), the prefix (`0x19528`), one per digit in the loop
(`0x195CC`) and the instruction at `+0x08` (`0x195F2`). So with a minimum at or below 6 one call queues up to
nine instructions, and the spooler drops what does not fit without a word (item 3.2). `assertQueueFits` in
`packages/codec/src/queue.ts` expands only `0x7F` calls and cannot see these pushes: a codec candidate.

## The prefix fires from 10000, on seven images

The threshold block is

    SETF t; SETF t+1; if flags bit 2: t = 0x0100; else if flags bit 1: t = 0x0010
    then t, t+1 and a cleared third byte are subtracted from the three byte packed value; no borrow spools +0x0B

so with neither flag the threshold is `0x00FFFF`. The packed value's two low bytes hold four decimal digits,
at most `0x9999`, and its high byte holds the count of ten thousands, so the value is at or above the
threshold exactly when that count is not zero: **with neither flag set the prefix fires for every value
from 10000 up**, where `reference/config-format/state.md` said it never fires<!--superseded-->. This file
evaluates that over every value from 0 to 99999 rather than arguing it.

The block sits once in each image, found by its instruction shape and asserted at its address, with the
compare's three registers and the ten thousands loop that increments the compare's high byte:

| image | the block | packed value |
|---|---|---|
| Harmony 885 and 880 4.4 | `0x0194DC` | `0x2BB` |
| Harmony 720 | `0x01956C` | `0x2C3` |
| Harmony 700 2.8 | `0x019C00` | `0xD33` |
| Harmony 600 0.2 | `0x0185CE` | `0xD33` |
| Harmony 650 0.4 | `0x0199E4` | `0xD33` |
| Harmony One 3.4 | `0x02C740` | `0xD28` |
| Harmony 525 | `0x006E5C` | `0x708` |

It matters only for a record whose prefix instruction is not zero and whose flags set neither bit, which no
configuration read holds: the 720's prefix is zero, and the spooler drops a zero instruction (item 3.1).

## The corpus

Base slot 16 is a single zero byte in 15 of the 16 containers, every 880, 885, 880 Pro and `Update` one.
**The Harmony 720's holds one record**, compiled by Logitech, which is what corrects `state.md`'s "every
configuration otherwise examined carries a count of zero"<!--superseded--> and the same sentence in
`gspm.number_senders`' docstring: flags 0, base 0, minimum 0, the three single instructions zero, and three
digit tables at three distinct addresses thirty bytes apart with identical contents, each ten `0x7F` calls
of ten lists, one per digit, each list `7D 04xx; 7C 0400`, a paired send to group 4. Twenty four lists are
`7A nnnn; 1F F300`, a constant into the accumulator and band `0xF3` with record 0, values 602 to 754, all
three digits. No other band from `0xF3` to `0xF6` occurs in any of the sixteen.

**What reaches those twenty four lists**, read in the lab and not asserted here: soft keys of the 720's
favourites mode write a configuration variable with the favourite's index, and that variable's transitions
call them. This file asserts the record and its lists, not the chain.

## The Harmony 720

The 720's routine at `0x193D0` and its band ladder at `0x136AE` are the 885's instruction for instruction as
mnemonic, literal and bit number, except three `MOVLW` that load working register addresses, each eight
higher on the 720, which keeps its scratch eight bytes up.

## Negative results

* No 880, 885 or 880 Pro configuration of the sixteen holds a favourite channel.
* Base slot 17's first byte is zero in all sixteen (`tests/test_harmony_885_slots.py` has the digit entry
  table it heads).
* The prefix threshold is not asserted beyond its block's shape, its compare and the ten thousands loop: the
  rest of each routine on the six other images is not compared here.

## Reviewers

Two, per the `finding` skill. **The blind re-measurement** reproduced the routine, its one caller, the four
bands and where each goes, the unchecked index, the field order, the four spool sites, the table choice, the
threshold block on all seven images with the conversion loops before it identical, the fifteen empty sections
and the 720's record, tables, digit lists and twenty four `1F F300` lists. **It disagreed on one point and was
overruled**: it read flag bit 2 as a threshold of `0x0001`, firing from 1, where the block clears the low byte and
loads 1 into the high one, `0x0100`, a hundred in packed decimal; the literals and their destinations are now
asserted per image, which settles it.

**The prose audit** found sentences wider than their evidence across the four landings, all corrected before
the commit: the silence in front of a device's codes stated as the account's inter device delay on five pages
where only this file's header called it inferred, now inferred on every page; "every code a transition sends
opens with 200, 500, 800 or 1000 ms" where 23 transition records and four device groups sit at 50 ms; counts over
the sixteen containers not saying they are copies of six configurations (800 ms is one device of one
configuration); "every value a multiple of 100 ms" in this file's header, false for the four at 50; the 720
"plays the same way" where only its class 1 start, word and stop are compared; the 720's number sender
"working addresses moved by eight" where only three literals are shown to differ; "within half a percent" put as
a consequence of the rounding where it is a corpus result, 0.45% at worst; the skill's "either plays the same"
unscoped where 237 integer frequencies from 15.7 to 100 kHz differ by one count; a fill "can run past the panel"
stated as a visible effect; "no arch 8 set has a zero count" footnoted as firmware and unasserted, now asserted
(140 sets); a mark of 0 us left out of the underflow; the toggle "per device" where the firmware indexes the
infrared group; the 720's twenty four lists called favourite channels as a measurement where what reaches them
is not asserted; and assertions missing for the picture row's clip, a height of 0, opcode 19 sharing the switch,
the toggle flag handed to the loader, the record's field order and the value added to the base, the alignment
loop, `0x10C14` seeking raw 15, and the picker's test on variable 17, all added. It also listed two codec
comments that still state the old readings, `NumberSender.flags` in `packages/codec/src/tables.ts` (never fires)
and the wide code comment in `packages/codec/src/screen.ts`; `packages/` is outside this landing, so they are
reported as candidates.
"""
import collections
import unittest

import lab
from harmony import ezfile, gspm
from test_harmony_885_start_check import (BASE, CALIBRATION, OTHER_APPLICATIONS, application, by_name, listing, text,
                                          transfers_to, window)

ROUTINE = 0x19340
ROUTINE_END = 0x195F8
LADDER = 0x136DE
SLOT_14_CONSUMER = 0x10C14
SEEKER = 0x191DE
ROUTINE_720 = 0x193D0
LADDER_720 = 0x136AE

#: The prefix threshold block per image: (label, lab name or None for the 885 and 720, load base, address).
THRESHOLDS = (
    ('885', None, BASE, 0x194DC),
    ('720', None, BASE, 0x1956C),
    ('700 2.8', 'h700_code', 0x9000, 0x19C00),
    ('600 0.2', 'h600_code_complete', 0x9000, 0x185CE),
    ('650 0.4', 'h650_code', 0x9000, 0x199E4),
    ('One 3.4', 'one34_code', 0x20000, 0x2C740),
    ('525', 'h525_code', 0x0000, 0x06E5C),
)
#: The block's shape, mnemonics and the literals that carry its meaning.
SHAPE = ['SETF', 'SETF', 'MOVLB', 'BTFSS', 'BRA', 'MOVLB', 'CLRF', 'MOVLW 0x01', 'MOVWF', 'BRA', 'MOVLB', 'BTFSS',
         'BRA', 'MOVLW 0x10']


def containers():
    return [(name, gspm.parse(ezfile.parse_ezhex(blob, name).payload))
            for name, blob in zip(CALIBRATION, by_name(*CALIBRATION))]


def image(name):
    if name is None:
        return None
    lab.require(name)
    return lab.load(name)


def normalised(t):
    return t if t.startswith('MOVLW') else t.split()[0]


def register(t):
    """The file register of a `SUBWF f,W`-like text, as its low eight bits."""
    return int(t.split()[1].split(',')[0], 16) & 0xFF


class TheRoutine(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_bands_F3_and_F5_reach_it_and_F4_and_F6_reach_base_slot_14(self):
        self.assertEqual(window(self.code, LADDER, 28), [
            'MOVLW 0xf6', 'SUBWF 0xb3,W', 'BNC 0x136ee', 'MOVF 0x0a,W', 'MOVLB 0x2', 'MOVWF 0x9c', 'CLRF 0x9d',
            'BRA 0x1370c',
            'MOVLW 0xf5', 'SUBWF 0xb3,W', 'BNC 0x136fe', 'MOVF 0x0a,W', 'MOVLB 0x2', 'MOVWF 0x99', 'CLRF 0x9a',
            'BRA 0x13726',
            'MOVLW 0xf4', 'SUBWF 0xb3,W', 'BNC 0x13716', 'MOVFF 0x30b,0x29c', 'MOVFF 0x30c,0x29d',
            'MOVFF 0x3b2,0x29b', 'CALL 0x10c14', 'BRA 0x139b2',
            'MOVLW 0xf3', 'SUBWF 0xb3,W', 'BC 0x1371e', 'BRA 0x139b2'])
        self.assertEqual(window(self.code, 0x1371E, 4),
                         ['MOVFF 0x30b,0x299', 'MOVFF 0x30c,0x29a', 'MOVFF 0x3b2,0x298', 'CALL 0x19340'])
        self.assertEqual(transfers_to(self.code, ROUTINE), [0x1372A])
        # The other two go to 0x10C14, which seeks raw 15, base slot 14 on this architecture.
        self.assertEqual(window(self.code, SLOT_14_CONSUMER, 4), ['MOVLB 0x0', 'MOVLW 0x0f', 'MOVWF 0xd3',
                                                                'CALL 0x191de'])

    def test_it_runs_after_a_passed_start_check_seeks_raw_17_and_never_checks_the_index(self):
        self.assertEqual(window(self.code, ROUTINE, 17), [
            'MOVLB 0x0', 'MOVLB 0x0', 'MOVF 0x86,W', 'ANDLW 0x04', 'BNZ 0x19356', 'MOVLB 0x0', 'MOVLB 0x0',
            'MOVF 0x86,W', 'ANDLW 0x02', 'BNZ 0x19356', 'BRA 0x195f6', 'MOVLB 0x0', 'MOVLW 0x11', 'MOVWF 0xd3',
            'CALL 0x191de', 'MOVFF 0x298,0x0d7', 'MOVLB 0x0'])
        self.assertEqual(window(self.code, 0x19366, 4), ['MOVLW 0x01', 'MOVWF 0xd6', 'CALL 0x1923a', 'CALL 0x19062'])
        # The record index, 0x298, is read once, into the seek's multiplier: nothing compares it.
        reads = [a for a, i in listing(self.code, ROUTINE, ROUTINE_END)
                 if 'src' in i.fields and i.fields['src'] == 0x298
                 or (i.fields.get('f') == 0x98 and i.mnemonic not in ('MOVWF', 'CLRF', 'SETF'))]
        self.assertEqual(reads, [0x19360])

    def test_flags_base_and_minimum_are_read_in_order_and_the_value_is_added_to_the_base(self):
        self.assertEqual(window(self.code, 0x19372, 24), [
            'CALL 0x19324', 'CALL 0x1908e', 'MOVLB 0x2', 'MOVWF 0xb2', 'MOVLB 0x0', 'MOVLW 0xbe', 'MOVWF 0xcd',
            'MOVLW 0x02', 'MOVWF 0xce', 'CALL 0x190d2', 'MOVFF 0x299,0x000', 'MOVFF 0x29a,0x001', 'CLRF 0x002',
            'MOVF 0x000,W', 'MOVLB 0x2', 'ADDWF 0xbe', 'MOVF 0x001,W', 'MOVLB 0x2', 'ADDWFC 0xbf', 'MOVF 0x002,W',
            'MOVLB 0x2', 'ADDWFC 0xc0', 'CALL 0x1908e', 'MOVLB 0x2'])
        # So: +0x00 the flags into 0x2B2, +0x01 the u24 base into 0x2BE, the value added, +0x04 the minimum.
        self.assertEqual(window(self.code, 0x193AE, 1), ['MOVWF 0xb3'])

    def test_the_ten_thousands_count_is_the_packed_values_high_byte_in_binary(self):
        self.assertEqual(window(self.code, 0x193D0, 15), [
            'MOVLB 0x2', 'CLRF 0xbb', 'CLRF 0xbc', 'CLRF 0xbd', 'MOVLW 0x10', 'MOVLB 0x2', 'SUBWF 0xbe,W',
            'MOVLW 0x27', 'MOVLB 0x2', 'SUBWFB 0xbf,W', 'MOVLW 0x00', 'MOVLB 0x2', 'SUBWFB 0xc0,W',
            'BNC 0x19412', 'MOVLB 0x2'])
        self.assertEqual(window(self.code, 0x193EE, 1), ['INCF 0xbd'])

    def test_four_spools_the_first_the_prefix_one_per_digit_and_the_last(self):
        spools = [(a, text(i)) for a, i in listing(self.code, ROUTINE, ROUTINE_END)
                  if i.fields.get('target') in (0x12F9A, 0x12FE6)]
        self.assertEqual(spools, [(0x193B0, 'CALL 0x12fe6'), (0x19528, 'CALL 0x12f9a'), (0x195CC, 'CALL 0x12fe6'),
                                  (0x195F2, 'CALL 0x12f9a')])
        # The digit spool sits in the loop that runs once per digit, back to 0x19564 until none are left.
        self.assertEqual(window(self.code, 0x19564, 4), ['MOVLB 0x2', 'MOVF 0xb3,W', 'SUBLW 0x00', 'BC 0x195e6'])
        self.assertEqual(window(self.code, 0x195E0, 3), ['MOVLB 0x2', 'DECF 0xb3', 'BRA 0x19564'])

    def test_the_alignment_is_6_minus_count_in_eight_bits(self):
        self.assertEqual(window(self.code, 0x19536, 21), [
            'MOVLW 0x06', 'MOVLB 0x2', 'BSF 0xfd8,0', 'SUBFWB 0xb3,W', 'MOVLB 0x2', 'MOVWF 0xc3', 'MOVLB 0x2',
            'MOVF 0xc3,W', 'SUBLW 0x00', 'BC 0x19560', 'MOVLW 0x04', 'MOVLB 0x2', 'BCF 0xfd8,0', 'RLCF 0xbb',
            'RLCF 0xbc', 'RLCF 0xbd', 'DECF 0xfe8', 'BNZ 0x1954e', 'MOVLB 0x2', 'DECF 0xc3', 'BRA 0x19542'])
        # A minimum of 7 makes the count byte 255, so 255 shifts of four bits, which leave the packed value 0.
        self.assertEqual((6 - 7) & 0xFF, 255)

    def test_the_last_digit_takes_the_last_table_first_then_the_first_then_the_middle(self):
        ins = window(self.code, 0x1957E, 29)
        self.assertEqual(ins[:3], ['MOVLB 0x2', 'DECF 0xb3,W', 'BNZ 0x19594'])
        self.assertEqual([t for t in ins if t.startswith('MOVLW')], ['MOVLW 0x14', 'MOVLW 0x0e', 'MOVLW 0x11'])
        # The first table is taken when the digits left equal the count the loop started with.
        self.assertEqual(window(self.code, 0x19594, 4), ['MOVLB 0x2', 'MOVF 0xb4,W', 'MOVLB 0x2', 'SUBWF 0xb3,W'])
        self.assertEqual(window(self.code, 0x19560, 1), ['MOVFF 0x2b3,0x2b4'])


class ThePrefixFiresFrom10000(unittest.TestCase):
    def images(self):
        out = []
        for label, name, base, address in THRESHOLDS:
            if name is None:
                code = application() if label == '885' else by_name(OTHER_APPLICATIONS['720'])[0]
            else:
                code = image(name)
            out.append((label, code, base, address))
        return out

    def test_the_block_is_at_its_address_and_nowhere_else_on_each_image(self):
        for label, code, base, address in self.images():
            with self.subTest(label):
                rows = [(a, text(i)) for a, i in listing(code, base, base + len(code), base)]
                names = [normalised(t) for _, t in rows]
                hits = [rows[k][0] for k in range(len(names) - len(SHAPE)) if names[k:k + len(SHAPE)] == SHAPE]
                self.assertEqual(hits, [address])

    def test_neither_flag_compares_0x00FFFF_against_the_count_of_ten_thousands(self):
        for label, code, base, address in self.images():
            with self.subTest(label):
                ins = window(code, address, 30, base)
                # SETF t; SETF t+1 is the default; bit 2 gives 0x0100 and bit 1 0x0010.
                t = register(ins[0])
                self.assertEqual(register(ins[1]), t + 1)
                self.assertEqual((ins[3].split(',')[1], ins[11].split(',')[1]), ('2', '1'))
                self.assertEqual(ins[16], 'CLRF %s' % ins[1].split()[1])
                # Bit 2: low byte cleared, high byte 1, so 0x0100. Bit 1: low byte 0x10, high byte cleared, 0x0010.
                self.assertEqual((ins[6], ins[7], ins[8]),
                                 ('CLRF %s' % ins[0].split()[1], 'MOVLW 0x01', 'MOVWF %s' % ins[1].split()[1]))
                self.assertEqual((ins[13], ins[15]), ('MOVLW 0x10', 'MOVWF %s' % ins[0].split()[1]))
                at = next(k for k, x in enumerate(ins) if x.startswith('CLRF 0x') and x.endswith(('002', '016')))
                compare = [x for x in ins[at + 1:at + 10] if x.startswith(('SUBWF', 'SUBWFB'))]
                self.assertEqual([x.split()[0] for x in compare], ['SUBWF', 'SUBWFB', 'SUBWFB'])
                low = register(compare[0])
                self.assertEqual([register(x) for x in compare], [low, low + 1, low + 2])
                self.assertTrue(ins[at + 10].startswith('BNC'), ins[at + 10])
                # The ten thousands loop: 0x2710 compared, and on no borrow the compare's high byte incremented.
                # Bank selects are left out, since each build places them differently.
                before = [text(i) for _, i in listing(code, address - 0x200, address, base)]
                before = [x for x in before if not x.startswith('MOVLB')]
                loops = [k for k in range(len(before) - 8)
                         if [before[k], before[k + 2], before[k + 4]] == ['MOVLW 0x10', 'MOVLW 0x27', 'MOVLW 0x00']
                         and before[k + 6].startswith('BNC') and before[k + 1].endswith(',W')]
                self.assertEqual(len(loops), 1)
                self.assertEqual(before[loops[0] + 7], 'INCF 0x%02x' % (low + 2))

    def test_evaluated_over_every_value_it_fires_exactly_from_10000(self):
        def packed(v):
            rest = v % 10000
            digits = [rest // 1000, rest // 100 % 10, rest // 10 % 10, rest % 10]
            return (v // 10000) << 16 | digits[0] << 12 | digits[1] << 8 | digits[2] << 4 | digits[3]
        thresholds = {'neither': 0x00FFFF, 'bit 1': 0x000010, 'bit 2': 0x000100}
        first = {k: next(v for v in range(100000) if packed(v) >= t) for k, t in thresholds.items()}
        self.assertEqual(first, {'neither': 10000, 'bit 1': 10, 'bit 2': 100})
        # And it stays fired above that, so it is a threshold and not a band.
        self.assertEqual([v for v in range(100000) if (packed(v) >= 0x00FFFF) != (v >= 10000)], [])


class TheCorpus(unittest.TestCase):
    def test_fifteen_hold_no_record_and_the_720s_holds_one(self):
        counts = {}
        for name, c in containers():
            section = c.sections[gspm.arch_slot(c.architecture, gspm.NUMBER_SENDER_SLOT)]
            counts[name] = (c.blob[c.blob_offset_of(section.address)], len(c.number_senders()))
        self.assertEqual(collections.Counter(counts.values()), {(0, 0): 15, (1, 1): 1})
        self.assertEqual(counts['H720-Config.EZHex'], (1, 1))

    def test_the_720s_record_is_Logitechs_three_tables_of_paired_digit_sends(self):
        (c,) = [c for name, c in containers() if name == 'H720-Config.EZHex']
        (record,) = c.number_senders()
        zero = gspm.Instruction(0, 0)
        self.assertEqual((record.flags, record.base, record.digits), (0, 0, 0))
        self.assertEqual((record.prologue, record.epilogue, record.prefix), (zero, zero, zero))
        a, b, d = record.table_addresses
        self.assertEqual((b - a, d - b, record.address - d), (30, 30, 30))
        self.assertEqual(record.first, record.middle)
        self.assertEqual(record.first, record.last)
        lists = c.action_lists()
        sends = []
        for entry in record.first:
            self.assertEqual(entry.opcode, 0x7F)
            body = lists[entry.operand]
            self.assertEqual([(x.opcode, x.operand >> 8) for x in body], [(0x7D, 4), (0x7C, 4)])
            self.assertEqual(body[1].operand & 0xFF, 0)
            sends.append(body[0].operand & 0xFF)
        self.assertEqual(len(set(sends)), 10)

    def test_twenty_four_favourites_load_a_constant_and_hand_it_over_with_band_F3(self):
        bands = collections.Counter()
        favourites = []
        for name, c in containers():
            for li in c.action_lists():
                for k, x in enumerate(li):
                    if 0x1F <= x.opcode <= 0x3E and 0xF3 <= x.operand >> 8 <= 0xF6:
                        bands[(name, x.operand >> 8)] += 1
                        favourites.append(([(y.opcode, y.operand >> 8 if y.opcode == 0x1F else None) for y in li],
                                           li[0].operand, x.operand & 0xFF))
        self.assertEqual(bands, {('H720-Config.EZHex', 0xF3): 24})
        self.assertEqual({(tuple(shape), index) for shape, _, index in favourites},
                         {(((0x7A, None), (0x1F, 0xF3)), 0)})
        values = sorted(value for _, value, _ in favourites)
        self.assertEqual((len(values), len(set(values)), values[0], values[-1]), (24, 24, 602, 754))

    def test_base_slot_17_opens_with_a_zero_in_all_sixteen(self):
        firsts = collections.Counter()
        for name, c in containers():
            section = c.sections[gspm.arch_slot(c.architecture, 17)]
            firsts[c.blob[c.blob_offset_of(section.address)]] += 1
        self.assertEqual(firsts, {0: 16})


class TheHarmony720(unittest.TestCase):
    def test_its_routine_and_ladder_are_the_885s_but_three_working_addresses(self):
        code = application()
        (h720,) = by_name(OTHER_APPLICATIONS['720'])

        def shape(image_, start, count):
            out = []
            for _, ins in listing(image_, start, start + 8 * count):
                f = ins.fields
                out.append((ins.mnemonic, f.get('k'), f.get('b'), f.get('target') is not None))
                if len(out) == count:
                    break
            return out
        ours = shape(code, ROUTINE, 316)
        theirs = shape(h720, ROUTINE_720, 316)
        differ = [(a, b) for a, b in zip(ours, theirs) if a != b]
        self.assertEqual(differ, [(('MOVLW', 0xBE, None, False), ('MOVLW', 0xC6, None, False)),
                                  (('MOVLW', 0xB5, None, False), ('MOVLW', 0xBD, None, False)),
                                  (('MOVLW', 0xB8, None, False), ('MOVLW', 0xC0, None, False))])
        self.assertEqual(shape(code, LADDER, 33), shape(h720, LADDER_720, 33))


if __name__ == '__main__':
    unittest.main()
