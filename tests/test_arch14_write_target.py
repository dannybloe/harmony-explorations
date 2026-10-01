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
`h650` refuses the 600. Since Danny's decision of 29 September 2026 the 600 may be written to as well,
under its own record, so what this establishes now is that the check can tell the two apart, which is
what keeps a write meant for one off the other.
"""

import datetime
import json
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


class ABareRestartUndoesWhatAnActivityChangedOnTheHarmony650(unittest.TestCase):
    """Section 283's activity experiment, from the three snapshots filed in the lab.

    Each snapshot is the 108 byte variable array from data 0xE10 and then the stored sum at 0xED2:
    at rest, after an activity was started off the cable, and ten seconds after a bare restart.
    """

    REGION = 0x030000

    def snapshots(self):
        data = lab.load('h650_ram_activity_restart')
        self.assertEqual(len(data), 3 * 109)
        return [(data[k * 109:k * 109 + 108], data[k * 109 + 108]) for k in range(3)]

    def seeded(self):
        """What the seeder writes from the configuration's `first` values, byte for byte."""
        from harmony import gspm
        region = lab.load('h650_config_region')
        table = gspm.parse(region).state_table()
        out = bytearray(table.ram_bytes)
        for index, address in enumerate(table.entries):
            at = address - self.REGION
            first = region[at] | region[at + 1] << 8
            self.assertNotEqual(first, 0xFEFE, 'no record here skips the reload')
            if table.is_narrow(index):
                out[index] = first & 0xFF
            else:
                off = table.narrow + 2 * (index - table.narrow)
                out[off:off + 2] = bytes([first & 0xFF, first >> 8])
        return bytes(out)

    def test_each_stored_sum_is_the_xor_of_its_own_snapshot(self):
        # The sum covers 0xE22..0xECF: array bytes 18 to 107 and then 84 bytes the seeder paints 0xFE,
        # whose XOR is zero since the count is even. Those 84 were not read with these snapshots, so
        # this closes on the assumption that they are still painted; three matches of three make chance
        # unlikely, and TheVariablesBankAcrossABareRestart reads them painted either side of a
        # later restart.
        lab.require('h650_ram_activity_restart')
        for k, (array, stored) in enumerate(self.snapshots()):
            with self.subTest(k):
                total = 0xA5
                for byte in array[18:]:
                    total ^= byte
                self.assertEqual(total, stored)

    def test_the_activity_moved_eight_variables_and_the_restart_put_every_one_back(self):
        lab.require('h650_ram_activity_restart', 'h650_config_region')
        (rest, _), (active, _), (restarted, _) = self.snapshots()
        seeded = self.seeded()
        # CurrentActivityState is index 34, narrow, at 0xE32: idle 3, then TV kijken's 2.
        self.assertEqual((rest[34], active[34], restarted[34]), (3, 2, 3))
        moved = [i for i in range(18, 108) if active[i] != rest[i]]
        # All eight are narrow variables, one byte each, so the byte offset is the variable's index.
        self.assertEqual(moved, [32, 34, 39, 47, 51, 54, 55, 56])
        # The restart put back exactly the state at rest.
        self.assertEqual(restarted[18:], rest[18:])
        # And that state is the configuration's `first` values except three unnamed variables,
        # indices 44, 46 and 69, which read 1, 1 and 0xFEFD where the records state 0; 44 and 69 at
        # their record's maximum. Identical at rest and after the restart, so something after the
        # seeder sets them, and nothing in the image accesses them directly.
        differ = {0xE10 + i: restarted[i] for i in range(18, 108) if restarted[i] != seeded[i]}
        self.assertEqual(differ, {0xE3C: 1, 0xE3E: 1, 0xE5C: 0xFD, 0xE5D: 0xFE})


class TheInfraredRingCameThroughABareRestart(unittest.TestCase):
    """Section 283: page 5 of data memory is the infrared sender's ring, and it survived a restart.

    Its contents after the restart are the tail of one Denon record's block, exactly where one send
    of that block from index 0 stops, which is memory kept rather than rebuilt.
    """

    WRITE_REGISTERS = (0xFEF, 0xFEE, 0xFED, 0xFEC)  # INDF0, POSTINC0, POSTDEC0, PREINC0

    def test_three_stores_address_page_5_through_its_write_index_and_nothing_names_it(self):
        # Within the compiler's pointer shape, MOVLW 5; ADDWFC FSR0H. A store through a pointer held
        # in a variable is outside this scan, and the content closure below does not rely on it.
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        writes, reads = [], 0
        for off in range(0, len(code) - 6, 2):
            here, nxt, then = (isa.decode(code, off + d, BASE) for d in (0, 2, 4))
            if (here.mnemonic, here.fields.get('k')) == ('MOVLW', 0x05) and nxt.mnemonic == 'ADDWFC' \
                    and (nxt.fields.get('f'), nxt.fields.get('a')) == (0xEA, 0):
                target = then.fields.get('dst')
                if target is None and then.fields.get('a') == 0 and (
                        then.mnemonic in ('MOVWF', 'CLRF', 'SETF') or then.fields.get('d') == 1):
                    target = 0xF00 | then.fields.get('f', 0)
                if target in self.WRITE_REGISTERS:
                    writes.append(off + BASE + 4)
                else:
                    reads += 1
            self.assertFalse(here.mnemonic == 'MOVLB' and here.fields.get('k') == 5, hex(off + BASE))
            self.assertFalse(here.mnemonic == 'MOVFF' and 0x500 <= here.fields.get('dst', 0) < 0x600,
                             hex(off + BASE))
            self.assertFalse(here.mnemonic == 'LFSR' and 0x500 <= here.fields.get('k', 0) < 0x600,
                             hex(off + BASE))
        self.assertEqual(writes, [0x11E4C, 0x11E5E, 0x11E8E])
        self.assertEqual(reads, 33)
        # Each store is preceded by the write index being read and advanced.
        for at in writes:
            with self.subTest(hex(at)):
                self.assertEqual((_at(code, at - 14).mnemonic, _at(code, at - 14).fields['f'],
                                  _at(code, at - 12).mnemonic), ('MOVF', 0x60, 'INCF'))

    def test_the_index_reset_touches_only_the_three_indices(self):
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        self.assertEqual([(_at(code, a).mnemonic, _at(code, a).fields.get('f', _at(code, a).fields.get('k')))
                          for a in range(0x10CF2, 0x10CFC, 2)],
                         [('MOVLB', 7), ('CLRF', 0x5E), ('CLRF', 0x5F), ('CLRF', 0x60), ('RETURN', None)])

    def test_the_ring_is_the_tail_of_one_denon_block_on_both_sides_of_the_restart(self):
        lab.require('h650_ram_across_restart', 'h650_config_region')
        from harmony import gspm
        data = lab.load('h650_ram_across_restart')
        self.assertEqual(len(data), 2 * 0xE00)
        before, after = data[:0xE00], data[0xE00:]
        self.assertEqual(before[0x500:0x600], after[0x500:0x600])
        for half in (before, after):
            self.assertEqual((half[0x75E], half[0x75F], half[0x760]), (0, 0, 0))
        region = lab.load('h650_config_region')
        ring = after[0x500:0x600]
        rotated = ring[104:] + ring[:104]
        # The 616 byte block at 0x45BAF, its terminator included; 616 is two turns plus 104.
        block = 0x45BAF - 0x30000
        length = next(i + 2 for i in range(block, len(region), 2) if region[i:i + 2] == b'\x00\x00') - block
        self.assertEqual((length, length % 256), (616, 104))
        self.assertEqual(rotated, region[block + length - 256:block + length])
        # Named by exactly one record: group 3, the Denon receiver, record 36.
        c = gspm.parse(region)
        naming = [(gi, ri) for gi, group in enumerate(c.ir_groups())
                  for ri, record in enumerate(group) if 0x45BAF in c.ir_record_blocks(record)]
        self.assertEqual(naming, [(3, 36)])


