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
import pathlib
import re
import unittest

import lab

from harmony.pic18 import chains, isa, trace

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

#: The same three things on arch 14, section 252, at the Harmony 600 image's own addresses.
#:
#: The poll, the flag and the validator transfer instruction for instruction; the **arming condition**
#: does not, which is what the negative below is for. `H600_ARMING_PREDICATE` is the routine that
#: stands where arch 12 reads the verdict bit, and it asks whether a configuration is present.
H600_FLAGS, H600_VERDICT_BIT, H600_SELECT_BIT = 0x68B, 2, 4
H600_POLL, H600_ARMED_FLAG, H600_VALIDATOR = 0x1544A, 0x743, 0x151C6
#: The poll's entry is a bank select; the gate variable is read on the word after it.
H600_READS_THE_GATE = 0x1544C
H600_GATE_VARIABLE = 0x6E3
H600_ARMING_PREDICATE = 0x19486
H600_ARMS_AT = 0x1545C
#: The same flags on arch 9, section 253, all three in one byte and no discriminator variable.
H525_FLAGS, H525_VERDICT_BIT, H525_SELECT_BIT, H525_OTHER_BIT = 0x109, 2, 4, 1
H525_VALIDATOR, H525_BOOT_VALIDATION, H525_SCREEN_DECISION = 0x04DF0, 0x04C34, 0x04F6A
H525_INDEX_VARIABLE = 0x2E3
#: The wrapper whose own MOVLB decides the bank of its caller's masked write, and the caller.
H525_WRAPPER, H525_WRAPPER_SETS_BSR = 0x02570, 0x02574
H525_REVALIDATES = 0x024D0
#: The action ring on arch 9, section 254, and the three routines that between them bound it.
H525_RING_BASE, H525_RING_END, H525_RING_BYTES = 0x0346, 0x03BE, 0x78
H525_RING_POINTER = 0x03BE
H525_INSTRUCTION_LENGTH = 3
#: The underflow bound compares the pointer against the base; the overflow one against the end.
H525_UNDERFLOW_CHECK, H525_OVERFLOW_CHECK = 0x02524, 0x02562
H525_WRAPS_UP, H525_WRAPS_DOWN = 0x0201C, 0x01F18
#: An arch 9 instruction, section 255: operand low, operand high, opcode, staged then copied.
#:
#: The format's own `{ u16 operand; u8 opcode }` little endian, read in file order. What identifies
#: it is the loop head comparing the **third** byte against opcode `0x1F`, which the other two
#: architectures already read, and the **second** against one of that opcode's sub-command values.
H525_STAGED = (0x754, 0x755, 0x756)
H525_WORKING = (0x3D7, 0x3D8, 0x3D9)
H525_LOOP_HEAD, H525_STAGES_AT = 0x01BA2, 0x01BC8
H525_KNOWN_OPCODE, H525_SUBCOMMAND_SPECIAL = 0x1F, 0xFC
#: The fetch, which names both ring constants in one place and steps by a single byte.
H525_FETCH, H525_PENDING_COUNT = 0x0193A, 0x345
#: The band that reaches the re-validation is the **operand's high byte**, not the opcode, and the
#: opcodes that reach the chain at all are a separate range. Section 254 conflated the two.
H525_OPERAND_BAND = 0xC0
H525_OPCODE_RANGE = (0x1F, 0x3F)
#: The four bands of that operand byte the chain tests, in the order it tests them, section 256.
#:
#: Section 72 read this dispatcher on arch 12 and read the sub-commands from `0xF7` upwards, so the
#: **map** below is what arch 9 adds rather than the dispatch itself. `0xD0` is the one with a
#: consequence: it consumes a second three byte group, so a list holding one holds a six byte
#: instruction and a disassembler stepping uniformly by three would give the operand triple its own
#: meaning. A reader is unaffected, since a list declares its length in entries.
H525_BANDS = ((0xF0, 0x01F7A), (0xE0, 0x01F90), (0xD0, 0x01FD6), (0xC0, 0x02032))
H525_BAND_D0_FETCHES = (0x01FDE, 0x01FE4, 0x01FEA)
#: Band 0xE0's four sub-commands, decoded with chains.py rather than by reading the literals.
H525_BAND_E0_CASES = {0x00: 0x01FAA, 0x01: 0x01FB2, 0x02: 0x01FC0, 0x03: 0x01FCA}
H525_BAND_E0_CHAIN = 0x01F98
H525_REVALIDATE_DISPATCH, H525_REVALIDATE_ENTRY = 0x02044, 0x02432
H525_ORDER_VARIABLE = 0x3DC

