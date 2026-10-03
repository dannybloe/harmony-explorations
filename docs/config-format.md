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
(`0x002000`, `0x018000`, `0x020000`, `0x030000`, `0x040000`) and three pointer table lengths
(20, 21, 22), which is the same property the word at `0x08` states rather than a second one,
section 194. Every consistency check passes on all seventeen. A fifth
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

**That last sentence was half true for a week, which section 143 found and fixed.** The test did compute
the five spans, and then asserted a **lower bound** on each: three cookies, four base addresses, three
format versions, three lengths, four architectures. Four of those bounds were exactly the span and the
base address one was **under by one**, so the document said five addresses while the test would have
passed on four. Computing a number and asserting a bound under it is not pinning it. All five are
asserted exactly now, and the TypeScript twin of that test reports 4 addresses over a 13 sample table
against these 17, which is the second thing section 143 found.

```
0x00  char[4]  cookie          per architecture, see the table below
0x04  u32      end_addr        absolute flash address of the trailing end marker
0x08  u32      pointer_count   byte at 0x09 IS N below; upper half zero. Section 194
0x0B  item[N]  section_table   { u8 spare; u24 address }[N], see below
      char[4]  marker          per architecture; starts the key table on arch 8, 12 and 14
      u8       count
               { u8 event_code; u16 index; u8 flags }[count]
      ...      remaining sections, reached via section_ptr
end-6 u16      checksum        seeded word XOR, below
end-4 char[4]  end marker      per architecture
```

**The word at `0x08` is the pointer count, not a version**, section 194. The byte at `0x09` is `N`
below, exactly, on all 25 containers here across six architectures: `0x14` is 20 on arch 9 and 14,
`0x15` is 21 on arch 8, `0x16` is 22 on arch 12, `0x17` is 23 on arch 10 and `0x0F` is 15 on arch 16.
The reading as a nibble BCD version, `0x1400` as "1.4", survives only as a label: it is plausible for
`0x14` to `0x17` and prints `0x0F` as "0.15", which would make a Harmony 350 older than a Harmony 880.
`N` is independently derived from where the marker sits, so the two agreeing is a check on the file
and `format_states_the_pointer_count` is it. This is also why `format` never identified an
architecture: arch 9 and arch 14 both carry `0x14` because both have 20 slots.

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

**The slot mapping is stated, not derived from insertions**, sections 183 and 184. It was unknown for a
year, and the reason it could not be guessed is the reason it now needs its own table: arch 10 is not a
relabelling of the twenty. All 1330 ways of placing three insertions were scored by asking seventeen
readers to parse and the best reached 34 of 47 with an eight way tie, where arch 8, 9 and 14 each score
47 uniquely, section 117.

| base slot | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| raw slot | absent | 0 | absent | 4 | 5 | 6 | 9 | 10 | absent | 11 | 12 | 14 | 15 | absent | absent | 18 | 19 | 20 | 21 | 22 |

Fifteen present, **five absent** (0, 2, 8, 13 and 14) and **eight raw slots that are no base slot** (1,
2, 3, 7, 8, 13, 16 and 17). An absent base slot is what `INSERTED_SLOTS` cannot express, so arch 10 has
no entry there and never will: `SLOT_MAPS` carries a table per architecture, with the four insertion
architectures derived from `INSERTED_SLOTS` so their alignment is stated once. `arch_slot` **throws** for
an absent base slot rather than returning a number, because a number would hand a reader the
neighbouring section.

Thirteen rows were placed by their own contents, the decisive one being base slot 10's packing closure,
and four by order between placed neighbours. **Two of those four were then wrong**, section 184: base
slots 4 and 6 confirmed, base slots 13 and 14 refuted and absent. Base slot 13's refutation is the
strongest single measurement here, since section 130 gives it a closure across sections: its first seven
records hold the build timestamp's own fields, and no run of pointers in either payload has targets
carrying those seven values, at any field offset and either width, where an arch 8 container hits
exactly once.

Three consequences for readers, and the third is the one that bit twice. **A per architecture table must
not answer for arch 10 just because its shape happens to fit**, section 185: screen opcode 22's operand
width had no arch 10 entry and 49 mode page programs on a Harmony 890 went unread as a result, three
being the answer; base slot 15's group bodies had one and it is wrong there, all fourteen reading as two
entries where arch 8's nine vary between one and fourteen, so they are refused and the shape is open; and
`lightBandExtras`, an arch 12 firmware reading gated only on its group existing, fired on a Harmony 890
because arch 10 declares fourteen groups where nine was the most anywhere else. **No `0xFEED` frame validates anywhere in either payload**, so an arch 10
config does not state the names of its devices and activities the way base slot 0 does everywhere else,
and with base slot 13 absent too a Harmony 890's device names and activity count are unread. And **base
slot 7 is read as a header rather than as the whole section** on every architecture, because arch 10
keeps its glyph bodies inside base slot 7's own section: a `u16` count then that many three byte
pointers, calibrated on six containers and agreeing with the pointer free closure search on all of
them.

### Recovering the base address

Needed to turn the pointers into file offsets, and derivable from the blob itself. **Anchored on
the clock record, not on the end marker**, section 117:

```
candidates = { address_of_slot - offset_of_the_clock_record : slot in table, slot not NULL }
base       = the single candidate that is a multiple of 0x1000 and leaves every
             non-NULL pointer inside the blob
```

Exactly one candidate survives on 26 of the 27 containers in the corpus, spanning five architectures
and six distinct bases from `0x002000` to `0x040000`. The anchor is a closure rather than a cookie
match: a clock record is only accepted when its stored day of week agrees with its stored date, and
there is exactly one accepted record per container.

On the 27th, `H890-Bedroom-2-New`, the clock record sits 54 bytes off the pointer that names it and no
candidate is aligned, so the recovery **returns nothing** and the caller falls back. That is correct
behaviour on a container that arrived damaged, section 122, and the fallback's answer on it is
unaligned. **A refusal is a result and must not be repaired by relaxing the filter.**

Worth noting against concordance's table, which lists arch 9's `config_base` as `0x820000` where
the derived value is `0x020000`.

> **Corrected on 10 August 2026, section 117.** This used to read
> `base = end_addr - (offset_of_end_marker - offset_of_cookie)` and call it exact on all<!--superseded-->
> sixteen samples. That reading is right on 23 of 24 containers and wrong by 864 bytes on
> `H890-Bedroom-2`, whose header declares an end before its own end marker. It was also
> **circular**: the check `end_addr_points_at_end_marker` tested the assumption the base had just
> been computed from, so no input could fail it. With the base anchored on content instead, that
> check is real and it fails on exactly that sample. The marker subtraction remains in both
> implementations as the fallback for a container with no clock record, and one container reaches
> it: the second read of that same 890, where it returns an unaligned base and the circular check
> then pronounces the file consistent. Section 122.
>
> **Amended on 11 August 2026, section 122.** Why `H890-Bedroom-2` declares an end before its own
> marker is not a generator error, which is what section 117 concluded: the read duplicated 16 whole
> 54 byte chunks. So the corrected base derivation stands and the reason given for one of its inputs
> does not.

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
on the whole corpus: `0x0B + 4 * N` equals the measured marker offset in all seventeen samples
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
and they agree on all fifteen config samples. `docs/findings.md` section 87.

`INTENDEDVERSION` is compared field by field, and **an absent or empty field matches anything**, so
an entry with no fields at all matches every remote. `SOFTWARETYPE` says which firmware personality
the file is for, 0 for the application, 4 for safe mode, 3 boot and 1 test; every config in the
corpus declares 0.

**The comparison is implemented and tested since section 225**, `compareIntendedVersion` in
`packages/usb/src/compatible.ts`, and the mapping to what a remote reports is this. Each field is a
number, so the notations differ and only the value is compared:

| field | the file states | the remote's version block | how |
|---|---|---|---|
| `PROTOCOL` | `12` | field 4's high nibble | decimal, and it is the **architecture**, not the platform byte |
| `SKIN` | `54` | field 5 | decimal |
| `FLASH` | `0x1F:0xC8` | fields 3 and 2, manufacturer first | **hex per half**, prefix optional |
| `BOARD` | `0.5.0` | field 1's two nibbles, `0.5` | both sides zero filled to three components |
| `SOFTWARETYPE` | `0` | field 4's low nibble | decimal |
| `ARCHITECTURE` | absent in every sample | field 4's high nibble | decimal, and therefore unexercised |

Three rules the implementation follows and a reader must too. **`PROTOCOL` is the architecture**: the
byte this project once called the protocol is field 6, `platform`, and it is `0x0C` on both arch 12
and arch 14, so reading `PROTOCOL` as that byte accepts an arch 14 config for an arch 12 remote.
**`BOARD`'s third component is not in the version block at all**, and concordance sets it to zero
outright for this whole family, so a two component reading against a three component statement is a
match rather than a gap. And **a field the comparison does not know is a refusal**, not something
skipped, which matters because `SOFTWARE` and `CLIENTSOFTWARE` are real elements of these headers.

**A config read off a remote states none of the six**, because the header is host side and the remote
stores the payload. Ten containers in the corpus carry a header stating five fields each; the three
read over USB carry no header at all, so their statement is empty and, per the rule above, matches
anything. That is the truth about such a container and not a compatibility check that passed.

Beside `INTENDEDVERSION` sits `USERMESSAGES`, which is a different mechanism and is the **host
software's**, not the remote's:

```
<USERMESSAGES>     a list of <USERMESSAGE>, evaluated in order, first match wins
  <VERSIONS>       a disjunction of <VERSION> entries: any one matching is a match
    <VERSION>      the same matcher, keyed on the six fields above, or on CLIENTSOFTWARE,
                   or on SOFTWARE, or empty, which matches every remote
  <TYPE>           DoNothing, Warning or Abort
  <TEXT>           what to show
  <ABORTPROCESSING>
```

Every config here ends that chain with an empty `Warning` carrying "This configuration file is not
compatible with your Harmony Remote" and an empty `Abort`, which is where that message comes from.
Three arch 8 configs also carry seven entries keyed `CLIENTSOFTWARE` 2.3 to 2.9 warning that the PC
software is out of date, and nine keyed `SOFTWARE` 0.1 to 0.9. **The disjunction rule belongs to this
chain and not to `INTENDEDVERSION`**, which is a single entry in all ten headers.

The consequence of a mismatch is **reported, not verified here**: harmony-decompiler states that a
remote refuses a mismatched config with "This configuration file is not compatible with your
Harmony Remote". No configuration has been changed on a remote by this project, so treat that as the reason
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
counts words, and **25<!--fact:parseable_odd_body--> of the 48<!--fact:parseable_containers-->
parseable containers have an odd body**, of which 20<!--fact:odd_body_verifying--> verify their
stored checksum under that rule. (This said 19 of 33 with 14 verifying, which had drifted through
two sample additions because it carried no marker; it carries three now.) This said the corpus holds none<!--superseded-->, which made the
behaviour read as untested when more than half the corpus tests it.

**Logitech states this rule in writing, in a file type that shares no bytes with a config**, section
196. The Harmony 300 and 350 firmware package's `Description.xml` carries
`SEED="0x4321" ... TYPE="XOR"` with an offset, a length and an expected value, and recomputing this
same arithmetic over that range reproduces the stated value. This entry was derived from the boot
validator alone; the vendor's own manifest now agrees with it, by a route with nothing in common.
`gspm.xor_words` is the one implementation, with `trailer_checksum` and the firmware package test as
its two consumers over two different ranges.

**This is the value a writer has to get right**; the remote refuses a config whose checksum does
not recompute. It is also a weak check: a word XOR catches any single changed byte but is blind to
two transposed words and to any even number of identical changes, so a passing checksum means the
remote will not refuse the file, not that the file is correct.

Read with `gspm.trailer_checksum` or `trailerChecksum`, and the parse reports
`trailer_checksum_recomputes` as a container check. [findings.md](findings.md) section 41.

### Telling a config that arrived from a config that parses

Two independent checks, and a reader that keeps a file should run both. Section 122, where a transfer
was caught inserting bytes into a config without losing any:

| check | catches | blind to |
|---|---|---|
| the end marker sits at `end_addr` | anything that changes the length, insertion included | damage that preserves the length |
| the trailer checksum recomputes | a single changed byte, most insertions | two transposed words, and an insertion whose words XOR to zero, which a run of zeroes is |

An insertion of duplicated content passes neither in general and **can pass both** in one case: a
duplicated run of zeroes inside a zero filled stretch leaves the checksum alone, and if the run is
also outside the container it does not move the marker either. That case is harmless, because those
bytes are not the config.

Neither check is a validity test. A file can pass both and be wrong in ways nothing here detects; see
the arch 9 device clone under [findings.md](findings.md) section 117.

### What decides each byte of the frame on arch 14

Arch 14 (Harmony 600, 650 and 700) only; [findings.md](findings.md) section 318. Laid out by
`layOutContainer` in `packages/codec/src/frame.ts` and taken apart by `takeApart`, which reproduce all
thirteen arch 14 compiles in the lab byte for byte with every address field zeroed first.

| bytes | value | decided by |
|---|---|---|
| `0x00` | `GSPM` | constant |
| `0x04` | `end_addr` | flash base plus the length less four |
| `0x08` | `0x1400`, two bytes, then a zero | constant: twenty slots, section 194. Read as a `u32` it runs into `0x0B`, the first item's spare byte |
| `0x0B` | twenty `{ 0; u24 }` items | where each table landed; base slots 18 and 19 NULL |
| `0x5B` | `LWJL` | constant |
| base slot 1 | `0e 0e` skin `0d 00 00 00` | the skin is an **input**: the two Harmony 600 compiles state 71 and 73 |
| base slot 3 | `df ad` seven fields `bf ef 00 00 00` | the build time. The frame refuses a layout whose base slot 13 records 0 to 6 state other values, a consistency rule of ours |
| every address field | `u24` | where its target landed |
| `end - 6` | checksum | section 41, over whole 16 bit words |
| `end - 4` | `PTYY` | constant |

Where everything else goes, in order, with no padding anywhere:

```
0x5F             the key table, mode 0's record, where the parsers read it, section 52
                 the body: every structure reached only through an address, in Logitech's order
base slot 0..17  each table, preceded by what Logitech parks in front of it:
                   5   base slot 5's group arrays
                   7   base slot 7's glyphs and font sets
                   9   the mode pages' own tagged lists
                   10  some of base slot 10's action lists
                   15  base slot 15's parameter groups
                 the picture bank, immediately after base slot 17's two bytes, section 62
end - 6          the trailer
```

The order of the body and which structures are parked in front of which table are carried, not
derived: nothing on the remote reads an order. The parking above is Logitech's habit, the same on all
thirteen compiles; two configurations of ours park more in front of base slots 5 and 9 and ran on the
Harmony 650, sections 285 and 291. Whether the firmware needs the key table or the picture bank where
they are is open: section 311 reads it reaching mode 0 through base slot 6, and every picture is also
reached by a screen program's address. Every compile's build timestamp is laid out from its time.
**Corrected by section 322**: this said one compile states day 0 of October with 30 September's
weekday<!--superseded--> and was carried as field bytes. The day counts from 0, so that stamp is
Thursday 1 October and the encoder produces it; the six said to be stamped that day were made on the
2nd.

## Sections

**Every one of the twenty base slots is now accounted for.** Slots 0 and 1 are the header records,
slots 2 to 17 are sixteen named sections, and 18 and 19 are NULL in every sample.

The method that named them is described in
[../todo.md](../todo.md) step 6: the firmware copies each config pointer into a per-subsystem RAM
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
  paraphrase of a claim `reference/superseded.md` already carries: a config before a sync and the
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
One. See [findings.md](findings.md) sections 35 and 38 for the addresses. On arch 12 the firmware
seeks every raw slot from 2 to 19 **except raw slot 8**, which is the NULL that architecture
inserts, and it does seek raw slot 18, which is the section it has and the base layout does not. So
the alignment rule below is how the firmware itself addresses the table.

**The distance from one pointer to the next is an upper bound on a section's size, not its size.**
Base slot 4 holds 125 bytes and the gap to slot 5 is between 419 and 1532 bytes, because slot 5's
infrared group arrays are laid out in that space. A section's own data can end long before the next
pointer, with another section's sub-structures filling the rest, so a large gap is not evidence of
a large section. See section 36.

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
[capabilities.md](../reference/capabilities.md), established there from Logitech's own product table.

**On arch 10 it is at raw slot 0, not raw slot 1, because arch 10 has no base slot 0.** So an arch 10
config **does** state its architecture, `0a 0a 13 0d` on a Harmony 890 and `0a 0a 17 0d` on a Harmony
895, meaning architecture 10 with skins 19 and 23. The container check
`slot1_states_the_architecture` reports false there because it reads raw slot 1, and
`slot0_is_a_feed_frame` reports false because the name tree has no slot on that architecture at all:
no `0xFEED` word occurs anywhere in either payload. [findings.md](findings.md) section 182.

**Seventeen of arch 10's nineteen base slots follow from that.** Base slot 1 to raw 0, 3 to 4, 5 to 6,
7 to 10, 17 to 20, and 18 and 19 to the trailing NULLs at 21 and 22, each identified by content rather
than by relabelling: the clock frame, the infrared groups holding all 300 records, the eight font set
addresses, and the two byte bias in front of the picture bank. Exactly nine four element insertion sets
fit all seven, and the only freedom is which of raw 1 to 3 is base slot 2 and which of raw 7 to 9 is
base slot 6, the latter narrowed to raw 9 by its mode table size. **The readers stay gated**: a mapping
needing a base slot *removed* is not something `archSlot` can express, and two slots are still
ambiguous. [findings.md](findings.md) section 182.

### Base slot 2: the log area

**Confirmed on 19<!--fact:containers--> containers across four architectures**, and on the one arch
12 image, which is the only firmware that reads it.

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

**Logitech's own client declares the arch 14 region and it is the safe mode row exactly**, section
206: its per architecture constants give a user logging base of `0x0E0000` and a size of `0x20000`,
which is `0x0E0000` to `0x100000`. So that row is corroborated by a route with nothing in common with
the corpus. It says nothing about the user configuration row one megabyte above it, and which of the
two a remote wants is open; a writer reproducing this section copies what the input declared.

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

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures**, and the same shape in every one.

