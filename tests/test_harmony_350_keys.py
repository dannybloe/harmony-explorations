#!/usr/bin/env python3
"""The Harmony 300 and 350's scan codes: what the 1.4 firmware numbers a key, and which key is which.

`todo-compile-350.md` 2.2. Until this file nothing tied a key on this family to the number the remote's
keypad scanner gives it, so the configuration's key maps could be read and not understood. Two halves:
the firmware half here says what a key code **is** on this image, read; the configuration half here and in
`packages/bench/test/keys350.test.ts` says **which printed key** each code is, measured in the five lab
configurations and partly inferred. The bench half, the infrared receiver hearing every key of the bench
Harmony 350, is `TheBench350HeardEveryKey` at the end of this file, run with
`packages/bench/irtests/350-2-2-keys.json`: of the 41 keys it heard send, the 38 the table had decided
came out as decided, and the other three settled one favourite and the arrow pair, which the
configurations could not.

## The firmware half, read on the 1.4 image (`h350_code`, load base `0x9000`)

* **The application scans the keypad with the routine safe mode and the bootloader use**, the boot test's
  `TheKeys`: `0x1892A` drives every line high, tests a three key restart at `0x18942`, then pulls one drive
  line low at a time and reads the four returns through `0x188C8`, which answers 1 to 4 for `PORTB` bits 4
  to 7. The drive lines are `PORTE` bits 0 to 6 (lines 0 to 6, the loop at `0x18982` counting to 7 under
  mask `0x7F`), `PORTA` bits 3 to 5 (lines 7 to 9, `0x189EA`, mask `0x38`, plus 8) and `PORTD` bits 0 to 3
  (lines 10 to 13, `0x18A54`, mask `0x0F`, plus 11), and `0x18AB4` returns `4 * line + return`. So a key
  is numbered **1 to 56**, fourteen lines of four, and 0 is no key. The literals and port operations of the
  routine are safe mode's at `0x6948` one for one, 34 of 34, the restart's three keys included.
* **There is no lookup table between the matrix and the configuration.** The code the scan returns is
  carried through `0x713` into `0x711` and handed to the key lookup as it is, with an event type in the
  top two bits, so **a key map's tag is an event type plus the scan code**, mask `0xC0` and `0x3F`, the
  split `CLAUDE.md` warns about. Three types are raised, each read where it is ORed in:
  * `0x80`, **press**, at `0x18B4A`, when a new key is found down (`0x18B30`, reached from `0x18BEC`);
  * `0x40`, **release**, at `0x18B84` when no key is down any more and at `0x18BCE` when a different
    key replaces the held one;
  * `0xC0`, **held**, at `0x18AEA`, raised once a timer runs out that the press arms at `0x18B58` with
    the value in `0x200` times 100 (`0x1959E` copies it into `0x312`). What sets `0x200`, and the timer's
    unit, are not read.
  The press and the release are raised only when a check at `0x11266` answers 0 (`0x18B42`, `0x18B7C`,
  `0x18BC6`), and the release only after a press armed `0x314`; what that check tests is not read.
* **Tags below `0x40` are not keys.** The firmware raises its own events through the same lookup:
  `0x26`, `0x27` and `0x28` at `0x145FE`, `0x145F8` and `0x145E2`, and `0x2D` to `0x30` at `0x11EA6`, the
  routine the send path calls (the delay test's `0x11EFA` caller), chosen by the send kind in `0x203`
  (the chain at `0x11EAE`: 0, 1, 2 and 3 give `0x2D`, `0x2F`, `0x2E` and `0x30`). Entry 0 of every
  configuration binds those four to lists that switch the output pins band `0xE9` drives. Read as a type
  and a scan, `0x2D` would be "type 0, key 45", which is the trap.

**Width**: arch 16 alone, the one 1.4 image, which Logitech's package names for skins 78, 79 and 104, so
the Harmony 300 and the Harmony 350 alike. The keys' wiring to the matrix is a property of the board, so
which printed key sits on which code is measured per model below.

## The configuration half, measured in the five lab configurations

Three Harmony 350 files (`h350_config`, `h350_programmed_config`, `h350_three_devices_config`) and two
Harmony 300 files (`h300_config`, `h300_programmed_config`).

* **Every tag of every key map entry is a press, a release or a firmware event.** The device maps,
  entries 1 to N, bind presses only: 112, 117, 80, 63 and 133 of them. Entry 0 binds four firmware events
  in all five, presses of the device keys and the activity key, and on the Harmony 350 the device keys'
  releases too. No configuration binds a held event. **54 of the 56 codes are bound** somewhere across the
  five; 43 and 56 are bound by none.
* **The device keys are codes 5, 1, 7 and 4**, read off what entry 0 does with them: each selects one
  device's map, and the map it selects sends from infrared group 0, 1, 2 and 3 respectively, on every
  configuration that binds the key and gives that map codes: code 5 and code 1 on all five, code 7 on the
  two that bind it, code 4 on two of the four that bind it, the other two selecting a map with no codes,
  a device with no infrared commands. Section 265 tied the group to the key on the Harmony 300: TV is
  group 0, Cable/Sat 1, DVD 2 and VCR/Aux 3, each identified in Logitech's catalogue on a configuration
  given one device per key. So code 5 is the top left device key, 1 the top right, 7 the bottom left and 4
  the bottom right on the 350 as well, whatever a given unit prints on them, since the two are one
  moulding. **That last step is inferred**: the 350's group to key mapping is `todo-compile-350.md` 2.3, and
  what is measured on the 350 is thinner than four keys in three files: codes 5 and 1 select groups 0 and 1
  in all three, code 7 is bound in one of them, and code 4 selects group 3 in one and a map with no codes
  in the other two.
* **The two models bind a device key differently.** The Harmony 300 selects the device on the press, in
  both its files. The Harmony 350 switches a pin and starts two timers on the press and selects the device
  on the **release**, in all three. That the 350's two second press is the reason is an inference, and
  nothing here tests it.
  How that two second press is stored is 2.4; no configuration here binds one.
* **Watch TV is code 6**: the one binding of entry 0 that is not a device key, tag `0x86`, is the
  activity, the slots test's reading, and Watch TV is the only key the face gives an activity.
* **Power is code 3**: every device map that binds code 3 either sends a code or tests and writes a state
  variable, the power toggle, 14 bindings over the five files.
* **The five favourite keys are codes 2, 8, 9, 11 and 34**, as a set: on the three files given favourite
  channels, those codes and no others load a number and call the number sender, `0x7A` then `0x1F` band
  `0xF3`. **The configurations cannot say which code is which favourite key**: both 350 files, one
  account, send 1, 2, 3, 4 and 666 from 8, 9, 11, 34 and 2, and the 300 file sends 1, 2, 3 and 666 from 8,
  2, 9 and 34, so the channel order and the key order do not line up the same way on both accounts, and
  nothing here states the order the channels were entered in. The bench run settled one: favourite 5 is
  code 2. Favourites 1 to 4 are 8, 9, 11 and 34 in an order still open.
* **The other 41 keys are named by what they send**, `packages/bench/test/keys350.test.ts`: every code a
  device map sends is named the way the bench's infrared monitor names it, by Logitech's catalogue, and
  each scan's commonest name is the printed key Logitech's compile bound it to. That holds the whole
  table, the census and the names that disagree.
* **What is left the configurations narrow and cannot decide**: the arrow pair beside the direction pad
  is codes 25 and 26, bound in three maps none of which the catalogue names, and Live is 43 or 56, which
  nothing binds. The bench run decided the pair, the upper arrow 25 and the lower 26.

## What Logitech's client gave

Read first, per decision 2. MyHarmony names a remote's buttons by word only, `RemoteHardButtons` in the
button mapping task (`Red`, `DVR`, `PrevChannel`, `VolumeMute` and the rest), and hands a button map to the
service, which compiles it; nothing in the client turns a button name into a scan code for skin 104 or any
other skin. So the client confirms the vocabulary and does not help with the codes.

## Sources checked before the work

Logitech's client, above. The firmware: `tests/test_harmony_350_boot.py`'s `TheKeys` (the boot and safe
mode scan and its formula), `tests/test_harmony_350_slots.py` (raw 6 is base slot 9, entry 0 the key
table, tag `0x86` the activity), `tests/test_harmony_350_delay.py` (the send path at `0x11EA6`). The
archive: sections 17 (event type and scan code on arch 14), 89 (the Harmony 525's matrix arithmetic),
133 (naming keys through a known setup), 259 and 265 (the key table, and the group being the device key on
the Harmony 300). The reference: both models' `keys.md`, the family's README, `memory.md` and
`firmware.md`. The drawings `packages/silhouettes/src/models/h350.ts` and `h300.ts`.

## Not settled here

* Which of favourites 1 to 4 is which of 8, 9, 11 and 34, and whether Live is 43 or 56. The bench file
  binds none of them, so the run heard nothing from them.
* Menu (10), DVR (16), Enter (54), Watch TV (6) and the top right and bottom right device keys (1 and 4)
  on a Harmony 350 itself: the bench file binds nothing to them either, so their codes rest on the
  configurations alone.
* Anything on a Harmony 300 pressed: the moulding is the 350's and its files bind the same codes, but no
  300 has been pressed with the receiver listening.
* The Harmony 300's colour keys. Both its files send the `Red` command from code 13 and `Green`, `Yellow`
  and `Blue` from 27, 28 and 29, the codes of the 350's red, green, yellow and blue keys, while the 300's
  drawing prints yellow, blue, red and green on those four positions. Either the 300 sends the command
  of another colour than the one printed on the key, or its printing was read wrong. Not checked.

**Standing.** Read in the firmware and measured in configurations, and the 41 keys `HEARD` names measured
on the bench Harmony 350 with the infrared receiver, `TheBench350HeardEveryKey`, while the unit held its
own configuration, `work/350-delay/before.bin`, written back to it after the keypad check before the run.
"""
import json
import os
import unittest

