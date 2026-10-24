# Actions

### Base slot 10: action lists

Each entry addresses an action list, and a list is:

```
+0x00  u8    count
       { u16 operand; u8 opcode }[count]
```

So a list occupies `1 + 3 * count` bytes, and the lists are packed back to back: in every config
measured, all but exactly **four** consecutive table entries sit exactly `1 + 3 * count` apart.

| Sample | lists | instructions | packed pairs |
|---|---|---|---|
| 700 user config, arch 14 | 8037 | 19651 | 8032 of 8036 |
| 600 user config, arch 14 | 4955 | 12194 | 4950 of 4954 |
| One user config, arch 12 | 4277 | 11640 | 4272 of 4276 |
| 88x class config, arch 8 | 1318 | 3311 | 1313 of 1317 |
| 525 config, arch 9 | 487 | 1043 | 482 of 486 |

The four exceptions per config are not noise. The lists are packed into exactly **five contiguous
runs**, so there are four places where the next list is elsewhere entirely; each of those gaps is
tens of kilobytes, never an off by one.

That agreement is what makes the reading believable rather than merely consistent: the addresses
come from the pointer table and the counts come from the lists, so they are unrelated parts of the
file that turn out to describe the same layout. On the 525 the numbers also match what
harmony-decompiler reports independently, 487 lists with 482 of 486 packed.

#### Opcode `0x7F` takes an action list index

**Confirmed on arch 14**, from the operand ranges rather than from the firmware.

| | 700 | 600 |
|---|---|---|
| uses | 2795 | 1465 |
| distinct operands | 1576 | 834 |
| operand range | 52 to 7655 | 23 to 4755 |
| action lists in the config | 8037 | 4955 |
| the five runs end at index | 17, 4323, 5147, **7655**, 8036 | 11, 2721, 3154, **4755**, 4954 |

Every operand is a valid index into the table, and the largest is **exactly the last index before
the final run**, on both configs, at two different values. Operands never reach into that final run
at all: 381 lists on the 700 and 199 on the 600 are addressed by the table and never named by a
`0x7F`, so those are entry points something else reaches.

That is a boundary landing on a structure derived from a different part of the file, twice, which is
what makes it a reading rather than a range that happens to fit. It also matches what
harmony-decompiler reports for arch 9, where `0x7F` is "run an action list", so the meaning
transfers across architectures even though the wider inventory does not.

#### `0x7F` is a call, and the queue it calls into holds forty instructions

**Confirmed on arch 12, arch 14 and arch 9**, from the firmware on all three. A list is not
interpreted in place.
It is spooled whole into a ring of 120 bytes, which is exactly forty three byte instructions, and
the main loop then executes one instruction and rotates whatever that instruction pushed from the
tail of the ring to its head. So a `0x7F` runs its sublist **next** rather than after everything
already queued, the ring holds the call stack, and its depth is bounded by nesting rather than by a
list's length.

**Every push into a full ring is discarded with no error.** All three push routines test the count
first and return, and the two that report anything are called from code that ignores the answer. The
ring is shared: a key press, a state change, a display band announcement and an
action queued by the host, command state `0x34` on arch 14, section 326, push into the same forty
slots a running activity occupies.

So a config states an implicit demand, the deepest its own lists go, and a config whose demand
exceeds forty is one the remote accepts and silently does less than.

| | deepest run of any list |
|---|---|
| the four configs carrying a hand authored sequence or a fifteen device campaign | 35 |
| every other Harmony One config | 22 |
| Harmony 700 | 18 |
| Harmony 890 and Harmony 600 | 14 |
| Harmony 880 and 885 | 13 |
| Harmony 525 | 9 |

**Arch 9 carries the same ring and its address is known**, section 254: base `0x0346`, exclusive end
`0x03BE`, write pointer at `0x03BE` and `0x03BF` immediately past it, and a wrap constant of `0x78`
added on underflow and subtracted on overflow by two bound checks that name different ends. The base
plus the wrap is the end, so the three constants close on each other, and `0x78 / 3` is forty. The
count of bytes still pending sits at `0x345`, immediately **below** the base, and the fetch routine
decrements it; that routine names both the base and the end in one place and advances the read
pointer by **one byte** rather than by an instruction, section 255. That
figure was derived on arch 12 from the queue's own writer and here from three addresses on an
architecture with a different SFR map, so it is measured twice with nothing in common.

Nothing measured overflows, so forty is a rail for what a writer produces rather than a description
of the corpus. `packages/codec/src/queue.ts` computes it and `assertQueueFits` refuses; the figure it
reports follows `0x7F` only and is therefore a lower bound, since a write to a state variable also
pushes. `docs/findings.md` section 238.

#### A sequence is one action list of calls and per device pauses

**Confirmed on arch 12 (Harmony One) from four compiles of one account holding the same two sequences,
five of each compile's six lists reproduced instruction for instruction from the account's statement of
their steps; on arch 14 confirmed from one Logitech compile of a Harmony 650 holding one sequence,
section 343, for the shape, the pause's devices and order, and a 20 second pause as one `0x7C`, and from a
second on the same model, section 349, for the screen copy and the record a command sends; the send's
quantity is still inferred there.**
[findings.md](../../docs/findings.md) section 327. **On a Harmony 650 the composed form runs as written**, section 342:
one press sent the three commands with the two pauses, 2 and 20 seconds, between them, and Logitech's
compile of the same sequence is the same list, section 343, sending single block records of its own.
**A pause holds every device it names, and so the whole activity**: a key pressed during the 20 second
pause, Volume Up to the receiver, was sent only when the pause ended.

