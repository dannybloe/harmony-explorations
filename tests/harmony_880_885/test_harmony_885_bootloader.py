"""
The Harmony 880 and 885 bootloader: a resident flash programmer speaking the application's protocol.

**Read in the firmware** on 4 November 2026, item 1.1 of `todo/todo-prepare-885.md`, in both bootloader
builds the lab holds (`arch8_boot_880` and `arch8_boot_885`, version 4.0, base `0x000000`) and, for the
hand off and the image check, in both 4.4 applications (`arch8_code_880`, `arch8_code_885`, base
`0x010000`). No remote was opened. Every instruction below is decoded through `harmony.pic18.isa` and
every switch through `harmony.pic18.chains`. Addresses are the 885 build's; the 880's are in `BUILDS`.

**Sources checked before the work**: `reference/architectures/harmony-880-885/`, which had the
bootloader's version block (section 116), its keypad scan (section 144) and the bootloader's command
dispatch listed as not checked; `reference/usb-protocol/bootloader.md`, the Harmony One's and
600's bootloader (section 189), which is a different program; `tests/harmony_880_885/test_arch8_usb.py`, the
application's dispatch; and the archive's sections 114 and 116. **Logitech's client, decision 2**: MyHarmony
(`../lab/work/myharmony/src/`) names neither this platform nor a bootloader anywhere, so it holds
nothing here. The classic client does, in its arch 8 constants (`Protocol8`, mined in the lab's
`software/classic/PROTOCOL-CONSTANTS.md`) and its identity block erase (section 213), and it is the
independent end of the unlock closure below rather than the source of anything asserted as true.

## What it is

The bottom 64 KiB are a complete program with its own USB service loop: after the power on decision
main attaches USB and loops calling the USB poll until a restart flag, data `0x13E`, is set, then
detaches and executes `RESET` (`0x02090` to `0x02094`). It is **not** the stock Microchip bootloader the
Harmony One and 600 carry: no `04D8` vendor id, no `EECON` sequence, no protocol of its own.

## The command switch

Command in the high nibble of the first byte, masked with `0xF0` at `0x03B98`. The `0xE0` escape is
tested first, by subtraction; everything else goes to the `XORLW` chain at `0x03BE0` (880 `0x03BD4`),
whose case set is `{0x10, 0x30, 0x50, 0xA0, 0xB0, 0xD0}` in both builds: version, write flash, read
flash, write misc, read misc, erase. **No `0x70`**, which the application's chain at `0x15854` has;
otherwise the case sets are equal. Neither chain holds the escape: both programs compare the masked
command with `0xE0` before their switch, the application at `0x1580A` (what the application then does
with it is item 1.5's). This header first said the application had no escape test, from
`tests/harmony_880_885/test_arch8_usb.py`'s chain alone; item 1.2's reading found the comparison. Each case's parse
sets a command state in data `0x11B`, the first literal it loads (asserted): 1, 2, 4, 6, 7 and 5 for
version, write, read, write misc, read misc and erase. The executor at `0x03F04` dispatches on 1, 3, 4,
5, 6 and 7; state 2 is write flash's data phase, taken before the switch, and 3 its end (read, not
asserted). The escape chain at `0x03BB0` decodes `{0x02, 0x03}` through `chains`, both
setting the restart flag; its `0x01` case is the fall through after the third `XORLW`, whose running
value is `0x02 ^ 0x01 ^ 0x02 = 0x01`, and clears the state. Write misc's selector chain at `0x03D2E`
decodes `{0x02, 0x05, 0x06, 0x07}`: 2 clears bit 2 of data `0x086` on the 880 and bits 2 and 3 on the 885,
5 masks interrupts, 6 sets the
**status byte at data `0x100`**, 7 writes one byte of data memory at the given address through `FSR0`,
unbounded, so the special function registers included (read at `0x03D56`, not asserted). Read misc
returns data memory for 7 and the status byte for 6.

The version answer comes from the `RETLW`s at `0x01972`: `0x40`, type 3, the skin, `0x00`, 8. The flash
ids in it are read off the part by its autoselect command (`0x05EFE` calling `0x1FFE54`), read and not
asserted. **How a host tells it from the application**: the USB device descriptor is byte for byte the
application's (`046D:C110`, the same `bcdDevice`; the 40 bytes of configuration descriptor after it are
equal too, reviewer 2, not asserted), so the ids cannot; the product string, `Harmony Bootloader` against
`Harmony Remote 0-4.4.2`, and the version answer can, whose software type is 3 where the application's
is 0, its firmware version and field 6 differing too (asserted against the application's accessor at
`0x11C46`). That the bootloader's string table serves that string for the descriptor's product index, 4,
is not read; it is the only product string in the image.

## The power on decision, in order

**First, the status byte is cleared at a cold start.** Main's second call (`0x01C94`, 880 `0x01C90`) goes to
`0x0466C`, which asks `0x062A8` for the reset cause: `BTFSS 0xFD0,4 / RETLW 1 / RETLW 0`. Unless that answers
1 it clears data `0x103` and `0x102` and calls the status writer, which copies `0x103` into `0x100`. Bit 4
of `0xFD0` is the RI bit of a PIC18's `RCON`, clear only after a `RESET` instruction; that this part's
`0xFD0` is `RCON` is **inferred** from the PIC18 family, not checked against a datasheet of the part. So
the status survives a reset by the `RESET` instruction, which is what the escape's restart executes, and
not a power on: a battery pull cannot start a staged install. The routine then sets bits 4, 3, 2 and 1
of `0xFD0` again (`0x062AE`), so any later reset that is not a `RESET` instruction finds bit 4 set,
whatever the hardware does to it; that re-arm is asserted too. The 1.1 reading said the bootloader never
clears the status at a cold start; item 1.2 found this call, and this test holds it.

Then main, after setting up and copying the flash routines into RAM: clears the unlock byte (`0x056F2`), runs
the **staged install** (`0x0221C`), then the **key** test (`0x020AC`, the scan, then the comparison at
`0x0209A`), then, only when no key matched, the **image check** (`0x020CE`), and on a pass the **jump**
(`0x01DDE`). The calls are asserted in that order.

* **Staged install.** Reads the status byte, data `0x100`. 4 counts as 2 and 7 as 6, which is resuming
  an interrupted install. On 2 or 6 it writes a copying status, erases the sector at `0x010000` and
  copies `0x8000` words by one byte programs from `0x1D0000` (status 2) or `0x020000` (status 6), then
  writes 0. **The two builds differ here**: the 885 writes 4 for the
  `0x1D0000` source and 7 for the `0x020000` source, the 880 writes 4 for both, so on an 880 a copy from
  `0x020000` that is cut short and followed by a `RESET` instruction would resume from `0x1D0000`. Not
  after a power loss, which clears the status as above, and which interruption would leave 4 or 7 in
  place is not read. What puts 2 or 6 there, what sits at `0x1D0000` on a unit, and why the user
  configuration's base `0x020000` is a source, are item 1.2's.

**Where the two builds differ in behaviour**, from the reading's normalised diff and reviewer 2's: the
status recorded while copying (above); write misc selector 2, one bit against two; two extra calls in the
885's display code that set and clear a port pin; the skin. Everything asserted here is equal.
* **The held key.** The scan's result goes to data `0x3B3`, compared with `0x02` and with `0x21`; either
  keeps the bootloader resident and skips the image check. The scan is the `(line - 1) * 4 + input` of
  section 144, `tests/harmony_600_650_700/test_keypad.py`. **Which printed keys** have scan codes 2 and 33 is not
  established: the 880's PCB legend in the lab names K2 Power and K33 the d-pad OK, but that the
  designators equal scan codes is an assumption nobody has held a key to check.
* **The image check.** The two bytes at `0x010004` must be `48 47`. Then, seeds `0x21` and `0x43`, a
  count of `0x8000` words from `0x010000`, two words read first (the stored checksum at `0x010000` and
  the word at `0x010002`, two decrements before the loop) and the remaining `0x7FFE` words XORed in,
  even bytes into the first seed and odd into the second, compared with the stored word. **The closure
  is the applications**: computed from the code's own seeds, start and count, both images' stored
  words match exactly; a flipped byte breaks it, and starting at `0x010002` instead breaks it on both,
  because byte `0x010003` is `0xFF`. Byte `0x010002` is compared with `0xFF`: on a pass with `0xFF` there
  the bootloader shows a screen and programs that byte to `0x00` (`0x021FC`), a first boot mark. Both
  images hold `0x00` there, what a remote that has booted once would carry.
* **The jump.** `PCLATU 1`, `PCLATH 0x0C`, `CLRF PCL`: `0x010C00`, where both applications hold their
  `GOTO` to the entry. A failed check or a held key stays resident instead, shows a diagnostic screen,
  and runs the USB loop; only a restart or a reboot leaves.

## A flash programmer, and its one bound

Erase is a sector erase and write is byte or unlock bypass programming, both AMD style command sequences
(unlock cycles `0xAA` to `0x000AAA` and `0x55` to `0x000555`, asserted) run from RAM. The copier (`0x05BE2`) puts `0x00553E` to `0x0056EC` (880 `0x005530` to `0x0056DE`) at data
`0x0450`, and the code calls it at `0x1FFE52` erase, `0x1FFE54` id read, `0x1FFE56` program a byte,
`0x1FFE58` program a buffer: slot 1 decoded at base `0x1FFE50` has its four `BRA`s exactly there. The
other slot goes to data `0x0400` and runs at `0x1FFE00`, the same `0x50` apart, so data `0x400` up appears
at `0x1FFE00` up in program space: **inferred** from that agreement, not read in a datasheet.

**The check, inner**, at `0x056CE` in the image and so `0x1FFFE0` in the RAM copy, the first call of the
erase and of both program routines (the id read has none), on the address they start at: an address at or above `0x010000` passes; below it only if data `0x3E8` is `0xA7`, which also
sets pin `sfrF86,3`; a zero answer returns before the part is touched (`IORLW 0 / BZ` after each call).
**Outer**, on the erase command only, `0x056F8`: below `0x010000` refused unless `0x3E8` is nonzero. Each
compares one 24 bit literal, `0x010000`, and nothing else: **no upper bound**. A refused erase loads
error code 2, calls the error screen (`0x03CDA`) and branches to `0x03E60`, which drops the command state
because `0x202` was cleared before the switch, so the executor sends nothing; whether the error screen
routine itself sends a packet is not read. Reads check no bound: one `TBLRD*` per byte (`0x05F34`),
except that a read whose last byte is `0x000104` or `0x000105`, alone in its chunk, calls a routine
instead (`0x040DE`, `0x04114`), the same special case as the application's. What those return was not
read for item 1.1; item 1.8 read it, `tests/harmony_880_885/test_harmony_885_reads.py`: the newest byte of the hardware
log at `0x000140`, and a measurement on the analogue converter, through the same two routines here
(asserted below for both builds). This said a one byte read until item 1.8 found the test is on the
chunk, so any read ending there alone meets it.

**Two more facts of the bootloader's own, read for items 1.3 and 1.4.** Its buffer program uses unlock
bypass, `0x20` once, then `0xA0` and the byte per byte, `0x90` and `0x00` to leave, and **programs every
byte, `0xFF` included**, where the application's skips `0xFF`; neither erases. And its version answer
reports the flash part's id bytes as the part gives them (`0x05EFE`, two autoselect reads into `0x211` and
`0x212`), where the application replaces `1F:C0` with `01:49`, `tests/harmony_880_885/test_harmony_885_erase_and_write.py`.
Both asserted below.

**The unlock** is a one byte write flash to `0x000106`: the parse compares the address bytes with `0x06`,
`0x01`, `0x00`, checks a count of one, stores the packet's byte in `0x3E8` and branches past the
programming (`0x03DE6` to `0x03E0A`). `0x3E8` is cleared at every boot (`0x056F2`). **Two other writers**,
both found by reviewer 2: the bootloader sets `0xA7` itself and clears it again around its one write into
its own region, a byte of the hardware version log at `0x000140` (`0x049C6`, `0x049E8`, inside `0x04930`,
which main calls at every start; asserted as the set and the clear, the condition not); and write misc
selector 7 writes any data byte, so a host can set `0x3E8` that way too (inferred from the selector, not
asserted). **The closure is Logitech's classic client**, which before rewriting the bottom 64 KiB to erase a
unit's identity block writes one byte to `BOOTLOADER_UNLOCK_ADDRESS` with `BOOTLOADER_UNLOCK_DATA`
(section 213), and whose `Protocol8` gives those as 262 and -89: `0x000106` and `0xA7`, exactly what this
code tests. The client's constants and the firmware's literals are two sources, so the unlock's address
and value do not rest on this reading alone; the test asserts the constants, and that the client writes
them before rewriting the bottom 64 KiB is section 213's, `tests/logitech/test_host_client.py`. Its `CODE_NEW_ADDRESS` is `0x1D0000`, the staging source above, the same kind of agreement.

## The top 8 KiB

Every immediate load of `0x1F` into the table pointer's upper byte in both bootloaders and in the 885
application's code (37, 37 and 38 of them) is followed by `0x1FE040`, `0x1FE041`, `0x1FE081` or
`0x1FE0C1`, and the code steps from those to `0x1FE080` and `0x1FE0C0` by `TBLWT*-` or a later low byte
load. By the code that uses them (read, not asserted, and the device identities inferred): the keypad
lines (`0x049EE`), an index and data register pair of the USB controller (`0x00202`), and the display
(`0x03B0A`). The host's read and write paths load the pointer from data, so this census says nothing
about where a host can aim it. With the RAM window at `0x1FFE00` up, a `READ_FLASH` into that range is a bus cycle on a
device or RAM, not a read of flash, and nothing on either program's read path refuses it. That the whole
of `0x1FE000` to `0x1FFFFF` is decoded away from flash is not checked; the configurations' log area
ending at `0x1FE000` fits it. The library's arch 8 read bound, `0x200000`, admits the range; it is
reported and deliberately not changed here.

## The identity block, and the Harmony 720's bottom 64 KiB

Added with items 4.1 and 4.2 of `todo/todo-prepare-885.md`, from the images alone, no remote opened.

**Which bytes at `0x000110` are a serial.** The architecture's memory page said that was not checked,
because the address sits inside the bootloader's region. In all five bottom-of-flash images of this
platform the lab holds, the 880's and the 885's registered in `lab.IMAGES`, and an 880 Pro's, a second
880's and a Harmony 720's found by name, the 64 bytes from `0x000110` have the layout `reference/usb-protocol/commands.md` gives the Harmony One's and the
600's block (section 22): sixteen bytes of `0xEE`, the field named the serial, which identifies nothing
there either; then two 16 byte fields, each not a uniform fill, five distinct pairs over the five
images, which are the two GUIDs. **Where this platform differs is the fourth field**: the later remotes carry sixteen zero
bytes at `+0x30`, and here `+0x30` is `0x000140`, the hardware version log, eight one byte entries
filled from the bottom (one entry in four images and two in the 885's, `0xFF` above them). So the application's
blank test, 48 bytes from `0x000110` (`tests/harmony_880_885/test_harmony_885_start_check.py`), covers exactly the serial
field and the two GUIDs, and the library's 64 byte identity read takes the log's first 16 bytes with it,
which the unit comparison never looks at (`packages/usb/src/identity.ts` compares the GUIDs alone). No
value is quoted here: a GUID is a remote's serial. The five images were read off five remotes by their
owners, so this is five remotes' blocks. **Not checked**: the bench Harmony 885s' serial field, since their
records in the lab's `units/` hold the two GUIDs alone.

**Sources checked first**: concordance's `ArchList` (`serial_address` `0x000110` for arch 8,
`tests/usb_protocol/test_concordance_notes.py`); `packages/usb/src/identity.ts`, whose arch 8 row comment already
states this shape for the 880's and 885's images without a test behind it; the reference's identity
layout and section 226; the classic client's identity block erase, section 213, which says where and
not what. MyHarmony names neither this platform nor its identity block.

**What the Harmony 720's two images are.** The one 720 read here gave an application and a file named for
concordance's safe mode read, which on this architecture is 64 KiB from `0x000000` (section 116). Both
carry the version accessor the 880's and 885's do, five `RETLW`s with one `CALL` each, version, type,
skin, field 6, architecture: the application's at `0x11C00` returns `0x45, 0, 44, 8, 8`, application 4.5
for skin 44, the 720; the bottom image's at `0x019CA` returns `0x42, 3, 44, 0, 8`, a **bootloader**, type
3, version 4.2, with field 6 zero as in the 880's and 885's bootloaders. Its reset vector is a `GOTO
0x06654`, inside itself, as theirs (`0x0637C` and `0x06392`) are inside theirs. **The product strings
agree with the accessors**, a different field: the application's string descriptor says `Harmony Remote
0-4.5.0` and the bottom image's `Harmony Remote 3-4.2.4`. Read as the software type, a dash and the
version, that is consistent with all six images that carry such a string, the five applications (`0-`
and type 0 each) and this bootloader (`3-` and type 3); it is a reading, scored on one bootloader, and the
third digit has no counterpart in any accessor. The 880's and 885's bootloaders say `Harmony Bootloader`
instead, so the 720's bootloader is not their build; which string it serves on the cable, and anything
else in it, is not read. **The 720's application, 4.5, is a higher version number than the 4.4.2 the
community comparison table gives every model it lists for this platform**, which says nothing about
release order. What of the 720's application has been
compared with the 885's is each chapter 3 test's own `TheHarmony720` class or `720` test.

## The reviewers

Reviewer 1, blind, re-measured from the images with nothing of this answer: the same case sets, the same
escape, the same power on order with the same literals, the checksum closing on both applications, the
same floor and unlock, the same 37, 37 and 38 table pointer loads, the same descriptors and product
string, and the same build difference in the staged install. It did not read the copied RAM routines,
so it reported no check on write; the inner check is inside them, asserted here. It reported one thing
not landed by item 1.1: the key scan at `0x04AC8` executes `RESET` when scan codes 2, 33 and 32 are all
down and `PORTB & 0xB0` is zero, a `RESET` that would keep the status byte. **Landed with items 1.2 to
1.8**: asserted below in both builds (`0x04AC8` and `0x04ABA`, called first by each build's key scan), and
the application has the same combination at `0x189DA`, `tests/harmony_880_885/test_harmony_885_write_end.py`.

Reviewer 2 audited the prose. Its corrections are in this header and the pages: the builds' other
differences, the bootloader's own unlock and the selector 7 route, the special one byte reads, the
executor's state set, the re-arm of the reset cause bits, the refused erase's dropped state, "every
immediate load", and several overbroad words on the reference pages. Its note that the application's
own escape pages still read as no escape handling is item 1.5's and left alone here.

## What it rules out

That this platform's bootloader needs a protocol of its own: it answers the application's. That a host
can destroy the bootloader by accident: erasing below `0x010000` takes the `0xA7` unlock first. That a
destroyed application leaves a unit unreachable: while the bottom 64 KiB are intact it boots into this
loop, which can write the application back. What it cannot recover is itself.
"""
import re
import unittest

