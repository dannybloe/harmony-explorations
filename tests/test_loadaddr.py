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
        for name, (base, _) in KNOWN.items():
            with self.subTest(image=name):
                best, ranked = loadaddr.find_base(lab.load(name))
                self.assertEqual(best.base, base)
                runner_up = ranked[1]
                self.assertGreater(best.boundary - runner_up.boundary, 0.30,
                                   'margin over the runner-up should be decisive')

    def test_entry_point_from_header(self):
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


if __name__ == '__main__':
    unittest.main()
