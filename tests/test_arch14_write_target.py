"""Section 281: arch 14 (Harmony 600, 650 and 700) gets a write target, and it is the Harmony 650.

Two claims, each resting on bytes rather than on a document.

**The rails' two arch 14 numbers are the firmware's.** `WRITABLE_CEILING[14]` is `0x200000` because the
flash address classifier refuses a top byte of `0x20` or more, section 192, which
`test_findings.TestTheFlashAddressIsClassifiedBeforeItIsUsed` asserts on four arch 14 images now.
`ERASE_BLOCK_SIZE[14]` is 64 KiB because the one routine that erases external flash sends the SPI
opcode `0xD8`, which on the EON F16 the bench units carry is the 64 KiB block erase. That routine is
asserted here, in the same four images, by decoding the instruction that loads the opcode.

**The Harmony 650 is not the Harmony 600, and the unit check on the identity block is what refuses the
600.** Both report product id `0xC122` and architecture 14, so the write list admits both. Their skin
and hardware version differ too, and the rehearsal gates on neither. The
identity GUIDs differ and neither is filler, which is the precondition for the unit check being a
check at all; and the 650's are the ones its unit record in the lab holds, so a permission naming
`h650` refuses the 600.
"""

import os
import pathlib
import re
import unittest

import lab
from harmony.pic18 import chains, isa

ROOT = pathlib.Path(__file__).resolve().parent.parent

#: image -> the address of the `MOVLW 0xD8` inside the external flash block erase. The routine selects
#: the part, sends write enable, and then loads the opcode for the byte sender, so the instruction
#: before it is a `MOVLB` and the one after a `MOVWF`, which is what separates it from the one other
#: `MOVLW 0xD8` in each image, a comparison followed by `SUBWF`.
ERASE_OPCODE_AT = {
    'h600_code_complete': 0x17462,
    'h650_bench_code': 0x17462,
    'h650_code': 0x18B9E,
    'h700_code': 0x18DC6,
}
BASE = 0x9000
SPI_BLOCK_ERASE = 0xD8

#: The identity block on page `0xFF` and the span of it that tells two units apart: the two GUIDs,
#: `packages/usb/src/identity.ts`'s `unitDiscriminator`.
IDENTITY_AT = 0xF400
GUIDS = slice(IDENTITY_AT + 0x10, IDENTITY_AT + 0x30)


def _uniform(field):
    """Whether a field is one byte repeated, which is what an unwritten one looks like."""
    return len(set(field)) == 1


def _rail_row(table):
    """One table of `rails.ts`, as {architecture: value}."""
    text = (ROOT / 'packages' / 'usb' / 'src' / 'rails.ts').read_text(encoding='utf-8')
    body = re.search(table + r'[^=]*= \{(.*?)\};', text, re.S)
    return {int(a): int(v, 16) for a, v in re.findall(r'(\d+):\s*(0x[0-9a-fA-F]+)', body.group(1))}


