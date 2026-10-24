# State

A configuration is a program, and like any program it needs memory. This page describes the parts of a
configuration that hold what the remote keeps track of while it runs, and the constants it runs with:

* **the state variables**, base slot 13: every number the remote remembers, such as which activity is on,
  whether each device is switched on, how long to wait after switching it on, and the clock. The
  configuration declares each one with its starting value, its range, and what to do when it changes.
* **the value maps**, base slot 14: lookup tables from a variable's value to something to run.
* **the timers**, base slot 12: a duration and the one instruction to run when it is up, such as
  switching the screen light off.
* **the number sender**, base slot 16: how a favourite channel's number becomes a series of digit codes.
* **the parameter block**, base slot 15: the model's own constants, such as the display light's levels
  and the battery curve.
* **the event map**, base slot 4: where the firmware's own events and status screens are numbered.
* **the log area**, base slot 2: a region of flash reserved for the remote to append a log to.

The instructions that read and change all of this are the action language, [actions.md](actions.md).
Everything below is little endian, and an address is an absolute three byte flash address, as everywhere
in [the format](README.md).

## Base slot 13: the state variable table

The remote's variables. Each has a number, its index, and the configuration states for each one the value
it starts with, the highest value it takes, and a list of transitions: "when this variable goes from this
value to that one, run this instruction". That is how a configuration reacts to anything: pressing an
activity key writes a variable, and the variable's transitions switch the devices on.

Confirmed on 15<!--fact:user_configs--> user configs across four architectures, and named from the firmware
routine that loads it rather than from what the bytes look like[^s35].

```
+0x00  u16  count           how many variables
+0x02  u16  narrow          how many are stored as one byte
+0x04  u16  wide            how many are stored as two bytes; narrow + wide == count
+0x06  u16  narrow again    the same number a second time
+0x08  u24  entry[count]
```

`8 + 3 * count` equals the section's length exactly, in all fifteen, and the counts run from 21 to
94[^s35b]. The firmware copies the table into data memory as two runs, `narrow` single bytes followed by
`wide` pairs, so **an index below `narrow` is a one byte variable and an index at or above it is a two
byte one**[^s35].

### What the four header words do

**Three of the four words are live, and the storage is sized `narrow + 2 * wide` with `count` playing no
part in it**[^s276]. `count` limits the boot loop that seeds each variable from its record and is kept
only in a scratch byte, so nothing compares an index against it; `narrow` is the width threshold; `wide`
sizes the storage. Above `narrow + 2 * wide` the firmware **fills every byte with `0xFE` at each boot**,
and because the seeding loop runs first, a variable above the storage is seeded correctly and then
painted over, holding 65278 rather than its record's value, with no error anywhere[^s276]. The fill's
ceiling is per image rather than per architecture, `0x7F` on the Harmony One, `0xFF` on the Harmony 700
and `0xC0` on the Harmony 600, and a second arm starts it at the constant 18 under a flags bit that is
unread[^s276][^s284]. The fill is not read on arch 9 (Harmony 525)[^unchecked].

`narrow again` is fetched and discarded on arch 12 (Harmony One) and arch 14 (Harmony 600, 650 and 700);
arch 9 (Harmony 525) reads it[^s274].

A separate check does compare an index against `narrow + wide`, seven instructions on all six images
read, but its callers are `WRITE_MISC` and `READ_MISC` **selector `0x01`**, a host reading or writing a
variable over USB. A configuration's own state write reaches the store unchecked, so that bound is not
what a writer has to respect, and a refused read over USB returns 0 rather than an error[^s276].

The identity `narrow + wide == count` holds on 19 of 19 containers[^s276b]. That is what makes it
enforceable rather than what proves the bound, since the two are the same number in every one, and
`assertStateTableConsistent` refuses a container that breaks it.

**A new variable that carries transitions goes in below `narrow`**, which costs a renumbering: every
variable at or above the insertion point shifts up by one and every reference has to move with it. The
reason is a measurement rather than the firmware, since nothing read so far branches on the width: 0 of
64 two byte variables carry transitions against 91 of 194 one byte ones[^s277]. A reference sits in an
opcode byte or an operand's low byte, in one of three kinds enumerated by `stateVariableSite`, 8163 of
them across fourteen configurations with none naming a variable its own table lacks; a name tree node at
level 1 carries one too[^s277].

### Who reads it

The opcodes that index it are `0x70`, `0x71` and `0x72`, in the operand's low byte, and `0x80 | n`
writes variable `n`, [actions.md](actions.md). Every index in every configuration is below that
configuration's own `count`, and the halves are respected exactly[^s35b]:

| opcode | uses | indices |
|---|---|---|
| `0x71` | 2164 | always below `narrow`, matching a handler that compares a byte |
| `0x70` | 146 | always at or above `narrow`, matching a handler that compares the sixteen bit accumulator |
| `0x72` | 501 | either half |

### A variable's record

Each entry points at a record declaring the variable's values. Nothing states its length, so the rule is
the reader[^s60]:

```
+0x00  u16  first           the value the variable holds when the config is generated
+0x02  u16  max             the highest value this variable takes
+0x04  u16  count           how many transitions follow, not how many values there are
+0x06  u8   not established
+0x07       transition[count], eight bytes each
```

and a transition

```
+0x00  u8   lead            zero in every transition Logitech's compiler writes
+0x01  i16  from, or a negative sentinel: -2 and -3 both occur
+0x03  i16  to, or -2
+0x05  u16  operand         these three bytes are one action list instruction
+0x07  u8   opcode
```

So a record is `7 + 8 * count` bytes, and consecutive records end exactly where the next begins with none
overrunning[^s60]. The lead byte is `0x00` on 569 of 569 transitions over fourteen configurations[^s277]
and on 895 of 895 over the thirteen arch 14 compiles[^s332]; it is not an enable bit[^s277].

**`first` is the value the variable holds when the configuration is generated**[^s130]. For
`CurrentActivityState` that is the idle value, because no activity is running while a configuration is
compiled.

**`max` is the highest value**, and it is what base slot 0's name for the variable ends in, plus one, in
all 250 named variables[^s86]. Every non negative `from` and `to` is inside `0` to `max`, every
instruction has a reading, and every one of the 439 that name a base slot 10 list by index names one that
exists. A record either carries no transitions or covers every value of the variable the same number of
times, so `count` is a multiple of `max + 1`: once per value in 83 records, twice in two and four times
in one[^s86].

### Which transitions a write fires

Read in the firmware on the Harmony 600 and 650's 0.2 builds, whose walker and setters are byte
identical[^s332]. The sentinels and the silent flag's skip were read on the Harmony One 3.4 too[^s277b];
the rest is not read there, and on the 650's 0.4 and the Harmony 700's 2.8 the walker is located and not
compared[^unchecked].

