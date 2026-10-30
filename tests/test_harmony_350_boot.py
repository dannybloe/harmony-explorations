#!/usr/bin/env python3
"""What a Harmony 300 or 350 runs before its application, read in its own bootloader and safe mode image.

`todo-compile-350.md` 1.4 read recovery in the 1.4 **application** alone and left four questions open,
because the two images below it were in no file the lab held: how each is entered, whether entering
either destroys the application (it does on the Harmony 525), what each serves over USB, and which keys
are read. The bench Harmony 350 serves both as files, `/fw/bootloader` and `/fw/safemode`, and they were
read off it read only into the lab's `reads/20261027T1929Z-h350-fw/`, `h350_bootloader` and
`h350_safemode` here. **One unit and one build**, the 350 on firmware 1.4.0: the Harmony 300 runs the same
application package, but its bootloader and safe mode image have not been read, so every claim below is
the Harmony 350's and is the Harmony 300's only by the shared package, which carries neither image.

**Sources checked first.** `tests/test_harmony_350_recovery.py` and `tests/test_harmony_350_file_write.py`,
whose headers hold the application's side (the request byte at `0x100`, `0x0F` from reboot parameter
`0x73` and 2 from a flush of `/fw/normalmode`; the three key reset; the file table; the application never
jumping below `0x9000`). `reference/usb-protocol/bootloader.md` and section 189 for the Harmony One's and
the Harmony 600's bootloaders; `reference/architectures/harmony-600-650-700/firmware.md` for the Harmony
700's status byte and its safe mode installing a staged copy; the Harmony 525's safe mode, which copies
itself over the application, in `reference/architectures/harmony-5xx/firmware.md`. Logitech's client
through the recovery test's fixtures (the firmware type converter and the update manager). The
constants were grepped in `docs/findings.md` and `reference/` first: the key codes `0x14` and `0x2C` are
section 87's, read in the Harmony 600's bootloader, and nothing had read this family's images.

**The processor.** The images are read with the PIC18F67J50 register map, `isa.PARTS`' default, and that
is checked rather than assumed: the bootloader switches `WDTCON` bit 4 to reach `ANCON0` and `ANCON1`
(`0x7FE` to `0x804`), the J50 family's shadow register trick; it reads `UCON` at `0xF65`, where the
PIC18F4550 has it at `0xF6D`; both images program 64 bytes at a time and safe mode's install erases 1 KiB
pages, the J family's sizes; and
the file table's configuration words sit at `0x01FFF8`, the end of a 128 KiB J part, where a 4550 keeps
them at `0x300000`. Which J part exactly is not checked. **The load addresses are the file table's**,
bootloader at `0x000000` and safe mode at `0x001000`, and both are confirmed by the code: the bootloader's
reset vector is a `GOTO` into its own body, and the safe mode image's header carries `HG` at `+8` and a
`GOTO 0x758E` whose target is inside the image at that base.

## The two reads, and the eight bytes that are missing

* `/fw/bootloader` is 4096 bytes, the whole row.
* **`/fw/safemode` comes back eight bytes short of the image.** Its header states its length less 8,
  `0x0065B8`, as every Harmony image header does, so the image is 26048 bytes; the read is 26040, exactly
  the header field. The application states an internal image's size that way: the open asks `0x14BD2`
  for handle 1 at base `0x001000` and handle 2 at `0x009000` (`0xD60A` to `0xD628`), and `0x14BD2` reads
  the field at `+4` and `+6` and adds nothing. So a read of `/fw/normalmode` would be eight bytes short
  too. The header checksum cannot be checked on the read for the same reason. **The eight missing bytes
  hold a routine the start calls**, `0x75B8` at `0x521E`, four instruction words at most; its three
  neighbours are empty `RETURN` stubs the start also calls, so it is likely another, and that is not
  checked.

## Question 1: what runs at reset, and how the next image is chosen

**Every start passes through both images, in this order, and the bootloader never starts the
application itself.**

* The bootloader's reset vector `GOTO 0x0EFA` sets up its stacks and calls `0x0700`, which scans the
  keypad twice and keeps the second result: **`0x14` stays in the bootloader**, its USB programmer; **`0x2C`
  runs the safe mode image at once**, `GOTO 0x100A`; anything else runs it only if `0x001008` holds `HG`,
  the image header's mark, and otherwise stays in the programmer. Those are the Harmony 600's two codes in
  the same place, section 87. Its only transfers out of its own 4 KiB are the three `GOTO 0x100A`s; it
  never reads the request byte at `0x100` and never looks at the application. Its two interrupt vectors
  point into the application, `0x9400` and `0x9800`, and it never enables interrupts.
* **The safe mode image is the selector.** Its start, `0x520C`, disables interrupts, runs its
  initialisation, and then decides, in this order:
  1. `0x717C`: the request byte is **kept only after a restart by the `RESET` instruction** and cleared
     after any other, a power on among them: `0x7502` tests `RCON` bit 4, which a `RESET` clears, and
     `0x7508` sets it again for next time.
  2. `0x53BC`: a request of `0x0F`, the application's reboot parameter `0x73`, is cleared and **keeps
     safe mode for this one start**.
  3. Otherwise `0x5424`: a request of 2, or 4, 6 or 7, **installs the staged copy**, below, and clears it.
  4. `0x6948` scans the keypad: **`0x03`, `0x32` or `0x2C` keeps safe mode** (the switch at `0x527E`).
  5. Unless something above kept safe mode, `0x53DE` checks the application: the word stored at
     `0x009000` against the header checksum computed over the image, seeds `0x21` and `0x43` (`0x3FE0`,
     medium `0xFE`, internal). Equal, it jumps to `0x900A` through `PCLATH` and `PCL` (`0x529A`); the only
     transfer into the application in the whole image, and computed rather than a `GOTO`.
  6. Otherwise safe mode stays, and serves USB until a reboot sets `0x147`, when its main loop executes
     `RESET` (`0x53B8`).

## Question 2: entering safe mode or the bootloader destroys nothing

**This is the opposite of the Harmony 525**, where safe mode copies itself over the application.

* **Nothing on the start path writes flash except the install, and the install runs only on a request
  of 2, 4, 6 or 7.** Walked from `0x520C` through calls and both arms of every branch, with the USB
  service `0x5666` and the install `0x5424` as stops, the start path reaches no `TBLWT` and no write to
  `EECON1`; the install reaches the page erase `0x6F32` and the word writes, and the USB service reaches
  the rest. The application sets 2 only on a flush of `/fw/normalmode` open for writing, which is the end
  of a firmware install, and nothing in it sets 4, 6 or 7. So holding a safe mode key, the reboot with
  `0x73`, and an application that fails its checksum all enter safe mode and write nothing.
* **The install copies the staged copy, never safe mode itself**: it reads the length at external
  `0x000004`, adds 8, caps it at `0x15C00`, the row's size, erases 1 KiB pages of internal flash from
  `0x009000` and copies the external bytes from `0x000000` over them, committing every 64 bytes. It does
  **not** check the staged copy before erasing, so an install from a bad staged copy leaves a bad
  application; the next step of the same start then fails the checksum and stays in safe mode, which still
  serves USB. The cap keeps the erase below `0x01F400`, the unit's records.
* **The bootloader writes nothing unless a host asks**: walked from its reset vector with the command
  handler `0x0162` as a stop, it reaches no `TBLWT` and no `EECON1` write. Its commands are the Harmony
  600's twelve, `0x00` to `0x0A` and `0xFF`, its erase refusing anything below `0x001000` as there; its
  flash routines reach internal flash only, and the SPI routines it carries (`0x0866` to `0x097E`) have
  no caller.
* **Leaving safe mode** is a plain reboot or a battery pull: a power on clears any request, and a reboot
  over USB leaves none unless it was `0x73`.

The blind spots are the reader's: the walk does not follow a computed jump, the tracer sees direct
accesses only, and the eight unread bytes above. None of this has been done to a unit.

## Question 3: what each serves over USB

* **Safe mode speaks the application's file protocol.** Its device descriptor is the application's byte
  for byte, `046D:C124` release `0x1104`, so the product id cannot tell them apart; **its product string
  can**, `Harmony Remote 4-1.4.0` against the application's `Harmony Remote 0-1.4.0`, the digit being the
  firmware type, and `/sys/sysinfo` answers `fw_type` 4 (`0x3F68` is `RETLW 0x04`), which Logitech's
  client calls safe mode. Ten of its switch tables are the application's, case for case, among them the
  control family (`0x66` reset, `0x62`, `0x6E` and `0x00` reboot, `0x73` reboot into safe mode), device
  control and the check, so it is the same code and not a cut down protocol. Its file table has eleven
  rows: `/fw/safemode` and `/fw/bootloader` readable and writable, `/fw/normalmode` readable resident and
  writable staged, **`/cfg/usercfg` readable and writable**, `/sys/sysinfo`, `/sys/guid`, `/sys/pid`,
  `/sys/sku` and `/fw/config_bits`. So it can take a configuration, and it can take an application image
  through the staged copy, whose flush stores 2 (`0x19F6`) and whose close then reboots (`0x1A6A`), after
  which its own start installs it. That each command behaves as the application's does is a reading of
  shared switch tables, not of every handler.
* **The bootloader is the Microchip programmer the Harmony One and 600 have**, `04D8:000B` at `0x0E98`,
  3329 of its 4096 bytes equal to the Harmony 600's, `reference/usb-protocol/bootloader.md`.
* **So a damaged application is restored by safe mode, through the same seven commands as a
  configuration**: a remote whose application fails the check stays in safe mode, a host writes the
  application to `/fw/normalmode`, flushes and closes, and the next start installs it. That is the
  route Logitech's client takes, the recovery test's `LogitechsRouteBackFromSafeMode`. A damaged safe mode
  image is the bootloader's case: with no `HG` at `0x001008`, or with key `0x14`, it stays in the
  programmer, which can rewrite internal flash above `0x001000`.

## Question 4: the keys

The bootloader and safe mode scan the keypad with one routine, the same literals and port operations
in both apart from one key of its three key reset, and number a key `4 * line + return`, where a drive
line is one of `PORTE` bits 0 to 6 (lines 0 to 6), `PORTA` bits 3 to 5 (7 to 9) or `PORTD` bits 0 to 3
(10 to 13), and a return is `PORTB` bit 4, 5, 6 or 7, numbered 1 to 4. So:

| code | where | what it does at start |
|---|---|---|
| `0x14` | `PORTE` bit 4 with `PORTB` bit 7 | the bootloader stays, as a USB programmer |
| `0x2C` | `PORTD` bit 0 with `PORTB` bit 7 | the bootloader runs safe mode unchecked, and safe mode stays |
| `0x03` | `PORTE` bit 0 with `PORTB` bit 6 | safe mode stays |
| `0x32` | `PORTD` bit 2 with `PORTB` bit 5 | safe mode stays |

Which printed keys those are was not known when this was written. `tests/test_harmony_350_keys.py` read the
application's scan, the same routine, and tied codes to keys from configurations: by that table `0x14` is the
digit 0, `0x2C` Play, `0x03` Power and `0x32` OK, none of it tried on a remote.
Each scan also opens with a three key reset: safe mode's tests the application's three keys, and the
bootloader's swaps one of them for code `0x14`'s key.

**Standing.** Read in the firmware, one unit's two images; nothing here has been sent to a remote.
"""
import unittest

