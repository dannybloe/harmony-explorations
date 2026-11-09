"""
The Harmony 880 and 885 application's erase and write: a floor, no ceiling, and replies that say nothing.

**Read in the firmware** on 4 November 2026, items 1.3 and 1.4 of `todo/todo-prepare-885.md`, in the
885's application 4.4 (`arch8_code_885`, base `0x010000`); the 880's application differs in the two skin
bytes only, `tests/harmony_880_885/test_harmony_885_start_check.py`, so every address holds for it. No remote was opened.
Decoded through `harmony.pic18.isa` and `harmony.pic18.chains`, with the hand read fall through cases
marked.

**Sources checked before the work**: `tests/harmony_880_885/test_harmony_885_bootloader.py`, item 1.1, the bootloader's
erase and write, whose floor and unlock this application repeats; `tests/harmony_880_885/test_arch8_usb.py`, which found
the address checker `0x19B5C` and its one caller; `reference/architectures/harmony-880-885/` and
`reference/usb-protocol/commands.md`. **Logitech's client, decision 2**: MyHarmony holds no write path for
this platform (a name search for the platform, its product id and the unlock value found nothing); the
classic client's flash service, `FlashHIDService`, erases every block of the chip's block table the range
covers and then sends chunks of `50 * (maxOutputPayloadSize - 1)` bytes, one `0x30` announce each, which is
the 3150 byte transfer; its `FlashMemoryFactory` builds the sector table below for the two parts. Both
stated by Logitech, in their client, and not asserted here. **concordance** lists `01:49` as an AMD
`Am29LV160BB` with a different sector map below `0x010000` and has no row for `1F:C0`.

## The flash routines

The application copies its own flash routines, `0x0199C2` to `0x019B50`, into RAM slot 1 (`0x19D28`)
before every erase and every write, and calls them at `0x1FFE52` erase, `0x1FFE54` id read, `0x1FFE56`
program a byte, `0x1FFE58` program a buffer: the bootloader's four entries, item 1.1, from a separate
build of the same code. **The inner check** at `0x1FFFC0`, the first call of erase and both programs and
not of the id read: an address at or above `0x010000` passes; below it only if data `0x23A` is `0xA7`,
which also sets bit 3 of the port latch at `0xF86`. That bit is cleared only by `0x19B52`, which nothing
calls.

**The erase** (`0x1FFEF2`) sends `AA` to `0x000AAA`, `55` to `0x000555`, `80`, `AA`, `55`, then `30` by
one table write at the host's address unchanged, and polls. Nothing rounds, masks or counts the address and
no sector table exists in the code, so one erase removes whatever sector of the part holds the address.
The code assumes one size in one place, the bootloader's: its staged install erases once at `0x010000`
and programs 64 KiB (item 1.1). **The sector map comes from outside the firmware**: Logitech's classic
client gives both parts eight 8 KiB blocks then thirty one of 64 KiB to `0x200000`, concordance gives
`01:49` 16, 8, 8 and 32 KiB then 64 KiB. They agree above `0x010000` and disagree below it. No datasheet
was compared.

**The poll** reads the address until bit 6 stops toggling; reads with bit 5 set are counted and after 200
of them it gives up and sends the reset command `F0`. Its outcome is stored nowhere.

**The buffer program skips `0xFF` bytes** (`0x1FFF86` to `0x1FFF8C`): over erased flash the same result,
over old content an `0xFF` leaves the old byte standing and any other byte can only clear bits. **The
bootloader's buffer program does not skip them**: it uses unlock bypass (`0x20`, then `A0` and the byte
per byte, `90` and `00` to leave) and programs every byte, asserted in `tests/harmony_880_885/test_harmony_885_bootloader.py`.
Neither erases.

## The id the version block reports

The id read (`0x1A230`, called from the version reply at `0x15C4E`) reads byte addresses 0 and 2 in
autoselect mode and then **replaces `1F:C0` with `01:49`**, keeps `01:49`, and reports anything else as
`FF:FF`. So the firmware knows two parts and the application reports both as the same one: the `01:49`
a running remote answers does not say which is fitted. Logitech's client names `1F:C0` the Atmel
`AT49BV163D` and `01:49` the Spansion `S29AL016M` (stated by Logitech, in their client). The bootloader's
version answer reports the part's own bytes, asserted in the bootloader's test.

## The erase command

`0xD_` with three address bytes, case `0x158D2` of the chain at `0x15854`: command state 8, then the
**outer check** `0x19B5C`, one comparison against `0x010000` and, below it, a test that data `0x23A` is
nonzero. **Lowest accepted `0x010000`, or `0x000000` with the unlock byte nonzero; highest none.** A pass
erases at once, inside the parse, and the executor's state 8 case sends `F0 D0` whatever the routine did:
`0x15948` calls the wrapper and branches on unconditionally. So `F0 D0` also follows an inner refusal (an
unlock byte that is nonzero but not `0xA7`) and a poll that gave up. **A refusal by the outer check sends
nothing**: error code 2 to `0x169F4` and a branch to `0x15B1E`, which drops the command state because
`0x2B4` was cleared before the switch. `0x169F4` hangs only when data `0x1F3` is 1, and the refusal
clears it first, so the remote does not hang; a host waits for a reply that never comes. That `0x169F4`
draws an error screen is inferred from the bootloader's twin.

## The write command

**Announce**, `0x3_`: case `0x15880`, state 2, sharing `0x50`'s parse (`0x1588A`): three address bytes and
two count bytes, big endian, no check, no reply (the executor returns at once for state 2, `0x15BC2`).
**Data**: in state 2 a packet goes to `0x15A52`, whose two case chain takes `0xF0` (decoded by `chains`)
and `0x40` (`0xF0 ^ 0xB0`, read by hand from the inverted `BNZ`); anything else falls to `0x15B1E` and
ends the transfer with no reply. A `0x4_` packet's bytes go into a buffer at data `0x087`, its length into
`0x264`, and the drain programs it before the next packet is parsed. **The length nibble**: 0 to 7 as
is, `0x08` 15, `0x09` 31, `0x0A` 63 (`0x157E0` to `0x15804`), and `0x0B` to `0x0F` left as 11 to 15,
the same as `packages/usb` and the later platforms read them (a reviewer's correction: this header
said otherwise when it was drafted). **Done**, any `0xF_` packet: one byte
read and compared with nothing, state 3, and the executor sends `F0 30` without testing anything.

**One check per packet, on its start address**: the drain hands the running address, the buffer and the
length to `0x1904A`, then `0x1A2D0` (interrupts off) and the buffer program, whose first act is the inner
check. No check on the announce, on the count, on the packet's end, and no ceiling. The loop increments
the address per byte without testing it again, so a packet starting at `0x00FFC2` to `0x00FFFF` without
the unlock is dropped whole, its bytes from `0x010000` included. **The pointer advances regardless**:
`0x1904A` adds the length to the address and returns the constant 1, and the drain ignores it.

**The announced count is never enforced.** The drain subtracts each packet's length from it and nothing
compares it with anything; the transfer is as long as the packets the host sends. No literal 3150
(`0x0C4E`) occurs in the code: the classic client's transfer size is its own.

**Two virtual addresses.** A one byte packet while the running address is `0x000106` stores its byte as
the unlock (data `0x23A`) and nothing else: no program, no advance, no decrement. The unlock then stays
set until `0x19B56` clears it, from main's start sequence (`0x16E4E`) and from the top level mode 2
(`0x16FF0`), which clears it, switches interrupts off and sleeps (`0x1814C`); nothing clears it at the end
of a transfer. Item 1.3 called both start up paths; the second is the way into the ordinary sleep. And a write whose running address is `0x000104` with exactly one byte left
appends that byte to the hardware log at `0x000140` to `0x000147` (`0x1836E`): nothing if it equals the
newest entry, else into the first `0xFF` slot by the one byte program, and nothing when all eight are
used. **It does not set the unlock**, so in the application it programs nothing unless the host wrote
`0xA7` to `0x000106` first, and the host is not told. The application's own log migration (`0x18408`)
sets and clears the unlock around its one byte program, as the bootloader's log write does.

## What a writer takes from this

Erase every sector it writes, at the sector's base, and read it back; verify every write by reading back,
since `F0 30` says only that the done packet arrived; never write or erase below `0x020000`, where the
running application from `0x010000` is guarded by nothing and the bootloader below by the unlock alone;
never at or above `0x1FE000` (item 1.8's device window); never announce a write at `0x000104` or
`0x000106`; send only the nibbles 0 to 7, `0x08`, `0x09` and `0x0A`; and restart the remote after any use
of the unlock. The library's own rails are unchanged by this reading.

## Negative results and what is open

No erase before program, in the application or the bootloader. No transfer limit. No status from a
program or an erase reaches the host. Open: which part a unit carries (the bootloader's version answer
would say, a read); what the part does on a program that would raise a bit; what the latch bit at
`0xF86` drives; how long a 64 KiB erase takes; whether the USB controller drops a report that arrives
while interrupts are off; and the table pointer's width, which decides whether an address above
`0x3FFFFF` aliases low past the unlock (item 1.8).

## Reviewers

Recorded in the commit that landed this file.
"""
import unittest

