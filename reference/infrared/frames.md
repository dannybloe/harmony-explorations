# Frames

An infrared command is a lamp blinking in a precise rhythm. Inside that rhythm sits a number, the
**frame**: a television's volume up is one number, its channel down another, and the rhythm is how the
number is spelt in light. Most remotes spell a bit by **how long** a flash or a pause lasts, a short one
for a zero and a long one for a one. Some spell it by **where** the flash sits inside a fixed slot, and
some spell two or four bits at once by picking one of four or sixteen whole shapes.

A Harmony configuration does not store the number. It stores the rhythm itself, as a list of durations,
[infrared records](../config-format/infrared-records.md). This page is about getting the number back out
of those durations and putting it back in: which reading suits which kind of code, and what a reader can
and cannot tell from the durations alone. Which family a code belongs to is [Families](families.md), and
how many times a press sends it is [Sending](sending.md).

## Reading the bits back

**Consumer infrared encodes one bit in the length of one half of a mark and space pair**, so the bits come
back by skipping the header pair, measuring the same half of every pair after it and splitting the
measurements at the midpoint between the shortest and the longest.[^s133] A mark is a time the carrier is
on, a space a time it is off.

**Which half carries the bit is per protocol family and does not have to be supplied**: under the wrong
choice every measurement is the constant half, so there is nothing to split and the reading is refused.
Over the configurations measured, 3502 records read under exactly one convention, none under both and 1128
under none.[^s133][^s163][^s164] Those three numbers are asserted together, as a partition, in the
test.[^t-irframe]

Three boundary rules, each of which once cost a decoder that matched nothing:

* a pair whose measured half is itself a gap, above 8000 us, is the terminator and **not** a
  bit;[^s161]
* the pair carrying the last bit is also the one whose other half is the trailing gap, so the gap is
  tested **after** the bit is taken and not before;[^s133]
* adjacent durations of one kind are one interval and are merged before any of this.[^s164]

The reader recovers bits and nothing else: it does not name the protocol, split an address from a
command, or check a parity bit. `irframe.ts` in `packages/codec/src`.

