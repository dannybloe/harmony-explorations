# Activities and devices

#### Which key starts which activity, and which drawn name it carries

**Confirmed on all eleven containers of the corpus that carry a name tree, four architectures.** The
chain from a key press to an activity, section 121, and the reason it is four hops is that nothing in
the format names an activity directly:

1. a mode page's tagged list binds a key code to opcode `0x7F`, whose operand indexes base slot 10
2. that action list carries opcode `0x1F` with operand `0xFF | set`, selecting base slot 9 entry `set`
3. that entry's own tagged list carries a `0x7F` naming another base slot 10 list
4. that list writes `CurrentActivityState` with `0x80 | index`, and the operand is the activity

Every binding in the corpus is event type `0x80`, a press. Every activity is reachable from a key, and
**all of an activity's keys are on one page**, in all eleven containers, so an activity belongs to one
screen. An activity page's `0x7F` operands are a **contiguous ascending run** of base slot 10 indices in
the tagged list's own order, on 16 of 16 activity pages against under half of pages generally, so a
fresh run of action lists per activity menu is how the generator lays one out.

**The value count is stated in the name tree as well**, section 86's rule over 276 named variables
applied here: the node is `CurrentActivityState_0_<values>` and the trailing number is `second + 1`.
A writer that changes the activity count changes both, and because the count is text the name can get
**longer**, which makes the insertion a length edit to base slot 0. In this corpus that is
`one_config` alone, at nine values going to ten. Section 273.

**Tag 5's state writes are a subset of tag 1's**, on 50 of 50, and empty on 24, section 273. The
tighter reading that they are a **prefix** holds on 28 of 50, 4 of the 26 that write anything, and on
every activity of all four arch 8 containers. It always
runs a real list and never the null instruction. **What fires it is read**, section 313: the activity
switch runs it when the activity asked for is the one already running. On arch 14 Logitech's compiler
fills it with `S := 1`, tag 1's input steps, `F := 1`, the working screen step tag 1 defers taken
directly, and `S := 0`, on 43 of 43 of its activities, with no start up screen, power write or activity
write; `composeActivity` builds that list for an arch 14 activity with a screen. This said what fires
it was unread until section 313.

**The extra entry has no leave handler**, section 273, which is what lets it be recognised rather than
only defined: it carries tags 1 and 5 on 15 of 15, where all 50 activity entries carry exactly 1, 2 and
5. A leave handler may itself be a null instruction, opcode 0 operand 0, on 21 of the 50 and all of
those on arch 8 and arch 9.

**How many keys is per architecture**, section 273: an activity is bound by **two** keys on arch 14 and
by exactly one on arch 8, 9 and 12, in 15 of 15 user configs. Both of an arch 14 pair are presses, so
the second is a second key and not the first key's release, and a writer for a Harmony 600 that emits
one binding per activity leaves half its menu dead. Which physical keys the four scan codes involved
are is not established, since a scan code does not transfer between skins.

**`first` is what the firmware seeds the variable with at boot, on all three architectures whose
firmware is in hand**, section 274: each one asks its section seeker for raw slot 13, reads the header
and walks the records, writing each `first` into its variable. So an initial value is **stated** and
nothing infers it. Two differences on arch 9 (Harmony 525): it carries no `0xFEFE` "no initial value"
marker, filling the array's unused tail with `0xFE` instead, and its guard is per variable rather than
all or nothing, skipping indices 0 to 12 where arch 12 (Harmony One) and arch 14 (Harmony 600 and 700)
either seed everything or nothing.

**On arch 14 the guard is a checksum**, section 283: an XOR seeded `0xA5` over the variable array from
its nineteenth byte, 174 bytes from data `0xE22` on the 600's and 650's 0.2 builds and 237 from `0x912`
on the 700 2.8 and the 650's 0.4 package, against a stored sum every store restamps. The seeder runs
only when a container validated, and a matching sum then skips every store. A user container that fails
validation does not reload: the variables above byte 18 are painted `0xFE`. **The 700 2.8 and the 0.4
force a reload after a cache drop**, a flag the drop sets and the next boot turns into a spoiled sum;
the 0.2 builds have no such flag. **Measured on a Harmony 650 running 0.2, a changed `first` was
nonetheless in force straight after a write and its restart**, both ways, and every restart put the
clock back to the configuration's stamp, so an unstamped configuration shows its stamp time. **A bare
restart, with nothing written, puts back every variable an activity changed**, although the sum
matched. The infrared sender's ring survives it unchanged, so the restart does not clear all of data memory;
whether the variables' bank is cleared or something at boot spoils or bypasses the sum is open.

