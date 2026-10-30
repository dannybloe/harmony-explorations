#!/usr/bin/env python3
"""How a Harmony 300 or 350 recovers from a failed write, read in its 1.4 application image.

`todo-compile-350.md` 1.4, the recovery half of the plan before the first write. One image, 1.4, the one
the package's manifest names for skins 78, 79 and 104, so every claim covers the Harmony 300 and the
Harmony 350 running that build and no other; other builds are not checked. The image is the
**application** alone, internal `0x9000` onwards: the 4 KiB bootloader at internal `0x000000` and the
32 KiB safe mode image at `0x001000` were in no file the lab held when this was written, so whatever they
do is not read here. They have been read off the bench Harmony 350 since, and what they do is
`tests/test_harmony_350_boot.py`.

**Sources checked first.** `tests/test_harmony_350_file_write.py`, whose header holds the write path
(the reset only closes a file, the open for writing erases at once, the check compares the stored word,
a failing configuration is left unused with no fallback) and whose findings are not repeated here.
Sections 196 and 199 for the image and its file table, 259 for the section seeker. The recovery
procedures of the other families in the `recovering-a-remote` skill, which is where the shape of the
questions comes from: the Harmony 525's safe mode copying itself over the application, the Harmony 700's
status byte asking its safe mode image to install a staged copy, and the Harmony 700 2.8 image's reset
key combination. Logitech's client, `work/myharmony/src/`: the firmware template for skin 104, the
converter for the firmware type a remote reports, and the update manager. Nothing in the archive or the
reference had read any of this on this image.

## A remote whose configuration failed still serves the file protocol

**This is the question that decides whether a failed write can be redone from the host, and in this
build it can.**

* The start, `0x15CEA`, runs the validator at `0x15DFE` and then tests the verdict once, at `0x15E04`:
  clear, it adds one to a counter at `0x1CA`; set, it skips that; both arms continue at `0x15E0C`. Nothing
  else between the validator and the main loop reads the verdict, and the main loop calls the USB service
  `0x16484` at `0x15E66`, `0x15E7C` and `0x15E94`.
* The USB service's whole call closure, followed from `0x16484` through every call and both arms of every
  branch, holds the request parser `0xCB88`, the reply dispatcher `0xE2F0` and therefore every file
  command. **Within it the verdict, bit 2 of `0x68E`, is touched exactly twice and read never**: the open
  for writing clears it at `0xCF88` and a matching check sets it at `0xD7C6`. So no file command waits on
  the configuration being valid, the open for writing least of all. The closure's walk stops at a computed
  jump, so a jump table would hide what lies behind it, and the tracer sees direct accesses only, not
  `FSR`; neither has been seen to matter here, and both are why this is a reading and not a measurement.
* What a failed write leaves is therefore one of two states, and both are rewritable: power kept, the
  remote is still in its main loop with the file left open, which the file system reset closes (the
  write path's header); power lost, the start fails the validator (a marker missing, error code 8, or the
  checksum, 4), keeps going, and serves USB from a remote with no configuration. The client's sequence begins
  with that reset and reruns from it once on failure, which fits both.
* **Not read**: a configuration that passes the validator and then misbehaves. The pass branch loads the
  configuration's state before the main loop, so a configuration whose loading hangs would stand between a
  restart and the USB service. Whether the processor's watchdog is on, and so whether `CLRWDT` in the main
  loop means anything, is in the configuration words at internal `0x01FFF8`, outside this image.

## What a person sees: four pins, switched in a pattern, until a restart

* A failing validator latches its code through `0x16310`, which latches only when nothing is latched yet,
  and `0x1A7EE` copies it to `0x700`. The writers of `0x70C`, the latch, are the start's `CLRF` at `0x15DBE`
  and `0x16316`; nothing clears it after the start, so the code stands until the processor restarts, even
  if a configuration written over USB later passes.
* The main loop calls `0x1A810` at `0x15EBC`. It returns at once while `0x700` is zero; otherwise it
  switches the same four pins `0x1A7EE` sets, `PORTC` bit 1 and `PORTB` bits 0, 2 and 3, on and off on a
  timer, counting through `0x701`, which is loaded from the code. That the pins drive the remote's lights,
  and that the number of flashes is the code, are likely and not checked. The remote does not hang and does
  not restart over a failing configuration.

## The application reports itself as normal mode, always

* `/sys/sysinfo` is built by a routine that loads the string `\\nfw_type 0x` from `0x9249` at `0x134E0` and
  formats the value returned by `0x14624`, which is the single instruction `RETLW 0x00`. So this image can
  only ever answer firmware type 0. Logitech's client reads that field and names 0 normal mode, 3 the
  bootloader and 4 safe mode, `FirmwareTypeConverter`; a 3 or a 4 therefore means some other image is
  answering. That the safe mode image answers the file protocol at all is not checked.

## The ways out of the application, and that none of them writes on the way

* A request byte in data memory, `0x100`, is how the application talks to whatever runs after a restart.
  `0x1A754` copies `0x103` into it unless `0x102` is set. Two places fill it: the reboot command's `0x73`
  parameter stores `0x0F` (`0xCD8E`) and falls into the ordinary reboot, and a flush of `/fw/normalmode`
  open for writing stores 2 (`0xD2C0`), which the close then turns into a reboot by reading it back through
  `0x1A748` (`0xD33A`). **The start keeps it only after a restart by a `RESET` instruction and clears it
  after any other**, a power on among them (`0x1A6A4`: `0x1ADC8` tests `RCON` bit 4, the reset instruction
  flag, which a `RESET` clears, returns 1 then, and the `BNZ` skips the clear; `0x1ADCE` sets the flag
  again). So a request survives exactly the restart its writer causes, and is read by code that runs
  before the application.
  **Corrected in place**: this said the start clears it after a `RESET` instruction and leaves it alone
  after any other reset, which is the branch read the wrong way round; the conclusion it drew, that the
  reader runs before the application, stood. The safe mode image, read later, makes the same test at its
  own start (`0x7502`) and is the reader: `0x0F` keeps safe mode for one start, and 2 installs the staged
  copy, as the Harmony 700's status byte does, `tests/test_harmony_350_boot.py`.
* **A three key reset**: the keypad routine at `0x18BA0` first calls `0x1892A`, which drives three keypad lines
  low one at a time (`PORTE` bit 1, `PORTD` bits 3 and 2) and reads three return lines (`PORTB` bits 5, 4
  and 6); when all three read pressed it executes `RESET` at `0x18956`. Which three keys those are was not
  known when this was written; they are codes 6, 53 and 51, which `tests/test_harmony_350_keys.py`'s table
  makes Watch TV, the digit 8 and the up direction key, not tried on a remote. It restarts the processor and writes
  nothing, so it is a reboot rather than a way into safe mode, as far as this image says.
* The image holds exactly three `RESET` instructions: the reboot command's (`0x16054`), the key
  combination's, and the one after `SLEEP` at `0x1A744`, reached from the main loop's state 2, which is
  likely the remote going to sleep. **No `CALL` or `GOTO` in the image targets an address below `0x9000`**, so the application never
  jumps into the bootloader or the safe mode image; it only restarts. Nothing on any of these paths erases or
  programs flash.

## What restores a damaged application, and what the file table offers

* The application's resident copy is the readable, not writable, row of `/fw/normalmode` at internal
  `0x9000`; its staged copy is the writable, not readable, row on the external medium at `0x000000`,
  `0x15C00` bytes. Logitech's firmware package names `/fw/normalmode` with its reset flag set, so its
  install writes the staged copy, flushes (request 2) and closes (the reboot). The staged copy ends below
  `0x020000`, so the configuration's erase, `0x020000` to `0x07FFFF`, never touches it, and nothing in a
  configuration write reaches internal flash.
* `/fw/bootloader` and `/fw/safemode` are **readable** rows, and so is the resident application. Reading
  them would put the two images this file could not read into the lab; neither path is on the transport's
  inert list, so that is a decision and not a step.
* The check command's routine for handles 1 and 2, the safe mode image and the resident application,
  tests `HG` at the image's base plus 8 (`0x1495A`) and compares a stored word with one it computes; the
  application's own header carries `HG` there. So the remote can verify both images over USB without a
  read. That routine was not read further.
* Logitech's client calls a firmware install required whenever a remote reports safe mode,
  `IsFirmwareUpgradeRequired`, ahead of any version comparison, and its firmware template for skins 78 and
  104 is the configuration template's sequence: reset, open for writing, write, check, flush on `m`, close
  and the reboot. That is the client's route back from safe mode; that this family's safe mode image
  serves it is the client's word only.

**Leads not followed.** Device control subcommand 5 (`0xD276`) erases at the open file's running address,
an internal page above `0xFE0000` and an external 64 KiB block below it, `0xD7D6`; subcommand 4 goes to
`0xF78A`. Neither is in the client's templates.

**Standing.** Read in the firmware, one build, the application only. Nothing here has been sent to a
remote.
"""
import io
import re
import unittest
import zipfile
import xml.etree.ElementTree as ET