class TheArch14EraseIsASixtyFourKiBBlock(unittest.TestCase):

    def test_every_arch14_image_loads_the_block_erase_opcode_stores_it_and_calls_out(self):
        # What this asserts is the shape, `MOVLB`, `MOVLW 0xD8`, `MOVWF`, `CALL`. That the call lands
        # on the SPI byte sender is the blind reviewer's trace on the 600's image and is not re-derived
        # here for the other three, which is why the title stops at "calls out".
        lab.require(*ERASE_OPCODE_AT)
        for name, at in sorted(ERASE_OPCODE_AT.items()):
            with self.subTest(name):
                code = lab.load(name)
                before, here, after, call = (isa.decode(code, at - BASE + d, BASE)
                                             for d in (-2, 0, 2, 4))
                self.assertEqual(here.mnemonic, 'MOVLW')
                self.assertEqual(here.fields['k'], SPI_BLOCK_ERASE)
                self.assertEqual(before.mnemonic, 'MOVLB')
                self.assertEqual(after.mnemonic, 'MOVWF')
                self.assertEqual(call.mnemonic, 'CALL')

    def test_each_image_loads_that_opcode_in_exactly_two_places_and_only_one_is_a_send(self):
        # The control that the table above names the eraser and not an arbitrary 0xD8: every aligned
        # `MOVLW 0xD8` in each image, and the one that is not the eraser is a timer compare,
        # `SUBWF TMR0H,W` then a branch on carry.
        lab.require(*ERASE_OPCODE_AT)
        for name, at in sorted(ERASE_OPCODE_AT.items()):
            with self.subTest(name):
                code = lab.load(name)
                hits = [o + BASE for o in range(0, len(code) - 1, 2)
                        if code[o:o + 2] == bytes([SPI_BLOCK_ERASE, 0x0E])]
                self.assertEqual(len(hits), 2)
                self.assertIn(at, hits)
                other = next(h for h in hits if h != at)
                self.assertEqual(isa.decode(code, other - BASE + 2, BASE).mnemonic, 'SUBWF')

    def test_the_rails_carry_the_block_and_the_ceiling_the_two_firmware_tests_establish(self):
        # The firmware half is the eraser tests above and the classifier's ceiling in
        # `test_findings.TestTheFlashAddressIsClassifiedBeforeItIsUsed`; this is the rails half,
        # compared against the values those establish rather than reading the images again.
        self.assertEqual(_rail_row('ERASE_BLOCK_SIZE')[14], 0x10000)
        # The classifier's ceiling is a top byte, so the address is that byte shifted by sixteen.
        self.assertEqual(_rail_row('WRITABLE_CEILING')[14], 0x20 << 16)
        self.assertEqual(_rail_row('CONFIG_REGION_BASE')[14], 0x030000)


class TheHarmony650IsToldFromTheHarmony600ByItsIdentityAlone(unittest.TestCase):

    def setUp(self):
        lab.require('h600_page_ff', 'h650_page_ff')
        self.h600 = lab.load('h600_page_ff')[GUIDS]
        self.h650 = lab.load('h650_page_ff')[GUIDS]

    def test_both_units_carry_written_guids(self):
        # A uniform field is filler and would match every unit against every other, which is the
        # trap `identifiesAUnit` exists for.
        for name, guids in (('h600', self.h600), ('h650', self.h650)):
            with self.subTest(name):
                self.assertFalse(_uniform(guids[:0x10]), 'the first GUID is filler')
                self.assertFalse(_uniform(guids[0x10:]), 'the second GUID is filler')

    def test_the_two_units_differ(self):
        self.assertNotEqual(self.h600, self.h650)

    def test_the_650s_unit_record_is_its_own_identity_and_not_the_600s(self):
        record = os.path.join(lab.LAB or '', 'units', 'h650.txt')
        if not os.path.isfile(record):
            self.skipTest('no h650 unit record in the lab')
        with open(record, encoding='utf-8') as fh:
            words = fh.read().split()
        self.assertIn(self.h650.hex(), words)
        self.assertNotIn(self.h600.hex(), words)


# ---------------------------------------------------------------------------------------------------
# Section 282: the cache drop and the restart on the two 0.2 builds, read before either was sent.
# Every address below is the Harmony 650's own build and the Harmony 600's alike, which the first test
# of the first class asserts by comparing the bytes of every routine named, so a claim here is about
# both units. The two builds differ elsewhere, in 1395 bytes, section 281.

BUILDS_02 = ('h600_code_complete', 'h650_bench_code')

WRITE_MISC_CHAIN = 0xC314
CACHE_DROP = 0xC344             # WRITE_MISC selector 2
DESCRIPTOR_LOOP = 0x15E1E
ERASE_PARSE = 0xC240            # ERASE_FLASH's parse handler, state 8
STORE_WRITE = 0xDD16            # write one setting; compacts when both pages are full
STORE_ERASE = 0x19C2E           # erase one 1 KiB block of internal program memory
ESCAPE_CHAIN = 0xBCDA
MODE_CHAIN = 0x150DE
RESET_PATH = 0x1516E

#: The routines a claim below rests on, as (start, end) byte ranges compared between the two builds.
#: The store's whole manager, `0xD276` to `0xDE00`, covers the copy at `0xD442`, the reformat at
#: `0xD804` and the lookups; the restart's callees are the last three.
SHARED = ((WRITE_MISC_CHAIN, 0xC364), (0xC430, 0xC432), (DESCRIPTOR_LOOP, 0x15E88), (0x107A2, 0x107C4),
          (ERASE_PARSE, 0xC2D0), (0xD276, 0xDE00), (0x19906, 0x19940), (STORE_ERASE, 0x19C50),
          (0xBCBC, 0xBD16), (0x15084, 0x1509A), (MODE_CHAIN, 0x150EC), (RESET_PATH, 0x15190),
          (0x189FA, 0x18A10), (0x18B2A, 0x18B40))