#: Every call site of the arch 9 validator: two in the boot sequence, one wrapper.
H525_VALIDATOR_CALLERS = (0x02570, 0x04C42, 0x04C52)

#: Where each architecture jumps past both screen calls when the container select bit is clear.
SCREEN_GUARDS = {
    'one34_code': (0x20000, 0x2900A, 0x1A4, 3, 0x2906A),
    'h600_code_complete': (0x9000, 0x153F0, 0x68B, 4, 0x15448),
}

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



class TheContainerSelectBitIsAlsoTheScreenGuard(unittest.TestCase):
    """A second guard in front of both screen calls, which section 250 did not name, section 252.

    A validation of the container the bit does not select displays nothing whatever it finds, which
    is why validating the safe mode container at boot puts no screen up. Asserted on both
    architectures, since a guard on one image would be a quirk and on two is the design.
    """

    def test_both_architectures_jump_past_the_screens_when_the_bit_is_clear(self):
        for name, (base, at, flags, bit, past) in SCREEN_GUARDS.items():
            with self.subTest(name):
                lab.require(name)
                instrs = dict(_instructions(name, base))
                guard = instrs[at]
                self.assertEqual((guard.mnemonic, guard.fields['b']), ('BTFSS', bit))
                where, _ = isa.resolve_file(guard.fields['f'], guard.fields['a'], flags >> 8)
                self.assertEqual(where, flags)
                # Bit clear takes the branch, which lands past both calls to the shower.
                self.assertEqual(instrs[at + 2].fields['target'], past)