import lab
from harmony.pic18 import chains, isa

BOOTLOADERS = ('arch8_boot_880', 'arch8_boot_885')
APPLICATION_OF = {'arch8_boot_880': 'arch8_code_880', 'arch8_boot_885': 'arch8_code_885'}
APPLICATION_BASE = 0x010000

# Where each site sits in each build. The two are separate compiles, so most addresses differ by a few
# bytes; what each site holds is asserted identically for both unless a test says otherwise.
BUILDS = {
    'arch8_boot_885': dict(
        command_chain=0x03BE0, escape_test=0x03B98, escape_chain=0x03BB0, restart=0x02090,
        write_misc_chain=0x03D2E, version=0x01972, copier_args=0x01D7A, main_from=0x01DA8,
        jump=0x01DDE, clear_unlock=0x056F2, staging=0x0221C, status_read=0x04794,
        cold_start_call=0x01C94, cold_start=0x0466C, reset_cause=0x062A8, rearm=0x062AE,
        read_special=(0x040DE, 0x04114), self_unlock=(0x049C4, 0x049E6), no_reply=0x03E60, staging_source=0x02272,
        key_routine=0x020AC, key_compare=0x0209A, scan=0x04B04, image_check=0x020CE,
        magic=0x020EA, seeds=0x020FE, loop_test=0x02158, first_boot=0x021B4, first_boot_mark=0x021FC,
        slot1=(0x0553E, 0x056EC), inner_check=0x056CE, outer_check=0x056F8, erase_parse=0x03C88,
        erase_refused=0x03CDA, unlock_write=0x03DE6, unlock_store=0x03E08,
        product=0x060F2, descriptor=0x06118, skin=0x11),
    'arch8_boot_880': dict(
        command_chain=0x03BD4, escape_test=0x03B8C, escape_chain=0x03BA4, restart=0x0208C,
        write_misc_chain=0x03D22, version=0x01972, copier_args=0x01D76, main_from=0x01DA4,
        jump=0x01DDA, clear_unlock=0x056E4, staging=0x02218, status_read=0x04786,
        cold_start_call=0x01C90, cold_start=0x0465E, reset_cause=0x06292, rearm=0x06298,
        read_special=(0x040D0, 0x04106), self_unlock=(0x049B6, 0x049D8), no_reply=0x03E52, staging_source=0x02266,
        key_routine=0x020A8, key_compare=0x02096, scan=0x04AF6, image_check=0x020CA,
        magic=0x020E6, seeds=0x020FA, loop_test=0x02154, first_boot=0x021B0, first_boot_mark=0x021F8,
        slot1=(0x05530, 0x056DE), inner_check=0x056C0, outer_check=0x056EA, erase_parse=0x03C7C,
        erase_refused=0x03CCE, unlock_write=0x03DD8, unlock_store=0x03DFA,
        product=0x060DC, descriptor=0x06102, skin=0x0F),
}

