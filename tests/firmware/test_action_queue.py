"""
The forty instruction ring every action list is spooled into. `docs/findings.md` section 238.

Section 34 found the ring on arch 14 and called it "a queue machine, not an inline interpreter",
and left the machine around it unread. This is that machine, and the part that matters is what
happens at the edge: **every push tests the count first and returns without writing**, so a config
that asks for more than the ring holds does not fail, it quietly does less. That is the hazard
class behind the sequence that hung a Harmony One on 23 August 2026.

The other half is the main loop, which is three calls: execute one instruction, then rotate
whatever it pushed from the tail to the head, then service the rest of the system. That rotate is
what makes opcode `0x7F` a **call** rather than an append, so the ring holds a call stack and its
depth is bounded by nesting. Without it the arithmetic comes out completely differently, and it
did: a first reading of the same routines had a Harmony 700's ordinary activity demanding 169
instructions of a ring that holds 40.

Two images, arch 12 (Harmony One) where the hang was measured and arch 14 (Harmony 600) where the
code is easiest to read. Addresses are recorded per image for `test_interpreter.py`'s reason:
finding them again is a search.
"""
import unittest

import lab
from harmony.pic18 import isa

#: The ring in bytes, stated by the full test's own literal on both images.
QUEUE_BYTES = 0x78
INSTRUCTION_BYTES = 3
QUEUE_INSTRUCTIONS = QUEUE_BYTES // INSTRUCTION_BYTES

IMAGES = {
    'one34_code': {
        'base': 0x20000,
        'init': 0x24AEA,          # sets both cursors to the buffer's start
        'full': 0x24B00,          # count == 0x78
        'push_byte': 0x24B0C,
        'pop_byte': 0x24B40,
        'rotate_byte': 0x24B6E,   # move one byte from the tail to the head
        'event_push': 0x24BF0,    # the 0x1F 0xFC announcement, 21 call sites
        'push_counted': 0x24CD6,  # a whole instruction, counted for the rotate
        'push': 0x24CFE,          # a whole instruction, not counted
        'executor': 0x24DCC,
        'rotate_n': 0x24E08,
        'main_loop': 0x28B32,     # CALL executor, CLRWDT, CALL rotate_n
        'buffer_start': 0x0E29,
        'buffer_wrap': 0x0EA1,
    },
    'h600_code_complete': {
        'base': 0x9000,
        'init': 0x0E3F4,
        'full': 0x0E40A,
        'push_byte': 0x0E416,
        'pop_byte': 0x0E44A,
        'rotate_byte': 0x0E478,
        'event_push': 0x0E51C,
        'push_counted': None,     # not located on this image, and nothing here needs it
        'push': None,
        'executor': 0x0E73A,
        'rotate_n': 0x0E776,
        'main_loop': 0x14FDA,
        'buffer_start': 0x021E,
        'buffer_wrap': 0x0296,
    },
}


def window(name, start, count):
    """`count` decoded instructions from `start`, in the image's own address space."""
    code = lab.load(name)
    base = IMAGES[name]['base']
    out = []
    offset = start - base
    for _ in range(count):
        instruction = isa.decode(code, offset, base)
        out.append(instruction)
        offset += 2 * instruction.words
    return out


