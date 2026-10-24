# The container

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
`trailer_checksum_recomputes` as a container check. [findings.md](../../docs/findings.md) section 41.

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
the arch 9 device clone under [findings.md](../../docs/findings.md) section 117.
#### The metadata archive, and the arch 16 slots

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
