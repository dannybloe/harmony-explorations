# Harmony 300 and 350: the shared platform

The Harmony 300 and the Harmony 350 are **one remote as far as a configuration is concerned**: the same
firmware but for one routine, the same case, the same way of talking to a computer and the same
configuration file. A configuration written for a Harmony 350, with eight devices, a long press on each device
key and its Watch TV activity, runs on a Harmony 300 once one entry is added to it, [below](#making-a-harmony-300-behave-as-a-harmony-350).
What stays different is what Logitech's service allows each model and what is printed on the keys, [at the
end](#what-still-differs). This folder is the one home for both; each model's own folder holds only its printing, its
keys, its skin and its USB identity.

Logitech calls the platform **architecture 16**[^s197], and it is the **file based family**: a computer
reads and writes these remotes as named files rather than through the command protocol of the Harmony One
and the Harmony 600, 650 and 700[^s198]. This library never opens either model with `openHarmony`, which
refuses the file based family; a separate path,
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
| firmware | 1.4 on both, and **an application that is one program linked twice**, the same code but for one routine; bootloaders and safe mode images that are different builds, [firmware.md](firmware.md#the-two-models-images-compared) | [^s196], [^t-harmony-300-350-images-u] |
| processor | an ordinary PIC18 image; the part is not checked | [^s196b], [^unchecked] |
| circuit board | **one design**: the same silkscreen, `PEPSI PA3`, and the same part number, `210-000767_010`, with the same parts and traces on both by a person's inspection; only the board maker's mark differs. A row of pads at the bottom is labelled `ICD_VPP`, `RB7`, `RB6`, `DGND`, `VDD_3V3`, `VBATT`, `UART1 RXD` and `UART1 TXD`: the processor's in circuit programming connection (reset or programming voltage, data on `RB7`, clock on `RB6`) and a serial port. What the serial port speaks, and whether the pads are wired, is not checked | [^t-harmony-300-350-boards-u], [^unchecked] |
| internal flash | 128 KiB: bootloader, safe mode, application and records, from the firmware's own file table | [^s199] |
| where the configuration lives | `/cfg/usercfg`, on the external medium at `0x020000`, 256 KiB, [memory.md](memory.md) | [^s199], [^t-firmware] |
| configuration container | `GSPM`, `LWJL` and `PTYY` with **15 pointer slots**; the header byte `0x0F` is the slot count, not a version | [^s194] |
| screen | **none** | [^t-no-screen] |
| power | two AA batteries | [^x-manual-350]; the 300's guide is not checked[^unchecked] |
| face | one moulding, 55 keys, with different printing | [^t-moulding] |
| scan codes | 1 to 56, computed from a grid of fourteen lines of four and bound by the key maps as they are, with an event type in the top two bits, [firmware.md](firmware.md#the-keypad-scan); which key is which code is read and inferred from configurations, and heard for 53 keys of a Harmony 350 and for 49 of a Harmony 300, each of those on the code of the 350 key in the same place, [the Harmony 350's keys](../../remotes/harmony-350/keys.md#scan-codes) and [the Harmony 300's](../../remotes/harmony-300/keys.md#scan-codes) | [^t-harmony-350-keys], [^t-harmony-350-keys-c], [^t-harmony-350-keys-u], [^t-harmony-300-keys-u] |
| state variables the firmware owns | 0 to 17, as on the Harmony One and the Harmony 600, 650 and 700; its clock runs to the minute and no further, [memory.md](memory.md#the-state-variables) | [^t-state-block], [^t-harmony-350-clock] |
| activities | one, Watch TV: Logitech's service allows a screenless model one, [how a Harmony works](../../how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity); it is one key's binding in the configuration, and ran on both models | [^s145], [^t-harmony-300-group-4-send-u] |
| long press | a held event on every key, which a configuration binds or not; Logitech's service gives it to the 350 only, and a configuration that binds it worked on both models, [memory.md](memory.md#a-device-key-and-its-long-press) | [^t-long-press], [^t-harmony-300-group-4-send-u] |
| what the firmware does with the skin | reports it and acts on nothing, [firmware.md](firmware.md#the-skin); read in the Harmony 350's image; the Harmony 300's application shares the routines involved, and differs in its `bcdDevice` word | [^t-harmony-350-skin], [^t-harmony-300-350-images] |

## Making a Harmony 300 behave as a Harmony 350

**One entry does it.** Bind firmware event `0xFF` in key map 0, the key table every press falls through to, to a
call of the same action list that event `0x30` runs, the list that ends in the acknowledgement `07 FFFA`. A
configuration Logitech compiled for a Harmony 350 with eight devices, given that entry and nothing else, ran on a
Harmony 300: every one of its eight infrared groups sent, the long presses chose their second devices
(two of them on a second try), Watch TV started and stopped its activity and the five favourite keys sent their channels[^t-harmony-300-group-4-send-u].
The entry is four bytes in the key map, which grows the file by four, put where the compiler's own hash order puts
it, between the entries for events `0x2D` and `0x30`; every other map, action list and infrared group is
unchanged[^t-event-ff-entry-c].

**Every configuration this project builds for the family carries the entry**, so there is one build for both models
and nothing in it names which. The codec's builders put it into each configuration they build from nothing, the empty
one included, as a call of whatever list the `0x30` entry calls; a configuration with eight devices built that way
binds `0xFF` once, between `0x2D` and `0x30` as above, and differs from Logitech's compile of the same setup in its key
table by that entry alone[^t-noscreen-acknowledging-c]. What the codec composes onto one of Logitech's own compiles
keeps that compile's key table, so it carries the entry only if the compile did. **One such build sends the same codes
from the same keys on a Harmony 300 and a Harmony 350**, the long press devices in groups 4 to 7 and an activity
included, with no hang on either[^t-noscreen-final-u].

**Why it is needed.** The two applications are one program but for one routine, [firmware.md](firmware.md#the-two-models-images-compared).
A send from an infrared group above 3 gets a send kind of `0xFF`. The 350's build keeps two bits of it, so every
group raises one of the four events a configuration binds; the 300's build leaves it, so a group above 3 raises
event `0xFF`, which none of the 13 configurations of the family read binds, and the sender waits for ever for the list that would
acknowledge it[^t-harmony-300-group-4-send]. Without the entry a Harmony 300 given eight devices sent from groups 0
to 3 and sent nothing from group 4, in three runs of three presses each, after which the remote ignored most
keys and a device key pressed afterwards stayed lit until the batteries came out[^t-harmony-300-group-4-send-u]. With it, none of that was seen[^t-harmony-300-group-4-send-u].

**What then holds, measured on one Harmony 300**[^t-harmony-300-group-4-send-u]:

| | on a Harmony 300 given a Harmony 350's configuration and the entry |
|---|---|
| infrared groups | all eight sent: groups 0 to 3 as before and each of 4, 5, 6 and 7 from one press at least, the file 118517 bytes |
| devices | eight, four a short press and four a long press, [which group a device takes](memory.md#which-infrared-group-a-device-takes) |
| long press | each of the four device keys, held, chose its second device at least once; **the long press of two keys did not take in the first run**, the remote staying in the short press device's mode, and took when repeated. Why is not known: how long each was held was not recorded, and the hold is about a second, [firmware.md](firmware.md#a-held-key) |
| Watch TV | started its devices in the order the configuration states and stopped them again, the power and input codes 0.196, 0.494 and 2.533 seconds apart where a Harmony 350 running the same configuration measured 0.19, 0.50 and 2.54 |
| favourite channels | the five keys of the favourite block sent the five channels the configuration binds, in the order of the places, which on the European printing are the keys printed 1, 2, Teletext, 4 and 3 |

**Nothing else was changed in the file.** **The entry is harmless on a Harmony 350**: a Harmony 350 given the same file sent the same codes as
without it from the keys tried, and kept working, because its build never raises event `0xFF`[^t-harmony-300-group-4-send-u].
So one configuration with the entry ran on both models, on one unit of each, and nothing in it names the model.
What this does not show: another unit or build of either model, every key of the four maps above group 3, a long
press that always takes, or a 350 raising event `0xFF`, which its image cannot do by the trace above, so that part is read and not
heard; the check on a Harmony 350 heard one send each from groups 0, 2 and 4.

## What still differs

Each row is evidenced in the model's own folder, which is its home for the printing and the keys; the first
five rows are choices Logitech's service makes per model and not something either remote does.

| | Harmony 300 | Harmony 350 |
|---|---|---|
| devices, Logitech's service | 4 | 8 |
| infrared groups Logitech's compile allocates | 4 | 8 |
| long press, Logitech's service | none declared | declared, on the device keys |
| activities, Logitech's service | no `Activities` capability, only `PartiallySetupActivities`[^t-capabilities] | `Activities`, at most 1[^t-capabilities] |
| favourite channels, Logitech's service | 5 for skin 78 and 4 for skin 79, the European model | 5 |
| skins | 78, and 79 the European model | 104 |
| `bcdDevice` | `0x1078`, the family's base skin even on a skin 79 unit, [the 300's usb.md](../../remotes/harmony-300/usb.md) | `0x1104`, [the 350's usb.md](../../remotes/harmony-350/usb.md) |
| device keys print | TV, Cable/Sat, DVD, VCR/Aux | TV/Media, Cable/PC, AVR/Game, DVD/Music, or in an earlier printing TV / AVR, Cable/DVD, BD / Media, Game/MP3 |
| how Logitech's compile binds a device key | the press selects the device, no held event | the release selects, the held event selects a second device, [memory.md](memory.md#a-device-key-and-its-long-press) |

The last row is the compile's and not the remote's: either remote runs whichever the configuration binds. The
bootloaders and safe mode images are different builds, [firmware.md](firmware.md#the-two-models-bootloaders-and-safe-mode-images).

## The files

| file | what it holds |
|---|---|
| [memory.md](memory.md) | the file table, the configuration's slot map |
| [firmware.md](firmware.md) | the 1.4 images, the two models' compared, and where they come from |
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
[^t-harmony-300-350-images-u]: Measured on a unit. [The test](../../../tests/test_harmony_300_350_images.py)
[^t-harmony-300-keys-u]: Measured on a unit. [The test](../../../tests/test_harmony_300_keys.py)
[^t-harmony-350-skin]: Read in the firmware. [The test](../../../tests/test_harmony_350_skin.py)
[^t-harmony-300-350-images]: Read in the firmware. [The test](../../../tests/test_harmony_300_350_images.py)
[^t-harmony-300-350-boards-u]: Measured on a unit. [The test](../../../tests/test_harmony_300_group_4_send.py)
[^t-harmony-300-group-4-send]: Read in the firmware. [The test](../../../tests/test_harmony_300_group_4_send.py)
[^t-harmony-300-group-4-send-u]: Measured on a unit. [The test](../../../tests/test_harmony_300_group_4_send.py)
[^t-event-ff-entry-c]: Measured in configurations. [The test](../../../packages/codec/test/noscreeneventff.test.ts)
[^t-noscreen-final-u]: Measured on a unit. [The test](../../../packages/codec/test/noscreenfinalunits.test.ts)
[^t-noscreen-acknowledging-c]: Measured in configurations. [The test](../../../packages/codec/test/noscreenacknowledging.test.ts)
[^t-long-press]: Read in the firmware. [The test](../../../tests/test_harmony_350_long_press.py)
