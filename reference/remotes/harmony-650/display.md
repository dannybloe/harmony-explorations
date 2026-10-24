# Harmony 650: display

A 1.5 inch colour screen, 128 by 128 pixels, with no touch. It shows activities, devices and their
commands as items beside the four keys that flank it, a page counter, and words above the three keys
below it. **It shows no clock.**

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

| | value | standing and source |
|---|---|---|
| size | 1.5 inch diagonal | Logitech's manual, "LCD size" |
| resolution | 128 x 128 pixels | Logitech's manual; also measured from the arch 14 configurations' full screen pictures, section 129 |
| colour | "65,000 colors" | Logitech's manual. `panel: 'colour'` in `models.ts` is the forum table's, third party. Configurations compiled for skin 72 carry the colour look, section 330. **Not recorded at the bench**: nobody has written down what the bench unit's screen looks like |
| touch | no | Logitech's manual describes keys only; `reference/capabilities.md` |
| pixel format in the configuration | two bytes a pixel, RGB565, high byte first, a letter's pixel as a picture's | read from configurations, section 51; for letters section 367, read in the firmware: one loop clocks each byte from flash to the panel in stored order, no swap and no buffer. **Says nothing about the panel**: the monochrome Harmony 600 carries the same format |
| how the panel is set up | sixteen bits a pixel, `3A 05`, sent at every start; the controller's BGR bit set, `0x36 0x48`; one of two set up variants chosen by the controller's first identity byte, which reads 0 on the 650 | read in the firmware, sections 367 and 387. Which half of a pixel the panel takes as red is **not read** |
| how long it stays lit | timer 1 of the configuration, 8 seconds as Logitech compiled it, which is MyHarmony's `GlowTime` | measured on the 650: written 20 gave about 20 seconds lit, 10 about 10, section 292. As compiled it went dark after six or seven seconds, seen at the bench |

## What the screen shows

From Logitech's manual, page 3, and from the configurations, which are Logitech's compiler's statement
of every screen:

* **An activity's commands**, four to a page, one beside each corner key, and paged with the arrows
  below the screen. Labels of one line sit at y 40 and 90, read from configurations, sections 285 and
  290.
* **A device list**, four devices to a page, one in each corner, under the centre key's "Devices",
  `reference/how-a-harmony-works.md` and section 326. A second, two row device list is compiled into every
  arch 14 configuration and **nothing on the remote opens it**, section 326.
* **The page counter** `n/m` in the upper right corner, Logitech's manual and section 285.
* **An infrared status indicator** that "flashes in the bottom right corner whenever command is being
  sent", Logitech's manual. **Seen at the bench** on 11 October 2026: an icon in the bottom right corner
  while the remote sends, watched routinely to tell when a bench test step has finished sending.
* **A start up screen** for an activity, "Starting" and its name at the top and three fixed lines from
  y 82 asking to keep the remote pointed at the system, read from configurations, section 290; seen on
  the 650 for a composed activity, section 291. Logitech's compiler draws the title on one line up to
  126 pixels wide and breaks one of 130, so it breaks somewhere from 127 to 130 on this model; read from
  configurations, section 358.
* **Off**, "Turning system off", shown briefly on All Off and then the menu; seen on the 650 with files
  of this project's, sections 357 and 374.
* **The Remote Assistant** after an unplug and when an activity starts, Logitech's manual page 4; on the
  650 it reads `If any devices are still On press "Help" now`, seen at the bench, section 286.
* **The introduction tour**, ten screens from `Welcome to your Harmony 650 remote`, after the first sync
  per the manual and after every write of ours until the configuration skips it, section 286.
* **Status screens** for a configuration the remote rejects, the architecture's 35, section 244 and
  the `recovering-a-remote` skill. They are drawn from the status screen library at external
  `0x020000`; the thirty status screens a configuration carries itself are **never drawn from it**, as
  far as the 0.2 build's code reads, section 355, and none was raised on purpose to check.