import lab
from harmony.pic18 import chains, disasm
from reference_keys import generated_keys

BASE = 0x9000
SAFE_BASE = 0x1000
CONFIG_BASE = 0x020000

SCAN = 0x1892A
SAFE_SCAN = 0x6948
RETURNS = 0x188C8

CONFIGS = ('h350_config', 'h350_programmed_config', 'h350_three_devices_config',
           'h300_config', 'h300_programmed_config')
HARMONY_350 = CONFIGS[:3]

PRESS, RELEASE, HELD = 0x80, 0x40, 0xC0
FIRMWARE_EVENTS = {0x2D, 0x2E, 0x2F, 0x30}

DEVICE_KEYS = {5: 0, 1: 1, 7: 2, 4: 3}     # code: the infrared group the selected map sends from
WATCH_TV = 6
POWER = 3
FAVOURITES = {2, 8, 9, 11, 34}
NUMBER_SENDER = 0xF3                       # band of opcode 0x1F, base slot 16's number sender


def _listing(code, base, start, count):
    """The listing's instruction text from `start`, without address and bytes."""
    out = []
    for line in disasm.disassemble(code, base, start, count):
        tokens = line.split(':', 1)[1].split()
        while tokens and len(tokens[0]) == 2 and all(c in '0123456789abcdef' for c in tokens[0]):
            tokens.pop(0)
        out.append(' '.join(tokens))
    return out


