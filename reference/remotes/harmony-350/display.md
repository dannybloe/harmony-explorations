# Harmony 350: display

**The Harmony 350 has no screen.** Its setup guide draws and describes none[^x-manual], and the drawing
here has none[^t-silhouette]. It is one of the three models without one, with the Harmony 300 and 200,
and a remote without a screen holds a single activity,
[how a Harmony works](../../how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity).

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | none: no entry for architecture 16 | `SCREEN_SIZES` in `packages/codec/src/render.ts` |
| raster on the drawing | no screen on the drawing | `h350.ts` |
| panel | no record | `packages/usb/src/models.ts` |
| touch | no record | `packages/usb/src/models.ts`, and `touch` on the drawing's screen is no |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

What it shows instead: **the device keys light** while an infrared command is being sent, and after Watch
TV is pressed the remote should be kept pointed at the devices "until the Device buttons turn off"[^x-manual].

The remote runs a clock that steps the minute and, on every configuration read, never moves the hour or
the date, the whole family's, and nothing on a 350 could show it,
[the architecture's memory.md](../../architectures/harmony-300-350/memory.md#the-state-variables), which
also has the four output pins every configuration switches on the variable the firmware raises while it
sends, a fit for the device keys lighting.

## Not checked

* Any light other than the device keys.

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 350 setup guide](https://www.logitech.com/assets/51207/harmony-350-qsg-and-iid.pdf)
[^t-silhouette]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
