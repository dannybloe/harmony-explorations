# Relocation: what growing a section moves

A configuration is a long run of bytes in which one structure finds another by its address: a menu names the
program that draws it, a key names the list it runs, a command names its infrared record. Nothing else holds
the pieces together. So making one structure longer, a new command, a longer label, one more page, pushes
everything above it up the file, and every address naming something that moved becomes wrong. Worse, some
structures are found with no address at all, only by sitting right after something else, and those cannot even
be checked.

This page says what a change of length moves, how many addresses that is, where it is cheap and where it is
expensive, and what no address protects. Where Logitech's compiler puts things in the first place is
[layout](layout.md). A change that keeps every length is cheaper in the file and still not cheap on the remote,
which the last section says.

## Stated and implied positions

A position inside a container is either **stated** or **implied**[^s147].

* A position is **stated** when some field holds its flash address. Moving it is mechanical: work out where the
  structure went and write the new address into the field. There are a great many of these, and they are
  countable.
* A position is **implied** when nothing holds its address: it is the byte after something else, or the place a
  walk happens to land. Nothing has to be rewritten, which sounds cheaper and is worse, because nothing can be
  checked either. Putting an implied structure in the wrong place produces a file that parses, passes every
  check the remote makes, and means something different.

**Every address in the format is a three byte little endian absolute flash address.** There is no relative
addressing and no address of another width, so the arithmetic of a move is uniform[^s147].

The implied set is derived rather than listed: every structure `coverage.ts` can see is a claim, every address
the codec can read is an entry in the pointer census of `growth.ts`, and a claim whose start no address names is
implied by arithmetic. A reader added later lands in one population or the other on its own[^s147].

## The numbers

Over the nineteen containers of the corpus, 10242346 bytes[^s147]:

| | count |
|---|---|
| addresses a container states | 140272<!--fact:growth_pointers--> |
| of those, naming flash **outside** the container | 38, base slot 2's log area, two per container |
| of those, landing **inside** a structure rather than on its first byte | 16740 |
| addresses named by more than one field | 18751<!--fact:growth_shared--> |
| implied positions | 71267<!--fact:growth_implied--> |

The implied positions are of three kinds, because they cost different things[^s147]:

* **Frame**, 76, four per container: the header at zero, the section table at `0x0B`, the marker after the
  pointer table and the trailer at the end. The container's own arithmetic decides all four. The key table looks
  like a fifth and is not: nothing points at the bytes after that marker, but the key table **is** base slot
  6's first mode record, so the mode table names it like any other mode, [modes and keys](modes-and-keys.md).
* **Packed**, 3017<!--fact:growth_packed-->: a structure sitting immediately after a structure of another kind.
  3005 of them are the second copy of a mode page's tagged list, which nothing on the remote reads; the other
  twelve are base slot 15's group 9 running past the entry count its own header declares.
* **Chain**, 68174<!--fact:growth_chain-->: the byte after the previous element of a run, so one element growing
  moves every later one and there is no field anywhere to correct. 68172 are screen program instructions and 2 are
  pictures in the Harmony 525's safe mode configuration that nothing addresses.

## Where growth is cheap

The cost of making room at an offset is the number of addresses naming something at or above it. That falls as
the offset rises, so "what does a length change cost" has no answer and "where is it cheap" has one. Pointer
rewrites, per container[^s147]:

| container | first byte of content | bottom of the picture bank | just below the trailer |
|---|---|---|---|
| a Harmony One user configuration | 12043 | 1091 | 0 |
| a Harmony 600 user configuration | 17435 | 501 | 0 |
| a Harmony 700 user configuration | 27102 | 893 | 0 |
| a Harmony 525 user configuration | 4808 | 1114 | 0 |
| an arch 8 (Harmony 880 or 885) configuration | 5505 | 980 | 0 |
| the Harmony 525's safe mode configuration | 951 | 344 | 0 |

The first column is an identity rather than a measurement: it is the container's address count less two, on all
nineteen, since the only addresses that do not name something above the first byte of content are base slot 2's
pair naming flash above the container[^s147].

