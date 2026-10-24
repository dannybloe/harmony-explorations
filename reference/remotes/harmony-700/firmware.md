# Harmony 700: firmware

What the 700 runs, what exists of it in the lab, and how it installs. The architecture's part, how an
image is laid out, what safe mode is and the `-safe.bin` naming trap, is in
[the architecture's firmware.md](../../architectures/harmony-600-650-700/firmware.md).

## Versions

| version | where | standing and source |
|---|---|---|
| **2.8** | Logitech's package `harmony_700_firmware_2_8__1_.hfw`: application 76672 bytes, entry `0x1BB38`, execution base `0x9000`; the descriptor names `Harmony Remote 0-2.8.0` and `bcdDevice` `0x1066` | read in the firmware, sections 13 and 297, `docs/usb-protocol.md` section 1; and measured installed and running on a unit, section 297 |
| **2.5** | an application of 71552 bytes, seen on a unit and in its staging region | measured, sections 295 and 298 |
| **2.3** | the safe mode image, 29888 bytes | measured, section 295 |
| 2.5.0 | the forum table's "newest seen", which is out of date | third party, `reference/capabilities.md` |
| 2.8 | the version MyHarmony's own list, `VersionDbDefaults2.xml`, names for the 700, so the 2.8 package is the newest Logitech names; the image it names answers 404, as every image on that list does | client sourced, `todo-secure-logitech.md` 4.1 |

**The 2.8 build is the same program as the 0.2 builds at other addresses** where it has been compared:
its cache drop is the 0.2 drop relocated plus one flag, section 299; its update status byte handler is
2.5's, section 298; its restart is read, section 97. The 2.8 image is also where this project's first
firmware pass and the action list interpreter were read, sections 13 and 34.

**Read on the 2.8 build since**, all read in the firmware:

* **The clock and the boot**: the boot read of the configuration's build stamp fills the counter of time
  since the build at `0xF0F`, as on the other images, section 310; the month end routine is at
  `0x150DA`, the same code as on every image, counting the day of the month from 0, section 322; the state variables sit at `0x900 + n`,
  section 384, and the clock was read there over USB, section 386.
* **The validator** follows the end marker's address to the third marker as the 0.2 builds do, and gates
  the trailer checksum on a bit at `0x3A9` loaded from setting `0x80`, section 354; the rest of its
  structure is at other addresses, section 257, and not read further for the status screens, section 355.
* **The display**: pixels go from the flash to the panel twice per pixel, no swap and no buffer, in the
  loop at `0x0E3A2`, with SSP1 the flash and SSP2 the panel, section 367; the panel set up keeps both
  variants of the 0.2 builds and adds two more, not read further, section 387.
* **The charger test and the battery events**, section 384, in [hardware.md](hardware.md). The instruction
  rate is 4 million a second, from section 13's measurement and the configuration words read off a unit, a
  4 MHz crystal through the PLL with the processor clock divided by three, 16 MHz, and a timer tick is 1 ms,
  section 384.
* **The configuration's group 3 light**: its routine is the twin of group 1's, states 6 and 7 included,
  chooses between two setters, and drives `LATG` bit 0 by pulses, cleared at level 0, where the 0.2 build
  uses a PWM; which light it is is not established, section 392.
* **The settings command family** carries the 0.2 builds' gate plus a third range of command states,
  `0xD0` to `0xD6`, section 304, and a charger control, [usb.md](usb.md), section 384.

**Logitech's software update service answers 404 for skin 66**, section 295; the 2.8 package is from the
repair site. MyHarmony takes a different route for this family, whose file name is unread, and whether
Logitech still serves firmware for it is **not established**, section 295.

## Images in the lab

Never in this repository. Checksums are in `docs/checksums.md`.

| file in `lab/firmware/` | what |
|---|---|
| `packages/harmony_700_firmware_2_8__1_.hfw` | Logitech's 2.8 package |
| `derived/700-2.8-Region_2-code-base0x9000.bin` | its application |
| `derived/700-2.8-Region_3-gspm-base0x20000.bin` | its safe mode configuration |

The 2.5 image exists only as cut out of a unit's staging read, 71552 bytes, section 298.

## Installing firmware

The 700 is the model both of the architecture's install routes were run on:

1. **Reinstall what is staged**: set the update status byte to 2 and restart, and the safe mode image copies
   the application staged at external `0x000000`. Read on the 2.3 safe mode image and run on a unit stuck in
   safe mode, which came back running 2.5, section 295.
2. **Stage an image first**: Logitech's own unmodified 2.8 image written into external `0x000000` to
   `0x020000`, then the reinstall; it took a unit from 2.5 to 2.8, section 297, decision 18. The way back to
   2.5 is the same route, section 298.

Logitech's own sequence for skin 66 is the same five steps, `firmwareupgrade.xml`, section 297. Nothing
writes the processor's flash from the host; the remote copies the image itself. The rails are `CLAUDE.md`'s
"Never write to a remote" and the `recovering-a-remote` skill holds the route.

## Not checked

* The 2.8 build's clock seeder and validator in full; the parts listed above are read, sections 310, 322,
  354 and 384. This said "The 2.8 build's clock and validator routines"<!--superseded--> were not checked
  until those sections.
* Whether the 2.8 build queues the welcome tour's start, which the Off screen's mark waits for, section 386.
* Entering safe mode on a 700 by keys; the bootloader compares two scan codes, section 87, unread on this
  model.
* Why the 2.5 application on the unit of section 295 lost a page of program memory.
