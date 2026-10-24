# Header records: base slots 0, 1 and 3

### Base slot 1: the architecture record, and where arch 10 keeps it

Seven bytes, and the only place a config states its own architecture. Host side, so nothing on the
remote validates it, which is why its width varies between containers.

```
+0x00  u8   the architecture
+0x01  u8   the architecture again
+0x02  u8   the skin, meaning the model
+0x03  u8   0x0d, constant on every container here
```

Confirmed on eight containers over five architectures: `0c 0c 3b 0d` on a Harmony One, `0e 0e 49 0d`
and `0e 0e 42 0d` on a Harmony 600 and 700, `09 09 16 0d` on a Harmony 525, `08 08 0f 0d` and
`08 08 11 0d` on a Harmony 880 and 885. The skins are the model numbers in
[capabilities.md](../capabilities.md), established there from Logitech's own product table.

**On arch 10 it is at raw slot 0, not raw slot 1, because arch 10 has no base slot 0.** So an arch 10
config **does** state its architecture, `0a 0a 13 0d` on a Harmony 890 and `0a 0a 17 0d` on a Harmony
895, meaning architecture 10 with skins 19 and 23. The container check
`slot1_states_the_architecture` reports false there because it reads raw slot 1, and
`slot0_is_a_feed_frame` reports false because the name tree has no slot on that architecture at all:
no `0xFEED` word occurs anywhere in either payload. [findings.md](../../docs/findings.md) section 182.

**Seventeen of arch 10's nineteen base slots follow from that.** Base slot 1 to raw 0, 3 to 4, 5 to 6,
7 to 10, 17 to 20, and 18 and 19 to the trailing NULLs at 21 and 22, each identified by content rather
than by relabelling: the clock frame, the infrared groups holding all 300 records, the eight font set
addresses, and the two byte bias in front of the picture bank. Exactly nine four element insertion sets
fit all seven, and the only freedom is which of raw 1 to 3 is base slot 2 and which of raw 7 to 9 is
base slot 6, the latter narrowed to raw 9 by its mode table size. **The readers stay gated**: a mapping
needing a base slot *removed* is not something `archSlot` can express, and two slots are still
ambiguous. [findings.md](../../docs/findings.md) section 182.
### Slot 0: the only `0xFEED` frame

Exactly one frame per container, always at slot 0. Confirmed on seventeen samples across four
architectures, and confirmed as *exclusive* by validating every `0xFEED` byte pair in each
container: no other one closes.

```
+0x00  u16      0xFEED        stored little endian, so `ed fe` in a hex dump
+0x02  u24      length        counted from the cookie, stops short of the terminator
+0x05  ...      nodes         packed end to end, up to +length
+len   u16      0xBEEF
```

**The length is three bytes, and that is client sourced and unconfirmed.** This read a `u16` with
the byte at `+0x04` listed as a spare that is zero in every sample. It is zero because the largest
name tree in the corpus is 2326 bytes, so **no sample here separates the two readings**; both
codecs take the wider one because it is the one that survives a bigger tree. See
`reference/logitech/clients.md` for the provenance rule and `tests/test_gspm.py` for the corpus statement.

**The section is `length + 2` bytes**, since the terminator sits outside the field, and an empty
frame states a length of zero and is the seven fixed bytes above with no node. Both arch 12 safe
mode containers carry one. Section 83.

A node:

```
+0x00  u8       A7            the tag
+0x01  u16      n             4 + the name's length, so the field counts level, index and name
+0x03  u16      level         0 is the top of the tree
+0x05  u16      index         within its level
+0x07  char     name[n - 4]   ASCII, not terminated
```

**The nine bytes `A7 08 00 00 00 00 00 "Root"` are one node, not a header.** They were recorded<!--superseded-->
here as a fixed prologue until section 77, and they are the node named `Root` at level 0 index 0,
whose `08` is its own length field. Every config in the corpus happens to hold it first; the arch 9
safe mode container holds it third, so a reader must not depend on the position.

The frame therefore occupies `length + 2` bytes, and in all seventeen samples the slot 1 pointer
lands on exactly that byte. That is an independent confirmation of the length rule, because the
pointer and the length come from different places in the file.

One exception, and it is the reason `length` is validated rather than trusted: the Harmony
One's safe mode config carries a **degenerate empty frame**, `ed fe 00 00 00 ef be`, whose
length is 0 while its terminator sits five bytes in. Read `length == 0` as "empty" rather than
as an offset. Whether the firmware's own parser special cases it that way is **unconfirmed**;
no arch 12 or arch 14 config parser has been located in the firmware yet.

