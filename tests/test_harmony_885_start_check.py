"""
The Harmony 880 and 885 at start: a safe mode that is a configuration, and a check that runs once.

**Read in the firmware** on 4 November 2026, items 1.2 and 1.6 of `todo/todo-prepare-885.md`, in the
885's application 4.4 (`arch8_code_885`, base `0x010000`) and, for the build question, in the 880's, the
880 Pro's, an 880's from a second contributor and the Harmony 720's application images. No remote was
opened. Every instruction is decoded through `harmony.pic18.isa`, every switch through
`harmony.pic18.chains`. Addresses are the 885 application's.

**Sources checked before the work**: `reference/architectures/harmony-880-885/`, which listed the
application's own safe mode as not checked and held the built in configuration at
`0x01E000` as a container nobody had seen used; `tests/test_harmony_885_bootloader.py`, item 1.1, for
the bootloader's half of start; the archive's sections 114 (the built in configuration found), 249 and
250 (the Harmony One's and the 600's start check, which this is compared with) and 41 (the trailer
checksum). **Logitech's client, decision 2**: MyHarmony names nothing of this platform; the classic
client was read for one thing only, its safe mode writer, which on this architecture falls through to
its bootloader writer, so Logitech's own software treats the bootloader as this platform's safe mode
program (stated by Logitech, in their client; not asserted here, since it is a statement about a
host's choice and not about the remote). The same client's firmware update for this platform writes a new
application at `0x1D0000`, its address of new code here, and then sets the status byte to 2, so the
bootloader installs it at the next restart (stated by Logitech, in their client; item 1.1 holds the
address, and the order is not asserted).

## A safe mode that is a configuration

Every slot seek goes through `0x191C2`, which sets the configuration base to `0x020000` when data
`0x086` bit 3 is set and to `0x01E000` when it is clear. So the application runs one of two
configurations, the user's or the 7049 byte one built into its own last 8 KiB, and which is one bit.
The flag byte's other bits: bit 1 the built in configuration passed, bit 2 the user configuration
passed.

At start (main `0x16D12`, called only from the C start up at `0x1A85C`, which the reset vector's
`GOTO` at `0x010C00` reaches): the start routine `0x180A4` clears bits 0, 1 and 2; main clears bit 3
and checks the built in configuration (`0x16DDC`, `0x16DDE`); tests the identity block (`0x182C2`:
48 bytes from `0x000110`, 1 at the first that is not `0xFF`); **blank**: clears bit 2, shows message
`0x1B` and never checks the user configuration (`0x16E00` to `0x16E0C`); **present**: sets bit 3 and
checks the user configuration (`0x16DEA`, `0x16DEC`), and if it failed clears bit 3 again (`0x16DFC`).
The check's own tail clears bit 3 too when only the built in configuration passed (`0x1728C`). Then the
battery calibration test (`0x10DE6` to `0x10E14`): when the word at `0x000160` is `0xFFFF` it clears
bit 2, leaves bit 3, and shows message `0x16`.

**Write misc selector 2** (`0x159DC`) calls `0x163BE` and clears bits 2 and 3, so from then on every seek
goes to the built in configuration. **Nothing sets bit 3 again but a start**: the only `BSF` of it with
the bank select at 0 are main's (`0x16DEA`) and `0x167CA`, inside `0x167BA`, which no instruction
transfers control to; the message routine writes the whole byte back at `0x16A60`, restoring the value
it read, so it cannot set a bit that was clear. Asserted below by a scan. That nothing reaches
`0x167BA` through a table the scan cannot see is inferred, not proved: no stored copy of its address
was found in either byte order by the reading.

**The program half of safe mode is the bootloader**, item 1.1: the application reaches it by restarting
(the escape's restart, a three key combination, and the power down routine's wake, item 1.5 and
`tests/test_harmony_885_write_end.py`), and nothing in the application writes the staged install status
byte with a value of its own: data `0x100` has one direct writer, the `MOVFF` at `0x1827E`, whose two
callers are write misc selector 6 (`0x159F0`, with the host's two bytes) and the start routine (`0x180C0`,
with both cleared, reached only when the reset was not the `RESET` instruction), a census over the whole
application asserted below. Write misc selector 7's indirect write reaches the byte too, at the host's
choice. Software type 4 does not occur on this platform.

## The check, `0x1701E`

Four conditions, in this order, each read through the base selector: `TPTP` at the base, `WLWL` at base
`+0x5F`, `DKDK` at the address the three bytes at base `+4` state (a `u24`, `0x19062`, so the top byte
of the header's `u32` is never read), and the two bytes before `DKDK` against seeds `0x21` and `0x43`
XORed with the even and odd bytes of `(end - 2 - base) >> 1` words from the base. The end address is
absolute, the base fixed by the firmware: nothing in the container says where it sits. The literals are
asserted in the code and the simulation below takes them from there.

**What it does not read**: the pointer count at `0x08`, the end address's top byte, any section
pointer, the architecture record (raw slot 1, which the application never seeks: every seek site is a
literal raw slot from 2 to 18, 22 calls to the seek routine `0x191DE` by a reviewer's count, not asserted
here) and the skin.
So a container with any of those wrong passes. Controls below.

**The verdict and the message.** The built in check (bit 3 clear) sets or clears bit 1 and shows
nothing. The user check sets bit 2 on a pass; on a checksum mismatch it clears bit 2 and sets the byte
at data `0x2C3`, which it cleared on entry; a marker failure branches straight to the verdict with
`0x2C3` still clear. So a marker failure shows message `0x00` and a checksum failure message `0x1A`
(`0x17246` to `0x1726C`). By the strings laid out before each screen in the built in configuration, the
three messages read "Go to Website / to update settings", "Configuration Corrupted" and, for `0x1B`,
"Missing License"; and `0x16` "Battery ADC Not Calibrated". That attribution is a layout reading of the
built in configuration (`1.2/messages.py` in the lab), not a decode of the screen programs, and is not
asserted.

**For how long.** The message routine `0x16A18` draws the screen and then loads `0x0BB8`, 3000, into the
countdown the restart path loads with 500 (`0x19CAE`), and polls its flag until the timer expires; no key
handler is called in that loop. Three seconds if a tick is a millisecond, which is not established: the
timer's clock is a datasheet question. Then start continues, on the built in configuration.

**Nothing latches.** The verdict lives in RAM byte `0x086`, is cleared at every start and recomputed;
neither the check nor main's start sequence calls a flash routine or executes `TBLWT` (asserted over
the check). The check has two callers, both main's, and main never returns, so it runs once per start
and at no other time. **This is where the platform differs from the Harmony One**, whose validator also
runs from the main loop and whose status screen then latches until a power cycle (sections 249 and
250).

## Calibration

The check as read, simulated, over **all 16 distinct arch 8 containers in the lab** (distinct by SHA-256;
two pairs differ in only a few bytes, so these are at most 14 configurations, and the four 885 containers are
one remote's configuration read four times; by skin ten 880s, four 885s, an 880 Pro and a 720): the four of
harmony-decompiler's samples, the four Bedroom files and the four Living Room files of kkong42 (each
original and its three spare reads, distinct containers by SHA-256), the H885-Bedroom file (skin 15 by
its own header, so an 880's), and three from later issues, an 880 Pro's, a second 880's and a Harmony
720's. **16 pass, 0 fail.** Two independent closures on each: the file's length is `end + 4 - base`,
a second route to the end address, and the library's `gspm.trailer_checksum`, which slices from the
container's length rather than from the stated end, agrees with the stored word. The built in
configurations of all five application images pass as well: the 885's, 880's, 880 Pro's and second 880's
are one identical container ending at `0x01FB85`, the 720's a different one ending at `0x01FADB`.

**The controls**, on `H885-LivingRoom`: one flipped bit fails the checksum; a changed cookie, marker or
end marker byte fails its marker; the end address moved by two fails the end marker; the stored checksum
changed fails the checksum. And four that **pass**, which is the point: the pointer count byte, the end
address's top byte and the architecture record's first byte each changed with the checksum restated, and
two different words transposed (the XOR's known blind spot, section 41). A rule fitted only to passing
files would pass a broken one; these show the check fails where it reads and passes where it does not.

**What the calibration does not settle**: the odd extent rule (the last byte before the checksum
dropped when `end - 2 - base` is odd) rests on the code alone, since the two odd containers both hold a
zero there. And the simulation is a reading of the code run by a script, not the firmware running.

**The configurations are found by file name and not through `lab.IMAGES`**, like
`tests/test_backlight.py`'s page: registering twelve more containers would move every corpus wide
census in one commit, and whether these join the corpus is a decision of its own. All sixteen must be
present or the test skips whole, so it never passes on fewer.

## The builds

The 880's, the 880 Pro's and the second 880's applications differ from the 885's in exactly two bytes,
image offsets `0x1C4A` and `0xA63C`, the skin (`0x0F`, `0x27`, `0x0F` against `0x11`), so everything here
holds for them unchanged. **The Harmony 720's application is a different build** and its check, at
`0x17096`, has the 885's mnemonic sequence, 289 instructions, with the same literals except the four that name a
RAM buffer; a reviewer compared full operands and found 129 of the 289 differ, the working RAM addresses,
every call target and every branch offset, so it is the same code relocated and not the same bytes. The 720's base selector and message routine are not compared.

## Negative results

No polled re-check (two callers). No compare of the identity block with anything in the configuration:
it is tested for blankness only. The bootloader holds no cookie compare at all (item 1.1's reading:
no `TP`, `WL` or `DK` literal pair in either bootloader). The Harmony 525's and arch 14's gate on a
settings bit for the checksum has no counterpart: the checksum here is unconditional.

## Reviewers

Recorded in the commit that landed this file: a blind re-measurement and a prose audit, per the
`finding` skill.
"""
import hashlib
import unittest

