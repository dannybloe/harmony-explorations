"""`docs/findings.md` section 51: the unreached region of a config is image data.

Sections 49 and 50 established that most of a config sits above everything named and that screen
opcode 2, its only known referent, accounts for a fraction of a percent of it. This is what the
bytes are, measured rather than decoded: there is no framing, so nothing here reads a structure.

The three claims each get a closure, because "it looks like pixels" is not a finding:

* the row width is recovered by minimisation, and the margin over the runner up is reported,
* the height is fixed independently by blank screens of exactly `width * height * 2` bytes,
* the byte order is calibrated, by showing the other one scores worse on the same window.
"""
import unittest

import lab
from harmony import gspm, region

#: `[sample, where the named content stops]`, from `packages/codec/src/coverage.ts` with every
#: reader landed. The trailer and the bitmaps are excluded: the first sits at the very end and the
#: second are inside the region rather than below it.
REGION_START = {
    'one_config': 0x04C0F7,
    'one_config_unprogrammed': 0x01F9D8,
}

WINDOW = 0x4000
#: Recovered on both Harmony Ones, which are different physical remotes with different configs.
ARCH12_WIDTH = 176
#: Fixed by the blank screens rather than by the width recovery, which says nothing about height.
ARCH12_HEIGHT = 220
#: How many blank screens each config holds. Pinned so a reading that finds none fails loudly.
BLANK_SCREENS = {'one_config': 4, 'one_config_unprogrammed': 3}


class TestTheRegionIsImageData(unittest.TestCase):

    def test_the_row_width_is_176_on_both_harmony_ones(self):
        lab.require(*REGION_START)
        for name, start in REGION_START.items():
            data = lab.load(name)
            with self.subTest(name):
                c = gspm.parse(data)
                at = region.busiest_window(c.blob, start, c.length, WINDOW)
                width, best, runner_up = region.best_row_width(c.blob, at, WINDOW)
                self.assertEqual(width, ARCH12_WIDTH)
                # A width recovery with no margin is not a result. The runner up is 175 or 177,
                # which are the two widths a real answer of 176 must beat by a visible amount.
                self.assertGreater(runner_up, best * 1.1)

    def test_a_random_width_scores_far_worse(self):
        """The calibration case: report the score for wrong answers too, per the project norm."""
        lab.require('one_config')
        c = gspm.parse(lab.load('one_config'))
        at = region.busiest_window(c.blob, REGION_START['one_config'], c.length, WINDOW)
        px = region.pixels(c.blob, at, WINDOW // region.PIXEL_BYTES)
        right = region.row_score(px, ARCH12_WIDTH)
        for wrong in (100, 137, 200, 301, 400):
            self.assertGreater(region.row_score(px, wrong), right * 1.5, f'width {wrong}')

    def test_the_region_holds_blank_screens_of_exactly_one_screen(self):
        """The closure that fixes the height, and it is independent of the width recovery.

        A run of zero bytes exactly `176 * 220 * 2` long is a blank screen. Nothing about the row
        width measurement produces that number, so the two agreeing is two statements rather than
        one restated.
        """
        size = ARCH12_WIDTH * ARCH12_HEIGHT * region.PIXEL_BYTES
        self.assertEqual(size, 77440)
        for name, expected in BLANK_SCREENS.items():
            data = lab.load(name)
            with self.subTest(name):
                c = gspm.parse(data)
                runs = region.blank_screen_runs(c.blob, REGION_START[name], c.length, size)
                self.assertEqual(len(runs), expected)

    def test_no_other_run_length_lands_near_a_screen(self):
        """The slack in `blank_screen_runs` has to be too small to catch anything else."""
        lab.require('one_config')
        c = gspm.parse(lab.load('one_config'))
        size = ARCH12_WIDTH * ARCH12_HEIGHT * region.PIXEL_BYTES
        wide = region.blank_screen_runs(c.blob, REGION_START['one_config'], c.length, size,
                                        slack=4000)
        self.assertEqual(len(wide), BLANK_SCREENS['one_config'])

    def test_big_endian_beats_little_endian_on_the_same_window(self):
        """Byte order is measured, not assumed.

        Read little endian, a pixel's high and low halves swap, which turns a smooth image into a
        noisy one and drives the vertical difference up. Same window, same width, one difference.
        """
        lab.require('one_config')
        c = gspm.parse(lab.load('one_config'))
        at = region.busiest_window(c.blob, REGION_START['one_config'], c.length, WINDOW)
        count = WINDOW // region.PIXEL_BYTES
        big = region.pixels(c.blob, at, count)
        little = [int.from_bytes(c.blob[at + 2 * i:at + 2 * i + 2], 'little') for i in range(count)]
        self.assertLess(region.row_score(big, ARCH12_WIDTH),
                        region.row_score(little, ARCH12_WIDTH))


class TestTheMeasurementRefusesWhereItHasNoData(unittest.TestCase):
    """A minimiser reads a short read as a perfect answer, so the bounds are the measurement.

    `pixels` sliced past the end of its input and Python answered zero, and zero pixels have no
    vertical difference at all. So a window running off the end scored a flawless 0.0 at every
    candidate width and `best_row_width` would have returned the smallest width in the range with
    a perfect score and no margin. Nothing in the corpus reaches it, which is why it survived: the
    two callers here pass a window the region can hold.
    """

    def test_a_pixel_read_past_the_end_refuses_instead_of_reading_zeroes(self):
        data = bytes(range(64))
        self.assertEqual(len(region.pixels(data, 0, 32)), 32)
        with self.assertRaises(ValueError):
            region.pixels(data, 0, 33)
        with self.assertRaises(ValueError):
            region.pixels(data, -2, 1)

    def test_a_window_past_the_end_would_have_scored_a_flawless_zero(self):
        """The demonstration, on the reading that was there before the bounds check.

        Scored the old way, over a slice that answers zero past the end, every width in the range
        ties on 0.0 and the winner is whichever sorts first. That is not a near miss, it is the
        best score the measure can produce, arrived at where there is no data at all.
        """
        data = bytes(64)
        px = [int.from_bytes(data[2 * i:2 * i + 2], 'big') for i in range(WINDOW // 2)]
        self.assertEqual(len(px), WINDOW // 2)
        self.assertEqual(region.row_score(px, ARCH12_WIDTH), 0.0)
        self.assertEqual(region.row_score(px, region.WIDTH_RANGE[0]), 0.0)

    def test_a_region_too_short_for_two_widths_refuses(self):
        """`scored[1]` had no length check, so the alternative was an IndexError naming nothing."""
        floor = 2 * region.WIDTH_RANGE[0] * 12
        data = bytes(range(256)) * 64
        with self.assertRaises(ValueError):
            region.best_row_width(data, 0, floor)
        # And the control, one width above the floor, where two candidates do score.
        width, best, runner_up = region.best_row_width(data, 0, 2 * (region.WIDTH_RANGE[0] + 1) * 12)
        self.assertIn(width, (region.WIDTH_RANGE[0], region.WIDTH_RANGE[0] + 1))
        self.assertGreaterEqual(runner_up, best)

    def test_a_region_shorter_than_one_window_refuses_rather_than_returning_its_start(self):
        data = bytes(range(256)) * 64
        self.assertEqual(region.busiest_window(data, 0, len(data), 0x1000) % 0x1000, 0)
        with self.assertRaises(ValueError):
            region.busiest_window(data, 0, 0x800, 0x1000)


if __name__ == '__main__':
    unittest.main()
