# Harmony 600

An activity based infrared universal remote, its manual dated 2009, with a 1.5 inch **monochrome** screen above the
keypad, four keys flanking the screen and three below it, and no touch panel. It is one of three
models on the same platform, the Harmony 600, 650 and 700, which Logitech's own client calls
architecture 14. What the three share is stated once in
[the architecture folder](../../architectures/harmony-600-650-700/README.md); this folder states what is
the 600's own.

The 600 is the **monochrome** sibling of the Harmony 650 and 700. The three share one face, and the 600's
drawing is the one the other two take by reference. It is also the model this project read architecture 14 on first: its firmware was the
first of the architecture read whole off a remote, section 23, and its button map is the measured one the
other two carry over, `reference/button-maps.md`. Standing words and their meaning are in
[the reference's README](../../README.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 71 | Harmony 600 | Harmony 600 EMEA | 14 | monochrome | no | 0.2 |
| 73 | Harmony 600 EMEA | Harmony 600 | 14 | monochrome | no | 0.2 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 71 is **confirmed** from a live remote's `bcdDevice`, `0x1071`, measured, `docs/usb-protocol.md`
section 1 and findings section 19, and `reference/models.md` marks it confirmed on the remote. Skin 73 is
**Logitech's service**, `ProductsManager/GetAllProducts`, the European model, section 131. Logitech's
compiles for skins 71 and 73 share one picture look, the monochrome one, section 330.

**The model number the remote reports is the firmware's own constant, and a configuration may state the
other one.** The 0.2 build reports 71 in its version reply, at `0x11964`, and `0x1071` in its USB device
descriptor, where the Harmony 650's 0.2 build reports 72 and `0x1072`; that is the one difference in
meaning between the two builds, read in the firmware, section 392. Logitech's two compiles for this model
read here state 71 in one and 73 in the other, base slot 1, section 318, and a remote reporting 71 has run
a Logitech compile stating 73, measured, section 387. The 0.2 build's section seeker is never asked for
base slot 1, so the remote does not fetch the number that way; a read bypassing the seeker is not ruled
out, section 392. **A configuration of this project's states the number the remote reports**, decision 23
in `docs/decisions.md`: with 71 the 600 showed "Turning system off" briefly after a boot where no run of a
file stating 73 reported it, one sighting, seen at the bench, section 392, which does not prove the number
is the cause.

## Key numbers

| | value | standing and source |
|---|---|---|
| architecture | 14 | measured, version block field 4, section 57; read in the firmware |
| USB product id | `0xC122`, shared with the 650 and 700 | measured, `docs/usb-protocol.md` section 1; [usb.md](usb.md) |
| `bcdDevice` | `0x1071` | measured, `docs/usb-protocol.md` section 1 |
| firmware | 0.2, application 70336 bytes, entry `0x1A26E` | measured, read off a unit and verified by its own checksum, section 23 |
| hardware version | 1.1 | measured, version block, sections 281 and 302 |
| screen | 1.5 inch, 128 by 128, **monochrome** | Logitech's manual, Product Specification; monochrome also seen at the bench, `reference/capabilities.md`, and Logitech's service |
| keys | 54 scan codes | read from configurations, section 17; a hardware census per matrix column of 14, 14, 13 and 13, section 48 |
| devices | 5 | Logitech's manual and Logitech's service agree, [features.md](features.md); the remote **runs a sixth**, its codes sent, measured, section 390 |
| model number reported | 71 | read in the firmware, the version reply, section 392; measured, version block and `bcdDevice`, sections 19 and 302 |
| state variables on the cable | **live**, from `0xE10` on build 0.2, the clock ticking between two reads | measured, sections 303 and 387 |
| power | AA batteries, no charger | Logitech's manual, "Power Source AA batteries" |
| external flash | 2 MiB SPI, EON F16, id `15:1C` | measured, section 88; Logitech's manual, "Memory Amount 2MB" |
| user configuration | external `0x030000` | measured, `docs/memory-map-600.md` |
| clock on screen | **none** | seen at the bench, 4 October 2026, `reference/how-a-harmony-works.md` |
| long press | none | Logitech's service, `reference/capabilities.md` |

## The files

| file | what it holds |
|---|---|
| [hardware.md](hardware.md) | processor, flash, battery, transmitters, backlight, size, the tilt sensor |
| [keys.md](keys.md) | every key, its measured scan code, the drawing the 650 and 700 borrow |
| [display.md](display.md) | the monochrome panel and the greys it shows, the raster, what the screen shows and does not show |
| [features.md](features.md) | device limit, activities, favourites, help, delays, settings |
| [behaviour.md](behaviour.md) | device mode, Help, what a saved delay does at start, the Off screen, six devices |
| [memory.md](memory.md) | where the 600 differs from the architecture's map |
| [firmware.md](firmware.md) | 0.2, the images in the lab, safe mode |
| [usb.md](usb.md) | product id, `bcdDevice`, commands answered, write standing |
| [misc.md](misc.md) | everything else |

The architecture folder: [harmony-600-650-700](../../architectures/harmony-600-650-700/README.md).

## Not checked

* Whether a skin 73 unit differs from skin 71 in anything but the region and its keypad printing.
* Any firmware for this model other than 0.2: Logitech's version list names 0.3 and no image of it is held,
  [firmware.md](firmware.md). This said "no package of it is known"<!--superseded--> until 15 October 2026.
* Whether the remote counts devices at all: it ran six where Logitech states five, section 390.