import lab
from harmony import ezfile, gspm
from harmony.pic18 import isa

BASE = 0x010000
USER_BASE = 0x020000
BUILT_IN_BASE = 0x01E000
# Where the application's code ends: the built in configuration fills its last 8 KiB from 0x01E000,
# section 114, so a census decodes below that.
CODE_END = 0x01E000

BASE_SELECTOR = 0x191C2
SLOT_SEEKER = 0x191DE
CHECK = 0x1701E
CHECK_END = 0x172AA
MAIN = 0x16D12
IDENTITY_TEST = 0x182C2
MESSAGE = 0x16A18
TIMER_START = 0x19CAE
BATTERY_READ = 0x10DE6
SELECTOR_2 = 0x159DC
START_ROUTINE = 0x180A4
UNREACHED = 0x167BA

# The sixteen distinct arch 8 configurations the lab holds, by file name, section above.
CALIBRATION = (
    'Update.EZHex', 'Update-1.EZHex', 'Update-2.EZHex', 'Update-3.EZHex',
    'H880-Bedroom.EZHex', 'H880-Bedroom-Spare-1.EZHex', 'H880-Bedroom-Spare-2.EZHex',
    'H880-Bedroom-Spare-3.EZHex', 'H885-Bedroom.EZHex',
    'H885-LivingRoom.EZHex', 'H885-LivingRoom-Spare-1.EZHex', 'H885-LivingRoom-Spare-2.EZHex',
    'H885-LivingRoom-Spare-3.EZHex',
    'H880-Pro.EZHex', 'H880-Spare-4.EZHex', 'H720-Config.EZHex',
)
# The other application images, found by name for the same reason.
OTHER_APPLICATIONS = {'880 Pro': 'H880-Pro-Firmware.bin', 'second 880': 'H880-Spare-4-Firmware.bin',
                      '720': 'H720-Firmware.bin'}
