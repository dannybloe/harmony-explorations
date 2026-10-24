# Infrared records

A remote sends a command by blinking an infrared lamp in a precise rhythm. A configuration stores every
command it can send as a **record**: the rhythm written out as a list of on and off times in microseconds,
the frequency the lamp flickers at while it is on, and up to three such lists for one key, what a tap sends,
what repeats while the key is held, and what follows at the end. The records of one device sit together in
one **infrared group**, and the configuration's action lists name a command by its group and its place in
that group.

This page says how the records sit in the file: where they are, what a record's header holds, how its time
lists are stored and shared, and what a writer must not break. What the light itself does, how a code's bits
become marks and spaces, which protocol families exist and how many times a press sends a code, is the
[infrared](../infrared/README.md) part of this reference: [frames](../infrared/frames.md),
[families](../infrared/families.md) and [sending](../infrared/sending.md).

Three words are used precisely below. An **infrared group** is one device's list of records. A **pointer
group** is three addresses inside one record, naming its blocks. A **block** is one stored list of
durations.

## Base slot 5, the infrared database

Two levels of pointer array over the records, confirmed on 15<!--fact:user_configs--> user configurations
across four architectures[^s32][^s61]:

```
base slot 5:  u8  count
              u24 group_address[count]

per group:    u8  zero            the same spare byte the section table carries
              u16 count
              u24 record_address[count]
```

* **An infrared group is a device.** Base slot 0's names tie a device's label to exactly one infrared group
  through base slot 13's state variable transitions[^s86][^s126].
* **The number of groups is the number of distinct high bytes a `0x7C` operand takes**, in every user
  configuration, and the group indices run contiguously from zero: from 1 group in a Harmony One with nothing
  programmed to 7 in a Harmony 880[^s32]. So the high byte of a `0x7C` operand is the infrared group,
  [actions](actions.md).
* **The arrays are regular**: over 63<!--fact:ir_groups--> groups and 4147<!--fact:ir_references--> record
  pointers the lead byte is zero every time, each group is exactly `3 + 3 * count` bytes, the groups are
  packed one after the other, every record pointer lands inside the container, and none of them is an action
  list address[^s32].
* **A record pointer lands seven bytes into its record**, on the class byte, and not on the record's first
  byte[^s42b].

## A record

```
+0x00  u8   zero, read by nothing found
+0x01  u24  carrier period, nanoseconds
+0x04  u24  carrier on time, nanoseconds, the period halved
+0x07  u8   class                     a record pointer lands here
+0x08  u24  the record's own start
+0x0B  u8   count of pointer groups
+0x0C  group[count], each { u24 block; u24 block; u24 block }, a pointer NULL where it names nothing
```

The header is `12 + 9 * count` bytes: 21 for one pointer group, 30 for two[^s75]. The byte at `+0x00` is zero
in every class 1 record counted, 3387 of them, and nothing has been found that reads it[^s92].

**A record states its own address**, so it can be found with no pointer at all. The `u24` at `+0x08` is the
record's own start, a twenty four bit exact match, and with the class byte before it and the group count
after it as a shape filter, a search for that closure finds exactly the records base slot 5 names: 3925 of
3925 over the 13 containers that have an infrared table, none missed and none extra[^s181]. The shape filter
is needed: a plain table of ascending pointers crosses `value == base + offset` again and again, 125 times in
one Harmony 890 configuration and 198 times in a Harmony 895, and none of those positions is record
shaped[^s181]. The search is how the records are read on the
[Harmony 890 and 895](../architectures/harmony-890-895/memory.md), whose slot map is otherwise unsettled.
`irRecordsByClosure` in `packages/codec/src/ir.ts` is the reader.

### The carrier

The two `u24` values below the class byte are the infrared **carrier**, the frequency the lamp flickers at
while a mark is sent[^s92]:

* the period is stored as `floor(1e9 / f)` nanoseconds for a frequency in whole hundreds of hertz, so 40 kHz
  is 25000 exactly, 38 kHz is 26315 and 36 kHz is 27777, which reads back as 36001 Hz. **Truncated, not
  rounded**[^s92];
* the on time is the period halved, in every record, which is a fifty percent duty cycle[^s92];
* the firmware clamps the period at 256000 and switches the timer's prescaler when the period no longer fits
  in sixteen bits, read on the Harmony 700's image[^s92b];
* the carrier is **per record**, not per configuration and not per device: one Harmony One configuration holds
  56.3 kHz and 38 kHz records inside a single infrared group[^s92].

### The blocks sit below the header

A block is a run of `u16` durations: bit 15 set is a mark, the lamp flickering, and clear is a space, the lamp
dark; bits 14 to 0 are microseconds, so one word holds at most 32767 microseconds and a longer gap is split
across several words. A word reading zero closes the block[^s61].

