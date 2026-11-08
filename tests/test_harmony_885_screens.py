"""
The Harmony 880 and 885's screen interpreter: eleven opcodes and an end, opcode 21 an invert, a fill clipped at
160 less `x`, a width of 0 run 256 times, a switch that falls through into the bytes after it, and no wide text
code.

**Read in the firmware** on 4 November 2026, item 3.9 of `todo/todo-prepare-885.md`, in the 885's application
4.4 (`arch8_code_885`, base `0x010000`; the 880's differs in two skin bytes only,
`tests/test_harmony_885_start_check.py`), and compared against the Harmony 720's. **Measured in configurations**
over the sixteen distinct arch 8 containers of that file's `CALIBRATION`, six configurations' lineages, one of
them a Harmony 720's; the counts are sums over copies. No remote was opened. Addresses are the 885
application's. The display controller is reached through the table pointer at `0x1FE0C0` (command) and
`0x1FE0C1` (data), `reference/architectures/harmony-880-885/memory.md`; which part it is, and so what it does
with what it is sent, is not identified.

**Sources checked before the work**: `reference/config-format/screens.md` (the opcode table, read on the
Harmony One 3.4, 600 0.2 and 700 2.8, section 40, with opcode 21's length inferred from four arch 8
configurations; the fill, section 425, not checked on arch 8; opcodes 22 and 23, sections 64, 85 and 185, not
read on arch 8 or 14; where a program ends, section 84; the wide code, section 121; base slot 7's count zero
discriminator, section 78; the renderer's low byte and its row stop at 128, section 50, on the Harmony 700 2.8),
`gspm.SCREEN_FIXED_OPERANDS` and its comment on opcode 21, and items 3.1 and 3.4 of this track. **Logitech's
client, decision 2**: not searched; what an opcode draws is the firmware's alone.

## The dispatcher, `0x17B9C`

It reads one byte, ends the program on 0 (`BZ` at `0x17BA6`), and dispatches on an `XORLW` chain at `0x17BA8`
that decodes to **1, 2, 3, 4, 5, 16, 17, 18, 19, 20 and 21**; every handler returns to the read. **Any other byte
falls out of the chain to the `RETURN` at `0x17BD4` and ends the program as 0 does**: opcodes 6 to 15 and 22 and
up, so **opcodes 22 and 23 do not exist on this platform**, and a stray byte truncates a page with no error.

## Opcode 21 inverts a rectangle

Its handler `0x17790` reads four bytes, `x`, `y`, `width` and `height`, and **no address**, so relocation never
touches it. Per row from `y` while the row is below `y + height` in eight bits, it calls `0x13CDC`, which returns
when `x` is 128 or more or the row 160 or more, takes `min(width, 128 - x)` pixels, sets the controller's row
(`0x75`) and its columns from `x` to 127 (`0x15`, end `0x7F`), issues a read (`0x5D`), discards one byte, reads
the pixels **complementing each byte** (`COMF` at `0x13D62` and `0x13D6A`), and writes them back after a write
command (`0x5C`). So every pixel becomes its inverse, and a second invert of the same cell restores it.

## Opcode 1, the fill

Six bytes as elsewhere. Per row, `0x13EE6` returns on `x` at 128 or more or the row at 160 or more, but **clips
the width to `160 - x`** (`MOVLW 0xA0` at `0x13EF4`) **and sets the column window from `x` to 159** (`MOVLW 0x9F`
at `0x13F5A`), where the invert and the picture rows clip to `128 - x` and 127. So a fill past the right edge
is not stopped at column 127 by the firmware. What the controller does with columns 128 to 159 is not checked.

## A width of 0

The pixel loops of the fill (`0x13F7E`), the invert (`0x13D70`) and the picture row (`0x13E1E`) are `DECFSZ` on
the working register entered with the count, **so a count of 0 runs 256 times**. A height of 0 draws nothing.

## The switch falls through

Opcodes 18 and 19 (`0x17A62`) walk the exact values and then the ranges, and jump on a match through
`0x19062`. **When nothing matches, the handler returns to the dispatcher with the stream just past its range
table** (`BC 0x17B9A` at `0x17B12`, a `RETURN`), so execution continues with the bytes after the switch. In the
corpus 189 switches, all opcode 18: 48 are followed by an end byte and 141 by an instruction, and every one of
those 141 addresses is also a program a root reaches. So the bytes after a switch are its default arm, and
`reference/config-format/screens.md`'s "no execution can reach"<!--superseded--> is wrong on arch 8. Whether
arch 9, 12 and 14 fall through the same way is not checked.

## Text has no wide code

Opcodes 4 and 5 (`0x17994`) read a byte, end on 0, and otherwise draw it: **no bit 7 test anywhere in the
loop**, so a byte with bit 7 set is one code, where `screens.md` says it is the first half of a wide code on
every architecture. The glyph lookup reads the font set's `+0x00` and `+0x02` and throws both away, takes
`+0x01` as the first code, and follows `3 * (code - first)` past the header with **no bound against the count**;
the count zero discriminator of base slot 7 is never applied here. None of the 39174 inline string bytes of
the sixteen has bit 7 set.

## Pictures

The kind byte (`0x141E2`): 1 encoded, 0 raw, **any other kind returns before drawing**. The raw renderer
(`0x1423E`) keeps only the low byte of the stride and the row count and **stops drawing at row 160**
(`MOVLW 0xA0` at `0x14292`), where the Harmony 700's stops at 128. In the corpus opcode 2 names kind 0 6280
times and kind 1 10648 times, and opcode 3 names kind 0 5918 times.

## The corpus

7752 programs reachable, 70958 instructions, none undecodable. Opcode 21 occurs 126 times, 8 in every 880 and
885 container and 6 in the 720's, each the first instruction of its program and followed by its end; the 880
and 885 cells are a two by four grid of 64 by 32 at `x` 0 and 64 and `y` 24, 56, 88 and 120, the 720's 64 by 42
at `y` 24, 66 and 108. What the cells are on the device is inferred in the lab from the geometry, not checked.
Opcode 1 occurs 496 times, one shape, `(0, 0, 128, 160)`. No opcode 1 or 21 crosses 128 by 160 or has a zero
width or height.

## The Harmony 720

The same dispatcher at `0x17C14`, its chain at `0x17C20` decoding to the same eleven cases. Its display driver
is another routine for another controller, but the fill's bounds are the same, `MOVLW 0xA0` at `0x13FBE` and
the column end `0x9F` at `0x14002`.

## Reviewers

Two, per the `finding` skill, over the four files of this landing. **The blind re-measurement** reproduced the dispatcher's eleven opcodes and the end, the silent `RETURN`, the
invert, the fill's `160 - x` and column 159, the 256 run of a zero width, the switch returning past its tables,
no bit 7 test in text, kinds 0 and 1 only, the row stop at 160, the 720's chain, and the corpus counts: programs
and instructions per container, 31 fills of one shape per container, the two invert grids, 189 switches all
opcode 18 with every fall through landing on a reachable program.

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
comments that still state the old readings, `NumberSender.flags` in `packages/codec/src/container/tables.ts` (never fires)
and the wide code comment in `packages/codec/src/screens/screen.ts`; `packages/` is outside this landing, so they are
reported as candidates.
"""
import collections
import unittest

