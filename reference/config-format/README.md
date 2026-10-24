# The Harmony config format

Living specification. This is the deliverable other tools consume, so it is kept separate
from the narrative in [findings.md](../../docs/findings.md). Anything stated here is confirmed against at
least two independent samples unless marked otherwise.

Work is focused on architectures 12 (Harmony One) and 14 (Harmony 600, 700), because those are
the remotes on the bench. Architectures 8 and 9 appear here as controls: they are what shows
whether a claim is about the format or only about those two models.

**It is one container across architectures, not one per architecture.** Each architecture has
its own four letter cookie, and the header shape behind it is the same. The 525's
`0xFEED`/`0xBEEF` framing appears inside this one, but at **section slot 0 only**, not once
per section. See [findings.md](../../docs/findings.md) for the correction that replaced.

```
container header               absolute pointer table
  section 0   FEED ... BEEF    exactly one frame per container, always slot 0
  section 1                    seven bytes, states the architecture
  ...                          remaining sections, unframed, mostly unlabelled
u16 checksum + end marker
```

## Pages

* [The container](container.md): header, cookies, the section table, the checksum, pointer arrays.
* [The EZHex wrapper](ezhex.md).
* [Header records](header-records.md): base slots 0, 1 and 3.
* [Modes and keys](modes-and-keys.md): base slots 6, 8, 9 and 17, tagged lists, the key table.
* [Activities and devices](activities-and-devices.md).
* [Actions](actions.md): base slot 10 and the action list language.
* [State](state.md): base slots 2, 4, 12, 13, 14, 15 and 16.
* [Screens](screens.md): the screen language, pictures, fonts, text.
* [Infrared records](infrared-records.md): base slot 5.
* [Layout](layout.md): how Logitech's compiler places a container.
* [Relocation](relocation.md): what growing a section moves.

## Sections

**Every one of the twenty base slots is now accounted for.** Slots 0 and 1 are the header records,
slots 2 to 17 are sixteen named sections, and 18 and 19 are NULL in every sample.

The method that named them is described in
[../../todo.md](../../todo.md) step 6: the firmware copies each config pointer into a per-subsystem RAM
variable, so finding the consumer of that variable labels the section by function. The infrared
section was identified exactly this way, and every slot from 2 to 19 now has a located consumer.

A prior worth having, from the person who designed the format, in harmony-decompiler discussion
number 1: the table "is probably pointing to data for each of the various subsystems (IR
sending, state variables, menus, action lists etc)". That is a hint about what to expect, not
evidence about which slot is which.

**Slot numbers below are base layout slots.** The pointer table is one table across
architectures with per architecture insertions, so a slot number only means something once it is
said which layout it belongs to. See "One table, four architectures" further down; arch 9 and
arch 14 use the base layout directly.

**The evidence column names a population, and every population is defined in exactly one place**,
`tests/lab.py`. There are three, and the difference between them is a difference in the question:

* `ALL_CONTAINERS`, 21, every container a **per container** claim is made over.
* `CONTAINERS`, 19, the narrower population a corpus wide **total** is computed from. It leaves the
  two arch 8 (Harmony 880 and 885) configs out because adding them moves every coverage figure in one
  commit. **It does include the Harmony One sync pair**, and this entry said 15 and gave excluding
  that pair as the reason until 29 August 2026. Both halves were wrong, and the reason was a
  paraphrase of a claim `docs/superseded.md` already carries: a config before a sync and the
  same remote's config after one are two containers, because the bytes differ, and a total over
  containers is not a headcount of remotes. This paragraph exists to stop exactly this drift, which
  is the part worth recording.
* `USER_CONFIGS`, 15, every config a remote was actually programmed with.

Where a row says "user configs" the count carries a marker `make facts` recomputes, because a count in
prose is exactly what drifted here. This column said "ten configs" in eight rows and "thirteen
containers" in three while the lab held fifteen of each, section 140, and then said "nine configs" or
"sixteen samples" or "twelve containers" in seven more, each of them a list written by hand inside one
test, section 141. Every row now states the population its test walks, and where a row is short of 21
it says which containers are missing and why, because an excluded sample is a claim too.

Known so far:

| Slot | Meaning | Evidence |
|---|---|---|
| 0 | the one `0xFEED` frame, holding a list of named nodes by level and index | 19 of 21 containers: the two arch 12 image containers carry none, below |
| 1 | seven byte record stating the architecture | 21 containers, below |
| 5, 7, 10, 11, 12, 15 | count prefixed arrays of three byte flash pointers | the 15 containers where all six carry an entry, below |
| 5 | of those, the **infrared database**, grouped | 15<!--fact:user_configs--> user configs, four architectures, below |
| 10 | of those, the **action list address table** | 15<!--fact:user_configs--> user configs, below |
| 4 | the **firmware event map**: thirty events, each named in the space `0x7E` indexes | 15<!--fact:user_configs--> user configs, four architectures, below |
| 3 | the build timestamp, and the firmware **starts Timer 1 from it**, so it is the clock | 21 containers, three images, below |
| 6 | the **mode table**: what `0x7E` and the event map both index | 15<!--fact:user_configs--> user configs, four architectures, below |
| 15 | the **parameter block**: numbered groups of 16 bit constants, every length demanded | 15 containers, two images, below |
| 13 | the **state variable table**, named from its firmware consumer | 15<!--fact:user_configs--> user configs, four architectures, below |
| 8 | **key press bindings**: records of `{ tag; operand; opcode }`, tag a press code | 18 of 21 containers: the arch 14 safe mode ones bind nothing, below |
| 7 | a pointer array **indexed by opcode 16 of the screen language** | 21 containers, three images, below |
| 9 | the **binding table**: six to seventeen lists of button bindings, pushed onto a key lookup stack by their enter handler and removed by their leave handler | 15<!--fact:user_configs--> user configs, four architectures, below |
| 11 | the **screen program table**: programs in the screen language | 15<!--fact:user_configs--> user configs, four architectures, below |
| 14 | the **state value map**: what a state variable's value means, indexed by `0x72` | 15<!--fact:user_configs--> user configs, four architectures, below |
| 16 | the **number sender**: how to transmit a value one decimal digit at a time | three images; empty in every found config, populated by seven made ones, below |
| 12 | the **timer table**: wait, then queue one instruction | 15<!--fact:user_configs--> user configs, four architectures, below |
| 17 | the **touch screen hit map**, populated on arch 12 only | two configs, one image, below |
| 2 | the **log area**: a region of flash the firmware appends to and never erases | 21 containers, one image, below |
| 18, 19 | NULL in every sample of every architecture | 21 containers |

**Every slot from 2 to 19 has a located firmware consumer**, on the Harmony 700, the 600 and the
One. See [findings.md](../../docs/findings.md) sections 35 and 38 for the addresses. On arch 12 the firmware
seeks every raw slot from 2 to 19 **except raw slot 8**, which is the NULL that architecture
inserts, and it does seek raw slot 18, which is the section it has and the base layout does not. So
the alignment rule below is how the firmware itself addresses the table.

**The distance from one pointer to the next is an upper bound on a section's size, not its size.**
Base slot 4 holds 125 bytes and the gap to slot 5 is between 419 and 1532 bytes, because slot 5's
infrared group arrays are laid out in that space. A section's own data can end long before the next
pointer, with another section's sub-structures filling the rest, so a large gap is not evidence of
a large section. See section 36.

#### The rest of the inventory, not established

Arch 14's most common opcodes include `0x6C`, which never appears in the arch 9 sample, so an opcode
table derived from the 525 does not cover the remotes on the bench.

| Opcode | 700 uses | distinct operands | operand range | reading |
|---|---|---|---|---|
| `0x7A` | 2875 | 10 | 0 to 65277 | unknown, and only ten distinct operands in 2875 uses |
| `0x6C` | 2832 | 472 | 0 to 32788 | **write a device record**, arch 14 only, above |
| `0x7C` | 7272 | 600 | 1 to 1380 | **a per device delay in tenths of a second**, `{ u8 group; u8 value }`, above |
| `0x7F` | 2795 | 1576 | 52 to 7655 | **action list index**, above |
| `0x1F` | 1215 | 121 | 59392 to 65290 | **a register machine**, band by band, above |
| `0x7E` | 861 | 268 | 0 to 373 | **enter the mode** at this index in base slot 6, above |
| `0x7D` | 372 | 350 | 0 to 1361 | **send an infrared code**, `{ u8 group; u8 index }`, below |
| `0x07` | 230 | 8 | 65522 to 65535 | **thirteen operations with no argument**, above |
| `0x71` | 708 | 73 | 9 to 33598 | unknown, but the operand splits: bit 15 a flag, high byte a group 0 to 5, low byte always under 64 |

**Corrected here:** the paragraph below was written when `0x7E` was measured and unplaced, and it is
kept because its measurements are still the record of what the operand statistics could and could
not see. `0x7E` **is** placed, in [findings.md](../../docs/findings.md) section 37: it enters the base slot 6
mode its operand indexes. Read the paragraph as an account of why counting operands was not enough,
not as an open question. Its last sentence is the one that mattered: the maximum tracked nothing
countable in the config, because nobody had counted the mode table yet.

