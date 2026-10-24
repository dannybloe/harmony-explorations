# Frames

#### A class 1 record's bit frame is recoverable from its durations

Section 133. Consumer infrared encodes one bit in the length of one half of a mark and space pair, so
the bits come back by skipping the header pair, measuring the same half of every pair after it and
splitting the measurements at the midpoint between the shortest and the longest.

**Which half carries the bit is per protocol family and does not have to be supplied**: under the wrong
choice every measurement is the constant half, so there is nothing to split and the reading is refused.
Across the corpus 3502 records read under exactly one convention, **none under both** and 1128 under
none. This said **4029 records under one convention and 936 under none**<!--superseded--> with no
count for "both", which is a partition of 4965 records where the population is 4630: it predates a
change to the container list and nothing recomputed it. The three numbers are asserted together in
`packages/codec/test/irframe.test.ts`, as a partition, for that reason.

Two later findings moved that partition and both are below: requiring the non carrying half to be one
length emptied the "both" column, section 163, and merging adjacent durations of one kind took 45
records out of the "one" column, section 164. It read **3547 under one, 148 under both and 935 under
none**<!--superseded--> before either.

Two boundary rules, both of which cost a decoder that matched nothing:

* a pair whose measured half is itself a gap, above 8000 us, is the terminator and **not** a bit
* the pair carrying the last bit is also the one whose other half is the trailing gap, so the gap is
  tested **after** the bit is taken and not before
* adjacent durations of one kind are one interval and are merged before any of this, section 164

`packages/codec/src/irframe.ts`. It recovers bits and nothing else: it does not name the protocol,
split an address from a command, or check a parity bit. This added that **it cannot re-encode a frame**<!--superseded-->,
**because the timings, the header and the repeat are protocol facts the bits do not carry**, and the
first half of that is refuted below: a record states its own timings, so the frame does come
back. What the bits genuinely do not carry is everything after the frame.

What that buys is comparison against a number stated outside the config. Matching a frame against the
command catalogue of the account that generated a config, and that account's button maps, names the
**button** a scan code belongs to: `reference/button-maps.md` has 32 buttons of a Harmony One and 36 of
a Harmony 600. That needs the generating account, so it is a per model calibration and not a reader,
and a scan code's **position** does not follow from it at all, section 133.

#### And the frame is rebuilt from five durations the record itself states

Section 152. The frame half of a duration run is redundant with the bits plus five numbers taken off the
same record. Exact on **3502 of 3502** records that read as a frame, over seventeen containers and arch
8, 12 and 14; arch 9 stores class 5 and has no duration run at the record, so its count is zero.

| the number | what it is |
|---|---|
| header mark | the first duration of the run |
| header space | the second |
| flat half | the half of every pair that carries no bit, one length throughout |
| zero | the carrying half's length for a clear bit |
| one | and for a set bit |
| closing space | **pulse width only**: the space that ends the last pair, which is a trailing gap and not a cell |

The frame is then the header pair followed by one pair per bit, most significant first, each pair being
the flat half and the carried length in the order the convention states. `pulsesOfFrame` and
`timingsOfFrame` in `packages/codec/src/irframe.ts`, beside the decoder because a field's encoder lives
next to its decoder.

The closing space is what took the count from 3347 to 3547, before the merge below took it to 3502:
read as another cell of the flat half it
gives that half two values, which the split refuses, and all 200 records affected are pulse width, 112
of twelve bits and 88 of fifteen, all in the two calibration configs. It is absent for a pulse distance
frame, where the last space is an ordinary bit, and `pulsesOfFrame` refuses a pulse width frame without
it rather than substituting the flat half.

**The timings are the appliance's, not the command's**, which is what makes a catalogue import possible:
52 of 58 device groups in the corpus use one set of timings for every code they carry, and six use two.
Logitech's own service states a protocol name and a frame value with the durations null, so a command
fetched from it is written using the timings of any code of the same appliance a config already holds.