**The idle value is the record's `first` field**, base slot 13 at +0x00, which section 60 read as an
initial value and marked unconfirmed. No binding writes it, in fifteen of fifteen user configs. The
arch 9 safe mode container is the one place a list writes the idle value, and it is the one with zero
activities: that list returns the remote to idle rather than starting anything.

**How an activity is numbered**, section 273, which replaced a description of twelve containers with a
rule that covers all fifteen. The variable takes the values `0` to its record's `second` and:

| | measured |
|---|---|
| those values are **exactly** the activity values plus the idle value, no gap and nothing spare | 15 of 15 |
| `second` equals the **activity count** | 15 of 15 |
| the idle value is never itself an activity value | 15 of 15 |
| base slot 9 holds one activity entry per activity value, no duplicate and no spare | 15 of 15 |
| the idle value is the maximum | 12 of 15 |
| the idle value sits **inside** the run, an activity holding the maximum | 3 of 15 |
| and where it does, it is exactly **one below** the maximum | 3 of 3 |

The first row follows arithmetically from the second and third and is measured rather than derived, so
the table states what was run rather than six independent results. **Nothing has to work out which
value is idle**: `first` states it and the firmware seeds the variable from it at boot, section 138, so
the last two rows describe where a compiler happened to put a number rather than anything a reader
needs to infer. The three with the idle value inside
the run are `one_config`, `arch8_config_880` and `arch8_config_885`.

**An entry's position in base slot 9 does not encode its activity number.** Of the ten user configs
holding more than one activity, none has its activity entries in value order; the five that are in
order are exactly the five holding a single activity. `one_config`'s eight read 2, 0, 3, 4, 6, 8, 1, 5.
The number is carried by the write in step 4 above and by nothing structural, so a writer may append.

**A drawn name is attributed to an activity through the modes the chain enters**, not through geometry.
An activity's action lists also carry opcode `0x7E`, entering base slot 6 modes, and those modes' pages
draw the activity's own name, because a remote entering an activity says which one. So the page's string
that relates to one of those strings is that activity's label. Four rules make it a function rather
than a guess, in this order:

1. **A string the modes say exactly beats one they only contain.** Containment either way is what the
   Harmony 700 needs, since its menu label is the name plus a qualifier and its splash screen is a verb
   plus the name, and it is too loose on its own: an activity's chain also enters the mode that lists
   the devices, so every activity of a config says every device's name, and a label that is the first
   word of one becomes a candidate for all of them.
2. **Chrome is dropped**: a string several activities of a page claim is a title or a footer, and so is
   one that another activity page of the same mode draws identically.
3. **One label belongs to one activity**, a constraint to propagate rather than a preference.
4. **A label the menu wraps onto a second row** is looked for only where nothing on one row resolved.
   The candidate is the row's text joined to a text on the next row down, and it is accepted when it is
   a **prefix** of something the modes say, since a menu truncates a long name to the rows it has. Not
   the same column: on the Harmony 525 the second line is not aligned with the first.

**On arch 12 none of those four rules is used, because the container states the answer.** A One's
activity mode does not repeat the name its menu draws, and its scan codes cannot stand in for position:
the three activity pages of `one_config` bind activities on scans {50,51,52}, {50,48,49} and {48,49}
while all three draw their labels on the same rows, so no fixed code to row map can exist. Instead the
key's own rectangle is looked up in base slot 17 through the mode page's `lead` index, and the label is
the text the firmware's own hit test puts inside it. One distinct label per rectangle, and the eight
activities of `one_config` resolve on eight distinct keys. This route runs **first**, before the string
matching, because a stated answer beats an inferred one.

