# Harmony 720

An activity based universal remote from Logitech's classic generation, the smaller sibling of the Harmony
880 and 885: a colour screen of 128 by 160 pixels, six keys beside it, and 49 keys in all. It is
architecture 8, whose shared platform is [the architecture folder](../../architectures/harmony-880-885/README.md);
this folder states what is the model's own. Standing words and their meaning are in
[the reference's README](../../README.md).

**Nothing in this folder was measured on a unit.** What is known comes from one configuration and one pair of
firmware images other people read off a Harmony 720 and published, from its product photograph, and from
Logitech's own client, service and manual, as each footnote says.

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 44 | Harmony 720 | Harmony 785 | 8 | colour | no | 4.4.2 |

Generated from `MODELS_BY_SKIN` in `packages/base/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Logitech's live service names skin 44 the Harmony 720, and its classic client places skin 44 on the Espresso
platform, beside the 880 and 885.[^s131][^s207] The application image read off one says skin 44 in its
version block.[^t-885-boot]

**The Harmony 785, skin 45, is not this folder's.** A community comparison table pairs the 720 with the 785
as one remote under two regional names[^x-forum-table], but the two faces differ: the 785's manual names
teletext keys and the 720's does not, as the 885 differs from the 880.[^t-printing-720] Nothing of a 785 is
known beyond its name and that page.[^unchecked]

## Key numbers

| | value |
|---|---|
| architecture | 8, the Espresso platform, in Logitech's client[^s207] |
| USB product id | `0xC110`, the Espresso platform, [usb.md](usb.md)[^s207] |
| firmware | application 4.5 and bootloader 4.2, builds of its own, [firmware.md](firmware.md)[^t-885-boot] |
| screen | 128 by 160 pixels, colour, [display.md](display.md)[^s129][^t-885-screens-corpus] |
| keys | 49, on the face and in the configuration's key table, [keys.md](keys.md)[^t-720-keys] |
| devices | at most 12, [features.md](features.md)[^s136] |

## The files

| file | what it holds |
|---|---|
| [keys.md](keys.md) | the drawing, and the key table's 49 press codes |
| [display.md](display.md) | the screen |
| [features.md](features.md) | the device limit and the favourite channels |
| [behaviour.md](behaviour.md) | nothing measured yet |
| [hardware.md](hardware.md) | nothing measured yet |
| [memory.md](memory.md) | where its build keeps the key held |
| [firmware.md](firmware.md) | the versions |
| [usb.md](usb.md) | its identity on the cable |
| [misc.md](misc.md) | the rest |

[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^t-885-boot]: Read in the firmware. [The test](../../../tests/test_harmony_885_bootloader.py)
[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^t-printing-720]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^unchecked]: Not checked.
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^t-885-screens-corpus]: Measured in configurations. [The test](../../../tests/test_harmony_885_screens.py)
[^t-720-keys]: Measured in configurations. [The test](../../../tests/test_silhouettes.py)
[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
