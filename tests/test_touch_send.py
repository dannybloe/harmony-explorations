"""
How a touch on the Harmony One's screen reaches the infrared, against a hard key. `docs/findings.md`
section 337.

The question came from the bench: a command touched on the One's screen seems to go out a moment
later than the same command on a key. The configuration answers half of it, and
`packages/codec/test/touch.test.ts` asserts that half: every screen binding that sends infrared runs
the click `0x75 0x0FCA` first, and no key binding does. This file asserts the firmware half, on the
Harmony One 3.4 application image only:

* the click instruction hands its operand to the tone generator, which returns only when the tone has
  played, about 26 ms by section 74's arithmetic, unless the sound gate is zero. What the executor does
  after that, one instruction per main loop turn, is section 337's prose and is not asserted here;
* a touch posts press, release and repeat events built from `0x202`, the touch code, through the same
  event poster the keypad uses, so a touch is a key to everything after the poster;
* the infrared streamer's hold flag is also set while `0x202` is nonzero, so a held touch repeats its
  code as a held key does, which section 127 described for the keypad alone.

Everything is asserted against decoded instructions, so a wrong opcode table in `isa.py` fails these
too. Addresses are the 3.4 image's, recorded because finding them again is a search.
"""
import unittest

import lab
from harmony.pic18 import isa

ONE_BASE = 0x20000

# The executor's arm for `0x75`: the operand's two bytes to the generator's two parameters, then the
# generator itself. `0xEBD` and `0xEBE` are where the executor leaves an operand's low and high byte.
CLICK_ARM = 0x25100
OPERAND_LOW, OPERAND_HIGH = 0x0EBD, 0x0EBE
HALF_PERIOD, CYCLES = 0x0F1A, 0x0F19
GENERATOR = 0x2411E
DELAY_LOOP = 0x2CCC4
# `LATG`, bit 0 of which is the beeper per section 74.
LATG = 0x8F
# Section 74's sound gate, set by `0x3F` with high byte `0xF3`.
SOUND_GATE = 0x0E12

# The event poster both input routines call, and the touch code it is handed.
POSTER = 0x24BF0
TOUCH_CODE = 0x202
KEYPAD_CODE = 0x2FB
HOLD_FLAG = 0x6AB
HOLD_BIT = 2

# Section 17's event types in the top two bits of a key code.
RELEASE, PRESS, REPEAT = 0x40, 0x80, 0xC0


def at(address):
    """The instruction decoded at `address` in the 3.4 application image."""
    return isa.decode(lab.load('one34_code'), address - ONE_BASE, ONE_BASE)


class TheClickIsPlayedBeforeTheGeneratorReturns(unittest.TestCase):
    """The generator is a busy loop that returns when the tone is over, or at once with the gate shut."""

    def setUp(self):
        lab.require('one34_code')

    def test_the_click_instruction_hands_its_operand_to_the_tone_generator(self):
        self.assertEqual((at(CLICK_ARM).mnemonic, at(CLICK_ARM).fields['k']), ('MOVLW', 0x75))
        self.assertEqual(at(0x25106).fields, {'src': OPERAND_LOW, 'dst': HALF_PERIOD})
        self.assertEqual(at(0x2510A).fields, {'src': OPERAND_HIGH, 'dst': CYCLES})
        self.assertEqual((at(0x2510E).mnemonic, at(0x2510E).fields['target']), ('CALL', GENERATOR))

    def test_each_cycle_toggles_the_beeper_twice_and_waits_in_a_busy_loop_after_each(self):
        # So a cycle is two half periods and the whole tone is spent inside the call, with nothing
        # else running but the watchdog clear at the top of the loop.
        steps = [(0x24158, 'CLRWDT'), (0x2415A, 'BTG'), (0x24164, 'CALL'), (0x24168, 'BTG'),
                 (0x24172, 'CALL'), (0x24178, 'INCF'), (0x2417E, 'BRA')]
        for address, mnemonic in steps:
            self.assertEqual(at(address).mnemonic, mnemonic, hex(address))
        for toggle in (0x2415A, 0x24168):
            self.assertEqual((at(toggle).fields['f'], at(toggle).fields['b'], at(toggle).fields['a']),
                             (LATG, 0, 0))
        for call in (0x24164, 0x24172):
            self.assertEqual(at(call).fields['target'], DELAY_LOOP)
        # Back to the loop test, which compares the count against `CYCLES`, and out only through it.
        self.assertEqual(at(0x2417E).fields['target'], 0x24144)
        self.assertEqual((at(0x24146).mnemonic, at(0x24146).fields['f']), ('MOVF', CYCLES & 0xFF))
        self.assertEqual((at(0x24156).mnemonic, at(0x24156).fields['target']), ('BC', 0x24180))
        self.assertEqual(at(0x24180).mnemonic, 'RETURN')

    def test_with_the_sound_gate_shut_the_generator_returns_at_once(self):
        # Section 74's gate: `0xE12` zero branches straight to the RETURN.
        self.assertEqual((at(0x24136).mnemonic, at(0x24136).fields['k']), ('MOVLB', SOUND_GATE >> 8))
        self.assertEqual((at(0x24138).mnemonic, at(0x24138).fields['f']), ('MOVF', SOUND_GATE & 0xFF))
        self.assertEqual((at(0x2413A).mnemonic, at(0x2413A).fields['target']), ('BNZ', 0x2413E))
        self.assertEqual((at(0x2413C).mnemonic, at(0x2413C).fields['target']), ('BRA', 0x24180))

    def test_the_busy_wait_is_a_counted_loop_and_not_a_timer(self):
        # `0x2CCC4` divides its argument by four and counts it down with NOPs in the body.
        for address in (0x2CCD0, 0x2CCD2, 0x2CCD6, 0x2CCD8):
            self.assertEqual(at(address).mnemonic, 'RRCF', hex(address))
        self.assertEqual(at(0x2CCEA).mnemonic, 'DECF')
        self.assertEqual((at(0x2CCF0).mnemonic, at(0x2CCF2).mnemonic), ('NOP', 'NOP'))