import lab
from harmony import firmware
from harmony.pic18 import chains, disasm, isa, trace

BOOT_BASE = 0x0000
SAFE_BASE = 0x1000
APP_BASE = 0x9000

CONDITIONAL_SKIPS = ('CPFSEQ', 'CPFSGT', 'CPFSLT', 'DECFSZ', 'DCFSNZ', 'INCFSZ', 'INFSNZ', 'TSTFSZ',
                     'BTFSC', 'BTFSS')


def _listing(code, base, start, count):
    """The listing's instruction text from `start`, without address and bytes."""
    out = []
    for line in disasm.disassemble(code, base, start, count):
        tokens = line.split(':', 1)[1].split()
        while tokens and len(tokens[0]) == 2 and all(c in '0123456789abcdef' for c in tokens[0]):
            tokens.pop(0)
        out.append(' '.join(tokens))
    return out


def _reach(code, base, entries, stops=()):
    """Every instruction reachable from `entries` through calls and both arms of every branch.

    The same walk as the recovery test's, with `stops`: an address the walk does not enter, so a
    question about one path can leave another out. A computed jump is not followed.
    """
    seen, work = set(), list(entries)
    while work:
        addr = work.pop()
        while base <= addr < base + len(code) - 1 and addr not in seen and addr not in stops:
            seen.add(addr)
            instr = isa.decode(code, addr - base, base)
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
                work.append(nxt + 2 * isa.decode(code, nxt - base, base).words)
            addr = nxt
    return seen


