# Memory map: Harmony 600 (architecture 14)

Where everything lives on a Harmony 600. The Harmony 700 is the same architecture and has its own
map in [memory-map-700.md](memory-map-700.md), because the two remotes carry different images. Both
have been read off a device since section 295; this said only one had until 9 October 2026.

Read [memory-map.md](memory-map.md) first: the addressing rules, the `0xFE` and `0xFF` notation, the
two execution models and the comparison against architecture 12 are all there, and this document
assumes them. Every figure below is measured elsewhere and the **Source** column says where.

One Harmony 600 has been read here, read only, both internal pages and its whole config.

## Internal memory, 128 KiB in two pages

This is where the remote actually runs.

| Page and offset | Length | Contents | Source |
|---|---|---|---|
| `0xFE` `+0x0000` | 3880 used of 4096 | the **bootloader**, no header of its own, reset vector at zero. Scans the keypad and compares two codes, `0x14` and `0x2C`, section 87. It carries the same **USB flash programmer** as the Harmony One's, twelve commands with the same erase bound of `0x001000`, section 189 | read off the remote |
| `0xFE` `+0x1000` | 24320 | the **safe mode image**, version 0.2 | own checksum verifies |
| `0xFE` `+0x9000` | 70336 | the **application firmware**, version 0.2, entry point `0x01A26E`, continuing into the next page and ending at `0xFF` `+0xA2C0` | own checksum verifies over all of it |
| `0xFF` `+0xEC00` | 2048, of which 121 used on this unit | the **settings store**: two 1 KiB blocks, `+0xEC00` and `+0xF000`, used one at a time, each a four byte header, `fc ff 00 00`, then two byte records, setting then value, appended in order. 59 records on this unit, the second block erased. Settings `0x00` to `0x13` and `0x18` to `0x2B` are two tables of five saved delays, power on and inter device, each slot a big endian key and value, which the configuration copies over its own at start; two are live on this unit, the KPN box's power on delay at 10 tenths and the PS3's inter device delay at 15, section 303. An erase at `0x030000` after a cache drop clears bit 0 of setting `0x80` | `findings.md` sections 282 and 303 |
| `0xFF` `+0xF400` | 48 | the **identity block**: three GUIDs at `+0x00`, `+0x10` and `+0x20`, big endian, and the fourth field erased rather than zero filled | all three match `concordance -i` for that unit |
| `0xFF` `+0xF580` | 4 | unidentified | |
| `0xFF` `+0xF640` | 12 | unidentified | |
| `0xFF` `+0xF6C0` | 4 | unidentified | |
| `0xFF` `+0xF735` | 3 | unidentified | |
| `0xFF` `+0xFFF8` | 6 | the **configuration words**, program `0x1FFF8` to `0x1FFFD` | gputils `18f67j50_g.lkr`; `findings.md` section 25 |

Everything else in both pages is erased, including `0xFE` `+0x6F00` to `+0x9000`.

The application spans the page boundary, which is why it is 70336 bytes and why concordance, reading
a single 64 KiB window, returned 65536 of them and lost the entry point at the end.

**Two addresses are notable for being empty.** `0xFF` `+0x0000` holds no image header, and `0xFF`
`+0xE000` holds nothing at all. On the Harmony One both carry an image and version block fields 9
and 8 name their versions; on this remote both fields read `0x00`. That absence matching an absence
is what placed those two fields.

Architecture 14 reserves internal `0x000000` to `0x008FFF` for the bootloader, 36 KiB, of which only
the first 4 KiB and the safe mode image are used.

## External flash, 2 MiB SPI

Not memory mapped, so this is storage rather than code the processor runs.

**2 MiB, and this heading said 4 MiB until 9 August 2026.** The firmware's own address validator
rejects any address at or above `0x200000`, section 88, and the remote on the bench confirmed it by
answering at `0x1F0000` and refusing above.

| Address | Length | Contents | Source |
|---|---|---|---|
| `0x000000` to `0x0112C0` | 70336 | the **application firmware as stored**, which the bootloader copies to internal `0x9000` | `concordance --dump-firmware` returns the first 64 KiB of exactly this image |
| `0x020000` to `0x021BCB` | 7115 | the **safe mode config**, a `GSPM` container, format 1.4, 20 section slots | read off the device; all 15<!--fact:container_checks--> container checks pass and the recovered base is `0x020000` |
| `0x030000` to `0x200000` | 1856 KiB | the **user config** | read off the device, byte identical to that unit's own `.EZHex`, 738149 of 738149 bytes |

The 1077 bytes after the safe mode container, up to the end of the 8192 that were read, are erased.
Two stretches have never been examined: `0x0112C0` to `0x020000`, and the rest of `0x021BCB` to
`0x030000`.

**concordance's 3904 KiB is wrong, and that row used to end at `0x400000` because of it**,
section 88. Its architecture table gives the arch 14 config region as 3904 KiB from `0x030000`,
which lands on `0x400000` and needs a 4 MiB part. The firmware refuses every address at or above
`0x200000`, so most of that claimed region is not addressable at all. Four routes agree on 2 MiB:
the validator, the `FLASH` field's capacity byte `0x15`, the part number EON F16 which is a 16 Mbit
device, and the vendor client's arch 14 block tables, which have a 1 MiB and a 2 MiB entry and no
4 MiB one.

The measurement, on the bench remote and read only: `0x130000` is erased and differs from
`0x030000`, which is the calibration case and rules out a 1 MiB part; `0x1F0000` answers; and
`0x230000` is refused.

## Data memory, the 0.2 build

The addresses and their meaning come from the 0.2 image, which the 600 and the 650 share for these
routines; the values were read live over `READ_MISC` selector 7 on the Harmony 650 only, section 283.
The 600 was not measured.

| data | what |
|---|---|
| `0xE10` | the state variables, `narrow` bytes then two per wide one; the clock is the first seven |
| `0xE22` to `0xECF` | what the reload checksum covers, an XOR seeded `0xA5` |
| `0x500` to `0x5FF` | the infrared sender's ring, indices at `0x75E` to `0x760`; kept across a bare restart on the Harmony 650, section 283 |
| `0xED2` | that checksum, restamped by every store; at boot, once a container validated, a match skips the reload in the image, which was measured not to hold across a restart on the 650, section 283 |
| `0xE00` to `0xEFF` | the whole bank; across one bare restart at rest on the Harmony 650 only the clock's seconds, minutes and hours and the six bytes below changed, section 283 |
| `0xED4`, `0xED6`, `0xEE1`, `0xEE2`, `0xEE4`, `0xEE5` | among the working bytes of the two setters at `0x16360` and `0x163AA`, which store a variable and, unless a flag at `0xED8` or `0xEDC` is set, run the transitions; shared with the seeder and others. `0xEE1` is the index the store was handed, for a narrow variable |
| `0xEDC` to `0xEDF` | the second setter's arguments, written only where it is called; unchanged across that restart, which is what makes a cleared bank unlikely |
| `0x68B` | the verdict and container select bits, section 282 |
| `0x725` | the flag the cache drop sets and the next erase consumes, section 282 |

## What is not established

* **What setting `0x80` in the store at `0xFF` `+0xEC00` means**, section 282 having read its layout
  and section 303 settings `0x00` to `0x2B`, and what is in the four small records after the identity
  block. Offsets and lengths only.
* **The two unexamined stretches of external flash** named above.
* **What the 83 bytes are** that separate the 600's safe mode config from the 700's. They sit almost
  entirely in the `LWJL` key table, which is the expected place for two different keypads to differ,
  but nothing here has read them. See `findings.md` section 24.
