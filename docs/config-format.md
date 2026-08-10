# The Harmony config format

Living specification. This is the deliverable other tools consume, so it is kept separate
from the narrative in [findings.md](findings.md). Anything stated here is confirmed against at
least two independent samples unless marked otherwise.

Work is focused on architectures 12 (Harmony One) and 14 (Harmony 600, 700), because those are
the remotes on the bench. Architectures 8 and 9 appear here as controls: they are what shows
whether a claim is about the format or only about those two models.

**It is one container across architectures, not one per architecture.** Each architecture has
its own four letter cookie, and the header shape behind it is the same. The 525's
`0xFEED`/`0xBEEF` framing appears inside this one, but at **section slot 0 only**, not once
per section. See [findings.md](findings.md) for the correction that replaced.

```
container header               absolute pointer table
  section 0   FEED ... BEEF    exactly one frame per container, always slot 0
  section 1                    seven bytes, states the architecture
  ...                          remaining sections, unframed, mostly unlabelled
u16 checksum + end marker
```

## Outer container

Validated against **seventeen samples across four architectures**, five base addresses
(`0x002000`, `0x018000`, `0x020000`, `0x030000`, `0x040000`), three format versions and three
pointer table lengths (20, 21, 22). Every consistency check passes on all seventeen. A fifth
architecture and a fourth of each arrived on 10 August 2026 and is **not** in that set: arch 10,
format 1.7, 23 slots, whose framing verifies while four of the checks fail on the slot mapping.
See the cookie table below and section 115. See
`tests/test_gspm.py`. The sixteenth is the bench Harmony 525's own config, read over USB on
8 August 2026 and identical in every container field to the published arch 9 sample, section 76.

**The seventeenth was held out of that set for a while**: the same remote's arch 9 safe mode
config, at flash `0x818000`, which contradicted six established claims at once. All six are
re-derived, sections 77 to 79, and none of them was a fix. Four became findings, base slot 0's
nodes and the font set's first code among them; two were artefacts of reading a fixed length where
the format states none. It is in the corpus now, as `h525_safemode_ahcm`, it brings the fifth base
address with it, and it is the counterexample two corpus wide claims have to name.

**Corrected here.** This paragraph said thirteen samples, five base addresses and four pointer
table lengths. The count was stale, and the other two numbers never matched the list beside them:
four addresses were named at the time and the lengths are 20, 21 and 22. The fifth address is real
now and it arrived with a seventeenth sample rather than by the number being right all along. The
counts are computed in
`tests/test_gspm.py` now rather than written down, so they cannot drift again.

```
0x00  char[4]  cookie          per architecture, see the table below
0x04  u32      end_addr        absolute flash address of the trailing end marker
0x08  u32      format          nibble BCD version: 0x1400 = 1.4, 0x1500, 0x1600
0x0B  item[N]  section_table   { u8 spare; u24 address }[N], see below
      char[4]  marker          per architecture; starts the key table on arch 8, 12 and 14
      u8       count
               { u8 event_code; u16 index; u8 flags }[count]
      ...      remaining sections, reached via section_ptr
end-6 u16      checksum        seeded word XOR, below
end-4 char[4]  end marker      per architecture
```

All little endian. Pointers are **absolute flash addresses, not offsets**, so a blob is
position dependent and cannot simply be relocated.

### The per architecture cookies

| Arch | Models | cookie | end marker | marker after the table | format seen |
|---|---|---|---|---|---|
| 8 | 720, 785, 88x | `TPTP` | `DKDK` | `WLWL`, key table | `0x1500` |
| 9 | 36x, 51x, 52x, 55x | `AHCM` | `MCHA` | `CMAH`, contents unestablished | `0x1400` |
| 12 | One | `GSPM` | `PTYY` | `LWJL`, key table | `0x1600` |
| 14 | 600, 700 | `GSPM` | `PTYY` | `LWJL`, key table | `0x1400` |
| 10 | 89x | `TPTP` | `DKDK` | `WLWL` | **`0x1700`** |

The cookies agree with concordance's own per architecture table, which also lists `BMBM` for
arch 7 (the older 6xx). No arch 7 sample has been seen here, so its end marker is unknown and
it is deliberately absent from the parser. Architectures 2 and 3 use a two byte cookie and are
a different layout.

Note that `format` is not an architecture identifier: arch 9 and arch 14 both carry `0x1400`.
It is a generation of the format, and the cookie is what says which architecture.

**Arch 10 is the newest row and nothing beyond this table is read from it**, sections 115 and 117:
two Harmony 890 configs, format 1.7 and **23 pointer slots**, both based at flash `0x030000`. The
framing verifies and one of the two recomputes its trailer checksum, so the container layout above
holds.

The **slot mapping does not, and it is not a relabelling of the twenty**, section 117. All 1330 ways
of placing three insertions were scored by asking seventeen readers to parse; the best reaches 34 of
47 with an eight way tie, where arch 8, 9 and 14 each score 47 uniquely. Five readers are satisfied
by no mapping at all, so the name tree, the log area, the mode records, the font sets and the value
maps differ in form on arch 10 and not merely in position. `INSERTED_SLOTS` therefore has no entry
for 10, `arch_slot` refuses, and every section reader is gated off. **Do not add an entry to ungate
them**: a guessed mapping turns twenty refusals into twenty plausible wrong answers.

Two things the samples do say. The single validating clock record is raw slot 4's target in both, so
arch 10 inserts a slot below base slot 3. And **no `0xFEED` frame validates anywhere in either
payload**, so an arch 10 config is not known to state the names of its devices and activities at
all, which every other architecture does in base slot 0.

### Recovering the base address

Needed to turn the pointers into file offsets, and derivable from the blob itself. **Anchored on
the clock record, not on the end marker**, section 117:

```
candidates = { address_of_slot - offset_of_the_clock_record : slot in table, slot not NULL }
base       = the single candidate that is a multiple of 0x1000 and leaves every
             non-NULL pointer inside the blob
```

Exactly one candidate survives on all 24 containers, spanning five architectures and six distinct
bases from `0x002000` to `0x040000`. The anchor is a closure rather than a cookie match: a clock
record is only accepted when its stored day of week agrees with its stored date, and there is
exactly one accepted record per container.

Worth noting against concordance's table, which lists arch 9's `config_base` as `0x820000` where
the derived value is `0x020000`.

> **Corrected on 10 August 2026, section 117.** This used to read
> `base = end_addr - (offset_of_end_marker - offset_of_cookie)` and call it exact on all<!--superseded-->
> sixteen samples. That reading is right on 23 of 24 containers and wrong by 864 bytes on
> `H890-Bedroom-2`, whose header declares an end before its own end marker. It was also
> **circular**: the check `end_addr_points_at_end_marker` tested the assumption the base had just
> been computed from, so no input could fail it. With the base anchored on content instead, that
> check is real and it fails on exactly that sample. The marker subtraction remains in both
> implementations as the fallback for a container with no clock record; nothing in the corpus
> reaches it.

> **Corrected on 8 August 2026, section 76.** This used to end "bit 23 looks like a flag<!--superseded-->
> rather than an address bit". Both numbers are right and they are different address spaces: a
> `READ_FLASH` command must name `0x820000` and a 525 is silent below `0x800000`, while every
> pointer inside the container counts from `0x020000`. Deriving the container's base from the data
> is still what sidesteps the question here, and a reader that talks to a remote needs both.

### The section table starts at `0x0B`, and an item is a spare byte plus a three byte pointer

```
0x0B  { u8 spare; u24 address }[N]
```

So the addresses land on `0x0C`, `0x10`, `0x14` and so on. The `spare` byte is **zero in every
section of every sample**, and its meaning is unestablished; it is not known to be padding. A
parser must not read the item as a `u32` pointer, because a nonzero `spare` would then add
`0x1000000` to the following address and produce a plausible wrong answer rather than an error.

| Architecture | N | table ends, marker at |
|---|---|---|
| 8 | 21 | `0x5F` |
| 9 | 20 | `0x5B` |
| 12 | 22 | `0x63` |
| 14 | 20 | `0x5B` |

Derive it rather than hardcoding per model:

```
N = (marker_offset - 0x0B) / 4
```

The marker itself is found from the data: it is the first four uppercase letters preceded by
three zero bytes. Those three bytes are the final section's NULL address, not padding, so the
heuristic works for a reason rather than by luck, and it would fail on a container whose last
section is populated. Which four letters they are is a per architecture fact, so the parser
asserts it against the table above rather than computing it.

**Corrected here.** This document previously put the table at `0x0C` with `N` one lower, treated
the three bytes before the marker as padding, and recorded an ambiguity: whether arch 8 and
arch 9 carried a trailing NULL slot or simply more padding. Both readings were wrong in the same
way. Once the table starts at `0x0B` the length follows from the marker position with no
remainder, so there is nothing left for padding to be ambiguous about. The evidence is arithmetic
on the whole corpus: `0x0B + 4 * N` equals the measured marker offset in all sixteen samples
across four architectures, where the old reading could only close by subtracting three bytes it
could not account for. Every address the old parser reported was still correct, because the slot
it lacked is NULL everywhere. See `docs/findings.md` section 20.

## The EZHex wrapper

A config as handed to a remote is an XML header followed by the container as raw bytes.

**The header ends at the line carrying `</INFORMATION>`**, and the payload is everything after
that line's terminator. That is the split, and everything else in the header is a check on it:

```
</INFORMATION>     the last line of the header. The payload starts after its line terminator,
                   which is CR LF in every config here and is not required to be
<BINARYDATASIZE>   optional. The payload length, so the split is also the last N bytes
<CHECKSUM>         optional. XOR of every payload byte, seeded 0x69, compared as a byte
<INTENDEDVERSION>  PROTOCOL, SKIN, FLASH, BOARD, SOFTWARETYPE, ARCHITECTURE
```

Three rules that a reader has to get right, all of them with a sample in the corpus:

* **A file with no header at all is legal** and is the whole payload. The Harmony 700 package's
  config region is one.
* **An absent `BINARYDATASIZE` or `CHECKSUM` is not a failure.** Every firmware wrapper omits both.
* **A `CHECKSUM` may be written signed**, because the value is narrowed to a byte before
  comparison. No sample in the corpus does, so this is from the consuming reader rather than
  measured.

Both splits are computed and compared, `src/harmony/ezfile.py` and `packages/codec/src/ezhex.ts`,
and they agree on all ten config samples. `docs/findings.md` section 87.

`INTENDEDVERSION` is compared field by field, and **an absent or empty field matches anything**, so
an entry with no fields at all matches every remote. `BOARD` is normalised on the file's side
before comparison: `0.5` becomes `0.5.0`. `SOFTWARETYPE` says which firmware personality the file
is for, 0 for the application, 4 for safe mode, 3 boot and 1 test; every config in the corpus
declares 0.

The consequence of a mismatch is **reported, not verified here**: harmony-decompiler states that a
remote refuses a mismatched config with "This configuration file is not compatible with your
Harmony Remote". Nothing has been written to a remote in this project, so treat that as the reason
to match the header, not as our own observation.

An `.EZUpgrade` carries its payload hex encoded in `<DATA>` elements instead, 32 bytes each with a
short one at the end, grouped into a `<PHASE>` per destination with a `<TYPE>` naming it. An arch
12 firmware package has two, `Configuration_Static` then `Firmware_Main`; arch 14 has one and ships
the config as a separate region.

Not to be confused with the trailer checksum inside the container, which is a different
algorithm. This one covers the whole payload; that one is what the remote validates internally,
and it is derived below.

### The trailer checksum

**Confirmed on fourteen containers across four architectures**, sizes from 7115 bytes to 1672832,
and derived from the boot validator rather than guessed. A sixteen bit XOR of the container's
little endian words, seeded `0x4321`, from its first byte up to the stored value:

```python
accumulator = 0x4321
for offset in range(0, len(blob) - 6 - 1, 2):
    accumulator ^= int.from_bytes(blob[offset:offset + 2], 'little')
```

An odd trailing byte is not folded in, because the firmware divides the byte count by two and
counts words. No container in the corpus has an odd body.

**This is the value a writer has to get right**; the remote refuses a config whose checksum does
not recompute. It is also a weak check: a word XOR catches any single changed byte but is blind to
two transposed words and to any even number of identical changes, so a passing checksum means the
remote will not refuse the file, not that the file is correct.

Read with `gspm.trailer_checksum` or `trailerChecksum`, and the parse reports
`trailer_checksum_recomputes` as a container check. [findings.md](findings.md) section 41.

## Sections

**Every one of the twenty base slots is now accounted for.** Slots 0 and 1 are the header records,
slots 2 to 17 are sixteen named sections, and 18 and 19 are NULL in every sample.

The method that named them is described in
[roadmap.md](roadmap.md) step 6: the firmware copies each config pointer into a per-subsystem RAM
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