def _code(drive, ret):
    """A key's code from its drive line and return, as `0x18AB4` computes it: `4 * line + return`."""
    port, bit = drive.split(',')
    line = {'PORTE': int(bit), 'PORTA': 7 + int(bit) - 3, 'PORTD': 10 + int(bit)}[port]
    return 4 * line + int(ret.split(',')[1]) - 3


def _shape(listing):
    """The literals and port operations, which carry a scan routine's meaning, in order."""
    keep = ('MOVLW', 'ANDLW', 'MULLW', 'RETLW', 'SUBLW', 'IORLW')
    return [line for line in listing if line.split()[0] in keep or 'PORT' in line]


class _Config:
    """A configuration of this family read by raw slot, as `tests/test_harmony_350_slots.py` reads one."""

    def __init__(self, name):
        self.name = name
        self.blob = lab.load(name)

    def u(self, address, width):
        at = address - CONFIG_BASE
        return int.from_bytes(self.blob[at:at + width], 'little')

    def pointer(self, slot):
        return self.u(CONFIG_BASE + 0x0B + 4 * slot + 1, 3)

    def maps(self):
        """Raw slot 6, base slot 9: a `u8` count and `u24` pointers to tagged lists."""
        at = self.pointer(6)
        return [self.u(at + 1 + 3 * i, 3) for i in range(self.u(at, 1))]

    def action_list(self, index):
        table = self.pointer(7)
        at = self.u(table + 2 + 3 * index, 3)
        return [(self.u(at + 1 + 3 * k, 2), self.u(at + 3 + 3 * k, 1)) for k in range(self.u(at, 1))]

    def tagged(self, at):
        """Base slot 9's tagged list in either form, as (tag, operand, opcode)."""
        count = self.u(at, 1)
        if count:
            return [(self.u(at + 1 + 4 * k, 1), self.u(at + 2 + 4 * k, 2), self.u(at + 4 + 4 * k, 1))
                    for k in range(count)]
        return [(self.u(at + 3 + 5 * k, 1), self.u(at + 4 + 5 * k, 2), self.u(at + 6 + 5 * k, 1))
                for k in range(self.u(at + 1, 1))]

    def flat(self, operand, opcode, seen=None):
        """One instruction and everything it calls, in order, as (operand, opcode)."""
        seen = set() if seen is None else seen
        if opcode != 0x7F:
            return [(operand, opcode)]
        if operand in seen:
            return []
        seen.add(operand)
        out = []
        for inner, op in self.action_list(operand):
            out.extend(self.flat(inner, op, seen))
        return out

    def groups(self, entry):
        """The infrared groups a map's bindings send from, through every list they call."""
        return {operand >> 8 for _, operand, opcode in self.tagged(self.maps()[entry])
                for operand, opcode in self.flat(operand, opcode) if opcode == 0x7D}


def _configs():
    lab.require(*CONFIGS)
    return [_Config(name) for name in CONFIGS]


