# State

### Base slot 2: the log area

**Confirmed on 19<!--fact:containers--> containers across four architectures**, and on the one arch
12 image, which is the only firmware that reads it.

Not a pointer to a structure: three numbers reserving a region of flash above the config that the
firmware appends to and never erases.

```
+0x00  u16  capacity        u24 on arch 12, where the section is nine bytes
+0x02  u24  start           the first byte of the region
+0x05  u24  limit           one past its last byte
```

`limit - start == capacity * stride`, exactly, in every container, with one stride per
architecture: **8 bytes on arch 8, arch 9 and arch 14, and 1 on arch 12**. The region always sits
above the config's `end_addr`, and `limit` is always a round flash boundary: `0x080000`,
`0x100000`, `0x200000` or `0x400000`, except arch 8, which stops 8 KiB short of 2 MiB at
`0x1FE000`.

| container | arch | capacity | start | limit |
|---|---|---|---|---|
| 700, 600 | 14 | 16384 | `0x1E0000` | `0x200000` |
| all three safe mode | 14 | 16384 | `0x0E0000` | `0x100000` |
| One, both | 12 | 16 | `0x3FFFF0` | `0x400000` |
| 525 | 9 | 8192 | `0x070000` | `0x080000` |
| all four 880s | 8 | 15360 | `0x1E0000` | `0x1FE000` |

**Logitech's own client declares the arch 14 region and it is the safe mode row exactly**, section
206: its per architecture constants give a user logging base of `0x0E0000` and a size of `0x20000`,
which is `0x0E0000` to `0x100000`. So that row is corroborated by a route with nothing in common with
the corpus. It says nothing about the user configuration row one megabyte above it, and which of the
two a remote wants is open; a writer reproducing this section copies what the input declared.

The arch 12 firmware scans the region at boot, at `0x2DB4C`, for the last byte that is not `0xFF`,
and appends after it, so the write position is recovered from the erased pattern rather than
stored. The append routine at `0x2DC0A` writes one byte per call, refuses an address outside
`[0x040000, 0x400000)`, and refuses once `capacity` units are used up. Its only callers are five
branches of the same operand ladder that drives timers, operand high `0xE1` to `0xE5`, appending
one to six bytes each.

**On both bench Harmony Ones this region is already full, so the facility is dead**, measured on
10 August 2026. `0x3FFFF0` to `0x400000` reads `00 ff` repeating with the last byte `0x00`, in the
64 KiB block that has held that pattern on both units since before this project read them. The boot
scan therefore recovers the position after offset 15, which is `0x400000`, and the append's own upper
bound rejects it by zeroing the remaining count. **A writer cannot use this region without erasing a
64 KiB block inside the config region first**, which the rails refuse.

Read with `gspm.log_area`; `gspm.log_reference` names the append case an instruction selects.
[findings.md](../../docs/findings.md) sections 47 and 111.

**Built**, by `buildLogArea` in `packages/codec/src/firmwaresections.ts`, from the per architecture table
`LOG_AREAS`, which holds the user configuration rows of arch 12 and arch 14: byte for byte on all 19
distinct Harmony One compiles and on the thirteen arch 14 compiles section 312 lists, the Harmony One's
with its `u24` capacity, `todo-compile-one.md` 6.4. The safe mode row is not built.

**Case 3's record is a timestamp**: its six bytes reversed are year, month, day, hour, minute and
second, taken from the clock's broken out fields at data memory `0x108` to `0x10E` on arch 12. The
other four cases are shapes without meanings. The stride of 8 on the three architectures whose
firmware never reads this section is *not established*. **No config in the corpus appends to it**, so a
writer that copies these three numbers unchanged is doing everything the corpus does.

On arch 14 every user configuration states `16384, 0x1E0000, 0x200000`, 13 of 13, and `buildWiring`
writes it, [findings.md](../../docs/findings.md) section 347.

### Base slot 4: the firmware event map

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures**, and the same shape in every one.

```
+0x00  u24  fallback        used when no key matches
+0x03  u16  count           thirty, always
+0x05  { u8 key; u24 value }[count]
```

Keys are `0` to `29`, contiguous. Values are `N` to `N + 29`, contiguous, and the fallback is `N`.
Only `N` varies: 19 on the 700, 14 on the 600, 11 on the 525, 10 on both Ones, 4 on all four 880s.

The firmware raises an event by loading a literal key and looking it up here, and the value goes to
the same register opcode `0x7E`'s operand goes to. So the two share a numbering space, and the
block `N` to `N + 29` is **reserved**: across 15<!--fact:user_configs--> user configs `0x7E` names 1593<!--fact:event_map_operands--> distinct
operands and lands inside the block on the two Harmony 525 configs and nowhere else, at operand 25
in both. The exception was one config when the population was ten, so widening it made the
counterexample a pair rather than a singleton, which is a stronger statement about arch 9 and a
weaker one about the reservation. On the programmed Harmony One the config uses 0 to 9, the
block takes 10 to 39, and the config resumes at 40, abutting on both sides.

Read with `gspm.event_map`.
*What the thirty events are, and what the numbering space counts, are not established.*
[findings.md](../../docs/findings.md) section 36.

**This section is 125 bytes**, not the 419 to 1532 that the distance to the next pointer reports.
See the warning under "Sections" about what that distance means.

**`N` is the count of the firmware's own screens at the front of base slot 6**, 14 on the Harmony 600 and
650 and 19 on the Harmony 700, and the key is a status code: mode `N` draws "Go to Website to update
settings" and `N + 26` "Configuration Corrupted", section 249's codes 0 and 26, 13 of 13. Generated by
`buildWiring`, [findings.md](../../docs/findings.md) section 347.

**On the Harmony 600 and 650 only the status screen routine interprets it**, for five codes, and none of
those is drawn from the configuration as far as the code reads: four are asked for with the built in
status screens selected, and "Application Terminated" sits behind a state the main loop never leaves
there. [findings.md](../../docs/findings.md) section 355.
### Base slot 14: the state value map

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures.**

