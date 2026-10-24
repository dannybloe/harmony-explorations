# Harmony 525: USB

A 525 plugs into a computer as a USB device of Logitech's with a product id of its own, and a host reads
and writes it with the same short commands as the later remotes, fewer of them implemented. The
protocol, the command set and the write rails are the architecture's, [the architecture's
usb.md](../../architectures/harmony-5xx/usb.md); this page states what is the 525's own.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC111 | `PROFILES` in `packages/corpus/src/read.ts` |
| flash top bytes accepted | 0x80 to 0x87, so external flash is 0x800000 to 0x880000 | `ARCH9_FLASH_TOP_MIN` and `ARCH9_FLASH_TOP_MAX` in `packages/usb/src/protocol.ts` |
| the other windows | 0x00 internal-program-memory below 0x8000, 0x20 eeprom below 0x0100, 0x30 arch9-tag-30 below 0x0008, 0x40 data-memory below 0x0800 | `ARCH9_WINDOWS` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | none read | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| field | value |
|---|---|
| vendor and product id | `046D:C111`, its own[^s76] |
| `bcdDevice` | `0x0916`: protocol 9 and skin 22 in plain hex[^s76][^s195] |
| product string | `Harmony Remote 0-3.0.0`,[^s76] and `Harmony Safe Mode!` in safe mode[^s118] |
| version block | `27 30 25 12 ff 90 16 09`: seven fields[^s76] |
| identity block | EEPROM, protocol address `0x200010`. The values are one remote's and never appear here[^s268] |

**The skin is readable without opening the device**, from `bcdDevice`'s low byte.[^s195] Whether the other
models of this architecture share the product id is not checked.[^unchecked] Enumeration does not tell
safe mode from the application: only the product string does.[^s118]

## What a host can read and what it cannot

* **Content answers in every window but one**: internal flash, the EEPROM and the external flash, with
  the configuration, both stored firmware images and the configuration region above the
  configuration.[^s76][^s119b][^s268][^s270]
* **The data memory window answers zeros**, whatever the memory holds.[^s137]
* **`READ_MISC` serves selector 1 alone.** Every other selector, the data memory read selector 7 among
  them, sends back two bytes the firmware has just cleared, so it answers zeros.[^s90] Selector 1 returns
  a parameter by index, and what it answers on a running remote has not been read with a decoder that
  takes the right byte of its reply, [the architecture's
  usb.md](../../architectures/harmony-5xx/usb.md#read_misc-and-why-there-is-no-live-memory-read).[^s90b]
* **A configuration block can be erased and written back**, verified by reading it again, and the
  blocks either side are untouched.[^s269] The restart and the data memory write are refused on this
  architecture; the architecture's usb.md has the write standing and the reasons.

## Not checked

* What `READ_MISC` selector 1 answers on a running 525, decoded correctly; a third party reports
  parameter 0 moving with the clock.[^unchecked]
* A learn capture.[^unchecked]

[^s76]: Measured on a unit. [Section 76](../../../docs/findings.md#s76)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^s118]: Measured on a unit. [Section 118](../../../docs/findings.md#s118)
[^s268]: Measured on a unit. [Section 268](../../../docs/findings.md#s268)
[^unchecked]: Not checked.
[^s119b]: Measured on a unit. [Section 119](../../../docs/findings.md#s119)
[^s270]: Measured on a unit. [Section 270](../../../docs/findings.md#s270)
[^s137]: Measured on a unit. [Section 137](../../../docs/findings.md#s137)
[^s90]: Read in the firmware. [Section 90](../../../docs/findings.md#s90)
[^s90b]: Measured on a unit. [Section 90](../../../docs/findings.md#s90)
[^s269]: Measured on a unit. [Section 269](../../../docs/findings.md#s269)
