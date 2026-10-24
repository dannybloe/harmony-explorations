# Harmony 600

An activity based infrared universal remote, its manual dated 2009, with a small **monochrome** screen above the
keypad, four keys beside the screen and three below it, and no touch panel. It runs on AA batteries and
controls up to five devices by Logitech's own word[^x-manual].

It is one of three models on one platform, the Harmony 600, 650 and 700, which Logitech's own client
calls architecture 14. The three share a face, a processor, a flash chip, a firmware program and a
configuration format, and they differ in the panel, the power supply, the device limit and the build of
firmware each runs. What they share is stated once in
[the architecture folder](../../architectures/harmony-600-650-700/README.md), together with a table of how
the three differ; this folder states what is the 600's own. The 600 is the monochrome one of the three,
and its drawing is the one the 650 and 700 take by reference, [keys.md](keys.md).

How a fact here is known is in its footnote, and the kinds of evidence are explained in
[the reference's introduction](../../README.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 71 | Harmony 600 | Harmony 600 EMEA | 14 | monochrome | no | 0.2 |
| 73 | Harmony 600 EMEA | Harmony 600 | 14 | monochrome | no | 0.2 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

A skin is the number Logitech gives a model in one region. Skin 71 is the one a 600 reports over USB, in
its USB release number `0x1071`[^s19] and in its version block[^s302]. Skin 73 is the European 600, as
Logitech's service lists it[^s131]. Logitech's compiles for both skins draw their screens in the same
monochrome look[^s330]. The firmware column is the forum table's[^x-forum]; Logitech names a newer
version, [firmware.md](firmware.md).

**The model number the remote reports is its firmware's own constant, and a configuration may state the
other one.** The 0.2 build reports 71 in its version reply, from `0x11964`, and `0x1071` in its USB device
descriptor, where the Harmony 650's 0.2 build reports 72 and `0x1072`; that is the one difference in
meaning between the two builds[^s392]. Logitech's two compiles for this model read here state 71 in one
and 73 in the other, in base slot 1[^s318], and a remote reporting 71 has run a Logitech compile stating
73[^s387]. The 0.2 build's section seeker is never asked for base slot 1, so the remote does not fetch
the number that way; a read bypassing the seeker is not ruled out[^s392].

A configuration of this project's states the number the remote reports[^d23]. With 71 the 600 showed
"Turning system off" briefly after a start, which no run of a file stating 73 had shown; that was one
sighting, and it does not prove the number is the cause[^s392b], [behaviour.md](behaviour.md).

## Key numbers

What the 600 shares with the 650 and 700, the processor, the 2 MiB flash chip, the USB product id, where
the configuration sits, a screen without a clock and no long press, is in
[the architecture's README](../../architectures/harmony-600-650-700/README.md#shared-in-one-table). These
are the 600's own:

| | value | evidence |
|---|---|---|
| firmware | 0.2: the application is 70336 bytes, entry `0x1A26E` | [^s23] |
| hardware version | 1.1 | [^s302] |
| screen | 1.5 inch, 128 by 128 pixels, **monochrome** | [^x-manual], [^s387]; [display.md](display.md) |
| keys | 54, in a matrix whose four columns hold 14, 14, 13 and 13 | [^s17], [^t-keypad]; [keys.md](keys.md) |
| devices | 5 by Logitech's statement; the remote **runs a sixth** | [^x-manual], [^s390]; [features.md](features.md) |
| model number reported | 71 | [^s392], [^s302] |
| power | AA batteries, no charger | [^x-manual] |
| flash chip | 2 MiB, which the manual gives as "Memory Amount 2MB" | [^s88], [^x-manual] |
| state variables on the cable | **live**, from `0xE10` on build 0.2, the clock ticking between two reads | [^s387]; [memory.md](memory.md) |

## The files

| file | what it holds |
|---|---|
| [keys.md](keys.md) | every key, its scan code, the drawing the 650 and 700 borrow |
| [display.md](display.md) | the monochrome panel and the greys it shows, the raster, what the screen shows and does not show |
| [features.md](features.md) | device limit, activities, favourites, help, delays, settings |
| [behaviour.md](behaviour.md) | device mode, Help, what a saved delay does at start, the Off screen, six devices |
| [hardware.md](hardware.md) | processor, flash, battery, transmitters, backlight, size, the tilt sensor |
| [memory.md](memory.md) | where the 600 differs from the architecture's memory map |
| [firmware.md](firmware.md) | version 0.2 and how it differs from the 650's, safe mode |
| [usb.md](usb.md) | identity on the bus and what the 600 answers |
| [misc.md](misc.md) | everything else |

## Not checked

* Whether a skin 73 unit differs from skin 71 in anything but the region and its keypad printing[^unchecked].
* Any firmware for this model other than 0.2: Logitech's version list names 0.3, [firmware.md](firmware.md).
* Whether the remote counts devices at all: it ran six where Logitech states five[^s390].

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 600 user manual](https://www.manualslib.com/manual/634914/Logitech-Harmony-600.html)
[^s19]: Measured on a unit. [Section 19](../../../docs/findings.md#s19)
[^s302]: Measured on a unit. [Section 302](../../../docs/findings.md#s302)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^s330]: Measured in configurations. [Section 330](../../../docs/findings.md#s330)
[^x-forum]: Stated by a third party. [The comparison table of harmony-remote-forum.de](https://www.harmony-remote-forum.de/harmony_compare.php)
[^s392]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^s318]: Measured in configurations. [Section 318](../../../docs/findings.md#s318)
[^s387]: Measured on a unit. [Section 387](../../../docs/findings.md#s387)
[^d23]: Chosen by this project. [Decision 23](../../../docs/decisions.md#d23)
[^s392b]: Measured on a unit. [Section 392](../../../docs/findings.md#s392)
[^s23]: Measured on a unit. [Section 23](../../../docs/findings.md#s23)
[^s17]: Measured in configurations. [Section 17](../../../docs/findings.md#s17)
[^t-keypad]: Measured on a unit. [The test](../../../tests/test_keypad.py)
[^s390]: Measured on a unit. [Section 390](../../../docs/findings.md#s390)
[^s88]: Measured on a unit. [Section 88](../../../docs/findings.md#s88)
[^unchecked]: Not checked.
