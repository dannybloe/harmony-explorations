# Harmony 5xx: the shared platform

**Architecture 9** in concordance's table, in Logitech's own client and in this project. The models
`packages/usb/src/models.ts` places here are the Harmony 510, 515, 520, 525, 550, 555 and the Xbox 360
remote, all of the classic EasyZapper generation, `reference/models.md`. **One of them has been read**:
the Harmony 525, whose folder is [harmony-525](../../remotes/harmony-525/README.md). So everything in
this folder that is measured or read in a firmware image is measured on a Harmony 525 or read in its
image, and whether the other models share it is **not checked**. The folder exists so that what is the
architecture's, its memory windows, its firmware arrangement and its write rails, is stated once and
named as such.

| model | folder | what has been read |
|---|---|---|
| Harmony 525 | [harmony-525](../../remotes/harmony-525/README.md) | a unit: its identity, configuration, whole internal flash, both external firmware images and its configuration region |
| Harmony 520 | none | nothing. The 525 under its other regional name, without the teletext keys, `reference/capabilities.md` |
| Harmony 510, 515, 550, 555, Xbox 360 | none | nothing. `models.ts` and `reference/models.md` place them here; Logitech's client calls skin 68 the Harmony 510 at architecture 9, section 197 |

Concordance's table lists a Harmony 522 here as well, which `models.ts` names without a record,
`reference/models.md`.

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

Skin 22 is confirmed by a live remote and firmware literals, `reference/models.md`; every other row is
Logitech's client table and the forum table's capability columns, third party, `reference/capabilities.md`.

## Shared, in one table

Measured or read on a Harmony 525, per the paragraph above.

| | value | standing and source |
|---|---|---|
| processor | a `PIC18F4550` family part, 32 KiB program flash, 256 bytes EEPROM, 2048 bytes data memory | read in the firmware, section 119; concordance names the `PIC18LF4550`, section 267 |
| external flash | 512 KiB serial, id `FF:12`, at protocol addresses `0x800000` to `0x880000` | measured, sections 76 and 268; [memory.md](memory.md) |
| execution | the application runs out of internal flash; external flash holds the application and the safe mode image as stored copies the bootloader installs from | measured, sections 76 and 118 |
| user configuration | flash `0x820000`; the container's own pointers count from `0x020000` | measured, section 76 |
| container | `AHCM` and `MCHA`, marker `CMAH`, format `0x1400`, 20 pointer slots, architecture 9 in base slot 1, no key table after the marker | measured, section 76 and `docs/memory-map-525.md` |
| infrared | class 5 in every record: a code spelled from a dictionary of short pulse blocks | read from configurations and in the firmware, section 82 |
| screen raster | 96 by 64, one bit a pixel | read from configurations, sections 62 and 148 |
| keypad | 8 by 8 over one sense line, scan code `group * 8 + column` | read in the firmware, section 89 |
| state variables the firmware owns | 0 to 12, where arch 8, 12 and 14 own 0 to 17 | read in the firmware and configurations, section 284 |
| USB | product id `0xC111`, a seven field version block, `bcdDevice` as protocol and skin in plain hex | measured, section 76; [usb.md](usb.md) |
| the host protocol family | the HID command protocol: Logitech's client groups architectures 9, 12 and 14 as one legacy protocol, and every other architecture takes the file protocol | Logitech's client, sections 197 and 198 |
| Logitech's software | the classic Harmony Remote Software; Harmony Desktop does not recognise skin 22, and the live service has it switched off | Logitech's manual; Logitech's client and service, sections 135 and 145 |

**What makes this architecture different to write to**, stated once here and in each file it bears on:
the application firmware's stored copy sits one 64 KiB erase block below the configuration, and the
firmware bounds an external flash erase by the part and nothing finer, so this library's rail is the only
thing between a wrong address and both firmware images, section 267. [usb.md](usb.md) has the rails.

## The files

| file | what it holds |
|---|---|
| [memory.md](memory.md) | the address windows, the external flash layout, the constants in the code |
| [firmware.md](firmware.md) | the images, the bootloader's install byte, safe mode and the one way door |
| [usb.md](usb.md) | the command set, what answers and what does not, the write lists and rails |
| [misc.md](misc.md) | the rest |

## Not checked

* Every model here but the Harmony 525: its flash size, its firmware, its face.
* Whether a skin 18 configuration differs from a skin 22 one in anything but the teletext keys.
