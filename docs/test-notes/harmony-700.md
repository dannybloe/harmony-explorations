# Harmony 700 test notes

The bench Harmony 700: how it arrived, what was done to it and what its reads settled. What it showed
about the model is in `reference/remotes/harmony-700/` and about the architecture in
`reference/architectures/harmony-600-650-700/`; this file keeps what is one unit's.

## Arrival and repair

**A Harmony 700 has been on the bench since 29 September 2026**, section 295. It arrived in safe mode:
its 2.5 application did not verify, because the page at internal `0x10000` to `0x10400` was erased. It
was repaired by asking safe mode to reinstall the 2.5 application already staged in its own external
flash, section 295, and was then taken to 2.8 by staging Logitech's image and installing it, section
297. Both internal pages, external flash from `0x000000` and the configuration region were read off it
before and after each step, and the reads are in the lab.

* **The staging region** at external `0x000000` held the 2.5 application, 71552 bytes, verifying, when
  first read. Since section 297 it holds the 2.8 image, 76672 bytes, to `0x012B80`, and is erased past it.
* **The configuration** at `0x030000` was the previous owner's, 974009 bytes, every structural check
  passing; after a Harmony Desktop sync it was 1070416 bytes, section 295.
* **The settings store** held twelve setting `0x80` records as found, and the sync appended two more,
  `0xFE` and `0xFF`, section 296.

## What the unit settled

The Harmony 700's memory map was written before any 700 was connected and listed what a unit on the
bench would settle. It opened by saying that "No Harmony 700 has ever been connected"<!--superseded-->
and marked most rows presumed until it was corrected against this unit on 9 October 2026. Its list,
with each outcome:

1. **Both internal pages**: read, section 295. The safe mode image is 2.3 and 29888 bytes, and `0xFF`
   `+0xEC00` is the settings store, holding setting `0x80` records only, section 296.
2. **`GET_VERSION`**: read, section 295: firmware, software type, flash `15:1C`, architecture 14 and
   skin 66. Version block fields 7, 10 and 11 have had readings since section 59 and section 190 on
   other models. This unit's safe mode image and application carry different versions, 2.3 against 2.5
   and then 2.8, and whether its fields 7, 10 and 11 were compared against them is not recorded.
3. **External `0x020000`**: read, byte for byte the 2.8 package's region 3, section 295.
4. **The configuration region's size from `concordance -i`**: **not done**. The ceiling the reference
   gives is the firmware's, and the region's first `0x120000` bytes have been read and written back,
   section 300.
5. **The USB product id and the descriptor block**: the unit is opened through the architecture's
   profile, `0xC122`; its `bcdDevice` is **not checked**.

**The flash part**: the 2.8 package's upgrade header states `0x14:0x1C`, which the map once read as a
half sized part the model might carry; the unit reports `15:1C`, EON's 2 MiB part, and the
package's `Data.xml` states the same for skin 66, sections 295 and 297.
