"""What puts a status screen on a Harmony's display, and which condition picks which screen.

`docs/findings.md` section 249, and it answers the question section 244 left open. That section
named the thirty screens by parsing the container they live in and said plainly that which condition
selects one was unread: no variable in the application image is written with a spread of literals in
the range of these indices. That search missed the case, because the index that matters most is
written by `CLRF` and carries no literal at all.

The route was the other way round. One routine takes a screen number and displays it; it is called
from a handful of places; and each call site is a condition. Five sites on arch 12 and arch 14, four
on arch 9, and every number they pass lands on a screen whose name fits the code path around it.

**The closure worth stating is that the numbers are not indices into anything this test parses.**
They were read out of four firmware images by looking at call sites, and the names they land on come
from five containers parsed by a reader that knows nothing about firmware. Five apt names out of a
table of thirty is not a coincidence a decoder slip could produce.
"""
import unittest

import lab

from harmony.pic18 import isa

#: image -> (load base, the routine that displays a status screen, its call sites as
#: {address: screen number}).
#:
#: Found by looking for a call preceded by a 16 bit number being written into two adjacent bytes,
#: which is how a screen number is passed, then keeping the targets with four or more distinct
#: numbers. One routine per image answers that description.
SHOWERS = {
    'one34_code': (0x20000, 0x2871C,
                   {0x28AC0: 27, 0x28AD2: 9, 0x28D8A: 25, 0x29022: 26, 0x2902E: 0}),
    'h700_code': (0x9000, 0x16B20,
                  {0x161D6: 22, 0x161FC: 27, 0x16460: 25, 0x166D8: 26, 0x166E4: 0}),
    'h600_code_complete': (0x9000, 0x14B3C,
                           {0x14F50: 22, 0x14F76: 27, 0x151BE: 25, 0x15408: 26, 0x15414: 0}),
    # Arch 9 raises four rather than five: it has no site for the hardware screen the other two
    # carry, which is 9 on arch 12 and 22 on arch 14 and is a different check on each.
    'h525_code': (0x0, 0x05D38, {0x04CB0: 27, 0x04DEA: 25, 0x04F78: 26, 0x04F8C: 0}),
}

#: What each number means, from the container table in `docs/findings.md` section 244. The names are
#: Logitech's own firmware messages and are quoted for the same reason that section quotes them.
NAMES = {0: 'Go to Website to update settings', 9: 'LCD Module Failed',
         22: 'Battery ADC Not Calibrated', 25: 'Application Terminated',
         26: 'Configuration Corrupted', 27: 'Missing License'}

#: The Harmony One's validator: entry, the byte that picks corrupted over the website message, the
#: three cookie checks with the offset each seeks, and the block the failures jump to.
ONE_VALIDATOR = 0x28D92
ONE_DISCRIMINATOR = 0xD04
ONE_CLEARS_IT = 0x28D94
ONE_SETS_IT = 0x29000
ONE_SCREEN_BLOCK = 0x29008
ONE_COOKIE_EXITS = (0x28DC6, 0x28DFA, 0x28E32)

#: The three cookies, as the firmware spells them, in the order it checks them.
GSPM = (0x47, 0x53, 0x50, 0x4D)
LWJL = (0x4C, 0x57, 0x4A, 0x4C)
PTYY = (0x50, 0x54, 0x59, 0x59)
AHCM = (0x41, 0x48, 0x43, 0x4D)

#: Where the marker after the pointer table sits, per architecture, and the slot count that implies.
#: `docs/findings.md` section 20: the table starts at 0x0B and an item is four bytes.
MARKER_OFFSET = {'one34_code': (0x63, 22), 'h700_code': (0x5B, 20),
                 'h600_code_complete': (0x5B, 20)}

#: The routine that points a container read at one of the two containers, on arch 12, and the page
#: value it writes for each. The page register takes the flash address's top byte less three.
ONE_SELECTOR = 0x2BA2C
ONE_PAGE_REGISTER = 0x020025
CONTAINER_BASES = {0x040000: 0x01, 0x002000: 0xFD}


def _instructions(name, base):
    code = lab.load(name)
    out, off = [], 0
    while off + 2 <= len(code):
        instr = isa.decode(code, off, base)
        out.append((base + off, instr))
        off += 2 * instr.words
    return out


def _literals_after(instrs, at, count):
    """The next `count` MOVLW literals at or after address `at`, which is how a cookie is spelled."""
    out = []
    for address, instr in instrs:
        if address < at:
            continue
        if instr.mnemonic == 'MOVLW':
            out.append(instr.fields['k'])
            if len(out) == count:
                break
    return tuple(out)


