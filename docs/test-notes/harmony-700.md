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

## What was sent to the unit

The reference's [usb.md](../../reference/remotes/harmony-700/usb.md) states what a Harmony 700 answers;
this is the record of what was sent to this one to learn it.

* **Reads**: `GET_VERSION`, external flash from `0x000000` and both internal pages, before and after each
  step below, section 295.
* **The reinstall**, `WRITE_MISC` selector 6 and the restart, sent once to repair the unit in safe mode,
  section 295.
* **The staging region**, erased and written once with Logitech's 2.8 image under decision 18, section 297.
* **Configuration blocks**: one written back unchanged, section 300; a power on delay raised from 60 tenths
  to 90 and put back, both heard with an infrared receiver, section 301; then the configurations of
  `todo-compile-700.md`, nine 64 KiB blocks for the first, each read back byte for byte, sections 383 and 386.
* **Live data memory**, `READ_MISC` selector 7, from `0x900` on build 2.8, section 386.
* **Never sent**: the settings read and write, the charger commands `0x18` to `0x1E`, and the battery
  voltage, `READ_MISC` selector `0x0C`.

## The configurations run on it

The reference states what a 700 does with a configuration; these are the runs it rests on.

* **The empty configuration**, section 383: no device, so nothing sent; "USB Connected" on the cable, Devices
  and Activities leading to each other, each empty activity key showing "add an Activity on this button",
  and the screen dark about 20 seconds after the last key, judged by eye. More Activities did nothing while
  the activity menu bound the press of scan 4 back to the running activity, and showed "add Activities" once
  it called that screen's list.
* **The test setup**, sections 385 and 386: six devices and then seven, every frame the receiver decoded the
  one the file sends. Its activity keys, scans 5, 1 and 7, are bound as the Harmony 650's setup binds them,
  section 385. With the Off screen's mark starting at 0 All Off showed no Off screen, and with it starting at
  1 it did; with no activity the Off screen showed on All Off and on leaving the cable, section 383.
* **The charging screens**, sections 383 and 384: on a cheap USB charger the empty configuration showed the
  charging sequence instead of "USB Connected"; on a phone charger it showed none. Logitech's own
  configuration showed no charging screen either, on the phone charger with charged cells, with defective
  ones, with none, with one flat and one full, and with the cable put in while the screen was dark; it was
  not run on the cheap charger. Neither charger's data lines were measured.

## Other records

* **Firmware images**: the 2.8 package and the two files decoded from it are in the lab's `firmware/`, with
  their checksums in `docs/checksums.md`. The 2.5 application exists only as cut out of the unit's first
  staging read, 71552 bytes, section 298. MyHarmony's version list naming 2.8 is filed in the lab's
  `firmware/packages/versiondb/`, `todo-secure-logitech.md` 4.1.
* **Logitech's service statement** for skin 66, `GetProductCapabilities2`, was asked through one account
  entry; the answers are filed in the lab's `work/myharmony/responses-per-model/`, and no archive section or
  test holds them, so the reference marks the capability list not checked.
* **The activity fill test** of `reference/how-a-harmony-works.md`, seventeen model records: whether a 700
  record was among them is not recorded.
