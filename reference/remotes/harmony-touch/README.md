# Harmony Touch

An activity based infrared universal remote with a touch screen in the upper half of the face, a keypad
below it, a rechargeable lithium ion cell and a charging dock[^x-touch-manual]. It belongs to Logitech's
later generation: its firmware is a Linux image, it is programmed through MyHarmony, and it **fetches its
own configuration** through the desktop client rather than having one compiled and written to
it[^s203]. How evidence is marked is in [the reference's README](../../README.md).

**This library reaches it by two narrow routes and no other.** `openHarmony` refuses it, because it speaks
the file protocol rather than the command protocol[^s193]. A read only file transport has opened two files on
it, its identity and a radio query, and nothing else answers without the named door[^s201]. Requests to its
software go through a rail of their own, which answers a sync in place of Logitech's server: thirty four syncs
of this project have run on one unit and thirty two were committed, [answering a
sync](../../architectures/harmony-touch/answering-a-sync.md)[^d29][^t-touch-from-nothing]. Its configuration
is not reachable as a file[^s200], and Logitech's service does not compile one for it[^s202]: it is a set of
documents a sync delivers, [the platform's pages](../../architectures/harmony-touch/README.md#the-files). So the
facts below are Logitech's, from the manual, the service and the client, read in its firmware image, or measured
on that unit, and each footnote says which.

> This said the library "reads almost nothing of it and writes nothing to it"<!--superseded--> until the
> request rail answered its first sync.

**Its architecture has two numbers for two things.** The remote reports 17 for itself[^s200], the number its
software shares with Logitech's hubs, and Logitech's own protocol templates file it under 18[^s197], their
family for this generation's remotes; nothing compares the two. This reference takes the remote's number and
states both; the sources and the generation the Touch belongs to are [its platform's
folder](../../architectures/harmony-touch/README.md#which-architecture-number-17-or-18).

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
| screen | an "LCD touch screen" of **240 by 320 pixels**, stated by four programs in the firmware, [display.md](display.md), and the size of every screen capture in the manual | [^x-touch-manual], [^t-touch-keys] |
| keys | 29 on the drawing: **27 keys on the keypad**, each with a bit of the key microcontroller, a Linux key code and a name in the firmware, and **two zones of the touch sensor** above the screen, Home and Favorites, [keys.md](keys.md#the-key-numbers) | [^x-touch-manual], [^t-touch-keys] |
| devices | up to 15, by the manual and by Logitech's product table | [^x-touch-manual], [^t-touch-products] |
| favourite channels | up to 50, by the manual and by Logitech's product table | [^x-touch-manual], [^t-touch-products] |
| long press | yes | [^t-long-press] |
| power | an internal, non replaceable lithium ion cell, charged in a dock; below 3.55 V the remote warns and switches itself off, [display.md](display.md#charging-and-the-battery) | [^x-touch-manual], [^t-touch-keys] |
| clock | the remote keeps the time, set from the computer at every sync, in 12 or 24 hour form; in the two syncs down recorded the remote refused the client's write to its clock file, and the hand over of the remote's changes wrote none, [memory.md](memory.md); a sync sent without the clock write was committed | [^x-touch-manual], [^t-touch-sync], [^t-touch-both-ways], [^t-touch-second-sync] |
| configuration | **not reachable as a file** under any name known here; six JSON documents and, with favourites, their documents and pictures, which the remote asks for in a sync, [answering a sync](../../architectures/harmony-touch/answering-a-sync.md) | [^s200], [^t-touch-sync] |

## The files

| file | what it holds |
|---|---|
| [hardware.md](hardware.md) | the cell and dock, the radio identity, what `/sys/sysinfo` reports about the hardware |
| [keys.md](keys.md) | the drawing, the key numbers, the two touch zones above the screen, the combinations |
| [display.md](display.md) | the touch screen, its settings, gestures, charging and the battery |
| [features.md](features.md) | Logitech's statements: devices, favourites, long press, provisioning instead of a compile; what the remote acts on beyond Logitech's software; what a sync of this project delivered and the remote did; the empty configuration and the firmware's own words for it |
| [behaviour.md](behaviour.md) | device mode, Off, switching activities, commands on the screen, syncing back, a factory reset |
| [memory.md](memory.md) | the paths that open, and where the configuration is kept instead of a file |
| [firmware.md](firmware.md) | the version it reports, its image, the paths that reset and reboot it, a sync stopped halfway |
| [usb.md](usb.md) | product id, telling one unit from another, the file protocol as far as it was used, the two files read, what happens on the cable, the rails |
| [misc.md](misc.md) | everything else |

## Not checked

* Which architecture number is right, and whether it matters to anything a writer would do[^unchecked].
* Everything about the configuration beyond the documents a sync delivers, which [the platform's
  pages](../../architectures/harmony-touch/README.md) read field by field[^unchecked].

[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
[^s203]: Stated by Logitech, in their client. [Section 203](../../../docs/findings.md#s203)
[^s193]: Measured on a unit. [Section 193](../../../docs/findings.md#s193)
[^s201]: Measured on a unit. [Section 201](../../../docs/findings.md#s201)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s202]: Stated by Logitech, in their client. [Section 202](../../../docs/findings.md#s202)
[^s197]: Stated by Logitech, in their client. [Section 197](../../../docs/findings.md#s197)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^unchecked]: Not checked.
[^t-touch-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync.test.ts)
[^t-touch-both-ways]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync-both-ways.test.ts)
[^s198]: Stated by Logitech, in their client. [Section 198](../../../docs/findings.md#s198)
[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^t-touch-keys]: Read in the firmware. [The test](../../../tests/test_harmony_touch_keys.py)
[^t-touch-products]: Stated by Logitech, by their service. [The test](../../../tests/test_host_client.py)
[^d29]: Chosen by this project. [Decision 29](../../../docs/decisions.md#d29)
[^t-touch-second-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-second-sync.test.ts)
[^t-touch-from-nothing]: Measured on a unit. [The test](../../../packages/bench/test/touch-from-nothing-runs.test.ts)
