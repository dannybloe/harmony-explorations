# Harmony 785: display

A colour screen, the raster of the Harmony 880 and 885 by its architecture. What its size is in inches, and how
it is lit, is not known here.

## The panel

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | 128 by 160 pixels | `SCREEN_SIZES` in `packages/codec/src/screens/render.ts`, measured from the configurations' full screen pictures |
| raster on the drawing | 128 by 160 | `h785.ts`, which must agree with the row above |
| panel | colour | `packages/base/src/models.ts` |
| touch | no | `packages/base/src/models.ts`, and `touch` on the drawing's screen is no |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| | value |
|---|---|
| resolution | 128 by 160, the platform's raster[^s129] |

**Three keys on each side of the glass**, as on the Harmony 720, whose face this is above the transport keys:
the drawing numbers them as zones 1 to 6, left then right on each row, top to bottom, and takes the 720's
glass, 0.8 as wide as it is tall, the raster's own proportion.[^t-printing-785] That a key and the cell beside it
belong together is the 885's reading and not checked on a 785.[^unchecked]

How a configuration draws a page is [screens](../../config-format/screens.md).

## Not checked

* The panel's size and backlight, and how many cells a full screen page has on this model.[^unchecked]

[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^t-printing-785]: Stated by Logitech, in the manual. [The test](../../../tests/firmware/test_silhouettes.py)
[^unchecked]: Not checked.
