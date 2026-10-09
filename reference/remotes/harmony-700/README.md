# Harmony 700

An activity based infrared universal remote, its manual dated 2009, with a 1.5 inch colour screen above
the keypad, four keys flanking the screen and three below it, no touch panel, and **rechargeable** cells
charged over USB. It is one of three models on the same platform, the Harmony 600, 650 and 700, which
Logitech's own client calls architecture 14. What the three share is stated once in
[the architecture folder](../../architectures/harmony-600-650-700/README.md); this folder states what is
the 700's own.

The 700 is the **charging** sibling of the Harmony 650 and the colour sibling of the Harmony 600: the
same face, the same 128 by 128 raster, and NiMH cells charged through the USB socket. It is also the
model whose firmware this project read first, the 2.8 package, before any architecture 14 image had been
read off a remote, section 13. Standing words and their meaning are in [the reference's README](../README.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 66 | Harmony 700 | Harmony 700 EMEA | 14 | colour | no | 2.5.0 |
| 69 | Harmony 700 EMEA | Harmony 700 | 14 | colour | no | 2.5.0 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 66 is **confirmed** from two configurations a 700 owner published, `reference/models.md`, and from a
unit's version block, measured, section 295. Skin 69 is **Logitech's service**,
`ProductsManager/GetAllProducts`, the European model, section 131; no skin 69 unit or compile has been
read.

## Key numbers

| | value | standing and source |
|---|---|---|
| architecture | 14 | measured, version block, section 295; read in the firmware, section 13 |
| USB product id | `0xC122`, shared with the 600 and 650 | measured, section 281; [usb.md](usb.md) |
| `bcdDevice` | `0x1066` in the 2.8 image's descriptor | read in the firmware, `docs/usb-protocol.md` section 1; on a unit **not checked** |
| firmware | 2.8, application 76672 bytes, entry `0x1BB38`, Logitech's package; 2.5 and a 2.3 safe mode image also seen on a unit | read in the firmware and measured, sections 295 and 297; [firmware.md](firmware.md) |
| screen | 1.5 inch, 128 by 128, "65,000 Color" | Logitech's manual, Product Specification; raster also measured from configurations, section 129 |
| keys | 54 scan codes, the 600's face | read from configurations, section 17; a statement from the bench for the face |
| devices | 8 per Logitech's service, **6 per Logitech's manual** | open disagreement, [features.md](features.md) |
| power | rechargeable NiMH AA, charged through the USB socket with an AC adaptor | Logitech's manual |
| external flash | 2 MiB SPI, EON F16, id `15:1C` on a unit; the 2.8 package's header names `0x14:0x1C`, 1 MiB | measured, section 297; read in the package, section 295 |
| user configuration | external `0x030000` | measured, section 300 |
| clock on screen | **none** | seen at the bench, 4 October 2026, `docs/how-a-harmony-works.md` |
| long press | none | Logitech's service, `reference/capabilities.md` |

## The files

| file | what it holds |
|---|---|
| [hardware.md](hardware.md) | processor, flash, the rechargeable cells and the charger, backlight, size |
| [keys.md](keys.md) | every key, the 600's scan codes carried over, the drawing |
| [display.md](display.md) | the colour panel, the raster, mode 0's charging battery |
| [features.md](features.md) | device limit, activities, favourites, help, delays, settings |
| [behaviour.md](behaviour.md) | device mode, what a Harmony Desktop sync and a write do |
| [memory.md](memory.md) | where the 700 differs from the architecture's map, the staging region |
| [firmware.md](firmware.md) | 2.3, 2.5 and 2.8, the install from a staged image, recovery |
| [usb.md](usb.md) | product id, version block, commands answered, write standing |
| [misc.md](misc.md) | the published pair of configurations, and the rest |

The architecture folder: [harmony-600-650-700](../../architectures/harmony-600-650-700/README.md).

## Not checked

* Whether a skin 69 unit differs from skin 66 in anything but the region.
* Which of the two device limits the remote or Logitech's software enforces.
* The hardware version a 700 reports.
