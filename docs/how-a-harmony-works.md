# How a Harmony works, from the outside

Everything else in this repository is about bytes, firmware and pointers. This document is about what
the thing does when somebody picks it up, and it exists because that turned out to be the half nobody
had written down.

**It is written for whoever is about to design something.** A configuration is a program and the
firmware is its interpreter, so the format work can always tell you what a byte does. It cannot tell
you what the product is for, and on 22 August 2026 that cost a whole screen: FreeHarmony's device page
was built to show a keypad per activity, because a count over five configuration files said every
keypad binding sits in an activity's map. The count was right. The screen was the **device mode**
editor, and device mode had never been described anywhere here.

## The two things a Harmony can be doing

**An activity.** "Watch TV", "Listen to Music". Pressing it switches the right equipment on, sets the
inputs, and gives the keypad a map that spans several devices at once: volume to the amplifier,
channels to the set top box, transport to whatever is playing. That is the whole point of a Harmony and
it is what the marketing was about.

**Device mode.** Press **Devices** and the screen lists your equipment. Pick the television and every
button on the remote now drives the television and nothing else. Something takes you back to what you
were doing, and what it is called differs per model.

**Danny's picture of it is the one to build from**, and it is worth more than any measurement here:
switching to a device is like reaching for the old remote that came in the box with that appliance. There
is nothing but that appliance on it. You cannot reach the amplifier from the television's old remote,
because it has no amplifier on it.

Both map the entire keypad. Neither is a special case of the other, and **they are two separate maps of
the same keys, authored separately**. Logitech's own software has a page for each, called "Changing how
buttons work for a device" and "Changing how buttons work in an Activity" in the Harmony 600 manual's
contents. In an activity **any key may carry any command of any appliance you own**; in a device's map
there is one appliance, so two appliances holding the same key is not a conflict at all.

**Logitech says so in its own manuals**, which is the corroboration this document lacked when it was
written on 22 August 2026 and got in the same afternoon from the four manuals in the lab. The Harmony
One's is the plainest: "After you select a device, the Harmony One controls only that device. You have
access to all the commands for the device system." The Harmony 885's gives the example: "If you choose
Television as the device, the number, volume and channel buttons will all control your television."
So the keypad remap is the vendor's own statement rather than an inference, and what is still open is
only **where that map lives in the file**.

## Device mode is not a corner of the product

It is the ordinary way to reach a command that is not on an activity's map, and most commands are not:
an activity binds the thirty or so buttons that make sense while you are watching television, and a
television answers to a hundred and more.

The flow, in Danny's words on 22 August 2026: you have chosen an activity, you want an obscure setting
of your television that you almost never touch and that is not on any button in the activity map, so
you switch to device TV, press the button for that setting, and switch back to Current Activity.

Every model works this way and each gets there differently. The differences are small and worth being
exact about, because a drawing of a remote in FreeHarmony has to agree with the remote:

| model | how you get in | how you get out |
|---|---|---|
| Harmony 525 | a **Devices** key on the keypad | its **Activities** key |
| Harmony 600 | **no key at all**: the screen writes "Devices" above the **centre key** of the three below the display | the same centre key, which then writes "Activity" |
| Harmony One | a **Devices** item on the touch panel | a **Current Activity** item |
| Harmony 885 | a **DEVICE** key beside the display | **DEVICE** again |

**The Harmony 600 is the correction worth keeping.** This document and both `CLAUDE.md` files said it
has a physical Devices key for a day. It does not, and the manual settles it twice: the button table on
page 5 lists every key on the remote and there is no Devices among them, and page 6 says you "select
devices by pressing the center button below **Devices**", where Devices is a word drawn at the bottom of
the screen. The traced drawing of a Harmony 600 in `reference/silhouettes/` therefore has no such key and
must not grow one.

**"Current Activity" is one model's wording**, the Harmony One's. The 600 writes "Activity", the 525
uses its own Activities key, and on an 885 you press DEVICE again. So an interface must not print that
phrase as though it were the product's vocabulary.

## The screen is the bigger half of device mode

An old remote has far more buttons than a Harmony does. So what people actually build in device mode is
**pages on the screen**: a screenful of commands at a time, for the obscure functions the keypad has no
room for. Those would never fit an activity's keypad map, and they are not meant to, since an activity
carries what you use often.

That is why Logitech can say you should hardly ever need device mode and be right, and it is also why the
feature matters: without it, reaching one rare function means walking to the cupboard for the old remote.

For anything being built it means the keypad is the **smaller** half of a device's map, and a device page
without screen pages is unfinished rather than complete.