```
per block:    u16 duration[]      bit 15 set is a mark, bits 14..0 are microseconds,
                                  closed by a word reading zero
```

**A record's blocks sit in front of its header, not after it**, so the header is the last thing in a record's
run and a record is not one contiguous span starting at its header. Reading forwards from a header reads the
next record's durations. A typical Harmony One record that does not toggle is a 620 byte block, a 208 byte
block and its 21 byte header, in that order[^s61].

**The zero word is a length, not a validity check.** The headers and the blocks tile the record area with no
gap, so the distance from a block to the next boundary is a second measurement of its length, and the two
agree exactly on all 4692 class 1 blocks of thirteen configurations[^s141]. But on the Harmony 525, whose
records are class 5 below, every one of its 380 blocks also finds a zero word and not one finds it in the
right place[^s61][^s139]. What tells a block this reading covers from one it does not is the class byte.

**Blocks are shared.** A record may be a bare header whose pointers name blocks another record also names, so
one stored rhythm can serve several commands[^s61]. [Relocation](relocation.md) counts how many there are.

### Once, held and tail

The three pointers of a pointer group are three parts of one key press. At the end of every block the
firmware samples the keypad and steps to the next pointer accordingly, read in the record streamer on the
Harmony 600, 700 and One images[^s127]:

| at the end of | key up | key down |
|---|---|---|
| slot 0 | advance two, so slot 1 is skipped | advance one |
| slot 1 | advance one | advance **zero**, so slot 1 plays again |
| slot 2 | stop | stop |

So slot 0, **once**, is what a tap sends; slot 1, **held**, plays only while the key is still down and then
repeats for as long as it is; slot 2, **tail**, plays at the end either way. A NULL pointer reads as a
finished block, so a group with no held block falls through[^s127]. On a Harmony One one sense line says that
some key is down, where the Harmony 600 and 700 test four[^s127], and a held touch on the One's screen
repeats its code as a held key does[^s337].

Four shapes occur, over 3703 pointer groups, and slot 0 is never NULL[^s127b][^s141]:

| shape | groups |
|---|---|
| `B00`, once only | 1699 |
| `BB0`, once plus held | 1541 |
| `B0B`, once plus tail | 368 |
| `BBB`, all three | 95, all in four Harmony 880 configurations |

**The interval between two sends of a held key is the held block's own duration**, since the firmware replays
the whole block before it looks at the keypad again: 30.8 ms to 752 ms across the corpus, most between 60 and
120 ms[^s127b]. That is what a person feels as the repeat rate, and `irRepeatPeriod` returns it.

**A command named Power has its family's held block** like any other command: all twenty Power commands of
seven devices Logitech compiled for a Harmony 650, and an LG television's power toggle compiled for a Harmony
One[^s338]. A power **step**, the record a power action list sends, is a different record and has no held
block[^s309]. Whether every command of a family with a held block carries one is not settled: three
PlayStation 3 records with a lead in and no held block are unexplained[^s338].

### Two pointer groups: a toggling code

Some infrared codes carry a **toggle bit**, a bit the sender flips on every new press so that a device can
tell a second press from a key held down, [frames](../infrared/frames.md). A configuration cannot compute a
flipped bit, since the action list language has no arithmetic that reaches a duration[^s134], so it stores the
code twice.

* **A record of a code that does not toggle has one pointer group**, and **a record of a toggling code has
  two**, on every architecture whose configurations hold one: 572 distinct records on the Harmony One, 253 on
  the Harmony 650 and 700, 130 on the Harmony 350 and 36 on the Harmony 880, every record matched to a
  toggling code of Logitech's catalogue over 153 configurations[^s365]. The Harmony 600's configurations hold
  no toggling code[^s365].
* **The count therefore follows the devices, not the architecture**: 37 records in each of four Harmony 880
  configurations that drive the same media centre device, and none in two that do not[^s134]. On the
  Harmony 525 it is 61 of one configuration's 200 records and all 107 of the other's, toggling codes of
  Logitech's `Magnavox 13 Bit` and `Microsoft 30 Bit` families[^s139][^s365].
* **The first group is the code as the catalogue states it, and the second is the same code with its toggle
  bit flipped**, in its first and held blocks[^s365]. Checked on 23 records whose code states the bit set:
  every first group holds it set and every second clear[^s365]. In a biphase code that flip exchanges a mark
  and a space of equal length, so block `i` of the second group differs from block `i` of the first in
  exactly two adjacent words, at a fixed place in the frame, on every pair of the Harmony 880's records, whose
  pulses read as a biphase code with RC6's mode 6 leader at 36.2 kHz and which Logitech's catalogue calls
  `Microsoft 30 Bit`[^s134][^s365].
