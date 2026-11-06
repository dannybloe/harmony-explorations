# Harmony 885

An activity based infrared universal remote from Logitech's classic generation, with a colour screen of
128 by 160 pixels, a key of its own for device mode, and 55 keys on the board. The Harmony
880 is the same remote under its other regional name, and this folder describes both, and the Harmony 880
Pro, skin 39, whose face is the 885's printed otherwise. It is architecture
8, whose shared platform is [the architecture folder](../../architectures/harmony-880-885/README.md); this
folder states what is the model's own. Standing words and their meaning are in
[the reference's README](../../README.md).

**Little in this folder was measured on a unit**: what a Harmony 885 reports on the cable, and what reads
off it, its configuration and its clock, is on the [USB page](usb.md), what its flash holds past the
configuration on the [memory page](memory.md), and the rest comes from configurations and firmware images
other people read off their remotes and published, and from Logitech's own manuals and services, as each
footnote says.

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 15 | Harmony 880 | Harmony 885 | 8 | colour | no | 4.4.2 |
| 17 | Harmony 885 | Harmony 880 | 8 | colour | no | 4.4.2 |
| 39 | Harmony 880 Pro |  | 8 | colour | no | 4.4.2 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 15 is the Harmony 880 and skin 17 the Harmony 885: each configuration's header states its skin, and
the two application images differ in that value, at two offsets, and nowhere else.[^s113][^s114] A community comparison
table records the 880 as `Eur#885`, so the two are one remote with two regional names.[^x-forum-table]

**The two faces are not identical.** The 885's photographs show four teletext colour keys, and the name on
its face is 885.[^x-forum-table] The key tables say the same from inside: an 880's configuration knows 53
key positions where an 885's knows 55, and the two it lacks, scan codes 19 and 60, are the two that a
survey of both circuit boards calls colour buttons the 885 has.[^s177] Pressed on a unit, 19 is Green and
60 Yellow, [keys.md](keys.md#which-key-raises-which-code).[^t-885-keys-u] The 880's face carries none of
the four: at the bottom of the band, where the 885 has them, it has two keys printed with an up and a down
chevron, and it prints `HARMONY TECHNOLOGY` where the 885 prints its name, so each model has a drawing of its
own, [keys.md](keys.md#every-key-on-the-drawings).[^t-printing-880] This said whether the 880's face carries
the other two colour keys was not checked, until the 880's drawing.[^t-printing-880]

**The Harmony 880 Pro's face is the 885's with six keys printed otherwise**: `SOUND` and `PIC` on the two
keys at the ends of the band, and `MUTE`, a down triangle, an up triangle and `PREV` on the four keys at its
foot where the 885 has its colour keys, with `HARMONY 880 PRO` above the screen. Its key table holds the 885's
55 press codes, and it has a drawing of its own, [keys.md](keys.md#harmony-880-pro-skin-39).[^t-printing-880pro][^t-880pro-keys]

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
[^t-885-keys-u]: Measured on a unit. [The test](../../../tests/test_harmony_885_keys.py)
[^t-printing-880]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^t-printing-880pro]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^t-880pro-keys]: Measured in configurations. [The test](../../../tests/test_silhouettes.py)
[^s182]: Measured in configurations. [Section 182](../../../docs/findings.md#s182)
[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^s116]: Read in the firmware. [Section 116](../../../docs/findings.md#s116)
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s144]: Read in the firmware. [Section 144](../../../docs/findings.md#s144)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
