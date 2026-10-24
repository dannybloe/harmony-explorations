# Families

#### A repetition can send several rhythms, and a copy names which

Section 232. **One family can send more than one rhythm inside one press**, and 44 of Logitech's 684
definitions do: `Classe 16 Bit Toggle` sends a lead in, four mode bits at a 442 microsecond half cell,
**one** bit at 880 and sixteen data bits back at 442, as three segments with three different cells. This
is RC6's shape. Our table held one rhythm per family, so a block of such a family carried a third of the
command and the derivation refused all of them, at a cost of 84694 catalogue commands.

`also` on a table row holds the family's other rhythms, in the emitter's own `FrameShape` spelling
rather than the row's older flat one, and a block's copy item carries `shape`, an index into that list
offset by one because index 0 is the row itself. **A copy naming a rhythm the row does not hold throws
rather than falling back on the first**, which is the direction that matters: a fallback would send one
segment in another's rhythm and produce a waveform that looks well formed. 481 of the 504 derivable
blocks are one shape, 14 send two and 9 send three; four table rows carry `also`.

**A lead in is part of a rhythm's identity for the two shapes that have no bare form.** A pulse timing
copy can be emitted bare, by zeroing its header, so a segment differing only in its lead still takes the
older route of literal words in front of a bare copy. A biphase or cell table copy has no bare form, so
its own lead has to be its own rhythm.

**A digit's width is per segment.** `Motorola 16 Bit Quad Toggle` states eight base four digits, one
plain bit, then seven more base four digits, so one multiplier for the family is wrong for two of its
three segments.

**Which of the code's values a copy carries** is the k-th field of that group with that segment, for the
k-th time the group names it, which reduces to counting payloads where every field names one segment.
The field order is `sequence` then `token`, and `token` alone is ambiguous on 103 of the 681 definitions
that state fields. Three guards are load bearing and each was measured: a position asked for needs a
field of its own, or the payload counter is used instead; the widths repeat where a code states a whole
multiple of them and a count that is not a whole multiple stays a refusal; and the ceiling on a frame
index is the code's own value count, since a code may state fewer values than the definition has
fields.

| the number | what it is |
|---|---|
| mark | one half cell of carrier |
| space | one half cell of silence |
| first mark | a different opening mark where the family sends one |
| lead in | every interval before the first bit cell, **as a record stores them** |
| polarity | whether a mark in the first half means a set bit |

The lead in is stored intervals rather than a count of cells because that is what makes an emitted frame
byte identical to a recorded one: RC-6's preamble holds a 2632 and a 1323 that are six and three cells
long, and Logitech's generator writes 443 and 439 in two places where the cell is 441.

Three unknowns are not derivable from the durations and are settled against Logitech's catalogue instead:
where the payload starts, which half means a set bit, and the frame's width. What the train does decide
is the **parity** of the alignment, so `biphaseFrames` returns one reading per parity and a caller trims
to the width it is looking for. **The width is stated by Logitech's own definition**, `NumberOfBits`
inside a segment's `Payload`, which `keycodeFields` exposes; it is not parsed out of a family name,
section 231. On `Kreatel IP 22 Bit` the reader hands back 23 bits and the trim to 22 is what turns no
catalogue match at all into 44 of 44, section 266.

**A caller need not trim the leading gap and once had to**, section 266. `halfCells` broke on the first
interval too long to be a half cell wherever it sat, so a block that opens with a gap returned no frame
at all: 411 records of 5232 unreadable, including every infrared record of one Harmony 350. It skips a
leading gap and still closes the frame on a later one. Every caller in `bin/protocols.ts` trims with
`fromFirstMark` first, which is why the generated rhythm table never showed it and why the report is
byte identical either way. In practice **one reading is returned rather than two**: 257 of 257 biphase
records in the corpus population give exactly one, and no record reads as both a biphase frame and a
pulse distance one, 0 of 3838. Measured this way, one tuple accounts for every record of each family:
105 of 105 `Magnavox 13 Bit`, 65 of 65 `Microsoft 30 Bit`, 56 of 56 `Kreatel IP 22 Bit`, and all 226
rebuild their own pulses byte for byte. `Microsoft 30 Bit` reads the polarity the other way up, which is
RC-6's own convention, and it is confirmed on 48 further records in four contributed configs where
Logitech's analyser had already stated the number.

**A code whose bits are all the same cannot be read without knowing its family**, section 162. Every
carried half is then one length, so there is nothing to split, and the reader refuses it for the same
reason it refuses a frame read under the wrong carrier convention: the two are indistinguishable from the
durations. Four records in the corpus are of this kind, 24 zero bits of `Logitech 24 Bit`, and what reads
them is the family's own rhythm plus the number Logitech states, which then reproduces the record byte for
byte and tests the family's polarity into the bargain.

**The non carrying half of a frame is one length, and that is a rule the reader enforces**, sections 161,
163 and 165. **One length means it does not split**, by the same ratio the carried half has to split by,
and not that it is byte identical: their generator emits a flat half of 433 on one cell and 434 on the
next, so exact equality refused ten records of the compiled sample that their own analyser names. The
margin is measured, since the widest flat spread admitted is 6.1% and the narrowest refused is 100%,
which is a biphase code's two halves in a two to one ratio. It is what a pulse distance or pulse width frame **is**, and the encoder had always demanded it
while the decoder had not, so a duration threshold was standing in for it: a frame ended at a carried
duration above 4000 microseconds, which refused every `JerroldO1 16 Bit` record, whose set bit is a 4505
space. 45 records of three arch 8 configs carry a mid frame **gap** of 4480, so no constant separates the
two cases and the shape rule does: those 45 take two lengths in both halves, which is biphase. With the
rule in place the threshold is 8000, measured against a window between 3480, the longest duration
consumed as a bit, and 15300, the smallest that ends a frame.

The cost is recorded in section 163: the 148 records that read under **both** conventions now read under
none. They are exactly the biphase population and the biphase reader reads them, so a two group record is
identified by being biphase rather than by our own ambiguity, in one direction only.

**Adjacent durations of one kind are merged before the frame is read**, section 164. An interval is a
length of time the carrier is on or off, and a stored duration is fifteen bits, so a longer interval is
spelled as several words in a row and nothing in the train marks the join. Read unmerged, 45 records of
three arch 8 configs yield an eight bit frame, all 45 the same value, which forty five different
commands cannot be; Logitech's own analyser refuses all 36 of them it was asked about. The merge costs
exactly those 45 across the corpus and changes no other reading, because the rule above already refuses
everything else it would have made ambiguous.

It is **not** applied to the biphase reader, and that is a rule rather than an omission: a biphase family
spells its code in unit half cells, so two adjacent cells of one kind are two cells and merging them
destroys the reading. `mergedIntervals` and `biphaseFrames` sit in the same file for that reason. The
same merge does give a biphase code a plausible pulse distance shape wherever two carrier halves fall
next to each other, two `Magnavox 13 Bit` records of the compiled sample among them, so a reading that
lands on a stated number by **value** is preferred over one that lands only by matching a width.

**A biphase reading must reach the end of the frame region**, section 163, which is what stops the reader
answering for a code that is not biphase. A `Sony 12 Bit` frame's durations are 600, 1200 and 2400, all
whole multiples of 600, so it passes the half cell test and its cells can yield a run of eight or more
valid pairs by luck: 50 records did. A real biphase frame's cells run from its lead in to the gap with
nothing left over.
