"""
The Harmony 880 and 885 write their own flash in one place, the log area, and a configuration says where.

**Read in the firmware** on 4 November 2026, item 1.7 of `todo/todo-prepare-885.md`, in the 885's
application 4.4 (`arch8_code_885`, base `0x010000`; the 880's differs in the two skin bytes only,
`tests/test_harmony_885_start_check.py`, and none of the routines below holds either), and for the
EEPROM and the message screens in both bootloaders. **Measured in configurations** over the sixteen
byte distinct arch 8 containers of the start check's calibration, which are six configurations' lineages:
the four harmony-decompiler `Update` reads, the five Bedroom files, the four Living Room files, and one
each of an 880 Pro, a second 880 and a Harmony 720. **The Harmony 720's application is a different build**
(item 1.6) and its log routines are not compared, so everything read here is the 880 and 885 build's. No
remote was opened. Every instruction is
decoded through `harmony.pic18.isa`, every switch through `harmony.pic18.chains`. Addresses are the 885
application's unless a line says otherwise.

**Sources checked before the work**: `reference/config-format/state.md`, base slot 2, which named the
Harmony One's image as the one firmware read writing the log area and said no configuration in the corpus
appended to it; `reference/architectures/harmony-880-885/memory.md`, which listed this firmware's writes
there as unread; `reference/architectures/harmony-600-650-700/memory.md`, which gave the Harmony One as
the log area's one writer; the archive's sections 47 and 111 (the Harmony One's writer and its dead
region), 108 (arch 14's flash journal, the same `0x0F` band) and 118 (`tests/test_findings.py`,
`TestTheFlashJournalOpcodesAreBoundedOrAbsent`, whose corpus wide negative is about opcodes `0x65` and
`0x66` alone); items 1.1 to 1.6 and 1.8 of this track, `tests/test_harmony_885_*.py`. **Logitech's client,
decision 2**: MyHarmony names nothing of this platform. The classic client names base slot 2
`SECTION_FLASH_STORAGE` and, for architectures 7, 8 and 9, parses an eight byte entry whose byte at `+7`
says how many bytes are used, `0xFF` meaning erased (stated by Logitech, in their client;
`reference/config-format/state.md` already carries it as such). It names a user logging region for
architecture 14 only. Nothing in it was found that reads or erases this architecture's log as a log.

## The instruction

Opcode `0x0F` (the opcode at data `0x3B4` at or above `0x0F`, `0x1383C`) with an operand low byte (data
`0x3B2`) below `0xF0` (`0x13842`) and at or above `0xE0` takes the band at `0x1384A`; its low nibble is switched by the chain at `0x13854`, decoded `{02, 01, 00}`:

| operand low byte | what | where |
|---|---|---|
| `0xE0` | close the current record | `0x13862`, `CALL 0x1A0D4` |
| `0xE1` | append the byte register, data `0x30A` | `0x13868` |
| `0xE2` | append two bytes, data `0x30B` and then `0x30C` | `0x1386E` |
| `0xE3` to `0xEF` | nothing, the chain's default | `BRA 0x139B2` |

Which register `0x30A` and the pair `0x30B`, `0x30C` are (the codec's byte register and accumulator on
other platforms) is not read here. This is the band `packages/codec/src/actions.ts` places on arch 14 as
the flash journal, section 108; on arch 14 the firmware chooses the region from the chip size and the
configuration's end, and here it takes it from the configuration.

## At start, `0x19FEE`

Called once, from main at `0x16E4A`, after the battery calibration test (`0x10DCE`, which runs on into
`0x10DE6`) and before the unlock is cleared (`0x16E4E`). It clears the records left (data `0x290`,
`0x291`) and returns unless bit 2 of data `0x086` is set (`0x19FF6`), so **the log is off for the run
unless the user configuration passed its check and the battery calibration word is not blank**, both of
which clear that bit, `tests/test_harmony_885_start_check.py`. The built in configuration's own log area
(`8192, 0x0F0000, 0x100000` by the reading in the lab, not asserted) is never used.

Otherwise it seeks base slot 2, the one call of the seeker with slot 2 among its 22 in the
application (raw slot 2 on this architecture; `MOVLW 2`, `MOVWF 0x0D3`, the seeker
`0x191DE`, which reads the pointer table entry at `0x0B + 4 * slot` past its spare byte), then
`0x190A0` reads **two** bytes into data `0x290`, `0x291` (the capacity, low byte first) and `0x19062`
reads **three** bytes and makes them the read cursor, data `0x080` to `0x082`: the start, an absolute
address. **The limit at `+5` is never read**: the three byte read replaces the cursor, and the scan that
follows reads from the start. The scan (`0x1A016` to `0x1A060`) takes eight bytes at a time; the first
record whose eight all read `0xFF` is the next address (the cursor saved before and restored after,
`0x19324`, `0x19332`), and every other record takes one off the records left. With none left the scan
stops where it is. The next address goes to data `0x28D` to `0x28F`. **Nothing past that first erased
record is looked at**: the appends then program onward whatever the flash holds, and a used record after
it is not counted (the blind reviewer's observation, asserted on the model below).

**What is checked**: nothing about the address. Not against the limit, the configuration's end, the
application or the device window. The one check on the way is the one byte program's own, the inner floor
at `0x1FFFC0` (`tests/test_harmony_885_erase_and_write.py`): at or above `0x010000` passes, below only
with the unlock, which the log path never sets.

## Appending and closing

**Append**, `0x1A070`: returns at once when no record is left; otherwise copies the flash routines into
RAM slot 1 (`0x19D28`), programs the byte at data `0x292` at the next address through `0x19036`, the
wrapper `0x1A2AE` and the RAM entry `0x1FFE56`, and advances; when the address reaches a record's eighth
byte it closes the record. **Close**, `0x1A0D4`: nothing on a record boundary; otherwise one record off,
the address moved to the record's last byte, and the number of data bytes (the address's low three bits
before the move, 1 to 7) programmed there. **Records are framed on the address's own low three bits**
(`ANDWF 0x8D` with 7, `0x1A0CA` and `0x1A0D8`), not on the distance from the start, so a start that is not
a multiple of eight puts the count byte at the next multiple and states a count of bytes that were never
written (asserted on the model). So **a record is up to seven data bytes, `0xFF` padding, and the
count in its last byte**, which is the classic client's `+7` byte. The application never erases the log
on its own, since its one erase call is the host's erase command, and once the declared number of records
is used it appends nothing more and says nothing.

## Every flash write in the application

The application calls its RAM flash routines from nine places (asserted below): erase `0x1FFE52` once,
from the erase wrapper; the id read `0x1FFE54` twice, from the version reply's id read; the buffer
program `0x1FFE58` once, from the write drain's wrapper; the sleep slot `0x1FFE02` twice, which writes
nothing; and **the one byte program `0x1FFE56` three times**: `0x1A2C2` in the wrapper whose only caller is
`0x19036`, called only by the log's append and close (`0x1A0BA`, `0x1A12A`); `0x183E8` in the hardware
version log append the write drain reaches at `0x000104`; and `0x184B6` in the migration `0x18408`, which
**nothing transfers control to**: no `CALL`, `RCALL`, `GOTO` or branch names it (asserted). The reading also found no stored copy of its address (the two `04 C2`
byte pairs in the image are `MOVFF 0x204` operands), so the migration is dead in the application as far as
static references go; the bootloader runs its own at every start (item 1.1). Of the 116 `TBLWT` in the
application's code, 7 are the RAM routines' source; the reading classed the rest by their table pointer
loads as writes to the USB controller and the display at `0x1FE080` to `0x1FE0C1`, 58 resolved by script
and the others sampled, so that half is the reading's and only the count is asserted. **So the list of
flash writes is complete as far as calls of the flash routines go**; that no other table write reaches
flash rests on that unasserted classification, and a reviewer's cruder resolver placed 38 of the 109 on
the same devices and found some with no table pointer load in reach, `0x10182` (header data decoded as
code) among them.

## Nothing else persists

**No EEPROM in use**: in the application and in both bootloaders the only write to `0xFA6` to `0xFA9`, the
data EEPROM's registers on a PIC18 (inferred from the family, the part is not identified), is one
`MOVWF 0xFA7` of zero right after `CLRF WREG` and two `BSF 0xFB0` bits, in the port set up; no `0x55`,
`0xAA` sequence precedes it and nothing sets a write bit. **No settings store**: with the list above
complete as far as it goes, nothing the remote decides on its own is kept in flash, and what it remembers (the clock, the
state variables) is data memory. So on this platform no value saved on the remote overrides the
configuration, which is row F16 of the track's rail table.

## What write misc selector 7 reaches

Selector 7 writes any data byte through `FSR0`, unbounded, in the application and in both bootloaders
(`tests/test_harmony_885_write_end.py` and `tests/test_harmony_885_bootloader.py`). In the application
that reaches the guards of a flash write this reading found in data memory: the unlock (data `0x23A`), the staged install's status (`0x100`), the
configuration flags (`0x086`), the log's next address and records left (`0x28D` to `0x291`), and the RAM
the flash routines run from (data `0x400` up, mapped at `0x1FFE00` up, inferred in item 1.1). **The
copier skips a slot whose flag at data `0x212` plus the slot already names the set it would load**
(`0x19D36` to `0x19D42`, asserted), so, given that mapping, a byte changed there by selector 7 is the code
the next erase, write or log append runs. And every special function register, whose meanings here rest on the PIC18
family and are inferred.

## The flash message screens

"FLASH Memory ID", "FLASH Memory Erase", "FLASH Memory Write" and "FLASH Memory Clear" sit at
`0x01E17A`, `0x01E1A8`, `0x01E1D9` and `0x01E20A`, inside the built in configuration (`0x01E000` to
`0x01FB89`), in both applications, and nowhere in either bootloader. By the strings' layout they are the
built in configuration's message screens 5 to 8 (item 1.2's `messages.py` in the lab; not asserted).
**The application never asks for them**: the message routine `0x16A18` is called from seven places with
the numbers `0x00`, `0x09`, `0x0A`, `0x16`, `0x19`, `0x1A` and `0x1B`, its fallback `0x169F4` with `0x02`
and with the message routine's own argument. Each bootloader's error display (`0x05326` in the 885's, `0x05318` in the 880's)
is called with `0x02` and from a routine nothing reaches (`0x0534A`, `0x0533C`). The reading also found that the built in
configuration's own lists enter modes `0x00`, `0x11`, `0x1C` and `0x1D` only, which `gspm` cannot parse
from the image and is not asserted. So the four look like a self test's messages left in a shared list,
and no write path is behind them; that reading of their purpose is inferred.

## The corpus

All sixteen containers declare base slot 2 as `15360, 0x1E0000, 0x1FE000`, by `gspm.log_area` and by
the start routine as read, two independent readers of the same bytes (the library sizes the capacity
from the section's length, the model takes its widths from the code). **Two emit the append**, each in one
list of eight instructions, the same in both:

```
0F:FFE0  7A:0002  0F:FFE2  7A:0000  0F:FFE2  1F:FB00  0F:FFE1  0F:FFE0
```

a close, two two byte appends, a one byte append and a close: one record of five data bytes. Their
values depend on what `7A` and `1F:FB00` load; the blind reviewer read `0x7A` loading `0x30B`, `0x30C`
(`0x132AA`) and `0x1F` with a second byte `0xFB` loading `0x30A` (`0x1365E`), which makes the record
`02 00 00 00 00 FF FF 05`, and that is not asserted here. In `H880-Spare-4` it is
list 588, called by ten lists, five of them bound in base slot 8 to key code `0x88`; in harmony-decompiler's
`Update` it is list 501, called by four, two of them bound to `0x88`. Every calling list is three
instructions: `0x92` or `0x93` with operand 3, the call, and `0x7E`, which the codec reads as entering a
mode. Which key and which event `0x88` is on this platform is not checked. Nothing else in the sixteen
uses the band. **The same eight instruction list, byte for byte, sits in one Harmony 525 configuration**,
`h525_config_2`, list 162, and the Harmony One configurations use `0x0F:FFE1` and `0x0F:FFE3`; what that
band does on the Harmony 525 and the Harmony One is not read here, so the list is shared by Logitech's
compiler across platforms and its effect is known on this one only. The six containers are asserted below
over the whole of `lab.ALL_CONTAINERS`; no arch 14 container uses the band.

**The control** moves base slot 2's start in a copy of a container, with the application and the
container placed in the model's flash, and the computed next address follows it: to the new start in
erased flash (`0x1C0000`, `0x1D0000`, the device window at `0x1FE000`), and onto programmed flash at its
first erased eight bytes, because the scan steps over every record that is not all `0xFF`: aimed at
`0x010000` it lands at `0x0103F8`, the application's last eight bytes before its code, and aimed at
`0x020000` at `0x038CD8`, inside `Update`'s own configuration, which runs to `0x08C760`. A changed limit
moves nothing; a capacity of one stops the append after one record; records already written move the
scan's answer by eight bytes each. The library's `gspm.log_area` follows the edited start too. The limit
and capacity controls exercise the model as transcribed, which reads no limit by construction; the
evidence that the firmware reads none is the seek census and the call list after the two reads.

## Not checked

Whether a unit has been logging (a read of `0x1E0000` would say); what `0x88` is; whether anything in
either Logitech client reads or erases this log; why the migration `0x18408` is in the application with no
caller, since only build 4.4 of the 880 and 885 exists here; the Harmony 720's build; whether the 880 and
885 implement opcodes `0x65` and `0x66`; the part's data memory size, and whether an indirect write can
reach `PCL`.

## Reviewers

**The blind re-measurement** was given the questions and the corpus and none of this header. It agreed on
the path and its three operands, the band's bounds, base slot 2's two reads and the unread limit, the floor
as the only check, the record format, exhaustion, the sixteen declarations and the two emitters with their
callers and bindings, the EEPROM census, the uncalled migration, and the seven message numbers. Its
"seven call sites" of the flash entries are this header's nine without the sleep slot's two. It added the
two observations above, the scan not looking past the first erased record and the framing on the absolute
address, and independently placed the four flash texts at the built in configuration's mode pages 5 to 8
through its pointer array at `0x01E925`, which corroborates the layout reading.

**The prose audit** found the call site count wrong (eight for nine), a sentence in the reference calling
`0x1FE000` and up "no flash" against its own page's "not checked", the population written as sixteen
configurations where it is six lineages and both emitters an 880's, the same list in a Harmony 525
configuration and the band in the Harmony One configurations (now asserted), the Harmony 720's build not
being this one, stale summaries in `wiring.ts`, `gspm.py`, `test_host_client.py` and `actions.md`, test
titles naming more than their bodies ("and nothing else", "by two readers"), the band's opcode test and
ceiling unasserted, and the limit control being the model's tautology. Each was corrected; the seek census
was added as the firmware's own evidence for the limit.
"""
import collections
import re
import unittest

