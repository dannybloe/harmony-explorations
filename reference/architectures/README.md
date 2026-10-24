# Architectures

A Harmony's **architecture** is the platform under the model: the processor, the way its memory is laid
out and the firmware family that runs on it. Several models can share one, and a configuration built for
one architecture means nothing to another. Logitech's own software numbers them, and the folders here are
named for the models a reader holds rather than for the number.

| folder | architecture |
|---|---|
| [harmony-880-885](harmony-880-885/README.md) | 8 |
| [harmony-5xx](harmony-5xx/README.md) | 9 |
| [harmony-890-895](harmony-890-895/README.md) | 10 |
| [harmony-one](harmony-one/README.md) | 12 |
| [harmony-600-650-700](harmony-600-650-700/README.md) | 14 |
| [harmony-300-350](harmony-300-350/README.md) | 16 |
| [harmony-touch](harmony-touch/README.md) | 17 by the Harmony Touch's own report, 18 by Logitech's templates |

Each folder's README says which models it covers and how much of it was measured on which of them.

## Which models sit on which architecture

Logitech numbered its platforms and concordance, the open source configuration tool, keeps a table of
them[^x-concordance]. Where that table names a family rather than a model, the model is marked presumed
below: it shares a number range with the family, which is suggestive and not a measurement.

| architecture | models | how it is known |
|---|---|---|
| 2 | Harmony 745 | concordance's table[^x-concordance] |
| 3 | Harmony 748, 768 | concordance's table, and Logitech's client names an architecture for both skins[^x-concordance][^s208] |
| 7 | Harmony 610, 620, 628, 655, 659, 660, 670, 675, 676, 680, 688 | concordance's table, and Logitech's client for six of their skins and for the 620 and 670[^x-concordance][^s208] |
| 8 | Harmony 720, 785, 880, 882, 885, [harmony-880-885](harmony-880-885/README.md) | configurations and firmware images[^s7] |
| 9 | Harmony 510, 515, 520, 522, 525, 550, 555, and the Harmony for Xbox 360, [harmony-5xx](harmony-5xx/README.md) | a Harmony 525 measured[^s76]; the rest by concordance's table and Logitech's client[^x-concordance][^s207] |
| 10 | Harmony 890, 895, and presumed 890 Pro, 892, 897, [harmony-890-895](harmony-890-895/README.md) | configurations[^s182] |
| 12 | Harmony One, [harmony-one](harmony-one/README.md) | measured[^s57] |
| 14 | Harmony 600, 650, 665, 700, [harmony-600-650-700](harmony-600-650-700/README.md) | measured on the 600, 650 and 700[^s281]; the 665 by Logitech's service[^s131] |
| 15 | Harmony 900, 1000, 1000i, 1100, and presumed 1100i | concordance's table[^x-concordance] |
| 16 | Harmony 300, 350, [harmony-300-350](harmony-300-350/README.md) | measured[^s264] |
| 17 or 18 | Harmony Touch, [harmony-touch](harmony-touch/README.md) | the remote reports 17, Logitech's templates say 18[^s197][^s200] |
| not known | Harmony 810, 820, 850 | concordance does not name them either[^unchecked] |

**The Harmony for Xbox 360 is not architecture 15**, which an earlier reading of concordance's table
presumed from the model range: Logitech's client puts its skin, 36, on the same transport as the Harmony
525's, the command protocol, where architecture 15 needs a network transport of its own[^s207]. That
transport is shared by architectures 9 and 14, so the client alone does not say which of the two; this
library's model table says 9, and that is not checked against a remote or a specification[^unchecked].

**Do not infer an architecture from a model number.** Logitech's 2025 list of retired remotes holds the
610 to 688, architecture 7, and not the 600, 650 or 665, which are architecture 14 and stayed on Logitech's
later software ([the product line](../logitech/product-line.md)): a 6xx number covers two architectures,
split by platform generation rather than by number. A configuration states its own architecture in its
architecture record, [the header records](../config-format/header-records.md)[^s182].

## Platforms and product ids

Logitech's software tells remotes apart in two steps. The USB product id names a **platform**, by an
internal codename, several models to a platform; then the skin selects the model within it[^s207]:

| vendor | product | platform | how a host talks to it |
|---|---|---|---|
| `0x046D` | `0xC110` | Espresso, architecture 8 | the command protocol |
| `0x046D` | `0xC111` | Mocha, architecture 9 | the command protocol |
| `0x046D` | `0xC112` | Cappuccino, architecture 10 | tunnelled |
| `0x046D` | `0xC113` | Sugar | tunnelled |
| `0x046D` | `0xC114` | Whisky | tunnelled |
| `0x046D` | `0xC11F` | Cognac, Hennessy and Vodka, the Harmony 900, 1000 and 1100 | a third transport, a network over USB |
| `0x046D` | `0xC121` | Gin, architecture 12, the Harmony One | the command protocol |
| `0x046D` | `0xC122` | Molson, architecture 14, the Harmony 600, 650 and 700 | the command protocol |
| `0x0400` | `0xC359` | the older 6xx and 7xx remotes | not known |