**Matching a frame against a command list names the button a scan code belongs to.** A frame can be
compared with a number written down elsewhere, which a duration list cannot. Matched against the command
catalogue and the button maps of the account a configuration was built for, the frames name 32 buttons of
a Harmony One and 36 of a Harmony 600, which the [One's](../remotes/harmony-one/keys.md) and
[600's](../remotes/harmony-600/keys.md) keys pages carry.[^s133b] That needs the account, so it is a
calibration per model and not a reader, and a scan code's **position** on the keypad does not follow from
it at all.[^s133b]

## Rebuilding the frame from five durations

**The frame half of a duration list is redundant with the bits plus five numbers taken off the same
record.** Rebuilding is exact on 3502 of 3502 records that read as a frame, on the Harmony 880 and 885,
the Harmony One and the Harmony 600, 650 and 700. The Harmony 525 stores its codes another way, with no
duration list at the record, so it has none to rebuild.[^s152]

| the number | what it is |
|---|---|
| header mark | the first duration of the run |
| header space | the second |
| flat half | the half of every pair that carries no bit, one length throughout |
| zero | the carrying half's length for a clear bit |
| one | and for a set bit |
| closing space | **pulse width only**: the space that ends the last pair, which is a trailing gap and not a cell |

The frame is then the header pair followed by one pair per bit, most significant first, each pair being
the flat half and the carried length in the order the convention states.[^s152] `pulsesOfFrame` and
`timingsOfFrame` in `irframe.ts`, beside the decoder, because a field's encoder lives next to its decoder.

**The closing space is not another cell.** Read as a cell of the flat half it gives that half two values,
which the split refuses; all 200 records it affects are pulse width, 112 of twelve bits and 88 of
fifteen.[^s152] It is absent on a pulse distance frame, where the last space is an ordinary bit, and
`pulsesOfFrame` refuses a pulse width frame without it rather than substituting the flat half.

Two shapes sit inside those five numbers, both measured off configurations Logitech's own compiler
produced rather than allowed for in advance:[^s160]

* **a header pair of `0, 0` means the protocol has no lead in**, and the frame opens on its first bit
  cell. Emitting the zeroes literally would put a pair in the train that no receiver can see and that a
  decoder would then read back as a bit.
* **a first mark that differs from every later one is a longer opening burst**, `firstMark`, and not a
  lead in. The Sharp scheme opens at 270 microseconds where all fourteen later marks are 260. Read as a
  lead in it loses the first cell and yields a number no catalogue code carries; read as part of the
  first cell, 162 of 162 frames land on numbers Logitech's catalogue states. Only the **opening** flat
  may differ, so a genuinely inconsistent run is still a refusal.

**Which carried length means a set bit is per family and is not derivable from a pulse train.**[^s161] A
decoder that knows only durations has to pick a convention, and this one reads the **longer** carried half
as a set bit. A family that counts the other way up states, in Logitech's catalogue, the complement of
what that reads: `Logitech 24 Bit` on 71 of 71 records of a compiled configuration.[^s161] The rhythm
table expresses it without a field of its own, by stating a `zero` longer than its `one`, and an encoder
reading those two numbers emits the record again exactly. Four measured families are that way up,
`Logitech 24 Bit`, `RCAV1 LF 24 Bit`, `Short 11 Bit 2` and `Panasonic 16 Bit`,[^t-stated] and Logitech's
catalogue defines 84 more,[^s227] so an emitter reads the polarity off the table for every family and
never assumes the common direction.

**The non carrying half of a frame is one length, and the reader enforces it.**[^s163] **One length means
it does not split**, by the same ratio the carried half has to split by, and not that it is byte
identical: Logitech's generator emits a flat half of 433 on one cell and 434 on the next, so exact
equality refused ten records Logitech's own analyser names.[^s165] The widest flat spread admitted is
6.1% and the narrowest refused is 100%, which is a biphase code's two halves in a two to one
ratio.[^s165] A frame ending on a carried duration above a constant cannot stand in for the rule:
`JerroldO1 16 Bit` sends a set bit as a 4505 space, while 45 records of three Harmony 880 configurations
carry a mid frame **gap** of 4480, so no constant separates the two and the shape rule does.[^s161] With
the rule in place the terminator is 8000, inside a window between 3480, the longest duration consumed as a
bit, and 15300, the smallest that ends a frame.[^s161]

**Adjacent durations of one kind are merged before the frame is read.**[^s164] A stored duration is
fifteen bits, so a longer interval is spelt as several words in a row and nothing in the train marks the
join. Read unmerged, 45 records of three Harmony 880 configurations yield an eight bit frame, all 45 the
same value, which forty five different commands cannot be; Logitech's own analyser refuses all 36 of
them it was asked about. The merge costs exactly those 45 and changes no other reading.[^s164]

## Six shapes of frame

**A row of the rhythm table has one of six shapes.**[^s162][^s166][^s168][^s169][^s231] Two are the
common ones, pulse timing above and biphase below. The other four:

* **sections**: the five durations plus section widths, for a family sending one value in sections whose
  final bits ride in a structural space and in the closing silence. `Samsung 38 Bit` is the case, and the
  widths sum to the width its name states, which is what settled that "38 Bit" means across the
  pair;[^s166]
* **long toggle**: three regions under the one rule that a set bit is the cell whose first half is
  silence;[^s168]
* **quaternary**: four space lengths sending two bits per cell, `Galaxis 16 Bit Quad Toggle`;[^s169]
* **cell table**: a whole cell picked per digit out of four or sixteen, below.[^s231]

`stated.test.ts` asserts each is a shape of its own rather than a patched frame.[^t-stated]

## Biphase: the bit is which half of the cell carries

**A biphase code has one duration, the half cell, and the bit is its position.**[^s162] A set bit is
the carrier in one half of a cell and silence in the other, so none of the five durations above applies.
Four families in the configurations measured are of this kind.

| the number | what it is |
|---|---|
| mark | one half cell of carrier |
| space | one half cell of silence |
| first mark | a different opening mark where the family sends one |
| lead in | every interval before the first bit cell, **as a record stores them** |
| polarity | whether a mark in the first half means a set bit |

The lead in is stored intervals rather than a count of cells because that is what makes an emitted frame
byte identical to a recorded one: RC-6's preamble holds a 2632 and a 1323 that are six and three cells
long, and Logitech's generator writes 443 and 439 in two places where the cell is 441.[^s162]

**Three unknowns are not derivable from the durations** and are settled against Logitech's catalogue
instead: where the payload starts, which half means a set bit, and the frame's width.[^s162] What the
train does decide is the **parity** of the alignment, so `biphaseFrames` returns one reading per parity
and a caller trims to the width it wants. **The width is stated by Logitech's own definition**,
`NumberOfBits` inside a segment's `Payload`, and is not parsed out of a family name.[^s231] On
`Kreatel IP 22 Bit` the reader hands back 23 bits, and the trim to 22 is what turns no catalogue match at
all into 44 of 44.[^s266]

**A leading gap is skipped.** The reader once broke on the first interval too long to be a half cell
wherever it sat, so a block opening with a gap gave no frame at all: 411 records of 5232, including every
infrared record of one Harmony 350 configuration. It skips a leading gap and still closes the frame on a
later one.[^s266] In practice **one reading is returned rather than two**: 257 of 257 biphase records
give exactly one, and no record reads both as a biphase frame and as a pulse distance one, 0 of
3838.[^s266] One set of timings accounts for every record of each family, 105 of 105 `Magnavox 13 Bit`,
65 of 65 `Microsoft 30 Bit` and 56 of 56 `Kreatel IP 22 Bit`, and all 226 rebuild their own pulses byte
for byte.[^s266] `Microsoft 30 Bit` reads the polarity the other way up, which is RC-6's own
convention.[^s266]

**A biphase reading must reach the end of the frame region**, which is what stops the reader answering
for a code that is not biphase.[^s163] A `Sony 12 Bit` frame's durations are 600, 1200 and 2400, all whole
multiples of 600, so it passes the half cell test and can yield a run of eight or more valid pairs by
luck: 50 records did. A real biphase frame's cells run from its lead in to the gap with nothing left
over. The records that once read under **both** pulse conventions, 148 of them, are exactly the biphase
population, so a biphase code is identified by being biphase rather than by an ambiguity.[^s163]

**The merge above is not applied to the biphase reader**, and that is a rule rather than an omission: a
biphase family spells its code in unit half cells, so two adjacent cells of one kind are two cells and
merging them destroys the reading.[^s164] The same merge can give a biphase code a plausible pulse
distance shape wherever two carrier halves fall next to each other, two `Magnavox 13 Bit` records of a
compiled configuration among them, so a reading that lands on a stated number by **value** is preferred
over one that lands only by matching a width.[^s164]

**A code whose bits are all the same cannot be read without knowing its family.**[^s162] Every carried
half is then one length, so there is nothing to split, and the reader refuses it, the two conventions
being indistinguishable from the durations. Four records measured are of this kind, 24 zero bits of
`Logitech 24 Bit`; the family's own rhythm plus the number Logitech states reproduces each byte for byte.

**On the Harmony 880 and 885 a record's second pointer group is the same RC-6 code with one bit
inverted**, a toggle bit, so those records are biphase; the
[infrared records](../config-format/infrared-records.md) page holds the layout.[^s134]

## Cell tables: one of four or sixteen whole cells per digit

**142 of Logitech's 684 protocol families spell a value a digit at a time, each digit choosing a whole
cell**, out of four for a base four family and sixteen for a base sixteen one.[^s231] `cells` on a table
row is a lead in, one interval list per symbol value in value order, and how many bits one cell carries;
`pulsesOfCellFrame` emits it most significant digit first. Every interval is taken exactly as Logitech's
definition writes it and nothing is derived from a duration, which is what lets one reader serve both
bases and any further power of two. A row carrying `cells` carries none of the five durations and no
`biphase`, and the shape's own consistency is asserted: the cell count is two to the power of the cell
width, every cell holds at least one interval, and no interval is zero.[^t-stated]

**Which base a family uses is stated by its definition and never by its name.**[^s231] Logitech's
`EncodingType` is 2 or 3 on exactly these families and the cell count says the same thing, so
`bitsPerDigit` reads it off the count. A **field width** is then in digits rather than bits and is
multiplied out, since a reader holding the wrong unit sends part of a command with nothing to show that
it did. A family's name carries neither unit: over the 142 it is the digit count on 66, the bit count on
4 and neither on 72.[^s231]

**A two cell family that fits none of the specific readings is a cell table of two.**[^s233] 85
definitions fit no constant half and carried half spelling, 35 of them because they send one interval per
bit, where two equal bits would merge on the wire. A cell table states both intervals of a cell, so any
two cells are expressible; it is a fallback behind the specific readings, so nothing that already read
moves.

**A zero length interval in a definition is dropped, not emitted.**[^s231] One family states its header
as a mark and a space of length zero, which is a mark and nothing after it, and an interval of zero would
merge its two neighbours in any renderer that floors a duration at one unit. Nine families state a zero
interval and six of the fifteen are spaces, so a zero keeps its side of the carrier while it is
read.[^s233]

139 of the cell table families are stated rows in the rhythm table. The 140th,
`Galaxis 16 Bit Quad Toggle`, stays a measured row under the quaternary shape, which is the same idea read
off a stored train instead of off a definition.[^s231]

[^s133]: Measured in configurations. [Section 133](../../docs/findings.md#s133)
[^s163]: Measured in configurations. [Section 163](../../docs/findings.md#s163)
[^s164]: Measured in configurations. [Section 164](../../docs/findings.md#s164)
[^t-irframe]: Measured in configurations. [The test](../../packages/codec/test/irframe.test.ts)
[^s161]: Measured in configurations. [Section 161](../../docs/findings.md#s161)
[^s133b]: Stated by Logitech, by their service. [Section 133](../../docs/findings.md#s133)
[^s152]: Measured in configurations. [Section 152](../../docs/findings.md#s152)
[^s160]: Measured in configurations. [Section 160](../../docs/findings.md#s160)
[^t-stated]: Measured in configurations. [The test](../../packages/codec/test/stated.test.ts)
[^s227]: Stated by Logitech, in their catalogue. [Section 227](../../docs/findings.md#s227)
[^s165]: Measured in configurations. [Section 165](../../docs/findings.md#s165)
[^s162]: Measured in configurations. [Section 162](../../docs/findings.md#s162)
[^s166]: Measured in configurations. [Section 166](../../docs/findings.md#s166)
[^s168]: Measured in configurations. [Section 168](../../docs/findings.md#s168)
[^s169]: Measured in configurations. [Section 169](../../docs/findings.md#s169)
[^s231]: Stated by Logitech, in their catalogue. [Section 231](../../docs/findings.md#s231)
[^s266]: Measured in configurations. [Section 266](../../docs/findings.md#s266)
[^s134]: Measured in configurations. [Section 134](../../docs/findings.md#s134)
[^s233]: Stated by Logitech, in their catalogue. [Section 233](../../docs/findings.md#s233)
