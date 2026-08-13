"""
The serial flash's command set, the chip size the firmware detects, and the journal it writes to.
`docs/findings.md` section 108.

Section 73 called `0x0F`'s `0xE0` band "a diagnostic channel" because it emits fixed byte patterns
through `0x159F4`. This is what `0x159F4` turned out to be, followed from the two action list
opcodes that also feed it, `0x65` and `0x66`.

Three images: the Harmony 700, the 600 and the 650, all arch 14. The 650's identification table is at
almost the same address as the 700's and accepts exactly the same parts; the 600's is elsewhere and
accepts one part fewer. So the list is per build and one sample would have made it look like a
constant, while what all three agree on is the capacity it stops at.

The negatives are asserted too, on arch 12 and arch 9: neither has an identification table at all,
which is the check behind saying the size question is an arch 14 question.

Everything is asserted against decoded instructions rather than against a hand written listing, so a
wrong opcode table in `isa.py` fails these too.
"""
import re
import unittest

import lab
from harmony.pic18 import isa

ARCH14_BASE = 0x9000

# The SPI primitives, on the Harmony 700. `write` and `read` are the byte level pair; everything
# else is a command built out of them.
WRITE_BYTE = 0x1B984            # one byte out, from 0x3C6
READ_BYTE = 0x1B9AC             # one byte in, the config read primitive of section 8
CHIP_SELECT = 0x18CEC           # deassert then assert, which is what frames a command
COMMANDS = {
    'read': 0x18D98,            # 0x03 plus the three TBLPTR bytes
    'read_byte': 0x18DBC,       # a bare read, once a read command is open
    'block_erase': 0x18DC0,     # 0xD8, then poll
    'page_program': 0x18DEA,    # 0x02, the address, one byte, then poll
    'read_id': 0x18D30,         # 0x9F, three bytes back
}

# The SPI opcodes those routines send, as the datasheets name them.
SPI_READ = 0x03
SPI_PAGE_PROGRAM = 0x02
SPI_READ_STATUS = 0x05
SPI_BLOCK_ERASE = 0xD8
SPI_READ_ID = 0x9F

# The chip select. `LATF` on the PIC18F67J50, bit 7, and the firmware frames every command with a
# deassert followed by an assert rather than the other way round.
LATF = 0x0F8E
CHIP_SELECT_BIT = 7

# The table pointer, which is this firmware's cursor into the serial flash and not into program
# memory. `isa` has no names for these, so they are here rather than imported.
TBLPTRL = 0x0FF6
TBLPTRH = 0x0FF7
TBLPTRU = 0x0FF8

# The journal, on the Harmony 700.
JOURNAL_ALLOCATE = 0x15D3A      # choose the region
JOURNAL_APPEND = 0x159F4        # what the action list opcodes and 0x0F's 0xE0 band call
JOURNAL_PROGRAM = 0x15AF0       # the byte at 0x0FC to the flash, then advance
CHIP_SIZE = 0x688               # 24 bit, zero when the chip is not recognised
JOURNAL_START = 0x0F3           # 24 bit
JOURNAL_SIZE = 0x0F6            # 24 bit
JOURNAL_FLOOR = 0x0F9           # 24 bit, the config's end plus three
JOURNAL_BYTE = 0x0FC            # the byte an appender puts here before calling

# The allocator's own numbers: it tries this many 64 KiB blocks, downwards, and stops below the
# lower bound.
BLOCKS_MOST = 8
BLOCKS_FEWEST = 2
BLOCK_SHIFT = 0x10              # the rotate count that multiplies by 65536

# The two action list arms, on the Harmony 700. Each writes one byte of the operand and calls the
# appender; `0x65` falls through into `0x66`'s arm, so it sends two bytes and `0x66` sends one.
APPENDER_ARMS = {0x65: 0x0F14E, 0x66: 0x0F156}
OPERAND_LOW = 0x1BB
OPERAND_HIGH = 0x1BC

# The container header offset the floor comes from, and what the firmware adds to it.
END_ADDR_OFFSET = 4
FLOOR_ADJUSTMENT = 3