import lab
from harmony.pic18 import disasm, isa, trace

BASE = 0x9000

START = 0x15CEA
VALIDATOR = 0x16090
USB_SERVICE = 0x16484
PARSER = 0xCB88
DISPATCHER = 0xE2F0
VERDICT = 0x68E
BLINK = 0x1A810
FW_TYPE = 0x14624
KEY_RESET = 0x1892A
KEY_SCAN = 0x18BA0

# The file table, section 199, as `tests/test_harmony_350_firmware.py` reads it.
TABLE = 0x0092A6
RECORD_BYTES = 11
ROWS = 23

CONDITIONAL_SKIPS = ('CPFSEQ', 'CPFSGT', 'CPFSLT', 'DECFSZ', 'DCFSNZ', 'INCFSZ', 'INFSNZ', 'TSTFSZ',
                     'BTFSC', 'BTFSS')


def _code():
    return lab.load('h350_code')


def _at(code, addr):
    return isa.decode(code, addr - BASE, BASE)


def _listing(code, start, count):
    """The listing's instruction text, bank resolved from `start` on, without address and bytes."""
    out = []
    for line in disasm.disassemble(code, BASE, start, count):
        tokens = line.split(':', 1)[1].split()
        while tokens and len(tokens[0]) == 2 and all(c in '0123456789abcdef' for c in tokens[0]):
            tokens.pop(0)
        out.append(' '.join(tokens))
    return out


