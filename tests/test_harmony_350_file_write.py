#!/usr/bin/env python3
"""What the Harmony 300 and 350 firmware does with each step of a file write, read in its 1.4 image.

`todo-compile-350.md` 1.3. Logitech's client writes a configuration to this family in seven commands,
recorded from its own templates in the lab note `work/350-write-route/client.md`: the file system reset
`0xFF 0x66`, open `W` with a size, write in chunks, device control `0x06` subcommand `0x01` (the check),
flush `0x05` only when the check answered `m`, close, and the reboot `0xFF 0x00` only when the package
asks. This file is the other half: what the remote's firmware does with each, so a writer of ours can be
built on the firmware's behaviour and not on the client's comments. One image, 1.4, which the package's
manifest names for skins 78, 79 and 104, so every claim covers the Harmony 300 and the Harmony 350 as
that build and no other; other builds are not checked.

**Sources checked first.** The client, through the lab note above and
`reference/usb-protocol/file-protocol.md`. The archive: sections 196 and 199 (the image and its file
table), 259 (the section seeker and the validator at `0x14AE8`), 41 (the trailer checksum), and 354 and
282 on the Harmony 600, 650 and 700, which hold the same verdict byte and the same setting `0x80` gate
this image turned out to have. The library: `src/harmony/gspm.py` for the checksum. Nothing in the
archive or the reference had read any handler of the file protocol on this image before, beyond the
`0xFE` terminator section 199 met at `0x12A42`.

## The shape of the code

One parser at `0xCB88` reads every request out of the USB stream into a struct at `0xD00` (byte 0 the
command, byte 1 the service `0xFF`, then the sequence, the parameter count and the parameters) and sets
a state byte `0x330`; `0x0F` means a reply is due. A dispatcher at `0xE2F0` runs from the main loop: in
state `0x0F` it builds the reply for the command at `0x331` and `0x332`, and in state 0 after an open it
does the open's slow work one step per pass. The open file is a struct at `0xF00`: `0xF00` the row of the
file table (`0xFF` when nothing is open), `0xF01` the file id, `0xF02` the medium letter, `0xF03` the size
and `0xF06` the place on the medium, the last two three bytes each. The **handle** the open answers with
is that row number, which is why the check below can dispatch on it.

## The file system reset, `0xFF 0x66`, closes the open file and nothing else

* The parser's `0xFF` case reads its one byte parameter into `0xD0F` and switches on it at `0xCD6A`:
  `0x66` goes to `0xCDB2`, which copies the byte into `0x333`, clears `0x334` and returns. `0x62`, `0x6E`
  and `0x00` go to `0xCD9C`, the reboot below; `0x73` stores a request of `0x0F` and then reboots the same
  way; `0x75`, the chain's last literal, clears the state byte so no reply is sent.
* The reply for service and command `0xFF 0xFF` is built at `0xE7CA`. It tests `0x333` for `0x66` and
  `0x334` for zero and, when both hold, calls `0x0F80A`, which is `GOTO 0x12CE6`. That routine is four
  instructions: set `0xF00` to `0xFF` and clear `0xF1D` and `0xF1E`. It calls nothing. The reply then
  carries no parameters, `0x2C5` cleared at `0xE7FA`, which is the zero the client's template checks at
  byte 3.
* **The same routine is the close command's**, called from `0xEA18`, and the open's lookup refuses every
  row while `0xF00` is not `0xFF` (`0x12E82`). So the reset is how a host clears a handle an interrupted
  earlier attempt left open, which is exactly what a client that reruns the whole operation once on
  failure needs.
* Negative results: no call on the `0x66` path, in the parse or the reply, is an erase, a flash write, the
  settings store or the verdict bit (the callees of the reply builders were not recursed into). Its only effects are the open file struct and the word at `0x333`, which other commands reuse for
  their own codes and which nothing compares with `0x66` outside `0xE7CA`. The word is not cleared after
  use, so a later `0xFF` with a parameter the switch does not know would close the open file again; the
  blind second reading of this path, made before the commit, noticed that. **A sequence that stops right
  after it leaves the remote exactly as it was**, configuration, verdict and log included.

## Open for writing erases at once

* The lookup at `0x12CF0` walks the 23 rows of the table at `0x0092A6`. Mode `R` needs bit 2 of a row's
  flags byte (`ANDLW 0x04` at `0x12E02`) and mode `W` bit 1 (`ANDLW 0x02` at `0x12E7A`). **Fourteen rows
  have bit 1**, the directory `/fw` and thirteen files, and among them are `/fw/bootloader` and `/fw/safemode` in internal program flash; the
  firmware refuses none of them for writing. Whether the processor's own write protection would stop an
  erase there is not checked. `/fw/normalmode`'s external copy is writable and not readable.
* For `W` the parser clamps the requested size to the row's size, and then **for row 5,
  `/cfg/usercfg`, replaces it**: `0xCEC4` adds the log's size, which `0x17CE0` sets to `0x020000`, to the
  row's `0x040000` and makes that the size, so the size the host sends is not used for this file. For the
  external medium the number of 64 KiB blocks is `((size - 1) >> 16) + 1` (`0xCF44`), six here. For row 5
  it also clears bit 2 of `0x68E` at `0xCF86`, the configuration's verdict, which every routine below
  tests before reading the configuration.
* The parser leaves the state byte at zero, so the dispatcher's state 0 branch at `0xE30C` erases one
  block per pass, at the file's place plus the block number times `0x10000` (`0xE418` to `0xE442`), with
  the SPI flash's 64 KiB block erase, opcode `0xD8` at `0x185FA`, and only after the last block sets the
  state to `0x0F` and answers. **So opening `/cfg/usercfg` for writing destroys the configuration before
  the open is answered**: six blocks from `0x020000`, `0x020000` to `0x07FFFF`. The log's place comes from
  the flash part's identity (`0x18056`): the top 128 KiB of a 512 KiB part, `0x060000`, which this range
  covers, and of a 1 or 2 MiB part, which it does not. Which part a unit has is not checked.
* A file kept in internal program flash, which is where `/fw/bootloader` and `/fw/safemode` are, takes the
  other branch: 1 KiB pages (`0xCF18`, `0xE364`) erased by `0x1AA40` with `EECON1` set to `0x14`, the
  processor's own row erase.

## The write goes where a running address points, unbounded

* A data packet is a sequence byte, a length byte whose low six bits are the length (`ANDLW 0x3F` at
  `0xCC0A`), and the bytes. For the external medium `0x15BF2` buffers them and programs them with the
  page program opcode `0x02` (`0x1869E`) at the address in `0xF06`, then stores the address after them
  back into `0xF06`. So the address starts at the file's place, `0x020000`, and advances by every packet.
* **Nothing compares it with the file's size**: no instruction in the data packet path at `0xCB88` or in
  `0x15BF2` reads `0xF03` to `0xF05`. The bound a writer needs is its own.
* The command counts its own packet: `0xF0B` starts at 1 (`0xD0F4`) and each data packet adds one, and
  the reply comes when it reaches the count byte. The reply's sequence byte is `0x80` ORed with the last
  data packet's sequence byte, and the done packet `0x7E` is parsed as a data packet of length zero, so
  its reply is `0xFE`. Both match what the client's template expects, which is the closure on this
  reading of the count.

## The check, `0x06` subcommand `0x01`, compares the stored checksum word

* The parser at `0xD110` reads the handle into `0xD4A`, the subcommand into `0xF10`, and for subcommand 1
  the type string into `0xD4B`, the seed into `0xD55` or `0xD56`, the offset into `0xD5A`, the length into
  `0xD5D` and the expected value into `0xD58`. **Only the handle and the expected value are used**: the
  routine `0xD682` switches on the handle (`0xD69C`) and compares the expected value, copied to `0xD9`
  and `0xDA` of bank 3, with what the file's own routine returns. No instruction in `0xD682`, in the
  file routines or in the reply reads the type, the seed, the offset or the length.
* Handle 5, `/cfg/usercfg`, goes to `0x14AC2`, which checks `GSPM` at the container's start and `LWJL` at
  `0x47`, reads `end_addr` from offset 4 and returns **the two bytes stored at `end_addr - 2`**, the
  container's own trailer checksum. It has no backward branch, so it recomputes nothing: the check
  confirms that the header and the stored word arrived, not that the body did. Handles 1 to 4 and 9 have
  routines of their own (the firmware images, the bootloader and `/sys/sku`), not read here; any other
  handle answers no.
* On a match the result is 1 and, for handle 5, `0xD7C4` sets the verdict bit. The reply at `0xEE64`
  carries the handle, then a string, `0x80` and one character, `m` (`0x6D`) on a match and `u` (`0x75`)
  otherwise, then the returned word. The `0x80` sits at byte 6 and the character at byte 7, the byte the
  client tests.

## Flush reads no flag, and does nothing for a configuration

* The parser at `0xD27A` reads the sequence byte and nothing more, so the flag the client's comment
  calls "do not validate the region" is never read. If the open file's id is 2, `/fw/normalmode`, and
  its mode `W`, it stores a request of 2 (`0x1A754`), which the close command turns into a reboot. For
  any other file the reply at `0xE948` carries the handle, and it calls nothing but the reply builders.

## The reboot, `0xFF 0x00`

* `0xCD9C` arms a timer of 100 and sets `0xEFF`; the main loop then sets `0x707` to 3 (`0x15F24`), whose
  case at `0x16036` waits a timer of 500 and executes `RESET` at `0x16054`, the call before it clearing a
  timer flag at `0x301`. Nothing on that path writes flash. The reply
  is still built, since the state byte was set before the switch.

## What validates the configuration, and what a failing one does

* At start, and again from a second call site in the main loop while the verdict is clear (`0x162C2`,
  which also tests a byte at `0xB0`; that this is the end of a USB session is not checked), the validator at
  `0x16090` checks `GSPM` at 0, `LWJL` at `0x47`, reads `end_addr` and checks **`PTYY` at `end_addr`**
  (`0x16154`), then the trailer checksum: seed `0x4321` (`0x1618A`, `0x1618E`), little endian words from
  the container's start to the stored word at `end_addr - 2`. The checksum is skipped while bit 0 of
  setting `0x80` from the settings store is clear (`0x15DA8` loads it into `0x70B`, `0x16170` tests it); an
  absent setting reads `0xFF`, so a store without one asks for the checksum. That is the gate the Harmony
  600, 650 and 700 have, section 354.
* Pass sets the verdict, bit 2 of `0x68E` (`0x1628A`), and loads the configuration's state; a failure
  clears it and latches an error code, 8 when a marker is missing and 4 when the checksum fails
  (`0x162A4`, `0x1629C`), which `0x1A7EE` copies to `0x700` while setting four port pins. What a person
  sees from that is not checked. The validator returns and the start goes on; nothing here restarts or
  stops. Six of the fourteen call sites of the section seeker (section 259) test the verdict within 32
  bytes before the call and skip the configuration when it is clear; one more, `0x11D50`, sits in the
  routine the validator calls only after setting it, and the other seven were not followed. There is no other
  configuration to fall back on: `/fw/embeddedcfg` is a name in the pool that no row of the table and no
  instruction points at.
* **So the four bytes a read comes back short of must be written.** The open for reading states
  `end_addr - 0x020000` as the size (`0x14C58`), which is why a read stops before `PTYY`, and the boot
  validator demands `PTYY` at `end_addr`. The check command does not look at it, so an `m` does not prove
  it arrived.

**Closures.** The validator's checksum, run as read over the five configurations registered from a
Harmony 300 and a Harmony 350, reproduces each one's stored word; and the read size rule gives exactly
those files' lengths less the marker. The reply layouts agree with the three positions the client's
template checks, a second source written by somebody else for the same remote; that is agreement between
two of Logitech's artefacts, not a measurement.

**Standing.** Read in the firmware, one build. Nothing here has been sent to a remote.
"""
import unittest