Known so far:

| Slot | Meaning | Evidence |
|---|---|---|
| 0 | the one `0xFEED` frame, holding a list of named nodes by level and index | sixteen samples, below |
| 1 | seven byte record stating the architecture | sixteen samples, below |
| 5, 7, 10, 11, 12, 15 | count prefixed arrays of three byte flash pointers | nine configs, below |
| 5 | of those, the **infrared database**, grouped | ten configs, four architectures, below |
| 10 | of those, the **action list address table** | nine configs, below |
| 4 | the **firmware event map**: thirty events, each named in the space `0x7E` indexes | ten configs, four architectures, below |
| 3 | the build timestamp, and the firmware **starts Timer 1 from it**, so it is the clock | sixteen samples, three images, below |
| 6 | the **mode table**: what `0x7E` and the event map both index | ten configs, four architectures, below |
| 15 | the **parameter block**: numbered groups of 16 bit constants, every length demanded | thirteen containers, two images, below |
| 13 | the **state variable table**, named from its firmware consumer | ten configs, four architectures, below |
| 8 | **key press bindings**: records of `{ tag; operand; opcode }`, tag a press code | seven configs, four architectures, below |
| 7 | a pointer array **indexed by opcode 16 of the screen language** | three images, below |
| 9 | the **binding table**: eight to sixteen sets of button bindings with an enter and a leave handler | ten configs, four architectures, below |
| 11 | the **screen program table**: programs in the screen language | ten configs, four architectures, below |
| 14 | the **state value map**: what a state variable's value means, indexed by `0x72` | ten configs, four architectures, below |
| 16 | the **number sender**: how to transmit a value one decimal digit at a time | three images; empty in all twelve containers, below |
| 12 | the **timer table**: wait, then queue one instruction | ten configs, four architectures, below |
| 17 | the **touch screen hit map**, populated on arch 12 only | two configs, one image, below |
| 2 | the **log area**: a region of flash the firmware appends to and never erases | thirteen containers, one image, below |
| 18, 19 | NULL in every sample of every architecture | thirteen containers |

**Every slot from 2 to 19 has a located firmware consumer**, on the Harmony 700, the 600 and the
One. See [findings.md](findings.md) sections 35 and 38 for the addresses. On arch 12 the firmware
seeks every raw slot from 2 to 19 **except raw slot 8**, which is the NULL that architecture
inserts, and it does seek raw slot 18, which is the section it has and the base layout does not. So
the alignment rule below is how the firmware itself addresses the table.

**The distance from one pointer to the next is an upper bound on a section's size, not its size.**
Base slot 4 holds 125 bytes and the gap to slot 5 is between 419 and 1532 bytes, because slot 5's
infrared group arrays are laid out in that space. A section's own data can end long before the next
pointer, with another section's sub-structures filling the rest, so a large gap is not evidence of
a large section. See section 36.

### Base slot 2: the log area

**Confirmed on thirteen containers across four architectures**, and on the one arch 12 image, which
is the only firmware that reads it.

Not a pointer to a structure: three numbers reserving a region of flash above the config that the
firmware appends to and never erases.

```
+0x00  u16  capacity        u24 on arch 12, where the section is nine bytes
+0x02  u24  start           the first byte of the region
+0x05  u24  limit           one past its last byte
```

`limit - start == capacity * stride`, exactly, in every container, with one stride per
architecture: **8 bytes on arch 8, arch 9 and arch 14, and 1 on arch 12**. The region always sits
above the config's `end_addr`, and `limit` is always a round flash boundary: `0x080000`,
`0x100000`, `0x200000` or `0x400000`, except arch 8, which stops 8 KiB short of 2 MiB at
`0x1FE000`.

| container | arch | capacity | start | limit |
|---|---|---|---|---|
| 700, 600 | 14 | 16384 | `0x1E0000` | `0x200000` |
| all three safe mode | 14 | 16384 | `0x0E0000` | `0x100000` |
| One, both | 12 | 16 | `0x3FFFF0` | `0x400000` |
| 525 | 9 | 8192 | `0x070000` | `0x080000` |
| all four 880s | 8 | 15360 | `0x1E0000` | `0x1FE000` |

The arch 12 firmware scans the region at boot, at `0x2DB4C`, for the last byte that is not `0xFF`,
and appends after it, so the write position is recovered from the erased pattern rather than
stored. The append routine at `0x2DC0A` writes one byte per call, refuses an address outside
`[0x040000, 0x400000)`, and refuses once `capacity` units are used up. Its only callers are five
branches of the same operand ladder that drives timers, operand high `0xE1` to `0xE5`, appending
one to six bytes each.

**On both bench Harmony Ones this region is already full, so the facility is dead**, measured on
10 August 2026. `0x3FFFF0` to `0x400000` reads `00 ff` repeating with the last byte `0x00`, in the
64 KiB block that has held that pattern on both units since before this project read them. The boot
scan therefore recovers the position after offset 15, which is `0x400000`, and the append's own upper
bound rejects it by zeroing the remaining count. **A writer cannot use this region without erasing a
64 KiB block inside the config region first**, which the rails refuse.

Read with `gspm.log_area`; `gspm.log_reference` names the append case an instruction selects.
[findings.md](findings.md) sections 47 and 111.

**Case 3's record is a timestamp**: its six bytes reversed are year, month, day, hour, minute and
second, taken from the clock's broken out fields at data memory `0x108` to `0x10E` on arch 12. The
other four cases are shapes without meanings. The stride of 8 on the three architectures whose
firmware never reads this section is *not established*. **No config in the corpus appends to it**, so a
writer that copies these three numbers unchanged is doing everything the corpus does.

### Base slot 4: the firmware event map

**Confirmed on ten configs across four architectures**, and the same shape in every one.

```
+0x00  u24  fallback        used when no key matches
+0x03  u16  count           thirty, always
+0x05  { u8 key; u24 value }[count]
```

Keys are `0` to `29`, contiguous. Values are `N` to `N + 29`, contiguous, and the fallback is `N`.
Only `N` varies: 19 on the 700, 14 on the 600, 11 on the 525, 10 on both Ones, 4 on all four 880s.

The firmware raises an event by loading a literal key and looking it up here, and the value goes to
the same register opcode `0x7E`'s operand goes to. So the two share a numbering space, and the
block `N` to `N + 29` is **reserved**: across ten configs `0x7E` names 1246 distinct operands and
lands inside the block once, on the 525. On the programmed Harmony One the config uses 0 to 9, the
block takes 10 to 39, and the config resumes at 40, abutting on both sides.

Read with `gspm.event_map`.
*What the thirty events are, and what the numbering space counts, are not established.*
[findings.md](findings.md) section 36.

**This section is 125 bytes**, not the 419 to 1532 that the distance to the next pointer reports.
See the warning under "Sections" about what that distance means.

### Base slot 6: the mode table

**Confirmed on ten configs across four architectures.**

```
+0x00  u24  count
+0x03  u24  address[count]
```

A `u24` count, where the six recognised pointer arrays use a `u8` or a `u16`, so the parser's array
heuristic does not pick this slot up.

**The count is exactly one more than the largest `0x7E` operand, in every config**, over counts from
103 to 374. Every value in the event map of base slot 4 is in range too. So `0x7E` and the event map
both index this table, and `0x7E` is the instruction that **switches to the entry its operand
names**.

**The pointer does not land on the entry.** It lands inside the record, on a discriminator byte
with a `u24` back pointer to the record's start immediately after it, exactly as base slot 5's
infrared records do:

```
at the record start   u8 count; { u8 tag; u16 operand; u8 opcode }[count]
at the table pointer  u8 kind; u24 the record's own start; u16 pages; u24 page[pages]
```

Records are contiguous and run to about seven hundred bytes, so the pointer lands hundreds of bytes
past the head. Closures over 1616 records in eight containers: the back pointer always points
backwards, and the count read at the start always gives a list that fits inside the record, where a
wrong start overruns.

`kind` is 0 in 2326 entries and 1 in 70, all of the latter on arch 8 and arch 12. The firmware
tests its bit 0 and branches, so it is a flag; **what it selects is unconfirmed.**

The entry is `6 + 3 * pages` bytes. The offset and the stride are the two literals the consumer at
`0x16816` feeds to its `3 * index + literal` helper, so neither is inferred from the bytes.

An entry maps a **tag** to one action list instruction. Two tags are the handlers: **tag 7 when the
mode is left and tag 6 when it is entered**, the only two either arch 14 image selects, and on both
Harmony Ones every mode carries exactly one of each. The rest are key codes.

**The container's key table is the first mode record**, byte for byte: same offset, same count,
same four byte entries. The tagged list encoding and the key table encoding are one encoding.

So its length is the record's, and a record has two forms: **an empty one is the wide form**, a zero
lead byte and a zero count, two bytes where `1 + 4 * count` says one. That is the whole of it on the
arch 14 safe mode containers. On arch 9 there is no key table at the marker at all and the record
there is an ordinary mode record, 189 bytes in `h525_safemode_ahcm`. `docs/findings.md` section 84.

**A screen program follows the list**, at the record's start plus the list's length, and every
record has one on **every** architecture: 374 of 374, 237 of 237, 268 of 268, 103 of 103, 114 of
114 and 35 of 35 in a safe mode container. That program is where the region's large pictures are
addressed from. [findings.md](findings.md) sections 53 and 64.

Twice this looked like an architecture that did not carry them, and twice the cause was one
missing operand count rather than a different layout: arch 12 in section 54 and arch 9 in section
64. Neither program was malformed; both were simply unwalkable.

#### A mode's pages

**Confirmed on seventeen containers across four architectures.** Each `page[]` address is a record
of two pointers, and on arch 12 only, one byte in front of them:

```
arch 8, 9, 14   u24 list; u24 program                 6 bytes
arch 12         u8 unknown; u24 list; u24 program     7 bytes
```

`list` is a tagged list in the encoding below and `program` is a screen program. The firmware
searches the page's list for a tag first and the mode record's own list second, so a page
**overrides** rather than replaces. Both offsets are read off the code rather than inferred: one
routine runs the list at `page + 0` and then the one at `entry + 1`, section 69. **Every page's
list also has a second copy**, in the pool base slot 9's sets sit in, which nothing reads. Two tags are searched this way, `0x29` and `0x2A`, either side
of the code that moves a wrapping page cursor; **what they name is unconfirmed.** So is the lead
byte, which no reader in either image touches after fetching it.

Closures: 2906 of 2906 page pointers resolve; the page abutting an entry sits exactly six bytes
before it on arch 8, 9 and 14 and exactly seven on arch 12, in 2396 of 2396 entries, which is where
the length comes from since nothing states it; every `list` decodes as a tagged list and lands in
the run above base slot 7's table, which it fills to within 4 to 34 bytes; every `program` decodes
as a screen program.

**Prefer `program` over the computed root above.** On arch 8, 9 and 14 the first page's program is
usually the same address; on arch 12 it never is, because the stated program begins with a call
(opcode 22) to the fragment sitting where the computation lands. [findings.md](findings.md)
section 66.

Read with `gspm.mode_records`, `gspm.mode_pages` and `gspm.mode_program_roots`; `gspm.mode_table`
returns the raw pointers. [findings.md](findings.md) sections 52 and 66.

*It is not the activity list*: a Harmony has a handful of activities and this table has hundreds of
entries. What distinguishes one entry from another is not established.
[findings.md](findings.md) section 37.

### Tagged lists

Base slots 6 and 9 both point at lists in this encoding, and one firmware routine reads both. Which
of the two forms applies is decided by the first byte, exactly as the firmware decides it:

```
+0x00  u8   count                                     when nonzero
+0x01  { u8 tag; u16 operand; u8 opcode }[count]
```

```
+0x00  u8   0
+0x01  u8   count
+0x02  { u8 flags; u8 tag; u16 operand; u8 opcode }[count]
```

The firmware stops at the **first** entry whose tag matches and runs nothing else, so a duplicate
tag is unreachable through anything but its first copy. A writer that emits two entries with one tag
has emitted dead data, silently. Bit 0 of `flags` in the second form is tested after the match and
what it selects is *not established*.

Read with `gspm.tagged_list`. [findings.md](findings.md) section 39.

### Base slot 9: the binding table

**Confirmed on ten configs across four architectures.**

```
+0x00  u8   count
+0x01  u24  address[count]
```

Eight to sixteen entries, each pointing at a tagged list. **The largest index any config uses is
exactly the count minus one, in all ten**, over counts from 8 to 16.

**The pointer is the list**, unlike base slot 6's, which lands inside a record. Read a slot 9
target as slot 6's shape, a `u8` and a `u24` back pointer, and not one of the 54 sets in the corpus
gives an address below itself where all 1616 of slot 6's do. So the extent is the list's own
declared length. [findings.md](findings.md) section 67.

