# Harmony 885

An activity based infrared universal remote from Logitech's classic generation, with a colour screen of
128 by 160 pixels, a key of its own for device mode, and 55 keys on the board. The Harmony
880 is the same remote under its other regional name, and this folder describes both. It is architecture
8, whose shared platform is [the architecture folder](../../architectures/harmony-880-885/README.md); this
folder states what is the model's own. Standing words and their meaning are in
[the reference's README](../../README.md).

**Almost nothing in this folder was measured on a unit**: what a Harmony 885 reports on the cable is on
the [USB page](usb.md), and the rest comes from configurations and firmware images other people read off
their remotes and published, and from Logitech's own manuals and services, as each footnote says.

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 15 | Harmony 880 | Harmony 885 | 8 | colour | no | 4.4.2 |
| 17 | Harmony 885 | Harmony 880 | 8 | colour | no | 4.4.2 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 15 is the Harmony 880 and skin 17 the Harmony 885: each configuration's header states its skin, and
the two application images differ in that byte and nowhere else.[^s113][^s114] A community comparison
table records the 880 as `Eur#885`, so the two are one remote with two regional names.[^x-forum-table]

**The two faces are not identical.** The 885's photographs show four teletext colour keys, and the name on
its face is 885.[^x-forum-table] The key tables say the same from inside: an 880's configuration knows 53
key positions where an 885's knows 55, and the two it lacks, scan codes 19 and 60, are the two that a
survey of both circuit boards calls colour buttons the 885 has.[^s177] Whether the 880's face carries the
other two colour keys is not checked.[^unchecked]

## Key numbers

| | value |
|---|---|
| architecture | 8, in each configuration's architecture record and in the firmware's version block[^s182][^s114] |
| USB product id | `0xC110`, the Espresso platform, [usb.md](usb.md)[^s207] |
| `bcdDevice` | `0x0811` on an 885 and `0x080F` on an 880: protocol 8 and the skin in plain binary[^s113] |
| firmware | application 4.4, bootloader 4.0, [firmware.md](firmware.md)[^s114][^s116] |
| screen | 128 by 160 pixels, colour, [display.md](display.md)[^s129] |
| keys | 55 positions on a 4 by 16 lattice on an 885, 53 on an 880, [keys.md](keys.md)[^s144][^s177] |
| devices | at most 15, [features.md](features.md)[^s131] |

## The files

| file | what it holds |
|---|---|
| [keys.md](keys.md) | the key lattice and which positions are populated |
| [display.md](display.md) | the screen |
| [features.md](features.md) | the device limit, learning, what Logitech's service does for it |
| [behaviour.md](behaviour.md) | device mode, as Logitech's manual describes it |
| [hardware.md](hardware.md) | the learning sensor and the keypad wiring |
| [memory.md](memory.md) | what is the model's own, beyond its architecture |
| [firmware.md](firmware.md) | the versions, and the two bytes that make an 880 an 885 |
| [usb.md](usb.md) | its identity on the cable |
| [misc.md](misc.md) | the rest |

[^s113]: Measured in configurations. [Section 113](../../../docs/findings.md#s113)
[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^s177]: Measured in configurations. [Section 177](../../../docs/findings.md#s177)
[^unchecked]: Not checked.
[^s182]: Measured in configurations. [Section 182](../../../docs/findings.md#s182)
[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^s116]: Read in the firmware. [Section 116](../../../docs/findings.md#s116)
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s144]: Read in the firmware. [Section 144](../../../docs/findings.md#s144)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
