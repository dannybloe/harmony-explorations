# Transport

Plugged into a computer, a Harmony One, 525, 600, 650 or 700 shows up as a USB device of the HID kind,
the class keyboards and mice use, but with a vendor defined purpose, so no operating system takes it for an
input device. Everything a host says to it and hears back crosses two endpoints, one in each direction, in
reports of exactly 64 bytes, at most one per millisecond. The remote states all of this itself when it is
plugged in, so this page is quotation rather than inference. Each model's own identity on the bus, its
product id, `bcdDevice` and product string, is on its usb page, such as
[the Harmony One's](../remotes/harmony-one/usb.md) and [the Harmony 600's](../remotes/harmony-600/usb.md).

The Harmony 300, 350 and Touch speak a different protocol over the same kind of link,
[the file protocol](file-protocol.md), and the Harmony 890 and 895 neither,
[their usb page](../architectures/harmony-890-895/usb.md).

## What every remote presents

Read in the descriptors of the Harmony One 3.4 and Harmony 700 2.8 images and measured on a Harmony 600,
and the same in all three[^s19][^t-usbdesc][^s19b]:

| | value |
|---|---|
| USB version | 2.00 |
| interface class | 3, HID, subclass 0, protocol 0 |
| control endpoint packet size | 8 |
| endpoint 1 | interrupt **IN**, 64 bytes, every 1 ms |
| endpoint 2 | interrupt **OUT**, 64 bytes, every 1 ms |
| report descriptor | 33 bytes, usage page `0xFF00`, an input and an output report of 64 bytes, no report id |
| configuration attributes | `bmAttributes 0xC0`, self powered; `bMaxPower 0x32`, 100 mA |