The sets sit in a pool of tagged lists packed end to end, which also holds one list per mode page.
The pool is bounded at both ends without searching: it begins on the byte after a mode entry's page
array and ends at the lowest address above that which another reader already names, and a run must
hold at least one set on a list boundary. 29 runs in seventeen containers, tiling exactly.

The lists that are not sets are **a second copy of every mode page's own list**, in mode table
order: the k-th copy belongs to the k-th page, 2906 of 2906 in all seventeen containers with
nothing left over on either side. Every empty copy is in the wide form and every wide form one is
empty.

The copy is identical in **meaning** and not in bytes. Form, entry count, tag, flags, opcode and
operand all agree per entry, with one exception: opcode `0x7F`'s operand is an index into base slot
10, and the two copies name different table entries whose **action lists decode identically**, 5861
of 5861 pairs. Comparing the two runs byte for byte therefore says they differ, which is what
section 67 did before section 69 corrected it.

**Nothing reads a copy.** The tagged list runner has five references on each of the two
architectures with a firmware, and every one takes its pointer from a page record or from a mode
entry; and reading every byte position in a container as a `u24` finds 27 that name a copy across
seventeen containers, against 148.8 that chance predicts. An emitter still has to reproduce them
byte for byte, and their position is implied by everything packed before them, as pictures are.
*Why the generator emits them is not established*, and no config can answer it.
[findings.md](findings.md) sections 67, 68 and 69.

The index is carried by opcode `0x1F` with the operand's high byte `0xFF` and the index in the low
byte. When it changes, the firmware runs the outgoing entry's list with **tag 2** and the incoming
one's with **tag 1**, the same leave and enter arrangement base slot 6 has with tags 7 and 6.

An entry's other tags are **key event codes**, by the same `EVENT_MASK` and `SCAN_MASK` split base
slot 8 uses: `0x81` is a press of scan code 1. So an entry is a set of button bindings with a
lifecycle.

The two Harmony 700 configs differ in exactly one place in this section, one added binding with a
press tag in one entry, and their owner's notes record exactly one added standard button assignment
in one activity.

*What an entry corresponds to is not established.* That owner describes a six device installation
and the table has eleven entries, so it is not the device list; devices and activities together is
the reading the counts support and it is not proven.

Read with `gspm.handler_sets` and `gspm.handler_index`. [findings.md](findings.md) section 39.

### Base slot 14: the state value map

**Confirmed on ten configs across four architectures.**

```
+0x00  u8   count
+0x01  u24  address[count]
```

and at each address

```
+0x00  u8   stepped over by the firmware; 2 in every record in the corpus
+0x01  count                 u16 on arch 14, u8 on arch 8, 9 and 12
+...   { u16 value; u24 address }[count]
+...   u8   count of the range table
+...   { u16 low; u16 high; u24 address }[count]
```

The **count width differs by architecture and the key width does not**. That is read off the
layout: compute a record's length under each of the four combinations of widths and ask whether it
lands on another record's start. One combination per architecture accounts for at least four fifths
of the records and the other three are all behind it.

Opcode `0x72` names both halves of this at once. Its operand's **low byte is a state variable
index** into base slot 13 and its **high byte selects the record** here. The record is searched for
the variable's value, then, if nothing matched, for a range containing it; the bounds are inclusive.
Both operand bounds hold in all ten configs and neither is ever overrun.

**The payload is a flash address, not an instruction.** All 9776 targets across ten configs land
inside their own container. The firmware follows one and hands it to a **second interpreter**, a
one byte opcode language with ten opcodes and a terminator, which is not the action list language
and is not decoded. Base slot 6's mode switch reaches the same interpreter.

Records share their tails: a few addresses point into the middle of a longer record rather than to
a record of their own, so two records can overlap by design.

The range table is empty in eight of the ten configs; two carry one range between them.

Read with `gspm.value_maps` and `gspm.value_map_reference`. [findings.md](findings.md) section 39.

### The screen language

A second interpreter, unrelated to the action lists, with its own one byte opcodes. It draws the
display. Programs are reached from base slot 11, from a base slot 14 lookup, and on arch 8 and arch
14 from a mode entry.

| opcode | operands | meaning |
|---|---|---|
| 0 | none | end |
| 1 | 4 bytes, `u16` | repeat a primitive |
| 2 | 2 position bytes, `u24` | draw the **bitmap** at that address, below |
| 3 | 6 bytes, `u24` | the same with a larger position record |
| 4 | 2 position bytes, `u24` | draw the glyph string at that address |
| 5 | 2 position bytes, then the string | draw the glyph string inline |
| 16 | 1 byte | index base slot 7 by it |
| 17 | `u16` operand, `u8` opcode | queue an action list instruction |
| 18, 19 | a switch, below | switch on a state variable and jump |
| 20 | `u24` | jump |
| 21 | 4 bytes | *arch 8 only*, meaning unknown, length inferred from the corpus |
| 22 | **per architecture**, below | *arch 12*: call. *arch 9*: select a screen row |
| 23 | none | **per architecture**: *arch 12* the return matching opcode 22; *arch 9* the page transfer |

**Opcode 22 is the one opcode whose operand width is not the same everywhere**, so a parser has to
know the architecture before it can walk past one.

On **arch 12** it takes **3** bytes, a `u24` target: it seeks there and leaves the byte after the
operands in a link register, which opcode 23 restores. A call and its return, read out of the
handlers at `0x2966E` and `0x29640` on the Harmony One 3.4 image. There is **one** link register,
so calls do not nest. No config in the corpus uses it, so this is firmware rather than data.

On **arch 9** it takes **1**, a row index from 0 to 7, and the instruction that follows it is an
ordinary opcode 3 drawing a 96 by 8 strip at `y = 8 * row`. Every mode page's program issues the
eight of them once each, and every strip on a page comes from the same picture, which is 96 by 64
in every arch 9 user config: the 525's whole panel, drawn in eight rows.

What the row index is for is **read now**, section 101, and it is not what was guessed here. It is a
**page index sent to the panel**: `0x038EC` keeps it at `0xC0` and derives `row * 8` and `row * 8 + 7`
beside it, and the transfer at `0x03898` sends `0xB0 | row`, which is the page address command of the
SSD1306 family. So the 525 addresses its screen as eight pages of eight pixel rows, opcode 22 selects
one and **opcode 23 transfers 96 pixels into it**. The guess recorded here, that a key press is
attributed to a row and this is arch 9's touch hit map, was wrong: nothing reads it back.

The lead came from trelowney and the addresses were verified against this project's own 525 image.

Corrected: this document said **11 operands, the last three naming a picture**, which read the
opcode 3 that follows as part of opcode 22. Both readings consume the same twelve bytes and end on
the same address whenever opcode 22 is followed by opcode 3, and that is 1856 instances out of 1856
in the two arch 9 user configs, so the corpus could not separate them. The arch 9 safe mode
container has four that are followed by something else, and there the 11 byte reading walks a
program off the end. See [findings.md](findings.md) section 85.

[findings.md](findings.md) section 64.

A switch:

```
u8    state variable index
count                                     u8 in opcode 18, u16 in opcode 19
{ value; u24 target }[count]              value likewise one byte or two
count
{ low; high; u24 target }[count]
```

**The inline strings are glyph indices, not characters.** The renderer resolves one by indexing a
font table by the code minus one. A code with bit 7 set is the first half of a wide one and takes a
second byte with it, so a terminator cannot be found by scanning for a zero; no string in the corpus
is wide. What a code means is under base slot 7 below: the assignment is per config, and the text is
recovered from the glyph's pixels rather than from the code.

**21552<!--fact:screen_programs--> programs across 15<!--fact:containers--> containers and four architectures decode with nothing left over**,
which is the check that matters: instructions are variable length with no length field, so a wrong
operand count desynchronises the walk immediately. Programs are reached from base slot 11, from a
base slot 14 lookup, and on **every** architecture **from a mode record**, whose own program sits
immediately after its tagged list. That third source is 2119 roots and is where the full screen
pictures are named. [findings.md](findings.md) sections 53, 54 and 64.

Read with `gspm.screen_program` and `gspm.screen_program_roots`, or dump one with
`tools/screen_dump.py`. [findings.md](findings.md) section 40.

#### What opcode 2 draws

The only screen instruction that names a place outside its own program. At the address:

```
+0x00  u8   kind
+0x01  u16  stride, in bytes per row
+0x03  u16  rows
+0x05       the pixels
```

`stride` is in **pixels** and a pixel is two bytes, so `kind` 0 is exactly `5 + 2 * stride * rows`
bytes. Pictures are laid out contiguously and consecutive ones sit exactly that far apart.
`kind` 1 discards the two sizes and uses the base slot 7 glyph encoding instead, skip and literal
over **two byte** pixels, ending at a `0x00` control byte; it breaks rows exactly `rows - 1` times
even though it threw the header away, which is the closure its extent rests on. `kind` 2 is a bare `RETURN` in the firmware, valid and drawing nothing, and a
higher value is not reached at all.

**On arch 9 `kind` 2 is the only kind used and it is one bit a pixel**, since the 5xx panel is
monochrome. A row is padded to a whole byte, so the record is `5 + ceil(stride / 8) * rows`: a 96
pixel row is 12 bytes and a 19 pixel one is 3, not 2.375. Every picture in an arch 9 user config is
96 by 64, the whole panel, at 773 bytes; the safe mode container also carries a 19 by 10 and an 18
by 10. Corrected from `5 + stride * rows / 8`, which agrees for every width that is a multiple of
eight and so for everything the user configs contain. [findings.md](findings.md) section 85.

Two rails for a writer, both read off the firmware and invisible in the corpus:

* only the **low byte** of each `u16` is loaded, so a value above 255 is taken modulo 256, silently,
* the row loop stops drawing above **row 128** but still advances the stream.

Every opcode 2 address in the corpus decodes. Strides are per model, 12 on the 600 and the 700, 16
to 19 on arch 8, and 20, 22 or 88 on the One; row counts are 10, 11 or 18. Arch 9 and the safe mode
containers emit no opcode 2 and hold no bitmaps.

**Two size classes.** The ones a base slot 11 program names are icons, 245 to 1765 bytes. The ones a
**mode record's** program names are full screens: stride 128 over 128 rows on arch 14, 128 over 160
on arch 8, and **176 over 220 on arch 12**, which is the Harmony One's panel.

#### The picture bank

Pictures do not sit where they are addressed; they sit in **one contiguous array** running from the
end of the named content to the trailer, with **no table, no count and no header**. Walking it from
its start lands exactly on the trailer in every container that has one: 98 pictures on a Harmony
One, 18 on a 600, 24 on a 700, 31 to 33 on arch 8. **Every entry of an arch 12 bank is drawn by a
screen program**, 98 of 98 and 70 of 70, and exactly two per container are not on arch 8 and arch
14. So the bank is the set of pictures the programs draw rather than a region that happens to
contain them. [findings.md](findings.md) section 66.

The start is found by trying offsets above the named content under two constraints, the exact
landing and the presence of every addressed picture; exactly one candidate satisfies both.
`gspm.picture_bank`. [findings.md](findings.md) sections 49 to 55.

**For a writer:** a picture's position is implied by everything before it, so inserting or resizing
one moves every later address.
Read with `gspm.bitmaps` and `gspm.bitmap_at`. [findings.md](findings.md) section 50.

Opcode 3 draws the same object with a six byte position record instead of two. On arch 8, 12 and 14
it is used by one instruction in the whole corpus, so its operand layout there is read from the
firmware and exercised by almost nothing. **On arch 9 it is the ordinary way to draw**, 1856 times
across the two user configs, always preceded by an opcode 22 naming the row: two `(0, 8 * row)`
pairs, then 96 by 8, then the picture. [findings.md](findings.md) section 85.

#### What fills the region

The pictures above, and nothing else. The region is one contiguous array of them from the end of
the named content to the trailer, walkable end to end in all nine containers that have a trailer,
and screen opcode 2 inside a mode program is what addresses them.

**This subsection used to say the opposite and the correction is worth reading.** It described the
region as raw image data with **no header and no framing**, so that "where one image starts is<!--superseded-->
unknown and nothing found so far addresses them", and it gave the arch 14 width as not<!--superseded--> established.
All three were wrong, and each fell to a different finding:

* the framing is the picture header, `u8 kind; u16 stride; u16 rows`, section 54;
* what addresses them is screen opcode 2 in a mode record's own program, which was unreachable
  until an operand count was fixed, sections 53, 54 and 64;
* the arch 14 width is stated by `stride` like every other, so nothing has to be recovered.

