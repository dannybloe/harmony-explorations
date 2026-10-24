# Harmony 350

A remote with **no screen**. A Watch TV key starts its one activity, switching on the devices you watch
television with and off again on a second press. Four device keys each pick one device with a short
press and a second device with a press held for two seconds, so it controls up to eight. Five keys go
straight to favourite channels, a power key switches the device you picked, and the rest is an ordinary
keypad[^x-manual].

It is built on the same platform as the Harmony 300: one firmware, one way of talking over USB, one
configuration format and one case. What the two share is stated once in
[the architecture folder](../../architectures/harmony-300-350/README.md), and this folder states what is
the 350's own. Over USB it speaks a file protocol rather than the command protocol of the Harmony One and
the Harmony 600, 650 and 700, so this library reads its configuration as a file, read only, and has no
way to write to it; [the architecture's usb.md](../../architectures/harmony-300-350/usb.md) has the
rails. How every fact below marks its evidence is in
[the reference's README](../../README.md#every-fact-carries-its-source-and-its-standing).

## Skins

<!-- generated:skins -->
| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |
|---|---|---|---|---|---|---|
| 104 | no record in models.ts |  | 16, the folder's | no record | no record |  |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skin 104 is the Harmony 350, with no regional twin[^s196]. A unit states it twice: in
its USB descriptor, as `bcdDevice` `0x1104`[^s195], and in its own `/sys/sysinfo`[^s262]. It has no record
in `packages/usb/src/models.ts`, which
[the architecture's README](../../architectures/harmony-300-350/README.md#skins) explains; it does appear
in `SKINS_WITH_A_LONG_PRESS`, [features.md](features.md).

## Key numbers

| | value |
|---|---|
| architecture | 16, [the file based family](../../architectures/harmony-300-350/README.md)[^s262] |
| USB product id | `0xC124`, shared with the Harmony 300[^s193][^s195] |
| `bcdDevice` | `0x1104`[^s195] |
| firmware | 1.4, the image the Harmony 300 runs too[^s196] |
| screen | **none**[^t-silhouette] |
| keys | 55, counted off the drawing in Logitech's setup guide; **no scan code known**[^t-silhouette] |
| devices | **8**: "Control up to eight devices individually using these four Device buttons, each with a short press or a longer two second press"[^x-manual][^s263] |
| activities | **1**, Watch TV[^x-manual][^s145] |
| favourite channels | **5**[^x-manual][^s263] |
| long press | **yes**, on the device keys[^x-manual][^s264] |
| power | two AA batteries[^x-manual] |

## The files

| file | what it holds |
|---|---|
| [keys.md](keys.md) | the keys, their printing, the drawing |
| [display.md](display.md) | none, and the lit device keys |
| [features.md](features.md) | Logitech's statement, devices, the one activity, favourites, delays |
| [behaviour.md](behaviour.md) | what the manual and the configurations say it does |
| [hardware.md](hardware.md) | what is known of the outside; the inside is the architecture's |
| [memory.md](memory.md) | what of the architecture's layout is the 350's own |
| [firmware.md](firmware.md) | the shared 1.4 image, and how Logitech's software fetches it |
| [usb.md](usb.md) | product id, `bcdDevice`, what the remote says about itself |
| [misc.md](misc.md) | everything else |

## Not checked

* Which key sends which scan code.
* The firmware version a unit runs, beyond the product string's 1.4.0.

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 350 setup guide](https://www.logitech.com/assets/51207/harmony-350-qsg-and-iid.pdf)
[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^s262]: Measured on a unit. [Section 262](../../../docs/findings.md#s262)
[^s193]: Measured on a unit. [Section 193](../../../docs/findings.md#s193)
[^t-silhouette]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^s263]: Stated by Logitech, by their service. [Section 263](../../../docs/findings.md#s263)
[^s145]: Stated by Logitech, by their service. [Section 145](../../../docs/findings.md#s145)
[^s264]: Stated by Logitech, by their service. [Section 264](../../../docs/findings.md#s264)
