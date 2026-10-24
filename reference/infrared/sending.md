# Sending

A remote rarely sends a code once. One press of a key usually sends it three times in a row, so a
receiver that missed the first still catches one; holding the key sends it again and again for as long as
the key is down; and some devices only switch on if their power code keeps arriving for a second or two,
which a Harmony does by holding the power code for a stated time. Underneath all of it the lamp does not
simply shine: it flickers tens of thousands of times a second while it is "on", the **carrier**, and a
receiver listens only for light flickering at that rate.

This page is about all of that: how many times a press sends a code and where that number comes from,
what a held key and a held power code send, how Logitech's compiler spells a block of durations, and how
the processor makes the carrier. How the durations sit in a configuration is
[infrared records](../config-format/infrared-records.md); what the number inside a code is,
[Frames](frames.md); which family a code belongs to, [Families](families.md).

## How many times a press sends a code

**How many times a press sends the code is the ratio of a record's two blocks.**[^s258] A record holds a
first block, sent once on a press, and a held block, repeated while the key stays down, and the second
one is the repeat rate a person feels.[^s127] The first block holds the code as many times as one press
sends it and the held block holds exactly one press's worth, so the count is the first block's copies
divided by the held block's. A copy is a segment of `frameSegments` holding at least half the pulses of
the block's longest segment, which excludes the short trailing segment a block ending in a long silence
is cut into. 1913 of 1913 records that name both blocks divide whole, there is one value per device group
on 60 of 62 groups, and it is 3 on all six device groups of the two configurations Logitech compiled for
chosen devices, where their service states 3 for each.[^s258] The values measured are 1, 2, 3 and 4.
`irSendsPerPress` in `irframe.ts`.

Dividing is what makes it a device's count rather than a family's spelling: a family sending a frame and
its complement stores six copies and two, and one sending a single frame stores three and one, and both
are three sends.[^s258] **A family whose definition states an intro section of a different code word**
holds one copy more than the count, the intro: `Kreatel IP 22 Bit`.[^s348]

**The count is stated twice outside the file, and both agree with the ratio**:[^s258] `pressMinimumRepeats`
on 39 of the 684 protocol definitions in Logitech's catalogue, values 0, 1 and 3; and `PressMinRepeats`
with `DefaultPressMinRepeats` per device on their service, the same values.[^s258b] `HoldMinRepeats` is 0
on all 24 device records read from their service and `HoldMinimumRepeats` is null on all 684
definitions, which is consistent with the held block always holding exactly one press.[^s228]

**Where the family's definition states no count, a press repeats the device's own.**[^s348] Logitech's
catalogue states a press count per device as well as per family, and a record's first block is the
definition's start group, the repeat group that many times, and the finish group. Confirmed on 45 of 47
catalogue devices of MyHarmony compiles for the Harmony One, 600, 650 and 700, 3391 records, of which only
three devices state 1 and so separate it from a default of 3; a family that states a count is written at
it, 1021 records.[^s348] **Unconfirmed** where the device's codeset holds a family stating a different
count: two devices were written at their main family's stated 1 against their own 3, one record at the
device's 3 against its family's stated 1, and the composer refuses such a device. Also refused as
unknown: a device count of 0, and a code naming a release group. A count of 2 is built as the rule says
and is unconfirmed, since no compile shows one.[^s348]

**The rhythm table's whole blocks for the 26 families stating no count carry the count their measured
records repeat**:[^s350] 1 for `Memorex 32 Bit`, `MemorexO1 32 Bit` and `Samsung 38 Bit`, 3 for the other
23, `TABLE_PRESS_REPEATS` in `composecatalogue.ts`. That is the count most of a family's codes rebuild at
when its table blocks are rebuilt from the definition; for `MemorexO1 32 Bit` and `Samsung 38 Bit` a
minority rebuild at any count. Where a device states another count, the composer builds the command from
the definition at the device's count, both blocks; it sends the table's block where the counts agree or
the device's count is refused, and refuses the 252 codes whose table block and definition differ in how
many frames a press sends. Against Logitech's compiles, 2586 of 2636 records of these families are right
where the table alone was right on 2551, and what moved is two devices: the Dell 2300MP's 34
`Memorex 32 Bit` records at its 3, and one `Philips Hurd 16 Bit LongToggle` record at the Philips
70FA930's 1.[^s350] **Unconfirmed** beyond those two: 21 of the 23 families at 3 have no record on a device
stating another count, and the 3989 codes whose definition differs from the table in a duration only,
`MemorexO1 32 Bit`'s gap above all, follow the definition with no compile showing either. Left: the
Yamaha DSP-A592's 4, whose count is refused, and 46 long toggle records the table writes one microsecond
short at the end, which is the table's long toggle shape and not the count.[^s350]