def _flash_writes(code, base, addrs):
    """The instructions among `addrs` that program or arm internal flash: a `TBLWT` or a write to `EECON1`.

    `EECON1` is `0xFA6`, reached through the access bank, so an `a = 1` operand of `0xA6` is a variable in
    the selected bank and not the register.
    """
    found = []
    for addr in sorted(addrs):
        instr = isa.decode(code, addr - base, base)
        if instr.mnemonic.startswith('TBLWT'):
            found.append(addr)
        elif (instr.fields.get('f') == 0xA6 and instr.fields.get('a') == 0
              and instr.mnemonic in ('MOVWF', 'BSF', 'BCF', 'CLRF', 'SETF')):
            found.append(addr)
    return found


def _boot():
    return lab.load('h350_bootloader')


def _safe():
    return lab.load('h350_safemode')


def _app():
    return lab.load('h350_code')


def _key_position(code):
    """Where on the matrix a scan code sits, by the formula the scan routine computes. See the header."""
    line, ret = divmod(code - 1, 4)
    if line < 7:
        drive = ('PORTE', line)
    elif line < 10:
        drive = ('PORTA', line - 7 + 3)
    else:
        drive = ('PORTD', line - 10)
    return drive + (4 + ret,)


class TheTwoReads(unittest.TestCase):
    def setUp(self):
        lab.require('h350_bootloader', 'h350_safemode')

    def test_the_bootloader_is_the_whole_row(self):
        self.assertEqual(len(_boot()), 0x1000)

    def test_safe_mode_is_read_eight_bytes_short_of_the_length_its_header_states(self):
        image = _safe()
        header = firmware.parse_header(image, SAFE_BASE)
        self.assertTrue(header.has_magic)
        self.assertEqual(header.version, '1.4')
        self.assertEqual(header.stated_size, 26048)
        self.assertEqual(len(image), 26040)
        self.assertEqual(len(image), header.size_field | (header.family_byte << 16),
                         'the read is exactly the header field, the length less 8')
        self.assertEqual(header.entry_point, 0x758E)

    def test_the_application_serves_an_internal_images_size_as_the_header_field(self):
        lab.require('h350_code')
        app = _app()
        self.assertEqual(_listing(app, APP_BASE, 0xD60A, 15),
                         ['MOVLB 0xc', 'MOVLW 0x01', 'MOVWF 0xc05', 'MOVLB 0x0', 'CLRF 0x0e2',
                          'MOVLW 0x10', 'BRA 0x0d624', 'MOVLB 0xc', 'MOVLW 0x01', 'MOVWF 0xc05',
                          'MOVLB 0x0', 'CLRF 0x0e2', 'MOVLW 0x90', 'MOVWF 0x0e3', 'CLRF 0x0e4'])
        self.assertEqual(_listing(app, APP_BASE, 0xD628, 1), ['CALL 0x14bd2'])
        body = _listing(app, APP_BASE, 0x14BD2, 50)
        literals = [line for line in body if line.startswith('MOVLW')]
        self.assertEqual(literals, ['MOVLW 0x04', 'MOVLW 0x00', 'MOVLW 0x04', 'MOVLW 0x00', 'MOVLW 0x02',
                                    'MOVLW 0x00'],
                         'the field at +4 and +6, and no 8 added')

    def test_the_header_checksum_does_not_close_over_the_read(self):
        """The missing eight bytes carry the difference; a whole image would verify."""
        image = _safe()
        self.assertNotEqual(firmware.compute_checksum(image), image[0] | (image[1] << 8))

    def test_the_start_calls_into_the_unread_bytes(self):
        image = _safe()
        self.assertEqual(_listing(image, SAFE_BASE, 0x521E, 1), ['CALL 0x075b8'])
        self.assertEqual(SAFE_BASE + len(image), 0x75B8)
        self.assertEqual(_listing(image, SAFE_BASE, 0x75B2, 3), ['RETURN', 'RETURN', 'RETURN'])


