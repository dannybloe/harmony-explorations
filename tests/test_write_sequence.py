"""What the first write to use the whole eight step sequence put on a remote, byte for byte.

`docs/findings.md` section 247. Two region reads of the spare Harmony One taken an hour apart, one
before the write and one after, are the evidence, and they are here rather than in a note because
the interesting property is a **negative**: two 64 KiB blocks were erased and rewritten, and of the
131072 bytes in them exactly two came back different.

That is the claim a byte comparison can make and a read back inside the writer cannot. The writer
verifies each block against what it meant to send, so it is checking with the assumptions it wrote
with; these two files were read by a separate program on separate runs, and the second is compared
against the first rather than against anything the write produced.

**What is not asserted here is the part only a person saw.** Whether the remote asked to be synced
afterwards, and whether it came back without its battery being pulled, are observations of a screen
and a USB bus. Section 247 records them and says plainly that the two new steps went in together, so
which of them closed the screen is not separated by this run.
"""
import unittest

import lab

#: The unit before and after the write, both read by `read-region.ts`, both starting at flash
#: 0x040000, which is where an offset below has to be added to name a flash address.
BEFORE, AFTER = 'one_spare_plus_lg2_region', 'one_spare_denon65_region'
REGION_BASE = 0x040000

#: The container this write installed, and its length, which is where the region stops being it.
CONFIG_LENGTH = 1668291

#: What the edit aimed at: one device's power on delay in tenths of a second, and the byte of the
#: trailer checksum that follows from it. `set-delay.ts` printed both offsets before anything was
#: sent, so these are predictions rather than a reading of the result.
DELAY_AT, DELAY_BEFORE, DELAY_AFTER = 0x044028, 60, 65
CHECKSUM_AT, CHECKSUM_BEFORE, CHECKSUM_AFTER = 0x1974BD, 0x70, 0x0D

#: The erase block size on arch 12, which is what makes this a two block write.
BLOCK = 0x10000


def _pair():
    lab.require(BEFORE, AFTER)
    return lab.load(BEFORE), lab.load(AFTER)


class TheFullSequenceWroteExactlyWhatItAimedAt(unittest.TestCase):
    """Section 247, and every assertion here is about bytes on a remote rather than about code."""

    def test_exactly_two_bytes_of_the_region_changed(self):
        """The whole finding in one assertion, and the one that would catch a stray write.

        128 KiB was erased to ground and written back from a file. Anything that got there by another
        route, a neighbouring block clipped by the erase, the remote's own log writer, a chunk landing
        at the wrong address, shows up as a third difference.
        """
        before, after = _pair()
        self.assertEqual(len(before), len(after))
        differing = [at for at in range(len(before)) if before[at] != after[at]]
        self.assertEqual([REGION_BASE + at for at in differing],
                         [REGION_BASE + DELAY_AT, REGION_BASE + CHECKSUM_AT])

    def test_the_two_bytes_hold_the_values_the_edit_predicted(self):
        """A count of two says nothing about which two, so the values are asserted as well."""
        before, after = _pair()
        self.assertEqual((before[DELAY_AT], after[DELAY_AT]), (DELAY_BEFORE, DELAY_AFTER))
        self.assertEqual((before[CHECKSUM_AT], after[CHECKSUM_AT]),
                         (CHECKSUM_BEFORE, CHECKSUM_AFTER))

    def test_the_two_bytes_are_in_different_erase_blocks(self):
        """Why the cheapest possible edit still costs two erases, section 187.

        Asserted rather than stated: if a future edit put both bytes in one block, this write would
        stop being the two block case section 247 measured, and the section would need saying again.
        """
        first = (REGION_BASE + DELAY_AT) // BLOCK * BLOCK
        second = (REGION_BASE + CHECKSUM_AT) // BLOCK * BLOCK
        self.assertNotEqual(first, second)
        self.assertEqual((first, second), (0x080000, 0x1D0000))

    def test_everything_else_in_those_two_blocks_survived(self):
        """The negative that makes the erase safe rather than merely successful.

        Each block was erased whole, so all 65536 of its bytes were `0xff` at one moment and had to
        be put back from the dump. This is that restoration, counted: 131070 of 131072.
        """
        before, after = _pair()
        for block in (0x080000 - REGION_BASE, 0x1D0000 - REGION_BASE):
            same = sum(1 for at in range(block, block + BLOCK) if before[at] == after[at])
            self.assertEqual(same, BLOCK - 1, 'block at flash 0x%06X' % (REGION_BASE + block))

    def test_the_region_past_the_container_is_untouched(self):
        """The bytes a write has no business changing, and there are 35645 of them.

        A container is shorter than the region it sits in, and the tail is a previous configuration
        nobody asked to move. The last block the container lands in is erased with it, so those bytes
        are destroyed and restored like any other, and this says they came back.
        """
        before, after = _pair()
        self.assertEqual(len(before) - CONFIG_LENGTH, 35645)
        self.assertEqual(before[CONFIG_LENGTH:], after[CONFIG_LENGTH:])


if __name__ == '__main__':
    unittest.main()
