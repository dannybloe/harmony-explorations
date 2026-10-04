"""Section NNN: how the Harmony 600 and 650 choose which transitions a state write fires.

Read on the 0.2 builds, the 650's own image and the 600's, which hold the walker and both setters byte
for byte alike. Four claims, each pinned to the instructions that carry it:

* **`0xFFFE` is a wildcard and `0xFFFD` means "the value changed"**, on `from` and on `to` alike: the
  `0xFFFD` arm compares the old value with the new one and clears the match when they are equal. Any
  other `from` must equal the old value and any other `to` the new one.
* **Every transition is evaluated, in record order, and every match fires**: the walk stops early
  only when a matching transition's lead byte has bit 7 set, which no transition in the thirteen
  arch 14 compiles carries (895 of 895 are 0).
* **A firing transition appends its instruction to the action queue**, `0x0E674`, the same append a
  list's own instructions take, so a state write inside a transition reaches the same setter and fires
  that variable's transitions in turn. That is the mechanism the LG's `Input` to `Screen` chain and
  Logitech's own Panasonic `Input` to `InputType` chain rely on.
* **The setter remembers the old value before storing the new one**, and skips the walk when the
  silent flag is set, `0x07 0xFFFF`, which is how Logitech's compiler writes a state a power on resets.

The scope test locates the `0xFFFD` comparison, by its instruction pattern, exactly once in each of five
images on two architectures, which says where the walker is and not that the others are identical.
"""

import re
import unittest

import lab
from harmony.pic18 import isa

BASE = 0x9000
ONE_BASE = 0x20000

#: The 0.2 builds: the walker, the plain setter and the step setter after it, through the record seek.
WALKER = 0x1613E
SETTER = 0x16360
SPAN_END = 0x16538
BUILDS_02 = ('h600_code_complete', 'h650_bench_code')

#: `MOVLW 0xFD; XORWF from_lo; BNZ +2; SETF WREG`: the `0xFFFD` test on `from`, per image.
SENTINEL = re.compile(rb'\xfd\x0e..\x02\xe1\xe8\x68', re.S)
SENTINEL_AT = {
    'h600_code_complete': (BASE, 0x161A2),
    'h650_bench_code': (BASE, 0x161A2),
    'h650_code': (BASE, 0x178DE),
    'h700_code': (BASE, 0x17B06),
    'one34_code': (ONE_BASE, 0x2A3DE),
}


def _at(code, address):
    return isa.decode(code, address - BASE, BASE)


class TheWalkerIsOneRoutineOnBothZeroTwoBuilds(unittest.TestCase):

    def test_the_600_and_the_650_hold_the_walker_and_the_setters_byte_for_byte(self):
        lab.require(*BUILDS_02)
        a, b = (lab.load(name)[WALKER - BASE:SPAN_END - BASE] for name in BUILDS_02)
        self.assertEqual(len(a), SPAN_END - WALKER)
        self.assertEqual(a, b)

    def test_the_from_sentinel_is_found_once_per_image_at_its_address(self):
        lab.require(*SENTINEL_AT)
        for name, (base, address) in SENTINEL_AT.items():
            with self.subTest(name):
                hits = [base + m.start() for m in SENTINEL.finditer(lab.load(name))]
                self.assertEqual(hits, [address])