| step | what a list holds |
|---|---|
| a command | one `0x7F` call of that command's send list `{0x7D, 0x7C}`, whose `0x7C` is the device's **inter key delay** in tenths, so a device at 200 ms calls lists at 2 where its device mode keys call lists at 1. The one separating device in the sequences is that one; the send is a single block record of its own where the key's is two blocks. On arch 14, as measured on the Harmony 650 alone, that record is the key's **one block copy**, section 349: its first block less the opening silence, two words of 50 ms on all 407 two block records of the Harmony 650 compiles measured, at the same carrier, with no held block and no tail; the group's own where the configuration holds one, which Logitech's compile of the test setup holds for 97 of its 407 two block records and for none twice, and one the compiler adds to the group where it does not, numbered among the group's records. `composeSequence` makes the same record, appended at the group's end, and on arch 12 sends the record named. A single block copy opens on arch 12 (Harmony One) with its device's delay between devices, 500 or 1000 ms, and on arch 14 (Harmony 600, 650 and 700) with no silence, where the wait is section 287's delay step, section 337 |
| a pause | one `0x7C (group << 8) \| tenths` per device the **activity** switches on, in the order its start switches them on, whatever device the neighbouring steps send to. Four of four compiles, three of them with the devices renumbered |
| a pause of 20 seconds | one `0x7C` of 200 per device, not runs of 100 |
| two pauses in a row, and a pause at the end | kept as written, not merged |

* **One send list per distinct command**, shared by every step and every copy that sends it.
* **One copy of the list per binding.** On arch 12 a screen button's copy opens with the beeper
  `0x75 0x0FCA` and has the page's second copy; a key's copy has none. On arch 14 the screen copy is the
  key's, no beeper, and the page's second copy is a second list of the same body, seen on the Harmony 650,
  section 349.
* **On arch 14 every send list opens with its delay step**, section 287, and a send list a sequence
  needs that the compile lacks, a code with no list at the quantity asked for, is three lists: the send, its private load, its private condition calling
  the device's one shared delay list.
* **One copy of MySequence carries one extra call at the front**, the set top box command the
  activity's same key sent before the sequence was bound to it. Not composed.
* **A sequence inside an activity's start does not exist** in Logitech's schema, whose enter actions are
  a command, a channel or a delay, and no sample holds one.
* **The rail is the action queue**, `assertQueueFits`: a sequence is spooled whole, so 11 commands and
  14 pauses on a three device activity is 53 instructions, past the forty, inside the 25 step limit
  Logitech's editor states. `composeSequence` refuses it.

#### Arch 9 re-validates the configuration on opcode `0x1F` to `0x3E` with operand high byte `0xC0` to `0xCF`

**Confirmed on arch 9 only**, from the firmware, sections 254 and 255. **Section 254 gave this as an
opcode band `0xC0` to `0xCF`**<!--superseded--> and section 255 corrects it: `0xC0` to `0xCF` is a
band of the **operand's high byte**, and the opcodes that reach the chain are `0x1F` to `0x3E`. The
handler takes that high byte's **low nibble** as an order selector and calls the container
re-validation, which validates a container and writes the verdict bit the status screens are chosen
by. Nibble values 2 and 3 choose which container goes first.

That is the same shape this document already records for `0x1F` on the other architectures, where the
operand's high byte carries a sub-command, `0xFE` to push into a table and `0xFF` to carry an index.
Arch 9 uses the byte the same way and has more bands of it: `0xD0`, `0xE0` and `0xF0` are three
further groups and what they do is unread, and `0xFC` is a fourth value, special cased in the
interpreter's loop head before the dispatch even begins.

**Neither other architecture has it.** On arch 12 the re-validation runs from a cable transition and
on arch 14 from a poll, both the firmware's decision rather than the configuration's, sections 251
and 252. So this is the only place in the format where a configuration can ask a remote to re-check
itself.

**No config in the corpus emits one**, which is the same answer section 118 gave for the two flash
writing opcodes on arch 14. A writer has no reason to emit it and this is recorded so that a
disassembly of an arch 9 action list has a name for the opcode rather than a gap.

**Confirmed, section 255:** the chain switches on `0x3D8`, and an arch 9 instruction is staged as
operand low, operand high, opcode, so `0x3D7` is the operand's low byte, `0x3D8` its high byte and
`0x3D9` the opcode. **That is the format's own field order**, `{ u16 operand; u8 opcode }` little
endian, read in file order, and what identifies it is the loop head comparing the **third** byte
against opcode `0x1F` and the **second** against a sub-command value. The bank is established by
chain of custody, the last explicit `MOVLB` before the branch into the chain plus the absence of any
other on the path, rather than by the disassembler's inference, which drops at a control transfer.

#### The introduction tour is one list, in one of two forms

Section 286, on all five arch 14 user configurations. The introduction tour, which a Harmony 650 was
seen opening after a reload, is started by one list, which Logitech's compiler writes in one of two
forms, shown on `calibration_h600` and the 650's configuration and skipped on the other three:

```
[0x80 + v   operand 1]      mark the tour started: variable v, seeded 0, written nowhere else
[0x7E       operand m]      shown: enter the tour's first screen
[0x7F       operand exit]   skipped: run the tour's exit instead, h600_config and both 700s
```

List 660 with `v` 44 and `m` 216 on the 650, list 396 with 43 and 183 on `calibration_h600`: ten
screens each, whose bindings reach exactly one list between them, the last screen's Exit, list 137
and list 63, and base slot 8's leading list names it twice. That exit reaches
`[0x71 0x8000 | v, 0x7F tour, 0x7E assistant]` after loading 0 into the byte register, while a second
variable, 21 on the 650, is 0, so it calls the tour list itself while `v` is 0, which is why the tour
marks itself first. The start list is list 3 on the 650, one of lists 1 to 4 that base slot 8's leading
list names, and the firmware queues one instruction of that list by index; which index a reload runs
is **unconfirmed**.

