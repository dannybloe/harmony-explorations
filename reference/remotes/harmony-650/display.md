# Harmony 650: display

A 1.5 inch colour screen, 128 by 128 pixels, with no touch[^x-manual]. It shows activities, devices and
their commands as items beside the four keys that flank it, a page counter, and words above the three
keys below it. **It shows no clock**, below.

## The panel

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | 128 by 128 pixels | `SCREEN_SIZES` in `packages/codec/src/render.ts`, measured from the configurations' full screen pictures |
| raster on the drawing | 128 by 128 | `h650.ts`, which must agree with the row above |
| panel | colour | `packages/usb/src/models.ts` |
| touch | no | `packages/usb/src/models.ts`, and `touch` on the drawing's screen is no |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| | value | evidence |
|---|---|---|
| size | 1.5 inch diagonal, "LCD size" | [^x-manual] |
| resolution | 128 x 128 pixels; also measured from the configurations' full screen pictures | [^x-manual], [^s129] |
| colour | "65,000 colors". Configurations compiled for skin 72 carry the colour look | [^x-manual], [^s330] |
| touch | no: the manual describes keys only | [^x-manual] |
| pixel format in the configuration | the architecture's, [RGB565 high byte first](../../config-format/screens.md#the-picture-bank), a letter's pixel as a picture's. One loop clocks each byte from flash to the panel in stored order, with no swap and no buffer. **It says nothing about the panel**: the monochrome Harmony 600 carries the same format | [^s51], [^s367] |
| how the panel is set up | sixteen bits a pixel, `3A 05`, sent at every start; the controller's BGR bit set, `0x36 0x48`; one of two set up variants chosen by the controller's first identity byte, which reads 0 on a 650. Which half of a pixel the panel takes as red is **not read** | [^s367], [^s387] |
| how long it stays lit | timer 1 of the configuration, which is MyHarmony's `GlowTime`: 8 seconds as Logitech compiled it, and dark after six or seven; written as 20 it stayed lit about 20 seconds, as 10 about 10 | [^s292] |

## What the screen shows

From Logitech's manual, page 3, and from the configurations, which are Logitech's compiler's statement
of every screen:

* **An activity's commands**, four to a page, one beside each corner key, and paged with the arrows
  below the screen[^x-manual]. Labels of one line sit at y 40 and 90[^s285][^s290].
* **A device list**, four devices to a page, one in each corner, under the centre key's "Devices"[^s326],
  [how a Harmony works](../../how-a-harmony-works.md). A second, two row device list is compiled into
  every configuration of this architecture and **nothing on the remote opens it**[^s326b].
* **The page counter** `n/m` in the upper right corner[^x-manual][^s285].
* **An infrared status indicator** that "flashes in the bottom right corner whenever command is being
  sent"[^x-manual]: a small mark at 114, 112, drawn by programs switching on state variable 17, which is
  the sending flag[^s369], and seen on a 650 while it sends[^s369b].
* **A start up screen** for an activity, "Starting" and its name at the top and three fixed lines from
  y 82 asking to keep the remote pointed at the system[^s290], seen on a 650 for a composed
  activity[^s291]. Logitech's compiler draws the title on one line up to 126 pixels wide and breaks one
  of 130, so it breaks somewhere from 127 to 130 on this model[^s358].
* **Off**, "Turning system off", shown briefly on All Off and then the menu[^s374].
* **The Remote Assistant** after an unplug and when an activity starts[^x-manual]; on a 650 it reads
  `If any devices are still On press "Help" now`[^s286].
* **The introduction tour**, ten screens from `Welcome to your Harmony 650 remote`, after the first sync
  per the manual[^x-manual], and after a write unless the configuration skips it[^s286].
* **Status screens** for a configuration the remote rejects, the architecture's 35[^s244], drawn from
  the status screen library at external `0x020000`; the thirty status screens a configuration carries
  itself are **never drawn**, as far as the 0.2 firmware's code reads, and none was raised on purpose to
  check[^s355].
