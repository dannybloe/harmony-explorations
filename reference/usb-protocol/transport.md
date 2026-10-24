# Transport

## 1. The transport

Every byte of every command crosses one of two interrupt endpoints, 64 bytes at a time. The
remote states all of it at enumeration, so this section is quotation rather than inference.

| | Harmony One 3.4 | Harmony 700 2.8 | Harmony 600 0.2 |
|---|---|---|---|
| Source | image | image | **live device** |
| Descriptor block at | `0x2E38E` | `0x1B7C6` | past the dump's truncation |
| USB version | 2.00 | 2.00 | 2.00 |
| Vendor and product | `046D:C121` | `046D:C122` | `046D:C122` |
| `bcdDevice` | `0x1054` | `0x1066` | `0x1071` |
| Interface class | 3 (HID), subclass 0, protocol 0 | same | same |
| Control endpoint packet size | 8 | 8 | 8 |
| Endpoint 1 | interrupt IN, 64 bytes, 1 ms | same | same |
| Endpoint 2 | interrupt OUT, 64 bytes, 1 ms | same | same |
| Report descriptor | 33 bytes at `0x2E42D` | 33 bytes at `0x1B865` | 33 bytes, identical to the 700's |
| Product string | `Harmony Remote 0-3.4.0` | `Harmony Remote 0-2.8.0` | `Harmony Remote 0-0.2.0` |

Read it with:

```sh
tools/usbdesc.py 700-2.8-Region_2-code-base0x9000.bin 0x9000 --raw
```

### What a host implementation has to get right

* **The endpoint numbering is asymmetric.** IN is endpoint 1, OUT is endpoint **2**. The
  device descriptors say `81 03 40 00 01` and `02 03 40 00 01`, so this is not a symmetric
  pair and code that assumes endpoint 1 in both directions will not talk to the remote.
  Measured on the bench remote as well, see below.
* **64 bytes each way, and no report ids.** The report descriptor declares report size 8 by
  report count 64 for both the input and the output report, and contains no Report ID item.
  So a report is exactly 64 payload bytes. hidapi wants a leading report id byte of zero
  prepended on some platforms; that byte is not part of the protocol.
* **Vendor defined usage page `0xFF00`.** With interface subclass 0 and protocol 0 this is
  not a boot keyboard or mouse, so no operating system claims the device as an input
  device. On Linux a udev rule is still needed for a non-root process to open it.
* **Interrupt polling at 1 ms** in both directions. One 64 byte report per frame is a
  ceiling of 62.5 KiB/s per direction, so reading the Harmony One's 1.6 MiB config cannot
  beat about 26 seconds however efficient the command layer is.
* The configuration descriptor reports `bmAttributes 0xC0`, self powered, and `bMaxPower
  0x32`, so 100 mA. It draws bus power while charging regardless.

### Two closures that make the location trustworthy

Finding a descriptor block by searching for `12 01` alone would be weak: those two bytes
occur in code. Two independent checks confirm the block:

1. **The chain walks.** Nine descriptors, each one's `bLength` landing exactly on the start
   of the next, ending where an unrecognised type begins. Both images give the same nine:
   device, configuration, interface, HID, endpoint, endpoint, then three strings.
2. **`wTotalLength` closes.** The configuration descriptor declares `0x29`, 41 bytes, and
   the configuration, interface, HID and two endpoint descriptors are 9 + 9 + 9 + 7 + 7 = 41.

A third check confirms the block belongs to the image it was found in rather than to some
other firmware sharing the file: the product string states the firmware version, 2.8.0 and
3.4.0, which was already known from the package each image was extracted from.
### `bcdDevice` carries the skin, in one of two encodings

The device release number states the remote's skin, and **which of two forms it is in depends on the
word's value**, which is also what tells the two firmware generations apart.[^s113] Seven pairs, each an
image's `bcdDevice` against a `<SKIN>` a config of that model states, which is an independent oracle
produced by the other half of Logitech's toolchain, plus three words read off remotes, two whose oracle
is the remote's own `/sys/sysinfo` and one Logitech's product table:[^s195]

