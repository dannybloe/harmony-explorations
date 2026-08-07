# Memory map: Harmony 525 (architecture 9)

Where everything is expected to live on a Harmony 525, written **before one was connected**.

A second hand 525 is on its way to the bench, which will make architecture 9 the third this project
has hardware for. This document exists so that the first session with it is a test rather than a
description: every number below is a prediction, derived from one config file somebody else
published, and each one can be wrong in a way that would teach us something.

Read [memory-map.md](memory-map.md) first for the addressing rules and the `0xFE` and `0xFF`
notation. [memory-map-700.md](memory-map-700.md) is the same kind of document for a model nobody
here owns; this one differs in that the gap is about to close.

## Why architecture 9 is worth the trouble

It is the worst covered architecture in the corpus by a wide margin. The byte accounting reads
**14.6%** against 98% on both target architectures, and the reasons are all the same reason: there
is no arch 9 firmware anywhere, so every structure that does not decode has nothing to appeal to.

Three specific things are stuck behind that:

* **Infrared class 5.** Every record in the arch 9 sample reads class 5 where arch 8, 12 and 14 all
  read class 1, and no firmware this project has implements it. It is why section 61's reader
  claims nothing on arch 9.
* **The mode record tail.** 43 of 114 decode. The other 71 have a shape nothing here recognises.
* **Base slot 7.** The font reader refuses arch 9 outright: the glyphs are packed differently.

A firmware image would speak to all three. That is the prize, and it is the thing this document is
least able to predict, because nothing is known about where arch 9 keeps its code.

## The identity, predicted field by field

This is the sharpest prediction available, because it is derived rather than guessed. It is derived
from **the arch 9 config already in the lab**, whose `META.md` records both what its XML header says
and what its owner measured off the physical remote. Reaching for that before predicting anything is
what `make corpus` is for, and this document did not, the first time it was written.

A config's
`INTENDEDVERSION` header names the remote it was built for, and on **both** bench remotes those
names map onto the measured `GET_VERSION` block exactly:

| header field | Harmony One | measured | Harmony 600 | measured |
|---|---|---|---|---|
| `BOARD` | 0.5.0 | field 1 `0x05` | 1.1.0 | field 1 `0x11` |
| `FLASH` | 0x1F:0xC8 | field 3 `0x1f`, field 2 `0xc8` | 0x15:0x1C | field 3 `0x15`, field 2 `0x1c` |
| `PROTOCOL` | 12 | field 4 `0xc0` | 14 | field 4 `0xe0` |
| `SKIN` | 54 | field 5 `0x36` | 71 | field 5 `0x47` |

The arch 9 sample's header reads `PROTOCOL 9`, `SKIN 22`, `FLASH 0xFF:0x12`, `BOARD 2.5.0`. So:

| Field | Predicted | From |
|---|---|---|
| 0 | `0x30` | firmware 3.0, **if this unit carries the same release** |
| 1 | `0x25` | `BOARD 2.5.0` |
| 2 | `0x12` | `FLASH 0xFF:0x12`, the device id |
| 3 | `0xFF` | the same, the manufacturer id |
| 4 | `0x90` | `PROTOCOL 9`, high nibble, low nibble zero on all four images |
| 5 | `0x16` | `SKIN 22` |
| 6 | `0x0c` | a compiled in constant on all four images available |
| 7, 10, 11 | not predicted | version bytes at program addresses no arch 9 image can be checked against |
| 8, 9 | not predicted | arch 12 reads internal images here and arch 14 hardcodes zero |

**The USB identity is reported rather than predicted**, and it breaks a rule. The owner of the
sample published `046D:C111`, `bcdDevice` **`0x0916`**. That does not follow the pattern the two
bench remotes set: the Harmony One enumerates `0x1054` and the 600 `0x1071`, a constant `0x10`
followed by the skin in BCD, which is how `docs/usb-protocol.md` corroborates field 5. Read the same
way the 525 would be `0x1022`, and it is not. Read as plain hex it is protocol 9 and skin 22, both
exact, which the One and 600 do not satisfy either way.

So the rule is **generation specific**, and the 525 is the case that shows it. Which reading is
right is not settled by one report of one unit, and an enumeration on the bench is what settles it:

| | predicted | if it holds |
|---|---|---|
| `idProduct` | `0xC111` | third party report confirmed on a second unit |
| `bcdDevice` | `0x0916` | the `0x10` plus BCD skin rule is a MyHarmony era convention, not a Harmony one |

