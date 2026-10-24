# Harmony One

An activity based infrared universal remote, its manual dated 2007, with a 2.2 inch colour **touch**
screen above the keypad, a rechargeable lithium ion cell and a charging station. It is the only model on
its platform, which Logitech's own client calls architecture 12 and codename Gin. What follows from that
platform, its memory, firmware and USB commands, is in
[the platform's folder](../../architectures/harmony-one/README.md), and this folder is what a person meets
holding the remote.

The One is the model most of this project's format work was first measured on, and the first remote this
project wrote to, findings section 222. It differs from the Harmony 600, 650 and 700 in the ways that
matter most to a reader of the files: it runs its application and its configuration **in place** out of
memory mapped parallel flash, where those three copy from serial flash; its screen is touch, so screen
commands are reached through a hit map rather than through keys; it **shows a clock**; and it clicks
before every command touched on the screen. Standing words and their meaning are in
[the reference's README](../../README.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 54 | Harmony One | Harmony One EMEA | 12 | colour | yes | 3.4.0 |
| 59 | Harmony One EMEA | Harmony One | 12 | colour | yes | 3.4.0 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 54 is **confirmed** from a live remote's version block and `bcdDevice`, `0x1054`, measured, sections
57 and 113, and `reference/models.md`. Skin 59 is **Logitech's service**, the European model, section 131.
**Which skin a configuration carries is per configuration and not per unit**: configurations compiled for
the same remote carry 59 or 54 depending on the compile, read from configurations, sections 81 and 131.
What makes a compile choose one or the other is **not checked**.

## Key numbers

| | value | standing and source |
|---|---|---|
| architecture | 12, codename Gin, the only model on it | measured, version block field 4, sections 57 and 87; Logitech's client, `reference/models.md` |
| USB product id | `0xC121`, its own | measured, `reference/usb-protocol/transport.md` |
| `bcdDevice` | `0x1054` | measured, `reference/usb-protocol/transport.md` |
| firmware | 3.4, byte identical to Logitech's 3.4 package | measured, sections 3 and 88 |
| hardware version | 0.5 | measured, version block field 1, `reference/usb-protocol/version-block.md` |
| screen | 2.2 inch, colour, capacitive touch; 176 by 220 pixels upright | Logitech's manual, "220 x 176 (QCIF+)", "64,000 Color", "Capacitive"; the raster read from configurations, section 54 |
| keys | 44 on the drawing, 40 keypad keys and 4 touch keys; 32 named against a scan | the drawing, `reference/button-maps.md`; the count has **no cross check**, [keys.md](keys.md) |
| devices | 15 | Logitech's manual, Logitech's service and the forum table agree |
| power | rechargeable lithium ion, charged on a charging station | Logitech's manual |
| external flash | 4 MiB parallel NOR, Atmel AT49BV322A, id `1F:C8`, memory mapped | measured, section 221; Logitech's manual, "Memory Amount 4MB" |
| user configuration | from `0x040000`; writes stop at `0x3D0000`, where a stored copy of the application sits | measured, section 88; `WRITABLE_CEILING` in `packages/usb/src/rails.ts` |
| clock on screen | **yes**, small, day and twelve hour time, set from the remote's Options | Logitech's manual, "Setting the date and time"; seen at the bench, section 242. The only bench model that shows one, `CLAUDE.md` |
| long press | none | Logitech's service, `reference/capabilities.md` |

## The files

| file | what it holds |
|---|---|
| [hardware.md](hardware.md) | processor, flash, the lithium cell and the gauge, the beeper, the light sensor, the keypad lines |
| [keys.md](keys.md) | the keypad, the touch codes, the drawing, the two arrow pairs |
| [display.md](display.md) | the touch panel and its hit map, the screen grid, the clock, status screens |
| [features.md](features.md) | Logitech's statement, device mode, sequences, delays, favourites |
| [behaviour.md](behaviour.md) | the click before every screen command and the held touch, USB mode, writes and restarts |
| [memory.md](memory.md) | a pointer to the platform's memory page |
| [firmware.md](firmware.md) | the versions of this model, how to enter safe mode; the images are the platform's |
| [usb.md](usb.md) | product id and version block; the commands and write standing are the platform's |
| [misc.md](misc.md) | everything else |

## Not checked

* Whether a skin 59 unit differs from skin 54 in anything but the region.
* What makes a compile carry skin 54 or 59.
* Any firmware for this model other than 3.4.
