# Harmony 880 and 885: firmware

A Harmony 880 or 885 runs two programs that together fill its first 128 KiB of flash: a bootloader at the
bottom, which starts the remote and owns its interrupt vectors, and the application above it, which does
everything else and hands nothing back. One application build serves both models and says which one it is
in two bytes. This page says what each image is, where it loads, how its header differs from every later
Harmony's, and how a copy of one is obtained.

Read in two application images and two bootloaders, an 880's and an 885's of each, which other people
read off their remotes and published; no remote of this architecture has been measured. Where each image
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
read an image here returns one, and whether this platform's Boot mode does the work later platforms split
into a bootloader and safe mode is not known.[^s116]

## The header is not the later Harmonys'

Every application image here opens with a header, and the field order differs from the Harmony One's and
the Harmony 600, 650 and 700's, so a disassembler or a parser taking those as the template reads the wrong
fields.[^s114]

| offset | the Harmony One, 600, 650 and 700 | the Harmony 880 and 885 |
|---|---|---|
| 0 | `u16` checksum | `u16` checksum |
| 2 | `0xFFFF` | `0xFF00` |
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

## Routines read and where

| routine | where | source |
|---|---|---|
| the version block's five constants, `RETLW` in the order field 0, field 4 low, field 5, field 6, field 4 high | `0x11C46` in both applications | [^s114] |
| the keypad scan, `scan = (line - 1) * 4 + input`, after a caller that reads `PORTB` | `0x08C26` in both applications, `0x04D06` in the 880's bootloader and `0x04D14` in the 885's | [^s144] |
| the USB device descriptor | `0x1A630` in the applications | [^s114] |

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
* How a remote of this architecture is recovered, and whether it has a safe mode at all.[^unchecked]

[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s116]: Read in the firmware. [Section 116](../../../docs/findings.md#s116)
[^s7]: Stated by Logitech. [Section 7](../../../docs/findings.md#s7)
[^s144]: Read in the firmware. [Section 144](../../../docs/findings.md#s144)
[^unchecked]: Not checked.