import lab
from harmony import ezfile, gspm
from harmony.pic18 import chains, isa
from test_harmony_885_erase_and_write import ram_window
from test_harmony_885_start_check import (BASE, CALIBRATION, CODE_END, USER_BASE, Flash, application, by_name,
                                          listing, text, transfers_to, window)

BAND_TEST = 0x1384A
BAND_CHAIN = 0x13854
CLOSE_CASE, BYTE_CASE, WORD_CASE = 0x13862, 0x13868, 0x1386E
LOG_START = 0x19FEE
SCAN = 0x1A016
APPEND = 0x1A070
CLOSE = 0x1A0D4
PROGRAM_BYTE = 0x19036
PROGRAM_BYTE_WRAPPER = 0x1A2AE
READ_U16 = 0x190A0
READ_U24 = 0x19062
SLOT_SEEKER = 0x191DE
CURSOR_READ = 0x1A29C
MIGRATION = 0x18408
MESSAGE = 0x16A18
MESSAGE_FALLBACK = 0x169F4
COPIER = 0x19D28

# The two containers that emit the append, the list that does it, and who calls that list.
APPENDING = {'Update.EZHex': 501, 'H880-Spare-4.EZHex': 588}
APPENDING_LIST = [(0x0F, 0xFFE0), (0x7A, 0x0002), (0x0F, 0xFFE2), (0x7A, 0x0000), (0x0F, 0xFFE2),
                  (0x1F, 0xFB00), (0x0F, 0xFFE1), (0x0F, 0xFFE0)]
