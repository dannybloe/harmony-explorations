# Harmony 300 and 350: the shared platform

The Harmony 300 and the Harmony 350 are two remotes with **no screen** built on one platform: the same
firmware, the same case, the same way of talking to a computer and the same configuration file. They
differ in how many devices they hold, whether a device key has a long press, and what is printed on the
keys. This folder states what they share, once; each model's folder states only how it differs.

Logitech calls the platform **architecture 16**[^s197], and it is the **file based family**: a computer
reads and writes these remotes as named files rather than through the command protocol of the Harmony One
and the Harmony 600, 650 and 700[^s198]. This library never opens either model with `openHarmony`, which
refuses the file based family, and has never written to one; a separate read only path,
`openFileBasedRemote`, reads a configuration as a file[^s262]. The rails are in [usb.md](usb.md).

| model | folder |
|---|---|
| Harmony 300 | [harmony-300](../../remotes/harmony-300/README.md) |
| Harmony 350 | [harmony-350](../../remotes/harmony-350/README.md) |

Logitech's client places a third skin on this architecture, 103 "Cardu", whose model nothing here
names[^s197]. The Harmony 200 is screenless and file based too, product id `0xC125`[^x-concordance]; its
architecture is not checked[^unchecked].

## Skins

<!-- generated:skins -->
| skin | model | panel | max devices | favourite channel buttons | newest firmware the forum table knows |
|---|---|---|---|---|---|
| 78 | Harmony 300, no record | no record | no record | no record |  |
| 79 | Harmony 300 EMEA, no record | no record | no record | no record |  |
| 104 | no record in models.ts | no record | no record | no record |  |

Generated from `MODELS_BY_SKIN` and `SKINS_WITHOUT_A_MODEL_RECORD` in `packages/usb/src/models.ts`, and the skins the model folders name by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

None of the three skins has a record in `packages/usb/src/models.ts`, deliberately: a record states what a
model's hardware can do, and the table carries only models whose capability fields this library can stand
behind[^t-models]. Skins 78 and 79 are a regional pair, the Harmony 300 and its European
model[^s131]; 104 is the Harmony 350 alone[^s196]. Logitech's client names 78 "Pepsi" and 104
"Templeton"[^s197].

## Shared, in one table

