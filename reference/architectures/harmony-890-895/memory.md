# Harmony 890 and 895: memory

What is known of a Harmony 890's or 895's memory is its configuration, as other people read it off their
remotes: a container of the same family as every later Harmony's, whose table of sections is shuffled in a
way no other architecture's is. This page says how that container is laid out, how its sections were
placed without any firmware to read, what reads in it and what does not. The flash and the processor's
own memory are not known at all.

How a configuration is laid out in general is [the configuration format](../../config-format/README.md);
this page states what differs here. Every fact is counted over the configurations of two Harmony 890s and
one Harmony 895, and each footnote says where the argument is.

## The container

| | value |
|---|---|
| cookie, end marker and the marker after the pointer table | `TPTP`, `DKDK` and `WLWL`, as on the Harmony 880 and 885[^s115] |
| format word | `0x1700`, which is the pointer count: 23 slots[^s115][^s194] |
| base address | flash `0x030000`, which every container's pointers count from[^s115] |
| architecture record | raw slot 0: `0a 0a`, the skin, `0d`[^s182] |
| framing and checksum | the same as every architecture's: the end marker lands where the header says and the trailer checksum recomputes, on a read that is not damaged, [usb.md](usb.md)[^s115][^s122] |

**The base address is found from the clock record, not from the end marker.** Taking it from the end
marker was right on every other container and 864 bytes wrong on one damaged read of a Harmony 890, and
it could not notice, because the check it was tested against was the same arithmetic run backwards. The
build timestamp's own pointer gives one candidate per pointer, and exactly one is aligned to `0x1000` on
every container that is not damaged.[^s117]

## The slot map

**This architecture's pointer table is not the base layout with slots inserted**, which is how the
Harmony 880 and 885, the Harmony One, the Harmony 525 and the Harmony 600, 650 and 700 all relate to one
another. Five base slots are absent, and eight raw slots correspond to no base slot.[^s184]

<!-- generated:slot-map -->
23 raw slots. 15 of the 20 base slots are present; absent: 0, 2, 8, 13, 14. Raw slots no base slot names: 1, 2, 3, 7, 8, 13, 16, 17.

| base slot | raw slot |
|---|---|
| 0 | absent |
| 1 | 0 |
| 2 | absent |
| 3 | 4 |
| 4 | 5 |
| 5 | 6 |
| 6 | 9 |
| 7 | 10 |
| 8 | absent |
| 9 | 11 |
| 10 | 12 |
| 11 | 14 |
| 12 | 15 |
| 13 | absent |
| 14 | absent |
| 15 | 18 |
| 16 | 19 |
| 17 | 20 |
| 18 | 21 |
| 19 | 22 |

