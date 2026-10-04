# Harmony 650

An activity based infrared universal remote from 2010, with a 1.5 inch colour screen above the
keypad, four keys flanking the screen and three below it, and no touch panel. It is one of three
models on the same platform, the Harmony 600, 650 and 700, which Logitech's own client calls
architecture 14 and which this project reads, writes and composes for. What the three share is
stated once in [the architecture folder](../../architectures/harmony-600-650-700/README.md); this
folder states what is the 650's own.

The 650 is the **colour** sibling of the Harmony 600 and the **battery** sibling of the Harmony 700:
same face (Danny's statement), same 128 by 128 raster, the 700's colour, and AA cells where the 700
charges. Standing words and their meaning are in [the reference's README](../README.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 72 | Harmony 650 | Harmony 650 EMEA | 14 | colour | no | 0.2 |
| 74 | Harmony 650 EMEA | Harmony 650 | 14 | colour | no | 0.2 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 72 is **confirmed** from the 650's own safe mode container in the 0.4 package and from the bench
unit's version block, measured. Skin 74 is **Logitech's service**, `ProductsManager/GetAllProducts`,
section 131; no skin 74 unit or compile has been read, and the composer refuses it, section 330.

## On the bench

| unit | standing | source |
|---|---|---|
| one Harmony 650, skin 72, second hand | **a write target** since 27 September 2026, Danny's decision: it may be reprogrammed freely as the work needs. Its identity record is `h650` in the lab's `units/` | `CLAUDE.md`, findings section 281 |

It arrived programmed through MyHarmony on the second test account with the KPN set top box, the Denon
receiver and the LG television, section 281. Its later configurations add a PS3, Kodi and a Panasonic
plasma, the last through a MyHarmony sync, section 305, and this project has composed devices and
activities onto it. What it holds at any moment is in the lab's
`reads/` and not here.

## Key numbers

| | value | standing and source |
|---|---|---|
| architecture | 14 | measured, version block; read in the firmware, section 30 |
| USB product id | `0xC122`, shared with the 600 and 700 | measured, section 281; [usb.md](usb.md) |
| firmware on the bench unit | 0.2, hardware version 1.2 | measured, version block, lab `reads/20260927T0840Z-h650-programmed-config.json` |
| newest firmware published | 0.4 | the package in the lab, section 30 |
| screen | 1.5 inch, 128 by 128, 65,000 colours | Logitech's manual; raster also measured from configurations |
| keys | 54 scan codes, the 600's face | configurations, section 311; Danny's statement for the face |
| devices | 8 per Logitech's service, **5 per Logitech's manual** | open disagreement, [features.md](features.md) |
| power | AA alkaline cells, no charger | Logitech's manual |
| external flash | 2 MiB SPI, EON F16, id `15:1C` | measured, section 281 |
| user configuration | external `0x030000`, 907660 bytes as found | measured, section 281 |
| clock on screen | **none** | seen at the bench, 4 October 2026, `docs/how-a-harmony-works.md` |
| long press | none | Logitech's service, `reference/capabilities.md` |

## The files

| file | what it holds |
|---|---|
| [hardware.md](hardware.md) | processor, flash, battery, transmitters, backlight, size |
| [keys.md](keys.md) | every key, its scan code where measured, the drawing |
| [display.md](display.md) | the panel, the raster, what the screen shows and does not show |
| [features.md](features.md) | device limit, activities, favourites, help, sequences, settings |
| [behaviour.md](behaviour.md) | device mode, the tour, the assistant, what was seen at the bench |
| [memory.md](memory.md) | where this unit's bytes differ from the architecture's map |
| [firmware.md](firmware.md) | 0.2 on the unit, 0.4 published, the images in the lab, recovery |
| [usb.md](usb.md) | product id, version block, commands, write standing |
| [misc.md](misc.md) | everything else |

The architecture folder: [harmony-600-650-700](../../architectures/harmony-600-650-700/README.md).

## Not checked

* Whether a skin 74 unit differs from skin 72 in anything but the region. No unit, no compile.
* Which of the two device limits the remote or Logitech's software enforces.
