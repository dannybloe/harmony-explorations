# Families

Every maker of televisions, receivers and set top boxes picked a way of spelling numbers in light, and
many picked several. Each of those ways is a **protocol family**: Sony's twelve bit scheme, NEC's, the
RC-6 that Philips and Microsoft use, and several hundred more. A family fixes the rhythm, how long the
opening flash is, how long a zero and a one last, how many bits there are, and what follows the number.
Two codes of one family differ only in the number they carry.

Logitech's device catalogue names a family for every code it holds and states each family's rhythm, which
is what lets a code stated as "Sony 12 Bit, number 0x910" be turned into light without ever having heard
it. This page is that bridge: how a family is named, how the catalogue writes a code, the rhythm table
that holds every family's rhythm, and what of a whole command a family's rhythm does and does not say.
How the number itself is spelt is [Frames](frames.md); how often a press sends it is [Sending](sending.md).

## A family is named by Logitech's catalogue

**A family is named by Logitech's catalogue, matched on the rhythm their own definition states, and never
by their analyser.**[^s227] Logitech's analysis service, which answers a list of durations with a family
and a number, is a decoder of their own database rather than of infrared: it accepted two rhythms their
compiler does not emit and named both,[^s160] it returned a fifteen bit Sharp code as `Makita 10 Bit` with
ten of its bits,[^s162] and it had named all three of the rhythm table's analyser named entries
wrongly.[^s227] Its family names are also coarser than the catalogue's, and it recognises a rhythm only at
the bit counts on its own list.[^s159]

The lookup key is the carrier, the header and the four durations, matched exactly, with the width from
the definition's keycode field narrowing the 24 rhythms that more than one family holds; 17 rhythms stay
ambiguous after that and keep the name they had, since a guess is worse than an old name.[^s227] A row
records the analyser's name in `heardAs` where the two differ.

**One entry per family, and one carrier per family.** No family arrives at two carriers, Logitech's
definitions stating one each, and the carrier is in the key because a rhythm is only a rhythm at a
frequency.[^s227] The one entry that once seemed to sit at two carriers was two families the analyser
called by one name, `Sharp 48 Bit 2` at 38 kHz and `PanasonicV2 48 Bit` at 36.4 kHz.[^s227]

**`Toshiba 32 Bit` is the NEC rhythm exactly**, a header of 8990 and 4490 and cells of 568, 552 and
1662, and it is the largest family in Logitech's catalogue, more than a third of the distinct codes
measured.[^s160] A `Dual` family is the same rhythm as its sibling, to the microsecond, so the word counts
frames rather than describing durations.[^s160]

**The calibration is what makes a name taken from the catalogue believable**: 34 of the 35 rhythms
measured off configurations are reproduced from Logitech's own definitions field for field and none
disagrees, and 29 of 29 measured blocks rebuild from them.[^s233] The two routes have nothing in common:
one is durations read off configurations Logitech's compiler produced, the other their statement of the
protocol.

## How the catalogue writes a code

**A code is `G:<family>:(<A>)(<B>)(<C>):<n>`, and slots A and B both hold content.**[^s159] Slot C is
empty and the trailing number is 3 in every one of 2921 distinct codes over 5219 commands. A slot holds
items joined by `_`; an item is a **value**, a one digit position prefix and hexadecimal digits, or a
**word** naming a standard frame of the protocol instead of stating it. Seven item sequences occur:[^s159]

| distinct codes | slot A | slot B | families like |
|---|---|---|---|
| 1026 | a value | `Repeat` | Toshiba 32 Bit |
| 936 | empty | a value | Sony 12 Bit |
| 512 | empty | two values | Sharp 15 Bit, Samsung 38 Bit |
| 293 | `Start` | a value | JVC 16 Bit |
| 119 | empty | three values | Philips Hurd 16 Bit LongToggle |
| 28 | empty | `Start`, two values, `Trailer` | MitsubishiO1 Dual 8 16 Bit |
| 7 | a value | a value | Pioneer 32 Bit 2 |

Reading slot B alone refuses every Toshiba code, since it finds the word `Repeat` where it wants a number,
and on a two value code such as `Pioneer 32 Bit 2` it sends the second frame as the whole command, which
parses and sends half of what it should.[^s159] `Repeat` is the protocol's ditto frame, `Start` a lead in
sent once before the payload and `Trailer` a closing frame. **A word is the name of a segment**, and over
the whole catalogue there are fourteen of them, each naming a segment its own family holds on 1158009 of
1158024 occurrences; a word naming no segment of its family is refused.[^s233] The position digit is a
position and nothing further: in order the digits form exactly four runs, `0`, `00`, `01` and `012`, and
what they index is unread.[^s159]

