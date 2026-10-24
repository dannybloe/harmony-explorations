# Infrared records

### Base slot 5: the infrared database

**A record is findable with no pointer slot, and it is the cleanest closure in the format.** The `u24`
at a record's `+8` is the record's own start address, so a candidate does not merely look like a
record, it states where it is: a twenty four bit exact match. With the class byte at `+7` and the group
count at `+11` as the shape filter, `irRecordsByClosure` is exact against the slot route on **13 of 13**
containers, all **3925** records, and it needs no threshold of any kind.

The shape filter is not optional. A run of ascending `u24` pointers crosses `value == base + offset`
repeatedly, so a plain pointer table yields 125 hits in one Harmony 890 config and 198 in a Harmony
895; none of those is record shaped, where 300 of the Harmony 890's 301 are.

**On arch 10 a Harmony 890 gives 300 records**, one pointer group each, 463 duration block pointers
that all decode, and carriers of 38.0 kHz on 151 records, 36.4 kHz on 147 and 37.2 kHz on 2. A
**Harmony 895 gives none**, and that is a proven absence: searching every base at once, no bucket in
its blob holds one record shaped position, and its named content is 94845 bytes against the 890's
170691, which a missing record area accounts for. Why is open.

**The grouping is still gated**, so this is a flat list of records and not a list of devices: which
appliance a record belongs to is the base slot 5 pointer array itself.
[findings.md](../../docs/findings.md) section 181.


**Confirmed on 15<!--fact:user_configs--> user configs across four architectures.** Two levels of pointer array over records of
mark and space durations.

```
base slot 5:  u8  count
              u24 group_address[count]

per group:    u8  zero            the same spare byte the section table carries
              u16 count
              u24 record_address[count]

per record:   u8  zero            not read by anything; zero in all 3387 records
              u24 carrier_period  nanoseconds
              u24 carrier_on      nanoseconds, the period halved
              u8  class           the pointer array lands HERE, seven bytes in
              u24 start             the record's own first byte
              u8
              u24 block             durations, or NULL
              u24 block             durations, or NULL
              u24                   zero in every record seen

per block:    u16 duration[]      bit 15 set is a mark, bits 14..0 are microseconds,
                                  closed by a word reading zero
```

**A record's blocks sit below its header, not after it**, so the header is the last thing in the
run and a record is not one contiguous span. Reading forwards from the header reads the *next*
record's durations. [findings.md](../../docs/findings.md) section 61.

~~The header is 21 bytes~~<!--superseded--> **the header states its own length**, section 75. Byte
`+0x0B` is a count of nine byte **pointer groups**, each `{ u24 block; u24 block; u24 block }`, so
the header is `12 + 9 * count`:

```
+0x00  u8   zero, unread
+0x01  u24  carrier period, nanoseconds
+0x04  u24  carrier on time, nanoseconds
+0x07  u8   class
+0x08  u24  the record's own start
+0x0B  u8   count
+0x0C  group[count]
```

**The two `u24` values below the class byte are the infrared carrier**, section 92, and they used to
be part of the eleven bytes this listing called unread. A stored period is `floor(1e9 / f)` for a
frequency in whole hundreds of hertz, so 40 kHz is 25000 exactly, 38 kHz is 26315 and 36 kHz is
27777, which reads back as 36001 Hz. **Truncated, not rounded**: a writer that rounds emits 27778
and differs from Logitech's own generator by one byte per device. The on time is the period halved,
in every record of the corpus, which is a fifty percent duty cycle. The firmware clamps the period
at 256000 and moves the Timer 2 prescaler when it no longer fits in sixteen bits.

The carrier is **per record, not per config and not per device**. One Harmony One config carries
56.3 kHz and 38 kHz inside a single infrared group.

~~The count is 1 in every record on arch 12, arch 14 and most of arch 9~~<!--superseded--> **The count is 1 in
every record matched to a code that does not toggle**, and that case is exactly the 21 byte header with two
pointers and a trailing NULL that section 61 described. **A record of a toggling code has 2 on every architecture
whose configurations hold one**, section 365: 572 distinct records on arch 12 (Harmony One), 253 on arch 14
(Harmony 650 and 700), 130 on arch 16 (Harmony 350) and 36 on arch 8, every record of the lab's configurations
matched to a toggling catalogue code. The corpus the 1 was counted on held no toggling family on arch 12 or 14. ~~On arch 8 it is
2 in exactly 37 records of every config~~<!--superseded--> **it is 2 in 37 records of four arch 8
configs and in none of two others**, and the count follows the **devices** rather than the
architecture, section 134. On arch 9 it is 2 in 61 of `h525_config`'s 200 records and in **all 107** of
the second 525 config, so 168 against 139 corpus wide: more than half, which four comments in
`packages/codec/src/ir.ts` denied outright while this page said it. A two group header is 30 bytes and names
up to six blocks. `620 + 208 + 21` is the whole of a typical Harmony One record that does not toggle.

