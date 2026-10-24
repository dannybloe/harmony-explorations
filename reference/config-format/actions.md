# Actions

What a Harmony does when a key is pressed is written in a small instruction language. An **action list**
is a short program: a count and a run of three byte instructions, each an opcode and a sixteen bit
operand. A key press, a state variable changing value, a timer running out and the firmware's own events
each queue an instruction, most often a call of a list, and the remote runs what is queued one instruction
at a time from a queue of forty.

The instructions do a handful of things: send an infrared code, wait before the next code to a device, call
another list, write or test a state variable, enter a screen, look a value up, start a timer, sound a tone.
The variables, value maps and timers they work on are [state.md](state.md); the screens they enter are
[screens.md](screens.md); the codes they send are [the infrared records](infrared-records.md).

This page describes base slot 10, which holds the lists, then the queue that runs them, then each
instruction, and last the interpreter as the firmware implements it.

## Base slot 10: action lists

Each entry addresses an action list, and a list is[^s17]:

```
+0x00  u8    count
       { u16 operand; u8 opcode }[count]
```

So a list occupies `1 + 3 * count` bytes, and the lists are packed back to back: in every configuration
measured, all but exactly **four** consecutive table entries sit exactly `1 + 3 * count` apart[^s17].

| sample | lists | instructions | packed pairs |
|---|---|---|---|
| Harmony 700 user configuration, arch 14 | 8037 | 19651 | 8032 of 8036 |
| Harmony 600 user configuration, arch 14 | 4955 | 12194 | 4950 of 4954 |
| Harmony One user configuration, arch 12 | 4277 | 11640 | 4272 of 4276 |
| Harmony 880 class configuration, arch 8 | 1318 | 3311 | 1313 of 1317 |
| Harmony 525 configuration, arch 9 | 487 | 1043 | 482 of 486 |

The four exceptions per configuration are not noise. The lists are packed into exactly **five contiguous
runs**, so there are four places where the next list is elsewhere entirely; each of those gaps is tens of
kilobytes, never an off by one[^s17]. That agreement is what makes the reading believable rather than
merely consistent: the addresses come from the pointer table and the counts come from the lists, two
unrelated parts of the file describing the same layout. On the Harmony 525 an independent decompiler of the
format reports the same figures, 487 lists with 482 of 486 packed[^s17].

### `0x7F` calls a list by its index

Confirmed on arch 14 from the operand ranges rather than from the firmware[^s26]:

| | Harmony 700 | Harmony 600 |
|---|---|---|
| uses | 2795 | 1465 |
| distinct operands | 1576 | 834 |
| operand range | 52 to 7655 | 23 to 4755 |
| action lists in the configuration | 8037 | 4955 |
| the five runs end at index | 17, 4323, 5147, **7655**, 8036 | 11, 2721, 3154, **4755**, 4954 |

Every operand is a valid index into the table, and the largest is **exactly the last index before the final
run**, on both configurations, at two different values. Operands never reach into that final run at all:
381 lists on the Harmony 700 and 199 on the Harmony 600 are addressed by the table and never named by a
`0x7F`[^s26]. That is a boundary landing on a structure derived from a different part of the file, twice,
which is what makes it a reading rather than a range that happens to fit. An independent decompiler of the
format reads `0x7F` the same way on arch 9 (Harmony 525)[^s26].

**The final run is the mode pages' lists**, which base slot 8 holds. Base slot 8 holds a `u16` reference to
**every** list in the final run and to no list outside it: 381 references covering 7656 to 8036 on the
Harmony 700, and 199 covering 4756 to 4954 on the Harmony 600, a bijection[^s26]. Base slot 8's layout is
read, a leading list and then the mode pages' tagged lists, [Base slot 8](modes-and-keys.md#base-slot-8-the-screen-keys-bindings).

### Every place that names a list, and the lists nothing reaches

Confirmed on arch 14 (Harmony 600, 650 and 700), 22 compiles. A list's index is written at ten kinds of
place, each the `u16` operand of a `0x7F`: an action list's own call; a tagged list's entry, in a mode's key
map, a page list, a page list's second copy and a base slot 9 entry; a timer's instruction at record offset
4; a state transition's at value offset 5; an instruction a screen program queues with opcode 17, operand at
its offset 1; a number sender's three instructions at offsets 5, 8 and 11 and its digit tables; and base
slot 8's leading list[^s362]. `listCallSites` enumerates them and `checkRenumbering` holds a renumbering of
base slot 10 to all of them. Every list a screen program queues is named by that one instruction and by no
other holder, and a page list and its copy hold the same lists, many of them at different table entries, 426
of 700 places on one Harmony 650 configuration. Number senders' places occur on 3 of the 22[^s362].

Lists nothing reaches through any of these, following calls: 126 to 392 per Logitech compile, 6528 lists and
48801 bytes over the 22, none below the wiring's front. Dropping them all and renumbering changes nothing
`compareViews` reads and passes `checkWiring`, `checkScreenRecords` and `checkScreenTexts` on all 22 and
`checkFirmwareScreens` on the 21 it reads[^s362].

## The action queue holds forty instructions

**A list is not interpreted in place.** It is spooled whole into a ring of 120 bytes, which is exactly forty
three byte instructions, and the main loop then executes one instruction and rotates whatever that
instruction pushed from the tail of the ring to its head. So a `0x7F` runs its sublist **next** rather than
after everything already queued, the ring holds the call stack, and its depth is bounded by nesting rather
than by a list's length[^s238]. Read in the firmware of arch 12 (Harmony One), arch 14 (Harmony 600, 650 and
700) and arch 9 (Harmony 525)[^s238][^s254].

