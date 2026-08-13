"""
The action list language's arithmetic: multiply, divide and modulo. `docs/findings.md` section 107.

Four images and three architectures, because the point of the section is a **divergence**: arch 14
implements the opcode block `0x65` to `0x6E` and arch 9 and arch 12 test every one of those opcodes
in the same descending ladder and branch to the dispatcher's exit. A test on one image could not see
that, and the reading table in `packages/codec/src/actions.ts` now answers differently per
architecture because of it.

Addresses are recorded per image because finding them again is a search, the same reason
`test_interpreter.py` gives. Everything is asserted against decoded instructions rather than against
a hand written listing, so a wrong opcode table in `isa.py` fails these too.

The one assertion here that depends on no image is the division model: the loop the firmware runs is
reimplemented from the instructions it decodes to, and checked against Python's own `divmod`. A loop
asserted only against its own bytes proves the file has not changed; a loop that agrees with
`divmod` over a range of inputs, including the divisor zero the firmware does not guard, is what
makes "this is a division" a claim rather than a label.
"""
import unittest

import lab
from harmony.pic18 import chains, isa

# The four builds, and everything section 107 names in each.
#
# `divide` and `multiply` are the compiler's helpers, `quotient`, `remainder` and `product` the
# scratch addresses their results land in. `mod`, `div` and `mul` are the dispatcher arms that call
# them; `dead` is the `0x6F` arm; `exit` is the dispatcher's common return, which is where the whole
# block goes on the architectures that do not implement it.
BUILDS = {
    'h700_code': {
        'base': 0x9000,
        'architecture': 14,
        'divide': 0x1BAF6,
        'multiply': 0x1B23C,
        'mod': 0x0F01C,
        'div': 0x0EDC4,
        'mul': 0x0ED98,
        'dead': 0x0EFFC,
        'exit': 0x0F75A,
        'chain': 0x0EEAE,       # the first XORLW of the state operation chain
        'negate': 0x0EF38,      # nibble 7: multiply by 0xFFFF, then the same writer as nibble 6
        'writer': 0x17D0E,
        'accumulator': 0x10E,
    },
    'h600_code_complete': {
        'base': 0x9000,
        'architecture': 14,
        'divide': 0x1A210,
        'multiply': 0x19960,
        'mod': 0x0EC2C,
        'div': 0x0E9D4,
        'mul': 0x0E9A8,
        'dead': None,           # not located on this image; the arch 12 and arch 9 pair is enough
        'exit': 0x0F304,
        'chain': None,
        'negate': None,
        'writer': None,
        'accumulator': 0x205,
    },
    'one34_code': {
        'base': 0x20000,
        'architecture': 12,
        'divide': 0x203D4,
        'multiply': 0x2E45E,
        'mod': None,            # arch 12 has no modulo arm, which is the finding
        'div': 0x250B6,
        'mul': 0x2508A,
        'dead': 0x252E8,
        'exit': 0x25892,
        'chain': 0x2519E,
        'negate': 0x25228,
        'writer': None,
        'accumulator': 0xE15,
    },
    'h525_code': {
        'base': 0x0000,
        'architecture': 9,
        'divide': 0x017D0,
        'multiply': 0x07BC0,
        'mod': None,
        'div': 0x01D8A,
        'mul': 0x01D74,
        'dead': 0x01F54,
        'exit': 0x023E4,
        'chain': None,
        'negate': None,
        'writer': None,
        'accumulator': 0x717,
    },
}

# The ladder tests that reach the exit on the architectures without the block. Value is the address
# of the `MOVLW <opcode>` that starts each test.
BLOCK_LADDER = {
    'one34_code': {0x6E: 0x25302, 0x6D: 0x2530A, 0x6B: 0x25312, 0x6A: 0x2531A, 0x68: 0x2532A},
    'h525_code': {},            # arch 9's ladder stops at 0x6F and its fall through is the exit
}

MODULO_OPCODE = 0x6E
DEAD_OPCODE = 0x6F
DIVIDE_OPCODE = 0x77
MULTIPLY_OPCODE = 0x78

# The division loop's own constants, which every build shares.
DIVISION_ITERATIONS = 0x10
DIVISION_BITS = 16
NEGATE_MULTIPLIER = 0xFFFF

# The eight operations `0x70` and `0x71` select with the operand's high nibble. Six comparisons in
# complementary pairs, then add and subtract.
STATE_OPERATIONS = 8


def instructions(name, base, start, count):
    """`count` decoded instructions from `start`, as (address, Instr) pairs."""
    code = lab.load(name)
    out = []
    offset = start - base
    for _ in range(count):
        instr = isa.decode(code, offset, base)
        out.append((base + offset, instr))
        offset += 2 * instr.words
    return out


