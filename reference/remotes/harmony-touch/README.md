# Harmony Touch

An activity based infrared universal remote with a touch screen in the upper half of the face, a keypad
below it, a rechargeable lithium ion cell and a charging dock[^x-touch-manual]. It belongs to Logitech's
later generation: its firmware is a Linux image, it is programmed through MyHarmony, and it **fetches its
own configuration** through the desktop client rather than having one compiled and written to
it[^s203]. How evidence is marked is in [the reference's README](../../README.md).

**This library reads almost nothing of it and writes nothing to it.** `openHarmony` refuses it, because it
speaks the file protocol rather than the command protocol[^s193]. A read only file transport has opened two
files on it, its identity and a radio query, and nothing else answers without the named door[^s201]. Its
configuration is not reachable as a file[^s200], and Logitech's service does not compile one for
it[^s202]. So the facts below are mostly Logitech's, from the manual, the service and the client, and each
footnote says so.

**Its architecture is disputed.** The remote reports 17 for itself[^s200] and Logitech's own protocol
templates say 18[^s197]. This reference takes the remote's number and states both; the disagreement, its
sources and the generation the Touch belongs to are [its platform's folder](../../architectures/harmony-touch/README.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 99 | no record in models.ts |  | 17, the folder's | no record | no record |  |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 99 is the remote's own, from its `/sys/sysinfo` and from its `bcdDevice`, `0x1099`[^s195][^s200], and it
is Logitech's product table's Harmony Touch, codename Juniper in the client's templates[^s197].
`packages/usb/src/models.ts` has no record for it, deliberately: a record states what a model's hardware can
do, and nothing has read those fields out of its firmware[^unchecked]. A regional twin is **not
checked**[^unchecked].

## Key numbers

| | value | evidence |
|---|---|---|
| architecture | **17 by its own report, 18 by Logitech's specification** | [^s200], [^s197] |
| USB product id | `0xC12B` | [^s193] |
| `bcdDevice` | `0x1099`, BCD of `1000 + 99` | [^s195] |
| product string | `Logitech Harmony Remote`, with no firmware version in it | [^s193] |
| protocol | the file protocol: a path opened, read and closed | [^s198], [^s200] |
| firmware | 4.15.330, the production image Logitech's update service serves for skin 99, a Linux image shared with five later models | [^s200], [^s196] |
| screen | an "LCD touch screen"; 240 by 320 by the size of every screen capture in the manual | [^x-touch-manual] |
| keys | 29 on the drawing: 27 moulded keys and two marks above the screen, Home and Favorites | [^x-touch-manual] |
| devices | up to 15 | [^x-touch-manual] |
| favourite channels | up to 50 | [^x-touch-manual] |
| long press | yes | [^t-long-press] |
| power | an internal, non replaceable lithium ion cell, charged in a dock | [^x-touch-manual] |
| clock | the remote keeps the time, set from the computer at every sync, in 12 or 24 hour form | [^x-touch-manual] |
| configuration | **not reachable as a file** under any name known here | [^s200] |

## The files

| file | what it holds |
|---|---|
| [hardware.md](hardware.md) | the cell and dock, the radio identity, what `/sys/sysinfo` reports about the hardware |
| [keys.md](keys.md) | the drawing, the two marks above the screen, no scan codes |
| [display.md](display.md) | the touch screen, gestures, what the manual shows |
| [features.md](features.md) | Logitech's statements: devices, favourites, long press, provisioning instead of a compile |
| [behaviour.md](behaviour.md) | device mode, Off, syncing back |
| [memory.md](memory.md) | what is known of its filesystem, which is little |
| [firmware.md](firmware.md) | the version it reports, its image, the paths that reset and reboot it |
| [usb.md](usb.md) | product id, the file protocol as far as it was used, the two files read, what happens on the cable, the rails |
| [misc.md](misc.md) | everything else |

## Not checked

* Which architecture number is right, and whether it matters to anything a writer would do[^unchecked].
* The screen's raster from any source but the manual's pictures[^unchecked].
* Everything about the configuration[^unchecked].

[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
[^s203]: Stated by Logitech, in their client. [Section 203](../../../docs/findings.md#s203)
[^s193]: Measured on a unit. [Section 193](../../../docs/findings.md#s193)
[^s201]: Measured on a unit. [Section 201](../../../docs/findings.md#s201)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s202]: Stated by Logitech, in their client. [Section 202](../../../docs/findings.md#s202)
[^s197]: Stated by Logitech, in their client. [Section 197](../../../docs/findings.md#s197)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^unchecked]: Not checked.
[^s198]: Stated by Logitech, in their client. [Section 198](../../../docs/findings.md#s198)
[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
