# Harmony 880 and 885: USB

A Harmony 880 or 885 speaks the same command protocol over its USB cable as the Harmony 525, the Harmony
One and the Harmony 600, 650 and 700: a host asks for its version, reads its flash by address and writes
it back. That is how other people read its configurations and its firmware off their remotes. This page
says how the remote identifies itself and what its version block holds; the protocol itself is
[the USB protocol](../../usb-protocol/README.md).

A Harmony 885 has answered on a cable, and everything below that the images predicted, it reported; the
rest is read in the firmware images or stated by Logitech's client, as each footnote says. This said no
remote of this architecture had been on a cable<!--superseded--> until one was.[^t-arch8-usb]

## Identity

| | value | source |
|---|---|---|
| vendor and product id | `0x046D:0xC110`, Logitech's **Espresso** platform | [^s207] |
| transport | the HID command reports, the first of the three transports Logitech's classic client knows: it builds the same channel for Espresso as for the Harmony 525's and the Harmony One's platforms | [^s207] |
| `bcdDevice` | `0x080F` on an 880 and `0x0811` on an 885: protocol 8 in the high byte and the skin in **plain binary** in the low, the older of the two forms | [^s113], and the 885's on a unit[^t-usbdesc] |
| endpoints | one HID interface, interrupt IN on endpoint 1 and OUT on endpoint 2, 64 bytes each way every 1 ms, and a 33 byte report descriptor that declares the input report Absolute, as the Harmony One's does | [^t-usbdesc] |
| product string | `Harmony Remote 0-4.4.2` on an 885 | [^t-usbdesc] |

**Read as BCD, the 885's word names the wrong remote**: `0x11` is 17 in binary, the Harmony 885, and 11
in BCD, which is a Harmony 655 in Logitech's model list. The 880's `0x0F` is 15 under either reading, so
the 880 alone could not show the difference. The two forms are told apart by the word's value,
[the transport](../../usb-protocol/transport.md).[^s113]

**This library reads these remotes and writes none of them.** It said it opened none<!--superseded-->
until a Harmony 885 was opened unchanged; what it lacked was an address rule for reads, which it has now.
Its configuration reader still holds no profile for `0xC110`; the generated table in the
[Harmony 885's usb.md](../../remotes/harmony-885/usb.md) states what the code holds.

## Reading flash

**The application checks no address on a read.** `READ_FLASH` parses the address into a 24 bit table
pointer and fetches every byte with one table read; only the erase calls an address check. So a read
past the part is not refused by the remote, and the bound of `0x200000` is the library's, the program
memory space of a PIC18.[^t-arch8-read] What a read above it returns is not checked.[^unchecked] Each
chunk's fetch counts down one byte at a time, so the odd count hang of the Harmony One has no counterpart
in that loop; an odd count on a remote is not measured.[^t-arch8-read][^unchecked]

The command dispatch has the seven cases of the later Harmonys and **no case for the escape**, so neither
the session end nor the restart is reached from it.[^t-arch8-read] Whether another part of the firmware
handles the escape is not checked.[^unchecked] A one byte chunk at `0x000104` or `0x000105` calls a
routine instead of fetching flash; what those return is not checked.[^unchecked]

## The version block

The firmware answers the version request from five constants returned by consecutive `RETLW`
instructions at `0x11C46`, in the order field 0, field 4's low nibble, field 5, field 6, field 4's high
nibble.[^s114]

| field | application, 880 | application, 885 | bootloader, 880 and 885 | what it is |
|---|---|---|---|---|
| 0 | `0x44` | `0x44` | `0x40` | the firmware version, BCD |
| 4, low nibble | 0 | 0 | 3 | the software type: application, or Boot mode |
| 5 | `0x0F` | `0x11` | `0x0F`, `0x11` | the skin, 15 or 17 |
| 6 | `0x08` | `0x08` | 0 | the platform, below |
| 4, high nibble | 8 | 8 | 8 | the architecture |

Read in the two applications[^s114] and the two bootloaders.[^s116] A Harmony 885 running its application
answers `44 21 49 01 80 11 08`, the four predicted fields exactly.[^t-arch8-usb]

**Field 6 names a platform and not an architecture.** It is 8 here, 9 on the Harmony 525, and 12 on both
the Harmony One and the Harmony 600, 650 and 700, and it is the same in a remote's safe mode image as in
its application on those last two, so it reads as the lowest architecture of its platform. That reading
is not confirmed, and nothing depends on it.[^s116]

**In the two bootloaders field 6 is zero**, where the applications carry 8. No safe mode image of this
architecture is known, so whether one would report zero there too is not checked.[^s116][^unchecked] The
mode a remote is in is field 4's low nibble, [the version block](../../usb-protocol/version-block.md).

## Not checked

* Where the version block's hardware version and flash ids come from in the firmware; a Harmony 885
  reports hardware 2.1 and flash `0x49` from manufacturer `0x01`, and which part that is.[^t-arch8-usb][^unchecked]
* Which commands the bootloader dispatches.[^unchecked]

[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^s113]: Read in the firmware. [Section 113](../../../docs/findings.md#s113)
[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^s116]: Read in the firmware. [Section 116](../../../docs/findings.md#s116)
[^unchecked]: Not checked.
[^t-arch8-usb]: Measured on a unit. [The test](../../../tests/test_arch8_usb.py)
[^t-arch8-read]: Read in the firmware. [The test](../../../tests/test_arch8_usb.py)
[^t-usbdesc]: Measured on a unit. [The test](../../../tests/test_usbdesc.py)