class TheWalkerMatchesOnTwoSentinelsAndOnValues(unittest.TestCase):

    def setUp(self):
        lab.require('h650_bench_code')
        self.code = lab.load('h650_bench_code')

    def _is(self, address, mnemonic, **fields):
        one = _at(self.code, address)
        self.assertEqual(one.mnemonic, mnemonic, hex(address))
        for key, value in fields.items():
            self.assertEqual(one.fields[key], value, f'{hex(address)} {key}')
        return one

    def test_the_match_starts_true_and_from_0xfffd_compares_old_with_new(self):
        self._is(0x1619E, 'MOVLW', k=1)
        self._is(0x161A0, 'MOVWF', f=0x34)                   # 0xD34, the match
        self._is(0x161A2, 'MOVLW', k=0xFD)
        self._is(0x161A4, 'XORWF', f=0x30)                   # from, low byte, 0xD30
        self._is(0x161A8, 'SETF', f=0xE8)                    # 0xFF for the high byte
        self.assertEqual(self._is(0x161AC, 'BZ').fields['target'], 0x161C8)
        # The arm: the old value 0xED4 against the new 0xED6, both bytes, equal clears the match.
        self._is(0x161CA, 'MOVF', f=0xD4)
        self._is(0x161CC, 'XORWF', f=0xD6)
        self._is(0x161D0, 'MOVF', f=0xD5)
        self._is(0x161D2, 'XORWF', f=0xD7)
        # Which way the arm goes: a difference in either byte branches past the clear, so only an equal
        # old and new value clears the match. An arm that cleared on a difference would fail here.
        self.assertEqual(self._is(0x161CE, 'BNZ').fields['target'], 0x161E8)
        self.assertEqual(self._is(0x161D4, 'BNZ').fields['target'], 0x161E8)
        self._is(0x161D8, 'CLRF', f=0x34)

    def test_from_0xfffe_skips_the_comparison_and_anything_else_must_equal_the_old_value(self):
        self._is(0x161AE, 'MOVLW', k=0xFE)
        self.assertEqual(self._is(0x161B8, 'BZ').fields['target'], 0x161E8)   # straight to `to`
        self._is(0x161BC, 'MOVF', f=0xD4)                    # the old value
        self._is(0x161C0, 'XORWF', f=0x30)                   # against from
        # A low byte that differs lands on the BZ at 0x161E4 with Z clear, so it falls into the clear; an
        # equal one goes to the high byte, and an equal high byte branches past the clear.
        self.assertEqual(self._is(0x161C2, 'BNZ').fields['target'], 0x161E4)
        self.assertEqual(self._is(0x161C4, 'BRA').fields['target'], 0x161DC)
        self._is(0x161DE, 'MOVF', f=0xD5)
        self._is(0x161E2, 'XORWF', f=0x31)
        self.assertEqual(self._is(0x161E4, 'BZ').fields['target'], 0x161E8)
        self._is(0x161E6, 'CLRF', f=0x34)

    def test_to_takes_the_same_two_sentinels_and_otherwise_must_equal_the_new_value(self):
        self._is(0x161E8, 'MOVLW', k=0xFD)
        self._is(0x161EC, 'XORWF', f=0x32)                   # to, low byte, 0xD32
        # `to` 0xFFFD: the same arm as `from`'s, old against new, a difference skipping the clear.
        self.assertEqual(self._is(0x161F4, 'BZ').fields['target'], 0x16206)
        self._is(0x16208, 'MOVF', f=0xD4)
        self._is(0x1620A, 'XORWF', f=0xD6)
        self.assertEqual(self._is(0x1620C, 'BNZ').fields['target'], 0x16230)
        self.assertEqual(self._is(0x16212, 'BNZ').fields['target'], 0x16230)
        self._is(0x16216, 'CLRF', f=0x34)
        # `to` 0xFFFE skips to the end of the test.
        self._is(0x161F6, 'MOVLW', k=0xFE)
        self.assertEqual(self._is(0x16200, 'BZ').fields['target'], 0x16230)
        # Any other `to` must equal the new value: a differing low byte reaches the clear with Z clear,
        # an equal value branches past it.
        self._is(0x1621C, 'MOVF', f=0xD6)                    # the new value
        self._is(0x16220, 'XORWF', f=0x32)
        self.assertEqual(self._is(0x16222, 'BNZ').fields['target'], 0x1622C)
        self.assertEqual(self._is(0x1622C, 'BZ').fields['target'], 0x16230)
        self._is(0x1622E, 'CLRF', f=0x34)

    def test_a_match_with_lead_zero_appends_the_instruction_and_only_bit_7_stops_the_walk(self):
        # 0xD36 is set only by a match whose lead byte 0xD2F has bit 7 set.
        self._is(0x16232, 'CLRF', f=0x36)
        self._is(0x16238, 'BTFSS', f=0x2F, b=7)
        self._is(0x1623E, 'MOVWF', f=0x36)
        self._is(0x16240, 'BCF', f=0x2F, b=7)
        # No match leaves 0xD36 clear: the stop is tested only under a match.
        self.assertEqual(self._is(0x16236, 'BZ').fields['target'], 0x16240)
        self._is(0x16246, 'MOVF', f=0x2F)                    # lead 0 takes the plain arm
        # The append is gated on the match: no match branches to the end of the transition.
        self._is(0x1624A, 'MOVF', f=0x34)
        self.assertEqual(self._is(0x1624C, 'BNZ').fields['target'], 0x16250)
        self.assertEqual(self._is(0x1624E, 'BRA').fields['target'], 0x16344)
        self.assertEqual(self._is(0x16250, 'CALL').fields['target'], 0x0E674)
        # After each transition: 0xD36 set returns, otherwise the count goes down and the loop goes on.
        self._is(0x1634E, 'MOVF', f=0x36)
        self._is(0x16352, 'RETURN')
        self.assertEqual(self._is(0x1635C, 'BRA').fields['target'], 0x16164)
        # And nothing else returns: the walker holds exactly two RETURNs, the stop and the end of the
        # count, so there is no first match exit hiding elsewhere in it.
        returns, address = [], WALKER
        while address < SETTER:
            one = _at(self.code, address)
            if one.mnemonic == 'RETURN':
                returns.append(address)
            address += 2 * one.words
        self.assertEqual(returns, [0x16352, 0x1635E])

    def test_a_list_call_appends_its_instructions_through_the_same_routine(self):
        # 0x7F's handler loops over the list's count and calls the append the walker calls, which reads
        # three bytes at the flash cursor and goes on to the queue append at 0x0E628.
        # The dispatcher's call for 0x7F, section 74, names this handler on the 650's build.
        self.assertEqual(self._is(0x0E8E4, 'CALL').fields['target'], 0x1A15A)
        self.assertEqual(self._is(0x1A18A, 'CALL').fields['target'], 0x0E674)
        self.assertEqual(self._is(0x0E67E, 'CALL').fields['target'], 0x17F1C)    # read three bytes
        self.assertEqual(self._is(0x0E68E, 'GOTO').fields['target'], 0x0E628)

    def test_what_one_instruction_appends_runs_next_because_the_loop_rotates_it_to_the_head(self):
        # The append puts an instruction on the queue's tail, so on its own it would run after
        # everything queued before it, breadth first, which is what the blind reviewer read. The main
        # loop is what makes it a call: right after popping and running one instruction it calls a
        # routine that moves the instructions that one appended from the tail to the head.
        self.assertEqual(self._is(0x14FDA, 'CALL').fields['target'], 0x0E73A)    # pop and run one
        self.assertEqual(self._is(0x14FE0, 'CALL').fields['target'], 0x0E776)    # then rotate
        # The rotate: 0x203 times, three byte moves, one per byte of an instruction, then 0x203 cleared.
        self._is(0x0E77C, 'MOVF', f=0x03)
        for address in (0x0E786, 0x0E788, 0x0E78A):
            self.assertEqual(self._is(address, 'RCALL').fields['target'], 0x0E478)
        self._is(0x0E794, 'CLRF', f=0x03)
        # One byte move: both pointers step back, wrapping, and the byte the write pointer now names is
        # copied to where the read pointer now names. Taking the tail's last byte first and placing it
        # before the head keeps the moved instructions in their order.
        self._is(0x0E47A, 'DECF', f=0x96)
        self._is(0x0E49A, 'DECF', f=0x98)
        self.assertEqual(self._is(0x0E4BA, 'MOVFF').fields['src'], 0x298)
        self.assertEqual(self._is(0x0E4C6, 'MOVFF').fields['src'], 0x296)


