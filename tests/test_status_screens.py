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

from harmony.pic18 import isa, trace

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



#: The cached region descriptors the invalidate command clears, section 246: three records of five
#: bytes, addressed as `index * 5 + 0x0EE8`, byte 0 bit 0 marking a record live.
DESCRIPTORS_AT = 0x0EE8
DESCRIPTOR_STRIDE = 5
DESCRIPTOR_COUNT = 3
#: The module that owns them. Every site that computes an address into the table sits inside it.
DESCRIPTOR_MODULE = (0x29CF0, 0x2A230)

#: The five read helpers the validator uses, which is the population the negative below is over.
VALIDATOR_READ_HELPERS = (0x2BA2C, 0x2B98C, 0x2B8AC, 0x2BA14, 0x2B8F8, 0x2B88A)

#: The main routine, called from the reset vector, and the poll inside its loop.
ONE_MAIN = 0x28A0E
ONE_ENTRY_POINT = 0x2EA38
ONE_POLL = 0x2906C
ONE_POLL_CALL = 0x28B90
#: The re-check's three gates, and the flag it arms and clears.
ONE_ARMED_FLAG = 0x318
ONE_REVALIDATE = 0x29082
ONE_CLEARS_THE_FLAG = 0x290A6

#: Every place the verified bit is written, bank confirmed. None of them is in a write handler.
ONE_VERIFIED_BIT = 2
VERIFIED_WRITERS = {0x266B8: 'BCF', 0x28AB6: 'BCF', 0x28FFA: 'BCF', 0x29006: 'BSF', 0x2C860: 'BCF'}

#: The routine section 250 called "whether USB is up", and the bit it refuses on.
#:
#: It answers the **opposite** question, section 251: one only when the bit is set and the USB module
#: is disabled or suspended, so it asks whether USB is absent and quiet. The name is kept as the
#: address's label and the test below asserts the whole predicate rather than the first bit test,
#: because asserting only the bit test is what let section 250's polarity claim pass a green suite.
ONE_USB_IDLE = 0x20354
CABLE_BIT = 4
#: `UCON` bit 3 is `USBEN` and bit 1 is `SUSPND`, per the 67J50 map in `isa.PARTS`.
UCON_USBEN, UCON_SUSPND = 3, 1

#: The seeder that loads the clock out of base slot 13, and its one caller in the boot init.
#:
#: This is what licenses the remote's clock as an instrument for "did it restart", section 251: the
#: clock is seeded once per boot, before the loop the poll lives in, so a running time that starts
#: over is a restart and nothing else in the image sets those bytes from the record.
ONE_CLOCK_SEEDER = 0x2A264
ONE_SEEDER_CALL = 0x28AE8


def _bit_writes(name, base, address, bit):
    """Every BSF or BCF of one bit of one data address, with the bank confirmed rather than guessed."""
    code = lab.load(name)
    off, bsr, out = 0, None, {}
    while off + 2 <= len(code):
        instr = isa.decode(code, off, base)
        at = base + off
        if instr.category == isa.BANKSEL:
            bsr = instr.fields['k']
        if instr.category == isa.BIT and instr.fields['b'] == bit \
                and instr.mnemonic in ('BSF', 'BCF'):
            where, _ = isa.resolve_file(instr.fields['f'], instr.fields['a'], bsr)
            if where == address and bsr == (address >> 8):
                out[at] = instr.mnemonic
        off += 2 * instr.words
    return out


def _routine(instrs, entry):
    """One routine's instructions, from its entry to the first return at or after it."""
    out = []
    for at, instr in instrs:
        if at < entry:
            continue
        out.append((at, instr))
        if instr.mnemonic.startswith('RETURN') or instr.mnemonic == 'RETLW':
            break
    return out


def _reaches(instrs, entry, low, high, depth=6, seen=None):
    """Whether a call or jump chain from `entry` gets into [low, high), within `depth` levels."""
    if seen is None:
        seen = set()
    if entry in seen or depth == 0:
        return False
    seen.add(entry)
    for _, instr in _routine(instrs, entry):
        target = instr.fields.get('target')
        if target is None or instr.mnemonic not in ('CALL', 'RCALL', 'GOTO', 'BRA'):
            continue
        if low <= target < high:
            return True
        if instr.mnemonic in ('CALL', 'RCALL', 'GOTO') \
                and _reaches(instrs, target, low, high, depth - 1, seen):
            return True
    return False