class OneRoutineDisplaysAStatusScreenAndEachCallerIsACondition(unittest.TestCase):
    """The claim section 244 could not make, and the shape of the search that found it."""

    def test_every_image_has_exactly_one_such_routine_with_the_stated_call_sites(self):
        """Exactly, not at least: a sixth condition would be a screen nobody has accounted for."""
        for name, (base, shower, sites) in SHOWERS.items():
            instrs = _instructions(name, base)
            found = {a for a, i in instrs
                     if i.mnemonic in ('CALL', 'RCALL') and i.fields.get('target') == shower}
            with self.subTest(image=name):
                self.assertEqual(found, set(sites), 'the call sites of 0x%05X' % shower)

    def test_each_site_passes_the_number_recorded_for_it(self):
        """The numbers, read off the instructions rather than trusted from the table above."""
        for name, (base, shower, sites) in SHOWERS.items():
            instrs = _instructions(name, base)
            index = {a: n for n, (a, _) in enumerate(instrs)}
            for at, number in sites.items():
                # The two bytes are written immediately before the call, high byte cleared, with
                # bank selects in between. The low byte is a literal, or cleared for screen 0.
                prior = [p for _, p in instrs[index[at] - 7:index[at]]
                         if p.category != isa.BANKSEL]
                self.assertEqual(prior[-1].mnemonic, 'CLRF', 'high byte at 0x%05X' % at)
                slot = prior[-1].fields['f']
                low = prior[-2]
                self.assertEqual(low.fields.get('f'), slot - 1, 'low byte at 0x%05X' % at)
                with self.subTest(image=name, site=hex(at)):
                    if number == 0:
                        self.assertEqual(low.mnemonic, 'CLRF',
                                         'screen 0 is cleared, which is why a literal search '
                                         'for it found nothing')
                    else:
                        self.assertEqual(low.mnemonic, 'MOVWF')
                        self.assertEqual(prior[-3].mnemonic, 'MOVLW')
                        self.assertEqual(prior[-3].fields['k'], number)

    def test_the_numbers_are_the_same_on_every_architecture(self):
        """What makes the number a status code rather than a position in one container.

        Three architectures, and every number that appears in more than one image appears with the
        same value. The record it selects is **not** the same, which is the next class's subject.
        """
        raised = {name: set(sites.values()) for name, (_, _, sites) in SHOWERS.items()}
        common = set.intersection(*raised.values())
        self.assertEqual(common, {0, 25, 26, 27})
        for name, numbers in raised.items():
            with self.subTest(image=name):
                self.assertTrue(numbers <= set(NAMES), 'every number has a name in section 244')

    def test_the_two_configuration_screens_are_the_last_two_sites_everywhere(self):
        """A structural check, so the identification does not rest on the numbers alone.

        On all four images the two adjacent highest call sites are the ones passing 26 and then 0,
        because they are the two arms of one test at the end of the validator.
        """
        for name, (_, _, sites) in SHOWERS.items():
            ordered = [sites[a] for a in sorted(sites)]
            with self.subTest(image=name):
                self.assertEqual(ordered[-2:], [26, 0])


class WhichOfTheTwoConfigurationScreensIsOneByte(unittest.TestCase):
    """Section 249's answer to the bench question, on arch 12 where it was measured.

    Screen 0 and screen 26 are the two arms of one test on one byte. The byte is cleared when the
    validator starts and set in exactly one place, the arm where a computed checksum disagrees with
    the stated one. So screen 26 means "I read a container and its checksum is wrong" and screen 0
    means "I never got as far as a checksum", which on this remote is a cookie that did not match.
    """

    def test_the_discriminator_is_cleared_at_the_entry_and_written_in_one_other_place(self):
        instrs = _instructions('one34_code', 0x20000)
        touching = []
        bsr = None
        for address, instr in instrs:
            if instr.category == isa.BANKSEL:
                bsr = instr.fields['k']
            if not ONE_VALIDATOR <= address < ONE_SCREEN_BLOCK + 0x64:
                continue
            if instr.category in (isa.FILE_A, isa.FILE_DA, isa.BIT):
                where, _ = isa.resolve_file(instr.fields['f'], instr.fields['a'], bsr)
                if where == ONE_DISCRIMINATOR:
                    touching.append((address, instr.mnemonic))
        writes = [a for a, m in touching if m in ('CLRF', 'MOVWF')]
        self.assertEqual(writes, [ONE_CLEARS_IT, ONE_SETS_IT])
        self.assertEqual(dict(touching)[ONE_CLEARS_IT], 'CLRF')
        self.assertEqual(dict(touching)[ONE_SETS_IT], 'MOVWF')

    def test_three_cookie_failures_jump_into_the_screen_block_without_setting_it(self):
        """Which is what leaves the byte at zero, and so what selects screen 0.

        Asserted as three, exactly: a fourth structural check would be a fourth way to reach the
        website message and the sentence above would need saying differently.
        """
        instrs = _instructions('one34_code', 0x20000)
        jumps = [a for a, i in instrs
                 if ONE_VALIDATOR <= a < ONE_SETS_IT
                 and i.fields.get('target') == ONE_SCREEN_BLOCK
                 and i.mnemonic not in ('CALL', 'RCALL')]
        self.assertEqual(jumps, list(ONE_COOKIE_EXITS) + [0x28FE2])
        for exit_at in ONE_COOKIE_EXITS:
            self.assertLess(exit_at, ONE_SETS_IT,
                            'a cookie exit runs before the byte can be set')


