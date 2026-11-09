"""The XOR chain decoder refuses a truncated walk instead of returning a prefix.

`src/harmony/pic18/chains.py` opens with a warning that the default `limit` truncates a long
switch silently, and names what it cost: the 700 image's state dispatch is 70 cases and came back
as 32, which was written up as the tool over-running into unrelated code. The advice was to pass a
generous limit and check whether the walk ran out.

Nothing checked, and the module's own convenience wrapper could not: `chain_table` did not take a
`limit` to pass on. So the one route that hides the walk was the one route that could not follow
the instruction, which is the same shape as a rail enforced by a user interface.

Measured before this changed, by making `xor_chain` report every walk that reached its limit and
running the whole suite: no chain anywhere reaches one. So the refusal costs no reading that was
being done, and the 70 case chain below is the calibration, because it is the exact case the
warning was written about.
"""
import unittest

import lab
from harmony.pic18 import chains

#: The state dispatch in the Harmony 700 image, `docs/findings.md` section 99. Seventy cases, which
#: is what makes it the case that fails under the default limit of 32.
STATE_CHAIN = (0x9000, 0x0C720)
STATE_CASES = 70


def synthetic(values):
    """A chain of `XORLW k; BZ +2` pairs testing `values`, ended by a word that is not an `XORLW`.

    Built rather than loaded so the exact case counts below hold in a fresh clone with no lab. The
    literal a case carries is the difference to the previous case value rather than the value
    itself, which is the whole reason this module exists, so the caller states the values and the
    literals are computed the way the compiler computes them.
    """
    out = bytearray()
    previous = 0
    for value in values:
        out += bytes([value ^ previous, 0x0A])   # XORLW, the difference to the running value
        out += bytes([0x02, 0xE0])               # BZ, forward two bytes
        previous = value
    out += bytes([0x00, 0x00])   # NOP: neither an XORLW nor a branch, so the walk stops here
    return bytes(out)


class TestATruncatedWalkRefuses(unittest.TestCase):

    def test_a_chain_longer_than_the_limit_raises(self):
        code = synthetic(range(1, 41))
        with self.assertRaises(chains.ChainTruncated):
            chains.xor_chain(code, 0, 0, limit=32)
        # And the same chain, asked for generously, is the whole forty.
        self.assertEqual(len(chains.xor_chain(code, 0, 0, limit=64)), 40)

    def test_a_chain_of_exactly_the_limit_is_returned_rather_than_refused(self):
        """The walk goes one case past `limit` to tell a full chain from a truncated one.

        Without that step the two are indistinguishable and this would refuse a complete answer,
        which is the mirror of the defect and no better.
        """
        code = synthetic(range(1, 9))
        self.assertEqual(len(chains.xor_chain(code, 0, 0, limit=8)), 8)
        self.assertEqual(len(chains.chain_table(code, 0, 0, limit=8)), 8)

    def test_chain_table_forwards_its_limit(self):
        """It took no `limit` at all, so the default was unreachable from this side."""
        code = synthetic(range(1, 41))
        with self.assertRaises(chains.ChainTruncated):
            chains.chain_table(code, 0, 0)
        self.assertEqual(len(chains.chain_table(code, 0, 0, limit=64)), 40)

    def test_the_seventy_case_chain_is_the_calibration(self):
        """The real instance the module's warning was written about.

        Under the default it used to answer with 32 of the 70 cases and no indication, which is
        the whole reason this exception exists. Asked generously it is still the seventy the
        firmware carries.
        """
        lab.require('h700_code')
        code = lab.load('h700_code')
        base, at = STATE_CHAIN
        with self.assertRaises(chains.ChainTruncated):
            chains.chain_table(code, base, at)
        table = chains.chain_table(code, base, at, limit=400)
        self.assertEqual(len(table), STATE_CASES)


if __name__ == '__main__':
    unittest.main()
