# Harmony 880 and 885: firmware

A Harmony 880 or 885 runs two programs that together fill its first 128 KiB of flash: a bootloader at the
bottom, which starts the remote, owns its interrupt vectors and serves the USB cable itself when it does not
start the application, and the application above it, which does everything else and hands nothing back. One application build serves both models and says which one it is
in two bytes. This page says what each image is, where it loads, how its header differs from every later
Harmony's, and how a copy of one is obtained.

Read in two application images and two bootloaders, an 880's and an 885's of each, which other people
read off their remotes and published. A Harmony 885's application, read off it over USB, is the 885 image
byte for byte, which measures its load address at `0x010000`.[^t-arch8-usb] Where each image
sits in flash is [memory.md](memory.md).

## The images

| image | version | software type | where it loads | entry | standing |
|---|---|---|---|---|---|
| application | 4.4 | 0, application | `0x010000`, 64 KiB | **not in the image**: the reset vector is the bootloader's | 979 branch targets on an instruction boundary at that base, against 602 for the runner up at `0x00D000`, and concordance's `firmware_base` agrees[^s114][^x-concordance] |
| bootloader | 4.0 | 3, Boot mode | `0x000000`, 64 KiB | reset `GOTO 0x0637C` on the 880 and `0x06392` on the 885, inside itself; the high and low priority interrupt vectors go to `0x010400` and `0x010800`, inside the application | 342 boundary hits against 46 for the runner up, and concordance's `flash_base` agrees[^s116][^x-concordance] |

**One application build serves both models.** The 880's and the 885's images differ at exactly two
offsets, `0x1C4A` and `0xA63C`, `0x0F` against `0x11`: the skin, once in a constant table and once in
the USB descriptor. Their stored checksums are identical, because the two bytes sit at the same parity and
`0x0F ^ 0x11` cancels between them, so a model number can change without changing the checksum.[^s114]

**The two bootloaders are two builds.** They differ in 15694 bytes across 1225 runs, the reset vector
included, and their code ends 22 bytes apart, at `0x0639B` and `0x063B1`.[^s116]

