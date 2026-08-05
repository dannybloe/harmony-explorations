# The GSPM config format

Living specification. This is the deliverable other tools consume, so it is kept separate
from the narrative in [findings.md](findings.md). Anything stated here is confirmed against at
least two independent samples unless marked otherwise.

Applies to architectures 12 (Harmony One) and 14 (Harmony 600, 700). Architecture 15 has not
been examined.

**The 525's container is nested inside this one**, so parsers are shareable. GSPM is an outer
layer carrying an absolute pointer table; each section it points at is a `0xFEED`/`0xBEEF`
framed block, which is the container documented for the Harmony 525 class in
harmony-decompiler discussion #1.

```
GSPM header                    arch 12/14 only, absolute pointer table
  section 0   FEED ... BEEF    per-section frame, as on the 525
  section 1   FEED ... BEEF
  ...
u16 checksum + "PTYY"
```

## Outer container

Validated against four samples at four base addresses: `0x002000`, `0x020000`, `0x030000` and
`0x040000`, covering both format versions and both pointer table lengths.

```
0x00  char[4]  "GSPM"          magic (concordance's arch 12/14 cookie 0x4D505347)
0x04  u32      end_addr        absolute flash address of the trailing "PTYY" marker
0x08  u32      format          nibble BCD version: 0x1600 = 1.6, 0x1400 = 1.4
0x0C  u32[N]   section_ptr[]   absolute flash addresses; 0 means the section is absent
      u8[3]    00 00 00        padding
      char[4]  "LWJL"          first section magic
      u8       count
               { u8 event_code; u16 index; u8 flags }[count]
      ...      remaining sections, reached via section_ptr
end-6 u16      checksum        algorithm NOT YET DERIVED
end-4 char[4]  "PTYY"          end marker
```

All little endian. Pointers are **absolute flash addresses, not offsets**, so a blob is
position dependent and cannot simply be relocated.

### Recovering the base address

Needed to turn the pointers into file offsets, and it is derivable from the blob itself:

```
base = end_addr - (offset_of_PTYY - offset_of_GSPM)
```

### The pointer table length is architecture dependent and not stated in the header

| Architecture | format | N | `LWJL` at |
|---|---|---|---|
| 12 | `0x1600` | 21 | `0x63` |
| 14 | `0x1400` | 19 | `0x5B` |

Derive it rather than hardcoding per model:

```
N = (offset_of_LWJL - 3 - 0x0C) / 4
```

Both rules are implemented in `tools/gspm_parse.py`.

## Sections

Slot meanings are **not yet known**. This is the single highest-value gap, and there is a
proven method for closing it, described in the plan in [forum-post.md](forum-post.md) as
Phase 1: the firmware copies each config pointer into a per-subsystem RAM variable, so finding
the consumer of that variable labels the section by function. The infrared section was
identified exactly this way.

Known so far:

| Slot | Meaning | Evidence |
|---|---|---|
| 0 to 20 | unknown | |

Observed pointer values, for orientation:

| Slot | One safe cfg @`0x2000` | One user cfg @`0x40000` | 600 user cfg @`0x30000` |
|---|---|---|---|
| 0 | `0x0029AD` | `0x076197` | `0x063702` |
| 1 to 6 | `0x0029B4`..`0x002A50` | `0x0762AE`..`0x076740` | `0x063D26`..`0x064007` |
| 7 | `0x004107` | `0x085E44` | `0x072CDB` |
| 8 | NULL | NULL | `0x072D0A` |
| 9 to 18 | `0x00410C`..`0x0042BA` | `0x085E7C`..`0x08C076` | `0x0734B5`..`0x07A33B` |
| 19, 20 | `0x0042BC`, NULL | `0x08C078`, NULL | n/a, 19 slots only |

In the 1.6 MB Harmony One user config all 21 pointers land within the first 310 KiB. The
remaining 1.36 MB is reached indirectly, presumably the IR code database and the touchscreen
bitmaps.

## LWJL

Record layout is consistent across architectures, but the **meaning is not**, and this is
unresolved.

```
u8   event_code
u16  index
u8   flags
```

| Sample | count | Shape |
|---|---|---|
| One user config | 55 | 52 matrix codes over 7 rows by 8 columns, plus 3 non-matrix (`0x06`, `0x07`, `0x2D`). `index` runs 0,1,2..54 sequentially. `flags` is `0x7F` throughout. |
| 600 user config | 162 | 108 matrix codes spanning rows 0 to 6 and 8 to 14, plus 54 contiguous non-matrix codes `0x41` to `0x76`. `index` is 0 on every record. `flags` is `0x00` or `0x07`. |
| One safe-mode config | 2 | codes `0xAF`, `0xAE`, `flags` `0x00`. Looks like a two-button recovery UI. |
| 700 `Region_3` | 0 | empty |

Matrix codes appear to encode `0x80 | (row << 3) | col`.

**The 600's table is not that remote's physical key matrix.** The firmware's keypad scanner
reads a 14 by 4 matrix, so 56 physical positions, and its native key code is a linear 1 to 56
index rather than the `0x80 | ...` form. 108 codes cannot describe 56 positions. The most
likely reading is that arch 14's LWJL enumerates a supported event-code namespace shared
across the family, while arch 12's is an actual binding table. Unconfirmed.

There must therefore be a translation somewhere between the scanner's linear index and the
event codes the config uses. It has not been found.

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

1. What are the 19 or 21 section slots? Phase 1 method above.
2. The trailer checksum algorithm. On the critical path: nothing can be uploaded without it.
   The firmware routine that validates a config on boot is where to look.
3. Three of the four IR encoding classes. The dispatcher routes four selectors; only one is
   traced.
4. The LWJL semantic difference between architectures.
5. The 288-byte table at arch 12 flash `0x000000-0x00011F`, in which every nibble is one of
   {6, 7, E, F}. On NOR flash that is the signature of a counter advanced by clearing one bit
   at a time. Boot counter, config generation counter and wear map are all plausible. Diffing
   that range across two dumps of the same remote taken at different times would settle it.