## What that means for a button map

**A button map belongs to a device before it belongs to an activity.** Logitech's own software is
authored that way: you give a device's commands to buttons, and an activity then draws on several
devices' maps at once.

Measured from the other side, in `docs/findings.md` section 151: across all fifteen user configurations
there are 1105 pairs of a device and a button, and **1096 of them send the same command in every activity
that binds them**. Forty seven of fifty devices agree everywhere. The three that do not include an
amplifier whose input selection differs per activity, which is exactly what a per activity override looks
like.

So the configuration stores a keypad map **per activity**, and a device's own map is what those maps
agree on. Both statements are true and only the second is a fact about the product.

**And Logitech's own schema says the same thing outright**, found on 30 August 2026 and the first
independent source this section has had. Their platform has an abstract button map with exactly
three subclasses: one keyed by a device, one keyed by an activity, and one keyed by neither. So the
two maps are two **types** in the vendor's model, sharing a base, distinguished by what they hang
off. That is the claim this section makes, arrived at from their help pages and from counting
agreements across fifteen configurations, and now stated by them.

Read it for what it is. It is a schema for a later generation of hardware than the remotes on this
desk, so it is evidence about **the product's design** and not about what a Harmony One's flash
contains. What it settles is the thing that cost a screen in FreeHarmony: a device's map and an
activity's map are different objects, not two views of one. `docs/myharmony/model.md` has the
detail, and two of its findings bear on this document directly. A button carries **three** actions,
a press, a long press and a double press, which is the mechanism the section on holding a key
describes from the byte side. And the button kinds are named per surface, a hard key, a drawn
button on the screen, a key under the slider, so the screen and the keypad are one map with two
kinds of button in it rather than two maps.

So the measurement is about the **activity** maps, and that is what it may be used for: it says an
activity's map reads as the device's map plus that activity's overrides, which is what lets a device map be
**reconstructed** where a file states none. It says nothing about what an interface should show.

Two consequences for anything being built, and they belong to different screens:

* **A page about a device shows that one appliance and mentions no activity.** Not which activity uses a
  key, not which other appliance holds it, not where a change will land. Inside one device's map there is
  one appliance, so a key sends one of its commands or it sends nothing, and a change is one binding.
  FreeHarmony got this wrong three times, each time by importing an activity map's concerns onto it.
* **A page about an activity is where the rest lives.** There a key may carry any appliance's command, so
  a change has to reach the whole activity, and the buttons other appliances already hold are the real
  constraint: 131 of the 1105 pairs have another appliance holding the button in at least one activity
  that uses this one, and on the Harmony One's receiver in the lab 3 of its 35 buttons are its own in all
  eight activities that use it. That is the activity editor's rail and it must not be carried into the
  device one.

**Logitech's own advice is the opposite of Danny's practice, and both are worth knowing.** The 885
manual says "you should never need to use Device mode during normal use" and that "you can eliminate the
use of device mode by customizing your Activities", by putting the command on the display or on a button.
Danny uses device mode routinely for exactly the commands Logitech would have you add to an activity, and
the reason is the screen pages above: that is where an appliance's rare functions live. The application
serves both.

## A sequence belongs to an activity

One button can send several commands in a row, with a pause between them if the equipment needs one.
Logitech calls it a sequence and most people would call it a macro: press one key and the remote sends
channel two, zero, zero, then red, then red again.

**It is a property of an activity and not of an appliance.** Danny established that on 23 August 2026 by
looking in Logitech's own software, having assumed the opposite first. You author a sequence inside an
activity, and the only places it can be put are a key or a button on the screen. There is no sequence
that belongs to a television, and so there is none to reach from device mode.

That is not something the files can tell you. A configuration holds an ordered list of commands attached
to a button and says nothing about who authored it or where the software offered it, so every config
here would read the same either way. It is the same shape of question as the one this document opens
with, and it presented itself the same way: as a plausible property of an appliance.

**What it means for anything being built.** A sequence editor belongs on the activity, beside the
activity's own key map, and not on a device page. FreeHarmony's `docs/data-model.md` carries the
modelling consequence, including one gap that writing it down exposed: a key the screen speaks for
records which page it is on and not which activity, and by this rule every sequence has an activity.

## What a sequence is allowed to be: 25 steps and 20 seconds

Danny read both off Logitech's own editor on 23 August 2026. A sequence holds at most **25 steps**, and
a pause is at most **20 seconds**.

**Both paragraphs below were written before either number was measured, and the measurement moved both
of them.** A sequence at the limit was authored, compiled and read on 23 August 2026, and the notes are
in the lab beside the config rather than in `docs/findings.md`, by Danny's call on the day.