* A record that sends nothing else in a sequence, the one block copy, keeps both groups, each group its
  record's first block less the opening silence[^s349][^s365].

#### Which group a send plays

Read on the Harmony 650's 0.2 image and the Harmony One's 3.4[^s365b]:

* the firmware keeps a sixteen bit word with **one bit per infrared group**, and a send reaching a record
  flips the bit of its group, `1 << (tag & 0x0F)`, the tag's low nibble being the group. So the bit is the
  device's and not the command's: every send to that group flips it, a record with one pointer group included.
  On the Harmony 600 and 650 a tag with bit 4 or 5 set returns before the flip, and what those bits mean is not
  read;
* the record start reads the count and skips pointer groups of nine bytes, **one fewer when the count is 2 and
  that bit is set** after the flip, so a set bit plays the first group and a clear one the second;
* the Harmony 650 clears the word when its infrared starts up, so the first send after that plays the first
  group, the code as stated, and the next the second.

The same flip is found on the Harmony 600's 0.2, the Harmony 700's 2.8, the Harmony 650's 0.4 and the
Harmony 350's 1.4, whose skip is not read there[^s365b]. The Harmony 525's image has not been searched for
it[^unchecked].

#### A release sits in the tail

**When a code has a release, a part sent once as the key comes up, it is the tail**, the third pointer, a block
of its own[^s365]: `Logitech 24 Bit`'s Stop, the PlayStation 3's, on the Harmony One, the Harmony 650 and
700 and one Harmony 880 configuration, and `Microsoft 36 Bit`'s release on four Harmony 880
configurations[^s365]. A tail is spelt without the trailing microsecond every once and held block
ends on, [sending](../infrared/sending.md)[^s365].

## Classes

The byte at `+0x07` names how the blocks encode a code. The firmware of the Harmony One, 600 and 700
dispatches on classes 1 to 4 at three sites, send, stop and the record loader, and every record in their
configurations, and in the Harmony 880's, is class 1; every record of the Harmony 525 is class 5[^s42][^s42b].
No configuration mixes classes[^s42b]. Classes 2 to 4 are used by no configuration measured[^s42b].

### Class 1: the durations are the rhythm

A class 1 block is the rhythm itself, mark and space after mark and space, and bit 15 alternates strictly
along it. A once block commonly holds the code, a gap, the protocol's own repeat frame and a long silence, so a
block is more than one transmission and every class 1 record measured has a gap somewhere other than at its
end[^s139]. Some records open with a run of `0x7FFF` words of varying length, so a reader locates the frame
rather than assuming an offset[^s32]. How the frame decodes into bits is [frames](../infrared/frames.md),
read with `irFrame` in `packages/codec/src/irframe.ts`, the one frame decoder here.

**The decoded bit count closes against the header's timings**, two quantities from opposite ends of a record,
over all fifteen user configurations[^s139]:

| header mark / space, microseconds | which is | records | bits decoded |
|---|---|---|---|
| 8900 to 9100 / 4400 to 4600 | NEC | 1567 | 32, every one |
| 3350 to 3520 / 1650 to 1760 | Kaseikyo | 670 | 48, every one |

The bands are ranges because the corpus holds several calibrations of each: NEC as 8990/4490 and 9000/4500,
Kaseikyo as 3364/1682, 3460/1730 and 3480/1730[^s32].

### Class 5: a code spelled from a dictionary

Class 5 is the infrared encoding of [the Harmony 5xx platform](../architectures/harmony-5xx/README.md): every
record of both Harmony 525 configurations is class 5, 200 in one and 107 in the other[^s82]. **The header is the
same structure as class 1's**: on every one of those records the class byte at `+0x07`, the record's own start
at `+0x08`, every block pointer pointing backwards and staying inside the area, and no two headers
overlapping[^s65]. 61 of the 200 and 107 of the 107 carry two pointer groups, so the header's length is read
rather than assumed[^s139]. The whole infrared area, from the lowest block pointer to the end of the highest
header, lands exactly on the boundaries of the largest region the byte accounting could not otherwise
attribute[^s65].

**Behind the header, a class 5 pointer names a body that spells the code as indices into a shared table of
short pulse blocks**, and every field width below is a literal in the firmware that reads it[^s82b]:

```
per body:     u24 table           the symbol table's address
              u16 n               bytes of index stream
              u8  index[n]        zero based into that table

per table:    u8  count
              u24 symbol[count]   packed immediately above the last of its own blocks

per symbol:   u16 count
              u16 pulse[count]    bit 15 set is a mark, bits 14..0 are microseconds
              u16 0x0000          present in all 50 blocks, and read by nothing
```

