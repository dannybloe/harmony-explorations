# Harmony 785: display

A colour screen, the raster of the Harmony 880 and 885 by its architecture. What its size is in inches, and how
it is lit, is not known here.

## The panel

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | 128 by 160 pixels | `SCREEN_SIZES` in `packages/codec/src/screens/render.ts`, measured from the configurations' full screen pictures |
| raster on the drawing | no drawing of this model exists yet | `REMOTES` in `packages/silhouettes/bin/remotes.ts` |
| panel | colour | `packages/base/src/models.ts` |
| touch | no | `packages/base/src/models.ts` |

Generated from `packages/codec`, `packages/usb` and the model folders' rows by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| | value |
|---|---|
| resolution | 128 by 160, the platform's raster[^s129] |

How a configuration draws a page is [screens](../../config-format/screens.md).

## Not checked

* The panel's size and backlight, and how many cells a full screen page has on this model.[^unchecked]

[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^unchecked]: Not checked.
