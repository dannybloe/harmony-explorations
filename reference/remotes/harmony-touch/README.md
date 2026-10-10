# Harmony Touch

An activity based infrared universal remote, its manual dated 2012, with a touch screen in the upper half of
the face, a keypad below it, a rechargeable lithium ion cell and a charging dock. It belongs to
Logitech's later generation: its firmware is a Linux image, it is programmed through MyHarmony, and it
**fetches its own configuration** through the desktop client rather than having one compiled and written to
it, section 203. Standing words and their meaning are in [the reference's README](../README.md).

**This library reads almost nothing of it and writes nothing to it.** `openHarmony` refuses it, because it
speaks the file protocol rather than the command protocol, section 193. The read only file transport has
opened two files on it, its identity and a radio query, and nothing else answers without the named door,
section 201. Its configuration is not reachable as a file, section 200, and Logitech's service does not
compile one for it, section 202. So the facts below are mostly Logitech's, from the manual, the service and
the client, and they are marked so.

**Its architecture is disputed.** The remote reports **17** in its own `/sys/sysinfo`, measured, section
200, and concordance reports 17 too, section 197; **Logitech's own protocol templates say 18** for skin 99,
all 22 of them, Logitech's client, section 197. Both readings are right about what they read, nothing in the
client checks the field against the device, and which number a writer would need is not established. This
reference takes the remote's word and states both, as `reference/models.md` does.

There is no architecture folder: neither number has another model read here, and Logitech's map puts the
Touch's skin at 18 beside the Ultimate and the Elite, and at 17 nowhere, section 197; [misc.md](misc.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 99 | no record in models.ts |  | 17, the folder's | no record | no record |  |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 99 is **measured**, from the remote's own `/sys/sysinfo` and its `bcdDevice` `0x1099`, sections 195 and
200, and it is Logitech's product table's Harmony Touch, codename Juniper in the client's templates,
section 197. `packages/usb/src/models.ts` has no record for it, deliberately: a record states what a
model's hardware can do and nothing here has read those fields out of its firmware,
`reference/capabilities.md`. A regional twin is **not checked**.

## Key numbers

| | value | standing and source |
|---|---|---|
| architecture | **17 by its own report, 18 by Logitech's specification** | measured, section 200; Logitech's client, section 197 |
| USB product id | `0xC12B` | measured by enumeration, section 193; concordance's table names it the same, `reference/models.md` |
| `bcdDevice` | `0x1099`, BCD of `1000 + 99` | measured, section 195 |
| product string | `Logitech Harmony Remote`, with no firmware version in it | measured, section 193 and `reference/models.md` |
| protocol | the file protocol: a path opened, read and closed | Logitech's client, section 198; measured, section 200 |
| firmware | 4.15.330, the production image Logitech's update service serves for skin 99, a Linux image shared with five later models | measured, section 200; Logitech's service, section 196 |
| screen | an "LCD touch screen"; 240 by 320 by the size of every screen capture in the manual | Logitech's manual; `touch.ts` |
| keys | 29 on the drawing: 27 moulded keys and two marks above the screen, Home and Favorites | `packages/silhouettes/src/models/touch.ts` |
| devices | up to 15 | Logitech's manual |
| favourite channels | up to 50 | Logitech's manual |
| long press | yes | Logitech's service, `SKINS_WITH_A_LONG_PRESS` |
| power | an internal, non replaceable lithium ion cell, charged in a dock | Logitech's manual |
| clock | the remote keeps the time, set from the computer at every sync, in 12 or 24 hour form | Logitech's manual, "Remote Settings". **Not seen at the bench** |
| configuration | **not reachable as a file** under any name known here | measured, section 200 |

## The files

| file | what it holds |
|---|---|
| [hardware.md](hardware.md) | the cell and dock, the radio identity, what `/sys/sysinfo` reports about the hardware |
| [keys.md](keys.md) | the drawing, the two marks above the screen, no scan codes |
| [display.md](display.md) | the touch screen, gestures, what the manual shows |
| [features.md](features.md) | Logitech's statements: devices, favourites, long press, provisioning instead of a compile |
| [behaviour.md](behaviour.md) | device mode, Off, syncing back, and what was seen on the cable |
| [memory.md](memory.md) | what is known of its filesystem, which is little |
| [firmware.md](firmware.md) | the Linux image, the factory image, the factory reset route |
| [usb.md](usb.md) | product id, the file protocol, the two files read, the rails |
| [misc.md](misc.md) | everything else |

## Not checked

* Which architecture number is right, and whether it matters to anything this project would do.
* The screen's raster from any source but the manual's pictures.
* Everything about the configuration.