```
+0x00  u24  fallback        used when no key matches
+0x03  u16  count           thirty, always
+0x05  { u8 key; u24 value }[count]
```

Keys are `0` to `29`, contiguous. Values are `N` to `N + 29`, contiguous, and the fallback is `N`.
Only `N` varies: 19 on the 700, 14 on the 600, 11 on the 525, 10 on both Ones, 4 on all four 880s.

The firmware raises an event by loading a literal key and looking it up here, and the value goes to
the same register opcode `0x7E`'s operand goes to. So the two share a numbering space, and the
block `N` to `N + 29` is **reserved**: across 15<!--fact:user_configs--> user configs `0x7E` names 1593<!--fact:event_map_operands--> distinct
operands and lands inside the block on the two Harmony 525 configs and nowhere else, at operand 25
in both. The exception was one config when the population was ten, so widening it made the
counterexample a pair rather than a singleton, which is a stronger statement about arch 9 and a
weaker one about the reservation. On the programmed Harmony One the config uses 0 to 9, the
block takes 10 to 39, and the config resumes at 40, abutting on both sides.

Read with `gspm.event_map`.
*What the thirty events are, and what the numbering space counts, are not established.*
[findings.md](findings.md) section 36.

**This section is 125 bytes**, not the 419 to 1532 that the distance to the next pointer reports.
See the warning under "Sections" about what that distance means.

### Base slot 6: the mode table

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures.**

```
+0x00  u24  count
+0x03  u24  address[count]
```

A `u24` count, where the six recognised pointer arrays use a `u8` or a `u16`, so the parser's array
heuristic does not pick this slot up.

**The count is exactly one more than the largest `0x7E` operand, in every config**, over counts from
75 to 374. Every value in the event map of base slot 4 is in range too. So `0x7E` and the event map
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
past the head. Closures over 2926 records in 21 containers: the back pointer always points
backwards, and the count read at the start always gives a list that fits inside the record, where a
wrong start overruns.

`kind` is 0 in 2326 entries and 1 in 70, all of the latter on arch 8 and arch 12. The firmware
tests its bit 0 and branches, so it is a flag; **what it selects is unconfirmed.**

The entry is `6 + 3 * pages` bytes. The offset and the stride are the two literals the consumer at
`0x16816` feeds to its `3 * index + literal` helper, so neither is inferred from the bytes.

An entry maps a **tag** to one action list instruction. Two tags are the handlers: **tag 7 when the
mode is left and tag 6 when it is entered**, the only two either arch 14 image selects, and on both
Harmony Ones every mode carries exactly one of each. The rest are key codes.

**Those key codes are device mode's keypad map.** [findings.md](findings.md) section 271. A key press
is resolved against the current page's list, then the current mode record's **own** list, then the
base slot 9 stack, and the second of those is where a device's own commands live: pick a device on the
remote and the whole keypad points at it. For every infrared group in the corpus, the mode whose two
maps are largest for that group is unique, exists, and sends **only** that device:

| | count |
|---|---|
| device groups with at least one infrared code | 62 |
| such a mode exists, uniquely | 62 |
| it addresses exactly one device, on keypad and pages alike | 62 |
| keypad bindings across the 62 | 1609 |
| screen bindings across the 62 | 1818 |

The two halves are comparable in size and **which is larger varies**: the screen half is larger in 8 of
the fifteen configurations and the keypad half in 7, so the corpus total is not a statement that device
mode is mostly screen. They are disjoint populations: no scan code appears in both halves in any of the
fifteen. On arch 12 (Harmony One) the drawn device list's own
row enters exactly this mode, 8 of 8, which is the closure, since that route reads the screen and
never an infrared group.

Read with `deviceModeMaps` in `packages/codec/src/inventory.ts`.

**On arch 14 the same closure holds for 21 of the 23 rows it can compare**, section 285, over the four
arch 14 user configurations and `calibration_h600`. The two that do not are the Harmony 700's A/V switch on
both 700s, and there `deviceModeMaps` is wrong, not the list: that device's mode binds no key, and the
reader considers only modes with a keypad binding and counts a mode's enter handler, tag 6, as one, so it
picks a help screen. The 62 of 62 above includes those two. *Unconfirmed until the reader is fixed.*

#### The device list and device mode pages on arch 14

Section 285, measured on the four arch 14 user configurations (Harmony 650, 600 and two 700s), which
are the corpus's three plus `h650_config_region`, kept out of the corpus wide totals.

**A device list row is two instructions**, where arch 12's is three with a beep in front:

```
u8 2
u16 mode;   u8 0x7E        enter the device's mode
u16 1;      u8 0x80 + v    write 1 into the marker variable v, per configuration: 31, 27, 37
```

**A page labels the four buttons around the display** and binds only their scans, filled in this order:

| order | scan | corner | label |
|---|---|---|---|
| 1 | 8 | top left | starts at x 3, y 40 |
| 2 | 2 | top right | ends at x 125, y 40 |
| 3 | 9 | bottom left | starts at x 3, y 90 |
| 4 | 34 | bottom right | ends at x 125, y 90 |

The y is a one line label's in any font. A two line label starts at 25 or 75, its second line one font
height below in the same font, which is 40 or 90 in the usual label fonts and 35 to 39 in smaller ones.
Every one of the 184 device list and device mode pages binds a prefix of that order, 414 of 414 right hand
labels on their corner pages end at 125 and 448 of 448 left hand ones start at 3, and every page holds four
but the last of its mode and one page of each 700's receiver mode. **A page stores its entries in another
order**, 9, 8, 34, 2 with an unbound scan left out, 184 of 184. **One device list per configuration is two
rows instead**: a device per row bound to both of that row's scans, 2 and 8 or 9 and 34, each binding
running a row list of its own, its label at y 35 or 79 and `x = floor((128 - width) / 2)`, 21 of 21. Its
pages all draw one picture, the corner lists' crossed one on the 650 and 700s and one of its own on the
600, and carry no queued `0x73`. **Every row list is bound once**: 300 of 300, none shared between two
buttons or between a page and its copy.

**The activity menu is the two row layout too**, section 289, on the four configurations: each
activity on both buttons of one row, 13 of 13, its label centred at y 35 or 79, 13 of 13, and each
binding and each copy's binding running a row list of its own, 52 of 52:

```
u8 2
u16 0xFF00 | entry;  u8 0x1F       select the activity's base slot 9 entry
u16 0;               u8 0x80 + v   write 0 into the device mode marker, the device rows' v, 4 of 4
```

**Its pictures differ from the device list's**: a page of one activity draws a picture the activities'
own screens draw too, 3 of 3, and none of the 6 one item device pages beside it, and its full pages one picture of
the menu's own that no page outside the menu draws, 4 menus of 4. So a page growing from one activity to
two takes the full page's picture.

**An activity menu's paging is its counter and nothing else**, section 316, on the thirteen arch 14
configurations Logitech compiled: no counter on 6 of 6 one page menus, `n/m` on 16 of 16 pages of the 7
multi page ones at x `0x6A`, `0x71`, `0x76`, **the corner lists' positions and not a two row device
list's**, in the font the device mode pages draw their counters in, 7 menus of 7, and the record list
`0x72` under tags `0x99` and `0x84` and `0x73` under tag `0x2D` at one page and at several, 13 of 13. A
page of one activity holds it on scans 8 and 2, label centred at y 35, and draws **the picture the
activities' working screens draw on a page of one command or none**, 4 of 4, which is neither its menu's
first page picture nor any device list page's; a full page after the first draws the first page's
picture, 5 of 5. A page added to a full menu copies the last page's chrome; a menu of one page gains the
counter right after its title.

**Every arch 14 activity's enter list opens with its own start up screen**, "Starting" and its name,
then writes 1 into the variable every command's delay step tests, and ends by writing 0 into it, 13 of
13, section 289. So the inter device delay acts only inside an activity's start.

**The enter list in full**, section 290, 13 of 13:

```
u16 startup;         u8 0x7E       the activity's own start up screen
u16 1;               u8 0x80 + S   the start variable, section 289
...                                the devices' writes
u16 activity;        u8 0x80 + c   the activity counter
u16 1;               u8 0x80 + F   a flag, one variable per configuration: 39, 34, 39, 44
u16 deferred;        u8 0x7F       [3F D000, 7E working] on h600_config, 3 of 3; the other 10 call a
                                   list testing one variable, entering a Remote Assistant screen, then
                                   the working screen
u16 0;               u8 0x80 + S
```

**A start up screen** is a mode of one page with an empty list, `00 00`, and 54 bindings to nothing,
13 of 13; its program is `[02 picture, 10 02, the title, three fixed lines from y 82, 00]`, the fixed
lines the same across a configuration's activities, 4 of 4, and the title "Starting" and the name at
y 5 and `x = floor((128 - width) / 2)` on the 11 of 13 that fit one line, at most 123 pixels. Font 2
holds only the letters the texts drawn in it use, the start up titles and the status and battery messages.

**A working screen** is a four slot device mode page, section 285, whose queued `0x73` has operand 2 on
the 650 and 700 and 1, as a device page's, on the 600s, with "Devices" at 40, 114 where a device page has "Back", 27 pages of 27, the device pages' title and label fonts, and a
picture of its own for a page of one command or none and another for more, 4 of 4. Its record is two
entries: scan 25 as `0x72` on the first of the two records for the key under Devices below, then a `0x73`, 13 of 13.

**Four base slot 14 records are keyed by the activity counter**, on 4 of 4:

| record | keys | an activity's case | the idle value's |
|---|---|---|---|
| working screen, 1 | activities and idle | enter the screen its start sequence ends on, 13 of 13 | queue a further record |
| the key under Devices, 2 with the same cases | activities and idle | enter its own device list, "Activity" at the bottom | enter the one saying "Activities" |
| keypad map, 1 | activities only | `0x1F` with `0xFF00 | entry`, its own, 13 of 13 | none |

**An activity's own device list is the idle one reordered**, section 294, 13 of 13: the idle list's
record entries, page count, rows per page, backgrounds, title and counter, with the activity's devices
first in the order its enter list writes their power variables 1, then the rest in the idle list's
order, and "Activity" at 39, 114 where the idle list has "Activities" at 35, 114, both in font 1. A
device with no power variable stands in the enter list's power group as `00 0000`, 3 of 13. Each
label is the idle list's instructions for that device moved to its new corner, x 3 or ending at 125 on
a column change and 50 pixels on a row change, 63 of 63. Each row runs a list of its own, byte
identical to the idle list's row list for that device, 63 of 63.

Every device list's scan 25 evaluates a record keyed by `CurrentLocation` whose one case, for 0, queues
the working screen record: the 17 those records enter and one more per configuration, 21 of 21. The
Remote Assistant screen's "Turn off Assistant" writes 1 into the variable the chain before the working
screen tests, and enters the working screen.

**A corner page carries its own chrome**, with no call to a shared program:

```
op 2    0, 0, background       one picture for a page of one item or none, another for more, 173 of 173
op 17   queue 0x73 operand 1       173 of 184, absent on the 11 two row list pages
op 3    the top bar
op 16   title font;    op 4 or 5 at (0, 2), the title
op 16   counter font;  three texts at y 2: n / m, on a mode of several pages only, at x 0x6A, 0x71, 0x76
                       for two to nine pages, 98 of 98; 0x63, 0x6A, 0x6F on a two row list page
op 16   label font;    the labels
op 3    the bottom bar
op 16;  op 4 or 5      the bottom bar's word: Back on a device mode, Activity or Activities on a list
op 0
```

A mode of ten pages or more draws the counter further left, `0x63` and then `0x5C` from page 10. A
mode's block is its own tagged list, then per page its program and a **six** byte page record, `u24
list; u24 program`, since arch 14 pages carry no lead byte, then the entry.

**A device list's paging is its counter and nothing else**, section 312, on the thirteen arch 14
configurations Logitech compiled: no counter on 7 of 7 one page corner lists, all of them the Harmony
600's, `n/m` on 135 of 135 pages of the 59 multi page lists, and a corner list's record list `0x72` under
tag `0x99` and `0x73` under tag `0x2D` at one page and at several, 53 of 53, so no page turn binding
changes with the page count. A corner page holding one item draws the device mode pages' one item
background, 7 of 7, and every two row page after the first its list's first page's picture, 30 of 30. A page added to a full list copies its list's last page's
chrome and holds the item in the first place; a list of one page gains the counter right after its title.

**A device mode's own list binds every key**: 47 entries on all 21 device modes, the four corner scans
bound to nothing, one `0x72` and one `0x73`, and every other key an action list or nothing, 547 of 547
bound keys sending that device's command.

**Every command list opens with a `0x7F` call**, 422, 188 and 372 on the 650, 600 and 700: `0x1F`
loading 1, then a list testing a variable against it with `0x71` and, while it matches, calling a list
of the device's own that is one `0x72` on that device's `InterDeviceDelay` variable through a base slot
14 table. The variable is 52, 46 and 59, and every list writing it sets it to 1 and back to 0 inside
itself, 31, 27 and 50, the 650's three `Starting ...` sequences among them. So the inter device delay
applies inside a start sequence and not on a device mode key press. **Each table case is read**,
section 287: 21 cases, 0 to 20 tenths, each a screen program queueing `0x67` with `(group << 8) | value`
for the device's own group, so tables differ per device in that byte only, stored in the order 0 to 15,
17, 16, 19, 18, 20. `load` and `condition` are private to each command, `delay` shared by the device,
1598 of 1598. What the sender does with the queued kind 5 entry is **unconfirmed**, and so is the
start sequence reading above, which is inferred from three of the 650's 31 writers. `sendPreludes`
and `interDeviceDelayCases`; `composeDevice` emits all of it on arch 14.

**Both operands are constants around the start variable**, section 319, over the thirteen arch 14
compiles, 6100 send lists of 6100 opening with the prelude: `load` is `0xFB01` on all of them, and
`condition` is `0x0000 | S`, equality and one arm, `S` being the variable every activity's enter list
sets to 1 as its second step, after the start up screen, and to 0 as its last, 40 activities of 40, one `S` per configuration.
`SEND_PRELUDE_LOAD` and `sendPreludeCondition`.

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
arch 12         u8 lead; u24 list; u24 program        7 bytes
```

`list` is a tagged list in the encoding below and `program` is a screen program. The firmware
searches the page's list for a tag first and the mode record's own list second, so a page
**overrides** rather than replaces. Both offsets are read off the code rather than inferred: one
routine runs the list at `page + 0` and then the one at `entry + 1`, section 69. **Every page's
list also has a second copy**, in the pool base slot 9's sets sit in, which nothing reads. Two tags are searched this way, `0x29` and `0x2A`, either side
of the code that moves a wrapping page cursor; **what they name is unconfirmed.** The lead byte
was in that sentence too until section 125 read it: it is the zero based index into base slot 17's
hit map, stating which rectangle page a touch on this mode page consults, see the base slot 17
section below. (This spec said "unknown" for ten days after its own base slot 17 section stated the
answer, which an audit found rather than a test: the two passages share no number a check could
compare.)

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

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures.**

```
+0x00  u8   count
+0x01  u24  address[count]
```

Six to seventeen entries, each pointing at a tagged list. **The largest index any config uses is
exactly the count minus one, in all fifteen**, over counts from 6 to 17.

**The pointer is the list**, unlike base slot 6's, which lands inside a record. Read a slot 9
target as slot 6's shape, a `u8` and a `u24` back pointer, and not one of the 54 sets in the corpus
gives an address below itself where all 1616 of slot 6's do. So the extent is the list's own
declared length. [findings.md](findings.md) section 67.

**A key is resolved against a stack of these lists, top down, first match winning**, and the index
into this array is the low byte of action list opcode `0x1F` with high byte `0xFE` to push and
`0xFD` to remove. So an entry's enter and leave handlers, recorded structurally by section 67, are
the push and the pop. **The ordering is the mechanism**: it is what lets one list override another
instead of merely coexisting with it, which is why this table used to say "sets" and that was wrong
rather than merely loose. The firmware reading is trelowney's, reported 26 August 2026;
[findings.md](findings.md) section 176 records what the corpus confirms and what it cannot, since a
count cannot distinguish a push from an unordered insert.

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

**A set is one activity's keypad map.** [findings.md](findings.md) section 151. Over the fifteen user
configs: 158 sets, 65 installed by something in the config, 50 of those by an activity, and **exactly
those 50 send an infrared code**. No set an activity does not install sends one, so base slot 9 belongs
to the activities and holds no spares. The other 108 send nothing, and 38 of them bind fifty or more keys
to lists of comparisons, register work and mode entries, which is a menu.

**Device mode's map is not here**, and this section said the opposite until 6 September 2026: it read
"no config here holds a keypad map for device mode, which the product certainly has"<!--superseded-->,
which followed from the count above and from taking base slot 9 for the whole of the keypad. A device's
own map is a **base slot 6 mode record's own tagged list**, the one below.
[findings.md](findings.md) section 271.

For every pair of a device and a scan code, the command that pair sends is the **same in every activity
map that binds it**, 1096 of 1105, and 47 of 50 devices agree on every one of their buttons. The nine
exceptions are per activity overrides, an amplifier's input selection being the clearest. So:

* a device's button map is the **agreement** across the activity maps, never their union
* 970 of the 1096 are bound in every activity that drives that device and 126 in only some, which is
  authoring rather than structure
* **a writer that changes a device's button has to write every activity map that inherited it**, or the
  change is invisible in the activity a person is sitting in

**Reconstructing a device's map from that agreement is not sound and is not needed**, since section 271
reads the stated one. Scored against it: of 1123 pairs of a device and a key that some activity binds, the
device's own map holds the same command on 896 and a different one on 136 where every activity agrees, and
it binds a further 568 keys no activity binds at all. So the reconstruction is wrong on 13% of what it can
see and blind to a third again as much.
[how-a-harmony-works.md](how-a-harmony-works.md) is the product side of this.

The index is carried by opcode `0x1F` with the operand's high byte `0xFF` and the index in the low
byte. When it changes, the firmware runs the outgoing entry's list with **tag 2** and the incoming
one's with **tag 1**, the same leave and enter arrangement base slot 6 has with tags 7 and 6.

An entry's other tags are **key event codes**, by the same `EVENT_MASK` and `SCAN_MASK` split base
slot 8 uses: `0x81` is a press of scan code 1. So an entry is a set of button bindings with a
lifecycle.

