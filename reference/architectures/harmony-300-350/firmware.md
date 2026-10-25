# Harmony 300 and 350: firmware

**One program runs both models.** Logitech publishes a single firmware package whose manifest names the
Harmony 300's two skins and the Harmony 350's, and it is an ordinary PIC18 program like the Harmony 600's.
Each model folder's `firmware.md` points here.

## The 1.4 image

| | value | evidence |
|---|---|---|
| package | a ZIP holding `Description.xml` and `Region_2.EZUpgrade`, whose `<INTENDED>` names skins 78, 79 and 104, written to `/fw/normalmode` | [^s196] |
| version | 1.4, in the manifest and the image header; MyHarmony's version list also names both models at 1.4.0 | [^s196], [^x-versiondb] |
| decoded | 73472 bytes, an `HG` header that verifies, an ordinary PIC18 image | [^s196b] |
| load base | `0x9000`: 1581 of 1582 branch targets land on a boundary there, 99.9%, against 475 of 1460 for the runner up at `0xC000`, 32.5%; the instruction at `0x9000` is `GOTO 0x1AED4` and the header's own entry point field is `0x1AED4`, so the base has a closure and not only a score. It agrees with `/fw/normalmode`'s own row in the file table | [^s196b], [^s199] |
| the checksum Logitech's manifest states | the XOR of little endian words configuration containers use, seeded `0x4321`, [the container](../../config-format/container.md#the-trailer-checksum) | [^s196] |

**Where it comes from**: Logitech's software update service, production channel, by product and with no
login[^s196]. MyHarmony asks that service for the Harmony 350 by name, where the Harmony 600, 650 and 700
take another route[^s295].

## Routines read on it

| routine | evidence |
|---|---|
| the file table and the name pool | [^s199] |
| the configuration validator, marker at `0x47`; on the 350's 1.4 image it compares `GSPM` from `0x14AE8` | [^s259], [^t-harmony-350-firmware] |
| the section seeker, `0x0B + 4 * slot` at `0x10BCE` on the 350's 1.4 image, called for raw slots 3 to 12 from 14 call sites | [^s259] |
| the month end routine of the clock | [^s322] |
| the state variable bound | [^s276] |

## Safe mode and recovery

The file table names a safe mode image and a bootloader[^s199]. How either is entered, and how a remote of
this family is recovered, is not checked[^unchecked]. Nothing in this library sends anything that would
need recovering from, [usb.md](usb.md).

## Not checked

* Which version a given remote runs: its `/sys/sysinfo` carries a version field, and only the product
  string's 1.4.0 has been read[^s193].
* Safe mode entry and recovery[^unchecked].

[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^x-versiondb]: Stated by Logitech, in their client. [MyHarmony's version list](https://files.myharmony.com/Assets/Firmware/VersionDbDefaults2.xml)
[^s196b]: Read in the firmware. [Section 196](../../../docs/findings.md#s196)
[^s199]: Read in the firmware. [Section 199](../../../docs/findings.md#s199)
[^s295]: Stated by Logitech, in their client. [Section 295](../../../docs/findings.md#s295)
[^s259]: Read in the firmware. [Section 259](../../../docs/findings.md#s259)
[^t-harmony-350-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_350_firmware.py)
[^s322]: Read in the firmware. [Section 322](../../../docs/findings.md#s322)
[^s276]: Read in the firmware. [Section 276](../../../docs/findings.md#s276)
[^unchecked]: Not checked.
[^s193]: Measured on a unit. [Section 193](../../../docs/findings.md#s193)