SKIN_OFFSETS = (0x1C4A, 0xA63C)


def by_name(*filenames):
    """The bytes of lab files found by name, all of them or a skip of the whole test.

    Not through `lab.IMAGES`, see the header; `lab._find` is the registry's own walk.
    """
    paths = [lab._find(f) for f in filenames]   # noqa: SLF001, deliberately unregistered
    missing = [f for f, p in zip(filenames, paths) if not p]
    if missing:
        raise unittest.SkipTest('no %s found' % ', '.join(missing))
    out = []
    for p in paths:
        with open(p, 'rb') as fh:
            out.append(fh.read())
    return out


def application():
    lab.require('arch8_code_885')
    return lab.load('arch8_code_885')


def listing(code, start, end, base=BASE):
    """(address, instruction) pairs from start up to end, through the one opcode table."""
    return list(isa.iter_instructions(code, base, start - base, end - base))


def text(ins):
    """One instruction as a short string that keeps what a window comparison must not lose.

    A file register in the access bank is written with its full address in three digits, `0xf86` for a
    special function register above `0x60` and `0x000` for the RAM below it, where a banked one keeps its
    eight bits, `0x86`: on this part `0xf86` and `0x86` are a port latch and a byte of RAM. A destination of W is written `,W`, since `DECF 0xbd` and
    `DECF 0xbd,W` are different programs. A branch or call carries its target.
    """
    f, m = ins.fields, ins.mnemonic
    if m == 'MOVLB':
        return 'MOVLB 0x%x' % f['k']
    if 'k' in f and 'fsr' not in f:
        return '%s 0x%02x' % (m, f['k'])
    if 'target' in f:
        return '%s 0x%05x' % (m, f['target'])
    if m == 'MOVFF' and 'dst' in f:
        return 'MOVFF 0x%03x,0x%03x' % (f['src'], f['dst'])
    if 'f' in f:
        if f.get('a') == 0:
            reg = '0x%03x' % (0xF00 + f['f'] if f['f'] >= 0x60 else f['f'])
        else:
            reg = '0x%02x' % f['f']
        if 'b' in f:
            return '%s %s,%d' % (m, reg, f['b'])
        return '%s %s%s' % (m, reg, ',W' if f.get('d') == 0 else '')
    return m


def window(code, start, count, base=BASE):
    """The first `count` instructions from `start`, as `text` strings."""
    out = []
    for _, ins in listing(code, start, start + 4 * count, base):
        out.append(text(ins))
        if len(out) == count:
            break
    return out


def transfers_to(code, target, end=CODE_END, base=BASE):
    """Every call, goto or branch in the code whose target is `target`."""
    return [a for a, ins in listing(code, base, end, base) if ins.fields.get('target') == target]