def moves(pairs):
    """The (source, destination) of every `MOVFF` in a window."""
    return [(i.fields['src'], i.fields['dst']) for _, i in pairs if i.mnemonic == 'MOVFF']


def division_registers(name, where):
    """Which scratch addresses the division helper uses, read out of the helper itself.

    Returned as (dividend, divisor, remainder), each the low byte's address. The point of deriving
    them rather than tabulating them is that the arm tests below then compare two independent
    readings: where the helper leaves its answers, and which of those the arm picks up.
    """
    pairs = instructions(name, where['base'], where['divide'], 12)
    # `CLRF` twice clears the remainder, high byte first, so the second is its low byte.
    clears = [i.fields['f'] for _, i in pairs if i.mnemonic == 'CLRF']
    remainder = clears[1]
    # Then a four register rotate left: dividend low, dividend high, remainder low, remainder high.
    rotates = [i.fields['f'] for _, i in pairs if i.mnemonic == 'RLCF']
    # And the trial subtract names the divisor.
    divisor = next(i.fields['f'] for _, i in pairs if i.mnemonic == 'MOVF')
    return rotates[0], divisor, remainder


def divide(dividend, divisor):
    """The firmware's loop, reimplemented from what it decodes to.

    Sixteen iterations of: shift the 32 bit pair (remainder, dividend) left one bit, trial subtract
    the divisor from the remainder, and on no borrow subtract it for real and set the quotient's low
    bit. The quotient is built in the dividend's own registers as it shifts out.
    """
    remainder = 0
    quotient = dividend & 0xFFFF
    for _ in range(DIVISION_ITERATIONS):
        carry = (quotient >> (DIVISION_BITS - 1)) & 1
        quotient = (quotient << 1) & 0xFFFF
        remainder = ((remainder << 1) | carry) & 0xFFFF
        if remainder >= divisor:
            remainder -= divisor
            quotient |= 1
    return quotient, remainder


class DivisionModelTest(unittest.TestCase):
    """What the loop computes, with no image involved."""

    def test_the_loop_is_a_division(self):
        for dividend in (0, 1, 7, 100, 255, 256, 1000, 30000, 0xFFFE, 0xFFFF):
            for divisor in (1, 2, 3, 5, 6, 8, 10, 100, 255, 0xFFFF):
                with self.subTest(dividend=dividend, divisor=divisor):
                    self.assertEqual(divide(dividend, divisor), divmod(dividend, divisor))

    def test_a_zero_divisor_is_defined_rather_than_a_hang(self):
        """Sixteen iterations whatever happens, so there is no trap and no loop to escape.

        Worth pinning because it is the one thing a writer could get wrong for free: an operand of
        zero is accepted, and what comes back is the dividend from the modulo and `0xFFFF` from the
        divide. Not an error, and not a remainder anybody would want.
        """
        for dividend in (0, 1, 1234, 0xFFFF):
            with self.subTest(dividend):
                quotient, remainder = divide(dividend, 0)
                self.assertEqual(quotient, 0xFFFF)
                self.assertEqual(remainder, dividend)

    def test_the_identity_both_generators_rest_on(self):
        """`x - (x / n) * n == x mod n` and `x - (x mod n) == (x / n) * n`.

        The arch 8 and arch 12 generators compute the first and the arch 14 one computes the second,
        each with a subtract and the primitive its architecture has. That is why reading either
        confirms the other, and it is the closure section 107 rests on.
        """
        for x in (0, 1, 7, 100, 4321, 0xFFFF):
            for n in (3, 5, 6, 8, 10):
                with self.subTest(x=x, n=n):
                    quotient, remainder = divide(x, n)
                    self.assertEqual((x - quotient * n) & 0xFFFF, remainder)
                    self.assertEqual((x - remainder) & 0xFFFF, quotient * n)


class HelperTest(unittest.TestCase):
    """The two helpers, in every image that has them."""

    def test_every_build_carries_the_same_restoring_division(self):
        # The population up front, so a partial lab skips this whole test rather than shrinking its
        # own claim to whatever is present. ASampleLoopStatesItsPopulation in test_toolchain.py.
        lab.require(*BUILDS)
        for name, where in BUILDS.items():
            with self.subTest(name):
                pairs = instructions(name, where['base'], where['divide'], 13)
                mnemonics = [i.mnemonic for _, i in pairs]
                # The count, so a build with a different width would fail here.
                literals = [i.fields['k'] for _, i in pairs if i.mnemonic == 'MOVLW']
                self.assertEqual(literals, [DIVISION_ITERATIONS])
                # Four rotates, which is the 32 bit shift, then the trial subtract.
                self.assertEqual(mnemonics.count('RLCF'), 4)
                self.assertIn('SUBWFB', mnemonics)
                dividend, divisor, remainder = division_registers(name, where)
                # The remainder sits below the dividend, and the divisor above both: the compiler's
                # own argument frame, identical in shape across four independently built images.
                self.assertLess(remainder, dividend)
                self.assertLess(dividend, divisor)

    def test_every_build_carries_the_same_sixteen_by_sixteen_multiply(self):
        lab.require(*BUILDS)
        for name, where in BUILDS.items():
            with self.subTest(name):
                pairs = instructions(name, where['base'], where['multiply'], 14)
                mnemonics = [i.mnemonic for _, i in pairs]
                # Four partial products and the additions that combine them.
                self.assertGreaterEqual(mnemonics.count('MULWF'), 3)
                self.assertIn('ADDWF', mnemonics)
                self.assertIn('ADDWFC', mnemonics)


