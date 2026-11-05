# Harmony 885: USB

How a Harmony 885 identifies itself on the cable. The protocol it speaks, its version block and the
platform's identity are stated once in [the architecture's USB page](../../architectures/harmony-880-885/usb.md).

## What this library holds for it

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC110 | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | 0x20, so external flash ends at 0x200000 | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | none read | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**The configuration reader knows this product id**, and reads a configuration off from `0x020000` by the
length the configuration's own header states.[^t-read-profile] This said the row read `none` because the
configuration reader held no profile for this architecture<!--superseded-->, until the profile was
added.[^t-read-profile] **The escape row reads `none` because the library holds no entry for this architecture**,
while the firmware handles sub codes `0x01`, `0x02` and `0x03`, the last two a restart,
[the architecture's USB page](../../architectures/harmony-880-885/usb.md#how-a-write-ends).[^t-885-end]
This said the row read `none` because this firmware's dispatch has no escape<!--superseded-->, until the
packet parser was read.[^t-885-end]

## What the remote states

| | value |
|---|---|
| vendor and product id | `0x046D:0xC110`, the Espresso platform[^s207] |
| `bcdDevice` | `0x0811` on an 885 and `0x080F` on an 880, protocol 8 and the skin in plain binary; read as BCD the 885's would name a Harmony 655[^s113] |
| version block | firmware 4.4, software type 0, skin 17, field 6 `0x08`, architecture 8, from the application's own constants[^s114], and on a unit the same, with hardware 2.1 and flash `0x49` from manufacturer `0x01`[^t-arch8-usb] |
| product string | `Harmony Remote 0-4.4.2`[^t-usbdesc]; `Harmony Bootloader` while the bootloader is resident, which otherwise enumerates with the application's descriptor, ids and `bcdDevice` included[^t-885-boot] |

**The Harmony 885 configuration read matches this version block** on every field the file states, and
Harmony 880 configurations are refused on their skin and their hardware version,
[the platform's USB page](../../architectures/harmony-880-885/usb.md#what-a-configuration-file-states-against-it).[^t-version-885]

## What reads off it

* **A configuration reads off whole over the ordinary flash read**, from `0x020000`, and the same bytes come
  back on a second read. Run on the flash as it was read, the check the firmware makes at every start
  passes, [the platform's start](../../architectures/harmony-880-885/firmware.md#what-the-application-does-at-start).[^t-885-on-a-unit]
* **The clock runs, and reads over the cable**: `READ_MISC` selector 7 returns one byte of data memory per
  exchange, so seven exchanges from `0x108` read the second, minute, hour, day, weekday, month and year in
  the order of [the clock's variables](../../config-format/state.md#variables-0-to-6-are-the-clock), one after
  another and not as one snapshot, so a carry between two exchanges could tear a reading. Two such reads
  seconds apart differed in the second alone, and the weekday read agreed with the date read by the calendar,
  on the one unit read.[^t-885-on-a-unit]
* **The keys scan on the cable**, so the same selector read of `0x295` and `0x3A1` over and over shows the
  key held and the last key pressed while somebody presses keys. Every key was mapped that way on one
  unit and sixteen again on a second, [keys.md](keys.md#watching-a-key-on-the-cable).[^t-885-keys-u]

## Not checked

* An 880 on a cable.[^unchecked]

[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^s113]: Read in the firmware. [Section 113](../../../docs/findings.md#s113)
[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^unchecked]: Not checked.
[^t-arch8-usb]: Measured on a unit. [The test](../../../tests/test_arch8_usb.py)
[^t-usbdesc]: Measured on a unit. [The test](../../../tests/test_usbdesc.py)
[^t-885-boot]: Read in the firmware. [The test](../../../tests/test_harmony_885_bootloader.py)
[^t-885-end]: Read in the firmware. [The test](../../../tests/test_harmony_885_write_end.py)
[^t-885-on-a-unit]: Measured on a unit. [The test](../../../tests/test_harmony_885_bench_reads.py)
[^t-885-keys-u]: Measured on a unit. [The test](../../../tests/test_harmony_885_keys.py)
[^t-read-profile]: Measured in configurations. [The test](../../../packages/corpus/test/read.test.ts)
[^t-version-885]: Measured on a unit. [The test](../../../packages/corpus/test/compatibility.test.ts)
