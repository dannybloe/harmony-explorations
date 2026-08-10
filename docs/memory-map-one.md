# Memory map: Harmony One (architecture 12)

Where everything lives on a Harmony One, so that a question like "what is at `0x020000`" has one
place to be answered.

Read [memory-map.md](memory-map.md) first: the addressing rules, the `0xFE` and `0xFF` notation, the
two execution models and the comparison against architecture 14 are all there, and this document
assumes them. Every figure below is measured elsewhere and the **Source** column says where.

Three Harmony Ones have been read here, all read only: two programmed and one unprogrammed spare.
Where they differ it is said so.

## External flash, 4 MiB parallel NOR

Memory mapped, and the application executes in place from it.

| Address | Length | Contents | Source |
|---|---|---|---|
| `0x000000` to `0x000120` | 288 | an unidentified table | `findings.md` section 8 |
| `0x002000` to `0x0042C6` | 8902 | the **safe mode config**, a `GSPM` container, format 1.6 | read off the device, and byte identical to the first part of the 3.4 package's `Region_2` |
| `0x020000` to `0x02EA92` | 60050 | the **application firmware**, version 3.4 | read off the device, byte identical to the archived 3.4 package, own checksum verifies |
| `0x040000` to `0x400000` | 3840 KiB | the **user config** | read off the device, byte identical to that unit's own `.EZHex` |
| `0x3D0000` to `0x3DEA92` | 60050 | the **application firmware as stored**, version 3.4, a second copy | read off **both** remotes, byte identical to the copy at `0x020000` and to the archived 3.4 package |
| `0x3F0000` to `0x400000` | 64 KiB | `00 FF` repeating, the last two bytes both `0x00`. Unidentified | read off **both** remotes, identical |

Everything else is erased, including all of `0x010000` to `0x020000` and `0x3DEA92` to `0x3F0000`.

**The last two rows sit inside the user config region and were found on 9 August 2026**, which is
late for a remote this project has read in full, and the reason is instructive: `packages/usb`
refused every address above `0x200000` on this architecture, because arch 14's address bound had
been applied to arch 12 as well. So the upper half of this flash had never been read and the
sentence above used to claim it was erased. `findings.md` section 88.

**The stored copy is what `WRITABLE_CEILING` protects.** A writer that took the nominal top of the
config region at face value would erase the remote's own firmware.

Two independent closures on the last row. concordance reports the config region as 3840 KiB, and
`0x040000` plus 3840 KiB is exactly `0x400000`, which is the 4 MiB the part holds. The flash
identifies itself as an Atmel AT49BV322A, a 4 MiB parallel NOR.

The two configs read here occupy 1672832 and 1232237 bytes of that region, so the size varies with
what the owner put on the remote and only the region is fixed.

`0x000000` to `0x010000` is what `concordance --dump-safemode` returns, all 64 KiB of it, mostly
erased. It is also what `--dump-firmware` returns, which is why that option was useless here: on
this architecture it contains no code at all.

## Internal memory, 128 KiB in two pages

The bootloader and three support images. **Not the application**, which is in external flash. No
`.hfw` package covers any of this, so nothing off the internet can be compared against it, and the
argument that the reads are good is that all three images verify their own header checksums.

| Page and offset | Length | Contents | Source |
|---|---|---|---|
| `0xFE` `+0x0000` | 4096 | the **bootloader**, no header of its own, reset vector at zero. Scans the keypad and compares two codes, `0x0E` and `0x1E`, section 87 | read off two remotes, identical |
| `0xFE` `+0x1000` | 45356 | an image, version 3.4, checksum `0xDB1C` | own checksum verifies |
| `0xFF` `+0x0000` | 8438 | an image, version 1.6, checksum `0xCB09` | own checksum verifies; **this is version block field 9** |
| `0xFF` `+0xE000` | 634 | an image, version 3.4, checksum `0xD9E9`, opening with a run of `BRA`, so a jump table into a callable library | own checksum verifies; **this is version block field 8** |
| `0xFF` `+0xF400` | 64 | the **identity block**: serial and two GUIDs at `+0x00`, `+0x10` and `+0x20`, then sixteen zero bytes | all three match `concordance -i` for that unit |
| `0xFF` `+0xF580` | 4 | the **battery gauge's scale**, two `u16`: 4 on both units, then a per unit trim. Millivolts a converter count is `4 + trim/65536`, about 4.284, `findings.md` section 105 | read off two remotes, and the trim is one of the 39 bytes they differ in |
| `0xFF` `+0xF5C0` | 4 | two more `u16` read by the same helper, 94 then `0xFFFF`. Their consumer is not traced | read off two remotes, identical |
| `0xFF` `+0xF640` | 11 | unidentified, `09 00 20 11 02 18 e0 3c 00 67 01` on the spare | |
| `0xFF` `+0xFFF8` | 6 | the **configuration words**, program `0x1FFF8` to `0x1FFFD` | gputils `18f87j50_g.lkr`; `findings.md` section 25 |

The image at `0xFE` `+0x1000` ends at `+0xC12C` and the rest of that page is erased. Everything not
listed in the `0xFF` page is erased too.

**The identity block and the three records after it are per unit data.** Two Harmony Ones differ
in 39 bytes across the whole of both pages, and every one of them is inside `+0xF400`, `+0xF582` or
`+0xF643`. That is the evidence that these pages are firmware rather than per unit state that
happens to look like code, and it is also why the block's contents are never published here.

**`+0xF582` is now explained by that fact rather than in spite of it**, section 105: it is the fine
trim on the battery gauge's millivolts per count, and a factory calibration constant is precisely a
thing that differs unit to unit. Both facts had been recorded here for a day, next to each other,
without being joined up. The four values are published because they are instrument calibration and
not identity; `+0xF400` still is not.

**Two memories answer to `0x01F580`, and that has already cost a wrong claim.** This part carries
128 KiB of program flash on chip at `0x000000` to `0x01FFFF`, and only addresses above it leave on
the external bus, which is why the application sits at `0x020000`. So a `TBLRD` in the firmware at
`0x01F580` reads **this page**, while a `READ_FLASH` over USB at `0x01F580` reads the **external**
part and answers `0xFF`, since the internal window is reached by the top address byte `0xFF` instead.
The row above and the external table's "everything else is erased" are both correct and they are not
about the same silicon.

## What is not established

* **The roles of the three internal images.** They verify, they are versioned, and what they do has
  not been traced. The one at `+0xE000` is a callable library by its shape alone.
* **Two of the four small records in the `0xFF` page.** `+0xF580` is the battery gauge's scale,
  section 105; `+0xF5C0`'s two words are fetched by the same helper and their consumer is not traced;
  `+0xF640` is offsets and lengths only.
* **The table at external `0x000000`.** Named in `findings.md` section 8 and unidentified since.
* **The part number**, per the last section of [memory-map.md](memory-map.md).
