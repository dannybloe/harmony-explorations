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

## What the firmware does with a write

Logitech's client writes a configuration to these remotes in seven steps,
[the file protocol](../../usb-protocol/file-protocol.md#writing-a-file-checked-by-the-remote). Nothing in
this library sends any of them, and none has been sent to a remote; what follows is what the 1.4 firmware
does with each, read in the image[^t-harmony-350-file-write].

| step | what the remote does |
|---|---|
| **the file system reset**, `0xFF` with `0x66` | closes whatever file is open, and answers. Nothing it calls erases, writes flash, touches the settings store or changes the configuration's verdict, so a remote whose sequence stops right after it is as it was. It is needed because an open is refused while another file is open, which an interrupted earlier attempt leaves behind |
| **open for writing** | erases before it answers. For `/cfg/usercfg` it ignores the size the host sends, clears the configuration's verdict and erases six 64 KiB blocks from `0x020000`: the 256 KiB the configuration may use and the 128 KiB after it, which on a 512 KiB flash part is the log, [memory.md](memory.md). **The old configuration is gone once the open is sent** |
| **write** | programs each data packet's bytes at a running address that starts at the file's place and moves on by every packet, a packet's length being the low six bits of its second byte. Nothing compares that address with the file's size, so the bound is the writer's |
| **the check**, `0x06` subcommand `0x01` | for `/cfg/usercfg`, tests `GSPM` at the start and `LWJL` at `0x47` and compares the checksum word **stored** at `end_addr - 2` with the expected value the host sends. It recomputes nothing, and the type, seed, offset and length the host sends are parsed and never used. A match answers `m` at byte 7 and sets the verdict; anything else answers `u` |
| **flush**, `0x05` | reads no flag, so "do not validate the region" means nothing to this firmware. For `/fw/normalmode` it stores a request the close turns into a reboot; for a configuration nothing it calls does more than answer |
| **close**, `0x07` | closes the file, through the same routine as the reset |
| **the reboot**, `0xFF` with `0x00` | a processor reset after a short delay, with nothing on the way that writes flash; `0x62` and `0x6E` do the same |

**A writer has to send the whole container, its end marker included.** A read stops four bytes short
because the open for reading states `end_addr - 0x020000` as the size, and the validator a remote runs at
start demands `PTYY` at `end_addr`, which the check does not look at, so an `m` does not prove the marker
arrived. What that validator checks and what a failing configuration does is
[the firmware page](firmware.md#what-validates-the-configuration)[^t-harmony-350-file-write].

**A write that fails half way can be sent again**: no file command waits on the configuration being valid,
so a remote whose configuration was left erased or broken still answers every step of the sequence above,
[recovery](firmware.md#safe-mode-and-recovery)[^t-harmony-350-recovery].

**The firmware refuses no writable row of its file table.** Fourteen rows allow writing, `/fw/bootloader`
and `/fw/safemode` in internal program flash among them, and an open for writing erases what it
opens: 64 KiB blocks of the external flash, or 1 KiB pages of the processor's own program flash for a file
kept there[^t-harmony-350-file-write]. Whether the processor's own write protection would stop that is not
checked[^unchecked]. So a writer for this family opens `/cfg/usercfg` and nothing else.

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
* Anything on a unit about the write: every row of the table above is read in one firmware build, and no
  write, check, flush or reset has been sent to a remote[^unchecked].
* What the check answers for the files whose routines were not read, the firmware images, the
  bootloader and `/sys/sku`[^unchecked].

[^s193]: Measured on a unit. [Section 193](../../../docs/findings.md#s193)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^s262]: Measured on a unit. [Section 262](../../../docs/findings.md#s262)
[^s264]: Measured on a unit. [Section 264](../../../docs/findings.md#s264)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s198]: Stated by Logitech, in their client. [Section 198](../../../docs/findings.md#s198)
[^s201]: Measured on a unit. [Section 201](../../../docs/findings.md#s201)
[^unchecked]: Not checked.
[^t-harmony-350-file-write]: Read in the firmware. [The test](../../../tests/test_harmony_350_file_write.py)
[^t-harmony-350-recovery]: Read in the firmware. [The test](../../../tests/test_harmony_350_recovery.py)
