# Harmony 600, 650 and 700: firmware

The firmware is **one program in several builds**: the same routines, mostly at the same addresses
within a build family, with the builds differing by model and version. So nothing read on one build
transfers to another by address without checking, section 281. Each model folder lists its own
versions; this file states what is common.

## Builds in the lab

| build | model | where it came from | standing and source |
|---|---|---|---|
| 0.2, application 70336 bytes, entry `0x1A26E` | Harmony 600 | read off the bench unit | measured; `600-0.2-code-base0x9000-COMPLETE.bin`, checksum in `reference/checksums.md` |
| 0.2, application 70336 bytes, entry `0x1A262` | Harmony 650 | read off the bench unit | measured, section 281 |
| 0.4, application 75392 bytes, entry `0x1B658` | Harmony 650 | Logitech's package, repair site | read in the firmware, section 30 |
| 2.5, 71552 bytes | Harmony 700 | the bench unit's staging read | measured, sections 295 and 298 |
| 2.8, application 76672 bytes, entry `0x1BB38` | Harmony 700 | Logitech's package; what the bench 700 runs since section 297 | read in the firmware and measured |

Every image loads at `0x9000`, its header is `0x00` to `0x0F` and its own checksum verifies,
`reference/checksums.md` and sections 1 to 5. **Logitech's software update service answers 404 for
skins 66, 71 and 72**, section 295, so the packages above are all there is.

## Routines read and where

Read on each build named, sections cited. Where a build is missing it is not read.

| routine | builds read | section |
|---|---|---|
| flash address classifier, ceiling `0x200000` | 600 0.2, 650 0.2, 650 0.4, 700 2.8 | 192, 281 |
| external flash eraser, SPI `0xD8`, 64 KiB | the same four | 281 |
| cache drop, `WRITE_MISC` selector `0x02` | 600 and 650 0.2, 650 0.4, 700 2.8 | 282, 283, 299 |
| restart, the escape's `0x02` | 600 and 650 0.2, 700 2.5 and 2.8 | 97, 282, 298 |
| settings store read and write, `0x13 0xB2` and `0x14 0xB3` | 600 and 650 0.2; 700 2.8 reaches its own append, unread | 304, 305 |
| clock routines | 600 and 650 0.2 | 310 |
| state variable seeder | 0.2, 0.4 | 283, 284 |
| update status byte, `WRITE_MISC` selector 6 | 700 2.5 and 2.8; the 2.3 safe mode image | 295, 297, 298 |

## Safe mode

* The safe mode **image** is in internal flash at `0xFE` `+0x1000`; the safe mode **configuration** is in
  external flash at `0x020000`. On the Harmony One the arrangement is different, `docs/memory-map.md`.
* **The `-safe.bin` trap**: on this architecture the `*-safe.bin` file concordance's `--dump-safemode`
  writes holds the **application** truncated at 64 KiB, not a safe mode image; the lab keeps the 600's
  as `600-0.2-code-base0x9000-TRUNCATED64k.bin`, `reference/checksums.md` and `CLAUDE.md`.
* Safe mode reports software type 4 over USB, the application 0, `docs/usb-protocol.md`.
* The status screens a rejected configuration raises are the architecture's 35, section 244, and a failed
  validation re-arms rather than latching, unlike the Harmony One, section 253.

## Installing firmware

Nothing here writes the processor's flash. Two routes exist and both make the **remote** install:

1. **Reinstall what is staged**: set the update status byte to 2 and restart, and safe mode copies the
   application staged at external `0x000000`. Read on the 700's 2.3 safe mode image and run on the 700,
   section 295; the 600's and 650's 0.2 safe mode images carry part of the routine, at `0x01A8C`, and are
   otherwise unread.
2. **Stage an image first**: Logitech's own unmodified image written into external `0x000000` to
   `0x020000`, decision 18; run on the 700, taking it from 2.5 to 2.8, section 297.

The rails, the named doors and the unit list are `CLAUDE.md`'s "Never write to a remote" and
[usb.md](usb.md). The `recovering-a-remote` skill holds the route.

## Not checked

* Why builds of the same version differ between the 600 and 650.
* The 600's and 650's safe mode handling of the status byte, end to end.
* Safe mode entry by keys on any unit of this architecture: the bootloader compares two scan codes,
  `0x14` and `0x2C`, section 87, which is a reading and has not been tried.
* The 0.4 package's validator and clock routines.