# Where a RAM copy of slot 1 runs, and the four entries the code calls in it.
SLOT1_RUNS_AT = 0x1FFE50
RAM_ENTRIES = {0x1FFE52: 'erase', 0x1FFE54: 'id read', 0x1FFE56: 'program a byte', 0x1FFE58: 'program a buffer'}

# The application's own dispatch and its device descriptor and product string, tests/harmony_880_885/test_arch8_usb.py
# and tests/usb_protocol/test_usbdesc.py.
APPLICATION_DISPATCH = 0x15854
APPLICATION_ESCAPE_TEST = 0x15806
APPLICATION_DESCRIPTOR = 0x1A630
APPLICATION_PRODUCT = 0x1A602
APPLICATION_ENTRY_VECTOR = 0x010C00

# How far each image's code runs, so a census does not decode data as instructions. The bootloaders'
# code ends at 0x0639B and 0x063B1 (section 116); the application's 64 KiB carry a configuration from
# 0x01E000 (section 114), so its code is read below that.
CODE_END = {'arch8_boot_880': 0x0639C, 'arch8_boot_885': 0x063B2, 'arch8_code_885': 0x01E000}


def listing(code, base, start, end):
    """(address, instruction) pairs from start up to end, through the one opcode table."""
    return list(isa.iter_instructions(code, base, start - base, end - base))


def text(ins):
    """One instruction as a short string, enough to compare a window without a disassembler of our own."""
    f, m = ins.fields, ins.mnemonic
    if 'k' in f and m != 'MOVLB':
        return '%s 0x%02x' % (m, f['k'])
    if m == 'MOVLB':
        return 'MOVLB 0x%x' % f['k']
    if 'target' in f:
        return m
    if 'b' in f:
        return '%s 0x%02x,%d' % (m, f['f'], f['b'])
    if 'f' in f:
        return '%s 0x%02x' % (m, f['f'])
    return m


def window(code, start, count, base=0):
    out = []
    for _, ins in listing(code, base, start, start + 4 * count):
        out.append(text(ins))
        if len(out) == count:
            break
    return out


class BootloaderTest(unittest.TestCase):
    def setUp(self):
        lab.require(*BOOTLOADERS)
        self.images = {name: lab.load(name) for name in BOOTLOADERS}


