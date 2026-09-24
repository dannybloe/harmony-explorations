"""
What the firmware does with a send and with the `0x7C` every send is paired with, on arch 12
(Harmony One). `docs/findings.md` sections 70, 236 and 278.

The finding the reading serves is a hardware one: a composed device whose command lists were the
send alone answered a key press and sent nothing when an activity's transition ran the same list,
and pairing each send with a `0x7C` fixed it. Section 70 had already read the pair and section 236
the queue's consumers; this file makes the producer half executable on the Harmony One and adds
what section 278 read beyond both:

* the dispatcher's `0x7D` and `0x7C` arms call two handlers, and both reach one worker, section 70;
* only the `0x7C` handler sets bit 6 of its device byte, which marks the entry as a quantity,
  section 70;
* the worker's full test compares against `0x1E`, which is the span of the ring
  `tests/test_send_queue.py` already pins, so two fields give one size, section 278;
* the routine that starts the queue writes the handler's priority to `0x119`; the send passes 2,
  the `0x7C` passes 1, and the path after section 236's picker passes 3, section 278.

Why a bare send is not transmitted from a transition is **not** read, and nothing here claims it:
section 236's picker, as read, would let a lone send out. Arch 12 only here; section 70 has the
Harmony 700's pair in prose.
"""
import unittest

import lab
import test_send_queue
from harmony.pic18 import isa

NAME = 'one34_code'
BASE = 0x20000

SEND_ARM = 0x24FEC        # MOVLW 0x7D; SUBWF opcode,W; BNC next; ...; CALL send handler
QUANTITY_ARM = 0x25008    # MOVLW 0x7C; ...; CALL quantity handler
SEND_HANDLER = 0x26F74
QUANTITY_HANDLER = 0x26F96
PUSH_PAIR = 0x26F4E       # full test, empty test, then push 0x6B9 and 0x6BA
PUSH_BYTE = 0x26E30
KICK = 0x26F2A            # priority into 0x119, then start
QUEUE_FULL = 0x26E24      # MOVLW 0x1E; MOVLB 6; SUBWF count,W; BZ full
AFTER_PICKER = 0x277A2    # RCALL picker; IORLW 0; BZ; MOVLB 6; MOVLW 3; MOVWF 0x6B8; CALL kick
PRIORITY_BYTE = 0x119

#: Each handler's length to its `RETLW 0x01`, counted off the listing: fourteen for the send and
#: sixteen for the quantity, which carries the extra `MOVLB` and `BSF` in front. A window of that
#: length is what sees the push, the threshold and the kick, and no further.
SEND_LENGTH = 14
QUANTITY_LENGTH = 16

#: The ring's bounds on this image are section 236's and live in its test, not here.
RING = test_send_queue.IMAGES[NAME]


def window(start, count):
    """`count` decoded instructions from `start`."""
    code = lab.load(NAME)
    out = []
    offset = start - BASE
    for _ in range(count):
        instruction = isa.decode(code, offset, BASE)
        out.append(instruction)
        offset += 2 * instruction.words
    return out


def calls(instructions):
    return [i.fields['target'] for i in instructions if i.mnemonic in ('CALL', 'RCALL')]


class TestTheTwoArms(unittest.TestCase):
    """The dispatcher tests the opcode and hands each to its own handler."""

    def test_each_arm_tests_its_own_opcode_and_calls_its_handler(self):
        lab.require(NAME)
        for arm, opcode, handler in ((SEND_ARM, 0x7D, SEND_HANDLER),
                                     (QUANTITY_ARM, 0x7C, QUANTITY_HANDLER)):
            with self.subTest(opcode=hex(opcode)):
                code = window(arm, 6)
                self.assertEqual((code[0].mnemonic, code[0].fields['k']), ('MOVLW', opcode))
                self.assertEqual(calls(code), [handler])