class TheHarmony600HasThePollAndNotTheLatch(unittest.TestCase):
    """Section 250's open item, answered in the negative by section 252.

    The latch rests on one condition: arming needs the verdict standing, so a failed validation can
    never arm again. Arch 14's arming half does not read the verdict at all, so the argument does not
    transfer and a Harmony 600 should not have a Harmony One's stuck screen.
    """

    def test_the_arch14_poll_gates_on_the_variable_the_predicate_and_the_verdict(self):
        lab.require('h600_code_complete')
        instrs = dict(_instructions('h600_code_complete', 0x9000))
        # The arming half: the gate variable, then a routine, then the flag is set to one.
        gate = instrs[H600_READS_THE_GATE]
        self.assertEqual(gate.mnemonic, 'MOVF')
        where, _ = isa.resolve_file(gate.fields['f'], gate.fields['a'], H600_GATE_VARIABLE >> 8)
        self.assertEqual(where, H600_GATE_VARIABLE)
        self.assertEqual(instrs[0x15450].fields['target'], H600_ARMING_PREDICATE)
        arm = instrs[H600_ARMS_AT]
        self.assertEqual(arm.mnemonic, 'MOVWF')
        self.assertEqual(arm.fields['f'], H600_ARMED_FLAG & 0xFF)
        # The re-check half: armed, the gate variable the other way, and the verdict gone.
        self.assertEqual(instrs[0x1546E].mnemonic, 'MOVF')
        self.assertEqual(instrs[0x15470].fields['k'], 1 << H600_VERDICT_BIT)
        # Then both containers, and the flag cleared with no branch protecting it.
        for at in (0x15476, 0x1547C):
            self.assertEqual(instrs[at].fields['target'], H600_VALIDATOR)
        self.assertEqual(instrs[0x15488].mnemonic, 'CLRF')
        self.assertEqual(instrs[0x15488].fields['f'], H600_ARMED_FLAG & 0xFF)

    def test_the_arch14_arming_half_never_reads_the_verdict_bit(self):
        """The whole difference, stated as a negative over every instruction of that half."""
        lab.require('h600_code_complete')
        instrs = dict(_instructions('h600_code_complete', 0x9000))
        for at in range(H600_POLL, H600_ARMS_AT + 2, 2):
            instr = instrs.get(at)
            if instr is None or instr.category not in (isa.FILE_A, isa.FILE_DA, isa.BIT):
                continue
            where, _ = isa.resolve_file(instr.fields['f'], instr.fields['a'], H600_FLAGS >> 8)
            self.assertNotEqual(where, H600_FLAGS,
                                'arch 14 arms without consulting the verdict, 0x%05X' % at)

    def test_the_control_is_that_arch12_does_read_it_there(self):
        """Otherwise the negative above could be a bank the resolver failed to follow."""
        instrs = dict(_instructions('one34_code', 0x20000))
        read = instrs[0x29074]
        self.assertEqual(read.mnemonic, 'MOVF')
        where, _ = isa.resolve_file(read.fields['f'], read.fields['a'], 1)
        self.assertEqual(where, 0x1A4)
        self.assertEqual(instrs[0x29076].fields['k'], 1 << ONE_VERIFIED_BIT)

    def test_the_arming_predicate_looks_for_content_rather_than_a_verdict(self):
        """It returns one on the first word that is not erased flash, over 32 words."""
        lab.require('h600_code_complete')
        instrs = dict(_instructions('h600_code_complete', 0x9000))
        # The window's base, added into a scratch pair before the read.
        self.assertEqual(instrs[0x194AA].fields['k'], 0xF4)
        self.assertEqual(instrs[0x194AE].fields['k'], 0x01)
        # The count: the index is compared against 0x40 and advances by two.
        self.assertEqual(instrs[0x19492].fields['k'], 0x40)
        self.assertEqual(instrs[0x194CA].fields['k'], 0x02)
        # Both halves complemented, so the test is against 0xFFFF, and a hit returns one.
        self.assertEqual(instrs[0x194C0].mnemonic, 'COMF')
        self.assertEqual(instrs[0x194C4].mnemonic, 'COMF')
        self.assertEqual((instrs[0x194C8].mnemonic, instrs[0x194C8].fields['k']), ('RETLW', 1))
        self.assertEqual((instrs[0x194D2].mnemonic, instrs[0x194D2].fields['k']), ('RETLW', 0))