What survives is the arch 12 **geometry**, and it survives as an independent confirmation rather
than as the reading: rows of 176 big endian RGB565 pixels over 220 rows, recovered on both Harmony
Ones by minimising the vertical pixel difference across candidate widths, with the height fixed by
blank screens of exactly 77440 bytes. Section 54 then found the header states `stride 176,
rows 220`. A measurement and a declaration agreeing is worth more than either alone, which is why
`harmony/region.py` is kept even though nothing needs it any more. It is reverse engineering only
and deliberately not in `packages/codec`: a width recovered by minimisation is a measurement, not a
reader. [findings.md](findings.md) sections 51, 54 and 55.

### Base slot 11: the screen program table

```
+0x00  u16  count
+0x02  u24  address[count]
```

One of the six recognised pointer arrays. Each entry is a screen program. On arch 14, 5703 of the
700's 5711 entries are the same two instruction program, queue one action list instruction and end,
so the table is mostly indirection.

**A program's storage ends with a `SCREEN_END` byte even where the last instruction is a jump or a
switch**, which no execution can reach. Confirmed positionally: in the same place, in front of a
mode page record, 91 to 294 programs per container end with a terminator that is reached, against
49 to 64 per arch 8 config that are not. A jump may also abut the next structure with no terminator
at all, 36 times on the One, so the byte is part of the program only when it is zero.
`docs/findings.md` section 84.

### Base slot 7: the font table

A count prefixed pointer array of 5 to 18 entries, indexed by **opcode 16 of the screen language**.
Each entry is one typeface:

```
+0x00  u8   glyph height in pixels, shared by every glyph in the set
+0x01  u8   the first glyph code
+0x02  u8   the glyph count
+0x03  u24  glyph[count]     NULL for a code this config never draws
```

**unless `+0x02` is zero**, and then the count is at `+0x01` and the first code is 1. That is a
discriminator and not an explanation, and it is what every arch 12 user config needs. A code's
index is `code - first`.

and each glyph

```
+0x00  u8   width in pixels
```

followed by one byte operations: `0x00` ends the glyph, a byte with bit 7 set skips that many
background pixels, and a byte below `0x80` introduces that many literal pixels of **two bytes**
each. A row is exactly `width` pixels and the next begins as soon as that many are accounted for;
the height comes from the set header rather than from the glyph.

The count is the same for every set in every **generated** config, 46 to 76, so it is a character
set size chosen per config. The arch 9 safe mode container declares 91, 90, 50 and 90 in one
container, so the field is per set and a generator happens to choose once.

**A glyph code is one based** in every generated config, because zero terminates an inline string
and nothing can name a glyph by the code zero. It is the header that says so, not the format: the
arch 9 safe mode container's sets start at 32 and its codes are ASCII, which is how the field was
read at all. `findings.md` section 78.

Three checks, on twelve containers across three architectures. Arch 9 is excluded because it packs
a glyph differently and has its own figures in the subsection below; the corpus totals including it
are 4315<!--fact:glyphs--> glyphs and 58083<!--fact:inline_string_codes--> codes.

* every row comes to exactly `width`, for **3933<!--fact:glyphs_two_byte_pixel--> glyphs**, with no stream ending mid row
* every glyph decodes to exactly the height its set declares, 3933 of 3933
* every inline string resolves: **54107<!--fact:string_codes_two_byte_pixel--> glyph codes** land on a non-NULL glyph of the font their
  own program selected, none out of range and none on an empty slot

Decoding with a one byte pixel instead fails on almost all of them, which is the calibration.

#### Arch 9 packs the glyph itself a second way

The set header above is unchanged, and so is the terminator. What differs is inside a glyph, and
the reason is the same one section 62 found in the picture bank: the 5xx panel is monochrome, so a
pixel is two bits rather than two bytes.

```
+0x00  u8   width in pixels
       one row per pixel row, until a 0x00 appears in the leader position:
         +0x00  u8   0x20 | n, n being how many bytes of commands the row occupies
         n bytes of commands, each  kind << 4 | (count - 1):
           0x5   count literal pixels, two bits each, big endian, ceil(2 * count / 8) bytes follow
           0x6   a run of count background pixels, no data
           0xA   a run of count ink pixels, no data
```

The leader's byte count and the commands' pixel count are two independent statements of the row's
length and both have to come out exactly. **Pixel value 2 is the paper and 1 is the ink**; no other
value occurs. Which is which is derived from the encoder rather than from the render: a run is
maximal, so 80 of 80 adjacent run pairs alternate the kinds and 50 of 50 literal pixels beside a
kind `6` run read 1, and 160 of 160 glyph cells open with a full width kind `6` run.

*Unconfirmed for want of a second sample*: the leader's high nibble is `0x20` in all 1730 rows, so
whether it is a tag or part of a longer length field is open, and values 0 and 3 never appear, so
whether the panel has four levels is open too.

**Corrected.** This said the one arch 9 config has no inline string codes at all<!--superseded-->, so
section 46's third check was unavailable here. It draws **1435 codes in 179 strings and selects a font
244 times**, and all 1435 land on a non-NULL glyph, so the check runs on arch 9 and passes. The claim
was true of the decoder rather than of the config: when it was written `gspm` refused to decode an
arch 9 glyph at all, section 46, and section 85 then read the packing above without anyone revisiting
the sentence. Found by section 112, which needed those strings.

160 glyphs on this encoding, which takes the corpus total to **4093**.

#### What a glyph code means, and how the text is recovered

**A code is not a character and not an encoding.** It is assigned per config, in the order
characters first appear in the generator's own string list, which is not the order the strings sit in
the file. So two configs of the same remote agree about the codes their shared boilerplate needs and
diverge from the first code the user's own strings reach: on the two Harmony Ones code 20 is a colon
in one and the digit `1` in the other.

What is stable is the **typeface**. The same character at the same size has the same pixels in every
config of a skin, so a code is resolved by matching its glyph's pixels:

* a shape is keyed by `(font height, pixels)`. Height is part of it because `I` and `l` are the same
  pixels at several sizes, and a size blind key reads a tall `l` as an `I` from a smaller set.
* evidence is **intersected** across the sets a code appears in, not counted: a size where two
  characters share a shape says less than a size where they do not.
* a **blank** glyph is a space and is evidence about nothing else. A set carries a blank slot for
  codes it does not draw, and the same code is a real letter in another set.
* a shape that draws two characters keeps both. Eight in the corpus do, all `I` against `l`, and a
  code that only appears at those sizes stays ambiguous and is reported as such.

Seven typefaces cover the corpus, one alphabet each: the Harmony One skin (all four arch 12 user
configs), arch 14 (the 600 and both 700s), arch 8 (all four), the Harmony 525, the arch 9 safe mode
container, the arch 12 safe mode container and the arch 14 safe mode container. **The arch 12 safe
mode container shares not one shape with the arch 12 user configs**, so an alphabet is per typeface
and not per architecture or per remote.

**The arch 9 safe mode container's codes are ASCII outright**, its sets starting at code 32, which is
both how the field at `+0x01` was read, section 78, and how the 525's user config was decoded without
reading its glyphs: the two share a typeface.

65454<!--fact:text_read--> of 65456<!--fact:text_glyphs--> drawn glyphs across the corpus come back as
characters. The two that do not are one code drawn once in each Harmony 700 config. The closure is
that a decoded string turns up verbatim inside a base slot 0 name, which is ASCII and which this
decoder never reads: twelve of the thirteen containers with a name tree do it, between three and
eleven distinct strings each.

A **writer** gets no shortcut from any of this: to add text it has to build a font set and number it,
because the codes are the generator's own and nothing looks a character up.

Read with `characterMap`, `screenStrings` and `textCoverage` in `packages/codec/src/text.ts`, the
alphabets in `packages/codec/src/alphabets.ts`, and `make text` for the per container figures.
[findings.md](findings.md) section 112.

Read the sets and glyphs with `gspm.font_sets`, `gspm.Container.images` and `gspm.Container.glyph`;
draw them with `tools/screen_dump.py --images` or `--strings`. [findings.md](findings.md) sections 46
and 63.

### Base slot 17: the touch screen hit map

**Confirmed on the two Harmony One configs and the Harmony One 3.4 image.** Empty, with a count of
zero, in the other eleven containers in the corpus: arch 8, arch 9, arch 14 and all three safe mode
ones. The Harmony One is the only remote here with a touch panel.

Where it is empty the section is **two** zero bytes rather than one, because the pointer lands two
bytes in front of the picture bank that follows it, which is the same bias the bank walk starts
from. Both bytes are zero in all thirteen containers that do this. `docs/findings.md` section 84.

```
+0x00  u8   pages
+0x01  u24  page[pages]
```

each page

```
+0x00  u8   areas
+0x01  u24  area[areas]
```

each area, twelve bytes

```
+0x00  u16  x
+0x02  u16  width
+0x04  u16  y
+0x06  u16  height
+0x08  u8   the key code a hit reports
+0x09  u24  the record's own address
```

The firmware walks a page in order and **returns the first rectangle containing the point**, with
the test half open on both axes, `x <= X < x + width`. Rectangles on a page do overlap, 104 pairs
across the corpus, so a writer must treat a page's order as meaningful. The panel reports thirteen
bit coordinates and the largest rectangle reaches 4437.

A page's areas are laid out contiguously immediately before the page's own header, and each area's
last three bytes are its own address; both hold for every page and every area in both configs.

The code at `+0x08` takes ten values, 43, 44, 46, 47 and 48 to 53, which sit inside the block of
scan codes the One's key table carries where arch 14 numbers 41 to 54. A page's codes run 48
upward consecutively, then 43 and 44 for the two largest pages, and always end with 46 and 47,
which are a tall strip at each edge of the panel. Nine page shapes exist and no others.

**The geometry is not user data.** Two Harmony Ones with entirely different configurations carry
the same 35 rectangle sizes and share 70 of 70 distinct records; only the number of pages differs.

Read with `gspm.touch_pages` and `gspm.Container.touch_hit`. [findings.md](findings.md) section 45.

### Base slot 15: the parameter block

**Confirmed on thirteen containers across four architectures**, and every length claim below is a
literal in the firmware rather than a count of what the corpus carries.

```
+0x00  u8   count
+0x01  u24  address[count]
```

and at each address a group

```
+0x00  u8   entries
+0x01  u16  value[entries]
```

The groups are laid out in one run immediately before the pointer array. On arch 8, arch 9 and
arch 14 the run is exactly the sum of the groups; arch 12 has twelve spare bytes in it.

Those twelve sit **between the tenth and eleventh group**, they are `ff 00 ff 00 00 00 00 00 55 55
55 55` in all six arch 12 containers, and no `u24` in any container names their address. They belong
to this section by position, and **the firmware reaches them by overrunning group 9 on purpose**:

| bytes above group 9's first entry | read by | as |
|---|---|---|
| 12 to 15 | `0x249A0` | the fourth pair of device levels, at four bytes a band |
| 16 to 23 | `0x2492E` | a table of two bit fields, four to a byte |

So group 9 is in effect a 24 byte structure whose header declares only its first six `u16` values. A
writer reproduces all twelve bytes; an editor that changed the declared length would move both
readers' targets without any check refusing it. `docs/findings.md` sections 84, 103 and 106.

**The firmware demands the section's count and every group's length.** The count is 9 on arch 14
and 11 on arch 12. Each group is read only when its length matches the number that build expects,
and otherwise the subsystem silently uses constants compiled into the firmware:

| group | arch 14 | arch 12 |
|---|---|---|
| 0 | 1 | 1 |
| 1 | 4 | 6 |
| 2 | 1 | |
| 3 | 4 | |
| 4 | | 6 |
| 5 | 14 | 16 |
| 6 | 14 | 16 |
| 7 | 1 | 1 |
| 9 | | 6 |
| 10 | | 8 |

A blank is a group with no call site on the image that was read, not a length of zero. Arch 8 and
arch 9 are absent because no firmware for either exists here. `gspm.PARAMETER_GROUP_COUNTS` carries
this table and `gspm.parameter_group_lengths_match` checks a container against it.

**A group index is not portable between architectures.** Arch 9's five groups line up with a subset
of arch 12's in a different order, which is unlike every other indexed structure in this format.

What the arch 12 groups hold, from the routines that read them. Every default below is a literal in
the firmware, used when the length does not match:

| group | what it is | the Harmony One's values | default |
|---|---|---|---|
| 0 | the display light fade's per step delay | 44 | 50 |
| 1 | entries 2 to 5 are four display light levels, 0 to 27; entries 0 and 1 are read and discarded | 38, 38, 20, 20, 26, 26 | 9, 16, 24, 27 |
| 4 | three threshold pairs, two apart, turning the four sample sum of analogue channel 1 into a band 0 to 3 with hysteresis | 96, 98, 308, 310, 768, 770 | none |
| 5, 6 | two measurement to level curves over analogue channel 0, eight levels, chosen by the charger input on `PORTB` bit 1: group 6 when it is clear | 3000 to 4051, and 3000 to 4170 | none |
| 7 | a timeout in seconds, handed to the one second scheduler | 0 | 10 |
| 9 | four pairs at four bytes a band, both halves sent to the I2C device at address 0x60 as its registers 2/3 and 4/5; band 3's pair is in the spare run | 16, 16, 64, 64, 128, 128, then 255, 255 | 64 |