| the word's value | reading | words |
|---|---|---|
| below 1000 | the low byte is the skin in **plain binary**, and the high byte is the protocol | `0x080F` skin 15, `0x0811` skin 17, `0x0916` skin 22[^s76] |
| 1000 and above | the **whole word** is BCD of `1000 + skin`, so the high byte is the carry | `0x1054` skin 54, `0x1066` skin 66, `0x1071` skin 71, `0x1072` skin 72, `0x1078` skin 78, `0x1099` skin 99, `0x1104` skin 104 |

**The two forms are separated by value, not by high byte**, section 195, because `0x0916` is valid BCD
for 916 and means skin 22: at 1000 and above the word is the whole number, below it the low byte is
the skin and the high byte the protocol. **Only a Harmony 350's `0x1104` separates the whole word
reading from reading the low byte alone**, since every other word on this generation names a skin
below 100 and both readings return it. That remote states skin 104 through its own `/sys/sysinfo`,
which is not a USB field, so the two ends of the closure share nothing.

`0x0A` for the 890 is still the obvious entry for the older form and still deliberately not
implemented, because no arch 10 firmware exists here to check it against. **And since section 207
there is a second reason that is not going away**: the Harmony 890 platform does not speak this
protocol at all, so nothing here will ever read that word off a remote. Its skin comes out of a
config's own header.

**This document said "read as BCD" without qualification until 10 August 2026**, and so did three<!--superseded-->
copies of the code. It is right for arch 12 and arch 14 and wrong for arch 8 and arch 9, and the
failure is silent: `0x0811` read as BCD is 11, which is a Harmony 655. The 880 could not have
exposed it, because `0x0F` is 15 under either rule. `docs/findings.md` section 113, which also
records why the two generations differ: base slot 1 carries the skin as a plain byte everywhere, so
what is BCD is the USB field, following the specification's own convention for `bcdDevice`.

This is more useful than it sounds. **The 600 and the 700 share product id `0xC122`**, so the
product id does not identify an arch 14 model, and the skin does, before a single config byte
is read. It is directly load bearing for the write rails in `CLAUDE.md`, where a write
must refuse to proceed unless the config's `INTENDEDVERSION` matches the connected remote's
skin.

The arch 14 case was recorded here as a prediction before it was checked: the Harmony 600 should
report `bcdDevice 0x1071`, because that remote is skin 71. **Measured, and it does.**

**The Harmony 525 is the remote that showed the rule is generation specific.** Before one was read, the
two remotes measured, a Harmony One at `0x1054` and a Harmony 600 at `0x1071`, fitted a constant `0x10`
followed by the skin in BCD, which would make the 525 `0x1022`. A unit enumerates `0x0916`, protocol 9 and
skin 22 in plain hex, so the `0x10` plus BCD reading belongs to the later generation.[^s76]

**A firmware image can hold a second descriptor block that validates as well as the real one**, a
Microchip stock descriptor left in by the USB stack the firmware is built on. The chain walk cannot tell
the two apart, so the block naming Logitech's vendor id is the remote's. The case found is the Harmony
525's, [its architecture's firmware.md](../architectures/harmony-5xx/firmware.md).[^s113]

### The one byte the two architectures disagree on

The 33 byte report descriptors are identical except a single flag bit: the arch 14 input
report is declared `Relative` (`81 06`) and the arch 12 one `Absolute` (`81 02`). No HID
parser interprets a vendor defined blob, so it changes nothing. Recorded because it is the
only difference, which makes it a fingerprint, and because "identical except one byte" is the
sort of claim worth counting rather than eyeballing. It is counted in
`tests/test_usbdesc.py`.

[^s113]: Read in the firmware. [Section 113](../../docs/findings.md#s113)
[^s195]: Measured on a unit. [Section 195](../../docs/findings.md#s195)
[^s76]: Measured on a unit. [Section 76](../../docs/findings.md#s76)
