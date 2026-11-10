#!/usr/bin/env python3
"""What tells one Harmony Touch from another on the cable: the identity file's `serial_number`, which the
remote's native program copies out of the unit's manufacturing record, and the empty string when there is
no record.

**The question** was what the bench Touch's unit record should hold, so that the request channel's
rail can check which remote is on the cable. The other remotes on the bench are recorded by their
identity block's two GUIDs, and a Touch refuses `/sys/guid` at open (section 200), so the one per unit value
it offers is the `serial_number` line of `/sys/sysinfo`. Two things had to be known before a rail could
lean on it: where the value comes from, and whether it can be the same on two units. The second is the
trap the identity block taught, section 226: its field named the serial is `0xEE` on every unit, and a
comparison of it matches every remote against every other.

**Where the reading was done.** `usr/bin/hal` of both builds of the remotes' image, 4.15.330 and 4.15.250,
read out of the packages themselves through `test_harmony_touch_image.py` and parsed with
`test_harmony_touch_architecture.py`'s `Elf`. The function that builds the identity answer at start begins
at `0xbbb8`, and `test_harmony_touch_architecture.py` already holds its record on the stack at `sp + 0x68`
and the reader of the manufacturing record it calls at `0x131d0`.

**What was read, and what this file asserts.**

1. **The default is the empty string.** At `0xbbbc` the function loads the start of the read only data,
   `0x27890`, into `r8`; at `0xbc10` it loads the byte at `r8 + 0xa4`, `0x27934`, which is zero, and at
   `0xbc40` stores it at `sp + 0x7e`, which is the record plus 22; `0xbc28` to `0xbc48` then clear the 63
   bytes after it with `memset`. That is a 64 byte character field initialised to the empty string, the
   compiled form of an empty string literal.
2. **The reader copies `unitid` there.** In the reader at `0x131d0`, which keeps the record in `r11`, a key
   compared over six characters with `unitid` (`0x1343c` to `0x1344c`, the string reached through the
   reader's position independent base) sends the value to `strncpy` into `r11 + 22` (`0x1345c`), its length
   first bounded to 63 (`cmp r6, #63` at `0x13460`), and a terminator is stored after it.
3. **The identity file publishes that field as `serial_number`.** `0xbd30` advances the record pointer to
   `r4 + 22` and `0xbd48` stores it as the ninth value passed to `json_pack`, at `sp + 0x38`, beside the
   ninth key at `sp + 0x34`, loaded from the literal at `0xbfb0`, which is the string `serial_number`; the
   ninth conversion of the format is `s:s`, a string.
4. **The bench Touch states a serial the rail can use**: not empty, so its manufacturing record was read and
   holds a `unitid`, and accepted by the rule `unitIdentityFromSerial` applies, at most 63 printable
   characters and not one character repeated. Measured on the unit, and asserted on those properties only:
   neither the value nor its form is stated here or in the reference, since a serial's form describes the
   unit, `reference/` describes the model, and the reference says nothing about a unit.

**What it settles for the rail.** A unit whose `mfg` partition is missing, or whose record has no `unitid`,
states the empty string, the same on every such unit, so `unitIdentityFromSerial` in
`packages/usb/src/identity.ts` refuses the empty serial and filler. **Whether two genuine records can carry the
same `unitid` is not read**: nothing in the image writes one, the record is made at manufacture.

**What it rules out.** That `serial_number` is a constant compiled into the program, which would have made
it the identity block's `0xEE` field over again; and that it can run past 63 characters.

**The controls.** Each made the named test fail alone when its expected value was changed and put back: the
default byte expected as nonzero, the bound expected as 64, and the key expected as `unitid_`.

**Sources checked first.** `reference/remotes/harmony-touch/usb.md`, `reference/architectures/harmony-touch/
README.md` "Which architecture number, 17 or 18", `test_harmony_touch_architecture.py` and the lab's
`notes/1.7-the-architecture-number.md`, which read the same function for the architecture and named the
`unitid` key without following it; `docs/findings.md` sections 200 and 201 for the identity file on the
bench unit. Logitech's client was not a source for this: it reads the serial and sends it to the service
(`RemoteUpdateManager`), and says nothing of where the remote gets it.
"""

import re
import struct
import tempfile
import os
import unittest

import lab
from . import test_harmony_touch_image as image
from .test_harmony_touch_architecture import Elf, HAL, arm_bl_target, arm_mov_immediate

BUILDS = list(image.BUILDS)


