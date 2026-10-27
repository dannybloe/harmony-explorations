#!/usr/bin/env python3
"""The Harmony 300 and 350's power on delay: what the 1.4 firmware does with a `0x7C`.

`todo-compile-350.md` 1.8 asks for one delay changed on the bench 350 and heard on the infrared
receiver. The question this file answers first is which delay a receiver can hear, and the answer is a
device's **power on delay**: the one `0x7C` at the top level of the list a device's `Power` variable runs
when it goes from off to on, the shape arch 8, 9 and 12 use (the Harmony 880 and 885, the Harmony 525 and
the Harmony One), `reference/config-format/actions.md`. It holds back the **next code to that same
device**, so it is heard as the gap between the power code and the next command sent to that device.

The configuration half, where the delay sits and what values it holds, is
`packages/codec/test/filefamilydelays.test.ts`, since the reader and the edit are TypeScript. This file
holds the firmware half: that this image's `0x7C` is the same queued quantity section 70 read on the
Harmony 700 and the Harmony One, and that this image's tick counts it down per device as section 236
read there.

## What was traced, on the 1.4 image (`h350_code`, load base `0x9000`)

* **The dispatcher's two arms.** The opcode sits in `0x2B5` and the operand in `0x2B3` (low) and
  `0x2B4` (high), which the slots test already uses for `0x74` and `0x3F`. At `0x1134E` the `0x7D` arm
  computes a send kind into `0x203` and calls the **send handler `0x12004`**; at `0x113A0` the `0x7C`
  arm calls the **quantity handler `0x12026`**, handing it the operand's high byte, the infrared group,
  in `0x09C`.
* **The quantity handler is the send handler with one bit set**, section 70's reading on the Harmony
  700 (`0x13102` against `0x130E0`) and the Harmony One (`0x26F96` against `0x26F74`): `0x12026` sets
  bit 6 of the group byte, `BSF 0x09C,6`, the only bit either handler sets, then both push the pair
  through `0x11EFA`, compare a constant with `0x119`, and below it store that constant in `0x097` and
  call `0x11EA6`, whose first instruction copies `0x097` into `0x119`: **1** for the quantity and **2**
  for the send. `0x119` is the Harmony One's priority byte too, `tests/test_one_send_path.py`, written
  the same way with the same two constants, so it is read as the priority here; what consumes it on this
  image is not read.
* **The ring and the fold.** `0x11D8E` reports the queue full when its count in `0x064` is `0x1E`, and
  the ring's pointers wrap from `0x83` back to `0x65`: thirty bytes, the size section 236 and
  `tests/test_send_queue.py` pin on the other images. In `0x11EFA`, an entry with bit 6 set looks at the
  last entry queued: when its tag is the same and its value is not `0x64`, 100, the **larger value is
  kept** (`0x11FAC` to `0x11FF2`), and otherwise the quantity is pushed as an entry of its own. That is
  section 70's fold, refusal at 100 included. It does not say why one configuration spells a wait of
  170 as two `0x7C`, 100 and 70, in a device's power on list and as one of 170 in its activity, which the
  TypeScript test records and nothing here explains.
* **The tick counts a quantity down per device.** At `0x12624` the pass over the ring masks each
  entry's tag with `0xF0`; for kind `0x40`, a quantity, it calls `0x12128` with the group in `0x0A9`, the
  number of entries ahead of it in `0x0AA` and the mode 3 in `0x0A8`, and only when that answers 0 it
  decrements the value, or marks the entry done (`0x60`) once the value is 1 or less. `0x12128` walks
  the entries ahead from the read pointer `0x083`; with mode 3 it keeps each entry's group (bit 0), skips
  an entry already done, compares the entry's group with `0x0A9`, and on a match answers 1 (bit 1),
  `0x12168` to `0x12194`. So "answers 0" is "no entry ahead names this device". So a quantity starts counting
  only once the send in front of it for the same device has gone: the tick's half of section 236's per
  device order, here on arch 16.

## What was not read

* **The tick's rate, and so the unit, is not read on this image.** `0x12624` has one caller, `0x12A76`,
  and what paces it was not followed. The unit the configuration states is the compiler's, and the
  closure in the TypeScript test is that a Harmony 350 programmed with the bench Harmony 600's devices
  states the same three numbers inline that the Harmony 600 states as delay variables, which the 600's
  own screen gives in tenths of a second. Whether this remote waits a tenth of a second per unit is what
  the receiver measures in 1.8.
* The picker, which on the other images emits a send only when no earlier entry names its device, was
  not located here. So that the next code to the device is held until the quantity ends, and a code to
  another device is not, rests on the other images and on the receiver in 1.8, not on this image.
* Why the `0x7D` arm computes a send kind from the operand's high byte, and what the kinds mean.

**Sources checked first.** Logitech's client was not consulted: it builds no section of this container,
`tests/test_harmony_350_slots.py` says why. The archive: sections 70 (`0x7C`'s handler on the Harmony
700 and One, the fold, the cap at 100), 235 (tenths, by the Harmony One against the Harmony 600), 236
(the tick and the picker, per device), 278 (the send pair, which this family keeps on 602 of 602 lists),
86 (a device's `Power` transitions). The reference: `reference/config-format/actions.md` and `state.md`,
and this family's `memory.md` and `firmware.md`. The library: `powerOnInstructions` in
`packages/codec/src/inventory.ts`, which reads this family's delays once base slot 13 is placed.

**Which architectures.** Arch 16 alone: the one 1.4 image, read here as the Harmony 350's
(`h350_code`); Logitech's package names it for skins 78, 79 and 104, so it is the Harmony 300's too on
Logitech's word, and no image was read off a Harmony 300.

**Standing.** Read in the firmware. Nothing was sent to a remote.
"""
import unittest