class TheCommandSwitchIsTheApplicationsNumbering(BootloaderTest):
    def test_the_case_set_is_six_commands_without_0x70_in_both_builds(self):
        for name, code in self.images.items():
            with self.subTest(name):
                table = chains.chain_table(code, 0, BUILDS[name]['command_chain'])
                self.assertEqual(sorted(table), [0x10, 0x30, 0x50, 0xA0, 0xB0, 0xD0])

    def test_each_parse_sets_the_command_state_the_executor_switches_on(self):
        # The first literal each case loads is its state: version 1, write 2, read 4, erase 5, write misc
        # 6, read misc 7. Write flash reaches its MOVWF through a BRA shared with read flash.
        expected = {0x10: 1, 0x30: 2, 0x50: 4, 0xD0: 5, 0xA0: 6, 0xB0: 7}
        for name, code in self.images.items():
            with self.subTest(name):
                table = chains.chain_table(code, 0, BUILDS[name]['command_chain'])
                states = {case: window(code, target, 2)[1] for case, target in table.items()}
                self.assertEqual(states, {case: 'MOVLW 0x%02x' % s for case, s in expected.items()})

    def test_the_escape_is_tested_first_and_restarts_on_0x02_and_0x03(self):
        for name, code in self.images.items():
            b = BUILDS[name]
            with self.subTest(name):
                self.assertEqual(window(code, b['escape_test'], 5),
                                 ['MOVLW 0xf0', 'ANDWF 0x00', 'MOVLW 0xe0', 'SUBWF 0x00', 'BNZ'])
                cases = chains.xor_chain(code, 0, b['escape_chain'])
                self.assertEqual(sorted(c.value for c in cases), [0x02, 0x03])
                self.assertEqual({c.target for c in cases}.__len__(), 1, 'one body for both')
                # The body sets the restart flag, data 0x13E.
                self.assertEqual(window(code, cases[0].target, 3), ['MOVLB 0x1', 'MOVLW 0x01', 'MOVWF 0x3e'])
                # The 0x01 case: the third XORLW leaves 0x02 ^ 0x01 ^ 0x02 and falls through to clear the
                # command state, data 0x11B, where chains stops because the branch skips the default.
                chain = window(code, b['escape_chain'], 6)
                xors = [int(t.split()[1], 16) for t in chain if t.startswith('XORLW')]
                self.assertEqual(len(xors), 3)
                self.assertEqual(xors[0] ^ xors[1] ^ xors[2], 0x01)
                self.assertEqual(chain[5], 'BNZ', 'not equal goes to the default, equal falls through')
                self.assertEqual(window(code, b['escape_chain'] + 0x0C, 2), ['MOVLB 0x1', 'CLRF 0x1b'])

    def test_the_main_loop_resets_when_the_restart_flag_is_set(self):
        for name, code in self.images.items():
            with self.subTest(name):
                self.assertEqual(window(code, BUILDS[name]['restart'], 3), ['MOVF 0x3e', 'BZ', 'RESET'])

    def test_write_misc_has_four_selectors_the_status_byte_and_a_data_memory_write_among_them(self):
        for name, code in self.images.items():
            with self.subTest(name):
                cases = chains.xor_chain(code, 0, BUILDS[name]['write_misc_chain'])
                self.assertEqual(sorted(c.value for c in cases), [0x02, 0x05, 0x06, 0x07])

    def test_the_applications_switch_is_this_one_plus_0x70_and_both_test_the_escape_before_it(self):
        lab.require('arch8_code_885')
        application = lab.load('arch8_code_885')
        app = chains.chain_table(application, APPLICATION_BASE, APPLICATION_DISPATCH)
        boot = chains.chain_table(self.images['arch8_boot_885'], 0, BUILDS['arch8_boot_885']['command_chain'])
        self.assertEqual(sorted(set(app) - set(boot)), [0x70])
        self.assertEqual(sorted(set(boot) - set(app)), [])
        # Neither switch holds the escape: both compare the masked command with 0xE0 before it, the
        # application at 0x1580A. What the application does with it is item 1.5's and not read here.
        self.assertNotIn(0xE0, app)
        self.assertEqual(window(application, APPLICATION_ESCAPE_TEST, 5, APPLICATION_BASE),
                         ['MOVLW 0xf0', 'ANDWF 0xb2', 'MOVLW 0xe0', 'SUBWF 0xb2', 'BNZ'])


class AHostTellsItFromTheApplicationByStringAndVersionNotByIds(BootloaderTest):
    def test_the_product_string_is_harmony_bootloader(self):
        name_utf16 = 'Harmony Bootloader'.encode('utf-16-le')
        for name, code in self.images.items():
            with self.subTest(name):
                at = BUILDS[name]['product']
                # A string descriptor: its length, type 3, then the text.
                self.assertEqual(code[at:at + 2], bytes([2 + len(name_utf16), 0x03]))
                self.assertEqual(code[at + 2:at + 2 + len(name_utf16)], name_utf16)
                lab.require(APPLICATION_OF[name])
                app = lab.load(APPLICATION_OF[name])
                self.assertNotIn(name_utf16, app)
                at = APPLICATION_PRODUCT - APPLICATION_BASE
                theirs = 'Harmony Remote 0-4.4.2'.encode('utf-16-le')
                self.assertEqual(app[at:at + 2], bytes([2 + len(theirs), 0x03]))
                self.assertEqual(app[at + 2:at + 2 + len(theirs)], theirs)

    def test_the_device_descriptor_is_the_applications_byte_for_byte(self):
        for name, code in self.images.items():
            with self.subTest(name):
                lab.require(APPLICATION_OF[name])
                app = lab.load(APPLICATION_OF[name])
                at = BUILDS[name]['descriptor']
                mine = code[at:at + 18]
                theirs = app[APPLICATION_DESCRIPTOR - APPLICATION_BASE:][:18]
                self.assertEqual(mine, theirs)
                self.assertEqual(mine[:2], b'\x12\x01')
                self.assertEqual(int.from_bytes(mine[8:10], 'little'), 0x046D)
                self.assertEqual(int.from_bytes(mine[10:12], 'little'), 0xC110)
                self.assertEqual(int.from_bytes(mine[12:14], 'little'), 0x0800 | BUILDS[name]['skin'])

    def test_the_version_answer_says_software_type_3_where_the_application_says_0(self):
        for name, code in self.images.items():
            with self.subTest(name):
                literals = [ins.fields['k'] for _, ins in listing(code, 0, BUILDS[name]['version'],
                                                                  BUILDS[name]['version'] + 10)]
                self.assertEqual(literals, [0x40, 3, BUILDS[name]['skin'], 0x00, 8])
                # The application's accessor, tests/harmony_880_885/test_arch8_usb.py, in the same order: version, type,
                # skin, field 6, architecture. Only the type, the version and field 6 differ.
                lab.require(APPLICATION_OF[name])
                app = lab.load(APPLICATION_OF[name])
                theirs = [ins.fields['k'] for _, ins in listing(app, APPLICATION_BASE, 0x11C46, 0x11C50)]
                self.assertEqual(theirs, [0x44, 0, BUILDS[name]['skin'], 0x08, 8])


