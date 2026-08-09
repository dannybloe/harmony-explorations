# Memory map: Harmony 700 (architecture 14)

Where everything lives on a Harmony 700, as far as anyone here can say.

**No Harmony 700 has ever been connected to this project.** Every figure below comes from the 2.8
update package or from two config files an owner published, and nothing has been read off a device.
That makes this document as much a list of what to measure as a map, and the last section says what
one afternoon with a 700 would settle.

Read [memory-map.md](memory-map.md) first for the addressing rules and the `0xFE` and `0xFF`
notation. The Harmony 600 is the same architecture and has been read in full, so
[memory-map-600.md](memory-map-600.md) is the measured version of this layout; where a row below
says "presumed" it means the 600 has it there and the 700 has never been checked.

## Internal memory, 128 KiB in two pages

| Page and offset | Length | Contents | Source |
|---|---|---|---|
| `0xFE` `+0x0000` | 4096 | the bootloader | **presumed**, never read |
| `0xFE` `+0x1000` | unknown | a safe mode image | **presumed**, never read, and its version is unknown |
| `0xFE` `+0x9000` | 76672 | the **application firmware**, version 2.8, entry point `0x01BB38`, continuing into the next page and ending at `0xFF` `+0xBB80` | the 2.8 package, own checksum verifies |
| `0xFF` `+0xF400` | unknown | an identity block | **presumed**, never read |

The application is the only row with evidence behind it, and even that is evidence about the image
rather than about a remote: the package says where it loads and the checksum says the bytes are
intact, but nobody here has seen it sitting at that address.

It is 6336 bytes longer than the 600's and reaches `0xFF` `+0xBB80`, still well below the read clamp
that [memory-map.md](memory-map.md) describes.

## External flash, SPI

**Its size is open**, and this heading used to say 4 MiB. The 700 firmware package declares
`FLASH 0x14:0x1C` where every arch 14 config declares `0x15:0x1C`, so the family has at least two
capacities, and under the capacity byte reading those are 1 MiB and 2 MiB. `docs/findings.md`
section 87 and the note in [memory-map-600.md](memory-map-600.md), where the measurement that
settles it is written down. Nothing on this page depends on the answer: every address below is far
inside the smallest candidate.

| Address | Length | Contents | Source |
|---|---|---|---|
| `0x000000` to `0x012B80` | 76672 | the **application firmware as stored** | the length is the package's `Region_2`; the **address is presumed** from the 600, whose external flash at zero was dumped |
| `0x020000` to `0x021BCB` | 7115 | the **safe mode config**, a `GSPM` container, format 1.4 | the package's `Region_3`, whose base address is recovered from its own `end_addr` |
| `0x030000` onward | 979184 in one sample | the **user config** | two configs of one 700, both recovering flash base `0x030000` |

The safe mode config is the one row here that is better evidenced on the 700 than on the 600: the
700's package ships it as a separate file, and the 600's map borrows that base address rather than
the other way round.

The size of the config region is unknown, because that number comes from `concordance -i` and no 700
has been connected. On the One it is 3840 KiB and on the 600 3904 KiB, both landing exactly on
`0x400000`, so 3904 KiB is the obvious guess and it is a guess.

## The pair of configs

The corpus holds two configs of the same Harmony 700, posted together by their owner with one
documented change between them, 979184 and 979242 bytes. It is the only controlled pair in the
corpus and it is what the section 16 analysis rests on.

It also carries the one unresolved contradiction in the format work: the build timestamps in slot 3
order the pair the opposite way round from the owner's stated direction of the change. Until that is
settled, a timestamp is not used to order two configs of the same remote. See `findings.md` section
21.

## What a Harmony 700 on the bench would settle

In roughly this order, all read only:

1. **Both internal pages**, which would turn every "presumed" row above into a measurement, give the
   safe mode image its length and version, and say whether `0xFF` `+0xEC00` holds the same
   unidentified 121 bytes as the 600.
2. **`GET_VERSION`**, which would give a third data point for version block fields 7, 10 and 11, the
   three still unexplained. A remote whose safe mode image and application carry **different**
   versions would separate hypotheses that the 600 and the One cannot, since on both of those the
   two versions agree.
3. **External `0x020000`**, confirming the safe mode config on a device rather than in a package.
4. **The config region size**, from `concordance -i`, which either lands on `0x400000` like the other
   two or does not.
5. **The USB product id and the descriptor block**, neither of which is recorded here for the 700.
