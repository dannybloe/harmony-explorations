# Harmony 880 and 885: the shared platform

The Harmony 880 and 885 are activity remotes from Logitech's classic generation with a colour screen, and
the Harmony 720 and 785 are their smaller siblings. Inside they are one design: a Microchip PIC18
processor, one address space that holds the firmware and the configuration together, and a
configuration format of the same family as every later Harmony's. This folder describes that design once.

**Everything here is known from configurations and firmware images that other people published, and
nothing from a remote**, apart from what a Harmony 885 answered on the cable, which is on the
[USB page](usb.md); it said no unit had been measured<!--superseded--> until then. So a fact on these pages is read
in the firmware images or counted over a handful of configurations, and each footnote says which.
A Harmony 885 measured on a unit would turn a "Measured in configurations" footnote into a measurement,
and nothing in this folder's layout would have to move for it.

**Architecture 8** is the platform's number in concordance's table and in Logitech's own words, and its
codename is **Espresso**.[^x-concordance][^s7] Every configuration of it states 8 in its architecture
record and every firmware image of it reports 8 in its version block.[^s182][^s114]

| model | folder | what is known |
|---|---|---|
| Harmony 880 and 885 | [harmony-885](../../remotes/harmony-885/README.md) | read in two application images and two bootloaders, and their start in three more application images; counted over six configurations, and the start check over 16 containers |
| Harmony 880 Pro, 720, 785 | [harmony-885](../../remotes/harmony-885/README.md) for the 880 Pro, [harmony-720](../../remotes/harmony-720/README.md) for the 720, none for the 785 | named on this platform by Logitech's client and service[^s207][^s131]; an 880 Pro's and a 720's application and configuration pass the start check, the 880 Pro's application being the 880's build with its own skin, [the firmware](firmware.md#what-the-application-does-at-start). This row said nothing of theirs was read<!--superseded--> until they were[^t-885-start][^t-885-start-corpus]. The one 720's application, 4.5, and bootloader, 4.2, are builds of their own, and the application is compared with the 885's routine by routine, [the firmware](firmware.md#the-harmony-720s-images)[^t-885-boot] |
| Harmony 882 | none | named here by concordance's table alone[^x-concordance] |

## Skins

<!-- generated:skins -->
| skin | model | panel | max devices | favourite channel buttons | newest firmware the forum table knows |
|---|---|---|---|---|---|
| 15 | Harmony 880 | colour | 15 | 16 | 4.4.2 |
| 17 | Harmony 885 | colour | 15 | 16 | 4.4.2 |
| 39 | Harmony 880 Pro | colour | 15 | 16 | 4.4.2 |
| 44 | Harmony 720 | colour | 12 | 24 | 4.4.2 |
| 45 | Harmony 785 | colour | 12 | 24 | 4.4.2 |

Generated from `MODELS_BY_SKIN` in `packages/base/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skins 15 and 17 are read in the firmware, the only value that differs between the two application
images, at two offsets, and stated in each configuration's own header.[^s114][^s113] Logitech's classic client places
skins 15, 17, 39, 44 and 45 on the Espresso platform, and its teaching pictures place skin 15 on
architecture 8.[^s207][^s208] Logitech's live service names 39 the Harmony 880 Pro, 44 the Harmony 720 and
45 the Harmony 785.[^s131]

## Shared, in one table

Read in the 880's and 885's firmware images, or counted over the configurations, as each footnote says.

| | value |
|---|---|
| processor | a Microchip PIC18: the images disassemble as one and their load address is found by decoding its branch instructions.[^s114] Which part is not known[^unchecked] |
| addresses | one space from `0x000000`, as a host addresses it: the bootloader at the bottom, the application at `0x010000`, the user configuration from `0x020000`, [memory.md](memory.md)[^s114][^s116]. Whether that is one flash part, or the processor's own flash with an external part above it, is not known[^unchecked] |
| execution | the bootloader owns the vector table and hands both interrupt vectors to the application, so the two images are halves of one program[^s116] |
| container | `TPTP` and `DKDK`, marker `WLWL` opening the key table, format `0x1500`, 21 pointer slots: the base layout with a NULL inserted at slot 8, [memory.md](memory.md)[^s14][^s194] |
| screen raster | 128 by 160[^s129] |
| screen pages | on the Harmony 880 and 885, cells beside the eight keys next to the screen, one grammar for a device's pages and the device list, and one copy of the device list per activity and outside them, [screens](../../config-format/screens.md#a-page-of-the-harmony-880-and-885)[^t-side-keys]. The 720's six cells are not checked |
| keypad | a 4 by 16 lattice, scan code `(line - 1) * 4 + input`[^s144] |
| state variables the firmware owns | 0 to 17, as on the Harmony One and the Harmony 600, 650 and 700[^s284] |
| USB | product id `0xC110`, the HID command protocol, `bcdDevice` as protocol and skin in plain binary, [usb.md](usb.md)[^s207][^s113] |
| Logitech's software | the classic Harmony Remote Software. Logitech's live service has skins 15 and 17 switched off and validates a remote's serial, so it compiles nothing for one nobody has registered[^s136] |

## The files

| file | what it holds |
|---|---|
| [memory.md](memory.md) | the flash layout, the container and its slot map, the log area, the safe mode configuration inside the firmware |
| [firmware.md](firmware.md) | the application and the bootloader, their load addresses and headers, how an image is obtained |
| [usb.md](usb.md) | the transport, the version block, `bcdDevice` |
| [misc.md](misc.md) | the names, and the rest |

## Not checked

* Anything on a remote: every row above is an image or a configuration.[^unchecked]
* The Harmony 785 and 882, of which no image or configuration is known; the Harmony 720's firmware beyond
  the routines [the firmware page](firmware.md#the-harmony-720s-images) lists; and the faces of the 785 and
  882.[^unchecked] This listed the faces of the 720 and 880 Pro as well<!--superseded--> until each was drawn
  off its photograph and checked against its manual.[^t-printing-720][^t-printing-880pro] This said the 720's firmware was not checked beyond the start check<!--superseded-->
  until its application was compared with the 885's routine by routine.
* Which PIC18 part, and which of the two flash parts the firmware knows is fitted.[^unchecked]

[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s7]: Stated by Logitech. [Section 7](../../../docs/findings.md#s7)
[^s182]: Measured in configurations. [Section 182](../../../docs/findings.md#s182)
[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^s113]: Measured in configurations. [Section 113](../../../docs/findings.md#s113)
[^s208]: Stated by Logitech, in their client. [Section 208](../../../docs/findings.md#s208)
[^unchecked]: Not checked.
[^s116]: Read in the firmware. [Section 116](../../../docs/findings.md#s116)
[^s14]: Measured in configurations. [Section 14](../../../docs/findings.md#s14)
[^s194]: Measured in configurations. [Section 194](../../../docs/findings.md#s194)
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s144]: Read in the firmware. [Section 144](../../../docs/findings.md#s144)
[^s284]: Read in the firmware. [Section 284](../../../docs/findings.md#s284)
[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
[^t-885-start]: Read in the firmware. [The test](../../../tests/test_harmony_885_start_check.py)
[^t-885-start-corpus]: Measured in configurations. [The test](../../../tests/test_harmony_885_start_check.py)
[^t-885-boot]: Read in the firmware. [The test](../../../tests/test_harmony_885_bootloader.py)
[^t-printing-720]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^t-printing-880pro]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^t-side-keys]: Measured in configurations. [The test](../../../packages/codec/test/sidekeysdevice.test.ts)
