# Harmony 700: USB

How the 700 looks on the cable and what it answers. A remote on USB presents itself with a few
identifying numbers and then answers a small set of commands: read memory, erase and write flash, report
its version, restart. The command set, the rails and the write lists are the architecture's,
[the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md); this page states what is the
700's own and what has been measured on a 700.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC122 | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | 0x20, so external flash ends at 0x200000 | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | 0x01, 0x02, 0x03, 0x05 | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| field | value | evidence |
|---|---|---|
| vendor and product id | `046D:C122`, the same as the Harmony 600 and 650 | [^s281], [^s19] |
| `bcdDevice` | `0x1066` in the 2.8 image's descriptor, [the transport](../../usb-protocol/transport.md); on a remote not read | [^s19], [^unchecked] |
| product string | `Harmony Remote 0-2.8.0` in the 2.8 image | [^s19] |
| firmware | 2.8 after the install from a staged image; 2.5, and 2.3 in safe mode, before it | [^s295], [^s297] |
| software type | 4 in safe mode, 0 running | [^s295], [^s296] |
| flash id | `15:1C`, EON F16, 2 MiB | [^s295] |
| architecture | 14 | [^s295] |
| skin | 66 | [^s295] |
| identity block | at internal `0xFF` `+0xF400`; its values are one remote's serial and are never written here | [^s295] |

**Telling the 700 from the 600 and 650**: product id, architecture and flash id cannot; the skin and
`bcdDevice` can for a person, and the **identity block** is what this project's write rails compare[^d6].

## What a 700 answers

| command | on a 700 | evidence |
|---|---|---|
| `GET_VERSION`, `READ_FLASH` of external flash and both internal pages | answered, read only | [^s295] |
| `WRITE_MISC` selector 6, the update status byte, then the restart | safe mode installs the staged application, [firmware.md](firmware.md) | [^s295] |
| `ERASE_FLASH` and `WRITE_FLASH` of the staging region | takes Logitech's 2.8 image, which then installs | [^s297] |
| `ERASE_FLASH` and `WRITE_FLASH` of configuration blocks | a block written back unchanged; a power on delay changed and put back; whole configurations of nine 64 KiB blocks, each read back byte for byte | [^s300], [^s301], [^s383], [^s386] |
| the cache drop, `WRITE_MISC` selector `0x02`, and the restart | part of the write sequence on 2.8, the drop read on that build first | [^s301], [^s299] |
| `READ_MISC` selector 7, live data memory | the state variables from `0x900` on build 2.8, the clock among them. This row said "never sent to a 700 here"<!--superseded--> until section 386 | [^s386] |
| `WRITE_MISC` selector `0x07`, a RAM write | **refused** on this architecture by the rails, [the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md) | |

**Read in the 2.8 image and not tried on a 700**:

* **The settings read and write**, `0x13 0xB2` and `0x14 0xB3`: the 2.8 build reaches its own append, which
  is unread, [the architecture's firmware.md](../../architectures/harmony-600-650-700/firmware.md). It
  carries the 0.2 builds' gate plus a third range of command states, `0xD0` to `0xD6`, with executors of
  their own[^s304]. Logitech's template for skin 66 carries `0xB2` only as the firmware update status
  read, `B2 06 00`, and none carries `0xB3`[^s305].
* **The charger commands**, a version request with command state `0x1D`, `0x1E` or `0x18` to `0x1C`: `0x1D`
  switches charging on, `0x1E` off, and `0x18` to `0x1C` read the charger flags back[^s384]. The transport
  refuses all seven, and whether Logitech's clients send them is not checked[^unchecked].
* **The battery voltage**, `READ_MISC` selector `0x0C`, implemented in the 700's image[^s212].

The command table's handler addresses in [the command reference](../../usb-protocol/commands.md) are given
for the 700's 2.8 image and the Harmony 600's 0.2.

## Not checked

* `bcdDevice` as the bus reports it on a 700[^unchecked].
* The settings read and write, the charger commands and the battery voltage on a 700[^unchecked].
* Live data memory past the state variables on a 700; the state variables are read[^s386].

[^s281]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^s19]: Read in the firmware. [Section 19](../../../docs/findings.md#s19)
[^unchecked]: Not checked.
[^s295]: Measured on a unit. [Section 295](../../../docs/findings.md#s295)
[^s297]: Measured on a unit. [Section 297](../../../docs/findings.md#s297)
[^s296]: Measured on a unit. [Section 296](../../../docs/findings.md#s296)
[^d6]: Chosen by this project. [Decision 6](../../../docs/decisions.md#d6)
[^s300]: Measured on a unit. [Section 300](../../../docs/findings.md#s300)
[^s301]: Measured on a unit. [Section 301](../../../docs/findings.md#s301)
[^s383]: Measured on a unit. [Section 383](../../../docs/findings.md#s383)
[^s386]: Measured on a unit. [Section 386](../../../docs/findings.md#s386)
[^s299]: Read in the firmware. [Section 299](../../../docs/findings.md#s299)
[^s304]: Read in the firmware. [Section 304](../../../docs/findings.md#s304)
[^s305]: Stated by Logitech, in their client. [Section 305](../../../docs/findings.md#s305)
[^s384]: Read in the firmware. [Section 384](../../../docs/findings.md#s384)
[^s212]: Read in the firmware. [Section 212](../../../docs/findings.md#s212)