class ThePowerOnDecision(BootloaderTest):
    def test_the_status_byte_is_cleared_unless_the_last_reset_was_the_reset_instruction(self):
        # Main's second call, before anything else reads the status: the routine asks the reset cause
        # and, unless it answers 1, clears the value at 0x103 and the index at 0x102 and calls the
        # writer, which copies 0x103 into data 0x100. The cause routine tests bit 4 of 0xFD0, which is
        # RCON's RI bit on a PIC18 (inferred, no datasheet of this part read): clear only after a
        # RESET instruction, so 1 means "the last reset was RESET" and keeps the status.
        for name, code in self.images.items():
            b = BUILDS[name]
            with self.subTest(name):
                call = listing(code, 0, b['cold_start_call'], b['cold_start_call'] + 4)[0][1]
                self.assertEqual((call.mnemonic, call.fields['target']), ('CALL', b['cold_start']))
                body = listing(code, 0, b['cold_start'], b['cold_start'] + 0x1A)
                self.assertEqual([text(ins) for _, ins in body],
                                 ['MOVLB 0x1', 'CLRF 0x3e', 'CALL', 'IORLW 0x00', 'BNZ', 'MOVLB 0x1',
                                  'CLRF 0x03', 'MOVLB 0x1', 'CLRF 0x02', 'RCALL', 'GOTO'])
                self.assertEqual(body[2][1].fields['target'], b['reset_cause'])
                self.assertEqual(body[9][1].fields['target'], b['status_read'] + 0x0C, 'the writer')
                self.assertEqual(window(code, b['reset_cause'], 3), ['BTFSS 0xd0,4', 'RETLW 0x01', 'RETLW 0x00'])
                # And then it re-arms the four reset cause bits, so the next reset that is not a RESET
                # instruction finds bit 4 set whatever kind of reset it is.
                self.assertEqual(body[10][1].fields['target'], b['rearm'])
                self.assertEqual(window(code, b['rearm'], 5),
                                 ['BSF 0xd0,4', 'BSF 0xd0,3', 'BSF 0xd0,2', 'BSF 0xd0,1', 'RETURN'])
                # And it runs before the staged install reads the status.
                self.assertLess(b['cold_start_call'], b['main_from'])

    def test_main_runs_staging_then_the_key_then_the_image_check_then_jumps(self):
        for name, code in self.images.items():
            b = BUILDS[name]
            with self.subTest(name):
                calls = [ins.fields['target'] for _, ins in listing(code, 0, b['main_from'], b['jump'])
                         if ins.mnemonic in ('CALL', 'RCALL')]
                order = [b['clear_unlock'], b['staging'], b['key_routine'], b['image_check']]
                self.assertEqual([t for t in calls if t in order], order)

    def test_the_jump_is_to_0x010C00_where_the_application_has_its_goto(self):
        for name, code in self.images.items():
            with self.subTest(name):
                self.assertEqual(window(code, BUILDS[name]['jump'], 5),
                                 ['MOVLW 0x01', 'MOVWF 0xfb', 'MOVLW 0x0c', 'MOVWF 0xfa', 'CLRF 0xf9'])
                lab.require(APPLICATION_OF[name])
                app = lab.load(APPLICATION_OF[name])
                entry = isa.decode(app, APPLICATION_ENTRY_VECTOR - APPLICATION_BASE, APPLICATION_BASE)
                self.assertEqual(entry.mnemonic, 'GOTO')

    def test_the_held_key_is_scan_code_0x02_or_0x21(self):
        for name, code in self.images.items():
            b = BUILDS[name]
            with self.subTest(name):
                # The key routine scans, stores the result in data 0x3B3 and calls the comparison.
                routine = [(text(ins), ins.fields.get('target')) for _, ins in listing(code, 0, b['key_routine'],
                                                                                     b['key_routine'] + 0x0E)]
                self.assertEqual(routine[0], ('CALL', b['scan']))
                self.assertEqual(routine[3][0], 'MOVFF')
                self.assertEqual(routine[4], ('RCALL', b['key_compare']))
                self.assertEqual(window(code, b['key_compare'], 9),
                                 ['MOVLW 0x02', 'MOVLB 0x3', 'SUBWF 0xb3', 'BZ', 'MOVLW 0x21', 'SUBWF 0xb3',
                                  'BNZ', 'RETLW 0x01', 'RETLW 0x00'])

    def test_the_staged_install_reads_the_status_byte_and_the_builds_differ_in_what_they_write(self):
        # The MOVLW literals from the entry to the choice of source, in order: 4 becomes 2, 7 becomes 6,
        # proceed on 2 or 6, then the status written while copying. The 885 chooses 4 or 7 by the
        # source; the 880 writes 4 whatever it is.
        expected = {
            'arch8_boot_885': [0x04, 0x02, 0x07, 0x06, 0x02, 0x06, 0x02, 0x04, 0x07],
            'arch8_boot_880': [0x04, 0x02, 0x07, 0x06, 0x02, 0x06, 0x02, 0x04],
        }
        for name, code in self.images.items():
            b = BUILDS[name]
            with self.subTest(name):
                literals = [ins.fields['k'] for _, ins in listing(code, 0, b['staging'], b['staging'] + 0x40)
                            if ins.mnemonic == 'MOVLW']
                self.assertEqual(literals[:len(expected[name])], expected[name])
                # The status byte is data 0x100: the routine clears the index at 0x101 and calls the
                # reader, which returns data 0x100 for index 0. The writer beside it stores 0x103 there.
                first = listing(code, 0, b['staging'], b['staging'] + 8)
                self.assertEqual([text(ins) for _, ins in first], ['MOVLB 0x1', 'CLRF 0x01', 'CALL'])
                self.assertEqual(first[2][1].fields['target'], b['status_read'])
                self.assertEqual(window(code, b['status_read'], 5),
                                 ['MOVLB 0x1', 'MOVF 0x01', 'BNZ', 'MOVF 0x00', 'RETURN'])
                write = listing(code, 0, b['status_read'] + 0x0C, b['status_read'] + 0x16)
                self.assertEqual(write[3][1].mnemonic, 'MOVFF')
                self.assertEqual((write[3][1].fields['src'], write[3][1].fields['dst']), (0x103, 0x100))
                # The source: upper byte 0x1D on status 2, else 0x02, so 0x1D0000 or 0x020000.
                self.assertEqual(window(code, b['staging_source'], 11),
                                 ['MOVLW 0x02', 'MOVLB 0x2', 'SUBWF 0x00', 'BNZ', 'CLRF 0x01', 'CLRF 0x02',
                                  'MOVLW 0x1d', 'BRA', 'CLRF 0x01', 'CLRF 0x02', 'MOVLW 0x02'])
                # Into 0x010000, 0x8000 words.
                self.assertEqual(window(code, b['staging_source'] + 0x16, 7),
                                 ['MOVWF 0x03', 'CLRF 0x04', 'CLRF 0x05', 'MOVLW 0x01', 'MOVWF 0x06', 'CLRF 0x07',
                                  'MOVLW 0x80'])


