# The container

A configuration, as it sits in a remote's flash, is one block of bytes this reference calls the
**container**. It opens with four letters that say which family of remotes it was built for, the address
where it ends and a table of pointers, one per section: the infrared codes, the screens, the key bindings,
the remote's state and the rest. After the sections come a checksum and four more letters marking the
end. Every pointer is the address a byte will have in the remote's flash, not its place in the file, so a
container is built for one place in one model's memory and cannot simply be moved.

It is the same format on every remote from the Harmony 880 on that has been read, six architectures in
all. What differs between them is the four letters, the number of pointers and which section sits in which
slot of the table.[^s14][^s194] This page describes that shared frame; what the sections hold is on the
pages listed in [the format's front page](README.md).

## The header

```
0x00  char[4]  cookie          per architecture, see the table below
0x04  u32      end_addr        absolute flash address of the trailing end marker
0x08  u32      pointer_count   the byte at 0x09 is N below; the upper half is zero
0x0B  item[N]  section_table   { u8 spare; u24 address }[N], see below
      char[4]  marker          per architecture; starts the key table on arch 8, 12 and 14
      ...      sections, reached through the section table
end-6 u16      checksum        a seeded word XOR, below
end-4 char[4]  end marker      per architecture
```

All little endian. Pointers are **absolute flash addresses, not offsets**, which is why a container is
position dependent.[^s7] The marker after the table starts the key table on three architectures, and that
table is [the first mode record](modes-and-keys.md).

This layout holds on **seventeen samples across four architectures**, five base addresses
(`0x002000`, `0x018000`, `0x020000`, `0x030000`, `0x040000`) and three pointer table lengths
(20, 21, 22), which is the same property the word at `0x08` states rather than a second one[^s194]: every
consistency check passes on all seventeen, and the counts are computed rather than written down.[^t-gspm]
The Harmony 890 and 895 and the Harmony 300 and 350 hold the same frame, with a section table of their
own.[^s115][^s259]

### The word at `0x08` is the pointer count, not a version

The byte at `0x09` is `N`, the number of items in the section table, exactly, on all 25 containers
measured across six architectures: `0x14` is 20 on arch 9 and 14, `0x15` is 21 on arch 8, `0x16` is 22 on
arch 12, `0x17` is 23 on arch 10 and `0x0F` is 15 on arch 16.[^s194] Reading it as a version, `0x1400` as
"1.4", is plausible for `0x14` to `0x17` and prints `0x0F` as "0.15", which would make a Harmony 350 older
than a Harmony 880. `N` is also derived independently from where the marker sits, below, so the two
agreeing is a check on the file. It is also why the word never identified an architecture: arch 9 and
arch 14 both carry `0x14` because both have 20 slots, and the cookie is what names the family.[^s194]

### The cookies of each architecture

| Arch | Models | cookie | end marker | marker after the table | pointer slots |
|---|---|---|---|---|---|
| 8 | 720, 785, 880, 882, 885 | `TPTP` | `DKDK` | `WLWL`, the key table | 21 |
| 9 | 36x, 51x, 52x, 55x | `AHCM` | `MCHA` | `CMAH`, no key table follows it | 20 |
| 10 | 890, 895 | `TPTP` | `DKDK` | `WLWL` | 23 |
| 12 | One | `GSPM` | `PTYY` | `LWJL`, the key table | 22 |
| 14 | 600, 650, 700 | `GSPM` | `PTYY` | `LWJL`, the key table | 20 |
| 16 | 300, 350 | `GSPM` | `PTYY` | `LWJL` | 15 |

Measured on the containers of each architecture.[^s14][^s115][^s194] The cookies agree with
concordance's per architecture table,[^s14] which also lists `BMBM` for arch 7, the older 6xx models, and
a two byte cookie for architectures 2 and 3, a different layout.[^x-concordance] No arch 7 container has
been read, so its end marker is unknown and no reader accepts it.[^s14]

**The Harmony 890 and 895 are the exception to everything below about slots.** Their frame verifies like
the others, but their section table is not the base layout with slots inserted: five base slots are absent
and eight raw slots name no base slot, so a reader written for another architecture must not answer for
them.[^s184] Their slot map is [the table below](#one-table-four-architectures), and how it was placed and
what reads in it is [Harmony 890 and 895: memory](../architectures/harmony-890-895/memory.md).

## The section table

```
0x0B  { u8 spare; u24 address }[N]
```

The table starts at `0x0B`, so the addresses land on `0x0C`, `0x10`, `0x14` and so on. The `spare` byte is
**zero in every section of every sample** and its meaning is not established; it is not known to be
padding. A reader must not take an item as a `u32` pointer, because a nonzero `spare` would then add
`0x1000000` to the address and give a plausible wrong answer rather than an error.[^s20]

`N` follows from the marker's position, `0x0B + 4 * N` being exactly the marker's offset on every
container, and the word at `0x08` states it too:[^s20][^s194]

```
N = (marker_offset - 0x0B) / 4
```

| Architecture | N | marker at |
|---|---|---|
| 8 | 21 | `0x5F` |
| 9 | 20 | `0x5B` |
| 10 | 23 | `0x67` |
| 12 | 22 | `0x63` |
| 14 | 20 | `0x5B` |
| 16 | 15 | `0x47` |

The Harmony 300 and 350's firmware hardcodes the marker's offset at `0x47`, which makes the interpreter a
third route to the same count.[^s259]

The marker itself is found from the data: it is the first four uppercase letters preceded by three zero
bytes. Those three bytes are the last item's NULL address, not padding, so the rule works for a reason, and
it would fail on a container whose last section is populated. Which four letters they are is a fact of
each architecture, so a reader checks them against the cookie table rather than accepting any.[^s20]

## Sections, and how long each one is

**A section's length is not stated.** The non-NULL pointers ascend with the slot number in every
container, so sections are laid out in slot order, and a section runs to the next non-NULL pointer, the
last one to the trailer.[^s15] A reader checks the ascent rather than assuming it, since a section length
computed across a descending pair comes out negative.[^s139]

**That distance is an upper bound, not the section's size.** Base slot 4 holds 125 bytes and the gap to
base slot 5 is between 419 and 1532 bytes, because base slot 5's infrared group arrays are laid out in that
space. A section's own data can end long before the next pointer with another section's structures
filling the rest, so a large gap is no evidence of a large section.[^s36]

**Which slots are NULL is a property of the architecture, not of the configuration.** Base slots 18 and 19
are NULL in every container of the four insertion architectures below; in raw slots that is 18 and 19 on
arch 9 and 14, 8, 19 and 20 on arch 8, and 8, 20 and 21 on arch 12, each architecture's inserted slot
included.[^s20]

## One table, four architectures

On four architectures the section table is one table with slots inserted, rather than a table whose slots
mean different things: arch 9 and 14 hold the base layout of 20 slots, arch 8 inserts a NULL at raw slot 8,
and arch 12 inserts that and a real section at raw slot 18. So base slot `b` sits at raw slot `b`, at `b + 1`
for `b >= 8` on arch 8 and 12, and arch 12 pushes `b >= 17` up by one more.[^s16] The table below gives every
architecture whose alignment is established, these four and the two that state their own map:

<!-- generated:slot-maps -->
| architecture | map | base slots placed | the others | raw slots no base slot names |
|---|---|---|---|---|
| [8](../architectures/harmony-880-885/memory.md) | complete, 21 raw slots | 20 | absent: none | 8 |
| [9](../architectures/harmony-5xx/memory.md) | complete, 20 raw slots | 20 | absent: none | none |
| [10](../architectures/harmony-890-895/memory.md) | complete, 23 raw slots | 15 | absent: 0, 2, 8, 13, 14 | 1, 2, 3, 7, 8, 13, 16, 17 |
| [12](../architectures/harmony-one/memory.md) | complete, 22 raw slots | 20 | absent: none | 8, 18 |
| [14](../architectures/harmony-600-650-700/memory.md) | complete, 20 raw slots | 20 | absent: none | none |
| [16](../architectures/harmony-300-350/memory.md) | partial | 9 | unread: 4, 6, 7, 8, 9, 11, 12, 14, 17, 18, 19 | not derived |

Each base slot's raw slot, by architecture; an empty cell is one the row above names absent or unread:

| base slot | [8](../architectures/harmony-880-885/memory.md) | [9](../architectures/harmony-5xx/memory.md) | [10](../architectures/harmony-890-895/memory.md) | [12](../architectures/harmony-one/memory.md) | [14](../architectures/harmony-600-650-700/memory.md) | [16](../architectures/harmony-300-350/memory.md) |
|---|---|---|---|---|---|---|
| 0 | 0 | 0 |  | 0 | 0 | 0 |
| 1 | 1 | 1 | 0 | 1 | 1 | 1 |
| 2 | 2 | 2 |  | 2 | 2 | 2 |
| 3 | 3 | 3 | 4 | 3 | 3 | 3 |
| 4 | 4 | 4 | 5 | 4 | 4 |  |
| 5 | 5 | 5 | 6 | 5 | 5 | 4 |
| 6 | 6 | 6 | 9 | 6 | 6 |  |
| 7 | 7 | 7 | 10 | 7 | 7 |  |
| 8 | 9 | 8 |  | 9 | 8 |  |
| 9 | 10 | 9 | 11 | 10 | 9 |  |
| 10 | 11 | 10 | 12 | 11 | 10 | 7 |
| 11 | 12 | 11 | 14 | 12 | 11 |  |
| 12 | 13 | 12 | 15 | 13 | 12 |  |
| 13 | 14 | 13 |  | 14 | 13 | 9 |
| 14 | 15 | 14 |  | 15 | 14 |  |
| 15 | 16 | 15 | 18 | 16 | 15 | 10 |
| 16 | 17 | 16 | 19 | 17 | 16 | 11 |
| 17 | 18 | 17 | 20 | 19 | 17 |  |
| 18 | 19 | 18 | 21 | 20 | 18 |  |
| 19 | 20 | 19 | 22 | 21 | 19 |  |

Generated from `SLOT_MAPS` in `packages/codec/src/gspm.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->
 The base slot numbers are what these pages use. `gspm.base_slot` and
`gspm.arch_slot` in `src/harmony/gspm.py` translate, and so does `SLOT_MAPS` in
`packages/codec/src/gspm.ts`, which refuses an architecture whose alignment is not established rather than
guessing.[^s16]

Three fingerprints in the containers agree on this alignment: the six pointer array sections below land on
base slots 5, 7, 10, 11, 12 and 15; the single one byte section lands on base slot 16; and base slot 18 is
NULL.[^s16] **The Harmony One's firmware addresses the table the same way**: its section seeker is called
for every raw slot from 2 to 19 except raw slot 8, which is the NULL that architecture inserts, and it does
seek raw slot 18, the section that architecture adds.[^s38] That added section is 2 bytes in both Harmony
One configurations.[^s16]

What the alignment buys is that a section named on one of these four architectures is named on all four by
its index. **The other two architectures state their own map**, the Harmony 890 and 895's and the Harmony
300 and 350's, in the table above; what the latter's slots hold is [below](#the-harmony-300-and-350s-slots).

## Six sections are arrays of three byte pointers

Six sections have the same shape, a count then that many flash addresses, recognised by the shape rather
than tabulated: a section is such an array when a `u8` or `u16` count at its start satisfies
`width + 3 * count == section_length` exactly.[^s16]

```
+0x00  u8 or u16   count
       u24[count]  absolute flash addresses, little endian, ascending
```

Three bytes, not four, because 24 bits covers the configuration region with room to spare and the arrays
are large: base slot 10 of one Harmony 700 configuration holds 8037 entries, where a fourth byte would cost
8 KiB in that one section.[^s16] The shape picks out the same six base slots in every user configuration,
on four architectures, and no other section; every entry lands inside the container and every array
ascends.[^s16]

| Base slot | count width | what the entries address | entries, Harmony 700 | 600 | 525 | One | 880 or 885 |
|---|---|---|---|---|---|---|---|
| 5 | `u8` | [the infrared groups](infrared-records.md), one per device | 6 | 4 | 4 | 5 | 3 |
| 7 | `u16` | [the font sets](screens.md) | 17 | 15 | 5 | 18 | 14 |
| 10 | `u16` | [the action lists](actions.md) | 8037 | 4955 | 487 | 4277 | 1318 |
| 11 | `u16` | [the screen programs](screens.md) | 5711 | 3810 | 22 | 59 | 28 |
| 12 | `u8` | [the timers](state.md) | 9 | 5 | 5 | 30 | 19 |
| 15 | `u8` | [the parameter groups](state.md) | 9 | 9 | 5 | 11 | 9 |

The counts are one configuration of each model.[^s16] Each section is named from its firmware
consumer.[^s32][^s46][^s17][^s40][^s43][^s44]

**That these are pointers and not a shape that happens to fit** is shown by the published pair of one
Harmony 700's configurations, whose layout shifted by 50 bytes and then 58 between them. In five of the six
arrays every entry moved by exactly that shift, which the section table states independently. Base slot 10
is the exception that argues the same way: its entries moved by fourteen different deltas, because they
address a region that was rewritten rather than displaced.[^s16]

**Three of the arrays index the section just before them**: every entry of base slot 5 lands inside base
slot 4, every entry of base slot 7 inside base slot 6, and every entry of base slot 15 inside base slot 14,
in all fifteen user configurations on four architectures. Base slots 10, 11 and 12 point elsewhere.[^t-gspm]

## Finding the base address

The pointers are flash addresses, so turning them into file offsets needs the address the container
starts at, and the container does not state it. It is derived from the content, **anchored on the build
timestamp** in base slot 3:[^s117]

```
candidates = { address_of_slot - offset_of_the_timestamp_record : slot in table, slot not NULL }
base       = the single candidate that is a multiple of 0x1000 and leaves every
             non-NULL pointer inside the blob
```

The anchor is a closure rather than a cookie match: a timestamp record is accepted only when its stored day of
week agrees with its stored date, and there is exactly one accepted record per container. Exactly one
candidate survives on 26 of 27 containers, over five architectures and six bases from `0x002000` to
`0x040000`.[^s117]

On the 27th, a damaged read of a Harmony 890, the timestamp record sits 54 bytes off the pointer that names it
and no candidate is aligned, so the derivation **returns nothing** and the caller falls back to
`end_addr` minus the end marker's offset, which gives an unaligned answer on it.[^s122] **A refusal is a
result and must not be repaired by relaxing the filter.** The end marker subtraction is right on every
undamaged container and was the first rule used; it cannot notice damage, because the check it was
tested against is the same arithmetic run backwards.[^s117]

A remote's own read address is a different number from the container's base on one model: the Harmony 525
answers a read at `0x820000` while every pointer inside its container counts from `0x020000`, so a reader
that talks to a remote needs both, [the Harmony 5xx memory map](../architectures/harmony-5xx/memory.md).[^s76]

## The trailer checksum

A sixteen bit XOR of the container's little endian words, seeded `0x4321`, from its first byte up to the
stored value, derived from the firmware's boot validator and confirmed on fourteen containers across four
architectures, from 7115 to 1672832 bytes:[^s41]

```python
accumulator = 0x4321
for offset in range(0, len(blob) - 6 - 1, 2):
    accumulator ^= int.from_bytes(blob[offset:offset + 2], 'little')
```

An odd trailing byte is not folded in, because the firmware divides the byte count by two and counts
words.[^s41] **25<!--fact:parseable_odd_body--> of the 48<!--fact:parseable_containers--> parseable
containers have an odd body**, of which 20<!--fact:odd_body_verifying--> verify their stored checksum under
that rule.[^s139]

**Logitech states the same rule in writing, in a file that shares no bytes with a configuration**: the
Harmony 300 and 350 firmware package's `Description.xml` carries `SEED="0x4321" ... TYPE="XOR"` with an
offset, a length and an expected value, and the same arithmetic over that range reproduces it.[^s196]
`gspm.xor_words` is the one implementation, and `gspm.trailer_checksum` and `trailerChecksum` read it.

**This is the value a writer has to get right**: the remote refuses a configuration whose checksum does
not recompute. It is also weak: a word XOR catches any single changed byte and is blind to two transposed
words and to any even number of identical changes, so a passing checksum means the remote will not refuse
the file, not that the file is correct.[^s41]

**Because the checksum sits at the far end of the container, every edit moves it**, so the cheapest edit
there is, one byte changed in place, writes two places that are normally in different 64 KiB erase blocks:
on a Harmony One configuration a delay operand and the checksum sat 1.3 MiB apart. So a same length edit
still erases at least two blocks, and the checksum's block runs past the container's declared end, so what a
writer reads back first and puts back is a flash region rather than the container alone.[^s237] A page
binding costs two blocks for a second reason, its list's copy, [modes and keys](modes-and-keys.md)[^s187].

## Telling a configuration that arrived from one that parses

A transfer can insert bytes into a configuration without losing any, so two independent checks belong
after every read:[^s122]

| check | catches | blind to |
|---|---|---|
| the end marker sits at `end_addr` | anything that changes the length, insertion included | damage that preserves the length |
| the trailer checksum recomputes | a single changed byte, most insertions | two transposed words, and an insertion whose words XOR to zero, which a run of zeroes is |

An insertion of duplicated content fails both in general and **can pass both** in one case: a duplicated
run of zeroes inside a zero filled stretch leaves the checksum alone, and if the run is also past the
container it does not move the marker either. That case is harmless, because those bytes are not the
configuration.[^s122]

Neither check is a validity test. A configuration can pass both and be wrong in ways nothing here detects:
a device cloned into a Harmony 525 configuration by inserting bytes passed both checksums, drew every screen
identically and addressed every infrared command wrongly.[^s117]

**Erased bytes do not mark where a configuration ends.** Flash is erased only where a write needs the room,
so past the end marker a region can still hold an earlier, longer configuration: on one Harmony One 408034 of
the 2699923 bytes after it were not erased. A reader that looks for the end by scanning for `0xFF` works on
some remotes and over reads on others; the end is the end marker at `end_addr`.[^s215]

## The metadata archive

**Two architectures carry a metadata archive inside the container**: a `u32` length, then a ZIP holding
one file, `MetaData.xml`, deflated with a data descriptor so the compressed length comes from the central
directory. Each gives it a raw slot of its own and **neither is a base slot**: raw slot 3 on the Harmony
890 and 895, and raw slot 13 on the Harmony 300 and 350. No other architecture carries one.[^s260]

The Harmony 890 and 895's is 270 bytes and describes one boolean, whether an assistant menu is shown,
[their memory page](../architectures/harmony-890-895/memory.md). The Harmony 300 and 350's is 1513 bytes
and holds two things: the **record layout of the log area**, an infrared event that carries a device, a
command and a three byte time, and a device selected event; and the **naming layer**, every device by name
and every command by index and name. The naming half is **not joined to base slot 5**: there are more named
commands than records, 61 against 52 on one device, and the device index is not the group index.[^s260]
`metadataArchive` in `packages/codec/src/metadata.ts` reads it. Its `DeviceId` is scoped to the account
and is **not** an id in Logitech's device catalogue.[^s260] In a compile of eight devices by Logitech's current
service each device's `Index` is its position in the list, and each device's commands
are every command its catalogue entry names, sorted by character code and numbered from 0, records or
none.[^t-noscreen]

## The Harmony 300 and 350's slots

Fifteen slots, and they are not the base twenty with insertions, so nothing transfers by index. Eleven base
slots are identified, nine of them in the slot map and the rest refused:[^s259b][^t-harmony-350-slots]

| raw slot | base slot | what it holds |
|---|---|---|
| 0 | 0 | the `0xFEED` name tree, 131 bytes |
| 1 | 1 | seven bytes stating architecture 16 twice, the model's skin (104 on a Harmony 350, 79 on a European Harmony 300), then `0x0d`[^t-harmony-350-skin-c] |
| 2 | 2 | the log area, its eight bytes byte for byte the Harmony 525's[^s260] |
| 3 | 3 | the `0xADDF` framed build timestamp |
| 4 | 5 | the infrared database: groups of `u8 spare; u16 count; u24 record[]`, records in the base layout exactly |
| 5 | none | the start up event table, this family's own: a `u8` count, then one action list instruction per event[^t-harmony-350-slots] |
| 6 | 9 | the key map table, read in the firmware and not in the slot map; its entry 0 is the key table after `LWJL`[^t-harmony-350-slots] |
| 7 | 10 | the action list table: a `u16` count, each list a `u8` length then three byte instructions |
| 8 | 12 | the timer table, read in the firmware and not in the slot map[^t-harmony-350-slots] |
| 9 | 13 | the state variable table, read in the firmware[^t-harmony-350-slots] and in the slot map since a device's power on delay is read through it[^t-file-family-delays] |
| 10 | 15 | the parameter block: a `u8` count, each group a `u8` length then its bytes |
| 11 | 16 | the number sender: a count of zero with no favourite channels and one record per device that has them, in the base layout[^s262] |
| 12 | none | a digit entry table[^t-harmony-350-slots], empty in every configuration read[^t-harmony-350-slots-c] |
| 14 | none | NULL, and no direct reference in the firmware reads it[^t-harmony-350-slots] |

Raw slot 13 holds the metadata archive above. `ARCH16_SLOT_MAP` in `packages/codec/src/gspm.ts` carries the
eight rows with a base slot that were identified first and raw 9, and `archSlot` throws for every other base
slot, so a slot the map does not carry refuses rather than answering wrongly; raw 6 and 8 are not in it
yet.[^s259b][^t-file-family-delays] The firmware's section seeker at `0x10BCE` computes `0x0B + 4 * slot` from a literal its
fourteen callers load, naming raw slots 3 to 12.[^s259] This page called raw slot 12 a candidate for base
slot 17 on its two byte width<!--superseded--> until its reader was read: it is the digit entry table, which
no base slot holds.[^t-harmony-350-slots] What each of these slots holds, and what the model's own
configuration holds in them, is in
[the Harmony 300 and 350 memory page](../architectures/harmony-300-350/memory.md#the-six-slots-the-firmware-was-read-for).

[^s14]: Measured in configurations. [Section 14](../../docs/findings.md#s14)
[^s194]: Measured in configurations. [Section 194](../../docs/findings.md#s194)
[^s7]: Measured in configurations. [Section 7](../../docs/findings.md#s7)
[^t-gspm]: Measured in configurations. [The test](../../tests/test_gspm.py)
[^s115]: Measured in configurations. [Section 115](../../docs/findings.md#s115)
[^s259]: Read in the firmware. [Section 259](../../docs/findings.md#s259)
[^t-harmony-350-slots]: Read in the firmware. [The test](../../tests/test_harmony_350_slots.py)
[^t-harmony-350-slots-c]: Measured in configurations. [The test](../../tests/test_harmony_350_slots.py)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s184]: Measured in configurations. [Section 184](../../docs/findings.md#s184)
[^s20]: Measured in configurations. [Section 20](../../docs/findings.md#s20)
[^s15]: Measured in configurations. [Section 15](../../docs/findings.md#s15)
[^s139]: Measured in configurations. [Section 139](../../docs/findings.md#s139)
[^s36]: Measured in configurations. [Section 36](../../docs/findings.md#s36)
[^s16]: Measured in configurations. [Section 16](../../docs/findings.md#s16)
[^s38]: Read in the firmware. [Section 38](../../docs/findings.md#s38)
[^s32]: Measured in configurations. [Section 32](../../docs/findings.md#s32)
[^s46]: Measured in configurations. [Section 46](../../docs/findings.md#s46)
[^s17]: Measured in configurations. [Section 17](../../docs/findings.md#s17)
[^s40]: Read in the firmware. [Section 40](../../docs/findings.md#s40)
[^s43]: Read in the firmware. [Section 43](../../docs/findings.md#s43)
[^s44]: Read in the firmware. [Section 44](../../docs/findings.md#s44)
[^s117]: Measured in configurations. [Section 117](../../docs/findings.md#s117)
[^s122]: Measured in configurations. [Section 122](../../docs/findings.md#s122)
[^s76]: Measured on a unit. [Section 76](../../docs/findings.md#s76)
[^s41]: Read in the firmware. [Section 41](../../docs/findings.md#s41)
[^s196]: Stated by Logitech. [Section 196](../../docs/findings.md#s196)
[^s260]: Measured in configurations. [Section 260](../../docs/findings.md#s260)
[^s259b]: Measured in configurations. [Section 259](../../docs/findings.md#s259)
[^t-harmony-350-skin-c]: Measured in configurations. [The test](../../tests/test_harmony_350_skin.py)
[^s262]: Measured in configurations. [Section 262](../../docs/findings.md#s262)
[^s237]: Measured on a unit. [Section 237](../../docs/findings.md#s237)
[^s187]: Measured in configurations. [Section 187](../../docs/findings.md#s187)
[^s215]: Measured on a unit. [Section 215](../../docs/findings.md#s215)
[^t-noscreen]: Measured in configurations. [The test](../../packages/codec/test/noscreen.test.ts)
[^t-file-family-delays]: Measured in configurations. [The test](../../packages/codec/test/filefamilydelays.test.ts)
