# Growing a config

What has to be recomputed, restamped or moved when one structure in a config changes length.

This began as a survey and the survey now has a write side. `packages/codec/src/edit.ts` refuses to
change any structure's length and it goes on refusing; **`packages/codec/src/relocate.ts` is the
separate entry point that can**, since 25 August 2026: it shifts everything at or above one offset,
rewrites every stated address out of the census below, and restamps the two fields a growth
invalidates. The corpus check behind it inserts filler into every container and demands every reader
report exactly what it reported before, byte diff and meaning both, with a per address class
negative. `docs/findings.md` section 147 is the survey's evidence, section 172 the relocation's,
section 146 a correction the survey produced on its way past, and `packages/codec/test/growth.test.ts`
and `test/relocate.test.ts` recompute every number here.

**Everything here is read only towards hardware.** No remote is opened, no write path is exercised,
nothing on disk changes. The tests build modified copies of containers in memory, because a control
has to, and a relocated container is bytes in memory like any other.

Run it with `make growth`, or `make growth GROWTH_ARGS=--detail` for the breakdown per container.

## The one idea

A position inside a container is either **stated** or **implied**.

A position is stated when some field holds its flash address. Then a relocation is mechanical: work
out where the structure moved to, write the new address into the field. There are a lot of these,
they are countable, and counting them is what tells you how expensive a move is.

A position is implied when nothing holds its address. It is the byte after something else, or the
place a walk happens to land. Nothing has to be rewritten, which sounds cheaper and is worse:
nothing can be checked either. A relocation that puts an implied structure in the wrong place
produces a file that parses, passes every check the remote makes, and means something different.

The implied set is **derived, not listed**. Every structure this codec can see is a claim in
`coverage.ts`; every address it can read is an entry in the census; a claim whose start no address
names is implied by arithmetic rather than by anybody's judgement. So a reader added next month lands
in one population or the other on its own, and the report names any owner nobody has explained yet.

## The numbers

Over the nineteen containers of the corpus, 10242346 bytes:

| | count |
|---|---|
| addresses a container states | 140272<!--fact:growth_pointers--> |
| naming flash **outside** the container | 38, and they are base slot 2's log area, two per container |
| landing **inside** a structure rather than on its first byte | 16740 |
| named by more than one field | 18751<!--fact:growth_shared--> |
| implied positions | 71267<!--fact:growth_implied--> |

Every address in this format is a three byte little endian absolute flash address. There is no
relative addressing anywhere and no address of any other width, which is the one piece of good news
in the survey: relocation arithmetic is uniform.

The implied positions split three ways, because they cost different things.

**Frame**, 76 of them, four per container: the header at zero, the section table at `0x0B`, the end
marker after the pointer table, the trailer at the end. The container's own arithmetic decides all
four and a writer cannot get them wrong. The key table looks like a fifth and is not: nothing points
at the four bytes after the end marker, but it **is** base slot 6's first mode record, so the mode
table names it like any other mode.

**Packed**, 3017<!--fact:growth_packed-->: a structure sitting immediately after a structure of a different kind. 3005 of them
are the second copy of a mode page's tagged list, which nothing on the remote reads, so an emitter
that misplaces one passes every check there is. The other twelve are base slot 15's group 9
continuing past the entry count its own header declares.

**Chain**, 68174<!--fact:growth_chain-->: the byte after the previous element of a run, so one element growing moves every
later element and there is no field anywhere to correct. 68172 are screen program instructions and
2 are pictures in the arch 9 (Harmony 525) safe mode container that nothing addresses.

## Where growth is cheap

The cost of making room at an offset is the number of addresses naming something at or above it. That
number falls as the offset rises, so "what does a length change cost" has no answer and "where is it
cheap" has one. Pointer rewrites, per container:

| | first byte of content | bottom of the picture bank | just below the trailer |
|---|---|---|---|
| `one_config`, arch 12 (Harmony One) | 12043 | 1091 | 0 |
| `h600_config`, arch 14 (Harmony 600) | 17435 | 501 | 0 |
| `h700_config`, arch 14 (Harmony 700) | 27102 | 893 | 0 |
| `h525_config`, arch 9 (Harmony 525) | 4808 | 1114 | 0 |
| `arch8_config_a`, arch 8 (Harmony 880) | 5505 | 980 | 0 |
| `h525_safemode_ahcm`, arch 9 (Harmony 525) | 951 | 344 | 0 |

The first column is an identity, not a measurement: it is the container's address count less two, on
all nineteen containers, because the only addresses that do not name something above the first byte
of content are base slot 2's pair naming flash above the container.