import lab
from harmony import gspm
from harmony.pic18 import chains, disasm, isa, trace

BASE = 0x9000
CONFIG_BASE = 0x020000

# The file table, section 199, the same constants `tests/test_harmony_350_firmware.py` reads it with.
POOL = 0x00910A
TABLE = 0x0092A6
RECORD_BYTES = 11
ROWS = 23
USERCFG_ROW = 5

# The routines this file names, so a reader can find them in a listing.
PARSER = 0xCB88
RESET_SWITCH = 0xCD6A
RESET_CASE = 0xCDB2
REBOOT_CASE = 0xCD9C
RESET_REPLY = 0xE7CA
CLOSE_FILE = 0x12CE6
CLOSE_REPLY_CALL = 0xEA18
LOOKUP_READ_FLAG = 0x12E02
LOOKUP_WRITE_FLAG = 0x12E7A
LOOKUP_NOTHING_OPEN = 0x12E82
ERASE_BLOCK_OPCODE = 0x185FA
EXTERNAL_WRITE = 0x15BF2
CHECK_SWITCH = 0xD69C
CHECK_USERCFG = 0x14AC2
CHECK_REPLY = 0xEE64
FLUSH_PARSE = 0xD286
FLUSH_REPLY = 0xE948
VALIDATOR = 0x16090
READ_SIZE = 0x14C58

