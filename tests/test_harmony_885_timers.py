"""
The Harmony 880 and 885's timers: two at once, a third start lost, a running index started again run
twice, one instruction fired, none kept across a restart; and on six images a duration past 65535 seconds
wraps rather than being clamped.

**Read in the firmware** on 4 November 2026, item 3.6 of `todo/todo-prepare-885.md`, in the 885's
application 4.4 (`arch8_code_885`, base `0x010000`) and the Harmony 720's, and for the duration compare in
the Harmony 700 2.8 (`h700_code`), the Harmony 600 0.2 complete image (`h600_code_complete`), the Harmony
650 0.4 (`h650_code`) and the Harmony One 3.4 (`one34_code`), which are the four images section 43 read.
**Measured in configurations** over the sixteen distinct arch 8 containers of
`tests/test_harmony_885_start_check.py`'s `CALIBRATION`. No remote was opened. Addresses are the 885
application's unless named.

**Sources checked before the work**: `reference/config-format/state.md`, "Base slot 12: the timer table"
(section 43: four entries on the Harmony 700, 600, 650 and One, the start `1F EBxx` and cancel `1F EAxx`, the
seven byte record, one instruction fired, and "the scheduled kind clamps the duration to sixteen bits"<!--superseded-->),
the `writing-a-config` skill's timer row, `TIMER_SLOTS_IN_RAM` in `src/harmony/gspm.py` and
`packages/codec/src/tables.ts`, and section 43 in the archive, which states the clamp at its line about the
scheduled path and gives the one second tick. **Logitech's client, decision 2**: not searched; how many
timers the firmware holds and what it does with a long duration are the firmware's alone.

## Two at once

The table is two entries of five bytes at data `0x223`: every index computation in the application of the
form `MULLW 0x05` then `+0x223`, 43 of them, sits in one block from `0x15FB4` to `0x16654`, and every loop
bound over those indices is the literal 2, seven of them, one per routine: the init `0x15FA2`, the poll
`0x16008`, the start `0x160F2`, the cancel `0x162D2`, the cancel all `0x163BE`, the countdown of kind 0
`0x1648A` and the scheduled expiry `0x16536`. **The same census on the Harmony 700 image finds section
43's 30 sites at `0x6E5` and loop bounds of 4, never 2**, which is the control: the census tells the two
apart. An entry is `{u8 flags; u8 index; u24 remaining}`, flags bit 0 armed.

**The start, `0x160F2`, takes the first entry that is not armed**, testing only each entry's armed bit on
the way, so while a place is free a running index started again takes it and fires twice. **With both
armed it falls into a scan of both indices, `0x1627A` to `0x162D0`, that compares the index with each entry,
calls nothing and returns either way**, so a third start is lost with no error and nothing queued. The
index is not checked against the record count either: the count is read into `0x2B4` (`0x1615A`) and that
byte is not read again in the routine. **The cancel, `0x162D2`, disarms every entry whose index equals the
one it is given** (`0x230`), so a cancel before a restart takes both copies.

**One instruction fires.** The poll takes an armed entry whose 24 bit remaining is zero, **clears its armed
bit first** (`0x16080`), seeks raw slot 13 (base slot 12), steps to the record, skips four bytes, the kind
and the duration, reads three into `0x2B3` to `0x2B5`, copies them to `0x39E` to `0x3A0` and pushes them
with `0x12EE8`. A timer whose instruction restarts its own index is therefore safe.

**Nothing survives a restart**: main calls the scheduler's init `0x14FDA` at `0x16D32` and the timer init
`0x15FA2` at `0x16D3E` at every start, before the main loop.

## The duration is not clamped, on six images

The start reads the record's kind and its three duration bytes in read order, so the first duration byte
lands at the lowest address, here `0x2B5` to `0x2B7`. For the scheduled kind it then runs

    MOVLW 0xFF; BSF STATUS,C; SUBFWB lo,W; MOVLW 0xFF; SUBFWB hi,W; BC keep; SETF; SETF; BRA
    keep: MOVFF lo; MOVFF hi
    then: the chosen two bytes into 0x000 and 0x001, CLRF 0x002

`SUBFWB f,W` is `W - f - !C`. With the carry set and `W = 0xFF`, `0xFF - f` never borrows, so the carry is
still set after the first, and the second is the same; **the `BC` is always taken and the two `SETF` that
would load `0xFFFF` never run**. This file evaluates the pair over every `lo` and `hi` rather than arguing
it. The third byte is never part of the compare, and what is stored is the low two bytes and a zero. So
**only the duration's low sixteen bits are kept**: `65536 + n` seconds is stored as `n`. What the remote
then does with a stored value of zero, whether it fires at the next poll or never, is not asserted here.

The compare, its two `SETF`, the store of the low two bytes and the `CLRF` of the third are at:

| image | the compare | the record's duration in RAM |
|---|---|---|
| Harmony 885 and 880 | `0x0161A2` | `0x2B5` |
| Harmony 720 | `0x01621A` | `0x2BD` |
| Harmony 700 2.8 | `0x0175E8` | `0xD2D` |
| Harmony 600 0.2 | `0x015C98` | `0xD2D` |
| Harmony 650 0.4 | `0x0173C0` | `0xD2D` |
| Harmony One 3.4 | `0x029EDE` | `0xD3C` |

and on the four named, the register the compare reads is the destination the record reader was given, and
that reader stores its three bytes at `+0`, `+1` and `+2` in read order, so the compare is over the
duration's first two bytes. On the 885 and the 720 the compare is the scheduled kind's: the kind's bit 0
is tested just before it (`BTFSS` at `0x16188` and `0x16200`). **This corrects section 43 and `reference/config-format/state.md`**, which said
the scheduled kind clamps the duration to sixteen bits so that more than 65535 becomes 65535<!--superseded-->:
the compare that looks like a clamp cannot take its clamp arm. The writer's rule did not change in
practice, since no arch 8 configuration read asks for more than 30 seconds and every rule written already
said stay at or below 65535. **Whether anything later on the 600, 650, 700 or One reads the
record's third byte is not read**; the Harmony 525's start was not looked at.

## The corpus

The sixteen containers are copies of six configurations, five of the 880 and 885 and one of the 720. 282
timer records over the sixteen, every one kind 1, durations from 1 to 30 seconds; every index any
action list starts or cancels is below its container's count. **No screen's opening starts more than
two**, its mode record's tag 6 entry with calls followed and conditions ignored: 2255 start one, 32 of them
after a cancel all, and 96, six per container, start two, every one after a cancel all. Whether a screen
that starts one, without a cancel all, can find both entries already taken by timers started elsewhere is
not measured, since that needs the order things run in rather than a count.

## Reviewers

Two, per the `finding` skill; their findings are in the landing commit's message.
"""
import collections
import unittest

