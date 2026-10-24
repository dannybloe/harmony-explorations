# Harmony 5xx: the shared platform

The Harmony 5xx remotes are Logitech's classic generation of activity remotes with a small monochrome
screen: the 510, 515, 520, 525, 550, 555 and the Harmony for Xbox 360. Inside they are one design, a
small Microchip processor running the remote and a separate 512 KiB flash chip holding its configuration
and two stored copies of its firmware. This folder describes that design once, so that what the models
share is stated in one place and named as the platform's.

**Architecture 9** is the platform's number in concordance's table, in Logitech's own client and in this
project.[^x-concordance][^s197] `packages/usb/src/models.ts` places the seven models above on it,
`reference/models.md`. **One of them has been measured**: the Harmony 525, whose folder is
[harmony-525](../../remotes/harmony-525/README.md). So everything in this folder that is measured or read in
a firmware image is measured on a Harmony 525 or read in its image, and whether the other models share it
is not checked.[^unchecked]

| model | folder | what is known |
|---|---|---|
| Harmony 525 | [harmony-525](../../remotes/harmony-525/README.md) | measured on a unit and read in its firmware images |
| Harmony 520 | none | nothing measured. The 525 under its other regional name, without the teletext keys, `reference/capabilities.md` |
| Harmony 510, 515, 550, 555, Xbox 360 | none | nothing measured. `models.ts` and `reference/models.md` place them here; Logitech's protocol templates name skin 68, the Harmony 510, at architecture 9[^s197] |

Concordance's table lists a Harmony 522 here as well, which `models.ts` names without a
record.[^x-concordance]

## Skins

<!-- generated:skins -->
| skin | model | panel | max devices | favourite channel buttons | newest firmware the forum table knows |
|---|---|---|---|---|---|
| 18 | Harmony 520 | monochrome | 12 | none | 3.0 |
| 22 | Harmony 525 | monochrome | 12 | none | 3.0 |
| 36 | Harmony Xbox 360 | monochrome | 12 | none | 3.0.0 |
| 41 | Harmony 550 | monochrome | 15 | none | 3.0 |
| 48 | Harmony 555 | monochrome | 15 | none | 3.0 |
| 67 | Harmony 515 | monochrome | 5 | none | 3.4.0 |
| 68 | Harmony 510 | monochrome | 5 | none | 3.4.0 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 22 is measured in a remote's version block and in its firmware's literals.[^s76][^s57] Every other row
is Logitech's client table and the forum table's capability columns, `reference/capabilities.md`.

## Shared, in one table

Measured or read on a Harmony 525, per the opening paragraph.

| | value |
|---|---|
| processor | a `PIC18F4550` family part: 32 KiB program flash, 256 bytes EEPROM, 2048 bytes data memory.[^s119] Concordance names the `PIC18LF4550`[^x-concordance] |
| external flash | a 512 KiB serial part, id `FF:12`, at protocol addresses `0x800000` to `0x880000`, [memory.md](memory.md)[^s76][^s268] |
| execution | the application runs out of internal flash; external flash holds the application and the safe mode image as stored copies the bootloader installs from, [firmware.md](firmware.md)[^s76][^s118] |
| user configuration | flash `0x820000`; the container's own pointers count from `0x020000`[^s76] |
| container | `AHCM` and `MCHA`, marker `CMAH`, format `0x1400` (the same as architecture 14, so the format word does not identify an architecture), 20 pointer slots in the base layout with no insertions, architecture 9 in base slot 1, no key table after the marker[^s76b] |
| infrared | class 5 in every record: a code spelled from a dictionary of short pulse blocks, [infrared records](../../config-format/infrared-records.md)[^s82] |
| screen raster | 96 by 64, one bit a pixel[^s62][^s148] |
| keypad | 8 by 8 over one sense line, scan code `group * 8 + column`[^s89] |
| state variables the firmware owns | 0 to 12, where architectures 8, 12 and 14 own 0 to 17[^s284] |
| USB | product id `0xC111`, a seven field version block, `bcdDevice` as protocol and skin in plain hex, [usb.md](usb.md)[^s76] |
| the host protocol family | the HID command protocol: Logitech groups architectures 9, 12 and 14 as one legacy protocol, and every other architecture takes the file protocol[^s197] |
| Logitech's software | the classic Harmony Remote Software. Logitech's live service accepts a skin 22 remote and has it switched off, so it compiles no configuration for one[^s135][^s145] |

**What makes this architecture different to write to**, stated once here and in each file it bears on:
the application firmware's stored copy sits one 64 KiB erase block below the configuration, and the
firmware bounds an external flash erase by the part and nothing finer, so this library's rail is the only
thing between a wrong address and both firmware images.[^s267] [usb.md](usb.md) has the rails.

## The files

| file | what it holds |
|---|---|
| [memory.md](memory.md) | the address windows, the external flash layout, internal flash, the EEPROM, data memory, the constants in the code |
| [firmware.md](firmware.md) | the images and their load addresses, the bootloader's install byte, safe mode and the one way door, the erase hazard |
| [usb.md](usb.md) | the command set, what answers and what does not, the write lists and rails |
| [misc.md](misc.md) | the rest |

## Not checked

* Every model here but the Harmony 525: its flash size, its firmware, its face.[^unchecked]
* Whether a skin 18 configuration differs from a skin 22 one in anything but the teletext keys.[^unchecked]

[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s197]: Stated by Logitech. [Section 197](../../../docs/findings.md#s197)
[^unchecked]: Not checked.
[^s76]: Measured on a unit. [Section 76](../../../docs/findings.md#s76)
[^s57]: Read in the firmware. [Section 57](../../../docs/findings.md#s57)
[^s119]: Read in the firmware. [Section 119](../../../docs/findings.md#s119)
[^s268]: Measured on a unit. [Section 268](../../../docs/findings.md#s268)
[^s118]: Measured on a unit. [Section 118](../../../docs/findings.md#s118)
[^s76b]: Measured in configurations. [Section 76](../../../docs/findings.md#s76)
[^s82]: Read in the firmware. [Section 82](../../../docs/findings.md#s82)
[^s62]: Measured in configurations. [Section 62](../../../docs/findings.md#s62)
[^s148]: Measured in configurations. [Section 148](../../../docs/findings.md#s148)
[^s89]: Read in the firmware. [Section 89](../../../docs/findings.md#s89)
[^s284]: Read in the firmware. [Section 284](../../../docs/findings.md#s284)
[^s135]: Stated by Logitech, by their service. [Section 135](../../../docs/findings.md#s135)
[^s145]: Stated by Logitech, by their service. [Section 145](../../../docs/findings.md#s145)
[^s267]: Read in the firmware. [Section 267](../../../docs/findings.md#s267)
