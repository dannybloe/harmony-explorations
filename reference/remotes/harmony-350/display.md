# Harmony 350: display

**The Harmony 350 has no screen.** Logitech's service states its display as none,
`reference/capabilities.md`, and its manual draws none. It is one of the three screenless models, with the
Harmony 300 and 200, `docs/how-a-harmony-works.md`.

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
TV is pressed the remote should be kept pointed at the devices "until the Device buttons turn off",
Logitech's manual.

A configuration still carries a clock record and the firmware a month end routine, section 322; whether
the remote keeps a running clock is **not checked**, and nothing could show one.

## Not checked

* Any light other than the device keys.