def _reach(code, entries):
    """Every instruction reachable from `entries`, through calls and both arms of every branch.

    A call is followed and the instruction after it too, on the assumption that the call returns. A
    return, a `RESET` and an unconditional jump end a run. A computed jump is not followed, which is the
    walk's blind spot and is said so in the header.
    """
    seen, work = set(), list(entries)
    while work:
        addr = work.pop()
        while BASE <= addr < BASE + len(code) and addr not in seen:
            seen.add(addr)
            instr = _at(code, addr)
            name, nxt = instr.mnemonic, addr + 2 * instr.words
            target = instr.fields.get('target')
            if name in ('RETURN', 'RETLW', 'RETFIE', 'RESET'):
                break
            if name in ('GOTO', 'BRA'):
                work.append(target)
                break
            if target is not None:
                work.append(target)
            if name in CONDITIONAL_SKIPS:
                work.append(nxt + 2 * _at(code, nxt).words)
            addr = nxt
    return seen


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


class AFailedConfigurationLeavesTheFileProtocolServed(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_start_runs_the_validator_and_both_verdicts_go_on(self):
        self.assertEqual(_listing(self.code, 0x15DFE, 7),
                         ['RCALL 0x16090', 'CLRWDT', 'MOVLB 0x6', 'BTFSC 0x68e,2', 'BRA 0x15e0c',
                          'MOVLB 0x1', 'INCF 0x1ca,F'])

    def test_the_main_loop_calls_the_usb_service(self):
        for at in (0x15E66, 0x15E7C, 0x15E94):
            with self.subTest(call=hex(at)):
                self.assertEqual(_listing(self.code, at, 1), ['CALL 0x16484'])

    def test_the_usb_service_reaches_every_file_command(self):
        reached = _reach(self.code, [USB_SERVICE])
        self.assertIn(PARSER, reached)
        self.assertIn(DISPATCHER, reached)

    def test_the_usb_service_never_reads_the_verdict(self):
        """Only the open for writing clears it and only a matching check sets it, inside the closure."""
        reached = _reach(self.code, [USB_SERVICE])
        accesses = sorted(access.addr for found in trace.trace(self.code, BASE, [VERDICT]).values()
                          for access in found if access.addr in reached)
        self.assertEqual(accesses, [0xCF88, 0xD7C6])
        self.assertEqual(_listing(self.code, 0xCF86, 2), ['MOVLB 0x6', 'BCF 0x68e,2'])
        self.assertEqual(_listing(self.code, 0xD7C4, 2), ['MOVLB 0x6', 'BSF 0x68e,2'])

    def test_the_start_reaches_the_usb_service_and_the_validator_does_not_end_it(self):
        reached = _reach(self.code, [0x15E00])
        self.assertIn(USB_SERVICE, reached)


class AFailureIsLatchedAndShownOnFourPins(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_a_code_is_latched_only_when_none_is(self):
        self.assertEqual(_listing(self.code, 0x16310, 5),
                         ['RCALL 0x162fe', 'IORLW 0x00', 'BNZ 0x1631c', 'MOVFF 0x70d,0x70c',
                          'RCALL 0x16308'])
        writers = sorted(access.addr for access in trace.trace(self.code, BASE, [0x70C])[0x70C]
                         if 'WRITE' in str(access))
        self.assertEqual(writers, [0x15DBE, 0x16316], 'cleared at the start and latched, nothing else')

    def test_the_code_reaches_0x700_with_four_pins(self):
        self.assertEqual(_listing(self.code, 0x1A7EE, 6),
                         ['MOVFF 0x705,0x700', 'BSF PORTC,1', 'BSF PORTB,0', 'BSF PORTB,2', 'BSF PORTB,3',
                          'RETURN'])

    def test_the_main_loop_switches_the_same_pins_while_a_code_stands(self):
        self.assertEqual(_listing(self.code, 0x15EBC, 1), ['CALL 0x1a810'])
        self.assertEqual(_listing(self.code, BLINK, 4),
                         ['MOVLB 0x7', 'MOVF 0x700,W', 'BNZ 0x1a818', 'RETURN'])
        self.assertEqual(_listing(self.code, 0x1A866, 4),
                         ['BSF PORTC,1', 'BSF PORTB,0', 'BSF PORTB,2', 'BSF PORTB,3'])
        self.assertEqual(_listing(self.code, 0x1A89C, 4),
                         ['BCF PORTC,1', 'BCF PORTB,0', 'BCF PORTB,2', 'BCF PORTB,3'])
        self.assertEqual(_listing(self.code, 0x1A8C0, 1), ['MOVFF 0x700,0x701'],
                         'the count it runs through is loaded from the code')


class TheApplicationReportsFirmwareTypeZero(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_field_is_formatted_from_a_constant(self):
        self.assertEqual(self.code[0x9249 - BASE:0x9249 - BASE + 12], b'\nfw_type 0x\x00')
        self.assertEqual(_listing(self.code, 0x134DE, 4),
                         ['MOVLB 0xc', 'MOVLW 0x49', 'MOVWF 0xc04', 'MOVLW 0x92'])
        self.assertEqual(_listing(self.code, 0x13512, 1), ['CALL 0x14624'])
        self.assertEqual(_listing(self.code, FW_TYPE, 1), ['RETLW 0x00'])

    def test_logitechs_client_names_the_three_types(self):
        """Stated by Logitech, in their client: 0 normal mode, 3 the bootloader, 4 safe mode."""
        lab.require('myharmony_firmware_type')
        with open(lab.path('myharmony_firmware_type'), encoding='utf-8-sig') as handle:
            source = handle.read()
        constants = dict((name, int(value)) for name, value in
                         re.findall(r'const int FW_(\w+) = (\d+);', source))
        self.assertEqual(constants, {'NORMALMODE': 0, 'SAFEMODE': 4, 'BOOTLOADER': 3})


class TheWaysOut(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_request_byte_is_filled_from_0x103(self):
        self.assertEqual(_listing(self.code, 0x1A754, 5),
                         ['MOVLB 0x1', 'MOVF 0x102,W', 'BNZ 0x1a75e', 'MOVFF 0x103,0x100', 'RETURN'])

    def test_the_0x73_reboot_stores_0x0f_first(self):
        self.assertEqual(_listing(self.code, 0xCD8E, 6),
                         ['MOVLB 0x1', 'MOVLW 0x0f', 'MOVWF 0x103', 'MOVLB 0x1', 'CLRF 0x102',
                          'CALL 0x1a754'])
        self.assertEqual(_listing(self.code, 0xCD9C, 1), ['MOVLW 0x64'], 'and falls into the reboot')

    def test_a_flush_of_the_firmware_stores_2_and_the_close_reads_it(self):
        self.assertEqual(_listing(self.code, 0xD2C0, 6),
                         ['MOVLB 0x1', 'MOVLW 0x02', 'MOVWF 0x103', 'MOVLB 0x1', 'CLRF 0x102',
                          'CALL 0x1a754'])
        self.assertEqual(_listing(self.code, 0xD336, 3), ['MOVLB 0x1', 'CLRF 0x101', 'CALL 0x1a748'])
        self.assertEqual(_listing(self.code, 0x1A748, 5),
                         ['MOVLB 0x1', 'MOVF 0x101,W', 'BNZ 0x1a752', 'MOVF 0x00,B,W', 'RETURN'])

    def test_the_start_keeps_it_only_after_a_reset_instruction(self):
        """Renamed from `..._clears_it_only_after_...`, the branch read the wrong way round; the body stood.

        `RCON` bit 4 reads 0 after a `RESET` instruction, so `0x1ADC8` returns 1 then and the `BNZ`
        jumps over the clear; any other reset returns 0 and clears it. `0x1ADCE` sets the flag again.
        """
        self.assertEqual(_listing(self.code, 0x1A6A4, 9),
                         ['CALL 0x1adc8', 'IORLW 0x00', 'BNZ 0x1a6b6', 'MOVLB 0x1', 'CLRF 0x103',
                          'MOVLB 0x1', 'CLRF 0x102', 'RCALL 0x1a754', 'GOTO 0x1adce'])
        self.assertEqual(_listing(self.code, 0x1ADC8, 4),
                         ['BTFSS RCON,4', 'RETLW 0x01', 'RETLW 0x00', 'BSF RCON,4'])

    def test_three_held_keys_restart_the_processor(self):
        self.assertEqual(_listing(self.code, KEY_SCAN, 1), ['RCALL 0x1892a'])
        self.assertEqual(_listing(self.code, 0x18942, 10),
                         ['BCF PORTE,1', 'BTFSC PORTB,5', 'BRA 0x18958', 'BSF PORTE,1', 'BCF PORTD,3',
                          'BTFSC PORTB,4', 'BRA 0x18958', 'BSF PORTD,3', 'BCF PORTD,2', 'BTFSS PORTB,6'])
        self.assertEqual(_listing(self.code, 0x18956, 1), ['RESET'])

    def test_three_reset_instructions_and_no_jump_below_the_application(self):
        resets = [at + BASE for at in range(0, len(self.code) - 1, 2) if self.code[at:at + 2] == b'\xff\x00']
        self.assertEqual(resets, [0x16054, 0x18956, 0x1A744])
        self.assertEqual(_listing(self.code, 0x1A742, 2), ['SLEEP', 'RESET'])
        below, addr = [], 0x900A
        while addr < BASE + len(self.code) - 4:
            instr = _at(self.code, addr)
            target = instr.fields.get('target')
            if instr.mnemonic in ('CALL', 'GOTO') and target is not None and target < BASE:
                below.append(addr)
            addr += 2 * instr.words
        self.assertEqual(below, [])


class WhatTheFileTableOffersARecovery(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_boot_images_and_the_resident_application_are_readable(self):
        found = {(row['name'], row['medium']): (row['flags'] & 0x04 != 0, row['flags'] & 0x02 != 0,
                                                row['offset'], row['size'])
                 for row in _rows(self.code)
                 if row['name'] in ('/fw/bootloader', '/fw/safemode', '/fw/normalmode')}
        self.assertEqual(found, {
            ('/fw/bootloader', 'I'): (True, True, 0x000000, 0x1000),
            ('/fw/safemode', 'I'): (True, True, 0x001000, 0x8000),
            ('/fw/normalmode', 'I'): (True, False, 0x009000, 0x15C00),
            ('/fw/normalmode', 'E'): (False, True, 0x000000, 0x15C00),
        })

    def test_the_configurations_erase_misses_the_staged_copy(self):
        staged = [row for row in _rows(self.code) if row['name'] == '/fw/normalmode' and row['medium'] == 'E']
        self.assertEqual(len(staged), 1)
        self.assertLessEqual(staged[0]['offset'] + staged[0]['size'], 0x020000)

    def test_the_check_tests_hg_in_both_internal_images(self):
        # The base's high byte for handle 1, safe mode, and handle 2, the resident application.
        self.assertEqual(_listing(self.code, 0xD6D8, 1), ['MOVLW 0x10'])
        self.assertEqual(_listing(self.code, 0xD700, 1), ['MOVLW 0x90'])
        self.assertEqual(_listing(self.code, 0x14942, 1), ['MOVLW 0x08'])
        self.assertEqual(_listing(self.code, 0x1495A, 1) + _listing(self.code, 0x14960, 1),
                         ['MOVLW 0x48', 'MOVLW 0x47'])
        self.assertEqual(self.code[8:10], b'HG', 'the application carries the header the check expects')


class LogitechsRouteBackFromSafeMode(unittest.TestCase):
    """Stated by Logitech, in their client and package; nothing here says the remote's safe mode image serves it."""

    def test_the_package_writes_the_application_and_asks_for_the_reboot(self):
        lab.require('h350_package')
        with zipfile.ZipFile(io.BytesIO(lab.load('h350_package'))) as package:
            manifest = ET.fromstring(package.read('Description.xml'))
        files = [(f.get('NAME'), f.get('PATH')) for f in manifest.iter('FILE')]
        self.assertEqual(files, [('Region_2.EZUpgrade', '/fw/normalmode')])
        order = [(e.get('NAME'), e.get('RESET')) for e in manifest.iter('ORDER_ELEMENT')]
        self.assertEqual(order, [('Region_2.EZUpgrade', 'true')])

    def test_a_remote_in_safe_mode_is_given_its_firmware(self):
        lab.require('myharmony_update_manager')
        with open(lab.path('myharmony_update_manager'), encoding='utf-8-sig') as handle:
            source = handle.read()
        body = source[source.index('bool IsFirmwareUpgradeRequired('):]
        body = body[:body.index('\n\t}')]
        first = body.index('if (')
        self.assertIn('FirmwareType.SafeMode', body[first:body.index('\n', first)],
                      'the first test is safe mode')
        self.assertIn('return true;', body[first:body.index('}', first)])

    def test_the_firmware_template_is_the_configuration_sequence(self):
        lab.require('myharmony_firmware_h350', 'myharmony_write_h350')

        def steps(name):
            root = ET.parse(lab.path(name)).getroot()
            found = []
            for builder in root.iter('commandbuilder'):
                command = [b.text for b in builder.iter('byte') if b.get('type') == 'command.id'][0]
                packet = builder.find('sendpacketsparser/packet')
                if packet is None:
                    packet = builder.find('sendpacketsparser/repeat/packet')
                params = [p.text for p in packet.findall('param')]
                found.append((command, params[0] if command == '0xFF' else None, builder.get('condition')))
            return found

        self.assertEqual(steps('myharmony_firmware_h350'), steps('myharmony_write_h350'))
        self.assertEqual(len(steps('myharmony_firmware_h350')), 7)


if __name__ == '__main__':
    unittest.main()
