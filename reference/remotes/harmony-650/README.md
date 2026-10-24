# Harmony 650

An activity based infrared universal remote from 2010, with a 1.5 inch colour screen above the
keypad, four keys flanking the screen and three below it, and no touch panel[^x-manual]. It is one of
three models on the same platform, the Harmony 600, 650 and 700, which Logitech's own client calls
architecture 14[^s30]. What the three share is stated once in
[the architecture folder](../../architectures/harmony-600-650-700/README.md); this folder states what is
the 650's own.

The 650 is the **colour** sibling of the Harmony 600 and the **battery** sibling of the Harmony 700:
the 600's face[^unchecked], the same 128 by 128 raster[^s129], the 700's colour, and AA cells where the
700 charges[^x-manual]. How a fact's footnote names its evidence is in
[the reference's README](../../README.md#how-to-read-a-footnote).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 72 | Harmony 650 | Harmony 650 EMEA | 14 | colour | no | 0.2 |
| 74 | Harmony 650 EMEA | Harmony 650 | 14 | colour | no | 0.2 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 72 is the 650's own. Its 0.2 firmware reports it as a constant of its own in the version
reply[^s392], the safe mode configuration in Logitech's 0.4 package carries it[^s30], and a 650 reports
it in its version block over USB[^s281]. Skin 74 is the Harmony 650 EMEA, which Logitech's service
lists[^s131]; nothing compiled for skin 74 and no skin 74 remote has been read[^unchecked].

## Key numbers

| | value | evidence |
|---|---|---|
| architecture | 14 | [^s57], [^s30] |
| USB product id | `0xC122`, shared with the 600 and 700, [usb.md](usb.md) | [^s281] |
| firmware | 0.2 on a 650 read over USB; 0.4 the newest Logitech published, [firmware.md](firmware.md) | [^s281], [^s30] |
| screen | 1.5 inch, 128 by 128, 65,000 colours | [^x-manual]; the raster also [^s129] |
| keys | 54 scan codes on the Harmony 600's face, [keys.md](keys.md) | [^s311]; the face [^unchecked] |
| devices | 8 per Logitech's service, **5 per Logitech's manual**; Logitech compiles eight for a 650, [features.md](features.md) | [^s136], [^x-manual], [^s331] |
| power | AA alkaline cells, no charger | [^x-manual] |
| memory | the architecture's: a 2 MiB SPI flash chip beside the processor, the configuration from `0x030000`, [memory.md](memory.md) | [^s281] |
| clock on screen | **none** | [^x-manual], [^s430] |
| long press | none | [^s340] |

## The files

| file | what it holds |
|---|---|
| [hardware.md](hardware.md) | processor, flash, battery, transmitters, backlight, size |
| [keys.md](keys.md) | every key, its scan code where measured, the drawing |
| [display.md](display.md) | the panel, the raster, what the screen shows and does not show |
| [features.md](features.md) | device limit, activities, favourites, help, sequences, settings |
| [behaviour.md](behaviour.md) | device mode, starting and switching activities, what follows a restart |
| [memory.md](memory.md) | where a 650's bytes differ from the architecture's map |
| [firmware.md](firmware.md) | the builds, how the 650's 0.2 differs from the 600's, recovery |
| [usb.md](usb.md) | what the 650 states about itself on the cable |
| [misc.md](misc.md) | everything else |

The architecture folder: [harmony-600-650-700](../../architectures/harmony-600-650-700/README.md).

## Not checked

* Whether a skin 74 remote differs from skin 72 in anything but the region[^unchecked].
* Which device limit, if any, the remote enforces, [features.md](features.md)[^unchecked].

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 650 user manual](https://www.logitech.com/assets/44635/3/harmony650-user-guide.pdf)
[^s30]: Read in the firmware. [Section 30](../../../docs/findings.md#s30)
[^unchecked]: Not checked.
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s392]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^s281]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^s57]: Read in the firmware. [Section 57](../../../docs/findings.md#s57)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
[^s331]: Measured in configurations. [Section 331](../../../docs/findings.md#s331)
[^s430]: Measured in configurations. [Section 430](../../../docs/findings.md#s430)
[^s340]: Read in the firmware. [Section 340](../../../docs/findings.md#s340)