**Nothing after the frame is derived.** A block repeats the frame 1, 3, 7, 11 or 30 times, the gap
between consecutive copies is byte identical in all 3502, and what follows the last copy is 140 distinct
shapes across the corpus and is copied rather than computed.

**A family is named by Logitech's catalogue, matched on the rhythm their own definition states**, section
227, and never by their analyser. Their analyser is a decoder of their database rather than of infrared,
section 160, and it named all three of the table's analyser named entries wrongly. The lookup key is the
carrier, the header and the four durations, matched exactly, with the width from their definition's
keycode field narrowing the 24 rhythms that more than one family holds; 17 rhythms stay ambiguous after
that and keep whatever name they had, since a guess is worse than an old name. A row records their
analyser's name in `heardAs` where the two differ. **`carriedFirst` on a row says the cell states the
half that carries the bit first**, section 230: seven rows set it, all of them stated, and it is needed
only where storing the pair the other way round would change the wire, which is why 30 further families
that state it that way do not set it. No measured row sets it, our corpus decoder reading a stored train
as (mark, space) pairs by construction. **One entry per family**: no family arrives at two
carriers, their definitions stating one carrier each, and the carrier is in the key because a rhythm is
only a rhythm at a frequency. `source` says which route measured the durations, and a row's `spread` is
now zero throughout, the one entry that had a band having turned out to be three families.

**`source: 'stated'` means Logitech states this rhythm and nobody here has measured it**, section 227.
644<!--fact:protocol_stated--> of the table's 681<!--fact:protocol_entries--> entries are of that kind, converted out of their own definitions for families no
configuration in this corpus holds a record of. Such a row carries `codes: 0`, `exact: 0` and
`spread: 0`, which are the honest numbers rather than placeholders, and no `tailExact` and no
`heldExact`, since those count the records that rebuilt from the row and there are none. Anything
counting what reproduces a corpus record must exclude these rows; `source` is the field to filter on.

**33<!--fact:protocol_tails_stated--> of those 644<!--fact:protocol_stated--> carry a `tail` and a `held` as well, derived rather than measured**, section 228, and
the other 541 carry a frame and nothing after it, so `blockOfStatedCode` refuses those. A block is one
repetition's shape plus how many repetitions go out. Logitech's `KeyCode` field states the shape whole,
and the derivation of it reproduces all 29 blocks measured off their own compiler to the microsecond,
which is why a derived one is believed. The count is `pressMinimumRepeats`, stated on 39 of their 684
definitions and null on 645, and where it is stated for a family we measured it is right on five of five.
**It is never defaulted**: our own measurement puts it at three for 22 of the 24 unstated families and at
one for the other two, so a default would be a fit to this corpus rather than a derivation. A family
whose count is unstated therefore keeps no block and stays buildable rather than writable.

**A configuration numbers its codes and names none of them, and the name is available elsewhere**,
section 229. Nothing in base slot 5 says which of a device's ninety codes is volume up; the record
carries durations and the action list carries an index. Logitech's device catalogue, archived, states a
name beside every code, and a device group is identified in it by the **numbers its records decode to**,
which works because 104938 distinct numbers cover 2067863 commands. Over this corpus 36 of 38 device
groups identify, 31 of them on every number they send, and 537 of 598 button bindings get a command
name; on the two calibration configurations every binding does, 70 of 70 and 78 of 78. The name must be
taken from the identified device's **own** codeset and never from the catalogue at large, since a number
alone is held by several manufacturers. `packages/codec/src/catalogue.ts` is the reader and it is
Logitech's data, so decision 11 forbids sharing anything derived from it.

Two things a derived block does not claim. Its long gaps are chunked greedily into stored words of at
most 32767 microseconds, where Logitech's compiler chunks inconsistently, so it matches on the wire and
not necessarily word for word; and a family whose codes all carry the same number of set bits cannot show
whether its gap is padded or literal, which is why the 29 measured rows keep their measured blocks rather
than being replaced by derived ones.