The nodes tile the frame exactly, in every framed container: sixteen of the nineteen `make
coverage` reports, the two exceptions being the One's safe mode config with its degenerate empty
frame. The walk lands on the byte `length` names, with nothing left over and nothing short, and
that is what validates the reading:
`nameNodes` returns nothing at all rather than a partial list when it fails.

Two properties hold corpus wide and are what make this a tree rather than a list of strings:

* **Level 0's indices are a permutation of `0..n-1`**, in every container, whatever order the nodes
  appear in. So the index is the node's place and the file order is free.
* **Every level 1 index is below base slot 13's state variable count**, in every container, at 93
  of 94 on a Harmony 700 and 19 of 21 on a 525. So **level 1 names base slot 13's table, entry by
  entry.**

Level 2 appears on arch 8 and arch 9 only, holding a small menu under `HarmonyAssistant`.

**The order Logitech's compiler stores the nodes in**, [findings.md](../../docs/findings.md) section 324. Level
0 first, `Root` then `State` on the arch 12 and 14 configurations measured and those two then
`HarmonyAssistant` on the arch 8 and 9 ones. The exceptions are containers that are not a user
configuration: the Harmony 525's safe mode container and the one in its firmware package hold one
level 1 node, then `State`, then `Root`, and the Harmony 880 and 885 firmware containers hold `State`
before `Root`.
Then level 1 in ascending

    (i ^ (i >>> 4) ^ (i >>> 7)) & (capacity - 1),   i the variable index

with the capacity 16 doubled while the level 1 node count exceeds three quarters of it: Java 6's
`HashMap` keyed by the index, the rule section 315 found for the key list after the end marker. 13 of
13 arch 14 compiles fit and none fits in index order. The two Harmony 600 trees, 32 and 41 nodes, fit
64 buckets and fail at 128, which pins their capacity from both sides; the eleven of 51 to 90 nodes fail
at 64 and fit at 128 and every wider table alike, since their indices are all below 128, so theirs is
pinned from below only. All 22 distinct trees Logitech built on arch 8, 9, 12 and 16, 2 to 25 level 1
nodes over 35 files, show no step down either, and the twenty that `compose.ts` gave a node before
section 331 all do, because it appended the node.
No arch 14 tree has a tie in a bucket, and `nameTreeOrder` refuses one; on arch 8 and 12 ten distinct
pairs tie, fifteen times over ten trees, and every time the larger index is stored first, which is
recorded and not adopted by the generator, section 324. Arch 10 (Harmony 890 and 895) has no name tree.
Nothing on the remote reads the order; `buildNameTree` reproduces it.

**A composed node is placed, not appended**, section 331. `compose.ts` re-sorts a level 1 run after
adding a node, `orderNameTree`, by `composedNameTreeOrder`: the rule above with a tie stored larger
index first. The tie order is adopted here where the generator refuses it because a composer cannot
refuse a tree for holding one, every tie Logitech wrote is stored that way, and nothing on the remote
reads base slot 0. Sorting each of the 34 distinct trees in section 324's two populations that way
gives back its stored order, and so does every tree not composed by us across all the samples the lab
registers. The tie order is fitted to the fifteen ties those trees hold, the only ties in the lab, and
no composition yet produces one. A tree whose level 0 nodes do not all come first, or which holds level 2
nodes, the arch 8 and 9 shape, is left as it is.

A level 1 name is three parts, `<label>_<qualifier>_<values>`:

* **`values` is the variable's range**, the `max` field of its base slot 13 record plus one, in all
  250 named variables of the corpus. Section 86, and it is what settled that field.
* the **qualifier** is a Logitech device identifier on the two arch 14 configs, six digits or more
  and never stored in the container as a number, and a small number on the older generators.
* the **label** is what the variable is: a device's name and a function of it, or one of the words
  the generator always emits. `CurrentActivityState_0_<values>` is in every container that has a
  name tree, and its `max` is the number of activities the config defines.

The names are the user's own equipment, so no brand out of a contributor's config is quoted here or
in the tests: what is recorded is the shape and the count. No firmware routine consuming this section has
been found, so the correspondence with slot 13 is established by the index and by the range
agreeing, not by a consumer.
### Slot 1: the config states its own architecture

A fixed seven byte record:

```
+0x00  u8       architecture   the protocol number: 8, 9, 12, 14
+0x01  u8       architecture   the same value again
+0x02  u16      version word   low byte a skin number, high byte a generation
+0x04  u8[3]    00 00 00
```

**The record is up to seven bytes, not exactly seven.** The arch 9 safe mode container carries
three, with base slot 2 starting immediately after, so the extent is the gap to the next pointer
like every other section's and a reader that takes a fixed seven reads slot 2's first byte as part
of the version word. Section 79.