@unittest.skipUnless(image.UNSQUASHFS, 'unsquashfs is not installed')
class TheSerialIsTheRecordsUnitIdOrEmpty(unittest.TestCase):
    """Facts 1 to 3, on both builds of the remotes' image."""

    @classmethod
    def setUpClass(cls):
        lab.require(*BUILDS)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.hal = {}
        for name in BUILDS:
            directory = os.path.join(cls.tmp.name, name)
            os.mkdir(directory)
            reader = image.SquashfsReader(image.members(name)['harmony-image.squashfs'], directory)
            cls.hal[name] = Elf(reader.each([HAL])[HAL])

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_the_serial_field_starts_as_the_empty_string(self):
        for name in BUILDS:
            with self.subTest(build=name):
                hal = self.hal[name]
                self.assertEqual(hal.word(0xbbbc), 0xE59F83B8)  # ldr r8, [pc, #0x3b8], the literal at 0xbf7c
                self.assertEqual(hal.word(0xbf7c), 0x27890)
                self.assertEqual(hal.word(0xbc10), 0xE5D830A4)  # ldrb r3, [r8, #0xa4]
                self.assertEqual(hal.data[hal.offset(0x27890 + 0xa4)], 0)
                self.assertEqual(hal.word(0xbc40), 0xE5CD307E)  # strb r3, [sp, #0x7e]: the record, 0x68, plus 22
                # The 63 bytes after it cleared: memset(sp + 127, 0, 63).
                self.assertEqual(arm_mov_immediate(hal.word(0xbc28)), (2, 63))
                self.assertEqual(hal.word(0xbc34), 0xE28D007F)  # add r0, sp, #127
                self.assertEqual(hal.word(0xbc38), 0xE1A01006)  # mov r1, r6, which is 0 from 0xbbd4
                self.assertEqual(arm_mov_immediate(hal.word(0xbbd4)), (6, 0))
                self.assertEqual(arm_bl_target(hal.word(0xbc48), 0xbc48), arm_bl_target(hal.word(0xbc00), 0xbc00))

    def test_the_reader_copies_unitid_there_bounded_to_63_characters(self):
        for name in BUILDS:
            with self.subTest(build=name):
                hal = self.hal[name]
                self.assertEqual(hal.word(0x131e4), 0xE1A0B000)  # mov r11, r0: the record
                base = (0x131f4 + 8 + hal.word(0x134cc)) & 0xFFFFFFFF  # add r7, pc, r7 at 0x131f4
                self.assertEqual(hal.word(0x13444), 0xE0871001)  # add r1, r7, r1
                self.assertEqual(hal.string((base + hal.word(0x134f4)) & 0xFFFFFFFF), b'unitid')
                self.assertEqual(arm_mov_immediate(hal.word(0x13448)), (2, 6))  # compared over six characters
                self.assertEqual(hal.word(0x1345c), 0xE28B0016)  # add r0, r11, #22
                self.assertEqual(hal.word(0x13460), 0xE356003F)  # cmp r6, #63
                self.assertEqual(hal.word(0x13464), 0x83A0E03F)  # movhi lr, #63
                self.assertEqual(hal.word(0x13468), 0x81A0600E)  # movhi r6, lr
                self.assertEqual(hal.word(0x13470), 0xE1A02006)  # mov r2, r6: the bounded length
                # strncpy, and a terminator after the copied characters at r11 + r6 + 22.
                self.assertEqual(hal.word(0x13480), 0xE283C010)  # add r12, r3, #16
                self.assertEqual(hal.word(0x13488), 0xE5CC0006)  # strb r0, [r12, #6]
                self.assertEqual(arm_mov_immediate(hal.word(0x13484)), (0, 0))

    def test_the_identity_file_publishes_that_field_as_serial_number(self):
        for name in BUILDS:
            with self.subTest(build=name):
                hal = self.hal[name]
                self.assertEqual(hal.word(0xbbe0), 0xE28D4068)  # add r4, sp, #104: the record
                self.assertEqual(hal.word(0xbd30), 0xE2844016)  # add r4, r4, #22
                self.assertEqual(hal.word(0xbd48), 0xE58D4038)  # str r4, [sp, #0x38]: the ninth value
                self.assertEqual(hal.word(0xbd40), 0xE59F5268)  # ldr r5, [pc, #0x268], the literal at 0xbfb0
                self.assertEqual(hal.string(hal.word(0xbfb0)), b'serial_number')
                self.assertEqual(hal.word(0xbd5c), 0xE58D5034)  # str r5, [sp, #0x34]: the ninth key
                fmt = hal.string(hal.word(0xbfdc)).decode('ascii')
                self.assertEqual(hal.word(0xbd98), 0xE59F023C)  # ldr r0, [pc, #0x23c]: the format
                pairs = re.findall(r's\??:([a-z])', fmt)
                self.assertEqual(len(pairs), 14)
                self.assertEqual(pairs[8], 's')


class TheBenchTouchStatesAUsableSerial(unittest.TestCase):
    """Fact 4: the bench unit states a serial, so its record was read, and one the rail's rule accepts. The
    value is not printed, and nothing about its form is asserted."""

    def test_the_bench_touch_states_a_serial_the_rail_accepts(self):
        lab.require('touch_sysinfo')
        text = lab.load('touch_sysinfo').decode('ascii', 'replace')
        fields = dict(line.split(' ', 1) for line in text.split('as text:', 1)[1].splitlines() if ' ' in line)
        serial = fields['serial_number'].strip()
        # Not the empty string the program states without a record, so the record was read.
        self.assertNotEqual(serial, '', 'the serial is empty')
        # And what `unitIdentityFromSerial` accepts: at most 63 printable characters, not filler.
        self.assertLessEqual(len(serial), 63)
        self.assertTrue(re.fullmatch(r'[\x21-\x7e]+', serial), 'the serial holds a character that is not printable')
        self.assertNotEqual(serial, serial[0] * len(serial), 'the serial is one character repeated')


if __name__ == '__main__':
    unittest.main()