| | value | evidence |
|---|---|---|
| architecture | 16 | [^s262], [^s264]; stated in every configuration's base slot 1[^s259]; [^s197] |
| USB product id | `0xC124` for both | [^s193], [^s195] |
| USB product string | `Harmony Remote 0-1.4.0` | [^s193] |
| firmware | 1.4, **one image for skins 78, 79 and 104**, [firmware.md](firmware.md) | [^s196] |
| processor | an ordinary PIC18 image; the part is not checked | [^s196b], [^unchecked] |
| internal flash | 128 KiB: bootloader, safe mode, application and records, from the firmware's own file table | [^s199] |
| where the configuration lives | `/cfg/usercfg`, on the external medium at `0x020000`, 256 KiB, [memory.md](memory.md) | [^s199], [^t-firmware] |
| configuration container | `GSPM`, `LWJL` and `PTYY` with **15 pointer slots**; the header byte `0x0F` is the slot count, not a version | [^s194] |
| screen | **none** | [^t-no-screen] |
| power | two AA batteries | [^x-manual-350]; the 300's guide is not checked[^unchecked] |
| face | one moulding, 55 keys, with different printing | [^t-moulding] |
| scan codes | 1 to 56, computed from a grid of fourteen lines of four and bound by the key maps as they are, with an event type in the top two bits, [firmware.md](firmware.md#the-keypad-scan); which key is which code is read and inferred from configurations, and heard for 44 keys of a Harmony 350 and none of a Harmony 300, [the Harmony 350's keys](../../remotes/harmony-350/keys.md#scan-codes) | [^t-harmony-350-keys], [^t-harmony-350-keys-c], [^t-harmony-350-keys-u] |
| state variables the firmware owns | 0 to 17, as on the Harmony One and the Harmony 600, 650 and 700; its clock runs to the minute and no further, [memory.md](memory.md#the-state-variables) | [^t-state-block], [^t-harmony-350-clock] |
| activities | at most one, a screenless model's limit, [how a Harmony works](../../how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity) | [^s145] |
| long press | the 350 has one and the 300 does not | [^t-models] |

## How the two differ

Each row is evidenced in the model's own folder, which is its home; this table is the side by side view.

| | Harmony 300 | Harmony 350 |
|---|---|---|
| skins | 78, and 79 the European model | 104 |
| `bcdDevice` | `0x1078`, the family's base skin even on a skin 79 unit, [the 300's usb.md](../../remotes/harmony-300/usb.md) | `0x1104`, [the 350's usb.md](../../remotes/harmony-350/usb.md) |
| devices, Logitech's service | 4 | 8 |
| infrared groups in every configuration | 4 | 8 |
| device keys and a long press | four keys, no long press | four keys, each with a short and a two second press |
| activities, Logitech's service | no `Activities` capability, only `PartiallySetupActivities`[^t-capabilities] | `Activities`, at most 1[^t-capabilities] |
| favourite channels, Logitech's service | 5 for skin 78 and 4 for skin 79, the European model | 5 |
| device keys print | TV, Cable/Sat, DVD, VCR/Aux | TV/Media, Cable/PC, AVR/Game, DVD/Music, or in an earlier printing TV / AVR, Cable/DVD, BD / Media, Game/MP3 |

## The files

| file | what it holds |
|---|---|
| [memory.md](memory.md) | the file table, the configuration's slot map |
| [firmware.md](firmware.md) | the 1.4 image and where it comes from |
| [usb.md](usb.md) | the file protocol, what is read, the rails |
| [misc.md](misc.md) | the rest |

## Not checked

* The processor part, the external medium's part and size, and the RAM size[^unchecked].
* Skin 103, and whether the Harmony 200 is this architecture[^unchecked].
* Which key sends which code, on a remote of either model rather than in configurations[^unchecked].

[^s197]: Stated by Logitech, in their client. [Section 197](../../../docs/findings.md#s197)
[^s198]: Stated by Logitech, in their client. [Section 198](../../../docs/findings.md#s198)
[^s262]: Measured on a unit. [Section 262](../../../docs/findings.md#s262)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^unchecked]: Not checked.
[^t-models]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^s264]: Measured on a unit. [Section 264](../../../docs/findings.md#s264)
[^s259]: Measured in configurations. [Section 259](../../../docs/findings.md#s259)
[^s193]: Measured on a unit. [Section 193](../../../docs/findings.md#s193)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^s196b]: Read in the firmware. [Section 196](../../../docs/findings.md#s196)
[^s199]: Read in the firmware. [Section 199](../../../docs/findings.md#s199)
[^t-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_350_firmware.py)
[^s194]: Measured in configurations. [Section 194](../../../docs/findings.md#s194)
[^t-no-screen]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^x-manual-350]: Stated by Logitech, in the manual. [The Harmony 350 setup guide](https://www.logitech.com/assets/51207/harmony-350-qsg-and-iid.pdf)
[^t-moulding]: Measured on a unit. [The test](../../../packages/silhouettes/test/models.test.ts)
[^s145]: Stated by Logitech, by their service. [Section 145](../../../docs/findings.md#s145)
[^t-capabilities]: Stated by Logitech, by their service. [The test](../../../tests/test_product_capabilities.py)
[^t-state-block]: Read in the firmware. [The test](../../../tests/test_firmware_state_block.py)
[^t-harmony-350-clock]: Read in the firmware. [The test](../../../tests/test_harmony_350_clock.py)
[^t-harmony-350-keys]: Read in the firmware. [The test](../../../tests/test_harmony_350_keys.py)
[^t-harmony-350-keys-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_keys.py)
[^t-harmony-350-keys-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_keys.py)