import lab  # noqa: F401, puts `src` on the path
from harmony import ezfile, gspm
from harmony.pic18 import chains
from test_harmony_885_start_check import (BASE, CALIBRATION, OTHER_APPLICATIONS, application, by_name, listing, text,
                                          window)

DISPATCHER = 0x17B9C
IMPLEMENTED = [1, 2, 3, 4, 5, 16, 17, 18, 19, 20, 21]
INVERT = 0x17790
INVERT_ROW = 0x13CDC
FILL_ROW = 0x13EE6
SWITCH = 0x17A62
TEXT = 0x17994
KIND = 0x141E2
RAW = 0x1423E
PICTURE_ROW = 0x13E1E


def containers():
    return [(name, gspm.parse(ezfile.parse_ezhex(blob, name).payload))
            for name, blob in zip(CALIBRATION, by_name(*CALIBRATION))]


def length(ins):
    """Bytes the instruction occupies, opcode included."""
    if ins.opcode == gspm.SCREEN_TEXT_INLINE:
        return 1 + 2 + len(ins.glyphs) + 1
    return 1 + len(ins.operands)


class TheDispatcher(unittest.TestCase):
    def test_eleven_opcodes_and_the_end_and_everything_else_returns(self):
        code = application()
        self.assertEqual(window(code, DISPATCHER, 5),
                         ['CALL 0x1908e', 'MOVLB 0x2', 'MOVWF 0xf5', 'MOVF 0xf5,W', 'BZ 0x17c16'])
        cases = {c.value: c.target for c in chains.xor_chain(code, BASE, 0x17BA8)}
        self.assertEqual(sorted(cases), IMPLEMENTED)
        self.assertEqual(window(code, 0x17BD4, 1), ['RETURN'])
        self.assertEqual(cases[21], 0x17BDA)
        self.assertEqual(window(code, 0x17BDA, 2), ['RCALL 0x17790', 'BRA 0x17b9c'])
        self.assertEqual(window(code, 0x17C16, 1), ['RETURN'])
        # Opcodes 18 and 19 are one handler, told the width by the flag 0x28A.
        self.assertEqual(window(code, cases[18], 3), ['MOVLB 0x2', 'CLRF 0x8a', 'BRA 0x17c12'])
        self.assertEqual(window(code, cases[19], 4), ['MOVLB 0x2', 'MOVLW 0x01', 'MOVWF 0x8a', 'RCALL 0x17a62'])

    def test_the_720s_is_the_same(self):
        (h720,) = by_name(OTHER_APPLICATIONS['720'])
        self.assertEqual(sorted(c.value for c in chains.xor_chain(h720, BASE, 0x17C20)), IMPLEMENTED)


