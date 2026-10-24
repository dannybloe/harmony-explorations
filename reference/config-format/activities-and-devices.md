# Activities and devices

An **activity** is "Watch TV": pressing it switches devices on, sets their inputs, and points the keypad
at a mix of them, volume to the amplifier and channels to the set top box. A **device** is one piece of
equipment the remote controls, with its own commands and its own screen of them.
[How a Harmony works](../how-a-harmony-works.md) is the product side of both.

Nothing in a configuration is labelled "activity", and nothing is labelled "device" either. An activity
is a value of one counting variable; its keypad map is one entry of the key map table; a row on the
activity menu starts it; and its start does not list the commands to send but the state each device
should be in, power on, input 2, and the commands come out of each device's own reaction to that state.
A device is spread out the same way: its infrared codes are a group in the infrared records, its power
and its input are state variables, and its screen and keypad map are a mode.

This page first says how a configuration's devices are found and named and what a button sends, then
takes an activity apart into the seven structures a builder has to touch, each with a rule for building
one and a check that can fail.

## Devices

### Which devices a configuration drives, and what each one is called

Measured on 15<!--fact:user_configs--> user configurations across four architectures, which name
63<!--fact:devices_named--> of 63<!--fact:devices_total--> devices[^s126]. A device that sends codes is an
infrared group[^s86], so the list starts from base slot 5's group array and the question is the name.

**A device can send nothing.** On the Harmony One and on the Harmony 600, 650 and 700 the drawn device
list itself is the population, and a row whose mode reaches no group is a device with no group and no
codes[^s240][^s285], unless its label names exactly one device already found that has no mode yet,
underscores read as spaces and a trailing `..` being the screen's elision. That exception is fitted to one
case, a Harmony 600's Chromecast, a group of no codes and a mode whose one page binds nothing, with one
negative, a Wii that names nothing; a cut the screen does not mark with `..` is not matched[^s285].

A level 1 name in the name tree that belongs to a device is spelled

```
<label>_<property>_<values>
```

where `<label>` is the person's own words for the device, underscores included and up to four tokens,
and `<property>` is one word: `Power`, `Input`, `InputType`, `TVInput`, `CompAVInput`, `Screen`[^s126].
**A name belonging to the configuration has a number in the property's place instead**,
`CurrentActivityState_0_4`, `CurrentLocation_1`, and on the Harmony 600, 650 and 700 the delay family
whose qualifier is a Logitech device identifier. No property is spelled as a number, and that is the
discriminator[^s126].

Which infrared group a label belongs to comes from base slot 13. The variable's record carries its
transitions, each holding one action list instruction; for a device's `Power` or `Input` variable that
instruction is `0x7F`, and the list it names carries the `0x7D` that sends the code, whose operand's high
byte is the group[^s126]. Three routes, in this order:

| route | devices | how |
|---|---|---|
| the names | 55 | the variable's transitions reach exactly one group |
| elimination | 5 | one label and one group left unpaired |
| the screen | 3 | the title of the device's own mode, when one candidate survives |

102 device variables reach exactly one group, 13 reach none because the variable has nothing to switch
between, and **none reaches two**. No two variables of one device disagree and no two devices claim one
group; the reader refuses both rather than choosing, and neither happens in the corpus[^s126].

Two independent checks[^s126]:

* **the label is drawn**, 53 of 55 exactly and 2 as a prefix a menu truncated, which is base slot 0's
  ASCII and base slot 7's glyph pixels agreeing through two readers that share no code;
* **on the Harmony 525 and the Harmony 600, 650 and 700 the device's own mode draws its label as a
  title**, 17 of 17, where shifting the pairing to the next group breaks 16 of 16 shiftable cases. The
  Harmony 880 and 885 and the Harmony One draw no title, 1 of 31 and 0 of 7, which is why that is the
  last route and not the first.

`packages/codec/src/inventory.ts` is the reader: `devices`, `deviceVariables`, `deviceModeTitles` and
`infraredGroupsPerList`. `make devices` prints the figures with the source column, which is the number to
watch rather than the total.

### What a button sends

**A command has no name.** An infrared record is a code and an index in its group, so an editor names a
command only where a screen draws a label for the key that sends it.