# `MOVLW <capacity> ; XORWF f,W ; BNZ ; MOVLW <manufacturer> ; XORWF f,W`, the shape of one entry in
# the identification table. The `BNZ` displacement varies with the arm, so it is not pinned here.
ENTRY = re.compile(rb'([\x13\x14\x15])\x0e.\x19.\xe1([\x20\x1c\xc2\xef])\x0e', re.S)

# What the capacity codes mean, from the JEDEC convention the parts follow. The firmware stores the
# size's high byte, so 0x20 is 0x200000.
CAPACITY_BYTES = {0x13: 0x080000, 0x14: 0x100000, 0x15: 0x200000}
SIZE_HIGH_BYTES = {0x08, 0x10, 0x20}
LARGEST_SUPPORTED = 0x200000

# Where each image's sizing table starts. The 700 and the 650 carry a second copy of the comparison
# a little further on, in the routine that re-identifies the chip, so the count of matches over the
# whole image is twice the table's length on those two and once on the 600.
TABLES = {
    'h700_code': {'base': ARCH14_BASE, 'at': 0x1090C, 'matches': 12},
    'h650_code': {'base': ARCH14_BASE, 'at': 0x108EC, 'matches': 12},
    'h600_code_complete': {'base': ARCH14_BASE, 'at': 0x17E12, 'matches': 6},
}

# The architectures with no serial flash to identify.
NO_TABLE = {'one34_code': 0x20000, 'h525_code': 0x0000}


def instructions(name, base, start, count):
    """`count` decoded instructions from `start`, as (address, Instr) pairs."""
    code = lab.load(name)
    out = []
    offset = start - base
    for _ in range(count):
        instr = isa.decode(code, offset, base)
        out.append((base + offset, instr))
        offset += 2 * instr.words
    return out


def literals(pairs):
    """Every `MOVLW` value in a window, in order."""
    return [i.fields['k'] for _, i in pairs if i.mnemonic == 'MOVLW']


def absolute(instr):
    """The full data address an access names, or None when it is banked rather than access bank."""
    f = instr.fields.get('f')
    if f is None:
        return None
    if instr.fields.get('a') == 0 and f >= 0x60:
        return 0xF00 | f
    return None


class CommandSetTest(unittest.TestCase):
    """The five commands, which is the whole SPI vocabulary this firmware has."""

    def setUp(self):
        if lab.load('h700_code') is None:
            self.skipTest('no h700_code in the lab')

    def test_the_chip_select_is_latf_bit_7_deasserted_then_asserted(self):
        pairs = instructions('h700_code', ARCH14_BASE, CHIP_SELECT, 2)
        self.assertEqual([i.mnemonic for _, i in pairs], ['BSF', 'BCF'])
        for _, instr in pairs:
            self.assertEqual(absolute(instr), LATF)
            self.assertEqual(instr.fields['b'], CHIP_SELECT_BIT)

    def test_a_read_sends_0x03_and_the_three_address_bytes(self):
        pairs = instructions('h700_code', ARCH14_BASE, COMMANDS['read'], 12)
        self.assertEqual(literals(pairs), [SPI_READ])
        # The address comes straight out of TBLPTR, high byte first, which is what makes TBLPTR the
        # cursor into the serial flash rather than into program memory.
        moved = [i.fields['src'] for _, i in pairs if i.mnemonic == 'MOVFF']
        self.assertEqual(moved, [TBLPTRU, TBLPTRH, TBLPTRL])

    def test_a_page_program_sends_0x02_and_polls_the_status_register(self):
        pairs = instructions('h700_code', ARCH14_BASE, COMMANDS['page_program'], 20)
        values = literals(pairs)
        self.assertEqual(values[0], SPI_PAGE_PROGRAM)
        self.assertIn(SPI_READ_STATUS, values, 'it waits for the write to finish')
        # The poll is a loop on bit 0 of the status byte, the write in progress flag.
        self.assertIn(0x01, [i.fields['k'] for _, i in pairs if i.mnemonic == 'ANDLW'])

    def test_an_erase_sends_0xd8_and_polls_the_same_way(self):
        pairs = instructions('h700_code', ARCH14_BASE, COMMANDS['block_erase'], 16)
        values = literals(pairs)
        self.assertIn(SPI_BLOCK_ERASE, values)
        self.assertIn(SPI_READ_STATUS, values)

    def test_the_identify_command_sends_0x9f_and_reads_three_bytes(self):
        pairs = instructions('h700_code', ARCH14_BASE, COMMANDS['read_id'], 18)
        self.assertIn(SPI_READ_ID, literals(pairs))
        reads = [i.fields['target'] for _, i in pairs
                 if i.mnemonic in ('CALL', 'RCALL') and i.fields.get('target') == READ_BYTE]
        self.assertEqual(len(reads), 3, 'manufacturer, memory type and capacity')


