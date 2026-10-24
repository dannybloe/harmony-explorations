# Harmony One

An activity based infrared universal remote, with a 2.2 inch colour **touch** screen above the keypad, a
rechargeable lithium ion cell and a charging station. Its manual is dated 2007[^x-one-manual]. A person
picks an activity such as "Watch TV" on the screen, and the remote switches the right equipment on and
points the keys at it; or picks one device and drives that device alone.

It is the only model on its platform, which Logitech's own client calls architecture 12 and codename
Gin[^s81]. What follows from that platform, its memory, firmware and USB commands, is in
[the platform's folder](../../architectures/harmony-one/README.md), and this folder is what a person meets
holding the remote.

It differs from the Harmony 600, 650 and 700 in four ways a person or a programmer notices first: its
screen is touched, so a command on the screen is reached through a map of touch areas rather than through
keys[^s45]; it **shows a clock**[^x-one-manual]; it clicks before every command touched on the
screen[^s337]; and it runs its program and its configuration straight out of its flash chip, where those
three copy them into the processor first, [the platform's README](../../architectures/harmony-one/README.md).
How evidence is marked on these pages is in [the reference's README](../../README.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 54 | Harmony One | Harmony One EMEA | 12 | colour | yes | 3.4.0 |
| 59 | Harmony One EMEA | Harmony One | 12 | colour | yes | 3.4.0 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 54 is what a live remote reports, in its version block and in its USB `bcdDevice`,
`0x1054`[^s57][^s113]. Skin 59 is the European model, as Logitech's service names it[^s131]. **Which skin
a configuration carries is per configuration and not per remote**: configurations compiled for the same
remote carry 59 or 54 depending on the compile[^s81b][^s131b]. What makes a compile choose one or the
other is not checked[^unchecked].

## Key numbers

| | value |
|---|---|
| architecture | 12, codename Gin, the only model on it, reported in the version block's field 4[^s57][^s81] |
| USB product id and `bcdDevice` | `0xC121`, its own, and `0x1054`; [usb.md](usb.md) |
| firmware | 3.4, the only version known; [firmware.md](firmware.md) |
| hardware version | 0.5, the version block's field 1[^s57] |
| screen | 2.2 inch, colour, capacitive touch, "220 x 176 (QCIF+)"[^x-one-manual]; a full screen picture is 176 pixels wide and 220 tall[^s54] |
| keys | 44 on the drawing, 40 keypad keys and 4 touch keys; [keys.md](keys.md) |
| devices | up to 15[^x-one-manual][^s136] |
| power | a rechargeable lithium ion cell, charged on a charging station[^x-one-manual] |
| memory | "Memory Amount 4MB", "Memory Type Flash"[^x-one-manual]; what sits where is [the platform's memory page](../../architectures/harmony-one/memory.md) |
| clock on screen | **yes**, small, the day and the time, set from the remote's Options[^x-one-manual]; [display.md](display.md) |
| long press | none[^t-long-press] |

## The files

| file | what it holds |
|---|---|
| [keys.md](keys.md) | the keypad, the touch codes, the drawing, the two arrow pairs |
| [display.md](display.md) | the touch panel and its hit map, what the screen shows, the clock, letters and pads |
| [features.md](features.md) | Logitech's statement, device mode, sequences, delays, favourites |
| [behaviour.md](behaviour.md) | device mode in and out, the click before every screen command and the held touch, the cable, writes and restarts, the clock |
| [hardware.md](hardware.md) | the cell and the gauge, the beeper, the light sensor, the key lights, the keypad lines |
| [memory.md](memory.md) | a pointer to the platform's memory page |
| [firmware.md](firmware.md) | the version of this model and how to enter safe mode; the images are the platform's |
| [usb.md](usb.md) | product id and version block; the commands and write standing are the platform's |
| [misc.md](misc.md) | everything else |

## Not checked

* Whether a skin 59 remote differs from a skin 54 one in anything but the region[^unchecked].
* What makes a compile carry skin 54 or 59[^unchecked].
* Any firmware for this model other than 3.4[^unchecked].

[^x-one-manual]: Stated by Logitech, in the manual. [The Harmony One user guide](https://secure.logitech.com/assets/44645/13/harmonyone-user-guide.pdf)
[^s81]: Stated by Logitech, in their client. [Section 81](../../../docs/findings.md#s81)
[^s45]: Read in the firmware. [Section 45](../../../docs/findings.md#s45)
[^s337]: Read in the firmware. [Section 337](../../../docs/findings.md#s337)
[^s57]: Measured on a unit. [Section 57](../../../docs/findings.md#s57)
[^s113]: Measured on a unit. [Section 113](../../../docs/findings.md#s113)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^s81b]: Measured in configurations. [Section 81](../../../docs/findings.md#s81)
[^s131b]: Measured in configurations. [Section 131](../../../docs/findings.md#s131)
[^unchecked]: Not checked.
[^s54]: Measured in configurations. [Section 54](../../../docs/findings.md#s54)
[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