**The software type is Logitech's own word.** The version block's accessor in each image states it, and
Logitech's firmware packages name the values: 0 an application, 1 test, 2 minimal, 3 a bootloader, 4 safe
mode.[^s116][^s7] **No image of type 4 is known on this architecture**: neither of the two ways a host can
read an image here returns one.[^s116] **The bootloader does part of what safe mode does on later
platforms**: when it does not start the application it stays resident and answers the application's own
commands, so it is the minimal program a host can reach whenever the bottom 64 KiB are intact,
[below](#what-the-bootloader-does-at-power-on).
Whether the application has a safe mode of its own is not checked.[^t-885-boot][^unchecked] This said
whether this platform's Boot mode does the work later platforms split<!--superseded--> into a bootloader and
safe mode was not known, until the bootloader was read.[^t-885-boot]

## The header is not the later Harmonys'

Every application image here opens with a header, and the field order differs from the Harmony One's and
the Harmony 600, 650 and 700's, so a disassembler or a parser taking those as the template reads the wrong
fields.[^s114]

| offset | the Harmony One, 600, 650 and 700 | the Harmony 880 and 885 |
|---|---|---|
| 0 | `u16` checksum | `u16` checksum |
| 2 | `0xFFFF` | `0xFF00`, its low byte the first boot mark, below |
| 4 | `u16` size field | **the `HG` magic**, `48 47` |
| 6 | family, version BCD | `0x0000` |
| 8 | the `HG` magic | `0xC000` |
| 10 | a `GOTO` to the entry point | `0x1020` |

**The checksum is the same algorithm with the same seeds**: the even bytes XORed into one seed and the odd
bytes into another, `0x21` and `0x43`, stored at offset 0, and it verifies over the whole 65536 bytes. Several
shorter lengths verify too, because everything above `0x0FB90` is `0xFF` padding and an even number of
`0xFFFF` words XORs to nothing; the one tested length that drops an odd number of them fails, which shows
the passes say nothing about where the image ends.[^s114]

**The bootloaders have no header and no checksum**: their first bytes are the reset vector.[^s116]

**The bootloader checks this checksum at every power on where no key is held, and leaves out the word at
offset 2.** It sums from offset 4 to the end of the 64 KiB, so both bytes at offset 2 can change without
breaking it, and the low one does: when the check passes with `0xFF` there the bootloader shows a screen and programs that byte to
`0x00`, a mark that the image has booted once. Both application images carry `0x00`, and starting the sum
at offset 2 instead fails on both.[^t-885-boot]

## What the bootloader does at power on

In order, read in both bootloader builds:[^t-885-boot]

1. **It clears the request for a staged install, unless the restart came from the firmware itself.** The
   request is a status byte in data memory, `0x100`, that write misc selector 6 sets. It survives a reset
   by the processor's `RESET` instruction, which is how the escape's restart ends, and it is cleared after
   any other reset, so a power on or a battery pull never starts an install. Which reset happened is read
   from bit 4 of the register at `0xFD0`, which the bootloader sets again at every start, so only a `RESET`
   instruction can clear it before the next one; that `0xFD0` is the PIC18's reset control register `RCON`
   is inferred from the processor family and not checked against the part's datasheet.[^t-885-boot]
2. **The staged install**, if the status asks for one. Status 2 copies 64 KiB from `0x1D0000` to the
   application at `0x010000`, status 6 copies them from `0x020000`; 4 and 7 are the same two resumed. The
   sector at `0x010000` is erased first, the status reset to 0 at the end.[^t-885-boot] **The two builds
   differ here**: while copying, the 885's writes status 4 for the
   `0x1D0000` source and 7 for the `0x020000` one, the 880's writes 4 for both, so a copy from `0x020000`
   that an 880 resumed would resume from `0x1D0000`.[^t-885-boot] What sets the status, what sits at
   `0x1D0000` on a unit, and what could interrupt a copy and leave 4 or 7 behind are not
   checked, and so is what a status 6 install would take from `0x020000`, where the user configuration
   starts.[^unchecked] Logitech's classic client names `0x1D0000` for this platform as the address of new
   code.[^t-885-boot-client]
3. **The held key.** If the keypad scan gives scan code 2 or 33 (`0x02` or `0x21`), the bootloader stays
   resident and does not look at the application. Which printed keys those are is not checked.[^t-885-boot][^unchecked]
4. **The image check**: the `HG` magic at `0x010004` and the checksum above. A failure stays resident.[^t-885-boot]
5. **The jump** to `0x010C00`, where the application holds a `GOTO` to its entry.[^t-885-boot]

**Staying resident** means a screen of the bootloader's own and its USB service loop, which speaks the
application's protocol and can rewrite the whole flash, [the bootloader](../../usb-protocol/bootloader.md#the-harmony-880-and-885);
only a host's restart or a reboot leaves it, and a reboot runs the same decision again.[^t-885-boot]

**For a recovery**, that means a remote whose application is destroyed or half written still boots into a
program that answers on the cable, and a host can write the application back through it. What nothing
recovers is the bootloader itself: an erased bootloader sector leaves no program to run at power on, and
erasing one takes an unlock a host has to send on purpose.[^t-885-boot]

## Routines read and where

| routine | where | source |
|---|---|---|
| the version block's five constants, `RETLW` in the order field 0, field 4 low, field 5, field 6, field 4 high | `0x11C46` in both applications | [^s114] |
| the keypad scan, `scan = (line - 1) * 4 + input`, after a caller that reads `PORTB` | `0x08C26` in both applications, `0x04D06` in the 880's bootloader and `0x04D14` in the 885's | [^s144] |
| the USB device descriptor | `0x1A630` in the applications, `0x06102` in the 880's bootloader and `0x06118` in the 885's, byte for byte the application's | [^s114][^t-885-boot] |
| the bootloader's command switch, an `XORLW` chain | `0x03BD4` in the 880's bootloader and `0x03BE0` in the 885's | [^t-885-boot] |
| the bootloader's power on decision | the status clear at `0x0465E` and `0x0466C`, the staged install at `0x02218` and `0x0221C`, the key test at `0x020A8` and `0x020AC` with its comparison at `0x02096` and `0x0209A`, the image check at `0x020CA` and `0x020CE`, the jump at `0x01DDA` and `0x01DDE` | [^t-885-boot] |
| the bootloader's floor check on erase and write, copied to RAM and run at `0x1FFFE0` | `0x056C0` in the 880's bootloader and `0x056CE` in the 885's | [^t-885-boot] |

## Obtaining an image

**On this architecture concordance's firmware read returns the whole application**, where on the Harmony
One and the Harmony 600, 650 and 700 it does not: its table gives architecture 8 a firmware base of its
own at `0x010000`, and the configuration base above it is exactly one 64 KiB read away, so one read covers
the application with nothing cut off and nothing else included.[^x-concordance][^s114] Its safe mode read
takes 64 KiB from the flash base, `0x000000` here, so on this architecture it returns the bootloader and
not a safe mode image.[^s116] The serial number at `0x000110` is inside what that second read returns and
outside the first.[^x-concordance]

No Logitech package of this firmware is known; the images were read off remotes by their owners.[^unchecked]

## Not checked

* Any firmware version but 4.4 and boot 4.0.[^unchecked]
* The Harmony 720's, 785's, 880 Pro's and 882's firmware.[^unchecked]
* Whether the application has a safe mode of its own; how a recovery through the bootloader goes on a unit.[^unchecked]

[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s116]: Read in the firmware. [Section 116](../../../docs/findings.md#s116)
[^s7]: Stated by Logitech. [Section 7](../../../docs/findings.md#s7)
[^s144]: Read in the firmware. [Section 144](../../../docs/findings.md#s144)
[^unchecked]: Not checked.
[^t-arch8-usb]: Measured on a unit. [The test](../../../tests/test_arch8_usb.py)
[^t-885-boot]: Read in the firmware. [The test](../../../tests/test_harmony_885_bootloader.py)
[^t-885-boot-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_885_bootloader.py)