A level above 27 is *silently refused* by the setter, which is a rail: 27 is the number of distinct
`CVREF` voltages the part can produce, and the ladder that maps a level to one is in the firmware.

**Groups 5 and 6 are battery millivolts**, confirmed rather than conjectured. On arch 12 the value
walked against them is `mean * A + ((mean * B) >> 16)` where the mean is eight samples of analogue
channel 0 and `A` and `B` are two `u16` in the remote's own internal page `0xFF`, giving 4.284 mV a
converter count, and the firmware compares the result against the literal 3400. `findings.md`
section 105.

What analogue channel 1 measures is *not established*. Groups 2, 3, 8 and 10 are *not established*.
The thirteen two bit fields are channels of the I2C device at address 0x60, and **which device that
is is not established**: thirteen channels of three states, two eight bit level registers, an enable
pin and no readback, `findings.md` section 106.

Read with `gspm.parameter_groups`. [findings.md](findings.md) sections 44, 103 and 105.

### Base slot 12: the timer table

**Confirmed on ten configs across four architectures**, with three more as a negative case.

```
+0x00  u8   count
+0x01  u24  address[count]
```

and at each address a seven byte record

```
+0x00  u8   kind, 1 for the one second scheduler
+0x01  u24  duration, in seconds for kind 1
+0x04  u24  the single action list instruction queued when it expires
```

A timer is started by opcode `0x1F` with the operand's high byte `0xEB`, and cancelled by the same
opcode with `0xEA`; the operand's low byte is the index into this section in both. **The set of
indices started is exactly `0` to `count - 1` in every config**, counts from 5 to 30, and no
instruction names a record that is not there. The three safe mode containers carry no records and
issue neither instruction.

The firmware runs at most **four** timers at once, so a config with thirty records describes thirty
possible timers rather than thirty concurrent ones, and starting a fifth is a silent no-op.

**A timer fires exactly one instruction**, not a list. Anything longer has to be a single
instruction that runs an action list, which is what 116 of the corpus's 159 records do. The
scheduled kind also **clamps the duration to sixteen bits**, so a value above 65535 becomes 65535
rather than an error. Both are rails for a writer.

Kind `0` is counted down in software instead and no config in the corpus uses it, so its rate is
*not established*.

Read with `gspm.timers` and `gspm.timer_reference`. [findings.md](findings.md) section 43.

### Base slot 16: the number sender

**Read from three firmware images and unexercised by any container.** All twelve containers in the
corpus carry a count of zero here, so the layout below comes from the code alone and no sample
confirms it.

```
+0x00  u8   count
+0x01  u24  address[count]
```

and at each address

```
+0x00  u8   flags
+0x01  u24  base, added to the value before conversion
+0x04  u8   minimum number of digits
+0x05  u24  instruction queued first
+0x08  u24  instruction queued last
+0x0B  u24  instruction queued before the digits when the value is long enough
+0x0E  u24  first digit table
+0x11  u24  middle digit table
+0x14  u24  last digit table
```

Each digit table is ten three byte instructions indexed by the digit. The firmware adds `base` to
the value it is given, converts the sum to packed decimal by subtracting `10000`, `1000`, `100` and
`10` in four loops, and queues one instruction per digit, taking it from the first, middle or last
table according to where the digit sits. `flags` bit 2 makes the prefix instruction fire at a
hundred and bit 1 at ten; with neither, it never fires. Bit 0 makes the prefix consume a digit.

The fourteen bytes read in sequence end exactly where the first of the three fixed pointer offsets
begins, which is the closure for this layout, and the routine is identical on the 700, the 600 and
the One.

Read with `gspm.number_senders`. [findings.md](findings.md) section 39.

### Base slot 13: the state variable table

**Confirmed on ten configs across four architectures**, and named from the firmware routine that
loads it rather than from what the bytes look like.

```
+0x00  u16  count           how many variables
+0x02  u16  narrow          how many are stored as one byte
+0x04  u16  wide            how many are stored as two bytes; narrow + wide == count
+0x06  u16  narrow again    the same number a second time, purpose unestablished
+0x08  u24  entry[count]
```

`8 + 3 * count` equals the section's length exactly, in all ten. Counts run from 24 to 94.

The firmware copies this into RAM as two runs, `narrow` single bytes followed by `wide` pairs, so
**an index below `narrow` is a one byte variable and an index at or above it is a two byte one**.

The opcodes that index it are `0x70`, `0x71` and `0x72`, in the operand's low byte. Every index in
every config is below that config's own `count`, and the halves are respected exactly:

| opcode | uses | indices |
|---|---|---|
| `0x71` | 2164 | always below `narrow`, matching a handler that compares a byte |
| `0x70` | 146 | always at or above `narrow`, matching a handler that compares the sixteen bit accumulator |
| `0x72` | 501 | either half |

**Each pointer lands on a record declaring the variable's values.** Nothing states its length, so
the rule is the reader:

```
+0x00  u16  an initial value, at most `max` in all 735 records and zero in most. *Unconfirmed*
+0x02  u16  max             the highest value this variable takes
+0x04  u16  count           how many transitions follow, not how many values there are
+0x06  u8   unestablished
+0x07       transition[count], eight bytes each
```

and a transition

```
+0x00  u8   zero, in all 551 of them
+0x01  i16  from, or a negative sentinel: -2 and -3 both occur
+0x03  i16  to, or -2
+0x05  u16  operand         these three bytes are one action list instruction
+0x07  u8   opcode
```

So a record is `7 + 8 * count` bytes. Across 14 containers and four architectures, 610 of 627
consecutive records end exactly where the next begins and **none overruns**, and claiming them in
the byte accounting produces no overlap with any other structure.

`max` is what **base slot 0's name for the variable ends in, plus one**, in all 250 named variables
of the corpus, which is what settles it. Every non negative `from` and `to` is inside `0` to `max`,
every instruction has a reading, and every one of the 439 that name a base slot 10 list by index
names one that exists. A record either carries no transitions or covers every value of the variable
the same number of times, so `count` is a multiple of `max + 1`: once per value in 83 records, twice
in two and four times in one. [findings.md](findings.md) section 86.

Read with `gspm.state_table`, `gspm.state_records` and `gspm.state_index`; `stateTable` and
`stateRecords` in `packages/codec`.
[findings.md](findings.md) sections 35, 60 and 86.

### Base slot 5: the infrared database

**Confirmed on ten configs across four architectures.** Two levels of pointer array over records of
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
record's durations. [findings.md](findings.md) section 61.

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

The count is **1 in every record on arch 12, arch 14 and most of arch 9**, and that case is exactly
the 21 byte header with two pointers and a trailing NULL that section 61 described. On arch 8 it is
**2 in exactly 37 records of every config**, whatever else the config holds, and on arch 9 in 61.
A two group header is 30 bytes and names up to six blocks. `620 + 208 + 21` is the whole of a
typical Harmony One record, since arch 12 has one group everywhere.

**A block ends at a zero word, and that is not a validity check.** Over 3490 blocks in eleven
configs the terminator agrees exactly with the region's tiling 3357 times, stops short 133 times,
all on arch 8 and all padding, and overruns never. But arch 9's 277 blocks all find a zero word too
and **not one is in the right place**, so what separates a block this reading covers from one it
does not is the **class byte**, which is 1 here and 5 there.

#### Class 5 shares the header, and behind it spells a code from a dictionary

Arch 9's 200 records all read class 5, and every structural property of the header above holds on
every one of them: the class byte at +7, the record's own start at +8 seven bytes back, both `u24`
pointing backwards and staying inside the area, the third `u24` NULL, and no two headers
overlapping. So **the header is one structure across both classes** and a reader can claim it,
though arch 9 carries 61 records with two pointer groups, so its length is read rather than
assumed, section 75. `gspm.ir_region` gives the whole area, from the lowest backward pointer to the end of the
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
135 times in 199. [findings.md](findings.md) sections 65 and 82.

**All three levels are shared, harder than anywhere else in the format.** Two records name one body,
up to 206 bodies name one symbol table, and a symbol block is reused by every code with that pulse
pair in it. Nothing here can be edited in place.

**Blocks are shared.** A record may carry a bare header whose pointers name a block another record
also names, so one duration stream can serve several codes. A writer cannot edit a block in place
without checking who else points at it.

49 groups and 3058 record pointers checked: the lead byte is zero every time, each group is exactly
`3 + 3 * count` bytes and groups are packed adjacently, every record pointer is inside the
container, and none of them is an action list address.

**The number of groups equals the number of distinct high bytes a `0x7C` operand takes**, in all
ten configs, with the group indices contiguous from zero. The count runs from 1 to 7, and the
unprogrammed Harmony One is the minimal case at 1.

The duration run has bit 15 strictly alternating, and is framed as `header mark, header space,
bits * (mark, space), trailing mark, trailing gap`. So the run from the first mark is
`2 * bits + 4` values, which holds for all 2137 framed records in the corpus.

| header mark / space | records | bits, from the run length |
|---|---|---|
| 8990 / 4490, 9000 / 4500 | 1052 | 32, every one |
| 3480 / 1730, 3460 / 1730, 3364 / 1682 | 313 | 48, every one |
| 4500 / 4500, 4485 / 4485 | 168 | 32 |
| 4000 / 4500 | 111 | 24 |

Those header timings name NEC and Kaseikyo, whose bit counts are 32 and 48. Two quantities computed
from opposite ends of the record, agreeing with no exception.

**Not every record uses this encoding.** The whole arch 9 sample uses something else, and the 880
has a second population with headers near 303 / 310. The firmware routes four infrared encoding
classes; this is one.

Read with `gspm.ir_groups`, `gspm.ir_pulses` and `gspm.ir_frame`. The reader locates the duration
run rather than assuming a fixed offset, because some records carry a prefix of `0x7FFF` words
whose length varies.

*What a group is, and what the 14 byte header holds, are not established.*
[findings.md](findings.md) section 32.

### Base slot 8: key press bindings

*This was an unconfirmed candidate, described as "per assignment records, possibly bytecode" on the
strength of being the only section whose size changed in the controlled pair. It is read now.*

```
+0x00  u8 count; { u16 operand; u8 opcode }[count]      one ordinary action list
       then repeated to the end of the section:
         u8 count; { u8 tag; u16 operand; u8 opcode }[count]
         0x00 bytes between records are skipped
```

An entry is an action list instruction with a tag byte in front. The walk consumes the section
exactly, on seven configs across architectures 8, 9, 12 and 14, and a walk that starts one byte out
desynchronises immediately, which is what makes consuming it the validation.

**The repeated records are the mode page lists**, section 83. Every mode page's list is inside this
section in all nineteen containers, and the leading action list plus those lists tile the section
exactly, so the walk above and the tagged list reading of base slot 6 are two names for one
structure: a record is a narrow tagged list, and the `0x00` it skips is the wide form's lead byte.
The leading list is the section's own and is `1 + 3 * count` bytes, 4 on arch 8 and arch 12 and 34
on arch 9 and arch 14.

**The tag is a key press.** Under the same `EVENT_MASK` and `SCAN_MASK` split as the key table,
every tag in every sample is a press, `0x80`, and the scan codes are model specific: 2, 8, 9 and 34
on architecture 14; 43, 44 and 48 to 53 on architecture 12; 30, 31, 38 and 39 on architecture 9;
5 to 8, 44 to 46 and 48 on architecture 8.

**The controlled pair closes it.** The owner's account of the one change includes two new additional
buttons. Slot 8 grew by 8 bytes, an entry is 4, the record count is unchanged, and exactly one
record went from two entries to four. [findings.md](findings.md) section 27.

Slot 8's `0x7F` instructions also call **every** action list in the final packed run, exactly once
each, which is the only thing that reaches those lists.

Still established negatively, and still worth stating: **the key table is not the button to action
map.** It is byte identical across that pair while the described change reassigned buttons. Slot 8
is where a press meets an action list; the key table is something else.

### Slot 0: the only `0xFEED` frame

Exactly one frame per container, always at slot 0. Confirmed on sixteen samples across four
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
`docs/host-client.md` for the provenance rule and `tests/test_gspm.py` for the corpus statement.

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

The frame therefore occupies `length + 2` bytes, and in all sixteen samples the slot 1 pointer
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