The firmware's own USB set up agrees: endpoint 1 is configured IN only and endpoint 2 OUT only, and the
buffer descriptor for endpoint 1 OUT is never touched anywhere in the Harmony 700 image, which is what an
endpoint descriptor set with no endpoint 1 OUT requires, [the firmware's USB stack](../architectures/harmony-600-650-700/firmware.md#the-usb-stack-inside-the-firmware)[^s19].

## What a host implementation has to get right

* **The endpoint numbering is asymmetric.** IN is endpoint 1 and OUT is endpoint **2**; the endpoint
  descriptors say `81 03 40 00 01` and `02 03 40 00 01`. Code that assumes endpoint 1 in both directions
  will not talk to the remote[^s19][^s19b].
* **64 bytes each way, and no report ids.** The report descriptor declares report size 8 by report count 64
  for both reports and has no Report ID item, so a report is exactly 64 payload bytes. hidapi wants a
  leading report id byte of zero prepended on some platforms; that byte is not part of the
  protocol[^s19][^t-usbdesc].
* **A vendor defined usage page, `0xFF00`.** With interface subclass 0 and protocol 0 this is not a boot
  keyboard or mouse, so no operating system claims the device as an input device. On Linux a non root
  process still needs a udev rule to open it[^t-usbdesc][^unchecked].
* **Interrupt polling at 1 ms** in both directions. One 64 byte report per frame is a ceiling of 62.5 KiB/s
  each way, so reading the Harmony One's 1.6 MiB configuration cannot beat about 26 seconds however
  efficient the command layer is[^s19].
* **The remote draws bus power while charging** whatever its configuration descriptor reports[^unchecked].

## Finding the descriptors in an image

A firmware image carries its descriptors as one block, and `tools/usbdesc.py` finds and decodes it, given an
image and the address it loads at:

```sh
tools/usbdesc.py <image> <load address> --raw
```

Searching for `12 01` alone would be weak, since those two bytes occur in code, so two independent checks
confirm a block[^t-usbdesc]:

1. **The chain walks.** Nine descriptors, each one's `bLength` landing exactly on the start of the next,
   ending where an unrecognised type begins: device, configuration, interface, HID, endpoint, endpoint, then
   three strings.
2. **`wTotalLength` closes.** The configuration descriptor declares `0x29`, 41 bytes, and the configuration,
   interface, HID and two endpoint descriptors are 9 + 9 + 9 + 7 + 7 = 41.

A third check says the block belongs to the image it was found in: the product string states the firmware
version, `Harmony Remote 0-2.8.0` and `Harmony Remote 0-3.4.0`, which the packages the images came from
state too. Where each image keeps its block is pinned in `tests/test_usbdesc.py`[^t-usbdesc].

**A firmware image can hold a second descriptor block that validates as well as the real one**, a
Microchip stock descriptor left in by the USB stack the firmware is built on. The chain walk cannot tell the
two apart, so the block naming Logitech's vendor id is the remote's. The case found is the Harmony 525's,
[its architecture's firmware](../architectures/harmony-5xx/firmware.md)[^s113].

## `bcdDevice` carries the skin, in one of two encodings

The device release number states the remote's skin, the number Logitech gives each model, and **which of
two forms it is in depends on the word's value**, which is also what tells the two firmware generations
apart[^s113][^s195]:

| the word's value | reading | words |
|---|---|---|
| below 1000 | the low byte is the skin in **plain binary**, and the high byte is the protocol | `0x080F` skin 15, `0x0811` skin 17, `0x0916` skin 22 |
| 1000 and above | the **whole word** is BCD of `1000 + skin`, so the high byte is the carry | `0x1054` skin 54, `0x1066` skin 66, `0x1071` skin 71, `0x1072` skin 72, `0x1078` skin 78, `0x1099` skin 99, `0x1104` skin 104 |

Seven pairs are each an image's `bcdDevice` against the skin a configuration of that model states, which is
an independent answer produced by the other half of Logitech's toolchain, and three words were read off
remotes, two checked against the remote's own `/sys/sysinfo` and one against Logitech's product
table[^s195]. The Harmony One and the Harmony 600 are the later form[^s19b][^s113]; the Harmony 525 is the
earlier, a unit enumerating `0x0916`, protocol 9 and skin 22 in plain hex[^s76].

**The two forms are told apart by value and not by the high byte**, because `0x0916` is valid BCD for 916
and still means skin 22: at 1000 and above the word is the whole number, below it the low byte is the skin.
**Only a Harmony 350's `0x1104` separates the whole word reading from reading the low byte alone**, since
every other word of the later generation names a skin below 100 and both readings return it; that remote
states skin 104 through its own `/sys/sysinfo`, which is not a USB field, so the two ends share
nothing[^s195].

**Read as BCD throughout, the rule fails silently on the earlier generation**: `0x0811` read as BCD is 11,
which is a Harmony 655, and the Harmony 880's `0x080F` cannot show it, since `0x0F` is 15 under either
rule. Base slot 1 of a configuration carries the skin as a plain byte on every architecture, so what is BCD
is the USB field alone, which follows the USB specification's own convention for
`bcdDevice`[^s113].

**This matters more than it looks.** The Harmony 600, 650 and 700 share product id `0xC122`, so the product
id does not tell those three apart and the skin does, before a single configuration byte is read. The write
rails in `packages/usb/src/rails.ts` refuse a configuration whose declared version does not match the
remote it is written to, and the skin is part of that comparison[^s113].

The Harmony 890's older form, `0x0A` in the high byte, is not implemented and will not be read off a remote
here, since that platform does not speak this protocol at all, [its usb page](../architectures/harmony-890-895/usb.md)[^s207].

## The one byte the two architectures disagree on

The 33 byte report descriptors of the Harmony One and the Harmony 600 and 700 are identical except one flag
bit: the Harmony 600 and 700's input report is declared `Relative`, `81 06`, and the Harmony One's
`Absolute`, `81 02`. No HID parser interprets a vendor defined report, so it changes nothing; it is
recorded because it is the only difference, which makes it a fingerprint, and it is counted in
`tests/test_usbdesc.py` rather than seen by eye[^s19][^t-usbdesc]. The Harmony 525's report descriptor
differs between its application and its safe mode in one input flag, a different difference,
[its usb page](../architectures/harmony-5xx/usb.md)[^s118].

[^s19]: Read in the firmware. [Section 19](../../docs/findings.md#s19)
[^t-usbdesc]: Read in the firmware. [The test](../../tests/test_usbdesc.py)
[^s19b]: Measured on a unit. [Section 19](../../docs/findings.md#s19)
[^unchecked]: Not checked.
[^s113]: Read in the firmware. [Section 113](../../docs/findings.md#s113)
[^s195]: Measured on a unit. [Section 195](../../docs/findings.md#s195)
[^s76]: Measured on a unit. [Section 76](../../docs/findings.md#s76)
[^s207]: Stated by Logitech, in their client. [Section 207](../../docs/findings.md#s207)
[^s118]: Measured on a unit. [Section 118](../../docs/findings.md#s118)