Together that names 50<!--fact:activities_named--> of the corpus's 50<!--fact:activities_total-->
activities, on all four architectures: **arch 8 22 of 22, arch 9 4 of 4, arch 12 11 of 11, arch 14 13 of
13.**

`packages/codec/src/inventory.ts` is the reader: `activityBindings`, `activityNames`,
`idleActivityValue`, `activityWriterCount`. `make activities` prints the figures per container.

**The device and activity counts are checked against a contributor's own description**, section 124: the
owner of one arch 8 remote wrote down what is in his config, and it says four devices and four
activities where the reader says four and four. Its menu has five entries, the fifth being the remote's
own settings, which is why a count taken from the menu would be wrong. Its idle value is 3, strictly
inside the values its keys write, which is the second container to show that the idle value is `first`
and not the highest.

#### Which devices a config drives, and what each one is called

**Confirmed on 15<!--fact:user_configs--> user configs across four architectures**, section 126,
which names 63<!--fact:devices_named--> of 63<!--fact:devices_total--> devices. A device that sends codes is an
infrared group, section 86, so the list starts from base slot 5's group array and the question is
the name. **A device can send nothing**, section 240: on arch 12 and, since section 285, arch 14 the
device list itself is the population, and a row whose mode reaches no group is a device with `group`
undefined and no codes, unless its label names exactly one device already found that has no mode yet,
underscores read as spaces and a trailing `..` being the screen's elision, which is the Harmony 600's
Chromecast: a group of no codes, and a mode whose one page binds nothing. Fitted to that one case, with
one negative, a Wii that names nothing; a cut the screen does not mark with `..` is not matched.

A level 1 name that belongs to a device is spelled

```
<label>_<property>_<values>
```

where `<label>` is the user's own words for the device, underscores included and up to four tokens, and
`<property>` is one word: `Power`, `Input`, `InputType`, `TVInput`, `CompAVInput`, `Screen`. **A name
belonging to the config has a number in the property's place instead**, `CurrentActivityState_0_4`,
`CurrentLocation_1`, and on arch 14 the delay family whose qualifier is a Logitech device identifier. No
property is spelled as a number, and that is the discriminator.

Which infrared group a label belongs to comes from base slot 13. The variable's record carries its
transitions, each holding one action list instruction; for a device's `Power` or `Input` variable that
instruction is `0x7F`, and the list it names carries the `0x7D` that sends the code, whose operand's
high byte is the group. Three routes, in this order:

| route | devices | how |
|---|---|---|
| the names | 55 | the variable's transitions reach exactly one group |
| elimination | 5 | one label and one group left unpaired |
| the screen | 3 | the title of the device's own mode, when one candidate survives |

The counts behind route one: 102 device variables reach exactly one group, 13 reach none because the
variable has nothing to switch between, and **none reaches two**. No two variables of one device
disagree and no two devices claim one group; the reader refuses both rather than choosing, and neither
happens in the corpus.

Two independent checks, both in `packages/codec/test/inventory.test.ts`:

* **the label is drawn**, 53 of 55 exactly and 2 as a prefix a menu truncated, which is base slot 0's
  ASCII and base slot 7's glyph pixels agreeing through two readers that share no code;
* **on arch 9 and arch 14 the device's own mode draws its label as a title**, 17 of 17, where shifting
  the pairing to the next group breaks 16 of 16 shiftable cases. Arch 8 and arch 12 draw no title, 1 of
  31 and 0 of 7, which is why that is the last route and not the first.

`packages/codec/src/inventory.ts` is the reader: `devices`, `deviceVariables`, `deviceModeTitles` and
`infraredGroupsPerList`. `make devices` prints the figures with the source column, which is the number
to watch rather than the total.

**A command has no name.** An infrared record is a code and an index in its group, so an editor names a
command only where a screen draws a label for the key that sends it.

