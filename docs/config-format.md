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

Validated against **twelve samples across four architectures**, five base addresses
(`0x002000`, `0x020000`, `0x030000`, `0x040000`), three format versions and four pointer table
lengths. Every consistency check passes on all twelve. See `tests/test_gspm.py`.

```
0x00  char[4]  cookie          per architecture, see the table below
0x04  u32      end_addr        absolute flash address of the trailing end marker
0x08  u32      format          nibble BCD version: 0x1400 = 1.4, 0x1500, 0x1600
0x0C  u32[N]   section_ptr[]   absolute flash addresses; 0 means the section is absent
      u8[...]  00 ...          zero padding, so the marker lands on its offset
      char[4]  marker          per architecture; starts the key table on arch 8, 12 and 14
      u8       count
               { u8 event_code; u16 index; u8 flags }[count]
      ...      remaining sections, reached via section_ptr
end-6 u16      checksum        algorithm NOT YET DERIVED
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

The cookies agree with concordance's own per architecture table, which also lists `BMBM` for
arch 7 (the older 6xx). No arch 7 sample has been seen here, so its end marker is unknown and
it is deliberately absent from the parser. Architectures 2 and 3 use a two byte cookie and are
a different layout.

Note that `format` is not an architecture identifier: arch 9 and arch 14 both carry `0x1400`.
It is a generation of the format, and the cookie is what says which architecture.

### Recovering the base address

Needed to turn the pointers into file offsets, and derivable from the blob itself:

```
base = end_addr - (offset_of_end_marker - offset_of_cookie)
```

Exact on all twelve samples. Worth noting against concordance's table, which lists arch 9's
`config_base` as `0x820000` where the derived value is `0x020000`; bit 23 looks like a flag
rather than an address bit. Deriving from the data sidesteps the question.

### The pointer table length is architecture dependent and not stated in the header

| Architecture | N | marker at |
|---|---|---|
| 8 | 20 | `0x5F` |
| 9 | 19 | `0x5B` |
| 12 | 21 | `0x63` |
| 14 | 19 | `0x5B` |

Derive it rather than hardcoding per model:

```
N = (marker_offset - 3 - 0x0C) / 4
```

The marker itself is found from the data: it is the first four uppercase letters preceded by
three zero bytes. Which four letters they are is a per architecture fact, so the parser asserts
it against the table above rather than computing it.

**One ambiguity, stated rather than papered over.** On arch 8 and arch 9 the byte after the
last non-zero pointer leaves more than three zero bytes before the marker, so 19 pointers plus
seven zeros is indistinguishable from 20 pointers where the last is NULL plus three zeros. Both
readings decode identically, because a zero pointer means the section is absent. The formula
above takes the longer reading, which is why the table says 20 for arch 8 and 19 for arch 9;
`tests/test_gspm.py` pins the consequence, which is that the final slot is NULL.

## The EZHex wrapper

A config as read off a remote or handed to it is an XML header, a `\r\n`, then the container as
raw bytes. The header makes the split verifiable, and pins what remote will accept the file.

```
<BINARYDATASIZE>   exact payload length in bytes; the payload is the last N bytes of the file
<CHECKSUM>         XOR of every payload byte, seeded 0x69
<INTENDEDVERSION>  PROTOCOL, SKIN, FLASH, BOARD that the remote must report
```

The size and checksum rules are verified on all eight config samples in the corpus,
`src/harmony/ezfile.py`. The consequence of `INTENDEDVERSION` is **reported, not verified
here**: harmony-decompiler states that a remote refuses a mismatched config with "This
configuration file is not compatible with your Harmony Remote". Nothing has been written to a
remote in this project, so treat that as the reason to match the header, not as our own
observation.

Not to be confused with the trailer checksum inside the container, which is a different
algorithm and is still unknown. This one covers the whole payload and is trivially
reproducible; that one is what the remote validates internally.

## Sections

Slot meanings are **not yet known**. This is the single highest-value gap, and there is a
proven method for closing it, described in [roadmap.md](roadmap.md) step 6: the firmware copies
each config pointer into a per-subsystem RAM variable, so finding the consumer of that variable
labels the section by function. The infrared section was identified exactly this way.

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
| 0 | the one `0xFEED` frame, holding a named tree rooted at `Root` | thirteen samples, below |
| 1 | seven byte record stating the architecture | thirteen samples, below |
| 5, 7, 10, 11, 12, 15 | count prefixed arrays of three byte flash pointers | nine configs, below |
| 18 | NULL in every sample of every architecture | nine configs |
| all others | unknown | |

### Slot 0: the only `0xFEED` frame

Exactly one frame per container, always at slot 0. Confirmed on twelve samples across four
architectures, and confirmed as *exclusive* by validating every `0xFEED` byte pair in each
container: no other one closes.

```
+0x00  u16      0xFEED        stored little endian, so `ed fe` in a hex dump
+0x02  u16      length        counted from the cookie, stops short of the terminator
+0x04  u8       00            zero in every sample
+0x05  ...      payload       begins A7 08 00 00 00 00 00 "Root"
+len   u16      0xBEEF
```

The frame therefore occupies `length + 2` bytes, and in all twelve samples the slot 1 pointer
lands on exactly that byte. That is an independent confirmation of the length rule, because the
pointer and the length come from different places in the file.

One exception, and it is the reason `length` is validated rather than trusted: the Harmony
One's safe mode config carries a **degenerate empty frame**, `ed fe 00 00 00 ef be`, whose
length is 0 while its terminator sits five bytes in. Read `length == 0` as "empty" rather than
as an offset. Whether the firmware's own parser special cases it that way is **unconfirmed**;
no arch 12 or arch 14 config parser has been located in the firmware yet.

The payload is a tree of named nodes. In the Harmony 700 sample it holds 62 names, of the shape
`TV_Power_2`, `Receiver_Input_16`, `PowerOnDelay_<deviceid>_65278`, and the trailing number
looks like the variable's range rather than its value. That reading is a **lead, not a
finding**: the firmware routine that consumes the section has not been found, so what the
section is *for* is still open. `.claude/skills/trace-section/SKILL.md` is the method that
would settle it.

### Slot 1: the config states its own architecture

A fixed seven byte record:

```
+0x00  u8       architecture   the protocol number: 8, 9, 12, 14
+0x01  u8       architecture   the same value again
+0x02  u16      version word   per model, meaning not established
+0x04  u8[3]    00 00 00
```

Confirmed on twelve samples spanning architectures 8, 9, 12 and 14. Every one has its
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
configs that differ in 73 to 84 percent of their bytes share it), and not purely the model (the
One's safe mode config differs from the One's user config). A generator or target firmware
version is the obvious guess and remains a guess.

Observed pointer values, for orientation:

| Slot | One safe cfg @`0x2000` | One user cfg @`0x40000` | 600 user cfg @`0x30000` | 700 user cfg @`0x30000` |
|---|---|---|---|---|
| 0 | `0x0029AD` | `0x076197` | `0x063702` | `0x06E3B5` |
| 1 to 6 | `0x0029B4`..`0x002A50` | `0x0762AE`..`0x076740` | `0x063D26`..`0x064007` | `0x06ECCD`..`0x06F1A6` |
| 7 | `0x004107` | `0x085E44` | `0x072CDB` | `0x0812C1` |
| 8 | NULL | NULL | `0x072D0A` | `0x0812F6` |
| 9 to 18 | `0x00410C`..`0x0042BA` | `0x085E7C`..`0x08C076` | `0x0734B5`..`0x07A33B` | `0x0820FE`..NULL |
| 19, 20 | `0x0042BC`, NULL | `0x08C078`, NULL | n/a, 19 slots only | n/a, 19 slots only |

The non-NULL pointers ascend with the slot number in every sample, so sections are laid out in
slot order. That is what makes a section length well defined, since the header does not state
one: a section runs to the next non-NULL pointer, and the last runs to the trailer.

The NULL slots are per architecture rather than per config: slot 18 on arch 9 and arch 14, slots
8 and 19 on arch 8, slots 8 and 20 on arch 12, in every sample of each.

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

What they point at is **not yet established**. The counts are suggestive (slot 10's thousands of
entries against slot 5's handful) but a count is not a label, and a label has to come from the
firmware routine that reads the section.

### One table, four architectures

The pointer table is the same table everywhere, with per architecture insertions rather than per
architecture meanings:

| Architecture | slots | insertions relative to the base layout |
|---|---|---|
| 9, 14 | 19 | none, this is the base layout |
| 8 | 20 | a NULL at slot 8 |
| 12 | 21 | a NULL at slot 8, and a real section at slot 18 |

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

Record layout is consistent across architectures, but the **meaning is not**, and this is
unresolved.

```
u8   event_code
u16  index
u8   flags
```

| Sample | count | Shape |
|---|---|---|
| One user config, arch 12 | 55 | 52 matrix codes over 7 rows by 8 columns, plus 3 non-matrix (`0x06`, `0x07`, `0x2D`). `index` runs 0,1,2..54 sequentially. `flags` is `0x7F` throughout. |
| 600 user config, arch 14 | 162 | 108 matrix codes spanning rows 0 to 6 and 8 to 14, plus 54 contiguous non-matrix codes `0x41` to `0x76`. `index` is 0 on every record. `flags` is `0x00` or `0x07`. |
| 88x class config, arch 8 | 56 | 53 matrix codes, plus the same 3 non-matrix codes as the One. `index` is mostly 0 to 3 with one large outlier. `flags` is `0x00`, `0x73` or `0x7F`. Identical in all four arch 8 samples. |
| One safe-mode config | 2 | codes `0xAF`, `0xAE`, `flags` `0x00`. Looks like a two-button recovery UI. |
| 700 `Region_3` | 0 | empty |
| 525 config, arch 9 | n/a | the byte where a count would sit after `CMAH` is zero, so no table is claimed there |

Matrix codes appear to encode `0x80 | (row << 3) | col`.

### Arch 8 and arch 12 share a canonical code ordering

47 codes appear in both the One's table and the arch 8 table, and on that shared subset the
two list them in the **same order**, with exactly one adjacent transposition: the One has
`0x06 0x8E 0x07` where arch 8 has `0x06 0x07 0x8E`. Remove `0x8E` and the two sequences are
identical. Pinned in `tests/test_gspm.py`.

Codes unique to each, which is presumably the physical difference between the two remotes:

| Only on the One | Only on arch 8 |
|---|---|
| `0x84` `0x89` `0x93` `0x9C` `0x9E` `0xA7` `0xAF` `0xB1` | `0xA9` `0xB6` `0xB8` `0xB9` `0xBA` `0xBB` `0xBD` `0xBE` `0xBF` |

Consequence, and it is the reason this matters: the ordering looks like Logitech's canonical
key order rather than anything per model. Establishing which physical button each code belongs
to on one remote should therefore carry most of the way to the others. Upstream reports the
same relationship between arch 8 and arch 9, 41 codes of 51 shared in order, which is
independent support for the same conclusion.

### The 600's table is not that remote's physical key matrix

The firmware's keypad scanner reads a 14 by 4 matrix, so 56 physical positions, and its native
key code is a linear 1 to 56 index rather than the `0x80 | ...` form. 108 codes cannot describe
56 positions. The most likely reading is that arch 14's table enumerates a supported event-code
namespace shared across the family, while arch 8's and arch 12's are actual binding tables.
Unconfirmed.

There must therefore be a translation somewhere between the scanner's linear index and the
event codes the config uses. It has not been found. Upstream reports that on their architecture
the top bits of the event code carry the event type, `0x80` press, `0x40` release, `0xC0`
repeat, which would explain why the 600 sees a second bank of rows at 8 to 14 and is the most
promising lead on the `flags` field. Also unconfirmed here.

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
Cross-checked against a real carrier: 38 kHz is a 26.3 us period, so the stored value is 263,
and `263 * 4 / 10` = 105 cycles, which at 4 MIPS is 26.25 us. That closes, and it confirms both
the 0.1 us storage unit and the clock.

## Open questions

1. What are the 19, 20 or 21 section slots? Method in [roadmap.md](roadmap.md) step 6.
2. The trailer checksum algorithm. On the critical path: nothing can be uploaded without it.
   The firmware routine that validates a config on boot is where to look.
3. Three of the four IR encoding classes. The dispatcher routes four selectors; only one is
   traced.
4. The key table's semantic difference between architectures, and the meaning of `flags`
   (`0x00`, `0x07`, `0x73`, `0x7F` observed) and of `index` (sequential on the One, all zero on
   the 600, small values plus an outlier on arch 8).
5. The 288-byte table at arch 12 flash `0x000000-0x00011F`, in which every nibble is one of
   {6, 7, E, F}. On NOR flash that is the signature of a counter advanced by clearing one bit
   at a time. Boot counter, config generation counter and wear map are all plausible. Diffing
   that range across two dumps of the same remote taken at different times would settle it.