#: The unlock sequence and the table write, which is what writing internal program memory needs.
EECON1, EECON2 = 0xFA6, 0xFA7
SKIPS = {'BTFSS', 'BTFSC', 'CPFSEQ', 'CPFSGT', 'CPFSLT', 'DECFSZ', 'DCFSNZ', 'INCFSZ', 'INFSNZ',
         'TSTFSZ'}


def _at(code, address):
    return isa.decode(code, address - BASE, BASE)


def _walk(code, entry, stop=()):
    """Every instruction reachable from `entry`, as (address, instruction).

    Follows fall through, both arms of a branch and of a skip, and every call; stops at a return or
    at an address in `stop`, which is how a handler's shared exit is left out of its own walk.
    """
    seen, work, out = set(), [entry], []
    while work:
        address = work.pop()
        if address in seen or address in stop or not BASE <= address < BASE + len(code):
            continue
        seen.add(address)
        instr = _at(code, address)
        out.append((address, instr))
        name, following = instr.mnemonic, address + 2 * instr.words
        if name in ('RETURN', 'RETLW', 'RETFIE', 'RESET'):
            continue
        target = instr.fields.get('target')
        if name in ('GOTO', 'BRA'):
            work.append(target)
            continue
        if target is not None:
            work.append(target)
        work.append(following)
        if name in SKIPS:
            work.append(following + 2 * _at(code, following).words)
    return out


def _reaches(code, entry, address, stop=()):
    return any(at == address for at, _ in _walk(code, entry, stop))


def _writes_program_memory(code, entry, stop=()):
    """Whether anything reachable from `entry` writes EECON1 or EECON2 or executes a table write.

    Follows fall through, both arms of a branch and of a skip, and every call; stops at a return or
    at an address in `stop`, which is how a handler's shared exit is left out of its own walk.
    """
    seen, work = set(), [entry]
    while work:
        address = work.pop()
        if address in seen or address in stop or not BASE <= address < BASE + len(code):
            continue
        seen.add(address)
        instr = _at(code, address)
        name, following = instr.mnemonic, address + 2 * instr.words
        if name.startswith('TBLWT'):
            return True
        target_register = instr.fields.get('dst')
        if target_register is None and instr.fields.get('a') == 0:
            target_register = 0xF00 | instr.fields.get('f', 0)
        if name in ('MOVWF', 'MOVFF', 'CLRF', 'SETF', 'BSF', 'BCF') \
                and target_register in (EECON1, EECON2):
            return True
        if name in ('RETURN', 'RETLW', 'RETFIE', 'RESET'):
            continue
        target = instr.fields.get('target')
        if name in ('GOTO', 'BRA'):
            work.append(target)
            continue
        if target is not None:
            work.append(target)
        work.append(following)
        if name in SKIPS:
            work.append(following + 2 * _at(code, following).words)
    return False


