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
| the readers of raw slots 5, 6, 8, 9 and 12: the start up event table at `0x11D48`, called once from the validator's tail at `0x162B8`; the key map lookup at `0x1113A` and its tagged list reader at `0x1AB24`; the timer start at `0x16A2E` and the expiry pass at `0x1694A`; the state variable seeder at `0x16E6C` and the record locator at `0x17360`; the digit entry reader at `0x19D56`. What each slot is, [memory.md](memory.md#the-six-slots-the-firmware-was-read-for) | [^t-harmony-350-slots] |
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
loading the configuration's state[^t-harmony-350-file-write]. What the code then does with those pins is
[below](#safe-mode-and-recovery); how a unit behaves with a failing configuration is not checked[^unchecked]. **There is no configuration to fall back on**: `/fw/embeddedcfg` is a name in the
firmware's pool that no row of the file table and no instruction points at, [memory.md](memory.md)[^t-harmony-350-file-write].

The checksum as read reproduces the stored word of every configuration read off a Harmony 300 and a
Harmony 350, five of them[^t-harmony-350-file-write].

## Safe mode and recovery

The file table names a bootloader, 4 KiB at internal `0x000000`, and a safe mode image, 32 KiB at
`0x001000`[^s199]. Neither is in the firmware package, which carries the application alone, so everything
below is what the 1.4 **application** does, and what the two images below it do is not
checked[^unchecked].

**A remote whose configuration fails still serves its files over USB, so a configuration write that
fails half way can be written again from the computer.** The start runs the validator, carries on whatever
its verdict, and enters the main loop, which calls the USB service; nothing in the USB service and the file
commands it reaches reads the verdict, and the only two instructions there that touch it are the open for
writing, which clears it, and a matching check, which sets it[^t-harmony-350-recovery]. A write that stops
with the power on leaves a file open, which the file system reset closes; one that stops with the power
off leaves a configuration the start rejects, after which the remote runs on with no configuration and
answers on the cable, [usb.md](usb.md#what-the-firmware-does-with-a-write)[^t-harmony-350-recovery]. None
of this has been done to a unit[^unchecked].

| | what the 1.4 application does | evidence |
|---|---|---|
| a failing configuration | latches an error code, 8 for a missing marker and 4 for the checksum, which stands until the processor restarts, and switches four output pins on and off in a pattern counted from it, from the main loop. It neither stops nor restarts. That the pins are the remote's lights is not checked | [^t-harmony-350-recovery], [^unchecked] |
| the firmware type `/sys/sysinfo` states | always 0, a constant in the code. Logitech's client calls 0 normal mode, 3 the bootloader and 4 safe mode, so a 3 or a 4 means another image is answering | [^t-harmony-350-recovery], [^t-harmony-350-recovery-client] |
| a request for whatever runs after a restart | a byte in data memory, set to `0x0F` by the reboot command's parameter `0x73` and to 2 by a flush of `/fw/normalmode` open for writing, whose close then restarts. The start clears it only after a restart by the reset instruction, so code that runs before the application reads it. What the bootloader or safe mode does with either value is not checked; on the Harmony 600, 650 and 700 a 2 asks safe mode to install the staged copy, [their firmware.md](../harmony-600-650-700/firmware.md) | [^t-harmony-350-recovery], [^unchecked] |
| three keys held together | restart the processor, tested at the start of the keypad routine. Which three keys is not known, since no scan code is tied to a key on this architecture | [^t-harmony-350-recovery], [^unchecked] |
| a way into the images below it | none: no call or jump in the application targets an address below `0x9000`, and its three reset instructions, the reboot command's, the key combination's and one after sleep, restart the processor with nothing written on the way | [^t-harmony-350-recovery] |

**What restores a damaged application is, on Logitech's account, a firmware install over the same file
protocol.** The firmware package writes `/fw/normalmode`, which for writing is the staged copy on the
external medium at `0x000000`, `0x15C00` bytes, then flushes and closes, and its manifest asks for the
reboot[^t-harmony-350-recovery-package][^t-harmony-350-recovery]. Logitech's client calls an install required
whenever a remote reports safe mode, ahead of any version comparison, and its firmware sequence for skin
104 is the configuration's seven commands[^t-harmony-350-recovery-client]. Whether this family's safe mode
image serves that sequence, and what installs the staged copy, is not checked[^unchecked].

* **A configuration write cannot damage the firmware.** Its erase runs from `0x020000` to `0x07FFFF`, the
  staged copy ends below `0x020000`, and nothing in it reaches the processor's own flash, where the
  application, the safe mode image and the bootloader live[^t-harmony-350-recovery].
* **The two images this page could not read are readable files on the remote**: `/fw/bootloader`,
  `/fw/safemode` and the resident `/fw/normalmode` all allow reading. The check command tests the `HG`
  header in both internal images, the safe mode image and the application, so a remote can verify them
  without a read[^t-harmony-350-recovery].

## Not checked

* Which version a given remote runs: its `/sys/sysinfo` carries a version field, and only the product
  string's 1.4.0 has been read[^s193].
* How safe mode and the bootloader are entered other than through the application's request byte, whether
  either tests a key at power on, what each serves over USB, and whether entering either overwrites the
  application, as entering safe mode does on the [Harmony 525](../harmony-5xx/firmware.md): all of it is in
  the two images this project does not hold[^unchecked].
* Whether a configuration that passes the validator and hangs while its state is loaded at start would
  keep a remote from the USB service, and whether the processor's watchdog is on, which is in the
  configuration words at internal `0x01FFF8`[^unchecked].
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
[^t-harmony-350-recovery]: Read in the firmware. [The test](../../../tests/test_harmony_350_recovery.py)
[^t-harmony-350-recovery-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_350_recovery.py)
[^t-harmony-350-recovery-package]: Stated by Logitech, by their service. [The test](../../../tests/test_harmony_350_recovery.py)
[^s310]: Read in the firmware. [Section 310](../../../docs/findings.md#s310)
[^s354]: Read in the firmware. [Section 354](../../../docs/findings.md#s354)
[^t-harmony-350-slots]: Read in the firmware. [The test](../../../tests/test_harmony_350_slots.py)
