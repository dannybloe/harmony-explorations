# Harmony 300

An infrared universal remote with **no screen**: a Watch TV key, four device keys printed TV, Cable/Sat,
DVD and VCR/Aux, a power key, favourite channel keys and an ordinary keypad. It comes in two printings, the
US one, skin 78, with five favourite keys, and the European one, skin 79, with four and a Teletext key,
[keys.md](keys.md). Press a device key and
every key on the remote controls that one device; press Watch TV and, in Logitech's words, the television
and the set top box switch on together, [behaviour.md](behaviour.md). It runs on two AA batteries and is
set up from a computer over USB.

The Harmony 300 and the Harmony 350 are one remote for configurations, and the [family's folder](../../architectures/harmony-300-350/README.md)
describes them as one: what a configuration can give each, and the one entry that lets a Harmony 300 run a
configuration compiled for a Harmony 350 with eight devices and a long press. This folder holds only what is the
300's own: its printing and keys, its skin, its USB identity and what Logitech's service allows it. How evidence is
marked is in [the reference's README](../../README.md).

**This library never opens it with `openHarmony`**; its configuration is read as a file,
[the family's usb.md](../../architectures/harmony-300-350/usb.md).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 78 | Harmony 300, no record |  | 16, the folder's | no record | no record |  |
| 79 | Harmony 300 EMEA, no record |  | 16, the folder's | no record | no record |  |

Generated from `MODELS_BY_SKIN` and `SKINS_WITHOUT_A_MODEL_RECORD` in `packages/base/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skins 78 and 79 are the Harmony 300 and its European model[^s131].
`SKINS_WITHOUT_A_MODEL_RECORD` in `packages/base/src/models.ts` names both and gives neither a record, for
the reason [the family's README](../../architectures/harmony-300-350/README.md) gives. **A remote reports
its own regional skin, 79, in its `/sys/sysinfo` and its configuration, and the base skin, 78, in its USB
descriptor**[^s195][^s264], [usb.md](usb.md). What decides 78 or 79 on a unit is not
checked[^unchecked].

## Key numbers

Everything the two models share, the architecture, product id, firmware, container, the screen, the devices
and the activity a configuration can hold and the long press, is the family's. The 300's own:

| | value | evidence |
|---|---|---|
| `bcdDevice` | `0x1078`, the family's base skin even on a skin 79 remote | [^s195][^s264] |
| keys | 55, the 350's moulding, in two printings, skin 78's and skin 79's; each key raises the code of the 350 key in the same place, 49 heard so on a skin 79 remote, [keys.md](keys.md#scan-codes) | [^t-moulding], [^t-harmony-350-keys-c], [^t-harmony-300-keys-u] |
| what Logitech's service gives it | 4 devices, no long press, no `Activities` capability, 4 favourite channels for skin 79 and 5 for skin 78: choices of the service, not limits of the remote, [the family's table](../../architectures/harmony-300-350/README.md#what-still-differs) and [features.md](features.md) | [^s265b] |

## The files

| file | what it holds |
|---|---|
| [keys.md](keys.md) | the keys, the two printings and how each differs from the 350's, the two drawings |
| [features.md](features.md) | what Logitech's service states for this model |
| [behaviour.md](behaviour.md) | what the guide says it does, and what was heard of its keys |
| [usb.md](usb.md) | `bcdDevice` and the skin it misnames |
| [display.md](display.md), [hardware.md](hardware.md), [memory.md](memory.md), [firmware.md](firmware.md), [misc.md](misc.md) | the family's, with a line each on what the 300 adds |

## Not checked

* Which key sends which scan code on a skin 78 remote, and what its colour keys send against what they
  print. On a skin 79 remote 49 keys were pressed and heard, [keys.md](keys.md#scan-codes); this line
  covered the whole model until then.
* What decides skin 78 or 79 on a unit.

[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^s264]: Measured on a unit. [Section 264](../../../docs/findings.md#s264)
[^unchecked]: Not checked.
[^t-moulding]: Measured on a unit. [The test](../../../packages/silhouettes/test/models.test.ts)
[^s265b]: Stated by Logitech, by their service. [Section 265](../../../docs/findings.md#s265)
[^t-harmony-350-keys-c]: Measured in configurations. [The test](../../../tests/harmony_300_350/test_harmony_350_keys.py)
[^t-harmony-300-keys-u]: Measured on a unit. [The test](../../../tests/harmony_300_350/test_harmony_300_keys.py)