class TheBootloaderAlwaysHandsOnToSafeMode(unittest.TestCase):
    def setUp(self):
        lab.require('h350_bootloader')
        self.code = _boot()

    def test_the_reset_vector_runs_the_decision(self):
        self.assertEqual(_listing(self.code, BOOT_BASE, 0x0000, 1), ['GOTO 0x00efa'])
        self.assertEqual(_listing(self.code, BOOT_BASE, 0x0F0A, 3),
                         ['CALL 0x00f18', 'CALL 0x00700', 'BRA 0x00f0a'])

    def test_the_interrupt_vectors_point_into_the_application_and_interrupts_stay_off(self):
        self.assertEqual(_listing(self.code, BOOT_BASE, 0x0008, 1), ['GOTO 0x09400'])
        self.assertEqual(_listing(self.code, BOOT_BASE, 0x0018, 1), ['GOTO 0x09800'])
        listing = _listing(self.code, BOOT_BASE, 0, 1900)
        self.assertEqual([line for line in listing if 'INTCON,7' in line], ['BCF INTCON,7'])

    def test_key_0x14_stays_key_0x2c_runs_safe_mode_and_otherwise_the_header_decides(self):
        self.assertEqual(_listing(self.code, BOOT_BASE, 0x0716, 26),
                         ['CALL 0x00360', 'MOVLB 0xf', 'MOVWF 0xf36', 'CALL 0x00360', 'MOVLB 0xf',
                          'MOVWF 0xf36', 'MOVLW 0x14', 'MOVLB 0xf', 'SUBWF 0xf36,W', 'BNZ 0x0073c',
                          'MOVLB 0x0', 'MOVLW 0x06', 'MOVWF 0x0ae', 'CALL 0x009ba', 'BRA 0x0075e',
                          'BRA 0x00748', 'MOVLW 0x2c', 'MOVLB 0xf', 'SUBWF 0xf36,W', 'BNZ 0x00748',
                          'GOTO 0x0100a', 'RCALL 0x00782', 'IORLW 0x00', 'BZ 0x00754', 'GOTO 0x0100a',
                          'BRA 0x0075e'])
        self.assertEqual(_listing(self.code, BOOT_BASE, 0x075E, 5),
                         ['CLRF TBLPTRL', 'CLRF TBLPTRH', 'CLRF TBLPTRU', 'RCALL 0x007e6', 'RCALL 0x0084c'])

    def test_the_header_test_reads_hg_at_0x1008(self):
        self.assertEqual(_listing(self.code, BOOT_BASE, 0x0782, 6),
                         ['MOVLB 0xf', 'MOVLW 0x08', 'MOVWF 0xf0a', 'MOVLW 0x10', 'MOVWF 0xf0b',
                          'CLRF 0xf0c'])
        self.assertEqual(_listing(self.code, BOOT_BASE, 0x0796, 1), ['MOVLW 0x48'])
        self.assertEqual(_listing(self.code, BOOT_BASE, 0x079E, 1), ['MOVLW 0x47'])

    def test_it_leaves_its_4_kib_only_for_safe_mode(self):
        reached = _reach(self.code, BOOT_BASE, [0x0000])
        out = sorted((addr, isa.decode(self.code, addr, BOOT_BASE).fields['target']) for addr in reached
                     if isa.decode(self.code, addr, BOOT_BASE).fields.get('target', 0) >= 0x1000)
        self.assertEqual(out, [(0x026A, 0x100A), (0x0744, 0x100A), (0x074E, 0x100A)])

    def test_it_never_touches_the_request_byte(self):
        reached = _reach(self.code, BOOT_BASE, [0x0000])
        accesses = [access.addr for found in trace.trace(self.code, BOOT_BASE,
                                                         [0x100, 0x101, 0x102, 0x103]).values()
                    for access in found if access.addr in reached]
        self.assertEqual(accesses, [])


