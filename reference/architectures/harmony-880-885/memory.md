# Harmony 880 and 885: memory

A Harmony 880 or 885 keeps its program and its configuration in one address space. The bottom
64 KiB hold a bootloader that starts the remote, the next 64 KiB the application that runs it, with a
small configuration of its own tucked into its last 8 KiB, and the user's configuration starts at 128 KiB.
This page says what sits where, then how the configuration container is laid out on this architecture,
then the few things in a configuration that are this architecture's own.

Nothing here was read off a remote. The layout comes from two firmware images of each of the two halves
and from concordance's table, and the container from six configurations, as each footnote says. How a
configuration is laid out in general is [the configuration format](../../config-format/README.md); this
page states what differs here.

## The address space

| address | what | source |
|---|---|---|
| `0x000000` to `0x010000` | the **bootloader**, with the reset vector at zero and no image header; its code ends at `0x0639B` on the 880 and `0x063B1` on the 885 | [^s116] |
| `0x000110` | the remote's **serial number** | [^x-concordance] |
| `0x010000` to `0x020000` | the **application firmware**, version 4.4, [firmware.md](firmware.md) | [^s114] |
| `0x01E000` to `0x01FB89` | inside the application's 64 KiB, a **safe mode configuration**: a complete container of 7049 bytes, byte identical in the 880's and the 885's images | [^s114] |
| `0x020000` | the **user configuration**, the container's own pointers counting from here | [^x-concordance][^s14] |
| `0x1E0000` to `0x1FE000` | the **log area** every configuration declares, 15360 records of 8 bytes | [^s47] |

**The serial sits below the application**, so a read of the firmware region cannot contain it, and a read
of the bottom 64 KiB, which holds the bootloader, does.[^x-concordance] That address is inside the range
the bootloader's code occupies, so which bytes there are a serial is not checked.[^unchecked]

**The safe mode configuration lives inside the application's region and not in the bootloader's**: the
bottom 64 KiB hold no container at all, in either image. That is the opposite of the Harmony One, whose
safe mode configuration sits at `0x002000` in the bottom 64 KiB.[^s116] It is the oldest configuration
known, built on 3 April 2005, and its architecture record is two zero bytes where a user configuration's
states the architecture and the skin, so the configuration that ships with the firmware names neither.[^s114]

**The log area stops 8 KiB short of 2 MiB**, at `0x1FE000`, where every other architecture's ends on a
round boundary; the stride of 8 bytes is the Harmony 525's and the Harmony 600's as well.[^s47] What the
firmware writes there is not read.[^unchecked]

## The container

| | value |
|---|---|
| cookie and end marker | `TPTP` and `DKDK`[^s14] |
| marker after the pointer table | `WLWL`, which opens the key table, at offset `0x5F`[^s14][^s20] |
| format word | `0x1500`, which is the pointer count: 21 slots[^s194] |
| pointer table | the base layout of 20 slots with a NULL inserted at slot 8, so everything from base slot 8 up sits one raw slot higher[^s20][^s194] |
| architecture record | raw slot 1, seven bytes: `08 08`, the skin, `0d`, then three zero bytes. `08 08 0f 0d` on an 880 and `08 08 11 0d` on an 885[^s182] |

<!-- generated:slot-map -->
21 raw slots. 20 of the 20 base slots are present; absent: none. Raw slots no base slot names: 8.

| base slot | raw slot |
|---|---|
| 0 | 0 |
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |
| 4 | 4 |
| 5 | 5 |
| 6 | 6 |
| 7 | 7 |
| 8 | 9 |
| 9 | 10 |
| 10 | 11 |
| 11 | 12 |
| 12 | 13 |
| 13 | 14 |
| 14 | 15 |
| 15 | 16 |
| 16 | 17 |
| 17 | 18 |
| 18 | 19 |
| 19 | 20 |

Generated from `SLOT_MAPS` in `packages/codec/src/gspm.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**Logitech's classic client states this architecture's container wrongly.** Its constants for
architecture 8 declare 20 pointer slots and a trailer at offset 91[^s206], where four configurations put
the marker at 95, `0x0B + 4 * 21`, so they carry 21.[^s206b] The same constants reproduce architectures 9
and 12 exactly, so it is not a misreading of the client's convention: it is the client describing a
container no configuration here is.

## What a configuration holds that is this architecture's own

The rest of the format is the same as everywhere else and is stated once in
[the configuration format](../../config-format/README.md). These are the places this architecture differs
or where a page there names it:

* **The state variables 0 to 17 are the firmware's**, so a configuration's own variables start at 18, as on
  the Harmony One and the Harmony 600, 650 and 700, where the Harmony 525's firmware owns 0 to 12.[^s284]
  The first seven are the clock, [state](../../config-format/state.md).
* **A device's power on delay is one instruction** at the top of the action list its `Power` variable runs
  when it switches on, as on the Harmony 525 and the Harmony One, where the Harmony 600, 650 and 700 keep it
  in a state variable, [actions](../../config-format/actions.md).[^s235]
* **37 infrared records carry a second group of block pointers**, in four configurations, all in one
  device: the same RC6 command with one payload bit inverted, which is the shape of a toggling code's
  record, [infrared records](../../config-format/infrared-records.md).[^s134] Whether this firmware
  alternates the two groups the way the Harmony One's and the Harmony 650's do is not read.[^unchecked]
* **The screen is 128 by 160**, and the glyph shapes of its fonts are this architecture's own alphabet,
  which the Harmony 890 and 895 share.[^s129][^s180]
* **A scan code is `(line - 1) * 4 + input`**, on a 4 by 16 lattice, [the key table](../../config-format/modes-and-keys.md).[^s144]

## Not checked

* Anything on a remote: the flash part, its size, and whether a unit's layout is the images'.[^unchecked]
* What sits between the end of a configuration and the log area, and above the log area.[^unchecked]
* Data memory: where the firmware keeps its state variables and the clock.[^unchecked]

[^s116]: Read in the firmware. [Section 116](../../../docs/findings.md#s116)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^s14]: Measured in configurations. [Section 14](../../../docs/findings.md#s14)
[^s47]: Measured in configurations. [Section 47](../../../docs/findings.md#s47)
[^unchecked]: Not checked.
[^s20]: Measured in configurations. [Section 20](../../../docs/findings.md#s20)
[^s194]: Measured in configurations. [Section 194](../../../docs/findings.md#s194)
[^s182]: Measured in configurations. [Section 182](../../../docs/findings.md#s182)
[^s206]: Stated by Logitech, in their client. [Section 206](../../../docs/findings.md#s206)
[^s206b]: Measured in configurations. [Section 206](../../../docs/findings.md#s206)
[^s284]: Read in the firmware. [Section 284](../../../docs/findings.md#s284)
[^s235]: Measured in configurations. [Section 235](../../../docs/findings.md#s235)
[^s134]: Measured in configurations. [Section 134](../../../docs/findings.md#s134)
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s180]: Measured in configurations. [Section 180](../../../docs/findings.md#s180)
[^s144]: Read in the firmware. [Section 144](../../../docs/findings.md#s144)
