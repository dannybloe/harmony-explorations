# Predictions for a Harmony 525, written before it was read

Two sets of predictions about the Harmony 525, each written down and committed before the remote was
asked, with the outcomes kept beside them rather than written over them: the remote's identity, published
before the unit was first connected on 8 August 2026, and whether it sets its clock from base slot 3,
written on 13 August 2026 before that read. They came out of the Harmony 525's memory map, which carried
them from its first version until plan 009 moved the memory maps into the reference; the facts they established
live in [the architecture folder](../../reference/architectures/harmony-5xx/README.md) now, and this file is
the record of what was expected and how it scored.

Eight of the nine identity predictions held exactly. The one that failed was not in the list at all, and
it is the one that blocked the configuration read: the address a `READ_FLASH` must name. Full argument in
[findings.md](../findings.md#s76) section 76.

## The identity, predicted field by field

The sharpest prediction available, because it is derived rather than guessed. It is derived from **the
arch 9 configuration already in the lab**, whose `META.md` records both what its XML header says and what
its owner measured off the physical remote. Reaching for that before predicting anything is what
`make corpus` is for, and the memory map did not, the first time it was written.

A configuration's `INTENDEDVERSION` header names the remote it was built for, and on **both** bench
remotes of the time those names map onto the measured `GET_VERSION` block exactly:

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
| 6 | `0x0c` | a compiled in constant on all four images available. **Wrong: it is `0x09`**, and concordance reads that byte as the protocol when the block is seven long. The prediction's outcome first called it the architecture; it is read now as the platform byte, zero in safe mode, [the version block](../../reference/usb-protocol/version-block.md) |
| 7, 10, 11 | not predicted | version bytes at program addresses no arch 9 image can be checked against |
| 8, 9 | not predicted | arch 12 reads internal images here and arch 14 hardcodes zero |

**The USB identity is reported rather than predicted**, and it breaks a rule. The owner of the sample
published `046D:C111`, `bcdDevice` **`0x0916`**. That does not follow the pattern the two bench remotes
set: the Harmony One enumerates `0x1054` and the 600 `0x1071`, a constant `0x10` followed by the skin in
BCD. Read the same way the 525 would be `0x1022`, and it is not. Read as plain hex it is protocol 9 and
skin 22, both exact, which the One and 600 do not satisfy either way. So the rule is **generation
specific**, and the 525 is the case that shows it:

| | predicted | measured |
|---|---|---|
| `idProduct` | `0xC111` | `0xC111`, so the third party report is confirmed on a second unit |
| `bcdDevice` | `0x0916` | `0x0916`, so the `0x10` plus BCD skin rule is a MyHarmony era convention |

**Field 4 was the one to watch.** Section 57 concluded that its high nibble is the architecture, from four
images spanning only two architectures. A third architecture was a real test of that, and `0x90` was the
whole claim in one byte. It held.

**Three of these could legitimately have been wrong without the reading being wrong.** `BOARD`, `FLASH`
and the firmware version describe the unit the sample configuration was built for, and a second hand 525
of another hardware revision or another firmware release may differ in all three. `SKIN` and `PROTOCOL`
are properties of the model and should not move.

### How it scored, 8 August 2026

| | measured | how |
|---|---|---|
| `idProduct` | `0xC111` | enumeration, nothing opened |
| `bcdDevice` | `0x0916` | the same |
| `GET_VERSION` | `27 30 25 12 ff 90 16 09` | seven fields, not twelve; the reply's low nibble says so |
| read base of the configuration | `0x820000` | silent at `0x010000`, `0x020000` and `0x030000`; `AHCM` here |
| the container's own base | `0x020000` | its `end_addr`, and every pointer inside it |
| application firmware image | flash `0x810000`, loads at program `0x1000` | `loadaddr.find_base`, 717 boundary hits against 326 |
| a second image | flash `0x800000` | same `HG` header, a third the size |
| internal program memory | plain `0x000000`; 32 KiB read in 529 single chunk commands, no restart | health checked every 64 reads |
| the safe mode configuration | flash `0x818000`, container base `0x018000` | the same `0x800000` offset the user configuration has |
| **data memory** | **unreadable**: `READ_MISC` selector `0x07` answers and returns zero for all 1696 addresses tried | 9 August 2026, calibrated against a 600 and a One which return live data in the same banks |

Seven of seven predicted version bytes were right, and the block is seven fields rather than twelve.

**The last row was not predicted at all**, and nothing in the memory map would have led anyone to predict
it: live memory over USB had worked on both other architectures and was treated as a property of the
command layer rather than of the build. It is why the 525 has no keypad census and why the arch 9 matrix
came out of the firmware, sections 89 and 90.

## Does a Harmony 525 set its clock from base slot 3? Predicted 13 August 2026, before reading

Section 111 measured a Harmony One (arch 12) reading base slot 3's timestamp into its clock at every boot:
a power cycled remote reported that record's date exactly and its time plus its own uptime. All three
architectures on the bench carry the same eleven byte record and only arch 12 had been measured, so this
was one round of hardware on a Harmony 525 (arch 9), read only, with the batteries pulled and replaced at
11:53 local on 13 August 2026.

The bench remote's own configuration was built at **2013-10-02T18:40:44**, which this gave as the 1st
until section 322 found the day counted from 0, and which is what makes the reading cheap: nothing about
the present resembles it, so the seven field values are a signature rather than a coincidence. As stored,
`2c 28 12 01 03 09 0d`, being second 44, minute 40, hour 18, day 1, day of week 3, month 9 counted from
zero and year 13.

| | prediction |
|---|---|
| 1. data memory answers content | The window answered all zeros in section 119 and that read was taken while this remote was **stranded in safe mode**, with no configuration and no application running. It is the application's turn now, so a nonzero count is the positive control and it comes before the clock question. If it is still all zeros, nothing below is answerable and section 90's scope stands as written. |
| 2. the seven fields are present | Somewhere in the 2048 bytes, a run carrying day 1, day of week 3, month 9 and year 13, with the hour at 18 and the minute at 40 or a little above it. |
| 3. they are contiguous, in record order | Second first, as base slot 3 stores them, because the arch 12 firmware subtracts against the record field by field and a per field copy is what makes that work. The **address** is deliberately not predicted: arch 12 keeps them at `0x108` to `0x10E` and arch 9 is a different part with 2048 bytes rather than 4096, so a matching address would be luck. |
| 4. what falsifies it | A date of 2000-01-01, or a zero run, while the rest of data memory answers content. That would say arch 9 starts its clock at the format's own epoch and reads base slot 3 for nothing, which makes the record pure provenance on this architecture and leaves the arch 12 behaviour a Gin family feature. |

The rail does not move either way, per `CLAUDE.md`: a writer stamps this record with the moment of
writing, which is the right provenance value on an architecture that ignores it for its clock and the
right clock value on one that does not. So the answer changes a sentence and no code.

### The outcomes, measured the same day

| | outcome |
|---|---|
| 1. data memory answers content | **Refuted, with a control.** Zero at every offset tried, and bank 2 is what makes that a fact about the window rather than about the memory: `0x279` and `0x27a` hold the offset of the read in progress and `0x2a6`, `0x2a7` and `0x2ac` the buffer pointer and the byte being sent, and all five read back zero while answering. So the window returns zeros regardless of content, and the read arm at `0x033BE` is nonetheless real, walking data memory through `FSR0` and sending each byte. |
| 2. the seven fields are present | Unanswerable by this route. The outcome as first written added "and by any read path this architecture has: `READ_MISC` returns zero too, section 90"<!--superseded-->, and that is not right: section 90's own correction reads `READ_MISC` selector 1 as answering, a parameter by index, with its value in the byte after the one the decoder took, and a third party reads a clock through it. What selector 1 answers on this unit has not been read with the corrected decoder, so the question stays open rather than closed. |
| 3. they are contiguous, in record order | Unanswerable by this route, same reason. |
| 4. what falsifies it | **The prediction set was under-determined**, which is the finding rather than the outcome. A clock's value cannot distinguish base slot 3 from base slot 13's `first`, because section 130 established the two carry identical values in every container and a corpus wide test asserts it. So neither this measurement nor the same one on a Harmony 600 (arch 14) would have named the mechanism. Section 137. |

Timer 1 did come out of it. On arch 9 the `0x1E` that arch 12 attributes to base slot 3's routine is
written by a compiled in peripheral setup, at `0x00E7A` in the bootloader and `0x07EDC` in the
application, and only the enable is separate. That does not say arch 9 ignores base slot 3: its consumer
for that slot has not been traced.
