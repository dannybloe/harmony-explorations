# Memory map: Harmony 525 (architecture 9)

Where everything lives on a Harmony 525. **The predictions were published first and the remote was
connected on 8 August 2026**, which is the point of the document: the measurements below are marked
as such and the predictions they answer are kept beside them rather than overwritten.

Eight of the nine identity predictions hold exactly. The one that failed was not in the list at
all, and it is the one that blocked the config read: the address a `READ_FLASH` must name. Full
argument in [findings.md](findings.md) section 76.

Read [memory-map.md](memory-map.md) first for the addressing rules and the `0xFE` and `0xFF`
notation. [memory-map-700.md](memory-map-700.md) is the same kind of document for a model nobody
here owns; this one differs in that the gap is about to close.

## Why architecture 9 is worth the trouble

It is the worst covered architecture in the corpus by a wide margin. The byte accounting reads
**67.1%<!--fact:coverage_h525_config-->** against 99.5% or better on both target architectures, and the reasons are all the same reason: there
was no arch 9 firmware anywhere, so every structure that did not decode had nothing to appeal to.
**That changed on 8 August 2026**: the application image is in the lab, read off the bench unit's
external flash. Nothing has been decoded out of it yet, so the number below has not moved.

**The margin is almost entirely one structure.** Infrared class 5 is 24467 of the 26368 bytes
still unaccounted, so setting it aside the arch 9 sample is read to about 97%, against 100.0% on
both target architectures. What else is left is a 1814 byte run after base slot 4 and very little
besides. Sections 66 and 67.

One specific thing is stuck behind that, and it is the largest single gap left:

* **Infrared class 5.** Every record in the arch 9 sample reads class 5 where arch 8, 12 and 14 all
  read class 1, and no firmware this project has implements it. Section 65 narrowed it rather than
  solving it: the 21 byte header is shared with class 1 and is read, and the **24511 bytes below
  the headers** are what is left. They are not duration streams and a terminator will not find
  their extent, so this one really does want the code.

A firmware image would speak to it. That was the prize, and this document was least able to predict
it because nothing was known about where arch 9 keeps its code. The answer: an update image in
external flash at `0x810000`, loading at program `0x1000`, with the running copy in the MCU's own
flash and a bootloader below it.

**Two items came off that list without one**, both on 7 August 2026, and they are worth carrying
into the first session with the hardware because they say **not every arch 9 gap needs the code**.
**Base slot 7** used to be here, the font reader refusing arch 9 because its glyphs are packed
differently; section 63 reads them, two bits to a pixel, and they draw as letters. And **the mode
record tail** used to be here too, at 43 of 114; section 64 found one missing operand count and it
is now 114 of 114. Between them they took the accounting from 14.6% to 49.8%, and section 65's
header reading took it to 55.1%.

## Measured, 8 August 2026

| | measured | how |
|---|---|---|
| `idProduct` | `0xC111` | enumeration, nothing opened |
| `bcdDevice` | `0x0916` | the same |
| `GET_VERSION` | `27 30 25 12 ff 90 16 09` | seven fields, not twelve; the reply's low nibble says so |
| read base of the config | `0x820000` | silent at `0x010000`, `0x020000` and `0x030000`; `AHCM` here |
| the container's own base | `0x020000` | its `end_addr`, and every pointer inside it |
| application firmware image | flash `0x810000`, loads at program `0x1000` | `loadaddr.find_base`, 717 boundary hits against 326 |
| a second image | flash `0x800000` | same `HG` header, a third the size |
| internal program memory | plain `0x000000`, reset vector `GOTO 0x0EF6` | one 62 byte read, inside the cap |
| the config | 51195 bytes, trailer checksum recomputes | read over USB by this project's own code |

The MCU is the `PIC18LF4550` concordance names for this architecture, and three things agree with
it: the application entry is `GOTO 0x07FB4`, which fits 32 KiB; the reset vector lands below
`0x1000`, so a bootloader sits under the application; and the flash id `0xFF:0x12` is a 25F040 of
512 KiB.

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
| 6 | `0x0c` | a compiled in constant on all four images available. **Wrong: it is `0x09`**, the architecture, and concordance reads that byte as the protocol when the block is seven long |
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

| | predicted | measured |
|---|---|---|
| `idProduct` | `0xC111` | `0xC111`, so the third party report is confirmed on a second unit |
| `bcdDevice` | `0x0916` | `0x0916`, so the `0x10` plus BCD skin rule is a MyHarmony era convention |

**Field 4 is the one to watch.** Section 57 concluded that its high nibble is the architecture, from
four images spanning only two architectures. A third architecture is a real test of that, and `0x90`
is the whole claim in one byte.