## Which block a catalogue code gets

**The table's whole block is sent only for a code the family's name reads too.**[^s359] Every row was
measured or derived over such codes, and a code only the definition reads is built from the definition at
the device's count, since on 78 of the 2975 such codes a row takes, it sends fewer frames than the code
states. On the codes both read, the table's block is the same on 101369 of 101593 and differs on 224
codes of three Quad Toggle families, where the name's block is no count of the definition. Confirmed word
for word on three devices of one Harmony One compile, 183 records of which 74 are such codes, of
`Microsoft 30 Bit`, `Sony 20 Bit` and `LG 32 Bit`; the width reading proper is checked against Logitech
only as trains, `Philips RC5Ex` and `Russound 9 Bit Quad` against a Harmony 350 and a Harmony 880
configuration whose devices or settings are not known.[^s359] **Unconfirmed** for the other 122 families
admitted, composed from the definition alone. How a code's widths are read is
[Families](families.md#how-the-catalogue-writes-a-code).

**A code whose family's whole table block does not take it is built from the definition at the device's
count**, as a code only the definition reads is:[^s361] `Entone 56 Bit` codes stating their value in the
start group alone, `Galaxis 16 Bit Quad Toggle` and `Philips Hurd 16 Bit LongToggle` codes stating three
frames, and a `Pioneer 32 Bit Dual` code stating one value. Confirmed word for word on three such codes of
two devices in two Harmony One compiles; on the codes the four rows do take, the definition at the row's
count sends the row's train on 4797 of 4834.[^s361] **Unconfirmed** for `Entone 56 Bit`,
`Galaxis 16 Bit Quad Toggle` and the `Ada 40 Bit`, `AudioAnalogue 14 bit`, `DAM 12 Bit` and
`Intellibus 17 Bit ` spellings, which no compile measured holds.

## Holding the power key for a stated time

**Logitech's catalogue can state a power step with a duration**, a command and a hold in
milliseconds,[^s305] and the compiler then fills that step's record with frames for the hold.

**The rule: a held power press holds as many frames as start inside the hold, on the frame lengths the
protocol definition states**, so the count is `ceil(hold / length)`.[^s308] Every step of a power action
list is a record of its own, with no lead in and no held block, holding what an ordinary press sends; the
ordinary press of the same command keeps its own record. A frame's stated length is its segment's
`TotalLength`, or else the segment's header, trailer and `NumberOfBits` times the mean of its two cell
lengths; the frames are the definition's `KeyCode`, its `Start` segments and then its `Repeat` for as long
as needed, an opening segment with no payload joining the frame after it. A frame is what lies between
spaces over 10 ms, so a family that repeats a shorter frame counts those repeats. All 27 long press
versions of the devices in six compiles for a Harmony 700 and a Harmony 650, ten families, measured on
those two models only.[^s308]

Where a code is sent much shorter than its stated length, the Panasonic power codes of
`PanasonicV2 48 Bit` at 134.6 and 136.4 ms against 143.3, the hold can hold fewer frames than would start
inside it at the sent length, as it does on 12 of their 13 records.[^s307] **Unconfirmed**: that the length
is the mean cell rather than anything from 24 to 28 long bits of 48, which only that family separates, and
that the Panasonic codes are not simply counted as whole copies with a floor, which also fits every
record. **Unmeasured**: families with several repeat segments or more than two cells, and whether a hold
shorter than an ordinary press can send fewer frames, which no record needs.[^s308]

**The held record, the long press version, is the ordinary press's frames cycled to the count**:[^s309] no
lead in, the frames carrying the code's first slot once and the second slot's cycled to the count, each
followed by the gap the press gives it, the last gap getting back the microsecond the press ends in. 26 of
27 rebuild word for word, on the Harmony 650 and 700 only; `longPressBlockOfStatedCode` assumes the
press's frames are the code's walk in order.

## How Logitech's compiler spells a block

**These are the generator's conventions rather than format constraints**, since the firmware plays any
legal spelling identically; a writer that wants byte identity with a compiled configuration follows them,
and `compiledBlockWords` in `compose.ts` does.[^s174] With them, a television composed from the catalogue
is block for block what Logitech's compiler wrote for the same codes,[^s174] and respelling every merged
space run of every block reproduces three Harmony One compiles exactly, 492, 415 and 415
blocks.[^s174]

* **Every first block opens with a lead in silence**, 2032 of 2032 across four configurations spanning
  both generator eras: 50 ms on most commands, 500 ms or a second on the ones that get a settling time. A
  held block never leads, 0 of 67.[^s174]
* **A power step without a hold is the ordinary press without its lead in**, the same words otherwise,
  three devices of one compile for the Harmony 650.[^s309] **On the Harmony One the record a power
  transition sends opens with the device's delay between devices instead**, the catalogue's
  `interDeviceDelay`, 100, 500 or 1000 ms, on 8 of 8 catalogue devices of three compiles (six at 500), the
  inter key delay naming it on 1,[^s433] where the Harmony 600, 650 and 700 wait through a delay step
  instead.[^s337] `composeDevice` gives a power step no lead in on both, so a device composed for a Harmony
  One sends its power codes without that silence in front. **Unconfirmed**: how the remote plays it, and
  whether a device needs it.
* **A duration too long for one word is spelt as maximal 32767 us words with the remainder balanced
  across the last two, smaller half first, and no word below half the maximum**: 50000 is `32767, 17233`;
  40222 is `20111, 20111`; 500000 is fourteen maximals then `20631, 20631`.[^s174]
* **A silence longer than one word is spelt whole**:[^s359] `compiledBlockWords` joins the 32767
  microsecond chunks a definition's literal gap comes in before the rule above spells it, so
  `Microsoft 30 Bit`'s 68643 is 32767, 17938 and 17938, as Logitech writes it in every compiled
  configuration measured that holds it, on the Harmony 880 and 885 family, the Harmony One, the Harmony
  600, 650 and 700 family and the Harmony 300 and 350 family, and not 32767, 32767 and 3109. Only a space of whole chunks is joined; two adjacent biphase half
  cells stay two words, as Logitech stores them.
* **The trailing gap gives up its final microsecond before it is split**, and the microsecond closes the
  block as a 1 us word: `..., 30543, 1`, and the Panasonic family's 74801 is `32767, 21016, 21017,
  1`.[^s309] Carving the last word after the split gives the same words except where the split ends in a
  balanced pair whose total is odd, and there it is wrong: over the configurations with infrared and the
  six power hold compiles, carving first alone fits 1757 blocks on the Harmony 880 and 885 family, the
  Harmony One and the Harmony 600, 650 and 700 family, and carving after alone fits none. The Harmony 525's blocks end in no microsecond at all.[^s309]

## How the compiler wires a device's power

Measured on compiles for the Harmony 650 and 700 only, 17 device instances of 15 catalogue devices, every
power send and delay reproduced by `composeDevice` from the catalogue entry alone; the input state lists
the on transition ends in are not composed.[^s320]

* **The actions are the catalogue's.** A `discrete` device's `Power` variable sends its `on` action going
  from 0 to 1 and its `off` action going from 1 to 0; a `toggle` device sends its one `toggle` action both
  ways, one record and one send list.[^s320]
* **An action of one step is that step's send list itself**: the off transition's operand is the send
  list, `{0x7F, 0x7D, 0x7C}`. **An action of several steps is a list of `0x7F` calls**, one per step in
  order, a step stated more than once being one record and one send list called again: the Knoll
  HDP-1100's off, its power toggle held 500 ms three times, is one list calling one send list three
  times. The only such action in the compiles, so one device.[^s320]
* **The on transition is a list of calls**: the on action's send list, then the device's power on delay
  list, one `0x72`, then one list per input state the catalogue's `onReset` names. **Unconfirmed**: that
  an on action of several steps is called step by step in that list rather than through a list of its
  own, since no compile measured holds one.[^s320]
* **The three delays are the catalogue entry's**, in tenths of a second: the `PowerOnDelay` variable's
  first value is `powerOnDelay`, the `InterDeviceDelay` variable's is `interDeviceDelay`, and the `0x7C`
  after a power step's send is `interKeyDelay`, on every device instance.[^s320]

## The carrier

**The carrier is made in software**, by a loop of cycle counted delays and a mask that switches the
emitter per half cycle, not by a hardware timer driving the lamp.[^s13] A configuration states a code's
carrier as a period and an on time in nanoseconds, the on time being half the period: 38 kHz is stored as
26315, truncated rather than rounded.[^s92]

The modulator works from a pair of values in data memory, read in the Harmony 700's 2.8 firmware:[^s13]

```
0x00  u16  carrier period
0x02  u8   carrier on time
```

Both are converted to instruction cycles with `value * 4 / 10`, then a fixed loop overhead is subtracted,
19 cycles for the period and 8 for the on time, clamped at zero. The off time is then `period - on`.[^s13]
The `* 4 / 10` means 4 instruction cycles per 0.1 microsecond, a 4 MIPS core at 16 MHz: 38 kHz is a 26.3
us period, stored here as 263, and `263 * 4 / 10` is 105 cycles, which at 4 MIPS is 26.25 us, 38095 Hz,
within a quarter of a percent.[^s13]

**The unit here is the modulator's, not the configuration's.** The configuration's 26315 nanoseconds
divided by 100 is 263.15, so the two readings agree, the second reached from the configuration side and
the first from the transmit side.[^s92] Where the division by 100 happens between the record and the
modulator is not established: the record loader's class 1 arm does not do it.[^s92b] Not checked on the
Harmony One or the Harmony 525.[^unchecked]

[^s258]: Measured in configurations. [Section 258](../../docs/findings.md#s258)
[^s127]: Measured in configurations. [Section 127](../../docs/findings.md#s127)
[^s348]: Measured in configurations. [Section 348](../../docs/findings.md#s348)
[^s258b]: Stated by Logitech, by their service. [Section 258](../../docs/findings.md#s258)
[^s228]: Stated by Logitech, in their catalogue. [Section 228](../../docs/findings.md#s228)
[^s350]: Measured in configurations. [Section 350](../../docs/findings.md#s350)
[^s359]: Measured in configurations. [Section 359](../../docs/findings.md#s359)
[^s361]: Measured in configurations. [Section 361](../../docs/findings.md#s361)
[^s305]: Stated by Logitech, in their catalogue. [Section 305](../../docs/findings.md#s305)
[^s308]: Measured in configurations. [Section 308](../../docs/findings.md#s308)
[^s307]: Measured in configurations. [Section 307](../../docs/findings.md#s307)
[^s309]: Measured in configurations. [Section 309](../../docs/findings.md#s309)
[^s174]: Measured in configurations. [Section 174](../../docs/findings.md#s174)
[^s433]: Measured in configurations. [Section 433](../../docs/findings.md#s433)
[^s337]: Measured in configurations. [Section 337](../../docs/findings.md#s337)
[^s320]: Measured in configurations. [Section 320](../../docs/findings.md#s320)
[^s13]: Read in the firmware. [Section 13](../../docs/findings.md#s13)
[^s92]: Measured in configurations. [Section 92](../../docs/findings.md#s92)
[^s92b]: Read in the firmware. [Section 92](../../docs/findings.md#s92)
[^unchecked]: Not checked.