def _every_instruction(region):
    """Every instruction a configuration holds: action lists, base slot 8's leading list and
    records, handler sets, mode entries and page lists, and timers."""
    from harmony import gspm
    c = gspm.parse(region)
    out = [i for lst in c.action_lists() for i in lst]
    slot = gspm.arch_slot(c.architecture, gspm.BINDING_TABLE_SLOT)
    out += c.action_list(c.sections[slot].address) + [b for r in c.binding_records() for b in r]
    lists = list(c.handler_sets()) + [p.list_address for p in c.mode_pages()]
    out += [e for a in lists for e in c.tagged_list(a) or []]
    out += [e for r in c.mode_records() for e in r.entries]
    out += [t.instruction for t in c.timers()]
    return out


def _direct_writers(code, address):
    """Code addresses that write `address` by a banked access or a `MOVFF`, per the tracer."""
    from harmony.pic18 import trace
    return [hit.addr for hit in trace.trace(code, BASE, [address])[address] if 'WRITE' in hit.kind]


class TheVariablesBankAcrossABareRestart(unittest.TestCase):
    """Section 283: bank `0xE00` to `0xEFF` read either side of a fourth bare restart, at rest.

    The stack's leftovers, the painted tail and a valid sum survive, which a cleared bank would also
    leave once the seeder had reloaded it; what makes a clear unlikely is the second setter's arguments
    at `0xEDC` to `0xEDF`, written only where that setter is called, unchanged with no minute boundary
    passed. Variable 44 and the clock went back to `first` with no instruction in the configuration that
    could have done it,
    so the seeder stored at that boot although the sum had matched. Besides the clock, what changed are
    bytes the two setters write, and their last stores.
    """

    CHANGED = [0xE10, 0xE11, 0xE12, 0xED4, 0xED6, 0xEE1, 0xEE2, 0xEE4, 0xEE5]
    #: The two routines that store a variable and, unless their caller's flag is set, run the
    #: transitions. Every action list opcode at 0x80 or above reaches the first.
    SETTERS = (0x16360, 0x163AA)
    #: Where each is called; the flag is copied from 0x219 just before.
    CALL_SITES = {0x16360: [0x0E8C4, 0x0EFE8], 0x163AA: [0x0EB68, 0x0EF90]}

    def _halves(self):
        lab.require('h650_bank_e_across_restart')
        data = lab.load('h650_bank_e_across_restart')
        self.assertEqual(len(data), 0x200)
        return data[:0x100], data[0x100:]

    def test_only_three_clock_bytes_and_six_setter_bytes_changed(self):
        before, after = self._halves()
        self.assertEqual([0xE00 + i for i in range(0x100) if before[i] != after[i]], self.CHANGED)
        # Seconds, minutes and hours; the day, weekday, month and year stayed.
        self.assertEqual((list(before[0x10:0x13]), list(after[0x10:0x13])), ([14, 41, 9], [54, 39, 8]))
        # The stack's leftovers, the same both times with six nonzero, which a reload would not
        # disturb either, so this does not tell a clear from none.
        self.assertEqual(before[:0x10], after[:0x10])
        self.assertEqual(sum(1 for b in before[:0x10] if b), 6)

    def test_the_second_setters_arguments_survived_and_only_its_call_sites_write_them(self):
        before, after = self._halves()
        self.assertEqual((before[0xDC:0xE0], after[0xDC:0xE0]), (bytes([0, 1, 0, 1]),) * 2)
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        sites = self.CALL_SITES[0x163AA]
        for address in range(0xEDC, 0xEE0):
            with self.subTest(hex(address)):
                writers = _direct_writers(code, address)
                self.assertTrue(writers)
                # Every writer sits in the stretch that sets up one of the two calls.
                self.assertTrue(all(any(site - 0x30 <= w < site for site in sites) for w in writers),
                                [hex(w) for w in writers])
        # And no minute boundary passed after the restart: the stamp is 08:39:42 and the read 08:39:54.
        lab.require('h650_config_region')
        from harmony import gspm
        region = lab.load('h650_config_region')
        table = gspm.parse(region).state_table()
        stamp = [region[e - 0x30000] for e in table.entries[:3]]
        self.assertEqual((stamp, list(after[0x10:0x13])), ([42, 39, 8], [54, 39, 8]))

    def test_the_seeder_stored_although_the_sum_matched_before_the_restart(self):
        before, after = self._halves()
        # Variable 44 was 1; the boot's transition store saw it at 0. Minutes and hours went back to
        # the stamp, 39 and 8.
        self.assertEqual((before[0x10 + 44], after[0xD4], after[0xD6], after[0xEE5 - 0xE00]), (1, 0, 1, 44))
        self.assertEqual((list(before[0x11:0x13]), list(after[0x11:0x13])), ([41, 9], [39, 8]))
        lab.require('h650_config_region', 'h650_bench_code')
        instructions = _every_instruction(lab.load('h650_config_region'))
        # Every path from a configuration instruction to the four setter call sites: opcode 0x80 and
        # up sets variable opcode & 0x7F (0x0E8C4); the 0x1F band's ED and EE set and F1 and F2 step
        # (0x0EFE8, 0x0EF90); 0x70 and 0x71 with case 6 or 7 in the high byte's low nibble add
        # (0x0EB68); and 0x1F F7 queues an instruction named by its low byte, so it could reach any.
        sets = sorted((i.opcode & 0x7F, i.operand) for i in instructions
                      if i.opcode >= 0x80 and (i.opcode & 0x7F) in (1, 2, 44))
        band = [i for i in instructions if i.opcode == 0x1F and i.operand >> 8 in (0xED, 0xEE, 0xF1, 0xF2)
                and i.operand & 0xFF in (1, 2, 44)]
        adds = [i for i in instructions if i.opcode in (0x70, 0x71) and (i.operand >> 8) & 0x0F in (6, 7)]
        queued = [i for i in instructions if i.opcode == 0x1F and i.operand >> 8 == 0xF7]
        # Nothing in the configuration sets 44 to 0, and nothing sets or steps the minutes or hours;
        # the one add names variable 69.
        self.assertEqual((sets, band, [(i.opcode, i.operand) for i in adds], queued),
                         ([(44, 1)], [], [(0x70, 0x0745)], []))
        # The store has three callers, the seeder and the two setters, by any instruction with a target.
        code = lab.load('h650_bench_code')
        callers = sorted(at for at in range(BASE, BASE + len(code), 2)
                         if _at(code, at).fields.get('target') == 0x16474)
        self.assertEqual(callers, [0x160EA, 0x1637A, 0x16444])

    def test_the_firmware_writes_variables_13_16_and_17_directly(self):
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        self.assertEqual([bool(_direct_writers(code, 0xE10 + i)) for i in range(13, 18)],
                         [True, False, False, True, True])

    def test_the_sum_is_valid_and_the_tail_painted_on_both_sides(self):
        for name, half in zip(('before', 'after'), self._halves()):
            with self.subTest(name):
                folded = 0xA5
                for byte in half[0x22:0xD0]:
                    folded ^= byte
                self.assertEqual((folded, half[0xD2]), (0xA5, 0xA5))
                # 62 narrow bytes plus 23 two byte wide ones is 108, so the paint starts at 0xE10 + 108.
                self.assertEqual(half[0x7C:0xD0], b'\xfe' * 84)

    def test_the_changed_bytes_outside_the_clock_are_written_by_the_two_setters(self):
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        written = set()
        for entry, (flag, skip) in zip(self.SETTERS, ((0xED8, 0x1637E), (0xEDC, 0x16448))):
            with self.subTest(hex(entry)):
                body = [(at, instr) for at, instr in _walk(code, entry) if entry <= at < entry + 0xC0]
                written |= {instr.fields['dst'] for _, instr in body if instr.mnemonic == 'MOVFF'}
                calls = {instr.fields.get('target') for _, instr in body if instr.mnemonic in ('RCALL', 'CALL')}
                self.assertLessEqual({0x16474, 0x1613E}, calls)
                # The transitions run only when the flag is clear.
                self.assertEqual((_at(code, skip).mnemonic, _at(code, skip).fields['f'] | 0xE00,
                                  _at(code, skip + 2).mnemonic), ('MOVF', flag, 'BNZ'))
                for site in self.CALL_SITES[entry]:
                    self.assertEqual(_at(code, site).fields['target'], entry)
                    self.assertEqual((_at(code, site - 4).fields['src'], _at(code, site - 4).fields['dst']),
                                     (0x219, flag))
        self.assertLessEqual({a for a in self.CHANGED if a >= 0xE13}, written)
        # 0xEE1 is the index the store is handed: the seeder puts its loop index there before the call.
        self.assertEqual((_at(code, 0x160E6).fields['src'], _at(code, 0x160E6).fields['dst'],
                          _at(code, 0x160EA).fields['target']), (0xD2E, 0xEE1, 0x16474))

    def test_the_last_stores_name_the_minutes_and_then_forty_six_without_transitions_and_forty_four(self):
        before, after = self._halves()
        # Before: the minutes, variable 1, from 40 to 41 by the second setter's increment.
        self.assertEqual(([before[a - 0xE00] for a in (0xED4, 0xED6, 0xEE1, 0xEE2)]), [40, 41, 1, 41])
        # After: 46 set to 1, and 0xEE5 left at 44. Its only writers are the first setter's transition
        # branch and the second setter's entry, so that store skipped the transitions; 0xED8 to 0xEDB
        # read the same on both sides and show nothing by themselves. The last store through the
        # transition branch was 44, from 0 to 1.
        self.assertEqual([after[a - 0xE00] for a in (0xEE1, 0xEE2, 0xEE4)], [46, 1, 46])
        self.assertEqual(before[0xD8:0xDC], after[0xD8:0xDC])
        self.assertEqual([after[a - 0xE00] for a in (0xED4, 0xED6, 0xEE5)], [0, 1, 44])
        lab.require('h650_bench_code')
        self.assertEqual(_direct_writers(lab.load('h650_bench_code'), 0xEE5), [0x16384, 0x163AC])
        # Both at 1, which ABareRestartUndoesWhatAnActivityChangedOnTheHarmony650 finds away from `first`.
        self.assertEqual((after[0x10 + 44], after[0x10 + 46]), (1, 1))

    def test_nothing_the_seeder_runs_writes_its_skip_flag_directly(self):
        lab.require('h650_bench_code')
        code = lab.load('h650_bench_code')
        # Everything between setting the flag at 0x16048 and the loop's end: seven routines called
        # directly, with their callees.
        walked = {at for entry in (0x18020, 0x18128, 0x17EEC, 0x18136, 0x1807C, 0x17EBE, 0x16474)
                  for at, _ in _walk(code, entry)}
        writers = _direct_writers(code, 0xD2D)
        self.assertEqual(len(writers), 19)
        self.assertFalse(walked & set(writers))
        # The word reader writes through its pointer instead: 0xD2B before the loop, 0xD30 inside it.
        for at, low in ((0x1605E, 0x2B), (0x16070, 0x2B), (0x16082, 0x2B), (0x16094, 0x2B), (0x160C0, 0x30)):
            self.assertEqual((_at(code, at).mnemonic, _at(code, at).fields['k'], _at(code, at + 4).fields['k']),
                             ('MOVLW', low, 0x0D), hex(at))
        # The flag is shared scratch: the transition routine's own three byte read lands on 0xD2C to
        # 0xD2E, and another routine copies the clock's seconds into it.
        self.assertEqual([_at(code, a).fields['k'] for a in (0x16158, 0x1615C)], [0x2C, 0x0D])
        self.assertEqual(_at(code, 0x16160).fields['target'], 0x17F1C)
        self.assertEqual((_at(code, 0x10800).fields.get('src'), _at(code, 0x10800).fields.get('dst')),
                         (0xE10, 0xD2D))