class TheBootloaderIsTheHarmony600sProgrammer(unittest.TestCase):
    def setUp(self):
        lab.require('h350_bootloader')
        self.code = _boot()

    def test_it_enumerates_as_microchip(self):
        self.assertEqual(self.code[0x0E98:0x0E98 + 18].hex(), '1201000200000008d8040b00000000000001')

    def test_it_writes_nothing_until_a_host_asks(self):
        self.assertEqual(_flash_writes(self.code, BOOT_BASE, _reach(self.code, BOOT_BASE, [0x0000],
                                                                    stops={0x0162})), [])
        self.assertEqual(_flash_writes(self.code, BOOT_BASE, _reach(self.code, BOOT_BASE, [0x0162])),
                         [0x0060, 0x00A6, 0x00DE, 0x00E4, 0x0108, 0x0124, 0x02FA])

    def test_the_erase_refuses_the_bootloader_itself(self):
        self.assertEqual(_listing(self.code, BOOT_BASE, 0x00F6, 8),
                         ['MOVLB 0x4', 'MOVLW 0x00', 'SUBWF 0x422,W', 'MOVLW 0x10', 'SUBWFB 0x423,W',
                          'MOVLW 0x00', 'SUBWFB 0x424,W', 'BNC 0x00122'])

    def test_its_spi_routines_have_no_caller(self):
        reached = _reach(self.code, BOOT_BASE, [0x0000])
        self.assertEqual([addr for addr in range(0x0866, 0x0980, 2) if addr in reached], [])

    def test_its_commands_and_keys_are_the_harmony_600s(self):
        lab.require('h600_internal_fe')
        other = lab.load('h600_internal_fe')[:0x1000]
        self.assertEqual(sorted(chains.chain_table(self.code, BOOT_BASE, 0x01A8)),
                         [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0xFF])
        self.assertEqual(sorted(chains.chain_table(other, BOOT_BASE, 0x01A8)),
                         sorted(chains.chain_table(self.code, BOOT_BASE, 0x01A8)))
        for at in (0x0726, 0x073C):
            with self.subTest(at=hex(at)):
                self.assertEqual(_listing(other, BOOT_BASE, at, 1), _listing(self.code, BOOT_BASE, at, 1))
        self.assertEqual(sum(a == b for a, b in zip(self.code, other)), 3329)


