# How an activity is built: the anatomy, and what a composer has to produce

**The goal, in one sentence.** Know what an activity consists of well enough to build one, to the
standard `docs/adding-a-device.md` sets for a device: every structure it touches, in the order a
builder has to touch them, each with a check that can fail.

**This is chapter 1.1 of `todo.md`**, and its plan is `docs/plans/003-how-an-activity-is-built.md`.

**The composer exists now, `composeActivity` in `packages/codec/src/compose.ts`**, chapter 1.2, so
this document has a second job: it is what that function's rules are read out of, and a rule stated
here that the code does not follow is a defect in one of the two. The function does steps 1 to 5
below and deliberately not 6 or 7, which are the screen and live in a separate function for the same
reason `composeDeviceScreen` is separate from `composeDevice`.

## What an activity is, before any bytes

An activity is "Watch TV". You press it, several appliances switch on, their inputs get set, and the
keypad is pointed at a mixture of them: volume to the amplifier, channels to the set top box. Read
`docs/how-a-harmony-works.md` before this document, because everything below is the file's answer to a
question that document asks.

The thing to hold on to, because it is what the bytes turn out to say: an activity is **not a list of
commands**. It is a statement of what the room should look like, and the commands come out of the gap
between that and what the remote believes the room looks like now.

## How it was read, and the standard this document is held to

**Written from `one_config_unprogrammed` alone**, the factory configuration of a Harmony One, which
holds exactly one device and exactly one activity. That is one specimen of every structure an activity
needs, in the smallest form that exists.

**Every numbered claim below is a prediction until it is scored.** The plan asks for this shape, the
one `docs/predictions-arch16-programmed.md` uses: write it from one specimen, then score it against a
second and a third, and record what it got wrong in the same document. The scoring section at the
bottom says which specimens and what happened.

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

## What this deliberately does not need

* **A new infrared group or any new codes.** The activity drives devices that already exist.
* **Its own screen pages of commands.** Those are device mode's, section 271.
* **A picture or a glyph encoder.** The name reuses the glyphs the container holds.

## Scoring

**Scored on 6 September 2026** against `one_config`, the same architecture with eight activities rather
than one, and `h600_config`, a different architecture with three. Where a prediction failed, the wider
corpus was then consulted to say how badly, which is why some rows below quote more than two specimens.

| | prediction | verdict |
|---|---|---|
| P1 | one value on the activity counter, written from one place | **right**: 8 activities and 8 writers, 3 and 3 |
| P2 | one key map entry per activity, the prefix never moves | **right**: 16 = 7 + 8 + 1 and 9 = 5 + 3 + 1 |
| P3 | three lifecycle handlers on every activity | **right**, and the supporting sentence was false, corrected above |
| P4 | a composer emits no send instruction of its own | **right**: 0 inline sends on both specimens, 424 through a transition across the corpus |
| P5 | some inline sends exist and are not explained | **right**, and they are elsewhere: 1 on arch 9, 4 on arch 8, 0 on both specimens |
| P6 | the delay belongs to the device, the activity inherits it | **incomplete**, see below |
| P7 | one row on **the** activity menu page | **wrong**, see below |
| P8 | the name resolves and needs no new encoder | **right**: 8 of 8 and 3 of 3 |
| P9 | 10 to 29 action lists of its own | **right** across the corpus |

Seven right, one incomplete, one wrong. The two that failed are both places where a single specimen
could not have shown the answer, which is the argument for this document's shape rather than against it.

### P7 was wrong: an activity menu is several pages

The factory configuration has one activity and therefore one menu page, and the prediction took that
for the structure. It is not. The eight activities of `one_config` sit on **three** pages, 3 and 3 and
2; the Harmony 600's three sit on two, 2 and 1; and the nine of an arch 8 container sit on 1 and 8.
**5 of the fifteen user configurations spread their activities over more than one page** and 10 use a
single page, with three the most any of them uses.

*This paragraph said 8 of fifteen spread and 7 did not*<!--superseded-->, which was a guess written
beside three real examples rather than a count, and the test refuted it on its first run.

**So a composer adding an activity may have to add a page**, and that is a screen edit rather than a
tagged list entry: a new page record, its own tagged list, its own screen program, and the navigation
that reaches it. It is the same problem section 239 hit from the other side, where a seventh device
needed a third page on the device list and that was what blocked the goal.

**What decides when a page fills was not read here, and section 275 read it.** This paragraph said
*three pages of 3, 3 and 2 is not a full page followed by a remainder, so the generator is not simply
packing them*, and it was wrong for a reason worth keeping: the page's capacity had never been
measured, so a full page could not be recognised. It is **three** rows on arch 12 (Harmony One),
measured over six activity menu pages of four containers. So 3, 3 and 2 is a full page, a full page
and the remainder, and the generator is packing them after all.

### P6 was incomplete: arch 14 has no delay to inherit

The prediction is right on the architecture it was written from and says nothing about the one it was
scored against. Arch 14 (Harmony 600 and 700) keeps a power on delay in a **state variable** rather
than inline in the action list, section 236, so `powerOnInstructions` is empty there and so is the
reach report. A composer for a Harmony 600 does something different from a composer for a Harmony One,
and this document had no way to know that from its own specimen.

### One caution the predictions did not state at all

**How much of a device's map an activity reuses varies enormously**, and the factory configuration is
at one extreme. Its single activity shares all 24 of its code sending keys with the device's own map.
Across the eight activities of `one_config` the share runs from **35 of 35** down to **4 of 29**. So
"reference what the devices already put there" is right about the corpus as a whole and would leave a
composer badly wrong about an activity like that one, which is mostly its own bindings.

### What this leaves open

* what tag 5 is for, which no specimen answered, until section 313 read it in the firmware: picking
  the activity that is already running
* the 12 inline sends, now located on arch 8 and arch 9 and still unexplained
* which physical keys the four arch 14 activity scan codes are, and why that architecture binds two
* whether Logitech's generator renumbers activities on a full compile, which is what would decide
  between the two readings section 273 leaves standing for its three odd containers