**Skipping it** is replacing `0x7E m` with `0x7F exit`, which is the vendor's skipped form: same length,
the mark kept, so the remote is left in the state a finished tour leaves. Written to the 650, and Danny
reports the tour did not appear after the restart, the Remote Assistant screen that follows the tour's
exit coming up instead. `introductionTour` reports the form and `skipIntroductionTour` refuses a tour
already skipped and a configuration with neither form.

#### The final run belongs to base slot 8

The lists a `0x7F` never names are not orphans. Base slot 8 holds a `u16` reference to **every** list
in the final run and to no list outside it: 381 references covering 7656 to 8036 on the 700, and 199
covering 4756 to 4954 on the 600, which is a bijection. A section that size would hold about twenty
values in that band by chance.

Slot 8's own record layout is **not established**. The references are not evenly spaced, so it holds
variable length records rather than a table, and whether it also names lists in the other four runs
cannot be told by scanning, because that index range is wide enough for coincidences to swamp it.
`docs/findings.md` section 26.

#### Every place that names a list, and the lists nothing reaches

**Confirmed on arch 14 (Harmony 600, 650 and 700), 22 compiles.** A list's index is written at ten kinds
of place, each the `u16` operand of a `0x7F`: an action list's own call; a tagged list's entry, in a mode's
key map, a page list, a page list's second copy and a base slot 9 entry; a timer's instruction at record
offset 4; a state transition's at value offset 5; an instruction a screen program queues with opcode 17,
operand at its offset 1; a number sender's three instructions at offsets 5, 8 and 11 and its digit tables;
and base slot 8's leading list. `listCallSites` enumerates them and `checkRenumbering` holds a renumbering
of base slot 10 to all of them. Every list a screen program queues is named by that one instruction and by
no other holder, and a page list and its copy hold the same lists, many of them at different table entries:
426 of 700 places on `h650_test_config_clean`. Number senders' places occur on 3 of the 22.

Lists nothing reaches through any of these, following calls: 126 to 392 per Logitech compile, 6528 lists
and 48801 bytes over the 22, none below the wiring's front. Dropping them all and renumbering changes
nothing `compareViews` reads and passes `checkWiring`, `checkScreenRecords` and `checkScreenTexts` on all 22
and `checkFirmwareScreens` on the 21 it reads. `docs/findings.md` section 362.

#### `{0x7A a; 0x6C b}` is most of an arch 14 config

**Confirmed on architecture 14.** 2832 of the 700's 8037 lists and 1888 of the 600's 4955 are two
instruction lists of exactly this shape, which is also every `0x6C` in each file: the opcode occurs
nowhere else.

Partitioned by the `0x7A` operand they form six groups on the 700 and four on the 600, each of
exactly **472** lists, and every group carries the **same 472 values** of `0x6C` once each. Those
472 are identical on both remotes:

```
451 values  0 to 450, contiguous
 21 values  0x8000 to 0x8014, which is 0 to 20 with bit 15 set
```

A set that does not change between two owners' configs on two models is a **vocabulary the format
carries**, not user data. So most of base slot 10 is the complete cross product of a small per
config set with that vocabulary, one list per pair.

*A device selector and a function id would fit the counts, since the 700 supports six devices and
its config has six groups, and the `0x7A` operands look like database identifiers rather than
indices. Not established.*

Architecture 12 has an analogous pair, `{0x75 a; 0x7E b}`, with one group and a value set that is
neither the same size nor contiguous, so the structure does not transfer as it stands.
[findings.md](../../docs/findings.md) section 28.

#### `0x7C` is a per device delay in tenths of a second, folded no further than 100

**Confirmed on four architectures, and on two firmware images.** The operand is
`{ u8 group; u8 value }`: the group is an infrared group, and in 21882 uses across twelve
containers it is always one the config's infrared table has. ~~The value is 0 to 100 and never more.~~<!--superseded-->
**The value is 0 to 100 in those twelve, and Logitech's compiler writes 200 in one instruction** for a
sequence's 20 second wait on the Harmony One, twelve times in one configuration, [findings.md](../../docs/findings.md)
section 327.

**The fold stops at 100 in the firmware**, which is all the firmware shows; it does not cap a single
instruction. `0x7C`'s handler is `0x7D`'s handler
with one bit set: `0x13102` against `0x130E0` on the Harmony 700, `0x26F96` against `0x26F74` on
the Harmony One, sharing a worker. Both hand the operand to the same infrared queue, a circular
buffer of 30 bytes holding `{ u8 tag; u8 value }` entries where the tag is `kind << 4 | group`;
`0x7C` sets bit 6 of the group byte, which marks the entry as a quantity rather than a send, and
asks for priority 1 where `0x7D` asks for 2.

That bit changes what enqueueing means. A quantity folds into the last entry of the queue when the
tag matches: the larger value wins and the smaller is dropped. **The fold is refused when the
queued value is already 100**, which pushes a second entry instead, and that is the mechanism that
makes a quantity above 100 expressible at all. [findings.md](../../docs/findings.md) section 70.

Two rails follow. ~~A writer must **spell out a value above 100** rather than emit it whole~~: the
fold is refused at 100 and a **single** entry is not capped, and Logitech's own compiler emits a
sequence's pause whole on the Harmony One, section 327. No inline power on delay on arch 8, 9 or 12
exceeds 100 and arch 14 spells its larger ones out, so the rail stands for a delay and not for a
pause. Whether the remote waits the full value of one instruction
above 100 is unmeasured. A config can hold at most **sixteen infrared groups**, because the tag's low
nibble carries the group. The corpus tops out at seven.