* The setter reads the old value, stores the new one, and walks the variable's record unless the silent
  flag is set (`0x07 0xFFFF` just before the write). A silent write stores and fires no transition.
* **Every** transition is tested, in record order, and **every** match fires; there is no first match
  rule. Firing is an append to the action queue, which drops an all zero instruction and drops anything
  once the queue holds 40 instructions, silently. A match whose lead byte has bit 7 set ends the walk,
  which no arch 14 compile uses.
* `from` matches when it equals the old value, always when it is `-2` (`0xFFFE`), and when it is `-3`
  (`0xFFFD`) only if the old value differs from the new one. `to` takes the same three cases against the
  new value. No arch 14 compile holds a negative `to`, where every Harmony One and Harmony 880 or 885
  configuration holds two `-2` to `-2` transitions.
* A firing transition's instruction is appended to the action queue as a list's own instruction is, and
  what one instruction appended runs next, before anything queued earlier, so a state write inside a
  transition fires that variable's transitions in turn, at once.

A nonzero lead byte below bit 7 takes a different arm, which pushes the instruction a computed number of
times; no configuration examined has one, and its meaning is not read[^s332].

### Variables 0 to 6 are the clock

**Records 0 to 6 are the firmware's clock**, and they are the proof of what `first` means: each one's
`first` equals the corresponding field of base slot 3's build timestamp, in all 21 containers measured,
with `max` equal to the field's own maximum[^s130].

| index | holds | max |
|---|---|---|
| 0 | second | 59 |
| 1 | minute | 59 |
| 2 | hour | 23 |
| 3 | day of the month, 0 is the 1st | 30 |
| 4 | day of the week, 0 is a Sunday | 6 |
| 5 | month, 0 is January | 11 |
| 6 | year since 2000 | that year plus one |

The day and the weekday count as base slot 3's do, the day from 0 and the weekday from Sunday[^s322].
Base slot 0 names none of the seven in any container[^s130].

**These records are the clock itself, not a copy of it.** On arch 12 (Harmony One) state variable `n`
lives at data memory `0x108 + n`, so records 0 to 6 are seven bytes of the running remote, and the
firmware seeds variable `n` from record `n`'s `first` at `0x2A266`, skipping a record whose value is
`0xFEFE`[^s138]. The seeding is guarded by a checksum of the data memory the array sits in, so a power
cycle takes the configuration's values and a warm start keeps the running ones[^s138]. On a connected
Harmony One the clock read exactly the timestamp's date and its time plus its uptime[^s111]. Base slot 3
is **not** read for the clock: `0x27F20` subtracts it from these variables to work out how long ago the
configuration was built[^s138]. Where the other architectures keep their variables is in their memory
pages: the [Harmony One](../architectures/harmony-one/memory.md), the
[Harmony 600, 650 and 700](../architectures/harmony-600-650-700/memory.md) and the
[Harmony 5xx](../architectures/harmony-5xx/memory.md).

**The firmware steps the date itself.** `0x07` with operand high byte `0xF8` advances variables 3, 5 and
6, day, month and year: the month length table has the four thirty day months at months 3, 5, 8 and 10
counted from 0, February apart, and the month is reduced modulo 12. The same three offsets from the state
variable base appear in both firmwares, `0x900` on arch 14 (Harmony 600, 650 and 700) and `0x108` on
arch 12 (Harmony One)[^s74], and the month end routine is read on five architectures[^s322].

**The clock's transitions** are the same skeleton in every container: one each on the minute, hour, day
and month records and none on the other three, and the only part that varies between configurations is
which base slot 10 list a `0x7F` names[^s130]. On the Harmony One the minute carries a second
transition, `{-2 to -2, 0x7F list}`, calling the clock's screen list[^s407].

### Variables 7 to 17 belong to the firmware too

**The firmware owns state variables 0 to 17 on arch 8, 12 and 14 (Harmony 880 and 885, Harmony One,
Harmony 600, 650 and 700) and 0 to 12 on arch 9 (Harmony 525).** Its alternative `0xFE` fill and the
checksum that decides whether the seeder runs both start at index 18 on the first three, the firmware
stores its own state into 13 to 17, and arch 9's seeder skips below the literal 13[^s284]. Within one
architecture every container states the same `first` and `max` for these, and base slot 0 names none of
them[^s284b].

| index | arch 8 | arch 9 | arch 12 | arch 14 | what it is |
|---|---|---|---|---|---|
| 7 | 0 / 2 | 0 / 2 | 0 / 2 | 0 / 2 | unread |
| 8 | 0 / 3 | 1 / 2 | 0 / 3 | 0 / 3 | the display light band on arch 12[^s103] |
| 9 | 5 / 7 | 0 / 1 | 5 / 7 | 5 / 7 | the battery gauge on arch 12, eight levels[^s105] |
| 10 | 0 / 7 | 0 / 1 | 0 / 7 | 0 / 7 | the saved display light state on arch 12[^s103] |
| 11 | 0 / 32 | 0 / 1 | 0 / 32 | 0 / 32 | the cached display light level on arch 12[^s103] |
| 12 | 0 / 1 | 0 / 3 | 0 / 1 | 0 / 1 | unread |
| 13 | 1 / 1 | the configuration's own | 1 / 1 | 0 / 32 | on arch 12 set from the charger input[^s284] |
| 14 | 0 / 1 | the configuration's own | 2 / 4 | 1 / 1 | no direct writer, except on the Harmony 700[^s284] |
| 15 | 0 / 3 | the configuration's own | 0 / 3 | 0 / 3 | on arch 12 stored when a value the firmware derives changes[^s284] |
| 16 | 0 / 1 | the configuration's own | 0 / 1 | 0 / 1 | on arch 12 stored when a value the firmware derives changes[^s284] |
| 17 | 0 / 3 | the configuration's own | 0 / 3 | 0 / 3 | on arch 14 the sending flag, 2 while a code is sent[^s369] |

Each cell is `first / max`[^s138][^s284b]. The meanings are arch 12 readings except where marked: arch 9
states different maxima for 8 to 12, which is consistent with a Harmony 525 having no dimmable display of
that kind, and nothing establishes that it puts the same things there. The values measured on a connected
Harmony One for 8 to 11 all sit inside the maxima stated here, the battery exactly at its own[^s111]. On
arch 12 the safe mode container states 0 / 1 for index 14[^s284b].

### What a writer does with the clock

**Stamp all seven clock records at the moment of writing**, the same rule as base slot 3's timestamp, and
**reuse none of the firmware's block for anything else**: 0 to 17 on arch 8, 12 and 14, and 0 to 12 on
arch 9[^s284]. A carried over configuration sets the remote's clock to when the old one was made[^s130].

