"""
How a write ends on the Harmony 880 and 885: the misc selectors, the escape, and a restart that alone takes
up a new configuration.

**Read in the firmware** on 4 November 2026, item 1.5 of `todo/todo-prepare-885.md`, in the 885's
application 4.4 (`arch8_code_885`, base `0x010000`; the 880's differs in the skin bytes only). No remote
was opened. Decoded through `harmony.pic18.isa` and `harmony.pic18.chains`, the hand read fall through
cases marked.

**Sources checked before the work**: `reference/usb-protocol/commands.md`, the Harmony One's and the
Harmony 600, 650 and 700's misc selectors, escape and eight step write; `tests/test_arch8_usb.py`, whose
header said the dispatch has no case for the escape and named an unidentified chain at `0x14B12`;
`tests/test_harmony_885_bootloader.py`, the bootloader's escape and four write misc selectors. **Logitech's
client, decision 2**: the classic client's command class names are the selector names below; for a
configuration on this architecture its update service sends the flash invalidate, writes with erase,
erases the event range the configuration's header states, verifies, and then, because it requires a hard
reset for every architecture below 9, sends the diagnostic reset (`0xE0` code 2), waits up to 20 seconds,
writes the saved state variables back and sets the time. It never writes the status byte for a
configuration. Stated by Logitech, in their client, and not asserted. MyHarmony holds no packet sequence for
this platform, so the classic client is Logitech's only statement. **concordance** ends a write on every
remote with a restart through the escape's `0x02`, and reads a state word on arch 8 as `B3 01 hi lo` with
the value in the reply's third and fourth bytes.

## The escape is handled, before the switch

The parser `0x157D4` masks the command and compares it with `0xE0` at `0x1580A` before the state dispatch
and the command switch, which is why the seven case switch at `0x15854` holds no escape. Sub codes `0x02`
and `0x03` (decoded by `chains`) set data `0x3F3`; `0x01`, the fall through after the third `XORLW`
(`0x02 ^ 0x01 ^ 0x02`), clears the command state. None replies. Any other sub code goes on into the
ordinary dispatch with command `0xE0`, finds no case and is dropped, so the `0x04` Logitech's diagnostics
can send does nothing. **This corrects `tests/test_arch8_usb.py` and the architecture's usb page**, which
said neither the session end nor the restart is reached: true of the switch, wrong of the firmware.

**The restart**: the main loop turns `0x3F3` into top level mode 3 (`0x16F20` to `0x16F2A`); mode 3
(`0x16FCA`, from the mode switch at `0x16F6E`) writes the USB controller's register (`0x1221A`), loads 500
into the countdown the message routine loads with 3000, waits for it, and executes `RESET` at `0x16FEC`.
Half a second if a tick is a millisecond, not established. The processor restarts in the bootloader, which
keeps the status byte after a `RESET` instruction (item 1.1), and the application's start routine
`0x180A4` clears `0x3F3`. That the register write detaches from the bus is inferred; the controller is not
identified.

**Every `RESET` instruction in the application's code**, from `0x010400` to the built in configuration:
`0x16FEC`, the escape's restart; `0x18146`, the power down routine's wake (`0x180C6`, called from the
action interpreter at `0x139AE` for an operand high byte of exactly `0xF6`, the last step of a descending
chain whose earlier steps send `0xF7`, `0xF8` and `0xF9` and up elsewhere, `0x13984` to `0x139AE`; reached
through its `0x3F` band as the codec names it on later platforms, inferred and not traced). The routine
returns at once unless input 2 of port B reads high and input 4 of port A low; otherwise it copies RAM
slot 0 and calls it at `0x1FFE02` in a loop, and executes `RESET` once input 2 of port B reads low or input
4 of port A high after a return. That the slot sleeps is inferred. `0x18A12`, **the three key
combination**, tested at every key scan (`0x18A1A` calls `0x189DA` first), when scan codes `0x02`, `0x21`
and `0x20` are all down and inputs 4 and 5 of port B read zero; `0x199C2`, the first word of the flash
routines' RAM copy, slot 1, never run in place; and `0x1A764`, the first word of RAM slot 0, `0x1A764` to
`0x1A7B2`, which `0x19D28` copies at start (`0x16D74`) and before the power down's loop (`0x1811A`,
`0x18188`), entered at `0x1FFE02`, its second word, so also never run in place. **A correction from the
blind reviewer**: this header first called `0x1A764` a `RESET` no instruction reaches, which is true of
control flow and missed the copy, and gave the power down's operand as `0xF6` and up and its wake
condition as port A alone. So the combination restarts by
the `RESET` instruction and, by the bootloader's reset cause test, keeps the status byte; that `0xFD0` is
the reset control register is inferred from the PIC18 family, item 1.1. Which printed keys have those scan
codes is not established.

## Only a start takes up a configuration

The start check (`tests/test_harmony_885_start_check.py`) and the state table loader `0x172AA` run once,
at start: the loader's one caller is main's start sequence at `0x16E3E`. So a configuration written over a
running remote is checked, and its state table sized, only after a restart. Write misc selector 2 moves
every seek to the built in configuration until then, which is its use in a write: the remote stops reading
the region being rewritten. Without it the remote reads the region while it changes, with the old table
sizes.

## The misc selectors

**Write misc**, `0xA_`: the parse (`0x1595E`) sets state 9 and always takes five bytes, whatever the length
nibble: the selector, then `b1` to `b4`. All work is done at parse time, from the chain at `0x159A2`,
`{08, 05, 07, 06, 02, 01}`, and executor state 9 answers `F0 A0` for every one of them. **Any other selector,
`0x0A` and `0x0B` included, drops the command state with no reply.**

| selector | what it does | Logitech's name |
|---|---|---|
| `0x01` | writes state variable `b2` with `b3:b4`; an index at or above narrow plus wide is refused and still acknowledged | write state |
| `0x02` | `0x163BE`, the walk over two cached region records, and clears bits 2 and 3 of data `0x086` | invalidate flash |
| `0x05` | `b1` zero: interrupts off (`INTCON` bits 6 and 7 cleared); otherwise on | enable interrupt |
| `0x06` | the status byte: `b1` must be 0, then data `0x100` takes `b2` | write RAM |
| `0x07` | `b3` to data memory at `b1:b2`, through `FSR0`, no bound, the special function registers included | not named |
| `0x08` | `0x15598`, the clock recalculate, which does nothing unless a configuration passed | clock recalculate |

**Read misc**, `0xB_`: state 10, the selector and a sixteen bit address. The reply is `C2`, the selector, and
**two** bytes, both cleared first. Selector `0x07` (decoded) returns data memory at the address, no bound;
`0x06` (decoded) the status byte when the address high byte is 0; `0x01`, the fall through after the third
`XORLW` (`0x07 ^ 0x01 ^ 0x07`), the state variable at the address low byte, high byte then low; anything
else two zeros. A host reading a one byte value from the third byte gets 0 for every narrow state variable,
the trap `reference/usb-protocol/commands.md` records on the Harmony 525.

## The state variables and the clock

The loader seeks raw slot 14, base slot 13 on this architecture, keeps narrow in data `0x148` and wide in
`0x149`, stores each variable's starting value unless the record says `0xFEFE`, and paints `0xFE` from
`0x108 + narrow + 2 * wide` up to `0x108 + 0x40`. A narrow variable `i` lives at `0x108 + i`. **Over the 16
arch 8 configurations of the start check's calibration, narrow is 32 to 40 and wide is 1 in every one**, so
narrow plus twice wide runs from 34 to 42 of the 64 bytes and variables 0 to 6, the clock, are narrow at
`0x108` to `0x10E`. So clock variable `i` reads as `B3 01 00 0i` (value in the reply's fourth byte) or as
`B3 07 01 08` to `B3 07 01 0E` (value in the third). Its order, second, minute, hour, day, weekday, month, year, is
the clients' and the reference's. **The storage is 64 bytes and the counts sit right after it**, at
`0x148`: a configuration with narrow plus twice wide above 64 would write over them. Read, and not checked
against the action interpreter's own variable writes; a candidate for the rail table, item 3.3.

## The chain at `0x14B12` is not USB

It is the entry type switch of the infrared send queue's drain (`0x14A56`), on data `0x2B8` in bank 2, the
top three bits of the queue entry being looked at (`ANDLW 0xE0` at `0x14A7C`): `0xE0`, `0xC0` and `0xA0`
decoded, `0x80` the fall through. The queue is a ring at data `0x15D` to `0x17A`. That the release rules
mean what the reading says, and which instruction pushes which entry type, is inferred and is the action
interpreter's subject (item 3.1). `tests/test_arch8_usb.py` named its variable `0x0B8` and called it
unidentified; it is corrected there.

## A configuration write on this platform

Against the eight step sequence of the Harmony One and the Harmony 600, 650 and 700: step 1, `E1 01`, is
optional; **step 2, write misc `0x0A`, has no counterpart, and sending it gets no reply at all**; step 3,
status 0 and its read back, is harmless and worth keeping as a read, since a nonzero status turns the
restart into an application install; step 4, selector 2, answers `F0 A0` and keeps the remote off the
region; steps 5 and 6 as on every platform (`tests/test_harmony_885_erase_and_write.py`); **step 7, status 2,
must not be sent**: the bootloader would erase `0x010000` and copy 64 KiB from `0x1D0000` over the
application at the restart (item 1.1); step 8, `E1 02`, no reply, and the remote comes back through its
bootloader. Setting the clock after, if wanted, is selector 1 for the seven clock variables and then
selector 8, as both clients do.

## Open

What selector 8's value is for; whether the clock survives the restart (RAM survives a `RESET`
instruction and the loader skips a variable whose record says `0xFEFE`; whether the clock records say that
is not read); what `0x1221A` does to the USB controller; and what a stray `F0 A0` left unread by
concordance's time set does to the next exchange.

## Reviewers

Recorded in the commit that landed this file.
"""
import struct
import unittest