Confirmed on sixteen samples spanning architectures 8, 9, 12 and 14. Every one has its
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
the two that do not carry 59 and 73, each unallocated in Logitech's classic software table and each
the next free number inside its own platform's block. So it names a model the way a skin does, and
what selects 54 over 59 for one remote is **not established**. The high byte is `0x0D` in every
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
+0x05  u8       day of month   1 to 31
+0x06  u8       day of week    0 = Saturday, 1 = Sunday, ... 6 = Friday
+0x07  u8       month          0 = January
+0x08  u8       year           offset from 2000
+0x09  u16      0xEFBF         terminator
```

Confirmed on sixteen samples across all four architectures, and the field assignment is a search
result rather than a reading: of the 24 permutations of the four date bytes, times two month
bases, times seven weekday offsets, **exactly one is consistent with every sample**. See
`docs/findings.md` section 21.

The day of week is not an independent field. It equals **days since 1 January 2000, modulo 7**,
which is why 0 means Saturday: that date was one. So the weekday encoding and the year offset
agree on a single epoch, and that agreement is the numeric closure behind this whole reading. A
record whose weekday disagrees with its date is refused rather than reported, in both parsers.

The cookie pair is **unique in every blob**, unlike slot 0's `0xFEED`, which occurs about once
per 64 KiB by chance. So this record can be located without a length field.

**The section is fourteen bytes and the record is eleven.** The three bytes after the terminator
are zero in all nineteen containers. The record closes at `0xEFBF`, so those three are the
section's own tail rather than part of the framing, and a writer emits them as zeros.
`docs/findings.md` section 84.

**What the arch 12 firmware does with it is established**, section 111, and it is two things.

**It initialises the remote's clock from it, at every boot.** Measured: a Harmony One was power cycled
and read 90 seconds later, and it held this record's date exactly and its time plus 90 seconds. So the
clock's seven data memory bytes at `0x108` to `0x10E` carry **this record's encoding field for field**,
including the zero based month and the Saturday epoch weekday. The code that performs the copy has not
been located, so the mechanism is behavioural; the field pairing is not, being read out of the
subtraction below.

**And it subtracts the record from that clock**, accumulating the difference in seconds and in days, so
the remote can compute how long ago the config was built. The subtraction skips the weekday on both
sides because the firmware derives it.

**A writer stamps this record with the moment it writes.** A stale timestamp is a wrong clock on the
remote's screen after every power cycle, by exactly the staleness. Reproducing an input config's
timestamp is right for a round trip and wrong for a save, and that distinction is executable:
`FIELD_RULES` in `packages/codec/src/edit.ts` lists every field whose treatment on a write is not
"carry it unchanged", `applyEdits` is the faithful path and `saveEdits` stamps. **`emit.ts` is neither
and is deliberately the round trip side**, since its whole measurement is byte equality with its input.
The record is encoded in exactly one place, `clockRecordFields` in `packages/codec/src/gspm.ts`, which
is the inverse of `clockRecord` and asserted to be on all eighteen containers; the day of week is
computed there and never taken from a caller, since both parsers refuse a record where it disagrees.

Two things worth having for free:

* Every config in the corpus can now be dated, which is provenance nobody has to record by hand.
  The two Harmony One factory configs, one dumped off a remote and one extracted from firmware
  3.4, agree to the second at 2007-10-24 02:22:08, and the factory config inside Harmony 700
  firmware 2.8 reads 2009-04-15, both matching when those models shipped.
* The application gets a "built on" field for a config it reads over USB, where there is no EZHex
  header to take one from.

### Six sections are arrays of three byte pointers

Recognised structurally rather than tabulated. A section is such an array when a `u8` or `u16`
count at its start satisfies `width + 3 * count == section_length` exactly:

```
+0x00  u8 or u16   count
       u24[count]  absolute flash addresses, little endian, ascending
```

Three bytes, not four, because 24 bits covers the config region with room to spare and the
arrays are large: slot 10 of the Harmony 700 config holds 8037 entries, where a fourth byte
would cost 8 KiB in that one section.

That test picks out **the same six base slots in all nine config samples** across four
architectures, and rejects every other section. Every entry lands inside the container, and
every array ascends.

The confirmation that these are pointers rather than a shape that happens to fit is the Harmony
700 pair: two configs of one remote where the whole layout shifted by 50 bytes and then 58. In
five of the six arrays every single entry moved by exactly that shift, and the shift is known
independently, from the container's own pointer table. Slot 10 is the exception, and it is an
informative one: its entries moved by fourteen different deltas, because it addresses the region
that was rewritten rather than merely displaced.

| Base slot | count width | entries, 700 | 600 | 525 | One | arch 8 |
|---|---|---|---|---|---|---|
| 5 | `u8` | 6 | 4 | 4 | 5 | 3 |
| 7 | `u16` | 17 | 15 | 5 | 18 | 14 |
| 10 | `u16` | 8037 | 4955 | 487 | 4277 | 1318 |
| 11 | `u16` | 5711 | 3810 | 22 | 59 | 28 |
| 12 | `u8` | 9 | 5 | 5 | 30 | 19 |
| 15 | `u8` | 9 | 9 | 5 | 11 | 9 |

What most of them point at is **not yet established**. The counts are suggestive (slot 10's
thousands of entries against slot 5's handful) but a count is not a label. Two things are known:

* **Base slots 5, 7 and 15 index the section immediately before them.** Every entry of base slot 5
  lands inside base slot 4, every entry of base slot 7 inside base slot 6, every entry of base slot
  15 inside base slot 14. All entries, all five configs measured, four architectures. Base slots
  10, 11 and 12 point elsewhere, mostly into the large region ahead of slot 0.
* **Base slot 10 is the action list address table**, below.

### Base slot 10: action lists

Each entry addresses an action list, and a list is:

```
+0x00  u8    count
       { u16 operand; u8 opcode }[count]
```

So a list occupies `1 + 3 * count` bytes, and the lists are packed back to back: in every config
measured, all but exactly **four** consecutive table entries sit exactly `1 + 3 * count` apart.

| Sample | lists | instructions | packed pairs |
|---|---|---|---|
| 700 user config, arch 14 | 8037 | 19651 | 8032 of 8036 |
| 600 user config, arch 14 | 4955 | 12194 | 4950 of 4954 |
| One user config, arch 12 | 4277 | 11640 | 4272 of 4276 |
| 88x class config, arch 8 | 1318 | 3311 | 1313 of 1317 |
| 525 config, arch 9 | 487 | 1043 | 482 of 486 |

The four exceptions per config are not noise. The lists are packed into exactly **five contiguous
runs**, so there are four places where the next list is elsewhere entirely; each of those gaps is
tens of kilobytes, never an off by one.

That agreement is what makes the reading believable rather than merely consistent: the addresses
come from the pointer table and the counts come from the lists, so they are unrelated parts of the
file that turn out to describe the same layout. On the 525 the numbers also match what
harmony-decompiler reports independently, 487 lists with 482 of 486 packed.

#### Opcode `0x7F` takes an action list index

**Confirmed on arch 14**, from the operand ranges rather than from the firmware.

| | 700 | 600 |
|---|---|---|
| uses | 2795 | 1465 |
| distinct operands | 1576 | 834 |
| operand range | 52 to 7655 | 23 to 4755 |
| action lists in the config | 8037 | 4955 |
| the five runs end at index | 17, 4323, 5147, **7655**, 8036 | 11, 2721, 3154, **4755**, 4954 |

Every operand is a valid index into the table, and the largest is **exactly the last index before
the final run**, on both configs, at two different values. Operands never reach into that final run
at all: 381 lists on the 700 and 199 on the 600 are addressed by the table and never named by a
`0x7F`, so those are entry points something else reaches.

That is a boundary landing on a structure derived from a different part of the file, twice, which is
what makes it a reading rather than a range that happens to fit. It also matches what
harmony-decompiler reports for arch 9, where `0x7F` is "run an action list", so the meaning
transfers across architectures even though the wider inventory does not.

#### The final run belongs to base slot 8

The lists a `0x7F` never names are not orphans. Base slot 8 holds a `u16` reference to **every** list
in the final run and to no list outside it: 381 references covering 7656 to 8036 on the 700, and 199
covering 4756 to 4954 on the 600, which is a bijection. A section that size would hold about twenty
values in that band by chance.

Slot 8's own record layout is **not established**. The references are not evenly spaced, so it holds
variable length records rather than a table, and whether it also names lists in the other four runs
cannot be told by scanning, because that index range is wide enough for coincidences to swamp it.
`docs/findings.md` section 26.

#### `{0x7A a; 0x6C b}` is most of an arch 14 config

**Confirmed on architecture 14.** 2832 of the 700's 8037 lists and 1888 of the 600's 4955 are two
instruction lists of exactly this shape, which is also every `0x6C` in each file: the opcode occurs
nowhere else.

Partitioned by the `0x7A` operand they form six groups on the 700 and four on the 600, each of
exactly **472** lists, and every group carries the **same 472 values** of `0x6C` once each. Those
472 are identical on both remotes:

```
451 values  0 to 450, contiguous
 21 values  0x8000 to 0x8014, which is 0 to 20 with bit 15 set
