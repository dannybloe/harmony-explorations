# Harmony 700: firmware

The firmware is the program the remote runs; the configuration a person builds is only data it reads.
This page says which versions of that program a 700 runs and how a 700 installs one. The architecture's
part, how an image is laid out, what safe mode is and the `-safe.bin` naming trap, is in
[the architecture's firmware.md](../../architectures/harmony-600-650-700/firmware.md), and the images'
checksums are in `docs/checksums.md`.

## Versions

| version | what | evidence |
|---|---|---|
| **2.8** | Logitech's package `harmony_700_firmware_2_8__1_.hfw`: application 76672 bytes, entry `0x1BB38`, execution base `0x9000`; the descriptor names `Harmony Remote 0-2.8.0` and `bcdDevice` `0x1066`, [the transport](../../usb-protocol/transport.md). Installed and running on a 700 | [^s13], [^s297] |
| **2.5** | an application of 71552 bytes, run by a 700 and found in its staging region | [^s295], [^s298] |
| **2.3** | the safe mode image, 29888 bytes | [^s295] |
| 2.5.0 | the forum table's newest, which is out of date | [^x-forum] |
| 2.8 | the version MyHarmony's own list, `VersionDbDefaults2.xml`, names for the 700, so the 2.8 package is the newest Logitech names; the image it names answers 404, as every image on that list does | [^x-versiondb] |

**The 2.8 build is the same program as the 0.2 builds at other addresses** where it has been compared:
its cache drop is the 0.2 drop relocated plus one flag[^s299]; its update status byte handler is
2.5's[^s298]; its restart is read[^s97]. The 2.8 image is also where this project's first firmware pass
and the action list interpreter were read[^s13][^s34].

**Read on the 2.8 build since**, all read in the firmware:

* **The clock and the boot**: the boot read of the configuration's build stamp fills the counter of time
  since the build at `0xF0F`, as on the other images[^s310]; the month end routine is at `0x150DA`, the same
  code as on every image, counting the day of the month from 0[^s322]; the state variables sit at
  `0x900 + n`[^s384], and the clock was read there over USB[^s386].
* **The validator** follows the end marker's address to the third marker as the 0.2 builds do, and gates
  the trailer checksum on a bit at `0x3A9` loaded from setting `0x80`[^s354]; the rest of its structure is
  at other addresses[^s257], and it is not read further for the status screens[^s355].
* **The display**: pixels go from the flash to the panel twice per pixel, no swap and no buffer, in the
  loop at `0x0E3A2`, with SSP1 the flash and SSP2 the panel[^s367]; the panel set up keeps both variants of
  the 0.2 builds and adds two more, not read further[^s387].
* **The charger test and the battery events**, in [hardware.md](hardware.md)[^s384]. The instruction rate
  is 4 million a second: a 4 MHz crystal through the PLL with the processor clock divided by three, 16 MHz,
  from the first pass's measurement and the configuration words of the processor, and a timer tick is
  1 ms[^s384][^s13].
* **The configuration's group 3 light**: its routine is the twin of group 1's, states 6 and 7 included,
  chooses between two setters, and drives `LATG` bit 0 by pulses, cleared at level 0, where the 0.2 build
  uses a PWM; which light it is is not established[^s392].
* **The settings command family** carries the 0.2 builds' gate plus a third range of command states,
  `0xD0` to `0xD6`[^s304], and a charger control, [usb.md](usb.md)[^s384].

**Logitech's software update service answers 404 for skin 66**[^s295]; the 2.8 package comes from a repair
site. MyHarmony takes a different route for this family, whose file name is unread, and whether Logitech
still serves firmware for it is not established[^s295].

## Installing firmware

The 700 is the model both of the architecture's install routes were run on, and both make the **remote**
install: nothing writes the processor's flash from the host.

1. **Reinstall what is staged**: set the update status byte to 2 and restart, and the safe mode image copies
   the application staged at external `0x000000`. Read on the 2.3 safe mode image, and run on a 700 stuck
   in safe mode, which came back running 2.5[^s295].
2. **Stage an image first**: Logitech's own unmodified 2.8 image written into external `0x000000` to
   `0x020000`, then the reinstall; it took a 700 from 2.5 to 2.8[^s297], under this project's rule that
   only Logitech's own image is staged[^d18]. The way back to 2.5 is the same route[^s298].

Logitech's own sequence for skin 66 is the same five steps, `firmwareupgrade.xml`[^s297b]. The limit on what
an install copies is the architecture's, [its firmware.md](../../architectures/harmony-600-650-700/firmware.md).

## Not checked

* The 2.8 build's clock seeder and validator in full; the parts listed above are read[^s310][^s354]. This
  said "The 2.8 build's clock and validator routines"<!--superseded--> were not checked until those
  sections.
* Whether the 2.8 build queues the welcome tour's start, which the Off screen's mark waits for[^s386].
* Entering safe mode on a 700 by keys; the bootloader compares two scan codes[^s87], untried on this
  model[^unchecked].
* Why a 2.5 application can lose a page of program memory, as on the 700 that arrived in safe
  mode[^s295].

[^s13]: Read in the firmware. [Section 13](../../../docs/findings.md#s13)
[^s297]: Measured on a unit. [Section 297](../../../docs/findings.md#s297)
[^s295]: Measured on a unit. [Section 295](../../../docs/findings.md#s295)
[^s298]: Read in the firmware. [Section 298](../../../docs/findings.md#s298)
[^x-forum]: Stated by a third party. [The forum comparison table](https://harmony-remote-forum.de/harmony_compare.php)
[^x-versiondb]: Stated by Logitech, in their client. [MyHarmony's version list](https://files.myharmony.com/Assets/Firmware/VersionDbDefaults2.xml)
[^s299]: Read in the firmware. [Section 299](../../../docs/findings.md#s299)
[^s97]: Read in the firmware. [Section 97](../../../docs/findings.md#s97)
[^s34]: Read in the firmware. [Section 34](../../../docs/findings.md#s34)
[^s310]: Read in the firmware. [Section 310](../../../docs/findings.md#s310)
[^s322]: Read in the firmware. [Section 322](../../../docs/findings.md#s322)
[^s384]: Read in the firmware. [Section 384](../../../docs/findings.md#s384)
[^s386]: Measured on a unit. [Section 386](../../../docs/findings.md#s386)
[^s354]: Read in the firmware. [Section 354](../../../docs/findings.md#s354)
[^s257]: Read in the firmware. [Section 257](../../../docs/findings.md#s257)
[^s355]: Read in the firmware. [Section 355](../../../docs/findings.md#s355)
[^s367]: Read in the firmware. [Section 367](../../../docs/findings.md#s367)
[^s387]: Read in the firmware. [Section 387](../../../docs/findings.md#s387)
[^s392]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^s304]: Read in the firmware. [Section 304](../../../docs/findings.md#s304)
[^d18]: Chosen by this project. [Decision 18](../../../docs/decisions.md#d18)
[^s297b]: Stated by Logitech, in their client. [Section 297](../../../docs/findings.md#s297)
[^s87]: Read in the firmware. [Section 87](../../../docs/findings.md#s87)
[^unchecked]: Not checked.