class TheCacheDropOnTheTwoZeroPointTwoBuilds(unittest.TestCase):

    def test_every_routine_this_rests_on_is_byte_identical_on_the_600_and_the_650(self):
        lab.require(*BUILDS_02)
        h600, h650 = (lab.load(n) for n in BUILDS_02)
        for start, end in SHARED:
            with self.subTest(hex(start)):
                self.assertEqual(h600[start - BASE:end - BASE], h650[start - BASE:end - BASE])

    def test_selector_2_is_the_executor_the_chain_names(self):
        lab.require(*BUILDS_02)
        for name in BUILDS_02:
            with self.subTest(name):
                table = chains.chain_table(lab.load(name), BASE, WRITE_MISC_CHAIN)
                self.assertEqual(set(table), {1, 2, 5, 6, 7, 8, 9, 10, 11})
                self.assertEqual(table[2], CACHE_DROP)
                # The calibration case, as section 97 has it: 0x07 is the RAM write.
                self.assertEqual(_at(lab.load(name), table[7]).fields['dst'], 0xFE9)

    def test_it_clears_four_records_then_the_verdict_and_the_select_bit_and_sets_a_flag(self):
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        call = _at(code, CACHE_DROP)
        self.assertEqual((call.mnemonic, call.fields['target']), ('CALL', DESCRIPTOR_LOOP))
        # Bank 6 then BCF 0x8B,2: the verdict bit of flags byte 0x68B, section 252.
        self.assertEqual((_at(code, 0xC348).mnemonic, _at(code, 0xC348).fields['k']), ('MOVLB', 6))
        verdict = _at(code, 0xC34A)
        self.assertEqual((verdict.mnemonic, verdict.fields['f'], verdict.fields['b']), ('BCF', 0x8B, 2))
        # Bank 7, 1 into 0x25: the flag at 0x725 the next erase reads.
        self.assertEqual(_at(code, 0xC34C).fields['k'], 7)
        self.assertEqual(_at(code, 0xC34E).fields['k'], 1)
        self.assertEqual((_at(code, 0xC350).mnemonic, _at(code, 0xC350).fields['f']), ('MOVWF', 0x25))
        select = _at(code, 0xC35A)
        self.assertEqual((select.mnemonic, select.fields['f'], select.fields['b']), ('BCF', 0x8B, 4))
        # The loop: four records of five bytes at 0xEE6. Arch 12 has three at 0xEE8, section 246.
        self.assertEqual(_at(code, 0x15E22).fields['k'], 4)
        self.assertEqual(_at(code, 0x15E2A).mnemonic, 'MULLW')
        self.assertEqual(_at(code, 0x15E2A).fields['k'], 5)
        self.assertEqual((_at(code, 0x15E34).fields['k'], _at(code, 0x15E38).fields['k']), (0xE6, 0x0E))

    def test_the_drop_itself_writes_no_program_memory_and_the_control_does(self):
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        self.assertFalse(_writes_program_memory(code, CACHE_DROP, stop={0xC430}))
        # The control: the settings store's writer is found by the same walk.
        self.assertTrue(_writes_program_memory(code, STORE_WRITE))


