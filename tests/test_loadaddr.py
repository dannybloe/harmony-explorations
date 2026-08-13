"""
Calibration for the load address search.

Both images used here have a base that is known independently, from the destination the
firmware update package writes them to, so they are a real calibration rather than a
restatement of the search's own output.
"""
import unittest

import lab
from harmony.pic18 import loadaddr

# logical name -> (known base, known entry point)
KNOWN = {
    'one34_code': (0x20000, 0x2EA38),
    'h700_code': (0x09000, 0x1BB38),
}


class TestBoundaryScoring(unittest.TestCase):
    def test_correct_base_scores_far_above_wrong_ones(self):
        # The population up front, so a partial lab skips this whole test rather than shrinking its
        # own claim to whatever is present. ASampleLoopStatesItsPopulation in test_toolchain.py.
        lab.require(*KNOWN)
        for name, (base, _) in KNOWN.items():
            with self.subTest(image=name):
                code = lab.load(name)
                correct = loadaddr.score_base(code, base)
                self.assertGreater(correct.boundary, 0.95,
                                   'correct base should put targets on function starts')
                for wrong in (base - 0x1000, base + 0x1000, 0x0000):
                    if wrong < 0:
                        continue
                    other = loadaddr.score_base(code, wrong)
                    self.assertLess(other.boundary, 0.60,
                                    'base 0x%X scored too well' % wrong)

    def test_search_finds_the_known_base(self):
        lab.require(*KNOWN)
        for name, (base, _) in KNOWN.items():
            with self.subTest(image=name):
                best, ranked = loadaddr.find_base(lab.load(name))
                self.assertEqual(best.base, base)
                runner_up = ranked[1]
                self.assertGreater(best.boundary - runner_up.boundary, 0.30,
                                   'margin over the runner-up should be decisive')

    def test_entry_point_from_header(self):
        lab.require(*KNOWN)
        for name, (base, entry) in KNOWN.items():
            with self.subTest(image=name):
                self.assertEqual(loadaddr.entry_point(lab.load(name), base), entry)

    def test_complete_image_reaches_every_target(self):
        """The 700 image is complete, so no target should fall outside it."""
        code = lab.load('h700_code')
        score = loadaddr.score_base(code, 0x9000)
        self.assertEqual(score.in_range, score.targets)

    def test_truncated_image_leaves_targets_beyond_the_end(self):
        """The 600 dump is cut short, so some targets land past the end. That is the tell."""
        code = lab.load('h600_code')
        score = loadaddr.score_base(code, 0x9000)
        self.assertLess(score.in_range, score.targets)
        self.assertGreater(score.boundary, 0.95, 'the base is still identifiable')


class TestWhichBlockEndersActuallyFire(unittest.TestCase):
    """`GOTO` was in the set and could never fire, and the comment beside it stated a falsehood.

    An absolute target lands on the word after a two word instruction's **trailing** word, and a
    trailing word decodes as `SECOND_WORD`, so a `GOTO` is never the mnemonic at `target - 2`. The
    `SECOND_WORD` arm is what catches those, and the comment said reaching it means the previous
    instruction was a `CALL` or `GOTO`, which is false for 37 of 209 on the Harmony One 3.4 image
    and 29 of 271 on the Harmony 525 image: bare `0xFxxx` data words and `MOVFF` tails. The score
    is a heuristic and counting them is fine; claiming to know which they were is not.
    """

    #: image -> (base, block ender counts, SECOND_WORD hits, of which a real CALL or GOTO tail).
    FIRING = {
        'one34_code': (0x20000, {'RETURN': 891, 'RETLW': 193, 'BRA': 1, 'RETFIE': 1}, 209, 172),
        'h700_code': (0x09000, {'RETURN': 1103, 'RETLW': 112, 'BRA': 34, 'RETFIE': 2}, 365, 365),
    }

    def test_goto_reset_and_return_fast_never_fire(self):
        lab.require(*self.FIRING)
        for name, (base, expected, _, _) in self.FIRING.items():
            with self.subTest(image=name):
                fired = self._fired(lab.load(name), base)[0]
                self.assertEqual(fired, expected)
                for never in ('GOTO', 'RESET', 'RETURN FAST', 'RETFIE FAST'):
                    self.assertNotIn(never, fired)
        # And it is gone from the set, since a member that cannot fire reads as protection.
        self.assertNotIn('GOTO', loadaddr._BLOCK_ENDERS)

    def test_a_second_word_hit_is_not_always_a_call_or_goto_tail(self):
        lab.require(*self.FIRING)
        for name, (base, _, hits, real) in self.FIRING.items():
            with self.subTest(image=name):
                _, seen, tails = self._fired(lab.load(name), base)
                self.assertEqual(seen, hits)
                self.assertEqual(tails, real)

    @staticmethod
    def _fired(code, base):
        """(block ender counts, SECOND_WORD hits, how many of those follow a real CALL or GOTO)."""
        from harmony.pic18 import isa
        fired, second, tails = {}, 0, 0
        for target in loadaddr.absolute_targets(code):
            if not base <= target < base + len(code) or target - base < 2:
                continue
            offset = target - base
            previous = isa.decode(code, offset - 2, base)
            if previous.mnemonic in loadaddr._BLOCK_ENDERS:
                fired[previous.mnemonic] = fired.get(previous.mnemonic, 0) + 1
            elif previous.category == isa.SECOND_WORD:
                second += 1
                if offset >= 4:
                    before = isa.decode(code, offset - 4, base)
                    if before.words == 2 and before.mnemonic in ('CALL', 'GOTO'):
                        tails += 1
        return fired, second, tails


if __name__ == '__main__':
    unittest.main()