The product id to platform map is Logitech's client's[^s207]. **The platform to architecture map does not
rest on the client**: Logitech's firmware packages carry a list of architectures they refuse, each named in
a comment, and those comments name 8 Espresso, 9 Mocha, 10 Cappuccino, 11 Cognac, 12 Gin and 14 Molson[^s7b].
They name Cognac architecture 11 where concordance puts the Harmony 900, 1000 and 1100 on 15; which number
those remotes report is not checked[^unchecked].
The last row does not enumerate under Logitech's vendor id at all, so a search for `0x046D` never finds one
of those remotes[^s207].

**One product id is several models**: `0xC122` is the Harmony 600, 650 and 700, which report the same id
and differ in their skin[^s281]. So a model is named by its skin and never by its product id.

**A platform group is a transport and not an architecture.** The client's list of skins per platform puts
the Harmony 600, 650 and 700 (skins 71, 72 and 66, architecture 14) in Mocha beside the Harmony 525
(skin 22, architecture 9), because what a platform decides is which driver speaks to the remote, and those
two architectures share one[^s207]:

| platform | skins | models |
|---|---|---|
| Espresso | 15, 17, 39, 44, 45 | 880, 885, 880 Pro, 720, 785 |
| Mocha | 18, 22, 36, 41, 48, 65, 67, 68, and 66, 71, 72 | 520, 525, Xbox 360, 550, 555, 610, 515, 510, and the Harmony 700, 600 and 650 |
| Cappuccino | 19, 23, 40 | 890, 895, 890 Pro |
| Whisky | 20, 24 | the RF Wireless Extender, two regional skins |
| Sugar | 21, 25 | 892, 897 |
| Cognac | 49, 52, 53, 55, 56, 57, 60, 61, 62, 63, 64 | the Harmony 1000 family, the 900 and the 1100 |
| Gin | 54 | the Harmony One, and nothing else |

The older 6xx and 7xx models are in no group, because the client matches them by product id and their
platform carries no skin list[^s207]. Skin 46 is in two groups, Espresso and Mocha, alone of all the
placed skins, and nothing explains it; the client cannot notice, since both groups use the same
driver[^s207]. And the client marks skins 52 and 56, the Australian Harmony 1000 and 1000 Pro, as having no
Z-Wave module, so that module is a per market option on one platform[^s207].

## Three ways a host talks to a remote

How a host reaches a remote is a different question from its architecture, and for whether a model can
be read at all it decides more. Concordance sorts its remotes into three families by which operations each
implements[^x-concordance]:

| family | models | how a configuration is read | what else is reachable |
|---|---|---|---|
| flash addressed | architectures 2 to 14 | a flash read at an address | firmware, memory, the whole address space |
| network | architecture 15: the 900, 1000, 1000i, 1100, 1100i | a network interface over USB, not plain HID | not read here |
| file based | the 200, 300, 350, Link, Hub, Touch, Ultimate, and presumably the 950 | a **named file**: `/cfg/usercfg` on the Harmony 300 and 350[^s262][^s264]; a Harmony Touch has no such file[^s200] | nothing by address |

**Within the flash addressed family, two transports.** The Harmony 890 and its platform siblings carry a
datagram protocol tunnelled over the USB channel, with named services on top, where the 880, 525, One and
600 family take command reports directly[^s207]. Concordance and Logitech's client agree on that boundary
by routes with nothing in common[^s207].

**A file based remote has no address space.** Its remotes are plain HID with 64 byte reports in the same
product range, and concordance's read for them ignores its address argument and refuses every memory,
erase and firmware call[^x-concordance]. What they offer is a configuration, ending in the `PTYY` marker
of the same container format[^s194].

## Two ways to run a program

This is the difference between the Harmony One and the Harmony 600, 650 and 700 that everything else
follows from, and it is stated for those two architectures only.

**On the Harmony One the processor runs the program out of the flash chip it is stored in.** The
application sits in external parallel NOR at `0x020000`, and the processor executes it in place from
there. That needs a PIC18 J-series part with an external memory bus, running in extended microcontroller
mode: addresses below `0x020000` resolve to the processor's own 128 KiB of flash, and addresses at
`0x020000` and above go out onto the bus[^s3].

**On the Harmony 600, 650 and 700 it cannot.** Their part, a `PIC18F67J50`, has 64 pins and no external
memory bus, so the application stored in external SPI flash at `0x000000` is copied by the bootloader into
internal flash at `0x009000` and runs there. The external flash is storage only: the update copy of the
firmware, the safe mode configuration and the user configuration[^s3].

The Harmony 525's arrangement is a third one, an application in internal flash with stored copies on a
serial chip, [harmony-5xx](harmony-5xx/README.md).

