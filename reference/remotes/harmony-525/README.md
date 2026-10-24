# Harmony 525

An activity based infrared universal remote, its manual dated 2008, with a 1.5 inch monochrome screen
of 96 by 64 pixels, four keys beside the screen that the screen labels, a Glow key for the backlight and
four AAA cells.[^x-manual] It is from Logitech's classic platform, programmed by the old Harmony Remote
Software,[^x-manual] and it is architecture 9.[^s76] What the architecture's models share is stated once in
[the architecture folder](../../architectures/harmony-5xx/README.md); this folder states what is the 525's
own. Standing words and their meaning are in [the reference's README](../../README.md).

**What makes the 525 different to write to**: its application firmware sits in the 64 KiB erase block
directly below its configuration, and the firmware bounds an erase by the flash part and nothing finer,
so a wrong address reaches the firmware rather than a refusal.[^s267] It also has no route to its own
working memory over USB,[^s137] keeps its unit identity in EEPROM rather than in program flash,[^s268] and
loses its application when safe mode is entered,[^s118] [firmware.md](firmware.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 22 | Harmony 525 | Harmony 520 | 9 | monochrome | no | 3.0 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 22 is measured in a remote's version block[^s76] and stated by its firmware's own
literals.[^s57] Skin 18 is the Harmony 520, the same remote under its other regional name: Logitech's
product table pairs the two,[^s136] and the forum table lists the 520 as `Eur#525`.[^x-forum] **The two
faces are not identical**: the 525 carries four teletext colour keys the 520 does not, by the forum
table's photographs,[^x-forum] which is why this folder and its drawing serve skin 22 alone. Nothing of a
skin 18 remote or configuration has been read.[^unchecked]

## Key numbers

| | value |
|---|---|
| architecture | 9, version block field 4 `0x90`[^s76] and stated in every configuration's base slot 1[^s76b] |
| USB product id | `0xC111`, its own,[^s76] [usb.md](usb.md) |
| `bcdDevice` | `0x0916`, protocol 9 and skin 22 in plain hex, not the later `1000 + skin` form[^s76][^s195] |
| version block | seven fields, not twelve[^s76] |
| firmware | 3.0,[^s76] safe mode image 2.0[^s118] |
| processor | `PIC18F4550` family, 32 KiB of program flash,[^s119] [hardware.md](hardware.md) |
| external flash | 512 KiB serial flash, id `FF:12`,[^s76] a 25F040 by concordance's table;[^x-concordance] the manual states "Memory Amount 512 KB"[^x-manual] |
| user configuration | flash `0x820000`, with its own pointers counting from `0x020000`[^s76] |
| application firmware | flash `0x810000`, **one 64 KiB erase block below the configuration**[^s76][^s269] |
| screen | 1.5 inch, 96 by 64, monochrome;[^x-manual] the configurations state the same raster[^s148] |
| keys | 50, all matrix buttons, all bound in its configurations,[^s89] counted on a unit[^s89b] |
| devices | **12 per Logitech's service,[^s136] 10 per Logitech's manual**,[^x-manual] an open disagreement, [features.md](features.md) |
| power | four AAA alkaline cells[^x-manual] |
| clock on screen | not checked; the manual mentions none[^unchecked] |
| long press | none[^t-long-press] |

## The files

| file | what it holds |
|---|---|
| [hardware.md](hardware.md) | processor, flash, EEPROM, power, transmitters, backlight, size |
| [keys.md](keys.md) | the fifty keys, the 8 by 8 scanner, the soft keys' candidate codes, the drawing |
| [display.md](display.md) | the panel, the raster, the one bit pictures and two bit glyphs, the status screens |
| [features.md](features.md) | Logitech's statement, the device limit disagreement, learning, delays, sequences |
| [behaviour.md](behaviour.md) | device mode, Glow and Deep Sleep, what it does on the cable, after a write and in safe mode |
| [memory.md](memory.md) | what is the 525's own, linking the architecture's map |
| [firmware.md](firmware.md) | 3.0 and the 2.0 safe mode image, where both are stored, safe mode and recovery |
| [usb.md](usb.md) | product id, version block, identity, what a host can and cannot read |
| [misc.md](misc.md) | everything else |

The architecture folder: [harmony-5xx](../../architectures/harmony-5xx/README.md).

## Not checked

* Whether a skin 18 remote differs from skin 22 in anything but the teletext keys and the
  region.[^unchecked]
* Which of the two device limits the remote or Logitech's software enforces.[^unchecked]
* Whether the screen shows a clock.[^unchecked]

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 525 user manual](https://www.manualslib.com/manual/454951/Logitech-Harmony-525.html)
[^s76]: Measured on a unit. [Section 76](../../../docs/findings.md#s76)
[^s267]: Read in the firmware. [Section 267](../../../docs/findings.md#s267)
[^s137]: Measured on a unit. [Section 137](../../../docs/findings.md#s137)
[^s268]: Measured on a unit. [Section 268](../../../docs/findings.md#s268)
[^s118]: Measured on a unit. [Section 118](../../../docs/findings.md#s118)
[^s57]: Read in the firmware. [Section 57](../../../docs/findings.md#s57)
[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
[^x-forum]: Stated by a third party. [The forum comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^unchecked]: Not checked.
[^s76b]: Measured in configurations. [Section 76](../../../docs/findings.md#s76)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^s119]: Read in the firmware. [Section 119](../../../docs/findings.md#s119)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s269]: Measured on a unit. [Section 269](../../../docs/findings.md#s269)
[^s148]: Measured in configurations. [Section 148](../../../docs/findings.md#s148)
[^s89]: Read in the firmware. [Section 89](../../../docs/findings.md#s89)
[^s89b]: Measured on a unit. [Section 89](../../../docs/findings.md#s89)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