class TheImageCheck(BootloaderTest):
    def constants(self, name):
        """The magic, the seeds, the start and the count, out of the code rather than from this file."""
        code, b = self.images[name], BUILDS[name]
        magic = window(code, b['magic'], 6)
        self.assertEqual([magic[0], magic[2], magic[3], magic[4], magic[5]],
                         ['MOVLW 0x48', 'XORWF 0x00', 'BNZ', 'MOVLW 0x47', 'XORWF 0x01'])
        seeds = window(code, b['seeds'], 4)
        self.assertEqual([seeds[1], seeds[3]], ['MOVWF 0x02', 'MOVWF 0x03'])
        even, odd = (int(seeds[0].split()[1], 16), int(seeds[2].split()[1], 16))
        # The address, 0x010000, in data 0x080 to 0x082, and the count of words, 0x008000, in 0x206 to 0x208.
        setup = window(code, b['seeds'] + 8, 9)
        self.assertEqual(setup, ['MOVLB 0x0', 'CLRF 0x80', 'CLRF 0x81', 'MOVLW 0x01', 'MOVWF 0x82',
                                 'MOVLB 0x2', 'CLRF 0x06', 'MOVLW 0x80', 'MOVWF 0x07'])
        words = 0x8000
        # Two words are taken before the loop, the stored checksum and the word at 0x010002, each with
        # one decrement of the count; the loop's own decrement comes after the loop test.
        before = [text(ins) for _, ins in listing(code, 0, b['seeds'], b['loop_test'])]
        self.assertEqual(before.count('DECF 0x06'), 2)
        return even, odd, 4, words - 2

    def checksum(self, app, even, odd, start, words):
        for i in range(start, start + 2 * words, 2):
            even ^= app[i]
            odd ^= app[i + 1]
        return even, odd

    def test_the_seeds_are_0x21_and_0x43_and_the_magic_is_hg(self):
        for name in self.images:
            with self.subTest(name):
                even, odd, start, words = self.constants(name)
                self.assertEqual((even, odd, start, words), (0x21, 0x43, 4, 0x7FFE))
                self.assertEqual(start + 2 * words, 0x10000, 'to the end of the 64 KiB')

    def test_both_applications_close_against_the_code(self):
        for name in self.images:
            with self.subTest(name):
                lab.require(APPLICATION_OF[name])
                app = lab.load(APPLICATION_OF[name])
                even, odd, start, words = self.constants(name)
                self.assertEqual(app[4:6], b'HG')
                self.assertEqual(self.checksum(app, even, odd, start, words), (app[0], app[1]))

    def test_a_flipped_byte_breaks_it(self):
        for name in self.images:
            with self.subTest(name):
                lab.require(APPLICATION_OF[name])
                app = bytearray(lab.load(APPLICATION_OF[name]))
                even, odd, start, words = self.constants(name)
                app[0x8001] ^= 0x01
                self.assertNotEqual(self.checksum(app, even, odd, start, words), (app[0], app[1]))

    def test_starting_one_word_earlier_breaks_it_so_the_word_at_0x010002_is_not_summed(self):
        for name in self.images:
            with self.subTest(name):
                lab.require(APPLICATION_OF[name])
                app = lab.load(APPLICATION_OF[name])
                even, odd, _, words = self.constants(name)
                self.assertEqual(app[2:4], b'\x00\xff')
                self.assertNotEqual(self.checksum(app, even, odd, 2, words + 1), (app[0], app[1]))

    def test_a_0xff_at_0x010002_is_a_first_boot_and_gets_programmed_to_zero(self):
        for name, code in self.images.items():
            b = BUILDS[name]
            with self.subTest(name):
                # Data 0x209 holds the byte read from 0x010002.
                self.assertEqual(window(code, b['first_boot'], 3), ['MOVLW 0xff', 'MOVLB 0x2', 'SUBWF 0x09'])
                # The byte program: address 0x010002 into data 0x3E1 to 0x3E3, the value 0 into 0x3E4.
                mark = listing(code, 0, b['first_boot_mark'], b['first_boot_mark'] + 0x12)
                self.assertEqual([text(ins) for _, ins in mark],
                                 ['MOVLW 0x02', 'MOVWF 0xe1', 'CLRF 0xe2', 'MOVLW 0x01', 'MOVWF 0xe3', 'MOVLB 0x3',
                                  'CLRF 0xe4', 'CALL'])
                self.assertEqual(mark[-1][1].fields['target'], 0x1FFE56, 'program a byte')


