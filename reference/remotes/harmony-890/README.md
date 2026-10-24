# Harmony 890

An activity based universal remote from Logitech's classic generation, the radio frequency sibling of the
Harmony 880 and 885: a colour screen of 128 by 160 pixels, the same key positions as the 885, and six radio
channels. The Harmony 895 is the same remote under its other regional name, and this folder describes both.
It is architecture 10, whose shared platform is [the architecture folder](../../architectures/harmony-890-895/README.md);
this folder states what is the model's own. Standing words and their meaning are in
[the reference's README](../../README.md).

**Nothing in this folder was measured on a unit, and no firmware image of it exists.** What is known comes
from configurations other people read off two Harmony 890s and one Harmony 895 and published, and from
Logitech's own client and service, as each footnote says.

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 19 | Harmony 890 | Harmony 895 | 10 | colour | no | 4.9.0 |
| 23 | Harmony 895 | Harmony 890 | 10 | colour | no | 4.9.0 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 19 is the Harmony 890 and skin 23 the Harmony 895, each stated in its configuration's own
architecture record, `0a 0a 13 0d` and `0a 0a 17 0d`.[^s182] A community comparison table records the 890
as `Eur#895`, so the two are one remote with two regional names.[^x-forum-table]

## Key numbers

| | value |
|---|---|
| architecture | 10, in each configuration's architecture record[^s182] |
| USB product id | `0xC112`, the Cappuccino platform, which speaks a tunnelled protocol and not the command reports, [usb.md](usb.md)[^s207] |
| firmware | no image exists, [firmware.md](firmware.md)[^s115] |
| screen | 128 by 160 pixels, measured on configurations of both skins, [display.md](display.md)[^s179] |
| keys | the Harmony 885's 55 positions, on a Harmony 895, [keys.md](keys.md)[^s177] |
| radio | six channels, in the community comparison table[^x-forum-table] |
| devices | at most 15, [features.md](features.md)[^x-forum-table] |

## The files

| file | what it holds |
|---|---|
| [keys.md](keys.md) | the key positions, as the configurations state them |
| [display.md](display.md) | the screen |
| [features.md](features.md) | the device limit, the infrared database, what Logitech's service does for it |
| [behaviour.md](behaviour.md) | nothing known yet |
| [hardware.md](hardware.md) | nothing known yet beyond the radio |
| [memory.md](memory.md) | the configurations' size and shape |
| [firmware.md](firmware.md) | that no image exists |
| [usb.md](usb.md) | its identity on the cable |
| [misc.md](misc.md) | the rest |

[^s182]: Measured in configurations. [Section 182](../../../docs/findings.md#s182)
[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^s115]: Measured in configurations. [Section 115](../../../docs/findings.md#s115)
[^s179]: Measured in configurations. [Section 179](../../../docs/findings.md#s179)
[^s177]: Measured in configurations. [Section 177](../../../docs/findings.md#s177)