**And a container can carry the record without stating anything in it.** The arch 8 safe mode
container, found inside the arch 8 firmware images at flash `0x01E000`, has two bytes and both are
zero, so it declares architecture 0. Section 114. That makes three behaviours over three safe mode
containers: arch 12's names its own model exactly, arch 9's names skin 18 where the remote it was
read off is skin 22 (both are what Logitech's table calls the Mocha Decaf family), and arch 8's
names nothing. **So a reader must not take a model or an architecture out of a safe mode
container**, and the field is only load bearing for user configs, which is where the application
needs it.

Confirmed on seventeen samples spanning architectures 8, 9, 12 and 14. Every one has its
architecture established independently of this record, from the EZHex header's `<PROTOCOL>`
field on nine of them and from the firmware package the container was extracted from on the
other three, so each sample is a calibration case rather than a self-consistency check.

This is the field that makes a config self describing, which the application needs: a config
read off a remote over USB arrives with no EZHex header, and the cookie is not enough because
`GSPM` covers both arch 12 and arch 14.

The `version word` is **unconfirmed as to meaning**. What is measured:

| Sample | arch | word |
|---|---|---|
| One safe mode config, from firmware 3.4 | 12 | 3126 |
| arch 8 configs, all four | 8 | 3343 |
| Harmony 525 config | 9 | 3350 |
| Harmony One user configs, two different units | 12 | 3387 |
| Harmony 700 user config, and the container inside 700 firmware 2.8 | 14 | 3394 |
| Harmony 600 user config | 14 | 3401 |

So it is not the architecture (arch 14 shows two values), not the config contents (four arch 8
configs that differ in 73 to 84 percent of their bytes share it), and **not per model**: the same
spare Harmony One carries 3387 before the sync of section 58 and 3382 after it, which is one unit
and two configs from the same service.

What the **low byte** is, section 81: a skin number in Logitech's own numbering, in **plain binary**
on every architecture, which is what settles that the BCD in the USB descriptor's `bcdDevice` is a
property of that field and not of the skin. Section 113. Seven of the nine
containers whose remote's skin is known independently carry it exactly, 54, 66, 71, 72, 22, 15 and
**17**, the last from a Harmony 885 contributed on 10 August 2026;
the two that do not carry 59 and 73, which are the **European variants of those same two models**,
Harmony One EMEA and Harmony 600 EMEA, per Logitech's live product catalogue. Section 131. So it
names a model the way a skin does, and both bench remotes are Dutch units. **Which member of a
regional pair a config carries is not established**: the locale passed to the compiler and the
product record the account holds are both candidates. The high byte is `0x0D` in every
container built from 2009 onward and `0x0C` in the One's 2007 factory container.

**Nothing on the remote reads this section, or base slot 0.** The firmware's section seeker is
called with raw slots 2 to 19 on the One and 3 to 17 on the 700, and with 0 and 1 on neither, so
both are host side records. That is why a wrong value here has no effect on the device, and why an
editor must **copy** the word rather than compute it. Section 81.

Observed pointer values, for orientation:

| Slot | One safe cfg @`0x2000` | One user cfg @`0x40000` | 600 user cfg @`0x30000` | 700 user cfg @`0x30000` |
|---|---|---|---|---|
| 0 | `0x0029AD` | `0x076197` | `0x063702` | `0x06E3B5` |
| 1 to 6 | `0x0029B4`..`0x002A50` | `0x0762AE`..`0x076740` | `0x063D26`..`0x064007` | `0x06ECCD`..`0x06F1A6` |
| 7 | `0x004107` | `0x085E44` | `0x072CDB` | `0x0812C1` |
| 8 | NULL | NULL | `0x072D0A` | `0x0812F6` |
| 9 to 18 | `0x00410C`..`0x0042BA` | `0x085E7C`..`0x08C076` | `0x0734B5`..`0x07A33B` | `0x0820FE`..NULL |
| 19 | `0x0042BC` | `0x08C078` | NULL | NULL |
| 20, 21 | NULL, NULL | NULL, NULL | n/a, 20 slots only | n/a, 20 slots only |

The non-NULL pointers ascend with the slot number in every sample, so sections are laid out in
slot order. That is what makes a section length well defined, since the header does not state
one: a section runs to the next non-NULL pointer, and the last runs to the trailer.

The NULL slots are per architecture rather than per config, in every sample of each: slots 18 and
19 on arch 9 and arch 14, slots 8, 19 and 20 on arch 8, slots 8, 20 and 21 on arch 12. In base
slot terms that is one statement rather than three, since **base slots 18 and 19 are NULL on all
four architectures** and the rest is where each architecture's insertions put them.

### Slot 3: when the config was built

An eleven byte framed record:

```
+0x00  u16      0xADDF         cookie
+0x02  u8       second         0 to 59
+0x03  u8       minute
+0x04  u8       hour           24 hour
+0x05  u8       day of month   0 to 30, so the date is this plus one
+0x06  u8       day of week    0 = Sunday, 1 = Monday, ... 6 = Saturday
+0x07  u8       month          0 = January
+0x08  u8       year           offset from 2000
+0x09  u16      0xEFBF         terminator
```

Confirmed on seventeen samples across all four architectures, and the field assignment is a search
result rather than a reading: of the 24 permutations of the four date bytes, times two month
bases, times seven weekday offsets, **exactly one is consistent with every sample**. See
`docs/findings.md` section 21.

The day of week is not an independent field. It is the weekday of the date, counted from Sunday as
0, and the date is the stored day **plus one**: the firmware's month end routine compares the stored
day against one less than each month's length on every image read, arch 8, 9, 12, 14 and 16, and twenty three
stamps with a date known from outside decode to it, `docs/findings.md` section 322. A record whose
weekday disagrees with its date, or whose day is past its month's last index, is refused rather than
reported, in both parsers.

**Corrected on 3 October 2026, section 322.** This said the day was 1 to 31 and the weekday days
since 1 January 2000 modulo 7<!--superseded-->, 0 being a Saturday, and called that the closure behind the reading. The
same bytes read that way name the day before, and the weekday closes on that day exactly as the Sunday
count closes on the real one, so the corpus could not tell them apart. A stamp on the 1st, stored as
0, could, and the old reading refused it.

The cookie pair is **unique in every blob**, unlike slot 0's `0xFEED`, which occurs about once
per 64 KiB by chance. So this record can be located without a length field.

**The section is fourteen bytes and the record is eleven.** The three bytes after the terminator
are zero in all nineteen containers. The record closes at `0xEFBF`, so those three are the
section's own tail rather than part of the framing, and a writer emits them as zeros.
`docs/findings.md` section 84.

**What the arch 12 firmware does with it is established**, section 111, and it is two things.

**The remote's clock agrees with it at every boot, and does not come from it.** Measured: a Harmony
One was power cycled and read 90 seconds later, and it held this record's date exactly and its time
plus 90 seconds. So the clock's seven data memory bytes at `0x108` to `0x10E` carry **this record's
encoding field for field**, including the zero based month, the zero based day and the Sunday based
weekday.

**Corrected on 29 August 2026.** This said the firmware initialises the clock from base slot 3 and
that "the code that performs the copy has not been located", so the mechanism was behavioural. Both
halves are dead. Section 138 located the seeding and it is not from here: state variable `n` lives at
`0x108 + n`, base slot 13's records **are** the clock, and the firmware seeds each variable from its
own record's `first` at `0x2A266`. Base slot 3 is the epoch the firmware subtracts against, at
`0x27F20`, to work out how long ago the config was built. The two records agree at boot because
Logitech's generator stamps both from the same moment, which is why the measurement looked like a
copy. The live reading is under base slot 13 above.

**The boot read of three bytes at index 10 fills the counter of time since the build, not the
clock**, on the Harmony One, 600 and 700 images, `docs/findings.md` section 310: the same variable the
subtraction below writes. What it loads is `EF 00 00` in every container the lab holds, which is unexplained.

**And it subtracts the record from that clock**, accumulating the difference in seconds and in days, so
the remote can compute how long ago the config was built. The subtraction skips the weekday on both
sides because the firmware derives it.

**A writer stamps this record with the moment it writes**, together with base slot 13's clock records,
which are where a stale moment shows: a wrong clock on the remote's screen after every power cycle, by
exactly the staleness, and on the Harmony 650 after every restart. Reproducing an input config's
timestamp is right for a round trip and wrong for a save, and that distinction is executable:
`FIELD_RULES` in `packages/codec/src/edit.ts` lists every field whose treatment on a write is not
"carry it unchanged", `applyEdits` is the faithful path and `saveEdits` stamps. **`emit.ts` is neither
and is deliberately the round trip side**, since its whole measurement is byte equality with its input.
The record is encoded in exactly one place, `clockRecordFields` in `packages/codec/src/gspm.ts`, which
is the inverse of `clockRecord` and asserted to be on all nineteen containers; the day of week is
computed there and never taken from a caller, since both parsers refuse a record where it disagrees.

Two things worth having for free:

* Every config in the corpus can now be dated, which is provenance nobody has to record by hand.
  The two Harmony One factory configs, one dumped off a remote and one extracted from firmware
  3.4, agree to the second at 2007-10-25 02:22:08, and the factory config inside Harmony 700
  firmware 2.8 reads 2009-04-16, both matching when those models shipped. Both read a day earlier
  until section 322.
* The application gets a "built on" field for a config it reads over USB, where there is no EZHex
  header to take one from.
