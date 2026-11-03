# Harmony 515: display

A monochrome screen, 96 pixels wide and 64 tall, in the same glass as the Harmony 525's.[^unchecked]

## The panel

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | 96 by 64 pixels | `SCREEN_SIZES` in `packages/codec/src/render.ts`, measured from the configurations' full screen pictures |
| raster on the drawing | 96 by 64 | `h515.ts`, which must agree with the row above |
| panel | monochrome | `packages/usb/src/models.ts` |
| touch | no | `packages/usb/src/models.ts`, and `touch` on the drawing's screen is no |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## Not checked

* The panel's size and its backlight, and whether the raster is the architecture's on this model, measured
  by a picture of its own.[^unchecked]

[^unchecked]: Not checked.
