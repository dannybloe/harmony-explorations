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

**The 2.8 build is the same program as the 0.2 builds at other addresses** where it has been compared:
its cache drop is the 0.2 drop relocated plus one flag, section 299; its update status byte handler is
2.5's, section 298; its restart is read, section 97. The 2.8 image is also where this project's first
firmware pass and the action list interpreter were read, sections 13 and 34.

**Logitech's software update service answers 404 for skin 66**, section 295; the 2.8 package is from the
repair site. MyHarmony takes a different route for this family, whose file name is unread, and whether
Logitech still serves firmware for it is **not established**, section 295.

## Images in the lab

Never in this repository. Checksums are in `reference/checksums.md`.

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

* The 2.8 build's clock and validator routines.
* Entering safe mode on a 700 by keys; the bootloader compares two scan codes, section 87, unread on this
  model.
* Why the 2.5 application on the unit of section 295 lost a page of program memory.