On arch 14 every use is in one of two shapes: lists made of nothing but `0x7C`, or as the third
instruction of `{0x7F, 0x7D, 0x7C}`. Other architectures also use it bare, a power on delay and a
sequence's pause among them. In a pure list of length `k`, every operand but the last has low byte 100 and
the whole list keeps one group, so it reads as `(k - 1) * 100 + n`:

| length | lists per group | remainders | value |
|---|---|---|---|
| 2, 3, 4 | 100 each | 1 to 100 | 101 to 400 |
| 5 | 50 | 1 to 50 | 401 to 450 |

The union is 101 to 450 per group, contiguous, each value once. **450 is also the top of the fixed
`0x6C` vocabulary**, which is 0 to 450, reached from a completely different direction. So the two
are the same enumeration: one instruction covers up to 100, more than one spells out the rest.

**It is a delay, in tenths of a second**, section 235, which closes what this paragraph left open as
"the unit itself wants the timer that drains the queue"<!--superseded-->. The instinct in the old
wording was right, that folding by the larger is how a duration behaves; what settled it was a
calibration rather than the timer. Logitech's service compiled a configuration for the same three
devices twice, once for a Harmony One and once for a Harmony 600, and arch 14 states a device's power
on delay in a state variable whose unit its own screen spells out in tenths. The two agree device for
device, 3 of 3, so the operand is tenths of a second and 450 is 45 seconds.

**Where a device's power on delay lives on arch 8, 9 and 12 is one of these instructions**: exactly
one, at the top level of the action list a device's `Power` variable runs on its 0 to 1 transition,
naming that device's own group. 57 of 57 transitions across those three architectures carry one and
all 16 on arch 14 carry none. The nested list that sends the code carries its own `0x7C` of value 1,
the ordinary per send quantity, so a reader must stay at the top level. `powerOnInstructions` in
`packages/codec`. [findings.md](../../docs/findings.md) sections 29, 70 and 235.

**Changing one is a two block write**, section 237. `applyEdits` restamps the trailer checksum, which
sits at the far end of the container, so the operand and the checksum land in different 64 KiB erase
blocks: `0x083BFD` and `0x1D6B66` on the spare Harmony One, 1.3 MiB apart. That makes two erases the
**floor** for any same length edit, not a property of page bindings, which is where section 187 first
measured it. It also means a writer needs known good content for a flash **region** rather than for a
container, since the checksum's block runs past the container's declared end.

**What the delay delays is the next code to that same device, and nothing else**, section 236, which
finishes what the fold rule above only hinted at. Three consumers drain the queue and two of them ask
one shared helper the same question, "is there an earlier entry naming this device": the picker
emits a send only when the answer is no, and the tick subtracts one from a quantity only when the
answer is no. So the queue is ordered **per device** and never globally. The scan is `0x13204` on
the Harmony 700 and `0x2706A` on the Harmony One, and it reads identically on the two but for the
kind mask, `0xF0` against `0xE0`; the picker is `0x1338A` and `0x2711C`, the tick `0x13706` and
`0x27318`.

Three consequences a reader or an editor has to carry.

* **A power on delay an activity cannot show is not a defect.** In this corpus 37<!--fact:delay_unfelt--> of 129<!--fact:delay_pairs--> pairs of an
  activity and a device it switches on send that device nothing after the power code, so those
  delays run down in the background and are never felt. 13 containers hold both kinds at once.
  `powerOnDelayReach` in `packages/codec` is the measurement.
* **Two devices never wait for each other.** An activity's power codes go out one after another
  whatever their delays are, because each delay only guards its own device's queue.
* **The quantity is a duration and not a repeat count**, settled by the tick decrementing it once
  per tick regardless of what is being transmitted, which is independent of section 235's unit
  and agrees with it.

Confirmed on hardware, both ways round, on a Harmony One on 1 September 2026: raising a television's
delay to ten seconds in an activity that sends it one command changed nothing observable, and raising
the receiver's in the same activity, where an input change follows, moved its gap from about six
seconds to about ten.

Arch 12 masks the kind with three bits and the device with four, so bit 4 of a tag belongs to neither
field, where arch 14 gives it to the kind. Unconfirmed what it is for, and nothing in the corpus can
say: the group is what fills those bits and no config here has more than seven groups, so bit 4 is
never set in the first place.

#### `0x6C` writes a device record, and never alone

**Confirmed on three arch 14 containers.** Every use is the second half of `[0x7A key, 0x6C value]`
and the list holding the pair is those two instructions and nothing else, 7552 of 7552. Arch 8, 9
and 12 do not use the opcode.

```
0x7A key          load the sixteen bit accumulator
0x6C value        look the accumulator up to a record, write the value into it
```

Bit 15 of the value is **a field selector**, split off by the firmware before the store. Per key the
corpus enumerates field 0 from 0 to 450 and field 1 from 0 to 20, contiguous and complete, with
nothing between `450` and `0x8000`.

**The number of distinct keys is the number of infrared groups**, 6 and 6 and 4, so a key is a
device. Keys occur nowhere else in the container, so they are identifiers the generator brought in
rather than offsets into it. *What the two fields are is not established*, but field 0's range is
the same 0 to 450 that `0x7C` carries by a different route. [findings.md](../../docs/findings.md) section 71.

#### `0x07`, `0x0F`, `0x1F` and `0x3F` carry a second opcode field in the operand

**Confirmed on four architectures.** These four opcodes never carry an operand below `0xC000`, and
every other opcode in the inventory does. 14565<!--fact:high_band_uses--> uses of the four, no exception, in 15<!--fact:user_configs--> configs
holding 85962 instructions between them.

| opcode | operands, signed, over the whole corpus | distinct | uses |
|---|---|---|---|
| `0x07` | `-14` to `-1` | 12 | 4587 |
| `0x0F` | `-192` to `-29` | 10 | 91 |
| `0x1F` | `-6400` to `-241` | 247 | 5329 |
| `0x3F` | `-16384` to `-2510` | 48 | 374 |

