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

It **was** the worst covered architecture in the corpus by a wide margin, and it is not any more:
the byte accounting reads **100.0%<!--fact:coverage_h525_config-->** against 100.0% on both target
architectures, with nothing left unattributed in either of its user configs since section 84, and
its safe mode container at 98.2% since section 85. The reasons it
lagged were all the same reason: there was no arch 9 firmware anywhere, so every structure that did
not decode had nothing to appeal to. **That changed on 8 August 2026**, when the application image
came off the bench unit's external flash and its internal program flash came off over USB.

**The margin was almost entirely one structure**, infrared class 5, which was 24467 of the 26368
bytes then unaccounted. Section 82 read it out of that firmware: a header pointer names a body of
one byte indices, the body names a symbol table, and the table names short pulse blocks, so a code
is spelled from a dictionary rather than written out. Every record in the arch 9 corpus reads class
5 where arch 8, 12 and 14 all read class 1.

That is what the firmware was the prize for, and this document was least able to predict where the
firmware would be, because nothing was known about where arch 9 keeps its code. The answer: an
update image in external flash at `0x810000`, loading at program `0x1000`, with the running copy in
the MCU's own flash and a bootloader below it.

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
| internal program memory | plain `0x000000`; 32 KiB read in 529 single chunk commands, no restart | health checked every 64 reads |
| the safe mode config | flash `0x818000`, container base `0x018000` | the same `0x800000` offset the user config has |
| the config | 51195 bytes, trailer checksum recomputes | read over USB by this project's own code |
| **data memory** | **unreadable**: `READ_MISC` selector `0x07` answers and returns zero for all 1696 addresses tried | 9 August 2026, calibrated against a 600 and a One which return live data in the same banks |

That last row was not predicted at all, and nothing in this document would have led anyone to
predict it: live RAM over USB had worked on both other architectures and was treated as a property
of the command layer rather than of the build. It is the reason the 525 gets no keypad census and
the reason the arch 9 matrix had to come out of the firmware. `docs/findings.md` sections 89 and 90.

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
| `0x800000` | 65536 | the **safe mode application**, `HG` framed, program `0x1000` to `0x7FFF` | measured |
| `0x810000` | 65536 | the **application firmware**, byte identical to internal `0x1000` onward | measured |
| `0x818000` | 15342 | the **safe mode config**, an `AHCM` container based at `0x018000` | measured |
| `0x820000` onward | 51195 on the bench unit, 78486 in the published sample | the **user config**, an `AHCM` container | measured |
| `0x870000` to `0x880000` | 65536 | the **log area** | base slot 2, `capacity 8192` at a stride of 8 |

**The flash is 512 KiB, far below either of the other architectures**, and the chip is a 25F040.
Arch 12's is 4 MiB and arch 14's is 2 MiB, both fixed by their own address validators,
`docs/findings.md` section 88.
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

## The address space is a set of windows, and three of them are not flash

Read out of the validator's own `XORLW` chain, section 119, present identically in the application and
the safe mode image. Every bound is a documented size of the PIC18F4550, which is why the table is
believed as a whole rather than window by window.

| top byte | offset below | what it is | what is at the bottom of it |
|---|---|---|---|
| `0x00` | `0x8000` | internal program flash, 32 KiB | the reset vector above |
| `0x20` | `0x0100` | on chip EEPROM, 256 bytes | byte 0 is the bootloader's image selector |
| `0x30` | `0x0008` | eight bytes, read arm fetches nothing | unread |
| `0x40` | `0x0800` | data memory, 2048 bytes | the window answers zeros whatever is there, section 137 |
| `0x80` to `0x87` | the block | the serial flash chip, 512 KiB | everything in the table above |

The EEPROM is the one that mattered: concordance's firmware update state cell, which its table calls
flash `0x200000`<!--superseded-->, is EEPROM byte 0. Its five values are read in section 119 and the value on this
remote, stranded in safe mode, is 0.

**Section 88 read this validator from its default arm**, so its rule described only what a top byte
matching none of the four gets, and `packages/usb` refused three windows the remote serves. Corrected
in `ARCH9_WINDOWS`.

`0x1000` to `0x7FFF` is the application, and it is **byte identical** to the external image at
`0x810000` over all 28672 bytes, which confirms both that the image is the running code and that
its load address is `0x1000`. Below `0x1000` is a bootloader that exists in no external image:
3781 of its 4096 bytes are used, its reset vector stays inside itself and its interrupt vector
jumps into the application.

That has a safety consequence worth stating plainly. `packages/usb` refuses an internal read whose
final chunk would be one byte, because an arch 12 remote leaves the USB bus on exactly that, and the
rule keys on the top bytes `0xFE` and `0xFF`. On arch 9 it therefore **protected nothing** until the
region rule learned about the architecture. It now classifies top byte `0x00` on arch 9 as internal,
so the refusal covers it. Only one 62 byte read has been done there, and the rule should not be
widened to find out whether arch 9 shares the fault. Section 93 narrowed it from a one chunk cap on
arch 12, where 64 and 124 byte reads are measured safe; **that measurement is arch 12's and no arch
9 read has tested it.**

