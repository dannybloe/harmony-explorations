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

Everything else is erased, including all of `0x010000` to `0x020000`.

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
| `0xFF` `+0xF580` | 4 | unidentified | |
| `0xFF` `+0xF5C0` | 2 | unidentified | |
| `0xFF` `+0xF640` | 11 | unidentified, `09 00 20 11 02 18 e0 3c 00 67 01` on the spare | |
| `0xFF` `+0xFFF8` | 6 | the **configuration words**, program `0x1FFF8` to `0x1FFFD` | gputils `18f87j50_g.lkr`; `findings.md` section 25 |

The image at `0xFE` `+0x1000` ends at `+0xC12C` and the rest of that page is erased. Everything not
listed in the `0xFF` page is erased too.

**The identity block and the three records after it are per unit data.** Two Harmony Ones differ
in 39 bytes across the whole of both pages, and every one of them is inside `+0xF400`, `+0xF582` or
`+0xF643`. That is the evidence that these pages are firmware rather than per unit state that
happens to look like code, and it is also why the block's contents are never published here.

## What is not established

* **The roles of the three internal images.** They verify, they are versioned, and what they do has
  not been traced. The one at `+0xE000` is a callable library by its shape alone.
* **The four small records in the `0xFF` page.** Offsets and lengths only.
* **The table at external `0x000000`.** Named in `findings.md` section 8 and unidentified since.
* **The part number**, per the last section of [memory-map.md](memory-map.md).