**Three of these can legitimately be wrong without the reading being wrong.** `BOARD`, `FLASH` and the firmware
version describe the unit the sample config was built for, and a second hand 525 of another
hardware revision or another firmware release may differ in all three. `SKIN` and `PROTOCOL` are
properties of the model and should not move. If field 5 is not `0x16`, something is wrong with the
reading rather than with the remote.

## External flash

Addresses in the left column are what a `READ_FLASH` command names. Subtract `0x800000` for the
space the container's own pointers use.

| Address | Length | Contents | Source |
|---|---|---|---|
| `0x800000` | 65536 | an `HG` framed image, a third the size of the one below | measured |
| `0x810000` | 65536 | the **application firmware**, code from program `0x1000` | measured |
| `0x820000` onward | 51195 on the bench unit, 78486 in the published sample | the **user config**, an `AHCM` container | measured |
| `0x870000` to `0x880000` | 65536 | the **log area** | base slot 2, `capacity 8192` at a stride of 8 |

**The flash is 512 KiB, not the 4 MiB both other architectures have**, and the chip is a 25F040.
That was first inferred here from one number, the log area's limit of `0x080000` with section 47's
rule that the region sits above the config, and it agrees with what the sample's owner reported
independently. It also fixes the config region at `0x020000` to `0x080000`, which is 384 KiB, and
the owner's "77 of 384 KiB" is the same arithmetic from the other side.

> **Corrected on 8 August 2026, section 76.** This said "bit 23 reads as a flag rather than an<!--superseded-->
> address bit", and it is the reverse. Both numbers are real and they are two address spaces: a
> `READ_FLASH` command must name `0x820000`, and the remote is **silent** at `0x020000`, while the
> container's `end_addr` and every pointer inside it count from `0x020000`. Deriving the container's
> base from the data is still right and it is not enough, because a reader that talks to a remote
> needs the other number too. `packages/corpus/src/read.ts` carries both, as `configBase` and
> `containerBase`, and computing the length from the wrong one gives minus 8337413.

Where the application firmware sits in flash is **not predicted at all**. On arch 12 it is external
and on arch 14 internal, and arch 9 has never been examined either way.

## Internal memory

Nothing was predicted, and the answer is that **there is no `0xFE` window here at all**. Internal
program memory answers at plain `0x000000`, and the first four bytes are `7b ef 07 f0`, a
`GOTO 0x0EF6`, which is the reset vector landing in a bootloader below the application.

That has a safety consequence worth stating plainly. `packages/usb` caps an internal read at one
chunk because an arch 12 remote leaves the USB bus when such a read ends in a one byte chunk, and
the cap keys on the top bytes `0xFE` and `0xFF`. On arch 9 it therefore **protected nothing** until
the region rule learned about the architecture. It now classifies top byte `0x00` on arch 9 as
internal, so the cap covers it. Only one 62 byte read has been done there, and the cap should not
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

## What one session settled

All five, on 8 August 2026. Kept in the original order and wording, with the outcome against each,
because a list of intentions rewritten after the fact teaches nobody anything.

| | outcome |
|---|---|
| 1. the command layer | works, with three arch 12 assumptions removed from `packages/usb` first |
| 2. the version block | seven of seven predicted bytes right, and the block is seven fields rather than twelve |
| 3. product id and `bcdDevice` | both exactly as reported; the `PROFILES` entry existed and its base was wrong |
| 4. a config read | 51195 bytes, filed, checksum recomputes, a second arch 9 sample at last |
| 5. the firmware | in the lab, load address derived with a wide margin |

In rough order of value.

1. **Whether the USB command layer works at all.** `packages/usb` was derived from arch 12 and arch
   14 firmware, and nothing establishes that an EasyZapper era remote answers the same commands with
   the same length nibble mapping. `GET_VERSION` is the whole test, and if it fails, everything
   below waits.
2. **The version block, against the table above.** Twelve bytes, seven of them predicted.
3. **The product id and the `bcdDevice`**, against `0xC111` and `0x0916`. A `PROFILES` entry in
   `packages/corpus/src/read.ts` carries the product id, the base and the 512 KiB ceiling, with
   `unverified: true` so that the difference between a measured profile and a reported one is in
   the data and not only in a comment. If the report is right, a config read simply works. If it is
   wrong the failure is loud rather than silent: `readConfig` checks for the container magic at the
   base and refuses when it is not there.

   **This entry did not exist until 8 August 2026, and this document claimed it did**, in those
   words, from the day it was written. Nobody would have found out until the remote was plugged in
   and the read refused. Worth recording because the document's whole purpose is to make the first
   session a test, and an untested claim about our own code is the one kind of prediction that
   cannot teach us anything when it fails.
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
