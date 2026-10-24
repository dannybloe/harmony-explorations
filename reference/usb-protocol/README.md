# Talking to a Harmony over USB

A Harmony that plugs into a computer is programmed over that cable. What crosses it depends on the
remote, and there are three families:

* **The command protocol**, spoken by the Harmony 525, the Harmony One and the Harmony 600, 650 and 700. The
  computer sends short reports that ask the remote what it is, read or write bytes of its flash at an
  address, erase a block, read or write a small item, or start learning an infrared code. Most of these
  pages are about this protocol.
* **The file protocol**, spoken by the Harmony 300, 350 and Touch. The computer opens a file on the remote
  by its name and reads or writes it, and never sees an address, [the file protocol](file-protocol.md).
* **A tunnelled protocol**, spoken by the Harmony 890 and 895, which wraps a datagram protocol inside the
  USB channel. None of these pages applies to it, [its usb page](../architectures/harmony-890-895/usb.md)[^s207].

Underneath the first two the link is the same: a vendor defined HID device with one endpoint each way and
reports of 64 bytes.

## Pages

| page | what it holds |
|---|---|
| [Transport](transport.md) | how a remote presents itself when plugged in: its descriptors, its endpoints, and how `bcdDevice` carries the model |
| [Commands](commands.md) | every request of the command protocol and its reply, how an address picks a memory, the hazards of a read, a write and a configuration write |
| [The version block](version-block.md) | what a remote says it is: firmware, hardware, flash chip, architecture, mode, skin, platform |
| [The bootloader](bootloader.md) | the separate flash programming protocol a Harmony One or 600 speaks before its firmware starts |
| [The file protocol](file-protocol.md) | the protocol of the Harmony 300, 350 and Touch |

What a particular remote answers is on its architecture's usb page, [the Harmony 525](../architectures/harmony-5xx/usb.md),
[the Harmony One](../architectures/harmony-one/usb.md), [the Harmony 600, 650 and 700](../architectures/harmony-600-650-700/usb.md),
[the Harmony 300 and 350](../architectures/harmony-300-350/usb.md) and [the Harmony Touch](../architectures/harmony-touch/usb.md),
and on each model's usb page. What `packages/usb` refuses, and which writes it allows on which
architecture, is `packages/usb/src/rails.ts`, generated into each architecture's usb page.

## Where it comes from

**The command protocol is read out of the firmware**: the Harmony One 3.4 and Harmony 700 2.8 images
first, then the Harmony 600, 650 and 525 images, and every part a host relies on has since been run against
remotes of each architecture[^s19][^s19b][^s76]. The executable form of most of it is
`tests/test_usb_firmware.py`, which reads each claim back out of the images, and
`packages/usb/src/protocol.ts`, which is the library built from it.

**It has been checked against Logitech's own client on the wire.** A capture of Logitech's classic client
reading a Harmony One sends nothing but the reset escape, the version request and flash reads, and every
one of its 1312 requests is byte for byte what `packages/usb` builds, [the classic client](../logitech/classic-client.md)[^s210].

**concordance was read after the fact, as corroboration and never as the source**: its code is GPLv3 and
this repository is MIT, so its code is not read for structure or copied, and it has documented defects on
exactly the Harmony One and Harmony 600, 650 and 700 architectures. Its hidapi backend's packet length of
64 agrees with the 64 byte reports. It matches Harmony remotes by vendor `0x046D` and a product id **range**,
`0xC110` to `0xC14F`, rather than by exact id, so it cannot speak to the Harmony 600 and 700 sharing
`0xC122`; the remotes' own descriptors are the better evidence there[^x-concordance]. Three of the names
its header gives the small item selectors are wrong for these remotes, [the commands](commands.md#read_misc-and-live-ram-over-usb)[^s19][^s246].

**The file protocol is stated by Logitech** in its client's per model templates, and its read path has been
driven on a Harmony Touch, a Harmony 350 and a Harmony 300[^s198][^s200].

[^s207]: Stated by Logitech, in their client. [Section 207](../../docs/findings.md#s207)
[^s19]: Read in the firmware. [Section 19](../../docs/findings.md#s19)
[^s19b]: Measured on a unit. [Section 19](../../docs/findings.md#s19)
[^s76]: Measured on a unit. [Section 76](../../docs/findings.md#s76)
[^s210]: Measured on a unit. [Section 210](../../docs/findings.md#s210)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s246]: Read in the firmware. [Section 246](../../docs/findings.md#s246)
[^s198]: Stated by Logitech, in their client. [Section 198](../../docs/findings.md#s198)
[^s200]: Measured on a unit. [Section 200](../../docs/findings.md#s200)
