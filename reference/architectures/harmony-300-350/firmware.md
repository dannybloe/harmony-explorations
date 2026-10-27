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
| the configuration test the host's check runs, at `0x14AC2`: `GSPM` compared from `0x14AE8`, `LWJL` at the hardcoded `0x47`, then the stored checksum word returned rather than recomputed. Section 259 called it the configuration validator<!--superseded-->; the validator that runs at start is the next row | [^s259], [^t-harmony-350-firmware], [^t-harmony-350-file-write] |
| the configuration validator at `0x16090`, run at start and from a second call site in the main loop while the verdict is clear: `GSPM`, `LWJL` at `0x47`, `PTYY` at `end_addr` and the trailer checksum, below | [^t-harmony-350-file-write] |
| the file protocol: the request parser at `0xCB88`, the reply dispatcher at `0xE2F0`, the file lookup at `0x12CF0`, the close at `0x12CE6`, the read size of `/cfg/usercfg` at `0x14C58`, [usb.md](usb.md#what-the-firmware-does-with-a-write) | [^t-harmony-350-file-write] |
| the section seeker, `0x0B + 4 * slot` at `0x10BCE` on the 350's 1.4 image, called for raw slots 3 to 12 from 14 call sites | [^s259] |
| the month end routine of the clock | [^s322] |
| the state variable bound | [^s276] |

## What validates the configuration

**In the 1.4 image a remote keeps its judgement of the configuration in one bit and acts on the bit**, not
on the bytes: the configuration's verdict, bit 2 of data memory `0x68E`, the same byte and bit the Harmony
700 uses[^t-harmony-350-file-write][^s310]. Six of the fourteen calls that seek a section of the
configuration test the bit a few instructions before and skip the configuration when it is clear, and a
seventh runs only after the validator has set it; whether the other seven are reached only with the bit
set is not checked[^t-harmony-350-file-write][^unchecked].

| | what sets or clears it | evidence |
|---|---|---|
| at start | the validator at `0x16090`: `GSPM` at the start, `LWJL` at `0x47`, `PTYY` at `end_addr`, then the trailer checksum, seeded `0x4321`, over the little endian words from the start to the stored word at `end_addr - 2`, [the container](../../config-format/container.md#the-trailer-checksum) | [^t-harmony-350-file-write] |
| the checksum's gate | skipped while bit 0 of setting `0x80` in the settings store is clear, the gate the Harmony 600, 650 and 700 have; an absent setting reads `0xFF`, so a store without one asks for the checksum | [^t-harmony-350-file-write], [^s354] |
| a second call site in the main loop | the same validator again, only if the verdict is clear; that this is the end of a USB session is likely and not checked | [^t-harmony-350-file-write] |
| an open of `/cfg/usercfg` for writing | clears it | [^t-harmony-350-file-write] |
| the host's check answering `m` for `/cfg/usercfg` | sets it, on the stored checksum word alone and without `PTYY`, [usb.md](usb.md#what-the-firmware-does-with-a-write) | [^t-harmony-350-file-write] |

**In the code read, a configuration that fails is not refused and does not stop the firmware.** The validator returns
with the verdict clear and an error code latched, 8 when a marker is missing and 4 when the checksum fails,
which a routine at `0x1A7EE` copies to `0x700` while setting four port pins, and the start goes on without
loading the configuration's state[^t-harmony-350-file-write]. What a person sees from the code, and how a
unit behaves with a failing configuration, is not checked[^unchecked]. **There is no configuration to fall back on**: `/fw/embeddedcfg` is a name in the
firmware's pool that no row of the file table and no instruction points at, [memory.md](memory.md)[^t-harmony-350-file-write].

The checksum as read reproduces the stored word of every configuration read off a Harmony 300 and a
Harmony 350, five of them[^t-harmony-350-file-write].

## Safe mode and recovery

The file table names a safe mode image and a bootloader[^s199]. How either is entered, and how a remote of
this family is recovered, is not checked[^unchecked]. Nothing in this library sends anything that would
need recovering from, [usb.md](usb.md).

## Not checked

* Which version a given remote runs: its `/sys/sysinfo` carries a version field, and only the product
  string's 1.4.0 has been read[^s193].
* Safe mode entry and recovery[^unchecked].
* What a failed validation shows a person, and whether a configuration the check marked good is put to
  use before the remote restarts, since the check sets the verdict without the loading the start does[^unchecked].
* Whether a unit's settings store holds setting `0x80`, and so whether its start checks the
  checksum[^unchecked].

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
[^t-harmony-350-file-write]: Read in the firmware. [The test](../../../tests/test_harmony_350_file_write.py)
[^s310]: Read in the firmware. [Section 310](../../../docs/findings.md#s310)
[^s354]: Read in the firmware. [Section 354](../../../docs/findings.md#s354)