```
+0x00  u8   count
+0x01  u24  address[count]
```

and at each address

```
+0x00  u8   stepped over by the firmware; 2 in every record in the corpus
+0x01  count                 u16 on arch 14, u8 on arch 8, 9 and 12
+...   { u16 value; u24 address }[count]
+...   u8   count of the range table
+...   { u16 low; u16 high; u24 address }[count]
```

The **count width differs by architecture and the key width does not**. That is read off the
layout: compute a record's length under each of the four combinations of widths and ask whether it
lands on another record's start. One combination per architecture accounts for at least four fifths
of the records and the other three are all behind it.

Opcode `0x72` names both halves of this at once. Its operand's **low byte is a state variable
index** into base slot 13 and its **high byte selects the record** here. The record is searched for
the variable's value, then, if nothing matched, for a range containing it; the bounds are inclusive.
Both operand bounds hold in all fifteen user configs and neither is ever overrun.

**The payload is a flash address, not an instruction.** All 15594<!--fact:value_map_targets--> targets across 15<!--fact:user_configs--> configs land
inside their own container. The firmware follows one and hands it to a **second interpreter**, a
one byte opcode language with ten opcodes and a terminator, which is not the action list language
and is not decoded. Base slot 6's mode switch reaches the same interpreter.

Records share their tails: a few addresses point into the middle of a longer record rather than to
a record of their own, so two records can overlap by design.

The range table is empty in eleven of the fifteen configs; the other four carry one range each.

**The cases are stored in a hash order, on arch 14**, section 319: ascending by
`k ^ (k >>> 4) ^ (k >>> 7)`; 0 to 15, 17, 16, 19, 18, 20 for 0 to 20. All 410 records with two or
more cases over the thirteen arch 14 compiles fit, but **two orderings pin it**: the 332 that are not
ascending hold only the key sets 0 to 20 and 0 to 450, 166 records each, each set in one identical
order, and the other 78 have every key below 16, where the hash is the key itself. The firmware's exact
match walks the cases in stored order and leaves at the first equal key, trying the range table only
when none matched, `0x19A2E` on the Harmony 600's 0.2 image and `0x1B30A` on the Harmony 700's 2.8, so
the order changes nothing on the remote and a writer reproduces it to match the compiler byte for byte.
That the generator iterated a Java hash map is an inference from the formula, which is that map's
supplemental hash in Java 6 and 7. **The map's table size is unknown**, and Java 6 and later Java 7
updates grow it differently, so a key set the corpus does not hold may come out in another order: keys
2 to 13 and 16 would put 16 first under the second rule. `compilerCaseOrder` therefore accepts only key
sets all below 16 and the runs 0 to 20 and 0 to 450, and refuses the rest.
**Undecided on arch 8, 9 and 12**: their 65 records of two or more cases, over the Harmony One's four
containers, the Harmony 525's two and the six arch 8 ones, all have keys below 16, the largest 9, so
they are ascending and fit either rule. Arch 10 is not scored, having no reader here.
`compilerCaseOrder`.

**An activity's working screen, arch 12 (Harmony One)**, section 279. One record here is keyed by
`CurrentActivityState` and holds, per activity, the two instruction screen program
`17 lo hi 0x7E; 0`, entering that activity's working screen, plus one case for the idle value that
enters no screen. It is found by walking from the left bottom key of a device mode page, the
"Activities" key, through `0x7F` and `0x72`; its index differs per configuration, 3, 5, 11 or 13 on
the thirteen measured, so it is never a constant. The activity's enter list opens with a `0x7E` into
a different mode, its start up screen, on 60 of 60. Unchecked on every other architecture.
`activityScreens` in `packages/codec/src/inventory.ts`.

**The all off list**, section 280. A base slot 10 list of state writes only, each a 0 into a
device's `Power` variable, reached from the `idle` base slot 9 entry's enter list through `0x7F` and
the `0x7F` a base slot 14 case queues. Exactly one on each of the eleven user configurations with two
devices or more, arch 8, 9, 12 and 14, naming every `Power` variable; none where there is one device.
The walk is from `CurrentLocation`'s record, whose one case, value 0, queues the call, so the switch off
is conditional on it. Every activity's enter list writes every one of those variables, 1 or 0,
directly or through the lists it calls, up to three calls down. `allOffList`.

**With one device there is no list, and the case writes it**, section 376: on all four Logitech built
configurations with one device, the Harmony 525's two reads and three of the Harmony One, the record's one
case, for 0, queues the write of 0 into that device's `Power` variable itself, a five byte case program.
A configuration of ours with no device has the record with no case. `joinPowerOff` gives the first device
the case and turns it into a call to a new list of both writes for the second. No Harmony 600, 650 or 700
compile with one device is in the lab, so that model's form is the other architectures'.

**On arch 14 every record leads with 2 and has no range table**, 501 of 501 over the thirteen compiles,
and no address points into another record, so `buildValueMap` writes each record whole from its cases.
[findings.md](../../docs/findings.md) section 324.

Read with `gspm.value_maps` and `gspm.value_map_reference`. [findings.md](../../docs/findings.md) section 39.
### Base slot 15: the parameter block

**Confirmed on the twelve containers whose architecture has a firmware reading of the guard**, six
arch 12 (Harmony One) and six arch 14 (Harmony 600 and 700), and every length claim below is a literal
in the firmware rather than a count of what the corpus carries. Arch 8 and arch 9 carry the section and
no image here reads it, so their seven containers are outside the claim.

```
+0x00  u8   count
+0x01  u24  address[count]
```

and at each address a group

```
+0x00  u8   entries
+0x01  u16  value[entries]
```

The groups are laid out in one run immediately before the pointer array. On arch 8, arch 9 and
arch 14 the run is exactly the sum of the groups; arch 12 has twelve more bytes in it, past group 9.