class TheHarmony700sFirstBlockWentBackUnchanged(unittest.TestCase):
    """Section 300: block `0x030000` of the Harmony 700, running 2.8, erased and written back unchanged.

    Two identical reads fit a write that did nothing as well as one that happened, so the erase and
    the neighbour check rest on the run's own output, which is read here too. The region reads are
    the other end: the same `0x120000` bytes from `0x030000`, before and in a new session after.
    """

    REGION = 0x030000

    def setUp(self):
        lab.require('h700_28_config_region', 'h700_after_rehearsal_region', 'h700_rehearsal_log')
        self.before = lab.load('h700_28_config_region')
        self.after = lab.load('h700_after_rehearsal_region')
        self.log = lab.load('h700_rehearsal_log').decode('utf-8')

    def test_the_region_reads_back_byte_for_byte(self):
        self.assertEqual(len(self.before), 0x120000)
        self.assertEqual(self.after, self.before)

    def test_the_block_written_was_configuration_and_not_erased_flash(self):
        # A block of 0xFF written back over an erase would pass a compare on a write that did nothing,
        # so the claim needs the block to hold content: a container that passes its own checks starts
        # at its first byte and runs past its end.
        from harmony import gspm
        self.assertEqual(self.before[:4], b'GSPM')
        container = gspm.parse(self.before)
        self.assertTrue(container.all_checks_pass)
        self.assertEqual(container.flash_base, self.REGION)
        self.assertGreater(container.end_addr, self.REGION + 0x10000)
        self.assertEqual(sum(1 for byte in self.before[:0x10000] if byte != 0xFF), 64366)

    def test_the_run_erased_checked_both_neighbours_and_read_the_block_back(self):
        for line in ('unit identity', 'which matches the recorded h700',
                     'erasing 0x30000',
                     'erased, and the block reads back as all ones',
                     'the erase stayed inside its own block, measured on both sides',
                     'the block reads back byte for byte identical to the dump'):
            self.assertIn(line, self.log)
        writes = re.findall(r'^writing (\d+) bytes at 0x([0-9a-f]+)$', self.log, re.M)
        self.assertEqual(len(writes), 21)
        self.assertEqual(sum(int(n) for n, _ in writes), 0x10000)
        self.assertEqual(int(writes[0][1], 16), self.REGION)
        # And nothing else was sent: no drop and no restart.
        self.assertNotRegex(self.log, r'(?i)invalidat|restart|reset|drop')