The lowest operand any of them takes is exactly `0xC000`, which is `-16384`. No value is ever
carried by two of the four. The band is not exclusive in the other direction: `0x7A` and `0x79`
also reach above `0xC000`.

`0x07` and `0x0F` draw from a **vocabulary fixed per architecture**: both configs of arch 14, of
arch 12 and of arch 8 give byte identical sets. `0x07` is `-14, -13, -11, -10, -9, -4, -3, -1` on
arch 14 and `-10, -9, -8, -7, -5, -4, -3, -1` on arch 12 and arch 8. `0x1F` and `0x3F` keep most of
their values across a pair and add config specific ones.

~~**Consequence for a codec, ahead of the meaning.** An operand at or above `0xC000` is a reference
into something the firmware supplies, not an index the generator assigned.~~ **The advice was
right and the reason was wrong**, section 72. The operand is not a reference: it is the rest of the
opcode. Below `0x65` the dispatcher stops testing the opcode after five ranges and tests a byte of
the operand instead, the **high** byte for opcodes from `0x1F` up and the **low** byte below it, and
`0xC000` is simply the bottom of the lowest band it tests. Carry the operand through unchanged all
the same, and for a stronger reason: renumbering it changes the instruction.

Two consequences follow. **Opcodes below `0x07` do nothing**: the dispatcher returns before reading
the operand, and the corpus's 3053 `0x00` instructions all carry operand zero, so they are three
zero bytes an emitter must keep. And ~~**one instruction can span four**: opcodes `0x3F` to `0x64`
with an operand high byte in `0xD0` to `0xDF` consume the next three off the queue.~~<!--superseded--> **it is two,
not four**, section 73: `0x0E82C` pops **one byte** off the queue, not one instruction, so three
calls take three bytes. `0x3F` with a high byte in `0xD0` to `0xDF` is a **six byte instruction**
whose second half is an ordinary instruction read as data, `0x7F` in 55 of its **75** uses, `0x7E` in 19
and `0x72` once.

**A reader has to skip that second half and this project's did not, for a month**, section 139: the
argument resolves as a real instruction at depth `meaning` every time, so the reading table was
reporting the meaning of bytes that are not one and `action_instructions` counted 58 of them. Every one
of the 75 heads a **two slot list**, so the whole list is the one instruction. `takesFollowingSlot` in
`packages/codec/src/actions.ts` is the predicate; a byte level reader still returns both slots, because
an emitter reproduces the argument.

**Only five opcodes occur below `0x65` in the whole corpus**, `0x00`, `0x07`, `0x0F`, `0x1F` and
`0x3F`, one per range and each the top of its own, which is `2^n - 1`. What the low bits would mean
is unconfirmed because nothing exercises them.
[findings.md](../../docs/findings.md) sections 31, 72 and 73.

**The bands are read, and they are not one table across architectures.** Every branch of both
dispatchers is followed to its `RETURN` in section 73. The full band tables are there; what a
codec needs from them is this:

| opcode | band, on | what the bands are |
|---|---|---|
| `0x1F` | operand high byte | a register machine: a byte register, a sixteen bit accumulator, load and arithmetic on each, and load and store against the base slot 13 state variable table |
| `0x07` | operand low byte | thirteen operations with no argument: a push and pop stack, timer cancellation, clock and state variable reads |
| `0x0F` | operand low byte | peripherals and the **flash journal**, plus register moves. Little to do with the config: its `0xE0` band appends bytes to a region of the external flash, section 108. **Not one table across architectures**: arch 9's ladder is its own, section 139 |
| `0x3F` | operand high byte | four bands, one of which is the six byte instruction above |

**`0x3F`'s lowest band is `0xB0` on arch 14 and `0xC0` on arch 12, and the routines differ.** This
is the only structure in the format so far that is not one table across architectures,<!--superseded--> so a `0x3F`
band **must not** be ported between them. The failed prediction that found it is in section 73.

**It is one of three.** The opcode block `0x65` to `0x6E` is arch 14 only, section 107, below. And
`0x0F`'s bands differ on arch 9, section 139: the band at `0x60` is a real arm there and inside the
no-op range on arch 12 and arch 14, the band at `0x40` is the reverse, `0xD0` is tested and ignored on
arch 9 alone, and `0x90` is gated on a port bit that no other ladder tests.

Bands the firmware tests and then ignores are part of the specification, not gaps: `0x1F` below
`0xE0`, `0x0F` bands `0xF0` and `0x50` to `0x7F` **on arch 12 and arch 14**, where on arch 9 that
range holds a real arm at `0x60` and the ignored ones are `0xF0`, `0xD0`, `0x70` and everything below
`0x60`, section 139, and `0x3F`'s `0xF0` nibbles 3 and 5. The corpus
uses several of them, 84 times for the last alone.

**The four opcodes above are floors, not values**, section 108: the dispatcher compares the opcode
against `0x3F`, `0x1F`, `0x0F` and `0x07` in descending order, so `0x20` reaches the same handler as
`0x1F` and `0x40` the same as `0x3F`. Every config in the corpus emits only the four canonical values,
and a writer should keep to them.

**`0x1F` band `0xFC` is not one of them, and used to be listed as one.** The dispatcher's arm for it
really does nothing, and the instruction never reaches the dispatcher: the fetch tests for opcode
`0x1F` with operand high byte `0xFC` first, on all four architectures, and delivers the low byte to
the innermost active handler that accepts it instead. It is how the firmware raises its own events,
and **no config in the corpus emits one**. Section 104.

#### Arch 12's `0x3F` band `0xC0` resolves by selector