Generated from `SLOT_MAPS` in `packages/codec/src/gspm.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**Every row was placed by what its section holds**, with no firmware to read: the architecture record in
raw slot 0, the clock frame, a 125 byte event map of 30 entries as on the Harmony 880, the infrared
groups, every mode record carrying a screen program that decodes, the eight font set addresses. The
decisive one is base slot 10, the table of action lists, whose consecutive entries sit `1 + 3 * count`
apart: exactly one raw slot reproduces the Harmony 880's signature of four breaks, where every other
array scores near zero.[^s183][^s184]

**Base slots 13 and 14 were placed by order between their neighbours first, and both were wrong.** Base
slot 13's first seven records hold the build timestamp's own fields on every other architecture, and no
run of pointers in either container has targets carrying those seven values, at any offset and either
width, where a Harmony 880 container hits exactly once. So base slot 13, the state variable table, is
absent, and so is base slot 14.[^s184] A slot with only one possible home under an ordered mapping is not
thereby a slot that is there.

**Base slot 0, the name tree, is absent**: no `0xFEED` frame occurs anywhere in either payload. With base
slot 13 absent too, the names of a Harmony 890's devices and activities, and how many activities it has,
are unread; both routes to them need one of those two slots.[^s182][^s184]

## Raw slot 3, the metadata archive

**One of the eight raw slots that name no base slot holds a ZIP file**: a `u32` length, then a ZIP with one
entry, `MetaData.xml`. It is 270 bytes and identical in both containers, a bare `<MetaData>` with one class,
`HarmonyAssistant`, one record, `AssistantMenu`, and one boolean field, `Show`. It names no device and no
command, unlike the Harmony 300 and 350's metadata archive of the same framing, which names every one.[^s260]

## What reads, and what does not

The sections the slot map places read as on other architectures. Four structures read **without** it,
because each is found from the header, the trailer or its own contents rather than from a pointer slot:

| structure | how it is found | what it holds here |
|---|---|---|
| the key table | from the marker after the pointer table | 55 press codes on a Harmony 895, exactly the Harmony 885's populated positions[^s177] |
| the picture bank | from the trailer's position, the walk that lands on it | 128 by 160 pictures; 26 on a Harmony 890 and 38 on a Harmony 895, 57% and 72% of each file[^s179] |
| the font sets | every pointer must decode into a glyph that tiles exactly | eight sets, whose glyph shapes are named by the Harmony 880 and 885's alphabet, 213 of 237[^s180] |
| the infrared records | a record states its own start address | 300 codes on a Harmony 890, in four groups, with every one of 463 duration blocks decoding; **none** on a Harmony 895[^s181][^s184] |

**Three readers needed this architecture's own value and had none**, which is the thing to know before
reading one of these configurations with a reader written for another architecture:

* Screen opcode 22's operand is **three** bytes here. With no entry, 49 mode page programs on a Harmony 890
  and 34 on a Harmony 895 went unread, with a fifth of the drawn text.[^s185]
* Base slot 15 declares fourteen groups, where nine was the most on any other architecture, and every group
  body reads as two entries, so their shape is refused rather than read; a reading written for the Harmony
  One's groups fired on it because its group existed.[^s185]
* Base slot 7 keeps its glyph bodies inside its own section, so the section is read as a header, a `u16`
  count and that many three byte pointers, on every architecture.[^s184]

**What remains unread is 0.7% and 2.8%** of the two clean configurations, with nothing claimed twice: runs
with no family, the largest 7187 bytes on the Harmony 895, and the eight raw slots that are no base slot,
three of them the same size on both containers and therefore fixed structures.[^s185]

## Not checked

* The flash: its size, its layout outside the configuration, and whether a log area exists, since base
  slot 2 is absent.[^unchecked]
* Data memory, and where the firmware keeps the clock and the state variables.[^unchecked]
* What the remaining raw slots hold.[^unchecked]

[^s115]: Measured in configurations. [Section 115](../../../docs/findings.md#s115)
[^s194]: Measured in configurations. [Section 194](../../../docs/findings.md#s194)
[^s182]: Measured in configurations. [Section 182](../../../docs/findings.md#s182)
[^s122]: Measured in configurations. [Section 122](../../../docs/findings.md#s122)
[^s117]: Measured in configurations. [Section 117](../../../docs/findings.md#s117)
[^s184]: Measured in configurations. [Section 184](../../../docs/findings.md#s184)
[^s183]: Measured in configurations. [Section 183](../../../docs/findings.md#s183)
[^s260]: Measured in configurations. [Section 260](../../../docs/findings.md#s260)
[^s177]: Measured in configurations. [Section 177](../../../docs/findings.md#s177)
[^s179]: Measured in configurations. [Section 179](../../../docs/findings.md#s179)
[^s180]: Measured in configurations. [Section 180](../../../docs/findings.md#s180)
[^s181]: Measured in configurations. [Section 181](../../../docs/findings.md#s181)
[^s185]: Measured in configurations. [Section 185](../../../docs/findings.md#s185)
[^unchecked]: Not checked.