class TheHarmony700sDelayWriteWasHeardAndWentBack(unittest.TestCase):
    """Section 301: the Denon's power on delay on the Harmony 700, 60 tenths to 90 and back.

    Two ends with nothing in common. The region reads say what the flash holds: two bytes moved
    and then moved back. The infrared runs, timed by a receiver on the bench while the remote was
    off the cable, say what the remote did with it: the gap between the Denon switching on and its
    input command grew by three seconds and shrank by three, while the television's own gap, whose
    delay nobody touched, stayed where it was.
    """

    REGION = 0x030000
    RECORD = 0x6C652
    TRAILER = 0x13554A

    def test_the_raise_moved_the_delay_and_the_trailer_and_the_revert_put_both_back(self):
        lab.require('h700_after_rehearsal_region', 'h700_delay90_region', 'h700_delay60_restored_region')
        before = lab.load('h700_after_rehearsal_region')
        raised = lab.load('h700_delay90_region')
        restored = lab.load('h700_delay60_restored_region')
        self.assertEqual(len(raised), len(before))
        moved = [self.REGION + i for i, (a, b) in enumerate(zip(before, raised)) if a != b]
        self.assertEqual(moved, [self.RECORD, self.TRAILER])
        at, end = self.RECORD - self.REGION, self.TRAILER - self.REGION
        self.assertEqual((before[at] | before[at + 1] << 8, raised[at] | raised[at + 1] << 8), (60, 90))
        # The closure: the trailer checksum is an XOR of little endian words, and both offsets are
        # even from the container's base, so the checksum's low byte has to move by exactly what the
        # delay's low byte moved by. Two fields, so two ends.
        self.assertEqual(at % 2, end % 2)
        self.assertEqual(before[end] ^ raised[end], before[at] ^ raised[at])
        self.assertEqual(restored, before)

    def test_the_byte_is_a_wide_state_variable_whose_stated_maximum_is_65277(self):
        # So the 0 to 450 tenths a delay can take come from the device's 451 case table and not from
        # the record; the refusal past 450 is tested in packages/codec/test/edit.test.ts.
        lab.require('h700_delay90_region')
        from harmony import gspm
        region = lab.load('h700_delay90_region')
        table = gspm.parse(region).state_table()
        index = table.entries.index(self.RECORD)
        self.assertEqual((index, table.narrow, table.wide), (79, 62, 23))
        self.assertFalse(table.is_narrow(index))
        at = self.RECORD - self.REGION
        self.assertEqual(region[at + 2] | region[at + 3] << 8, 65277)

    def test_both_writes_ran_the_whole_sequence_and_the_stopped_one_ended_after_an_erase(self):
        names = ('h700_delay90_write_log', 'h700_delay60_write_log', 'h700_delay60_stopped_log')
        lab.require(*names)
        raised, restored, stopped = (lab.load(name).decode('utf-8') for name in names)
        for log in (raised, restored):
            for line in ('which matches the recorded h700',
                         'dropping the cached region descriptors',
                         'erasing 0x60000', 'erasing 0x130000',
                         'the whole configuration reads back byte for byte identical to the file',
                         'the restart is sent'):
                self.assertIn(line, log)
            self.assertEqual(log.count('the erase stayed inside its own block, measured on both sides'), 2)
            writes = re.findall(r'^writing (\d+) bytes at 0x([0-9a-f]+)$', log, re.M)
            self.assertEqual(len(writes), 42)
            self.assertEqual(sum(int(n) for n, _ in writes), 0x20000)
        # The rerun saw what the stopped run left: the first block erased, and the second untouched.
        self.assertIn('0x60000 holds erased flash, so an earlier run erased it and wrote nothing', restored)
        # The journal of the run that stopped ends on the erase's own check. The read that failed was
        # the neighbour check after it, and its error went to the terminal and not to this file.
        self.assertTrue(stopped.rstrip().endswith('erased, and the block reads back as all ones'))
        self.assertNotIn('writing ', stopped)

    @staticmethod
    def _press(run, device, command):
        """The first press in the activity's step that matches the 700's own code of `device`.

        A Denon power code has no catalogue name, so `command` None picks the press matching the
        device under no command name: code 2, which is what the Denon's power on list sends.
        """
        return next(p for p in run['steps'][1]['presses']
                    if any(m['config'] == 'h700_28_config_region' and m['device'] == device
                           and m.get('command') == command for m in p['frame']['matches']))

    @staticmethod
    def _receiver_clock(monitor):
        """Each frame's start in microseconds on the receiver's own clock, by sequence number.

        The listener reports a frame's durations and then the silence before the next one, so a start
        is the previous start plus the previous frame's length plus that silence. The chain restarts
        at a frame with no silence before it, which only the first frame of a session has.
        """
        starts, at, previous = {}, None, None
        for line in monitor.decode('utf-8').splitlines():
            frame = json.loads(line)
            if 'seq' not in frame:
                continue
            if at is None or frame.get('gapUs') is None:
                at = 0
            else:
                at += sum(p['us'] for p in previous['pulses']) + frame['gapUs']
            starts[frame['seq']] = at
            previous = frame
        return starts

    def test_the_denon_gap_moved_by_the_three_seconds_written_and_the_television_s_did_not(self):
        names = ('h700_delay_ir_before', 'h700_delay_ir_after', 'h700_delay_ir_restored')
        lab.require(*names, 'h700_delay_ir_monitor')
        runs = [json.loads(lab.load(name)) for name in names]
        rx = self._receiver_clock(lab.load('h700_delay_ir_monitor'))
        pairs = {'denon': ('Denon', None, 'InputCbl/Sat'), 'tv': ('TV', 'PowerOn', 'InputHdmi1')}
        host, receiver = {}, {}
        for key, (device, first, then) in pairs.items():
            host[key], receiver[key] = [], []
            for run in runs:
                start, end = self._press(run, device, first), self._press(run, device, then)
                host[key].append(end['atMs'] - start['atMs'])
                receiver[key].append(rx[end['frame']['seq']] - rx[start['frame']['seq']])
        for run in runs:
            self.assertEqual(run['name'], "Harmony 700, the Denon's power on delay")
            self.assertTrue(all(step['reached'] for step in run['steps']))
            self.assertEqual([v['ok'] for v in run['steps'][1]['verdicts']], [True, True])
        # The computer's clock in milliseconds, which the page shows, and the receiver's in
        # microseconds, which the log can rebuild.
        self.assertEqual(host, {'denon': [6651, 9646, 6650], 'tv': [5405, 5416, 5403]})
        self.assertEqual(receiver, {'denon': [6593454, 9614538, 6595493], 'tv': [5413629, 5421314, 5417609]})
        # The stored change is 30 tenths each way. The computer's clock is late by a burst of tens of
        # milliseconds and the receiver's runs 0.6 to 0.7% long against it, so the band is the two
        # instruments and not a tolerance on the remote.
        for clock, unit in ((host, 1), (receiver, 1000)):
            denon, tv = clock['denon'], clock['tv']
            self.assertLess(abs((denon[1] - denon[0]) - 3000 * unit), 30 * unit)
            self.assertLess(abs((denon[1] - denon[2]) - 3000 * unit), 30 * unit)
            self.assertLess(max(tv) - min(tv), 20 * unit)

    def test_the_receiver_s_clock_spaces_a_repeat_as_the_family_does_and_the_computer_s_does_not(self):
        # The calibration for preferring the receiver's clock within a run: the television's power code
        # and its repeat, about 108 ms apart in the family it belongs to.
        lab.require('h700_delay_ir_before', 'h700_delay_ir_monitor')
        monitor = lab.load('h700_delay_ir_monitor')
        rx = self._receiver_clock(monitor)
        frames = {f['seq']: f for f in map(json.loads, monitor.decode('utf-8').splitlines()) if 'seq' in f}
        power = self._press(json.loads(lab.load('h700_delay_ir_before')), 'TV', 'PowerOn')['frame']['seq']
        repeat = power + 1
        self.assertEqual(frames[repeat]['repeatOf'], power)
        self.assertEqual(rx[repeat] - rx[power], 106772)
        host = lambda seq: datetime.datetime.fromisoformat(frames[seq]['at'].replace('Z', '+00:00'))
        self.assertEqual(round((host(repeat) - host(power)).total_seconds() * 1000), 22)