Those twelve are `ff 00 ff 00 00 00 00 00 55 55 55 55` in all six arch 12 containers, no `u24` in any
container names their address, and **the firmware reaches them by overrunning group 9 on purpose**:

| bytes above group 9's first entry | read by | as |
|---|---|---|
| 12 to 15 | `0x249A0` | the fourth pair of device levels, at four bytes a band |
| 16 to 23 | `0x2492E` | a table of two bit fields, four to a byte |

So group 9 is in effect a 24 byte structure whose header declares only its first six `u16` values. A
writer reproduces all twelve bytes; an editor that changed the declared length would move both
readers' targets without any check refusing it. `docs/findings.md` sections 84, 103 and 106.

**Their extent is these offsets and not the distance to the pointer array**, which is a correction to
how a tool should claim them rather than to the reading. The byte accounting attributed them by
position, as the run between the lowest group and the array, from before section 103 read them: that
made the attribution unfalsifiable and it absorbed 8 to 32 bytes of any group whose declared entry
count was damaged, on all four architectures, while still reporting every byte accounted for. Section
139 entry 13.

**The firmware demands the section's count and every group's length.** The count is 9 on arch 14
and 11 on arch 12. Each group is read only when its length matches the number that build expects,
and otherwise the subsystem silently uses constants compiled into the firmware:

| group | arch 14 | arch 12 |
|---|---|---|
| 0 | 1 | 1 |
| 1 | 4 | 6 |
| 2 | 1 | |
| 3 | 4 | |
| 4 | | 6 |
| 5 | 14 | 16 |
| 6 | 14 | 16 |
| 7 | 1 | 1 |
| 9 | | 6 |
| 10 | | 8 |

A blank is a group with no call site on the image that was read, not a length of zero. Arch 8 and
arch 9 are absent because no firmware for either exists here. `gspm.PARAMETER_GROUP_COUNTS` carries
this table and `gspm.parameter_group_lengths_match` checks a container against it.

**A group index is not portable between architectures.** Arch 9's five groups line up with a subset
of arch 12's in a different order, which is unlike every other indexed structure in this format.

What the arch 12 groups hold, from the routines that read them. Every default below is a literal in
the firmware, used when the length does not match:

| group | what it is | the Harmony One's values | default |
|---|---|---|---|
| 0 | the display light fade's per step delay | 44 | 50 |
| 1 | entries 2 to 5 are four display light levels, 0 to 27; entries 0 and 1 are read and discarded | 38, 38, 20, 20, 26, 26 | 9, 16, 24, 27 |
| 4 | three threshold pairs, two apart, turning the four sample sum of analogue channel 1 into a band 0 to 3 with hysteresis | 96, 98, 308, 310, 768, 770 | none |
| 5, 6 | two measurement to level curves over analogue channel 0, eight levels, chosen by the charger input on `PORTB` bit 1: group 6 when it is clear | 3000 to 4051, and 3000 to 4170 | none |
| 7 | a timeout in seconds, handed to the one second scheduler | 0 | 10 |
| 9 | four pairs at four bytes a band, both halves sent to the I2C device at address 0x60 as its registers 2/3 and 4/5; band 3's pair is past the declared entries | 16, 16, 64, 64, 128, 128, then 255, 255 | 64 |

A level above 27 is *silently refused* by the setter, which is a rail: 27 is the number of distinct
`CVREF` voltages the part can produce, and the ladder that maps a level to one is in the firmware.

**Groups 5 and 6 are battery millivolts**, confirmed rather than conjectured. On arch 12 the value
walked against them is `mean * A + ((mean * B) >> 16)` where the mean is eight samples of analogue
channel 0 and `A` and `B` are two `u16` in the remote's own internal page `0xFF`, giving 4.284 mV a
converter count, and the firmware compares the result against the literal 3400. `findings.md`
section 105.

What analogue channel 1 measures is *not established*. Groups 2, 3, 8 and 10 are *not established*. **On arch 14
group 3 is a second light's four levels**, read by a routine built like group 1's light routine, which fills `0xD2F` to `0xD32` where
group 1's fills `0xD2E` to `0xD31` and keeps its state in variable 12 rather than 10; the levels it falls back
to are 3, 5, 10 and 32, group 1's own. Which light is *not established*. `findings.md` section 392.
The thirteen two bit fields are channels of the I2C device at address 0x60, and **which device that
is is not established**: thirteen channels of three states, two eight bit level registers, an enable
pin and no readback, `findings.md` section 106.

**Nothing here is per device**, which is worth stating because the plan asked for it the other way
round. The group lengths are one shape per architecture over containers holding 0 to 7 devices, and
the **values** are shared across containers with different device counts: sixteen containers carry
five distinct value sets, four of them shared by containers whose device counts differ, the widest by
six containers holding 3, 4, 6 and 7 devices. The fifth set is the two Harmony 700 configs, one model
and six devices each, so it is silent rather than contrary. What the values track is the **model**:
the Harmony 600 and the Harmony 700 disagree about their display light levels and their battery
curves and about nothing else. A device's own numbers are state variables in base slot 13.
[findings.md](../../docs/findings.md) section 234.

Read with `gspm.parameter_groups`. [findings.md](../../docs/findings.md) sections 44, 103 and 105.

**Built**, by `buildParameterBlock` in `packages/codec/src/firmwaresections.ts`, from the model's values
and checked against `PARAMETER_GROUP_COUNTS`, refusing a group of another length: the Harmony 600, 650
and 700's are `PARAMETER_VALUES` in `families/four-slot/wiring.ts`, and the Harmony One's are `TOUCH_PARAMETERS` in
`families/touch/parameters.ts`, one set on all 19 distinct Harmony One compiles, group 9's twelve bytes
past its declared entries included, `ff 00 ff 00` and `00 00 00 00 55 55 55 55`. The groups the table
above does not read hold `60`, `80`, `2500, 10980` and `129, 21, 3, 1, 0, 0, 0, 0` (groups 2, 3, 8 and
10) on all 19. Byte for byte on the 19 and on the thirteen arch 14 compiles, `todo-compile-one.md` 6.4.

