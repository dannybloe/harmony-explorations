# Harmony 600: firmware

What the 600 runs, what exists of it in the lab, and how it would be recovered. The architecture's part,
how an image is laid out, what safe mode is and the `-safe.bin` naming trap, is in
[the architecture's firmware.md](../../architectures/harmony-600-650-700/firmware.md).

## Versions

| version | where | standing and source |
|---|---|---|
| **0.2** | application 70336 bytes, entry `0x1A26E`, execution base `0x9000`; safe mode 0.2, 24320 bytes | measured, read off a unit whole and verified by its own header checksum, section 23 |
| 0.2 | the forum table's "newest seen", which is out of date | third party, `reference/capabilities.md`, which marks it confirmed on the remote |
| **0.3** | named for skin 71 by MyHarmony's own version list, `VersionDbDefaults2.xml`, filed in the lab's `firmware/packages/versiondb/` | client sourced; the image it names answers 404, as every image on that list does, `todo-secure-logitech.md` 4.1 |

**A newer version exists by Logitech's word and no copy of it is held**: the version list names 0.3 for
skin 71, the 600 for the Americas, and no entry for skin 73. **Logitech's software update service answers
404 for skin 71**, section 295. This said "no other version of the 600's firmware is known here"<!--superseded-->
until 15 October 2026, while the version list had been filed for `todo-secure-logitech.md` 4.1 with 0.3 in
it.

**The 600's 0.2 is not the 650's 0.2.** One program in two builds, 1395 bytes differing position by
position, so an address read on one does not transfer to the other without checking, section 281.
Routines found identical on both: the flash classifier and eraser, section 281; the cache drop and the
restart, section 282; the clock routines, section 310; the settings store's read and write path, sections
304 and 305; the transition walker and setters, section 332; the row writer that hands the panel its
pixels and, but for four addresses, the panel set up, section 387; the status screen path, section 355;
the infrared toggle update, at the same addresses, section 365.

**What the 1395 bytes are**, read in the firmware, section 392: nearly all are code addresses that moved.
Two routines near the top swap places, one of 232 bytes at `0x19E02` on the 600 and one of 228 at
`0x19D12`; the 600's build carries 12 bytes the 650's lacks, two routines returning `0x74E` and `0x74F`
that nothing calls, so everything from the USB descriptors at `0x19EEA` up sits 12 bytes lower on the 650;
and the rest are references to moved code, 91 `CALL` and `GOTO` targets, 21 `MOVLW` literals and seven three
byte pointers. **What differs in meaning is the model number**, 71 in the version reply at `0x11964` and
`0x1071` in the USB device descriptor, against the 650's 72 and `0x1072`. So whatever draws the Off
screen, or skips it, is the same code on both remotes, section 392.

**The 0.2 build posts no charging events**: none of `0x1E`, `0x1F`, `0x20` to `0x25` or `0x30`, the events
the Harmony 700's 2.8 raises from its charger test, as far as direct posts go. It reads `PORTB` bit 1 as the
cable's gate as the 700 does. So the "Insert batteries" binding a 600 configuration carries is not raised
that way on this model, read in the firmware, section 384.

The 600's 0.2 image is **the reference image for the architecture's bench work**, `CLAUDE.md` key facts:
it was read off a remote and verifies over all 70336 bytes, where earlier work used the Harmony 700's
2.8 package as a stand in, section 23.

## Images in the lab

Never in this repository. Checksums are in `docs/checksums.md`.

| file in `lab/firmware/derived/` | what |
|---|---|
| `600-0.2-code-base0x9000-COMPLETE.bin` | the application, complete, read off a remote by `packages/usb` |
| `600-0.2-code-base0x9000-TRUNCATED64k.bin` | the same cut at 64 KiB, what concordance's `--dump-safemode` returns and its `*-safe.bin` holds; **not a safe mode image** |
| `600-0.2-internal-page-fe.bin` | the `0xFE` page: bootloader, safe mode image, application start |
| `600-0.2-safemode-gspm-base0x20000.bin` | the safe mode configuration from external `0x020000` |

The `0xFF` page holds one unit's identity block, so its checksum is not listed.

## Safe mode and recovery

* The bootloader scans the keypad and compares two codes, `0x14` and `0x2C`, section 87; that this is
  how safe mode is entered by keys is a reading and **has not been tried** on any unit of this
  architecture.
* The 600's 0.2 safe mode image carries part of the reinstall routine the Harmony 700 uses, at `0x01A8C`,
  and is otherwise unread, [the architecture's firmware.md](../../architectures/harmony-600-650-700/firmware.md).
* The stored application at external `0x000000` is what a reinstall would copy, [memory.md](memory.md).
  The reinstall route has been run on the Harmony 700 only, section 295.
* The `recovering-a-remote` skill is the route to read before anything here.

## Not checked

* Why the 600's and 650's 0.2 builds were built apart: what differs between them is read, above,
  section 392, and is moved addresses, two routines nothing calls and the model number.
* What the routine swapped near the top of each build is for: the 228 byte one drives a pulse train on
  `LATG` bit 0 and has no direct caller, section 392.
* What the 600's safe mode does with an update status byte of 2, end to end.
* Safe mode entry on a 600, by keys or otherwise.