import lab
from test_harmony_885_actions import containers
from test_harmony_885_start_check import (BASE, CODE_END, OTHER_APPLICATIONS, application, by_name, listing, text,
                                          transfers_to, window)

START = 0x160F2
FULL_SCAN = (0x1627A, 0x162D0)
POLL = 0x16008
INIT = 0x15FA2
SCHEDULER_INIT = 0x14FDA
TABLE = 0x223
COUNT_REGISTER = 0xB4       # bank 2, so 0x2B4
#: The duration compare, per image: (lab name, load base, the compare's address, where the reader is told to
#: store, the reader). The 885's reader is `0x190D2`; the 720 is tested against the 885 directly.
COMPARES = {
    'Harmony 700 2.8': ('h700_code', 0x9000, 0x175E8, 0x175C0, 0x10A8E),
    'Harmony 600 0.2': ('h600_code_complete', 0x9000, 0x15C98, 0x15C70, 0x17F1C),
    'Harmony 650 0.4': ('h650_code', 0x9000, 0x173C0, 0x17398, 0x10A6E),
    'Harmony One 3.4': ('one34_code', 0x20000, 0x29EDE, 0x29EB6, 0x2B93C),
}
COMPARE_885 = 0x161A2
COMPARE_720 = 0x1621A


def subfwb(w, f, carry):
    """`SUBFWB f,W`: W - f - !C, returning (result, carry), the carry set when nothing was borrowed."""
    value = w - f - (0 if carry else 1)
    return value & 0xFF, value >= 0


