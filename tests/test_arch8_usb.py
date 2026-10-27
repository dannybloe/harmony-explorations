"""
The Harmony 880 and 885 on the cable: what a running remote answered, and how its firmware reads.

**Measured on a Harmony 885 on 27 October 2026**, the first remote of arch 8 on a cable here, and
read in the 885's 4.4 application image, which a contributor published before any unit was
available. Sources checked before the work: `reference/architectures/harmony-880-885/`, which held
the predictions; concordance's `ArchList`, for the identity address and the processor; and the
image, for every reading below. Logitech's client was not opened, because nothing here is a framing
or a field meaning the protocol pages do not already state; the questions were where this firmware
reads from and whether it checks the address, which only the image can answer.

## What the remote answered

`GET_VERSION` returned `44 21 49 01 80 11 08`: firmware 4.4, hardware 2.1, flash device `0x49` from
manufacturer `0x01`, architecture 8 in the application, skin 17, platform 8. **Four of those seven
were predicted from the image and all four agree**: the accessor at `0x11C46` returns them as five
`RETLW`s, field 0, field 4's low nibble, field 5, field 6, field 4's high nibble, and this test
reads them out of the image rather than restating them. The other three, the hardware version and
the flash ids, come from somewhere the image reading did not follow, so they are pinned as measured
and nothing more.

`READ_FLASH` works on this architecture with the same framing as on every other, and the
**closure** is the application itself: the 65536 bytes at `0x010000` read off the remote are byte
for byte the published image, whose SHA-256 is pinned below. That measures the application's load
address, which two image readings and concordance had put there, and says the image this project
reads is the code that runs on the unit.

## How the firmware reads, and what it does not check

The command dispatch is the `XORLW` chain at `0x15854`, on the masked command byte: seven cases,
`0x10`, `0x30`, `0x50`, `0x70`, `0xA0`, `0xB0` and `0xD0`, the same seven as arch 12 (Harmony One) and
arch 14 (Harmony 600, 650 and 700), and **no case for the `0xE0` escape**, so neither the session end
nor the restart a later writer sends is reached from this dispatch. Another chain in the image tests
`0xE0` among its cases, at `0x14B12` on the variable at `0x0B8`, with `0xC0`, `0xA0` and `0x80` beside
it; it is not identified, so whether the escape is handled somewhere else is not checked.

`READ_FLASH` goes to `0x15886`, which sets the command state to 4 and shares a parse with
`WRITE_FLASH`: three address bytes into `0x25B` to `0x25D` and two count bytes into `0x25E` and
`0x25F`, calling nothing but the routine that takes the next byte off the packet. The read state at `0x15D0C` acknowledges an empty count with `F0 50`, and
otherwise chunks at 63, 31, 15 and 7 like the later Harmonys and fetches each byte through
`0x1908E`, whose primitive at `0x1A29C` loads the 24 bit address into the table pointer and does
one `TBLRD*`. **Nothing on that path calls an address check**: the checker is `0x19B5C`, and its one
caller in the whole image is the erase handler, at `0x15908`. An inline comparison would not show up as
a call, and none was seen reading the path, but that is a reading and not something the test asserts. So the library's arch 8 bound, `ARCH8_FLASH_TOP` in
`packages/usb/src/protocol.ts`, is the program memory space and not a validator's literal.

Two consequences. The fetch is a byte at a time and each chunk's counter counts down by one, so the
**odd count hang of arch 12 (Harmony One)**, whose word fetch counts down by two, has no counterpart in
this loop; an odd count on this remote is not measured. And `0xFE` and `0xFF` are not an internal window
here, the part being ROMless by concordance's table, so the library refuses them on arch 8.

**Read and not interpreted**: a chunk of one byte whose address is `0x000104` or `0x000105` does not
fetch flash, it calls `0x182FA` or `0x11C1C` and sends what they return. The test is on the chunk's
length, so a longer read whose last chunk is that one byte would meet it too. What they return is not
checked.

## What it rules out

That arch 8 needs a different command protocol from the later Harmonys: it does not, for reads.
That the firmware would refuse a read the library sends past the part: nothing on the read path calls a
check, which is why the bound is the library's. What such a read returns is not checked.
"""
import hashlib
import unittest

import lab
from harmony.pic18 import chains, isa

BASE = 0x10000

# What the remote returned to GET_VERSION, measured.
H885_VERSION_BLOCK = (0x44, 0x21, 0x49, 0x01, 0x80, 0x11, 0x08)