**A second group is the same code with one bit inverted**, section 134. Block `i` of the second group
and block `i` of the first differ in exactly two adjacent words, which are a mark and a space of equal
duration exchanged, at a fixed offset in the frame, in all 61 block pairs of each of the four configs
that have any. Exchanging equal halves of a pair is what inverting one cell of a **biphase** code does,
and those records read as RC6 mode 6 at 36200 Hz: a six and two unit leader on a 441 us unit, a start
bit of one, mode bits 110 and a double width trailer. So the two groups are the two states of a bit
the protocol requires the sender to alternate between presses, and a config stores both because the
action list language has no arithmetic that could compute one. ~~Which group a given press uses is
unconfirmed~~<!--superseded-->

**Which group a send plays**, section 365, read on the Harmony 650's 0.2 image (arch 14) and the Harmony One's
3.4 (arch 12):

* the firmware keeps a sixteen bit word with **one bit per infrared group**, and a send reaching the record
  start XORs `1 << (tag & 0x0F)` into it, the tag's low nibble being the infrared group; on the Harmony 650 and
  600 a tag with bit 4 or 5 set returns before the XOR, and what those bits mean is not read;
* the record start reads the count and skips groups of nine bytes, **one fewer when the count is 2 and that bit
  is set** after the XOR, so a set bit plays the first group and a clear one the second;
* the Harmony 650 clears the word at `0x11D08`, so the first send after that plays the first group. What
  calls the clear, and where the Harmony One clears its word, is not read.

The same update is found, and the skip not read, on the Harmony 600's 0.2, the Harmony 700's 2.8, the
Harmony 650's 0.4 and the Harmony 350's 1.4. The Harmony 525's image is in the lab and was not searched.

**The first group is the code as the catalogue states it**, and the second the same code with the toggle
bit its definition names flipped, in its first and held blocks; no toggling record in the lab has a tail. The
calibration is the 23 records of the pinned devices whose code states the bit set: every first group holds it
set. A one block copy of such a record,
section 349, keeps two groups, each its record's first block less the opening silence.

**A release group is the tail**, the third pointer, section 365: a block of its own holding the code's
release, `Logitech 24 Bit`'s Stop on arch 12, 14 and one arch 8 configuration and `Microsoft 36 Bit`'s on arch 8. **A tail carries no
stored microsecond**: every first and held block in the lab outside the Harmony 525 ends on the carved one
microsecond word, and the lab's two distinct tails are the definition's release with nothing added, the
silence uncarved.

**A block ends at a zero word, and that is not a validity check.** Over **4692 blocks in thirteen
configs the terminator agrees exactly with the region's tiling on every one of them**, and none stops
short or overruns. But arch 9's **380** blocks all find a zero word too and **not one is in the right
place**, so what separates a block this reading covers from one it does not is the **class byte**,
which is 1 here and 5 there.

Both figures moved again in section 141, and for a different reason from section 139's: the population
did. The two arch 8 (Harmony 880 and 885) configs were missing from the eleven this closure walked,
which is where section 134's second pointer group lives, so the tiling had never been asserted on the
configs the correction came from.

The first move was in section 139 and for one reason: a two group header's second set of pointers was
missing from the boundary list, so 133 blocks looked as though they stopped short of the next boundary
and 103 of arch 9's blocks were not seen at all. The old reading was 3490 blocks with 3357 exact and
133 short<!--superseded-->, and the 133 had an explanation, that they were padding on arch 8. A
remainder with an explanation attached is a remainder nobody counts again.
#### Class 5 shares the header, and behind it spells a code from a dictionary

Arch 9's 200 records all read class 5, and every structural property of the header above holds on
every one of them: the class byte at +7, the record's own start at +8 seven bytes back, both `u24`
pointing backwards and staying inside the area, the third `u24` NULL, and no two headers
overlapping. So **the header is one structure across both classes** and a reader can claim it,
though 61 of those 200 carry two pointer groups, and 107 of 107 in the second 525 config do, so its
length is read rather than assumed, section 75. `gspm.ir_region` gives the whole area, from the lowest backward pointer to the end of the
highest header, and on the 525 those two ends land exactly on the boundaries of the largest region
the byte accounting could not attribute.

**Confirmed on both arch 9 configs, and every field width is a literal in the firmware that reads
it**, section 82. Where a class 1 pointer names a run of durations, a class 5 pointer names a body
that spells the code as indices into a shared table of short pulse blocks:

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

A body is `5 + n` bytes, a table `1 + 3 * count`, a symbol block `4 + 2 * count`. The pulse words
are the same format class 1 uses, so one body expands to an ordinary duration run: the corpus's
tables hold a symbol per bit value plus one each for the header, the trailing mark, the gaps and the
repeat frame. A gap longer than 32767 microseconds is split across words, since that is all fifteen
bits can say.

