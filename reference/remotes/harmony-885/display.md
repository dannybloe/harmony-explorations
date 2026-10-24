# Harmony 885: display

A colour screen, 128 pixels wide and 160 tall, which shows the activities, the device list and the pages
of commands a configuration draws. What its size is in inches, and how it is lit, is not known here.

## The panel

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | 128 by 160 pixels | `SCREEN_SIZES` in `packages/codec/src/render.ts`, measured from the configurations' full screen pictures |
| raster on the drawing | no drawing of this model exists yet | `REMOTES` in `packages/silhouettes/bin/remotes.ts` |
| panel | colour | `packages/usb/src/models.ts` |
| touch | no | `packages/usb/src/models.ts` |

Generated from `packages/codec`, `packages/usb` and the model folders' rows by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| | value |
|---|---|
| resolution | 128 by 160, which is the largest picture any screen program draws, the same route that measured every other architecture's display[^s129] |
| full screen pictures | five at 128 by 160 in every configuration of this architecture[^s179] |
| picture sizes | ten distinct ones, 128x160, 128x32, 128x24, 128x8, 64x32, 19x10, 18x10, 17x10, 16x10 and 15x8, the same ten the Harmony 890 and 895 use, where a Harmony 600 and a Harmony One share none of them[^s179] |
| typeface | its own glyph shapes, which a Harmony 890 shares[^s180] |
| colour | colour in the community comparison table; a picture's size says nothing about whether the panel shows colour[^x-forum-table] |

How a configuration draws a page, its pictures and its fonts is [screens](../../config-format/screens.md).

## Not checked

* The panel's size, its colour depth as the panel shows it, and its backlight.[^unchecked]

[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s179]: Measured in configurations. [Section 179](../../../docs/findings.md#s179)
[^s180]: Measured in configurations. [Section 180](../../../docs/findings.md#s180)
[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^unchecked]: Not checked.