**On arch 14 the values are one set per model**, 13 of 13: groups 0 to 8 are `44`, `3 5 10 32`, `44`, then
`1 3 5 32` on the Harmony 600, `10 20 8 32` on the Harmony 650 and `3 5 10 32` on the Harmony 700, then
`96 98 308 310 768 770`, group 5's curve, group 6's `2025 2075 2375 2425 2475 2525` and eight of 3300, `0`
and `1800 10980`. Group 5 is group 6's curve on the Harmony 700 and `2025 2075 2100 2125 2200 2525` and
eight of 3300 on the other two. `PARAMETER_VALUES` in `families/four-slot/wiring.ts`, [findings.md](../../docs/findings.md) section 347.

### Base slot 12: the timer table

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures**, with three more as a negative case.

```
+0x00  u8   count
+0x01  u24  address[count]
```

and at each address a seven byte record

```
+0x00  u8   kind, 1 for the one second scheduler
+0x01  u24  duration, in seconds for kind 1
+0x04  u24  the single action list instruction queued when it expires
```

A timer is started by opcode `0x1F` with the operand's high byte `0xEB`, and cancelled by the same
opcode with `0xEA`; the operand's low byte is the index into this section in both. **The set of
indices started is exactly `0` to `count - 1` in every config**, counts from 5 to 30, and no
instruction names a record that is not there. The three safe mode containers carry no records and
issue neither instruction.

The firmware runs at most **four** timers at once, so a config with thirty records describes thirty
possible timers rather than thirty concurrent ones, and starting a fifth is a silent no-op.

**A timer fires exactly one instruction**, not a list. Anything longer has to be a single
instruction that runs an action list, which is what 116 of the corpus's 159 records do. The
scheduled kind also **clamps the duration to sixteen bits**, so a value above 65535 becomes 65535
rather than an error. Both are rails for a writer.

Kind `0` is counted down in software instead and no config in the corpus uses it, so its rate is
*not established*.

**One timer is named: the screen light, on arch 14.** Two timers on every arch 14 user configuration
queue a list opening with `1F E910`, and the lower index of the two is how long the screen stays lit, in
seconds. MyHarmony calls the setting `GlowTime`. *Measured on the Harmony 650 only*, by writing 20 and
10 and timing the screen; on the Harmony 600 the calibration configuration agrees with the saved `GlowTime`,
which is 20 and also its default, and on the Harmony 700 both timers of the pair hold 10, so its pick is
the rule's and *not established*. The two are the arms of one test of state variable 9; when the
other arm is taken is *not established*. Arch 8 and arch 10 carry the same pair, *unmeasured*. `screenLightTimer` in `packages/codec/src/tables.ts`, findings.md section 292.

Read with `gspm.timers` and `gspm.timer_reference`. [findings.md](../../docs/findings.md) section 43.

**Every arch 14 timer but a device's is the firmware's, in a fixed order**, 13 of 13: light off, the
Harmony 700's four cycling frames, the screen light, its tick, the screen light again and the return to
USB Connected, "The firmware's own wiring on arch 14" above. A device's own timer writes 1 into its
`<label>_OnlinePower_2` after 30 or 45 seconds, on 10 of the 13, at index 3, 4, 5, 7 or 9; what decides
its place is *not established*. [findings.md](../../docs/findings.md) section 347.

**On the Harmony One every timer but a device's is one of thirteen on every compile, a three second one on 2
of 19, or a four second redraw timer**, 13 to 20 of those, 19 of 19, one per class of screen (section 430); the
thirteen come in three orders over the 19. "The firmware's own wiring on the Harmony One" above. [findings.md](../../docs/findings.md)
section 410.

### Base slot 16: the number sender

**Confirmed on seven containers, every one made rather than found.** Every found config in the
corpus carries a count of zero here, so for a year the layout came from three firmware images and
nothing else. A configuration with three favourite channels on it was then compiled by Logitech's own
service and every field below sits where the firmware reading put it, byte for byte, section 154;
six more compiles from the same account carry the record too, sections 156, 165 and 174, and the two
implementations are compared on it by the golden vectors.

**This section does not carry every favourite channel.** A channel is sent through here only when its
number survives being written as an integer. One with a **leading zero** takes another route entirely:
its base slot 13 transition runs one base slot 10 list per digit, each sending that appliance's own
digit code, and this section is not involved. Measured on a config authored with `1` and `001`
together, where the two go different ways. So `minimum` below is **not** how a leading zero is
expressed, which is the one thing a reading of the firmware alone would have got wrong about it.
Section 156.

**A record is a method for sending a number, not a number.** Three channels produce **one** record and
three action lists, each loading a constant and handing it to that record. So `count` is the number of
appliances that take a number, not the number of channels.

**A count of zero is not a NULL slot.** A config with no channels still declares this section and
gives it one byte; the one that has them gives it four. So an empty record list and an unreadable slot
are different answers and a reader must not merge them. **Read this section with `numberSenders`,
which uses `countedPointers` and is told the width**, and not with `pointerArray`, which infers the
width from the count and therefore cannot represent an empty array: it answers `undefined` for a count
of zero. That is a property of the inferring reader and not a merge of the two answers, which section
262 recorded the wrong way round before measuring it.

**On arch 16 the group count is the model's stated maximum and not the device count**, sections 264 and
265, which is the one place base slot 5 behaves differently here: it is exactly the device count on 13
of 13 containers on arch 8, 9, 12 and 14, and on arch 16 all three Harmony 350 containers declare eight
groups and both Harmony 300 containers declare four, matching each skin's `MaxDevicesPerAccount`, with
the unused groups empty. So a writer for this architecture allocates the table by the skin.