class AFlashProgrammerWithOneFloor(BootloaderTest):
    def test_the_copied_routines_run_at_0x1FFE50_and_the_code_calls_their_jump_table(self):
        for name, code in self.images.items():
            b = BUILDS[name]
            start, end = b['slot1']
            with self.subTest(name):
                # The copier's arguments: end, start, then slot 1.
                args = [ins.fields['k'] for _, ins in listing(code, 0, b['copier_args'], b['copier_args'] + 0x24)
                        if ins.mnemonic == 'MOVLW']
                self.assertEqual(args, [end & 0xFF, end >> 8, 0, start & 0xFF, start >> 8, 0, 2, 1])
                slot = code[start:end + 2]
                table = listing(slot, SLOT1_RUNS_AT, SLOT1_RUNS_AT + 2, SLOT1_RUNS_AT + 10)
                self.assertEqual([(a, ins.mnemonic) for a, ins in table],
                                 [(a, 'BRA') for a in sorted(RAM_ENTRIES)])
                called = {ins.fields['target'] for _, ins in listing(code, 0, 0, CODE_END[name])
                          if ins.mnemonic in ('CALL', 'GOTO') and ins.fields['target'] >= 0x1FE000}
                self.assertEqual(called, set(RAM_ENTRIES) | {0x1FFE02})

    def test_the_inner_check_opens_erase_and_both_programs_and_not_the_id_read(self):
        # Decoded at the address the copy runs at: each of the three routines that change the part
        # calls the check first, and the id read, which changes nothing, does not.
        for name, code in self.images.items():
            start, end = BUILDS[name]['slot1']
            with self.subTest(name):
                slot = code[start:end + 2]
                runs = listing(slot, SLOT1_RUNS_AT, SLOT1_RUNS_AT, SLOT1_RUNS_AT + len(slot))
                entries = {ins.fields['target']: RAM_ENTRIES[a] for a, ins in runs if a in RAM_ENTRIES}
                callers = [a for a, ins in runs
                           if ins.mnemonic in ('CALL', 'RCALL') and ins.fields['target'] == 0x1FFFE0]
                self.assertEqual(sorted(entries[a] for a in callers),
                                 ['erase', 'program a buffer', 'program a byte'])
                # Each is the routine's first instruction, and a zero answer returns without touching
                # the part.
                self.assertEqual(sorted(callers), sorted(a for a, what in entries.items() if what != 'id read'))
                width = {a: 2 * ins.words for a, ins in runs}
                for at in callers:
                    after = [text(ins) for _, ins in listing(slot, SLOT1_RUNS_AT, at + width[at], at + width[at] + 4)]
                    self.assertEqual(after, ['IORLW 0x00', 'BZ'], hex(at))

    def test_the_part_is_driven_by_amd_style_unlock_cycles(self):
        # 0xAA to 0x000AAA, then 0x55 to 0x000555, through table writes: the unlock of an AMD style
        # NOR part in byte mode. Which part is not read here.
        for name, code in self.images.items():
            start, _ = BUILDS[name]['slot1']
            with self.subTest(name):
                self.assertEqual(window(code[start:], SLOT1_RUNS_AT + 0x0C, 16, SLOT1_RUNS_AT),
                                 ['MOVLW 0xaa', 'MOVWF 0xf6', 'MOVLW 0x0a', 'MOVWF 0xf7', 'CLRF 0xf8',
                                  'MOVLW 0xaa', 'MOVWF 0xf5', 'TBLWT*', 'MOVLW 0x55', 'MOVWF 0xf6',
                                  'MOVLW 0x05', 'MOVWF 0xf7', 'CLRF 0xf8', 'MOVLW 0x55', 'MOVWF 0xf5',
                                  'TBLWT*'])

    def test_the_inner_check_floor_is_0x010000_and_the_unlock_0xA7(self):
        for name, code in self.images.items():
            b = BUILDS[name]
            with self.subTest(name):
                self.assertEqual(window(code, b['inner_check'], 15),
                                 ['MOVLW 0x00', 'MOVLB 0x3', 'SUBWF 0xe1', 'MOVLW 0x00', 'SUBWFB 0xe2',
                                  'MOVLW 0x01', 'SUBWFB 0xe3', 'BC', 'MOVLW 0xa7', 'SUBWF 0xe8', 'BNZ',
                                  'BSF 0x86,3', 'RETLW 0x01', 'RETLW 0x01', 'RETLW 0x00'])
                # It sits inside the copied slot, so it runs at 0x1FFFE0 in RAM.
                start, end = b['slot1']
                self.assertTrue(start <= b['inner_check'] < end)
                self.assertEqual(b['inner_check'] - start + SLOT1_RUNS_AT, 0x1FFFE0)

    def test_the_outer_check_on_erase_has_the_same_floor_and_a_refusal_shows_error_2_and_drops_the_state(self):
        for name, code in self.images.items():
            b = BUILDS[name]
            with self.subTest(name):
                self.assertEqual(window(code, b['outer_check'], 12),
                                 ['MOVLW 0x00', 'MOVLB 0x3', 'SUBWF 0xed', 'MOVLW 0x00', 'SUBWFB 0xee',
                                  'MOVLW 0x01', 'SUBWFB 0xef', 'BC', 'MOVF 0xe8', 'BNZ', 'RETLW 0x01',
                                  'RETLW 0x00'])
                parse = listing(code, 0, b['erase_parse'], b['erase_parse'] + 8)
                self.assertEqual(parse[0][1].fields['target'], b['outer_check'])
                self.assertEqual(parse[2][1].mnemonic, 'BNZ')
                self.assertEqual(parse[2][1].fields['target'], b['erase_refused'])
                refused = listing(code, 0, b['erase_refused'], b['erase_refused'] + 0x10)
                self.assertEqual([text(ins) for _, ins in refused],
                                 ['MOVLB 0x1', 'CLRF 0x2b', 'MOVLB 0x1', 'MOVLW 0x02', 'MOVWF 0x2a', 'CALL', 'BRA'])
                # The BRA goes where the command state, data 0x11B, is dropped when 0x202 is zero, and
                # 0x202 is cleared before the switch, so the executor has no state to answer. Whether
                # the error screen routine itself sends anything is not read.
                self.assertEqual(refused[-1][1].fields['target'], b['no_reply'])
                self.assertEqual(window(code, b['no_reply'], 5),
                                 ['MOVLB 0x2', 'MOVF 0x02', 'BNZ', 'MOVLB 0x1', 'CLRF 0x1b'])

    def test_a_one_byte_write_to_0x000106_sets_the_unlock(self):
        for name, code in self.images.items():
            b = BUILDS[name]
            with self.subTest(name):
                self.assertEqual(window(code, b['unlock_write'], 9),
                                 ['MOVLW 0x06', 'MOVLB 0x1', 'XORWF 0x14', 'BNZ', 'MOVLW 0x01', 'XORWF 0x15',
                                  'BNZ', 'MOVF 0x16', 'BNZ'])
                # A count of one, then the packet's byte into data 0x3E8 and a branch past the programming.
                self.assertEqual(window(code, b['unlock_store'] - 0x10, 9),
                                 ['MOVLB 0x2', 'DECF 0x01', 'BNZ', 'MOVFF', 'CALL', 'MOVLB 0x3', 'MOVWF 0xe8',
                                  'BRA', 'MOVLB 0x1'])

    def test_the_unlock_is_cleared_at_start_and_set_only_around_the_bootloaders_own_log_write(self):
        # Main clears it; the bootloader sets 0xA7 itself and clears it again around its one write
        # into its own region, a hardware version byte at 0x000140 (0x04930, not asserted further).
        for name, code in self.images.items():
            b = BUILDS[name]
            set_at, clear_at = b['self_unlock']
            with self.subTest(name):
                self.assertEqual(window(code, b['clear_unlock'], 2), ['MOVLB 0x3', 'CLRF 0xe8'])
                self.assertEqual(window(code, set_at, 3), ['MOVLB 0x3', 'MOVLW 0xa7', 'MOVWF 0xe8'])
                self.assertEqual(window(code, clear_at, 2)[-2:], ['MOVLB 0x3', 'CLRF 0xe8'])

    def test_a_one_byte_read_at_0x000104_or_0x000105_is_a_routine_and_not_flash(self):
        for name, code in self.images.items():
            with self.subTest(name):
                for at, low in zip(BUILDS[name]['read_special'], (0x04, 0x05)):
                    self.assertEqual(window(code, at, 12),
                                     ['MOVLW 0x%02x' % low, 'MOVLB 0x1', 'XORWF 0x14', 'BNZ', 'MOVLW 0x01', 'XORWF 0x15', 'BNZ',
                                      'MOVF 0x16', 'BNZ', 'MOVLB 0x2', 'DECF 0x0b', 'BNZ'])

    def test_a_lone_last_byte_at_0x000104_reads_the_hardware_log_and_at_0x000105_a_measurement(self):
        # Item 1.8: the routine each case calls. The log reader starts at 0x000140, as the application's
        # 0x182FA does; the measurement is the application's 0x11BBE in this build.
        readers = {'arch8_boot_885': 0x04822, 'arch8_boot_880': 0x04814}
        for name, code in self.images.items():
            at104, at105 = BUILDS[name]['read_special']
            with self.subTest(name):
                self.assertEqual(window(code, at104 + 0x18, 3), ['MOVLB 0x1', 'SETF 0x06', 'CALL'])
                self.assertEqual(listing(code, 0, at104 + 0x1C, at104 + 0x20)[0][1].fields['target'], readers[name])
                self.assertEqual(window(code, readers[name], 6),
                                 ['MOVLB 0x2', 'MOVLW 0x40', 'MOVWF 0x26', 'MOVLW 0x01', 'MOVWF 0x27', 'CLRF 0x28'])
                measure = listing(code, 0, at105 + 0x18, at105 + 0x1C)[0][1]
                self.assertEqual((measure.mnemonic, measure.fields['target']), ('CALL', 0x01948))
                self.assertEqual(listing(code, 0, 0x01948, 0x0194A)[0][1].fields['target'], 0x018EA)

    def test_the_buffer_program_uses_unlock_bypass_and_programs_0xff_bytes_too(self):
        # Item 1.4: 0x20 enters unlock bypass, 0xA0 and the byte per byte, 0x90 then 0x00 leave it. No
        # literal 0xFF anywhere in the copied routines, so no byte is skipped, where the application's
        # buffer program compares each byte with 0xFF.
        for name, code in self.images.items():
            start, end = BUILDS[name]['slot1']
            with self.subTest(name):
                slot = code[start:end + 2]
                runs = listing(slot, SLOT1_RUNS_AT, SLOT1_RUNS_AT, SLOT1_RUNS_AT + len(slot))
                loads = [(a, ins.fields['k']) for a, ins in runs if ins.mnemonic == 'MOVLW'
                         and ins.fields['k'] in (0x20, 0x90, 0xA0, 0xFF)]
                self.assertEqual(loads, [(0x1FFF1E, 0x90), (0x1FFF44, 0xA0), (0x1FFF6A, 0x20), (0x1FFF9C, 0xA0),
                                         (0x1FFFCE, 0x90)])
                self.assertEqual(window(slot, 0x1FFF60, 3, SLOT1_RUNS_AT), ['RCALL', 'IORLW 0x00', 'BZ'])

    def test_the_version_answer_reports_the_parts_own_id_bytes(self):
        # Item 1.3: two autoselect reads into 0x211 and 0x212 and straight out, with no comparison against
        # the 0x1F the application replaces.
        for name, code in self.images.items():
            with self.subTest(name):
                calls = [a for a, ins in listing(code, 0, 0, CODE_END[name])
                         if ins.mnemonic == 'CALL' and ins.fields['target'] == 0x1FFE54]
                self.assertEqual(len(calls), 2)
                self.assertEqual(calls[1] - calls[0], 0x12)
                tail = [text(ins) for _, ins in listing(code, 0, calls[0], calls[1] + 0x18)]
                self.assertNotIn('MOVLW 0x1f', tail)
                self.assertEqual(tail[-2:], ['BRA', 'RETURN'])

    def test_the_key_scan_restarts_by_reset_when_scan_codes_2_33_and_32_are_down(self):
        # Reviewer 1's lead of item 1.1, landed with items 1.2 to 1.8. The key scan's first call; bits 4,
        # 5 and 7 of the byte at 0x81 in the selected bank must read zero (whether that byte is port B
        # depends on the bank, which is not read); then the three scan codes, and a RESET instruction,
        # which the cold start test above lets keep the status byte.
        combination = {'arch8_boot_885': 0x04AC8, 'arch8_boot_880': 0x04ABA}
        for name, code in self.images.items():
            at = combination[name]
            with self.subTest(name):
                calls = [a for a, ins in listing(code, 0, 0, CODE_END[name]) if ins.fields.get('target') == at]
                self.assertEqual(calls, [BUILDS[name]['scan'] + 4])
                body = window(code, at + 0x0C, 23)
                self.assertEqual(body[:2], ['MOVLW 0xb0', 'ANDWF 0x81'])
                self.assertEqual([t for t in body if t.startswith('MOVLW')],
                                 ['MOVLW 0xb0', 'MOVLW 0x02', 'MOVLW 0x21', 'MOVLW 0x20'])
                self.assertEqual(body[-1], 'RESET')

    def test_logitechs_classic_client_names_that_byte_and_that_address(self):
        """The closure: the client's arch 8 constants against the literals the code above tests. That the
        client writes them before rewriting the bottom 64 KiB is section 213, `tests/logitech/test_host_client.py`."""
        lab.require('classic_protocol8')
        source = lab.load('classic_protocol8').decode('utf-8', 'replace')
        data = re.search(r'BOOTLOADER_UNLOCK_DATA\b[^;]*\{\s*(-?\d+)\s*\}', source)
        address = re.search(r'BOOTLOADER_UNLOCK_ADDRESS\s*=\s*(\d+)', source)
        staging = re.search(r'CODE_NEW_ADDRESS\s*=\s*(\d+)', source)
        self.assertEqual(int(data.group(1)) & 0xFF, 0xA7)
        self.assertEqual(int(address.group(1)), 0x000106)
        self.assertEqual(int(staging.group(1)), 0x1D0000)