class TheEraseAfterADropUpdatesOneSetting(unittest.TestCase):

    def setUp(self):
        lab.require('h650_bench_code')
        self.code = lab.load('h650_bench_code')

    def test_the_erase_parse_reads_the_flag_and_clears_it(self):
        self.assertEqual(_at(self.code, 0xC242).fields['k'], 8)       # state 8, ERASE_FLASH
        read = _at(self.code, 0xC26C)
        self.assertEqual((read.mnemonic, read.fields['f']), ('MOVF', 0x25))
        self.assertEqual(_at(self.code, 0xC26E).mnemonic, 'BZ')
        self.assertEqual((_at(self.code, 0xC272).mnemonic, _at(self.code, 0xC272).fields['f']),
                         ('CLRF', 0x25))

    def test_at_the_configurations_first_block_it_reads_setting_0x80_and_writes_it_back(self):
        # The address compare: low and middle byte zero, top byte 3, so 0x030000 exactly.
        self.assertEqual(_at(self.code, 0xC296).fields['k'], 0x03)
        self.assertEqual(_at(self.code, 0xC29C).fields['k'], 0x80)
        self.assertEqual(_at(self.code, 0xC2A4).fields['target'], 0xDA04)
        # Bit 0 of what came back is cleared, then setting 0x80 is written with it.
        clear = _at(self.code, 0xC2AE)
        self.assertEqual((clear.mnemonic, clear.fields['b']), ('BCF', 0))
        self.assertEqual(_at(self.code, 0xC2B0).fields['k'], 0x80)
        self.assertEqual(_at(self.code, 0xC2BC).fields['target'], STORE_WRITE)

    def test_the_store_is_two_one_kilobyte_blocks_from_0x1EC00(self):
        # The page base, stated literally before the lookup.
        self.assertEqual((_at(self.code, 0xDB82).fields['k'], _at(self.code, 0xDB86).fields['k']),
                         (0xEC, 0x01))
        # The compaction loop runs twice, index times 0x0400, plus 0x01EC00, into the block eraser.
        self.assertEqual(_at(self.code, 0xDD5E).fields['k'], 2)
        self.assertEqual(_at(self.code, 0xDD74).fields['k'], 0x04)
        self.assertEqual((_at(self.code, 0xDD94).fields['k'], _at(self.code, 0xDD9A).fields['k']),
                         (0xEC, 0x01))
        self.assertEqual(_at(self.code, 0xDDA0).fields['target'], STORE_ERASE)
        # The eraser sets WREN and FREE, a one block erase of program memory.
        self.assertEqual(_at(self.code, 0x19C3C).fields['k'], 0x14)

    def test_an_unchanged_value_writes_nothing_and_a_changed_one_is_a_two_byte_append(self):
        # The compare against the stored value, and on a match code 0 and out, before any table write.
        self.assertEqual((_at(self.code, 0xDC50).mnemonic, _at(self.code, 0xDC50).fields['k']), ('MOVLW', 0))
        self.assertEqual(_at(self.code, 0xDC52).fields['target'], 0xDD14)
        self.assertTrue(_at(self.code, 0xDC9A).mnemonic.startswith('TBLWT'))
        self.assertTrue(_at(self.code, 0xDCA8).mnemonic.startswith('TBLWT'))
        self.assertEqual(_at(self.code, 0xDCAA).fields['k'], 0x24)          # WREN and WPROG

    def test_a_full_store_is_copied_first_and_erased_only_when_the_copy_frees_nothing(self):
        # Code 4 is the free slot search coming back empty, in the append.
        self.assertEqual(_at(self.code, 0xDC58).fields['target'], 0xD368)
        self.assertEqual(_at(self.code, 0xDC7C).fields['k'], 4)
        # The caller: on 4, the copy into the other block, then the append again.
        self.assertEqual(_at(self.code, 0xDD28).fields['k'], 4)
        self.assertEqual(_at(self.code, 0xDD32).fields['target'], 0xD442)
        self.assertEqual(_at(self.code, 0xDD4A).fields['target'], 0xDB60)
        self.assertEqual(_at(self.code, 0xDD50).fields['k'], 4)
        self.assertEqual(_at(self.code, 0xDD56).mnemonic, 'BNZ')
        # Only past that second 4 does the erase loop run, and then a fresh header and the one record.
        self.assertEqual(_at(self.code, 0xDDA0).fields['target'], STORE_ERASE)
        self.assertEqual(_at(self.code, 0xDDB2).fields['target'], 0xD804)
        self.assertEqual(_at(self.code, 0xDDC0).fields['target'], 0xDB60)
        # And an append that fills the active block starts the copy there and then.
        self.assertEqual(_at(self.code, 0xDCF8).fields['target'], 0xD442)

    def test_the_copy_programs_the_other_block_and_erases_nothing(self):
        self.assertTrue(_writes_program_memory(self.code, 0xD442))
        self.assertFalse(_reaches(self.code, 0xD442, STORE_ERASE))


class TheTwoUnitsSettingsStores(unittest.TestCase):
    """What the store holds on both units, read off their internal page 0xFF."""

    #: Records after the four byte header. The draft counted the header as two more, 61 and 5.
    PAGES = {'h600_page_ff': 59, 'h650_page_ff': 3}

    def pairs(self, page, base):
        block = page[base + 4:base + 0x400]
        used = [i for i in range(0, len(block), 2) if block[i:i + 2] != b'\xff\xff']
        return [] if not used else [(block[i], block[i + 1]) for i in range(0, used[-1] + 2, 2)]

    def test_the_first_block_holds_the_records_and_the_second_is_erased(self):
        lab.require(*self.PAGES)
        for name, count in self.PAGES.items():
            with self.subTest(name):
                page = lab.load(name)
                self.assertEqual(page[0xEC00:0xEC04], bytes.fromhex('fcff0000'))
                self.assertEqual(len(self.pairs(page, 0xEC00)), count)
                self.assertEqual(set(page[0xF000:0xF400]), {0xFF})

    def test_setting_0x80_was_written_three_times_and_its_last_value_has_bit_0_clear(self):
        lab.require(*self.PAGES)
        for name in self.PAGES:
            with self.subTest(name):
                values = [v for k, v in self.pairs(lab.load(name), 0xEC00) if k == 0x80]
                self.assertEqual(values, [0xF8, 0xFF, 0xFE])

    def test_the_store_ends_exactly_where_the_identity_block_begins(self):
        # The end is computed from the literals the eraser loop uses, so it reads the firmware: base
        # 0x01EC00, a stride of 0x0400 and two blocks. Page 0xFF is internal 0x010000 up.
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        base = (_at(code, 0xDD9A).fields['k'] << 16) | (_at(code, 0xDD94).fields['k'] << 8)
        stride = _at(code, 0xDD74).fields['k'] << 8
        end = base + _at(code, 0xDD5E).fields['k'] * stride
        self.assertEqual((base, stride, end), (0x01EC00, 0x0400, 0x01F400))
        self.assertEqual(end, 0x010000 + IDENTITY_AT)