class TestOneBuffer(unittest.TestCase):
    """Both handlers push through the same routine, so the two instructions share a buffer."""

    def test_both_handlers_push_through_one_routine(self):
        lab.require(NAME)
        for handler, length in ((SEND_HANDLER, SEND_LENGTH), (QUANTITY_HANDLER, QUANTITY_LENGTH)):
            with self.subTest(handler=hex(handler)):
                self.assertEqual(calls(window(handler, length))[:1], [PUSH_PAIR])

    def test_the_routine_pushes_two_bytes_the_handlers_prepared(self):
        """`MOVFF 0x6B9,0x6A8; RCALL push; MOVFF 0x6BA,0x6A8; RCALL push`."""
        lab.require(NAME)
        code = window(PUSH_PAIR, 14)
        moves = [(i.fields['src'], i.fields['dst']) for i in code if i.mnemonic == 'MOVFF']
        self.assertEqual(moves, [(0x6B9, 0x6A8), (0x6BA, 0x6A8)])
        self.assertEqual(calls(code).count(PUSH_BYTE), 2)

    def test_only_the_quantity_marks_its_device_byte(self):
        """`BSF 0x6BD,6` in the `0x7C` handler, and no bit set anywhere in the send handler.

        The negative half is the point: if both set it, the bit could not tell the two apart. It
        walks the send handler whole, to its `RETLW 0x01`, rather than its first few instructions.
        """
        lab.require(NAME)
        quantity = window(QUANTITY_HANDLER, 3)
        self.assertEqual((quantity[0].mnemonic, quantity[0].fields['k']), ('MOVLB', 0x6))
        self.assertEqual((quantity[1].mnemonic, quantity[1].fields['f'], quantity[1].fields['b']),
                         ('BSF', 0xBD, 6))
        self.assertEqual((quantity[2].fields['src'], quantity[2].fields['dst']), (0x6BE, 0x6BA))
        send = window(SEND_HANDLER, SEND_LENGTH)
        self.assertEqual((send[-1].mnemonic, send[-1].fields['k']), ('RETLW', 0x01),
                         'the window ends where the handler does')
        self.assertNotIn('BSF', [i.mnemonic for i in send])


class TestTheFullTestIsTheRing(unittest.TestCase):
    """The worker's full test and section 236's ring bounds are two fields giving one size."""

    def test_the_full_test_literal_is_the_span_of_the_ring(self):
        lab.require(NAME)
        code = window(QUEUE_FULL, 3)
        self.assertEqual((code[0].mnemonic, code[2].mnemonic), ('MOVLW', 'SUBWF'))
        self.assertEqual(code[0].fields['k'], RING['buffer_wrap'] - RING['buffer_start'])
        self.assertEqual(code[0].fields['k'], test_send_queue.QUEUE_BYTES)


class TestTheKick(unittest.TestCase):
    """What starts the queue, and the byte it records a priority in."""

    def test_the_kick_writes_the_priority_into_0x119(self):
        """`MOVFF 0x6B8,0x119` is the kick's first instruction.

        That `0x119` is state variable 17's byte is section 278's reading and rests on section 138's
        base of `0x108`, which `tests/test_clock.py` pins as the seconds field, variable 0. It is not
        re-derived here; what this measures is the address.
        """
        lab.require(NAME)
        first = window(KICK, 1)[0]
        self.assertEqual((first.mnemonic, first.fields['src'], first.fields['dst']),
                         ('MOVFF', 0x6B8, PRIORITY_BYTE))

    def test_the_send_passes_two_and_the_quantity_passes_one(self):
        """Each compares `0x119` against its own priority and kicks only below it."""
        lab.require(NAME)
        for handler, length, priority in ((SEND_HANDLER, SEND_LENGTH, 2),
                                          (QUANTITY_HANDLER, QUANTITY_LENGTH, 1)):
            with self.subTest(handler=hex(handler)):
                code = window(handler, length)
                loads = [i.fields['k'] for i in code if i.mnemonic == 'MOVLW']
                self.assertEqual(loads, [priority, priority],
                                 'the threshold and the priority are one value')
                self.assertIn(KICK, calls(code))

    def test_the_path_after_the_picker_passes_three(self):
        """Which is why the byte's stated range is 0 to 3 and not only what the handlers write."""
        lab.require(NAME)
        code = window(AFTER_PICKER, 7)
        self.assertEqual(code[0].fields['target'], RING['picker'])
        loads = [i.fields['k'] for i in code if i.mnemonic == 'MOVLW']
        self.assertEqual(loads, [3])
        self.assertEqual(calls(code)[-1], KICK)


if __name__ == '__main__':
    unittest.main()
