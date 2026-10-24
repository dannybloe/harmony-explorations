# Harmony 700: display

A 1.5 inch colour screen, 128 by 128 pixels, with no touch, laid out as the 600's and 650's are: items
beside the four keys that flank it, a page counter, and words above the three keys below it. **It shows no
clock**, as none of the three does, [how a Harmony works](../../how-a-harmony-works.md). What sets the 700's
screen apart is a **charging battery**, drawn while it charges.

## The panel

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | 128 by 128 pixels | `SCREEN_SIZES` in `packages/codec/src/render.ts`, measured from the configurations' full screen pictures |
| raster on the drawing | 128 by 128 | `h700.ts`, which must agree with the row above |
| panel | colour | `packages/usb/src/models.ts` |
| touch | no | `packages/usb/src/models.ts`, and `touch` on the drawing's screen is no |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| | value | evidence |
|---|---|---|
| size | 1.5 inch diagonal, "LCD Size" | [^x-manual] |
| resolution | 128 x 128 | [^x-manual], [^s129] |
| colour | "LCD Screen 65,000 Color" | [^x-manual] |
| pixel format in the configuration | two bytes a pixel, RGB565, high byte first | [^s51] |
| picture look in Logitech's compiles | **two colour looks** on skin 66: that of 2021 and 2023, and that of 2026, which the 650 shares | [^s330] |
| how long it stays lit | "Glow Timing", set in Logitech's software; in the configuration it is the screen light timer, as on the 650; a 700 went dark about 20 seconds after the last key, judged by eye | [^x-manual], [^s347], [^s292], [^s383] |

## What the screen shows

The 700's manual, pages 6 and 7, describes the same screen as the 600's: an activity's commands beside the
side keys, the device list under the centre key's "Devices", favourite channels on Watch TV, an **IR
status indicator** that "flashes whenever an IR command is being sent", and the page counter in the upper
right corner[^x-manual]. The device list's layouts, four to a page in the corners and a compiled two row
list nothing opens, are the architecture's[^s326].

**Modes 0 to 3 are a charging battery.** On the 700 the first four modes of the configuration draw no
text, only a battery under a lightning bolt filled a quarter, a half, three quarters and full, and each sets
one state variable to 1; mode 9 draws a full battery with a tick, and "Please charge your remote", mode 8,
an empty battery with a forbidden sign. The "add an Activity" placeholder an empty activity key opens is
mode 4 instead[^s311][^s314].

**When the charging battery shows.** Only on a charger, never on a computer: the firmware shows the charging
screens after a test of the cable's data lines passes, which a computer never lets run, because a host that
addresses the remote stops the test[^s384b]. On one USB charger they showed instead of "USB Connected", and
on a phone charger none showed[^s384]; neither charger's lines were measured, so which chargers pass is an
inference from the code, [hardware.md](hardware.md).

**The firmware's own screens are nineteen** at the front of the configuration's mode table, where the 600
and 650 have fourteen, read from configurations[^s347][^s357]. They are the four charging frames 0 to 3,
"add an Activity on this button" and "add Activities" 4 and 5, USB Connected and Low Battery 6 and 7,
"Please charge your remote" 8, a blank, Insert batteries and Unable to charge 9 to 11, Update Successful,
Upgrade Successful and a blank 12 to 14, and Ready to learn, Command Received, a blank and Terminate Entry
15 to 18. The status codes' thirty screens follow from mode 19. The architecture's
[misc.md](../../architectures/harmony-600-650-700/misc.md) has the keys each of them takes. **Four timers
of 2 seconds each**, on the 700 alone, enter the frames in turn, 1, 2, 3 and back to 0, which is the
battery filling up[^s347].

**The battery pictures are the model's.** Logitech's five 700 compiles of 2026 draw them byte for byte alike,
"Please charge your remote" being the Harmony 650's battery blank picture exactly, and the two older compiles,
of 2021 and 2023, draw the same subjects in other artwork, by eye[^s382].

**"Turning system off"**, the Off screen, shows for a moment on All Off when the mark it waits for is 1,
and not when it is 0[^s386]; [behaviour.md](behaviour.md) has the detail.

## The clock it keeps and does not show

The 2.8 build keeps the clock where the 0.2 builds do, in the first seven state variables, which sit at
`0x900 + n` on this build[^s384b], and a read of data memory over USB found the clock there[^s386]. So a
clock on this model is checked by reading memory over USB, since there is nothing to look at. This said
"Where the 2.8 build keeps its clock is **not read**"<!--superseded--> until section 386.

## Not checked

* The colour of a 700's panel, as seen[^unchecked].
* Whether the IR status indicator appears, and where[^unchecked].

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 700 user manual](https://support.myharmony.com/harmony-700-user-manual)
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s51]: Measured in configurations. [Section 51](../../../docs/findings.md#s51)
[^s330]: Measured in configurations. [Section 330](../../../docs/findings.md#s330)
[^s347]: Measured in configurations. [Section 347](../../../docs/findings.md#s347)
[^s292]: Measured in configurations. [Section 292](../../../docs/findings.md#s292)
[^s383]: Measured on a unit. [Section 383](../../../docs/findings.md#s383)
[^s326]: Read in the firmware. [Section 326](../../../docs/findings.md#s326)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^s314]: Measured in configurations. [Section 314](../../../docs/findings.md#s314)
[^s384b]: Read in the firmware. [Section 384](../../../docs/findings.md#s384)
[^s384]: Measured on a unit. [Section 384](../../../docs/findings.md#s384)
[^s357]: Measured in configurations. [Section 357](../../../docs/findings.md#s357)
[^s382]: Measured in configurations. [Section 382](../../../docs/findings.md#s382)
[^s386]: Measured on a unit. [Section 386](../../../docs/findings.md#s386)
[^unchecked]: Not checked.