class TheHarmony525HasNoPollAndNoFlag(unittest.TestCase):
    """Section 253. The latch cannot exist here because nothing arms, which is a third answer.

    Arch 12 arms only while the verdict stands, which is the trap. Arch 14 arms without consulting
    the verdict, so it escapes. Arch 9 has no arming at all: the validator has three call sites and
    the only one outside the boot sequence is reached from a request rather than from a loop.
    """

    def test_the_validator_has_exactly_three_call_sites(self):
        """A fourth would be somewhere else that re-validates, which is the whole question."""
        lab.require('h525_code')
        code = lab.load('h525_code')
        hits = trace.xrefs(code, 0x0, [H525_VALIDATOR])
        self.assertEqual(tuple(sorted(x.addr for x in hits[H525_VALIDATOR])),
                         H525_VALIDATOR_CALLERS)

    def test_the_container_select_bit_is_written_from_the_index_inside_the_validator(self):
        """Which is arch 9's own arrangement: the caller states an index, the validator publishes it."""
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        read = instrs[0x04DF8]
        self.assertEqual(read.mnemonic, 'MOVF')
        where, _ = isa.resolve_file(read.fields['f'], read.fields['a'], H525_INDEX_VARIABLE >> 8)
        self.assertEqual(where, H525_INDEX_VARIABLE)
        # Bit 0 of the index, shifted left four times, is the select bit's position.
        self.assertEqual(instrs[0x04DFC].fields['k'], 0x01)
        shifts = [at for at in range(0x04E00, 0x04E08, 2) if instrs[at].mnemonic == 'RLNCF']
        self.assertEqual(len(shifts), 4)
        self.assertEqual(1 << H525_SELECT_BIT, 1 << len(shifts))
        # Merged in under a mask that clears exactly that bit and nothing else.
        self.assertEqual(instrs[0x04E08].fields['k'], 0xFF & ~(1 << H525_SELECT_BIT))
        merge = instrs[0x04E0A]
        where, _ = isa.resolve_file(merge.fields['f'], merge.fields['a'], H525_FLAGS >> 8)
        self.assertEqual(where, H525_FLAGS)

    def test_the_boot_validation_records_each_container_in_its_own_bit(self):
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        for at, mnemonic, bit in ((0x04C38, 'BCF', H525_OTHER_BIT),
                                  (0x04C3C, 'BCF', H525_VERDICT_BIT),
                                  (0x04C4A, 'BSF', H525_OTHER_BIT),
                                  (0x04C5A, 'BSF', H525_VERDICT_BIT)):
            instr = instrs[at]
            self.assertEqual((instr.mnemonic, instr.fields['b']), (mnemonic, bit))
            where, _ = isa.resolve_file(instr.fields['f'], instr.fields['a'], H525_FLAGS >> 8)
            self.assertEqual(where, H525_FLAGS)
        # Index 0 first, then index 1, each followed by its own validation.
        self.assertEqual(instrs[0x04C40].mnemonic, 'CLRF')
        self.assertEqual(instrs[0x04C4E].fields['k'], 0x01)
        for at in (0x04C42, 0x04C52):
            self.assertEqual(instrs[at].fields['target'], H525_VALIDATOR)

    def test_the_screen_decision_branches_on_the_second_container_and_not_on_a_discriminator(self):
        """Two architectures pick by which check failed; this one picks by which container did."""
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        guard = instrs[0x04F6C]
        self.assertEqual((guard.mnemonic, guard.fields['b']), ('BTFSC', H525_VERDICT_BIT))
        pick = instrs[0x04F7E]
        self.assertEqual((pick.mnemonic, pick.fields['b']), ('BTFSS', H525_OTHER_BIT))
        for at in (guard, pick):
            where, _ = isa.resolve_file(at.fields['f'], at.fields['a'], H525_FLAGS >> 8)
            self.assertEqual(where, H525_FLAGS)
        # The two screen numbers, 26 then 0, in that order and reached by falling through.
        self.assertEqual(instrs[0x04F70].fields['k'], 26)
        self.assertEqual(instrs[0x04F88].mnemonic, 'CLRF')
        # No discriminator: nothing between the guard and the second screen reads another variable
        # for the choice, which is what arch 12 and arch 14 both do.
        self.assertEqual(trace.xrefs(lab.load('h525_code'), 0x0, [0x04F70])[0x04F70], [])

    def test_the_wrapper_sets_the_bank_its_caller_writes_in(self):
        """The pitfall: the verdict's second writer is invisible to both of our instruments.

        `0x024D0` writes the verdict with a mask rather than with BSF or BCF, so a bit scan misses
        it, and the bank comes from a MOVLB executed inside this callee, so a linear tracer
        attributes the write to the wrong bank and reports no contradiction.
        """
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        self.assertEqual(instrs[H525_WRAPPER].fields['target'], H525_VALIDATOR)
        bank = instrs[H525_WRAPPER_SETS_BSR]
        self.assertEqual((bank.mnemonic, bank.fields['k']), ('MOVLB', H525_FLAGS >> 8))
        # The caller then masks the verdict bit out of that bank's byte and ORs the result in.
        self.assertEqual(instrs[H525_REVALIDATES + 6].fields['target'], H525_WRAPPER)
        self.assertEqual(instrs[0x024DA].fields['k'], 0xFF & ~(1 << H525_VERDICT_BIT))
        self.assertEqual(instrs[0x024DC].mnemonic, 'ANDWF')
        self.assertEqual(instrs[0x024E0].mnemonic, 'MOVWF')
        self.assertEqual(instrs[0x024E0].fields['f'], H525_FLAGS & 0xFF)



