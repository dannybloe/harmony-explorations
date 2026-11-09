"""
The Harmony 880 and 885's section seeker: one routine, no checks, sixteen raw slots named by literals, and
a base slot 17 the firmware reads as a digit entry table.

**Read in the firmware** on 4 November 2026, item 3.4 of `todo/todo-prepare-885.md`, in the 885's
application 4.4 (`arch8_code_885`, base `0x010000`; the 880's and the 880 Pro's differ in two skin bytes,
`tests/harmony_880_885/test_harmony_885_start_check.py`) and the Harmony 720's application. **Measured in configurations**
over the sixteen distinct arch 8 containers of that file's `CALIBRATION`. No remote was opened. Addresses
are the 885 application's.

**Sources checked before the work**: `reference/config-format/container.md`, "One table, four
architectures" (section 16: base slot `b` at raw `b`, at `b + 1` from 8 up on arch 8, raw 8 a NULL),
`reference/config-format/README.md`'s slot table (section 45 and 62: base slot 17 the Harmony One's touch
hit map, elsewhere where the picture bank starts), `reference/config-format/modes-and-keys.md` "Base slot
8" (section 83: the leading list is four bytes on arch 8), `tests/harmony_300_350/test_harmony_350_slots.py` (the Harmony
350's raw slot 12, a digit entry table driven by opcode `0x74`), and the earlier 885 tests, which name the
seeker and several of its consumers. **Logitech's client, decision 2**: not searched for this item, since
the question is which section the firmware reads, which no client answers.

## The seeker

`0x191DE`: `MOVLW 4; MULWF 0xD3`, the product's low byte back into `0xD3`, `MOVLW 0x0B; ADDWF 0xD3`, copied to
`0xD2`; then `0x191C2` puts the read cursor at the configuration's base plus that offset (the user one or
the built in one by data `0x086` bit 3, `tests/harmony_880_885/test_harmony_885_start_check.py`), `0x1908E` reads the
spare byte and `0x19062` the three byte pointer, which `W` from the spare does not reach. **It checks
nothing**: no NULL test, no bound against the pointer count, no bound against the container's end. A NULL in
a sought slot would put the cursor at `0x000000`, the bootloader; that consequence is inferred.

**Twenty two calls, each right after `MOVLW <raw slot>; MOVWF 0xD3`**, so every seek's slot is a literal
and the census is the whole map. They name sixteen raw slots, 2 to 7 and 9 to 18, which are exactly
`arch_slot(8, b)` for base slots 2 to 17. Raw 0, 1, 8, 19 and 20 are never sought: base slots 0 and 1 are
the host's, and the other three are NULL in every container. So the arch 8 numbering in the reference is
confirmed by the firmware. Several consumers are named by other tests, which ties the census to them: raw
2 is the log set up (`tests/harmony_880_885/test_harmony_885_log_area.py`), raw 14 the state loader `0x172AA`
(`tests/harmony_880_885/test_harmony_885_state.py`), raw 16 the parameter guard `0x10E1A`
(`tests/harmony_880_885/test_harmony_885_parameters.py`), raw 13 the timer poll and start
(`tests/harmony_880_885/test_harmony_885_timers.py`), raw 3 the stamp's two readers (`tests/harmony_880_885/test_harmony_885_stamp.py`).

The 720's application seeks the same literals in the same order, through its own seeker at `0x1926E`.

## Base slot 8's leading list runs only when it holds exactly one instruction

The tail of the start check, `0x1727A`: after a configuration passed, it seeks raw 9 (base slot 8), reads
the first byte and runs `SUBLW 0x01; BNZ` (`0x1729C`): only a count of exactly 1 spools the one
instruction after it (`0x12FE6`) and rotates it to the head (`0x130CC`). Two or more and nothing runs, with
no error. Sixteen of sixteen containers open the section `01 0A 00 7F`, one instruction, `0x7F 0x000A`.

## Base slot 17 is read as a digit entry table, on this platform

**Raw 18 is sought twice, by `0x19658` and `0x196C6`**, and both read it as the structure
`tests/harmony_300_350/test_harmony_350_slots.py` describes for the Harmony 350's raw slot 12: a `u8` count, then
three byte pointers to entries, an entry a flags byte, a digit count and a timeout, then either a number
conversion or a list of digit strings each with an instruction. The arm, `0x19658`, seeks raw 18, steps
the cursor by `1 + 3 * index` through `0x1923A` with `0xD6` set to 1, follows the pointer and reads the three
bytes into `0x247`, `0x246` and `0x248`. Opcode `0x74` stores a digit (`0x13370` calls `0x195FA`), and the
finish `0x196C6` re-seeks the same way, then on flags bit 0 shifts up to six four bit digits into a 24 bit
number (`0x1970A`, the bound `MOVLW 0x06`).

**No routine reads the count byte.** Both seeks step over it to `1 + 3 * index`. The arm is gated on
`0x24C`, and that byte is not the count: the `0x3F` band `0xE0` switches on its low nibble (the chain at
`0x13576`), and case 0 sets `0x24C` to 1 and arms, case 1 clears it and calls the same routine, which then
disarms, case 2 cancels the entry the operand's low byte names and case 3 finishes it. **The result note
for this item said `0x24C` was the table's count**<!--superseded-->; the number sender's reading, item 3.7,
corrected it, and the chain is asserted here.

**What this does not settle**: the reference calls base slot 17 the Harmony One's touch hit map, and the
same routine was seen by eye at base slot 17 on the Harmony 700 and 525 and at the One's raw 18. That is a
cross architecture question with a slot map behind it and is not asserted here; this file says what arch 8
reads and nothing wider.

**No action list in the corpus drives it**: base slot 17 opens `00 00` in sixteen of sixteen containers,
and no action list holds opcode `0x74` (`tests/harmony_880_885/test_harmony_885_actions.py`) or a `0x3F` instruction in the
`0xE0` band. Transitions, base slot 8's bindings and the tagged lists were not searched. The sixteen are
copies of six configurations.

**What is not asserted**: the arm of the finish that matches a list of entered strings, which is read by
eye, and any comparison with the Harmony 350's table beyond the shape named above.

## Reviewers

Two, per the `finding` skill; their findings are in the landing commit's message.
"""
import unittest

