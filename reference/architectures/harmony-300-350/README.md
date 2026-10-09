# Harmony 300 and 350: the shared platform

**Architecture 16** in Logitech's own client and in this project: the **file based family**, whose remotes
speak a file protocol over USB rather than the command protocol of the Harmony One and the Harmony 600,
650 and 700. Two models on the bench share one firmware image, one file table, one product id, one
configuration container and one moulding, and differ in how many devices they hold, whether a device key
has a long press, and what is printed on the keys. This folder states what they share, once; each model's
folder states only how it differs.

**This library never opens either model with `openHarmony`**, which refuses the file based family, and
nothing has ever been written to one. A separate read only path, `openFileBasedRemote`, reads a
configuration as a file, section 262. The rails are in [usb.md](usb.md).

| model | folder |
|---|---|
| Harmony 300 | [harmony-300](../../remotes/harmony-300/README.md) |
| Harmony 350 | [harmony-350](../../remotes/harmony-350/README.md) |

Logitech's client places a third skin on this architecture, 103 "Cardu", whose model nothing here names,
section 197. The Harmony 200 is screenless and file based too, product id `0xC125`; its architecture is
**not checked**.

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
behind, `reference/capabilities.md`. Skins 78 and 79 are a regional pair, the Harmony 300 and its European
model; 104 is the Harmony 350 alone. Logitech's service, sections 131 and 196. Logitech's client names
78 "Pepsi" and 104 "Templeton", section 197.

## Shared, in one table

| | value | standing and source |
|---|---|---|
| architecture | 16 | measured off both models' own `/sys/sysinfo`, sections 262 and 264; stated in every configuration's base slot 1; Logitech's client, section 197 |
| USB product id | `0xC124` for both | measured by enumeration, sections 193 and 195 |
| USB product string | `Harmony Remote 0-1.4.0` | measured, section 193 |
| firmware | 1.4, **one image for skins 78, 79 and 104** | Logitech's service, its software update service's package, section 196 |
| processor | an ordinary PIC18 image; the part is **not checked** | read in the firmware, section 196 |
| internal flash | 128 KiB: bootloader, safe mode, application and records, from the firmware's own file table | read in the firmware, section 199 |
| where the configuration lives | `/cfg/usercfg`, on the external medium at `0x020000`, 256 KiB | read in the firmware, section 199 and `tests/test_harmony_350_firmware.py` |
| configuration container | `GSPM`, `LWJL` and `PTYY` with **15 pointer slots**; the header byte `0x0F` is the slot count, not a version | measured, section 194 |
| screen | **none** | Logitech's service, display "none", `reference/capabilities.md`; Logitech's manuals |
| power | two AA batteries | Logitech's manuals, both models |
| face | one moulding, 55 keys, with different printing | a statement from the bench holding both; `packages/silhouettes/src/models/h300.ts` |
| scan codes | **none known**: nothing measured ties a key to a code on this architecture | `h350.ts`; `packages/silhouettes/test/models.test.ts` |
| activities | at most one, a screenless model's limit | Logitech's service and a fill test, `docs/how-a-harmony-works.md` |
| long press | the 350 has one and the 300 does not | Logitech's service, `SKINS_WITH_A_LONG_PRESS` |

## How the two differ

| | Harmony 300 | Harmony 350 |
|---|---|---|
| skins | 78, and 79 the European model | 104 |
| `bcdDevice` | `0x1078`, the family's base skin even on a skin 79 unit | `0x1104` |
| devices, Logitech's service | 4 | 8 |
| infrared groups in every configuration | 4 | 8 |
| device keys and a long press | four keys, no long press | four keys, each with a short and a two second press |
| activities, Logitech's service | no `Activities` capability, only `PartiallySetupActivities` | `Activities`, at most 1 |
| favourite channels, Logitech's service | 5 for skin 78 and 4 for skin 79, the European model | 5 |
| device keys print | TV, Cable/Sat, DVD, VCR/Aux | TV / AVR, Cable/DVD, BD / Media, Game/MP3 |

Sources in each model's folder.

## The files

| file | what it holds |
|---|---|
| [memory.md](memory.md) | the file table, the configuration's slot map |
| [firmware.md](firmware.md) | the 1.4 image and where it comes from |
| [usb.md](usb.md) | the file protocol, what is read, the rails |
| [misc.md](misc.md) | the rest |

## Not checked

* The processor part, the external medium's part and size, and the RAM size.
* Skin 103, and whether the Harmony 200 is this architecture.
* Which key sends which code, on either model.
