# Harmony 885: display

A colour screen, 128 pixels wide and 160 tall, which shows the activities, the device list and the pages
of commands a configuration draws. What its size is in inches, and how it is lit, is not known here.

## The panel

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | 128 by 160 pixels | `SCREEN_SIZES` in `packages/codec/src/screens/render.ts`, measured from the configurations' full screen pictures |
| raster on the drawing | 128 by 160 | `h885.ts`, which must agree with the row above |
| panel | colour | `packages/base/src/models.ts` |
| touch | no | `packages/base/src/models.ts`, and `touch` on the drawing's screen is no |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| | value |
|---|---|
| resolution | 128 by 160, which is the largest picture any screen program draws, the same route that measured every other architecture's display[^s129] |
| full screen pictures | five at 128 by 160 in every configuration of this architecture[^s179] |
| picture sizes | ten distinct ones, 128x160, 128x32, 128x24, 128x8, 64x32, 19x10, 18x10, 17x10, 16x10 and 15x8, the same ten the Harmony 890 and 895 use, where a Harmony 600 and a Harmony One share none of them[^s179] |
| typeface | its own glyph shapes, which a Harmony 890 shares[^s180] |
| colour | colour in the community comparison table; a picture's size says nothing about whether the panel shows colour[^x-forum-table] |

How a configuration draws a page, its pictures and its fonts is [screens](../../config-format/screens.md).
This model's firmware draws with eleven instructions and no others: one of them inverts a rectangle, an
instruction only this platform's configurations use, the firmware lets a fill's width and column window run to
column 159, past the panel's 128 columns, with what the display does there not checked, and text has no two byte
codes.[^t-885-screens]

**The device list labels the eight keys beside the screen**, two columns of four, each label in its key's cell.
A device's own pages draw its name as a title only when there is one page of them, so a device that no state
variable of the configuration names is named on its device list row, which can be the only place the
configuration states its name. How a reader takes a device's name is [activities and devices](../../config-format/activities-and-devices.md#which-devices-a-configuration-drives-and-what-each-one-is-called).[^t-arch8-devices]

**Each context the Devices key is pressed in shows its own copy of the device list**, one per activity and one
outside every activity, each listing every device, and a page's cells, labels, separators and counter sit where
[a page of the Harmony 880 and 885](../../config-format/screens.md#a-page-of-the-harmony-880-and-885) says.[^t-side-keys]

## Not checked

* The panel's size, its colour depth as the panel shows it, and its backlight.[^unchecked]

[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s179]: Measured in configurations. [Section 179](../../../docs/findings.md#s179)
[^s180]: Measured in configurations. [Section 180](../../../docs/findings.md#s180)
[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^unchecked]: Not checked.
[^t-885-screens]: Read in the firmware. [The test](../../../tests/test_harmony_885_screens.py)
[^t-arch8-devices]: Measured in configurations. [The test](../../../packages/codec/test/arch8devicelist.test.ts)
[^t-side-keys]: Measured in configurations. [The test](../../../packages/codec/test/sidekeysdevice.test.ts)