class SafeModeChoosesWhatRuns(unittest.TestCase):
    def setUp(self):
        lab.require('h350_safemode')
        self.code = _safe()

    def test_the_start_in_order(self):
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x520C, 1), ['BCF INTCON,7'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x5216, 1), ['CALL 0x0717c'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x524E, 1), ['RCALL 0x053bc'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x525C, 1), ['RCALL 0x05424'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x5272, 1), ['CALL 0x06948'])
        self.assertEqual(chains.chain_table(self.code, SAFE_BASE, 0x527E),
                         {0x03: 0x528C, 0x32: 0x528C, 0x2C: 0x528C})
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x528C, 1), ['BRA 0x052b4'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x528E, 5),
                         ['MOVLB 0xd', 'MOVF 0xdac,W', 'BNZ 0x052b2', 'RCALL 0x053de', 'IORLW 0x00'])

    def test_the_jump_into_the_application_is_computed(self):
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x529A, 5),
                         ['CLRF PCLATU', 'MOVLW 0x90', 'MOVWF PCLATH', 'MOVLW 0x0a', 'MOVWF PCL'])
        out, addr = [], 0x100E
        while addr < SAFE_BASE + len(self.code) - 2:
            instr = isa.decode(self.code, addr - SAFE_BASE, SAFE_BASE)
            target = instr.fields.get('target')
            if instr.mnemonic in ('CALL', 'GOTO') and not SAFE_BASE <= target < 0x75C0:
                out.append(addr)
            addr += 2 * instr.words
        self.assertEqual(out, [], 'no CALL or GOTO leaves the image')

    def test_the_request_is_kept_only_after_a_reset_instruction(self):
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x717C, 10),
                         ['MOVLB 0x1', 'CLRF 0x147', 'CALL 0x07502', 'IORLW 0x00', 'BNZ 0x07192',
                          'MOVLB 0x1', 'CLRF 0x103', 'MOVLB 0x1', 'CLRF 0x102', 'RCALL 0x07204'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x7502, 4),
                         ['BTFSS RCON,4', 'RETLW 0x01', 'RETLW 0x00', 'BSF RCON,4'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x7192, 1), ['GOTO 0x07508'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x7204, 4),
                         ['MOVLB 0x1', 'MOVF 0x102,W', 'BNZ 0x0720e', 'MOVFF 0x103,0x100'])

    def test_request_0x0f_keeps_safe_mode_once(self):
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x53BC, 12),
                         ['MOVLB 0x1', 'CLRF 0x101', 'CALL 0x071f8', 'MOVLB 0xd', 'MOVWF 0xd00',
                          'MOVLW 0x0f', 'SUBWF 0xd00,W', 'BNZ 0x053dc', 'MOVLB 0x1', 'CLRF 0x103',
                          'MOVLB 0x1', 'CLRF 0x102'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x53D6, 2), ['CALL 0x07204', 'RETLW 0x01'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x71F8, 4),
                         ['MOVLB 0x1', 'MOVF 0x101,W', 'BNZ 0x07202', 'MOVF 0x00,B,W'],
                         'the request byte, 0x100, in bank 1')

    def test_request_2_installs_the_staged_copy(self):
        # 4 becomes 2 and 7 becomes 6, and 2 or 6 installs.
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x542C, 20),
                         ['MOVLB 0xd', 'MOVWF 0xd0d', 'MOVLW 0x04', 'SUBWF 0xd0d,W', 'BNZ 0x0543a', 'MOVLW 0x02', 'MOVWF 0x0d,B',
                          'MOVLW 0x07', 'SUBWF 0x0d,B,W', 'BNZ 0x05444', 'MOVLW 0x06', 'MOVWF 0x0d,B',
                          'MOVLW 0x02', 'SUBWF 0x0d,B,W', 'BZ 0x05452', 'MOVLW 0x06', 'SUBWF 0x0d,B,W',
                          'BZ 0x05452', 'BRA 0x05612', 'BCF LATF,7'])
        # The staged header's length field, external 0x000004, plus 8, capped at 0x15C00.
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x5454, 4),
                         ['MOVLW 0x04', 'MOVWF TBLPTRL', 'CLRF TBLPTRH', 'CLRF TBLPTRU'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x546E, 1), ['MOVLW 0x08'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x548C, 4),
                         ['MOVLW 0x5c', 'MOVWF 0x07,B', 'MOVLW 0x01', 'MOVWF 0x08,B'])
        # Source external 0x000000, target internal 0x009000.
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x5494, 7),
                         ['CLRF 0x00,B', 'CLRF 0x01,B', 'CLRF 0x02,B', 'CLRF 0x03,B', 'MOVLW 0x90',
                          'MOVWF 0x04,B', 'CLRF 0x05,B'])
        # One 1 KiB page erased per pass, then a commit every 0x20 words.
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x5516, 1), ['CALL 0x06f32'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x6F40, 2), ['MOVLW 0x14', 'MOVWF EECON1'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x55A2, 1), ['MOVLW 0x20'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x55CE, 1), ['CALL 0x06f64'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x6F72, 2), ['MOVLW 0x04', 'MOVWF EECON1'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x5606, 5),
                         ['MOVLB 0x1', 'CLRF 0x103', 'MOVLB 0x1', 'CLRF 0x102', 'CALL 0x07204'])
        self.assertLess(APP_BASE + 0x15C00, 0x01F400, 'the cap keeps the erase below the unit records')

    def test_the_application_check_is_its_header_checksum(self):
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x53DE, 5),
                         ['MOVLB 0x0', 'CLRF 0x0f4', 'MOVLW 0x90', 'MOVWF 0x0f5', 'CLRF 0x0f6'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x53F6, 1), ['MOVLW 0xfe'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x5404, 1), ['CALL 0x03fe0'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x3FE0, 5),
                         ['MOVLB 0xd', 'MOVLW 0x21', 'MOVWF 0xd69', 'MOVLW 0x43', 'MOVWF 0xd6a'])
        self.assertEqual((firmware.CHECKSUM_SEED_EVEN, firmware.CHECKSUM_SEED_ODD), (0x21, 0x43))

    def test_nothing_on_the_start_path_writes_flash_but_the_install(self):
        start = _reach(self.code, SAFE_BASE, [0x520C], stops={0x5666, 0x5424})
        self.assertEqual(_flash_writes(self.code, SAFE_BASE, start), [])
        self.assertEqual(_flash_writes(self.code, SAFE_BASE, _reach(self.code, SAFE_BASE, [0x5424])),
                         [0x6F2E, 0x6F42, 0x6F60, 0x6F74])
        self.assertEqual(_flash_writes(self.code, SAFE_BASE, _reach(self.code, SAFE_BASE, [0x5666])),
                         [0x6F2E, 0x6F42, 0x6F60, 0x6F74, 0x7032, 0x7038, 0x703A, 0x703C, 0x704A,
                          0x7054, 0x7056])
        self.assertIn(0x5666, _reach(self.code, SAFE_BASE, [0x520C]), 'the stop is on the start path')

    def test_interrupts_stay_off(self):
        listing = _listing(self.code, SAFE_BASE, SAFE_BASE + 0x10E, 13000)
        self.assertEqual(sum('BSF INTCON,7' in line for line in listing), 2)
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x74C4, 2), ['BSF INTCON,6', 'BSF INTCON,7'])
        self.assertNotIn(0x74C4, _reach(self.code, SAFE_BASE, [0x520C]))
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x74E0, 4),
                         ['MOVLB 0xe', 'MOVF 0xee9,W', 'BTFSC WREG,0', 'BSF INTCON,7'],
                         'the other only puts back the state saved before a flash write')


