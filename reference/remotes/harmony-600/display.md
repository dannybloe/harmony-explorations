# Harmony 600: display

A 1.5 inch **monochrome** screen of 128 by 128 pixels, with no touch[^x-manual]. It shows activities,
devices and their commands as items beside the four keys that flank it, a page counter, and words above
the three keys below it. **It shows no clock**: none of the Harmony 600, 650 and 700 has the time on its
screen, [how a Harmony works](../../how-a-harmony-works.md#what-the-screen-does-and-what-it-does-not).

The configuration stores every picture in colour, the same way as for the 650 and 700, and the panel
turns each colour into a grey of its own. So whether a remote has a colour screen cannot be read from its
configuration; it is a property of the model.

## The panel

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | 128 by 128 pixels | `SCREEN_SIZES` in `packages/codec/src/render.ts`, measured from the configurations' full screen pictures |
| raster on the drawing | 128 by 128 | `h600.ts`, which must agree with the row above |
| panel | monochrome | `packages/usb/src/models.ts` |
| touch | no | `packages/usb/src/models.ts`, and `touch` on the drawing's screen is no |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| | value | evidence |
|---|---|---|
| size | 1.5 inch diagonal, "LCD Size" | [^x-manual] |
| resolution | 128 by 128, "LCD Resolution"; the full screen pictures of this architecture's configurations measure the same | [^x-manual], [^s129] |
| panel | "LCD Screen Monochrome", and a colour shown on it is seen as a grey | [^x-manual], [^s387] |
| what a colour becomes on the panel | **a grey of its own**: a green, `0x0446`, was seen as "gray but not very dark", so the panel is not one bit. How many shades, and which colour channels count, is not measured | [^s387] |
| pixel format in the configuration | two bytes a pixel, RGB565, high byte first, **the same as the colour models**; over 15 raw pictures, 43 distinct low bytes and 96 high bytes, only 3.3% grey | [^s51] |
| picture look in Logitech's compiles | the monochrome look, five pictures, for skins 71 and 73. A 600 compile also holds the five of the 700's colour looks. The look goes with the model and not the compile's year: one of the two 600 compiles is of 2026 and still draws its own | [^s330], [^s363] |
| how Logitech's pictures are drawn | all grey, within one step on every pixel, using the full depth of shades: evidence of what their artists drew for, not of the panel | [^s387b] |
| what the firmware sends | every pixel unchanged, two bytes in stored order, through one row writer, `0x130B6`, with no arithmetic between; the panel set up selects sixteen bits per pixel, `3A 05`, at every start, so what a colour looks like is decided in the display module. The same code as the Harmony 650's 0.2 | [^s387c] |
| the panel's first identity byte, data memory `0x384` | 0, as on the Harmony 650, so the set up takes the variant for anything but 1; whether 0 is an identity or a byte left unwritten the firmware does not say | [^s387] |
| how long it stays lit | "Glow Timing", set in Logitech's software. On Logitech's 600 compiles the screen light timer carries the glow time, as on the Harmony 650, where it is the configuration's timer 1. A configuration of this project's went dark after 20 seconds | [^x-manual], [^s347], [^s292], [^s389] |

## What the screen shows

The manual's "What's on the Harmony 600's screen", pages 6 and 7, lists these[^x-manual].

* **An activity's commands**, beside the side keys, paged with the arrows below the screen.
* **A device list** under the centre key's "Devices", four devices to a page, one in each corner; the
  manual's picture shows the list with "Activity" written at the bottom. How device mode works is
  [behaviour.md](behaviour.md) and [how a Harmony works](../../how-a-harmony-works.md).
* **Favourite channels** on the Watch TV activity's screen, with icons.
* **The IR status indicator**, which "flashes whenever an IR command is being sent". Where it appears is
  not checked[^unchecked].
* **The page counter** `n/m` in the upper right corner.
* **Help's questions**, such as "Did that fix the problem?", page 8.

A second device list, laid out in two rows, is compiled into every configuration of this architecture and
nothing on the remote opens it; on the 600 its pages draw a single dashed line where the 650 and 700 draw
a cross[^s285][^s326].

**Mode 0**, the screen an activity key with no activity opens, reads "Use the Harmony setup software to
add an Activity on this button", with "Exit"[^s311]. The Harmony 650 shares it; the 700's mode 0 is a
charging battery instead.

**The firmware's own screens are fourteen** at the front of the configuration's mode table, as on the
Harmony 650, where the 700 has nineteen[^s347][^s357]. They are "add an Activity on this button" and "add
Activities" 0 and 1, USB Connected and Low Battery 2 and 3, a blank, Insert batteries and Unable to charge
4 to 6, Update Successful, Upgrade Successful and a blank 7 to 9, and Ready to learn, Command Received, a
blank and Terminate Entry 10 to 13. The thirty screens of the status codes follow from mode 14, "Go to
Website / to update settings" first[^s347].

**"Turning system off"**, the Off screen, did not show on any run of a configuration of this project's
stating model number 73, and showed very briefly after a start with the same file stating 71, one
sighting[^s392]; [behaviour.md](behaviour.md) has the runs.

## How this project draws for the 600

A configuration of this project's draws the 600 in **one look**: every state on one grey, `0x2104`, grey 2
of sixteen steps from black to white, which Logitech's 600 compiles also use among their greys, with the
letters' edges blended into that grey. It is the 600's form of this project's one colour per
state[^d20]. Both were judged good on the panel, and the blended letters looked better than the same file
unblended, which agrees with the panel showing shades between black and white[^s387][^s388].

## Not checked

* Whether the IR status indicator appears, and where[^unchecked].
* How long the screen stays lit on a Logitech compile for the 600, timed on the remote[^unchecked].
* Whether any battery picture is ever drawn on a 600[^unchecked].
* How many shades the panel shows, and which colour channels count[^unchecked].

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 600 user manual](https://support.myharmony.com/harmony-600-user-manual)
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s387]: Measured on a unit. [Section 387](../../../docs/findings.md#s387)
[^s51]: Measured in configurations. [Section 51](../../../docs/findings.md#s51)
[^s330]: Measured in configurations. [Section 330](../../../docs/findings.md#s330)
[^s363]: Measured in configurations. [Section 363](../../../docs/findings.md#s363)
[^s387b]: Measured in configurations. [Section 387](../../../docs/findings.md#s387)
[^s387c]: Read in the firmware. [Section 387](../../../docs/findings.md#s387)
[^s347]: Measured in configurations. [Section 347](../../../docs/findings.md#s347)
[^s292]: Measured on a unit. [Section 292](../../../docs/findings.md#s292)
[^s389]: Measured on a unit. [Section 389](../../../docs/findings.md#s389)
[^unchecked]: Not checked.
[^s285]: Measured in configurations. [Section 285](../../../docs/findings.md#s285)
[^s326]: Read in the firmware. [Section 326](../../../docs/findings.md#s326)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^s357]: Measured in configurations. [Section 357](../../../docs/findings.md#s357)
[^s392]: Measured on a unit. [Section 392](../../../docs/findings.md#s392)
[^d20]: Chosen by this project. [Decision 20](../../../docs/decisions.md#d20)
[^s388]: Measured on a unit. [Section 388](../../../docs/findings.md#s388)