class TheHarmony600sFirstBlockWentBackUnchanged(unittest.TestCase):
    """Section 302: block `0x030000` of the Harmony 600, on 0.2, erased and written back unchanged.

    The same shape as section 300's on the 700, with one end that one lacked: the whole external
    flash was read before, and afterwards in two reads that together cover it, so the neighbour below
    the block, the safe mode configuration at `0x020000`, is checked by a read and not only by the run.
    """

    REGION = 0x030000

    def setUp(self):
        lab.require('h600_config_region', 'h600_external_region', 'h600_rehearsal_log',
                    'h600_after_rehearsal_region', 'h600_after_rehearsal_low', 'h600_config')
        self.before = lab.load('h600_config_region')
        self.external = lab.load('h600_external_region')
        self.after = lab.load('h600_after_rehearsal_region')
        self.low = lab.load('h600_after_rehearsal_low')
        self.log = lab.load('h600_rehearsal_log').decode('utf-8')

    def test_the_whole_external_flash_reads_back_byte_for_byte(self):
        self.assertEqual((len(self.external), len(self.before), len(self.low)), (0x200000, 0x1D0000, 0x30000))
        # Two separate reads of the region before agree; and the two after cover the
        # whole chip between them and agree with the backup.
        self.assertEqual(self.external[self.REGION:], self.before)
        self.assertEqual(self.low + self.after, self.external)

    def test_the_block_written_was_configuration_and_its_container_is_h600_config(self):
        from harmony import gspm
        container = gspm.parse(self.before)
        self.assertTrue(container.all_checks_pass)
        self.assertEqual((container.flash_base, container.end_addr), (self.REGION, 0xE4361))
        # A block of 0xFF written back over an erase would pass on a write that did nothing.
        self.assertEqual(sum(1 for byte in self.before[:0x10000] if byte != 0xFF), 65127)
        # This remote's concordance dump holds the same container, end marker included, so the
        # configuration on the remote is the one in the corpus.
        wrapped = lab.load('h600_config')
        at = wrapped.find(b'GSPM')
        self.assertEqual(len(wrapped) - at, 738149)
        self.assertEqual(wrapped[at:], self.before[:len(wrapped) - at])

    def test_the_backup_holds_the_0_2_application_and_the_safe_mode_configuration(self):
        # A backup that a restore could use: the application in internal program memory from
        # 0xFE +0x9000 and staged in external flash at 0x000000, and the safe mode container at
        # external 0x020000, each byte for byte the image the lab already held.
        lab.require('h600_internal_fe_region', 'h600_internal_ff_region', 'h600_code_complete',
                    'h600_safemode_gspm')
        internal = lab.load('h600_internal_fe_region') + lab.load('h600_internal_ff_region')
        app, safe = lab.load('h600_code_complete'), lab.load('h600_safemode_gspm')
        self.assertEqual(len(internal), 0x20000)
        self.assertEqual(internal[0x9000:0x9000 + len(app)], app)
        self.assertEqual(self.external[:len(app)], app)
        self.assertEqual(self.external[0x20000:0x20000 + len(safe)], safe)

    def test_the_run_erased_checked_both_neighbours_and_read_the_block_back(self):
        for line in ('which matches the recorded h600',
                     'erasing 0x30000',
                     'erased, and the block reads back as all ones',
                     'the erase stayed inside its own block, measured on both sides',
                     'the block reads back byte for byte identical to the dump'):
            self.assertIn(line, self.log)
        writes = re.findall(r'^writing (\d+) bytes at 0x([0-9a-f]+)$', self.log, re.M)
        self.assertEqual(len(writes), 21)
        self.assertEqual(sum(int(n) for n, _ in writes), 0x10000)
        self.assertEqual(int(writes[0][1], 16), self.REGION)
        self.assertNotRegex(self.log, r'(?i)invalidat|restart|reset|drop')


