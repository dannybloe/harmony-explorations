# Harmony 300

An infrared universal remote with **no screen**: a Watch TV key, four device keys printed TV, Cable/Sat,
DVD and VCR/Aux, a power key, four favourite channel keys and an ordinary keypad. It is one of two models on
Logitech's file based platform, architecture 16, with the Harmony 350; what the two share is stated once in
[the architecture folder](../../architectures/harmony-300-350/README.md), and this folder states what is
the 300's own. **This library never opens it with `openHarmony` and never writes to it**; its configuration
is read as a file, read only. Standing words and their meaning are in [the reference's README](../README.md).

The 300 is the 350 with **half the devices and no long press**: the same moulding, the same firmware, four
device keys that each hold one device rather than two.

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 78 | Harmony 300, no record |  | 16, the folder's | no record | no record |  |
| 79 | Harmony 300 EMEA, no record |  | 16, the folder's | no record | no record |  |

Generated from `MODELS_BY_SKIN` and `SKINS_WITHOUT_A_MODEL_RECORD` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skins 78 and 79 are **Logitech's service**, the Harmony 300 and its European model, sections 131 and 196;
`SKINS_WITHOUT_A_MODEL_RECORD` in `packages/usb/src/models.ts` names both and gives neither a record,
[the architecture's README](../../architectures/harmony-300-350/README.md) says why. **A unit reports skin
79 in its own `/sys/sysinfo` and its configuration, and 78 in its `bcdDevice`**: the descriptor names the
family's base skin and the remote its own regional variant, measured, sections 195 and 264. What decides
78 or 79 on a unit is **not checked**.

## Key numbers

| | value | standing and source |
|---|---|---|
| architecture | 16 | measured, section 264 |
| USB product id | `0xC124`, shared with the Harmony 350 | measured, section 195 |
| `bcdDevice` | `0x1078` | measured, section 195 |
| firmware | 1.4, the image the 350 shares | Logitech's service, section 196 |
| screen | **none** | Logitech's service |
| keys | 55, the 350's moulding with different printing; **no scan code known** | `packages/silhouettes/src/models/h300.ts` and its test |
| devices | **4**, one per device key | Logitech's service; every configuration holds four infrared groups, measured, section 264 |
| activities | no `Activities` capability; at most one, a power on shortcut | Logitech's service; a fill test, `docs/how-a-harmony-works.md`; [features.md](features.md) |
| favourite channels | 5 for skin 78, 4 for skin 79 | Logitech's service, `docs/predictions-arch16-harmony-300.md` and section 265 |
| long press | **none** | Logitech's service |
| power | two AA batteries | Logitech's manual |

## The files

| file | what it holds |
|---|---|
| [hardware.md](hardware.md) | what is known of the inside, which is the architecture's |
| [keys.md](keys.md) | the keys, how their printing differs from the 350's, the drawing |
| [display.md](display.md) | none |
| [features.md](features.md) | Logitech's statement, devices, the activity question, favourites |
| [behaviour.md](behaviour.md) | what the setup guide and the configurations say it does |
| [memory.md](memory.md) | the architecture's file table, and what is the 300's |
| [firmware.md](firmware.md) | the shared 1.4 image |
| [usb.md](usb.md) | product id, `bcdDevice` and the skin it misnames |
| [misc.md](misc.md) | everything else |

## Not checked

* Which key sends which scan code.
* What decides skin 78 or 79 on a unit.
