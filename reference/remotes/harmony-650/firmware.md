# Harmony 650: firmware

What the 650 runs, what exists of it in the lab, and how it would be recovered. The architecture's
part, how an image is laid out, what safe mode is and the `-safe.bin` naming trap, is in
[the architecture's firmware.md](../../architectures/harmony-600-650-700/firmware.md).

## Versions

| version | where | standing and source |
|---|---|---|
| **0.2** | what the bench unit runs: application 70336 bytes, entry `0x1A262`, safe mode 24320 bytes | measured, version block and its own internal pages, section 281 |
| **0.4** | the newest published, Logitech's package `harmony_650_firmware_0_4.hfw`: application 75392 bytes, entry `0x1B658`, execution base `0x9000` | read in the firmware, section 30 |
| 0.2 | the forum table's "newest seen", which is out of date | third party, `reference/capabilities.md` |

The bench unit has **not** been updated to 0.4 and nothing here proposes it.

**The 650's 0.2 is not the 600's 0.2.** One program in two builds: 1395 bytes differ position by
position, 67333 of 70336 sit at the same address, and a run near the top is shifted twelve bytes lower
on the 650. So an address read on the 600 does not transfer to the 650 without checking, section 281.
Why the builds differ is **not checked**; the colour panel is the obvious suspect and only that.

Routines read on both 0.2 builds and found identical: the flash classifier and eraser, section 281; the
cache drop and the restart, section 282; the clock routines, section 310; the settings store read and
write path, sections 304 and 305; the state variable seeder, section 284.

## Images in the lab

Never in this repository. Checksums, where published, are in `reference/checksums.md`.

| file in `lab/firmware/` | what | checksum |
|---|---|---|
| `packages/harmony_650_firmware_0_4.hfw` | Logitech's 0.4 package, from the repair site | SHA-256 in `reference/checksums.md` |
| `derived/650-0.4-Region_2-code-base0x9000.bin` | its application | in `reference/checksums.md` |
| `derived/650-0.4-Region_3-gspm-base0x20000.bin` | its safe mode configuration, 7115 bytes | in `reference/checksums.md` |
| `derived/650-0.2-code-base0x9000-bench.bin` | the bench unit's own 0.2 application, read off it | not listed, being one unit's |

The bench unit's two internal pages are in the lab's `reads/` as region reads; `tests/lab.py` names
the second `h650_page_ff` and the 0.2 application cut from the first `h650_bench_code`.

**Logitech's software update service does not serve this model**: it answers 404 for skins 66, 71 and
72, section 295. The repair site's 0.4 package is the only published image.

## Safe mode and recovery

* The 650's 0.2 safe mode image carries part of the reinstall routine the Harmony 700 uses: the status
  normalisation at `0x01A8C`, in a routine at `0x01A80` called once from `0x0107E`. Its selector 6
  handler and its escape handler are **unread**, section 295.
* The reinstall route, set the update status byte and restart so safe mode copies a staged application,
  **has been run on the Harmony 700 only**. The rail admits the 650, `CLAUDE.md`.
* **The 650 has no staged application to reinstall**: its external block at zero is erased apart from a
  copy of its identity, [memory.md](memory.md). So the reinstall route would first need an image staged,
  which is decision 18's staging path, run on the 700 only. This is this reference's reading of two
  measurements; it has **not** been tried.
* Entering safe mode on this model has **not** been tried. On the Harmony 525 it destroys the
  application; on arch 14 the `recovering-a-remote` skill is the route to read first.

## Not checked

* Why the 650's and 600's 0.2 builds differ.
* The 0.4 package's validator and clock routines, sections 299 and 310.
* What the 650's safe mode does with a status byte of 2, end to end.
* How the bench unit behaves in safe mode, or how it is entered.