class Opcode21Inverts(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_four_bytes_and_no_address(self):
        ins = window(self.code, INVERT, 12)
        self.assertEqual([x for x in ins if x.startswith('CALL')], ['CALL 0x1908e'] * 4)
        self.assertEqual(ins[-1], 'MOVWF 0xb5')
        # Then the rows: y + height in eight bits, the row routine per row.
        self.assertEqual(window(self.code, 0x177B0, 2), ['MOVF 0xb3,W', 'ADDWF 0xb5'])
        self.assertEqual(window(self.code, 0x177D2, 1), ['CALL 0x13cdc'])
        # A row at or past y + height ends it, so a height of 0 draws nothing.
        self.assertEqual(window(self.code, 0x177C0, 3), ['MOVF 0xb5,W', 'SUBWF 0xb3,W', 'BC 0x177dc'])

    def test_each_row_is_clipped_at_128_and_160_read_complemented_and_written_back(self):
        ins = window(self.code, INVERT_ROW, 80)
        self.assertEqual(ins[:4], ['MOVLW 0x80', 'MOVLB 0x3', 'BSF 0xfd8,0', 'SUBFWB 0xb6,W'])
        self.assertEqual([x for x in ins[6:22] if x.startswith('MOVLW')], ['MOVLW 0x80', 'MOVLW 0xa0'])
        commands = [ins[k + 2] for k in range(len(ins) - 3)
                    if ins[k] == 'MOVLW 0xc0' and ins[k + 1] == 'MOVWF 0xff6']
        self.assertEqual(commands[:4], ['MOVLW 0x75', 'MOVLW 0x15', 'MOVLW 0x5d', 'MOVLW 0x75'])
        self.assertIn('MOVLW 0x7f', ins)
        self.assertEqual(window(self.code, 0x13D60, 6), ['TBLRD*', 'COMF 0xff5', 'MOVFF 0xff5,0xfde', 'TBLRD*',
                                                       'COMF 0xff5', 'MOVFF 0xff5,0xfde'])
        self.assertEqual(window(self.code, 0x13D70, 1), ['DECFSZ 0xfe8,W'])
        after = window(self.code, 0x13D8C, 30)
        self.assertIn('MOVLW 0x5c', after)


class TheFill(unittest.TestCase):
    def test_the_fill_clips_at_160_less_x_and_its_window_ends_at_159(self):
        code = application()
        self.assertEqual(window(code, 0x13EF4, 5), ['MOVLW 0xa0', 'MOVLB 0x3', 'BSF 0xfd8,0', 'SUBFWB 0xbf,W',
                                                  'MOVLB 0x2'])
        self.assertEqual(window(code, 0x13F00, 1), ['MOVLW 0x80'])
        self.assertEqual(window(code, 0x13F10, 1), ['MOVLW 0xa0'])
        self.assertEqual(window(code, 0x13F5A, 2), ['MOVLW 0x9f', 'MOVWF 0xff5'])
        self.assertEqual(window(code, 0x13F7E, 2), ['DECFSZ 0xfe8,W', 'GOTO 0x13f72'])

    def test_the_720s_fill_has_the_same_bounds(self):
        (h720,) = by_name(OTHER_APPLICATIONS['720'])
        self.assertEqual(window(h720, 0x13FBE, 1), ['MOVLW 0xa0'])
        self.assertEqual(window(h720, 0x14002, 1), ['MOVLW 0x9f'])

    def test_a_count_of_0_runs_256_times(self):
        def iterations(count):
            n, w = 0, count
            while True:
                n += 1
                w = (w - 1) & 0xFF
                if w == 0:
                    return n
        self.assertEqual([iterations(c) for c in (0, 1, 128)], [256, 1, 128])
        code = application()
        loops = [t for _, i in listing(code, PICTURE_ROW, PICTURE_ROW + 0xC0) for t in [text(i)]
                 if t.startswith('DECFSZ')]
        self.assertEqual(loops, ['DECFSZ 0xfe8,W'])

    def test_a_picture_row_clips_at_128_less_x_and_160_rows_like_the_invert(self):
        code = application()
        ins = window(code, PICTURE_ROW, 30)
        self.assertEqual(ins[:4], ['MOVLW 0x80', 'MOVLB 0x3', 'BSF 0xfd8,0', 'SUBFWB 0xb9,W'])
        self.assertEqual([x for x in ins[6:22] if x.startswith('MOVLW')], ['MOVLW 0x80', 'MOVLW 0xa0'])
        self.assertEqual(ins[26:29], ['SUBFWB 0xdd,W', 'BC 0x13e5a', 'MOVFF 0x3be,0x2dd'])


class TheSwitchFallsThrough(unittest.TestCase):
    def test_no_match_returns_with_the_stream_past_the_tables(self):
        code = application()
        # The exact count exhausted goes to the ranges, the range count exhausted returns, a match jumps.
        self.assertEqual(window(code, 0x17AA2, 1), ['BC 0x17ae6'])
        self.assertEqual(window(code, 0x17B12, 1), ['BC 0x17b9a'])
        self.assertEqual(window(code, 0x17B9A, 1), ['RETURN'])
        self.assertEqual(window(code, 0x17B6C, 1), ['GOTO 0x19062'])
        self.assertEqual(window(code, 0x17C12, 2), ['RCALL 0x17a62', 'BRA 0x17b9c'])

    def test_189_switches_48_ended_and_141_running_into_a_reachable_program(self):
        after = collections.Counter()
        unreached = 0
        for _, c in containers():
            programs, failed = c.reachable_screen_programs()
            self.assertEqual(failed, [])
            for address, program in programs.items():
                position = address
                for ins in program:
                    if ins.opcode in (gspm.SCREEN_SWITCH_NARROW, gspm.SCREEN_SWITCH_WIDE):
                        nxt = position + length(ins)
                        byte = c.blob[c.blob_offset_of(nxt)]
                        after[(ins.opcode, byte == 0)] += 1
                        if byte and nxt not in programs:
                            unreached += 1
                    position += length(ins)
        self.assertEqual(after, {(18, True): 48, (18, False): 141})
        self.assertEqual(unreached, 0)


class TextHasNoWideCode(unittest.TestCase):
    def test_a_byte_is_a_code_and_the_font_count_is_never_compared(self):
        code = application()
        loop = [text(i) for _, i in listing(code, TEXT, 0x17A62)]
        self.assertEqual([t for t in loop if t.startswith(('BTFSC', 'BTFSS')) and t.endswith(',7')], [])
        # The glyph: +0x00 read and dropped, +0x01 into 0xBA, code - first, +0x02 over 0xBA, then 3 * index.
        self.assertEqual(window(code, 0x17A02, 15), [
            'CALL 0x1908e', 'CALL 0x1908e', 'MOVLB 0x2', 'MOVWF 0xba', 'MOVF 0xba,W', 'SUBWF 0xb8,W', 'MOVWF 0xb9',
            'CALL 0x1908e', 'MOVLB 0x2', 'MOVWF 0xba', 'MOVFF 0x2b9,0x0d7', 'MOVLB 0x0', 'CLRF 0xd6',
            'CALL 0x1923a', 'CALL 0x19062'])
        # The glyph pointer is followed at once: no test of it against zero before the follow.
        self.assertEqual(window(code, 0x17A2C, 2), ['MOVLB 0x3', 'CLRF 0xdc'])

    def test_no_font_set_has_a_zero_count(self):
        counts = collections.Counter()
        for _, c in containers():
            table = c.sections[gspm.arch_slot(c.architecture, 7)]
            at = c.blob_offset_of(table.address)
            for k in range(int.from_bytes(c.blob[at:at + 2], 'little')):
                pointer = int.from_bytes(c.blob[at + 2 + 3 * k:at + 5 + 3 * k], 'little')
                header = c.blob[c.blob_offset_of(pointer):c.blob_offset_of(pointer) + 3]
                counts[(header[1], header[2] == 0)] += 1
        self.assertEqual(sum(counts.values()), 140)
        self.assertEqual({k for k in counts}, {(1, False)})

    def test_no_inline_byte_has_bit_7(self):
        high = total = 0
        for _, c in containers():
            programs, _ = c.reachable_screen_programs()
            for program in programs.values():
                for ins in program:
                    if ins.opcode == gspm.SCREEN_TEXT_INLINE:
                        total += len(ins.glyphs)
                        high += sum(1 for b in ins.glyphs if b & 0x80)
        self.assertEqual((high, total), (0, 39174))


class Pictures(unittest.TestCase):
    def test_kinds_0_and_1_only_and_the_raw_rows_stop_at_160(self):
        code = application()
        self.assertEqual(window(code, KIND, 9), ['CALL 0x1908e', 'MOVLB 0x2', 'MOVWF 0xba', 'MOVF 0xba,W',
                                                 'XORLW 0x01', 'BZ 0x14218', 'XORLW 0x01', 'BZ 0x141f6', 'RETURN'])
        ins = window(code, RAW, 46)
        self.assertEqual(ins[15:22], ['CALL 0x1908e', 'MOVLB 0x2', 'MOVWF 0xd7', 'CALL 0x1908e', 'CALL 0x1908e',
                                      'MOVLB 0x2', 'MOVWF 0xd8'])
        self.assertEqual(window(code, 0x14292, 3), ['MOVLW 0xa0', 'SUBWF 0xd6,W', 'BC 0x142c6'])

    def test_what_the_corpus_names(self):
        kinds = collections.Counter()
        for _, c in containers():
            programs, _ = c.reachable_screen_programs()
            for program in programs.values():
                for ins in program:
                    if ins.opcode in (2, 3):
                        at = c.blob_offset_of(int.from_bytes(ins.operands[-3:], 'little'))
                        kinds[(ins.opcode, c.blob[at])] += 1
        self.assertEqual(dict(kinds), {(2, 0): 6280, (2, 1): 10648, (3, 0): 5918})


class TheCorpus(unittest.TestCase):
    def test_programs_instructions_and_opcodes(self):
        programs = instructions = 0
        opcodes = collections.Counter()
        for _, c in containers():
            found, failed = c.reachable_screen_programs()
            self.assertEqual(failed, [])
            programs += len(found)
            for program in found.values():
                instructions += len(program)
                opcodes.update(ins.opcode for ins in program)
        self.assertEqual((programs, instructions), (7752, 70958))
        self.assertEqual(dict(opcodes), {0: 3493, 1: 496, 2: 16928, 3: 5918, 4: 17153, 5: 6038, 16: 11101,
                                         17: 5446, 18: 189, 20: 4070, 21: 126})

    def test_opcode_21_is_a_grid_of_cells_alone_in_its_program(self):
        cells = collections.defaultdict(collections.Counter)
        alone = collections.Counter()
        for name, c in containers():
            found, _ = c.reachable_screen_programs()
            for program in found.values():
                for k, ins in enumerate(program):
                    if ins.opcode == 21:
                        cells[name == 'H720-Config.EZHex'][tuple(ins.operands)] += 1
                        alone[(k, program[k + 1].opcode)] += 1
        self.assertEqual(alone, {(0, 0): 126})
        grid = {(x, y, 64, 32) for x in (0, 64) for y in (24, 56, 88, 120)}
        self.assertEqual(set(cells[False]), grid)
        self.assertEqual(set(cells[False].values()), {15})
        self.assertEqual(dict(cells[True]), {(x, y, 64, 42): 1 for x in (0, 64) for y in (24, 66, 108)})

    def test_opcode_1_is_one_full_screen_shape_and_nothing_crosses_128_by_160(self):
        fills = collections.Counter()
        crossing = 0
        for _, c in containers():
            found, _ = c.reachable_screen_programs()
            for program in found.values():
                for ins in program:
                    if ins.opcode in (1, 21):
                        x, y, w, h = ins.operands[:4]
                        crossing += x + w > 128 or y + h > 160 or w == 0 or h == 0
                    if ins.opcode == 1:
                        fills[tuple(ins.operands[:4])] += 1
        self.assertEqual(dict(fills), {(0, 0, 128, 160): 496})
        self.assertEqual(crossing, 0)


if __name__ == '__main__':
    unittest.main()