def _bank(text):
    """A `read-ram.ts` dump of bank `0xE00` as 256 bytes."""
    rows = re.findall(r'^0x(e[0-9a-f]0)  ((?:[0-9a-f]{2} ){15}[0-9a-f]{2})', text, re.M)
    data = bytes.fromhex(''.join(row for _, row in rows).replace(' ', ''))
    assert [int(at, 16) for at, _ in rows] == list(range(0xE00, 0xF00, 0x10))
    return data


def _store_slots(page_ff):
    """The settings store's latest value per setting, from page `0xFF`, section 282's format: a four
    byte header at `0xEC00` and then two byte records, setting then value, the latest one winning."""
    block = page_ff[0xEC00:0xF000]
    latest = {}
    for at in range(4, len(block), 2):
        setting, value = block[at], block[at + 1]
        if (setting, value) != (0xFF, 0xFF):
            latest[setting] = value
    return latest


class TheHarmony600sDelayWriteWasOverriddenByItsSettingsStore(unittest.TestCase):
    """Section 303: the KPN box's power on delay on the Harmony 600, 15 tenths to 45 and back, unheard.

    The flash took the value and the remote never used it, because the configuration's own start up
    lists copy a value saved in the settings store over the one the configuration states, and this
    unit's store held one for exactly that delay, from before any write of ours. The configuration
    half, saving and restoring on every arch 14 container, is `packages/codec/test/settingsstore.test.ts`.
    """

    REGION = 0x030000
    RECORD = 0x0553A9
    TRAILER = 0x0E4360
    #: State variables of `h600_config`, by index: the KPN box's power on delay, the PS3's inter device
    #: delay, and the scratch variable the restore reads into.
    KPN_POWER_ON, PS_INTER_DEVICE, SCRATCH = 67, 62, 59
    BANK = 0xE10

    def _at(self, index, narrow=55):
        return self.BANK + (index if index < narrow else narrow + 2 * (index - narrow))

    def test_the_raise_moved_the_delay_and_the_trailer_and_the_revert_put_the_region_back(self):
        names = ('h600_after_rehearsal_region', 'h600_kpn45_region', 'h600_kpn15_restored_region')
        lab.require(*names)
        before, raised, restored = (lab.load(name) for name in names)
        moved = [self.REGION + i for i, (a, b) in enumerate(zip(before, raised)) if a != b]
        self.assertEqual(moved, [self.RECORD, self.TRAILER])
        at, end = self.RECORD - self.REGION, self.TRAILER - self.REGION
        self.assertEqual((before[at], raised[at]), (15, 45))
        # Two fields, two ends: the trailer byte moved by exactly what the delay byte moved by. The
        # delay is the high byte of its little endian word here, and the trailer starts at an odd
        # address, 0xE435F, so its high byte is the even one that moved.
        self.assertEqual((at % 2, end % 2), (1, 0))
        self.assertEqual(before[end] ^ raised[end], 15 ^ 45)
        self.assertEqual(restored, before)
        from harmony import gspm
        table = gspm.parse(raised).state_table()
        self.assertEqual(table.entries.index(self.RECORD), self.KPN_POWER_ON)
        self.assertEqual((table.narrow, table.wide), (55, 19))

    def test_both_writes_ran_the_whole_sequence(self):
        names = ('h600_kpn45_write_log', 'h600_kpn15_restore_write_log')
        lab.require(*names)
        for name in names:
            log = lab.load(name).decode('utf-8')
            for line in ('which matches the recorded h600',
                         'dropping the cached region descriptors',
                         'erasing 0x50000', 'erasing 0xe0000',
                         'the whole configuration reads back byte for byte identical to the file',
                         'the restart is sent'):
                self.assertIn(line, log, name)
            self.assertEqual(log.count('the erase stayed inside its own block, measured on both sides'), 2)
            writes = re.findall(r'^writing (\d+) bytes at 0x([0-9a-f]+)$', log, re.M)
            self.assertEqual((len(writes), sum(int(n) for n, _ in writes)), (42, 0x20000))

    def test_the_gap_did_not_move_on_either_clock(self):
        # KPN code 35, the box's power code, to the first frame of code 41, its next command. The
        # opening frame of 41 was damaged in the first run and of 35 in the second, so the frames are
        # named by their sequence numbers in each run rather than by what the page matched them to.
        clock = TheHarmony700sDelayWriteWasHeardAndWentBack._receiver_clock
        runs = (('h600_delay_ir_before', 'h600_delay_ir_monitor_before'),
                ('h600_delay_ir_after', 'h600_delay_ir_monitor_after'))
        lab.require(*(name for pair in runs for name in pair))
        host, receiver = [], []
        for run_name, monitor_name in runs:
            run = json.loads(lab.load(run_name))
            self.assertEqual(run['name'], "Harmony 600, the KPN box's power on delay")
            presses = {p['frame']['seq']: p for p in run['steps'][1]['presses']}
            rx = clock(lab.load(monitor_name))
            host.append(presses[12]['atMs'] - presses[1]['atMs'])
            receiver.append(rx[12] - rx[1])
        self.assertEqual(host, [2406, 2427])
        self.assertEqual(receiver, [2403804, 2403320])
        # 30 tenths were written; the receiver's own clock moved by half a millisecond.
        self.assertLess(abs(receiver[1] - receiver[0]), 1000)

    def test_memory_holds_the_stored_values_through_the_write_a_battery_pull_and_the_revert(self):
        names = ('h600_ram_after_kpn45', 'h600_ram_after_battery_pull', 'h600_ram_after_restore')
        lab.require(*names)
        for name in names:
            bank = _bank(lab.load(name).decode('utf-8'))
            word = lambda index: bank[self._at(index) - 0xE00] | bank[self._at(index) - 0xE00 + 1] << 8
            self.assertEqual(word(self.KPN_POWER_ON), 10, name)
            self.assertEqual(word(self.PS_INTER_DEVICE), 15, name)
            # The scratch the restore reads into holds the store's "nothing here" answer, `0xFEFD`.
            self.assertEqual(word(self.SCRATCH), 0xFEFD, name)
            # Section 283's sum over bytes 18 to 191 of the array, seeded 0xA5, is valid in each.
            total = 0xA5
            for byte in bank[0x22:0xD0]:
                total ^= byte
            self.assertEqual(total, bank[0xD2], name)
        # The battery pull reloaded the variables an activity moves, so the remote did start again:
        # the variable at 0xE3B read 4 after the write and 0 after the pull, its configuration value.
        after = _bank(lab.load('h600_ram_after_kpn45').decode('utf-8'))
        pulled = _bank(lab.load('h600_ram_after_battery_pull').decode('utf-8'))
        self.assertEqual((after[0x3B], pulled[0x3B]), (4, 0))

    def test_the_store_held_those_two_values_before_any_write_and_the_other_two_units_hold_none(self):
        lab.require('h600_internal_ff_region', 'h650_page_ff', 'h700_28_internal_ff')
        latest = _store_slots(lab.load('h600_internal_ff_region'))
        # Two tables of five four byte slots, settings 0x00 to 0x13 for power on delays and 0x18 to
        # 0x2B for inter device delays, each a big endian key and a big endian value.
        slots = {}
        for table, base in (('power on', 0x00), ('inter device', 0x18)):
            for slot in range(5):
                raw = bytes(latest.get(base + 4 * slot + k, 0xFF) for k in range(4))
                if raw != b'\xff' * 4:
                    slots[(table, slot)] = (int.from_bytes(raw[:2], 'big'), int.from_bytes(raw[2:], 'big'))
        self.assertEqual(slots, {('power on', 2): (0x0EDC, 10), ('inter device', 2): (0x0E26, 15)})
        # Keys 3804 and 3622 are the KPN box's and the PS3's, settingsstore.test.ts.
        self.assertEqual((0x0EDC, 0x0E26), (3804, 3622))
        for name in ('h650_page_ff', 'h700_28_internal_ff'):
            self.assertEqual(set(_store_slots(lab.load(name))), {0x80}, name)

    def test_the_firmware_stores_reads_and_sweeps_keyed_values_from_four_action_list_instructions(self):
        lab.require('h600_code_complete')
        code = lab.load('h600_code_complete')
        at = lambda address: isa.decode(code, address - BASE, BASE)
        # 0x7A: the operand into the accumulator at 0x205 and 0x206.
        self.assertEqual(at(0xE968).fields['k'], 0x7A)
        self.assertEqual((at(0xE972).fields, at(0xE976).fields),
                         ({'src': 0x2B2, 'dst': 0x205}, {'src': 0x2B3, 'dst': 0x206}))
        # 0x6C: the operand as the value, by way of 0xD0D and 0xD0E, and the keyed write at 0xE03A.
        self.assertEqual(at(0xEC7C).fields['k'], 0x6C)
        self.assertEqual([at(a).fields for a in (0xEC82, 0xEC86, 0xEC8A, 0xEC8E)],
                         [{'src': 0x2B3, 'dst': 0xD0E}, {'src': 0x2B2, 'dst': 0xD0D},
                          {'src': 0xD0D, 'dst': 0x0A0}, {'src': 0xD0E, 'dst': 0x0A1}])
        self.assertEqual(at(0xEC92).fields['target'], 0xE03A)
        # 0x0F with an operand byte of 0x40 to 0x4F: the keyed read at 0xE1DE, its bit 0 the table.
        self.assertEqual((at(0xF0A8).fields['k'], at(0xF1C0).fields['k']), (0x0F, 0x40))
        self.assertEqual(at(0xF1C8).fields, {'src': 0x2B2, 'dst': 0x0A2})
        self.assertEqual(at(0xF1CC).fields['target'], 0xE1DE)
        # 0x07 with 0xF3 and 0xF2: clear the marks, and erase every slot no read marked.
        self.assertEqual(at(0xF1DA).fields['k'], 0x07)
        self.assertEqual([(at(a).fields['k'], at(a + 6).fields['target']) for a in (0xF2EE, 0xF2FA)],
                         [(0xF3, 0xE24E), (0xF2, 0xE28C)])
        self.assertEqual((at(0xE2C4).fields['target'], at(0xE2CE).fields['target']), (0xDF3A, 0xDE70))
        # The table select: slots from 0x18 to 0x2C for one table and from 0x00 to 0x14 for the other.
        self.assertEqual([at(a).fields['k'] for a in (0xDDDA, 0xDDE6, 0xDDF4)], [0x18, 0x2C, 0x14])

    def test_the_configuration_restores_the_kpn_box_s_delay_from_list_1_and_its_delay_page_saves_the_defaults(self):
        lab.require('h600_config')
        from harmony import gspm
        c = gspm.parse(lab.load('h600_config'))
        lists = c.action_lists()
        flat = lambda index: [(i.opcode, i.operand) for i in lists[index]]
        # The start up list calls the per device reads between a 0x07 0xFFF3 and a 0x07 0xFFF2.
        boot = flat(1476)
        self.assertEqual((boot[0], boot[-1]), ((0x07, 0xFFF3), (0x07, 0xFFF2)))
        self.assertIn((0x7F, 154), boot)
        self.assertIn((0x7F, 1476), flat(1))
        # Read the KPN box's slot into the scratch, and when it is not 0xFEFD read it again into
        # its power on delay.
        self.assertEqual(flat(154), [(0x7A, 0x0EDC), (0x0F, 0xFF40), (0x1F, 0xED00 | self.SCRATCH), (0x7F, 172)])
        self.assertEqual(flat(172), [(0x7A, 0xFEFD), (0x7F, 3044)])
        self.assertEqual(flat(3044), [(0x70, 0x0100 | self.SCRATCH), (0x7F, 3043)])
        self.assertEqual(flat(3043), [(0x7A, 0x0EDC), (0x0F, 0xFF40), (0x1F, 0xED00 | self.KPN_POWER_ON)])
        # Saving: two keys of mode page 183, the delay page, run identical lists that copy the KPN box's
        # two Default variables, 70 and 71, into its delays, 67 and 64, and then run both saving tables.
        # So this route saves the defaults and cannot be what stored the 10; the defaults' values are
        # asserted in packages/codec/test/settingsstore.test.ts.
        page = c.mode_pages()[183]
        keys = {e.tag: e.operand for e in c.tagged_list(page.list_address) if e.opcode == 0x7F}
        self.assertEqual(keys, {0x88: 4802, 0x82: 4803})
        self.assertEqual(flat(4802), flat(4803))
        self.assertEqual(flat(4802)[0], (0x7F, 695))
        self.assertEqual(flat(695), [(0x7F, 106), (0x7F, 495)])
        self.assertEqual(flat(106), [(0x7F, 1805), (0x7F, 1030)])
        self.assertEqual((flat(1805), flat(1030)),
                         ([(0x1F, 0xF000 | 70), (0x1F, 0xEE00 | self.KPN_POWER_ON)],
                          [(0x1F, 0xF000 | 71), (0x1F, 0xEE00 | 64)]))
        self.assertEqual(flat(495), [(0x7F, 703), (0x7F, 506)])
        self.assertEqual((flat(703), flat(506)), ([(0x72, 0x0F00 | self.KPN_POWER_ON)], [(0x72, 0x0900 | 64)]))