class TheValidatorsReadNeverConsultsTheCachedDescriptors(unittest.TestCase):
    """The negative that refutes section 249's own account of the bench, in place.

    That section said the invalidate must change what the cookie read sees, on the reasoning that
    the flash held the right cookies and the remote reported otherwise. The reasoning was sound and
    the conclusion is wrong: none of the validator's read helpers can reach the module that owns the
    descriptors, so clearing them cannot change whether a cookie matches. Section 250 has what does.
    """

    def test_the_descriptor_table_is_addressed_only_inside_one_module(self):
        """Thirty sites, all in one range, which is what makes the negative below checkable."""
        instrs = _instructions('one34_code', 0x20000)
        sites = []
        for n, (at, instr) in enumerate(instrs):
            if instr.mnemonic != 'MULLW' or instr.fields.get('k') != DESCRIPTOR_STRIDE:
                continue
            literals = [p.fields['k'] for _, p in instrs[n:n + 12] if p.mnemonic == 'MOVLW']
            if DESCRIPTORS_AT & 0xFF in literals and DESCRIPTORS_AT >> 8 in literals:
                sites.append(at)
        self.assertEqual(len(sites), 30)
        low, high = DESCRIPTOR_MODULE
        self.assertTrue(all(low <= at < high for at in sites),
                        'every site inside 0x%05X to 0x%05X' % DESCRIPTOR_MODULE)

    def test_no_read_helper_of_the_validator_reaches_that_module(self):
        instrs = _instructions('one34_code', 0x20000)
        low, high = DESCRIPTOR_MODULE
        for helper in VALIDATOR_READ_HELPERS:
            with self.subTest(helper=hex(helper)):
                self.assertFalse(_reaches(instrs, helper, low, high),
                                 'a read helper must not consult a cached descriptor')

    def test_the_control_is_that_the_invalidate_handler_does_reach_it(self):
        """Otherwise the search above could be failing rather than answering."""
        instrs = _instructions('one34_code', 0x20000)
        low, high = DESCRIPTOR_MODULE
        self.assertTrue(_reaches(instrs, 0x266B2, low, high),
                        "the invalidate's own executor reaches the module")


class AStatusScreenNeedsTheVerifiedBitAlreadyClear(unittest.TestCase):
    """Section 250, and it is what makes the screen a latch rather than a report.

    Both configuration screens sit behind one test of the verified bit: if the remote already counts
    its configuration as verified, a failing validation displays nothing at all. So a screen means
    the bit was clear when the validator ran, and the four places that clear it are what matters.
    """

    def test_the_two_screen_calls_are_behind_a_test_of_that_bit(self):
        instrs = _instructions('one34_code', 0x20000)
        guard = dict((at, i) for at, i in instrs).get(0x29010)
        self.assertIsNotNone(guard)
        self.assertEqual(guard.mnemonic, 'BTFSC')
        self.assertEqual(guard.fields['b'], ONE_VERIFIED_BIT)
        # And it jumps past both calls when the bit is set.
        self.assertEqual(dict(instrs)[0x29012].fields['target'], 0x29032)
        for site in (0x29022, 0x2902E):
            self.assertLess(site, 0x29032, 'the screen call is skipped by that jump')

    def test_the_bit_is_written_in_five_places_and_none_is_a_write_handler(self):
        """Exactly five, so a sixth writer would fail this rather than pass unnoticed.

        The five are: the boot initialisation, the boot arm that fails a licence check, the checksum
        mismatch, the checksum match, and the `WRITE_MISC` invalidate. **No flash write, erase or
        transfer handler touches it**, which is the fact section 250 turns on: a write on its own
        leaves the remote's verdict standing.
        """
        writes = _bit_writes('one34_code', 0x20000, 0x1A4, ONE_VERIFIED_BIT)
        self.assertEqual(writes, VERIFIED_WRITERS)
        # The erase and write handlers, from `tests/test_external_erase.py`, are outside all five.
        for handler in (0x265FC, 0x2B862, 0x2B87E):
            self.assertNotIn(handler, writes)