**Which group a device gets is the device type button it is assigned to**, section 265, measured on the
programmed Harmony 300 by identifying all four of its groups independently in Logitech's device
catalogue: the television is group 0, the set top box 1, the DVD player 2 and the video recorder 3,
which is the order of the four buttons on that remote. It is **not** a position in the archive's name
list, which is alphabetical and disagrees, and the two orderings sections 261 and 263 proposed were
both answering the wrong question. Unconfirmed on the Harmony 350, which has no such buttons: there the
three occupied groups are the reverse of the archive's order, and a device with no infrared codes at
all takes no group.

**And it is populated by a found configuration now, on arch 16**, section 262, where this said every
found config in the corpus carries a count of zero. Danny put five favourite channels on the bench
Harmony 350's set top box through Logitech's service and the remote was read before and after: raw
slot 11 goes from a count of zero to a count of one and no other slot changes that way, which is what
**names** base slot 16 on that architecture. The record is this layout with nothing adjusted, its
three digit tables are distinct and thirty bytes apart, and all thirty entries call lists that send
codes from one group. `flags` is 0 there against the arch 12 sample's `0x04`.

```
+0x00  u8   count
+0x01  u24  address[count]
```

and at each address

```
+0x00  u8   flags
+0x01  u24  base, added to the value before conversion
+0x04  u8   minimum number of digits
+0x05  u24  instruction queued first
+0x08  u24  instruction queued last
+0x0B  u24  instruction queued before the digits when the value is long enough
+0x0E  u24  first digit table
+0x11  u24  middle digit table
+0x14  u24  last digit table
```

Each digit table is ten three byte instructions indexed by the digit. The firmware adds `base` to
the value it is given, converts the sum to packed decimal by subtracting `10000`, `1000`, `100` and
`10` in four loops, and queues one instruction per digit, taking it from the first, middle or last
table according to where the digit sits. `flags` bit 2 makes the prefix instruction fire at a
hundred and bit 1 at ten; with neither, it never fires. Bit 0 makes the prefix consume a digit.

In the one sample the ten instructions of a digit table run action lists that send that television's
commands `0` through `9`, in table order, ten of ten, and the instruction queued last sends its
`Select`. The names come from the catalogue of the account that generated the config, matched by
decoding each stored code into its bit frame, so a table index predicts a word Logitech chose through
a route with nothing in common. The three table pointers are three distinct addresses holding
identical copies; nothing requires that, so a reader must not assume one table serves all three.

`digits` is a **floor** and not a width: the conversion raises it to however many digits the value
needs, and the one sample declares 0. `flags` is `0x04` there, arming the prefix at a hundred while
the prefix instruction is NULL, so the mechanism is switched on and does nothing. **Unconfirmed**:
bit 0, and the bits above 2.

The fourteen bytes read in sequence end exactly where the first of the three fixed pointer offsets
begins, which is the closure for this layout, and the routine is identical on the 700, the 600 and
the One.

Read with `gspm.number_senders` and `tables.numberSenders`. [findings.md](../../docs/findings.md) sections 39,
154 and 156.

### Base slot 13: the state variable table

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures**, and named from the firmware routine that
loads it rather than from what the bytes look like.

```
+0x00  u16  count           how many variables
+0x02  u16  narrow          how many are stored as one byte
+0x04  u16  wide            how many are stored as two bytes; narrow + wide == count
+0x06  u16  narrow again    the same number a second time, purpose unestablished
+0x08  u24  entry[count]
```

`8 + 3 * count` equals the section's length exactly, in all fifteen. Counts run from 21 to 94.

The firmware copies this into RAM as two runs, `narrow` single bytes followed by `wide` pairs, so
**an index below `narrow` is a one byte variable and an index at or above it is a two byte one**.

**Three of the four words are live, and the storage is sized `narrow + 2 * wide` with `count`
playing no part in it**, section 276. `count` limits the boot loop that seeds each variable from its
record and is kept only in a scratch byte, so nothing compares an index against it; `narrow` is the
width threshold; `wide` sizes the storage. Above `narrow + 2 * wide` the firmware **fills every byte
with `0xFE` at each boot**, and because the seeding loop runs first, a variable above the storage is
seeded correctly and then painted over, holding 65278 rather than its record's value, with no error
anywhere. The fill's ceiling is per image rather than per architecture, `0x7F` on the Harmony One,
`0xFF` on the Harmony 700 and `0xC0` on the Harmony 600, and a second arm starts it at the constant 18
under a flags bit that is unread; the fill is unmeasured on arch 9 (Harmony 525). `narrow again` is
fetched and discarded on arch 12 (Harmony One) and arch 14 (Harmony 600 and 700); arch 9 reads it,
section 274. A separate check does compare an index against `narrow + wide`, seven instructions on all
six images in the lab, but its callers are `WRITE_MISC` and `READ_MISC` **selector `0x01`**: a
configuration's own state write reaches the store unchecked, so that bound is not what a writer has to
respect, and a refused read returns 0 rather than an error. The identity
`narrow + wide == count` holds on 19 of 19 containers, which is what makes it enforceable rather than
what proves the bound, since the two are the same number in every one, and
`assertStateTableConsistent` refuses a container that breaks it.

**A composed variable that carries transitions goes in below `narrow`**, section 277, which costs a
renumbering: every variable at or above the insertion point shifts up by one and every reference has
to move with it. The reason is a measurement rather than the firmware, since nothing read so far
branches on the width: 0 of 64 two byte variables in the corpus carry transitions against 91 of 194
one byte ones. A reference sits in an opcode byte or an operand's low byte, in one of three kinds
enumerated by `stateVariableSite`, 8163 of them across the fourteen programmed configs with 0 naming
a variable its own table lacks; a name tree node at level 1 carries one too. **The transition entry's
own leading byte is `0x00` in 569 of 569** and is not an enable bit, which section 277 corrects in
place.

The opcodes that index it are `0x70`, `0x71` and `0x72`, in the operand's low byte. Every index in
every config is below that config's own `count`, and the halves are respected exactly:

| opcode | uses | indices |
|---|---|---|
| `0x71` | 2164 | always below `narrow`, matching a handler that compares a byte |
| `0x70` | 146 | always at or above `narrow`, matching a handler that compares the sixteen bit accumulator |
| `0x72` | 501 | either half |