class CheckAsRead:
    """The check at `0x1701E`, with its constants decoded out of the code rather than written here."""

    def __init__(self, code):
        def literals(start, count):
            """The first `count` literals loaded by MOVLW from `start` on."""
            found = [ins.fields['k'] for _, ins in listing(code, start, start + 0x40)
                     if ins.mnemonic == 'MOVLW']
            return found[:count]
        self.cookie = bytes(literals(0x17038, 4))
        self.marker_offset = literals(0x17056, 1)[0]
        self.marker = bytes(literals(0x1706C, 4))
        self.end_offset = literals(0x1708A, 1)[0]
        self.end_marker = bytes(literals(0x170A4, 4))
        self.seeds = tuple(literals(0x170C2, 2))

    def __call__(self, flash, base):
        """('pass' or the first condition that failed, the end address)."""
        def read(address, n):
            return bytes(flash.get(address + i, 0xFF) for i in range(n))
        if read(base, 4) != self.cookie:
            return 'cookie', None
        if read(base + self.marker_offset, 4) != self.marker:
            return 'marker', None
        end = int.from_bytes(read(base + self.end_offset, 3), 'little')
        if read(end, 4) != self.end_marker:
            return 'end marker', end
        stored = read(end - 2, 2)
        words = ((end - 2 - base) & 0xFFFFFF) >> 1
        even, odd = self.seeds
        body = read(base, 2 * words)
        for i in range(0, 2 * words, 2):
            even ^= body[i]
            odd ^= body[i + 1]
        return ('pass' if bytes([even, odd]) == stored else 'checksum'), end


class Flash(dict):
    """A sparse flash image: bytes placed at an address, `0xFF` everywhere else."""

    def place(self, address, data):
        for i, b in enumerate(data):
            self[address + i] = b
        return self