```

A set that does not change between two owners' configs on two models is a **vocabulary the format
carries**, not user data. So most of base slot 10 is the complete cross product of a small per
config set with that vocabulary, one list per pair.

*A device selector and a function id would fit the counts, since the 700 supports six devices and
its config has six groups, and the `0x7A` operands look like database identifiers rather than
indices. Not established.*

Architecture 12 has an analogous pair, `{0x75 a; 0x7E b}`, with one group and a value set that is
neither the same size nor contiguous, so the structure does not transfer as it stands.
[findings.md](findings.md) section 28.

#### `0x7C` is a per device quantity, capped at 100

**Confirmed on four architectures, and on two firmware images.** The operand is
`{ u8 group; u8 value }`: the group is an infrared group, and in 21882 uses across twelve
containers it is always one the config's infrared table has. The value is 0 to 100 and never more.

**The cap is enforced by the firmware, not by convention.** `0x7C`'s handler is `0x7D`'s handler
with one bit set: `0x13102` against `0x130E0` on the Harmony 700, `0x26F96` against `0x26F74` on
the Harmony One, sharing a worker. Both hand the operand to the same infrared queue, a circular
buffer of 30 bytes holding `{ u8 tag; u8 value }` entries where the tag is `kind << 4 | group`;
`0x7C` sets bit 6 of the group byte, which marks the entry as a quantity rather than a send, and
asks for priority 1 where `0x7D` asks for 2.

That bit changes what enqueueing means. A quantity folds into the last entry of the queue when the
tag matches: the larger value wins and the smaller is dropped. **The fold is refused when the
queued value is already 100**, which pushes a second entry instead, and that is the mechanism that
makes a quantity above 100 expressible at all. [findings.md](findings.md) section 70.

Two rails follow. A writer must **spell out a value above 100** rather than emit it whole, and a
config can hold at most **sixteen infrared groups**, because the tag's low nibble carries the
group. The corpus tops out at seven.

Every use is in one of two shapes: lists made of nothing but `0x7C`, or as the third instruction of
`{0x7F, 0x7D, 0x7C}`. In a pure list of length `k`, every operand but the last has low byte 100 and
the whole list keeps one group, so it reads as `(k - 1) * 100 + n`:

| length | lists per group | remainders | value |
|---|---|---|---|
| 2, 3, 4 | 100 each | 1 to 100 | 101 to 400 |
| 5 | 50 | 1 to 50 | 401 to 450 |

The union is 101 to 450 per group, contiguous, each value once. **450 is also the top of the fixed
`0x6C` vocabulary**, which is 0 to 450, reached from a completely different direction. So the two
are the same enumeration: one instruction covers up to 100, more than one spells out the rest.

*What the enumeration counts is not established.* The firmware says it is per device, bounded at
450 in practice, consumed by the infrared sender, and folded by taking the larger of two
consecutive requests, which is how a duration behaves and not how a repeat count does. The unit
itself wants the timer that drains the queue. [findings.md](findings.md) sections 29 and 70.

#### `0x6C` writes a device record, and never alone

**Confirmed on three arch 14 containers.** Every use is the second half of `[0x7A key, 0x6C value]`
and the list holding the pair is those two instructions and nothing else, 7552 of 7552. Arch 8, 9
and 12 do not use the opcode.

```
0x7A key          load the sixteen bit accumulator
0x6C value        look the accumulator up to a record, write the value into it
```

Bit 15 of the value is **a field selector**, split off by the firmware before the store. Per key the
corpus enumerates field 0 from 0 to 450 and field 1 from 0 to 20, contiguous and complete, with
nothing between `450` and `0x8000`.

**The number of distinct keys is the number of infrared groups**, 6 and 6 and 4, so a key is a
device. Keys occur nowhere else in the container, so they are identifiers the generator brought in
rather than offsets into it. *What the two fields are is not established*, but field 0's range is
the same 0 to 450 that `0x7C` carries by a different route. [findings.md](findings.md) section 71.

#### `0x07`, `0x0F`, `0x1F` and `0x3F` carry a second opcode field in the operand

**Confirmed on four architectures.** These four opcodes never carry an operand below `0xC000`, and
every other opcode in the inventory does. 10381 uses of the four, no exception, in ten configs
holding 85962 instructions between them.

| opcode | operands, signed, over the whole corpus | distinct | uses |
|---|---|---|---|
| `0x07` | `-14` to `-1` | 12 | 4587 |
| `0x0F` | `-192` to `-29` | 10 | 91 |
| `0x1F` | `-6400` to `-241` | 247 | 5329 |
| `0x3F` | `-16384` to `-2510` | 48 | 374 |

The lowest operand any of them takes is exactly `0xC000`, which is `-16384`. No value is ever
carried by two of the four. The band is not exclusive in the other direction: `0x7A` and `0x79`
also reach above `0xC000`.

`0x07` and `0x0F` draw from a **vocabulary fixed per architecture**: both configs of arch 14, of
arch 12 and of arch 8 give byte identical sets. `0x07` is `-14, -13, -11, -10, -9, -4, -3, -1` on
arch 14 and `-10, -9, -8, -7, -5, -4, -3, -1` on arch 12 and arch 8. `0x1F` and `0x3F` keep most of
their values across a pair and add config specific ones.

~~**Consequence for a codec, ahead of the meaning.** An operand at or above `0xC000` is a reference
into something the firmware supplies, not an index the generator assigned.~~ **The advice was
right and the reason was wrong**, section 72. The operand is not a reference: it is the rest of the
opcode. Below `0x65` the dispatcher stops testing the opcode after five ranges and tests a byte of
the operand instead, the **high** byte for opcodes from `0x1F` up and the **low** byte below it, and
`0xC000` is simply the bottom of the lowest band it tests. Carry the operand through unchanged all
the same, and for a stronger reason: renumbering it changes the instruction.

Two consequences follow. **Opcodes below `0x07` do nothing**: the dispatcher returns before reading
the operand, and the corpus's 3053 `0x00` instructions all carry operand zero, so they are three
zero bytes an emitter must keep. And ~~**one instruction can span four**: opcodes `0x3F` to `0x64`
with an operand high byte in `0xD0` to `0xDF` consume the next three off the queue.~~<!--superseded--> **it is two,
not four**, section 73: `0x0E82C` pops **one byte** off the queue, not one instruction, so three
calls take three bytes. `0x3F` with a high byte in `0xD0` to `0xDF` is a **six byte instruction**
whose second half is an ordinary instruction read as data, `0x7F` in 40 of its 60 uses.

**Only five opcodes occur below `0x65` in the whole corpus**, `0x00`, `0x07`, `0x0F`, `0x1F` and
`0x3F`, one per range and each the top of its own, which is `2^n - 1`. What the low bits would mean
is unconfirmed because nothing exercises them.
[findings.md](findings.md) sections 31, 72 and 73.

**The bands are read, and they are not one table across architectures.** Every branch of both
dispatchers is followed to its `RETURN` in section 73. The full band tables are there; what a
codec needs from them is this:

| opcode | band, on | what the bands are |
|---|---|---|
| `0x1F` | operand high byte | a register machine: a byte register, a sixteen bit accumulator, load and arithmetic on each, and load and store against the base slot 13 state variable table |
| `0x07` | operand low byte | thirteen operations with no argument: a push and pop stack, timer cancellation, clock and state variable reads |
| `0x0F` | operand low byte | peripherals and the **flash journal**, plus register moves. Little to do with the config: its `0xE0` band appends bytes to a region of the external flash, section 108 |
| `0x3F` | operand high byte | four bands, one of which is the six byte instruction above |

**`0x3F`'s lowest band is `0xB0` on arch 14 and `0xC0` on arch 12, and the routines differ.** This
is the only structure in the format so far that is not one table across architectures,<!--superseded--> so a `0x3F`
band **must not** be ported between them. The failed prediction that found it is in section 73.

**It is one of two**, section 107: the opcode block `0x65` to `0x6E` is arch 14 only, below.

Bands the firmware tests and then ignores are part of the specification, not gaps: `0x1F` below
`0xE0`, `0x0F` bands `0xF0` and `0x50` to `0x7F`, and `0x3F`'s `0xF0` nibbles 3 and 5. The corpus
uses several of them, 84 times for the last alone.

**The four opcodes above are floors, not values**, section 108: the dispatcher compares the opcode
against `0x3F`, `0x1F`, `0x0F` and `0x07` in descending order, so `0x20` reaches the same handler as
`0x1F` and `0x40` the same as `0x3F`. Every config in the corpus emits only the four canonical values,
and a writer should keep to them.

**`0x1F` band `0xFC` is not one of them, and used to be listed as one.** The dispatcher's arm for it
really does nothing, and the instruction never reaches the dispatcher: the fetch tests for opcode
`0x1F` with operand high byte `0xFC` first, on all four architectures, and delivers the low byte to
the innermost active handler that accepts it instead. It is how the firmware raises its own events,
and **no config in the corpus emits one**. Section 104.

#### Arch 12's `0x3F` band `0xC0` resolves by selector

**Confirmed on two arch 12 configs and two images**, 106 uses each. The operand carries three
fields, `{ bit 0; bits 1 to 3; bits 4 to 8 }`, and the third is a five bit selector, so selectors 0
to 15 arrive with high byte `0xC0` and 16 to 31 with `0xC1`. The handler accepts fifteen values and
drops the other seventeen, and the corpus uses exactly the fifteen:

| selector | what it does | uses per config |
|---|---|---|
| 17 | sets the **display's light level**: bits 1 to 3 choose one of eight states, bit 0 fades rather than snapping. States 2 to 5 take a level from base slot 15 group 1 and a pair of device levels from group 9, state 6 chooses the state from the measured band, states 0 and 1 turn it off | 68 |
| 0 to 12 | sets channel `selector` of the I2C device at address 0x60 to the two bit value base slot 15's spare run states for bits 1 to 3 being nonzero. Which device it is is *not established* | 36 |
| 16 | enables that device, `LATC` bit 5, set when bits 1 to 3 are nonzero | 2 |
| 13 to 15, 18 to 31 | nothing: the handler falls to its exit | 0 |

64 of the 68 are selector 17 state 6 without a fade. **The band's uses are identical in both One
configs**, one of which has five devices and eight activities where the other has one and one, so
nothing here varies with what the remote is set up to control. **They are the generator's fixed
initialisation sequence for the device at 0x60**, one pass setting each channel off and one setting
each on, and the firmware itself never enables that device: it only switches it off at shutdown. So a
config that omits them leaves the device disabled. `findings.md` section 106.

`actions.BAND_3F_C0_SELECTOR` extracts the selector and `actions.reading` resolves the instruction.
[findings.md](findings.md) sections 102, 103 and 106.

#### `0x75` sounds a tone

**Confirmed on arch 8, 9 and 12**, 4380 uses; arch 14 issues it never. The operand is
`{ u8 cycles; u8 half_period }`, the half period in loop iterations of seventeen instruction
cycles. At the 4 MIPS the infrared carrier gives (section 32) that is 4.25 us a step:

| operand | cycles | frequency | duration | uses |
|---|---|---|---|---|
| `0x01FF` | 1 | 461 Hz | 2.2 ms | 80 |
| `0x0FCA` | 15 | 582 Hz | 26 ms | 4238 |
| `0x4664` | 70 | 1176 Hz | 60 ms | 56 |
| `0x8C19` | 140 | 4706 Hz | 30 ms | 6 |

The whole corpus uses those four and nothing else. Counting the loop's own overhead moves the
highest by about 8% and the lowest by under 1%. **`0x3F` with high byte `0xF3` gates it**: the
generator returns without playing when that byte is zero. [findings.md](findings.md) section 74.

#### State variables 3, 5 and 6 are the date

**Firmware defined, not assigned by the generator.** `0x07` with high byte `0xF8` steps a calendar
held in them: day, month and year. The month length table has the four thirty day months at zero
based 3, 5, 8 and 10, February apart, and the month is reduced modulo 12. The same three offsets
from the state variable base appear in both firmwares, `0x900` on arch 14 and `0x108` on arch 12.

A writer must not reuse those indices. The corpus agrees: the value counts of the first twelve
base slot 13 records are identical across all four architectures.
[findings.md](findings.md) section 74.

#### `0x80 | n` writes state variable `n`

**Confirmed on twelve containers across four architectures**, 3011 uses. The dispatcher clears bit
7 and hands the instruction to one routine, which indexes the base slot 13 table and writes the
operand into it.

```
opcode  0x80 | index      index into base slot 13, 0 to 0x7F
operand the value
```

The **width comes from the table**, not from the instruction: an index below base slot 13's
`narrow` count stores one byte and the operand's high byte is discarded. Two closures: no
instruction names a variable the table does not have, and **none of the 2947 narrow writes carries
a high byte**, which is the one an emitter has to respect.

`0x1F` bands `0xEE` and `0xED` reach the same store with the index in the operand instead, so an
index above `0x7F` is reachable only through those. [findings.md](findings.md) section 73.

#### `0x73` runs a screen program

**Confirmed on eight containers**, 3927 uses, all arch 8, 9 and 12; no arch 14 config issues it.
The operand indexes base slot 11, the same table the screen language programs live in, and
**nothing in the corpus names a program outside it**. [findings.md](findings.md) section 73.

#### `0x7D` sends an infrared code

**Confirmed on ten configs across four architectures.** The operand is `{ u8 group; u8 index }`
into the base slot 5 table above, and **the set of distinct operands is exactly the set of valid
`(group, index)` pairs**: every record is reached and nothing outside the table is named, 3058
records and 3058 distinct operands over the ten configs. Onto rather than one to one, since a
record can be sent from more than one list.

`0x7D` appears in exactly one list shape per config, `{0x7F, 0x7D, 0x7C}` on arch 14 and
`{0x7D, 0x7C}` on arch 8, 9 and 12, and in all 3164 of those lists the `0x7C` operand's high byte
equals the `0x7D` operand's. So the grouping is shared between the infrared database, `0x7C` and
`0x7D`. The accompanying `0x7C` value takes only `0, 1, 2, 4, 5, 10` across the corpus and is 1 in
2260 of the 3164 sends, which is a count and not an identifier.

Read with `gspm.ir_reference` and `gspm.ir_references`.
[findings.md](findings.md) section 33.

#### The interpreter, from the firmware

**Read out of two arch 14 images**, the Harmony 700 2.8 and the complete Harmony 600 0.2. This is
what the opcodes are executed by, so it constrains every reading of them.

An action list is spooled into a **circular queue of 120 bytes, exactly 40 three byte
instructions**, and drained by a separate loop. Same size on both images. The host can push into
the same queue over USB, which is what `MISC_QUEUE_ACTION` is for.

The dispatch is a **binary search on the opcode**, not a jump table and not an `XORLW` chain. Its
boundaries:

| range | handling |
|---|---|
| below `0x65` | a second dispatcher, read in full in section 73. Five distinct opcodes, 12462 uses |
| `0x65` to `0x7F` | individual handlers, twenty distinct opcodes, 83359 uses |
| `0x80` and above | **one routine**, with bit 7 stripped: a state variable write. 55 distinct, 2603 uses |

Placed by their handlers:

| opcode | meaning |
|---|---|
| `0x7A` | load the sixteen bit accumulator with the operand |
| `0x79` | add the operand to the accumulator |
| `0x78`, `0x77` | ~~two more accumulator operations, through helper routines~~<!--superseded--> **multiply and divide**, section 107: one 16 by 16 multiply and one restoring division, `0x78` taking the product's low sixteen bits and `0x77` the quotient |
| `0x7B` | build an instruction from a runtime byte and push it back on the queue |
| `0x71` | **eight operations on a state variable**: low byte indexes it, low nibble of the high byte selects, left hand side is a byte variable. Six comparisons and two updates, section 107 |
| `0x70` | the same eight, with the accumulator as the left hand side |
| `0x72` | **map a state variable's value**: low byte a state variable, high byte a base slot 14 record |
| `0x6D`, `0x68` | accumulator **shifted left** or **right** by the operand's low byte; a count of zero is a defined no-op |
| `0x6B`, `0x6A`, `0x69` | accumulator **AND**, **OR**, **XOR** operand |
| `0x6E` | accumulator **modulo** the operand: the same division as `0x77`, taking the remainder instead of the quotient. Arch 14 only, section 107 |
| `0x6F` | **nothing**, with a mechanism: the handler tests the accumulator for zero and both arms return, section 107 |
| `0x6C` | **write a device record**: the accumulator from a preceding `0x7A` selects it, bit 15 of the operand selects one of two fields and the rest is the value, below |
| `0x67` | the third producer into the infrared queue of `0x7C` and `0x7D`, tag `0x5`. What it means is unconfirmed |
| `0x66`, `0x65` | **append to the flash journal**: `0x66` the operand's high byte, `0x65` its low byte and then its high byte. Arch 14 only, section 108 |
| `0x76` | **position the serial flash cursor** at the record its operand indexes, remembering the index so a later instruction walks forward. Which array it indexes is *not established*, section 108 |
| `0x74`, `0x75` | ~~**one instruction, not two**: the dispatcher never tests `0x75` and nothing downstream reads the opcode~~<!--superseded--> **two instructions**, section 74. Arch 14 issues neither, and the arch 12 dispatcher tests both: `0x75` **sounds a tone**, `0x74` accumulates a digit |
| `0x7C` | **a per device quantity**, into the same infrared queue `0x7D` uses, below |
| `0x73` | **run the base slot 11 screen program** the operand indexes |
| `0x75` | **sound a tone**: low byte the half period, high byte the cycles. Four operands in the corpus, 461 Hz to 4.7 kHz, below |
| `0x07` with operand `0xF8xx` | **step the date** held in state variables 3, 5 and 6 |
| `0x07` with operand `0xFFxx` | **make the next state variable write silent**, one write and no more |
| `0x3F` with operand `0xF3xx` | **the sound gate** `0x75` tests before playing anything |
| `0x80` and above | **write state variable `opcode & 0x7F`**, the operand its value |
| `0x1F` with operand `0xFFxx` | **select the current binding table entry**, low byte the index into base slot 9 |
| `0x1F` to `0x3E` with operand `0xF3xx` to `0xF6xx` | send a computed number to base slot 16 or 14, from the accumulator or from a byte register |

The comparison selector is `0` equal, `1` not equal, `2` greater, `3` less, `4` greater or equal,
`5` less or equal. Selectors `6` and `7` are not comparisons. **`0x71` uses exactly `0` to `5` and
nothing else**, over 2164 uses in ten configs, which is what made its high byte look like a group of
six. `0x70` uses `0` to `3` and also `7`, nine times.

**What `6` and `7` are is read**, section 107: the left hand side is **added to** the variable and,
for `7`, negated first and so **subtracted from** it, in both cases clamped to the range base slot 13
states for that variable. Selectors `8` to `15` reach no arm and do nothing. So the eight are six
comparisons and two updates, and the nine uses of `7` are what an arch 8 or arch 12 generator builds
a remainder out of.

The lookup all three of `0x70`, `0x71` and `0x72` index with their low byte is the **state variable
table**, base slot 13. [findings.md](findings.md) sections 34, 35, 39 and 107.

#### The arithmetic block `0x65` to `0x6E` is arch 14 only

Not one table across architectures, and the second such structure in the format after arch 12's
`0x3F` band `0xC0`. Arch 9 and arch 12 test every one of those ten opcodes in the same descending
ladder and branch to the dispatcher's exit, so the shift, the boolean operations, the device record
writer and the modulo exist on arch 14 alone. `0x6F` is **not** in the block: it is the same
do-nothing handler everywhere.

The corpus agrees without being asked: of the eleven opcodes `0x65` to `0x6F` exactly two are used
anywhere, `0x6C` and `0x6E`, both arch 14 only. A writer must not emit one for another architecture,
where it is accepted and ignored. [findings.md](findings.md) section 107.

**A zero operand to `0x6E`, `0x77` or `0x78` is defined rather than an error.** The division loop runs
sixteen iterations whatever it is given, so a divisor of zero returns `0xFFFF` from `0x77` and the
dividend itself from `0x6E`. Nothing traps and nothing hangs.

#### The rest of the inventory, not established

Arch 14's most common opcodes include `0x6C`, which never appears in the arch 9 sample, so an opcode
table derived from the 525 does not cover the remotes on the bench.

| Opcode | 700 uses | distinct operands | operand range | reading |
|---|---|---|---|---|
| `0x7A` | 2875 | 10 | 0 to 65277 | unknown, and only ten distinct operands in 2875 uses |
| `0x6C` | 2832 | 472 | 0 to 32788 | **write a device record**, arch 14 only, above |
| `0x7C` | 7272 | 600 | 1 to 1380 | **a per device quantity**, `{ u8 group; u8 value }`, above |
| `0x7F` | 2795 | 1576 | 52 to 7655 | **action list index**, above |
| `0x1F` | 1215 | 121 | 59392 to 65290 | **a register machine**, band by band, above |
| `0x7E` | 861 | 268 | 0 to 373 | **enter the mode** at this index in base slot 6, above |
| `0x7D` | 372 | 350 | 0 to 1361 | **send an infrared code**, `{ u8 group; u8 index }`, below |
| `0x07` | 230 | 8 | 65522 to 65535 | **thirteen operations with no argument**, above |
| `0x71` | 708 | 73 | 9 to 33598 | unknown, but the operand splits: bit 15 a flag, high byte a group 0 to 5, low byte always under 64 |

**Corrected here:** the paragraph below was written when `0x7E` was measured and unplaced, and it is
kept because its measurements are still the record of what the operand statistics could and could
not see. `0x7E` **is** placed, in [findings.md](findings.md) section 37: it enters the base slot 6
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

### One table, four architectures

The pointer table is the same table everywhere, with per architecture insertions rather than per
architecture meanings:

| Architecture | slots | insertions relative to the base layout |
|---|---|---|
| 9, 14 | 20 | none, this is the base layout |
| 8 | 21 | a NULL at slot 8 |
| 12 | 22 | a NULL at slot 8, and a real section at slot 18 |

So a base slot `b` sits at `b`, at `b + 1` for `b >= 8`, and arch 12 additionally pushes
`b >= 17` up by one more. `src/harmony/gspm.py` implements this as `base_slot` and `arch_slot`,
and refuses rather than guesses for an architecture whose insertions are not established.

Three independent fingerprints agree on this alignment across nine configs: the six pointer array
slots land on base slots 5, 7, 10, 11, 12 and 15; the single **one byte** section lands on base
slot 16; and base slot 18 is NULL. Any one of those alone would be arithmetic, and all three
agreeing is an alignment.

Why it is worth having: format work is done on arch 14, because there every config byte read
passes through one SPI primitive, while the remote most people own is the arch 12 Harmony One. A
section labelled on arch 14 transfers through this table instead of through a second
investigation. The one section arch 12 has and the base layout does not, its slot 18, is 2 bytes
in both One samples.

In the 1.6 MB Harmony One user config all 21 pointers land within the first 310 KiB. The
remaining 1.36 MB is reached indirectly, presumably the IR code database and the touchscreen
bitmaps.

## The key table: `LWJL`, `WLWL`

```
u8   event_code    event type in the top two bits, scan code in the rest
u16  ?             values are small and architecture dependent, meaning not established
u8   flags         meaning not established
```

An **event code is not a matrix address.** The top two bits are the event type and the rest is
the keypad scanner's own scan code:

| Bits 7,6 | Event |
|---|---|
| `00` | none, the handful of codes that are not keypad events at all |
| `01` | release |
| `10` | press |
| `11` | repeat |

Corrected: this document previously stated `0x80 | (row << 3) | col` with bit 7 marking a matrix
key, which made the arch 14 table describe a keypad that cannot exist. See
[findings.md](findings.md) section 17 for the three agreements that settle it.

| Sample | count | Shape |
|---|---|---|
| 700 user config, arch 14 | 163 | scan codes 1 to 54 in each of release, press and repeat, plus `0x06` with no event bits. `flags` is `0x00` or `0xA8`. |
| 600 user config, arch 14 | 162 | exactly 54 scan codes times 3 event types, nothing else. `flags` is `0x00` or `0x07`. |
| One user config, arch 12 | 55 | 52 press codes plus `0x06`, `0x07`, `0x2D` with no event bits. No release or repeat entries at all. `flags` is `0x7F` throughout. |
| 88x class config, arch 8 | 56 | 53 press codes plus the same three. Identical in all four arch 8 samples. |
| One safe-mode config | 2 | press of scan 47 and scan 46. A two button recovery UI. |
| 700 `Region_3` | 0 | empty |
| 525 config, arch 9 | n/a | the byte where a count would sit after `CMAH` is zero, so no table is claimed there. Arch 9 binds its keys in the mode records instead, see below |

So arch 14 enumerates all three event types for every key while arch 12 and arch 8 record presses
only. That is a real difference between the architectures rather than an artefact of the reading.

### Arch 8 and arch 12 share a canonical code ordering

47 `(event, scan)` pairs appear in both the One's table and the arch 8 table, and on that shared
subset the two list them in the **same order**, with exactly one adjacent transposition: the One
has scan 6 with no event bits, then press of scan 14, then scan 7 with no event bits, where arch 8
has the two no-event codes together. Drop press of scan 14 and the sequences are identical. Pinned
in `tests/test_gspm.py`, and unaffected by the corrected reading, which is worth noting because
the finding was originally derived under the wrong one.

Codes unique to each, which is presumably the physical difference between the two remotes:

| Only on the One | Only on arch 8 |
|---|---|
| `0x84` `0x89` `0x93` `0x9C` `0x9E` `0xA7` `0xAF` `0xB1` | `0xA9` `0xB6` `0xB8` `0xB9` `0xBA` `0xBB` `0xBD` `0xBE` `0xBF` |

Consequence, and it is the reason this matters: the ordering looks like Logitech's canonical
key order rather than anything per model. Establishing which physical button each code belongs
to on one remote should therefore carry most of the way to the others. Upstream reports the
same relationship between arch 8 and arch 9, 41 codes of 51 shared in order, which is
independent support for the same conclusion.

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
has a button, with nothing left over on either side. See [findings.md](findings.md) section 89 for
the firmware side.

### The key table is not the button to action map

Whatever binds a key to an action, it is not this table. Two configs of the same Harmony 700 whose
owner recorded reassigning three buttons between them carry a byte identical key table, all 163
records. See [findings.md](findings.md) section 16.

That leaves the table looking like a description of the remote's own keypad and event capability,
which is consistent with it being identical across the four arch 8 samples and across both One
samples. The remaining `u16` and `flags` fields are still unexplained.

## Infrared parameter block

The only leaf structure decoded so far. Reached via the pointer that the firmware's action
dispatcher routes to the IR subsystem.

```
0x00  u16  carrier period
0x02  u8   carrier on-time (duty)
```

Both are converted to instruction cycles with `value * 4 / 10`, then a fixed loop overhead is
subtracted, 19 cycles for the period and 8 for the on-time, clamped at zero. Off-time is then
computed as `period - on`.

The `* 4 / 10` implies 4 instruction cycles per 0.1 microsecond, so a 4 MIPS core at 16 MHz.
Cross-checked against a real carrier: 38 kHz is a 26.3 us period, so the value in **this RAM pair**
is 263, and `263 * 4 / 10` = 105 cycles, which at 4 MIPS is 26.25 us. That closes, and it confirms
both this structure's 0.1 us unit and the clock.

**The unit here is the modulator's, not the config's.** The config states the same carrier in
nanoseconds, 26315 for that example, section 92, and 26315 divided by 100 is 263.15. So the two
readings agree and the prediction above was made before any value had been read out of a config.
Where the division happens is not established.

## Open questions

1. ~~What are the 19, 20 or 21 section slots?~~ **Answered.** All twenty base slots are accounted
   for: two header records, sixteen named sections, and 18 and 19 NULL in all thirteen containers.
   Section 47 closed the last one. What is open is now one level down, inside the sections, and
   each entry above says which part of itself is not established.
2. Three of the four IR encoding classes. The dispatcher routes four selectors and only one is
   traced. **Corrected here:** this entry used to say arch 8's second population with headers near
   303 / 310 was one of the other classes. It is not. Every record's first byte is its class, and
   all 2858 records on arch 8, 12 and 14 are class 1, so the records the framer cannot read are
   class 1 too. The other three classes are used by no config in the corpus at all, which makes
   them a firmware-only problem rather than a decoding one. `docs/findings.md` section 42.
   Arch 9 reads a fifth value, 5, which is not one of the four the firmware dispatches over; its
   header is read and its blocks are not, `docs/findings.md` section 65.
3. The key table's semantic difference between architectures, and the meaning of `flags`
   (`0x00`, `0x07`, `0x73`, `0x7F` observed) and of `index` (sequential on the One, all zero on
   the 600, small values plus an outlier on arch 8).
4. The 288-byte table at arch 12 flash `0x000000-0x00011F`, in which every nibble is one of
   {6, 7, E, F}. On NOR flash that is the signature of a counter advanced by clearing one bit
   at a time. Boot counter, config generation counter and wear map are all plausible. Diffing
   that range across two dumps of the same remote taken at different times would settle it.