Two families of shape sit inside those five numbers, and both are measured off a configuration Logitech's
own compiler produced rather than allowed for in advance, section 160:

* **a header pair of `0, 0` means the protocol has no lead in**, and the frame opens on its first bit
  cell. Emitting the zeroes literally would put a pair in the train that no receiver can see and that
  this decoder would then read back as a bit.
* **a first mark that differs from every later one is a longer opening burst**, `firstMark`, and not a
  lead in. The Sharp scheme opens at 270 microseconds where all fourteen later marks are 260. Read as a
  lead in it loses the first cell and the number it yields is one no catalogue code carries; read as part
  of the first cell, 162 of 162 frames land on numbers Logitech's catalogue states. Only the **opening**
  flat may differ, so a genuinely inconsistent run is still a refusal.

**Which carried length means a set bit is per family and is not derivable from a pulse train**, section
161. A decoder that knows only durations has to pick a convention, and this one reads the **longer**
carried half as a set bit. `Logitech 24 Bit` is the other way up, so Logitech's catalogue states the
complement of what this reads, on 71 of 71 records of the compiled sample. The rhythm table expresses
that without a field of its own, by stating a `zero` longer than its `one`, and an encoder reading those
two numbers emits the record again exactly. It is the only inverted entry, which a test asserts by
looking for the shape rather than for the name.

#### A biphase code has one duration, and the bit is which half of the cell carries it

Section 162, and section 163 added the fourth. Four families in the corpus and the compiled sample state a bit by **position** rather than
by length: there is one half cell, and a set bit is the carrier in one half and silence in the other.
None of the five durations above applies to a biphase family. **A row of the rhythm table has one of
six shapes, not one of two**, and this said "one shape or the other and never both"<!--superseded-->
until 29 August 2026, which was true when only the pulse timing and biphase shapes existed. Sections
166 to 169 added three more: the five durations plus section widths, for a family sending one value in
sections whose final bits ride in a structural space and in the closing silence; the long toggle shape,
three regions under the one rule that a set bit is the cell whose first half is silence; and the
quaternary shape, four space lengths sending two bits per cell. `stated.test.ts` asserts each of the
three is a shape of its own rather than a patched frame.

#### A cell table code sends one of four or sixteen whole cell shapes per digit

Section 231, and it is the **sixth** row shape. 142 of Logitech's 684 protocol families spell a bit
this way: a value is read a digit at a time and each digit selects a whole cell, out of four for a base
four family and sixteen for a base sixteen one. `cells` on a table row is a lead in, one interval list
per symbol value in value order, and how many bits one cell carries; `pulsesOfCellFrame` emits it most
significant digit first. Every interval is taken exactly as Logitech's definition writes it and nothing
is derived from a duration, which is what makes one reader serve both bases and any further power of
two. A row carrying `cells` carries none of the five durations and no `biphase`, and the shape's own
consistency is asserted: the cell count is two to the power of the cell width, every cell holds at
least one interval, and no interval is zero.

**Which base a family uses is stated by the definition and never by its name.** Logitech's
`EncodingType` is 2 or 3 on exactly these families and the cell count says the same thing, so
`bitsPerDigit` reads it off the count. A **field width** is then in digits rather than bits, and
`frameWidths` multiplies it out, because a reader holding the wrong unit sends part of a command with
nothing to show that it did. A family's name carries neither unit: over the 142 it is the digit count
on 66, the bit count on 4 and neither on 72.

**A zero length interval in a definition is dropped, not emitted.** One family states its header as a
mark and a space of length zero, which is a mark and nothing after it, and an interval of zero would
merge its two neighbours in any renderer that floors a duration at one unit.

139 of these are stated rows in the table. The 140th, `Galaxis 16 Bit Quad Toggle`, stays a measured row
under the `quad` shape, which is the same idea read off a stored train instead of off a definition.