import lab  # noqa: F401, puts src on the path
from harmony.pic18 import chains
from .test_harmony_885_start_check import BASE, CODE_END, application, listing, text, transfers_to, window

# The application's flash routines: where their source sits and where the copy runs.
SLOT_SOURCE = (0x0199C2, 0x019B50)
SLOT_RUNS_AT = 0x1FFE50
ENTRIES = {0x1FFE52: 'erase', 0x1FFE54: 'id read', 0x1FFE56: 'program a byte', 0x1FFE58: 'program a buffer'}
INNER_CHECK = 0x1FFFC0

DISPATCH = 0x15854
EXECUTOR_SWITCH = 0x15BD2
ERASE_CASE = 0x158D2
OUTER_CHECK = 0x19B5C
ERASE_WRAPPER = 0x1A2FA
ID_READ = 0x1A230
DATA_PACKET = 0x15A52
DRAIN = 0x15B30
LOG_APPEND = 0x1836E
CLEAR_UNLOCK = 0x19B56


def ram_slot(code):
    """The flash routines as they run, decoded at `0x1FFE50`."""
    start, end = SLOT_SOURCE
    source = code[start - BASE:end - BASE + 2]
    return source, listing(source, SLOT_RUNS_AT, SLOT_RUNS_AT + len(source), SLOT_RUNS_AT)


