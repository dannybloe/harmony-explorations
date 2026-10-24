# Harmony 890: display

A colour screen, 128 pixels wide and 160 tall, the same as the Harmony 880's and 885's. What its size is
in inches, and how it is lit, is not known here.

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
| resolution | 128 by 160 on configurations of both skins, the largest picture in each picture bank, which is how the other architectures' displays were measured too[^s179] |
| full screen pictures | five at 128 by 160 in each, as in every Harmony 880 and 885 configuration[^s179] |
| picture sizes | the same ten as the Harmony 880 and 885: 128x160, 128x32, 128x24, 128x8, 64x32, 19x10, 18x10, 17x10, 16x10 and 15x8[^s179] |
| typeface | the Harmony 885's: eight font sets, whose glyph shapes that platform's alphabet names 213 of 237 times, and the Harmony One's none[^s180] |
| colour | colour in the community comparison table; a picture's size says nothing about whether the panel shows colour[^x-forum-table] |

How a configuration draws a page is [screens](../../config-format/screens.md). On this architecture one
screen opcode's operand is wider than elsewhere, [the architecture's memory page](../../architectures/harmony-890-895/memory.md).

## Not checked

* The panel's size and backlight.[^unchecked]

[^s179]: Measured in configurations. [Section 179](../../../docs/findings.md#s179)
[^s180]: Measured in configurations. [Section 180](../../../docs/findings.md#s180)
[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^unchecked]: Not checked.