class TheApplicationScansTheKeypadAsSafeModeDoes(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code', 'h350_safemode')
        self.code = lab.load('h350_code')

    def test_the_routine_is_safe_modes_literal_for_literal(self):
        ours = _shape(_listing(self.code, BASE, SCAN, 210))
        theirs = _shape(_listing(lab.load('h350_safemode'), SAFE_BASE, SAFE_SCAN, 210))
        self.assertEqual(len(ours), 34)
        self.assertEqual(ours, theirs)

    def test_a_return_is_numbered_1_to_4(self):
        self.assertEqual(_listing(self.code, BASE, RETURNS, 9),
                         ['BTFSS PORTB,4', 'RETLW 0x01', 'BTFSS PORTB,5', 'RETLW 0x02', 'BTFSS PORTB,6',
                          'RETLW 0x03', 'BTFSS PORTB,7', 'RETLW 0x04', 'RETLW 0x00'])

    def test_fourteen_drive_lines_in_three_groups(self):
        # PORTE: seven lines under mask 0x7F, numbered from 1.
        self.assertEqual(_listing(self.code, BASE, 0x18982, 1), ['MOVLW 0x07'])
        self.assertEqual(_listing(self.code, BASE, 0x1899E, 1), ['ANDLW 0x7f'])
        self.assertEqual(_listing(self.code, BASE, 0x189B2, 2), ['MOVLB 0xc', 'INCF 0xc02,W'])
        # PORTA: three lines from bit 3 under mask 0x38, numbered from 8.
        self.assertEqual(_listing(self.code, BASE, 0x189EA, 1), ['MOVLW 0x03'])
        self.assertEqual(_listing(self.code, BASE, 0x189F2, 1), ['MOVLW 0x08'])
        self.assertEqual(_listing(self.code, BASE, 0x18A06, 1), ['ANDLW 0x38'])
        self.assertEqual(_listing(self.code, BASE, 0x18A1A, 3), ['MOVLW 0x08', 'MOVLB 0xc', 'ADDWF 0xc02,W'])
        # PORTD: four lines under mask 0x0F, numbered from 11.
        self.assertEqual(_listing(self.code, BASE, 0x18A54, 1), ['MOVLW 0x04'])
        self.assertEqual(_listing(self.code, BASE, 0x18A70, 1), ['ANDLW 0x0f'])
        self.assertEqual(_listing(self.code, BASE, 0x18A84, 3), ['MOVLW 0x0b', 'MOVLB 0xc', 'ADDWF 0xc02,W'])
        # And the code is four per line, plus the return.
        self.assertEqual(_listing(self.code, BASE, 0x18AB4, 8),
                         ['MOVLB 0xc', 'DECF 0xc01,F', 'MOVLB 0xc', 'MOVF 0xc01,W', 'MULLW 0x04',
                          'MOVF PRODL,W', 'MOVLB 0xc', 'ADDWF 0xc00,W'])

    def test_the_restart_is_codes_6_53_and_51(self):
        # The three line and return pairs the restart tests, turned into codes by the scan's own numbering.
        listing = _listing(self.code, BASE, 0x18942, 11)
        pairs = [(listing[i].split()[1], listing[i + 1].split()[1]) for i in (0, 4, 8)]
        self.assertEqual(pairs, [('PORTE,1', 'PORTB,5'), ('PORTD,3', 'PORTB,4'), ('PORTD,2', 'PORTB,6')])
        self.assertEqual(listing[-1], 'RESET')
        self.assertEqual([_code(drive, ret) for drive, ret in pairs], [6, 53, 51])


class AKeyEventIsATypeAndTheScanCode(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = lab.load('h350_code')

    def test_a_new_key_down_is_raised_as_0x80_with_its_code(self):
        self.assertEqual(_listing(self.code, BASE, 0x18BE8, 2), ['MOVFF 0xc07,0x713', 'GOTO 0x18b30'])
        self.assertEqual(_listing(self.code, BASE, 0x18B30, 2), ['MOVFF 0x713,0x711', 'MOVFF 0x711,0x2a1'])
        self.assertEqual(_listing(self.code, BASE, 0x18B4A, 5),
                         ['MOVLW 0x80', 'MOVLB 0x7', 'IORWF 0x711,W', 'MOVLB 0x2', 'MOVWF 0x29c'])
        self.assertEqual(_listing(self.code, BASE, 0x18B54, 1), ['CALL 0x10fc4'])

    def test_a_key_let_go_is_raised_as_0x40_in_two_places(self):
        for at in (0x18B84, 0x18BCE):
            self.assertEqual(_listing(self.code, BASE, at, 5),
                             ['MOVLW 0x40', 'MOVLB 0x7', 'IORWF 0x711,W', 'MOVLB 0x2', 'MOVWF 0x29c'])
        # The first when the scan finds nothing and a key was down, the second when another key replaced it.
        self.assertEqual(_listing(self.code, BASE, 0x18B6A, 4), ['MOVLB 0x7', 'MOVF 0x711,W', 'BZ 0x18b9a',
                                                                 'MOVLB 0x3'])
        self.assertEqual(_listing(self.code, BASE, 0x18BAA, 4), ['MOVLB 0x7', 'MOVF 0x711,W', 'MOVLB 0xc',
                                                                 'SUBWF 0xc07,W'])

    def test_a_key_held_past_a_timer_is_raised_as_0xc0(self):
        self.assertEqual(_listing(self.code, BASE, 0x18AE4, 8),
                         ['MOVLB 0x3', 'MOVF 0x315,W', 'BZ 0x18afc', 'MOVLW 0xc0', 'MOVLB 0x7', 'IORWF 0x711,W',
                          'MOVLB 0x2', 'MOVWF 0x29c'])
        # The press arms it with the value in 0x200 times 100.
        self.assertEqual(_listing(self.code, BASE, 0x18B58, 6),
                         ['MOVLB 0x2', 'MOVF 0x200,W', 'MULLW 0x64', 'MOVFF PRODL,0x316', 'MOVFF PRODH,0x317',
                          'GOTO 0x1959e'])
        self.assertEqual(_listing(self.code, BASE, 0x1959E, 6),
                         ['MOVLB 0x3', 'MOVLW 0x01', 'MOVWF 0x314', 'CLRF 0x315', 'MOVFF 0x316,0x312',
                          'MOVFF 0x317,0x313'])

    def test_the_firmwares_own_events_sit_below_0x40(self):
        self.assertEqual(_listing(self.code, BASE, 0x145E0, 3), ['MOVLB 0x2', 'MOVLW 0x28', 'MOVWF 0x29c'])
        self.assertEqual(_listing(self.code, BASE, 0x145F8, 2), ['MOVLB 0x2', 'MOVLW 0x27'])
        self.assertEqual(_listing(self.code, BASE, 0x145FE, 2), ['MOVLB 0x2', 'MOVLW 0x26'])
        # The send path's event, chosen by the send kind: 3, 2 and 1 by the chain, 0 by falling through.
        self.assertEqual(_listing(self.code, BASE, 0x11EA6, 3), ['MOVFF 0x097,0x119', 'MOVLB 0x2', 'MOVF 0x203,W'])
        self.assertEqual(chains.chain_table(self.code, BASE, 0x11EAE), {3: 0x11ED0, 2: 0x11ECA, 1: 0x11EC4})
        literal = {at: _listing(self.code, BASE, at + 2, 1)[0] for at in (0x11ED0, 0x11ECA, 0x11EC4, 0x11EBE)}
        self.assertEqual(literal, {0x11ED0: 'MOVLW 0x30', 0x11ECA: 'MOVLW 0x2e', 0x11EC4: 'MOVLW 0x2f',
                                   0x11EBE: 'MOVLW 0x2d'})
        self.assertEqual(_listing(self.code, BASE, 0x11EDC, 2), ['MOVFF 0xc19,0x29d', 'CALL 0x10fe2'])


class EveryTagIsAKeyEventOrAFirmwareEvent(unittest.TestCase):
    def test_device_maps_bind_presses_only(self):
        counts = {}
        for c in _configs():
            tags = [tag for at in c.maps()[1:] for tag, _, _ in c.tagged(at)]
            self.assertEqual({tag & 0xC0 for tag in tags}, {PRESS}, c.name)
            counts[c.name] = len(tags)
        self.assertEqual(counts, {'h350_config': 112, 'h350_programmed_config': 117,
                                  'h350_three_devices_config': 80, 'h300_config': 63,
                                  'h300_programmed_config': 133})

    def test_entry_0_binds_firmware_events_device_keys_and_the_activity(self):
        seen = {}
        for c in _configs():
            tags = [tag for tag, _, _ in c.tagged(c.maps()[0])]
            self.assertEqual({tag for tag in tags if tag < 0x40}, FIRMWARE_EVENTS, c.name)
            self.assertNotIn(HELD, {tag & 0xC0 for tag in tags}, 'no configuration binds a held key')
            seen[c.name] = (sorted(tag & 0x3F for tag in tags if tag & 0xC0 == PRESS),
                            sorted(tag & 0x3F for tag in tags if tag & 0xC0 == RELEASE))
        self.assertEqual(seen, {'h350_config': ([1, 4, 5, 6], [1, 4, 5]),
                                'h350_programmed_config': ([1, 4, 5, 6, 7], [1, 4, 5, 7]),
                                'h350_three_devices_config': ([1, 4, 5, 6], [1, 4, 5]),
                                'h300_config': ([1, 5, 6], []),
                                'h300_programmed_config': ([1, 4, 5, 6, 7], [])})

    def test_54_of_the_56_codes_are_bound_and_43_and_56_are_not(self):
        bound = set()
        for c in _configs():
            for at in c.maps():
                bound |= {tag & 0x3F for tag, _, _ in c.tagged(at) if tag & 0xC0}
        self.assertEqual(len(bound), 54)
        self.assertEqual(set(range(1, 57)) - bound, {43, 56})
        self.assertNotIn(0, bound, 'code 0 is no key')


class TheStructuralKeys(unittest.TestCase):
    """The keys whose binding says what they are, before any command is named."""

    def _selects(self, c, operand, opcode):
        return [op & 0xFF for op, opc in c.flat(operand, opcode) if opc == 0x1F and op >> 8 == 0xFF]

    def test_each_device_key_selects_the_map_of_one_group(self):
        found = {}
        for c in _configs():
            for tag, operand, opcode in c.tagged(c.maps()[0]):
                code = tag & 0x3F
                if code not in DEVICE_KEYS:
                    continue
                for entry in self._selects(c, operand, opcode):
                    groups = c.groups(entry)
                    # A map may also send group 0's codes, the slots test, so the group a map is for is
                    # the one other than 0 where there is one. A map with no codes at all is a device
                    # with no infrared commands, and says nothing.
                    own = groups - {0} if groups - {0} else groups
                    found.setdefault(code, []).append(tuple(sorted(own)))
        self.assertEqual(found, {5: [(0,)] * 5, 1: [(1,)] * 5, 7: [(2,)] * 2, 4: [(3,), (), (), (3,)]})

    def test_the_350_selects_on_the_release_and_the_300_on_the_press(self):
        for c in _configs():
            with self.subTest(c.name):
                kinds = {tag & 0xC0 for tag, operand, opcode in c.tagged(c.maps()[0])
                         if tag & 0x3F in DEVICE_KEYS and self._selects(c, operand, opcode)}
                self.assertEqual(kinds, {RELEASE} if c.name in HARMONY_350 else {PRESS})
                # On the 350 the press starts two timers, band 0xEB, and selects nothing.
                if c.name in HARMONY_350:
                    for tag, operand, opcode in c.tagged(c.maps()[0]):
                        if tag & 0xC0 == PRESS and tag & 0x3F in DEVICE_KEYS:
                            starts = [op for op, opc in c.flat(operand, opcode) if opc == 0x1F and op >> 8 == 0xEB]
                            self.assertEqual(len(starts), 2)
                            self.assertEqual(self._selects(c, operand, opcode), [])

    def test_watch_tv_is_the_one_other_key_entry_0_binds(self):
        for c in _configs():
            with self.subTest(c.name):
                others = [tag for tag, _, _ in c.tagged(c.maps()[0])
                          if tag & 0xC0 and tag & 0x3F not in DEVICE_KEYS]
                self.assertEqual(others, [PRESS | WATCH_TV])

    def test_power_sends_or_toggles_a_state_variable_in_every_map_that_binds_it(self):
        bindings = 0
        for c in _configs():
            for at in c.maps()[1:]:
                for tag, operand, opcode in c.tagged(at):
                    if tag != PRESS | POWER:
                        continue
                    bindings += 1
                    body = c.flat(operand, opcode)
                    sends = [op for op, opc in body if opc == 0x7D]
                    writes = [op for op, opc in body if opc >= 0x80]
                    self.assertTrue(sends or (writes and any(opc == 0x71 for _, opc in body)), c.name)
        self.assertEqual(bindings, 14)

    def test_the_favourite_keys_are_the_codes_that_call_the_number_sender(self):
        found = {}
        for c in _configs():
            for at in c.maps():
                for tag, operand, opcode in c.tagged(at):
                    body = c.flat(operand, opcode)
                    if any(opc == 0x1F and op >> 8 == NUMBER_SENDER for op, opc in body):
                        loads = [op for op, opc in body if opc == 0x7A]
                        self.assertEqual(len(loads), 1)
                        found.setdefault(c.name, {})[tag & 0x3F] = loads[0]
        self.assertEqual(found, {'h350_programmed_config': {8: 1, 9: 2, 11: 3, 34: 4, 2: 666},
                                 'h350_three_devices_config': {8: 1, 9: 2, 11: 3, 34: 4, 2: 666},
                                 'h300_programmed_config': {8: 1, 2: 2, 9: 3, 34: 666}})
        self.assertEqual(set().union(*(set(one) for one in found.values())), FAVOURITES)


#: The bench Harmony 350's configuration as read off it, four bytes short of a container as every read of
#: this family is, which with the end marker appended is the file the monitor names below. Read by path
#: rather than registered as a fixture, as `tests/test_harmony_350_device_groups.py` reads it, so it stays
#: out of every population the fixture tables feed.
BENCH_READ = ('reads', '20261027T1700Z-h350-backup', 'cfg_usercfg.bin')
#: The name the infrared monitor gives the same configuration, `BENCH_CONFIGS` in `packages/bench`.
BENCH_FILE = 'work/350-delay/before.bin'
#: The two device maps of that file: the LG television's, group 0, and the Denon receiver's, group 2.
TV_MAP, RECEIVER_MAP = 1, 2

#: The steps of the every key run that expected a sound, with the keys pressed in them in order, by the
#: drawing's names, and the map in force. Digit 0 is missing from step 7: it was pressed there and sent
#: nothing, `test_every_verdict_passed_but_digit_0_in_the_tvs_mode`.
HEARD_STEPS = {
    1: (TV_MAP, ['VolumeUp', 'VolumeDown', 'VolumeMute']),
    2: (TV_MAP, ['ChannelUp', 'ChannelDown', 'PrevChannel']),
    3: (TV_MAP, ['DirectionUp', 'DirectionRight', 'DirectionDown', 'DirectionLeft', 'Select']),
    4: (TV_MAP, ['Exit', 'Guide', 'Info']),
    5: (TV_MAP, ['Red', 'Green', 'Yellow', 'Blue']),
    6: (TV_MAP, ['Rewind', 'Play', 'Pause', 'FastForward', 'Record', 'Stop']),
    7: (TV_MAP, ['Number1', 'Number2', 'Number3', 'Number4', 'Number5', 'Number6', 'Number7', 'Number8',
                 'Number9', 'Clear']),
    8: (TV_MAP, ['Input']),
    13: (TV_MAP, ['Favorite5']),
    15: (TV_MAP, ['VolumeUp']),
    18: (RECEIVER_MAP, ['VolumeUp', 'VolumeDown', 'VolumeMute']),
    19: (RECEIVER_MAP, ['DirectionUp', 'DirectionRight', 'DirectionDown', 'DirectionLeft', 'Select']),
    20: (RECEIVER_MAP, ['Exit', 'Info', 'PrevChannel']),
    21: (RECEIVER_MAP, ['UpArrow', 'DownArrow']),
    22: (RECEIVER_MAP, ['SkipBack', 'SkipForward']),
    23: (RECEIVER_MAP, ['Play', 'Pause']),
    24: (RECEIVER_MAP, ['Number1', 'Number2', 'Number3', 'Number4', 'Number5', 'Number6', 'Number7',
                       'Number8', 'Number9', 'Number0']),
    25: (RECEIVER_MAP, ['Input']),
}

#: What the run decided, key by key: the one scan code whose binding, in the maps the key was pressed in,
#: sends what the receiver heard. Each is the code `packages/bench/test/keys350.test.ts` gives the key.
HEARD = {
    'VolumeUp': 49, 'VolumeDown': 52, 'VolumeMute': 15, 'ChannelUp': 55, 'ChannelDown': 41, 'PrevChannel': 32,
    'DirectionUp': 51, 'DirectionRight': 31, 'DirectionDown': 42, 'DirectionLeft': 14, 'Select': 50,
    'Exit': 12, 'Guide': 33, 'Info': 36, 'Red': 13, 'Green': 27, 'Yellow': 28, 'Blue': 29,
    'Rewind': 22, 'Play': 44, 'Pause': 46, 'FastForward': 30, 'Record': 23, 'Stop': 40,
    'Number1': 24, 'Number2': 47, 'Number3': 39, 'Number4': 17, 'Number5': 48, 'Number6': 37,
    'Number7': 18, 'Number8': 53, 'Number9': 45, 'Number0': 20, 'Clear': 19, 'Input': 35,
    'Favorite5': 2, 'UpArrow': 25, 'DownArrow': 26, 'SkipBack': 21, 'SkipForward': 38,
}


def _bench_config():
    """The bench file read by path, skipping where the lab does not hold it."""
    if not lab.LAB or not os.path.isfile(os.path.join(lab.LAB, *BENCH_READ)):
        raise unittest.SkipTest('the bench Harmony 350 backup read is not in the lab')
    c = _Config.__new__(_Config)
    c.name = 'bench'
    with open(os.path.join(lab.LAB, *BENCH_READ), 'rb') as handle:
        c.blob = handle.read()
    return c


def _heard(press):
    """The group and code pairs the monitor matched one press to in the bench file, as a set."""
    return {(m['group'], m['code']) for m in press['frame']['matches'] if m['config'] == BENCH_FILE}


def _first_sends(c, entry):
    """A map's presses, as {scan: the group and code its binding sends first}, None where it sends none."""
    out = {}
    for tag, operand, opcode in c.tagged(c.maps()[entry]):
        if tag & 0xC0 != PRESS:
            continue
        out[tag & 0x3F] = next(((op >> 8, op & 0xFF) for op, opc in c.flat(operand, opcode) if opc == 0x7D),
                               None)
    return out


class TheBench350HeardEveryKey(unittest.TestCase):
    """`todo-compile-350.md` 2.2.2: every key of the bench Harmony 350 pressed with the receiver listening.

    The unit held `work/350-delay/before.bin`, the LG television on group 0 and the Denon receiver on group
    2, and nothing else; the test is `packages/bench/irtests/350-2-2-keys.json` and the prediction it scores
    `docs/predictions/harmony-350-keys.md`. Each press the monitor heard is matched to the bindings of the
    map in force that send that code first, and a key's code is the one every one of its presses agrees on.
    That is a measurement independent of the census in `packages/bench/test/keys350.test.ts`: the census
    named codes by Logitech's catalogue over five other configurations, and this names them by which key a
    person pressed.

    **What it settled**: favourite key 5, the one right of Input, is code 2, being the only favourite that
    sent anything in the television's mode, its `Home`, which this file binds to code 2 alone; and the upper
    of the two arrow keys is code 25 and the lower 26, since in the receiver's mode they sent its `ChannelUp`
    and `ChannelDown`, which this file binds to 25 and 26 alone. The other 38 keys heard sending came out on
    the codes the configurations had given them, 38 of 38. Exit and Previous Channel send the receiver one code,
    and so do Play and Pause, so the receiver's mode alone cannot tell those apart; the television's mode
    does, which is why a key's code is the intersection over both. Power and the two device keys the file
    binds are decided by what their bindings do, the last three tests.

    **What it did not settle**: favourites 1 to 4 sent nothing, so they stay 8, 9, 11 and 34 in some order;
    Live, Menu, DVR, Enter, Watch TV and the top right and bottom right device keys sent nothing because
    this file binds nothing to them. Digit 0 sent nothing once in the television's mode and its code in the
    receiver's; that is the unit's contact, `docs/test-notes/harmony-350.md`, not a finding.

    **Width**: one Harmony 350. The Harmony 300 is the same moulding and its configurations bind the same
    codes, but no 300 was pressed, so nothing here is a measurement of one.
    """

    def setUp(self):
        lab.require('h350_keys_ir', 'h350_device_keys_ir')
        self.run = json.loads(lab.load('h350_keys_ir'))
        self.config = _bench_config()

    def test_the_run_is_the_every_key_test_on_the_bench_file(self):
        self.assertEqual(self.run['name'], "Harmony 350, every key in the TV's and the receiver's modes")
        self.assertEqual(len(self.run['steps']), 29)
        # The key table and the two devices' maps, and every frame heard named against the bench file.
        self.assertEqual(len(self.config.maps()), 3)
        configs = {m['config'] for step in self.run['steps'] for press in step['presses']
                   for m in press['frame']['matches']}
        self.assertIn(BENCH_FILE, configs)

    def test_each_key_heard_has_exactly_one_code(self):
        found = {}
        for index, (entry, keys) in HEARD_STEPS.items():
            presses = [_heard(press) for press in self.run['steps'][index]['presses']]
            self.assertEqual(len(presses), len(keys), 'step %d' % index)
            sends = _first_sends(self.config, entry)
            for key, heard in zip(keys, presses):
                scans = {scan for scan, first in sends.items() if first in heard}
                found[key] = found.get(key, scans) & scans
        self.assertEqual({key: sorted(scans) for key, scans in found.items()},
                         {key: [scan] for key, scan in HEARD.items()})
        self.assertEqual(len(HEARD), 41)

    def test_favourite_5_sent_the_tvs_home_and_the_other_four_nothing(self):
        heard = [[(m['group'], m['code'], m.get('command')) for press in self.run['steps'][index]['presses']
                  for m in press['frame']['matches'] if m['config'] == BENCH_FILE] for index in range(9, 14)]
        self.assertEqual(heard, [[], [], [], [], [(0, 4, 'Home')]])
        self.assertIn('favourite key 5', self.run['steps'][13]['instruction'])
        tv = _first_sends(self.config, TV_MAP)
        self.assertEqual([scan for scan, first in tv.items() if first == (0, 4)], [2])
        # And the television's map binds no other favourite code, so four silent keys are what it predicts.
        self.assertEqual(sorted(FAVOURITES & set(tv)), [2])

    def test_the_upper_arrow_sent_the_receivers_channel_up_and_the_lower_its_channel_down(self):
        step = self.run['steps'][21]
        self.assertIn('the up arrow', step['instruction'])
        heard = [sorted({(m['group'], m['code'], m.get('command')) for m in press['frame']['matches']
                         if m['config'] == BENCH_FILE}) for press in step['presses']]
        self.assertEqual(heard, [[(2, 5, 'ChannelUp')], [(2, 19, 'ChannelDown')]])
        receiver = _first_sends(self.config, RECEIVER_MAP)
        self.assertEqual([scan for scan, first in receiver.items() if first == (2, 5)], [25])
        self.assertEqual([scan for scan, first in receiver.items() if first == (2, 19)], [26])
        # In the television's mode neither arrow has a binding.
        tv = _first_sends(self.config, TV_MAP)
        self.assertEqual({25, 26} & set(tv), set())

    def test_power_sent_each_devices_power_codes_and_only_code_3_toggles_one(self):
        heard = {index: [sorted(_heard(press)) for press in self.run['steps'][index]['presses']]
                 for index in (16, 27)}
        self.assertEqual(heard, {16: [[(0, 25)], [(0, 46)]], 27: [[(2, 20)], [(2, 13)]]})
        powers = {(0, 25), (0, 46), (2, 20), (2, 13)}
        for entry in (TV_MAP, RECEIVER_MAP):
            with self.subTest(entry=entry):
                # No binding of the map sends a power code itself: the power lists run from the state
                # variable, and the one press that tests a variable is code 3.
                self.assertEqual({scan for scan, first in _first_sends(self.config, entry).items()
                                  if first in powers}, set())
                toggles = [tag & 0x3F for tag, operand, opcode in self.config.tagged(self.config.maps()[entry])
                           if tag & 0xC0 == PRESS
                           and any(opc == 0x71 for _, opc in self.config.flat(operand, opcode))]
                self.assertEqual(toggles, [POWER])

    def test_the_bottom_left_and_top_left_device_keys_are_codes_7_and_5(self):
        # This run: AVR/Game, then the receiver's volume and mute.
        self.assertIn('AVR/Game', self.run['steps'][17]['instruction'])
        self.assertEqual([sorted(_heard(press)) for press in self.run['steps'][18]['presses']],
                         [[(2, 12)], [(2, 21)], [(2, 22)]])
        # The 2.3 run: AVR/Game, then TV/Media, each followed by Volume Up.
        device_keys = json.loads(lab.load('h350_device_keys_ir'))
        heard = [sorted(_heard(step['presses'][0])) for step in device_keys['steps'][:2]]
        self.assertEqual(heard, [[(2, 12)], [(0, 3)]])
        # Entry 0 selects the receiver's map on code 7's release and the television's on code 5's.
        selects = {}
        for tag, operand, opcode in self.config.tagged(self.config.maps()[0]):
            picks = [op & 0xFF for op, opc in self.config.flat(operand, opcode) if opc == 0x1F and op >> 8 == 0xFF]
            if picks:
                selects[tag] = picks
        self.assertEqual(selects, {RELEASE | 5: [TV_MAP], RELEASE | 7: [RECEIVER_MAP]})

    def test_the_keys_meant_to_be_silent_were_apart_from_three_landmarks(self):
        # Step 14, in the television's mode: Info, Exit and Guide were pressed as well, because the step's
        # wording named them to say where the arrows are, and each sent its own code. Not a finding.
        landmarks = [sorted(_heard(press)) for press in self.run['steps'][14]['presses']]
        tv = _first_sends(self.config, TV_MAP)
        self.assertEqual(landmarks, [[tv[HEARD['Info']]], [tv[HEARD['Exit']]], [tv[HEARD['Guide']]]])
        # Step 26, in the receiver's mode, and favourites 1 to 4 in the television's: nothing at all.
        for index in (9, 10, 11, 12, 26):
            self.assertEqual(self.run['steps'][index]['presses'], [], 'step %d' % index)

    def test_every_verdict_passed_but_digit_0_in_the_tvs_mode(self):
        failed = [(index, verdict['expected'], verdict['detail']) for index, step in enumerate(self.run['steps'])
                  for verdict in step['verdicts'] if not verdict['ok']]
        # The monitor separates device and command with a middle dot.
        self.assertEqual(failed, [(7, 'lg_tv · 0', 'heard 0 of 1')])


class TheHarmony350DrawingCarriesTheCodesHeard(unittest.TestCase):
    """The drawing's codes, read back from the generated keys page, are the bench run's and nothing else.

    The 41 keys `HEARD` names, Power, and the two device keys whose release was heard selecting a device,
    all with the test footnote. Needs no lab, since both sides are in the repository.
    """

    def test_the_drawing_carries_exactly_the_codes_heard(self):
        drawn = {name: scan for name, (_, _, scan, label) in generated_keys('harmony-350').items()
                 if scan is not None}
        labels = {label for _, (_, _, scan, label) in generated_keys('harmony-350').items() if scan is not None}
        self.assertEqual(drawn, {**HEARD, 'Power': POWER, 'TvMedia': 5, 'AvrGame': 7})
        self.assertEqual(labels, {'t-harmony-350-keys-u'})


if __name__ == '__main__':
    unittest.main()