**The 20 seconds is close to the ceiling rather than far from it**, which is the opposite of what this
said. The dead wording was that a pause is a whole number of seconds in a sixteen bit field so
*20 is nowhere near anything the format struggles with*<!--superseded-->, and both halves were wrong. No
timer is involved at all: a pause is one action list instruction, opcode `0x7C`, inline, and its value is
**tenths of a second in the low byte**, exact on five authored values from one second to twenty. A byte
holds 255, so the largest pause the format can express is 25.5 seconds and their limit of 20 is a round
number just under it. So it is a bound with something behind it, and a writer that offered 30 seconds
would be offering something unrepresentable.

**The 25 counts pauses, and the queue is not the reason for it.** The hypothesis here was that
*the 25 may not be arbitrary*<!--superseded-->, because the action list queue is 120 bytes of three byte
instructions, section 34, which is 40 instructions, so 25 sends would fit with fifteen to spare. The
sequence that was built has 25 items and only 21 of them are sends: the other 4 are pauses, so the limit
is on items and not on commands. And it does not fit. Every send expands to a two instruction list plus
its own dispatch, so 25 items become roughly 55 instructions, well past 40, and the compiled answer is one
action list of 34 instructions rather than a chain. So the queue cannot be what chose 25.

**What the same run found instead is a hazard, and it is worth more than the arithmetic was.** That 25
item sequence **hangs a Harmony One for good** when its touch panel is tapped heavily while it runs. Three
runs of that, no recovery in any of them, batteries out each time; against three runs with no taps and two
with gentle taps that all completed in 62 to 70 seconds. Reproducible rather than variance, and the
mechanism is open: a destructive queue overflow is dead, because a queue one instruction from the edge
would have tipped on the single tap and did not, and a backlog of queued taps is dead too, because 65 taps
at one a second cost nothing at all.

**So Logitech's own stated maximum is not a safe bound**, and that is the sentence to carry into the
writer. A config at their limit is one the remote accepts, whose checksums verify, which this project
accounts for to the byte, and which can leave the remote unusable until its batteries come out. It writes
nowhere it should not; it simply runs. A writer should therefore **refuse** an oversized sequence rather
than warn about it, and bound it by the expanded instruction count rather than by the item count, which
permits this one.

## A sequence can only use the activity's own appliances

The third of the sequence rules Danny established on 23 August 2026, and it follows from the first: if
an activity owns its sequences, the sequence editor offers only the appliances that activity drives. In
his example the activity drives a television, a set top box and an amplifier, and those three are the
only sources of commands the editor will offer.

**This one cannot be checked here, and the reason is worth stating rather than filed as unmeasured.**
What an activity drives is not declared anywhere in a config: it is **derived** from the codes the
activity's own bindings send, section 126. So "a binding only sends what the activity drives" is true by
construction of the derivation, and no config could ever contradict it. The rule is real and it comes
from the product, not from a measurement that could have gone either way.

It does bound what an authored sequence may contain, which is the part an editor has to enforce, and it
gives the device list a second job: it is not only a description of what an activity switches on, it is
also the palette a sequence may draw from.

## A command appears once on an activity's screen

Said by Danny on 23 August 2026, in the same breath as the rule above: a sequence, and **any** other
command, may appear only once on the screen of an activity, counting all of that activity's pages
together. You cannot put the television's mute on page one and again on page three.

**This one is partly checkable, unlike most rules in this document**, and the checkable half holds
exactly: across 1319 screen pages in the corpus that bind at least one command, and 3122 such bindings,
**no page holds the same send twice**. Not once, on any architecture. A send here means the whole
ordered list a button emits, so a sequence counts as one thing rather than as its codes.

**It is enforced rather than merely conventional.** Danny tried it: Logitech's software refuses to put
the same command or sequence on a second pad of the touch panel, on any page. So this is a rule the
authoring tool holds, which is why a config can only ever be consistent with it and can never
demonstrate it.

**And it is the screen's rule only, which is what makes the measurement mean something.** On the
**keypad** the same command or sequence may go on as many keys as you like within one activity, said by
Danny and then measured here, and the contrast is stark:

| | two bindings sending the same thing |
|---|---|
| screen pages | **0** of 1319 |
| keypad sets | **20** of 44 |

Nearly half the keypad sets in the corpus put one command on two keys, and no screen page anywhere does
it once. An absence on its own could be a coincidence of what people happen to build. An absence on one
surface beside abundance on the other, measured the same way in the same configs, is the rule showing
through. This is the closest thing to a confirmed product rule in this document.