## The container, already known from one sample

These are not predictions about the hardware but about the config it will be carrying, and they are
what a successful read should produce. All 14<!--fact:container_checks_arch9--> container checks pass on the sample. Fourteen and not
fifteen because the `AHCM` family carries no key table after the marker, so `key_table_is_complete`
does not apply here.

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

## Does a Harmony 525 set its clock from base slot 3? Predicted 13 August 2026, before reading

Section 111 measured a Harmony One (arch 12) reading base slot 3's timestamp into its clock at every
boot: a power cycled remote reported that record's date exactly and its time plus its own uptime. All
three architectures on the bench carry the same eleven byte record and only arch 12 has been measured,
so this is one round of hardware on a Harmony 525 (arch 9), read only, with the batteries pulled and
replaced at 11:53 local on 13 August 2026.

The bench remote's own config was built at **2013-10-01T18:40:44**, which is what makes the reading
cheap: nothing about today resembles it, so the seven field values are a signature rather than a
coincidence. As stored, `2c 28 12 01 03 09 0d`, being second 44, minute 40, hour 18, day 1, day of week
3, month 9 counted from zero and year 13.

| | prediction |
|---|---|
| 1. data memory answers content | The window answered all zeros in section 119 and that read was taken while this remote was **stranded in safe mode**, with no config and no application running. It is the application's turn now, so a nonzero count is the positive control and it comes before the clock question. If it is still all zeros, nothing below is answerable and section 90's scope stands as written. |
| 2. the seven fields are present | Somewhere in the 2048 bytes, a run carrying day 1, day of week 3, month 9 and year 13, with the hour at 18 and the minute at 40 or a little above it. |
| 3. they are contiguous, in record order | Second first, as base slot 3 stores them, because the arch 12 firmware subtracts against the record field by field and a per field copy is what makes that work. The **address** is deliberately not predicted: arch 12 keeps them at `0x108` to `0x10E` and arch 9 is a different part with 2048 bytes rather than 4096, so a matching address would be luck. |
| 4. what falsifies it | A date of 2000-01-01, or a zero run, while the rest of data memory answers content. That would say arch 9 starts its clock at the format's own epoch and reads base slot 3 for nothing, which makes the record pure provenance on this architecture and leaves the arch 12 behaviour a Gin family feature. |

The rail does not move either way, per `CLAUDE.md`: a writer stamps this record with the moment of
writing, which is the right provenance value on an architecture that ignores it for its clock and the
right clock value on one that does not. So the answer changes a sentence and no code.

### The outcomes, measured the same day

Kept beside the predictions rather than rewritten over them, which is this document's whole method.

| | outcome |
|---|---|
| 1. data memory answers content | **Refuted, with a control.** Zero at every offset tried, and bank 2 is what makes that a fact about the window rather than about the memory: `0x279` and `0x27a` hold the offset of the read in progress and `0x2a6`, `0x2a7` and `0x2ac` the buffer pointer and the byte being sent, and all five read back zero while answering. So the window returns zeros regardless of content, and the read arm at `0x033BE` is nonetheless real, walking data memory through `FSR0` and sending each byte. |
| 2. the seven fields are present | Unanswerable by this route, and by any read path this architecture has: `READ_MISC` returns zero too, section 90. |
| 3. they are contiguous, in record order | Unanswerable, same reason. |
| 4. what falsifies it | **The prediction set was under-determined**, which is the finding rather than the outcome. A clock's value cannot distinguish base slot 3 from base slot 13's `first`, because section 130 established the two carry identical values in every container and a corpus wide test asserts it. So neither this measurement nor the same one on a Harmony 600 (arch 14) would have named the mechanism. Section 137. |

Timer 1 did come out of it. On arch 9 the `0x1E` that arch 12 attributes to base slot 3's routine is
written by a compiled in peripheral setup, at `0x00E7A` in the bootloader and `0x07EDC` in the
application, and only the enable is separate. That does not say arch 9 ignores base slot 3: its consumer
for that slot has not been traced.

## Safety, which is different here

The rails in [../CLAUDE.md](../CLAUDE.md) apply unchanged, and one thing about this model makes them
matter more rather than less. Section 56 established that Logitech's MyHarmony service is alive and
still compiles configs. **That is not the service this remote used.** The 5xx series belongs to the
classic platform, whose site now serves a discontinuation notice, so there is no path that would put
a working config back on a 525 if one were destroyed. The remote is read only, the same as every
other, and the fallback that exists for a Harmony One does not exist for this one.