**Every push into a full ring is discarded with no error.** All three push routines test the count first and
return, and the two that report anything are called from code that ignores the answer. The ring is shared: a
key press, a state change, a display band announcement and an action queued by the host over USB push into
the same forty slots a running activity occupies[^s238]. On arch 14 the host queues one through command
state `0x34`[^s326].

So a configuration states an implicit demand, the deepest its own lists go, and a configuration whose demand
exceeds forty is one the remote accepts and silently does less than[^s238]:

| | deepest run of any list |
|---|---|
| the configurations carrying a long hand authored sequence or fifteen devices | 35 |
| every other Harmony One configuration | 22 |
| Harmony 700 | 18 |
| Harmony 890 and Harmony 600 | 14 |
| Harmony 880 and 885 | 13 |
| Harmony 525 | 9 |

**On the Harmony 525 the ring's three constants close on each other**: its base, its end and a wrap constant
of `0x78`, which is forty instructions, read on an architecture with a different register map from the
Harmony One's, so forty is measured twice with nothing in common[^s254][^s255]. The addresses are in
[the Harmony 5xx memory page](../architectures/harmony-5xx/memory.md).

Nothing measured overflows, so forty is a limit for what a writer produces rather than a description of the
configurations. `packages/codec/src/queue.ts` computes it and `assertQueueFits` refuses; the figure it reports
follows `0x7F` only and is therefore a lower bound, since a write to a state variable also pushes[^s238].

## A sequence is one action list of calls and per device pauses

A sequence is what a person builds in Logitech's software as "press these commands with these pauses
between them", bound to one key or screen button. Logitech's compiler writes it as one list. Confirmed on
arch 12 (Harmony One) from four compiles of one account holding the same two sequences, five of each
compile's six lists reproduced instruction for instruction from the account's statement of their
steps[^s327]; on arch 14 from a Logitech compile for a Harmony 650 holding one sequence, for the shape, the
pause's devices and order, and a 20 second pause as one `0x7C`[^s343], and from a second on the same model
for the screen copy and the record a command sends[^s349]. The send's quantity is still inferred on arch
14[^s327].

On a Harmony 650 the composed form runs as written: one press sent the three commands with the two pauses,
2 and 20 seconds, between them[^s342]. **A pause holds every device it names, and so the whole activity**: a
key pressed during the 20 second pause, Volume Up to the receiver, was sent only when the pause ended[^s342].

| step | what a list holds |
|---|---|
| a command | one `0x7F` call of that command's send list `{0x7D, 0x7C}`, whose `0x7C` is the device's **inter key delay** in tenths, so a device at 200 ms calls lists at 2 where its device mode keys call lists at 1[^s327]. The send is a single block record of its own where the key's is two blocks |
| a pause | one `0x7C (group << 8) \| tenths` per device the **activity** switches on, in the order its start switches them on, whatever device the neighbouring steps send to. Four of four compiles, three of them with the devices renumbered[^s327] |
| a pause of 20 seconds | one `0x7C` of 200 per device, not runs of 100[^s327] |
| two pauses in a row, and a pause at the end | kept as written, not merged[^s327] |

**The record a sequence's command sends.** On arch 14, measured on the Harmony 650 alone, it is the key's
**one block copy**: its first block less the opening silence, two words of 50 ms on all 407 two block records
of the Harmony 650 compiles measured, at the same carrier, with no held block and no tail. It is the group's
own copy where the configuration holds one, which one Logitech compile holds for 97 of its 407 two block
records and for none twice, and otherwise one the compiler adds to the group, numbered among the group's
records[^s349]. `composeSequence` makes the same record, appended at the group's end, and on arch 12 sends the
record named. A single block copy opens on arch 12 (Harmony One) with its device's delay between devices, 500
or 1000 ms, and on arch 14 (Harmony 600, 650 and 700) with no silence, where the wait is the delay step
below[^s337].

* **One send list per distinct command**, shared by every step and every copy that sends it[^s327].
* **One copy of the list per binding.** On arch 12 a screen button's copy opens with the click
  `0x75 0x0FCA` and has the page's second copy; a key's copy has none[^s327]. On arch 14 the screen copy is
  the key's, no click, and the page's second copy is a second list of the same body, seen on the Harmony
  650[^s349].
* **On arch 14 every send list opens with its delay step**, and a send list a sequence needs that the compile
  lacks, a code with no list at the quantity asked for, is three lists: the send, its private load, and its
  private condition calling the device's one shared delay list[^s287].
* **A copy can carry one extra call at the front**, the command the same key sent before the sequence was
  bound to it. Not composed[^s327].
* **A sequence inside an activity's start does not exist**: Logitech's schema gives an activity's enter
  actions as a command, a channel or a delay, and no compile holds one[^s327].
* **The limit is the action queue**, `assertQueueFits`: a sequence is spooled whole, so 11 commands and 14
  pauses on a three device activity is 53 instructions, past the forty, inside the 25 step limit Logitech's
  editor states. `composeSequence` refuses it[^s327][^s238].

## Sending, and waiting for a device

### `0x7D` sends an infrared code

Confirmed on 15<!--fact:user_configs--> user configs across four architectures. The operand is
`{ u8 group; u8 index }` into base slot 5's table of infrared records, and **the set of distinct operands is
exactly the set of valid `(group, index)` pairs**: every record is reached and nothing outside the table is
named, 4147<!--fact:ir_references--> records and 4147<!--fact:ir_references--> distinct operands over the
15<!--fact:user_configs--> user configs. Onto rather than one to one, since a record can be sent from more than
one list[^s33].