def ram_window(code, start, count):
    source, _ = ram_slot(code)
    return window(source, start, count, SLOT_RUNS_AT)


class TheFlashRoutines(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_the_copier_loads_0x0199C2_to_0x019B50_into_slot_1_before_an_erase(self):
        self.assertEqual(window(self.code, 0x1591C, 15),
                         ['MOVLB 0x2', 'MOVLW 0x50', 'MOVWF 0x19', 'MOVLW 0x9b', 'MOVWF 0x1a', 'MOVLW 0x01',
                          'MOVWF 0x1b', 'MOVLB 0x2', 'MOVLW 0xc2', 'MOVWF 0x16', 'MOVLW 0x99', 'MOVWF 0x17',
                          'MOVLW 0x01', 'MOVWF 0x18', 'MOVLB 0x2'])
        self.assertEqual(window(self.code, 0x1593E, 5),
                         ['MOVLB 0x2', 'MOVLW 0x01', 'MOVWF 0x14', 'CALL 0x19d28', 'CALL 0x1a2fa'])

    def test_the_copy_opens_with_the_bootloaders_four_entries(self):
        self.assertEqual(ram_window(self.code, SLOT_RUNS_AT, 5),
                         ['RESET', 'BRA 0x1ffef2', 'BRA 0x1fff1a', 'BRA 0x1fff3a', 'BRA 0x1fff60'])

    def test_the_inner_check_is_a_floor_at_0x010000_lifted_by_0xA7_which_sets_a_latch_bit(self):
        self.assertEqual(ram_window(self.code, INNER_CHECK, 15),
                         ['MOVLW 0x00', 'MOVLB 0x2', 'SUBWF 0x33,W', 'MOVLW 0x00', 'SUBWFB 0x34,W', 'MOVLW 0x01',
                          'SUBWFB 0x35,W', 'BC 0x1fffda', 'MOVLW 0xa7', 'SUBWF 0x3a,W', 'BNZ 0x1fffdc',
                          'BSF 0xf86,3', 'RETLW 0x01', 'RETLW 0x01', 'RETLW 0x00'])

    def test_erase_and_both_programs_open_with_it_and_the_id_read_does_not(self):
        _, runs = ram_slot(self.code)
        targets = {ins.fields['target']: ENTRIES[a] for a, ins in runs if a in ENTRIES}
        first = {targets[a]: text(ins) for a, ins in runs if a in targets}
        self.assertEqual(first, {'erase': 'RCALL 0x1fffc0', 'program a byte': 'RCALL 0x1fffc0',
                                 'program a buffer': 'RCALL 0x1fffc0', 'id read': 'RCALL 0x1ffe5c'})

    def test_the_latch_bit_is_cleared_only_by_a_routine_nothing_calls(self):
        writes = [(a, ins.mnemonic) for a, ins in listing(self.code, BASE, CODE_END)
                  if ins.mnemonic in ('BSF', 'BCF', 'BTG') and ins.fields == {'f': 0x86, 'b': 3, 'a': 0}]
        self.assertEqual(writes, [(0x19B48, 'BSF'), (0x19B52, 'BCF')])
        self.assertEqual(transfers_to(self.code, 0x19B52), [])

    def test_an_erase_is_the_sector_command_at_the_hosts_address_unchanged(self):
        self.assertEqual(ram_window(self.code, 0x1FFEF2, 19),
                         ['RCALL 0x1fffc0', 'IORLW 0x00', 'BZ 0x1fff18', 'RCALL 0x1ffe5c', 'MOVLB 0x2', 'MOVLW 0x80',
                          'MOVWF 0x39', 'RCALL 0x1ffe7e', 'RCALL 0x1ffe5c', 'MOVFF 0x233,0xff6', 'MOVFF 0x234,0xff7',
                          'MOVFF 0x235,0xff8', 'MOVLW 0x30', 'MOVWF 0xff5', 'TBLWT*', 'RCALL 0x1ffe9e', 'RETURN',
                          'RCALL 0x1ffe5c', 'MOVLB 0x2'])
        # The unlock cycles it calls: 0xAA to 0x000AAA and 0x55 to 0x000555, then the command byte to
        # 0x000AAA.
        self.assertEqual(ram_window(self.code, 0x1FFE5C, 18),
                         ['MOVLW 0xaa', 'MOVWF 0xff6', 'MOVLW 0x0a', 'MOVWF 0xff7', 'CLRF 0xff8', 'MOVLW 0xaa',
                          'MOVWF 0xff5', 'TBLWT*', 'MOVLW 0x55', 'MOVWF 0xff6', 'MOVLW 0x05', 'MOVWF 0xff7',
                          'CLRF 0xff8', 'MOVLW 0x55', 'MOVWF 0xff5', 'TBLWT*', 'RETURN', 'MOVLW 0xaa'])

    def test_only_the_erase_sends_0x80_and_0x30(self):
        _, runs = ram_slot(self.code)
        loads = [(a, ins.fields['k']) for a, ins in runs if ins.mnemonic == 'MOVLW' and ins.fields['k'] in (0x80, 0x30)]
        self.assertEqual(loads, [(0x1FFEFC, 0x80), (0x1FFF10, 0x30)])
        self.assertEqual(transfers_to(self.code, ERASE_WRAPPER), [0x15948])

    def test_the_poll_gives_up_after_200_reads_with_bit_5_set_and_sends_the_reset_command(self):
        self.assertEqual(ram_window(self.code, 0x1FFECA, 9),
                         ['MOVLB 0x2', 'BTFSS 0x3b,5', 'BRA 0x1ffede', 'MOVLB 0x2', 'INCF 0x3c', 'MOVLB 0x2',
                          'MOVF 0x3c,W', 'SUBLW 0xc8', 'BC 0x1ffede'])
        self.assertEqual(ram_window(self.code, 0x1FFE90, 6),
                         ['CLRF 0xff6', 'CLRF 0xff7', 'CLRF 0xff8', 'MOVLW 0xf0', 'MOVWF 0xff5', 'TBLWT*'])

    def test_the_buffer_program_skips_0xff_bytes(self):
        self.assertEqual(ram_window(self.code, 0x1FFF82, 5),
                         ['MOVFF 0xfef,0x236', 'MOVLW 0xff', 'MOVLB 0x2', 'SUBWF 0x36,W', 'BZ 0x1fffac'])
        # The branch lands on the address increment, past the program sequence.
        self.assertEqual(ram_window(self.code, 0x1FFFAC, 3), ['MOVLB 0x2', 'INCF 0x33', 'MOVLW 0x00'])
        self.assertEqual(ram_window(self.code, 0x1FFF92, 2), ['MOVLW 0xa0', 'MOVWF 0x39'])


class TheIdItReports(unittest.TestCase):
    def test_1F_C0_becomes_01_49_and_anything_unknown_FF_FF(self):
        code = application()
        self.assertEqual(window(code, 0x1A25A, 27),
                         ['MOVLW 0x1f', 'MOVLB 0x2', 'SUBWF 0xc3,W', 'BNZ 0x1a278', 'MOVLW 0xc0', 'MOVLB 0x2',
                          'SUBWF 0xc4,W', 'BNZ 0x1a278', 'MOVLB 0x2', 'MOVLW 0x01', 'MOVWF 0xc3', 'MOVLB 0x2',
                          'MOVLW 0x49', 'MOVWF 0xc4', 'BRA 0x1a290', 'MOVLB 0x2', 'DECF 0xc3,W', 'BNZ 0x1a288',
                          'MOVLW 0x49', 'MOVLB 0x2', 'SUBWF 0xc4,W', 'BNZ 0x1a288', 'BRA 0x1a290', 'MOVLB 0x2',
                          'SETF 0xc3', 'MOVLB 0x2', 'SETF 0xc4'])

    def test_it_reads_bytes_0_and_2_in_autoselect_and_the_version_reply_calls_it(self):
        code = application()
        self.assertEqual(window(code, ID_READ, 12),
                         ['CALL 0x1a710', 'MOVLB 0x2', 'CLRF 0x33', 'CLRF 0x34', 'CLRF 0x35', 'CALL 0x1ffe54',
                          'MOVFF 0x236,0x2c3', 'MOVLB 0x2', 'MOVLW 0x02', 'MOVWF 0x33', 'CLRF 0x34', 'CLRF 0x35'])
        self.assertEqual(ram_window(code, 0x1FFF1A, 4), ['RCALL 0x1ffe5c', 'MOVLB 0x2', 'MOVLW 0x90', 'MOVWF 0x39'])
        self.assertEqual(transfers_to(code, ID_READ), [0x15C4E])


class TheEraseCommand(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_the_case_sets_state_8_and_checks_the_three_address_bytes(self):
        self.assertEqual(chains.chain_table(self.code, BASE, DISPATCH)[0xD0], ERASE_CASE)
        self.assertEqual(window(self.code, ERASE_CASE, 3), ['MOVLB 0x2', 'MOVLW 0x08', 'MOVWF 0x62'])
        self.assertEqual(window(self.code, 0x158FC, 6),
                         ['MOVFF 0x25b,0x23f', 'MOVFF 0x25c,0x240', 'MOVFF 0x25d,0x241', 'CALL 0x19b5c',
                          'IORLW 0x00', 'BNZ 0x1594e'])

    def test_the_outer_check_is_a_floor_and_an_unlock_test_and_no_ceiling(self):
        self.assertEqual(window(self.code, OUTER_CHECK, 12),
                         ['MOVLW 0x00', 'MOVLB 0x2', 'SUBWF 0x3f,W', 'MOVLW 0x00', 'SUBWFB 0x40,W', 'MOVLW 0x01',
                          'SUBWFB 0x41,W', 'BC 0x19b72', 'MOVF 0x3a,W', 'BNZ 0x19b72', 'RETLW 0x01', 'RETLW 0x00'])

    def test_a_passed_erase_runs_in_the_parse_and_F0_D0_follows_whatever_it_did(self):
        self.assertEqual(window(self.code, 0x15948, 2), ['CALL 0x1a2fa', 'BRA 0x15a18'])
        self.assertEqual(window(self.code, ERASE_WRAPPER, 7),
                         ['CALL 0x1a710', 'MOVFF 0x080,0x233', 'MOVFF 0x081,0x234', 'MOVFF 0x082,0x235',
                          'CALL 0x1ffe52', 'CALL 0x1a720', 'RETURN'])
        self.assertEqual(chains.chain_table(self.code, BASE, EXECUTOR_SWITCH)[8], 0x15E84)
        self.assertEqual(window(self.code, 0x15E84, 8),
                         ['MOVLB 0x1', 'MOVLW 0xf0', 'MOVWF 0xaf', 'MOVFF 0x266,0x1ae', 'CALL 0x11f44', 'MOVLB 0x1',
                          'MOVLW 0xd0', 'BRA 0x15eaa'])

    def test_a_refused_erase_shows_error_2_and_sends_nothing(self):
        self.assertEqual(window(self.code, 0x1594E, 7),
                         ['MOVLB 0x1', 'CLRF 0xf3', 'MOVLB 0x1', 'MOVLW 0x02', 'MOVWF 0xf2', 'CALL 0x169f4',
                          'BRA 0x15b1e'])
        # 0x2B4 is cleared before the switch and only a parse that completes sets it, so the state drops.
        self.assertEqual(window(self.code, 0x15838, 1), ['CLRF 0xb4'])
        self.assertEqual(window(self.code, 0x15B1E, 5), ['MOVLB 0x2', 'MOVF 0xb4,W', 'BNZ 0x15b28', 'MOVLB 0x2',
                                                         'CLRF 0x62'])
        # 0x169F4 hangs only when data 0x1F3 is 1, and the refusal clears it first.
        self.assertEqual(window(self.code, 0x16A0A, 5),
                         ['MOVLB 0x1', 'DECF 0xf3,W', 'BNZ 0x16a12', 'BRA 0x16a10', 'RETURN'])


class TheWriteCommand(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_the_length_nibble_keeps_0_to_7_maps_8_9_10_to_15_31_63_and_leaves_11_to_15(self):
        self.assertEqual(window(self.code, 0x157E0, 19),
                         ['MOVLW 0x0f', 'ANDWF 0xb2,W', 'MOVWF 0xb3', 'MOVF 0xb3,W', 'SUBLW 0x07', 'BC 0x15806',
                          'MOVF 0xb3,W', 'XORLW 0x0a', 'BZ 0x15802', 'XORLW 0x03', 'BZ 0x157fe', 'XORLW 0x01',
                          'BNZ 0x15806', 'MOVLW 0x0f', 'BRA 0x15804', 'MOVLW 0x1f', 'BRA 0x15804', 'MOVLW 0x3f',
                          'MOVWF 0xb3'])
        # The chain's case values are the running XOR: 0x0A, 0x09, 0x08.
        self.assertEqual(sorted(c.value for c in chains.xor_chain(self.code, BASE, 0x157EE)), [0x09, 0x0A])
        self.assertEqual(0x0A ^ 0x03 ^ 0x01, 0x08)

    def test_the_announce_sets_state_2_shares_the_reads_parse_and_replies_nothing(self):
        self.assertEqual(chains.chain_table(self.code, BASE, DISPATCH)[0x30], 0x15880)
        self.assertEqual(window(self.code, 0x15880, 4), ['MOVLB 0x2', 'MOVLW 0x02', 'BRA 0x1588a', 'MOVLB 0x2'])
        self.assertEqual(window(self.code, 0x15BC2, 7),
                         ['MOVLB 0x2', 'CLRF 0xb2', 'MOVLW 0x02', 'MOVLB 0x2', 'SUBWF 0x62,W', 'BNZ 0x15bd0',
                          'RETLW 0x00'])

    def test_a_data_packet_is_0x40_or_0xF0_and_anything_else_ends_the_transfer(self):
        self.assertEqual(window(self.code, DATA_PACKET, 6),
                         ['MOVLB 0x2', 'MOVF 0xb2,W', 'XORLW 0xf0', 'BZ 0x15af8', 'XORLW 0xb0', 'BNZ 0x15b1e'])
        self.assertEqual(0xF0 ^ 0xB0, 0x40)
        # Done: one byte read, compared with nothing, state 3; the executor sends F0 30 untested.
        self.assertEqual(window(self.code, 0x15AF8, 6),
                         ['MOVFF 0x265,0x1b2', 'CALL 0x11f5e', 'MOVLB 0x2', 'MOVWF 0xbe', 'MOVLB 0x2', 'MOVLW 0x03'])
        self.assertEqual(chains.chain_table(self.code, BASE, EXECUTOR_SWITCH)[3], 0x15CF8)
        self.assertEqual(window(self.code, 0x15CF8, 8),
                         ['MOVLB 0x1', 'MOVLW 0xf0', 'MOVWF 0xaf', 'MOVFF 0x266,0x1ae', 'CALL 0x11f44', 'MOVLB 0x1',
                          'MOVLW 0x30', 'BRA 0x15d24'])

    def test_a_one_byte_packet_at_0x000106_sets_the_unlock_and_nothing_else(self):
        self.assertEqual(window(self.code, 0x15A96, 15),
                         ['MOVLW 0x06', 'MOVLB 0x2', 'XORWF 0x5b,W', 'BNZ 0x15abc', 'MOVLW 0x01', 'XORWF 0x5c,W',
                          'BNZ 0x15abc', 'MOVF 0x5d,W', 'BNZ 0x15abc', 'MOVLB 0x2', 'DECF 0xb3,W', 'BNZ 0x15abc',
                          'MOVFF 0x265,0x1b2', 'CALL 0x11f5e', 'MOVLB 0x2'])
        # The byte into data 0x23A and out, past the pending flag the drain waits for.
        self.assertEqual(window(self.code, 0x15AB8, 4), ['MOVWF 0x3a', 'BRA 0x15b18', 'MOVLB 0x2', 'MOVLW 0x01'])
        self.assertEqual(window(self.code, 0x15ABE, 2), ['MOVLW 0x01', 'MOVWF 0x63'])

    def test_the_unlock_is_cleared_at_start_before_a_sleep_and_by_the_logs_migration(self):
        self.assertEqual(window(self.code, CLEAR_UNLOCK, 3), ['MOVLB 0x2', 'CLRF 0x3a', 'RETURN'])
        self.assertEqual(transfers_to(self.code, CLEAR_UNLOCK), [0x16E4E, 0x16FF0])
        # The second is the top level mode 2, the ordinary sleep.
        self.assertEqual(chains.chain_table(self.code, BASE, 0x16F6E)[2], 0x16FF0)
        self.assertEqual(window(self.code, 0x16FF0, 3), ['CALL 0x19b56', 'CALL 0x1a70a', 'CALL 0x1814c'])
        self.assertEqual(window(self.code, 0x1849C, 3), ['MOVLB 0x2', 'MOVLW 0xa7', 'MOVWF 0x3a'])
        self.assertEqual(window(self.code, 0x184BE, 2), ['MOVLB 0x2', 'CLRF 0x3a'])

    def test_one_byte_left_at_0x000104_appends_to_the_log_instead(self):
        self.assertEqual(window(self.code, DRAIN, 26),
                         ['MOVLB 0x2', 'MOVF 0x63,W', 'BZ 0x15bc0', 'CLRF 0x63', 'MOVLW 0x04', 'XORWF 0x5b,W',
                          'BNZ 0x15b78', 'MOVLW 0x01', 'XORWF 0x5c,W', 'BNZ 0x15b78', 'MOVF 0x5d,W', 'BNZ 0x15b78',
                          'MOVLW 0x01', 'XORWF 0x5e,W', 'BNZ 0x15b78', 'MOVF 0x5f,W', 'BNZ 0x15b78', 'MOVLB 0x2',
                          'MOVLW 0x87', 'MOVWF 0xb6', 'MOVLW 0x00', 'MOVWF 0xb7', 'MOVFF 0x2b6,0xfe9',
                          'MOVFF 0x2b7,0xfea', 'MOVFF 0xfef,0x107', 'CALL 0x1836e'])

    def test_the_log_append_programs_a_byte_into_the_first_blank_slot_without_unlocking(self):
        body = [text(ins) for _, ins in listing(self.code, LOG_APPEND, 0x18408)]
        self.assertEqual(body[:6], ['MOVLB 0x2', 'MOVLW 0x40', 'MOVWF 0xb3', 'MOVLW 0x01', 'MOVWF 0xb4', 'CLRF 0xb5'])
        self.assertIn('CALL 0x1ffe56', body)
        self.assertNotIn('MOVLW 0xa7', body)
        self.assertEqual([t for t in body if t.endswith(' 0x3a') or t.startswith('MOVWF 0x3a')], [])
        # Eight slots, the first that reads 0xFF.
        self.assertIn('MOVLW 0x08', body)
        self.assertIn('SUBLW 0xff', body)

    def test_the_drain_programs_through_one_call_and_advances_the_address_whatever_happened(self):
        self.assertEqual(window(self.code, 0x15B8E, 5),
                         ['MOVFF 0x264,0x0c8', 'CALL 0x1904a', 'MOVFF 0x080,0x25b', 'MOVFF 0x081,0x25c',
                          'MOVFF 0x082,0x25d'])
        self.assertEqual(window(self.code, 0x1904A, 7),
                         ['MOVFF 0x0c9,0x1fe', 'MOVFF 0x0ca,0x1ff', 'MOVFF 0x0c8,0x1fd', 'CALL 0x1a2d0',
                          'MOVFF 0x0c8,0x0d1', 'RCALL 0x191aa', 'RETLW 0x01'])
        self.assertEqual(window(self.code, 0x1A2EC, 3), ['CALL 0x1ffe58', 'CALL 0x1a720', 'MOVLW 0x01'])

    def test_the_count_is_decremented_and_no_3150_literal_exists(self):
        self.assertEqual(window(self.code, 0x15BAE, 9),
                         ['MOVLB 0x2', 'MOVF 0x64,W', 'MOVWF 0x000', 'CLRF 0x001', 'MOVF 0x000,W', 'SUBWF 0x5e',
                          'MOVF 0x001,W', 'SUBWFB 0x5f', 'CLRF 0x64'])
        loads = [ins.fields['k'] for _, ins in listing(self.code, BASE, CODE_END) if ins.mnemonic == 'MOVLW']
        pairs = {(a, b) for a, b in zip(loads, loads[1:])}
        self.assertNotIn((0x0C, 0x4E), pairs)
        self.assertNotIn((0x4E, 0x0C), pairs)


if __name__ == '__main__':
    unittest.main()