class TheThreeChecksAreTheContainersOwnCookies(unittest.TestCase):
    """And reading them confirms section 20's pointer table, from the firmware, by accident.

    The second cookie is sought at a fixed offset, and that offset is the end of the pointer table:
    `0x0B + 4 * slots`, which comes out at 22 slots on arch 12 and 20 on arch 14. Section 20
    corrected both parsers here from a `u32` table at `0x0C` to a four byte item table at `0x0B`,
    one slot short, and this is the firmware saying the corrected reading is right.
    """

    def test_the_arch12_validator_checks_gspm_then_lwjl_then_ptyy(self):
        instrs = _instructions('one34_code', 0x20000)
        self.assertEqual(_literals_after(instrs, 0x28DAC, 4), GSPM)
        self.assertEqual(_literals_after(instrs, 0x28DE0, 4), LWJL)
        self.assertEqual(_literals_after(instrs, 0x28E18, 4), PTYY)

    def test_the_marker_offset_states_the_slot_count_per_architecture(self):
        for name, (offset, slots) in MARKER_OFFSET.items():
            with self.subTest(image=name):
                self.assertEqual(offset, 0x0B + 4 * slots)

    def test_the_arch14_validator_checks_the_same_three_at_its_own_marker_offset(self):
        """Two images, and the offset differs from arch 12's by exactly two slots."""
        for name, start, cookie2 in (('h700_code', 0x16492, 0x164C6),
                                     ('h600_code_complete', 0x151F0, 0x15224)):
            instrs = _instructions(name, 0x9000)
            with self.subTest(image=name):
                self.assertEqual(_literals_after(instrs, start, 4), GSPM)
                self.assertEqual(_literals_after(instrs, cookie2, 4), LWJL)

    def test_arch9_checks_its_own_cookie_instead(self):
        """The negative that says the check is per format rather than a constant of the code."""
        instrs = _instructions('h525_code', 0x0)
        self.assertEqual(_literals_after(instrs, 0x04E1A, 4), AHCM)
        self.assertNotEqual(AHCM, GSPM)


class WhichContainerIsValidatedIsOneBit(unittest.TestCase):
    """And it names the two container bases, which is the first firmware word on either.

    One routine positions a container read, and it branches on a single bit to choose between two
    pages of external flash. The page register takes the flash address's top byte less three, so
    page 1 is `0x040000`, the user configuration, and page `0xFD` is `0x002000`, the container these
    status screens live in. Both bases were known from dumps and from where a configuration is
    written; neither had been read out of the firmware.
    """

    def test_the_selector_writes_one_of_two_pages_and_nothing_else(self):
        instrs = _instructions('one34_code', 0x20000)
        pages = [i.fields['k'] for a, i in instrs
                 if ONE_SELECTOR <= a < 0x2BA76 and i.mnemonic == 'MOVLW'
                 and i.fields['k'] in CONTAINER_BASES.values()]
        self.assertEqual(sorted(pages), sorted(CONTAINER_BASES.values()))

    def test_each_page_is_its_flash_address_less_three(self):
        """The arithmetic, stated as an equality so a change to either side fails.

        A page is a byte, so the subtraction wraps: `0x00 - 3` is `0xFD`, which is why the status
        container's page looks like a large number rather than a small one.
        """
        for address, page in CONTAINER_BASES.items():
            with self.subTest(base=hex(address)):
                self.assertEqual((address >> 16) - 3 & 0xFF, page)

    def test_the_selector_writes_them_to_the_page_register(self):
        """Otherwise the two literals could be anything: it is the destination that makes them pages."""
        instrs = _instructions('one34_code', 0x20000)
        pointer = {}
        for address, instr in instrs:
            if not ONE_SELECTOR <= address < 0x2BA76:
                continue
            if instr.mnemonic == 'MOVLW':
                literal = instr.fields['k']
            elif instr.mnemonic == 'MOVWF' and instr.fields['f'] in (0xF6, 0xF7, 0xF8):
                pointer[instr.fields['f']] = literal
            elif instr.mnemonic == 'CLRF' and instr.fields['f'] in (0xF6, 0xF7, 0xF8):
                pointer[instr.fields['f']] = 0
        built = (pointer[0xF8] << 16) | (pointer[0xF7] << 8) | pointer[0xF6]
        self.assertEqual(built, ONE_PAGE_REGISTER)


if __name__ == '__main__':
    unittest.main()