`0x7D` appears in exactly one list shape per configuration, `{0x7F, 0x7D, 0x7C}` on arch 14 and
`{0x7D, 0x7C}` on arch 8, 9 and 12, and in all 4267<!--fact:send_lists--> of those lists the `0x7C` operand's
high byte equals the `0x7D` operand's[^s33]. So the grouping is shared between the infrared table, `0x7C` and
`0x7D`.

**A writer must emit the pair, and a bare send is not a smaller version of it.** A list of `0x7D` alone sends
from a key press and sends **nothing** when an activity's state transition runs it, and adding the `0x7C` for
the same device fixes it[^s278]. So the shape above is a rule and not a habit. Measured on arch 12 (Harmony
One) only; the firmware's reason is unread. On arch 14 every send list also opens with a `0x7F`, a delay step
of three lists, which the composer emits[^s287].

**The `0x7C` beside a send is a count of tenths, not an identifier.** It takes seven values across the
configurations, `0, 1, 2, 3, 4, 5, 10`, and is 1 in most sends. An identifier would have to separate the
records of a group, the largest group holds 111, and the firmware caps this field at 100[^s140]. On a device
freshly added from Logitech's catalogue the value is one of three, measured on 18 device instances of six
arch 14 compiles: 1, the catalogue entry's `interKeyDelay` in tenths, or its `inputDelay` in tenths, which adds
a value of 20 the user configurations do not hold. Every command has a list at 1. The power transitions'
sends are at `interKeyDelay`; on seven of the instances so is a second, uncalled list for each digit 0 to 9,
which the Barco 6300 and the Pioneer DEH-P47DH do not get at the same `interKeyDelay` of 5; and on three a
second list for some input commands is at `inputDelay`, which four others with input commands do not
get[^s320]. What decides the digit and input copies is not established. A device in a user configuration may
carry delays its owner edited: one Harmony 650 configuration has 10 lists at 4 on a device the catalogue
states with an `interKeyDelay` of 1[^s320].

