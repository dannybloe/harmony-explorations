# Harmony 300 and 350: firmware

**One image serves both models.** Each model folder's `firmware.md` points here.

## The 1.4 image

| | value | standing and source |
|---|---|---|
| package | `skin104-harmony350-production-1.4.0.0`, a ZIP holding `Description.xml` and `Region_2.EZUpgrade`, whose `<INTENDED>` names skins 78, 79 and 104, written to `/fw/normalmode` | Logitech's service, its software update service, section 196 |
| version | 1.4 | the manifest and the image header, section 196; MyHarmony's version list also names both models at 1.4.0, Logitech's client |
| decoded | 73472 bytes, an `HG` header that verifies, an ordinary PIC18 image | read in the firmware, section 196; checksum in `reference/checksums.md` |
| load base | `0x9000`: 1581 of 1582 branch targets land in code there | read in the firmware, section 196; agrees with `/fw/normalmode`'s own row in the file table, section 199 |
| the checksum Logitech's manifest states | the XOR of little endian words that section 41 found for configuration containers, seeded `0x4321` | Logitech's service, recomputed, section 196 |

**Where it comes from**: Logitech's software update service, production channel, by product and with no
login, section 196; MyHarmony asks that service for the Harmony 350 specifically, Logitech's client,
section 295. The `myharmony-service` skill holds the mechanics. It is in the lab and never in this
repository.

## Routines read on it

| routine | section |
|---|---|
| the file table and the name pool | 199 |
| the configuration validator, marker at `0x47` | 259 |
| the section seeker, called for raw slots 3 to 12 | 259 |
| the month end routine of the clock | 322 |
| the state variable bound | 276 |

## Safe mode and recovery

The file table names a safe mode image and a bootloader, section 199. **How either is entered, and how a
remote of this family is recovered, is not checked**; the `recovering-a-remote` skill has nothing on this
architecture. Nothing here sends anything that would need recovering from, [usb.md](usb.md).

## Not checked

* Which firmware version each bench unit runs: the version field of `/sys/sysinfo` is not recorded, and
  only the product string says 1.4.0.
* Safe mode entry and recovery.