class TestTheRing(unittest.TestCase):
    """One hundred and twenty bytes, which is forty three byte instructions and no remainder."""

    def test_the_recorded_bounds_span_the_full_test_s_own_literal(self):
        lab.require('one34_code', 'h600_code_complete')
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                span = at['buffer_wrap'] - at['buffer_start']
                self.assertEqual(span, QUEUE_BYTES)
                self.assertEqual(span % INSTRUCTION_BYTES, 0, 'no part instruction fits')
                self.assertEqual(span // INSTRUCTION_BYTES, QUEUE_INSTRUCTIONS)

    def test_the_full_test_compares_the_count_against_the_ring_s_own_size(self):
        """`MOVLW 0x78; SUBWF count,W; BZ full`, identical on both architectures."""
        lab.require('one34_code', 'h600_code_complete')
        for name in IMAGES:
            with self.subTest(image=name):
                code = window(name, IMAGES[name]['full'], 6)
                loads = [i.fields['k'] for i in code if i.mnemonic == 'MOVLW']
                self.assertEqual(loads, [QUEUE_BYTES])
                self.assertIn('SUBWF', [i.mnemonic for i in code])
                returns = [i.fields['k'] for i in code if i.mnemonic == 'RETLW']
                self.assertEqual(returns, [0x00, 0x01], 'zero for room, one for full')

    def test_the_full_test_is_an_equality_and_not_a_comparison(self):
        """`BZ`, not `BC`, so a count that ever passed `0x78` would never read as full again.

        Nothing can push it past, since the only routine that adds to the count without pushing is
        the executor's retry, which restores exactly the three bytes it popped. Asserted because the
        margin is zero: this is what makes any future writer of that count a hazard.
        """
        lab.require('one34_code', 'h600_code_complete')
        for name in IMAGES:
            with self.subTest(image=name):
                branches = [i.mnemonic for i in window(name, IMAGES[name]['full'], 6)
                            if i.mnemonic.startswith('B') and i.mnemonic not in
                            ('BSF', 'BCF', 'BTG', 'BTFSS', 'BTFSC')]
                self.assertEqual(branches, ['BZ'])

    def test_the_init_points_both_cursors_at_the_buffer(self):
        """The two sixteen bit cursors are seeded with the same address, which is the ring's start."""
        lab.require('one34_code', 'h600_code_complete')
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                loads = [i.fields['k'] for i in window(name, at['init'], 10)
                         if i.mnemonic == 'MOVLW']
                low = at['buffer_start'] & 0xFF
                high = at['buffer_start'] >> 8
                self.assertEqual(loads, [low, high, low, high])


class TestNothingComplainsWhenTheRingIsFull(unittest.TestCase):
    """The reason an overflowing config is a hazard rather than an error."""

    def test_the_event_push_asks_whether_the_ring_is_full_and_returns_if_it_is(self):
        """Call the full test, branch on the answer, and the branch lands on a bare RETURN.

        This is the push behind twenty one announcement sites on arch 12 (Harmony One), a key event
        among them. It reports nothing to its caller: the routine's only exit is `RETURN`, so a
        dropped event and a delivered one are indistinguishable from outside.
        """
        lab.require('one34_code', 'h600_code_complete')
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                code = window(name, at['event_push'], 4)
                self.assertIn(code[0].mnemonic, ('CALL', 'RCALL'))
                self.assertEqual(code[0].fields['target'], at['full'])
                self.assertEqual(code[2].mnemonic, 'BNZ', 'nonzero is full')
                bail = code[2].fields['target']
                self.assertEqual(window(name, bail, 1)[0].mnemonic, 'RETURN',
                                 'the full case returns and says nothing')

    def test_the_instruction_pushes_on_arch_12_check_before_they_count(self):
        """Both three byte pushes test the ring before touching the counter the rotate reads.

        The order is what keeps the rotate honest: a dropped instruction is not counted, so the
        rotate moves exactly what arrived. The instruction is still gone.
        """
        lab.require('one34_code')
        at = IMAGES['one34_code']
        for entry in ('push_counted', 'push'):
            with self.subTest(routine=entry):
                code = window('one34_code', at[entry], 20)
                calls = [i for i in code if i.mnemonic in ('CALL', 'RCALL')]
                self.assertEqual(calls[0].fields['target'], at['full'],
                                 'the full test comes first')
                pushes = [i for i in calls if i.fields['target'] == at['push_byte']]
                self.assertEqual(len(pushes), 3, 'three bytes, once past the test')


class TestTheMainLoopMakesAnAppendIntoACall(unittest.TestCase):
    """Execute one instruction, then rotate what it pushed to the front."""

    def test_the_executor_and_the_rotate_are_adjacent_calls(self):
        lab.require('one34_code', 'h600_code_complete')
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                code = window(name, at['main_loop'], 4)
                self.assertEqual(code[0].mnemonic, 'CALL')
                self.assertEqual(code[0].fields['target'], at['executor'])
                self.assertEqual(code[1].mnemonic, 'CLRWDT')
                self.assertEqual(code[2].mnemonic, 'CALL')
                self.assertEqual(code[2].fields['target'], at['rotate_n'])

    def test_the_rotate_moves_three_bytes_per_counted_instruction(self):
        """A loop over a counter, three byte rotations a turn, and the counter cleared after."""
        lab.require('one34_code', 'h600_code_complete')
        for name, at in IMAGES.items():
            with self.subTest(image=name):
                code = window(name, at['rotate_n'], 14)
                rotations = [i for i in code if i.mnemonic in ('CALL', 'RCALL')
                             and i.fields['target'] == at['rotate_byte']]
                self.assertEqual(len(rotations), INSTRUCTION_BYTES)

    def test_the_byte_rotation_moves_the_tail_to_the_head_and_leaves_the_count(self):
        """It steps both cursors back one and copies one byte, so the ring turns and does not grow.

        The copy is the half that took a second reading: stepping both cursors back alone would
        expose bytes nobody wrote, and what makes it a front insert is the `MOVFF` pair at the end
        moving the byte the tail now points at to the head.
        """
        lab.require('one34_code')
        at = IMAGES['one34_code']
        code = window('one34_code', at['rotate_byte'], 40)
        text = [i.mnemonic for i in code]
        self.assertEqual(text[-1], 'RETURN', 'the window is the whole routine and no more')
        self.assertNotIn('INCF', text, 'nothing is added to the ring')
        moves = [i for i in code if i.mnemonic == 'MOVFF']
        self.assertEqual(len(moves), 6, 'two cursors staged into FSR0 and one byte moved each way')


if __name__ == '__main__':
    unittest.main()