**Each pointer lands on a record declaring the variable's values.** Nothing states its length, so
the rule is the reader:

```
+0x00  u16  the value the variable holds when the config is generated, section 130
+0x02  u16  max             the highest value this variable takes
+0x04  u16  count           how many transitions follow, not how many values there are
+0x06  u8   unestablished
+0x07       transition[count], eight bytes each
```

and a transition

```
+0x00  u8   zero, in all 551 of them
+0x01  i16  from, or a negative sentinel: -2 and -3 both occur
+0x03  i16  to, or -2
+0x05  u16  operand         these three bytes are one action list instruction
+0x07  u8   opcode
```

So a record is `7 + 8 * count` bytes. Across 14 containers and four architectures, 610 of 627
consecutive records end exactly where the next begins and **none overruns**, and claiming them in
the byte accounting produces no overlap with any other structure.

**Which transitions a write fires**, read in the firmware on the Harmony 600 and 650's 0.2 builds, whose
walker and setters are byte identical ([findings.md](../../docs/findings.md) section 332). The sentinels and the
silent flag's skip were read on the Harmony One 3.4 too, section 277; the rest is not read there, and on
the 650's 0.4 and the Harmony 700's 2.8 the walker is located and not compared:

* the setter reads the old value, stores the new one, and walks the variable's record unless the
  silent flag is set (`0x07 0xFFFF` just before the write); a silent write stores and fires no
  transition;
* **every** transition is tested, in record order, and **every** match fires; there is no first match
  rule. Firing is an append to the action queue, which drops an all zero instruction and drops anything
  once the queue holds 40 instructions, silently. A match with a leading byte of bit 7 set ends the walk, which no arch 14 compile uses: the
  leading byte is 0 on 895 of 895 transitions of the thirteen arch 14 compiles;
* `from` matches when it equals the old value, always when it is `-2` (0xFFFE), and when it is `-3`
  (0xFFFD) only if the old value differs from the new one. `to` takes the same three cases against the
  new value; no arch 14 compile holds a negative `to`, where every Harmony One and Harmony 880 or 885
  configuration holds two `-2` to `-2` transitions;
* a firing transition's instruction is appended to the action queue as a list's own instruction is,
  and what one instruction appended runs next, before anything queued earlier, so a state write inside a
  transition fires that variable's transitions in turn, at once.

A nonzero leading byte below bit 7 takes a different arm, which pushes the instruction a computed
number of times; no configuration in the lab has one, and its meaning is not read.

**The first field is the generated value**, section 130, which settles what section 60 marked
unconfirmed and generalises section 120's reading of it as the idle activity value: for
`CurrentActivityState` the two coincide, because no activity is running while a config is compiled.

**Records 0 to 6 are the firmware's clock**, and they are the proof of that field: each one's first
value equals the corresponding field of base slot 3's build timestamp, in all 21 containers of the
corpus, with `max` equal to the field's own maximum.

| index | holds | max |
|---|---|---|
| 0 | second | 59 |
| 1 | minute | 59 |
| 2 | hour | 23 |
| 3 | day of the month, 0 is the 1st | 30 |
| 4 | day of the week, 0 is a Sunday | 6 |
| 5 | month, zero based | 11 |
| 6 | year since 2000 | that year plus one |

Section 74 read 3, 5 and 6 as a date from the action list language alone, which is an independent
route to three of the seven. The day and the weekday count as base slot 3's do, the day from 0 and the
weekday from Sunday, `docs/findings.md` section 322; this said the weekday was days since 1 January
2000, a Saturday, which named every date a day early. Base slot 0 names none of the seven in any
container.

**These records are the clock itself, not a copy of it**, section 138. On arch 12 state variable `n`
lives at data memory `0x108 + n`, so records 0 to 6 are the seven bytes section 111 measured on a
running Harmony One, and the firmware seeds variable `n` from record `n`'s first field at `0x2A266`,
skipping a record whose value is `0xFEFE`. The seeding is guarded by a checksum of the RAM the array
sits in, so a power cycle takes the config's values and a warm start keeps the running ones. Base slot
3 is **not** read for the clock: `0x27F20` subtracts it from these variables to work out how long ago
the config was built.

**Variables 7 to 12 are firmware owned too**, by a different argument, section 138: within one
architecture every container states the identical first value and `max`, and base slot 0 names none of
them anywhere. Index 13 is where both of those stop holding, which is what puts the boundary at 12.

| index | arch 8 | arch 9 | arch 12 | arch 14 | what it is |
|---|---|---|---|---|---|
| 7 | 0 / 2 | 0 / 2 | 0 / 2 | 0 / 2 | unread, and the one index that is identical on all four |
| 8 | 0 / 3 | 1 / 2 | 0 / 3 | 0 / 3 | the display light band on arch 12, whose four levels section 103 read |
| 9 | 5 / 7 | 0 / 1 | 5 / 7 | 5 / 7 | the battery gauge on arch 12, eight levels |
| 10 | 0 / 7 | 0 / 1 | 0 / 7 | 0 / 7 | the saved display light state on arch 12 |
| 11 | 0 / 32 | 0 / 1 | 0 / 32 | 0 / 32 | the cached display light level on arch 12 |
| 12 | 0 / 1 | 0 / 3 | 0 / 1 | 0 / 1 | unread |

The meanings are arch 12 readings and are marked so: arch 9 states different maxima for the same
indices, which is consistent with a Harmony 525 having no dimmable display of that kind, and nothing
establishes that it puts the same things there. The four measured on a connected Harmony One all sit
inside the maxima stated here, with the battery exactly at its own, which is a closure between a
hardware reading and a config field with no shared code behind them.

**For a writer:** stamp all seven clock records at the moment of writing, the same rail as base slot 3's
timestamp, and **reuse none of the firmware's block for anything**: 0 to 17 on arch 8, 12 and 14, and 0
to 12 on arch 9, section 284. A carried over config sets the remote's clock to when the old config was
made.