class TheRestartOnTheZeroPointTwoBuilds(unittest.TestCase):

    def setUp(self):
        lab.require('h650_bench_code')
        self.code = lab.load('h650_bench_code')

    def test_the_escape_sends_2_and_3_to_one_flag(self):
        table = chains.chain_table(self.code, BASE, ESCAPE_CHAIN)
        self.assertEqual(table, {5: 0xBD0A, 2: 0xBCFC, 3: 0xBCFC, 1: 0xBCEC})
        self.assertEqual((_at(self.code, 0xBCFC).fields['k'], _at(self.code, 0xBCFE).fields['k']), (1, 1))
        self.assertEqual((_at(self.code, 0xBD00).mnemonic, _at(self.code, 0xBD00).fields['f']),
                         ('MOVWF', 0xFF))

    def test_the_flag_puts_the_mode_to_3_and_mode_3_ends_in_reset(self):
        self.assertEqual(_at(self.code, 0x15090).fields['f'], 0xFF)
        self.assertEqual(_at(self.code, 0x15096).fields['k'], 3)
        self.assertEqual(_at(self.code, 0x15098).fields['f'], 0x40)
        self.assertEqual(chains.chain_table(self.code, BASE, MODE_CHAIN)[3], RESET_PATH)
        self.assertEqual(_at(self.code, 0x1518C).mnemonic, 'RESET')

    def test_nothing_on_the_way_writes_program_memory(self):
        self.assertFalse(_writes_program_memory(self.code, RESET_PATH))


#: Section 283, the state variable seeder's guard on the two 0.2 builds and on the 700 2.8: the
#: checksum routine, the seeder that compares it, and the store that restamps it.
SEEDER_SUM = {'h650_bench_code': 0x15FF4, 'h700_code': 0x17944}
SEEDER = 0x16024
VARIABLE_STORE = 0x16474
#: The two 0.2 builds' shared ranges for this section, compared like `SHARED` above.
SEEDER_SHARED = ((0x14F2E, 0x14FA0), (SEEDER_SUM['h650_bench_code'], 0x16140), (VARIABLE_STORE, 0x164C4))


def _checksum_span(code, at):
    """(seed, first address, byte count) the checksum routine at `at` XORs over.

    `MOVLB`, `CLRF` the counter, `MOVLW seed`, `MOVWF`, then the pointer's low and high byte as two
    literal loads and the bound as a third, which is the same shape on both builds read.
    """
    seed = _at(code, at + 4).fields['k']
    low, high = _at(code, at + 8).fields['k'], _at(code, at + 12).fields['k']
    return seed, (high << 8) | low, _at(code, at + 16).fields['k']