CONFIGS = ('h350_config', 'h350_programmed_config', 'h350_three_devices_config',
           'h300_config', 'h300_programmed_config')


def _code():
    return lab.load('h350_code')


def _at(code, addr):
    return isa.decode(code, addr - BASE, BASE)


def _walk(code, start, end):
    """Every instruction from `start` up to `end`, as (address, instruction)."""
    found = []
    addr = start
    while addr < end:
        instr = _at(code, addr)
        found.append((addr, instr))
        addr += 2 * instr.words
    return found


def _calls(code, start, end):
    return {instr.fields['target'] for _, instr in _walk(code, start, end)
            if instr.mnemonic in ('CALL', 'RCALL', 'GOTO')}


def _text(code, start, count):
    """The listing's instruction text, bank resolved from `start` on, without address and bytes."""
    lines = []
    for line in disasm.disassemble(code, BASE, start, count):
        tokens = line.split(':', 1)[1].split()
        while tokens and len(tokens[0]) == 2 and all(c in '0123456789abcdef' for c in tokens[0]):
            tokens.pop(0)
        lines.append(' '.join(tokens))
    return lines


def _rows(code):
    rows = []
    for index in range(ROWS):
        at = TABLE - BASE + index * RECORD_BYTES
        record = code[at:at + RECORD_BYTES]
        pointer = record[1] | (record[2] << 8)
        end = code.index(b'\x00', pointer - BASE)
        rows.append({'name': code[pointer - BASE:end].decode(), 'flags': record[3],
                     'medium': chr(record[4]),
                     'offset': int.from_bytes(record[5:8], 'little'),
                     'size': int.from_bytes(record[8:11], 'little')})
    return rows