CALLERS = {'Update.EZHex': [766, 923, 1171, 1236],
           'H880-Spare-4.EZHex': [883, 945, 946, 1087, 1171, 1356, 1368, 1396, 1563, 1669]}
BOUND = {'Update.EZHex': [1171, 1236], 'H880-Spare-4.EZHex': [1356, 1368, 1396, 1563, 1669]}
DECLARED = (15360, 0x1E0000, 0x1FE000)

BUILT_IN = (0x01E000, 0x01FB89)
FLASH_TEXTS = {b'FLASH Memory ID': 0x01E17A, b'FLASH Memory Erase': 0x01E1A8,
               b'FLASH Memory Write': 0x01E1D9, b'FLASH Memory Clear': 0x01E20A}
BOOTLOADER_END = {'arch8_boot_880': 0x0639C, 'arch8_boot_885': 0x063B2}


def payloads():
    return {name: ezfile.parse_ezhex(blob, name).payload for name, blob in zip(CALIBRATION, by_name(*CALIBRATION))}


def operand(code, address):
    """The literal of the one instruction at `address`."""
    return isa.decode(code, address - BASE, BASE).fields['k']


def reads_until_return(code, start):
    """How many times a routine calls the cursor read before it leaves, by `RETURN` or by a tail `GOTO`.

    The two byte read ends in `GOTO 0x1919E`, the cursor's advance, and the three byte read in `RETURN`.
    """
    count = 0
    for _, ins in listing(code, start, start + 0x40):
        if ins.mnemonic in ('RETURN', 'GOTO'):
            return count
        count += text(ins) == 'CALL 0x%05x' % CURSOR_READ
    raise AssertionError('no RETURN or GOTO within 0x40 bytes of 0x%05X' % start)


