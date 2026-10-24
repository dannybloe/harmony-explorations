# Harmony One memory

#### The arch 12 flash map, read end to end

Asked whether the operational One's firmware had been downloaded, the honest answer at that point was
no. Everything read so far was **internal** memory, and on arch 12 the application does not run from
there: it runs from external NOR at `0x020000`. That address is inside the range `READ_FLASH` accepts,
top byte below `0x20`, and it had simply never been asked for. Every config read had gone to
`0x040000`.

It reads. The whole of the One's low flash, measured on the operational unit:

| Flash | Contents | Checked against |
|---|---|---|
| `0x000000` to `0x010000` | the safe mode region, with a `GSPM` container at `0x002000` | that unit's own `--dump-safemode`, **65536 of 65536** |
| `0x010000` to `0x020000` | erased, all `0xFF` | |
| `0x020000` to `0x02EA92` | the application firmware, 60050 bytes, version 3.4 | the image decoded from the 3.4 `.hfw`, **60050 of 60050**, and its own header checksum |
| `0x02EA92` to `0x040000` | erased, all `0xFF` | |
| `0x040000` onward | the user config, 1672832 bytes | that unit's own `.EZHex`, **1672832 of 1672832** |

So the firmware running on the remote is bit for bit the firmware in the archived package, which is
worth having on both sides: it confirms the read path over 60 KiB against an answer obtained without
it, and it confirms that the archived package is what the device is actually running.

**One number in that table came from a mistake worth recording.** The safe mode comparison first
reported 13586 differing bytes. `concordance --dump-safemode` starts at flash zero and the read
started at `0x002000`, so two windows 8192 bytes apart were laid on top of each other. Reading the
same region as the dump gives 65536 of 65536. Nothing was wrong with either the dump or the read, and
a mismatch whose first difference is at offset zero should have suggested alignment before corruption.
### Arch 12 has regions this project has never named

| address | size | what the client calls it, restated |
|---|---|---|
| `0xFE0000` | `0x1000` | the bootstrap, which matches what section 59 found there |
| `0xFE1000` | `0xF000` | the safe mode image |
| `0xFF0000` | `0x4000` | a programmable logic device image, and 5939 bytes of it are populated |
| `0xFFE000` | `0x1000` | a support library, and it is the external flash programmer, section 206 |
| `0x3D0000` | `0x20000` | the stored application firmware |

Two of these settle open questions if they hold. `docs/findings.md` calls the image at `0xFF`
plus `0xE000` "a library or support image, distinct from the bootstrap at zero", which is
exactly what the client calls it. And a programmable logic device on arch 12 is new information
about the hardware, not just the memory map: nothing in this project had suggested the One
carries one.

**Both held, and settling them needed no remote**, section 206. The two rows sat here unconfirmed for
nineteen days while the bytes were already in the lab: internal program page `0xFF` had been read off
every bench remote and verified against its backup. The support library window holds **601 used bytes**
on both Harmony Ones, which is section 191's external flash programmer to the byte, reached there by
disassembling the routine rather than by counting a region. The logic device window holds **5939 used
bytes** of 16384, so something is stored where the client names one; what it is stays unread. The
closure behind both is the page: all 6627 used bytes of it fall inside a region named above, and the
map covers a third of the page, so the rest is erased flash.

The last row is the awkward one. `0x3D0000` sits inside the `[0x040000, 0x400000)` region the
same class declares as user configuration, so the usable config region must stop below it. A
writer that trusted the declared range would run into the stored firmware.
### The arch 12 flash regions, including the two nobody here had named

Seven named regions for the Harmony One, and the ones this project already knows agree exactly:

| region | address | status here |
|---|---|---|
| boot loader | `0xFE0000` | internal, page `0xFE` |
| safe mode | `0xFE1000` | internal, and the safe mode image this project has read |
| normal mode | `0x3D0000` | the stored application firmware, already adopted as the write ceiling |
| embedded config | `0x002000` | the safe mode container, known |
| user config | `0x040000` | known |
| CPLD image | `0xFF0000` | holds 5939 used bytes, section 206, and **its version is field 9 of the version block**, section 212 |
| PIC library | `0xFFE000` | holds the external flash programmer, 601 bytes, section 206, and **its version is field 8**, section 212 |

The unit's own identity block is named separately, 64 bytes at `0xFFF400`, read with an ordinary
`READ_FLASH`. That is the region this repository's policy keeps out of any published dump.

The last two were called unexplained here until 29 August 2026. Both are placed now, and by two routes: section 206 found bytes at each address on both Harmony Ones, and section 212 found the client naming each one's **version byte**, which lands on version block fields 8 and 9. Field 9's placement rested on a pairing that `tests/test_usb_firmware.py` flags as its weak leg, so this is the independent confirmation that comment asks for.