* **The firmware's own fourteen screens**, among them "USB Connected", Low Battery, Insert batteries,
  the learning screens and the two "add an Activity" placeholders, entered only by the configuration's
  own lists, sections 355 and 357. What they are on all three models is in
  [the architecture's misc.md](../../architectures/harmony-600-650-700/misc.md). Mode 1 is "add
  Activities", which Logitech's one compile with no activity opens from More Activities, read from
  configurations, section 383.

**A configuration carries 18 or 19 pictures** of nineteen, each byte identical on every compile for
this skin that holds it, among them the single item and crossed four corner backgrounds and the bars,
sections 317 and 363. **No device or activity icons** are drawn on the 650, `todo-compile-650.md` 9.1.
Six are a fill or a band of one coloured rows and are built by this project; the curved backgrounds, the
start up picture, the corner mark and the firmware screens' battery and USB pictures are designed images,
section 363. Four of the pictures are drawn only by programs switching on state variable 17, which this
project read as a battery gauge, section 317: a small mark at 114, 112 and three patches in the colour of
the background under it. **The mark is the infrared indicator above**, by its place and by the bench, and
state variable 17 is the sending flag: its writers are on the firmware's send path, section 369.

**Fonts**: a font set holds only the letters its screens use, 76 codes each with between 13 and 66
filled, section 317. Which typefaces they are is not named anywhere. **By measurement they fall into nine
faces**: 15 pixels high with a stroke of one pixel or two; 14 with one, or with two and the capitals
starting on row 1 or lower; 13 with two or one; 11; and 10. 17 to 19 sets a compile, every one starting
at code 1, section 368. Logitech's letters are one bit: each set holds one ink and at most one shadow colour, four pairs in all, and the bars' letters are
`0x2104` with no shadow, sections 368 and 370.

**How the firmware draws a letter**, read in the 650's 0.2 build, section 368: the font select keeps only
the chosen set's address, and each character is found by the pointer at `3 + 3 * (code - 1)` and decoded
by the picture routine, so a glyph several sets point at draws as an own one. The set's first code byte
is ignored, the firmware always subtracting 1, and a glyph's row ends only at a `0x80`. **Seen on the
650**: a file whose sets share glyphs drew every letter, and letters blended into their background in
many colours drew as Logitech's one bit ones do, in a configuration of 1156 KB holding more sets than
Logitech's 18, `todo-compile-650.md` 8.2.2 and 8.2.6, sections 368 and 370.

**Where a picture or a page list sits is not read as a position**: the firmware reaches each through its
pointer, read on four images of this architecture, section 328; on the 650 a file with all 18 pictures and
all 437 page lists moved drew every screen as before, `todo-compile-650.md` 10.5.1.

## What the screen does not show

**No clock.** The ordinary screen of the Harmony 600, 650 and 700 has no time on it, the project owner's
observation at the bench on 4 October 2026, recorded in `reference/how-a-harmony-works.md`. The remote keeps
a clock all the same: the first seven state variables, which every restart of the 0.2 build resets to
the configuration's stamp, measured in the 650's memory, sections 283 and 310. So a wrong stamp is
**invisible on this remote** and has to be checked by reading its memory, never by looking at it.

Older text in this repository was written as though the stamp time were on the screen: section 283
("leaves the remote showing its stamp time"), section 322, and two sentences of `reference/config-format/state.md`.
Those describe the clock's value in memory; none of them is an observation of the screen, and this
file is the place that says what the screen shows.

Nor does it draw device or activity icons, above. Anything else the screen might or might not show,
such as a volume or channel readout, is **not checked**: nothing here states it either way.

## Not checked

* The colour of the bench unit's panel, as seen. The manual and the compiled look agree it is colour.
* Whether any battery picture is ever drawn on the 650.
* What timer 3, the other arm of the screen light pair, does, section 292.
* Which light the configuration's parameter group 3 sets, section 392, [hardware.md](hardware.md).
* Whether "Application Terminated", the one status screen whose route the code reading left open, can be
  reached, section 355.
* Once, after the 20 second write, the screen stayed black after unplugging until the batteries came
  out, section 292; one occurrence in two writes and unexplained.
