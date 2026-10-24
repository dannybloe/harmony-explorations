# Harmony 300 and 350: USB

These remotes plug into a computer with a USB cable, and the computer treats them as a small set of
**files**: it asks for a file by its path, such as the one holding the configuration, and gets its bytes.
That is a different protocol from the command protocol of the Harmony One and the Harmony 600, 650 and
700. The protocol itself is [the file protocol](../../usb-protocol/file-protocol.md), from Logitech's own
specification; this file states what holds for both models and what this library does with them.

## Identity

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC124, file based | `FILE_BASED_PRODUCTS` in `packages/usb/src/transport.ts`, and the model's row in `REMOTES` |
| flash addresses and escape sub commands | none: a file based remote is read by file name, and `openHarmony` refuses it | `isFileBasedRemote` in `packages/usb/src/transport.ts` |

Generated from `packages/usb` and `REMOTES` in `packages/silhouettes/bin/remotes.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

The product id comes from `FILE_BASED_PRODUCTS` in `packages/usb/src/transport.ts`, which lists `0xC124` as
"Harmony 300, and measured here on a Harmony 350"; the command protocol's profiles hold no entry for this
family.

* **One product id for both models**, `046D:C124`[^s193][^s195].
* **`bcdDevice` is BCD of 1000 plus a skin**, `0x1104` on a 350[^s195], so the skin can be read from a
  listing without opening the device. On a Harmony 300 it names the family's base skin and not a unit's
  regional one, [the 300's usb.md](../../remotes/harmony-300/usb.md).
* `/sys/sysinfo` answers its architecture and skin, `arch 0x10 skin 0x68` on a 350 and skin `0x4F` on a
  300[^s262][^s264]. Its field names are strings in the firmware, listed as `SYSINFO_FIELDS` in
  `packages/usb/src/filepipe.ts`, which no archive section or test holds[^unchecked]. The `guid` field and `/sys/guid` identify a unit and never leave the terminal.

## The protocol

* A packet is `FF`, a command, a sequence number, a count and parameters. Commands: ping, open, write,
  read, commit, device control, close, a bus command and a control family whose members reset the
  filesystem and reboot[^s198], [the file protocol](../../usb-protocol/file-protocol.md).
* A request names a file by path; an open reply carries a handle and a big endian size, and a file's
  stated size is its only end, packets padding with NUL. Logitech's client states it[^s198], and it was
  confirmed on a Harmony Touch[^s200][^s201].

## What this library does with these models

The rows below describe this library's code, which is their evidence; the footnotes name the measurement
each rests on.

| | where |
|---|---|
| **`openHarmony` refuses them**: `isHarmony` excludes every id in `FILE_BASED_PRODUCTS`, and `make remotes` reports them separately[^s193] | `packages/usb/src/transport.ts` |
| **`openFileBasedRemote` reads them**, allowing a bare ping, an open for reading, a read and a close, and only for the paths on `INERT_PATHS`, which include `/cfg/usercfg`[^s200] | `packages/usb/src/filepipe.ts` |
| opening any other path needs `HARMONY_FILE_PATH_EXPERIMENT=1`, a door that exists because on this family **a path can be an action**: a Harmony Touch's `/sys/factoryreset` and `/sys/reboot` open for reading[^s200] | `packages/usb/src/filepipe.ts` |
| **no write, commit, device control or filesystem reset is implemented**, and this architecture is on none of the write lists | `packages/usb/src/rails.ts` |
| a configuration is read this way off both models, the end marker appended, [memory.md](memory.md)[^s262][^s264] | `packages/usb/src/filepipe.ts` |

## Not checked

* The unread files, `/sys/battery` and `/cfg/log` among them, on these two models[^unchecked].
* The packet length these models use; it was 64 on a Harmony Touch only[^s200].

[^s193]: Measured on a unit. [Section 193](../../../docs/findings.md#s193)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^s262]: Measured on a unit. [Section 262](../../../docs/findings.md#s262)
[^s264]: Measured on a unit. [Section 264](../../../docs/findings.md#s264)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s198]: Stated by Logitech, in their client. [Section 198](../../../docs/findings.md#s198)
[^s201]: Measured on a unit. [Section 201](../../../docs/findings.md#s201)
[^unchecked]: Not checked.
