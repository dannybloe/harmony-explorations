# Harmony 300

An infrared universal remote with **no screen**: a Watch TV key, four device keys printed TV, Cable/Sat,
DVD and VCR/Aux, a power key, favourite channel keys and an ordinary keypad. It comes in two printings, the
US one, skin 78, with five favourite keys, and the European one, skin 79, with four and a Teletext key,
[keys.md](keys.md). Press a device key and
every key on the remote controls that one device; press Watch TV and, in Logitech's words, the television
and the set top box switch on together, [behaviour.md](behaviour.md). It runs on two AA batteries and is
set up from a computer over USB.

The Harmony 300 is the Harmony 350 with **half the devices and no long press**: the same moulding, the
same firmware, four device keys that each hold one device rather than two. What the two share is stated
once in [the family's folder](../../architectures/harmony-300-350/README.md), and this folder states what
is the 300's own. How evidence is marked is in [the reference's README](../../README.md).

**This library never opens it with `openHarmony` and never writes to it**; its configuration is read as a
file, read only, [the family's usb.md](../../architectures/harmony-300-350/usb.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 78 | Harmony 300, no record |  | 16, the folder's | no record | no record |  |
| 79 | Harmony 300 EMEA, no record |  | 16, the folder's | no record | no record |  |

Generated from `MODELS_BY_SKIN` and `SKINS_WITHOUT_A_MODEL_RECORD` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skins 78 and 79 are the Harmony 300 and its European model[^s131].
`SKINS_WITHOUT_A_MODEL_RECORD` in `packages/usb/src/models.ts` names both and gives neither a record, for
the reason [the family's README](../../architectures/harmony-300-350/README.md) gives. **A remote reports
its own regional skin, 79, in its `/sys/sysinfo` and its configuration, and the base skin, 78, in its USB
descriptor**[^s195][^s264], [usb.md](usb.md). What decides 78 or 79 on a unit is not
checked[^unchecked].

## Key numbers

The figures that are the family's link to its folder; the rest are the 300's own.

| | value | evidence |
|---|---|---|
| architecture, product id, firmware, container | the family's | [the family's README](../../architectures/harmony-300-350/README.md) |
| `bcdDevice` | `0x1078`, the family's base skin even on a skin 79 remote | [^s195][^s264] |
| screen | **none** | [^t-no-screen]; [display.md](display.md) |
| keys | 55, the 350's moulding, in two printings, skin 78's and skin 79's; each key raises the code of the 350 key in the same place, 49 heard so on a skin 79 remote, [keys.md](keys.md#scan-codes) | [^t-moulding], [^t-harmony-350-keys-c], [^t-harmony-300-keys-u]; [keys.md](keys.md) |
| devices | **4**, one per device key, and every configuration holds four infrared groups | [^s264c][^s264b] |
| activities | no `Activities` capability, only `PartiallySetupActivities`; at most one, a power on shortcut | [^s265b]; [features.md](features.md) |
| favourite channels | 4 for skin 79; 5 for skin 78 | [^s265b] for 79; [^unchecked] for 78 |
| long press | **none** | [^t-long-press] |

## The files

| file | what it holds |
|---|---|
| [keys.md](keys.md) | the keys, the two printings and how each differs from the 350's, the two drawings |
| [display.md](display.md) | none |
| [features.md](features.md) | Logitech's statement, devices, the activity question, favourites |
| [behaviour.md](behaviour.md) | what the remote does in use |
| [hardware.md](hardware.md) | what is known of the inside, which is the family's |
| [memory.md](memory.md) | what of the configuration is the 300's own |
| [firmware.md](firmware.md) | the shared 1.4 image |
| [usb.md](usb.md) | `bcdDevice` and the skin it misnames |
| [misc.md](misc.md) | everything else |

## Not checked

* Which key sends which scan code on a skin 78 remote, and what its colour keys send against what they
  print. On a skin 79 remote 49 keys were pressed and heard, [keys.md](keys.md#scan-codes); this line
  covered the whole model until then.
* What decides skin 78 or 79 on a unit.

[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^s264]: Measured on a unit. [Section 264](../../../docs/findings.md#s264)
[^unchecked]: Not checked.
[^t-no-screen]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^t-moulding]: Measured on a unit. [The test](../../../packages/silhouettes/test/models.test.ts)
[^s264c]: Stated by Logitech, by their service. [Section 264](../../../docs/findings.md#s264)
[^s264b]: Measured in configurations. [Section 264](../../../docs/findings.md#s264)
[^s265b]: Stated by Logitech, by their service. [Section 265](../../../docs/findings.md#s265)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^t-harmony-350-keys-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_keys.py)
[^t-harmony-300-keys-u]: Measured on a unit. [The test](../../../tests/test_harmony_300_keys.py)