**A value is read at the widths and in the bases its family's definition states, never its name's.**[^s359]
A family's name states one width per value, `Samsung 16 and 20 Bit` a 16 and a 20,[^s159] but the name's
number is the digit count on some families, neither the digit nor the bit count on as many, absent on
others, and right but overflowed by the value on a few, so reading the name refused 52658 catalogue
commands of 156 families.[^s359] The definition reads all but 172, which are not infrared codes (`HID 16
Bit`, `Roku IP`, `Sonos IP`) or are misspelt in the catalogue.[^s359] The base comes from the definition's
cell count,[^s231] and **it is per field**: `Grundig 7 Bit Quad` writes one plain bit and then seven
quaternary digits.[^s233] Read with the base right, the notation reads whole, 2921 of 2921 distinct codes
and 33 of 33 families in a census of 5219 commands: `Galaxis 16 Bit Quad Toggle` writes its digits in
base four, and the width check that refuses all 69 of its codes in hexadecimal accepts all 69 in base
four.[^s159] `Quad` in a family's name is not the base, though: it is nothing at all on `Quad 5 Bit`,
which states two symbols and five bits.[^s231] `statedCodeOfDefinition` is the reader, which the renderer and the catalogue
composer both go through.

**A code's family is the definition its keycode spells, or, where none is spelt so, the one spelt the same
but for letter case and spacing**:[^s361] trimmed, runs of white space made one, case set aside. Five
spellings in the catalogue name no definition, 222 commands (`Ada 40 Bit`, `AudioAnalogue 14 bit`, `DAM 12
Bit`, `toshiba 32 Bit`, `Intellibus 17 Bit ` with a trailing space), and Logitech's own `ProtocolId`, which
every command of their service carries beside its keycode, names the folded match on every one of them and
the exact spelling on every other command carrying a keycode, 13292991 of 13293293 counted per
device.[^s361] The 684 definitions fold to 684 spellings, so a folded spelling never fits two.
`catalogueProtocol` is the lookup.

**A definition's `KeyCode` field states a block's shape whole.**[^s228] It carries three lists, `Start`,
`Repeat` and `Finish`, each naming segments by name and by kind, an infrared segment carrying a payload
or a code segment of literal durations. `Repeat` is one repetition in order, `Start` precedes the first
one, and `Finish` is what a key release sends.

## The rhythm table

**The rhythm table holds one entry per family, 681<!--fact:protocol_entries--> of them**, generated into
`protocols.ts` in `packages/codec/src` and never edited by hand.[^s227][^s231] An entry is a family at its
carrier, the frame in one of the six shapes [Frames](frames.md) describes, and, where known, the whole
first block and the held block.

**`source` says where an entry's durations came from, and it is the field to filter on.** 37<!--fact:protocol_measured-->
entries were measured, most off configurations Logitech's compiler produced for chosen devices and some
off configurations people use; **644<!--fact:protocol_stated--> are `source: 'stated'`, Logitech's own
definitions converted for families no configuration measured holds a record of**.[^s227][^s231] A stated
row carries `codes: 0`, `exact: 0` and `spread: 0`, which are the honest numbers rather than placeholders,
and no `tailExact` and no `heldExact`, since those count the records that rebuilt from the row and there
are none. Anything counting what reproduces a recorded code excludes those rows.[^s227] `exact` is how
many of a measured family's codes the row reproduces to the microsecond, and `spread` the tightest band
covering all of them, now zero on every row.[^t-stated]

**`carriedFirst` says a cell states the half that carries the bit first**: seven stated rows set it, and
only where storing the pair the other way round would change the wire, which is why 30 further families
stating it that way do not.[^s230] No measured row sets it, a decoder reading a stored train as mark and
space pairs by construction.

**33<!--fact:protocol_tails_stated--> of the 644<!--fact:protocol_stated--> stated rows carry a whole block, `tail` and `held`, derived from the
definition rather than measured**, and the others carry a frame and nothing after it, so
`blockOfStatedCode` refuses them.[^s228] The derivation reproduces all 29 blocks measured off Logitech's
compiler to the microsecond, which is why a derived one is believed.[^s228b] What a definition mostly does
not state is **how many times a repetition is sent**: `pressMinimumRepeats` is stated on 39 of the 684
definitions and null on 645, and where it is stated for a measured family it is right on five of
five.[^s228] The table never defaults it, because three would fit 22 of 24 unstated measured families
and that is a fit rather than a derivation;[^s228b] a code of such a family is built at the device's own
count instead, [Sending](sending.md).

**`also` holds a family's other rhythms**, for a family that sends more than one inside a press, below;
four rows carry it.[^s232]

## What follows the frame

**The timings are the device's, not the command's.**[^s152] 52 of 58 device groups measured use one set
of timings for every code they carry, and six use two. Logitech's service states a code as a family and a
number with the durations null, `Raw` null on all 5219 commands of a census,[^s159] so a command fetched
from it can be written using the timings of any code of the same device a configuration already holds,
and the rhythm table serves the rest.

**Nothing after the frame is derived from the frame.** A block repeats the frame 1, 3, 7, 11 or 30
times, the gap between consecutive copies is byte identical in all 3502 records that frame, and what
follows the last copy is 140 distinct shapes, copied rather than computed.[^s152] A block's tail is
copies, literal words and pads sharing one value, measured per family,[^s171] and a tail can hold a second
command.[^s152]

