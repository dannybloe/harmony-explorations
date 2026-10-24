# Harmony One: USB

What a computer can ask a Harmony One over its cable, and what this library lets it do. The command
protocol itself is [the USB protocol reference](../../usb-protocol/README.md), and the rails are
`packages/usb/src/rails.ts`; this page states what holds on this architecture and links there for the
rest. How the remote presents itself on the bus, its product id and version block, is the model's,
[harmony-one/usb.md](../../remotes/harmony-one/usb.md).

## Identity

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC121 | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | 0x40, so external flash ends at 0x400000 | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | 0x01, 0x02, 0x03 | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## Commands, as this architecture answers them

* **Reads**: `GET_VERSION`, and `READ_FLASH` over the external flash and both internal pages. An odd count
  of internal bytes never terminates and hangs the remote, so `packages/usb` refuses one
  everywhere[^s94][^s96].
* **The internal offset bound is `0xFFF8`** in this firmware, where the Harmony 600 and 700's is `0xFFC0`;
  `packages/usb` applies `0xFFC0` to both, which is stricter here and so safe[^s175].
* **Live data memory**: `READ_MISC` selector 7 answers, and the remote is running its configuration while
  it does, so the clock ticks and the light band, its saved state and its cached level agree with each
  other through base slot 15[^s111]. The battery is selector `0x0C`[^s212].
* **The escape** dispatches `0x01`, which ends a session, and `0x02` and `0x03`, which restart; it has no
  `0x05`[^s97].
* **`WRITE_MISC`** services eight selectors, four of which do nothing here. `0x02` drops the cached
  region descriptors and writes no flash; `0x0A`, the learn and restart command of other models, does
  nothing[^s97][^s246].
* **A write** is an announce, unanswered data packets and an acknowledged end, in transfers of 3150
  bytes[^s175][^s245]. The remote restarts itself afterwards, because it runs its configuration out of the
  flash an erase clears[^s247][^s251].
* **Logitech's classic client reading a Harmony One**, captured on the wire, sends what this project's
  encoder sends, 1312 of 1312 requests, and verifies every byte it writes[^s210][^s211].
* **A read failure of the form "expected 0xbf, got 0x14"** is the host dropping queued reports, not the
  remote[^s223].

## Write standing

<!-- generated:write-rails -->
| path | open on this architecture | list |
|---|---|---|
| erase and write a configuration block | yes | `ARCHITECTURES_WITH_A_WRITE_TARGET` |
| drop the cached region descriptors, `WRITE_MISC` 0x02 | yes | `ARCHITECTURES_WITH_AN_INVALIDATE_TARGET` |
| restart, the escape's 0x02 | yes | `ARCHITECTURES_WITH_A_RESET_TARGET` |
| write a byte of data memory, `WRITE_MISC` 0x07 | yes | `ARCHITECTURES_WITH_A_RAM_WRITE_TARGET` |
| append to the settings store | no | `ARCHITECTURES_WITH_A_SETTINGS_WRITE_TARGET`, `SETTINGS_WRITE_READ_ON` |
| ask safe mode to install the staged firmware | no | `ARCHITECTURES_WITH_A_REINSTALL_TARGET`, `REINSTALL_MAX_IMAGE`, `STATUS_BYTE_READ_ON_APPLICATION` |

Every row also needs `HARMONY_ENABLE_WRITES=1`, its own named door where it has one, and the unit check on the identity block. Which **unit** may be written is not in this table and cannot be: an architecture names a kind of remote, and the unit check compares the identity block read off the remote with a record of a permitted unit kept outside this repository.

Generated from `packages/usb/src/rails.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

A configuration write, the drop and the restart have each been sent to a Harmony One[^s222][^s247][^s251].

## Not checked

* What the firmware serves for an internal read whose offset lies between `0xFFC0` and its own bound
  of `0xFFF8`, since `packages/usb` never sends one[^unchecked].
* Whether a byte of data memory has ever been written to a Harmony One through `WRITE_MISC` selector
  `0x07`, the one open path no archive section records as sent[^unchecked].

[^s94]: Read in the firmware. [Section 94](../../../docs/findings.md#s94)
[^s96]: Read in the firmware. [Section 96](../../../docs/findings.md#s96)
[^s175]: Read in the firmware. [Section 175](../../../docs/findings.md#s175)
[^s111]: Measured on a unit. [Section 111](../../../docs/findings.md#s111)
[^s212]: Read in the firmware. [Section 212](../../../docs/findings.md#s212)
[^s97]: Read in the firmware. [Section 97](../../../docs/findings.md#s97)
[^s246]: Read in the firmware. [Section 246](../../../docs/findings.md#s246)
[^s245]: Read in the firmware. [Section 245](../../../docs/findings.md#s245)
[^s247]: Measured on a unit. [Section 247](../../../docs/findings.md#s247)
[^s251]: Measured on a unit. [Section 251](../../../docs/findings.md#s251)
[^s210]: Measured on a unit. [Section 210](../../../docs/findings.md#s210)
[^s211]: Measured on a unit. [Section 211](../../../docs/findings.md#s211)
[^s223]: Measured on a unit. [Section 223](../../../docs/findings.md#s223)
[^s222]: Measured on a unit. [Section 222](../../../docs/findings.md#s222)
[^unchecked]: Not checked.