On arch 16 (Harmony 300 and 350) the cover is exact rather than onto: every record is sent and no two sends
name one record, [the architecture's memory page](../architectures/harmony-300-350/memory.md)[^s261].

Read with `gspm.ir_reference` and `gspm.ir_references`.

### `0x7C` is a per device delay in tenths of a second

Confirmed on four architectures and on two firmware images. The operand is `{ u8 group; u8 value }`: the group
is an infrared group, and in 21882 uses across twelve containers it is always one the configuration's infrared
table has[^s70]. The value is 0 to 100 in those twelve, and Logitech's compiler writes 200 in one instruction
for a sequence's 20 second wait on the Harmony One, twelve times in one configuration[^s327].

**It is a delay, in tenths of a second.** Logitech's service compiled a configuration for the same three
devices twice, once for a Harmony One and once for a Harmony 600, and arch 14 states a device's power on delay
in a state variable whose unit its own screen spells out in tenths. The two agree device for device, 3 of 3,
so the operand is tenths of a second and 450 is 45 seconds[^s235]. Where each architecture keeps a device's
power on delay is [state.md](state.md#a-devices-delays): on arch 8, 9 and 12 it is one of these
instructions, at the top level of the list a device's `Power` variable runs on its 0 to 1 transition, where the
nested list that sends the code carries its own `0x7C` of value 1, so a reader must stay at the top level.
`powerOnInstructions` in `packages/codec`.

**How the firmware queues it.** `0x7C`'s handler is `0x7D`'s handler with one bit set: `0x13102` against
`0x130E0` on the Harmony 700, `0x26F96` against `0x26F74` on the Harmony One, sharing a worker. Both hand the
operand to the same infrared queue, a circular buffer of 30 bytes holding `{ u8 tag; u8 value }` entries where
the tag is `kind << 4 | group`; `0x7C` sets bit 6 of the group byte, which marks the entry as a quantity
rather than a send, and asks for priority 1 where `0x7D` asks for 2[^s70]. A quantity folds into the last entry
of the queue when the tag matches: the larger value wins and the smaller is dropped. **The fold is refused
when the queued value is already 100**, which pushes a second entry instead, and that is what makes a quantity
above 100 expressible at all[^s70]. The fold stops at 100 and does not cap a single instruction, and one instruction above 100 is waited in
full: a pause of one `0x7C` of 200 per device held a Harmony 650 for its 20 seconds, [above](#a-sequence-is-one-action-list-of-calls-and-per-device-pauses)[^s342].
Arch 12 (Harmony One) is not measured for this[^unchecked].

Two rules follow for a writer. No inline power on delay on arch 8, 9 or 12 exceeds 100 and arch 14 spells its
larger ones out, so a delay above 100 is spelled out as the configurations do, while a sequence's pause is
written whole as Logitech's compiler writes it[^s327]. And a configuration can hold at most **sixteen infrared
groups**, because the tag's low nibble carries the group; the configurations top out at seven[^s70].

**How a larger value is spelled out.** On arch 14 every use is in one of two shapes: lists made of nothing but
`0x7C`, or as the third instruction of `{0x7F, 0x7D, 0x7C}`. Other architectures also use it bare, a power on
delay and a sequence's pause among them. In a pure list of length `k`, every operand but the last has low byte
100 and the whole list keeps one group, so it reads as `(k - 1) * 100 + n`[^s29]:

| length | lists per group | remainders | value |
|---|---|---|---|
| 2, 3, 4 | 100 each | 1 to 100 | 101 to 400 |
| 5 | 50 | 1 to 50 | 401 to 450 |

The union is 101 to 450 per group, contiguous, each value once, and 450 is also the top of the delay
variables' range, reached from a completely different direction[^s29].

**What the delay delays is the next code to that same device, and nothing else.** Three consumers drain the
queue and two of them ask one shared helper the same question, "is there an earlier entry naming this
device": the picker emits a send only when the answer is no, and the tick subtracts one from a quantity only
when the answer is no. So the queue is ordered **per device** and never globally. The scan is `0x13204` on the
Harmony 700 and `0x2706A` on the Harmony One, and it reads identically on the two but for the kind mask, `0xF0`
against `0xE0`; the picker is `0x1338A` and `0x2711C`, the tick `0x13706` and `0x27318`[^s236]. Three
consequences:

* **A power on delay an activity cannot show is not a defect.** 37<!--fact:delay_unfelt--> of
  129<!--fact:delay_pairs--> pairs of an activity and a device it switches on send that device nothing after the
  power code, so those delays run down in the background and are never felt; 13 containers hold both kinds at
  once. `powerOnDelayReach` in `packages/codec` is the measurement[^s236b].
* **Two devices never wait for each other.** An activity's power codes go out one after another whatever their
  delays are, because each delay only guards its own device's queue[^s236].
* **The quantity is a duration and not a repeat count**, settled by the tick decrementing it once per tick
  regardless of what is being transmitted, which is independent of the unit's calibration and agrees with
  it[^s236].

Measured on a Harmony One both ways round: raising a television's delay to ten seconds in an activity that sends
it one command changed nothing observable, and raising the receiver's in the same activity, where an input
change follows, moved its gap from about six seconds to about ten[^s236c]. Changing a delay is a same length
edit and still erases two 64 KiB blocks, because the trailer checksum moves with it,
[the container](container.md#the-trailer-checksum)[^s237].

Arch 12 masks the kind with three bits and the device with four, so bit 4 of a tag belongs to neither field,
where arch 14 gives it to the kind. What it is for is not established, and no configuration can say: the group
is what fills those bits and none has more than seven groups, so bit 4 is never set[^s236].

### `0x7A key; 0x6C value` saves a delay on the remote, arch 14

Confirmed on three arch 14 containers. Every `0x6C` is the second half of `[0x7A key, 0x6C value]`, and the list
holding the pair is those two instructions and nothing else, 7552 of 7552. Arch 8, 9 and 12 do not use the
opcode[^s71].

```
0x7A key          load the sixteen bit accumulator with a key naming a device
0x6C value        store value under that key in the remote's settings store
```

**These lists are the save cases of the delay variables' value maps**, [state.md](state.md#on-arch-14-a-delay-saved-on-the-remote-wins):
bit 15 of the value selects the inter device table rather than the power on one, and the key names the
device[^s303]. That is what the counts showed before it was read. 2832 of the Harmony 700's 8037 lists and 1888
of the Harmony 600's 4955 are pairs of this shape; partitioned by the key they form six groups on the 700 and
four on the 600, one per device and as many as there are infrared groups, each of exactly **472** lists, and
every group carries the **same 472 values** once each, identical on both remotes[^s28][^s71]:

```
451 values  0 to 450, contiguous, a power on delay
 21 values  0x8000 to 0x8014, which is 0 to 20 with bit 15 set, an inter device delay
```

So most of an arch 14 configuration's base slot 10 is the complete cross product of its devices with the two
delay ranges, one list per pair[^s28]. Arch 12 has an analogous pair, `{0x75 a; 0x7E b}`, with one group and a
value set that is neither the same size nor contiguous, so the structure does not transfer as it stands[^s28].

## Opcodes below `0x65`: the operand is a second opcode field

**`0x07`, `0x0F`, `0x1F` and `0x3F` never carry an operand below `0xC000`, and every other opcode in the
inventory does.** 14565<!--fact:high_band_uses--> uses of the four, no exception, in
15<!--fact:user_configs--> configs holding 85962 instructions between them[^s31].

| opcode | operands, signed | distinct | uses |
|---|---|---|---|
| `0x07` | `-14` to `-1` | 12 | 4587 |
| `0x0F` | `-192` to `-29` | 10 | 91 |
| `0x1F` | `-6400` to `-241` | 247 | 5329 |
| `0x3F` | `-16384` to `-2510` | 48 | 374 |

The operand is not a reference: it is **the rest of the opcode**. Below `0x65` the dispatcher stops testing the
opcode after five ranges and tests a byte of the operand instead, the **high** byte for opcodes from `0x1F` up
and the **low** byte below it, and `0xC000` is simply the bottom of the lowest band it tests[^s72]. Carry the
operand through unchanged, because renumbering it changes the instruction. No value is ever carried by two of
the four, and the band is not exclusive in the other direction: `0x7A` and `0x79` also reach above
`0xC000`[^s31].

`0x07` and `0x0F` draw from a **vocabulary fixed per architecture**: both configurations of arch 14, of arch 12
and of arch 8 give byte identical sets. `0x07` is `-14, -13, -11, -10, -9, -4, -3, -1` on arch 14 and
`-10, -9, -8, -7, -5, -4, -3, -1` on arch 12 and arch 8. `0x1F` and `0x3F` keep most of their values across a
pair and add configuration specific ones[^s31].

**The four opcodes are floors, not values**: the dispatcher compares the opcode against `0x3F`, `0x1F`, `0x0F`
and `0x07` in descending order, so `0x20` reaches the same handler as `0x1F` and `0x40` the same as `0x3F`.
Every configuration emits only the four canonical values, and a writer should keep to them[^s108]. **Only five
opcodes occur below `0x65` at all**, `0x00`, `0x07`, `0x0F`, `0x1F` and `0x3F`, one per range and each the top
of its own, which is `2^n - 1`[^s73].

**Opcodes below `0x07` do nothing**: the dispatcher returns before reading the operand, and the 3053 `0x00`
instructions all carry operand zero, so they are three zero bytes an emitter must keep[^s72].

**`0x3F` with a high byte in `0xD0` to `0xDF` is a six byte instruction**: the handler pops **one byte** off the
queue per call, three calls, so the instruction's second half is an ordinary instruction read as data, `0x7F` in
55 of its 75 uses, `0x7E` in 19 and `0x72` once[^s73]. Every one of the 75 heads a **two slot list**, so the
whole list is the one instruction, and a reader has to skip the second half rather than report it as an
instruction of its own[^s139]. `takesFollowingSlot` in `packages/codec/src/actions.ts` is the predicate; a byte
level reader still returns both slots, because an emitter reproduces the argument.

### What the bands are

Every branch of both dispatchers is followed to its `RETURN`[^s73]. What a codec needs from them:

| opcode | band, on | what the bands are |
|---|---|---|
| `0x1F` | operand high byte | a register machine: a byte register, a sixteen bit accumulator, load and arithmetic on each, and load and store against the base slot 13 state variable table; timers, band `0xEB` to start and `0xEA` to cancel, [state.md](state.md#base-slot-12-the-timer-table) |
| `0x07` | operand low byte | thirteen operations with no argument: a push and pop stack, timer cancellation, clock and state variable reads |
| `0x0F` | operand low byte | peripherals and the **flash journal**, plus register moves. Its `0xE0` band appends bytes to a region of the external flash[^s108] |
| `0x3F` | operand high byte | four bands, one of which is the six byte instruction above |

Bands the firmware tests and then ignores are part of the specification, not gaps: `0x1F` below `0xE0`; `0x0F`
bands `0xF0` and `0x50` to `0x7F` **on arch 12 and arch 14**; and `0x3F`'s `0xF0` nibbles 3 and 5, which the
configurations use 84 times for the last alone[^s139].

**Three structures here are not one table across architectures**, and a band must not be ported between them:

* **`0x3F`'s lowest band is `0xB0` on arch 14 and `0xC0` on arch 12, and the routines differ**[^s73].
* **The opcode block `0x65` to `0x6E` is arch 14 only**, below[^s107].
* **`0x0F`'s bands differ on arch 9 (Harmony 525)**: the band at `0x60` is a real arm there and inside the no-op
  range on arch 12 and arch 14, the band at `0x40` is the reverse, `0xD0` is tested and ignored on arch 9 alone,
  `0x90` is gated on a port bit that no other ladder tests, and the ignored bands there are `0xF0`, `0xD0`,
  `0x70` and everything below `0x60`[^s139].

**`0x1F` band `0xFC` is how the firmware raises its own events.** The dispatcher's arm for it does nothing, and
the instruction never reaches the dispatcher: the fetch tests for opcode `0x1F` with operand high byte `0xFC`
first, on all four architectures, and delivers the low byte to the innermost active handler that accepts it
instead. No configuration emits one[^s104].

### Arch 9 re-validates the configuration on `0x1F` with operand high byte `0xC0` to `0xCF`

**Read on arch 9 (Harmony 525) only.** An instruction of opcode `0x1F` whose operand's high byte is `0xC0` to
`0xCF` makes the remote validate its containers again and write the verdict the status screens are chosen
by[^s255]. **Neither other architecture has it**: on arch 12 (Harmony One) the re-validation runs from a cable
transition and on arch 14 (Harmony 600, 650 and 700) from a poll, both the firmware's decision rather than the
configuration's[^s251][^s252]. So this is the only place in the format where a configuration can ask a remote to
re-check itself. **No configuration emits one**, and a writer has no reason to[^s254]. How the firmware decodes
it is [the Harmony 525's firmware](../architectures/harmony-5xx/firmware.md#re-validation-from-an-action-list).

### Arch 12's `0x3F` band `0xC0` resolves by selector

On arch 12 (Harmony One) the operand of a `0x3F` instruction in band `0xC0` carries a five bit selector, and the
fifteen values the handler accepts set the display's light level and initialise a device on the remote's I2C bus.
Every configuration carries the same 106 of them, the compiler's fixed initialisation[^s102]. The selectors,
what each does and why a configuration that omits them leaves that device disabled are
[the Harmony One's firmware](../architectures/harmony-one/firmware.md#the-0x3f-band-0xc0).
`actions.BAND_3F_C0_SELECTOR` extracts the selector and `actions.reading` resolves the instruction.

## State variables

### `0x80 | n` writes state variable `n`

Confirmed on twelve containers across four architectures, 3011 uses. The dispatcher clears bit 7 and hands the
instruction to one routine, which indexes the base slot 13 table and writes the operand into it[^s73].

```
opcode  0x80 | index      index into base slot 13, 0 to 0x7F
operand the value
```

The **width comes from the table**, not from the instruction: an index below base slot 13's `narrow` count stores
one byte and the operand's high byte is discarded. Two closures: no instruction names a variable the table does not
have, and **none of the 2947 narrow writes carries a high byte**, which is the one an emitter has to respect[^s73].
`0x1F` bands `0xEE` and `0xED` reach the same store with the index in the operand instead, so an index above `0x7F`
is reachable only through those[^s73]. What a write then fires is
[state.md](state.md#which-transitions-a-write-fires).

### `0x70` and `0x71` test a variable, `0x72` maps one

`0x71` performs one of **eight operations on a state variable**: the operand's low byte indexes it, the low nibble
of the high byte selects the operation, and the left hand side is a byte variable. `0x70` is the same eight with
the accumulator as the left hand side, and `0x72` maps a variable's value through a base slot 14 record, low byte
the variable and high byte the record, [state.md](state.md#base-slot-14-the-state-value-map)[^s34][^s107].

The selector is `0` equal, `1` not equal, `2` greater, `3` less, `4` greater or equal, `5` less or equal, and
**`6` and `7` are not comparisons**: the left hand side is **added to** the variable and, for `7`, negated first
and so **subtracted from** it, in both cases clamped to the range base slot 13 states for that variable. Selectors
`8` to `15` reach no arm and do nothing[^s107]. **`0x71` uses exactly `0` to `5` and nothing else**, over
2477<!--fact:compare_71_uses--> uses in 15<!--fact:user_configs--> configs, and `0x70` uses `0` to `3` and also
`7`, nine times, which is what an arch 8 or arch 12 generator builds a remainder out of[^s34][^s107].

**Bit 15 says how many arms the conditional has.** The handler tests it after the comparison, on all seven
firmware images across four architectures, and with the bit set a comparison that comes out **true** zeroes the
three bytes two slots ahead in the interpreter's queue, which opcode `0x00` makes a no-op[^s140]:

```
+0x00  u8   opcode, 0x70 or 0x71
+0x01  u16  operand:
             bits  0 to  7   the base slot 13 state variable index
             bits  8 to 11   the operation, 0 to 7 above
             bits 12 to 14   read by nothing, zero in every instruction
             bit  15         set: the next two instructions are the two arms
                             clear: the next instruction runs only if the comparison holds
```

A false comparison always skips the next instruction by fetching its three bytes and discarding them, so the
untaken arm of a two armed conditional is cancelled in whichever direction it falls. The untaken arm has to be
**overwritten** rather than jumped over, because the handler returns before the arm runs, which is why the
interpreter reads its instructions out of a writable copy in data memory[^s140].

The closure is exact in both directions: a flagged conditional is followed by exactly two instructions and an
unflagged one by exactly one, and the list ends there, over 600<!--fact:compare_else_arms--> and
2084<!--fact:compare_one_arm--> instructions with no exception. No list holds two conditionals and no arm is
itself a conditional, so an action list is a straight run with at most one branch at the end of it. 2357 of the
3284<!--fact:compare_arms--> arms are `0x7F`, a call to another list, which is how a configuration puts more than
one instruction in a branch; 17 are opcode `0x00`, an explicitly empty one. Every flagged instruction is a `0x71`,
which is a fact about the configurations and not the format, since one handler serves both opcodes[^s140b].

### State variables 3, 5 and 6 are the date

`0x07` with operand high byte `0xF8` steps the calendar held in the clock variables, day, month and year. The
firmware defines them; the generator does not assign them, and a writer must not reuse them[^s74]. The clock is
described with the variables, [state.md](state.md#variables-0-to-6-are-the-clock).

## Screens and sound

### `0x73` runs a screen program

**`0x73` runs the base slot 11 screen program its operand's low byte indexes**, so only the table's first 256
entries can be run this way, and the high byte is read by nothing. Read on the Harmony 600, 650, 700 and One
images[^s369]. In action lists it occurs 3927 times over eight containers, all of arch 8, 9 and 12, and nothing
names a program outside the table[^s73b]; an arch 14 configuration issues it from its mode pages, bound to the
event `0x2D`, [the compiler page](../architectures/harmony-600-650-700/compiler.md). The screen language the
programs are written in is [screens.md](screens.md).

### `0x75` sounds a tone

Confirmed on arch 8, 9 and 12, 4380 uses; arch 14 issues it never. The operand is
`{ u8 cycles; u8 half_period }`, the half period in loop iterations of seventeen instruction cycles. At the 4
MIPS the infrared carrier gives that is 4.25 us a step[^s74]:

| operand | cycles | frequency | duration | uses |
|---|---|---|---|---|
| `0x01FF` | 1 | 461 Hz | 2.2 ms | 80 |
| `0x0FCA` | 15 | 582 Hz | 26 ms | 4238 |
| `0x4664` | 70 | 1176 Hz | 60 ms | 56 |
| `0x8C19` | 140 | 4706 Hz | 30 ms | 6 |

The configurations use those four and nothing else. Counting the loop's own overhead moves the highest by about
8% and the lowest by under 1%. **`0x3F` with high byte `0xF3` gates it**: the generator returns without playing
when that byte is zero[^s74].

**On arch 12 (Harmony One) Logitech's compiler clicks before every screen send**, `0x75 0x0FCA` ahead of the
send, a convention a configuration may leave out, [its compiler page](../architectures/harmony-one/compiler.md#the-click-before-a-screen-send)[^s337].
The generator returns only when the 26 ms tone has played, and the send follows two main loop turns later. A
touch reaches the same event poster as a key, and the touch code `0x202` sets the streamer's hold flag as a held
key does[^s337].

## The introduction tour, arch 14

The tour a Harmony 650 shows after its first configuration is started by one list, which Logitech's compiler
writes in one of two forms, shown or skipped; the forms are in
[the compiler page](../architectures/harmony-600-650-700/compiler.md)[^s286]. **Skipping it is replacing the
`0x7E` that enters the tour's first screen with the `0x7F` that runs the tour's exit**, which is the vendor's own
skipped form: same length, the tour's mark still written, so the remote is left in the state a finished tour
leaves[^s286]. A Harmony 650 given the skipped form showed the Remote Assistant screen that follows the tour's exit
after its restart, and no tour[^s286b]. `introductionTour` reports the form and `skipIntroductionTour` refuses a
tour already skipped and a configuration with neither form.

## The interpreter, from the firmware

Read out of two arch 14 images, the Harmony 700 2.8 and the Harmony 600 0.2. This is what the opcodes are executed
by, so it constrains every reading of them[^s34].

An action list is spooled into a **circular queue of 120 bytes, exactly 40 three byte instructions**, and drained by
a separate loop, the same size on both images[^s34]. The host can push into the same queue over USB: on arch 14
through command state `0x34`, a version request with a payload, and not `WRITE_MISC` selector 3, which arch 14 leaves
unhandled[^s326].

The dispatch is a **binary search on the opcode**, not a jump table and not an `XORLW` chain. Its boundaries[^s34]:

| range | handling |
|---|---|
| below `0x65` | a second dispatcher, read in full[^s73]. Five distinct opcodes, 12462 uses |
| `0x65` to `0x7F` | individual handlers, twenty distinct opcodes, 83359 uses |
| `0x80` and above | **one routine**, with bit 7 stripped: a state variable write. 55 distinct, 2603 uses |

Placed by their handlers:

| opcode | meaning |
|---|---|
| `0x7A` | load the sixteen bit accumulator with the operand[^s34] |
| `0x79` | add the operand to the accumulator[^s34] |
| `0x78`, `0x77` | **multiply and divide**: one 16 by 16 multiply and one restoring division, `0x78` taking the product's low sixteen bits and `0x77` the quotient[^s107] |
| `0x7B` | build an instruction from a runtime byte and push it back on the queue[^s34] |
| `0x71` | **eight operations on a state variable**, a byte variable on the left, above[^s107] |
| `0x70` | the same eight with the accumulator on the left, above[^s107] |
| `0x72` | **map a state variable's value**: low byte a state variable, high byte a base slot 14 record[^s39] |
| `0x6D`, `0x68` | accumulator **shifted left** or **right** by the operand's low byte; a count of zero is a defined no-op. Arch 14 only[^s107] |
| `0x6B`, `0x6A`, `0x69` | accumulator **AND**, **OR**, **XOR** operand. Arch 14 only[^s107] |
| `0x6E` | accumulator **modulo** the operand: the same division as `0x77`, taking the remainder. Arch 14 only[^s107] |
| `0x6F` | **nothing**, with a mechanism: the handler tests the accumulator for zero and both arms return[^s107] |
| `0x6C` | **save a value to the settings store** under the key a preceding `0x7A` loaded, above. Arch 14 only[^s303] |
| `0x67` | the third producer into the infrared queue of `0x7C` and `0x7D`, tag `0x5`; what it means is not established[^s34] |
| `0x66`, `0x65` | **append to the flash journal**: `0x66` the operand's high byte, `0x65` its low byte and then its high byte. Arch 14 only[^s108] |
| `0x76` | **position the serial flash cursor** at the record its operand indexes, remembering the index so a later instruction walks forward; which array it indexes is not established[^s108] |
| `0x74`, `0x75` | **two instructions**: arch 14 issues neither, and the arch 12 dispatcher tests both: `0x75` **sounds a tone**, `0x74` accumulates a digit[^s74] |
| `0x7C` | **a delay before the next code to that device**, tenths of a second, above[^s70] |
| `0x7D` | **send an infrared code**, above[^s33] |
| `0x7E` | enter a mode, the base slot 6 table, [the modes](modes-and-keys.md#base-slot-6-the-mode-table)[^s37] |
| `0x7F` | call an action list, above[^s26] |
| `0x73` | **run the base slot 11 screen program** the operand's low byte indexes[^s369] |
| `0x07` with operand `0xF8xx` | **step the date** held in state variables 3, 5 and 6[^s74] |
| `0x07` with operand `0xFFxx` | **make the next state variable write silent**, one write and no more[^s332] |
| `0x3F` with operand `0xF3xx` | **the sound gate** `0x75` tests before playing anything[^s74] |
| `0x80` and above | **write state variable `opcode & 0x7F`**, the operand its value[^s73] |
| `0x1F` with operand `0xFFxx` | **select the current binding table entry**, low byte the index into base slot 9[^s34] |
| `0x1F` to `0x3E` with operand `0xF3xx` to `0xF6xx` | send a computed number to base slot 16 or 14, from the accumulator or from a byte register[^s39] |

### The arithmetic block `0x65` to `0x6E` is arch 14 only

Arch 9 (Harmony 525) and arch 12 (Harmony One) test every one of those ten opcodes in the same descending ladder and
branch to the dispatcher's exit, so the shift, the boolean operations, the settings store write and the modulo exist
on arch 14 alone. `0x6F` is **not** in the block: it is the same do-nothing handler everywhere[^s107]. The
configurations agree without being asked: of the eleven opcodes `0x65` to `0x6F` exactly two are used anywhere,
`0x6C` and `0x6E`, both on arch 14 only. A writer must not emit one for another architecture, where it is accepted
and ignored[^s107].

**A zero operand to `0x6E`, `0x77` or `0x78` is defined rather than an error.** The division loop runs sixteen
iterations whatever it is given, so a divisor of zero returns `0xFFFF` from `0x77` and the dividend itself from
`0x6E`. Nothing traps and nothing hangs[^s107].

### A configuration cannot choose where the remote writes

`0x65` and `0x66` make the remote write to flash, so an action list can cause a write. **What it cannot do is
choose the address**: the bounds are in the firmware and the configuration is not asked[^s118].

* The append routine reads five values and returns without writing if any of them is zero[^s118].
* It compares the region's limit against the write cursor and against the cursor plus the length, and out of
  range it updates a variable and returns, again without writing[^s118].
* The region itself is computed from the detected chip size and the configuration's own end, not from base
  slot 2's declared reservation[^s108][^s118].

So on arch 14 the reachable target is an append region at the top of the serial flash, and the firmware is
not on that chip at all: it is in the processor's own program memory[^s118]. The architectures whose firmware
shares a flash with the configuration do not implement either opcode, the Harmony One and the Harmony 525
testing both in their ladder and doing nothing[^s107]. No configuration Logitech compiled uses either[^s118b].
This covers the action list language and the screen language, which reaches it only by queuing action list
instructions; that no other route exists is not established[^unchecked].

[^s17]: Measured in configurations. [Section 17](../../docs/findings.md#s17)
[^s26]: Measured in configurations. [Section 26](../../docs/findings.md#s26)
[^s362]: Measured in configurations. [Section 362](../../docs/findings.md#s362)
[^s238]: Read in the firmware. [Section 238](../../docs/findings.md#s238)
[^s254]: Read in the firmware. [Section 254](../../docs/findings.md#s254)
[^s326]: Read in the firmware. [Section 326](../../docs/findings.md#s326)
[^s255]: Read in the firmware. [Section 255](../../docs/findings.md#s255)
[^s327]: Measured in configurations. [Section 327](../../docs/findings.md#s327)
[^s343]: Measured in configurations. [Section 343](../../docs/findings.md#s343)
[^s349]: Measured in configurations. [Section 349](../../docs/findings.md#s349)
[^s342]: Measured on a unit. [Section 342](../../docs/findings.md#s342)
[^s337]: Measured in configurations. [Section 337](../../docs/findings.md#s337)
[^s287]: Measured in configurations. [Section 287](../../docs/findings.md#s287)
[^s33]: Measured in configurations. [Section 33](../../docs/findings.md#s33)
[^s278]: Measured on a unit. [Section 278](../../docs/findings.md#s278)
[^s140]: Read in the firmware. [Section 140](../../docs/findings.md#s140)
[^s320]: Measured in configurations. [Section 320](../../docs/findings.md#s320)
[^s261]: Measured in configurations. [Section 261](../../docs/findings.md#s261)
[^s70]: Read in the firmware. [Section 70](../../docs/findings.md#s70)
[^s235]: Measured in configurations. [Section 235](../../docs/findings.md#s235)
[^unchecked]: Not checked.
[^s29]: Measured in configurations. [Section 29](../../docs/findings.md#s29)
[^s236]: Read in the firmware. [Section 236](../../docs/findings.md#s236)
[^s236b]: Measured in configurations. [Section 236](../../docs/findings.md#s236)
[^s236c]: Measured on a unit. [Section 236](../../docs/findings.md#s236)
[^s237]: Measured on a unit. [Section 237](../../docs/findings.md#s237)
[^s71]: Measured in configurations. [Section 71](../../docs/findings.md#s71)
[^s303]: Read in the firmware. [Section 303](../../docs/findings.md#s303)
[^s28]: Measured in configurations. [Section 28](../../docs/findings.md#s28)
[^s31]: Measured in configurations. [Section 31](../../docs/findings.md#s31)
[^s72]: Read in the firmware. [Section 72](../../docs/findings.md#s72)
[^s108]: Read in the firmware. [Section 108](../../docs/findings.md#s108)
[^s73]: Read in the firmware. [Section 73](../../docs/findings.md#s73)
[^s139]: Read in the firmware. [Section 139](../../docs/findings.md#s139)
[^s107]: Read in the firmware. [Section 107](../../docs/findings.md#s107)
[^s104]: Read in the firmware. [Section 104](../../docs/findings.md#s104)
[^s251]: Measured on a unit. [Section 251](../../docs/findings.md#s251)
[^s252]: Read in the firmware. [Section 252](../../docs/findings.md#s252)
[^s102]: Measured in configurations. [Section 102](../../docs/findings.md#s102)
[^s34]: Read in the firmware. [Section 34](../../docs/findings.md#s34)
[^s140b]: Measured in configurations. [Section 140](../../docs/findings.md#s140)
[^s74]: Read in the firmware. [Section 74](../../docs/findings.md#s74)
[^s369]: Read in the firmware. [Section 369](../../docs/findings.md#s369)
[^s73b]: Measured in configurations. [Section 73](../../docs/findings.md#s73)
[^s286]: Measured in configurations. [Section 286](../../docs/findings.md#s286)
[^s286b]: Measured on a unit. [Section 286](../../docs/findings.md#s286)
[^s37]: Measured in configurations. [Section 37](../../docs/findings.md#s37)
[^s332]: Read in the firmware. [Section 332](../../docs/findings.md#s332)
[^s39]: Read in the firmware. [Section 39](../../docs/findings.md#s39)
[^s118]: Read in the firmware. [Section 118](../../docs/findings.md#s118)
[^s118b]: Measured in configurations. [Section 118](../../docs/findings.md#s118)
