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
| pixel format in the configuration | two bytes a pixel, RGB565, high byte first | read from configurations, section 51. **Says nothing about the panel**: the monochrome Harmony 600 carries the same format |
| how long it stays lit | timer 1 of the configuration, 8 seconds as Logitech compiled it, which is MyHarmony's `GlowTime` | measured on the 650: written 20 gave about 20 seconds lit, 10 about 10, section 292. As compiled it went dark after six or seven seconds, seen at the bench |

## What the screen shows

From Logitech's manual, page 3, and from the configurations, which are Logitech's compiler's statement
of every screen:

* **An activity's commands**, four to a page, one beside each corner key, and paged with the arrows
  below the screen. Labels of one line sit at y 40 and 90, read from configurations, sections 285 and
  290.
* **A device list**, four devices to a page, one in each corner, under the centre key's "Devices",
  `docs/how-a-harmony-works.md` and section 326. A second, two row device list is compiled into every
  arch 14 configuration and **nothing on the remote opens it**, section 326.
* **The page counter** `n/m` in the upper right corner, Logitech's manual and section 285.
* **An infrared status indicator** that "flashes in the bottom right corner whenever command is being
  sent", Logitech's manual. **Not checked** at the bench.
* **A start up screen** for an activity, "Starting" and its name at the top and three fixed lines from
  y 82 asking to keep the remote pointed at the system, read from configurations, section 290; seen on
  the 650 for a composed activity, section 291.
* **The Remote Assistant** after an unplug and when an activity starts, Logitech's manual page 4; on the
  650 it reads `If any devices are still On press "Help" now`, seen at the bench, section 286.
* **The introduction tour**, ten screens from `Welcome to your Harmony 650 remote`, after the first sync
  per the manual and after every write of ours until the configuration skips it, section 286.
* **Status screens** for a configuration the remote rejects, the architecture's 35, section 244 and
  the `recovering-a-remote` skill.

**The configuration carries 19 pictures**, byte identical on every compile for this skin, among them
the single item and crossed four corner backgrounds and the bars, section 317. **No device or activity
icons** are drawn on the 650, `todo-compile-650.md` 9.1. Four of the pictures are drawn only by
programs switching on state variable 17, which this project reads as a battery gauge, section 317;
whether one is ever seen on the bench unit is **not checked**.

**Fonts**: a font set holds only the letters its screens use, 76 codes each with between 13 and 66
filled, section 317. Which typefaces they are is not named anywhere.

## What the screen does not show

**No clock.** The ordinary screen of the Harmony 600, 650 and 700 has no time on it, Danny's
observation at the bench on 4 October 2026, recorded in `docs/how-a-harmony-works.md`. The remote keeps
a clock all the same: the first seven state variables, which every restart of the 0.2 build resets to
the configuration's stamp, measured in the 650's memory, sections 283 and 310. So a wrong stamp is
**invisible on this remote** and has to be checked by reading its memory, never by looking at it.

Older text in this repository was written as though the stamp time were on the screen: section 283
("leaves the remote showing its stamp time"), section 322, and two sentences of `docs/config-format.md`.
Those describe the clock's value in memory; none of them is an observation of the screen, and this
file is the place that says what the screen shows.

Nor does it draw device or activity icons, above. Anything else the screen might or might not show,
such as a volume or channel readout, is **not checked**: nothing here states it either way.

## Not checked

* The colour of the bench unit's panel, as seen. The manual and the compiled look agree it is colour.
* Whether the infrared indicator appears, and where.
* Whether any battery picture is ever drawn on the 650.
* What timer 3, the other arm of the screen light pair, does, section 292.
* Once, after the 20 second write, the screen stayed black after unplugging until the batteries came
  out, section 292; one occurrence in two writes and unexplained.