**What a button sends** is the codes of the base slot 10 list a tagged list binds it to, and **both kinds
of tagged list carry such bindings**: a mode page's list holds the screen keys, 3106 of them, and a base
slot 9 set holds the keypad keys while an activity runs, 1342[^s126]. A Harmony One's volume keys are in
its activities' sets and in no mode page at all. 85 bindings send several codes, which is a macro, so the
order is part of what the binding does[^s126]. **4431 of the 4448 are event type `0x80`, a press**, and
the seventeen that are not are event type 0 in a set, tags 1, 2 and 5, which are its enter and leave
handlers rather than keys: nothing sends a code on a release or a repeat[^s126]. `keyCodes`.

A device's own keypad and screen map, what device mode gives a person, is its mode record,
[Modes and keys](modes-and-keys.md#a-devices-mode-is-device-modes-keypad-map).

### Which devices an activity drives

The groups its base slot 9 set addresses, that set being the key map the activity installs[^s120]. One
to three per activity across the corpus, and every group is one the configuration has[^t-inventory].
Taken over the whole set rather than the start sequence alone, since an activity that sends the volume
to a receiver is using it either way. `activities`, and `inventory` composes the lot into one object so
that an application does not have to know the order these readers run in.

## The seven structures, in the order a builder touches them

**An activity is not a list of commands.** It is a statement of what the room should look like, and the
commands come out of the gap between that and what the remote believes the room looks like now.

The structures below were first read off a Harmony One's factory configuration, which holds exactly one
device and one activity, the smallest form of every structure an activity needs, and each rule, P1 to P9,
was then scored against the corpus[^unchecked]. Where a rule held only on some architectures, it says
which.

### 1. A value of the activity counter

The configuration has one state variable that counts activities, named `CurrentActivityState` by its own
name tree. **An activity is a value of it.** The factory configuration's variable takes two values: the
activity is 0, and 1 is the idle value, meaning no activity is running[^s120].

**How an activity is numbered**, over all fifteen user configurations[^s273]. The variable takes the
values `0` to its record's `second`, and:

| | measured |
|---|---|
| those values are **exactly** the activity values plus the idle value, no gap and nothing spare | 15 of 15 |
| `second` equals the **activity count** | 15 of 15 |
| the idle value is never itself an activity value | 15 of 15 |
| base slot 9 holds one activity entry per activity value, no duplicate and no spare | 15 of 15 |
| the idle value is the maximum | 12 of 15 |
| the idle value sits **inside** the run, an activity holding the maximum | 3 of 15 |
| and where it does, it is exactly **one below** the maximum | 3 of 3 |

The first row follows from the second and third and is measured rather than derived. The three with the
idle value inside the run are a Harmony One configuration and the Harmony 880 and 885
configurations[^s273].

**The idle value is the record's `first` field**, base slot 13 at `+0x00`, and no binding writes it, in
fifteen of fifteen user configurations[^s120]. The firmware seeds every state variable from its record's
`first` at boot, on all three architectures whose firmware is read, so **nothing has to work out which
value is idle**: it is the counter's ordinary starting value[^s274], [State](state.md#base-slot-13-the-state-variable-table).
The last two rows of the table describe where a compiler happened to put a number rather than anything a
reader needs to infer. A Harmony 525 safe mode container is the one place a list writes the idle value,
and it is the one with zero activities: that list returns the remote to idle rather than starting
anything[^t-inventory].

**The name tree states the value count as well**: the node is `CurrentActivityState_0_<values>` and the
trailing number is `second + 1`, which is the rule for every named variable, over 276[^s86][^s273].
Because the count is text, raising it can make the name **longer**, and then changing the activity count
is a length edit to base slot 0 and not a field poke. In the corpus one configuration in fifteen is at
that boundary, nine values going to ten[^s273].

**An activity has no name tree node of its own**, where a device does: the tree names the variable, and
the activity's own label is drawn on the menu page as pixels. So structure 7 is where an activity gets its
name, and this structure touches the tree only for that count.

*The check that can fail*: the number of action lists that write this variable equals the number of
activities, `activityWriterCount` against `activityCount`, 8 and 8 on a Harmony One configuration with
eight activities and 3 and 3 on a Harmony 600 configuration[^t-inventory].

**P1.** A builder adding an activity adds one value to this variable's range and writes that value from
exactly one place. Where the idle value sits varies, so **a builder must not assume the idle value is the
highest**, nor take `second + 1` for unused without checking the record. The rule for adding one, which is
inference rather than measurement since nothing here watched an addition: raise `second` by one, give the
new activity the new maximum, and leave the idle value where it is[^unchecked].

### 2. One entry in the key map table

Base slot 9. The activity's own keypad map, in a table that is a fixed per model prefix the configuration
never selects, one entry per activity, and exactly one more,
[Modes and keys](modes-and-keys.md#what-an-entry-is-a-fixed-prefix-one-per-activity-and-one-more)[^s272].
The factory configuration has 9 entries, of which 7 are the prefix, 1 is this activity and 1 is the left
over[^s272].

The factory activity's entry is a tagged list of 29 entries: three lifecycle handlers on tags 1, 2 and 5,
one binding for the Devices key, one for a help screen, and 24 keys that send an infrared
code[^unchecked].

**An entry's position in base slot 9 does not encode its activity number.** Of the ten user configurations
holding more than one activity, none has its activity entries in value order; the five that are in order
are exactly the five holding a single activity. One Harmony One configuration's eight read 2, 0, 3, 4, 6,
8, 1, 5. The number is carried by the write inside the enter list, structure 4, and by nothing
structural[^s273].

*The check that can fail*: the table's length is the model's prefix plus the activity count plus one, 16
= 7 + 8 + 1 and 9 = 5 + 3 + 1 on the two scored configurations[^s272].

**P2.** A builder adds exactly one entry here per activity, after the prefix, and the prefix never moves.
Appending is safe, since the position says nothing[^s273].

### 3. Three lifecycle handlers on that entry

**A lifecycle handler has event type 0.** A tag carries an event type in its top two bits and a scan code
in the rest, so a **release** of scan 3 is `0x43` and sits below `0x80` looking exactly like a handler;
every activity on the Harmony 600, 650 and 700 carries one, Help's release[^s17][^s333]. What separates
the two is the event type, not the size.

Every activity in the corpus carries the same three handlers of event type 0[^s273]:

| tag | what it is |
|---|---|
| 1 | **enter**: run when the activity starts. This is the whole of the start sequence |
| 2 | **leave**: run when it stops. Cancels the timers and restores the display |
| 5 | **picked again**: run when the activity asked for is the one already running[^s313]. It re-sends the inputs with no power change and goes to the working screen, directly or through the Remote Assistant's branch, without the start up screen |

**Tag 5's state writes are a subset of tag 1's**, on 50 of 50, and empty on 24[^s273]. The tighter
reading that they are a **prefix** of tag 1's holds on 28 of 50, so 4 of the 26 that write anything, and
on every activity of all four Harmony 880 and 885 configurations; "the enter list without the power
writes" matches 0 of 50[^s273]. Tag 5 always runs a real list and never the null instruction[^s273]. On
the Harmony 600, 650 and 700 Logitech's compiler fills it with `S := 1`, tag 1's input steps, `F := 1`,
the working screen step tag 1 defers taken directly, and `S := 0`, on 43 of 43 of its activities, with no
start up screen, power write or activity write[^s313].

**A leave handler may be a null instruction**, opcode 0 operand 0: 21 of the 50, all of them on the
Harmony 880 and 885 and the Harmony 525, against 29 that run a list[^s273].

**The left over entry has no leave handler**: it carries tags 1 and 5 on 15 of 15, where all 50 activity
entries carry exactly 1, 2 and 5[^s273]. That is what lets it be recognised from its own bytes rather
than only defined by exclusion.

*The check that can fail*: every activity entry has all three, and every one of the 63 activity bindings
of the corpus reaches an entry carrying them[^t-inventory].

**P3.** Tag 5 is present on every activity on every architecture, and a builder must emit it. Pointing it
at the enter list sits inside the measured envelope trivially and is not what Logitech compiles: it
replays the whole start, start up screen and power writes included, where Logitech's re-pick leaves both
out; what that does on a remote has not been measured[^unchecked]. `composeActivity` does that only where
it cannot do better, and on the Harmony 600, 650 and 700 with a screen builds Logitech's own list instead:
the start variable, the input writes, the flag and the working screen, nothing switched[^s313]. A builder
must not give the left over entry a tag 2, and may emit a null leave handler where there is nothing to
undo[^s273].

### 4. The start sequence, which sets state rather than sending codes

**This is the load bearing structure for a builder and it is the opposite of the obvious design.** The
enter list does not name the codes the activity sends. It writes the **device's** state variables, and
the code goes out because that variable's transition runs a list that sends it[^t-inventory].

The factory activity's enter list, in order[^unchecked]:

1. enter a screen mode that binds every key to a list that does nothing, which is the "starting" screen
2. cancel all four running timers
3. set the television's power variable to 1
4. set the television's input variable to 0
5. set the activity counter to this activity's value
6. run three shared routines: one that silences the next state write, one helper chain, one that sets the
   display's backlight

Steps 3 and 4 are where the device is actually driven. What reaches the send queue, in order, is the power
code, a ten second delay, then the input code three times with a two second delay after the first. None
of those six things is written in the activity[^unchecked].

*The check that can fail*: walk the enter list following only the nested calls and count the sends; count
again with `activityStartSteps`, which follows a state write into the transition it triggers, and a write
that transition itself makes. Over the whole corpus **424** sends are found the second way and **12** the
first[^t-inventory].

**P4.** A builder produces an activity by deciding the target state of each device it drives, and the
codes follow from the transitions the device already has. It never emits a send instruction of its own.

**P5.** The 12 inline sends are on the Harmony 880 and 885 and the Harmony 525, on neither architecture
the rules were scored on, and they are not explained. A builder that emits none is right about
97% of the corpus, and a reader must not assume none exist[^t-inventory].

### 5. A power on delay that belongs to the device, not to the activity

The delay is a per device quantity pushed onto the send queue, and the queue holds back a command only
when an earlier entry names the same device[^s234][^s236]. So the delay stalls exactly one thing, the next
command to its own device, and an activity that sends a device its power code and nothing else cannot
show that device's delay however large it is: 37<!--fact:delay_unfelt--> of 129<!--fact:delay_pairs-->
pairs of an activity and a device it switches on cannot[^t-inventory].

**Where the delay is kept is per architecture**[^s235]. On the Harmony 880 and 885, the Harmony 525 and
the Harmony One it is a `0x7C` inline in the list that switches the device on, so the activity inherits
it from the device's list. On the Harmony 600, 650 and 700 it is a **state variable** of the device, so
there is no inline delay to inherit and `powerOnDelayReach` reports no pairs there[^t-inventory]. The
encoding is [Actions](actions.md#0x7c-is-a-per-device-delay-in-tenths-of-a-second).

The factory activity has one device with a ten second delay and sends it three further commands, so the
delay is felt[^unchecked].

*The check that can fail*: `powerOnDelayReach` reports, per activity and device, how many further commands
the activity sends that device. Zero means the delay is never felt.

**P6.** A builder does not put a delay in the activity. It sets the device's delay, in the device's list
or the device's variable as the architecture keeps it, and the activity inherits it.

### 6. A row on the activity menu, which is what starts it

The keypad map does not start the activity. A screen page does: one row on the activity menu, bound to an
action list that sounds a tone, selects the activity's key map, and sets the variable that says which top
level screen the remote is on[^s120].

**Which key starts which activity** takes four hops, and the reason it takes four is that nothing in the
format names an activity directly[^s120]:

1. a mode page's tagged list binds a key code to opcode `0x7F`, whose operand indexes base slot 10
2. that action list carries opcode `0x1F` with operand `0xFF | set`, selecting base slot 9 entry `set`
3. that entry's own tagged list carries a `0x7F` naming another base slot 10 list
4. that list writes `CurrentActivityState` with `0x80 | index`, and the operand is the activity

Measured on all eleven containers of the corpus that carry a name tree, four architectures[^s120][^s121].
Every binding in the corpus is a press. Every activity is reachable from a key, and **all of an activity's
keys are on one page**, so an activity belongs to one screen. An activity page's `0x7F` operands are a
**contiguous ascending run** of base slot 10 indices in the tagged list's own order, on 16 of 16 activity
pages against under half of pages generally, so a fresh run of action lists per activity menu is how the
compiler lays one out[^t-inventory].

**How many keys is per architecture**: an activity is bound by **two** keys on the Harmony 600, 650 and
700 and by exactly one on the Harmony 880 and 885, the Harmony 525 and the Harmony One, in 15 of 15 user
configurations[^s273]. Both of a Harmony 600's pair are presses of different keys on the same page, so the
second is not the first key's release. Which physical keys the four scan codes involved are is on
[the Harmony 600's keys page](../remotes/harmony-600/keys.md#what-the-drawing-does-not-yet-carry).

**An activity menu may be several pages.** 5 of the fifteen user configurations spread their activities
over more than one page and 10 use one, with three pages the most any of them uses[^t-inventory]. On the
Harmony One a menu page holds **three** rows, so eight activities sit on pages of 3, 3 and 2, a full page,
a full page and the remainder[^s275].

**On the Harmony One the page a row goes on is not a device list page**[^s275]. An activity menu page
enables **both** keys below the display where a device list page enables only the left one, so it offers
a different number of touch rectangles; neither menu binds a page turn, which the two keys beside the
display do. A row's scan code is its **position** in the page, so a row is appended after the last
rectangle and before the two edges, [Modes and keys](modes-and-keys.md#what-a-code-says).

**A menu may carry an entry that is not an activity**: one Harmony 880 configuration's menu has five
entries for four activities, the fifth being the remote's own settings, so a count taken from the menu
would be wrong[^s124]. Its description by the person who set it up says four devices and four activities,
which is what the readers report[^s124].

*The check that can fail*: every activity is reachable from a key, and all of one activity's keys are on
one page; on the Harmony 600, 650 and 700 both keys are on that page[^s273].

**P7.** A builder adds one row to the activity menu per activity, which is a screen edit and a tagged
list entry, and the rows of one menu are a contiguous run of action list indices. When the last page is
full the builder adds a **page**: a new page record, its own tagged list, its own screen program, and the
navigation that reaches it[^t-inventory][^s275]. On the Harmony 600, 650 and 700 it emits **two**
bindings per activity, or half the menu is dead[^s273].

### 7. A drawn name, and the screens the activity enters

The activity's name is drawn on the menu page, as pixels, at a stated position. It is also drawn by the
modes the activity's chain enters, since a remote entering an activity says which one, and that is what
lets a name be attributed to an activity at all[^s121].

**A drawn name is attributed through the modes the chain enters**, not through geometry. An activity's
action lists also carry opcode `0x7E`, entering base slot 6 modes, and those modes' pages draw the
activity's own name, so the page's string that relates to one of those strings is that activity's
label[^s121]. Four rules make it a function rather than a guess, in this order[^s121]:

1. **A string the modes say exactly beats one they only contain.** Containment either way is what the
   Harmony 700 needs, since its menu label is the name plus a qualifier and its splash screen is a verb
   plus the name, and it is too loose on its own: an activity's chain also enters the mode that lists the
   devices, so every activity of a configuration says every device's name, and a label that is the first
   word of one becomes a candidate for all of them.
2. **Chrome is dropped**: a string several activities of a page claim is a title or a footer, and so is
   one that another activity page of the same mode draws identically.
3. **One label belongs to one activity**, a constraint to propagate rather than a preference.
4. **A label the menu wraps onto a second row** is looked for only where nothing on one row resolved. The
   candidate is the row's text joined to a text on the next row down, and it is accepted when it is a
   **prefix** of something the modes say, since a menu truncates a long name to the rows it has. Not the
   same column: on the Harmony 525 the second line is not aligned with the first.

**On the Harmony One none of those four rules is used, because the container states the answer**[^s125].
A One's activity mode does not repeat the name its menu draws, and its scan codes cannot stand in for
position: the three activity pages of one configuration bind activities on scans {50,51,52}, {50,48,49}
and {48,49} while all three draw their labels on the same rows, so no fixed code to row map can exist.
Instead the key's own rectangle is looked up in base slot 17 through the mode page's `lead` index, and the
label is the text the firmware's own hit test puts inside it. One distinct label per rectangle, and the
eight activities of that configuration resolve on eight distinct keys. This route runs **first**, before
the string matching, because a stated answer beats an inferred one.

Together that names 50<!--fact:activities_named--> of the corpus's 50<!--fact:activities_total-->
activities, on all four architectures: **Harmony 880 and 885 22 of 22, Harmony 525 4 of 4, Harmony One 11
of 11, Harmony 600 and 700 13 of 13**[^s125].

`packages/codec/src/inventory.ts` is the reader: `activityBindings`, `activityNames`, `idleActivityValue`,
`activityWriterCount`. `make activities` prints the figures per container.

*The check that can fail*: the name resolves for every activity in the container.

**P8.** Spelling a name from the glyph sets a container already holds is the same job
`composeDeviceScreen` already does for a device, so this needs no new encoder.

## What an activity shares with a device, and must not duplicate

**The per key action lists are the device's**, not the activity's. In the factory configuration all 24
keys that send a code hold the same command as the device's own map, with none differing and none
missing; the device's map carries 6 keys the activity does not[^s271]. Across the corpus 1343 of 1676
activity key bindings are identical to a binding in the device's own map[^unchecked].

**How much of a device's map an activity reuses varies**, and the factory configuration is at one
extreme: across the eight activities of one Harmony One configuration the share runs from 35 of 35 down
to 4 of 29[^unchecked]. So "reference what the devices already put there" is right about the corpus as a
whole and would leave a builder badly wrong about an activity that is mostly its own bindings.

**The infrared codes are entirely the device's.** An activity adds nothing to the infrared records.

**Most of the action lists it reaches are shared machinery.** The factory activity reaches 109 action lists
and only **28** of them are reached by nothing else; across the corpus an activity owns between 10 and 29
exclusively. The rest are the backlight, the I2C work and the helper chains that every activity and every
device page runs[^unchecked].

**P9.** Composing an activity is on the order of 10 to 29 new action lists, one key map entry, one menu row,
one name, and one value on the activity counter. Everything else is reference to what the devices already
put there.

## Not checked

* The anatomy figures of the factory configuration's activity, and the sharing counts across the corpus,
  that carry no other footnote above: no test holds them[^unchecked].
* What adding an activity does to a running remote, and whether Logitech's compiler renumbers activities
  on a full compile, which would decide between the readings left for the three configurations whose idle
  value sits inside the run[^unchecked].
* Why the Harmony 600, 650 and 700 bind each activity with two keys[^unchecked].
* What a tag 5 that replays the whole start does on a remote[^unchecked].

[^s126]: Measured in configurations. [Section 126](../../docs/findings.md#s126)
[^s86]: Measured in configurations. [Section 86](../../docs/findings.md#s86)
[^s240]: Measured in configurations. [Section 240](../../docs/findings.md#s240)
[^s285]: Measured in configurations. [Section 285](../../docs/findings.md#s285)
[^s120]: Measured in configurations. [Section 120](../../docs/findings.md#s120)
[^t-inventory]: Measured in configurations. [The test](../../packages/codec/test/inventory.test.ts)
[^unchecked]: Not checked.
[^s273]: Measured in configurations. [Section 273](../../docs/findings.md#s273)
[^s274]: Read in the firmware. [Section 274](../../docs/findings.md#s274)
[^s272]: Measured in configurations. [Section 272](../../docs/findings.md#s272)
[^s17]: Measured in configurations. [Section 17](../../docs/findings.md#s17)
[^s333]: Measured in configurations. [Section 333](../../docs/findings.md#s333)
[^s313]: Read in the firmware. [Section 313](../../docs/findings.md#s313)
[^s234]: Measured in configurations. [Section 234](../../docs/findings.md#s234)
[^s236]: Measured on a unit. [Section 236](../../docs/findings.md#s236)
[^s235]: Measured in configurations. [Section 235](../../docs/findings.md#s235)
[^s121]: Measured in configurations. [Section 121](../../docs/findings.md#s121)
[^s275]: Measured in configurations. [Section 275](../../docs/findings.md#s275)
[^s124]: Measured in configurations. [Section 124](../../docs/findings.md#s124)
[^s125]: Measured in configurations. [Section 125](../../docs/findings.md#s125)
[^s271]: Measured in configurations. [Section 271](../../docs/findings.md#s271)