* **The firmware's own fourteen screens**, among them "USB Connected", Low Battery, Insert batteries,
  the learning screens and the two "add an Activity" placeholders, entered only by the configuration's
  own lists[^s355b][^s357]. What they are on all three models is in
  [the architecture's misc.md](../../architectures/harmony-600-650-700/misc.md). Mode 1 is "add
  Activities", which Logitech's one compile with no activity opens from More Activities[^s383].

**A configuration carries 18 or 19 of nineteen pictures**, each byte identical on every compile for this
skin that holds it, among them the single item and crossed four corner backgrounds and the bars[^s317].
Six are a fill or a band of one coloured rows, drawn by rule; the curved backgrounds, the start up
picture, the corner mark and the firmware screens' battery and USB pictures are designed images, and
**none is a device or activity icon**, so the 650 draws none[^s363]. Four of the pictures are drawn only
by programs switching on state variable 17, once read as a battery gauge[^s317]: a small mark at 114, 112
and three patches in the colour of the background under it. **The mark is the infrared indicator
above**[^s369].

**Fonts**: a font set holds only the letters its screens use, 76 codes each with between 13 and 66
filled[^s317]. Which typefaces they are is not named anywhere. **By measurement they fall into nine
faces**: 15 pixels high with a stroke of one pixel or two; 14 with one, or with two and the capitals
starting on row 1 or lower; 13 with two or one; 11; and 10. A compile holds 17 to 19 sets, every one
starting at code 1[^s368]. Logitech's letters are one bit: each set holds one ink and at most one shadow
colour, four pairs in all, `0xFFFF` over `0x3186`, `0xFFFF` over `0x0000`, `0xD6BB` over `0x3186` and the bars'
`0x2104` with no shadow, so no letter is blended into what is under it[^s368][^s370].
Four measurements tell the faces apart: the height, whether the glyphs carry a shadow, the stroke as the
median run of ink along a row, 85 to 87 percent of runs being one pixel in a one pixel set against 1 to 9
percent in a two pixel set, and on the 14 pixel bold sets the row a capital starts on. The 13 pixel face
with a one pixel stroke is Help's: its texts are all Help's. And a set never shares a glyph with another:
Logitech carries a copy per set, 729 glyphs on one compile[^s368].

**How the firmware draws a letter**, read in the 650's 0.2 build: the font select keeps only the chosen
set's address, and each character is found by the pointer at `3 + 3 * (code - 1)` and decoded by the
picture routine, so a glyph several sets point at draws as an own one. The set's first code byte is
ignored, the firmware always subtracting 1, and a glyph's row ends only at a `0x80`[^s368b].

**Where a picture or a page list sits is not read as a position**: the firmware reaches each through its
pointer, read on four images of this architecture[^s328]; on a 650, a configuration with all 18 pictures
and all 437 page lists moved drew every screen as before[^s328b].

## What the screen does not show

**No clock.** The ordinary screen of the Harmony 600, 650 and 700 has no time on it. The manual's account
of what is on the screen names none[^x-manual], and these models' configurations hold no redraw timer,
every timer but a device's being the firmware's[^s430]. The remote keeps a clock all the same: the first
seven state variables, which every restart of the 0.2 build resets to the configuration's stamp, measured
in a 650's memory[^s283][^s310]. So a wrong stamp is **invisible on this remote** and is checked by reading
its memory, never by looking at it.

Some older text in the findings archive reads as though the stamp time were on the screen[^s283][^s322]. Those
sentences describe the clock's value in memory; none of them is an observation of the screen, and this
page is the place that says what the screen shows.

Nor does it draw device or activity icons, above. Anything else the screen might or might not show,
such as a volume or channel readout, is **not checked**: nothing here states it either
way[^unchecked].

## Not checked

* Whether any battery picture is ever drawn on the 650[^unchecked].
* What timer 3, the other arm of the screen light pair, does[^s292].
* Which light the configuration's parameter group 3 sets, [hardware.md](hardware.md)[^unchecked].
* Whether "Application Terminated", the one status screen whose route the code reading left open, can be
  reached[^s355].
* Once, after a write setting the light to 20 seconds, the screen stayed black after unplugging until the
  batteries came out; one occurrence in two writes and unexplained[^s292].

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 650 user manual](https://www.logitech.com/assets/44635/3/harmony650-user-guide.pdf)
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s330]: Measured in configurations. [Section 330](../../../docs/findings.md#s330)
[^s51]: Measured in configurations. [Section 51](../../../docs/findings.md#s51)
[^s367]: Read in the firmware. [Section 367](../../../docs/findings.md#s367)
[^s387]: Read in the firmware. [Section 387](../../../docs/findings.md#s387)
[^s292]: Measured on a unit. [Section 292](../../../docs/findings.md#s292)
[^s285]: Measured in configurations. [Section 285](../../../docs/findings.md#s285)
[^s290]: Measured in configurations. [Section 290](../../../docs/findings.md#s290)
[^s326]: Measured in configurations. [Section 326](../../../docs/findings.md#s326)
[^s326b]: Read in the firmware. [Section 326](../../../docs/findings.md#s326)
[^s369]: Read in the firmware. [Section 369](../../../docs/findings.md#s369)
[^s369b]: Measured on a unit. [Section 369](../../../docs/findings.md#s369)
[^s291]: Measured on a unit. [Section 291](../../../docs/findings.md#s291)
[^s358]: Measured in configurations. [Section 358](../../../docs/findings.md#s358)
[^s374]: Measured on a unit. [Section 374](../../../docs/findings.md#s374)
[^s286]: Measured on a unit. [Section 286](../../../docs/findings.md#s286)
[^s244]: Measured in configurations. [Section 244](../../../docs/findings.md#s244)
[^s355]: Read in the firmware. [Section 355](../../../docs/findings.md#s355)
[^s355b]: Read in the firmware. [Section 355](../../../docs/findings.md#s355)
[^s357]: Measured in configurations. [Section 357](../../../docs/findings.md#s357)
[^s383]: Measured in configurations. [Section 383](../../../docs/findings.md#s383)
[^s317]: Measured in configurations. [Section 317](../../../docs/findings.md#s317)
[^s363]: Measured in configurations. [Section 363](../../../docs/findings.md#s363)
[^s368]: Measured in configurations. [Section 368](../../../docs/findings.md#s368)
[^s370]: Measured in configurations. [Section 370](../../../docs/findings.md#s370)
[^s368b]: Read in the firmware. [Section 368](../../../docs/findings.md#s368)
[^s328]: Read in the firmware. [Section 328](../../../docs/findings.md#s328)
[^s328b]: Measured on a unit. [Section 328](../../../docs/findings.md#s328)
[^s430]: Measured in configurations. [Section 430](../../../docs/findings.md#s430)
[^s283]: Measured on a unit. [Section 283](../../../docs/findings.md#s283)
[^s310]: Read in the firmware. [Section 310](../../../docs/findings.md#s310)
[^s322]: Read in the firmware. [Section 322](../../../docs/findings.md#s322)
[^unchecked]: Not checked.