**What a button sends** is the codes of the base slot 10 list a tagged list binds it to, and **both
kinds of tagged list carry such bindings**: a mode page's list holds the soft keys, 3106 of them, and a
base slot 9 set holds the hard keys while an activity runs, 1342. A Harmony One's volume keys are in
its activities' sets and in no mode page at all. 85 bindings send several codes, which is a macro, so
the order is part of what the binding does. **4431 of the 4448 are event type `0x80`, a press**, and the
seventeen that are not are event type 0 in a set, tags 1, 2 and 5, which are its enter and leave
handlers rather than keys: nothing sends a code on a release or a repeat. `keyCodes`.

**Which devices an activity drives** is the groups its base slot 9 set addresses, that set being the key
map the activity installs, section 120. One to three per activity across the corpus, and every group is
one the config has. Taken over the whole set rather than the start sequence alone, since an activity that
sends the volume to a receiver is using it either way. `activities`, and `inventory` composes the lot
into one object so that an application does not have to know the order these readers run in.

## The seven structures, in the order a builder touches them

### 1. A value of the activity counter

The configuration has one state variable that counts activities, named `CurrentActivityState` by the
configuration's own name tree. An activity **is** a value of it. The factory configuration's variable
takes two values, the activity is 0 and 1 is the idle value, meaning no activity is running.

*The check that can fail*: the number of action lists that write this variable equals the number of
activities. `activityWriterCount` against `activityCount`.

**P1.** A composer adding an activity adds one value to this variable's range and writes that value
from exactly one place.

**Section 273 says which value, and it is the part the factory specimen could not show**, having one
activity. The rule over all fifteen user configurations: the variable takes `0` to its record's
`second`, those values are **exactly** the activities plus the idle one with no gap and nothing spare,
and `second` **is** the activity count. Where the idle value sits varies, the maximum on 12 and one below it
on 3, so **a composer must not assume the idle value is the highest** and must not take `second + 1`
for granted as unused without checking the record. It never has to **work it out**: `first` states the
value and the firmware seeds the variable from it at boot, section 138, so idle is the counter's
ordinary starting value rather than a role the format assigns.

The rule for adding one, which is inference rather than measurement since nothing here watched an
addition: raise `second` by one, give the new activity the new maximum, leave the idle value where it
is. That turns a container of the twelve shape into one of the three shape.

**And the name tree says the count as well**, so it changes with the record: the node
`CurrentActivityState_0_<values>` ends in `second + 1`, which is section 86's rule over every named
variable rather than anything about activities. Because the count is text, raising it can make the
name **longer**, and then this is a length edit to base slot 0 and not a field poke. One container in
fifteen is at that boundary.

**An activity has no name tree node of its own**, which is worth stating because a device does: the
tree names the variable, and the activity's own label is drawn on the menu page as pixels. So step 7
below is where an activity gets its name, and this step touches the tree only for that count.

### 2. One entry in the key map table

Base slot 9. The activity's own keypad map, and section 272 says what the table is: a fixed per model
prefix the configuration never selects, one entry per activity, and exactly one more. The factory
configuration has 9 entries, of which 7 are the prefix, 1 is this activity and 1 is the left over.

The entry is a tagged list of 29 entries: three lifecycle handlers on tags 1, 2 and 5, one binding for
the Devices key, one for a help screen, and 24 keys that send an infrared code.

*The check that can fail*: the table's length is the model's prefix plus the activity count plus one.

**P2.** A composer adds exactly one entry here per activity, after the prefix, and the prefix never
moves.

**Appending is safe and section 273 is why**: an entry's position in this table does not encode its
activity number. Of the ten user configurations with more than one activity, not one has its entries
in value order, and `one_config`'s eight read 2, 0, 3, 4, 6, 8, 1, 5. The number is carried by the
write inside the enter list and by nothing structural.

### 3. Three lifecycle handlers on that entry

**A tag below `0x80` is not automatically a lifecycle handler**, and this section said "tags below
`0x80` are not keys"<!--superseded--> until the scoring. That is false: a tag carries an event type in
its top two bits and a scan code in the rest, so a **release** of scan 3 is `0x43` and sits below
`0x80` looking exactly like a handler. Every activity on a Harmony 600, and on the Harmony 700 reference image, carries one. What
separates the two is the event type, not the size: a lifecycle handler has event type **0**.

