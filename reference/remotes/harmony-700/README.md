# Harmony 700

An activity based infrared universal remote, its manual dated 2009, with a 1.5 inch colour screen above
the keypad, four keys flanking the screen and three below it, no touch panel, and **rechargeable** cells
charged over USB. It is one of three models on the same platform, the Harmony 600, 650 and 700, which
Logitech's own client calls architecture 14. What the three share is stated once in
[the architecture folder](../../architectures/harmony-600-650-700/README.md); this folder states what is
the 700's own.

The 700 is the **charging** sibling of the Harmony 650 and the colour sibling of the Harmony 600: the
same face, the same 128 by 128 raster, and NiMH cells charged through the USB socket. Like the other two
it **shows no clock**, [how a Harmony works](../../how-a-harmony-works.md). It is also the model whose
firmware this project read first, the 2.8 package, before any image of the architecture had been read
off a remote[^s13]. How evidence is marked is in [the reference's README](../../README.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 66 | Harmony 700 | Harmony 700 EMEA | 14 | colour | no | 2.5.0 |
| 69 | Harmony 700 EMEA | Harmony 700 | 14 | colour | no | 2.5.0 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 66 is carried by two configurations a 700's owner published[^s16] and reported in a unit's version
block[^s295]. Skin 69 is the European model in Logitech's product list[^s131]; no skin 69 remote or
compile has been read[^unchecked].

## Key numbers

| | value | evidence |
|---|---|---|
| architecture | 14 | [^s295], [^s13] |
| USB product id | `0xC122`, shared with the 600 and 650; [usb.md](usb.md) | [^s281] |
| `bcdDevice` | `0x1066` in the 2.8 image's descriptor, [the transport](../../usb-protocol/transport.md); on a remote not read | [^s19], [^unchecked] |
| firmware | 2.8, application 76672 bytes, entry `0x1BB38`, Logitech's package; 2.5 and a 2.3 safe mode image also seen; [firmware.md](firmware.md) | [^s297], [^s295] |
| screen | 1.5 inch, 128 by 128, "65,000 Color"; [display.md](display.md) | [^x-manual], [^s129] |
| keys | 54 scan codes, on the 600's face; [keys.md](keys.md) | [^s17] |
| devices | 8 by Logitech's service and the 2010 manual, 6 by the 2009 manual; the remote ran a seventh; [features.md](features.md) | [^t-product-table], [^x-manual-2010], [^x-manual], [^s386] |
| state variables over USB | live, variable `n` at data memory `0x900 + n` on build 2.8, the clock in variables 0 to 6 | [^s384], [^s386] |
| power | rechargeable NiMH AA, charged through the USB socket with an AC adaptor; [hardware.md](hardware.md) | [^x-manual] |
| external flash | 2 MiB SPI, EON F16, id `15:1C`; the 2.8 package's header names `0x14:0x1C`, 1 MiB | [^s297], [^s295b] |
| user configuration | external `0x030000` | [^s300] |
| long press | none | [^t-long-press] |

## The files

| file | what it holds |
|---|---|
| [hardware.md](hardware.md) | processor, flash, the rechargeable cells and the charger, backlight, size |
| [keys.md](keys.md) | every key, the 600's scan codes carried over, the drawing |
| [display.md](display.md) | the colour panel, the raster, the charging battery screens |
| [features.md](features.md) | device limit, activities, favourites, help, delays, settings |
| [behaviour.md](behaviour.md) | device mode, what a sync, a write and a firmware install do, the Off screen |
| [memory.md](memory.md) | where the 700 differs from the architecture's map, the staging region |
| [firmware.md](firmware.md) | 2.3, 2.5 and 2.8, the install from a staged image, recovery |
| [usb.md](usb.md) | product id, version block, what a 700 answers, write standing |
| [misc.md](misc.md) | the published pair's timestamps, and the rest |

The architecture folder: [harmony-600-650-700](../../architectures/harmony-600-650-700/README.md).

## Not checked

* Whether a skin 69 remote differs from skin 66 in anything but the region[^unchecked].
* Which device limit the remote or Logitech's software enforces: a 700 ran seven devices[^s386], and an
  eighth has not been tried[^unchecked].
* The hardware version a 700 reports[^unchecked].

[^s13]: Read in the firmware. [Section 13](../../../docs/findings.md#s13)
[^s16]: Measured in configurations. [Section 16](../../../docs/findings.md#s16)
[^s295]: Measured on a unit. [Section 295](../../../docs/findings.md#s295)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^unchecked]: Not checked.
[^s281]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^s19]: Read in the firmware. [Section 19](../../../docs/findings.md#s19)
[^s297]: Measured on a unit. [Section 297](../../../docs/findings.md#s297)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 700 user manual, the 2009 edition](https://www.manualslib.com/manual/96454/Logitech-Harmony-700.html)
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s17]: Measured in configurations. [Section 17](../../../docs/findings.md#s17)
[^t-product-table]: Stated by Logitech, by their service. [The test](../../../tests/test_host_client.py)
[^x-manual-2010]: Stated by Logitech, in the manual. [The 2010 edition, in English](https://cdn-cx-images.dynamite.myharmony.com/usermanuals/harmony700-usermanual-en.pdf)
[^s386]: Measured on a unit. [Section 386](../../../docs/findings.md#s386)
[^s384]: Read in the firmware. [Section 384](../../../docs/findings.md#s384)
[^s295b]: Read in the firmware. [Section 295](../../../docs/findings.md#s295)
[^s300]: Measured on a unit. [Section 300](../../../docs/findings.md#s300)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