class SizeTableTest(unittest.TestCase):
    """What sizes the firmware knows, which is what bounds the arch 14 flash question."""

    def test_three_images_carry_an_identification_table(self):
        # Up front, so a lab holding one of the three skips the whole test rather than passing
        # having checked one image while its title says three. Measured on 13 August 2026: with
        # only the Harmony 700 image present this reported OK with two subtests skipped.
        lab.require(*TABLES)
        for name, where in TABLES.items():
            with self.subTest(name):
                code = lab.load(name)
                entries = ENTRY.findall(code)
                capacities = {e[0][0] for e in entries}
                manufacturers = {e[1][0] for e in entries}
                self.assertEqual(len(entries), where['matches'])
                self.assertTrue(capacities <= set(CAPACITY_BYTES))
                self.assertTrue(manufacturers <= {0x20, 0x1C, 0xC2, 0xEF})
                # Nothing above 2 MiB is recognised, on any of the three.
                self.assertEqual(max(CAPACITY_BYTES[c] for c in capacities), LARGEST_SUPPORTED)

    def test_the_600_knows_one_part_fewer_than_the_700_and_the_650(self):
        """Which is why one image would have made the table look like a constant.

        The 700 and the 650 accept the same seven (capacity, manufacturer) pairs and the 600 accepts
        six of them, dropping EON at 1 MiB. So the list is per build, and the only thing all three
        agree on is where it stops.
        """
        images = {n: lab.load(n) for n in TABLES}
        if any(v is None for v in images.values()):
            self.skipTest('the three arch 14 images are not all in the lab')
        pairs = {n: {(e[0][0], e[1][0]) for e in ENTRY.findall(c)} for n, c in images.items()}
        self.assertEqual(pairs['h700_code'], pairs['h650_code'])
        self.assertEqual(len(pairs['h700_code']), 7)
        self.assertEqual(len(pairs['h600_code_complete']), 6)
        self.assertTrue(pairs['h600_code_complete'] < pairs['h700_code'], 'a strict subset')
        self.assertEqual(pairs['h700_code'] - pairs['h600_code_complete'], {(0x14, 0x1C)})
        # All three stop at the same capacity, which is the claim that bounds the size question.
        for name, entries in pairs.items():
            largest = max(CAPACITY_BYTES[c] for c, _ in entries)
            self.assertEqual(largest, LARGEST_SUPPORTED, name)

    def test_the_700_stores_the_size_as_a_high_byte(self):
        code = lab.load('h700_code')
        if code is None:
            self.skipTest('no h700_code in the lab')
        # The three arms each clear the low two bytes and load one literal for the high byte.
        highs = set()
        for start in (0x10956, 0x1095E, 0x10966):
            pairs = instructions('h700_code', ARCH14_BASE, start, 3)
            self.assertEqual([i.mnemonic for _, i in pairs][:2], ['CLRF', 'CLRF'])
            highs.add(literals(pairs)[0])
        self.assertEqual(highs, SIZE_HIGH_BYTES)

    def test_the_architectures_without_serial_flash_have_no_table(self):
        """Arch 12 executes its config out of parallel NOR and arch 9 has neither table nor size.

        A negative, and the reason the size question is an arch 14 question at all. It is asserted
        over the whole image rather than at an address, because the claim is that nothing anywhere
        identifies a chip.
        """
        # The negative is the whole point, so a missing image must skip rather than assert nothing:
        # without this, a lab holding neither reported OK having tested no architecture at all.
        lab.require(*NO_TABLE)
        for name in NO_TABLE:
            with self.subTest(name):
                self.assertEqual(ENTRY.findall(lab.load(name)), [])