class LogAsRead:
    """The start routine, the append and the close, run over a sparse flash.

    The numbers that decide where the remote writes come out of the code: the slot the start routine
    seeks, the pointer table's offset and stride in the seeker, how many bytes each of the two reads
    takes, the record size the scan counts in and the mask the close tests. The control flow is the
    reading above, transcribed; the windows asserted in the tests below are what it transcribes.
    """

    def __init__(self, code):
        self.slot = operand(code, LOG_START + 0x0E)            # MOVLW 0x02 before the seek
        self.entry_size = operand(code, SLOT_SEEKER)           # MOVLW 0x04
        self.table = operand(code, SLOT_SEEKER + 0x0A)         # MOVLW 0x0b
        self.count_width = reads_until_return(code, READ_U16)
        self.start_width = reads_until_return(code, READ_U24)
        self.record = operand(code, SCAN + 0x1A)               # MOVLW 0x08
        self.mask = operand(code, CLOSE)                       # MOVLW 0x07

    def start(self, flash, base=USER_BASE):
        """The next address and the records left, as `0x19FEE` leaves them."""
        cursor = base + self.table + self.entry_size * self.slot + 1    # past the spare byte
        cursor = sum(flash.get(cursor + i, 0xFF) << (8 * i) for i in range(3))
        left = sum(flash.get(cursor + i, 0xFF) << (8 * i) for i in range(self.count_width))
        cursor += self.count_width
        cursor = sum(flash.get(cursor + i, 0xFF) << (8 * i) for i in range(self.start_width))
        while left:
            if all(flash.get(cursor + i, 0xFF) == 0xFF for i in range(self.record)):
                break
            cursor += self.record
            left -= 1
        self.address, self.left = cursor, left
        return cursor, left

    def append(self, flash, byte):
        if not self.left:
            return
        flash[self.address] = byte
        self.address += 1
        if self.address & self.mask == self.mask:
            self.close(flash)

    def close(self, flash):
        used = self.address & self.mask
        if not used:
            return
        self.left -= 1
        self.address |= self.mask
        flash[self.address] = used
        self.address += 1


