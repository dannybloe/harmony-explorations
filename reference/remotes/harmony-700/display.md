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
| how long it stays lit | "Glow Timing", set in Logitech's software | Logitech's manual page 10; Logitech's service, default 20. On the 650 it is timer 1, section 292; on Logitech's 700 compiles too the screen light timer carries the glow time, read from configurations, section 347. A configuration of this project's went dark about 20 seconds after the last key, judged by eye at the bench, section 383. This row said "Which timer holds it on a 700 is **not checked**"<!--superseded--> until section 347 |

## What the screen shows

The 700's manual, pages 6 and 7, describes the same screen as the 600's: an activity's commands beside the
side keys, the device list under the centre key's "Devices", favourite channels on Watch TV, an **IR
status indicator** that "flashes whenever an IR command is being sent", and the page counter in the upper
right corner. The device list's layouts, four to a page in the corners and a compiled two row list
nothing opens, are the architecture's, section 326.

**Modes 0 to 3 are a charging battery.** On the 700 the first four modes of the configuration draw no
text, only a battery under a lightning bolt filled a quarter, a half, three quarters and full, and each sets
one state variable to 1; mode 9 draws a full battery with a tick, and "Please charge your remote", mode 8,
an empty battery with a forbidden sign. The "add an Activity" placeholder an empty activity key opens is
mode 4 instead, read from configurations, sections 311, 314 and 383. That the four are what the remote
shows while it charges is seen at the bench: on one USB charger they showed instead of "USB Connected", and on
a phone charger no charging screen showed. By the firmware, they show only after a test of the cable's data
lines passes, which a computer never lets run, section 384. Logitech's own configuration showed no charging
screen either in the cases tried, on a phone charger with charged cells, with defective ones, with none,
with one flat and one full, and with the cable put in while the screen was dark, seen at the bench, section
383; it was not run on the charger that showed them.

**The firmware's own screens are nineteen** at the front of the configuration's mode table, where the 600
and 650 have fourteen, read from configurations, sections 347 and 357: the four charging frames 0 to 3, "add
an Activity on this button" and "add Activities" 4 and 5, USB Connected and Low Battery 6 and 7, "Please
charge your remote" 8, a blank, Insert batteries and Unable to charge 9 to 11, Update Successful, Upgrade
Successful and a blank 12 to 14, and Ready to learn, Command Received, a blank and Terminate Entry 15 to 18.
The status codes' thirty screens follow from mode 19. **Four timers of 2 seconds each**, on the 700 alone,
enter the frames in turn, 1, 2, 3 and back to 0, which is the battery filling up, read from configurations,
section 347.

**The battery pictures are the model's.** Logitech's five 700 compiles of 2026 draw them byte for byte alike,
"Please charge your remote" being the Harmony 650's battery blank picture exactly, and the two older compiles,
of 2021 and 2023, draw the same subjects in other artwork, by eye, read from configurations, section 382.

**"Turning system off"**, the Off screen, showed for a moment on All Off with the mark it waits for at 1,
and not with it at 0, seen at the bench, section 386; [behaviour.md](behaviour.md) has the runs.

## What the screen does not show

**No clock.** The ordinary screen of the Harmony 600, 650 and 700 has no time on it, seen at the bench on
4 October 2026, `reference/how-a-harmony-works.md`. The 2.8 build keeps the clock where the 0.2 builds do, in
the first seven state variables, which sit at `0x900 + n` on this build: a read of data memory over USB
found the clock there, measured, section 386, and the state variables' place is read in the firmware,
section 384. So a clock on this model is checked by reading memory over USB, never by looking. This said
"Where the 2.8 build keeps its clock is **not read**"<!--superseded--> until section 386.

## Not checked

* The colour of a 700's panel, as seen.
* Whether the IR status indicator appears, and where.
