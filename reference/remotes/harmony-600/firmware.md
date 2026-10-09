# Harmony 600: firmware

What the 600 runs, what exists of it in the lab, and how it would be recovered. The architecture's part,
how an image is laid out, what safe mode is and the `-safe.bin` naming trap, is in
[the architecture's firmware.md](../../architectures/harmony-600-650-700/firmware.md).

## Versions

| version | where | standing and source |
|---|---|---|
| **0.2** | application 70336 bytes, entry `0x1A26E`, execution base `0x9000`; safe mode 0.2, 24320 bytes | measured, read off a unit whole and verified by its own header checksum, section 23 |
| 0.2 | the forum table's "newest seen" | third party, `reference/capabilities.md`, which marks it confirmed on the remote |

No other version of the 600's firmware is known here, and no package of it: **Logitech's software update
service answers 404 for skin 71**, section 295.

**The 600's 0.2 is not the 650's 0.2.** One program in two builds, 1395 bytes differing position by
position, so an address read on one does not transfer to the other without checking, section 281.
Routines found identical on both: the flash classifier and eraser, section 281; the cache drop and the
restart, section 282; the clock routines, section 310; the settings store's read and write path, sections
304 and 305; the transition walker and setters, section 332.

The 600's 0.2 image is **the reference image for the architecture's bench work**, `CLAUDE.md` key facts:
it was read off a remote and verifies over all 70336 bytes, where earlier work used the Harmony 700's
2.8 package as a stand in, section 23.

## Images in the lab

Never in this repository. Checksums are in `reference/checksums.md`.

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
* The stored application at external `0x000000` is what a reinstall would copy, `docs/memory-map-600.md`.
  The reinstall route has been run on the Harmony 700 only, section 295.
* The `recovering-a-remote` skill is the route to read before anything here.

## Not checked

* Why the 600's and 650's 0.2 builds differ.
* What the 600's safe mode does with an update status byte of 2, end to end.
* Safe mode entry on a 600, by keys or otherwise.