class TheFileSystemResetClosesTheOpenFile(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_parameter_switch_sends_0x66_to_its_own_case(self):
        cases = chains.chain_table(self.code, BASE, RESET_SWITCH)
        self.assertEqual(cases, {0x66: RESET_CASE, 0x62: REBOOT_CASE, 0x6E: REBOOT_CASE,
                                 0x00: REBOOT_CASE, 0x73: 0xCD8E})
        # The chain's last case is tested with BNZ to the default and falls through, which the chain
        # walker does not follow, so its value is computed here: 0x73 ^ 0x06.
        self.assertEqual(_text(self.code, 0xCD7E, 1), ['XORLW 0x06'])
        self.assertEqual(0x73 ^ 0x06, 0x75)

    def test_the_0x66_case_only_records_the_parameter(self):
        self.assertEqual(_text(self.code, RESET_CASE, 5),
                         ['MOVF 0x0f,B,W', 'MOVLB 0x3', 'MOVWF 0x333', 'CLRF 0x334', 'RETLW 0x00'])

    def test_its_reply_closes_the_open_file_and_carries_no_parameter(self):
        self.assertEqual(_text(self.code, RESET_REPLY, 7),
                         ['MOVLB 0x3', 'MOVLW 0x66', 'XORWF 0x333,W', 'BNZ 0x0e7d4',
                          'MOVF 0x34,B,W', 'BNZ 0x0e7da', 'CALL 0x0f80a'])
        self.assertEqual(_text(self.code, 0x0F80A, 1), ['GOTO 0x12ce6'])
        self.assertEqual(_text(self.code, 0xE7FA, 2), ['MOVLB 0x2', 'CLRF 0x2c5'],
                         'the reply states a parameter count of zero')
        # Everything the reply path calls: the reply builders, the close, and the routine that marks
        # the last command as done. No erase, no write, no settings store.
        self.assertEqual(_calls(self.code, RESET_REPLY, 0xE810),
                         {0x0F80A, 0x0F828, 0x15542, 0x155A6, 0x155DC, 0x15CA2})

    def test_the_close_routine_touches_only_the_open_file_struct(self):
        self.assertEqual(_text(self.code, CLOSE_FILE, 5),
                         ['MOVLB 0xf', 'SETF 0xf00', 'CLRF 0xf1d', 'CLRF 0xf1e', 'RETURN'])

    def test_the_close_command_runs_the_same_routine(self):
        self.assertEqual(_text(self.code, CLOSE_REPLY_CALL, 1), ['CALL 0x0f80a'])

    def test_an_open_finds_no_row_while_a_file_is_open(self):
        self.assertEqual(_text(self.code, LOOKUP_NOTHING_OPEN, 4),
                         ['MOVLW 0xff', 'MOVLB 0xf', 'SUBWF 0xf00,W', 'BZ 0x12e8c'])


class OpenForWritingErasesAtOnce(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_read_and_write_each_need_their_own_flag_bit(self):
        self.assertEqual(_text(self.code, LOOKUP_READ_FLAG, 1), ['ANDLW 0x04'])
        self.assertEqual(_text(self.code, LOOKUP_WRITE_FLAG, 1), ['ANDLW 0x02'])

    def test_fourteen_rows_open_for_writing_the_bootloader_among_them(self):
        writable = sorted(row['name'] + ':' + row['medium'] for row in _rows(self.code)
                          if row['flags'] & 0x02)
        self.assertEqual(writable, sorted([
            '/fw:D', '/fw/safemode:I', '/fw/normalmode:E', '/fw/bootloader:I', '/cfg/usercfg:E',
            '/sys/guid:I', '/sys/pid:I', '/sys/sku:I', '/cfg/log:E', '/sys/battery:I',
            '/sys/flags0:I', '/sys/flags1:I', '/sys/flags2:I', '/sys/flags3:I']))
        stored_copy = [row for row in _rows(self.code)
                       if row['name'] == '/fw/normalmode' and row['medium'] == 'E']
        self.assertEqual([row['flags'] & 0x06 for row in stored_copy], [0x02],
                         'the stored firmware copy is writable and not readable')

    def test_the_configuration_size_is_replaced_by_the_region_and_the_log(self):
        self.assertEqual(_text(self.code, 0xCEC4, 4),
                         ['MOVLW 0x05', 'MOVLB 0xf', 'SUBWF 0xf00,W', 'BNZ 0x0ceea'])
        self.assertEqual(_text(self.code, 0xCECC, 1), ['CALL 0x17ffe'])
        self.assertEqual(_text(self.code, 0x17FFE, 1), ['MOVFF 0x398,0x007'])
        # The log's size: 0x398 and 0x399 cleared and 0x39A set to 2, so 0x020000.
        self.assertEqual(_text(self.code, 0x17CDA, 5),
                         ['MOVLB 0x3', 'CLRF 0x398', 'CLRF 0x399', 'MOVLW 0x02', 'MOVWF 0x39a'])

    def test_the_log_sits_in_the_top_128_kib_of_each_part_it_knows(self):
        """`0x18056` reads the flash part's identity and sets the log's high address byte from it."""
        self.assertEqual(_text(self.code, 0x18056, 6),
                         ['MOVLB 0xc', 'CLRF 0xc1d', 'CLRF 0xc1e', 'CLRF 0xc1f', 'BCF LATF,7',
                          'CALL 0x109b4'])
        # Capacity byte and type byte of each identity, then the high byte of the log's address.
        pairs = [(_text(self.code, a, 1)[0], _text(self.code, b, 1)[0], _text(self.code, c, 1)[0])
                 for a, b, c in ((0x1806E, 0x18076, 0x18080), (0x18084, 0x1808A, 0x18094),
                                 (0x18098, 0x1809E, 0x180B4))]
        self.assertEqual(pairs, [('MOVLW 0x14', 'MOVLW 0x1c', 'MOVLW 0x0e'),
                                 ('MOVLW 0x15', 'MOVLW 0x1c', 'MOVLW 0x1e'),
                                 ('MOVLW 0x13', 'MOVLW 0x1c', 'MOVLW 0x06')])
        self.assertEqual(_text(self.code, 0x180AA, 1), ['MOVLW 0x20'],
                         'a second identity with the 512 KiB capacity byte takes the same case')
        # A capacity byte n means 2 ** n bytes, and each log starts 128 KiB below the top.
        for capacity, high in ((0x14, 0x0E), (0x15, 0x1E), (0x13, 0x06)):
            self.assertEqual((1 << capacity) - 0x020000, high << 16)

    def test_the_external_erase_counts_64_kib_blocks_and_is_six_for_the_configuration(self):
        self.assertEqual(_text(self.code, 0xCF44, 1), ['MOVLW 0x10'])
        row = _rows(self.code)[USERCFG_ROW]
        self.assertEqual((row['name'], row['offset'], row['size']), ('/cfg/usercfg', 0x020000, 0x040000))
        size = row['size'] + 0x020000
        blocks = ((size - 1) >> 16) + 1
        self.assertEqual(blocks, 6)
        self.assertEqual((row['offset'], row['offset'] + blocks * 0x10000), (0x020000, 0x080000))

    def test_opening_the_configuration_for_writing_clears_its_verdict(self):
        self.assertEqual(_text(self.code, 0xCF7E, 6),
                         ['MOVLW 0x05', 'MOVLB 0xf', 'SUBWF 0xf00,W', 'BNZ 0x0cfb4',
                          'MOVLB 0x6', 'BCF 0x68e,2'])

    def test_only_mode_w_reaches_the_erase_setup(self):
        self.assertEqual(_text(self.code, 0xCE92, 5),
                         ['MOVLW 0x57', 'MOVLB 0xd', 'SUBWF 0xd36,W', 'BZ 0x0ce9c', 'BRA 0x0cf8c'])

    def test_the_internal_medium_erases_1_kib_pages_of_program_flash(self):
        """The branch the bootloader and safe mode rows take: medium `I`, pages of 1 KiB."""
        self.assertEqual(_text(self.code, 0xCF18, 1), ['MOVLW 0x0a'], 'the open counts 1 KiB pages')
        self.assertEqual(_text(self.code, 0xE32A, 4),
                         ['MOVLW 0x49', 'MOVLB 0xf', 'SUBWF 0xf02,W', 'BNZ 0x0e3e6'])
        self.assertEqual(_text(self.code, 0xE364, 1), ['MOVLW 0x0a'])
        self.assertEqual(_text(self.code, 0xE392, 1), ['CALL 0x1aa40'])
        # EECON1 = 0x14 is FREE and WREN: a row erase of the processor's own program flash.
        self.assertEqual(_text(self.code, 0x1AA4E, 2), ['MOVLW 0x14', 'MOVWF EECON1'])

    def test_the_erase_step_is_a_block_erase_at_the_file_place_plus_the_block(self):
        self.assertEqual(_text(self.code, 0xE418, 1), ['MOVLW 0x10'])
        self.assertEqual(_text(self.code, 0xE43E, 2), ['CALL 0x185cc', 'CALL 0x10a6c'])
        self.assertEqual(_text(self.code, 0x10A6C, 1), ['GOTO 0x185f4'])
        self.assertEqual(_text(self.code, ERASE_BLOCK_OPCODE, 1), ['MOVLW 0xd8'])
        # And only the last block answers the open: the state byte goes to 0x0F when the count is met.
        self.assertEqual(_text(self.code, 0xE456, 3), ['MOVLB 0x3', 'MOVLW 0x0f', 'MOVWF 0x330'])


class TheWriteIsUnbounded(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_a_data_packet_states_up_to_63_bytes(self):
        self.assertEqual(_text(self.code, 0xCC2C, 3), ['MOVLW 0x3f', 'MOVLB 0xd', 'ANDWF 0xd06,W'])

    def test_the_external_write_programs_pages_and_advances_the_place(self):
        self.assertEqual(_calls(self.code, EXTERNAL_WRITE, 0x15C76),
                         {0x10A46, 0x15538, 0x167C8, 0x185CC})
        self.assertEqual(_text(self.code, 0x1869C, 2), ['MOVLB 0x6', 'MOVLW 0x02'])
        self.assertEqual(_text(self.code, 0x15C5E, 5),
                         ['MOVFF 0x2f6,FSR0L', 'MOVFF 0x2f7,FSR0H', 'MOVFF TBLPTRL,POSTINC0',
                          'MOVFF TBLPTRH,POSTINC0', 'MOVFF TBLPTRU,POSTINC0'])

    def test_nothing_in_the_write_path_reads_the_file_size(self):
        """The negative result: the size at 0xF03 is read elsewhere and never on the way to flash."""
        paths = ((PARSER, 0xCC70), (0x15B56, 0x15C76))
        readers = [access.addr for accesses in trace.trace(self.code, BASE, [0xF03, 0xF04, 0xF05]).values()
                   for access in accesses]
        self.assertEqual(len(readers), 72, 'the size is still read, by the open and the read path')
        self.assertEqual([addr for addr in readers if any(lo <= addr < hi for lo, hi in paths)], [])
        # And the open's copy of the size, which the erase count is computed from. Direct accesses only:
        # the tracer cannot see FSR, which these two paths use for the packet buffer alone.
        copies = [access.addr for accesses in trace.trace(self.code, BASE, [0xD15, 0xD16, 0xD17]).values()
                  for access in accesses]
        self.assertEqual([addr for addr in copies if any(lo <= addr < hi for lo, hi in paths)], [])

    def test_the_command_counts_its_own_packet(self):
        self.assertEqual(_text(self.code, 0xD0F2, 3), ['MOVLB 0xf', 'MOVLW 0x01', 'MOVWF 0xf0b'])
        # The reply's sequence byte is 0x80 ORed with the last data packet's own first byte, so the done
        # packet 0x7E answers 0xFE, the value the client's template waits for.
        self.assertEqual(_text(self.code, 0xCC54, 4), ['MOVLW 0x80', 'MOVLB 0xd', 'IORWF 0xd02,W',
                                                       'MOVLB 0x3'])
        self.assertEqual(0x80 | 0x7E, 0xFE)


class TheCheckComparesTheStoredWord(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_it_dispatches_on_the_handle_which_is_the_row(self):
        # The open's reply sends the row, 0xF00, as the handle.
        self.assertEqual(_text(self.code, 0xE83A, 2), ['MOVFF gprF00,0x2c8', 'CALL 0x15612'])
        cases = chains.chain_table(self.code, BASE, CHECK_SWITCH)
        self.assertEqual(cases, {0x09: 0xD76E, 0x05: 0xD744, 0x04: 0xD738, 0x03: 0xD70C, 0x02: 0xD6DC})
        self.assertEqual(_text(self.code, 0xD6B0, 1), ['XORLW 0x03'], 'the last case, row 1')
        self.assertEqual(_text(self.code, 0xD75C, 1), ['CALL 0x14ac2'])

    def test_the_configuration_routine_reads_the_stored_word_and_computes_nothing(self):
        # GSPM at the start, LWJL at 0x47.
        self.assertEqual([_text(self.code, a, 1)[0] for a in (0x14AE8, 0x14AF0, 0x14AF6, 0x14AFC)],
                         ['MOVLW 0x47', 'MOVLW 0x53', 'MOVLW 0x50', 'MOVLW 0x4d'])
        self.assertEqual(_text(self.code, 0x14B10, 1), ['MOVLW 0x47'])
        self.assertEqual([_text(self.code, a, 1)[0] for a in (0x14B2C, 0x14B34, 0x14B3A, 0x14B40)],
                         ['MOVLW 0x4c', 'MOVLW 0x57', 'MOVLW 0x4a', 'MOVLW 0x4c'])
        # end_addr from offset 4, then back two bytes, then one word.
        self.assertEqual(_text(self.code, 0x14B54, 1), ['MOVLW 0x04'])
        self.assertEqual(_text(self.code, 0x14B62, 2), ['CALL 0x10a70', 'MOVLW 0x02'])
        self.assertEqual(_text(self.code, 0x14B68, 1), ['SUBWF TBLPTRL,F'])
        relative = [(addr, instr) for addr, instr in _walk(self.code, CHECK_USERCFG, 0x14B96)
                    if instr.category in (isa.REL8, isa.REL11)]
        self.assertEqual([addr for addr, instr in relative if instr.fields['target'] <= addr], [],
                         'a loop here would be a recomputation')

    def test_only_the_handle_and_the_expected_value_are_used(self):
        self.assertEqual(_text(self.code, 0xD25C, 3),
                         ['MOVFF 0xd58,0x3d9', 'MOVFF 0xd59,0x3da', 'MOVFF 0xd4a,0x3d8'])
        parsed_and_unused = [0xD4B, 0xD55, 0xD56, 0xD57, 0xD5A, 0xD5B, 0xD5C, 0xD5D, 0xD5E, 0xD5F]
        check_path = ((0xD5E2, 0xD81A), (0x148C6, READ_SIZE), (CHECK_REPLY, 0xEEDA))
        accesses = [access.addr for found in trace.trace(self.code, BASE, parsed_and_unused).values()
                    for access in found]
        self.assertEqual([a for a in accesses if any(lo <= a < hi for lo, hi in check_path)], [])

    def test_a_match_on_the_configuration_sets_its_verdict(self):
        self.assertEqual(_text(self.code, 0xD7BC, 6),
                         ['MOVLW 0x05', 'MOVLB 0x3', 'SUBWF 0x3d8,W', 'BNZ 0x0d7c8', 'MOVLB 0x6',
                          'BSF 0x68e,2'])

    def test_the_reply_puts_m_or_u_at_byte_7(self):
        self.assertEqual(_text(self.code, CHECK_REPLY, 3), ['MOVLB 0xc', 'MOVLW 0x75', 'MOVWF 0xc00'])
        self.assertEqual(_text(self.code, 0xEE7E, 2), ['MOVLB 0xc', 'MOVLW 0x6d'])
        self.assertEqual(_text(self.code, 0xEE98, 3), ['MOVLB 0x2', 'MOVLW 0x03', 'MOVWF 0x2c5'])
        self.assertEqual(_text(self.code, 0xEEAA, 3), ['MOVLB 0x2', 'MOVLW 0x80', 'MOVWF 0x2c2'])
        # Service, command, sequence and count are bytes 0 to 3; the handle is a byte parameter, its
        # length and value at 4 and 5; the string marker 0x80 at 6, so the character is byte 7.
        self.assertEqual(4 + 2 + 1, 7)
        self.assertEqual((ord('m'), ord('u')), (0x6D, 0x75))


class FlushReadsNoFlag(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_parse_reads_the_sequence_byte_and_nothing_else(self):
        self.assertEqual(_calls(self.code, FLUSH_PARSE, 0xD2D0), {0x155BA, 0x1A754})
        self.assertEqual(_text(self.code, 0xD2AC, 3), ['MOVLW 0x02', 'MOVLB 0xf', 'SUBWF 0xf01,W'])
        self.assertEqual(_text(self.code, 0xD2B6, 3), ['MOVLW 0x57', 'MOVLB 0xf', 'SUBWF 0xf09,W'])

    def test_its_reply_does_nothing_but_answer(self):
        self.assertEqual(_calls(self.code, FLUSH_REPLY, 0xE984),
                         {0x15542, 0x155A6, 0x155DC, 0x15612, 0x15CA2})


class TheRebootIsAProcessorReset(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_reboot_case_arms_a_timer_and_a_flag(self):
        self.assertEqual(_text(self.code, REBOOT_CASE, 8),
                         ['MOVLW 0x64', 'MOVLB 0x3', 'MOVWF 0x32a', 'CLRF 0x32b', 'CALL 0x197ae',
                          'MOVLB 0xe', 'MOVLW 0x01', 'MOVWF 0xeff'])

    def test_the_main_loop_turns_the_flag_into_a_reset(self):
        self.assertEqual(_text(self.code, 0x15F22, 6),
                         ['MOVLB 0xe', 'MOVF 0xeff,W', 'BZ 0x15f2e', 'MOVLB 0x7', 'MOVLW 0x03',
                          'MOVWF 0x707'])
        self.assertEqual(chains.chain_table(self.code, BASE, 0x15FA2),
                         {0x02: 0x16058, 0x03: 0x16036, 0x01: 0x15FB0})
        self.assertEqual(_text(self.code, 0x16050, 2), ['CALL 0x19638', 'RESET'])
        self.assertEqual(_text(self.code, 0x19638, 3), ['MOVLB 0x3', 'CLRF 0x301', 'RETURN'],
                         'the call before the reset clears a timer flag')


class TheBootValidator(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_it_checks_three_markers_then_the_checksum(self):
        self.assertEqual([_text(self.code, a, 1)[0] for a in (0x160BA, 0x160C2, 0x160C8, 0x160CE)],
                         ['MOVLW 0x47', 'MOVLW 0x53', 'MOVLW 0x50', 'MOVLW 0x4d'])
        self.assertEqual(_text(self.code, 0x160D8, 1), ['MOVLW 0x47'])
        self.assertEqual([_text(self.code, a, 1)[0] for a in (0x16154, 0x1615C, 0x16162, 0x16168)],
                         ['MOVLW 0x50', 'MOVLW 0x54', 'MOVLW 0x59', 'MOVLW 0x59'], 'PTYY at end_addr')
        self.assertEqual(_text(self.code, 0x1618A, 1) + _text(self.code, 0x1618E, 1),
                         ['MOVLW 0x21', 'MOVLW 0x43'], 'the seed 0x4321, low byte first')

    def test_setting_0x80_bit_0_gates_the_checksum(self):
        self.assertEqual(_text(self.code, 0x15DA8, 7),
                         ['MOVLW 0x80', 'MOVLB 0x1', 'MOVWF 0x1e5', 'CLRF 0x1e6', 'CALL 0x10004',
                          'MOVFF PRODL,0x70b', 'CALL 0x1a5c0'])
        self.assertEqual(_text(self.code, 0x16170, 4),
                         ['MOVLW 0x01', 'MOVLB 0x7', 'ANDWF 0x70b,W', 'BNZ 0x16188'])

    def test_an_absent_setting_reads_0xff(self):
        """The settings reader's not found branch, so a store without setting 0x80 asks for the checksum."""
        self.assertEqual(_text(self.code, 0x10110, 4), ['MOVLB 0xc', 'MOVF 0xc1f,W', 'IORWF 0xc20,W',
                                                        'BNZ 0x1012e'])
        self.assertEqual(_text(self.code, 0x10128, 2), ['SETF PRODL', 'CLRF PRODH'])

    def test_the_error_code_is_copied_out_with_four_port_pins(self):
        self.assertEqual(_text(self.code, 0x16308, 2), ['MOVFF 0x70c,0x705', 'GOTO 0x1a7ee'])
        self.assertEqual(_text(self.code, 0x1A7EE, 6),
                         ['MOVFF 0x705,0x700', 'BSF PORTC,1', 'BSF PORTB,0', 'BSF PORTB,2', 'BSF PORTB,3',
                          'RETURN'])

    def test_its_verdict_and_its_two_error_codes(self):
        self.assertEqual(_text(self.code, 0x1627C, 2), ['MOVLB 0x6', 'BCF 0x68e,2'])
        self.assertEqual(_text(self.code, 0x16288, 2), ['MOVLB 0x6', 'BSF 0x68e,2'])
        self.assertEqual(_text(self.code, 0x1629A, 2), ['MOVLB 0x7', 'MOVLW 0x04'])
        self.assertEqual(_text(self.code, 0x162A4, 2), ['MOVLB 0x7', 'MOVLW 0x08'])

    def test_it_runs_at_start_and_again_after_a_session_while_the_verdict_is_clear(self):
        refs = sorted(ref.addr for ref in trace.xrefs(self.code, BASE, [VALIDATOR])[VALIDATOR])
        self.assertEqual(refs, [0x15DFE, 0x162EE])
        self.assertEqual(_text(self.code, 0x162E4, 3), ['MOVLB 0x6', 'MOVF 0x68e,W', 'ANDLW 0x04'])

    def test_six_section_seeks_test_the_verdict_first(self):
        """A `BTFSS 0x68E,2` (bank 6, bytes `8E A5`) within 32 bytes before the call, and not before the rest."""
        callers = (0x13BEC, 0x14242, 0x173D0, 0x11D50, 0x1AB3C, 0x1AE22, 0x169C2, 0x16A8E, 0x16E94,
                   0x17366, 0x14496, 0x1984A, 0x19D68, 0x19DE4)
        guarded = [at for at in callers
                   if any(self.code[at - BASE - back:at - BASE - back + 2] == b'\x8e\xa5'
                          for back in range(2, 34, 2))]
        self.assertEqual(guarded, [0x13BEC, 0x14242, 0x1AB3C, 0x16E94, 0x14496, 0x1984A])
        # The routine holding 0x11D50 is called from the validator's pass branch, after the bit is set.
        self.assertEqual(_text(self.code, 0x162AC, 6),
                         ['MOVLB 0x6', 'BTFSS 0x68e,2', 'BRA 0x162c0', 'MOVLB 0x2', 'MOVLW 0x01',
                          'MOVWF 0x2b6'])
        self.assertEqual(_text(self.code, 0x162B8, 1), ['CALL 0x11d48'])

    def test_no_instruction_points_at_the_embedded_configuration_name(self):
        name = self.code.index(b'/fw/embeddedcfg\x00') + BASE
        self.assertEqual(name, 0x9139)
        pointer = bytes([name & 0xFF, name >> 8])
        rows = [self.code[TABLE - BASE + i * RECORD_BYTES + 1:TABLE - BASE + i * RECORD_BYTES + 3]
                for i in range(ROWS)]
        self.assertNotIn(pointer, rows, 'no row of the file table names it')
        # Code loads an address as two MOVLW, low byte and high byte, so look for the pair near each other.
        lows = [a for a in range(0, len(self.code) - 1, 2) if self.code[a:a + 2] == b'\x39\x0e']
        near = [a + BASE for a in lows
                if any(self.code[b:b + 2] == b'\x91\x0e' for b in range(max(0, a - 16), a + 18, 2))]
        self.assertEqual(near, [], 'no MOVLW 0x39 with a MOVLW 0x91 within 16 bytes')
        self.assertEqual([a + BASE for a in lows], [0xCF94], 'the one MOVLW 0x39 there is')


class TheValidatorAgreesWithTheConfigurationsRead(unittest.TestCase):
    """The closure: the rule as read, run over the five configurations read off two models."""

    def test_the_checksum_as_read_reproduces_every_stored_word(self):
        lab.require(*CONFIGS)
        for name in CONFIGS:
            with self.subTest(config=name):
                blob = lab.load(name)
                end = int.from_bytes(blob[4:7], 'little')
                stored = end - CONFIG_BASE - 2
                self.assertEqual(gspm.xor_words(blob[:stored], 0x4321),
                                 int.from_bytes(blob[stored:stored + 2], 'little'))

    def test_a_flipped_byte_fails_it(self):
        lab.require('h350_config')
        blob = bytearray(lab.load('h350_config'))
        end = int.from_bytes(blob[4:7], 'little')
        stored = end - CONFIG_BASE - 2
        blob[0x100] ^= 0x01
        self.assertNotEqual(gspm.xor_words(bytes(blob[:stored]), 0x4321),
                            int.from_bytes(blob[stored:stored + 2], 'little'))

    def test_an_erased_end_addr_gives_a_size_of_zero(self):
        lab.require('h350_code')
        # All three bytes of end_addr 0xFF, as erased flash reads, and the size is cleared to zero.
        self.assertEqual(_text(_code(), 0x14C88, 14),
                         ['MOVLB 0xc', 'MOVWF 0xc04', 'BSF LATF,7', 'SETF WREG', 'XORWF 0xc02,W',
                          'BNZ 0x14ca8', 'SETF WREG', 'XORWF 0x03,B,W', 'BNZ 0x14ca8', 'SETF WREG',
                          'XORWF 0x04,B,W', 'BNZ 0x14ca8', 'CLRF 0x02,B', 'CLRF 0x03,B'])

    def test_the_read_size_rule_is_the_files_less_their_end_marker(self):
        """`0x14C58` states end_addr less the base; the lab's copies carry the marker appended back."""
        lab.require('h350_code', *CONFIGS)
        self.assertEqual(_text(_code(), READ_SIZE + 0x0E, 1), ['MOVLW 0x04'],
                         'end_addr is read from offset 4')
        for name in CONFIGS:
            with self.subTest(config=name):
                blob = lab.load(name)
                end = int.from_bytes(blob[4:7], 'little')
                self.assertEqual(blob[end - CONFIG_BASE:], b'PTYY')
                self.assertEqual(len(blob) - 4, end - CONFIG_BASE)


if __name__ == '__main__':
    unittest.main()