A body is `5 + n` bytes, a table `1 + 3 * count`, a symbol block `4 + 2 * count`. The pulse words are class
1's, so one body expands to an ordinary duration run; the tables hold a symbol per bit value plus one each for
the header, the trailing mark, the gaps and the repeat frame[^s82]. The configuration of 200 records holds 5
symbol tables[^s82].

**All three levels are shared, harder than anywhere else in the format**: two records name one body, up to 206
bodies name one symbol table, and a symbol block is reused by every code with that pulse pair in it[^s82].

## For a writer

Each of these is a way to write a configuration that the remote accepts and that sends the wrong thing.

* **A block cannot be edited in place without checking who else names it**, since blocks are shared[^s61], and
  on class 5 bodies, symbol tables and symbols are all shared[^s82].
* **The repeat rate of a held key is the held block's trailing gap**, per code. A duration word carries at most
  32767 microseconds, so a gap already spelled over three words can be raised to 98301 microseconds without
  changing the block's length, and anything slower lengthens the block, which moves everything above it,
  [relocation](relocation.md)[^s127b].
* **How many times a press sends the code is the ratio of the first two blocks**, so changing it adds or removes
  a whole copy and its gap: a length change, not a same length edit. Reading the first block's copies alone is
  wrong for a family that sends two code words per repetition. [Sending](../infrared/sending.md) has the
  rule[^s258].
* **A carrier is written truncated**: a writer that rounds writes 27778 for 36 kHz where Logitech writes 27777,
  one byte per record different[^s92].
* **A toggling code needs both pointer groups**, the code as stated first; written with one, every second press
  sends the same bit[^s365].
* **The `+0x00` byte is carried, not written as zero**: it is constant across the corpus and read by nothing
  found, so asserting a value would turn a configuration that differs into a wrong round trip instead of a
  loud one[^s92].
* **A frame can be rebuilt from five durations off a record of the same device, and what follows the frame
  cannot simply be copied** from a sibling code, [families](../infrared/families.md)[^s152].

## Not settled

* What the byte at `+0x00` selects[^s92].
* What calls the Harmony 650's clear of the toggle word, and where the Harmony One clears its own[^s365b].
* What bits 4 and 5 of a send's tag mean to the Harmony 600 and 650[^s365b].
* Why three PlayStation 3 records with a lead in carry no held block[^s338].

[^s32]: Measured in configurations. [Section 32](../../docs/findings.md#s32)
[^s61]: Measured in configurations. [Section 61](../../docs/findings.md#s61)
[^s86]: Measured in configurations. [Section 86](../../docs/findings.md#s86)
[^s126]: Measured in configurations. [Section 126](../../docs/findings.md#s126)
[^s42b]: Measured in configurations. [Section 42](../../docs/findings.md#s42)
[^s75]: Measured in configurations. [Section 75](../../docs/findings.md#s75)
[^s92]: Measured in configurations. [Section 92](../../docs/findings.md#s92)
[^s181]: Measured in configurations. [Section 181](../../docs/findings.md#s181)
[^s92b]: Read in the firmware. [Section 92](../../docs/findings.md#s92)
[^s141]: Measured in configurations. [Section 141](../../docs/findings.md#s141)
[^s139]: Measured in configurations. [Section 139](../../docs/findings.md#s139)
[^s127]: Read in the firmware. [Section 127](../../docs/findings.md#s127)
[^s337]: Read in the firmware. [Section 337](../../docs/findings.md#s337)
[^s127b]: Measured in configurations. [Section 127](../../docs/findings.md#s127)
[^s338]: Measured in configurations. [Section 338](../../docs/findings.md#s338)
[^s309]: Measured in configurations. [Section 309](../../docs/findings.md#s309)
[^s134]: Measured in configurations. [Section 134](../../docs/findings.md#s134)
[^s365]: Measured in configurations. [Section 365](../../docs/findings.md#s365)
[^s349]: Measured in configurations. [Section 349](../../docs/findings.md#s349)
[^s365b]: Read in the firmware. [Section 365](../../docs/findings.md#s365)
[^unchecked]: Not checked.
[^s42]: Read in the firmware. [Section 42](../../docs/findings.md#s42)
[^s82]: Measured in configurations. [Section 82](../../docs/findings.md#s82)
[^s65]: Measured in configurations. [Section 65](../../docs/findings.md#s65)
[^s82b]: Read in the firmware. [Section 82](../../docs/findings.md#s82)
[^s258]: Measured in configurations. [Section 258](../../docs/findings.md#s258)
[^s152]: Measured in configurations. [Section 152](../../docs/findings.md#s152)