**Field 4 is the one to watch.** Section 57 concluded that its high nibble is the architecture, from
four images spanning only two architectures. A third architecture is a real test of that, and `0x90`
is the whole claim in one byte.

**Three of these can legitimately be wrong without the reading being wrong.** `BOARD`, `FLASH` and the firmware
version describe the unit the sample config was built for, and a second hand 525 of another
hardware revision or another firmware release may differ in all three. `SKIN` and `PROTOCOL` are
properties of the model and should not move. If field 5 is not `0x16`, something is wrong with the
reading rather than with the remote.

## External flash

| Address | Length | Contents | Source |
|---|---|---|---|
| `0x020000` onward | 78486 in one sample | the **user config**, an `AHCM` container | the sample's own recovered base |
| `0x070000` to `0x080000` | 65536 | the **log area** | base slot 2 of the sample, `capacity 8192` at a stride of 8 |

**The flash is 512 KiB, not the 4 MiB both other architectures have**, and the chip is a 25F040.
That was first inferred here from one number, the log area's limit of `0x080000` with section 47's
rule that the region sits above the config, and it agrees with what the sample's owner reported
independently. It also fixes the config region at `0x020000` to `0x080000`, which is 384 KiB, and
the owner's "77 of 384 KiB" is the same arithmetic from the other side.

One trap for whoever adds the profile: **concordance's own table gives arch 9's config base as
`0x820000`**, where the value derived from this file's `end_addr` is `0x020000`. Bit 23 reads as a
flag rather than an address bit. Our reader derives the base from the data and is unaffected, which
is the point of deriving it.

Where the application firmware sits in flash is **not predicted at all**. On arch 12 it is external
and on arch 14 internal, and arch 9 has never been examined either way.

## Internal memory

Nothing is predicted. The MCU is unknown, the page structure is unknown, and whether `READ_FLASH`
with a top address byte of `0xFE` or `0xFF` even reaches internal memory on this architecture is
unknown. Note that on arch 12 an internal read that ends in a one byte chunk restarts the remote,
which is why `packages/usb` caps such a read at one chunk; that cap applies here too and should not
be lifted to find out whether arch 9 shares the fault.

## The container, already known from one sample

These are not predictions about the hardware but about the config it will be carrying, and they are
what a successful read should produce. All ten container checks pass on the sample.

| | |
|---|---|
| cookie and end marker | `AHCM` and `MCHA` |
| marker after the pointer table | `CMAH` |
| format | `0x1400`, the same as arch 14, which is why `format` is not an architecture identifier |
| pointer slots | 20, the base layout with no insertions |
| architecture, stated in slot 1 | 9 |
| infrared | class 5 in every record |

## What one session would settle

In rough order of value.

1. **Whether the USB command layer works at all.** `packages/usb` was derived from arch 12 and arch
   14 firmware, and nothing establishes that an EasyZapper era remote answers the same commands with
   the same length nibble mapping. `GET_VERSION` is the whole test, and if it fails, everything
   below waits.
2. **The version block, against the table above.** Twelve bytes, seven of them predicted.
3. **The product id and the `bcdDevice`**, against `0xC111` and `0x0916`. A `PROFILES` entry is
   already in `packages/corpus/src/read.ts`, marked as resting on a third party report, so a config
   read will simply work if the report is right. The failure mode if it is wrong is loud rather than
   silent: `readConfig` checks for the container magic at the base and refuses when it is not
   there.
4. **A config read**, verified against its own container checks and filed in the lab. That is a
   second arch 9 sample, which the corpus has never had, and two samples is where this project's
   verification standard starts.
5. **The firmware.** The prize, and the least predictable part. `loadaddr.find_base` is what to
   reach for once there are bytes, and the margin over the runner up is what says whether to believe
   it.

## Safety, which is different here

The rails in [../CLAUDE.md](../CLAUDE.md) apply unchanged, and one thing about this model makes them
matter more rather than less. Section 56 established that Logitech's MyHarmony service is alive and
still compiles configs. **That is not the service this remote used.** The 5xx series belongs to the
classic platform, whose site now serves a discontinuation notice, so there is no path that would put
a working config back on a 525 if one were destroyed. The remote is read only, the same as every
other, and the fallback that exists for a Harmony One does not exist for this one.