class TheSetterWalksWithTheOldValueUnlessSilent(unittest.TestCase):

    def setUp(self):
        lab.require('h650_bench_code')
        self.code = lab.load('h650_bench_code')

    def test_the_old_value_is_read_before_the_store_and_handed_to_the_walk(self):
        self.assertEqual(_at(self.code, 0x16364).fields['target'], 0x164C4)    # read the variable
        self.assertEqual(_at(self.code, 0x16366).fields['dst'], 0xD40)
        self.assertEqual(_at(self.code, 0x1637A).fields['target'], 0x16474)    # then store the new
        silent = _at(self.code, 0x1637E)
        self.assertEqual((silent.mnemonic, silent.fields['f']), ('MOVF', 0xD8))
        branch = _at(self.code, 0x16380)                                      # silent: no walk
        self.assertEqual((branch.mnemonic, branch.fields['target']), ('BNZ', 0x163A0))
        self.assertEqual((_at(self.code, 0x1638A).fields['src'], _at(self.code, 0x1638A).fields['dst']),
                         (0xEDA, 0xED6))                                     # new
        self.assertEqual((_at(self.code, 0x16392).fields['src'], _at(self.code, 0x16392).fields['dst']),
                         (0xD40, 0xED4))                                     # old
        self.assertEqual(_at(self.code, 0x1639A).fields['target'], WALKER)


if __name__ == '__main__':
    unittest.main()
