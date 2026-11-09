# Harmony 515

An activity based infrared universal remote from Logitech's classic generation, with a monochrome screen of
96 by 64 pixels and four keys beside it that the screen labels. It is architecture 9,[^t-harmony-515] whose
shared platform is [the architecture folder](../../architectures/harmony-5xx/README.md), and its face is the
[Harmony 525's](../harmony-525/README.md) with three differences, [keys.md](keys.md).[^unchecked] This folder
states what is the 515's own. Standing words and their meaning are in [the reference's README](../../README.md).

**What has been measured on a unit is its identity and its firmware**: what it reports on the cable, the
two firmware images it stores, and the model record of a configuration read off it.[^t-harmony-515] Nothing
has been written to one, and everything the 525's folder says about writing applies to the platform and
not yet to this model.

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 67 | Harmony 515 | Harmony 510 | 9 | monochrome | no | 3.4.0 |

Generated from `MODELS_BY_SKIN` in `packages/base/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 67 is measured in a remote's `bcdDevice`, its version block and its firmware image, and in the
configuration read off it.[^t-harmony-515][^t-harmony-515-c] Logitech's client names skin 67 the Harmony 515
and 68 the Harmony 510,[^s207] and the forum table pairs the two as regional names.[^x-forum-table] Whether the
510's face is this one is not checked.[^unchecked]

## Key numbers

| | value |
|---|---|
| architecture | 9, in the version block and in the configuration's architecture record[^t-harmony-515][^t-harmony-515-c] |
| USB product id | `0xC111`, which the Harmony 525 enumerates too, [usb.md](usb.md)[^t-harmony-515] |
| `bcdDevice` | `0x0943`: protocol 9 and skin 67 in plain binary[^t-harmony-515] |
| firmware | application 3.4, [firmware.md](firmware.md)[^t-harmony-515] |
| screen | 96 by 64 pixels, the architecture's raster, [display.md](display.md) |
| keys | 50 on the drawing, the 525's face, [keys.md](keys.md)[^unchecked] |
| devices | at most 5, by the forum table, [features.md](features.md)[^x-forum-table] |

## The files

| file | what it holds |
|---|---|
| [keys.md](keys.md) | the keys, and how the face differs from the 525's |
| [display.md](display.md) | the screen |
| [features.md](features.md) | the device limit |
| [behaviour.md](behaviour.md) | what the remote does for the person holding it |
| [hardware.md](hardware.md) | what is inside |
| [memory.md](memory.md) | what is the model's own, beyond its architecture |
| [firmware.md](firmware.md) | the version, and how the build relates to the 525's |
| [usb.md](usb.md) | its identity on the cable |
| [misc.md](misc.md) | the rest |

[^t-harmony-515]: Measured on a unit. [The test](../../../tests/harmony_5xx/test_harmony_515.py)
[^t-harmony-515-c]: Measured in configurations. [The test](../../../tests/harmony_5xx/test_harmony_515.py)
[^unchecked]: Not checked.
[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