Its values are
dense over roughly 40 to the maximum with the bottom of the range mostly unused, and the maximum
tracks nothing countable in the config: 373 against 354 binding records and 350 infrared records on
the 700, 267 against 268 and 328 on the One. It is not an index into any of the six pointer arrays,
whose lengths are either far too small or far too large. It spreads across every list shape rather
than belonging to one, unlike `0x7D`. In `{0x7F, 0x7E}` each value goes with exactly one call target
in 138 of 139 cases on the 700, and sorting those pairs by target leaves the `0x7E` value non
decreasing about 90% of the time on all three architectures that use that shape, which says the two
are ordered by something shared rather than that one indexes the other.

One structural remark that holds whatever the meanings turn out to be. **Several opcodes carry bit
15 as a flag**: `0x6C` tops out at `0x8014` and `0x71` at `0x833E` on the 700 against `0x8336` on
the 600, which is the shape of an index with a marker rather than a range. Across the corpus that
middle region, `0x8000` to `0xBFFF`, holds only four opcodes and 1716 instructions, and it is
distinct from the `0xC000` band above it.

**Corrected here.** This paragraph used to say `0x07` and `0x1F` never carry a value below
`0xE800`. The floor is `0xC000`, it applies to four opcodes rather than two, and it is a boundary
rather than the smallest value observed. See the subsection above.

### Arch 8 and arch 12 share a code ordering, because they share the hash

47 `(event, scan)` pairs appear in both the One's table and the arch 8 table, and on that shared
subset the two list them in the **same order**, with exactly one adjacent transposition: the One
has scan 6 with no event bits, then press of scan 14, then scan 7 with no event bits, where arch 8
has the two no-event codes together. Drop press of scan 14 and the sequences are identical. Pinned
in `tests/test_gspm.py`, and unaffected by the corrected reading, which is worth noting because
the finding was originally derived under the wrong one. **Section 315 explains it**: both lists sit in
128 buckets of the same hash, and the transposition is a tie, scan 7 with no event bits and the press
of scan 14 both falling in bucket 7.

Codes unique to each, which is presumably the physical difference between the two remotes:

| Only on the One | Only on arch 8 |
|---|---|
| `0x84` `0x89` `0x93` `0x9C` `0x9E` `0xA7` `0xAF` `0xB1` | `0xA9` `0xB6` `0xB8` `0xB9` `0xBA` `0xBB` `0xBD` `0xBE` `0xBF` |

> **Corrected by section 315.** This said the ordering "looks like Logitech's canonical key
> order"<!--superseded--> and that a button identified on one remote would therefore carry to the others. The order
> is the hash's, so it says nothing about which button a code is. Upstream's arch 8 against arch 9
> agreement, 41 codes of 51 in order, is untested here, and the one arch 9 list a reviewer measured,
> the Harmony 525's safe mode list, does not follow the hash.

### The arch 14 table does describe that remote's keypad, after all

**Resolved.** This document used to say the 600's table could not be its physical key matrix,
because 108 codes cannot describe 56 positions. Both halves of that were artefacts of the wrong
bit split. Under the corrected reading the 600's table is 54 scan codes times 3 event types, and
54 scan codes describe 54 physical keys on a keypad the firmware scans as a 1 to 56 linear index.
The count works out exactly, with nothing left over.

So no translation layer between the scanner's index and the config's codes needs to exist, which
was the open question here. The scanner's index **is** the config's scan code.

### Arch 9 binds its keys in the mode records, and its keypad is 8 by 8

A mode record's entries have the same four byte layout as a key record, so the bound scan codes are
extractable even where no table sits at the marker. Taking every entry whose event bits are `0x80`:

| Sample | distinct press codes | highest |
|---|---|---|
| 525 user config, arch 9 | 50 | 57 |
| 525 second user config, arch 9 | 50 | 57 |
| 525 safe mode container, arch 9 | 46 | 57 |

The two user configs bind **the same fifty codes** and the safe mode container's forty six are a
subset. The arch 9 scanner produces `group * 8 + column` with both running 1 to 8, so a code runs 1
to 64; not one bound code in any of the three containers is a multiple of eight, so that column
binds nothing, and within the resulting lattice of eight groups of seven the fifty are contiguous
from 1 to 57. That implies fifty matrix buttons on a Harmony 525, **confirmed on the physical remote
on 9 August 2026**, its owner counting fifty. So every matrix button is bound and every bound code
has a button, with nothing left over on either side. See [findings.md](../../docs/findings.md) section 89 for
the firmware side.

### The key table is not the button to action map

Whatever binds a key to an action, it is not this table. Two configs of the same Harmony 700 whose
owner recorded reassigning three buttons between them carry a byte identical key table, all 163
records. See [findings.md](../../docs/findings.md) section 16.

That left the table looking like a description of the remote's own keypad and event capability.

> **Answered by section 311**: it is mode 0's own tagged list, the `u16` an instruction's operand and
> the byte called flags its opcode, which is the reading at the top of this part.

## What is known, by base slot

*Moved out of `CLAUDE.md` on 29 August 2026: a per slot summary belongs beside the structured spec a tool reads.*