def the_clamp_arm_runs(lo, hi):
    """Whether the compare's two `SETF` would run for this low and high byte."""
    _, carry = subfwb(0xFF, lo, True)
    _, carry = subfwb(0xFF, hi, carry)
    return not carry


def stores(code, base, reader):
    """The offsets from the destination the reader's three stores land at, from its own instructions.

    The destination is reloaded into `FSR0` before each byte; `MOVF 0xFEE` (a dummy read of `POSTINC0`) moves
    it on by one, and `MOVLW 2; ADDWF 0xFE9` by two. A store is a write to `INDF0`.
    """
    ins = window(code, reader, 40, base)
    out, offset = [], 0
    for n, t in enumerate(ins):
        if t.startswith('MOVFF') and t.endswith(',0xfe9'):
            offset = 0
        elif t == 'MOVF 0xfee':
            offset += 1
        elif t == 'ADDWF 0xfe9' and ins[n - 1] == 'MOVLW 0x02':
            offset += 2
        elif t in ('MOVWF 0xfef',) or (t.startswith('MOVFF') and t.endswith(',0xfef')):
            out.append(offset)
        if len(out) == 3:
            break
    return out


class TwoTimersAtOnce(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def census(self, code, base, end, low, high):
        """Every `MULLW 0x05` index computation onto the table, and the loop bounds over its index registers."""
        ins = [(a, text(i)) for a, i in listing(code, base, end, base)]
        sites, registers = [], set()
        for n in range(1, len(ins) - 7):
            if ins[n][1] == 'MULLW 0x05' and [t for _, t in ins[n + 3:n + 7]] == \
                    ['MOVLW 0x%02x' % low, 'ADDWF 0xfe9', 'MOVLW 0x%02x' % high, 'ADDWFC 0xfea']:
                sites.append(ins[n][0])
                registers.add(ins[n - 1][1].split()[1].rstrip(',W'))
        bounds = collections.Counter()
        for n in range(len(ins) - 1):
            a, t = ins[n]
            if sites[0] - 0x80 <= a < sites[-1] + 0x80 and t.startswith('MOVLW') and ins[n + 1][1].startswith('SUBWF'):
                if ins[n + 1][1].split()[1].rstrip(',W') in registers:
                    bounds[int(t.split()[1], 16)] += 1
        return sites, bounds

    def test_the_table_is_two_entries_of_five_bytes_at_0x223(self):
        sites, bounds = self.census(self.code, BASE, CODE_END, TABLE & 0xFF, TABLE >> 8)
        self.assertEqual((len(sites), sites[0], sites[-1]), (43, 0x15FB4, 0x16654))
        self.assertEqual(bounds, {2: 7})

    def test_the_same_census_finds_four_on_the_harmony_700(self):
        """The control: section 43's table of four, read by the same census."""
        lab.require('h700_code')
        code = lab.load('h700_code')
        sites, bounds = self.census(code, 0x9000, 0x9000 + len(code), 0xE5, 0x06)
        self.assertEqual(len(sites), 30)
        self.assertIn(4, bounds)
        self.assertNotIn(2, bounds)

    def test_the_start_takes_the_first_entry_not_armed_testing_only_the_armed_bit(self):
        self.assertEqual(window(self.code, START, 6)[1:],
                         ['CLRF 0xb2', 'MOVLW 0x02', 'SUBWF 0xb2,W', 'BNC 0x160fe', 'BRA 0x162d0'])
        loop = window(self.code, START + 0x0C, 12)
        self.assertEqual(loop[-4:], ['MOVF 0xfef,W', 'ANDLW 0x01', 'BZ 0x1611a', 'BRA 0x1627a'])
        self.assertEqual(window(self.code, 0x1612E, 1), ['BSF 0xfef,0'])

    def test_a_full_table_calls_nothing_and_returns(self):
        body = [text(i) for _, i in listing(self.code, *FULL_SCAN)]
        self.assertEqual([t for t in body if t.split()[0] in ('CALL', 'RCALL', 'GOTO')], [])
        self.assertEqual(body.count('RETURN'), 1)
        self.assertEqual(window(self.code, FULL_SCAN[1], 1), ['RETURN'])
        # The scan compares the index with each entry, returns on a match, and loops back into the start's
        # own bound, which then returns at 0x162D0.
        self.assertIn('SUBWF 0x2f,W', body)
        self.assertIn('BRA 0x160f6', body)

    def test_a_cancel_disarms_every_entry_with_its_index(self):
        body = [text(i) for _, i in listing(self.code, 0x162D2, 0x16312)]
        self.assertEqual(body[2:5], ['MOVLW 0x02', 'SUBWF 0xb2,W', 'BC 0x163bc'])
        self.assertIn('SUBWF 0x30,W', body)
        self.assertEqual(window(self.code, 0x16310, 1), ['BCF 0xfef,0'])

    def test_the_index_is_not_checked_against_the_count(self):
        body = [text(i) for _, i in listing(self.code, START, FULL_SCAN[1])]
        self.assertEqual(window(self.code, 0x16154, 3), ['CALL 0x1908e', 'MOVLB 0x2', 'MOVWF 0xb4'])
        self.assertEqual([t for t in body if '0xb4' in t or '0x2b4' in t], ['MOVWF 0xb4'])

    def test_the_poll_disarms_first_and_pushes_one_instruction(self):
        self.assertEqual(window(self.code, 0x16080, 1), ['BCF 0xfef,0'])
        self.assertEqual(window(self.code, 0x160BC, 15),
                         ['CALL 0x1908e', 'CALL 0x1908e', 'CALL 0x1908e', 'CALL 0x1908e', 'MOVLB 0x0', 'MOVLW 0xb3',
                          'MOVWF 0xcd', 'MOVLW 0x02', 'MOVWF 0xce', 'CALL 0x190d2', 'MOVFF 0x2b3,0x39e',
                          'MOVFF 0x2b4,0x39f', 'MOVFF 0x2b5,0x3a0', 'CALL 0x12ee8', 'MOVLB 0x2'])

    def test_every_start_clears_both_inits(self):
        self.assertEqual(window(self.code, 0x16D32, 4)[0::3], ['CALL 0x14fda', 'CALL 0x15fa2'])
        self.assertEqual(transfers_to(self.code, INIT), [0x16D3E])
        self.assertEqual(transfers_to(self.code, SCHEDULER_INIT), [0x16D32])


class TheDurationWraps(unittest.TestCase):
    def test_the_compare_never_takes_its_clamp_arm(self):
        runs = sum(the_clamp_arm_runs(lo, hi) for lo in range(256) for hi in range(256))
        self.assertEqual(runs, 0)

    def test_the_arithmetic_would_catch_a_real_compare(self):
        """The control: with the carry cleared first, or a literal below 0xFF, the arm does run."""
        _, carry = subfwb(0xFF, 0x10, False)
        self.assertTrue(carry)
        _, carry = subfwb(0xFE, 0xFF, True)
        self.assertFalse(carry)

    def assert_the_shape(self, code, base, at, register):
        lo, hi = register & 0xFF, (register + 1) & 0xFF
        ins = window(code, at, 14, base)
        self.assertEqual(ins[:6], ['MOVLW 0xff', 'BSF 0xfd8,0', 'SUBFWB 0x%02x,W' % lo, 'MOVLW 0xff',
                                   'SUBFWB 0x%02x,W' % hi, ins[5]])
        self.assertTrue(ins[5].startswith('BC '))
        self.assertTrue(ins[6].startswith('SETF') and ins[7].startswith('SETF') and ins[8].startswith('BRA'))
        self.assertEqual(ins[9:11], ['MOVFF 0x%03x,%s' % (register, ins[9].split(',')[1]),
                                     'MOVFF 0x%03x,%s' % (register + 1, ins[10].split(',')[1])])
        self.assertEqual(ins[13], 'CLRF 0x002')
        self.assertEqual([ins[11].split(',')[1], ins[12].split(',')[1]], ['0x000', '0x001'])

    def test_the_885_stores_the_low_two_bytes_and_a_zero(self):
        code = application()
        self.assertEqual(window(code, 0x16188, 2), ['BTFSS 0xb3,0', 'BRA 0x1623a'])
        self.assert_the_shape(code, BASE, COMPARE_885, 0x2B5)
        self.assertEqual(stores(code, BASE, 0x190D2), [0, 1, 2])
        self.assertEqual(window(code, 0x1617A, 5),
                         ['MOVLW 0xb5', 'MOVWF 0xcd', 'MOVLW 0x02', 'MOVWF 0xce', 'CALL 0x190d2'])

    def test_the_720_has_the_same_compare_over_the_first_two_bytes(self):
        (h720,) = by_name(OTHER_APPLICATIONS['720'])
        self.assert_the_shape(h720, BASE, COMPARE_720, 0x2BD)
        self.assertEqual(window(h720, COMPARE_720 - 0x28, 5),
                         ['MOVLW 0xbd', 'MOVWF 0xcd', 'MOVLW 0x02', 'MOVWF 0xce', 'CALL 0x19162'])
        self.assertEqual(stores(h720, BASE, 0x19162), [0, 1, 2])
        self.assertEqual(window(h720, 0x16200, 1), ['BTFSS 0xbb,0'])

    def test_the_four_images_section_43_read_have_the_same_compare_over_the_first_two_bytes(self):
        for model, (name, base, at, given, reader) in COMPARES.items():
            with self.subTest(model=model):
                lab.require(name)
                code = lab.load(name)
                load = window(code, given, 5, base)
                self.assertEqual([load[0].split()[0], load[1].split()[0], load[2].split()[0], load[4]],
                                 ['MOVLW', 'MOVWF', 'MOVLW', 'CALL 0x%05x' % reader])
                destination = int(load[2].split()[1], 16) << 8 | int(load[0].split()[1], 16)
                self.assert_the_shape(code, base, at, destination)
                self.assertEqual(stores(code, base, reader), [0, 1, 2])


class TheCorpus(unittest.TestCase):
    def test_282_records_all_kind_1_of_at_most_30_seconds(self):
        kinds, durations, records = collections.Counter(), collections.Counter(), 0
        for _, c in containers():
            for t in c.timers():
                records += 1
                kinds[t.kind] += 1
                durations[t.duration] += 1
        self.assertEqual(records, 282)
        self.assertEqual(kinds, {1: 282})
        self.assertEqual(durations, {1: 16, 2: 16, 3: 96, 4: 106, 5: 4, 10: 37, 20: 6, 30: 1})

    def test_every_index_an_action_list_names_is_below_the_count(self):
        named = outside = 0
        for _, c in containers():
            count = len(c.timers())
            for li in c.action_lists():
                for ins in li:
                    if ins.opcode == 0x1F and ins.operand >> 8 in (0xEA, 0xEB):
                        named += 1
                        outside += (ins.operand & 0xFF) >= count
        self.assertEqual((named, outside), (1002 + 304, 0))

    def test_no_screen_opening_starts_more_than_two_and_those_with_two_cancel_all_first(self):
        def events(lists, index, seen=frozenset()):
            if index in seen or index >= len(lists):
                return []
            out = []
            for ins in lists[index]:
                out.extend(event(lists, ins, seen | {index}))
            return out

        def event(lists, ins, seen):
            if ins.opcode == 0x7F:
                return events(lists, ins.operand, seen)
            if ins.opcode == 0x1F and ins.operand >> 8 == 0xEB:
                return [('start', ins.operand & 0xFF)]
            if ins.opcode == 0x07 and ins.operand & 0xFF == 0xFB:
                return [('cancel all', None)]
            return []

        shapes = collections.Counter()
        for name, c in containers():
            lists = c.action_lists()
            for record in c.mode_records() or []:
                found = []
                for e in record.entries or []:
                    if e.tag == 6:
                        found.extend(event(lists, e, frozenset()))
                starts = [i for kind, i in found if kind == 'start']
                if starts:
                    shapes[(len(starts), found[0][0])] += 1
        self.assertEqual(shapes, {(1, 'start'): 2223, (1, 'cancel all'): 32, (2, 'cancel all'): 96})


if __name__ == '__main__':
    unittest.main()