class ArmTest(unittest.TestCase):
    """Which result each dispatcher arm picks up, which is what separates the three opcodes."""

    def slots(self, name, where):
        dividend, _, remainder = division_registers(name, where)
        return dividend, remainder

    def test_the_divide_arm_takes_the_quotient(self):
        lab.require(*BUILDS)
        for name, where in BUILDS.items():
            with self.subTest(name):
                quotient, _ = self.slots(name, where)
                pairs = instructions(name, where['base'], where['div'], 12)
                called = [i.fields['target'] for _, i in pairs
                          if i.mnemonic in ('CALL', 'RCALL', 'GOTO')]
                self.assertIn(where['divide'], called, 'the divide arm calls the division')
                # The first MOVFF after the call reads the quotient's low byte.
                after = [m for m in moves(pairs) if m[0] == quotient]
                self.assertTrue(after, 'the quotient is what it takes')

    def test_the_multiply_arm_takes_the_products_low_word(self):
        lab.require(*BUILDS)
        for name, where in BUILDS.items():
            with self.subTest(name):
                pairs = instructions(name, where['base'], where['mul'], 12)
                called = [i.fields['target'] for _, i in pairs
                          if i.mnemonic in ('CALL', 'RCALL', 'GOTO')]
                self.assertIn(where['multiply'], called)
                # One argument frame, four builds: the remainder sits lowest, the product's low word
                # above it, then the dividend and the divisor. So the slot the multiply arm reads is
                # between the two the division arms read, and that ordering is asserted rather than
                # tabulated because it is what says the three opcodes share one frame.
                dividend, _, remainder = division_registers(name, where)
                sources = [src for src, _ in moves(pairs)]
                # **The claim is that exactly one source sits in that window**, which is what says the
                # three opcodes share one frame. It used to be `product = min(s for s in sources if
                # remainder < s < dividend)` followed by asserting `remainder < product < dividend`,
                # a value compared to itself through the predicate that selected it: only `min()` on an
                # empty sequence could fail it.
                between = sorted({s for s in sources if remainder < s < dividend})
                # Two addresses, the product's low and high byte, adjacent and directly above the
                # remainder. Measured rather than assumed: the first version of this assertion demanded
                # one and found [30, 31] on arch 12 and [4, 5] on arch 9, which is a sixteen bit value
                # moved a byte at a time.
                self.assertEqual(len(between), 2,
                                 'the product is one sixteen bit slot between the remainder and the '
                                 'dividend, got %r' % (between,))
                # Directly above the remainder's own two bytes, which is what makes the three opcodes
                # one frame rather than three that happen to be near each other.
                self.assertEqual(between, [remainder + 2, remainder + 3],
                                 'and it sits above the remainder, which is sixteen bit too')

    def test_only_arch_14_has_a_modulo_arm_and_it_takes_the_remainder(self):
        lab.require(*BUILDS)
        for name, where in BUILDS.items():
            with self.subTest(name):
                if where['mod'] is None:
                    self.assertNotEqual(where['architecture'], 14)
                    continue
                self.assertEqual(where['architecture'], 14)
                _, remainder = self.slots(name, where)
                pairs = instructions(name, where['base'], where['mod'], 12)
                called = [i.fields['target'] for _, i in pairs
                          if i.mnemonic in ('CALL', 'RCALL', 'GOTO')]
                self.assertIn(where['divide'], called, 'the same helper as the divide')
                sources = [src for src, _ in moves(pairs)]
                self.assertIn(remainder, sources, 'and it takes the remainder, not the quotient')
                # And nothing in this arm reads the quotient, which is the whole difference.
                quotient, _ = self.slots(name, where)
                self.assertNotIn(quotient, sources)

    def test_the_block_reaches_the_exit_on_the_architecture_that_tests_it(self):
        """Arch 12 tests the ten opcodes and branches to the exit; arch 9 does not test them at all.

        **Renamed and given the count on 13 August 2026.** The title said "architectures" and the
        Harmony 525's ladder is `{}` by construction, so its inner loop ran zero times and the plural
        described one architecture. The emptiness is a finding, section 107, so it is asserted rather
        than left as a comment on a dict entry nobody reads.
        """
        lab.require(*BLOCK_LADDER)
        self.assertEqual(BLOCK_LADDER['h525_code'], {},
                         "arch 9's ladder stops at 0x6F, so it tests none of these")
        checked = 0
        for name, ladder in BLOCK_LADDER.items():
            for opcode, start in ladder.items():
                checked += 1
                with self.subTest(name=name, opcode=hex(opcode)):
                    base = BUILDS[name]['base']
                    pairs = instructions(name, base, start, 4)
                    self.assertEqual(pairs[0][1].fields['k'], opcode, 'the test is for this opcode')
                    self.assertEqual(pairs[1][1].mnemonic, 'SUBWF')
                    # The arm is one branch and it goes to the dispatcher's common exit. Two shapes:
                    # a `BNC` to the next test then the branch, and for the lowest opcode in the
                    # ladder no `BNC` at all, because everything below it lands there too.
                    branch = next(i for _, i in pairs if i.mnemonic == 'BRA')
                    self.assertEqual(branch.fields['target'], BUILDS[name]['exit'])
        self.assertEqual(checked, len(BLOCK_LADDER['one34_code']),
                         'the arch 12 ladder is the whole population and all of it has to run')

    def test_the_dead_opcode_tests_the_accumulator_and_returns_either_way(self):
        lab.require(*BUILDS)
        for name, where in BUILDS.items():
            if where['dead'] is None:
                continue
            with self.subTest(name):
                pairs = instructions(name, where['base'], where['dead'], 12)
                self.assertEqual(pairs[0][1].fields['k'], DEAD_OPCODE)
                # It reads the accumulator and ORs the two bytes, so the zero test is real.
                self.assertIn('IORWF', [i.mnemonic for _, i in pairs])
                # Both arms of the test branch to the exit, which is what makes it a no-op rather
                # than an unread instruction: there is nothing further to find.
                targets = [i.fields['target'] for _, i in pairs if i.mnemonic == 'BRA']
                self.assertEqual(len(set(targets)), 1, 'one destination for both arms')
                self.assertEqual(targets[0], where['exit'])
                self.assertGreaterEqual(len(targets), 2)


