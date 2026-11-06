# Harmony 720: display

A colour screen, 128 pixels wide and 160 tall, the raster of the Harmony 880 and 885, with three keys on each
side of it. What its size is in inches, and how it is lit, is not known here.

## The panel

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | 128 by 160 pixels | `SCREEN_SIZES` in `packages/codec/src/render.ts`, measured from the configurations' full screen pictures |
| raster on the drawing | 128 by 160 | `h720.ts`, which must agree with the row above |
| panel | colour | `packages/usb/src/models.ts` |
| touch | no | `packages/usb/src/models.ts`, and `touch` on the drawing's screen is no |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| | value |
|---|---|
| resolution | 128 by 160, the platform's raster[^s129] |
| full screen pages | six cells of 64 by 42, each the only instruction of its page's program, where the 880 and 885 use eight of 64 by 32[^t-885-screens-corpus] |

**Three cells a side, against the 885's four**, which is the six keys beside the glass: the drawing numbers
them as zones 1 to 6, left then right on each row, top to bottom, as the 885's are numbered.[^t-printing-720]
That a key and the cell beside it belong together is the 885's reading and not checked on a 720.[^unchecked]

**The drawing's glass is 0.8 as wide as it is tall**, the raster's own proportion; the photograph's glass
measures closer to 0.86, which takes in the bezel and the lens rather than the panel alone.[^t-printing-720]

How a configuration draws a page is [screens](../../config-format/screens.md).

## Not checked

* The panel's size and backlight.[^unchecked]

[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^t-885-screens-corpus]: Measured in configurations. [The test](../../../tests/test_harmony_885_screens.py)
[^t-printing-720]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^unchecked]: Not checked.