The factory activity carries three handlers of event type 0, and every activity in the corpus carries
the same three:

| tag | what it is |
|---|---|
| 1 | **enter**: run when the activity starts. This is the whole of the start sequence |
| 2 | **leave**: run when it stops. Cancels the timers and restores the display |
| 5 | the activity picked again while it is already running, section 313: it re-sends the inputs with no power change and goes to the working screen, directly or through the Remote Assistant's branch, without the start up screen. This row called it "the shape of a 'fix it' chain"<!--superseded--> while what fires it was unread |

*The check that can fail*: every activity entry has all three.

**P3.** Tag 5 is present on every activity on every architecture, and a composer must emit it. **What
fires it** is read since section 313, picking the activity that is already running, and this called it
the largest hole in this document until then. What it **does** was already
read before this document was written, in `ACTIVITY_START_TAG`'s own docstring, and this section said
it was unidentified for a day: over the corpus it re-sends the inputs with no power change.

**Section 273 bounds what a composer may put there.** Tag 5 always runs a real list, so it cannot take
the null instruction tag 2 can. Its **state writes** are a subset of the enter list's on 50 of 50, and
the subset is **empty** on 24. So pointing tag 5 at the enter list sits inside the measured envelope
trivially, and it is not what Logitech compiles: it replays the whole start, start up screen and power
writes included, where Logitech's re-pick leaves both out; what that looks like on a remote is still a
prediction for the bench. `composeActivity` still does it where it cannot do better, and on the
Harmony 600, 650 and 700 with a screen it builds Logitech's own list instead, section 313's rule: the
start variable, the input writes, the flag and the working screen, nothing switched.

Two tighter readings were checked. "The enter list without the power writes" matches 0 of 50 and is
dead. "A prefix of the enter list" **holds on 28 of 50**, of which 24 are the empty case, so it is
4 of the 26 that write anything, and all four arch 8 containers have it on every activity. This
document said it failed everywhere<!--superseded-->, which was a claim with no test behind it.

**Two things section 273 adds, and both change what a composer emits.** The extra base slot 9 entry,
the one section 272 could only define by exclusion, carries tags 1 and 5 and **no leave handler**, on
15 of 15, where all 50 activity entries carry exactly tags 1, 2 and 5. So the leftover entry is
recognisable from its own bytes and a composer must not give it a tag 2.

And **a leave handler may be a null instruction**: 21 of the 50 carry opcode 0 with operand 0, all of
them on arch 8 and arch 9, against 29 that run a list. Emitting the tag is required; giving it
something to run is not, so a composer with nothing to undo may emit the null form rather than
inventing a list.

### 4. The start sequence, which sets state rather than sending codes

**This is the load bearing finding for a composer and it is the opposite of the obvious design.** The
enter list does not name the codes the activity sends. It writes the **device's** state variables, and
the code goes out because that variable's transition runs a list that sends it.

The factory activity's enter list, in order:

1. enter a screen mode that binds every key to a list that does nothing, which is the "starting" screen
2. cancel all four running timers
3. set the television's power variable to 1
4. set the television's input variable to 0
5. set the activity counter to this activity's value
6. run three shared routines: one that silences the next state write, one helper chain, one that sets
   the display's backlight

Steps 3 and 4 are where the appliance is actually driven. What reaches the send queue, in order, is the
power code, a ten second delay, then the input code three times with a two second delay after the first.
None of those six things is written in the activity.

*The check that can fail*: walk the enter list following only the nested calls and count the sends;
count again with `activityStartSteps`, which follows a state write into the transition it triggers.
Over the whole corpus, **424** sends are found the second way and **12** the first.

**Those numbers were 399 and 411 when this section was written**<!--superseded--> and the correction is
worth more than the figures. The first version walked the transitions with a walk of its own, and that
walk stopped one level shallower: it followed a state write into its transition and then did not follow
a write that transition itself made. The library's reader does, has a test, and carries a comment about
bounding depth and revisits for exactly this reason. Two copies of one derivation is the state this
project's oldest rule forbids, and here one of them reached a document before anything compared them.
What compared them was writing the test.