class JournalTest(unittest.TestCase):
    """The region, and the two action list opcodes that write into it."""

    def setUp(self):
        if lab.load('h700_code') is None:
            self.skipTest('no h700_code in the lab')

    def test_the_region_is_the_largest_run_of_blocks_that_fits(self):
        pairs = instructions('h700_code', ARCH14_BASE, JOURNAL_ALLOCATE, 40)
        values = literals(pairs)
        # It starts at eight blocks, stops below two, and each candidate size is a block count
        # multiplied by 65536 by a sixteen step rotate.
        self.assertIn(BLOCKS_MOST, values)
        self.assertIn(BLOCKS_FEWEST, values)
        self.assertIn(BLOCK_SHIFT, values)
        self.assertEqual([i.mnemonic for _, i in pairs].count('RLCF'), 3, 'a 24 bit shift')
        # And it gives up if either bound is zero, which is what an unrecognised chip produces.
        self.assertEqual([i.mnemonic for _, i in pairs].count('RETURN'), 2)

    def test_the_appender_refuses_without_a_region(self):
        pairs = instructions('h700_code', ARCH14_BASE, JOURNAL_APPEND, 40)
        # Five 24 bit values are collected, then the start and the size are tested for zero and the
        # routine returns on either. Two `RETURN`s before any write is the refusal.
        self.assertGreaterEqual([i.mnemonic for _, i in pairs].count('IORWF'), 4)
        self.assertGreaterEqual([i.mnemonic for _, i in pairs].count('RETURN'), 2)

    def test_the_program_step_writes_the_byte_at_0x0fc_through_the_page_program(self):
        pairs = instructions('h700_code', ARCH14_BASE, JOURNAL_PROGRAM, 10)
        moved = [(i.fields.get('src'), i.fields.get('dst')) for _, i in pairs
                 if i.mnemonic == 'MOVFF']
        self.assertIn(JOURNAL_BYTE, [src for src, _ in moved], 'the byte an appender staged')
        # The address is TBLPTR again, and the call is the one that ends in a page program.
        self.assertEqual([dst for src, dst in moved if src is not None][:3],
                         [TBLPTRL, TBLPTRH, TBLPTRU])

    def test_the_two_opcodes_stage_one_operand_byte_each(self):
        for opcode, start in APPENDER_ARMS.items():
            with self.subTest(hex(opcode)):
                pairs = instructions('h700_code', ARCH14_BASE, start, 2)
                move = pairs[0][1]
                self.assertEqual(move.mnemonic, 'MOVFF')
                self.assertEqual(move.fields['dst'], JOURNAL_BYTE)
                self.assertEqual(move.fields['src'],
                                 OPERAND_LOW if opcode == 0x65 else OPERAND_HIGH)
                self.assertEqual(pairs[1][1].fields['target'], JOURNAL_APPEND)

    def test_0x65_falls_through_into_0x66s_arm_so_it_sends_both_bytes(self):
        """Which is why one opcode sends two bytes and the other one, from the same six instructions.

        Asserted as the absence of a branch: `0x65`'s arm ends in the call, and the next instruction
        is `0x66`'s own staging move rather than a jump to the dispatcher's exit.
        """
        after = instructions('h700_code', ARCH14_BASE, APPENDER_ARMS[0x65], 3)
        self.assertEqual(after[2][0], APPENDER_ARMS[0x66])
        self.assertEqual(after[2][1].mnemonic, 'MOVFF')

    def test_the_floor_is_the_configs_own_end_address(self):
        # `0x6DC` is a byte offset into the container header, and 4 is `end_addr`. The firmware then
        # adds four and subtracts one, so the floor is the byte after the four byte end marker.
        pairs = instructions('h700_code', ARCH14_BASE, 0x164E2, 12)
        values = literals(pairs)
        self.assertEqual(values[0], END_ADDR_OFFSET)
        self.assertEqual(values[1], FLOOR_ADJUSTMENT + 1)
        moved = [(i.fields.get('src'), i.fields.get('dst')) for _, i in pairs
                 if i.mnemonic == 'MOVFF']
        self.assertEqual([dst for _, dst in moved][:3],
                         [JOURNAL_FLOOR, JOURNAL_FLOOR + 1, JOURNAL_FLOOR + 2])


if __name__ == '__main__':
    unittest.main()