class TheRemoteCanOnlyReCheckWhileItsVerdictStands(unittest.TestCase):
    """Why a status screen stays up until the batteries come out, which nothing here had explained.

    The main loop polls one routine. It **arms** a flag while the cable is in and the configuration
    counts as verified, and it **re-validates** while the cable is out, the flag is armed and the
    verdict has gone. The flag is cleared after a re-validation whatever the outcome. So a failed
    validation leaves the verdict clear, the arming condition can never be met again, and the remote
    never looks at its configuration again. A power cycle is the only way out.

    **The two cable states were the other way round until section 251**, which is a correction to the
    prose and to no assertion: what the tests below check is which bit value takes which branch, and
    that was always right. The polarity that names one of those values "a cable" is the neighbouring
    class's subject, and section 250 got it from a routine it had named rather than derived.
    """

    def test_the_poll_runs_from_the_main_loop_reached_from_the_reset_vector(self):
        instrs = _instructions('one34_code', 0x20000)
        by_address = dict(instrs)
        self.assertEqual(by_address[ONE_POLL_CALL].fields['target'], ONE_POLL)
        self.assertEqual(by_address[ONE_ENTRY_POINT].fields['target'], ONE_MAIN)
        self.assertLess(ONE_MAIN, ONE_POLL_CALL, 'the poll is inside that routine')

    def test_arming_needs_the_cable_in_and_the_verdict_standing(self):
        instrs = dict(_instructions('one34_code', 0x20000))
        # The cable bit **set**, which is a cable absent, goes straight to the re-validation half.
        self.assertEqual(instrs[0x29070].fields['target'], ONE_REVALIDATE)
        self.assertEqual(instrs[0x29070].mnemonic, 'BNZ')
        # verdict gone -> the same, so the flag is armed on neither
        self.assertEqual(instrs[0x29078].fields['target'], ONE_REVALIDATE)
        self.assertEqual(instrs[0x29078].mnemonic, 'BZ')
        self.assertEqual(instrs[0x2907E].mnemonic, 'MOVWF')
        self.assertEqual(instrs[0x2907E].fields['f'], ONE_ARMED_FLAG & 0xFF)

    def test_the_flag_is_cleared_after_a_revalidation_whatever_it_found(self):
        """The half that makes it a one way door: no branch protects the clear."""
        instrs = _instructions('one34_code', 0x20000)
        by_address = dict(instrs)
        self.assertEqual(by_address[ONE_CLEARS_THE_FLAG].mnemonic, 'CLRF')
        self.assertEqual(by_address[ONE_CLEARS_THE_FLAG].fields['f'], ONE_ARMED_FLAG & 0xFF)
        between = [i for at, i in instrs if 0x29096 <= at < ONE_CLEARS_THE_FLAG]
        self.assertEqual([i.mnemonic for i in between if i.fields.get('target') is not None],
                         ['RCALL', 'RCALL', 'CALL'],
                         'the two validations and one more call, and no conditional branch')