**One of the seven maxima moves with its value**, so a save writes eight values rather than seven.
**Six** of the maxima are constants, `59, 59, 23, 30, 6, 11` for the second, minute, hour, day of the
month, weekday and month. The year's is that year plus one and therefore always moves: stamping the
year alone leaves a config declaring a value outside the variable's own range, since built in 2023 the
record is 23 with a max of 24, and saved in 2026 it would be 26 in a range that stops at 24.
**Corrected by section 322**: this said the day of the month was a second such place, that a save on
a 31st writes a day of 31 against a maximum of 30, and `edit.ts` stamped `max(30, day)`. The day counts
from 0, so the 31st is stored as 30 and fits; `h700_config` was built on a 31st and stores 30 against
30. A save writes at most 30 now, and a configuration an old save left at 31 is put back to 30.
The transitions those
records carry are **not** touched: they are the same skeleton in every container, one each on the
minute, hour, day and month records and none on the other three, and the only part that varies between
configs is which base slot 10 list a `0x7F` names. `clockStateEdits` in `packages/codec/src/edit.ts`,
and `CLOCK_STATE_MAXIMA` in `src/sections.ts` is the table it both writes and checks against.

`max` is what **base slot 0's name for the variable ends in, plus one**, in all 250 named variables
of the corpus, which is what settles it. Every non negative `from` and `to` is inside `0` to `max`,
every instruction has a reading, and every one of the 439 that name a base slot 10 list by index
names one that exists. A record either carries no transitions or covers every value of the variable
the same number of times, so `count` is a multiple of `max + 1`: once per value in 83 records, twice
in two and four times in one. [findings.md](../../docs/findings.md) section 86.

**Variables 13 and up are the config's own, and eight per device are that device's delays.** On arch
14 (Harmony 600 and 700) each device carries `PowerOnDelay`, `DefaultPowerOnDelay`,
`InterDeviceDelay`, `DefaultInterDeviceDelay` and four more, each named `<property>_<identifier>` in
base slot 0. The value is the record's `first`, and **the unit is a tenth of a second**: the config
draws 451 strings reading `( 0 sec )` through `( 45 sec )`, contiguous in tenths with no gap, one per
position of the slider the remote's own menu offers, and every stored value is one of them. Logitech's
service states the same inter device field in milliseconds, at exactly 100 times the stored number.

The power on delay is how long the remote waits after switching a device on before it will send that
device anything; the inter device delay is how long it waits between two codes going to different
devices, measured on the Harmony 650 as a wait in front of the device's own command that begins once
the code before it has gone, section 335, which assumes the instructions queueing them all ran first. The other four, `PowerOnDelayFlagCounter`, `PowerOnDelayFixingTriggered` and their inter
device twins, have maxima of 5 and 100 and are unread.

**Only arch 14 carries the variables, and every architecture states the delay.** That is section
235's correction to this paragraph, which said the other containers "state no delay for any of
them"<!--superseded-->. Arch 8, 9 and 12 put the power on delay in the action list instead, as one
`0x7C` at the top level of the list a device's `Power` variable runs when it goes from 0 to 1: 57
transitions, every one carrying exactly one, against 16 on arch 14 carrying none. The unit is the
same, which is settled by Logitech compiling one configuration per architecture for the same three
devices, and the two agree device for device. `powerOnInstructions` returns the list, the position in
it and the value, since on those architectures changing a delay is a one byte edit. On the Harmony One the
wait is the catalogue's `powerOnDelay` in tenths, 8 of 8 harvest devices, after a call to the power steps,
section 393. Over the 82 power on lists of Logitech's 19 One compiles it names the device's own group on 82,
and is last on 79: 12 carry a `0x1F` between the call and the wait, exactly the 12 devices with an
`OnlinePower` variable; 3 add a reset after the wait; one, a friend's Philips, carries two waits.

What the inlining architectures do **not** state is a default, an identifier or an inter device
delay. Where they keep an inter device delay, if they keep one, is open, and that is a **negative
measurement** rather than an absence of looking: Logitech's account states one per device, 500
milliseconds on most and 1000 on one television, and no `0x7C` in that television's configuration
carries the 10 that would be, nor a 5 for the devices set to 500. They draw none of the 451 strings
either, having no slider.

**Logitech's own account states the same power on delay, in milliseconds**, which is the check from
outside the format: `UserFeatureManager/GetUserFeatures` returns a `PowerFeature` per device carrying
`PowerOnDelay` and `DefaultPowerOnDelay`. Against the configuration their service compiled for that
account, four of four devices agree at exactly a hundred times the stored number, and on two of them
the current value differs from the catalogue default, with the configuration taking the current one.
Section 235.

**Which device an identifier belongs to is stated by the screen and nowhere else.** A device's buttons
and its infrared group are reached through an ASCII label, `TV_Power_2`; its delays are held under
Logitech's numeric device identifier. Base slot 0's level 1 holds both kinds of name side by side and
relates neither to the other. The join is the mode page that offers to put one device's delays back to
their defaults: it draws the label in its title row and its action list copies
`DefaultPowerOnDelay_<identifier>` into `PowerOnDelay_<identifier>`. 19 of 19 devices over the four
containers that carry delays, against 1 and 4 of 19 for the two orderings of the identifiers anybody
would guess. Two details it needs: a drawn title is truncated to fit, `Panasonic Blu-ray Pl..`, so it
matches a label it is a prefix of when exactly one label matches; and an underscore in a label is a
space on the screen, because the underscore is base slot 0's own separator.

**Unconfirmed: the page's text is English.** Every container here was generated in English, so nothing
says what a German build draws. A config whose screen says something else loses the join and keeps
every delay.