It also fits what the format already says about the two surfaces. They are separate maps whose scan
codes do not overlap, section 128, so there was never a reason for a rule about one to apply to the
other.

**And the two facts together pin its scope, which neither does alone.** Counting across all of a
config's pages gives plenty of repeats, 39 of 110 distinct sends in one Harmony One config. So the rule
cannot mean "once anywhere on the remote", and since the tool genuinely refuses a second pad, the thing
it counts within has to be narrower than the whole remote. An activity is what that leaves.

What is still not measured is that last step, because telling which pages belong to which activity is a
reading nobody has made: what exists is the chain that **names** an activity, sections 121 and 125, not
an attribution of every page to one. The measurement to want is per activity, and it becomes available
the day that attribution does. Until then the per page zero is the part that stands on evidence.

**For anything being built**, the constraint is on the editor rather than on the file: offering a
command for a screen page has to refuse it when it already sits on another page of the same activity,
and the message has to say where it already is.

## What the screen does, and what it does not

The screen is a second population of keys, and it shares almost no scan code with the keypad: none at
all on arch 9, arch 12 and arch 14, and exactly one on arch 8, section 128. On a Harmony 600 a device
mode's screen shows that device's commands four at a time and you page through them with the arrows;
on a Harmony One the same thing happens on the touch panel.

So "the buttons of a device" is two questions, not one, and an interface has to keep them apart.

## A favourite channel is a screen button, and the channel is text

Read out of Logitech's own button records on 23 August 2026, for three of the models on the bench. A
favourite channel is a **thing you keep**, with a name you type and a picture if you want one, and it
shows up as a pad on the screen: their records put them in a menu of their own, called `FavoriteChannels`,
alongside the menus that hold a device's commands and an activity's, and each pad carries the appliance it
tunes and the word drawn on it.

**The menu names no appliance and each favourite names its own**, which is worth stating because it is the
opposite of how the rest of the screen works. A device's commands sit in a menu named after the device, so
the pad inherits its appliance from the page it is on. A favourite does not: the appliance is on the
tuning action itself. So a favourites page can hold channels for more than one tuner, and anything that
took the appliance from the page would be wrong for exactly this one case.

**FreeHarmony does not offer them, decided on 23 August 2026**, and the reason belongs here rather than
only in that repository: Danny has used these remotes for years, has never used favourites, does not know
how to switch them on, and never understood the need, because a **sequence** does the same thing. Tuning to
channel 100 is sending one, zero and zero, which is exactly what a sequence is for. So the feature is
described in this document and expressed as a sequence in the application, and what a sequence cannot do is
carry a picture and be reachable from device mode. `FreeHarmony/docs/data-model.md` weighs that.

**The channel is stored as text and that is not a detail.** Channel 1 and channel 001 are different
channels on a real set top box, and a config takes two entirely different roads for them, section 156: a
number that survives being written as an integer goes through the number sender, and one with a leading
zero is spelled out one digit code at a time instead. Their own records hold it as a string. So anything
that treats a channel as a number loses a channel somebody can actually tune to, and the leading zero is
the case that proves it rather than an edge case to be tidied away.

**Where it goes in a config is four places and none of them is a keypad map**, section 154, which is the
mistake this document exists to warn about in general form. A favourite reaches the file as a record per
appliance in the number sender, a list per channel, the state variable values whose transitions run those
lists, and a page on the screen. Nothing in any of them says a channel was ever typed, so a favourite can
be written and cannot be read back, and reading a favourites page as a page of key bindings would be
answering a question about the product out of the file's own shape.

**What it turns into is that appliance's own digit codes**, which is the sentence that makes the rest of it
concrete. Tuning to 100 is sending the codes for one, zero and zero, so a favourite is only authorable
where those codes can be picked out by name, and a config read off a remote carries no command names at
all. So somebody who imports their remote has the channels working and cannot add a channel until the
appliance has been named, which is a product consequence rather than a format one.

**Which screen page belongs to which appliance is still open**, section 151, so an import can see the page
and not its owner. That is the same asymmetry that runs through this whole document: the product knows
things the compiled form threw away.

## Holding a key is two mechanisms, and a repeat and a long press exclude each other

Put together on 23 August 2026 from Logitech's own interface and its own product data. Three key
behaviours are visible to a user: a key that does nothing extra when held, a key that keeps firing
while held, and a key that does something **different** when held. That is three behaviours and two
mechanisms, and reading it as three kinds of key is the mistake this document exists to prevent.