import lab
from harmony import gspm
from harmony.pic18 import chains
from .test_harmony_885_actions import containers
from .test_harmony_885_start_check import (BASE, CODE_END, OTHER_APPLICATIONS, application, by_name, listing, text,
                                          transfers_to, window)

SEEKER = 0x191DE
SEEKER_720 = 0x1926E
LEADING_LIST = 0x1727A
ARM = 0x19658
STORE = 0x195FA
FINISH = 0x196C6
STEP = 0x1923A
BAND_E0_CHAIN = 0x13576
ARM_FLAG = 0x4C            # bank 2, so 0x24C
#: Consumers other tests name, by the call site of the seek inside them.
NAMED_CONSUMERS = {0x1A000: 2, 0x172C8: 14, 0x10E2E: 16, 0x16088: 13, 0x16150: 13, 0x15016: 3, 0x155AC: 3}


def seeks(code, seeker, base=BASE, end=CODE_END):
    """(call address, the literal loaded into 0xD3 just before) for every call of the seeker."""
    ins = [(a, text(i)) for a, i in listing(code, base, end, base)]
    at = {a: n for n, (a, _) in enumerate(ins)}
    out = []
    for call in transfers_to(code, seeker, end, base):
        n = at[call]
        load, store = ins[n - 2][1], ins[n - 1][1]
        out.append((call, int(load.split()[1], 16) if load.startswith('MOVLW') and store == 'MOVWF 0xd3' else None))
    return out


