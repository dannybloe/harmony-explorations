# Harmony 525

An activity based infrared universal remote, its manual dated 2008, with a 1.5 inch monochrome screen
of 96 by 64 pixels, four keys beside the screen that the screen labels, a Glow key for the backlight and
four AAA cells. It is from Logitech's classic platform, programmed by the old Harmony Remote Software,
and it is architecture 9, which this project reads and writes. What the architecture's models share is
stated once in [the architecture folder](../../architectures/harmony-5xx/README.md); this folder states
what is the 525's own. Standing words and their meaning are in [the reference's README](../README.md).

The 525 differs from every other remote this project writes to in the way that matters most to a writer:
**its application firmware sits in the 64 KiB erase block directly below its configuration, and the
firmware bounds an erase by the flash part and nothing finer**, so a wrong address reaches the firmware
rather than a refusal, section 267. It also has no route to its own memory over USB, keeps its unit
identity in EEPROM rather than in program flash, and loses its application when safe mode is entered,
[firmware.md](firmware.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 22 | Harmony 525 | Harmony 520 | 9 | monochrome | no | 3.0 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 22 is **confirmed** from a live remote's version block, measured, section 76, and from firmware
literals, `reference/models.md`. Skin 18 is the Harmony 520, the same remote under its other regional
name, `MODELS_BY_SKIN` and the forum table's `Eur#525`, `reference/capabilities.md`. **The two faces are
not identical**: the 525 carries four teletext colour keys the 520 does not, third party, the forum
table's photographs, `reference/capabilities.md`, which is why this folder and its drawing serve skin 22
alone. No skin 18 unit or configuration has been read.

## Key numbers

| | value | standing and source |
|---|---|---|
| architecture | 9 | measured, version block field 4 `0x90`, section 76; stated in every configuration's base slot 1 |
| USB product id | `0xC111`, its own | measured, section 76; [usb.md](usb.md) |
| `bcdDevice` | `0x0916`, protocol 9 and skin 22 in plain hex, not the later `1000 + skin` form | measured, sections 76 and 195 |
| version block | seven fields, not twelve | measured, section 76 |
| firmware | 3.0, safe mode image 2.0 | measured, sections 76 and 118 |
| processor | `PIC18F4550` family, 32 KiB of program flash | read in the firmware and concordance, `docs/memory-map-525.md`; [hardware.md](hardware.md) |
| external flash | 512 KiB serial flash, id `FF:12`, a 25F040 by concordance's table | measured, sections 76 and 268; Logitech's manual, "Memory Amount 512 KB" |
| user configuration | flash `0x820000`, with its own pointers counting from `0x020000` | measured, section 76 |
| application firmware | flash `0x810000`, **one 64 KiB erase block below the configuration** | measured, sections 76 and 269 |
| screen | 1.5 inch, 96 by 64, monochrome | Logitech's manual; the raster also read from configurations, section 148 |
| keys | 50, all matrix buttons, all bound in its configurations | read in the firmware and configurations, section 89; counted on a unit, section 89 |
| devices | **12 per Logitech's service, 10 per Logitech's manual** | open disagreement, [features.md](features.md) |
| power | four AAA alkaline cells | Logitech's manual |
| clock on screen | **not checked**. The manual mentions none, and `CLAUDE.md` names the Harmony One as the only bench model whose screen shows the time | |
| long press | none | Logitech's service, `reference/capabilities.md` |

## The files

| file | what it holds |
|---|---|
| [hardware.md](hardware.md) | processor, flash, EEPROM, power, transmitters, backlight, size |
| [keys.md](keys.md) | the fifty keys, the 8 by 8 scanner, the soft keys' candidate codes, the drawing |
| [display.md](display.md) | the panel, the raster, the one bit pictures and two bit glyphs, the status screens |
| [features.md](features.md) | Logitech's statement, the device limit disagreement, learning, delays, sequences |
| [behaviour.md](behaviour.md) | device mode, Glow and Deep Sleep, what was seen on the cable, after a write and in safe mode |
| [memory.md](memory.md) | what is the 525's own, linking `docs/memory-map-525.md` and the architecture's map |
| [firmware.md](firmware.md) | 3.0 and the 2.0 safe mode image, where both are stored, safe mode and recovery |
| [usb.md](usb.md) | product id, version block, address windows, commands, write standing |
| [misc.md](misc.md) | everything else |

The architecture folder: [harmony-5xx](../../architectures/harmony-5xx/README.md).

## Not checked

* Whether a skin 18 unit differs from skin 22 in anything but the teletext keys and the region.
* Which of the two device limits the remote or Logitech's software enforces.
* Whether the screen shows a clock.
