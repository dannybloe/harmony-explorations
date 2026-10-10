# Harmony 600, 650 and 700: USB

The command protocol is `docs/usb-protocol.md` and the rails are `packages/usb/src/rails.ts`, with the
argument in `CLAUDE.md`'s "Never write to a remote". This file states what holds for all three models
and links there for the rest.

## Identity

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC122 | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | 0x20, so external flash ends at 0x200000 | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | 0x01, 0x02, 0x03, 0x05 | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

* **One product id for three models**, measured on all three bench units. Nothing on the bus separates
  them but the skin in the version block and, per unit, the identity block, section 281.
* `bcdDevice` is BCD of 1000 plus the skin, measured on the 600 as `0x1071`, `docs/usb-protocol.md`
  section 1. On the 650 and 700 **not checked**.
* The version block's twelve bytes: firmware, hardware, flash id, architecture in field 4's high nibble,
  skin and platform, `docs/usb-protocol.md` "GET_VERSION's twelve bytes" and section 57.
* Safe mode answers as software type 4, the application as 0.

## Commands

The same seven commands as every image, `docs/usb-protocol.md` "The command table", with handler
addresses given for the 600's 0.2 and the 700's 2.8. Two arch 14 only additions:

* **`0x10` with a payload is a second command family**, `docs/usb-protocol.md` and section 304: its first
  payload byte selects a state, `0xB2` reads a setting, `0xB3` writes the settings store, `0xB1` any byte
  of data memory and `0xBD` a word of program memory. **Only `0x10` bare and `0x13 0xB2` pass the read
  only allow list**; the write is behind its own rail, `assertSettingsWriteAllowed`, and has been sent
  to the Harmony 600 only, section 305.
* The escape dispatches a sub command `0x05` that the Harmony One's does not, `ESCAPE_SUB_COMMANDS`.

**Live data memory reads**, `READ_MISC` selector 7, work on this architecture, measured on the 650,
section 283. Section 110 measured the configuration not loaded while a 600 was on the cable; the two
are not reconciled anywhere, see the 650's [usb.md](../../remotes/harmony-650/usb.md).

**The battery voltage can be read over USB**, `READ_MISC` selector `0x0C` detail 1: two bytes, high
byte first, in millivolts, measured under load and so a little below what a meter shows on the cells.
The firmware implements it on the 600 and 700 images and on the 650's build, section 212 and section
340; it has been sent to the 650 only, and the 600 and 700 have not been asked. Logitech's client
offers the reading for the Harmony One alone, so on these three models it is not a product feature.
Detail 0 is one byte from a fixed data memory address; any other detail answers whatever the previous
command left behind, which is why `packages/usb` refuses it.

## Write standing

<!-- generated:write-rails -->
| path | open on this architecture | list |
|---|---|---|
| erase and write a configuration block | yes | `ARCHITECTURES_WITH_A_WRITE_TARGET` |
| drop the cached region descriptors, `WRITE_MISC` 0x02 | yes | `ARCHITECTURES_WITH_AN_INVALIDATE_TARGET` |
| restart, the escape's 0x02 | yes | `ARCHITECTURES_WITH_A_RESET_TARGET` |
| write a byte of data memory, `WRITE_MISC` 0x07 | no | `ARCHITECTURES_WITH_A_RAM_WRITE_TARGET` |
| append to the settings store | yes, on builds 0.2 | `ARCHITECTURES_WITH_A_SETTINGS_WRITE_TARGET`, `SETTINGS_WRITE_READ_ON` |
| ask safe mode to install the staged firmware | yes, at most 89088 bytes; from a running application on builds 2.5, 2.8 | `ARCHITECTURES_WITH_A_REINSTALL_TARGET`, `REINSTALL_MAX_IMAGE`, `STATUS_BYTE_READ_ON_APPLICATION` |

Every row also needs `HARMONY_ENABLE_WRITES=1`, its own named door where it has one, and the unit check on the identity block. Which **unit** may be written is not in this table and cannot be: an architecture names a kind of remote, and the unit check compares the identity block read off the remote with the lab's record of a permitted unit.

Generated from `packages/usb/src/rails.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**Units**: all three bench units of this architecture are write targets, the 650 since 27 September
2026 and the 600 and 700 since 29 September, the project owner's decisions, `CLAUDE.md`. The configuration writer
further refuses a commit on a build whose cache drop and restart have not been read: 0.2 on the 600 and
650, 2.8 on the 700, `packages/corpus/bin/write-config.ts`.

**What a write does here that it does not do on the Harmony One**: the cache drop arms the next erase,
and an erase at exactly `0x030000` then may update setting `0x80` in the settings store, which on both
units read would write nothing, section 282. And the remote does not execute its configuration in place:
the 650's first write, an erase and a write with no restart sent, left it on the bus, section 281.

## Not checked

* `bcdDevice` on the 650 and 700.
* The settings read and write on the 650 and 700.
* The data memory, program memory and action queue members of the `0x1N` family, read and never sent.