**Confirmed on two arch 12 configs and two images**, 106 uses each. The operand carries three
fields, `{ bit 0; bits 1 to 3; bits 4 to 8 }`, and the third is a five bit selector, so selectors 0
to 15 arrive with high byte `0xC0` and 16 to 31 with `0xC1`. The handler accepts fifteen values and
drops the other seventeen, and the corpus uses exactly the fifteen:

| selector | what it does | uses per config |
|---|---|---|
| 17 | sets the **display's light level**: bits 1 to 3 choose one of eight states, bit 0 fades rather than snapping. States 2 to 5 take a level from base slot 15 group 1 and a pair of device levels from group 9, state 6 chooses the state from the measured band, states 0 and 1 turn it off | 68 |
| 0 to 12 | sets channel `selector` of the I2C device at address 0x60 to the two bit value the byte table past base slot 15 group 9 states for bits 1 to 3 being nonzero. Which device it is is *not established* | 36 |
| 16 | enables that device, `LATC` bit 5, set when bits 1 to 3 are nonzero | 2 |
| 13 to 15, 18 to 31 | nothing: the handler falls to its exit | 0 |

64 of the 68 are selector 17 state 6 without a fade. **The band's uses are identical in both One
configs**, one of which has five devices and eight activities where the other has one and one, so
nothing here varies with what the remote is set up to control. **They are the generator's fixed
initialisation sequence for the device at 0x60**, one pass setting each channel off and one setting
each on, and the firmware itself never enables that device: it only switches it off at shutdown. So a
config that omits them leaves the device disabled. `findings.md` section 106.

`actions.BAND_3F_C0_SELECTOR` extracts the selector and `actions.reading` resolves the instruction.
[findings.md](../../docs/findings.md) sections 102, 103 and 106.

#### `0x75` sounds a tone

**Confirmed on arch 8, 9 and 12**, 4380 uses; arch 14 issues it never. The operand is
`{ u8 cycles; u8 half_period }`, the half period in loop iterations of seventeen instruction
cycles. At the 4 MIPS the infrared carrier gives (section 32) that is 4.25 us a step:

| operand | cycles | frequency | duration | uses |
|---|---|---|---|---|
| `0x01FF` | 1 | 461 Hz | 2.2 ms | 80 |
| `0x0FCA` | 15 | 582 Hz | 26 ms | 4238 |
| `0x4664` | 70 | 1176 Hz | 60 ms | 56 |
| `0x8C19` | 140 | 4706 Hz | 30 ms | 6 |

The whole corpus uses those four and nothing else. Counting the loop's own overhead moves the
highest by about 8% and the lowest by under 1%. **`0x3F` with high byte `0xF3` gates it**: the
generator returns without playing when that byte is zero. [findings.md](../../docs/findings.md) section 74.

**On arch 12 (Harmony One) Logitech's compiler clicks before every screen send.** Every screen binding
that sends runs `0x75 0x0FCA`, then its calls, then its `0x7D`, and no key binding that sends runs it,
on four of Logitech's compiles; this project's own writes omit it and the remote still sends, so it is a
convention. The generator returns only when the 26 ms tone has played, and the send follows two main
loop turns later. A screen binding's send is also more often a **one block copy**, whose once block opens
with its device's delay between devices, 500 or 1000 ms on the One, where a two block record opens with
50 ms: 148 of `one_config`'s 241 screen sends against 23 of its 377 key sends. A touch reaches the same
event poster as a key, and the touch code `0x202` sets the streamer's hold flag as a held key does.
[findings.md](../../docs/findings.md) section 337. **A device page's row, a `0x7F` binding, runs a list that opens with
the click**, on 3545 of 3545 rows over nineteen of Logitech's One compiles: `{0x75 0x0FCA, 0x7F list}` on 3495,
the click and a `0x72` on 50. The touch family's device page wraps every row whose list does not already open with
a click that way, and an activity screen's pad, which clicks itself, calls the command under the device page's
click, so no binding reaches two clicks, as none in Logitech's compiles does. The Harmony 600, 650 and 700
compiles' device page rows open with a call instead. [findings.md](../../docs/findings.md) section 404.

#### State variables 3, 5 and 6 are the date

**Firmware defined, not assigned by the generator.** `0x07` with high byte `0xF8` steps a calendar
held in them: day, month and year. The month length table has the four thirty day months at zero
based 3, 5, 8 and 10, February apart, and the month is reduced modulo 12. The same three offsets
from the state variable base appear in both firmwares, `0x900` on arch 14 and `0x108` on arch 12.

A writer must not reuse those indices. The corpus agrees: the value counts of the first twelve
base slot 13 records are identical across all four architectures.
[findings.md](../../docs/findings.md) section 74.

#### `0x80 | n` writes state variable `n`

**Confirmed on twelve containers across four architectures**, 3011 uses. The dispatcher clears bit
7 and hands the instruction to one routine, which indexes the base slot 13 table and writes the
operand into it.

```
opcode  0x80 | index      index into base slot 13, 0 to 0x7F
operand the value
```

The **width comes from the table**, not from the instruction: an index below base slot 13's
`narrow` count stores one byte and the operand's high byte is discarded. Two closures: no
instruction names a variable the table does not have, and **none of the 2947 narrow writes carries
a high byte**, which is the one an emitter has to respect.

`0x1F` bands `0xEE` and `0xED` reach the same store with the index in the operand instead, so an
index above `0x7F` is reachable only through those. [findings.md](../../docs/findings.md) section 73.

#### `0x73` runs a screen program

**Confirmed on eight containers**, 3927 uses, all arch 8, 9 and 12; no arch 14 config issues it.
The operand indexes base slot 11, the same table the screen language programs live in, and
**nothing in the corpus names a program outside it**. [findings.md](../../docs/findings.md) section 73.