The two Harmony 700 configs differ in exactly one place in this section, one added binding with a
press tag in one entry, and their owner's notes record exactly one added standard button assignment
in one activity.

**An entry is one of three things, and a device is never one of them.** [findings.md](findings.md)
section 272. Split the table by which entries the configuration's own `0x1F` ever selects:

| population | what it is | how many |
|---|---|---|
| never selected | a contiguous prefix, per model | 7 on arch 8 and 12, 5 on arch 14, 4 on arch 9 |
| an activity's key map | one per activity, what `activities` reports as its `set` | one per activity |
| the one left over | selected, and carries a tag 1 enter handler | exactly one |

15 of 15 user configs on all four architectures, and the prefix length moves with neither the device
count nor the activity count. **What the left over entry is for is not established**: it is installed
from the boot chain on the factory Harmony One and binds the Devices key there, which is consistent
with its being the idle map, and its bindings send infrared codes in 6 of the 15 and not in the other
9, which one reading would have to explain.

*This section said "devices and activities together is the reading the counts support"*<!--superseded-->
until 6 September 2026. It fits 2 of the 15 containers, both of them the Harmony 700 pair it was
fitted to, where six devices plus five activities and a prefix of five plus five activities plus one
are the same eleven.

Read with `handlerSetRoles` in `packages/codec/src/inventory.ts`.

**Entry 1 holds the activity keys on arch 14** (Harmony 600, 650 and 700), [findings.md](findings.md)
section 314. It is a prefix entry nothing selects, and its press entries for the three activity keys
are one of two four byte forms in all 13 Logitech compiles measured:

| key | scan | press entry |
|---|---|---|
| Watch TV | 5 | `80+scan`, `FF00 + n`, `1F`: select entry `n`, an activity's key map |
| Watch a Movie | 1 | the same |
| Listen to Music | 7 | the same, or `80+scan`, `p`, `7F`: call list `p` = `[07 FFFD, 7E m]`, push the mode and enter the "add an Activity" mode `m` (mode 0 on the 600 and 650, mode 4 on the 700) |

Both forms are the same length, so putting an activity on a key or emptying one is a same length
edit: `setActivityKey` and `clearActivityKey` in `packages/codec/src/activitykeys.ts`, and
`composeActivity`'s `activityKey`. **Emptying needs list `p` to exist already**: Logitech compiles it
only while some key is empty, 6 of the 13, which are two setups, and adding it is a length change, so the edit refuses on a
configuration without it. Arch 12 (Harmony One) is not compared.

**An activity's key map is built from two roles on arch 14** (Harmony 600, 650 and 700),
[findings.md](findings.md) section 323, measured on the 40 activities of the 13 Logitech compiles:

| keys | press entry runs |
|---|---|
| VolumeUp, VolumeDown, Mute (scans 14, 15, 16) | the **volume** device's own device mode list for that scan |
| every other scan | the **control** device's own device mode list for that scan: the channel changing device, else the one that plays |
| UpArrow, DownArrow (26, 27), unbound in the control device's own map | its DirectionUp, DirectionDown lists (50, 42); right on 5 distinct activities and wrong on 4 |
| ChannelUp, ChannelDown (31, 32), where its own map runs the DirectionUp and DirectionDown lists there | its SkipForward, SkipBack lists (38, 21); fires on one activity, the calibration disc player's, and agrees with Logitech's stated map there |
| Exit (12), where the control device's own screen has an item labelled `Exit` | that item's list; the same one activity |

The **same base slot 10 list** as the device's own map, never a copy: 1254 of the 1328 activity key
bindings, and none of the other 74 runs a list with the same codes. The result is Logitech's set key
for key on 20 of the 40 activities, about 14 distinct; the other 20 are the nine copies of one activity
on the test account's 650 and 700 records, four keys each, and 11 activities of the three hand
customised configurations. A display device that neither changes channels nor plays contributes no
key. Scans 26 and 27 are `UpArrow` and `DownArrow` and 50 and 42 the pad's, decided from the device
maps, `reference/button-maps.md`. `activityKeysFromRoles` in
`packages/codec/src/activityroles.ts`. Help (scan 3, release and repeat) is not built.

**An activity's screen commands are its devices' own screen items**, same section: on the ten
compiles that are not hand customised, every working screen item, 64 per copy and 23 distinct, is an item of one
device's own screen pages, the same list under the same label, so a command is named by its device
and label (`activityScreenRows`). Which commands, and in which order, is the platform's soft button
list and an input. They fill four corners a page in the order given, and a label is broken onto two
lines as the compiler breaks one: kept whole without a space or within 58 pixels, else greedily at
spaces within 58, any threshold from 55 to 58 placing all 2036 measured corner labels (422 distinct, the
band's edges three of them), at y 25 and 40 (75 and 90 in the bottom row), each line placed on its own.
No corner label line in the page's label font is wider than 59 pixels, and the one 60 pixel word is
drawn in another font, which is not composed. The start up title breaks the
same way at 123 pixels onto y 5 and 19, each line centred.

Read with `gspm.handler_sets` and `gspm.handler_index`. [findings.md](findings.md) section 39.

### Base slot 14: the state value map

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures.**

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
Both operand bounds hold in all fifteen user configs and neither is ever overrun.

**The payload is a flash address, not an instruction.** All 15594<!--fact:value_map_targets--> targets across 15<!--fact:user_configs--> configs land
inside their own container. The firmware follows one and hands it to a **second interpreter**, a
one byte opcode language with ten opcodes and a terminator, which is not the action list language
and is not decoded. Base slot 6's mode switch reaches the same interpreter.

Records share their tails: a few addresses point into the middle of a longer record rather than to
a record of their own, so two records can overlap by design.

The range table is empty in eleven of the fifteen configs; the other four carry one range each.

**The cases are stored in a hash order, on arch 14**, section 319: ascending by
`k ^ (k >>> 4) ^ (k >>> 7)`; 0 to 15, 17, 16, 19, 18, 20 for 0 to 20. All 410 records with two or
more cases over the thirteen arch 14 compiles fit, but **two orderings pin it**: the 332 that are not
ascending hold only the key sets 0 to 20 and 0 to 450, 166 records each, each set in one identical
order, and the other 78 have every key below 16, where the hash is the key itself. The firmware's exact
match walks the cases in stored order and leaves at the first equal key, trying the range table only
when none matched, `0x19A2E` on the Harmony 600's 0.2 image and `0x1B30A` on the Harmony 700's 2.8, so
the order changes nothing on the remote and a writer reproduces it to match the compiler byte for byte.
That the generator iterated a Java hash map is an inference from the formula, which is that map's
supplemental hash in Java 6 and 7. **The map's table size is unknown**, and Java 6 and later Java 7
updates grow it differently, so a key set the corpus does not hold may come out in another order: keys
2 to 13 and 16 would put 16 first under the second rule. `compilerCaseOrder` therefore accepts only key
sets all below 16 and the runs 0 to 20 and 0 to 450, and refuses the rest.
**Undecided on arch 8, 9 and 12**: their 65 records of two or more cases, over the Harmony One's four
containers, the Harmony 525's two and the six arch 8 ones, all have keys below 16, the largest 9, so
they are ascending and fit either rule. Arch 10 is not scored, having no reader here.
`compilerCaseOrder`.

**An activity's working screen, arch 12 (Harmony One)**, section 279. One record here is keyed by
`CurrentActivityState` and holds, per activity, the two instruction screen program
`17 lo hi 0x7E; 0`, entering that activity's working screen, plus one case for the idle value that
enters no screen. It is found by walking from the left bottom key of a device mode page, the
"Activities" key, through `0x7F` and `0x72`; its index differs per configuration, 3, 5, 11 or 13 on
the thirteen measured, so it is never a constant. The activity's enter list opens with a `0x7E` into
a different mode, its start up screen, on 60 of 60. Unchecked on every other architecture.
`activityScreens` in `packages/codec/src/inventory.ts`.

**The all off list**, section 280. A base slot 10 list of state writes only, each a 0 into a
device's `Power` variable, reached from the `idle` base slot 9 entry's enter list through `0x7F` and
the `0x7F` a base slot 14 case queues. Exactly one on each of the eleven user configurations with two
devices or more, arch 8, 9, 12 and 14, naming every `Power` variable; none where there is one device.
The walk is from `CurrentLocation`'s record, whose one case, value 0, queues the call, so the switch off
is conditional on it. Every activity's enter list writes every one of those variables, 1 or 0,
directly or through the lists it calls, up to three calls down. `allOffList`.

**On arch 14 every record leads with 2 and has no range table**, 501 of 501 over the thirteen compiles,
and no address points into another record, so `buildValueMap` writes each record whole from its cases.
[findings.md](findings.md) section 324.

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
| 3 | 6 bytes, `u24` | the same with **destination, source, size**, below |
| 4 | 2 position bytes, `u24` | draw the glyph string at that address, **another program's own**, below |
| 5 | 2 position bytes, then the string | draw the glyph string inline |
| 16 | 1 byte | index base slot 7 by it |
| 17 | `u16` operand, `u8` opcode | queue an action list instruction |
| 18, 19 | a switch, below | switch on a state variable and jump |
| 20 | `u24` | jump |
| 21 | 4 bytes | *arch 8 only*, meaning unknown, length inferred from the corpus |
| 22 | **per architecture**, below | *arch 12*: call. *arch 9*: select a screen row |
| 23 | none | **per architecture**: *arch 12* the return matching opcode 22; *arch 9* the page transfer |

**Opcode 4 is the commoner of the two text opcodes and its target is never a place of its own.**
Confirmed on every container of the corpus, four architectures: in 12052 of 12052 instances the
`u24` lands on the glyph payload of some opcode 5 instruction in another reachable program, three bytes
past that instruction's start. So a string is stored once, inline, by whichever program draws it that
way, and every other program that wants it names those bytes. 15742<!--fact:text_referenced--> of the
corpus's 23419<!--fact:text_draws--> drawn strings are references, so two draws in three.

Three consequences, all of them load bearing:

* The run is read exactly as opcode 5's is, terminated by a zero byte with a code whose bit 7 is set
  taking a second byte. It may be **empty**: nine references in each arch 8 config name a zero length
  string, which is a blank label at a position.
* **The bytes are shared**, so a writer that edits a string in place changes every draw that names it.
  Same family as the shared infrared duration blocks of section 61.
* The byte accounting closed without anybody following this pointer, because the bytes were already
  claimed by the program holding them. That is why it went unread: nothing was missing.

**Opcode 3's six position bytes are `dx, dy, sx, sy, w, h`, destination first.** Section 118. The
order cannot be read off most of them: 1080 of the 1114 in `h525_config` carry the same pair twice,
which is a full page strip copied to where it already sits. The 34 that differ are all
`(0, 12, 0, 0, 96, 1)`, a one pixel rule, and they settle it two ways:

* **The selected page contains the first pair and not the second**, on 55 of 55 across both arch 9
  user configs and 0 of 55 the other way. Opcode 22 has just selected page 1, rows 8 to 15, and a
  destination of `y = 0` is not in it. The 1080 symmetric draws are the calibration: all of them
  land inside their own selected page too.
* Typographically the rule sits between a title at `y = 0` and text at `y = 13`, which is where a
  heading rule belongs and where `y = 12` puts it.

The source is `(0, 0)` of a 96 by 64 solid ink bitmap, so a rule is one row taken off the top of a
filled rectangle. Reading the pairs the other way round draws all 34 along the top edge.

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
beside it, and the transfer at `0x03898` sends `0xB0 | row`, the page address command of a page
addressed display controller. So the 525 addresses its screen as eight pages of eight pixel rows,
opcode 22 selects one and **opcode 23 transfers 96 pixels into it**, preceded by a column address in
two nibbles where **the panel's column 0 is the controller's column 3**. The guess recorded here, that
a key press is attributed to a row and this is arch 9's touch hit map, was wrong: nothing reads it
back.

The controller is **ST7565 class and not an SSD1306**, which section 101 corrected on 10 August 2026:
six ST7565 only commands appear in the driver's init sequence and none of the ten SSD1306 only ones
do. The exact part is not established.

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

**22846<!--fact:screen_programs--> programs across 19<!--fact:containers--> containers and four architectures decode with nothing left over**,
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
One, 18 on a 600, 24 on a 700, 31 to 33 on arch 8. **Every entry of a bank is drawn by a screen
program**, on all four architectures, with two exceptions in the whole corpus and both in the arch 9
safe mode container. So the bank is the set of pictures the programs draw rather than a region that
happens to contain them. [findings.md](findings.md) sections 66 and 146.

**Where the bank starts is stated three ways, and the third needs no pointer slot.** Base slot 17
names it, two bytes in front, on arch 8, 9 and 14; arch 12 uses that slot for the touch hit map, so
the bank is found by searching upward from the end of the named content and constraining the answer by
the pictures screen programs address. Both routes need the section readers. The third route needs only
the trailer's position, which the framing states, and is what reads on **arch 10 (Harmony 890 and
895)** where every slot reader is gated:

1. walk from every offset in the blob, keeping the offsets whose walk lands exactly on the trailer
2. discard any whose pictures exceed 256 pixels in either axis, which is `PICTURE_CEILING`
3. take the survivor with the most pictures, which is then the lowest

Confirmed against the reader route on **14 of 14** containers whose bank it can locate, start address
and picture count both, over four architectures. Step 3 alone is right on 9 of the 14 and step 1 alone
on 4, so both filters are load bearing. The ceiling is a plateau: 224, 256, 400 and 1024 give the
identical answer everywhere, and 180 does not, because it is below the Harmony One's 220 pixel
backgrounds. `pictureBankByClosure`. [findings.md](findings.md) section 179.

**The largest picture in a bank is the display size**, which is the second independent statement of
`SCREEN_SIZES`: the first reads where programs draw pictures, this one reads the array, and they agree
on all four architectures that state one. On arch 10 it gives **128 by 160 for the Harmony 890 and
895**, with five full screen pictures each, and those two payloads use exactly the ten distinct
picture sizes a Harmony 880 and 885 use, where a Harmony 600 and a Harmony One share none of them.
[findings.md](findings.md) section 179.

**Two opcodes draw one**, 2 and 3, each naming it in its last three operand bytes. This said "exactly
two per container are not" drawn on arch 8 and arch 14 until section 146, and those were opcode 3's:<!--superseded-->
4548 of 4548 opcode 3 instructions in the corpus name a picture, arch 12 emits none at all and arch 9
emits nothing else, which is why a reader written from opcode 2 looked complete on the architecture
this project reads code on and reported zero pictures for a Harmony 525.

**They are not two spellings of one instruction.** Opcode 2 draws a whole picture at an origin, two
operand bytes:

```
+0x00  u8   x
+0x01  u8   y
...          the last three bytes are the u24 address
```

Opcode 3 is a **region copy**, nine operands, and the destination comes first:

```
+0x00  u8   dx     where on the display it lands
+0x01  u8   dy
+0x02  u8   sx     where in the picture it comes from
+0x03  u8   sy
+0x04  u8   w      in pixels, both ends
+0x05  u8   h
+0x06  u24  the picture's address
```

Read as stated, every destination rectangle fits its display and every source rectangle fits the
picture it names, 3540 of 3540 across the corpus. Swapping the two pairs puts 292 of the 708
asymmetric arch 8 instructions outside their own picture, against none as stated.
[findings.md](findings.md) sections 118 and 148.

2624 of the 3540 copy a rectangle onto itself, which is a page strip drawn where it already sits.
Why is unread and it costs nothing either way, since the copy is idempotent.

**A config's interface is localised and no field says which language.** Every word a remote shows is
in the file as a run of glyph codes, in the language of whoever generated it, and the language itself
is a property of a few hundred strings and of nothing else. Twelve of the thirteen user configs here
are English and one is Dutch. It is therefore **inferred**, from Logitech's own menu and Help wording,
which answers on all thirteen with every rival language at zero and refuses on the three containers
that are nobody's config. A third to a half of the mode pages are the Help walkthrough, whose wording
is that template with the user's own device names in it, so a generator has to know the language and a
reader does not. `configLanguage`, `LANGUAGE_MARKERS`. [findings.md](findings.md) section 149.

**For a writer:** the language cannot be changed by editing a field, because there is no field. It
means regenerating every drawn string, and the service that held Logitech's translations is the
discontinued one.

**A config states its own display size**, and both opcodes say it: opcode 2 as an origin plus the
picture's own dimensions, opcode 3 as `dx + w` by `dy + h` from the instruction itself. Nine
containers state it both ways and agree exactly, on arch 8 and arch 14, which is what makes opcode 3
trustworthy on arch 9, where it is the only witness and where the 96 by 64 rested on nothing in the
container until section 148. `SCREEN_SIZES`. [findings.md](findings.md) section 148.

The start is found by trying offsets above the named content under two constraints, the exact
landing and the presence of every addressed picture; exactly one candidate satisfies both, except in
the arch 9 safe mode container, where two do because two of its four pictures are addressed by
nothing.
`gspm.picture_bank`. [findings.md](findings.md) sections 49 to 55.

**For a writer:** a picture's position is implied by everything before it, so inserting or resizing
one moves every later address.
Read with `gspm.bitmaps` and `gspm.bitmap_at`. [findings.md](findings.md) section 50.

**A pixel is RGB565 stored high byte first**, section 129, which is the one field in this format that is
not little endian: it is the order a display controller takes over a serial bus, so a picture is stored
the way it is sent. Reading it the other way shifts the green field across the red and the blue and
draws a rainbow. Arch 9 (Harmony 525) is the exception, one bit a pixel with the row padded to a whole
byte, and its glyphs are two bit grey where 1 is ink and 2 is paper.

**A skipped pixel in an encoded picture is transparent, not background**, which is what lets an icon be
drawn over a screen already painted.

**The display is what the config's own full screen pictures say**, section 129: 128 by 160 on arch 8
(Harmony 880), 96 by 64 on arch 9 (Harmony 525), 176 by 220 on arch 12 (Harmony One) and 128 by 128 on
arch 14 (Harmony 600 and 700). Every architecture's drawn text stops just inside its own figure.

**The pen advance past a glyph's stated width is nothing**, section 129: the gap between letters is a
background column the glyph itself carries. `packages/codec/src/render.ts` draws a page from these, and
every mode page of every container in the corpus renders with no picture and no glyph unresolved.

