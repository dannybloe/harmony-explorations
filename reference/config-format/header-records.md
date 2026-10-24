# Header records: base slots 0, 1 and 3

Three small records at the front of every configuration say what it is rather than what it does: **names**
for the things it controls (base slot 0), **which remote** it was built for (base slot 1) and **when** it
was built (base slot 3). The first two are read by the host software and by nothing on the remote, so a
wrong value in them changes nothing the remote does.[^s81] The third is the moment the remote measures
the configuration's age from.[^s138]

How base slots relate to the raw slots of each architecture's section table is in
[the container](container.md#one-table-four-architectures). The Harmony 890 and 895 are the exception
throughout this page: they have no base slot 0 and keep their architecture record in raw slot 0, which
[their memory page](../architectures/harmony-890-895/memory.md) describes.[^s182]

## Base slot 0: the name tree

A tree of named nodes, and the only `0xFEED` framed section in a container: exactly one frame, always at
base slot 0, and validating every other `0xFEED` byte pair in a container finds none that closes.[^s15]
Every container has one[^t-gspm], and in the Harmony One's factory safe mode container it is empty.[^s83]

```
+0x00  u16      0xFEED        stored little endian, so `ed fe` in the bytes
+0x02  u24      length        counted from the cookie, stops short of the terminator
+0x05  ...      nodes         packed end to end, up to +length
+len   u16      0xBEEF
```

**The length is three bytes on the word of Logitech's client.** The byte at `+0x04` is zero in every
container because the largest name tree measured is 2326 bytes, so no configuration separates a two
byte reading from a three byte one; both codecs take the wider one, the one that survives a bigger
tree.[^t-name-tree-width]

**The section is `length + 2` bytes**, the terminator sitting outside the field, and the base slot 1
pointer lands on exactly that byte in every container, which confirms the length rule from a second place
in the file.[^s15] **An empty frame states a length of zero** and is seven bytes, `ed fe 00 00 00 ef be`,
with its terminator five bytes in: read `length == 0` as "empty" rather than as an offset.[^s83] Nothing
on the remote reads this section, so no firmware rule decides the empty case.[^s81]

A node:

```
+0x00  u8       A7            the tag
+0x01  u16      n             4 + the name's length, so the field counts level, index and name
+0x03  u16      level         0 is the top of the tree
+0x05  u16      index         within its level
+0x07  char     name[n - 4]   ASCII, not terminated
```

**The nine bytes `A7 08 00 00 00 00 00 "Root"` are one node**, the node named `Root` at level 0 index 0,
whose `08` is its own length field. Every user configuration holds it first and the Harmony 525's safe
mode container holds it third, so a reader must not depend on the position.[^s77]

The nodes tile the frame exactly in every container with a non-empty frame: the walk lands on the byte
`length` names, with nothing left over and nothing short. `nameNodes` returns nothing at all rather than
a partial list when it fails.[^s77]

Two properties make this a tree rather than a list of strings:[^s77]

* **Level 0's indices are a permutation of `0..n-1`**, in every container, whatever order the nodes
  appear in. So the index is the node's place and the file order is free.
* **Every level 1 index is below base slot 13's state variable count**, in every container, at 93 of 94
  on a Harmony 700 and 19 of 21 on a Harmony 525. So **level 1 names
  [base slot 13's state variables](state.md), entry by entry.**

Level 2 appears on the Harmony 880 and 885 and the Harmony 525 only, holding a small menu under
`HarmonyAssistant`.[^s77] The order Logitech's compiler stores the nodes in, a hash order of the variable
index, is in [the layout](layout.md#the-order-is-a-hash-tables-bucket-order).[^s324]

A level 1 name is three parts, `<label>_<qualifier>_<values>`:

* **`values` is the variable's range**, the `max` field of its base slot 13 record plus one, in all 250
  named variables measured.[^s86]
* the **qualifier** is a Logitech device identifier on the Harmony 600 and 700 configurations, six digits
  or more and never stored in the container as a number, and a small number on the older
  generators.[^s86]
* the **label** is what the variable is: a device's name and a function of it, or one of the words the
  generator always emits. `CurrentActivityState_0_<values>` is in every container that has a name tree,
  and its `max` is the number of activities the configuration defines.[^s86]

No firmware routine reads this section, so the correspondence with base slot 13 rests on the index and
the range agreeing, not on a consumer.[^s81]

## Base slot 1: the architecture record

Seven bytes, and the only place a configuration states which remote it is for. A configuration read off
a remote over USB arrives with no [EZHex header](ezhex.md), and the cookie is not enough because `GSPM`
covers the Harmony One, the Harmony 600, 650 and 700 and the Harmony 300 and 350 alike, so this record is
what makes a configuration describe itself.[^s15]

```
+0x00  u8       architecture   8, 9, 12, 14 or 16
+0x01  u8       architecture   the same value again
+0x02  u16      version word   low byte the skin, the model's number; high byte 0x0D
+0x04  u8[3]    00 00 00
```

Examples: `0c 0c 3b 0d` on a Harmony One, `0e 0e 49 0d` and `0e 0e 42 0d` on a Harmony 600 and 700,
`09 09 16 0d` on a Harmony 525, `08 08 0f 0d` and `08 08 11 0d` on a Harmony 880 and 885.[^s182] The
Harmony 300 and 350 state architecture 16 and skin 104 the same way.[^s259] The skins are the model numbers
in [the remotes index](../remotes/README.md). On the Harmony 890 and 895 the record is raw slot 0,
`0a 0a 13 0d` and `0a 0a 17 0d`.[^s182]

Confirmed on seventeen containers spanning architectures 8, 9, 12 and 14, each with its architecture known
independently of this record, from the EZHex header's `PROTOCOL` field or from the firmware package the
container was taken from, so each is a calibration case rather than a check of the record against
itself.[^s15]

**The record is up to seven bytes, not exactly seven.** The Harmony 525's safe mode container carries
three, with base slot 2 starting immediately after, so the record's extent is the gap to the next pointer
like every other section's, and a reader that takes a fixed seven reads base slot 2's first byte as part
of the version word.[^s79] **And a container can carry the record without stating anything in it**: the
Harmony 880 and 885's safe mode container, inside their firmware images, has two bytes and both are zero,
so it declares architecture 0.[^s114] That makes three behaviours over three safe mode containers: the
Harmony One's names its own model exactly, the Harmony 525's names skin 18 where the remote it came from is
skin 22, both being what Logitech's table calls the Mocha Decaf family, and the Harmony 880's names
nothing. **So a reader must not take a model or an architecture out of a safe mode container**; the
record is load bearing for user configurations only.[^s114]

### The version word

What the word means as a whole is **not established**. Measured:[^s15][^s81b]

| container | architecture | word |
|---|---|---|
| Harmony One safe mode container, from firmware 3.4 | 12 | 3126 |
| Harmony 880 and 885 user configurations | 8 | 3343, and 3345 on one 885 |
| Harmony 525 user configuration | 9 | 3350 |
| Harmony One user configurations | 12 | 3387 and 3382 |
| Harmony 700 user configuration, and the container inside 700 firmware 2.8 | 14 | 3394 |
| Harmony 600 user configuration | 14 | 3401 |

It is not the architecture, since arch 14 shows two values; not the contents, since arch 8 configurations
that differ in 73 to 84 percent of their bytes share it; and **not fixed per remote**: one Harmony One
carries 3387 before a sync with Logitech's service and 3382 after it.[^s81b]

**The low byte is a skin number** in Logitech's own numbering, in plain binary on every
architecture.[^s81b][^s113] Seven of the nine containers whose remote's skin is known independently carry
it exactly, 54, 66, 71, 72, 22, 15 and 17. The two that do not carry 59 and 73, the **European variants of
those same two models**, the Harmony One EMEA and the Harmony 600 EMEA, per Logitech's product
catalogue.[^s131] So it names a model the way a skin does. **Which member of a regional pair a
configuration carries is not established**: the locale passed to the compiler and the product the account
holds are both candidates.[^s131] The high byte is `0x0D` in every container built from 2009 on and `0x0C`
in the Harmony One's 2007 factory container.[^s81b]

**Nothing on the remote reads this section, or base slot 0.** The firmware's section seeker is called with
raw slots 2 to 19 on the Harmony One and 3 to 17 on the Harmony 700, and with 0 and 1 on neither, so both
are host side records. That is why a wrong value here has no effect on the remote, and why an editor
**copies** the word rather than computing it.[^s81]

## Base slot 3: when the configuration was built

An eleven byte framed record:[^s21]

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

The field assignment is a search result rather than a reading: of the 24 orders of the four date bytes,
times two month bases, times seven weekday offsets, exactly one is consistent with every container.[^s21]

**The day of week is not an independent field.** It is the weekday of the date, counted from Sunday as 0,
and the date is the stored day **plus one**: the firmware's month end routine compares the stored day
against one less than each month's length on every image read, arch 8, 9, 12, 14 and 16, and twenty three
stamps with a date known from outside decode to it.[^s322] A record whose weekday disagrees with its date,
or whose day is past its month's last index, is refused rather than reported, by both readers.[^t-gspm]

The cookie pair occurs **exactly once in every container**, unlike base slot 0's `0xFEED`, which occurs
about once per 64 KiB by chance, so this record can be found without a pointer.[^t-gspm] That is what
[the container's base address](container.md#finding-the-base-address) is anchored on.

**The section is fourteen bytes and the record eleven.** The three bytes after the terminator are zero in
every container; the record closes at `0xEFBF`, so those three are the section's own tail rather than
framing, and a writer emits them as zeros.[^s84]

### What the remote does with it

**On the Harmony One the remote's clock agrees with this record at every cold start, and does not come
from it.** A Harmony One power cycled and read 90 seconds later held this record's date exactly and its time
plus 90 seconds, in this record's own encoding field for field.[^s111] The clock is base slot 13's first
seven state variables, which the firmware seeds from their records; Logitech's compiler stamps those
records and this one from the same moment, which is why they agree.[^s138] What the firmware does with
this record is subtract it from the clock, accumulating the difference in seconds and in days, so the
remote knows how long ago the configuration was built; the subtraction skips the weekday on both sides,
since the firmware derives it.[^s138]

**The boot read of three bytes at index 10 fills the counter of time since the build, not the clock**, on
the Harmony One, 600 and 700 images: the same variable the subtraction writes.[^s310] What it loads is
`EF 00 00` in every container measured, which is unexplained.[^s310b]

**A writer stamps this record with the moment it writes**, together with base slot 13's clock records,
which are where a stale moment shows: a clock wrong after every power cycle by exactly the staleness. A
Harmony One shows it on its screen.[^s111] A Harmony 600, 650 or 700 shows no clock at all, and on the
Harmony 650 a restart sets the clock in memory back to the stamp.[^s283] Reproducing an input configuration's timestamp is right
for a round trip and wrong for a save, and that distinction is in the code: `FIELD_RULES` in
`packages/codec/src/edit.ts` lists every field whose treatment on a write is not "carry it unchanged",
`applyEdits` is the faithful path and `saveEdits` stamps, and `emit.ts` is deliberately the round trip
side, since its whole measurement is byte equality with its input. The record is encoded in exactly one
place, `clockRecordFields` in `packages/codec/src/gspm.ts`, the inverse of `clockRecord`; the day of week
is computed there and never taken from a caller.[^t-edit]

### Dating a configuration, and where that fails

Every configuration can be dated from this record, which is provenance nobody has to write down, and a
configuration read over USB gets a "built on" date where there is no EZHex header to take one from. The
Harmony One's factory container, read off a remote and extracted from firmware 3.4, reads 2007-10-25
02:22:08 in both, and the factory container inside Harmony 700 firmware 2.8 reads 2009-04-16, both
matching when those models shipped.[^s21][^s322]

**A timestamp does not order two configurations of the same remote.** Two configurations of one Harmony
700, published by their owner with one documented change between them, are the only controlled pair
measured, and their build timestamps order them the opposite way round from the owner's stated direction
of the change. That is unresolved.[^s16][^s21] A pair whose direction was observed rather than reported,
one Harmony One before and after a sync with Logitech's service, is ordered correctly by it.[^s58]

[^s81]: Read in the firmware. [Section 81](../../docs/findings.md#s81)
[^s138]: Read in the firmware. [Section 138](../../docs/findings.md#s138)
[^s182]: Measured in configurations. [Section 182](../../docs/findings.md#s182)
[^s15]: Measured in configurations. [Section 15](../../docs/findings.md#s15)
[^t-gspm]: Measured in configurations. [The test](../../tests/test_gspm.py)
[^t-name-tree-width]: Stated by Logitech, in their client. [The test](../../tests/test_gspm.py)
[^s83]: Measured in configurations. [Section 83](../../docs/findings.md#s83)
[^s77]: Measured in configurations. [Section 77](../../docs/findings.md#s77)
[^s324]: Measured in configurations. [Section 324](../../docs/findings.md#s324)
[^s86]: Measured in configurations. [Section 86](../../docs/findings.md#s86)
[^s259]: Measured in configurations. [Section 259](../../docs/findings.md#s259)
[^s79]: Measured in configurations. [Section 79](../../docs/findings.md#s79)
[^s114]: Measured in configurations. [Section 114](../../docs/findings.md#s114)
[^s81b]: Measured in configurations. [Section 81](../../docs/findings.md#s81)
[^s113]: Measured on a unit. [Section 113](../../docs/findings.md#s113)
[^s131]: Stated by Logitech, by their service. [Section 131](../../docs/findings.md#s131)
[^s21]: Measured in configurations. [Section 21](../../docs/findings.md#s21)
[^s322]: Read in the firmware. [Section 322](../../docs/findings.md#s322)
[^s84]: Measured in configurations. [Section 84](../../docs/findings.md#s84)
[^s111]: Measured on a unit. [Section 111](../../docs/findings.md#s111)
[^s310]: Read in the firmware. [Section 310](../../docs/findings.md#s310)
[^s310b]: Measured in configurations. [Section 310](../../docs/findings.md#s310)
[^s283]: Measured on a unit. [Section 283](../../docs/findings.md#s283)
[^t-edit]: Measured in configurations. [The test](../../packages/codec/test/edit.test.ts)
[^s16]: Measured in configurations. [Section 16](../../docs/findings.md#s16)
[^s58]: Measured in configurations. [Section 58](../../docs/findings.md#s58)