class ThePortBitTheReCheckWaitsOnIsTheCable(unittest.TestCase):
    """Which is what makes the account above about plugging in rather than about an unknown input.

    **The polarity is the reverse of what section 250 stated**, section 251: bit 4 **clear** means a
    cable is present. Three things say so, and only the first is assertable here: `0x20354` reports
    one when the bit is **set** and the USB module is disabled or suspended, so it is the predicate
    for USB being absent rather than present; `PORTA` reads `0x29` on a connected Harmony One, bit 4
    clear, in section 111 and again on 4 September 2026; and section 99's USB mode loop leaves USB
    mode when the bit is set.
    """

    def test_the_usb_idle_routine_answers_one_when_the_cable_bit_is_set_and_usb_is_quiet(self):
        instrs = dict(_instructions('one34_code', 0x20000))
        test = instrs[ONE_USB_IDLE]
        self.assertEqual((test.mnemonic, test.fields['b']), ('BTFSS', CABLE_BIT))
        _, name = isa.resolve_file(test.fields['f'], test.fields['a'], None)
        self.assertEqual(name, 'PORTA')
        # Bit clear takes the branch, which returns zero without looking at the USB module.
        self.assertEqual(instrs[ONE_USB_IDLE + 2].fields['target'], 0x20360)
        self.assertEqual(instrs[0x20360].mnemonic, 'RETLW')
        self.assertEqual(instrs[0x20360].fields['k'], 0)
        # Bit set falls through to two tests of UCON, the USB control register, and **each of them
        # returns one**. That is the half section 250's test did not assert and the half that carries
        # the meaning: a routine that answers one for a disabled or suspended module is asking
        # whether USB is absent, not whether it is up.
        expected = {0x20358: ('BTFSS', UCON_USBEN), 0x2035C: ('BTFSC', UCON_SUSPND)}
        for at, (mnemonic, bit) in expected.items():
            test = instrs[at]
            self.assertEqual((test.mnemonic, test.fields['b']), (mnemonic, bit))
            _, register = isa.resolve_file(test.fields['f'], test.fields['a'], None)
            self.assertEqual(register, 'UCON')
            self.assertEqual(instrs[at + 2].mnemonic, 'RETLW')
            self.assertEqual(instrs[at + 2].fields['k'], 1)

    def test_the_recheck_and_the_usb_routine_read_the_same_bit(self):
        """Otherwise the polarity above would be about some other input."""
        instrs = dict(_instructions('one34_code', 0x20000))
        for at in (ONE_POLL, 0x29088):
            read = instrs[at]
            self.assertEqual(read.mnemonic, 'MOVF')
            _, name = isa.resolve_file(read.fields['f'], read.fields['a'], None)
            self.assertEqual(name, 'PORTA')
            self.assertEqual(instrs[at + 2].mnemonic, 'ANDLW')
            self.assertEqual(instrs[at + 2].fields['k'], 1 << CABLE_BIT)



class TheClockIsSeededOncePerBoot(unittest.TestCase):
    """Which is what makes a Harmony One's clock evidence about whether it restarted, section 251.

    Section 111 measured that the clock holds base slot 3's stamp plus the uptime and section 138
    identified it as base slot 13's records 0 to 6. Neither established **when** the seeding happens,
    and without that a clock reading says nothing about a restart: a value near the stamp could be a
    fresh boot or a reseed by something else.
    """

    def test_the_seeder_has_exactly_one_caller(self):
        """A second caller would be a second way for the clock to go back to the stamp."""
        code = lab.load('one34_code')
        hits = trace.xrefs(code, 0x20000, [ONE_CLOCK_SEEDER])
        self.assertEqual([x.addr for x in hits[ONE_CLOCK_SEEDER]], [ONE_SEEDER_CALL])
        self.assertEqual([x.mnemonic for x in hits[ONE_CLOCK_SEEDER]], ['CALL'])

    def test_that_caller_sits_in_the_boot_init_before_the_top_level_loop(self):
        """So the seeding is over before the poll's loop begins, and the poll cannot cause it."""
        instrs = dict(_instructions('one34_code', 0x20000))
        # The reset vector calls the main routine, whose initialisation run holds the seeder call.
        self.assertTrue(any(i.fields.get('target') == ONE_MAIN
                            for at, i in instrs.items() if at >= ONE_ENTRY_POINT),
                        'the entry point calls the main routine')
        self.assertLess(ONE_MAIN, ONE_SEEDER_CALL)
        # `CLRF 0x315` is the mode reset that immediately precedes the loop, and it comes after.
        clears_mode = [at for at, i in instrs.items()
                       if i.mnemonic == 'CLRF' and i.fields.get('f') == 0x15
                       and ONE_SEEDER_CALL < at < ONE_SEEDER_CALL + 0x40]
        self.assertTrue(clears_mode,
                        'the mode variable is cleared after the seeder call and before the loop')
        self.assertLess(ONE_SEEDER_CALL, min(clears_mode))

if __name__ == '__main__':
    unittest.main()