#### `0x7D` sends an infrared code

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures.** The operand is `{ u8 group; u8 index }`
into the base slot 5 table above, and **the set of distinct operands is exactly the set of valid
`(group, index)` pairs**: every record is reached and nothing outside the table is named,
4147<!--fact:ir_references--> records and 4147<!--fact:ir_references--> distinct operands over the
15<!--fact:user_configs--> user configs. Onto rather than one to one, since a
record can be sent from more than one list.

`0x7D` appears in exactly one list shape per config, `{0x7F, 0x7D, 0x7C}` on arch 14 and
`{0x7D, 0x7C}` on arch 8, 9 and 12, and in all 4267<!--fact:send_lists--> of those lists the `0x7C` operand's high byte
equals the `0x7D` operand's. So the grouping is shared between the infrared database, `0x7C` and
`0x7D`. The accompanying `0x7C` value takes seven values across the corpus, `0, 1, 2, 3, 4, 5, 10`, and is
1 in most sends. **On a device freshly added from the catalogue the value is one of three**, section 320,
on the 18 test device instances of the six power hold compiles, arch 14, which sit outside the corpus
and add a value it does not hold, 20: 1, the entry's `interKeyDelay` in tenths, or its `inputDelay` in
tenths. Every command has a list at 1. The power transitions' sends are at `interKeyDelay`; on seven
of the instances so is a second, uncalled list for each digit 0 to 9, which the Barco 6300 and the
Pioneer DEH-P47DH do not get at the same `interKeyDelay` of 5; and on three a second list for some input
commands is at `inputDelay`, which four others with input commands do not get. **Unconfirmed**: what
decides the digit and input copies. Not scored on the corpus, whose devices may carry delays their owner
edited: the Harmony 650's own configuration has 10 lists at 4 on a device the catalogue states with an
`interKeyDelay` of 1. What says it is a count rather than a second identifier is not the size of that set,
which grew when the population did: an identifier would have to separate the records of a group, the
largest group here holds 111, and the firmware caps this field at 100. Section 140.

**A writer must emit the pair, and a bare send is not a smaller version of it.** Section 278, on the
spare Harmony One: a composed list of `0x7D` alone sends from a key press and sends **nothing** when
an activity's state transition runs it, and adding the `0x7C` for the same device fixes it. So the
shape above is a rail and not a habit. Measured on arch 12 (Harmony One) only; the firmware's reason
is unread. On arch 14 every send list also opens with a `0x7F`, a delay step of three lists read in
section 287, which the composer emits.

**On arch 16 the cover is exact rather than onto**, section 261, which is the one architecture where
that can be asserted: the Harmony 350's action lists hold 130 send instructions with 130 distinct
operands against 130 records, and each of its three non-empty groups is covered contiguously from 0,
52, 48 and 30 records respectively. Elsewhere a group is covered in part, because a device's codeset
holds more codes than its activities bind, so the assertion there is that every named `(group, index)`
exists and not that every record is named. That container is outside every corpus wide population,
section 194, so the figures above are unaffected by it.

**Five arch 16 containers now, over two models, and one of them fills its table**, sections 262 to 265.
The exactness holds on all five: on a configuration a previous owner had compiled in 2011, and on the
programmed Harmony 300 whose four groups are all occupied, 154 sends over 154 records, which is the
first arch 16 sample where no group is empty.

Read with `gspm.ir_reference` and `gspm.ir_references`.
[findings.md](../../docs/findings.md) sections 33 and 261.

#### The interpreter, from the firmware

**Read out of two arch 14 images**, the Harmony 700 2.8 and the complete Harmony 600 0.2. This is
what the opcodes are executed by, so it constrains every reading of them.

An action list is spooled into a **circular queue of 120 bytes, exactly 40 three byte
instructions**, and drained by a separate loop. Same size on both images. The host can push into
the same queue over USB: on arch 14 through command state `0x34`, a version request with a payload,
and not `WRITE_MISC` selector 3, which libconcord calls `MISC_QUEUE_ACTION` and arch 14 leaves
unhandled, section 326.

The dispatch is a **binary search on the opcode**, not a jump table and not an `XORLW` chain. Its
boundaries:

| range | handling |
|---|---|
| below `0x65` | a second dispatcher, read in full in section 73. Five distinct opcodes, 12462 uses |
| `0x65` to `0x7F` | individual handlers, twenty distinct opcodes, 83359 uses |
| `0x80` and above | **one routine**, with bit 7 stripped: a state variable write. 55 distinct, 2603 uses |

Placed by their handlers:

| opcode | meaning |
|---|---|
| `0x7A` | load the sixteen bit accumulator with the operand |
| `0x79` | add the operand to the accumulator |
| `0x78`, `0x77` | ~~two more accumulator operations, through helper routines~~<!--superseded--> **multiply and divide**, section 107: one 16 by 16 multiply and one restoring division, `0x78` taking the product's low sixteen bits and `0x77` the quotient |
| `0x7B` | build an instruction from a runtime byte and push it back on the queue |
| `0x71` | **eight operations on a state variable**: low byte indexes it, low nibble of the high byte selects, left hand side is a byte variable. Six comparisons and two updates, section 107, and **bit 15 gives a comparison a second arm**, section 140 |
| `0x70` | the same eight, and the same bit 15, with the accumulator as the left hand side |
| `0x72` | **map a state variable's value**: low byte a state variable, high byte a base slot 14 record |
| `0x6D`, `0x68` | accumulator **shifted left** or **right** by the operand's low byte; a count of zero is a defined no-op |
| `0x6B`, `0x6A`, `0x69` | accumulator **AND**, **OR**, **XOR** operand |
| `0x6E` | accumulator **modulo** the operand: the same division as `0x77`, taking the remainder instead of the quotient. Arch 14 only, section 107 |
| `0x6F` | **nothing**, with a mechanism: the handler tests the accumulator for zero and both arms return, section 107 |
| `0x6C` | **write a device record**: the accumulator from a preceding `0x7A` selects it, bit 15 of the operand selects one of two fields and the rest is the value, below |
| `0x67` | the third producer into the infrared queue of `0x7C` and `0x7D`, tag `0x5`. What it means is unconfirmed |
| `0x66`, `0x65` | **append to the flash journal**: `0x66` the operand's high byte, `0x65` its low byte and then its high byte. Arch 14 only, section 108 |
| `0x76` | **position the serial flash cursor** at the record its operand indexes, remembering the index so a later instruction walks forward. Which array it indexes is *not established*, section 108 |
| `0x74`, `0x75` | ~~**one instruction, not two**: the dispatcher never tests `0x75` and nothing downstream reads the opcode~~<!--superseded--> **two instructions**, section 74. Arch 14 issues neither, and the arch 12 dispatcher tests both: `0x75` **sounds a tone**, `0x74` accumulates a digit |
| `0x7C` | **a delay before the next code to that device**, tenths of a second, into the same infrared queue `0x7D` uses, below |
| `0x73` | **run the base slot 11 screen program** the operand's low byte indexes, section 369 |
| `0x75` | **sound a tone**: low byte the half period, high byte the cycles. Four operands in the corpus, 461 Hz to 4.7 kHz, below |
| `0x07` with operand `0xF8xx` | **step the date** held in state variables 3, 5 and 6 |
| `0x07` with operand `0xFFxx` | **make the next state variable write silent**, one write and no more |
| `0x3F` with operand `0xF3xx` | **the sound gate** `0x75` tests before playing anything |
| `0x80` and above | **write state variable `opcode & 0x7F`**, the operand its value |
| `0x1F` with operand `0xFFxx` | **select the current binding table entry**, low byte the index into base slot 9 |
| `0x1F` to `0x3E` with operand `0xF3xx` to `0xF6xx` | send a computed number to base slot 16 or 14, from the accumulator or from a byte register |

The comparison selector is `0` equal, `1` not equal, `2` greater, `3` less, `4` greater or equal,
`5` less or equal. Selectors `6` and `7` are not comparisons. **`0x71` uses exactly `0` to `5` and
nothing else**, over 2477<!--fact:compare_71_uses--> uses in 15<!--fact:user_configs--> configs, which is what made its high byte look like a group
of six. `0x70` uses `0` to `3` and also `7`, nine times.

The high byte's other end is a **flag, and it says how many arms the conditional has**, section 140.
The handler tests bit 15 after the comparison, on all seven firmware images across four
architectures, and with the bit set a comparison that comes out **true** zeroes the three bytes two
slots ahead in the interpreter's queue, which opcode `0x00` makes a no-op. So:

```
+0x00  u8   opcode, 0x70 or 0x71
+0x01  u16  operand:
             bits  0 to  7   the base slot 13 state variable index
             bits  8 to 11   the operation, 0 to 7 above
             bits 12 to 14   read by nothing, zero in every instruction in the corpus
             bit  15         set: the next two instructions are the two arms
                             clear: the next instruction runs only if the comparison holds
```

A false comparison always skips the next instruction by fetching its three bytes and discarding
them, so the untaken arm of a two armed conditional is cancelled in whichever direction it falls. The
untaken arm has to be **overwritten** rather than jumped over, because the handler returns before the
arm runs, which is why the interpreter reads its instructions out of a writable copy in RAM.

The corpus closure is exact in both directions: a flagged conditional is followed by exactly two
instructions and an unflagged one by exactly one, and the list ends there, over 600<!--fact:compare_else_arms--> and
2084<!--fact:compare_one_arm--> instructions with no exception. No list holds two conditionals and no arm is itself a conditional, so
an action list is a straight run with at most one branch at the end of it. 2357 of the 3284<!--fact:compare_arms--> arms are
`0x7F`, a call to another list, which is how a config puts more than one instruction in a branch; 17
are opcode `0x00`, an explicitly empty one. Every flagged instruction in the corpus is a `0x71`, which
is a fact about the corpus and not the format, since one handler serves both opcodes.

**What `6` and `7` are is read**, section 107: the left hand side is **added to** the variable and,
for `7`, negated first and so **subtracted from** it, in both cases clamped to the range base slot 13
states for that variable. Selectors `8` to `15` reach no arm and do nothing. So the eight are six
comparisons and two updates, and the nine uses of `7` are what an arch 8 or arch 12 generator builds
a remainder out of.

The lookup all three of `0x70`, `0x71` and `0x72` index with their low byte is the **state variable
table**, base slot 13. [findings.md](../../docs/findings.md) sections 34, 35, 39 and 107.

#### The arithmetic block `0x65` to `0x6E` is arch 14 only

Not one table across architectures, and the second such structure in the format after arch 12's
`0x3F` band `0xC0`. Arch 9 and arch 12 test every one of those ten opcodes in the same descending
ladder and branch to the dispatcher's exit, so the shift, the boolean operations, the device record
writer and the modulo exist on arch 14 alone. `0x6F` is **not** in the block: it is the same
do-nothing handler everywhere.

The corpus agrees without being asked: of the eleven opcodes `0x65` to `0x6F` exactly two are used
anywhere, `0x6C` and `0x6E`, both arch 14 only. A writer must not emit one for another architecture,
where it is accepted and ignored. [findings.md](../../docs/findings.md) section 107.

**A zero operand to `0x6E`, `0x77` or `0x78` is defined rather than an error.** The division loop runs
sixteen iterations whatever it is given, so a divisor of zero returns `0xFFFF` from `0x77` and the
dividend itself from `0x6E`. Nothing traps and nothing hangs.
