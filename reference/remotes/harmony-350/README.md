# Harmony 350

An infrared universal remote with **no screen**: a Watch TV key that starts its one activity, four device
keys that each select one device with a short press and a second with a two second press, five favourite
channel keys, a power key, and an ordinary keypad. It is one of two models on Logitech's file based
platform, architecture 16, with the Harmony 300; what the two share is stated once in
[the architecture folder](../../architectures/harmony-300-350/README.md), and this folder states what is
the 350's own. **This library never opens it with `openHarmony` and never writes to it**; its
configuration is read as a file, read only. Standing words and their meaning are in
[the reference's README](../README.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 104 | no record in models.ts |  | 16, the folder's | no record | no record |  |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 104 is **confirmed** on a unit by `bcdDevice` `0x1104` and by its own `/sys/sysinfo`, measured,
sections 195 and 262, and it is Logitech's service's Harmony 350, with no regional twin. It has no record in
`packages/usb/src/models.ts`, [the architecture's README](../../architectures/harmony-300-350/README.md)
says why; it does appear in `SKINS_WITH_A_LONG_PRESS`.

## Key numbers

| | value | standing and source |
|---|---|---|
| architecture | 16 | measured, section 262 |
| USB product id | `0xC124`, shared with the Harmony 300 | measured, sections 193 and 195 |
| `bcdDevice` | `0x1104` | measured, section 195 |
| firmware | 1.4, the image the 300 shares | Logitech's service, section 196 |
| screen | **none** | Logitech's service; Logitech's manual |
| keys | 55, from Logitech's manual's vector drawing; **no scan code known** | `packages/silhouettes/src/models/h350.ts` and its test |
| devices | **8**: "Control up to eight devices individually using these four Device buttons, each with a short press or a longer two second press" | Logitech's manual; Logitech's service; every configuration holds eight infrared groups, measured, section 263 |
| activities | **1**, the Watch TV activity | Logitech's service, `MaxActivities` 1; Logitech's manual |
| favourite channels | **5** | Logitech's manual, "up to five Favorite Channels"; Logitech's service; a configuration given five holds five, measured, section 263 |
| long press | **yes**, on the device keys | Logitech's service, `LongPressAction`; Logitech's manual |
| power | two AA batteries | Logitech's manual |
| clock on screen | no screen | |

## The files

| file | what it holds |
|---|---|
| [hardware.md](hardware.md) | what is known of the inside, which is the architecture's |
| [keys.md](keys.md) | the keys, their printing, the drawing |
| [display.md](display.md) | none, and the lit device keys |
| [features.md](features.md) | Logitech's statement, devices, the one activity, favourites |
| [behaviour.md](behaviour.md) | what the manual and the configurations say it does |
| [memory.md](memory.md) | the architecture's file table, and what is the 350's |
| [firmware.md](firmware.md) | the shared 1.4 image |
| [usb.md](usb.md) | product id, `bcdDevice`, what has been read |
| [misc.md](misc.md) | everything else |

## Not checked

* Which key sends which scan code.
* The firmware version a unit runs, beyond the product string's 1.4.0.