class TheTopEightKiBIsDevicesAndRam(unittest.TestCase):
    def test_every_immediate_table_pointer_load_into_0x1F_names_one_of_four_device_addresses(self):
        names = BOOTLOADERS + ('arch8_code_885',)
        lab.require(*names)
        expected = {'arch8_boot_880': 37, 'arch8_boot_885': 37, 'arch8_code_885': 38}
        for name in names:
            base = APPLICATION_BASE if name.startswith('arch8_code') else 0
            code = lab.load(name)
            with self.subTest(name):
                ins = [text(i) for _, i in listing(code, base, base, base + CODE_END[name])]
                found = []
                for k in range(len(ins) - 5):
                    if ins[k:k + 2] == ['MOVLW 0x1f', 'MOVWF 0xf8']:
                        self.assertEqual(ins[k + 2:k + 4], ['MOVLW 0xe0', 'MOVWF 0xf7'])
                        self.assertEqual(ins[k + 5], 'MOVWF 0xf6')
                        found.append(0x1FE000 | int(ins[k + 4].split()[1], 16))
                self.assertEqual(len(found), expected[name])
                self.assertEqual(sorted(set(found)), [0x1FE040, 0x1FE041, 0x1FE081, 0x1FE0C1])


# The Harmony 720's two images, found by file name like tests/harmony_880_885/test_harmony_885_start_check.py's, which
# says why they are not registered in lab.IMAGES.
H720_APPLICATION = 'H720-Firmware.bin'
H720_BOTTOM = 'H720-Safemode.bin'
# The other bottom 64 KiB images of this platform, each a contributor's concordance safe mode read.
OTHER_BOTTOMS = {'880 Pro': 'H880-Pro-Safemode.bin', 'second 880': 'H880-Spare-4-Safemode.bin',
                 '720': H720_BOTTOM}
IDENTITY_AT = 0x000110
HARDWARE_LOG_AT = 0x000140


def by_name(*filenames):
    """The bytes of lab files found by name, all of them or a skip of the whole test."""
    paths = [lab._find(f) for f in filenames]   # noqa: SLF001, deliberately unregistered
    missing = [f for f, p in zip(filenames, paths) if not p]
    if missing:
        raise unittest.SkipTest('no %s found' % ', '.join(missing))
    out = []
    for p in paths:
        with open(p, 'rb') as fh:
            out.append(fh.read())
    return out


def calls_to(code, base, target, end):
    """Every CALL in code[base:end] whose target is `target`."""
    return [a for a, i in listing(code, base, base, end) if i.mnemonic == 'CALL' and i.fields['target'] == target]


def string_descriptor(code, text_):
    """Where `text_` sits as a USB string descriptor (length, type 3, UTF-16), or None."""
    u = text_.encode('utf-16-le')
    at = code.find(bytes([2 + len(u), 0x03]) + u)
    return None if at < 0 else at


class TheIdentityBlockIsTheLaterRemotesLayoutWithTheHardwareLogAsItsFourthField(unittest.TestCase):
    def setUp(self):
        lab.require(*BOOTLOADERS)
        others = dict(zip(OTHER_BOTTOMS, by_name(*OTHER_BOTTOMS.values())))
        self.images = {name: lab.load(name) for name in BOOTLOADERS}
        self.images.update(others)

    def test_the_first_sixteen_bytes_are_0xEE_in_all_five_images(self):
        for name, code in self.images.items():
            with self.subTest(name):
                self.assertEqual(code[IDENTITY_AT:IDENTITY_AT + 16], b'\xee' * 16)

    def test_the_next_two_fields_are_not_filler_and_differ_between_all_five_images(self):
        guids = {}
        for name, code in self.images.items():
            with self.subTest(name):
                a = code[IDENTITY_AT + 0x10:IDENTITY_AT + 0x20]
                b = code[IDENTITY_AT + 0x20:IDENTITY_AT + 0x30]
                # Not a uniform fill, which is what identity.ts's refusal looks for.
                self.assertNotEqual(a, a[:1] * 16)
                self.assertNotEqual(b, b[:1] * 16)
                self.assertNotEqual(a, b)
                guids[name] = a + b
        self.assertEqual(len(guids), 5)
        self.assertEqual(len(set(guids.values())), 5)

    def test_the_fourth_field_is_the_hardware_log_and_not_sixteen_zeroes(self):
        # 0x000110 + 0x30 is the log's address, so the later remotes' trailer of zeroes has no room here.
        self.assertEqual(IDENTITY_AT + 0x30, HARDWARE_LOG_AT)
        for name, code in self.images.items():
            with self.subTest(name):
                log = code[HARDWARE_LOG_AT:HARDWARE_LOG_AT + 16]
                self.assertNotEqual(log, bytes(16))
                # Filled from the bottom: some entries, then 0xFF to the end of the sixteen.
                entries = log.rstrip(b'\xff')
                self.assertEqual(len(entries), 2 if name == 'arch8_boot_885' else 1)
                self.assertNotIn(0xFF, entries)


class TheHarmony720sImagesAreAnApplication45AndABootloader42(unittest.TestCase):
    def setUp(self):
        self.application, self.bottom = by_name(H720_APPLICATION, H720_BOTTOM)

    def test_both_are_64_kib(self):
        self.assertEqual((len(self.application), len(self.bottom)), (0x10000, 0x10000))

    def test_the_application_reports_4_5_type_0_skin_44(self):
        literals = [i.fields['k'] for _, i in listing(self.application, APPLICATION_BASE, 0x11C00, 0x11C0A)]
        self.assertEqual(literals, [0x45, 0, 44, 0x08, 8])
        self.assertEqual(len(calls_to(self.application, APPLICATION_BASE, 0x11C00, 0x01E000)), 1)

    def test_the_bottom_image_reports_a_bootloader_4_2_type_3_skin_44(self):
        literals = [i.fields['k'] for _, i in listing(self.bottom, 0, 0x019CA, 0x019D4)]
        self.assertEqual(literals, [0x42, 3, 44, 0x00, 8])
        self.assertEqual(len(calls_to(self.bottom, 0, 0x019CA, 0x06800)), 1)

    def test_the_bottom_image_starts_with_a_goto_inside_itself(self):
        (_, goto), = listing(self.bottom, 0, 0, 4)
        self.assertEqual(goto.mnemonic, 'GOTO')
        self.assertEqual(goto.fields['target'], 0x06654)

    def test_the_product_strings_agree_with_the_accessors_type_and_version(self):
        # Read as the software type, a dash and the version: the digit and the first two version digits
        # are compared with the accessor literals rather than restated.
        for code, base, at, string in ((self.application, APPLICATION_BASE, 0x11C00, 'Harmony Remote 0-4.5.0'),
                                       (self.bottom, 0, 0x019CA, 'Harmony Remote 3-4.2.4')):
            with self.subTest(string):
                self.assertIsNotNone(string_descriptor(code, string))
                version, kind = [i.fields['k'] for _, i in listing(code, base, at, at + 4)]
                digits = string.split()[-1]
                self.assertEqual(int(digits[0]), kind)
                self.assertEqual(int(digits[2]) * 16 + int(digits[4]), version)
        # And the negative: neither carries the other's string, and the bottom image is not the 880's
        # and 885's build, whose string is Harmony Bootloader.
        self.assertIsNone(string_descriptor(self.application, 'Harmony Remote 3-4.2.4'))
        self.assertIsNone(string_descriptor(self.bottom, 'Harmony Remote 0-4.5.0'))
        self.assertIsNone(string_descriptor(self.bottom, 'Harmony Bootloader'))


if __name__ == '__main__':
    unittest.main()