class SafeModeServesTheFileProtocol(unittest.TestCase):
    def setUp(self):
        lab.require('h350_safemode', 'h350_code')
        self.code = _safe()
        self.app = _app()

    def test_its_device_descriptor_is_the_applications_and_its_product_string_is_not(self):
        self.assertEqual(self.code[0x101E - SAFE_BASE:0x101E - SAFE_BASE + 18],
                         self.app[0x1AC04 - APP_BASE:0x1AC04 - APP_BASE + 18])
        self.assertEqual(self.code[0x101E - SAFE_BASE:0x101E - SAFE_BASE + 18].hex(),
                         '12010002000000086d0424c1041101020001')

        def product(image, at):
            return image[at:at + 44].decode('utf-16-le')

        self.assertEqual(product(self.code, 0x105F - SAFE_BASE), 'Harmony Remote 4-1.4.0')
        self.assertEqual(product(self.app, 0x1AC45 - APP_BASE), 'Harmony Remote 0-1.4.0')

    def test_its_sysinfo_states_firmware_type_4(self):
        self.assertEqual(self.code[0x11D4 - SAFE_BASE:0x11D4 - SAFE_BASE + 12], b'\nfw_type 0x\x00')
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x2F9E, 5),
                         ['MOVLB 0xd', 'MOVLW 0xd4', 'MOVWF 0xd68', 'MOVLW 0x11', 'MOVWF 0xd69'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x2FD2, 1), ['CALL 0x03f68'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x3F68, 1), ['RETLW 0x04'])

    def test_its_file_table(self):
        rows = []
        for index in range(11):
            at = 0x1230 - SAFE_BASE + index * 11
            record = self.code[at:at + 11]
            pointer = record[1] | (record[2] << 8)
            name = self.code[pointer - SAFE_BASE:self.code.index(b'\x00', pointer - SAFE_BASE)].decode()
            rows.append((name, record[3], chr(record[4]), int.from_bytes(record[5:8], 'little'),
                         int.from_bytes(record[8:11], 'little')))
        self.assertEqual(rows, [
            ('/fw', 0x0E, 'D', 0, 0),
            ('/fw/safemode', 0x07, 'I', 0x001000, 0x8000),
            ('/fw/normalmode', 0x05, 'I', 0x009000, 0x15C00),
            ('/fw/normalmode', 0x02, 'E', 0x000000, 0x15C00),
            ('/fw/bootloader', 0x07, 'I', 0x000000, 0x1000),
            ('/cfg/usercfg', 0x06, 'E', 0x020000, 0x40000),
            ('/sys/sysinfo', 0x04, 'D', 0, 0),
            ('/sys/guid', 0x06, 'I', 0x01F400, 0x40),
            ('/sys/pid', 0x06, 'I', 0x01F640, 0x40),
            ('/sys/sku', 0x06, 'I', 0x01F4C0, 0x40),
            ('/fw/config_bits', 0x04, 'I', 0x01FFF8, 0x08),
        ])

    def test_ten_of_its_switches_are_the_applications(self):
        # Each with its case count, so a switch that stopped decoding on both sides fails here too.
        pairs = ((0x14BE, 0xCD6A, 5), (0x1980, 0xD24E, 3), (0x1B16, 0xD5FA, 3), (0x1BB8, 0xD69C, 5),
                 (0x1D7C, 0xE2F8, 3), (0x2216, 0xE988, 5), (0x271A, 0xF79E, 8), (0x39A8, 0x150DE, 9),
                 (0x3B8A, 0x152C0, 3), (0x7312, 0x9098, 4))
        for here, there, count in pairs:
            with self.subTest(safe=hex(here), app=hex(there)):
                ours = [case.value for case in chains.xor_chain(self.code, SAFE_BASE, here)]
                theirs = [case.value for case in chains.xor_chain(self.app, APP_BASE, there)]
                self.assertEqual(ours, theirs)
                self.assertEqual(len(ours), count)
        self.assertEqual([case.value for case in chains.xor_chain(self.code, SAFE_BASE, 0x14BE)],
                         [0x66, 0x62, 0x6E, 0x00, 0x73])

    def test_reboot_0x73_asks_for_safe_mode_again(self):
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x14E2, 5),
                         ['MOVLB 0x1', 'MOVLW 0x0f', 'MOVWF 0x103', 'MOVLB 0x1', 'CLRF 0x102'])

    def test_a_staged_application_is_flushed_to_request_2_and_the_close_reboots(self):
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x19DE, 10),
                         ['MOVLW 0x02', 'MOVLB 0xf', 'SUBWF 0xf01,W', 'BZ 0x019e8', 'BRA 0x01afc',
                          'MOVLW 0x57', 'MOVLB 0xf', 'SUBWF 0xf09,W', 'BZ 0x019f2', 'BRA 0x01afc'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x19F2, 5),
                         ['MOVLB 0x1', 'MOVLW 0x02', 'MOVWF 0x103', 'MOVLB 0x1', 'CLRF 0x102'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x1A6C, 6),
                         ['CALL 0x071f8', 'MOVLB 0xd', 'MOVWF 0xd63', 'MOVLW 0x02', 'SUBWF 0xd63,W',
                          'BNZ 0x01afc'], 'the close reads the request back and reboots on 2')
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x1A86, 3), ['MOVLB 0x1', 'MOVLW 0x01', 'MOVWF 0x147'])
        self.assertEqual(_listing(self.code, SAFE_BASE, 0x53B2, 4),
                         ['MOVLB 0x1', 'MOVF 0x147,W', 'BZ 0x053ba', 'RESET'])