class TheHarmony525ActionRingClosesOnItself(unittest.TestCase):
    """Section 254. Three constants off three routines, and each is a bound only if the others are.

    The point of asserting the closure rather than the values is that a single wrong constant would
    still look like a plausible ring. Here the base plus the wrap has to equal the end, and the two
    bound checks have to compare against different ends in opposite directions.
    """

    def test_the_base_plus_the_wrap_is_the_end(self):
        self.assertEqual(H525_RING_BASE + H525_RING_BYTES, H525_RING_END)

    def test_the_ring_holds_forty_three_byte_instructions(self):
        self.assertEqual(H525_RING_BYTES % H525_INSTRUCTION_LENGTH, 0)
        self.assertEqual(H525_RING_BYTES // H525_INSTRUCTION_LENGTH, 40)

    def test_the_span_equals_the_codecs_own_queue_constant(self):
        """Arch 9's ring and arch 12's are the same size, reached with nothing in common.

        Section 34 derived `0x78` on the Harmony One from the queue's own writer. This one falls out
        of a base address, an end address and two wrap sites on a Harmony 525. The equality is worth
        an assertion rather than a sentence, because the queue rail that refuses an oversized
        sequence rests on the number, and either side moving should be a failure rather than a
        silent divergence. Read out of the TypeScript source, since that is where the codec's copy
        lives and a second Python copy is exactly what this repository forbids.
        """
        source = pathlib.Path(__file__).resolve().parent.parent / 'packages/codec/src/queue.ts'
        stated = re.search(r'ACTION_QUEUE_BYTES\s*=\s*(0x[0-9a-fA-F]+|\d+)', source.read_text())
        self.assertIsNotNone(stated, 'the codec still exports ACTION_QUEUE_BYTES')
        self.assertEqual(int(stated.group(1), 0), H525_RING_BYTES)

    def test_the_underflow_check_compares_the_pointer_against_the_base(self):
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        self.assertEqual(instrs[H525_UNDERFLOW_CHECK + 4].fields['k'], H525_RING_BASE & 0xFF)
        self.assertEqual(instrs[H525_UNDERFLOW_CHECK + 8].fields['k'], H525_RING_BASE >> 8)
        # And the site that fires on it adds the whole span back.
        self.assertEqual(instrs[H525_WRAPS_UP].fields['k'], H525_RING_BYTES)
        self.assertEqual(instrs[H525_WRAPS_UP + 2].mnemonic, 'ADDWF')

    def test_the_overflow_check_compares_against_the_other_end_and_subtracts(self):
        """Opposite direction, different constant, and neither routine names the other's."""
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        self.assertEqual(instrs[H525_OVERFLOW_CHECK + 4].fields['k'], H525_RING_END & 0xFF)
        self.assertEqual(instrs[H525_OVERFLOW_CHECK + 8].fields['k'], H525_RING_END >> 8)
        self.assertEqual(instrs[H525_WRAPS_DOWN].fields['k'], H525_RING_BYTES)
        self.assertEqual(instrs[H525_WRAPS_DOWN + 2].mnemonic, 'SUBWF')

    def test_the_pointer_sits_immediately_past_the_ring_and_moves_by_one_instruction(self):
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        self.assertEqual(H525_RING_POINTER, H525_RING_END)
        self.assertEqual(instrs[0x02012].fields['k'], H525_INSTRUCTION_LENGTH)
        step = instrs[0x02016]
        self.assertEqual(step.mnemonic, 'SUBWF')
        where, _ = isa.resolve_file(step.fields['f'], step.fields['a'], H525_RING_POINTER >> 8)
        self.assertEqual(where, H525_RING_POINTER)

    def test_the_revalidation_is_reached_from_an_operand_band_with_the_order_in_its_low_nibble(self):
        """An **operand** band, not an opcode one, which is section 255's correction to 254."""
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        # The band test, then the low nibble into the order variable, then the call.
        self.assertEqual(instrs[0x02030].fields['k'], H525_OPERAND_BAND)
        self.assertEqual(instrs[0x02038].fields['k'], 0x0F)
        order = instrs[0x0203E]
        self.assertEqual(order.mnemonic, 'MOVWF')
        where, _ = isa.resolve_file(order.fields['f'], order.fields['a'], H525_ORDER_VARIABLE >> 8)
        self.assertEqual(where, H525_ORDER_VARIABLE)
        self.assertEqual(instrs[H525_REVALIDATE_DISPATCH].fields['target'], H525_REVALIDATE_ENTRY)



class AnArch9InstructionIsOperandThenOpcode(unittest.TestCase):
    """Section 255, and it is what makes section 254's band an operand's rather than an opcode's.

    The identification does not rest on the field order looking familiar. It rests on the loop head
    comparing the **third** staged byte against `0x1F`, an opcode arch 12 and arch 14 already read,
    and the **second** against one of that opcode's known sub-command values, which is only coherent
    if the third byte is the opcode and the second is the operand's high byte.
    """

    def test_the_loop_head_fetches_three_bytes_and_stages_them_in_order(self):
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        for n, staged in enumerate(H525_STAGED):
            fetch = instrs[H525_LOOP_HEAD + 6 * n]
            self.assertEqual(fetch.fields['target'], H525_FETCH)
            store = instrs[H525_LOOP_HEAD + 6 * n + 4]
            self.assertEqual(store.mnemonic, 'MOVWF')
            self.assertEqual(store.fields['f'], staged & 0xFF)

    def test_the_third_byte_is_tested_against_an_opcode_the_other_architectures_read(self):
        """The whole identification, in two instructions."""
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        self.assertEqual(instrs[0x01BB4].fields['k'], H525_KNOWN_OPCODE)
        opcode = instrs[0x01BB6]
        self.assertEqual(opcode.mnemonic, 'SUBWF')
        self.assertEqual(opcode.fields['f'], H525_STAGED[2] & 0xFF)
        # And the second byte against a sub-command value of that same opcode.
        self.assertEqual(instrs[0x01BBA].fields['k'], H525_SUBCOMMAND_SPECIAL)
        self.assertEqual(instrs[0x01BBC].fields['f'], H525_STAGED[1] & 0xFF)

    def test_the_staged_triple_is_copied_into_the_working_registers_in_the_same_order(self):
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        for n, (staged, working) in enumerate(zip(H525_STAGED, H525_WORKING)):
            move = instrs[H525_STAGES_AT + 4 * n]
            self.assertEqual(move.mnemonic, 'MOVFF')
            self.assertEqual(move.fields['src'], staged)
            self.assertEqual(move.fields['dst'], working)

    def test_the_band_tested_is_the_operand_high_byte_and_not_the_opcode(self):
        """The correction itself: the byte the chain masks is the second, not the third."""
        self.assertEqual(H525_WORKING[1], 0x3D8)
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        masked = instrs[0x0203A]
        self.assertEqual(masked.mnemonic, 'ANDWF')
        self.assertEqual(masked.fields['f'], H525_WORKING[1] & 0xFF)
        # And the opcode is narrowed separately, before any of the band tests.
        low, high = H525_OPCODE_RANGE
        self.assertEqual(instrs[0x01F6A].fields['k'], low)
        self.assertEqual(instrs[0x01F72].fields['k'], high)
        for at in (0x01F6C, 0x01F74):
            self.assertEqual(instrs[at].fields['f'], H525_WORKING[2] & 0xFF)

    def test_no_bank_select_sits_between_the_resolved_read_and_the_band_tests(self):
        """The chain of custody that settles the bank, which an inference could not.

        `0x01C8C` sets BSR to 3 and `0x01C8E` reads the opcode resolved. If nothing between there
        and the mask changes BSR, every banked operand on the path is in bank 3 as a fact rather
        than as the disassembler's guess, and losing that is what left section 254 open.
        """
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        anchor = instrs[0x01C8C]
        self.assertEqual((anchor.mnemonic, anchor.fields['k']), ('MOVLB', H525_WORKING[0] >> 8))
        path = (0x01C8E, 0x01C90, 0x01C92, 0x01F6A, 0x01F6C, 0x01F6E, 0x01F72, 0x01F74, 0x01F76,
                0x01F78, 0x01F7A, 0x01F7C, 0x01F8E, 0x01F90, 0x01F92, 0x01FD4, 0x01FD6, 0x01FD8,
                0x02030, 0x02032, 0x02034, 0x02038, 0x0203A)
        for at in path:
            self.assertNotEqual(instrs[at].category, isa.BANKSEL,
                                'a MOVLB at 0x%05X would break the chain of custody' % at)



class TheArch9OperandBandsAreFourAndOneTakesASecondGroup(unittest.TestCase):
    """Section 256, and the dispatch itself is section 72's on arch 12: this is the arch 9 map.

    The band worth a test is `0xD0`, which fetches a second three byte group out of the ring. That
    makes a list entry six bytes wide, which a reader never notices because a list declares its
    length in entries, and which a disassembler would notice by assigning a meaning to an operand.
    """

    def test_the_chain_tests_four_bands_in_descending_order(self):
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        for band, at in H525_BANDS:
            self.assertEqual(instrs[at - 2].fields['k'], band)
            compare = instrs[at]
            self.assertEqual(compare.mnemonic, 'SUBWF')
            self.assertEqual(compare.fields['f'], H525_WORKING[1] & 0xFF,
                             'every band tests the operand high byte, not the opcode')
        self.assertEqual([b for b, _ in H525_BANDS], sorted((b for b, _ in H525_BANDS),
                                                            reverse=True))

    def test_the_d0_band_fetches_a_second_three_byte_group(self):
        """The only band that does, and the reason a uniform three byte walk would mis-assign one."""
        lab.require('h525_code')
        instrs = dict(_instructions('h525_code', 0x0))
        for at in H525_BAND_D0_FETCHES:
            self.assertEqual(instrs[at].fields['target'], H525_FETCH)
        self.assertEqual(len(H525_BAND_D0_FETCHES), len(H525_WORKING))
        # And it stores them over the working triple, so the instruction's own operand is consumed.
        for n, working in enumerate(H525_WORKING):
            store = instrs[H525_BAND_D0_FETCHES[n] + 4]
            self.assertEqual(store.mnemonic, 'MOVWF')
            self.assertEqual(store.fields['f'], working & 0xFF)
        # No other band fetches: this is what makes the width per band rather than per architecture.
        for band, at in H525_BANDS:
            if band == 0xD0:
                continue
            window = [instrs[a] for a in range(at, at + 12, 2) if a in instrs]
            self.assertFalse([i for i in window if i.fields.get('target') == H525_FETCH],
                             'band 0x%02X fetches too, so the width is not per band' % band)

    def test_band_e0_has_four_sub_commands_decoded_by_the_chain_tool(self):
        """Read with chains.py, since an XORLW chain's literals are not its case values."""
        lab.require('h525_code')
        cases = chains.xor_chain(lab.load('h525_code'), 0x0, H525_BAND_E0_CHAIN)
        self.assertEqual({c.value: c.target for c in cases}, H525_BAND_E0_CASES)

if __name__ == '__main__':
    unittest.main()
