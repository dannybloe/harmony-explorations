# Harmony 890 and 895: the shared platform

The Harmony 890 and 895 are the radio frequency siblings of the Harmony 880 and 885: the same screen and
the same key positions, with six radio channels added.[^x-forum-table][^s177][^s179] Their configuration is a fourth
shape of the container every later Harmony uses, and the remote talks to a computer through a different
protocol from every other remote described here. This folder describes the platform once.

**Everything here is known from configurations other people read off their remotes and published.** No
firmware image of this architecture exists anywhere, and no unit has been measured, so every fact on
these pages is counted over those configurations or stated by Logitech, as each footnote says.[^s115][^s122]

**Architecture 10** is the platform's number in concordance's table and in the configurations
themselves, and its codename is **Cappuccino**.[^x-concordance][^s182][^s7]

| model | folder | what is known |
|---|---|---|
| Harmony 890 and 895 | [harmony-890](../../remotes/harmony-890/README.md) | counted over the configurations of two Harmony 890s and one Harmony 895 |
| Harmony 890 Pro | none | placed on this platform by Logitech's client and named by its service, and nothing of it read[^s207][^s131] |
| Harmony 892 and 897 | none | presumed here from concordance's table, by number range[^x-concordance] |

**The 892 and 897 are presumed, and Logitech's client disagrees with the presumption in part.** Its
platform list puts their skins, 21 and 25, on a platform of their own, Sugar, with product id `0xC113`,
beside Cappuccino rather than on it. A platform there decides the transport and not the architecture,
since one platform holds both the Harmony 525's architecture and the Harmony 600's, so this does not
settle which architecture they are.[^s207]

## Skins

<!-- generated:skins -->
| skin | model | panel | max devices | favourite channel buttons | newest firmware the forum table knows |
|---|---|---|---|---|---|
| 19 | Harmony 890 | colour | 15 | 16 | 4.9.0 |
| 23 | Harmony 895 | colour | 15 | 16 | 4.9.0 |
| 40 | Harmony 890 Pro | colour | 15 | 16 | 4.9.0 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skins 19 and 23 are stated in each configuration's own architecture record, `0a 0a 13 0d` on a Harmony 890
and `0a 0a 17 0d` on a Harmony 895.[^s182] Logitech's classic client places skins 19, 23 and 40 on the
Cappuccino platform, and its live service names 40 the Harmony 890 Pro.[^s207][^s131]

## Shared, in one table

Counted over the configurations, or stated by Logitech, as each footnote says.

| | value |
|---|---|
| container | `TPTP` and `DKDK`, marker `WLWL`, as the Harmony 880 and 885; format `0x1700`, 23 pointer slots[^s115][^s194] |
| pointer table | **not** the base layout with insertions: base slot 0 is absent, among five, and eight raw slots are no base slot, [memory.md](memory.md)[^s178][^s182][^s184] |
| architecture record | raw slot 0, not raw slot 1, because base slot 0 does not exist here[^s182] |
| user configuration | its pointers count from flash `0x030000`[^s115][^s117] |
| screen raster | 128 by 160, with the same ten picture sizes as the Harmony 880 and 885[^s179] |
| keypad | the Harmony 885's populated positions, all 55, on a Harmony 895[^s177] |
| fonts | the Harmony 885's typeface[^s180] |
| USB | product id `0xC112`, a tunnelled datagram protocol rather than the HID command reports, [usb.md](usb.md)[^s207] |
| Logitech's software | the classic Harmony Remote Software. Logitech's live service has skins 19 and 23 switched off[^s136] |

**An arch 10 remote matches an arch 8 one in its buttons and its screen**: the same populated key
positions on a Harmony 895 as on a Harmony 885, and the same display and picture sizes on both Harmony
890 and 895 configurations as on the 880's and 885's, where a Harmony 600 and a Harmony One share none of
those sizes.[^s177][^s179]

## The files

| file | what it holds |
|---|---|
| [memory.md](memory.md) | the container, the slot map, what reads without one, the metadata archive |
| [firmware.md](firmware.md) | that no image exists, and what that leaves open |
| [usb.md](usb.md) | the tunnelled transport, and what a read of a configuration does to it |
| [misc.md](misc.md) | the names, and the rest |

## Not checked

* Anything on a remote, and any firmware.[^unchecked]
* The Harmony 890 Pro, 892 and 897.[^unchecked]
* What the radio link to the extender is, as this platform implements it.[^unchecked]

[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^s177]: Measured in configurations. [Section 177](../../../docs/findings.md#s177)
[^s179]: Measured in configurations. [Section 179](../../../docs/findings.md#s179)
[^s115]: Measured in configurations. [Section 115](../../../docs/findings.md#s115)
[^s122]: Measured in configurations. [Section 122](../../../docs/findings.md#s122)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s182]: Measured in configurations. [Section 182](../../../docs/findings.md#s182)
[^s7]: Stated by Logitech. [Section 7](../../../docs/findings.md#s7)
[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^s194]: Measured in configurations. [Section 194](../../../docs/findings.md#s194)
[^s184]: Measured in configurations. [Section 184](../../../docs/findings.md#s184)
[^s178]: Measured in configurations. [Section 178](../../../docs/findings.md#s178)
[^s117]: Measured in configurations. [Section 117](../../../docs/findings.md#s117)
[^s180]: Measured in configurations. [Section 180](../../../docs/findings.md#s180)
[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
[^unchecked]: Not checked.