The third column is the useful one. **Appending to a container rewrites nothing at all.** The picture
bank is the last thing in a config, nothing sits above it but the trailer, and the trailer's position
is the container's own arithmetic. So a longer last picture, or a new one, costs the two restamped
header fields and no pointer rewrites whatever, on every container here.

That is the shape of the cheapest useful change: **add at the top, address it from where it is
needed.** A new picture goes at the top of the bank and the screen program that draws it names it.

## What a relocation would have to do

In order, if somebody ever does lift the refusal:

1. **Decide the insertion point and get the cost from the census.** `insertionCost` answers in a
   fraction of a second per container.
2. **Move the bytes.** Everything at or above the insertion point shifts by the delta.
3. **Rewrite every address whose target moved.** All 140272<!--fact:growth_pointers--> minus the two outward ones are
   candidates; which of them moved is the comparison against the insertion point.
4. **Reproduce every implied position.** The frame ones fall out. The packed ones need whatever
   produced the neighbouring structure to produce these in the same pass. The chained ones are the
   dangerous set, because nothing will tell you if a walk now lands one byte out.
5. **Restamp `end_addr` and the trailer checksum.**
6. **Verify by reading it back**, because nothing in step 3 or step 4 is checked by the format.

## Five things that are not counts

**Sharing.** 18751<!--fact:growth_shared--> addresses are named more than once, so a relocation rewrites every holder and not
the first one it finds. The shapes: 15507 are a screen program named both by base slot 11's table and
by a base slot 14 record, so moving one program means two fields in two different sections; 2008 are
a program named by several jumps or switch arms, and one address in a Harmony 525 config is named 472
times; 788 are a touch area named by its page and by its own back pointer; 431 are shared infrared
duration blocks, which is the rail `docs/findings.md` section 61 already stated.

**Addresses that land inside a structure.** 16740 of them, and they need the containing structure's
new address plus an offset rather than just a new address. Exactly two families, both mechanical:
13353 shared glyph runs, where a screen instruction names the text payload of an instruction in
another program, and 3387 infrared record pointers, which land seven bytes into their record.

**The format cannot tell you when you got it wrong.** A control moves one action list pointer by
three bytes, restamps the trailer the way a writer would, and the container parses, passes every
check it makes about itself, and reads a different action list. The trailer checksum is the only
check the remote makes and it is a `u16` XOR: it says the file will be accepted, never that it is
right.

**Two structures cannot grow at all.** Base slot 15's group lengths and its entry count are demanded
by the firmware: a group of the wrong length is silently replaced by compiled in defaults, and a
different entry count is a silent no-op. No addressing work changes that.

**Reproducing Logitech's output is not on the table.** Three arch 8 (Harmony 880) configs generated
ten minutes apart differ in 73 to 84% of their bytes. A relocation is for changing a config, not for
matching one, so the test of a growth is that the remote does the right thing and not that the bytes
look like somebody else's.

## What the emitter would need

`coverage.ts` says which structure owns a byte and `emit.ts` says whether that structure can be
written back from typed fields. Together they say which addresses a relocation could rewrite today.

**Every one of the 140272<!--fact:growth_pointers--> sits inside something the emitter rebuilds**, in every container, so there
is no address stranded in a region no rebuilder reaches. Four of those rebuilds carry bytes they do
not frame, and only one of the four carries its own addresses: base slot 5's headers, base slot 7's
font sets and base slot 14's records all write their addresses as fields and carry a different byte.

Screen programs frame the opcode and carry every operand. So the 33660 addresses inside a screen
instruction are the whole of the framing work a relocation needs and today's emitter does not do.
One item.

## What is not settled

* **Whether there is room.** A container says where it ends and nothing in it says where the flash
  region ends. That is a `packages/usb` question: `WRITE_FLASH`'s region per architecture, with the
  arch 12 (Harmony One) ceiling at `0x3D0000` rather than `0x400000` because the stored application
  firmware sits inside the nominally writable region.
* **Whether the remote validates anything else.** The trailer checksum is what the boot validator
  computes and no other check has been read. The firmware was not re-read for this survey, so this
  is absence of evidence.
* **Screen opcodes 1 and 21**, six operand bytes and four. Neither is known to hold an address and
  neither is in the census, so if either does the count is low by however many there are.
* **The two byte bias.** Base slot 17 names the picture bank two bytes in front of it on arch 8, 9
  and 14, and what those two bytes are for is unread. A relocation reproduces the bias, not the
  address.
* **Where screen opcode 3 draws its picture.** Section 146. It does not affect the census, since the
  address is a picture wherever it lands. (This said it affects the render check, "which never looks
  at the instruction"; section 148 taught the renderer opcode 3 and added the per architecture tally
  that would notice it going blind again, so that clause is dead.)