class TheInstructionThatAppends(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_opcode_0x0F_takes_the_band_0xE0_to_0xEF_and_switches_on_the_low_nibble(self):
        # The opcode at or above 0x0F, the low byte below 0xF0, then at or above 0xE0.
        self.assertEqual(window(self.code, 0x1383C, 6),
                         ['MOVLW 0x0f', 'SUBWF 0xb4,W', 'BNC 0x1390c', 'MOVLW 0xf0', 'SUBWF 0xb2,W', 'BNC 0x1384a'])
        self.assertEqual(window(self.code, BAND_TEST, 5),
                         ['MOVLW 0xe0', 'SUBWF 0xb2,W', 'BNC 0x13888', 'MOVLW 0x0f', 'ANDWF 0xb2,W'])
        self.assertEqual(chains.chain_table(self.code, BASE, BAND_CHAIN),
                         {0x00: CLOSE_CASE, 0x01: BYTE_CASE, 0x02: WORD_CASE})
        # Any other nibble, 0xE3 to 0xEF, falls to the interpreter's exit.
        self.assertEqual(window(self.code, 0x13860, 1), ['BRA 0x139b2'])

    def test_0xE0_closes_0xE1_appends_one_byte_and_0xE2_two(self):
        self.assertEqual(window(self.code, CLOSE_CASE, 1), ['CALL 0x1a0d4'])
        self.assertEqual(window(self.code, BYTE_CASE, 2), ['MOVFF 0x30a,0x292', 'BRA 0x13882'])
        self.assertEqual(window(self.code, WORD_CASE, 6),
                         ['MOVFF 0x30b,0x2d4', 'MOVFF 0x30c,0x2d5', 'MOVFF 0x2d4,0x292', 'CALL 0x1a070',
                          'MOVFF 0x2d5,0x292', 'CALL 0x1a070'])

    def test_the_append_and_the_close_are_reached_from_the_band_alone(self):
        self.assertEqual(transfers_to(self.code, APPEND), [0x1387A, 0x13882])
        # The close's second caller is the append itself, at a record's eighth byte.
        self.assertEqual(transfers_to(self.code, CLOSE), [CLOSE_CASE, 0x1A0D0])


class TheLogIsSetUpAtStartFromBaseSlot2(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_main_calls_it_once_after_the_battery_test_and_before_the_unlock_is_cleared(self):
        self.assertEqual(transfers_to(self.code, LOG_START), [0x16E4A])
        self.assertEqual(window(self.code, 0x16E42, 3), ['CALL 0x10dce', 'CALL 0x195f8', 'CALL 0x19fee'])
        self.assertEqual(window(self.code, 0x16E4E, 1), ['CALL 0x19b56'])

    def test_it_returns_with_no_records_unless_bit_2_of_0x086_is_set(self):
        self.assertEqual(window(self.code, LOG_START, 6),
                         ['MOVLB 0x2', 'CLRF 0x90', 'CLRF 0x91', 'MOVLB 0x0', 'BTFSS 0x86,2', 'BRA 0x1a06e'])
        self.assertEqual(window(self.code, 0x1A06E, 1), ['RETURN'])

    def test_it_seeks_slot_2_and_reads_a_two_byte_count_and_a_three_byte_start(self):
        self.assertEqual(window(self.code, LOG_START + 0x0C, 11),
                         ['MOVLB 0x0', 'MOVLW 0x02', 'MOVWF 0xd3', 'CALL 0x191de', 'MOVLB 0x0', 'MOVLW 0x90',
                          'MOVWF 0xcb', 'MOVLW 0x02', 'MOVWF 0xcc', 'CALL 0x190a0', 'CALL 0x19062'])
        self.assertEqual((reads_until_return(self.code, READ_U16), reads_until_return(self.code, READ_U24)), (2, 3))
        # The count goes where 0x0CB and 0x0CC point, 0x290; the start becomes the cursor itself.
        self.assertEqual(window(self.code, READ_U16 + 0x0A, 3),
                         ['MOVFF 0x0cb,0xfe9', 'MOVFF 0x0cc,0xfea', 'MOVFF 0x2dc,0xfef'])
        self.assertEqual(window(self.code, READ_U24 + 0x1E, 4),
                         ['MOVFF 0x2dc,0x080', 'MOVFF 0x2dd,0x081', 'MOVFF 0x2de,0x082', 'RETURN'])
        # The seek reads the entry's spare byte and then the three byte pointer through the same routine.
        self.assertEqual(window(self.code, SLOT_SEEKER + 0x14, 2), ['RCALL 0x1908e', 'GOTO 0x19062'])

    def test_slot_2_is_sought_once_in_the_whole_application(self):
        """Of the 22 calls of the seeker, each after a literal slot number, one passes 2: the log's set up.
        So no other routine reads base slot 2, its limit included."""
        slots = collections.Counter()
        for at in transfers_to(self.code, SLOT_SEEKER):
            before = window(self.code, at - 4, 2)
            self.assertEqual(before[1], 'MOVWF 0xd3', hex(at))
            slots[int(before[0].split()[-1], 16)] += 1
        self.assertEqual(sum(slots.values()), 22)
        self.assertEqual(slots[2], 1)
        self.assertEqual([at for at in transfers_to(self.code, SLOT_SEEKER)
                          if window(self.code, at - 4, 1) == ['MOVLW 0x02']], [0x1A000])

    def test_the_limit_is_never_read_because_nothing_but_the_scan_reads_after_the_start(self):
        # Every call between the two reads and the RETURN: the cursor save and restore and the byte read
        # of the scan. Nothing reads the section again, so its bytes from +5 are never reached.
        calls = [text(ins) for _, ins in listing(self.code, LOG_START + 0x28, APPEND)
                 if ins.mnemonic in ('CALL', 'RCALL', 'GOTO')]
        self.assertEqual(calls, ['CALL 0x19324', 'CALL 0x1908e', 'CALL 0x19332'])

    def test_the_scan_counts_eight_byte_records_until_one_reads_all_0xFF(self):
        self.assertEqual(window(self.code, SCAN, 38),
                         ['MOVLB 0x2', 'MOVLW 0x00', 'BSF 0xfd8,0', 'SUBFWB 0x90,W', 'MOVLW 0x00', 'SUBFWB 0x91,W',
                          'BC 0x1a062', 'MOVLB 0x2', 'MOVLW 0x01', 'MOVWF 0xb2', 'CALL 0x19324', 'MOVLB 0x2',
                          'MOVLW 0x08', 'MOVWF 0xb3', 'MOVF 0xb3,W', 'SUBLW 0x00', 'BC 0x1a04e', 'CALL 0x1908e',
                          'MOVLB 0x2', 'MOVWF 0xb4', 'MOVLW 0xff', 'SUBWF 0xb4,W', 'BZ 0x1a04a', 'CLRF 0xb2',
                          'DECF 0xb3', 'BRA 0x1a034', 'MOVF 0xb2,W', 'BZ 0x1a058', 'CALL 0x19332', 'BRA 0x1a062',
                          'MOVLB 0x2', 'DECF 0x90', 'MOVLW 0x00', 'SUBWFB 0x91', 'BRA 0x1a016',
                          'MOVFF 0x080,0x28d', 'MOVFF 0x081,0x28e', 'MOVFF 0x082,0x28f'])


class TheAppendAndTheClose(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_the_append_returns_when_no_record_is_left(self):
        self.assertEqual(window(self.code, APPEND, 7),
                         ['MOVLB 0x2', 'MOVLW 0x00', 'BSF 0xfd8,0', 'SUBFWB 0x90,W', 'MOVLW 0x00', 'SUBFWB 0x91,W',
                          'BC 0x1a0d2'])
        self.assertEqual(window(self.code, 0x1A0D2, 1), ['RETURN'])

    def test_it_programs_the_byte_at_the_next_address_and_closes_at_a_records_eighth_byte(self):
        self.assertEqual(window(self.code, 0x1A0A6, 17),
                         ['CALL 0x19d28', 'MOVFF 0x28d,0x080', 'MOVFF 0x28e,0x081', 'MOVFF 0x28f,0x082',
                          'MOVFF 0x292,0x0c7', 'CALL 0x19036', 'MOVLB 0x2', 'INCF 0x8d', 'MOVLW 0x00', 'ADDWFC 0x8e',
                          'ADDWFC 0x8f', 'MOVLW 0x07', 'ANDWF 0x8d,W', 'SUBLW 0x07', 'BNZ 0x1a0d2', 'RCALL 0x1a0d4',
                          'RETURN'])

    def test_the_close_programs_the_count_of_data_bytes_into_the_records_last_byte(self):
        self.assertEqual(window(self.code, CLOSE, 13),
                         ['MOVLW 0x07', 'MOVLB 0x2', 'ANDWF 0x8d,W', 'MOVLB 0x2', 'MOVWF 0xb3', 'MOVF 0xb3,W',
                          'BZ 0x1a138', 'MOVLB 0x2', 'DECF 0x90', 'MOVLW 0x00', 'SUBWFB 0x91', 'MOVLW 0x07',
                          'IORWF 0x8d'])
        self.assertEqual(window(self.code, 0x1A116, 10),
                         ['CALL 0x19d28', 'MOVFF 0x28d,0x080', 'MOVFF 0x28e,0x081', 'MOVFF 0x28f,0x082',
                          'MOVFF 0x2b3,0x0c7', 'CALL 0x19036', 'MOVLB 0x2', 'INCF 0x8d', 'MOVLW 0x00', 'ADDWFC 0x8e'])
        self.assertEqual(window(self.code, 0x1A138, 1), ['RETURN'])

    def test_the_byte_meets_the_one_byte_program_and_its_floor(self):
        self.assertEqual(window(self.code, PROGRAM_BYTE, 2), ['MOVFF 0x0c7,0x1fc', 'CALL 0x1a2ae'])
        self.assertEqual(window(self.code, PROGRAM_BYTE_WRAPPER, 6),
                         ['CALL 0x1a710', 'MOVFF 0x080,0x233', 'MOVFF 0x081,0x234', 'MOVFF 0x082,0x235',
                          'MOVFF 0x1fc,0x236', 'CALL 0x1ffe56'])
        # The RAM entry branches to the program, whose first act is the inner check: the floor at
        # 0x010000, tests/test_harmony_885_erase_and_write.py.
        self.assertEqual(ram_window(self.code, 0x1FFE56, 1), ['BRA 0x1fff3a'])
        self.assertEqual(ram_window(self.code, 0x1FFF3A, 1), ['RCALL 0x1fffc0'])
        # And the log's own routines, set up, scan, append and close, never name the unlock byte, data
        # 0x23A, banked (0x3a) or whole, nor load 0xA7. The wrappers and the copier are outside the scan.
        path = [text(ins) for _, ins in listing(self.code, LOG_START, 0x1A13A)]
        named = [t for t in path if {'0x3a', '0x23a'} & set(re.split('[ ,]', t)[1:]) or t == 'MOVLW 0xa7']
        self.assertEqual(named, [])


class EveryFlashWriteInTheApplication(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_the_ram_flash_routines_are_called_from_nine_places(self):
        calls = collections.defaultdict(list)
        for a, ins in listing(self.code, BASE, CODE_END):
            target = ins.fields.get('target')
            if target is not None and 0x1FFE00 <= target < 0x200000:
                calls[target].append(a)
        self.assertEqual(dict(calls), {0x1FFE02: [0x18136, 0x181A2], 0x1FFE52: [0x1A30A],
                                       0x1FFE54: [0x1A23C, 0x1A24E], 0x1FFE56: [0x183E8, 0x184B6, 0x1A2C2],
                                       0x1FFE58: [0x1A2EC]})

    def test_the_one_byte_program_is_reached_by_the_log_the_hardware_log_and_a_routine_nothing_calls(self):
        self.assertEqual(transfers_to(self.code, PROGRAM_BYTE_WRAPPER), [0x1903A])
        self.assertEqual(transfers_to(self.code, PROGRAM_BYTE), [0x1A0BA, 0x1A12A])
        # 0x183E8 sits in the hardware version log append 0x1836E, 0x184B6 in the migration.
        self.assertEqual([a for a in (0x183E8, 0x184B6) if 0x1836E <= a < MIGRATION], [0x183E8])
        self.assertEqual(transfers_to(self.code, MIGRATION), [])

    def test_116_table_writes_of_which_7_are_the_ram_routines_source(self):
        writes = [a for a, ins in listing(self.code, BASE, CODE_END) if ins.mnemonic.startswith('TBLWT')]
        self.assertEqual(len(writes), 116)
        self.assertEqual(len([a for a in writes if 0x0199C2 <= a <= 0x019B50]), 7)


class NothingElsePersists(unittest.TestCase):
    def test_the_only_write_to_the_eeprom_registers_is_one_zero_in_the_port_set_up_of_each_program(self):
        """
        A data EEPROM write on a PIC18 takes `0x55` and then `0xAA` written to `EECON2`, `0xFA7`, and a write
        bit set in `EECON1`, `0xFA6`. Every instruction that writes `0xFA6` to `0xFA9`, by an access bank
        operand or as a `MOVFF` destination, is counted, and each program has exactly one: a zero to
        `0xFA7`, since `WREG` was cleared two instructions before. So neither the sequence nor the write bit
        occurs anywhere.
        """
        programs = {'arch8_code_885': (BASE, CODE_END, 0x1A1EA),
                    'arch8_boot_880': (0, BOOTLOADER_END['arch8_boot_880'], 0x05DE4),
                    'arch8_boot_885': (0, BOOTLOADER_END['arch8_boot_885'], 0x05DF2)}
        lab.require(*programs)
        for name, (base, end, at) in programs.items():
            with self.subTest(name):
                code = lab.load(name)
                writes = []
                for a, ins in listing(code, base, end, base):
                    f = ins.fields
                    if ins.mnemonic == 'MOVFF' and 0xFA6 <= f.get('dst', 0) <= 0xFA9:
                        writes.append(a)
                    elif f.get('a') == 0 and 'f' in f and f['f'] >= 0x60 and 0xFA6 <= 0xF00 + f['f'] <= 0xFA9:
                        writes.append(a)
                self.assertEqual(writes, [at])
                self.assertEqual(window(code, at - 6, 4, base),
                                 ['CLRF 0xfe8', 'BSF 0xfb0,1', 'BSF 0xfb0,0', 'MOVWF 0xfa7'])


class WhatSelector7Reaches(unittest.TestCase):
    def test_the_copier_skips_a_slot_whose_flag_already_names_the_set(self):
        code = application()
        # FSR0 = 0x212 + slot, then the flag against the set being asked for, and a branch past the copy.
        self.assertEqual(window(code, 0x19D32, 9),
                         ['MOVF 0x14,W', 'CLRF 0xfea', 'ADDLW 0x12', 'MOVWF 0xfe9', 'MOVLW 0x02', 'ADDWFC 0xfea',
                          'MOVF 0xfef,W', 'SUBWF 0x15,W', 'BZ 0x19d8c'])
        # The log's append loads set 2 into slot 1 before every byte, like the erase and the write.
        self.assertEqual(window(code, 0x1A09A, 6),
                         ['MOVLB 0x2', 'MOVLW 0x02', 'MOVWF 0x15', 'MOVLB 0x2', 'MOVLW 0x01', 'MOVWF 0x14'])


class TheFlashMessagesNobodyAsksFor(unittest.TestCase):
    def test_the_four_texts_sit_in_the_built_in_configuration_and_in_no_bootloader(self):
        lab.require('arch8_code_885', 'arch8_code_880', *BOOTLOADER_END)
        for name in ('arch8_code_885', 'arch8_code_880'):
            code = lab.load(name)
            for string, at in FLASH_TEXTS.items():
                with self.subTest(name=name, text=string):
                    self.assertEqual(code.count(string), 1)
                    self.assertEqual(BASE + code.find(string), at)
                    self.assertTrue(BUILT_IN[0] <= at < BUILT_IN[1])
            self.assertEqual(code[:BUILT_IN[0] - BASE].count(b'FLASH Memory'), 0)
        for name in BOOTLOADER_END:
            code = lab.load(name)
            for word in (b'FLASH Memory', b'Erase', b'Clear', b'Write'):
                self.assertEqual(code.count(word), 0, (name, word))

    def test_the_message_routine_is_asked_for_seven_numbers_and_none_is_5_to_8(self):
        code = application()
        asked = {}
        for at in transfers_to(code, MESSAGE):
            # The number goes to data 0x1F4: a literal moved there, or the register cleared. The bank
            # selects between are dropped.
            before = [t for t in window(code, at - 10, 5) if not t.startswith('MOVLB')][-3:]
            if before[0].startswith('MOVLW ') and before[1:] == ['MOVWF 0xf4', 'CLRF 0xf5']:
                asked[at] = int(before[0].split()[-1], 16)
            elif before[1:] == ['CLRF 0xf4', 'CLRF 0xf5']:
                asked[at] = 0
            else:
                asked[at] = before     # unresolved, so the comparison below fails and shows it
        self.assertEqual(asked, {0x10E14: 0x16, 0x16E0C: 0x1B, 0x16E1C: 0x0A, 0x16E30: 0x09, 0x17016: 0x19,
                                 0x17260: 0x1A, 0x1726C: 0x00})
        self.assertEqual(transfers_to(code, MESSAGE_FALLBACK), [0x15958, 0x16A6C])
        self.assertEqual(window(code, 0x15954, 2), ['MOVLW 0x02', 'MOVWF 0xf2'])
        self.assertEqual(window(code, 0x16A68, 1), ['MOVFF 0x1f4,0x1f2'])
        self.assertEqual(set(asked.values()) & {5, 6, 7, 8}, set())

    def test_each_bootloader_shows_error_2_and_nothing_reaches_its_other_caller(self):
        builds = {'arch8_boot_885': (0x05326, 0x03CDC, 0x0534A, [0x03CE4, 0x05352]),
                  'arch8_boot_880': (0x05318, 0x03CD0, 0x0533C, [0x03CD8, 0x05344])}
        lab.require(*builds)
        for name, (display, literal, other, callers) in builds.items():
            with self.subTest(name):
                boot, end = lab.load(name), BOOTLOADER_END[name]
                self.assertEqual(transfers_to(boot, display, end=end, base=0), callers)
                self.assertEqual(window(boot, literal, 5, base=0),
                                 ['CLRF 0x2b', 'MOVLB 0x1', 'MOVLW 0x02', 'MOVWF 0x2a', 'CALL 0x%05x' % display])
                self.assertEqual(window(boot, other, 4, base=0),
                                 ['MOVLB 0x1', 'CLRF 0x2b', 'MOVFF 0x12c,0x12a', 'RCALL 0x%05x' % display])
                self.assertEqual(transfers_to(boot, other, end=end, base=0), [])


class TheCorpusAndWhereTheAppendWrites(unittest.TestCase):
    def setUp(self):
        self.code = application()
        self.payloads = payloads()
        self.log = LogAsRead(self.code)

    def test_the_model_takes_slot_2_a_two_byte_count_a_three_byte_start_and_eight_byte_records(self):
        log = self.log
        self.assertEqual((log.slot, log.entry_size, log.table, log.count_width, log.start_width, log.record, log.mask),
                         (2, 4, 0x0B, 2, 3, 8, 7))

    def test_all_sixteen_declare_15360_records_from_0x1E0000_to_0x1FE000(self):
        """Count and start by two readers, the library and the model; the limit by the library alone, tied to
        the other two by the stride."""
        self.assertEqual(len(self.payloads), 16)
        for name, payload in self.payloads.items():
            with self.subTest(name):
                area = gspm.parse(payload).log_area()
                self.assertEqual((area.capacity, area.start, area.limit), DECLARED)
                self.assertEqual(area.start + 8 * area.capacity, area.limit)
                self.assertEqual(self.log.start(Flash().place(USER_BASE, payload)), (0x1E0000, 15360))

    def test_two_emit_the_append_each_in_one_list_of_eight_and_none_uses_0xE3_to_0xEF(self):
        found = {}
        for name, payload in self.payloads.items():
            lists = gspm.parse(payload).action_lists()
            band = collections.Counter(i.operand for l in lists for i in l
                                       if i.opcode == 0x0F and 0xE0 <= i.operand & 0xFF <= 0xEF)
            holding = [n for n, l in enumerate(lists) if any(i.opcode == 0x0F and 0xE0 <= i.operand & 0xFF <= 0xEF
                                                            for i in l)]
            if band:
                found[name] = (dict(band), holding, [(i.opcode, i.operand) for i in lists[holding[0]]])
        self.assertEqual(found, {name: ({0xFFE0: 2, 0xFFE2: 2, 0xFFE1: 1}, [index], APPENDING_LIST)
                                 for name, index in APPENDING.items()})

    def test_over_the_whole_corpus_the_band_appears_in_one_harmony_525_and_the_harmony_ones_too(self):
        """`lab.ALL_CONTAINERS`, every architecture: the identical list in a Harmony 525 configuration, and
        `0xE1` and `0xE3` in the Harmony One configurations, where the band's meaning is not read here."""
        lab.require(*lab.ALL_CONTAINERS)
        found = {}
        for name in lab.ALL_CONTAINERS:
            lists = gspm.parse(lab.load(name)).action_lists() or []
            band = collections.Counter(i.operand for l in lists for i in l
                                       if i.opcode == 0x0F and 0xE0 <= i.operand & 0xFF <= 0xEF)
            if band:
                found[name] = dict(band)
        self.assertEqual(found, {'h525_config_2': {0xFFE0: 2, 0xFFE2: 2, 0xFFE1: 1},
                                 'arch8_config_a': {0xFFE0: 2, 0xFFE2: 2, 0xFFE1: 1},
                                 'one_config': {0xFFE3: 2, 0xFFE1: 2},
                                 'one_config_unprogrammed': {0xFFE3: 4, 0xFFE1: 4},
                                 'one_spare_before_sync': {0xFFE3: 4, 0xFFE1: 4},
                                 'one_spare_after_sync': {0xFFE3: 4, 0xFFE1: 4}})
        lists = gspm.parse(lab.load('h525_config_2')).action_lists()
        self.assertEqual([(i.opcode, i.operand) for i in lists[162]], APPENDING_LIST)

    def test_the_appending_list_is_called_from_lists_some_of_them_bound_to_key_code_0x88(self):
        for name, index in APPENDING.items():
            with self.subTest(name):
                container = gspm.parse(self.payloads[name])
                lists = container.action_lists()
                callers = [n for n, l in enumerate(lists) if any(i.opcode == 0x7F and i.operand == index for i in l)]
                self.assertEqual(callers, CALLERS[name])
                for n in callers:
                    self.assertEqual([i.opcode for i in lists[n]][1:], [0x7F, 0x7E])
                    self.assertIn(lists[n][0].opcode, (0x92, 0x93))
                    self.assertEqual(lists[n][0].operand, 3)
                bound = sorted((b.tag, b.operand) for rec in container.binding_records() or [] for b in rec
                               if b.opcode == 0x7F and b.operand in callers)
                self.assertEqual(bound, [(0x88, n) for n in BOUND[name]])

    def test_the_list_writes_one_record_of_five_data_bytes_and_its_count(self):
        flash = Flash()
        self.log.start(flash.place(USER_BASE, self.payloads['Update.EZHex']))
        # The values stand in for whatever 0x7A and 0x1F:FB00 load, which is not read here.
        for opcode, value in APPENDING_LIST:
            if opcode != 0x0F:
                continue
            low = value & 0xFF
            if low == 0xE0:
                self.log.close(flash)
            elif low == 0xE1:
                self.log.append(flash, 0x31)
            elif low == 0xE2:
                self.log.append(flash, 0x21)
                self.log.append(flash, 0x22)
        record = [flash.get(0x1E0000 + i, 0xFF) for i in range(8)]
        self.assertEqual(record, [0x21, 0x22, 0x21, 0x22, 0x31, 0xFF, 0xFF, 0x05])
        self.assertEqual((self.log.address, self.log.left), (0x1E0008, 15359))

    def test_seven_bytes_close_a_record_by_themselves(self):
        flash = Flash()
        self.log.start(flash.place(USER_BASE, self.payloads['H880-Spare-4.EZHex']))
        for b in range(7):
            self.log.append(flash, b)
        self.assertEqual([flash.get(0x1E0000 + i) for i in range(8)], [0, 1, 2, 3, 4, 5, 6, 7])
        self.assertEqual(self.log.address, 0x1E0008)


class TheControl(unittest.TestCase):
    """Base slot 2 moved in a copy, and the address the append writes at follows it."""

    def setUp(self):
        self.code = application()
        self.log = LogAsRead(self.code)
        self.payload = payloads()['Update.EZHex']
        pointer = 0x0B + 4 * 2
        self.section = int.from_bytes(self.payload[pointer + 1:pointer + 4], 'little') - USER_BASE

    def edited(self, offset, width, value):
        copy = bytearray(self.payload)
        copy[self.section + offset:self.section + offset + width] = value.to_bytes(width, 'little')
        return bytes(copy)

    def flash(self, payload):
        """The application and a configuration in place, erased everywhere else."""
        return Flash().place(BASE, self.code).place(USER_BASE, payload)

    def test_a_moved_start_in_erased_flash_moves_the_append_there(self):
        for start in (0x1C0000, 0x1D0000, 0x1FE000):
            with self.subTest(start=hex(start)):
                flash = self.flash(self.edited(2, 3, start))
                self.assertEqual(self.log.start(flash), (start, 15360))
                self.assertEqual(gspm.parse(self.edited(2, 3, start)).log_area().start, start)
                self.log.append(flash, 0x5A)
                self.assertEqual(flash[start], 0x5A)

    def test_a_start_on_the_application_or_the_configuration_writes_into_their_first_erased_record(self):
        """
        The scan steps over every record that is not all `0xFF`, so a start aimed at programmed flash
        writes into the first erased eight bytes at or after it, within the declared count: inside the
        application's own padding, or inside the configuration. The exact addresses are what this
        application image and this container hold, which is why they are asserted.
        """
        landed = {}
        for start in (BASE, USER_BASE):
            flash = self.flash(self.edited(2, 3, start))
            address, left = self.log.start(flash)
            self.assertEqual(15360 - left, (address - start) // 8)
            self.assertTrue(all(flash.get(address + i, 0xFF) == 0xFF for i in range(8)))
            landed[start] = address
        # 0x0103F8 is the last eight bytes before the application's code at 0x010400; 0x038CD8 is inside
        # this container, which runs to 0x08C760, so the append would overwrite part of the configuration.
        self.assertEqual(landed, {BASE: 0x0103F8, USER_BASE: 0x038CD8})
        self.assertLess(landed[USER_BASE], USER_BASE + len(self.payload))

    def test_a_changed_limit_moves_nothing(self):
        """A check of the model, which reads no limit by construction; the firmware's evidence is
        `test_slot_2_is_sought_once_in_the_whole_application` and the call list after the two reads."""
        flash = Flash().place(USER_BASE, self.edited(5, 3, 0x1E0008))
        self.assertEqual(self.log.start(flash), (0x1E0000, 15360))

    def test_a_capacity_of_one_stops_the_append_after_one_record(self):
        flash = Flash().place(USER_BASE, self.edited(0, 2, 1))
        self.log.start(flash)
        for b in range(9):
            self.log.append(flash, b)
        self.assertEqual([flash.get(0x1E0000 + i, 0xFF) for i in range(9)], [0, 1, 2, 3, 4, 5, 6, 7, 0xFF])
        self.assertEqual(self.log.left, 0)

    def test_nothing_past_the_first_erased_record_is_looked_at(self):
        flash = Flash().place(USER_BASE, self.payload)
        flash.place(0x1E0008, bytes([1, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 1]))
        self.assertEqual(self.log.start(flash), (0x1E0000, 15360))

    def test_a_start_off_a_multiple_of_eight_frames_records_on_the_absolute_address(self):
        flash = Flash().place(USER_BASE, self.edited(2, 3, 0x1C0004))
        self.log.start(flash)
        for b in (0x11, 0x22, 0x33):
            self.log.append(flash, b)
        # Three data bytes, and the count byte at 0x1C0007 says seven.
        self.assertEqual([flash.get(0x1C0004 + i, 0xFF) for i in range(4)], [0x11, 0x22, 0x33, 7])
        self.assertEqual(self.log.address, 0x1C0008)

    def test_records_already_written_move_the_scan_eight_bytes_each(self):
        flash = Flash().place(USER_BASE, self.payload)
        flash.place(0x1E0000, bytes([2, 0, 0, 0, 0, 0xFF, 0xFF, 5]) * 3)
        self.assertEqual(self.log.start(flash), (0x1E0018, 15357))


if __name__ == '__main__':
    unittest.main()