class TheApplicationRunsOneOfTwoConfigurations(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_the_base_is_0x020000_or_0x01E000_by_bit_3_of_data_0x086(self):
        self.assertEqual(window(self.code, BASE_SELECTOR, 11),
                         ['MOVLB 0x0', 'BTFSS 0x86,3', 'BRA 0x191d0', 'MOVLW 0x02', 'MOVWF 0x82', 'CLRF 0x81',
                          'BRA 0x191d8', 'MOVLW 0x01', 'MOVWF 0x82', 'MOVLW 0xe0', 'MOVWF 0x81'])

    def test_the_slot_seeker_goes_through_it(self):
        # Slot times four plus 0x0B, the pointer table, then the base selector.
        self.assertEqual(window(self.code, SLOT_SEEKER, 8),
                         ['MOVLW 0x04', 'MOVLB 0x0', 'MULWF 0xd3', 'MOVFF 0xff3,0x0d3', 'MOVLW 0x0b',
                          'ADDWF 0xd3', 'MOVFF 0x0d3,0x0d2', 'RCALL 0x191c2'])

    def test_the_built_in_configuration_is_one_container_in_four_880_class_builds(self):
        others = by_name(OTHER_APPLICATIONS['880 Pro'], OTHER_APPLICATIONS['second 880'])
        lab.require('arch8_code_880')
        images = [self.code, lab.load('arch8_code_880')] + others
        cut = {image[BUILT_IN_BASE - BASE:0x01FB89 - BASE] for image in images}
        self.assertEqual(len(cut), 1)
        (container,) = cut
        self.assertEqual(container[:4], b'TPTP')
        self.assertEqual(int.from_bytes(container[4:7], 'little'), 0x01FB85)
        self.assertEqual(len(container), 7049)


class TheCheckReadsFourThings(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_cookie_marker_end_marker_and_seeds_are_the_codes_literals(self):
        check = CheckAsRead(self.code)
        self.assertEqual((check.cookie, check.marker_offset, check.marker, check.end_offset,
                          check.end_marker, check.seeds),
                         (b'TPTP', 0x5F, b'WLWL', 4, b'DKDK', (0x21, 0x43)))

    def test_each_marker_is_read_through_the_base_selector_at_its_offset(self):
        # Offset into 0x0D2, then the selector: 0 for the cookie, 0x5F for the marker, 4 for the end.
        self.assertEqual(window(self.code, 0x17022, 3), ['MOVLB 0x0', 'CLRF 0xd2', 'CALL 0x191c2'])
        self.assertEqual(window(self.code, 0x17054, 4), ['MOVLB 0x0', 'MOVLW 0x5f', 'MOVWF 0xd2', 'CALL 0x191c2'])
        self.assertEqual(window(self.code, 0x17088, 5),
                         ['MOVLB 0x0', 'MOVLW 0x04', 'MOVWF 0xd2', 'CALL 0x191c2', 'CALL 0x19062'])

    def test_the_word_count_is_end_minus_two_minus_base_halved(self):
        # end - 2, then the base read through the selector with offset 0 subtracted, then one right
        # shift through carry over the 24 bit result.
        self.assertEqual(window(self.code, 0x1711C, 7),
                         ['MOVLW 0x02', 'MOVLB 0x2', 'SUBWF 0xc9', 'MOVLW 0x00', 'MOVLB 0x2', 'SUBWFB 0xca',
                          'MOVLW 0x00'])
        self.assertEqual(window(self.code, 0x1712E, 3), ['MOVLB 0x0', 'CLRF 0xd2', 'CALL 0x191c2'])
        self.assertEqual(window(self.code, 0x17150, 4), ['BCF 0xfd8,0', 'RRCF 0xcb', 'RRCF 0xca', 'RRCF 0xc9'])

    def test_even_bytes_go_to_the_first_seed_and_odd_to_the_second(self):
        self.assertEqual(window(self.code, 0x17174, 8),
                         ['TBLRD*+', 'MOVF 0xff5,W', 'MOVLB 0x2', 'XORWF 0xc5', 'TBLRD*+', 'MOVF 0xff5,W',
                          'MOVLB 0x2', 'XORWF 0xc6'])

    def test_the_built_in_check_sets_bit_1_and_the_users_bit_2_or_the_checksum_failure_byte(self):
        self.assertEqual(window(self.code, 0x171FC, 3), ['MOVLB 0x0', 'BTFSC 0x86,3', 'BRA 0x17222'])
        self.assertEqual(window(self.code, 0x17216, 4), ['MOVLB 0x0', 'BCF 0x86,1', 'BRA 0x17220', 'MOVLB 0x0'])
        self.assertEqual(window(self.code, 0x1721E, 1), ['BSF 0x86,1'])
        self.assertEqual(window(self.code, 0x17236, 8),
                         ['MOVLB 0x0', 'BCF 0x86,2', 'MOVLB 0x2', 'MOVLW 0x01', 'MOVWF 0xc3', 'BRA 0x17246',
                          'MOVLB 0x0', 'BSF 0x86,2'])
        # 0x2C3 is cleared on entry and set nowhere else in the check.
        self.assertEqual(window(self.code, CHECK, 2), ['MOVLB 0x2', 'CLRF 0xc3'])
        sets = [a for a, ins in listing(self.code, CHECK, CHECK_END)
                if text(ins) in ('MOVWF 0xc3', 'SETF 0xc3', 'BSF 0xc3,0', 'INCF 0xc3')]
        self.assertEqual(sets, [0x1723E])

    def test_a_marker_failure_shows_message_0x00_and_a_checksum_failure_0x1A_and_only_for_the_user(self):
        self.assertEqual(window(self.code, 0x17246, 16),
                         ['MOVLB 0x0', 'BTFSS 0x86,3', 'BRA 0x172a8', 'MOVLB 0x0', 'BTFSC 0x86,2', 'BRA 0x17270',
                          'MOVLB 0x2', 'MOVF 0xc3,W', 'BZ 0x17266', 'MOVLW 0x1a', 'MOVLB 0x1', 'MOVWF 0xf4',
                          'CLRF 0xf5', 'CALL 0x16a18', 'BRA 0x17270', 'MOVLB 0x1'])
        self.assertEqual(window(self.code, 0x17268, 3), ['CLRF 0xf4', 'CLRF 0xf5', 'CALL 0x16a18'])
        # Each marker failure branches to that verdict with nothing between.
        for at in (0x17052, 0x17086, 0x170BE):
            self.assertEqual(window(self.code, at, 1), ['BRA 0x17246'])

    def test_when_only_the_built_in_passed_the_tail_clears_bit_3(self):
        self.assertEqual(window(self.code, 0x17284, 5),
                         ['MOVLB 0x0', 'BTFSC 0x86,2', 'BRA 0x1728e', 'MOVLB 0x0', 'BCF 0x86,3'])


class StartDecidesAndNothingLatches(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_main_checks_the_built_in_then_the_identity_then_the_user_configuration(self):
        self.assertEqual(window(self.code, 0x16DDA, 21),
                         ['MOVLB 0x0', 'BCF 0x86,3', 'RCALL 0x1701e', 'CALL 0x182c2', 'IORLW 0x00', 'BZ 0x16e00',
                          'MOVLB 0x0', 'BSF 0x86,3', 'RCALL 0x1701e', 'MOVLB 0x0', 'BTFSS 0x86,2', 'BRA 0x16dfa',
                          'CALL 0x141ce', 'BRA 0x16dfe', 'MOVLB 0x0', 'BCF 0x86,3', 'BRA 0x16e10',
                          'MOVLB 0x0', 'BCF 0x86,2', 'MOVLW 0x1b', 'MOVLB 0x1'])

    def test_the_identity_test_is_48_bytes_from_0x000110_for_blankness_only(self):
        self.assertEqual(window(self.code, IDENTITY_TEST, 20),
                         ['MOVLB 0x2', 'MOVLW 0x10', 'MOVWF 0xb3', 'MOVLW 0x01', 'MOVWF 0xb4', 'CLRF 0xb5',
                          'CLRF 0xb2', 'MOVLW 0x30', 'SUBWF 0xb2,W', 'BC 0x182f8', 'MOVFF 0x2b3,0xff6',
                          'MOVFF 0x2b4,0xff7', 'MOVFF 0x2b5,0xff8', 'TBLRD*', 'MOVF 0xff5,W', 'SUBLW 0xff',
                          'BZ 0x182ec', 'RETLW 0x01', 'INCF 0xb3', 'MOVLW 0x00'])
        self.assertEqual(transfers_to(self.code, IDENTITY_TEST), [0x16DE0])

    def test_a_blank_battery_calibration_word_at_0x000160_clears_bit_2_and_shows_message_0x16(self):
        self.assertEqual(window(self.code, BATTERY_READ, 20),
                         ['MOVLW 0x60', 'MOVWF 0xff6', 'MOVLW 0x01', 'MOVWF 0xff7', 'CLRF 0xff8', 'TBLRD*+',
                          'MOVFF 0xff5,0x000', 'TBLRD*', 'MOVFF 0xff5,0x001', 'MOVLW 0xff', 'XORWF 0x000,W',
                          'BNZ 0x10e18', 'MOVLW 0xff', 'XORWF 0x001,W', 'BNZ 0x10e18', 'MOVLB 0x0', 'BCF 0x86,2',
                          'MOVLW 0x16', 'MOVLB 0x1', 'MOVWF 0xf4'])

    def test_the_check_runs_from_mains_start_alone_and_main_from_the_reset_path_alone(self):
        self.assertEqual(transfers_to(self.code, CHECK), [0x16DDE, 0x16DEC])
        self.assertEqual(transfers_to(self.code, MAIN), [0x1A85C])
        self.assertEqual(window(self.code, 0x010C00, 1), ['GOTO 0x1a84c'])
        # The cookie's four literals occur once in the code: no second check hides elsewhere.
        literals = [ins.fields['k'] for _, ins in listing(self.code, BASE, CODE_END) if ins.mnemonic == 'MOVLW']
        runs = sum(1 for i in range(len(literals) - 3) if literals[i:i + 4] == [0x54, 0x50, 0x54, 0x50])
        self.assertEqual(runs, 1)

    def test_the_checks_own_code_writes_no_flash(self):
        body = listing(self.code, CHECK, CHECK_END)
        self.assertEqual([a for a, ins in body if ins.mnemonic.startswith('TBLWT')], [])
        self.assertEqual([a for a, ins in body if ins.fields.get('target', 0) >= 0x1FE000], [])

    def test_the_start_routine_clears_bits_0_to_2_and_selector_2_clears_bits_2_and_3(self):
        self.assertEqual(window(self.code, START_ROUTINE, 4), ['MOVLB 0x0', 'BCF 0x86,1', 'BCF 0x86,2', 'BCF 0x86,0'])
        self.assertEqual(window(self.code, SELECTOR_2, 4), ['CALL 0x163be', 'MOVLB 0x0', 'BCF 0x86,2', 'BCF 0x86,3'])

    def test_only_a_start_sets_bit_3_again(self):
        # Every BSF of data 0x086 bit 3, banked, in the code; then what the two are.
        sets = [a for a, ins in listing(self.code, BASE, CODE_END)
                if ins.mnemonic == 'BSF' and ins.fields == {'f': 0x86, 'b': 3, 'a': 1}]
        self.assertEqual(sets, [0x167CA, 0x16DEA])
        self.assertEqual(window(self.code, UNREACHED, 1), ['MOVLB 0x0'])
        self.assertEqual(transfers_to(self.code, UNREACHED), [])
        # The message routine's write of the whole byte puts back what it read, bit 3 included.
        self.assertEqual(window(self.code, 0x16A2E, 3), ['MOVF 0x86,W', 'ANDLW 0x08', 'BZ 0x16a36'])
        self.assertEqual(window(self.code, 0x16A5A, 4), ['MOVLW 0xf7', 'ANDWF 0x86,W', 'IORWF 0xff3,W', 'MOVWF 0x86'])

    def test_the_status_byte_has_one_writer_given_the_hosts_bytes_or_zero(self):
        # Data 0x100 is written by one MOVFF, from 0x103, when 0x102 is zero; its two callers are write
        # misc selector 6, with the host's bytes, and the start routine, with both cleared. Selector 7's
        # indirect write can reach it too, at the host's choice.
        movs = [a for a, ins in listing(self.code, 0x010400, CODE_END)
                if ins.mnemonic == 'MOVFF' and ins.fields.get('dst') == 0x100]
        self.assertEqual(movs, [0x1827E])
        self.assertEqual(window(self.code, 0x18278, 4), ['MOVLB 0x1', 'MOVF 0x02,W', 'BNZ 0x18282', 'MOVFF 0x103,0x100'])
        self.assertEqual(transfers_to(self.code, 0x18278), [0x159F0, 0x180C0])
        self.assertEqual(window(self.code, 0x159E8, 2), ['MOVFF 0x2b7,0x103', 'MOVFF 0x2b8,0x102'])
        self.assertEqual(window(self.code, 0x180B8, 4), ['MOVLB 0x1', 'CLRF 0x03', 'MOVLB 0x1', 'CLRF 0x02'])

    def test_a_message_holds_for_3000_ticks_and_no_key_ends_it(self):
        self.assertEqual(window(self.code, 0x16A6E, 12),
                         ['MOVLB 0x0', 'MOVLW 0xb8', 'MOVWF 0xf6', 'MOVLW 0x0b', 'MOVWF 0xf7', 'CALL 0x19cae',
                          'MOVLB 0x0', 'MOVF 0xe0,W', 'BNZ 0x16a88', 'CALL 0x19be2', 'BRA 0x16a7c', 'RETURN'])
        self.assertEqual(window(self.code, TIMER_START, 2), ['MOVFF 0x0f6,0x0e6', 'MOVFF 0x0f7,0x0e7'])


class TheCorpusPassesTheCheckAsRead(unittest.TestCase):
    def setUp(self):
        self.code = application()
        self.check = CheckAsRead(self.code)
        self.payloads = [ezfile.parse_ezhex(blob, name).payload
                         for name, blob in zip(CALIBRATION, by_name(*CALIBRATION))]

    def test_sixteen_distinct_containers_of_four_models_and_every_one_passes(self):
        self.assertEqual(len({hashlib.sha256(p).digest() for p in self.payloads}), 16)
        # The skin, the third byte of the architecture record: ten 880s, four 885s (one remote's
        # configuration read four times), an 880 Pro and a 720.
        skins = {}
        for payload in self.payloads:
            record = int.from_bytes(payload[0x10:0x13], 'little') - USER_BASE
            skins[payload[record + 2]] = skins.get(payload[record + 2], 0) + 1
        self.assertEqual(skins, {0x0F: 10, 0x11: 4, 0x27: 1, 0x2C: 1})
        verdicts = []
        for name, payload in zip(CALIBRATION, self.payloads):
            with self.subTest(name):
                verdict, end = self.check(Flash().place(USER_BASE, payload), USER_BASE)
                verdicts.append(verdict)
                # Two independent routes to the same bytes: the file's length gives the end address,
                # and the library's checksum slices from that length rather than from the header.
                self.assertEqual(len(payload), end + 4 - USER_BASE)
                self.assertEqual(gspm.trailer_checksum(payload),
                                 int.from_bytes(payload[len(payload) - 6:len(payload) - 4], 'little'))
        self.assertEqual(verdicts, ['pass'] * 16)

    def test_every_one_states_21_pointers_and_a_zero_top_byte(self):
        for name, payload in zip(CALIBRATION, self.payloads):
            with self.subTest(name):
                self.assertEqual((payload[8], payload[9], payload[7]), (0x00, 0x15, 0x00))

    def test_the_built_in_configurations_pass_in_every_application_image(self):
        lab.require('arch8_code_880')
        images = {'885': self.code, '880': lab.load('arch8_code_880')}
        images.update(zip(OTHER_APPLICATIONS, by_name(*OTHER_APPLICATIONS.values())))
        ends = {}
        for model, image in images.items():
            with self.subTest(model):
                verdict, ends[model] = self.check(Flash().place(BASE, image), BUILT_IN_BASE)
                self.assertEqual(verdict, 'pass')
        self.assertEqual(ends, {'885': 0x01FB85, '880': 0x01FB85, '880 Pro': 0x01FB85, 'second 880': 0x01FB85,
                                '720': 0x01FADB})

    def control(self, offset=None, xor=0, edit=None, restate=False):
        payload = bytearray(self.payloads[CALIBRATION.index('H885-LivingRoom.EZHex')])
        if offset is not None:
            payload[offset] ^= xor
        if edit:
            edit(payload)
        if restate:
            word = gspm.trailer_checksum(bytes(payload))
            payload[len(payload) - 6:len(payload) - 4] = word.to_bytes(2, 'little')
        return self.check(Flash().place(USER_BASE, payload), USER_BASE)[0]

    def test_the_controls_fail_where_the_check_reads(self):
        end = 0x0A1600 - USER_BASE

        def move_end(p):
            p[4:7] = (0x0A1600 + 2).to_bytes(3, 'little')
        self.assertEqual(self.control(), 'pass')
        self.assertEqual(self.control(0x1000, 0x01), 'checksum')
        self.assertEqual(self.control(1, 0x01), 'cookie')
        self.assertEqual(self.control(0x60, 0x01), 'marker')
        self.assertEqual(self.control(end + 2, 0x01), 'end marker')
        self.assertEqual(self.control(end - 2, 0x01), 'checksum')
        self.assertEqual(self.control(edit=move_end), 'end marker')

    def test_and_pass_where_it_does_not(self):
        def transpose(p):
            a, b = bytes(p[0x2000:0x2002]), bytes(p[0x2002:0x2004])
            self.assertNotEqual(a, b)
            p[0x2000:0x2002], p[0x2002:0x2004] = b, a
        self.assertEqual(self.control(0x09, 0x15 ^ 0x14, restate=True), 'pass')
        self.assertEqual(self.control(0x07, 0x01, restate=True), 'pass')
        # Raw slot 1, the architecture record: its pointer is the u24 after the spare byte at 0x0F, an
        # absolute address, and the record opens `08 08 11 0d` on an 885.
        payload = self.payloads[CALIBRATION.index('H885-LivingRoom.EZHex')]
        record = int.from_bytes(payload[0x10:0x13], 'little') - USER_BASE
        self.assertEqual(payload[record:record + 4], bytes([0x08, 0x08, 0x11, 0x0D]))
        self.assertEqual(self.control(record, 0x01, restate=True), 'pass')
        self.assertEqual(self.control(edit=transpose), 'pass')


class TheFirstComposedConfigurationPassesTheCheck(unittest.TestCase):
    """`todo-compile-885.md` 2.1: a catalogue device composed onto unit A's configuration by the codec.

    The codec stamps the trailer with its own checksum, and its own reader agrees with it, which is the same
    derivation at both ends. What this adds is the other end: the check as the 885's application performs it,
    with the cookie, the marker, the end marker and the seeds decoded out of the code, so a configuration of
    ours that this passes is one the remote runs rather than replaces with its built in one at start. The
    control is the file with one byte of its body changed, which the same check must refuse. 2.3's file, the
    same device with its power step opening with its delay between devices, is checked the same way.
    """

    def test_the_composed_file_passes_and_a_changed_byte_does_not(self):
        lab.require('h885_composed_2_1', 'h885_composed_2_3')
        check = CheckAsRead(application())
        for name in ('h885_composed_2_1', 'h885_composed_2_3'):
            with self.subTest(name):
                payload = bytearray(lab.load(name))
                verdict, end = check(Flash().place(USER_BASE, bytes(payload)), USER_BASE)
                self.assertEqual(verdict, 'pass')
                self.assertEqual(len(payload), end + 4 - USER_BASE)
                payload[0x1000] ^= 0x01
                self.assertEqual(check(Flash().place(USER_BASE, bytes(payload)), USER_BASE)[0], 'checksum')


class TheBuildsAgree(unittest.TestCase):
    def test_three_880_class_images_differ_from_the_885s_in_the_two_skin_bytes(self):
        code = application()
        lab.require('arch8_code_880')
        images = {'880': lab.load('arch8_code_880')}
        images.update(zip(('880 Pro', 'second 880'),
                          by_name(OTHER_APPLICATIONS['880 Pro'], OTHER_APPLICATIONS['second 880'])))
        skins = {}
        for model, image in images.items():
            with self.subTest(model):
                differ = [i for i in range(len(code)) if code[i] != image[i]]
                self.assertEqual(differ, list(SKIN_OFFSETS))
                skins[model] = image[SKIN_OFFSETS[0]]
                self.assertEqual(image[SKIN_OFFSETS[1]], skins[model])
        self.assertEqual(code[SKIN_OFFSETS[0]], 0x11)
        self.assertEqual(skins, {'880': 0x0F, '880 Pro': 0x27, 'second 880': 0x0F})

    def test_the_720s_check_has_the_885s_mnemonics_and_literals_but_four(self):
        code = application()
        (h720,) = by_name(OTHER_APPLICATIONS['720'])
        ours = listing(code, CHECK, CHECK_END)
        theirs = listing(h720, 0x17096, 0x17096 + 0x400)[:len(ours)]
        self.assertEqual(len(ours), 289)
        self.assertEqual([i.mnemonic for _, i in ours], [i.mnemonic for _, i in theirs])
        # The literals agree except the four that name a RAM buffer, each followed by a store into the
        # read helper's destination pointer.
        moved = [ours[n][0] for n in range(len(ours))
                 if ours[n][1].mnemonic == 'MOVLW' and ours[n][1].fields != theirs[n][1].fields]
        self.assertEqual(moved, [0x1702C, 0x17060, 0x17098, 0x17104])
        for at in moved:
            self.assertIn(window(code, at, 2)[1], ('MOVWF 0xcf', 'MOVWF 0xcb'))
        self.assertEqual(theirs[0][0], 0x17096)


if __name__ == '__main__':
    unittest.main()
