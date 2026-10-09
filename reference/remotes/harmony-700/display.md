# Harmony 700: display

A 1.5 inch colour screen, 128 by 128 pixels, with no touch, laid out as the 600's and 650's are: items
beside the four keys that flank it, a page counter, and words above the three keys below it. **It shows no
clock.**

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

| | value | standing and source |
|---|---|---|
| size | 1.5 inch diagonal | Logitech's manual, "LCD Size" |
| resolution | 128 x 128 | Logitech's manual; also measured from the arch 14 configurations' full screen pictures, section 129 |
| colour | "LCD Screen 65,000 Color" | Logitech's manual; Logitech's service, display "colour, 2 by 2", `reference/capabilities.md`. **Not recorded at the bench** |
| pixel format in the configuration | two bytes a pixel, RGB565, high byte first | read from configurations, section 51 |
| picture look in Logitech's compiles | **two colour looks** on skin 66: that of 2021 and 2023 in the published pair, and that of 2026 in the current compiles, which the 650 shares | read from configurations, section 330 |
| how long it stays lit | "Glow Timing", set in Logitech's software | Logitech's manual page 10; Logitech's service, default 20. Which timer holds it on a 700 is **not checked**; on the 650 it is timer 1, section 292 |

## What the screen shows

The 700's manual, pages 6 and 7, describes the same screen as the 600's: an activity's commands beside the
side keys, the device list under the centre key's "Devices", favourite channels on Watch TV, an **IR
status indicator** that "flashes whenever an IR command is being sent", and the page counter in the upper
right corner. The device list's layouts, four to a page in the corners and a compiled two row list
nothing opens, are the architecture's, section 326.

**Mode 0 is a charging battery.** On the 700 the first mode of the configuration draws no text, only a
charging battery, and sets one state variable to 1; the "add an Activity" placeholder an empty activity
key opens is mode 4 instead, read from configurations, sections 311 and 314. That the battery is what the
remote shows while it charges is this reference's reading of the picture and **not checked** at the
bench.

## What the screen does not show

**No clock.** The ordinary screen of the Harmony 600, 650 and 700 has no time on it, seen at the bench on
4 October 2026, `docs/how-a-harmony-works.md`. Where the 2.8 build keeps its clock is **not read**; the
0.2 builds keep it in the first seven state variables, section 310.

## Not checked

* The colour of a 700's panel, as seen.
* What the screen shows while the remote charges.
* Whether the IR status indicator appears, and where.