class ATouchIsAKeyAfterThePoster(unittest.TestCase):
    """Press, release and repeat are built from the touch code and posted where the keypad posts."""

    def setUp(self):
        lab.require('one34_code')

    def test_the_touch_routine_posts_all_three_event_types_from_the_touch_code(self):
        # (the MOVLW that carries the event type, the CALL to the poster)
        posts = {RELEASE: [(0x25F24, 0x25F2E), (0x25F8A, 0x25F94)],
                 PRESS: [(0x25F50, 0x25F5A)],
                 REPEAT: [(0x25FBC, 0x25FC6)]}
        for kind, sites in posts.items():
            for literal, call in sites:
                self.assertEqual((at(literal).mnemonic, at(literal).fields['k']), ('MOVLW', kind))
                # MOVLB 2, then IORWF 0x202,W: the event type joined to the touch code.
                self.assertEqual((at(literal + 2).mnemonic, at(literal + 2).fields['k']), ('MOVLB', 2))
                self.assertEqual((at(literal + 4).mnemonic, at(literal + 4).fields['f']),
                                 ('IORWF', TOUCH_CODE & 0xFF))
                self.assertEqual((at(call).mnemonic, at(call).fields['target']), ('CALL', POSTER))

    def test_the_touch_code_is_the_answer_of_the_lookup_on_the_latest_point(self):
        # The point is copied to `0x217`/`0x219`, the routine at `0x25C3C` answers in W, the answer
        # goes to `0xD2F`, and from there to the touch code.
        self.assertEqual((at(0x25EFA).mnemonic, at(0x25EFA).fields['target']), ('RCALL', 0x25C3C))
        self.assertEqual((at(0x25EFE).mnemonic, at(0x25EFE).fields['f']), ('MOVWF', 0x2F))
        self.assertEqual(at(0x25F3E).fields, {'src': 0x0D2F, 'dst': TOUCH_CODE})

    def test_the_keypad_posts_its_own_code_through_the_same_poster(self):
        # `0xC0 | 0x2FB`, the keypad's code as a repeat, into the same poster: which is what makes
        # `0x2FB` the keypad's and `0x202` the touch panel's.
        self.assertEqual((at(0x2BE96).mnemonic, at(0x2BE96).fields['k']), ('MOVLW', REPEAT))
        self.assertEqual((at(0x2BE98).mnemonic, at(0x2BE98).fields['k']), ('MOVLB', 2))
        self.assertEqual((at(0x2BE9A).mnemonic, at(0x2BE9A).fields['f']), ('IORWF', KEYPAD_CODE & 0xFF))
        self.assertEqual((at(0x2BEA0).mnemonic, at(0x2BEA0).fields['target']), ('CALL', POSTER))


class AHeldTouchRepeatsItsCode(unittest.TestCase):
    """Section 127's hold flag is set by a held touch as well as by a held key."""

    def setUp(self):
        lab.require('one34_code')

    def test_the_streamers_caller_sets_the_hold_flag_while_the_touch_code_is_nonzero(self):
        self.assertEqual((at(0x27642).mnemonic, at(0x27642).fields['k']), ('MOVLB', 2))
        self.assertEqual((at(0x27644).mnemonic, at(0x27644).fields['f']), ('MOVF', TOUCH_CODE & 0xFF))
        # Zero skips the set; anything else falls into it.
        self.assertEqual((at(0x27646).mnemonic, at(0x27646).fields['target']), ('BZ', 0x2764C))
        self.assertEqual((at(0x27648).mnemonic, at(0x27648).fields['k']), ('MOVLB', HOLD_FLAG >> 8))
        bsf = at(0x2764A)
        self.assertEqual((bsf.mnemonic, bsf.fields['f'], bsf.fields['b']), ('BSF', HOLD_FLAG & 0xFF, HOLD_BIT))

    def test_the_key_half_of_the_same_test_is_the_one_section_127_described(self):
        # The control: the keypad branch sits just above, PORTB bit 5 behind the keypad code `0x2FB`,
        # and lands on the same set.
        self.assertEqual((at(0x27636).mnemonic, at(0x27636).fields['k']), ('MOVLB', 2))
        self.assertEqual((at(0x27638).mnemonic, at(0x27638).fields['f']), ('MOVF', KEYPAD_CODE & 0xFF))
        self.assertEqual((at(0x2763C).mnemonic, at(0x2763C).fields['f']), ('MOVF', 0x81))
        self.assertEqual((at(0x2763E).mnemonic, at(0x2763E).fields['k']), ('ANDLW', 0x20))
        self.assertEqual((at(0x27640).mnemonic, at(0x27640).fields['target']), ('BZ', 0x27648))


if __name__ == '__main__':
    unittest.main()
