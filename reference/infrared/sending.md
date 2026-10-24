# Sending

#### Sends per press, codes and block spelling

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
both are three sends. **A family whose definition states an intro section of a different code word**
holds one copy more than the count, the intro: `Kreatel IP 22 Bit`, section 348.

**Which count a press repeats, where the family's definition states none, is the device's own**,
`timing.pressMinRepeats` in the archive, section 348. A record's first block is the definition's start
group, the repeat group that many times and the finish group, built by `waveformOfArchiveCommand` with
`asStored`. Confirmed on 45 of 47 catalogue devices of MyHarmony compiles for the Harmony One, 600, 650 and 700,
3391 records, of which only three devices state 1 and so separate it from a default of 3; a family that
states a count is written at it, 1021 records. **Unconfirmed** where the
device's codeset holds a family stating a different count: two devices were written at their main
family's stated 1 against their own 3, one record at the device's 3 against its family's stated 1, and the
composer refuses such a device. Also refused as unknown: a device count of 0, and a code naming a release
group. A count of 2 is built as the rule says and is unconfirmed: no compile shows one.

**The rhythm table's whole blocks for the 26 families stating no count carry the count their measured
records repeat**, section 350: 1 for `Memorex 32 Bit`, `MemorexO1 32 Bit` and `Samsung 38 Bit`, 3 for the
other 23, `TABLE_PRESS_REPEATS` in `packages/codec/src/composecatalogue.ts`, the count most of a family's
codes rebuild at when its table blocks are rebuilt from the definition (for `MemorexO1 32 Bit` and `Samsung
38 Bit` a minority of the codes rebuild at any count). Where a device states another count, the composer
builds the command from the definition at the device's count, both blocks; it sends the table's block where
the counts agree or the device's count is refused, and refuses the 252 codes whose table block and
definition differ in how many frames a press sends. Against our own compiles, 2586 of 2636 records of
these families are right where the table alone was right on 2551, and what moved is two devices: the Dell
2300MP's 34 `Memorex 32 Bit` records at its 3, and one `Philips Hurd 16 Bit LongToggle` record at the
Philips 70FA930's 1. **Unconfirmed** beyond those two: 21 of the 23 families at 3 have no record on a
device stating another count, and the 3989 codes whose definition differs from the table in a duration
only, `MemorexO1 32 Bit`'s gap above all, follow the definition with no compile showing either. Left: the
Yamaha DSP-A592's 4, whose count is refused, and 46 long toggle records the table writes one microsecond
short at the end, which is the table's long toggle shape and not the count.

**A catalogue code is read at the widths and in the bases its family's definition states, never the
name's**, section 359: `statedCodeOfDefinition` in `packages/codec/src/archive.ts`, which the renderer and
the catalogue composer both read through. The name's number is the digit count on some families, neither
the digit nor the bit count on as many, absent on others, and right but overflowed by the value on a few,
so reading it refused 52658 archive commands of 156 families; the definition reads all but 172, which are not infrared codes (`HID 16 Bit`, `Roku IP`, `Sonos
IP`) or are misspelt in the catalogue, none of them rendered there. On the codes both read, the rhythm
table's block is the same on 101369 of 101593 and differs on 224 codes of three Quad Toggle families, where
the name's block is no count of the definition and the definition's reading is its block at the family's
stated 1. **The table's whole block is sent only for a code the name reads too**: every row was measured
or derived over such codes, and a code only the definition reads is built from the definition at the
device's count, since on 78 of the 2975 such codes a row takes, it sends fewer frames than the code states.
Confirmed word for word on three devices of one Harmony One compile, 183 records of which 74 are such codes,
of `Microsoft 30 Bit`, `Sony 20 Bit` and `LG 32 Bit`, all three families whose name's width is right and
whose value overflows it; the width reading proper is checked against Logitech only as trains,
`Philips RC5Ex` and `Russound 9 Bit Quad` against a Harmony 350 and a Harmony 880 configuration whose
devices or settings are not known. **Unconfirmed** for the other 122 families admitted, composed from the
definition alone.

**A silence longer than one word is spelt whole**, section 359: `compiledBlockWords` joins the 32767
microsecond chunks a definition's literal gap comes in, `joinedGaps`, before the half word rule spells it,
so `Microsoft 30 Bit`'s 68643 is 32767, 17938 and 17938 as Logitech writes it in every container in the lab
holding it, on arch 8, 12, 14 and 16, not 32767, 32767 and 3109.
Only a space of whole chunks is joined; two adjacent biphase half cells stay two words, as Logitech stores
them.

**A code's family is the definition its keycode spells, or, where none is spelt so, the one spelt the same
but for letter case and spacing**, section 361, `catalogueProtocol`: trimmed, runs of white space made one,
case set aside. Five spellings in the catalogue name no definition, 222 commands (`Ada 40 Bit`,
`AudioAnalogue 14 bit`, `DAM 12 Bit`, `toshiba 32 Bit`, `Intellibus 17 Bit ` with a trailing space), and
Logitech's own `ProtocolId`, which every command of their service carries beside its keycode, names the
folded match on every one of them and the exact spelling on every other command of the raw capture
carrying a keycode, 13292991 of 13293293 counted per device. The 684 definitions fold to 684 spellings; a folded spelling
fitting two would find neither. A code so found is read by, and carries the name of, that definition.

**A code whose family's whole table block does not take it is built from the definition at the device's
count**, section 361, as a code only the definition reads is: `Entone 56 Bit` codes stating their value in
the start group alone, `Galaxis 16 Bit Quad Toggle` and `Philips Hurd 16 Bit LongToggle` codes stating three
frames, and a `Pioneer 32 Bit Dual` code stating one value. Confirmed word for word on three such codes of
two devices in two Harmony One compiles; on the codes the four rows do take, the definition at the row's
count sends the row's train on 4797 of 4834. **Unconfirmed** for `Entone 56 Bit`, `Galaxis 16 Bit Quad
Toggle` and the `Ada 40 Bit`, `AudioAnalogue 14 bit`, `DAM 12 Bit` and `Intellibus 17 Bit ` spellings, which no
compile in the lab holds.

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
  three devices of one compile for the Harmony 650. **On arch 12 (Harmony One) the record a power
  transition sends opens with the device's delay between devices instead**, the catalogue's
  `interDeviceDelay`, 100, 500 or 1000 ms, on 8 of 8 catalogue devices of three compiles (six at 500), the inter key
  delay naming it on 1, section 433, where arch 14 waits through section 287's delay step instead, section 337.
  `composeDevice` gives a power step no lead in on both families, so a device composed for a Harmony One
  sends its power codes without that silence in front. **Unconfirmed**: how the remote plays it, and whether a
  device needs it.
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