Opcode 3 draws the same object with a six byte position record instead of two. On arch 8, 12 and 14
it is used by one instruction in the whole corpus, so its operand layout there is read from the
firmware and exercised by almost nothing. **On arch 9 it is the ordinary way to draw**, 1856 times
across the two user configs, always preceded by an opcode 22 naming the row: two `(0, 8 * row)`
pairs, then 96 by 8, then the picture. [findings.md](findings.md) section 85.

#### What fills the region

The pictures above, and nothing else. The region is one contiguous array of them from the end of
the named content to the trailer, walkable end to end in all nine containers that have a **bank**,
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

**The container at flash `0x002000` is the firmware's status screen library**, section 244, and
calling it the safe mode container understates it. Its screen programs are the messages a remote
shows when it is not showing a configuration: 30 on a Harmony One and 35 on arch 14, the arch 12 set
being the arch 14 set with its first five removed and the shared 30 in the same order. Five images
across two architectures agree, by two routes, a read off a remote's own flash and Logitech's own
firmware packages. Three of the 35 are about the configuration and they are **three different
screens**, an invalid one, a corrupted one and a request to go to the website and update settings, so
which one a stranded remote shows is diagnostic. Which condition selects a screen is **unread**, and
position does not: the website message is entry 0 on arch 12 and entry 5 on arch 14.

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
are 5220<!--fact:glyphs--> glyphs and 67303<!--fact:inline_string_codes--> codes.

* every row comes to exactly `width`, for **4838<!--fact:glyphs_two_byte_pixel--> glyphs**, with no stream ending mid row
* every glyph decodes to exactly the height its set declares, 3933 of 3933
* every inline string resolves: **63327<!--fact:string_codes_two_byte_pixel--> glyph codes** land on a non-NULL glyph of the font their
  own program selected, none out of range and none on an empty slot

Decoding with a one byte pixel instead fails on almost all of them, which is the calibration.

#### A font set is findable with no pointer slot

Base slot 7 names the table, so `fontSets` cannot answer on **arch 10 (Harmony 890 and 895)** where
the slot mapping is refuted. A set is findable anyway because of how much it has to get right at
once: a candidate is accepted only if **every** nonzero address in its array decodes into a glyph
whose rows tile exactly to its own declared width, at the set's declared height. `fontSetsByClosure`
is exact against the slot route on **14 of 14** containers, address for address.

Two thresholds, and they are separate because a real set can be almost entirely null, one Harmony One
set declaring 73 pointers of which 66 are: the array must hold at least 8 pointers and at least
`FONT_SET_MINIMUM_GLYPHS` of them must decode. That second one is a plateau, exact anywhere from 1 to
5, where 0 admits 179 false positives and 8 loses four real sets.

**The font table is not adjacent to the picture bank**, which was checked before being relied on: over
thirteen containers its top sits 1918 to 48385 bytes below the bank. [findings.md](findings.md)
section 180.

**On arch 10 this gives eight sets** on both clean reads, 282 glyphs on the Harmony 890 and 277 on the
Harmony 895, heights 8, 11, 13, 14 and 15, 70 slots each and a first code of 1. The heights come in
the Harmony 880's own order, 14, 14, 15, 14, 13, 13, 8, 11. The encoding is two bytes a pixel, which
is **measured**: the arch 9 packed form finds zero sets in either container and the unpacked form
finds all eight. And the glyph shapes are named by the arch 8 alphabet at 213 of 237 and 212 of 229,
against 44 and 42 for the Harmony 600's and **0** for the Harmony One's, so a Harmony 890 uses the
Harmony 885 typeface. [findings.md](findings.md) section 180.

**This does not give arch 10 its text.** A string's address comes out of a screen program, base slot
11, and these sets declare a first code of 1 rather than 32, so the codes are per container and a run
of printable bytes is not a string. `usesAscii` is false on both.

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

170920<!--fact:text_read--> of 170922<!--fact:text_glyphs--> drawn glyphs across the corpus come back as
characters. The two that do not are one code drawn once in each Harmony 700 config. The closure is
that a decoded string turns up verbatim inside a base slot 0 name, which is ASCII and which this
decoder never reads: fifteen of the sixteen containers with a name tree do it, between three and
eleven distinct strings each. The exception is the arch 9 safe mode container, which names one variable
and draws none of it because it holds no devices.

**A glyph code is one character and a character is one code**, which is the generator's own rule: the
code is that character's position in the string list it walks. Two uses, section 124. As a check it
found three hand read labels that were wrong, each showing up as a character sitting on two codes at
once. As a resolver it settles the one pair no shape distinguishes, `I` against `l`, and the other,
`O` against a zero drawn without a slash: whichever member another code has already settled is not
available to this one.

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
from. Both bytes are zero in all thirteen containers that do this, which is every container that is not
arch 12 (Harmony One), since there the slot holds the touch hit map instead.
`docs/findings.md` section 84.

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

**A short device list page is the full page's rectangles**, section 241: for `r` rows it carries the
full page's first `r` row rectangles under scans 48 upward, the full page's bottom key rectangle under
scan `48 + r`, then the two edges. Stated by the one row and two row pages beside a full page on two
configurations, and it is how `composeMenuPage` derives a hit page the configuration lacks.

The code at `+0x08` takes ten values, 43, 44, 46, 47 and 48 to 53, which sit inside the block of
scan codes the One's key table carries where arch 14 numbers 41 to 54. A page's codes run 48
upward consecutively, then 43 and 44 for the two largest pages, and always end with 46 and 47,
which are a tall strip at each edge of the panel. Nine page shapes exist and no others.

**A code is a position, not a name**, section 275: the first area a page stores is scan 48, the second
49 and so on, with 46 and 47 carried by the two edges wherever they sit. So which scan is which row
differs from page to page, and it does: on the everyday Harmony One's activity menu the three rows are
scans 50, 51 and 52 on the first page and 48, 49 and 50 on the second. Two consequences for a writer.
A row is recognised by **geometry** and never by its code. And an area appended anywhere but after the
last content one renumbers every area after it, which silently moves a binding the page already had.

**The two rectangles at the panel's edges are the page turn buttons, and no page binds them**,
section 275. All 778 mode pages of four arch 12 (Harmony One) containers offer both, and 0 of them
carry a binding on scan 46 or 47. Those two rectangles sit outside the drawn area, `x` 765 and 3556
against a display spanning 1257 to 3556, which is the geometry saying the buttons are beside the
screen rather than on it.

**They are bound in two other places**, and **`keyCodes` is the wrong reader to ask** about either:
it reports only bindings that end in an infrared code and answers 0 for these scans.

* **Base slot 9 entries 1, 2, 3 and 4**, a press of each scan in each, so 8 bindings per container
  on all four. Those are the fixed prefix nothing selects, section 272. Entry 1 is the only one
  giving the two scans different lists, `0x0f` with `0xFFA0` against `0xFFA1`, undecoded.
* **A mode record's own tagged list, exactly when the mode has one page.** Both keys on 538 of 538
  single page modes and neither on 0 of 58 multi page ones, 1076 bindings, every one a press, and
  966 of them the **null instruction** of opcode 0 with operand 0, which said 962 until section 293
  recounted it.

So paging is a default the firmware supplies and a screen with nowhere to page turns it **off**. A
writer that adds a second page to a one page menu must remove those two null bindings, or the new
page is unreachable while every count closes and both checksums pass. All 12 one page list menus here
carry them.

**A mode of several pages states its page count in two more places**, section 293, arch 12 only, over
the six Harmony One containers:

```
header (the program every page calls first, one per mode, 656 of 656 distinct)
  op 4 or 5 at (0x17, 0x12)   the total, equal to the page count, 58 of 58; absent on a one page mode
  op 4 or 5 at (0x23, 0x12)   the word, "pages" on all six
  op 0x17; op 0               a one page mode's header ends here, 598 of 598
each page, in its own program or where its switch arms rejoin, after a second switch on 7 of 73
  op 4 or 5 at (18 - w, 18)   its number, right aligned: w is the text's width in its font, so a "4"
                              starts at 12 and a "10" at 8; every page of all 58
  op 4 or 5 at (18, 18)       "/"
```

A one page mode draws neither the total nor a number. **531 of the 598 bind both page turn keys to the
null instruction**, 1086 of 1196 bindings; the other 67 name a list on one key or both, 15 of them only
lists of three null instructions, so a writer that cuts only the null instruction is conservative. The total, the numbers and the bindings are independent, so a page added without restating the
header leaves the old total drawn, which is what the spare Harmony One's nine device lists carry.

**The rectangles at `y` 271 are the two physical buttons below the display**, and which of them a
page enables is the difference between the two list menus, measured over the same containers:

| | a device list page | an activity menu page |
|---|---|---|
| rows | 3 | up to 3 |
| left button, `x` 1257 width 1395 | 1, on **29 of 29** pages | 1, on **6 of 6** |
| right button, `x` 2406 width 1150 | **none, on 29 of 29** | 1, on 6 of 6 |
| what those bind | opcode `0x72`, all 29 | enter a mode, all 12 |
| beside the display | 2, unbound | 2, unbound |

A button with **no rectangle** is how the format says it is not enabled, which is what the right one
is in device mode. The left one is labelled "Activities" there and "Options" in an activity, with
"Devices" on the right, and its `0x72` maps a state variable's value rather than turning a page:
variable 35 on the everyday Harmony One and 40 on the factory one, so where it goes depends on what
is running.

An activity menu's rows are 2600 panel units wide and 807 tall, start at the panel's left edge of
1257, and step down by one `LIST_ROW_PITCH` of 872, on 11 of 11 rows.

**The geometry is not user data.** Two Harmony Ones with entirely different configurations carry
the same 35 rectangle sizes and share 70 of 70 distinct records; only the number of pages differs.

**Which page belongs to which screen is stated by the mode page**, in the arch 12 only `lead` byte in
front of a mode page record's two pointers. It is a zero based index into `page[]` above:

| | `one_config` | `one_config_unprogrammed` |
|---|---|---|
| mode pages | 330 | 152 |
| hit map pages | 42 | 32 |
| distinct `lead` values | 42 | 32 |

Every value in range with no gaps, every hit page named by at least one mode page, and **no mode page
binds a key code its indexed hit page does not offer**, on 268 and 104 pages. Shifting the index breaks
54 to 227 of them. `docs/findings.md` section 125.

**The panel to pixel transform**, needed because a rectangle is in panel coordinates and a drawn label
is at a pixel:

```
panel_y = 4356 - (872 / 54) * pixel_y
panel_x = 1257 + ((3556 - 1257) / 176) * pixel_x
```

The y half is **measured**: 872 panel units is one list row and 54 pixels is one text row, so the scale
is their ratio exactly and only the offset is fitted, at 233 of 235 paired rows within five pixels. The
x half is **unconfirmed**, in that word: it takes the display to span the gap between the inner edges of
the two edge strips, codes 46 and 47, and containment barely constrains it because almost every
rectangle is full width. No activity name depends on it.

Under that transform the rectangles are a grid, and it is the hardware the owner of the remote
describes: blocks at pixel rows 33 to 83, 87 to 137 and 141 to 191, **one block or two side by side and
never three**, plus a bar from 191 to 253 which runs past the bottom of a 220 pixel display. So codes 48
to 53 are the up to six blocks on the screen, 43 and 44 the two touch points below it, and 46 and 47 the
two keys at its sides. **Which code lands where is per page**, in the order the container stores the
rectangles: one activity page has the bar on 48 and 49 with the blocks on 50 to 52, and the next has the
blocks on 48 to 50 with the bar on 51 and 52.

Read with `gspm.touch_pages` and `gspm.Container.touch_hit`, or in TypeScript with `touchPages`,
`touchPageOf` and `touchOwner`. [findings.md](findings.md) sections 45 and 125.

### The screen sections by category, arch 14

**Screen bytes** are the bytes the byte accounting gives base slots 6, 7 and 11, the picture bank and
base slot 17's two bytes on arch 14 (`SCREEN_OWNERS`). Base slot 14 is excluded. Each is in exactly one
**unit**, the thing a generator emits whole, and each unit is one of three categories:

