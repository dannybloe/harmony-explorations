# Harmony 600: display

A 1.5 inch **monochrome** screen, 128 by 128 pixels, with no touch. It shows activities, devices and
their commands as items beside the four keys that flank it, a page counter, and words above the three
keys below it. **It shows no clock.**

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

| | value | standing and source |
|---|---|---|
| size | 1.5 inch diagonal | Logitech's manual, "LCD Size" |
| resolution | 128 x 128 | Logitech's manual, "LCD Resolution"; also measured from the arch 14 configurations' full screen pictures, section 129 |
| panel | "LCD Screen Monochrome" | Logitech's manual; **seen at the bench**, `reference/capabilities.md`, the one model whose panel this project has confirmed by looking; and Logitech's service, display "monochrome, 2 by 2", `reference/capabilities.md` |
| pixel format in the configuration | two bytes a pixel, RGB565, high byte first, **the same as the colour models** | read from configurations, section 51 and `reference/capabilities.md`: 43 distinct low bytes and 96 high bytes over 15 raw pictures, only 3.3% grey. So the panel cannot be inferred from a configuration |
| picture look in Logitech's compiles | the monochrome look, five pictures, for skins 71 and 73; a 600 compile also holds the five of the 700's 2021 and 2023 colour look. The look goes with the model and not the compile's year: one of the two 600 compiles is of 2026 and still draws its own | read from configurations, sections 330 and 363 |
| how Logitech's pictures are drawn | all grey, within one step on every pixel, using the full depth of shades: evidence of what their artists drew for, not of the panel | read from configurations, section 387 |
| what a colour becomes on the panel | **a grey of its own**: a green, `0x0446`, was seen as "gray but not very dark", so the panel is not one bit. How many shades, and which channels count, is **not measured** | seen at the bench, section 387 |
| what the firmware sends | every pixel unchanged, two bytes in stored order, through one row writer, `0x130B6`, with no arithmetic between; the panel set up selects sixteen bits per pixel, `3A 05`, at every start, so what a colour looks like is decided in the display module | read in the 0.2 image, section 387; the same code as the Harmony 650's 0.2, section 387 |
| the panel's first identity byte, data memory `0x384` | 0, as on the Harmony 650, so the set up takes the variant other than the one for 1; whether 0 is an identity or a byte left unwritten the firmware does not say | measured over USB, section 387 |
| how long it stays lit | "Glow Timing", set in Logitech's software | Logitech's manual, "Setting the backlight timing". On the 650 it is timer 1 of the configuration, measured there, section 292; on Logitech's 600 compiles too the screen light timer carries the glow time, read from configurations, section 347. A configuration of this project's went dark after 20 s, seen at the bench, sections 387, 389 and 391. This row said "on the 600 **not checked**"<!--superseded--> until section 347 |

## What the screen shows

From Logitech's manual, pages 6 and 7, "What's on the Harmony 600's screen":

* **An activity's commands**, beside the side keys, paged with the arrows below the screen.
* **A device list** under the centre key's "Devices", four devices to a page, one in each corner,
  `docs/how-a-harmony-works.md`. The manual's own picture shows the list with "Activity" written at the
  bottom. A second, two row device list is compiled into every configuration of this architecture and
  nothing on the remote opens it; on the 600 its pages draw a single dashed line where the 650 and 700
  draw a cross, section 285 and section 326.
* **Favourite channels** on the Watch TV activity's screen, with icons.
* **The IR status indicator**, which "flashes whenever an IR command is being sent". Where it appears
  is **not checked**.
* **The page counter** `n/m` in the upper right corner.
* **Help's questions**, such as "Did that fix the problem?", page 8.

**Mode 0**, the screen an activity key with no activity opens, reads "Use the Harmony setup software to
add an Activity on this button", with "Exit", read from configurations, section 311. The Harmony 650
shares it; the 700's mode 0 is a charging battery instead.

**The firmware's own screens are fourteen** at the front of the configuration's mode table, as on the
Harmony 650, where the 700 has nineteen, read from configurations, sections 347 and 357: "add an Activity
on this button" and "add Activities" 0 and 1, USB Connected and Low Battery 2 and 3, a blank, Insert
batteries and Unable to charge 4 to 6, Update Successful, Upgrade Successful and a blank 7 to 9, and Ready
to learn, Command Received, a blank and Terminate Entry 10 to 13. The status codes' thirty screens follow
from mode 14, "Go to Website / to update settings" first, section 347.

**"Turning system off"**, the Off screen, was not seen on this model on any run of a configuration of this
project's stating model number 73, and showed very briefly after a boot with the same file stating 71,
seen at the bench, one sighting, section 392; [behaviour.md](behaviour.md) has the runs.

**A configuration of this project's draws the 600 in one look**, every state on one grey, `0x2104`, grey
2 of sixteen steps from black to white, which Logitech's 600 compiles also use among their greys, and
blends its letters' edges into that grey; both judged good on the panel, seen at the bench, sections 387
and 388. The blended letters looked better than the same file unblended, which agrees with the panel
showing shades between black and white, section 387.

## What the screen does not show

**No clock.** The ordinary screen of the Harmony 600, 650 and 700 has no time on it, seen at the bench
on 4 October 2026, `docs/how-a-harmony-works.md`. The 0.2 build keeps the clock in the first seven state
variables, read in the firmware, `docs/memory-map-600.md`, so a clock on this model is checked by
reading memory over USB, never by looking.

## Not checked

* Whether the IR status indicator appears, and where.
* How long the screen stays lit on a Logitech compile for the 600, timed on the remote.
* Whether any battery picture is ever drawn on a 600.
* How many shades the panel shows, and which colour channels count.