class TheSeeker(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_it_computes_four_times_the_slot_plus_0x0B_and_checks_nothing(self):
        self.assertEqual(window(self.code, SEEKER, 10),
                         ['MOVLW 0x04', 'MOVLB 0x0', 'MULWF 0xd3', 'MOVFF 0xff3,0x0d3', 'MOVLW 0x0b', 'ADDWF 0xd3',
                          'MOVFF 0x0d3,0x0d2', 'RCALL 0x191c2', 'RCALL 0x1908e', 'GOTO 0x19062'])

    def test_twenty_two_calls_each_after_a_literal_naming_sixteen_raw_slots(self):
        found = seeks(self.code, SEEKER)
        self.assertEqual(len(found), 22)
        self.assertNotIn(None, [slot for _, slot in found])
        self.assertEqual(sorted({slot for _, slot in found}), [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])

    def test_the_raw_slots_sought_are_base_slots_2_to_17_by_the_arch_8_map(self):
        sought = {slot for _, slot in seeks(self.code, SEEKER)}
        self.assertEqual(sought, {gspm.arch_slot(8, b) for b in range(2, 18)})
        self.assertEqual(sorted(set(range(21)) - sought), [0, 1, 8, 19, 20])

    def test_the_consumers_other_tests_name_seek_the_slots_they_are_named_for(self):
        found = dict(seeks(self.code, SEEKER))
        self.assertEqual({call: found[call] for call in NAMED_CONSUMERS}, NAMED_CONSUMERS)

    def test_the_720_seeks_the_same_literals_in_the_same_order(self):
        (h720,) = by_name(OTHER_APPLICATIONS['720'])
        self.assertEqual(window(h720, SEEKER_720, 10)[4:7], ['MOVLW 0x0b', 'ADDWF 0xd3', 'MOVFF 0x0d3,0x0d2'])
        ours = [slot for _, slot in seeks(self.code, SEEKER)]
        theirs = [slot for _, slot in seeks(h720, SEEKER_720)]
        self.assertEqual(theirs, ours)
        self.assertEqual(len(theirs), 22)


class TheLeadingList(unittest.TestCase):
    def test_it_runs_only_when_its_count_is_exactly_one(self):
        self.assertEqual(window(application(), LEADING_LIST + 0x16, 8),
                         ['MOVLW 0x09', 'MOVWF 0xd3', 'CALL 0x191de', 'CALL 0x1908e', 'SUBLW 0x01', 'BNZ 0x172a8',
                          'CALL 0x12fe6', 'CALL 0x130cc'])

    def test_every_container_holds_one_instruction_there(self):
        opened = {}
        for name, c in containers():
            off = c.blob_offset_of(c.sections[gspm.arch_slot(8, 8)].address)
            opened[name] = c.blob[off:off + 4]
        self.assertEqual(set(opened.values()), {bytes([0x01, 0x0A, 0x00, 0x7F])})
        self.assertEqual(len(opened), 16)


class BaseSlot17IsADigitEntryTable(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_both_seeks_of_raw_18_step_over_the_count_without_reading_it(self):
        found = dict(seeks(self.code, SEEKER))
        self.assertEqual(sorted(call for call, slot in found.items() if slot == 18), [0x19668, 0x196E0])
        for call in (0x19668, 0x196E0):
            with self.subTest(seek=hex(call)):
                # The index into 0xD7, 1 into 0xD6, then the step, then the pointer: no read between the seek
                # and the step, so the count byte is skipped, not read.
                self.assertEqual(window(self.code, call + 4, 6)[1:],
                                 ['MOVLB 0x0', 'MOVLW 0x01', 'MOVWF 0xd6', 'CALL 0x1923a', 'CALL 0x19062'])
        # The step is 3 * index plus 0xD6.
        self.assertEqual(window(self.code, STEP, 13)[1:12:],
                         ['MOVF 0xd7,W', 'MOVLB 0x2', 'MOVWF 0xdc', 'CLRF 0xdd', 'MOVLW 0x03', 'MULWF 0xdd',
                          'MOVFF 0xff3,0x2dd', 'MULWF 0xdc', 'MOVFF 0xff3,0x2dc', 'MOVF 0xff4,W', 'ADDWF 0xdd'])

    def test_the_arm_is_gated_on_a_flag_and_reads_flags_digits_and_timeout(self):
        arm = window(self.code, ARM, 26)
        self.assertEqual(arm[:3], ['MOVLB 0x2', 'MOVF 0x4c,W', 'BZ 0x1969e'])
        self.assertEqual([arm[n] for n in (16, 19, 22, 23)],
                         ['MOVWF 0x47', 'MOVWF 0x46', 'MOVWF 0x48', 'MOVFF 0x24b,0x24d'])

    def test_the_flag_is_set_and_cleared_by_the_0x3F_band_E0_and_is_not_the_count(self):
        table = chains.chain_table(self.code, BASE, BAND_E0_CHAIN)
        self.assertEqual(sorted(table), [0, 1, 2, 3])
        self.assertEqual(window(self.code, table[0], 5),
                         ['MOVLB 0x2', 'MOVLW 0x01', 'MOVWF 0x4c', 'BRA 0x13594', 'MOVLB 0x2'])
        self.assertEqual(window(self.code, table[1], 4),
                         ['MOVLB 0x2', 'CLRF 0x4c', 'MOVFF 0x3b2,0x24b', 'CALL 0x19658'])
        self.assertEqual(window(self.code, table[2], 2), ['MOVFF 0x3b2,0x24d', 'CALL 0x196aa'])
        self.assertEqual(window(self.code, table[3], 2), ['MOVFF 0x3b2,0x24e', 'CALL 0x196c6'])
        # The only callers of the arm and the finish, so nothing reaches either with the count.
        self.assertEqual(transfers_to(self.code, ARM), [0x13598])
        self.assertEqual(transfers_to(self.code, FINISH), [0x135AC, 0x1963A, 0x197EC])

    def test_opcode_0x74_stores_a_digit_and_the_finish_converts_at_most_six(self):
        self.assertEqual(window(self.code, 0x13362, 6),
                         ['MOVLW 0x74', 'SUBWF 0xb4,W', 'BNC 0x13376', 'MOVFF 0x3b2,0x24a', 'MOVFF 0x3b3,0x249',
                          'CALL 0x195fa'])
        self.assertEqual(transfers_to(self.code, STORE), [0x13370])
        self.assertEqual(window(self.code, 0x19700, 7),
                         ['MOVLB 0x2', 'BTFSS 0x47,0', 'BRA 0x19770', 'MOVFF 0x242,0x2b2', 'MOVLW 0x06', 'MOVLB 0x2',
                          'SUBWF 0xb2,W'])

    def test_every_container_holds_an_empty_table_and_no_action_list_drives_it(self):
        opened, driven = {}, []
        for name, c in containers():
            off = c.blob_offset_of(c.sections[gspm.arch_slot(8, 17)].address)
            opened[name] = c.blob[off:off + 2]
            for li in c.action_lists():
                for ins in li:
                    if ins.opcode == 0x74 or (ins.opcode == 0x3F and 0xE0 <= ins.operand >> 8 <= 0xEF):
                        driven.append((name, ins))
        self.assertEqual(set(opened.values()), {b'\x00\x00'})
        self.assertEqual(len(opened), 16)
        self.assertEqual(driven, [])

    def test_the_slots_never_sought_are_null_in_every_container(self):
        nulls = {name: tuple(raw for raw in range(21) if c.sections[raw].address == 0) for name, c in containers()}
        self.assertEqual(set(nulls.values()), {(8, 19, 20)})
        self.assertEqual(len(nulls), 16)


if __name__ == '__main__':
    unittest.main()