**P4.** A composer produces an activity by deciding the target state of each device it drives, and the
codes follow from the transitions the device already has. It never emits a send instruction of its own.

**P5.** The 12 inline sends are an exception this document does not explain, so a composer that emits
none is right about 97% of the corpus and a reader must not assume none exist.

### 5. A power on delay that belongs to the device, not to the activity

Section 234 and section 236. The delay is a per device quantity pushed onto the send queue, and the
queue holds back a command only when an earlier entry names the same device. So the delay stalls
exactly one thing, the next command to its own device, and an activity that sends a device its power
code and nothing else cannot show that device's delay however large it is.

The factory activity has one device with a ten second delay and sends it three further commands, so
the delay is felt.

*The check that can fail*: `powerOnDelayReach` reports, per activity and device, how many further
commands the activity sends that device. Zero means the delay is never felt.

**P6.** A composer does not put a delay in the activity. It sets the device's delay and the activity
inherits it.

### 6. A row on the activity menu, which is what starts it

The keypad map does not start the activity. A screen page does: one row on the activity menu, bound to
an action list that sounds a tone, selects the activity's key map, and sets the variable that says
which top level screen the remote is on.

Four hops from a key press to an activity, section 120, and the reason it takes four is that nothing in
the format names an activity directly.

*The check that can fail*: every activity is reachable from a key, and all of one activity's keys are
on one page. On arch 14 an activity has **two** keys, section 273, and both are on that page.

**P7.** A composer adds one row to the activity menu page per activity, which is a screen edit and a
tagged list entry, and the rows of one menu are a contiguous run of action list indices.

**How many key bindings a row costs is per architecture**, section 273: **two** on arch 14 and one on
arch 8, arch 9 and arch 12, on 15 of 15. Both of an arch 14 pair are presses of different keys on the
same page, so the second is not the first key's release, and a writer for a Harmony 600 that emits one
binding per activity leaves half its menu dead.

**And on arch 12 (Harmony One) the page the row goes on is not a device list page**, section 275,
which is the correction that stopped a composer reusing the device list's builder. An activity menu
page enables **both** of the two physical buttons below the display where a device list page enables
only the left one, so it offers a different number of hit rectangles; **neither** menu binds a page
flip, because the remote turns a list's pages with the two buttons beside the display and no mode
page binds those, 0 bindings over 778 pages; and it holds **three** rows. A rectangle's scan code
is its **position** in the page, which is why the rows are scans 50, 51 and 52 on one page of the
everyday Harmony One and 48, 49 and 50 on the next, and why a row is appended after the last
rectangle and before the two edges: anywhere earlier renumbers the areas after it and moves a
binding that already existed.

### 7. A drawn name, and the screens the activity enters

The activity's name is drawn on the menu page, as pixels, at a stated position. It is also drawn by the
modes the activity's chain enters, which is what lets section 121 attribute a name to an activity at
all: a remote entering an activity says which one.

*The check that can fail*: the name resolves for every activity in the container. All 50 activities in
the corpus resolve, on four architectures.

**P8.** Spelling a name from the glyph sets a container already holds is the same job
`composeDeviceScreen` already does for a device, so this needs no new encoder.

## What an activity shares with a device, and must not duplicate

**The per key action lists are the device's**, not the activity's. In the factory configuration all 24
keys that send a code run a list the device's own screen record also runs, byte for byte the same list
index. Across the corpus 1343 of 1676 activity key bindings are identical to a binding in the device's
own map, section 271.

**The infrared codes are entirely the device's.** An activity adds nothing to the infrared database.

**Most of the action lists it reaches are shared machinery.** The factory activity reaches 109 action
lists and only **28** of them are reached by nothing else. Across the corpus an activity owns between 10
and 29 exclusively. The rest are the backlight, the I2C work and the helper chains that every activity
and every device page runs.

**P9.** Composing an activity is on the order of 10 to 29 new action lists, one key map entry, one menu
row, one name, and one value on the activity counter. Everything else is reference to what the devices
already put there.