class TheKeys(unittest.TestCase):
    def setUp(self):
        lab.require('h350_bootloader', 'h350_safemode')
        self.boot = _boot()
        self.safe = _safe()

    @staticmethod
    def _shape(listing):
        """The literals and port operations, which carry the routine's meaning, in order."""
        keep = ('MOVLW', 'ANDLW', 'MULLW', 'RETLW', 'SUBLW', 'IORLW')
        return [line for line in listing if line.split()[0] in keep or 'PORT' in line]

    def test_the_two_scans_are_one_routine_but_for_one_reset_key(self):
        ours = self._shape(_listing(self.boot, BOOT_BASE, 0x0360, 210))
        theirs = self._shape(_listing(self.safe, SAFE_BASE, 0x6948, 210))
        self.assertEqual(len(ours), len(theirs))
        self.assertEqual([(a, b) for a, b in zip(ours, theirs) if a != b],
                         [('BCF PORTE,4', 'BCF PORTD,3'), ('BTFSC PORTB,7', 'BTFSC PORTB,4'),
                          ('BSF PORTE,4', 'BSF PORTD,3')])

    def test_the_scan_numbers_a_key_four_per_line(self):
        # Returns 1 to 4 for PORTB bits 4 to 7.
        self.assertEqual(_listing(self.boot, BOOT_BASE, 0x0340, 9),
                         ['BTFSS PORTB,4', 'RETLW 0x01', 'BTFSS PORTB,5', 'RETLW 0x02', 'BTFSS PORTB,6',
                          'RETLW 0x03', 'BTFSS PORTB,7', 'RETLW 0x04', 'RETLW 0x00'])
        # PORTE lines count from 1, PORTA's from 8 and PORTD's from 11, and the code is 4 * (that - 1) + return.
        self.assertEqual(_listing(self.boot, BOOT_BASE, 0x03E8, 4),
                         ['MOVLB 0xd', 'INCF 0xd02,W', 'MOVLB 0xd', 'MOVWF 0xd01'])
        self.assertEqual(_listing(self.boot, BOOT_BASE, 0x0450, 3), ['MOVLW 0x08', 'MOVLB 0xd', 'ADDWF 0xd02,W'])
        self.assertEqual(_listing(self.boot, BOOT_BASE, 0x04BA, 3), ['MOVLW 0x0b', 'MOVLB 0xd', 'ADDWF 0xd02,W'])
        self.assertEqual(_listing(self.boot, BOOT_BASE, 0x04EA, 8),
                         ['MOVLB 0xd', 'DECF 0xd01,F', 'MOVLB 0xd', 'MOVF 0xd01,W', 'MULLW 0x04', 'MOVF PRODL,W',
                          'MOVLB 0xd', 'ADDWF 0xd00,W'])
        # And the three groups drive PORTE bits 0 to 6, PORTA bits 3 to 5 and PORTD bits 0 to 3 low.
        self.assertEqual(_listing(self.boot, BOOT_BASE, 0x03D4, 1), ['ANDLW 0x7f'])
        self.assertEqual(_listing(self.boot, BOOT_BASE, 0x0428, 1), ['MOVLW 0x08'])
        self.assertEqual(_listing(self.boot, BOOT_BASE, 0x043C, 1), ['ANDLW 0x38'])
        self.assertEqual(_listing(self.boot, BOOT_BASE, 0x04A6, 1), ['ANDLW 0x0f'])

    def test_where_the_four_codes_sit(self):
        self.assertEqual({hex(code): _key_position(code) for code in (0x14, 0x2C, 0x03, 0x32)},
                         {'0x14': ('PORTE', 4, 7), '0x2c': ('PORTD', 0, 7),
                          '0x3': ('PORTE', 0, 6), '0x32': ('PORTD', 2, 5)})

    def test_each_scan_opens_with_a_three_key_reset(self):
        self.assertEqual(_listing(self.boot, BOOT_BASE, 0x0378, 11),
                         ['BCF PORTE,1', 'BTFSC PORTB,5', 'BRA 0x0038e', 'BSF PORTE,1', 'BCF PORTE,4',
                          'BTFSC PORTB,7', 'BRA 0x0038e', 'BSF PORTE,4', 'BCF PORTD,2', 'BTFSS PORTB,6',
                          'RESET'])
        self.assertEqual(_listing(self.safe, SAFE_BASE, 0x6960, 11),
                         ['BCF PORTE,1', 'BTFSC PORTB,5', 'BRA 0x06976', 'BSF PORTE,1', 'BCF PORTD,3',
                          'BTFSC PORTB,4', 'BRA 0x06976', 'BSF PORTD,3', 'BCF PORTD,2', 'BTFSS PORTB,6',
                          'RESET'])
        self.assertEqual(_key_position(0x14), ('PORTE', 4, 7), 'the bootloader\'s second reset key is 0x14')


if __name__ == '__main__':
    unittest.main()
