# Harmony 600, 650 and 700: memory

Where things live on all three, stated once. The addressing rules and the `0xFE` and `0xFF` notation
are [the command reference's](../../usb-protocol/commands.md#addressing-in-short), and the comparison
with the Harmony One is [the comparison of architectures](../README.md); neither is restated.

## What this file carries and what the per unit maps keep

`docs/memory-map-600.md` and `docs/memory-map-700.md` stay where they are. **This file now carries the
parts that are the architecture's**: the constants below, the external flash layout, the internal page
layout and the settings store's shape. The per unit maps keep what is one unit's: the 600's measured
row lengths and its 59 settings records, the 0.2 build's data memory addresses, and the 700 map's
measurements of its one unit with what is still unmeasured. Where a per unit map and this file disagree, `docs/findings.md` is right and both
are checked against it. The Harmony 650's own differences are in
[its memory.md](../../remotes/harmony-650/memory.md).

**`docs/memory-map-700.md` was corrected on 9 October 2026** against the bench unit of sections 295 to
301; until then it said no Harmony 700 had been connected and marked most rows "presumed".

## Constants in the code

<!-- generated:memory-constants -->
| what | value | constant |
|---|---|---|
| external flash size | 2048 KiB | `FLASH_TOP_BYTE_BOUND`, `protocol.ts` |
| user configuration starts at | external 0x030000 | `CONFIG_REGION_BASE`, `rails.ts` |
| highest address a write may reach | external 0x200000 | `WRITABLE_CEILING`, `rails.ts` |
| erase block | 64 KiB | `ERASE_BLOCK_SIZE`, `rails.ts` |
| firmware staging region | external 0x000000 to 0x020000 | `STAGING_REGION`, `rails.ts` |
| settings store | internal page `0xFF` `+0xEC00`, two blocks of 1 KiB | `STORE_OFFSET_IN_PAGE` and `STORE_BLOCK_BYTES`, `settings.ts` |

Generated from `packages/usb/src/protocol.ts`, `rails.ts` and `settings.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Standing: the flash size and ceiling are read in four arch 14 images' address classifiers and measured
on the 600, section 88 and 281; the erase block is read in the same four images, SPI `0xD8`, and
measured by the neighbour check on the 650, section 281; the configuration base is measured on all
three units; the staging region is Logitech's region 2 for skin 66 and was written on the 700 only,
section 297; the store is read in the firmware and measured on the 600 and 650, section 282.

## External flash, 2 MiB SPI

| address | contents | standing and source |
|---|---|---|
| `0x000000` to `0x020000` | the application as stored, or the staging region for an update. **Differs by unit**: an application copy on the 600, erased but for an identity copy on the 650, a staged image on the 700 | measured per unit, sections 281 and 297 |
| `0x020000` | the safe mode configuration, 7115 bytes, format 1.4; its section table byte identical on all three models. It is the **status screen library**: no devices, no activities, 35 status screens, linked for this address and ending at `0x021BC7`, declaring a log area of `0x0E0000` to `0x100000`; the 650's differs from the 700's in 50 bytes | measured on the 600, read out of the 650's and 700's packages, section 30; sections 353 and 244 |
| `0x030000` to `0x200000` | the user configuration, 1856 KiB of room | measured on all three |
| `0x1E0000` to `0x200000` | declared as a log area by user configurations, every Harmony 650 configuration in the lab among them | read from configurations, `reference/config-format/state.md` and section 353; nothing on arch 14 is known to write it, the log area's writer being the Harmony One's alone, `todo-compile-650.md` 10.2 |

## Internal flash, two 64 KiB pages

| page and offset | contents | standing and source |
|---|---|---|
| `0xFE` `+0x0000` | the bootloader, 4 KiB, which also carries a USB flash programmer | measured on the 600 and 650, section 189; differs between them |
| `0xFE` `+0x1000` | the safe mode image | measured on the 600 and 650, 0.2; the 700's is 2.3, 29888 bytes, section 295 |
| `0xFE` `+0x9000` | the application, running into page `0xFF` | measured on all three |
| `0xFF` `+0xEC00` | the **settings store**: two 1 KiB blocks used one at a time, a four byte header `fc ff 00 00`, then two byte records, setting then value, appended. Settings `0x00` to `0x13` and `0x18` to `0x2B` are the saved power on and inter device delays, which override the configuration's at start. **Setting `0x80`'s bit 0 decides whether the configuration's checksum is checked**, copied at start to `0x744` on the 0.2 builds and `0x3A9` on the 700's 2.8 | read in the firmware, measured on the 600 and 650, sections 282 and 303; bit 0 read in the firmware, section 354 |
| `0xFF` `+0xF400` | the **identity block**: a 16 byte field that is named the serial and holds `0xEE` on every remote read, then two GUIDs, which Logitech's service takes as the serial. `docs/memory-map-600.md` counts the `0xEE` field as a third GUID | measured on the 600, 650 and 700, sections 226 and 281 and `CLAUDE.md`. Values only in the lab |
| `0xFF` `+0xFFF8` | the processor's configuration words | section 25, [the comparison of architectures](../README.md#the-top-of-program-memory) |

## Data memory

The addresses differ between builds, so they are per build and not per architecture. The 0.2 build's,
shared by the 600 and 650, are in `docs/memory-map-600.md`; the 0.4 package's and 2.8's few known ones
are in sections 282, 283 and 299. **The state variables** sit at `0xE10 + n` on the 0.2 builds, read live
on the 650 and the 600, sections 283 and 387, and at `0x900 + n` on the 700's 2.8, section 384; on all
three the first seven are the clock and are readable while the remote is on the cable, sections 283, 386
and 387. On the 0.2 builds `0x68B` holds the container select bit, bit 4, and the configuration's
verdict, bit 2, section 354.

## Not checked

* External `0x0112C0` to `0x020000` and `0x021BCB` to `0x030000` on the 600, `docs/memory-map-600.md`.
* What setting `0x80`'s bits other than bit 0 mean.
* The four small unidentified records after the identity block.
* Whether anything on this architecture writes the declared log area.

### Arch 14 keeps per model settings in internal program memory

A run of twelve 64 byte records above the application firmware, at `0x01F400` and every `0x40`
after it, ending at `0x01F640`, followed by a 1024 byte block at `0x01F800`. What the client
believes each holds, restated:

| address | what it holds |
|---|---|
| `0x01F400` | the unit's serial identifier |
| `0x01F440` | key timing |
| `0x01F480` | infrared capture silence timing |
| `0x01F4C0` | unit settings |
| `0x01F500` | keypad settings |
| `0x01F540` | display settings |
| `0x01F580` | battery calibration |
| `0x01F5C0` | power settings |
| `0x01F600` | other settings |
| `0x01F640` | a manufacturing identifier |
| `0x01F800` | test flags, 1024 bytes |

The first address is also declared as the start of a 1024 byte system parameter block, so the
twelve records are probably subdivisions of one block rather than twelve unrelated ones.

**This was read as the answer to a question already asked here**, which settings a remote has that
its config does not carry, and **the answer turns out to be none**, section 150. Six of the seven
settings records are erased flash on all three bench remotes: key timing, infrared capture silence,
unit, keypad, display and other settings have never been written. Only `power settings` holds
anything, one byte, 94, on the two Harmony Ones and not on the Harmony 600, and that is the value
section 105 read at `0x01F5C0` and could not attribute.

It said "confirming it needs a remote rather than a disassembler", and it needed **neither**: the<!--superseded-->
internal pages of every bench remote were read over USB months ago and verified against their
backups, so the bytes were already in the lab. `tests/test_unit_settings.py`. The record names stay
here as client sourced labels, since a name is what the client gave and the emptiness is what we
measured.

Arch 12 has the same idea at different addresses: an identifier block at `0xFFF400` and a
manufacturing identifier at `0xFFF640`, both 64 bytes, with a 1024 byte granularity stated for
the first.
### Smaller leads

* Arch 14 declares a user logging region at `0x0E0000` of 128 KiB, which is where a log area
  pointer on arch 14 would have to point. Section 47 found the writer is arch 12 only, so this
  said the region exists on arch 14 even though nothing writes it. **It is off this list since
  section 206**: every arch 14 safe mode container in the corpus declares exactly `0x0E0000` to
  `0x100000` in base slot 2. The arch 14 user configurations declare `0x1E0000` to `0x200000`
  instead, the same 128 KiB at the top of the 2 MiB part rather than of one half the size, and
  which a remote wants is open.
* **The pointer table starts at `0x08` on arch 7**, not `0x0B`. The client's three per
  architecture offsets are all `table_start + 1 + 4 * slot`, exactly, for slots 0, 2 and 3, which
  gives 11 on arch 8, 9, 12 and 14 and 8 on arch 7. There is no arch 7 sample here, so this is a
  prediction for whenever one arrives rather than something to act on.
* Arch 12 and arch 14 each declare an embedded configuration region, `0x1E000` and `0x4000`,
  distinct from the safe mode image and from the user config.
* Read selector 12 is `reference/usb-protocol/commands.md`'s "not read yet" selector `0x0C`. The client uses
  it to ask what hardware features the remote has.
* **Flash `0x200000` on arch 9 has left this ledger**, section 119, and it is the first entry to do so
  by being confirmed rather than refuted. It was here as concordance's claim that the address is a
  firmware update state cell, `0x00` while staging and `0x02` to install, with `0x200010` holding the
  serial, and with the awkward note that section 88 read the 525's validator as refusing every top
  byte outside `0x80` to `0x87`. Both halves are now read out of the 525's own firmware. The
  validator's chain has four windows above its flash range test and `0x20` is the **on chip EEPROM**,
  bounded to 256 bytes, which is why `0x200010` is the serial and why section 88's rule described only
  the default arm. The bootloader reads EEPROM byte 0 at every boot and `0x02` is the value that makes
  it install the application. So the client was right, and it was right about something it had no way
  to explain. What has **not** changed is the action: this project does not perform that write. The reason is no
  longer that "arch 9 has no write target"<!--superseded-->, since section 269 gave it one; it is that
  the EEPROM sits outside the writable range, which covers the configuration alone, and that
  **no concordance command line reaches that step alone**, section 118, so it
  is reachable only as four library calls that belong in the private lab and never in this MIT
  repository since they call into GPLv3 code.