import lab
from harmony import ezfile
from harmony.pic18 import chains
from test_harmony_885_start_check import (BASE, CALIBRATION, CODE_END, USER_BASE, application, by_name, listing,
                                          text, transfers_to, window)

DISPATCH = 0x15854
EXECUTOR_SWITCH = 0x15BD2
ESCAPE_CHAIN = 0x1581E
WRITE_MISC = 0x1595E
WRITE_MISC_CHAIN = 0x159A2
READ_MISC_CHAIN = 0x15EDE
MODE_SWITCH = 0x16F6E
RESTART = 0x16FCA
KEY_COMBINATION = 0x189DA
POWER_DOWN = 0x180C6
STATE_LOADER = 0x172AA
QUEUE_SWITCH = 0x14B14
# The application's code proper starts at its interrupt vectors; below them is the header and data.
CODE_START = 0x010400
STATE_SLOT_RAW = 14


class TheEscapeIsHandledBeforeTheSwitch(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_the_switch_has_no_escape_and_the_parser_tests_for_it_first(self):
        self.assertNotIn(0xE0, chains.chain_table(self.code, BASE, DISPATCH))
        self.assertEqual(window(self.code, 0x15806, 5),
                         ['MOVLW 0xf0', 'ANDWF 0xb2', 'MOVLW 0xe0', 'SUBWF 0xb2,W', 'BNZ 0x15838'])

    def test_0x02_and_0x03_set_the_restart_flag_and_0x01_clears_the_command_state(self):
        cases = chains.xor_chain(self.code, BASE, ESCAPE_CHAIN)
        self.assertEqual(sorted(c.value for c in cases), [0x02, 0x03])
        self.assertEqual({c.target for c in cases}, {0x15830})
        self.assertEqual(window(self.code, 0x15830, 4), ['MOVLB 0x3', 'MOVLW 0x01', 'MOVWF 0xf3', 'RETLW 0x00'])
        # The 0x01 case: the third XORLW leaves 0x02 ^ 0x01 ^ 0x02 and falls through; not equal goes on
        # into the ordinary dispatch.
        chain = window(self.code, ESCAPE_CHAIN, 9)
        xors = [int(t.split()[1], 16) for t in chain if t.startswith('XORLW')]
        self.assertEqual(xors[0] ^ xors[1] ^ xors[2], 0x01)
        self.assertEqual(chain[5:], ['BNZ 0x15838', 'MOVLB 0x2', 'CLRF 0x62', 'RETLW 0x00'])

    def test_the_restart_is_mode_3_which_waits_500_ticks_and_executes_reset(self):
        self.assertEqual(window(self.code, 0x16F20, 6),
                         ['MOVLB 0x3', 'MOVF 0xf3,W', 'BZ 0x16f2c', 'MOVLB 0x2', 'MOVLW 0x03', 'MOVWF 0xa7'])
        self.assertEqual(chains.chain_table(self.code, BASE, MODE_SWITCH)[3], RESTART)
        self.assertEqual(window(self.code, RESTART, 12),
                         ['CALL 0x1221a', 'MOVLB 0x0', 'MOVLW 0xf4', 'MOVWF 0xf6', 'MOVLW 0x01', 'MOVWF 0xf7',
                          'CALL 0x19cae', 'MOVLB 0x0', 'MOVF 0xe0,W', 'BNZ 0x16fe8', 'CALL 0x19be2', 'BRA 0x16fdc'])
        self.assertEqual(window(self.code, 0x16FE8, 2), ['CALL 0x19bdc', 'RESET'])

    def test_the_start_routine_clears_the_flag_and_keeps_the_status_after_a_reset_instruction(self):
        self.assertEqual(window(self.code, 0x180AC, 12),
                         ['MOVLB 0x3', 'CLRF 0xf3', 'CALL 0x1a754', 'IORLW 0x00', 'BNZ 0x180c2', 'MOVLB 0x1',
                          'CLRF 0x03', 'MOVLB 0x1', 'CLRF 0x02', 'RCALL 0x18278', 'GOTO 0x1a75a', 'MOVF 0xf81,W'])
        self.assertEqual(window(self.code, 0x1A754, 3), ['BTFSS 0xfd0,4', 'RETLW 0x01', 'RETLW 0x00'])


class EveryResetInTheApplication(unittest.TestCase):
    def test_five_reset_instructions_and_what_each_is(self):
        code = application()
        resets = [a for a, ins in listing(code, CODE_START, CODE_END) if ins.mnemonic == 'RESET']
        self.assertEqual(resets, [0x16FEC, 0x18146, 0x18A12, 0x199C2, 0x1A764])
        # The last two are the first words of the two RAM slots, so control never reaches them in place:
        # slot 0 is 0x1A764 to 0x1A7B2, loaded by 0x19D28 with 0x14 = 0 and 0x15 = 1.
        self.assertEqual(transfers_to(code, 0x1A764), [])
        self.assertEqual(transfers_to(code, 0x199C2), [])
        for at in (0x16D74, 0x1811A, 0x18188):
            self.assertEqual(window(code, at, 12),
                             ['MOVLW 0x64', 'MOVWF 0x16', 'MOVLW 0xa7', 'MOVWF 0x17', 'MOVLW 0x01', 'MOVWF 0x18',
                              'MOVLB 0x2', 'MOVLW 0x01', 'MOVWF 0x15', 'MOVLB 0x2', 'CLRF 0x14', 'CALL 0x19d28'])
        self.assertEqual(window(code, 0x1810C, 6),
                         ['MOVLW 0xb2', 'MOVWF 0x19', 'MOVLW 0xa7', 'MOVWF 0x1a', 'MOVLW 0x01', 'MOVWF 0x1b'])

    def test_the_three_key_combination_is_tested_at_every_key_scan(self):
        code = application()
        self.assertEqual(window(code, 0x18A16, 3), ['MOVLB 0x2', 'CLRF 0xb3', 'RCALL 0x189da'])
        self.assertEqual(transfers_to(code, KEY_COMBINATION), [0x18A1A])
        self.assertEqual(window(code, 0x189E6, 24),
                         ['MOVLW 0x30', 'ANDWF 0xf81,W', 'BZ 0x189ee', 'BRA 0x18a14', 'MOVLB 0x2', 'MOVLW 0x02',
                          'MOVWF 0x97', 'RCALL 0x1895c', 'IORLW 0x00', 'BZ 0x18a14', 'MOVLB 0x2', 'MOVLW 0x21',
                          'MOVWF 0x97', 'RCALL 0x1895c', 'IORLW 0x00', 'BZ 0x18a14', 'MOVLB 0x2', 'MOVLW 0x20',
                          'MOVWF 0x97', 'RCALL 0x1895c', 'IORLW 0x00', 'BZ 0x18a14', 'RESET', 'RETURN'])

    def test_the_power_down_routine_restarts_on_its_wake_and_the_action_interpreter_calls_it_for_0xF6(self):
        code = application()
        self.assertEqual(transfers_to(code, POWER_DOWN), [0x139AE])
        # A descending chain: 0xF9 and up, 0xF8 and 0xF7 go elsewhere first, so this call is for 0xF6 alone.
        self.assertEqual([t for t in window(code, 0x13984, 19) if t.startswith(('MOVLW', 'CALL'))],
                         ['MOVLW 0xf9', 'CALL 0x15598', 'MOVLW 0xf8', 'CALL 0x155f0', 'MOVLW 0xf7', 'CALL 0x16698',
                          'MOVLW 0xf6', 'CALL 0x180c6'])
        # Entry: input 2 of port B high and input 4 of port A low, or return.
        self.assertEqual(window(code, POWER_DOWN, 5),
                         ['MOVF 0xf81,W', 'ANDLW 0x04', 'BZ 0x1814a', 'MOVF 0xf80,W', 'ANDLW 0x10'])
        self.assertEqual(window(code, 0x180D0, 1), ['BNZ 0x1814a'])
        # The loop: slot 0 at 0x1FFE02, then RESET when port B input 2 is low or port A input 4 high.
        self.assertEqual(window(code, 0x18136, 9),
                         ['CALL 0x1ffe02', 'MOVF 0xf81,W', 'ANDLW 0x04', 'BZ 0x18146', 'MOVF 0xf80,W', 'ANDLW 0x10',
                          'BZ 0x18148', 'RESET', 'BRA 0x18136'])


class OnlyAStartTakesUpAConfiguration(unittest.TestCase):
    def test_the_state_table_loader_runs_from_mains_start_alone(self):
        code = application()
        self.assertEqual(transfers_to(code, STATE_LOADER), [0x16E3E])
        # Raw slot 14, base slot 13 on this architecture.
        self.assertEqual(window(code, 0x172C2, 4), ['MOVLB 0x0', 'MOVLW 0x0e', 'MOVWF 0xd3', 'CALL 0x191de'])
        self.assertEqual(window(code, 0x172F0, 1), ['MOVFF 0x2b3,0x148'])
        self.assertEqual(window(code, 0x17302, 1), ['MOVFF 0x2b3,0x149'])

    def test_the_storage_is_64_bytes_from_0x108_painted_0xFE_above_the_variables(self):
        code = application()
        # Narrow plus twice wide, then 0xFE up to 0x40 from 0x108.
        self.assertEqual(window(code, 0x17362, 4), ['MOVLB 0x1', 'MOVF 0x49,W', 'ADDWF 0xfe8,W', 'ADDWF 0x48,W'])
        self.assertEqual(window(code, 0x17388, 12),
                         ['MOVLW 0x40', 'MOVLB 0x2', 'SUBWF 0xb2,W', 'BC 0x173a4', 'MOVF 0xb2,W', 'CLRF 0xfea',
                          'ADDLW 0x08', 'MOVWF 0xfe9', 'MOVLW 0x01', 'ADDWFC 0xfea', 'MOVLW 0xfe', 'MOVWF 0xfef'])
        # A record of 0xFEFE leaves the variable as it is.
        self.assertEqual(window(code, 0x17340, 6),
                         ['MOVLW 0xfe', 'MOVLB 0x2', 'XORWF 0xb7,W', 'BNZ 0x1734c', 'MOVLW 0xfe', 'XORWF 0xb8,W'])
        # A narrow variable i is read at 0x108 + i.
        self.assertEqual(window(code, 0x17720, 6),
                         ['MOVF 0x5a,W', 'CLRF 0xfea', 'ADDLW 0x08', 'MOVWF 0xfe9', 'MOVLW 0x01', 'ADDWFC 0xfea'])

    def test_every_configuration_has_7_or_more_narrow_variables_and_one_wide(self):
        lab.require('arch8_code_885')
        counts = []
        for name, blob in zip(CALIBRATION, by_name(*CALIBRATION)):
            payload = ezfile.parse_ezhex(blob, name).payload
            pointer = 0x0B + 4 * STATE_SLOT_RAW
            at = int.from_bytes(payload[pointer + 1:pointer + 4], 'little') - USER_BASE
            _, narrow, wide, _ = struct.unpack_from('<4H', payload, at)
            counts.append((narrow, wide))
        self.assertEqual(sorted({n for n, _ in counts}), [32, 33, 35, 36, 37, 40])
        self.assertEqual({w for _, w in counts}, {1})
        self.assertEqual((min(n + 2 * w for n, w in counts), max(n + 2 * w for n, w in counts)), (34, 42))


class TheMiscSelectors(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_write_misc_takes_five_bytes_and_serves_six_selectors(self):
        self.assertEqual(window(self.code, WRITE_MISC, 3), ['MOVLB 0x2', 'MOVLW 0x09', 'MOVWF 0x62'])
        reads = [a for a, ins in listing(self.code, WRITE_MISC, WRITE_MISC_CHAIN) if text(ins) == 'CALL 0x11f5e']
        self.assertEqual(len(reads), 5)
        table = {c.value: c.target for c in chains.xor_chain(self.code, BASE, WRITE_MISC_CHAIN)}
        self.assertEqual(sorted(table), [0x01, 0x02, 0x05, 0x06, 0x07, 0x08])
        # Not one of them: the state is dropped with no reply.
        self.assertEqual(window(self.code, 0x159BA, 1), ['BRA 0x15b1e'])

    def test_each_selector_does_what_the_table_says(self):
        self.assertEqual(window(self.code, 0x159BC, 2), ['MOVFF 0x2b7,0x156', 'CALL 0x176c0'])
        self.assertEqual(window(self.code, 0x176C0, 7),
                         ['MOVLB 0x1', 'MOVF 0x48,W', 'ADDWF 0x49,W', 'SUBWF 0x56,W', 'BC 0x176cc', 'RETLW 0x01',
                          'RETLW 0x00'])
        self.assertEqual(window(self.code, 0x159DC, 4), ['CALL 0x163be', 'MOVLB 0x0', 'BCF 0x86,2', 'BCF 0x86,3'])
        self.assertEqual(window(self.code, 0x15A04, 6),
                         ['MOVF 0xb8,W', 'BNZ 0x15a0e', 'CALL 0x1a70a', 'BRA 0x15b18', 'CALL 0x1a704', 'BRA 0x15b18'])
        self.assertEqual(window(self.code, 0x1A704, 6),
                         ['BSF 0xff2,6', 'BSF 0xff2,7', 'RETURN', 'BCF 0xff2,6', 'BCF 0xff2,7', 'RETURN'])
        self.assertEqual(window(self.code, 0x159E8, 3), ['MOVFF 0x2b7,0x103', 'MOVFF 0x2b8,0x102', 'CALL 0x18278'])
        self.assertEqual(window(self.code, 0x18278, 4), ['MOVLB 0x1', 'MOVF 0x02,W', 'BNZ 0x18282', 'MOVFF 0x103,0x100'])
        self.assertEqual(window(self.code, 0x159F6, 4),
                         ['MOVFF 0x2b7,0xfe9', 'MOVFF 0x2b8,0xfea', 'MOVFF 0x2ba,0xfef', 'BRA 0x15b1a'])
        self.assertEqual(window(self.code, 0x15A14, 1), ['CALL 0x15598'])

    def test_every_served_selector_is_answered_F0_A0(self):
        self.assertEqual(chains.chain_table(self.code, BASE, EXECUTOR_SWITCH)[9], 0x15E98)
        self.assertEqual(window(self.code, 0x15E98, 10),
                         ['MOVLB 0x1', 'MOVLW 0xf0', 'MOVWF 0xaf', 'MOVFF 0x266,0x1ae', 'CALL 0x11f44', 'MOVLB 0x1',
                          'MOVLW 0xa0', 'MOVWF 0xaf', 'MOVFF 0x266,0x1ae', 'CALL 0x11f44'])
        # Every arm ends where the command is kept for the executor: 0x15B18 or 0x15B1A, which set 0x2B4.
        self.assertEqual(window(self.code, 0x15B18, 3), ['MOVLB 0x2', 'MOVLW 0x01', 'MOVWF 0xb4'])

    def test_read_misc_answers_c2_the_selector_and_two_bytes(self):
        self.assertEqual(chains.chain_table(self.code, BASE, EXECUTOR_SWITCH)[10], 0x15EBA)
        self.assertEqual(window(self.code, 0x15EBA, 15),
                         ['MOVLB 0x1', 'MOVLW 0xc2', 'MOVWF 0xaf', 'MOVFF 0x266,0x1ae', 'CALL 0x11f44',
                          'MOVFF 0x260,0x1af', 'MOVFF 0x266,0x1ae', 'CALL 0x11f44', 'MOVLB 0x2', 'CLRF 0xc1',
                          'CLRF 0xc2', 'MOVLB 0x2', 'MOVF 0x60,W', 'XORLW 0x07', 'BZ 0x15f16'])
        self.assertEqual(window(self.code, 0x15F22, 6),
                         ['MOVFF 0x2c2,0x1af', 'MOVFF 0x266,0x1ae', 'CALL 0x11f44', 'MOVFF 0x2c1,0x1af',
                          'MOVFF 0x266,0x1ae', 'CALL 0x11f44'])

    def test_read_misc_serves_7_6_and_1_by_its_fall_through(self):
        cases = chains.xor_chain(self.code, BASE, READ_MISC_CHAIN)
        self.assertEqual(sorted(c.value for c in cases), [0x06, 0x07])
        chain = window(self.code, READ_MISC_CHAIN, 6)
        xors = [int(t.split()[1], 16) for t in chain if t.startswith('XORLW')]
        self.assertEqual(xors[0] ^ xors[1] ^ xors[2], 0x01)
        self.assertEqual(chain[5], 'BNZ 0x15f22')
        # Selector 1: the variable at the address low byte, high byte into the third, low into the fourth.
        self.assertEqual(window(self.code, 0x15EEA, 7),
                         ['MOVFF 0x25b,0x156', 'CALL 0x176c0', 'IORLW 0x00', 'BZ 0x15f22', 'MOVFF 0x25b,0x15a',
                          'CALL 0x17718', 'MOVFF 0xff3,0x2c1'])
        self.assertEqual(window(self.code, 0x15F02, 1), ['MOVFF 0xff4,0x2c2'])
        # Selector 6: the status byte when the address high byte is 0. Selector 7: data memory, no bound.
        self.assertEqual(window(self.code, 0x15F08, 2), ['MOVFF 0x25c,0x101', 'CALL 0x1826c'])
        self.assertEqual(window(self.code, 0x1826C, 6),
                         ['MOVLB 0x1', 'MOVF 0x01,W', 'BNZ 0x18276', 'MOVF 0x00,W', 'RETURN', 'RETLW 0x00'])
        self.assertEqual(window(self.code, 0x15F16, 3),
                         ['MOVFF 0x25b,0xfe9', 'MOVFF 0x25c,0xfea', 'MOVFF 0xfef,0x2c2'])


class TheChainAt0x14B12IsTheSendQueue(unittest.TestCase):
    def test_it_switches_on_an_entrys_top_three_bits_in_bank_2(self):
        code = application()
        self.assertEqual(window(code, 0x14A56, 1), ['MOVLB 0x2'])
        self.assertEqual(window(code, 0x14A78, 5),
                         ['MOVFF 0xfef,0x2b7', 'MOVLW 0xe0', 'ANDWF 0xb7,W', 'MOVWF 0xb8', 'BTFSC 0xb8,7'])
        self.assertEqual(window(code, 0x14B12, 1), ['MOVF 0xb8,W'])
        self.assertEqual(sorted(c.value for c in chains.xor_chain(code, BASE, QUEUE_SWITCH)), [0xA0, 0xC0, 0xE0])
        # The fall through: 0xA0 ^ 0x20 = 0x80.
        self.assertEqual(window(code, 0x14B20, 2), ['XORLW 0x20', 'BNZ 0x14b92'])
        # The read index wraps at 0x17B back to 0x15D: a ring from 0x15D to 0x17A.
        self.assertEqual(window(code, 0x14A8C, 2), ['MOVLW 0x7b', 'SUBWF 0xb2,W'])
        self.assertEqual(window(code, 0x14B06, 4), ['MOVLW 0x5d', 'MOVWF 0xb2', 'MOVLW 0x01', 'MOVWF 0xb3'])


if __name__ == '__main__':
    unittest.main()