## The firmware area, the other way up

Both architectures reserve a 128 KiB area for the firmware in external flash, and they place it the other
way up: the Harmony One puts it at `0x020000` with the safe mode configuration below it, and the Harmony
600, 650 and 700 put it at `0x000000` with the safe mode configuration above it[^s3].

| | Harmony One | Harmony 600, 650 and 700 |
|---|---|---|
| processor | `PIC18F87J50`, inferred[^s3] | `PIC18F67J50`[^s3] |
| external flash | 4 MiB parallel NOR[^s88] | 2 MiB SPI[^s88] |
| application stored at | external `0x020000`[^s3] | external `0x000000`[^s3] |
| application runs from | external `0x020000`, in place[^s3] | internal `0x9000`, copied[^s3] |
| safe mode configuration | external `0x002000`, below the firmware[^s3] | external `0x020000`, above it[^s3] |
| safe mode code | internal `0xFE` `+0x1000`[^s189] | internal `0xFE` `+0x1000`[^s23] |
| user configuration | external `0x040000` to `0x400000`[^s88] | external `0x030000` to `0x200000`[^s88] |
| internal program memory holds | the bootloader, safe mode, a programmable logic image and the external flash programmer[^s206] | the bootloader, safe mode and the application[^s23] |
| container format | `0x1600`, 22 pointer slots[^s7][^s115] | `0x1400`, 20 pointer slots[^s7][^s115] |

**The user configuration region does not end in the same place on both.** On the Harmony One it runs to
`0x400000`, the end of its 4 MiB part. On the Harmony 600, 650 and 700 the firmware refuses every flash
address at or above `0x200000`, and four independent routes agree on a 2 MiB part[^s88].

## The top of program memory

The two parts above lay out the last words of their program memory the same way, as the linker script
for each states[^s25]:

| program address | contents |
|---|---|
| `0x00000` to `0x1FFF7` | program memory |
| `0x1FFF8` to `0x1FFFD` | the **configuration words**: oscillator, watchdog, code protection and the rest |
| `0x1FFFE` to `0x1FFFF` | neither |
| `0x3FFFFE` | the device id |

The configuration words are read as the six byte run at internal `0xFF` `+0xFFF8`, on a Harmony One and on
a Harmony 600[^s25]. The Harmony 525's part is a different one, a `PIC18F4550` with 32 KiB of program
flash, and this table is not about it[^s119].

## What no read can show

**The device id.** A PIC18 keeps it at `0x3FFFFE`, and a host can read only the two internal pages of 64
KiB each, so it is out of reach on both architectures and the Harmony One's part number stays inferred
rather than measured[^s22]. The configuration words sitting where they do is consistent with a 128 KiB
part and is not a confirmation, since every sibling with that flash size would agree[^s25].

[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s208]: Stated by Logitech, in their client. [Section 208](../../docs/findings.md#s208)
[^s7]: Measured in configurations. [Section 7](../../docs/findings.md#s7)
[^s76]: Measured on a unit. [Section 76](../../docs/findings.md#s76)
[^s207]: Stated by Logitech, in their client. [Section 207](../../docs/findings.md#s207)
[^s182]: Measured in configurations. [Section 182](../../docs/findings.md#s182)
[^s57]: Read in the firmware. [Section 57](../../docs/findings.md#s57)
[^s281]: Measured on a unit. [Section 281](../../docs/findings.md#s281)
[^s131]: Stated by Logitech, by their service. [Section 131](../../docs/findings.md#s131)
[^s264]: Measured on a unit. [Section 264](../../docs/findings.md#s264)
[^s197]: Stated by Logitech. [Section 197](../../docs/findings.md#s197)
[^s200]: Measured on a unit. [Section 200](../../docs/findings.md#s200)
[^unchecked]: Not checked.
[^s7b]: Stated by Logitech. [Section 7](../../docs/findings.md#s7)
[^s262]: Measured on a unit. [Section 262](../../docs/findings.md#s262)
[^s194]: Measured in configurations. [Section 194](../../docs/findings.md#s194)
[^s3]: Read in the firmware. [Section 3](../../docs/findings.md#s3)
[^s88]: Measured on a unit. [Section 88](../../docs/findings.md#s88)
[^s189]: Read in the firmware. [Section 189](../../docs/findings.md#s189)
[^s23]: Measured on a unit. [Section 23](../../docs/findings.md#s23)
[^s206]: Measured on a unit. [Section 206](../../docs/findings.md#s206)
[^s115]: Measured in configurations. [Section 115](../../docs/findings.md#s115)
[^s25]: Measured on a unit. [Section 25](../../docs/findings.md#s25)
[^s119]: Read in the firmware. [Section 119](../../docs/findings.md#s119)
[^s22]: Measured on a unit. [Section 22](../../docs/findings.md#s22)