import lab
from harmony.pic18 import disasm

BASE = 0x9000

SEND_ARM = 0x1134E
SEND_CALL = 0x11388
QUANTITY_ARM = 0x113A0
SEND_HANDLER = 0x12004
QUANTITY_HANDLER = 0x12026
FULL_TEST = 0x11D8E
PUSH_QUANTITY = 0x11F12
FOLD = 0x11FAC
TICK_KIND = 0x12646
TICK_HOLD = 0x12684


def _text(start, count):
    """The listing's instruction text, without address and bytes, as in the slots test."""
    lines = []
    for line in disasm.disassemble(lab.load('h350_code'), BASE, start, count):
        tokens = line.split(':', 1)[1].split()
        while tokens and len(tokens[0]) == 2 and all(c in '0123456789abcdef' for c in tokens[0]):
            tokens.pop(0)
        lines.append(' '.join(tokens))
    return lines


class TheQuantityIsTheSendWithOneBitSet(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')

    def test_each_arm_tests_its_own_opcode_and_calls_its_handler(self):
        self.assertEqual(_text(SEND_ARM, 3), ['MOVLW 0x7d', 'SUBWF 0xb5,B,W', 'BNC 0x113a0'])
        self.assertEqual(_text(SEND_CALL, 4)[1:],
                         ['MOVFF 0x2b3,0x09b', 'MOVFF 0x2b4,0x09a', 'CALL 0x12004'])
        self.assertEqual(_text(QUANTITY_ARM, 6),
                         ['MOVLW 0x7c', 'SUBWF 0xb5,B,W', 'BNC 0x113c4', 'MOVFF 0x2b3,0x09d',
                          'MOVFF 0x2b4,0x09c', 'CALL 0x12026'])

    def test_only_the_quantity_sets_bit_6_and_it_asks_priority_1_where_the_send_asks_2(self):
        send = _text(SEND_HANDLER, 13)
        quantity = _text(QUANTITY_HANDLER, 15)
        self.assertEqual(send, ['MOVFF 0x09b,0x099', 'MOVFF 0x09a,0x098', 'RCALL 0x11efa', 'IORLW 0x00',
                                'BZ 0x12024', 'MOVLW 0x02', 'MOVLB 0x1', 'SUBWF 0x119,W', 'BC 0x12022',
                                'MOVLB 0x0', 'MOVLW 0x02', 'MOVWF 0x097', 'RCALL 0x11ea6'])
        self.assertEqual(quantity, ['MOVLB 0x0', 'BSF 0x09c,6', 'MOVFF 0x09d,0x099', 'MOVFF 0x09c,0x098',
                                    'RCALL 0x11efa', 'IORLW 0x00', 'BZ 0x1204a', 'MOVLW 0x01',
                                    'MOVLB 0x1', 'SUBWF 0x119,W', 'BC 0x12048', 'MOVLB 0x0',
                                    'MOVLW 0x01', 'MOVWF 0x097', 'RCALL 0x11ea6'])
        # 0x11EA6 opens by copying that constant into 0x119, the Harmony One's priority byte.
        self.assertEqual(_text(0x11EA6, 1), ['MOVFF 0x097,0x119'])
        # The control: the send handler sets no bit, so bit 6 is the only bit the quantity adds; the
        # other differences are the constant 2 against 1 and a bank select.
        self.assertFalse([line for line in send if line.startswith('BSF')])
        self.assertEqual([line for line in quantity if line.startswith('BSF')], ['BSF 0x09c,6'])


class TheRingFoldsAQuantityAndRefusesAt100(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')

    def test_the_ring_is_thirty_bytes(self):
        self.assertEqual(_text(FULL_TEST, 6), ['MOVLW 0x1e', 'MOVLB 0x0', 'SUBWF 0x064,W', 'BZ 0x11d98',
                                               'RETLW 0x00', 'RETLW 0x01'])
        # The write pointer wraps at 0x83 back to 0x65, thirty bytes.
        self.assertEqual(_text(0x11DB0, 7), ['MOVLW 0x83', 'SUBWF 0x85,B,W', 'MOVLW 0x00', 'SUBWFB 0x86,B,W',
                                             'BNC 0x11dc2', 'MOVLW 0x65', 'MOVWF 0x85,B'])
        self.assertEqual(0x83 - 0x65, 0x1E)

    def test_a_quantity_folds_into_the_last_entry_for_its_device_keeping_the_larger(self):
        # Bit 6 is what sends an entry down the fold.
        self.assertEqual(_text(PUSH_QUANTITY, 4), ['MOVLW 0x40', 'MOVLB 0x0', 'ANDWF 0x098,W',
                                                   'BZ 0x11ff4'])
        # Same tag as the last entry, else push; that entry's value not 100, else push; and ours
        # smaller than it, else overwrite: the smaller is dropped and the larger kept.
        self.assertEqual(_text(FOLD, 12),
                         ['MOVF 0x03,B,W', 'MOVLB 0x0', 'SUBWF 0x098,W', 'BNZ 0x11ff4', 'MOVLW 0x64',
                          'MOVLB 0xc', 'SUBWF 0xc04,W', 'BZ 0x11ff4', 'MOVF 0x04,B,W', 'MOVLB 0x0',
                          'SUBWF 0x099,W', 'BNC 0x11ff2'])
        # The overwrite writes our value into the last entry, and the push writes tag then value.
        self.assertEqual(_text(0x11FEE, 7),
                         ['MOVFF 0x099,INDF0', 'RETLW 0x01', 'MOVFF 0x098,0x087', 'RCALL 0x11d9a',
                          'MOVFF 0x099,0x087', 'RCALL 0x11d9a', 'RETLW 0x01'])


class TheTickHoldsAQuantityPerDevice(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')

    def test_the_tick_counts_a_quantity_down_only_when_nothing_ahead_names_its_device(self):
        self.assertEqual(_text(TICK_KIND, 5), ['MOVFF INDF0,0xc05', 'MOVLW 0xf0', 'ANDWF 0x05,B,W',
                                               'MOVWF 0x06,B', 'BTFSC 0x06,B,7'])
        # Kind 0x40, the group in the low nibble, and the number of entries ahead in 0x0AA.
        self.assertEqual(_text(0x1266C, 10),
                         ['MOVLW 0x40', 'SUBWF 0x06,B,W', 'BNZ 0x126ba', 'MOVLW 0x0f', 'ANDWF 0x05,B,F',
                          'MOVF 0x02,B,W', 'MOVLB 0x0', 'SUBWF 0x064,W', 'MOVLB 0x0', 'MOVWF 0x0aa'])
        self.assertEqual(_text(TICK_HOLD, 18),
                         ['MOVLB 0x0', 'MOVLW 0x03', 'MOVWF 0x0a8', 'RCALL 0x12128', 'IORLW 0x00',
                          'BNZ 0x1277a', 'MOVFF 0xc00,FSR0L', 'MOVFF 0xc01,FSR0H', 'MOVFF INDF0,0xc07',
                          'MOVLB 0xc', 'MOVF 0xc07,W', 'SUBLW 0x01', 'BC 0x126b4', 'DECF 0x07,B,F',
                          'MOVFF 0xc00,FSR0L', 'MOVFF 0xc01,FSR0H', 'MOVFF 0xc07,INDF0', 'BRA 0x1277a'])
        # A value of 1 or less ends the entry: kind 0x60.
        self.assertEqual(_text(0x126B4, 2), ['MOVLW 0x60', 'MOVWF 0x06,B'])

    def test_the_scan_answers_1_for_an_entry_ahead_naming_the_same_device(self):
        # 0x12128 starts at the read pointer, 0x083 and 0x084, and returns at once with nothing ahead.
        self.assertEqual(_text(0x12128, 5), ['MOVFF 0x083,0xc18', 'MOVFF 0x084,0xc19', 'MOVLB 0x0',
                                             'MOVF 0x0aa,W', 'SUBLW 0x00'])
        # Each entry split into its kind, 0xC1B, and its group, 0xC1A.
        self.assertEqual(_text(0x12140, 7), ['MOVFF INDF0,0xc1a', 'MOVLW 0xf0', 'MOVLB 0xc', 'ANDWF 0xc1a,W',
                                             'MOVWF 0xc1b', 'MOVLW 0x0f', 'ANDWF 0xc1a,F'])
        # The tick passes mode 3: bit 2 clear, so this arm; bit 0 set, so the group is kept; an entry
        # already done is skipped; a group other than 0x0A9 is skipped; and bit 1 set answers 1.
        self.assertEqual(_text(0x12168, 16),
                         ['BTFSC 0xa8,B,0', 'BRA 0x12170', 'MOVLB 0xc', 'CLRF 0xc1a', 'MOVLW 0x60',
                          'MOVLB 0xc', 'SUBWF 0xc1b,W', 'BZ 0x12196', 'MOVLB 0x0', 'MOVF 0x0a9,W',
                          'MOVLB 0xc', 'SUBWF 0xc1a,W', 'BNZ 0x12196', 'MOVLB 0x0', 'BTFSC 0x0a8,1',
                          'BRA 0x12194'])
        self.assertEqual(_text(0x12194, 1), ['RETLW 0x01'])


if __name__ == '__main__':
    unittest.main()
