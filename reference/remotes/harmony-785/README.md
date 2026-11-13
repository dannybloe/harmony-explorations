# Harmony 785

An activity based universal remote from Logitech's classic generation, on the platform of the Harmony 880 and
885, with a colour screen. It is architecture 8, whose shared platform is
[the architecture folder](../../architectures/harmony-880-885/README.md); this folder states what is the model's
own. Standing words and their meaning are in [the reference's README](../../README.md).

**What is known was read off two Harmony 785s over USB**: their version blocks, their configurations and their
whole flash. How one behaves in a person's hand is not recorded here.[^t-785-first-read]

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 45 | Harmony 785 | Harmony 720 | 8 | colour | no | 4.4.2 |

Generated from `MODELS_BY_SKIN` in `packages/base/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**Skin 45**, in the version block and the USB descriptor of both remotes read, and in their configurations'
base slot 1.[^t-785-first-read] The model table names the Harmony 720, skin 44, its regional twin, as a
community comparison table does[^x-forum-table], and the 785's application is the 720's 4.5 with ten bytes
changed; but the 785's manual names
teletext keys the 720's does not, so the faces differ and the 720 has a folder of its own,
[the Harmony 720](../harmony-720/README.md).[^t-printing-720]

## Key numbers

| | value |
|---|---|
| architecture | 8, in the version block and the configuration[^t-785-first-read] |
| USB product id | `0xC110`, `bcdDevice` `0x082D`, [usb.md](usb.md)[^t-785-first-read] |
| firmware | the Harmony 720's application 4.5 with ten bytes changed, the skin among them; the bootloader differs between remotes, [firmware.md](firmware.md)[^t-785-first-read] |
| flash | `0x49` from manufacturer `0x01`, the 885's part, [memory.md](memory.md)[^t-785-first-read] |
| screen | colour, 128 by 160 pixels by the platform's raster, [display.md](display.md)[^s129] |
| devices | at most 12 by the model table, not checked on a 785, [features.md](features.md)[^unchecked] |

## The files

| file | what it holds |
|---|---|
| [keys.md](keys.md) | the 53 keys on the drawing and the key table |
| [display.md](display.md) | the screen |
| [features.md](features.md) | the device limit |
| [behaviour.md](behaviour.md) | nothing measured yet |
| [hardware.md](hardware.md) | the flash part and the hardware versions read |
| [memory.md](memory.md) | what its flash holds, region by region |
| [firmware.md](firmware.md) | the application and the two bootloaders |
| [usb.md](usb.md) | its identity on the cable |
| [misc.md](misc.md) | the rest |

[^t-785-first-read]: Measured on a unit. [The test](../../../tests/harmony_880_885/test_harmony_785_first_read.py)
[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^t-printing-720]: Stated by Logitech, in the manual. [The test](../../../tests/firmware/test_silhouettes.py)
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^unchecked]: Not checked.