**A save writes eight values rather than seven, because one maximum moves with its value.** Six of the
maxima are constants, `59, 59, 23, 30, 6, 11`. The year's is that year plus one and so always moves:
stamping the year alone leaves a configuration declaring a value outside the variable's own range, since
built in 2023 the record is 23 with a max of 24, and saved in 2026 it would be 26 in a range that stops at
24[^s130]. The day of the month does not move its maximum: it counts from 0, so the 31st is stored as 30
and fits, and a Harmony 700 configuration built on a 31st stores 30 against 30[^s322]. A save writes a day
of at most 30, and puts a 31 an older save of ours left back to 30. The transitions on the clock records
are not touched. `clockStateEdits` in `packages/codec/src/edit.ts`, and `CLOCK_STATE_MAXIMA` in
`src/sections.ts` is the table it both writes and checks against.

### Variables 18 and up are the configuration's own

What a configuration names in base slot 0 starts at 18 on arch 8, 12 and 14 and at 13 on arch 9[^s284b]:
the current activity, each device's power, its inputs, and on arch 14 each device's delays, below.

## A device's delays

A person meets these as "how long to wait after switching the television on before sending it anything"
and "how long to wait between codes to two different devices". Every architecture states the first; only
arch 14 (Harmony 600, 650 and 700) keeps them in state variables.

### On arch 14, eight variables per device

Each device carries `PowerOnDelay`, `DefaultPowerOnDelay`, `InterDeviceDelay`,
`DefaultInterDeviceDelay` and four more, each named `<property>_<identifier>` in base slot 0. The value
is the record's `first`, and **the unit is a tenth of a second**: the configuration draws 451 strings
reading `( 0 sec )` through `( 45 sec )`, contiguous in tenths with no gap, one per position of the slider
the remote's own menu offers, and every stored value is one of them[^s234]. Logitech's service states the
same inter device field in milliseconds, at exactly 100 times the stored number[^s235].

The power on delay is how long the remote waits after switching a device on before it will send that
device anything; the inter device delay is how long it waits in front of the device's own command, which
on the Harmony 650 begins once the code before it has gone[^s335]. The other four,
`PowerOnDelayFlagCounter`, `PowerOnDelayFixingTriggered` and their inter device twins, have maxima of 5
and 100 and are unread[^s234].

**The power on list and its table.** The `Power` variable's off to on transition runs a list that calls a
send list of the device and then a list of one `0x72` on `PowerOnDelay_<identifier>`, 15 of 15 devices;
the off transition sends a code of the device with no delay[^s288]. The value map's 451 cases queue the
value as `0x7C` quantities for the device's group, a hundred at a time: 0 an end alone, 1 to 100 one
`0x7C`, 101 to 450 a call to a list of the device's own holding hundreds and a remainder, the 350 lists
contiguous in the table's case order[^s288], which is `compilerCaseOrder`'s on all 71 over the thirteen
arch 14 compiles[^s319]. Each device also has a second 451 case table on the same variable, whose cases
call lists, of a purpose not established[^s288]. `powerOnDelays` and `powerOnDelayCases`;
`composeDevice` emits the list, the variable and the table on arch 14.

**Changing an arch 14 delay is a two byte edit of the record's `first`**, `u16`, plus the trailer
checksum. **The record's `max` does not bound it**: it is 65277 on some devices' records, and the range is
the 451 case table's, 0 to 450. `setPowerOnDelayVariable` in `packages/codec/src/edit.ts` refuses
anything else. A changed value is in force after the restart that follows a write, measured in memory on
a Harmony 650[^s283] and by infrared timing on a Harmony 700[^s301].

### On arch 14 a delay saved on the remote wins

**A delay saved on the remote overrides the configuration's at start**, measured across three starts on a
Harmony 600, where a changed delay landed in flash and was not used[^s303]. Logitech's compiler gives every
delay variable, its `Default` copies aside, a value map whose case for a value v is the list
`[0x7A key, 0x6C v]`, with `| 0x8000` for an inter device delay; that saves the value into the remote's
settings store under a key naming the device, one key per device shared by its two delays[^s303]:

| | instructions | effect |
|---|---|---|
| save | `0x7A key`, `0x6C value` | store `value` under `key` in the settings store; bit 15 of the value selects the inter device table |
| restore | `0x7A key`, `0x0F 0xFF40` or `0x0F 0xFF41`, `0x1F 0xED00 \| variable` | read the slot for `key` into the accumulator, `0xFEFD` when absent, and write it into the delay variable |
| sweep | `0x07 0xFFF3` ... `0x07 0xFFF2` | clear the marks, restore, then erase every slot no read marked |

