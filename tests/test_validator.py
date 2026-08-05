"""
The firmware's own check on a config container.

Both images spell the container cookie and the end marker out as four consecutive MOVLW
instructions and compare them with XORWF, branching away on the first mismatch. That locates
the boot-time config validator, which is what roadmap step 3 asked for, and it is the
neighbourhood the trailer checksum has to live in, since the trailer is the two bytes before
the end marker.

Neither address has a direct caller, so both are reached by a computed jump. That is why they
were found by searching for the constants rather than by walking the call graph.
"""
import unittest

import lab
from harmony.pic18 import isa

GSPM = (0x47, 0x53, 0x50, 0x4D)
PTYY = (0x50, 0x54, 0x59, 0x59)

# image -> (base, address of the cookie check, address of the end marker check)
SITES = {
    'h700_code': (0x9000, 0x16492, 0x1652C),
    'one34_code': (0x20000, 0x28DAC, 0x28E18),
}


def compared_literals(name, addr, count=4):
    """The literals of `count` MOVLW instructions from `addr`, in order."""
    base, _, _ = SITES[name]
    code = lab.load(name)
    out = []
    while len(out) < count:
        instr = isa.decode(code, addr - base, base)
        if instr.mnemonic == 'MOVLW':
            out.append(instr.fields['k'])
        addr += 2 * instr.words
    return tuple(out)


class TestTheFirmwareChecksTheContainerCookie(unittest.TestCase):
    def test_both_images_check_gspm(self):
        for name, (_, cookie, _) in SITES.items():
            self.assertEqual(compared_literals(name, cookie), GSPM, name)

    def test_both_images_check_the_end_marker(self):
        for name, (_, _, marker) in SITES.items():
            self.assertEqual(compared_literals(name, marker), PTYY, name)

    def test_the_cookie_is_compared_and_not_merely_loaded(self):
        """
        MOVLW then XORWF then a branch on non-zero: a comparison that bails out. A sequence of
        MOVLW alone could be anything, so the XORWF is what makes this a check.
        """
        base, cookie, _ = SITES['h700_code']
        code = lab.load('h700_code')
        for offset, mnemonic in ((2, 'MOVLB'), (4, 'XORWF'), (6, 'BNZ')):
            self.assertEqual(isa.decode(code, cookie + offset - base, base).mnemonic, mnemonic)

    def test_the_markers_are_not_in_the_image_as_text(self):
        """
        Which is why searching for the ASCII found nothing and the four MOVLW pattern had to be
        searched for instead. Worth pinning: it is the reason the validator went unfound in an
        earlier pass.
        """
        for name in SITES:
            image = lab.load(name)
            self.assertNotIn(b'GSPM', image, name)
            self.assertNotIn(b'PTYY', image, name)


if __name__ == '__main__':
    unittest.main()