class TheSeederReloadsOnlyWhenItsChecksumFailsInTheImage(unittest.TestCase):
    """What the 0.2 image says, which is what section 283's first prediction was built on.

    The unit reloaded on a warm restart anyway, so this is a statement about the image and not about
    what happened at any one boot: `0xED2` was never read at boot time.
    """

    def test_the_routines_are_byte_identical_on_the_600_and_the_650(self):
        lab.require(*BUILDS_02)
        one, other = (lab.load(name) for name in BUILDS_02)
        for start, end in SEEDER_SHARED:
            with self.subTest(hex(start)):
                self.assertEqual(one[start - BASE:end - BASE], other[start - BASE:end - BASE])

    def test_the_checksum_is_an_xor_seeded_0xa5_over_the_variables_above_the_clock(self):
        # 0.2: 174 bytes from 0xE22, the array starting at 0xE10. 700 2.8: 237 from 0x912, array at
        # 0x900. Both start 18 bytes in, so the clock and the firmware's other variables are left out.
        lab.require(*SEEDER_SUM)
        expected = {'h650_bench_code': (0xA5, 0xE22, 0xAE), 'h700_code': (0xA5, 0x912, 0xED)}
        for name, at in SEEDER_SUM.items():
            with self.subTest(name):
                code = lab.load(name)
                self.assertEqual(_checksum_span(code, at), expected[name])
                # And it is an XOR: the byte fetched through INDF0 is folded into the running sum.
                self.assertEqual((_at(code, at + 0x1E).mnemonic, _at(code, at + 0x20).mnemonic),
                                 ('MOVF', 'XORWF'))

    def test_the_seeder_sets_its_guard_when_the_sum_matches_and_the_loop_then_stores_nothing(self):
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        self.assertEqual((_at(code, 0x16038).mnemonic, _at(code, 0x16038).fields['target']),
                         ('RCALL', SEEDER_SUM['h650_bench_code']))
        self.assertEqual((_at(code, 0x1603A).fields['k'], _at(code, 0x1603C).mnemonic,
                          _at(code, 0x1603C).fields['f']), (0x0E, 'SUBWF', 0xD2))
        self.assertEqual((_at(code, 0x16044).fields['k'], _at(code, 0x16048).fields['f']), (1, 0x2D))
        # In the loop, a nonzero guard branches past the store call, to the index increment.
        self.assertEqual((_at(code, 0x160DA).fields['f'], _at(code, 0x160DC).mnemonic,
                          _at(code, 0x160DC).fields['target']), (0x2D, 'BNZ', 0x160EC))

    def test_the_seeder_runs_only_once_a_container_validated(self):
        # 0x68B bit 2 is the user container's verdict and bit 1 the other container's; with neither
        # set the seeder branches straight to the paint.
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        self.assertEqual((_at(code, 0x1602C).fields['f'], _at(code, 0x1602E).fields['k'],
                          _at(code, 0x16030).mnemonic), (0x8B, 0x04, 'BNZ'))
        self.assertEqual((_at(code, 0x16034).fields['k'], _at(code, 0x16036).mnemonic,
                          _at(code, 0x16036).fields['target']), (0x02, 'BZ', 0x16100))
        self.assertEqual(_at(code, 0x160EA).fields['target'], VARIABLE_STORE)

    def test_every_store_addresses_0xe10_and_restamps_the_sum(self):
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        self.assertEqual((_at(code, 0x16480).fields['k'], _at(code, 0x16484).fields['k']), (0x10, 0x0E))
        self.assertEqual(_at(code, 0x164BC).fields['target'], SEEDER_SUM['h650_bench_code'])
        self.assertEqual((_at(code, 0x164C0).mnemonic, _at(code, 0x164C0).fields['f']), ('MOVWF', 0xD2))

    def test_a_failed_user_container_spoils_the_sum_and_ends_in_the_paint_from_byte_18(self):
        # The INCF is taken when the verdict bit is clear, and the path then clears bit 4. With bit 4
        # clear and bit 1 set the seeder moves the paint's start to 0x12, so everything the sum covers
        # is painted 0xFE rather than reloaded from the user configuration.
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        self.assertEqual((_at(code, 0x14F88).mnemonic, _at(code, 0x14F88).fields['b']), ('BTFSC', 2))
        self.assertEqual((_at(code, 0x14F8E).mnemonic, _at(code, 0x14F8E).fields['f']), ('INCF', 0xD2))
        self.assertEqual((_at(code, 0x14F92).mnemonic, _at(code, 0x14F92).fields['b']), ('BCF', 4))
        self.assertEqual(_at(code, 0x14F9C).fields['target'], SEEDER)
        self.assertEqual((_at(code, 0x1610A).fields['k'], _at(code, 0x1610C).mnemonic,
                          _at(code, 0x16110).fields['k'], _at(code, 0x16116).fields['k'],
                          _at(code, 0x16118).fields['f']), (0x10, 'BNZ', 0x02, 0x12, 0x2A))
        self.assertEqual((_at(code, 0x1611A).fields['k'], _at(code, 0x1612E).fields['k'],
                          _at(code, 0x16130).mnemonic), (0xC0, 0xFE, 'MOVWF'))

    def test_the_sum_has_three_direct_writers_on_the_0_2_build(self):
        # The seeder's tail, the store, and the INCF. Indirect access is invisible to this count.
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        writers = [(address, instr.mnemonic) for address, instr in
                   ((a, _at(code, a)) for a in range(BASE, BASE + len(code), 2))
                   if instr.mnemonic in ('MOVWF', 'INCF', 'CLRF', 'SETF', 'DECF')
                   and instr.fields.get('f') == 0xD2 and instr.fields.get('a') == 1
                   and _at(code, address - 2).mnemonic == 'MOVLB'
                   and _at(code, address - 2).fields['k'] == 0x0E]
        self.assertEqual(writers, [(0x14F8E, 'INCF'), (0x1613A, 'MOVWF'), (0x164C0, 'MOVWF')])