**Two things a derived block does not claim.**[^s228] Its long gaps are chunked greedily into stored
words of at most 32767 microseconds, where Logitech's compiler chunks inconsistently, so it matches on
the wire and not necessarily word for word; and a family whose codes all carry the same number of set
bits cannot show whether its gap is padded or literal, which is why the measured rows keep their measured
blocks.

## Several rhythms in one press

**One family can send more than one rhythm inside one press, and 44 of Logitech's 684 definitions
do.**[^s232] `Classe 16 Bit Toggle` sends a lead in, four mode bits at a 442 microsecond half cell,
**one** bit at 880 and sixteen data bits back at 442, as three segments with three different cells, which
is RC-6's shape. Holding one rhythm per family sent a third of such a command, and refusing those families
had cost 84694 catalogue commands.

`also` on a table row holds the family's other rhythms, and a block's copy item carries `shape`, an index
into that list offset by one because index 0 is the row itself.[^s232] **A copy naming a rhythm the row
does not hold throws rather than falling back on the first**: a fallback would send one segment in
another's rhythm and produce a waveform that looks well formed. 481 of the 504 derivable blocks are one
shape, 14 send two and 9 send three.[^s232]

**A lead in is part of a rhythm's identity for the two shapes that have no bare form.**[^s232] A pulse
timing copy can be emitted bare, by zeroing its header, so a segment differing only in its lead still
takes the route of literal words in front of a bare copy. A biphase or cell table copy has no bare form,
so its own lead has to be its own rhythm.

**A digit's width is per segment.**[^s232] `Motorola 16 Bit Quad Toggle` states eight base four digits,
one plain bit, then seven more base four digits, so one multiplier for the family is wrong for two of its
three segments. **A segment states its own width inside `Payload`**, which is the only place a secondary
segment's width is stated.

**Which of the code's values a copy carries** is the k-th field of that group with that segment, for the
k-th time the group names it, which reduces to counting payloads where every field names one
segment.[^s232] The field order is `sequence` then `token`, and `token` alone is ambiguous on 103 of the
681 definitions that state fields. Three guards are load bearing and each was measured: a position asked
for needs a field of its own, or the payload counter is used instead; the widths repeat where a code
states a whole multiple of them, and a count that is not a whole multiple stays a refusal; and the ceiling
on a frame index is the code's own value count, since a code may state fewer values than the definition
has fields.

## Naming the commands a configuration sends

**A configuration numbers its codes and names none of them, and Logitech's catalogue names them.**[^s229]
Nothing in a configuration says which of a device's ninety codes is volume up: the record carries
durations and the action list carries an index. Logitech's device catalogue states a name beside every
code, and a device group is identified in it by the **numbers its records decode to**, which works
because 104938 distinct numbers cover 2067863 commands.[^s229] Over the configurations measured, 36 of
38 device groups identify, 31 of them on every number they send, and 537 of 598 button bindings get a
command name; on two configurations Logitech compiled for chosen devices every binding does, 70 of 70 and
78 of 78.[^s229b]

The name must be taken from the identified device's **own** codeset and never from the catalogue at
large, since a number alone is held by several manufacturers.[^s229] And the identification's margin is
part of its answer: the catalogue holds ranges of near identical codesets, so a device matching 108 of
108 often has a runner up at 105, and the honest answer is a model range.[^s229] `catalogue.ts` in
`packages/codec/src` is the reader, and anything derived from Logitech's data stays on the machine that
read it.[^d11]

[^s227]: Stated by Logitech, in their catalogue. [Section 227](../../docs/findings.md#s227)
[^s160]: Measured in configurations. [Section 160](../../docs/findings.md#s160)
[^s162]: Measured in configurations. [Section 162](../../docs/findings.md#s162)
[^s159]: Stated by Logitech, by their service. [Section 159](../../docs/findings.md#s159)
[^s233]: Stated by Logitech, in their catalogue. [Section 233](../../docs/findings.md#s233)
[^s359]: Stated by Logitech, in their catalogue. [Section 359](../../docs/findings.md#s359)
[^s231]: Stated by Logitech, in their catalogue. [Section 231](../../docs/findings.md#s231)
[^s361]: Stated by Logitech, in their catalogue. [Section 361](../../docs/findings.md#s361)
[^s228]: Stated by Logitech, in their catalogue. [Section 228](../../docs/findings.md#s228)
[^t-stated]: Measured in configurations. [The test](../../packages/codec/test/stated.test.ts)
[^s230]: Stated by Logitech, in their catalogue. [Section 230](../../docs/findings.md#s230)
[^s228b]: Measured in configurations. [Section 228](../../docs/findings.md#s228)
[^s232]: Stated by Logitech, in their catalogue. [Section 232](../../docs/findings.md#s232)
[^s152]: Measured in configurations. [Section 152](../../docs/findings.md#s152)
[^s171]: Measured in configurations. [Section 171](../../docs/findings.md#s171)
[^s229]: Stated by Logitech, in their catalogue. [Section 229](../../docs/findings.md#s229)
[^s229b]: Measured in configurations. [Section 229](../../docs/findings.md#s229)
[^d11]: Chosen by this project. [Decision 11](../../docs/decisions.md#d11)
