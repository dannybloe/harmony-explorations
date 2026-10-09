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
| picture look in Logitech's compiles | the monochrome look, five pictures, for skins 71 and 73; a 600 compile also holds the five of the 700's 2021 and 2023 colour look | read from configurations, section 330 |
| how long it stays lit | "Glow Timing", set in Logitech's software | Logitech's manual, "Setting the backlight timing". On the 650 it is timer 1 of the configuration, measured there, section 292; on the 600 **not checked** |

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

## What the screen does not show

**No clock.** The ordinary screen of the Harmony 600, 650 and 700 has no time on it, seen at the bench
on 4 October 2026, `docs/how-a-harmony-works.md`. The 0.2 build keeps the clock in the first seven state
variables, read in the firmware, `docs/memory-map-600.md`, so a clock on this model is checked by
reading memory over USB, never by looking.

## Not checked

* Whether the IR status indicator appears, and where.
* How long the screen stays lit as Logitech compiles it for the 600, and which timer sets it.
* Whether any battery picture is ever drawn on a 600.