Twenty base slots, all accounted for. 0 and 1 are header records, 2 to 17 are named sections, 18
and 19 are NULL in all 21 containers. `gspm.base_slot` and `gspm.arch_slot` translate, since
arch 8 inserts a NULL at slot 8 and arch 12 inserts that plus a real section at slot 18.

| slot | what it is | sections |
|---|---|---|
| 0 | a `0xFEED` framed tree of state variable names, which say what each variable is for and which device it belongs to | 20, 77, 86, 126 |
| 1 | seven bytes stating the architecture, the only place the config says it | 20 |
| 2 | the log area: three numbers reserving flash above the config, arch 12 only writer | 47 |
| 3 | the clock. Starts Timer 1; on arch 12 the epoch the firmware measures elapsed time from | 21, 38, 111, 138 |
| 4 | the firmware event map | 36, 39 |
| 5 | the infrared database: one group per device, then records. Class 5 spells a code from a dictionary; a record's three block pointers are once, held and tail, and their copy ratio is how many times a press sends the code | 32, 42, 61, 65, 82, 86, 126, 127, 258 |
| 6 | the mode table. A record carries a screen program, and its entry an array of pages, each with a tagged list and a copy of it | 37, 52, 53, 66, 68, 69 |
| 7 | the font table, indexed by screen opcode 16. A glyph code is per config, and the text reads back from the pixels | 46, 63, 112 |
| 8 | key press bindings: one leading action list, then every mode page's list | 27, 38, 83 |
| 9 | the binding table: lists of button bindings, pushed onto a key lookup stack by their enter handler and removed by their leave handler, section 176 | 39, 67, 69, 176 |
| 10 | the action list table | 38 |
| 11 | screen language programs | 40 |
| 12 | the timer table | 43 |
| 13 | the state variable table: a range, and transitions carrying one instruction. Variables 0 to 17 are the firmware's own on arch 8, 12 and 14 and 0 to 12 on arch 9, and 0 to 6 **are** its clock | 35, 60, 86, 130, 138, 284 |
| 14 | the state value map, indexed by opcode `0x72`'s high byte | 39 |
| 15 | the parameter block: numbered groups of `u16` | 44 |
| 16 | the number sender: one record per appliance that takes a number, with a table per digit. Seven made configs populate it and no found one does, and it carries only the channels that survive being written as an integer | 39, 154, 156, 165 |
| 17 | the touch screen hit map on arch 12, indexed by a mode page's spare byte; elsewhere the picture bank | 45, 62, 125 |

**Most of a config is pictures**, sections 49 to 55, 62, 66, 146 and 179: one contiguous array from the
end of the named content to the trailer, no table and no count, addressed by screen opcodes 2 **and 3**
inside mode programs. `u8 kind; u16 stride; u16 rows`, stride in **pixels**, two bytes a pixel on arch
8, 12 and 14 and one bit on arch 9. Walking the array lands exactly on the trailer in all nine
containers that have one, and **every picture in every bank is drawn by a program**, on all four
architectures, with two exceptions in the whole corpus and both in the arch 9 safe mode container.
That used to read "addressed only by screen opcode 2" with "exactly two per container unreached on<!--superseded-->
arch 8 and arch 14", and the two were opcode 3's: 4548 of 4548 of its instructions name a picture,
arch 12 (Harmony One) emits none at all and arch 9 (Harmony 525) emits nothing else, so a reader
written from opcode 2 looked complete on the architecture this project reads code on and reported
zero pictures for a Harmony 525 whose bank holds four.

**Two interpreters, both read.** The action list language, a 120 byte circular queue of three byte
instructions dispatched by binary search on the opcode, section 34. And the screen language, one
byte opcodes, section 40, whose closure is that 22846<!--fact:screen_programs--> programs across the
corpus decode with nothing left over.

**And the queue is writable because the language has an if/else**, section 140, which is the one
thing about the action list interpreter that had never been explained. Bit 15 of a `0x70` or `0x71`
comparison is the **else** arm: with it set, a comparison that comes out **true** zeroes the three
bytes two slots ahead, and opcode `0x00` does nothing, so the two instructions after a flagged
comparison are its two arms and the untaken one is overwritten rather than jumped over. It has to be
overwritten, because the handler returns before either arm runs. Section 34 saw the bit and wrote
"the dispatcher masks it off"<!--superseded-->, which was true of the nibble decode and read as
though nothing consumed it. The corpus closure is exact both ways, 600<!--fact:compare_else_arms-->
flagged instructions each followed by exactly two instructions and
2084<!--fact:compare_one_arm--> unflagged each by exactly one, with the list ending there, no list
holding two conditionals and no arm being one. **It is one table across architectures**, measured on
all seven images rather than ported, which matters because three structures in this language are not.
