"""Section 270: what the Harmony 525's configuration region holds past its configuration.

Five 64 KiB blocks from flash 0x820000 to the log area at 0x870000, all five read on 6 September
2026. Two of them are not erased, which is section 215's finding on the spare Harmony One repeated
on a different part with a different write path: flash is erased only where a write needs the room,
so a configuration shorter than its predecessor leaves the predecessor's tail behind it.

Every number here is a count over a whole block, asserted exactly rather than as a floor, because a
floor under a count of erased bytes absorbs precisely the change that would matter: a block quietly
acquiring or losing content.
"""

import pathlib
import unittest

import lab

ROOT = pathlib.Path(__file__).resolve().parent.parent

# The blocks, in order, and what each one must hold. The counts are over the whole 65536 bytes.
#   label -> (bytes that are not 0xff, offset of the last such byte or None if there is none)
REGION_BLOCKS = {
    'h525_region_820000': (50307, 0xC7FA),
    'h525_region_830000': (6848, 0x1DCD),
    'h525_region_840000': (1781, 0x06F4),
    'h525_region_850000': (0, None),
    'h525_region_860000': (0, None),
}

BLOCK = 0x10000


class TheRegionIsFiveBlocksAndAllFiveAreInHand(unittest.TestCase):
    """The population, before anything is said about the contents."""

    def setUp(self):
        lab.require(*REGION_BLOCKS)

    def test_every_block_is_exactly_one_erase_block(self):
        # Stated here as well as in setUp, because `ASampleLoopStatesItsPopulation` reads one
        # function at a time and cannot see a guard in another: without it this loop would shrink to
        # whatever a partial lab holds and still report a pass.
        lab.require(*REGION_BLOCKS)
        for label in REGION_BLOCKS:
            with self.subTest(label):
                self.assertEqual(len(lab.load(label)), BLOCK)

    def test_the_five_blocks_span_the_region_the_rails_state(self):
        # Derived from the rail rather than restated, so a change to either constant fails here
        # instead of leaving this file describing a region that has moved.
        rails = (ROOT / 'packages' / 'usb' / 'src' / 'rails.ts').read_text()
        self.assertIn('9: 0x820000', rails)  # CONFIG_REGION_BASE
        self.assertIn('9: 0x870000', rails)  # WRITABLE_CEILING
        self.assertEqual((0x870000 - 0x820000) // BLOCK, len(REGION_BLOCKS))


class TheConfigurationEndsWhereItSaysItDoes(unittest.TestCase):
    """A closure between the container's own length field and the flash it sits in.

    Two different fields: the length the container states, read by the parser, and the offset of the
    last byte in the block that an erase did not leave behind. They agree, which is what makes this a
    closure rather than arithmetic over one number.
    """

    def setUp(self):
        lab.require('h525_region_820000', 'h525_config_2')
        self.block = lab.load('h525_region_820000')
        self.config = lab.load('h525_config_2')

    def test_the_last_byte_that_is_not_erased_is_the_configurations_last_byte(self):
        last = max(i for i, b in enumerate(self.block) if b != 0xFF)
        self.assertEqual(last, len(self.config) - 1)
        self.assertEqual(last, 0xC7FA)

    def test_everything_past_the_configuration_in_that_block_is_erased(self):
        tail = self.block[len(self.config):]
        self.assertEqual(len(tail), BLOCK - len(self.config))
        self.assertEqual(set(tail), {0xFF})


class TwoBlocksPastTheConfigurationAreNotErased(unittest.TestCase):
    """Section 215's phenomenon on arch 9, and the reason two blocks are poor rehearsal targets."""

    def setUp(self):
        lab.require(*REGION_BLOCKS)

    def test_each_block_holds_exactly_the_measured_number_of_written_bytes(self):
        # Stated here as well as in setUp, because `ASampleLoopStatesItsPopulation` reads one
        # function at a time and cannot see a guard in another: without it this loop would shrink to
        # whatever a partial lab holds and still report a pass.
        lab.require(*REGION_BLOCKS)
        for label, (written, _last) in REGION_BLOCKS.items():
            with self.subTest(label):
                block = lab.load(label)
                self.assertEqual(sum(1 for b in block if b != 0xFF), written)

    def test_the_content_in_each_block_starts_at_its_first_byte_and_stops_partway(self):
        # Stated here as well as in setUp, because `ASampleLoopStatesItsPopulation` reads one
        # function at a time and cannot see a guard in another: without it this loop would shrink to
        # whatever a partial lab holds and still report a pass.
        lab.require(*REGION_BLOCKS)
        # The shape that says tail rather than structure: a run from offset zero, then erased flash
        # to the end of the block. A structure written on purpose would not have to look like this,
        # and one that began partway through a block would refute the reading in section 270.
        for label, (written, last) in REGION_BLOCKS.items():
            if written == 0:
                continue
            with self.subTest(label):
                block = lab.load(label)
                self.assertNotEqual(block[0], 0xFF, 'the run starts at the block boundary')
                self.assertEqual(max(i for i, b in enumerate(block) if b != 0xFF), last)
                self.assertEqual(set(block[last + 1:]), {0xFF})

    def test_the_two_top_blocks_are_erased_throughout_and_identical(self):
        # Which is why a rehearsal on either proves nothing: an erase already produces this content,
        # so writing it back cannot be told apart from writing nothing.
        top = [lab.load('h525_region_850000'), lab.load('h525_region_860000')]
        for block in top:
            self.assertEqual(set(block), {0xFF})
        self.assertEqual(bytes(top[0]), bytes(top[1]))

    def test_the_bytes_above_the_configuration_that_survive_an_erase_boundary(self):
        # The headline number, and **two numbers that are easy to confuse**, which is why both are
        # here: 8629 bytes past the end of the current configuration are not erased, spread over a
        # span of 9411 bytes measured from each block's start to its last written byte. The document
        # first stated the span as the count, and the difference is the 782 erased bytes inside the
        # runs. Section 215's figure for the spare Harmony One, 408034, counts bytes that are not
        # erased, so 8629 is the comparable one.
        written = sum(
            sum(1 for b in lab.load(label) if b != 0xFF)
            for label in ('h525_region_830000', 'h525_region_840000',
                          'h525_region_850000', 'h525_region_860000')
        )
        self.assertEqual(written, 8629)
        span = sum(last + 1 for _written, last in
                   (REGION_BLOCKS['h525_region_830000'], REGION_BLOCKS['h525_region_840000']))
        self.assertEqual(span, 9411)
        self.assertEqual(span - written, 782)

    def test_one_configuration_could_not_have_left_both_runs(self):
        # The argument behind section 270 calling these two earlier configurations rather than one,
        # asserted so that it fails if the premise stops holding. A single container spanning into
        # 0x840000 would have to carry the whole erased remainder of 0x830000 inside it, and the
        # largest erased run actually inside a written region here is three orders smaller.
        block = lab.load('h525_region_830000')
        last = REGION_BLOCKS['h525_region_830000'][1]
        assert last is not None
        gap_if_one_container = BLOCK - (last + 1)
        longest_inside = 0
        run = 0
        for b in block[:last + 1]:
            run = run + 1 if b == 0xFF else 0
            longest_inside = max(longest_inside, run)
        self.assertEqual(gap_if_one_container, 57906)
        self.assertEqual(longest_inside, 768)
        self.assertGreater(gap_if_one_container, 70 * longest_inside)


if __name__ == '__main__':
    unittest.main()