**Appending costs no pointer rewrites at all.** The picture bank is the last thing in a container and nothing sits
above it but the trailer, whose position is the container's own arithmetic. So a longer last picture, or a new one
on top of the bank, costs the two restamped fields below and nothing else, on every container measured[^s147]. That
is the shape of the cheapest useful change: **add at the top, and address it from where it is needed.**

## What a growth makes wrong on its own

Two fields are wrong after any growth, before anything else is considered[^s147]:

* **`end_addr`**, at offset 4, which names the end marker's own address: the flash base plus the length less four,
  exactly, on all nineteen containers. It is the only header field that moves with a section's growth.
* **The trailer checksum**, which any change voids, [the container](container.md).

The marker after the pointer table does not move, since its offset depends on the slot count alone. Base slot
3's timestamp and base slot 13's clock records are stale for another reason, the time of writing, and are
[header records](header-records.md) and [state](state.md)[^s147].

## What a relocation does

`relocate` in `packages/codec/src/relocate.ts` makes room in a container: it shifts everything at or above one
offset, rewrites every stated address out of the pointer census, and restamps `end_addr` and the trailer
checksum[^s172]. The census is the single source of what gets rewritten, so a reader added later joins the rewrite
by joining the census. Its header lists the steps a relocation takes. It is checked by inserting filler into every
container at two offsets and demanding two things: that the bytes differ from a plain shift in exactly the
rewritten fields and the two restamps, and that every reader reports what it reported before; with any one of the
21 address classes of a Harmony One configuration left out of the rewrite, the check fails[^s172].

Three boundaries came out of that check rather than out of a reading[^s172]:

* **The lowest insertion point is past the key table, not past the marker.** This project's own readers find the
  key table by its position after the marker, so filler between the two would be read as key records. Nothing found
  on the Harmony 600, 650 and 700 images reads that position, [layout](layout.md)[^s328], so the floor is the
  readers' and not shown to be the remote's.
* **The top of the picture bank is not insertable**, because the bank's extent is implied by its walk landing exactly
  on the trailer, and **its bottom is below the two bytes** that lead to it from base slot 17 on arch 8, 9 and 14.
* **A table only a composed configuration fills is invisible to a corpus wide check**: base slot 16's records and
  their digit tables were missing from the census, and no corpus configuration populates the slot.

**A configuration grown this way has run on a remote**: a device composed onto a Harmony One configuration, by four
relocations, was written to a Harmony One and its television answered the new commands[^s242].

## Five things that are not counts

**Sharing.** 18751<!--fact:growth_shared--> addresses are named more than once, so a relocation rewrites every
holder and not the first it finds[^s147]. 15507 are a screen program named both by base slot 11's table and by a
base slot 14 record, so moving one program means two fields in two sections; 2008 are a program named by several
jumps or switch arms, one address in a Harmony 525 configuration named 472 times; 788 are a touch area named by its
page and by its own back pointer; and 431 are infrared duration blocks shared between records,
[infrared records](infrared-records.md)[^s147].

**Addresses that land inside a structure.** 16740 of them need the containing structure's new address plus an
offset. There are exactly two families and both are mechanical: 13353 shared glyph runs, where a screen
instruction names the text payload of an instruction in another program, and 3387 infrared record pointers, which
land seven bytes into their record[^s147].

**The format cannot tell you when you got it wrong.** Move one action list pointer by three bytes, restamp the
trailer the way a writer would, and the container parses, passes every check it makes about itself, and reads a
different action list[^s147]. A wrong address does not raise an error; it reads the neighbouring bytes. The remote's
container validator compares the cookie, the marker after the pointer table, the end marker at `end_addr` and the trailer checksum,
the checksum on the Harmony 600, 650 and 700 only while one setting is on[^s354]; the checksum is a sixteen bit XOR,
[the container](container.md), so passing it means the file will be accepted, never that it is right.

**Two structures cannot grow at all.** Base slot 15's group lengths and its entry count are demanded by the
firmware: a group of the wrong length is silently replaced by compiled in defaults, and a different entry count is a
silent no-op, [state](state.md)[^s44]. No addressing work changes that.