~~the record body opens with a `u24` naming one of 66 shared descriptors~~<!--superseded--> That
`u24` is the symbol table pointer and there are 5 of them in `h525_config`, not 66; the count came
from reading at each block area's start rather than at a pointer target, which is a body start only
135 times in 199. [findings.md](../../docs/findings.md) sections 65 and 82.

**All three levels are shared, harder than anywhere else in the format.** Two records name one body,
up to 206 bodies name one symbol table, and a symbol block is reused by every code with that pulse
pair in it. Nothing here can be edited in place.

**Blocks are shared.** A record may carry a bare header whose pointers name a block another record
also names, so one duration stream can serve several codes. A writer cannot edit a block in place
without checking who else points at it.

**The three pointers of a group are once, held and tail**, section 127, read from the record streamer
on three images. At the end of every block the firmware samples the keypad's sense lines and steps the
pointer accordingly:

| at the end of | key up | key down |
|---|---|---|
| slot 0 | advance two, so slot 1 is skipped | advance one |
| slot 1 | advance one | advance **zero**, so slot 1 plays again |
| slot 2 | stop | stop |

So slot 0 is what a tap sends, slot 1 plays **only** while the key is held and then repeats for as long
as it is, and slot 2 is a tail that plays either way. A NULL pointer reads as a finished block, so a
group without a held block falls through. Four shapes occur over 3703 groups and slot 0 is never NULL:

| shape | groups |
|---|---|
| `B00`, no repeat | 1699 |
| `BB0`, once plus held | 1541 |
| `B0B`, once plus tail | 368 |
| `BBB` | 95, and only in four arch 8 configs |

**A command named Power gets its family's held block** like any other command, section 338: all twenty
on the seven devices of the Harmony 650's test setup, and the Harmony One LG's power toggle in phase 7's
compile. A power **step**, the record a power action list sends, is a different record and has none,
section 309. Whether every command of a family with a held block carries it is not settled: three PS3
records with a lead in and no held block are unexplained, section 338.

**The interval between two sends of a held key is slot 1's own duration**, since the firmware replays
the whole block before looking at the keypad again. 30.8 ms to 752 ms across the corpus, most between
60 and 120 ms. `irRepeatPeriod` returns it, and it is the number a user experiences as the repeat rate.

*A writer rail follows.* Slowing a key down means lengthening slot 1's trailing gap, and a duration
word carries at most 32767 us: a gap already spelled over three words can be raised to 98301 us
without changing the block's length, and anything beyond that lengthens the block and relocates
everything above it. The sharing rule applies first.
#### Group checks

63<!--fact:ir_groups--> groups and 4147<!--fact:ir_references--> record pointers checked: the lead byte is zero every time, each group is exactly
`3 + 3 * count` bytes and groups are packed adjacently, every record pointer is inside the
container, and none of them is an action list address.

**The number of groups equals the number of distinct high bytes a `0x7C` operand takes**, in all
fifteen user configs, with the group indices contiguous from zero. The count runs from 1 to 7, and the
unprogrammed Harmony One is the minimal case at 1.

The duration run has bit 15 strictly alternating, and is framed as `header mark, header space,
bits * (mark, space), trailing mark, trailing gap`. **The run from the first mark is not
`2 * bits + 4` values**<!--superseded-->, which this said on the strength of 2137 framed records with
no exception: section 139 found that both numbers in that identity came from a neighbouring record,
because the locator searched from a fixed offset instead of following the header's pointers. On the
right bytes it is simply false. A once block commonly carries the code, a gap, the protocol's own
**repeat header** and a long silence, so its length gives more bits than its timings say, and every
class 1 record in the corpus has a gap somewhere other than at its end.

The closure is real again and it is a different one: the **decoded bit count** against the protocol
the header timings name, over all fifteen user configs.

| header mark / space | records | bits, decoded |
|---|---|---|
| 8900 to 9100 / 4400 to 4600, which is NEC | 1567 | 32, every one |
| 3350 to 3520 / 1650 to 1760, which is Kaseikyo | 670 | 48, every one |

Two quantities computed from opposite ends of the record, agreeing with no exception on 2237 of
them. The bands are ranges because the corpus holds several calibrations of each: NEC turns up as
8990/4490 and as 9000/4500, Kaseikyo as 3364/1682, 3460/1730 and 3480/1730. Read with
`irFrame` in `packages/codec/src/irframe.ts`, which is the only frame decoder here.

**Not every record uses this encoding.** The whole arch 9 sample uses something else, and the 880
has a second population with headers near 303 / 310. The firmware routes four infrared encoding
classes; this is one.

Read with `gspm.ir_groups`, `gspm.ir_pulses` and `gspm.ir_frame`. The reader locates the duration
run rather than assuming a fixed offset, because some records carry a prefix of `0x7FFF` words
whose length varies.

*A group is a device*: base slot 0's names tie a device label to exactly one group through base
slot 13's transitions, sections 86 and 126. *What the 14 byte header holds is not established.*
[findings.md](../../docs/findings.md) section 32.