The save and the restore are read and measured; the sweep is read and not exercised[^s303]. On a Harmony 600
configuration the remote's own delay page reaches the save through "Set to default", which saves the
default values; what saves anything else is not established[^s303]. That the firmware runs the restore at
start is inferred from where the restore lists hang, list 1 on the Harmony 600 and 650 and list 2 on the
Harmony 700, whose 2.8 firmware is unread for this[^s303]; the restore program is part of
[the compiler's wiring](../architectures/harmony-600-650-700/compiler.md). **The key is the device
identifier's last five decimal digits, or its last four where five would exceed 65535**, on 290 of 290
restore leaves over 23 compiles[^s360].

Where the saved values live, the settings store in internal flash, is in
[the memory page](../architectures/harmony-600-650-700/memory.md), and a host reads and writes it over
USB as [the architecture's usb.md](../architectures/harmony-600-650-700/usb.md) describes. A device
`composeDevice` adds gets neither program, so its delays are not saved or restored.

### Which device an identifier belongs to

**The screen states it and nothing else does.** A device's buttons and its infrared group are reached
through an ASCII label, `TV_Power_2`; its delays are held under Logitech's numeric device identifier. Base
slot 0's level 1 holds both kinds of name side by side and relates neither to the other. The join is the
mode page that offers to put one device's delays back to their defaults: it draws the label in its title
row and its action list copies `DefaultPowerOnDelay_<identifier>` into `PowerOnDelay_<identifier>`. 19 of
19 devices over the four containers that carry delays, against 1 and 4 of 19 for the two orderings of the
identifiers anybody would guess[^s234]. Two details it needs: a drawn title is truncated to fit,
`Panasonic Blu-ray Pl..`, so it matches a label it is a prefix of when exactly one label matches; and an
underscore in a label is a space on the screen, because the underscore is base slot 0's own separator.
Every container examined was generated in English, so what another language's build draws there is not
checked[^unchecked], and a configuration whose screen says something else loses the join and keeps every
delay.

**A second route reaches 16 of the 19 and agrees on all of them**: where the other architectures put the
`0x7C`, arch 14 puts a `0x72` naming that device's own `PowerOnDelay_<identifier>`, and the same list's
`0x7D` names the group. It needs no drawn text, so it is not bound to a language; it answers for fewer
devices, because one that nothing switches on has no such list. That `0x72`'s base slot 14 record has 451
entries, which states the 0 to 450 range a third time[^s235b].

`deviceDelays`, `powerOnInstructions` and `deviceIdOfGroup` in `packages/codec/src/inventory.ts`.

### On the other architectures, one instruction

**Arch 8, 9 and 12 (Harmony 880 and 885, Harmony 525, Harmony One) put the power on delay in the action
list instead**, as one `0x7C` at the top level of the list a device's `Power` variable runs when it goes
from 0 to 1: 57 transitions, every one carrying exactly one, against 16 on arch 14 carrying none[^s235b].
The unit is the same, settled by Logitech compiling one configuration per architecture for the same three
devices: the two agree device for device[^s235b]. `powerOnInstructions` returns the list, the position in
it and the value, since on those architectures changing a delay is a one byte edit. On the Harmony One
the wait is the catalogue's `powerOnDelay` in tenths, after a call to the power steps: over the 82 power
on lists of Logitech's 19 Harmony One compiles it names the device's own group on 82 and is last on 79;
12 carry a `0x1F` between the call and the wait, exactly the 12 devices with an `OnlinePower` variable, 3
add a reset after the wait, and one device carries two waits[^s393].

What those architectures do **not** state is a default, an identifier or an inter device delay. Where they
keep an inter device delay, if they keep one, is open, and that is a negative measurement rather than an
absence of looking: Logitech's account states one per device, 500 milliseconds on most and 1000 on one
television, and no `0x7C` in that television's configuration carries the 10 that would be, nor a 5 for
the devices set to 500[^s235c]. They draw none of the 451 strings either, having no slider.

**Logitech's account states the same power on delay, in milliseconds**, which is the check from outside
the format: `UserFeatureManager/GetUserFeatures` returns a `PowerFeature` per device carrying
`PowerOnDelay` and `DefaultPowerOnDelay`. Against the configuration their service compiled for that
account, four of four devices agree at exactly a hundred times the stored number, and on two of them the
current value differs from the catalogue default, with the configuration taking the current one[^s235c].

What a delay does once it is queued, holding back only its own device, is the `0x7C` instruction's,
[actions.md](actions.md).

## Base slot 14: the state value map

Lookup tables: given a variable's value, which program to run. An activity's power on sequence, a
device's power on delay and the screen to show for the current activity are all chosen this way.

Confirmed on 15<!--fact:user_configs--> user configs across four architectures[^s39].

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

The **count width differs by architecture and the key width does not**. That is read off the layout:
compute a record's length under each of the four combinations of widths and ask whether it lands on
another record's start. One combination per architecture accounts for at least four fifths of the records
and the other three are all behind it[^s39b].

Opcode `0x72` names both halves of this at once. Its operand's **low byte is a state variable index** into
base slot 13 and its **high byte selects the record** here. The record is searched for the variable's
value, then, if nothing matched, for a range containing it; the bounds are inclusive[^s39]. Both operand
bounds hold in all fifteen user configs and neither is ever overrun[^s39b].

**The payload is a flash address, not an instruction.** All 15594<!--fact:value_map_targets--> targets
across 15<!--fact:user_configs--> configs land inside their own container. The firmware follows one and
hands it to a **second interpreter**, a one byte opcode language with ten opcodes and a terminator, which is
not the action list language and is not decoded. Base slot 6's mode switch reaches the same
interpreter[^s39].

Records share their tails: a few addresses point into the middle of a longer record rather than to a record
of their own, so two records can overlap by design. The range table is empty in eleven of the fifteen
configs; the other four carry one range each[^s39b]. **On arch 14 every record leads with 2 and has no
range table**, 501 of 501 over thirteen compiles, and no address points into another record, so
`buildValueMap` writes each record whole from its cases[^s324].

### The order of the cases

**On arch 14 the cases are stored in the compiler's hash order**, the one [the layout page](layout.md)
states for other lists: ascending by `k ^ (k >>> 4) ^ (k >>> 7)`, so 0 to 15, 17, 16, 19, 18, 20 for 0 to
20. All 410 records with two or more cases over the thirteen arch 14 compiles fit, but **two orderings pin
it**: the 332 that are not ascending hold only the key sets 0 to 20 and 0 to 450, 166 records each, each set
in one identical order, and the other 78 have every key below 16, where the hash is the key itself[^s319].
The firmware's exact match walks the cases in stored order and leaves at the first equal key, trying the
range table only when none matched, `0x19A2E` on the Harmony 600's 0.2 image and `0x1B30A` on the Harmony
700's 2.8, so the order changes nothing on the remote and a writer reproduces it to match the compiler byte
for byte[^s319b].

That the generator iterated a Java hash map is an inference from the formula, which is that map's
supplemental hash in Java 6 and 7. **The map's table size is unknown**, and Java 6 and later Java 7 updates
grow it differently, so a key set the corpus does not hold may come out in another order: keys 2 to 13 and
16 would put 16 first under the second rule. `compilerCaseOrder` therefore accepts only key sets all below
16 and the runs 0 to 20 and 0 to 450, and refuses the rest[^s319].

**Undecided on arch 8, 9 and 12**: their 65 records of two or more cases, over the Harmony One's four
containers, the Harmony 525's two and the six arch 8 ones, all have keys below 16, the largest 9, so they
are ascending and fit either rule[^s319]. Arch 10 (Harmony 890 and 895) is not scored, having no reader
here.

### Records the compiler always writes

**An activity's working screen, arch 12 (Harmony One).** One record is keyed by `CurrentActivityState` and
holds, per activity, the two instruction screen program `17 lo hi 0x7E; 0`, entering that activity's
working screen, plus one case for the idle value that enters no screen. It is found by walking from the left
bottom key of a device mode page, the "Activities" key, through `0x7F` and `0x72`; its index differs per
configuration, 3, 5, 11 or 13 on the thirteen measured, so it is never a constant. The activity's enter list
opens with a `0x7E` into a different mode, its start up screen, on 60 of 60[^s279]. Not checked on the
other architectures[^unchecked]. `activityScreens` in `packages/codec/src/inventory.ts`.

**The all off list.** A base slot 10 list of state writes only, each a 0 into a device's `Power` variable,
reached from the `idle` base slot 9 entry's enter list through `0x7F` and the `0x7F` a base slot 14 case
queues. Exactly one on each of the eleven user configurations with two devices or more, on arch 8, 9, 12
and 14, naming every `Power` variable; none where there is one device. The walk is from `CurrentLocation`'s
record, whose one case, value 0, queues the call, so the switch off is conditional on it. Every activity's
enter list writes every one of those variables, 1 or 0, directly or through the lists it calls, up to
three calls down[^s280]. `allOffList`.

**With one device there is no list, and the case writes it**: on all four configurations Logitech built
with one device, one of the Harmony 525 and three of the Harmony One, the record's one case, for 0, queues
the write of 0 into that device's `Power` variable itself, a five byte case program[^s376]. A configuration
with no device has the record with no case. `joinPowerOff` gives the first device the case and turns it
into a call to a new list of both writes for the second. No Harmony 600, 650 or 700 compile with one
device has been examined, so that model's form is the other architectures'[^unchecked].

Read with `gspm.value_maps` and `gspm.value_map_reference`.

## Base slot 12: the timer table

Each timer is a duration and one instruction to run when it is up. The screen light going off after some
seconds is one.

Confirmed on 15<!--fact:user_configs--> user configs across four architectures, with the three safe mode
containers as a negative case[^s43].

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

A timer is started by opcode `0x1F` with the operand's high byte `0xEB`, and cancelled by the same opcode
with `0xEA`; the operand's low byte is the index into this section in both. **The set of indices started is
exactly `0` to `count - 1` in every config**, counts from 5 to 30, and no instruction names a record that is
not there. The safe mode containers carry no records and issue neither instruction[^s43].

The firmware runs at most **four** timers at once, so a configuration with thirty records describes thirty
possible timers rather than thirty concurrent ones, and starting a fifth is a silent no-op[^s43b].

**A timer fires exactly one instruction**, not a list. Anything longer has to be a single instruction that
runs an action list, which is what 116 of the 159 records do[^s43]. The scheduled kind also **clamps the
duration to sixteen bits**, so a value above 65535 becomes 65535 rather than an error[^s43b]. Both are
rules a writer has to keep. Kind `0` is counted down in software instead and no configuration uses it, so
its rate is not established[^s43b].

**One timer is named: the screen light, on arch 14.** Two timers on every arch 14 user configuration queue
a list opening with `1F E910`, and the lower index of the two is how long the screen stays lit, in seconds;
MyHarmony calls the setting `GlowTime`[^s292]. Measured on the Harmony 650 only, by writing 20 and 10 and
timing the screen; on the Harmony 600 a configuration's value agrees with the saved `GlowTime`, which is 20
and also its default, and on the Harmony 700 both timers of the pair hold 10, so its pick is the rule's and
not established[^s292]. The two are the arms of one test of state variable 9; when the other arm is taken
is not established. Arch 8 and arch 10 carry the same pair, not measured[^s292]. `screenLightTimer` in
`packages/codec/src/tables.ts`. What a person sees is each model's display page, such as
[the Harmony 650's](../remotes/harmony-650/features.md).

**Every arch 14 timer but a device's is the firmware's, in a fixed order**, 13 of 13: light off, the
Harmony 700's four cycling frames, the screen light, its tick, the screen light again and the return to USB
Connected. A device's own timer writes 1 into its `<label>_OnlinePower_2` after 30 or 45 seconds, on 10 of
the 13, at index 3, 4, 5, 7 or 9; what decides its place is not established[^s347]. The order is part of
[the compiler's wiring](../architectures/harmony-600-650-700/compiler.md).

**On the Harmony One every timer but a device's is one of thirteen on every compile, a three second one on
2 of 19, or a four second redraw timer**, 13 to 20 of those, 19 of 19, one per class of screen; the
thirteen come in three orders over the 19[^s410][^s430]. That is
[the Harmony One compiler's wiring](../architectures/harmony-one/compiler.md).

Read with `gspm.timers` and `gspm.timer_reference`.

## Base slot 16: the number sender

How a favourite channel's number becomes digit codes. A record here is a method for sending a number to
one device: give it 101 and it queues that device's codes for 1, 0 and 1.

**Confirmed on configurations made to carry it rather than found with it.** Every configuration otherwise
examined carries a count of zero here. A configuration with three favourite channels was compiled by
Logitech's own service and every field below sits where the firmware reading put it, byte for byte[^s154];
more compiles carry the record too[^s156], and the two implementations are compared on it by the golden
vectors.

**This section does not carry every favourite channel.** A channel is sent through here only when its
number survives being written as an integer. One with a **leading zero** takes another route entirely: its
base slot 13 transition runs one base slot 10 list per digit, each sending that device's own digit code,
and this section is not involved. Measured on a configuration authored with `1` and `001` together, where
the two go different ways[^s156]. So `minimum` below is **not** how a leading zero is expressed, which is
the one thing a reading of the firmware alone would have got wrong about it.

**A record is a method for sending a number, not a number.** Three channels produce **one** record and three
action lists, each loading a constant and handing it to that record. So `count` is the number of devices
that take a number, not the number of channels[^s154].

**A count of zero is not a NULL slot.** A configuration with no channels still declares this section and
gives it one byte; the one that has them gives it four. So an empty record list and an unreadable slot are
different answers and a reader must not merge them[^s154]. **Read this section with `numberSenders`, which
uses `countedPointers` and is told the width**, and not with `pointerArray`, which infers the width from the
count and therefore cannot represent an empty array: it answers `undefined` for a count of zero. That is a
property of the inferring reader and not a merge of the two answers[^s262].

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

Each digit table is ten three byte instructions indexed by the digit. The firmware adds `base` to the value
it is given, converts the sum to packed decimal by subtracting `10000`, `1000`, `100` and `10` in four
loops, and queues one instruction per digit, taking it from the first, middle or last table according to
where the digit sits. `flags` bit 2 makes the prefix instruction fire at a hundred and bit 1 at ten; with
neither, it never fires. Bit 0 makes the prefix consume a digit[^s39]. The fourteen bytes read in sequence
end exactly where the first of the three fixed pointer offsets begins, which is the closure for this
layout, and the routine is identical on the Harmony 700, the Harmony 600 and the Harmony One[^s39].

In the first sample the ten instructions of a digit table run action lists that send that television's
commands `0` through `9`, in table order, ten of ten, and the instruction queued last sends its `Select`.
The names come from Logitech's catalogue, matched by decoding each stored code into its bit frame, so a
table index predicts a word Logitech chose through a route with nothing in common. The three table pointers
are three distinct addresses holding identical copies; nothing requires that, so a reader must not assume
one table serves all three[^s154].

`minimum` is a **floor** and not a width: the conversion raises it to however many digits the value needs,
and the sample declares 0. `flags` is `0x04` there, arming the prefix at a hundred while the prefix
instruction is NULL, so the mechanism is switched on and does nothing[^s154]. Bit 0 and the bits above 2
are not confirmed in a configuration[^unchecked].

**On arch 16 (Harmony 300 and 350) a configuration Logitech compiled holds a record too**: with five
favourite channels put on one device, raw slot 11 goes from a count of zero to a count of one and no other
slot changes that way, which is what names base slot 16 on that architecture. The record is this layout
with nothing adjusted, its three digit tables are distinct and thirty bytes apart, all thirty entries call
lists that send codes from one group, and `flags` is 0 against the Harmony One sample's `0x04`[^s262b].
Where a device's codes sit on that architecture is [its memory page](../architectures/harmony-300-350/memory.md).

Read with `gspm.number_senders` and `tables.numberSenders`.

## Base slot 15: the parameter block

The model's constants: how bright the display light is at each step, how the battery voltage maps to the
gauge, how long a fade takes. Nothing here belongs to a device.

**Confirmed on the twelve containers whose architecture has a firmware reading of the guard**, six of arch
12 (Harmony One) and six of arch 14 (Harmony 600 and 700), and every length claim below is a literal in the
firmware rather than a count of what the configurations carry[^s44]. Arch 8 and arch 9 carry the section and
no image read here reads it, so their containers are outside the claim.

```
+0x00  u8   count
+0x01  u24  address[count]
```

and at each address a group

```
+0x00  u8   entries
+0x01  u16  value[entries]
```

The groups are laid out in one run immediately before the pointer array. On arch 8, arch 9 and arch 14 the
run is exactly the sum of the groups; arch 12 has twelve more bytes in it, past group 9[^s84].

### The firmware demands the lengths

**The firmware demands the section's count and every group's length.** The count is 9 on arch 14 and 11 on
arch 12. Each group is read only when its length matches the number that build expects, and otherwise the
subsystem silently uses constants compiled into the firmware[^s44]:

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

A blank is a group with no call site on the image that was read, not a length of zero. Arch 8 and arch 9
are absent because no firmware read here reads either. `gspm.PARAMETER_GROUP_COUNTS` carries this table and
`gspm.parameter_group_lengths_match` checks a container against it.

**A group index is not portable between architectures.** Arch 9's five groups line up with a subset of arch
12's in a different order, which is unlike every other indexed structure in this format[^s44].

### Arch 12's twelve bytes past group 9

The twelve bytes are `ff 00 ff 00 00 00 00 00 55 55 55 55` in all six arch 12 containers, no `u24` in any
container names their address, and **the firmware reaches them by overrunning group 9 on purpose**[^s103]:

| bytes above group 9's first entry | read by | as |
|---|---|---|
| 12 to 15 | `0x249A0` | the fourth pair of device levels, at four bytes a band |
| 16 to 23 | `0x2492E` | a table of two bit fields, four to a byte |

So group 9 is in effect a 24 byte structure whose header declares only its first six `u16` values. A writer
reproduces all twelve bytes; an editor that changed the declared length would move both readers' targets
without any check refusing it[^s103][^s106]. Their extent is these offsets and not the distance to the
pointer array, which matters to a tool claiming bytes: attributed by position, they absorbed 8 to 32 bytes
of any group whose declared entry count was damaged while every byte still read as accounted for[^s139].

### What the groups hold

On arch 12 (Harmony One), from the routines that read them. Every default is a literal in the firmware,
used when the length does not match[^s44][^s103]:

| group | what it is | the Harmony One's values | default |
|---|---|---|---|
| 0 | the display light fade's per step delay | 44 | 50 |
| 1 | entries 2 to 5 are four display light levels, 0 to 27; entries 0 and 1 are read and discarded | 38, 38, 20, 20, 26, 26 | 9, 16, 24, 27 |
| 4 | three threshold pairs, two apart, turning the four sample sum of analogue channel 1 into a band 0 to 3 with hysteresis | 96, 98, 308, 310, 768, 770 | none |
| 5, 6 | two measurement to level curves over analogue channel 0, eight levels, chosen by the charger input on `PORTB` bit 1: group 6 when it is clear | 3000 to 4051, and 3000 to 4170 | none |
| 7 | a timeout in seconds, handed to the one second scheduler | 0 | 10 |
| 9 | four pairs at four bytes a band, both halves sent to the I2C device at address `0x60` as its registers 2/3 and 4/5; band 3's pair is past the declared entries | 16, 16, 64, 64, 128, 128, then 255, 255 | 64 |

A level above 27 is **silently refused** by the setter, which a writer has to respect: 27 is the number of
distinct `CVREF` voltages the part can produce, and the ladder that maps a level to one is in the
firmware[^s103].

**Groups 5 and 6 are battery millivolts.** On arch 12 the value walked against them is
`mean * A + ((mean * B) >> 16)` where the mean is eight samples of analogue channel 0 and `A` and `B` are two
`u16` in the remote's own internal page `0xFF`, giving 4.284 mV a converter count, and the firmware compares
the result against the literal 3400[^s105]. The thirteen two bit fields are channels of the I2C device at
`0x60`, whose part is not identified: thirteen channels of three states, two eight bit level registers, an
enable pin and no readback[^s106]. That device is the Harmony One's,
[its hardware page](../remotes/harmony-one/hardware.md).

**On arch 14 group 3 is a second light's four levels**, read by a routine built like group 1's light
routine, which fills `0xD2F` to `0xD32` where group 1's fills `0xD2E` to `0xD31` and keeps its state in
variable 12 rather than 10; the levels it falls back to are 3, 5, 10 and 32, group 1's own. Which light is
not established[^s392]. What analogue channel 1 measures, and groups 2, 3 on arch 12, 8 and 10, are not
established[^unchecked].

**Nothing here is per device.** The group lengths are one shape per architecture over containers holding 0
to 7 devices, and the **values** are shared across containers with different device counts: sixteen
containers carry five distinct value sets, four of them shared by containers whose device counts differ, the
widest by six containers holding 3, 4, 6 and 7 devices. The fifth set is the two Harmony 700 configurations,
one model and six devices each, so it is silent rather than contrary. What the values track is the
**model**: the Harmony 600 and the Harmony 700 disagree about their display light levels and their battery
curves and about nothing else. A device's own numbers are state variables in base slot 13[^s234b].

### The values per model

**On arch 14 the values are one set per model**, 13 of 13: groups 0 to 8 are `44`, `3 5 10 32`, `44`, then
`1 3 5 32` on the Harmony 600, `10 20 8 32` on the Harmony 650 and `3 5 10 32` on the Harmony 700, then
`96 98 308 310 768 770`, group 5's curve, group 6's `2025 2075 2375 2425 2475 2525` and eight of 3300, `0`
and `1800 10980`. Group 5 is group 6's curve on the Harmony 700 and `2025 2075 2100 2125 2200 2525` and eight
of 3300 on the other two[^s347]. `PARAMETER_VALUES` in `packages/codec/src/families/four-slot/wiring.ts`.

**On the Harmony One one set is on all 19 distinct compiles**, group 9's twelve bytes past its declared
entries included. The groups the table above does not read hold `60`, `80`, `2500, 10980` and
`129, 21, 3, 1, 0, 0, 0, 0` (groups 2, 3, 8 and 10)[^s407]. `TOUCH_PARAMETERS` in
`packages/codec/src/families/touch/parameters.ts`.

`buildParameterBlock` in `packages/codec/src/firmwaresections.ts` builds the section from the model's values
and checks it against `PARAMETER_GROUP_COUNTS`, refusing a group of another length, byte for byte on the 19
Harmony One compiles and the thirteen arch 14 ones[^s407].

Read with `gspm.parameter_groups`.

## Base slot 4: the firmware event map

How the firmware's own events, and its status screens, find a mode of the configuration.

Confirmed on 15<!--fact:user_configs--> user configs across four architectures, the same shape in every
one[^s36].

```
+0x00  u24  fallback        used when no key matches
+0x03  u16  count           thirty, always
+0x05  { u8 key; u24 value }[count]
```

Keys are `0` to `29`, contiguous. Values are `N` to `N + 29`, contiguous, and the fallback is `N`. Only `N`
varies: 19 on the Harmony 700, 14 on the Harmony 600, 11 on the Harmony 525, 10 on the Harmony One, 4 on the
Harmony 880 and 885[^s36]. **This section is 125 bytes**, not the 419 to 1532 that the distance to the next
pointer reports, since a section's size is not the gap to the next pointer, [the container](container.md).

The firmware raises an event by loading a literal key and looking it up here, and the value goes to the same
register opcode `0x7E`'s operand goes to. So the two share a numbering space, and the block `N` to `N + 29`
is **reserved**: across 15<!--fact:user_configs--> user configs `0x7E` names
1593<!--fact:event_map_operands--> distinct operands and lands inside the block on the two Harmony 525
configurations and nowhere else, at operand 25 in both. On a Harmony One configuration the configuration
uses 0 to 9, the block takes 10 to 39, and the configuration resumes at 40, abutting on both sides[^s36].
What the thirty events are, and what the numbering space counts, are not established.

**`N` is the count of the firmware's own screens at the front of base slot 6**, 14 on the Harmony 600 and
650 and 19 on the Harmony 700, and the key is a status code: mode `N` draws "Go to Website to update
settings" and `N + 26` "Configuration Corrupted", status codes 0 and 26[^s249], on 13 of 13 compiles,
generated by `buildWiring`[^s347].

**On the Harmony 600 and 650 only the status screen routine interprets it**, for five codes, and none of
those is drawn from the configuration as far as the code reads: four are asked for with the built in status
screens selected, and "Application Terminated" sits behind a state the main loop never leaves there[^s355].

Read with `gspm.event_map`.

## Base slot 2: the log area

A region of flash above the configuration that the remote may append records to and never erases. No
configuration examined appends to it, and on the Harmony One the region is already full.

Confirmed on 19<!--fact:containers--> containers across four architectures, and on the arch 12 image, which
is the only firmware read that writes to it[^s47].

```
+0x00  u16  capacity        u24 on arch 12, where the section is nine bytes
+0x02  u24  start           the first byte of the region
+0x05  u24  limit           one past its last byte
```

`limit - start == capacity * stride`, exactly, in every container, with one stride per architecture: **8
bytes on arch 8, arch 9 and arch 14, and 1 on arch 12**. The region always sits above the configuration's
`end_addr`, and `limit` is always a round flash boundary: `0x080000`, `0x100000`, `0x200000` or `0x400000`,
except arch 8, which stops 8 KiB short of 2 MiB at `0x1FE000`[^s47].

| container | arch | capacity | start | limit |
|---|---|---|---|---|
| Harmony 600 and 700 | 14 | 16384 | `0x1E0000` | `0x200000` |
| safe mode, all three | 14 | 16384 | `0x0E0000` | `0x100000` |
| Harmony One | 12 | 16 | `0x3FFFF0` | `0x400000` |
| Harmony 525 | 9 | 8192 | `0x070000` | `0x080000` |
| Harmony 880 and 885 | 8 | 15360 | `0x1E0000` | `0x1FE000` |

On arch 14 every user configuration states `16384, 0x1E0000, 0x200000`, 13 of 13[^s347].

**Logitech's own client declares the arch 14 region and it is the safe mode row exactly**: its per
architecture constants give a user logging base of `0x0E0000` and a size of `0x20000`[^s206]. So that row is
corroborated by a route with nothing in common with the configurations. It says nothing about the user
configuration row one megabyte above it, and which of the two a remote wants is open; a writer reproducing
this section copies what the input declared. Where each region lies in a model's flash is its memory page,
such as [the Harmony 600, 650 and 700's](../architectures/harmony-600-650-700/memory.md).

### How the Harmony One writes it

The arch 12 firmware scans the region at boot, at `0x2DB4C`, for the last byte that is not `0xFF`, and
appends after it, so the write position is recovered from the erased pattern rather than stored. The append
routine at `0x2DC0A` writes one byte per call, refuses an address outside `[0x040000, 0x400000)`, and refuses
once `capacity` units are used up. Its only callers are five branches of the operand ladder that drives
timers, operand high `0xE1` to `0xE5`, appending one to six bytes each[^s47b]. **Case 3's record is a
timestamp**: its six bytes reversed are year, month, day, hour, minute and second, taken from the clock's
variables at data memory `0x108` to `0x10E`. The other four cases are shapes without meanings[^s47b].

**On the Harmony One the facility is dead.** `0x3FFFF0` to `0x400000` reads `00 ff` repeating with the last
byte `0x00`, so the boot scan recovers the position after offset 15, which is `0x400000`, and the append's
own upper bound rejects it by zeroing the remaining count[^s111]. A writer cannot use this region without
erasing a 64 KiB block inside the configuration region first. **No configuration examined appends to it**,
so a writer that copies these three numbers unchanged is doing everything the compiler does[^s47].

### What an entry holds

**Logitech's classic client names this section `SECTION_FLASH_STORAGE`**, base slot 2 on every architecture
that has a section table[^t-host-client], and it reads the region as a log of timestamped events, with the
same stride of 8 that the arithmetic above derives[^unchecked]. As that client reads it, an entry is eight
bytes, and the byte at `+0x07` says how many are used:

| `+0x07` | layout |
|---|---|
| 5 | `u8 type; u8 index; u24 ticks` |
| 7 | `u16 type; u16 index; u24 ticks` |
| 255 | erased |
| anything else | present, and not parsed |

`ticks` is **signed 24 bit seconds relative to the configuration's build date**, which is base slot 3, so slot
3 is the epoch for slot 2's log. The client stops reading after more than three consecutive erased entries,
which mirrors the firmware's own scan for the last byte that is not `0xFF`. **This layout is arch 7, 8 and 9
only.** On arch 12 and 14 the client reads the region in raw 256 byte blocks and does not parse it, and on
arch 12 it does not read the region at all unless a hardware flag is set, which it asks for with read
selector 12[^unchecked]. None of this is checked against a firmware.

**On arch 16 (Harmony 300 and 350) the configuration states what it logs**: its own metadata describes two
records, an `InfraredEvent` carrying a three byte `CurrentTime`, a device and a command, and a
`DeviceSelected` carrying a device index, so those remotes log which command was sent to which device and
when, and which device was picked[^s260]. Its base slot 2 is byte for byte the Harmony 525's[^s260].

### Built

`buildLogArea` in `packages/codec/src/firmwaresections.ts` writes the section from the per architecture
table `LOG_AREAS`, which holds the user configuration rows of arch 12 and arch 14: byte for byte on all 19
distinct Harmony One compiles, with its `u24` capacity[^s407], and on the thirteen arch 14 compiles[^s347].
The safe mode row is not built.

Read with `gspm.log_area`; `gspm.log_reference` names the append case an instruction selects.

[^s35]: Read in the firmware. [Section 35](../../docs/findings.md#s35)
[^s35b]: Measured in configurations. [Section 35](../../docs/findings.md#s35)
[^s276]: Read in the firmware. [Section 276](../../docs/findings.md#s276)
[^s284]: Read in the firmware. [Section 284](../../docs/findings.md#s284)
[^unchecked]: Not checked.
[^s274]: Read in the firmware. [Section 274](../../docs/findings.md#s274)
[^s276b]: Measured in configurations. [Section 276](../../docs/findings.md#s276)
[^s277]: Measured in configurations. [Section 277](../../docs/findings.md#s277)
[^s60]: Measured in configurations. [Section 60](../../docs/findings.md#s60)
[^s332]: Read in the firmware. [Section 332](../../docs/findings.md#s332)
[^s130]: Measured in configurations. [Section 130](../../docs/findings.md#s130)
[^s86]: Measured in configurations. [Section 86](../../docs/findings.md#s86)
[^s277b]: Read in the firmware. [Section 277](../../docs/findings.md#s277)
[^s322]: Read in the firmware. [Section 322](../../docs/findings.md#s322)
[^s138]: Read in the firmware. [Section 138](../../docs/findings.md#s138)
[^s111]: Measured on a unit. [Section 111](../../docs/findings.md#s111)
[^s74]: Read in the firmware. [Section 74](../../docs/findings.md#s74)
[^s407]: Measured in configurations. [Section 407](../../docs/findings.md#s407)
[^s284b]: Measured in configurations. [Section 284](../../docs/findings.md#s284)
[^s103]: Read in the firmware. [Section 103](../../docs/findings.md#s103)
[^s105]: Read in the firmware. [Section 105](../../docs/findings.md#s105)
[^s369]: Read in the firmware. [Section 369](../../docs/findings.md#s369)
[^s234]: Measured in configurations. [Section 234](../../docs/findings.md#s234)
[^s235]: Stated by Logitech, by their service. [Section 235](../../docs/findings.md#s235)
[^s335]: Measured on a unit. [Section 335](../../docs/findings.md#s335)
[^s288]: Measured in configurations. [Section 288](../../docs/findings.md#s288)
[^s319]: Measured in configurations. [Section 319](../../docs/findings.md#s319)
[^s283]: Measured on a unit. [Section 283](../../docs/findings.md#s283)
[^s301]: Measured on a unit. [Section 301](../../docs/findings.md#s301)
[^s303]: Measured on a unit. [Section 303](../../docs/findings.md#s303)
[^s360]: Measured in configurations. [Section 360](../../docs/findings.md#s360)
[^s235b]: Measured in configurations. [Section 235](../../docs/findings.md#s235)
[^s393]: Measured in configurations. [Section 393](../../docs/findings.md#s393)
[^s235c]: Stated by Logitech, by their service. [Section 235](../../docs/findings.md#s235)
[^s39b]: Measured in configurations. [Section 39](../../docs/findings.md#s39)
[^s324]: Measured in configurations. [Section 324](../../docs/findings.md#s324)
[^s319b]: Read in the firmware. [Section 319](../../docs/findings.md#s319)
[^s279]: Measured in configurations. [Section 279](../../docs/findings.md#s279)
[^s280]: Measured in configurations. [Section 280](../../docs/findings.md#s280)
[^s376]: Measured in configurations. [Section 376](../../docs/findings.md#s376)
[^s43]: Measured in configurations. [Section 43](../../docs/findings.md#s43)
[^s43b]: Read in the firmware. [Section 43](../../docs/findings.md#s43)
[^s292]: Measured on a unit. [Section 292](../../docs/findings.md#s292)
[^s347]: Measured in configurations. [Section 347](../../docs/findings.md#s347)
[^s410]: Measured in configurations. [Section 410](../../docs/findings.md#s410)
[^s430]: Measured in configurations. [Section 430](../../docs/findings.md#s430)
[^s154]: Measured in configurations. [Section 154](../../docs/findings.md#s154)
[^s156]: Measured in configurations. [Section 156](../../docs/findings.md#s156)
[^s262]: Measured in configurations. [Section 262](../../docs/findings.md#s262)
[^s39]: Read in the firmware. [Section 39](../../docs/findings.md#s39)
[^s262b]: Measured on a unit. [Section 262](../../docs/findings.md#s262)
[^s44]: Read in the firmware. [Section 44](../../docs/findings.md#s44)
[^s84]: Measured in configurations. [Section 84](../../docs/findings.md#s84)
[^s106]: Read in the firmware. [Section 106](../../docs/findings.md#s106)
[^s139]: Measured in configurations. [Section 139](../../docs/findings.md#s139)
[^s392]: Read in the firmware. [Section 392](../../docs/findings.md#s392)
[^s234b]: Measured in configurations. [Section 234](../../docs/findings.md#s234)
[^s36]: Measured in configurations. [Section 36](../../docs/findings.md#s36)
[^s249]: Read in the firmware. [Section 249](../../docs/findings.md#s249)
[^s355]: Read in the firmware. [Section 355](../../docs/findings.md#s355)
[^s47]: Measured in configurations. [Section 47](../../docs/findings.md#s47)
[^s206]: Stated by Logitech, in their client. [Section 206](../../docs/findings.md#s206)
[^s47b]: Read in the firmware. [Section 47](../../docs/findings.md#s47)
[^t-host-client]: Stated by Logitech, in their client. [The test](../../tests/test_host_client.py)
[^s260]: Measured in configurations. [Section 260](../../docs/findings.md#s260)