**Reproducing Logitech's output is not the test.** Two compiles of one account differ in most of their bytes,
[layout](layout.md), so a relocation is for changing a configuration and not for matching one: its test is that the
remote does the right thing.

## What the codec can rewrite

`coverage.ts` says which structure owns a byte and `emit.ts` says whether that structure can be written back from
typed fields. **Every one of the 140272<!--fact:growth_pointers--> addresses sits inside a structure the emitter
rebuilds**, in every container, so no address is stranded where no rebuilder reaches[^s147]. Screen programs frame
the opcode and carry every operand, so the 33660 addresses inside a screen instruction are the framing work a
relocation through the emitter would need and the emitter does not do; base slot 5's headers, base slot 7's font
sets and base slot 14's records write their addresses as fields[^s147].

## For a writer

* **Restamp `end_addr` and the trailer checksum after any change of length**, and nothing else in the header
  moves[^s147].
* **A section's size is not the gap to the next pointer**: base slot 4 holds 125 bytes where its gap is up to 1532,
  because base slot 5's infrared groups are parked inside it, [layout](layout.md)[^s36].
* **A picture's position is implied by everything before it**, so inserting or resizing one moves every later
  address[^s55].
* **Every mode page's tagged list has a second copy whose position is implied and which nothing reads**; an editor
  that changes a page's bindings changes both, [modes and keys](modes-and-keys.md)[^s69].
* **Parsing is not validating.** A device cloned into a Harmony 525 configuration by inserting bytes passed both
  checksums, rendered every screen identically, closed every count and was accepted by this project's parser, while
  every infrared command in it addressed the wrong place[^s117]. That is why `edit.ts` refuses a change of length and
  `relocate` is a separate entry point.
* **A same length edit still costs two erase blocks on the remote.** Flash only clears bits, so changing one byte
  means erasing its 64 KiB block and writing the rest of it back. The cheapest edit touches two blocks, because
  the trailer checksum at the far end of the container moves with every edit, and a page binding's second copy sits
  72 to 214 KiB from the first: 187 of 187 editable pages over five configurations land in exactly two
  blocks[^s187][^s237]. So a write reads the affected blocks, applies the edit, erases, writes each block back whole
  and reads it back, and compares every block it will touch before erasing any of them[^s237].

## Not settled

* **Screen opcode 21**, four operand bytes, seen on arch 8 only and not understood, is not in the census; if it holds
  an address the count is low by however many there are[^s147]. Opcode 1, the other one this page listed, is a
  filled rectangle and holds none[^s425].
* **What the two bytes in front of the picture bank are for** on arch 8, 9 and 14. A relocation reproduces them rather
  than the address[^s147].
* **Whether there is room.** A container says where it ends and nothing in it says where the flash region ends; each
  architecture's memory page states the highest address a write may reach: the
  [Harmony 525](../architectures/harmony-5xx/memory.md), the [Harmony One](../architectures/harmony-one/memory.md) and
  the [Harmony 600, 650 and 700](../architectures/harmony-600-650-700/memory.md).

[^s147]: Measured in configurations. [Section 147](../../docs/findings.md#s147)
[^s172]: Measured in configurations. [Section 172](../../docs/findings.md#s172)
[^s328]: Read in the firmware. [Section 328](../../docs/findings.md#s328)
[^s242]: Measured on a unit. [Section 242](../../docs/findings.md#s242)
[^s354]: Read in the firmware. [Section 354](../../docs/findings.md#s354)
[^s44]: Read in the firmware. [Section 44](../../docs/findings.md#s44)
[^s36]: Measured in configurations. [Section 36](../../docs/findings.md#s36)
[^s55]: Measured in configurations. [Section 55](../../docs/findings.md#s55)
[^s69]: Measured in configurations. [Section 69](../../docs/findings.md#s69)
[^s117]: Measured in configurations. [Section 117](../../docs/findings.md#s117)
[^s187]: Measured in configurations. [Section 187](../../docs/findings.md#s187)
[^s237]: Measured in configurations. [Section 237](../../docs/findings.md#s237)
[^s425]: Read in the firmware. [Section 425](../../docs/findings.md#s425)