**Repeating is a property of the command**, not of the key. Section 127 read it: an infrared record
carries three block pointers, once, held and tail, the firmware samples the keypad at every block
boundary, and the held block is sent for as long as the key is down. So the interval a user feels is
that block's own duration, and it is per code. One appliance can have a volume command that repeats
and a power command that does not, and no keypad map anywhere states either.

**A long press is a property of the button.** Logitech's own button record carries three actions,
`ButtonAction`, `ButtonLongPressAction` and `ButtonDoublePressAction`, so the second action is chosen
by how long the key is held and belongs to the button rather than to any command.

**The two cannot coexist on one key, and the reason is mechanical.** A firmware that has to decide
between two actions must wait to learn which one was meant, and a key that is waiting cannot also be
repeating. So the third behaviour is not a third kind of key: it is a key whose long press has taken
its repeat away.

**Which models have a long press is a generation boundary**, from `ProductsManager/GetAllProducts` on
the live service, where a product record lists its own capabilities. Declaring `LongPressAction`: the
950, the Touch, the Ultimate One, the 350, and the nine products of the Elite and Smart Control
families. Not declaring it: the Harmony One, 600, 650, 665, 700, 300 and 200, in both regional
variants where there are two, and the two hubs, which have no buttons at all. So **no architecture
this project can read has a long press**, and a keypad map read out of any configuration here cannot
contain one.

**On the Harmony 350 the long press is what the device count is made of**, which is the closure worth
keeping because it explains three numbers with one mechanism. Its interface says four device buttons
control up to eight devices, and its stated maximum is eight. The 300 has four buttons, no long press,
and a maximum of four. The 200 has three, no long press, and three. So for the models with no screen
the maximum is the number of device buttons times two where a long press exists and times one where it
does not, and it is not an entry in a table.

That arithmetic does not extend to the models with a screen, where a device is reached through the
screen rather than through a dedicated button, and their maxima run from five on a Harmony 600 to
fifteen on a Harmony One.

## A remote with no screen holds exactly one activity

Measured on 23 August 2026 by filling seventeen model records in one account with the same six devices
and seven activities, through Logitech's own copy step, and reading back what each accepted. Fourteen
of them took all seven activities. Three took **one**: the Harmony 300, the Harmony 200 and the Harmony
350, which are exactly the three models with no screen.

Only the 350 states that limit anywhere: its product record carries a maximum of one activity where
every other record leaves the field empty. For the 200 and the 300 the number appears in no field at
all and the copy step simply stops after one, which is why filling a record and reading it back finds
things that reading the product table cannot.

Their capability lists agree from the other side, and this is the independent half: the 200 and the 300
declare no `Activities` capability at all, only `PartiallySetupActivities`, while the 350 declares
both. So a screenless Harmony is an activity machine with room for one activity, plus a device button
per appliance, and the screen is what buys a remote more than one.

## Open: where device mode's own keypad map lives

**No keypad map in any configuration here sends an infrared code outside an activity.** Of 158 keypad
maps across the fifteen user configurations, 65 are installed by something in the configuration and 50 of
those by an activity, and exactly those 50 send codes. The remaining 108 send nothing, and 38 of them bind
fifty or more keys to lists made of comparisons and mode entries, which is a menu.

So the map device mode uses is not identified. Three readings, none of them established:

1. The firmware builds it from the selected device's own command order in base slot 5.
2. Device mode reuses the running activity's map, filtered to the chosen device.
3. There is a map in the container that nothing here has recognised yet.

**Do not close this by choosing one.** What would settle it is the firmware: the routine that runs when
the Devices item is pressed, followed to whatever it installs. `.claude/skills/trace-section/SKILL.md`
is the method.

**A fourth reading arrived on 30 August 2026 and it is not evidence either.** Logitech's schema has
a third button map subclass, keyed by neither a device nor an activity, which leaves the remote
itself: a base map belonging to the unit. That is consistent with there being such a thing, and it
is consistent with the later hardware having one and these remotes not. No capture here holds one,
and the schema is for a generation this project does not own. **It changes what to look for in the
firmware, not what to believe.** If the routine behind the Devices item installs a map that came
from neither of the two places above, this names the thing it found.

## The rule this document is really for

A measurement over the corpus answers "what do these files contain". It never answers "what does the
product do". The corpus will agree with itself about a feature it holds no bytes for, which is exactly
what happened here: five files, three architectures, no counterexample, and a wrong conclusion.

When a design question arrives, the order is: what does the remote do, then what does the file say
about it, then what can we read. And when the product answer is not written down here, ask Danny. He
has the remotes on the desk and has used them for years.