class TheLaterBuildsForceAReloadAfterACacheDrop(unittest.TestCase):
    """Section 283: on the 700 2.8 and the 650's 0.4 package the drop sets a flag that the next boot
    turns into a spoiled sum, and the 0.2 builds this unit runs have no such flag."""

    SITES = {'h700_code': (0xC3EC, 0x1621E, 0x16228, 0x01, 0xE9, 0xEC),
             'h650_code': (0xC3EC, 0x15FD4, 0x15FDE, 0x00, 0xE9, 0xEC)}

    def test_the_drop_writes_the_flag_and_the_boot_clears_it_and_increments_the_sum(self):
        lab.require(*self.SITES)
        for name, (drop, read, bump, bank, flag, total) in self.SITES.items():
            with self.subTest(name):
                code = lab.load(name)
                self.assertEqual((_at(code, drop).mnemonic, _at(code, drop).fields['f']), ('MOVWF', flag))
                self.assertEqual((_at(code, drop - 2).mnemonic, _at(code, drop - 2).fields['k']), ('MOVLW', 1))
                self.assertEqual((_at(code, read).mnemonic, _at(code, read).fields['f'],
                                  _at(code, read + 2).mnemonic), ('MOVF', flag, 'BZ'))
                self.assertEqual((_at(code, bump - 2).fields['k'], _at(code, bump).mnemonic,
                                  _at(code, bump).fields['f']), (bank, 'INCF', total))

    def test_the_0_2_build_writes_nothing_at_the_later_builds_flag_from_the_drop(self):
        # The drop's executor on 0.2 is 0xC344; its flag is 0x725, consumed by the erase, section 282.
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        # Banked stores only: the walk also writes FSR0L, 0xFE9 in the access bank, whose low byte
        # is the same 0xE9, and that is a pointer setup and not a flag.
        stores = [instr.fields.get('f') for _, instr in _walk(code, 0xC344, stop=(0xC430,))
                  if instr.mnemonic == 'MOVWF' and instr.fields.get('a') == 1]
        self.assertNotIn(0xE9, stores)
        self.assertIn(0x25, stores, 'the control: the 0x725 flag this build does set')


class TheDelayWriteChangedTwoBytesOfTheRegion(unittest.TestCase):
    """1.4.2 on the Harmony 650: the Denon's power on delay 60 to 90 tenths, in the region reads."""

    RECORD = 0x6C778
    TRAILER = 0x10D986
    REGION = 0x030000

    def test_the_two_region_reads_differ_in_the_delay_and_the_trailer_and_nowhere_else(self):
        lab.require('h650_config_region', 'h650_delay90_region')
        before, after = lab.load('h650_config_region'), lab.load('h650_delay90_region')
        self.assertEqual(len(before), len(after))
        moved = [self.REGION + i for i, (a, b) in enumerate(zip(before, after)) if a != b]
        self.assertEqual(moved, [self.RECORD, self.TRAILER])
        at = self.RECORD - self.REGION
        self.assertEqual((before[at] | before[at + 1] << 8, after[at] | after[at + 1] << 8), (60, 90))

    def test_the_byte_is_the_first_value_of_a_wide_variable_whose_memory_is_0xe54(self):
        # The record is base slot 13 entry 65, above `narrow`, so it is stored as two bytes at
        # 0xE10 + narrow + 2 * (65 - narrow). That is the address the live reads were taken at.
        lab.require('h650_delay90_region')
        from harmony import gspm
        table = gspm.parse(lab.load('h650_delay90_region')).state_table()
        index = table.entries.index(self.RECORD)
        self.assertEqual((index, table.narrow, table.wide), (65, 62, 23))
        self.assertFalse(table.is_narrow(index))
        self.assertEqual(0xE10 + table.narrow + 2 * (index - table.narrow), 0xE54)


if __name__ == '__main__':
    unittest.main()