class StateOperationTest(unittest.TestCase):
    """`0x70` and `0x71`: eight operations out of the operand's high nibble, one table everywhere."""

    def test_the_chain_selects_eight_operations_on_both_architectures(self):
        lab.require('h700_code', 'one34_code')
        for name in ('h700_code', 'one34_code'):
            where = BUILDS[name]
            with self.subTest(name):
                code = lab.load(name)
                cases = chains.xor_chain(code, where['base'], where['chain'])
                values = [c.value for c in cases]
                # Seven arms with a case value and no duplicate, which is the check `chains.py`
                # exists for: reading the literals as case values gives repeats. The eighth, nibble
                # 0, is the chain's fall through, so it has no `BZ` of its own and does not appear
                # here; 7 down to 1 plus that fall through is the whole selector.
                self.assertEqual(sorted(values), list(range(1, STATE_OPERATIONS)))

    def test_nibble_seven_negates_by_multiplying_and_then_adds(self):
        """Which is why the corpus's subtract is a multiply site, and why it took a chain to see.

        `0xFFFF` times a value is its two's complement, so nibble 7 reaches the same writer as
        nibble 6 with the sign flipped. The writer adds to the variable and clamps, so nibble 6 is
        an add and nibble 7 a subtract.
        """
        name = 'h700_code'
        where = BUILDS[name]
        lab.require(name)
        pairs = instructions(name, where['base'], where['negate'], 8)
        # Both bytes of the multiplicand set, which is 0xFFFF and not a coincidence of one byte.
        setf = [i.fields['f'] for _, i in pairs if i.mnemonic == 'SETF']
        self.assertEqual(len(setf), 2)
        self.assertEqual(NEGATE_MULTIPLIER, 0xFFFF)
        called = [i.fields['target'] for _, i in pairs if i.mnemonic in ('CALL', 'RCALL')]
        self.assertIn(where['multiply'], called)

    def test_the_writer_adds_to_the_variable_and_clamps(self):
        name = 'h700_code'
        where = BUILDS[name]
        lab.require(name)
        pairs = instructions(name, where['base'], where['writer'], 40)
        mnemonics = [i.mnemonic for _, i in pairs]
        # It reads the variable's current value, adds with carry, and then compares against a bound
        # before storing, which is the clamp an editor has to respect.
        self.assertIn('ADDWF', mnemonics)
        self.assertIn('ADDWFC', mnemonics)
        self.assertIn('SUBWFB', mnemonics)


if __name__ == '__main__':
    unittest.main()