**A second route to the identifier reaches 16 of the 19 and agrees on all of them**, section 235:
where the other architectures put the `0x7C`, arch 14 puts a `0x72` naming that device's own
`PowerOnDelay_<identifier>`, and the same list's `0x7D` names the group. It needs no drawn text, so
it is not language bound; it answers for fewer devices, because one that nothing switches on has no
such list. That `0x72`'s base slot 14 record has 451 entries, which states the 0 to 450 range a
third time.

**The power on list and its table**, section 288. The `Power` variable's off to on transition runs a
list that calls a send list of the device and then a list of one `0x72` on `PowerOnDelay_<identifier>`,
15 of 15 devices; the off transition sends a code of the device with no delay. The table's 451 cases
queue the value as `0x7C` quantities for the device's group, a hundred at a time: 0 an end alone, 1 to
100 one `0x7C`, 101 to 450 a call to a list of the device's own holding hundreds and a remainder, the
350 lists contiguous in the table's case order, which is one order on all 15, and `compilerCaseOrder`'s
on all 71 of the thirteen arch 14 compiles, section 319 and base slot 14 above. Each device also has a
second 451 case table on the same variable, whose cases call lists, **unconfirmed** in purpose.
`powerOnDelays` and `powerOnDelayCases`; `composeDevice` emits the list, the variable and the table on
arch 14.

**Changing an arch 14 delay is a two byte edit of the record's `first`**, `u16` little endian, plus
the trailer checksum. **The record's `second` does not bound it**: it is 65277 on the Denon's record in
the Harmony 650's and Harmony 700's configurations, and the range is the 451 case table's, 0 to 450.
`setPowerOnDelayVariable` in `packages/codec/src/edit.ts` refuses anything else. Written to the Harmony
650 and the Harmony 700 and put back, the new value in force after the writer's restart on both,
measured in memory on the first and by infrared timing on the second. **On the Harmony 600 the same
edit landed and was not used**, because a value saved on the remote wins, below. [findings.md](../../docs/findings.md)
sections 283, 301 and 303.

**A delay saved on the remote overrides the configuration's at start**, arch 14, measured across three
starts on the Harmony 600:

| | instructions | effect |
|---|---|---|
| save | `0x7A key`, `0x6C value` | store `value` under `key` in the settings store; bit 15 of the value selects the inter device table |
| restore | `0x7A key`, `0x0F 0xFF40` or `0x0F 0xFF41`, `0x1F 0xED00 \| variable` | read the slot for `key` into the accumulator, `0xFEFD` when absent, and write it into the delay variable |
| sweep | `0x07 0xFFF3` ... `0x07 0xFFF2` | clear the marks, restore, then erase every slot no read marked (read, not exercised; the 600's store history fits it) |

* Every delay variable the compiler emits, its `Default` copies aside, carries a value map whose case
  for v is a list `[0x7A key, 0x6C v]` (`| 0x8000` for an inter device delay); one key per device,
  shared by its two delays. On `h600_config` the remote's own delay page reaches it through "Set to
  default", which saves the default values; what saved anything else is **unestablished**.
* The restore lists hang off list 1 on `h600_config`, through 1476, on `calibration_h600` and on the
  650, and off list 2 on the 700, whose 2.8 firmware is unread for this. That the firmware runs that
  list at start is inferred.
* The key: the device identifier's last four digits fit the 600's two configurations and the 650's,
  its last five fit the 650's and the 700's; the rule is **unconfirmed**. Section 360's blind re-measure
  fits one rule to all of them, the last five decimal digits or the last four where five exceed 65535, on
  290 of 290 restore leaves over 23 compiles; nothing builds on it yet.
* The store itself, internal `0x01EC00`: settings `0x00` to `0x13` are five power on slots and `0x18` to
  `0x2B` five inter device slots, each a big endian key and a big endian value, `0xFF` when empty.
* `composeDevice` emits neither program, so a composed device's delays are not saved or restored.
* **Over USB**, section 305: `0x14 0xB3 0x00 setting value` appends one record at the first record
  from offset 4 whose setting byte is `0xFF`, and writes nothing when the setting already holds the
  value. A slot is emptied by four such writes of `0xFF`, key first, which is the order the firmware's
  own purge uses. A write landing on the block's last record makes the firmware copy the store to the
  other block, which erases internal program memory, so a writer keeps clear of it. Measured on the
  Harmony 600; the 0.2 path is byte identical on the 650.

`packages/codec/test/settingsstore.test.ts` and `packages/usb/test/settings.test.ts`.
[findings.md](../../docs/findings.md) sections 303 to 305.

`deviceDelays`, `powerOnInstructions` and `deviceIdOfGroup` in `packages/codec/src/inventory.ts`.
[findings.md](../../docs/findings.md) sections 234 and 235.
### Base slot 2's region is a timestamped event log the host reads back

Section 47 read base slot 2 as three numbers reserving a region of flash that the firmware
appends to and never erases, and identified what appends: ten call sites on one operand ladder.
What it could not say is what an entry means. The client says, and its reading of the reserving
record is identical to section 47's, stride of 8 included, which section 47 derived from
arithmetic across nineteen containers with no code at all.

An entry is eight bytes, and the byte at `+0x07` says how many are used:

| `+0x07` | layout |
|---|---|
| 5 | `u8 type; u8 index; u24 ticks` |
| 7 | `u16 type; u16 index; u24 ticks` |
| 255 | erased |
| anything else | present, and not parsed |

`ticks` is **signed 24 bit seconds relative to the config's build date**, which is base slot 3.
That ties two sections together that nothing here had connected: slot 3 is the epoch for slot 2's
journal. The host stops reading after more than three consecutive erased entries, which is the
mirror of the firmware's own scan for the last byte that is not `0xFF`.

**This layout is arch 7, 8 and 9 only.** On arch 12 and 14 the client reads the region in raw 256
byte blocks and does not parse it, so it does not know those architectures' layout either, and
neither do we. On arch 12 it does not read the region at all unless a hardware flag is set, which
it asks for with read selector 12.

Worth confirming from the firmware because it is the one part of a config that records what the
owner actually did with the remote, and because an application that offers to show it should be
sure what it is showing.
