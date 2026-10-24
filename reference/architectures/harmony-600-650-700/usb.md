# Harmony 600, 650 and 700: USB

A computer talks to these remotes over USB in short reports of 64 bytes: it asks for the version, reads
and writes flash, and reads a few things the running remote holds. The command protocol is
[the USB protocol reference](../../usb-protocol/README.md) and the rails that refuse writes are
`packages/usb/src/rails.ts`. This file states what holds for all three models and links there for the
rest.

## Identity

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC122 | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | 0x20, so external flash ends at 0x200000 | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | 0x01, 0x02, 0x03, 0x05 | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

* **One product id for three models**, measured on all three. Nothing on the bus separates them but the
  skin in the version block and, per remote, the identity block[^s281][^s295].
* `bcdDevice` is BCD of 1000 plus the skin, measured on a 600 as `0x1071`,
  [the transport](../../usb-protocol/transport.md)[^s302]. The 650's 0.2 build carries `0x1072` in its
  device descriptor[^s392]; on the 650's bus and on the 700 it is not checked[^unchecked].
* The model number in the version reply is the build's own constant: 71 in the 600's 0.2 and 72 in the
  650's[^s392].
* The version block's twelve bytes: firmware, hardware, flash id, architecture in field 4's high nibble,
  skin and platform, [the version block](../../usb-protocol/version-block.md#get_versions-twelve-bytes)[^s57].
* Safe mode answers as software type 4, the application as 0[^s87].

## Commands

The same seven commands as every image, [the command table](../../usb-protocol/commands.md#the-command-table),
with handler addresses given for the 600's 0.2 and the 700's 2.8. Two additions are this architecture's
alone:

* **`0x10` with a payload is a second command family**, [below](#0x10-with-a-payload-is-a-second-command-family-arch-14-only):
  its first payload byte selects a state, `0xB2` reads a setting, `0xB3` writes the settings store, `0xB1`
  any byte of data memory and `0xBD` a word of program memory[^s304]. **Only `0x10` bare and `0x13 0xB2`
  pass the read only allow list**; the write is behind its own rail, `assertSettingsWriteAllowed`, and has
  been sent to a Harmony 600 only[^s305].
* The escape dispatches a sub command `0x05` that the Harmony One's does not, `ESCAPE_SUB_COMMANDS`.

**Live data memory reads**, `READ_MISC` selector 7, work on this architecture, measured on a 650[^s283],
and the state variables read on the cable are live on all three: on a 600 its delays, its running clock
and the Off screen's mark[^s303][^s387], and on a 700 its clock[^s386]. An earlier reading that a 600 on
the cable had not loaded its configuration read five journal variables, another kind[^s110], and is not
a reason to distrust such a read[^s387].

**The battery voltage can be read over USB**, `READ_MISC` selector `0x0C` detail 1: two bytes, high byte
first, in millivolts, measured under load and so a little below what a meter shows on the cells[^s340].
The firmware implements it on the 600 and 700 images and on the 650's build[^s212][^s340b]; it has been
sent to a 650 only, and the 600 and 700 have not been asked[^unchecked]. Logitech's client offers the
reading for the Harmony One alone, so on these three models it is not a product feature[^s212b]. Detail 0
is one byte from a fixed data memory address; any other detail answers whatever the previous command left
behind, which is why `packages/usb` refuses it[^s212].

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

Every row also needs `HARMONY_ENABLE_WRITES=1`, its own named door where it has one, and the unit check on the identity block. Which **unit** may be written is not in this table and cannot be: an architecture names a kind of remote, and the unit check compares the identity block read off the remote with a record of a permitted unit kept outside this repository.

Generated from `packages/usb/src/rails.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**Builds**: the configuration writer refuses a commit on a build whose cache drop and restart have not
been read: 0.2 on the 600 and 650, 2.8 on the 700, `packages/corpus/bin/write-config.ts`[^s282][^s299].

**What a write does here that it does not do on the Harmony One**: the cache drop arms the next erase, and
an erase at exactly `0x030000` then may update setting `0x80` in the settings store, which on both
remotes read would write nothing[^s282]. And the remote does not execute its configuration in place: a
650's first write, an erase and a write with no restart sent, left it on the bus[^s281].

## Not checked

* `bcdDevice` as the bus reports it on the 650 and 700[^unchecked].
* The settings read and write on the 650 and 700[^unchecked].
* The data memory, program memory and action queue members of the `0x1N` family, read and never
  sent[^unchecked].

### `0x10` with a payload is a second command family, arch 14 only

**`GET_VERSION` is the bare `0x10`.** On the Harmony 600, 650 and 700 a nonzero length nibble turns it
into something else: the first payload byte becomes the command state when it lies in `0x10` to `0x35`
or `0xA0` to `0xC5`, and on the 700's 2.8 also `0xD0` to `0xD6`. Twenty of those states have an argument
parser and 54 an executor[^s304]. Read so far:

| request | what it does | evidence |
|---|---|---|
| `0x13 0xB2 hi lo` | read setting `lo` of the settings store, the latest record winning | [^s304] |
| `0x14 0xB3 hi lo value` | write it, appending a record to the two 1 KiB blocks from internal `0x01EC00` | [^s304] |
| `0x14 0xB1 hi lo byte` | write a byte anywhere in data memory, twelve bits of address, at parse time and unchecked | [^s304] |
| `0x13 0xB0 hi lo` | read a byte of data memory | [^s304] |
| `0x12 0xB9 byte` | write the byte to data memory `0x200` | [^s304] |
| `0x11 0xBD` | program `0xFFFE` into internal `0x01F6C0` when that word's bit 0 is set | [^s304] |
| `0x14 0x34 opcode hi lo` | push the action instruction `opcode` with operand `hi lo` onto the forty slot action queue, at parse time, through the push the configuration's own instructions take; on the 600 and 650 0.2, the 650 0.4 and the 700 2.5 and 2.8; read and never sent | [^s326] |

`hi` must be 0 for `0xB2` and `0xB3`: both store routines refuse a setting of `0xFF` or more[^s304]. A
settings read answers seven bytes, `0xF0 0x11 0xB2 0x01 0x01 0x01 value`, **measured on a Harmony 600**
with all 41 delay settings agreeing with a whole read of its store; the fourth byte is 4 for a command
that clears the firmware's flag, and `0xF0 0x0E` answers a byte outside the ranges[^s304b]. **A settings
write answers `0xF0 0x11 0xB3 0x01 0x01 0x01 0x00` on success**, measured on a Harmony 600 with four
writes[^s305b]; a failure answers 4 in the fourth byte and the append's code in the seventh, 5 for a
setting of `0xFF` or more, 6 for no active block, 7 for a read back mismatch, and 4 for a full store only
after the firmware has copied it, then erased and formatted both blocks, and still found no room. A write
carrying the value the setting holds writes nothing and answers success, and so does a write onto the
block's last record, which the firmware follows with a copy and an erase[^s305]. It reaches a remote only
through `HarmonyRemote.writeSettings`, behind `HARMONY_ENABLE_WRITES=1` and `HARMONY_SETTINGS_WRITE=1`.

The Harmony One's handler reads no payload. **The transport's allow list passes `0x10` bare and the
settings read `0x13 0xB2`, and nothing else in the family**, because keying on the high nibble had let
`0xB3`, `0xB1` and `0xBD` through as reads[^s304]. Most of the other states are unread[^unchecked].

[^s281]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^s295]: Measured on a unit. [Section 295](../../../docs/findings.md#s295)
[^s302]: Measured on a unit. [Section 302](../../../docs/findings.md#s302)
[^s392]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^unchecked]: Not checked.
[^s57]: Read in the firmware. [Section 57](../../../docs/findings.md#s57)
[^s87]: Read in the firmware. [Section 87](../../../docs/findings.md#s87)
[^s304]: Read in the firmware. [Section 304](../../../docs/findings.md#s304)
[^s305]: Read in the firmware. [Section 305](../../../docs/findings.md#s305)
[^s283]: Measured on a unit. [Section 283](../../../docs/findings.md#s283)
[^s303]: Measured on a unit. [Section 303](../../../docs/findings.md#s303)
[^s387]: Measured on a unit. [Section 387](../../../docs/findings.md#s387)
[^s386]: Measured on a unit. [Section 386](../../../docs/findings.md#s386)
[^s110]: Measured on a unit. [Section 110](../../../docs/findings.md#s110)
[^s340]: Measured on a unit. [Section 340](../../../docs/findings.md#s340)
[^s212]: Read in the firmware. [Section 212](../../../docs/findings.md#s212)
[^s340b]: Read in the firmware. [Section 340](../../../docs/findings.md#s340)
[^s212b]: Stated by Logitech, in their client. [Section 212](../../../docs/findings.md#s212)
[^s282]: Read in the firmware. [Section 282](../../../docs/findings.md#s282)
[^s299]: Read in the firmware. [Section 299](../../../docs/findings.md#s299)
[^s326]: Read in the firmware. [Section 326](../../../docs/findings.md#s326)
[^s304b]: Measured on a unit. [Section 304](../../../docs/findings.md#s304)
[^s305b]: Measured on a unit. [Section 305](../../../docs/findings.md#s305)