# SHA-256 of the 65536 bytes read off the remote at 0x010000. Equal to the published image's,
# which is the measurement: the comparison found no differing byte.
H885_APPLICATION_READ_SHA256 = '8c6b4ef0a8166d35a2961330b38e5c70ec908c5f81020b3c257b25311c19a799'

VERSION_ACCESSOR = 0x11C46
DISPATCH = 0x15854
READ_FLASH_HANDLER = 0x15886
ERASE_FLASH_HANDLER = 0x158D2
READ_STATE = 0x15D0C
BYTE_FETCH = 0x1908E
TABLE_READ = 0x1A29C
ADDRESS_CHECKER = 0x19B5C


def instructions(code, start, end):
    """(address, instruction) pairs from start up to end, decoded through the one opcode table."""
    # The iterator takes offsets into the image and yields program addresses.
    return list(isa.iter_instructions(code, BASE, start - BASE, end - BASE))


def calls(code, start, end):
    return [ins.fields['target'] for _, ins in instructions(code, start, end)
            if ins.mnemonic in ('CALL', 'RCALL')]


class TestTheRemoteAnswersWhatTheImagePredicts(unittest.TestCase):
    def setUp(self):
        lab.require('arch8_code_885')
        self.code = lab.load('arch8_code_885')

    def test_the_four_predicted_fields_are_the_accessors_constants(self):
        listing = instructions(self.code, VERSION_ACCESSOR, VERSION_ACCESSOR + 10)
        constants = [ins.fields['k'] for _, ins in listing]
        self.assertEqual([ins.mnemonic for _, ins in listing], ['RETLW'] * 5)
        field0, field4_low, field5, field6, field4_high = constants
        self.assertEqual(H885_VERSION_BLOCK[0], field0)
        self.assertEqual(H885_VERSION_BLOCK[4], (field4_high << 4) | field4_low)
        self.assertEqual(H885_VERSION_BLOCK[5], field5)
        self.assertEqual(H885_VERSION_BLOCK[6], field6)

    def test_the_pinned_hash_of_the_read_is_the_images(self):
        # The comparison with the remote was made on the bench; what this can hold is that the hash
        # pinned from it is still the image's, so a replaced lab image fails here.
        self.assertEqual(len(self.code), 0x10000)
        self.assertEqual(hashlib.sha256(self.code).hexdigest(), H885_APPLICATION_READ_SHA256)


class TestTheReadPathChecksNoAddress(unittest.TestCase):
    def setUp(self):
        lab.require('arch8_code_885')
        self.code = lab.load('arch8_code_885')

    def test_the_dispatch_is_the_seven_commands_and_no_escape(self):
        table = chains.chain_table(self.code, BASE, DISPATCH)
        self.assertEqual(sorted(table), [0x10, 0x30, 0x50, 0x70, 0xA0, 0xB0, 0xD0])
        self.assertNotIn(0xE0, table)
        self.assertEqual(table[0x50], READ_FLASH_HANDLER)
        self.assertEqual(table[0xD0], ERASE_FLASH_HANDLER)

    def test_the_address_checker_has_one_caller_and_it_is_the_erase(self):
        # Over the whole image rather than the read handler's range, since that range ends in a
        # branch the range would not follow.
        everywhere = [address for address, ins in instructions(self.code, BASE, BASE + len(self.code))
                      if ins.mnemonic in ('CALL', 'RCALL') and ins.fields['target'] == ADDRESS_CHECKER]
        self.assertEqual(everywhere, [0x15908])
        self.assertTrue(ERASE_FLASH_HANDLER <= everywhere[0] < 0x1595E)

    def test_every_byte_comes_from_one_table_read(self):
        self.assertIn(BYTE_FETCH, calls(self.code, READ_STATE, 0x15E6C))
        self.assertIn(TABLE_READ, calls(self.code, BYTE_FETCH, BYTE_FETCH + 0x12))
        listing = [ins.mnemonic for _, ins in instructions(self.code, TABLE_READ, TABLE_READ + 0x12)]
        self.assertEqual(listing, ['MOVFF', 'MOVFF', 'MOVFF', 'TBLRD*', 'MOVF', 'RETURN'])

    def test_each_chunk_counts_down_one_byte_at_a_time(self):
        # The per chunk loop decrements its counter by one, `DECF`, where the Harmony One's word
        # fetch subtracts two and so never reaches zero from an odd count.
        listing = instructions(self.code, 0x15E38, 0x15E62)
        self.assertEqual([ins.mnemonic for _, ins in listing].count('DECF'), 1)
        self.assertEqual(listing[-1][1].mnemonic, 'BNC')


if __name__ == '__main__':
    unittest.main()