| category | means | units on a Harmony 650 |
|---|---|---|
| fixed | emitted for every setup, content independent of it | the 44 head modes of the mode table (7 binding a keypad, 37 binding nothing), the 10 tour modes, Off, 15 of the 19 pictures, the glyphs those and the dynamic programs draw where their count agrees across compiles, the font set holding only such glyphs, base slot 17's two bytes |
| dynamic | draws state the remote holds at run time, by switching on a state variable | the 5 base slot 11 entries no value map names (three icons switching on state variable 17, read here as the battery, and the two delay countdowns) and the 4 pictures only they draw |
| setup | exists, repeats or holds content because of the devices, activities and names | device modes, device lists, start up screens, help, Remote Assistant, the activity menu and working screens, every case program (keyed by a device's delay or the running activity, or refused by the census), glyphs only setup screens draw and the few whose count varies, the other font set headers, the three tables whose lengths count modes, programs or fonts |

**Fixed means the same look**: addresses, glyph codes, font indices, the operands of instructions that
index a numbered table, which variable a state write writes, and the number of a switched state
variable above 17 are placement and abstracted away.
On the Harmony 650, 40 of the 55 fixed modes are also byte identical once relocated and 15 have to be
re-encoded with the configuration's own numbers.

| configuration | screen bytes | fixed | dynamic | setup |
|---|---|---|---|---|
| `h650_config_region` | 628447 | 471329 | 13391 | 143727 |
| `h650_panasonic_config` | 645496 | 471328 | 13391 | 160777 |
| `h650_power_hold_compile` | 679481 | 471328 | 13391 | 194762 |
| `h650_power_hold_compile_2` | 681067 | 471328 | 13391 | 196348 |

Fixed is per model and per service generation: 53 of the 55 fixed modes and all 19 pictures recur on
the 2026 Harmony 700 compiles, none of the modes and 2 of the pictures on the Harmony 600's. Arch 14
only; the Harmony One is not checked. Read with `screenUnits`, `attributeScreens` and
`screenCategoryTotals`. [findings.md](findings.md) section 317.

### Base slot 15: the parameter block

**Confirmed on the twelve containers whose architecture has a firmware reading of the guard**, six
arch 12 (Harmony One) and six arch 14 (Harmony 600 and 700), and every length claim below is a literal
in the firmware rather than a count of what the corpus carries. Arch 8 and arch 9 carry the section and
no image here reads it, so their seven containers are outside the claim.

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
arch 14 the run is exactly the sum of the groups; arch 12 has twelve more bytes in it, past group 9.

Those twelve are `ff 00 ff 00 00 00 00 00 55 55 55 55` in all six arch 12 containers, no `u24` in any
container names their address, and **the firmware reaches them by overrunning group 9 on purpose**:

| bytes above group 9's first entry | read by | as |
|---|---|---|
| 12 to 15 | `0x249A0` | the fourth pair of device levels, at four bytes a band |
| 16 to 23 | `0x2492E` | a table of two bit fields, four to a byte |

So group 9 is in effect a 24 byte structure whose header declares only its first six `u16` values. A
writer reproduces all twelve bytes; an editor that changed the declared length would move both
readers' targets without any check refusing it. `docs/findings.md` sections 84, 103 and 106.

**Their extent is these offsets and not the distance to the pointer array**, which is a correction to
how a tool should claim them rather than to the reading. The byte accounting attributed them by
position, as the run between the lowest group and the array, from before section 103 read them: that
made the attribution unfalsifiable and it absorbed 8 to 32 bytes of any group whose declared entry
count was damaged, on all four architectures, while still reporting every byte accounted for. Section
139 entry 13.

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
| 9 | four pairs at four bytes a band, both halves sent to the I2C device at address 0x60 as its registers 2/3 and 4/5; band 3's pair is past the declared entries | 16, 16, 64, 64, 128, 128, then 255, 255 | 64 |

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

**Nothing here is per device**, which is worth stating because the plan asked for it the other way
round. The group lengths are one shape per architecture over containers holding 0 to 7 devices, and
the **values** are shared across containers with different device counts: sixteen containers carry
five distinct value sets, four of them shared by containers whose device counts differ, the widest by
six containers holding 3, 4, 6 and 7 devices. The fifth set is the two Harmony 700 configs, one model
and six devices each, so it is silent rather than contrary. What the values track is the **model**:
the Harmony 600 and the Harmony 700 disagree about their display light levels and their battery
curves and about nothing else. A device's own numbers are state variables in base slot 13.
[findings.md](findings.md) section 234.

Read with `gspm.parameter_groups`. [findings.md](findings.md) sections 44, 103 and 105.

### Base slot 12: the timer table

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures**, with three more as a negative case.

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

**One timer is named: the screen light, on arch 14.** Two timers on every arch 14 user configuration
queue a list opening with `1F E910`, and the lower index of the two is how long the screen stays lit, in
seconds. MyHarmony calls the setting `GlowTime`. *Measured on the Harmony 650 only*, by writing 20 and
10 and timing the screen; on the Harmony 600 the calibration configuration agrees with the saved `GlowTime`,
which is 20 and also its default, and on the Harmony 700 both timers of the pair hold 10, so its pick is
the rule's and *not established*. The two are the arms of one test of state variable 9; when the
other arm is taken is *not established*. Arch 8 and arch 10 carry the same pair, *unmeasured*. `screenLightTimer` in `packages/codec/src/tables.ts`, findings.md section 292.

Read with `gspm.timers` and `gspm.timer_reference`. [findings.md](findings.md) section 43.

### Base slot 16: the number sender

**Confirmed on seven containers, every one made rather than found.** Every found config in the
corpus carries a count of zero here, so for a year the layout came from three firmware images and
nothing else. A configuration with three favourite channels on it was then compiled by Logitech's own
service and every field below sits where the firmware reading put it, byte for byte, section 154;
six more compiles from the same account carry the record too, sections 156, 165 and 174, and the two
implementations are compared on it by the golden vectors.

**This section does not carry every favourite channel.** A channel is sent through here only when its
number survives being written as an integer. One with a **leading zero** takes another route entirely:
its base slot 13 transition runs one base slot 10 list per digit, each sending that appliance's own
digit code, and this section is not involved. Measured on a config authored with `1` and `001`
together, where the two go different ways. So `minimum` below is **not** how a leading zero is
expressed, which is the one thing a reading of the firmware alone would have got wrong about it.
Section 156.

**A record is a method for sending a number, not a number.** Three channels produce **one** record and
three action lists, each loading a constant and handing it to that record. So `count` is the number of
appliances that take a number, not the number of channels.

**A count of zero is not a NULL slot.** A config with no channels still declares this section and
gives it one byte; the one that has them gives it four. So an empty record list and an unreadable slot
are different answers and a reader must not merge them. **Read this section with `numberSenders`,
which uses `countedPointers` and is told the width**, and not with `pointerArray`, which infers the
width from the count and therefore cannot represent an empty array: it answers `undefined` for a count
of zero. That is a property of the inferring reader and not a merge of the two answers, which section
262 recorded the wrong way round before measuring it.

**On arch 16 the group count is the model's stated maximum and not the device count**, sections 264 and
265, which is the one place base slot 5 behaves differently here: it is exactly the device count on 13
of 13 containers on arch 8, 9, 12 and 14, and on arch 16 all three Harmony 350 containers declare eight
groups and both Harmony 300 containers declare four, matching each skin's `MaxDevicesPerAccount`, with
the unused groups empty. So a writer for this architecture allocates the table by the skin.

**Which group a device gets is the device type button it is assigned to**, section 265, measured on the
programmed Harmony 300 by identifying all four of its groups independently in Logitech's device
catalogue: the television is group 0, the set top box 1, the DVD player 2 and the video recorder 3,
which is the order of the four buttons on that remote. It is **not** a position in the archive's name
list, which is alphabetical and disagrees, and the two orderings sections 261 and 263 proposed were
both answering the wrong question. Unconfirmed on the Harmony 350, which has no such buttons: there the
three occupied groups are the reverse of the archive's order, and a device with no infrared codes at
all takes no group.

**And it is populated by a found configuration now, on arch 16**, section 262, where this said every
found config in the corpus carries a count of zero. Danny put five favourite channels on the bench
Harmony 350's set top box through Logitech's service and the remote was read before and after: raw
slot 11 goes from a count of zero to a count of one and no other slot changes that way, which is what
**names** base slot 16 on that architecture. The record is this layout with nothing adjusted, its
three digit tables are distinct and thirty bytes apart, and all thirty entries call lists that send
codes from one group. `flags` is 0 there against the arch 12 sample's `0x04`.

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

In the one sample the ten instructions of a digit table run action lists that send that television's
commands `0` through `9`, in table order, ten of ten, and the instruction queued last sends its
`Select`. The names come from the catalogue of the account that generated the config, matched by
decoding each stored code into its bit frame, so a table index predicts a word Logitech chose through
a route with nothing in common. The three table pointers are three distinct addresses holding
identical copies; nothing requires that, so a reader must not assume one table serves all three.

`digits` is a **floor** and not a width: the conversion raises it to however many digits the value
needs, and the one sample declares 0. `flags` is `0x04` there, arming the prefix at a hundred while
the prefix instruction is NULL, so the mechanism is switched on and does nothing. **Unconfirmed**:
bit 0, and the bits above 2.

The fourteen bytes read in sequence end exactly where the first of the three fixed pointer offsets
begins, which is the closure for this layout, and the routine is identical on the 700, the 600 and
the One.

Read with `gspm.number_senders` and `tables.numberSenders`. [findings.md](findings.md) sections 39,
154 and 156.

### Base slot 13: the state variable table

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures**, and named from the firmware routine that
loads it rather than from what the bytes look like.

```
+0x00  u16  count           how many variables
+0x02  u16  narrow          how many are stored as one byte
+0x04  u16  wide            how many are stored as two bytes; narrow + wide == count
+0x06  u16  narrow again    the same number a second time, purpose unestablished
+0x08  u24  entry[count]
```

`8 + 3 * count` equals the section's length exactly, in all fifteen. Counts run from 21 to 94.

The firmware copies this into RAM as two runs, `narrow` single bytes followed by `wide` pairs, so
**an index below `narrow` is a one byte variable and an index at or above it is a two byte one**.

**Three of the four words are live, and the storage is sized `narrow + 2 * wide` with `count`
playing no part in it**, section 276. `count` limits the boot loop that seeds each variable from its
record and is kept only in a scratch byte, so nothing compares an index against it; `narrow` is the
width threshold; `wide` sizes the storage. Above `narrow + 2 * wide` the firmware **fills every byte
with `0xFE` at each boot**, and because the seeding loop runs first, a variable above the storage is
seeded correctly and then painted over, holding 65278 rather than its record's value, with no error
anywhere. The fill's ceiling is per image rather than per architecture, `0x7F` on the Harmony One,
`0xFF` on the Harmony 700 and `0xC0` on the Harmony 600, and a second arm starts it at the constant 18
under a flags bit that is unread; the fill is unmeasured on arch 9 (Harmony 525). `narrow again` is
fetched and discarded on arch 12 (Harmony One) and arch 14 (Harmony 600 and 700); arch 9 reads it,
section 274. A separate check does compare an index against `narrow + wide`, seven instructions on all
six images in the lab, but its callers are `WRITE_MISC` and `READ_MISC` **selector `0x01`**: a
configuration's own state write reaches the store unchecked, so that bound is not what a writer has to
respect, and a refused read returns 0 rather than an error. The identity
`narrow + wide == count` holds on 19 of 19 containers, which is what makes it enforceable rather than
what proves the bound, since the two are the same number in every one, and
`assertStateTableConsistent` refuses a container that breaks it.

**A composed variable that carries transitions goes in below `narrow`**, section 277, which costs a
renumbering: every variable at or above the insertion point shifts up by one and every reference has
to move with it. The reason is a measurement rather than the firmware, since nothing read so far
branches on the width: 0 of 64 two byte variables in the corpus carry transitions against 91 of 194
one byte ones. A reference sits in an opcode byte or an operand's low byte, in one of three kinds
enumerated by `stateVariableSite`, 8163 of them across the fourteen programmed configs with 0 naming
a variable its own table lacks; a name tree node at level 1 carries one too. **The transition entry's
own leading byte is `0x00` in 569 of 569** and is not an enable bit, which section 277 corrects in
place.

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
+0x00  u16  the value the variable holds when the config is generated, section 130
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

**The first field is the generated value**, section 130, which settles what section 60 marked
unconfirmed and generalises section 120's reading of it as the idle activity value: for
`CurrentActivityState` the two coincide, because no activity is running while a config is compiled.

**Records 0 to 6 are the firmware's clock**, and they are the proof of that field: each one's first
value equals the corresponding field of base slot 3's build timestamp, in all 21 containers of the
corpus, with `max` equal to the field's own maximum.

| index | holds | max |
|---|---|---|
| 0 | second | 59 |
| 1 | minute | 59 |
| 2 | hour | 23 |
| 3 | day of the month, 0 is the 1st | 30 |
| 4 | day of the week, 0 is a Sunday | 6 |
| 5 | month, zero based | 11 |
| 6 | year since 2000 | that year plus one |

Section 74 read 3, 5 and 6 as a date from the action list language alone, which is an independent
route to three of the seven. The day and the weekday count as base slot 3's do, the day from 0 and the
weekday from Sunday, `docs/findings.md` section 322; this said the weekday was days since 1 January
2000, a Saturday, which named every date a day early. Base slot 0 names none of the seven in any
container.

**These records are the clock itself, not a copy of it**, section 138. On arch 12 state variable `n`
lives at data memory `0x108 + n`, so records 0 to 6 are the seven bytes section 111 measured on a
running Harmony One, and the firmware seeds variable `n` from record `n`'s first field at `0x2A266`,
skipping a record whose value is `0xFEFE`. The seeding is guarded by a checksum of the RAM the array
sits in, so a power cycle takes the config's values and a warm start keeps the running ones. Base slot
3 is **not** read for the clock: `0x27F20` subtracts it from these variables to work out how long ago
the config was built.

**Variables 7 to 12 are firmware owned too**, by a different argument, section 138: within one
architecture every container states the identical first value and `max`, and base slot 0 names none of
them anywhere. Index 13 is where both of those stop holding, which is what puts the boundary at 12.

| index | arch 8 | arch 9 | arch 12 | arch 14 | what it is |
|---|---|---|---|---|---|
| 7 | 0 / 2 | 0 / 2 | 0 / 2 | 0 / 2 | unread, and the one index that is identical on all four |
| 8 | 0 / 3 | 1 / 2 | 0 / 3 | 0 / 3 | the display light band on arch 12, whose four levels section 103 read |
| 9 | 5 / 7 | 0 / 1 | 5 / 7 | 5 / 7 | the battery gauge on arch 12, eight levels |
| 10 | 0 / 7 | 0 / 1 | 0 / 7 | 0 / 7 | the saved display light state on arch 12 |
| 11 | 0 / 32 | 0 / 1 | 0 / 32 | 0 / 32 | the cached display light level on arch 12 |
| 12 | 0 / 1 | 0 / 3 | 0 / 1 | 0 / 1 | unread |

The meanings are arch 12 readings and are marked so: arch 9 states different maxima for the same
indices, which is consistent with a Harmony 525 having no dimmable display of that kind, and nothing
establishes that it puts the same things there. The four measured on a connected Harmony One all sit
inside the maxima stated here, with the battery exactly at its own, which is a closure between a
hardware reading and a config field with no shared code behind them.

**For a writer:** stamp all seven clock records at the moment of writing, the same rail as base slot 3's
timestamp, and **reuse none of the firmware's block for anything**: 0 to 17 on arch 8, 12 and 14, and 0
to 12 on arch 9, section 284. A carried over config sets the remote's clock to when the old config was
made.

**One of the seven maxima moves with its value**, so a save writes eight values rather than seven.
**Six** of the maxima are constants, `59, 59, 23, 30, 6, 11` for the second, minute, hour, day of the
month, weekday and month. The year's is that year plus one and therefore always moves: stamping the
year alone leaves a config declaring a value outside the variable's own range, since built in 2023 the
record is 23 with a max of 24, and saved in 2026 it would be 26 in a range that stops at 24.
**Corrected by section 322**: this said the day of the month was a second such place, that a save on
a 31st writes a day of 31 against a maximum of 30, and `edit.ts` stamped `max(30, day)`. The day counts
from 0, so the 31st is stored as 30 and fits; `h700_config` was built on a 31st and stores 30 against
30. A save writes at most 30 now, and a configuration an old save left at 31 is put back to 30.
The transitions those
records carry are **not** touched: they are the same skeleton in every container, one each on the
minute, hour, day and month records and none on the other three, and the only part that varies between
configs is which base slot 10 list a `0x7F` names. `clockStateEdits` in `packages/codec/src/edit.ts`,
and `CLOCK_STATE_MAXIMA` in `src/sections.ts` is the table it both writes and checks against.

`max` is what **base slot 0's name for the variable ends in, plus one**, in all 250 named variables
of the corpus, which is what settles it. Every non negative `from` and `to` is inside `0` to `max`,
every instruction has a reading, and every one of the 439 that name a base slot 10 list by index
names one that exists. A record either carries no transitions or covers every value of the variable
the same number of times, so `count` is a multiple of `max + 1`: once per value in 83 records, twice
in two and four times in one. [findings.md](findings.md) section 86.

**Variables 13 and up are the config's own, and eight per device are that device's delays.** On arch
14 (Harmony 600 and 700) each device carries `PowerOnDelay`, `DefaultPowerOnDelay`,
`InterDeviceDelay`, `DefaultInterDeviceDelay` and four more, each named `<property>_<identifier>` in
base slot 0. The value is the record's `first`, and **the unit is a tenth of a second**: the config
draws 451 strings reading `( 0 sec )` through `( 45 sec )`, contiguous in tenths with no gap, one per
position of the slider the remote's own menu offers, and every stored value is one of them. Logitech's
service states the same inter device field in milliseconds, at exactly 100 times the stored number.

The power on delay is how long the remote waits after switching a device on before it will send that
device anything; the inter device delay is how long it waits between two codes going to different
devices. The other four, `PowerOnDelayFlagCounter`, `PowerOnDelayFixingTriggered` and their inter
device twins, have maxima of 5 and 100 and are unread.

**Only arch 14 carries the variables, and every architecture states the delay.** That is section
235's correction to this paragraph, which said the other containers "state no delay for any of
them"<!--superseded-->. Arch 8, 9 and 12 put the power on delay in the action list instead, as one
`0x7C` at the top level of the list a device's `Power` variable runs when it goes from 0 to 1: 57
transitions, every one carrying exactly one, against 16 on arch 14 carrying none. The unit is the
same, which is settled by Logitech compiling one configuration per architecture for the same three
devices, and the two agree device for device. `powerOnInstructions` returns the list, the position in
it and the value, since on those architectures changing a delay is a one byte edit.

What the inlining architectures do **not** state is a default, an identifier or an inter device
delay. Where they keep an inter device delay, if they keep one, is open, and that is a **negative
measurement** rather than an absence of looking: Logitech's account states one per device, 500
milliseconds on most and 1000 on one television, and no `0x7C` in that television's configuration
carries the 10 that would be, nor a 5 for the devices set to 500. They draw none of the 451 strings
either, having no slider.

**Logitech's own account states the same power on delay, in milliseconds**, which is the check from
outside the format: `UserFeatureManager/GetUserFeatures` returns a `PowerFeature` per device carrying
`PowerOnDelay` and `DefaultPowerOnDelay`. Against the configuration their service compiled for that
account, four of four devices agree at exactly a hundred times the stored number, and on two of them
the current value differs from the catalogue default, with the configuration taking the current one.
Section 235.

**Which device an identifier belongs to is stated by the screen and nowhere else.** A device's buttons
and its infrared group are reached through an ASCII label, `TV_Power_2`; its delays are held under
Logitech's numeric device identifier. Base slot 0's level 1 holds both kinds of name side by side and
relates neither to the other. The join is the mode page that offers to put one device's delays back to
their defaults: it draws the label in its title row and its action list copies
`DefaultPowerOnDelay_<identifier>` into `PowerOnDelay_<identifier>`. 19 of 19 devices over the four
containers that carry delays, against 1 and 4 of 19 for the two orderings of the identifiers anybody
would guess. Two details it needs: a drawn title is truncated to fit, `Panasonic Blu-ray Pl..`, so it
matches a label it is a prefix of when exactly one label matches; and an underscore in a label is a
space on the screen, because the underscore is base slot 0's own separator.

**Unconfirmed: the page's text is English.** Every container here was generated in English, so nothing
says what a German build draws. A config whose screen says something else loses the join and keeps
every delay.

**A second route to the identifier reaches 16 of the 19 and agrees on all of them**, section 235:
where the other architectures put the `0x7C`, arch 14 puts a `0x72` naming that device's own
`PowerOnDelay_<identifier>`, and the same list's `0x7D` names the group. It needs no drawn text, so
it is not language bound; it answers for fewer devices, because one that nothing switches on has no
such list. That `0x72`'s base slot 14 record has 451 entries, which states the 0 to 450 range a
third time.

**The power on list and its table**, section 288. The `Power` variable's off to on transition runs a
list that calls a send list of the device and then a list of one `0x72` on `PowerOnDelay_<identifier>`,
15 of 15 devices; the off transition sends a code of the device with no delay. The table's 451 cases
queue the value as `0x7C` quantities for the device's group, a hundred at a time: 0 an end alone, 1 to
100 one `0x7C`, 101 to 450 a call to a list of the device's own holding hundreds and a remainder, the
350 lists contiguous in the table's case order, which is one order on all 15, and `compilerCaseOrder`'s
on all 71 of the thirteen arch 14 compiles, section 319 and base slot 14 above. Each device also has a
second 451 case table on the same variable, whose cases call lists, **unconfirmed** in purpose.
`powerOnDelays` and `powerOnDelayCases`; `composeDevice` emits the list, the variable and the table on
arch 14.

**Changing an arch 14 delay is a two byte edit of the record's `first`**, `u16` little endian, plus
the trailer checksum. **The record's `second` does not bound it**: it is 65277 on the Denon's record in
the Harmony 650's and Harmony 700's configurations, and the range is the 451 case table's, 0 to 450.
`setPowerOnDelayVariable` in `packages/codec/src/edit.ts` refuses anything else. Written to the Harmony
650 and the Harmony 700 and put back, the new value in force after the writer's restart on both,
measured in memory on the first and by infrared timing on the second. **On the Harmony 600 the same
edit landed and was not used**, because a value saved on the remote wins, below. [findings.md](findings.md)
sections 283, 301 and 303.

**A delay saved on the remote overrides the configuration's at start**, arch 14, measured across three
starts on the Harmony 600:

| | instructions | effect |
|---|---|---|
| save | `0x7A key`, `0x6C value` | store `value` under `key` in the settings store; bit 15 of the value selects the inter device table |
| restore | `0x7A key`, `0x0F 0xFF40` or `0x0F 0xFF41`, `0x1F 0xED00 \| variable` | read the slot for `key` into the accumulator, `0xFEFD` when absent, and write it into the delay variable |
| sweep | `0x07 0xFFF3` ... `0x07 0xFFF2` | clear the marks, restore, then erase every slot no read marked (read, not exercised; the 600's store history fits it) |

* Every delay variable the compiler emits, its `Default` copies aside, carries a value map whose case
  for v is a list `[0x7A key, 0x6C v]` (`| 0x8000` for an inter device delay); one key per device,
  shared by its two delays. On `h600_config` the remote's own delay page reaches it through "Set to
  default", which saves the default values; what saved anything else is **unestablished**.
* The restore lists hang off list 1 on `h600_config`, through 1476, on `calibration_h600` and on the
  650, and off list 2 on the 700, whose 2.8 firmware is unread for this. That the firmware runs that
  list at start is inferred.
* The key: the device identifier's last four digits fit the 600's two configurations and the 650's,
  its last five fit the 650's and the 700's; the rule is **unconfirmed**.
* The store itself, internal `0x01EC00`: settings `0x00` to `0x13` are five power on slots and `0x18` to
  `0x2B` five inter device slots, each a big endian key and a big endian value, `0xFF` when empty.
* `composeDevice` emits neither program, so a composed device's delays are not saved or restored.
* **Over USB**, section 305: `0x14 0xB3 0x00 setting value` appends one record at the first record
  from offset 4 whose setting byte is `0xFF`, and writes nothing when the setting already holds the
  value. A slot is emptied by four such writes of `0xFF`, key first, which is the order the firmware's
  own purge uses. A write landing on the block's last record makes the firmware copy the store to the
  other block, which erases internal program memory, so a writer keeps clear of it. Measured on the
  Harmony 600; the 0.2 path is byte identical on the 650.

`packages/codec/test/settingsstore.test.ts` and `packages/usb/test/settings.test.ts`.
[findings.md](findings.md) sections 303 to 305.

`deviceDelays`, `powerOnInstructions` and `deviceIdOfGroup` in `packages/codec/src/inventory.ts`.
[findings.md](findings.md) sections 234 and 235.

**A device's inputs**, arch 14, section 321, measured on the thirteen arch 14 compiles the lab holds.
Two layers of one byte variables, each a record with `first` 0 and `second` the number of values less
one:

| variable | values | transitions |
|---|---|---|
| `<label>_Input_<n>` | the catalogue's `inputs.list`, numbered by Logitech's `InputOrder` | one per value from `-2` (0xFFFE), or, where the inputs step with `next`, one per ordered pair of distinct values |
| `<label>_<state>_<n>` | one of the catalogue's `states`, its values in order | a value with a `select` gets one transition, from `-2` for `setType` 1 and `-3` (0xFFFD) for `setType` 2; a state with `next` gets one per ordered pair |

* A transition `i` to `j` of a stepping variable runs the one step body `(j - i) mod n` times, so it
  steps forward and wraps: 128 of 128 stepping transitions.
* A transition's instruction: the null instruction (opcode 0, operand 0) for an input with no
  commands, 6; an inline state write `0x80 | variable` for an input whose only step writes one state,
  103; otherwise `0x7F` to a list, 340 inputs and every one of the 243 state transitions. A body that
  is one send runs the send list itself; a longer one is a list of `0x7F` send list calls, bare `0x7C`
  waits and state writes.
* A send's `0x7C` quantity: an input's own sends and its `next` wait the input delay in tenths, or the
  key delay where the input delay is 0; a state's sends wait the key delay.
* A write the catalogue's raw data marks as recording rather than setting (`DevActionType` 1) is a call
  to a two instruction list, `[0x07 0xFFFF, 0x80 | variable]`. The archive does not keep the mark.
* One input that steps gives a variable of one value and no transitions; one input that does not step
  gives none. A state no input writes, directly or through another state, is not compiled.
* An activity's enter list writes power on, then the inputs in the order the devices were switched on,
  then power off, then the counter: 40 of 40 activities, 72 input writes. A device with no power
  variable can have its input written too, 1 case.
* **Unexplained**: four `-3` transitions whose only step is a `Select` press are absent from the Panasonic
  TH-42PA30's compile; the Panasonic TX-P42GT30E of `h700_power_hold_compile` holds `InputType` and no
  `Input`; the Chromecast of `h600_config` holds a one value input variable and is not identified.

`inputPlan`, `composeDeviceInputs`, `activityStartTargets` and `deviceStateMachines` in
`packages/codec/src/inputs.ts`; `packages/codec/test/inputs.test.ts`.

**Built from a description, arch 14**, [findings.md](findings.md) section 324. `buildStateTables` in
`packages/codec/src/statetables.ts` rebuilds all thirteen arch 14 compiles' base slots 0, 13 and 14
byte for byte. What it generates rather than carries:

| what | value on arch 14 |
|---|---|
| records 7 to 17, `first / max` | `0/2, 0/3, 5/7, 0/7, 0/32, 0/1, 0/32, 1/1, 0/3, 0/1, 0/3`, no transitions |
| the clock's transitions | minute, day, month: `{-2 to 0, 0x1F 0xF2nn}` incrementing hour, month, year; hour: `{-2 to 0, 0x7F list}`, the list `[0x1F 0xF203, 0x1F 0xF204]` incrementing day and weekday, its index the configuration's |
| index `narrow` | `first` 0, max 65277, no transitions, unnamed, stored straight after record 17; purpose **unread** |
| a variable's width | one byte for a maximum up to 100, two from 254; **between is unpinned** and refused |
| a device's eight delay variables | `PowerOnDelay` and `InterDeviceDelay` max 65277, their `Default` copies max 254, all two bytes; `PowerOnDelayFlagCounter` 0/5, `InterDeviceDelayFlagCounter` 0/3, both `FixingTriggered` 0/100, one byte; 83 of 83 devices, `deviceDelayVariables` |
| `CurrentActivityState_0` and `CurrentLocation` | the activity count for both value and max, and 0/0, `activityStateVariables` |

Carried: which variables there are, their stems, values, maxima and transitions in stored order, and
the order of their indices within each width, which no hash of their names fits. **A value can exceed
its maximum**: `DefaultPowerOnDelay` holds 65535 under 254 for one device of
`h650_power_hold_compile_2`, so "at most `second`" holds for the population of sections 86 and 120 and
not for every compile. The constants are arch 14's: on arch 8 and 12 records 7 to 12 and 15 to 17
hold the same values while 13 and 14 hold `1/1, 0/1` (Harmony 880 and 885) and `1/1, 2/4` (Harmony
One), arch 9 differs from record 8 on, and on all three the `0/65277` variable at index `narrow` is the only
two byte one while one byte maxima reach 121, inside the gap refused here.

Read with `gspm.state_table`, `gspm.state_records` and `gspm.state_index`; `stateTable` and
`stateRecords` in `packages/codec`.
[findings.md](findings.md) sections 35, 60 and 86.

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
[findings.md](findings.md) section 181.


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
the 21 byte header with two pointers and a trailing NULL that section 61 described. ~~On arch 8 it is
2 in exactly 37 records of every config~~<!--superseded--> **it is 2 in 37 records of four arch 8
configs and in none of two others**, and the count follows the **devices** rather than the
architecture, section 134. On arch 9 it is 2 in 61 of `h525_config`'s 200 records and in **all 107** of
the second 525 config, so 168 against 139 corpus wide: more than half, which four comments in
`packages/codec/src/ir.ts` denied outright while this page said it. A two group header is 30 bytes and names
up to six blocks. `620 + 208 + 21` is the whole of a typical Harmony One record, since arch 12 has one
group everywhere.

**A second group is the same code with one bit inverted**, section 134. Block `i` of the second group
and block `i` of the first differ in exactly two adjacent words, which are a mark and a space of equal
duration exchanged, at a fixed offset in the frame, in all 61 block pairs of each of the four configs
that have any. Exchanging equal halves of a pair is what inverting one cell of a **biphase** code does,
and those records read as RC6 mode 6 at 36200 Hz: a six and two unit leader on a 441 us unit, a start
bit of one, mode bits 110 and a double width trailer. So the two groups are the two states of a bit
the protocol requires the sender to alternate between presses, and a config stores both because the
action list language has no arithmetic that could compute one. Which group a given press uses is
**unconfirmed**: the firmware side has not been traced.

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
135 times in 199. [findings.md](findings.md) sections 65 and 82.

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

**The interval between two sends of a held key is slot 1's own duration**, since the firmware replays
the whole block before looking at the keypad again. 30.8 ms to 752 ms across the corpus, most between
60 and 120 ms. `irRepeatPeriod` returns it, and it is the number a user experiences as the repeat rate.

*A writer rail follows.* Slowing a key down means lengthening slot 1's trailing gap, and a duration
word carries at most 32767 us: a gap already spelled over three words can be raised to 98301 us
without changing the block's length, and anything beyond that lengthens the block and relocates
everything above it. The sharing rule applies first.

**Two architectures carry a metadata archive inside the container**, section 260: a `u32` length then
a ZIP holding one file, `MetaData.xml`, deflated with a data descriptor so the compressed length comes
from the central directory. Each gives it a raw slot of its own and **neither is a base slot**: raw 3
on arch 10 (Harmony 890 and 895), which sections 178 to 184 left unexplained, and raw 13 on arch 16
(Harmony 300 and 350). No other architecture carries one.

Arch 10's is 270 bytes and describes one boolean, whether an assistant menu is shown. Arch 16's is 1513
bytes and holds two things: the **record layout of the log area**, being an infrared event that carries
a device, a command and a three byte time, and a device selected event; and the **naming layer**, every
device by name and every command by index and name. The naming half is **not joined to base slot 5**:
there are more named commands than records, 61 against 52 on one device, and the device index is not
the group index. `metadataArchive` in `packages/codec/src/metadata.ts`. `DeviceId` there is account
scoped and **not** a catalogue id.

**Arch 16 (Harmony 300 and 350) places six base slots and refuses the rest**, section 259. Fifteen
slots, and they are not the base twenty with insertions, so nothing transfers by index:

| raw slot | base slot | named by |
|---|---|---|
| 0 | 0 | the `0xFEED` frame, 131 bytes |
| 1 | 1 | seven bytes stating architecture 16 twice, skin 104, then `0x0d` |
| 3 | 3 | the `0xADDF` framed clock record |
| 2 | 2 | the log area, and its eight bytes are byte for byte the Harmony 525's, section 260 |
| 4 | 5 | the infrared database: eight groups, `u8 spare; u16 count; u24 record[]`, records in the base layout exactly |
| 7 | 10 | the action list table: a `u16` count of 171, each list a `u8` length then three byte instructions |
| 10 | 15 | the parameter block: a `u8` count of 5, each group a `u8` length then its bytes |

Raw slot 13 holds the **metadata archive**, section 260, which is not a base slot. Raw slots 5, 6, 8,
9, 11, 12 and 14 are **unread**, raw 14 being NULL, and `archSlot` throws for the base slots they would
hold, so an unread slot refuses rather than answering wrongly. Raw 11 is one byte holding zero and raw
12 is two bytes, which are base slots 16 and 17's own widths, and both are candidates rather than
entries. Single container plus the
skin 104 firmware, whose section seeker at `0x10BCE` computes `0x0B + 4 * slot` from a literal its
fourteen callers load, naming raw slots 3 to 12. The firmware also **hardcodes the marker offset at
`0x47`**, which is `0x0B + 4 * 15`, so the interpreter is a third independent route to section 194's
pointer count.

**How many times a press sends the code is the ratio of the two blocks**, section 258. The first
block holds the code as many times as one press sends it and the held block holds exactly one press's
worth, so the count is the first block's copies divided by the held block's. A copy is a segment of
`frameSegments` holding at least half the pulses of the block's longest segment, which is what
excludes the short trailing segment a block ending in a long silence is cut into. Confirmed: 1913 of
1913 records that name both blocks divide whole, one value per device group on 60 of 62 groups, and 3
on all six device groups of the two configurations Logitech compiled to our specification, where the
service states 3 for each of those devices. The four values in the corpus are 1, 2, 3 and 4.
`irSendsPerPress` in `packages/codec/src/irframe.ts`.

Dividing is what makes it a device's count rather than a family's spelling: a family sending a frame
and its complement stores six copies and two, and one sending a single frame stores three and one, and
both are three sends. **Unconfirmed for a family whose definition states an intro section of a
different code word**, where the ratio is one more than the count Logitech's service states: one
family in this corpus, `Kreatel IP 22 Bit`, four copies against a stated 1.

**How many times a press sends the code is also stated twice outside the file**, and both agree with
the ratio: `pressMinimumRepeats` on 39 of Logitech's 1368 protocol definition records, values 0, 1 and
3; and `PressMinRepeats` with `DefaultPressMinRepeats` per device on the live service, same values.
`HoldMinRepeats` is 0 on all 24 device records captured and `HoldMinimumRepeats` is null on all 684
definitions, which is consistent with the held block always holding exactly one press.

**A power press held for a stated time is as many frames as start inside the hold, on the frame lengths
the protocol definition states**, section 308, correcting 306 and 307. Every step of a power action list
is a record of its own, with no lead in and no held block, holding what an ordinary press sends; the
ordinary press of the same command keeps its own record. Where Logitech's catalogue states the step with a
duration, the compiler fills that record with frames for as long as a frame's **stated** start falls inside
the duration. A frame's stated length is its segment's `TotalLength`, or else the segment's header, trailer
and `NumberOfBits` times the mean of its two cell lengths; the frames are the definition's `KeyCode`, its
`Start` segments and then its `Repeat` for as long as needed, an opening segment with no payload joining
the frame after it. A frame is what lies between spaces over 10 ms, so a family that repeats a shorter
frame counts those repeats. All 27 long press versions of the test devices in six compiles for a Harmony 700 and
a Harmony 650, ten families, arch 14 only. Where a code is sent much shorter than its stated length, the
Panasonic power codes of `PanasonicV2 48 Bit` at 134.6 and 136.4 ms against 143.3, the hold can hold fewer
frames than would start inside it at the sent length, as it does on 12 of their 13 records. **Unconfirmed**:
that the length is the mean cell rather than anything from 24 to 28 long bits of 48, which only that family
separates, and that the Panasonic codes are not simply counted as whole copies with a floor, which also
fits every record. **Unmeasured**: families with several repeat segments or more than two cells, and
whether a hold shorter than an ordinary press can send fewer frames, which no record needs.

**How the compiler wires a catalogue device's power**, section 320, arch 14 compiles only (Harmony 650
and 700), 17 device instances of 15 catalogue devices, every power send and delay reproduced by
`composeDevice` from the catalogue entry alone; the input state lists the on transition ends in are not
composed:

* **The actions are the catalogue's.** A `discrete` device's `Power` variable sends its `on` action going
  from 0 to 1 and its `off` action going from 1 to 0; a `toggle` device sends its one `toggle` action both
  ways, one record and one send list.
* **An action of one step is that step's send list itself**: the off transition's operand is the send
  list, `{0x7F, 0x7D, 0x7C}`. **An action of several steps is a list of `0x7F` calls**, one per step in
  order, a step stated more than once being one record and one send list called again: the Knoll
  HDP-1100's off, its power toggle held 500 ms three times, is one list calling one send list three
  times. The only such action in the compiles, so one device.
* **The on transition is a list of calls**: the on action's send list, then the device's power on delay
  list, one `0x72`, then one list per input state the catalogue's `onReset` names. **Unconfirmed**: that
  an on action of several steps is called step by step in that list rather than through a list of its
  own, since no compile here holds one.
* **The three delays are the catalogue entry's**, in tenths of a second: the `PowerOnDelay` variable's
  first value is `powerOnDelay`, the `InterDeviceDelay` variable's is `interDeviceDelay`, and the `0x7C`
  after a power step's send is `interKeyDelay`, on every device instance.

**How Logitech's generator spells a block**, section 174. These are the generator's conventions
rather than format constraints, since the firmware plays any legal spelling identically; a writer
that wants byte identity with a compiled config follows them, and `compiledBlockWords` in
`packages/codec/src/compose.ts` does.

* **Every once block opens with a lead in silence**, 2032 of 2032 across four samples spanning both
  generator eras: 50 ms on most commands, 500 ms or a second on the ones that get a settling time.
  A held block never leads, 0 of 67.
* **A held power step's record, the long press version, is the ordinary press's frames cycled to the count**, section 309: no lead
  in, the frames carrying the code's first slot once and the second slot's cycled to section 308's
  count, each followed by the gap the press gives it, the last gap getting back the microsecond the press
  ends in. 26 of 27 rebuilt word for word, arch 14 only; `longPressBlockOfStatedCode`, which
  assumes the press's frames are the code's walk in order.
* **A power step without a hold is the ordinary press without its lead in**, the same words otherwise,
  three devices of one compile for the Harmony 650.
* **A duration too long for one word is spelt as maximal 32767 us words with the remainder balanced
  across the last two, smaller half first, and no word below half the maximum**: 50000 is
  `32767, 17233`; 40222 is `20111, 20111`; 500000 is fourteen maximals then `20631, 20631`.
* **The trailing gap gives up its final microsecond before it is split**, and the microsecond closes the
  block as a 1 us word: `..., 30543, 1`, and the Panasonic family's 74801 is `32767, 21016, 21017, 1`.
  Carving the last word after the split gives the same words except where the split ends in a balanced
  pair whose total is odd, and there it is wrong: over the corpus containers with infrared and the six
  power hold compiles, carving first alone fits 1757 blocks on arch 8, 12 and 14 and carving after alone
  fits none, section 309. Arch 9 (Harmony 525) blocks end in no microsecond at all.

Respelling every merged space run of every block reproduces the three Harmony One compiles exactly,
492, 415 and 415 blocks.

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

**Those are the keys the screen labels, and the two populations are disjoint**, section 128. A scan
bound here is a key the screen speaks for; a scan bound by a base slot 9 handler set is a key on the
keypad, and across the corpus the two share no code at all on architectures 9, 12 and 14 and exactly
one on architecture 8. One arch 9 config binds a fifth screen key, scan 22, on a page that labels
nothing.

**A screen key's label is the text drawn in its place**, section 128, and the place comes from two
sources. On architecture 12 base slot 17 states it: the key's rectangle, with the label attributed to
the **nearest** region rather than the first one containing its start point, and several strings in one
region joined in reading order. Elsewhere the keys sit in two columns beside the screen and the rows
are measured, from where activities whose names section 121 derives without geometry are drawn:

| architecture | rows, at pixel row | keys, left then right | line pitch |
|---|---|---|---|
| 8 | 42, 74, 106, 138 | 5/45, 6/46, 7/48, 8/44 | 14 |
| 9 | 13, 35 | 39/38, 31/30 | 11 |
| 14 | 35, 79 | 2/8, 9/34 | 14 |

A row's band is about a line and a half deep, since an item may wrap; a continuation line is at most
16 pixels below the line it continues, which is what keeps a menu footer out of a label. A row holds
one item across, belonging to both its keys, or one per column, split at the widest gap between
adjacent x positions when that gap is at least 24 pixels. 2001 labels come from the hit map and 4914
from this table, 98.9% of every screen key binding in the corpus, and they agree with the activity
chain on 62 of the 63 keys where both have an opinion.

**The controlled pair closes it.** The owner's account of the one change includes two new additional
buttons. Slot 8 grew by 8 bytes, an entry is 4, the record count is unchanged, and exactly one
record went from two entries to four. [findings.md](findings.md) section 27.

Slot 8's `0x7F` instructions also call **every** action list in the final packed run, exactly once
each, which is the only thing that reaches those lists.

Still established negatively, and still worth stating: **the key table is not the button to action
map.** It is byte identical across that pair while the described change reassigned buttons. Slot 8
is where a press meets an action list; the key table is something else.

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

**The order Logitech's compiler stores the nodes in**, [findings.md](findings.md) section 324. Level
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
nodes over 35 files, show no step down either, and the twenty that `compose.ts` gave a node all do.
No arch 14 tree has a tie in a bucket, and `nameTreeOrder` refuses one; on arch 8 and 12 ten distinct
pairs tie, fifteen times over ten trees, and every time the larger index is stored first, which is
recorded and not adopted, section 324. Arch 10 (Harmony 890 and 895) has no name tree. Nothing on the
remote reads the order; `buildNameTree` reproduces it.

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

#### Which key starts which activity, and which drawn name it carries

**Confirmed on all eleven containers of the corpus that carry a name tree, four architectures.** The
chain from a key press to an activity, section 121, and the reason it is four hops is that nothing in
the format names an activity directly:

1. a mode page's tagged list binds a key code to opcode `0x7F`, whose operand indexes base slot 10
2. that action list carries opcode `0x1F` with operand `0xFF | set`, selecting base slot 9 entry `set`
3. that entry's own tagged list carries a `0x7F` naming another base slot 10 list
4. that list writes `CurrentActivityState` with `0x80 | index`, and the operand is the activity

Every binding in the corpus is event type `0x80`, a press. Every activity is reachable from a key, and
**all of an activity's keys are on one page**, in all eleven containers, so an activity belongs to one
screen. An activity page's `0x7F` operands are a **contiguous ascending run** of base slot 10 indices in
the tagged list's own order, on 16 of 16 activity pages against under half of pages generally, so a
fresh run of action lists per activity menu is how the generator lays one out.

**The value count is stated in the name tree as well**, section 86's rule over 276 named variables
applied here: the node is `CurrentActivityState_0_<values>` and the trailing number is `second + 1`.
A writer that changes the activity count changes both, and because the count is text the name can get
**longer**, which makes the insertion a length edit to base slot 0. In this corpus that is
`one_config` alone, at nine values going to ten. Section 273.

**Tag 5's state writes are a subset of tag 1's**, on 50 of 50, and empty on 24, section 273. The
tighter reading that they are a **prefix** holds on 28 of 50, 4 of the 26 that write anything, and on
every activity of all four arch 8 containers. It always
runs a real list and never the null instruction. **What fires it is read**, section 313: the activity
switch runs it when the activity asked for is the one already running. On arch 14 Logitech's compiler
fills it with `S := 1`, tag 1's input steps, `F := 1`, the working screen step tag 1 defers taken
directly, and `S := 0`, on 43 of 43 of its activities, with no start up screen, power write or activity
write; `composeActivity` builds that list for an arch 14 activity with a screen. This said what fires
it was unread until section 313.

**The extra entry has no leave handler**, section 273, which is what lets it be recognised rather than
only defined: it carries tags 1 and 5 on 15 of 15, where all 50 activity entries carry exactly 1, 2 and
5. A leave handler may itself be a null instruction, opcode 0 operand 0, on 21 of the 50 and all of
those on arch 8 and arch 9.

**How many keys is per architecture**, section 273: an activity is bound by **two** keys on arch 14 and
by exactly one on arch 8, 9 and 12, in 15 of 15 user configs. Both of an arch 14 pair are presses, so
the second is a second key and not the first key's release, and a writer for a Harmony 600 that emits
one binding per activity leaves half its menu dead. Which physical keys the four scan codes involved
are is not established, since a scan code does not transfer between skins.

**`first` is what the firmware seeds the variable with at boot, on all three architectures whose
firmware is in hand**, section 274: each one asks its section seeker for raw slot 13, reads the header
and walks the records, writing each `first` into its variable. So an initial value is **stated** and
nothing infers it. Two differences on arch 9 (Harmony 525): it carries no `0xFEFE` "no initial value"
marker, filling the array's unused tail with `0xFE` instead, and its guard is per variable rather than
all or nothing, skipping indices 0 to 12 where arch 12 (Harmony One) and arch 14 (Harmony 600 and 700)
either seed everything or nothing.

**On arch 14 the guard is a checksum**, section 283: an XOR seeded `0xA5` over the variable array from
its nineteenth byte, 174 bytes from data `0xE22` on the 600's and 650's 0.2 builds and 237 from `0x912`
on the 700 2.8 and the 650's 0.4 package, against a stored sum every store restamps. The seeder runs
only when a container validated, and a matching sum then skips every store. A user container that fails
validation does not reload: the variables above byte 18 are painted `0xFE`. **The 700 2.8 and the 0.4
force a reload after a cache drop**, a flag the drop sets and the next boot turns into a spoiled sum;
the 0.2 builds have no such flag. **Measured on a Harmony 650 running 0.2, a changed `first` was
nonetheless in force straight after a write and its restart**, both ways, and every restart put the
clock back to the configuration's stamp, so an unstamped configuration shows its stamp time. **A bare
restart, with nothing written, puts back every variable an activity changed**, although the sum
matched. The infrared sender's ring survives it unchanged, so the restart does not clear all of data memory;
whether the variables' bank is cleared or something at boot spoils or bypasses the sum is open.

**The idle value is the record's `first` field**, base slot 13 at +0x00, which section 60 read as an
initial value and marked unconfirmed. No binding writes it, in fifteen of fifteen user configs. The
arch 9 safe mode container is the one place a list writes the idle value, and it is the one with zero
activities: that list returns the remote to idle rather than starting anything.

**How an activity is numbered**, section 273, which replaced a description of twelve containers with a
rule that covers all fifteen. The variable takes the values `0` to its record's `second` and:

| | measured |
|---|---|
| those values are **exactly** the activity values plus the idle value, no gap and nothing spare | 15 of 15 |
| `second` equals the **activity count** | 15 of 15 |
| the idle value is never itself an activity value | 15 of 15 |
| base slot 9 holds one activity entry per activity value, no duplicate and no spare | 15 of 15 |
| the idle value is the maximum | 12 of 15 |
| the idle value sits **inside** the run, an activity holding the maximum | 3 of 15 |
| and where it does, it is exactly **one below** the maximum | 3 of 3 |

The first row follows arithmetically from the second and third and is measured rather than derived, so
the table states what was run rather than six independent results. **Nothing has to work out which
value is idle**: `first` states it and the firmware seeds the variable from it at boot, section 138, so
the last two rows describe where a compiler happened to put a number rather than anything a reader
needs to infer. The three with the idle value inside
the run are `one_config`, `arch8_config_880` and `arch8_config_885`.

**An entry's position in base slot 9 does not encode its activity number.** Of the ten user configs
holding more than one activity, none has its activity entries in value order; the five that are in
order are exactly the five holding a single activity. `one_config`'s eight read 2, 0, 3, 4, 6, 8, 1, 5.
The number is carried by the write in step 4 above and by nothing structural, so a writer may append.

**A drawn name is attributed to an activity through the modes the chain enters**, not through geometry.
An activity's action lists also carry opcode `0x7E`, entering base slot 6 modes, and those modes' pages
draw the activity's own name, because a remote entering an activity says which one. So the page's string
that relates to one of those strings is that activity's label. Four rules make it a function rather
than a guess, in this order:

1. **A string the modes say exactly beats one they only contain.** Containment either way is what the
   Harmony 700 needs, since its menu label is the name plus a qualifier and its splash screen is a verb
   plus the name, and it is too loose on its own: an activity's chain also enters the mode that lists
   the devices, so every activity of a config says every device's name, and a label that is the first
   word of one becomes a candidate for all of them.
2. **Chrome is dropped**: a string several activities of a page claim is a title or a footer, and so is
   one that another activity page of the same mode draws identically.
3. **One label belongs to one activity**, a constraint to propagate rather than a preference.
4. **A label the menu wraps onto a second row** is looked for only where nothing on one row resolved.
   The candidate is the row's text joined to a text on the next row down, and it is accepted when it is
   a **prefix** of something the modes say, since a menu truncates a long name to the rows it has. Not
   the same column: on the Harmony 525 the second line is not aligned with the first.

**On arch 12 none of those four rules is used, because the container states the answer.** A One's
activity mode does not repeat the name its menu draws, and its scan codes cannot stand in for position:
the three activity pages of `one_config` bind activities on scans {50,51,52}, {50,48,49} and {48,49}
while all three draw their labels on the same rows, so no fixed code to row map can exist. Instead the
key's own rectangle is looked up in base slot 17 through the mode page's `lead` index, and the label is
the text the firmware's own hit test puts inside it. One distinct label per rectangle, and the eight
activities of `one_config` resolve on eight distinct keys. This route runs **first**, before the string
matching, because a stated answer beats an inferred one.

Together that names 50<!--fact:activities_named--> of the corpus's 50<!--fact:activities_total-->
activities, on all four architectures: **arch 8 22 of 22, arch 9 4 of 4, arch 12 11 of 11, arch 14 13 of
13.**

`packages/codec/src/inventory.ts` is the reader: `activityBindings`, `activityNames`,
`idleActivityValue`, `activityWriterCount`. `make activities` prints the figures per container.

**The device and activity counts are checked against a contributor's own description**, section 124: the
owner of one arch 8 remote wrote down what is in his config, and it says four devices and four
activities where the reader says four and four. Its menu has five entries, the fifth being the remote's
own settings, which is why a count taken from the menu would be wrong. Its idle value is 3, strictly
inside the values its keys write, which is the second container to show that the idle value is `first`
and not the highest.

#### Which devices a config drives, and what each one is called

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures**, section 126,
which names 63<!--fact:devices_named--> of 63<!--fact:devices_total--> devices. A device that sends codes is an
infrared group, section 86, so the list starts from base slot 5's group array and the question is
the name. **A device can send nothing**, section 240: on arch 12 and, since section 285, arch 14 the
device list itself is the population, and a row whose mode reaches no group is a device with `group`
undefined and no codes, unless its label names exactly one device already found that has no mode yet,
underscores read as spaces and a trailing `..` being the screen's elision, which is the Harmony 600's
Chromecast: a group of no codes, and a mode whose one page binds nothing. Fitted to that one case, with
one negative, a Wii that names nothing; a cut the screen does not mark with `..` is not matched.

A level 1 name that belongs to a device is spelled

```
<label>_<property>_<values>
```

where `<label>` is the user's own words for the device, underscores included and up to four tokens, and
`<property>` is one word: `Power`, `Input`, `InputType`, `TVInput`, `CompAVInput`, `Screen`. **A name
belonging to the config has a number in the property's place instead**, `CurrentActivityState_0_4`,
`CurrentLocation_1`, and on arch 14 the delay family whose qualifier is a Logitech device identifier. No
property is spelled as a number, and that is the discriminator.

Which infrared group a label belongs to comes from base slot 13. The variable's record carries its
transitions, each holding one action list instruction; for a device's `Power` or `Input` variable that
instruction is `0x7F`, and the list it names carries the `0x7D` that sends the code, whose operand's
high byte is the group. Three routes, in this order:

| route | devices | how |
|---|---|---|
| the names | 55 | the variable's transitions reach exactly one group |
| elimination | 5 | one label and one group left unpaired |
| the screen | 3 | the title of the device's own mode, when one candidate survives |

The counts behind route one: 102 device variables reach exactly one group, 13 reach none because the
variable has nothing to switch between, and **none reaches two**. No two variables of one device
disagree and no two devices claim one group; the reader refuses both rather than choosing, and neither
happens in the corpus.

Two independent checks, both in `packages/codec/test/inventory.test.ts`:

* **the label is drawn**, 53 of 55 exactly and 2 as a prefix a menu truncated, which is base slot 0's
  ASCII and base slot 7's glyph pixels agreeing through two readers that share no code;
* **on arch 9 and arch 14 the device's own mode draws its label as a title**, 17 of 17, where shifting
  the pairing to the next group breaks 16 of 16 shiftable cases. Arch 8 and arch 12 draw no title, 1 of
  31 and 0 of 7, which is why that is the last route and not the first.

`packages/codec/src/inventory.ts` is the reader: `devices`, `deviceVariables`, `deviceModeTitles` and
`infraredGroupsPerList`. `make devices` prints the figures with the source column, which is the number
to watch rather than the total.

**A command has no name.** An infrared record is a code and an index in its group, so an editor names a
command only where a screen draws a label for the key that sends it.

**What a button sends** is the codes of the base slot 10 list a tagged list binds it to, and **both
kinds of tagged list carry such bindings**: a mode page's list holds the soft keys, 3106 of them, and a
base slot 9 set holds the hard keys while an activity runs, 1342. A Harmony One's volume keys are in
its activities' sets and in no mode page at all. 85 bindings send several codes, which is a macro, so
the order is part of what the binding does. **4431 of the 4448 are event type `0x80`, a press**, and the
seventeen that are not are event type 0 in a set, tags 1, 2 and 5, which are its enter and leave
handlers rather than keys: nothing sends a code on a release or a repeat. `keyCodes`.

**Which devices an activity drives** is the groups its base slot 9 set addresses, that set being the key
map the activity installs, section 120. One to three per activity across the corpus, and every group is
one the config has. Taken over the whole set rather than the start sequence alone, since an activity that
sends the volume to a receiver is using it either way. `activities`, and `inventory` composes the lot
into one object so that an application does not have to know the order these readers run in.

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

That test picks out **the same six base slots in all fifteen config samples** across four
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

#### `0x7F` is a call, and the queue it calls into holds forty instructions

**Confirmed on arch 12, arch 14 and arch 9**, from the firmware on all three. A list is not
interpreted in place.
It is spooled whole into a ring of 120 bytes, which is exactly forty three byte instructions, and
the main loop then executes one instruction and rotates whatever that instruction pushed from the
tail of the ring to its head. So a `0x7F` runs its sublist **next** rather than after everything
already queued, the ring holds the call stack, and its depth is bounded by nesting rather than by a
list's length.

**Every push into a full ring is discarded with no error.** All three push routines test the count
first and return, and the two that report anything are called from code that ignores the answer. The
ring is shared: a key press, a state change, a display band announcement and the host's own
`MISC_QUEUE_ACTION` push into the same forty slots a running activity occupies.

So a config states an implicit demand, the deepest its own lists go, and a config whose demand
exceeds forty is one the remote accepts and silently does less than.

| | deepest run of any list |
|---|---|
| the four configs carrying a hand authored sequence or a fifteen device campaign | 35 |
| every other Harmony One config | 22 |
| Harmony 700 | 18 |
| Harmony 890 and Harmony 600 | 14 |
| Harmony 880 and 885 | 13 |
| Harmony 525 | 9 |

**Arch 9 carries the same ring and its address is known**, section 254: base `0x0346`, exclusive end
`0x03BE`, write pointer at `0x03BE` and `0x03BF` immediately past it, and a wrap constant of `0x78`
added on underflow and subtracted on overflow by two bound checks that name different ends. The base
plus the wrap is the end, so the three constants close on each other, and `0x78 / 3` is forty. The
count of bytes still pending sits at `0x345`, immediately **below** the base, and the fetch routine
decrements it; that routine names both the base and the end in one place and advances the read
pointer by **one byte** rather than by an instruction, section 255. That
figure was derived on arch 12 from the queue's own writer and here from three addresses on an
architecture with a different SFR map, so it is measured twice with nothing in common.

Nothing measured overflows, so forty is a rail for what a writer produces rather than a description
of the corpus. `packages/codec/src/queue.ts` computes it and `assertQueueFits` refuses; the figure it
reports follows `0x7F` only and is therefore a lower bound, since a write to a state variable also
pushes. `docs/findings.md` section 238.

#### Arch 9 re-validates the configuration on opcode `0x1F` to `0x3E` with operand high byte `0xC0` to `0xCF`

**Confirmed on arch 9 only**, from the firmware, sections 254 and 255. **Section 254 gave this as an
opcode band `0xC0` to `0xCF`**<!--superseded--> and section 255 corrects it: `0xC0` to `0xCF` is a
band of the **operand's high byte**, and the opcodes that reach the chain are `0x1F` to `0x3E`. The
handler takes that high byte's **low nibble** as an order selector and calls the container
re-validation, which validates a container and writes the verdict bit the status screens are chosen
by. Nibble values 2 and 3 choose which container goes first.

That is the same shape this document already records for `0x1F` on the other architectures, where the
operand's high byte carries a sub-command, `0xFE` to push into a table and `0xFF` to carry an index.
Arch 9 uses the byte the same way and has more bands of it: `0xD0`, `0xE0` and `0xF0` are three
further groups and what they do is unread, and `0xFC` is a fourth value, special cased in the
interpreter's loop head before the dispatch even begins.

**Neither other architecture has it.** On arch 12 the re-validation runs from a cable transition and
on arch 14 from a poll, both the firmware's decision rather than the configuration's, sections 251
and 252. So this is the only place in the format where a configuration can ask a remote to re-check
itself.

**No config in the corpus emits one**, which is the same answer section 118 gave for the two flash
writing opcodes on arch 14. A writer has no reason to emit it and this is recorded so that a
disassembly of an arch 9 action list has a name for the opcode rather than a gap.

**Confirmed, section 255:** the chain switches on `0x3D8`, and an arch 9 instruction is staged as
operand low, operand high, opcode, so `0x3D7` is the operand's low byte, `0x3D8` its high byte and
`0x3D9` the opcode. **That is the format's own field order**, `{ u16 operand; u8 opcode }` little
endian, read in file order, and what identifies it is the loop head comparing the **third** byte
against opcode `0x1F` and the **second** against a sub-command value. The bank is established by
chain of custody, the last explicit `MOVLB` before the branch into the chain plus the absence of any
other on the path, rather than by the disassembler's inference, which drops at a control transfer.

#### The introduction tour is one list, in one of two forms

Section 286, on all five arch 14 user configurations. The introduction tour, which a Harmony 650 was
seen opening after a reload, is started by one list, which Logitech's compiler writes in one of two
forms, shown on `calibration_h600` and the 650's configuration and skipped on the other three:

```
[0x80 + v   operand 1]      mark the tour started: variable v, seeded 0, written nowhere else
[0x7E       operand m]      shown: enter the tour's first screen
[0x7F       operand exit]   skipped: run the tour's exit instead, h600_config and both 700s
```

List 660 with `v` 44 and `m` 216 on the 650, list 396 with 43 and 183 on `calibration_h600`: ten
screens each, whose bindings reach exactly one list between them, the last screen's Exit, list 137
and list 63, and base slot 8's leading list names it twice. That exit reaches
`[0x71 0x8000 | v, 0x7F tour, 0x7E assistant]` after loading 0 into the byte register, while a second
variable, 21 on the 650, is 0, so it calls the tour list itself while `v` is 0, which is why the tour
marks itself first. The start list is list 3 on the 650, one of lists 1 to 4 that base slot 8's leading
list names, and the firmware queues one instruction of that list by index; which index a reload runs
is **unconfirmed**.

**Skipping it** is replacing `0x7E m` with `0x7F exit`, which is the vendor's skipped form: same length,
the mark kept, so the remote is left in the state a finished tour leaves. Written to the 650, and Danny
reports the tour did not appear after the restart, the Remote Assistant screen that follows the tour's
exit coming up instead. `introductionTour` reports the form and `skipIntroductionTour` refuses a tour
already skipped and a configuration with neither form.

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

#### `0x7C` is a per device delay in tenths of a second, capped at 100

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

**It is a delay, in tenths of a second**, section 235, which closes what this paragraph left open as
"the unit itself wants the timer that drains the queue"<!--superseded-->. The instinct in the old
wording was right, that folding by the larger is how a duration behaves; what settled it was a
calibration rather than the timer. Logitech's service compiled a configuration for the same three
devices twice, once for a Harmony One and once for a Harmony 600, and arch 14 states a device's power
on delay in a state variable whose unit its own screen spells out in tenths. The two agree device for
device, 3 of 3, so the operand is tenths of a second and 450 is 45 seconds.

**Where a device's power on delay lives on arch 8, 9 and 12 is one of these instructions**: exactly
one, at the top level of the action list a device's `Power` variable runs on its 0 to 1 transition,
naming that device's own group. 57 of 57 transitions across those three architectures carry one and
all 16 on arch 14 carry none. The nested list that sends the code carries its own `0x7C` of value 1,
the ordinary per send quantity, so a reader must stay at the top level. `powerOnInstructions` in
`packages/codec`. [findings.md](findings.md) sections 29, 70 and 235.

**Changing one is a two block write**, section 237. `applyEdits` restamps the trailer checksum, which
sits at the far end of the container, so the operand and the checksum land in different 64 KiB erase
blocks: `0x083BFD` and `0x1D6B66` on the spare Harmony One, 1.3 MiB apart. That makes two erases the
**floor** for any same length edit, not a property of page bindings, which is where section 187 first
measured it. It also means a writer needs known good content for a flash **region** rather than for a
container, since the checksum's block runs past the container's declared end.

**What the delay delays is the next code to that same device, and nothing else**, section 236, which
finishes what the fold rule above only hinted at. Three consumers drain the queue and two of them ask
one shared helper the same question, "is there an earlier entry naming this device": the picker
emits a send only when the answer is no, and the tick subtracts one from a quantity only when the
answer is no. So the queue is ordered **per device** and never globally. The scan is `0x13204` on
the Harmony 700 and `0x2706A` on the Harmony One, and it reads identically on the two but for the
kind mask, `0xF0` against `0xE0`; the picker is `0x1338A` and `0x2711C`, the tick `0x13706` and
`0x27318`.

Three consequences a reader or an editor has to carry.

* **A power on delay an activity cannot show is not a defect.** In this corpus 37<!--fact:delay_unfelt--> of 129<!--fact:delay_pairs--> pairs of an
  activity and a device it switches on send that device nothing after the power code, so those
  delays run down in the background and are never felt. 13 containers hold both kinds at once.
  `powerOnDelayReach` in `packages/codec` is the measurement.
* **Two devices never wait for each other.** An activity's power codes go out one after another
  whatever their delays are, because each delay only guards its own device's queue.
* **The quantity is a duration and not a repeat count**, settled by the tick decrementing it once
  per tick regardless of what is being transmitted, which is independent of section 235's unit
  and agrees with it.

Confirmed on hardware, both ways round, on a Harmony One on 1 September 2026: raising a television's
delay to ten seconds in an activity that sends it one command changed nothing observable, and raising
the receiver's in the same activity, where an input change follows, moved its gap from about six
seconds to about ten.

Arch 12 masks the kind with three bits and the device with four, so bit 4 of a tag belongs to neither
field, where arch 14 gives it to the kind. Unconfirmed what it is for, and nothing in the corpus can
say: the group is what fills those bits and no config here has more than seven groups, so bit 4 is
never set in the first place.

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
every other opcode in the inventory does. 14565<!--fact:high_band_uses--> uses of the four, no exception, in 15<!--fact:user_configs--> configs
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
whose second half is an ordinary instruction read as data, `0x7F` in 55 of its **75** uses, `0x7E` in 19
and `0x72` once.

**A reader has to skip that second half and this project's did not, for a month**, section 139: the
argument resolves as a real instruction at depth `meaning` every time, so the reading table was
reporting the meaning of bytes that are not one and `action_instructions` counted 58 of them. Every one
of the 75 heads a **two slot list**, so the whole list is the one instruction. `takesFollowingSlot` in
`packages/codec/src/actions.ts` is the predicate; a byte level reader still returns both slots, because
an emitter reproduces the argument.

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
| `0x0F` | operand low byte | peripherals and the **flash journal**, plus register moves. Little to do with the config: its `0xE0` band appends bytes to a region of the external flash, section 108. **Not one table across architectures**: arch 9's ladder is its own, section 139 |
| `0x3F` | operand high byte | four bands, one of which is the six byte instruction above |

**`0x3F`'s lowest band is `0xB0` on arch 14 and `0xC0` on arch 12, and the routines differ.** This
is the only structure in the format so far that is not one table across architectures,<!--superseded--> so a `0x3F`
band **must not** be ported between them. The failed prediction that found it is in section 73.

**It is one of three.** The opcode block `0x65` to `0x6E` is arch 14 only, section 107, below. And
`0x0F`'s bands differ on arch 9, section 139: the band at `0x60` is a real arm there and inside the
no-op range on arch 12 and arch 14, the band at `0x40` is the reverse, `0xD0` is tested and ignored on
arch 9 alone, and `0x90` is gated on a port bit that no other ladder tests.

Bands the firmware tests and then ignores are part of the specification, not gaps: `0x1F` below
`0xE0`, `0x0F` bands `0xF0` and `0x50` to `0x7F` **on arch 12 and arch 14**, where on arch 9 that
range holds a real arm at `0x60` and the ignored ones are `0xF0`, `0xD0`, `0x70` and everything below
`0x60`, section 139, and `0x3F`'s `0xF0` nibbles 3 and 5. The corpus
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
| 0 to 12 | sets channel `selector` of the I2C device at address 0x60 to the two bit value the byte table past base slot 15 group 9 states for bits 1 to 3 being nonzero. Which device it is is *not established* | 36 |
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

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures.** The operand is `{ u8 group; u8 index }`
into the base slot 5 table above, and **the set of distinct operands is exactly the set of valid
`(group, index)` pairs**: every record is reached and nothing outside the table is named,
4147<!--fact:ir_references--> records and 4147<!--fact:ir_references--> distinct operands over the
15<!--fact:user_configs--> user configs. Onto rather than one to one, since a
record can be sent from more than one list.

`0x7D` appears in exactly one list shape per config, `{0x7F, 0x7D, 0x7C}` on arch 14 and
`{0x7D, 0x7C}` on arch 8, 9 and 12, and in all 4267<!--fact:send_lists--> of those lists the `0x7C` operand's high byte
equals the `0x7D` operand's. So the grouping is shared between the infrared database, `0x7C` and
`0x7D`. The accompanying `0x7C` value takes seven values across the corpus, `0, 1, 2, 3, 4, 5, 10`, and is
1 in most sends. **On a device freshly added from the catalogue the value is one of three**, section 320,
on the 18 test device instances of the six power hold compiles, arch 14, which sit outside the corpus
and add a value it does not hold, 20: 1, the entry's `interKeyDelay` in tenths, or its `inputDelay` in
tenths. Every command has a list at 1. The power transitions' sends are at `interKeyDelay`; on seven
of the instances so is a second, uncalled list for each digit 0 to 9, which the Barco 6300 and the
Pioneer DEH-P47DH do not get at the same `interKeyDelay` of 5; and on three a second list for some input
commands is at `inputDelay`, which four others with input commands do not get. **Unconfirmed**: what
decides the digit and input copies. Not scored on the corpus, whose devices may carry delays their owner
edited: the Harmony 650's own configuration has 10 lists at 4 on a device the catalogue states with an
`interKeyDelay` of 1. What says it is a count rather than a second identifier is not the size of that set,
which grew when the population did: an identifier would have to separate the records of a group, the
largest group here holds 111, and the firmware caps this field at 100. Section 140.

**A writer must emit the pair, and a bare send is not a smaller version of it.** Section 278, on the
spare Harmony One: a composed list of `0x7D` alone sends from a key press and sends **nothing** when
an activity's state transition runs it, and adding the `0x7C` for the same device fixes it. So the
shape above is a rail and not a habit. Measured on arch 12 (Harmony One) only; the firmware's reason
is unread. On arch 14 every send list also opens with a `0x7F`, a delay step of three lists read in
section 287, which the composer emits.

**On arch 16 the cover is exact rather than onto**, section 261, which is the one architecture where
that can be asserted: the Harmony 350's action lists hold 130 send instructions with 130 distinct
operands against 130 records, and each of its three non-empty groups is covered contiguously from 0,
52, 48 and 30 records respectively. Elsewhere a group is covered in part, because a device's codeset
holds more codes than its activities bind, so the assertion there is that every named `(group, index)`
exists and not that every record is named. That container is outside every corpus wide population,
section 194, so the figures above are unaffected by it.

**Five arch 16 containers now, over two models, and one of them fills its table**, sections 262 to 265.
The exactness holds on all five: on a configuration a previous owner had compiled in 2011, and on the
programmed Harmony 300 whose four groups are all occupied, 154 sends over 154 records, which is the
first arch 16 sample where no group is empty.

Read with `gspm.ir_reference` and `gspm.ir_references`.
[findings.md](findings.md) sections 33 and 261.

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
| `0x71` | **eight operations on a state variable**: low byte indexes it, low nibble of the high byte selects, left hand side is a byte variable. Six comparisons and two updates, section 107, and **bit 15 gives a comparison a second arm**, section 140 |
| `0x70` | the same eight, and the same bit 15, with the accumulator as the left hand side |
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
| `0x7C` | **a delay before the next code to that device**, tenths of a second, into the same infrared queue `0x7D` uses, below |
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
nothing else**, over 2477<!--fact:compare_71_uses--> uses in 15<!--fact:user_configs--> configs, which is what made its high byte look like a group
of six. `0x70` uses `0` to `3` and also `7`, nine times.

The high byte's other end is a **flag, and it says how many arms the conditional has**, section 140.
The handler tests bit 15 after the comparison, on all seven firmware images across four
architectures, and with the bit set a comparison that comes out **true** zeroes the three bytes two
slots ahead in the interpreter's queue, which opcode `0x00` makes a no-op. So:

```
+0x00  u8   opcode, 0x70 or 0x71
+0x01  u16  operand:
             bits  0 to  7   the base slot 13 state variable index
             bits  8 to 11   the operation, 0 to 7 above
             bits 12 to 14   read by nothing, zero in every instruction in the corpus
             bit  15         set: the next two instructions are the two arms
                             clear: the next instruction runs only if the comparison holds
```

A false comparison always skips the next instruction by fetching its three bytes and discarding
them, so the untaken arm of a two armed conditional is cancelled in whichever direction it falls. The
untaken arm has to be **overwritten** rather than jumped over, because the handler returns before the
arm runs, which is why the interpreter reads its instructions out of a writable copy in RAM.

The corpus closure is exact in both directions: a flagged conditional is followed by exactly two
instructions and an unflagged one by exactly one, and the list ends there, over 600<!--fact:compare_else_arms--> and
2084<!--fact:compare_one_arm--> instructions with no exception. No list holds two conditionals and no arm is itself a conditional, so
an action list is a straight run with at most one branch at the end of it. 2357 of the 3284<!--fact:compare_arms--> arms are
`0x7F`, a call to another list, which is how a config puts more than one instruction in a branch; 17
are opcode `0x00`, an explicitly empty one. Every flagged instruction in the corpus is a `0x71`, which
is a fact about the corpus and not the format, since one handler serves both opcodes.

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
| `0x7C` | 7272 | 600 | 1 to 1380 | **a per device delay in tenths of a second**, `{ u8 group; u8 value }`, above |
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

Three independent fingerprints agree on this alignment across fifteen configs: the six pointer array
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
u16  operand       the operand of one action list instruction
u8   opcode        that instruction's opcode
```

**It is mode 0's own tagged list**, section 52, and each entry is a key event with one action list
instruction, run when mode 0 is on screen and the event matches. `docs/findings.md` section 311, read
in the Harmony 600's 0.2 firmware. Mode 0 is the "Use the Harmony setup software to add an Activity on
this button" screen on a Harmony 600 and 650, which an empty activity key opens by pushing the mode and
entering mode 0; a page with no text on a Harmony 700, whose placeholder is mode 4; and "The battery
level is low!" on a Harmony One. An entry of `00 00 00` is a deliberate swallow: the key matches, the
all zero instruction is dropped, and nothing below it sees the key.

**A writer emits it as a constant per model**, and these are the constants. On arch 14 the writer
generates it rather than copying it, `modeZeroKeyList` in `packages/codec/src/modezero.ts`, ordered by
the hash rule under "The order is a hash table's bucket order" below:

| model | entries | content | containers carrying exactly these bytes |
|---|---|---|---|
| Harmony 600 and 650 | 162 | every scan 1 to 54 as release, press and repeat, each `00 00 00`, except the press of scan 25, `FC FF 07`: instruction `0x07` with `0xFFFC`, pop the mode stack | 19 |
| Harmony 700 | 163 | an enter handler, tag `0x06`, setting one state variable to 1 (opcode `0x80` plus its number, which the compiler chooses: 40, 43 or 44 so far), then the 600's 162 key events in the same order, all `00 00 00`, scan 25 included | 10, in 3 variants by that one byte |
| Harmony One | 55 | each `0x7F`, calling the action list numbered by its own position, 0 to 54 | 34, every user configuration |

Elsewhere it is not one constant: arch 8, 10 and 16 samples agree in some pairs and differ in others,
section 311 lists which.

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
| 700 user config, arch 14 | 163 | scan codes 1 to 54 in each of release, press and repeat, plus `0x06` with no event bits. The opcode is `0x00` or `0xA8`. |
| 600 user config, arch 14 | 162 | exactly 54 scan codes times 3 event types, nothing else. The opcode is `0x00` or `0x07`. |
| One user config, arch 12 | 55 | 52 press codes plus `0x06`, `0x07`, `0x2D` with no event bits. No release or repeat entries at all. The opcode is `0x7F` throughout. |
| 88x class config, arch 8 | 56 | 53 press codes plus the same three, in the same order on `arch8_config_a` to `_d` and `arch8_config_880`, with operands differing in 2 of 56; `arch8_config_885` has 58 entries, section 311. |
| One safe-mode config | 2 | press of scan 47 and scan 46. A two button recovery UI. |
| 700 `Region_3` | 0 | empty |
| 525 config, arch 9 | n/a | the byte where a count would sit after `CMAH` is zero, so no table is claimed there. Arch 9 binds its keys in the mode records instead, see below |

So arch 14 enumerates all three event types for every key while arch 12 and arch 8 record presses
only. That is a real difference between the architectures rather than an artefact of the reading.

### A scan code's arithmetic is per architecture

The scanner that produces the code is not one routine across the family, so the same number means a
different position on each. Confirmed on arch 8 and arch 9 from the firmware and on arch 14 from a
live census; arch 12 is stated as the shape its sense wiring implies and is **unconfirmed**, since
no measurement there can produce a code.

| Arch | Lattice | Scan code | Range | Source |
|---|---|---|---|---|
| 8 (880, 885) | 4 by 16 | `(line - 1) * 4 + input`, `input` 1 to 4 | 1 to 64, nothing binds 64 | firmware, all four images, [findings.md](findings.md) section 144 |
| 9 (525) | 8 by 8 | `group * 8 + column`, both 1 to 8 | 1 to 64, nothing binds a multiple of 8 | firmware, section 89 |
| 14 (600, 700) | 4 by 14 | column is `(code - 1) mod 4` | 1 to 54 bound of 56 | 54 buttons pressed on the bench, section 48 |
| 12 (One) | not established | not established | 1 to 55 bound | sixteen buttons share one sense line, so no census yields a code. Section 48 |

The **position** of a key is a separate question and is not established anywhere: an encoding says
which cell a code is, not which printed button sits in that cell. Section 133 measured that it does
not follow from the codes either, since no divisor puts a Harmony 600's digit row on one line.
Recovering it needs the board, which is how the arch 8 lattice above was corroborated.

### The order is a hash table's bucket order

The list after the end marker stores its entries in ascending `hash(tag) & (capacity - 1)`, with
`hash(t) = t ^ (t >>> 7) ^ (t >>> 4)` and a capacity of 16 doubled while the count exceeds three
quarters of it: `java.util.HashMap` in Java 6 and 7. No step down on any of the 39 such lists of two or
more entries in the parseable corpus, 12 distinct and six of them contained in no other, on arch 8, 10,
12, 14 and 16. The hash is pinned term by term; the capacity only in places, and the starting 16 is
Java's default rather than a measurement. Other tagged lists are not asserted, and the Harmony 525's
safe mode container's mode 0 list breaks the rule. Two tags in one bucket
keep an order the rule does not give, and 33 of the 39 hold such a tie; mode 0's list on a Harmony
600, 650 and 700 holds none, so `modeZeroKeyList` generates it. [findings.md](findings.md) section 315.

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
has a button, with nothing left over on either side. See [findings.md](findings.md) section 89 for
the firmware side.

### The key table is not the button to action map

Whatever binds a key to an action, it is not this table. Two configs of the same Harmony 700 whose
owner recorded reassigning three buttons between them carry a byte identical key table, all 163
records. See [findings.md](findings.md) section 16.

That left the table looking like a description of the remote's own keypad and event capability.

> **Answered by section 311**: it is mode 0's own tagged list, the `u16` an instruction's operand and
> the byte called flags its opcode, which is the reading at the top of this part.

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

## Open questions

1. ~~What are the 19, 20 or 21 section slots?~~ **Answered.** All twenty base slots are accounted
   for: two header records, sixteen named sections, and 18 and 19 NULL in all 21 containers.
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