class AVersionRequestWithAPayloadIsASettingsAndMemoryCommandOnArch14(unittest.TestCase):
    """Section 304: the settings store is read and written over USB by `0x1N` with a payload.

    `GET_VERSION` is `0x10`. With a nonzero length nibble the handler reads a payload byte and makes it
    the command state when it lies in `0x10` to `0x35` or `0xA0` to `0xC5`; twenty such sub-commands are
    parsed. `0xB2` reads one setting and `0xB3` writes one, through the store routines section 282 read,
    and `0xB1` writes a byte of data memory while it is being parsed. The 650's 0.2 build is byte
    identical over this whole path to the 600's; the 700's 2.8 carries the same pair at other addresses.
    The Harmony One's handler reads no payload at all.
    """

    SUB_COMMANDS = {0xB9, 0xB3, 0xB2, 0xB1, 0xB0, 0xAF, 0xAE, 0xAD, 0xAC, 0xA1, 0xA3, 0x34, 0x2F,
                    0x30, 0xA0, 0xB4, 0xC5, 0x21, 0x20, 0x1F}

    def _image(self, name):
        code = lab.load(name)
        return code, (lambda address: isa.decode(code, address - BASE, BASE))

    def test_on_the_600_and_650_a_payload_byte_becomes_the_state_and_twenty_states_have_a_parser(self):
        lab.require('h600_code_complete', 'h650_bench_code')
        for name in ('h600_code_complete', 'h650_bench_code'):
            with self.subTest(name):
                code, at = self._image(name)
                # A zero length nibble is the version request; anything else reads a byte and gates it.
                self.assertEqual((at(0xBD6A).mnemonic, at(0xBD6A).fields['f'], at(0xBD6C).fields['target']),
                                 ('MOVF', 0x01, 0xBD7C))  # MOVF 0xD01 under MOVLB 0xD, the length nibble
                self.assertEqual(at(0xBD68).fields['k'], 0x0D)
                self.assertEqual(at(0xBD8C).fields['target'], 0xBC4E)
                self.assertEqual([at(a).fields['k'] for a in (0xBC54, 0xBC5E, 0xBC62, 0xBC6A)],
                                 [0x10, 0x35, 0xA0, 0xC5])
                self.assertEqual(at(0xBC6E).fields, {'src': 0x726, 'dst': 0x1C1})
                table = chains.chain_table(code, BASE, 0xBD96, 32)
                self.assertEqual(set(table), self.SUB_COMMANDS)
                self.assertEqual((table[0xB1], table[0xB2], table[0xB3]), (0xC0EC, 0xC11E, 0xC13C))
                # The main loop's dispatch on the state: 66 cases, 54 in the gate's ranges, and 0xBD,
                # which has no parser, programs the word at 0x01F6C0 through 0x197F2.
                dispatch = chains.chain_table(code, BASE, 0xC684, 80)
                in_range = {v for v in dispatch if 0x10 <= v <= 0x35 or 0xA0 <= v <= 0xC5}
                self.assertEqual((len(dispatch), len(in_range), len(in_range - self.SUB_COMMANDS)), (66, 54, 34))
                self.assertEqual((dispatch[0xBD], at(0xD036).fields['target']), (0xD036, 0x197F2))
                self.assertEqual([at(a).fields['k'] for a in (0x197F4, 0x197F8, 0x197FC)], [0xC0, 0xF6, 0x01])
                self.assertEqual(at(0x19828).fields['target'], 0x19CD8)

    def test_0xb2_reads_a_setting_0xb3_writes_one_and_0xb1_writes_memory_while_parsing(self):
        lab.require('h600_code_complete', 'h650_bench_code')
        for name in ('h600_code_complete', 'h650_bench_code'):
            with self.subTest(name):
                code, at = self._image(name)
                # 0xB2 and 0xB3 parse a sixteen bit setting number, high byte first; 0xB3 then a value.
                # Each a MOVWF into bank 1, so the operand is the low byte of 0x1C7, 0x1C6 and 0x1CF.
                self.assertEqual([(at(a - 2).fields['k'], at(a).fields['f']) for a in (0xC12C, 0xC138)],
                                 [(1, 0xC7), (1, 0xC6)])
                self.assertEqual([(at(a - 2).fields['k'], at(a).fields['f']) for a in (0xC14A, 0xC156, 0xC16C)],
                                 [(1, 0xC7), (1, 0xC6), (1, 0xCF)])
                # Executed later: the lookup section 282 read, and the write that copies and retries.
                self.assertEqual((at(0xCCEA).fields['k'], at(0xCCFA).fields['target']), (0xB2, 0xDA04))
                self.assertEqual((at(0xCD04).fields['k'], at(0xCD18).fields['target']), (0xB3, 0xDD16))
                self.assertEqual(at(0xCD14).fields, {'src': 0x1CF, 'dst': 0x08F})
                # 0xB1: an address and a byte, stored through FSR0 at parse time, with no bound.
                self.assertEqual([at(a).fields for a in (0xC110, 0xC114, 0xC118)],
                                 [{'src': 0xD58, 'dst': 0xFE9}, {'src': 0xD59, 'dst': 0xFEA},
                                  {'src': 0xD5A, 'dst': 0xFEF}])
                # The lookup refuses a sixteen bit setting of 0xFF or more: low byte against 0xFF,
                # then the high byte with borrow.
                self.assertEqual((at(0xDA12).fields['k'], at(0xDA14).fields['f']), (0xFF, 0x08A))
                self.assertEqual((at(0xDA18).mnemonic, at(0xDA18).fields['f'], at(0xDA1A).mnemonic),
                                 ('SUBWFB', 0x08B, 'BNC'))

    def test_the_700s_2_8_reads_and_writes_the_same_store_and_the_one_s_version_handler_reads_no_payload(self):
        lab.require('h700_code', 'one34_code')
        _, at = self._image('h700_code')
        self.assertEqual((at(0xCDA6).fields['k'], at(0xCDB6).fields['target']), (0xB2, 0x1155C))
        self.assertEqual((at(0xCDC0).fields['k'], at(0xCDD4).fields['target']), (0xB3, 0x1186E))
        # The 2.8 lookup starts at program memory 0x01EC00 like the 0.2 one.
        self.assertEqual([at(a).fields['k'] for a in (0x11580, 0x11584)], [0xEC, 0x01])
        # The Harmony One's version handler sets state 1 and reads nothing more.
        one = lab.load('one34_code')
        at_one = lambda address: isa.decode(one, address - 0x20000, 0x20000)
        self.assertEqual([at_one(a).mnemonic for a in (0x264B4, 0x264B6, 0x264B8, 0x264C0)],
                         ['MOVLB', 'MOVLW', 'MOVWF', 'BRA'])
        # MOVLB 2 then MOVWF 0x84: state 1 into 0x284, the One's command state variable.
        self.assertEqual((at_one(0x264B4).fields['k'], at_one(0x264B6).fields['k'], at_one(0x264B8).fields['f']),
                         (0x02, 0x01, 0x84))

if __name__ == '__main__':
    unittest.main()
